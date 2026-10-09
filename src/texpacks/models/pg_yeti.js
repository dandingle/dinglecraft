/* THE YETI (pgyeti): Puppet Purgatory, Hyperreal. A 2.6 m white-furred brute (pgmat_fur, tinted), a blue-grey face, tiny
   eyes, big square teeth. The physical lie: under all that fur, a pair of filthy real human sneakers (pgent_sneakers)
   doing the walking. Trip him there and he face-plants like a felled tree; at the Pig's rope he sits down to watch, hands on
   his knees, the only fan she has.
   s fields (P3): grab 0..1 (the telegraph: both arms up, mouth open), throw 0..1, trip 0..1 (the face-plant), sit 0..1. */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
function yetiFace(g, n, R) {
  g.fillStyle = '#e4e2da'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 1600; i++) { const v = 190 + R() * 60 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 6) + ',.5)'; g.fillRect(R() * n, R() * n, 2, 6 + R() * 8); }
  g.fillStyle = '#7a8a9a'; g.beginPath(); g.ellipse(n * 0.5, n * 0.46, n * 0.26, n * 0.3, 0, 0, 7); g.fill();                /* the blue-grey face */
  for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(60,70,84,' + (0.1 + R() * 0.2) + ')'; g.fillRect(n * (0.28 + R() * 0.44), n * (0.2 + R() * 0.5), 2, 2); }
  g.fillStyle = '#000'; g.beginPath(); g.arc(n * 0.42, n * 0.34, n * 0.025, 0, 7); g.arc(n * 0.58, n * 0.34, n * 0.025, 0, 7); g.fill();
  g.fillStyle = '#4a5664'; g.beginPath(); g.ellipse(n * 0.5, n * 0.48, n * 0.08, n * 0.05, 0, 0, 7); g.fill();
  g.fillStyle = '#2a0808'; g.fillRect(n * 0.22, n * 0.62, n * 0.56, n * 0.2);
  g.fillStyle = '#f0e8c0'; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(n * (0.24 + i * 0.075), n * 0.62); g.lineTo(n * (0.27 + i * 0.075), n * 0.72); g.lineTo(n * (0.3 + i * 0.075), n * 0.62); g.fill(); }
}

HR.MODELS.pg_yeti = function () {
  const C = PG.ctx(29);
  const root = new THREE.Group(); root.name = 'hr_pg_yeti';
  const fur = PG.mat(C, [['pgmat_fur', 0xf4f2ec], ['mat_wool', 0xf0eee6], [null, 0xe8e6de]], 0.95, { roughMap: true, repeat: [1, 1] });
  const face = PG.face(C, null, 'yeti', yetiFace, 0.7);
  const sneak = PG.mat(C, [['pgent_sneakers', 0xffffff], ['mat_jersey', 0xd8d4c8], [null, 0xd0ccc0]], 0.7, {});
  const sole = PG.flat(C, 0xb8b0a0, 0.8), mouth = PG.flat(C, 0x2a0606, 0.6), nail = PG.flat(C, 0x3a2a1a, 0.5);
  const B = PG.biped(C, root, { hip: 0.86, thigh: 0.42, shin: 0.36, legW: 0.3, tw: 0.9, th: 0.82, td: 0.6, armU: 0.5, armF: 0.48, armW: 0.24,
    legM: fur, torsoM: fur, armM: fur, mittM: fur, mittS: 2.4, shoeM: sneak, shoe: [0.34, 0.16, 0.46] });
  /* sneakers: the shoe box from biped gets the photo; add laces + a sole strip */
  for (const L of B.legs) { const s = PG.box(0.35, 0.04, 0.47, sole); s.position.set(0, -0.36 - 0.17, 0.1); L.knee.add(s); }
  /* a shaggy fringe hanging over the shins (the fur hem the sneakers stick out from) */
  const hem = PG.mesh(PG.cylGeo(0.46, 0.56, 0.4, 12, true), fur); hem.position.y = -0.12; B.hips.add(hem);
  const hb = HR.joint(B.neckJ, 0, 0.0, -0.32);
  const H = PG.head(C, hb, { w: 0.7, h: 0.62, d: 0.64, jh: 0.2, face, all: fur, mouth, crop: [0, 0, 1, 1], split: 0.3 });
  B.neckJ.position.z = 0.12;                                    /* the head juts forward off the hunch */
  const tufts = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, j = HR.joint(hb, Math.cos(a) * 0.36, 0.56 + 0.05 * Math.sin(a * 2), 0.32 + Math.sin(a) * 0.32);
    HR.at(j, PG.box(0.16, 0.22, 0.16, fur, PG.tile(0.16, 0.22, 0.16, i * 0.17, 0.3, 1.6)), 0, 0.09, 0); j.rotation.set(Math.sin(a) * 0.4, a, Math.cos(a) * 0.4); tufts.push(j); }
  for (const A of B.arms) A.mitt.rod.visible = false;           /* a walk-around costume: no arm rods */
  for (const A of B.arms) for (let k = 0; k < 3; k++) { const c = PG.box(0.05, 0.06, 0.06, nail, undefined, false); c.position.set((k - 1) * 0.08, -0.38, 0.1); A.wr.add(c); }
  const mats = C.mats.slice();
  const st = { ph: 0, jawP: PG.spring(), hY: 0 };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0, speed = alive ? clamp(s.speed || 0, 0, 1.3) : 0;
    const grab = clamp(s.grab || 0, 0, 1), thr = clamp(s.throw || 0, 0, 1), trip = clamp(s.trip || 0, 0, 1), sit = clamp(s.sit || 0, 0, 1);
    st.ph += dt * (4 + 5 * speed);                              /* a slow, heavy stride */
    const bob = PG.walk(B, st.ph, Math.min(1, speed), 0.55);
    B.base.position.set(0, bob * 2 - 0.5 * sit, 0); B.base.rotation.set(1.5 * smooth(trip), 0, 0.05 * Math.sin(st.ph) * speed);
    B.torso.rotation.set(0.25 + 0.1 * speed - 0.25 * grab, 0, 0);
    if (grab > 0) for (const A of B.arms) { A.sh.rotation.x = -2.8 * smooth(grab); A.sh.rotation.z = A.sd * 0.35; A.el.rotation.x = -0.3; }
    if (thr > 0) for (const A of B.arms) { A.sh.rotation.x = -2.8 + 3.4 * thr; A.el.rotation.x = -0.2; }
    if (sit > 0) { for (const L of B.legs) { L.hip.rotation.x = -1.5 * sit; L.knee.rotation.x = 1.5 * sit; } for (const A of B.arms) { A.sh.rotation.x = -0.9 * sit; A.el.rotation.x = -0.6 * sit; } }
    if (trip > 0) for (const A of B.arms) { A.sh.rotation.x = -2.9 * trip; A.sh.rotation.z = A.sd * 0.6 * trip; }
    st.hY += ((alive ? clamp(s.yaw || 0, -0.8, 0.8) : 0) - st.hY) * Math.min(1, dt * 2.5);
    B.neckJ.rotation.set(-0.15 + 0.1 * Math.sin(st.ph * 2) * speed - 0.3 * grab + 0.3 * trip, st.hY, 0.05 * Math.sin(t * 0.8));
    PG.pend(st.jawP, dt, 160, 12, Math.max(0.5 * grab, 0.3 * hurt, 0.06 + 0.04 * Math.sin(t * 1.3), 0.4 * trip, alive ? 0 : 0.3), 0, 0, 0.7);
    H.jaw.rotation.x = st.jawP.a;
    for (let i = 0; i < tufts.length; i++) tufts[i].rotation.y = i / 10 * Math.PI * 2 + 0.1 * noise(t * 2 + i, i);
    if (!alive) { B.base.rotation.x = 1.5 * smooth(dead / 0.4); }
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { head: B.neckJ, body: B.torso, jaw: H.jaw }, deathDur: 2.4 };
};
})();

