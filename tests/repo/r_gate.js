// r_gate: the test suite's own contract (docs/TESTING.md). node tests/repo/r_gate.js
// tests/gate.json lists every suite (and every listed suite exists), keeps the legacy repeats, accounts for every legacy count; the
// frozen core quartet is byte-identical to the pins; the og_trace goldens are present and well formed (checked, never printed);
// caps come from scripts/guards.json only; nothing under tests/ names an absolute path, a private term or the old layout; suites write only
// under out/; CI runs every gate group. Prints check names only ("FAIL <name>"); last line "N passed, M failed".
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..', '..');
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
let pass = 0, fail = 0;
function ok(n, c) { if (c) pass++; else { fail++; console.log('FAIL ' + n); } return !!c; }
const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(REPO, rel));
const walk = (dir, out = []) => { for (const d of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
  const r = dir + '/' + d.name; if (d.isDirectory()) walk(r, out); else out.push(r); } return out; };

let G = null;
try { G = JSON.parse(read('tests/gate.json')); } catch (e) { /* reported below */ }
ok('tests/gate.json parses', !!G);
if (!G) { console.log(pass + ' passed, ' + fail + ' failed'); process.exit(1); }
const E = G.entries || [], S = G.steps || [];

// ---- groups, entries, files
const GROUPS = ['repo', 'core', 'texpacks', 'purgatory', 'pilot', 'creativity', 'malgorath', 'og_trace'];
ok('gate groups are, in order: ' + GROUPS.join(' '), JSON.stringify(G.groups) === JSON.stringify(GROUPS));
ok('every entry names a known group, a suite, a clock (static|real|fake) and a repeat >= 1',
  E.every((e) => GROUPS.includes(e.group) && typeof e.suite === 'string' && ['static', 'real', 'fake'].includes(e.clock) && e.repeat >= 1 && typeof e.name === 'string'));
const names = [...E, ...S].map((e) => e.name);
ok('gate entry names are unique', new Set(names).size === names.length);
const missing = E.filter((e) => !exists(e.suite)).map((e) => e.suite);
ok('every listed suite exists' + (missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''), missing.length === 0);
const SUITE_DIRS = ['tests/core', 'tests/texpacks', 'tests/purgatory', 'tests/pilot', 'tests/creativity', 'tests/malgorath', 'tests/repo', 'tests/ui'];
const listed = new Set([...E.map((e) => e.suite), ...(G.helpers || [])]);
const unlisted = SUITE_DIRS.flatMap((d) => walk(d)).filter((f) => f.endsWith('.js') && !listed.has(f));
ok('every .js under the suite dirs is a gate entry or a listed helper' + (unlisted.length ? ' (unlisted: ' + unlisted.join(', ') + ')' : ''), unlisted.length === 0);
ok('helpers exist', (G.helpers || []).every(exists));
ok('steps: the changelog check runs (scripts/changelog.mjs --check)', S.some((s) => s.name === 'changelog' && s.cmd.join(' ') === 'node scripts/changelog.mjs --check') && exists('scripts/changelog.mjs'));
ok('the brain selftest step runs with every key variable unset', S.some((s) => s.name === 'brain selftest' && ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'FAL_KEY'].every((k) => (s.unsetEnv || []).includes(k))));
const stepCmd = (n) => ((S.find((s) => s.name === n) || {}).cmd || []).join(' ');
ok('steps: the tools self-tests and the secrets scan run (scan_selftest, fal_selftest with FAL_KEY unset, scan_secrets)',
  stepCmd('scan selftest') === 'node tools/scan_selftest.mjs' && stepCmd('fal selftest') === 'node tools/art/fal_selftest.mjs' &&
  stepCmd('secrets scan') === 'node tools/scan_secrets.mjs' && ((S.find((s) => s.name === 'fal selftest') || {}).unsetEnv || []).includes('FAL_KEY') &&
  ['tools/scan_selftest.mjs', 'tools/art/fal_selftest.mjs', 'tools/scan_secrets.mjs'].every(exists));

// ---- the legacy gate's repeats and counts
const rep = (n) => (E.find((e) => e.name === n) || {}).repeat;
const smokes = E.filter((e) => /\/[tpcm][0-9A-C]_smoke\.js$/.test(e.suite) || /p4_boss|p5_bots/.test(e.suite));
ok('legacy repeats kept: smoke.js x6, botsmoke.js x3, every feature smoke + p4_boss + p5_bots x2 (' + smokes.length + '), everything else x1',
  rep('smoke.js') === 6 && rep('botsmoke.js') === 3 && smokes.length === 18 && smokes.every((e) => e.repeat === 2) &&
  E.filter((e) => !smokes.includes(e) && !['smoke.js', 'botsmoke.js'].includes(e.name)).every((e) => e.repeat === 1));
ok('the core quartet runs next to the built game.js (runIn build), the feature suites from the repo',
  ['test.js', 'smoke.js', 'botsmoke.js'].every((n) => (E.find((e) => e.name === n) || {}).runIn === 'build') && E.filter((e) => e.group !== 'core').every((e) => !e.runIn));
const L = (G.legacy || {}).counts || {}, RT = (G.legacy || {}).retired || {};
const AD = Object.fromEntries(Object.entries(G.added || {}).filter(([k]) => k !== '_doc'));   /* suites added after the split, each with its reason */
const noLegacy = E.filter((e) => e.group !== 'repo' && !/_real\.js$/.test(e.name) && !(e.name in L) && !(e.name in AD)).map((e) => e.name);
ok('every gate suite has its legacy count recorded or is listed in added (with a reason)' + (noLegacy.length ? ' (' + noLegacy.join(', ') + ')' : ''), noLegacy.length === 0);
ok('every suite in added is in the gate, has no legacy count and gives a reason', Object.entries(AD).every(([n, why]) => names.includes(n) && !(n in L) && typeof why === 'string' && why.length > 20));
const legacyOnly = Object.keys(L).filter((n) => !names.includes(n));
ok('every legacy suite is still in the gate or recorded as retired (' + legacyOnly.join(', ') + ')', legacyOnly.every((n) => RT[n] === L[n]));
ok('the retired legacy checks total 156 (63 splice-era checks + 93 og_trace parity checks)', Object.values(RT).reduce((a, b) => a + b, 0) === 156);

// ---- the frozen core quartet
const PINS = { 'stubs.js': ['e2be2e4ef146026285c55641a1e007c6', 10664], 'test.js': ['85d8df887b9429546693add63f898876', 12036],
  'smoke.js': ['9ef6d1bd0d73ec7fd42ec7d14c5e27b3', 62050], 'botsmoke.js': ['3f613a13692b6ddb1c8448f217c8f25b', 72130] };
/* v6.8 (Release 1.0 final cut): smoke.js re-pinned after the lead removed its one Watcher check (5 lines) with the Watcher
   (was 81986500187de6aab529a3afea713bdb, 62246 B; the legacy count 221 in tests/gate.json is the v6.3 log and stays) */
for (const [f, [m, b]] of Object.entries(PINS)) {
  const buf = exists('tests/core/' + f) ? fs.readFileSync(path.join(REPO, 'tests/core', f)) : Buffer.alloc(0);
  ok('tests/core/' + f + ' is the frozen legacy file (md5 ' + m.slice(0, 8) + ', ' + b + ' B): never edit it', buf.length === b && md5(buf) === m);
}

// ---- og_trace goldens: present, well formed, each run once by the gate (checked, never printed)
for (const s of ['over', 'purg', 'crea', 'malg']) {
  const rel = 'tests/fixtures/og_trace/' + s + '.json';
  let J = null; try { J = JSON.parse(read(rel)); } catch (e) { /* reported below */ }
  ok(rel + ': a golden for session ' + s + ' (15 digests, provenance recorded)', !!J && J.session === s && !!J.data && Array.isArray(J.data.digests) &&
    J.data.digests.length === 15 && (J.generatedFrom || (J.blessedFrom && J.reason)));
  ok(rel + ' is run exactly once by the gate', E.filter((e) => /og_trace\.js$/.test(e.suite) && (e.args || []).join(' ') === '--golden ' + rel).length === 1);
}
ok('.gitattributes keeps the goldens out of diffs', /^tests\/fixtures\/og_trace\/\*\.json -diff$/m.test(read('.gitattributes')));

// ---- caps come from scripts/guards.json only
const GU = JSON.parse(read('scripts/guards.json'));
const caps = Object.fromEntries((GU.sections || []).map((s) => [s.name, s.cap]));
ok('scripts/guards.json keeps the legacy caps (html 45,000,000; PART 55 950,000; PART 56 450,000; PART 57 600,000; HR block 700,000)',
  GU.html_cap === 45000000 && caps['PART 55'] === 950000 && caps['PART 56'] === 450000 && caps['PART 57'] === 600000 && caps['PART 57 HR block'] === 700000);
const gm = read('scripts/gate.mjs');
ok('scripts/gate.mjs hard-codes no cap (the build applies scripts/guards.json) and builds with --strict', !/45000000|950000|450000|600000|700000/.test(gm) && /'--strict'/.test(gm));
ok('the converted gate-rule checks read guards.json, gate.json and shipped.json (p_static, c_static, m_static)',
  ['tests/purgatory/p_static.js', 'tests/creativity/c_static.js', 'tests/malgorath/m_static.js'].every((f) => /guards\.json/.test(read(f))) &&
  ['tests/creativity/c_static.js', 'tests/malgorath/m_static.js'].every((f) => /tests\/gate\.json/.test(read(f)) && /shipped\.json/.test(read(f))));

// ---- hygiene: no absolute path, no handoff layout, no legacy dir lookups; outputs only under out/
const TEXT = walk('tests').filter((f) => /\.(js|mjs|json|md)$/.test(f));     /* the og_trace goldens included */
/* assembled from pieces so this file does not match itself */
const ABS = new RegExp(['/Us' + 'ers/', '/ho' + 'me/', '/priv' + 'ate/tmp', '[A-Za-z]:\\\\Us' + 'ers'].join('|'));
/* plus the owner's private terms, from the local untracked list if there is one (tools/lib/private_terms.cjs; none in CI) */
const PRIV = require(path.join(REPO, 'tools', 'lib', 'private_terms.cjs')).load().rules;
const absHits = [];
for (const f of TEXT) read(f).split('\n').forEach((l, i) => { if (ABS.test(l) || PRIV.some(([, re]) => re.test(l))) absHits.push(f + ':' + (i + 1)); });
ok('nothing under tests/ names an absolute path, a user folder or a private term' + (absHits.length ? ' (' + absHits.slice(0, 6).join(' ') + ')' : ''), absHits.length === 0);
const JS = TEXT.filter((f) => /\.js$/.test(f));
const legacyLook = [];
for (const f of JS) read(f).split('\n').forEach((l, i) => {
  if (/ROOT\s*\+\s*'dev\/|H\s*\+\s*'dev\/|boot\.(PG|CR|MG)\b|require\('\.\.\/\.\.\/|splice\.py'|gate\.sh'|hooks_[A-Z]\d?\.py'|_stub\/[a-z]\d_stub\.js'/.test(l)) legacyLook.push(f + ':' + (i + 1));
});
ok('no suite reaches for the legacy layout (dev/..., splice.py, gate.sh, hooks files, _stub/, ../../ requires)' + (legacyLook.length ? ' (' + legacyLook.slice(0, 6).join(' ') + ')' : ''), legacyLook.length === 0);
const writers = JS.filter((f) => /\bwriteFileSync\(|\bappendFileSync\(|\bcreateWriteStream\(/.test(read(f)));
ok('only the outputs-to-out/ suites write files (p4_boss, speedrun) plus og_trace --bless (' + writers.join(', ') + ')',
  writers.every((f) => ['tests/purgatory/p4_boss.js', 'tests/pilot/speedrun.js', 'tests/texpacks/og_trace.js'].includes(f)) &&
  /outDir\('purgatory'\)/.test(read('tests/purgatory/p4_boss.js')) && /outDir\('pilot'\)/.test(read('tests/pilot/speedrun.js')));
ok('tests/lib/paths.js computes every path from its own place or the environment', !/['"]\//.test(read('tests/lib/paths.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'\/'/g, '')));

// ---- npm scripts and CI
const pk = JSON.parse(read('package.json')).scripts || {};
ok('npm scripts: test = gate --once, gate = the full gate, test:quick = --tier quick', pk.test === 'node scripts/gate.mjs --once' && pk.gate === 'node scripts/gate.mjs' && pk['test:quick'] === 'node scripts/gate.mjs --tier quick');
const ci = exists('.github/workflows/ci.yml') ? read('.github/workflows/ci.yml') : '';
const mx = (ci.match(/group:\s*\[([^\]]*)\]/) || [])[1];
ok('.github/workflows/ci.yml runs every gate group (one job each), on node 22, read-only token, no secrets',
  !!mx && JSON.stringify(mx.split(',').map((s) => s.trim())) === JSON.stringify(GROUPS) && /node-version:\s*'?22'?/.test(ci) && /contents:\s*read/.test(ci) &&
  /scripts\/gate\.mjs --once --group \$\{\{ matrix\.group \}\}/.test(ci) && !/\$\{\{\s*secrets\./.test(ci));
ok('CI also runs the hermetic brain selftest and the secrets scan', /brain\/selftest\.mjs/.test(ci) && /tools\/scan_secrets\.mjs/.test(ci));

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
