#!/usr/bin/env bash
set -euo pipefail

# Lumen / PiPlayer display mode:
# - If LUMEN_URL is set, open Chromium in kiosk to that CMS display/pair URL
# - Otherwise fall back to local video folder playback (legacy)

BASE_DIR="/home/pi/PiPlayer"
VIDEO_DIR="${BASE_DIR}/video"
LOGO_FILE="${BASE_DIR}/logo.png"
CONFIG_FILE="${BASE_DIR}/lumen.env"

if [ -f "${CONFIG_FILE}" ]; then
  # shellcheck disable=SC1090
  source "${CONFIG_FILE}"
fi

# Preferred: cloud page from Lumen CMS
if [ -n "${LUMEN_URL:-}" ]; then
  echo "Starting Lumen display: ${LUMEN_URL}"
  # Try chromium, then chromium-browser, then firefox as last resort.
  if command -v chromium-browser >/dev/null 2>&1; then
    exec chromium-browser --kiosk --noerrdialogs --disable-infobars \
      --check-for-update-interval=31536000 \
      --disable-session-crashed-bubble \
      "${LUMEN_URL}"
  elif command -v chromium >/dev/null 2>&1; then
    exec chromium --kiosk --noerrdialogs --disable-infobars \
      --check-for-update-interval=31536000 \
      "${LUMEN_URL}"
  else
    echo "Chromium not found. Install chromium-browser or set up local videos."
    sleep 10
    exit 1
  fi
fi

mkdir -p "${VIDEO_DIR}"

if [ -f "${LOGO_FILE}" ] && command -v fbi >/dev/null 2>&1; then
  fbi -T 1 --noverbose -a "${LOGO_FILE}" >/dev/null 2>&1 || true
  sleep 2
  pkill -f "fbi -T 1" || true
fi

mapfile -t videos < <(find "${VIDEO_DIR}" -maxdepth 1 -type f \( \
  -iname "*.mp4" -o -iname "*.mkv" -o -iname "*.mov" -o -iname "*.avi" -o -iname "*.webm" \
\) | sort)

if [ "${#videos[@]}" -eq 0 ]; then
  echo "No LUMEN_URL in ${CONFIG_FILE} and no videos in ${VIDEO_DIR}."
  echo "Create ${CONFIG_FILE} with: LUMEN_URL=http://your-cms-host/pair"
  sleep 8
  exit 1
fi

while true; do
  for video in "${videos[@]}"; do
    mpv --fs --no-osd-bar --no-audio-display --really-quiet --loop-file=inf "${video}"
  done
done
