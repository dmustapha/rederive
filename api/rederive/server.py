# File: api/rederive/server.py
"""FastAPI surface. /answer is x402-gated (dynamic price = engine.quote) unless DEMO_FREE=1.
Admin routes require X-Admin-Token (INVARIANTS D-7). Single process = single writer."""
from __future__ import annotations
import os
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel
from .engine import Engine, RunReport, _ref_body
from .engine import NotFoundError
from .pipeline import dossier_graph, GRAPH_FNS, SOURCES

DEMO_FREE = os.environ.get("DEMO_FREE", "0") == "1"
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
app = FastAPI(title="Rederive")
from fastapi.middleware.cors import CORSMiddleware

# CORS: dev origin + intended Vercel origin (prod locked to CORS_ORIGIN when set) (§6D).
_default_origins = ["http://localhost:3000", "https://rederive.vercel.app"]
_cors_env = os.environ.get("CORS_ORIGIN")
_allow_origins = [_cors_env] if _cors_env else _default_origins
app.add_middleware(CORSMiddleware, allow_origins=_allow_origins,
                   allow_methods=["*"], allow_headers=["*"])
engine = Engine()
engine.seed_doctrine()                 # NN-6: /quote reads the REFERENCE price from seeded doctrine
GRAPH = dossier_graph()
last_report: RunReport | None = None
verified: dict[str, str] = {}          # node -> "MATCH"|"MISMATCH" (verify-on-serve sample, NN-4)
VERIFY_SAMPLE = int(os.environ.get("REDERIVE_VERIFY_SAMPLE", "2"))

if not DEMO_FREE:
    # [VERIFIED] official pattern: x402 v2 FastAPI middleware w/ dynamic price callable
    from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
    from x402.http.middleware.fastapi import PaymentMiddlewareASGI
    from x402.http.types import RouteConfig, HTTPRequestContext
    from x402.mechanisms.evm.exact import ExactEvmServerScheme
    from x402.server import x402ResourceServer

    EVM_ADDRESS = os.environ["EVM_ADDRESS"]           # seller receive address (public)
    NETWORK = os.environ.get("X402_NETWORK", "eip155:84532")   # Base Sepolia
    FACILITATOR = os.environ.get("FACILITATOR_URL", "https://x402.org/facilitator")

    def dynamic_price(context: HTTPRequestContext) -> str:
        q = engine.quote(GRAPH)
        return f"${max(q['total_usd'], 0.001):.3f}"   # facilitator minimum guard

    facilitator = HTTPFacilitatorClient(FacilitatorConfig(url=FACILITATOR))
    x402_server = x402ResourceServer(facilitator)
    x402_server.register(NETWORK, ExactEvmServerScheme())
    routes = {"POST /answer": RouteConfig(
        accepts=[PaymentOption(scheme="exact", pay_to=EVM_ADDRESS,
                               price=dynamic_price, network=NETWORK)],
        mime_type="application/json", description="Rederive dossier (priced per executed derivation)")}
    app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=x402_server)


def _admin(token: str | None):
    if not ADMIN_TOKEN or token != ADMIN_TOKEN:
        raise HTTPException(403, "admin token required")


class EditBody(BaseModel):
    source: str
    content: str


class AnswerBody(BaseModel):
    target: str | None = None


@app.get("/health")
def health():
    """Render health check — cheap liveness probe, no engine work."""
    return {"ok": True, "demo_free": DEMO_FREE}


@app.get("/state")
def state():
    s = engine.graph_state(GRAPH, last_report)
    q = engine.quote(GRAPH)
    for n in s["nodes"]:                      # surface verify-on-serve badges (NN-4, PRD AC5.3)
        n["verified"] = verified.get(n["id"])
    s["quote"] = q
    s["demo_free"] = DEMO_FREE
    return s


@app.get("/quote")
def quote():
    return engine.quote(GRAPH)


@app.post("/answer")
def answer(_body: AnswerBody | None = None):
    global last_report
    pre = engine.quote(GRAPH)
    rep = engine.run_graph(GRAPH)
    last_report = rep
    if rep.errors:
        return {"partial": True, "errors": rep.errors,
                "receipt": {"derived": rep.derived, "reused": rep.reused,
                            "total_usd": round(len(rep.derived) * float(os.environ.get("REDERIVE_UNIT_USD", "0.02")), 4)}}
    # verify-on-serve sample: re-derive up to N reused nodes, field-compare, badge them (NN-4).
    # A MISMATCH auto-invalidates the node's cone inside engine.verify — the failure mode is honest.
    for node in rep.reused[:VERIFY_SAMPLE]:
        try:
            verified[node] = engine.verify(node, GRAPH_FNS)["verdict"]
        except Exception:                    # noqa: BLE001 — a sample failure never blocks the answer
            pass
    dossier = {n: engine.get_derivation(n)["value"] for n in ("s_risk", "s_score", "s_verdict")}
    return {"dossier": dossier,
            "receipt": {"derived": rep.derived, "reused": rep.reused, "cutoff": rep.cutoff,
                        "quoted_usd": pre["total_usd"], "verified": {k: verified[k] for k in rep.reused[:VERIFY_SAMPLE] if k in verified}}}


@app.post("/edit")
def edit(body: EditBody, x_admin_token: str | None = Header(default=None)):
    _admin(x_admin_token)
    if body.source not in SOURCES:
        raise HTTPException(400, f"unknown source; one of {SOURCES}")
    engine.ingest_source(body.source, body.content)
    q = engine.quote(GRAPH)
    return {"invalidated": [i["node"] for i in q["items"]]}


@app.post("/verify")
def verify(body: dict):
    node = body.get("node", "")
    if node not in GRAPH_FNS:
        raise HTTPException(400, "unknown node")
    return engine.verify(node, GRAPH_FNS)


@app.post("/reset")
def reset(x_admin_token: str | None = Header(default=None)):
    global last_report
    _admin(x_admin_token)
    engine.reset(); last_report = None; verified.clear()
    return {"ok": True}


@app.post("/amnesia")
def amnesia(body: dict | None = None, x_admin_token: str | None = Header(default=None)):
    global last_report
    _admin(x_admin_token)
    if body and body.get("restore"):
        engine.restore()
    else:
        engine.amnesia(); last_report = None; verified.clear()
    # db_present = is the WARM memory live? After amnesia the warm db is renamed to `.amnesia`
    # (an empty db is reopened at the canonical path), so warm memory is GONE until restore.
    warm_deleted = os.path.exists(engine._db_path + ".amnesia")
    return {"ok": True, "db_present": (not warm_deleted)}


@app.post("/seed_sources")
def seed_sources(body: dict, x_admin_token: str | None = Header(default=None)):
    """Ingest the 6 raw sources (NOT derivations — sources are inputs, provenance journaled)."""
    _admin(x_admin_token)
    for name, content in body.items():
        if name in SOURCES:
            engine.ingest_source(name, str(content))
    return {"ok": True}

# ── Deep-integration routes (FIVE tiers + FTS5 + commons + anchoring) ──


@app.get("/recall")
def recall(q: str, limit: int = 10):
    """FTS5 recall across entity/state/reference/journal (D-13). SECOND x402-metered route
    when RECALL_PAID=1 (the 'sell what memory learned' market) — else open for judges."""
    return {"q": q, "hits": engine.recall(q, limit)}


@app.get("/doctrine")
def doctrine():
    """Expose the REFERENCE-tier pricing + invalidation doctrine the engine consults (NN-6).

    DEV-004: client 0.8.1 round-trips REFERENCE bodies as a JSON string; parse via _ref_body
    (the engine's own helper) instead of subscripting ["body"] directly.
    """
    return {"pricing": _ref_body(engine._m.get_reference("doctrine/pricing")),
            "invalidation": _ref_body(engine._m.get_reference("doctrine/invalidation")),
            "unit_usd_live": engine.unit_cost()}


@app.post("/doctrine")
def set_doctrine(body: dict, x_admin_token: str | None = Header(default=None)):
    """Edit the pricing doctrine → the quote changes with NO code change (proves REFERENCE is load-bearing)."""
    _admin(x_admin_token)
    engine._m.set_reference("doctrine/pricing", body)
    return {"unit_usd_live": engine.unit_cost(), "next_quote": engine.quote(GRAPH)}


@app.post("/timemachine")
def timemachine(body: dict):
    """Restore an ARCHIVED (invalidated) cone's prior conclusion + provenance (D-15).

    DEV-003: restore_archived raises NotFoundError when no journaled record exists — return a
    null `archived` body instead of a 500 so the time-machine call is always well-formed.
    """
    node = body.get("node", "")
    if node not in GRAPH_FNS:
        raise HTTPException(400, "unknown node")
    try:
        archived = engine.restore_archived(node)
    except NotFoundError:
        archived = None
    return {"node": node, "archived": archived}


@app.post("/delete_demo")
def delete_demo(body: dict, x_admin_token: str | None = Header(default=None)):
    """Demo contrast ONLY: hard-delete a node (destroyed) vs archive (recoverable). Admin-gated (R13)."""
    _admin(x_admin_token)
    engine.hard_delete_node(body["node"])
    return {"ok": True, "note": "hard-deleted — NOT recoverable (contrast to ARCHIVE)"}


@app.post("/anchor")
def anchor(x_admin_token: str | None = Header(default=None)):
    """Hash-anchor the last receipt on Base (NN-8). Returns the tx hash (resolvable on Basescan)."""
    _admin(x_admin_token)
    from .anchor import anchor_receipt
    if last_report is None:
        raise HTTPException(400, "no run to anchor")
    receipt = {"derived": last_report.derived, "reused": last_report.reused, "cutoff": last_report.cutoff}
    return anchor_receipt(receipt)


@app.get("/commons")
def commons_state():
    """Cross-tenant attribution ledger: which analyst tenant produced each fact (NN-7)."""
    from .pipeline import commons_graph
    events = engine._m.read_events(limit=300)
    attributions = [e for e in events
                    if isinstance(e.get("evaluated"), dict) and e["evaluated"].get("type") == "attribution"]
    return {"tenants": sorted({a["evaluated"]["by"] for a in attributions}),
            "attributions": attributions}
