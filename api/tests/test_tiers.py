# File: api/tests/test_tiers.py
# Asserts ALL FIVE Sibyl tiers do DISTINCT load-bearing work (NN-6). Each tier has a
# delete-test: remove the tier and a behavior changes. No network, deterministic fn.
import tempfile
from rederive.engine import Engine, RunReport


def _graph():
    # storage-flavoured deterministic mini-dossier: 1 source -> 1 metric -> 1 synth
    metric = lambda v: {"value": len(v["source:docs"].split())}
    synth = lambda v: {"score": v["derivation:m_storage"]["value"]}
    return [("m_storage", ["source:docs"], metric),
            ("s_verdict", ["derivation:m_storage"], synth)]


def test_hot_cursor_roundtrips_and_survives_restart():
    db = tempfile.mktemp(suffix=".db")
    eng = Engine(db_path=db, tenant="t")
    eng.seed_doctrine()
    eng.ingest_source("docs", "sqlite fts5 storage cap five megabytes")
    eng.run_graph(_graph())
    cur = eng.get_cursor()                                  # HOT read via get_state
    assert cur["status"] == "idle" and cur["total"] == 2    # cursor reflects the finished run
    # simulated restart: close the client, reopen a fresh Engine on the SAME db file
    eng.close()
    eng2 = Engine(db_path=db, tenant="t")
    cur2 = eng2.get_cursor()                                # HOT survives the restart (set_state-backed)
    assert cur2["total"] == 2 and cur2["done"] == 2, "HOT cursor was a global, not set_state-backed"


def test_reference_doctrine_edit_changes_price_no_code_change():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.seed_doctrine()
    assert eng.unit_cost() == 0.02                          # READ from REFERENCE, not a constant
    eng.ingest_source("docs", "one two three")
    g = _graph()
    eng.ingest_source("docs", "one two three")
    q_before = eng.quote(g)["total_usd"]                    # 2 nodes * 0.02
    # edit the doctrine (REFERENCE tier) — NO engine code change
    eng._m.set_reference("doctrine/pricing",
                         {"unit_usd": 0.05, "currency": "USD", "basis": "one executed derivation"})
    assert eng.unit_cost() == 0.05
    q_after = eng.quote(g)["total_usd"]
    assert q_after > q_before, "quote() ignored the doctrine edit — still reading UNIT_USD constant (NN-6)"
    assert abs(q_after - 2 * 0.05) < 1e-9


def test_warm_cache_hit_on_second_derive():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.seed_doctrine()
    eng.ingest_source("docs", "alpha beta gamma")
    metric = lambda v: {"value": len(v["source:docs"].split())}
    eng.derive("m_storage", ["source:docs"], metric)        # first: DERIVED (WARM write)
    _val, verdict = eng.derive("m_storage", ["source:docs"], metric)  # second: WARM hit
    assert verdict == "REUSED", "WARM cache did not serve the second derive"


def test_cold_journal_has_derive_event_per_node():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.seed_doctrine()
    eng.ingest_source("docs", "alpha beta gamma delta")
    rep = eng.run_graph(_graph())
    events = eng._m.read_events(limit=200)
    derive_nodes = {e["evaluated"]["node"] for e in events
                    if isinstance(e.get("evaluated"), dict) and e["evaluated"].get("type") == "derive"}
    for node in ("m_storage", "s_verdict"):
        assert node in derive_nodes, f"COLD journal missing a derive event for {node} (NN-3)"


def test_archive_holds_superseded_derivation():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.seed_doctrine()
    eng.ingest_source("docs", "alpha beta")                 # 2 words
    metric = lambda v: {"value": len(v["source:docs"].split())}
    eng.derive("m_storage", ["source:docs"], metric)        # value {"value":2}
    eng.ingest_source("docs", "alpha beta gamma four")      # 4 words -> supersede
    eng.derive("m_storage", ["source:docs"], metric)        # archives the {"value":2} record
    prior = eng.restore_archived("m_storage")               # ARCHIVE tier, recoverable
    assert prior is not None, "ARCHIVE tier lost the superseded derivation (D-15)"
