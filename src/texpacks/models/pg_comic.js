/* THE COMIC (pgcomic, tethered, passive): Puppet Purgatory, Hyperreal. A tan basset hound doing stand-up: a long muzzle with a
   black nose, sad bloodshot eyes, jowls, two long ears that swing with the jokes, a microphone in his working mitt. Worn on a
   real arm like a Blank (the forearm runs from his hand hole down to the Arm Hole). The physical lie: he holds your wrist at
   arm's length with his free mitt for the whole routine, jaw going, the arm bouncing, and then he waits in total stillness
   for the laugh.
   s fields (P3): routine 0..1 (mouth flapping, arm bounce), grab 0..1 (the free mitt stretched forward, holding a wrist),
   still 0..1 (the beat of total stillness), louder 0..1 (hit: the routine goes louder), hole [x,y,z] world, withdraw 0..1. */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
/* the hound's face (canvas): short tan fur, a white blaze down the middle, droopy eyes with red lower lids, dark jowls */
function houndFace(g, n, R) {
  g.fillStyle = '#b8884e'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 1600; i++) { const v = R(); g.fillStyle = 'rgba(' + (120 + v * 70 | 0) + ',' + (80 + v * 50 | 0) + ',' + (40 + v * 30 | 0) + ',.45)'; g.fillRect(R() * n, R() * n, 1.5, 3 + R() * 4); }
  g.fillStyle = 'rgba(240,232,214,.85)'; g.beginPath(); g.moveTo(n * 0.44, 0); g.lineTo(n * 0.56, 0); g.lineTo(n * 0.64, n); g.lineTo(n * 0.36, n); g.fill();
  for (const x of [0.32, 0.68]) {
    g.fillStyle = '#9a2a22'; g.beginPath(); g.ellipse(n * x, n * 0.28, n * 0.09, n * 0.06, 0, 0, Math.PI); g.fill();        /* the red haw under each eye */
    g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(n * x, n * 0.26, n * 0.075, n * 0.05, 0, 0, 7); g.fill();
    g.fillStyle = '#5a3418'; g.beginPath(); g.arc(n * x, n * 0.265, n * 0.035, 0, 7); g.fill();
    g.fillStyle = '#b8884e'; g.fillRect(n * (x - 0.09), n * 0.19, n * 0.18, n * 0.045);                                   /* heavy, sad lids */
    g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(n * (x + 0.01), n * 0.245, 3, 3);
  }
  g.fillStyle = 'rgba(70,40,20,.55)'; g.fillRect(0, n * 0.62, n, n * 0.38);                                                /* jowls */
}

HR.MODELS.pg_comic = function () {
  const C = PG.ctx(43);
  const root = new THREE.Group(); root.name = 'hr_pg_comic';
  const fur = PG.mat(C, [['pgmat_fur', 0xb88a52], ['pgmat_felt', 0xb8884e], ['mat_wool', 0xb88a52], [null, 0xb0844c]], 0.9, { roughMap: true, repeat: [1, 1] });
  const earM = PG.mat(C, [['pgmat_fur', 0x6a4426], ['pgmat_felt', 0x6a4426], [null, 0x5e3c22]], 0.9, { roughMap: true, repeat: [1, 1] });
  const face = PG.face(C, null, 'comichound', houndFace, 0.75);
  const noseM = PG.flat(C, 0x141010, 0.25), micM = HR.flat(0x2a2a2e, { rough: 0.35, metal: 0.6 }), grille = HR.flat(0x8a8a90, { rough: 0.4, metal: 0.8 });
  const mouth = PG.flat(C, 0x4a1414, 0.6);
  const base = HR.joint(root, 0, 0, 0);
  PG.hole(base, 0.15, 0.002);
  const body = HR.joint(base, 0, 0, 0);
  const sack = PG.mesh(PG.cylGeo(0.26, 0.2, 0.5, 9), fur); sack.position.y = 0.25; body.add(sack);
  const neck = HR.joint(body, 0, 0.5, -0.02); neck.rotation.order = 'YXZ';
  const hb = HR.joint(neck, 0, 0, -0.25);
  const H = PG.head(C, hb, { w: 0.6, h: 0.48, d: 0.5, jh: 0.18, face, all: fur, mouth, crop: [0, 0, 1, 1], split: 0.32 });
  /* the long muzzle and the black nose on the upper head; the jowls hang off the jaw */
  HR.at(hb, PG.box(0.3, 0.13, 0.2, fur), 0, 0.245, 0.58);
  const nose = PG.mesh(PG.sphereGeo(0.065, 10), noseM); nose.scale.set(1.25, 0.9, 0.8); nose.position.set(0, 0.29, 0.68); hb.add(nose);
  for (const sd of [1, -1]) HR.at(H.jaw, PG.box(0.12, 0.14, 0.18, fur), sd * 0.1, -0.1, 0.55);
  /* the ears: long, hanging from the top corners of the head, swinging with the jokes */
  const ears = [1, -1].map(sd => { const e = HR.joint(hb, sd * 0.31, 0.42, 0.22); HR.at(e, PG.box(0.05, 0.42, 0.2, earM), 0, -0.2, 0); return e; });
  const arms = [1, -1].map(sd => { const sh = HR.joint(body, sd * 0.25, 0.44, 0.02); HR.at(sh, PG.box(0.08, 0.32, 0.08, fur), 0, -0.16, 0);
    const wr = HR.joint(sh, 0, -0.32, 0); const mt = PG.mitt(C, wr, sd, fur, 1.1); return { sh, wr, mt, sd }; });
  /* the microphone in his working (right) mitt */
  const mic = HR.joint(arms[1].wr, 0, -0.1, 0.05); mic.rotation.x = -1.2;
  HR.at(mic, PG.mesh(PG.cylGeo(0.022, 0.016, 0.16, 8), micM, false), 0, 0.02, 0); HR.at(mic, PG.mesh(PG.sphereGeo(0.04, 10), grille, false), 0, 0.12, 0);
  const arm = PG.arm(C, root, { l1: 2.7, l2: 2.5, w: 0.24 });
  const mats = C.mats.slice();
  const st = { bob: 0, jawP: PG.spring(), hY: 0, wd: 0 };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0;
    const routine = clamp(s.routine || 0, 0, 1), grab = clamp(s.grab || 0, 0, 1), still = clamp(s.still || 0, 0, 1), louder = clamp(s.louder || 0, 0, 1);
    const act = routine * (1 - still);
    st.bob += dt * (3 + 6 * act);
    const bob = (0.03 + 0.07 * act) * Math.sin(st.bob) * (1 - still);
    body.position.y = bob; body.rotation.set(0.05 * Math.sin(st.bob * 0.5) * act, 0, 0.08 * Math.sin(st.bob) * act);
    /* the grab: his free (left) mitt reaches forward and holds; the other arm does the routine */
    const [L, R] = arms;
    L.sh.rotation.set(-1.5 * grab - 0.2 * act * Math.sin(st.bob * 2) * (1 - grab), 0, 0.15 + 0.2 * (1 - grab));
    R.sh.rotation.set(-0.6 * act - 0.5 * act * Math.max(0, Math.sin(st.bob * 2)) - 0.9 * louder, 0, -0.2 - 0.4 * act);
    for (const A of arms) PG.rodTick(A.mt, dt, 5 * act * noise(t * 5, A.sd), 0);
    st.hY += ((alive ? clamp(s.yaw || 0, -0.9, 0.9) : 0) - st.hY) * Math.min(1, dt * 4);
    neck.rotation.set(-0.05 + 0.1 * act * Math.sin(st.bob * 2) + 0.4 * smooth(dead), st.hY * (1 - still * 0.9), 0.1 * act * Math.sin(st.bob));
    const flap = (0.25 + 0.2 * louder) * act * Math.max(0, Math.sin(t * (11 + 5 * louder)));
    PG.pend(st.jawP, dt, 260, 16, Math.max(flap, 0.3 * hurt, alive ? 0 : 0.35), 0, 0, 0.7); H.jaw.rotation.x = st.jawP.a;
    for (let i = 0; i < 2; i++) { ears[i].rotation.z = (i ? -1 : 1) * (0.08 + 0.25 * act * Math.max(0, Math.sin(st.bob + i))); ears[i].rotation.x = 0.15 * act * Math.sin(t * 7 + i); }
    st.wd = Math.max(st.wd, clamp(s.withdraw || 0, 0, 1), smooth((dead - 0.15) / 0.5));
    const has = s.hlx !== undefined, hx = has ? s.hlx : 0, hy = has ? s.hly : -(arm.L1 + arm.L2 - 0.15), hz = has ? s.hlz : 0, wd = st.wd;
    arm.through(hx, hy, hz, PG.lerp(0, hx, wd), PG.lerp(0.02 + bob, hy - 1.2, wd), PG.lerp(0, hz, wd), hx > 0 ? 1 : -1, 0.6, 0.4);
    arm.root.visible = has && wd < 0.98; arm.collar.visible = has;   /* only with a hole (else P3's OG arm shows) */
    if (!alive) { base.rotation.z = 1.3 * smooth(dead / 0.5); base.position.y = 0.2 * smooth(dead / 0.5); }
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { head: neck, body, jaw: H.jaw, mic }, deathDur: 2.4 };
};
})();

