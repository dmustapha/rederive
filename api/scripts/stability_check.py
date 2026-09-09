# File: api/scripts/stability_check.py
"""PIVOT-GATE evidence: derive one metric 3x live; report field-equality rate."""
import json
from rederive.llm import complete_json, STRUCT_RULES
CLAIMS = {"derivation:x_docs": {"claims": [
    {"metric": "storage cap bytes", "value": 5242880, "confidence": "high"},
    {"metric": "search engine", "value": "sqlite fts5", "confidence": "high"}]}}
vals = []
for i in range(3):
    r = complete_json(f"You compute ONE metric from structured claims. {STRUCT_RULES} \"value\" MUST be a number.",
                      f"CLAIMS:\n{CLAIMS}\n\nCompute: documentation quality score 0-10.\nReturn {{\"value\": ..., \"basis\": str<=12w}}.",
                      ["value", "basis"])
    vals.append(r["value"]); print(f"run {i}: value={r['value']} basis={r['basis']!r}")
print("FIELD-STABLE:", len(set(map(str, vals))) == 1)
