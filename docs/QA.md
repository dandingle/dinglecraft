# Browser QA (always muted)

The Node suites prove behaviour. Some things only show up in a real browser with real WebGL: how Hyperreal looks, frame
times, shader compiles, the title logo. This page is how to look at the game in a browser **without anyone hearing it**.

## The mute rule

Somebody might be at the computer you are testing on. Every browser session, every time:

1. Launch Chrome with `--mute-audio`.
2. Before the page's own scripts run, merge `{snd:0, mus:0, tp:'og'}` into `localStorage['vx_vox_settings']` (merge,
   never wipe: it holds the player's other settings).
3. After load, and after every evaluation that might create audio: `soundOn=false; if(AC)AC.suspend()`.
4. Never switch Sound or Music on, never click the sound settings, never "just check one sound".

Audio is verified **offline**: the audio suites (`c2_audio`, `m2_audio`) render every sound in Node and measure pitch,
timing, loudness and clicks, and the parity rigs render the build's sounds through an `OfflineAudioContext` in the muted
browser and compare them with the Node render. Debug → "Malgorath: sounds" exists for a human who wants to listen.

## Your own browser and server

- Use **your own** headless Chrome on **your own** debugging port and a profile folder of your own, never someone's
  everyday browser. Built-in editor browser panes usually have no WebGL; check `WebGL2` first.
- Serve the repo with `node scripts/serve.mjs --port <port+100>` (or `npm run serve` for the default 8643). It sends
  `Cache-Control: no-store`, so Chrome never shows you an old build. With any other static server, add `?b=<timestamp>`
  to the URL or disable the cache over the devtools protocol.
- `tools/qa/chrome.sh <port> [profile-dir]` starts headless Chrome muted with the right flags (GPU on, no background
  throttling, 1280×720), with its profile in `out/qa/chrome_<port>` unless you give one. It prints Chrome's PID: stop it
  with `kill <pid>` when you are done. Set `CHROME` if Chrome is not in the standard macOS location.
- `tools/qa/lib/cdp.mjs` is the shared devtools-protocol driver. It does the mute injection on every new document,
  re-mutes after every evaluation, freezes `requestAnimationFrame` from the page's first line (so stepping frames with
  `__vox.frameStep` does not stack up animation loops), points `window.__DINGLE_BRAIN` at a dead port so no AI call is
  ever made, and has `restoreOG()`.

## The quick check

```
npm run build
node tools/qa/boot_check.mjs --launch --port <your port>      # starts and stops its own muted Chrome and server
node tools/qa/boot_check.mjs --port <your port>               # or use the Chrome + server you already started
node tools/qa/windows_check.mjs --browser chrome|edge         # DINGLECRAFT.html from file://, like a double-click (CI runs it
                                                              # on Windows: .github/workflows/windows.yml)
```

`boot_check.mjs` opens `dist/dinglecraft_v<VER>.html` muted, checks WebGL2, three r128, `__vox`, `GAME_VERSION` and that
sound is off, starts an OG world and checks it really renders, switches Hyperreal on and back, and requires zero console
errors throughout. Screenshots and a summary go to `out/qa/boot_check_<time>/`, and the texture pack is put back to OG.
`--build`, `--out` and `--no-hr` are in its header.

## The rigs

The feature rigs from each update live under `tools/qa/<area>/` (texture packs, purgatory, creativity, Malgorath). Each
one's header says what it does, its default port, and its options. They default to the current `dist/` html and write
to `out/qa/<rig>_<time>/`. The bigger ones:

- **texture packs:** in-page scripts for OG parity round trips (OG → Hyperreal → OG must give identical pixels), a 5×6
  photo contact sheet of showcase sites, light and cast checks;
- **purgatory:** the entry ritual, items, bots, the full play session (replays the test pilot's route in a real browser),
  boss and cast photo rigs, Hyperreal performance;
- **creativity:** the end-to-end rig (paint, hang, break, compose, jukebox, save and reload, both packs, the purgatory
  trunk), plus focused painting and music rigs;
- **Malgorath:** the whole fight end to end with per-attack shots and frame timing, a death-reload-checkpoint rig, the
  audio parity render, the Bite, the model and his Hyperreal skin.

Contact sheets are 5×6 tiles, so thirty frames can be judged at once.

- **UI (Release 1.0):** `node tools/qa/ui/ui_qa.mjs --launch --port <p>` opens the title, the HUD, every modal, chat,
  toasts, a boss bar, a creativity editor and the bot panel at 1280x720, 1920x1080 and 2560x1440 at every UI scale, measures
  that every panel sits inside the window without overlaps (a toast over every title view and menu; F3 and the player list
  in the HUD pairs), and writes 5x6 sheets (its header has the options).

Release 1.0 cleared the old known misses: `creativity/cz_qa.mjs`'s patch-notes step (it opens the retired, hidden panel
through `openPatch()` to read `PATCH_LOG`; players cannot reach it) and `release_qa.mjs` read the current
version and its public label (`RELEASE_LABEL`) instead of expecting v6.2 text, and `malgorath/m4_hr_qa.mjs`'s haze-ratio and
moving-hand thresholds were calibrated on the shipped v6.3 file and on game 6.4 (same Malgorath art; the M4-era thresholds
missed on both): it now passes 10 of 10. `texpacks/tC_browser.js` knows the alien has no Hyperreal model any more (21 of 21).
The purgatory photo rigs (`boss_rig.js`, `cast_pg.js`, `photo_pg.js`) write their sheets under `$DC_OUT_DIR/qa/sheets`
when it is set (else `out/qa/sheets`), so lanes working at once do not overwrite each other's sheets.

## Rules of thumb

- **Put `tp:'og'` back** when you finish. `vx_vox_settings` is shared by every page on the same origin, so a saved
  Hyperreal setting makes every later page on that origin boot into Hyperreal.
- **All versions on one origin share one world list.** Test in your own worlds; do not open the player's worlds.
- **Never point a rig at the brain.** It spends real money ([BRAIN.md](BRAIN.md)).
- **Stepping a live page:** `__vox.frameStep` calls `frame()`, which re-arms `requestAnimationFrame`. Freeze rAF (the
  shared driver does) or you will run several game loops at once.
- **Judge Hyperreal on a full build** in a real GPU browser, at more than one quality tier.
- Some rigs need Python with Pillow for contact sheets (`tools/requirements.txt`).
