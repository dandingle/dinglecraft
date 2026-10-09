// r_ipscan: the banned-names scan (Release 1.0). node tests/repo/r_ipscan.js [--list] [--decode]
// No name from the banned list (tests/fixtures/ip_banned.json, ROT13) may appear anywhere: not in the shipped build (game.js,
// head.html, the asset keys and metadata of hrassets.js), not in any file a commit of this repo would hold (src, html, assets
// metadata, brain, tools, tests, docs, the top-level files; src/features/part47-50.js and the og_trace goldens included, like
// any other file), and not in any file NAME.
// There is no allow-list. 'all' terms match every byte; 'prose' terms only string literals with a space (JavaScript) or any text
// (other files). Data URIs and base64 runs are blanked first (they are pixels, and they spell words by accident).
//   --list    also prints every hit as "file:line term#k  <the matched line, trimmed>": the
//             to-do list for the lanes. Lines are shown with the term in place, so the output names the old cast: keep it out
//             of the repo.
//   --decode  prints the banned list in plain text (for Dan) and exits. It writes nothing.
// Prints check names only (plus file:line term#k for the first hits); last line "N passed, M failed".
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('../lib/paths.js');
const R = require('../lib/repo_files.js');
const B = require('../lib/ipban.js');
const J = require('../lib/jsprose.js');

const argv = process.argv.slice(2);
const LIST = argv.includes('--list'), DECODE = argv.includes('--decode');
let pass = 0, fail = 0;
function ok(n, c) { if (c) pass++; else { fail++; console.log('FAIL ' + n); } return !!c; }
const done = () => { console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); };

let L = null;
try { L = B.load(); } catch (e) { /* reported below */ }
if (DECODE) {
  if (!L) { console.log('r_ipscan: cannot read tests/fixtures/ip_banned.json'); process.exit(1); }
  console.log('The Release 1.0 banned-names list (decoded from tests/fixtures/ip_banned.json; regexes, case-insensitive):');
  for (const t of L.terms) console.log(`  #${String(t.k).padEnd(3)} ${t.tier.padEnd(6)} ${t.src.padEnd(26)} e.g. "${t.sample}"`);
  console.log('tier all = every byte of every scanned file; tier prose = string literals with a space (JavaScript), any text elsewhere.');
  process.exit(0);
}

// ---- 1. the list itself -------------------------------------------------------------------------------------------------
ok('tests/fixtures/ip_banned.json parses and decodes (ROT13)', !!L && L.terms.length > 0);
if (!L) done();
const T = L.terms, ALL = T.filter((t) => t.tier === 'all'), PROSE = T.filter((t) => t.tier === 'prose');
ok('every term has a unique number, a tier (all|prose), a regex and a sample (' + T.length + ' terms: ' + ALL.length + ' all, ' + PROSE.length + ' prose)',
  new Set(T.map((t) => t.k)).size === T.length && T.every((t) => Number.isInteger(t.k) && ['all', 'prose'].includes(t.tier) && t.src && t.sample));
ok('the list is at least as wide as the Release 1.0 minimum (33 all-bytes terms, 5 prose terms)', ALL.length >= 33 && PROSE.length >= 5);
const selfMiss = T.filter((t) => { t.re.lastIndex = 0; return !t.re.test(t.sample); }).map((t) => '#' + t.k);
ok('self-test: every term matches its own sample' + (selfMiss.length ? ' (' + selfMiss.join(' ') + ')' : ''), selfMiss.length === 0);
/* the Release 1.0 names (r1 name contract) and words that merely contain a banned stem must never match */
const SAFE = ['Puppet Purgatory', 'the Demolitionist', 'the Pig', 'the Frog', 'THE MANAGEMENT', 'the Hero Hog', 'the Comic', 'the Daredevil', 'the Drummer',
  'the Yeti', 'the Cook', 'the Professor', 'the Lab Rat', 'Lab Rat Clone', 'Old Goat', 'Older Goat', 'the Old Goats', 'the Weatherman', 'the Pelican',
  'Rubber Hen', 'Blank', 'the Bin', 'The Bin', 'Panic Meter', 'Slam Gloves', 'Lit Fuse', 'Flatbread', 'Mystery Meatball', 'Homing Herring',
  'Detonator Plunger', 'Pig-Hurling Glove', 'Frog Puppet (Empty)', 'Puppet Fleece', 'Plastic Eye', 'Eyeball Lamp', 'Laminate Chip',
  'the Felt Forest', 'the Kitchen', "the Cook's Kitchen", 'the Prop Lab', 'the Back Swamp', 'THE SHOW MUST GO ON: PURGATORY EDITION', 'Baa-ha-ha.',
  'Felt Dan', 'Thieving Frog', 'Chorus Pig', 'Fallen Piglet', 'Hollow', 'The Hands', 'Followspot', 'Transmogrifier', 'the Pork Palace',
  'the Grand Staircase', 'MALGORATH, THE WORLD-EATER', 'Nuke Keg', 'Critter Jar', 'Fortune Orb', 'DEEP DIRT 2D', 'ASTEROID ALLEY',
  'Stephenson flew and blew past the moisture map', 'harrying lewd swedes', 'a goat named Hiyama', 'kerbside piggery'];
const safeHits = SAFE.filter((s) => T.some((t) => { t.re.lastIndex = 0; return t.re.test(s); }));
ok('no Release 1.0 name or innocent look-alike matches a banned term' + (safeHits.length ? ' (' + safeHits.length + ' do)' : ''), safeHits.length === 0);
{ const w = B.r13('zbv');                              /* the prose term that is also a worldgen variable name (ROT13 here too) */
  const src = 'const ' + w + '=heightNoise(x,z);\nconst s=\'avenge ' + w + '\',k=\'' + w + '\';// ' + w + ' is moisture\nlet r=/' + w + '/;const t=`x ${' + w + '} ' + w + ' y`;';
  const m = PROSE.find((t) => { t.re.lastIndex = 0; return t.re.test(w); }) || null; if (m) m.re.lastIndex = 0;
  const p = J.prose(src), n = m ? B.scan(p.text, [m]).length : -1;
  ok('self-test: the prose tier reads string literals with a space only (identifier, comment, regex and key-like strings ignored)', p.ok && n === 2); }

// ---- 2. the scan --------------------------------------------------------------------------------------------------------
const ANY_ALL = B.any(ALL), ANY_PROSE = B.any(PROSE);
const isJs = (f) => /\.(?:js|mjs|cjs)$/.test(f);
const lexFail = [];
/* scan one text; returns [{k,line,at}] ; label is used for the lexer report only */
function scanText(text, js, label) {
  const m = B.mask(text);
  let hits = [];
  if (ANY_ALL.test(m)) hits = hits.concat(B.scan(m, ALL));
  if (ANY_PROSE.test(m)) {
    let pt = m;
    if (js) { const p = J.prose(m); if (!p.ok) lexFail.push(label); pt = p.text; }
    hits = hits.concat(B.scan(pt, PROSE));
  }
  if (!hits.length) return hits;
  const ln = B.lines(m);
  return hits.map((h) => ({ k: h.k, at: h.at, line: ln(h.at), text: m }));
}
const groups = {};       /* group -> {files, hits:[{f,line,k,at,text}]} */
const add = (g, f, hs) => { const G = groups[g] || (groups[g] = { files: 0, hits: [] }); G.files++; for (const h of hs) G.hits.push(Object.assign({ f }, h)); };
const group = (rel) => rel.startsWith('src/') ? 'src' : rel.startsWith('html/') ? 'html' : rel.startsWith('assets/') ? 'assets' :
  rel.startsWith('brain/') ? 'brain' : rel.startsWith('tools/') ? 'tools' : rel.startsWith('tests/') ? 'tests' : rel.startsWith('scripts/') ? 'scripts' : 'docs';

let nText = 0, nBin = 0, names = [];
const files = R.list();
for (const rel of files) {
  /* file names: every path, binary or not */
  { const nh = B.scan(rel, ALL); if (nh.length) names.push(rel + ' #' + nh.map((h) => h.k).join(',#')); }
  if (R.BIN_EXT.test(rel)) { nBin++; continue; }
  if (rel.startsWith('assets/vendor/')) continue;          /* third-party libraries, verbatim (THIRD_PARTY.md): three.js lists CSS colour names */
  if (rel === R.PLAY_FILE) continue;                       /* the released build, scanned part by part below and at its gate (check: play file) */
  const buf = fs.readFileSync(path.join(P.REPO, rel));
  if (R.isBinary(buf)) { nBin++; continue; }
  nText++;
  add(group(rel), rel, scanText(buf.toString('utf8'), isJs(rel), rel));
}

/* the shipped build: game.js, head.html, hrassets.js (keys + metadata) */
let buildOk = true;
for (const f of ['game.js', 'head.html', 'hrassets.js']) {
  const abs = P.BUILD + f;
  if (!fs.existsSync(abs)) { buildOk = false; continue; }
  let t = fs.readFileSync(abs, 'utf8');
  if (f === 'head.html') {                                 /* blank the inlined third-party three.js (assets/vendor), exactly as the build inlines it */
    const vf = path.join(P.REPO, 'assets', 'vendor', 'three.r128.min.js');
    if (fs.existsSync(vf)) { const v = fs.readFileSync(vf, 'utf8').replace(/\r/g, '').replace(/\n?$/, ''), i = t.indexOf(v);
      if (i >= 0) t = t.slice(0, i) + v.replace(/[^\n]/g, ' ') + t.slice(i + v.length); }
    t = t.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+/g, (m) => ' '.repeat(m.length));   /* inlined images (logo, title panorama) are pixels, not text */
  }
  add('build', 'build/' + f, scanText(t, f.endsWith('.js'), 'build/' + f));
}

// ---- 3. the checks ------------------------------------------------------------------------------------------------------
/* the play file (DINGLECRAFT.html) is skipped as prose (its JS identifiers read as words): it may only be a recorded public build,
   whose parts (game.js, head.html, hrassets.js) this scan covered when that build was gated */
{ const pc = R.playCheck();
  ok('the play file ' + R.PLAY_FILE + ' is a recorded public build (' + (pc.present ? (pc.version ? 'v' + pc.version : 'md5 ' + pc.md5 + ' is not a shipped 6.4+ build') : 'missing') + ')', pc.present && !!pc.version); }
const show = (hs) => hs.slice(0, 6).map((h) => h.f + ':' + h.line + ' #' + h.k).join(' ') + (hs.length > 6 ? ' ...' : '');
ok('the build is there (build/game.js, head.html, hrassets.js)', buildOk);
const LABEL = { build: 'the shipped build (game.js, head.html, hrassets.js keys and metadata)', src: 'src/', html: 'html/',
  assets: 'assets/ (manifests, metadata, pack inputs)', brain: 'brain/', tools: 'tools/', tests: 'tests/', scripts: 'scripts/',
  docs: 'the docs and top-level files (README, CHANGELOG, CLAUDE, CONTRIBUTING, LICENSE, THIRD_PARTY, docs/, .github/ ...)' };
for (const g of ['build', 'src', 'html', 'assets', 'brain', 'tools', 'tests', 'scripts', 'docs']) {
  const G = groups[g] || { files: 0, hits: [] };
  ok('no banned name in ' + LABEL[g] + ' (' + G.files + ' files' + (G.hits.length ? '; ' + G.hits.length + ' hits: ' + show(G.hits) : '') + ')', G.hits.length === 0);
}
ok('no banned name in any file name (' + files.length + ' paths' + (names.length ? '; ' + names.slice(0, 6).join(' ') : '') + ')', names.length === 0);
ok('the prose lexer reads every scanned JavaScript file' + (lexFail.length ? ' (gave up on: ' + lexFail.slice(0, 6).join(' ') + ')' : ''), lexFail.length === 0);
ok('the scan saw the whole repo (' + nText + ' text files, ' + nBin + ' binary files by name only)', nText > 300 && files.length > 600);

if (LIST) {
  console.log('---- r_ipscan --list: every hit (file:line term#k  line) ----');
  for (const g of Object.keys(groups)) for (const h of groups[g].hits.sort((a, b) => a.f < b.f ? -1 : a.f > b.f ? 1 : a.line - b.line)) {
    const s = h.text.lastIndexOf('\n', h.at) + 1, e0 = h.text.indexOf('\n', h.at), e = e0 < 0 ? h.text.length : e0;
    const a = Math.max(s, h.at - 70), b = Math.min(e, h.at + 70);
    console.log(h.f + ':' + h.line + ' term#' + h.k + '  ' + (a > s ? '...' : '') + h.text.slice(a, b).replace(/\s+/g, ' ').trim() + (b < e ? '...' : ''));
  }
  for (const n of names) console.log('(file name) ' + n);
  const byFile = {}; for (const g of Object.keys(groups)) for (const h of groups[g].hits) byFile[h.f] = (byFile[h.f] || 0) + 1;
  console.log('---- ' + Object.values(byFile).reduce((a, b) => a + b, 0) + ' hits in ' + Object.keys(byFile).length + ' files, ' + names.length + ' file names ----');
}
done();
