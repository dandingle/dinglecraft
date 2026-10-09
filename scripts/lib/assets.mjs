// Assemble the two embedded-art scripts from the committed packed payloads (assets/packed/), byte for byte.
//
//   hr_assets.gen.js  = header.txt + 'function hrAssetMeta(){return ' + meta.json + ';}\n'
//                       + 'function hrAssets(){return hrAssets.T||(hrAssets.T={\n'
//                       + one '"<key>":"data:image/webp;base64,<b64>",\n' per payload, SORTED BY KEY STRING
//                       + '});}\n' + the module.exports line
//   mg_assets.gen.js  = header.txt + 'function hrMgAssets(){return {' + entries in order.json order, comma-joined + '};}\n'
//                       + the module.exports line
//   hrassets.js       = hr + mg
//
// The three gotchas (docs/ASSETS.md):
//   1. meta.json is VERBATIM: never JSON.parse/stringify it (the packer is Python and writes floats as 1.0).
//   2. hr keys sort by the key string 't:<name>|<map>', never by file name ('|' sorts after '_', '.' before it).
//   3. mg keys are NOT sorted: order.json holds their order (ids x maps).
// The manifests' fileSha1 / sha1 pin the assembled text, so any drift fails the build.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { REPO } from './paths.mjs';

const PREFIX = 'data:image/webp;base64,';
const FILE_RE = /^([a-z0-9_]+)\.([a-z])\.webp$/;
const sha1 = (s) => crypto.createHash('sha1').update(s, 'latin1').digest('hex');

function oneLine(file) {
  const s = fs.readFileSync(file, 'latin1');
  if (!s.endsWith('\n') || s.indexOf('\n') !== s.length - 1) throw new Error(path.basename(path.dirname(file)) + '/header.txt must be exactly one line ending in a newline');
  return s;
}

function uri(file) {
  const b = fs.readFileSync(file);
  if (b.length < 12 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') throw new Error('not a RIFF/WEBP payload: ' + path.basename(file));
  return PREFIX + b.toString('base64');
}

/** Assemble hr_assets.gen.js text from assets/packed/hr. Returns { text, keys }. */
export function assembleHr(repo = REPO) {
  const D = path.join(repo, 'assets', 'packed', 'hr');
  let meta = fs.readFileSync(path.join(D, 'meta.json'), 'latin1');
  if (meta.endsWith('\n')) meta = meta.slice(0, -1);           // tolerate ONE newline an editor may have added
  if (meta.includes('\n')) throw new Error('assets/packed/hr/meta.json must be one line (verbatim packer output)');
  const entries = [];
  for (const kind of ['t', 'e']) {
    for (const f of fs.readdirSync(path.join(D, kind))) {
      if (f.startsWith('.')) continue;
      const m = FILE_RE.exec(f);
      if (!m) throw new Error('unexpected file in assets/packed/hr/' + kind + ': ' + f);
      entries.push([`${kind}:${m[1]}|${m[2]}`, path.join(D, kind, f)]);
    }
  }
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const out = [oneLine(path.join(D, 'header.txt')),
    'function hrAssetMeta(){return ', meta, ';}\n',
    'function hrAssets(){return hrAssets.T||(hrAssets.T={\n'];
  for (const [k, f] of entries) out.push(JSON.stringify(k), ':', JSON.stringify(uri(f)), ',\n');
  out.push("});}\nif(typeof module!=='undefined'&&module.exports)module.exports={hrAssets,hrAssetMeta};\n");
  return { text: out.join(''), keys: entries.map((e) => e[0]) };
}

/** Assemble mg_assets.gen.js text from assets/packed/mg. Returns { text, keys }. */
export function assembleMg(repo = REPO) {
  const D = path.join(repo, 'assets', 'packed', 'mg');
  const order = JSON.parse(fs.readFileSync(path.join(D, 'order.json'), 'utf8'));
  const files = new Set(fs.readdirSync(path.join(D, 'm')).filter((f) => !f.startsWith('.')));
  const parts = order.map((k) => {
    const m = /^m:([a-z0-9_]+)\|([a-z])$/.exec(k);
    if (!m) throw new Error('assets/packed/mg/order.json: bad key ' + JSON.stringify(k));
    const f = m[1] + '.' + m[2] + '.webp';
    if (!files.delete(f)) throw new Error('assets/packed/mg/m/' + f + ' missing (listed in order.json)');
    return JSON.stringify(k) + ':' + JSON.stringify(uri(path.join(D, 'm', f)));
  });
  if (files.size) throw new Error('assets/packed/mg/m has files not in order.json: ' + [...files].join(', '));
  const text = oneLine(path.join(D, 'header.txt')) + 'function hrMgAssets(){return {' + parts.join(',') + '};}\n'
    + "if(typeof module!=='undefined'&&module.exports)module.exports.hrMgAssets=hrMgAssets;\n";
  return { text, keys: order };
}

/** The splice-era boundary contract for an asset script. Returns problems. */
export function checkAssetText(name, text, mustHave) {
  const p = [];
  if (!/^[\x00-\x7f]*$/.test(text)) p.push(name + ': not pure ASCII');
  if (text.includes('<')) p.push(name + ": contains '<' (would break the inline <script>)");
  if (!text.endsWith('\n')) p.push(name + ': does not end with a newline');
  for (const s of mustHave) if (!text.includes(s)) p.push(name + ': missing ' + s);
  return p;
}

/** Assemble both, run the contract and the manifest sha1 pins. Returns { hr, mg, problems, info }. */
export function assembleAssets(repo = REPO) {
  const problems = [];
  const hr = assembleHr(repo), mg = assembleMg(repo);
  problems.push(...checkAssetText('hr_assets.gen.js', hr.text, ['function hrAssets(', 'function hrAssetMeta(', 'module.exports']));
  problems.push(...checkAssetText('mg_assets.gen.js', mg.text, ['function hrMgAssets(', 'module.exports']));
  const hm = JSON.parse(fs.readFileSync(path.join(repo, 'assets', 'packed', 'hr', 'manifest.json'), 'utf8'));
  const mm = JSON.parse(fs.readFileSync(path.join(repo, 'assets', 'packed', 'mg', 'manifest.json'), 'utf8'));
  const hs = sha1(hr.text), ms = sha1(mg.text);
  if (hs !== hm.fileSha1) problems.push('hr_assets.gen.js: sha1 differs from assets/packed/hr/manifest.json fileSha1 (repack with npm run repack)');
  if (Buffer.byteLength(hr.text, 'latin1') !== hm.fileBytes) problems.push('hr_assets.gen.js: size differs from manifest fileBytes');
  if (ms !== mm.sha1) problems.push('mg_assets.gen.js: sha1 differs from assets/packed/mg/manifest.json sha1 (repack with npm run repack)');
  if (Buffer.byteLength(mg.text, 'latin1') !== mm.fileBytes) problems.push('mg_assets.gen.js: size differs from manifest fileBytes');
  const hk = Object.keys(hm.keys || {}).sort(), ak = [...hr.keys].sort();
  if (hk.length && JSON.stringify(hk) !== JSON.stringify(ak)) problems.push('assets/packed/hr: payload files do not match the manifest keys');
  const mk = Object.keys(mm.keys || {});
  if (mk.length && JSON.stringify([...mk].sort()) !== JSON.stringify([...mg.keys].sort())) problems.push('assets/packed/mg: order.json does not match the manifest keys');
  return { hr: hr.text, mg: mg.text, problems, info: { hrKeys: hr.keys.length, mgKeys: mg.keys.length, hrSha1: hs, mgSha1: ms } };
}
