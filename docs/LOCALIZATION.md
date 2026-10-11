Choose **Language → Japanese** on the title screen or in Settings. Both selectors deliberately keep `Language`, `English` and `Japanese` in English. The choice is remembered in this browser and can be changed without reloading or discarding a world.

Edit `src/ui/i18n_ja.js`: each English display string is a key; its Japanese translation is the value. Keep keys unchanged. This editable catalogue covers built-in menus, items, tooltips, controls, help, dialogue, notifications, editors, minigames and the update archive. Stylized character names and titles (including `MALGORATH, THE WORLD-EATER`), film/song titles and credits retain the original identity. Usernames, world names, player-written chat, artwork titles, save data and internal identifiers are not translated. Live AI-generated conversation is not a fixed game string and remains as generated.

`src/ui/i18n.js` applies the catalogue to DOM text, tooltips and canvas text. It remembers original English text so switching back restores it. New interface text is translated when inserted. Do not change engine names or item IDs to translate them.

M PLUS 1 is used for interface and canvas text. The stylesheet in `html/00_open.html` loads the font from Google Fonts; that first font download needs internet. If unavailable, a Japanese-capable system fallback is used. Gameplay and translations do not require a translation service.

## Uploading the changes yourself

Extract the source ZIP at your repository root, preserving the `src/`, `html/`, `scripts/`, `tests/` and `docs/` paths. Replace the matching files and add the new ones. Do not upload the ZIP itself as game source. The files are based on upstream Dinglecraft 6.9; review differences before replacing files if your fork has additional changes.

Run `npm run build`. The package/game versions stay `6.9.0` / `6.9`, and the release label remains `Release 1.0`. This repository protects already-shipped files: because the localization changes an existing version, the new playable file is written to `build/dinglecraft_v6.9.html`, not over the original `dist/` file. A strict release build intentionally rejects changes to a frozen release; no version bump is made here.

The separate downloadable localized HTML is playable directly. If your repository serves `index.html`, use that generated playable HTML as `index.html` at the hosting entry point. Keep the source catalogue too, so future translations remain editable.

## Checking translation changes

Run `node tests/ui/i18n.test.mjs` and `npm run build`. `node scripts/i18n-inventory.mjs` writes candidate source strings to `out/i18n-inventory.json` for review. Candidates include some internal code/recipe strings, so the inventory is a review aid, not a claim of automatic linguistic completeness. Do not run the translation assembler without an explicit reviewed mapping: normal edits can be made directly to the bundle.
al edits can be made directly to the bundle.
