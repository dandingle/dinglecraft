/* honeybee_mc — "The Hive" (Hyperreal pack, DESIGN_BIBLE.md §4).
   The sweetest face in DINGLECRAFT, lovingly colonised: a living honeycomb grown out of her back
   (and now over both shoulders, her skin creeping down her chest after it, and into the back of
   her scalp), antennae out of swollen pink sockets that turn toward whoever is talking before her
   head does, four bees orbiting, and one bee that walks across her open eye while she doesn't blink.
   Hit her: the five bees dart into a row in front of her face, between her and you, and hang there
   dead still for 1.2 s, all staring at you. She just flinches. The smile never breaks.
   Bees are 2x real size (crawler 1.5x) so the stare reads at hit distance.
   Preview: H = the stare row (signature), K = death (the bees, plus two clumps pouring out of the hive,
   ball over her fallen head, hold, disperse), W = skip-walk, A = punch. The crawler reaches her eye
   ~1.5 s after load and every ~30 s after.
   Optional game hooks on s: s.mood === 'happy' (comb pulse 1.2 Hz, orbits widen),
   s.speakerDir (yaw, radians, model space: the antennae turn to it), s.plant (rising edge: kneels,
   pats the ground twice, one bee peels off and lands on the flower ~0.6 in front for ~7 s). */
(function () {
'use strict';
const HR = window.HR;

/* ---------- measured from final_ent/face_bee_basecolor.png (1024², u right, v up) ----------
   eye (image-left, her right, model −x): iris centre px (292,446); lid aperture px x 200–393, y 412–475
   eye (image-right, model +x):           iris centre px (731,446); lid aperture px x 630–820, y 420–472
   → eye centres (u,v) = (0.289,0.565) / (0.711,0.565), aperture width ≈ 0.19 u
   upper lash line py ≈ 405 (v 0.604); blink plate spans py 405–490
   upper-lid skin crop just above each eye: py 355–415 (v 0.595–0.653), lash line at its bottom edge
   painted antenna bumps: px (320,33) and (753,37) → u 0.3125 / 0.735 (asymmetric, kept as painted)
   painted bees (avoid with the crawler path): forehead px 545–700 × 50–225, cheek px 80–225 × 670–830
   colour match (linear tints vs face edges): hair edges #734529 sRGB → hair_shared × #a04a22 */
const EYE_MX = { u: 0.289, v: 0.565 }, EYE_PX = { u: 0.711, v: 0.565 };
/* painted forehead bee, seen from above: head front px (597,92), abdomen tip px (662,212), body ~50 px wide.
   centre c, unit head direction h (image px, y down), px per block s (136 px ↔ 0.077 blocks) */
const PHOTO_BEE = { c: [630, 152.5], h: [-0.476, -0.879], s: 1766 };
const LID_TOP_V = 0.602, LID_H_V = 0.076, LID_W_U = 0.196;
const LID_CROP_V = [0.595, 0.653];
const BUMP_MX_U = 0.3125, BUMP_PX_U = 0.735;
const HEAD = 0.5;                                   /* head cube, neck joint at its bottom centre */
/* head_bee_side (final_ent, 'Head sides (final)' sheet, ledger 11:05): side-profile photo, face toward image-left.
   On px the crop [0,0,1,1] lands the face toward +z; nx is mirrored. Ear at u .52-.79, v .28-.67 (z -.01..-.145,
   y .14-.335 head-local), so the pigtails root behind it. Set false to fall back to hair on the sides. */
const USE_SIDE = true;
/* hair top/back/pigtail tint matched by eye to the side photo's hair (back edge sRGB (134,86,47), top (194,141,90)) */
const HAIR_TINT = [1.08, 0.58, 0.25];
const BEE_ORBIT_S = 2, BEE_CRAWL_S = 1.5;          /* bees read at hit distance (real size = specks past 2 blocks) */
const fx = u => (u - 0.5) * HEAD, fy = v => v * HEAD; /* face-UV → head-local (front face z = +0.25) */
/* clothes: photo-built garment atlases (tools/build_cloth.py). jumper_bee: hand-knitted stockinette, honey-yellow with two
   black stripes knitted in at v .25 / .583 (= the 3D stripe bands, which show the same texels), ribbed crew neck and hem,
   honey run off the right shoulder; front u [0,TF) back [TF,TB) side strip [TB,1], 0.787 u per block, v 0 = hem.
   leggings_bee: leg unwraps A (+x) v .5-1 / B (-x) v 0-.5, front [0,.25) outer [.25,.5) back [.5,.75) inner [.75,1].
   CLOTHES false = the tinted jersey */
const CLOTHES = true;
const TF = 403 / 1024, TB = 806 / 1024, TU = TF / 0.5;
const TORSO_UV = { pz: [0, 0, TF, 1], nz: [TF, 0, TB, 1], px: [TB, 0, 1, 1], nx: [1, 0, TB, 1], py: [0.06, 0.55, TF - 0.06, 0.70], ny: [0.05, 0.004, TF - 0.05, 0.03] };
const STRIPE_UV = vc => ({ pz: [0, vc - 0.0625, TF, vc + 0.0625], nz: [TF, vc - 0.0625, TB, vc + 0.0625], px: [TB, vc - 0.0625, 1, vc + 0.0625], nx: [1, vc - 0.0625, TB, vc + 0.0625],
  py: [0.1, vc + 0.04, TF - 0.1, vc + 0.06], ny: [0.1, vc - 0.06, TF - 0.1, vc - 0.04] });
/* full-length sleeve (0.5 tall) from the side strip: the ribbed hem becomes the cuff, the stripes come round the arm */
const SLEEVE_UV = (() => { const cu = 0.18 * TU, cv = 0.5 / 0.72;
  return { pz: [TB + 0.002, 0, TB + 0.002 + cu, cv], nz: [1 - 0.002, 0, 1 - 0.002 - cu, cv], px: [1 - cu - 0.002, 0, 1 - 0.002, cv], nx: [TB + 0.002 + cu, 0, TB + 0.002, cv],
    py: [TB + 0.01, 0.75, TB + 0.01 + cu, 0.75 + 0.18 / 0.72 * 0.5], ny: [TB + 0.01, 0.005, TB + 0.01 + cu, 0.02] }; })();
function limbUV(A) {
  const v0 = A ? 0.5 : 0, v1 = A ? 1 : 0.5;
  return A ? { pz: [0, v0, 0.25, v1], px: [0.25, v0, 0.5, v1], nz: [0.5, v0, 0.75, v1], nx: [0.75, v0, 1, v1], py: [0.1, v1 - 0.02, 0.2, v1 - 0.01], ny: [0.1, v0 + 0.002, 0.2, v0 + 0.01] }
           : { pz: [0.25, v0, 0, v1], nx: [0.5, v0, 0.25, v1], nz: [0.75, v0, 0.5, v1], px: [1, v0, 0.75, v1], py: [0.1, v1 - 0.02, 0.2, v1 - 0.01], ny: [0.1, v0 + 0.002, 0.2, v0 + 0.01] };
}

/* The rig repairs only its cached base material when a texture fails to load (it nulls base.map); our
   per-instance clones still hold the dead texture and would render black (or mirror-shiny for a dead roughness
   map). Every 0.5 s look for that case and retry the file once (shared across instances), else drop the map. */
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
      if (r.failed) { c[key] = null; c.needsUpdate = true; }
      else if (t !== r) { c[key] = r; c.needsUpdate = true; }
    }
  }
}

/* ---------- shared, built once for every instance ---------- */
let SH = null;
function shared() {
  if (SH) return SH;
  /* bee body = head + thorax + abdomen (merged, long axis +z, ~0.077 long = the size of the painted bees).
     Its UVs are a top-down projection onto the painted forehead bee in face_bee, so every 3D bee is that
     same real photographed bee (folded wings and all), not a CG toy. */
  const part = (r, sx, sy, sz, z) => { const sg = new THREE.SphereGeometry(r, 10, 7); sg.scale(sx, sy, sz); sg.translate(0, 0, z); return { geo: sg }; };
  const bg = merge([part(0.011, 1, 0.95, 1, 0.028), part(0.016, 1, 0.95, 1, 0.011), part(1, 0.015, 0.014, 0.024, -0.014)]);
  { const P = bg.attributes.position, U = bg.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i);
      const px = PHOTO_BEE.c[0] + PHOTO_BEE.s * (z * PHOTO_BEE.h[0] + x * PHOTO_BEE.h[1]);
      const py = PHOTO_BEE.c[1] + PHOTO_BEE.s * (z * PHOTO_BEE.h[1] - x * PHOTO_BEE.h[0]);
      U.setXY(i, px / 1024, 1 - py / 1024);
    } }
  const wg = new THREE.PlaneGeometry(0.1, 0.04); wg.rotateX(-Math.PI / 2);
  /* wing pair canvas (procedural, not a keyed photo): two veined ovals swept back from the thorax */
  const wc = document.createElement('canvas'); wc.width = 128; wc.height = 64;
  const w2 = wc.getContext('2d');
  for (const sd of [-1, 1]) {
    w2.save(); w2.translate(64 + sd * 6, 30); w2.rotate(sd * 0.32);
    const gr = w2.createLinearGradient(0, 0, sd * 58, 0);
    gr.addColorStop(0, 'rgba(235,240,255,0.85)'); gr.addColorStop(1, 'rgba(235,240,255,0.35)');
    w2.fillStyle = gr; w2.beginPath(); w2.ellipse(sd * 30, 4, 29, 13, 0, 0, Math.PI * 2); w2.fill();
    w2.strokeStyle = 'rgba(70,55,35,0.75)'; w2.lineWidth = 1.2;
    w2.beginPath(); w2.ellipse(sd * 30, 4, 29, 13, 0, 0, Math.PI * 2); w2.stroke();
    w2.beginPath(); w2.moveTo(0, 0); w2.lineTo(sd * 52, 2); w2.moveTo(sd * 8, 3); w2.lineTo(sd * 40, 12); w2.moveTo(sd * 20, -6); w2.lineTo(sd * 34, 10); w2.stroke();
    w2.restore();
  }
  const wingTex = new THREE.CanvasTexture(wc); wingTex.encoding = THREE.sRGBEncoding;
  /* honey drip: tapered neck + bead; stretches by joint scale.y */
  const dg = merge([{ geo: new THREE.CylinderGeometry(0.014, 0.0065, 0.11, 7), y: -0.055 }, { geo: new THREE.SphereGeometry(0.0155, 8, 6), y: -0.112, sy: 1.25 }]);
  /* death-ball clumps: 4 orbit-size bees merged on a ring, each flying tangentially, spun as one mesh
     (8 extra bees for 2 meshes, so the ball reads as a ball). Wings are static here; the spin blurs them. */
  const wOff = wg.clone(); wOff.translate(0, 0.02, 0.006);
  const clump = (R, ph) => {
    const parts = [], sc = BEE_ORBIT_S;
    for (let i = 0; i < 4; i++) {
      const a = ph + i * Math.PI / 2, y = 0.07 * Math.sin(i * 2.3 + ph), rx = 0.3 * Math.sin(i * 1.7 + ph), ry = a + Math.PI / 2;
      const x = R * Math.sin(a), z = R * Math.cos(a);
      parts.push({ geo: bg, mi: 0, sx: sc, sy: sc, sz: sc, rx, ry, x, y, z }, { geo: wOff, mi: 1, sx: sc, sy: sc, sz: sc, rx, ry, x, y, z });
    }
    return merge(parts);
  };
  SH = { beeGeo: bg, wingGeo: wg, wingTex, dripGeo: dg, clumpA: clump(0.19, 0.3), clumpB: clump(0.27, 1.1), geo: {} };
  return SH;
}
/* cached box (geometry shared by dimensions + crop), same face-material contract as HR.box */
const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
function box(w, h, d, mats, uv, shadow) {
  const geo = boxGeo(w, h, d, uv);
  let mat = mats;
  if (!(mats instanceof THREE.Material)) mat = FACES.map(k => mats[k] || mats.all);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow !== false; m.receiveShadow = true;
  return m;
}
/* cached box geometry (with optional UV crop) */
function boxGeo(w, h, d, uv) {
  const S = shared(), key = w + ',' + h + ',' + d + (uv ? JSON.stringify(uv) : '');
  return S.geo[key] || (S.geo[key] = HR.box(w, h, d, HR.flat(0x000000), uv).geometry);
}
/* merge static parts [{geo, mi, x,y,z, rx,ry,rz, sx,sy,sz}] into one geometry; mi = material index (groups) */
function merge(parts) {
  parts = parts.slice().sort((p, q) => (p.mi || 0) - (q.mi || 0));
  const gs = parts.map(p => {
    const g = p.geo.clone();
    if (p.sx || p.sy || p.sz) g.scale(p.sx || 1, p.sy || 1, p.sz || 1);
    if (p.rx) g.rotateX(p.rx); if (p.ry) g.rotateY(p.ry); if (p.rz) g.rotateZ(p.rz);
    g.translate(p.x || 0, p.y || 0, p.z || 0); return g;
  });
  let nv = 0, ni = 0; gs.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = new Uint16Array(ni);
  const out = new THREE.BufferGeometry();
  let vo = 0, io = 0;
  gs.forEach((g, k) => {
    P.set(g.attributes.position.array, vo * 3); N.set(g.attributes.normal.array, vo * 3); U.set(g.attributes.uv.array, vo * 2);
    const gi = g.index.array; for (let i = 0; i < gi.length; i++) I[io + i] = gi[i] + vo;
    const mi = parts[k].mi || 0, last = out.groups[out.groups.length - 1];
    if (last && last.materialIndex === mi) last.count += gi.length; else out.addGroup(io, gi.length, mi);
    vo += g.attributes.position.count; io += gi.length; g.dispose();
  });
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  out.setIndex(new THREE.BufferAttribute(I, 1));
  return out;
}
function mesh(geo, mat, shadow) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow !== false; m.receiveShadow = true; return m; }
/* damped spring with its own limits and sub-stepping (frame hitches never spin anything) */
function spring(p, dt, target, drive, k, c, lo, hi) {
  const n = dt > 1 / 30 ? Math.ceil(dt * 60) : 1, h = dt / n;
  for (let i = 0; i < n; i++) {
    p.v += (-k * (p.a - target) - c * p.v + drive) * h;
    p.a += p.v * h;
    if (p.a > hi) { p.a = hi; if (p.v > 0) p.v *= -0.3; }
    if (p.a < lo) { p.a = lo; if (p.v < 0) p.v *= -0.3; }
  }
  if (p.a !== p.a || p.v !== p.v) { p.a = target; p.v = 0; }
  return p.a;
}
const smooth = (a, b, x) => { const t = HR.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrapA = a => a - 6.283185307 * Math.round(a / 6.283185307);
const lerpA = (a, b, k) => a + wrapA(b - a) * k;

/* ---------- the face-crawler's walk, head-local, every segment stays on one cube face ----------
   [x, y, z, nx, ny, nz, speed multiplier for the segment that starts here, pause at this point (s), visible] */
const R2 = Math.SQRT1_2;
const PATH = [
  [fx(0.31), fy(0.22), 0.25, 0, 0, 1, 1, 0, 1],      /* 0 cheek (clear of the painted cheek bee) */
  [fx(0.27), fy(0.40), 0.25, 0, 0, 1, 0.8, 0, 1],    /* 1 under the eye */
  [fx(0.292), fy(0.566), 0.25, 0, 0, 1, 1, 2.8, 1],  /* 2 ON her open eye: stops and grooms. No blink. */
  [fx(0.33), fy(0.70), 0.25, 0, 0, 1, 1, 0, 1],      /* 3 brow */
  [fx(0.40), fy(0.86), 0.25, 0, 0, 1, 1, 0, 1],      /* 4 forehead */
  [fx(0.43), 0.5, 0.25, 0, R2, R2, 1, 0, 1],         /* 5 over the top edge into the hair */
  [-0.12, 0.5, 0.06, 0, 1, 0, 1, 0, 1],              /* 6 top */
  [-0.25, 0.5, -0.06, -R2, R2, 0, 1.3, 0, 1],        /* 7 top / side edge */
  [-0.25, 0.30, -0.125, -1, 0, 0, 1.3, 0, 0],        /* 8 down the side, past her ear, and in under the pigtail (hidden) */
  [-0.25, 0.14, -0.25, -R2, 0, -R2, 6, 0, 0],        /* 9 behind the head (hidden from here) */
  [-0.05, 0.0, -0.25, 0, -R2, -R2, 6, 0, 0],         /* 10 under */
  [-0.12, 0.0, 0.25, 0, -R2, R2, 1, 0, 1],           /* 11 back out at the jaw */
  [-0.11, 0.05, 0.25, 0, 0, 1, 1, 0, 1],             /* 12 */
];
const SEG = PATH.map((a, i) => { const b = PATH[(i + 1) % PATH.length]; return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); });
const CRAWL_SPEED = 0.05;   /* blocks/s on visible faces (bible 0.03; nudged so the eye-walk recurs every ~30 s) */
const FREEZE = 1.2;         /* s the bees hold dead still in their row staring at you (bible 0.3; long enough to read at hit range) */
const ROW_GAP = 0.42;       /* the stare row hangs this far in front of her face, between her and the attacker */
const ROW_SP = 0.13;        /* spacing along the row */
const ROW_Y = [0.025, -0.02, 0.035, -0.01, 0.02];   /* per-slot height jitter: a swarm that stopped, not a ruler */
const BALL_R = 0.25;        /* death ball radius, over her fallen head */

HR.MODELS.honeybee = function () {
  const S = shared();
  const mats = [], pairs = [];
  const M = (id, o) => { const b = HR.mat(id, o), m = b.clone(); mats.push(m); pairs.push([m, b, id]); return m; };

  /* materials (per-instance clones, textures shared). Roughness is compensated for the map averages
     (jersey .31, skin .35) so the effective values hit the bible: jersey .9, skin .55, leather .5. */
  const FACE_O = { rough: 0.5, normalScale: 0.6, roughMap: false };
  const mFace = M('face_bee', FACE_O);
  const mLid = mFace.clone(); mLid.color.setScalar(0.84); mats.push(mLid); pairs.push([mLid, HR.mat('face_bee', FACE_O), 'face_bee']);   /* closed lids ~9 % darker: no light rectangles */
  const mSide = USE_SIDE ? M('head_bee_side', { rough: 0.6, normalScale: 0.6, roughMap: false }) : null;
  const mHair = M('hair_shared', { rough: 0.85, roughMap: false, normalScale: 0.8 });
  mHair.color.setRGB(HAIR_TINT[0], HAIR_TINT[1], HAIR_TINT[2]);
  const mSkin = M('mat_skin', { color: 0xf5cfa8, rough: 1.55 });
  const mSocket = M('mat_skin', { color: 0xe88a8a, rough: 1.0, normalScale: 0.5 });
  const mLip = M('mat_skin', { color: 0xe39a86, rough: 0.85 });  /* inflamed, stretched growth edge, moist (eff. .3) */
  const mChitin = M('mat_chitin', { color: 0x2a2416, rough: 0.35, roughMap: false });
  const mYellow = CLOTHES ? M('jumper_bee', { rough: 0.95, roughMap: false, normalScale: 0.9 }) : M('mat_jersey', { color: 0xf2b21e, rough: 2.9 });
  const mBlack = CLOTHES ? mYellow : M('mat_jersey', { color: 0x0b0b0b, rough: 2.9 });
  const mLegs = CLOTHES ? M('leggings_bee', { rough: 0.8, roughMap: false, normalScale: 0.8 }) : M('mat_jersey', { color: 0x2e2840, rough: 2.9 });
  const mBand = CLOTHES ? M('mat_jersey', { color: 0xf2b21e, rough: 2.9 }) : mYellow;   /* the pigtail bands: plain yellow yarn */
  const mHand = CLOTHES ? M('skin_arm', { color: 0xf5cfa8, rough: 0.55, roughMap: false, normalScale: 0.7 }) : mSkin;   /* her hands: real skin, not a peach block */
  const mShoe = M('mat_skin', { color: 0x3a2418, rough: 1.4 });
  const mComb = M('honeycomb', { rough: 0.3, roughMap: false, normalScale: 0.9 });
  const mHoney = new THREE.MeshStandardMaterial({ color: 0xc98a12, roughness: 0.08, emissive: 0x4a2400, emissiveIntensity: 0.7 });
  const mBee = mFace;   /* bees are UV-projected from the painted bee on her own face texture */
  const mWing = new THREE.MeshStandardMaterial({ map: S.wingTex, color: 0xffffff, roughness: 0.15, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
  mats.push(mWing);

  const root = new THREE.Group();
  const rig = HR.joint(root, 0, 0, 0);            /* everything the body does (flinch, hop, death) */
  const chest = HR.joint(rig, 0, 0.64, 0);        /* hips pivot: torso, hive, arms, head */

  /* torso with its two black stripes (one multi-material mesh) */
  const torso = HR.at(chest, mesh(merge([
    { geo: boxGeo(0.5, 0.72, 0.27, CLOTHES ? TORSO_UV : undefined), mi: 0 },
    { geo: boxGeo(0.51, 0.09, 0.28, CLOTHES ? STRIPE_UV(0.25) : undefined), mi: 1, y: 0.82 - 1.0 }, { geo: boxGeo(0.51, 0.09, 0.28, CLOTHES ? STRIPE_UV(0.583) : undefined), mi: 1, y: 1.06 - 1.0 },
  ]), CLOTHES ? mYellow : [mYellow, mBlack]), 0, 0.36, 0);

  /* the hive: grown out of her upper back, breathes, drips. Pivot on her back so it swells outward.
     hive-local = world - (0, 1.12, -0.135) */
  const hive = HR.joint(chest, 0, 1.12 - 0.64, -0.135);
  const hump = HR.at(hive, box(0.44, 0.5, 0.22, { px: mComb, nx: mComb, nz: mComb, py: mComb, ny: mComb, pz: mSkin },
    { px: [0.08, 0.03, 0.51, 1], nx: [0.5, 0.03, 0.93, 1], nz: [0.06, 0.03, 0.94, 1], py: [0.05, 0.55, 0.93, 0.99], ny: [0.1, 0.0, 0.9, 0.3] }), 0, 0, -0.115);
  hump.rotation.z = 0.08;
  /* extra comb lobes so the hump is lumpy, not a rucksack, plus the comb that has come over both shoulders
     (it sits on the shoulder seam, right beside her jaw, so she reads as colonised from the front) — one mesh */
  const CR = (u0, v0, w, h) => [u0, v0, u0 + w, v0 + h];
  const lobes = [
    { geo: boxGeo(0.26, 0.22, 0.17, { px: CR(0.6, 0.1, 0.2, 0.25), nx: CR(0.2, 0.6, 0.2, 0.25), nz: CR(0.55, 0.05, 0.35, 0.3), py: CR(0.1, 0.1, 0.35, 0.25), ny: CR(0.3, 0.3, 0.3, 0.2) }), x: -0.07, y: -0.30, z: -0.10, rx: 0.12, ry: 0.3, rz: -0.2 },
    { geo: boxGeo(0.2, 0.2, 0.12, { nz: CR(0.15, 0.62, 0.3, 0.3), px: CR(0.7, 0.5, 0.15, 0.3), nx: CR(0.05, 0.3, 0.15, 0.3), py: CR(0.4, 0.8, 0.3, 0.15), ny: CR(0.5, 0.1, 0.3, 0.15) }), x: 0.09, y: 0.11, z: -0.25, rx: 0.3, ry: -0.25, rz: 0.2 },
    { geo: boxGeo(0.12, 0.2, 0.16, { nx: CR(0.3, 0.2, 0.2, 0.3), px: CR(0.6, 0.6, 0.2, 0.3), nz: CR(0.8, 0.4, 0.15, 0.3), py: CR(0.2, 0.4, 0.15, 0.2), ny: CR(0.5, 0.5, 0.15, 0.2) }), x: -0.2, y: 0.02, z: -0.12, ry: 0.2, rz: 0.15 },
  ];
  for (const sd of [1, -1]) {
    const o = sd > 0 ? 0 : 0.4;
    /* shoulder lobe (world ±0.315, 1.385, 0.0) + a smaller bud on the outer shoulder */
    lobes.push({ geo: boxGeo(0.15, 0.08, 0.18, { px: CR(0.1 + o, 0.2, 0.18, 0.1), nx: CR(0.3 + o, 0.55, 0.18, 0.1), py: CR(0.15 + o, 0.3, 0.15, 0.18), pz: CR(0.5 - o, 0.1, 0.15, 0.08), nz: CR(0.2 + o, 0.7, 0.15, 0.08), ny: CR(0.6, 0.6, 0.1, 0.1) }),
      x: sd * 0.315, y: 0.265, z: 0.135, rx: 0.08 * sd, ry: 0.15 * sd, rz: -0.15 * sd });
    lobes.push({ geo: boxGeo(0.07, 0.06, 0.1, { px: CR(0.55 - o, 0.35, 0.08, 0.07), nx: CR(0.25, 0.15 + o, 0.08, 0.07), py: CR(0.7 - o, 0.6, 0.07, 0.1), pz: CR(0.4, 0.45 + o * 0.5, 0.07, 0.06), nz: CR(0.1, 0.85, 0.07, 0.06), ny: CR(0.6, 0.6, 0.07, 0.07) }),
      x: sd * 0.385, y: 0.235, z: 0.07, rx: -0.2, ry: 0.4 * sd, rz: -0.35 * sd });
  }
  HR.at(hive, mesh(merge(lobes), mComb), 0, 0, 0);
  /* her skin creeping onto the wax: a growth lip along the top and tongues of flesh gripping the comb's
     sides and underside, like fingers; and on the front, a tongue of skin from each shoulder lobe curling
     over the shoulder and down her chest (one mesh) */
  const creep = [{ geo: boxGeo(0.47, 0.045, 0.07), x: 0, y: 0.245, z: -0.03, rz: 0.08 }];
  [[0.16, 0.10, 0.03], [0.05, 0.13, -0.02], [-0.07, 0.08, 0.04], [-0.17, 0.11, -0.03]].forEach((q, i) => {
    for (const sd of [1, -1]) creep.push({ geo: boxGeo(0.026, q[1], 0.06 + 0.05 * ((i + (sd > 0 ? 1 : 0)) % 2)), x: sd * 0.229 + 0.08 * q[0] * 0.25, y: q[0] + sd * q[2] * 0.5, z: -0.03 - 0.02 * ((i + (sd > 0 ? 0 : 1)) % 2), rx: q[2] * 3, rz: 0.08 });
  });
  [[-0.12, 0.09], [0.09, 0.12]].forEach(q => creep.push({ geo: boxGeo(q[1], 0.024, 0.07), x: q[0], y: -0.246 + q[0] * 0.08, z: -0.035, rz: 0.08 }));
  for (const sd of [1, -1]) {
    creep.push({ geo: boxGeo(0.075, 0.032, 0.075), x: sd * 0.235, y: 0.235, z: 0.245, rz: 0.12 * sd });          /* lip over the shoulder edge */
    creep.push({ geo: boxGeo(0.062, 0.12, 0.03), x: sd * 0.215, y: 0.18, z: 0.272, rz: 0.06 * sd });             /* down the chest */
    creep.push({ geo: boxGeo(0.032, 0.075, 0.024), x: sd * 0.2, y: 0.09, z: 0.27, rz: -0.12 * sd });              /* one finger reaching lower */
  }
  HR.at(hive, mesh(merge(creep), mLip, false), 0, 0, 0);
  const drips = [];
  [[-0.13, -0.25, -0.16, 0.0], [0.11, -0.235, -0.2, 1.3], [-0.09, -0.41, -0.15, 2.2],
   [-0.168, 0.235, 0.292, 0.7]].forEach(d => {    /* the last one runs off the right shoulder lobe down her front, beside the neck */
    const j = HR.joint(hive, d[0], d[1], d[2]);
    j.add(mesh(S.dripGeo, mHoney, false));
    drips.push({ j, ph: d[3] });
  });
  /* two bees working the comb itself (folded wings, slow wander, they freeze too) */
  const combBees = [0, 1].map(i => {
    const m = mesh(S.beeGeo, mBee, false); hump.add(m); m.rotation.order = 'XYZ';
    return { m, ph: i * 2.1 + 0.5, h: 0 };
  });

  /* head: face front; side-profile photos on ±x (face toward +z: ear, freckles, a bee in her hair) */
  const head = HR.joint(chest, 0, 1.37 - 0.64, 0);
  HR.at(head, box(HEAD, HEAD, HEAD, { pz: mFace, px: mSide || mHair, nx: mSide || mHair, nz: mHair, py: mHair, ny: mSkin },
    USE_SIDE ? { px: [0, 0, 1, 1], nx: [1, 0, 0, 1] } : null), 0, 0.25, 0);
  /* comb creeping into the back of her scalp */
  const scalpComb = HR.at(head, box(0.22, 0.17, 0.06, { all: mComb, pz: mHair }, { nz: [0.3, 0.4, 0.62, 0.65], px: [0.1, 0.1, 0.2, 0.3], nx: [0.7, 0.2, 0.8, 0.4], py: [0.4, 0.7, 0.7, 0.8], ny: [0.2, 0.2, 0.5, 0.3] }, false), 0.07, 0.11, -0.25);
  scalpComb.rotation.z = 0.18;
  /* antenna sockets, merged, sitting right over the painted pink bumps at the front-top edge */
  const sockX = [fx(BUMP_MX_U), fx(BUMP_PX_U)];
  const sockGeo = new THREE.SphereGeometry(0.042, 12, 8);
  head.add(mesh(merge(sockX.map(x => ({ geo: sockGeo, x, y: 0.5, z: 0.205, sy: 0.62 }))), mSocket, false));
  /* antennae: scape + flagellum spring chains with clubs */
  const scapeGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.18, 7), flagGeo = new THREE.CylinderGeometry(0.01, 0.013, 0.18, 7);
  const ants = sockX.map((x, i) => {
    const side = i ? 1 : -1;
    const base = HR.joint(head, x, 0.525, 0.2); base.rotation.order = 'YXZ';
    const sc = new THREE.Mesh(scapeGeo, mChitin); sc.position.y = 0.09; base.add(sc);
    const flag = HR.joint(base, 0, 0.18, 0);
    const fl = new THREE.Mesh(flagGeo, mChitin); fl.position.y = 0.09; flag.add(fl);
    const club = HR.sphere(0.03, mChitin, 10); club.scale.set(1, 1.6, 1); club.position.y = 0.19; club.castShadow = false; flag.add(club);
    return { side, base, flag, bp: { a: 0.35, v: 0 }, br: { a: 0, v: 0 }, fp: { a: 0.5, v: 0 }, fr: { a: 0, v: 0 } };
  });
  /* pigtails: rooted high behind the ears, splayed out, dangling below the jaw, a yellow band at each root */
  /* hair crops sized to the faces (0.1 x 0.32 → 0.31 x 1 of the photo) so the strands keep their scale, not woodgrain */
  const TC = (u) => [u, 0, u + 0.31, 1];
  const tailGeo = merge([{ geo: boxGeo(0.1, 0.32, 0.1, { px: TC(0.05), nx: TC(0.36), pz: TC(0.62), nz: TC(0.2), py: [0.4, 0.4, 0.5, 0.5], ny: [0.1, 0.1, 0.2, 0.2] }), mi: 0, y: -0.18 },
    { geo: boxGeo(0.118, 0.04, 0.118), mi: 1, y: -0.05 }]);
  const tails = [-1, 1].map(side => {
    const j = HR.joint(head, side * 0.27, 0.33, -0.185);
    j.add(mesh(tailGeo, [mHair, mBand]));
    return { j, side, z: { a: side * 0.25, v: 0 }, x: { a: 0, v: 0 } };
  });
  /* blink plates: upper-lid skin cropped from just above each eye, pivot at the lash line */
  const lids = [EYE_MX, EYE_PX].map(e => {
    const j = HR.joint(head, fx(e.u), fy(LID_TOP_V), 0.25 + 0.004);
    const crop = [e.u - LID_W_U / 2, LID_CROP_V[0], e.u + LID_W_U / 2, LID_CROP_V[1]];
    const m = HR.at(j, box(LID_W_U * HEAD, LID_H_V * HEAD, 0.004, { pz: mLid, all: mSkin }, { pz: crop }, false), 0, -LID_H_V * HEAD / 2, 0);
    j.scale.y = 0.001; j.visible = false;
    return { j, m, x: fx(e.u), y: fy(e.v) };
  });

  /* arms */
  const arms = [1, -1].map(side => {
    const j = HR.joint(chest, side * 0.34, 1.32 - 0.64, 0);
    j.add(mesh(merge([{ geo: boxGeo(0.18, 0.5, 0.18, CLOTHES ? SLEEVE_UV : undefined), mi: 0, y: -0.25 }, { geo: boxGeo(0.17, 0.14, 0.17, CLOTHES ? { px: [0.1, 0.2, 0.27, 0.34], nx: [0.4, 0.5, 0.57, 0.64], pz: [0.6, 0.1, 0.77, 0.24], nz: [0.2, 0.7, 0.37, 0.84], py: [0.7, 0.6, 0.87, 0.77], ny: [0.3, 0.3, 0.47, 0.47] } : undefined), mi: 1, y: -0.57 }]), [mYellow, mHand]));
    return j;
  });
  /* legs + shoes */
  const legs = [1, -1].map(side => {
    const j = HR.joint(rig, side * 0.13, 0.66, 0);
    j.add(mesh(merge([{ geo: boxGeo(0.21, 0.56, 0.21, CLOTHES ? limbUV(side > 0) : undefined), mi: 0, y: -0.28 }, { geo: boxGeo(0.22, 0.1, 0.26), mi: 1, y: -0.61, z: 0.02 }]), [mLegs, mShoe]));
    return j;
  });

  /* bees: 4 orbiters + the face-crawler, all in root space so they never inherit her flinch or fall */
  const swarm = HR.joint(root, 0, 0, 0);
  function makeBee(parent) {
    const g = new THREE.Group(); parent.add(g);
    const body = new THREE.Mesh(S.beeGeo, mBee); body.castShadow = false; g.add(body);
    const wing = new THREE.Mesh(S.wingGeo, mWing); wing.position.set(0, 0.02, 0.006); wing.renderOrder = 2; g.add(wing);
    g.rotation.order = 'YXZ';
    return { g, body, wing, yaw: 0, pitch: 0, roll: 0 };
  }
  const orbit = [0, 1, 2, 3].map(i => {
    const b = makeBee(swarm); b.g.scale.setScalar(BEE_ORBIT_S);
    /* r0 - 0.09 wobble - 0.077 half-length stays clear of the head's corners (0.354) */
    b.ph = i * 1.57 + 0.4; b.w = (2.0 + 0.32 * i) * (i === 2 ? -1 : 1); b.r0 = 0.58 + 0.04 * (i % 2); b.yph = i * 1.9; b.oc = 0;
    return b;
  });
  const crawlG = new THREE.Group(); swarm.add(crawlG); crawlG.scale.setScalar(BEE_CRAWL_S);
  const crawler = makeBee(crawlG);
  crawler.body.scale.set(1, 0.8, 1); crawler.wing.position.set(0, 0.017, 0.006); crawler.wing.visible = false;
  const bees = orbit.concat([crawler]);
  /* death-ball clumps (hidden while she lives): pour out of the hive into the ball, then scatter */
  const clumps = [S.clumpA, S.clumpB].map((g, i) => {
    const m = new THREE.Mesh(g, [mBee, mWing]); m.castShadow = false; m.visible = false; swarm.add(m);
    return { m, tilt: i ? 1.9 : 0.35, w: i ? -7.3 : 9.1, dir: new THREE.Vector3(i ? 0.6 : -0.7, 0.55, i ? -0.45 : 0.3).normalize() };
  });

  /* ---------- state (all preallocated; update() allocates nothing) ---------- */
  const st = {
    walkPh: 0, hop: 0, hopV: 0, hopA: 0, hurtPrev: 0, freeze: 0, headYaw: 0, headYawV: 0, headYawPrev: 0, hyAcc: 0, combPh: 0,
    crawlI: 1, crawlS: 0, crawlPause: 0, plantT: -1, plantPrev: false, landW: 0, twitchT: 0.7, twitchI: 0, deadPrev: 0, healT: 0,
    rowK: 0, rowArm: false, rowC: new THREE.Vector3(), rowD: new THREE.Vector3(0, 0, 1), rowL: new THREE.Vector3(1, 0, 0),
    lat: new Float32Array(5), ord: new Int8Array(5), slot: new Int8Array([0, 1, 2, 3, 4]),
    rng: 1234567 + 97 * (Math.random() * 1000 | 0),
  };
  const rnd = () => { st.rng = (st.rng * 16807) % 2147483647; return st.rng / 2147483647; };
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vN = new THREE.Vector3(), vF = new THREE.Vector3(), vR = new THREE.Vector3();
  const vP = new THREE.Vector3(), vT = new THREE.Vector3(), vQ = new THREE.Vector3(), vH = new THREE.Vector3(), vBall = new THREE.Vector3(), vZ = new THREE.Vector3(0, 0, 1);
  const mBasis = new THREE.Matrix4(), mHead = new THREE.Matrix4(), mHive = new THREE.Matrix4(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qHead = new THREE.Quaternion();
  const eul = new THREE.Euler(0, 0, 0, 'YXZ');

  function orbitPos(b, tt, wide, out) {
    const a = b.ph + b.w * tt;
    const r = b.r0 + wide + 0.09 * Math.sin(0.7 * tt + b.ph * 2);
    out.set(Math.sin(a) * r, 1.5 + 0.2 * Math.sin(1.37 * Math.abs(b.w) * tt + b.yph), -0.04 + Math.cos(a) * r);
    return out;
  }
  function aimBee(b, dx, dy, dz, k) {
    const yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    const dyaw = wrapA(yaw - b.yaw);
    b.roll += (HR.clamp(-dyaw * 4, -0.6, 0.6) - b.roll) * k;
    b.yaw = wrapA(lerpA(b.yaw, yaw, k)); b.pitch += (pitch - b.pitch) * k;
    b.g.rotation.set(b.pitch, b.yaw, b.roll);
  }
  /* move P toward Q around the head (cylindrical about C), so a bee darting from behind her goes round, not through */
  function arcLerp(P, Q, C, k) {
    const px = P.x - C.x, pz = P.z - C.z, qx = Q.x - C.x, qz = Q.z - C.z;
    const ap = Math.atan2(px, pz), aq = Math.atan2(qx, qz), rp = Math.hypot(px, pz), rq = Math.hypot(qx, qz);
    const a = ap + wrapA(aq - ap) * k, r = rp + (rq - rp) * Math.min(1, k * 1.8);   /* radius first: off the face, then round */
    P.set(C.x + Math.sin(a) * r, P.y + (Q.y - P.y) * k, C.z + Math.cos(a) * r);
  }

  function update(dt, t, s) {
    if (!(dt > 1e-5)) return;                     /* paused frame: hold the pose */
    dt = Math.min(dt, 0.1);
    if ((st.healT += dt) > 0.5) { st.healT = 0; healMats(pairs); }
    const dead = s.dead || 0, alive = dead <= 0;
    const spd = HR.clamp(s.speed || 0, 0, 1);
    const happy = s.mood === 'happy';
    /* --- hurt edge → freeze the swarm (and snap it into a row in front of her face) --- */
    if ((s.hurt || 0) > st.hurtPrev + 0.05 && alive) { st.freeze = FREEZE; st.rowArm = true; }
    st.hurtPrev = s.hurt || 0;
    st.freeze = Math.max(0, st.freeze - dt);
    const frozen = st.freeze > 0;
    const flinch = smooth(0, 1, s.hurt || 0);

    /* --- body: breathing, skip-walk, flinch, punch --- */
    const breath = Math.sin(t * 6.283 * 0.3);
    torso.scale.set(1, 1 + 0.012 * breath, 1 + 0.02 * breath);
    st.walkPh += dt * 6.283 * (1.45 * spd + 0.0001);
    const sw = Math.sin(st.walkPh);
    const hop = spd * (0.06 * Math.pow(Math.max(0, Math.sin(st.walkPh)), 1.5) + 0.012 * Math.abs(Math.cos(st.walkPh)));
    { const hv = (hop - st.hop) / Math.max(dt, 1e-3); st.hopA = HR.clamp((hv - st.hopV) / Math.max(dt, 1e-3), -30, 30); st.hopV = hv; st.hop = hop; }
    legs[0].rotation.x = 0.55 * sw * spd; legs[1].rotation.x = -0.55 * sw * spd;
    const atk = s.attack || 0;
    arms[0].rotation.x = -0.5 * sw * spd + 0.04 * breath;
    arms[1].rotation.x = 0.5 * sw * spd + 0.04 * breath - 1.5 * atk;
    arms[0].rotation.z = 0.06 + 0.1 * flinch; arms[1].rotation.z = -0.06 - 0.1 * flinch - 0.15 * atk;
    chest.rotation.x = -0.12 * flinch + 0.04 * spd + 0.12 * atk;
    chest.rotation.y = 0.25 * atk;
    rig.position.set(0, hop, 0); rig.rotation.set(0, 0, 0);

    /* --- head: tracks you, but only part-way (the antennae get there first) --- */
    const tgtYaw = HR.clamp((s.yaw || 0) * 0.6, -0.65, 0.65);
    const prevYaw = st.headYaw;
    st.headYaw += (tgtYaw - st.headYaw) * Math.min(1, dt * 3.5);
    const hv = (st.headYaw - prevYaw) / Math.max(dt, 1e-3);
    st.hyAcc = HR.clamp((hv - st.headYawV) / Math.max(dt, 1e-3), -40, 40); st.headYawV = hv;
    head.rotation.set(HR.clamp((s.pitch || 0) * 0.7, -0.4, 0.4) - 0.08 * flinch, st.headYaw, 0.1 * flinch);

    /* --- death pose: knees go, she folds forward face-down, face turned toward you, still smiling --- */
    if (!alive) {
      const kneel = smooth(0, 0.3, dead), fall = Math.pow(smooth(0.22, 0.6, dead), 1.6);
      const bounce = dead > 0.6 ? Math.sin(HR.clamp((dead - 0.6) / 0.14, 0, 1) * Math.PI) * 0.09 * (1 - smooth(0.6, 0.8, dead)) : 0;
      rig.rotation.x = 1.5 * fall - bounce;
      rig.position.y = -0.22 * kneel * (1 - fall) + 0.24 * fall;
      legs[0].rotation.x = legs[1].rotation.x = 0.6 * kneel * (1 - fall);
      chest.rotation.x = 0.35 * kneel * (1 - fall);
      arms[0].rotation.x = arms[1].rotation.x = -0.6 * kneel * (1 - fall) + 0.25 * fall;
      head.rotation.set(0, (s.yaw || 0) >= 0 ? 1.35 * fall : -1.35 * fall, 0);
    }

    /* --- planting a flower (s.plant): kneels, pats the ground twice; one bee peels off and lands on it --- */
    if (s.plant && !st.plantPrev && alive) st.plantT = 0;
    st.plantPrev = !!s.plant;
    if (st.plantT >= 0) {
      st.plantT += dt;
      const pt = st.plantT, kn = smooth(0, 0.35, pt) * (1 - smooth(1.6, 2.0, pt));
      const pat = pt > 0.5 && pt < 1.5 ? Math.max(0, Math.sin((pt - 0.5) * Math.PI * 2)) : 0;   /* two pats */
      rig.position.y += -0.2 * kn;
      legs[0].rotation.x += -0.9 * kn; legs[1].rotation.x += 0.5 * kn;
      chest.rotation.x += 0.55 * kn;
      arms[1].rotation.x += -0.9 * kn - 0.35 * pat;
      head.rotation.x += 0.25 * kn;
      if (pt > 9) st.plantT = -1;
      if (!alive) st.plantT = -1;
    }
    st.landW += ((st.plantT > 0.6 && st.plantT < 8 ? 1 : 0) - st.landW) * Math.min(1, dt * 2.5);

    /* --- the hive breathes (faster when she's happy) and drips --- */
    st.combPh += dt * 6.283 * (happy ? 1.2 : 0.4);
    const cb = 1 + (happy ? 0.045 : 0.03) * (0.5 + 0.5 * Math.sin(st.combPh));
    hive.scale.set(cb, cb, cb * 1.02);
    for (let i = 0; i < drips.length; i++) {
      const d = drips[i], cyc = (t + d.ph) % 3.5;
      let sy;
      if (cyc < 3.0) sy = 1 + 1.5 * smooth(0, 3.0, cyc);
      else sy = 0.55 + 0.45 * smooth(3.0, 3.25, cyc);           /* drop let go: snaps back short */
      d.j.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
      d.j.rotation.x = -hive.parent.rotation.x - rig.rotation.x;  /* honey hangs world-down */
    }

    /* --- comb bees wander the wax (stop dead when she's hit) --- */
    for (let i = 0; i < 2; i++) {
      const cbz = combBees[i];
      if (!frozen) cbz.ph += dt;
      const w1 = 0.21 + 0.05 * i, w2 = 0.16 + 0.04 * i, tt = cbz.ph * 1.0;
      const x = 0.14 * Math.sin(w1 * tt * 1.3 + i * 2), y = 0.17 * Math.sin(w2 * tt * 1.7 + i);
      const vx = 0.14 * w1 * 1.3 * Math.cos(w1 * tt * 1.3 + i * 2), vy = 0.17 * w2 * 1.7 * Math.cos(w2 * tt * 1.7 + i);
      cbz.h = wrapA(lerpA(cbz.h, Math.atan2(vx, vy) + 0.25 * HR.noise(t * 2, 20 + i), Math.min(1, dt * 6)));
      cbz.m.position.set(x, y, -0.124);
      cbz.m.rotation.set(-Math.PI / 2, cbz.h, 0);
    }

    /* --- antennae: spring chains (k60 c6), twitch every 0.5–2 s, turn toward whoever is speaking --- */
    st.twitchT -= dt;
    if (st.twitchT <= 0) { st.twitchT = 0.5 + 1.5 * rnd(); st.twitchI = rnd() < 0.5 ? 0 : 1; const a = ants[st.twitchI]; a.bp.v += (rnd() - 0.5) * 9; a.br.v += (rnd() - 0.5) * 7; a.fp.v += (rnd() - 0.5) * 12; }
    const spk = typeof s.speakerDir === 'number' ? s.speakerDir : (s.yaw || 0);
    const antYaw = HR.clamp(spk - st.headYaw, -0.8, 0.8);
    const hurtBack = frozen ? 1 : 0;
    for (let i = 0; i < 2; i++) {
      const a = ants[i];
      const pitchT = hurtBack ? -1.0 : 0.3 + 0.06 * HR.noise(t * 0.7, i + 3) - 0.25 * HR.clamp((s.pitch || 0), -0.5, 0.5);
      const rollT = hurtBack ? -a.side * 0.15 : -a.side * 0.18 + 0.05 * HR.noise(t * 0.5, i + 7);
      const drv = -st.hyAcc * 0.04;
      spring(a.bp, dt, pitchT, st.hopA * 0.08, 60, 6, -1.3, 1.2);
      spring(a.br, dt, rollT, drv * a.side * 0.5, 60, 6, -0.9, 0.9);
      spring(a.fp, dt, hurtBack ? 0.05 : 0.5, -a.bp.v * 2, 60, 6, -0.6, 1.3);
      spring(a.fr, dt, 0, drv - a.br.v * 1.5, 60, 6, -0.8, 0.8);
      a.base.rotation.set(a.bp.a, antYaw + a.side * 0.05, a.br.a);
      a.flag.rotation.set(a.fp.a, 0, a.fr.a);
    }
    /* --- pigtails: pendulums (k25 c4), splayed out, bounce on the skip --- */
    for (let i = 0; i < 2; i++) {
      const p = tails[i];
      spring(p.z, dt, p.side * 0.25, -st.hyAcc * 0.25 * p.side - st.hopA * 0.35 * p.side, 25, 4, -1.0, 1.0);
      spring(p.x, dt, 0.05 - head.rotation.x, -spd * 4 * Math.cos(st.walkPh) - st.hyAcc * 0.05, 25, 4, -0.9, 0.9);
      p.j.rotation.set(p.x.a, 0, p.z.a);
    }

    /* --- face-crawler walks its loop over the head (stops still while she's hit) --- */
    const crawlOn = alive && !frozen;
    if (crawlOn) {
      if (st.crawlPause > 0) st.crawlPause -= dt;
      else {
        const seg = PATH[st.crawlI];
        const gait = 0.55 + 0.75 * Math.max(0, HR.noise(t * 1.7, 11));  /* stop-start bee walk */
        st.crawlS += CRAWL_SPEED * seg[6] * dt * (seg[8] ? gait : 1);
        if (st.crawlS >= SEG[st.crawlI]) {
          st.crawlS = 0; st.crawlI = (st.crawlI + 1) % PATH.length;
          st.crawlPause = PATH[st.crawlI][7];
        }
      }
    }
    const A = PATH[st.crawlI], B = PATH[(st.crawlI + 1) % PATH.length], f = HR.clamp(st.crawlS / SEG[st.crawlI], 0, 1);
    vA.set(A[0], A[1], A[2]); vB.set(B[0], B[1], B[2]);
    vF.subVectors(vB, vA);
    vP.copy(vA).lerp(vB, f);
    vN.set(A[3] + (B[3] - A[3]) * f, A[4] + (B[4] - A[4]) * f, A[5] + (B[5] - A[5]) * f).normalize();
    vP.addScaledVector(vN, 0.024);                     /* its belly sits on the skin at 1.5x */
    vF.addScaledVector(vN, -vF.dot(vN)).normalize();
    if (st.crawlPause > 0) {           /* grooming on the eye: little pivots about the surface normal */
      const w = 0.35 * HR.noise(t * 2.5, 5);
      vR.crossVectors(vN, vF); vF.multiplyScalar(Math.cos(w)).addScaledVector(vR, Math.sin(w));
    }
    vR.crossVectors(vN, vF);
    mBasis.makeBasis(vR, vN, vF); qA.setFromRotationMatrix(mBasis);
    const hx = vP.x, hy = vP.y, onFront = vP.z > 0.2 && A[5] > 0.99 && B[5] > 0.99;
    rig.updateMatrix(); chest.updateMatrix(); head.updateMatrix(); hive.updateMatrix();
    mHead.multiplyMatrices(rig.matrix, chest.matrix).multiply(head.matrix);
    qHead.copy(rig.quaternion).multiply(chest.quaternion).multiply(head.quaternion);
    vP.applyMatrix4(mHead); qA.premultiply(qHead);
    const visible = !!A[8];

    /* --- blinks: both together, except an eye with a bee on it, which stays wide open --- */
    const bl = alive ? HR.blink(t, s.seed || 1, 4.2) : 0;
    for (let i = 0; i < 2; i++) {
      const L = lids[i];
      const covered = visible && onFront && st.rowK < 0.05 && Math.hypot(hx - L.x, hy - L.y) < 0.075;   /* crawler on that eye: no blink */
      const k = covered ? 0 : bl;
      L.j.visible = k > 0.02; L.j.scale.y = Math.max(0.001, k);
    }

    /* --- swarm: orbit / freeze into a row and stare / death ball --- */
    const wide = happy ? 0.15 : 0;
    const D = Math.max(1.5, s.near || 3);
    const ax = Math.sin(s.yaw || 0) * D, az = Math.cos(s.yaw || 0) * D;
    const ay = 1.55 + Math.tan(HR.clamp(-(s.pitch || 0), -0.6, 0.6)) * D;
    vH.set(0, 0.28, 0).applyMatrix4(mHead);              /* her eye line, root space */
    if (st.rowArm) {                                      /* hit: lock the row's anchor so the bees hold dead still while she flinches */
      st.rowArm = false;
      st.rowC.copy(vH);
      st.rowD.set(ax - vH.x, (ay - vH.y) * 0.35, az - vH.z).normalize();
      st.rowL.set(st.rowD.z, 0, -st.rowD.x).normalize();
      /* slots in the order the bees are already in, across the attacker's view, so no paths cross */
      for (let i = 0; i < 5; i++) { const p = i < 4 ? bees[i].g.position : crawlG.position; st.lat[i] = (p.x - vH.x) * st.rowL.x + (p.z - vH.z) * st.rowL.z; st.ord[i] = i; }
      for (let i = 1; i < 5; i++) { const k = st.ord[i]; let j = i - 1; while (j >= 0 && st.lat[st.ord[j]] > st.lat[k]) { st.ord[j + 1] = st.ord[j]; j--; } st.ord[j + 1] = k; }
      for (let i = 0; i < 5; i++) st.slot[st.ord[i]] = i;
    }
    const rowOn = frozen && alive;
    st.rowK += ((rowOn ? 1 : 0) - st.rowK) * (1 - Math.exp(-dt * (rowOn ? 24 : 4.5)));   /* dart in (~0.1 s), drift back out */
    if (st.rowK < 1e-4) st.rowK = 0;
    const rowK = st.rowK;
    vBall.copy(vH); vBall.y += 0.48;                      /* the death ball hangs just over her (fallen) head */
    const ballIn = smooth(0, 0.12, dead), ballOut = smooth(0.8, 1.0, dead);
    for (let i = 0; i < 5; i++) {
      const b = bees[i], isCrawler = i === 4;
      /* normal position */
      if (!isCrawler) {
        if (!frozen) b.oc += dt;
        orbitPos(b, b.oc, wide, vT);
        if (i === 3 && st.landW > 0.001) { vA.set(0.02, 0.1, 0.62); vT.lerp(vA, st.landW); }   /* on the flower */
      } else vT.copy(vP);
      /* the stare row: 5 slots across the attacker's line of sight, 0.42 in front of her face */
      if (rowK > 0) {
        const sl = st.slot[i], k = sl - 2;
        vQ.copy(st.rowC).addScaledVector(st.rowD, 0.25 + ROW_GAP - 0.03 * Math.abs(k)).addScaledVector(st.rowL, k * ROW_SP);
        vQ.y += ROW_Y[sl] + (rowOn ? 0.004 * HR.noise(t * 30, i) : 0);   /* hovering in place */
        arcLerp(vT, vQ, st.rowC, rowK);
      }
      if (!alive) {
        /* tight swirling ball over her head, then disperse */
        const a = t * 9 + i * 1.2566, r = BALL_R + 0.04 * Math.sin(t * 5 + i * 2) + 3.2 * ballOut * ballOut;
        const tilt = i * 0.7;
        vA.set(Math.cos(a) * r, Math.sin(a) * r * Math.sin(tilt) + 0.6 * ballOut, Math.sin(a) * r * Math.cos(tilt)).add(vBall);
        vT.lerp(vA, ballIn);
      }
      /* place + orient */
      if (isCrawler) {
        crawlG.position.copy(vT);
        if (!alive && ballIn > 0) {
          crawlG.visible = dead < 0.985;
          vF.set(-Math.sin(t * 9 + 4 * 1.2566), 0, Math.cos(t * 9 + 4 * 1.2566));
          qB.setFromUnitVectors(vZ, vF.normalize()); crawlG.quaternion.slerp(qB, 0.3);
        } else {
          crawlG.quaternion.copy(qA);
          if (rowK > 0) {                                 /* lifts off her eye and turns to look at you with the rest */
            eul.set(-Math.atan2(ay - vT.y, Math.hypot(ax - vT.x, az - vT.z)), Math.atan2(ax - vT.x, az - vT.z), 0, 'YXZ');
            qB.setFromEuler(eul); crawlG.quaternion.slerp(qB, Math.min(1, rowK * 1.3));
          }
          crawlG.visible = visible || rowK > 0.05;
        }
        crawlG.scale.setScalar(BEE_CRAWL_S + (BEE_ORBIT_S - BEE_CRAWL_S) * Math.max(rowK, ballIn));
        crawler.wing.visible = (!alive && ballIn > 0.2) || rowK > 0.25;   /* folded wings are in the photo; buzz only in the air */
        crawler.wing.scale.z = 0.4 + 0.6 * Math.abs(Math.sin(t * 173));
        continue;
      }
      const px = b.g.position.x, py = b.g.position.y, pz = b.g.position.z;
      b.g.position.copy(vT);
      b.g.visible = dead < 0.985;
      if (rowOn) aimBee(b, ax - vT.x, ay - vT.y, az - vT.z, 0.55);   /* all turn to look at you */
      else {
        const dx = vT.x - px, dy = vT.y - py, dz = vT.z - pz;
        if (dx * dx + dy * dy + dz * dz > 1e-8) aimBee(b, dx, dy, dz, 0.35);
      }
      b.wing.scale.z = 0.35 + 0.65 * Math.abs(Math.sin(t * 173 + i));      /* ~28 Hz shimmer (non-aliasing at 60 fps) */
      b.wing.rotation.z = 0.25 * Math.sin(t * 173 + i);
    }
    /* clumps pour out of the hive into the ball, spin with it, then scatter */
    if (alive || dead >= 0.985) { clumps[0].m.visible = clumps[1].m.visible = false; }
    else {
      mHive.multiplyMatrices(rig.matrix, chest.matrix).multiply(hive.matrix);
      vB.set(0, 0.05, -0.22).applyMatrix4(mHive);
      const kin = smooth(0, 0.18, dead);
      for (let c = 0; c < 2; c++) {
        const cl = clumps[c], m = cl.m;
        m.visible = true;
        m.position.copy(vB).lerp(vBall, kin).addScaledVector(cl.dir, 2.6 * ballOut * ballOut);
        m.scale.setScalar(Math.max(0.001, (0.3 + 0.7 * kin) * (1 - 0.85 * ballOut)));
        m.rotation.set(cl.tilt, (t * cl.w) % 6.283185307, 0.35 * Math.sin(t * 1.3 + c * 2));
      }
    }
  }

  return { root, update, mats, handles: { head, aL: arms[0], aR: arms[1], lL: legs[0], lR: legs[1] }, deathDur: 3 };
};
})();

