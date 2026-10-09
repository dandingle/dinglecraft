#!/bin/bash
# grep-safe.sh <pattern> [path...]: `grep -rnI` over the repo that never reads a secret and skips the noise.
# Skips: every .env file, tokens.json, *.jsonl and the local private-terms list (secrets and private data); build outputs
# (build/ dist/ out/: copies of src/ megabytes wide), generated asset scripts, the og_trace golden fixtures (generated digests,
# one long line each), node_modules, .git, brain/data and .art-ledger. Paths default to the repo root (output then
# repo-relative). Extra grep flags: GREP_FLAGS="-i -l" tools/grep-safe.sh x
# Use this instead of a raw recursive grep anywhere in the repo.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
if [ $# -lt 1 ]; then
  echo "usage: tools/grep-safe.sh <pattern> [path...]   (GREP_FLAGS for extra grep flags)" >&2
  exit 2
fi
pat="$1"; shift
if [ $# -lt 1 ]; then cd "$REPO" || exit 2; set -- .; fi   # default: the repo, repo-relative output
for p in "$@"; do
  case "$p" in
    *.env|*.env.*|*.local.txt)
      echo "grep-safe: refusing to search $p (env file or private-terms list)" >&2; exit 2 ;;
  esac
done
# shellcheck disable=SC2086
grep -rnI ${GREP_FLAGS:-} \
  --exclude='*.gen.js' --exclude=hrassets.js --exclude='dinglecraft_v*.html' \
  --exclude='.env' --exclude='.env.*' --exclude='*.env' --exclude=tokens.json --exclude='*.jsonl' --exclude='*.local.txt' \
  --exclude-dir=og_trace --exclude-dir=build --exclude-dir=dist --exclude-dir=out \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=data --exclude-dir=.art-ledger \
  -e "$pat" -- "$@"
