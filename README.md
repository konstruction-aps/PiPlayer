# PiPlayer + Lumen digital signage

Local video player for Raspberry Pi **and** a simple cloud CMS (**Lumen**) for making screen pages — text and pictures, like old Apple iWeb — then showing them on TVs / Pi screens.

## Lumen CMS (simple page builder)

```bash
cd cms
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

- **Login:** `admin@lumen.local` / `admin123`
- **Pages:** pick a theme, add text, add pictures, drag things around, save
- **Screens:** create a screen, note the pairing code, assign a page
- **Preview:** open `/display/<screenId>` fullscreen
- **Pair a device:** open `/pair` on the TV/Pi browser and type the code

### How it feels

1. New page → choose a theme  
2. **+ Text** / **+ Picture**  
3. Drag, resize, double-click text to edit  
4. Save → assign to a screen  

## Raspberry Pi player

### Cloud page mode (recommended with Lumen)

1. Install as before (`./install.sh`) — also install Chromium if needed:  
   `sudo apt install -y chromium-browser`
2. Create `/home/pi/PiPlayer/lumen.env`:

```bash
LUMEN_URL=http://YOUR_CMS_HOST:3000/pair
```

3. Reboot. Pair with the code from **Screens**.

### Local video mode (original)

Leave `lumen.env` unset and put videos in `video/`. See below.

## Classic Pi Zero video install

1. Raspberry Pi OS Lite (32-bit for Pi Zero)  
2. Copy project to `/home/pi/PiPlayer`  
3. Put videos in `video/`  
4. Run:

```bash
cd /home/pi/PiPlayer
chmod +x install.sh
./install.sh
sudo reboot
```

## Flashable image

```bash
chmod +x image-builder/build-image.sh
image-builder/build-image.sh
```

Or use `.github/workflows/build-piplayer-image.yml`.

## Project layout

| Path | Purpose |
|------|---------|
| `cms/` | Lumen CMS + visual page editor + player APIs |
| `player.sh` | Autostart: Lumen kiosk **or** local mpv loop |
| `install.sh` | Pi OS installer |
| `video/` | Local fallback videos |
| `lumen.env.example` | Sample CMS URL config for the Pi |

## Supported local video formats

`.mp4` `.mkv` `.mov` `.avi` `.webm`
