#!/bin/sh
# Daily: release expired ready-stock reservations (replaces the Vercel cron).
# Install on the VPS (as csms):  crontab -e  and add:
#   0 3 * * * $HOME/fabrica-web/cron-expire.sh
# Reads CRON_SECRET from ~/fabrica-web/.env; never prints it.
SECRET=$(grep "^CRON_SECRET=" "$HOME/fabrica-web/.env" | cut -d= -f2-)
curl -s -m 30 -H "Authorization: Bearer $SECRET" \
  http://127.0.0.1:13000/api/cron/expire-reservations >> "$HOME/fabrica-web/cron.log" 2>&1
echo >> "$HOME/fabrica-web/cron.log"
