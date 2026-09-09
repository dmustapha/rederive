# File: api/tests/test_commons.py
# Asserts multi-tenant coordination (NN-7): two analyst tenants write the same
# category/name in one db without collision (UNIQUE(tenant_id,category,name)); a
# synth-tenant run writes a COLD attribution event naming the contributing tenants;
# read_events shows the cross-tenant citation.
#
# DEFERRED-UNTIL-C2: this test depends on commons.py / commons_graph() (built at C2 T2.1b),
# the same way test_purity waits for pipeline.py. It is created now and first RUN at C2.
import tempfile
import pytest

# Skip cleanly until commons.py exists (C2). Runs green once commons_graph() is available.
pytest.importorskip("rederive.commons", reason="commons.py wired at C2 T2.1b (NN-7)")

from rederive.engine import Engine
from rederive.commons import Commons  # noqa: E402


def test_two_tenants_coexist_and_synth_cites_contributors():
    db = tempfile.mktemp(suffix=".db")
    # two analyst tenants write the SAME category/name without collision
    market = Engine(db_path=db, tenant="analyst.market")
    tech = Engine(db_path=db, tenant="analyst.tech")
    market.seed_doctrine()
    market.ingest_source("token", "supply 1e9 liquidity deep")
    tech.ingest_source("docs", "sqlite fts5 storage cap")
    # same category="derivation", same name="m_shared" under distinct tenants -> no collision
    market.derive("m_shared", ["source:token"], lambda v: {"value": 1})
    tech.derive("m_shared", ["source:docs"], lambda v: {"value": 2})
    assert market.get_derivation("m_shared")["value"] == {"value": 1}
    assert tech.get_derivation("m_shared")["value"] == {"value": 2}

    # synth tenant reads cross-tenant and writes a COLD attribution event
    synth = Engine(db_path=db, tenant="synth")
    synth.attribute("s_verdict", "synth", cites=["analyst.market", "analyst.tech"])
    events = synth._m.read_events(limit=200)
    attributions = [e for e in events
                    if isinstance(e.get("evaluated"), dict)
                    and e["evaluated"].get("type") == "attribution"]
    assert attributions, "no COLD attribution event written (NN-7)"
    cites = attributions[-1].get("extra", {}).get("cites", [])
    assert "analyst.market" in cites and "analyst.tech" in cites, \
        "attribution did not name contributing tenants (cross-tenant citation)"
