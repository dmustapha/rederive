# File: api/tests/test_pricing.py
import tempfile
from rederive.engine import Engine, UNIT_USD

def test_quote_is_sum_of_stale_items():
    eng = Engine(db_path=tempfile.mktemp(suffix=".db"), tenant="t")
    eng.ingest_source("a", "1"); eng.ingest_source("b", "2")
    fa = lambda v: v["source:a"]; fb = lambda v: v["source:b"]
    fc = lambda v: v["derivation:na"] + v["derivation:nb"]
    graph = [("na", ["source:a"], fa), ("nb", ["source:b"], fb),
             ("nc", ["derivation:na", "derivation:nb"], fc)]
    for n, r, f in graph: eng.derive(n, r, f)
    q0 = eng.quote(graph)
    assert q0["derived_count"] == 0 and q0["total_usd"] == 0
    eng.ingest_source("a", "1-changed")
    q1 = eng.quote(graph)
    stale = {i["node"] for i in q1["items"]}
    assert stale == {"na", "nc"}                     # cone only
    assert q1["total_usd"] == round(sum(i["unit_usd"] for i in q1["items"]), 4)
    assert abs(q1["total_usd"] - 2 * UNIT_USD) < 1e-9
