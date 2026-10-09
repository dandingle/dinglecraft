/* BLANK / HOLLOW / POSSESSED HOLLOW (pgwhat, pghollow, pgposs): Puppet Purgatory, Hyperreal (bible 9.2, 17 #5).
   A blank felt puppet head whose face was torn off: glue scars where the eyes, nose and mouth used to be (pgface_blank).
   The physical lie: it is worn. Under the sack is a dark hand hole and, in the tethered variant, a real hairy human forearm
   with a cheap watch runs from the hole down to a black sleeve cuff at its Arm Hole. When it strains, the performer's
   knuckles push up through the felt of its scalp. A Possessed Hollow has a Hand inside it: a lump crawls under the felt.
   Variants (HR.MODELS.pg_blank(v)): 'tether' (default), 'hollow' (an empty one on its side), 'possessed'.
   s fields (P3 writes e.hrS; all optional): strain 0..1 (out of reach: arm rigid, jaw flapping), lunge 0..1 (the bite lunge),
   flap 0..1 (mouth), limp 0..1 (collapse), possessed 0..1, col 0-3 (felt colour; default from the seed), googly 0/1 (30% by
   seed), hole: [x,y,z] world (tC_purg converts to s.hlx/hly/hlz; no hole = no arm drawn: P3's OG arm shows instead), withdraw
   0..1 (the arm slurping down its hole; also driven by s.dead). Generic s: speed, attack, hurt, dead, yaw, pitch, cd. */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
const COLS = [0x3f8f3a, 0xd8742a, 0x3a64b0, 0x74408e];          /* green, orange, blue, purple felt (bible 15.1 family) */
const CSS = ['#3f8f3a', '#d8742a', '#3a64b0', '#74408e'];
function scarFace(css) {
  return function (g, n, R) {
    PG.paintFelt(g, n, R, css, true);
    /* glue scars: crusted yellow-grey ovals where the features were torn off, with felt fibres pulled up round them */
    const scar = (x, y, w, h) => {
      g.fillStyle = 'rgba(214,196,140,.85)'; g.beginPath(); g.ellipse(x, y, w, h, R() * 0.4 - 0.2, 0, 7); g.fill();
      g.fillStyle = 'rgba(120,96,60,.5)'; for (let i = 0; i < 26; i++) { const a = R() * 7, r = 0.6 + R() * 0.45; g.fillRect(x + Math.cos(a) * w * r, y + Math.sin(a) * h * r, 2, 2); }
      g.strokeStyle = 'rgba(40,30,20,.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, w * 1.08, h * 1.08, 0, 0, 7); g.stroke();
    };
    scar(n * 0.3, n * 0.36, n * 0.11, n * 0.08); scar(n * 0.71, n * 0.34, n * 0.1, n * 0.085);
    scar(n * 0.5, n * 0.56, n * 0.07, n * 0.06); scar(n * 0.5, n * 0.8, n * 0.26, n * 0.05);
    g.strokeStyle = 'rgba(255,255,230,.5)'; g.lineWidth = 1.5;                 /* hot-glue strings */
    for (let i = 0; i < 5; i++) { g.beginPath(); const x = n * (0.2 + R() * 0.6), y = n * (0.3 + R() * 0.5); g.moveTo(x, y); g.quadraticCurveTo(x + (R() - 0.5) * 30, y + 14, x + (R() - 0.5) * 18, y + 26 + R() * 20); g.stroke(); }
  };
}

HR.MODELS.pg_blank = function (variant) {
  const V = variant === 'hollow' || variant === 'possessed' ? variant : 'tether';
  const root = new THREE.Group(); root.name = 'hr_pg_blank';
  const C = PG.ctx(V.length * 31 + 7);
  /* the colour is picked from the seed on the first update (s.col overrides); every colour's material exists per instance */
  const felt = COLS.map(c => PG.mat(C, [['pgmat_felt', c], ['mat_jersey', c], [null, c]], 0.95, { roughMap: true, repeat: [1, 1] }));
  const FT = [0xd8f0c8, 0xffe0c0, 0xd0dcff, 0xe8d0f4];          /* the photo is pink felt: a light tint toward each felt colour */
  const faces = COLS.map((c, i) => { const m = PG.face(C, 'pgface_blank', 'blank' + i, scarFace(CSS[i]), 0.85); if (PG.has('pgface_blank')) m.color.setHex(FT[i]); return m; });
  const mouthM = PG.flat(C, 0x4a1418, 0.7), cav = PG.dark(0x120606);
  const googM = PG.flat(C, 0xf4f1e8, 0.15), pupM = PG.dark(0x050505);

  /* ---- rig: base (hole) -> body sack -> neck -> head + jaw ---- */
  const fall = HR.joint(root, 0, 0, 0);                         /* collapse / lying pivot */
  const base = HR.joint(fall, 0, 0, 0);
  PG.hole(base, 0.15, 0.002);
  const bodyG = HR.joint(base, 0, 0, 0);
  const sack = PG.mesh(PG.cylGeo(0.25, 0.19, 0.52, 9), felt[0]); sack.position.y = 0.26; bodyG.add(sack);
  const rim = PG.mesh(PG.cylGeo(0.195, 0.2, 0.05, 9, true), cav, false); rim.position.y = 0.02; bodyG.add(rim);
  /* the lump (the Hand inside a Possessed Hollow) rides on the sack surface */
  const lump = PG.mesh(PG.sphereGeo(0.13, 10), felt[0]); lump.scale.set(1, 0.8, 0.55); bodyG.add(lump); lump.visible = false;
  const neck = HR.joint(bodyG, 0, 0.5, -0.02); neck.rotation.order = 'YXZ';
  const HW = 0.58, HH = 0.4, HD = 0.5, JH = 0.16;
  const headM = PG.box(HW, HH, HD, { all: felt[0], pz: faces[0] }, PG.withFront(PG.tile(HW, HH, HD, 0.2, 0.3), [0, 0.25, 1, 1]));
  headM.position.set(0, JH + HH / 2, 0); neck.add(headM);
  /* knuckles of the hand inside, pressing up through the scalp when it strains */
  const knk = [];
  for (let i = 0; i < 4; i++) { const k = PG.mesh(PG.sphereGeo(0.06, 8), felt[0], false); k.position.set(-0.15 + i * 0.1, JH + HH - 0.03, -0.06 + (i === 0 || i === 3 ? 0.03 : 0)); k.scale.set(1, 0.4, 1.2); neck.add(k); knk.push(k); }
  const jaw = HR.joint(neck, 0, JH, -HD / 2);                    /* hinged at the back */
  const jawM = PG.box(HW * 0.96, JH, HD, { all: felt[0], pz: faces[0], py: mouthM }, PG.withFront(PG.tile(HW, JH, HD, 0.6, 0.1), [0.02, 0, 0.98, 0.25]));
  jawM.position.set(0, -JH / 2, HD / 2); jaw.add(jawM);
  const throat = PG.box(HW * 0.86, 0.06, HD * 0.86, cav, undefined, false); throat.position.set(0, JH - 0.03, 0); neck.add(throat);
  /* googly eyes (30%): glued on crooked, pupils rattle loose */
  const goog = [];
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1, g = HR.joint(neck, side * 0.14, JH + HH * 0.68 + (i ? 0.03 : -0.02), HD / 2 + 0.012);
    g.rotation.z = side * 0.25 + (i ? 0.3 : -0.1);
    const disc = PG.mesh(PG.cylGeo(0.075, 0.075, 0.02, 14), googM, false); disc.rotation.x = Math.PI / 2; g.add(disc);
    const pp = HR.joint(g, 0, 0, 0.012);
    const pup = PG.mesh(PG.cylGeo(0.034, 0.034, 0.012, 10), pupM, false); pup.rotation.x = Math.PI / 2; pp.add(pup);
    goog.push({ g, pp, pup, sx: PG.spring(), sy: PG.spring() });
  }
  /* arms with mitts and rods */
  const arms = [];
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1, sh = HR.joint(bodyG, side * 0.24, 0.44, 0.02);
    const up = PG.box(0.07, 0.3, 0.07, felt[0]); up.position.y = -0.15; sh.add(up);
    const wr = HR.joint(sh, 0, -0.3, 0); const mt = PG.mitt(C, wr, side, felt[0], 0.9);
    arms.push({ sh, wr, mt, up, side, sw: PG.spring() });
  }
  /* the performer's arm (tethered only) */
  const arm = V === 'tether' ? PG.arm(C, root, { l1: 3.3, l2: 3.1, w: 0.24 }) : null;
  if (arm) arm.root.visible = true;

  const parts = [sack, lump].concat(knk, arms.map(a => a.up));       /* single-material parts (head and jaw are mapped below) */
  function setFelt(i) { const f = felt[i], fc = faces[i];
    for (const m of parts) m.material = f;
    headM.material = Array.isArray(headM.material) ? headM.material.map(x => (felt.indexOf(x) >= 0 ? f : (faces.indexOf(x) >= 0 ? fc : x))) : f;
    jawM.material = Array.isArray(jawM.material) ? jawM.material.map(x => (felt.indexOf(x) >= 0 ? f : (faces.indexOf(x) >= 0 ? fc : x))) : f;
    for (const a of arms) { a.mt.wr.children.forEach(o => { if (o.isMesh) o.material = f; }); a.mt.th.children.forEach(o => { if (o.isMesh) o.material = f; }); } }
  /* every colour's felt flashes (only the picked one is visible): e.mats is taken once, at build time */
  const mats = felt.concat(faces, [mouthM, googM]);

  const st = { init: false, col: -1, goog: false, bob: 0, flapPh: 0, lungeT: 0, prevAtk: 0, lumpPh: 0, lid: 0, wd: 0, hY: 0, hP: 0,
    vy: 0, py: 0, rodK: 0, jawP: PG.spring(), lean: PG.spring() };
  /* s.col: an index 0-3, or P3's felt colour as 0xRRGGBB (the nearest of the four) */
  function colIndex(c) { if (c <= 3) return (c | 0) & 3; let best = 0, bd = 1e9;
    for (let i = 0; i < 4; i++) { const k = COLS[i], d = Math.abs((k >> 16) - (c >> 16 & 255)) + Math.abs((k >> 8 & 255) - (c >> 8 & 255)) + Math.abs((k & 255) - (c & 255)); if (d < bd) { bd = d; best = i; } }
    return best; }
  function pickCol(s) {
    const want = s.col !== undefined ? colIndex(s.col) : Math.floor(C.R() * 4);
    if (want === st.col) return; st.col = want; setFelt(want);
  }
  pickCol({});

  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1);
    PG.tickHeal(C, dt);
    if (!st.init) { st.init = true; st.goog = s.googly !== undefined ? !!s.googly : ((s.seed || 1) * 7919 % 100) < 30; st.flapPh = (s.seed || 1) * 1.3; }
    if (s.col !== undefined && s.col !== st.colRaw) { st.colRaw = s.col; pickCol(s); }
    for (const g of goog) g.g.visible = st.goog;
    const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0;
    const strain = alive ? clamp(s.strain || 0, 0, 1) : 0, poss = V === 'possessed' || (s.possessed || 0) > 0.5;
    const limp = Math.max(V === 'hollow' ? 1 : 0, clamp(s.limp || 0, 0, 1), smooth(dead / 0.45));
    const speed = alive ? clamp(s.speed || 0, 0, 1.3) : 0;
    /* attack: the bite lunge (P3 may drive it through s.lunge) */
    if (alive && (s.attack || 0) > 0.05 && st.prevAtk <= 0.05) st.lungeT = 0.001;
    st.prevAtk = s.attack || 0;
    let lunge = clamp(s.lunge || 0, 0, 1);
    if (st.lungeT > 0) { st.lungeT += dt; const u = st.lungeT / 0.45; lunge = Math.max(lunge, u < 0.4 ? smooth(u / 0.4) : 1 - smooth((u - 0.4) / 0.6)); if (u >= 1) st.lungeT = 0; }

    /* bob on the arm (hand puppets have no legs); faster and jerkier when possessed */
    st.bob += dt * (poss ? 9 : 3.2 + speed * 5);
    const bob = (poss ? 0.05 : 0.035) * Math.sin(st.bob) * (1 - limp);
    const shake = strain * 0.05 * noise(t * 18, 3) + hurt * 0.04 * Math.sin(t * 50);
    bodyG.position.set(shake, bob, 0);
    bodyG.rotation.x = -0.12 * strain - 0.35 * lunge + 0.1 * Math.sin(st.bob * 0.5) * (1 - limp) * 0.3;
    bodyG.rotation.z = 0.06 * Math.sin(st.bob * 0.7 + 1) * (1 - limp) + shake;

    /* collapse: the sack folds over onto its side (Hollow lies like that), the head flops */
    fall.rotation.z = (V === 'hollow' ? 1.45 : 1.35 * smooth(clamp(limp, 0, 1))) * (V === 'hollow' ? 1 : 1);
    fall.position.y = 0.18 * smooth(limp);
    neck.rotation.x = 0.55 * limp + 0.25 * lunge - 0.1 * strain;

    /* head look (lags); the possessed one swings hard */
    const ty = alive ? clamp(s.yaw || 0, -0.9, 0.9) : 0, tp = alive ? clamp(s.pitch || 0, -0.5, 0.5) : 0;
    st.hY += (ty - st.hY) * Math.min(1, dt * (poss ? 9 : 4)); st.hP += (tp - st.hP) * Math.min(1, dt * 4);
    neck.rotation.y = st.hY * (1 - limp) + 0.15 * noise(t * 6, 9) * strain;
    neck.rotation.x += st.hP * (1 - limp);

    /* the jaw: flaps when it talks or strains, snaps on the bite, hangs open when limp */
    st.flapPh += dt * (poss ? 16 : 11) * (0.4 + strain + (s.flap || 0));
    const flap = (strain + (s.flap || 0) + (poss ? 0.8 : 0)) * 0.22 * Math.max(0, Math.sin(st.flapPh));
    const bite = lunge > 0.6 ? 0.05 : 0.5 * lunge;
    const jt = Math.max(flap, bite, 0.28 * limp, 0.35 * hurt);
    PG.pend(st.jawP, dt, 260, 18, jt, 0, 0, 0.75);
    jaw.rotation.x = st.jawP.a;

    /* knuckles under the scalp: pressed up when straining or biting */
    const kp = clamp(strain * 0.9 + lunge * 0.7 + (poss ? 0.5 : 0), 0, 1) * (1 - limp);
    for (let i = 0; i < 4; i++) { const k = knk[i]; k.scale.y = 0.35 + 0.9 * kp * (0.8 + 0.2 * Math.sin(t * 7 + i)); k.position.y = JH + HH - 0.035 + 0.025 * kp; }

    /* the lump: a Hand crawling under the felt */
    lump.visible = poss && alive;
    if (lump.visible) { st.lumpPh += dt * 2.3; const a = st.lumpPh, yy = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(a * 0.7));
      lump.position.set(Math.sin(a) * 0.215, yy, Math.cos(a) * 0.19); lump.rotation.y = a; lump.scale.set(1, 0.75 + 0.15 * Math.sin(a * 5), 0.5); }

    /* googly pupils rattle with the motion */
    if (st.goog) {
      const jolt = (bodyG.position.y - st.py) / dt; const ay = (jolt - st.vy) / dt; st.vy = jolt; st.py = bodyG.position.y;
      for (let i = 0; i < 2; i++) { const G = goog[i];
        PG.pend(G.sx, dt, 40, 3, alive ? clamp(st.hY * 0.06, -0.03, 0.03) : 0.03, (i ? 1 : -1) * 0.4 * noise(t * 9, i) * (1 + speed * 4), -0.035, 0.035);
        PG.pend(G.sy, dt, 40, 3, -0.03, -0.02 * clamp(ay, -40, 40), -0.035, 0.035);
        G.pp.position.set(G.sx.a, G.sy.a, 0.012); }
    }

    /* arms: limp dangles; strain thrashes; rods swing */
    for (let i = 0; i < 2; i++) { const A = arms[i], sd = A.side;
      const thr = strain * 0.6 * Math.sin(t * 13 + i * 2) + lunge * 0.8;
      A.sh.rotation.set(-thr - 0.2 * speed * Math.sin(st.bob + i * 3), 0, sd * (0.15 + 0.5 * strain + 0.3 * limp));
      PG.rodTick(A.mt, dt, -8 * (bob / dt) * 0.02 + strain * 6 * noise(t * 5, i + 2), sd * speed * 2); }

    /* the performer's arm: cuff at the hole, wrist at the base of the sack; slurps down the hole when it dies */
    if (arm) {
      st.wd = Math.max(st.wd, clamp(s.withdraw || 0, 0, 1), smooth((dead - 0.15) / 0.5));
      const has = s.hlx !== undefined && s.hly !== undefined;
      /* no hole given: the hole is straight under the sack, the arm runs down through the floor (only the wrist shows) */
      const hx = has ? s.hlx : 0, hy = has ? s.hly : -(arm.L1 + arm.L2 - 0.15), hz = has ? s.hlz : 0;
      /* withdrawn: the wrist target sinks into the hole and the whole arm follows it down */
      const wd = st.wd, wx = PG.lerp(bodyG.position.x * 0.5, hx, wd), wy = PG.lerp(0.02 + bob, hy - 1.2, wd), wz = PG.lerp(0, hz, wd);
      const rig = strain > 0.4 ? 0.2 : 1;                   /* a rigid arm bends less */
      arm.through(hx, hy, hz, wx, wy, wz, (hx > 0 ? 1 : -1) * rig, 0.6, 0.4);
      arm.root.visible = has && wd < 0.98; arm.collar.visible = has;   /* only with a hole: P3 may draw its own OG arm otherwise */
    }
  }

  PG.packGroups(root);
  return { root, update, mats, handles: { head: neck, body: bodyG, jaw }, deathDur: 2.4 };
};
})();

