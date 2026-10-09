/* THE FROG (pgbigfrog): Puppet Purgatory headliner 3 ("THE MANAGEMENT"), Hyperreal. Authored at 1/1.5 scale.
   The Thieving Frog, scaled up and sat down: a squat, wide, wet green felt bullfrog (pgmat_frogfelt) with short thick legs,
   webbed feet, a wide flat head and a throat sac that balloons. Two real-looking eyes bulge on top of his head (golden irises,
   horizontal pupils) and they never move: a dead, unblinking stare.
   The physical lie: there is a hand in him. Knuckles move under the felt of his scalp when he talks; when he dies the hand
   slides out of him (the bulge travels down and out of the hole under his body) and he deflates into an empty sack.
   s fields (P4): seated 0/1 (on the log), banjo 0/1 (phase 1 seated idle: the slow croaking), strum 0..1 (a croak pulse: the
   throat sac balloons), turn 0..1 (the 180-degree head turn at the summon), aimT 0..1 (telegraph: head back, throat
   ballooning), tongue 0..1 (extension), tlen (tongue reach in blocks at tongue=1, default 14), aim [x,y,z] world (tC_purg ->
   s.amx..: the tongue points at it), strain 0..1 (pinned: windmilling, felt stretching), swallow 0..1 (the gape), flail 0..1
   (the pinwheel), trip 0..1 (face-down after he trips on his own feet), headset 0/1 (phase 2: barking orders; default from
   s.phase), clipboard (ignored), arm (blocks of colossal forearm under him, phase 3), empty 0..1 (deflated; also follows
   s.dead), phase 1-3, blind 0..1 (a pie). */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
const F = { crop: [0, 0, 1, 1], split: 0.3 };                   /* the painted face: the wide mouth seam at v .3 */
/* wet green felt with a darker back, a pale throat and the long mouth line */
function frogFace(g, n, R) {
  PG.paintFelt(g, n, R, '#4c9a2c', false);
  g.fillStyle = 'rgba(255,255,255,.16)'; for (let i = 0; i < 50; i++) { g.beginPath(); g.arc(R() * n, R() * n, 2 + R() * 5, 0, 7); g.fill(); }   /* wet sheen */
  g.fillStyle = 'rgba(30,60,20,.35)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(R() * n, R() * n * 0.5, 6 + R() * 10, 4 + R() * 8, R() * 3, 0, 7); g.fill(); }
  g.fillStyle = '#c8d090'; g.fillRect(0, n * 0.72, n, n * 0.28);                                                   /* the pale throat */
  g.fillStyle = '#1e3a12'; g.fillRect(n * 0.02, n * 0.69, n * 0.96, n * 0.03);                                      /* the mouth line */
}
/* a real frog's eye: a golden, veined iris and a black horizontal pupil */
function eyePaint(g, n, R) {
  g.fillStyle = '#c8962a'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 160; i++) { const a = R() * 7, r0 = n * 0.12, r1 = n * (0.25 + R() * 0.25); g.strokeStyle = 'rgba(' + (R() < 0.5 ? '90,50,10' : '240,200,90') + ',.45)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(n / 2 + Math.cos(a) * r0, n / 2 + Math.sin(a) * r0); g.lineTo(n / 2 + Math.cos(a) * r1, n / 2 + Math.sin(a) * r1); g.stroke(); }
  g.fillStyle = '#0a0806'; g.beginPath(); g.ellipse(n * 0.5, n * 0.5, n * 0.24, n * 0.09, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(n * 0.38, n * 0.36, n * 0.04, 0, 7); g.fill();
}

HR.MODELS.pg_bigfrog = function () {
  const C = PG.ctx(61);
  const root = new THREE.Group(); root.name = 'hr_pg_bigfrog';
  const felt = PG.mat(C, [['pgmat_frogfelt', 0xffffff], ['pgmat_felt', 0x4ca82b], ['mat_jersey', 0x4ca82b], [null, 0x4a9a2a]], 0.95, { roughMap: true, repeat: [1, 1] });
  const face = PG.face(C, null, 'bigfrog', frogFace, 0.9);
  const eyeM = PG.face(C, null, 'bigfrogeye', eyePaint, 0.15);
  const tongueM = PG.mat(C, [['pgmat_tongue', 0xffffff], [null, 0xf090b0]], 0.35, { roughMap: true, repeat: [1, 1] });
  const mouth = PG.flat(C, 0x5a1420, 0.6), sac = PG.mat(C, [['pgmat_felt', 0xd0d8a0], ['mat_jersey', 0xc8d094], [null, 0xc8d094]], 0.5, { roughMap: true, repeat: [1, 1] });
  const skin = PG.mat(C, [['pgent_arm', 0xffffff], ['skin_arm', 0xe0a882], [null, 0xd8a58a]], 0.5, { roughMap: false, normalScale: 0.8 });
  /* the body: a hand puppet with short thick legs and webbed feet. Pivot at the feet; hand hole under the pear-shaped body */
  const B = PG.biped(C, root, { hip: 0.3, thigh: 0.16, shin: 0.15, legW: 0.12, tw: 0.42, th: 0.3, td: 0.3, armU: 0.17, armF: 0.16, armW: 0.08,
    legM: felt, torsoM: felt, armM: felt, shoeM: felt, mittM: felt, mittS: 1.2, shoe: [0.24, 0.03, 0.3] });
  B.torsoM.geometry = PG.cylGeo(0.17, 0.24, 0.3, 12); B.torsoM.material = felt;
  PG.hole(B.hips, 0.12, -0.005);
  /* head: wide and flat, the jaw at the long mouth line, the eyes bulging up out of the top */
  const hb = HR.joint(B.neckJ, 0, 0.0, -0.26);
  const H = PG.head(C, hb, { w: 0.66, h: 0.26, d: 0.52, jh: 0.08, face, all: felt, mouth, crop: F.crop, split: F.split });
  const eyes = [[-0.19], [0.19]].map(([x]) => { const lid = PG.mesh(PG.sphereGeo(0.1, 14), felt); lid.scale.set(1, 0.8, 1); lid.position.set(x, 0.26, 0.36); hb.add(lid);
    const m = PG.mesh(PG.photoBall(0.085, [0, 0, 1, 1], 18), eyeM, false); m.position.set(x, 0.3, 0.4); m.scale.set(1, 0.9, 0.85); hb.add(m); return m; });
  /* the hand inside: four knuckles under the scalp and the heel of the palm in the throat */
  const knk = [];
  for (let i = 0; i < 4; i++) { const k = PG.mesh(PG.sphereGeo(0.055, 8), felt, false); k.position.set(-0.15 + i * 0.1, 0.25, 0.16 + (i === 1 || i === 2 ? 0.03 : 0)); k.scale.set(1, 0.4, 1.3); hb.add(k); knk.push(k); }
  /* the throat sac: pale, under the jaw; it balloons on every croak (the s.strum pulse) and on the tongue telegraph */
  const throat = PG.mesh(PG.sphereGeo(0.16, 14), sac); throat.position.set(0, 0.0, 0.36); throat.scale.set(1, 0.5, 0.75); hb.add(throat);
  const bulge = PG.mesh(PG.sphereGeo(0.1, 10), felt, false); bulge.scale.set(1.2, 0.8, 0.7); B.torso.add(bulge);
  /* the tongue: from inside the jaw, along +z; a sticky tip */
  const tJ = HR.joint(hb, 0, 0.06, 0.4); tJ.rotation.order = 'YXZ';
  const tg = PG.box(0.09, 0.035, 1, tongueM, { pz: [0.2, 0.2, 0.8, 0.8], py: [0.1, 0, 0.4, 1], ny: [0.5, 0, 0.8, 1], px: [0, 0.3, 1, 0.5], nx: [0, 0.5, 1, 0.7], nz: [0.2, 0.2, 0.8, 0.8] });
  tg.position.z = 0.5; tJ.add(tg);
  const tip = PG.box(0.14, 0.06, 0.12, tongueM); tJ.add(tip); tJ.visible = false;
  /* phase 3: the colossal forearm he sits on (watch, a tattered sleeve where the frog ends) */
  const armJ = HR.joint(B.hips, 0, -0.02, 0);
  const armM = PG.box(0.5, 1, 0.46, skin, { pz: [0.24, 0, 0.8, 1], nz: [0.24, 0, 0.8, 1], px: [0.24, 0, 0.8, 1], nx: [0.24, 0, 0.8, 1], py: [0.4, 0.9, 0.6, 1], ny: [0.4, 0, 0.6, 0.1] });
  armJ.add(armM); const sleeve = PG.mesh(PG.cylGeo(0.3, 0.27, 0.34, 9), felt); sleeve.position.y = -0.1; armJ.add(sleeve);
  const watch = PG.box(0.52, 0.08, 0.48, PG.flat(C, 0x2a1a10, 0.6)); armJ.add(watch); armJ.visible = false;
  const mats = C.mats.slice();
  const st = { ph: 0, jawP: PG.spring(), hY: 0, hP: 0, turn: 0, spin: 0, emp: 0, strum: 0, sway: 0, tl: 0, croakOn: false };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0, phase = s.phase | 0;
    const speed = alive ? clamp(s.speed || 0, 0, 1.4) : 0, seated = s.seated !== undefined ? s.seated > 0.5 : (phase <= 1 && speed < 0.1 && (s.strain || 0) < 0.3);   /* P1: he stays seated */
    const aimT = clamp(s.aimT || 0, 0, 1), tongue = clamp(s.tongue || 0, 0, 1), strain = clamp(s.strain || 0, 0, 1), sw = clamp(s.swallow || 0, 0, 1);
    const flail = clamp(s.flail || 0, 0, 1), trip = clamp(s.trip || 0, 0, 1), blind = clamp(s.blind || 0, 0, 1);
    st.emp = Math.max(st.emp, clamp(s.empty || 0, 0, 1), smooth(dead / 0.8));
    const emp = st.emp, armH = clamp(s.arm || 0, 0, 30);
    const orders = s.headset !== undefined ? s.headset > 0.5 : phase === 2;      /* phase 2: barking orders at the stage crew */
    const croaking = (s.banjo !== undefined ? s.banjo > 0.5 : phase <= 1) && seated;
    st.ph += dt * (6 + 7 * speed);
    const bob = PG.walk(B, st.ph, Math.min(1, speed), 0.6);
    B.base.position.set(0, bob, 0); B.base.rotation.set(0, 0, 0); B.hips.position.y = 0.3; B.torso.rotation.set(0, 0, 0);
    for (const A of B.arms) { A.sh.rotation.z = A.sd * 0.25; A.el.rotation.z = 0; }
    if (seated) { for (const L of B.legs) { L.hip.rotation.x = -1.5; L.hip.rotation.z = (L.hip.position.x > 0 ? 1 : -1) * 0.45; L.knee.rotation.x = 1.5 + 0.05 * Math.sin(t * 1.1 + L.hip.position.x * 20); } B.hips.position.y = 0.14; }
    /* the croak: every s.strum pulse balloons the throat sac (the pulse decays over a quarter second) */
    st.strum = Math.max(0, st.strum - dt * 4); if ((s.strum || 0) > 0.5 && !st.croakOn) st.strum = 1; st.croakOn = (s.strum || 0) > 0.5;
    if (croaking) { const [R, L] = B.arms; for (const A of B.arms) { A.sh.rotation.x = -0.5; A.el.rotation.x = -0.9; } R.sh.rotation.z = 0.3; L.sh.rotation.z = -0.3; }
    if (orders) { B.arms[1].sh.rotation.x = -0.9 + 0.3 * Math.sin(t * 5); B.arms[1].el.rotation.x = -1.0; }
    /* a cue call (P2): the free arm points off into the dark, a stage manager's flat palm */
    st.cue = Math.max(0, (st.cue || 0) - dt * 1.2); if ((s.cue || 0) > 0.5 && !st.cueOn) st.cue = 1; st.cueOn = (s.cue || 0) > 0.5;
    if (st.cue > 0) { const k = smooth(Math.min(1, st.cue * 2)); B.arms[0].sh.rotation.x = -1.6 * k; B.arms[0].sh.rotation.z = 0.5 * k; B.arms[0].el.rotation.x = -0.1 * k; }
    /* pinned: leans toward the stapled tongue, arms windmilling, felt stretching */
    if (strain > 0) { B.torso.rotation.x = 0.55 * strain; for (const A of B.arms) { A.sh.rotation.x = t * 14 * A.sd; A.sh.rotation.z = A.sd * 0.9 * strain; } }
    /* the Flail: a pinwheel across the sheet, arms out, then he trips over his own feet */
    st.spin = flail > 0 ? st.spin + dt * 13 * flail : st.spin * Math.pow(0.02, dt);
    B.base.rotation.y = st.spin;
    if (flail > 0) for (const A of B.arms) { A.sh.rotation.z = A.sd * 1.5; A.sh.rotation.x = Math.sin(t * 20 + A.sd) * 0.5; }
    if (trip > 0) { B.base.rotation.x = 1.45 * smooth(trip); B.base.position.y = 0.1 * smooth(trip); }
    /* the head: P1 sway, the 180-degree turn, telegraph pull-back, the gape */
    st.sway += dt * 1.1;
    st.turn += (clamp(s.turn || 0, 0, 1) - st.turn) * Math.min(1, dt * 2.2);
    const look = alive && blind < 0.5 ? clamp(s.yaw || 0, -1, 1) : 0.6 * Math.sin(t * 7) * blind;
    st.hY += (look - st.hY) * Math.min(1, dt * 3); st.hP += ((alive ? clamp(s.pitch || 0, -0.5, 0.5) : 0) - st.hP) * Math.min(1, dt * 3);
    /* recoil (phase 3: an elbow hit far below): the whole puppet convulses on its arm */
    PG.pend(st.rc || (st.rc = PG.spring()), dt, 90, 6, clamp(s.recoil || 0, 0, 1), 0, -0.5, 1.5);
    B.base.position.x = 0.06 * st.rc.a * Math.sin(t * 37); B.base.rotation.z += 0.12 * st.rc.a * Math.sin(t * 29);
    B.neckJ.rotation.set(st.hP - 0.35 * aimT + 0.25 * strain + 0.3 * emp + 0.3 * st.rc.a, st.hY + Math.PI * smooth(st.turn) + (seated ? 0.12 * Math.sin(st.sway) : 0), 0.06 * Math.sin(st.sway * 0.7));
    const croak = smooth(st.strum) + (croaking ? 0.12 * Math.max(0, Math.sin(t * 2.2)) : 0);
    throat.scale.set(1 + 0.6 * aimT + 0.8 * croak, 0.5 + 0.6 * aimT + 0.9 * croak, 0.75 + 0.4 * aimT + 0.5 * croak);
    const talk = (seated ? 0.06 : 0) * Math.max(0, Math.sin(t * 5)) + (orders ? 0.18 * Math.max(0, Math.sin(t * 8)) : 0);
    PG.pend(st.jawP, dt, 220, 14, Math.max(talk, 0.12 * aimT, tongue > 0 ? 0.22 : 0, 1.05 * sw, 0.3 * hurt, 0.25 * emp, flail * 0.5), 0, 0, 1.2);
    H.jaw.rotation.x = st.jawP.a;
    /* the hand inside: knuckles press up as the jaw works; the palm bulge sits in his chest */
    const kp = (0.3 + 1.6 * st.jawP.a + 0.6 * strain) * (1 - emp);
    for (let i = 0; i < 4; i++) { knk[i].scale.y = 0.3 + 0.8 * kp * (0.85 + 0.15 * Math.sin(t * 6 + i)); knk[i].position.y = 0.25 + 0.02 * kp; knk[i].visible = emp < 0.95; }
    /* death: the hand slides out (the bulge drops through him and out of the hole), the felt deflates into a sack */
    bulge.visible = emp > 0.02 && emp < 0.98; bulge.position.set(0, 0.26 - 0.6 * emp, 0.02);
    const dfl = smooth(emp);
    hb.scale.set(1 + 0.12 * dfl, 1 - 0.6 * dfl, 1 - 0.15 * dfl); B.torsoM.scale.set(1 + 0.35 * dfl, 1 - 0.75 * dfl, 1 + 0.4 * dfl);
    B.chest.position.y = 0.3 * (1 - 0.75 * dfl);
    for (const e of eyes) { e.rotation.x = 0.7 * dfl; e.scale.set(1, 0.95 - 0.3 * dfl, 0.85); }
    if (dfl > 0) {                                    /* an empty sack: it sits down on the floor, folds forward, the limbs go flat */
      B.hips.position.y = PG.lerp(B.hips.position.y, 0.06, dfl); B.torso.rotation.x = 0.5 * dfl; B.neckJ.rotation.x += 0.5 * dfl;
      for (const L of B.legs) { L.hip.rotation.x = PG.lerp(L.hip.rotation.x, -1.5, dfl); L.hip.rotation.z = (L.hip.position.x > 0 ? 1 : -1) * 0.5 * dfl; L.knee.rotation.x = PG.lerp(L.knee.rotation.x, 0.2, dfl); }
      for (const A of B.arms) { A.sh.rotation.x = PG.lerp(A.sh.rotation.x, 0.4, dfl); A.sh.rotation.z = A.sd * (0.1 + 1.0 * dfl); A.el.rotation.x = 0; } }
    /* the tongue */
    tJ.visible = tongue > 0.01 && s.amx !== undefined;   /* only with an aim point: P4 draws its own OG tongue otherwise */
    if (tJ.visible) { const reach = (s.tlen || 14) / 1.5;
      let len = reach * tongue, yaw = 0, pit = 0;
      if (s.amx !== undefined) { const dx = s.amx / 1.0 - 0, dy = (s.amy || 0) - 1.0, dz = s.amz || 0; const d = Math.hypot(dx, dy, dz); len = Math.min(d, reach) * tongue;
        yaw = Math.atan2(dx, dz) - B.neckJ.rotation.y; pit = -Math.atan2(dy, Math.hypot(dx, dz)) - B.neckJ.rotation.x; }
      tJ.rotation.set(clamp(pit, -1.2, 1.2), clamp(yaw, -1.4, 1.4), 0); tg.scale.z = Math.max(0.01, len); tg.position.z = len / 2; tip.position.z = len;
      tg.scale.y = 1 + 0.4 * strain; }
    /* phase 3: the forearm under him (from his hips down to the floor of the hollow) */
    armJ.visible = armH > 0.1;
    if (armJ.visible) { const L = armH / 1.4; armM.scale.y = L; armM.position.y = -L / 2 - 0.15; watch.position.y = -0.55; armJ.rotation.z = 0.05 * Math.sin(t * 0.6); }
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { head: B.neckJ, body: B.torso, jaw: H.jaw, throat, tongue: tJ, aR: B.arms[0].wr, aL: B.arms[1].wr }, deathDur: 3 };
};
})();

