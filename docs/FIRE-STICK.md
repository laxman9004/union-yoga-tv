# Fire Stick + cloud image workflow

The lobby TV can run **without a studio computer** using:

1. **This app** (or a hosted copy) to render a PNG
2. **A cloud folder** where `today.png` lives
3. **A free static page** (`frame-viewer/`) on Netlify / Cloudflare Pages / GitHub Pages
4. **Amazon Fire Stick** in kiosk mode pointing at that page

## Architecture

```
Mariana CSVs → union-yoga-tv import → /api/frame → today.png → Dropbox/R2
                                                      ↓
Fire Stick browser → frame-viewer (Netlify) → loads today.png every 60s
```

## Step 1 — Generate `today.png`

From a machine that can run the app (your laptop is fine):

```bash
cd union-yoga-tv
npm run dev
# In another terminal, after import:
curl -s "http://localhost:3000/api/frame?scene=whiteboard" -o today.png
```

Scenes: `whiteboard` (default), `welcome`, `milestone`, `popular`

Automate daily (optional): cron on your laptop, or GitHub Action, or `npm run frame:export` (see package.json).

## Step 2 — Upload to cloud

Upload `today.png` to Dropbox, Google Drive, or Cloudflare R2.

**Dropbox:** Share link → replace `dl=0` with `raw=1` for a direct URL.

**R2 / public bucket:** Use the public object URL.

## Step 3 — Deploy frame-viewer (free)

```bash
cd frame-viewer
cp config.example.js config.js
# Edit config.js — set FRAME_IMAGE_URL to your cloud URL for today.png
```

Deploy folder to [Netlify Drop](https://app.netlify.com/drop) or connect repo with publish directory `frame-viewer`.

Your TV URL will look like: `https://union-frame.netlify.app`

Or pass URL once: `https://union-frame.netlify.app?src=https://your-cdn/today.png`

## Step 4 — Fire Stick

1. Install **Fully Kiosk Browser** (or Silk full-screen).
2. Set start URL to your Netlify page.
3. Enable auto-start on boot, keep screen on, hide system UI.
4. HDMI to Samsung Frame → Art/HDMI input.

## Step 5 — Daily update (phone-friendly)

1. Export Mariana reports → import in admin (from phone browser via Tailscale, or laptop).
2. Regenerate PNG → upload to same cloud path (overwrite `today.png`).
3. Within ~60 seconds the Fire Stick page refreshes.

No desk PC in the studio required for **display** — only for generating/uploading the image when you want new stats.

## Full Next.js display (alternative)

If you prefer live React scenes instead of a static image, host the whole app on a free tier (Vercel/Netlify) and point the Fire Stick at `/display`. Heavier, but no manual PNG step.
