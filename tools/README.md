# tools/

Everything here is optional for playing, building and testing: the build and the gate need only Node. These are the
art pipeline, the secrets scan and the muted browser QA rigs. Paths are repo-relative or come from environment
variables (`.env.example` lists every name). Nothing here holds a key, and the paid tools refuse to run without a budget.

```
tools/
  scan_secrets.mjs  scan_baseline.json  scan_selftest.mjs   the secrets + privacy scan (npm run scan) and its allow-list
  scan_history.mjs                                         the same rules over the whole git history (npm run scan:history)
  hooks/   pre-commit  pre-push                            git hooks (npm run hooks): UTC commit dates + the scans
  grep-safe.sh                                             a recursive grep that skips build output and generated files
  lib/private_terms.cjs                                    loads the owner's private terms (local, untracked) for the scans
  assets/  unpack.mjs  repack.mjs                          packed art <-> the packers' generated scripts (npm run repack)
  art/     dcpaths.py  fal.mjs  fal_selftest.mjs           shared paths, the fal client (PAID), its free self-test
           title_pano.mjs                                  renders the title panorama's six faces from a world save (muted)
           meshes/     box_pack.mjs specs/                 boxes in, a packed WPN3D entry out (the snail, #14)
           texpacks/   pack_assets.py tex.py build_ent.py build_cloth.py clothlib.py wave.py
           malgorath/  pack_mg.py mg_art.py mg_post.py picks.json
           purgatory/  pglib.py run_wave.py mk_shotlists.py shotlists_w23.py post_*.py check_art.py install_art.py
                       review.py measure_bytes.py + the P6 json inputs (picks, tiles_pg, ents_pg, shotlist_w1-3)
  qa/      chrome.sh  boot_check.mjs  lib/{cdp,paths}.mjs  muted headless-Chrome rigs per feature + preview/ dev pages
  requirements.txt                                         Python pins for the art tools (not needed to build or test)
```

## The secrets scan (`npm run scan`)

Scans exactly the files git would commit (`git ls-files -co --exclude-standard`; before `git init` it uses a throwaway
probe repository in the OS temp folder). It prints `path:line rule` and never a matched value or a line's text.

- **Keys:** Anthropic, OpenAI, fal, ElevenLabs, AWS, GitHub, Google, Slack, JWT, PEM private keys, quoted
  `key/secret/token/password = "..."` values.
- **Privacy:** email addresses (reserved/test domains excepted), home-folder and temp-folder paths, and the owner's
  **private terms** (folder, project and company names) from a local list that is never committed:
  `tools/private_terms.local.txt` (gitignored), the file `DC_PRIVATE_TERMS_FILE` names, or `DC_PRIVATE_TERMS` (`;`
  separated). One entry per line, `#` comments, `re:` for a regular expression. Hits print as `private-term#<n>` (the
  entry's position), never the term. A term split into string pieces (`'ab' + '-cd'`, `['ab','cd'].join('-')`) is
  joined back and still caught. A clone without the list runs the generic rules only.
- **Forbidden files:** `.env*` (except `.env.example`), `*.env`, `.envrc`, brain data (`brain/data/`, `tokens.json`,
  `*.jsonl` logs), `node_modules/`, generated asset scripts (`*.gen.js`), source images (any PNG/JPEG except
  `assets/logo.png`), shipped `dinglecraft_v*.html`, key files, the art spend ledger (`costs.md`, `BUDGET`), the
  private-terms list, anything over 50 MB.
- **Image metadata:** WebP chunks other than `VP8`/`VP8L`/`VP8X`/`ALPH`, PNG `eXIf`/`tEXt`/`iTXt`/`zTXt`/`tIME`/`iCCP`,
  JPEG APP1/APP2/APP13/COM, GIF comment and application extensions (type names only).

`tools/scan_baseline.json` is the allow-list: rule + file + a hash of the line, never the line, each with a reason. A
finding outside it fails the scan. `--only <prefix>` limits the scan, `--json` prints a machine summary,
`--write-baseline` records the current findings (review what it prints, then fill in each `why`).
`node tools/scan_selftest.mjs` proves every rule fires on synthetic values (a private term is made up at run time) and
that no value is ever printed.

## The history scan (`npm run scan:history`)

`tools/scan_history.mjs` applies the same rules to everything a push would publish: every commit's author and committer
(a placeholder or noreply address, and a `+0000` zone: a local offset says where and when someone works), signature
headers, every message, every ref name, every path ever committed and every blob reachable from any ref. `--range A..B`
limits it to what a push adds; the pre-push hook passes exactly that.

## Git hooks (`npm run hooks`)

`npm run hooks` sets `core.hooksPath` to `tools/hooks/` (once per clone). `pre-commit` refuses a commit whose author or
committer date is not in UTC or whose email is not the placeholder or a GitHub noreply address (commit with
`TZ=UTC0 git commit ...`), then runs `npm run scan`. `pre-push` runs `npm run scan:history --range <remote>..<local>`.

## `tools/grep-safe.sh`

`tools/grep-safe.sh <pattern> [path...]` is `grep -rnI` without `.env` files and the private-terms list (it refuses to
search either by name), brain data, `build/`, `dist/`, `out/` (copies of `src/`, megabytes wide), generated assets, the
og_trace fixtures (generated digests, one long line each), `node_modules` and `.git`. Extra flags:
`GREP_FLAGS="-l -i" tools/grep-safe.sh foo`.

## The packed art (`npm run repack`)

The committed art is `assets/packed/` (one `.webp` per texture plus small sidecars); `npm run build` reassembles the
embedded scripts from it byte for byte. The source PNGs are not in git (about 850 MB for the minimum set): they live in
art "workspaces" you point at with environment variables:

| variable | the workspace | used by |
|---|---|---|
| `DC_ART_SRC` | Hyperreal: `final/` (tile maps + `tiles.json`), `final_ent/` (entity maps), `raw/` (fal outputs) | pack_assets, texpacks + purgatory tools |
| `DC_MG_ART_SRC` | Malgorath: `final/` (the packed maps), `raw/`, `sheets/` (`ref/` for one rig) | pack_mg, mg_art, mg_post |
| `DC_PG_ART_SRC` | Puppet Purgatory: `staged/`, `sheets/`, `masks/` (default `out/art/purgatory/`) | purgatory tools |

```
python3 -m pip install -r tools/requirements.txt                 # once (Pillow 12.3.0, numpy 2.4.6)
DC_ART_SRC=... DC_MG_ART_SRC=... npm run repack                  # both sets -> assets/packed/
npm run repack -- --only hr --src <hyperreal workspace>          # one set
npm run repack -- --dest /some/scratch/packed                    # dry run: compare before you commit
```

`repack.mjs` runs the Python packers into a temp folder, unpacks their output into a staging copy of `assets/packed/`,
re-assembles it with the build's own assembler (it must reproduce the packers' bytes and the manifests' sha1s exactly) and
only then moves it into place. It prints which payloads are new, changed or gone. The pinned toolchain reproduces the
committed bytes; another Pillow/libwebp makes a valid but different pack, which changes the html: bump the version first
(`npm run bump`), because shipped versions are frozen.

Checks without encoding: `python3 tools/art/texpacks/pack_assets.py --check` (the build's `hr_assets.gen.js` + the
committed manifest against the workspace PNGs, needs `DC_ART_SRC`) and `python3 tools/art/malgorath/pack_mg.py --check`
(re-encodes in memory, compares with the build's `mg_assets.gen.js`). Both need `npm run build` first.

The first line of each pack header names the tool that wrote it. A pack written before the move into this repository
names the tool's pre-repo path; a repack (always at a version bump) rewrites it with the repo path.

## The fal client and the art drivers (PAID)

`tools/art/fal.mjs` is the only file that reads `FAL_KEY` and the only one that calls fal. Every driver (`mg_art.py`,
`run_wave.py`, `wave.py`) goes through it.

- **Key (bring your own):** the `FAL_KEY` environment variable, else the file `DINGLE_ENV_PATH` names, else the repo
  `.env`. A missing key is reported by name; the value is never printed.
- **Budget (fail closed):** the ledger folder is `FAL_LEDGER_DIR` (default `.art-ledger/`, gitignored) holding `costs.md`
  (one line per call) and `BUDGET` (USD). Without `BUDGET`, `FAL_BUDGET_USD` is the cap; with neither, nothing runs. A call
  that would pass the cap is refused. To continue an existing ledger, point `FAL_LEDGER_DIR` at its folder.
- `node tools/art/fal_selftest.mjs` checks the key order and the budget guard for free (no network, fake keys, temp
  folders; it never runs the client).

The texpacks/purgatory/malgorath scripts are the v6.0-v6.3 pipelines, ported with their paths remapped: the decision files
(picks, recipes, shot lists) are committed beside them, the images stay in the workspaces. `install_art.py` now finishes
with `npm run repack -- --only hr` (it also copies the updated `tiles.json` into `assets/pack-inputs/`).
Not ported: `p7_pack.py` (v6.1's staged-art swap through a mirrored legacy layout; `install_art.py` + `npm run repack`
replace it).

## Muted browser QA (`tools/qa/`)

The rigs drive a real headless Chrome with WebGL. **They are always muted**: Chrome runs with `--mute-audio`, every page
gets `vx_vox_settings` merged with `{snd:0, mus:0, tp:'og'}` before the game runs, every evaluation sets `soundOn=false`
and suspends `AC`, `requestAnimationFrame` is disabled (only `__vox.frameStep` moves the game), and the brain URL points at
a dead port. Never turn sound on in a browser: the audio is checked offline (`mz_audio_parity.mjs`, `cz_audio.js`).

```
npm run build
node tools/qa/boot_check.mjs --launch --port 9397          # own Chrome + server, OG + Hyperreal, then stops both
```

For the other rigs start your own Chrome and server, one pair per person/agent, on your own ports:

```
tools/qa/chrome.sh 9397                                    # prints the Chrome PID (profile in out/qa/, gitignored)
node scripts/serve.mjs --port 9497 &                       # the repo root, no-store caching
node tools/qa/creativity/c1_paint_qa.mjs --port 9397       # --server defaults to port+100, --build to dist/dinglecraft_v<VER>.html
kill <chrome pid> <server pid>
```

| area | rigs | kind |
|---|---|---|
| any | `boot_check.mjs` | load, WebGL2, version, OG world, Hyperreal, back to OG, zero console errors |
| creativity | `crea_qa.mjs`, `c1_paint_qa.mjs`, `c2_qa.mjs`, `cz_qa.mjs` (`--build`, `--out`) | CDP rigs, shots + `summary.json` |
| creativity | `cz_audio.js <disc.json>` (`DC_BUILD`), `release_qa.mjs` + `release_sheet.py` | offline audio / the release smoke (current version and label) |
| malgorath | `mz_qa.mjs --pack og\|hr`, `mz_reload.mjs`, `mz_audio_parity.mjs`, `m1_bite_qa.mjs`, `m3_form/m3_game/m3_scenes.mjs`, `m4_hr_qa.mjs` | CDP rigs + sheet scripts |
| purgatory | `entry_rig`, `items_rig`, `items_world_rig`, `bots_rig`, `play_session` (`<build-url> <outDir> [port]`), `cdp_pg.mjs`, `photo_pg.js`, `cast_pg.js`, `boss_rig.js` | CDP rigs; `play_session` loads the pilot from `/tests/pilot/` |
| in-page | `texpacks/{og_parity,photo_rig,tB_browser,tC_browser}.js`, `purgatory/p7_{boss_hr,perf,pg_parity}.js` | `(0,eval)(await (await fetch('/tools/qa/<area>/<file>')).text())` in a muted page |
| preview | `preview/diorama.html?art=<url>`, `preview/pg_hr_preview.html?art=<url>&pg=<url>` | dev pages; serve your art workspace and pass its URL |

Outputs default to `out/qa/<rig>_<time>/` (gitignored). `vx_vox_settings` is shared by every page on an origin, so the
rigs put `tp:'og'` back at the end of a Hyperreal session. Since Release 1.0 no rig check is pinned to an old release:
`cz_qa` and `release_qa` read the current version and label, and `m4_hr_qa`'s thresholds were recalibrated on v6.3 and
game 6.4 ([docs/QA.md](../docs/QA.md)). Not ported:
`pix_a0.js` + `pix_compare.sh` (they compare against the shipped v6.0 html).
