#!/usr/bin/env bash
set -euo pipefail

# IndexNow submission for remeet.cc
# Usage: ./indexnow-submit.sh [url1 url2 ...]
# No args = submit all pages from sitemap

KEY="59c7e8cfb4ee425a9bc48222b21bf04d"
HOST="remeet.cc"
ENDPOINT="https://api.indexnow.org/indexnow"

if [ $# -gt 0 ]; then
  URLS=("$@")
else
  URLS=($(curl -s "https://${HOST}/sitemap-pages.xml" "https://${HOST}/sitemap-blog.xml" \
    | grep -oP '(?<=<loc>)[^<]+'))
fi

TOTAL=${#URLS[@]}
echo "Submitting ${TOTAL} URLs to IndexNow..."

JSON=$(python3 -c "
import json, sys
urls = sys.argv[1:]
print(json.dumps({
    'host': '${HOST}',
    'key': '${KEY}',
    'keyLocation': 'https://${HOST}/${KEY}.txt',
    'urlList': urls
}))
" "${URLS[@]}")

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$JSON")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
  echo "OK (HTTP ${HTTP_CODE}): ${TOTAL} URLs submitted"
else
  echo "Error (HTTP ${HTTP_CODE}): ${BODY}" >&2
  exit 1
fi
