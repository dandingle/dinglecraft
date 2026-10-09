#!/usr/bin/env node
/* scan_secrets.mjs: the secrets + privacy scan over exactly the files git would commit (`npm run scan`).

   node tools/scan_secrets.mjs [--files LIST] [--only PREFIX ...] [--json] [--write-baseline]

   File list: `git ls-files -co --exclude-standard` (tracked + untracked-not-ignored). Before `git init` the same list
   comes from a throwaway probe repository in the OS temp folder (never inside the repo). --files LIST reads the list
   (one repo-relative path per line) instead; --only limits the scan to paths under the given prefixes.
   Output: `path:line rule` for text hits, `path rule` for file-level hits. NEVER a matched value, never a line's text.
   Rules: value-shaped keys (Anthropic, fal, ElevenLabs, OpenAI, AWS, GitHub, Google, Slack, JWT, PEM, quoted
   key/secret/token/password assignments); privacy (emails outside reserved/test domains, home-folder and temp paths,
   plus the owner's private terms from a local, untracked list: tools/lib/private_terms.cjs); forbidden files (.env*,
   *.env, .envrc, brain data, node_modules, generated asset scripts, source images, shipped html, key files, the art
   spend ledger, the private-terms list, > 50 MB); image metadata (WebP chunks other than VP8/VP8L/VP8X/ALPH, PNG
   eXIf/tEXt/iTXt/zTXt/tIME/iCCP, JPEG APP1/APP2/APP13/COM, GIF comments); chunk TYPE names only.
   Every listed file is read (src/features/part47-50.js and the og_trace goldens included, like any other file).
   tools/scan_baseline.json is the allow-list (rule + a hash of the line, never the line). Exit 1 on any finding that is
   not allow-listed. --write-baseline records the current findings as allowed (deliberate; review the list it prints). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const BASELINE = path.join(HERE, 'scan_baseline.json');
const BIG = 50 * 1024 * 1024;
const j = (...p) => p.join('');           // keeps this file from matching its own rules
const TERMS = createRequire(import.meta.url)('./lib/private_terms.cjs');
export const PRIVATE = TERMS.load();      // the owner's private terms (local and untracked; none in CI)
export const compileTerms = (entries) => TERMS.compile(entries);

/* ------------------------------------------------------------------ rules -- */
const KEY_RULES = [
  ['anthropic-key', new RegExp(j('sk-', 'ant-', '[A-Za-z0-9_\\-]{16,}'))],
  ['openai-key', /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/],
  ['fal-key', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{32}\b/i],
  ['elevenlabs-key', /\bsk_[0-9a-f]{40,}\b/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['google-api-key', /\bAIza[0-9A-Za-z_\-]{35}\b/],
  ['slack-token', /\bxox[abprs]-[0-9A-Za-z-]{10,}/],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['private-key', new RegExp(j('-----BEGIN ', '(?:[A-Z]+ )*', 'PRIVATE KEY-----'))],
  ['secret-assignment', /\b(?:api[_-]?key|secret|token|password|passwd|auth[_-]?token)\b["']?\s*[:=]\s*["']([A-Za-z0-9_\-./+=]{12,})["']/i],
];
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.([A-Za-z]{2,}))\b/g;
const EMAIL_OK_DOMAIN = /(?:^|\.)(?:example\.(?:com|org|net)|invalid|test|localhost|users\.noreply\.github\.com)$/i;
const EMAIL_OK_ADDR = new Set([j('noreply', '@', 'anthropic.com')]);
const NOT_TLD = /^(?:png|jpe?g|webp|gif|svg|js|mjs|cjs|json|html?|css|md|py|txt|ts|wav|mp3|ogg)$/i;
const PRIVACY_RULES = [
  ['home-path-mac', new RegExp(j('/', 'Users', '/[A-Za-z0-9_][^\\s\'"`/]*'))],
  ['home-path-linux', new RegExp(j('/', 'home', '/[a-z_][a-z0-9_-]*/'))],
  ['temp-path', new RegExp(j('/', 'private', '/(?:tmp|var/folders)/[A-Za-z0-9]'))],
  ['home-path-windows', /\b[A-Za-z]:\\{1,2}Users\\{1,2}[A-Za-z0-9]/],
];
const WARN_RULES = [];

/* A private term split into pieces ('ab' + '-cd', ['ab','cd'].join('-'), j('ab','-cd')) is invisible to a line regex, so the
   string literals of a line are also joined back together ('' and '-') and the private terms run on those too. */
export function joinedLiterals(line) {
  if (line.length > 200000) return [];
  const lits = [];
  for (const m of line.matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`\\\n$]*)`/g)) lits.push(m[1] ?? m[2] ?? m[3] ?? '');
  return lits.length >= 2 ? ['', '-'].map((sep) => lits.join(sep)) : [];
}

/* terms: the private-term rules to apply (default: the local list, if any) */
export function textHits(line, terms = PRIVATE.rules) {
  const hits = [];
  for (const [name, re] of KEY_RULES) if (re.test(line)) hits.push([name, 'fail']);
  for (const [name, re] of PRIVACY_RULES) if (re.test(line)) hits.push([name, 'fail']);
  if (terms.length) { const alt = joinedLiterals(line);
    for (const [name, re] of terms) if (re.test(line) || alt.some((v) => re.test(v))) hits.push([name, 'fail']); }
  for (const m of line.matchAll(EMAIL)) {
    const addr = m[0].toLowerCase(), dom = m[1], tld = m[2];
    if (NOT_TLD.test(tld) || EMAIL_OK_DOMAIN.test(dom) || EMAIL_OK_ADDR.has(addr)) continue;
    hits.push(['email', 'fail']); break;
  }
  for (const [name, re] of WARN_RULES) if (re.test(line)) hits.push([name, 'warn']);
  return hits;
}

export function fileRules(rel, size) {
  const b = path.posix.basename(rel), out = [];
  if ((/^\.env(\..+)?$/.test(b) && b !== '.env.example') || /\.env$/.test(b) || b === '.envrc') out.push('env-file');
  if (b === TERMS.LOCAL_NAME) out.push('private-terms-list');
  if (b === 'costs.md' || b === 'BUDGET') out.push('spend-ledger');
  if (rel.startsWith('brain/data/') || ['tokens.json', 'spend.jsonl', 'turns.jsonl'].includes(b)) out.push('brain-data');
  if (rel.split('/').includes('node_modules')) out.push('node-modules');
  if (/\.gen\.js$/.test(b) || b === 'hrassets.js') out.push('generated-assets');
  if (/\.(png|jpe?g|tiff?|psd|exr)$/i.test(b) && rel !== 'assets/logo.png') out.push('source-image');
  if (/^dinglecraft_v.*\.html$/.test(b)) out.push('shipped-html');
  if (/\.(pem|key|p12|pfx)$/i.test(b) || /^id_(rsa|ed25519|ecdsa)/.test(b) || ['.npmrc', '.netrc', '.pypirc', 'credentials.json'].includes(b)) out.push('key-file');
  if (size > BIG) out.push('big-file');
  return out;
}

export function imageMeta(buf) {
  const out = [];
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    for (let p = 12; p + 8 <= buf.length;) {
      const t = buf.toString('latin1', p, p + 4), n = buf.readUInt32LE(p + 4);
      if (!['VP8 ', 'VP8L', 'VP8X', 'ALPH'].includes(t)) out.push('webp-chunk:' + t.trim());
      p += 8 + n + (n & 1);
    }
  } else if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47) {
    for (let p = 8; p + 8 <= buf.length;) {
      const n = buf.readUInt32BE(p), t = buf.toString('latin1', p + 4, p + 8);
      if (['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME', 'iCCP'].includes(t)) out.push('png-chunk:' + t);
      if (t === 'IEND') break;
      p += 12 + n;
    }
  } else if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    for (let p = 2; p + 4 <= buf.length && buf[p] === 0xff;) {
      const m = buf[p + 1], n = buf.readUInt16BE(p + 2);
      if (m === 0xe1) out.push('jpeg-app1');
      if (m === 0xe2) out.push('jpeg-app2');
      if (m === 0xed) out.push('jpeg-app13');
      if (m === 0xfe) out.push('jpeg-comment');
      if (m === 0xda) break;
      p += 2 + n;
    }
  } else if (buf.length >= 13 && /^GIF8[79]a$/.test(buf.toString('latin1', 0, 6))) {
    /* walk the blocks: header, logical screen (+ global table), then extensions and images until the trailer */
    let p = 13; const f = buf[10]; if (f & 0x80) p += 3 * (1 << ((f & 7) + 1));
    const subs = (q) => { while (q < buf.length && buf[q] !== 0) q += 1 + buf[q]; return q + 1; };
    while (p < buf.length) {
      const b = buf[p];
      if (b === 0x3b) break;
      if (b === 0x21) { const lab = buf[p + 1]; if (lab === 0xfe) out.push('gif-comment'); if (lab === 0xff) { const app = buf.toString('latin1', p + 3, p + 14); if (!/^NETSCAPE2\.0|^ANIMEXTS1\.0/.test(app)) out.push('gif-app-ext'); } p = subs(p + 2); continue; }
      if (b === 0x2c) { let q = p + 10; const lf = buf[p + 9]; if (lf & 0x80) q += 3 * (1 << ((lf & 7) + 1)); p = subs(q + 1); continue; }
      break;
    }
  }
  return [...new Set(out)];
}

/* --------------------------------------------------------------- file list -- */
function gitList() {
  const run = (args, opts = {}) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20, ...opts });
  let top = null;
  try { top = run(['rev-parse', '--show-toplevel']).trim(); } catch { top = null; }
  if (top && fs.realpathSync(top) === fs.realpathSync(REPO)) return { how: 'git ls-files', list: run(['ls-files', '-co', '--exclude-standard', '-z']).split('\0').filter(Boolean) };
  const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-scan-probe-'));
  try {
    const gd = path.join(probe, 'probe.git');
    run(['--git-dir=' + gd, 'init', '-q']);
    const list = run(['--git-dir=' + gd, '--work-tree=' + REPO, 'ls-files', '-co', '--exclude-standard', '-z']).split('\0').filter(Boolean);
    return { how: 'git ls-files (probe repo in the temp folder; no git repo yet)', list };
  } finally { fs.rmSync(probe, { recursive: true, force: true }); }
}

/* ------------------------------------------------------------------- main -- */
function main() {
const a = process.argv.slice(2);
const flag = (k) => a.includes(k);
const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
const onlyPrefixes = a.flatMap((x, i) => (a[i - 1] === '--only' ? [x.replace(/^\.\//, '').replace(/\/?$/, '/')] : []));
const lineHash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

let src;
try {
  src = opt('--files') ? { how: '--files ' + path.basename(opt('--files')), list: fs.readFileSync(opt('--files'), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) } : gitList();
} catch (e) { console.error('scan: could not list the files (is git installed? or pass --files LIST): ' + String(e.message).split('\n')[0]); process.exit(2); }
let list = src.list.map((p) => p.split(path.sep).join('/'));
if (onlyPrefixes.length) list = list.filter((p) => onlyPrefixes.some((q) => (p + '/').startsWith(q)));

let base = { allow: [] };
try { base = { allow: [], ...JSON.parse(fs.readFileSync(BASELINE, 'utf8')) }; } catch { /* first run */ }
const allowKey = (f) => [f.file, f.rule, f.line || ''].join('|');
const allowed = new Map(base.allow.map((x) => [allowKey(x), x]));

const findings = [];   // {file, line?, lineNo?, rule, level}
let bytes = 0, nText = 0, nBin = 0;
for (const rel of list) {
  const abs = path.join(REPO, rel);
  let st;
  try { st = fs.lstatSync(abs); } catch { continue; }       // listed but deleted
  if (!st.isFile()) continue;
  bytes += st.size;
  for (const r of fileRules(rel, st.size)) findings.push({ file: rel, rule: r, level: 'fail' });
  if (st.size > BIG) continue;
  const buf = fs.readFileSync(abs);
  for (const m of imageMeta(buf)) findings.push({ file: rel, rule: m, level: 'fail' });
  if (buf.subarray(0, 8192).includes(0)) { nBin++; continue; }
  nText++;
  const lines = buf.toString('utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const [rule, level] of textHits(lines[i])) findings.push({ file: rel, lineNo: i + 1, line: lineHash(lines[i]), rule, level });
  }
}

const used = new Set();
const out = { fail: [], warn: [], allowed: 0 };
for (const f of findings) {
  const k = allowKey(f);
  if (allowed.has(k)) { used.add(k); out.allowed++; continue; }
  (f.level === 'warn' ? out.warn : out.fail).push(f);
}
const stale = base.allow.filter((x) => !used.has(allowKey(x)) && (!onlyPrefixes.length || onlyPrefixes.some((q) => (x.file + '/').startsWith(q))));

if (flag('--write-baseline')) {
  const add = out.fail.map((f) => ({ file: f.file, rule: f.rule, ...(f.line ? { line: f.line } : {}), why: 'TODO: say why this is allowed' }));
  const keep = base.allow.filter((x) => used.has(allowKey(x)) || onlyPrefixes.length && !onlyPrefixes.some((q) => (x.file + '/').startsWith(q)));
  const next = { ...base, allow: [...keep, ...add] };
  fs.writeFileSync(BASELINE, JSON.stringify(next, null, 1) + '\n');
  console.log(`scan: baseline written: ${keep.length} kept, ${add.length} added`);
  for (const f of add) console.log(`  + ${f.file} ${f.rule}`);
  process.exit(0);
}

if (flag('--json')) {
  console.log(JSON.stringify({ files: list.length, bytes, how: src.how, allowed: out.allowed,
    fail: out.fail.map((f) => ({ file: f.file, line: f.lineNo, rule: f.rule })), warn: out.warn.map((f) => ({ file: f.file, line: f.lineNo, rule: f.rule })),
    stale: stale.map((x) => ({ file: x.file, rule: x.rule })) }, null, 1));
  process.exit(out.fail.length ? 1 : 0);
}
console.log(`scan: ${list.length} files, ${(bytes / 1e6).toFixed(1)} MB (${src.how}${onlyPrefixes.length ? '; only ' + onlyPrefixes.join(' ') : ''})`);
console.log(`  text ${nText}, binary ${nBin}`);
console.log(`  private terms: ${PRIVATE.count ? PRIVATE.count + ' (from ' + PRIVATE.sources.join(', ') + '; never printed)' : 'none (no local list; the generic rules still run)'}`);
for (const f of out.fail) console.log(`FAIL  ${f.file}${f.lineNo ? ':' + f.lineNo : ''}  ${f.rule}`);
for (const f of out.warn) console.log(`warn  ${f.file}${f.lineNo ? ':' + f.lineNo : ''}  ${f.rule}`);
for (const x of stale) console.log(`note  stale baseline entry (no longer found): ${x.file} ${x.rule}`);
console.log(`scan: ${out.fail.length ? out.fail.length + ' finding(s) outside the baseline: FAIL' : '0 findings outside the baseline: OK'} (${out.allowed} allow-listed, ${out.warn.length} warning(s))`);
process.exit(out.fail.length ? 1 : 0);
}

function isMain() { try { return !!process.argv[1] && pathToFileURL(fs.realpathSync(process.argv[1])).href === import.meta.url; } catch { return false; } }
if (isMain()) main();
