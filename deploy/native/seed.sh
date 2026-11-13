#!/usr/bin/env bash
# First-time data import (sudo sitectl seed <name>): content, settings, customers, invoices… from deploy/seed/data.json
set -euo pipefail
cd "$1/api"
sudo -E -u "site-$SITE_NAME" env HOME="/srv/sites/$SITE_NAME/shared" PATH="/usr/local/bin:$PATH" npm run seed
