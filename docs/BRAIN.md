# The AI brain

The three AI players (BunkerBrad, xx_lilcreepah_xx, honeybee_mc) play inside the game, but their **minds** run on Claude
through a small local server in `brain/`. The game sends the brain JSON observations ("here is what you see, here is
what just happened"); the brain builds the prompt (`brain/prompts.mjs`, which also holds the three personas), calls the
Anthropic API with **your** key, and hands back the bot's decision. Without the brain the bots play on a simple survival
autopilot and cannot chat; the game shows an "AI players: autopilot" badge and `/brain` in chat shows the status.

This page is the overview. The full reference (every setting, the security model, the data files) is
[brain/README.md](../brain/README.md).

## Quick start

1. `cp .env.example .env` and put your Anthropic API key after `ANTHROPIC_API_KEY=`. `.env` is gitignored.
2. macOS: double-click `Start AI Brain.command`. Anywhere: `node brain/launch.mjs` (or `npm run brain:launch`).
   The launcher checks Node (20+), installs the one dependency from `brain/package-lock.json` on first run, builds the
   game if `dist/` is empty, starts the brain and opens `http://127.0.0.1:8644/`.
3. Play. Keep the brain's window open; Ctrl+C stops it.

Already set up? `npm run brain` starts just the server (after `npm ci --prefix brain` once).

## It costs money

Every bot decision is a paid API call, on your account. With all three bots active, our own sessions cost in the region of
a few dollars an hour. The brain helps you keep an eye on it:

- the startup banner and the log show a running total;
- every call is logged with its estimated cost in `brain/data/spend.jsonl` (local, gitignored);
- per-bot and global rate limits stop a runaway loop;
- **emergency stop:** create a file named `STOP` in `brain/`. Every spending endpoint refuses until you delete it.

The AI players are off in a new world until you invite them: tick **AI Players** on Create New World, right-click a saved
world in Load World and turn the rule on, or type `/bots join`. In the game, `/brain off` cuts the AI link (the bots fall
back to autopilot) and `/bots leave` sends them away (so does turning the AI Players rule off).

## Where the key comes from

The brain looks for `ANTHROPIC_API_KEY` in this order and uses the first it finds:

1. the dotenv file named by `DINGLE_ENV_PATH`, else the repo's own `.env`;
2. the `ANTHROPIC_API_KEY` variable of the shell that started it.

The startup banner says which one it used ("from the .env file" or "from the environment"), never the value. A key in the
file always wins, so a shell that exports a key for some other tool is only used when the repo has no key of its own.
`ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_BASE_URL` from the shell are ignored: the brain only talks to the Anthropic API.
While the key is missing or rejected, the brain re-checks every few seconds, so you can fix it without restarting.

The key never leaves the brain process: it is not logged, not returned to the page, and not written anywhere. The game
page never sees it.

Rules for everyone working on the repo:

- Never commit `.env`, and never paste a key into an issue, a log, a screenshot or a video.
- Tests never use a real key: the brain's self-test (`npm run test:brain`) runs against a fake upstream on 127.0.0.1
  with a fake key, and checks that test mode ignores any real `.env` and any key in the shell.
- AI coding sessions must not read, copy or create `.env` files. Setting up the key is a human's job.

## How the game finds the brain

- **Opened through the brain** (`http://127.0.0.1:8644/`): the brain serves the newest `dist/dinglecraft_v<X.Y>.html`
  with a page token injected, and everything just works. This is the easy way.
- **Opened any other way** (double-clicked from disk, or `npm run serve`): pair the page with the brain once by typing
  `/pair <code>` in game chat, with the code the brain prints (see [brain/README.md](../brain/README.md)).

The brain only listens on 127.0.0.1, checks the Host and Origin of every request, and requires a token for every
spending call, so other websites in your browser cannot use it.

## Settings

| variable | default | what |
|---|---|---|
| `DINGLE_ENV_PATH` | the repo's `.env` | the dotenv file holding `ANTHROPIC_API_KEY` |
| `DINGLE_GAME_DIR` | `dist/` | the folder whose newest `dinglecraft_v<X.Y>.html` is served |
| `DINGLE_DATA_DIR` | `brain/data/` | tokens, spend log, turn log (local only, gitignored) |
| `DINGLE_BRAIN_PORT` | `8644` | the brain's port (the game's own origin port is 8643) |

## Local data

`brain/data/` holds `tokens.json` (the page and pairing tokens), `spend.jsonl` and `turns.jsonl` (the prompt and response
log, which rotates at 20 MB). It is created on first start and never committed. To keep an older history, point
`DINGLE_DATA_DIR` at it rather than copying it into the repo.

## Changing the brain

- Prompts and personas: `brain/prompts.mjs`. Models and prices are at its top.
- Server: `brain/dingle-brain.mjs`. The game-side half is `src/ai_players/a8_mind.js` (what the bots observe and how they
  apply a decision) and `a9_ui.js` (chat and commands).
- Run `npm run test:brain` after any change. It is free and takes a few seconds.
- Never start the brain in real mode from an automated session or a test.
