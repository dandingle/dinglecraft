/* PLAYER (Dan): "The Tree-Puncher". DESIGN_BIBLE.md section 1.
   Hyperreal pack, Three.js r128. Registers HR.MODELS.player.
   Feet at y=0, faces +z, model's left = +x. In game wrap root in a Group with rot.y = PI
   (mkPlayerModel / agHumanoid face -z). handles = {head, aL, aR, lL, lR} for syncArmTool / applyHat / syncArmorModel.
   Extra API on the returned object:
     fist      {swell 0..1, splinters 0..6, minSwell, minSplinters, hour}: cosmetic counters, read/write, not saved.
               +0.025 swell per bare-hand block hit (s.blockHit or s.woodHit), plus a 35% splinter chance on wood (s.woodHit);
               -0.1 swell and one splinter per `hour` seconds, never below minSwell / minSplinters.
     viewmodel() -> {group, update(dt, t, s)}: first-person swollen fist for handG (empty hand). */
(function () {
'use strict';
const HR = window.HR;

/* ---- measurements taken from final_ent/*_basecolor.png (1024 x 1024; u left->right, v bottom->top) ---- */
/* face_dan: image-left eye is Dan's right eye = model -x. Eyes measured from lid corners and iris centres. */
const DAN = {
  eyeR: [0.225, 0.573],      // model -x eye: iris centre (u, v). corners u 0.089..0.363
  eyeL: [0.771, 0.574],      // model +x eye: iris centre. corners u 0.634..0.908
  eyeHalfW: 0.137,           // half the corner-to-corner width (0.274)
  lidTop: 0.610,             // upper lid margin (v)
  lidBot: 0.535,             // lower lid margin (v)
  lidSkin: [0.610, 0.655],   // upper-lid skin between lid margin and brow: the blink plate's crop
  lips: 0.04,                // lips sit on the bottom edge (player has no jaw)
};
/* fist_dan: back of a right fist. Split knuckles + one splinter across v 0.50..0.90, curled finger segments below v 0.45. */
const FIST = {
  front:  [0.04, 0.47, 0.96, 1.00],   // knuckle band for the 0.27 x 0.16 front face (aspect ~1.7:1)
  strike: [0.08, 0.20, 0.92, 1.00],   // near-square knuckle crop for the -y face (it leads the jab)
};
/* clothes: photo-built garment atlases (tools/build_cloth.py). tee_dan: torso front u [0,TF), back [TF,TB), side strip [TB,1],
   v 0 = hem, at 0.787 u per block across all three. jog_dan: two 360-degree leg unwraps, A (+x leg) v .5-1, B (-x leg) v 0-.5,
   each front [0,.25) outer [.25,.5) back [.5,.75) inner [.75,1]. Set CLOTHES false to fall back to the tinted jersey. */
const CLOTHES = true;
const TF = 403 / 1024, TB = 806 / 1024, TU = TF / 0.5;
const TORSO_UV = { pz: [0, 0, TF, 1], nz: [TF, 0, TB, 1], px: [TB, 0, 1, 1], nx: [1, 0, TB, 1], py: [0.06, 0.55, TF - 0.06, 0.70], ny: [0.05, 0.004, TF - 0.05, 0.03] };
/* short sleeve of width w (0.26 tall): hem at the bottom. Faces come from the side strip and the front's lower corners
   (the image-left corner carries the knuckle-wipe blood, so the right arm's outer face shows it) */
function sleeveUV(w, bloody) {
  const cu = w * TU, cv = 0.26 / 0.72;
  const L = [0.004, 0, 0.004 + cu, cv], Rr = [TF - 0.004 - cu, 0, TF - 0.004, cv];
  return { pz: [TB + 0.004, 0, TB + 0.004 + cu, cv], nz: [1 - 0.004, 0, 1 - 0.004 - cu, cv], px: bloody ? Rr : L, nx: bloody ? L : Rr,
    py: [TB + 0.01, 0.6, TB + 0.01 + cu, 0.6 + w / 0.72], ny: [TB + 0.01, 0.006, TB + 0.01 + cu, 0.02] };
}
/* leg unwrap faces for leg A (model +x: outer = px) or B (model -x, mirrored: outer = nx), v range [v0, v1] of the 0.56 leg */
function legUV(A) {
  const v0 = A ? 0.5 : 0, v1 = A ? 1 : 0.5;
  return A ? { pz: [0, v0, 0.25, v1], px: [0.25, v0, 0.5, v1], nz: [0.5, v0, 0.75, v1], nx: [0.75, v0, 1, v1], py: [0.1, v1 - 0.02, 0.2, v1 - 0.01], ny: [0.1, v0 + 0.002, 0.2, v0 + 0.01] }
           : { pz: [0.25, v0, 0, v1], nx: [0.5, v0, 0.25, v1], nz: [0.75, v0, 0.5, v1], px: [1, v0, 0.75, v1], py: [0.1, v1 - 0.02, 0.2, v1 - 0.01], ny: [0.1, v0 + 0.002, 0.2, v0 + 0.01] };
}
/* mean of each material's _roughness.png, so `rough` can be given as the bible's final value */
const RMEAN = { mat_jersey: 0.315, mat_skin: 0.351, mat_rotflesh: 0.46, mat_bone: 0.13 };
const HOUR = 50;   // real seconds per in-game hour (20-minute day) for swell/splinter decay
/* head_dan_side: side-profile photo, face toward image-left (u 0 = front). px gets [0,0,1,1], nx mirrored [1,0,0,1].
   Set false to fall back to hair_shared on the sides (e.g. if the side textures are pulled). */
const SIDE_TEX = true;
/* swell -> size. Fist ~0.385 wide at the starting swell 0.85 (vs the 0.17 left hand), 0.405 at swell 1 */
const FIST_K = 0.5, FORE_K = 0.3, SLEEVE_K = 0.15;
const fistScale = sw => 1 + FIST_K * sw;
/* the rig repairs only its cached base material when a texture 404s/resets; clones keep the dead texture
   (renders black). Every 0.5 s: retry the file once (shared), else drop the map on the clone. */
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
/* one draw call per material per box: reorder each multi-material mesh's index so faces sharing a material are contiguous */
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
}   // real seconds per in-game hour (20-minute day) for swell/splinter decay

function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
/* per-face UV crops at a constant physical scale (S blocks per texture) so weave/pores match across parts */
function tile(w, h, d, S, r) {
  const f = (a, b) => { const cu = Math.min(1, a / S), cv = Math.min(1, b / S), u = r() * (1 - cu), v = r() * (1 - cv); return [u, v, u + cu, v + cv]; };
  return { px: f(d, h), nx: f(d, h), py: f(w, d), ny: f(w, d), pz: f(w, h), nz: f(w, h) };
}
function stepPend(p, dt, drive, k, c, lo, hi) {
  const n = dt > 1 / 60 ? Math.ceil(dt * 60) : 1, h = dt / n;
  for (let i = 0; i < n; i++) {
    p.v += (-k * p.a - c * p.v + drive) * h; p.a += p.v * h;
    if (p.a < lo) { p.a = lo; if (p.v < 0) p.v *= -0.3; } else if (p.a > hi) { p.a = hi; if (p.v > 0) p.v *= -0.3; }
  }
  if (p.v > 30) p.v = 30; else if (p.v < -30) p.v = -30;
  return p.a;
}
/* sRGB hex -> linear hex: flat colours and 'match' tints are authored as the colour you should SEE */
function lin(hex) { let o = 0; for (let sh = 16; sh >= 0; sh -= 8) { const c = ((hex >> sh) & 255) / 255; o = (o << 8) | Math.round(255 * (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))); } return o; }
/* tint that makes a pale tileable material average out to the target sRGB colour (texMean = the texture's linear mean) */
function match(hex, texMean) { let o = 0; for (let sh = 16; sh >= 0; sh -= 8) { const c = ((lin(hex) >> sh) & 255) / 255; o = (o << 8) | Math.min(255, Math.round(255 * c / texMean)); } return o; }
const JERSEY_MEAN = 0.586;   // mat_jersey basecolor mean, linear
const smooth = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;
/* blink with the bible's timing: close 50 ms, hold 70 ms, open 90 ms */
function blink(t, seed, every) {
  const p = (t + seed * 1.7) % every;
  return p < 0.05 ? p / 0.05 : p < 0.12 ? 1 : p < 0.21 ? 1 - (p - 0.12) / 0.09 : 0;
}

HR.MODELS.player = function () {
  const mats = [], pairs = [], R = rng(7);
  const M = (id, color, rough, ex) => {
    const o = Object.assign({ color }, ex || {});
    if (RMEAN[id]) o.rough = rough / RMEAN[id]; else { o.rough = rough; o.roughMap = false; }
    const b = HR.mat(id, o), m = b.clone(); mats.push(m); pairs.push([m, b, id]); return m;
  };
  const F = (color, rough) => { const m = HR.flat(lin(color), { rough }).clone(); mats.push(m); return m; };

  const mFace = M('face_dan', 0xffffff, 0.5, { normalScale: 0.6 });
  const mHair = M('hair_shared', 0x7a5a40, 0.6, { normalScale: 0.9 });   // lighter than the bible's #5a3e2a: that read near-black from behind / in the cave
  const mSide = SIDE_TEX ? M('head_dan_side', 0xffffff, 0.5, { normalScale: 0.6 }) : mHair;
  const mChin = M('mat_skin', 0xd9a07c, 0.55);
  const mTee = CLOTHES ? M('tee_dan', 0xffffff, 0.9, { normalScale: 0.9 }) : M('mat_jersey', match(0xd9822b, JERSEY_MEAN), 0.9);     // orange hoodie-tee (Release 1.0 colours)
  const mJog = CLOTHES ? M('jog_dan', 0xffffff, 0.9, { normalScale: 0.9 }) : M('mat_jersey', match(0x34343a, JERSEY_MEAN), 0.9);   // charcoal joggers
  /* tile() keeps the seeded crop sequence (R) identical either way; the garment crops replace its faces */
  const cl = (uv, over) => CLOTHES ? Object.assign(uv, over) : uv;
  /* bare forearms: hairy skin bombed from the back of his own fist photo (skin_arm), same tints as before */
  const mSkin = CLOTHES ? M('skin_arm', 0xe0a882, 0.55, { normalScale: 0.8 }) : M('mat_skin', 0xe0a882, 0.55);
  const mFlush = CLOTHES ? M('skin_arm', 0xd99478, 0.5, { normalScale: 0.8 }) : M('mat_skin', 0xd99478, 0.5);
  const mPalm = M('mat_skin', 0xc8705e, 0.5);
  const mFist = M('fist_dan', 0xffffff, 0.45, { normalScale: 0.8 });
  const mShoe = M('mat_skin', 0x2b2b30, 0.5);
  const mLeaf = F(0x4f7a2a, 0.6);
  const mSpl = F(0x8a6a40, 0.85);   // pale raw wood so they separate from the red knuckles

  const root = new THREE.Group(); root.name = 'hr_player';
  const fall = HR.joint(root, 0.24, 0, 0);        // death topple pivot: outer edge of the left shoe
  const body = HR.joint(fall, -0.24, 0, 0);

  /* legs + shoes (shoes are children of the leg joints) */
  const lL = HR.joint(body, 0.13, 0.66, 0), lR = HR.joint(body, -0.13, 0.66, 0);
  [lL, lR].forEach(j => {
    HR.at(j, HR.box(0.21, 0.56, 0.21, mJog, cl(tile(0.21, 0.56, 0.21, 0.8, R), legUV(j === lL))), 0, -0.28, 0);
    HR.at(j, HR.box(0.22, 0.10, 0.26, mShoe, tile(0.22, 0.10, 0.26, 0.5, R)), 0, -0.61, 0.02);
  });

  /* torso (pivot at the hips) */
  const torsoJ = HR.joint(body, 0, 0.64, 0);
  const torso = HR.at(torsoJ, HR.box(0.50, 0.72, 0.27, mTee, cl(tile(0.50, 0.72, 0.27, 0.8, R), TORSO_UV)), 0, 0.36, 0);

  /* head */
  const head = HR.joint(torsoJ, 0, 0.73, 0); head.rotation.order = 'YXZ';
  HR.at(head, HR.box(0.5, 0.5, 0.5, { all: mHair, pz: mFace, ny: mChin, px: mSide, nx: mSide }, SIDE_TEX ? { px: [0, 0, 1, 1], nx: [1, 0, 0, 1] } : undefined), 0, 0.25, 0);
  const leaf = HR.at(head, HR.box(0.12, 0.08, 0.01, mLeaf), 0.17, 0.50, 0.05);
  leaf.rotation.set(-0.55, 0.3, 0.4); leaf.castShadow = false;
  /* blink plates: thin boxes 0.006 proud of the face, front cropped from the upper-lid skin above each eye, pivot at the top edge */
  const lids = [];
  [DAN.eyeR, DAN.eyeL].forEach(e => {
    const u0 = e[0] - DAN.eyeHalfW, u1 = e[0] + DAN.eyeHalfW, crop = [u0, DAN.lidSkin[0], u1, DAN.lidSkin[1]];
    const w = (u1 - u0) * 0.5, h = (DAN.lidTop - DAN.lidBot) * 0.5 + 0.004;
    const j = HR.joint(head, (e[0] - 0.5) * 0.5, DAN.lidTop * 0.5 + 0.002, 0.2535);
    const m = HR.at(j, HR.box(w, h, 0.006, mFace, { px: crop, nx: crop, py: crop, ny: crop, pz: crop, nz: crop }), 0, -h / 2, 0);
    m.castShadow = false; j.visible = false; lids.push(j);
  });

  /* left arm: normal */
  const aL = HR.joint(torsoJ, 0.34, 0.68, 0);
  HR.at(aL, HR.box(0.18, 0.26, 0.18, mTee, cl(tile(0.18, 0.26, 0.18, 0.8, R), sleeveUV(0.18, false))), 0, -0.13, 0);
  HR.at(aL, HR.box(0.17, 0.30, 0.17, mSkin, tile(0.17, 0.30, 0.17, 0.5, R)), 0, -0.41, 0);
  HR.at(aL, HR.box(0.17, 0.10, 0.17, mSkin, tile(0.17, 0.10, 0.17, 0.5, R)), 0, -0.61, 0);

  /* right arm: the tree-puncher. Sleeve stretched tight, flushed forearm, fist like a boxing glove */
  const aR = HR.joint(torsoJ, -0.37, 0.65, 0);      // shoulder dropped 0.03 under the weight
  const sleeveR = HR.at(aR, HR.box(0.23, 0.26, 0.23, mTee, cl(tile(0.23, 0.26, 0.23, 0.8, R), sleeveUV(0.23, true))), 0, -0.13, 0);
  const foreR = HR.at(aR, HR.box(0.24, 0.28, 0.24, mFlush, tile(0.24, 0.28, 0.24, 0.5, R)), 0, -0.40, 0);
  const wrist = HR.joint(aR, 0, -0.54, 0);
  const fistGeo = () => HR.box(0.27, 0.16, 0.27, { all: mPalm, nx: mFist, pz: mFist, ny: mFist }, { pz: FIST.front, ny: FIST.strike });
  HR.at(wrist, fistGeo(), 0, -0.08, 0);
  /* six splinters set into the knuckle faces at random angles (wrist-local surface point, outward normal) */
  const SPL = [
    [-0.06, -0.10, 0.135, 0, 0, 1], [-0.135, -0.05, 0.06, -1, 0, 0], [0.03, -0.16, 0.07, 0, -1, 0],
    [0.06, -0.05, 0.135, 0, 0, 1], [-0.135, -0.11, -0.05, -1, 0, 0], [-0.07, -0.16, -0.03, 0, -1, 0],
  ];
  const UP = new THREE.Vector3(0, 1, 0);
  function addSplinters(parent, rr) {
    const out = [];
    SPL.forEach(p => {
      const n = new THREE.Vector3(p[3], p[4], p[5]);
      const tx = new THREE.Vector3(p[4], p[5], p[3]);  // a tangent
      const ty = new THREE.Vector3().crossVectors(n, tx);
      const a = 0.35 + rr() * 0.45, b = rr() * Math.PI * 2;
      const dir = n.clone().multiplyScalar(Math.cos(a)).addScaledVector(tx, Math.sin(a) * Math.cos(b)).addScaledVector(ty, Math.sin(a) * Math.sin(b)).normalize();
      const len = 0.064 + rr() * 0.016;      // x fistScale (~1.43) = 0.02 x 0.09-0.11 in the world
      const m = HR.box(0.015, len, 0.015, mSpl);
      m.quaternion.setFromUnitVectors(UP, dir);
      m.position.set(p[0], p[1], p[2]).addScaledVector(dir, len * 0.5 - 0.018);
      m.castShadow = false; parent.add(m); out.push(m);
    });
    return out;
  }
  const spl = addSplinters(wrist, rng(11));

  const handles = { head, aL, aR, lL, lR, torso: torsoJ, fist: wrist };
  const fist = { swell: 0.85, splinters: 3, minSwell: 0.5, minSplinters: 2, hour: HOUR };   // he has been punching trees for a while

  /* ---- shared hit logic (third person + viewmodel; ignores a second call in the same frame) ---- */
  let lastHitT = -1, hitAge = 9, hourAcc = 0;
  function woodHit(t) {
    if (t === lastHitT) return; lastHitT = t;
    fist.swell = Math.min(1, fist.swell + 0.025);
    if (fist.splinters < 6 && R() < 0.35) fist.splinters++;
    hitAge = 0;
  }
  /* decays toward a chronic baseline (he never stops punching trees): swell 0.5, two splinters that never come out */
  function decay(dt) {
    if (fist.swell > fist.minSwell) fist.swell = Math.max(fist.minSwell, fist.swell - 0.1 * dt / fist.hour);
    hourAcc += dt; if (hourAcc >= fist.hour) { hourAcc -= fist.hour; if (fist.splinters > fist.minSplinters) fist.splinters--; }
  }
  /* tremor (+-0.02 rad at 30 Hz for 0.25 s after a wood hit) and the swollen-tissue throb */
  const tremor = () => hitAge < 0.25 ? 0.022 * Math.cos(hitAge * 188.5) * (1 - hitAge / 0.25) : 0;
  const puff = () => hitAge < 1 ? 0.075 * Math.exp(-6 * hitAge) * (1 - Math.exp(-45 * hitAge)) : 0;
  /* jab: -1.4 rad in 70 ms, back in 150 ms */
  const jabCurve = j => j < 0.07 ? -1.4 * (1 - (1 - j / 0.07) * (1 - j / 0.07)) : j < 0.22 ? -1.4 * (1 - smooth((j - 0.07) / 0.15)) : 0;

  /* ---- animation state ---- */
  let ph = 0, prevAtk = 0, prevHurt = 0, jabT = 9, pendWood = false;
  let shakeT = 9, nextShake = 5 + R() * 3, prevSp = 0, updatedAt = -1;
  const pR = { a: 0, v: 0 };            // heavy right-arm pendulum (offset from the scripted swing)
  const qW = new THREE.Quaternion(), aLoc = new THREE.Vector3(), ZERO = new THREE.Vector3();
  let dying = false, dT = 0, dAx = 0, dAz = 0;

  function events(dt, t, s) {
    if ((s.fired || (s.attack > 0 && prevAtk <= 0)) && jabT > 0.15) { jabT = 0; pendWood = false; }
    if (s.woodHit) { if (jabT < 0.07) pendWood = true; else woodHit(t); }
    else if (s.blockHit && t !== lastHitT) { lastHitT = t; fist.swell = Math.min(1, fist.swell + 0.025); hitAge = 0; }   // any other bare-hand block hit
    prevAtk = s.attack || 0;
    if (jabT < 1) {
      const j0 = jabT; jabT += dt;
      if (pendWood && jabT >= 0.07) { pendWood = false; woodHit(t); }
      if (j0 < 0.22 && jabT >= 0.22) pR.v += 2.9;      // the fist keeps going when the arm stops: heavy overshoot
    }
    hitAge += dt; decay(dt);
  }

  let healT = 0;
  function update(dt, t, s) {
    if (!(dt > 0)) dt = 0; else if (dt > 0.1) dt = 0.1;
    if ((healT += dt) > 0.5) { healT = 0; healMats(pairs); }
    if (updatedAt !== t) { updatedAt = t; events(dt, t, s); }

    if (s.dead > 0) { if (!dying) { dying = true; dT = 0; dAx = aR.rotation.x; dAz = aR.rotation.z; } dT += dt; poseDeath(dT, t); return; }
    if (dying) { dying = false; fall.rotation.set(0, 0, 0); pR.a = pR.v = 0; head.rotation.z = 0; aR.rotation.y = 0; aL.position.x = 0.34; }

    const sp = HR.clamp(s.speed || 0, 0, 1);
    ph = (ph + dt * 9) % (Math.PI * 200);
    const sw = Math.sin(ph), swLag = Math.sin(ph - 0.72);     // 0.72 rad = 80 ms at this cadence
    const leg = 0.55 * sw * sp;
    lL.rotation.x = -leg; lR.rotation.x = leg; lL.rotation.z = lR.rotation.z = 0;
    body.position.y = -0.66 * (1 - Math.cos(leg)) * 0.85;

    /* hurt: torso snaps back 0.15 in 75 ms, recovers; the big arm stays behind and swings late */
    const hk = 1 - (s.hurt || 0);
    const hEnv = s.hurt > 0 ? (hk < 0.15 ? hk / 0.15 : Math.pow(1 - (hk - 0.15) / 0.85, 2)) : 0;
    if (s.hurt > prevHurt + 0.2) pR.v -= 2.6;
    prevHurt = s.hurt || 0;

    /* idle: shake out the right hand every 8-14 s (lift + look, 0.4 s of 10 Hz shaking, settle) */
    nextShake -= dt;
    if (nextShake <= 0 && jabT > 0.6 && s.hurt <= 0) { shakeT = 0; nextShake = 8 + R() * 6; }
    let lift = 0, shake = 0;
    if (shakeT < 0.95) {
      shakeT += dt;
      lift = shakeT < 0.2 ? smooth(shakeT / 0.2) : shakeT < 0.7 ? 1 : 1 - smooth((shakeT - 0.7) / 0.25);
      if (shakeT > 0.22 && shakeT < 0.62) shake = 0.4 * Math.sin((shakeT - 0.22) * Math.PI * 20) * Math.sin((shakeT - 0.22) / 0.4 * Math.PI);
    }

    const jab = jabT < 1 ? jabCurve(jabT) : 0;
    const jabEnv = jabT < 0.07 ? jabT / 0.07 : jabT < 0.3 ? 1 - (jabT - 0.07) / 0.23 : 0;

    /* torso */
    const breath = 0.5 + 0.5 * Math.sin(t * Math.PI * 0.5);
    torso.scale.y = 1 + 0.01 * breath;
    torsoJ.rotation.x = 0.04 * sp - 0.15 * hEnv + 0.05 * jabEnv;
    const roll = 0.025 + 0.06 * fist.swell;                     // lists toward the heavy side (-x)
    torsoJ.rotation.z = roll + 0.02 * sw * sp;
    torsoJ.rotation.y = 0.07 * sw * sp + 0.24 * jabEnv;
    head.position.y = 0.73 + 0.0072 * breath;

    /* heavy right arm: scripted swing 80 ms late at 0.6x amplitude + a slow pendulum for the weight */
    root.getWorldQuaternion(qW); aLoc.copy(s.accel || ZERO).applyQuaternion(qW.invert());
    const dsp = dt > 0 ? (sp - prevSp) / dt : 0; prevSp = sp;
    stepPend(pR, dt, -aLoc.z * 0.25 + dsp * 0.7, 10, 2.5, -0.9, 0.9);
    const tr = tremor();
    aR.rotation.x = -0.3 * swLag * sp + pR.a + jab - 0.38 * lift + tr;
    aR.rotation.z = -0.10 - roll - 0.03 * Math.abs(sw) * sp - 0.1 * lift;   // hangs 0.10 outward of vertical, clear of the hip
    aL.rotation.x = 0.5 * sw * sp + 0.1 * hEnv; aL.rotation.z = 0.04;

    /* fist: swell, throb, tremor, shake-out; forearm girth */
    const g = 1 + FORE_K * fist.swell, gs = 1 + SLEEVE_K * fist.swell;
    foreR.scale.set(g, 1, g); sleeveR.scale.set(gs, 1, gs);
    wrist.scale.setScalar(fistScale(fist.swell) * (1 + puff()));
    wrist.rotation.set(tr * 0.6, shake * 0.5, shake);
    for (let i = 0; i < 6; i++) spl[i].visible = i < fist.splinters;

    /* head: tracks the camera, dips to look at the hand during the shake */
    head.rotation.y = HR.clamp(s.yaw || 0, -1.1, 1.1) * 0.85 - torsoJ.rotation.y - 0.4 * lift;
    head.rotation.x = HR.clamp(s.pitch || 0, -0.6, 0.6) * 0.8 - 0.04 * sp + 0.25 * lift;
    head.rotation.z = -0.6 * torsoJ.rotation.z;                 // keeps his eyes roughly level while the body lists
    leaf.rotation.z = 0.4 + 0.06 * HR.noise(t * 2.2, 3) * (0.3 + sp);

    const b = blink(t, s.seed || 0, 4.2);
    for (let i = 0; i < 2; i++) { lids[i].visible = b > 0.02; lids[i].scale.y = Math.max(0.02, b); }
  }

  /* death: topples sideways onto his left; the right arm lands 120 ms after the body, with one heavy bounce */
  function poseDeath(d, t) {
    const T0 = 0.12, TL = 0.78;
    let a;
    if (d < T0) a = 0; else if (d < TL) { const k = (d - T0) / (TL - T0); a = k * k; }
    else { const b = d - TL; a = b < 0.2 ? 1 - 0.045 * Math.sin(b / 0.2 * Math.PI) : 1; }
    /* the body jolts again when the arm lands */
    const ab = d - 0.9; const jolt = ab > 0 && ab < 0.16 ? 0.02 * Math.sin(ab / 0.16 * Math.PI) : 0;
    fall.rotation.set(0, 0, -a * Math.PI / 2 + jolt);
    body.position.y = 0;
    torsoJ.rotation.set(0.05 * Math.min(1, d / 0.3), 0, 0.06 * a);
    torso.scale.y = 1;
    let k = d < 0.5 ? 0 : d < 0.9 ? Math.pow((d - 0.5) / 0.4, 2) : 1;
    if (d >= 0.9 && d < 1.12) k = 1 - 0.17 * Math.sin((d - 0.9) / 0.22 * Math.PI);
    aR.rotation.set(lerp(dAx, -Math.PI / 2, k), 0, lerp(dAz, 0.78, k));   // 0.78: the swollen fist rests ON the grass
    /* left arm (the side he lands on) folds in under his chest, hand reaching forward along the ground: the shoulder
       slides in so nothing ends up below y 0 (the shoulder joint itself would sit at y -0.10 once he is on his side) */
    aL.position.x = lerp(0.34, 0.15, a);
    aL.rotation.set(lerp(0, -1.35, a), 0, lerp(0.04, -0.1, a));
    lL.rotation.set(0.08 * a, 0, 0.01 * a); lR.rotation.set(-0.16 * a, 0, -0.03 * a);
    head.rotation.set(0.12 * a, 0.25 * a, 0.04 * a);        // ear on the ground (head and torso are the same half-width)
    /* one last twitch of the fist */
    const tw = d > 1.6 && d < 1.9 ? 0.25 * Math.sin((d - 1.6) / 0.3 * Math.PI * 3) * (1 - (d - 1.6) / 0.3) : 0;
    wrist.rotation.set(0, 0, tw);
    wrist.scale.setScalar(fistScale(fist.swell));
    for (let i = 0; i < 2; i++) lids[i].visible = false;
  }

  /* ---- first-person viewmodel: clones of sleeve, forearm, fist and splinters (shares this instance's materials) ---- */
  function viewmodel() {
    const group = new THREE.Group(); group.position.set(0.42, -0.42, -0.55); group.scale.setScalar(0.8);
    /* fist sits low-right of the crosshair, forearm running back out of the bottom-right corner,
       back of the hand (fist_dan, the -x face) turned up toward the eye. Basis built once. */
    const dir = new THREE.Vector3(-0.41, 0.58, -0.70).normalize();          // shoulder -> fist, camera space
    const Y = dir.clone().negate(), o = new THREE.Vector3(0, 0.7, 0.7);
    o.addScaledVector(Y, -o.dot(Y)).normalize();
    const X = o.clone().negate(), Z = new THREE.Vector3().crossVectors(X, Y);
    const base = HR.joint(group, -0.15 - dir.x * 0.62, 0.21 - dir.y * 0.62, -0.06 - dir.z * 0.62);
    base.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const arm = HR.joint(base, 0, 0, 0);
    const sleeve = HR.at(arm, HR.box(0.23, 0.26, 0.23, mTee, CLOTHES ? sleeveUV(0.23, true) : undefined), 0, -0.13, 0);
    const fore = HR.at(arm, HR.box(0.24, 0.28, 0.24, mFlush), 0, -0.40, 0);
    const wr = HR.joint(arm, 0, -0.54, 0);
    HR.at(wr, fistGeo(), 0, -0.08, 0);
    const vspl = addSplinters(wr, rng(11));
    group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    let vph = 0, vJab = 9, vPrev = 0, vShake = 9, vNext = 8 + R() * 6, vAt = -1;
    return {
      group, arm,
      update(dt, t, s) {
        if (!(dt > 0)) dt = 0; else if (dt > 0.1) dt = 0.1;
        if (vAt !== t) { vAt = t;
          if ((s.fired || (s.attack > 0 && vPrev <= 0)) && vJab > 0.15) vJab = 0;
          vPrev = s.attack || 0;
          if (s.woodHit) woodHit(t);
          if (updatedAt !== t) { hitAge += dt; decay(dt); }   // third-person model may not be updating in first person
        }
        const sp = HR.clamp(s.speed || 0, 0, 1);
        vph += dt * 9 * sp;
        vJab += dt;
        const j = vJab < 0.3 ? jabCurve(vJab) / -1.4 : 0;
        vNext -= dt; if (vNext <= 0 && vJab > 0.6) { vShake = 0; vNext = 8 + R() * 6; }
        let lift = 0, shake = 0;
        if (vShake < 0.95) { vShake += dt;
          lift = vShake < 0.2 ? smooth(vShake / 0.2) : vShake < 0.7 ? 1 : 1 - smooth((vShake - 0.7) / 0.25);
          if (vShake > 0.22 && vShake < 0.62) shake = 0.4 * Math.sin((vShake - 0.22) * Math.PI * 20) * Math.sin((vShake - 0.22) / 0.4 * Math.PI); }
        const tr = tremor();
        group.position.set(0.42 + 0.025 * Math.sin(vph) * sp - 0.12 * j, -0.42 - 0.02 * Math.abs(Math.cos(vph)) * sp + 0.1 * lift + 0.06 * j, -0.55 - 0.3 * j);
        arm.rotation.set(0.35 * j + tr - 0.25 * lift, 0, -0.2 * lift);
        const g = 1 + FORE_K * fist.swell, gs = 1 + SLEEVE_K * fist.swell; fore.scale.set(g, 1, g); sleeve.scale.set(gs, 1, gs);
        wr.scale.setScalar(fistScale(fist.swell) * (1 + puff()));
        wr.rotation.set(tr, shake * 0.5, shake);
        for (let i = 0; i < 6; i++) vspl[i].visible = i < fist.splinters;
      },
    };
  }

  packGroups(root);
  return { root, update, mats, handles, deathDur: 2.5, fist, viewmodel };
};
})();

