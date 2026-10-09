/* LAB RAT (pgrat, pgrat2, pgrat4, pgratb): Puppet Purgatory, Hyperreal. A white lab rat on two legs in a lab coat: a pointed
   pink-nosed snout with whiskers, round pink ears, beady wet eyes. The physical lie: he is never safe. The fur on his crown
   catches fire (real flames licking up), he gets stapled to walls with his arms out, and in the Transmogrifier he hangs there
   empty, a coat on a peg. Clones come in half and quarter sizes when split.
   Variants: 'clone' (default), 'half', 'quarter', 'bench' (the HQ / Booth 3 assistant).
   s fields (P2/P3): squeak 0..1 (the O mouth stretching), panic 0..1 (arms up, running), burn 0..1 (hair on fire), pinned 0..1
   (stapled: arms out flat), empty 0..1 (hanging empty), split 0..1 (the squash as he splits), zap 0..1 (a Tesla jolt), demo. */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
/* the rat's face (canvas): white fur, two beady dark-red eyes with a wet shine, a pink inner mouth line */
function ratFace(g, n, R) {
  g.fillStyle = '#f0ece4'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 1500; i++) { const v = 205 + R() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 8) + ',.6)'; g.fillRect(R() * n, R() * n, 1.5, 3 + R() * 4); }
  for (const x of [0.3, 0.7]) { g.fillStyle = '#3a0a10'; g.beginPath(); g.arc(n * x, n * 0.38, n * 0.055, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(n * (x + 0.018), n * 0.36, n * 0.014, 0, 7); g.fill();
    g.fillStyle = 'rgba(200,230,255,.5)'; g.beginPath(); g.ellipse(n * x, n * 0.45, n * 0.04, n * 0.012, 0, 0, 7); g.fill(); }   /* welling up */
  g.fillStyle = '#e8a0a8'; g.fillRect(n * 0.4, n * 0.82, n * 0.2, n * 0.03);
}

HR.MODELS.pg_labrat = function (variant) {
  const V = variant === 'half' || variant === 'quarter' || variant === 'bench' ? variant : 'clone';
  const C = PG.ctx(19 + V.length);
  const root = new THREE.Group(); root.name = 'hr_pg_labrat';
  const sc = HR.joint(root, 0, 0, 0); sc.scale.setScalar(V === 'half' ? 0.7 : (V === 'quarter' ? 0.5 : 1));
  const face = PG.face(C, null, 'rat', ratFace, 0.6);
  const skin = PG.mat(C, [['pgmat_fur', 0xf2f0ea], ['mat_wool', 0xf0eee8], [null, 0xeceae2]], 0.9, { roughMap: true, repeat: [1, 1] });   /* white fur */
  const coat = PG.mat(C, [['pgmat_felt', 0xf2f2ee], ['mat_jersey', 0xf4f4f2], [null, 0xeeeeea]], 0.85, { roughMap: true, repeat: [1, 1] });
  const pink = PG.flat(C, 0xe8a0a8, 0.55), whisk = HR.flat(0xf8f8f4, { rough: 0.5 });
  const trous = PG.flat(C, 0x3a4a6a, 0.8), mouth = PG.flat(C, 0x4a1010, 0.6), flame = PG.glow(0xff8a20, 4), flame2 = PG.glow(0xffd060, 6);
  const B = PG.biped(C, sc, { hip: 0.52, thigh: 0.26, shin: 0.25, legW: 0.08, tw: 0.26, th: 0.5, td: 0.2, armU: 0.25, armF: 0.24, armW: 0.07,
    legM: trous, torsoM: coat, armM: coat, mittM: pink, shoeM: PG.flat(C, 0x2a2a2a, 0.5), shoe: [0.1, 0.06, 0.18] });
  const hem = PG.mesh(PG.cylGeo(0.17, 0.2, 0.3, 10, true), coat); hem.position.y = -0.12; B.hips.add(hem);
  const hb = HR.joint(B.neckJ, 0, 0.06, -0.16);
  const neck = PG.box(0.1, 0.07, 0.1, skin); neck.position.y = 0.03; B.neckJ.add(neck);
  const H = PG.head(C, hb, { w: 0.32, h: 0.32, d: 0.32, jh: 0.09, face, all: skin, mouth, crop: [0, 0, 1, 1], split: 0.25 });
  /* the snout: a tapered wedge forward, a pink nose, whiskers; round pink ears up top */
  const snout = PG.mesh(PG.coneGeo(0.11, 0.26, 8), skin); snout.rotation.x = Math.PI / 2; snout.scale.set(1, 1, 0.8); snout.position.set(0, 0.14, 0.44); hb.add(snout);
  const nose = PG.mesh(PG.sphereGeo(0.03, 8), pink, false); nose.position.set(0, 0.14, 0.57); hb.add(nose);
  for (const sd of [1, -1]) for (let k = 0; k < 3; k++) { const w = PG.box(0.2, 0.004, 0.004, whisk, undefined, false); w.position.set(sd * 0.12, 0.13 + (k - 1) * 0.02, 0.5); w.rotation.set(0, sd * -0.25, sd * (k - 1) * 0.15); hb.add(w); }
  for (const sd of [1, -1]) { const e = PG.mesh(PG.cylGeo(0.09, 0.09, 0.02, 14), [skin, pink, skin], false); e.rotation.x = Math.PI / 2; e.position.set(sd * 0.15, 0.36, 0.14); hb.add(e); }
  /* the crown fur that catches fire: invisible pivots, flames only */
  const tuft = [], fl = [];
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, j = HR.joint(hb, Math.cos(a) * 0.08, 0.32, 0.15 + Math.sin(a) * 0.08);
    j.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); tuft.push(j);
    const f = PG.mesh(PG.coneGeo(0.05, 0.2, 6), i % 2 ? flame : flame2, false); f.position.set(0, 0.1, 0); j.add(f); f.visible = false; fl.push(f); }
  const mats = C.mats.slice();
  const st = { ph: 0, jawP: PG.spring(), hY: 0, pf: 0 };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0, speed = alive ? clamp(s.speed || 0, 0, 1.4) : 0;
    const squeak = clamp(s.squeak || 0, 0, 1), panic = clamp(Math.max(s.panic || 0, V === 'quarter' ? 0.6 : 0), 0, 1), burn = clamp(s.burn || 0, 0, 1);
    const pinned = clamp(s.pinned || 0, 0, 1), empty = clamp(s.empty || 0, 0, 1), split = clamp(s.split || 0, 0, 1), zap = clamp(s.zap || 0, 0, 1);
    st.ph += dt * (8 + 11 * speed);
    const bob = PG.walk(B, st.ph, Math.min(1, speed), 0.75);
    B.base.position.set(zap * 0.03 * Math.sin(t * 60), bob, 0); B.base.rotation.set(0, 0, 0);
    sc.scale.y = (V === 'half' ? 0.7 : (V === 'quarter' ? 0.5 : 1)) * (1 - 0.35 * Math.sin(split * Math.PI));
    B.torso.rotation.set(-0.1 * panic + 0.15 * squeak, 0, 0);
    if (panic > 0) for (const A of B.arms) { A.sh.rotation.x = -2.8 + 0.4 * Math.sin(t * 20 + A.sd); A.sh.rotation.z = A.sd * 0.4; }
    if (pinned > 0) { for (const A of B.arms) { A.sh.rotation.z = A.sd * 1.5 * pinned; A.sh.rotation.x = 0; A.el.rotation.x = 0; } for (const L of B.legs) L.hip.rotation.z = (L.hip.position.x > 0 ? 1 : -1) * 0.25 * pinned; }
    if (empty > 0) { B.base.position.y += 0.15 * empty; for (const A of B.arms) { A.sh.rotation.x = 0.05; A.sh.rotation.z = A.sd * 0.02; } for (const L of B.legs) { L.hip.rotation.x = 0.1; L.knee.rotation.x = 0.05; } }
    if (zap > 0) for (const A of B.arms) { A.sh.rotation.z = A.sd * (0.8 + 0.4 * Math.sin(t * 50)); A.sh.rotation.x = -1 + 0.5 * Math.sin(t * 43); }
    /* the eyes are the face photo; the head: a flinch every so often, the O mouth stretching on every squeak */
    st.hY += ((alive ? clamp(s.yaw || 0, -0.9, 0.9) : 0) + 0.3 * PG.twitch(t, 11, 2.4, 4) - st.hY) * Math.min(1, dt * 7);
    B.neckJ.rotation.set(0.6 * empty + 0.1 * hurt, st.hY, 0.25 * empty);
    PG.pend(st.jawP, dt, 300, 18, Math.max(0.35 * squeak * (0.5 + 0.5 * Math.sin(t * 22)), 0.3 * panic * Math.max(0, Math.sin(t * 12)), 0.25 * hurt, 0.4 * burn, alive ? 0.05 : 0.3), 0, 0, 0.6);
    H.jaw.rotation.x = st.jawP.a; hb.scale.set(1, 1 + 0.06 * squeak * Math.sin(t * 22), 1);
    /* the crown: on fire the flames stand straight up and lick */
    for (let i = 0; i < tuft.length; i++) { const a = i / 9 * Math.PI * 2, up = 1 - burn;
      tuft[i].rotation.set(Math.sin(a) * 0.5 * up + 0.08 * noise(t * 8 + i, i) * (1 + panic), 0, -Math.cos(a) * 0.5 * up);
      fl[i].visible = burn > 0.05; if (fl[i].visible) { const k = 0.6 + 0.6 * Math.abs(noise(t * 14 + i * 1.7, i + 4)); fl[i].scale.set(k * burn, (0.8 + k) * burn, k * burn); } }
    if (!alive) { B.base.rotation.x = -1.45 * smooth(dead / 0.35); B.base.position.y = 0.1 * smooth(dead / 0.35); }
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { head: B.neckJ, body: B.torso, jaw: H.jaw, snout }, deathDur: 2 };
};
})();

