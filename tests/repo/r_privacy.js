// r_privacy: no personal data in anything a commit of this repo or the shipped build carries (Release 1.0, the public repo).
// node tests/repo/r_privacy.js
// The text rules are tools/scan_secrets.mjs's (one rule set: key-shaped values, emails outside reserved domains, home-folder and
// temp paths, and the owner's private terms when a local, untracked list exists: tools/lib/private_terms.cjs), plus rules that
// only make sense on the machine running the suite: the current user's name in a path, this machine's host, computer and local
// host names (read at run time, never printed), mounted volumes and home-folder layouts (a Documents or Downloads folder under
// the home folder). Scope: every file a commit would hold (tests/lib/repo_files.js; src/features/part47-50.js and the og_trace
// goldens included, like any other file), the build (game.js, head.html, hrassets.js keys and metadata), every image and audio
// file and every image/audio payload embedded in the build (no EXIF/XMP/text chunks, no ID3/INFO/comment tags), the git identity
// and history when a repository exists, and .gitignore / .env.example hygiene.
// Prints "path:line rule" for the first hits, never a matched value; last line "N passed, M failed".
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const P = require('../lib/paths.js');
const R = require('../lib/repo_files.js');

let pass = 0, fail = 0;
const SKIPS = [];
function ok(n, c) { if (c) pass++; else { fail++; console.log('FAIL ' + n); } return !!c; }
function skip(n, why) { SKIPS.push(n + ' (' + why + ')'); }
const j = (...p) => p.join('');                         /* keeps this file from matching its own rules */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

(async () => {
  let S = null;
  try { S = await import(pathToFileURL(P.TOOLS + 'scan_secrets.mjs').href); } catch (e) { /* reported below */ }
  ok('the text, file and image rules load from tools/scan_secrets.mjs (one rule set for npm run scan and this suite)',
    !!S && typeof S.textHits === 'function' && typeof S.fileRules === 'function' && typeof S.imageMeta === 'function');
  if (!S) { console.log(pass + ' passed, ' + fail + ' failed'); process.exit(1); }

  // ---- the machine-specific and owner-specific rules -------------------------------------------------------------------
  let user = ''; try { user = String(os.userInfo().username || ''); } catch (e) { user = ''; }
  const host = String(os.hostname() || '').replace(/\.(local|lan|home|localdomain)$/i, '');
  const COMMON = /^(mac|macbook|imac|pc|desktop|laptop|localhost|runner|ubuntu|linux|host|computer|server|workstation|admin|user|root|node|test|dev|build|ci)$/i;
  /* macOS keeps two more names (System Settings > General > Sharing): the ComputerName ("X's MacBook Pro") and the Bonjour
     LocalHostName ("Xs-MacBook-Pro"). Read here, compared in memory, never printed. */
  const macNames = [];
  if (process.platform === 'darwin') for (const k of ['ComputerName', 'LocalHostName']) {
    try { const v = execFileSync('scutil', ['--get', k], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); if (v) macNames.push([k, v]); } catch (e) { /* not set */ }
  }
  const EXTRA = [
    ['mounted-volume', new RegExp(j('/', 'Volumes', '/[A-Za-z0-9]'))],
    ['home-layout', new RegExp(j('~/', '(?:Documents|Downloads|Desktop|Library|Pictures|Movies|Music|Dropbox|OneDrive)\\b'))],
    ['cloud-folder', new RegExp(j('Mobile ', 'Documents|com~apple~', 'CloudDocs|iCloud ', 'Drive'))],
  ];
  if (user.length >= 2 && !COMMON.test(user)) EXTRA.push(['user-name-path', new RegExp('(?:[/\\\\]' + esc(user) + '[/\\\\]|~' + esc(user) + '(?![A-Za-z0-9_.-]))')]);
  else skip('user-name-path rule', 'no usable user name on this machine');
  if (host.length >= 5 && !COMMON.test(host)) EXTRA.push(['host-name', new RegExp('\\b' + esc(host) + '\\b', 'i')]);
  else skip('host-name rule', 'this host name is too generic to search for');
  const nameRe = (v) => v.split(/[\s_-]+/).filter(Boolean).map(esc).join('(?:[\\s_-]|%20)*');      /* "Dan's Mac" ~ "Dans-Mac" ~ "Dan's%20Mac" */
  for (const [k, v] of macNames) {
    const loose = v.replace(/['\u2019]/g, '');
    if (loose.replace(/[\s_-]/g, '').length >= 5 && !COMMON.test(loose.replace(/[\s_-]/g, ''))) EXTRA.push([k === 'ComputerName' ? 'computer-name' : 'local-host-name', new RegExp('\\b(?:' + nameRe(v) + '|' + nameRe(loose) + ')\\b', 'i')]);
    else skip(k + ' rule', 'too generic to search for');
  }
  if (process.platform === 'darwin' && !macNames.length) skip('computer-name and local-host-name rules', 'scutil returned nothing');
  const hitsOf = (line) => { const h = S.textHits(line).filter(([, lv]) => lv === 'fail').map(([r]) => r);
    for (const [r, re] of EXTRA) if (re.test(line)) h.push(r); return h; };

  // ---- self-test (samples assembled at run time; nothing personal is written here) -------------------------------------
  const pos = [[j('/', 'Users', '/someone/x'), 'home-path-mac'], [j('/', 'private', '/tmp/x1'), 'temp-path'], [j('a.b', '@', 'gmail', '.com'), 'email'],
    [j('/', 'Volumes', '/Disk/x'), 'mounted-volume'],
    [j('~/', 'Downloads/a.glb'), 'home-layout'], [j('sk-', 'ant-', 'api03-', 'A'.repeat(24)), 'anthropic-key']];
  const missed = pos.filter(([s, r]) => !hitsOf(s).includes(r)).map(([, r]) => r);
  ok('self-test: every rule fires on its synthetic sample' + (missed.length ? ' (silent: ' + missed.join(' ') + ')' : ''), missed.length === 0);
  { const tok = 'zq' + Math.random().toString(36).slice(2, 8), T = S.compileTerms([tok + '-folder', 're:/' + tok + ' [a-z]+/']);
    const th = (l) => S.textHits(l, T).map(([r]) => r);
    ok('self-test: a private term made up at run time fires as a literal and as re:, and its rule name never carries it',
      th('in the ' + tok + '-FOLDER').includes('private-term#1') && th('x/' + tok + ' abc/y').includes('private-term#2') && T.every(([n]) => !n.includes(tok)) && S.textHits('in the ' + tok + '-folder', []).length === 0); }
  if (!S.PRIVATE.count) skip('owner private terms', 'no local list (tools/private_terms.local.txt or DC_PRIVATE_TERMS); the generic rules still run');
  { const M = maskKeepPaths(j('xx ', 'A'.repeat(70), ' yy /', 'Users', '/someone/', 'B'.repeat(70), ' zz'));
    ok('self-test: the base64 mask blanks long runs but never a run that holds a home or temp path', !/AAAA/.test(M) && hitsOf(M).includes('home-path-mac')); }
  const neg = [j('noreply', '@dinglecraft', '.invalid'), j('noreply', '@', 'anthropic.com'), 'Copyright (c) Dan Dingle', 'Felt Dan', 'file:// pages',
    'https://poly.pizza/m/7HbqG8RwRcA', 'out/purgatory/boss.log', '$DC_BUILD/game.js', 'process.env.HOME'];
  const noisy = neg.filter((s) => hitsOf(s).length);
  ok('self-test: the reserved addresses, the author name alone, relative and env-based paths stay quiet' + (noisy.length ? ' (' + noisy.length + ' fire)' : ''), noisy.length === 0);
  if (user.length >= 2 && !COMMON.test(user)) ok('self-test: the current user name fires in a path, not as a plain word',
    hitsOf('/x/' + user + '/y').includes('user-name-path') && !hitsOf('say ' + user + ' hi').includes('user-name-path') && !hitsOf('/' + user[0].toUpperCase() + user.slice(1) + ' was slain/').includes('user-name-path'));

  // ---- 1. every file a commit would hold -------------------------------------------------------------------------------
  const files = R.list();
  const found = {};           /* group -> ['path:line rule'] */
  const put = (g, s) => (found[g] = found[g] || []).push(s);
  const groupOf = (rel) => rel.split('/')[0].includes('.') || !rel.includes('/') ? 'top-level files' : rel.split('/')[0] + '/';
  let nText = 0;
  const images = [], audio = [];
  for (const rel of files) {
    const abs = path.join(P.REPO, rel), st = fs.statSync(abs);
    for (const r of S.fileRules(rel, st.size)) put('file rules', rel + ' ' + r);
    if (/\.(?:webp|png|jpe?g|gif|tiff?)$/i.test(rel)) images.push(rel);
    if (/\.(?:wav|mp3|ogg|oga|opus|flac|m4a|aac|mp4|webm)$/i.test(rel)) audio.push(rel);
    if (R.BIN_EXT.test(rel)) continue;
    const buf = fs.readFileSync(abs);
    if (R.isBinary(buf)) continue;
    nText++;
    const lines = maskKeepPaths(buf.toString('utf8')).split('\n');
    for (let i = 0; i < lines.length; i++) for (const r of hitsOf(lines[i])) put(groupOf(rel), rel + ':' + (i + 1) + ' ' + r);
  }
  const show = (a) => a.slice(0, 6).join(', ') + (a.length > 6 ? ' ... (' + a.length + ')' : '');
  const G = ['src/', 'html/', 'assets/', 'brain/', 'scripts/', 'tools/', 'tests/', 'docs/', '.github/', 'top-level files'];
  for (const g of Object.keys(found)) if (!G.includes(g) && g !== 'file rules') G.push(g);
  for (const g of G) ok('no personal data in ' + g + (found[g] ? ': ' + show(found[g]) : ''), !found[g]);
  ok('no forbidden file would be committed (.env, brain data, node_modules, generated assets, source images, shipped html, key files, > 50 MB)' +
    (found['file rules'] ? ': ' + show(found['file rules']) : ''), !found['file rules']);
  ok('the scan saw the whole repo (' + files.length + ' files, ' + nText + ' text)', files.length > 600 && nText > 300);

  // ---- 2. the shipped build --------------------------------------------------------------------------------------------
  const bfound = [];let built = true;
  const payloads = [];        /* [where, mime, Buffer] embedded data: URIs */
  for (const f of ['game.js', 'head.html', 'hrassets.js']) {
    const abs = P.BUILD + f; if (!fs.existsSync(abs)) { built = false; continue; }
    const t = fs.readFileSync(abs, 'utf8');
    if (f !== 'game.js') for (const m of t.matchAll(/data:((?:image|audio|video)\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g)) payloads.push([f, m[1], Buffer.from(m[2], 'base64')]);
    const lines = maskKeepPaths(t).split('\n');
    for (let i = 0; i < lines.length; i++) for (const r of hitsOf(lines[i])) bfound.push('build/' + f + ':' + (i + 1) + ' ' + r);
  }
  ok('the build is there (build/game.js, head.html, hrassets.js)', built);
  ok('no personal data in the shipped build (game.js, head.html, hrassets.js keys and metadata)' + (bfound.length ? ': ' + show(bfound) : ''), bfound.length === 0);

  // ---- 3. media metadata -----------------------------------------------------------------------------------------------
  const imgBad = [];
  for (const rel of images) { const m = S.imageMeta(fs.readFileSync(path.join(P.REPO, rel))); if (m.length) imgBad.push(rel + ' ' + m.join('+')); }
  ok('no image in the repo carries metadata (EXIF, XMP, ICC-free text chunks, tIME; ' + images.length + ' images)' + (imgBad.length ? ': ' + show(imgBad) : ''), imgBad.length === 0 && images.length > 400);
  const embImg = payloads.filter(([, mime]) => mime.startsWith('image/')), embBad = [];
  embImg.forEach(([f, mime, b], i) => { const m = S.imageMeta(b); if (m.length) embBad.push('build/' + f + ' payload #' + i + ' (' + mime + ') ' + m.join('+')); });
  ok('no image embedded in the build carries metadata (' + embImg.length + ' data: URIs in head.html and hrassets.js)' + (embBad.length ? ': ' + show(embBad) : ''), embBad.length === 0 && embImg.length > 400);
  const audBad = [];
  for (const rel of audio) { const m = audioMeta(fs.readFileSync(path.join(P.REPO, rel))); if (m.length) audBad.push(rel + ' ' + m.join('+')); }
  payloads.filter(([, mime]) => !mime.startsWith('image/')).forEach(([f, mime, b], i) => { const m = audioMeta(b); if (m.length) audBad.push('build/' + f + ' media #' + i + ' (' + mime + ') ' + m.join('+')); });
  ok('no audio or video file or embedded payload carries tags (ID3, RIFF INFO/bext/iXML, Vorbis/Opus comments, FLAC comments/pictures, MP4 udta; ' +
    audio.length + ' files, ' + payloads.filter(([, m]) => !m.startsWith('image/')).length + ' embedded)' + (audBad.length ? ': ' + show(audBad) : ''), audBad.length === 0);
  { const t = audioMeta; const wav = riff('WAVE', [['fmt ', 16], ['LIST', 8], ['data', 4]]), clean = riff('WAVE', [['fmt ', 16], ['data', 4]]);
    const id3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(20)]), flacC = Buffer.concat([Buffer.from('fLaC'), Buffer.from([0x84, 0, 0, 8]), Buffer.from([0, 0, 0, 0, 1, 0, 0, 0])]);
    ok('self-test: the audio tag reader flags RIFF LIST, ID3 and FLAC comments, and passes a clean WAV',
      t(wav).includes('riff-chunk:LIST') && t(id3).includes('mp3-id3v2') && t(flacC).includes('flac-comments') && t(clean).length === 0); }

  // ---- 4. hygiene files ------------------------------------------------------------------------------------------------
  const gi = fs.existsSync(P.REPO + '.gitignore') ? fs.readFileSync(P.REPO + '.gitignore', 'utf8').split('\n').map((s) => s.trim()) : [];
  const need = ['.env', '.env.*', '!.env.example', '/build/', '/dist/', '/out/', 'node_modules/', 'brain/data/', '.DS_Store', '*.gen.js'];
  const lack = need.filter((x) => !gi.includes(x));
  ok('.gitignore keeps out the env files, build outputs, node_modules, brain data, generated assets and .DS_Store' + (lack.length ? ' (missing: ' + lack.join(' ') + ')' : ''), lack.length === 0);
  const ex = fs.existsSync(P.REPO + '.env.example') ? fs.readFileSync(P.REPO + '.env.example', 'utf8').split('\n') : null;
  ok('.env.example holds variable NAMES only (every assignment is empty, everything else is a comment)',
    !!ex && ex.every((l) => !l.trim() || /^\s*#/.test(l) || /^[A-Z][A-Z0-9_]*=\s*$/.test(l)) && ex.some((l) => /^ANTHROPIC_API_KEY=\s*$/.test(l)));

  // ---- 5. git: identity and history (only once a repository exists) ----------------------------------------------------
  const OKMAIL = /(?:^|@)(?:dinglecraft\.invalid|users\.noreply\.github\.com|noreply\.github\.com)$|^noreply@github\.com$/i;
  if (!fs.existsSync(P.REPO + '.git')) skip('git identity and history', 'no repository yet');
  else {
    const git = (...a) => { try { return execFileSync('git', a, { cwd: P.REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { return null; } };
    const em = git('config', '--local', '--get', 'user.email'), nm = git('config', '--local', '--get', 'user.name');
    ok('git: the repo-local identity, if set, is the placeholder (never a personal address)', em === null || em === '' || (OKMAIL.test(em) && !!nm));
    const log = git('log', '--all', '--format=%ae%n%ce');
    if (log === null || log === '') skip('git history authors', 'no commits yet');
    else { const bad = [...new Set(log.split('\n').filter((e) => e && !OKMAIL.test(e)))];
      ok('git: every commit author and committer uses a placeholder or noreply address (' + bad.length + ' other address' + (bad.length === 1 ? '' : 'es') + ')', bad.length === 0); }
    const msgs = git('log', '--all', '--format=%B');
    if (msgs) { const bad = msgs.split('\n').filter((l) => hitsOf(l).length).length;
      ok('git: no commit message carries a personal path, address or key (' + bad + ' lines)', bad === 0); }
  }

  if (SKIPS.length) console.log('  (' + SKIPS.length + ' skipped: ' + SKIPS.join('; ') + ')');
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('CRASH ' + (e && e.stack || e)); process.exit(1); });

/* ipban.js's mask() blanks data: URIs and base64-looking runs (60+ chars) so random payload bytes cannot fire a rule. A path written
   without spaces or dashes is base64-shaped too, so a run that holds a home, temp or volume folder is left visible. */
function maskKeepPaths(text) {
  const PATHY = /\/(?:Users|home|private|Volumes|var\/folders|tmp)\//;
  return text.replace(/data:[a-z0-9.+\/-]+;base64,[A-Za-z0-9+\/=]*|[A-Za-z0-9+\/]{60,}={0,2}/g, (m) => (!m.startsWith('data:') && PATHY.test(m) ? m : ' '.repeat(m.length)));
}

/* tag/metadata blocks in audio and video containers (names only, never their values) */
function audioMeta(b) {
  const out = [];
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF') {
    for (let p = 12; p + 8 <= b.length;) { const t = b.toString('latin1', p, p + 4), n = b.readUInt32LE(p + 4);
      if (!['fmt ', 'data', 'fact', 'cue ', 'smpl', 'VP8 ', 'VP8L', 'VP8X', 'ALPH'].includes(t)) out.push('riff-chunk:' + t.trim());
      p += 8 + n + (n & 1); }
  }
  if (b.length >= 3 && b.toString('latin1', 0, 3) === 'ID3') out.push('mp3-id3v2');
  if (b.length >= 128 && b.toString('latin1', b.length - 128, b.length - 125) === 'TAG') out.push('mp3-id3v1');
  if (b.length >= 32 && b.toString('latin1', b.length - 32, b.length - 24) === 'APETAGEX') out.push('ape-tag');
  if (b.length >= 4 && b.toString('latin1', 0, 4) === 'OggS') {
    for (const sig of ['\x03vorbis', 'OpusTags']) { const i = b.indexOf(Buffer.from(sig, 'latin1')); if (i < 0) continue;
      let p = i + sig.length; if (p + 4 > b.length) continue; const vl = b.readUInt32LE(p); p += 4 + vl;
      if (p + 4 <= b.length && b.readUInt32LE(p) > 0) out.push('ogg-comments'); }
  }
  if (b.length >= 4 && b.toString('latin1', 0, 4) === 'fLaC') {
    for (let p = 4; p + 4 <= b.length;) { const h = b[p], last = h & 0x80, type = h & 0x7f, n = b.readUIntBE(p + 1, 3);
      if (type === 4 && p + 4 + 8 <= b.length) { const vl = b.readUInt32LE(p + 4); const q = p + 8 + vl; if (q + 4 <= b.length && b.readUInt32LE(q) > 0) out.push('flac-comments'); }
      if (type === 6) out.push('flac-picture');
      p += 4 + n; if (last) break; }
  }
  if (b.length >= 12 && b.toString('latin1', 4, 8) === 'ftyp' && (b.indexOf('udta') >= 0 || b.indexOf('\xa9', 0, 'latin1') >= 0 && b.indexOf('ilst') >= 0)) out.push('mp4-udta');
  if (b.indexOf('<x:xmpmeta') >= 0 || b.indexOf('http://ns.adobe.com/xap/1.0/') >= 0) out.push('xmp');
  return [...new Set(out)];
}
function riff(form, chunks) {
  const parts = [Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from(form)];
  for (const [id, n] of chunks) { const h = Buffer.alloc(8); h.write(id, 0, 'latin1'); h.writeUInt32LE(n, 4); parts.push(h, Buffer.alloc(n)); }
  const b = Buffer.concat(parts); b.writeUInt32LE(b.length - 8, 4); return b;
}
