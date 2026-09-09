# File: api/rederive/pipeline.py
"""The ONE product pipeline: crypto-project due-diligence dossier.
6 sources -> 6 extraction -> 15 metrics -> 3 synthesis = 24 derivations (+6 source nodes).
HARD CONSTRAINT (PRD S4): metrics read EXTRACTION VALUES; synthesis reads METRIC VALUES —
never raw sources — so early cutoff applies at each stage.
All derive fns are MODULE-LEVEL PURE functions of `values` (INVARIANTS NN-1, test_purity)."""
from __future__ import annotations
from .llm import complete_json, STRUCT_RULES

SOURCES = ["docs", "github", "token", "team", "community", "audits"]

def _ex(source: str):
    def fn(values: dict) -> dict:
        return complete_json(
            f"You extract structured facts from a crypto project's {source} source. {STRUCT_RULES}",
            f"SOURCE ({source}):\n{values[f'source:{source}']}\n\n"
            "Extract: {\"claims\": [{\"metric\": str<=6w, \"value\": number|boolean|string<=8w, "
            "\"confidence\": \"high\"|\"medium\"|\"low\"}]} — max 6 claims, sorted by metric.",
            ["claims"])
    fn.__name__ = f"extract_{source}"
    return fn

EXTRACTORS = {s: _ex(s) for s in SOURCES}

METRICS = [  # (metric_node, [input extraction nodes], question, enum/domain)
    ("m_storage_arch",  ["docs"],               "storage architecture summary", None),
    ("m_doc_quality",   ["docs"],               "documentation quality score 0-10", None),
    ("m_api_surface",   ["docs"],               "count of documented API methods", None),
    ("m_commit_rate",   ["github"],             "recent commit activity score 0-10", None),
    ("m_test_coverage", ["github"],             "testing signal score 0-10", None),
    ("m_bus_factor",    ["github", "team"],     "bus factor estimate 1-10", None),
    ("m_supply_risk",   ["token"],              "supply concentration risk", ["low", "medium", "high"]),
    ("m_utility",       ["token", "docs"],      "token utility strength", ["weak", "moderate", "strong"]),
    ("m_liquidity",     ["token"],              "liquidity depth score 0-10", None),
    ("m_team_track",    ["team"],               "team track-record score 0-10", None),
    ("m_transparency",  ["team", "community"],  "transparency score 0-10", None),
    ("m_sentiment",     ["community"],          "community sentiment", ["negative", "mixed", "positive"]),
    ("m_growth",        ["community", "github"],"growth trajectory", ["declining", "flat", "growing"]),
    ("m_audit_status",  ["audits"],             "audit coverage", ["none", "partial", "full"]),
    ("m_sec_incidents", ["audits", "community"],"known security incidents count", None),
]

def _metric(node: str, question: str, enum: list[str] | None):
    def fn(values: dict) -> dict:
        enum_rule = (f" \"value\" MUST be one of {enum}." if enum
                     else " \"value\" MUST be a single INTEGER (round to the nearest whole number,"
                          " no decimals, no ranges).")
        return complete_json(
            f"You compute ONE metric from structured claims. {STRUCT_RULES}{enum_rule}",
            f"CLAIMS:\n{values}\n\nCompute: {question}.\n"
            "Return {\"value\": ..., \"basis\": str<=12w}.",
            ["value", "basis"])
    fn.__name__ = node
    return fn

METRIC_FNS = {node: _metric(node, q, e) for node, _refs, q, e in METRICS}

SYNTHS = [
    ("s_risk",    [n for n, _r, _q, _e in METRICS],
     "Return {\"top_risks\": [str<=12w] (max 3), \"risk_level\": \"low\"|\"medium\"|\"high\"}.",
     ["top_risks", "risk_level"]),
    ("s_score",   [n for n, _r, _q, _e in METRICS],
     "Return {\"overall\": number 0-100, \"strongest\": str<=8w, \"weakest\": str<=8w}.",
     ["overall", "strongest", "weakest"]),
    ("s_verdict", ["s_risk", "s_score"],
     "Return {\"verdict\": \"avoid\"|\"caution\"|\"promising\"|\"strong\", \"one_liner\": str<=12w}.",
     ["verdict", "one_liner"]),
]

def _synth(node: str, ask: str, req: list[str]):
    def fn(values: dict) -> dict:
        return complete_json(f"You synthesize a due-diligence conclusion from metric values. {STRUCT_RULES}",
                             f"METRIC VALUES:\n{values}\n\n{ask}", req)
    fn.__name__ = node
    return fn

SYNTH_FNS = {node: _synth(node, ask, req) for node, _refs, ask, req in SYNTHS}

def dossier_graph() -> list[tuple[str, list[str], object]]:
    g = []
    for s in SOURCES:
        g.append((f"x_{s}", [f"source:{s}"], EXTRACTORS[s]))
    for node, refs, _q, _e in METRICS:
        g.append((node, [f"derivation:x_{r}" for r in refs], METRIC_FNS[node]))
    for node, refs, _ask, _req in SYNTHS:
        g.append((node, [f"derivation:{r}" for r in refs], SYNTH_FNS[node]))
    return g

GRAPH_FNS = {node: (refs, fn) for node, refs, fn in dossier_graph()}

# ── §5C.1 commons_graph() — multi-tenant node ownership (NN-7) ──────────────────
OWNER = {  # node -> analyst tenant domain (prefix used by commons.TENANTS)
    "x_token":"market","x_community":"market","m_supply_risk":"market","m_utility":"market",
    "m_liquidity":"market","m_sentiment":"market","m_growth":"market",
    "x_docs":"tech","x_github":"tech","x_audits":"tech","m_storage_arch":"tech","m_doc_quality":"tech",
    "m_api_surface":"tech","m_commit_rate":"tech","m_test_coverage":"tech","m_audit_status":"tech","m_sec_incidents":"tech",
    "x_team":"people","m_bus_factor":"people","m_team_track":"people","m_transparency":"people",
    "s_risk":"synth","s_score":"synth","s_verdict":"synth"}

def commons_graph():
    return [(node, refs, fn, OWNER.get(node, "tech")) for node, refs, fn in dossier_graph()]
