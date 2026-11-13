#!/usr/bin/env bash
# Daily backup (database + uploads) with rotation — for the manual install (sitectl already backs up its sites).
#   sudo cp deploy/scripts/backup.sh /usr/local/bin/paramistech-backup && sudo chmod +x /usr/local/bin/paramistech-backup
#   echo "40 3 * * * root /usr/local/bin/paramistech-backup >> /var/log/paramistech-backup.log 2>&1" | sudo tee /etc/cron.d/paramistech-backup
set -euo pipefail
ENV_FILE=${ENV_FILE:-/etc/paramistech.env}; DEST=${DEST:-/var/backups/paramistech}; KEEP_DAYS=${KEEP_DAYS:-14}
set -a; . "$ENV_FILE"; set +a
STAMP=$(date +%Y%m%d-%H%M%S); mkdir -p "$DEST"; chmod 700 "$DEST"
pg_dump "$DATABASE_URL" --format=custom --no-owner > "$DEST/db-$STAMP.dump"
[ -s "$DEST/db-$STAMP.dump" ] || { echo "[$STAMP] ERROR: empty dump"; exit 1; }
[ -d "$UPLOAD_DIR" ] && tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
find "$DEST" -type f -mtime +"$KEEP_DAYS" -delete
echo "[$STAMP] backup ok"
