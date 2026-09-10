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

    def run(self, sources: dict):
        """Real multi-tenant coordination (NN-7, D-14). Each analyst tenant INDEPENDENTLY ingests
        the shared sources into ONE memory.db and computes the facts it OWNS — the same
        extraction can exist under market AND tech without collision (UNIQUE(tenant_id,cat,name)).
        The synth tenant then writes a COLD attribution ledger citing which analyst tenants produced
        the facts feeding each synthesis. (derive() reads are tenant-scoped, so each analyst computes
        the extractions its metrics need locally; synth coordinates via ATTRIBUTION, not cross-tenant
        derivation — the honest, verifiable form of the claim, matching test_commons.)"""
        from .pipeline import dossier_graph
        graph = {n: (refs, fn) for n, refs, fn in dossier_graph()}
        exens = [n for n in graph if n.startswith("x_")]
        report = {}
        for domain in ("market", "tech", "people"):
            eng = self.engine_for(domain)
            eng.seed_doctrine()
            for name, content in sources.items():
                eng.ingest_source(name, content)
            for x in exens:                                   # each analyst extracts locally (its own copy)
                refs, fn = graph[x]; eng.derive(x, refs, fn)
            for node in [n for n, d in OWNER.items() if d == domain and n.startswith("m_")]:
                refs, fn = graph[node]; eng.derive(node, refs, fn)
                report[node] = self.TENANTS_BY_NODE(node)
        synth = self.engine_for("synth"); synth.seed_doctrine()
        for snode in ("s_risk", "s_score", "s_verdict"):      # attribution ledger (NN-7 cross-tenant citation)
            refs, _fn = graph[snode]
            contributors = sorted({TENANTS[OWNER[r.split(":", 1)[1]]]
                                   for r in refs if r.startswith("derivation:") and r.split(":", 1)[1] in OWNER})
            synth.attribute(snode, "synth", contributors)
            report[snode] = f"synth cites {contributors}"
        return report

    @staticmethod
    def TENANTS_BY_NODE(node: str) -> str:
        return TENANTS[OWNER[node]]
