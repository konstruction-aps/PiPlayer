#!/usr/bin/env bash
set -euo pipefail

# Builds a preconfigured Raspberry Pi OS image for Pi Zero (armhf)
# with PiPlayer autostart and hard-blackout boot tuning.
#
# Output image can be flashed with:
# - Raspberry Pi Imager (Use custom image)
# - balenaEtcher

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORK_DIR="${SCRIPT_DIR}/work"
PIGEN_DIR="${WORK_DIR}/pi-gen"
STAGE_DIR="${PIGEN_DIR}/stage5"
OUT_DIR="${WORK_DIR}/deploy"
BUILD_MODE="${PIPLAYER_BUILD_MODE:-docker}"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This builder needs Linux."
  echo "Tip: run it in a Linux VM, GitHub Actions, or a Linux host."
  exit 1
fi

for cmd in git rsync; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing required command: ${cmd}"
    exit 1
  fi
done

if [[ "${BUILD_MODE}" == "docker" ]] && ! command -v docker >/dev/null 2>&1; then
  echo "Missing required command for docker mode: docker"
  echo "Set PIPLAYER_BUILD_MODE=direct to use pi-gen build.sh directly."
  exit 1
fi

mkdir -p "${WORK_DIR}"

if [[ ! -d "${PIGEN_DIR}" ]]; then
  git clone --depth 1 https://github.com/RPi-Distro/pi-gen.git "${PIGEN_DIR}"
fi

mkdir -p "${STAGE_DIR}/files/PiPlayer"

# Fresh stage content for repeatable builds.
rm -f "${STAGE_DIR}/00-run.sh" "${STAGE_DIR}/00-packages"
rm -rf "${STAGE_DIR}/files/PiPlayer"
mkdir -p "${STAGE_DIR}/files/PiPlayer/video"

cp "${PROJECT_DIR}/player.sh" "${STAGE_DIR}/files/PiPlayer/"
cp "${PROJECT_DIR}/piplayer.service" "${STAGE_DIR}/files/PiPlayer/"
rsync -a --delete "${PROJECT_DIR}/video/" "${STAGE_DIR}/files/PiPlayer/video/"
if [[ -f "${PROJECT_DIR}/logo.png" ]]; then
  cp "${PROJECT_DIR}/logo.png" "${STAGE_DIR}/files/PiPlayer/logo.png"
fi

cat > "${STAGE_DIR}/00-packages" <<'EOF'
mpv
fbi
EOF

cat > "${STAGE_DIR}/00-run.sh" <<'EOF'
#!/bin/bash -e

install -d -m 0755 "${ROOTFS_DIR}/home/pi/PiPlayer"
cp -a "${STAGE_DIR}/files/PiPlayer/." "${ROOTFS_DIR}/home/pi/PiPlayer/"
chown -R 1000:1000 "${ROOTFS_DIR}/home/pi/PiPlayer"
chmod +x "${ROOTFS_DIR}/home/pi/PiPlayer/player.sh"

install -m 0644 "${STAGE_DIR}/files/PiPlayer/piplayer.service" "${ROOTFS_DIR}/etc/systemd/system/piplayer.service"
install -d -m 0755 "${ROOTFS_DIR}/etc/systemd/system/multi-user.target.wants"
ln -sf /etc/systemd/system/piplayer.service "${ROOTFS_DIR}/etc/systemd/system/multi-user.target.wants/piplayer.service"

# Remove local login prompt from tty1 for clean output.
install -d -m 0755 "${ROOTFS_DIR}/etc/systemd/system"
ln -sf /dev/null "${ROOTFS_DIR}/etc/systemd/system/getty@tty1.service"

# Boot config path differs by OS release.
BOOT_CONFIG="${ROOTFS_DIR}/boot/firmware/config.txt"
CMDLINE_FILE="${ROOTFS_DIR}/boot/firmware/cmdline.txt"
if [[ ! -f "${BOOT_CONFIG}" ]]; then
  BOOT_CONFIG="${ROOTFS_DIR}/boot/config.txt"
fi
if [[ ! -f "${CMDLINE_FILE}" ]]; then
  CMDLINE_FILE="${ROOTFS_DIR}/boot/cmdline.txt"
fi

ensure_config_key() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${BOOT_CONFIG}"; then
    sed -i "s/^${key}=.*/${key}=${value}/" "${BOOT_CONFIG}"
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${BOOT_CONFIG}"
  fi
}

ensure_config_key "disable_splash" "1"
ensure_config_key "boot_delay" "0"
ensure_config_key "avoid_warnings" "1"
ensure_config_key "disable_overscan" "1"

python3 - "${CMDLINE_FILE}" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
tokens = path.read_text().strip().split()

drop_prefixes = ("console=", "plymouth.")
drop_exact = {"quiet", "splash"}
filtered = []
for token in tokens:
    if token in drop_exact:
        continue
    if any(token.startswith(prefix) for prefix in drop_prefixes):
        continue
    filtered.append(token)

append_tokens = [
    "console=tty3",
    "quiet",
    "loglevel=0",
    "logo.nologo",
    "vt.global_cursor_default=0",
    "plymouth.enable=0",
    "plymouth.ignore-serial-consoles",
]

seen = set()
out = []
for token in filtered + append_tokens:
    if token not in seen:
        out.append(token)
        seen.add(token)

path.write_text(" ".join(out) + "\n")
PY
EOF
chmod +x "${STAGE_DIR}/00-run.sh"

cat > "${PIGEN_DIR}/config" <<'EOF'
IMG_NAME='piplayer-pizero'
RELEASE='bookworm'
TARGET_HOSTNAME='piplayer'
ENABLE_SSH=1
FIRST_USER_NAME='pi'
FIRST_USER_PASS='raspberry'
LOCALE_DEFAULT='en_US.UTF-8'
KEYBOARD_KEYMAP='us'
KEYBOARD_LAYOUT='English (US)'
TIMEZONE_DEFAULT='Etc/UTC'
WPA_COUNTRY='US'
STAGE_LIST='stage0 stage1 stage2 stage5'
DEPLOY_ZIP=0
COMPRESS_IMAGE='none'
APT_PROXY=
EOF

echo "Starting pi-gen build in '${BUILD_MODE}' mode (this can take a long time)..."
(
  cd "${PIGEN_DIR}"
  if [[ "${BUILD_MODE}" == "direct" ]]; then
    # pi-gen direct mode expects to run as normal user on host.
    ./build.sh
  else
    if [[ "${EUID}" -eq 0 ]]; then
      ./build-docker.sh
    elif command -v sudo >/dev/null 2>&1; then
      sudo ./build-docker.sh
    else
      ./build-docker.sh
    fi
  fi
)

mkdir -p "${OUT_DIR}"
rsync -a "${PIGEN_DIR}/deploy/" "${OUT_DIR}/"

echo
echo "Build complete. Flash the image from:"
echo "${OUT_DIR}"
