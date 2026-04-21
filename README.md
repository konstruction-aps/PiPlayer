# Pi Zero Video Player (autostart + blackout boot)

This setup makes a Raspberry Pi Zero boot directly into fullscreen video playback from the `video` folder, with a hard-blackout style boot (minimal text/logos on screen).

## What it does

- Starts playback automatically at boot
- Plays all supported video files in `video/`
- Loops forever
- Uses hard-blackout boot settings (very quiet boot output)
- Optionally shows your own `logo.png` before videos start
- Can build a preconfigured flashable `.img`

## Project files

- `player.sh` - fullscreen player loop
- `piplayer.service` - systemd autostart service
- `install.sh` - one-shot installer on an existing Pi OS install
- `video/` - put your videos here
- `image-builder/build-image.sh` - generates a flashable Pi image with everything preinstalled

## Option A: Install on an existing Pi OS card

1. Use Raspberry Pi OS Lite (32-bit recommended for Pi Zero).
2. Copy this folder to:
   - `/home/pi/PiPlayer`
3. Put your video files into:
   - `/home/pi/PiPlayer/video`
4. Optional logo:
   - `/home/pi/PiPlayer/logo.png`
5. Run:

```bash
cd /home/pi/PiPlayer
chmod +x install.sh
./install.sh
sudo reboot
```

## Option B: Build a ready-to-flash image (.img)

This produces a complete custom image with PiPlayer already configured.

### Build requirements

- Linux machine (or Linux VM)
- Docker
- `git`, `rsync`

### Build steps

```bash
cd /path/to/PiPlayer
chmod +x image-builder/build-image.sh
image-builder/build-image.sh
```

The final image appears in:

- `image-builder/work/deploy/`

### Flashing

Use either:

- Raspberry Pi Imager (`Use custom` and pick the `.img`)
- balenaEtcher

## Optional: Build image in GitHub Actions

If this repo is on GitHub, run the workflow:

- `.github/workflows/build-piplayer-image.yml`

Then download the `piplayer-image` artifact and flash it.

## Supported video formats

- `.mp4`
- `.mkv`
- `.mov`
- `.avi`
- `.webm`

## Control / troubleshooting

- Check service status:
  - `sudo systemctl status piplayer.service`
- View logs:
  - `journalctl -u piplayer.service -b`
- Restart player:
  - `sudo systemctl restart piplayer.service`

## Notes

- The boot cannot be made physically perfect-black from power-on on all displays, because some monitors briefly show sync messages. This config removes almost all Linux boot text/logos.
- Default image credentials in builder config are currently `pi` / `raspberry`. Change that in `image-builder/build-image.sh` before distribution.
