#!/usr/bin/env bash
set -euo pipefail

# Change these paths if you use a different user/location.
BASE_DIR="/home/pi/PiPlayer"
VIDEO_DIR="${BASE_DIR}/video"
LOGO_FILE="${BASE_DIR}/logo.png"

mkdir -p "${VIDEO_DIR}"

if [ ! -d "${VIDEO_DIR}" ]; then
  echo "Video directory not found: ${VIDEO_DIR}"
  exit 1
fi

# If a logo file exists, show it briefly before playback.
# This needs the package 'fbi' and works on tty1.
if [ -f "${LOGO_FILE}" ] && command -v fbi >/dev/null 2>&1; then
  fbi -T 1 --noverbose -a "${LOGO_FILE}" >/dev/null 2>&1 || true
  sleep 2
  pkill -f "fbi -T 1" || true
fi

# Build a playlist from common video formats.
mapfile -t videos < <(find "${VIDEO_DIR}" -maxdepth 1 -type f \( \
  -iname "*.mp4" -o -iname "*.mkv" -o -iname "*.mov" -o -iname "*.avi" -o -iname "*.webm" \
\) | sort)

if [ "${#videos[@]}" -eq 0 ]; then
  echo "No videos found in ${VIDEO_DIR}. Supported: mp4, mkv, mov, avi, webm"
  sleep 5
  exit 1
fi

# Loop each video forever in fullscreen.
# --no-audio-display prevents some OSD overlays.
while true; do
  for video in "${videos[@]}"; do
    mpv --fs --no-osd-bar --no-audio-display --really-quiet --loop-file=inf "${video}"
  done
done
