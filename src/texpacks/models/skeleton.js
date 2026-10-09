/* SKELETON — "Rib Archer" (Hyperreal pack, DESIGN_BIBLE §7).
   It fires its own ribs. Each shot the right hand reaches across, snaps the lowest remaining rib off its
   own chest, nocks it on a bow made of a human femur and draws a string that is a tendon running out of
   its own forearm. After every shot the remaining ribs heave in a long, slow, very human exhale, and the
   more it shoots the harder it pants. When the ribs are gone it pulls vertebrae from the neck down and its
   skull sinks 0.105 per shot until its head sits down between its shoulders. Out of combat it regrows one
   bone every 3 s. Far too many teeth; a thin gold wedding ring on the bow hand.
   Preview keys: A = one shot (press repeatedly: 4 shots = half a ribcage and panting, 9+ = the skull sinks;
   presses queue), H = rattle, K = collapse into a pile (skull last), W = walk. Regrowth starts 4 s after
   the last shot. Game path: the draw starts when cd crosses DRAW_CD with the target in range and releases
   on s.fired (the arrow-spawn event); a `fired` with no draw in progress plays the whole shot. */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS) return;
const clamp = HR.clamp;
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const TAU = Math.PI * 2;

/* ---- measured from final_ent/skull_front_basecolor.png (1024²; u = x/1024, v = 1 - y/1024) ----
   eye sockets (luma < 25): x 105-400 / 625-915, y 130-420 -> centres u .247 / .752, v .73
   nasal cavity x 415-610, y 400-590 -> u .41-.60, v .42-.61
   upper teeth y 620-840, lower teeth y 840-950; occlusal (lip) line y 840 -> SPLIT v .18
     (centre-column luma dips to 66 at y 840)
   pure black background beside the jaw: x < 96 and x > 928 for y > 580 -> jaw crop u .10-.90; inside the skull box
     (v > .19) it is only a wedge at each lower corner (left: x < 62-96 below y 690; right: x > 940 below y 740),
     filled on a canvas copy by stretching the ramus bone just inside it (x 96-130 / 894-928) outward
   the photo is dark (mean sRGB 81): front tint x(1.75,1.6,1.38) linear; brightened edges L/R ~(160,128,92),
     top band ~(226,190,153). Sides/back #9a7c68, top #d0b0b0 on mat_bone: toward the brightened edges (the old cream
     #b8a284 read as a printed carton) but not all the way, or the shaded side goes black and the head is a dark box again
   colour: skull top band (169,146,119) vs mat_bone mean (244,225,174) -> skull sides tinted #c8b496
   Box heights follow the split so texel density matches: skull 0.38 (v .18-1, 2210 px/blk vs 2133 across),
   jaw 0.10 (v 0-.18). The bible's 0.36 + 0.12 would have stretched the lower teeth 39 %. */
const SPLIT = 0.18;
const UV_SKULL = [0.03, SPLIT + 0.01, 0.97, 1];
const SKULL_TINT = [1.75, 1.6, 1.38];
const UV_JAW = [0.10, 0, 0.90, SPLIT];

/* ---- rig (bible §7, mob humanoid frame) ---- */
const HIPS_Y = 0.80, SPINE_Z = -0.06, VSTEP = 0.105, NV = 6;
const SKULL_W = 0.48, SKULL_H = 0.38, JAW_H = 0.10, NECK_UP = 0.06;
const SHOULDER_Y = 1.40, SHOULDER_X = 0.28, HUM = 0.34, FORE = 0.32, HAND_C = 0.36;
const RIB_Y = [1.04, 1.13, 1.22, 1.31];
const RIB_Z = 0.02;                         /* arc centre (world); arcs span z -0.09..+0.13, x 0..±0.20 */
const RIB_ORDER = [0, 1, 2, 3, 4, 5, 6, 7]; /* index = level*2 + (0 left/+x, 1 right/-x): lowest first, the
                                               far (left) side first so the right hand reaches across */
const NOCK_Y = 1.52;                        /* arrow spawns at e.y + 1.52 */
/* girdle-local bow-hand target: out to the left and low, so the canted femur bow's upper limb passes BESIDE the
   skull, not across it (the most-seen pose). The nock sits at ~1.42, 0.1 under the game's arrow spawn: it has to
   clear the jaw (1.445) for the draw arm to reach it without cutting through the face */
const AIM_GRIP = [0.34, 0.02, 0.5];
const BOW_CANT = 0.35;
const LIMB = 0.36, LIMB_A = 0.2, DRAW = 0.2;
const DRAW_CD = 0.9 / 1.9;                  /* game: atkT is set to 1.9 after each shot; draw at atkT <= 0.9 */
const T_YANK = 0.22, T_NOCK = 0.34, T_DRAW = 0.52, T_FULL = 0.86;
const EXHALE = 1.2, CALM = 4, REGROW = 3;
const DEATH_DUR = 2.6;

/* ---- shared geometry (cached: skeletons spawn in groups) ---- */
const GEO = {};
function cropUV(g, uv) {
  const order = ['px', 'nx', 'py', 'ny', 'pz', 'nz'], a = g.attributes.uv;
  order.forEach((f, fi) => { const c = uv[f]; if (!c) return;
    for (let i = 0; i < 4; i++) { const j = fi * 4 + i, u = a.getX(j), v = a.getY(j); a.setXY(j, c[0] + u * (c[2] - c[0]), c[1] + v * (c[3] - c[1])); } });
  a.needsUpdate = true;
  return g;
}
function boxGeo(w, h, d, uv) {
  const key = 'b' + w + ',' + h + ',' + d + '|' + (uv ? JSON.stringify(uv) : '');
  return GEO[key] || (GEO[key] = uv ? cropUV(new THREE.BoxGeometry(w, h, d), uv) : new THREE.BoxGeometry(w, h, d));
}
/* half-rib hoop: a semi-ellipse from the spine (back) round the side to the sternum (front) */
function ribGeo(side) {
  const k = 'rib' + side; if (GEO[k]) return GEO[k];
  const g = new THREE.TorusGeometry(0.11, 0.016, 5, 12, Math.PI);
  g.rotateX(Math.PI / 2); g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2); g.scale(0.20 / 0.11, 1, 1);
  return GEO[k] = g;
}
function merge(key, parts) {
  if (GEO[key]) return GEO[key];
  const P = [], N = [], U = [], I = []; let vo = 0;
  for (const g of parts) {
    const p = g.attributes.position.array, nn = g.attributes.normal.array, u = g.attributes.uv.array, ix = g.index.array;
    for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(nn[i]); }
    for (let i = 0; i < u.length; i++) U.push(u[i]);
    for (let i = 0; i < ix.length; i++) I.push(ix[i] + vo);
    vo += p.length / 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  out.setIndex(I);
  return GEO[key] = out;
}
/* same box, faces re-sorted so each material is one draw call (skeletons spawn in groups): fm = slot per face */
function regroup(key, g, fm) {
  if (GEO[key]) return GEO[key];
  const out = g.clone(), ix = g.index.array, buckets = [];
  for (const gr of g.groups) { const b = buckets[fm[gr.materialIndex]] || (buckets[fm[gr.materialIndex]] = []); for (let k = gr.start; k < gr.start + gr.count; k++) b.push(ix[k]); }
  const I = []; out.clearGroups();
  for (let mi = 0; mi < buckets.length; mi++) { const b = buckets[mi]; if (!b) continue; out.addGroup(I.length, b.length, mi); for (let k = 0; k < b.length; k++) I.push(b[k]); }
  out.setIndex(I);
  return GEO[key] = out;
}
/* one femur = a bow limb: shaft + condyle knob at the tip (+y) + a femoral head at the grip, one mesh */
function femurGeo() {
  const shaft = cropUV(new THREE.BoxGeometry(0.055, LIMB, 0.055), tile(0.055, LIMB, 0.055, 0.3, 0.6));
  const knob = cropUV(new THREE.BoxGeometry(0.10, 0.06, 0.075), tile(0.1, 0.06, 0.075, 0.1, 0.1)); knob.translate(0, LIMB / 2 - 0.02, -0.005);
  const head = cropUV(new THREE.BoxGeometry(0.075, 0.05, 0.075), tile(0.075, 0.05, 0.075, 0.5, 0.2)); head.translate(0.012, -LIMB / 2 + 0.03, 0);
  return merge('femur', [shaft, knob, head]);
}
function spikeGeo() { return GEO.spike || (GEO.spike = new THREE.CylinderGeometry(0.007, 0.016, 0.5, 7, 1)); }
function ringGeo() { if (GEO.ring) return GEO.ring; const g = new THREE.TorusGeometry(0.0135, 0.0045, 6, 14); g.rotateX(Math.PI / 2); return GEO.ring = g; }
function tile(w, h, d, ou, ov, D) {
  D = D || 3;
  return {
    px: [ou, ov, ou + d * D, ov + h * D], nx: [ou + 0.37, ov + 0.21, ou + 0.37 + d * D, ov + 0.21 + h * D],
    py: [ou + 0.13, ov + 0.55, ou + 0.13 + w * D, ov + 0.55 + d * D], ny: [ou + 0.71, ov + 0.3, ou + 0.71 + w * D, ov + 0.3 + d * D],
    pz: [ou + 0.5, ov + 0.66, ou + 0.5 + w * D, ov + 0.66 + h * D], nz: [ou + 0.24, ov + 0.83, ou + 0.24 + w * D, ov + 0.83 + h * D],
  };
}
function mesh(geo, mat, shadow) { const m = new THREE.Mesh(geo, mat); m.castShadow = !!shadow; m.receiveShadow = true; return m; }
function rng(seed) {
  let a = ((seed + 1) * 2654435761) >>> 0;
  return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const backOut = x => { x = clamp(x, 0, 1); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

/* The rig repairs only its cached base material when a texture fails to load (it nulls base.map); our
   per-instance clones still hold the dead texture and would render black. Every 0.5 s (for the life of the
   mob, not just the first 30 s) look for that case and retry the file once (shared across instances), else drop it. */
const TEX_KEYS = ['map', 'normalMap', 'roughnessMap'];
const TEX_SUFFIX = { map: '_basecolor.png', normalMap: '_normal.png', roughnessMap: '_roughness.png' };
const RETRY = {};
function healMats(pairs) {
  if (HR.EMBEDDED) return;   /* embedded data URIs cannot drop, and take no ?retry= suffix */
  for (let i = 0; i < pairs.length; i++) {
    const c = pairs[i][0], b = pairs[i][1], id = pairs[i][2];
    for (let k = 0; k < 3; k++) {
      const key = TEX_KEYS[k], t = c[key];
      if (!t || b[key] || t.image || t.isCanvasTexture) continue;   /* fine, still loading, or our own canvas */
      const url = HR.texURL(id, TEX_SUFFIX[key]);
      let r = RETRY[url];
      if (!r) {
        r = RETRY[url] = new THREE.TextureLoader().load(HR.retryURL(url), undefined, undefined, () => { r.failed = true; });
        r.anisotropy = t.anisotropy; r.wrapS = t.wrapS; r.wrapT = t.wrapT; r.repeat.copy(t.repeat);
        if (key === 'map') r.encoding = THREE.sRGBEncoding;
      }
      const nt = r.failed ? null : r;
      if (t !== nt) { c[key] = nt; c.needsUpdate = true; }
    }
  }
}
/* skull_front with the black background wedges at its lower corners filled with stretched ramus bone, so the
   brightened cube never shows black corners (shared by every skeleton). Retries the image once if it drops. */
let SKULL_TEX = null;
function skullTex() {
  if (SKULL_TEX) return SKULL_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d'); g.fillStyle = '#5a4836'; g.fillRect(0, 0, 1024, 1024);
  const t = SKULL_TEX = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  const paint = im => {
    g.drawImage(im, 0, 0, 1024, 1024);
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 1024; const tg = tmp.getContext('2d');
    tg.drawImage(im, 96, 640, 34, 384, 0, 640, 100, 384);       /* left: ramus edge stretched over the black */
    tg.drawImage(im, 894, 640, 34, 384, 924, 640, 100, 384);    /* right */
    const fade = tg.createLinearGradient(0, 640, 0, 730); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    tg.globalCompositeOperation = 'destination-in'; tg.fillStyle = fade; tg.fillRect(0, 0, 1024, 1024);
    g.drawImage(tmp, 0, 0); t.needsUpdate = true;
  };
  HR.loadImg(HR.texURL('skull_front', '_basecolor.png'), paint);   /* rig.js retries http drops; '' keeps the bone fill */
  return t;
}

/* scratch */
const Y = new THREE.Vector3(0, 1, 0), NY = new THREE.Vector3(0, -1, 0);
const _d = new THREE.Vector3(), _u = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion();
const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _E = new THREE.Vector3(), _W = new THREE.Vector3(), _pole = new THREE.Vector3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function ik(H, A, la, lb, pole, K, E) {
  _d.subVectors(A, H); let d = _d.length();
  if (d < 1e-5) { _d.set(0, -1, 0); d = 1; }
  _u.copy(_d).divideScalar(d);
  d = clamp(d, Math.abs(la - lb) + 1e-3, la + lb - 1e-3);
  const a = (la * la - lb * lb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, la * la - a * a));
  _p.copy(pole).addScaledVector(_u, -pole.dot(_u));
  if (_p.lengthSq() < 1e-8) _p.set(0, 0, -1).addScaledVector(_u, -_u.z);
  _p.normalize();
  K.copy(H).addScaledVector(_u, a).addScaledVector(_p, h);
  E.copy(H).addScaledVector(_u, d);
}
function span(m, a, b, len) {
  _d.subVectors(b, a); const l = _d.length();
  m.position.addVectors(a, b).multiplyScalar(0.5);
  if (l > 1e-6) m.quaternion.setFromUnitVectors(Y, _d.divideScalar(l));
  if (len) m.scale.set(1, Math.max(1e-3, l / len), 1);
}

HR.MODELS.skeleton = function () {
  const mats = [];
  const pairs = [];   /* [clone, cached original, texture id]: the rig's load-failure fallback only patches the original */
  const own = (id, o) => { const m = HR.mat(id, o), c = m.clone(); mats.push(c); pairs.push([c, m, id]); return c; };
  const R = rng(Math.floor(Math.random() * 1e6));

  const mBone = own('mat_bone', { color: 0xeae2d2, rough: 0.62, roughMap: false, repeat: [1, 1] });
  const mSkullSide = own('mat_bone', { color: 0x9a7c68, rough: 0.62, roughMap: false, repeat: [1, 1] });
  const mSkullTop = own('mat_bone', { color: 0xd0b0b0, rough: 0.62, roughMap: false, repeat: [1, 1] });
  const mCavity = own('mat_bone', { color: 0x16100c, rough: 0.5, roughMap: false });
  const mSkull = own('skull_front', { rough: 0.55, roughMap: false, normalScale: 0.6 });
  mSkull.map = skullTex(); mSkull.color.setRGB(SKULL_TINT[0], SKULL_TINT[1], SKULL_TINT[2]);   /* brightened toward the bone body */
  const mRing = HR.flat(0xd4a64a, { metal: 0.35, rough: 0.22, emissive: 0x3a2808 }).clone();   /* own glint; kept out of mats so the hurt flash can't reset it */
  const mTendon = own('mat_rotflesh', { color: 0x8a3a2a, rough: 1.45 });   /* eff. .65 (rotflesh map avg .455) */

  const root = new THREE.Group(); root.name = 'skeleton';
  const rattle = [];   /* {m, base, dir} : every static bone jolts on hurt */
  const addR = m => { rattle.push({ m, base: m.position.clone(), dir: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(0.02 + 0.01 * R()) }); return m; };

  /* ---- 18 pelvis, 19-24 legs ---- */
  const hips = HR.joint(root, 0, HIPS_Y, 0);
  addR(HR.at(hips, mesh(boxGeo(0.40, 0.12, 0.18, tile(0.40, 0.12, 0.18, 0.1, 0.1)), mBone, true), 0, 0, 0));
  const legs = [1, -1].map((sx, i) => {
    const femJ = HR.joint(hips, 0.12 * sx, -0.04, 0);
    addR(HR.at(femJ, mesh(boxGeo(0.08, 0.38, 0.08, tile(0.08, 0.38, 0.08, 0.3 * i, 0.2)), mBone, true), 0, -0.19, 0));
    const kneeJ = HR.joint(femJ, 0, -0.38, 0);
    addR(HR.at(kneeJ, mesh(boxGeo(0.07, 0.36, 0.07, tile(0.07, 0.36, 0.07, 0.2 + 0.3 * i, 0.5)), mBone, true), 0, -0.18, 0));
    addR(HR.at(kneeJ, mesh(boxGeo(0.11, 0.05, 0.18, tile(0.11, 0.05, 0.18, 0.6, 0.1 + 0.3 * i)), mBone, true), 0, -0.355, 0.04));
    return { sx, femJ, kneeJ };
  });

  /* ---- 3-8 vertebrae (chained; a pulled one collapses its gap), 1-2 skull + jaw ---- */
  const V = [], vMesh = [];
  let parent = hips;
  for (let i = 0; i < NV; i++) {
    const j = HR.joint(parent, 0, i === 0 ? 0.06 : VSTEP, i === 0 ? SPINE_Z : 0);
    const m = addR(HR.at(j, mesh(boxGeo(0.10, 0.09, 0.10, tile(0.1, 0.09, 0.1, 0.1 * i, 0.3)), mBone, true), 0, 0, 0));
    V.push(j); vMesh.push(m); parent = j;
  }
  const neckJ = HR.joint(V[NV - 1], 0, NECK_UP, 0); neckJ.rotation.order = 'YXZ';
  const skullZ = -SPINE_Z;   /* skull centred over the body, the spine enters at its back third */
  const skull = addR(HR.at(neckJ, mesh(regroup('skull', boxGeo(SKULL_W, SKULL_H, 0.48, (() => { const t = tile(SKULL_W, SKULL_H, 0.48, 0.05, 0.05, 1.6); t.pz = UV_SKULL; return t; })()),
    [3, 3, 2, 1, 0, 3]), [mSkull, mCavity, mSkullTop, mSkullSide], true), 0, JAW_H + SKULL_H / 2, skullZ));
  const jawFront = skullZ + 0.24 - 0.006, jawBack = jawFront - 0.40;
  const jawJ = HR.joint(neckJ, 0, JAW_H, jawBack);
  addR(HR.at(jawJ, mesh(regroup('jaw', boxGeo(0.40, JAW_H, 0.40, { pz: UV_JAW, px: [0.1, 0.1, 0.9, 0.3], nx: [0.2, 0.5, 1.0, 0.7], ny: [0.1, 0.1, 0.9, 0.9] }),
    [2, 2, 1, 2, 0, 2]), [mSkull, mCavity, mSkullSide], true), 0, -JAW_H / 2, 0.20));

  /* ---- 10-17 ribs (the ammo) + 9 sternum, carried by V2 ---- */
  const cage = HR.joint(V[2], 0, 0, 0);
  const cageY0 = HIPS_Y + 0.06 + 2 * VSTEP;           /* world height of V2 at rest */
  const ribs = [];
  for (let l = 0; l < 4; l++) for (const side of [1, -1]) {
    const m = mesh(ribGeo(side), mBone, true);
    cage.add(m);
    ribs.push({ m, side, y0: RIB_Y[l] - cageY0, l, pres: 1, pop: 9, sx: R(), sz: R() - 0.5, spin: (R() - 0.5) * 3 });
  }
  const cageMid = (RIB_Y[0] + RIB_Y[3]) / 2 - cageY0;
  const sternum = mesh(boxGeo(0.06, 0.36, 0.04, tile(0.06, 0.36, 0.04, 0.4, 0.4)), mBone, true);
  cage.add(sternum);
  const stern = { pres: 1, pop: 9 };

  /* ---- 25-30 arms on a fixed shoulder girdle (so the skull can sink between them) ---- */
  const girdle = HR.joint(root, 0, SHOULDER_Y, 0);
  const arms = [1, -1].map((sx, i) => {
    const sh = HR.joint(girdle, SHOULDER_X * sx, 0, 0);
    addR(HR.at(sh, mesh(boxGeo(0.07, HUM, 0.07, tile(0.07, HUM, 0.07, 0.5, 0.3 * i)), mBone, true), 0, -HUM / 2, 0));
    const el = HR.joint(sh, 0, -HUM, 0);
    addR(HR.at(el, mesh(boxGeo(0.06, FORE, 0.06, tile(0.06, FORE, 0.06, 0.15, 0.4 + 0.2 * i)), mBone, true), 0, -FORE / 2, 0));
    const hand = addR(HR.at(el, mesh(boxGeo(0.08, 0.08, 0.04, tile(0.08, 0.08, 0.04, 0.7, 0.7)), mBone, false), 0, -HAND_C, 0));
    return { sx, sh, el, hand, S: new THREE.Vector3(SHOULDER_X * sx, 0, 0), T: new THREE.Vector3(), E: new THREE.Vector3(), K: new THREE.Vector3() };
  });
  /* 31 the wedding ring, on a dainty extended finger bone of the bow hand */
  const finger = HR.at(arms[0].hand, mesh(boxGeo(0.02, 0.07, 0.02), mBone, false), 0.028, -0.06, 0.005);
  HR.at(finger, mesh(ringGeo(), mRing, false), 0, -0.004, 0);

  /* ---- 32-33 femur bow, 34-35 tendon string halves, 36 forearm tendon, 37 rib-arrow ---- */
  const bow = new THREE.Group(); bow.rotation.order = 'YXZ'; root.add(bow);
  const limbT = mesh(femurGeo(), mBone, true), limbB = mesh(femurGeo(), mBone, true);
  /* the bottom limb is the same femur turned upside down (rotation.z = pi), so its knob is at the far end */
  bow.add(limbT); bow.add(limbB);
  const strT = mesh(boxGeo(0.016, 0.33, 0.016), mTendon, false), strB = mesh(boxGeo(0.016, 0.33, 0.016), mTendon, false);
  const tendon = mesh(boxGeo(0.016, 0.30, 0.016), mTendon, false);
  const arrow = mesh(spikeGeo(), mBone, false);
  root.add(strT); root.add(strB); root.add(tendon); root.add(arrow);
  const nockH = new THREE.Object3D(); root.add(nockH);   /* handle: live nock point */

  /* ---- state ---- */
  const st = {
    healT: 0, shot: -1, auto: false, queue: 0, wait: 0, pull: null, hold: 0,
    rel: 9, calm: 0, regrowT: 0, fatigue: 0, breathPh: R() * TAU, prevCd: 0,
    aim: 0, aimV: 0, wph: 0, hurtAge: 9, prevHurt: 0, chatterAt: 2 + 3 * R(), chatter: 9, seed: R() * 50,
  };
  const len = new Float32Array(NV).fill(1), lenV = new Float32Array(NV), vPres = new Float32Array(NV).fill(1), vPop = new Float32Array(NV).fill(9);
  const stack = [];                                   /* pulled bones, newest last (regrowth pops) */
  const tipT = new THREE.Vector3(), tipB = new THREE.Vector3(), nock = new THREE.Vector3(), grip = new THREE.Vector3();
  const lTop = new THREE.Vector3(), lBot = new THREE.Vector3(), lNock = new THREE.Vector3();
  const grab = new THREE.Vector3(), yank = new THREE.Vector3(), from = new THREE.Vector3(), nockRest = new THREE.Vector3(), nockFull = new THREE.Vector3();
  const handW = new THREE.Vector3(), foreW = new THREE.Vector3(), aEnd = new THREE.Vector3();

  function nextBone() {
    for (const k of RIB_ORDER) if (ribs[k].pres > 0) return { kind: 'rib', i: k };
    for (let i = NV - 1; i >= 0; i--) if (vPres[i] > 0) return { kind: 'vert', i };
    return { kind: 'none', i: 0 };                    /* all gone: it re-pulls the last one */
  }
  function startShot(auto) { st.shot = 0; st.auto = auto; st.hold = 0; st.pull = nextBone(); st.calm = 0; }
  const sfx = { crack: 0, release: 0 };   /* event counters the game can poll for SFX (dry crack on each pull) */
  function pullBone(b) {
    sfx.crack++;
    if (b.kind === 'rib') {
      ribs[b.i].pres = 0; stack.push(b);
      let left = 0; for (const r of ribs) left += r.pres > 0 ? 1 : 0;
      if (!left) stern.pres = 0;      /* the sternum comes away with the last rib */
    } else if (b.kind === 'vert') { vPres[b.i] = 0; stack.push(b); }
  }
  function release() {
    sfx.release++;
    st.shot = -1; st.rel = 0; st.fatigue = Math.min(1.6, st.fatigue + 0.3); st.calm = 0;
    if (st.queue > 0) { st.queue--; st.wait = 0.3; }
  }
  /* world-ish (girdle-local) position of a bone the hand reaches for */
  function bonePos(b, out) {
    if (b.kind === 'rib') { const r = ribs[b.i]; out.set(0.17 * r.side, RIB_Y[r.l] - girdle.position.y, RIB_Z + 0.03); }
    else { let y = HIPS_Y + 0.06; for (let i = 0; i < b.i; i++) y += VSTEP * len[i]; out.set(0, y - girdle.position.y + 0.02, SPINE_Z - 0.07); }
    return out;
  }

  function update(dt, t, s) {
    dt = clamp(dt || 0, 0, 0.1);
    if ((st.healT += dt) > 0.5) { st.healT = 0; healMats(pairs); }
    const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    const dead = clamp(s.dead || 0, 0, 1), alive = 1 - smooth(dead / 0.1);
    const speed = clamp(s.speed || 0, 0, 1) * alive;

    /* ---------- shot state machine ---------- */
    const cd = s.cd || 0;
    if (alive > 0.5) {
      if (s.fired) {
        if (st.shot >= 0 && !st.auto && st.shot >= T_NOCK) release();
        else if (st.shot >= 0 || st.wait > 0) st.queue = Math.min(3, st.queue + 1);
        else startShot(true);
      } else if (st.shot < 0 && st.wait <= 0 && st.prevCd > DRAW_CD && cd <= DRAW_CD && cd > 0 && (s.near === undefined || s.near < 16)) startShot(false);
      if (st.wait > 0) { st.wait -= dt; if (st.wait <= 0 && st.shot < 0) startShot(true); }
      if (st.shot >= 0) {
        const before = st.shot;
        st.shot += dt;
        if (before < T_YANK && st.shot >= T_YANK) pullBone(st.pull);
        if (st.shot >= T_FULL) {
          if (st.auto) release();
          else { st.shot = T_FULL; st.hold += dt; if (st.hold > 2.5) { st.shot = -1; st.rel = 9; } }
        }
      }
    } else { st.shot = -1; st.queue = 0; st.wait = 0; }
    st.prevCd = cd;
    st.rel += dt;
    const active = st.shot >= 0;
    if (!active && st.wait <= 0) st.calm += dt;
    st.fatigue = Math.max(0, st.fatigue - dt * 0.07);

    /* ---------- regrowth: one bone every 3 s once it has been calm for a while ---------- */
    if (alive > 0.99 && st.calm > CALM && stack.length) {
      st.regrowT += dt;
      if (st.regrowT >= REGROW) {
        st.regrowT = 0;
        const b = stack.pop();
        if (b.kind === 'rib') { ribs[b.i].pres = 1; ribs[b.i].pop = 0; if (stern.pres === 0) { stern.pres = 1; stern.pop = 0; } }
        else { vPres[b.i] = 1; vPop[b.i] = 0; }
      }
    } else st.regrowT = REGROW;          /* first bone pops the moment it has been calm for CALM s */

    /* ---------- hurt rattle ---------- */
    if ((s.hurt || 0) > st.prevHurt + 0.05) st.hurtAge = 0;
    st.prevHurt = s.hurt || 0; st.hurtAge += dt;
    const rat = st.hurtAge < 0.25 ? 1.4 * Math.exp(-st.hurtAge * 12) : 0;           /* every bone jolts, springs back in ~0.2 s */
    for (let k = 0; k < rattle.length; k++) { const r = rattle[k]; r.m.position.copy(r.base); if (rat > 0) r.m.position.addScaledVector(r.dir, rat * HR.noise(st.hurtAge * 40, k * 1.7)); }

    /* ---------- breathing / exhale / panting ---------- */
    const fat = Math.min(1, st.fatigue);
    st.breathPh = (st.breathPh + dt * TAU * (0.3 + 0.9 * fat)) % TAU;
    let breath = 1 + 0.12 * (1 + 0.5 * fat) * (0.5 - 0.5 * Math.cos(st.breathPh));
    const drawK = active ? smooth((st.shot - T_NOCK) / (T_DRAW - T_NOCK)) : 0;     /* frozen at full inhale */
    breath = lerp(breath, 1.12, drawK);
    let exK = 0;
    if (st.rel < EXHALE) {                                                          /* long, slow exhale */
      const e = st.rel / EXHALE;
      exK = Math.sin(Math.PI * Math.min(1, e * 1.15));
      breath = lerp(breath, e < 0.6 ? lerp(1.12, 0.92, smooth(e / 0.6)) : lerp(0.92, breath, smooth((e - 0.6) / 0.4)), Math.min(1, (1 - e) * 4));
    }
    breath *= alive; breath += (1 - alive);

    /* ---------- walk ---------- */
    st.wph = (st.wph + dt * TAU * 1.5) % TAU;
    const wp = st.wph;

    /* ---------- death phases ---------- */
    const buckle = smooth(dead / 0.3), dropK = buckle * buckle;
    hips.position.set(0, HIPS_Y + speed * 0.02 * (0.5 - 0.5 * Math.cos(2 * wp)) - (HIPS_Y - 0.08) * dropK, 0);
    hips.rotation.set(-0.12 * buckle, 0.05 * Math.sin(wp) * speed, 0);
    for (let i = 0; i < 2; i++) {
      const lg = legs[i], ph = wp + (i ? Math.PI : 0);
      lg.femJ.rotation.set(lerp(-0.5 * Math.sin(ph) * speed, -1.5, buckle), 0, 0.45 * buckle * lg.sx);
      lg.kneeJ.rotation.x = lerp(speed * (0.08 + 0.6 * Math.max(0, Math.cos(ph - 0.3))), 0.05, buckle);
    }

    /* ---------- spine: cobra wave, vertebra lengths (pulled = gap collapses, with a thunk) ---------- */
    let chain = 0.06, liveChain = 0.06 + NECK_UP - VSTEP;
    for (let i = 0; i < NV; i++) {
      for (let k = 0; k < n; k++) { lenV[i] += (260 * (vPres[i] - len[i]) - 14 * lenV[i]) * h; len[i] += lenV[i] * h; }
      len[i] = clamp(len[i], -0.1, 1.15);
      const cK = smooth((dead - 0.12 - 0.05 * i) / 0.25);
      const off = lerp(VSTEP * Math.max(0, len[i]), 0.045, cK);
      if (i + 1 < NV) V[i + 1].position.y = off; else neckJ.position.y = off + NECK_UP - VSTEP;   /* top vertebra pulled -> skull drops 0.105 */
      chain += off; liveChain += VSTEP * Math.max(0, len[i]);
      vPop[i] += dt;
      const sc = vPres[i] > 0 ? (vPop[i] < 0.3 ? backOut(vPop[i] / 0.3) : 1) : 0;
      vMesh[i].scale.setScalar(Math.max(1e-3, sc));
      const live = 1 - cK;
      V[i].rotation.set(0.025 * Math.sin(1.1 * t - 0.5 * i + 1) * live + (i === 0 ? 0.05 * exK : 0),
        0.03 * Math.sin(wp) * speed * live,
        0.06 * Math.sin(1.6 * t - 0.6 * i) * live * alive + (i % 2 ? -0.3 : 0.3) * 0.5 * cK * (i ? 2 : 1));
    }
    chain += NECK_UP - VSTEP;
    if (chain < 0.065) { neckJ.position.y += 0.065 - chain; chain = 0.065; }   /* all six gone: the skull rests on the pelvis */
    /* the shoulder girdle hangs off the mid-spine: the first three pulls sink the skull between the shoulders,
       the last three bring the shoulders down with it (so the head ends up sitting on its shoulders) */
    let sag = 0;
    for (let i = 0; i < 3; i++) sag += VSTEP * (1 - clamp(len[i], 0, 1));

    /* ---------- skull: looks at you; sinks with the spine; dies last (hangs in the air, then drops) ---------- */
    if (dead > 0) {
      const top = hips.position.y + chain + 0.05 * smooth((dead - 0.37) / 0.25), hold = HIPS_Y + Math.max(0.065, liveChain);
      const fall = clamp((dead - 0.5) / 0.16, 0, 1);
      let y = lerp(hold, top, fall * fall);
      if (dead >= 0.66) y = top + 0.06 * Math.sin(Math.PI * clamp((dead - 0.66) / 0.08, 0, 1));
      neckJ.position.y += y - top;
    }
    const roll = smooth((dead - 0.74) / 0.16);
    neckJ.position.x = 0.12 * roll; neckJ.position.z = 0.06 * roll;
    neckJ.rotation.set(clamp((s.pitch || 0) * 0.7, -0.45, 0.45) * alive + 0.12 * exK - 0.25 * roll,
      clamp(s.yaw || 0, -1.1, 1.1) * alive * 0.9 + 0.3 * roll,
      -0.5 * (V[0].rotation.z + V[1].rotation.z + V[2].rotation.z) * alive + 0.55 * roll);

    /* jaw: chatter bursts (12 Hz, 0.4 s, every 3-6 s); pants with fatigue; falls open dead */
    st.chatter += dt;
    if (t > st.chatterAt) { st.chatter = 0; st.chatterAt = t + 3 + 3 * R(); }
    const chat = st.chatter < 0.4 ? 0.125 + 0.125 * Math.sin(st.chatter * TAU * 12) : 0;
    const pant = fat * (0.08 + 0.06 * (0.5 + 0.5 * Math.sin(st.breathPh * 2)));
    jawJ.rotation.x = Math.max(chat, pant + 0.1 * exK) * alive + 0.45 * smooth((dead - 0.7) / 0.15);

    /* ---------- ribcage: breathing spacing, pops on regrowth, scatters on death ---------- */
    const cageTop = hips.position.y + 0.06 + (V[1].position.y) + (V[2].position.y);
    const lvl = smooth((dead - 0.25) / 0.2);   /* level the cage while the ribs fall, so they land flat on the ground */
    cage.rotation.set(-(hips.rotation.x + V[0].rotation.x + V[1].rotation.x + V[2].rotation.x) * lvl, 0, -(V[0].rotation.z + V[1].rotation.z + V[2].rotation.z) * lvl);
    for (let k = 0; k < ribs.length; k++) {
      const r = ribs[k];
      r.pop += dt;
      const sc = r.pres > 0 ? (r.pop < 0.3 ? backOut(r.pop / 0.3) : 1) : 0;
      const sK = r.pres > 0 ? smooth((dead - 0.32 - 0.025 * k) / 0.22) : 0;
      const yLive = cageMid + (r.y0 - cageMid) * breath;
      r.m.position.set(lerp(0, r.side * (0.22 + 0.3 * r.sx), sK),
        lerp(yLive, 0.02 - cageTop, sK) + 0.18 * Math.sin(Math.PI * sK),
        lerp(RIB_Z - SPINE_Z, RIB_Z - SPINE_Z + 0.5 * r.sz, sK));
      r.m.rotation.set(0.1 - (breath - 1) * 0.9 * (1 - sK), r.spin * sK, 0);
      r.m.scale.set(Math.max(1e-3, sc), Math.max(1e-3, sc), Math.max(1e-3, sc * (1 + (breath - 1) * 0.6 * (1 - sK))));
    }
    stern.pop += dt;
    const ssc = stern.pres > 0 ? (stern.pop < 0.3 ? backOut(stern.pop / 0.3) : 1) : 0;
    const stK = smooth((dead - 0.4) / 0.25);
    sternum.position.set(0, lerp(1.18 - cageY0, 0.02 - cageTop, stK), lerp(0.12 - SPINE_Z + (breath - 1) * 0.25, 0.3, stK));
    sternum.rotation.set(1.45 * stK, 0, 0.4 * stK);
    sternum.scale.setScalar(Math.max(1e-3, ssc));

    /* ---------- shoulders: drop 0.03 on the exhale. Dead, they ride the top of the collapsing spine (they never
       float at chest height over the pile), then slide off it to the ground beside the pile ---------- */
    const armDrop = smooth((dead - 0.18) / 0.35);
    const dk = smooth(dead / 0.22), land = smooth((dead - 0.4) / 0.3);
    const girdleLive = SHOULDER_Y - sag + speed * 0.02 * (0.5 - 0.5 * Math.cos(2 * wp)) - 0.03 * exK;
    const girdleDead = lerp(Math.max(0.08, hips.position.y + chain - 0.05), 0.08, land);
    girdle.position.set(0, lerp(girdleLive, Math.min(girdleLive, girdleDead), dk), 0);

    /* ---------- aim blend (bow raised while shooting and a little after) ---------- */
    const aimT = (active || st.wait > 0 || st.rel < 1.6) && alive > 0.5 ? 1 : 0;
    for (let k = 0; k < n; k++) { st.aimV += (60 * (aimT - st.aim) - 2 * Math.sqrt(60) * st.aimV) * h; st.aim += st.aimV * h; }
    const aim = clamp(st.aim, 0, 1);

    /* left (bow) hand */
    const L = arms[0], Rt = arms[1];
    const sw = Math.sin(wp) * speed * 0.12;
    L.T.set(lerp(0.31, AIM_GRIP[0], aim), lerp(-0.63, AIM_GRIP[1], aim), lerp(0.07 - sw, AIM_GRIP[2], aim));
    L.T.set(lerp(L.T.x, 0.62, armDrop), lerp(L.T.y, 0.05 - girdle.position.y, armDrop), lerp(L.T.z, 0.25, armDrop));
    _pole.set(lerp(0.2, 0.8, aim), lerp(0, -0.6, aim), lerp(-1, -0.2, aim));
    solveArm(L, _pole);
    deathArm(L, dk, land);

    /* bow at the bow hand */
    const pull = active ? (st.shot < T_DRAW ? 0 : smooth((st.shot - T_DRAW) / (T_FULL - T_DRAW))) : 0;
    const vib = st.rel < 0.5 ? 0.035 * Math.sin(st.rel * 75) * Math.exp(-st.rel * 9) : 0;
    const la = LIMB_A + 0.18 * pull - vib * 2;
    bow.position.set(girdle.position.x + L.E.x, girdle.position.y + L.E.y, girdle.position.z + L.E.z);
    bow.rotation.set(lerp(1.15, 0, aim) + lerp(0, Math.PI / 2 - 1.15, armDrop), lerp(-0.25, 0, aim), lerp(0.1, -BOW_CANT, aim));   /* canted out like a horse archer: upper limb beside the skull */
    if (armDrop > 0) bow.position.y = lerp(bow.position.y, 0.04, armDrop);
    limbT.position.set(0, LIMB / 2 * Math.cos(la), -LIMB / 2 * Math.sin(la)); limbT.rotation.x = -la;
    limbB.position.set(0, -LIMB / 2 * Math.cos(la), -LIMB / 2 * Math.sin(la)); limbB.rotation.set(la, 0, Math.PI);
    lTop.set(0, LIMB * Math.cos(la), -LIMB * Math.sin(la));
    lBot.set(0, -LIMB * Math.cos(la), -LIMB * Math.sin(la));
    lNock.set(0, 0, -LIMB * Math.sin(la) - DRAW * pull + vib);
    bow.updateMatrix();
    tipT.copy(lTop).applyMatrix4(bow.matrix); tipB.copy(lBot).applyMatrix4(bow.matrix);
    nock.copy(lNock).applyMatrix4(bow.matrix); grip.copy(bow.position);
    nockH.position.copy(nock);

    /* right (draw) hand: reach -> yank -> nock -> draw -> release follow-through */
    _a.set(0, 0, -LIMB * Math.sin(LIMB_A)).applyMatrix4(bow.matrix); nockRest.copy(_a).sub(girdle.position);
    _a.set(0, 0, -LIMB * Math.sin(LIMB_A + 0.18) - DRAW).applyMatrix4(bow.matrix); nockFull.copy(_a).sub(girdle.position);
    from.set(lerp(-0.31, -0.12, aim), lerp(-0.63, -0.22, aim), lerp(0.06 + sw, 0.2, aim));
    if (active) {
      const sh = st.shot;
      bonePos(st.pull, grab);
      yank.set(grab.x - 0.10, grab.y + 0.06, grab.z + 0.22);
      if (sh < T_YANK) Rt.T.lerpVectors(from, grab, smooth(sh / T_YANK));
      else if (sh < T_NOCK) Rt.T.lerpVectors(grab, yank, 1 - Math.pow(1 - (sh - T_YANK) / (T_NOCK - T_YANK), 3));
      else if (sh < T_DRAW) Rt.T.lerpVectors(yank, nockRest, smooth((sh - T_NOCK) / (T_DRAW - T_NOCK)));
      else { Rt.T.copy(nock).sub(girdle.position); }
    } else if (st.rel < 0.7) {
      const e = st.rel / 0.7;
      _b.copy(nockFull); _b.x -= 0.14; _b.z -= 0.08; _b.y += 0.04;            /* snap back past the ear */
      if (e < 0.15) Rt.T.lerpVectors(nockFull, _b, smooth(e / 0.15)); else Rt.T.lerpVectors(_b, from, smooth((e - 0.15) / 0.85));
    } else Rt.T.copy(from);
    Rt.T.set(lerp(Rt.T.x, -0.62, armDrop), lerp(Rt.T.y, 0.05 - girdle.position.y, armDrop), lerp(Rt.T.z, 0.2, armDrop));
    _pole.set(lerp(-0.2, -0.7, aim), lerp(0, -0.35, aim), lerp(-1, -0.6, aim));
    solveArm(Rt, _pole);
    deathArm(Rt, dk, land);

    /* string halves, forearm tendon */
    span(strT, tipT, nock, 0.33); span(strB, tipB, nock, 0.33);
    foreW.copy(L.K).lerp(L.E, 0.45).add(girdle.position);
    span(tendon, foreW, nock, 0.30);

    /* rib-arrow: in the hand after the yank, on the string from the nock phase */
    arrow.visible = active && st.shot >= T_YANK;
    if (arrow.visible) {
      handW.copy(Rt.E).add(girdle.position);
      const onString = st.shot >= T_DRAW - 0.04;
      _a.copy(onString ? nock : handW);
      _u.subVectors(grip, _a).normalize();
      aEnd.copy(_a).addScaledVector(_u, 0.5);
      span(arrow, _a, aEnd);
    }
  }

  /* dead: the humeri fall outward (rot.z ±1.2 while the spine collapses, ±1.55 once on the ground) with a slack
     elbow, blended over the IK pose; K/E are re-derived by forward kinematics so the bow and tendon follow */
  const qD = new THREE.Quaternion(), eD = new THREE.Euler();
  function deathArm(A, k, land) {
    if (k <= 0) return;
    eD.set(0.25, 0, A.sx * (1.2 + 0.35 * land)); qD.setFromEuler(eD); A.sh.quaternion.slerp(qD, k);
    eD.set(-0.35 * (1 - land) - 0.1, 0, A.sx * 0.2); qD.setFromEuler(eD); A.el.quaternion.slerp(qD, k);
    A.K.set(0, -HUM, 0).applyQuaternion(A.sh.quaternion).add(A.S);
    _W.set(0, -HAND_C, 0).applyQuaternion(A.el.quaternion).applyQuaternion(A.sh.quaternion);
    A.E.copy(A.K).add(_W);
  }
  /* two-bone arm IK in girdle space; joints aim -Y at the next point */
  function solveArm(A, pole) {
    ik(A.S, A.T, HUM, HAND_C, pole, A.K, A.E);
    _d.subVectors(A.K, A.S).normalize();
    A.sh.quaternion.setFromUnitVectors(NY, _d);
    _W.subVectors(A.E, A.K).normalize();
    _q.copy(A.sh.quaternion).invert();
    _W.applyQuaternion(_q);
    A.el.quaternion.setFromUnitVectors(NY, _W);
  }

  return {
    root, update, mats, deathDur: DEATH_DUR, sfx,
    handles: { head: neckJ, jaw: jawJ, aL: arms[0].sh, aR: arms[1].sh, lL: legs[0].femJ, lR: legs[1].femJ, bow, nock: nockH, ribcage: cage },
    /* introspection for the game / tests */
    _st: st,
    ribsLeft: () => ribs.filter(r => r.pres > 0).length,
    vertebraeLeft: () => Array.prototype.filter.call(vPres, v => v > 0).length,
  };
};
})();

