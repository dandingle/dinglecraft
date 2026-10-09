/* hr_models_child.js: builds the REAL Hyperreal cast models (src/texpacks/models/*.js) headless, for tests/purgatory/p8_recast.js.
   node tests/lib/hr_models_child.js '<json {variants:{model:[variant...]}, fields:{model:[s field...]}}>'
   Runs in its own process because it makes the stub THREE permissive: a THREE class the stubs lack becomes a plain Object3D /
   BufferGeometry / material / texture subclass, and a method or property a stub instance lacks becomes a callable no-op that
   returns its receiver (reads of it give a value that is 0 in arithmetic and empty when iterated). The same goes for the 2D canvas
   context. Nothing of this may leak into a suite's game boot, hence the separate process. The sources are run in src/ORDER.txt
   order (rig.js first, pg_0lib.js before the pg_* models) with the hooks the game sets before rig.js runs (embedded textures,
   no URLs). Every model is built (each listed variant too) and updated over a few frames with every s field it reads set to 0,
   0.5 and 1. Prints ONE line: JSON {models:{name:{build, err?, handles:[...], update, uerr?, variants:{v:{build,err?,handles}}}}}.
   Never prints source text. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const P = require('./paths.js');
const ARG = JSON.parse(process.argv[2] || '{}');
const out = { models: {}, load: [] };
const say = () => { process.stdout.write(JSON.stringify(out) + '\n'); };
try {
  require(P.STUBS);
  for (const s of ['A', 'B', 'C']) { try { require('./stubs_' + s + '.js'); } catch (e) { /* the feature stubs are optional here */ } }

  /* ---- the permissive layer (this process only) ---- */
  const mkDummy = () => { let p; const f = function () {};
    p = new Proxy(f, { get(t, k) { if (k === Symbol.toPrimitive) return () => 0; if (k === Symbol.iterator) return function* () {}; if (k === 'then') return undefined;
      if (k === 'length') return 0; if (k === 'prototype') return t.prototype; return p; },
    apply(t, self) { return self && (typeof self === 'object' || typeof self === 'function') && self !== p ? self : p; }, construct() { return p; }, set() { return true; }, has() { return false; } });
    return p; };
  const DUMMY = mkDummy();
  const PERM = new Proxy(Object.prototype, { get(t, k, r) { if (k in t || typeof k === 'symbol') return Reflect.get(t, k, r); return DUMMY; } });
  const T0 = global.THREE;
  const roots = new Set();
  for (const k of Object.keys(T0)) { const C = T0[k]; if (typeof C !== 'function' || !C.prototype) continue;
    let pr = C.prototype; while (Object.getPrototypeOf(pr) && Object.getPrototypeOf(pr) !== Object.prototype) pr = Object.getPrototypeOf(pr);
    if (Object.getPrototypeOf(pr) === Object.prototype) roots.add(pr); }
  for (const pr of roots) Object.setPrototypeOf(pr, PERM);
  /* attributes: the stub geometries carry none; give every geometry a 24-vertex position/normal/uv set and an index, and the
     attribute accessors the models use (getX.., setXY.., count) */
  const BA = T0.BufferAttribute.prototype;
  Object.defineProperty(BA, 'count', { configurable: true, get() { return this.array && this.itemSize ? Math.floor(this.array.length / this.itemSize) : 0; } });
  ['X', 'Y', 'Z', 'W'].forEach((c, o) => { BA['get' + c] = function (i) { return this.array[i * this.itemSize + o] || 0; };
    BA['set' + c] = function (i, v) { if (o < this.itemSize) this.array[i * this.itemSize + o] = v; return this; }; });
  BA.setXY = function (i, x, y) { return this.setX(i, x).setY(i, y); };
  BA.setXYZ = function (i, x, y, z) { return this.setX(i, x).setY(i, y).setZ(i, z); };
  BA.setXYZW = function (i, x, y, z, w) { return this.setX(i, x).setY(i, y).setZ(i, z).setW(i, w); };
  BA.clone = function () { return new T0.BufferAttribute(this.array.slice(), this.itemSize); };
  BA.copyArray = function (a) { this.array.set(a); return this; };
  const attrs = (g) => { if (!g || typeof g !== 'object') return g; if (!g.attributes || typeof g.attributes !== 'object') g.attributes = {};
    const A = g.attributes;
    if (!A.position) { const p = new Float32Array(72); for (let i = 0; i < 72; i++) p[i] = ((i * 7919) % 13) / 13 - 0.5; A.position = new T0.BufferAttribute(p, 3); }
    if (!A.normal) A.normal = new T0.BufferAttribute(new Float32Array(72), 3);
    if (!A.uv) { const u = new Float32Array(48); for (let i = 0; i < 48; i++) u[i] = (i % 4) / 3; A.uv = new T0.BufferAttribute(u, 2); }
    if (!g.index) g.index = new T0.BufferAttribute(new Uint16Array(36), 1);
    if (!Array.isArray(g.groups)) g.groups = [];
    return g; };
  const base = (name) => /Geometry$/.test(name) ? T0.BufferGeometry : /Material$/.test(name) ? T0.MeshStandardMaterial : /Texture$/.test(name) ? T0.Texture : T0.Object3D;
  const made = {};
  const extra = { TextureLoader: class { load() { return new T0.Texture(); } setPath() { return this; } }, ImageLoader: class { load() { return {}; } } };
  global.THREE = new Proxy(T0, { get(t, k) { if (typeof k === 'symbol') return t[k]; if (extra[k]) return extra[k];
    if (made[k]) return made[k];
    if (/Geometry$/.test(k)) return (made[k] = { [k]: class extends (typeof t[k] === 'function' ? t[k] : t.BufferGeometry) { constructor(...a) { super(...a); attrs(this); } } }[k]);
    if (k in t) return t[k];
    return (made[k] = { [k]: class extends base(k) {} }[k]); } });
  if (typeof global.ImageData === 'undefined') global.ImageData = class { constructor(a, w, h) { this.width = w || a || 1; this.height = h || w || 1; this.data = new Uint8ClampedArray(this.width * this.height * 4); } };
  const ce = document.createElement.bind(document);
  document.createElement = (tag) => { const el = ce(tag);
    if (el && typeof el.getContext === 'function' && !el.__perm) { const g = el.getContext.bind(el); el.__perm = 1;
      el.getContext = (...a) => { const c = g(...a); return c && typeof c === 'object' ? new Proxy(c, { get(t, k) { return k in t || typeof k === 'symbol' ? t[k] : DUMMY; } }) : c; }; }
    return el; };
  if (typeof global.window === 'undefined') global.window = global;
  /* the hooks the game sets before rig.js runs (tC_adapter hrEntInstall), embedded flavour */
  const HR = window.HR = window.HR || {};
  HR.EMBEDDED = true; HR.TEXBASE = 'embedded:'; HR.texURL = () => '';
  HR.loadTex = (u, srgb, onFail) => { const t = new global.THREE.Texture(); if (onFail) Promise.resolve().then(onFail); return t; };
  HR.loadImg = () => {};

  /* ---- the sources, in build order ---- */
  const order = fs.readFileSync(P.SRC.root + 'ORDER.txt', 'utf8').split('\n').map((l) => l.trim()).filter((l) => /^texpacks\/models\/[A-Za-z0-9_]+\.js$/.test(l));
  for (const rel of order) { try { vm.runInThisContext(fs.readFileSync(P.SRC.root + rel, 'utf8'), { filename: rel }); out.load.push([rel, 1]); }
    catch (e) { out.load.push([rel, 0, String(e && e.message || e).slice(0, 160)]); } }

  const S = (fields, v) => { const s = { speed: v, attack: v, hurt: 0, dead: 0, yaw: 0, pitch: 0, seed: 1, accel: { x: 0, y: 0, z: 0 } };
    for (const f of fields || []) if (!(f in s) || f === 'hurt') s[f] = v; s.accel = { x: 0, y: 0, z: 0 }; return s; };
  const handlesOf = (m) => m && m.handles && typeof m.handles === 'object' ? Object.keys(m.handles) : [];
  for (const name of Object.keys(HR.MODELS || {})) {
    const r = out.models[name] = { build: false, handles: [], update: false, variants: {} };
    let m = null;
    try { m = HR.MODELS[name](); r.build = !!(m && m.root && typeof m.update === 'function'); r.handles = handlesOf(m); }
    catch (e) { r.err = String(e && e.message || e).slice(0, 160); }
    if (m && typeof m.update === 'function') {
      try { let t = 0; for (const v of [0, 0.5, 1, 0.25]) for (let i = 0; i < 4; i++) { t += 0.04; m.update(0.04, t, S((ARG.fields || {})[name], v)); }
        r.update = true; } catch (e) { r.uerr = String(e && e.message || e).slice(0, 160); }
    }
    for (const v of ((ARG.variants || {})[name] || [])) {
      const q = r.variants[v] = { build: false, handles: [] };
      try { const mv = HR.MODELS[name](v); q.build = !!(mv && mv.root); q.handles = handlesOf(mv);
        if (mv && typeof mv.update === 'function') { let t = 0; for (const x of [0, 1]) for (let i = 0; i < 3; i++) { t += 0.04; mv.update(0.04, t, S((ARG.fields || {})[name], x)); } q.update = true; } }
      catch (e) { q.err = String(e && e.message || e).slice(0, 160); }
    }
  }
} catch (e) { out.fatal = String(e && e.stack || e).slice(0, 400); }
say();
setTimeout(() => process.exit(0), 50);
