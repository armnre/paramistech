#!/usr/bin/env bash
# نصب مستقل پارامیس‌تک روی Ubuntu 22.04/24.04 (برای سروری که sitectl ندارد).
#   sudo bash deploy/install.sh <domain> [admin-username] [admin-password]
# کارها: Node 20، PostgreSQL، nginx، کاربر سیستمی، دیتابیس، بیلد، systemd، SSL (certbot)، بک‌آپ روزانه.
# دوباره اجرا کردن امن است (برای آپدیت هم: sudo bash deploy/install.sh <domain>).
set -euo pipefail
DOMAIN=${1:?usage: install.sh <domain> [admin-user] [admin-pass]}; ADMIN_USER=${2:-}; ADMIN_PASS=${3:-}
APP=paramistech; BASE=/srv/$APP; ENV_FILE=/etc/$APP.env; PORT=${PORT:-3102}
SRC=$(cd "$(dirname "$0")/.." && pwd); REG=${NPM_REGISTRY:-https://registry.npmjs.org}
[ "$(id -u)" = 0 ] || { echo "با sudo اجرا کنید"; exit 1; }

echo "== packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg nginx postgresql postgresql-contrib certbot python3-certbot-nginx rsync >/dev/null
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null && apt-get install -y -qq nodejs >/dev/null
fi

echo "== user & folders"
id $APP >/dev/null 2>&1 || useradd --system --home $BASE --shell /usr/sbin/nologin $APP
mkdir -p $BASE/releases $BASE/shared/uploads $BASE/cache; chown -R $APP: $BASE/shared $BASE/cache

echo "== database"
if [ ! -f $ENV_FILE ]; then
  DBPASS=$(openssl rand -hex 16)
  sudo -u postgres psql -qtc "SELECT 1 FROM pg_roles WHERE rolname='$APP'" | grep -q 1 || sudo -u postgres psql -qc "CREATE ROLE $APP LOGIN PASSWORD '$DBPASS'"
  sudo -u postgres psql -qc "ALTER ROLE $APP PASSWORD '$DBPASS'"
  sudo -u postgres psql -qtc "SELECT 1 FROM pg_database WHERE datname='$APP'" | grep -q 1 || sudo -u postgres psql -qc "CREATE DATABASE $APP OWNER $APP ENCODING 'UTF8' TEMPLATE template0"
  sudo -u postgres psql -qc "REVOKE ALL ON DATABASE $APP FROM PUBLIC"
  cat > $ENV_FILE <<ENV
DATABASE_URL=postgresql://$APP:$DBPASS@127.0.0.1:5432/$APP
SESSION_SECRET=$(openssl rand -hex 32)
PORT=$PORT
HOST=127.0.0.1
UPLOAD_DIR=$BASE/shared/uploads
SITE_DOMAIN=$DOMAIN
NODE_ENV=production
ENV
  chmod 600 $ENV_FILE
fi
set -a; . $ENV_FILE; set +a

echo "== build"
REL=$BASE/releases/$(date +%Y%m%d-%H%M%S); mkdir -p $REL
BUILD_CACHE=$BASE/cache NPM_REGISTRY=$REG bash "$SRC/deploy/native/build.sh" "$SRC" "$REL"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f $REL/api/deploy/server/schema.sql
FIRST=0; [ -L $BASE/current ] || FIRST=1
ln -sfn $REL $BASE/current
ls -1dt $BASE/releases/* | tail -n +6 | xargs -r rm -rf

echo "== systemd"
cat > /etc/systemd/system/$APP.service <<UNIT
[Unit]
Description=ParamisTech API
After=network.target postgresql.service
[Service]
User=$APP
EnvironmentFile=$ENV_FILE
WorkingDirectory=$BASE/current/api
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$BASE/shared
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload; systemctl enable -q $APP; systemctl restart $APP

if [ $FIRST = 1 ]; then
  echo "== seed (data from the original site)"
  (cd $BASE/current/api && sudo -E -u $APP env HOME=$BASE/shared PATH="$PATH" npm run -s seed) || echo "seed skipped"
fi
if [ -n "$ADMIN_USER" ] && [ -n "$ADMIN_PASS" ]; then
  (cd $BASE/current/api && sudo -E -u $APP env HOME=$BASE/shared PATH="$PATH" npm run -s admin -- "$ADMIN_USER" "$ADMIN_PASS")
fi

echo "== nginx"
NG=/etc/nginx/sites-available/$APP.conf
if ! grep -q "ssl_certificate" $NG 2>/dev/null; then
cat > $NG <<NGX
server {
  listen 80; listen [::]:80;
  server_name $DOMAIN www.$DOMAIN;
  root $BASE/current/web;
  index index.html;
  client_max_body_size 12m;
  access_log /var/log/nginx/$APP.access.log;
  error_log  /var/log/nginx/$APP.error.log warn;
  gzip on; gzip_types text/css application/javascript application/json image/svg+xml;
  location /api/ { proxy_pass http://127.0.0.1:$PORT; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; proxy_read_timeout 60s; }
  location /uploads/ { proxy_pass http://127.0.0.1:$PORT; expires 30d; }
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; try_files \$uri =404; }
  location = /sw.js { add_header Cache-Control "no-cache"; try_files \$uri =404; }
  location / { add_header Cache-Control "no-cache"; try_files \$uri \$uri/ /index.html; }
}
NGX
fi
ln -sf $NG /etc/nginx/sites-enabled/$APP.conf
nginx -t -q && systemctl reload nginx

echo "== backup cron"
install -m 755 "$SRC/deploy/scripts/backup.sh" /usr/local/bin/$APP-backup
echo "40 3 * * * root /usr/local/bin/$APP-backup >> /var/log/$APP-backup.log 2>&1" > /etc/cron.d/$APP-backup

sleep 3; curl -fsS http://127.0.0.1:$PORT/api/health && echo
if ! grep -q "ssl_certificate" $NG; then
  echo ">> SSL: اگر DNS دامنه به این سرور اشاره می‌کند اجرا کنید:"
  echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect -m you@example.com --agree-tos -n"
fi
echo "✔ done → http://$DOMAIN"
