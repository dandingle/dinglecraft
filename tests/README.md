# tests/

Every suite is one `node` process that boots the built game headless (stubbed DOM, canvas, THREE and storage) and prints
`N passed, M failed` as its last line (exit 1 on any failure). There is no test framework and no npm dependency.
The full guide is `docs/TESTING.md`; this page is the map.

## Running

```
npm run test:quick          repo checks, every *_static suite, test.js, the UI suites,     ~45 s
                            og_trace over
npm test                    every suite once (scripts/gate.mjs --once)                     ~11 min
npm run gate                the release gate: legacy repeats (smoke x6, botsmoke x3,       ~20 min
                            feature smokes x2); a green full gate writes out/gate_last.json
node scripts/gate.mjs --group malgorath --once      one group (CI runs one group per job)
node scripts/gate.mjs --only m4_hr.js,p7_hr.js      named entries
node scripts/gate.mjs --list                        what would run
node tests/malgorath/m4_hr.js                       one suite against the current build/
```

`out/gate_last.json` (full gate only) records `total` = `suites_total` (the suites under `tests/`) + `steps_total` (the brain and
tools self-tests). The gate builds first (`scripts/build.mjs --strict`). A single suite tests whatever is in `build/` (or `$DC_BUILD`), so run
`npm run build` after editing `src/`. Real-clock smokes budget chunk meshing by wall time: never run two heavy gates at once.

## Layout

| path | what |
|---|---|
| `gate.json` | the gate as data: groups, entries, repeats, clock kind, tiers, the legacy counts, the `added` suites (each with the release that added it and why), and the steps (the changelog check, the tools self-tests `tools/scan_selftest.mjs` + `tools/art/fal_selftest.mjs`, the secrets scan `tools/scan_secrets.mjs`, and the brain self-test when `brain/node_modules` exists) |
| `core/` | `stubs.js test.js smoke.js botsmoke.js`: the frozen quartet, byte-identical to the pre-split files (except `smoke.js`, whose Watcher check went with the Watcher in 6.8; `repo/r_gate.js` pins its new bytes). **Never edit them**: the gate copies them next to the built `game.js` and runs them there. New behaviour gets new suites. |
| `lib/` | `paths.js` (every path), the boot chain `hr_boot → pg_boot → c_boot → mg_boot`, the stub extensions `stubs_A/B/C.js`, `fake_assets.js`, `fake_models.js`, `real3.js`, the audio helpers `c2_dsp.js` `c2_fakeac.js`; for the Release 1.0 scans `repo_files.js` (the would-be-committed file list), `ipban.js` (the ROT13 banned list and its scanner), `jsprose.js` (string literals only, for prose terms), `hr_models_child.js` (builds the real Hyperreal models in a child process for `p8_recast`) |
| `texpacks/ purgatory/ creativity/ malgorath/` | the feature suites (`*_static`, `*_smoke`, `p4_boss`, `p5_bots`, `p7_hr`, `p8_saves`, `p8_recast`, `c2_audio`, `c3_found`, `m_harness`, `m2_fight`, `m2_audio`, `m3_model`, `m4_hr`, `og_trace`, `t?_real` against the bundled three.js) |
| `pilot/` | the honest speed-run pilot (`speedrun.js` + `pilot.js nav.js route.js boss_scripts.js`); the muted browser session in `tools/qa/` replays the same route |
| `repo/` | `r_build.js` (the build contract and v6.3 parity), `r_gate.js` (this directory's own contract), and the Release 1.0 scans `r_ipscan.js` (banned names; `--list`, `--decode`), `r_ipassets.js` (removed images), `r_other_ip.js` (the other IP fixes), `r_privacy.js` (personal data): `docs/TESTING.md` has the details |
| `ui/` | `u_scale.js`: the UI scale and the title menu (Release 1.0, gate group `core`); `u_title.js`: the 6.7 title and settings features (the saved-settings wait, the player's name, the menu music on the fake AudioContext, the rules editor, the pickup redraw, Malgorath's bar on a new world and on quit) |
| `fixtures/` | `shipped.json` (frozen versions), `og_trace/*.json` (golden digests), `v60_defs.json` (six ids carry their Release 1.0 names), `pages_fixture.json`, `p5_prompts_fixture.json`, `p7_hr_tiles_pg.json`; Release 1.0: `ip_banned.json` (the banned names, ROT13), `ip_denylist.json` (hashes of every removed v6.3 image), `recast_contract.json` (the v6.3 s fields per Hyperreal model) |

## The boot chain

```js
const boot=require('../lib/mg_boot.js');          // or hr_boot / pg_boot / c_boot
const V=boot({seed:1337});                         // V = window.__vox; one boot per process
const step=boot.stepper(700000);                   // frameStep with strictly increasing timestamps
boot.run(async()=>{ boot.ok('a check',cond); boot.skip('a check','why'); });
```

`boot.BUILD` is the build under test, `boot.SRC.<package>` the sources (`core world ent ui feat ai mg mgHr mgModels cr pg tex
models`), `boot.FIX` the fixtures, `boot.OUT` the only place a suite may write (`out/`, gitignored), and `boot.readSrc(path,
{legacy:true})` reads a package file without the build's `/* ---- PART NN: file ---- */` marker line (the text the pre-split
package file had). Prefer checks against the build; read `src/` only for rules about a package's own files.

## og_trace: golden digests

`texpacks/og_trace.js --golden fixtures/og_trace/<session>.json` runs a scripted 600-frame OG session (`over`, `purg`, `crea`,
`malg`) on the build and requires every digest (player, entities, chunk meshes, lights, scene graph, renderer state, THREE
constructor counts, random/clock call counts) to equal the golden, which was generated once from the legacy compiled-out
reference build at the v6.3 split (re-blessed since only for intended OG changes; see `docs/TESTING.md`). It proves Hyperreal does nothing to OG. A change that is MEANT to alter OG behaviour (or a
change to `core/stubs.js` or og_trace's instrumentation) re-blesses with `--bless <fixture> --reason "<why>"`; never bless to
turn a red run green. The fixtures are generated (one long JSON line each): never edit them by hand.

## Rules

- Mute: suites never create audio output (the audio suites render offline). Browser QA lives in `tools/qa/` and is always muted.
- Never print source text.
- Strictly increasing frame timestamps; settle 25 frames after a teleport; purge hostiles before damage-sensitive phases;
  assert item totals, not entity counts; never cache `V.P`; use `boot.detClock(V)` for fight-length suites.
- No network: `fetch` throws, the bot brain points at a dead port.
- A new suite goes in `gate.json` (`r_gate.js` fails on an unlisted one) with its repeat and clock kind.
