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
    # NN-4 decision: extraction free text is NOT reproducibly verifiable (open-ended prose).
    # Fingerprint the whole claims structure; verify-on-serve for reuse MATCH is scoped to
    # metric/synth (derivation) nodes where the stable projection is deterministic. See CLAIMS.md.
    fn._fp_keys = None   # None = hash the full value (no stable projection available)
    return fn

EXTRACTORS = {s: _ex(s) for s in SOURCES}

# D-4 (verify-on-serve hardening, NN-4): EVERY metric emits a COARSE STABLE ENUM at temp 0.
# Free integers (0-10 / counts) drift ±1 across LLM runs -> value_fp flips -> reuse MISMATCH.
# CLAIMS.md measured this directly: free 0-10 -> [8,5,5] FIELD-STABLE:False; enum -> stable:True.
# Each bucket carries an explicit rubric IN the prompt so the model's choice is reproducible.
# `m_storage_arch` was a free-text "summary" forced to an integer (incoherent) -> now categorical.
METRICS = [  # (metric_node, [input extraction nodes], question, enum/domain, rubric)
    ("m_storage_arch",  ["docs"],               "dominant storage/state architecture",
     ["singleton", "per-pool", "modular", "sqlite", "postgres", "onchain", "other"],
     "singleton=one contract holds all state; per-pool=one contract per pool/entity; "
     "modular=pluggable components; sqlite/postgres=named db; onchain=generic on-chain store; else other"),
    ("m_doc_quality",   ["docs"],               "documentation quality",
     ["poor", "adequate", "strong"],
     "poor=sparse/missing; adequate=covers core usage; strong=concepts+references+guides"),
    ("m_api_surface",   ["docs"],               "size of the documented API surface",
     ["few", "some", "many"],
     "few=<5 documented methods/actions; some=5-15; many=>15"),
    ("m_commit_rate",   ["github"],             "recent commit / development activity",
     ["low", "moderate", "high"],
     "low=stale/few commits; moderate=steady; high=>1k commits or visibly active development"),
    ("m_test_coverage", ["github"],             "testing signal strength",
     ["none", "partial", "strong"],
     "none=no test signal; partial=some tests; strong=test suite + fuzz/invariant/CI config present"),
    ("m_bus_factor",    ["github", "team"],     "team/contributor concentration (bus factor)",
     ["concentrated", "moderate", "distributed"],
     "concentrated=1-2 key people; moderate=small core team; distributed=large org or many contributors"),
    ("m_supply_risk",   ["token"],              "supply concentration risk",
     ["low", "medium", "high"],
     "low=broad distribution/vested; medium=some concentration; high=large undistributed/unlocked share"),
    ("m_utility",       ["token", "docs"],      "token utility strength",
     ["weak", "moderate", "strong"],
     "weak=speculative only; moderate=some protocol role; strong=governance/fees/core protocol role"),
    ("m_liquidity",     ["token"],              "liquidity depth",
     ["thin", "moderate", "deep"],
     "thin=low volume/TVL; moderate=mid; deep=billions TVL or very high volume"),
    ("m_team_track",    ["team"],               "team track-record",
     ["unproven", "mixed", "strong"],
     "unproven=anon/new; mixed=some history; strong=named founders with shipped, established product"),
    ("m_transparency",  ["team", "community"],  "team & governance transparency",
     ["opaque", "partial", "transparent"],
     "opaque=anon/no disclosure; partial=some public info; transparent=named team + open governance"),
    ("m_sentiment",     ["community"],          "community sentiment",
     ["negative", "mixed", "positive"], "overall tone of community/governance signal"),
    ("m_growth",        ["community", "github"],"growth trajectory",
     ["declining", "flat", "growing"], "direction of usage/activity/participation over time"),
    ("m_audit_status",  ["audits"],             "audit coverage",
     ["none", "partial", "full"],
     "none=unaudited; partial=1-2 audits; full=multiple independent audits + bug bounty"),
    ("m_sec_incidents", ["audits", "community"],"known security incidents",
     ["none", "minor", "major"],
     "none=no incidents; minor=low-severity findings only; major=critical exploit/loss of funds"),
]

def _metric(node: str, question: str, enum: list[str], rubric: str):
    def fn(values: dict) -> dict:
        return complete_json(
            f"You compute ONE metric from structured claims. {STRUCT_RULES}"
            f" \"value\" MUST be EXACTLY one of {enum}. Rubric: {rubric}.",
            f"CLAIMS:\n{values}\n\nCompute: {question}.\n"
            "Return {\"value\": <enum>, \"basis\": str<=12w}.",
            ["value", "basis"])
    fn.__name__ = node
    fn._fp_keys = ["value"]   # NN-4: fingerprint the STABLE decision only; `basis` is display prose
    return fn

METRIC_FNS = {node: _metric(node, q, e, r) for node, _refs, q, e, r in METRICS}

# D-4: synthesis nodes read metric VALUES (now stable enums) so their own decision reproduces.
# Each synth carries a STABLE ENUM decision field (fp_keys) + free prose for display.
# s_score: the raw 0-100 `overall` number drifts ±, so identity is the coarse `band` enum,
# NOT the number (the number ships for display; the band is the reproducible decision).
SYNTHS = [  # (node, [inputs], ask, required_keys, fp_keys)
    ("s_risk",    [n for n, _r, _q, _e, _b in METRICS],
     "Return {\"risk_level\": \"low\"|\"medium\"|\"high\", \"top_risks\": [str<=12w] (max 3)}.",
     ["risk_level", "top_risks"], ["risk_level"]),
    ("s_score",   [n for n, _r, _q, _e, _b in METRICS],
     "Return {\"band\": \"weak\"|\"fair\"|\"good\"|\"excellent\" "
     "(weak<40, fair 40-59, good 60-79, excellent>=80), "
     "\"overall\": number 0-100, \"strongest\": str<=8w, \"weakest\": str<=8w}.",
     ["band", "overall", "strongest", "weakest"], ["band"]),
    ("s_verdict", ["s_risk", "s_score"],
     "Return {\"verdict\": \"avoid\"|\"caution\"|\"promising\"|\"strong\", \"one_liner\": str<=12w}.",
     ["verdict", "one_liner"], ["verdict"]),
]

def _synth(node: str, ask: str, req: list[str], fp_keys: list[str]):
    def fn(values: dict) -> dict:
        return complete_json(f"You synthesize a due-diligence conclusion from metric values. {STRUCT_RULES}",
                             f"METRIC VALUES:\n{values}\n\n{ask}", req)
    fn.__name__ = node
    fn._fp_keys = fp_keys   # NN-4: fingerprint the stable decision enum, not free prose / drifting number
    return fn

SYNTH_FNS = {node: _synth(node, ask, req, fpk) for node, _refs, ask, req, fpk in SYNTHS}

def dossier_graph() -> list[tuple[str, list[str], object]]:
    g = []
    for s in SOURCES:
        g.append((f"x_{s}", [f"source:{s}"], EXTRACTORS[s]))
    for node, refs, _q, _e, _b in METRICS:
        g.append((node, [f"derivation:x_{r}" for r in refs], METRIC_FNS[node]))
    for node, refs, _ask, _req, _fpk in SYNTHS:
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
