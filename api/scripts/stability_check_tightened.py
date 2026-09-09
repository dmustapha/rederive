# File: api/scripts/stability_check_tightened.py
"""T1.2 tightening (D-4/D-5): the §20 free-number 0-10 score drifted (8/5/5, FIELD-STABLE:False).
Per D-4 the mitigation is to constrain the metric to an ENUM from a fixed set (not a free number),
so field-equality can stand on it. Same 3x-live harness, tightened prompt. Recorded BOTH results
in CLAIMS.md honesty ledger — this is the honest evidence trail the pivot gate depends on."""
import json
from rederive.llm import complete_json, STRUCT_RULES
CLAIMS = {"derivation:x_docs": {"claims": [
    {"metric": "storage cap bytes", "value": 5242880, "confidence": "high"},
    {"metric": "search engine", "value": "sqlite fts5", "confidence": "high"}]}}
ENUM = ["poor", "adequate", "strong"]
vals = []
for i in range(3):
    r = complete_json(
        f"You classify ONE metric from structured claims. {STRUCT_RULES} "
        f"\"value\" MUST be exactly one of the enum {ENUM} — no other value permitted.",
        f"CLAIMS:\n{CLAIMS}\n\nClassify: documentation quality.\n"
        f"Rule: >=2 high-confidence claims => \"strong\"; exactly 1 => \"adequate\"; 0 => \"poor\".\n"
        f"Return {{\"value\": <one of {ENUM}>, \"basis\": str<=12w}}.",
        ["value", "basis"])
    vals.append(r["value"]); print(f"run {i}: value={r['value']!r} basis={r['basis']!r}")
print("FIELD-STABLE:", len(set(map(str, vals))) == 1)
