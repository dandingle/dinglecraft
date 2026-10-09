# Testing

DINGLECRAFT has 3,658 distinct automated checks in its game suites (Release 1.0, game 6.9; 3,656 at game 6.8, 3,667 at
game 6.7, 3,512 at game 6.4, 3,291 at v6.3), plus 276 in the brain and tools self-tests, and no test framework. Every suite is a plain Node script that
boots the real built `game.js` against headless stubs (a fake DOM, canvas, WebGL, audio and storage), plays it, and
prints `N passed, M failed`. Nothing touches the network and nothing makes a sound.

## Running

```
npm run test:quick         # about 45 s: build, the repo checks, every static suite, test.js, the UI suites, one og_trace session
npm test                   # about 11 min: build, every suite once
npm run gate               # about 20 min: the release gate, smokes repeated (smoke.js x6, botsmoke.js x3, feature smokes x2)
npm run test:brain         # the brain's self-test (needs `npm ci --prefix brain` once)
```

`scripts/gate.mjs` reads `tests/gate.json` and:

1. builds with `--strict` (a shipped version that no longer matches its bytes stops everything);
2. copies the frozen core quartet (`tests/core/`) into the build folder, because those suites load `./game.js` from
   their own folder;
3. runs the suites in gate order, printing `name: <last line>` for each;
4. on a failure prints only the `FAIL`/`CRASH`/`Error`/`first divergence` lines (at most 40) and `GATE FAILED at <name>`;
5. after a **full** green gate (no `--once`, `--tier`, `--group` or `--only`) writes `out/gate_last.json` (the html
   md5, version, counts per suite, total, time), which `npm run release` requires. A failed full gate deletes it.

Options (the header of `scripts/gate.mjs` has the full list):

| option | what |
|---|---|
| `--once` | every suite once (what `npm test` does) |
| `--tier quick` | the quick tier (what `npm run test:quick` does) |
| `--group G[,G]` | only these groups: `repo`, `core`, `texpacks`, `purgatory`, `pilot`, `creativity`, `malgorath`, `og_trace` (CI runs one group per job) |
| `--only NAME[,NAME]` | only these entries, by their gate name (for example `smoke.js,m4_hr.js`) |
| `--keep-going` | report every failure instead of stopping at the first |
| `--jobs N` | run up to N static and fake-clock suites at once; real-clock smokes always run alone, because CPU load changes what they see |
| `--no-build` | test the existing build instead of building first |
| `--list` | print what would run, and exit |

**One suite by hand:** build first, then run the file. Suites test `$DC_BUILD` if it is set, else `build/`.

```
npm run build
node tests/purgatory/p2_smoke.js
node scripts/build.mjs --out out/my-build --dist out/my-build && DC_BUILD=out/my-build node tests/malgorath/m1_static.js
```

Outputs (boss logs, speed-run records) go to `out/` (or `$DC_OUT_DIR`). Nothing writes into the source tree.

## The suites

| group | suites | what they cover |
|---|---|---|
| repo | `tests/repo/r_build.js`, `r_gate.js`, and the Release 1.0 scans `r_ipscan.js`, `r_ipassets.js`, `r_other_ip.js`, `r_privacy.js` (below); steps: `changelog --check`, `tools/scan_selftest.mjs`, `tools/art/fal_selftest.mjs` (key variables unset, network blocked), `tools/scan_secrets.mjs`, and the brain self-test when `brain/node_modules` exists | the build contract, parity, order files, markers, version sites, guards, asset hashes, hygiene; every suite listed in `gate.json`; no banned name, removed image, other-IP leftover or personal data anywhere; the changelog is current; the scanners work and the would-be-committed files have no secrets or personal paths. Every suite and step except the brain self-test is also in the quick tier |
| core | `tests/core/test.js`, `smoke.js`, `botsmoke.js`; `tests/ui/u_scale.js`, `tests/ui/u_title.js` | the original game's logic (ids, tables), a full-simulation smoke of a real world, and the AI players (seeded, fake clock); the UI scale and the title menu (Release 1.0) |
| texpacks | `t0_static`, `t0_smoke`, `tA_*`, `tB_*`, `tC_*`, and `t?_real` (against the bundled three.js r128) | the texture-pack contract, world and assets, light and post, the cast |
| purgatory | `p_static`, `p2_static`, `p0`-`p4_smoke`, `p4_boss`, `p5_bots`, `p7_hr`, `p8_saves`, `p8_recast` | Puppet Purgatory, its headliners, the bots inside, its Hyperreal cast; old saves after the Release 1.0 recast, and the recast itself |
| pilot | `tests/pilot/speedrun.js --fast --to=auto` | an honest test pilot plays purgatory from the door to the EXIT with no free items |
| creativity | `c_static`, `c1_static`, `c2_static`, `c0`-`c2_smoke`, `c2_audio`, `c3_found` | easels, paintings, record players, jukeboxes; an offline "ear" that measures every note; Dan's found works as rare loot (the seeded 1-in-40 roll, minting, caps, saves) |
| malgorath | `m_static`, `m1`-`m3_static`, `m0`-`m3_smoke`, `m_harness`, `m2_fight`, `m2_audio`, `m3_model`, `m4_hr` | the Bite, the fight (a skilled pilot must win, a careless one must lose), audio, the model, Hyperreal |
| og_trace | `tests/texpacks/og_trace.js --golden tests/fixtures/og_trace/<session>.json` for `over`, `purg`, `crea`, `malg` | proves the OG game has not changed: a scripted 600-frame session's digests must match a golden recording |

Per-suite check counts, before and after the move into this repo, are in [PARITY.md](PARITY.md).

### The frozen core quartet

`tests/core/stubs.js`, `test.js`, `smoke.js` and `botsmoke.js` are byte-identical to the files the game was developed
against for most of its history (one owner-made exception: in 6.8 `smoke.js` lost its Watcher check when the Watcher was
removed; `tests/repo/r_gate.js` pins its new bytes). **Never edit them.** New behaviour gets new suites. If a new feature needs a THREE or DOM method the
stubs lack, add it in a feature stub (`tests/lib/stubs_X.js`, which only adds what is missing) or make the game code
self-guard where it is cheap (`typeof x.f==='function'&&...`).

### og_trace and its golden recordings

og_trace plays the same scripted session (walking, mining, placing, damage, a kill, night, water, X-ray, Shaders, third
person; plus purgatory, creativity and Malgorath sessions) on the current build with Hyperreal compiled in but off, and
compares a digest of the world every 40 frames with a golden file recorded from the pre-split game with the texture-pack
code removed. A difference means the OG game changed, and the suite prints the first divergence.

- `--golden <file>` checks against a recording (what the gate does).
- `--bless <file> --reason "<why>"` re-records it from the current build. Do this **only** when a change is meant to alter
  OG behaviour (or the stubs or the tracer itself changed), and say why: the reason is stored in the file.
- Release 1.0 re-blessed `purg` twice, each time after proving the first divergence came only from the intended change:
  once for the renamed internal ids (Phase 0) and once for the recast OG meshes on the purgatory path (the stage-door frog,
  the supporting-cast rigs, the felt mitt). `over`, `crea` and `malg` were re-blessed once, in 6.8, when the Watcher and
  the Reaper were removed: their two per-frame spawn rolls no longer draw random numbers, and putting just those two rolls
  back in a scratch build matched the old goldens exactly. The mutation proof still holds on the new goldens (one OG
  constant changed in a scratch copy of the build fails the session that uses it).

The golden files are generated digests, one long line each: never edit them by hand. `.gitattributes` keeps them out of
diffs and `tools/grep-safe.sh` skips them, as noise; the secrets, privacy and IP scans read them like any other file.

### The Release 1.0 scans (names, images, other IP, privacy)

Release 1.0 is the first public version. Four repo suites and one purgatory suite keep the clean-up from coming undone. All
run in the quick tier, so `npm run test:quick` catches a regression in under a minute.

| suite | what it proves | when it fails |
|---|---|---|
| `tests/repo/r_ipscan.js` | No name from the banned list appears in any file a commit would hold (the walk in `tests/lib/repo_files.js` mirrors `.gitignore` and never opens a `.env` file), in any file **name**, or in the build (`game.js`, `head.html`, the keys and metadata of `hrassets.js`). No allow-list. | `node tests/repo/r_ipscan.js --list` prints every hit as `file:line term#k` plus the line: fix the text. |
| `tests/repo/r_ipassets.js` | The images Release 1.0 removed stay removed: no removed id is packed, embedded or named in code or data, and no packed or embedded WebP has the sha1/sha256 of a removed image, so the old art cannot come back under a new name (`tests/fixtures/ip_denylist.json`, computed from the v6.3 pack). The renamed and recoloured ids landed, every packed entity id is still quoted by a model, and the pack headers name no legacy path. | After a model edit, repack (`docs/ASSETS.md`); never add a denylisted image back. |
| `tests/repo/r_other_ip.js` | The other third-party fixes hold on the build: the Nuke Keg (no creeper face painter, keg egg names, "Boomer" in every UI string), made-up stock symbols (the real tickers live only in the save-migration table `STOX_OLD`), the Fortune Orb, the Critter Jar, DEEP DIRT 2D, ASTEROID ALLEY, the World-Eater, no Hyperreal villager, Dan's new outfit colours, no local media path or `/media` route, and the CC-BY mesh credits in `THIRD_PARTY.md` and the help screen. | Fix the string or credit it names. |
| `tests/repo/r_privacy.js` | No personal data in the repo or the build: the rules of `tools/scan_secrets.mjs` (imported, so there is one rule set, including the owner's private terms from the local untracked list when it exists) plus mounted volumes, home-folder layouts and this machine's user name in a path; no metadata in any image or audio file or embedded payload; `.gitignore` and `.env.example` hygiene; once a repository exists, the git identity, every commit author and every commit message. | It prints `path:line rule`, never the value. |
| `tests/purgatory/p8_recast.js` | The purgatory recast by name (the name tables, the boss bars, the intro titles, places, trunks, items, the Programme, speakers and kill lines), by shape and colour (every OG rig builds; the headliners lost their costumes; the supporting cast lost their signature colours) and by animation contract: the real Hyperreal models, built in a child process on a permissive stub THREE (`tests/lib/hr_models_child.js`), carry the new names, build in every variant the game asks for, and accept and still read the s fields the v6.3 brains wrote (`tests/fixtures/recast_contract.json`). | Read the failing check: it names the table, rig or model. |

**The banned list is ROT13.** `tests/fixtures/ip_banned.json` holds third-party names that must never appear, ROT13-encoded (letters rotated by 13; a letter
right after a backslash, a regex escape, is not), so the repo passes its own scan. To read it in plain text, run
`node tests/repo/r_ipscan.js --decode`: it prints the list and writes nothing. Each term has a tier (`all`: every byte;
`prose`: only string literals with a space in JavaScript and all text elsewhere, so a variable that happens to spell a
catchphrase is not flagged) and an encoded sample that the suite's self-test matches. To add a term, encode it with
`require('./tests/lib/ipban.js').r13()`, give it the next number and a sample, and run the suite: the self-test proves it
fires and that none of the Release 1.0 names matches it. Old names that the code must still know (the save aliases in
`src/purgatory/p0_contract.js`, `tests/purgatory/p8_saves.js`) are ROT13 for the same reason.

### Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request with a read-only token and no secrets: one job per gate
group (`node scripts/gate.mjs --once --group <g>`, which builds with `--strict` first), the brain's self-test
(`npm ci --prefix brain` then `node brain/selftest.mjs`, against a fake upstream), and the secrets and privacy scan
(`node tools/scan_secrets.mjs`). The Release 1.0 scans above run in the `repo` job, and `u_scale.js` and `u_title.js` in the
`core` job. CI does not run the history scan: contributors' commits keep their own identities and zones.

### Optional steps

The gate runs these only when their inputs exist: the brain self-test (when `brain/node_modules` is installed), the
source-art checks (when `DC_ART_SRC` points at the Hyperreal source art, see [ASSETS.md](ASSETS.md)), and the real-three
suites (when `assets/vendor/three.r128.min.js` exists, which it does in every checkout since game 6.7).

**The history scan** (`npm run scan:history`, `tools/scan_history.mjs`) is not a gate step: it judges the git history, which
the gate does not own. It checks every commit's author and committer (placeholder or noreply address, a `+0000` zone),
every path and every blob reachable from any ref, with the same rules as `npm run scan`. Run it before any push (the
pre-push hook in `tools/hooks/`, installed with `npm run hooks`, runs it over exactly what the push adds).

## Writing a test

**Every feature gets both kinds:** statics (tables, ids, exports, source rules: fast, no world) and smokes (a real world,
real frames).

```js
'use strict';
const boot = require('../lib/pg_boot.js');          // or hr_boot, c_boot, mg_boot
boot.run(async () => {                              // when this resolves: "(k skipped: ...)", "N passed, M failed", exit code
  const V = boot({ seed: 1337 });                   // V = window.__vox; one boot per process
  const step = boot.stepper(700000);                // frameStep with strictly increasing timestamps
  step(160);                                        // warm up before asserting anything
  boot.ok('the frog wants an empty hand', V.something() === true);
  if (!V.optionalThing) boot.skip('optional thing', 'not in this build');
});
```

- **One node process, one boot.** `mg_boot` builds on `c_boot`, which builds on `pg_boot`, which builds on `hr_boot`;
  each adds helpers (`settle`, `purge`, `world`, `bite`, `kit`, `detClock`...). Read the header of the one you use, and
  `tests/README.md` for the map.
- **Paths** come from `tests/lib/paths.js` (`BUILD`, `SRC.*`, `FIX`, `OUT`, `readSrc`). Never hard-code a path and never
  read anything outside the repo.
- **Read the build** when the property is about the game; read `src/` when it is about a source file.
  `readSrc(rel, {legacy:true})` returns a package file the way it looked before the split (marker line removed).
- **Timestamps strictly increase** across the whole suite: use the stepper. Use 40-60 ms gaps; giant jumps cause
  multi-substep weirdness.
- **Determinism:** pass a `seed`; use the fake clock (`clock:true`) unless real time is the point; use
  `boot.detClock(V)` for anything long and timing-sensitive (chunk meshing is budgeted by wall time).
- **Never** touch the network (`fetch` throws, the brain points at a dead port), never turn sound on, and never print
  source text.
- **Register** the suite in `tests/gate.json` with its repeat count and clock kind. `r_gate` fails if a suite file is not
  listed.
- A failing check prints `FAIL <name>`; an exception inside `boot.run` prints `CRASH` and the stack; the exit code is 1
  either way.

## The rig field manual

Nearly every "failure" during development was the test's fault. Before touching game code, check the rig against this
list.

- **Chunks load lazily around the player.** `setBlock` silently does nothing in an unloaded chunk, and `getBlock` reads
  air there. After any teleport, settle 25-30 frames before building or asserting.
- **Relocate between destructive tests** (`P.x+=60..120`, then settle): craters, floods and scorch marks from earlier
  tests contaminate old sites.
- **Purge hostiles** before any damage-sensitive or stand-still phase (`hurtMob(e,999)` on everything hostile within
  about 40). Dungeon and vault tests leave zombies behind. Or switch `GR.mobSpawn` off.
- **Player state leaks between tests.** Reset `P.pow.a={}` (an active Feather Fall once nullified three fall tests),
  `P.armor`, `P.cos.trail`, `P.ride`, any game rule you changed, and `P.mode` back to `'s'`.
- **Never cache `V.P`**: `applySave` and `startNewWorld` replace it.
- **Water flows back into dug shafts.** Seal test shafts with full stone shells, or build above the water table
  (`colInfo(x,z).h > SEA`) and teleport there before building.
- **Pitch sign:** positive looks up. Aiming at the ground is `P.pitch=-1.2`.
- **Speeds need runway** (26 blocks for a skateboard at full speed). Sample flags during the loop
  (`seen=seen||x`), not only after it.
- **Drops merge.** Assert item totals, not entity counts. Loot can land in lava.
- **World generation adds content everywhere.** Never `.pop()` "the" boss or spawner: filter by distance to your rig,
  and pick structure cells that are unseen and far from the player.
- **Exact counts break as the world grows.** Scope them to the area of the rig.
- **Ambient spawns are random** and the usual source of one-in-five flakes. Purge, seed, or move away.
- **Bosses regenerate** when the player is dead or more than 30 away. Creative mode makes nuke-immune bosses docile but
  killable (deterministic kill loops: `hurtT=0; inv=0; hurtMob(...)`).
- **A right-click needs a frame with the button up first** (press for one frame, then step a couple more after closing
  an editor).
- **Live AI bots grief.** Run them last, in their own area.
- `getObjectByName`/`setScalar` do not exist on the stubs: assert through entity fields, not mesh internals.

## Debugging protocol

When a test fails and the rig looks right: **instrument, do not theorise past two guesses.** Add a temporary probe at the
suspect line, for example `if(typeof __xProbe!=='undefined')__xProbe({x:P.x, hp:P.hp});`, define `global.__xProbe` in
the test, run it, and read what is actually happening. Then remove every probe (grep for `Probe` and `/*DBG*/`) before
you commit. This found sky-clicking, water in the shaft, a mis-inserted mob branch and the real spawn point.

Remember that a build with a probe in it changes the bytes: never leave one in a shipped version.
