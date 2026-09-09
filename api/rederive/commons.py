# File: api/rederive/commons.py
"""Multi-tenant analyst COMMONS (NN-7, D-14). N analyst tenants contribute to ONE memory.db;
the synth tenant reads their metrics cross-tenant and writes a COLD attribution ledger.
UNIQUE(tenant_id, category, name) lets analysts coexist without collision."""
from __future__ import annotations
from .engine import Engine
from .pipeline import commons_graph

from .pipeline import commons_graph, OWNER   # OWNER: node -> domain ("market"/"tech"/"people"/"synth")

TENANTS = {  # domain -> full analyst tenant_id
    "market": "analyst.market", "tech": "analyst.tech", "people": "analyst.people", "synth": "synth"}

class Commons:
    def __init__(self, db_path: str):
        # one Engine per FULL tenant_id, all on ONE memory.db (UNIQUE(tenant_id,category,name))
        self._engines = {full: Engine(db_path=db_path, tenant=full) for full in TENANTS.values()}

    def engine_for(self, domain: str) -> Engine:
        return self._engines[TENANTS[domain]]                 # map domain -> full tenant -> engine

    def run(self):
        """Run the commons graph; each node derives under its owner tenant; synth cites contributors."""
        report = {}
        for node, refs, fn, domain in commons_graph():        # domain ∈ {market,tech,people,synth}
            eng = self.engine_for(domain)
            _val, verdict = eng.derive(node, refs, fn)
            report[node] = verdict
            if domain == "synth":                             # attribution ledger (coordination proof, NN-7)
                # contributor tenant of each cited metric via the AUTHORITATIVE OWNER map (no string heuristic)
                contributors = sorted({TENANTS[OWNER[r.split(":", 1)[1]]]
                                       for r in refs if r.startswith("derivation:") and r.split(":", 1)[1] in OWNER})
                eng.attribute(node, "synth", contributors)
        return report
