#!/usr/bin/env bash
# Dump Postgres from the WMS Compose stack.
# Run on the LXC host from /opt/wms (or any dir with this compose project).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/wms-${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Load .env if present so compose project name / credentials match.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-wms}"
POSTGRES_DB="${POSTGRES_DB:-wms}"

echo "==> Dumping ${POSTGRES_DB} as ${POSTGRES_USER}"
docker compose exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip -c > "$OUT"

echo "==> Wrote ${OUT} ($(du -h "$OUT" | cut -f1))"

echo "==> Pruning dumps older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'wms-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -delete

echo "Done. Schedule with cron, e.g.:"
echo "  15 2 * * * /opt/wms/scripts/backup-postgres.sh >> /var/log/wms-backup.log 2>&1"
