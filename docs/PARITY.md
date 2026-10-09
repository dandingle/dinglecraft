# Parity: proof that the move into this repo lost nothing

Until v6.3, DINGLECRAFT was built by a "splice" pipeline: a frozen v5.8 base file plus five stages of text-substitution
hooks and appended PARTs. This repository replaces it with real per-system source files, with every hook folded in as
ordinary code. The question that matters is whether anything changed on the way. The answer is no, and this page is the
proof.

## The gold standard

The repo's build must reproduce the shipped `dinglecraft_v6.3.html` **byte for byte**. If every byte is the same, the game
is the same, by definition.

| artifact | bytes | md5 |
|---|---:|---|
| `head.html` | 135,992 | `faf27193fabebc884bdff9e674057626` |
| `game.js` (41,029 lines) | 3,132,960 | `5dc3aa02237e576d38f899b9ca075f48` |
| `hr_assets.gen.js` | 37,416,630 | `38bd50ae6fd470cb44960d5a5bc5f2b0` (sha1 `1151313c5fd5e9c666bf221c2bae0a95512d0078`) |
| `mg_assets.gen.js` | 2,300,478 | `9868882be40ed21d30145ff1834e0931` (sha1 `f2d901f4639900b0a54b62876c7a71bad4ffa359`) |
| `hrassets.js` = hr + mg | 39,717,108 | `c114d5a60c216360aab548f513b7d4de` |
| `tail.html` | 26 | `6ad4ea15127078e6949350f7e3821449` |
| **`dinglecraft_v6.3.html`** | **42,986,086** | **`e0d781ad02350580f027d9452ba67e28`** |
| `assets/logo.png` (decoded from the old head) | 61,174 | `61750bad6396d9678fca02be6cc319f0` |
| PARTs 47-50, the horror block (game.js lines 11496-11933) | 17,222 | `23a6bf8b3af9e3fdc4deceb639cd03c1` |
| `src/features/part47.js` / `part48.js` / `part49.js` / `part50.js` | 5,272 / 5,021 / 2,087 / 4,842 | `246c2124…` / `6cc6fc1f…` / `6b02ac65…` / `3323b4b0…` |

**Result at the split (2026-10-08):** `npm run build` printed all of these, and `cmp` of `dist/dinglecraft_v6.3.html`
against the shipped file was silent. Each part also matched its legacy file under `cmp`. The build took under a second.

## Reproduce it yourself

**The v6.3 proof is historical.** It was measured on the pre-release tree on the day of the split (2026-10-08): there,
`npm run build` wrote `dist/dinglecraft_v6.3.html` with md5 `e0d781ad02350580f027d9452ba67e28` and `cmp` against the
shipped file was silent. That tree is not public. This repository's history starts at Release 1.0, whose sources build
later game versions (Release 1.0 recast the purgatory dimension and replaced art and names on purpose), so a clone cannot
rebuild v6.3. The record stays here and in `tests/fixtures/shipped.json`.

**The check you can run today** is the same kind of proof for any release: check out its tag and build.

```
git checkout release-1.0                   # or v<game version>
npm run build                              # prints FROZEN v<VER>: byte-identical to the shipped file
md5sum dist/dinglecraft_v<VER>.html        # macOS: md5 -r ...; compare with tests/fixtures/shipped.json
node tests/repo/r_build.js                 # the repo checks (build twice, every pin)
```

The build compares the html with `tests/fixtures/shipped.json`. Because shipped versions are frozen
([RELEASING.md](RELEASING.md)), that check stays meaningful: a released version's sources can never drift without the
build saying so. (Between releases, `main` builds the next, unshipped version and says so.)

Holding md5 parity on every machine depends on two settings that must not change: `.gitattributes` (`* -text`, so git
never rewrites line endings) and `.editorconfig` (no trailing-whitespace trimming, no added final newlines).

## The test suites, before and after

Every legacy suite moved into `tests/` and runs against the repo's build. The core quartet (`tests/core/`) is
byte-identical to the legacy files:

| file | bytes | md5 |
|---|---:|---|
| `stubs.js` | 10,664 | `e2be2e4ef146026285c55641a1e007c6` |
| `test.js` | 12,036 | `85d8df887b9429546693add63f898876` |
| `smoke.js` | 62,246 | `81986500187de6aab529a3afea713bdb` |
| `botsmoke.js` | 72,130 | `3f613a13692b6ddb1c8448f217c8f25b` |

Counts per suite. "Legacy" is one green pass of the old gate on v6.3 (2026-10-08). "Expected" is the plan after retiring
the splice-only checks (below). "Repo" is the measured count from the repo's gate.

| suite | gate repeats | legacy | expected | repo |
|---|---:|---:|---:|---:|
| `r_build` (new) | 1 | - | new | 61 <!-- counts:r_build --> |
| `r_gate` (new) | 1 | - | new | 38 <!-- counts:r_gate --> |
| `test.js` | 1 | 69 | 69 | 69 <!-- counts:test --> |
| `smoke.js` | 6 | 221 | 221 | 221 <!-- counts:smoke --> |
| `botsmoke.js` | 3 | 199 | 199 | 199 <!-- counts:botsmoke --> |
| `t0_static` | 1 | 101 | 101 | 101 <!-- counts:t0_static --> |
| `tA_static` | 1 | 47 | 47 | 47 <!-- counts:tA_static --> |
| `tB_static` | 1 | 49 | 49 | 49 <!-- counts:tB_static --> |
| `tC_static` | 1 | 101 | 101 | 101 <!-- counts:tC_static --> |
| `t0_smoke` | 2 | 55 | 55 | 55 <!-- counts:t0_smoke --> |
| `tA_smoke` | 2 | 62 | 62 | 62 <!-- counts:tA_smoke --> |
| `tB_smoke` | 2 | 84 | 84 | 84 <!-- counts:tB_smoke --> |
| `tC_smoke` | 2 | 93 | 93 | 93 <!-- counts:tC_smoke --> |
| `p_static` | 1 | 68 | 41 | 41 <!-- counts:p_static --> |
| `p2_static` | 1 | 51 | 51 | 51 <!-- counts:p2_static --> |
| `p0_smoke` | 2 | 119 | 115 | 115 <!-- counts:p0_smoke --> |
| `p1_smoke` | 2 | 142 | 142 | 142 <!-- counts:p1_smoke --> |
| `p2_smoke` | 2 | 137 | 137 | 137 <!-- counts:p2_smoke --> |
| `p3_smoke` | 2 | 165 | 165 | 165 <!-- counts:p3_smoke --> |
| `p4_smoke` | 2 | 37 | 37 | 37 <!-- counts:p4_smoke --> |
| `p4_boss` | 2 | 133 | 133 | 133 <!-- counts:p4_boss --> |
| `p5_bots` | 2 | 80 | 80 | 80 <!-- counts:p5_bots --> |
| `p7_hr` | 1 | 118 | 118 | 118 <!-- counts:p7_hr --> |
| `speedrun --fast --to=auto` | 1 | 53 | 53 | 53 <!-- counts:speedrun --> |
| `c_static` | 1 | 43 | 32 | 32 <!-- counts:c_static --> |
| `c1_static` | 1 | 35 | 35 | 35 <!-- counts:c1_static --> |
| `c2_static` | 1 | 28 | 28 | 28 <!-- counts:c2_static --> |
| `c0_smoke` | 2 | 114 | 113 | 113 <!-- counts:c0_smoke --> |
| `c1_smoke` | 2 | 82 | 82 | 82 <!-- counts:c1_smoke --> |
| `c2_smoke` | 2 | 65 | 65 | 65 <!-- counts:c2_smoke --> |
| `c2_audio` | 1 | 48 | 48 | 48 <!-- counts:c2_audio --> |
| `m_static` | 1 | 62 | 44 | 44 <!-- counts:m_static --> |
| `m1_static` | 1 | 35 | 35 | 35 <!-- counts:m1_static --> |
| `m2_static` | 1 | 30 | 30 | 30 <!-- counts:m2_static --> |
| `m3_static` | 1 | 24 | 24 | 24 <!-- counts:m3_static --> |
| `m0_smoke` | 2 | 51 | 49 | 49 <!-- counts:m0_smoke --> |
| `m1_smoke` | 2 | 54 | 54 | 54 <!-- counts:m1_smoke --> |
| `m2_smoke` | 2 | 67 | 67 | 67 <!-- counts:m2_smoke --> |
| `m3_smoke` | 2 | 42 | 42 | 42 <!-- counts:m3_smoke --> |
| `m_harness` | 1 | 8 | 8 | 8 <!-- counts:m_harness --> |
| `m2_fight` | 1 | 35 | 35 | 35 <!-- counts:m2_fight --> |
| `m2_audio` | 1 | 30 | 30 | 30 <!-- counts:m2_audio --> |
| `m3_model` | 1 | 34 | 34 | 34 <!-- counts:m3_model --> |
| `m4_hr` | 1 | 68 | 68 | 68 <!-- counts:m4_hr --> |
| og_trace `over` | 1 | 31 | 31 | 31 <!-- counts:og_over --> |
| og_trace `purg` | 1 | 29 | 29 | 29 <!-- counts:og_purg --> |
| og_trace `crea` | 1 | 29 | 29 | 29 <!-- counts:og_crea --> |
| og_trace `malg` | 1 | 27 | 27 | 27 <!-- counts:og_malg --> |
| og_trace `nopurg` / `nocrea` / `nomalg` | 1 each | 31 / 31 / 31 | retired | - |
| **total, one pass** | | **3,348** | **about 3,230** | **3,291** <!-- counts:total --> |
| `brain/selftest.mjs` (a gate step when `brain/node_modules` exists) | | 168 | 168 or more | 182 <!-- counts:brain --> |

Any difference between "expected" and "repo" that is not explained below is a defect.

**Measured 2026-10-08** by a full `npm run gate` (`out/gate_last.json`: html md5 `e0d781ad02350580f027d9452ba67e28`, v6.3,
node v22.23.1): every suite green, 3,291 distinct checks in the game suites, 3,548 with the
self-test steps (brain 182, scan 52, fal 23), 6,626 executed with repeats, 1,064 s.

Every "repo" count equals its "expected" count. How the totals add up:

- 3,291 = 3,348 legacy - 63 retired checks - 93 retired og_trace parity checks (3 sessions x 31) + 99 new
  (r_build 61, r_gate 38).
- The 63 retired checks: `p_static` 27, `p0_smoke` 4, `c_static` 11, `c0_smoke` 1, `m_static` 18, `m0_smoke` 2 (see
  "What was retired" below). A check-by-check comparison of the check names, legacy against repo, shows only these.
- The "about 3,230" estimate assumed about 40 new checks; the new repo checks came to 99.
- `tA_static` stays at 47: 2 checks were converted to read the committed manifests. With `DC_ART_SRC` set it runs
  one extra check (the full source-art re-hash, 48); without it the suite reports 1 skipped.
- Skips are reported by the suites themselves. Apart from `tA_static`'s (above), they are the same as in the legacy
  gate: `p4_smoke` 1, `p5_bots` 1, `m0_smoke` 1, `m2_fight` 2, `m4_hr` 1. The three `t?_real` suites skipped then (three.js
  was not vendored yet); since game 6.7 they run against the bundled file.
- The brain self-test grew from 168 to 182: 14 new checks for the repo-relative defaults and the key lookup order.
  It and the two tools self-tests are gate steps, not game suites, so they are outside the 3,291.

<!-- counts:notes -->

## Release 1.0 (game v6.4): what changed in the tests

Everything above is the record of the split: **v6.3 parity was proven there**, byte for byte, and that proof does not need
redoing. Release 1.0's preview is game version 6.4 and changes the game's output on purpose (the IP clean-up, the bigger UI),
so it is not a parity release. What it changed in the test suite:

- **The md5 pins on PARTs 47-50 moved once**, for `part48.js`: one count-checked privacy edit; the other three files did
  not change. (Those pins, and the rule that kept the four files unread, were dropped in v6.8.)
- **New suites**, each listed in `tests/gate.json` under `added` with its reason:

  | suite | group | checks |
  |---|---|---:|
  | `r_ipscan` (banned names, whole repo + build) | repo | 21 |
  | `r_ipassets` (removed images stay removed) | repo | 20 |
  | `r_other_ip` (the other IP fixes, on the build) | repo | 38 |
  | `r_privacy` (no personal data, repo + build) | repo | 29 (26 outside a git checkout: no identity and history checks) |
  | `u_scale` (UI scale, title menu, HUD layout) | core | 56 |
  | `p8_saves` (old saves load after the recast ids) | purgatory | 29 |
  | `p8_recast` (the recast by name, shape, colour and animation contract) | purgatory | 37 |

- **Counts that moved:** `tC_static` 101 -> 97 (no Hyperreal villager model), `r_build` 61 -> 55 while 6.4 was unshipped (no
  frozen-version checks), then 62 once Release 1.0 was recorded in `shipped.json` (so a gate run after the release counts
  3,780, seven more than the 3,773 the release gate measured), `r_gate` 38 -> 39, the brain self-test 182 -> 186 (no media
  route). Every other suite kept its count: the old names in labels and pins were replaced, not removed.
- **The release audit's fixes** (before the history was cut): the Hyperreal boomer's gunpowder sac (`boomer_core`) was
  repainted from scratch (it was the old creeper-core texture under a new name, and still showed the old face shape) and
  the old sac's hashes went into `ip_denylist.json` (`r_ipassets` 19 -> 20); the HUD layout (`hudLayout`: toasts clear
  of menus, F3 and the player list clear of the HUD) got 10 checks in `u_scale` (46 -> 56), and the browser rig
  `tools/qa/ui/ui_qa.mjs` now shows a toast over every title view and menu and counts F3 and the player list in its
  overlap pairs.
- **Fixtures regenerated from the cleaned build:** `pages_fixture.json` (from the new `PURG_PAGES`), `p5_prompts_fixture.json`
  (from the new `brain/prompts.mjs`), `v60_defs.json` (six ids carry their Release 1.0 names: Skyhoney Ore, the Critter Jar,
  the Nuke Keg eggs, the Fortune Orb). `p7_hr_tiles_pg.json` needed no change (no tile flag changed in the repack).
- **New fixtures:** `ip_banned.json` (the banned names, ROT13), `ip_denylist.json` (sha1/sha256 of every removed v6.3 image,
  written by the art lane before any art changed), `recast_contract.json` (the v6.3 s fields per Hyperreal model).
- **og_trace:** `purg` was re-blessed twice with reasons stored in the fixture (the renamed internal ids; the recast OG
  meshes on the purgatory path), each time after proving the first divergence came only from the intended change. `over`,
  `crea` and `malg` never changed. The mutation proof was re-run on the new golden: one OG constant changed in a scratch copy
  of the build still fails `over` (23 passed, 8 failed, first divergence at digest 8) and a purgatory constant fails `purg`.
- **Measured** by the release gate (`npm run gate`) on the Release 1.0 tree: 3,512 checks in the game suites plus
  261 in the brain and tools self-tests, 3,773 in all (6,851 executed: the smokes repeat), every suite green,
  on the released file `dinglecraft_v6.4.html`, 40,056,521 bytes, md5 `6c4e787a49eb70066e5cee058c991b2b` (recorded in `tests/fixtures/shipped.json`:
  from now on game 6.4 is frozen like every shipped version).

## Release 1.0 (game v6.7): what changed in the tests

- **New suite** `tests/ui/u_title.js` (core group, quick tier; 31 checks): the title waits for the saved settings (the
  name prompt and the boot music), the player's name (`pnValid`, the `pn` round trip, `pnText` in any case but never the
  "Dan Dingle" credit, `pnBack`), the menu music on the recording fake AudioContext, the World Music label and the 6.7 Help
  rows, no toast push, the rules editor, the pickup redraw and Malgorath's bar on a new world and on Save & Quit. Its
  regression proof: with the four fixes reverted in a scratch copy of the build, 7 of its checks fail.
- **The real-three suites run** against the bundled `assets/vendor/three.r128.min.js`: `tA_real` 7, `tB_real` 26,
  `tC_real` 49 (the minified r128 spells `TEXTURE_2D_ARRAY` as `35866`, which `tA_real` now accepts).
- `c3_found` (37) arrived with 6.7 itself. `r_build` 55 -> 58 (the release-label rule), `r_privacy` 29 -> 31 (a private
  term made up at run time; the base64 mask keeps paths visible), the scanner self-test 52 -> 67 (private terms, split
  literals, the new file and image rules, commit identities).
- `tests/lib/c2_fakeac.js` nodes carry `.context` (non-enumerable), as browser audio nodes do.

## Release 1.0, the final cut (game v6.8): what changed in the tests

- **The opaque-file pins are retired** (the owner lifted the secrecy). `r_build` 58 -> 53 (5 pin checks out, a
  `.gitattributes` check in), and `r_ipscan` 21 -> 19 and `r_privacy` 31 -> 29 (the count-only opaque checks are gone,
  because PARTs 47-50 are now scanned like every other file). The static suites (`c_static`, `m_static`, `p_static`,
  `p8_recast`) swapped their pin check for "PARTs 47-50 are in the build verbatim, once, in order", so their counts held.
- **The Watcher and the Reaper were removed.** `smoke.js` 221 -> 220: its Watcher check went with the Watcher, and
  `r_gate.js` pins the edited file. `r_other_ip` 38 -> 37: 14 WPN3D entries now, and the twin's old outfit colours, which
  became visible to the scan, were recoloured.
- `og_trace` `over`, `crea` and `malg` were re-blessed once. Proven sole cause: the two removed spawn rolls.
- `m2_fight` (35): the honesty check now gives each impact one owner, so drawings that a death reset sweeps away on the
  killing frame no longer count as landed. The v6.7 run passed only because real Watchers and a Reaper spawned during the
  scripted fight and changed its course.
- Gate total: 3,932 checks (suites 3,656 + tools 276), down from 3,943 at game 6.7.

## Release 1.0, game v6.9 (replays): what changed in the tests

- The Controls screen is controls only, and Credits has its own title screen. `u_title` swapped its three Help-blurb
  checks for three new ones: Controls-only plus the F8 row, the Credits view, and the menu order with no world count.
  The menu-music fade target moved from 0.55 to 0.275. `m_static`, `t0_static` and `p_static` now assert that the
  removed feature rows are gone, so their counts held.
- `r_build` 53 -> 54 and `r_ipscan` 19 -> 20 (the play file `DINGLECRAFT.html`). The replays are fully inert while idle,
  so all four `og_trace` goldens match unchanged (no re-bless).
- Gate total: 3,934 checks (suites 3,658 + tools 276).

## What was retired, and why

Some legacy checks proved properties of the splice pipeline itself. With no splice, there is nothing for them to check.

- **Hook-anchor proofs** (`anchors.py`, `m_anchors.py` and the `c_static`/`m_static` checks that ran them): they proved
  every hook's anchor text was unique and far from PARTs 47-50. There are no anchors any more: the hooks are folded
  in.
- **Hook-file counts** (`p_static` 39-44, `c_static` 30, `m_static` 37-38): they parsed the `hooks_*.py` files to prove
  every replacement was present exactly once. The replacements are now just code, covered by the suites that exercise
  them.
- **Stub bisect files** (`p_static` 13-33, `c_static` 32-37, `m_static` 44-55): the `_stub/` files let the old pipeline
  build a variant with one package stubbed out. Folded sources cannot produce those variants, so the stubs were not
  imported.
- **Identity smokes** (`p0_smoke` 4 checks, `c0_smoke` 1, `m0_smoke` 2): each rebuilt an older version with a stage
  switched off and compared it with the shipped file. They are replaced by one stronger check: the whole v6.3 html is
  byte-identical, and shipped versions are frozen.
- **og_trace parity sessions** `nopurg`, `nocrea`, `nomalg`: they compared two compiled-out reference builds with each
  other, which cannot change after the split. Their last green run was the legacy gate of 2026-10-08 (31 checks each).
- **og_trace's live reference build**: it compiled a variant with the texture packs removed and compared digests with
  the real build. It now compares the real build with **golden recordings** made once from that variant at the split
  (`tests/fixtures/og_trace/`). What is lost is the "compiled out" baseline: the claim becomes "OG is unchanged unless
  someone deliberately re-blesses the recording", which is still a strong tripwire. The acceptance of this move includes
  a mutation test: change one OG constant in a copy of the build, and og_trace must fail with a first divergence, while
  the untouched build passes all four sessions.
  **Result:** in a scratch copy of the build, one byte of an OG constant (the zombie's speed, 1.0 to 1.1) was changed,
  located by line number well outside PARTs 47-50. og_trace `over` failed (23 passed, 8 failed, "first divergence
  at digest 8"), `malg` (a session with no zombie) still passed 27/27, and the untouched build passed all four sessions.
  The repository setup ran this proof twice, independently, with the same result. <!-- counts:mutation -->

## What was converted

- The three checks that compared PARTs 47-50 with an older shipped file (`p_static` 45, `c_static` 31, `m_static` 43)
  became one hash pin, checked by the build and the statics until v6.8, when the pin was dropped.
- Checks that read the old release script's text (`p_static` 60-61, `c_static` 42-43, `m_static` 61-62) now read
  `scripts/guards.json` and `tests/gate.json`.
- Checks that needed the 1 GB of source PNGs (`tA_static` 41-47, `p7_hr` 76-78, `m4_hr` 13) now read the committed
  manifests and `assets/pack-inputs/`. The full source-art re-hash still runs when `DC_ART_SRC` is set.

## Things the split deliberately did not fix

Every byte of v6.3 is frozen, so a few known leftovers stay until the first post-split version (see
[ROADMAP.md](ROADMAP.md)): legacy path comments in the code and in the asset headers, an in-game hint that names the old
project folder, and a small metadata chunk in the logo PNG. Release 1.0 (game 6.4) cleared the hints, the logo chunk, the
asset headers and the code comments, and game 6.7 took the old folder layout out of the docs (the art
workspaces are named by their environment variables only). What still mentions the pre-repository layout is the
legacy-path mapping in `tools/art/dcpaths.py` and the frozen `tests/core/smoke.js`; neither is a personal path
(`tests/repo/r_privacy.js` would fail on one).
