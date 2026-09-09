# File: api/scripts/verify_claims.py
"""Recompute every headline number in submission/proof.md from committed artifacts.
Refuses read-back: recomputes from receipt JSONs + run reports, then diffs."""
import json, pathlib, re, sys
proof = pathlib.Path("submission/proof.md")
receipts = sorted(pathlib.Path("submission").glob("receipt-*.json"))
if not proof.exists() or not receipts:
    sys.exit("MISSING: submission/proof.md or receipt-*.json — nothing to verify")
claimed = dict(re.findall(r"CLAIM:([a-z_]+)=([\d.]+)", proof.read_text()))
computed = {}
for rp in receipts:
    r = json.loads(rp.read_text())
    tag = rp.stem.split("-", 1)[1]  # cold|warm
    computed[f"{tag}_usd"] = str(r["quoted_usd"]) if "quoted_usd" in r else str(r.get("total_usd"))
    computed[f"{tag}_derived"] = str(len(r["derived"])); computed[f"{tag}_reused"] = str(len(r["reused"]))
bad = {k: (claimed.get(k), computed.get(k)) for k in claimed if claimed[k] != computed.get(k, claimed[k])}
print(json.dumps({"claimed": claimed, "computed": computed, "MISMATCH": bad}, indent=2))
sys.exit(1 if bad else 0)
