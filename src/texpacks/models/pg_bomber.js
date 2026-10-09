/* THE DEMOLITIONIST (pgbomber): Puppet Purgatory headliner 1, Hyperreal. Authored at 1/1.5 scale (spawnMob scales bosses
   1.5/1.4/1.5). A felt puppet in a padded olive bomb-disposal suit: a quilted helmet with a domed crown, a dark glossy visor
   slit and a band of hazard stripes, a high padded collar, heavy gloves, a scorched chest plate. Nobody has seen his face.
   The physical lie: he laughs with no sound. On every wind-up his shoulders heave and his chin plate drops and rattles.
   s fields (P4 writes e.hrS): plunge 0..1 (wind-up on a station: handle up, shoulders heaving; 1 = the slam), seated 0/1 (on
   the Big One), splice 0/1 (hands and knees, finger tracing the wire), panic 0/1 (a bundle on his back: arms flapping), drop
   0/1 (through the trapdoor, still cackling), blown 0/1 (launched, spread-eagled, spinning), dazed 0..1, satchel 0/1 (P2),
   noPlunger 0/1 (hide the hand-held T-handle while he works a station's), match 0..1 (striking the match on the kill), phase. */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
const F = { crop: [0, 0, 1, 1], split: 0.25 };                  /* the helmet front: chin plate below v .25 */
/* the helmet's quilted front (canvas): olive padding with diamond stitching, soot, the visor recess, a strip of hazard stripes */
function helmetFace(g, n, R) {
  PG.paintFelt(g, n, R, '#5d6638', false);
  g.strokeStyle = 'rgba(30,34,16,.55)'; g.lineWidth = 2;
  for (let i = -n; i < 2 * n; i += n / 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + n, n); g.stroke(); g.beginPath(); g.moveTo(i, n); g.lineTo(i + n, 0); g.stroke(); }
  for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(12,10,8,' + (0.04 + R() * 0.1) + ')'; g.fillRect(R() * n, R() * n * 0.4 + n * 0.6, 3, 3); }
  g.fillStyle = '#121410'; g.fillRect(n * 0.14, n * 0.36, n * 0.72, n * 0.2);                     /* the visor recess (the glass is a mesh) */
  g.fillStyle = '#e8c020'; g.fillRect(0, n * 0.12, n, n * 0.12);                                    /* hazard band across the brow */
  g.fillStyle = '#141414';
  for (let x = -n * 0.2; x < n * 1.2; x += n * 0.16) { g.beginPath(); g.moveTo(x, n * 0.24); g.lineTo(x + n * 0.08, n * 0.24); g.lineTo(x + n * 0.2, n * 0.12); g.lineTo(x + n * 0.12, n * 0.12); g.fill(); }
  g.fillStyle = '#3a4024'; g.fillRect(n * 0.3, n * 0.8, n * 0.4, n * 0.05);                         /* chin-plate vent */
}
function stripes(g, n) {
  g.fillStyle = '#e8c020'; g.fillRect(0, 0, n, n); g.fillStyle = '#141414';
  for (let x = -n; x < 2 * n; x += n / 4) { g.beginPath(); g.moveTo(x, n); g.lineTo(x + n / 8, n); g.lineTo(x + n / 8 + n / 2, 0); g.lineTo(x + n / 2, 0); g.fill(); }
}

HR.MODELS.pg_bomber = function () {
  const C = PG.ctx(91);
  const root = new THREE.Group(); root.name = 'hr_pg_bomber';
  const face = PG.face(C, null, 'bomberhelm', helmetFace, 0.8);
  const helmM = PG.mat(C, [['pgmat_felt', 0x6a7440], ['mat_jersey', 0x5d6638], [null, 0x5d6638]], 0.9, { roughMap: true, repeat: [1, 1] });   /* quilted olive padding */
  const visorM = HR.flat(0x0b0f12, { rough: 0.06, metal: 0.5 }).clone(), hazard = PG.face(C, null, 'bomberstripes', stripes, 0.7);
  const jacket = PG.mat(C, [['pgmat_felt', 0x5f6a3c], ['mat_jersey', 0x55603a], [null, 0x55603a]], 0.95, { roughMap: true, repeat: [1, 1] });
  const trous = PG.mat(C, [['pgmat_felt', 0x4e5632], ['mat_jersey', 0x4a5230], [null, 0x4a5230]], 0.95, { roughMap: true, repeat: [1, 1] });
  const mitt = PG.mat(C, [['pgmat_felt', 0x34362a], ['mat_jersey', 0x303226], [null, 0x303226]], 0.9, { roughMap: true, repeat: [1, 1] });
  const shoe = PG.flat(C, 0x1a1210, 0.6), wood = PG.mat(C, [['mat_burlap', 0x8a5a30], [null, 0x7a4a24]], 0.7, { roughMap: true });
  const brass = HR.flat(0xb08a3a, { rough: 0.35, metal: 0.8 }), mouth = PG.flat(C, 0x3a1010, 0.6);
  const satch = PG.mat(C, [['pgent_satchel', 0xffffff], ['mat_burlap', 0xb08a60], [null, 0xa07a50]], 0.8, { roughMap: false });
  const scorch = PG.dark(0x0d0a08);
  const B = PG.biped(C, root, { hip: 0.44, thigh: 0.22, shin: 0.21, legW: 0.11, tw: 0.36, th: 0.36, td: 0.22, armU: 0.2, armF: 0.19, armW: 0.085,
    legM: trous, torsoM: jacket, armM: jacket, shoeM: shoe, mittM: mitt, mittS: 1.1, shoe: [0.13, 0.07, 0.22] });
  /* suit details: a padded chest plate with a scorch mark, a hazard stripe across it */
  const plate = PG.box(0.3, 0.24, 0.04, helmM); plate.position.set(0, 0.2, 0.125); B.torso.add(plate);
  const band = PG.box(0.3, 0.035, 0.012, hazard, undefined, false); band.position.set(0, 0.29, 0.148); B.torso.add(band);
  const sc = PG.box(0.12, 0.1, 0.01, scorch, undefined, false); sc.position.set(-0.08, 0.13, 0.146); B.torso.add(sc);
  /* head: the padded collar, then the helmet (quilted front split at the chin plate), its dome and the visor glass */
  const collarM = PG.mesh(PG.cylGeo(0.19, 0.21, 0.12, 12), helmM); collarM.position.y = 0.04; B.neckJ.add(collarM);
  const hb = HR.joint(B.neckJ, 0, 0.06, -0.19);
  const H = PG.head(C, hb, { w: 0.4, h: 0.44, d: 0.38, jh: 0.11, face, all: helmM, mouth, crop: F.crop, split: F.split });
  const helmet = HR.joint(hb, 0, 0, 0);
  const dome = PG.mesh(PG.sphereGeo(0.25, 18), helmM); dome.scale.set(0.98, 0.52, 0.94); dome.position.set(0, 0.43, 0.19); helmet.add(dome);
  const visor = PG.box(0.29, 0.085, 0.012, visorM, undefined, false); visor.position.set(0, 0.24, 0.386); helmet.add(visor);
  const ring = PG.box(0.41, 0.045, 0.39, hazard); ring.position.set(0, 0.395, 0.19); helmet.add(ring);   /* the striped band round the crown */
  /* the hand-held T-handle detonator (his own) */
  const det = HR.joint(B.base, 0, 0.42, 0.28);
  HR.at(det, PG.box(0.2, 0.14, 0.15, wood), 0, 0.07, 0);
  const shaft = HR.joint(det, 0, 0.14, 0);
  HR.at(shaft, PG.mesh(PG.cylGeo(0.012, 0.012, 0.2, 6), brass, false), 0, 0.1, 0);
  HR.at(shaft, PG.box(0.24, 0.035, 0.035, wood), 0, 0.2, 0);
  const sat = PG.box(0.3, 0.22, 0.12, satch, { pz: [0.05, 0.1, 0.95, 0.9], nz: [0.05, 0.1, 0.95, 0.9], px: [0.4, 0.1, 0.6, 0.9], nx: [0.4, 0.1, 0.6, 0.9], py: [0.1, 0.8, 0.9, 0.95], ny: [0.1, 0.05, 0.9, 0.2] });
  sat.position.set(0, 0.2, -0.17); B.torso.add(sat);
  const matchG = HR.joint(B.arms[1].wr, 0, -0.12, 0.05); const flame = PG.mesh(PG.sphereGeo(0.035, 8), PG.glow(0xffaa40, 3), false); matchG.add(flame); matchG.visible = false;
  const mats = C.mats.slice();
  const st = { ph: 0, heave: 0, jawP: PG.spring(), spin: 0, hY: 0, hP: 0, tw: 0 };
  function update(dt, t, s) {
    if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
    const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0;
    const speed = alive ? clamp(s.speed || 0, 0, 1.4) : 0, pl = clamp(s.plunge || 0, 0, 1), seated = s.seated > 0.5, splice = s.splice > 0.5;
    const panic = s.panic > 0.5, drop = s.drop > 0.5, blown = s.blown > 0.5, dazed = clamp(s.dazed || 0, 0, 1), match = clamp(s.match || 0, 0, 1);
    sat.visible = (s.satchel || 0) > 0.5 || (s.phase | 0) === 2;
    det.visible = !(s.noPlunger > 0.5) && !splice && !blown && !drop && !seated && alive;
    matchG.visible = match > 0.05; flame.scale.setScalar(0.6 + 0.4 * Math.sin(t * 40));
    st.ph += dt * (8 + 10 * speed);
    /* silent laughter: shoulders heave on every wind-up and while seated, panic is the same laugh, faster */
    const laugh = Math.max(pl < 1 ? pl : 0, seated ? 0.8 : 0, drop ? 1 : 0, match, panic ? 0.6 : 0, 0.15);
    st.heave += dt * (11 + 6 * laugh);
    const hv = Math.max(0, Math.sin(st.heave)) * laugh;
    let bob = PG.walk(B, st.ph, Math.min(1, speed), 0.85);
    B.base.position.set(0, 0, 0); B.base.rotation.set(0, 0, 0); B.hips.position.y = 0.44; B.hips.rotation.set(0, 0, 0);
    B.torso.rotation.set(0.05 * speed, 0, 0); B.chest.position.y = 0.36 + 0.03 * hv;
    for (const A of B.arms) { A.sh.rotation.z = A.sd * (0.12 + 0.12 * hv); A.el.rotation.z = 0; A.wr.rotation.set(0, 0, 0); }
    if (pl > 0 && !seated && !splice) {
      /* both hands on the T-handle: up during the wind-up, slammed down at 1 */
      const up = pl < 1 ? smooth(pl / 0.6) : 0;
      for (const A of B.arms) { A.sh.rotation.x = -1.1 - 0.9 * up; A.sh.rotation.z = -A.sd * 0.35; A.el.rotation.x = -0.7 + 0.3 * up; }
      shaft.position.y = 0.14 + 0.16 * up; B.torso.rotation.x = 0.35 - 0.25 * up; B.hips.position.y = 0.44 - 0.06 * (1 - up) - 0.02 * hv;
    } else shaft.position.y = 0.14;
    if (seated) { for (const L of B.legs) { L.hip.rotation.x = -1.45; L.knee.rotation.x = 1.3; } B.hips.position.y = 0.2; for (const A of B.arms) { A.sh.rotation.x = -0.4 - 0.3 * hv; A.el.rotation.x = -0.6; } }
    if (splice) {           /* hands and knees, one finger tracing the wire, back to you */
      B.hips.position.y = 0.26; B.torso.rotation.x = 1.25;
      for (const L of B.legs) { L.hip.rotation.x = -1.35; L.knee.rotation.x = 1.6; }
      B.arms[0].sh.rotation.x = -1.4; B.arms[0].el.rotation.x = 0;
      B.arms[1].sh.rotation.x = -1.55 + 0.1 * Math.sin(t * 3); B.arms[1].sh.rotation.z = 0.3 * Math.sin(t * 2.3); B.arms[1].el.rotation.x = 0;
    }
    if (panic) for (const A of B.arms) { A.sh.rotation.x = -2.6 + 0.8 * Math.sin(t * 22 + A.sd); A.sh.rotation.z = A.sd * (0.6 + 0.4 * Math.sin(t * 19)); A.el.rotation.x = -0.4; }
    if (drop) { for (const A of B.arms) { A.sh.rotation.x = -2.9; A.sh.rotation.z = A.sd * 0.3; } for (const L of B.legs) { L.hip.rotation.x = -0.3 + 0.4 * Math.sin(t * 15 + L.hip.position.x * 9); L.knee.rotation.x = 0.6; } }
    if (blown) { st.spin += dt * 9; B.base.position.y = 0.7; B.base.rotation.set(st.spin * 0.7, 0, st.spin);
      for (const A of B.arms) { A.sh.rotation.z = A.sd * 1.4; A.sh.rotation.x = 0.3 * Math.sin(t * 20); } for (const L of B.legs) { L.hip.rotation.z = (L.hip.position.x > 0 ? 1 : -1) * 0.7; L.hip.rotation.x = 0.5 * Math.sin(t * 17); } }
    if (match > 0) { B.arms[1].sh.rotation.x = -1.2; B.arms[1].el.rotation.x = -1.2 + 0.5 * Math.sin(match * 20); }
    if (dazed > 0) { B.torso.rotation.z = 0.15 * dazed * Math.sin(t * 2.6); B.torso.rotation.x += 0.2 * dazed; }
    /* head: twitchy darting look; the grin opens with every heave */
    st.tw += dt; const dart = 0.25 * PG.twitch(t, 3, 1.8, 5);
    st.hY += ((alive ? clamp(s.yaw || 0, -1, 1) : 0) + dart - st.hY) * Math.min(1, dt * 9); st.hP += ((alive ? clamp(s.pitch || 0, -0.5, 0.5) : 0) - st.hP) * Math.min(1, dt * 6);
    B.neckJ.rotation.set(st.hP - 0.12 * hv + 0.3 * dazed * Math.sin(t * 3), st.hY + 0.3 * dazed * Math.cos(t * 3), 0.1 * PG.twitch(t, 7, 2, 6));
    PG.pend(st.jawP, dt, 260, 16, Math.max(0.42 * hv, 0.3 * hurt, drop ? 0.4 : 0, alive ? 0 : 0.25), 0, 0, 0.6);
    H.jaw.rotation.x = st.jawP.a;
    /* the visor flickers with the light of whatever he is about to set off */
    visorM.emissive.setRGB(0.12 * hv, 0.07 * hv, 0.02 * hv);
    for (const A of B.arms) PG.rodTick(A.mitt, dt, 6 * noise(t * 4, A.sd + 4) * (0.3 + speed + hv), A.sd * speed);
    if (!alive) { const d = smooth(dead / 0.35); B.base.rotation.x = -1.45 * d; B.base.position.y = 0.12 * d;
      for (const A of B.arms) { A.sh.rotation.z = A.sd * (0.3 + 1.1 * d); A.sh.rotation.x = -0.2; } }
    B.base.position.y += bob;
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { head: B.neckJ, body: B.torso, jaw: H.jaw, helmet, plunger: det, aR: B.arms[0].wr, aL: B.arms[1].wr }, deathDur: 2.6 };
};
})();

