/* THE PIGS (pgtoss, pgpiglet, pgpig, pghog): Puppet Purgatory, Hyperreal.
   The Pig's ammunition are real piglets (pgface_piglet). The physical lie: they breathe, hard, flanks heaving, and caught in a
   Pig Mitt they kick all four legs at once. A Fallen Piglet is just a dazed piglet. Chorus Pigs wear top hats for the
   kickline. The Hero Hog is a boar on two legs: square jaw, two tusks, a short red cape, blocking the landing like a hero.
   Variants: 'toss' (thrown, default), 'piglet' (fallen), 'chorus', 'hog'.
   s fields: roll 0..1 (curled into a ball; a Rolling Hog), spin (radians, optional: the roll angle), squeal 0..1, held 0/1
   (kicking in a mitt), dazed 0..1, hat 0/1 (chorus top hat), kick 0..1 (kickline leg up), shove 0..1 (the Hero Hog). */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
const F = { split: 0.24, crop: [0.04, 0.02, 0.96, 0.96] };      /* pgface_piglet: mouth open v .05-.27, eyes v .65, snout v .3-.56 */
function pigFace(g, n, R) {
  g.fillStyle = '#e8b4a4'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(255,240,230,' + (0.08 + R() * 0.1) + ')'; g.fillRect(R() * n, R() * n * 0.6, 1, 3 + R() * 4); }
  g.fillStyle = '#f0a0a0'; g.beginPath(); g.ellipse(n * 0.5, n * 0.58, n * 0.2, n * 0.14, 0, 0, 7); g.fill();
  g.fillStyle = '#5a2020'; g.beginPath(); g.ellipse(n * 0.43, n * 0.6, n * 0.03, n * 0.05, 0, 0, 7); g.ellipse(n * 0.57, n * 0.6, n * 0.03, n * 0.05, 0, 0, 7); g.fill();
  g.fillStyle = '#101010'; g.beginPath(); g.arc(n * 0.2, n * 0.35, n * 0.05, 0, 7); g.arc(n * 0.8, n * 0.35, n * 0.05, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.fillRect(n * 0.18, n * 0.32, 4, 4); g.fillRect(n * 0.78, n * 0.32, 4, 4);
  g.fillStyle = '#5a1a1a'; g.beginPath(); g.ellipse(n * 0.5, n * 0.86, n * 0.16, n * 0.08, 0, 0, 7); g.fill();
}

HR.MODELS.pg_pig = function (variant) {
  const V = variant === 'piglet' || variant === 'chorus' || variant === 'hog' ? variant : 'toss';
  const C = PG.ctx(V.length * 17 + 3);
  const root = new THREE.Group(); root.name = 'hr_pg_pig';
  const hide = PG.mat(C, [['pig_hide', 0xe8cfc8], ['mat_skin', 0xe0a8a0], [null, 0xe0a8a0]], 0.6, { roughMap: false, normalScale: 0.6, repeat: [1, 1] });
  const face = PG.face(C, 'pgface_piglet', 'piglet', pigFace, 0.55);
  const trot = PG.flat(C, 0x3a2a24, 0.5), mouth = PG.flat(C, 0x6a2a2a, 0.5);
  const boar = PG.mat(C, [['pig_hide', 0xb08878], ['mat_skin', 0xa07868], [null, 0xa07868]], 0.65, { roughMap: false, normalScale: 0.8, repeat: [1, 1] });   /* darker, bristlier */
  const cape = PG.mat(C, [['pgmat_felt', 0xb02a24], ['mat_jersey', 0xa82822], [null, 0xa82822]], 0.85, { roughMap: true, repeat: [1, 1] });
  const tuskM = HR.flat(0xece2c8, { rough: 0.35 });
  const hatM = PG.flat(C, 0x101012, 0.45);
  const upright = V === 'hog';
  const fall = HR.joint(root, 0, 0, 0);
  const body = HR.joint(fall, 0, upright ? 0.62 : 0.3, 0);       /* body centre */
  let bodyM, legs = [], head, arms = [];
  if (!upright) {
    bodyM = PG.box(0.46, 0.38, 0.66, hide, PG.tile(0.46, 0.38, 0.66, 0.1, 0.2, 1.8)); body.add(bodyM);
    [[0.15, 0.24], [-0.15, 0.24], [0.15, -0.24], [-0.15, -0.24]].forEach((p, i) => {
      const j = HR.joint(body, p[0], -0.12, p[1]); HR.at(j, PG.box(0.12, 0.16, 0.12, hide, PG.tile(0.12, 0.16, 0.12, 0.2 * i, 0.4, 1.8)), 0, -0.08, 0);
      HR.at(j, PG.box(0.125, 0.04, 0.125, trot), 0, -0.17, 0); legs.push(j); });
    head = HR.joint(body, 0, 0.02, 0.33);
  } else {
    /* the Hero Hog: a barrel-chested boar on two legs, trotters for hands and feet, a short red cape */
    bodyM = PG.box(0.5, 0.56, 0.34, boar, PG.tile(0.5, 0.56, 0.34, 0.2, 0.3, 1.8)); body.add(bodyM);
    [[0.13], [-0.13]].forEach((p, i) => { const j = HR.joint(body, p[0], -0.28, 0); HR.at(j, PG.box(0.16, 0.34, 0.18, boar, PG.tile(0.16, 0.34, 0.18, 0.3 * i, 0.6, 1.8)), 0, -0.17, 0);
      HR.at(j, PG.box(0.17, 0.07, 0.2, trot), 0, -0.37, 0.02); legs.push(j); });
    [1, -1].forEach(sd => { const j = HR.joint(body, sd * 0.3, 0.2, 0); HR.at(j, PG.box(0.13, 0.36, 0.13, boar, PG.tile(0.13, 0.36, 0.13, 0.5, 0.1, 1.8)), 0, -0.18, 0);
      HR.at(j, PG.box(0.12, 0.08, 0.12, trot), 0, -0.4, 0); arms.push(j); });
    head = HR.joint(body, 0, 0.3, 0.02);
  }
  /* head: the piglet photo split at the mouth; the hog's jaw is squarer (a wider, deeper jaw box) */
  const HW = upright ? 0.44 : 0.4, HH = 0.36, HD = 0.34, JH = upright ? 0.11 : 0.08;
  const hb = HR.joint(head, 0, upright ? 0 : -0.16, upright ? -HD / 2 : -0.02);
  const H = PG.head(C, hb, { w: HW, h: HH, d: HD, jh: JH, face, all: hide, mouth, crop: F.crop, split: F.split });
  /* ears: thin flaps */
  const ears = [1, -1].map(sd => { const j = HR.joint(hb, sd * HW * 0.42, HH - 0.02, HD * 0.55); HR.at(j, PG.box(0.1, 0.11, 0.025, hide), 0, 0.05, 0); j.rotation.set(-0.4, 0, sd * -0.5); return j; });
  /* the hog's tusks (curving up out of the jaw corners) and his cape (hung from the shoulders, swinging behind him) */
  let capeJ = null;
  const capeP = PG.spring();
  if (upright) {
    for (const sd of [1, -1]) { const tk = PG.mesh(PG.coneGeo(0.025, 0.11, 6), tuskM, false);
      tk.position.set(sd * HW * 0.36, 0.03, HD + 0.012); tk.rotation.set(0.35, 0, sd * -0.35); H.jaw.add(tk); }
    capeJ = HR.joint(body, 0, 0.27, -0.18);
    HR.at(capeJ, PG.box(0.56, 0.5, 0.025, cape, PG.tile(0.56, 0.5, 0.025, 0.3, 0.4)), 0, -0.25, 0);
    HR.at(capeJ, PG.box(0.6, 0.05, 0.06, cape), 0, 0, 0.02);
  }
  /* chorus top hat */
  const hat = HR.joint(hb, 0, HH, HD * 0.45); const hatBox = PG.mesh(PG.cylGeo(0.12, 0.12, 0.24, 14), hatM); hatBox.position.y = 0.12; hat.add(hatBox);
  const brim = PG.mesh(PG.cylGeo(0.2, 0.2, 0.02, 16), hatM); hat.add(brim); hat.visible = false;
  /* curly tail */
  const tail = HR.joint(body, 0, upright ? -0.2 : 0.12, upright ? -0.17 : -0.33);
  HR.at(tail, PG.box(0.04, 0.09, 0.04, hide), 0, 0.045, 0); const tail2 = HR.joint(tail, 0, 0.09, 0); HR.at(tail2, PG.box(0.04, 0.08, 0.04, hide), 0, 0.04, 0);

  const mats = [hide, face, trot, mouth, boar, cape, hatM];
  const st = { ph: 0, br: 0, jawP: PG.spring(), sq: 0, sp: 0, tl: PG.spring(), hY: 0, hP: 0 };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1);
    PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0, seed = s.seed || 1;
    const speed = alive ? clamp(s.speed || 0, 0, 1.3) : 0, roll = alive ? clamp(s.roll || 0, 0, 1) : 0, held = alive && s.held > 0.5;
    const squeal = clamp(Math.max(s.squeal || 0, held ? 0.8 : 0, hurt), 0, 1), dazed = clamp(s.dazed || 0, 0, 1);
    hat.visible = V === 'chorus' && (s.hat || 0) > 0.5;
    /* breathing: hard and fast, the flanks heave (the lie) */
    st.br += dt * (5 + 6 * squeal + 3 * speed + (held ? 6 : 0));
    const breath = 0.5 + 0.5 * Math.sin(st.br);
    bodyM.scale.set(1 + 0.035 * breath, 1 + 0.05 * breath, 1);
    /* walk / trot / kick */
    st.ph += dt * (9 + 10 * speed) * (alive ? 1 : 0);
    const sw = Math.sin(st.ph) * 0.6 * Math.min(1, speed);
    if (!upright) {
      for (let i = 0; i < 4; i++) { const diag = (i === 0 || i === 3) ? 1 : -1;
        let a = sw * diag;
        if (held) a = 0.9 * Math.sin(t * 22 + i * 1.7);                       /* all four legs kicking */
        if (roll > 0) a = a * (1 - roll) + (i < 2 ? 1.3 : -1.3) * roll;       /* tucked into a ball */
        if (!alive) a = (i < 2 ? 0.2 : -0.2) + Math.sin(t * 14 + i) * 0.3 * (1 - dead);
        legs[i].rotation.x = a; }
      if (V === 'chorus') { const k = clamp(s.kick || 0, 0, 1); legs[0].rotation.x -= 1.4 * k; body.rotation.x = -0.35 * k; }
    } else {
      for (let i = 0; i < 2; i++) legs[i].rotation.x = sw * (i ? 1 : -1);
      const sh = clamp(s.shove || 0, 0, 1);
      arms[0].rotation.x = -1.4 * sh - sw * 0.5; arms[1].rotation.x = -1.4 * sh + sw * 0.5;
      body.rotation.x = 0.15 * sh;
      PG.pend(capeP, dt, 40, 5, 0.25 * Math.min(1, speed) + 0.6 * sh, 4 * sw, -0.2, 1.2); capeJ.rotation.x = capeP.a;
    }
    /* roll: curl and tumble (P4 moves the body; s.spin may set the angle) */
    st.sp = s.spin !== undefined ? s.spin : st.sp + dt * roll * 14;
    fall.rotation.x = roll > 0.05 ? st.sp : 0;
    fall.position.y = roll * 0.08;
    body.scale.setScalar(1 - 0.12 * roll);
    /* squeal: jaw wide, head shakes; dazed: head lolls in a circle */
    const ty = alive ? clamp(s.yaw || 0, -0.8, 0.8) : 0, tp = alive ? clamp(s.pitch || 0, -0.5, 0.5) : 0;
    st.hY += (ty - st.hY) * Math.min(1, dt * 5); st.hP += (tp - st.hP) * Math.min(1, dt * 5);
    head.rotation.set(st.hP + 0.2 * dazed * Math.sin(t * 3) + (held ? 0.2 * Math.sin(t * 17) : 0), st.hY + 0.12 * squeal * Math.sin(t * 31) + 0.3 * dazed * Math.cos(t * 3), 0);
    PG.pend(st.jawP, dt, 300, 20, Math.max(0.5 * squeal, 0.06 * breath, alive ? 0 : 0.3), 0, 0, 0.7);
    H.jaw.rotation.x = st.jawP.a;
    for (let i = 0; i < 2; i++) ears[i].rotation.x = -0.4 - 0.5 * squeal * (0.6 + 0.4 * Math.sin(t * 25 + i));
    PG.pend(st.tl, dt, 50, 2, 0, speed * 20 * Math.sin(st.ph * 2) + (held ? 30 * noise(t * 8, seed) : 0), -1, 1);
    tail.rotation.set(-0.7, 0, st.tl.a); tail2.rotation.set(1.6, 0, 0.6 + st.tl.a * 0.5);
    /* death: onto its side, legs stiff */
    if (!alive) { fall.rotation.z = Math.PI / 2 * smooth(dead / 0.3); fall.position.y = upright ? 0.15 * smooth(dead / 0.3) : 0.2 * smooth(dead / 0.3); }
    else fall.rotation.z = 0.05 * squeal * Math.sin(t * 40);
  }
  PG.packGroups(root);
  const handles = { head, body, jaw: H.jaw };
  if (capeJ) handles.cape = capeJ;
  return { root, update, mats, handles, deathDur: 2.2 };
};
})();

