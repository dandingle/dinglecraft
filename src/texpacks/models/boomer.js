/* BOOMER — "The Harvestman" (Hyperreal pack). Release 1.0: the body is a walking powder KEG.
   An oak keg (staves and two rusty iron hoops) carried at head height on four long harvestman legs that end in filthy
   human feet. Real eyeballs dart at the back of two holes bored in the keg's front; a zig-zag grin is burnt in below
   them, and a short fuse on the lid spits sparks while it is primed.
   Fuse (everything is a function of s.fuse, so it reverses for free when the fuse decays):
     0-0.3 crouch · 0.2-0.9 the chest splits like wardrobe doors onto a gunpowder sac glowing like a coal
     (pulse 2->12 Hz) · last 0.4 s it rises en pointe on all four human feet, head back, eyes rolled up.
   Defuse: doors slam shut with a bounce and the body shudders.
   Preview keys: F = fuse / defuse (the signature moment), H = hurt (buckle + pop, eyes squash),
   K = die (legs splay one at a time, toes twitch), W = walk (diagonal gait, toes curl on each plant). */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS) return;
const clamp = HR.clamp;
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const TAU = Math.PI * 2;

/* ---- measured from final_ent (1024² sources; u = x/1024, v = 1 - y/1024) ----
   face_boomer   the keg front (tools/art/texpacks/r1_local_art.py, made from the plank and chest-strap tiles): two round
                 bored holes, each the circle inscribed in its box below, minus 4 px (the cut is inset 6 px more, so the
                 charred rims are never sliced): image-left hole = model's RIGHT (-x), image-right = model's LEFT (+x);
                 the burnt zig-zag grin (painted, not cut) runs x 318-706, y 638-706; iron hoops y 84-164 and 860-940
   keg_staves    the same staves and hoops without the face (head sides, the chest doors), mapped once per face
   eye_human     iris centre (.5,.5), radius ~.295 uv, pupil radius ~.103; planar-projected onto the sphere
   foot_top      instep v 0-.70 (heel at the back edge, toes forward); toe columns at the top edge (white
                 background only BETWEEN them): x 10-280 (big), 370-590, 595-790, 795-1000 -> u crops below.
                 Toenails are cropped out of the photo, so they are modelled (long, thick, yellow, curling).
   boomer_core   glowing sac fills u .25-.75, v .30-.72 -> core front crop u .15-.85, v .12-.92 */
const EYE_HOLES = [[150, 377, 270, 436], [647, 877, 269, 435]];   /* x0,x1,y0,y1 px: the boxes the round holes sit in */
const MASK_INSET = 6;
const HOLE = EYE_HOLES.map(([x0, x1, y0, y1]) => ({
  x: -0.25 + (x0 + x1) / 2048 * 0.5, y: (1 - (y0 + y1) / 2048) * 0.5,
  w: (x1 - x0) / 1024 * 0.5, h: (y1 - y0) / 1024 * 0.5,
}));
const IRIS_SCALE = 0.9;            /* iris fills ~2/3 of the visible disc: an eye peering out, not a googly eye */
const UV_INSTEP = [0, 0.70, 1, 0.0];      /* (old foot_top) py face v runs back(1)->front(0): heel v 0 at the back, v .70 at the toes */
/* foot_bare_top (tools/build_cloth.py): the uncropped H12 foot photo, toes + real nails intact, the studio grey between the toes
   darkened to crevice. Measured on it (u = x, v = 1 - y): toe columns / tips / bases below; instep full width u .03-.96 below
   v .66, narrowing to u .13-.92 at the cut (v 0). foot_bare_side: heel (u 0) -> toes (u 1), calloused grimy sole rim at v 0-.3.
   Big toe on the image LEFT; the toe boxes put it on +x for mir 0, so mir 0 takes every top crop flipped. */
const BARE = true;
const TOES = [[0.05, 0.10, 0.058, 0.03, 0.33, 0.985, 0.70], [0.032, 0.094, 0.05, 0.375, 0.525, 0.965, 0.70], [0.032, 0.086, 0.047, 0.545, 0.70, 0.92, 0.68],
              [0.032, 0.077, 0.044, 0.69, 0.84, 0.835, 0.62], [0.032, 0.066, 0.04, 0.825, 0.955, 0.73, 0.53]];   /* w, l, h, u0, u1, v tip, v base */
const NAILS = [[0.098, 0.286, 0.971, 0.855], [0.413, 0.535, 0.964, 0.917], [0.584, 0.683, 0.917, 0.85], [0.714, 0.813, 0.829, 0.782], [0.86, 0.929, 0.725, 0.68]];   /* u0, u1, v tip, v cuticle */
const INSTEP_FORE = [0.03, 0.62, 0.96, 0.34], INSTEP_HEEL = [0.14, 0.35, 0.90, 0.0];
/* instep top slopes up from the ball of the foot to the ankle and rounds off at the heel (a flat slab read as a plank) */
const TOP_FRONT = 0.052, TOP_ANKLE = 0.104, TOP_HEEL = 0.085, SIDE_H = 0.11, DOME = 0.42, TOE_DOME = 0.5;
const topY = z => z >= -0.13 ? TOP_FRONT + (TOP_ANKLE - TOP_FRONT) * (-z / 0.13) : TOP_ANKLE + (TOP_HEEL - TOP_ANKLE) * Math.min(1, (-z - 0.13) / 0.13);
const TOE_SIDE = [0.84, 0.06, 0.98, 0.42];
const TOE_GAP = 0.0035, FOOT_W = 0.19, FOOT_L = 0.26, FOOT_H = 0.07, TOE_Y = 0.03;
const ANK_Y = 0.04, ANK_Z = -0.19;        /* ankle above the back quarter of the instep */
const UV_CORE = [0.15, 0.12, 0.85, 0.92];

/* ---- rig (bible §6) ---- */
const BODY_Y = 0.85, HEAD_Y = 0.30, HIP_Y = -0.28;
const L1 = 0.94, L2 = 1.21, SHIN = 0.28, SHIN_W = 0.085, EYE_R = 0.035;
const SOCK_D = 0.18;                       /* eyes sit 0.02 deeper than first built: the rim shades their top half */
/* roll: which way each dead foot flops onto its side (the knee curls the same way, flat on the ground) */
const LEGS = [{ sx: 1, sz: 1, ph: 0, die: 0, roll: 1 }, { sx: -1, sz: 1, ph: 0.5, die: 2, roll: -1 },
              { sx: 1, sz: -1, ph: 0.5, die: 3, roll: -1 }, { sx: -1, sz: -1, ph: 0, die: 1, roll: 1 }];
const ANKLE = [0.95, 0.85];
const DOOR_OPEN = 1.1, DUTY = 0.62, STRIDE = 0.45, GAIT_HZ = 0.9;
const DEATH_DUR = 2.6;

/* ---- shared geometry (cached by dims + crop; spawned boomers share it) ---- */
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
/* subdivided box with per-face UV crops picked by normal (cropUV assumes one quad per face) */
function segBox(w, h, d, ws, hs, ds, uv) {
  const g = new THREE.BoxGeometry(w, h, d, ws, hs, ds), N = g.attributes.normal, U = g.attributes.uv;
  if (uv) for (let i = 0; i < U.count; i++) {
    const nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
    const f = nx > 0.5 ? 'px' : nx < -0.5 ? 'nx' : ny > 0.5 ? 'py' : ny < -0.5 ? 'ny' : nz > 0.5 ? 'pz' : 'nz', c = uv[f];
    if (c) U.setXY(i, c[0] + U.getX(i) * (c[2] - c[0]), c[1] + U.getY(i) * (c[3] - c[1]));
  }
  return g;
}
/* merge indexed geometries, keeping each one's 6 material groups (material index offset per part) */
function merge(key, parts) {
  if (GEO[key]) return GEO[key];
  const P = [], N = [], U = [], I = [], G = []; let vo = 0, io = 0, mo = 0;
  for (const g of parts) {
    const p = g.attributes.position.array, n = g.attributes.normal.array, u = g.attributes.uv.array, ix = g.index.array;
    for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(n[i]); }
    for (let i = 0; i < u.length; i++) U.push(u[i]);
    for (let i = 0; i < ix.length; i++) I.push(ix[i] + vo);
    let mx = 0; for (const gr of g.groups) { G.push([gr.start + io, gr.count, gr.materialIndex + mo]); mx = Math.max(mx, gr.materialIndex); }
    vo += p.length / 3; io += ix.length; mo += mx + 1;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  out.setIndex(I); for (const gr of G) out.addGroup(gr[0], gr[1], gr[2]);
  return GEO[key] = out;
}
/* merge parts into one geometry with their transforms baked in, regrouping faces so every material is ONE draw
   call (a 6-face box with two materials draws twice, not six times). parts: {g, m: index | [per-group index],
   x, y, z, rx, ry, rz}. Built once per key at load (never per frame); boomers spawn in groups. */
function build(key, parts) {
  if (GEO[key]) return GEO[key];
  const P = [], N = [], U = [], buckets = []; let vo = 0;
  const M4 = new THREE.Matrix4(), NM = new THREE.Matrix3(), E = new THREE.Euler(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  for (const pt of parts) {
    const g = pt.g, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, ix = g.index.array;
    M4.compose(V.set(pt.x || 0, pt.y || 0, pt.z || 0), Q.setFromEuler(E.set(pt.rx || 0, pt.ry || 0, pt.rz || 0)), ONE);
    NM.getNormalMatrix(M4);
    for (let i = 0; i < p.count; i++) {
      V.fromBufferAttribute(p, i).applyMatrix4(M4); P.push(V.x, V.y, V.z);
      V.fromBufferAttribute(n, i).applyMatrix3(NM).normalize(); N.push(V.x, V.y, V.z);
      U.push(u.getX(i), u.getY(i));
    }
    const groups = g.groups.length ? g.groups : [{ start: 0, count: ix.length, materialIndex: 0 }];
    for (const gr of groups) {
      const mi = Array.isArray(pt.m) ? pt.m[gr.materialIndex] : (pt.m || 0);
      const b = buckets[mi] || (buckets[mi] = []);
      for (let k = gr.start; k < gr.start + gr.count; k++) b.push(ix[k] + vo);
    }
    vo += p.count;
  }
  const out = new THREE.BufferGeometry(), I = [];
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  for (let mi = 0; mi < buckets.length; mi++) { const b = buckets[mi]; if (!b || !b.length) continue; out.addGroup(I.length, b.length, mi); for (let k = 0; k < b.length; k++) I.push(b[k]); }
  out.setIndex(I);
  return GEO[key] = out;
}
/* face index map for a box: which material slot each of px,nx,py,ny,pz,nz uses */
function fm(o, def) { return ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(k => o[k] !== undefined ? o[k] : def); }
/* one foot: instep (top = the photo, heel at the back) and five toes with long yellow nails curling over the tips.
   Mirrored for the -x legs so each pair is symmetric (big toe on the same side of both).
   Slots: 0 photo top, 1 skin, 2 foot side (BARE) */
const OLD_TOE_U = [[0.02, 0.27], [0.37, 0.57], [0.59, 0.77], [0.78, 0.97], [0.82, 0.96]];
const flipU = (c, f) => f ? [c[2], c[1], c[0], c[3]] : c;
function instepGeo(mir) {
  const key = 'instepW' + mir;
  if (GEO[key]) return GEO[key];
  /* wide forefoot + narrower heel (a foot's taper, so it doesn't read as a peg); the photo runs on across both */
  const fl = 0.13, hl = FOOT_L - fl + 0.01, hw = 0.145, hu = (1 - hw / FOOT_W) / 2;
  const side = { px: [0, 0, 0.26, 0.09], nx: [0.4, 0.2, 0.66, 0.29], pz: [0.1, 0.5, 0.3, 0.59], nz: [0.6, 0.6, 0.8, 0.69] };
  const fp = BARE ? flipU(INSTEP_FORE, !mir) : (mir ? [1, 0.70, 0, 0.35] : [0, 0.70, 1, 0.35]);
  const hp = BARE ? flipU(INSTEP_HEEL, !mir) : (mir ? [1 - hu, 0.36, hu, 0] : [hu, 0.36, 1 - hu, 0]);
  const fore = BARE ? segBox(FOOT_W, FOOT_H, fl, 8, 1, 4, Object.assign({}, side, { py: fp, pz: [fp[0], fp[1], fp[2], fp[1] + 0.05] })) : boxGeo(FOOT_W, FOOT_H, fl, Object.assign({ py: fp }, side));
  const heel = BARE ? segBox(hw, FOOT_H, +hl.toFixed(3), 8, 1, 4, Object.assign({ py: hp }, side)) : boxGeo(hw, FOOT_H, +hl.toFixed(3), Object.assign({ py: hp }, side));
  if (BARE) {
    /* dome each box across its own width first (the top curves down to a lower edge, like the top of a real foot) */
    for (const [bg, bw] of [[fore, FOOT_W], [heel, hw]]) {
      const P = bg.attributes.position;
      for (let i = 0; i < P.count; i++) if (P.getY(i) > 0) { const ax = Math.abs(P.getX(i)) / (bw / 2); P.setY(i, -FOOT_H / 2 + FOOT_H * (1 - DOME * ax * ax)); }
    }
  }
  const slots = BARE ? fm({ py: 0, px: 2, nx: 2, nz: 2 }, 1) : fm({ py: 0 }, 1);
  const g = build('instep' + mir, [{ g: fore, m: BARE ? fm({ py: 0, pz: 0, px: 2, nx: 2, nz: 2 }, 1) : slots, y: FOOT_H / 2, z: -fl / 2 },
    { g: heel, m: slots, y: FOOT_H / 2 + 0.0005, z: -FOOT_L + hl / 2 }]);
  if (BARE) {
    /* then slope it (ball -> ankle -> heel) and map the side photo by position: heel at u 0, sole rim at v 0 */
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = N.getX(i), nz = N.getZ(i);
      const yt = y > FOOT_H * 0.3 ? topY(z) * y / FOOT_H : y;
      P.setY(i, yt);
      if (Math.abs(nx) > 0.5) U.setXY(i, 0.04 + 0.92 * (z + FOOT_L) / FOOT_L, 0.06 + 0.8 * yt / SIDE_H);
      else if (nz < -0.5) U.setXY(i, 0.02 + 0.22 * (x / hw + 0.5), 0.06 + 0.8 * yt / SIDE_H);
    }
    g.computeVertexNormals();
  }
  return GEO[key] = g;
}
/* kneecap: a flattened sphere with the photo's own creased toe-knuckle (toe 4, px 830-980 x 20-240: clean skin,
   horizontal creases) projected on its face; local z = out of the bend, y = up the leg, so the creases run across */
const KNEE_R = 0.07, KNEE_CROP = [0.81, 0.766, 0.957, 0.98];
function kneeGeo() {
  if (GEO.knee) return GEO.knee;
  const g = new THREE.SphereGeometry(KNEE_R, 16, 12), P = g.attributes.position, U = g.attributes.uv, C = KNEE_CROP;
  const cu = (C[0] + C[2]) / 2, cv = (C[1] + C[3]) / 2, hu = (C[2] - C[0]) / 2, hv = (C[3] - C[1]) / 2;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) / KNEE_R, y = P.getY(i) / KNEE_R, z = P.getZ(i) / KNEE_R;
    if (z >= 0) U.setXY(i, cu + hu * x, cv + hv * y);
    else { const l = Math.hypot(x, y) || 1e-6; U.setXY(i, cu + hu * x / l, cv + hv * y / l); }
  }
  g.scale(0.85, 0.95, 0.8);   /* a swollen knot that envelops the joint (a cap perched on the thin leg read as a mushroom) */
  return GEO.knee = g;
}
function toesGeo(mir) {
  const parts = []; let x = FOOT_W / 2;
  for (let i = 0; i < 5; i++) {
    const [w, l, h, u0, u1, vt, vb] = TOES[i];
    const cx = (x - w / 2) * (mir ? -1 : 1); x -= w + TOE_GAP;
    const top = BARE ? flipU([u0, vt, u1, vb], !mir) : (mir ? [OLD_TOE_U[i][1], 0.99, OLD_TOE_U[i][0], 0.75] : [OLD_TOE_U[i][0], 0.99, OLD_TOE_U[i][1], 0.75]);
    const sideUV = BARE ? { px: TOE_SIDE, nx: TOE_SIDE, pz: TOE_SIDE } : { px: [0.1, 0.2, 0.18, 0.26], nx: [0.5, 0.3, 0.58, 0.36], pz: [0.3, 0.6, 0.35, 0.65] };
    let tg;
    if (BARE) {   /* rounded toe: the top domes down to the sides and the tip rounds off */
      tg = segBox(w, h, l, 4, 1, 3, Object.assign({ py: top }, sideUV));
      const P = tg.attributes.position;
      for (let k = 0; k < P.count; k++) {
        const ax = Math.abs(P.getX(k)) / (w / 2), az = Math.max(0, P.getZ(k) / (l / 2));
        if (P.getY(k) > 0) P.setY(k, h / 2 - h * (TOE_DOME * ax * ax + 0.18 * az * az * az));
      }
      tg.computeVertexNormals();
    } else tg = boxGeo(w, h, l, Object.assign({ py: top }, sideUV));
    parts.push({ g: tg, m: BARE ? fm({ py: 0, px: 3, nx: 3, pz: 3 }, 1) : fm({ py: 0 }, 1), x: cx, y: h / 2 - TOE_Y, z: l / 2 });
    /* nail: thick plate over the last 45 % of the toe, overhanging the tip and curling down; its top is the toe's own photographed nail */
    const nl = 0.45 * l + 0.014, nc = NAILS[i];
    const plate = boxGeo(+(w * 0.78).toFixed(4), 0.009, +nl.toFixed(4), BARE ? { py: flipU([nc[0], nc[2], nc[1], nc[3]], !mir) } : undefined);
    parts.push({ g: plate, m: BARE ? fm({ py: 0 }, 2) : 2, x: cx, y: h - TOE_Y + 0.001, z: l - nl / 2 + 0.012, rx: 0.1 });
    parts.push({ g: boxGeo(+(w * 0.7).toFixed(4), 0.02, 0.008), m: 2, x: cx, y: h - TOE_Y - 0.012, z: l + 0.013, rx: 0.3 });   /* the curl over the tip */
  }
  return build('toes' + mir, parts);
}

/* bare shin: a slightly tapered 9-sided prism (a square post read as a stick of timber), skin_arm wrapped at ~1.2 tiles/block */
function shinGeo() {
  if (GEO.shin) return GEO.shin;
  const g = new THREE.CylinderGeometry(SHIN_W * 0.56, SHIN_W * 0.64, SHIN, 9, 1), U = g.attributes.uv;
  for (let i = 0; i < U.count; i++) U.setXY(i, 0.3 + U.getX(i) * Math.PI * SHIN_W * 0.6 * 1.2, 0.2 + U.getY(i) * SHIN * 1.2);
  return GEO.shin = g;
}
/* eyeball: the straight-on photo is projected planar onto the front hemisphere; the back maps to sclera */
function eyeGeo() {
  if (GEO.eye) return GEO.eye;
  const g = new THREE.SphereGeometry(EYE_R, 20, 14), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / EYE_R, y = p.getY(i) / EYE_R, z = p.getZ(i) / EYE_R;
    if (z >= 0) uv.setXY(i, 0.5 + 0.5 * IRIS_SCALE * x, 0.5 + 0.5 * IRIS_SCALE * y);
    else { const l = Math.hypot(x, y); if (l < 1e-3) uv.setXY(i, 0.5, 0.01); else uv.setXY(i, 0.5 + 0.49 * x / l, 0.5 + 0.49 * y / l); }
  }
  uv.needsUpdate = true;
  return GEO.eye = g;
}
/* half-rib: a tapered bone fang, thin tip at +x (flipped per door so it bites across the seam) */
function ribGeo() {
  if (GEO.rib) return GEO.rib;
  const g = new THREE.CylinderGeometry(0.008, 0.019, 0.16, 7, 1); g.rotateZ(-Math.PI / 2);
  return GEO.rib = g;
}
/* alpha mask: the two round eye holes only (the grin stays painted) */
let MASK = null;
function eyeMask() {
  if (MASK) return MASK;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#000';
  for (const [x0, x1, y0, y1] of EYE_HOLES) { g.beginPath(); g.arc((x0 + x1) / 4, (y0 + y1) / 4, ((y1 - y0) / 2 - 4 - MASK_INSET) / 2, 0, TAU); g.fill(); }
  MASK = new THREE.CanvasTexture(c);
  return MASK;
}
/* tiled crops for the seamless materials (D tiles per block), offset per part so boxes don't repeat */
function tile(w, h, d, ou, ov, D) {
  D = D || 1.5;
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
const hash = n => { const x = Math.sin(n * 91.345 + 7.13) * 43758.5453; return x - Math.floor(x); };

/* The rig repairs only its cached base material when a texture fails to load (it nulls base.map); our
   per-instance clones still hold the dead texture and would render black. Every 0.5 s (for the life of the
   mob, not just the first 30 s) look for that case and retry the file once (shared across instances, carrying
   the clone's wrap/repeat; a map that doubles as emissiveMap follows it), else drop the map. */
const TEX_KEYS = ['map', 'normalMap', 'roughnessMap'];
const TEX_SUFFIX = { map: '_basecolor.png', normalMap: '_normal.png', roughnessMap: '_roughness.png' };
const RETRY = {};
function healMats(pairs) {
  if (HR.EMBEDDED) return;   /* embedded data URIs cannot drop, and take no ?retry= suffix */
  for (let i = 0; i < pairs.length; i++) {
    const c = pairs[i][0], b = pairs[i][1], id = pairs[i][2];
    for (let k = 0; k < 3; k++) {
      const key = TEX_KEYS[k], t = c[key];
      if (!t || b[key] || t.image) continue;          /* fine, or still loading */
      const url = HR.texURL(id, TEX_SUFFIX[key]);
      let r = RETRY[url];
      if (!r) {
        r = RETRY[url] = new THREE.TextureLoader().load(HR.retryURL(url), undefined, undefined, () => { r.failed = true; });
        r.anisotropy = t.anisotropy; r.wrapS = t.wrapS; r.wrapT = t.wrapT; r.repeat.copy(t.repeat);
        if (key === 'map') r.encoding = THREE.sRGBEncoding;
      }
      const nt = r.failed ? null : r;
      if (t === nt) continue;
      if (key === 'map' && c.emissiveMap === t) c.emissiveMap = nt;
      c[key] = nt; c.needsUpdate = true;
    }
  }
}

/* scratch (module-level, never allocated per frame) */
const Y = new THREE.Vector3(0, 1, 0);
const _kx = new THREE.Vector3(), _ky = new THREE.Vector3(), _kb = new THREE.Matrix4();
const _d = new THREE.Vector3(), _u = new THREE.Vector3(), _p = new THREE.Vector3();
const _H = new THREE.Vector3(), _A = new THREE.Vector3(), _K = new THREE.Vector3(), _E = new THREE.Vector3(), _pole = new THREE.Vector3();
/* analytic two-bone IK: hip H -> ankle A, knee bends toward `pole`. Writes knee K and reachable end E. */
function ik(H, A, la, lb, pole, K, E) {
  _d.subVectors(A, H); let d = _d.length();
  if (d < 1e-5) { _d.set(0, -1, 0); d = 1; }
  _u.copy(_d).divideScalar(d);
  d = clamp(d, Math.abs(la - lb) + 1e-3, la + lb - 1e-3);
  const a = (la * la - lb * lb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, la * la - a * a));
  _p.copy(pole).addScaledVector(_u, -pole.dot(_u));
  if (_p.lengthSq() < 1e-8) _p.set(0, 1, 0).addScaledVector(_u, -_u.y);
  _p.normalize();
  K.copy(H).addScaledVector(_u, a).addScaledVector(_p, h);
  E.copy(H).addScaledVector(_u, d);
}
/* place a Y-aligned box between two points */
function span(m, a, b) {
  _d.subVectors(b, a); const l = _d.length();
  m.position.addVectors(a, b).multiplyScalar(0.5);
  if (l > 1e-6) m.quaternion.setFromUnitVectors(Y, _d.divideScalar(l));
}

HR.MODELS.boomer = function () {
  const mats = [];
  const pairs = [];   /* [clone, cached original, texture id]: the rig's load-failure fallback only patches the original */
  const own = (id, o) => { const m = HR.mat(id, o), c = m.clone(); mats.push(c); pairs.push([c, m, id]); return c; };
  const keep = (id, o) => { const m = HR.mat(id, o), c = m.clone(); pairs.push([c, m, id]); return c; };
  const R = rng(Math.floor(Math.random() * 1e6));

  /* ---- materials: per-instance clones (textures shared). Core, eyes and the fuse spark stay out of `mats`.
     Roughness compensates the map averages (mossflesh .59, rotflesh .455, skin .35): moss ~.47, wet insides
     ~.15, skin .55; bone has no map here (.6); the keg's own roughness map carries the oiled wood and the iron. ---- */
  const mStave = own('keg_staves', { rough: 1.0, roughMap: true, normalScale: 0.9, repeat: [1, 1], fallback: 0x7a5a3a });
  const mLegUp = own('mat_mossflesh', { color: 0x3e5a30, rough: 0.8, repeat: [1, 1] });
  const mLegLo = own('mat_mossflesh', { color: 0x4a6a3a, rough: 0.8, repeat: [1, 1] });
  const mInner = own('mat_rotflesh', { color: 0x5a1a14, rough: 0.33, repeat: [1, 1] });
  const mSocket = own('mat_rotflesh', { color: 0x2a1210, rough: 0.33, side: THREE.BackSide });
  const mGut = own('mat_rotflesh', { color: 0x4a1c16, rough: 0.5, repeat: [1, 1] });
  const mCoreSide = own('mat_rotflesh', { color: 0x3a1410, rough: 0.4 });
  const mBone = own('mat_bone', { color: 0xcfc0a0, rough: 0.6, roughMap: false });
  const mShin = BARE ? own('skin_arm', { color: 0xa4a2a0, rough: 0.55, roughMap: false, normalScale: 0.5, repeat: [1, 1] })   /* grey, hairy, grubby bare shins */
    : own('mat_skin', { color: 0xa89888, rough: 1.55, repeat: [1, 1] });
  const FOOT_O = { color: 0xc8bcb0, rough: 0.6, roughMap: false, normalScale: 0.6 };
  const BARE_O = { color: 0xdcdcdc, rough: 0.6, roughMap: false, normalScale: 0.5 };
  const mFootTop = BARE ? own('foot_bare_top', BARE_O) : own('foot_top', FOOT_O);
  const mFootSide = BARE ? own('foot_bare_side', { color: 0xdcd6d0, rough: 0.62, roughMap: false, normalScale: 0.8 }) : null;
  /* kneecaps: flattened human patellae in the old foot_top crop's knuckle skin, crease-tinted (textures shared) */
  const mKnee = HR.mat('foot_top', FOOT_O).clone(); mKnee.color.set(0xe0ccbc); mKnee.roughness = 0.7; mKnee.normalScale.set(1.1, 1.1);
  mats.push(mKnee); pairs.push([mKnee, HR.mat('foot_top', FOOT_O), 'foot_top']);
  const mNail = own('mat_bone', { color: 0xc9ad55, rough: 0.3, roughMap: false });
  const mFace = own('face_boomer', { rough: 0.62, roughMap: false, normalScale: 0.8, fallback: 0x7a5a3a });
  mFace.alphaMap = eyeMask(); mFace.alphaTest = 0.5;
  const mCore = keep('boomer_core', { rough: 0.25, roughMap: false, normalScale: 0.5, emissive: 0xff7a3a, emissiveIntensity: 0 });
  mCore.emissiveMap = mCore.map;
  /* eyes: dimmer sclera (#b8ac9c) so they peer out of the holes instead of reading as white googly eyes */
  const mEye = keep('eye_human', { color: 0xb8ac9c, rough: 0.05, roughMap: false, normal: false });
  mEye.emissiveMap = mEye.map; mEye.emissive.set(0x0e0c0c);   /* faint eyeshine so they read inside the dark holes */

  const root = new THREE.Group(); root.name = 'boomer';
  const body = HR.joint(root, 0, BODY_Y, 0);

  /* ---- 1-2 chest doors (the keg's front staves), hinged at the outer-back edge; 4-9 half-ribs interlace across the seam ---- */
  const D = 1.5, doors = [];
  for (const side of [1, -1]) {
    const j = HR.joint(body, 0.25 * side, 0, -0.18);
    const uL = side > 0 ? 0.5 : 0;                 /* the two doors share one keg face: staves continue across the seam, hoops top and bottom */
    const uv = {
      pz: [uL, 0, uL + 0.5, 1], nz: [0.5 - uL, 0, 1 - uL, 1],
      py: [uL, 0.32, uL + 0.5, 0.68], ny: [uL, 0.32, uL + 0.5, 0.68],
    };
    if (side > 0) { uv.px = [0.14, 0, 0.86, 1]; uv.nx = [0, 0, 0.54, 0.9]; }
    else { uv.nx = [0.14, 0, 0.86, 1]; uv.px = [0.3, 0.1, 0.84, 1.0]; }
    /* door + its three half-ribs as one mesh, 3 draws (moss, wet inner face, bone) */
    const ys = side > 0 ? [-0.15, 0.01, 0.17] : [-0.07, 0.09, 0.25];
    const parts = [{ g: boxGeo(0.25, 0.60, 0.36, uv), m: fm(side > 0 ? { nx: 1 } : { px: 1 }, 0), x: -0.125 * side, z: 0.18 }];
    for (const y of ys) parts.push({ g: ribGeo(), m: 2, x: -0.25 * side, y, z: 0.348, ry: -0.2 * side + (side > 0 ? Math.PI : 0) });
    j.add(mesh(build('door' + side, parts), [mStave, mInner, mBone], true));
    doors.push(j);
  }
  /* 3. gunpowder sac (own emissive material, not in mats) */
  const coreJ = HR.joint(body, 0, 0.01, 0);
  const core = mesh(build('core', [{ g: boxGeo(0.32, 0.42, 0.18, { pz: UV_CORE }), m: fm({ pz: 0 }, 1) }]), [mCore, mCoreSide], false);
  coreJ.add(core);
  /* stalk + pelvis hub (one merged mesh): holds the head up and the legs together when the doors open */
  const gStalk = new THREE.BoxGeometry(0.10, 0.62, 0.10); gStalk.translate(0, 0.02, -0.12);
  const gHub = new THREE.BoxGeometry(0.42, 0.07, 0.34); gHub.translate(0, -0.30, 0);
  const gut = mesh(merge('gut', [gStalk, gHub]), mGut, true); body.add(gut);

  /* ---- 10 head with alpha-cut eye holes, 11-12 BackSide sockets, 13-14 eyeballs ---- */
  const headJ = HR.joint(body, 0, HEAD_Y, 0); headJ.rotation.order = 'YXZ';
  const huv = { px: [0, 0, 1, 1], nx: [0, 0, 1, 1], nz: [0, 0, 1, 1], py: [0, 0.3, 1, 0.7], ny: [0, 0.3, 1, 0.7], pz: [0, 0, 1, 1] };
  const head = mesh(build('head', [{ g: boxGeo(0.5, 0.5, 0.5, huv), m: fm({ pz: 0 }, 1) }]), [mFace, mStave], true);
  head.position.y = 0.25; headJ.add(head);
  /* the fuse: a short tarred cord on the lid, a spark at its tip that only lives while the fuse burns */
  const fuseJ = HR.joint(headJ, 0.12, 0.5, -0.08); fuseJ.rotation.set(-0.35, 0, -0.3);
  const cord = mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.12, 6), HR.flat(0x241a12, { rough: 0.9 }), false); cord.position.y = 0.06; fuseJ.add(cord);
  const spark = mesh(new THREE.SphereGeometry(0.022, 8, 6), HR.flat(0xffc060, { rough: 0.4, emissive: 0xffa030, emissiveIntensity: 4 }), false);
  spark.position.y = 0.125; spark.visible = false; fuseJ.add(spark);
  const eyes = [];
  for (const hl of HOLE) {
    const sock = mesh(boxGeo(+(hl.w + 0.012).toFixed(4), +(hl.h + 0.012).toFixed(4), SOCK_D), mSocket, false);
    sock.position.set(hl.x, hl.y, 0.25 - SOCK_D / 2); headJ.add(sock);
    const ej = HR.joint(headJ, hl.x, hl.y, 0.25 - SOCK_D + EYE_R + 0.006); ej.rotation.order = 'YXZ';
    const eye = mesh(eyeGeo(), mEye, false); ej.add(eye);
    eyes.push({ j: ej, m: eye, y: 0, yv: 0, p: 0, pv: 0 });
  }

  /* ---- 15-38 four legs x (upper, kneecap, lower, shin, instep, toes+nails) ---- */
  const legs = LEGS.map((L, i) => {
    const up = mesh(boxGeo(0.09, L1, 0.09, tile(0.09, L1, 0.09, 0.1 * i, 0.05, D)), mLegUp, false);
    const lo = mesh(boxGeo(0.075, L2, 0.075, tile(0.075, L2, 0.075, 0.2 + 0.1 * i, 0.0, D)), mLegLo, false);
    const knee = mesh(kneeGeo(), mKnee, false);   /* flat patella, faces out along the bend */
    root.add(up); root.add(lo); root.add(knee);
    const dx = L.sx * ANKLE[0], dz = L.sz * ANKLE[1], dl = Math.hypot(dx, dz);
    const foot = new THREE.Group(); foot.rotation.order = 'YXZ'; root.add(foot);
    const heading = Math.atan2(dx, dz);
    /* a filthy human foot, 1.5x: instep (heel → toes along the foot's +z) and five toes with yellow nails */
    const mir = L.sx < 0 ? 1 : 0;
    const instepJ = HR.joint(foot, 0, 0, 0);
    instepJ.add(mesh(instepGeo(mir), BARE ? [mFootTop, mShin, mFootSide] : [mFootTop, mShin], false));
    const toesJ = HR.joint(foot, 0, TOE_Y, 0);
    toesJ.add(mesh(toesGeo(mir), BARE ? [mFootTop, mShin, mNail, mFootSide] : [mFootTop, mShin, mNail], false));
    const shin = mesh(BARE ? shinGeo() : boxGeo(SHIN_W, SHIN, SHIN_W, tile(SHIN_W, SHIN, SHIN_W, 0.3, 0.2, 1.2)), mShin, false);
    foot.add(shin);
    return { L, up, lo, knee, foot, instepJ, toesJ, shin, heading, rx: dx / dl, rz: dz / dl,
             hip: new THREE.Vector3(0.20 * L.sx, HIP_Y, 0.15 * L.sz), ankle: new THREE.Vector3(),
             air: false, plant: 9, toe: 0, toeAtPlant: 0, splay: 0 };
  });

  /* ---- animation state (all scalars; nothing allocated in update) ---- */
  const st = { healT: 0, cyc: R(), doorA: 0, doorV: 0, prevF: 0, fdir: 0, shud: 0, hurtAge: 9, prevHurt: 0,
               yaw: 0, yawV: 0, saccT: 0, sy: 0, sp: 0, split: 0, corePh: 0, seed: R() * 100, full: 0 };
  const ankleL = new THREE.Vector3();
  const sfx = { slam: 0 };   /* event counter the game can poll: doors slammed shut (defuse) */

  function spring(o, key, vkey, target, k, dt) {   /* critically damped, substepped by caller */
    const c = 2 * Math.sqrt(k);
    o[vkey] += (k * (target - o[key]) - c * o[vkey]) * dt; o[key] += o[vkey] * dt;
  }

  function update(dt, t, s) {
    dt = clamp(dt || 0, 0, 0.1);
    if ((st.healT += dt) > 0.5) { st.healT = 0; healMats(pairs); }
    const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    const dead = clamp(s.dead || 0, 0, 1), alive = 1 - smooth(dead / 0.12);
    const speed = clamp(s.speed || 0, 0, 1) * alive, idle = 1 - speed;
    const f = clamp(s.fuse || 0, 0, 1) * alive;

    /* fuse phases */
    const df = f - st.prevF; st.prevF = f;
    if (df > 1e-5 || f > 0.999) st.fdir = 1; else if (df < -1e-5) st.fdir = -1; else if (f < 1e-4) st.fdir = 0;
    const crouchK = smooth(f / 0.3), openK = smooth((f - 0.2) / 0.7), tipK = smooth((f - 0.733) / 0.267);
    st.full = f > 0.999 ? st.full + dt : 0;

    /* death phases: each leg splays in turn */
    let spX = 0, spZ = 0;
    for (let i = 0; i < 4; i++) { const lg = legs[i]; lg.splay = smooth((dead - 0.04 - 0.11 * lg.L.die) / 0.2); spX += lg.splay * lg.L.sx; spZ += lg.splay * lg.L.sz; }
    const deathDoor = 0.28 * smooth((dead - 0.5) / 0.2);

    /* doors: follow the fuse open; slam shut (bounce + shudder) the moment it starts decaying */
    const doorT = (st.fdir >= 0 ? DOOR_OPEN * openK : 0) + deathDoor;
    for (let i = 0; i < n; i++) {
      const slam = st.fdir < 0 && st.doorA > 0.02;
      const k = slam ? 1600 : 220, c = slam ? 8 : 2 * Math.sqrt(220);
      st.doorV += (k * (doorT - st.doorA) - c * st.doorV) * h;
      st.doorA += st.doorV * h;
      if (st.doorA < 0) { if (st.doorV < -2.5 && st.shud < 0.2) { st.shud = 0.45; sfx.slam++; } st.doorA = 0; st.doorV = -st.doorV * 0.35; }
      if (st.doorA > 1.35) { st.doorA = 1.35; st.doorV = 0; }
    }
    st.shud = Math.max(0, st.shud - dt);
    doors[0].rotation.y = st.doorA; doors[1].rotation.y = -st.doorA;

    /* core: coal glow pulsing 2 -> 12 Hz, swelling 1 -> 1.25 */
    st.corePh = (st.corePh + dt * TAU * (2 + 10 * openK)) % TAU;
    const pulse = 0.5 + 0.5 * Math.sin(st.corePh);
    mCore.emissiveIntensity = 3 * openK * (0.5 + 0.5 * pulse);
    core.scale.setScalar(1 + 0.25 * openK * (0.8 + 0.2 * pulse));
    spark.visible = f > 0.01 && st.fdir >= 0;
    if (spark.visible) spark.scale.setScalar(0.7 + 0.6 * Math.abs(Math.sin(t * 47 + st.seed)) + 0.5 * f);

    /* hurt: buckle, then over-extend */
    if ((s.hurt || 0) > st.prevHurt + 0.05) st.hurtAge = 0;
    st.prevHurt = s.hurt || 0; st.hurtAge += dt;
    const ha = st.hurtAge;
    const hurtY = ha < 0.12 ? -0.15 * smooth(ha / 0.12) : ha < 0.3 ? -0.15 + 0.35 * smooth((ha - 0.12) / 0.18)
      : ha < 0.75 ? 0.2 * (1 - smooth((ha - 0.3) / 0.45)) : 0;

    /* body: hangs between the knees and sways; glides dead level when walking */
    const shake = st.shud / 0.45, trem = Math.min(1, st.full * 2) * 0.006;
    const sw = Math.sin(t * TAU * 0.3 + st.seed);
    const deathY = -0.5 * smooth((dead - 0.12) / 0.45) + 0.03 * Math.sin(Math.PI * clamp((dead - 0.57) / 0.1, 0, 1));
    body.position.set(HR.noise(t * 30, 3) * (0.012 * shake + trem), BODY_Y + idle * alive * 0.03 * Math.sin(t * TAU * 0.6 + st.seed)
      - 0.25 * crouchK * (1 - tipK) + 0.3 * tipK + hurtY * alive + deathY, HR.noise(t * 30, 5) * trem);
    body.rotation.set(0.25 * spZ / 2 * (1 - smooth((dead - 0.6) / 0.3)) + HR.noise(t * 31, 9) * 0.03 * shake,
      0.03 * Math.sin(t * TAU * 0.21 + st.seed) * idle * alive,
      0.06 * sw * idle * alive * (1 - crouchK) - 0.25 * spX / 2 * (1 - smooth((dead - 0.6) / 0.3)) + HR.noise(t * 29, 11) * 0.04 * shake);
    body.updateMatrix();

    /* head: stays level, turns up to ±70° to keep facing you; tips back on tiptoe; droops dead */
    const yawT = clamp(s.yaw || 0, -1.22, 1.22) * alive + 0.25 * smooth((dead - 0.4) / 0.4);
    for (let i = 0; i < n; i++) spring(st, 'yaw', 'yawV', yawT, 60, h);
    headJ.rotation.set(clamp((s.pitch || 0) * 0.6, -0.35, 0.35) * alive - 0.4 * tipK + 0.35 * smooth((dead - 0.35) / 0.3),
      clamp(st.yaw, -1.3, 1.3), -body.rotation.z * alive);

    /* eyes: saccades (hold 0.4-1.2 s, snap with k 400), lock on the player, roll up on tiptoe */
    st.saccT -= dt;
    if (st.saccT <= 0) { st.saccT = 0.4 + 0.8 * R(); st.sy = (R() - 0.5) * 0.5; st.sp = (R() - 0.5) * 0.3; st.split = R() < 0.25 ? (R() - 0.5) * 0.9 : 0; }
    const lock = (s.near === undefined || s.near < 16) ? 1 : 0;   /* eyes lock on the player within 16 blocks, else wander */
    const gyBase = clamp((s.yaw || 0) - st.yaw, -0.6, 0.6) * lock, gpBase = (s.pitch || 0) * 0.4 * lock;
    const squash = ha < 0.15 ? 0.3 : ha < 0.24 ? 0.3 + 0.7 * smooth((ha - 0.15) / 0.09) : 1;
    for (let i = 0; i < 2; i++) {
      const e = eyes[i];
      const ty = clamp(gyBase + st.sy + (i ? st.split : 0), -0.6, 0.6), tp = clamp(gpBase + st.sp, -0.44, 0.44);
      for (let k = 0; k < n; k++) { spring(e, 'y', 'yv', ty, 400, h); spring(e, 'p', 'pv', tp, 400, h); }
      const deadRoll = smooth((dead - 0.3) / 0.3) * (i ? 0.55 : -1.25);
      e.j.rotation.set(e.p * alive - 1.35 * tipK + deadRoll, e.y * alive + (i ? 0.4 : 0) * smooth((dead - 0.3) / 0.3), 0);
      e.m.scale.set(1, squash, 1);
    }

    /* legs */
    st.cyc = (st.cyc + dt * GAIT_HZ) % 1;
    const tk = Math.floor((t + st.seed) / 0.7), tw = ((t + st.seed) % 0.7) / 0.7, tapLeg = Math.floor(hash(tk + st.seed) * 4);
    const radK = 1 + 0.05 * crouchK * (1 - tipK) - 0.2 * tipK;   /* feet draw in as it rises: the legs straighten */
    for (let i = 0; i < 4; i++) {
      const lg = legs[i], L = lg.L, sp = lg.splay;
      /* gait: diagonal pairs, stance 62 %, treadmill in root space */
      const ph = (st.cyc + L.ph) % 1;
      let fz, lift = 0;
      if (ph < DUTY) fz = STRIDE * (0.5 - ph / DUTY);
      else { const w = (ph - DUTY) / (1 - DUTY); fz = STRIDE * (-0.5 + smooth(w)); lift = 0.15 * Math.sin(Math.PI * w); }
      fz *= speed; lift *= speed;
      if (tapLeg === i && tw < 0.45) lift += idle * alive * (1 - crouchK) * 0.07 * Math.sin(Math.PI * tw / 0.45);
      lift *= 1 - sp;
      /* toes splay up in the air, slap flat on the plant (150 ms), then clench */
      if (lift > 0.004) { lg.air = true; lg.toe += (-0.5 - lg.toe) * Math.min(1, dt * 10); }
      else { if (lg.air) { lg.air = false; lg.plant = 0; lg.toeAtPlant = lg.toe; } lg.plant += dt;
        const pa = lg.plant; lg.toe = lg.toeAtPlant * (1 - smooth(pa / 0.15)) + 0.14 * Math.sin(Math.PI * clamp((pa - 0.08) / 0.35, 0, 1)) * Math.min(1, -lg.toeAtPlant * 3); }
      const settle = lg.plant < 0.2 ? 0.12 * (1 - smooth(lg.plant / 0.2)) * Math.min(1, -lg.toeAtPlant * 3) : 0;
      const twitch = dead > 0.2 ? HR.twitch(t * 1.3, i * 3.1 + 1, 2.4, 3) * 0.9 * (1 - smooth((dead - 0.8) / 0.2)) : 0;
      const theta = Math.max(settle, 1.25 * tipK) * (1 - sp);
      const phi = (lg.toe * (1 - tipK) + 0.7 * tipK) * (1 - sp) + (-0.85 + twitch) * sp;
      const ballLift = phi > 0 ? TOE_Y * Math.cos(phi) + 0.1 * Math.sin(phi) - TOE_Y : 0;   /* the toe tips push the ball up */
      /* foot placement. Dead: the foot slides out and flops onto its side (shin lying flat), so the whole leg
         ends up on the ground instead of arching up to a foot standing on end */
      const rad = radK + 0.6 * sp;
      const ax = L.sx * ANKLE[0] * rad, az = L.sz * ANKLE[1] * rad + fz;
      const roll = 1.45 * smooth(sp * 1.15) * L.roll;
      lg.foot.position.set(ax + lg.rx * 0.15, lift + ballLift + (FOOT_W / 2 + 0.004) * Math.sin(Math.abs(roll)), az + lg.rz * 0.15);
      lg.foot.rotation.set(0.12 * sp, lg.heading, roll);
      lg.instepJ.rotation.x = theta;
      lg.toesJ.rotation.x = phi;
      const hy = ANK_Y * Math.cos(theta) - ANK_Z * Math.sin(theta), hz = ANK_Y * Math.sin(theta) + ANK_Z * Math.cos(theta);
      lg.shin.position.set(0, hy + SHIN / 2 + 0.005, hz);
      ankleL.set(0, hy + SHIN, hz);
      lg.foot.updateMatrix();
      _A.copy(ankleL).applyMatrix4(lg.foot.matrix);
      /* IK hip -> ankle: knee up and out alive; dead, the knee bends sideways (toward the side the foot flopped),
         flat along the ground, so the leg curls like a dead harvestman's */
      _H.copy(lg.hip).applyMatrix4(body.matrix);
      _pole.set(lg.rx * 0.15 * (1 - sp) - lg.rz * L.roll * sp, 1 - 0.8 * sp, lg.rz * 0.15 * (1 - sp) + lg.rx * L.roll * sp);
      ik(_H, _A, L1, L2, _pole, _K, _E);
      span(lg.up, _H, _K);
      span(lg.lo, _E, _K);
      /* kneecap sits proud on the outside of the bend, its flat face along the bend direction */
      lg.knee.position.copy(_K).addScaledVector(_p, 0.014);
      _kx.crossVectors(_u, _p).negate();           /* x = y × z with y = -_u (up the leg), z = _p (out of the bend) */
      _ky.copy(_u).negate();
      _kb.makeBasis(_kx, _ky, _p); lg.knee.quaternion.setFromRotationMatrix(_kb);
    }
  }

  return {
    root, update, mats, deathDur: DEATH_DUR, sfx,
    handles: { head: headJ, body, core: coreJ, doorL: doors[0], doorR: doors[1], fuse: fuseJ },
  };
};
})();

