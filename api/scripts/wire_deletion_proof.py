"""WIRE — deletion test + time-machine on the REAL substrate, no LLM (stub derive fns).
Proves: warm graph -> amnesia (memory gone, cold price returns) -> restore (warm intact),
and time-machine restore returns journaled fingerprint+provenance (DH-4), NOT full value body."""
import os, sys
DB = "/tmp/rederive-wire-del.db"
for p in (DB, DB + ".amnesia"):
    if os.path.exists(p):
        os.remove(p)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from rederive.engine import Engine

e = Engine(db_path=DB, tenant="rederive")
e.seed_doctrine()

# tiny 3-node graph with stub fns (no LLM): src -> a -> b
e.ingest_source("s1", "hello world")
def fa(v): return {"val": "A", "n": 1}
def fb(v): return {"val": "B", "n": 2}
graph = [("a", ["source:s1"], fa), ("b", ["derivation:a"], fb)]

print("=== WARM run (populate) ===")
rep = e.run_graph(graph)
print("derived:", rep.derived, "reused:", rep.reused)
q_warm = e.quote(graph)
print("warm quote -> derived_remaining:", q_warm["derived_count"], "usd:", q_warm["total_usd"])
assert q_warm["derived_count"] == 0, "warm should be fully cached"

print("\n=== AMNESIA (deletion test) ===")
side_present = e.amnesia()
print("memory.db renamed to .amnesia:", side_present)
q_cold = e.quote(graph)
print("post-amnesia quote -> derived_remaining:", q_cold["derived_count"], "usd:", q_cold["total_usd"])
assert q_cold["derived_count"] == 2, "amnesia must force full re-derive (cold price)"
st = e.graph_state(graph, None)
live = [n["id"] for n in st["nodes"] if not n["id"].startswith("src_")]
print("live derivation nodes after amnesia:", live, "(intelligence vanished)")
assert live == [], "derivations must vanish on amnesia"

print("\n=== RESTORE (warm intact) ===")
e.restore()
q_restored = e.quote(graph)
print("post-restore quote -> derived_remaining:", q_restored["derived_count"], "usd:", q_restored["total_usd"])
assert q_restored["derived_count"] == 0, "restore must bring warm cache back"
print("-> DELETION TEST genuine: warm -> cold price on amnesia -> warm on restore")

print("\n=== TIME-MACHINE (DH-4: journaled fp+provenance, NOT full value) ===")
tm = e.restore_archived("a")
print("restore_archived('a') ->", tm)
assert tm["source"] == "COLD-journal"
assert "value_fp" in tm and "deps" in tm and "edges" in tm
assert "value" not in tm, "DH-4: must NOT return the full prior value body"
print("-> returns {value_fp, edges, deps, source} from COLD journal; no full value body (DH-4 satisfied)")

print("\nALL DELETION + TIME-MACHINE PROOFS PASSED")
