/* THE DRUMMER (pgdrummer, chained): Puppet Purgatory, Hyperreal. A silverback gorilla in charcoal fur (pgmat_fur, tinted): a
   heavy brow ridge, a leathery face, a crest on the crown, an iron shackle round the neck, drumsticks. The physical lie: the
   chain. At the end of it he is snapped off his feet backwards, every time, and a long strand of drool swings off his lip on
   its own.
   s fields (P3): drum 0..1 (thrashing the kit: the limbs blur), charge 0..1 (full speed at you), yank 0..1 (the chain snaps
   taut: off his feet, onto his back), stun 0..1 (lying stunned), sleep 0..1 (asleep on his feet after the berserk), berserk
   0/1, stake [x,y,z] world (tC_purg -> s.skx..: the chain runs from his collar to it). */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
/* the gorilla's face (canvas): charcoal fur round a leathery grey-black face, deep-set brown eyes under the ridge, wide nostrils */
function gorillaFace(g, n, R) {
  g.fillStyle = '#2c2a2a'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 1400; i++) { const v = 30 + R() * 40 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 4) + ',.6)'; g.fillRect(R() * n, R() * n, 2, 5 + R() * 7); }
  g.fillStyle = '#3c3836'; g.beginPath(); g.ellipse(n * 0.5, n * 0.52, n * 0.34, n * 0.4, 0, 0, 7); g.fill();               /* the bare face */
  for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(20,18,18,' + (0.1 + R() * 0.2) + ')'; g.fillRect(n * (0.2 + R() * 0.6), n * (0.2 + R() * 0.65), 3 + R() * 6, 1); }
  g.fillStyle = '#161414'; g.fillRect(n * 0.18, n * 0.27, n * 0.64, n * 0.07);                                             /* shadow under the ridge */
  for (const x of [0.37, 0.63]) { g.fillStyle = '#3a2412'; g.beginPath(); g.arc(n * x, n * 0.37, n * 0.04, 0, 7); g.fill();
    g.fillStyle = '#080606'; g.beginPath(); g.arc(n * x, n * 0.37, n * 0.018, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(n * (x + 0.012), n * 0.355, 2, 2); }
  g.fillStyle = '#121010'; g.beginPath(); g.ellipse(n * 0.44, n * 0.56, n * 0.045, n * 0.03, -0.3, 0, 7); g.ellipse(n * 0.56, n * 0.56, n * 0.045, n * 0.03, 0.3, 0, 7); g.fill();
  g.fillStyle = '#1a0c0a'; g.fillRect(n * 0.28, n * 0.7, n * 0.44, n * 0.14);
  g.fillStyle = '#d8ccb0'; for (let i = 0; i < 6; i++) g.fillRect(n * (0.31 + i * 0.065), n * 0.7, n * 0.045, n * 0.05);
}

HR.MODELS.pg_drummer = function () {
  const C = PG.ctx(41);
  const root = new THREE.Group(); root.name = 'hr_pg_drummer';
  const fur = PG.mat(C, [['pgmat_fur', 0x4a4a4e], ['mat_wool', 0x3a3a3e], [null, 0x343438]], 0.9, { roughMap: true, repeat: [1, 1] });
  const face = PG.face(C, null, 'gorilla', gorillaFace, 0.6);
  const skin = PG.mat(C, [['mat_skin', 0x3a3634], ['pgmat_felt', 0x34302e], [null, 0x34302e]], 0.7, { roughMap: true, repeat: [1, 1] });   /* leathery hands and feet */
  const iron = HR.flat(0x4a4642, { rough: 0.45, metal: 0.85 }), wood = PG.flat(C, 0xd8b880, 0.6);
  const chainM = HR.flat(0x6a6a6a, { rough: 0.4, metal: 0.8 }), drool = HR.flat(0xd8e4e8, { rough: 0.05, transparent: true, opacity: 0.6 }), mouth = PG.flat(C, 0x3a0808, 0.5);
  const B = PG.biped(C, root, { hip: 0.5, thigh: 0.26, shin: 0.24, legW: 0.15, tw: 0.46, th: 0.42, td: 0.3, armU: 0.26, armF: 0.24, armW: 0.12,
    legM: fur, torsoM: fur, armM: fur, shoeM: skin, mittM: skin, mittS: 1.3, shoe: [0.17, 0.08, 0.28] });
  const shackle = PG.mesh(PG.cylGeo(0.17, 0.18, 0.07, 12), iron, false); shackle.position.y = 0.01; B.neckJ.add(shackle);   /* a plain iron shackle (the chain's anchor) */
  const hb = HR.joint(B.neckJ, 0, 0.05, -0.23);
  const H = PG.head(C, hb, { w: 0.5, h: 0.46, d: 0.46, jh: 0.14, face, all: fur, mouth, crop: [0, 0, 1, 1], split: 0.28 });
  /* the sagittal crest on the crown and the heavy brow ridge */
  const crest = PG.mesh(PG.sphereGeo(0.2, 12), fur); crest.scale.set(0.85, 0.55, 1.15); crest.position.set(0, 0.46, 0.2); hb.add(crest);
  const browB = PG.box(0.46, 0.07, 0.09, skin); browB.position.set(0, 0.35, 0.47); hb.add(browB);
  /* the drool strand: two segments on springs off the lower lip */
  const dJ = HR.joint(H.jaw, 0.08, -0.12, 0.46); const d1 = PG.mesh(PG.cylGeo(0.008, 0.005, 0.18, 5), drool, false); d1.position.y = -0.09; dJ.add(d1);
  const dJ2 = HR.joint(dJ, 0, -0.18, 0); const d2 = PG.mesh(PG.sphereGeo(0.016, 6), drool, false); dJ2.add(d2);
  const sticks = B.arms.map(A => { const j = HR.joint(A.wr, 0, -0.1, 0.05); HR.at(j, PG.mesh(PG.cylGeo(0.012, 0.016, 0.4, 6), wood, false), 0, 0, 0.18); j.rotation.x = Math.PI / 2; return j; });
  /* the chain: 10 links from the collar toward the stake */
  const chainG = HR.joint(root, 0, 0, 0), links = [];
  for (let i = 0; i < 10; i++) { const l = PG.mesh(PG.cylGeo(0.03, 0.03, 0.14, 6, true), chainM, false); l.rotation.order = 'YXZ'; chainG.add(l); links.push(l); }
  const mats = C.mats.slice();
  const st = { ph: 0, jawP: PG.spring(), dp: PG.spring(), dz: PG.spring(), hY: 0 };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0;
    const speed = alive ? clamp(s.speed || 0, 0, 1.5) : 0, drum = clamp(s.drum || 0, 0, 1), charge = clamp(s.charge || 0, 0, 1);
    const yank = clamp(s.yank || 0, 0, 1), stun = clamp(s.stun || 0, 0, 1), sleep = clamp(s.sleep || 0, 0, 1), down = Math.max(smooth(yank), stun);
    st.ph += dt * (8 + 12 * speed);
    const bob = PG.walk(B, st.ph, Math.min(1, speed), 1.0);
    B.base.position.set(0, bob + 0.1 * Math.sin(yank * Math.PI), 0); B.base.rotation.set(-1.5 * down, 0, 0); B.base.position.z = -0.5 * down;
    B.torso.rotation.set(0.5 * charge - 0.3 * sleep, 0, 0);
    if (drum > 0) for (const A of B.arms) { const k = t * (18 + A.sd * 3); A.sh.rotation.x = -1.3 + 0.8 * Math.sin(k) * drum; A.sh.rotation.z = A.sd * (0.4 + 0.3 * Math.cos(k * 0.7)); A.el.rotation.x = -0.9 + 0.5 * Math.cos(k * 1.3); }
    if (charge > 0) for (const A of B.arms) { A.sh.rotation.x = -1.2 * charge; A.sh.rotation.z = A.sd * 0.5; }
    if (down > 0) for (const A of B.arms) { A.sh.rotation.x = -2.4 * down; A.sh.rotation.z = A.sd * 1.0 * down; }
    if (sleep > 0) for (const A of B.arms) { A.sh.rotation.x = 0.1; A.sh.rotation.z = A.sd * 0.05; }
    for (const sk of sticks) sk.visible = drum > 0.1 || (charge < 0.1 && down < 0.1);
    st.hY += ((alive ? clamp(s.yaw || 0, -1, 1) : 0) - st.hY) * Math.min(1, dt * 6);
    B.neckJ.rotation.set(0.3 * drum * Math.sin(t * 18) + 0.5 * sleep - 0.3 * charge, st.hY + 0.2 * drum * Math.sin(t * 9), 0.15 * drum * Math.cos(t * 13));
    PG.pend(st.jawP, dt, 300, 18, Math.max(0.3 * drum * (0.5 + 0.5 * Math.sin(t * 15)), 0.45 * charge, 0.4 * hurt, 0.3 * down, alive ? 0 : 0.35, 0.04 * sleep), 0, 0, 0.7);
    H.jaw.rotation.x = st.jawP.a;
    PG.pend(st.dp, dt, 18, 1.2, 0, -12 * noise(t * 5, 3) * (drum + speed) - 4 * Math.sin(t * 2), -1.2, 1.2); PG.pend(st.dz, dt, 18, 1.2, 0, 8 * noise(t * 4, 9) * (drum + speed), -1.2, 1.2);
    dJ.rotation.set(st.dp.a, 0, st.dz.a); dJ2.rotation.set(st.dp.a * 0.6, 0, st.dz.a * 0.6); d1.scale.y = 1 + 0.5 * sleep;
    /* the chain: a sagging line of links from the collar (model space ~ (0, 1.2, 0.05)) to the stake */
    const hasS = s.skx !== undefined;
    chainG.visible = hasS;
    if (hasS) { const ax = 0, ay = (1.2 - 1.0 * down), az = 0.05 - 0.5 * down, bx = s.skx, by = (s.sky || 0) + 0.1, bz = s.skz;
      const d = Math.hypot(bx - ax, by - ay, bz - az), sag = Math.max(0, 1.5 - d * 0.15) * (1 - yank);
      const yaw = Math.atan2(bx - ax, bz - az);
      for (let i = 0; i < 10; i++) { const u = (i + 0.5) / 10, x = ax + (bx - ax) * u, z = az + (bz - az) * u, y = ay + (by - ay) * u - sag * 4 * u * (1 - u);
        const sl = (by - ay) / Math.max(0.01, Math.hypot(bx - ax, bz - az)) - sag * 4 * (1 - 2 * u) / Math.max(0.01, d), el = Math.atan(sl);
        const l = links[i]; l.position.set(x, y, z); l.scale.y = Math.max(1, d / 10 / 0.14); l.rotation.set(Math.PI / 2 - el, yaw, 0); } }
    if (!alive) { B.base.rotation.x = -1.5 * smooth(dead / 0.4); }
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { head: B.neckJ, body: B.torso, jaw: H.jaw }, deathDur: 2.5 };
};
})();

