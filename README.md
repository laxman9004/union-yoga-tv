# Union Yoga — The Frame (lobby TV)

Fullscreen scene rotator for the Samsung Frame in the lobby. Brand-locked to `../mockup/union-yoga-mockup.html`.

## Quick start

```bash
cd union-yoga-tv
cp .env.example .env.local
# Edit .env.local — at minimum DATABASE_URL is preset

npm install
npm run db:migrate
bash scripts/download-brand-assets.sh   # optional: logo + studio photos

npm run dev
```

- **TV / kiosk:** http://localhost:3000/display (press **F** for fullscreen)
- **Admin:** http://localhost:3000/admin
- **Data verify API:** http://localhost:3000/api/data/verify

## Where to put data

```
union-yoga-tv/data/incoming/     ← drop your CSV exports here
```

Full column spec: **[data/README.md](./data/README.md)**  
Templates: **`data/samples/*.csv`**

Workflow:

1. Export from Mariana Tek (or your pipeline) → three files: `members`, `class_sessions`, `check_ins`
2. Copy into `data/incoming/` on the **player PC** (or SCP from home via Tailscale)
3. Admin → **Scan incoming** — see what’s sufficient for each scene group
4. **Import to database** — files move to `data/processed/`

Snapshots are point-in-time; re-import when you want fresher stats.

## Copy for the TV

Admin → **Copy** tab: paste lines from Cursor (or anywhere), pick a template, **Publish to TV**. Only published copy appears on sweat forecast / testimonial / class personality scenes.

Optional: set `ANTHROPIC_API_KEY` in `.env.local` if you want one-click auto-generate in admin — not required if you draft in chat.

## Studio player (4K Frame)

Use a **small always-on computer** (Pi / NUC), not the sleeping front-desk Mac:

1. Install Node 20+, clone/copy `union-yoga-tv`
2. `npm run build && npm run start`
3. Chromium kiosk → `http://127.0.0.1:3000/display`
4. From home: Tailscale → `http://<player>:3000/admin` to upload data + approve copy

## Status (Day 1)

| Done | Item |
|------|------|
| ✅ | Next.js + Tailwind brand tokens (Fraunces / Inter) |
| ✅ | SQLite + Prisma schema |
| ✅ | Mariana Tek CSV importers (Details, Frequency, Birthdays, Utilization) |
| ✅ | `data/incoming` scan + import + DB status |
| ✅ | Admin data scanner |
| ✅ | `/display` ambient Clay Orb scene |
| ✅ | Reservations import → check-ins |
| ✅ | MVP scenes on `/display` (whiteboard, milestone, popular, welcome) |
| ✅ | `/api/frame` PNG export + `frame-viewer/` for Fire Stick |
| 🔲 | LLM drafts + publish UI |
| 🔲 | LLM drafts + publish UI |
| 🔲 | Mariana Tek API (optional later) |

## Parent repo

Lives inside the Union Yoga modernization workspace; styling source of truth is `../mockup/`, voice is `../content/brand-voice.md`.
