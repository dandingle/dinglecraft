# Assets: the packed art, the source art, and how to repack

OG needs no image files at all: every 16 px block texture, mob face and icon is painted in code. The **Hyperreal**
texture pack is different: it uses about 30 MB of photoreal material maps, which ship inside the html as base64 WebP.
This page explains how that art is stored in the repo, where its sources live, and how to rebuild it.

## What is in the repo

```
assets/
  logo.png                    the title-screen logo (inlined into html/dom/title.html by the build)
  title/                      the title panorama: pano_0..5.webp (six 90-degree cube faces) + pano.json (start yaw, pitch,
                              seconds per turn); the build inlines them as {{TITLE_PANO_JSON}} (tools/art/title_pano.mjs)
  vendor/                     three.r128.min.js (MIT, byte-identical to the official r128 build) + three.LICENSE; the
                              build inlines it as {{THREE_JS}}, so the game plays offline (THIRD_PARTY.md)
  packed/hr/                  the Hyperreal pack (PART 54 + Puppet Purgatory's art)
    header.txt                line 1 of the generated asset script, kept verbatim
    meta.json                 the hrAssetMeta() JSON, verbatim, no trailing newline
    manifest.json             what the packer recorded: sizes, coverage, the sha1 of the assembled text, source hashes
    t/<tile>.<c|n|m>.webp     259 block-tile maps
    e/<id>.<b|n|r>.webp       140 entity maps (the cast, Dan, the bots, purgatory's puppets)
  packed/mg/                  Malgorath's Hyperreal skin (PART 57 HR)
    header.txt  order.json  manifest.json
    m/<id>.<b|n|r|m>.webp     30 maps
  pack-inputs/
    hr_tiles.json             hand-written per-tile overrides (rotation, flags) read by the packer and two suites
    tiles.json                the tile list and art flags from the source-art folder (copied in because suites read it)
```

| map | key | meaning |
|---|---|---|
| `c` | `t:<tile>\|c` | tile albedo (colour) |
| `n` | `t:<tile>\|n` | normal X, normal Y and roughness, stacked as three grey planes (not RGB: lossy WebP would halve the colour resolution of a normal map) |
| `m` | `t:<tile>\|m` | alpha and emissive mask, lossless, only for tiles that need them |
| `b`, `n`, `r` | `e:<id>\|b` ... | entity basecolour, normal, roughness |
| `b`, `n`, `r`, `m` | `m:<id>\|b` ... | Malgorath's skin maps (hide, brow, flesh, horn, enamel, eye, crust, bile, char) |

Every WebP carries image data only (no EXIF, XMP or ICC chunks); the repo check enforces it, and
`python3 tools/art/texpacks/r1_local_art.py --scan <folder>` lists any PNG or WebP under a folder whose chunks go beyond image
data (names only). All 429 files together are about 27.5 MB (Release 1.0), the biggest about 380 KB, so git handles them
fine without git-lfs. A one-texture change adds one small
file to history instead of a new 37 MB blob.

## How the build turns them back into script

`scripts/lib/assets.mjs` rebuilds the two generated scripts byte for byte:

- **hr:** `header.txt`, then `function hrAssetMeta(){return <meta.json>;}`, then `function hrAssets(){...}` with one
  `"<key>":"data:image/webp;base64,..."` line per map, then a `module.exports` line.
- **mg:** `header.txt`, then `function hrMgAssets(){return {...};}` on one line, then a `module.exports` line.

Three details make or break byte identity (they are why the files look the way they do):

1. `meta.json` is kept **verbatim**. Python wrote it, with float spellings such as `1.0` that `JSON.stringify` would
   turn into `1`. Never reformat it, and never add a trailing newline.
2. hr entries are sorted by their **key string** (`t:<name>|<map>`), not by file name: `|`, `_` and `.` sort differently.
3. mg entries are **not sorted**: their order is written down in `order.json`.

Each assembled script's sha1 must equal the one in its manifest, or the build stops. Never print the generated scripts
(`build/*.gen.js`, `build/hrassets.js`): single lines run to megabytes.

## Where the source art lives (not in git)

The PNG sources are far too big for a repository: the minimum set a repack reads is about 600 PNGs (832 MB) for the
Hyperreal pack and 30 PNGs (20 MB) for Malgorath, and the raw generator outputs, review sheets and rejected takes add
more than 2 GB. They live in a private archive (not published). The tools find them only through environment variables:

| workspace | env var | holds |
|---|---|---|
| Hyperreal | `DC_ART_SRC` | `final/` (tile maps + `tiles.json`, about 660 MB), `final_ent/` (entity maps, about 370 MB), `raw/` (generator outputs), `sheets/` |
| Malgorath | `DC_MG_ART_SRC` | `final/` (30 maps), `raw/`, `ref/`, `sheets/` |
| Puppet Purgatory | `DC_PG_ART_SRC` | staging and review sheets for the purgatory art (its finished maps are part of the Hyperreal workspace) |

The current pack is built from a Hyperreal workspace with the Release 1.0 art pass applied (next section); the art spend
ledger (`costs.md`, `BUDGET`) is kept with the private archive, never in the repo (`.gitignore` refuses both names).

## The Release 1.0 art pass (no generator, no spend)

Release 1.0 replaced every image that copied someone else's character or design. It was done locally, for free, by one
deterministic tool, so it can be re-run and checked:

```
cp -cR <v6.3 workspace>/final <v6.3 workspace>/final_ent  <new workspace>/   # APFS clone, no extra space
python3 tools/art/texpacks/r1_local_art.py --orig <v6.3 workspace> --out <new workspace> --sheet out/r1_art.png
npm run repack -- --src <new workspace> --mg-src <malgorath workspace>
```

`--orig` is only read; every output is recomputed from it, so running the pass twice gives the same bytes. What it does:

| change | ids |
|---|---|
| removed (their PNGs leave the workspace; the models no longer name them, which is what drops them from the pack) | the 24 ids in `tests/fixtures/ip_denylist.json` `removedIds13` (ROT13): the old purgatory character faces, their costume materials, the old boomer face and the old alien textures |
| renamed (same pixels) | `pgface_blank` (the Blank's torn-off face) |
| renamed, then repainted from scratch | `boomer_core` (the boomer's gunpowder sac, seen when its chest doors open): one round, lumpy cavity in the moss hide (`mat_mossflesh`), a raw-flesh wall (the `nethrock` tile), a glowing skin (the `lava` tile) and a drift of black grit (the `gravel` tile); the normal comes from its height and luminance. No pixel or outline of the old sac is left, and the old sac's v6.3 maps are in the denylist's `removed` list |
| new, made from the game's own art | `keg_staves` and `face_boomer` (the Hyperreal boomer is a walking powder keg: the `plank_o` tile turned into staves, two hoops cut from the `chest_f` iron strap, two bored eye holes, a burnt grin), `face_pelt` (the pelt xx_lilcreepah_xx wears: `mat_mossflesh` with two ragged eye holes and a sewn-up zig-zag mouth) |
| recoloured (hue band only: stains and dirt keep their colour; normal maps kept) | `tee_dan` orange `#d9822b`, `jog_dan` charcoal `#34343a`, `tee_zombie` olive, `jog_zombie` brown, `fist_pg` and `pgface_feltdan` burlap brown (Felt Dan also gets sewn-on button eyes) |
| painted out | `pg_can_s`: the eyes in the dark gap under the bin lid (every map of the tile) |
| painted out after packing (game 6.7) | `pg_ptrunk_s`: the second line of the prop trunk's stencil (the colour map and all three planes of the normal map), edited directly in the packed WebP (quality 82 / 85, as the packer writes them); the manifest's `fileSha1`, `fileBytes`, `payloadBytes` and the two key sizes were updated. **The workspace PNG still has the line: paint it out there too before the next repack, or the repack brings it back.** |

The purgatory cast's faces are painted in code now (`PG.face` falls back to each model's canvas painter when no photo id is
packed), so the cast needs no art at all. `tests/fixtures/ip_denylist.json` holds the sha1 and sha256 of every removed v6.3
WebP (the old gunpowder sac's included) and the v6.3 hashes of the recoloured maps, so the scans can prove the old art never comes back under another name.
The source PNGs of the removed ids stay in the private art archive (outside git) and must never be copied into the repo.

## Repacking

You only need this when the art itself changes.

```
python3 -m pip install -r tools/requirements.txt
npm run repack -- --src <hyperreal workspace> --mg-src <malgorath workspace>
npm run repack -- --only mg --mg-src <malgorath workspace> --dest out/repack-test   # dry run into a scratch folder
```

`tools/assets/repack.mjs` runs the Python packers (`tools/art/texpacks/pack_assets.py`, `tools/art/malgorath/pack_mg.py`)
into a temporary folder under `out/`, splits their output into `assets/packed/` with `tools/assets/unpack.mjs`,
re-assembles it with the build's own assembler, and only replaces `assets/packed/` if the round trip is exact. It never
writes to the source folders.

- **The toolchain is pinned** (`tools/requirements.txt`): Pillow 12.3.0 (which bundles libwebp 1.6.0) and numpy 2.4.6,
  plus scipy 1.18.0 for the cloth tool only, on Python 3.12. These exact versions reproduce the committed bytes. Any other
  Pillow or libwebp gives a valid but different pack.
- **New pack bytes mean new game bytes**, so a repack belongs to a new version: `npm run bump` first
  ([RELEASING.md](RELEASING.md)), then commit the changed `.webp` files and manifests.
- The Malgorath packer has a size ladder (cap 2.4 MB): it re-encodes smaller until the pack fits.
- The html cap (45 MB) leaves about 2.5 MB of headroom at game 6.7 (2 MB at v6.3; 5 MB at game 6.4 after the removed
  textures went; the bundled three.js and the title panorama took the rest). Watch `npm run build`'s report.

## Making new art (paid)

The Hyperreal art was generated with fal.ai models and post-processed locally. The drivers are in `tools/art/`
(`texpacks/`, `purgatory/`, `malgorath/`), and every paid call goes through `tools/art/fal.mjs`:

- **Bring your own key:** `FAL_KEY` in the environment, or in the dotenv file named by `DINGLE_ENV_PATH`, or in the repo's
  `.env`. It is never printed.
- **Fail-closed budget:** the ledger folder is `FAL_LEDGER_DIR` (default `.art-ledger/`, gitignored), holding
  `costs.md` and a `BUDGET` file; `FAL_BUDGET_USD` works when there is no `BUDGET` file. With neither, the client refuses
  to run, and it refuses any call that would pass the cap. To keep using an existing ledger, point `FAL_LEDGER_DIR` at
  its folder (outside the repo).
- Never run an art driver from a test, a CI job or an automated session. Look at the review sheets (5×6 contact sheets)
  before picking anything.
- fal's content checker refuses some prompts (a charred human face was refused; the Malgorath Husk kept the charred
  zombie look instead).
- The terms of the models used (nano-banana-pro, patina, z-image) matter for publishing: read them before you publish
  anything made with them.

## Other embedded data

Some art lives in code, not in `assets/`: the 3D tool models (`TOOL3D` in `src/features/p29_tool_models.js`, from CC0
packs), the 3D weapon models (`WPN3D` in `src/features/p30_weapon_models_icons.js`, one 220 KB line), the gadget and
skateboard models (credited in the Help screen), and the Hyperreal cast's procedural models (`src/texpacks/models/`,
`src/malgorath/hr/models/`). Moving the big data literals out of the code is on the [roadmap](ROADMAP.md).
