/* Hyperreal pack: SPIDER, "The Pallbearer".
   A low black hairy spider whose knees peak above its back, eight mismatched human eyes, legs ending in single human
   fingertips that drum impatiently, and a cocooned victim on its back whose face shifts inside the silk.
   Dies on its back with all eight fingertips meeting like praying hands; the cocoon rolls off and twitches once.
   Units = blocks, feet at y=0, faces +z, model's left = +x. 38 meshes. */
(function () {
const HR = window.HR;
const PI = Math.PI, TAU = PI * 2;
const clamp = HR.clamp;

/* ---------------- measurements taken from the textures ---------------- */
/* eye_human_basecolor (1024²): iris centre (u .503, v .500); iris radius .295 (x 210–815 px); pupil radius .094
   (x 415–608 px). Baked glare streaks at x 290–340 and 690–760 are kept (they read as wet). */
const EYE_TEX = { cu: 0.503, cv: 0.500, iris: 0.295, pupil: 0.094 };
/* planar UV scale on the eyeball domes: iris angular radius = asin(.295 / .52) ≈ 35°, like a real eye */
const EYE_UV = 0.52;
/* cocoon_basecolor (1024²): a face presses up through the silk in the top ~45 %.
   brows v .82; eyes v .76 at u .37 / .63; face spans u .17–.80; mouth/chin lost under silk by v .55; plain criss-cross
   silk with leaves below v .46. Release 1.0: the face stays painted in the silk; nothing is modelled on top of it. */
/* The victim lies face-up with its head at the spider's REAR and lifts it to peer forward over its own bundled body,
   so a viewer in front sees the face the right way up. The head's planar projection puts the brow (image top) at −z
   and the victim's right (image left) at −x: no flips needed. Body and head are ellipsoids (a wrapped pupa, not
   stacked crates). */
const COC_FACE = [0.17, 0.44, 0.83, 1.00];   // head-end top crop, planar-projected onto the wrapped-head ellipsoid
const COC_HEAD = [0.20, 0.16, 0.22];          // wrapped-head ellipsoid semi-axes (sphere r .2 scaled 1, .8, 1.1)
const COC_HEAD_C = [0, 0.11, -0.19];          // its centre, neck local
const COC_BODY = [0.21, 0.13, 0.36];          // bundled-body pupa semi-axes (silk wraps round its long axis), tapers to the feet
const COC_TAPER = 0.30;
const COC_BODY_CROP = [0.0, 0.0, 1.0, 0.44];  // plain criss-cross silk band, seam turned to the underside
const COC_LIFT = 0.72;                        // how far the cocooned head is raised (rad): face turned to whoever is in front
const SILK_UNDER = [0.10, 0.10, 0.60, 0.40];  // plain silk for the underside of the wrapped head

/* ---------------- dimensions ---------------- */
const L1 = 0.74, L2 = 1.08, FT = 0.14;        // femur, tibia, fingertip lengths
const HIP_X = 0.50, HIP_Y = 0.05;             // hips, body-local (body origin = abdomen centre, rest y 0.45)
const HIP_Z = [-0.45, -0.15, 0.15, 0.45];     // back → front
const FWD = [-0.72, -0.24, 0.22, 0.68];       // rest yaw of each pair, + = toward the front
const REACH = 0.66, FOOT_Y = FT;              // tibia tip rests one fingertip-length above the ground
const BODY_Y = 0.45;
const CT = 0.42;                              // chitin tile size in blocks (short dense bristles, not wood grain)
const PIV_Y = -0.25, PIV_Z = -0.60;           // rear-up pivot: bottom rear edge of the abdomen
const COC_Y = 0.41;                           // cocoon centre above the abdomen centre
const DRUM_ORDER = [3, 2, 1, 0, 7, 6, 5, 4];  // front-left → back-left, then front-right → back-right (left = +x = legs 0–3)

/* ---------------- shared resources (built once per page) ---------------- */
const GEO = {};
const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
function boxGeo(w, h, d, uv) {
  const key = w + ',' + h + ',' + d + '|' + (uv ? JSON.stringify(uv) : '');
  return GEO[key] || (GEO[key] = HR.box(w, h, d, HR.flat(0x888888), uv).geometry);
}
/* box with faces regrouped by material: a box whose faces all share one material is ONE draw call, a two-material
   fingertip is two (BoxGeometry's six groups would otherwise cost six draw calls per box) */
function box(w, h, d, mats, uv, shadow) {
  const base = boxGeo(w, h, d, uv);
  let mesh;
  if (mats instanceof THREE.Material) mesh = new THREE.Mesh(base, mats);
  else {
    const per = FACES.map(k => mats[k] || mats.all), uniq = [];
    const pat = per.map(m => { let i = uniq.indexOf(m); if (i < 0) { i = uniq.length; uniq.push(m); } return i; });
    if (uniq.length === 1) mesh = new THREE.Mesh(base, uniq[0]);
    else {
      const gk = base.uuid + '#' + pat.join('');
      let g = GEO[gk];
      if (!g) {
        g = GEO[gk] = new THREE.BufferGeometry();
        for (const a in base.attributes) g.setAttribute(a, base.attributes[a]);
        const src = base.index.array, idx = [];
        for (let m = 0; m < uniq.length; m++) {
          const st = idx.length;
          for (let f = 0; f < 6; f++) if (pat[f] === m) for (let k = 0; k < 6; k++) idx.push(src[f * 6 + k]);
          g.addGroup(st, idx.length - st, m);
        }
        g.setIndex(idx);
      }
      mesh = new THREE.Mesh(g, uniq);
    }
  }
  mesh.castShadow = shadow !== false; mesh.receiveShadow = true;
  return mesh;
}
/* merge indexed geometries into one mesh geometry, one draw group per material index.
   parts = [[geometry, materialIndex, matrix4 | null], ...]; build time only */
function mergeGeo(parts) {
  let nv = 0, ni = 0;
  for (const p of parts) { nv += p[0].attributes.position.count; ni += p[0].index.count; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uvs = new Float32Array(nv * 2), idx = new Uint32Array(ni);
  const out = new THREE.BufferGeometry(), v = new THREE.Vector3(), nm = new THREE.Matrix3();
  const order = parts.slice().sort((a, b) => a[1] - b[1]);
  let vo = 0, io = 0, gStart = 0, gMat = order[0][1];
  for (const [g, mi, mtx] of order) {
    if (mi !== gMat) { out.addGroup(gStart, io - gStart, gMat); gStart = io; gMat = mi; }
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, I = g.index;
    if (mtx) nm.getNormalMatrix(mtx);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); if (mtx) v.applyMatrix4(mtx); pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
      v.fromBufferAttribute(N, i); if (mtx) v.applyMatrix3(nm).normalize(); nrm[(vo + i) * 3] = v.x; nrm[(vo + i) * 3 + 1] = v.y; nrm[(vo + i) * 3 + 2] = v.z;
      uvs[(vo + i) * 2] = U.getX(i); uvs[(vo + i) * 2 + 1] = U.getY(i);
    }
    for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo;
    vo += P.count; io += I.count;
  }
  out.addGroup(gStart, io - gStart, gMat);
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
/* half-ellipsoid helpers for the cocoon: unit hemisphere whose UVs are a planar projection (x → u, −z → v) into a crop */
function hemi(top, crop, wSeg, hSeg) {
  const g = new THREE.SphereGeometry(1, wSeg, hSeg, 0, TAU, top ? 0 : PI / 2, PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = clamp(p.getX(i), -1, 1), z = clamp(p.getZ(i), -1, 1);
    uv.setXY(i, crop[0] + (0.5 + 0.5 * x) * (crop[2] - crop[0]), crop[1] + (0.5 - 0.5 * z) * (crop[3] - crop[1]));
  }
  uv.needsUpdate = true;
  return g;
}
/* UV crop in tile units for a face of w×h blocks (materials with RepeatWrapping) */
function cu(w, h, T, ox, oy) { return [ox, oy, ox + w / T, oy + h / T]; }
function tiled(w, h, d, T, r) {
  return { px: cu(d, h, T, r(), r()), nx: cu(d, h, T, r(), r()), py: cu(w, d, T, r(), r()), ny: cu(w, d, T, r(), r()),
           pz: cu(w, h, T, r(), r()), nz: cu(w, h, T, r(), r()) };
}
let EYE_GEO = null;
function eyeGeo() {           // unit sphere with planar front UVs so rotating it moves the iris like a real eyeball
  if (EYE_GEO) return EYE_GEO;
  const g = new THREE.SphereGeometry(1, 24, 16), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, EYE_TEX.cu + p.getX(i) * EYE_UV, EYE_TEX.cv + p.getY(i) * EYE_UV);
  uv.needsUpdate = true;
  return EYE_GEO = g;
}
function texURL(id) { return HR.texURL(id, '_basecolor.png'); }
/* iris colour variants: canvas recolour inside the measured iris circle (never material.color, it would dye the sclera) */
let EYE_MATS = null;
const EYE_KINDS = ['hazel', 'blue', 'brown', 'milky', 'grey'];
function paintEye(img, c, kind) {
  const g = c.getContext('2d'), N = c.width;
  g.drawImage(img, 0, 0, N, N);
  if (kind === 'grey') return;
  const d = g.getImageData(0, 0, N, N), px = d.data;
  const cx = EYE_TEX.cu * N, cy = (1 - EYE_TEX.cv) * N, R = EYE_TEX.iris * N, PR = EYE_TEX.pupil * N;
  const y0 = Math.max(0, Math.floor(cy - R * 1.25)), y1 = Math.min(N, Math.ceil(cy + R * 1.25));
  for (let y = y0; y < y1; y++) for (let x = Math.max(0, Math.floor(cx - R * 1.25)); x < Math.min(N, cx + R * 1.25); x++) {
    const r = Math.hypot(x - cx, y - cy), i = (y * N + x) * 4;
    const R0 = px[i], G0 = px[i + 1], B0 = px[i + 2];
    const L = (0.3 * R0 + 0.59 * G0 + 0.11 * B0) / 255;
    if (kind === 'milky') {                          // cataract: a cloudy blue-white film over iris and pupil
      const w = clamp((R * 1.12 - r) / (R * 0.3), 0, 1) * 0.8;
      if (w <= 0) continue;
      const cl = 0.78 + 0.22 * L;
      px[i] = R0 + (226 * cl - R0) * w; px[i + 1] = G0 + (230 * cl - G0) * w; px[i + 2] = B0 + (236 * cl - B0) * w;
      continue;
    }
    const w = clamp((R + 4 - r) / 8, 0, 1);
    if (w <= 0) continue;
    let tr, tg, tb, gain;
    const k = clamp((r - PR) / (R - PR), 0, 1);
    if (kind === 'blue') { tr = 0.42; tg = 0.66; tb = 1.0; gain = 1.55; }
    else if (kind === 'brown') { tr = 0.62; tg = 0.36; tb = 0.16; gain = 1.25; }
    else { tr = 0.85 - 0.4 * k; tg = 0.55 + 0.1 * k; tb = 0.18 + 0.08 * k; gain = 1.5; }   // hazel: amber core, green rim
    const keep = clamp((L - 0.72) / 0.2, 0, 1);      // glare streaks stay white
    const nr = Math.min(255, 255 * L * gain * tr), ng = Math.min(255, 255 * L * gain * tg), nb = Math.min(255, 255 * L * gain * tb);
    const a = w * (1 - keep);
    px[i] = R0 + (nr - R0) * a; px[i + 1] = G0 + (ng - G0) * a; px[i + 2] = B0 + (nb - B0) * a;
  }
  g.putImageData(d, 0, 0);
}
function eyeMats() {
  if (EYE_MATS) return EYE_MATS;
  const nrm = HR.mat('eye_human', { rough: 0.05, normalScale: 0.25, roughMap: false }).normalMap;
  EYE_MATS = {}; const cv = {};
  for (const k of EYE_KINDS) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'); g.fillStyle = '#e8dcd6'; g.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    /* faint eyeshine so the eyes still read in a torch-lit cave; kept out of `mats` so hurt flashes never wipe it */
    EYE_MATS[k] = new THREE.MeshStandardMaterial({ map: tex, normalMap: nrm, normalScale: new THREE.Vector2(0.25, 0.25),
      roughness: 0.05, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.07 });
    cv[k] = { c, tex };
  }
  HR.loadImg(texURL('eye_human'), img => { for (const k of EYE_KINDS) { paintEye(img, cv[k].c, k); cv[k].tex.needsUpdate = true; } });   /* rig.js retries http drops */
  return EYE_MATS;
}
/* fingernail plate for the outward face of each fingertip: real skin + bone photos composited into a nail with grime */
let NAIL = null;
function nailMat() {
  if (NAIL) return NAIL;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#c99c86'; g.fillRect(0, 0, 128, 256);
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
  NAIL = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.32, metalness: 0 });
  let skin = null, bone = null, n = 0;
  const draw = () => {
    if (++n < 2) return;
    g.drawImage(skin, 300, 200, 200, 400, 0, 0, 128, 256);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#e0b8a0'; g.fillRect(0, 0, 128, 256);
    g.globalCompositeOperation = 'source-over';
    /* nail plate: cuticle 30 % down from the leg end, a long overgrown free edge reaching the very tip */
    const plate = () => { g.beginPath(); g.moveTo(14, 92); g.quadraticCurveTo(64, 58, 114, 92); g.lineTo(116, 226);
      g.quadraticCurveTo(116, 256, 64, 256); g.quadraticCurveTo(12, 256, 12, 226); g.closePath(); };
    g.save(); plate(); g.clip();
    g.drawImage(skin, 520, 520, 200, 400, 0, 0, 128, 256);                     // pink nail bed showing through
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#e9a39a'; g.fillRect(0, 0, 128, 256);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 0.38; g.drawImage(bone, 120, 180, 180, 360, 0, 0, 128, 256); g.globalAlpha = 1;   // keratin
    g.fillStyle = 'rgba(255,246,236,0.45)'; g.beginPath(); g.ellipse(64, 96, 34, 17, 0, 0, TAU); g.fill();   // lunula
    g.strokeStyle = 'rgba(150,100,90,0.16)'; g.lineWidth = 2;
    for (let x = 26; x < 112; x += 11) { g.beginPath(); g.moveTo(x, 80); g.lineTo(x + 1, 250); g.stroke(); }   // ridges
    const fe = 196;                                                             // free edge: thick, long, yellowed
    g.save(); g.beginPath(); g.moveTo(0, fe + 8); g.quadraticCurveTo(64, fe - 10, 128, fe + 8); g.lineTo(128, 256); g.lineTo(0, 256); g.closePath(); g.clip();
    g.drawImage(bone, 600, 300, 160, 240, 0, fe - 12, 128, 72);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#efdcb4'; g.fillRect(0, fe - 12, 128, 72);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(48,30,16,0.75)'; g.beginPath(); g.moveTo(0, fe + 10); g.quadraticCurveTo(64, fe - 8, 128, fe + 10);
    g.lineTo(128, fe + 17); g.quadraticCurveTo(64, fe, 0, fe + 17); g.closePath(); g.fill();                     // grime under the nail
    g.restore();
    const gr = g.createLinearGradient(0, 0, 128, 0);                            // curvature + gloss
    gr.addColorStop(0, 'rgba(90,40,35,0.4)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    gr.addColorStop(0.65, 'rgba(255,255,255,0.0)'); gr.addColorStop(1, 'rgba(90,40,35,0.4)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
    g.restore();
    g.strokeStyle = 'rgba(120,52,44,0.7)'; g.lineWidth = 6;                     // cuticle and nail folds
    g.beginPath(); g.moveTo(14, 92); g.quadraticCurveTo(64, 58, 114, 92); g.stroke();
    g.strokeStyle = 'rgba(140,70,60,0.35)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(12, 96); g.lineTo(12, 200); g.moveTo(116, 96); g.lineTo(116, 200); g.stroke();
    tex.needsUpdate = true;
  };
  HR.loadImg(texURL('mat_skin'), im => { skin = im; draw(); });   /* rig.js retries http drops */
  HR.loadImg(texURL('mat_bone'), im => { bone = im; draw(); });
  return NAIL;
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
const wrapA = a => { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; };
const lerpA = (a, b, k) => a + wrapA(b - a) * k;
const follow = (cur, goal, rate, dt) => cur + (goal - cur) * (1 - Math.exp(-rate * dt));

HR.MODELS.spider = () => {
  const R = rng(++SEEDS * 7919 + Math.floor(Math.random() * 1e6));
  const G = rng(4242);   // fixed seed for UV crops: every spider gets identical geometry, so the cache shares it
  const root = new THREE.Group(); root.name = 'spider';

  /* materials: per-instance clones (textures shared) so a hurt flash only hits this spider */
  const HL = [], cl = (id, o) => { const b = hmat(id, o), c = b.clone(); HL.push(b, c); return c; };
  /* chitin has no roughness map: a dark tint and a matt-ish flat roughness keep it black bristle, not pale grey, in sun */
  const chit = cl('mat_chitin', { color: 0x2a2624, rough: 0.6, roughMap: false, repeat: [1, 1], normalScale: 0.8 });
  /* skin roughness map averages .35: 1.55 x .35 = .55 effective (bible skin) */
  const tipSkin = cl('mat_skin', { color: 0xe0b8a0, rough: 1.55, normalScale: 0.5 });
  const nail = nailMat().clone();
  const silk = cl('cocoon', { rough: 0.9, roughMap: false, normalScale: 0.9 });
  /* wet dark flesh rim the eyes sit in (rotflesh, flat roughness .18: wet) */
  const rimM = cl('mat_rotflesh', { color: 0x2a100c, rough: 0.18, roughMap: false, normalScale: 0.5 });
  const mats = [chit, tipSkin, nail, silk, rimM];
  const EM = eyeMats();

  /* eight human eyes: [x, y, size, iris kind]; big centre pair, side pair, brow row of four */
  const EYES = [
    [ 0.095, 0.035, 0.16, 'hazel'], [-0.095, 0.035, 0.16, 'blue'],
    [ 0.245, 0.075, 0.12, 'brown'], [-0.245, 0.075, 0.12, 'grey'],
    [ 0.058, 0.195, 0.08, 'brown'], [-0.058, 0.195, 0.08, 'milky'],
    [ 0.168, 0.180, 0.08, 'blue'],  [-0.168, 0.180, 0.08, 'hazel'],
  ];
  const EYE_SINK = 0.75;                     // eyeball centre sits .75 r behind the face: only a .25 r cap shows

  /* ---- body ---- */
  const body = HR.joint(root, 0, BODY_Y, 0);
  const abd = HR.at(body, box(1.10, 0.50, 1.20, chit, tiled(1.10, 0.50, 1.20, CT, G)), 0, 0, 0);
  const headJ = HR.joint(body, 0, HIP_Y, 0.55);
  const HEAD_FRONT = 0.60;
  {  /* head box + eight wet almond rims merged into one mesh (2 draw groups): the eyes sit IN flesh, not on it */
    const hUV = tiled(0.62, 0.55, 0.60, CT, G);
    if (!GEO.spiderHead) {
      const parts = [[boxGeo(0.62, 0.55, 0.60, hUV), 0, null]];
      const ring = new THREE.TorusGeometry(1, 0.2, 6, 14), mtx = new THREE.Matrix4(), sc = new THREE.Matrix4();
      for (const e of EYES) {
        const r = e[2] / 2, vis = r * Math.sqrt(1 - EYE_SINK * EYE_SINK);   // eyeball radius where it meets the face
        mtx.makeTranslation(e[0], e[1], 0.30 + 0.004);
        sc.makeScale(vis * 1.12, vis * 0.86, vis * 0.9);                     // almond: the lids crop the iris top and bottom
        parts.push([ring, 1, mtx.clone().multiply(sc)]);
      }
      GEO.spiderHead = mergeGeo(parts);
    }
    const hm = HR.at(headJ, new THREE.Mesh(GEO.spiderHead, [chit, rimM]), 0, 0, 0.30);
    hm.castShadow = hm.receiveShadow = true;
  }
  const eyes = EYES.map((e, i) => {
    const r = e[2] / 2;
    const j = HR.joint(headJ, e[0], e[1], HEAD_FRONT - EYE_SINK * r);
    const m = new THREE.Mesh(eyeGeo(), EM[e[3]]); m.scale.setScalar(r); m.castShadow = false; m.receiveShadow = true;
    j.add(m);
    return { j, y: 0, p: 0, delay: e[2] > 0.15 ? 0 : e[2] > 0.1 ? 0.06 + R() * 0.04 : 0.09 + R() * 0.11,
             every: 2 + R() * 5, off: R() * 7, drift: R() * 100, shut: 0 };
  });

  /* chelicerae, hinged at the top so they can spread */
  const chel = [1, -1].map(sd => {
    const j = HR.joint(headJ, sd * 0.10, -0.14, 0.565);
    HR.at(j, box(0.10, 0.20, 0.12, chit, tiled(0.10, 0.20, 0.12, CT, G), false), 0, -0.10, 0);
    return { j, sd };
  });

  /* ---- legs: hip (yaw) → femur (rot.z) → knee (rot.z) → tip (rot.z) → fingertip ---- */
  const legs = [];
  for (let s = 0; s < 2; s++) for (let i = 0; i < 4; i++) {
    const sd = s === 0 ? 1 : -1, hz = HIP_Z[i];
    const hip = HR.joint(body, sd * HIP_X, HIP_Y, hz);
    const fem = HR.joint(hip, 0, 0, 0);
    HR.at(fem, box(0.085, L1 + 0.06, 0.085, chit, { px: cu(0.085, L1, CT, G(), G()), nx: cu(0.085, L1, CT, G(), G()),
      pz: cu(0.085, L1, CT, G(), G()), nz: cu(0.085, L1, CT, G(), G()) }), 0, L1 / 2, 0);
    const knee = HR.joint(fem, 0, L1, 0);
    HR.at(knee, box(0.07, L2 + 0.03, 0.07, chit, { px: cu(0.07, L2, CT, G(), G()), nx: cu(0.07, L2, CT, G(), G()),
      pz: cu(0.07, L2, CT, G(), G()), nz: cu(0.07, L2, CT, G(), G()) }), 0, -L2 / 2 + 0.015, 0);
    const tip = HR.joint(knee, 0, -L2, 0);
    const fm = sd > 0 ? { all: tipSkin, px: nail } : { all: tipSkin, nx: nail };
    const fingertip = HR.at(tip, box(0.078, FT, 0.078, fm, null, false), 0, -FT / 2, 0);
    const fa = FWD[i];
    const rx = sd * HIP_X + sd * REACH * Math.cos(fa), rz = hz + REACH * Math.sin(fa);
    legs.push({ sd, i, hip, fem, knee, tip, fingertip, hx: sd * HIP_X, hy: HIP_Y, hz, rx, rz, grp: (i + s) % 2,
      yaw: 0, p1: 0, p2: 0, sYaw: 0, sP1: 0, sP2: 0, tYaw: 0, tP1: 0, tP2: 0, dYaw: 0, dP1: 0, dP2: 0, nz: R() * 50 });
  }

  /* IK in the leg's vertical plane (body-local). away=false: plane points at the target (knee up);
     away=true: plane points away from it (target inward, knee out), used for the curled death poses */
  function solve(lg, tx, ty, tz, away) {
    const dx = tx - lg.hx, dy = ty - lg.hy, dz = tz - lg.hz;
    let r = Math.sqrt(dx * dx + dz * dz), ox = dx, oz = dz;
    if (away) { ox = -dx; oz = -dz; r = -r; }
    lg.yaw = lg.sd > 0 ? Math.atan2(-oz, ox) : Math.atan2(oz, -ox);
    const b = Math.atan2(dy, r);
    const d = clamp(Math.sqrt(r * r + dy * dy), 0.36, L1 + L2 - 0.005);
    const k = b + Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const kx = L1 * Math.cos(k), ky = L1 * Math.sin(k), ex = d * Math.cos(b), ey = d * Math.sin(b);
    lg.p1 = Math.atan2(kx, ky);
    lg.p2 = Math.atan2(ex - kx, ky - ey);
  }
  function pose(lg, yaw, p1, p2, tipZ) {
    lg.hip.rotation.y = yaw; lg.fem.rotation.z = -lg.sd * p1; lg.knee.rotation.z = lg.sd * (p1 + p2); lg.tip.rotation.z = tipZ;
  }
  /* death poses, solved once: legs drawn in under the belly (tuck), then fingertips steepled (pray) */
  for (const lg of legs) {
    lg.tYaw = lg.sd > 0 ? -FWD[lg.i] * 0.5 : FWD[lg.i] * 0.5; lg.tP1 = PI - 0.28; lg.tP2 = -0.95;
    solve(lg, lg.sd * 0.12, -1.02, lg.hz * 0.12 + 0.04, true);
    lg.dYaw = lg.yaw; lg.dP1 = lg.p1; lg.dP2 = lg.p2;
  }

  /* ---- cocoon: separate from the body so it can roll off on death ---- */
  const coc = HR.joint(root, 0, BODY_Y + COC_Y, 0);
  const cocS = HR.joint(coc, 0, 0, 0);                // twitch scale pulse
  if (!GEO.cocBody) {
    /* the bundled body: an ellipsoid with silk wound round its long axis (poles at the ends, UV seam underneath) */
    const g = new THREE.SphereGeometry(1, 18, 12); g.rotateZ(PI / 2); g.rotateY(PI / 2);
    const uv = g.attributes.uv, c = COC_BODY_CROP;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, c[0] + uv.getX(i) * (c[2] - c[0]), c[1] + uv.getY(i) * (c[3] - c[1]));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const f = 1 - COC_TAPER * Math.max(0, p.getZ(i)); p.setXY(i, p.getX(i) * f, p.getY(i) * f); }
    g.computeVertexNormals();
    GEO.cocBody = g;
    /* the wrapped head: face pressed up through the silk on the top half, plain silk underneath */
    GEO.cocHead = mergeGeo([[hemi(true, COC_FACE, 18, 7), 0, null], [hemi(false, SILK_UNDER, 18, 4), 0, null]]);
  }
  const cocBody = HR.at(cocS, new THREE.Mesh(GEO.cocBody, silk), 0, -0.07, 0.20);   // z −0.16..+0.56, feet toward the spider's head
  cocBody.scale.set(COC_BODY[0], COC_BODY[1], COC_BODY[2]); cocBody.castShadow = cocBody.receiveShadow = true;
  const cocHead = HR.joint(cocS, 0, -0.12, -0.10);    // the victim's neck (front-bottom of the head end)
  const cocHeadM = HR.at(cocHead, new THREE.Mesh(GEO.cocHead, silk), COC_HEAD_C[0], COC_HEAD_C[1], COC_HEAD_C[2]);
  cocHeadM.scale.set(COC_HEAD[0], COC_HEAD[1], COC_HEAD[2]); cocHeadM.castShadow = cocHeadM.receiveShadow = true;

  /* ---- state ---- */
  const inv = new THREE.Matrix4(), v = new THREE.Vector3();
  let gph = 0, drumAt = 0.8 + R() * 1.2, atk = -1, lastCd = 0, wind = 0, windT = 0;
  const sac = { at: 0, next: 0.3, y: 0, p: 0, oy: 0, op: 0 };
  const cs = { jx: { a: 0, v: 0 }, jz: { a: 0, v: 0 }, y: 0, vy: 0, twAt: -9, next: 2.5 + R() * 1.5, head: 0, goal: 0.1,
               side: 1 };
  let wasDead = false, hurtLast = 0, flinch = 0, lastRoll = 0, rollV = 0, healT = 0, healNext = 1.5;
  let lastBz = 0, bzV = 0, bzA = 0, lastPitch = 0, pitchV = 0, pitchA = 0;
  const snap = { px: 0, py: 0, pz: 0, rx: 0, rz: 0 };

  function twitchCocoon(t, big) {
    cs.twAt = t; cs.next = t + 8 + R() * 7;
    cs.side = cs.goal > 0 ? -1 : 1;
    cs.goal = cs.side * (0.12 + R() * 0.1) * (big ? 1.3 : 1);
    cs.jz.v += cs.side * (big ? 2.2 : 1.6);
  }

  function update(dt, t, s) {
    dt = clamp(dt, 0, 0.1);
    healT += dt; if (healT >= healNext && healNext < 40) { healNext += 2; heal(HL); }
    const dead = s.dead || 0, speed = clamp(s.speed || 0, 0, 1);
    if (dead > 0 && !wasDead) {                          // freeze the living leg angles and the cocoon pose
      for (let iLG = 0; iLG < legs.length; iLG++) { const lg = legs[iLG]; lg.sYaw = lg.hip.rotation.y; lg.sP1 = lg.p1; lg.sP2 = lg.p2; }
      snap.px = coc.position.x; snap.py = coc.position.y; snap.pz = coc.position.z; snap.rx = coc.rotation.x; snap.rz = coc.rotation.z;
    }
    wasDead = dead > 0;

    /* attack: start on the cooldown's rising edge; proximity wind-up lets the lunge land on the damage frame */
    const cd = s.cd || 0;
    if (cd > lastCd + 0.25 && dead === 0) { atk = wind > 0.5 ? 0.45 : 0; twitchCocoon(t, true); }
    lastCd = cd;
    if (atk >= 0) { atk += dt / 0.8; if (atk >= 1) atk = -1; }
    if (dead === 0 && atk < 0 && (s.near || 9) < 2.2 && cd < 0.27) windT += dt; else windT = 0;
    wind = follow(wind, windT > 0 && windT < 0.4 ? 1 : 0, 8, dt);
    const a = atk < 0 ? 0 : atk;
    const rear = atk < 0 ? 0.7 * wind : Math.max(seg(a, 0, 0.38) * (1 - seg(a, 0.45, 0.58)), 0.7 * wind * (1 - seg(a, 0, 0.2)));
    const lunge = atk < 0 ? 0 : seg(a, 0.45, 0.55) * (1 - seg(a, 0.62, 1.0));

    /* hurt: every eye squeezes shut at once (the only time they sync), body flinches, the passenger twitches */
    const hurt = s.hurt || 0;
    if (hurt > hurtLast + 0.3 && dead === 0) twitchCocoon(t, false);
    hurtLast = hurt;
    flinch = hurt > 0.6 ? 1 : follow(flinch, 0, 10, dt);

    /* ---- body pose ---- */
    gph += dt * 2.2;
    if (gph > 1000) gph -= 1000;
    const bobW = TAU * 4.4, bob = 0.016 * speed * Math.sin(bobW * t);
    const bobAcc = -0.016 * speed * bobW * bobW * Math.sin(bobW * t);
    let roll = 0.035 * speed * Math.sin(TAU * gph);
    let by = BODY_Y - 0.05 * speed + bob - 0.05 * flinch + 0.006 * Math.sin(TAU * 0.45 * t);
    let bz = 0.35 * lunge, pitch = -0.61 * rear + 0.13 * lunge;
    let dR = 0;
    if (dead > 0) {
      const spasm = seg(dead, 0, 0.03) * (1 - seg(dead, 0.05, 0.12));
      dR = seg(dead, 0.12, 0.40);
      roll = PI * dR + 0.04 * HR.noise(t * 30, 3) * spasm;
      by = lerp(BODY_Y, 0.30, dR) + 0.36 * Math.sin(PI * dR) - 0.06 * spasm;
      pitch = -0.06 * dR; bz = 0;
    }
    if (dt > 0) {   // finite-difference body motion drives the passenger's inertia (clamped against hitches)
      rollV = (roll - lastRoll) / dt;
      const nbz = (bz - lastBz) / dt, npv = (pitch - lastPitch) / dt;
      bzA = clamp((nbz - bzV) / dt, -60, 60); pitchA = clamp((npv - pitchV) / dt, -120, 120); bzV = nbz; pitchV = npv;
    }
    lastRoll = roll; lastBz = bz; lastPitch = pitch;
    body.rotation.set(pitch, 0, roll);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    body.position.set(0, by + PIV_Y - (PIV_Y * cp - PIV_Z * sp), bz + PIV_Z - (PIV_Y * sp + PIV_Z * cp));
    abd.scale.set(1 + 0.012 * Math.sin(TAU * 0.45 * t), 1 + 0.02 * Math.sin(TAU * 0.45 * t), 1);
    body.updateMatrix(); inv.copy(body.matrix).invert();

    /* ---- legs ---- */
    if (dead === 0) {
      const idle = (1 - speed) * (atk < 0 ? 1 : 0) * (1 - flinch);
      if (t > drumAt + 0.7) drumAt = t + 1.5 + R() * 1.5;          // next impatient roll of the fingernails
      for (let k = 0; k < 8; k++) {
        const lg = legs[k];
        /* tetrapod gait: stance slides back, swing lifts and reaches forward */
        const ph = (gph + lg.grp * 0.5) % 1;
        let off, lift = 0, squash = 0;
        if (ph < 0.5) { const u = ph / 0.5; off = 0.22 * (1 - 2 * u); squash = Math.max(0, 1 - u / 0.2); }
        else { const u = (ph - 0.5) / 0.5; off = 0.22 * (-1 + 2 * sm(u)); lift = 0.15 * Math.sin(PI * u); }
        /* drum: 90 ms pulse per leg, staggered 65 ms in DRUM_ORDER */
        const dIdx = DRUM_ORDER.indexOf(k), dt0 = t - (drumAt + dIdx * 0.065);
        const tap = dt0 > 0 && dt0 < 0.09 ? Math.sin(dt0 / 0.09 * PI) * idle : 0;
        const tapHit = dt0 >= 0.09 && dt0 < 0.14 ? (1 - (dt0 - 0.09) / 0.05) * idle : 0;
        const fx = lg.rx * (1 + 0.08 * flinch), fy = FOOT_Y + lift * speed + 0.085 * tap, fz = lg.rz + off * speed;
        v.set(fx, fy, fz).applyMatrix4(inv);
        let tx = v.x, ty = v.y, tz = v.z, point = 0;
        if (lg.i === 3) {          // front pair: rear up with the fingertips pointing at you, then strike forward
          if (rear > 0) { tx = lerp(tx, lg.sd * 0.44, rear); ty = lerp(ty, -0.30, rear); tz = lerp(tz, 1.48, rear); point = rear; }
          if (lunge > 0) { tz += 0.42 * lunge; }
        } else if (lg.i === 2 && rear > 0) { ty += 0.30 * rear; tz += 0.15 * rear; }
        solve(lg, tx, ty, tz, false);
        const tipZ = -lg.sd * lg.p2 * (1 - point) + lg.sd * 0.55 * tap;
        pose(lg, lg.yaw, lg.p1, lg.p2, tipZ);
        lg.fingertip.scale.y = 1 - 0.15 * Math.max(squash * speed, tapHit);
      }
    } else {
      const wT = seg(dead, 0.03, 0.18), wP = seg(dead, 0.40, 0.62);
      const shake = (1 - seg(dead, 0.62, 1.0)) * 0.05 + 0.012;       // last tremors in the curled legs
      for (let iLG = 0; iLG < legs.length; iLG++) { const lg = legs[iLG];
        const kick = seg(dead, 0, 0.03) * (1 - seg(dead, 0.03, 0.10)) * 0.5;
        let yaw = lerpA(lg.sYaw, lg.tYaw, wT), p1 = lerp(lg.sP1 - kick, lg.tP1, wT), p2 = lerp(lg.sP2 + kick, lg.tP2, wT);
        yaw = lerpA(yaw, lg.dYaw, wP); p1 = lerp(p1, lg.dP1, wP); p2 = lerp(p2, lg.dP2, wP);
        p1 += shake * HR.noise(t * 9, lg.nz) * wP; p2 += shake * HR.noise(t * 11, lg.nz + 7) * wP;
        pose(lg, yaw, p1, p2, 0);
        lg.p1 = p1; lg.p2 = p2;
        lg.fingertip.scale.y = 1;
      }
    }

    /* ---- head, eyes, chelicerae ---- */
    const hy = dead > 0 ? 0 : clamp(s.yaw || 0, -1.1, 1.1) * 0.32, hp = dead > 0 ? 0.25 * dR : clamp(s.pitch || 0, -0.6, 0.6) * 0.3;
    headJ.rotation.set(hp + 0.05 * HR.twitch(t, 11, 0.9, 5), hy, 0);
    let ly = clamp((s.yaw || 0) - hy, -0.45, 0.45), lp = clamp((s.pitch || 0) - hp - pitch, -0.35, 0.35);
    if (t > sac.next || Math.abs(ly - sac.y) > 0.22 || Math.abs(lp - sac.p) > 0.18) {
      sac.oy = sac.y; sac.op = sac.p; sac.at = t; sac.next = t + 0.4 + R() * 2.1;
      sac.y = ly + (R() - 0.5) * 0.08; sac.p = lp + (R() - 0.5) * 0.06;
    }
    const allShut = dead > 0 ? 1 - seg(dead, 0.5, 0.8) * 0.6 : hurt > 0.6 ? 1 : 0;
    for (let k = 0; k < 8; k++) {
      const e = eyes[k];
      if (dead === 0) {
        const late = t - sac.at < e.delay;
        e.y = follow(e.y, late ? sac.oy : sac.y, 45, dt);
        e.p = follow(e.p, late ? sac.op : sac.p, 45, dt);
      }
      const wander = EYES[k][2] < 0.1 ? 0.07 * HR.noise(t * 0.7, e.drift) : 0;     // a small one drifts on its own
      e.j.rotation.set(e.p, e.y + wander, 0);
      const ph = (t + e.off) % e.every;
      let shut = ph < 0.12 ? Math.sin(ph / 0.12 * PI) : 0;
      if (dead > 0) shut = k % 3 === 0 ? 1 - seg(dead, 0.55, 0.7) * 0.5 : allShut;   // they do not reopen together
      else shut = Math.max(shut, allShut);
      e.j.scale.set(1, 1 - 0.9 * shut, 1);
    }
    const spread = Math.max(rear, lunge, 0.25 * flinch, dead > 0 ? 0.4 * (1 - seg(dead, 0.2, 0.6)) : 0);
    for (let iC = 0; iC < chel.length; iC++) { const c = chel[iC];
      c.j.rotation.z = c.sd * (0.4 * spread + 0.04 * HR.noise(t * 2.3, c.sd + 4));
      c.j.rotation.x = -0.35 * spread + 0.05 * HR.noise(t * 1.7, c.sd + 9);
    }

    /* ---- cocoon ---- */
    const n = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / n;
    for (let i = 0; i < n; i++) {
      HR.pendulum(cs.jx, h, -1.2 * ((s.accel ? s.accel.z : 0) + bzA) - 0.35 * pitchA, 34, 3.2);
      HR.pendulum(cs.jz, h, -0.8 * rollV, 30, 3.0);
      cs.vy += (-160 * cs.y - 9 * cs.vy - bobAcc * 0.8) * h; cs.y += cs.vy * h;
    }
    cs.jx.a = clamp(cs.jx.a, -0.25, 0.25); cs.jz.a = clamp(cs.jz.a, -0.25, 0.25); cs.y = clamp(cs.y, -0.05, 0.05);
    if (dead === 0 && t > cs.next) twitchCocoon(t, false);
    const tw = t - cs.twAt, pulse = tw >= 0 && tw < 0.3 ? Math.sin(tw / 0.3 * PI) : 0;
    cs.head = follow(cs.head, cs.goal + 0.03 * HR.noise(t * 0.4, 21), 7, dt);
    const lift = dead > 0 ? COC_LIFT * (1 - seg(dead, 0.12, 0.35)) : COC_LIFT * (1 - 0.6 * rear) + 0.04 * HR.noise(t * 0.3, 33);
    cocHead.rotation.set(lift + 0.06 * pulse, cs.head, 0.05 * pulse * cs.side);
    cocS.scale.set(1 + 0.05 * pulse, 1 + 0.05 * pulse + 0.012 * Math.sin(TAU * 0.28 * t), 1 + 0.03 * pulse);
    if (dead === 0) {
      /* ride on the back: body transform applied to the cocoon's body-local seat (0, COC_Y, 0) */
      const cr = Math.cos(roll), sr = Math.sin(roll);
      const ox = -COC_Y * sr, oy0 = COC_Y * cr;
      coc.position.set(body.position.x + ox, body.position.y + oy0 * cp + cs.y, body.position.z + oy0 * sp);
      coc.rotation.set(pitch + cs.jx.a, 0, roll + cs.jz.a);
    } else {
      /* rolls off toward −x (the side the back drops to), one full turn, lands face-up, lies still, twitches once */
      const u = seg(dead, 0.12, 0.42), land = seg(dead, 0.42, 0.47) * (1 - seg(dead, 0.47, 0.55));
      coc.position.set(lerp(snap.px, -1.28, u), lerp(snap.py, 0.205, u) + 0.42 * Math.sin(PI * u) + 0.03 * land, lerp(snap.pz, 0.62, u));
      coc.rotation.set(lerp(snap.rx, 0, u), -0.55 * u, lerp(snap.rz, 0, u) + TAU * sm(u));
      const sn = dead > 0.74 && dead < 0.80 ? Math.sin((dead - 0.74) / 0.06 * PI) : 0;
      cocS.scale.set(1 + 0.04 * sn, 1 - 0.06 * land + 0.08 * sn, 1);
      cocHead.rotation.z = 0.12 * sn;
    }
  }

  return {
    root, update, mats, deathDur: 2.5,
    handles: { head: headJ, body, cocoon: coc, legs: legs.map(l => l.hip), eyes: eyes.map(e => e.j) },
  };
};
})();

