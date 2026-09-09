# File: api/tests/test_recall.py
# Asserts FTS5 recall (D-13): after a warm run, engine.recall("storage") returns the
# storage-related derivation/provenance. Also proves the DT-8 journal-fallback branch
# returns a hit when the SDK exposes no search()/recall() method. No network.
import tempfile
from rederive.engine import Engine


def _warm(db):
    eng = Engine(db_path=db, tenant="t")
    eng.seed_doctrine()
    eng.ingest_source("docs", "sqlite fts5 storage cap five megabytes")
    metric = lambda v: {"value": len(v["source:docs"].split()), "note": "storage cap"}
    eng.derive("m_storage", ["source:docs"], metric)
    return eng


def test_recall_returns_storage_hit():
    eng = _warm(tempfile.mktemp(suffix=".db"))
    hits = eng.recall("storage")
    assert isinstance(hits, list)
    # the storage keyword must surface at least one derivation/provenance record
    blob = str(hits).lower()
    assert len(hits) >= 1 and "storage" in blob, "recall found no storage-related record"


def test_recall_journal_fallback_when_no_sdk_search(monkeypatch):
    # DT-8 fallback branch: simulate an SDK with no search()/recall() — recall must still
    # return a real FTS-over-COLD hit from the journal (slower, but real).
    eng = _warm(tempfile.mktemp(suffix=".db"))
    for attr in ("search", "recall"):
        if hasattr(eng._m, attr):
            monkeypatch.delattr(type(eng._m), attr, raising=False)
    hits = eng.recall("storage")
    assert isinstance(hits, list) and len(hits) >= 1, "journal-fallback recall returned nothing"
    assert all(hasattr_or_key(h, "tier") for h in hits)


def hasattr_or_key(obj, key):
    if isinstance(obj, dict):
        return key in obj
    return hasattr(obj, key)
