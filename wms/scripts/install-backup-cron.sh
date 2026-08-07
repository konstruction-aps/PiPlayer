#!/usr/bin/env bash
# Install a daily Postgres dump cron job inside the WMS LXC.
# Run as root inside the CT.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="${ROOT}/scripts/backup-postgres.sh"
LOG_FILE="${LOG_FILE:-/var/log/wms-backup.log}"
CRON_LINE="15 2 * * * ${BACKUP_SCRIPT} >> ${LOG_FILE} 2>&1"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root inside the LXC." >&2
  exit 1
fi

chmod +x "$BACKUP_SCRIPT"
touch "$LOG_FILE"

existing="$(crontab -l 2>/dev/null || true)"
if echo "$existing" | grep -Fq "$BACKUP_SCRIPT"; then
  echo "Backup cron already installed."
else
  printf '%s\n%s\n' "$existing" "$CRON_LINE" | crontab -
  echo "Installed cron: ${CRON_LINE}"
fi

crontab -l
