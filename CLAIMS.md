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
`dir(MemoryClient)` deep-tier surface (exact list captured at build):

```
(filled at T0.2 verification — the exact dir(MemoryClient) list feeding DT-8)
```

Bindings:
- HOT (cursor): `set_state` / `get_state` — (bound name recorded at T0.2b)
- WARM (cache): `set_entity` / `get_entity` — (bound name recorded at T0.2b)
- COLD (journal): `write_event` / `read_events` — (bound name recorded at T0.2b)
- REFERENCE (doctrine): `set_reference` / `get_reference` — (bound name recorded at T0.2b)
- ARCHIVE vs DELETE: `archive_entity` / `delete_entity` — (bound name recorded at T0.2b)
- FTS5 recall: `search` / `recall` — (bound name or journal-fallback recorded at T0.2b)

### Recorded deviations (DT-A amnesia close-attr, recall fallback, version drift)
| DEV | Component | Deviation | Class | Recorded at |
|---|---|---|---|---|
| (none yet — filled as encountered) | | | | |
