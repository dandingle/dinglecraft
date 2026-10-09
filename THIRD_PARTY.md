# Third-party components

DINGLECRAFT is original work covered by [LICENSE](LICENSE), with the exceptions listed here. **Each component below
stays under its own licence**, whatever LICENSE says about the rest of the game. The in-game Help screen (Help &
Controls → Credits) carries the same credits.

## 3D models under CC-BY 3.0

Licence: Creative Commons Attribution 3.0, <https://creativecommons.org/licenses/by/3.0/>. Each model was downloaded from
poly.pizza, **converted to packed vertex data and recoloured** for the game, and embedded in `const WPN3D` in
`src/features/p30_weapon_models_icons.js`. You may reuse these models under CC-BY 3.0 (credit the author, not us).

| In the game | Title | Author | Source |
|---|---|---|---|
| the skateboard (`skate`) | Skateboard | Poly by Google | <https://poly.pizza/m/7Dfn4VtTCWY> |
| Double-Jump Boots (`gd_dj`) | Boots | Poly by Google | <https://poly.pizza/m/7HbqG8RwRcA> |
| the Jetpack (`gd_jet`) | Jetpack | Roman Miller | <https://poly.pizza/m/8VafbXInymc> |
| the Grappling Anchor (`gd_grap`) | Anchor | Poly by Google | <https://poly.pizza/m/fjAwIosTQHy> |
| the Hang Glider (`gd_glide`) | Hang glider | Poly by Google | <https://poly.pizza/m/4WmEAyjrvW5> |
| the Loot Magnet (`gd_mag`) | Magnet | Poly by Google | <https://poly.pizza/m/dD2RIIea6WR> |
| the Pocket Trampoline (`gd_tramp`) | Trampoline | Poly by Google | <https://poly.pizza/m/44njxNdC0gt> |

## 3D models under CC0 (courtesy credits)

Licence: CC0 1.0 (public domain dedication), <https://creativecommons.org/publicdomain/zero/1.0/>. No credit is required;
we give it anyway, with thanks.

| In the game | Title | Author | Source |
|---|---|---|---|
| the pistol (`WPN3D.pistol`) | Pistol | Quaternius (Ultimate Gun Pack) | <https://poly.pizza/m/52kQzphmeF> |
| the shotgun (`WPN3D.shotgun`) | Shotgun | Quaternius (Ultimate Gun Pack) | <https://poly.pizza/m/DcNE0HVdW8> |
| the SMG (`WPN3D.smg`) | Submachine Gun | Quaternius (Ultimate Gun Pack) | <https://poly.pizza/m/7ehatxr7FY> |
| the sniper rifle (`WPN3D.sniper`) | Sniper Rifle | Quaternius (Ultimate Gun Pack) | <https://poly.pizza/m/ASOMZIErq3> |
| the Pig Cannon (`WPN3D.gd_pig`) | Cannon | Quaternius | <https://poly.pizza/m/J15vlPVvKK> |
| the bow (`WPN3D.bow`) | from KayKit Adventurers | Kay Lousberg (KayKit) | per the original build notes; the source file was not located |
| pickaxe, axe, shovel (`TOOL3D`, `src/features/p29_tool_models.js`) | from the Survival Kit | Kenney | <https://kenney.nl> |
| sword (`TOOL3D`) | from KayKit Adventurers | Kay Lousberg (KayKit) | <https://kaylousberg.com> |

Every other mesh in `WPN3D` was modelled for DINGLECRAFT and is covered by LICENSE.

## Code

| Component | Licence | How it is used |
|---|---|---|
| [three.js](https://threejs.org) r128 | MIT, copyright 2010-2021 three.js authors (full text: [`assets/vendor/three.LICENSE`](assets/vendor/three.LICENSE)) | bundled verbatim as `assets/vendor/three.r128.min.js` (byte-identical to the official r128 `three.min.js`, its MIT header kept) and inlined into the built html, with the full licence text in a comment just before it, so the game needs no internet |
| three.js ACES filmic tone-mapping formula | MIT (three.js) | re-implemented in the Hyperreal composite pass (`src/texpacks/tB_post.js`) |

The game itself has no npm dependencies.

## The AI brain's npm packages

`brain/` (the optional local server for the AI players) installs these with `npm ci --prefix brain`. They are listed in
`brain/package.json` and `brain/package-lock.json` and are never committed (`brain/node_modules/` is gitignored).

| Package | Version | Licence |
|---|---|---|
| @anthropic-ai/sdk | 0.131.0 | MIT |
| @babel/runtime | 7.29.7 | MIT |
| @stablelib/base64 | 1.0.1 | MIT |
| fast-sha256 | 1.3.0 | Unlicense |
| json-schema-to-ts | 3.1.1 | MIT |
| standardwebhooks | 1.1.1 | MIT |
| ts-algebra | 2.0.0 | MIT |

## Everything else

Original to DINGLECRAFT and covered by [LICENSE](LICENSE): the code, the OG art (drawn in code at runtime), every sound
and piece of music (synthesised in code), the title logo, and the Hyperreal textures (generated with AI image models for
this project and edited locally; see LICENSE for what that means). No fonts are shipped: the game uses the fonts already
on your computer.

DINGLECRAFT is an independent fan-made game, inspired by Minecraft. It is not an official Minecraft product and is not
approved by or associated with Mojang or Microsoft.
