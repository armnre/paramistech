#!/bin/bash
# Start the standalone production build, run one Node check script against it, stop the server.
# Usage: scripts/e2e.sh e2e/smoke.mjs [VAR=value ...]
# Needs: a built app (npm run build), a migrated database and a .env (see .env.example).
set -u
cd "$(dirname "$0")/.."
script="$1"; shift
set -a; . ./.env; set +a
for assignment in "$@"; do export "$assignment"; done
export PORT="${PORT:-3100}" UPLOADS_DIR="${UPLOADS_DIR:-/tmp/paramistech-uploads}"
mkdir -p "$UPLOADS_DIR"
psql "$DATABASE_URL" -qc "delete from lead_attempts; delete from admin_login_attempts;" >/dev/null 2>&1 || true

existing=$(ss -ltnp 2>/dev/null | grep ":$PORT " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)
[ -n "$existing" ] && kill "$existing" && sleep 1

log="${E2E_SERVER_LOG:-/tmp/paramistech-server.log}"
sh scripts/start-standalone.sh > "$log" 2>&1 &
server=$!
for _ in $(seq 1 40); do curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null && break; sleep 1; done

PLAYWRIGHT_BASE_URL="http://127.0.0.1:$PORT" timeout "${E2E_TIMEOUT:-170}" node "$script"
status=$?
kill "$server" 2>/dev/null; pkill -P "$server" 2>/dev/null
child=$(ss -ltnp 2>/dev/null | grep ":$PORT " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1); [ -n "$child" ] && kill "$child" 2>/dev/null
exit $status
