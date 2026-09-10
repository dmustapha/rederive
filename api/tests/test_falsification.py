# File: api/tests/test_falsification.py
# Phase 8.5 self-falsification: each headline claim is fed a LIE and must be REJECTED.
# Headline: "incremental recompilation — reuse ONLY when content-addressed key matches;
# verify-on-serve REFUSES a tampered stored value."
import tempfile
from rederive.engine import Engine, stable_fp


def test_lie_tampered_key_is_not_served_as_reused():
    # Feed the lie: a stored derivation whose reads no longer match its key.
    # The system must RE-DERIVE (mark stale), never serve the stale cached value.
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("a", "original")
    fn = lambda v: {"len": len(str(v["source:a"]))}
    eng.derive("n", ["source:a"], fn)
    g = [("n", ["source:a"], fn)]
    assert eng.quote(g)["derived_count"] == 0            # warm, honestly reused

    eng.ingest_source("a", "CHANGED-CONTENT")            # the lie: source moved under the cache
    q = eng.quote(g)
    assert q["derived_count"] == 1                        # REFUSED to reuse — re-derive required
    # and a real run actually recomputes the new value (no stale served)
    eng.run_graph(g)
    assert eng.get_derivation("n")["value"]["len"] == len("CHANGED-CONTENT")


def test_lie_tampered_value_fp_is_caught_by_verify():
    # Feed the lie: corrupt a stored value_fp. verify-on-serve must return MISMATCH and archive.
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("a", "x")
    fn = lambda v: {"label": "low"}
    eng.derive("n", ["source:a"], fn)
    body = eng._m.get_entity("derivation", "n")["body"]
    body["value_fp"] = "deadbeefdeadbeef"                 # tamper
    eng._m.set_entity("derivation", "n", body)
    r = eng.verify("n", {"n": (["source:a"], fn)})
    assert r["verdict"] == "MISMATCH"                     # the lie is caught
    # honest failure mode: the tampered node is auto-archived (not silently trusted)
    from sibyl_memory_client.exceptions import NotFoundError
    try:
        eng._m.get_entity("derivation", "n")
        served = True
    except NotFoundError:
        served = False
    assert served is False


def test_lie_fabricated_reuse_across_different_reads():
    # Two distinct inputs must NOT collide into one cache entry (content-addressing integrity).
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("a", "AAA")
    fn = lambda v: {"echo": v["source:a"]}
    val1, _ = eng.derive("n", ["source:a"], fn)
    eng.ingest_source("a", "BBB")
    val2, status = eng.derive("n", ["source:a"], fn)
    assert status == "DERIVED" and val2["echo"] == "BBB"  # not a false cache hit on AAA
