/* THIEVING FROG (pgfrog): Puppet Purgatory, Hyperreal (bible 9.2, 17 #13). A small, wet green felt frog (a painted felt face on
   the frog felt), two cube eyes, a pink tongue. The physical lie: it is wet. Felt should never be this glossy, and it
   glistens as it breathes; the tongue snaps out, takes your stack and the frog carries it off in its mouth.
   s fields (P3): tongue 0..1 (the snatch), aim [x,y,z] world (tC_purg -> s.amx..), carry 0/1 (a stolen stack in its mouth),
   hop 0..1 (airborne: legs stretched), pinned 0..1 (stapled: splayed flat). */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth;
function frogFace(g, n, R) {
  PG.paintFelt(g, n, R, '#3e8e2a', false);
  g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(R() * n, R() * n, 2 + R() * 4, 0, 7); g.fill(); }   /* wet sheen */
  g.fillStyle = '#1a3a10'; g.fillRect(n * 0.08, n * 0.72, n * 0.84, n * 0.04);
}

HR.MODELS.pg_frog = function () {
  const C = PG.ctx(13);
  const root = new THREE.Group(); root.name = 'hr_pg_frog';
  const felt = PG.mat(C, [['pgmat_frogfelt', 0xc8e0b8], ['pgmat_felt', 0x3e8e2a], ['mat_jersey', 0x3e8e2a], [null, 0x3a8a28]], 0.35, { roughMap: false, repeat: [1, 1] });
  const face = PG.face(C, null, 'frog', frogFace, 0.3);
  const tongueM = PG.mat(C, [['pgmat_tongue', 0xffffff], [null, 0xf090b0]], 0.25, { roughMap: true, repeat: [1, 1] });
  const eyeM = PG.flat(C, 0xf0ead0, 0.2), pupM = PG.dark(0x050505), mouth = PG.flat(C, 0x4a1020, 0.4), loot = PG.flat(C, 0xc8a050, 0.6);
  const body = HR.joint(root, 0, 0.14, 0);
  const bodyM = PG.box(0.3, 0.2, 0.34, felt, PG.tile(0.3, 0.2, 0.34, 0.2, 0.2, 2)); body.add(bodyM);
  const hb = HR.joint(body, 0, 0.04, 0.05);
  const H = PG.head(C, hb, { w: 0.32, h: 0.18, d: 0.26, jh: 0.06, face, all: felt, mouth, crop: [0, 0, 1, 1], split: 0.3 });
  const eyes = [1, -1].map(sd => { const g = HR.joint(hb, sd * 0.09, 0.2, 0.16); HR.at(g, PG.box(0.08, 0.08, 0.08, eyeM), 0, 0, 0); const p = PG.box(0.04, 0.05, 0.01, pupM, undefined, false); p.position.z = 0.042; g.add(p); return { g, p }; });
  const legs = [[0.13, 0.12, 1], [-0.13, 0.12, 1], [0.15, -0.14, 0], [-0.15, -0.14, 0]].map(([x, z, fr]) => { const j = HR.joint(body, x, -0.08, z);
    HR.at(j, PG.box(0.06, fr ? 0.1 : 0.06, fr ? 0.06 : 0.18, felt), 0, fr ? -0.05 : -0.03, fr ? 0 : -0.06);
    HR.at(j, PG.box(0.1, 0.02, 0.1, felt), 0, fr ? -0.1 : -0.06, fr ? 0.03 : -0.13); return { j, fr }; });
  const tJ = HR.joint(hb, 0, 0.04, 0.26); tJ.rotation.order = 'YXZ';
  const tg = PG.box(0.05, 0.02, 1, tongueM); tg.position.z = 0.5; tJ.add(tg); const tip = PG.box(0.08, 0.04, 0.07, tongueM); tJ.add(tip); tJ.visible = false;
  const stack = PG.box(0.1, 0.1, 0.1, loot); stack.position.set(0, 0.03, 0.27); hb.add(stack); stack.visible = false;
  const mats = C.mats.slice();
  const st = { ph: 0, jawP: PG.spring(), br: 0 };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, speed = alive ? clamp(s.speed || 0, 0, 1.4) : 0, hurt = s.hurt || 0;
    const tongue = clamp(s.tongue || 0, 0, 1), hop = clamp(Math.max(s.hop || 0, speed > 0.2 ? Math.max(0, Math.sin(t * 9)) : 0), 0, 1), pinned = clamp(s.pinned || 0, 0, 1);
    stack.visible = (s.carry || 0) > 0.5;
    st.br += dt * 6; const br = 0.5 + 0.5 * Math.sin(st.br);
    bodyM.scale.set(1 + 0.05 * br, 1 + 0.08 * br * (1 - pinned), 1);
    felt.roughness = 0.3 + 0.15 * (1 - br);                      /* glistening as it breathes */
    body.position.y = 0.14 + 0.35 * hop - 0.06 * pinned; body.rotation.x = -0.4 * hop;
    for (const L of legs) { L.j.rotation.x = L.fr ? -0.6 * hop : 1.2 * hop; L.j.rotation.z = (L.j.position.x > 0 ? 1 : -1) * 1.2 * pinned; }
    for (const E of eyes) E.p.position.x = 0.012 * Math.sin(t * 2 + E.g.position.x * 30);
    PG.pend(st.jawP, dt, 300, 18, Math.max(tongue > 0 ? 0.4 : 0, 0.3 * hurt, alive ? 0 : 0.3, stack.visible ? 0.15 : 0), 0, 0, 0.6); H.jaw.rotation.x = st.jawP.a;
    tJ.visible = tongue > 0.01;
    if (tJ.visible) { let len = 4 * tongue, yaw = 0, pit = 0;
      if (s.amx !== undefined) { const dx = s.amx, dy = (s.amy || 0) - 0.2, dz = s.amz || 0, d = Math.hypot(dx, dy, dz); len = Math.min(d, 5) * tongue; yaw = Math.atan2(dx, dz); pit = -Math.atan2(dy, Math.hypot(dx, dz)); }
      tJ.rotation.set(clamp(pit, -1.2, 1.2), clamp(yaw, -1.4, 1.4), 0); tg.scale.z = Math.max(0.01, len); tg.position.z = len / 2; tip.position.z = len; }
    if (!alive) { root.rotation.z = Math.PI * smooth(dead / 0.4); root.position.y = 0.3 * smooth(dead / 0.4); }
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { head: hb, body, jaw: H.jaw, tongue: tJ }, deathDur: 1.6 };
};
})();

