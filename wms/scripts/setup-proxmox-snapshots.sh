#!/usr/bin/env bash
# Configure Proxmox CT snapshots + a host-side reminder for DB dumps.
# Run as root on the Proxmox host (not inside the LXC).
set -euo pipefail

CTID="${CTID:-200}"
STORAGE="${STORAGE:-}"  # e.g. local / local-lvm / PBS storage id; empty = default
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root on the Proxmox host." >&2
  exit 1
fi

if ! command -v pct >/dev/null 2>&1; then
  echo "pct not found — this script must run on Proxmox." >&2
  exit 1
fi

if ! pct status "$CTID" &>/dev/null; then
  echo "CT ${CTID} not found." >&2
  exit 1
fi

echo "==> Taking immediate snapshot of CT ${CTID}"
pct snapshot "$CTID" "manual-$(date -u +%Y%m%dT%H%M%SZ)" \
  --description "WMS baseline snapshot"

JOB_ID="backup-wms-ct${CTID}"
echo "==> Ensuring vzdump job ${JOB_ID} (daily CT backup)"

# Proxmox 8 uses /etc/pve/jobs.cfg for scheduled jobs.
JOBS_FILE="/etc/pve/jobs.cfg"
if [[ ! -f "$JOBS_FILE" ]]; then
  echo "Missing ${JOBS_FILE}; create a Backup job in the Proxmox UI for CT ${CTID}." >&2
  echo "Suggested: daily, mode snapshot, keep-daily ${KEEP_DAILY}, keep-weekly ${KEEP_WEEKLY}." >&2
else
  if grep -q "job: ${JOB_ID}" "$JOBS_FILE" 2>/dev/null; then
    echo "Job ${JOB_ID} already present in ${JOBS_FILE}"
  else
    {
      echo ""
      echo "vzdump: ${JOB_ID}"
      echo "	schedule 02:00"
      echo "	enabled 1"
      echo "	vmid ${CTID}"
      echo "	mode snapshot"
      echo "	compress zstd"
      echo "	prune-backups keep-daily=${KEEP_DAILY},keep-weekly=${KEEP_WEEKLY}"
      if [[ -n "$STORAGE" ]]; then
        echo "	storage ${STORAGE}"
      fi
      echo "	notes-template WMS CT {{vmid}} backup"
    } >> "$JOBS_FILE"
    echo "Appended vzdump job ${JOB_ID} to ${JOBS_FILE}"
  fi
fi

echo
echo "==> Important: Proxmox CT backups alone are not enough for Postgres"
echo "Inside the CT, install the dump cron:"
echo "  pct enter ${CTID}"
echo "  /opt/wms/scripts/install-backup-cron.sh"
echo
echo "Done."
