# File: api/tests/test_stress_regressions.py
# Regression coverage for stress_test-owned bugs: DH-9, DH-10, DH-3.
import tempfile
from rederive.engine import Engine, UNIT_USD


# ── DH-9: /verify must never 500 when an UPSTREAM derivation was auto-archived ──
def test_verify_stale_when_upstream_archived():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("token", '{"supply":100}')
    up = lambda v: {"claims": [{"metric": "supply", "value": 100}]}
    dn = lambda v: {"label": "medium", "score": 5}
    eng.derive("x_token", ["source:token"], up)
    eng.derive("m_liquidity", ["derivation:x_token"], dn)
    graph_fns = {"m_liquidity": (["derivation:x_token"], dn)}

    # simulate an upstream MISMATCH auto-invalidation (archive), then verify the dependent
    eng._m.archive_entity("derivation", "x_token")
    r = eng.verify("m_liquidity", graph_fns)
    assert r["verdict"] == "STALE"                      # not a crash
    assert r["stored_fp"] is not None                   # the dependent node still had a stored fp
    assert "upstream" in r["reason"]


def test_verify_stale_when_target_archived_still_holds():
    # the pre-existing guard (target node absent) must remain intact
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("token", "x")
    fn = lambda v: {"label": "low", "score": 2}
    eng.derive("x_token", ["source:token"], lambda v: {"claims": []})
    eng.derive("m_liquidity", ["derivation:x_token"], fn)
    eng._m.archive_entity("derivation", "m_liquidity")   # the TARGET is gone
    r = eng.verify("m_liquidity", {"m_liquidity": (["derivation:x_token"], fn)})
    assert r["verdict"] == "STALE" and r["stored_fp"] is None


# ── DH-10: REFERENCE doctrine survives amnesia/restore; /quote reads it, not the constant ──
def test_doctrine_present_and_load_bearing_after_amnesia_restore():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.seed_doctrine()
    # prove NN-6: editing the REFERENCE unit changes the live price (read from doctrine, not const)
    eng._m.set_reference("doctrine/pricing", {"unit_usd": 0.99, "currency": "USD", "basis": "x"})
    assert abs(eng.unit_cost() - 0.99) < 1e-9

    eng.amnesia()
    # doctrine re-seeded (config, not a derivation) -> get_reference is non-None, unit_cost is a
    # REFERENCE read of the seeded default, NOT a silent fallback to the env/module constant.
    assert eng._m.get_reference("doctrine/pricing") is not None
    assert abs(eng.unit_cost() - UNIT_USD) < 1e-9

    eng.restore()                                        # idempotent re-seed
    assert eng._m.get_reference("doctrine/pricing") is not None
    # after restore, doctrine reference still consulted (no _ref_body(None) crash path)
    assert isinstance(eng.unit_cost(), float)


def test_unit_cost_is_reference_read_not_env_constant():
    # NN-6 guard: a doctrine edit to a value distinct from UNIT_USD must win.
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.seed_doctrine()
    distinct = UNIT_USD + 0.5
    eng._m.set_reference("doctrine/pricing", {"unit_usd": distinct, "currency": "USD", "basis": "x"})
    assert abs(eng.unit_cost() - distinct) < 1e-9        # not UNIT_USD


# ── DH-3: cone/cutoff-refund accounting under CHAINED multi-source edits ──
def _chain_graph():
    fa = lambda v: {"n": len(str(v["source:a"]))}
    fb = lambda v: {"n": len(str(v["source:b"]))}
    fc = lambda v: {"sum": v["derivation:na"]["n"] + v["derivation:nb"]["n"]}
    fd = lambda v: {"flag": v["derivation:nc"]["sum"] > 0}   # value-stable label -> cutoff candidate
    return [("na", ["source:a"], fa), ("nb", ["source:b"], fb),
            ("nc", ["derivation:na", "derivation:nb"], fc),
            ("nd", ["derivation:nc"], fd)]


def test_multi_source_edit_cone_pricing():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("a", "aa"); eng.ingest_source("b", "bbb")
    g = _chain_graph()
    for n, r, f in g:
        eng.derive(n, r, f)
    assert eng.quote(g)["derived_count"] == 0            # fully warm

    # edit BOTH sources: cone must be the transitive union {na,nb,nc,nd}, priced once each
    eng.ingest_source("a", "aaaa"); eng.ingest_source("b", "bbbbbb")
    q = eng.quote(g)
    assert {i["node"] for i in q["items"]} == {"na", "nb", "nc", "nd"}
    assert q["derived_count"] == 4
    assert q["reused_count"] == 0
    assert abs(q["total_usd"] - 4 * eng.unit_cost()) < 1e-9   # no double-charge


def test_cutoff_refund_stops_cascade_under_chained_edit():
    # An edit that changes an upstream VALUE but leaves a downstream field-stable must REFUND
    # the descendants at run time (cutoff), even though quote conservatively priced them.
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("a", "aa"); eng.ingest_source("b", "bbb")
    g = _chain_graph()
    for n, r, f in g:
        eng.derive(n, r, f)

    # edit source a so na changes, but nd's boolean flag stays True (value-stable projection)
    eng.ingest_source("a", "aaaaaZZZ")
    q = eng.quote(g)                                     # conservative upper bound
    assert "nd" in {i["node"] for i in q["items"]}       # priced as would-execute
    rep = eng.run_graph(g)
    # nd re-derived but its fp unchanged -> recorded as cutoff (the refund signal)
    assert "nd" in rep.cutoff or "nd" in rep.reused
    # no stale served: nc must reflect the new upstream, nd stays consistent
    assert eng.get_derivation("nc")["value"]["sum"] == len("aaaaaZZZ") + len("bbb")


def test_error_node_partial_run_does_not_corrupt_siblings():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("a", "aa"); eng.ingest_source("b", "bbb")
    def boom(v):
        raise ValueError("synthetic derive failure")
    g = [("na", ["source:a"], lambda v: {"n": 2}),
         ("nbad", ["source:b"], boom),
         ("nc", ["derivation:na"], lambda v: {"ok": True})]
    rep = eng.run_graph(g)
    assert "nbad" in rep.errors                           # error surfaced per-node
    assert "na" in rep.derived and "nc" in rep.derived    # siblings unaffected
    assert eng.get_derivation("nc")["value"]["ok"] is True


# ── LT-VERIFY-EXTRACT: verify on a NON-REPRODUCIBLE extraction node must never archive it ──
# (found in livetest: /answer verify-on-serve sampled an extraction whose prose re-derives
#  differently every call -> false MISMATCH -> auto-archive -> warm price silently drifted up)
def test_verify_never_archives_non_reproducible_extraction():
    from sibyl_memory_client.exceptions import NotFoundError
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("docs", "some docs content")
    call = {"n": 0}
    def extract(v):                       # non-deterministic prose: differs each call
        call["n"] += 1
        return {"claims": [{"metric": "note", "value": f"v{call['n']}"}]}
    extract._fp_keys = None
    extract._non_reproducible = True      # the production extraction marker
    eng.derive("x_docs", ["source:docs"], extract)
    r = eng.verify("x_docs", {"x_docs": (["source:docs"], extract)})
    assert r["verdict"] in ("MATCH", "UNVERIFIABLE")     # honest, not a false MISMATCH
    assert r["verdict"] != "MISMATCH"
    # the node MUST still be served (never archived on a non-reproducible mismatch)
    try:
        eng.get_derivation("x_docs")
        served = True
    except NotFoundError:
        served = False
    assert served is True, "verify wrongly archived a non-reproducible extraction node"
