/* THE COOK (pgcook, NPC): Puppet Purgatory, Hyperreal. A felt crocodile in a white cook's jacket, a short paper cap and an
   apron (pgent_apron): a long green snout lined with teeth, yellow eyes up top, and real pale human hands (pgent_hand) coming
   out of his sleeves: wrong on purpose. The physical lie: when he leans over his counter too far, the same pale arm that
   wears him yanks him back down by the apron strings.
   s fields (P3): chop 0..1 (the cleaver), stir 0..1 (the ladle), vault 0..1 (over the counter), yank 0..1 (dragged back down by
   the apron), talk 0..1 (shouting orders: the snout snaps), tool 'cleaver'|'ladle'|'none' (default both). */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
const HC = { back: [0.32, 0.04, 0.95, 0.5], fing: [0.43, 0.52, 0.88, 0.99], thumb: [0.07, 0.28, 0.32, 0.52] };
/* crocodile felt (canvas): green with darker scale rows; the face adds two yellow eyes with slit pupils, high up */
function crocSkin(g, n, R) {
  PG.paintFelt(g, n, R, '#4f7a34', false);
  for (let y = 0; y < n; y += n / 10) for (let x = (y / (n / 10)) % 2 ? n / 16 : 0; x < n; x += n / 8) {
    g.fillStyle = 'rgba(28,48,18,' + (0.25 + R() * 0.2) + ')'; g.beginPath(); g.ellipse(x, y, n / 18, n / 26, 0, 0, 7); g.fill(); }
}
function crocFace(g, n, R) {
  crocSkin(g, n, R);
  for (const x of [0.3, 0.7]) { g.fillStyle = '#2e4a1e'; g.beginPath(); g.ellipse(n * x, n * 0.24, n * 0.12, n * 0.1, 0, 0, 7); g.fill();
    g.fillStyle = '#d8b030'; g.beginPath(); g.ellipse(n * x, n * 0.25, n * 0.08, n * 0.065, 0, 0, 7); g.fill();
    g.fillStyle = '#100c04'; g.beginPath(); g.ellipse(n * x, n * 0.25, n * 0.014, n * 0.055, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(n * (x + 0.025), n * 0.215, 3, 3); }
}
function realHand(C, handM, nail) {
  return function (C2, wr, sd) {
    const palm = PG.box(0.1, 0.12, 0.05, handM, { pz: HC.back, nz: HC.back, px: HC.back, nx: HC.back, py: HC.back, ny: HC.back }); palm.position.y = -0.06; wr.add(palm);
    const fg = HR.joint(wr, 0, -0.12, 0);
    HR.at(fg, PG.box(0.095, 0.09, 0.045, handM, { pz: HC.fing, nz: HC.fing, px: HC.fing, nx: HC.fing, py: HC.fing, ny: HC.fing }), 0, -0.045, 0);
    const th = HR.joint(wr, sd * 0.05, -0.04, 0.02); HR.at(th, PG.box(0.03, 0.07, 0.03, handM, { pz: HC.thumb, nz: HC.thumb, px: HC.thumb, nx: HC.thumb }), 0, -0.03, 0); th.rotation.z = sd * 0.5;
    return { wr, th, fg, rp: HR.joint(wr, 0, 0, 0), sw: PG.spring(), sz: PG.spring() };
  };
}

HR.MODELS.pg_cook = function () {
  const C = PG.ctx(23);
  const root = new THREE.Group(); root.name = 'hr_pg_cook';
  const face = PG.face(C, null, 'crocface', crocFace, 0.7), felt = PG.face(C, null, 'crocskin', crocSkin, 0.75);
  const white = PG.mat(C, [['pgmat_felt', 0xf4f2ec], ['mat_jersey', 0xf4f2ec], [null, 0xf0eee8]], 0.85, { roughMap: true, repeat: [1, 1] });
  const apron = PG.mat(C, [['pgent_apron', 0xffffff], ['mat_burlap', 0xe8e0d0], [null, 0xe0d8c8]], 0.85, {});
  const handM = PG.mat(C, [['pgent_hand', 0xf0e0d8], ['skin_arm', 0xf0c8b0], [null, 0xf0c8b0]], 0.5, { roughMap: false, normalScale: 0.7 });
  const trous = PG.mat(C, [['pgmat_felt', 0x6a6a72], ['mat_jersey', 0x5a5a62], [null, 0x5a5a62]], 0.9, { roughMap: true, repeat: [1, 1] });
  const steel = HR.flat(0xc0c4c8, { rough: 0.25, metal: 0.9 }), wood = PG.flat(C, 0x6a4020, 0.6), mouth = PG.flat(C, 0x4a1414, 0.6);
  const tooth = HR.flat(0xf0ead8, { rough: 0.4 }), nostril = PG.dark(0x0c1408);
  const B = PG.biped(C, root, { hip: 0.62, thigh: 0.3, shin: 0.3, legW: 0.13, tw: 0.42, th: 0.46, td: 0.26, armU: 0.26, armF: 0.24, armW: 0.1,
    legM: trous, torsoM: white, armM: white, shoeM: PG.flat(C, 0x1a1a1a, 0.5), hand: realHand(C, handM) });
  const ap = PG.box(0.4, 0.62, 0.02, apron, { pz: [0.1, 0, 0.9, 1], nz: [0.1, 0, 0.9, 1] }); ap.position.set(0, 0.12, 0.14); B.torso.add(ap);
  const strings = PG.box(0.44, 0.02, 0.28, apron); strings.position.set(0, 0.3, 0); B.torso.add(strings);
  const hb = HR.joint(B.neckJ, 0, 0.04, -0.23);
  const H = PG.head(C, hb, { w: 0.46, h: 0.46, d: 0.44, jh: 0.12, face, all: felt, mouth, crop: [0, 0, 1, 1], split: 0.24 });
  /* the snout: an upper half on the head, a lower half on the jaw, both lined with teeth; nostrils on the tip */
  const snU = PG.box(0.34, 0.1, 0.4, felt); snU.position.set(0, 0.17, 0.62); hb.add(snU);
  for (const sd of [1, -1]) { const ns = PG.mesh(PG.sphereGeo(0.022, 6), nostril, false); ns.position.set(sd * 0.06, 0.225, 0.8); hb.add(ns); }
  const snL = PG.box(0.32, 0.07, 0.38, felt); snL.position.set(0, -0.035, 0.63); H.jaw.add(snL);
  for (let i = 0; i < 7; i++) for (const sd of [1, -1]) {
    const up = PG.mesh(PG.coneGeo(0.016, 0.05, 4), tooth, false); up.rotation.x = Math.PI; up.position.set(sd * 0.155, 0.105, 0.47 + i * 0.05); hb.add(up);
    const lo = PG.mesh(PG.coneGeo(0.014, 0.045, 4), tooth, false); lo.position.set(sd * 0.145, 0.02, 0.49 + i * 0.05); H.jaw.add(lo); }
  /* a short folded paper cap */
  const hat = HR.joint(hb, 0, 0.46, 0.22);
  const cap = PG.box(0.36, 0.11, 0.24, white); cap.position.y = 0.05; hat.add(cap);
  const crease = PG.box(0.37, 0.025, 0.02, PG.flat(C, 0xd8d6d0, 0.8), undefined, false); crease.position.set(0, 0.11, 0); hat.add(crease);
  /* the cleaver (right) and the ladle (left) */
  const clv = HR.joint(B.arms[0].wr, 0, -0.16, 0.04); HR.at(clv, PG.box(0.03, 0.12, 0.03, wood), 0, 0, 0); HR.at(clv, PG.box(0.02, 0.16, 0.2, steel), 0, -0.12, 0.08);
  const ldl = HR.joint(B.arms[1].wr, 0, -0.16, 0.04); HR.at(ldl, PG.mesh(PG.cylGeo(0.012, 0.012, 0.5, 6), steel, false), 0, -0.2, 0); HR.at(ldl, PG.mesh(PG.sphereGeo(0.07, 10), steel), 0, -0.46, 0.02);
  /* the pale arm that yanks him (only shows while it does) */
  const yankArm = PG.arm(C, root, { l1: 1.2, l2: 1.1, w: 0.16, skin: handM }); yankArm.root.visible = false;
  const mats = C.mats.slice();
  const st = { ph: 0, jawP: PG.spring(), hY: 0, stP: PG.spring() };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, speed = alive ? clamp(s.speed || 0, 0, 1.3) : 0;
    const chop = clamp(s.chop || 0, 0, 1), stir = clamp(s.stir || 0, 0, 1), vault = clamp(s.vault || 0, 0, 1), yank = clamp(s.yank || 0, 0, 1), talk = clamp(s.talk === undefined ? 0.4 : s.talk, 0, 1);
    clv.visible = s.tool !== 'ladle' && s.tool !== 'none'; ldl.visible = s.tool !== 'cleaver' && s.tool !== 'none';
    st.ph += dt * (7 + 8 * speed);
    const bob = PG.walk(B, st.ph, Math.min(1, speed), 0.6);
    B.base.position.set(0, bob + 0.5 * Math.sin(vault * Math.PI), 0); B.base.rotation.set(-0.5 * vault + 0.7 * yank, 0, 0); B.hips.position.y = 0.62 - 0.25 * yank;
    const [R, L] = B.arms;
    if (chop > 0) { const c = Math.sin(t * 14) * 0.5 + 0.5; R.sh.rotation.x = -1.2 - 1.2 * c * chop; R.el.rotation.x = -0.6 * c; }
    if (stir > 0) { L.sh.rotation.x = -0.9; L.sh.rotation.z = -0.25 + 0.25 * Math.sin(t * 6); L.el.rotation.x = -0.8; }
    if (vault > 0) for (const A of B.arms) { A.sh.rotation.x = -1.4; A.el.rotation.x = 0; }
    if (yank > 0) { for (const A of B.arms) { A.sh.rotation.x = -2.6 + 0.4 * Math.sin(t * 20 + A.sd); A.sh.rotation.z = A.sd * 0.6; } }
    yankArm.root.visible = yank > 0.05;
    if (yankArm.root.visible) yankArm.solve(0, -1.4, -0.9, 0, 0.75 - 0.25 * yank, -0.18, 0, -0.3, -1);
    st.hY += ((alive ? clamp(s.yaw || 0, -0.9, 0.9) : 0) - st.hY) * Math.min(1, dt * 4);
    B.neckJ.rotation.set(0.1 * Math.sin(t * 3) * talk, st.hY + 0.2 * Math.sin(t * 2.2) * talk, 0.12 * Math.sin(t * 4.1) * talk);
    PG.pend(st.jawP, dt, 260, 16, 0.22 * talk * Math.max(0, Math.sin(t * 13 + Math.sin(t * 3))), 0, 0, 0.5); H.jaw.rotation.x = st.jawP.a;
    PG.pend(st.stP, dt, 30, 3, 0, -speed * 6 * Math.cos(st.ph), -0.6, 0.6); hat.rotation.x = st.stP.a * 0.15;
    if (!alive) { B.base.rotation.x = -1.4 * smooth(dead / 0.4); B.base.position.y = 0.15 * smooth(dead / 0.4); }
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { head: B.neckJ, body: B.torso, jaw: H.jaw, aR: B.arms[0].wr, aL: B.arms[1].wr }, deathDur: 2.4 };
};
})();

