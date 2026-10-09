/* Hyperreal pack: SHEEP, "The Fleece".
   The wool is not the sheep: an overgrown lumpy mass of filthy fleece cubes that breathes on its own slow rhythm,
   with something crawling under it. Inside is a small, starved, naked pink sheep with a long black face.
   On death the fleece slides off and keeps breathing on the grass; the bald thing stands, shivers, looks down at
   itself, bleats, and topples over stiff. Units = blocks, feet at y=0, faces +z, model's left = +x. 33 meshes. */
(function () {
const HR = window.HR;
const PI = Math.PI, TAU = PI * 2;
const clamp = HR.clamp;

/* ---------------- measurements taken from face_sheep_basecolor (1024², v = 0 at the bottom) ----------------
   eye (image-left, the sheep's right, model −x): centre (u .142, v .783), size .079 × .089 (x 104–185, y 176–267 px)
   eye (image-right, the sheep's left, model +x): centre (u .857, v .785), size .082 × .090 (x 835–922, y 172–268 px)
   pupils are horizontal bars baked into pale yellow irises; nose pad centre (u .503, v .31); split upper lip runs
   down to the mouth line at v .16 (y 860 px) → jaw split. Eyes sit near the side edges, so the head front takes
   u .08–.92 (aspect .84 = .30 / .357) to keep the photo undistorted on the narrow head. */
const FACE_U0 = 0.08, FACE_U1 = 0.92, SPLIT = 0.16;
const EYE_R = { u: 0.857, v: 0.785, lid: [0.81, 0.83, 0.905, 0.92] };   // model +x
const EYE_L = { u: 0.142, v: 0.783, lid: [0.095, 0.83, 0.19, 0.92] };   // model −x
const FUR_SIDE = [0.36, 0.56, 0.63, 0.76], FUR_TOP = [0.40, 0.50, 0.58, 0.74], FUR_CHIN = [0.25, 0.01, 0.75, 0.09];

/* ---------------- dimensions (bible: vanilla sheep frame) ---------------- */
const HEAD_W = 0.30, HEAD_D = 0.40;
const HU = 0.36 * (1 - SPLIT);        // upper head height (v SPLIT..1) = 0.302
const HJ = 0.36 * SPLIT;              // jaw height (v 0..SPLIT) = 0.058
const FLEECE_Y = 0.86, FLEECE_Z = -0.02, FLEECE_HALF = 0.43;
/* static clumps [x, y, z, size, rotY, shade] in fleece-local space; each stands ≥ 0.1 proud to break the box outline */
const CLUMPS = [
  [ 0.26, 0.31,  0.30, 0.52,  0.12, 1], [-0.28, 0.30, -0.28, 0.55, -0.10, 2], [ 0.40, -0.02, -0.30, 0.46, 0.08, 2],
  [-0.40, -0.06, 0.24, 0.44, -0.14, 1], [ 0.02, 0.06, -0.58, 0.48,  0.05, 1], [-0.24, 0.35,  0.40, 0.40, 0.20, 0],
  [ 0.28, 0.34, -0.38, 0.42, -0.20, 0], [ 0.30, -0.22, 0.58, 0.40, 0.10, 2], [-0.31, -0.20, 0.57, 0.38, -0.12, 0],
];
const WT = 0.55;                      // wool tile size in blocks
const DAGS = [[0.10, 0.16], [-0.12, -0.10], [0.32, -0.16], [-0.30, 0.20]];   // [x, z] under the belly
const LEGS = [[0.22, 0.42, 0], [-0.22, 0.42, PI], [0.22, -0.42, PI], [-0.22, -0.42, 0]];   // FL BR diagonal pairs

/* ---------------- shared helpers ---------------- */
const GEO = {};
const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
/* faces regrouped by material pattern: a box whose faces share one material is one draw call, not six */
function meshFor(g, mats) {
  if (mats instanceof THREE.Material) return new THREE.Mesh(g, mats);
  const per = FACES.map(k => mats[k] || mats.all), uniq = [];
  const pat = per.map(m => { let i = uniq.indexOf(m); if (i < 0) { i = uniq.length; uniq.push(m); } return i; });
  if (uniq.length === 1) return new THREE.Mesh(g, uniq[0]);
  const gk = g.uuid + '#' + pat.join('');
  if (!GEO[gk]) {
    const ng = new THREE.BufferGeometry(), src = g.index.array, idx = [];
    for (const a in g.attributes) ng.setAttribute(a, g.attributes[a]);
    for (let m = 0; m < uniq.length; m++) {
      const st = idx.length;
      for (const gr of g.groups) if (pat[gr.materialIndex] === m) for (let k = 0; k < gr.count; k++) idx.push(src[gr.start + k]);
      ng.addGroup(st, idx.length - st, m);
    }
    ng.setIndex(idx); GEO[gk] = ng;
  }
  return new THREE.Mesh(GEO[gk], uniq);
}
function box(w, h, d, mats, uv, shadow) {
  const key = w + ',' + h + ',' + d + '|' + (uv ? JSON.stringify(uv) : '');
  const g = GEO[key] || (GEO[key] = HR.box(w, h, d, HR.flat(0x888888), uv).geometry);
  const mesh = meshFor(g, mats);
  mesh.castShadow = shadow !== false; mesh.receiveShadow = true;
  return mesh;
}
/* drooping ear: 0.15 long (x, out from its root at x 0) x 0.035 x 0.085, tapering to a rounded tip, its front and back
   edges cupped downward so it reads as a soft ear, not a plank. One crop on every face. */
function earGeo(crop) {
  const key = 'ear|' + crop.join(',');
  if (GEO[key]) return GEO[key];
  const L = 0.15, D = 0.085, g = new THREE.BoxGeometry(L, 0.035, D, 5, 1, 4);
  g.translate(L / 2, 0, 0);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i) / L, ez = p.getZ(i) / (D / 2);
    p.setZ(i, p.getZ(i) * (1 - 0.5 * t * t));
    p.setY(i, p.getY(i) * (1 - 0.45 * t) - 0.016 * ez * ez * (0.3 + t));
    uv.setXY(i, crop[0] + uv.getX(i) * (crop[2] - crop[0]), crop[1] + uv.getY(i) * (crop[3] - crop[1]));
  }
  g.computeVertexNormals();
  return GEO[key] = g;
}
/* wet cornea: a shallow sphere cap (disc r ~.017, .005 proud) whose planar UVs repeat the face photo under it, so the
   only visible difference is a glossy catch-light (the black face otherwise goes featureless by torchlight) */
function corneaGeo(cu0, cv0, du, dv) {
  const key = 'cornea|' + [cu0, cv0, du, dv].join(',');
  if (GEO[key]) return GEO[key];
  const r = 0.03, th = 0.6, g = new THREE.SphereGeometry(r, 12, 4, 0, TAU, 0, th);
  g.rotateX(PI / 2); g.translate(0, 0, -r * Math.cos(th));
  const p = g.attributes.position, uv = g.attributes.uv, R0 = r * Math.sin(th);
  for (let i = 0; i < p.count; i++) uv.setXY(i, cu0 + p.getX(i) / (2 * R0) * du, cv0 + p.getY(i) / (2 * R0) * dv);
  return GEO[key] = g;
}
function cu(w, h, T, ox, oy) { return [ox, oy, ox + w / T, oy + h / T]; }
function tiled(w, h, d, T, r) {
  return { px: cu(d, h, T, r(), r()), nx: cu(d, h, T, r(), r()), py: cu(w, d, T, r(), r()), ny: cu(w, d, T, r(), r()),
           pz: cu(w, h, T, r(), r()), nz: cu(w, h, T, r(), r()) };
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
let SEEDS = 0;
function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const seg = (x, a, b) => sm((x - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const follow = (cur, goal, rate, dt) => cur + (goal - cur) * (1 - Math.exp(-rate * dt));
/* blink: close over 50 ms, hold 70 ms, open over 90 ms */
const blinkCurve = p => p < 0 ? 0 : p < 0.05 ? p / 0.05 : p < 0.12 ? 1 : p < 0.21 ? 1 - (p - 0.12) / 0.09 : 0;

HR.MODELS.sheep = () => {
  const idx = ++SEEDS;
  const R = rng(idx * 104729 + Math.floor(Math.random() * 1e6));
  const G = rng(777);                 // fixed seed for UV crops so every sheep shares cached geometry
  const root = new THREE.Group(); root.name = 'sheep';

  /* per-instance material clones (textures shared) */
  const HL = [], cl = (id, o) => { const b = hmat(id, o), c = b.clone(); HL.push(b, c); return c; };
  const wool = cl('mat_wool', { rough: 1, roughMap: false, repeat: [1, 1], normalScale: 1.6 });
  /* filthier shades for some clumps so the lumps separate visually (still pale: tints only darken) */
  const woolB = cl('mat_wool', { color: 0xece2cf, rough: 1, roughMap: false, repeat: [1, 1], normalScale: 1.6 });
  const woolC = cl('mat_wool', { color: 0xd8cab0, rough: 1, roughMap: false, repeat: [1, 1], normalScale: 1.6 });
  const SHADE = [wool, woolB, woolC];
  const dagM = cl('mat_wool', { color: 0x8a7a5a, rough: 0.9, roughMap: false, repeat: [1, 1], normalScale: 1.3 });
  /* roughness maps average .35 (skin), .125 (bone), .455 (rotflesh): factor = target / average (three clamps the product).
     bare pink skin 1.55 -> .55, dark skin 1.45 -> ~.5, hooves 4.0 -> .5, inside of the mouth .33 -> .15 (wet) */
  const pink = cl('mat_skin', { color: 0xe8b0a8, rough: 1.55, normalScale: 0.5 });
  /* mat_skin is warm pink, so near-black tints lean cool to land on a neutral sooty black instead of brown */
  const darkSkin = cl('mat_skin', { color: 0x0e1416, rough: 1.45, normalScale: 0.6 });
  const legSkin = cl('mat_skin', { color: 0x101618, rough: 1.45, normalScale: 0.6 });
  const earIn = cl('mat_skin', { color: 0x4a3230, rough: 1.3, normalScale: 0.5 });   // greyish-pink inner ear
  const hoofM = cl('mat_bone', { color: 0x3a3028, rough: 4.0 });
  const face = cl('face_sheep', { rough: 0.6, roughMap: false, normalScale: 0.6 });   // a little sheen so the black face keeps its planes by torchlight
  /* corneas: glossy, plus the faint eyeshine real sheep have (tapetum), so two pale eyes still read in a dark cave.
     Kept OUT of mats so a hurt flash never overwrites the emissive (same rule as the boomer core / spider eyes) */
  const eyeWet = cl('face_sheep', { rough: 0.07, roughMap: false, normalScale: 0.15 });
  eyeWet.emissive.setHex(0xfff2c8); eyeWet.emissiveMap = eyeWet.map; eyeWet.emissiveIntensity = 0.09;
  /* inside of the mouth: near-black wet red, so the jaw line reads as a closed mouth, never a red strap */
  const mouth = cl('mat_rotflesh', { color: 0x2a0e0c, rough: 0.33 });
  const mats = [wool, woolB, woolC, dagM, pink, darkSkin, legSkin, earIn, hoofM, face, mouth];

  /* ================= the fleece: its own creature ================= */
  const fleece = HR.joint(root, 0, FLEECE_Y, FLEECE_Z);
  const breath = HR.joint(fleece, 0, 0, 0);
  HR.at(breath, box(1.00, 0.86, 1.36, wool, tiled(1.00, 0.86, 1.36, WT, G)), 0, 0, 0);
  const clumps = CLUMPS.map((c, i) => {
    const j = HR.joint(breath, c[0], c[1], c[2]); j.rotation.y = c[4];
    HR.at(j, box(c[3], c[3], c[3], SHADE[c[5]], tiled(c[3], c[3], c[3], WT, G)), 0, 0, 0);
    return { j, ph: R() * TAU, rate: 0.13 + R() * 0.05 };
  });
  const bulge = HR.joint(breath, 0, 0.3, 0);          // clump 5 in the bible: the thing crawling under the wool
  HR.at(bulge, box(0.40, 0.40, 0.40, woolB, tiled(0.40, 0.40, 0.40, WT, G)), 0, 0, 0);
  const dags = DAGS.map(d => {
    const j = HR.joint(breath, d[0], -FLEECE_HALF + 0.02, d[1]);
    HR.at(j, box(0.12, 0.20, 0.12, dagM, tiled(0.12, 0.20, 0.12, WT, G), false), 0, -0.10, 0);
    return { j, px: { a: 0, v: 0 }, pz: { a: 0, v: 0 }, k: R() * TAU };
  });

  /* ================= the sheep inside ================= */
  const topple = HR.joint(root, 0, 0, 0);             // pivot moved to the hoof edge it falls over
  const body = HR.joint(topple, 0, 0, 0);
  HR.at(body, box(0.50, 0.42, 0.95, pink), 0, 0.80, 0);
  const tail = HR.joint(body, 0, 0.95, -0.47); tail.rotation.x = 0.5;
  HR.at(tail, box(0.08, 0.13, 0.08, pink, null, false), 0, -0.06, 0);
  const legs = LEGS.map(l => {
    const j = HR.joint(body, l[0], 0.62, l[1]);
    HR.at(j, box(0.10, 0.57, 0.10, legSkin), 0, -0.285, 0);
    HR.at(j, box(0.11, 0.05, 0.11, hoofM, null, false), 0, -0.595, 0);
    return { j, ph: l[2] };
  });
  const neck = HR.joint(body, 0, 0.92, 0.50);
  HR.at(neck, box(0.18, 0.18, 0.22, darkSkin), 0, 0, 0.12);
  const head = HR.joint(neck, 0, 0, 0.16);
  /* upper head: face v SPLIT..1 on the front, fur crops elsewhere, inside of the mouth underneath */
  HR.at(head, box(HEAD_W, HU, HEAD_D, { all: face, ny: mouth },
    { pz: [FACE_U0, SPLIT, FACE_U1, 1], px: FUR_SIDE, nx: FUR_SIDE, py: FUR_TOP, nz: FUR_SIDE, ny: [0, 0, 1, 1] }),
    0, -0.022 + HU / 2, HEAD_D / 2);
  const jaw = HR.joint(head, 0, -0.022, 0.04);        // hinge at the jaw's rear-top edge; +rot.x opens
  HR.at(jaw, box(HEAD_W, HJ, 0.36, { all: face, py: mouth },
    { pz: [FACE_U0, 0, FACE_U1, SPLIT], px: FUR_CHIN, nx: FUR_CHIN, ny: FUR_TOP, nz: FUR_CHIN, py: [0, 0, 1, 1] }, false),
    0, -HJ / 2, 0.18);
  HR.at(head, box(0.32, 0.10, 0.22, wool, tiled(0.32, 0.10, 0.22, WT, G), false), 0, 0.29, 0.13);   // forelock
  const ears = [1, -1].map(sd => {
    const j = HR.joint(head, sd * 0.14, 0.235, 0.10);
    const m = HR.at(j, meshFor(earGeo(FUR_SIDE), { all: face, ny: earIn }), 0, 0, 0);   // black-furred, inner skin underneath
    if (sd < 0) m.scale.x = -1;
    m.castShadow = false; m.receiveShadow = true;
    j.rotation.order = 'ZYX';                          // roll about its own length first, then droop
    return { j, sd, k: R() * 50 };
  });
  /* blink plates: thin boxes 0.006 proud of the face, front cropped from the fur just above each eye, pivot on top */
  const faceU = u => (u - FACE_U0) / (FACE_U1 - FACE_U0) * HEAD_W - HEAD_W / 2;
  const faceV = v => -0.022 + (v - SPLIT) / (1 - SPLIT) * HU;
  const lids = [EYE_R, EYE_L].map(e => {
    const j = HR.joint(head, faceU(e.u), faceV(e.v) + 0.022, HEAD_D + 0.008);
    const lidM = HR.at(j, box(0.038, 0.042, 0.004, face, { pz: e.lid, px: e.lid, nx: e.lid, py: e.lid, ny: e.lid, nz: e.lid }, false), 0, -0.021, 0);
    j.scale.y = 0.001; j.visible = false;
    return { j, m: lidM };
  });
  /* corneas: UV density on the front is 2.8 u and 2.78 v per block, so the .034 cap spans .095 of the photo */
  for (const e of [EYE_R, EYE_L]) {
    const c = HR.at(head, new THREE.Mesh(corneaGeo(e.u, e.v, 0.095, 0.095), eyeWet), faceU(e.u), faceV(e.v), HEAD_D + 0.0005);
    c.castShadow = false; c.receiveShadow = true;
  }

  /* ================= state ================= */
  const fx = { a: 0, v: 0 }, fz = { a: 0, v: 0 };
  let fy = 0, fvy = 0, wph = 0, blinkAt = 1.5 + R() * 3, grazeAt = 6 + R() * 6, shudAt = 3.5 + R() * 1.5;
  let hurtLast = 0, hurtAt = -9, look = 0, lookGoal = 0, lookNext = 0;
  let chewing = false, chewNext = 1 + R() * 2, chewB = 0, healT = 0, healNext = 1.5;   // cud-chewing bouts; the jaw rests fully shut between them
  const side = idx % 2 === 1 ? 1 : -1;             // which way the fleece slides off (the sheep falls the other way)

  function update(dt, t, s) {
    dt = clamp(dt, 0, 0.1);
    healT += dt; if (healT >= healNext && healNext < 40) { healNext += 2; heal(HL); }
    const dead = s.dead || 0, tau = dead * 3.0, speed = clamp(s.speed || 0, 0, 1);
    const hurt = s.hurt || 0;
    if (hurt > hurtLast + 0.3) hurtAt = t;
    hurtLast = hurt;

    /* ---- gait: tiny rapid high steps ---- */
    wph += dt * 2.5 * TAU; if (wph > 1e4) wph -= 1e4;
    const bobW = 2 * 2.5 * TAU;
    const bob = 0.012 * speed * (0.5 - 0.5 * Math.cos(2 * wph));
    const bobAcc = 0.012 * speed * 0.5 * bobW * bobW * Math.cos(2 * wph);

    /* ---- naked sheep ---- */
    const alive = dead === 0;
    for (let iL = 0; iL < legs.length; iL++) { const l = legs[iL];
      const p = wph + l.ph;
      l.j.rotation.x = alive ? 0.7 * speed * Math.sin(p) : 0;
      l.j.position.y = 0.62 + (alive ? 0.055 * speed * Math.max(0, -Math.cos(p)) : 0);
    }
    let jx = 0, jz = 0;
    if (tau > 0.45 && tau < 1.05) { const e = seg(tau, 0.45, 0.55) * (1 - seg(tau, 0.95, 1.05));
      jx = 0.008 * e * HR.noise(t * 30, 5); jz = 0.008 * e * HR.noise(t * 30, 9); }
    const px = alive ? 0 : -side * 0.275;
    topple.position.x = px; body.position.set(-px + jx, bob, jz);
    let tz = 0;
    if (!alive) { const u = clamp((tau - 1.75) / 0.45, 0, 1); tz = side * (PI / 2) * u * u;
      if (tau > 2.2) tz -= side * 0.07 * Math.sin(clamp((tau - 2.2) / 0.22, 0, 1) * PI); }
    topple.rotation.z = tz;

    /* head: snaps to look at you and holds; pants; chews cud; grazes every so often */
    if (t > lookNext || Math.abs(clamp(s.yaw || 0, -1.1, 1.1) * 0.7 - lookGoal) > 0.3) {
      lookGoal = clamp(s.yaw || 0, -1.1, 1.1) * 0.7 + (R() - 0.5) * 0.1; lookNext = t + 0.6 + R() * 1.8; }
    look = follow(look, lookGoal, 28, dt);
    if (t > grazeAt + 4.5) grazeAt = t + 8 + R() * 8;
    const gz = alive && speed < 0.3 ? seg(t, grazeAt, grazeAt + 0.6) * (1 - seg(t, grazeAt + 3.6, grazeAt + 4.3)) : 0;
    const bleat = hurt > 0 && alive ? Math.sin((1 - hurt) * PI) : 0;
    let nx = 0.025 * Math.sin(TAU * 0.9 * t) + 0.85 * gz - 0.45 * bleat;
    let hx = clamp(s.pitch || 0, -0.6, 0.6) * 0.5 + 0.35 * gz;
    if (t > chewNext) { chewing = !chewing; chewNext = t + (chewing ? 2.5 + R() * 2 : 2 + R() * 3); }
    chewB = follow(chewB, alive && (chewing || gz > 0.3) ? 1 : 0, 8, dt);
    const cc = Math.sin(TAU * 3 * t), chewO = cc > 0 ? cc * cc : 0;      // each chew shuts and holds shut for half the cycle
    let hy = look * (1 - gz), jawO = 0.087 * chewB * chewO + 0.5 * bleat;
    let jawY = 0.035 * chewB * chewO * Math.sin(TAU * 1.5 * t + 1.2);
    let ny = 0.92 - 0.18 * gz, nz = 0.50 + 0.04 * gz;
    if (!alive) {
      /* stands frozen, flinches, shivers, looks down at itself, bleats, topples */
      const fl = seg(tau, 0.05, 0.15) * (1 - seg(tau, 0.3, 0.6));
      const down = seg(tau, 1.05, 1.35) * (1 - seg(tau, 1.35, 1.55));
      const bl = seg(tau, 1.4, 1.5) * (1 - seg(tau, 1.65, 1.85));
      /* curls its head back to stare at its own bald pink flank (the side the wool went), then bleats at it */
      nx = -0.18 * fl + 0.42 * down - 0.3 * bl + 0.15 * seg(tau, 1.8, 2.3);
      hx = 0.38 * down; hy = side * 0.95 * down + side * 0.35 * bl * (1 - seg(tau, 1.7, 2.0)); jawO = 0.6 * bl + 0.12 * seg(tau, 1.85, 2.2); jawY = 0;
      ny = 0.92; nz = 0.50;
    }
    neck.position.set(0, ny, nz);
    neck.rotation.set(nx, 0, 0);
    head.rotation.set(hx, hy, 0);
    jaw.rotation.set(clamp(jawO, 0, 0.7), jawY, 0);
    for (let iE = 0; iE < ears.length; iE++) { const e = ears[iE];
      const tw = HR.twitch(t, e.k, 0.6, 5);
      e.j.rotation.set(-0.55, -e.sd * 0.25 * bleat, -e.sd * (0.75 + (alive ? 0 : 0.25) - 0.5 * Math.abs(tw) - 0.35 * bleat));   // inner side turned forward-down
    }
    if (t > blinkAt + 0.3) blinkAt = t + 2.5 + R() * 4;
    const blink = alive || tau < 1.7 ? blinkCurve(t - blinkAt) : 0;
    for (let iL = 0; iL < lids.length; iL++) { const l = lids[iL]; l.j.scale.y = Math.max(0.001, blink); l.j.visible = blink > 0.01; }

    /* ================= fleece ================= */
    const n = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / n;
    const swayDrive = alive ? 2.6 * speed * Math.sin(wph) : 0, pitchDrive = alive ? -1.5 * (s.accel ? s.accel.z : 0) : 0;
    let fxAcc = 0, fzAcc = 0;
    for (let i = 0; i < n; i++) {
      const ax0 = fx.v, az0 = fz.v;
      HR.pendulum(fx, h, pitchDrive + 0.6 * speed * Math.cos(2 * wph), 22, 3.0);
      HR.pendulum(fz, h, swayDrive, 18, 2.6);
      fxAcc = (fx.v - ax0) / h; fzAcc = (fz.v - az0) / h;
      fvy += (-120 * fy - 7 * fvy - bobAcc) * h; fy += fvy * h;
      for (let iD = 0; iD < dags.length; iD++) { const d = dags[iD];
        HR.pendulum(d.px, h, -1.2 * fxAcc + (alive ? 2.2 * speed * Math.sin(2 * wph + d.k) : 0), 30, 4);
        HR.pendulum(d.pz, h, -1.2 * fzAcc, 30, 4);
      }
    }
    fx.a = clamp(fx.a, -0.06, 0.06); fz.a = clamp(fz.a, -0.06, 0.06); fy = clamp(fy, -0.03, 0.03);
    /* its own slow breath (0.15 Hz) out of sync with the sheep's panting; clumps on their own phases */
    const b = 0.5 - 0.5 * Math.cos(TAU * 0.15 * t);
    let sx = 1 + 0.04 * b, sy = 1 + 0.05 * b, sz = 1 + 0.04 * b;
    /* it flinches a beat after the sheep is hit, as if it felt it separately */
    const fl = seg(t - hurtAt, 0.15, 0.25) * (1 - seg(t - hurtAt, 0.35, 0.6));
    sx *= 1 - 0.05 * fl; sy *= 1 - 0.06 * fl; sz *= 1 - 0.05 * fl;
    /* shudder every 15–25 s; the sheep's head never reacts */
    if (t > shudAt + 0.6) shudAt = t + 15 + R() * 10;
    const sh = seg(t, shudAt, shudAt + 0.05) * (1 - seg(t, shudAt + 0.45, shudAt + 0.5)) + 0.6 * fl;
    const jr = 0.02 * sh * HR.noise(t * 28, 1), jr2 = 0.02 * sh * HR.noise(t * 31, 2), jp = 0.006 * sh * HR.noise(t * 26, 3);
    let fxp = 0, fyp = FLEECE_Y + bob + fy, fzp = FLEECE_Z, frx = fx.a + jr, frz = fz.a + jr2, fry = 0;
    if (!alive) {
      /* detaches, slides off sideways, lands, breathes harder on the grass, then deflates */
      const u = seg(tau, 0, 0.55), land = seg(tau, 0.5, 0.58) * (1 - seg(tau, 0.58, 0.8));
      fxp = side * 1.18 * u; fzp = FLEECE_Z + 0.12 * u;
      frz = -side * 0.42 * Math.sin(PI * u) + jr2; frx = jr; fry = side * 0.25 * u;
      const b2 = tau > 0.55 ? 0.5 - 0.5 * Math.cos(TAU * (tau - 0.55) / 1.25) : 0;
      const df = seg(tau, 2.3, 3.0);
      sx = (1 + 0.05 * b2) * (1 + 0.06 * land) * lerp(1, 1.12, df);
      sz = (1 + 0.05 * b2) * (1 + 0.06 * land) * lerp(1, 1.12, df);
      sy = (1 + 0.09 * b2) * (1 - 0.12 * land) * lerp(1, 0.3, df);
      fyp = lerp(FLEECE_Y, FLEECE_HALF * sy, u) + 0.1 * Math.sin(PI * u);   // bottom stays on the grass as it breathes/deflates
    }
    fleece.position.set(fxp, fyp + jp, fzp + jp);
    fleece.rotation.set(frx, fry, frz);
    breath.scale.set(sx, sy, sz);
    for (let iC = 0; iC < clumps.length; iC++) { const c = clumps[iC];
      const k = 1 + 0.06 * Math.sin(TAU * c.rate * t + c.ph);
      c.j.scale.set(k, k, k);
    }
    /* the bulge crawls rump → shoulder → rump on a 6 s loop, pulsing as it goes */
    const z = -0.50 + 0.98 * (0.5 - 0.5 * Math.cos(TAU * t / 6)), pulse = 0.5 + 0.5 * Math.sin(TAU * t / 1.2);
    const bs = 0.85 + 0.25 * pulse;
    bulge.position.set(0.06 * Math.sin(TAU * t / 3.3), FLEECE_HALF - 0.2 * bs + 0.11 + 0.07 * pulse, z);
    bulge.scale.set(bs, bs * (0.9 + 0.2 * pulse), bs);
    for (let iD = 0; iD < dags.length; iD++) { const d = dags[iD]; d.j.rotation.set(clamp(d.px.a, -0.7, 0.7), 0, clamp(d.pz.a, -0.7, 0.7)); }
  }

  return {
    root, update, mats, deathDur: 3.0,
    handles: { head, neck, jaw, body, fleece, legs: legs.map(l => l.j) },
  };
};
})();

