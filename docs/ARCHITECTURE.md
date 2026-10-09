# How DINGLECRAFT is put together

This is the map. It covers what the shipped file is made of, the order things load in, which source file holds which
system, the conventions that only make sense once you know the whole game is one script, and how each big update plugs
into the original sandbox. The ID ledger and the persistence rules are at the end, because you will need them.

---

## 1. One file, one script

The shipped game is one HTML file, built by plain concatenation:

```
dinglecraft_v<VER>.html = head.html + game.js + hrassets.js + tail.html
```

| part | built from | what it is |
|---|---|---|
| `head.html` | `html/` (18 pieces, `html/ORDER.txt`) + `assets/logo.png`, `assets/title/` (the menu panorama) and `assets/vendor/three.r128.min.js` | doctype, all CSS, every UI panel, the help screen, the title panorama as JSON, three.js r128 inlined, and an opening `<script>` |
| `game.js` | `src/` (192 pieces, `src/ORDER.txt`) | the entire game, about 41,000 lines |
| `hrassets.js` | `assets/packed/` | the Hyperreal art: 429 WebP images as base64 data URIs inside two functions, `hrAssets()` and `hrMgAssets()` |
| `tail.html` | `html/tail.html` | `</script></body></html>` (26 bytes) |

`game.js` and `hrassets.js` share **one classic `<script>` element**. That single fact explains most of the rules in
this document:

- `'use strict'` on line 15 of `src/core/p01a_prologue.js` covers everything, including the asset functions.
- Every top-level `function`, `const`, `let` and `var` in every file is in **one shared scope**. There are about 3,500
  of them, and no name is declared twice.
- Function declarations are hoisted across the whole script. `boot()` runs from `src/boot/export_boot.js`, before
  `hrassets.js` has been read, and it still finds `hrAssets()`.
- **Never load `src/` files as separate `<script>` tags**, not even for a quick experiment. Later files would lose
  strict mode, and four load-time export tables that read functions declared in later files would throw.

The only runtime dependency is three.js r128 (MIT), bundled: the build inlines `assets/vendor/three.r128.min.js` into
`html/99_scripts.html`'s `{{THREE_JS}}` as its own classic script, which defines the global `THREE`. The game needs no
network at all.

## 2. Load order is not PART order

The original game was written as numbered `PART`s, 1 to 52. Every big update since then was added as a new PART
**inserted before the previous update**, so in the file the newest update loads first:

```
src/core, world, entities, ui, features   PARTs 1-52    the original sandbox (v1.0 to v5.8), with every update's core hooks in place
src/ai_players/                           PART 53       AI players (v5.9)
src/malgorath/                            PART 57       the Malgorath Update (v6.3)        <- newest update
src/creativity/                           PART 56       the Creativity Update (v6.2)
src/purgatory/                            PART 55       Puppet Purgatory (v6.1, recast in Release 1.0)
src/texpacks/t*.js                        PART 54       texture packs (v6.0)
src/malgorath/hr/                         PART 57 HR    Malgorath's Hyperreal block + his model loader
src/texpacks/loaders + models/            PART 54       hrLoadModels() (the cast) and hrLoadPModels() (the purgatory cast)
src/boot/export_boot.js                   -             node test exports, or window.__vox + boot() in the browser
```

Consequences:

- A later update may use anything from PARTs 1-53 at load time. Names from updates that load **after** it in the file
  (older updates) are "runtime-only" there and are `typeof`-guarded. For example, PART 57 code checks
  `typeof MP!=='undefined'` before touching Puppet Purgatory.
- A new update goes **immediately before** `malgorath/m0_contract.js` in `src/ORDER.txt`. The section guards in
  `scripts/guards.json` check that each update sits right before the one it was inserted ahead of.
- The Hyperreal models (the 28 in `src/texpacks/models/` plus Malgorath's `src/malgorath/hr/models/mg_malgorath.js`)
  are not top-level code: they live inside `hrLoadModels(){ ... }`, `hrLoadPModels(){ ... }` and
  `hrLoadMModels(){ ... }`, whose opening and closing lines are the small files in `src/texpacks/loaders/` and
  `src/malgorath/hr/loaders/`. Each model is an IIFE that registers itself in `window.HR.MODELS`.

## 3. Where everything lives (the PART map)

Line ranges are where each piece sat in the shipped v6.3 `game.js`, handy when an old note says "game.js line 4293".

### The original sandbox (PARTs 1-52)

| PART | what | src file(s) | v6.3 lines |
|---|---|---|---|
| 1 | header, constants, RNG and noise, block ids, items, crafting, inventory | `core/p01a_prologue.js`, `core/p01b_rng_noise.js`, `core/p01c_blocks_items.js`, `core/p01d_crafting_inventory.js` | 1-284 |
| 2 | texture atlas, icons | `core/p02_atlas_icons.js` | 285-602 |
| 3 | world generation, chunk store, mesher | `world/p03a_terrain.js`, `world/p03b_dimkeys_genchunk.js`, `world/p03c_chunk_store.js`, `world/p03d_mesher.js` | 603-1088 |
| 4 | physics, raycast, player | `core/p04a_physics.js`, `core/p04b_raycast.js`, `core/p04c_player.js`, `core/p04d_player_update.js` | 1089-2024 |
| 5 | entities: drops, falling blocks, arrows, TNT, particles, mobs, spawning | `entities/p05a_entities_drops.js`, `p05b_falling_arrows_tnt.js`, `p05c_particles.js`, `p05d_mobs.js`, `p05e_spawning_tick.js` | 2025-2743 |
| 6 | HUD, input, touch, modals and inventory; the UI scale (6e, new in Release 1.0) | `ui/p06a_hud.js`, `ui/p06b_input.js`, `ui/p06c_touch.js`, `ui/p06d_modal_inventory.js`, `ui/p06e_ui_scale.js` | 2744-3488 |
| 7 | rendering and sound, furnace, sky and lights, hand and camera, saves, world lifecycle, menus, boot and the main loop | `core/p07a_render_sound.js`, `p07b_furnace.js`, `p07c_sky_lights.js`, `p07d_hand_camera.js`, `p07e_save_load.js`, `p07f_world_lifecycle.js`, `ui/p07g_menus.js`, `ui/p07g_title.js` (the title menu and its background, 7g2, new in Release 1.0), `core/p07h_boot_loop.js` | 3489-4310 |
| 8 | wall torches, weapons, vehicles, music | `features/p08_torches_weapons_vehicles_music.js` | 4311-4784 |
| 9 | Critter Jars (catch a mob, throw it back out) | `entities/p09_critter_jars.js` | 4785-4904 |
| 10 | doors, skateboards | `features/p10_doors_skateboards.js` | 4905-5192 |
| 11 | third person, lava, disaster spheres | `features/p11_thirdperson_lava_disasters.js` | 5193-5705 |
| 12 | ramps, trick score, the stock exchange | `features/p12_ramps_tricks_stocks.js` | 5706-6002 |
| 13 | alien villages, dialogue, romance | `world/p13_alien_villages.js` | 6003-6370 |
| 14 | THE DINGLE CASINO | `features/p14_casino.js` | 6371-6603 |
| 15 | rails, carts, theme parks, the disaster chooser | `features/p15_rails_parks_dsel.js` | 6604-7004 |
| 16 | XP, enchanting, spawners, THE DUNGEON, boss bar | `features/p16_xp_enchanting_dungeon.js` | 7005-7447 |
| 17 | beds and better nights | `features/p17_beds.js` | 7448-7505 |
| 18 | armour, boats, flowing water, quality of life | `features/p18_armor_boats_water_qol.js` | 7506-7727 |
| 19 | dragons | `entities/p19_dragons.js` | 7728-7842 |
| 20 | buried dungeons and lone spawner vaults | `world/p20_buried_dungeons_vaults.js` | 7843-8022 |
| 21 | THE DINGLE STORE | `features/p21_store.js` | 8023-8272 |
| 22 | superpowers | `features/p22_superpowers.js` | 8273-8398 |
| 23 | the Dragon King and the Stone Titan | `entities/p23_bosses_titan_roosts.js` | 8399-8554 |
| 24 | cutscenes and the YOU WIN screen (and the `DEMON` state; the old boss fight itself was replaced by PART 57) | `ui/p24_cutscene_win.js` | 8555-8695 |
| 25 | the structure compass | `features/p25_compass.js` | 8696-8826 |
| 26 | Nuke Kegs and spawn eggs | `entities/p26_nuke_kegs_eggs.js` | 8827-9073 |
| 27 | debug menu, game rules, settings memory | `ui/p27_debug_gamerules_settings.js` | 9074-9208 |
| 28 | the patch notes (`PATCH_LOG`: data for `CHANGELOG.md` since the in-game panel was retired in Release 1.0) | `ui/p28_patch_notes.js` | 9209-9385 |
| 29 | 3D tool models (`TOOL3D`) | `features/p29_tool_models.js` | 9386-9447 |
| 30 | 3D weapon models and model-rendered icons (`WPN3D`) | `features/p30_weapon_models_icons.js` | 9448-9553 |
| 31 | pretty shaders | `features/p31_shaders.js` | 9554-9588 |
| 32 | settings panel | `ui/p32_settings_panel.js` | 9589-9612 |
| 33 | the SUBSCRIBE button, shadows | `features/p33_subscribe_shadows.js` | 9613-9741 |
| 34 | armour on the player model | `features/p34_armor_model.js` | 9742-9775 |
| 35 | DEEP DIRT 2D (the game inside the game) and help | `features/p35_deepdirt_help.js` | 9776-10341 |
| 36 | X-ray | `ui/p36_xray.js` | 10342-10395 |
| 37 | dimensions: the Nether and the Aether | `world/p37_dimensions.js` | 10396-10688 |
| 38 | liquid chemistry, portals | `world/p38_liquids_portals.js` | 10689-10837 |
| 39 | gadgets | `features/p39_gadgets.js` | 10838-10928 |
| 40 | living blocks | `entities/p40_living_blocks.js` | 10929-10996 |
| 41 | fishing | `features/p41_fishing.js` | 10997-11058 |
| 42 | snakes | `entities/p42_snakes.js` | 11059-11143 |
| 43 | figurines and displays | `features/p43_figurines.js` | 11144-11209 |
| 44 | guard turf | `features/p44_guard_turf.js` | 11210-11279 |
| 45 | DINGLE CINEMA | `features/p45_cinema.js` | 11280-11486 |
| 46 | the Fortune Orb | `features/p46_fortune_orb.js` | 11487-11495 |
| 47-50 | the horror features: THE ETERNAL SNAIL (47), jumpscares (48), guilt ghosts (49), "the others" (50) (see below) | `features/part47.js`, `part48.js`, `part49.js`, `part50.js` | 11496-11933 |
| 51 | the prop plane | `features/p51_prop_plane.js` | 11934-12016 |
| 52 | THE BIG DINGLE | `features/p52_big_dingle.js` | 12017-12335 |

### The updates (PARTs 53-57)

| PART | update | src | v6.3 lines |
|---|---|---|---|
| 53 | AI players (v5.9) | `ai_players/a1_core.js` … `a9_ui.js` (core, world, nav, body, skills, build, combat, mind, UI) + `mob_helpers.js` | 12336-16352 |
| 57 | the Malgorath Update (v6.3) | `malgorath/m0_contract.js`, `m1_*` the Bite, `m2_*` the fight, `m3_*` the OG model and effects | 16353-20577 |
| 56 | the Creativity Update (v6.2) | `creativity/c0_contract.js`, `c1_*` paintings, `c2_*` music | 20578-22058 |
| 55 | Puppet Purgatory (v6.1) | `purgatory/p0_*` contract, entry, guide; `p1_*` audio, rules, world; `p2_*` craft, gear, items, tiles; `p3_*` mobs, NPCs, rig, spawn; `p4_*` arena and the three headliners; `p5_bots.js` | 22059-30218 |
| 54 | texture packs (v6.0) | `texpacks/t0_contract.js`, `tA_*` world and assets, `tB_*` light and post, `tC_*` the cast | 30219-31965 |
| 57 HR | Malgorath in Hyperreal | `malgorath/hr/m4_*.js` + `hr/loaders/` + `hr/models/mg_malgorath.js` | 31966-32702 |
| 54 | the Hyperreal cast and the purgatory cast | `texpacks/loaders/*` + `texpacks/models/*.js` (rig, Dan, the three bots, seven mobs, fifteen `pg_*`) | 32703-41009 |
| - | export branch and boot | `boot/export_boot.js` | 41010-41029 |

Every file of PARTs 54-57 starts with a marker line such as `/* ---- PART 55: p0_contract.js ---- */`. The markers are
part of the shipped bytes, many suites find sections by them, and the build checks that each one names its own file.
The AI-player files and the core files have no markers.

### The horror files (PARTs 47-50)

`src/features/part47.js` to `part50.js` hold the horror features. They are ordinary source files:

- **47, THE ETERNAL SNAIL** (`SNL`, `SNL_ON`, `spawnSnail`, `tickSnail`, `updateSnail`): slow, touch = death, follows
  you across dimensions and reappears 50 blocks out if left behind; game rule `GR.snail`.
- **48, jumpscares** (`SCARE`, `triggerScare`, `tickScare`; the art and sound are drawn and synthesised in engine, no files):
  `GR.jsc` is the chance per frame in percent, 0 by default.
- **49, guilt ghosts** (`GHOST_CHANCE`, `spawnGhost`, `updateGhost`): 10% of kills come back to talk; game rule
  `GR.ghosts`.
- **50, "the others"** (`HRR`, `tickHorror`): a night-time torch blackout in the Overworld that ends with a knock, a
  brief doppelganger that appears underground, and rare creepy toasts. The Watcher and the Reaper were removed in v6.8.

The core calls into them from the main loop (`tickSnail`, `tickScare`, `tickHorror`), the entity tick (`updateSnail`,
`updateGhost`), `killMob` (`spawnGhost`), saves (`SNL_ON`) and the game rules. Until v6.8 the four files were kept
unread and md5-pinned as "the opaque files"; the owner lifted that rule in v6.8.

## 4. The core systems

Grep the names (with `tools/grep-safe.sh`) to find the code.

- **Constants** (`core/p01a_prologue.js`): `CH=16` chunk size, `WH=80` world height (nothing above y≈76 works:
  `setBlock` silently does nothing up there), `SEA=30`, `GAME_VERSION`, `GRAV`, `REACH`. The save format comment at
  the top of that file is a promise: old saves load forever.
- **Blocks and items** (`core/p01c_blocks_items.js`): `B` (block ids), `IT` (item ids), `DEFS`, defined with
  `def(id,{name,tiles,hard,toolClass,req,...})` and `idef(...)`. The fields are `tiles` and `toolClass`, not `tile` and
  `tool`: the wrong keys crash the recipe-book icon renderer. Recipes are `RECIPES` (`core/p01d_crafting_inventory.js`).
  Define an ingredient item before any recipe that uses it.
- **Textures** (`core/p02_atlas_icons.js`): `buildAtlas()` paints every 16 px tile procedurally into one atlas;
  `tile(name)` gives a slot.
- **World** (`world/`): `chunks` (a Map), `genChunk` builds terrain then stamps structures, `getBlock`/`setBlock`,
  `colInfo(x,z)` (deterministic height and biome), per-chunk edits in `ch.edits`, `updateChunks` meshes around the
  player.
- **Structures** all follow one pattern: a deterministic cell function (`vCell` villages, `pCell` theme parks, `wdCell`
  buried dungeons, `lsCell` spawner vaults, `rstCell` dragon roosts), a stamp step inside `genChunk`, and a SEEN set +
  PEND queue that a frame-chain `process*` drains once (spawners into `SPW`, chests via `lootFill`, mobs and bosses),
  with SEEN saved. The fixed site at X 1000, Z 1000 belongs to Malgorath (PART 57).
- **Mobs** (`entities/p05d_mobs.js`): the `MOBT` table (hp, size, speed, damage, flags such as hostile, boom, nuke, fly,
  boss), `spawnMob`, `makeMobMesh` (generic humanoid plus special branches), `updateMob` (generic brain with early
  routing to special brains), `hurtMob`, `killMob`. Mob textures put the face on the +z face (material index 4);
  `boxMesh(w,h,d,color,faceCanvas)`.
- **Player** (`core/p04c_player.js`, `p04d_player_update.js`): `P`, `newPlayer`, `updatePlayer` (frozen while a cutscene
  runs), `doMine`/`doUse`. **The order of the `doUse` branches matters**: early right-click branches sit above the eat
  branch, and anything below it loses food items to hunger. Forward is `(-sin(yaw), -cos(yaw))`; **positive pitch looks
  up**.
- **Saves** (`core/p07e_save_load.js`): `snapshot()`, `applySave()`, `resetWorld()`; storage goes through the
  `window.storage` shim (keys `vxw:<world>`, `vxwlast`, `vox_settings`, stored in `localStorage` with a `vx_` prefix).
  See section 8.
- **Sound** (`core/p07a_render_sound.js`): `audio()`, `playS(name)`, all synthesised in code; music is `musicTick`
  (`features/p08_...`), started by `boot()` after every update has wrapped it.
- **UI panels** all follow the store pattern: an overlay `div` in `html/dom/*.html`, a `let xOpen=false`,
  `openX/closeX/renderX` (render guards `typeof list.querySelectorAll==='function'` so it works headless), a line in
  `modalOpen()`, a place in the Escape chain, and button wiring in a top-level `{ const b=$('id'); if(b)b.onclick=... }`
  block.
- **Systems index**: enchanting `ENCH_DEFS`, XP `spawnXP`, casino `casSpin`, disasters `startDisaster`, coasters
  `railAt`/`updateCart`, boats `updateBoat`, water `tickFlow` (spreads down always, sideways only from a 2-deep source
  or into a cell with air below: this containment rule is load-bearing), armour `armorAbsorb`, store `storeBuy` and hats
  `buildHat`, powers `POW`/`powActive`, bosses `bossLoot`, boss bar `updateBossBar`, cutscenes `CUT`/`startCut`/`cutCam`,
  win screen `openWin`/`winHome`, compass `cmpFind`, nukes `nukeExplode`, spawn eggs `EGG_BASE`/`EGG_MOBS`, game rules
  `GR`/`GR_DEF`, settings `saveSettings`/`loadSettings`, toasts `showToast`, drops `spawnDrop`, entities `entities`/
  `removeEnt`, the UI scale `UIS`/`uiAutoScale`/`uiApply`/`uiCv` (CSS zoom through `--uiz` and `--uih`, saved as `ui` in
  `vox_settings`), the title menu `TM`/`tmBoot`/`tmKey` and its background `TBG`/`tbgStart`/`tbgStop`, the HUD layout `hudLayout`/`hlSpot`
  (toasts clear of menus; F3 and the player list clear of the HUD).

### The frame

`frame(t)` in `src/core/p07h_boot_loop.js` updates the player, chunks, sky, camera and screen shake, then runs **one
long gated line** of per-system ticks (`if(playing&&!paused){processVillages(dt); ... }`), which includes the update
ticks (`processPuppet`, `processCrea`, `tickMalg`) and Hyperreal's `tpFrame`, then renders (`hrRender` when Hyperreal is
live). The order of that line is load-bearing. A new per-frame system is appended to it.

## 5. Global-scope conventions

Because everything shares one scope, the codebase runs on conventions instead of imports:

- **Prefixes own names.** Each update declares names only with its own prefixes: `ag*`/`AG_*` (AI players), `tp*`,
  `hr*`, `HR*`, `TP*` (texture packs), `mp*`, `pi*`, `pm*`, `pg*`, `PG*` and friends (purgatory), `cr*`/`CR*`
  (creativity), `mg*`/`MG*` (Malgorath). The update statics enforce this.
- **Contracts.** Each update has a contract file (`t0_contract.js`, `p0_contract.js`, `c0_contract.js`,
  `m0_contract.js`) that declares its ids, saved state, registry and export object, and states its load rules at the top.
  Contracts are "frozen": additive changes only.
- **Registries instead of scattered hooks.** The core calls a small number of dispatcher functions per update, and the
  update's packages register into a registry: `PREG` (purgatory: brain, mesh, hurt, loot, tick, onBreak, onDeath...),
  `CRREG` (creativity: ui, thumb, mesh, tile, tick, onBE, onLoad...), `MGREG` (Malgorath: stamp, layoutAt, world, fight,
  music, rig, mesh, fx), `tpRegister` + `TP.mods` (texture-pack modules), `HR.MODELS` (cast models).
- **Export objects for tests.** `TPEX`, `PGEX`, `CREX`, `MGEX` are spread into `window.__vox` (and the node export) in
  `src/boot/export_boot.js`, before the core names, so core keys win a clash. Everything a test needs goes there.
  (`TPEX`, not `TPX`: `TPX` is the atlas tile size, 16.)
- **`typeof` guards** (about 380 of them) protect references to names that load later or might be absent.
- **Wrapped functions.** Some functions are re-bound by later code that wraps the previous binding: `playS` (a dozen
  wrappers, purgatory's is outermost), `musicTick` (creativity, purgatory, Malgorath), `damagePlayer` and `hurtMob`
  (purgatory), and at runtime `cutCam`/`updateSky` (Malgorath) and two purgatory door functions. Calling the bare name
  always gets the whole chain.
- **Hook globals declared first.** `HIT_HOW`, `EXPL_BY` and `TP` are declared on lines 19-20 of the prologue so any hook
  can read them at any time.
- **Load-time purity.** No THREE constructors, `Math.random`, `Date.now`, `performance.now` or `fetch` at the top level
  of an update or on an OG per-frame path: the node stubs lack them, and the deterministic suites (botsmoke, og_trace)
  would drift.
- **Global facades the browser relies on**: `window.__vox` (tests and QA rigs), `window.storage` (saves),
  `window.HR` (models), `window.__DINGLE_BRAIN` (where the brain is), `THREE`. QA rigs also set bare globals such as
  `soundOn` and `AC` through the devtools protocol.

## 6. How each update hooks in

All five updates were originally applied by text-substitution "hooks" at build time. Those hooks are now **folded in**:
the core files simply contain the calls, and the update files contain everything else. When you change an update, the
places it touches in the core are ordinary code you can grep for.

### AI players (PART 53, `src/ai_players/`)

Three bots (`AGENTS`: BunkerBrad, xx_lilcreepah_xx, honeybee_mc) with real survival rules. `a1_core` (agents, events,
relationships), `a2_world`, `a3_nav` (pathfinding, `MinHeap`), `a4_body`, `a5_skills`, `a6_build`, `a7_combat`,
`a8_mind` (talks to the brain server), `a9_ui` (chat, commands, tab list, player compass). Damage attribution goes through
`HIT_BY`, `ACTOR`, `HIT_HOW`.

In the core: deaths and respawns (`agOnDanDeath`), pickups (`agTryPickup`), mob targeting and hurting (`agSees`,
`agHurt`), the per-frame body tick (`agBodyTick`), chests (`agChestOpen`/`agChestClose`), saves (`agSnapshot`,
`agRestore`, `agReset`), joining a new world (`agJoinAll`), dimensions (`agSyncFromBody`), the debug menu. Their minds
live outside the game: the brain server in `brain/` ([BRAIN.md](BRAIN.md)). Without it they run on autopilot.

### Texture packs (PART 54, `src/texpacks/`)

Settings → Texture pack **OG | Hyperreal**, with quality Auto/Low/Medium/High/Ultra (saved as `tp`/`tq` in
`vox_settings`). `t0_contract` defines `TP`, `setPack`/`setQuality` and the module protocol (`tpRegister({name, order,
supported, prepare, enable, disable, setQuality, frame})`). Three modules: `world` (`tA_*`: the art as two texture arrays,
the chunk shader, material swap, cube drops), `light` (`tB_*`: sun and moon shadows, torch and lava lights, sky, presets
per dimension, the bloom/SSAO/tone-mapping chain), `ents` (`tC_*`: the cast models for eight mobs, Dan, the fist and
the three bots, and corpses). The art comes from `hrAssets()` in `hrassets.js`.

In the core, every hook is guarded (`TP.hr`, `HRW.on`, `HRL.on`, `HRE.on`, `e.hrM`...) and its OG branch is the original
code, character for character: mesher (`tpEmit`), drops (`tpCubeDrop`), mob meshes and ticks (`hrMobMesh`, `hrMobTick`,
corpses), the hand (`hrFistAttach`), third person (`hrPlayerModel`), sky and torches (`hrSky`, `hrTorches`), shadows,
and the renderer (`tpFrame`, `hrRender`, `hrResize`). **OG must stay identical**: the og_trace suite plays a scripted
session and compares digests with a golden recording ([TESTING.md](TESTING.md)). `tB_light.js` also carries three small
Malgorath hunks (`hrMgGrade`, `hrMgSun`, a light mirror).

### Puppet Purgatory (PART 55, `src/purgatory/`)

A Stage Door appears in the overworld; inside is a whole dimension with its own blocks, items, crafting, mobs, NPCs,
three headliner bosses and an exit. All state is one saved object `MP` (plus `ENT_STASH`), written only once it differs
from `mpDefault()`. Every purgatory timer runs on `MP.clock`, never on wall time. Purgatory mobs (`pmob:1`) are never
saved. Packages: P0 contract, entry and guide; P1 world, rules and audio; P2 items, crafting, gear and tiles; P3 mobs and
NPCs; P4 the headliners and the Strike; P5 the bots inside.

In the core: block break and place (`mpOnBreak`, `mpOnPlace`, `mpPlaceOK`), death and respawn (`mpOnDeath`,
`mpRespawn`), mobs (`mpBrain`, `mpMobMesh`, `mpPreHurt`, `mpOnKill`, `mpAmbient`), physics tweaks (`piSpeed`, `piLand`,
`piVertical`), crafting (`piBuildRecipeList`, `piRecipeSet`, `piTake`), sky and lights (`mpSky`, `mpLightsNear`), saves
(`mpSaveFields`, `mpLoad`, `mpReset`, `mpSnapMob`), the compass (`mpCmpDoor`, `mpCmpTuned`), boss loot, and the
`PREG` registry. Purgatory's Hyperreal cast is `texpacks/models/pg_*.js` (loaded by `hrLoadPModels()`).

### The Creativity Update (PART 56, `src/creativity/`)

Easels (paintings), record players (songs) and jukeboxes. Every painting and disc is unique: its item id is dynamic
(`10000+n`) and its data lives in the work registry `CRW`, saved as `save.cr`, never in a stack field. Packages: c0
contract (ids, registry, block entities, the editor shell, saves, `CREX`), C1 paintings (`c1_art`, `c1_mesh`, `c1_ui`),
C2 music (`c2_song`, `c2_synth`, `c2_juke`, `c2_ui`), C3 found works (`c3_found`, game 6.7). Songs are rendered by a
pure-JS synth, deterministic and seeded. Nothing runs per frame until the first creativity block entity or editor exists.

Found works (`c3_found.js`): Dan's own paintings and discs (`CR_FOUND`, md5-pinned data, credited `CRFC.BY`, "Dan
Dingle") turn up as rare loot. `lootFill` (`features/p16_xp_enchanting_dungeon.js`) calls `crFoundRoll(be,x,y,z)` last
for every chest it fills; the roll is a hash of the world seed and the chest cell (1 in `CRFC.RATE` = 40), never
`Math.random`, and never in purgatory. A find mints a fresh 1/1 work through the registry (`crNew` + `crFinish`), so it
hangs, plays and saves like any other. The player's chosen name never replaces that credit (`pnText` skips "Dan Dingle").

In the core: atlas tiles (`crTiles`), meshing (`crMesh`), right-click and placement (`crInteract`, `crUseHeld`,
`crOnPlace`), keyboard (`crKey`, `crOn` in `modalOpen`), drops that never despawn (`crKeepDrop`), death scatter
(`crScatter`, `crOrphan`), saves (`crSaveFields`, `crLoad`, `crReset`), and the `CRREG` registry.

### The Malgorath Update (PART 57, `src/malgorath/`, plus `src/malgorath/hr/`)

The boss at X 1000, Z 1000, rebuilt: the Bite (a 77 m hole in the world), a three-round fight, scenes, loot. State is one
object `MALG` saved as `save.mg` (only when it differs from `mgDefault()`); the fight itself (`MG2`) is rebuilt from the
checkpoint `MALG.round`. Packages: m0 contract (`MALG`, `MGREG`, the telegraph channel `mgDraw`, saves, migration), M1
the Bite (layouts, a 250-cells-per-frame write queue, the summon), M2 the fight (rounds, waves, scenes, loot, HUD, bots,
audio), M3 the OG model and effects, M4 Hyperreal (the `hr/` block: grading, the skinned model, effects).

In the core: world stamping (`mgStampChunk`), protection of his site (`MGP_ON`, `mgProtected`, `mgProtect`,
`mgNoSpawn`, `mgNoPortal`, `mgNoStruct`), mobs (`makeMobMesh` routes `'demon'` and every `T.mg` type to `mgMobMesh`,
`updateMob` to `mgBrain`, `hurtMob` to `mgPreHurt`, which always returns -1), player hooks (`mgUse`, `mgEggUse`,
`mgPlaceOK`, `mgSteal`, `mgSwingMiss`, `mgOnDie`, `mgOnRespawn`), saves (`mgSaveFields`, `mgLoad`, `mgLoadDemon`,
`mgReset`, `mgEditsSave`), the boot (`mgBoot`) and a handful of gadget and weapon guards.

## 7. ID ledger

An id collision once silently broke a gun for two versions. **Grep before you allocate**, and record new ids here.

- **Blocks:** GRASS 1, DIRT 2, STONE 3, GLASS 16, COAL_ORE 17, IRON_ORE 18, GOLD_ORE 19, DIA_ORE 20, BEDROCK 21,
  WATER 22, TORCH 33, ICE 38, doors 43+, LAVA 59, RAMP 60-63, PC 64, ALIENM 65, ALIENL 66, CASINO 67, RAIL 68,
  RAILUP 69-72, SBRICK 73, SPAWNER_Z 74, SPAWNER_S 75, ENCH 76, BED 77, TCORE 78, TERM 79, NETHROCK 80, SOULSAND 81,
  GLOWSTONE 82, NBRICK 83, OBSIDIAN 84, PORTAL_N 85, CLOUDSTONE 86, SKYGRASS 87, AMBRO 88, ABRICK 89, PORTAL_A 90,
  TRAMP 91, SHELF 92, JAR 93, LAWN 94, CINEMA 95, SCREEN 96. There is no `B.GOLD` block: gold is the item `IT.GOLD`
  and the ore.
- **Items:** tools `toolId(m,t)=120+m*4+t` (m: 0 wood ... 3 diamond, 4 golden; t: pick, axe, shovel, sword); DIAMOND 104,
  GUNPOWDER 107; BULLET 190, SHELL 191, GRENADE 192, WHEEL 193, CAR 194, Critter Jars 195/196 (`ball:true`), DOOR 197, SKATE 198, DSPH 199;
  **guns 200-219 reserved** (`gunId=200+m*4+t`); VEGG 220, CART 221, DEGG 222, BOAT 223, DSCALE 224, CRYSTAL 225,
  COMPASS 226, SUBBTN 227, BUCKET 228, BUCKET_W 229; armour 230-245 (`armorId(m,s)=230+m*4+s`); BUCKET_L 246; spawn
  eggs 250-264 (`EGG_BASE` + index in `EGG_MOBS`); gadgets 265-274; ROD 275, ROD_R 276, FISH 277, FISH_C 278,
  FIGURINE 279, POPCORN 280, M8BALL 281 (the Fortune Orb).
- **Puppet Purgatory** (assigned only in `purgatory/p0_contract.js`, symbolic names `B.PG_*` / `IT.PG_*`): blocks 149-189,
  99, 117-119, 247 (never 212-219; 248 and 249 are spare); items 285-308, 310-338, 340-364 (309 and 339 spare). The
  atlas is 32×32 tiles (1024 slots); purgatory tiles are pinned at slots 222-284. Mob types `pg*` (`pmob:1`).
- **The Creativity Update** (assigned only in `creativity/c0_contract.js`): blocks 213 Easel, 214 Record Player,
  215 Jukebox, 216 Hung Painting; 217-219 spare; 212 stays undefined on purpose. No static item ids: every work is a
  dynamic id 10001-19999. Its atlas tiles register at boot, after purgatory's.
- **The Malgorath Update** (assigned only in `malgorath/m0_contract.js`): no new block, no new tile; item 365
  Malgorath's Jaw; mob type `'demon'` kept, plus never-saved `mgeye`, `mgpart`, `mgmorsel`, `mghusk`, `mgbloat`.
- **Next free** (measured on the v6.3 build: blocks and items share one id space, and block ids must stay below 256):
  block ids 217, 218, 219, 248, 249 (212 stays undefined on purpose); item ids 309, 339, then 366 and up. Everything
  else from 1 to 365 is taken, including the 97-148 range the older notes called free.

## 8. Persistence

Anything stateful has to be wired into **three places**, or it silently vanishes:

- **Player fields:** a default in `newPlayer` (the `P={...}` literal), written in `snapshot()`, restored in `applySave`
  with a backward-compatible default.
- **World state** (SEEN sets, `DEMON`, `GR`, `SPW`, ...): written in `snapshot()`, restored in `applySave`, and **reset
  in `resetWorld`** so a new world does not inherit it.
- **Stacks** keep `ench`/`dur` through every copy (inventory, drops, splits, saves): follow the existing
  `...(s.ench?{ench:{...s.ench}}:{})` pattern for any new per-stack field.
- Game rules `GR` are per world (set on Create New World, changed later with the right-click rules editor `tgrOpen` /
  `tgrSave` in `ui/p07g_title.js`); client settings (render distance, texture pack, sound, the FOV, sensitivity and volume
  sliders, the player's name `pn`) are global, in `vox_settings`. `loadSettings` is async: the title waits for its promise
  (`SETTINGS_P`) before it asks for a name or starts the menu music.
- The updates each save **one object, only when it is not the default**: `MP`/`ENT_STASH` (purgatory), `save.cr`
  (creativity, restored by `crLoad` right after `resetWorld()` inside `applySave`), `save.mg` (Malgorath, `mgLoad` then
  `mgLoadDemon`). A world that never used an update saves exactly like the version before it.
- **Old saves must always load.** `applySave` defaults every missing field. Each update's patch notes tell players to keep
  newer worlds on newer versions, because an older build drops fields it does not know when it autosaves.
