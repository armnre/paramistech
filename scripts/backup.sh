#!/bin/sh
set -eu
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi
out="${BACKUP_DIR:-./backups}"
retention="${BACKUP_RETENTION_DAYS:-14}"
uploads="${UPLOADS_DIR:-./data/uploads}"
stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$out"
pg_dump "$DATABASE_URL" > "$out/db-$stamp.sql"
if [ -d "$uploads" ]; then
  tar -czf "$out/uploads-$stamp.tar.gz" -C "$(dirname "$uploads")" "$(basename "$uploads")"
fi
find "$out" -type f -mtime +"$retention" -delete
echo "Backup written to $out"
