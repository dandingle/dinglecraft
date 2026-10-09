#!/usr/bin/env node
// DINGLECRAFT build: src/ + html/ + assets/ -> build/{head.html,game.js,hrassets.js,...} and dist/dinglecraft_v<VER>.html.
// Node only, no dependencies. The build is plain concatenation: it adds and changes nothing (docs/BUILD.md).
//
//   node scripts/build.mjs [--out DIR] [--dist DIR] [--no-check] [--strict] [--quiet]
//     --out DIR    intermediate parts + build.json (default build/, env DC_BUILD)
//     --dist DIR   the playable html (default dist/, env DC_DIST)
//     --no-check   skip the node --check syntax pass
//     --strict     exit 1 when a shipped (frozen) version does not reproduce its shipped bytes (gate and release use it)
//     --quiet      print only warnings and errors
// A shipped version (tests/fixtures/shipped.json) whose output changed is never written to dist/ (it goes to the --out dir).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { REPO, SRC, HTML, ASSETS, FIX, rel } from './lib/paths.mjs';
import { readOrder, validateOrder, markerLint } from './lib/order.mjs';
import { loadGuards, runSectionGuards } from './lib/guards.mjs';
import { readVersion, checkSites } from './lib/version.mjs';
import { assembleAssets } from './lib/assets.mjs';
import { nodeCheck } from './lib/syntax.mjs';

const T0 = Date.now();
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--out' || a === '--dist') { i++; continue; }
  if (!['--no-check', '--strict', '--quiet'].includes(a)) { console.error('unknown option ' + a); process.exit(2); }
}
const OUT = path.resolve(opt('--out') || process.env.DC_BUILD || path.join(REPO, 'build'));
const DIST = path.resolve(opt('--dist') || process.env.DC_DIST || path.join(REPO, 'dist'));
const CHECK = !argv.includes('--no-check');
const STRICT = argv.includes('--strict');
const QUIET = argv.includes('--quiet');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');
const problems = [];
const fail = (msgs) => { for (const m of msgs) console.error('BUILD ERROR: ' + m); console.error('BUILD FAILED'); process.exit(1); };
const step = (msgs) => { if (msgs.length) fail(msgs); };
const log = (...a) => { if (!QUIET) console.log(...a); };

// 1. version ---------------------------------------------------------------------------------------
let VER;
try { VER = readVersion(REPO); } catch (e) { fail([e.message]); }

// 2. ORDER files + marker lint ---------------------------------------------------------------------
const srcOrder = readOrder(path.join(SRC, 'ORDER.txt'));
const htmlOrder = readOrder(path.join(HTML, 'ORDER.txt'));
step(validateOrder(SRC, srcOrder, ['.js']));
step(validateOrder(HTML, htmlOrder, ['.html', '.css'], ['tail.html']));
const lint = markerLint(SRC, srcOrder);
step(lint.problems);

// 3. game.js ---------------------------------------------------------------------------------------
const game = Buffer.concat(srcOrder.map((p) => fs.readFileSync(path.join(SRC, p))));

// 4. JS guards -------------------------------------------------------------------------------------
const gameText = game.toString('utf8');
if (!Buffer.from(gameText, 'utf8').equals(game)) problems.push('game.js: not valid UTF-8');
if (gameText.includes('\r')) problems.push('game.js: contains a CR (\\r)');
if (/<\/script/i.test(gameText)) problems.push('game.js: contains "</script" (would end the inline script)');
if (gameText.includes('<!--')) problems.push('game.js: contains "<!--"');
const EXPORT_MARK = "\nif(typeof window==='undefined'||typeof __VOXTEST";
const exportCount = gameText.split(EXPORT_MARK).length - 1;
if (exportCount !== 1) problems.push(`game.js: export-branch marker found ${exportCount} times (want 1)`);
if (!gameText.endsWith('\n')) problems.push('game.js: does not end with a newline');
const guards = loadGuards(REPO);
const sections = runSectionGuards(gameText, guards);
for (const s of sections) if (!s.ok) problems.push(s.msg);
step(problems);

// 5. head.html -------------------------------------------------------------------------------------
const logo = fs.readFileSync(path.join(ASSETS, 'logo.png'));
const PH = '{{LOGO_PNG_BASE64}}';
let headText = htmlOrder.map((p) => fs.readFileSync(path.join(HTML, p), 'utf8')).join('');
const phCount = headText.split(PH).length - 1;
if (phCount !== 1) problems.push(`head.html: ${PH} found ${phCount} times (want exactly 1, in html/dom/title.html)`);
headText = headText.replace(PH, () => logo.toString('base64'));
/* Release 1.0: three.js r128 is baked in (assets/vendor/three.r128.min.js, MIT) so the game needs no internet */
const PH3 = '{{THREE_JS}}', three = fs.readFileSync(path.join(ASSETS, 'vendor', 'three.r128.min.js'), 'utf8');
if (headText.split(PH3).length - 1 !== 1) problems.push(`head.html: ${PH3} must appear exactly once (html/99_scripts.html)`);
if (/<\/script|<!--/i.test(three)) problems.push('assets/vendor/three.r128.min.js contains </script or <!-- and cannot be inlined');
headText = headText.replace(PH3, () => three.replace(/\r/g, '').replace(/\n?$/, ''));
/* Release 1.0: the title panorama (assets/title: 6 cube faces + pano.json), inlined as one JSON block */
const PHP = '{{TITLE_PANO_JSON}}', PD = path.join(ASSETS, 'title'), pmeta = JSON.parse(fs.readFileSync(path.join(PD, 'pano.json'), 'utf8'));
if (headText.split(PHP).length - 1 !== 1) problems.push(`head.html: ${PHP} must appear exactly once (html/dom/title.html)`);
const pano = { yaw0: pmeta.yaw0, pitch: pmeta.pitch, spin: pmeta.spin_s,
  faces: pmeta.faces.map((f) => 'data:image/webp;base64,' + fs.readFileSync(path.join(PD, f)).toString('base64')) };
if (pano.faces.length !== 6) problems.push('assets/title/pano.json: want exactly 6 faces');
headText = headText.replace(PHP, () => JSON.stringify(pano));
const head = Buffer.from(headText, 'utf8');
if (!headText.endsWith('<script>\n')) problems.push('head.html: must end with "<script>\\n"');
if (headText.includes('\r')) problems.push('head.html: contains a CR (\\r)');
const sites = checkSites(REPO);
problems.push(...sites.problems);
step(problems);

// 6. assets ----------------------------------------------------------------------------------------
let A;
try { A = assembleAssets(REPO); } catch (e) { fail([e.message]); }
step(A.problems);
const hrBuf = Buffer.from(A.hr, 'latin1'), mgBuf = Buffer.from(A.mg, 'latin1');
const hrassets = Buffer.concat([hrBuf, mgBuf]);

// 7. tail ------------------------------------------------------------------------------------------
const tail = fs.readFileSync(path.join(HTML, 'tail.html'));
if (!tail.toString('utf8').startsWith('</script>')) fail(['html/tail.html must begin with "</script>"']);

// 8. write -----------------------------------------------------------------------------------------
const html = Buffer.concat([head, game, hrassets, tail]);
const htmlName = `dinglecraft_v${VER}.html`;
const shipped = JSON.parse(fs.readFileSync(path.join(FIX, 'shipped.json'), 'utf8')).shipped || {};
const frozen = shipped[VER] ? (md5(html) === shipped[VER].md5 && html.length === shipped[VER].bytes ? 'match' : 'mismatch') : 'not-shipped';
const writeAtomic = (dir, name, buf) => {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, '.' + name + '.tmp-' + process.pid);
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, path.join(dir, name));
};
const partInfo = (b) => ({ bytes: b.length, md5: md5(b) });
const info = {
  version: VER,
  html: { file: htmlName, ...partInfo(html) },
  parts: { head: partInfo(head), game: partInfo(game), hrassets: partInfo(hrassets), tail: partInfo(tail) },
  assets: { 'hr_assets.gen.js': { ...partInfo(hrBuf), sha1: sha1(hrBuf) }, 'mg_assets.gen.js': { ...partInfo(mgBuf), sha1: sha1(mgBuf) } },
  frozen,
  sections: Object.fromEntries(sections.map((s) => [s.name, s.bytes])),
  files: { src: srcOrder.length, html: htmlOrder.length, hrKeys: A.info.hrKeys, mgKeys: A.info.mgKeys },
  builtAt: new Date().toISOString(),
};
writeAtomic(OUT, 'head.html', head);
writeAtomic(OUT, 'game.js', game);
writeAtomic(OUT, 'hr_assets.gen.js', hrBuf);
writeAtomic(OUT, 'mg_assets.gen.js', mgBuf);
writeAtomic(OUT, 'hrassets.js', hrassets);
writeAtomic(OUT, 'tail.html', tail);
// A shipped version whose bytes changed is never written to dist/ (the shipped file there stays intact); it goes to the
// build dir instead so it can be inspected.
if (frozen !== 'mismatch') writeAtomic(DIST, htmlName, html);
else writeAtomic(OUT, htmlName, html);

// 9. syntax ----------------------------------------------------------------------------------------
if (CHECK) {
  const body = /<script>\n([\s\S]*)\n<\/script>/.exec(html.toString('utf8'));
  if (!body) fail(['html: no <script>\\n...\\n</script> body found']);
  const bodyFile = path.join(OUT, '.html_script_body.js');
  fs.writeFileSync(bodyFile, body[1]);
  // game.js and the html script body share line numbers (the body starts with game.js line 1).
  const res = await Promise.all([
    nodeCheck(path.join(OUT, 'game.js'), { name: 'game.js' }),
    nodeCheck(path.join(OUT, 'hrassets.js'), { name: 'hrassets.js', hideSource: true }),
    nodeCheck(bodyFile, { name: 'html script body' }),
  ]);
  fs.rmSync(bodyFile, { force: true });
  step(res.filter(Boolean));
}

// 10. cap ------------------------------------------------------------------------------------------
if (html.length >= guards.html_cap) fail([`html too big: ${html.length} >= ${guards.html_cap}`]);

// 11. frozen check + build.json ----------------------------------------------------------------------
writeAtomic(OUT, 'build.json', Buffer.from(JSON.stringify(info, null, 2) + '\n'));

// 12. report ---------------------------------------------------------------------------------------
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
log(`DINGLECRAFT v${VER}: ${srcOrder.length} src files (${lint.checked} markers OK), ${htmlOrder.length} html files, ${A.info.hrKeys}+${A.info.mgKeys} packed payloads`);
for (const [n, b] of [['head.html', head], ['game.js', game], ['hr_assets.gen.js', hrBuf], ['mg_assets.gen.js', mgBuf], ['hrassets.js', hrassets], ['tail.html', tail], [htmlName, html]])
  log(`  ${pad(n, 24)} ${String(b.length).padStart(10)} B  md5 ${md5(b)}`);
log(`  sections: ${sections.map((s) => s.name + ' ' + s.bytes).join(', ')}; html cap ${guards.html_cap}`);
log(`  ${CHECK ? 'syntax OK (game.js, hrassets.js, html script body)' : 'syntax check skipped (--no-check)'}; out ${rel(OUT)}/, dist ${rel(DIST)}/; ${((Date.now() - T0) / 1000).toFixed(2)} s`);
if (frozen === 'match') log(`FROZEN v${VER}: byte-identical to the shipped file`);
else if (frozen === 'mismatch') {
  console.error('');
  console.error(`!!! WARNING: v${VER} is shipped and frozen, but this build differs from the shipped file (md5 ${shipped[VER].md5}).`);
  console.error(`!!! Bump with \`npm run bump -- <maj.min> "<title>"\` before changing output. dist/ was NOT written (see ${rel(OUT)}/${htmlName}).`);
  if (STRICT) { console.error('BUILD FAILED (--strict: frozen version changed)'); process.exit(1); }
} else log(`v${VER} is not shipped yet (tests/fixtures/shipped.json); npm run release records it`);
