# Contributing to DINGLECRAFT

Thanks for wanting to make the dumbest good game on the internet a little bigger. This page is the short version of
how work gets done here. The game is silly; the engineering underneath is not. Every feature lands with tests, every
release goes through the gate, and the shipped file is never a surprise.

New here? Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first, then come back.

---

## Setup

- Node.js 20 or newer (22 recommended, see `.nvmrc`). No `npm install` is needed for the game, the build or the tests.
- Python 3 only if you repack the Hyperreal art ([docs/ASSETS.md](docs/ASSETS.md)).
- For browser checks: Google Chrome (headless is fine). See [docs/QA.md](docs/QA.md).

```
npm run build        # dist/dinglecraft_v<VER>.html
npm run test:quick   # about 45 seconds
npm run hooks        # once: the git hooks (UTC commit dates, the privacy scan before every commit and push)
```

## The rules

These are not style preferences. Each one exists because breaking it once cost real time.

1. **Testing is always muted.** In any browser: headless Chrome with `--mute-audio`, plus `soundOn=false;
   if(AC)AC.suspend()` on every page load, and keep `vx_vox_settings` at `snd:0`. Never switch sound on in a test.
   Audio is verified offline (the audio suites render it in Node and measure it). Details: [docs/QA.md](docs/QA.md).
2. **Shipped versions are frozen.** Once a version is in `tests/fixtures/shipped.json`, its html must stay byte for
   byte what was shipped. If your change alters the output, bump the version first (`npm run bump`). The build warns,
   and the gate and `npm run release` refuse.
3. **The core quartet is frozen.** Never edit `tests/core/stubs.js`, `test.js`, `smoke.js` or `botsmoke.js`. New
   behaviour gets new suites. (The one exception was the owner's: in 6.8 `smoke.js` lost its Watcher check along with
   the Watcher; `tests/repo/r_gate.js` pins the new bytes.)
4. **Never hand-edit generated files**: `build/`, `dist/`, `out/`, `DINGLECRAFT.html` (the play file: `npm run release`
   copies each release there) and the generated part of `CHANGELOG.md` (edit the patch notes in
   `src/ui/p28_patch_notes.js` and run `npm run changelog`).
5. **Never commit secrets or personal data.** No `.env`, no keys, no `brain/data/`, no absolute paths, no email
   addresses, no local timezone in a commit (commit with `TZ=UTC0`). Run `npm run scan` before you commit (the
   pre-commit hook does it for you) and `npm run scan:history` before you push (the pre-push hook does that).
6. **No paid API calls** from tests, CI or anything automatic. The art tools and the brain spend real money: run them
   only on purpose, with your own key and a budget.
7. **Bytes matter.** The build is plain concatenation and md5-pinned. Use LF line endings, do not let your editor strip
   trailing whitespace or add final newlines to files you did not mean to change (`.editorconfig` sets this up), and
   never re-indent code you are not changing.

## Making a change

1. **Bump first if the output will change**: `npm run bump -- 6.9 "The Something Update" --label "Release 1.1"`. This
   edits every place the version and the release label live and adds a `TODO` patch-notes entry
   ([docs/RELEASING.md](docs/RELEASING.md), and "Versions and release labels" below).
2. **Recon before editing.** Find the exact lines you will change (`tools/grep-safe.sh 'functionName'`) and read them.
   Never assume a function's signature, a variable's name or what a branch does: this codebase has bitten every
   assumption. Read [docs/LANDMINES.md](docs/LANDMINES.md) for the area you are touching.
3. **Edit `src/` directly.** A change to the core is a normal edit at the call site. If you script edits, use the
   unique-anchor discipline: the exact old text must occur exactly once, or nothing is written. After an insert, look at
   the lines around it to confirm it landed where you meant (one insert once landed in the wrong one of three identical
   `if(mt==='alien'){` blocks and silently broke a mob).
4. **Build** (`npm run build`). It runs `node --check` on everything and stops on any syntax error.
5. **Test.** Add or extend suites (below), then `npm run test:quick` while iterating and `npm test` before you commit.
   A red test stops the line. Flaky? It is almost always the test rig, not the game: see the field manual in
   [docs/TESTING.md](docs/TESTING.md).
6. **Look at it**, muted, in a real browser if it is visual ([docs/QA.md](docs/QA.md)), in both texture packs.

### Things the engine will not tell you

- **Persistence is a triple.** Player state needs a default in `newPlayer`, a line in `snapshot()` and a restore (with
  a backward-compatible default) in `applySave`. World state also needs a reset in `resetWorld`, or new worlds inherit
  it. Old saves must always load.
- **IDs collide silently.** Check the ID ledger in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#7-id-ledger) and grep before
  you allocate a block or item id.
- **Testable things go into `__vox`** (or your update's export object), or the suites cannot see them.

## Adding a file to an existing update

- Put it in that update's folder, with its marker as line 1, for example `/* ---- PART 55: p6_new.js ---- */`.
- Add it to `src/ORDER.txt` inside that update's block, in sorted position.
- The build fails if a `src/**/*.js` file is not listed (or is listed twice), so you cannot forget.

## Adding a whole new update (a new PART)

1. A new folder `src/<feature>/`. Every file starts with `/* ---- PART 58: <file name> ---- */`. Add the folder (and
   its file-name prefix) to the marker lint in `scripts/lib/order.mjs` (`MARKER_DIRS`) so the build checks it.
2. In `src/ORDER.txt`, insert the block **immediately before** `malgorath/m0_contract.js` (the newest update loads
   first; every older update's guard relies on that layout).
3. Add a size guard for the new section to `scripts/guards.json`.
4. Talk to the core through a registry (like `PREG`, `CRREG`, `MGREG`), not by scattering calls through core files.
   Keep the core-side changes few and obvious.
5. Expose what tests need through one export object (like `PGEX`, `CREX`, `MGEX`) spread into `__vox` in
   `src/boot/export_boot.js`.
6. CSS goes in `html/css/<feature>.css` (listed in `html/ORDER.txt` before `01_body_open.html`); DOM goes in the right
   `html/dom/*.html` region; add a row to the key list and a blurb in `html/dom/help.html`.
7. Statics and smokes for it, registered in `tests/gate.json`.

Function declarations hoist across the whole script, so call order between files rarely matters. A top-level read of
another file's `let`/`const` does: see "One classic script" in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Writing tests

Every feature gets both kinds:

- **Statics** check tables, ids, exports and source rules. Fast, no world.
- **Smokes** boot a real world and drive frames: `V.frameStep(t)` with strictly increasing timestamps, about 160 warm-up
  frames before asserting, at least 25 frames of settling after any teleport.

Each suite is one Node process with one boot, uses `ok(name, condition)` and ends with `N passed, M failed` (exit code 1
on any failure). Seed `Math.random`, use the fake clock unless real time is the point, never touch the network, never
turn sound on, and write files only under `out/`. Register the suite in `tests/gate.json`. The full guide, with the rig
field manual: [docs/TESTING.md](docs/TESTING.md).

## Versions and release labels

Every build has two version names, and they never mix:

| | `GAME_VERSION` (internal) | `RELEASE_LABEL` (public) |
|---|---|---|
| example | `'6.8'` | `'Release 1.0'` |
| defined in | `src/core/p01a_prologue.js` | the line right below it |
| used by | saves (`v` in every world file), save migrations, every version comparison, the dist file name `dinglecraft_v6.8.html`, the brain (it serves `dinglecraft_vX.Y.html`), `tests/fixtures/shipped.json`, `package.json` (`6.8.0`), the git tag `v6.8` | everything a player or reader sees: the title screen (`#t_ver` in `html/dom/title.html`), the win screen (`#winsmall` in `html/dom/panels_b.html`), the F3 debug line, README, CHANGELOG headings, the git tag `release-1.0` |
| shape | two-part `maj.min`, strictly increasing, never reused | one short line of letters, digits, spaces, dots and dashes; consecutive versions may share it, but it never comes back once a newer label has shipped |

- **`GAME_VERSION` only ever goes up** (6.3, 6.4, 6.5 ... 7.0), so old worlds can always be recognised and migrated, and
  a shipped version stays frozen to its bytes. It is never set to a release name: Release 1.0 is game versions 6.4 (the
  preview, labelled Release 1.0 Preview) to 6.8.
- **`RELEASE_LABEL` names a release for people.** Release 1.0 was the first public release of the repository. A release
  can come in cuts: consecutive game versions may keep the newest label (6.5 to 6.8 are all Release 1.0), and the
  release tag then moves to the newest cut. Once a newer label ships, an older label never comes back
  (`labelProblem` in `scripts/lib/version.mjs`). The next public build gets its own label (for example Release 1.1); the
  label is chosen at bump time.
- **Patch notes** (`PATCH_LOG` in `src/ui/p28_patch_notes.js`): the top entry is
  `{v:GAME_VERSION,label:RELEASE_LABEL,title:'...',lines:[...]}`. The in-game patch-notes screen is retired (Release 1.0),
  so `PATCH_LOG` is the data behind `CHANGELOG.md`: a heading shows the label when an entry has one
  (`Release 1.0 Preview — Under New Management`, or just the title when it already starts with the label) and `v6.3 — ...`
  for older entries. `npm run bump` freezes the previous top entry's `v` and `label` as literals.
- **One command changes everything:** `npm run bump -- <maj.min> "<title>" --label "<label>"` edits every site at once
  (all or nothing) and refuses a version at or below a shipped one or an older release's label. `tests/repo/r_build.js` and
  `npm run build` check on every run that all the sites agree.
- **Release** (`npm run release`) records `{label, bytes, md5, ...}` in `tests/fixtures/shipped.json` and prints the two
  tags to create (`v<GAME_VERSION>` and the label as a tag, e.g. `release-1.0`; `git tag -f` for a later cut).
- **Save compatibility:** a world records the `GAME_VERSION` that last saved it. When a release renames something a save
  stores, read the old value through an alias in the load path and re-save under the new name (Release 1.0's recast:
  `mpLegacyKeys`, `mpDimAlias`, `hnTrunkMigrate`, `stoxMigrate`; tested both ways by `tests/purgatory/p8_saves.js`).

Patch notes are playful and per feature; the announcement adds the test counts that `npm run release` prints.
`npm run release` refuses while they still say `TODO`. Full flow: [docs/RELEASING.md](docs/RELEASING.md).

## Commits

- Small, logical commits with a prefix: `feat:`, `fix:`, `test:`, `build:`, `tools:`, `docs:`, `release:`.
- Commit in UTC (`TZ=UTC0 git commit ...`): a local timezone in a public commit says where and when you work.
- Say what changed and why. A release commit quotes the gate counts.
- Never commit `build/`, `dist/`, `out/`, `.env`, `brain/data/`, `node_modules/` or `*.gen.js` (all gitignored).
- `.gitattributes` keeps line endings untouched (`* -text`) and hides the generated og_trace goldens from diffs. Do not
  change that.
