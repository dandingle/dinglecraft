# The AI brain (`brain/`)

A small local server that gives the three AI players (BunkerBrad, xx_lilcreepah_xx, honeybee_mc)
their minds. The game page only ever sends JSON observations to it; the brain builds the Claude
request (`prompts.mjs`), calls the Anthropic API with **your own key**, and hands back the parsed
JSON. Without the brain the bots still play, on autopilot.

It costs real money while it runs (every bot turn is an API call). The banner prints a running
total, `brain/data/spend.jsonl` logs every call, and there are hard per-bot and global rate limits.

## Start it

```
npm run build          # once: writes dist/dinglecraft_v<VER>.html
npm ci --prefix brain  # once: installs the Anthropic SDK from the lockfile
npm run brain          # then open http://127.0.0.1:8644/
```

On macOS you can double-click `Start AI Brain.command` in the repo root instead: it finds Node,
installs the SDK on first run, builds the game if `dist/` is empty, starts the brain and opens the
page. Keep the window open while you play; Ctrl+C stops it.

The brain serves the newest `dist/dinglecraft_v<maj>.<min>.html` with a page token injected. If you
open the html file directly (`file://`), type `/pair <code>` in game chat with the pairing code the
banner shows.

## The key (bring your own)

Copy `.env.example` to `.env` in the repo root and fill in `ANTHROPIC_API_KEY`. `.env` is
gitignored; never commit it. The brain looks for the key in this order and uses the first it finds:

1. the dotenv file named by `DINGLE_ENV_PATH`, else the repo's own `.env`;
2. the `ANTHROPIC_API_KEY` variable of the shell that started it.

The banner says which one it used ("from the .env file" / "from the environment"), never the
value. A key in the file always wins, so a shell that happens to export a key for some other tool is
only used when the repo has no key of its own. While the key is missing or rejected the brain
re-checks both places every few seconds, so you can fix it without restarting.

`ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_BASE_URL` from the shell are always ignored: the brain only
ever talks to `api.anthropic.com`.

## Settings (all optional, environment variables)

| name | default | what |
|---|---|---|
| `DINGLE_ENV_PATH` | `<repo>/.env` | dotenv file holding `ANTHROPIC_API_KEY` |
| `DINGLE_GAME_DIR` | `<repo>/dist` | folder whose newest `dinglecraft_v*.html` is served |
| `DINGLE_DATA_DIR` | `brain/data` | tokens, spend log, turn log (local only, gitignored) |
| `DINGLE_BRAIN_PORT` | `8644` | the brain's port (127.0.0.1 only); the game's own origin port is 8643 |

## Emergency stop

Create a file named `STOP` in `brain/`. Every spending endpoint then answers 503 until you delete it.

## Local data (`brain/data/`, never committed)

- `tokens.json`: the page token and paired tokens (mode 600). Delete it to revoke every pairing.
- `spend.jsonl`: one line per API call with its estimated cost.
- `turns.jsonl`: the prompt/response log (rotates at 20 MB).

The folder is created on first start and is gitignored. To keep an older history, point
`DINGLE_DATA_DIR` at it instead of copying it into the repo.

## Self-test

```
npm run test:brain     # = node brain/selftest.mjs
```

It is hermetic and free: temp folders only, a fake Anthropic upstream on 127.0.0.1, fake keys. It
never reads the repo `.env`, drops any `ANTHROPIC_*` variables it inherited, and checks among other
things that the defaults are repo-relative, that test mode ignores both a `.env` file and the shell
key, that a real-mode `.env` key wins over the shell, and that no key or token ever reaches a log,
a response or a data file. It needs `npm ci --prefix brain` first.

## Security model (short)

- Listens on 127.0.0.1 only; the Host header must be `127.0.0.1:<port>` or `localhost:<port>`, unknown
  Origins get 403 (DNS-rebinding and cross-site protection).
- Every spending endpoint needs the page token or a paired token.
- The game html (it carries the page token) is never sent with CORS headers.
- The key never leaves the process: it is not logged, returned or written anywhere, and log lines are
  scrubbed of it and of every token.
