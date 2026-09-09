# File: api/tests/test_capture.py
import tempfile
from rederive.engine import Engine

def test_edges_equal_wrapper_reads():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("a", "x"); eng.ingest_source("b", "y")
    eng.derive("n", ["source:a", "source:b"], lambda v: sorted(v.keys()))
    body = eng.get_derivation("n")
    assert body["edges"] == ["source:a", "source:b"]
    assert body["value"] == ["source:a", "source:b"]   # fn saw exactly the wrapper's reads
