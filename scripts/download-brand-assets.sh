#!/usr/bin/env bash
# Vendor logo + studio photos from mockup CDN URLs into public/brand/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/brand"
mkdir -p "$OUT"

curl -fsSL -o "$OUT/logo.png" \
  "https://images.squarespace-cdn.com/content/v1/6666026f7f7cab2385db2cb8/dde369f3-945b-4872-a527-a9bf2c590477/Untitled+design-2.png?format=1500w"

curl -fsSL -o "$OUT/studio-interior-wide.jpg" \
  "https://images.squarespace-cdn.com/content/v1/6666026f7f7cab2385db2cb8/d391104c-3e2f-42c0-8b92-f55bb310bd29/Robb+McCormick+Photography+%28114+of+159%29.jpg?format=1500w"

curl -fsSL -o "$OUT/studio-interior-angled.jpg" \
  "https://images.squarespace-cdn.com/content/v1/6666026f7f7cab2385db2cb8/9824d5a7-c4f7-47ab-b28a-5cbd4a09ae60/Robb+McCormick+Photography+%28145+of+159%29.jpg?format=1500w"

echo "Saved to $OUT"
