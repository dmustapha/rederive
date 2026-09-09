# File: api/tests/test_provenance.py
import tempfile
from rederive.engine import Engine

def test_every_derivation_has_journal_event():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("a", "x")
    eng.derive("n1", ["source:a"], lambda v: 1)
    eng.derive("n2", ["derivation:n1"], lambda v: 2)
    events = eng._m.read_events(limit=100)
    derive_nodes = {e["evaluated"]["node"] for e in events
                    if isinstance(e.get("evaluated"), dict) and e["evaluated"].get("type") == "derive"}
    for node in ("n1", "n2"):
        assert node in derive_nodes, f"WARM derivation {node} lacks a COLD derive event"
