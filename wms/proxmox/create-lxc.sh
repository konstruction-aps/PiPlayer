#!/usr/bin/env bash
# Create an unprivileged Ubuntu 24.04 LXC on Proxmox for the WMS stack.
# Run this on the Proxmox host as root.
set -euo pipefail

CTID="${CTID:-200}"
HOSTNAME="${HOSTNAME:-wms}"
STORAGE="${STORAGE:-local-lvm}"
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"
MEMORY_MB="${MEMORY_MB:-8192}"
CORES="${CORES:-4}"
DISK_GB="${DISK_GB:-64}"
BRIDGE="${BRIDGE:-vmbr0}"
IP="${IP:-dhcp}"
GATEWAY="${GATEWAY:-}"
TEMPLATE_NAME="${TEMPLATE_NAME:-ubuntu-24.04-standard_24.04-2_amd64.tar.zst}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script as root on the Proxmox host." >&2
  exit 1
fi

if command -v pct >/dev/null 2>&1 && pct status "$CTID" &>/dev/null; then
  echo "CT $CTID already exists. Aborting." >&2
  exit 1
fi

echo "==> Ensuring Ubuntu 24.04 template is available"
pveam update || true
if ! pveam list "$TEMPLATE_STORAGE" | grep -q "$TEMPLATE_NAME"; then
  echo "Downloading $TEMPLATE_NAME ..."
  pveam download "$TEMPLATE_STORAGE" "$TEMPLATE_NAME"
fi

NET_CONFIG="name=eth0,bridge=${BRIDGE},firewall=1"
if [[ "$IP" == "dhcp" ]]; then
  NET_CONFIG+=",ip=dhcp"
else
  if [[ -z "$GATEWAY" ]]; then
    echo "GATEWAY is required when IP is static (e.g. GATEWAY=192.168.1.1)." >&2
    exit 1
  fi
  NET_CONFIG+=",ip=${IP},gw=${GATEWAY}"
fi

CREATE_ARGS=(
  "$CTID" "${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE_NAME}"
  --hostname "$HOSTNAME"
  --memory "$MEMORY_MB"
  --cores "$CORES"
  --rootfs "${STORAGE}:${DISK_GB}"
  --net0 "$NET_CONFIG"
  --unprivileged 1
  --features nesting=1
  --ostype ubuntu
  --onboot 1
  --start 1
)

if [[ -n "${SSH_PUBLIC_KEYS:-}" ]]; then
  CREATE_ARGS+=(--ssh-public-keys "$SSH_PUBLIC_KEYS")
fi

if [[ -n "${ROOT_PASSWORD:-}" ]]; then
  CREATE_ARGS+=(--password "$ROOT_PASSWORD")
else
  echo "ROOT_PASSWORD not set — pct will prompt for the CT root password."
  CREATE_ARGS+=(--password)
fi

echo "==> Creating unprivileged CT ${CTID} (${HOSTNAME})"
pct create "${CREATE_ARGS[@]}"

echo "==> Waiting for network"
sleep 5

echo "==> CT ${CTID} is up. Enter with: pct enter ${CTID}"
echo "Next: CTID=${CTID} ./scripts/deploy-to-lxc.sh"
