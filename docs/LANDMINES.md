# Landmines

Things that have bitten before, grouped by area. Read the section for the area you are touching before you touch it.
Grep for names with `tools/grep-safe.sh`.

## The whole game

- **One script.** Never load `src/` files as separate `<script>` tags; never add a second top-level declaration of an
  existing name (there are about 3,500 and none is duplicated). See [ARCHITECTURE.md](ARCHITECTURE.md#1-one-file-one-script).
- **No `</script` and no `<!--` anywhere in `src/`**, not even in a string or a comment: either ends the page's script
  early. The build refuses them.
- **Bytes are pinned.** Do not reformat, re-indent or "tidy" code you are not changing, and never touch the blank lines
  and marker lines between files. Shipped versions are frozen ([RELEASING.md](RELEASING.md)).
- **Unicode.** Most of the code stores `◆`-style escapes, but some strings contain real characters (em dashes,
  typographic apostrophes). If an exact-text edit cannot find its anchor, look at the raw bytes.
- **Old saves must load.** `applySave` defaults every missing field. A new field needs a default there, and world state
  needs a reset in `resetWorld` ([ARCHITECTURE.md](ARCHITECTURE.md#8-persistence)).
- **`storage.get` can reject on a missing key** (the test stub does, and so does the hosted storage API the game was
  first written for; the `localStorage` shim returns null). Always try/catch it.

## Core gameplay

- **`doUse` branch order** (`src/core/p04d_player_update.js`): the early right-click branches (laser, dragon feed and
  mount, compass) sit above the dungeon-egg branch, which sits above eat/place. Anything below the eat branch loses food
  items to hunger. Put new early branches next to the existing early ones.
- **Anchors that look unique are not.** `if(mt==='alien'){` exists in three places (`spawnMob`, `makeMobMesh`, the save
  restore). An insert once landed in the mesh code and silently broke a mob. Look at the landing site after every insert.
- **`explode(x,y,z,r,byMob)`**: pass `true` from mob sources, or `mobGriefing=false` stops working.
- **Boss-bar hearts** scale by `MOBT[mt].hp/10`. `spawnMob`'s boss auto-scaling skips `demon`.
- **`updatePlayer` is frozen while a cutscene runs** (`CUT.on`), and the cutscene camera returns early from
  `updateCamera`. `applyShake()` runs after `updateCamera` in the frame.
- **Block ids live in a `Uint8Array`**: they must stay below 256. Check the ID ledger before allocating.
- **Recipes render icons for every ingredient when the crafting screen opens.** Define an item before any recipe that
  uses it, and use the `tiles`/`toolClass` fields (not `tile`/`tool`), or the icon renderer crashes.
- **`setBlock` above y≈76 does nothing**, and nothing happens in an unloaded chunk either.
- **Keys in use:** WASD, Space, Shift, Ctrl, E, Q, R (sort, in the inventory), P (powers), F, F3, F5, T, Enter, Tab,
  1-9, `[` + X (X-ray). The Escape chain has a fixed order (debug menu, compass, win screen, cutscene skip, store,
  powers, enchanting, ...): add new panels to it, and to `modalOpen()`.

## The UI scale and the title menu (Release 1.0)

- **Overlays and HUD widgets are CSS-zoomed** (`--uiz` for overlays, `--uih` for the HUD, set by `uiApply` in
  `src/ui/p06e_ui_scale.js`). Inside a zoomed box `vw`/`vh` are multiplied by the zoom: write lengths as a % of the
  overlay, or as `calc(Nvh / var(--uiz))`.
- **Never position a zoomed element from mouse coordinates.** The held-item `#cursor` is unzoomed on purpose. Map
  pointer events through `getBoundingClientRect` ratios or divide by `uiZ()` (the music editor's `crMusCellXY` does).
- **Draw icon canvases through `uiCv`** (a device-resolution backing store plus a transform) and keep
  `image-rendering:pixelated`, or pixel icons go soft at 125% and 150%.
- **The title background has its own renderer and scene** (`TBG` in `src/ui/p07g_title.js`). It must never run under
  the node stubs (`uiLive()` is false there), never touch the player's world, the game renderer or saves, and never use
  `Math.random`, `Date.now` or `performance.now`: og_trace and the seeded suites would move.
- **Node is never live**: the applied scale stays 100% in the suites unless a test calls `uiApply({w,h,dpr})`, so every
  older pixel pin (the easel zoom, for one) still holds.
- **`hudLayout()` owns the inline position of a few HUD widgets** (`src/ui/p06e_ui_scale.js`, run every frame and by
  `showToast`): `left`/`max-width` of `#boss`, `#mgbar`, `#tablist` and `#toast`, `top` of `#toast`, `max-height` of
  `#debug` and `#chatlog`, and `visibility` of `#toast`/`#cmphud`/`#pcmphud`/`#chatbox`. It never moves a menu: over a
  menu that fills the window the toast sits on the top edge, over the panel's header strip (a panel that jumped while the
  player clicked it lost the click, and the record player's lowest piano row fell off the bottom). Do not set those from other code: it resets them every frame it runs. A new top-centre HUD
  widget goes in its lane list; a new bottom widget in the F3 column goes in `hlF3`'s list; a new overlay needs its
  boxes as direct children (that is what a toast steers around). Lengths on a zoomed widget are zoomed px (real / `UIS.hud`).
- **The saved settings arrive asynchronously.** `loadSettings()` awaits `storage.get`, so it finishes after the whole
  script (and `boot()`) has run. Anything at boot that depends on a saved setting waits for `SETTINGS_P` (the title's
  first-launch name prompt and the menu music do); otherwise a returning player is asked for a name again and the menu
  music starts for a player with Sound: Off.
- **The player's name is a display mapping.** Internally the player is always `'Dan'`; `pnText` maps `Dan` (any case) to
  the chosen name on screen and `pnBack` maps replies back. It must never touch the credit "Dan Dingle" on Dan's found
  works, and `pnValid` refuses names the mapping would confuse (one letter, the AI players' names and nicknames, common
  short words).
- **The UI rig checks every pair**: `tools/qa/ui/ui_qa.mjs` shows a toast in every title view and every menu and counts
  F3 and the player list in the HUD overlap pairs. A widget `hudLayout` hides (`visibility:hidden`) is not visible, so it
  is not a pair.

## Texture packs (PART 54)

- **OG must not change.** Every Hyperreal hook is guarded (`TP.hr`, `HRW.on`, `HRL.on`, `HRE.on`, `opts.hr`, `e.hrM`,
  `M.hr`) and its OG branch is the original code character for character. og_trace fails on any OG drift.
  `TP.hr` only means "some module is live"; module-specific code checks its own flag.
- **Never set `scene.fog` or `scene.background` to null**: OG dereferences both. Hyperreal only rewrites their colours
  and distances.
- **r128 recompiles every lit shader** when the number of lights of a type, any light's `castShadow`,
  `shadowMap.type`, `toneMapping`, `outputEncoding` or `physicallyCorrectLights` changes. Do that only in a module's
  enable/disable/setQuality, never per frame. Every patched material sets `customProgramCacheKey`.
- **Hyperreal bodies are opt-in per call**: only `spawnMob` asks `makeMobMesh(mt,{hr:1})`. Figurines and other callers
  stay OG.
- **No THREE constructors, `Math.random`, `Date.now`, `performance.now` or `fetch`** at the top level of PART 54 or in an
  OG per-frame path. Never run Hyperreal under `botsmoke.js` (the cast models use `Math.random`).
- **Exports go in `TPEX`, never `TPX`** (`TPX` is the number 16, the atlas tile size).
- **`vox_settings` is shared by every page on an origin**: a saved `tp:'hr'` makes every later page boot into
  Hyperreal. Put `tp:'og'` back after browser QA.
- Bloom turns one NaN pixel into black blocks: any custom Hyperreal shader sanitises its normal and output.
- Hyperreal skips `ShaderMaterial`s when it adopts the legacy materials, so OG particle shaders need an sRGB-to-linear
  step while Hyperreal is live.

## Puppet Purgatory (PART 55)

- **Display names are a contract.** Death messages, the balcony heckles (`pmDeathKind`) and the bots' fight-back read
  the killer's name through `PM_NAMES` / `HN_NAMES` / `purgMtName`. Attribution strings (`purgHit(...,'the Pig')`) must
  match those tables exactly, and code must never compare an item or mob display name as a literal: compare ids.
- **Old names live only in the save alias table** (`src/purgatory/p0_contract.js`, ROT13-encoded). v6.1-v6.3 worlds
  are read through it once and re-saved under the new keys; the banned-names scan (`tests/repo/r_ipscan.js`) fails on
  any old name anywhere else.
- **Purgatory mobs (`pmob:1`) are never saved**; bosses respawn from `MP`. All purgatory state is the one saved object
  `MP` (written only when it differs from `mpDefault()`), plus `ENT_STASH`.
- **Every purgatory timer runs on `MP.clock`** (it stops in the overworld and during purgatory cutscenes), never on
  `Date.now` or `timeOfDay`.
- Inside purgatory the core HUD nulls `P.deathPos` as soon as Dan lies on it, and `respawn()` moves the player before the
  purgatory hook runs: the death spot is recorded separately (`MPF.deathAt`).
- A right-click while looking at a station in reach uses the station, not the held item: eating and equipping must look
  away first (the pilot does).
- `closeModal` stops early if an `onClose` handler throws, so the purgatory handlers are wrapped.
- **`updateSky` runs before `processPuppet`** in a frame (and only unpaused), and switching Hyperreal off calls
  `updateSky(0)`. Draw clock-driven purgatory visuals from the tick (`mwTick`), not from `mpSky`.
- The speed-run pilot (`tests/pilot/`) must stay honest: no free items, no jump higher than 0.35 m outside its scripted
  allowances.
- The purgatory tile art lives in the packed Hyperreal assets, and its tiles are pinned at atlas slots 222-284.

## The Creativity Update (PART 56)

- **PART 56 loads before PARTs 55 and 54**: `MP`, `PREG`, `PGEX`, `TP`, `TPEX` and every `hr*`/`mp*` name are
  runtime-only there (`typeof`-guarded).
- **Nothing runs per frame** until the first creativity block entity or editor exists (`processCrea` returns early).
- **Works are one of a kind and their data is the item id.** Never add a per-stack field for them and never duplicate a
  work stack in a test (a second `{id:10000+n}` is a forged copy). Works never despawn, are consumed when hung or
  inserted in every game mode, and bots can never hold one.
- A block holding a work that is destroyed by anything (explosion, nuke, laser, water, a purgatory wipe) gives the work
  back within 0.5 s (`crSweep`, `crLost`). Work drops freeze while their chunk is unloaded.
- While an editor is open, `crKey` gets every key first, and `crOn` makes `modalOpen()` true. `crAsk` must show its
  overlay before focusing the title field (a field in a hidden overlay cannot take focus).
- Jukeboxes and the editor are created only with **Sound** on (`soundOn`): with Sound off nothing audio is created at
  all. Their loudness, like the menu music's, follows the **Music volume** slider (the music bus, `musDest`). The World
  Music switch (`musicOn`) only gates the in-world tunes (`musicTick`).
- The painting and song payload codecs are frozen with the v6.2 saves (golden payloads in `c1_static`).
- **Nobody can hear the music.** Verify it offline (`c2_audio`) or through an `OfflineAudioContext` in a muted browser.
- A v6.2+ world opened in v6.1 or older loses its works' data on the next autosave; the v6.2 patch notes said so.

## The Malgorath Update (PART 57)

- **His entities are PART 57's end to end**: `makeMobMesh` routes `'demon'` and every `T.mg` type to `mgMobMesh`,
  `updateMob` to `mgBrain`, `hurtMob` to `mgPreHurt`, which always returns -1. Never route them through the generic hurt
  path (`killMob` would roll figurines and ghosts).
- **The boss is spawned from state by `mgSpawnBoss`**, never by `spawnMob`, never saved or stashed. A raw
  `spawnMob('demon')` is the docile Effigy. Exactly one `PointLight` on the rig.
- **Damage to him needs an attacker.** Unattributed damage is 0 by design. Tests use `V.mgHitAs(e,dmg,'Dan',how)` with
  hits more than 0.25 s apart. At 1 HP in round III only a hit inside THE GAG's window kills.
- **Blocks in the Bite:** M1 owns every write through a 250-cells-per-frame queue; the `setBlock` choke point refuses to
  break his cells while he lives, and anything placed there that M1 did not write is eaten after 3 s. Site edits are not
  saved while he lives.
- **Everything he does is drawn through `mgDraw`** (the telegraph channel): pilots, bots and the "you're in it" checks
  read the same data the player sees.
- **three.js:** never use `THREE.Float32BufferAttribute` for geometry rewritten in place (real three copies the array, so
  the skin would freeze in the browser while the stubs pass). Use `BufferAttribute`.
- The eye material's emissive map must be a colour map (the iris), never a grey mask.
- Test rigs: settle at least 25 frames after a teleport, stepper base at least 700000, and call `boot.detClock(V)` for
  anything fight-length (chunk meshing is budgeted by wall time). `[MG] where: msg` on stderr means a registry callback
  threw: treat it as a failure.
- **Nobody has heard his music or sound effects.** Verify offline (`m2_audio`) or with the parity rig in a muted browser.
- A world that met him, opened in v6.2 or older, loses his state on the next autosave.

## AI players (PART 53) and the brain

- **Never run live bots early in a test**: they grief. Run them last, in their own area.
- Point `window.__DINGLE_BRAIN` at a dead port in every browser rig. The brain spends real money.
- The brain serves only files named `dinglecraft_v<X>.<Y>.html`: versions stay two-part.

## Tests and QA

- Some update statics count exact lines that the update added to core files. If you rewrite one of those lines, run that
  update's statics and adjust deliberately; insert beside such lines rather than rewriting them.
- The core quartet (`tests/core/`) is frozen. Its `require('./game.js')` is why the gate copies it into the build folder.
- Real-clock smokes flake under CPU load. Do not run two heavy gates at once.
- Static servers without `Cache-Control` serve stale builds to Chrome. Use `scripts/serve.mjs` (no-store) or `?b=<time>`.
