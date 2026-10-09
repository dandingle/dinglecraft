#!/usr/bin/env node
// Record a release: npm run release   (after a green `npm run gate`)
// Refuses unless:
//   - GAME_VERSION is above every version in tests/fixtures/shipped.json (a shipped version is frozen);
//   - RELEASE_LABEL is new, or is the label of the newest shipped version (a later cut of that release; labelProblem);
//   - the top PATCH_LOG entry is this version, has lines, and contains no TODO;
//   - out/gate_last.json (written by a green gate) names the SAME html md5 as a fresh build of the current sources;
//   - dist/dinglecraft_v<VER>.html does not already exist with other bytes.
// Then it records { label, bytes, md5, date, parts, assets } in shipped.json (label = RELEASE_LABEL, the public name), regenerates CHANGELOG.md (scripts/changelog.mjs) and
// prints the patch notes plus the gate counts for the announcement. Committing and tagging stay manual.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { REPO, FIX, rel } from './lib/paths.mjs';
import { readVersion, readLabel, cmpVersion, readPatchLog, checkSites, labelProblem } from './lib/version.mjs';

const die = (m) => { console.error('release: ' + m); process.exit(1); };
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const VER = readVersion(REPO);
const LABEL = readLabel(REPO);
const sites = checkSites(REPO);
if (sites.problems.length) die('version/label sites disagree: ' + sites.problems.join('; '));
const SHIPPED_FILE = path.join(FIX, 'shipped.json');
const shippedDoc = JSON.parse(fs.readFileSync(SHIPPED_FILE, 'utf8'));
const shipped = shippedDoc.shipped || {};
for (const v of Object.keys(shipped)) if (cmpVersion(VER, v) <= 0) die(`v${VER} is not above shipped v${v}: bump first (npm run bump -- <maj.min> "<title>")`);

const log = readPatchLog(REPO, VER);
const top = log[0];
if (!top || top.v !== VER || top.label !== LABEL) die('the top PATCH_LOG entry is not {v:GAME_VERSION,label:RELEASE_LABEL,...}');
{ const lp = labelProblem(LABEL, shipped); if (lp) die(lp + ': bump with a new --label'); }
const LABEL_REUSED = Object.values(shipped).some((s) => s.label === LABEL);   /* a later cut of the newest release */
if (!Array.isArray(top.lines) || !top.lines.length) die('the top PATCH_LOG entry has no lines');
if (/TODO/.test(top.title) || top.lines.some((l) => /TODO/.test(l))) die('the top PATCH_LOG entry still says TODO: write the patch notes');

const OUTDIR = path.resolve(process.env.DC_OUT_DIR || path.join(REPO, 'out'));
const gateFile = path.join(OUTDIR, 'gate_last.json');
if (!fs.existsSync(gateFile)) die(`${rel(gateFile)} missing: run a green npm run gate first`);
const gate = JSON.parse(fs.readFileSync(gateFile, 'utf8'));

// Fresh build of the current sources into a private dir (never touches dist/ until the checks pass).
const tmp = path.join(OUTDIR, 'release_build');
fs.rmSync(tmp, { recursive: true, force: true });
const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'build.mjs'), '--strict', '--quiet', '--out', tmp, '--dist', tmp], { stdio: 'inherit' });
if (r.status !== 0) die('the build failed');
const info = JSON.parse(fs.readFileSync(path.join(tmp, 'build.json'), 'utf8'));
if (info.version !== VER) die('build version mismatch');
if (gate.html_md5 !== info.html.md5) die(`out/gate_last.json was for html md5 ${gate.html_md5}, the current build is ${info.html.md5}: run npm run gate again`);
if (gate.version && gate.version !== VER) die(`out/gate_last.json was for v${gate.version}`);

const distDir = path.resolve(process.env.DC_DIST || path.join(REPO, 'dist'));
const distFile = path.join(distDir, info.html.file);
const built = path.join(tmp, info.html.file);
if (fs.existsSync(distFile)) {
  if (md5(fs.readFileSync(distFile)) !== info.html.md5) die(`${rel(distFile)} already exists with other bytes: rebuild it (npm run build) or move it away first`);
} else { fs.mkdirSync(distDir, { recursive: true }); fs.copyFileSync(built, distFile); }
fs.rmSync(tmp, { recursive: true, force: true });

shipped[VER] = { label: LABEL, bytes: info.html.bytes, md5: info.html.md5, date: new Date().toISOString().slice(0, 10), parts: info.parts, assets: info.assets };
shippedDoc.shipped = shipped;
fs.writeFileSync(SHIPPED_FILE, JSON.stringify(shippedDoc, null, 2) + '\n');
console.log(`recorded v${VER} (${LABEL}) in tests/fixtures/shipped.json: ${info.html.bytes} B md5 ${info.html.md5} (frozen from now on)`);

const cl = path.join(REPO, 'scripts', 'changelog.mjs');
if (fs.existsSync(cl)) {
  const c = spawnSync(process.execPath, [cl], { stdio: 'inherit' });
  if (c.status !== 0) die('scripts/changelog.mjs failed (shipped.json is already updated; fix and rerun npm run changelog)');
} else console.log('note: scripts/changelog.mjs not found, CHANGELOG.md not regenerated');

console.log('\n==== ' + LABEL + ' (game v' + VER + '): ' + top.title + ' ====');
for (const l of top.lines) console.log('- ' + l);
if (gate.counts) {
  console.log('\ngate counts (' + (gate.date || 'last gate') + '):');
  for (const [k, v] of Object.entries(gate.counts)) console.log(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
}
if (gate.total !== undefined) console.log('  total: ' + gate.total);
const relTag = LABEL.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
console.log(`\nplay: ${rel(distFile)}\nnext: git add -A && TZ=UTC0 git commit -m "release: ${LABEL} (v${VER}) ${top.title}" && git tag v${VER} && git tag ${LABEL_REUSED ? '-f ' : ''}${relTag}` +
  (LABEL_REUSED ? `\n(${LABEL} is a later cut of the newest release: -f moves the ${relTag} tag onto it)` : ''));
