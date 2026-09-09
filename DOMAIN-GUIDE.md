# DOMAIN-GUIDE — Rederive

A judge or new developer reads THIS file to understand every domain concept the code uses.
Each concept is sourced to the research-brief or PRD. Code line refs are filled at C8.

## 9.1 Content-addressing
Definition: a source's identity is the SHA-256 of its canonical bytes (first 16 hex chars in this
codebase — `engine.h()`). Why it matters here: content hashes make cache keys SAFE — a derivation
keyed on input hashes can never silently serve a result computed from different content.
Source: PRD §2 data flow; spike result (25/25 fuzz).

## 9.2 The invalidation cone
Definition: the set of derivations downstream of a changed input, computed per-node by comparing each
node's stored cache key against the key recomputed from CURRENT input hashes. Property (spike-proven):
cone membership is implicit — there is no separate graph-walk step that could disagree with the
cache-key check. Source: ARCHITECTURE §3 Key decisions.

## 9.3 Early cutoff
Definition: when a re-derived node's canonical value is field-equal to its previous value (`value_fp`
unchanged), its descendants' cache keys still match — the cascade stops. This is the Salsa/Bazel "early
cutoff" optimization ported to cognition. Demo beat: "metric re-derived, value unchanged → synthesis
reused." Source: D-4/D-5 in INVARIANTS; measured LLM instability report (stability harness).

## 9.4 EIP-3009 gasless transfers
Definition: `transferWithAuthorization` — the buyer SIGNS a USDC transfer authorization off-chain; the
x402 facilitator broadcasts it and pays gas. Consequence for the demo: the buyer wallet needs USDC
ONLY, no ETH (D-10). Source: x402 v2 docs + official examples.

## 9.5 Five-tier mapping table (Sibyl Memory → Rederive)
| Tier | Sibyl semantics | Rederive use | Load-bearing because |
|---|---|---|---|
| HOT | set_state/get_state KV | run status flags (running/last_run_at) | UI liveness |
| WARM | set_entity/get_entity, UNIQUE(tenant,category,name) | `derivation/{node}` cache records + `source/{name}` current versions | THE cache + provenance store |
| COLD | write_event append-only journal | ingest + derive events with dep refs in `extra` | earned-memory proof (NN-3) |
| REFERENCE | doctrine documents | `doctrine/pricing`, `doctrine/invalidation` | engine reads unit costs from here |
| ARCHIVE | archive_entity (recoverable) | superseded derivations (dead cones) | audit trail; never delete (NN-2 receipts remain explainable) |

## 9.6 Glossary (12 terms)
- **node** — a single derivation in the dossier graph; keyed `derivation/{node}` in WARM. (engine.py)
- **edge** — a runtime-captured input ref `{kind}:{name}` a derivation actually read. (engine.py `derive`)
- **cone** — the set of derivations invalidated by a changed input. (engine.py `quote`)
- **cutoff** — a re-derived node whose value is unchanged, so its descendants stay reused. (engine.py `derive`)
- **fp (value fingerprint)** — `h(value)`, the early-cutoff comparator. (engine.py `derive`)
- **quote** — the itemized price = Σ unit_cost over would-execute nodes. (engine.py `quote`)
- **receipt** — the committed record of a run's derived/reused/cutoff + price. (server.py)
- **tenant** — the analyst identity owning a fact in the multi-tenant commons. (engine `tenant_id`)
- **tier** — one of Sibyl's five memory layers (HOT/WARM/COLD/REFERENCE/ARCHIVE). (engine.py)
- **facilitator** — the x402 service that broadcasts the buyer's signed USDC transfer and pays gas. (server.py)
- **settle** — the on-chain completion of an x402 payment. (buyer.py)
- **verdict** — a node's UI status: source/pending/stored/derived/reused/cutoff/error/invalidated. (engine.py `graph_state`)
