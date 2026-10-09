#!/usr/bin/env node
/* repack.mjs: re-encode the Hyperreal / Malgorath art from the source PNGs into assets/packed/ (`npm run repack`).

   npm run repack -- [--src DIR] [--mg-src DIR] [--only hr|mg] [--dest DIR] [--work DIR] [--keep] [-j N]

   --src     the Hyperreal workspace (holds final/ and final_ent/), default $DC_ART_SRC
   --mg-src  the Malgorath workspace (holds final/), default $DC_MG_ART_SRC
   --only    repack one set; the other set is kept as committed
   --dest    where the packed sets go (default assets/packed); point it at a scratch folder for a dry run / proof
   --work    folder for the intermediate files (a fresh repack-<time> subfolder is made in it; default out/, gitignored)
   --keep    keep the intermediate .gen.js files (never print them: their lines are megabytes long)

   Steps: python3 tools/art/texpacks/pack_assets.py and/or tools/art/malgorath/pack_mg.py write the generated scripts into
   out/repack-<time>/, tools/assets/unpack.mjs turns them into header/meta/order sidecars + one .webp per key in a staging copy of
   assets/packed, the build's own assembler (scripts/lib/assets.mjs) re-assembles the staging copy and must reproduce the
   packers' bytes exactly (and their manifest sha1s), and only then is the staging copy moved to --dest.
   Python needs Pillow + numpy (tools/requirements.txt). The pinned versions reproduce the committed bytes; any other
   Pillow/libwebp makes a valid but different pack (a version bump: see docs/RELEASING.md). Never touches the sources. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { unpack } from './unpack.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const relp = (p) => { const r = path.relative(REPO, p); return r && !r.startsWith('..') && !path.isAbsolute(r) ? r.split(path.sep).join('/') : path.basename(p); };

const a = process.argv.slice(2);
const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
if (a.includes('--help')) {
  console.log('usage: npm run repack -- [--src DIR] [--mg-src DIR] [--only hr|mg] [--dest DIR] [--work DIR] [--keep] [-j N]');
  process.exit(0);
}
const only = opt('--only');
if (only && !['hr', 'mg'].includes(only)) { console.error('repack: --only takes hr or mg'); process.exit(2); }
const sets = only ? [only] : ['hr', 'mg'];
const src = { hr: opt('--src') || process.env.DC_ART_SRC, mg: opt('--mg-src') || process.env.DC_MG_ART_SRC };
const envName = { hr: 'DC_ART_SRC (or --src)', mg: 'DC_MG_ART_SRC (or --mg-src)' };
for (const s of sets) {
  if (!src[s]) { console.error(`repack: ${envName[s]} is not set: point it at the ${s === 'hr' ? 'Hyperreal' : 'Malgorath'} workspace (docs/ASSETS.md)`); process.exit(2); }
  src[s] = path.resolve(src[s]);
  if (!fs.statSync(src[s], { throwIfNoEntry: false })?.isDirectory()) { console.error(`repack: ${envName[s]} does not name a folder`); process.exit(2); }
}
const dest = path.resolve(opt('--dest') || path.join(REPO, 'assets', 'packed'));
const jobs = opt('-j');
const PY = process.env.PYTHON || 'python3';
/* a fresh private subfolder: never wipe a folder the caller named */
const work = path.join(path.resolve(opt('--work') || path.join(REPO, 'out')), `repack-${Date.now()}-${process.pid}`);
const t0 = Date.now();

fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

function py(script, args) {
  const r = spawnSync(PY, [path.join(REPO, script), ...args], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  for (const line of out.split('\n').filter(Boolean).slice(-12)) console.log('  ' + line.slice(0, 300));
  if (r.status !== 0) { console.error(`repack: ${path.basename(script)} failed (exit ${r.status})`); process.exit(1); }
}

/* 1. encode */
const gen = {};
if (sets.includes('hr')) {
  gen.hr = path.join(work, 'hr_assets.gen.js');
  console.log('repack hr: pack_assets.py (std) ...');
  py('tools/art/texpacks/pack_assets.py', ['--src', src.hr, '--out', gen.hr, ...(jobs ? ['-j', jobs] : [])]);
}
if (sets.includes('mg')) {
  gen.mg = path.join(work, 'mg_assets.gen.js');
  console.log('repack mg: pack_mg.py ...');
  py('tools/art/malgorath/pack_mg.py', ['--src', src.mg, '--out', gen.mg]);
}

/* 2. unpack into a staging copy of the packed layout (the untouched set is copied as committed) */
const stageRoot = path.join(work, 'stage');
const stagePacked = path.join(stageRoot, 'assets', 'packed');
fs.mkdirSync(stagePacked, { recursive: true });
for (const s of ['hr', 'mg']) if (!gen[s]) fs.cpSync(path.join(REPO, 'assets', 'packed', s), path.join(stagePacked, s), { recursive: true });
/* seed the staging copy with the current dest so unpack reports what changed */
for (const s of Object.keys(gen)) { const d = path.join(dest, s); if (fs.existsSync(d)) fs.cpSync(d, path.join(stagePacked, s), { recursive: true }); }
unpack({ hr: gen.hr, mg: gen.mg, dest: stagePacked });

/* 3. the build's assembler must reproduce the packers' bytes and the manifest pins */
const { assembleAssets } = await import(pathToFileURL(path.join(REPO, 'scripts', 'lib', 'assets.mjs')).href);
const asm = assembleAssets(stageRoot);
const problems = [...asm.problems];
for (const s of Object.keys(gen)) {
  const want = fs.readFileSync(gen[s], 'latin1');
  if (asm[s] !== want) problems.push(`${s}: the assembler does not reproduce the packer's ${s}_assets.gen.js byte for byte`);
}
if (problems.length) { for (const p of problems) console.error('repack: ' + p); console.error('repack: nothing was written to ' + relp(dest)); process.exit(1); }

/* 4. move into place */
for (const s of Object.keys(gen)) {
  const d = path.join(dest, s), old = d + '.old-' + process.pid;
  fs.mkdirSync(dest, { recursive: true });
  if (fs.existsSync(d)) fs.renameSync(d, old);
  fs.cpSync(path.join(stagePacked, s), d, { recursive: true });
  fs.rmSync(old, { recursive: true, force: true });
}
const pin = JSON.parse(fs.readFileSync(path.join(REPO, 'assets', 'packed', 'hr', 'manifest.json'), 'utf8')).pillow;
if (gen.hr) {
  const now = JSON.parse(fs.readFileSync(path.join(work, 'hr_assets.manifest.json'), 'utf8')).pillow;
  if (pin && now !== pin) console.log(`  note: packed with Pillow ${now}; the committed pack was made with ${pin} (tools/requirements.txt): expect different bytes`);
}
console.log(`repack: ${Object.keys(gen).join(' + ')} -> ${relp(dest)}/ OK: assembler round trip byte-identical, manifest pins match`
  + ` (hr sha1 ${asm.info.hrSha1.slice(0, 8)}, mg sha1 ${asm.info.mgSha1.slice(0, 8)}; ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
if (dest === path.join(REPO, 'assets', 'packed')) console.log('  next: npm run build (a new pack changes the html: bump the version first if the current one is shipped)');
if (!a.includes('--keep')) fs.rmSync(work, { recursive: true, force: true });
