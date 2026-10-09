#!/bin/bash
# chrome.sh <port> [profile dir]: start YOUR OWN headless Chrome for the QA rigs. ALWAYS muted (--mute-audio).
#   Profile: out/qa/chrome_<port> (gitignored) unless given; its log goes beside it as <profile>.log.
#   Binary:  $CHROME, else the standard macOS app path.
#   Prints the Chrome PID once the DevTools port answers; stop it with `kill <pid>` when you are done.
#   Pair it with your own static server on port+100:  node scripts/serve.mjs --port <port+100>
#   One Chrome per person/agent, on your own port: rigs default to the port they were written on, pass --port.
set -u
PORT="${1:-}"
[ -n "$PORT" ] || { echo "usage: tools/qa/chrome.sh <port> [profile dir]" >&2; exit 2; }
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
PROFILE="${2:-$REPO/out/qa/chrome_$PORT}"
BIN="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$BIN" ] || { echo "chrome.sh: no Chrome binary; set CHROME to its path" >&2; exit 2; }
if curl -sf "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then echo "chrome.sh: port $PORT is already in use" >&2; exit 1; fi
GPU=(--enable-gpu --ignore-gpu-blocklist)
[ "$(uname)" = "Darwin" ] && GPU+=(--use-angle=metal)
mkdir -p "$PROFILE"
"$BIN" --headless=new --remote-debugging-port="$PORT" --mute-audio --user-data-dir="$PROFILE" \
  --no-first-run --no-default-browser-check --disable-background-timer-throttling --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows --window-size=1280,720 "${GPU[@]}" about:blank >"$PROFILE.log" 2>&1 &
PID=$!
for _ in $(seq 1 100); do
  if curl -sf "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then echo "$PID"; exit 0; fi
  kill -0 "$PID" 2>/dev/null || break
  sleep 0.1
done
echo "chrome.sh: Chrome did not open port $PORT (see $(basename "$PROFILE").log)" >&2
kill "$PID" 2>/dev/null
exit 1
