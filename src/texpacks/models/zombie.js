/* ZOMBIE: "Dan, Three Weeks Later". DESIGN_BIBLE.md section 5.
   Hyperreal pack, Three.js r128. Registers HR.MODELS.zombie.
   Feet at y=0, faces +z, model's left = +x. A dead Dan power-walks at you holding his own torn-off,
   swollen tree-punching arm by the exposed bone and clubs you with it.
   Signature in the preview: A (attack) = overhead club slam, W = commuter power-walk with the arm swinging
   into his knees, K = drops the arm (which crawls on after him) and face-plants. Set model.jawChance = 1
   before K to force the 5% jaw-pops-off death. */
(function () {
'use strict';
const HR = window.HR;

/* ---- measurements taken from final_ent/*_basecolor.png (1024 x 1024; u left->right, v bottom->top) ---- */
/* face_zombie: image-left eye (model -x) is the milky one; image-right (model +x) is Dan's live blue-grey eye. */
const ZF = {
  milky: [0.223, 0.565],     // iris centre (u, v): never blinks
  live: [0.778, 0.581],      // iris centre. lid corners u 0.607..0.908
  liveCx: 0.758,             // centre between the live eye's corners (blink plate centre)
  liveHalfW: 0.152,
  lidTop: 0.608, lidBot: 0.535,
  lidSkin: [0.608, 0.652],   // upper-lid skin band under the brow (blink plate crop)
  nostrils: 0.228,           // bottom of the nostrils (v)
  SPLIT: 0.22,               // head/jaw split. The image's true lip line is at v 0.033 (mouth at the bottom edge), which
                             // would leave the jaw a 34-px strip; 0.22 cuts just under the nostrils so the upper lip and the
                             // torn cheek with the molars ride on the jaw, at the same texel density as the head (0.22*0.5 = 0.11 = jaw height)
  teeth: [0.74, 0.92, 0.02, 0.18],  // u0,u1,v0,v1 of the exposed molars (torn cheek, model +x side)
};
/* fist_dan: knuckle row + splits v 0.50..0.90, curled finger segments v 0..0.45 */
const FIST = { knuckle: [0.04, 0.47, 0.96, 1.00], strike: [0.08, 0.20, 0.92, 1.00], fingers: [0.0, 0.02, 1.0, 0.44] };
/* foot_top: toes at the top, big toe on the image left. Gaps between the toes show background above v 0.85 */
const FOOT_TOP = [1, 0.84, 0, 0];   // rotated 180 deg so the toes point +z and the big toe sits on the inside (+x) of the right foot
const RMEAN = { mat_jersey: 0.315, mat_skin: 0.351, mat_rotflesh: 0.46, mat_bone: 0.13 };
/* clothes: photo-built garment atlases (tools/build_cloth.py), same layout as the player's. tee_zombie: front u [0,TF),
   back [TF,TB), side strip [TB,1] (0.787 u per block, v 0 = the torn hem); the front's image-left half is the torn-open
   chest (hidden behind the cavity box), the rips show his own rot flesh. jog_zombie: leg unwraps A (+x) v .5-1 / B (-x) v 0-.5,
   front [0,.25) outer [.25,.5) back [.5,.75) inner [.75,1]. foot_bare_top/_side: the uncropped H12 foot (toes, nails).
   CLOTHES false = the tinted jersey and the old foot_top crop. */
const CLOTHES = true;
const TF = 403 / 1024, TB = 806 / 1024, TU = TF / 0.5;
/* nx is his torn-off shoulder (rotflesh, keeps its tiled crop) */
const TORSO_UV = { pz: [0, 0, TF, 1], nz: [TF, 0, TB, 1], px: [TB, 0, 1, 1], py: [0.06, 0.55, TF - 0.06, 0.70], ny: [0.05, 0.004, TF - 0.05, 0.03] };
/* a rag of sleeve (w wide, d deep, h tall) cut from the strip and the back's lower corners: the torn hem at its bottom */
function ragUV(w, h, d) {
  const cw = w * TU, cd = d * TU, cv = h / 0.72;
  return { pz: [TB + 0.004, 0, TB + 0.004 + cw, cv], nz: [TB - 0.004, 0, TB - 0.004 - cw, cv], px: [1 - 0.004, 0, 1 - 0.004 - cd, cv],
    nx: [TF + 0.006, 0, TF + 0.006 + cd, cv], py: [TB + 0.01, 0.62, TB + 0.01 + cw, 0.62 + d / 0.72], ny: [TB + 0.01, 0.004, TB + 0.01 + cw, 0.02] };
}
function legUV(A) {
  const v0 = A ? 0.5 : 0, v1 = A ? 1 : 0.5;
  return A ? { pz: [0, v0, 0.25, v1], px: [0.25, v0, 0.5, v1], nz: [0.5, v0, 0.75, v1], nx: [0.75, v0, 1, v1], py: [0.1, v1 - 0.02, 0.2, v1 - 0.01], ny: [0.1, v0 + 0.002, 0.2, v0 + 0.01] }
           : { pz: [0.25, v0, 0, v1], nx: [0.5, v0, 0.25, v1], nz: [0.75, v0, 0.5, v1], px: [1, v0, 0.75, v1], py: [0.1, v1 - 0.02, 0.2, v1 - 0.01], ny: [0.1, v0 + 0.002, 0.2, v0 + 0.01] };
}
/* foot_bare_top: whole foot, toes at the top, big toe on the image left. Rotated 180 deg so the toes point +z and the
   big toe sits on the inside (+x) of the right foot */
const BARE_TOP = [1, 0.99, 0, 0.02];

const JERSEY_MEAN = 0.586;
/* head_zombie_side: side-profile photo (torn cheek + molars at image-left/bottom, rotted ear), face toward image-left.
   Split at the same v as the face so the side teeth part with the jaw. px [0,SPLIT,1,1] / nx mirrored. false = rotflesh sides */
const SIDE_TEX = true;
/* the club is Dan's swollen fist: 0.27 box x FIST_S = 0.37 wide (player's fist is ~0.385 at his starting swell) */
const FIST_S = 1.37, FIST_REACH = 0.28 + 0.16 * FIST_S;   // elbow -> fist bottom
const ARM_UP = -3.2, ARM_OUT = 0.7;                       // wind-up top: grip behind the shoulder plane, out wide of the head
const TWIST = -0.65;   // forearm twist: turns the back of the hand (fist_dan, splinters, split knuckles) toward the front-outside
/* the rig repairs only its cached base material when a texture fails; clones keep the dead texture (renders black).
   Every 0.5 s: retry the file once (shared), else drop the map on the clone. */
const TEX_KEYS = ['map', 'normalMap', 'roughnessMap'], TEX_SUFFIX = { map: '_basecolor.png', normalMap: '_normal.png', roughnessMap: '_roughness.png' }, RETRY = {};
function healMats(pairs) {
  if (HR.EMBEDDED) return;   /* embedded data URIs cannot drop, and take no ?retry= suffix */
  for (let i = 0; i < pairs.length; i++) {
    const c = pairs[i][0], b = pairs[i][1], id = pairs[i][2];
    for (let k = 0; k < 3; k++) {
      const key = TEX_KEYS[k], t = c[key];
      if (!t || b[key] || t.image) continue;
      const url = HR.texURL(id, TEX_SUFFIX[key]);
      let r = RETRY[url];
      if (!r) {
        r = RETRY[url] = new THREE.TextureLoader().load(HR.retryURL(url), undefined, undefined, () => { r.failed = true; });
        r.anisotropy = t.anisotropy; r.wrapS = t.wrapS; r.wrapT = t.wrapT; r.repeat.copy(t.repeat);
        if (key === 'map') r.encoding = THREE.sRGBEncoding;
      }
      if (r.failed) { c[key] = null; c.needsUpdate = true; } else if (t !== r) { c[key] = r; c.needsUpdate = true; }
    }
  }
}
/* zombies spawn in groups: one draw call per material per box (faces sharing a material made contiguous) */
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
/* a fly: 0.016 x 0.012 x 0.024 body (length along +z) + one crossed pair of wings, merged into one mesh with 2 groups */
function flyGeometry() {
  const a = new THREE.BoxGeometry(0.016, 0.012, 0.024), b = new THREE.PlaneGeometry(0.038, 0.013);
  b.rotateX(-Math.PI / 2); b.translate(0, 0.0065, -0.003);
  const g = new THREE.BufferGeometry(), na = a.attributes.position.count;
  for (const k of ['position', 'normal', 'uv']) {
    const A = a.attributes[k], B = b.attributes[k], arr = new Float32Array((A.count + B.count) * A.itemSize);
    arr.set(A.array, 0); arr.set(B.array, A.array.length); g.setAttribute(k, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const ia = a.index.array, ib = b.index.array, idx = new Uint16Array(ia.length + ib.length);
  idx.set(ia, 0); for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + na;
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.addGroup(0, ia.length, 0); g.addGroup(ia.length, ib.length, 1);
  return g;
}

function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function tile(w, h, d, S, r) {
  const f = (a, b) => { const cu = Math.min(1, a / S), cv = Math.min(1, b / S), u = r() * (1 - cu), v = r() * (1 - cv); return [u, v, u + cu, v + cv]; };
  return { px: f(d, h), nx: f(d, h), py: f(w, d), ny: f(w, d), pz: f(w, h), nz: f(w, h) };
}
function lin(hex) { let o = 0; for (let sh = 16; sh >= 0; sh -= 8) { const c = ((hex >> sh) & 255) / 255; o = (o << 8) | Math.round(255 * (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))); } return o; }
function match(hex, texMean) { let o = 0; for (let sh = 16; sh >= 0; sh -= 8) { const c = ((lin(hex) >> sh) & 255) / 255; o = (o << 8) | Math.min(255, Math.round(255 * c / texMean)); } return o; }
function stepPend(p, dt, drive, k, c, lo, hi) {
  const n = dt > 1 / 60 ? Math.ceil(dt * 60) : 1, h = dt / n;
  for (let i = 0; i < n; i++) {
    p.v += (-k * p.a - c * p.v + drive) * h; p.a += p.v * h;
    if (p.a < lo) { p.a = lo; if (p.v < 0) p.v *= -0.3; } else if (p.a > hi) { p.a = hi; if (p.v > 0) p.v *= -0.3; }
  }
  if (p.v > 30) p.v = 30; else if (p.v < -30) p.v = -30;
  return p.a;
}
const smooth = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function blink(t, seed, every) {
  const p = (t + seed * 1.7) % every;
  return p < 0.05 ? p / 0.05 : p < 0.12 ? 1 : p < 0.21 ? 1 - (p - 0.12) / 0.09 : 0;
}

HR.MODELS.zombie = function () {
  const mats = [], pairs = [], R = rng(31);
  const M = (id, color, rough, ex) => {
    const o = Object.assign({ color }, ex || {});
    if (RMEAN[id]) o.rough = rough / RMEAN[id]; else { o.rough = rough; o.roughMap = false; }
    const b = HR.mat(id, o), m = b.clone(); mats.push(m); pairs.push([m, b, id]); return m;
  };
  const F = (color, rough) => { const m = HR.flat(lin(color), { rough }).clone(); mats.push(m); return m; };
  /* mat_rotflesh came out darker than its prompt (mean 0.31 sRGB): lift it back to "light grey-green" (colour > 1 is a plain linear gain) */
  const ROT_GAIN = 1.75;
  const MR = (color, rough) => { const m = M('mat_rotflesh', color, rough); m.color.multiplyScalar(ROT_GAIN); return m; };

  const mFace = M('face_zombie', 0xffffff, 0.32, { normalScale: 0.6 });
  const mHair = M('hair_shared', 0x8a7c60, 0.6, { normalScale: 0.9 });   // lighter than the bible's #4a4030 (read near-black from behind)
  const mSide = SIDE_TEX ? M('head_zombie_side', 0xffffff, 0.32, { normalScale: 0.6 }) : null;
  const mRot = MR(0xffffff, 0.3);
  /* the club arm is 1.3x lighter than his own flesh so the limb separates from his body silhouette */
  const mClub = MR(0xffffff, 0.3); mClub.color.multiplyScalar(1.3);
  /* deep-red wet insides. The bible's tints (#3a1a14 roof, #5a2018 tongue, #6a1e1a tendon, #2a0e0c cavity) multiply an
     already dark texture to pure black, so they are re-picked to land on those colours after ROT_GAIN; wetness is roughness */
  const mRoof = MR(0x9a4438, 0.15);      // roof of the mouth
  const mTongue = MR(0xc05a50, 0.12);
  const mTendon = MR(0xc04a3c, 0.2);
  const mCav = MR(0x6a2a22, 0.12);
  const mTee = CLOTHES ? M('tee_zombie', 0xffffff, 0.95, { normalScale: 0.9 }) : M('mat_jersey', match(0x5f6436, JERSEY_MEAN), 0.95);   // filthy olive: his work shirt
  const mJog = CLOTHES ? M('jog_zombie', 0xffffff, 0.95, { normalScale: 0.9 }) : M('mat_jersey', match(0x5a4632, JERSEY_MEAN), 0.95);   // his brown trousers
  /* tile() keeps the seeded crop sequence (R) identical either way; the garment crops replace its faces */
  const cl = (uv, over) => CLOTHES ? Object.assign(uv, over) : uv;
  const mBone = M('mat_bone', 0xffffff, 0.6);
  const mStump = M('stump_section', 0x9aa58a, 0.2, { normalScale: 0.9 });
  const mFist = M('fist_dan', 0xb8b09a, 0.4, { normalScale: 0.8 });   // dead, but the split knuckles still read
  const mFoot = CLOTHES ? M('foot_bare_top', 0x8fa080, 0.5, { normalScale: 0.7 }) : M('foot_top', 0x8fa080, 0.5, { normalScale: 0.7 });
  const mFootS = CLOTHES ? M('foot_bare_side', 0x8fa080, 0.5, { normalScale: 0.7 }) : null;   // sides of the bare foot (sole rim, creases)
  const mShoe = M('mat_skin', 0x2b2b30, 0.5);
  const mSpl = F(0x8a6a40, 0.85);   // pale raw wood, same splinters as the living player's fist
  const mFly = F(0x111111, 0.35);
  const mWing = new THREE.MeshStandardMaterial({ color: 0xd8dde0, roughness: 0.2, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });   // kept out of mats
  const mStrand = F(0x6e2018, 0.16);   // wet red stump tendons (reads ~#8a2a22 in daylight)

  const root = new THREE.Group(); root.name = 'hr_zombie';
  const fall = HR.joint(root, 0, 0, 0.15);       // face-plant pivot: front edge of the feet
  const body = HR.joint(fall, 0, 0, -0.15);
  const noShadow = m => { m.castShadow = false; return m; };

  /* legs. Left: trainer. Right: bare rotten foot that slaps. Feet hinge at the heel. */
  const lL = HR.joint(body, 0.13, 0.75, 0), lR = HR.joint(body, -0.13, 0.75, 0);
  HR.at(lL, HR.box(0.24, 0.72, 0.26, mJog, cl(tile(0.24, 0.72, 0.26, 0.8, R), legUV(true))), 0, -0.36, 0);
  HR.at(lR, HR.box(0.24, 0.72, 0.26, mJog, cl(tile(0.24, 0.72, 0.26, 0.8, R), legUV(false))), 0, -0.36, 0);
  const footL = HR.joint(lL, 0, -0.70, -0.11);
  HR.at(footL, HR.box(0.25, 0.10, 0.30, mShoe, tile(0.25, 0.10, 0.30, 0.5, R)), 0, 0, 0.14);
  const footR = HR.joint(lR, 0, -0.71, -0.11);
  HR.at(footR, HR.box(0.25, 0.08, 0.30, CLOTHES ? { all: mFootS, py: mFoot, ny: mRot } : { all: mRot, py: mFoot },
    Object.assign(tile(0.25, 0.08, 0.30, 0.6, R), CLOTHES ? { py: BARE_TOP, px: [0.15, 0.08, 0.85, 0.42], nx: [0.85, 0.08, 0.15, 0.42], pz: [0.82, 0.08, 0.98, 0.42], nz: [0.02, 0.08, 0.2, 0.42] } : { py: FOOT_TOP })), 0, 0, 0.14);

  /* torso: pivot at the hips */
  const hipJ = HR.joint(body, 0, 0.75, 0);
  HR.at(hipJ, HR.box(0.52, 0.72, 0.30, { all: mTee, nx: mRot }, cl(tile(0.52, 0.72, 0.30, 0.8, R), TORSO_UV)), 0, 0.36, 0);
  /* torn-open chest: wet cavity with three ribs across it */
  HR.at(hipJ, noShadow(HR.box(0.20, 0.34, 0.012, mCav, tile(0.20, 0.34, 0.012, 0.6, R))), -0.13, 0.40, 0.152);
  [0.31, 0.39, 0.47].forEach((y, i) => {
    const r = HR.at(hipJ, noShadow(HR.box(0.22, 0.032, 0.035, mBone, tile(0.22, 0.032, 0.035, 0.6, R))), -0.13, y, 0.165);
    r.rotation.z = i % 2 ? -0.05 : 0.05;
  });
  /* right shoulder stump: cut meat facing -x, humerus stub, two dangling tendons */
  HR.at(hipJ, HR.box(0.20, 0.12, 0.24, { all: mRot, nx: mStump }), -0.36, 0.65, 0);
  /* humerus stub: thin, snapped, tilted down and forward, half buried in the meat; a jagged shard beside it */
  const UP0 = new THREE.Vector3(0, 1, 0), hd = new THREE.Vector3(-Math.cos(0.4), -Math.sin(0.4) * 0.7, Math.sin(0.4) * 0.7).normalize();
  const hum = HR.at(hipJ, noShadow(HR.cyl(0.026, 0.029, 0.06, mBone, 7)), -0.47, 0.662, 0.018); hum.quaternion.setFromUnitVectors(UP0, hd);
  const shard = HR.at(hipJ, noShadow(HR.box(0.016, 0.042, 0.013, mBone)), -0.488, 0.676, -0.004); shard.rotation.set(0.5, 0.35, 1.05);
  /* two thin wet tendons, different lengths, hung asymmetrically off the cut */
  const tA = HR.joint(hipJ, -0.463, 0.618, 0.068), tB = HR.joint(hipJ, -0.465, 0.668, -0.072);
  HR.at(tA, noShadow(HR.box(0.012, 0.10, 0.012, mStrand)), 0, -0.05, 0);
  HR.at(tB, noShadow(HR.box(0.012, 0.08, 0.012, mStrand)), 0, -0.04, 0);

  /* left arm: thrust forward in the classic reach, gripping the bone of his own torn-off right arm */
  const armJ = HR.joint(hipJ, 0.37, 0.64, 0);
  HR.at(armJ, HR.box(0.20, 0.62, 0.24, mRot, tile(0.20, 0.62, 0.24, 0.6, R)), 0, -0.31, 0);
  HR.at(armJ, HR.box(0.22, 0.20, 0.26, mTee, cl(tile(0.22, 0.20, 0.26, 0.8, R), ragUV(0.22, 0.20, 0.26))), 0, -0.094, 0);
  HR.at(armJ, HR.box(0.20, 0.12, 0.24, mRot, tile(0.20, 0.12, 0.24, 0.6, R)), 0, -0.68, 0);
  const gripJ = HR.joint(armJ, 0, -0.68, 0);

  /* the club: hangs world-down from the grip on a pendulum. Bone -> torn upper arm -> elbow (one-way) -> forearm -> dead fist */
  const clubJ = HR.joint(gripJ, 0, 0, 0);
  HR.at(clubJ, noShadow(HR.cyl(0.035, 0.035, 0.24, mBone, 8)), 0, -0.08, 0);
  HR.at(clubJ, HR.box(0.24, 0.30, 0.24, { all: mClub, py: mStump }, Object.assign(tile(0.24, 0.30, 0.24, 0.6, R), { py: [0, 0, 1, 1] })), 0, -0.35, 0);
  HR.at(clubJ, HR.box(0.25, 0.14, 0.25, mTee, cl(tile(0.25, 0.14, 0.25, 0.8, R), ragUV(0.25, 0.14, 0.25))), 0, -0.29, 0);   // sits below the torn end (no coplanar tops)
  const elbowJ = HR.joint(clubJ, 0, -0.50, 0);
  HR.at(elbowJ, HR.box(0.28, 0.32, 0.28, mClub, tile(0.28, 0.32, 0.28, 0.6, R)), 0, -0.12, 0);   // swollen forearm; runs 0.04 past the hinge to hide the elbow wedge
  const fistJ = HR.joint(elbowJ, 0, -0.28, 0); fistJ.scale.setScalar(FIST_S);
  /* outer face (+x, the camera side) = back of the hand; front = knuckles; bottom = striking knuckles */
  const fistMesh = HR.at(fistJ, HR.box(0.27, 0.16, 0.27, { all: mClub, px: mFist, pz: mFist, ny: mFist }, { pz: FIST.knuckle, ny: FIST.strike }), 0, -0.08, 0);
  /* fingers (the bible's single plate split into four so they curl one after another): hinged on the fist's
     front-bottom edge. 0 = curled up over the front, 1.2 = reaching out at you */
  const fing = [];
  for (let i = 0; i < 4; i++) {
    const j = HR.joint(fistJ, -0.0915 + i * 0.061, -0.155, 0.135);
    const c = [FIST.fingers[0] + i * 0.25, FIST.fingers[1], FIST.fingers[0] + (i + 1) * 0.25, FIST.fingers[3]];
    noShadow(HR.at(j, HR.box(0.057, i === 0 ? 0.095 : i === 3 ? 0.10 : 0.112, 0.05, { all: mClub, pz: mFist }, { pz: c }), 0, 0.05, 0.026));
    fing.push(j);
  }
  /* curl wave: index leads, pinky trails */
  const setFingers = (a, spread) => { for (let i = 0; i < 4; i++) fing[i].rotation.set(clamp(a - spread * (i - 1.5) * 0.12, 0, 1.3), 0, (i - 1.5) * 0.05 * Math.min(1, a)); };
  /* three splinters, still in it */
  const UP = new THREE.Vector3(0, 1, 0);
  [[0.07, -0.025, 0.135, 0.3, 0.2, 1], [0.135, -0.07, 0.04, 1, 0.35, -0.25], [-0.05, -0.16, 0.06, -0.3, -1, 0.35]].forEach(p => {
    const dir = new THREE.Vector3(p[3], p[4], p[5]).normalize(), len = 0.073;   // x FIST_S = 0.02 x 0.10 in the world
    const m = noShadow(HR.box(0.0146, len, 0.0146, mSpl));
    m.quaternion.setFromUnitVectors(UP, dir);
    m.position.set(p[0], p[1], p[2]).addScaledVector(dir, len * 0.5 - 0.02);
    fistJ.add(m);
  });

  /* neck + head (gyro-levelled, tracks you) */
  const neckJ = HR.joint(hipJ, 0, 0.74, 0.05);     // head carried a touch forward (zombie posture; keeps the hanging jaw off his chest)
  HR.at(neckJ, HR.box(0.20, 0.09, 0.20, mRot), 0, -0.035, -0.08);
  const headG = HR.joint(neckJ, 0, 0, 0); headG.rotation.order = 'YXZ';
  HR.at(headG, HR.box(0.50, 0.39, 0.50, { all: mRot, pz: mFace, py: mHair, nz: mHair, ny: mRoof, px: mSide || mRot, nx: mSide || mRot },
    SIDE_TEX ? { pz: [0, ZF.SPLIT, 1, 1], px: [0, ZF.SPLIT, 1, 1], nx: [1, ZF.SPLIT, 0, 1] } : { pz: [0, ZF.SPLIT, 1, 1] }), 0, 0.305, 0);
  /* jaw: hinged at its rear-top edge, hangs open and dislocated */
  const jawJ = HR.joint(headG, 0, 0.11, -0.23);
  HR.at(jawJ, HR.box(0.46, 0.11, 0.46, { all: mRot, pz: mFace, py: mTongue, px: mSide || mRot, nx: mSide || mRot },
    SIDE_TEX ? { pz: [0.04, 0, 0.96, ZF.SPLIT], px: [0.04, 0, 0.96, ZF.SPLIT], nx: [0.96, 0, 0.04, ZF.SPLIT] } : { pz: [0.04, 0, 0.96, ZF.SPLIT] }), 0, -0.055, 0.23);
  /* tendon from the head's lower +x corner to the jaw corner, re-spanned every frame */
  const tendon = HR.at(headG, noShadow(HR.box(0.025, 0.10, 0.02, mTendon)), 0.2, 0.06, 0.2);
  /* blink plate: live eye only */
  const lidW = ZF.liveHalfW * 2 * 0.5, lidH = (ZF.lidTop - ZF.lidBot) * 0.5 + 0.004;
  const lidJ = HR.joint(headG, (ZF.liveCx - 0.5) * 0.5, ZF.lidTop * 0.5 + 0.002, 0.2535);
  const lidCrop = [ZF.liveCx - ZF.liveHalfW, ZF.lidSkin[0], ZF.liveCx + ZF.liveHalfW, ZF.lidSkin[1]];
  HR.at(lidJ, noShadow(HR.box(lidW, lidH, 0.006, mFace, { px: lidCrop, nx: lidCrop, py: lidCrop, ny: lidCrop, pz: lidCrop, nz: lidCrop })), 0, -lidH / 2, 0);
  lidJ.visible = false;

  /* flies: root space, erratic orbit around the head */
  const flies = [], flyGeo = flyGeometry();
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(flyGeo, [mFly, mWing]); f.castShadow = false; f.renderOrder = 2; f.position.set(0, 1.8, 0); root.add(f); flies.push(f); }
  const flyPrev = new Float32Array(9), ZAX = new THREE.Vector3(0, 0, 1);

  const handles = { head: headG, neck: neckJ, aL: armJ, lL, lR, jaw: jawJ, club: clubJ, fist: fistJ, torso: hipJ };

  /* ---- state ---- */
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), qW = new THREE.Quaternion(), e1 = new THREE.Euler();
  const gPos = new THREE.Vector3(), gVel = new THREE.Vector3(), gAcc = new THREE.Vector3(), aLoc = new THREE.Vector3(), ZERO = new THREE.Vector3();
  const hPos = new THREE.Vector3();
  const club = { th: 0, thv: 0, ph: 0, phv: 0, e: 0.6, ev: 0 };
  const jawP = { a: 0, v: 0 }, tenA = { a: 0, v: 0 }, tenB = { a: 0, v: 0 }, footRs = { a: 0, v: 0 }, footLs = { a: 0, v: 0 };
  const flyA = [R() * 6, R() * 6, R() * 6];
  let first = true, ph = 0, prevLeg = 0, prevBob = 0, bobV = 0, prevHurt = 0;
  const ARM_REST = -1.45, ARM_Z = 0.07;   // classic reach, straight out; the (bigger) club hangs just outside the left leg
  const JAW_DROP = 0.62;   // bible says 40 deg; a 0.46-deep box jaw swings into the chest past ~35 deg, so it drops to 0.62 rad
  let armX = ARM_REST, aPh = 0, aT = 0, aFrom = ARM_REST, auto = false, slapT = 9;
  const CLUB_BACK = 2.3, SLAM_END = Math.PI * 2 - 0.6;   // club angle (from hanging, + = back): over the shoulder / fist on the floor in front
  let thT = 0, thFrom = 0, eT = 0.6, tgtOn = false, eOn = false, phT = 0;
  let jPh = 0, jT = 0, jNext = 3 + R() * 3, jHold = 4;
  let crackT = 9, crackNext = 3 + R() * 3, crackSign = 1, knockT = 9, clenchHold = 0;
  let dying = false, dT = 0, jawOff = false, jawGone = false, jd0 = 0;
  const cP0 = new THREE.Vector3(), cQ0 = new THREE.Quaternion(), cP1 = new THREE.Vector3(0.82, 0.155, 0.42), cQ1 = new THREE.Quaternion();
  const jP0 = new THREE.Vector3(), jQ0 = new THREE.Quaternion(), jQ1 = new THREE.Quaternion();
  let dArm0 = ARM_REST, dE0 = 0.6, dHip0 = 0, dFing = 0.6;
  /* club lying on the ground: points +z (crawling after you), back of the hand (fist_dan) facing out to +x, fingers on top
     so the clench reads from the usual front-right camera */
  cQ1.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)));

  const api = { root, update, mats, handles, deathDur: 2.8, jawChance: 0.05 };

  /* grip position in root space (analytic through the joint chain) */
  function gripPos(out) {
    return out.set(0, -0.68, 0).applyQuaternion(armJ.quaternion).add(armJ.position).applyQuaternion(hipJ.quaternion).add(hipJ.position).add(body.position);
  }

  let healT = 0;
  function update(dt, t, s) {
    if (!(dt > 0)) dt = 0; else if (dt > 0.1) dt = 0.1;
    if ((healT += dt) > 0.5) { healT = 0; healMats(pairs); }
    if (s.dead > 0) { if (!dying) startDeath(); dT += dt; poseDeath(dT, dt, t, s); flyUpdate(dt, t); return; }
    if (dying) endDeath();

    const sp = clamp(s.speed || 0, 0, 1);
    /* commuter power-walk: amp 0.6, 1.15x cadence, upright and purposeful */
    ph = (ph + dt * 10.35) % (Math.PI * 200);
    const sw = Math.sin(ph), leg = 0.6 * sw * sp;
    lL.rotation.set(-leg, 0, 0); lR.rotation.set(leg, 0, 0);
    const bob = -0.75 * (1 - Math.cos(leg)) * 0.85;
    body.position.set(0, bob, -0.15);
    const bv = dt > 0 ? (bob - prevBob) / dt : 0, bAcc = dt > 0 ? clamp((bv - bobV) / dt, -60, 60) : 0; prevBob = bob; bobV = bv;
    /* feet stay flat in stance; the bare right foot slaps down at heel strike */
    const stR = Math.cos(ph) > 0, stL = !stR;
    footRs.a += ((stR ? -leg : 0.18 * sp) - footRs.a) * Math.min(1, dt * (stR ? 38 : 9));
    footLs.a += ((stL ? leg : 0.12 * sp) - footLs.a) * Math.min(1, dt * (stL ? 16 : 9));
    footR.rotation.x = footRs.a * sp; footL.rotation.x = footLs.a * sp;

    /* hurt */
    const hurtEdge = s.hurt > prevHurt + 0.2; prevHurt = s.hurt || 0;
    if (hurtEdge) { knockT = 0; jawP.v += 7; clenchHold = 0.45; club.thv += 2.5 * (R() - 0.3); }
    knockT += dt;
    const knock = knockT < 0.5 ? (knockT < 0.06 ? knockT / 0.06 : Math.pow(1 - (knockT - 0.06) / 0.44, 2)) : 0;

    /* ---- attack: overhead club slam ---- */
    if (s.fired) {
      if (aPh === 0 || aPh === 5) { aPh = 1; aT = 0; aFrom = armX; auto = true; thFrom = club.th; }
      else if (aPh === 1) auto = true;
      else if (aPh === 2) { aPh = 3; aT = 0; }
    } else if (aPh === 0 && s.near !== undefined && s.near < 2.2 && (s.cd || 0) < 0.27) {   // in game: wind up so the slam lands on the damage tick
      aPh = 1; aT = 0; aFrom = armX; auto = false; thFrom = club.th;
    }
    aT += dt;
    let lean = 0, armZ = ARM_Z;
    tgtOn = false; eOn = false;
    if (aPh === 1) {          /* wind-up 250 ms: the arm swings OUT to the side first (club clear of his body), then up and back so
                                 the club drops behind his shoulder, grip behind the shoulder plane at the top */
      const k = Math.min(1, aT / 0.25), ko = smooth(aT / 0.1), ku = smooth((aT - 0.05) / 0.2);
      armZ = lerp(ARM_Z, ARM_OUT, ko); armX = lerp(aFrom, ARM_UP, ku); lean = -0.16 * ku;
      thT = lerp(thFrom, CLUB_BACK, smooth((aT - 0.04) / 0.26)); tgtOn = true; eT = 1.1; eOn = true; phT = 0.25;
      if (k >= 1) { aPh = auto ? 3 : 2; aT = 0; }
    } else if (aPh === 2) {   /* proximity wind-up: hold up to 0.4 s for the damage tick */
      armX = ARM_UP + 0.03 * Math.sin(t * 23); armZ = ARM_OUT; lean = -0.16; thT = CLUB_BACK; tgtOn = true; eT = 1.1; eOn = true; phT = 0.25;
      if (aT > 0.4) { aPh = 5; aT = 0; aFrom = armX; }
    } else if (aPh === 3) {   /* slam: arm to -0.5 in 90 ms; the club whips over the top (beside his head) and lands a beat later */
      const k = Math.min(1, aT / 0.09), kc = Math.min(1, aT / 0.15);
      armX = lerp(ARM_UP, -0.5, k * k); armZ = lerp(ARM_OUT, 0.15, k); lean = lerp(-0.16, 0.26, k);
      thT = lerp(CLUB_BACK, SLAM_END, kc * kc); tgtOn = true; eT = 0; eOn = aT < 0.12; phT = 0.12 * (1 - k);
      if (aT >= 0.15) { aPh = 4; aT = 0; slapT = 0; }
    } else if (aPh === 4) {   /* follow-through */
      armX = -0.5 - 0.06 * Math.sin(Math.min(1, aT / 0.2) * Math.PI); armZ = 0.15; lean = 0.26;
      if (aT > 0.3) { aPh = 5; aT = 0; aFrom = armX; }
    } else if (aPh === 5) {   /* recover */
      const k = Math.min(1, aT / 0.5); armX = lerp(aFrom, ARM_REST, smooth(k)); armZ = lerp(0.15, ARM_Z, k); lean = 0.26 * (1 - smooth(k));
      if (k >= 1) aPh = 0;
    } else armX = ARM_REST;
    slapT += dt;

    /* torso: upright, lists 0.12 toward the club side to counterweight it */
    hipJ.rotation.set(0.05 * sp + lean - 0.1 * knock, 0.09 * sw * sp, -(0.05 + 0.07 * sp) + 0.015 * Math.cos(ph) * sp);
    armJ.rotation.set(armX + 0.045 * Math.sin(2 * ph + 0.6) * sp, 0, armZ);

    /* stump tendons dangle */
    const twistAcc = -0.09 * sp * 10.35 * 10.35 * sw;
    tA.rotation.set(stepPend(tenA, dt, -bAcc * 0.8 - twistAcc * 0.3, 35, 4, -1, 1), 0, -0.25 + 0.5 * tenA.a);
    tB.rotation.set(stepPend(tenB, dt, -bAcc * 0.7 + twistAcc * 0.35, 35, 4, -1, 1), 0, -0.15 - 0.4 * tenB.a);

    clubUpdate(dt, t, s, sp, sw);
    headUpdate(dt, t, s, sp, bAcc, knock);
    flyUpdate(dt, t);
  }

  /* ---- the club: double pendulum (grip 25/2.5, elbow one-way 40/4, 0..1.6), driven by the grip's acceleration ---- */
  function clubUpdate(dt, t, s, sp, sw) {
    gripPos(v1);
    if (first || dt <= 0) { gPos.copy(v1); gVel.set(0, 0, 0); gAcc.set(0, 0, 0); first = false; }
    else {
      v2.copy(v1).sub(gPos).divideScalar(dt);               // velocity
      v3.copy(v2).sub(gVel).divideScalar(dt);               // acceleration
      v3.clampLength(0, 260);
      gAcc.lerp(v3, Math.min(1, dt * 40));
      gVel.copy(v2); gPos.copy(v1);
    }
    root.getWorldQuaternion(qW); aLoc.copy(s.accel || ZERO).applyQuaternion(qW.invert());
    const Ax = gAcc.x + aLoc.x, Ay = gAcc.y + aLoc.y, Az = gAcc.z + aLoc.z;
    const G = 12.5, L = 0.5;
    /* knee knock: the left knee swats the hanging arm on its forward swing */
    const legNow = -0.6 * sw * sp;
    if (sp > 0.3 && prevLeg > -0.5 * sp && legNow <= -0.5 * sp && aPh === 0) club.thv -= 2.0 * sp, club.phv += 0.7 * sp;
    prevLeg = legNow;
    const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) {
      let thAcc = (Az * Math.cos(club.th) - (G + Ay) * Math.sin(club.th)) / L - 2.5 * club.thv;
      if (tgtOn) thAcc += 420 * (thT - club.th) - 38 * club.thv;     // keyframed swing with physical follow-through
      let phAcc = (-Ax * Math.cos(club.ph) - (G + Ay) * Math.sin(club.ph)) / L - 2.5 * club.phv;
      if (tgtOn) phAcc += 160 * (phT - club.ph) - 16 * club.phv;   // keeps the club swinging wide of his body during the overhead
      club.thv += thAcc * h; club.th += club.thv * h;
      club.phv += phAcc * h; club.ph += club.phv * h;
      let eAcc = -40 * (club.e - 0.6) - 4 * club.ev - clamp(thAcc, -200, 200) * 0.9;
      if (eOn) eAcc += 300 * (eT - club.e) - 30 * club.ev;
      club.ev += eAcc * h; club.e += club.ev * h;
      if (club.e < 0) { club.e = 0; if (club.ev < 0) club.ev *= -0.2; } else if (club.e > 1.6) { club.e = 1.6; if (club.ev > 0) club.ev *= -0.2; }
    }
    if (aPh === 0 || aPh >= 4) {
      if (club.th > Math.PI) club.th -= Math.PI * 2; else if (club.th < -Math.PI) club.th += Math.PI * 2;
      if (aPh === 0) { if (club.th > 2.5) { club.th = 2.5; if (club.thv > 0) club.thv *= -0.3; } else if (club.th < -2.5) { club.th = -2.5; if (club.thv < 0) club.thv *= -0.3; } }
    }
    club.ph = clamp(club.ph, -0.8, 0.8); club.thv = clamp(club.thv, -30, 30); club.phv = clamp(club.phv, -20, 20);
    /* keep the dead fist above the ground (it slaps instead of sinking) */
    for (let k = 0; k < 8; k++) {
      const low = gPos.y - (0.5 * Math.cos(club.th) + FIST_REACH * Math.cos(club.th + club.e)) * Math.cos(club.ph);
      if (low >= 0.06) break;
      if (club.e < 1.5) club.e += 0.08; else club.th += club.th <= 0 ? -0.06 : 0.06;
      if (club.thv * club.th < 0) club.thv *= -0.25;
      if (slapT > 0.3 && aPh >= 3) slapT = -0.01;
    }
    /* parent-relative rotation so the club hangs in root space: q = (hip*arm)^-1 * Rx(th)*Rz(ph) */
    q1.copy(hipJ.quaternion).multiply(armJ.quaternion).invert();
    e1.set(club.th, 0, club.ph, 'XYZ'); q2.setFromEuler(e1);
    clubJ.quaternion.copy(q1).multiply(q2);
    elbowJ.rotation.set(club.e, TWIST, 0);

    /* dead fist: clenches at 0.3 Hz out of sync with everything; the slam lands with a wet slap (squash + fingers fly open) */
    clenchHold -= dt;
    let fingA = 0.6 - 0.6 * Math.cos(t * Math.PI * 0.6 + 1.3);
    if (clenchHold > 0) fingA = 0.02;
    let sq = 0;
    if (slapT >= 0 && slapT < 0.45) { const k = slapT / 0.45; fingA = lerp(1.25, fingA, smooth(k)); sq = Math.exp(-slapT * 12) * Math.cos(slapT * 40); }
    setFingers(clamp(fingA, 0, 1.25), 1 + 0.6 * HR.noise(t * 0.7, 4));
    fistMesh.scale.set(1 + 0.14 * sq, 1 - 0.22 * sq, 1 + 0.14 * sq);
  }

  function headUpdate(dt, t, s, sp, bAcc, knock) {
    /* neck crack every 4-8 s: tilt 0.45 in 60 ms, back over 1.2 s */
    crackNext -= dt; if (crackNext <= 0) { crackT = 0; crackNext = 4 + R() * 4; crackSign = R() < 0.5 ? -1 : 1; }
    crackT += dt;
    const crack = crackT < 0.06 ? crackT / 0.06 : crackT < 1.26 ? 1 - smooth((crackT - 0.06) / 1.2) : 0;
    /* gyro-levelled: cancel the torso list/lean, then track the camera */
    headG.rotation.set(
      clamp(s.pitch || 0, -0.6, 0.6) * 0.9 - hipJ.rotation.x * 0.9 - 0.32 * knock,
      clamp(s.yaw || 0, -1.1, 1.1) * 0.9 - hipJ.rotation.y,
      -hipJ.rotation.z + 0.45 * crack * crackSign + 0.12 * knock);

    /* jaw idle: rests 0.35, slowly drops to 40 deg, hangs crooked 3-5 s, snaps shut, relaxes */
    jT += dt;
    let tgt = 0.35;
    if (jPh === 0) { if (jT > jNext) { jPh = 1; jT = 0; } }
    else if (jPh === 1) { tgt = lerp(0.35, JAW_DROP, smooth(jT / 1.4)); if (jT > 1.4) { jPh = 2; jT = 0; jHold = 3 + R() * 2; } }
    else if (jPh === 2) { tgt = JAW_DROP; if (jT > jHold) { jPh = 3; jT = 0; } }
    else if (jPh === 3) { tgt = jT < 0.06 ? lerp(JAW_DROP, 0.0, jT / 0.06) : 0.0; if (jT > 0.32) { jPh = 4; jT = 0; } }
    else if (jPh === 4) { tgt = lerp(0.0, 0.35, smooth(jT / 0.9)); if (jT > 0.9) { jPh = 0; jT = 0; jNext = 4 + R() * 4; } }
    stepPend(jawP, dt, bAcc * 0.5, 30, 3, -0.7, 0.7);
    const jaw = clamp(tgt + jawP.a, 0, 0.9);
    jawJ.rotation.set(jaw, 0, -0.12 - 0.12 * clamp((jaw - 0.35) / 0.35, -1, 1));
    tendonSpan();

    const b = blink(t, s.seed || 0, 5.3);
    lidJ.visible = b > 0.02; lidJ.scale.y = Math.max(0.02, b);
  }
  function tendonSpan() {
    if (jawGone) { tendon.visible = false; return; }
    tendon.visible = true;
    v1.set(0.215, 0.118, 0.215);                                       // head's lower front +x corner
    v2.set(0.205, -0.012, 0.445).applyEuler(jawJ.rotation).add(jawJ.position);   // jaw's front +x corner
    v3.copy(v2).sub(v1); const len = Math.max(0.01, v3.length());
    tendon.position.copy(v1).add(v2).multiplyScalar(0.5);
    tendon.quaternion.setFromUnitVectors(UP, v3.divideScalar(len));
    tendon.scale.set(1, Math.max(0.08, len / 0.10), 1);
  }

  function flyUpdate(dt, t) {
    neckJ.getWorldPosition(hPos); root.worldToLocal(hPos);
    for (let i = 0; i < 3; i++) {
      flyA[i] += dt * (6 + 5 * HR.noise(t * 0.8, i * 7 + 1)) * (HR.noise(t * 0.35, i + 20) > -0.25 ? 1 : -1.2);
      const r = 0.47 + 0.09 * HR.noise(t * 1.4, i + 5);
      const x = hPos.x + r * Math.cos(flyA[i]), y = hPos.y + 0.32 + 0.16 * HR.noise(t * 1.1, i + 9), z = hPos.z + r * Math.sin(flyA[i]);
      /* heading along the (un-jittered) flight path, stretched a touch with speed; 30 Hz jitter <= 0.01 on top */
      const i3 = i * 3; v1.set(x - flyPrev[i3], y - flyPrev[i3 + 1], z - flyPrev[i3 + 2]);
      const d = v1.length(); flyPrev[i3] = x; flyPrev[i3 + 1] = y; flyPrev[i3 + 2] = z;
      if (d > 1e-5 && d < 0.5) flies[i].quaternion.setFromUnitVectors(ZAX, v1.divideScalar(d));
      flies[i].scale.set(1, 1, 1 + Math.min(0.8, dt > 0 ? d / dt * 0.15 : 0));
      flies[i].position.set(x + 0.008 * Math.sin(t * 188 + i), y + 0.008 * Math.sin(t * 160 + i * 2), z + 0.006 * Math.sin(t * 201 + i * 3));
    }
    mWing.opacity = 0.22 + 0.2 * Math.abs(Math.sin(t * 190));   // wing flicker
  }

  /* ---- death: drops the arm first (it keeps clenching and drags itself 0.3 blocks on its fingers), then folds face-first ---- */
  function startDeath() {
    dying = true; dT = 0; jawGone = false; jawOff = R() < api.jawChance;
    root.attach(clubJ); cP0.copy(clubJ.position); cQ0.copy(clubJ.quaternion);
    dArm0 = armX; dE0 = club.e; dHip0 = hipJ.rotation.x; aPh = 0; dFing = fing[1].rotation.x;
  }
  function endDeath() {
    dying = false;
    gripJ.add(clubJ); clubJ.position.set(0, 0, 0); clubJ.quaternion.identity();
    if (jawGone) { headG.add(jawJ); jawJ.position.set(0, 0.11, -0.23); jawJ.rotation.set(0.35, 0, -0.12); jawJ.scale.set(1, 1, 1); jawGone = false; }
    fall.rotation.set(0, 0, 0); first = true; neckJ.position.z = 0.05;
    club.th = club.thv = club.ph = club.phv = 0; club.e = 0.6; club.ev = 0; jawP.a = jawP.v = 0;
  }
  function poseDeath(d, dt, t, s) {
    /* 1. the arm drops (0 - 0.42 s), bounces, then crawls: three pulls of 0.1 */
    if (d < 0.42) {
      const k = d / 0.42;
      clubJ.position.set(lerp(cP0.x, cP1.x, smooth(k)), lerp(cP0.y, cP1.y, k * k), lerp(cP0.z, cP1.z, smooth(k)));
      clubJ.quaternion.slerpQuaternions(cQ0, cQ1, Math.pow(k, 1.4));
      elbowJ.rotation.set(lerp(dE0, -0.08, k), TWIST * (1 - smooth(k * 2)), 0);   // -0.08: the (bigger) fist end rests on the grass, not in it
      dFing = lerp(dFing, 1.1, Math.min(1, dt * 6)); setFingers(dFing, 0.5);
    } else {
      const b = d - 0.42;
      const bounce = b < 0.16 ? 0.05 * Math.sin(b / 0.16 * Math.PI) : 0;
      const c = Math.max(0, d - 0.62), per = 0.62, n = Math.floor(c / per), p = (c % per) / per;
      const pulls = Math.min(3, n + (n < 3 ? smooth((p - 0.55) / 0.45) : 0));
      const open = p < 0.5 ? smooth(p / 0.5) : 1 - smooth((p - 0.5) / 0.5);   // keeps clenching after the third pull
      clubJ.position.set(cP1.x, cP1.y + bounce + 0.025 * open * (d > 0.62 ? 1 : 0), cP1.z + 0.1 * pulls);
      clubJ.quaternion.copy(cQ1);
      elbowJ.rotation.set(-0.08 + 0.04 * Math.sin(d * 3), 0, 0);
      dFing = d > 0.62 ? 0.05 + 1.15 * open : lerp(dFing, 0.6, Math.min(1, dt * 5)); setFingers(dFing, 1.5);
      clubJ.rotation.z += 0.04 * open;   // the whole limb rocks as the fingers pull
    }
    fistMesh.scale.set(1, 1, 1);

    /* 2. body: head lolls, folds at the hips (0.15 - 0.55), topples face-first (0.55 - 1.1), bounce */
    const fold = d < 0.15 ? 0 : d < 0.55 ? smooth((d - 0.15) / 0.4) : d < 1.1 ? 1 - smooth((d - 0.55) / 0.55) : 0;
    const fk = d < 0.55 ? 0 : d < 1.1 ? Math.pow((d - 0.55) / 0.55, 2) : 1;
    const bb = d - 1.1, bounce = bb > 0 && bb < 0.22 ? 0.06 * Math.sin(bb / 0.22 * Math.PI) : 0;
    fall.rotation.set(fk * Math.PI / 2 - bounce, 0, 0);
    body.position.set(0, -0.04 * fold, -0.15);
    hipJ.rotation.set(lerp(dHip0, 0, Math.min(1, d / 0.15)) + 0.55 * fold, 0, -0.05 * (1 - fk));
    const legBuckle = 0.22 * fold;
    lL.rotation.set(legBuckle, 0, 0.04 * fk); lR.rotation.set(legBuckle * 0.8, 0, -0.06 * fk);
    footL.rotation.x = lerp(footL.rotation.x, 0.5 * fk, Math.min(1, dt * 8)); footR.rotation.x = lerp(footR.rotation.x, 0.6 * fk, Math.min(1, dt * 8));
    /* the empty hand springs up when it lets go, then reaches out past his head as he goes down */
    const release = d < 0.3 ? Math.sin(d / 0.3 * Math.PI) : 0;
    armJ.rotation.set(lerp(dArm0, -1.2, Math.min(1, d / 0.3)) - 0.35 * release + lerp(0, -1.85, smooth((d - 0.5) / 0.6)), 0, lerp(ARM_Z, 0.0, fk));
    headG.rotation.set(lerp(0, -0.38, smooth(d / 0.9)), 0.25 * smooth(d / 0.8), 0.22 * smooth((d - 0.2) / 0.8));
    neckJ.position.z = lerp(0.05, -0.13, fk);   // the 0.5-deep head is thicker than his chest: lift it so the face rests ON the dirt
    /* jaw falls open as he goes down; flops on impact */
    if (!jawGone) {
      const jw = clamp(0.35 + 0.45 * smooth((d - 0.3) / 0.6) + (bb > 0 && bb < 0.3 ? 0.25 * Math.sin(bb / 0.3 * Math.PI) : 0), 0, 0.95);
      jawJ.rotation.set(jw, 0, -0.18);
      if (jawOff && d >= 1.1) {
        root.attach(jawJ); jP0.copy(jawJ.position); jQ0.copy(jawJ.quaternion); jawGone = true; jd0 = d;
        e1.set(0, 0.7, 0, 'XYZ'); jQ1.setFromEuler(e1);   // lands beside his head, lips and molars toward you
      }
      tendonSpan();
    }
    if (jawGone) {
      /* 5%: the jaw pops off on impact, hops out beside his head and skids to a stop */
      const k = Math.min(1, (d - jd0) / 0.6), ko = 1 - (1 - k) * (1 - k);
      jawJ.position.set(lerp(jP0.x, 0.52, ko), lerp(jP0.y, 0.112, smooth(k)) + 0.22 * Math.sin(Math.PI * k) * (1 - 0.5 * k), lerp(jP0.z, 2.0, ko));
      jawJ.quaternion.slerpQuaternions(jQ0, jQ1, smooth(k));
      tendon.visible = false;
    }
    lidJ.visible = false;
  }

  packGroups(root);
  return api;
};
})();

