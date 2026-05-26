#!/usr/bin/env bash
# Export current frame PNG (app must be running: npm run dev)
set -euo pipefail
SCENE="${1:-whiteboard}"
BASE="${FRAME_BASE_URL:-http://localhost:3000}"
OUT="${2:-today.png}"
curl -fsSL "${BASE}/api/frame?scene=${SCENE}" -o "$OUT"
echo "Wrote ${OUT} ($(wc -c < "$OUT") bytes) — upload to your cloud folder for Fire Stick."
