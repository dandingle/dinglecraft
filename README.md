# DINGLECRAFT

**The only part of this entire project not written by AI is the paragraph you're reading right now. If you don't understand anything, neither do I. This GitHub repository holds the source code for the entire game in case people want to add / change things themselves but I cannot provide technical support if you do not know what you're doing (because again, I don't know either lol). If you just want to play the game download the HTML either from here or from https://dandingle.store/dinglecraft**




A fan-made, Minecraft-style voxel sandbox that ships as **one HTML file**. Punch trees, build a house, then find out
the game also has a casino, a stock market, rideable dragons, a microtransaction store that sells "Remove Ads" (there
are no ads), walking Nuke Kegs, a nuclear bomb you drop from a prop plane, three AI players with their own grudges, a
photoreal texture pack, a trip to Puppet Purgatory, an easel and a record player, and a sixteen-metre demon who has
taken a bite out of the world.

It runs on [three.js](https://threejs.org) r128 and nothing else: no framework, no bundler, no npm packages in the game.
The whole game is about 41,000 lines of plain JavaScript, built here from per-system source files into a single
`dinglecraft_v<version>.html` you can double-click. three.js is bundled inside that file, so it plays offline.

> DINGLECRAFT is an independent fan-made game. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG
> OR MICROSOFT. Other names belong to their owners. Free to play and tinker with, not to redistribute: see [LICENSE](LICENSE).

---

## Play it

**Just want to play?** Download [`DINGLECRAFT.html`](DINGLECRAFT.html) (the newest release, about 42.5 MB: open it on
GitHub and press the download button) and double-click it. That is the whole game, on Windows, macOS or Linux. It is
developed and tested in Chrome, so an up-to-date Chrome or Edge is the safest bet.

You need a desktop browser with WebGL (WebGL2 for the Hyperreal texture pack). No internet connection: three.js is
bundled into the file. To build the file yourself you need [Node.js](https://nodejs.org) 20 or newer (22 is what we use; see
`.nvmrc`). Nothing else.

```
npm run build
```

That writes `dist/dinglecraft_v<game version>.html` (Release 1.0 builds `dinglecraft_v6.9.html`; about 42.5 MB, every
texture is inside it). Then either:

- **double-click it** (it works straight from disk), or
- **serve it:** `npm run serve`, then open the `dist/` link it prints (`http://127.0.0.1:8643/...`).

Your worlds are saved in the browser, per site: the `file://` page, `http://127.0.0.1:8643` (`npm run serve`) and the
brain's `http://127.0.0.1:8644` each have their own save list. Clearing your browsing data deletes them, so use Export
World (pause menu) to keep a copy.

**Controls** (the full list is in Help & Controls on the title screen): WASD to move, Space to jump, Shift to sneak,
double-tap W or hold Ctrl to sprint, hold left mouse to mine or attack, right mouse to place, use or eat, 1-9 or the
scroll wheel for the hotbar, E for the inventory, Q to drop, F to change camera, T or Enter for chat, Esc to pause,
F3 for the debug overlay. Settings → Texture pack switches between **OG** (16 px, the classic look) and **Hyperreal**;
Settings → UI Scale makes the whole interface bigger or smaller (Auto picks a size for your screen); the sliders set the
field of view, mouse sensitivity and the sound and music volume.

## AI players (bring your own Anthropic key)

Three AI players can share your world: **BunkerBrad**, **xx_lilcreepah_xx** and **honeybee_mc**. They survive by your
rules, hold grudges and chat. Their minds run on Claude through a small local server in `brain/`, using **your own**
Anthropic API key. Without the brain they still play, on a simple autopilot, and cannot chat.

0. Invite them: tick **AI Players** on Create New World (it is off by default), or right-click a saved world in Load
   World and turn the rule on. In a world, `/bots join` and `/bots leave` do the same.
1. Copy `.env.example` to `.env` (in the repo root) and put your key after `ANTHROPIC_API_KEY=`.
   `.env` is gitignored: never commit it, never paste it anywhere else.
2. Start the brain:
   - **macOS:** double-click `Start AI Brain.command`.
   - **Any system:** `node brain/launch.mjs` (or `npm run brain:launch`).

   Either one installs the brain's one dependency on first run, builds the game if `dist/` is empty, starts the brain
   and opens the game at `http://127.0.0.1:8644/`. Keep that window open while you play.

**It costs real money while it runs**: every bot decision is an API call (in our own sessions, roughly a few dollars an
hour with all three bots). The brain prints a running total, logs spend locally in `brain/data/` (never committed), and
stops spending the moment a file named `STOP` exists in `brain/`. Details: [docs/BRAIN.md](docs/BRAIN.md) and
[brain/README.md](brain/README.md).

## Build

```
npm run build              # about 1 second
```

`scripts/build.mjs` concatenates `src/` (in `src/ORDER.txt` order) into `game.js`, `html/` into `head.html`, assembles
the packed art in `assets/packed/` into `hrassets.js`, and writes:

- `build/`: `head.html`, `game.js`, `hrassets.js`, `tail.html`, the two asset files and `build.json` (sizes and md5s);
- `dist/dinglecraft_v<VER>.html`: the game, `head + game + hrassets + tail`.

It checks a lot on the way (order files, syntax, size caps, version strings, asset hashes) and stops with a clear message
when something is off. A version that has already shipped is **frozen**: if your change alters the output of a shipped
version, the build warns you to bump the version first. Full contract: [docs/BUILD.md](docs/BUILD.md).

When the game moved into this repository, the build reproduced the shipped v6.3 file byte for byte. That is how we know
the move lost nothing. The proof was measured on the pre-release tree, which is not public (this history starts at
Release 1.0); [docs/PARITY.md](docs/PARITY.md) records it and gives the check you can run today: a clone of a release tag
rebuilds that release's file byte for byte (`git checkout <tag> && npm run build`, then compare the md5 with
`tests/fixtures/shipped.json`). Release 1.0 is the first release built here.

## Test

| command | what | time |
|---|---|---|
| `npm run test:quick` | build + the repo checks + every static suite + the core logic suite + the UI suites + one og_trace session | about 45 s |
| `npm test` | build + every suite once | about 11 min |
| `npm run gate` | the release gate: every suite, smokes repeated to catch flakes | about 20 min |
| `npm run test:brain` | the brain's self-test (fake upstream, no key, free; run `npm ci --prefix brain` once first) | about 8 s |

Every suite is a plain Node script that boots the real game against stubs and prints `N passed, M failed`. There are
no test frameworks and no network calls. How to write one: [docs/TESTING.md](docs/TESTING.md).

**Browser checks are always muted.** If you drive the game in a browser for testing, use headless Chrome with
`--mute-audio`, and set `soundOn=false; if(AC)AC.suspend()` on every page load. See [docs/QA.md](docs/QA.md).

## Project map

```
src/                 the game's JavaScript, one file per system (about 190 files), joined in src/ORDER.txt order
  core/ world/ entities/ ui/ features/     the original sandbox, PARTs 1-52
  ai_players/        PART 53, the AI players
  texpacks/          PART 54, OG | Hyperreal texture packs (models/ = the Hyperreal cast)
  purgatory/         PART 55, Puppet Purgatory
  creativity/        PART 56, easels, record players, jukeboxes
  malgorath/         PART 57, the Malgorath Update (hr/ = his Hyperreal block)
  boot/              the node test export and the browser boot
html/                the page shell: CSS per system, DOM by region, the 26-byte tail
assets/              the title logo, title/ (the menu panorama), vendor/ (three.js r128, bundled), the packed Hyperreal
                     art (429 WebP files), packer inputs
scripts/             build, serve, bump, release, gate, changelog (Node, no dependencies)
tests/               every test suite, fixtures, and the repo's own checks
tools/               art packers and art tools, muted browser QA rigs, the secrets scan
brain/               the AI players' local server (bring your own key)
docs/                how everything works (start with ARCHITECTURE.md)
```

The horror features live in `src/features/part47.js` to `part50.js`: the Eternal Snail, the jumpscares, the guilt
ghosts and "the others" (a few rare, unsettling events). They are ordinary source files like the rest.

## Documentation

| | |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | how to make a change, add a feature, write tests, bump the version; the rules |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | how the game is put together: the PART map, systems, conventions, how each update hooks in |
| [docs/BUILD.md](docs/BUILD.md) | the build contract, order files, guards |
| [docs/TESTING.md](docs/TESTING.md) | the suites, the gate, how to write a test, the rig field manual |
| [docs/QA.md](docs/QA.md) | muted browser QA |
| [docs/ASSETS.md](docs/ASSETS.md) | the packed art, where the source art lives, how to repack |
| [docs/BRAIN.md](docs/BRAIN.md) | the AI brain: keys, cost, data, safety |
| [docs/RELEASING.md](docs/RELEASING.md) | version bumps, patch notes, releases |
| [docs/LANDMINES.md](docs/LANDMINES.md) | things that have bitten before |
| [docs/PARITY.md](docs/PARITY.md) | the byte-for-byte proof of the move into this repo (historical), and the check you can run today |
| [docs/ROADMAP.md](docs/ROADMAP.md) | what comes next: lazy textures, ES modules, a newer three.js |
| [docs/LEGACY.md](docs/LEGACY.md) | where every old file went |
| [CLAUDE.md](CLAUDE.md) | the guide for AI coding sessions working in this repo |
| [THIRD_PARTY.md](THIRD_PARTY.md) | third-party code and models, with their licences |

## Licence

Source-available, no redistribution: you may play it, read it, tinker with it and make videos of it, but not hand it out
or sell it. The full terms are in [LICENSE](LICENSE). Third-party components keep their own licences
([THIRD_PARTY.md](THIRD_PARTY.md)). The AI players need your own Anthropic key; nothing in this repository includes one.
