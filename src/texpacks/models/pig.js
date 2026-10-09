/* PIG — "Veneers" (Hyperreal pack, DESIGN_BIBLE §9).
   A real bristly pink pig with a full set of bleach-white human veneers its lips can't close over,
   chewing side to side; a fifth leg grows out of its back and kicks on its own; sometimes it sits
   on its haunches like a man on a step and watches you.
   Preview: grin + chew always; fifth-leg reflex kick ~3 s after load then every 10-20 s, and on
   A (attack) / H (hurt); first idle ends in a sit (~4 s), then 1 in 5 idles; K = roll over, the
   fifth leg kicks three times last. */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS) return;

/* ---- measured from final_ent/face_pig_basecolor.png (1024 sq; u = x/1024, v = 1 - y/1024) ----
   image-left eye  = model's RIGHT (-x): opening centre (208,272)px -> u .203 v .734; opening ~80x63px,
                     white lashes reach out to u .13; lid crease at y~225
   image-right eye = model's LEFT  (+x): opening centre (810,272)px -> u .791 v .734; ~83x62px
   snout disc: x 295-728, y 415-750 -> u .288-.711, v .268-.595 (nostrils at y~580)
   lip line / jaw split: bottom of upper incisors y 855 -> v .165; lower teeth y 857-897; lower lip to y 972
   mouth corners x 200 / 820 -> u .195 / .80 (jaw box 0.36 wide covers u .173-.827; cheek blocks either side)
   Deviations from the bible, on purpose: the jaw is the face's own bottom strip (v 0-.165) split from the head
   (cheek blocks + hinged jaw) instead of a proud 0.36x0.08 crop, so the hurt drop shows a real mouth cavity and
   never a second set of painted teeth; chew is 0 -> 0.044 rad (0.12 opened a constant dark bar under the sun). */
const F = {
  eyeR: [0.203, 0.734], eyeL: [0.791, 0.734],
  lidW: 0.135, lidH: 0.085,
  snout: [0.288, 0.268, 0.712, 0.596],       /* 0.233 x 0.18 box, 1:1 with the painted disc behind it */
  snoutY: 0.432,
  split: 0.165,
};
/* head_pig_side_basecolor (1024 sq, snout/mouth corner toward image-left): painted ear spans u .24-.75, v .60-.95 with its
   contact shadow down to v .55, so the side uses v 0-.55 and u 0-.50 (1:1 texels on the 0.50 deep x 0.55 tall side);
   its mouth crease (v ~.18, image-left) continues the grin round the corner. px takes it as is, nx mirrored. */
const SIDE = [0, 0, 0.50, 0.55], SIDE_TINT = 0xd0c8c4;
/* skin tints (mat_skin averages lin(.79,.51,.44)); the crown/back-of-head tint sits between the face photo's pale top
   edge and the body so the head no longer reads as a grey lid. mouth = lip-coloured cavity walls, tongue = dark floor */
const T = { head: 0xc8aca4, body: 0xc8a098, leg: 0xb89088, lump: 0xd07468, ear: 0xd09a90, trot: 0x2a201c, mouth: 0x7a3a34, tongue: 0x3e1814 };
/* hide: bristle skin bombed from the pig's own side photo (tools/build_cloth.py). pig_hide is seamless (tiled at HIDE_D per
   block: crown, back of the head, back, chest, rump, tail, fifth leg); pig_flank is the whole 1.20 x 0.55 side (px as is,
   nx mirrored): shoulder wrinkles at the front (u 0), ham crease at the back, cracked mud crust along the belly (v 0) and
   splashed up the lower third. The legs take the flank's muddy lower half. Tinted like the head side (SIDE_TINT).
   HIDE false = the old tinted mat_skin */
const HIDE = true, HIDE_D = 1.8, HIDE_TINT = 0xd0c8c4;
const LEG_U = [0.04, 0.30, 0.48, 0.62];      /* flank u where each leg's crops start (four legs, four different patches of mud) */
function legFlankUV(i) {
  const w = 0.22 / 1.2, u = Math.min(LEG_U[i], 1 - 2 * w), v1 = 0.27 / 0.55 + 0.02;
  return { pz: [u, 0, u + w, v1], px: [u + w, 0, u + 2 * w, v1], nz: [u + w, 0, u, v1], nx: [u + 2 * w, 0, u + w, v1], py: [u, v1, u + w, v1 + 0.1], ny: [u, 0, u + w, 0.02] };
}

const GEO = {};
const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
/* faces regrouped by material: a box whose faces share one material is one draw call, not six */
function box(w, h, d, mats, uv, shadow) {
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
}
/* cupped, tapering ear flap (0.16 x 0.14 x 0.05): side edges curl forward so it is never a plank edge-on */
let EAR_GEO = null;
function earGeo() {
  if (EAR_GEO) return EAR_GEO;
  const w = 0.16, h = 0.14, g = new THREE.BoxGeometry(w, h, 0.05, 6, 3, 1);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ex = p.getX(i) / (w / 2), ey = (p.getY(i) + h / 2) / h;
    p.setZ(i, p.getZ(i) * (1 - 0.5 * ey) + 0.04 * ex * ex + 0.015 * ey * ey);
    p.setX(i, p.getX(i) * (1 - 0.2 * ey));
    uv.setXY(i, 0.3 + uv.getX(i) * 0.38, 0.6 + uv.getY(i) * 0.34);
  }
  g.computeVertexNormals();
  return EAR_GEO = g;
}
/* tiled crops for the seamless materials (D tiles per block), offset per part so boxes don't repeat */
function tile(w, h, d, ou, ov, D) {
  D = D || 2.4;
  return {
    px: [ou, ov, ou + d * D, ov + h * D], nx: [ou + 0.37, ov + 0.21, ou + 0.37 + d * D, ov + 0.21 + h * D],
    py: [ou + 0.13, ov + 0.55, ou + 0.13 + w * D, ov + 0.55 + d * D], ny: [ou + 0.71, ov + 0.3, ou + 0.71 + w * D, ov + 0.3 + d * D],
    pz: [ou + 0.5, ov + 0.66, ou + 0.5 + w * D, ov + 0.66 + h * D], nz: [ou + 0.24, ov + 0.83, ou + 0.24 + w * D, ov + 0.83 + h * D],
  };
}
function withFront(uv, front) { uv.pz = front; return uv; }
function rng(seed) {
  let a = ((seed + 1) * 2654435761) >>> 0;
  return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = HR.clamp;
/* same value noise as HR.noise, minus its per-call closure (keeps update() allocation-free) */
function hash1(n, s) { const x = Math.sin((n + s) * 127.1) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }
function noise(t, seed) { const i = Math.floor(t), f = t - i, s = (seed || 0) * 13.37, u = f * f * (3 - 2 * f); return hash1(i, s) * (1 - u) + hash1(i + 1, s) * u; }
const DEAD_KICKS = [0.40, 0.60, 0.80];
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
/* spring/pendulum with a target, substepped so frame hitches can't blow it up; per-part limits */
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

HR.MODELS.pig = function () {
  const root = new THREE.Group(); root.name = 'hr_pig';
  const mats = [], HL = [];
  function inst(base, color, rough) {
    const m = base.clone(); if (base.userData.hrId) HL.push(base, m); m.color.setHex(color); m.roughness = rough; m.metalness = 0;
    m.emissive.setHex(0); m.emissiveIntensity = 1; mats.push(m); return m;
  }
  const B = {
    skin: hmat('mat_skin', { repeat: [1, 1] }),
    bone: hmat('mat_bone', { repeat: [1, 1] }),
    face: hmat('face_pig', { roughMap: false, normalScale: 0.6 }),
    side: hmat('head_pig_side', { roughMap: false, normalScale: 0.6 }),
    hide: HIDE ? hmat('pig_hide', { roughMap: false, normalScale: 0.6, repeat: [1, 1], fallback: 0xc8a098 }) : null,
    flank: HIDE ? hmat('pig_flank', { roughMap: false, normalScale: 0.6, fallback: 0xc8a098 }) : null,
  };
  /* roughness maps average .35 (mat_skin) and .125 (mat_bone), so factor = target / average; three clamps the product.
     body 1.3 -> ~.45 effective (sweaty), head/legs 1.5 -> ~.52, trotters 4.0 -> ~.5 */
  const M = {
    face: inst(B.face, 0xffffff, 0.5),
    side: inst(B.side, SIDE_TINT, 0.55),
    head: HIDE ? inst(B.hide, HIDE_TINT, 0.5) : inst(B.skin, T.head, 1.5),
    body: HIDE ? inst(B.hide, HIDE_TINT, 0.45) : inst(B.skin, T.body, 1.3),
    flank: HIDE ? inst(B.flank, HIDE_TINT, 0.45) : null,
    leg: HIDE ? inst(B.flank, 0xc4bcb8, 0.5) : inst(B.skin, T.leg, 1.5),
    ear: inst(B.skin, T.ear, 1.35),
    lump: inst(B.skin, T.lump, 0.9),
    trot: inst(B.bone, T.trot, 4.0),
    mouth: inst(B.skin, T.mouth, 0.55),   /* lip-coloured wet cavity walls: hairline gaps read as lip, not a black seam */
    tongue: inst(B.skin, T.tongue, 0.5),  /* the floor of the mouth, only seen when the jaw drops: dark and wet */
    rim: inst(B.face, 0xc4b8b4, 0.45),    /* snout under-wall: a touch darker */
    snTop: inst(B.face, 0x958682, 0.45),  /* snout top wall faces the sky/torches: held down so it reads as a shaded rim, not a lit shelf */
  };
  /* mat_skin's normal map carries broad, low-frequency undulation that reads as crumpled paper at the rig's 1.2 */
  for (const k of ['head', 'body', 'leg', 'ear', 'lump']) M[k].normalScale.set(0.45, 0.45);
  if (HIDE) for (const k of ['head', 'body', 'flank', 'leg']) M[k].normalScale.set(0.7, 0.7);   /* bristles + mud crust, not crumpled paper */

  /* ---------- rig ---------- */
  const rollG = HR.joint(root, -0.40, 0, 0);            /* death roll pivot: right-side ground edge */
  const baseG = HR.joint(rollG, 0.40, 0, 0);
  const hips = HR.joint(baseG, 0, 0.33, -0.60);          /* body's rear-bottom edge: the sit pivot */
  const bodyM = HR.at(hips, HIDE ? box(0.80, 0.55, 1.20, { all: M.body, px: M.flank, nx: M.flank, ny: M.flank },
      Object.assign(tile(0.8, 0.55, 1.2, 0.1, 0.2, HIDE_D), { px: [0, 0, 1, 1], nx: [1, 0, 0, 1], ny: [0.05, 0.0, 0.95, 0.12] }))
    : box(0.80, 0.55, 1.20, M.body, tile(0.8, 0.55, 1.2, 0.1, 0.2)), 0, 0.275, 0.60);

  /* head on a neck joint at the head's back centre (world 0, 0.80, 0.53) */
  const HW = 0.55, HH = 0.55, HD = 0.50, JH = HH * F.split, JW = 0.36, CW = (HW - 0.36) / 2;
  const neck = HR.joint(hips, 0, 0.47, 1.13); neck.rotation.order = 'YXZ';
  /* head: face photo on the front, the pig's own side-profile photo on the flanks (split at the jaw line like the
     front), plain tinted skin on the crown and the back of the head */
  const sv = SIDE[1] + (SIDE[3] - SIDE[1]) * F.split;
  const hu = tile(HW, HH - JH, HD, 0.3, 0.1);
  hu.pz = [0, F.split, 1, 1]; hu.px = [SIDE[0], sv, SIDE[2], SIDE[3]]; hu.nx = [SIDE[2], sv, SIDE[0], SIDE[3]];
  HR.at(neck, box(HW, HH - JH, HD, { all: M.head, pz: M.face, px: M.side, nx: M.side, ny: M.mouth }, hu), 0, JH / 2, HD / 2);
  const cu = 0.36 / HW / 2;
  const cl = withFront(tile(CW, JH, HD, 0.6, 0.4), [0.5 + cu, 0, 1, F.split]); cl.px = [SIDE[0], SIDE[1], SIDE[2], sv];
  HR.at(neck, box(CW, JH, HD, { all: M.head, pz: M.face, px: M.side, nx: M.mouth }, cl), HW / 2 - CW / 2, -HH / 2 + JH / 2, HD / 2);
  const cr = withFront(tile(CW, JH, HD, 0.2, 0.7), [0, 0, 0.5 - cu, F.split]); cr.nx = [SIDE[2], SIDE[1], SIDE[0], sv];
  HR.at(neck, box(CW, JH, HD, { all: M.head, pz: M.face, nx: M.side, px: M.mouth }, cr), -(HW / 2 - CW / 2), -HH / 2 + JH / 2, HD / 2);
  /* jaw: lower teeth + lip + chin, hinged at its rear-top edge. It is 0.003 wider each side than the gap so its flanks
     tuck under the cheek blocks (no open seam on the grind), and its front sits 0.004 back so the grind (corner travel
     ~0.002) slides behind the cheeks without ever reaching their plane */
  const JD = 0.47, JWT = JW + 0.006, JR = 0.004, ju = JWT / HW / 2;
  const jaw = HR.joint(neck, 0, -HH / 2 + JH, HD - JD);
  HR.at(jaw, box(JWT, JH, JD - JR, { all: M.head, pz: M.face, py: M.tongue, nz: M.tongue },
    withFront(tile(JWT, JH, JD, 0.45, 0.15), [0.5 - ju, 0, 0.5 + ju, F.split])), 0, -JH / 2, (JD - JR) / 2);
  /* snout disc, proud of the face; scale.z sniffs */
  const snout = HR.joint(neck, 0, (F.snoutY - 0.5) * HH, HD);
  /* the disc flares: its base where it meets the face is smaller (x .74, y .62) than its front, like a real snout's
     overhanging rim. The walls then lean back toward the face, so from the front or above they are edge-on or hidden
     (no lit shelf on top, no dark slab at the sides). Walls repeat the front's own edge pixels, pink skin top/bottom. */
  const sn = F.snout;
  const snM = HR.at(snout, box(0.233, 0.18, 0.05, { all: M.face, py: M.snTop, ny: M.rim, nz: M.rim }, { pz: sn,
    px: [sn[2], sn[1], sn[2] - 0.012, sn[3]], nx: [sn[0] + 0.012, sn[1], sn[0], sn[3]],
    py: [0.36, 0.578, 0.64, 0.565], ny: [0.36, 0.285, 0.64, 0.298], nz: [0.4, 0.4, 0.6, 0.5] }, false), 0, 0, 0.025);
  if (!GEO.snoutFlare) {
    const g = snM.geometry.clone(), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) < 0) p.setXY(i, p.getX(i) * 0.74, p.getY(i) * 0.62);
    g.computeVertexNormals();
    GEO.snoutFlare = g;
  }
  snM.geometry = GEO.snoutFlare;
  /* blink plates: upper-lid skin cropped from just above each eye, pivot at the top edge */
  function lidPlate(e) {
    const w = F.lidW * HW, h = F.lidH * HH;
    const j = HR.joint(neck, (e[0] - 0.5) * HW, (e[1] - 0.5) * HH + h / 2, HD + 0.006);
    const m = HR.at(j, box(w, h, 0.004, M.face, { pz: [e[0] - F.lidW / 2, e[1] + F.lidH / 2, e[0] + F.lidW / 2, e[1] + F.lidH * 1.5],
      px: [0, 0, 0.01, 0.01], nx: [0, 0, 0.01, 0.01], py: [0, 0, 0.01, 0.01], ny: [0, 0, 0.01, 0.01], nz: [0, 0, 0.01, 0.01] }, false), 0, -h / 2, 0);
    j.scale.y = 0.001; j.visible = false; return j;
  }
  const lidR = lidPlate(F.eyeR), lidL = lidPlate(F.eyeL);
  /* floppy ears hinged at the head's top front corners */
  function ear(side) {
    const j = HR.joint(neck, side * 0.205, HH / 2 - 0.01, HD - 0.11);
    const m = HR.at(j, new THREE.Mesh(earGeo(), M.ear), side * 0.04, 0.065, 0);
    m.castShadow = false; m.receiveShadow = true;   /* no shadow: a flap over the brow draws a hard line across the face */
    return j;
  }
  const earL = ear(1), earR = ear(-1);

  /* legs: FL, FR, HL, HR (hips space: body bottom = y 0, rear face = z 0) */
  const legs = [];
  [[0.26, 1.0], [-0.26, 1.0], [0.26, 0.20], [-0.26, 0.20]].forEach((p, i) => {
    const j = HR.joint(hips, p[0], 0, p[1]);
    HR.at(j, box(0.22, 0.27, 0.22, M.leg, HIDE ? legFlankUV(i) : tile(0.22, 0.27, 0.22, 0.17 * i, 0.31 * i)), 0, -0.135, 0);
    HR.at(j, box(0.23, 0.06, 0.23, M.trot, tile(0.23, 0.06, 0.23, 0.2 * i, 0.1)), 0, -0.30, 0);
    legs.push(j);
  });

  /* the fifth leg: swollen root lump on the back near the hips, upper + knee + lower + trotter */
  HR.at(hips, box(0.22, 0.06, 0.22, M.lump, tile(0.22, 0.06, 0.22, 0.4, 0.4)), 0.15, 0.56, 0.25);
  const xHip = HR.joint(hips, 0.15, 0.585, 0.25);
  HR.at(xHip, box(0.15, 0.28, 0.15, HIDE ? M.body : M.leg, tile(0.15, 0.28, 0.15, 0.55, 0.05, HIDE ? HIDE_D : undefined)), 0, 0.14, 0);
  const xKnee = HR.joint(xHip, 0, 0.28, 0);
  HR.at(xKnee, box(0.13, 0.24, 0.13, HIDE ? M.body : M.leg, tile(0.13, 0.24, 0.13, 0.15, 0.65, HIDE ? HIDE_D : undefined)), 0, 0.12, 0);
  HR.at(xKnee, box(0.15, 0.07, 0.15, M.trot, tile(0.15, 0.07, 0.15, 0.6, 0.6)), 0, 0.275, 0);

  /* curly tail: two boxes at stepped angles */
  const tail1 = HR.joint(hips, 0, 0.44, -0.005);
  HR.at(tail1, box(0.05, 0.10, 0.05, M.body, tile(0.05, 0.1, 0.05, 0.3, 0.3)), 0, 0.05, 0);
  const tail2 = HR.joint(tail1, 0, 0.10, 0);
  HR.at(tail2, box(0.05, 0.10, 0.05, M.body, tile(0.05, 0.1, 0.05, 0.6, 0.2)), 0, 0.05, 0);

  /* ---------- animation state (preallocated; nothing is created per frame) ---------- */
  const REST_U = -0.5, REST_UZ = -0.4, REST_K = -0.95;
  const st = {
    healT: 0, healNext: 1.5,
    init: false, R: null, walkPh: 0, chewPh: 0,
    sit: 0, sitting: false, idleT: 0, nextIdle: 4, firstSit: true, sitT: 0, sitDur: 6,
    sniffT: 0, sniffNext: 2.5, blinkT: -1, blinkNext: 2, earNext: 1.5, tailNext: 2,
    kickT: -1, kickAmp: 1, kickDur: 0.1, kickNext: 3,
    prevHurt: 0, prevY: 0.33, velY: 0, prevPX: 0, velPX: 0, prevSpeed: 0,
    pU: { a: 0, v: 0 }, pUz: { a: 0, v: 0 }, pL: { a: 0, v: 0 }, eL: { a: 0, v: 0 }, eR: { a: 0, v: 0 }, tl: { a: 0, v: 0 },
    hYaw: 0, hPitch: 0, prevHYaw: 0, prevHPitch: 0, hVel: 0, deadKick: 0, roll: 0,
  };
  function kick(amp, dur) { st.kickT = 0; st.kickAmp = amp; st.kickDur = dur || 0.1; }

  function update(dt, t, s) {
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.1);
    st.healT += dt; if (st.healT >= st.healNext && st.healNext < 40) { st.healNext += 2; heal(HL); }
    if (!st.init) { st.init = true; st.R = rng(s.seed || 1); st.nextIdle = 3.5 + st.R() * 1.5; st.kickNext = 2.5 + st.R() * 1.5; }
    const R = st.R, seed = s.seed || 1;
    const dead = s.dead || 0, alive = dead <= 0;
    const speed = alive ? clamp(s.speed || 0, 0, 1) : 0;
    const hurt = s.hurt || 0;

    /* --- idle state machine: sit 1 in 5 idles (first idle always), 4-8 s --- */
    if (!alive || speed > 0.15 || hurt > 0.5) { st.sitting = false; st.idleT = 0; }
    else if (st.sitting) { st.sitT += dt; if (st.sitT > st.sitDur) { st.sitting = false; st.idleT = 0; st.nextIdle = 5 + R() * 4; } }
    else {
      st.idleT += dt;
      if (st.idleT > st.nextIdle) {
        st.idleT = 0; st.nextIdle = 5 + R() * 4;
        if (st.firstSit || R() < 0.2) { st.firstSit = false; st.sitting = true; st.sitT = 0; st.sitDur = 4 + R() * 4; }
      }
    }
    st.sit += ((st.sitting ? 1 : 0) - st.sit) * Math.min(1, dt * (alive ? 2.6 : 8));
    const k = smooth(st.sit);

    /* --- walk / trot --- */
    st.walkPh += dt * 10.5 * Math.min(1, 0.25 + speed);
    const sw = Math.sin(st.walkPh) * 0.6 * speed;
    const bob = 0.022 * speed * (1 - Math.cos(2 * st.walkPh)) * 0.5;
    const breath = Math.sin(t * 2.1 + seed) * 0.006;

    /* --- body: sit = pitch 35 deg about the rear-bottom edge, rump down to the ground --- */
    const flinch = hurt * hurt;
    hips.position.y = 0.33 + (0.075 - 0.33) * k + bob - 0.03 * flinch;
    hips.rotation.x = -0.61 * k + 0.05 * flinch * Math.sin(t * 45);
    hips.rotation.z = 0.04 * flinch * Math.sin(t * 38);
    bodyM.scale.set(1 + breath * 0.5, 1 + breath, 1);

    /* legs: trot, or sit (hinds fold forward flat, fronts hang straight like a man's arms) */
    for (let i = 0; i < 4; i++) {
      const front = i < 2, diag = (i === 0 || i === 3) ? 1 : -1;
      let a = sw * diag;
      if (front) a = a * (1 - k) + (0.61 + 0.12) * k + 0.04 * k * Math.sin(t * 1.3 + i);
      else a = a * (1 - k) + (-0.96) * k;
      legs[i].rotation.x = a;
      legs[i].rotation.z = front ? 0 : (i === 2 ? -0.12 : 0.12) * k;
    }

    /* --- head look (lagged), bob, squeal shake --- */
    const ty = clamp(s.yaw || 0, -0.8, 0.8) * (1 - 0.5 * speed) * (alive ? 1 : 0);
    const tp = clamp(s.pitch || 0, -0.4, 0.4) * (alive ? 1 : 0);
    st.hYaw += (ty - st.hYaw) * Math.min(1, dt * 4.5);
    st.hPitch += (tp - st.hPitch) * Math.min(1, dt * 4.5);
    const hAcc = ((st.hYaw - st.prevHYaw) + (st.hPitch - st.prevHPitch)) / dt;
    const hAngAcc = clamp((hAcc - st.hVel) / dt, -60, 60); st.hVel = hAcc; st.prevHYaw = st.hYaw; st.prevHPitch = st.hPitch;
    neck.rotation.y = st.hYaw + 0.035 * flinch * Math.sin(t * 61);
    neck.rotation.x = st.hPitch + 0.61 * k * 0.9 + 0.07 * speed * Math.sin(2 * st.walkPh) - 0.18 * flinch + (alive ? 0 : 0.15 * smooth(dead / 0.3));

    /* --- chewing: constant, 1.5 Hz, side-to-side grind; hurt drops the jaw 0.35 to show the full grin --- */
    st.chewPh += dt * Math.PI * 2 * 1.5 * (alive ? 1 : 0);
    const chew = 0.022 * (1 - Math.cos(st.chewPh));
    const open = Math.max(chew * (1 - k * 0.2), 0.35 * Math.min(1, hurt * 2.2), alive ? 0 : 0.22 * smooth(dead / 0.3));
    jaw.rotation.x = open;
    jaw.rotation.y = alive ? 0.012 * Math.sin(st.chewPh) : 0;
    jaw.rotation.z = alive ? 0.022 * Math.sin(st.chewPh) : 0;

    /* sniff bursts: snout scale.z 1 -> 1.15 at 3 Hz for 0.5 s */
    st.sniffNext -= dt;
    if (st.sniffNext <= 0 && alive) { st.sniffT = 0.5; st.sniffNext = 3 + R() * 5; }
    let sn = 0;
    if (st.sniffT > 0) { st.sniffT -= dt; sn = 0.5 - 0.5 * Math.cos((0.5 - st.sniffT) * Math.PI * 2 * 3); }
    snout.scale.set(1 + 0.03 * sn + 0.06 * hurt, 1 + 0.03 * sn + 0.06 * hurt, 1 + 0.15 * sn);

    /* slow, heavy blinks (close 0.14 s, hold 0.12, open 0.26); half-lidded once dead */
    st.blinkNext -= dt;
    if (st.blinkNext <= 0 && st.blinkT < 0) { st.blinkT = 0; st.blinkNext = 3.2 + R() * 3.5; }
    let lid = 0;
    if (st.blinkT >= 0) {
      const b = st.blinkT; st.blinkT += dt;
      lid = b < 0.14 ? smooth(b / 0.14) : b < 0.26 ? 1 : b < 0.52 ? 1 - smooth((b - 0.26) / 0.26) : 0;
      if (b >= 0.52) st.blinkT = -1;
    }
    if (!alive) lid = Math.max(lid * (1 - dead), 0.55 * smooth(dead / 0.5));
    lidL.scale.y = lidR.scale.y = Math.max(0.001, lid);
    lidL.visible = lidR.visible = lid > 0.02;

    /* --- body accelerations (drive every dangling part); s.accel adds game motion if supplied --- */
    const vy = (hips.position.y - st.prevY) / dt; let ay = (vy - st.velY) / dt; st.velY = vy; st.prevY = hips.position.y;
    const vp = (hips.rotation.x - st.prevPX) / dt; let ap = (vp - st.velPX) / dt; st.velPX = vp; st.prevPX = hips.rotation.x;
    let az = (speed - st.prevSpeed) / dt * 2.5; st.prevSpeed = speed;
    if (s.accel) { az += s.accel.z * 0.15; ay += s.accel.y * 0.15; }
    ay = clamp(ay, -60, 60); ap = clamp(ap, -80, 80); az = clamp(az, -30, 30);

    /* --- fifth leg: double pendulum + reflex kicks --- */
    if (alive) {
      st.kickNext -= dt;
      if (st.kickNext <= 0) { kick(1, 0.1); st.kickNext = 10 + R() * 10; }
      if (hurt > st.prevHurt + 0.2) kick(1.15, 0.08);
      if (s.woodHit || s.fired) kick(1, 0.1);
      st.deadKick = 0;
    } else {
      /* corpse: three slow kicks, the last thing moving */
      if (st.deadKick < 3 && dead >= DEAD_KICKS[st.deadKick]) { kick(1 - st.deadKick * 0.2, 0.22); st.deadKick++; }
    }
    st.prevHurt = hurt;
    const flail = speed * 30 * noise(t * 5.5, seed * 3 + 1);
    let tU = 0, kU = 18, tK = 0, kK = 30;
    if (st.kickT >= 0) {
      st.kickT += dt;
      if (st.kickT < st.kickDur) { tU = -0.8 * st.kickAmp; kU = 420; tK = 1.05 * st.kickAmp; kK = 300; }
      else st.kickT = -1;
    }
    const vU0 = st.pU.v;
    pend(st.pU, dt, kU, 2.5, tU, 1.2 * ay * Math.sin(REST_U) - 1.4 * az - 1.0 * ap + flail, -1.0, 0.9);
    const uAcc = clamp((st.pU.v - vU0) / dt, -200, 200);
    pend(st.pUz, dt, 18, 2.5, 0, 0.6 * ay * Math.sin(REST_UZ) + 0.6 * flail * noise(t * 4, seed + 9), -0.6, 0.6);
    pend(st.pL, dt, kK, 3, tK, -0.8 * uAcc + 0.5 * ay - 0.5 * ap + 0.6 * flail, -0.7, 1.3);
    xHip.rotation.x = REST_U + 0.35 * k + st.pU.a;
    xHip.rotation.z = REST_UZ + st.pUz.a;
    xKnee.rotation.x = REST_K + st.pL.a;

    /* --- ears: floppy pendulums + flicks; pinned back when hurt --- */
    st.earNext -= dt;
    if (st.earNext <= 0 && alive) { if (R() < 0.5) st.eL.v -= 9; else st.eR.v -= 9; st.earNext = 1.5 + R() * 4; }
    const eDrive = -0.6 * ay - 0.8 * ap - 0.15 * hAngAcc + speed * 12 * noise(t * 7, seed + 4);
    pend(st.eL, dt, 40, 5, -0.7 * hurt, eDrive, -1.0, 0.7);
    pend(st.eR, dt, 40, 5, -0.7 * hurt, eDrive * 0.9, -1.0, 0.7);
    earL.rotation.set(0.85 + st.eL.a, 0, -0.32);
    earR.rotation.set(0.85 + st.eR.a, 0, 0.32);

    /* --- curly tail: idle twitch-wags --- */
    st.tailNext -= dt;
    if (st.tailNext <= 0 && alive) { st.tl.v += (R() < 0.5 ? -1 : 1) * 14; st.tailNext = 1 + R() * 3; }
    pend(st.tl, dt, 60, 2, 0, speed * 30 * Math.sin(st.walkPh * 2), -0.9, 0.9);
    tail1.rotation.set(-0.85, 0, st.tl.a);
    tail2.rotation.set(1.7, 0, 0.7 + st.tl.a * 0.5);

    /* --- death: rolls onto its right side with a small settle bounce; legs go stiff --- */
    if (!alive) {
      const r = dead / 0.28;
      let roll = r < 1 ? r * r : 1 + 0.07 * Math.exp(-(r - 1) * 3) * Math.sin((r - 1) * 9);
      st.roll = roll;
      rollG.rotation.z = roll * Math.PI / 2;
      const twitch = dead < 0.45 ? Math.sin(t * 16) * 0.25 * (0.45 - dead) / 0.45 : 0;
      for (let i = 0; i < 4; i++) legs[i].rotation.x = (i < 2 ? 0.15 : -0.12) + twitch * (i % 2 ? 1 : -1);
    } else { rollG.rotation.z = 0; st.roll = 0; }
  }

  return {
    root, update, mats,
    handles: { head: neck, body: hips, jaw, snout, extraLeg: xHip, extraKnee: xKnee, legs, lL: legs[2], lR: legs[3], aL: legs[0], aR: legs[1], tail: tail1 },
    deathDur: 3,
  };
};
})();

