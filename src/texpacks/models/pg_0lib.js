/* Puppet Purgatory (v6.1, P7): shared builders for the purgatory cast (HR.PG). Loaded before every other pg_*.js (sorted file
   order in hrLoadPModels(); preview.html loads it first). rig.js contract: feet at y 0, facing +z, 1 unit = 1 block, model's
   left = +x. Nothing here allocates per frame: geometries and canvases are cached at build time, update helpers reuse objects.
   Puppet anatomy (bible 9.1, OG look kept, one physical lie each): a felt head with a jaw hinged at the back, plastic eyes
   whose pupils lock onto the target before an attack, felt mitts with black arm rods, and under every puppet body a dark
   hand hole. The performers are real: hairy forearms (pgent_arm, else the v6.0 skin_arm), a cheap watch, a sleeve cuff.
   Textures: HR.texURL / HR.loadTex only (the game serves embedded data URIs). A missing id falls back down a list to v6.0
   materials (mat_jersey is a neutral felt-like weave that takes any tint) and finally to a flat colour or a painted canvas. */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS) return;
const PG = HR.PG = {};
const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
const GEO = {}, CANV = {};
const clamp = HR.clamp;
PG.clamp = clamp;
PG.smooth = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
PG.lerp = function (a, b, t) { return a + (b - a) * t; };
PG.rng = function (seed) {
  let a = ((seed + 1) * 2654435761) >>> 0;
  return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
function hash1(n, s) { const x = Math.sin((n + s) * 127.1) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }
/* HR.noise without the per-call closure */
PG.noise = function (t, seed) { const i = Math.floor(t), f = t - i, s = (seed || 0) * 13.37, u = f * f * (3 - 2 * f); return hash1(i, s) * (1 - u) + hash1(i + 1, s) * u; };
/* HR.twitch without its per-call closure: mostly 0, occasional sharp jerks */
PG.twitch = function (t, seed, rate, sharp) { const n = PG.noise(t * (rate || 1.3), seed); return Math.sign(n) * Math.pow(Math.abs(n), sharp || 6); };
/* spring toward a target, substepped (frame hitches cannot blow it up), with limits */
PG.pend = function (p, dt, k, c, target, drive, lo, hi) {
  const n = dt > 1 / 30 ? Math.min(8, Math.ceil(dt * 60)) : 1, h = dt / n;
  for (let i = 0; i < n; i++) {
    p.v += (-k * (p.a - target) - c * p.v + drive) * h;
    p.v = clamp(p.v, -40, 40);
    p.a += p.v * h;
    if (p.a < lo) { p.a = lo; if (p.v < 0) p.v *= -0.3; }
    if (p.a > hi) { p.a = hi; if (p.v > 0) p.v *= -0.3; }
  }
  return p.a;
};
PG.spring = function () { return { a: 0, v: 0 }; };
/* box part: geometry cached per size+uv; faces regrouped by material (one draw call per material) */
PG.box = function (w, h, d, mats, uv, shadow) {
  const key = w + ',' + h + ',' + d + '|' + (uv ? JSON.stringify(uv) : '');
  let g = GEO[key];
  if (!g) { g = HR.box(w, h, d, HR.flat(0x888888), uv).geometry; GEO[key] = g; }
  let mat = mats;
  if (!(mats instanceof THREE.Material)) {
    const per = FACES.map(k => mats[k] || mats.all), uniq = [];
    const pat = per.map(m => { let i = uniq.indexOf(m); if (i < 0) { i = uniq.length; uniq.push(m); } return i; });
    if (uniq.length === 1) mat = uniq[0];
    else {
      const gk = key + '#' + pat.join('');
      if (!GEO[gk]) {
        const ng = new THREE.BufferGeometry(), src = g.index.array, idx = [];
        for (const a in g.attributes) ng.setAttribute(a, g.attributes[a]);
        for (let m = 0; m < uniq.length; m++) {
          const st = idx.length;
          for (let f = 0; f < 6; f++) if (pat[f] === m) for (let k = 0; k < 6; k++) idx.push(src[f * 6 + k]);
          ng.addGroup(st, idx.length - st, m);
        }
        ng.setIndex(idx); GEO[gk] = ng;
      }
      g = GEO[gk]; mat = uniq;
    }
  }
  const m = new THREE.Mesh(g, mat);
  m.castShadow = shadow !== undefined ? shadow : Math.max(w, h, d) > 0.1;
  m.receiveShadow = true;
  return m;
};
PG.sphereGeo = function (r, seg) { const k = 's' + r + ',' + seg; return GEO[k] || (GEO[k] = new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1))); };
PG.cylGeo = function (rt, rb, h, seg, open) { const k = 'c' + rt + ',' + rb + ',' + h + ',' + seg + ',' + !!open; return GEO[k] || (GEO[k] = new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!open)); };
PG.coneGeo = function (r, h, seg) { const k = 'k' + r + ',' + h + ',' + seg; return GEO[k] || (GEO[k] = new THREE.ConeGeometry(r, h, seg)); };
PG.mesh = function (geo, mat, shadow) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow !== false; m.receiveShadow = true; return m; };
/* per-face UV crops at D tiles per block, offset per part so neighbouring boxes never repeat the same patch */
PG.tile = function (w, h, d, ou, ov, D) {
  D = D || 1.6;
  return {
    px: [ou, ov, ou + d * D, ov + h * D], nx: [ou + 0.37, ov + 0.21, ou + 0.37 + d * D, ov + 0.21 + h * D],
    py: [ou + 0.13, ov + 0.55, ou + 0.13 + w * D, ov + 0.55 + d * D], ny: [ou + 0.71, ov + 0.3, ou + 0.71 + w * D, ov + 0.3 + d * D],
    pz: [ou + 0.5, ov + 0.66, ou + 0.5 + w * D, ov + 0.66 + h * D], nz: [ou + 0.24, ov + 0.83, ou + 0.24 + w * D, ov + 0.83 + h * D],
  };
};
PG.withFront = function (uv, front) { uv.pz = front; return uv; };

/* ---- materials ---- */
/* the first entry whose texture exists (in the game: is embedded); [null, colour] is a flat colour */
PG.pick = function (list) {
  for (let i = 0; i < list.length; i++) { const id = list[i][0]; if (!id || HR.texURL(id, '_basecolor.png')) return list[i]; }
  return list[list.length - 1];
};
PG.has = function (id) { return !!HR.texURL(id, '_basecolor.png'); };
PG.hmat = function (id, opts) { const m = HR.mat(id, opts); m.userData.hrId = id; return m; };
/* texture self-heal for the preview's http server (dropped requests); embedded data URIs never drop */
const SLOT = ['map', 'normalMap', 'roughnessMap'], SUF = ['_basecolor.png', '_normal.png', '_roughness.png'];
const RETRY = new Map();
function heal(list) {
  if (HR.EMBEDDED) return;   /* embedded data URIs cannot drop, and take no ?retry= suffix */
  for (let i = 0; i < list.length; i += 2) {
    const base = list[i], m = list[i + 1];
    for (let k = 0; k < 3; k++) {
      const tex = m[SLOT[k]];
      if (!tex || tex.image !== undefined) continue;
      const r = RETRY.get(tex);
      if (r === undefined) {
        if (base[SLOT[k]] !== null) continue;
        RETRY.set(tex, null);
        const slot = SLOT[k];
        const nt = new THREE.TextureLoader().load(HR.retryURL(HR.texURL(base.userData.hrId, SUF[k])),
          () => { RETRY.set(tex, nt); base[slot] = nt; base.needsUpdate = true; }, undefined, () => RETRY.set(tex, false));
        nt.encoding = tex.encoding; nt.anisotropy = tex.anisotropy; nt.wrapS = tex.wrapS; nt.wrapT = tex.wrapT; nt.repeat.copy(tex.repeat);
      } else if (r !== null) { m[SLOT[k]] = r || null; m.needsUpdate = true; }
    }
  }
}
PG.heal = heal;
/* per-instance context: flashable materials (game: e.mats) and the heal list */
PG.ctx = function (seed) { return { mats: [], HL: [], healT: 0, healNext: 1.5, R: PG.rng(seed || 1) }; };
PG.tickHeal = function (C, dt) { C.healT += dt; if (C.healT >= C.healNext && C.healNext < 40) { C.healNext += 2; heal(C.HL); } };
PG.inst = function (C, base, color, rough, flash) {
  const m = base.clone(); if (base.userData && base.userData.hrId) C.HL.push(base, m);
  m.color.setHex(color); if (rough !== undefined) m.roughness = rough; m.metalness = 0;
  if (m.emissive) { m.emissive.setHex(0); m.emissiveIntensity = 1; }
  if (flash !== false) C.mats.push(m);
  return m;
};
/* list: [[id, tint, fallbackColour?], ..., [null, flatColour]] */
PG.mat = function (C, list, rough, opts, flash) {
  const it = PG.pick(list), id = it[0];
  if (!id) return PG.inst(C, HR.flat(it[1], { rough: rough }), it[1], rough, flash);
  const o = Object.assign({ fallback: it[2] !== undefined ? it[2] : (it[1] !== undefined ? it[1] : 0x8a7a6a) }, opts || {});
  return PG.inst(C, PG.hmat(id, o), it[1] !== undefined ? it[1] : 0xffffff, rough, flash);
};
PG.flat = function (C, color, rough, flash) { return PG.inst(C, HR.flat(color, { rough: rough }), color, rough, flash); };
/* unlit-ish dark: hand holes, mouth cavities (never flashed) */
PG.dark = function (color) { return HR.flat(color || 0x070505, { rough: 1 }); };
/* glowing bits (never flashed: authored emissive) */
PG.glow = function (color, I) { return HR.flat(color, { rough: .5, emissive: color, emissiveIntensity: I || 1 }); };
/* a painted canvas texture (a face before its photo exists), cached per key */
PG.canvasTex = function (key, size, paint) {
  if (CANV[key]) return CANV[key];
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  paint(g, size, PG.rng(key.length * 7 + key.charCodeAt(0)));
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return CANV[key] = t;
};
/* a face: the photo id when it exists, else the canvas painter; one clone per instance (the hurt flash) */
PG.face = function (C, id, key, paint, rough, opts) {
  if (id && PG.has(id)) return PG.inst(C, PG.hmat(id, Object.assign({ roughMap: false, normalScale: 0.6, fallback: 0xa89880 }, opts || {})), 0xffffff, rough === undefined ? 0.6 : rough);
  const k = 'pgfacem|' + key;
  if (!CANV[k]) CANV[k] = new THREE.MeshStandardMaterial({ map: PG.canvasTex(key, 256, paint), roughness: 0.85 });
  return PG.inst(C, CANV[k], 0xffffff, rough === undefined ? 0.85 : rough);
};
/* felt noise for canvas painters: base colour, pilling, one stitched seam */
PG.paintFelt = function (g, n, R, col, seam) {
  g.fillStyle = col; g.fillRect(0, 0, n, n);
  for (let i = 0; i < n * n / 18; i++) { const v = R() < 0.5 ? 0 : 255; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.03 + R() * 0.05) + ')'; g.fillRect(R() * n, R() * n, 1 + R() * 2, 1 + R() * 2); }
  if (seam) { g.strokeStyle = 'rgba(255,255,240,.35)'; g.setLineDash([3, 3]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(n * 0.5, 0); g.lineTo(n * 0.5, n); g.stroke(); g.setLineDash([]); }
};

/* ---- felt-puppet parts ---- */
/* a plastic eye: a yellowed ball and a black felt pupil that slides over its surface. look() eases the pupil toward a
   (yaw, pitch) in the head's frame (pitch + = down); lock() snaps it hard (the pre-attack lock). */
PG.eye = function (C, parent, x, y, z, r, o) {
  o = o || {};
  const g = HR.joint(parent, x, y, z);
  const ballM = o.ball || PG.flat(C, 0xe9e1c6, 0.32);
  const ball = PG.mesh(PG.sphereGeo(r, 16), ballM, false); g.add(ball);
  const piv = HR.joint(g, 0, 0, 0); piv.rotation.order = 'YXZ';
  const pupM = o.pupil || PG.dark(0x0a0808);
  const pupil = PG.mesh(PG.sphereGeo(r * (o.size || 0.45), 12), pupM, false);
  pupil.position.z = r * 0.9; pupil.scale.set(o.slit ? 0.34 : 1, 1, 0.3); piv.add(pupil);
  const E = { g, ball, piv, pupil, y: 0, p: 0 };
  E.look = function (yaw, pitch, dt, k) { const t = Math.min(1, dt * (k || 6)); E.y += (clamp(yaw, -0.8, 0.8) - E.y) * t; E.p += (clamp(pitch, -0.6, 0.6) - E.p) * t; piv.rotation.set(E.p, E.y, 0); };
  return E;
};
/* a felt mitt with a thumb and a black arm rod dangling from the wrist (a pendulum) */
PG.mitt = function (C, parent, side, mat, sc) {
  sc = sc || 1;
  const wr = HR.joint(parent, 0, 0, 0);
  HR.at(wr, PG.box(0.12 * sc, 0.15 * sc, 0.075 * sc, mat), 0, -0.075 * sc, 0);
  const th = HR.joint(wr, side * 0.06 * sc, -0.03 * sc, 0.02 * sc);
  HR.at(th, PG.box(0.045 * sc, 0.075 * sc, 0.05 * sc, mat), side * 0.02 * sc, -0.03 * sc, 0);
  th.rotation.z = side * 0.5;
  const rp = HR.joint(wr, 0, -0.06 * sc, -0.02 * sc);
  const rodM = PG.dark(0x121010);
  const rod = PG.mesh(PG.cylGeo(0.008 * sc, 0.008 * sc, 0.7 * sc, 5), rodM, false); rod.position.y = -0.35 * sc; rp.add(rod);
  return { wr, th, rp, rod, sw: PG.spring(), sz: PG.spring() };
};
/* the rod swings from the wrist; drive = the wrist's angular/linear jolt */
PG.rodTick = function (M, dt, drive, dz) {
  PG.pend(M.sw, dt, 14, 2.2, 0, drive, -1.2, 1.2); PG.pend(M.sz, dt, 14, 2.2, 0, dz || 0, -1, 1);
  M.rp.rotation.set(M.sw.a, 0, M.sz.a);
};
/* the dark hand hole under a puppet body (where the performer's arm goes in) */
PG.hole = function (parent, r, y) {
  const m = PG.mesh(PG.cylGeo(r, r, 0.012, 16), PG.dark(0x030202), false); m.position.y = y || 0.004; parent.add(m); return m;
};
/* the performer's arm: a cuff at the root, upper arm, elbow, forearm (watch near the wrist), aimed by solve().
   Built in the parent's frame; solve(hx,hy,hz, wx,wy,wz, bx,by,bz) puts the cuff at h, the wrist at w, the elbow bending
   toward the hint b (a direction). Two-bone IK, no allocation (scratch vectors are closed over). */
PG.arm = function (C, parent, o) {
  o = o || {};
  const L1 = o.l1 || 3.2, L2 = o.l2 || 3.0, W = o.w || 0.26;
  const skin = o.skin || PG.mat(C, [['pgent_arm', 0xffffff], ['skin_arm', 0xe0a882], [null, 0xd8a58a]], 0.55, { roughMap: false, normalScale: 0.8 });
  const cuffM = o.cuff || PG.mat(C, [['pgmat_cuff', 0xffffff], ['mat_jersey', 0x1c1a1c], [null, 0x161416]], 0.95, { roughMap: true, repeat: [1, 1] });
  const root = HR.joint(parent, 0, 0, 0);
  const cuff = PG.mesh(PG.cylGeo(W * 0.85, W * 1.05, 0.5, 10), cuffM); cuff.position.y = 0.2; root.add(cuff);
  const up = HR.joint(root, 0, 0, 0);
  const upM = PG.box(W, L1, W * 0.92, skin, { px: [0, 0, 0.35, 0.95], nx: [0.65, 0.02, 1, 0.97], pz: [0.33, 0, 0.66, 1], nz: [0.33, 0.04, 0.66, 1], py: [0.3, 0.9, 0.6, 1], ny: [0.3, 0, 0.6, 0.1] });
  upM.position.y = L1 / 2; up.add(upM);
  const el = HR.joint(up, 0, L1, 0);
  const elb = PG.mesh(PG.sphereGeo(W * 0.62, 10), skin); el.add(elb);
  const fo = HR.joint(el, 0, 0, 0);
  const foM = PG.box(W * 0.94, L2, W * 0.86, skin, { px: [0.62, 0, 1, 1], nx: [0, 0.03, 0.38, 0.98], pz: [0.3, 0, 0.7, 1], nz: [0.32, 0.02, 0.68, 0.99], py: [0.3, 0.9, 0.6, 1], ny: [0.3, 0, 0.6, 0.1] });
  foM.position.y = L2 / 2; fo.add(foM);
  const watchM = o.watch || PG.flat(C, 0x3a2416, 0.6);
  const strap = PG.box(W * 1.02, 0.07, W * 0.92, watchM); strap.position.y = L2 - 0.32; fo.add(strap);
  const face = PG.mesh(PG.cylGeo(0.06, 0.06, 0.03, 12), HR.flat(0xd8d2c0, { rough: 0.2, metal: 0.6 }), false);
  face.rotation.x = Math.PI / 2; face.position.set(0, L2 - 0.32, W * 0.5); fo.add(face);
  const UP = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Quaternion();
  /* the collar: a ring of sleeve at the hole in the floor the arm comes up through (through() mode) */
  const collar = PG.mesh(PG.cylGeo(W * 0.95, W * 1.15, 0.16, 10), cuffM); collar.visible = false; parent.add(collar);
  const A = { root, up, el, fo, cuff, collar, L1, L2 };
  A.solve = function (hx, hy, hz, wx, wy, wz, bx, by, bz) {
    root.position.set(hx, hy, hz);
    a.set(wx - hx, wy - hy, wz - hz);
    let d = a.length(); if (d < 1e-4) { a.set(0, 1, 0); d = 1e-4; }
    a.divideScalar(d);
    const dc = clamp(d, Math.abs(L1 - L2) + 0.05, L1 + L2 - 0.02);
    const cosA = clamp((L1 * L1 + dc * dc - L2 * L2) / (2 * L1 * dc), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    b.set(bx, by, bz); b.addScaledVector(a, -b.dot(a)); if (b.lengthSq() < 1e-6) { b.set(1, 0, 0); b.addScaledVector(a, -b.dot(a)); } b.normalize();
    c.copy(a).multiplyScalar(cosA).addScaledVector(b, sinA);        /* upper-arm direction */
    q.setFromUnitVectors(UP, c); up.quaternion.copy(q);
    /* elbow world = h + c*L1; forearm direction = normalize(w - elbow), expressed in the upper arm's frame */
    b.set(wx - (hx + c.x * L1), wy - (hy + c.y * L1), wz - (hz + c.z * L1)).normalize();
    q.invert(); b.applyQuaternion(q); q.setFromUnitVectors(UP, b); fo.quaternion.copy(q);
    return d;
  };
  /* the arm comes up THROUGH a hole at h: the shoulder end is pushed down the line wrist->hole until the arm's length fits, so a
     puppet near its hole shows a short stretch of forearm and a puppet at full reach shows all of it; the collar sits at the hole */
  A.through = function (hx, hy, hz, wx, wy, wz, bx, by, bz) {
    let dx = wx - hx, dy = wy - hy, dz = wz - hz, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 1e-3) { dx = 0; dy = 1; dz = 0; d = 1e-3; }
    const ext = Math.max(0, (L1 + L2) * 0.985 - d), ux = dx / d, uy = dy / d, uz = dz / d;
    A.solve(hx - ux * ext, hy - uy * ext, hz - uz * ext, wx, wy, wz, bx, by, bz);
    cuff.visible = ext < 0.3;
    collar.visible = true; collar.position.set(hx, hy + 0.04, hz); c.set(ux, uy, uz); q.setFromUnitVectors(UP, c); collar.quaternion.copy(q);
    return d;
  };
  return A;
};
/* a photo head: an upper box and a jaw hinged at its back edge, the face photo split across them at v = split.
   o: {w, h, d, jh (jaw height), face, all (sides/top material), mouth (inside of the jaw), crop [u0,v0,u1,v1], split, sideUV}
   Returns {up (the upper head mesh), jaw (the hinge joint), jawM, mouthBox}. Pivot: the head's bottom-back edge at (0,0,0). */
PG.head = function (C, parent, o) {
  const w = o.w, h = o.h, d = o.d, jh = o.jh, cr = o.crop || [0, 0, 1, 1], sp = o.split, all = o.all, face = o.face;
  const uh = PG.tile(w, h - jh, d, 0.3, 0.1); uh.pz = [cr[0], sp, cr[2], cr[3]]; if (o.sideUV) { uh.px = o.sideUV[0]; uh.nx = o.sideUV[1]; }
  const up = PG.box(w, h - jh, d, { all, pz: face, ny: o.mouth || all }, uh);
  up.position.set(0, jh + (h - jh) / 2, d / 2); parent.add(up);
  const jaw = HR.joint(parent, 0, jh, 0);
  const ju = PG.tile(w * 0.98, jh, d, 0.6, 0.2); ju.pz = [cr[0] + (cr[2] - cr[0]) * 0.01, cr[1], cr[2] - (cr[2] - cr[0]) * 0.01, sp];
  const jawM = PG.box(w * 0.98, jh, d * 0.99, { all, pz: face, py: o.mouth || all }, ju);
  jawM.position.set(0, -jh / 2, d * 0.99 / 2); jaw.add(jawM);
  const mouthBox = PG.box(w * 0.9, 0.02, d * 0.9, PG.dark(0x1a0606), undefined, false); mouthBox.position.set(0, jh + 0.012, d / 2); parent.add(mouthBox);
  return { up, jaw, jawM, mouthBox };
};
/* a ball whose front hemisphere shows a crop of a photo (planar projection): bulging eyes cut out of a face photo */
PG.photoBall = function (r, crop, seg) {
  const k = 'pb' + r + ',' + crop.join(',') + ',' + (seg || 16);
  if (GEO[k]) return GEO[k];
  const g = new THREE.SphereGeometry(r, seg || 16, Math.max(8, (seg || 16) >> 1)), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / r, y = p.getY(i) / r; uv.setXY(i, crop[0] + (x * 0.5 + 0.5) * (crop[2] - crop[0]), crop[1] + (y * 0.5 + 0.5) * (crop[3] - crop[1])); }
  uv.needsUpdate = true; return GEO[k] = g;
};
/* a full-body puppet (the Demolitionist, the Pig, the Cook, the Lab Rat, the Daredevil, the Yeti, the Drummer, the Frog): hips, two-segment legs with shoes, a torso,
   two-segment arms ending in felt mitts with arm rods (or o.hand(C, wrist, side) for a custom hand). All sizes in blocks.
   o: {hip, thigh, shin, legW, tw, th, td, armU, armF, armW, legM, torsoM, armM, shoeM, mittM, shoe:[w,h,d], noLegs}
   Returns joints: base, hips, torso, chest (shoulder line), neckJ, legs[2]={hip,knee}, arms[2]={sh,el,wr,mitt}. */
PG.biped = function (C, parent, o) {
  const B = { base: HR.joint(parent, 0, 0, 0) };
  B.hips = HR.joint(B.base, 0, o.hip, 0);
  B.legs = []; B.arms = [];
  if (!o.noLegs) for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1, hip = HR.joint(B.hips, sd * o.tw * 0.27, 0, 0);
    HR.at(hip, PG.box(o.legW, o.thigh, o.legW * 1.05, o.legM, PG.tile(o.legW, o.thigh, o.legW, 0.1 + i * 0.3, 0.2)), 0, -o.thigh / 2, 0);
    const knee = HR.joint(hip, 0, -o.thigh, 0);
    HR.at(knee, PG.box(o.legW * 0.92, o.shin, o.legW, o.legM, PG.tile(o.legW, o.shin, o.legW, 0.5 + i * 0.2, 0.6)), 0, -o.shin / 2, 0);
    const sh = o.shoe || [o.legW * 1.2, 0.07, o.legW * 1.8];
    HR.at(knee, PG.box(sh[0], sh[1], sh[2], o.shoeM || o.legM), 0, -o.shin - sh[1] / 2 + 0.01, sh[2] * 0.22);
    B.legs.push({ hip, knee });
  }
  B.torso = HR.joint(B.hips, 0, 0, 0);
  B.torsoM = PG.box(o.tw, o.th, o.td, o.torsoM, PG.tile(o.tw, o.th, o.td, 0.2, 0.4)); B.torsoM.position.y = o.th / 2; B.torso.add(B.torsoM);
  B.chest = HR.joint(B.torso, 0, o.th, 0);
  B.neckJ = HR.joint(B.chest, 0, 0.01, 0); B.neckJ.rotation.order = 'YXZ';
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1, sh = HR.joint(B.chest, sd * (o.tw / 2 + o.armW * 0.45), -0.03, 0);
    HR.at(sh, PG.box(o.armW, o.armU, o.armW, o.armM, PG.tile(o.armW, o.armU, o.armW, 0.3 * i, 0.5)), 0, -o.armU / 2, 0);
    const el = HR.joint(sh, 0, -o.armU, 0);
    HR.at(el, PG.box(o.armW * 0.9, o.armF, o.armW * 0.9, o.armM, PG.tile(o.armW, o.armF, o.armW, 0.6, 0.3 * i)), 0, -o.armF / 2, 0);
    const wr = HR.joint(el, 0, -o.armF, 0);
    const mitt = o.hand ? o.hand(C, wr, sd) : PG.mitt(C, wr, sd, o.mittM || o.armM, o.mittS || 1);
    B.arms.push({ sh, el, wr, mitt, sd });
  }
  return B;
};
/* the walk: legs swing, knees bend on the back stroke, arms counter-swing, a bob; returns the bob */
PG.walk = function (B, ph, sp, amp) {
  amp = amp || 0.7; const s = Math.sin(ph) * amp * sp;
  for (let i = 0; i < B.legs.length; i++) { const L = B.legs[i], a = i ? s : -s; L.hip.rotation.x = a; L.knee.rotation.x = Math.max(0, -a) * 1.1 + 0.05; }
  for (let i = 0; i < B.arms.length; i++) { const A = B.arms[i]; A.sh.rotation.x = (i ? -s : s) * 0.8; A.el.rotation.x = -0.15 - 0.25 * sp; }
  return Math.abs(Math.cos(ph)) * 0.03 * sp;
};
/* faces regrouped by material inside merged meshes (fewer draw calls); call once at the end of a build */
PG.packGroups = function (root) {
  root.traverse(o => {
    if (!o.isMesh || !Array.isArray(o.material) || !o.geometry.index || !o.geometry.groups.length) return;
    const g = o.geometry, idx = g.index.array, ms = o.material, uniq = [], lists = [];
    for (const gr of g.groups) { const m = ms[gr.materialIndex]; let k = uniq.indexOf(m); if (k < 0) { k = uniq.length; uniq.push(m); lists.push([]); } lists[k].push(gr); }
    if (uniq.length === g.groups.length) return;
    const out = new idx.constructor(idx.length); let p = 0; g.clearGroups();
    lists.forEach((L, k) => { const st = p; for (const gr of L) { out.set(idx.subarray(gr.start, gr.start + gr.count), p); p += gr.count; } g.addGroup(st, p - st, k); });
    g.setIndex(new THREE.BufferAttribute(out, 1));
    if (uniq.length === 1) { g.clearGroups(); o.material = uniq[0]; } else o.material = uniq;
  });
};
/* world-to-model helper for tethers: hrPgTick hands the model s.hlx/s.hly/s.hlz (its hole, model space) */
PG.v3 = function () { return new THREE.Vector3(); };
})();

