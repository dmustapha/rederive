#!/usr/bin/env bash
# Rederive — one-command local run. No API keys required.
#
# Boots the API from the baked warm seed (the full 24-node Uniswap dossier) and the web UI.
# Everything works keyless: the warm dossier, the deletion test (amnesia/restore), recall,
# pricing, the on-chain anchor view, and the commons. The ONE thing that needs an LLM key is
# re-deriving an *edited* source's cone live — set DEEPSEEK_API_KEY (or AGENTROUTER_API_KEY)
# for that, or just use the deployed app (https://rederive-five.vercel.app) where it's configured.
#
#   ./run.sh          → API on :8402, UI on :3000
#   Ctrl-C            → stops both
set -euo pipefail
cd "$(dirname "$0")"

PORT_API="${PORT_API:-8402}"
PORT_WEB="${PORT_WEB:-3000}"
DB="${REDERIVE_DB:-/tmp/rederive-local.db}"
SEED="api/seed/memory.warm.db"

echo "▶ Rederive — local (no keys needed for the warm demo)"

# 1. Python venv + deps
if [ ! -d .venv ]; then
  echo "  · creating venv + installing API deps…"
  python3 -m venv .venv
  ./.venv/bin/pip install -q -r api/requirements.txt
fi

# 2. Hydrate the baked warm seed → the full dossier is warm on first boot
cp "$SEED" "$DB"
echo "  · hydrated warm seed → $DB (24 derivations, \$0.000 warm)"

# 3. Web deps
if [ ! -d web/node_modules ]; then
  echo "  · installing UI deps…"
  (cd web && npm install --silent)
fi

# 4. Boot API (DEMO_FREE=1 = payments waived locally; ADMIN_TOKEN=dev for the deletion test)
echo "  · starting API on :$PORT_API…"
DEMO_FREE=1 ADMIN_TOKEN=dev REDERIVE_DB="$DB" PYTHONPATH=api \
  ./.venv/bin/python -m uvicorn rederive.server:app --app-dir api --port "$PORT_API" &
API_PID=$!

# 5. Boot UI (pointed at the local API, admin token prefilled for the guided flow)
echo "  · starting UI on :$PORT_WEB…"
(cd web && NEXT_PUBLIC_API_URL="http://localhost:$PORT_API" NEXT_PUBLIC_DEMO_ADMIN_TOKEN=dev \
  npm run dev -- --port "$PORT_WEB") &
WEB_PID=$!

trap 'echo; echo "stopping…"; kill $API_PID $WEB_PID 2>/dev/null || true' INT TERM
echo ""
echo "✓ open  http://localhost:$PORT_WEB   (landing → Open the console)"
echo "  the warm dossier, deletion test, recall, and on-chain view all work with NO keys."
echo "  to re-derive an edited source locally, export DEEPSEEK_API_KEY first (optional)."
wait
