# The build

```
npm run build                       # = node scripts/build.mjs
node scripts/build.mjs [--out DIR] [--dist DIR] [--no-check] [--strict] [--quiet]
```

| option | default | what |
|---|---|---|
| `--out DIR` | `build/` (env `DC_BUILD`) | where the intermediate parts and `build.json` go |
| `--dist DIR` | `dist/` (env `DC_DIST`) | where the playable html goes |
| `--no-check` | | skip the `node --check` syntax pass (faster, for experiments) |
| `--strict` | | exit 1 when a shipped version no longer reproduces its shipped bytes (the gate and release use it) |
| `--quiet` | | print only warnings and errors |

The build is **plain concatenation**: it adds nothing, rewrites nothing and minifies nothing. It needs Node 20 or newer
and no packages. It takes about a second.

## What it does, in order

1. **Version.** Reads `const GAME_VERSION = 'X.Y';` from `src/core/p01a_prologue.js`.
2. **Order files.** Reads `src/ORDER.txt` and `html/ORDER.txt` (one path per line, `#` comments and blank lines
   ignored, paths relative to `src/` or `html/`). Every listed file must exist, none may be listed twice, and **every
   `src/**/*.js` must be listed** (an unlisted file is an "orphan" and fails the build). Non-JS files under `src/` are
   ignored, so `src/texpacks/models/preview.html` (a model preview page) is not built.
3. **Marker lint.** Every update file under `src/malgorath/`, `src/malgorath/hr/`, `src/creativity/`, `src/purgatory/`
   and `src/texpacks/` whose name starts with `m`, `c`, `p` or `t` followed by a digit or `A`-`C` must begin with its
   own marker line, for
   example `/* ---- PART 56: c1_art.js ---- */` or `/* ---- PART 57 HR: m4_a_core.js ---- */`. Models, loaders, the
   AI-player files, the core and the boot file carry no marker. The folder-to-PART table is `MARKER_DIRS` in
   `scripts/lib/order.mjs`: a new update adds its folder there.
4. **game.js** = the `src/ORDER.txt` files joined as raw bytes.
5. **JS guards** on `game.js`: no `\r`; no `</script` and no `<!--` anywhere (either would end the page's script tag
   early); the export-branch marker exactly once; ends with `\n`; and the section size guards in `scripts/guards.json`.
6. **head.html** = the `html/ORDER.txt` files joined, with three placeholders filled, each exactly once:
   `{{LOGO_PNG_BASE64}}` (in `html/dom/title.html`) by the base64 of `assets/logo.png`; `{{THREE_JS}}` (in
   `html/99_scripts.html`) by `assets/vendor/three.r128.min.js` verbatim (it must contain no `</script` or `<!--`); and
   `{{TITLE_PANO_JSON}}` (in `html/dom/title.html`) by the title panorama: `assets/title/pano.json` plus its six WebP faces
   as data URIs. It must end with `<script>\n`, and its two release-label sites (`#t_ver` on the title screen, `#winsmall`
   on the win screen: `LABEL_SITES` in `scripts/lib/version.mjs`) must equal `RELEASE_LABEL`.
7. **Assets.** Assembles `hr_assets.gen.js` and `mg_assets.gen.js` from `assets/packed/` ([ASSETS.md](ASSETS.md)). Each
   must be pure ASCII, contain no `<`, end with `\n`, contain its functions, and hash (sha1) to the value its manifest
   records. `hrassets.js` = the two joined.
8. **tail.** `html/tail.html` must begin with `</script>`.
9. **Write** (each file to a temp name, then renamed into place):
   - `build/`: `head.html`, `game.js`, `hr_assets.gen.js`, `mg_assets.gen.js`, `hrassets.js`, `tail.html`, `build.json`;
   - `dist/dinglecraft_v<VER>.html` = head + game + hrassets + tail.
10. **Syntax.** `node --check` on `build/game.js`, `build/hrassets.js`, and the script extracted from the html.
11. **Cap.** The html must stay under `html_cap` in `scripts/guards.json` (45,000,000 bytes).
12. **Frozen check.** If `GAME_VERSION` is listed in `tests/fixtures/shipped.json`, the html's md5 must match the shipped
    one. A match prints `FROZEN v<VER>: byte-identical to the shipped file`. A mismatch prints a loud warning telling you to
    bump the version, writes the html **only** to the `--out` folder (a shipped file in `dist/` is never overwritten),
    and fails under `--strict`.
13. **Report.** One line per part (bytes and md5) and the html.

`build.json` records the version, the html's file name, bytes and md5, every part's bytes and md5, both asset files'
bytes, md5 and sha1, the frozen verdict (`match`, `mismatch` or `not-shipped`) and the measured section sizes. The gate
and `npm run release` read it.

## The size guards (`scripts/guards.json`)

| section | measured from | to | cap | v6.3 |
|---|---|---|---:|---:|
| PART 55 | the first `/* ---- PART 55: ` marker | `/* ---- PART 54: t0_contract.js ---- */` | 950,000 | 793,594 |
| PART 56 | the first `/* ---- PART 56: ` | `/* ---- PART 55: p0_contract.js ---- */` (must be adjacent) | 450,000 | 139,146 |
| PART 57 | `/* ---- PART 57: m0_contract.js ---- */` | `/* ---- PART 56: c0_contract.js ---- */` (must be adjacent) | 600,000 | 433,458 |
| PART 57 HR block | the first `/* ---- PART 57 HR: ` | the comment that opens the Hyperreal cast (must be adjacent) | 700,000 | 68,204 |
| the html | | | 45,000,000 | 42,986,086 |

At v6.3 the html had about 2 MB of headroom; Release 1.0's preview (game 6.4, 40.0 MB after its repack dropped the
removed textures) had about 5 MB. Game 6.7 is 42.5 MB: the bundled three.js (about 0.6 MB) and the title panorama (about
1.9 MB) moved into `head.html` (now 2.6 MB), so about **2.5 MB** is left. Most of the file is the embedded Hyperreal art,
which is why lazy-loaded textures (and the panorama) are the first item on the [roadmap](ROADMAP.md).

A new update adds its own section to `guards.json`, measured from its first marker to the marker of the update that
follows it in the file.

## Order files

`src/ORDER.txt` is the only source of build order (folders are just for people). It is grouped by PART with comment
lines. The layout rules that matter:

- The core (PARTs 1-52) comes first, then PART 53, then the updates **newest first** (57, 56, 55, 54), then the
  Malgorath Hyperreal block, the model loaders with their models, and finally `boot/export_boot.js`.
- A new update's block goes immediately before `malgorath/m0_contract.js`.
- Files inside an update are in sorted order, contract first.
- Each update's last file keeps the one blank separator line that follows it (the markers and blank lines are part of
  the shipped bytes; never "tidy" them).

`html/ORDER.txt` lists the head pieces: `00_open.html`, the CSS per system (`html/css/`), `01_body_open.html`, the DOM
by region (`html/dom/`), and `99_scripts.html` (the bundled three.js, inlined from `{{THREE_JS}}`, and the opening
`<script>`). `html/tail.html` is not
listed: the build appends it last. The DOM is split by region rather than by system because the updates added their
elements inside shared containers (`#hud`, `#title`, `#settings`, `#help`...); splitting it per system would change bytes,
so it waits for a version bump.

## Reproducibility

The output depends only on the bytes of `src/`, `html/`, `assets/`, the two order files and `scripts/`. There is no
timestamp, no environment lookup and no randomness in the html (`build/build.json` records a `builtAt` time for people;
nothing reads it as part of the output). `.gitattributes` (`* -text`) stops git from changing
line endings on checkout, and `.editorconfig` stops editors from adding or trimming whitespace, so a fresh clone on any
operating system builds the same md5. That is how the move into this repository could prove that it rebuilt the shipped
v6.3 byte for byte ([PARITY.md](PARITY.md)), and how every release since (Release 1.0 is game versions 6.4 to 6.8) stays
reproducible: its md5 is recorded in `tests/fixtures/shipped.json` and checked by the frozen check above.

## Other scripts

| script | what |
|---|---|
| `npm run serve` (`scripts/serve.mjs [--port N] [--root DIR]`) | a static server on `127.0.0.1:8643` with `Cache-Control: no-store` (no stale builds). It refuses dot-paths such as `.env` and `.git`, `brain/data`, `node_modules` and anything outside the root |
| `npm run bump -- X.Y "Title"` (`scripts/bump.mjs`) | changes the version everywhere at once ([RELEASING.md](RELEASING.md)) |
| `npm run release` (`scripts/release.mjs`) | records a release after a green gate ([RELEASING.md](RELEASING.md)) |
| `npm run changelog` (`scripts/changelog.mjs [--check]`) | regenerates `CHANGELOG.md` from the patch notes (`PATCH_LOG`) |
| `npm run gate` / `npm test` / `npm run test:quick` (`scripts/gate.mjs`) | the test runner ([TESTING.md](TESTING.md)) |

The helpers live in `scripts/lib/`: `paths.mjs` (repo-relative paths), `order.mjs`, `guards.mjs`, `version.mjs` (version
sites and `PATCH_LOG`), `assets.mjs` (the asset assembler) and `syntax.mjs` (the `node --check` pass).
