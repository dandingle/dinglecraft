#!/usr/bin/env node
// box_pack.mjs: boxes in, a packed WPN3D entry out (src/features/p30_weapon_models_icons.js, decoded there by wpnRaw).
// Free and local: no network, no dependencies.
//
//   node tools/art/meshes/box_pack.mjs <spec.json>                      print the packed entry as JSON
//   node tools/art/meshes/box_pack.mjs <spec.json> --apply <p30.js> --index N [--fit] [--keep-pal]
//       replace the Nth entry (1-based, in literal order) of `const WPN3D={...};` in place, keeping its key and its place
//   node tools/art/meshes/box_pack.mjs --check <p30.js> --index N      print n, triangles, bbox and palette size of entry N
//
// Spec: {"boxes":[{"c":[x,y,z],"s":[w,h,d],"r":[rx,ry,rz],"k":paletteIndex}, ...], "pal":[[0xRRGGBB,tintable], ...]}
//   c = centre, s = size, r = optional rotation in radians about the box centre (applied about X, then Y, then Z), k = palette index.
//   Model units: the packer stores x200 in Int8, so every coordinate must end up inside [-0.64, 0.635].
//   --fit       scale and move the boxes per axis so the packed bounding box equals the replaced entry's (exact after packing)
//   --keep-pal  keep the replaced entry's palette (the spec's "k" values index into it; "pal" may be omitted)
// Packing (same as every other WPN3D entry): n = vertex count; p = Int8 xyz x200, base64; i = Uint16 (little-endian) triangle
// indices, base64; v = Uint8 palette index per vertex, base64; pal = [[rgbInt, tintable], ...]. Each box gets 24 vertices
// (4 per face) so computeVertexNormals gives flat faces; triangles wind counter-clockwise seen from outside (front faces).
// Never prints an entry's key name, only its index.
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const has = (f) => argv.includes(f);
const die = (m) => { console.error('box_pack: ' + m); process.exit(1); };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64enc(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 3) {
    const a = u8[i], b = i + 1 < u8.length ? u8[i + 1] : 0, c = i + 2 < u8.length ? u8[i + 2] : 0, n = (a << 16) | (b << 8) | c;
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < u8.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < u8.length ? B64[n & 63] : '=');
  }
  return s;
}
function b64dec(s) {          // the game's own decoder (b64bytes), so a round trip proves what the game will read
  let pad = 0; while (s[s.length - 1 - pad] === '=') pad++;
  const out = new Uint8Array((s.length / 4) * 3 - pad); let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const b = (B64.indexOf(s[i]) << 18) | (B64.indexOf(s[i + 1]) << 12) | ((B64.indexOf(s[i + 2]) & 63) << 6) | (B64.indexOf(s[i + 3]) & 63);
    out[o++] = (b >> 16) & 255; if (o < out.length) out[o++] = (b >> 8) & 255; if (o < out.length) out[o++] = b & 255;
  }
  return out;
}
function decode(d) {
  const p = b64dec(d.p), ib = b64dec(d.i), v = b64dec(d.v);
  const P = Array.from(p, (q) => (q < 128 ? q : q - 256) / 200);
  const I = new Uint16Array(ib.buffer.slice(0, ib.length));
  return { P, I, V: v, n: d.n };
}
function stats(d) {
  const D = decode(d), mn = [9, 9, 9], mx = [-9, -9, -9];
  for (let i = 0; i < D.n; i++) for (let a = 0; a < 3; a++) { const x = D.P[i * 3 + a]; mn[a] = Math.min(mn[a], x); mx[a] = Math.max(mx[a], x); }
  let ok = D.P.length === d.n * 3 && D.V.length === d.n && D.I.length % 3 === 0;
  for (const k of D.I) if (k >= d.n) ok = false;
  for (const k of D.V) if (k >= d.pal.length) ok = false;
  return { n: d.n, tris: D.I.length / 3, min: mn, max: mx, pal: d.pal.length, ok };
}

// the eight corners of a box, rotated about its centre (about X first, then Y, then Z)
function corners(b) {
  const [cx, cy, cz] = b.c, [w, h, d] = b.s, [rx, ry, rz] = b.r || [0, 0, 0];
  const cX = Math.cos(rx), sX = Math.sin(rx), cY = Math.cos(ry), sY = Math.sin(ry), cZ = Math.cos(rz), sZ = Math.sin(rz);
  const rot = ([x, y, z]) => {
    let y1 = y * cX - z * sX, z1 = y * sX + z * cX;                 // X
    let x2 = x * cY + z1 * sY, z2 = -x * sY + z1 * cY;              // Y
    let x3 = x2 * cZ - y1 * sZ, y3 = x2 * sZ + y1 * cZ;             // Z
    return [cx + x3, cy + y3, cz + z2];
  };
  const C = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) C.push(rot([sx * w / 2, sy * h / 2, sz * d / 2]));
  return C;   // index = (sx>0)*4 + (sy>0)*2 + (sz>0)
}
// faces as corner quads, counter-clockwise seen from outside
const FACES = [[4, 6, 7, 5], [0, 1, 3, 2], [2, 3, 7, 6], [0, 4, 5, 1], [1, 5, 7, 3], [0, 2, 6, 4]];   // +x -x +y -y +z -z

function build(spec, pal, fitTo) {
  const pos = [], idx = [], col = [];
  for (const b of spec.boxes) {
    if (!Array.isArray(b.c) || !Array.isArray(b.s) || !(b.k >= 0 && b.k < pal.length)) die('bad box ' + JSON.stringify(b));
    const C = corners(b);
    for (const f of FACES) {
      const base = pos.length / 3;
      for (const k of f) { pos.push(...C[k]); col.push(b.k); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  if (fitTo) {        // per-axis scale + offset so the packed bbox equals fitTo exactly
    for (let a = 0; a < 3; a++) {
      let lo = Infinity, hi = -Infinity;
      for (let i = a; i < pos.length; i += 3) { lo = Math.min(lo, pos[i]); hi = Math.max(hi, pos[i]); }
      const k = (fitTo.max[a] - fitTo.min[a]) / ((hi - lo) || 1);
      for (let i = a; i < pos.length; i += 3) pos[i] = fitTo.min[a] + (pos[i] - lo) * k;
    }
  }
  const n = pos.length / 3;
  if (n > 65535) die('too many vertices for Uint16 indices: ' + n);
  const p8 = new Uint8Array(n * 3);
  for (let i = 0; i < pos.length; i++) {
    const q = Math.round(pos[i] * 200);
    if (q < -128 || q > 127) die('coordinate out of the Int8 x200 range: ' + pos[i].toFixed(4));
    p8[i] = q & 255;
  }
  const i16 = new Uint16Array(idx), i8 = new Uint8Array(i16.buffer);
  return { n, p: b64enc(p8), i: b64enc(i8), v: b64enc(Uint8Array.from(col)), pal };
}

function readW(file) {
  const src = fs.readFileSync(file, 'utf8'), lines = src.split('\n');
  const li = lines.findIndex((l) => l.startsWith('const WPN3D='));
  if (li < 0) die('no "const WPN3D=" line in ' + file);
  const body = lines[li].slice('const WPN3D='.length);
  if (!body.endsWith(';')) die('the WPN3D line does not end with ";"');
  const W = JSON.parse(body.slice(0, -1));
  if ('const WPN3D=' + JSON.stringify(W) + ';' !== lines[li]) die('the WPN3D literal does not round-trip through JSON; refusing to rewrite it');
  return { src, lines, li, W };
}
function entryAt(W, n) {
  const keys = Object.keys(W);
  if (!(n >= 1 && n <= keys.length)) die('--index must be 1..' + keys.length);
  return keys[n - 1];
}
const fmt = (s) => `n ${s.n}, ${s.tris} triangles, bbox ${s.min.map((x) => x.toFixed(3)).join(',')} .. ${s.max.map((x) => x.toFixed(3)).join(',')}, palette ${s.pal}, decodes ${s.ok ? 'OK' : 'BAD'}`;

if (has('--check')) {
  const { W } = readW(opt('--check')), n = +opt('--index'), key = entryAt(W, n);
  console.log(`entry #${n}: ` + fmt(stats(W[key])));
  process.exit(0);
}
const specFile = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--apply' && argv[argv.indexOf(a) - 1] !== '--index');
if (!specFile) die('usage: box_pack.mjs <spec.json> [--apply <p30.js> --index N [--fit] [--keep-pal]] | --check <p30.js> --index N');
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
if (!Array.isArray(spec.boxes) || !spec.boxes.length) die('the spec has no boxes');

if (!has('--apply')) {
  if (!Array.isArray(spec.pal)) die('the spec needs "pal" (or use --apply ... --keep-pal)');
  console.log(JSON.stringify(build(spec, spec.pal, null)));
  process.exit(0);
}
const file = opt('--apply'), n = +opt('--index');
const R = readW(file), key = entryAt(R.W, n), old = R.W[key], oldS = stats(old);
const pal = has('--keep-pal') ? old.pal : spec.pal;
if (!Array.isArray(pal) || !pal.length) die('no palette: pass "pal" in the spec or --keep-pal');
const entry = build(spec, pal, has('--fit') ? oldS : null), newS = stats(entry);
if (!newS.ok) die('the packed entry does not decode consistently');
R.W[key] = { n: entry.n, p: entry.p, i: entry.i, v: entry.v, pal: entry.pal };   // same field order as the other entries
R.lines[R.li] = 'const WPN3D=' + JSON.stringify(R.W) + ';';
fs.writeFileSync(file, R.lines.join('\n'));
console.log(`entry #${n} replaced\n  before: ${fmt(oldS)}\n  after:  ${fmt(newS)}`);
