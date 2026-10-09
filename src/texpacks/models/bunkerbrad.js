/* BunkerBrad: "He Has Become The Bunker" (Hyperreal pack, DESIGN_BIBLE section 2).
   Three hand-stacked sandbags for a torso, a sandbag helmet, a gas mask his skin has grown over,
   a periscope out of his skull that locks onto you (world-stable, even while he lies flat),
   and a spare arm cling-filmed to his pack "in case". Every hit: he hits the deck.
   Death: the sandbags deflate and pour sand, he sags to the ground, the periscope keeps sweeping.
   Preview triggers: hurt() = the dive, attack() = jab + sandbag ripple, die() = deflate,
   s.build (rising edge) = place + pat pat. */
(function () {
'use strict';
const HR = window.HR, THREE = window.THREE;
if (!HR || !THREE) return;
const PI = Math.PI, TAU = PI * 2, clamp = HR.clamp;

/* ---------- measured from final_ent/face_brad_basecolor.png (1024 sq; u left->right, v bottom->top as sampled) ---------- */
const FACE_BRAD = {
  lensR: [0.215, 0.560],  // glass centre, image-left lens = model's RIGHT eye (-x)
  lensL: [0.800, 0.560],  // glass centre, image-right lens = model's LEFT eye (+x)
  lensRad: 0.180,         // glass radius in UV (outer rubber ring ~0.22)
  pupilR: [0.225, 0.582], pupilL: [0.776, 0.585],
  port: [0.500, -0.02],   // threaded filter port centre (sits just below the chin edge); thread ring r 0.13..0.20
  stitchV: 0.85,          // grown-over pink skin + black stitches above this line
};
/* final_ent/stump_section_basecolor.png: bone end centre and radius (UV) */
const STUMP = { c: [0.50, 0.53], boneR: 0.15 };

const HEAD = 0.5;
const NECK_Y = 0.71;          // neck above the hip joint (world 1.37)
const HIP_Y = 0.66;
const TOE_Z = 0.16;           // front of the boots: pivot for the prone dive
const DIVE = 1.40;            // prone pitch (bible: 1.3 cap on slopes; 1.4 puts his chest on flat ground)
const DEATH = 3.0;
const BAG_Y = [0.11, 0.35, 0.59];   // hip-local bag centres (world 0.77 / 1.01 / 1.25)
const BAG_H = 0.25;
const BAG_ROT = [-0.06, 0.04, -0.03];
const BAG_TINT = [0xb59b6b, 0xa88f60, 0xbfa676];
const N_SAND = 144;
/* sand pours out of torn holes in each bag: [bag, x, y, z (bag-local, on the surface), outward nx, nz] */
const HOLES = [   // front corners + flanks, so the piles land clear of his sprawled legs and arms
  [0, 0.24, -0.03, 0.17, 0.75, 0.65], [0, -0.30, -0.02, -0.06, -1, -0.35],
  [1, -0.24, -0.04, 0.17, -0.7, 0.7], [1, 0.30, -0.03, -0.08, 1, -0.4],
  [2, 0.20, -0.03, 0.17, 0.55, 0.85], [2, -0.21, -0.04, -0.17, -0.35, -1],
];
/* head_brad_side: side-profile photo (mask rim + stitches at image-left, olive strap, ear), face toward image-left.
   px [0,0,1,1], nx mirrored. The strap leaves the image's back edge at v 0.60-0.69, continued round the back by a band.
   false = the bible's olive balaclava on the sides/back */
const SIDE_TEX = true;
const STRAP_V = [0.60, 0.69];
/* mean of each tileable material's _roughness.png (green): rough = bible target / mean (three clamps the product at 1) */
const RMEAN = { burlap: 0.16, jersey: 0.31, skin: 0.35 };
/* clothes: photo-built limb unwraps (tools/build_cloth.py): sleeve_brad (olive ripstop field shirt: buttoned cuff, elbow
   patch, salt tide marks, duct tape over a tear) and trousers_brad (brown canvas: flapped cargo pocket, mud-caked knees,
   cross-stitched repair, bloused bottoms). Limb A (model +x) v .5-1, B (-x) v 0-.5; front [0,.25) outer [.25,.5)
   back [.5,.75) inner [.75,1], v 0 = cuff. CLOTHES false = the tinted jersey */
const CLOTHES = true;
function limbUV(A) {
  const v0 = A ? 0.5 : 0, v1 = A ? 1 : 0.5;
  return A ? { pz: [0, v0, 0.25, v1], px: [0.25, v0, 0.5, v1], nz: [0.5, v0, 0.75, v1], nx: [0.75, v0, 1, v1], py: [0.1, v1 - 0.02, 0.2, v1 - 0.01], ny: [0.1, v0 + 0.002, 0.2, v0 + 0.01] }
           : { pz: [0.25, v0, 0, v1], nx: [0.5, v0, 0.25, v1], nz: [0.75, v0, 0.5, v1], px: [1, v0, 0.75, v1], py: [0.1, v1 - 0.02, 0.2, v1 - 0.01], ny: [0.1, v0 + 0.002, 0.2, v0 + 0.01] };
}
/* the olive shirt core seen between the sandbags: the sleeve atlas's upper arm */
const CORE_UV = { pz: [0.02, 0.6, 0.23, 0.98], nz: [0.52, 0.6, 0.73, 0.98], px: [0.27, 0.6, 0.48, 0.98], nx: [0.77, 0.6, 0.98, 0.98], py: [0.05, 0.9, 0.2, 0.98], ny: [0.55, 0.9, 0.7, 0.98] };
function lin(hex) { let o = 0; for (let sh = 16; sh >= 0; sh -= 8) { const c = ((hex >> sh) & 255) / 255; o = (o << 8) | Math.round(255 * (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))); } return o; }
/* one draw call per material per box: faces sharing a material made contiguous */
function packGroups(root) {
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
}

/* ---------- shared base materials (textures loaded once; per-instance clones below) ---------- */
let BASE = null;
const BASE_IDS = { burlap: 'mat_burlap', jersey: 'mat_jersey', skin: 'mat_skin', face: 'face_brad', stump: 'stump_section', side: 'head_brad_side', hair: 'hair_shared', sleeve: 'sleeve_brad', trouser: 'trousers_brad', arm: 'skin_arm' };
function bases() {
  if (BASE) return BASE;
  const rep = m => { for (const k of ['map', 'normalMap', 'roughnessMap']) { const t = m[k]; if (t) t.wrapS = t.wrapT = THREE.RepeatWrapping; } return m; };
  BASE = {
    burlap: rep(HR.mat('mat_burlap', { rough: 1.0 / RMEAN.burlap, normalScale: 1.4, fallback: 0xb59b6b })),   // 6.2: dry sackcloth, no satin sheen
    jersey: rep(HR.mat('mat_jersey', { rough: 0.9 / RMEAN.jersey, normalScale: 1.0 })),                      // 2.9: no glare slab on the sleeve
    skin: rep(HR.mat('mat_skin', { rough: 0.55 / RMEAN.skin, normalScale: 0.7 })),                           // 1.6
    face: HR.mat('face_brad', { rough: 0.5, normalScale: 0.6, roughMap: false, fallback: 0x4a5232 }),
    stump: HR.mat('stump_section', { rough: 0.18, normalScale: 0.8, roughMap: false, fallback: 0x7a2a2a }),
    side: HR.mat('head_brad_side', { rough: 0.5, normalScale: 0.6, roughMap: false, fallback: 0x8a6a50 }),
    hair: HR.mat('hair_shared', { rough: 0.6, normalScale: 0.9, roughMap: false, fallback: 0x5a4430 }),
    sleeve: HR.mat('sleeve_brad', { rough: 0.9, normalScale: 0.9, roughMap: false, fallback: 0x56633a }),
    trouser: HR.mat('trousers_brad', { rough: 0.9, normalScale: 0.9, roughMap: false, fallback: 0x4b3a28 }),
    arm: rep(HR.mat('skin_arm', { rough: 0.55, normalScale: 0.8, roughMap: false, fallback: 0xc9926b })),
  };
  for (const k in BASE) BASE[k].userData.hrId = BASE_IDS[k];
  return BASE;
}

/* The rig repairs only its cached base material when a texture fails to load (it nulls base.map).
   Our per-instance clones still hold the dead texture and would render black, so every 0.5 s we
   look for that case and retry the file once (shared across instances), else fall back to flat tint. */
const TEX_KEYS = ['map', 'normalMap', 'roughnessMap'];
const TEX_SUFFIX = { map: '_basecolor.png', normalMap: '_normal.png', roughnessMap: '_roughness.png' };
const RETRY = {};
function healMats(pairs) {
  if (HR.EMBEDDED) return;   /* embedded data URIs cannot drop, and take no ?retry= suffix */
  for (let i = 0; i < pairs.length; i++) {
    const c = pairs[i][0], b = pairs[i][1], id = pairs[i][2];
    for (let k = 0; k < 3; k++) {
      const key = TEX_KEYS[k], t = c[key];
      if (!t || b[key] || t.image) continue;          // fine, or still loading
      const url = HR.texURL(id, TEX_SUFFIX[key]);
      let r = RETRY[url];
      if (!r) {
        r = RETRY[url] = new THREE.TextureLoader().load(HR.retryURL(url), undefined, undefined, () => { r.failed = true; });
        r.anisotropy = t.anisotropy; r.wrapS = t.wrapS; r.wrapT = t.wrapT;
        if (key === 'map') r.encoding = THREE.sRGBEncoding;
      }
      if (r.failed) { c[key] = null; c.needsUpdate = true; }
      else if (t !== r) { c[key] = r; c.needsUpdate = true; }
    }
  }
}
/* ---------- geometry helpers ---------- */
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
/* per-face UV rects sized to the face so texel density is even (k = texture repeats per block) */
function tile(w, h, d, k, seed) {
  const f = (a, b, i) => { const u = hash(seed * 7.13 + i * 3.1), v = hash(seed * 3.71 + i * 1.7 + 9); return [u, v, u + a * k, v + b * k]; };
  return { px: f(d, h, 1), nx: f(d, h, 2), py: f(w, d, 3), ny: f(w, d, 4), pz: f(w, h, 5), nz: f(w, h, 6) };
}
function tbox(w, h, d, mat, k, seed, over) {
  const uv = tile(w, h, d, k, seed);
  if (over) Object.assign(uv, over);
  return HR.box(w, h, d, mat, uv);
}
/* stuffed-sack box: tapered ends, domed top, bulging sides */
function pillow(w, h, d, mat, o, uv) {
  const g = new THREE.BoxGeometry(w, h, d, o.sx || 6, o.sy || 3, o.sz || 4);
  const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
  const hw = w / 2, hh = h / 2, hd = d / 2;
  for (let i = 0; i < P.count; i++) {
    const nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
    const f = nx > 0.5 ? 'px' : nx < -0.5 ? 'nx' : ny > 0.5 ? 'py' : ny < -0.5 ? 'ny' : nz > 0.5 ? 'pz' : 'nz';
    const c = uv && uv[f];
    if (c) U.setXY(i, c[0] + U.getX(i) * (c[2] - c[0]), c[1] + U.getY(i) * (c[3] - c[1]));
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ax = x / hw, ay = y / hh, az = z / hd;
    const mid = 1 - ay * ay;
    let yy = (o.flat && ay < 0) ? y : y * (1 - (o.tx || 0) * ax * ax) * (1 - (o.tz || 0) * az * az);
    if (o.sag && ay > 0) yy -= o.sag * hh * (1 - ax * ax) * (1 - az * az) * ay;
    P.setXYZ(i, x * (1 + (o.bx || 0) * mid * (1 - 0.5 * az * az)), yy, z * (1 + (o.bz || 0) * mid * (1 - 0.5 * ax * ax)));
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true;
  return m;
}
function noShadow(m) { m.castShadow = false; return m; }
/* damped pendulum with substeps and per-part limits (rig's ±1.4 is too loose for these parts) */
function pend(p, dt, drive, k, c, lo, hi) {
  let n = Math.ceil(dt * 120); if (n < 1) n = 1; if (n > 12) n = 12;
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    p.v += (-k * p.a - c * p.v + drive) * h; p.a += p.v * h;
    if (p.a > hi) { p.a = hi; if (p.v > 0) p.v *= -0.35; } else if (p.a < lo) { p.a = lo; if (p.v < 0) p.v *= -0.35; }
  }
  if (!(p.a === p.a) || !(p.v === p.v)) { p.a = 0; p.v = 0; }
  return p.a;
}
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
function easeOutBack(x) { const c1 = 1.9, c3 = c1 + 1; const y = x - 1; return 1 + c3 * y * y * y + c1 * y * y; }
/* allocation-free copies of the rig's noise/twitch helpers (the rig versions build a closure per call) */
function nhash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }
function vnoise(t, seed) { const i = Math.floor(t), f = t - i, s = (seed || 0) * 13.37, u = f * f * (3 - 2 * f); return nhash(i + s) * (1 - u) + nhash(i + 1 + s) * u; }
function vtwitch(t, seed, rate, sharp) { const n = vnoise(t * rate, seed); return Math.sign(n) * Math.pow(Math.abs(n), sharp); }
function wrapA(a) { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; }
function diveCurve(t) {
  if (t < 0.12) { const x = t / 0.12; return x * x * DIVE; }            // falls like a dropped plank
  if (t < 0.22) return DIVE - 0.07 * Math.sin(PI * (t - 0.12) / 0.10);   // chest bounce on impact
  if (t < 0.80) return DIVE;                                            // holds 0.6 s
  if (t < 1.12) return DIVE * (1 - easeOutBack((t - 0.80) / 0.32));     // springs back up, overshoots
  return 0;
}
function diveWeight(t) {
  if (t < 0.08) return t / 0.08;
  if (t < 0.80) return 1;
  if (t < 1.12) return 1 - smooth((t - 0.80) / 0.32);
  return 0;
}

HR.MODELS.bunkerbrad = function () {
  const B = bases();
  const mats = [];
  const pairs = [];
  const inst = (base, color, rough, extra) => {
    const m = base.clone(); if (color !== undefined) m.color.setHex(color); if (rough !== undefined) m.roughness = rough;
    if (extra) Object.assign(m, extra); mats.push(m); pairs.push([m, base, base.userData.hrId]); return m;
  };
  let healT = 0;
  const flat = (color, rough, metal, keep) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal || 0 });
    if (keep !== false) mats.push(m); return m;
  };

  /* per-instance materials */
  const mBag = BAG_TINT.map(c => inst(B.burlap, c));
  const mHelmet = mBag[0];
  const mPack = inst(B.burlap, 0x6e6a4a);
  const mBala = inst(B.jersey, 0x5d6640);
  const mBedroll = inst(B.jersey, 0x5b6b3a);
  const mSleeve = CLOTHES ? inst(B.sleeve, 0xffffff) : inst(B.jersey, 0x56633a);
  const mTrouser = CLOTHES ? inst(B.trouser, 0xffffff) : inst(B.jersey, 0x4b3a28);
  const mHand = CLOTHES ? inst(B.arm, 0xc9926b, 0.6) : inst(B.skin, 0xc9926b, 0.6 / RMEAN.skin);
  const mSpare = CLOTHES ? inst(B.arm, 0xcfa080, 0.5) : inst(B.skin, 0xcfa080, 0.5 / RMEAN.skin);       // the gloss comes from the cling film, not the skin
  const mSpareHand = CLOTHES ? inst(B.arm, 0xc49480, 0.5) : inst(B.skin, 0xc49480, 0.5 / RMEAN.skin);
  const mBoot = inst(B.skin, 0x1e1a16, 0.5 / RMEAN.skin);         // leather
  const mFace = inst(B.face);
  const mSide = SIDE_TEX ? inst(B.side) : mBala;
  const mHair = SIDE_TEX ? inst(B.hair, 0x7a5a3c) : mBala;        // matches the side photo's hair
  const mStump = inst(B.stump, 0xffffff, 0.15);
  const mCan = flat(0x4a5232, 0.45, 0.5);
  const mScope = flat(0x3d4a26, 0.5, 0.4);
  const mBungee = flat(0xc23a1e, 0.55, 0);
  const mTape = flat(0xa9a9a9, 0.35, 0.2);
  /* kept OUT of mats: the glowing periscope lens, glass, cling film, sand */
  const mLens = new THREE.MeshStandardMaterial({ color: 0x0b1a22, roughness: 0.05, metalness: 0.2, emissive: new THREE.Color(0x3a6a80), emissiveIntensity: 0.55 });   // bible: #335566 @0.3; brighter so the 'eye' reads at range
  const mGlass = new THREE.MeshStandardMaterial({ color: 0xe6eef0, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false });
  const mFilm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false });
  const mSand = new THREE.MeshStandardMaterial({ color: lin(0x9c8458), roughness: 1 });   // damp builder's sand, not sugar

  /* ---------- hierarchy ---------- */
  const root = new THREE.Group(); root.name = 'bunkerbrad';
  const tipG = HR.joint(root, -0.32, 0, 0);            // death: final sag onto his right side
  const diveG = HR.joint(tipG, 0.32, 0, TOE_Z);        // hurt: prone dive pivots about the boot toes
  const bodyG = HR.joint(diveG, 0, 0, -TOE_Z);

  /* legs */
  const mkLeg = (side) => {
    const j = HR.joint(bodyG, side * 0.13, HIP_Y, 0);
    HR.at(j, tbox(0.22, 0.52, 0.22, mTrouser, 1.6, 11 + side, CLOTHES ? limbUV(side > 0) : undefined), 0, -0.26, 0);
    HR.at(j, tbox(0.24, 0.14, 0.28, mBoot, 1.5, 21 + side), 0, -0.59, 0.02);
    return j;
  };
  const lL = mkLeg(1), lR = mkLeg(-1);
  HR.at(lL, noShadow(HR.box(0.235, 0.06, 0.235, mTape)), 0, -0.30, 0);

  /* upper body */
  const hips = HR.joint(bodyG, 0, HIP_Y, 0);
  HR.at(hips, tbox(0.48, 0.72, 0.26, mSleeve, 1.6, 31, CLOTHES ? CORE_UV : undefined), 0, 0.355, 0);   // olive shirt core, seen in the gaps
  const bagG = [], bagM = [];
  for (let i = 0; i < 3; i++) {
    const g = HR.joint(hips, 0, BAG_Y[i], 0); g.rotation.y = BAG_ROT[i];
    const m = pillow(0.58, BAG_H, 0.34, mBag[i], { tx: 0.26, tz: 0.14, bx: 0.05, bz: 0.10, sag: 0.0 }, tile(0.58, BAG_H, 0.34, 1.35, 40 + i * 5));
    g.add(m); bagG.push(g); bagM.push(m);
  }
  const chest = HR.joint(hips, 0, 0, 0);
  /* head */
  const neck = HR.joint(chest, 0, NECK_Y, 0);
  const headJ = HR.joint(neck, 0, 0, 0);               // inner joint for tremor
  const balaUV = tile(HEAD, HEAD, HEAD, 1.6, 51);
  HR.at(headJ, HR.box(HEAD, HEAD, HEAD, { pz: mFace, px: mSide, nx: mSide, py: mHair, nz: mHair, ny: mHand },
    SIDE_TEX ? { px: [0, 0, 1, 1], nx: [1, 0, 0, 1], py: balaUV.py, nz: balaUV.nz, ny: [0.2, 0.2, 0.8, 0.8] }
             : { px: balaUV.px, nx: balaUV.nx, py: balaUV.py, nz: balaUV.nz, ny: [0.2, 0.2, 0.8, 0.8] }), 0, HEAD / 2, 0);
  /* the mask strap carries on round the back of his head */
  if (SIDE_TEX) HR.at(headJ, noShadow(tbox(HEAD + 0.006, (STRAP_V[1] - STRAP_V[0]) * HEAD, 0.006, mBala, 1.6, 52)), 0, (STRAP_V[0] + STRAP_V[1]) / 2 * HEAD, -HEAD / 2 - 0.002);
  /* fogged glass over the baked lenses: catches sun and torch speculars */
  const lensGeo = new THREE.CylinderGeometry(FACE_BRAD.lensRad * HEAD * 0.98, FACE_BRAD.lensRad * HEAD, 0.012, 28);
  [FACE_BRAD.lensR, FACE_BRAD.lensL].forEach(c => {
    const g = new THREE.Mesh(lensGeo, mGlass); g.rotation.x = PI / 2; g.renderOrder = 2; g.castShadow = false;
    HR.at(headJ, g, (c[0] - 0.5) * HEAD, c[1] * HEAD, HEAD / 2 + 0.007);
  });
  /* filter canister plugged into the threaded port, pointing forward-down */
  const canJ = HR.joint(headJ, (FACE_BRAD.port[0] - 0.5) * HEAD, 0.035, HEAD / 2 - 0.01);
  canJ.rotation.x = PI / 2 + 0.35;
  const can = HR.at(canJ, HR.cyl(0.078, 0.078, 0.14, mCan, 14), 0, 0.07, 0);
  HR.at(canJ, noShadow(HR.cyl(0.084, 0.084, 0.025, mCan, 14)), 0, 0.012, 0);   // threaded collar
  /* sandbag helmet */
  /* same stuffed-sack profile as the torso bags (domed both sides, bulging), so it reads as a sandbag tied on his head */
  const helmet = HR.joint(headJ, 0, 0.58, 0); helmet.rotation.z = 0.06;
  helmet.add(pillow(0.60, 0.22, 0.60, mHelmet, { tx: 0.24, tz: 0.20, bx: 0.06, bz: 0.08, sag: 0.06, sx: 6, sy: 3, sz: 6 }, tile(0.6, 0.22, 0.6, 1.35, 61)));
  const knot1 = HR.at(helmet, noShadow(tbox(0.10, 0.08, 0.10, mHelmet, 2, 62)), 0.31, 0.02, 0.31); knot1.rotation.y = PI / 4;
  const knot2 = HR.at(helmet, noShadow(tbox(0.10, 0.08, 0.10, mHelmet, 2, 63)), -0.31, 0.02, -0.31); knot2.rotation.y = PI / 4 + 0.3;
  /* periscope: world-stable, counter-rotated against everything above the root */
  const periBase = HR.joint(helmet, 0, 0.105, -0.05);
  HR.at(periBase, HR.box(0.07, 0.40, 0.07, mScope), 0, 0.20, 0);
  const innerTube = HR.at(periBase, HR.box(0.05, 0.38, 0.05, mScope), 0, 0.20, 0);   // telescopes up when he's on the deck
  HR.at(periBase, noShadow(HR.box(0.10, 0.04, 0.10, mScope)), 0, 0.01, 0);    // collar where it leaves the sack
  const scopeJ = HR.joint(periBase, 0, 0.42, 0);
  HR.at(scopeJ, HR.box(0.08, 0.08, 0.18, { all: mScope, pz: mLens }), 0, 0, 0.05);

  /* arms */
  const mkArm = (side) => {
    const j = HR.joint(chest, side * 0.40, 0.66, 0);
    HR.at(j, tbox(0.19, 0.56, 0.19, mSleeve, 1.6, 71 + side, CLOTHES ? limbUV(side > 0) : undefined), 0, -0.28, 0);
    HR.at(j, tbox(0.17, 0.12, 0.17, mHand, 1.8, 81 + side), 0, -0.62, 0);
    return j;
  };
  const aL = mkArm(1), aR = mkArm(-1);

  /* backpack, bedroll, bungees, spare arm (own group so it can settle on the ground at death) */
  const packG = HR.joint(hips, 0, 0, 0);
  HR.at(packG, pillow(0.42, 0.52, 0.24, mPack, { tx: 0.08, tz: 0.1, bx: 0.04, bz: 0.10, sag: 0.04 }, tile(0.42, 0.52, 0.24, 1.35, 91)), 0, 0.38, -0.29);
  const bedroll = HR.at(packG, HR.cyl(0.08, 0.08, 0.46, mBedroll, 14), 0, 0.73, -0.33); bedroll.rotation.z = PI / 2;
  const spareJ = HR.joint(packG, -0.14, 0.54, -0.515);   // strap (bible -0.14,1.10,-0.43; raised + moved off the pack so the cut end clears his right ear)
  /* the spare arm: upper arm (cut end up beside his right ear), a slight elbow bend so it reads as an
     ARM from across the map, forearm + hand; each segment cling-filmed like a deli roast */
  const ELBOW = 0.35;
  HR.at(spareJ, HR.box(0.17, 0.34, 0.17, { all: mSpare, py: mStump },
    { py: [STUMP.c[0] - 0.25, STUMP.c[1] - 0.25, STUMP.c[0] + 0.25, STUMP.c[1] + 0.25], px: [0.1, 0.0, 0.3, 0.4], nx: [0.5, 0.1, 0.7, 0.5], pz: [0.3, 0.2, 0.5, 0.6], nz: [0.6, 0.0, 0.8, 0.4] }), 0, 0.28, 0);
  const elbowJ = HR.joint(spareJ, 0, 0.115, 0); elbowJ.rotation.z = ELBOW;
  HR.at(elbowJ, HR.box(0.16, 0.30, 0.16, mSpare, { px: [0.2, 0.5, 0.4, 0.85], nx: [0.6, 0.5, 0.8, 0.85], pz: [0.1, 0.6, 0.3, 0.95], nz: [0.7, 0.6, 0.9, 0.95] }), 0, -0.13, 0);
  HR.at(elbowJ, HR.box(0.15, 0.11, 0.15, mSpareHand, { all: [0.4, 0.4, 0.6, 0.55] }), 0, -0.335, 0);
  const film1 = HR.at(spareJ, HR.box(0.205, 0.39, 0.205, mFilm), 0, 0.27, 0);
  const film2 = HR.at(elbowJ, HR.box(0.195, 0.45, 0.195, mFilm), 0, -0.19, 0);
  for (const f of [film1, film2]) { f.renderOrder = 2; f.castShadow = false; f.receiveShadow = false; }
  /* bungees: a band round each filmed segment, strap running flat across the pack to its far (left) edge */
  const mkBungee = (parent, y, tilt, len) => {
    const j = HR.joint(parent, 0, y, 0); j.rotation.z = -tilt;
    j.add(noShadow(HR.box(0.215, 0.028, 0.215, mBungee)));
    HR.at(j, noShadow(HR.box(len, 0.026, 0.026, mBungee)), 0.09 + len / 2, 0, 0.082);
    return j;
  };
  mkBungee(spareJ, 0.30, 0.45, 0.36);
  mkBungee(elbowJ, -0.12, 0.45 + ELBOW, 0.20);

  /* sand that pours out when the bags deflate (one instanced mesh, root space) */
  const sand = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.014, 0.018), mSand, N_SAND);
  sand.castShadow = false; sand.receiveShadow = true; sand.visible = false; sand.frustumCulled = false;
  root.add(sand);
  const sp = new Float32Array(N_SAND * 3), sv = new Float32Array(N_SAND * 3), sT = new Float32Array(N_SAND);
  const dummy = new THREE.Object3D();

  /* ---------- per-instance animation state ---------- */
  const st = {
    prevHurt: 0, prevAtk: false, prevBuild: false,
    diveT: 99, atkT: 99, buildT: 99, ripT: 99, ripA: 0, hype: 0, deadT: -1,
    phase: 0, breath: 0, lastBreath: 0,
    dartFrom: 0, dartTo: 0, dartCur: 0, dartFromP: 0, dartToP: 0, dartCurP: 0, dartT: 1, dartNext: 0.6,
    scope: 0, scopeInit: false,
    pitchW: 0, pitchV: 0, prevSpeed: 0,
    wob: { a: 0, v: 0 }, sway: { a: 0, v: 0 }, flop: { a: 0, v: 0 },
    limbL: { a: 0, v: 0 }, limbR: { a: 0, v: 0 }, nod: { a: 0, v: 0 },
    sandOn: false, defl: [0, 0, 0],
    elbow: { a: 0, v: 0 }, elbowX: { a: 0, v: 0 }, prevSwayV: 0, prevFlopV: 0,
  };
  const qA = new THREE.Quaternion(), qB = new THREE.Quaternion();
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  const hooks = { squeak: null };   // game can set hooks.squeak = rate => playRubberSqueak()

  /* each hole pours a thin stream: 24 grains per hole, one every 30 ms, bottom bag first */
  const NH = HOLES.length, sOn = new Uint8Array(N_SAND), landed = new Uint8Array(NH), sRest = new Float32Array(N_SAND), pile = new Float32Array(NH * 2);
  const hv = new THREE.Vector3(), hn = new THREE.Vector3();
  function initSand() {
    for (let i = 0; i < N_SAND; i++) {
      const h = i % NH, j = Math.floor(i / NH);
      sT[i] = 0.04 + HOLES[h][0] * 0.12 + (h % 2) * 0.05 + j * 0.03 + hash(i * 7.7) * 0.015;
      sOn[i] = 0; sp[i * 3 + 1] = -5; sRest[i] = 0;
    }
    landed.fill(0);
  }
  function spawnGrain(i) {
    const H = HOLES[i % NH], g = bagG[H[0]];
    hv.set(H[1], H[2], H[3]); g.localToWorld(hv); root.worldToLocal(hv);
    hn.set(H[1] + H[4] * 0.1, H[2], H[3] + H[5] * 0.1); g.localToWorld(hn); root.worldToLocal(hn);
    hn.sub(hv).normalize();
    const sp0 = 0.32 + hash(i * 2.3) * 0.22, jx = (hash(i * 4.4) - 0.5) * 0.12, jz = (hash(i * 6.6) - 0.5) * 0.12;
    const i3 = i * 3;
    sp[i3] = hv.x; sp[i3 + 1] = Math.max(0.02, hv.y); sp[i3 + 2] = hv.z;
    sv[i3] = hn.x * sp0 + jx; sv[i3 + 1] = -0.05 + hash(i * 5.1) * 0.12; sv[i3 + 2] = hn.z * sp0 + jz;
    sOn[i] = 1;
  }
  function stepSand(dT, dt) {
    for (let i = 0; i < N_SAND; i++) {
      const i3 = i * 3;
      if (dT < sT[i]) { dummy.position.set(0, -5, 0); dummy.scale.set(0.001, 0.001, 0.001); }
      else {
        if (!sOn[i]) spawnGrain(i);
        const sc = 0.7 + hash(i * 9.1) * 0.8;
        if (!sRest[i]) {
          sv[i3 + 1] -= 9.8 * dt;
          sp[i3] += sv[i3] * dt; sp[i3 + 1] += sv[i3 + 1] * dt; sp[i3 + 2] += sv[i3 + 2] * dt;
          /* grains heap into a little mound under each hole: each one lands a touch higher than the last */
          const h = i % NH;
          const r = landed[h] ? Math.hypot(sp[i3] - pile[h * 2], sp[i3 + 2] - pile[h * 2 + 1]) : 0;
          const top = 0.007 * sc + 0.003 * landed[h] * Math.max(0, 1 - r / 0.1);
          if (sp[i3 + 1] <= top) {
            sp[i3 + 1] = top; sv[i3] = sv[i3 + 1] = sv[i3 + 2] = 0; sRest[i] = 1;
            if (!landed[h]) { pile[h * 2] = sp[i3]; pile[h * 2 + 1] = sp[i3 + 2]; }
            if (landed[h] < 255) landed[h]++;
          }
        }
        dummy.position.set(sp[i3], sp[i3 + 1], sp[i3 + 2]);
        dummy.scale.set(sc, sc, sc);
      }
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.updateMatrix(); sand.setMatrixAt(i, dummy.matrix);
    }
    sand.instanceMatrix.needsUpdate = true;
  }

  function update(dt, t, s) {
    dt = clamp(dt || 0, 0, 0.1);
    if ((healT += dt) > 0.5) { healT = 0; healMats(pairs); }
    const seed = s.seed || 1;
    const dead = s.dead > 0;
    const speed = clamp(s.speed || 0, 0, 1);

    /* ---- events ---- */
    if (!dead && s.hurt > st.prevHurt + 0.05) { st.diveT = 0; st.hype = 4; }
    st.prevHurt = s.hurt || 0;
    const atkNow = (s.attack || 0) > 0.001;
    if (atkNow && !st.prevAtk && !dead) { st.atkT = 0; st.ripT = 0; st.ripA = 1; }
    st.prevAtk = atkNow;
    if (s.build && !st.prevBuild && !dead) st.buildT = 0;
    st.prevBuild = !!s.build;
    if (dead) {
      if (st.deadT < 0) { st.deadT = 0; st.diveT = 99; initSand(); st.flop.v += 2.5; st.sway.v -= 2; st.limbL.v += 3; st.limbR.v += 3; st.nod.v += 1.5; }
      else st.deadT += dt;
    }
    else if (st.deadT >= 0) st.deadT = -1;
    const dT = dead ? Math.min(DEATH + 0.05, Math.max(st.deadT, (s.dead || 0) * DEATH)) : -1;   // a lingering corpse holds its last pose

    const prevDive = st.diveT;
    st.diveT += dt; st.atkT += dt; st.buildT += dt; st.ripT += dt; st.hype = Math.max(0, st.hype - dt);
    if (prevDive < 0.12 && st.diveT >= 0.12) { st.ripT = 0; st.ripA = 0.8; st.nod.v -= 2.2; }   // impact: bags ripple, head nods

    /* ---- base pose: permanent crouch, duck-walk ---- */
    if (speed > 0.01) st.phase += dt * TAU * 2.2 * (0.35 + 0.65 * speed);
    const ph = st.phase, sw = Math.sin(ph), bob = Math.abs(Math.cos(ph));
    const dP = dead ? 0 : diveCurve(st.diveT), dW = dead ? 0 : diveWeight(st.diveT);
    const cw = 1 - dW;                                    // crouch weight

    /* attack: short jab + 0.3 shoulder lunge */
    const at = st.atkT, jab = at < 0.07 ? at / 0.07 : at < 0.25 ? 1 - (at - 0.07) / 0.18 : 0;
    /* build: reach down, pat twice */
    const bt = st.buildT;
    const reach = bt < 0.25 ? smooth(bt / 0.25) : bt < 0.85 ? 1 : 1 - smooth((bt - 0.85) / 0.25);
    const pat = bt > 0.3 && bt < 0.8 ? Math.max(0, Math.sin((bt - 0.3) / 0.25 * TAU)) : 0;

    /* ---- death timeline ---- */
    let sit = 0, slump = 0, tip = 0, defl0 = 0, defl1 = 0, defl2 = 0;
    if (dead) {
      defl0 = smooth(dT / 0.5); defl1 = smooth((dT - 0.12) / 0.5); defl2 = smooth((dT - 0.24) / 0.5);
      sit = smooth((dT - 0.15) / 0.55);
      slump = smooth((dT - 0.3) / 0.6);
      tip = smooth((dT - 1.7) / 0.6);                     // a last sag to one side, like a sack settling
    }
    tipG.rotation.z = 0.16 * tip;

    diveG.rotation.x = dP;
    diveG.position.z = TOE_Z - 0.5 * dW;                 // feet kick back as he drops, so he lands on his chest, not 1.6 blocks away
    bodyG.position.y = (-0.06 - 0.03 * bob * speed) * cw - 0.55 * sit;
    bodyG.position.x = 0;
    if (!dead && st.diveT > 0.22 && st.diveT < 0.80) bodyG.position.x = 0.004 * Math.sin(t * 190);   // trembling on the deck

    /* legs */
    const stride = 0.34 * speed;
    const crouchLeg = -0.25;
    lL.rotation.x = (crouchLeg + sw * stride) * cw + 0.05 * dW - 1.2 * sit;
    lR.rotation.x = (crouchLeg - sw * stride) * cw + 0.05 * dW - 1.2 * sit;
    lL.rotation.z = 0.04 + 0.05 * dW + 0.22 * sit; lR.rotation.z = -0.04 - 0.05 * dW - 0.22 * sit;

    /* torso */
    hips.rotation.x = (0.2 + 0.04 * bob * speed) * cw + 0.12 * jab + 0.35 * reach * cw - 0.15 * sit + 0.25 * slump;
    hips.rotation.y = 0.3 * jab;
    hips.rotation.z = 0.06 * sw * speed * cw;

    /* bags: ripple (each lags the one below by 40 ms) and deflate */
    const defl = st.defl; defl[0] = defl0; defl[1] = defl1; defl[2] = defl2;
    let ybase = BAG_Y[0] - BAG_H / 2, restTop = BAG_Y[2] + BAG_H / 2;
    for (let i = 0; i < 3; i++) {
      const tau = st.ripT - 0.04 * i;
      const r = tau < 0 ? 0 : st.ripA * Math.exp(-7 * tau) * Math.sin(24 * tau);
      const sy = 1 - 0.65 * defl[i], h = BAG_H * sy;
      const g = bagG[i];
      g.position.y = ybase + h / 2;
      g.position.z = 0.035 * r;
      g.position.x = 0.012 * r;
      g.rotation.y = BAG_ROT[i] + 0.07 * r;
      g.rotation.x = 0.03 * r;
      g.scale.set(1 + 0.12 * defl[i], sy, 1 + 0.14 * defl[i]);
      ybase += h - 0.01;
    }
    const drop = restTop - (ybase + 0.01);               // how far the stack has collapsed
    chest.position.y = -drop;
    packG.position.y = -Math.min(drop, 0.22);
    packG.rotation.x = -0.25 * slump;

    /* head: paranoid darts (linear 80 ms snap, then dead still) */
    if (!dead) {
      st.dartNext -= dt;
      if (st.dartNext <= 0) {
        st.dartFrom = st.dartCur; st.dartFromP = st.dartCurP; st.dartT = 0;
        st.dartNext = 0.5 + Math.random();
        st.dartTo = Math.random() < 0.3 ? clamp(s.yaw || 0, -0.9, 0.9) : (Math.random() * 2 - 1) * 0.5;
        st.dartToP = (Math.random() * 2 - 1) * 0.12 - (Math.random() < 0.2 ? 0.18 : 0);
      }
      st.dartT += dt;
      const k = Math.min(1, st.dartT / 0.08);
      st.dartCur = st.dartFrom + (st.dartTo - st.dartFrom) * k;
      st.dartCurP = st.dartFromP + (st.dartToP - st.dartFromP) * k;
    }
    const nod = pend(st.nod, dt, 0, 60, 6, -0.4, 0.4);
    neck.rotation.y = st.dartCur * cw * (dead ? 0 : 1);
    neck.rotation.x = (st.dartCurP + clamp(s.pitch || 0, -0.5, 0.5) * 0.25 - 0.1) * cw + 0.12 * dW + 0.45 * slump + nod;
    neck.rotation.z = dead ? -0.3 * tip : 0;
    headJ.position.x = dead ? 0 : 0.0025 * vnoise(t * 30, seed);   // constant tremor
    headJ.position.y = dead ? 0 : 0.0018 * vnoise(t * 31, seed + 4);

    /* canister breathing: 0.7 Hz, hyperventilates at 2 Hz after a hit or below half HP */
    const hyper = st.hype > 0 || (s.hp !== undefined && s.hp < 0.5);
    if (!dead) st.breath += dt * (hyper ? 2 : 0.7);
    const br = 0.5 - 0.5 * Math.cos(TAU * st.breath);
    can.scale.set(1 + 0.03 * br, 1 + 0.08 * br, 1 + 0.03 * br);
    const bi = Math.floor(st.breath);
    if (bi !== st.lastBreath) { st.lastBreath = bi; if (hooks.squeak) hooks.squeak(hyper ? 2 : 0.7); }

    /* arms: hug the sandbags; jab; arms over the helmet when prone; splay when dead */
    const armSw = 0.14 * sw * speed;
    let lx = -0.18 + armSw, rx = -0.18 - armSw, lz = 0.03, rz = -0.03;
    rx += -1.45 * jab - 1.0 * reach - 0.35 * pat;
    lx = lx * cw + -2.75 * dW; rx = rx * cw + -2.75 * dW;
    lz = lz * cw + -0.16 * dW; rz = rz * cw + 0.16 * dW;
    const flL = pend(st.limbL, dt, 0, 30, 2.5, -0.6, 0.6);
    const flR = pend(st.limbR, dt, 0, 30, 2.5, -0.6, 0.6);
    if (dead) {
      const d = smooth((dT - 0.2) / 0.6);
      lx = lx * (1 - d) - 0.35 * d; rx = rx * (1 - d) - 0.35 * d;
      lz = lz * (1 - d) + (1.15 - 0.2 * tip) * d + flL * 0.3; rz = rz * (1 - d) - (1.15 - 0.2 * tip) * d - flR * 0.3;
    }
    aL.rotation.set(lx, 0, lz); aR.rotation.set(rx, 0.15 * jab, rz);

    /* world pitch of the head (for inertia on the periscope and spare arm) */
    const pw = dP + hips.rotation.x;
    const pv = dt > 0 ? (pw - st.pitchW) / dt : 0;
    const pa = dt > 0 ? clamp((pv - st.pitchV) / dt, -4000, 4000) : 0;
    st.pitchW = pw; st.pitchV = pv;
    const acc = dt > 0 ? (speed - st.prevSpeed) / dt : 0; st.prevSpeed = speed;
    const ax = s.accel ? s.accel.x : 0;

    /* spare arm: pendulum on the strap; slaps the pack, flops over his head when he dives */
    const swayDrive = -6 * sw * speed - 2.5 * ax - 3 * Math.cos(ph) * speed * 0.3 + (dead ? -0.6 : 0);
    const flopDrive = -0.25 * pa + 1.2 * acc + 1.8 * bob * speed * 0.3 + (dead ? 1.5 : 0);
    const damp = dead && dT < 2.0 ? 0.35 : 1.5;
    const swayA = pend(st.sway, dt, swayDrive, 12, damp, -0.5, 0.5);
    const flopA = pend(st.flop, dt, flopDrive, 12, damp, -0.2, 1.2);
    spareJ.rotation.set(flopA, 0, 0.45 + swayA);
    /* elbow: second pendulum, driven by the upper arm's swing (floppy, like a joint of meat) */
    const swAcc = dt > 0 ? clamp((st.sway.v - st.prevSwayV) / dt, -400, 400) : 0; st.prevSwayV = st.sway.v;
    const flAcc = dt > 0 ? clamp((st.flop.v - st.prevFlopV) / dt, -400, 400) : 0; st.prevFlopV = st.flop.v;
    elbowJ.rotation.z = ELBOW + pend(st.elbow, dt, -0.5 * swAcc, 30, 2.5, -0.45, 0.45);
    elbowJ.rotation.x = pend(st.elbowX, dt, -0.5 * flAcc, 30, 2.5, -0.1, 0.7);

    /* periscope: world-stable, locks onto a target within 12 blocks, sweeps 0.8 rad/s otherwise.
       Keeps sweeping for 2.7 s after death, then wilts. */
    const locked = !dead && (s.near === undefined || s.near < 12);
    if (!st.scopeInit) { st.scope = s.yaw || 0; st.scopeInit = true; }
    if (dead) { if (dT < 2.7) st.scope += 0.8 * dt; }
    else if (locked) { const d = wrapA((s.yaw || 0) - st.scope), stp = 4.5 * dt; st.scope += clamp(d, -stp, stp); }
    else st.scope += 0.8 * dt;
    st.scope = wrapA(st.scope);
    const wob = pend(st.wob, dt, -0.08 * pa - 0.8 * acc, 80, 5, -0.6, 0.6);
    const wilt = dead ? smooth((dT - 2.7) / 0.3) * 1.25 : 0;
    qA.setFromEuler(tipG.rotation);
    qA.multiply(qB.setFromEuler(diveG.rotation));
    qA.multiply(qB.setFromEuler(hips.rotation));
    qA.multiply(qB.setFromEuler(neck.rotation));
    qA.multiply(qB.setFromEuler(helmet.rotation));
    qA.invert();
    qA.multiply(qB.setFromAxisAngle(AY, st.scope));
    qA.multiply(qB.setFromAxisAngle(AX, wob + wilt));
    periBase.quaternion.copy(qA);
    /* telescope: on the deck the periscope extends to see over its own parapet (his helmet) */
    const te = dead ? 0 : st.diveT < 0.1 ? 0 : st.diveT < 0.26 ? easeOutBack((st.diveT - 0.1) / 0.16) : st.diveT < 0.86 ? 1 : st.diveT < 1.06 ? 1 - smooth((st.diveT - 0.86) / 0.2) : 0;
    const ext = 0.36 * te;
    innerTube.position.y = 0.20 + ext;
    scopeJ.position.y = 0.42 + ext;
    scopeJ.rotation.x = locked ? clamp(s.pitch || 0, -0.5, 0.5) * 0.8 + 0.004 * vtwitch(t, seed + 9, 2, 4) : 0.05;
    scopeJ.rotation.y = locked ? 0.03 * vtwitch(t * 0.7, seed + 3, 1.6, 6) : 0;

    /* sand */
    if (dead) { if (!st.sandOn) { sand.visible = true; st.sandOn = true; } stepSand(dT, dt); }
    else if (st.sandOn) { sand.visible = false; st.sandOn = false; }
  }

  packGroups(root);
  return {
    root, update, mats, hooks,
    handles: { head: neck, aL, aR, lL, lR, periscope: periBase, spareArm: spareJ },
    deathDur: DEATH,
  };
};
})();

