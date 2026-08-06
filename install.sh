#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/pi/PiPlayer"
SERVICE_NAME="piplayer.service"

if [ "$(id -u)" -eq 0 ]; then
  echo "Run this script as user 'pi' (not sudo)."
  exit 1
fi

echo "Installing required packages..."
sudo apt update
sudo apt install -y mpv fbi chromium-browser || sudo apt install -y mpv fbi chromium || sudo apt install -y mpv fbi

if [ -f "${PROJECT_DIR}/lumen.env.example" ] && [ ! -f "${PROJECT_DIR}/lumen.env" ]; then
  echo "Tip: copy lumen.env.example to lumen.env and set LUMEN_URL for cloud pages."
fi

echo "Making scripts executable..."
chmod +x "${PROJECT_DIR}/player.sh"

echo "Copying service file..."
sudo cp "${PROJECT_DIR}/${SERVICE_NAME}" "/etc/systemd/system/${SERVICE_NAME}"

echo "Configuring hard-blackout boot style..."

# Raspberry Pi OS Bookworm/Bullseye usually uses /boot/firmware.
BOOT_CONFIG="/boot/firmware/config.txt"
CMDLINE_FILE="/boot/firmware/cmdline.txt"

if [ ! -f "${BOOT_CONFIG}" ]; then
  BOOT_CONFIG="/boot/config.txt"
fi
if [ ! -f "${CMDLINE_FILE}" ]; then
  CMDLINE_FILE="/boot/cmdline.txt"
fi

# Ensure required keys exist exactly once in config.txt.
ensure_config_key() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${BOOT_CONFIG}"; then
    sudo sed -i "s/^${key}=.*/${key}=${value}/" "${BOOT_CONFIG}"
  else
    echo "${key}=${value}" | sudo tee -a "${BOOT_CONFIG}" >/dev/null
  fi
}

# Hide rainbow splash and warnings, keep boot fast.
ensure_config_key "disable_splash" "1"
ensure_config_key "boot_delay" "0"
ensure_config_key "avoid_warnings" "1"
ensure_config_key "disable_overscan" "1"

# Rewrite cmdline with low-noise defaults.
sudo python3 - <<'PY'
from pathlib import Path
path = Path("/boot/firmware/cmdline.txt")
if not path.exists():
    path = Path("/boot/cmdline.txt")
tokens = path.read_text().strip().split()

# Keep important root/memory fs arguments, drop noisy display args.
drop_prefixes = (
    "console=",
    "plymouth.",
)
drop_exact = {
    "splash",
    "quiet",  # re-added in controlled order below
}

filtered = []
for t in tokens:
    if t in drop_exact:
        continue
    if any(t.startswith(p) for p in drop_prefixes):
        continue
    filtered.append(t)

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
for t in filtered + append_tokens:
    if t not in seen:
        out.append(t)
        seen.add(t)

path.write_text(" ".join(out) + "\n")
PY

echo "Enabling service..."
sudo systemctl daemon-reload
sudo systemctl disable getty@tty1.service || true
sudo systemctl stop getty@tty1.service || true
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

echo
echo "Done. Put video files in ${PROJECT_DIR}/video and reboot:"
echo "sudo reboot"
