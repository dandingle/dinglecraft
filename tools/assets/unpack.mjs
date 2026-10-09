#!/usr/bin/env node
/* unpack.mjs: turn the packers' generated asset scripts into the committed binary layout under assets/packed/.

   node tools/assets/unpack.mjs [--hr hr_assets.gen.js [--hr-manifest F]] [--mg mg_assets.gen.js [--mg-manifest F]] [--dest DIR]

   --dest defaults to assets/packed. A manifest defaults to the *.manifest.json beside its .gen.js.
   Writes, per set, exactly the bytes scripts/lib/assets.mjs reassembles (the v6.3 split contract):
     hr/header.txt    line 0 of hr_assets.gen.js + "\n" (verbatim)
     hr/meta.json     the hrAssetMeta() JSON, VERBATIM, no trailing newline (Python float spelling: never re-serialise)
     hr/t|e/<name>.<map>.webp   one binary per key 't:<name>|<map>' / 'e:<name>|<map>'
     mg/header.txt    line 0 of mg_assets.gen.js + "\n"
     mg/order.json    the keys in file order: "[\n" + '  "<key>"' lines joined by ",\n" + "\n]\n"
     mg/m/<name>.<map>.webp
     <set>/manifest.json        the packer's manifest, byte for byte
   A set is written to a staging folder first and then swapped in whole, so payloads that left the pack are removed.
   Prints counts and sizes only: never a payload, never a line of the .gen.js (they are megabytes long). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');
const HR_HEAD = 'function hrAssets(){return hrAssets.T||(hrAssets.T={';
const HR_TAIL = "if(typeof module!=='undefined'&&module.exports)module.exports={hrAssets,hrAssetMeta};";
const MG_TAIL = "if(typeof module!=='undefined'&&module.exports)module.exports.hrMgAssets=hrMgAssets;";

const relp = (p) => { const r = path.relative(REPO, p); return r && !r.startsWith('..') && !path.isAbsolute(r) ? r.split(path.sep).join('/') : path.basename(p); };
const isWebp = (b) => b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP';
const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');

function fileOf(key) {
  const m = /^([tem]):([a-z0-9_]+)\|([a-z])$/.exec(key);
  if (!m) throw new Error('bad asset key shape: ' + JSON.stringify(key).slice(0, 60));
  return m[1] + '/' + m[2] + '.' + m[3] + '.webp';
}
function payload(b64, what) {
  const bin = Buffer.from(b64, 'base64');
  if (bin.toString('base64') !== b64) throw new Error(what + ': base64 is not canonical');
  if (!isWebp(bin)) throw new Error(what + ': payload is not RIFF/WEBP');
  return bin;
}

/** Parse hr_assets.gen.js text into { header, meta, files: [[relFile, Buffer]] }. */
export function parseHr(text) {
  const L = text.split('\n');
  const m1 = /^function hrAssetMeta\(\)\{return (.*);\}$/.exec(L[1] || '');
  if (!m1 || L[2] !== HR_HEAD) throw new Error('hr_assets.gen.js: unexpected grammar (head)');
  const n = L.length;
  if (L[n - 1] !== '' || L[n - 2] !== HR_TAIL || L[n - 3] !== '});}') throw new Error('hr_assets.gen.js: unexpected grammar (tail)');
  const files = [], seen = new Set();
  for (let i = 3; i < n - 3; i++) {
    const m = /^"([^"]+)":"data:image\/webp;base64,([A-Za-z0-9+/=]+)",$/.exec(L[i]);
    if (!m) throw new Error('hr_assets.gen.js: unexpected grammar at entry ' + (i - 2));
    const f = fileOf(m[1]);
    if (!/^[te]\//.test(f)) throw new Error('hr_assets.gen.js: key kind must be t or e');
    if (seen.has(f.toLowerCase())) throw new Error('hr_assets.gen.js: two keys map to ' + f);
    seen.add(f.toLowerCase());
    files.push([f, payload(m[2], m[1])]);
  }
  return { header: L[0] + '\n', meta: m1[1], files };
}

/** Parse mg_assets.gen.js text into { header, order, files }. */
export function parseMg(text) {
  const L = text.split('\n');
  if (L.length !== 4 || L[3] !== '' || L[2] !== MG_TAIL) throw new Error('mg_assets.gen.js: unexpected grammar');
  const m1 = /^function hrMgAssets\(\)\{return \{(.*)\};\}$/.exec(L[1]);
  if (!m1) throw new Error('mg_assets.gen.js: unexpected grammar (body)');
  const items = [...m1[1].matchAll(/"([^"]+)":"data:image\/webp;base64,([A-Za-z0-9+/=]+)"/g)];
  if (items.map((m) => m[0]).join(',') !== m1[1]) throw new Error('mg_assets.gen.js: unexpected entry grammar');
  const files = items.map((m) => { const f = fileOf(m[1]); if (!/^m\//.test(f)) throw new Error('mg key kind must be m'); return [f, payload(m[2], m[1])]; });
  return { header: L[0] + '\n', order: items.map((m) => m[1]), files };
}

function writeSet(dest, set, parts, manifestBuf) {
  const final = path.join(dest, set);
  const stage = path.join(dest, '.' + set + '.unpack-' + process.pid);
  fs.rmSync(stage, { recursive: true, force: true });
  const w = (rel, data) => { const p = path.join(stage, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
  w('header.txt', parts.header);
  if (set === 'hr') w('meta.json', parts.meta);
  else w('order.json', '[\n' + parts.order.map((k) => '  ' + JSON.stringify(k)).join(',\n') + '\n]\n');
  for (const [f, bin] of parts.files) w(f, bin);
  w('manifest.json', manifestBuf);
  /* what changed vs the folder being replaced (names only) */
  const before = new Map();
  for (const sub of set === 'hr' ? ['t', 'e'] : ['m']) {
    const d = path.join(final, sub);
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.webp')) before.set(sub + '/' + f, sha1(fs.readFileSync(path.join(d, f))));
  }
  const after = new Map(parts.files.map(([f, b]) => [f, sha1(b)]));
  const added = [...after.keys()].filter((f) => !before.has(f));
  const removed = [...before.keys()].filter((f) => !after.has(f));
  const changed = [...after.keys()].filter((f) => before.has(f) && before.get(f) !== after.get(f));
  const old = final + '.old-' + process.pid;
  if (fs.existsSync(final)) fs.renameSync(final, old);
  fs.renameSync(stage, final);
  fs.rmSync(old, { recursive: true, force: true });
  return { fresh: before.size === 0, added, removed, changed, count: parts.files.length, bytes: parts.files.reduce((a, [, b]) => a + b.length, 0) };
}

/** Unpack one or both sets into dest. opts: { hr, hrManifest, mg, mgManifest, dest, log }. Returns per-set reports. */
export function unpack(opts) {
  const dest = path.resolve(opts.dest || path.join(REPO, 'assets', 'packed'));
  const log = opts.log || ((s) => console.log(s));
  const out = {};
  for (const set of ['hr', 'mg']) {
    const gen = opts[set];
    if (!gen) continue;
    const text = fs.readFileSync(gen, 'latin1');
    if (!/^[\x00-\x7f]*$/.test(text) || text.includes('<')) throw new Error(set + '_assets.gen.js must be ASCII with no <');
    const manifest = opts[set + 'Manifest'] || path.join(path.dirname(gen), set + '_assets.manifest.json');
    if (!fs.existsSync(manifest)) throw new Error('manifest not found beside ' + path.basename(gen) + ' (pass --' + set + '-manifest)');
    const parts = set === 'hr' ? parseHr(text) : parseMg(text);
    fs.mkdirSync(dest, { recursive: true });
    const r = writeSet(dest, set, parts, fs.readFileSync(manifest));
    log(`unpack ${set}: ${r.count} webp (${r.bytes} B) -> ${relp(path.join(dest, set))}/  (+${r.added.length} new, ${r.changed.length} changed, -${r.removed.length} removed)`);
    if (!r.fresh) for (const [k, list] of [['new', r.added], ['changed', r.changed], ['removed', r.removed]]) if (list.length) log(`  ${k}: ${list.slice(0, 30).join(' ')}${list.length > 30 ? ' ...' : ''}`);
    out[set] = r;
  }
  return out;
}

function cli() {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const opts = { hr: opt('--hr'), hrManifest: opt('--hr-manifest'), mg: opt('--mg'), mgManifest: opt('--mg-manifest'), dest: opt('--dest') };
  if (!opts.hr && !opts.mg || a.includes('--help')) {
    console.log('usage: node tools/assets/unpack.mjs [--hr hr_assets.gen.js [--hr-manifest F]] [--mg mg_assets.gen.js [--mg-manifest F]] [--dest DIR]');
    process.exit(a.includes('--help') ? 0 : 2);
  }
  try { unpack(opts); } catch (e) { console.error('unpack: ' + e.message); process.exit(1); }
}

if (import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1] || '.')).href) cli();
