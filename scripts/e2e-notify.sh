#!/bin/bash
# Lead -> DB -> email test against a local SMTP catcher (scripts/smtp-sink.mjs). Telegram is pointed at a fake
# token so its failure path is exercised too (it must only be logged).
# Usage: scripts/e2e-notify.sh   (needs a build, a migrated DB and .env)
set -u
cd "$(dirname "$0")/.."
sink_file=/tmp/paramistech-mail-sink.log
rm -f "$sink_file"
SMTP_SINK_PORT=2525 SMTP_SINK_FILE="$sink_file" node scripts/smtp-sink.mjs > /tmp/paramistech-sink.out 2>&1 &
sink=$!
sleep 1
SMTP_SINK_FILE="$sink_file" scripts/e2e.sh e2e/notify.mjs \
  SMTP_HOST=127.0.0.1 SMTP_PORT=2525 SMTP_FROM=noreply@paramistech.test \
  NOTIFY_EMAILS=owner@paramistech.test TELEGRAM_BOT_TOKEN=000:fake-token TELEGRAM_CHAT_ID=1
status=$?
echo "--- server log (notifications):"; grep -a -E "Lead [0-9]+:" /tmp/paramistech-server.log | cut -c1-160
kill "$sink" 2>/dev/null
exit $status
