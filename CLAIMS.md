# CLAIMS — Rederive (every headline claim + its recompute source)

Every headline number/address/hash shipped in README/demo/submission must be RECOMPUTABLE
from a committed artifact (INVARIANTS §VERIFY-BEFORE-CLAIMING). `python api/scripts/verify_claims.py`
re-derives the price/count claims from `submission/receipt-*.json`; no unbacked figure ships.

## Claims ledger
| Claim | Source artifact | Recompute command | Status |
|---|---|---|---|
| cold price (`cold_usd`) | submission/receipt-cold.json | `python api/scripts/verify_claims.py` | placeholder — filled at C6/package |
| warm price (`warm_usd`) | submission/receipt-warm.json | `python api/scripts/verify_claims.py` | placeholder — filled at C6/package |
| derived count (`cold_derived`/`warm_derived`) | submission/receipt-*.json | `python api/scripts/verify_claims.py` | placeholder — filled at C6/package |
| reused count (`cold_reused`/`warm_reused`) | submission/receipt-*.json | `python api/scripts/verify_claims.py` | placeholder — filled at C6/package |
| fuzz 25/25 vs ground truth | CI run (`pytest api/tests -q`) + `tests/test_fuzz.py` | `cd api && python -m pytest tests/test_fuzz.py -q` | placeholder — proven green in CI |
| five-tier coverage (all load-bearing, NN-6) | `tests/test_tiers.py` | `cd api && python -m pytest tests/test_tiers.py -q` | placeholder — filled at C0 |
| commons attribution (multi-tenant, NN-7) | `tests/test_commons.py` | `cd api && python -m pytest tests/test_commons.py -q` | placeholder — wired at C2 (needs commons.py) |
| FTS5 recall (D-13) | `tests/test_recall.py` | `cd api && python -m pytest tests/test_recall.py -q` | placeholder — filled at C0 |
| on-chain anchor tx (`h(receipt)` == calldata, NN-8) | submission/receipt-*.json + Base tx | `python api/scripts/verify_claims.py` + Basescan | placeholder — filled at deploy/CX |

## Honesty ledger (DT-8 method-name binding + recorded deviations)

The MISMATCH output of `verify_claims.py` is this project's honesty layer: any claim that does not
recompute is printed red and blocks. Deviations that alter a real path (a bound method name, a forced
fallback) are recorded here — never fabricated as a pass.

### DT-8 — Sibyl deep-API method-name binding (recorded at C0/T0.2b)
`dir(MemoryClient)` deep-tier surface — exact list captured at build on sibyl-memory-client 0.8.1
(filter: any of state/entity/event/reference/archive/delete/search/recall/query in the name):

```
['__getstate__', '_row_to_entity', '_search_rows', '_search_strict', 'archive_entity',
 'delete_entity', 'get_entity', 'get_reference', 'get_state', 'read_events', 'search',
 'search_entities', 'set_entity', 'set_reference', 'set_state', 'write_event']
```

Full public method surface (for completeness): accept_skill_proposal, archive_entity, delete_entity,
free_tier_status, get_entity, get_reference, get_state, get_tenant, get_tier, learn, learner, lint,
list_entities, list_skill_proposals, local, read_events, reject_skill_proposal, schema_version, search,
search_entities, set_entity, set_reference, set_state, set_tenant, set_tier, write_event.

Bindings (every assumed tier name PRESENT — no rename needed; search() EXISTS so recall uses the primary branch):
- HOT (cursor): `set_state("run", …)` / `get_state("run")` — BOUND (primary).
- WARM (cache): `set_entity(cat,name,body)` / `get_entity(cat,name)` — BOUND (primary).
- COLD (journal): `write_event(evaluated=,acted=,extra=)` (keyword-only) / `read_events(limit=)` — BOUND.
- REFERENCE (doctrine): `set_reference(key,body)` / `get_reference(key)` — BOUND.
- ARCHIVE vs DELETE: `archive_entity(cat,name,reason=None)` / `delete_entity(cat,name)` — BOUND.
- FTS5 recall: `search(query, *, limit=20, prefix=False, tiers=None)` — BOUND to the PRIMARY branch
  (returns a SearchResults iterable of dicts with `tier`/`body`/`snippet`). Journal-FTS fallback is
  retained and unit-tested (`test_recall::test_recall_journal_fallback_when_no_sdk_search`).

SDK-semantics deviations discovered while binding (real paths, recorded — never fabricated):
- **DEV-002**: `get_reference` / `get_state` return **None** when the key is absent (they do NOT raise
  `NotFoundError` like `get_entity` does). `unit_cost`/`get_cursor`/`seed_doctrine` guard both None and
  NotFoundError. Tiers stay load-bearing.
- **DEV-003**: `archive_entity` moves the record to a separate ARCHIVE store and exposes **no read-back**
  (`get_entity` has no `include_archived`; `list_entities(status=…)` does not surface archived rows;
  archive_entity returns only `{archived_id, original_id}`). `restore_archived` reconstructs the
  superseded conclusion from the append-only COLD journal (the real recoverable audit trail, NN-3).
- **DEV-004**: `get_reference` returns its **body as a JSON string** (entity/state bodies are dicts).
  `_ref_body()` json-loads it before field access.

### Recorded deviations (DT-A amnesia close-attr, recall fallback, SDK semantics, version drift)
| DEV | Component | ARCHITECTURE said | ACTUAL | Class | Recorded at |
|---|---|---|---|---|---|
| DEV-002 | engine `get_reference`/`get_state` not-found | catch `NotFoundError` | returns `None` (no raise); guarded for both | UNTESTED→FIXED | T0.2b |
| DEV-003 | engine `restore_archived` | `get_entity(include_archived=True)` | no archive read-back API; reconstruct from COLD journal | DEGRADED | T0.2b |
| DEV-004 | engine `unit_cost` REFERENCE body | `ref["body"]["unit_usd"]` (dict body) | REFERENCE body is a JSON string; `_ref_body` json-loads | COSMETIC→FIXED | T0.2b |
| DEV-005 | build environment | Python 3.11.x (PLAN entry criteria) | only 3.14.6 on PATH → provisioned real 3.11.14 via `uv python install` | COSMETIC | T0.1 |
| DEV-006 | engine `close()` (DT-A) | probe `close`/`_close`/`_conn`/`_db` | client 0.8.1 has NONE; real fd is `MemoryClient._storage.close()` (thread-local conns) — added to the close loop + GC last resort | UNTESTED→FIXED | T0.3 (DT-A) |
| DEV-007 | engine `quote()` cone | direct per-node cache-key check only | cone is TRANSITIVE — a would-execute upstream derivation invalidates downstream (topo order); quote is the conservative would-execute upper bound, cutoff refunded at run time as `reused`. `test_pricing` asserts `{na,nc}` | COSMETIC→FIXED | T0.3 |
| DEV-009 | LLM stability metric (D-4) | §20 `stability_check.py` free-number 0-10 score → `FIELD-STABLE: True` | free-number score DRIFTED live on deepseek-v4-flash (values 8/5/5, `FIELD-STABLE: False`); tightened to a fixed ENUM `[poor,adequate,strong]` per D-4/D-5 → `FIELD-STABLE: True` (strong/strong/strong). Original unstable script kept as recorded evidence; `stability_check_tightened.py` is the passing harness. | DEGRADED→FIXED | T1.2 |
| DEV-010 | scripts import path | `cd api && python scripts/…` (implicit) | `rederive` pkg not auto-on-path for scripts → run with `PYTHONPATH=.` from `api/` (pytest has its own rootdir; only the ad-hoc scripts need it) | COSMETIC | T1.1 |
| DEV-011 | `recall` tier labels (DT-8) | tiers uppercased HOT/WARM/COLD/… | native `search()` returns the SDK's own tier tags `entity` (WARM) / `journal` (COLD); each hit still carries a `tier` label as required — labels are the real SDK values, recorded honestly not renamed | COSMETIC | T1.3 |

### T1.1/T1.2 — LLM ladder + stability (C1, recorded at build)
Probe run live (`AGENTROUTER_API_KEY`, real network, `python scripts/llm_ladder_probe.py`):
```
dead  claude-opus-4-8: Budget pool quota has been exhausted...
dead  claude-opus-5: Budget pool quota has been exhausted...
dead  gpt-5.6-sol: Budget pool quota has been exhausted...
LIVE  deepseek-v4-flash: 'OK'
```
- **Live rung: `deepseek-v4-flash`** (premium opus-4-8/opus-5/gpt-5.6-sol pools exhausted this session; premium re-probed top-down every session per Dami directive — they may refill). glm-5.3 & ollama never reached (deepseek answered first). UA `claude-cli/2.0.14 (external, cli)` accepted byte-exact (D-3).
- **glm-5.3 retry-guard:** the 2-attempt-per-rung schema retry in `complete_json` covers glm-5.3's known 1-in-3 parse fail (warroom); it was not reached this session because deepseek is a higher rung and live.
- **D-4 stability (3× live through deepseek-v4-flash):**
  - free-number 0-10 (§20 verbatim): `value=8`, `value=5`, `value=5` → **FIELD-STABLE: False** (DEV-009).
  - tightened ENUM `[poor,adequate,strong]`: `strong`/`strong`/`strong` → **FIELD-STABLE: True** (D-4/D-5 mitigation confirmed).

### T1.3 — DT-8 FTS5 recall (native `search()`, recorded at build)
`dir(MemoryClient)` FTS filter: `['_search_rows', '_search_strict', 'search', 'search_entities']`.
**Path in force: NATIVE `search(query=q, limit=limit)`** (primary branch, not journal-fallback). Proven on a real db `/tmp/t13.db`:
```
recall hits: 3 | tiers: ['entity', 'journal']
```
Each hit carries a `tier` label (SDK-native tags: `entity`=WARM cache, `journal`=COLD event — see DEV-011). Journal-FTS fallback retained + unit-tested for the no-`search` case.
