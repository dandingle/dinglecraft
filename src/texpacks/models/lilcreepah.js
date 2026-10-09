/* xx_lilcreepah_xx: "Wearing One" (Hyperreal pack, DESIGN_BIBLE section 3).
   A 34-year-old with a teenager's gamertag, wearing a flayed, dried moss beast like a lion-skin:
   the beast's head on top of his own (two faces stacked), its front legs knotted under his chin,
   its back half hanging as a cape with the hind legs flopping. Frozen braces grin; it never changes.
   Preview triggers: hurt() = pelt slides over his eyes, he shoves it back up; fuse() = the pelt hisses
   by itself (swells, flickers white) while he keeps grinning; attack() = spam-click jabs;
   die() = he faceplants and the pelt climbs off, re-roots its four legs and scuttles away into the grass.
   Idle: heel-to-toe rock, smug tilt, crouch-spam bursts, slow blinks every 9-12 s. */
(function () {
'use strict';
const HR = window.HR, THREE = window.THREE;
if (!HR || !THREE) return;
const PI = Math.PI, TAU = PI * 2, clamp = HR.clamp;

/* ---------- measured from final_ent/face_creepah_basecolor.png (u left->right, v bottom->top as sampled) ---------- */
const FACE_CREEPAH = {
  eyeR: [0.250, 0.648],   // iris centre, image-left eye = model's RIGHT eye (-x)
  eyeL: [0.738, 0.648],   // image-right eye = model's LEFT eye (+x)
  eyeW: 0.22,             // lid corner to lid corner (UV)
  openV: [0.628, 0.672],  // lower lid .. upper-lid crease (half-lidded)
  lidV: [0.672, 0.716],   // upper-lid skin just above the eye: the blink plate's crop
  browV: 0.74,            // brow line
  noseV: 0.42,            // nostril line
  lipV: 0.25,             // braces / lip line
  mouthU: [0.22, 0.80], mouthV: [0.19, 0.31],   // the too-wide grin
};
/* final_ent/face_pelt_basecolor.png (the pelt-head front, nothing cut; tools/art/texpacks/r1_local_art.py): a dried moss hide
   with two ragged eye holes (centres u .26 / .74, v .66, radius ~.08) and a zig-zag mouth sewn shut (v .26-.36) */
const FACE_PELT = { eyeHoles: [[0.18, 0.58, 0.34, 0.74], [0.66, 0.58, 0.82, 0.74]], mouthV: [0.25, 0.37], crop: [0, 0.08, 1, 0.80] };

const HEAD = 0.48;
/* clothes: photo-built garment atlases (tools/build_cloth.py). hoodie_creepah (washed-out black: hood opening with eyelets
   where the 3D drawstrings come out, kangaroo pocket under the 3D pocket box, ribbed waistband = the sleeve cuffs, the hood
   lying flat on the back under the cape): front u [0,TF) back [TF,TB) side strip [TB,1], 0.787 u per block, v 0 = hem.
   trousers_creepah: leg unwraps A (+x) v .5-1 / B (-x) v 0-.5, front [0,.25) outer [.25,.5) back [.5,.75) inner [.75,1].
   CLOTHES false = the tinted jersey */
const CLOTHES = true;
const TF = 403 / 1024, TB = 806 / 1024, TU = TF / 0.5;
const TORSO_UV = { pz: [0, 0, TF, 1], nz: [TF, 0, TB, 1], px: [TB, 0, 1, 1], nx: [1, 0, TB, 1], py: [0.06, 0.55, TF - 0.06, 0.70], ny: [0.05, 0.004, TF - 0.05, 0.03] };
/* the 0.32 x 0.16 pocket box shows exactly the torso texels it covers (pocket centre y 0.16 on the -0.02..0.70 torso) */
const POCKET_UV = { pz: [0.18 * TF, 0.139, 0.82 * TF, 0.361], px: [0.80 * TF, 0.139, 0.82 * TF, 0.361], nx: [0.18 * TF, 0.139, 0.20 * TF, 0.361],
  py: [0.2 * TF, 0.355, 0.8 * TF, 0.361], ny: [0.2 * TF, 0.139, 0.8 * TF, 0.145], nz: [0.2 * TF, 0.15, 0.8 * TF, 0.35] };
/* full-length sleeve (0.56 tall): all four faces from the side strip (no pocket, no hood), the waistband rib as the cuff */
const SLEEVE_UV = (() => { const cu = 0.18 * TU, cv = 0.56 / 0.72;
  return { pz: [TB + 0.002, 0, TB + 0.002 + cu, cv], nz: [1 - 0.002, 0, 1 - 0.002 - cu, cv], px: [1 - cu - 0.002, 0, 1 - 0.002, cv], nx: [TB + 0.002 + cu, 0, TB + 0.002, cv],
    py: [TB + 0.01, 0.85, TB + 0.01 + cu, 0.85 + 0.18 / 0.72 * 0.5], ny: [TB + 0.01, 0.005, TB + 0.01 + cu, 0.02] }; })();
function limbUV(A) {
  const v0 = A ? 0.5 : 0, v1 = A ? 1 : 0.5;
  return A ? { pz: [0, v0, 0.25, v1], px: [0.25, v0, 0.5, v1], nz: [0.5, v0, 0.75, v1], nx: [0.75, v0, 1, v1], py: [0.1, v1 - 0.02, 0.2, v1 - 0.01], ny: [0.1, v0 + 0.002, 0.2, v0 + 0.01] }
           : { pz: [0.25, v0, 0, v1], nx: [0.5, v0, 0.25, v1], nz: [0.75, v0, 0.5, v1], px: [1, v0, 0.75, v1], py: [0.1, v1 - 0.02, 0.2, v1 - 0.01], ny: [0.1, v0 + 0.002, 0.2, v0 + 0.01] };
}
const HIP_Y = 0.66;
const NECK_Y = 0.71;      // above the hip joint (world 1.37)
const TOE_Z = 0.18;       // trainer toes: faceplant pivot
const FALL = 1.50;
const DEATH = 3.0;
const PELT_TILT = 0.15;   // bible 0.3; at 0.3 the pelt's face pitched into shade at 3/4 views (it is the instant read from range)
const SLIDE = 0.35;       // hurt: hinge tips PELT_TILT -> 0.5 (same over-the-eyes pose as before)
/* death timeline (s): the pelt rides his head down, climbs off over his crown once his face is in the grass, then runs */
const T_OFF = 0.5, T_CLIMB = 0.4, T_RUN = T_OFF + T_CLIMB + 0.05, RUN_SPEED = 1.8;
/* head_creepah_side: side-profile photo (greasy fringe, neckbeard, ear), face toward image-left. px [0,0,1,1], nx mirrored */
const SIDE_TEX = true;
const FRINGE = [0, 1.0, 1, 0.875];   // face_creepah's top band, flipped: v 1.0 meets the face's top edge (0.06-deep strip)
/* mean of each tileable material's _roughness.png (green): rough = target / mean (three clamps the product at 1) */
const RMEAN = { jersey: 0.31, skin: 0.35, moss: 0.59 };
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
const GROUND_OFF = -0.26; // pelt root height (neck origin) when it stands on its own legs

/* ---------- shared base materials (per-instance clones below) ---------- */
let BASE = null;
const BASE_IDS = { jersey: 'mat_jersey', skin: 'mat_skin', moss: 'mat_mossflesh', rot: 'mat_rotflesh', face: 'face_creepah', pelt: 'face_pelt', side: 'head_creepah_side', hair: 'hair_shared', hoodie: 'hoodie_creepah', trouser: 'trousers_creepah', arm: 'skin_arm' };
function bases() {
  if (BASE) return BASE;
  const rep = m => { for (const k of ['map', 'normalMap', 'roughnessMap']) { const t = m[k]; if (t) t.wrapS = t.wrapT = THREE.RepeatWrapping; } return m; };
  BASE = {
    jersey: rep(HR.mat('mat_jersey', { rough: 0.9 / RMEAN.jersey, normalScale: 1.0 })),   // 2.9
    skin: rep(HR.mat('mat_skin', { rough: 0.55 / RMEAN.skin, normalScale: 0.7 })),        // 1.6
    moss: rep(HR.mat('mat_mossflesh', { rough: 0.7 / RMEAN.moss, normalScale: 1.2 })),
    rot: rep(HR.mat('mat_rotflesh', { rough: 0.15, normalScale: 1.0 })),
    face: HR.mat('face_creepah', { rough: 0.42, normalScale: 0.6, roughMap: false }),
    pelt: HR.mat('face_pelt', { rough: 0.7, normalScale: 0.8, roughMap: false, fallback: 0x6a7a3a }),
    side: HR.mat('head_creepah_side', { rough: 0.42, normalScale: 0.6, roughMap: false, fallback: 0xc8a080 }),
    hair: HR.mat('hair_shared', { rough: 0.55, normalScale: 0.9, roughMap: false, fallback: 0x3a2c20 }),
    hoodie: HR.mat('hoodie_creepah', { rough: 0.95, normalScale: 0.9, roughMap: false, fallback: 0x1c1c1c }),
    trouser: HR.mat('trousers_creepah', { rough: 0.9, normalScale: 0.9, roughMap: false, fallback: 0x2c3a2c }),
    arm: rep(HR.mat('skin_arm', { rough: 0.55, normalScale: 0.8, roughMap: false, fallback: 0xefc6a3 })),
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
/* ---------- helpers ---------- */
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function tile(w, h, d, k, seed) {
  const f = (a, b, i) => { const u = hash(seed * 7.13 + i * 3.1), v = hash(seed * 3.71 + i * 1.7 + 9); return [u, v, u + a * k, v + b * k]; };
  return { px: f(d, h, 1), nx: f(d, h, 2), py: f(w, d, 3), ny: f(w, d, 4), pz: f(w, h, 5), nz: f(w, h, 6) };
}
function tbox(w, h, d, mat, k, seed, over) {
  const uv = tile(w, h, d, k, seed);
  if (over) Object.assign(uv, over);
  return HR.box(w, h, d, mat, uv);
}
/* soft box: domed/sagging top, pinched or bulging sides (a hollow dried skin) */
function softBox(w, h, d, mat, o, uv) {
  const g = new THREE.BoxGeometry(w, h, d, o.sx || 5, o.sy || 4, o.sz || 4);
  const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
  const hw = w / 2, hh = h / 2, hd = d / 2;
  for (let i = 0; i < P.count; i++) {
    const nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
    const f = nx > 0.5 ? 'px' : nx < -0.5 ? 'nx' : ny > 0.5 ? 'py' : ny < -0.5 ? 'ny' : nz > 0.5 ? 'pz' : 'nz';
    const c = uv && uv[f];
    if (c) U.setXY(i, c[0] + U.getX(i) * (c[2] - c[0]), c[1] + U.getY(i) * (c[3] - c[1]));
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ax = x / hw, ay = y / hh, az = z / hd;
    const mid = 1 - ay * ay;
    let yy = y;
    if (o.sag && ay > 0) yy -= o.sag * hh * (1 - ax * ax) * (1 - az * az) * ay;
    if (o.droop && az > 0 && ay < 0) yy -= o.droop * hh * az * (1 - 0.6 * ax * ax);   // front-bottom brim droops
    P.setXYZ(i, x * (1 + (o.bx || 0) * mid), yy, z * (1 + (o.bz || 0) * mid * (az < 0 ? 1 : 0.3)));
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true;
  return m;
}
function noShadow(m) { m.castShadow = false; return m; }
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
const lerp = (a, b, k) => a + (b - a) * k;

HR.MODELS.lilcreepah = function () {
  const B = bases();
  const mats = [];
  const pairs = [];
  const inst = (base, color, rough, extra) => {
    const m = base.clone(); if (color !== undefined) m.color.setHex(color); if (rough !== undefined) m.roughness = rough;
    if (extra) Object.assign(m, extra); mats.push(m); pairs.push([m, base, base.userData.hrId]); return m;
  };
  let healT = 0;
  const flat = (color, rough) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }); mats.push(m); return m; };

  const mFace = inst(B.face);
  const mScalp = inst(B.skin, 0xefc6a3, 0.7);           // pale, thinning, sweaty (effective ~0.25): seen when the pelt leaves
  const mHand = CLOTHES ? inst(B.arm, 0xefc6a3, 0.55) : inst(B.skin, 0xefc6a3, 0.55 / RMEAN.skin);
  const mSide = SIDE_TEX ? inst(B.side) : mScalp;
  const mBack = SIDE_TEX ? inst(B.hair, 0x4a3828) : mScalp;      // back of the head: his greasy brown hair
  /* crown: his bare, pale, sweaty scalp (bible: "Left behind: his bare, pale, sweaty head"); hair-textured tops read as
     woodgrain from the killer's view, so the hairline is carried over the top-front edge by a short fringe strip instead */
  const mCrown = mScalp;
  const mHoodie = CLOTHES ? inst(B.hoodie, 0xffffff) : inst(B.jersey, 0x1c1c1c);
  const mPocket = CLOTHES ? mHoodie : inst(B.jersey, 0x262626);
  const mTrouser = CLOTHES ? inst(B.trouser, 0xffffff) : inst(B.jersey, 0x2c3a2c);
  const mString = flat(0xeeeeee, 0.6);
  const mTrainer = flat(0xf4f4f4, 0.35);
  const mSole = flat(0xd8d4ca, 0.6);
  const mPeltFace = inst(B.pelt, 0xa8b48a, 0.72);   // dried
  const mPeltHide = inst(B.moss, 0x8aa468, 0.72 / RMEAN.moss);   // pelt-head hide (flickers white when it hisses); dried = rough 0.7
  const mHide = inst(B.moss, 0x8aa468, 0.72 / RMEAN.moss);       // cowl, legs, cape outer
  const mRaw = inst(B.rot, 0x6a2a20, 0.15);            // raw underside, cape lining, cut edges

  /* ---------- body hierarchy ---------- */
  const root = new THREE.Group(); root.name = 'lilcreepah';
  const fallG = HR.joint(root, 0, 0, TOE_Z);           // death faceplant pivots on the trainer toes
  const bodyG = HR.joint(fallG, 0, 0, -TOE_Z);          // heel-to-toe rock
  const mkLeg = side => {
    const j = HR.joint(bodyG, side * 0.13, HIP_Y, 0);
    HR.at(j, tbox(0.21, 0.56, 0.21, mTrouser, 1.6, 11 + side, CLOTHES ? limbUV(side > 0) : undefined), 0, -0.28, 0);
    HR.at(j, HR.box(0.24, 0.12, 0.30, mTrainer), 0, -0.565, 0.03);
    HR.at(j, noShadow(HR.box(0.25, 0.035, 0.31, mSole)), 0, -0.6425, 0.03);
    return j;
  };
  const lL = mkLeg(1), lR = mkLeg(-1);
  const torsoG = HR.joint(bodyG, 0, HIP_Y, 0);
  HR.at(torsoG, tbox(0.50, 0.72, 0.27, mHoodie, 1.6, 21, CLOTHES ? TORSO_UV : undefined), 0, 0.34, 0);
  HR.at(torsoG, noShadow(tbox(0.32, 0.16, 0.02, mPocket, 1.6, 22, CLOTHES ? POCKET_UV : undefined)), 0, 0.16, 0.145);
  const strL = HR.joint(torsoG, 0.07, 0.69, 0.145), strR = HR.joint(torsoG, -0.07, 0.69, 0.145);
  HR.at(strL, noShadow(HR.box(0.02, 0.20, 0.02, mString)), 0, -0.10, 0);
  HR.at(strR, noShadow(HR.box(0.02, 0.20, 0.02, mString)), 0, -0.10, 0);
  const neck = HR.joint(torsoG, 0, NECK_Y, 0);
  const headJ = HR.joint(neck, 0, 0, 0);
  const scalpUV = tile(HEAD, HEAD, HEAD, 1.5, 31);
  HR.at(headJ, HR.box(HEAD, HEAD, HEAD, { pz: mFace, px: mSide, nx: mSide, py: mCrown, nz: mBack, ny: mScalp },
    SIDE_TEX ? { px: [0, 0, 1, 1], nx: [1, 0, 0, 1], py: scalpUV.py, nz: scalpUV.nz, ny: scalpUV.ny }
             : { px: scalpUV.px, nx: scalpUV.nx, py: scalpUV.py, nz: scalpUV.nz, ny: scalpUV.ny }), 0, HEAD / 2, 0);
  /* greasy fringe carried 0.06 over the top-front edge, so the bald reveal reads as HIS head, not a box */
  const fringe = HR.at(headJ, noShadow(HR.box(HEAD, 0.004, 0.06, { all: mScalp, py: mFace }, { py: FRINGE })), 0, HEAD + 0.002, HEAD / 2 - 0.03);
  fringe.receiveShadow = true;
  /* blink plates: cropped from the upper-lid skin just above each eye, pivot at the top edge */
  const lidH = (FACE_CREEPAH.openV[1] - FACE_CREEPAH.openV[0]) * HEAD + 0.004;
  const lidW = FACE_CREEPAH.eyeW * HEAD;
  const lids = [FACE_CREEPAH.eyeR, FACE_CREEPAH.eyeL].map(c => {
    const j = HR.joint(headJ, (c[0] - 0.5) * HEAD, FACE_CREEPAH.openV[1] * HEAD + 0.002, HEAD / 2 + 0.004);
    const crop = [c[0] - FACE_CREEPAH.eyeW / 2, FACE_CREEPAH.lidV[0], c[0] + FACE_CREEPAH.eyeW / 2, FACE_CREEPAH.lidV[1]];
    const m = noShadow(HR.box(lidW, lidH, 0.004, mFace, { pz: crop, px: crop, nx: crop, py: crop, ny: crop, nz: crop }));
    m.receiveShadow = false;
    HR.at(j, m, 0, -lidH / 2, 0);
    j.scale.y = 0.001; j.visible = false;
    return j;
  });
  const mkArm = side => {
    const j = HR.joint(torsoG, side * 0.34, 0.66, 0);
    HR.at(j, tbox(0.18, 0.56, 0.18, mHoodie, 1.6, 41 + side, CLOTHES ? SLEEVE_UV : undefined), 0, -0.28, 0);
    const hand = HR.joint(j, 0, -0.62, 0);
    hand.add(tbox(0.17, 0.12, 0.17, mHand, 1.8, 51 + side));
    return { j, hand };
  };
  const armL = mkArm(1), armR = mkArm(-1);
  const aL = armL.j, aR = armR.j;

  /* ---------- the pelt (root child: transform computed from the body while worn, free when it runs) ---------- */
  const peltRoot = HR.joint(root, 0, 1.37, 0);
  const peltHeadG = HR.joint(peltRoot, 0, 0, 0);       // follows the head with lag
  const cowlG = HR.joint(peltHeadG, 0, 0.53, -0.13);    // crumples (scale.y) when the pelt stands up on its own
  HR.at(cowlG, tbox(0.60, 0.56, 0.30, mHide, 1.3, 61, { pz: [0.2, 0.2, 0.5, 0.5] }), 0, -0.28, 0);
  const flapUV = tile(0.05, 0.50, 0.22, 1.3, 62);
  const mkFlap = side => HR.at(cowlG, HR.box(0.05, 0.50, 0.22, { all: mHide, pz: mRaw, ny: mRaw }, flapUV), side * 0.29, -0.31, 0.25);
  mkFlap(1); mkFlap(-1);
  const hinge = HR.joint(peltHeadG, 0, 0.48, -0.20);
  hinge.rotation.x = PELT_TILT;
  const peltScale = HR.joint(hinge, 0, 0.251, 0.29);  // swell origin for the hiss
  const hideUV = tile(0.54, 0.36, 0.42, 1.3, 63);
  hideUV.pz = FACE_PELT.crop.slice();
  const peltHead = softBox(0.54, 0.36, 0.42, [mPeltHide, mPeltHide, mPeltHide, mRaw, mPeltFace, mPeltHide], { sag: 0.10, bx: -0.035, bz: 0.06, droop: 0.06 }, hideUV);
  peltScale.add(peltHead);
  /* front legs: from the hood's lower front corners, knotted under his chin */
  const FL_ALIVE = [[0.29, 0.06, 0.25, -1.05], [-0.29, 0.06, 0.25, 1.05]];
  const FL_RUN = [[0.21, 0.57, 0.20], [-0.21, 0.57, 0.20]];
  const legUV = tile(0.085, 0.30, 0.085, 1.5, 64);
  const frontLegs = FL_ALIVE.map((p, i) => {
    const j = HR.joint(peltHeadG, p[0], p[1], p[2]); j.rotation.z = p[3];
    HR.at(j, HR.box(0.085, 0.30, 0.085, { all: mHide, ny: mRaw }, legUV), 0, -0.15, 0);
    return j;
  });
  const knot = HR.at(peltHeadG, noShadow(tbox(0.14, 0.09, 0.10, mHide, 1.5, 65)), 0, -0.085, 0.25);
  /* cape: body-aligned, hangs from under the cowl; hind legs flop at its bottom corners */
  const capeG = HR.joint(peltRoot, 0, -0.01, -0.16);
  const capeSwing = HR.joint(capeG, 0, 0, 0);
  const capeUV = tile(0.48, 0.62, 0.04, 1.3, 66);
  HR.at(capeSwing, HR.box(0.48, 0.62, 0.04, { all: mHide, pz: mRaw, ny: mRaw }, capeUV), 0, -0.31, 0);
  const rearUV = tile(0.10, 0.26, 0.10, 1.5, 67);
  const rearLegs = [1, -1].map(side => {
    const j = HR.joint(capeSwing, side * 0.20, -0.60, -0.02);
    HR.at(j, HR.box(0.10, 0.26, 0.10, { all: mHide, ny: mRaw }, rearUV), 0, -0.13, 0);
    return j;
  });

  /* ---------- per-instance state ---------- */
  const st = {
    prevHurt: 0, prevAtk: false, prevNear: 99, prevMood: null,
    hurtT: 99, atkT: 99, crouchT: 99, crouchNext: 1.5, hypoT: 99, hissT: 0, griefT: 0,
    blinkT: 99, blinkNext: 2 + hash(7) * 3, deadT: -1, phase: 0, prevSpeed: 0, hissWrote: false,
    cape: { a: 0, v: 0 }, fl0: { a: 0, v: 0 }, fl1: { a: 0, v: 0 }, rl0: { a: 0, v: 0 }, rl1: { a: 0, v: 0 },
    sL: { a: 0, v: 0 }, sR: { a: 0, v: 0 }, sZ: { a: 0, v: 0 }, armBounce: { a: 0, v: 0 },
    runDirX: 0, runDirZ: -1, snapped: false, prevYawH: 0, capeA0: 0.1,
  };
  const m1 = new THREE.Matrix4();
  const vNeck = new THREE.Vector3(), qChain = new THREE.Quaternion(), qTmp = new THREE.Quaternion(), qId = new THREE.Quaternion();
  const snapP = new THREE.Vector3(), snapQ = new THREE.Quaternion(), landQ = new THREE.Quaternion();
  const landP = new THREE.Vector3(), upDir = new THREE.Vector3(), vAim = new THREE.Vector3();
  const AY = new THREE.Vector3(0, 1, 0);

  function setPeltPose(w) {
    /* w = 0: worn; w = 1: standing on its own four legs */
    cowlG.scale.y = 1 - 0.62 * w;
    knot.scale.setScalar(Math.max(0.001, 1 - w * 1.6));
    knot.visible = w < 0.6;
    hinge.position.set(0, 0.48, -0.20);
    for (let i = 0; i < 2; i++) {
      const a = FL_ALIVE[i], r = FL_RUN[i], j = frontLegs[i];
      j.position.set(lerp(a[0], r[0], w), lerp(a[1], r[1], w), lerp(a[2], r[2], w));
      j.rotation.z = a[3] * (1 - w);
    }
    capeG.position.set(0, lerp(-0.01, 0.62, w), lerp(-0.16, -0.10, w));
  }

  function update(dt, t, s) {
    dt = clamp(dt || 0, 0, 0.1);
    if ((healT += dt) > 0.5) { healT = 0; healMats(pairs); }
    const seed = s.seed || 1;
    const dead = s.dead > 0;
    const speed = clamp(s.speed || 0, 0, 1);
    const yaw = clamp(s.yaw || 0, -1.2, 1.2), pitch = clamp(s.pitch || 0, -0.6, 0.6);

    /* ---- events ---- */
    if (!dead && s.hurt > st.prevHurt + 0.05) st.hurtT = 0;
    st.prevHurt = s.hurt || 0;
    const atkNow = (s.attack || 0) > 0.001;
    if (atkNow && !st.prevAtk && !dead) st.atkT = 0;
    st.prevAtk = atkNow;
    if (s.mood !== st.prevMood) { if (s.mood === 'griefed' || s.mood === 'hypocrite') st.hypoT = 0; st.prevMood = s.mood; }
    if (s.grief) st.griefT = 1.5;
    const near = s.near === undefined ? 99 : s.near;
    if (!dead && near < 8 && (st.prevNear >= 8 || (st.crouchNext -= dt) <= 0)) { st.crouchT = 0; st.crouchNext = 9 + hash(t * 0.37 + seed) * 6; }
    st.prevNear = near;
    if (dead) {
      if (st.deadT < 0) {
        st.deadT = 0; st.snapped = false;
        /* flee from whoever did it, veering ~50 deg to one side so the killer sees it in profile */
        const a = s.yaw || 0, ax0 = -Math.sin(a), az0 = -Math.cos(a), th = (seed % 2 ? -0.9 : 0.9);
        st.runDirX = ax0 * Math.cos(th) + az0 * Math.sin(th); st.runDirZ = -ax0 * Math.sin(th) + az0 * Math.cos(th);
        st.armBounce.v += 2.5;
      } else st.deadT += dt;
    } else if (st.deadT >= 0) { st.deadT = -1; peltRoot.visible = true; peltRoot.scale.set(1, 1, 1); }
    const dT = dead ? Math.min(DEATH + 0.05, Math.max(st.deadT, (s.dead || 0) * DEATH)) : -1;   // a lingering corpse holds its last pose
    st.hurtT += dt; st.atkT += dt; st.crouchT += dt; st.hypoT += dt; st.griefT = Math.max(0, st.griefT - dt);

    /* ---- locomotion / idle ---- */
    if (speed > 0.01) st.phase += dt * TAU * 1.8 * (0.4 + 0.6 * speed);
    const sw = Math.sin(st.phase), bob = Math.abs(Math.cos(st.phase));
    const ct = st.crouchT, crouch = !dead && ct < 0.8 ? ((Math.floor(ct * 12) % 2) ? 1 : 0) : 0;   // 6 Hz toggle
    const rock = dead ? 0 : 0.04 * Math.sin(TAU * t + seed) * (1 - speed);
    bodyG.rotation.x = rock;
    bodyG.position.y = dead ? 0 : -0.02 * bob * speed;

    /* faceplant */
    let fall = 0;
    if (dead) {
      const x = dT / 0.45;
      fall = x < 1 ? FALL * x * x : dT < 0.6 ? FALL - 0.07 * Math.sin(PI * (dT - 0.45) / 0.15) : FALL;
    }
    fallG.rotation.x = fall;

    torsoG.position.y = HIP_Y - 0.12 * crouch;
    torsoG.position.z = -0.05 * crouch;
    torsoG.rotation.x = 0.28 * crouch;
    torsoG.rotation.y = dead ? 0 : 0.1 * sw * speed;
    const legSw = 0.6 * sw * speed;
    lL.rotation.x = dead ? 0 : legSw + 0.1 * crouch; lR.rotation.x = dead ? 0 : -legSw + 0.1 * crouch;
    lL.rotation.z = 0.02; lR.rotation.z = -0.02;

    /* ---- hurt: pelt slides over his eyes, 0.3 s later his right arm shoves it back up ---- */
    const ht = st.hurtT;
    const slide = dead ? 0 : ht < 0.07 ? ht / 0.07 : ht < 0.42 ? 1 : ht < 0.6 ? 1 - smooth((ht - 0.42) / 0.18) : 0;
    const shove = dead ? 0 : ht < 0.25 ? 0 : ht < 0.42 ? smooth((ht - 0.25) / 0.17) : ht < 0.62 ? 1 : ht < 0.9 ? 1 - smooth((ht - 0.62) / 0.28) : 0;
    const flinch = dead ? 0 : ht < 0.25 ? Math.sin(Math.min(1, ht / 0.25) * PI) : 0;

    /* ---- attack: spam-click jabs, 8.4 Hz ---- */
    const at = st.atkT;
    let jab = 0;
    if (!dead && at < 4 / 8.4) { const f = (at * 8.4) % 1; jab = f < 0.35 ? f / 0.35 : 1 - (f - 0.35) / 0.65; }

    /* ---- hypocrite: grin unchanged, head trembles 2 deg at 14 Hz for 3 s, fists clench ---- */
    const hypo = !dead && st.hypoT < 3 ? 1 : 0;

    /* ---- head ---- */
    if (dead) neck.rotation.set(0, 0, 0);
    else {
      neck.rotation.y = yaw * 0.85 + 0.035 * hypo * Math.sin(TAU * 14 * t);
      neck.rotation.x = pitch * 0.6 - 0.12 + 0.18 * flinch - 0.2 * shove + 0.05 * bob * speed;
      neck.rotation.z = 0.15 * (1 - 0.6 * flinch) + 0.035 * hypo * Math.sin(TAU * 14 * t + 1.3);
    }
    headJ.position.y = dead ? 0 : 0.012 * bob * speed;

    /* ---- arms ---- */
    const armSw = 0.8 * sw * speed;
    let rx = -armSw - 1.35 * jab, rz = -0.04;
    let lx = armSw - 0.15 * jab, lz = 0.04;
    if (crouch) { rx += 0.25; lx += 0.25; }
    if (shove > 0) {
      /* the shove aims the right arm at the pelt's front-bottom edge (neck-local, from the current hinge tilt) so the
         palm lands ON the brim and pushes it up, whatever his head is doing; small shrug to reach it */
      const tl = PELT_TILT + SLIDE * slide - 0.06 * shove * (1 - slide), ct = Math.cos(tl), stl = Math.sin(tl);
      vAim.set(0, 0.48 + 0.02 * shove * (1 - slide) + 0.101 * ct - 0.5 * stl, -0.2 + 0.101 * stl + 0.5 * ct).applyEuler(neck.rotation);
      vAim.x += 0.34; vAim.y += NECK_Y - 0.66 - 0.06 * shove;        // relative to the (shrugged) right shoulder
      vAim.normalize();
      const ikZ = Math.asin(clamp(vAim.x, -1, 1)), ikX = Math.atan2(-vAim.z, -vAim.y);
      rx = lerp(rx, ikX, shove); rz = lerp(rz, ikZ, shove);
    }
    aR.position.y = 0.66 + 0.06 * shove;
    const ab = pend(st.armBounce, dt, 0, 40, 4, -0.5, 0.5);
    if (dead) { rx = -0.05 + ab * 0.4; lx = -0.05 + ab * 0.4; rz = -0.06; lz = 0.06; }
    aR.rotation.set(rx, 0, rz); aL.rotation.set(lx, 0, lz);
    const fist = hypo ? 0.85 : 1;
    armL.hand.scale.set(fist, fist, fist); armR.hand.scale.set(fist, fist, fist);

    /* ---- blink every 9-12 s: close 50 ms, hold 70 ms, open 90 ms ---- */
    st.blinkNext -= dt;
    if (st.blinkNext <= 0 && !dead) { st.blinkT = 0; st.blinkNext = 9 + hash(t * 1.3 + seed) * 3; }
    st.blinkT += dt;
    const bt = st.blinkT;
    let lid = bt < 0.05 ? bt / 0.05 : bt < 0.12 ? 1 : bt < 0.21 ? 1 - (bt - 0.12) / 0.09 : 0;
    if (dead) lid = dT > 0.5 ? 0.6 : lid;   // dies half-lidded
    for (let i = 0; i < 2; i++) { lids[i].visible = lid > 0.02; lids[i].scale.y = Math.max(0.001, lid); }

    /* ---- drawstrings ---- */
    const acc = dt > 0 ? (speed - st.prevSpeed) / dt : 0; st.prevSpeed = speed;
    const ax = s.accel ? s.accel.x : 0, az = s.accel ? s.accel.z : 0;
    const dsDrive = 4 * acc + 3 * az + 6 * bob * speed + 20 * jab + 30 * crouch * (ct < 0.8 ? 1 : 0);
    strL.rotation.x = pend(st.sL, dt, dsDrive, 40, 5, 0, 0.8);
    strR.rotation.x = pend(st.sR, dt, dsDrive * 0.9, 40, 5, 0, 0.8);
    const sz = pend(st.sZ, dt, -6 * sw * speed - 2 * ax, 40, 5, -0.35, 0.35);
    strL.rotation.z = sz; strR.rotation.z = sz * 0.8;

    /* ---- pelt: worn ---- */
    const yawRate = dt > 0 ? (neck.rotation.y - st.prevYawH) / dt : 0; st.prevYawH = neck.rotation.y;
    fallG.updateMatrix(); bodyG.updateMatrix(); torsoG.updateMatrix();
    m1.multiplyMatrices(fallG.matrix, bodyG.matrix).multiply(torsoG.matrix);
    vNeck.set(0, NECK_Y, 0).applyMatrix4(m1);
    qChain.setFromRotationMatrix(m1);

    /* hiss: grief / TNT nearby (fuse in the preview) -> the pelt-head breathes like a boomer by itself */
    const hissAmt = dead ? 0 : Math.max(clamp((s.fuse || 0) * 3, 0, 1), clamp(st.griefT * 2, 0, 1));
    if (hissAmt > 0) st.hissT += dt; else st.hissT = 0;
    const pulse = 0.5 - 0.5 * Math.cos(TAU * 2 * st.hissT);
    const swell = 1 + 0.12 * pulse * hissAmt;
    peltScale.scale.set(swell, swell * (1 + 0.03 * pulse * hissAmt), swell);
    if (hissAmt > 0) {
      const fl = hissAmt * pulse * pulse * (0.55 + 0.45 * Math.sin(t * 47));
      mPeltFace.emissive.setRGB(1, 1, 1); mPeltFace.emissiveIntensity = 0.55 * fl;
      mPeltHide.emissive.setRGB(1, 1, 1); mPeltHide.emissiveIntensity = 0.45 * fl;
      st.hissWrote = true;
    } else if (st.hissWrote) {
      mPeltFace.emissive.setRGB(0, 0, 0); mPeltFace.emissiveIntensity = 1;
      mPeltHide.emissive.setRGB(0, 0, 0); mPeltHide.emissiveIntensity = 1;
      st.hissWrote = false;
    }

    if (!dead) {
      peltRoot.visible = true;
      peltRoot.position.copy(vNeck); peltRoot.quaternion.copy(qChain); peltRoot.scale.set(1, 1, 1);
      const k = 1 - Math.pow(0.75, dt * 60);              // "slerp 0.25 per frame" at any frame rate
      peltHeadG.quaternion.slerp(neck.quaternion, k);
      setPeltPose(0);
      /* the pelt slides 0.10 down over his eyes (hinge tips 0.3 -> 0.5), and rides up a touch on the shove */
      hinge.rotation.x = PELT_TILT + SLIDE * slide - 0.06 * shove * (1 - slide) + 0.01 * Math.sin(TAU * 2 * st.hissT) * hissAmt;
      hinge.position.y = 0.48 + 0.02 * shove * (1 - slide);
      /* front legs jiggle; cape and hind legs swing behind him */
      const f0 = pend(st.fl0, dt, -8 * yawRate - 10 * bob * speed + 25 * flinch, 30, 4, -0.35, 0.35);
      const f1 = pend(st.fl1, dt, 8 * yawRate - 10 * bob * speed + 25 * flinch, 30, 4, -0.35, 0.35);
      frontLegs[0].rotation.x = f0; frontLegs[1].rotation.x = f1;
      const capeA = pend(st.cape, dt, 6 * acc + 2.5 * az + 14 * 0.35 * speed + 8 * bob * speed + 6 * crouch * (ct < 0.8 ? 1 : 0), 14, 3, 0, 1.1);
      capeSwing.rotation.x = capeA + 0.02 + Math.max(0, -rock) * 0.5;
      capeSwing.rotation.z = 0.05 * sw * speed;
      const r0 = pend(st.rl0, dt, -12 * bob * speed - 6 * sw * speed - 4 * acc, 30, 4, -0.6, 0.6);
      const r1 = pend(st.rl1, dt, -12 * bob * speed + 6 * sw * speed - 4 * acc, 30, 4, -0.6, 0.6);
      rearLegs[0].rotation.set(r0 - capeA * 0.6, 0, 0.05); rearLegs[1].rotation.set(r1 - capeA * 0.6, 0, -0.05);
    } else {
      /* ---- death: the pelt rides his head down into the grass, climbs off over his crown, plants its legs, runs ---- */
      const T = dT;
      const ph = TAU * 8 * T;
      if (T < T_OFF) {
        /* still worn while he faceplants (face hits at 0.45 s); on impact it jolts forward over his face */
        peltRoot.visible = true;
        peltRoot.position.copy(vNeck); peltRoot.quaternion.copy(qChain); peltRoot.scale.set(1, 1, 1);
        peltHeadG.quaternion.slerp(qId, 1 - Math.pow(0.75, dt * 60));
        setPeltPose(0);
        const imp = T > 0.44 ? Math.sin(PI * clamp((T - 0.44) / 0.12, 0, 1)) : 0;
        hinge.rotation.x = PELT_TILT + 0.22 * imp; hinge.position.y = 0.48;
        const hit = T < 0.44 ? 1 : -1;
        const capeA = pend(st.cape, dt, hit > 0 ? 10 : -14, 14, 3, 0, 1.1);
        capeSwing.rotation.x = capeA + 0.02; capeSwing.rotation.z = 0;
        frontLegs[0].rotation.x = pend(st.fl0, dt, 14 * hit, 30, 4, -0.35, 0.35);
        frontLegs[1].rotation.x = pend(st.fl1, dt, 14 * hit, 30, 4, -0.35, 0.35);
        const r0 = pend(st.rl0, dt, 16 * hit, 30, 4, -0.6, 0.6), r1 = pend(st.rl1, dt, 13 * hit, 30, 4, -0.6, 0.6);
        rearLegs[0].rotation.set(r0 - capeA * 0.6, 0, 0.05); rearLegs[1].rotation.set(r1 - capeA * 0.6, 0, -0.05);
      } else {
        if (!st.snapped) {
          st.snapped = true;
          let dx = st.runDirX, dz = st.runDirZ;
          snapP.copy(vNeck); snapQ.copy(qChain);
          upDir.set(0, 1, 0).applyQuaternion(qChain); upDir.y = 0;          // his body axis on the ground, feet -> crown
          if (upDir.lengthSq() < 1e-4) upDir.set(dx, 0, dz);
          upDir.normalize();
          let qx = upDir.z, qz = -upDir.x; if (qx * dx + qz * dz < 0) { qx = -qx; qz = -qz; }   // the side it will run to
          /* veer outward so it never runs back through his head and arms */
          dx += qx * 0.9; dz += qz * 0.9; const dl = Math.hypot(dx, dz) || 1; st.runDirX = dx / dl; st.runDirZ = dz / dl;
          landP.set(snapP.x + upDir.x * 0.64 + qx * 0.58, GROUND_OFF, snapP.z + upDir.z * 0.64 + qz * 0.58);
          st.capeA0 = capeSwing.rotation.x;
        }
        const dx = st.runDirX, dz = st.runDirZ;
        landQ.setFromAxisAngle(AY, Math.atan2(dx, dz));
        const c = clamp((T - T_OFF) / T_CLIMB, 0, 1);
        let px, py, pz;
        if (T < T_RUN) {
          /* A (first 45%): front legs unknot and scrabble, it slides forward over his crown, still lying on him.
             B: it flips upright, drops beside his head and plants all four legs */
          const cA = smooth(c / 0.45), cB = smooth((c - 0.45) / 0.55);
          const sx = snapP.x + upDir.x * 0.42 * cA, sy = snapP.y + 0.05 * Math.sin(PI * cA), sz = snapP.z + upDir.z * 0.42 * cA;
          px = lerp(sx, landP.x, cB); pz = lerp(sz, landP.z, cB);
          py = lerp(sy, GROUND_OFF, cB) + 0.16 * Math.sin(PI * cB);
          peltRoot.quaternion.copy(snapQ).slerp(landQ, cB);
          const w = clamp(0.35 * cA + 0.65 * cB, 0, 1);
          setPeltPose(w);
          peltHeadG.quaternion.slerp(qId, Math.min(1, dt * 10));
          hinge.rotation.x = PELT_TILT * (1 - w);
          const scr = (1 - cB) * 0.55 * Math.sin(TAU * 6 * T);
          frontLegs[0].rotation.x = scr; frontLegs[1].rotation.x = -scr;
          const capeRun = lerp(st.capeA0, 1.41, w);
          capeSwing.rotation.x = capeRun; capeSwing.rotation.z = 0;
          const fl = 0.35 * Math.sin(TAU * 4 * T) * (1 - cB);
          rearLegs[0].rotation.set(-capeRun * w + fl, 0, 0); rearLegs[1].rotation.set(-capeRun * w - fl, 0, 0);
        } else {
          /* scuttle: 1.8 blocks/s, legs pinwheeling at 8 Hz, cape trailing; sinks into the grass from 2.5 s */
          const run = T - T_RUN, dist = RUN_SPEED * run, zig = 0.12 * Math.sin(TAU * 2.2 * run) * Math.min(1, run * 3);
          px = landP.x + dx * dist - dz * zig; pz = landP.z + dz * dist + dx * zig;
          py = GROUND_OFF + 0.025 * Math.abs(Math.sin(ph)) - 0.62 * smooth((T - 2.5) / 0.5);
          peltRoot.quaternion.copy(landQ);
          qTmp.setFromAxisAngle(AY, 0.14 * Math.sin(TAU * 4.4 * run) * Math.min(1, run * 3));
          peltRoot.quaternion.multiply(qTmp);
          setPeltPose(1); hinge.rotation.x = 0;
          peltHeadG.quaternion.slerp(qId, Math.min(1, dt * 10));
          const runW = smooth(run / 0.1);
          frontLegs[0].rotation.x = runW * 1.05 * Math.sin(ph); frontLegs[1].rotation.x = runW * 1.05 * Math.sin(ph + PI);
          const capeRun = 1.41 + runW * 0.07 * Math.sin(ph * 0.5);
          capeSwing.rotation.x = capeRun; capeSwing.rotation.z = 0;
          rearLegs[0].rotation.set(-capeRun + runW * 1.05 * Math.sin(ph + PI), 0, 0);
          rearLegs[1].rotation.set(-capeRun + runW * 1.05 * Math.sin(ph), 0, 0);
        }
        peltRoot.position.set(px, py, pz);
        const tl = T - (T_OFF + T_CLIMB), sq = tl > 0 && tl < 0.14 ? 1 - 0.14 * Math.sin(PI * tl / 0.14) : 1;   // landing squash
        peltRoot.scale.set(1 + (1 - sq) * 0.5, sq, 1 + (1 - sq) * 0.5);
        peltRoot.visible = T < 3.0;
      }
    }
  }

  packGroups(root);
  return {
    root, update, mats,
    handles: { head: neck, aL, aR, lL, lR, pelt: peltRoot },
    deathDur: DEATH,
  };
};
})();

