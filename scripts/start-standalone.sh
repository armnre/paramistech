#!/bin/sh
# Runs the standalone build like the Docker container: own directory, migrations first.
# Usage: set -a; . ./.env; set +a; npm run build; sh scripts/start-standalone.sh
set -eu
PORT="${PORT:-3100}"
dir="${STANDALONE_DIR:-/tmp/paramistech-standalone}"
rm -rf "$dir"
mkdir -p "$dir/.next" "$dir/scripts" "$dir/public"
cp -R .next/standalone/. "$dir/"
cp -R .next/static "$dir/.next/static"
cp -R public/. "$dir/public/"
cp -R drizzle "$dir/drizzle"
cp scripts/migrate.mjs scripts/seed-admin.mjs scripts/seed-content.mjs "$dir/scripts/"
cd "$dir"
node scripts/migrate.mjs
NODE_ENV=production PORT="$PORT" HOSTNAME=127.0.0.1 exec node server.js
