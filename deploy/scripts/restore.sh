#!/usr/bin/env bash
#   sudo deploy/scripts/restore.sh /var/backups/paramistech/db-XXXX.dump [/var/backups/paramistech/uploads-XXXX.tar.gz]
set -euo pipefail
DUMP=${1:?db dump path}; UP=${2:-}; ENV_FILE=${ENV_FILE:-/etc/paramistech.env}
set -a; . "$ENV_FILE"; set +a
read -r -p "دیتابیس زنده جایگزین می‌شود. برای ادامه YES بنویسید: " ok; [ "$ok" = "YES" ] || exit 1
systemctl stop paramistech || true
pg_restore -d "$DATABASE_URL" --clean --if-exists --no-owner "$DUMP"
[ -n "$UP" ] && { rm -rf "$UPLOAD_DIR"; mkdir -p "$(dirname "$UPLOAD_DIR")"; tar -xzf "$UP" -C "$(dirname "$UPLOAD_DIR")"; chown -R paramistech: "$UPLOAD_DIR"; }
systemctl start paramistech; echo "✔ restore done"
