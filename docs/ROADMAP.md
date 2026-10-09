# Roadmap

The restructure had four steps. Steps 1 and 2 are done: the project is a git-ready repository, and the game is built
from real per-system source files with a byte-identical result. Steps 3 and 4 are planned here and not
started; the first round of smaller cleanups shipped in Release 1.0.

Every item below changes the game's bytes, so each one starts with a version bump (`npm run bump`) and ends with a green
gate. The suites are the safety net that makes these changes boring.

---

## 0. First post-split cleanups (Release 1.0)

Small things that v6.3's byte freeze would not let us touch. Release 1.0 (game versions 6.4 to 6.9) did them:

- **Done: the in-game "brain is not running" hint** in `src/ai_players/a8_mind.js` and `a9_ui.js` no longer names the
  old project folder, and `tests/repo/r_build.js` no longer allows it.
- **Done: the logo's metadata chunks** (`eXIf`, then `pHYs` and `sRGB`) were stripped from `assets/logo.png`: it now holds
  only `IHDR`, `IDAT` and `IEND`, and the pixels are unchanged.
- **Done: the v5.9 patch note** that wrote `<player>` literally now writes `&lt;player&gt;`.
- **Done: the IP and privacy pass**: the purgatory cast and every other borrowed name or design were replaced, the model
  credits are in [THIRD_PARTY.md](../THIRD_PARTY.md), one privacy edit was made to the jumpscares
  (`src/features/part48.js`), and the brain's media route is gone.
- **Done: the legacy path comments.** Release 1.0 reworded the old path comments in the code, and its repack rewrote the
  packed-asset header lines. The art workspaces are named only by their environment variables (`docs/ASSETS.md`); what
  still mentions the pre-repository layout is the legacy-path mapping in `tools/art/dcpaths.py`, the tests that make sure
  nothing looks it up, and one comment in the frozen `tests/core/smoke.js`.
- **Done: three.js is bundled** (Release 1.0, game 6.7): `assets/vendor/three.r128.min.js` is inlined by the build, the
  game plays offline, and the `t?_real` suites run against it in the gate.
- Optional: make the gate parallel by default once flake rates are measured, and a runtime "texture packs inert" switch if
  a true compiled-out baseline is wanted again for og_trace.

## 1. Lazy external textures (step 3)

**Why.** The html is 42.5 MB (game 6.7), of which about 37 MB is the Hyperreal art as base64, and the cap is 45 MB:
there is about 2.5 MB of headroom left. Every page load parses all of it, even in OG, and the art cannot grow.

**Plan.**

- Two build profiles:
  - `single`: today's file, everything embedded, works from `file://`;
  - `web`: the html plus a `textures/` folder of `.webp` files beside it, loaded on demand per pack and quality tier.
- Over `file://`, Chrome refuses to upload images from local files to WebGL, so the `web` profile needs http. Both the
  brain and `npm run serve` already serve the game over http.
- Keep `hrAssets()`/`hrAssetMeta()`/`hrMgAssets()` as the interface, make them able to answer asynchronously, and make
  Hyperreal's enable step wait for its art.
- Move the other big embedded data the same way: the title panorama (about 1.9 MB of WebP faces in `head.html`),
  `TOOL3D` (29 KB), `WPN3D` (220 KB, one line) and the logo.

**Proof.** The og_trace goldens are unchanged (OG never touches the Hyperreal art), the Hyperreal browser QA sheets match,
and the `web` profile gets its own size budget in `scripts/guards.json`.

## 2. ES modules

Today the game is one classic script with about 3,500 shared top-level names (none duplicated). Moving to modules is
worth it for tooling and for contributors, but it has to be done in careful steps:

1. **Lint first, no runtime change.** Add ESLint `no-undef` and `no-redeclare` with a generated list of globals. This
   turns the cross-file dependency map into something enforced.
2. **Replace the rebound functions with hook registries.** Seven functions are wrapped by later code (`playS` a dozen
   times, `musicTick` three times, `damagePlayer`, `hurtMob`, `cutCam`/`updateSky` at runtime, and two purgatory door
   functions). Imports are read-only, so these become explicit registries. About 64 module-level `let`s that other files
   write (`P`, `HIT_BY`, `timeOfDay`, `soundOn`, `DIM`, `SEED`...) move into a shared `state` object or get setters.
3. **Convert one leaf package at a time**, starting with the texture packs or the Creativity Update (fewest inbound core
   references, clean facades), through a bundler (esbuild) that emits **one IIFE inside the single html**. The output must
   still open from `file://`, where ES modules do not load, so a bundler is required for any module step.
4. **Expose a deliberate `window` facade** for the one inline `onclick="closeModal()"` and for the QA rigs that set bare
   globals (`soundOn`, `AC`).

## 3. A newer three.js (step 4)

The game uses three.js r128, bundled from `assets/vendor/`. Upgrading needs step 2 first: recent three releases ship only
as ES modules (the classic `three.min.js` build went away; check the exact release when the time comes).

- Renames to handle: `outputEncoding` → `outputColorSpace`, `physicallyCorrectLights` → its successor,
  `DataTexture2DArray` → `DataArrayTexture`.
- Re-validate the shader-chunk names that Hyperreal patches in `onBeforeCompile`, and the rules for when a light change
  forces a shader recompile.
- Replace `assets/vendor/three.r128.min.js` and its licence file together, and keep the `t?_real` suites green against it.
- **Proof:** the Hyperreal browser QA, plus og_trace re-blessed with a stated reason.

## Open questions for the owner

- The brain falls back to a key exported in the shell when the repo has no `.env` key. Keep that, or go file-only?
  (See [BRAIN.md](BRAIN.md).)
- Whether to publish the minimum source-art set as a release archive, so other people can repack ([ASSETS.md](ASSETS.md)).
