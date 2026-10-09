# Where everything went (pre-repository → repo)

Before this repository, DINGLECRAFT was built by a "splice" pipeline in a private project archive (not published). This
page maps that pipeline's pieces onto the repository, so old notes and old bug reports can still be followed. Legacy
file names are given without their old folders; nothing here is needed to build, test or play the game.

"The v6.3 `game.js`" and "the v6.3 `head.html`" mean the two parts the old pipeline produced for v6.3. Most of `src/`
was cut straight out of them, so every build-time hook was already folded in.

## The short version

| legacy | repo |
|---|---|
| the v5.8 base plus five splice stages (`splice.py`) | `src/` + `html/` + `assets/`, joined by `scripts/build.mjs` |
| `gate.sh` (the release gate) | `scripts/gate.mjs` + `tests/gate.json` (`npm run gate`) |
| PARTs 1-52 (the v5.8 core plus every update's core hooks) | `src/{core,world,entities,ui,features}/` |
| the AI-player files `a1_core.js` … `a9_ui.js` + their hooks in `splice.py` | `src/ai_players/` (hooks folded in) |
| the texture-pack files `t*.js` + `hooks_{A,B,C}.py` | `src/texpacks/` (`tB_light.js` also carries three Malgorath hunks) |
| the Hyperreal model files (+ `preview.html`) | `src/texpacks/models/` |
| the purgatory files `p*.js` + `hooks_P*.py` | `src/purgatory/` |
| the creativity files `c*.js` + `hooks_C0.py` | `src/creativity/` |
| the Malgorath files `m0`-`m3_*.js` + `hooks_M0.py` | `src/malgorath/` |
| the Malgorath HR files `m4_*.js` and `mg_malgorath.js` | `src/malgorath/hr/` |
| `head.html` (one 792-line file) | `html/` (18 pieces) + `assets/logo.png` |
| `tail.html` | `html/tail.html` |
| `hr_assets.gen.js`, `mg_assets.gen.js` (+ manifests) | `assets/packed/{hr,mg}/` (one `.webp` per map + small sidecars + manifests) |
| `hr_tiles.json`, the art workspace's `tiles.json` | `assets/pack-inputs/` |
| the root `stubs.js`, `test.js`, `smoke.js`, `botsmoke.js` | `tests/core/` (byte-identical, except `smoke.js`: its Watcher check went with the Watcher in 6.8) |
| each update's test folder | `tests/{texpacks,purgatory,creativity,malgorath,lib,fixtures}/` |
| the purgatory pilot (`speedrun`, `pilot`, `nav`, `route`, `boss_scripts`) | `tests/pilot/` (they are test code) |
| each update's browser QA rigs and the in-page texture-pack test scripts | `tools/qa/` |
| the art tools of each update | `tools/art/` and `tools/assets/` |
| `brain/`, `Start AI Brain.command` | `brain/`, `Start AI Brain.command` (the key comes from the repo's `.env`; the game is served from `dist/`) |
| the old project guide | `CLAUDE.md` and `docs/` (rewritten for the repo) |

## Retired with the splice pipeline

These had no job left once the hooks were folded in, so they were not brought over: `splice.py` and its stages,
`gate.sh`, the v5.8 base, every `hooks_*.py`, the `_stub/` bisect files, the anchor proofs `anchors.py` and
`m_anchors.py`, the variant switches (`DC_NO_TEX`, `DC_NO_PURG`, `DC_NO_CREA`, `DC_NO_MALG`, `DC_*_STUB`, `DC_PKGS`), the
identity checks that rebuilt older versions, and the three og_trace parity sessions. Why each one could go:
[PARITY.md](PARITY.md).

Not brought over either: build outputs, QA output folders and review sheets, source PNGs and raw generator outputs (see
[ASSETS.md](ASSETS.md)), `brain/data/` and `brain/node_modules/`, and the shipped html files.

## Documents not published

The design documents, engineering plans, status logs, concept notes and critiques from before this repository stay in
the private archive. They are long, full of spoilers for the game's content, and full of the history of how things were
built (the purgatory ones describe a cast the game no longer has).

## Every source file, one by one

Kinds: **slice** = cut from the v6.3 `game.js`/`head.html` at the given lines (core files carry their update hooks in
place); **byte-exact** = identical to the legacy file; **+marker** = the build's `/* ---- PART NN: file ---- */` line
first, then the legacy file; **+blank** = plus the one separator blank line that followed it in the build; **folded** =
the legacy file with its build-time hook edits applied; **by range** = moved by line range only, never compared as text
(the four horror files, PARTs 47-50; until v6.8 they were also md5-pinned and kept unread as "the opaque files", and the
owner lifted that in v6.8).

| repo | legacy source | kind |
|---|---|---|
| `src/core/p01a_prologue.js` | v6.3 `game.js` lines 1-26 | slice |
| `src/core/p01b_rng_noise.js` | v6.3 `game.js` lines 27-49 | slice |
| `src/core/p01c_blocks_items.js` | v6.3 `game.js` lines 50-142 | slice |
| `src/core/p01d_crafting_inventory.js` | v6.3 `game.js` lines 143-284 | slice |
| `src/core/p02_atlas_icons.js` | v6.3 `game.js` lines 285-602 | slice |
| `src/world/p03a_terrain.js` | v6.3 `game.js` lines 603-705 | slice |
| `src/world/p03b_dimkeys_genchunk.js` | v6.3 `game.js` lines 706-820 | slice |
| `src/world/p03c_chunk_store.js` | v6.3 `game.js` lines 821-915 | slice |
| `src/world/p03d_mesher.js` | v6.3 `game.js` lines 916-1088 | slice |
| `src/core/p04a_physics.js` | v6.3 `game.js` lines 1089-1150 | slice |
| `src/core/p04b_raycast.js` | v6.3 `game.js` lines 1151-1190 | slice |
| `src/core/p04c_player.js` | v6.3 `game.js` lines 1191-1314 | slice |
| `src/core/p04d_player_update.js` | v6.3 `game.js` lines 1315-2024 | slice |
| `src/entities/p05a_entities_drops.js` | v6.3 `game.js` lines 2025-2130 | slice |
| `src/entities/p05b_falling_arrows_tnt.js` | v6.3 `game.js` lines 2131-2258 | slice |
| `src/entities/p05c_particles.js` | v6.3 `game.js` lines 2259-2288 | slice |
| `src/entities/p05d_mobs.js` | v6.3 `game.js` lines 2289-2625 | slice |
| `src/entities/p05e_spawning_tick.js` | v6.3 `game.js` lines 2626-2743 | slice |
| `src/ui/p06a_hud.js` | v6.3 `game.js` lines 2744-2878 | slice |
| `src/ui/p06b_input.js` | v6.3 `game.js` lines 2879-3022 | slice |
| `src/ui/p06c_touch.js` | v6.3 `game.js` lines 3023-3093 | slice |
| `src/ui/p06d_modal_inventory.js` | v6.3 `game.js` lines 3094-3488 | slice |
| `src/core/p07a_render_sound.js` | v6.3 `game.js` lines 3489-3567 | slice |
| `src/core/p07b_furnace.js` | v6.3 `game.js` lines 3568-3592 | slice |
| `src/core/p07c_sky_lights.js` | v6.3 `game.js` lines 3593-3743 | slice |
| `src/core/p07d_hand_camera.js` | v6.3 `game.js` lines 3744-3811 | slice |
| `src/core/p07e_save_load.js` | v6.3 `game.js` lines 3812-4106 | slice |
| `src/core/p07f_world_lifecycle.js` | v6.3 `game.js` lines 4107-4187 | slice |
| `src/ui/p07g_menus.js` | v6.3 `game.js` lines 4188-4233 | slice |
| `src/core/p07h_boot_loop.js` | v6.3 `game.js` lines 4234-4310 | slice |
| `src/features/p08_torches_weapons_vehicles_music.js` | v6.3 `game.js` lines 4311-4784 | slice |
| `src/entities/p09_critter_jars.js` | v6.3 `game.js` lines 4785-4904 | slice |
| `src/features/p10_doors_skateboards.js` | v6.3 `game.js` lines 4905-5192 | slice |
| `src/features/p11_thirdperson_lava_disasters.js` | v6.3 `game.js` lines 5193-5705 | slice |
| `src/features/p12_ramps_tricks_stocks.js` | v6.3 `game.js` lines 5706-6002 | slice |
| `src/world/p13_alien_villages.js` | v6.3 `game.js` lines 6003-6370 | slice |
| `src/features/p14_casino.js` | v6.3 `game.js` lines 6371-6603 | slice |
| `src/features/p15_rails_parks_dsel.js` | v6.3 `game.js` lines 6604-7004 | slice |
| `src/features/p16_xp_enchanting_dungeon.js` | v6.3 `game.js` lines 7005-7447 | slice |
| `src/features/p17_beds.js` | v6.3 `game.js` lines 7448-7505 | slice |
| `src/features/p18_armor_boats_water_qol.js` | v6.3 `game.js` lines 7506-7727 | slice |
| `src/entities/p19_dragons.js` | v6.3 `game.js` lines 7728-7842 | slice |
| `src/world/p20_buried_dungeons_vaults.js` | v6.3 `game.js` lines 7843-8022 | slice |
| `src/features/p21_store.js` | v6.3 `game.js` lines 8023-8272 | slice |
| `src/features/p22_superpowers.js` | v6.3 `game.js` lines 8273-8398 | slice |
| `src/entities/p23_bosses_titan_roosts.js` | v6.3 `game.js` lines 8399-8554 | slice |
| `src/ui/p24_cutscene_win.js` | v6.3 `game.js` lines 8555-8695 | slice |
| `src/features/p25_compass.js` | v6.3 `game.js` lines 8696-8826 | slice |
| `src/entities/p26_nuke_kegs_eggs.js` | v6.3 `game.js` lines 8827-9073 | slice |
| `src/ui/p27_debug_gamerules_settings.js` | v6.3 `game.js` lines 9074-9208 | slice |
| `src/ui/p28_patch_notes.js` | v6.3 `game.js` lines 9209-9385 | slice |
| `src/features/p29_tool_models.js` | v6.3 `game.js` lines 9386-9447 | slice |
| `src/features/p30_weapon_models_icons.js` | v6.3 `game.js` lines 9448-9553 | slice |
| `src/features/p31_shaders.js` | v6.3 `game.js` lines 9554-9588 | slice |
| `src/ui/p32_settings_panel.js` | v6.3 `game.js` lines 9589-9612 | slice |
| `src/features/p33_subscribe_shadows.js` | v6.3 `game.js` lines 9613-9741 | slice |
| `src/features/p34_armor_model.js` | v6.3 `game.js` lines 9742-9775 | slice |
| `src/features/p35_deepdirt_help.js` | v6.3 `game.js` lines 9776-10341 | slice |
| `src/ui/p36_xray.js` | v6.3 `game.js` lines 10342-10395 | slice |
| `src/world/p37_dimensions.js` | v6.3 `game.js` lines 10396-10688 | slice |
| `src/world/p38_liquids_portals.js` | v6.3 `game.js` lines 10689-10837 | slice |
| `src/features/p39_gadgets.js` | v6.3 `game.js` lines 10838-10928 | slice |
| `src/entities/p40_living_blocks.js` | v6.3 `game.js` lines 10929-10996 | slice |
| `src/features/p41_fishing.js` | v6.3 `game.js` lines 10997-11058 | slice |
| `src/entities/p42_snakes.js` | v6.3 `game.js` lines 11059-11143 | slice |
| `src/features/p43_figurines.js` | v6.3 `game.js` lines 11144-11209 | slice |
| `src/features/p44_guard_turf.js` | v6.3 `game.js` lines 11210-11279 | slice |
| `src/features/p45_cinema.js` | v6.3 `game.js` lines 11280-11486 | slice |
| `src/features/p46_fortune_orb.js` | v6.3 `game.js` lines 11487-11495 | slice |
| `src/features/part47.js` | v6.3 `game.js` (by header-computed range) | by range |
| `src/features/part48.js` | v6.3 `game.js` (by header-computed range) | by range |
| `src/features/part49.js` | v6.3 `game.js` (by header-computed range) | by range |
| `src/features/part50.js` | v6.3 `game.js` (by header-computed range) | by range |
| `src/features/p51_prop_plane.js` | v6.3 `game.js` lines 11934-12016 | slice |
| `src/features/p52_big_dingle.js` | v6.3 `game.js` lines 12017-12335 | slice |
| `src/ai_players/a1_core.js` | `a1_core.js` (pre-repository) | folded (hook hunks) |
| `src/ai_players/a2_world.js` | `a2_world.js` (pre-repository) | folded (hook hunks) |
| `src/ai_players/a3_nav.js` | `a3_nav.js` (pre-repository) | folded (hook hunks) |
| `src/ai_players/a4_body.js` | `a4_body.js` (pre-repository) | folded (hook hunks) |
| `src/ai_players/a5_skills.js` | `a5_skills.js` (pre-repository) | folded (hook hunks) |
| `src/ai_players/a6_build.js` | `a6_build.js` (pre-repository) | folded (hook hunks) |
| `src/ai_players/a7_combat.js` | `a7_combat.js` (pre-repository) | folded (hook hunks) |
| `src/ai_players/a8_mind.js` | `a8_mind.js` (pre-repository) | folded (hook hunks) |
| `src/ai_players/a9_ui.js` | `a9_ui.js` (pre-repository) | folded (hook hunks) |
| `src/ai_players/mob_helpers.js` | v6.3 `game.js` lines 16348-16352 | slice (splice.py mob helpers) |
| `src/malgorath/m0_contract.js` | `m0_contract.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m1_layout.js` | `m1_layout.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m1_site.js` | `m1_site.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m1_summon.js` | `m1_summon.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m1_world.js` | `m1_world.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m2_adds.js` | `m2_adds.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m2_audio.js` | `m2_audio.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m2_bots.js` | `m2_bots.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m2_core.js` | `m2_core.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m2_hud.js` | `m2_hud.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m2_loot.js` | `m2_loot.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m2_r1.js` | `m2_r1.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m2_r2.js` | `m2_r2.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m2_r3.js` | `m2_r3.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m2_scenes.js` | `m2_scenes.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m3_a_core.js` | `m3_a_core.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m3_b_parts.js` | `m3_b_parts.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m3_c_rig.js` | `m3_c_rig.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m3_d_anim.js` | `m3_d_anim.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m3_e_fx.js` | `m3_e_fx.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m3_f_dress.js` | `m3_f_dress.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m3_g_adds.js` | `m3_g_adds.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/m3_h_reg.js` | `m3_h_reg.js` (pre-repository) | byte-exact+marker+blank |
| `src/creativity/c0_contract.js` | `c0_contract.js` (pre-repository) | byte-exact+marker |
| `src/creativity/c1_art.js` | `c1_art.js` (pre-repository) | byte-exact+marker |
| `src/creativity/c1_mesh.js` | `c1_mesh.js` (pre-repository) | byte-exact+marker |
| `src/creativity/c1_ui.js` | `c1_ui.js` (pre-repository) | byte-exact+marker |
| `src/creativity/c2_juke.js` | `c2_juke.js` (pre-repository) | byte-exact+marker |
| `src/creativity/c2_song.js` | `c2_song.js` (pre-repository) | byte-exact+marker |
| `src/creativity/c2_synth.js` | `c2_synth.js` (pre-repository) | byte-exact+marker |
| `src/creativity/c2_ui.js` | `c2_ui.js` (pre-repository) | byte-exact+marker+blank |
| `src/purgatory/p0_contract.js` | `p0_contract.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p0_entry.js` | `p0_entry.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p0_guide.js` | `p0_guide.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p1_audio.js` | `p1_audio.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p1_rules.js` | `p1_rules.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p1_world.js` | `p1_world.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p2_craft.js` | `p2_craft.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p2_gear.js` | `p2_gear.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p2_items.js` | `p2_items.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p2_tiles.js` | `p2_tiles.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p3_mobs.js` | `p3_mobs.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p3_npcs.js` | `p3_npcs.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p3_rig.js` | `p3_rig.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p3_spawn.js` | `p3_spawn.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p4_arena.js` | `p4_arena.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p4_boss.js` | `p4_boss.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p4_bomber.js` | a PART 55 boss file (pre-repository) (headliner 1) | byte-exact+marker (renamed in Release 1.0) |
| `src/purgatory/p4_bigfrog.js` | a PART 55 boss file (pre-repository) (headliner 3) | byte-exact+marker (renamed in Release 1.0) |
| `src/purgatory/p4_bigpig.js` | a PART 55 boss file (pre-repository) (headliner 2) | byte-exact+marker (renamed in Release 1.0) |
| `src/purgatory/p4_strike.js` | `p4_strike.js` (pre-repository) | byte-exact+marker |
| `src/purgatory/p5_bots.js` | `p5_bots.js` (pre-repository) | byte-exact+marker+blank |
| `src/texpacks/t0_contract.js` | `t0_contract.js` (pre-repository) | byte-exact+marker |
| `src/texpacks/tA_core.js` | `tA_core.js` (pre-repository) | byte-exact+marker |
| `src/texpacks/tA_assets.js` | `tA_assets.js` (pre-repository) | byte-exact+marker |
| `src/texpacks/tA_world.js` | `tA_world.js` (pre-repository) | byte-exact+marker |
| `src/texpacks/tB_light.js` | `tB_light.js` (pre-repository) | folded (marker + hook hunks) |
| `src/texpacks/tB_post.js` | `tB_post.js` (pre-repository) | byte-exact+marker |
| `src/texpacks/tC_adapter.js` | `tC_adapter.js` (pre-repository) | byte-exact+marker |
| `src/texpacks/tC_mobs.js` | `tC_mobs.js` (pre-repository) | byte-exact+marker |
| `src/texpacks/tC_player.js` | `tC_player.js` (pre-repository) | byte-exact+marker |
| `src/texpacks/tC_bots.js` | `tC_bots.js` (pre-repository) | byte-exact+marker |
| `src/texpacks/tC_corpse.js` | `tC_corpse.js` (pre-repository) | byte-exact+marker+blank |
| `src/malgorath/hr/m4_a_core.js` | `m4_a_core.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/hr/m4_b_grade.js` | `m4_b_grade.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/hr/m4_c_rig.js` | `m4_c_rig.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/hr/m4_d_adds.js` | `m4_d_adds.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/hr/m4_e_ex.js` | `m4_e_ex.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/hr/m4_f_fx.js` | `m4_f_fx.js` (pre-repository) | byte-exact+marker |
| `src/malgorath/hr/loaders/mmodels_open.js` | v6.3 `game.js` lines 32674-32675 | slice (model-loader wrapper) |
| `src/malgorath/hr/models/mg_malgorath.js` | `mg_malgorath.js` (pre-repository) | byte-exact |
| `src/malgorath/hr/loaders/mmodels_close.js` | v6.3 `game.js` lines 32701-32702 | slice (model-loader wrapper) |
| `src/texpacks/loaders/cast_open.js` | v6.3 `game.js` lines 32703-32704 | slice (model-loader wrapper) |
| `src/texpacks/models/rig.js` | `rig.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/player.js` | `player.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/bunkerbrad.js` | `bunkerbrad.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/lilcreepah.js` | `lilcreepah.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/honeybee.js` | `honeybee.js` (pre-repository) | byte-exact+blank |
| (deleted in Release 1.0: aliens render OG in Hyperreal) | `villager.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/zombie.js` | `zombie.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/boomer.js` | the boomer model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/models/skeleton.js` | `skeleton.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/spider.js` | `spider.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/pig.js` | `pig.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/cow.js` | `cow.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/sheep.js` | `sheep.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/loaders/cast_close.js` | v6.3 `game.js` lines 39263-39264 | slice (model-loader wrapper) |
| `src/texpacks/loaders/pcast_open.js` | v6.3 `game.js` lines 39265-39266 | slice (model-loader wrapper) |
| `src/texpacks/models/pg_0lib.js` | `pg_0lib.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/pg_drummer.js` | a PART 55 cast model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/models/pg_arm.js` | `pg_arm.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/pg_labrat.js` | a PART 55 cast model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/models/pg_cook.js` | a PART 55 cast model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/models/pg_comic.js` | a PART 55 cast model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/models/pg_frog.js` | `pg_frog.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/pg_daredevil.js` | a PART 55 cast model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/models/pg_bomber.js` | a PART 55 cast model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/models/pg_ids.js` | `pg_ids.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/pg_bigfrog.js` | a PART 55 cast model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/models/pg_pig.js` | `pg_pig.js` (pre-repository) | byte-exact+blank |
| `src/texpacks/models/pg_bigpig.js` | a PART 55 cast model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/models/pg_yeti.js` | a PART 55 cast model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/models/pg_blank.js` | a PART 55 cast model (pre-repository) | byte-exact+blank (renamed in Release 1.0) |
| `src/texpacks/loaders/pcast_close.js` | v6.3 `game.js` lines 41008-41009 | slice (model-loader wrapper) |
| `src/boot/export_boot.js` | v6.3 `game.js` lines 41010-41029 | slice |
| `html/00_open.html` | v6.3 `head.html` lines 1-7 | slice |
| `html/css/core.css` | v6.3 `head.html` lines 8-129 | slice |
| `html/css/features.css` | v6.3 `head.html` lines 130-261 | slice |
| `html/css/ai_players.css` | v6.3 `head.html` lines 262-281 | slice |
| `html/css/purgatory.css` | v6.3 `head.html` lines 282-284 | slice |
| `html/css/creativity.css` | v6.3 `head.html` lines 285-297 | slice |
| `html/css/malgorath.css` | v6.3 `head.html` lines 298-303 | slice |
| `html/01_body_open.html` | v6.3 `head.html` lines 304-308 | slice |
| `html/dom/hud.html` | v6.3 `head.html` lines 309-337 | slice |
| `html/dom/touch_cursor.html` | v6.3 `head.html` lines 338-346 | slice |
| `html/dom/panels_a.html` | v6.3 `head.html` lines 347-436 | slice |
| `html/dom/title.html` | v6.3 `head.html` lines 437-460 | slice (logo templated) |
| `html/dom/menus.html` | v6.3 `head.html` lines 461-524 | slice |
| `html/dom/panels_b.html` | v6.3 `head.html` lines 525-584 | slice |
| `html/dom/help.html` | v6.3 `head.html` lines 585-775 | slice |
| `html/dom/ext_panels.html` | v6.3 `head.html` lines 776-780 | slice |
| `html/dom/patch.html` | v6.3 `head.html` lines 781-788 | slice |
| `html/99_scripts.html` | v6.3 `head.html` lines 789-792 | slice |
| `html/tail.html` | `tail.html` | byte-exact |
| `assets/logo.png` | v6.3 `head.html` line 438 (base64-decoded) | decoded |
| `assets/packed/hr/**` | `hr_assets.gen.js` (pre-repository) | unpacked (header, meta verbatim, 445 webp) |
| `assets/packed/mg/**` | `mg_assets.gen.js` (pre-repository) | unpacked (header, order, 30 webp) |
| `assets/packed/hr/manifest.json` | `hr_assets.manifest.json` (pre-repository) | byte-exact |
| `assets/packed/mg/manifest.json` | `mg_assets.manifest.json` (pre-repository) | byte-exact |
| `assets/pack-inputs/hr_tiles.json` | `hr_tiles.json` (pre-repository) | byte-exact |
| `assets/pack-inputs/tiles.json` | `tiles.json` (pre-repository) | byte-exact |
| `src/texpacks/models/preview.html` | `preview.html` (pre-repository) | byte-exact (dev page, not built) |

### Files added after the split

These did not exist in the v6.3 build; they arrived with Release 1.0 (game 6.4 to 6.9):

| repo | added in | what |
|---|---|---|
| `src/ui/p06e_ui_scale.js` | game 6.4 | the UI scale and the HUD layout |
| `src/ui/p07g_title.js` | game 6.4 (reworked in 6.5 to 6.7) | the title menu, the panorama, the menu music, the name prompt, the rules editor |
| `src/creativity/c3_found.js` | game 6.7 | Dan's found works as rare loot |
| `assets/title/` | game 6.5 | the title panorama's six faces and `pano.json` |
| `assets/vendor/` | game 6.7 | three.js r128 and its licence, bundled |
| `tests/ui/u_scale.js`, `tests/ui/u_title.js` | game 6.4, 6.7 | the UI suites |
| `tests/creativity/c3_found.js` | game 6.7 | the found works suite |
| the repo scans (`tests/repo/r_*.js`), `tools/scan_*.mjs`, `tools/hooks/` | Release 1.0 | the build, gate, IP and privacy checks |
