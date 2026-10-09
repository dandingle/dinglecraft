/* THE PIG (pgbigpig): Puppet Purgatory headliner 2, Hyperreal. Authored at 1/1.5 scale.
   A very large plain pink pig standing on her hind legs: the overworld pig's own face (face_pig, the too-human grin and all)
   on a bristly pig-hide body (pig_hide), floppy ears, trotters. No costume: she does not need one. The physical lie: her
   ears. Every time she is hurt one ear flips inside out a little further, and she smooths it back with a trotter (the preen
   does too).
   s fields (P4): throwT 0..1 (pig throw: wind-up to .6, release after), lift 0..1 (a body overhead), toss 0..1 (THE tell: the
   trotters pushed up her arms), preen 0..1 (smoothing her ears at her mirror), pose 0..1 (the finale pose under the lamp),
   charge 0..1 (head down, snout flared), chop 0..1 (Chop: a trotter up with a glint), admire 0..1 (a Vanity Mirror),
   smooch 0..1, phase. The death (s.dead) is a swoon backwards into a tumble (P4 rolls her down the staircase). */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
const F = { crop: [0, 0, 1, 1], split: 0.165 };                 /* face_pig: lip line v .165 (the overworld pig's own jaw split) */
/* a plain pig face for builds without the overworld art */
function bigpigFace(g, n, R) {
  g.fillStyle = '#eab8b0'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(255,240,230,' + (0.08 + R() * 0.1) + ')'; g.fillRect(R() * n, R() * n, 1, 3 + R() * 4); }
  g.fillStyle = '#f2a0b0'; g.beginPath(); g.ellipse(n * 0.5, n * 0.57, n * 0.2, n * 0.15, 0, 0, 7); g.fill();
  g.fillStyle = '#6a2a30'; g.beginPath(); g.ellipse(n * 0.43, n * 0.58, n * 0.03, n * 0.045, 0, 0, 7); g.ellipse(n * 0.57, n * 0.58, n * 0.03, n * 0.045, 0, 0, 7); g.fill();
  g.fillStyle = '#20180f'; g.beginPath(); g.arc(n * 0.22, n * 0.28, n * 0.035, 0, 7); g.arc(n * 0.78, n * 0.28, n * 0.035, 0, 7); g.fill();
  g.fillStyle = '#7a2a2a'; g.beginPath(); g.ellipse(n * 0.5, n * 0.86, n * 0.2, n * 0.06, 0, 0, 7); g.fill();
}

HR.MODELS.pg_bigpig = function () {
  const C = PG.ctx(77);
  const root = new THREE.Group(); root.name = 'hr_pg_bigpig';
  const face = PG.face(C, 'face_pig', 'bigpig', bigpigFace, 0.45);
  const hide = PG.mat(C, [['pig_hide', 0xf0d4cc], ['mat_skin', 0xf0b0a8], [null, 0xf0b0a8]], 0.55, { roughMap: false, normalScale: 0.6, repeat: [1, 1] });
  const earM = PG.mat(C, [['pig_flank', 0xf4c8c0], ['pig_hide', 0xf0c0b8], [null, 0xf0b8b0]], 0.5, { roughMap: false, normalScale: 0.6, repeat: [1, 1] });
  const mouth = PG.flat(C, 0x5a1a2a, 0.5), trot = PG.flat(C, 0x3a2a24, 0.5), glint = PG.glow(0xffffff, 6);
  const B = PG.biped(C, root, { hip: 0.5, thigh: 0.24, shin: 0.24, legW: 0.12, tw: 0.36, th: 0.32, td: 0.28, armU: 0.2, armF: 0.22, armW: 0.09,
    legM: hide, torsoM: hide, armM: hide, shoeM: trot, shoe: [0.12, 0.06, 0.15],
    hand: (C2, wr, sd) => { const m = PG.box(0.1, 0.1, 0.09, hide); m.position.y = -0.05; wr.add(m);
      const th = HR.joint(wr, 0, -0.1, 0); HR.at(th, PG.box(0.1, 0.05, 0.09, trot), 0, -0.025, 0);   /* the trotter */
      return { wr, th, rp: HR.joint(wr, 0, 0, 0), sw: PG.spring(), sz: PG.spring() }; } });
  /* a big round belly over the hips */
  const belly = PG.mesh(PG.sphereGeo(0.24, 16), hide); belly.scale.set(0.95, 1.05, 0.85); belly.position.set(0, 0.12, 0.03); B.torso.add(belly);
  const chopJ = HR.joint(B.arms[0].wr, 0, -0.08, 0.05); const gl = PG.mesh(PG.sphereGeo(0.03, 8), glint, false); chopJ.add(gl); chopJ.visible = false;
  /* head: the overworld pig's face photo on a hide head, split at the lip line; two big floppy ears */
  const hb = HR.joint(B.neckJ, 0, 0.05, -0.2);
  const neck = PG.box(0.16, 0.06, 0.16, hide); neck.position.y = 0.02; B.neckJ.add(neck);
  const H = PG.head(C, hb, { w: 0.42, h: 0.44, d: 0.4, jh: 0.08, face, all: hide, mouth, crop: F.crop, split: F.split });
  const ears = [1, -1].map(sd => { const j = HR.joint(hb, sd * 0.17, 0.44, 0.24);
    HR.at(j, PG.box(0.16, 0.18, 0.03, earM), 0, 0.08, 0); j.rotation.set(0.55, 0, sd * -0.45); return j; });
  const earsJ = HR.joint(hb, 0, 0.44, 0.2);
  const mats = C.mats.slice();
  const st = { ph: 0, sway: 0, slip: 0, slipT: 0, prevHurt: 0, jawP: PG.spring(), earP: PG.spring(), hY: 0, hP: 0, roll: 0 };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0;
    const speed = alive ? clamp(s.speed || 0, 0, 1.4) : 0, thr = clamp(s.throwT || 0, 0, 1), lift = clamp(s.lift || 0, 0, 1), toss = clamp(s.toss || 0, 0, 1);
    const preen = clamp(s.preen || 0, 0, 1), pose = clamp(s.pose || 0, 0, 1), charge = clamp(s.charge || 0, 0, 1), chop = clamp(s.chop || 0, 0, 1);
    const admire = clamp(s.admire || 0, 0, 1), smooch = clamp(s.smooch || 0, 0, 1);
    st.ph += dt * (7 + 7 * speed);
    const bob = PG.walk(B, st.ph, Math.min(1, speed), 0.45);
    st.sway += dt * 1.3;
    B.base.rotation.set(0, 0, 0); B.base.position.set(0, bob, 0);
    B.hips.rotation.set(0, 0.12 * Math.sin(st.sway) * (1 - speed), 0.05 * Math.sin(st.sway) + 0.12 * pose);
    B.torso.rotation.set(0.5 * charge - 0.1 * pose - 0.15 * admire, 0, -0.06 * pose);
    /* arms: start from the walk, then each action takes them */
    const [R, L] = B.arms;                                        /* arms[0] = her right (-x), arms[1] = her left */
    for (const A of B.arms) { A.sh.rotation.z = A.sd * 0.12; A.el.rotation.z = 0; }
    if (thr > 0) { const w = thr < 0.6 ? smooth(thr / 0.6) : 1 - smooth((thr - 0.6) / 0.4);
      R.sh.rotation.x = thr < 0.6 ? 0.9 * w - 2.4 * w : -2.2 + 2.6 * (1 - w); R.el.rotation.x = -0.9 * w; B.torso.rotation.y = 0.5 * (thr < 0.6 ? w : -w); }
    if (lift > 0) for (const A of B.arms) { A.sh.rotation.x = -3.0 * smooth(lift); A.sh.rotation.z = A.sd * 0.25; A.el.rotation.x = -0.3; }
    if (toss > 0) {           /* the tell: she rolls her shoulders and pushes both trotters up her arms, a big theatrical gesture */
      const k = smooth(toss), a = Math.sin(toss * Math.PI * 2);
      R.sh.rotation.x = -1.2 * k; R.sh.rotation.z = 0.7 * k * (a > 0 ? 1 : 0.4); R.el.rotation.x = -1.4 * k;
      L.sh.rotation.x = -1.2 * k; L.sh.rotation.z = -0.7 * k * (a < 0 ? 1 : 0.4); L.el.rotation.x = -1.4 * k; }
    if (preen > 0) { L.sh.rotation.x = -2.5 * smooth(preen); L.sh.rotation.z = -0.4; L.el.rotation.x = -1.5 + 0.3 * Math.sin(t * 9); }
    if (pose > 0) { L.sh.rotation.x = -2.8 * pose; L.sh.rotation.z = -0.5 * pose; R.sh.rotation.z = 0.9 * pose; R.el.rotation.x = -1.6 * pose; R.sh.rotation.x = 0.3 * pose; }
    if (chop > 0) { R.sh.rotation.x = -2.9 * smooth(chop); R.sh.rotation.z = 0.2; R.el.rotation.x = -0.2; }
    chopJ.visible = chop > 0.4; gl.scale.setScalar(0.5 + 1.5 * Math.max(0, Math.sin(t * 16)));
    if (admire > 0) for (const A of B.arms) { A.sh.rotation.x = -1.1 * admire; A.sh.rotation.z = -A.sd * 0.5 * admire; A.el.rotation.x = -1.3 * admire; }
    /* the belly swings behind the walk */
    belly.rotation.x = 0.06 * Math.sin(st.ph) * speed;
    /* the head: the diva tilt; charge drops it, the snout flares (head z-scale), smooch purses */
    st.hY += ((alive ? clamp(s.yaw || 0, -0.9, 0.9) : 0) - st.hY) * Math.min(1, dt * 4); st.hP += ((alive ? clamp(s.pitch || 0, -0.5, 0.5) : 0) - st.hP) * Math.min(1, dt * 4);
    B.neckJ.rotation.set(st.hP + 0.45 * charge - 0.25 * pose - 0.2 * preen, st.hY + 0.2 * Math.sin(st.sway * 0.7) * (1 - charge), 0.18 * preen + 0.12 * admire + 0.08 * Math.sin(st.sway));
    hb.scale.set(1, 1, 1 + 0.08 * charge * (0.5 + 0.5 * Math.sin(t * 12)));
    PG.pend(st.jawP, dt, 240, 15, Math.max(0.25 * hurt, 0.15 * Math.max(0, Math.sin(t * 9)) * (lift + toss), alive ? 0 : 0.3, smooch > 0 ? -0.02 : 0), 0, -0.02, 0.5);
    H.jaw.rotation.x = st.jawP.a;
    /* one ear flips inside out a little more on every hurt and is smoothed back by preening (the lie) */
    if (hurt > st.prevHurt + 0.3) st.slip = Math.min(1, st.slip + 0.34);
    st.prevHurt = hurt;
    if (preen > 0.6 || pose > 0.6) st.slip = Math.max(0, st.slip - dt * 0.8);
    PG.pend(st.earP, dt, 60, 5, st.slip, (speed * 3 + hurt * 8) * noise(t * 6, 2), -0.2, 1.2);
    ears[0].rotation.set(0.55 - 2.2 * st.earP.a, 0, -0.45 + 0.3 * st.earP.a);
    ears[1].rotation.set(0.55 + 0.25 * Math.sin(st.ph) * speed + 0.1 * preen * Math.sin(t * 9), 0, 0.45);
    /* death: a swoon backwards (one hand to the brow), then a tumble that keeps going (the staircase is P4's) */
    if (!alive) { const sw = smooth(dead / 0.3); st.roll = dead > 0.3 ? (dead - 0.3) * 14 : 0;
      B.base.rotation.x = -1.2 * sw - st.roll; B.base.position.y = 0.35 * sw;
      L.sh.rotation.x = -2.6 * sw; L.el.rotation.x = -1.8 * sw; R.sh.rotation.z = 1.2 * sw; }
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { head: B.neckJ, body: B.torso, jaw: H.jaw, ears: earsJ, aR: B.arms[0].wr, aL: B.arms[1].wr }, deathDur: 3 };
};
})();

