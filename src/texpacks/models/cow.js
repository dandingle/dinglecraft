/* COW — "The Periscope" (Hyperreal pack, DESIGN_BIBLE §10).
   A brown-and-white cow grazing normally until you come within 6 blocks; then its neck unfolds out of
   its shoulders segment by segment into a two-block periscope of hide, vertebra knuckles pushing up
   through the skin, and its wet-nosed head stares down at you from above. It moos once, holds your
   gaze, and slowly retracts. Hit it and it shoots its neck to full height and bolts like an emu.
   Preview: s.near is 3, so it rises ~1 s after load (then a 20 s cooldown per cow); H = full extension
   in 0.2 s + emu panic; K = last full extension, then it falls like a felled tree.
   Game hooks: s.near (target distance), s.periscope === false vetoes the rise (not the nearest cow / no
   line of sight), s.headroom (< 3 free blocks above -> the neck extends horizontally toward the target),
   api.onSfx(name, i) is called with 'crackle' per segment and 'moo'. */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS) return;

/* ---- measured from final_ent/face_cow_basecolor.png (1024 sq; u = x/1024, v = 1 - y/1024) ----
   image-left eye  = model's RIGHT (-x): eyeball centre (224,366)px -> u .219 v .643; ~65x65px; lashes reach u .157
   image-right eye = model's LEFT  (+x): centre (800,368)px -> u .781 v .641; ~65x63px
   white muzzle x 296-746, y 670-1024 -> u .29-.73, v 0-.345; pink nose x 386-686, y 720-930 (nostrils y~795)
   mouth line y~932 -> v .09 (chin split); drool string at x~515 (u .503) from the lip to the bottom edge
   horn bases in the top corners (y < 80); painted ears at the side edges (dark, x < 150 and x > 870)
   face edge brown lin(.068,.046,.036) vs cowhide brown lin(.088,.049,.036): hide needs no tint.
   cowhide_basecolor: white strip u .0-.25 (full height), white patch u .78-1 v .67-.96, white belly u .86-1 v 0-.35,
   mud streaks u .45-.75 v .1-.5 */
const F = {
  eyeR: [0.219, 0.643], eyeL: [0.781, 0.642], lidW: 0.10, lidH: 0.085,
  muzzle: [0.27, 0.09, 0.73, 0.345], chinV: 0.09,
};
const SEG = [0.36, 0.33, 0.30, 0.28, 0.26, 0.24], SEGL = 0.34, SLIDE = 0.30;
const GRAZE_PITCH = 0.55, EXT_PITCH = -1.25, HORIZ_PITCH = -0.12, GRAZE_E0 = 0.45;
const GRAZE = 0, RISE = 1, HOLD = 2, MOO = 3, RETRACT = 4, PANIC = 5;
const tracking0 = (m, alive) => alive && (m === RISE || m === HOLD || m === MOO);

const GEO = {};
const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
/* regroup a box geometry's six face groups by material pattern: faces sharing a material become one draw call */
function regroup(g, pat, n) {
  const gk = g.uuid + '#' + pat.join('');
  if (GEO[gk]) return GEO[gk];
  const ng = new THREE.BufferGeometry(), src = g.index.array, idx = [];
  for (const a in g.attributes) ng.setAttribute(a, g.attributes[a]);
  for (let m = 0; m < n; m++) {
    const st = idx.length;
    for (const gr of g.groups) if (pat[gr.materialIndex] === m) for (let k = 0; k < gr.count; k++) idx.push(src[gr.start + k]);
    ng.addGroup(st, idx.length - st, m);
  }
  ng.setIndex(idx);
  return GEO[gk] = ng;
}
function meshFor(g, mats) {
  if (mats instanceof THREE.Material) return new THREE.Mesh(g, mats);
  const per = FACES.map(k => mats[k] || mats.all), uniq = [];
  const pat = per.map(m => { let i = uniq.indexOf(m); if (i < 0) { i = uniq.length; uniq.push(m); } return i; });
  if (uniq.length === 1) return new THREE.Mesh(g, uniq[0]);
  return new THREE.Mesh(regroup(g, pat, uniq.length), uniq);
}
function box(w, h, d, mats, uv, shadow) {
  const key = w + ',' + h + ',' + d + '|' + (uv ? JSON.stringify(uv) : '');
  let g = GEO[key];
  if (!g) { g = HR.box(w, h, d, HR.flat(0x888888), uv).geometry; GEO[key] = g; }
  const m = meshFor(g, mats);
  m.castShadow = shadow !== undefined ? shadow : Math.max(w, h, d) > 0.1;
  m.receiveShadow = true;
  return m;
}
/* leaf-shaped ear, 0.14 long (x, outward from its root at x 0) x 0.08 x 0.05: top and bottom edges cup forward and it
   tapers to a rounded tip, so it is never a flat plank edge-on. UVs: every face takes the same crop (hide / skin). */
function earGeo(crop) {
  const key = 'ear|' + crop.join(',');
  if (GEO[key]) return GEO[key];
  const L = 0.14, H = 0.08, g = new THREE.BoxGeometry(L, H, 0.05, 5, 4, 1);
  g.translate(L / 2, 0, 0);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i) / L, ey = p.getY(i) / (H / 2);
    const taper = 1 - 0.55 * t * t;
    p.setY(i, p.getY(i) * taper * (t < 0.12 ? 0.75 + 2.1 * t : 1));
    p.setZ(i, p.getZ(i) * (1 - 0.5 * t) + 0.022 * ey * ey * (0.4 + t));
    uv.setXY(i, crop[0] + uv.getX(i) * (crop[2] - crop[0]), crop[1] + uv.getY(i) * (crop[3] - crop[1]));
  }
  g.computeVertexNormals();
  return GEO[key] = g;
}
function tile(w, h, d, ou, ov, D) {
  D = D || 2.4;
  return {
    px: [ou, ov, ou + d * D, ov + h * D], nx: [ou + 0.37, ov + 0.21, ou + 0.37 + d * D, ov + 0.21 + h * D],
    py: [ou + 0.13, ov + 0.55, ou + 0.13 + w * D, ov + 0.55 + d * D], ny: [ou + 0.71, ov + 0.3, ou + 0.71 + w * D, ov + 0.3 + d * D],
    pz: [ou + 0.5, ov + 0.66, ou + 0.5 + w * D, ov + 0.66 + h * D], nz: [ou + 0.24, ov + 0.83, ou + 0.24 + w * D, ov + 0.83 + h * D],
  };
}
/* hide crop helper: same rectangle on every face unless overridden */
function hideUV(c, over) { const o = { px: c, nx: c, py: c, ny: c, pz: c, nz: c }; if (over) for (const k in over) o[k] = over[k]; return o; }
function rng(seed) {
  let a = ((seed + 7) * 2654435761) >>> 0;
  return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = HR.clamp;
/* same value noise as HR.noise, minus its per-call closure (keeps update() allocation-free) */
function hash1(n, s) { const x = Math.sin((n + s) * 127.1) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }
function noise(t, seed) { const i = Math.floor(t), f = t - i, s = (seed || 0) * 13.37, u = f * f * (3 - 2 * f); return hash1(i, s) * (1 - u) + hash1(i + 1, s) * u; }
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const easeOut = x => { x = clamp(x, 0, 1); return 1 - (1 - x) * (1 - x) * (1 - x); };
function pend(p, dt, k, c, target, drive, lo, hi) {
  const n = dt > 1 / 30 ? Math.min(8, Math.ceil(dt * 60)) : 1, h = dt / n;
  for (let i = 0; i < n; i++) {
    p.v += (-k * (p.a - target) - c * p.v + drive) * h;
    p.v = clamp(p.v, -40, 40);
    p.a += p.v * h;
    if (p.a < lo) { p.a = lo; if (p.v < 0) p.v *= -0.3; }
    if (p.a > hi) { p.a = hi; if (p.v > 0) p.v *= -0.3; }
  }
  return p.a;
}

/* ---- texture self-heal (the preview server drops the odd request) ----
   rig.js nulls a failed slot on its cached base material only; per-instance clones keep the dead texture and render it
   black (map), wrongly lit (normalMap) or mirror-shiny (roughnessMap). Each model keeps its own [base, clone, ...] list
   and for its first 40 s calls heal(list) every 2 s: a dead texture is reloaded once and every clone holding it is
   patched (or the slot is dropped if the retry fails too). Allocates only when a load has actually failed. */
const SLOT = ['map', 'normalMap', 'roughnessMap'], SUF = ['_basecolor.png', '_normal.png', '_roughness.png'];
const RETRY = new Map();
function hmat(id, opts) { const m = HR.mat(id, opts); m.userData.hrId = id; return m; }
function heal(list) {
  if (HR.EMBEDDED) return;   /* embedded data URIs cannot drop, and take no ?retry= suffix */
  for (let i = 0; i < list.length; i += 2) {
    const base = list[i], m = list[i + 1];
    for (let k = 0; k < 3; k++) {
      const tex = m[SLOT[k]];
      if (!tex || tex.image !== undefined) continue;          // healthy, or no such slot
      const r = RETRY.get(tex);
      if (r === undefined) {
        if (base[SLOT[k]] !== null) continue;                 // still loading, not failed
        RETRY.set(tex, null);
        const slot = SLOT[k];
        const nt = new THREE.TextureLoader().load(HR.retryURL(HR.texURL(base.userData.hrId, SUF[k])),
          () => { RETRY.set(tex, nt); base[slot] = nt; base.needsUpdate = true; }, undefined, () => RETRY.set(tex, false));
        nt.encoding = tex.encoding; nt.anisotropy = tex.anisotropy; nt.wrapS = tex.wrapS; nt.wrapT = tex.wrapT; nt.repeat.copy(tex.repeat);
      } else if (r !== null) { m[SLOT[k]] = r || null; m.needsUpdate = true; }
    }
  }
}

HR.MODELS.cow = function () {
  const root = new THREE.Group(); root.name = 'hr_cow';
  const mats = [], HL = [];
  function inst(base, color, rough) {
    const m = base.clone(); if (base.userData.hrId) HL.push(base, m); m.color.setHex(color); m.roughness = rough; m.metalness = 0;
    m.emissive.setHex(0); m.emissiveIntensity = 1; mats.push(m); return m;
  }
  const B = {
    face: hmat('face_cow', { roughMap: false, normalScale: 0.6 }),
    hide: hmat('cowhide', { roughMap: false, normalScale: 0.8 }),
    skin: hmat('mat_skin', { repeat: [1, 1] }),
    bone: hmat('mat_bone', { repeat: [1, 1] }),
    wool: hmat('mat_wool', { repeat: [1, 1], roughMap: false }),
  };
  /* roughness: mat_bone's map averages .125 and mat_skin's .35, so factor = target / average (three clamps the product):
     horns/hooves/knuckles 4.8 -> .6, belly 1.6 / inner ear 1.55 -> ~.55, udder 1.0 -> .35, seam caps .45 -> ~.16 (wet) */
  const M = {
    face: inst(B.face, 0xffffff, 0.6),
    faceTop: inst(B.face, 0xb0b0b0, 0.6),   /* muzzle top: faces the sky, so the white blaze crop is held down to ~.7 */
    faceRim: inst(B.face, 0xc8c0bc, 0.55),  /* muzzle / chin side strips */
    hide: inst(B.hide, 0xffffff, 0.78),
    belly: inst(B.skin, 0xb09088, 1.6),
    udder: inst(B.skin, 0xd8a098, 1.0),
    hoof: inst(B.bone, 0x2a2420, 4.8),
    knuckle: inst(B.bone, 0xe0d0b8, 4.8),
    horn: inst(B.bone, 0xd8d0c0, 4.8),
    innerEar: inst(B.skin, 0xa88070, 1.55),
    tuft: inst(B.wool, 0x3a2a20, 0.9),
    seam: inst(B.skin, 0xa04040, 0.45),
    mouth: inst(B.skin, 0x1a0404, 0.55),
  };
  for (const k of ['belly', 'udder', 'innerEar', 'seam', 'mouth']) M[k].normalScale.set(0.5, 0.5);   /* skin normals read as crumpled paper at 1.2 */
  const droolBase = HR.flat(0xcfe0d8, { rough: 0.05, transparent: true, opacity: 0.55 });
  M.drool = droolBase.clone(); M.drool.depthWrite = false; mats.push(M.drool);

  /* ---------- rig ---------- */
  const rollG = HR.joint(root, 0.40, 0, 0);            /* death fall pivot: left-side ground edge */
  const baseG = HR.joint(rollG, -0.40, 0, 0);
  const bodyG = HR.joint(baseG, 0, 0.925, 0);           /* body centre */
  /* body 0.80 x 0.75 x 1.20: hide on the sides/top/ends (different crops so the flanks differ), skin belly */
  HR.at(bodyG, box(0.80, 0.75, 1.20, { all: M.hide, ny: M.belly }, {
    px: [0.0, 0.08, 1.0, 0.705], nx: [0.0, 0.30, 1.0, 0.925], py: [0.30, 0.35, 0.80, 1.0],
    pz: [0.55, 0.40, 0.85, 0.68], nz: [0.02, 0.30, 0.50, 0.75], ny: tile(0.8, 0.75, 1.2, 0.2, 0.3).ny,
  }), 0, 0, 0);
  HR.at(bodyG, box(0.28, 0.14, 0.30, M.udder, tile(0.28, 0.14, 0.3, 0.3, 0.2)), 0, -0.425, -0.30);

  /* legs FL, FR, HL, HR; two white-socked, two brown */
  const legs = [];
  const LEGC = [[0.06, 0.05, 0.18, 0.32], [0.40, 0.05, 0.52, 0.32], [0.55, 0.12, 0.67, 0.39], [0.09, 0.10, 0.21, 0.37]];
  [[0.26, 0.40], [-0.26, 0.40], [0.26, -0.40], [-0.26, -0.40]].forEach((p, i) => {
    const j = HR.joint(bodyG, p[0], -0.375, p[1]);
    HR.at(j, box(0.22, 0.49, 0.22, M.hide, hideUV(LEGC[i])), 0, -0.245, 0);
    HR.at(j, box(0.23, 0.06, 0.23, M.hoof, tile(0.23, 0.06, 0.23, 0.2 * i, 0.1)), 0, -0.52, 0);
    legs.push(j);
  });

  /* tail on a rump pivot + dark wool tuft */
  const tail = HR.joint(bodyG, 0, 0.30, -0.60);
  HR.at(tail, box(0.06, 0.60, 0.06, M.hide, hideUV([0.45, 0.30, 0.50, 0.80])), 0, -0.30, -0.035);
  HR.at(tail, box(0.10, 0.14, 0.10, M.tuft, tile(0.1, 0.14, 0.1, 0.2, 0.2)), 0, -0.63, -0.035);

  /* NECK: sway joint at the shoulder (0,1.15,0.55) -> pitch/yaw joint -> 6 nested telescoping segments along local +z */
  const sway = HR.joint(bodyG, 0, 0.225, 0.55);
  const shoulder = HR.joint(sway, 0, 0, 0); shoulder.rotation.order = 'YXZ';
  const segG = [], segM = [], knG = [];
  const SEGC = [[0.30, 0.45, 0.62, 0.80], [0.05, 0.40, 0.33, 0.75], [0.55, 0.55, 0.83, 0.90], [0.36, 0.20, 0.64, 0.55], [0.78, 0.62, 1.0, 0.95], [0.40, 0.50, 0.68, 0.85]];
  let parent = shoulder;
  for (let i = 0; i < 6; i++) {
    const s = SEG[i], g = HR.joint(parent, 0, 0, 0);
    const c = SEGC[i];
    const m = HR.at(g, box(s, s, SEGL, { all: M.hide, pz: M.seam, nz: M.seam }, hideUV(c)), 0, 0, SEGL / 2);
    /* vertebra knuckle on top near the front end; scale.y grows as the segment stretches out */
    const kg = HR.joint(g, 0, s / 2 - 0.006, SEGL - 0.07);
    HR.at(kg, box(0.10, 0.06, 0.12, M.knuckle, tile(0.1, 0.06, 0.12, 0.1 * i, 0.3), false), 0, 0.03, 0);
    segG.push(g); segM.push(m); knG.push(kg);
    parent = g;
  }
  /* head: yaw joint (cancels neck pitch so the head stays level) -> pitch joint -> head centre */
  const headYaw = HR.joint(segG[5], 0, 0, SEGL);
  const headPitch = HR.joint(headYaw, 0, 0, 0);
  const headC = HR.joint(headPitch, 0, 0.10, 0.12);
  const HW = 0.55, HH = 0.55, HD = 0.50;
  HR.at(headC, box(HW, HH, HD, { all: M.hide, pz: M.face }, {
    pz: [0, 0, 1, 1], px: [0.35, 0.45, 0.62, 0.75], nx: [0.62, 0.42, 0.89, 0.72], py: [0.76, 0.68, 1.0, 0.92],
    ny: [0.40, 0.55, 0.65, 0.80], nz: [0.30, 0.60, 0.55, 0.85],
  }), 0, 0, 0);
  /* muzzle: crop of the face's own white muzzle + pink nose, proud of the face */
  const mz = F.muzzle, mzW = (mz[2] - mz[0]) * HW, mzH = (mz[3] - mz[1]) * HH, mzY = ((mz[1] + mz[3]) / 2 - 0.5) * HH;
  HR.at(headC, box(mzW, mzH, 0.10, { all: M.faceRim, pz: M.face, py: M.faceTop }, { pz: mz, px: [0.715, 0.12, 0.73, 0.33], nx: [0.27, 0.12, 0.285, 0.33],
    py: [0.30, 0.345, 0.70, 0.37], ny: [0.45, 0.2, 0.55, 0.25], nz: [0.45, 0.2, 0.55, 0.25] }, false), 0, mzY, HD / 2 + 0.05);
  /* chin (lower lip + drool) hinged at its rear-top, 0.06 inside the head */
  const chH = F.chinV * HH;
  const chin = HR.joint(headC, 0, -HH / 2 + chH, HD / 2 - 0.06);
  HR.at(chin, box(mzW, chH, 0.16, { all: M.faceRim, pz: M.face, py: M.mouth }, { pz: [mz[0], 0, mz[2], F.chinV], px: [0.715, 0.01, 0.73, 0.08],
    nx: [0.27, 0.01, 0.285, 0.08], ny: [0.35, 0.0, 0.65, 0.02], nz: [0.45, 0.02, 0.55, 0.06] }, false), 0, -chH / 2, 0.08);
  /* a real string of drool continuing the painted one: two segments, the lower one lagging on its own pendulum so the
     string sags and whips like liquid; hangs plumb overall and stretches as the head rises. Unit-length boxes scaled
     per frame (scale on the meshes only, so the lower joint is never sheared) */
  const droolJ = HR.joint(chin, 0.002, -chH, 0.158);
  const droolM = HR.at(droolJ, box(0.008, 1, 0.008, M.drool, null, false), 0, -0.5, 0);
  droolM.renderOrder = 2; droolM.receiveShadow = false;
  const droolJ2 = HR.joint(droolJ, 0, -0.5, 0);
  const droolM2 = HR.at(droolJ2, box(0.006, 1, 0.006, M.drool, null, false), 0, -0.5, 0);
  droolM2.renderOrder = 2; droolM2.receiveShadow = false;
  /* blink plates (upper-lid hair cropped from just above each eye), pivot at the top edge */
  function lidPlate(e) {
    const w = F.lidW * HW, h = F.lidH * HH;
    const j = HR.joint(headC, (e[0] - 0.5) * HW, (e[1] - 0.5) * HH + h / 2, HD / 2 + 0.006);
    HR.at(j, box(w, h, 0.004, M.face, { pz: [e[0] - F.lidW / 2, e[1] + F.lidH / 2, e[0] + F.lidW / 2, e[1] + F.lidH * 1.5],
      px: [0, 0, 0.01, 0.01], nx: [0, 0, 0.01, 0.01], py: [0, 0, 0.01, 0.01], ny: [0, 0, 0.01, 0.01], nz: [0, 0, 0.01, 0.01] }, false), 0, -h / 2, 0);
    j.scale.y = 0.001; j.visible = false; return j;
  }
  const lidR = lidPlate(F.eyeR), lidL = lidPlate(F.eyeL);
  /* horns up and out from the top corners; ears sideways */
  function horn(side) {
    const j = HR.joint(headC, side * 0.215, HH / 2 - 0.02, 0.16);
    j.rotation.set(0.25, 0, -side * 0.6);
    HR.at(j, box(0.07, 0.18, 0.07, M.horn, tile(0.07, 0.18, 0.07, 0.3 * side + 0.4, 0.2)), 0, 0.09, 0);
    return j;
  }
  horn(1); horn(-1);
  function ear(side) {
    const j = HR.joint(headC, side * (HW / 2 - 0.01), 0.12, 0.02);
    const m = HR.at(j, meshFor(earGeo([0.40, 0.60, 0.50, 0.66]), { all: M.hide, pz: M.innerEar }), 0, 0, 0);
    if (side < 0) m.scale.x = -1;   /* mirrored for the right ear: still cups forward */
    m.castShadow = false; m.receiveShadow = true;
    return j;
  }
  const earL = ear(1), earR = ear(-1);

  /* ---------- animation state (preallocated) ---------- */
  const api = { onSfx: null };
  const e = new Float32Array(6), eRise = new Uint8Array(6);
  const st = {
    healT: 0, healNext: 1.5,
    init: false, R: null, mode: GRAZE, mt: 0, notice: 0, cd: 0, blend: 0, horiz: 0, horizT: 0,
    walkPh: 0, chewPh: 0, panic: 0, yawH: 0, pitchH: 0.85, tilt: 0, moo: 0, prevHurt: 0, prevSpeed: 0,
    swX: { a: 0, v: 0 }, swZ: { a: 0, v: 0 }, tl: { a: 0, v: 0 }, tlX: { a: 0, v: 0 }, dr: { a: 0, v: 0 }, drZ: { a: 0, v: 0 }, dr2: { a: 0, v: 0 }, dr2Z: { a: 0, v: 0 },
    eL: { a: 0, v: 0 }, eR: { a: 0, v: 0 }, blinkT: -1, blinkNext: 2.5, tailNext: 2, earNext: 1.5,
    impact: 0, wasDead: false, headY: 1.2, up: 0, upOn: false, upNext: 5, lean: 0,
  };
  function resetNeck() { for (let i = 0; i < 6; i++) { e[i] = i === 0 ? GRAZE_E0 : 0; eRise[i] = 0; } st.blend = 0; st.mode = GRAZE; st.mt = 0; st.notice = 0; st.horiz = 0; }
  resetNeck();
  function sfx(n, i) { if (api.onSfx) api.onSfx(n, i); }

  function update(dt, t, s) {
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.1);
    st.healT += dt; if (st.healT >= st.healNext && st.healNext < 40) { st.healNext += 2; heal(HL); }
    if (!st.init) { st.init = true; st.R = rng(s.seed || 1); st.tailNext = 1 + st.R() * 3; }
    const R = st.R, seed = s.seed || 1;
    const dead = s.dead || 0, alive = dead <= 0;
    if (alive && st.wasDead) { resetNeck(); st.cd = 0; st.panic = 0; st.impact = 0; }
    st.wasDead = !alive;
    const speed = alive ? clamp(s.speed || 0, 0, 1) : 0;
    const hurt = s.hurt || 0;
    const near = s.near !== undefined ? s.near : 99;
    const allowed = s.periscope !== false;
    st.cd = Math.max(0, st.cd - dt);

    /* ---------- periscope state machine ---------- */
    if (alive) {
      if (hurt > st.prevHurt + 0.2) { st.mode = PANIC; st.mt = 0; st.panic = 1; st.horiz = 0; }
      st.mt += dt;
      switch (st.mode) {
        case GRAZE:
          if (near < 6 && allowed && st.cd <= 0) { st.notice += dt; if (st.notice > 0.9) { st.mode = RISE; st.mt = 0; st.horizT = (s.headroom !== undefined && s.headroom < 3) ? 1 : 0; for (let i = 0; i < 6; i++) eRise[i] = 0; } }
          else st.notice = 0;
          break;
        case RISE:
          for (let i = 0; i < 6; i++) {
            const f = easeOut((st.mt - 0.2 * i) / 0.25);
            if (f > e[i]) e[i] = f;
            if (!eRise[i] && e[i] > 0.97) { eRise[i] = 1; st.swX.v -= 1.6 + 0.3 * i; st.swZ.v += (i % 2 ? 1 : -1) * 0.8; sfx('crackle', i); }
          }
          st.blend = Math.max(st.blend, smooth(st.mt / 1.6));
          if (st.mt >= 1.6) { st.mode = HOLD; st.mt = 0; }
          break;
        case HOLD:
          if (st.mt > 4 || near > 7.5 || !allowed) { st.mode = MOO; st.mt = 0; sfx('moo', 0); }
          break;
        case MOO:
          if (st.mt > 1.4) { st.mode = RETRACT; st.mt = 0; }
          break;
        case RETRACT:
          for (let i = 0; i < 6; i++) {
            const f = 1 - smooth((st.mt - 0.2 * (5 - i)) / 0.25);
            const lo = i === 0 ? Math.max(GRAZE_E0, f) : f;
            if (lo < e[i]) e[i] = lo;
          }
          st.blend = Math.min(st.blend, 1 - smooth((st.mt - 0.1) / 1.5));
          if (st.mt >= 1.6) { st.mode = GRAZE; st.mt = 0; st.cd = 20; st.notice = 0; }
          break;
        case PANIC:
          for (let i = 0; i < 6; i++) e[i] = Math.min(1, e[i] + dt * 5);
          st.blend = Math.min(1, st.blend + dt * 5);
          if (st.mt > 3.5) { st.mode = RETRACT; st.mt = 0; }
          break;
      }
      st.horiz += ((st.mode === PANIC ? 0 : st.horizT) - st.horiz) * Math.min(1, dt * 3);
    } else {
      /* death: one last full extension, then fall */
      for (let i = 0; i < 6; i++) e[i] = Math.min(1, e[i] + dt * 6);
      st.blend = Math.min(1, st.blend + dt * 6);
      st.horiz *= Math.max(0, 1 - dt * 6);
    }
    st.prevHurt = hurt;
    st.panic = Math.max(0, st.panic - dt / 3.5);
    if (!alive) st.panic = 0;
    const ext = st.blend;   /* 0 grazing .. 1 periscope */
    /* grazing rhythm: head down 4-8 s, then up chewing cud and staring at nothing for 2-4 s */
    st.upNext -= dt;
    if (st.upNext <= 0) { st.upOn = !st.upOn; st.upNext = st.upOn ? 2 + R() * 2 : 4 + R() * 4; }
    st.up += (((alive && st.mode === GRAZE && st.upOn) ? 1 : 0) - st.up) * Math.min(1, dt * 2.5);
    const up = smooth(st.up);

    /* ---------- legs: walk, or emu bolt (bound gait, high and fast) ---------- */
    const p = st.panic > 0 ? smooth(st.panic * 1.6) : 0;
    const gait = Math.max(speed, 0.85 * p);
    st.walkPh += dt * (6.5 + 7 * p) * Math.min(1, 0.25 + gait);
    const amp = 0.5 * speed * (1 - p) + 0.9 * gait * p;
    for (let i = 0; i < 4; i++) {
      const walkSide = (i === 0 || i === 3) ? 1 : -1, boundSide = i < 2 ? 1 : -1;
      legs[i].rotation.x = alive ? Math.sin(st.walkPh) * amp * (walkSide * (1 - p) + boundSide * p) : (i < 2 ? 0.12 : -0.1);
      legs[i].rotation.z = alive ? 0 : (i % 2 ? -0.08 : 0.08);
    }
    bodyG.position.y = 0.925 + (alive ? (0.012 * speed * (1 - p) + 0.05 * p) * Math.abs(Math.sin(st.walkPh)) : 0);
    bodyG.rotation.x = alive ? -0.07 * p + 0.04 * p * Math.sin(st.walkPh * 2) : 0;

    /* ---------- neck: slide segments, pitch, sway, spring lag ---------- */
    let az = (speed - st.prevSpeed) / dt * 2.0; st.prevSpeed = speed;
    if (s.accel) az += s.accel.z * 0.15;
    az = clamp(az, -25, 25);
    const swDrive = -az * ext * 0.8 - (alive ? 1.6 * p * Math.cos(st.walkPh * 2) : 0) + ext * 0.6 * noise(t * 0.6, seed + 2);
    pend(st.swX, dt, 9, 2.2, 0, swDrive, -0.45, 0.45);
    pend(st.swZ, dt, 9, 2.2, 0, ext * 0.7 * noise(t * 0.45, seed + 5), -0.35, 0.35);
    sway.rotation.x = st.swX.a * (0.25 + ext) + 0.05 * ext * noise(t * 0.8, seed);
    sway.rotation.z = st.swZ.a * ext + 0.05 * ext * noise(t * 0.55, seed + 1);
    const extPitch = EXT_PITCH + (HORIZ_PITCH - EXT_PITCH) * st.horiz;
    const neckPitch = (GRAZE_PITCH - 0.4 * up) + (extPitch - GRAZE_PITCH + 0.4 * up) * ext;
    shoulder.rotation.x = neckPitch;
    const ty = clamp(s.yaw || 0, -1.0, 1.0);
    /* the raised neck leans toward its target (looming); horizontal mode aims straight at it */
    const leanT = clamp(ty, -0.9, 0.9) * (0.6 + 0.4 * st.horiz) * (tracking0(st.mode, alive) ? 1 : alive ? 0.3 : 0);
    st.lean += (leanT - st.lean) * Math.min(1, dt * 2);
    shoulder.rotation.y = ext * st.lean;
    let flexSum = 0, len = 0;
    for (let i = 0; i < 6; i++) {
      const ei = e[i];
      let slide;
      if (i === 0) slide = -0.26 + 0.26 * ei;
      else slide = -0.012 + (SLIDE + 0.012) * ei;
      if (!alive && st.impact > 0 && i >= 2) slide -= 0.06 * st.impact * (i - 1) / 4;   /* antenna-collapse on landing */
      segG[i].position.z = slide;
      const flex = ext * 0.022 * noise(t * 0.9 + i * 1.7, seed + i);
      segG[i].rotation.x = flex; flexSum += flex;
      if (i > 0) segM[i].visible = ei > 0.02;
      const kn = smooth((ei - 0.5) / 0.5);
      knG[i].scale.y = Math.max(0.001, kn); knG[i].visible = kn > 0.01 && (i === 0 || ei > 0.02);
      len += (i === 0 ? slide + SEGL : slide);
    }
    st.headY = 1.15 + len * Math.sin(-neckPitch);

    /* ---------- head: level it, then look ---------- */
    let wantYaw, wantPitch;
    const tracking = alive && (st.mode === RISE || st.mode === HOLD || st.mode === MOO);
    if (!alive) { wantYaw = 0; wantPitch = st.impact > 0 ? 0.55 : -0.35; }
    else if (st.mode === PANIC) { wantYaw = 0; wantPitch = -0.2; }
    else if (tracking) {
      wantYaw = ty;
      wantPitch = clamp((s.pitch || 0) + Math.atan2(st.headY - 1.6, Math.max(1, near)), -0.4, 0.9) * smooth(ext * 1.5) + 0.85 * (1 - smooth(ext * 1.5));
    } else { wantYaw = (0.25 + 0.3 * up) * noise(t * 0.15, seed + 3); wantPitch = 0.8 - 0.65 * up + 0.04 * Math.sin(t * 1.3) + 0.03 * Math.sin(st.chewPh); }
    const lag = Math.min(1, dt * (tracking ? 2.4 : 3.5));
    st.yawH += (wantYaw - st.yawH) * lag;
    st.pitchH += (wantPitch - st.pitchH) * lag;
    st.tilt += (((st.mode === HOLD && st.mt > 1.2) ? 0.32 * Math.sin(seed * 1.7 + 0.6) : 0) - st.tilt) * Math.min(1, dt * 0.9);
    headYaw.rotation.x = -(neckPitch + sway.rotation.x + flexSum);
    headYaw.rotation.y = st.yawH - shoulder.rotation.y;
    /* moo: chin wide, head lifts; emu head-bob while bolting */
    const mooT = st.mode === MOO ? st.mt : -1;
    st.moo = mooT >= 0 ? (mooT < 0.25 ? smooth(mooT / 0.25) : mooT < 1.05 ? 1 : 1 - smooth((mooT - 1.05) / 0.3)) : 0;
    headPitch.rotation.x = st.pitchH - 0.28 * st.moo;
    headPitch.rotation.z = st.tilt + (st.moo > 0.5 ? 0.02 * Math.sin(t * 30) : 0);
    headC.position.z = 0.12 + (alive ? 0.06 * p * ((st.walkPh * 0.9) % 1) : 0);

    /* chewing while grazing (chin + head bob), wide on the moo, slack in death */
    st.chewPh += dt * Math.PI * 2 * 1.2;
    const chew = (alive && !tracking && st.mode !== PANIC) ? 0.06 * (0.5 - 0.5 * Math.cos(st.chewPh)) : 0;
    chin.rotation.x = Math.max(chew, 0.5 * st.moo, alive ? 0.25 * p : (st.impact > 0 ? 0.3 : 0.45 * smooth(dead / 0.15)), 0.18 * hurt);
    chin.rotation.y = alive ? 0.5 * chew * Math.sin(st.chewPh * 0.5) : 0;

    /* ---------- drool: plumb pendulum, stretches with height ---------- */
    const headWorldPitch = st.pitchH - 0.28 * st.moo + chin.rotation.x;
    pend(st.dr, dt, 10, 1.6, 0, -0.35 * az + 1.2 * p * Math.sin(st.walkPh * 2) - 1.2 * st.swX.v * ext + 0.5 * speed * Math.sin(st.walkPh * 2), -0.6, 0.6);
    pend(st.drZ, dt, 10, 1.6, 0, -1.0 * st.swZ.v * ext + 0.4 * noise(t * 1.3, seed + 8), -0.5, 0.5);
    /* lower segment: driven by the upper one's swing so it trails behind it (the sag), with its own limits */
    const v1 = st.dr.v, v1z = st.drZ.v;
    pend(st.dr2, dt, 16, 1.4, 0, -1.6 * v1 * 3, -0.7, 0.7);
    pend(st.dr2Z, dt, 16, 1.4, 0, -1.6 * v1z * 3, -0.6, 0.6);
    droolJ.rotation.set(-headWorldPitch + st.dr.a, 0, -st.tilt + st.drZ.a);
    const dl = alive ? 0.10 + 0.95 * ext + 0.04 * Math.sin(t * 2.3 + seed) * ext : Math.max(0.05, 1.05 * (1 - smooth((dead - 0.15) / 0.3)));
    const l1 = dl * 0.55, l2 = dl * 0.45;
    droolM.scale.y = l1; droolM.position.y = -l1 / 2;
    droolJ2.position.y = -l1; droolJ2.rotation.set(st.dr2.a, 0, st.dr2Z.a);
    droolM2.scale.y = l2; droolM2.position.y = -l2 / 2;

    /* ---------- blinks: slow and heavy; none while mooing; half-closed in death ---------- */
    st.blinkNext -= dt;
    if (st.blinkNext <= 0 && st.blinkT < 0 && st.moo < 0.1) { st.blinkT = 0; st.blinkNext = (st.mode === HOLD ? 5.5 : 3) + R() * 3.5; }
    let lid = 0;
    if (st.blinkT >= 0) {
      const b = st.blinkT; st.blinkT += dt;
      lid = b < 0.15 ? smooth(b / 0.15) : b < 0.27 ? 1 : b < 0.55 ? 1 - smooth((b - 0.27) / 0.28) : 0;
      if (b >= 0.55) st.blinkT = -1;
    }
    if (!alive) lid = Math.max(lid * (1 - dead), st.impact > 0 ? 0.5 : 0);
    lidL.scale.y = lidR.scale.y = Math.max(0.001, lid);
    lidL.visible = lidR.visible = lid > 0.02;

    /* ---------- ears + tail ---------- */
    st.earNext -= dt;
    if (st.earNext <= 0 && alive) { if (R() < 0.5) st.eL.v += 10; else st.eR.v -= 10; st.earNext = 2 + R() * 4; }
    pend(st.eL, dt, 40, 5, -0.25 * p, 3 * ext * noise(t * 2, seed + 11), -0.8, 0.8);
    pend(st.eR, dt, 40, 5, 0.25 * p, 3 * ext * noise(t * 2, seed + 12), -0.8, 0.8);
    earL.rotation.set(0.1 + st.eL.a * 0.4, 0, -0.55 + st.eL.a);   /* droop ~.55 rad below level */
    earR.rotation.set(0.1 - st.eR.a * 0.4, 0, 0.55 + st.eR.a);
    st.tailNext -= dt;
    if (st.tailNext <= 0 && alive) { st.tl.v += (R() < 0.5 ? -1 : 1) * (6 + R() * 4); st.tailNext = 3 + R() * 3; }
    pend(st.tl, dt, 15, 2, 0, alive ? 4 * speed * Math.sin(st.walkPh) + 9 * p * Math.sin(st.walkPh * 2) : 0, -1.0, 1.0);
    pend(st.tlX, dt, 15, 2, alive ? -0.5 * p : 0, -az * 0.8, -0.9, 0.5);
    tail.rotation.set(0.08 + st.tlX.a, 0, st.tl.a);

    /* ---------- death fall: rigid "felled tree" onto its left side, bounce, neck collapses a little ---------- */
    if (!alive) {
      const u = clamp((dead - 0.2) / 0.42, 0, 1);
      let roll = u * u;
      if (dead > 0.62) {
        const k = (dead - 0.62) * 9;
        roll = 1 + 0.06 * Math.exp(-k * 1.4) * Math.sin(k * 3.2);
        st.impact = Math.min(1, st.impact + dt * 8);
      }
      rollG.rotation.z = -roll * Math.PI / 2;
    } else rollG.rotation.z = 0;
    /* on landing the neck slumps onto the ground (cow-local +x is down once it lies on its left side) */
    sway.position.x = 0.20 * st.impact;
    headC.position.x = -0.12 * st.impact;
  }

  api.root = root; api.update = update; api.mats = mats; api.deathDur = 3;
  api.handles = { head: headPitch, headYaw, neck: shoulder, segments: segG, chin, body: bodyG, legs, aL: legs[0], aR: legs[1], lL: legs[2], lR: legs[3], tail };
  return api;
};
})();

