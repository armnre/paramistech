#!/usr/bin/env bash
# Called by sitectl deploy (site env loaded) before switching releases. Idempotent.
set -euo pipefail
R=$1
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$R/api/deploy/server/schema.sql"
echo "-- schema ok"
