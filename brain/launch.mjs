/* DINGLECRAFT AI brain launcher (cross-platform; the macOS double-click version is
   "Start AI Brain.command" in the repo root, which calls this file).

   node brain/launch.mjs [--no-open] [--no-build]

   1. checks Node >= 20;
   2. installs the Anthropic SDK from brain/package-lock.json on first run (npm ci);
   3. builds the game (node scripts/build.mjs) if the game folder has no dinglecraft_v*.html;
   4. starts the brain (brain/dingle-brain.mjs) in this terminal;
   5. opens http://127.0.0.1:<port>/ in the default browser once /health answers.

   Settings come from the environment (see .env.example): DINGLE_BRAIN_PORT, DINGLE_GAME_DIR,
   DINGLE_NO_OPEN=1 (same as --no-open). The key is read by the brain itself, never here. */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BRAIN_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(BRAIN_DIR, '..');
const VERSION_RE = /^dinglecraft_v(\d+)\.(\d+)\.html$/;
const args = new Set(process.argv.slice(2));
const noOpen = args.has('--no-open') || process.env.DINGLE_NO_OPEN === '1';
const noBuild = args.has('--no-build');
const port = Number(process.env.DINGLE_BRAIN_PORT || 8644);
const say = (s = '') => console.log('  ' + s);
const win = process.platform === 'win32';

function fail(msg) { say(msg); process.exit(1); }

say();
say('===========================================');
say('  DINGLECRAFT AI BRAIN - starting up');
say('===========================================');
say();

const major = Number(process.versions.node.split('.')[0]);
if (!(major >= 20)) fail(`Your Node.js is too old (found v${process.versions.node}, need 20 or newer - 22 is best). Install it from https://nodejs.org`);

/* 2. the SDK */
if (!fs.existsSync(path.join(BRAIN_DIR, 'node_modules', '@anthropic-ai', 'sdk', 'package.json'))) {
  say('First run: installing the Anthropic SDK from the lockfile (one-off, takes a few seconds)...');
  const r = spawnSync(win ? 'npm.cmd' : 'npm', ['ci', '--no-audit', '--no-fund'], { cwd: BRAIN_DIR, stdio: 'inherit', shell: win });
  if (r.status !== 0) fail('npm ci failed - check your internet connection and try again.');
  say();
}

/* 3. the game */
const gameDir = path.resolve(process.env.DINGLE_GAME_DIR || path.join(REPO, 'dist'));
const hasGame = () => { try { return fs.readdirSync(gameDir).some((n) => VERSION_RE.test(n)); } catch { return false; } };
if (!hasGame()) {
  if (noBuild || process.env.DINGLE_GAME_DIR) {
    say(`No dinglecraft_v*.html in ${path.relative(REPO, gameDir) || gameDir} - the brain will start, but there is no game to serve yet.`);
  } else {
    say('No game build yet: building it (node scripts/build.mjs, a second or two)...');
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'build.mjs'), '--quiet'], { cwd: REPO, stdio: 'inherit' });
    if (r.status !== 0 || !hasGame()) fail('The build failed (see above). Run `npm run build` to see why.');
    say();
  }
}

/* 4. the brain */
say('Keep this window open while you play. Ctrl+C stops the brain.');
say('Emergency stop without closing: create a file named STOP in the brain folder.');
say();
const child = spawn(process.execPath, [path.join(BRAIN_DIR, 'dingle-brain.mjs')], { cwd: REPO, stdio: 'inherit' });

/* 5. open the page once it answers */
let opened = false;
function health() {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 1500, headers: { Host: `127.0.0.1:${port}` } }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}
function openURL(url) {
  const cmd = process.platform === 'darwin' ? ['open', [url]] : win ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  try { spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).unref(); return true; } catch { return false; }
}
(async () => {
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 60 && child.exitCode === null; i++) {
    if (await health()) {
      if (noOpen) say(`The brain is up: open ${url} in your browser.`);
      else if (openURL(url)) say(`Opened ${url} in your browser. Have fun!`);
      else say(`Open ${url} in your browser. Have fun!`);
      opened = true;
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!opened && child.exitCode === null) say(`(The brain didn't answer within 30 s - once it's up, open ${url} yourself.)`);
})();

/* Ctrl+C reaches the brain too (same process group); wait for it to say goodbye */
process.on('SIGINT', () => {});
process.on('SIGTERM', () => { try { child.kill('SIGTERM'); } catch { /* ignore */ } });
child.on('exit', (code, signal) => {
  say();
  if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') say('The brain has stopped. The bots will run on autopilot until you start it again.');
  else say('The brain stopped with an error (see above).');
  process.exit(code == null ? 0 : code);
});
