# File: api/tests/test_cutoff.py
import tempfile
from rederive.engine import Engine, RunReport

def test_early_cutoff():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("a", "hello world one")
    count = lambda v: len(v["source:a"].split())
    rep_fn = lambda v: f"report:{v['derivation:count']}"
    eng.derive("count", ["source:a"], count)
    eng.derive("report", ["derivation:count"], rep_fn)
    eng.ingest_source("a", "goodbye cruel world")      # same word count
    rep = RunReport()
    eng.derive("count", ["source:a"], count, rep)
    _val, verdict = eng.derive("report", ["derivation:count"], rep_fn, rep)
    assert verdict == "REUSED" and "count" in rep.cutoff
