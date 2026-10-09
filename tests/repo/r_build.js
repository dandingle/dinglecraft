// r_build: the repo build contract (docs/BUILD.md). node tests/repo/r_build.js
// Builds twice into out/r_build/ (or $DC_OUT_DIR/r_build/), then checks parity with the frozen shipped bytes, the ORDER files,
// the marker lint, .gitattributes, the boundary contract, the version sites, the size guards, the asset manifests, the
// syntax-error report, determinism and repo hygiene. Prints check names only ("FAIL <name>"); last line "N passed, M failed".
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const REPO = path.resolve(__dirname, '..', '..');
const OUT = path.join(path.resolve(process.env.DC_OUT_DIR || path.join(REPO, 'out')), 'r_build');
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');
let pass = 0, fail = 0;
function ok(n, c) { if (c) pass++; else { fail++; console.log('FAIL ' + n); } return !!c; }
const lib = (name) => import(pathToFileURL(path.join(REPO, 'scripts', 'lib', name)).href);
const read = (rel) => fs.readFileSync(path.join(REPO, rel));

function build(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'build.mjs'), '--quiet', '--out', dir, '--dist', dir], { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

(async () => {
  const { readOrder, validateOrder, markerLint, listFiles } = await lib('order.mjs');
  const { loadGuards, runSectionGuards } = await lib('guards.mjs');
  const { readVersion, checkSites, readPatchLog } = await lib('version.mjs');
  const { assembleAssets } = await lib('assets.mjs');
  const { describeCheckError } = await lib('syntax.mjs');

  const VER = readVersion(REPO);
  const shipped = JSON.parse(read('tests/fixtures/shipped.json')).shipped || {};
  const A = path.join(OUT, 'a'), B = path.join(OUT, 'b');

  // ---- build + parity
  const b1 = build(A);
  if (!ok('build exits 0', b1.status === 0)) {
    // the build's own error lines (files and checks)
    console.log(b1.out.split('\n').filter((l) => /BUILD ERROR|BUILD FAILED/.test(l)).slice(0, 20).join('\n'));
    console.log(pass + ' passed, ' + fail + ' failed'); process.exit(1);
  }
  const info = JSON.parse(fs.readFileSync(path.join(A, 'build.json'), 'utf8'));
  const P = (f) => fs.readFileSync(path.join(A, f));
  const head = P('head.html'), game = P('game.js'), hrassets = P('hrassets.js'), tail = P('tail.html');
  const hrGen = P('hr_assets.gen.js'), mgGen = P('mg_assets.gen.js');
  const html = P(info.html.file);
  ok('build.json version is GAME_VERSION', info.version === VER);
  ok('html file is dinglecraft_v<VER>.html', info.html.file === `dinglecraft_v${VER}.html`);
  ok('html = head + game + hrassets + tail', html.equals(Buffer.concat([head, game, hrassets, tail])));
  ok('hrassets = hr_assets.gen.js + mg_assets.gen.js', hrassets.equals(Buffer.concat([hrGen, mgGen])));
  ok('build.json md5s match the written files', info.html.md5 === md5(html) && info.parts.game.md5 === md5(game) && info.parts.head.md5 === md5(head));
  if (shipped[VER]) {
    const s = shipped[VER];
    ok(`FROZEN v${VER}: html byte-identical to the shipped file`, html.length === s.bytes && md5(html) === s.md5);
    ok(`FROZEN v${VER}: build reports frozen=match`, info.frozen === 'match');
    if (s.parts) for (const k of ['head', 'game', 'hrassets', 'tail']) ok(`FROZEN v${VER}: ${k} md5 equals the shipped part`, md5({ head, game, hrassets, tail }[k]) === s.parts[k].md5);
    if (s.assets) {
      ok(`FROZEN v${VER}: hr_assets.gen.js sha1 equals the shipped asset`, sha1(hrGen) === s.assets['hr_assets.gen.js'].sha1);
      ok(`FROZEN v${VER}: mg_assets.gen.js sha1 equals the shipped asset`, sha1(mgGen) === s.assets['mg_assets.gen.js'].sha1);
    }
  } else ok(`v${VER} is newer than every shipped version`, Object.keys(shipped).every((v) => v !== VER));
  ok('shipped.json: every entry has bytes + md5', Object.values(shipped).every((s) => s.bytes > 0 && /^[0-9a-f]{32}$/.test(s.md5)));

  // ---- determinism
  const b2 = build(B);
  ok('second build exits 0', b2.status === 0);
  ok('build is deterministic (two builds, identical html)', b2.status === 0 && md5(fs.readFileSync(path.join(B, info.html.file))) === md5(html));

  // ---- ORDER + marker lint
  const srcOrder = readOrder(path.join(REPO, 'src', 'ORDER.txt'));
  const htmlOrder = readOrder(path.join(REPO, 'html', 'ORDER.txt'));
  ok('src/ORDER.txt: no missing, duplicate or orphan file', validateOrder(path.join(REPO, 'src'), srcOrder, ['.js']).length === 0);
  ok('html/ORDER.txt: no missing, duplicate or orphan file', validateOrder(path.join(REPO, 'html'), htmlOrder, ['.html', '.css'], ['tail.html']).length === 0);
  ok('html/ORDER.txt does not list tail.html', !htmlOrder.includes('tail.html'));
  ok('src/ORDER.txt ends with boot/export_boot.js', srcOrder[srcOrder.length - 1] === 'boot/export_boot.js');
  ok('src/ORDER.txt starts with core/p01a_prologue.js (\'use strict\' must stay first)', srcOrder[0] === 'core/p01a_prologue.js');
  const ml = markerLint(path.join(REPO, 'src'), srcOrder);
  ok('marker lint: every package file starts with its own PART marker', ml.problems.length === 0 && ml.checked > 0);
  ok('new update PARTs load before PART 57 (ORDER: ai_players block, then malgorath/m0_contract.js)', srcOrder.indexOf('malgorath/m0_contract.js') > srcOrder.indexOf('ai_players/mob_helpers.js'));

  // ---- .gitattributes
  const gattr = read('.gitattributes').toString('utf8');
  ok('.gitattributes: "* -text" (no EOL normalisation)', gattr.split('\n').includes('* -text'));
  const noDiff = gattr.split('\n').filter((l) => /\s-diff\b/.test(l) && !l.startsWith('#'));
  ok('.gitattributes hides no source file from diffs (-diff only on the generated og_trace fixtures)' + (noDiff.length > 1 ? ' (' + noDiff.join(', ') + ')' : ''),
    noDiff.length === 1 && noDiff[0] === 'tests/fixtures/og_trace/*.json -diff');

  // ---- boundary contract
  const gt = game.toString('utf8'), ht = head.toString('utf8');
  ok('head.html ends with "<script>\\n"', ht.endsWith('<script>\n'));
  ok('game.js ends with "\\n"', gt.endsWith('\n'));
  ok('tail.html begins with "</script>"', tail.toString('utf8').startsWith('</script>'));
  ok('hrassets.js: ASCII, no "<", ends with "\\n"', /^[\x00-\x7f]*$/.test(hrassets.toString('latin1')) && !hrassets.includes('<') && hrassets[hrassets.length - 1] === 10);
  ok('hrassets.js defines hrAssets, hrAssetMeta, hrMgAssets and module.exports', ['function hrAssets(', 'function hrAssetMeta(', 'function hrMgAssets(', 'module.exports'].every((s) => hrassets.includes(s)));
  ok('game.js: no CR, no "</script", no "<!--"', !gt.includes('\r') && !/<\/script/i.test(gt) && !gt.includes('<!--'));
  ok('game.js: export-branch marker exactly once', gt.split("\nif(typeof window==='undefined'||typeof __VOXTEST").length === 2);
  let crFiles = 0;
  for (const f of listFiles(path.join(REPO, 'src'), ['.js'])) if (fs.readFileSync(path.join(REPO, 'src', f)).includes(13)) crFiles++;
  for (const f of listFiles(path.join(REPO, 'html'), ['.html', '.css'])) if (fs.readFileSync(path.join(REPO, 'html', f)).includes(13)) crFiles++;
  ok('no CR in any src/ or html/ file', crFiles === 0);

  // ---- version sites
  const vs = checkSites(REPO);
  ok('version + label sites agree (GAME_VERSION, RELEASE_LABEL, title #t_ver, win screen, package.json, PATCH_LOG top)' + (vs.problems.length ? ' (' + vs.problems.join('; ') + ')' : ''), vs.problems.length === 0);
  ok('package.json version is GAME_VERSION.0', JSON.parse(read('package.json')).version === VER + '.0');
  const pl = readPatchLog(REPO, VER);
  ok('PATCH_LOG top entry is GAME_VERSION and has lines', pl[0].v === VER && Array.isArray(pl[0].lines) && pl[0].lines.length > 0);
  ok('PATCH_LOG versions are unique', new Set(pl.map((e) => e.v)).size === pl.length);
  ok('head shows the release label in #t_ver', (/id="t_ver"[^>]*>([^<]*)</.exec(ht) || [])[1] === vs.label);
  ok('PATCH_LOG top entry carries the release label', pl[0].label === vs.label);
  {const { labelProblem } = await lib('version.mjs');
    const SH = JSON.parse(read('tests/fixtures/shipped.json').toString('utf8')).shipped;
    const labelled = Object.keys(SH).filter((v) => SH[v].label);
    ok('shipped labels match PATCH_LOG (' + labelled.length + ' labelled versions)', labelled.every((v) => (pl.find((e) => e.v === v) || {}).label === SH[v].label));
    const fake = { '1.0': { label: 'A' }, '1.1': { label: 'B' }, '1.2': { label: 'B' } };
    ok('label rule: a later cut may keep the newest label (B again), a new label is fine, an older label never comes back (A)',
      labelProblem('B', fake) === null && labelProblem('C', fake) === null && typeof labelProblem('A', fake) === 'string' && labelProblem('B', fake, 'B') === null && typeof labelProblem('B', fake, 'C') === 'string');
    ok('the current RELEASE_LABEL is allowed for release (' + JSON.stringify(vs.label) + ')', labelProblem(vs.label, SH) === null);}

  // ---- guards
  const guards = loadGuards(REPO);
  const secs = runSectionGuards(gt, guards);
  for (const s of secs) ok('guard: ' + s.name + ' within its cap', s.ok);
  ok('guard: html under the cap', html.length < guards.html_cap);

  // ---- assets
  const AS = assembleAssets(REPO);
  ok('assets: manifest sha1 pins + contract hold', AS.problems.length === 0);
  ok('assets: assembled text equals the built gen files', Buffer.from(AS.hr, 'latin1').equals(hrGen) && Buffer.from(AS.mg, 'latin1').equals(mgGen));
  ok('assets: meta.json is verbatim (no trailing newline)', !read('assets/packed/hr/meta.json').toString('latin1').endsWith('\n'));
  let badWebp = 0, nWebp = 0;
  for (const dir of ['assets/packed/hr/t', 'assets/packed/hr/e', 'assets/packed/mg/m']) {
    for (const f of fs.readdirSync(path.join(REPO, dir))) {
      const b = fs.readFileSync(path.join(REPO, dir, f)); nWebp++;
      let o = 12;
      while (o + 8 <= b.length) {
        const id = b.toString('latin1', o, o + 4), sz = b.readUInt32LE(o + 4);
        if (!['VP8 ', 'VP8L', 'VP8X', 'ALPH'].includes(id)) { badWebp++; break; }
        o += 8 + sz + (sz & 1);
      }
    }
  }
  ok('assets: every packed WebP carries image chunks only (no EXIF/XMP/ICC)', nWebp > 0 && badWebp === 0);
  const htmlFiles = listFiles(path.join(REPO, 'html'), ['.html', '.css']);
  const ph = htmlFiles.map((f) => fs.readFileSync(path.join(REPO, 'html', f), 'utf8').split('{{LOGO_PNG_BASE64}}').length - 1);
  ok('logo placeholder exactly once, in html/dom/title.html', ph.reduce((a, b) => a + b, 0) === 1 && ph[htmlFiles.indexOf('dom/title.html')] === 1);

  // ---- syntax-error reporting (synthetic stderr, no real source)
  const fake = (line) => `/x/game.js:${line}\nFAKE_SOURCE_LINE\n   ^^^\n\nSyntaxError: Unexpected token 'FAKE_TOKEN'\n`;
  const rep = describeCheckError(fake(150), 'game.js');
  ok('syntax report: file:line, the error message and the quoted source line', /^game\.js:150: SyntaxError: Unexpected token 'FAKE_TOKEN'\n/.test(rep) && /FAKE_SOURCE_LINE/.test(rep));
  ok('syntax report: no line number -> the message only', describeCheckError('SyntaxError: FAKE_TOKEN\n', 'game.js') === 'game.js: SyntaxError: FAKE_TOKEN (location not reported)');
  ok('syntax report: hideSource never quotes source (hrassets.js lines are megabytes long)', /^hrassets\.js:5: SyntaxError/.test(describeCheckError(fake(5), 'hrassets.js', true)) && !/FAKE_SOURCE_LINE/.test(describeCheckError(fake(5), 'hrassets.js', true)));
  ok('syntax report: quoted lines are capped at 300 characters', describeCheckError(`/x/game.js:7\n${'Q'.repeat(5000)}\n^\n\nSyntaxError: x\n`, 'game.js').length < 700);

  // ---- hygiene: no absolute paths or private terms in the repo's own text
  // Patterns are assembled from pieces so this file does not match itself. The private terms come from the owner's local,
  // untracked list when there is one (tools/lib/private_terms.cjs); a clone without it runs the generic rules only.
  const BAD = new RegExp(['/Us' + 'ers/', '/ho' + 'me/', '/priv' + 'ate/tmp', 'C:\\\\Us' + 'ers'].join('|'));
  const PRIV = require(path.join(REPO, 'tools', 'lib', 'private_terms.cjs')).load().rules;
  const scan = [];
  for (const f of listFiles(path.join(REPO, 'src'), ['.js', '.html', '.txt'])) scan.push('src/' + f);
  for (const f of htmlFiles.concat(['ORDER.txt', 'tail.html'])) scan.push('html/' + f);
  for (const f of listFiles(path.join(REPO, 'scripts'), ['.mjs', '.js', '.json'])) scan.push('scripts/' + f);
  scan.push('package.json', '.gitignore', '.gitattributes', '.editorconfig', 'tests/fixtures/shipped.json',
    'tests/repo/r_build.js', 'assets/packed/hr/header.txt', 'assets/packed/hr/meta.json', 'assets/packed/hr/manifest.json',
    'assets/packed/mg/header.txt', 'assets/packed/mg/order.json', 'assets/packed/mg/manifest.json', 'assets/pack-inputs/hr_tiles.json', 'assets/pack-inputs/tiles.json');
  const text = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');
  const hits = scan.filter((f) => fs.existsSync(path.join(REPO, f)) && BAD.test(text(f)));
  ok('no absolute paths or usernames in src/, html/, scripts/, assets sidecars, fixtures' + (hits.length ? ' (' + hits.join(', ') + ')' : ''), hits.length === 0);
  const priv = scan.filter((f) => fs.existsSync(path.join(REPO, f))).flatMap((f) => { const t = text(f); return PRIV.filter(([, re]) => re.test(t)).map(([r]) => f + ' ' + r); });
  ok('no private term (local list: ' + PRIV.length + ') in the game, html, scripts or fixtures' + (priv.length ? ' (' + priv.join(', ') + ')' : ''), priv.length === 0);
  const gi = read('.gitignore').toString('utf8').split('\n');
  ok('.gitignore keeps secrets and outputs out', ['.env', '.env.*', '!.env.example', 'brain/data/', 'node_modules/', '*.gen.js', '/build/', '/dist/', '/out/'].every((l) => gi.includes(l)));

  fs.rmSync(OUT, { recursive: true, force: true });
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('CRASH r_build: ' + (e && e.message ? e.message.split('\n')[0] : e)); console.log(pass + ' passed, ' + (fail + 1) + ' failed'); process.exit(1); });
