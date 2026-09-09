# File: api/tests/test_amnesia.py
import tempfile
from rederive.engine import Engine

def test_amnesia_close_before_rename_and_restore():
    db = tempfile.mktemp(suffix=".db")
    eng = Engine(db_path=db, tenant="t")
    eng.ingest_source("a", "x")
    eng.derive("n", ["source:a"], lambda v: 42)
    graph = [("n", ["source:a"], lambda v: 42)]
    assert eng.quote(graph)["derived_count"] == 0        # warm
    eng.amnesia()
    assert eng.quote(graph)["derived_count"] == 1        # cold: full price again
    eng.restore()
    assert eng.quote(graph)["derived_count"] == 0        # cold-start recall: warm state returns
    assert eng.get_derivation("n")["value"] == 42
