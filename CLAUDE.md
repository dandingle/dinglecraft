# CLAUDE.md: working on DINGLECRAFT

You are working on **DINGLECRAFT**, an original fan-made Minecraft-style voxel sandbox that ships as **one HTML file**
(three.js r128, no framework, no game dependencies). It has grown feature by feature for a long time under a strict
test-first, surgical-edit discipline. This file hands that discipline to you. Read it fully before touching code, then
read the doc for the area you are working in.

The owner, Dan, talks casually and loves absurd features (a casino, a microtransaction-store parody, walking Nuke Kegs, a
16-metre demon in a 16 px world, Puppet Purgatory). Match that energy in patch notes. Be rigorous in the code. Keep it
original: no real characters, brands or trademarks in names, art or text (the IP scan in `tests/repo/` enforces the list).

---

## 0. Hard rules (never break these)

1. **Testing is always muted.** Dan may be at the machine. In any browser: your own headless Chrome with
   `--mute-audio`, `vx_vox_settings` merged with `{snd:0,mus:0,tp:'og'}` before the page runs (merge, never wipe), and
   `soundOn=false; if(AC)AC.suspend()` after every load. Never turn sound on. Verify audio offline only. Put `tp:'og'`
   back when done. Details: `docs/QA.md`.
2. **Secrets.** Never read, print, copy, create or commit a `.env` file or any key. Secret scans report `path:line` and a
   rule name, never a value. `brain/data/` never goes in git.
3. **No paid API calls.** Never run `tools/art/fal.mjs` or any art driver, and never start the brain in real mode, with
   any key, real or fake. The brain self-test (`npm run test:brain`) is free and fine.
4. **Shipped versions are frozen.** If `GAME_VERSION` is in `tests/fixtures/shipped.json`, the build must reproduce it
   byte for byte. Bump first (`npm run bump`) for anything that changes output. Never overwrite a `dist/` html Dan may be
   playing; never modify a shipped html anywhere. "Release 1.0" is a public LABEL (`RELEASE_LABEL`), not a game version:
   Release 1.0 is game versions 6.4 (the preview) to 6.9. Never set `GAME_VERSION` or `package.json` to a label;
   `GAME_VERSION` only goes up ([CONTRIBUTING.md](CONTRIBUTING.md), "Versions and release labels").
5. **The core quartet is frozen.** Never edit `tests/core/{stubs,test,smoke,botsmoke}.js`. New behaviour, new suites.
   (One owner-made exception: 6.8 removed `smoke.js`'s Watcher check with the Watcher; `r_gate.js` pins the new bytes.)
6. **Never print big generated text**: `build/hrassets.js`, `build/*.gen.js`, `dist/*.html`, `DINGLECRAFT.html`, `assets/packed/**`. Their
   lines run to megabytes. Search with `tools/grep-safe.sh <pattern> [paths]`, which skips build output, generated
   asset scripts and `.env` files, rather than a raw recursive grep over the repo.
7. **Public-repo hygiene.** No absolute paths, usernames, machine names, private folder or company names, or email
   addresses in any repo file, and no local timezone in commit metadata: commit with `TZ=UTC0` (the pre-commit hook in
   `tools/hooks/`, installed with `npm run hooks`, refuses anything else). Code that needs a path computes it from its own
   location or reads an environment variable. The owner's private words live in the untracked
   `tools/private_terms.local.txt`, never in a tracked file; `npm run scan` and `npm run scan:history` check against it.

## 1. Layout

```
src/            the game, about 190 files, joined in src/ORDER.txt order (the only source of order)
  core/ world/ entities/ ui/ features/   PARTs 1-52 (the original sandbox, every update's core hooks folded in)
  ai_players/   PART 53      texpacks/ PART 54 (+ models/, loaders/)      purgatory/ PART 55
  creativity/   PART 56      malgorath/ PART 57 (+ hr/: the PART 57 HR block)     boot/export_boot.js
html/           head.html in 18 pieces (html/ORDER.txt) + tail.html; css/ per system, dom/ by region
assets/         logo.png, title/ (menu panorama), vendor/ (three.js r128, inlined), packed/{hr,mg}/ (429 WebP + sidecars +
                manifests), pack-inputs/
scripts/        build.mjs serve.mjs bump.mjs release.mjs gate.mjs changelog.mjs guards.json lib/
tests/          core/ (frozen quartet) lib/ (boot chain, paths.js) texpacks/ purgatory/ pilot/ creativity/ malgorath/
                ui/ repo/ fixtures/ gate.json
tools/          art/ (packers, fal client: PAID) assets/ (unpack, repack) qa/ (muted browser rigs) hooks/ (git hooks)
                scan_secrets.mjs scan_history.mjs grep-safe.sh lib/private_terms.cjs
brain/          the AI players' local server (bring your own key)
docs/           ARCHITECTURE BUILD TESTING QA ASSETS BRAIN RELEASING PARITY ROADMAP LEGACY LANDMINES
build/ dist/ out/   gitignored outputs
```

`dist/dinglecraft_v<VER>.html` = `build/head.html + game.js + hrassets.js + tail.html`. Build with `npm run build` (about
1 s). The split is byte-exact: head ends with `<script>\n`, game.js and hrassets.js end with `\n`, tail begins with
`</script>`.

## 2. The golden workflow (per feature)

1. **Bump if output will change**: `npm run bump -- X.Y "Title"`.
2. **Recon before editing.** Grep (safely) for the exact lines you will change and read them (`sed -n 'A,Bp' file`).
   Never assume a signature, a variable name or what a branch does. Read `docs/LANDMINES.md` for the area.
3. **Edit `src/` directly** with surgical, unique-anchor edits (section 3). Core integrations are normal edits at the
   call site. New systems go in their own file or their own update folder ([CONTRIBUTING.md](CONTRIBUTING.md)).
4. **Exports.** Everything testable goes into `__vox` (core names in `src/boot/export_boot.js`) or the update's export
   object (`TPEX`, `PGEX`, `CREX`, `MGEX`).
5. **Tests.** Statics and smokes for every feature, registered in `tests/gate.json` (section 6).
6. **Run repeatedly.** `npm run test:quick` while iterating, `npm test` before committing, and repeat the relevant smokes
   4-6 times. Flakes are real and almost always rig bugs (`docs/TESTING.md`, the field manual). A red test stops the
   line.
7. **HTML.** UI markup and CSS in `html/`; if it adds a key or a mouse action, a row in the Controls screen (`html/dom/help.html`,
   controls only, no feature blurbs).
8. **Look at it**, muted, in a real browser, in OG and Hyperreal, if it is visual (`docs/QA.md`).
9. **Ship.** Patch notes, `npm run gate`, `npm run release`, commit with `TZ=UTC0`, tag (`docs/RELEASING.md`).
10. **Announce** with playful per-feature patch notes, plus the test counts `npm run release` prints (the in-game
    patch-notes screen is retired; `PATCH_LOG` is the data behind `CHANGELOG.md`).

## 3. Editing discipline

Make scripted edits with an exact, unique anchor, all or nothing:

```js
// a scratch script, run with node (never leave it in the repo)
const fs = require('fs'); const f = 'src/entities/p05d_mobs.js'; let s = fs.readFileSync(f, 'utf8');
function rep(a, b) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('anchor found ' + n + 'x: ' + a.slice(0, 70)); s = s.replace(a, () => b); }
rep(`...exact unique old text...`, `...new text...`);
fs.writeFileSync(f, s);                          // reached only if every rep() succeeded
```

- **The uniqueness check is sacred.** If it fires, nothing was written: fix the anchor and rerun the whole batch. Never
  fuzzy-match. Use `() => b` so `$` in the new text is not treated as a replacement pattern.
- **Anchors that look unique often are not**: `if(mt==='alien'){` exists three times. After inserting, grep the new text
  and read the surrounding lines.
- **Unicode:** most strings use `◆`-style escapes, some contain real characters (em dashes). If an anchor will not
  match, inspect the bytes. In Python never put surrogate-pair escapes like `🎰` in source (use the real
  character or `\U0001F3B0`).
- Never re-indent, reformat or "tidy" code you are not changing; never touch the marker lines or the blank lines between
  files. Bytes are pinned.
- `npm run build` runs `node --check` on everything; run it after every edit batch.

## 4. Architecture in one screen

Full map: `docs/ARCHITECTURE.md` (PART-to-file table, systems index, how each update hooks in, ID ledger, persistence).

- **One classic script**: `'use strict'` at the top of `core/p01a_prologue.js` covers all; ~3,500 shared top-level names,
  none duplicated; function declarations hoist across files. Never split into separate script tags.
- **Load order ≠ PART order**: core 1-52, 53, then updates newest first (57, 56, 55, 54), the PART 57 HR block, the cast
  loaders, the export branch. Names from later-loading (older) updates are runtime-only and `typeof`-guarded. New
  updates go immediately before `malgorath/m0_contract.js` in `src/ORDER.txt`, with a section guard in
  `scripts/guards.json`.
- **Constants:** `CH=16`, `WH=80` (nothing above y≈76 works: `setBlock` silently no-ops), `SEA=30`. Blocks are a
  `Uint8Array` (ids < 256).
- **Conventions the engine forces:** forward is `(-sin(yaw), -cos(yaw))`; **positive pitch looks up**; mob faces are on
  the +z box face (material index 4); `def()` fields are `tiles`/`toolClass`.
- **Frame:** `frame(t)` in `core/p07h_boot_loop.js` runs one long gated line of per-system ticks; append new ones there.
- **UI panels** follow the store pattern (overlay div, `xOpen`, `openX/closeX/renderX`, `modalOpen()`, the Esc chain,
  top-level button wiring).
- **Updates talk to the core through registries** (`PREG`, `CRREG`, `MGREG`, `tpRegister`, `HR.MODELS`) and keep state in
  one saved object each (`MP`, `save.cr`, `save.mg`), written only when it differs from the default.

**ID ledger** (`docs/ARCHITECTURE.md` section 7): grep before allocating. Next free at v6.3: block ids 217, 218, 219, 248,
249 (212 stays undefined on purpose); item ids 309, 339, then 366+. Purgatory ids are assigned only in
`purgatory/p0_contract.js`, creativity's only in `c0_contract.js`, Malgorath's only in `m0_contract.js`.

**Persistence triple:** player fields need a default in `newPlayer`, a line in `snapshot()` and a restore with a default
in `applySave`; world state also needs a reset in `resetWorld`. Stacks keep `ench`/`dur` through every copy. Old saves
must always load.

## 5. The build and its guards

`docs/BUILD.md` has the contract. The build fails on: an orphan, missing or duplicate ORDER entry; a bad marker line;
`\r`, `</script` or `<!--` in JS; a section over its guard; mismatched version strings; an asset hash mismatch; a syntax
error; an html over 45,000,000 bytes (about 2.5 MB of headroom left at game 6.7). Under `--strict` (gate, release) a
shipped version that changed bytes also fails.

## 6. Testing

`docs/TESTING.md` has everything. Essentials:

- Suites are plain node scripts: one process, one boot (`tests/lib/{hr,pg,c,mg}_boot.js`), `ok(name,cond)`, last line
  `N passed, M failed`, exit 1 on failure, skips as `(k skipped: reason)`.
- Paths only from `tests/lib/paths.js` (`BUILD`, `SRC`, `FIX`, `OUT`, `readSrc`). Never read outside the repo; write only
  under `out/`.
- Smokes: `stepper(base)` with strictly increasing timestamps (40-60 ms gaps; base >= 700000 for Malgorath), ~160
  warm-up frames, settle >= 25 frames after any teleport, purge hostiles before damage-sensitive phases, assert item
  totals not entity counts, never cache `V.P`, `boot.detClock(V)` for long timing-sensitive runs, seed `Math.random`.
- Commands: `npm run test:quick` (~45 s), `npm test` (~11 min), `npm run gate` (~20 min, run it in the background, never
  two heavy gates at once), one suite: `npm run build && node tests/<group>/<suite>.js`.
- og_trace compares the OG game with golden recordings; re-bless (`--bless <file> --reason "..."`) only for a deliberate
  OG change.

**Debugging protocol:** instrument, do not theorise past two guesses. Insert a temporary probe
(`if(typeof __xProbe!=='undefined')__xProbe({...});`), define `global.__xProbe` in the test, read the truth, then strip
every probe (grep `Probe` and `/*DBG*/`) before committing.

## 7. Browser QA

Your own Chrome on your own port (`tools/qa/chrome.sh <port> [profile]`, prints the PID to kill), your own server on
port+100 (`node scripts/serve.mjs --port <p>`, which sends no-store), the shared driver `tools/qa/lib/cdp.mjs` (mutes on
every document, freezes rAF so `frameStep` does not stack loops, points the brain at a dead port). Quick check: `node
tools/qa/boot_check.mjs --launch --port <p>` (starts and stops its own Chrome and server). Verify WebGL2 first; built-in
editor browser panes have none. Review frames as 5×6 contact sheets, not one image at a time. Put `tp:'og'` back at the
end.

## 8. Landmines (the top of `docs/LANDMINES.md`)

- `doUse` branch order: anything below the eat branch loses food to hunger.
- `explode(...,byMob)` must be `true` from mob sources or `mobGriefing` breaks.
- `storage.get` can reject on a missing key (the test stub does): always try/catch.
- Texture packs: every hook guarded, OG branch untouched character for character; never null `scene.fog`/`background`;
  light-count/shadow/tone-mapping changes only in enable/disable/setQuality; no THREE constructors, `Math.random`,
  `Date.now`, `performance.now` or `fetch` at update top level or on an OG per-frame path; exports in `TPEX`, never `TPX`.
- Purgatory: mobs never saved; all state in `MP`; timers on `MP.clock`.
- Creativity: works are 1/1, data is the item id, never a per-stack field, never duplicate a work in a rig.
- Malgorath: his entities route to `mgMobMesh`/`mgBrain`/`mgPreHurt` (always -1); spawn only via `mgSpawnBoss`; damage
  needs an attacker (`V.mgHitAs`); M1 owns every block write in the Bite; `BufferAttribute`, never
  `Float32BufferAttribute`, for geometry rewritten in place.
- Nobody can hear the game's audio: verify offline (`c2_audio`, `m2_audio`, the parity rigs).

## 9. Voice

Patch notes (top `PATCH_LOG` entry in `src/ui/p28_patch_notes.js`) are per-feature: confident, playful, a little absurd,
honest. Players no longer see them in game (the screen is retired); they become `CHANGELOG.md`, and the announcement adds
the test counts. Lines are single-quoted JS strings rendered as HTML: no raw `'`, `<` or `>`
(use `’`, `&#x27;`, `&lt;`, `&gt;`). The game is satire-friendly (the store sells "Remove Ads"; there are no ads), but
the engineering underneath is straight-faced. Keep both. `npm run changelog` turns released notes into `CHANGELOG.md`.

## 10. Where to look

| for | read |
|---|---|
| how a system works, where it lives | `docs/ARCHITECTURE.md` |
| what bit people before | `docs/LANDMINES.md` |
| build, guards, order files | `docs/BUILD.md` |
| suites, gate, writing tests, flakes | `docs/TESTING.md` |
| browser checks | `docs/QA.md` |
| art and repacking | `docs/ASSETS.md` |
| the AI brain | `docs/BRAIN.md`, `brain/README.md` |
| version bumps and releases | `docs/RELEASING.md` |
| where a pre-repository file went | `docs/LEGACY.md` |
| what is planned | `docs/ROADMAP.md` |
