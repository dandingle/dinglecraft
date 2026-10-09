/* THE DAREDEVIL (pgdare): Puppet Purgatory, Hyperreal. A crash-test dummy: a yellow plastic head with black-and-yellow target
   decals on both sides, a white stunt helmet with a red stripe, a white jumpsuit, yellow plastic hands. He still gets fired
   out of the cannon for fun. The physical lie: the landing. A miss drives him head-first into the floor up to the shoulders,
   legs kicking, his helmet knocked crooked by the impact, and he says he nailed it.
   s fields (P3/P4): launch 0..1 (fired: arms forward, body rigid, superhero), stuck 0..1 (head-first in the floor, legs kicking),
   bend 0..1 (the helmet knocked crooked after a landing; follows stuck), climb 0..1 (into the cannon). */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
/* the dummy's face (canvas): scuffed yellow plastic, two flat moulded eyes, a moulded nose ridge, a seam line, a slot mouth */
function dummyFace(g, n, R) {
  g.fillStyle = '#e2b62a'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 700; i++) { g.fillStyle = 'rgba(' + (R() < 0.5 ? '60,40,10' : '255,240,180') + ',' + (0.05 + R() * 0.1) + ')'; g.fillRect(R() * n, R() * n, 1 + R() * 6, 1); }
  g.fillStyle = 'rgba(90,60,10,.35)'; g.fillRect(n * 0.47, n * 0.36, n * 0.06, n * 0.26);                     /* the nose ridge */
  g.fillStyle = '#2a2418'; g.beginPath(); g.ellipse(n * 0.34, n * 0.38, n * 0.06, n * 0.035, 0, 0, 7); g.ellipse(n * 0.66, n * 0.38, n * 0.06, n * 0.035, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(40,30,10,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(n * 0.04, n * 0.22); g.lineTo(n * 0.96, n * 0.22); g.stroke();
  g.fillStyle = '#3a2a10'; g.fillRect(n * 0.36, n * 0.8, n * 0.28, n * 0.035);
}
/* the black-and-yellow quadrant target every crash-test dummy wears */
function targetPaint(g, n) {
  g.fillStyle = '#e2b62a'; g.fillRect(0, 0, n, n);
  g.fillStyle = '#141414'; g.beginPath(); g.moveTo(n / 2, n / 2); g.arc(n / 2, n / 2, n * 0.46, 0, Math.PI / 2); g.fill();
  g.beginPath(); g.moveTo(n / 2, n / 2); g.arc(n / 2, n / 2, n * 0.46, Math.PI, Math.PI * 1.5); g.fill();
  g.strokeStyle = '#141414'; g.lineWidth = n * 0.03; g.beginPath(); g.arc(n / 2, n / 2, n * 0.46, 0, 7); g.stroke();
}

HR.MODELS.pg_daredevil = function () {
  const C = PG.ctx(37);
  const root = new THREE.Group(); root.name = 'hr_pg_daredevil';
  const plastic = PG.flat(C, 0xe2b62a, 0.4);
  const face = PG.face(C, null, 'daredummy', dummyFace, 0.45), target = PG.face(C, null, 'daretarget', targetPaint, 0.45);
  const suit = PG.mat(C, [['pgmat_felt', 0xeeeee6], ['mat_jersey', 0xeeeee8], [null, 0xe8e8e0]], 0.85, { roughMap: true, repeat: [1, 1] });
  const helmM = PG.flat(C, 0xf2f0ea, 0.25), stripe = PG.flat(C, 0xc02a22, 0.3), mouth = PG.flat(C, 0x2a2010, 0.6);
  const B = PG.biped(C, root, { hip: 0.46, thigh: 0.22, shin: 0.22, legW: 0.08, tw: 0.3, th: 0.38, td: 0.2, armU: 0.22, armF: 0.2, armW: 0.075,
    legM: suit, torsoM: suit, armM: suit, mittM: plastic, shoeM: PG.flat(C, 0x2a2a2e, 0.5), shoe: [0.11, 0.07, 0.2] });
  const tg = PG.box(0.1, 0.1, 0.01, target, undefined, false); tg.position.set(-0.08, 0.27, 0.105); B.torso.add(tg);   /* a target on the chest too */
  const hb = HR.joint(B.neckJ, 0, 0.04, -0.18);
  const H = PG.head(C, hb, { w: 0.36, h: 0.38, d: 0.36, jh: 0.1, face, all: plastic, mouth, crop: [0, 0, 1, 1], split: 0.22 });
  for (const sd of [1, -1]) { const d = PG.mesh(PG.cylGeo(0.08, 0.08, 0.01, 16), [plastic, target, target], false); d.rotation.z = Math.PI / 2; d.position.set(sd * 0.185, 0.24, 0.2); hb.add(d); }
  /* the stunt helmet: a shell over the crown and the back of the head, a red stripe front to back; it rides on its own joint */
  const helmet = HR.joint(hb, 0, 0.32, 0.12);
  const shell = PG.mesh(PG.sphereGeo(0.235, 18), helmM); shell.scale.set(1.02, 0.7, 1.0); shell.position.y = 0.04; helmet.add(shell);
  HR.at(helmet, PG.box(0.06, 0.03, 0.44, stripe), 0, 0.19, 0);
  const mats = C.mats.slice();
  const st = { ph: 0, jawP: PG.spring(), hY: 0, bend: 0 };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0, speed = alive ? clamp(s.speed || 0, 0, 1.3) : 0;
    const launch = clamp(s.launch || 0, 0, 1), stuck = clamp(s.stuck || 0, 0, 1), climb = clamp(s.climb || 0, 0, 1);
    st.bend = Math.max(st.bend * Math.pow(0.97, dt * 60), clamp(s.bend || 0, 0, 1), stuck);
    st.ph += dt * (8 + 9 * speed);
    const bob = PG.walk(B, st.ph, Math.min(1, speed), 0.7);
    B.base.position.set(0, bob, 0); B.base.rotation.set(0, 0, 0);
    if (launch > 0) { B.base.rotation.x = 1.4 * launch; B.base.position.y = 0.4 * launch; for (const A of B.arms) { A.sh.rotation.x = -2.9 * launch; A.sh.rotation.z = A.sd * 0.15; A.el.rotation.x = 0; } for (const L of B.legs) { L.hip.rotation.x = 0.15; L.knee.rotation.x = 0.1; } }
    if (stuck > 0) {          /* upside down, head and shoulders in the floor, legs kicking */
      B.base.rotation.x = Math.PI * smooth(stuck); B.base.position.y = 1.15 * smooth(stuck) - 0.42 * stuck;
      for (const L of B.legs) { L.hip.rotation.x = 0.7 * Math.sin(t * 14 + L.hip.position.x * 30); L.knee.rotation.x = 0.6 + 0.5 * Math.sin(t * 14 + 1 + L.hip.position.x * 30); }
      for (const A of B.arms) { A.sh.rotation.x = -0.2; A.sh.rotation.z = A.sd * 0.6 + 0.3 * Math.sin(t * 9 + A.sd); } }
    if (climb > 0) for (const A of B.arms) { A.sh.rotation.x = -2.5 * climb; A.el.rotation.x = -0.5; }
    st.hY += ((alive ? clamp(s.yaw || 0, -0.9, 0.9) : 0) - st.hY) * Math.min(1, dt * 4);
    B.neckJ.rotation.set(-0.3 * launch, st.hY, 0.1 * Math.sin(t * 1.3));
    helmet.rotation.set(-0.25 * st.bend, 0.2 * st.bend, 0.45 * st.bend + 0.04 * st.bend * Math.sin(t * 9)); helmet.position.set(0.04 * st.bend, 0.32 - 0.03 * st.bend, 0.12);
    PG.pend(st.jawP, dt, 240, 15, Math.max(0.25 * launch, 0.3 * hurt, 0.2 * stuck * Math.max(0, Math.sin(t * 6)), alive ? 0 : 0.3), 0, 0, 0.5);
    H.jaw.rotation.x = st.jawP.a;
    for (const A of B.arms) PG.rodTick(A.mitt, dt, 5 * noise(t * 3, A.sd) * (0.3 + speed), A.sd * speed);
    if (!alive) { B.base.rotation.x = -1.45 * smooth(dead / 0.4); B.base.position.y = 0.1 * smooth(dead / 0.4); }
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { head: B.neckJ, body: B.torso, jaw: H.jaw, helmet }, deathDur: 2.2 };
};
})();

