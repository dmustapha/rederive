# File: api/rederive/engine.py
"""Rederive engine: content-addressed sources, runtime-captured dependency edges,
cone invalidation with field-level early cutoff, executed-work pricing.
INVARIANTS.md NN-1..NN-7 are implemented in this file and nowhere else."""
from __future__ import annotations
import hashlib, json, os, threading
from dataclasses import dataclass, field
from typing import Any, Callable
from sibyl_memory_client import MemoryClient
from sibyl_memory_client.exceptions import NotFoundError

DB_PATH = os.environ.get("REDERIVE_DB", os.path.expanduser("~/.rederive/memory.db"))
UNIT_USD = float(os.environ.get("REDERIVE_UNIT_USD", "0.02"))  # price per executed derivation

def canon(v: Any) -> str:
    return json.dumps(v, sort_keys=True, separators=(",", ":"))

def h(v: Any) -> str:
    return hashlib.sha256(canon(v).encode()).hexdigest()[:16]

def stable_fp(value: Any, fn: Callable | None = None) -> str:
    """NN-4 fingerprint: hash the STABLE decision projection of a value, not drifting prose.
    A derive_fn may declare `_fp_keys` (list) = the reproducible identity fields (coarse enums /
    buckets). When present, the fingerprint covers ONLY those fields — so free-text `basis`,
    `one_liner`, `top_risks`, or a drifting 0-100 number never flips reuse/verify (D-4). When
    `_fp_keys` is None/absent (e.g. open-ended extraction text), the full value is hashed as before."""
    fp_keys = getattr(fn, "_fp_keys", None) if fn is not None else None
    if fp_keys and isinstance(value, dict):
        return h({k: value.get(k) for k in fp_keys})
    return h(value)

def _ref_body(ref: dict) -> dict:
    # DEV-004: client 0.8.1 returns REFERENCE bodies as a JSON string; entity/state bodies as dicts.
    body = ref["body"]
    return json.loads(body) if isinstance(body, str) else body

@dataclass
class RunReport:
    derived: list[str] = field(default_factory=list)
    reused: list[str] = field(default_factory=list)
    cutoff: list[str] = field(default_factory=list)   # re-derived upstream, value unchanged -> descendants reused
    errors: dict[str, str] = field(default_factory=dict)

class Engine:
    def __init__(self, db_path: str = DB_PATH, tenant: str = "rederive"):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._db_path, self._tenant = db_path, tenant
        self._lock = threading.Lock()
        self._open()

    # -- connection lifecycle (NN-5: close BEFORE rename or the fd keeps serving) --
    def _open(self):
        self._m = MemoryClient.local(self._db_path, tenant_id=self._tenant)

    def close(self):
        # NN-5 / DT-A: release the SQLite fd BEFORE any rename, or the open fd keeps serving the
        # renamed inode and fakes resilience. On client 0.8.1 the client has NO close(); the real
        # connection lives in MemoryClient._storage.close() (thread-local conns + registry), probed
        # via dir() at build (DEV-006). We try that first, then the assumed names, then a GC last
        # resort (CPython closes sqlite3 on GC).
        m = getattr(self, "_m", None)
        if m is not None:
            closed = False
            storage = getattr(m, "_storage", None)   # DT-A discovered path (client 0.8.1)
            if storage is not None and callable(getattr(storage, "close", None)):
                storage.close(); closed = True
            if not closed:
                for attr in ("close", "_close"):
                    fn = getattr(m, attr, None)
                    if callable(fn):
                        fn(); closed = True; break
            if not closed:
                conn = getattr(m, "_conn", None) or getattr(m, "_db", None)
                if conn is not None and hasattr(conn, "close"):
                    conn.close(); closed = True
        self._m = None
        if m is not None:
            import gc
            del m
            gc.collect()

    def amnesia(self) -> bool:
        """Deletion test: close -> rename db -> reopen empty. Returns db_present after."""
        with self._lock:
            self.close()
            if os.path.exists(self._db_path):
                os.rename(self._db_path, self._db_path + ".amnesia")
            self._open()
            db_swapped = os.path.exists(self._db_path + ".amnesia")
        # DH-10: REFERENCE-tier pricing doctrine is config, NOT a derivation — the deletion test
        # collapses DERIVATIONS (intelligence), not the price list. Re-seed so /doctrine never 500s
        # and /quote keeps reading the REFERENCE unit (NN-6), never the REDERIVE_UNIT_USD constant.
        self.seed_doctrine()
        return db_swapped

    def restore(self) -> bool:
        with self._lock:
            self.close()
            side = self._db_path + ".amnesia"
            if os.path.exists(side):
                if os.path.exists(self._db_path):
                    os.remove(self._db_path)
                os.rename(side, self._db_path)
            self._open()
        # DH-10: idempotent — restored db already carries doctrine (no-op); a restore with no
        # side-file (nothing to restore) still guarantees doctrine present so NN-6 pricing holds.
        self.seed_doctrine()
        return True

    def reset(self):
        with self._lock:
            self.close()
            if os.path.exists(self._db_path):
                os.remove(self._db_path)
            self._open()

    # -- sources (COLD journal + WARM current-version entity) --
    def ingest_source(self, name: str, content: str) -> str:
        ch = h(content)
        with self._lock:
            self._m.write_event(evaluated={"type": "source_ingest", "name": name, "hash": ch})
            self._m.set_entity("source", name, {"content": content, "hash": ch})
        return ch

    def get_source(self, name: str) -> dict:
        return self._m.get_entity("source", name)["body"]

    # -- the derive wrapper (NN-1: reads captured HERE are the only content path) --
    def derive(self, node: str, input_refs: list[str], fn: Callable[[dict], Any],
               report: RunReport | None = None) -> tuple[Any, str]:
        reads, values = [], {}
        for ref in input_refs:
            kind, nm = ref.split(":", 1)
            e = self._m.get_entity(kind, nm)
            body = e["body"]
            reads.append({"ref": ref, "hash": body.get("hash") or body.get("value_fp")})
            values[ref] = body.get("content", body.get("value"))
        key = h({"node": node, "reads": reads})
        try:
            cached = self._m.get_entity("derivation", node)
            if cached["body"]["key"] == key:
                if report: report.reused.append(node)
                return cached["body"]["value"], "REUSED"
            prev_fp = cached["body"]["value_fp"]
        except NotFoundError:
            prev_fp = None
        value = fn(values)                      # LLM call happens inside fn (pure fn of values)
        fp = stable_fp(value, fn)               # NN-4/D-4: identity = stable decision projection
        with self._lock:
            try:                                # ARCHIVE the superseded derivation (audit trail)
                self._m.archive_entity("derivation", node)
            except NotFoundError:
                pass
            self._m.set_entity("derivation", node,
                               {"value": value, "value_fp": fp, "key": key,
                                "edges": [r["ref"] for r in reads], "unit_usd": self.unit_cost()})  # REFERENCE-read (NN-6)
            self._m.write_event(evaluated={"type": "derive", "node": node, "edges": reads},
                                acted={"value_fp": fp},
                                extra={"deps": [r["ref"] for r in reads]})
        if report:
            report.derived.append(node)
            if prev_fp is not None and prev_fp == fp:
                report.cutoff.append(node)      # early cutoff: unchanged value stops the cascade
        return value, "DERIVED"

    # -- graph runner: nodes in topological order; reuse needs NO LLM call --
    def run_graph(self, graph: list[tuple[str, list[str], Callable]], stop_on_error=False) -> RunReport:
        rep = RunReport()
        total = len(graph)
        for i, (node, refs, fn) in enumerate(graph):
            # HOT cursor (NN-6/D-12): live run position, read by /state, survives restart
            self.set_cursor(node=node, done=i, total=total, status="running")
            try:
                self.derive(node, refs, fn, rep)
            except Exception as exc:            # noqa: BLE001 — per-node error surface (PRD Flow 1)
                rep.errors[node] = f"{type(exc).__name__}: {exc}"
                if stop_on_error: break
        self.set_cursor(node=None, done=total, total=total, status="idle")
        return rep

    # -- pricing (NN-2: the ONE code path; input = would-execute list) --
    def quote(self, graph: list[tuple[str, list[str], Callable]]) -> dict:
        # The cone is TRANSITIVE: a stale source flips its direct derivations' keys, and any
        # derivation reading a would-execute upstream is itself stale (topological order guarantees
        # upstream is decided first). Quote is the conservative would-execute upper bound; early
        # cutoff (unchanged re-derived value) is refunded at run time as `reused`, not here.
        items, stale = [], set()
        for node, refs, _fn in graph:
            reads = []
            executes = False
            try:
                for ref in refs:
                    kind, nm = ref.split(":", 1)
                    body = self._m.get_entity(kind, nm)["body"]
                    reads.append({"ref": ref, "hash": body.get("hash") or body.get("value_fp")})
                key = h({"node": node, "reads": reads})
                cached = self._m.get_entity("derivation", node)
                executes = cached["body"]["key"] != key
            except NotFoundError:
                executes = True
            # transitive propagation: a would-execute upstream derivation invalidates this node
            if any(r.startswith("derivation:") and r.split(":", 1)[1] in stale for r in refs):
                executes = True
            if executes:
                stale.add(node)
                items.append({"node": node, "unit_usd": self.unit_cost()})  # REFERENCE-read doctrine price (NN-6)
        return {"total_usd": round(sum(i["unit_usd"] for i in items), 4),
                "derived_count": len(items),
                "reused_count": len(graph) - len(items),
                "items": items}

    # -- verify-on-serve (NN-4) --
    def verify(self, node: str, graph_fns: dict[str, tuple[list[str], Callable]]) -> dict:
        refs, fn = graph_fns[node]
        try:
            stored = self._m.get_entity("derivation", node)["body"]
        except NotFoundError:
            # NN-4 honest failure mode: a prior MISMATCH auto-invalidated (archived) this node.
            # A subsequent verify/read must return a clean verdict, never crash — the node is
            # simply pending re-derivation (run_graph will rebuild it: NotFound -> executes).
            return {"verdict": "STALE", "stored_fp": None, "fresh_fp": None,
                    "reason": "node invalidated — re-derive to restore"}
        values = {}
        for ref in refs:
            kind, nm = ref.split(":", 1)
            try:
                body = self._m.get_entity(kind, nm)["body"]
            except NotFoundError:
                # NN-4 honest failure mode (transitive): an UPSTREAM ref was auto-invalidated
                # (archived after its own MISMATCH) or deleted. We cannot re-derive this node
                # without its inputs, so the verdict is STALE — never a 500. run_graph rebuilds
                # the whole cone (NotFound -> executes) on the next /answer.
                return {"verdict": "STALE", "stored_fp": stored["value_fp"], "fresh_fp": None,
                        "reason": f"upstream {ref} invalidated — re-derive cone to restore"}
            values[ref] = body.get("content", body.get("value"))
        fresh = fn(values)
        fresh_fp = stable_fp(fresh, fn)          # same stable projection the store used (D-4)
        match = fresh_fp == stored["value_fp"]
        if getattr(fn, "_non_reproducible", False):
            # NN-4: open-ended extraction prose has no reproducible fingerprint — a fresh re-derivation
            # legitimately differs, so a mismatch here is NOT tampering. Report honestly and NEVER
            # archive (archiving would corrupt warm reuse and drift the price up on every /answer).
            return {"verdict": "MATCH" if match else "UNVERIFIABLE",
                    "stored_fp": stored["value_fp"], "fresh_fp": fresh_fp,
                    "reason": None if match else "open-ended extraction — not reproducibly verifiable"}
        if not match:
            with self._lock:
                self._m.archive_entity("derivation", node)   # auto-invalidate: honest failure mode
        return {"verdict": "MATCH" if match else "MISMATCH",
                "stored_fp": stored["value_fp"], "fresh_fp": fresh_fp}

    def get_derivation(self, node: str) -> dict:
        return self._m.get_entity("derivation", node)["body"]

    # -- UI state --
    def graph_state(self, graph: list[tuple[str, list[str], Callable]],
                    last: RunReport | None) -> dict:
        nodes, edges = [], []
        live = set()
        for node, refs, _fn in graph:
            verdict = "pending"
            in_report = False
            if last:
                if node in last.reused: verdict, in_report = "reused", True
                elif node in last.cutoff: verdict, in_report = "cutoff", True
                elif node in last.derived: verdict, in_report = "derived", True
                elif node in last.errors: verdict, in_report = "error", True
            try:
                fp = self._m.get_entity("derivation", node)["body"]["value_fp"]
                stored = True
                if verdict == "pending": verdict = "stored"
            except NotFoundError:
                fp = None
                stored = False
            # NN-5 deletion test: a derivation is LIVE only if present in the memory db or
            # classified by the current run. When memory is deleted (amnesia) absent derivations
            # VANISH from the graph — the intelligence disappears on camera; only sources remain.
            if not stored and not in_report:
                continue
            live.add(node)
            nodes.append({"id": node, "verdict": verdict, "fp": fp})
            for ref in refs:
                kind, nm = ref.split(":", 1)
                # only draw an edge whose derivation endpoint is itself live (no dangling edges)
                if kind == "source" or nm in live:
                    edges.append([f"src_{nm}" if kind == "source" else nm, node])
        for node, refs, _fn in graph:
            for ref in refs:
                if ref.startswith("source:"):
                    nm = ref.split(":", 1)[1]
                    if not any(n["id"] == f"src_{nm}" for n in nodes):
                        try:
                            sh = self.get_source(nm)["hash"]
                        except NotFoundError:
                            sh = None
                        nodes.append({"id": f"src_{nm}", "verdict": "source", "fp": sh})
        db_bytes = os.path.getsize(self._db_path) if os.path.exists(self._db_path) else 0
        return {"nodes": nodes, "edges": edges, "db_bytes": db_bytes}

    # ============================================================================
    # §3E Deep-Integration Methods (ALL FIVE tiers load-bearing + FTS5 + commons)
    # ============================================================================

    # ── REFERENCE tier (NN-6): pricing + invalidation DOCTRINE the engine CONSULTS ──
    # UNIT_USD is no longer a constant — it is READ from doctrine every quote. Editing
    # the doctrine (via /doctrine or `sibyl` CLI) changes the price with zero code change.
    def seed_doctrine(self):
        # DT-8/DEV-002: get_reference returns None when absent on client 0.8.1 (does NOT raise
        # NotFoundError like get_entity). Guard both so a re-seed is idempotent.
        try:
            existing = self._m.get_reference("doctrine/pricing")
        except NotFoundError:
            existing = None
        if existing is None:
            self._m.set_reference("doctrine/pricing",
                {"unit_usd": UNIT_USD, "currency": "USD", "basis": "one executed derivation"})
            self._m.set_reference("doctrine/invalidation",
                {"policy": "content-addressed cone; field-equal cutoff stops cascade",
                 "cutoff": "value_fp equality", "archive_on_supersede": True})

    def unit_cost(self) -> float:
        # DEV-002: get_reference returns None when unseeded (not NotFoundError); fall back to
        # the module default so quote()/derive() never crash pre-seed. REFERENCE stays load-bearing:
        # once seeded, the price is READ from doctrine (edit doctrine → price changes, NN-6).
        # DEV-004: REFERENCE bodies round-trip as a JSON STRING on client 0.8.1 (get_entity/get_state
        # return dict bodies; get_reference returns a str) — parse it before reading the field.
        try:
            ref = self._m.get_reference("doctrine/pricing")
        except NotFoundError:
            ref = None
        if ref is None:
            return UNIT_USD
        return float(_ref_body(ref)["unit_usd"])

    # ── HOT tier (NN-6): live run cursor. Written as the run progresses; read by /state.
    # Survives a process restart mid-run — the cold-start recall segment reads it back.
    def set_cursor(self, **kw):
        cur = self.get_cursor(); cur.update(kw)
        self._m.set_state("run", cur)

    def get_cursor(self) -> dict:
        # DEV-002: get_state returns None when absent (not NotFoundError). HOT stays load-bearing:
        # once set, the cursor is read back from set_state and survives a restart (D-12).
        try:
            st = self._m.get_state("run")
        except NotFoundError:
            st = None
        if st is None:
            return {"status": "idle", "node": None, "done": 0, "total": 0}
        return dict(st["body"])

    # ── FTS5 recall (D-13): keyword search across ALL tiers — the "keyword beats vectors"
    # thesis proof. Returns derivations + provenance + doctrine matching q. The 2nd metered route.
    def recall(self, q: str, limit: int = 10) -> list[dict]:
        # DT-8: bind the real SDK search method at build. Primary: client.search(query=, limit=).
        search = getattr(self._m, "search", None) or getattr(self._m, "recall", None)
        if search is None:                                   # fallback: FTS over the journal
            hits = [e for e in self._m.read_events(limit=500)
                    if q.lower() in json.dumps(e, default=str).lower()][:limit]
            return [{"tier": "COLD", "match": e} for e in hits]
        return [{"tier": r.get("tier", "?"), "match": r} for r in search(query=q, limit=limit)]

    # ── ARCHIVE vs DELETE (D-15): recoverable morgue shown against true destruction ──
    def archive_node(self, node: str):        # recoverable
        with self._lock:
            self._m.archive_entity("derivation", node)

    def hard_delete_node(self, node: str):    # destroyed — demo contrast only, admin-gated
        with self._lock:
            self._m.delete_entity("derivation", node)

    def restore_archived(self, node: str) -> dict:
        """Time-machine: bring an invalidated cone's prior conclusion back with its provenance.

        DEV-003/DT-8: client 0.8.1 `archive_entity` moves the record to a separate ARCHIVE store
        and exposes no read-back (`get_entity` has no include_archived; list_entities(status=…) does
        not surface it). The recoverable audit trail is the COLD journal — every derive writes a
        {node, value_fp, deps} event, append-only (NN-3). We reconstruct the superseded conclusion
        from the most recent journaled derive event for the node. ARCHIVE stays load-bearing:
        `archive_node` removes the stale record from WARM so it can never be served (delete-test),
        and the journal preserves what it held.
        """
        for e in reversed(self._m.read_events(limit=500)):
            ev = e.get("evaluated")
            if isinstance(ev, dict) and ev.get("type") == "derive" and ev.get("node") == node:
                return {"node": node,
                        "value_fp": (e.get("acted") or {}).get("value_fp"),
                        "edges": ev.get("edges", []),
                        "deps": (e.get("extra") or {}).get("deps", []),
                        "source": "COLD-journal"}
        raise NotFoundError(f"no archived/journaled record for derivation:{node}")

    # ── COMMONS (NN-7): attribution — record which analyst tenant produced each fact ──
    def attribute(self, node: str, tenant: str, cites: list[str]):
        self._m.write_event(evaluated={"type": "attribution", "node": node, "by": tenant},
                            extra={"cites": cites})
