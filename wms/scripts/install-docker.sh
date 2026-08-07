#!/usr/bin/env bash
# Install Docker Engine + Compose plugin inside the Ubuntu 24.04 LXC.
# Run as root inside the CT (pct enter <CTID>).
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root inside the LXC." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Updating packages"
apt-get update
apt-get upgrade -y

echo "==> Installing prerequisites"
apt-get install -y ca-certificates curl gnupg

echo "==> Adding Docker apt repository"
install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update
echo "==> Installing Docker Engine + Compose plugin"
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

echo "==> Docker version"
docker --version
docker compose version

echo "Docker is ready. Next: cd /opt/wms && cp .env.example .env && docker compose up -d"
