#!/usr/bin/env bash
# Copy this WMS tree into the LXC and bring the stack up.
# Run on the Proxmox host after create-lxc.sh.
set -euo pipefail

CTID="${CTID:-200}"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root on the Proxmox host." >&2
  exit 1
fi

if ! pct status "$CTID" &>/dev/null; then
  echo "CT ${CTID} not found. Run proxmox/create-lxc.sh first." >&2
  exit 1
fi

echo "==> Syncing ${SRC} -> CT ${CTID}:/opt/wms"
pct exec "$CTID" -- mkdir -p /opt/wms
tar -C "$SRC" \
  --exclude='.env' \
  --exclude='backups' \
  --exclude='app/__pycache__' \
  --exclude='*.pyc' \
  -cf - . | pct exec "$CTID" -- tar -C /opt/wms -xf -

echo "==> Ensuring .env exists"
pct exec "$CTID" -- bash -lc '
  cd /opt/wms
  if [[ ! -f .env ]]; then
    cp .env.example .env
    echo "Created /opt/wms/.env — edit passwords before production use."
  fi
  chmod +x proxmox/*.sh scripts/*.sh
'

echo "==> Installing Docker (idempotent)"
pct exec "$CTID" -- bash /opt/wms/scripts/install-docker.sh

echo "==> Starting Compose stack"
pct exec "$CTID" -- bash -lc 'cd /opt/wms && docker compose up -d --build'

echo "==> Installing Postgres dump cron"
pct exec "$CTID" -- bash /opt/wms/scripts/install-backup-cron.sh || true

echo "==> Health check"
sleep 5
pct exec "$CTID" -- bash -lc 'curl -fsS http://127.0.0.1/health || curl -fsS http://127.0.0.1:80/health || true'

IP="$(pct exec "$CTID" -- bash -lc "hostname -I | awk '{print \$1}'" || true)"
echo "WMS should be reachable at http://${IP:-<ct-ip>}/"
echo "On the Proxmox host, also run: CTID=${CTID} ./scripts/setup-proxmox-snapshots.sh"
