#!/usr/bin/env bash
# ParamisTech build (called by: sitectl deploy).   build.sh <repo> <release>
# Produces <release>/api (npm start; needs PORT, DATABASE_URL, SESSION_SECRET, UPLOAD_DIR)
# and <release>/web (static files served by nginx).
set -euo pipefail
SRC=$1; R=$2; CACHE=${BUILD_CACHE:-/tmp/paramistech-build}; REG=${NPM_REGISTRY:-https://registry.npmjs.org}
mkdir -p "$CACHE/api" "$CACHE/web" "$R"

echo "-- api"
A=$CACHE/api
cp "$SRC/deploy/server/package.json" "$A/package.json"
rm -rf "$A/deploy" "$A/apps"; mkdir -p "$A/deploy/server" "$A/apps/paramistech/src"
cp -r "$SRC/deploy/server/zitejs-shim" "$SRC/deploy/server/src" "$SRC/deploy/server/schema.sql" "$A/deploy/server/"
cp -r "$SRC/deploy/seed" "$A/deploy/"
cp -r "$SRC/apps/paramistech/src/api" "$SRC/apps/paramistech/src/server" "$A/apps/paramistech/src/"
(cd "$A" && npm install --omit=dev --no-audit --no-fund --registry="$REG" --loglevel=error)
cp -a "$A" "$R/api"

echo "-- web"
W=$CACHE/web
cp "$SRC/deploy/web/package.json" "$W/package.json"
rm -rf "$W/packages" "$W/apps" "$W/deploy"; mkdir -p "$W/packages" "$W/apps/paramistech" "$W/deploy"
cp -r "$SRC/packages/components" "$W/packages/"
cp -r "$SRC/apps/paramistech/src" "$W/apps/paramistech/"
cp -r "$SRC/deploy/web" "$W/deploy/"
(cd "$W" && npm install --no-audit --no-fund --registry="$REG" --loglevel=error && npm run build)
[ -f "$W/deploy/web/dist/index.html" ] || { echo "web build produced no index.html"; exit 1; }
cp -a "$W/deploy/web/dist" "$R/web"
echo "-- build ok"
