#!/bin/bash
# Double-click me to start the DINGLECRAFT AI brain (macOS).
# The brain runs in this window. Keep it open while you play; Ctrl+C stops it.
# Any platform: `node brain/launch.mjs` does the same from a terminal (`npm run brain` = the bare server).
# Your Anthropic key goes in the repo's .env (copy .env.example), or export ANTHROPIC_API_KEY first.

# Finder-launched shells don't always have Homebrew/nvm on PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"

pause_and_exit() {
  echo ""
  read -n 1 -s -r -p "  Press any key to close this window."
  echo ""
  exit "${1:-0}"
}

cd "$HERE" 2>/dev/null && [ -f brain/launch.mjs ] || { echo "  Hmm, I can't find the 'brain' folder next to this file."; pause_and_exit 1; }

if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js isn't installed (or I can't find it)."
  echo "  Install Node 22 from https://nodejs.org (or 'brew install node@22') and double-click me again."
  pause_and_exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null)"
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 20 ] 2>/dev/null; then
  echo "  Your Node.js is too old (found v${NODE_MAJOR:-?}, need 20 or newer - 22 is best)."
  echo "  Install Node 22 from https://nodejs.org (or 'brew install node@22') and double-click me again."
  pause_and_exit 1
fi

# launch.mjs: npm ci on first run, builds dist/ if there is no game yet, starts the brain, opens the page.
trap ':' INT   # let Ctrl+C reach node, then carry on to the goodbye below
node brain/launch.mjs "$@"
STATUS=$?
trap - INT
pause_and_exit "$STATUS"
