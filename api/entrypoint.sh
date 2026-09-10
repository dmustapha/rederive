#!/bin/sh
# Boot entrypoint for the free-tier deploy (no persistent disk).
# Persistence strategy (best-effort, graceful-degrading):
#   1. If a Litestream replica is configured (LITESTREAM_BUCKET set) and the runtime db is
#      absent, RESTORE the latest replica — recovers judge-created state across a spin-down.
#   2. If the db is still absent, HYDRATE from the baked warm seed — guarantees the canonical
#      Uniswap dossier is always warm on a cold boot, even with no bucket configured.
#   3. Run uvicorn. When Litestream is configured, run it UNDER `litestream replicate` so new
#      writes stream to the bucket continuously; otherwise run uvicorn directly (seed-only mode).
set -e

DB="${REDERIVE_DB:-/data/memory.db}"
DB_DIR="$(dirname "$DB")"
SEED="/app/seed/memory.warm.db"
mkdir -p "$DB_DIR"

lit_configured() { [ -n "$LITESTREAM_BUCKET" ] && [ -n "$LITESTREAM_ACCESS_KEY_ID" ]; }

if [ ! -f "$DB" ] && lit_configured; then
  echo "[entrypoint] attempting Litestream restore from bucket '$LITESTREAM_BUCKET'…"
  litestream restore -if-replica-exists -config /app/litestream.yml -o "$DB" "$DB" || \
    echo "[entrypoint] no replica to restore (fresh bucket) — will fall back to seed"
fi

if [ ! -f "$DB" ]; then
  if [ -f "$SEED" ]; then
    cp "$SEED" "$DB"
    echo "[entrypoint] hydrated warm seed -> $DB (cold boot comes up warm)"
  else
    echo "[entrypoint] WARNING: no db and no seed present — starting empty"
  fi
fi

CMD="uvicorn rederive.server:app --host 0.0.0.0 --port ${PORT:-8080}"
if lit_configured; then
  echo "[entrypoint] starting under Litestream continuous replication"
  exec litestream replicate -config /app/litestream.yml -exec "$CMD"
else
  echo "[entrypoint] Litestream not configured — seed-only persistence mode"
  exec sh -c "$CMD"
fi
