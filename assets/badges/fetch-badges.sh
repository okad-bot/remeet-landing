#!/bin/sh
# Downloads the 3 "Featured on" badges into assets/badges/ and switches every page to the local copies.
# Run from the repo root. If a download fails, that badge keeps its direct link.
set -u
cd "$(dirname "$0")/../.."
get() { # url file
  if curl -fsSL -m 30 -o "assets/badges/$2" "$1" && [ -s "assets/badges/$2" ]; then
    grep -rl --include='*.html' "$1" . | xargs sed -i.bak "s|$1|/assets/badges/$2|g" && find . -name '*.html.bak' -delete
    echo "ok   $2"
  else
    rm -f "assets/badges/$2"; echo "FAIL $2 (direct link kept)"
  fi
}
get "https://showmebest.ai/badge/feature-badge-white.webp" showmebest.webp
get "https://www.toolpilot.ai/cdn/shop/files/f-w_690x151_crop_center.png" toolpilot.png
get "https://fazier.com/api/v1/public/badges/launch_badges.svg" fazier.svg
