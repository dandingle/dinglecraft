#!/usr/bin/env node
// DINGLECRAFT release gate: build (--strict) + every suite in tests/gate.json. Node only, no dependencies.
//
//   npm run gate                      the full gate (legacy repeats: smoke.js x6, botsmoke.js x3, feature smokes x2), ~16 min
//   npm test                          = node scripts/gate.mjs --once (every suite once), ~9 min
//   npm run test:quick                = node scripts/gate.mjs --tier quick (repo checks, statics, test.js, og_trace over), ~1 min
//   node scripts/gate.mjs [--once] [--tier NAME] [--group G[,G]] [--only NAME[,NAME]] [--keep-going] [--jobs N] [--no-build] [--list]
//     --group       run only these groups (repo core texpacks purgatory pilot creativity malgorath og_trace); CI runs one per job
//     --only        run only these entries (by gate name, e.g. smoke.js,m4_hr.js)
//     --keep-going  report every failure instead of stopping at the first one (exit 1 at the end)
//     --jobs N      run up to N static/fake-clock entries at once; real-clock smokes always run alone (they budget by wall time)
//     --no-build    test the existing build (default: scripts/build.mjs --strict first)
//   env: DC_BUILD (build dir, default build/), DC_DIST (default dist/), DC_OUT_DIR (suite outputs, default out/)
//
// Prints "name: <last line>" per run, like the legacy gate.sh. On a failure: the FAIL/CRASH/Error/first-divergence lines (<= 40),
// then "GATE FAILED at <name>". Only a FULL green gate (no --once/--tier/--group/--only) writes out/gate_last.json, which
// scripts/release.mjs requires ({html_md5, version, counts, total, suites_total, steps_total, executed, seconds, date}); a failed
// full gate deletes it. total = suites_total (the game suites under tests/) + steps_total (brain/scan/fal self-tests).
// Never prints source text: suites print check names (and file:line for scan hits), never source or the og_trace fixtures.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const KNOWN = ['--once', '--tier', '--group', '--only', '--keep-going', '--jobs', '--no-build', '--list', '--help'];
for (let i = 0; i < argv.length; i++) {
  if (!KNOWN.includes(argv[i])) { console.error('gate: unknown option ' + argv[i] + ' (see the header of scripts/gate.mjs)'); process.exit(2); }
  if (['--tier', '--group', '--only', '--jobs'].includes(argv[i])) i++;
}
if (has('--help')) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport ')[0]); process.exit(0); }
const ONCE = has('--once'), TIER = opt('--tier'), KEEP = has('--keep-going'), NOBUILD = has('--no-build');
const GROUPS = opt('--group') ? opt('--group').split(',').map((s) => s.trim()).filter(Boolean) : null;
const ONLY = opt('--only') ? opt('--only').split(',').map((s) => s.trim()).filter(Boolean) : null;
const JOBS = Math.max(1, +(opt('--jobs') || 1) | 0);
const FULL = !ONCE && !TIER && !GROUPS && !ONLY;

const BUILD = path.resolve(process.env.DC_BUILD || path.join(REPO, 'build'));
const DIST = path.resolve(process.env.DC_DIST || path.join(REPO, 'dist'));
const OUT = path.resolve(process.env.DC_OUT_DIR || path.join(REPO, 'out'));
const rel = (p) => { const r = path.relative(REPO, p); return r && !r.startsWith('..') && !path.isAbsolute(r) ? r.split(path.sep).join('/') : path.basename(p); };

const G = JSON.parse(fs.readFileSync(path.join(REPO, 'tests', 'gate.json'), 'utf8'));
for (const g of GROUPS || []) if (!G.groups.includes(g)) { console.error(`gate: unknown group ${g} (groups: ${G.groups.join(' ')})`); process.exit(2); }
if (TIER && !(G.tiers && G.tiers[TIER])) { console.error(`gate: unknown tier ${TIER}`); process.exit(2); }
const names = new Set([...G.entries, ...(G.steps || [])].map((e) => e.name));
for (const n of ONLY || []) if (!names.has(n)) { console.error(`gate: unknown entry ${n}`); process.exit(2); }

const pick = (e) => (!GROUPS || GROUPS.includes(e.group)) && (!TIER || (e.tiers || []).includes(TIER)) && (!ONLY || ONLY.includes(e.name));
const items = [
  ...G.entries.map((e) => ({ ...e, kind: 'suite' })),
  ...(G.steps || []).map((s) => ({ ...s, kind: 'step', repeat: 1, clock: 'static' })),
].filter(pick);
if (has('--list')) {
  for (const g of G.groups) for (const e of items.filter((x) => x.group === g))
    console.log(`${g.padEnd(10)} ${e.name.padEnd(18)} x${ONCE ? 1 : e.repeat}  ${e.clock.padEnd(6)} ${e.kind === 'step' ? e.cmd.join(' ') : e.suite + (e.args ? ' ' + e.args.join(' ') : '')}${e.when ? '  (when ' + JSON.stringify(e.when) + ')' : ''}`);
  process.exit(0);
}

const T0 = Date.now();
const counts = {};
let failed = 0;
const gateLast = path.join(OUT, 'gate_last.json');

// 1. build --------------------------------------------------------------------------------------------------
let info = null;
if (!NOBUILD) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'build.mjs'), '--strict', '--quiet', '--out', BUILD, '--dist', DIST], { encoding: 'utf8' });
  const outTxt = ((r.stdout || '') + (r.stderr || '')).trim();
  if (r.status !== 0) {
    console.log(outTxt.split('\n').filter(Boolean).slice(-40).join('\n'));
    console.log('GATE FAILED at build');
    if (FULL) fs.rmSync(gateLast, { force: true });
    process.exit(1);
  }
  if (outTxt) console.log(outTxt);
}
try { info = JSON.parse(fs.readFileSync(path.join(BUILD, 'build.json'), 'utf8')); } catch (e) { console.log('gate: no build at ' + rel(BUILD) + ' (run without --no-build)'); console.log('GATE FAILED at build'); process.exit(1); }
console.log(`build: v${info.version} ${info.html.file} ${info.html.bytes} B md5 ${info.html.md5}${info.frozen === 'match' ? ' (frozen: byte-identical to the shipped file)' : ''}`);

// 2. the core quartet runs from a copy next to the built game.js (they require('./game.js'); never edit them) -----------
for (const f of ['stubs.js', 'test.js', 'smoke.js', 'botsmoke.js']) fs.copyFileSync(path.join(REPO, 'tests', 'core', f), path.join(BUILD, f));
fs.mkdirSync(OUT, { recursive: true });

// 3. runs -----------------------------------------------------------------------------------------------------------
const whenOk = (e) => {
  if (!e.when) return true;
  if (e.when.file && !fs.existsSync(path.join(REPO, e.when.file))) return false;
  if (e.when.env && !process.env[e.when.env]) return false;
  return true;
};
const whenWhy = (e) => (e.when.file ? e.when.file + ' missing' : e.when.env + ' not set');
function runOne(e) {
  return new Promise((resolve) => {
    const env = { ...process.env, ...(e.env || {}), DC_BUILD: BUILD, DC_DIST: DIST, DC_OUT_DIR: OUT };
    for (const k of e.unsetEnv || []) delete env[k];
    let cmd, args, cwd = REPO;
    if (e.kind === 'step') { cmd = e.cmd[0] === 'node' ? process.execPath : e.cmd[0]; args = e.cmd.slice(1); }
    else if (e.runIn === 'build') { cmd = process.execPath; args = [path.join(BUILD, path.basename(e.suite)), ...(e.args || [])]; cwd = BUILD; }
    else { cmd = process.execPath; args = [path.join(REPO, e.suite), ...(e.args || [])]; }
    const t0 = Date.now();
    const p = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
    const kill = setTimeout(() => { out += '\nCRASH gate timeout (' + (e.timeout || 1800) + ' s)'; p.kill('SIGKILL'); }, (e.timeout || 1800) * 1000);
    p.on('close', (code) => {
      clearTimeout(kill);
      const lines = out.split('\n').filter((l) => l.trim());
      const last = lines[lines.length - 1] || '(no output)';
      const m = /^(\d+) passed, (\d+) failed$/.exec(last.trim());
      const sk = lines.map((l) => /^\s*\((\d+) skipped: /.exec(l)).filter(Boolean).pop();
      const okRun = code === 0 && (e.kind === 'step' || (!!m && +m[2] === 0));
      resolve({ e, ok: okRun, code, last, lines, passed: m ? +m[1] : null, failed: m ? +m[2] : null, skipped: sk ? +sk[1] : 0, s: (Date.now() - t0) / 1000 });
    });
  });
}
function report(r) {
  const c = counts[r.e.name] || (counts[r.e.name] = { passed: r.passed, failed: 0, runs: 0, skipped: r.skipped, seconds: 0, group: r.e.group });
  c.runs++; c.seconds = +(c.seconds + r.s).toFixed(1);
  if (r.passed !== null && c.passed === null) c.passed = r.passed;
  if (r.failed) c.failed += r.failed;
  if (!r.ok) {
    console.log(r.lines.filter((l) => /FAIL|CRASH|Error|first divergence|^   /.test(l)).slice(0, 40).join('\n'));
    console.log(`${r.e.name}: ${r.last}`);
    console.log(`GATE FAILED at ${r.e.name}`);
    failed++;
    return false;
  }
  console.log(`${r.e.name}: ${r.last}`);
  return true;
}
async function pool(list, n) {
  const res = []; let i = 0, stop = false;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (i < list.length && !stop) { const r = await runOne(list[i++]); res.push(r); if (!report(r) && !KEEP) stop = true; }
  }));
  return !stop;
}
const finish = () => {
  const secs = (Date.now() - T0) / 1000;
  const total = Object.values(counts).reduce((a, c) => a + (c.passed || 0), 0);
  const executed = Object.values(counts).reduce((a, c) => a + (c.passed || 0) * c.runs, 0);
  // total = every distinct check; suites_total = the game suites only (tests/**, the docs/PARITY.md "one pass" figure);
  // steps_total = the tool steps that print counts (brain selftest, scan/fal self-tests)
  const isStep = new Set((G.steps || []).map((s) => s.name));
  const suites_total = Object.entries(counts).filter(([n]) => !isStep.has(n)).reduce((a, [, c]) => a + (c.passed || 0), 0);
  const rec = { html_md5: info.html.md5, version: info.version, mode: FULL ? 'full' : ONCE ? 'once' : TIER ? 'tier:' + TIER : 'partial', green: failed === 0,
    groups: GROUPS || G.groups, counts, total, suites_total, steps_total: total - suites_total, executed, seconds: Math.round(secs),
    date: new Date().toISOString(), node: process.version };
  fs.writeFileSync(path.join(OUT, 'gate_run.json'), JSON.stringify(rec, null, 1) + '\n');
  if (FULL) { if (failed === 0) fs.writeFileSync(gateLast, JSON.stringify(rec, null, 1) + '\n'); else fs.rmSync(gateLast, { force: true }); }
  if (failed) { console.log(`GATE FAILED (${failed} failing run${failed > 1 ? 's' : ''}) in ${Math.round(secs)} s`); process.exit(1); }
  console.log(`GATE OK -> ${rel(path.join(DIST, info.html.file))} (${info.html.bytes} bytes): ${total} checks (suites ${suites_total} + tools ${total - suites_total}), ${executed} executed, ${Math.round(secs)} s` +
    (FULL ? ' (out/gate_last.json written)' : ` (${rec.mode}: out/gate_last.json not touched)`));
  process.exit(0);
};

for (const g of G.groups) {
  const list = items.filter((e) => e.group === g);
  if (!list.length) continue;
  const skips = list.filter((e) => !whenOk(e));
  if (skips.length) {
    const byWhy = {};
    for (const e of skips) (byWhy[whenWhy(e)] = byWhy[whenWhy(e)] || []).push(e.name);
    for (const [why, n] of Object.entries(byWhy)) console.log(`SKIP ${n.join(', ')} (${why})`);
  }
  const live = list.filter(whenOk);
  const maxR = ONCE ? 1 : Math.max(...live.map((e) => e.repeat || 1), 1);
  for (let k = 1; k <= maxR; k++) {
    const pass = live.filter((e) => (ONCE ? 1 : e.repeat || 1) >= k);
    if (JOBS > 1) {
      if (!(await pool(pass.filter((e) => e.clock !== 'real'), JOBS)) && !KEEP) finish();
      if (!(await pool(pass.filter((e) => e.clock === 'real'), 1)) && !KEEP) finish();
    } else if (!(await pool(pass, 1)) && !KEEP) finish();
  }
}
finish();
