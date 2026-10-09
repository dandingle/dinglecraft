/* THE ARM / THE HANDS (pghand, pgshand, pgelbow, pgfinger): Puppet Purgatory, Hyperreal (bible 9.2, 10.3, 11, 17 #2).
   The performers are real. A Hand is a real human hand (pgent_hand: wedding ring, pruned fingertips, dirty nails) that walks
   on its four fingertips like a spider with its thumb raised like a head, a black sleeve cuff at the wrist. The same flesh
   at other scales: the Strike Hand (house scale, gauze on one fingertip per Knuckle Ore mined), the elbow of the arm the Frog
   rides in phase 3 (pgent_arm: a hairy forearm with a cheap watch), and the fingers inside the Frog's head.
   Variants: 'hand' (default), 'strike', 'elbow', 'finger'.
   s fields: scale (uniform, overrides the variant default: strike 16, elbow 1, finger 1), grip 0..1 (fingers curl),
   reach 0..1 (fingers splay forward), crouch 0..1 (the 0.5 s flex before a leap), leap 0..1 (airborne), wrap 0..1 (wrapped
   round a face), sweep 0..1 (the Strike Hand's sweep lean), bandage 0-4, recoil 0..1 (jerks away when hit),
   hole/aim world points (elbow: the upper arm runs to s.hl*, the forearm to s.am*). */
(function () {
'use strict';
const HR = window.HR;
if (!HR || !HR.MODELS || !HR.PG) return;
const PG = HR.PG, clamp = PG.clamp, smooth = PG.smooth, noise = PG.noise;
/* pgent_hand (1024 sq, back of a left-looking hand, fingers up): crops per finger [u0,v0,u1,v1] */
const HC = { back: [0.32, 0.04, 0.95, 0.5], index: [0.43, 0.52, 0.53, 0.99], middle: [0.55, 0.55, 0.66, 1.0], ring: [0.67, 0.5, 0.78, 0.97],
  pinky: [0.79, 0.44, 0.88, 0.88], thumb: [0.07, 0.28, 0.32, 0.52] };
const FING = ['index', 'middle', 'ring', 'pinky'];
let RING = null;                                                 /* the wedding ring's geometry (module cache) */
const ARMC = [0.24, 0, 0.8, 1];                                  /* pgent_arm: the arm runs bottom->top in u .24-.8, watch at v .2-.32 */
function skinPaint(g, n, R) {
  g.fillStyle = '#d9a48c'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 1600; i++) { g.fillStyle = 'rgba(90,50,40,' + (0.05 + R() * 0.08) + ')'; g.fillRect(R() * n, R() * n, 1, 1); }
  g.strokeStyle = 'rgba(60,30,20,.35)'; for (let i = 0; i < 70; i++) { g.beginPath(); const x = R() * n, y = R() * n; g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 6, y + 6 + R() * 6); g.stroke(); }
  g.strokeStyle = 'rgba(80,90,150,.2)'; g.lineWidth = 3; g.beginPath(); g.moveTo(n * 0.3, n); g.bezierCurveTo(n * 0.5, n * 0.6, n * 0.4, n * 0.3, n * 0.6, 0); g.stroke();
}

HR.MODELS.pg_arm = function (variant) {
  const V = variant === 'strike' || variant === 'elbow' || variant === 'finger' ? variant : 'hand';
  const C = PG.ctx(V.length * 13 + 5);
  const root = new THREE.Group(); root.name = 'hr_pg_arm';
  const scaleG = HR.joint(root, 0, 0, 0);
  const handT = PG.has('pgent_hand');
  const handM = handT ? PG.inst(C, PG.hmat('pgent_hand', { roughMap: false, normalScale: 0.7, fallback: 0xd8a48c }), 0xffffff, 0.5)
    : PG.face(C, null, 'pgarmskin', skinPaint, 0.5);
  const armM = PG.mat(C, [['pgent_arm', 0xffffff], ['skin_arm', 0xe0a882], [null, 0xd8a58a]], 0.5, { roughMap: false, normalScale: 0.8 });
  const nailM = PG.flat(C, 0xd8c8b0, 0.3), cuffM = PG.mat(C, [['pgmat_cuff', 0xffffff], ['mat_jersey', 0x1a181a], [null, 0x161416]], 0.95, { roughMap: true, repeat: [1, 1] });
  const gauze = PG.flat(C, 0xf2f0e6, 0.95), blood = PG.flat(C, 0x7a1a14, 0.6);
  const ringM = HR.flat(0xd8b048, { rough: 0.25, metal: 1 });
  const mats = [handM, armM, nailM, cuffM, gauze];
  const st = { ph: 0, g: PG.spring(), r: PG.spring(), hY: 0, bob: 0, rec: PG.spring() };
  let update;

  if (V === 'hand' || V === 'strike') {
    /* palm down, knuckles up; wrist at -z with the cuff; four fingers as legs; the thumb up at the front like a head */
    const PW = 0.44, PT = 0.12, PL = 0.42;
    const body = HR.joint(scaleG, 0, 0.2, 0);                 /* low and wide: knuckles up, the long middle phalanges planted */
    const back = PG.withFront(PG.tile(PW, PT, PL, 0.2, 0.2), HC.back); back.py = HC.back;
    const palm = PG.box(PW, PT, PL, { all: handM, py: handM }, back); body.add(palm);
    const wrist = HR.joint(body, 0, -0.01, -PL / 2);
    HR.at(wrist, PG.box(0.32, 0.13, 0.28, armM, { px: [ARMC[0], 0.05, ARMC[2], 0.25], nx: [ARMC[0], 0.05, ARMC[2], 0.25], py: [ARMC[0], 0.0, ARMC[2], 0.35], ny: [ARMC[0], 0.0, ARMC[2], 0.35], pz: [0.3, 0, 0.7, 0.2], nz: [0.3, 0, 0.7, 0.2] }), 0, 0, -0.14);
    const cuff = PG.mesh(PG.cylGeo(0.19, 0.21, 0.16, 10), cuffM); cuff.rotation.x = Math.PI / 2; cuff.position.z = -0.34; wrist.add(cuff);
    const stub = PG.mesh(PG.cylGeo(0.17, 0.17, 0.02, 10), PG.dark(0x050303), false); stub.rotation.x = Math.PI / 2; stub.position.z = -0.43; wrist.add(stub);
    /* fingers: knuckle -> proximal (up and out) -> middle -> tip (down to the floor) */
    const fingers = FING.map((n, i) => {
      const x = -PW / 2 + 0.07 + i * 0.1, cr = HC[n], cm = (cr[1] + cr[3]) / 2;
      const k = HR.joint(body, x, 0.02, PL / 2 - 0.02); k.rotation.y = (x) * 0.9;
      const p1 = HR.joint(k, 0, 0, 0); const l1 = 0.2 - (i === 3 ? 0.04 : 0);
      HR.at(p1, PG.box(0.075, 0.07, l1, handM, { py: [cr[0], cr[1], cr[2], cm], px: [cr[0], cr[1], cr[2], cm], nx: [cr[0], cr[1], cr[2], cm], pz: [cr[0], cm - 0.02, cr[2], cm], ny: [cr[0], cr[1], cr[2], cm], nz: [cr[0], cr[1], cr[2], cr[1] + 0.02] }), 0, 0, l1 / 2);
      const p2 = HR.joint(p1, 0, 0, l1); const l2 = 0.34 - (i === 3 ? 0.06 : 0);   /* too long: it is a spider now */
      HR.at(p2, PG.box(0.068, 0.065, l2, handM, { py: [cr[0], cm, cr[2], cr[3]], px: [cr[0], cm, cr[2], cr[3]], nx: [cr[0], cm, cr[2], cr[3]], pz: [cr[0], cr[3] - 0.03, cr[2], cr[3]], ny: [cr[0], cm, cr[2], cr[3]], nz: [cr[0], cm, cr[2], cm + 0.02] }), 0, 0, l2 / 2);
      const nail = PG.box(0.05, 0.012, 0.05, nailM, undefined, false); nail.position.set(0, 0.035, l2 - 0.03); p2.add(nail);
      if (n === 'ring') { const rg = PG.mesh(RING || (RING = new THREE.TorusGeometry(0.045, 0.012, 6, 14)), ringM, false); rg.position.z = l1 * 0.4; p1.add(rg); }
      const band = PG.box(0.08, 0.075, 0.07, gauze, undefined, false); band.position.z = l2 - 0.04; p2.add(band); band.visible = false;
      const red = PG.box(0.03, 0.01, 0.03, blood, undefined, false); red.position.set(0, 0.04, l2 - 0.05); p2.add(red); red.visible = false;
      return { k, p1, p2, l1, l2, band, red, i };
    });
    const thumb = HR.joint(body, PW / 2 - 0.02, 0.02, PL / 2 - 0.16); thumb.rotation.order = 'YXZ';
    HR.at(thumb, PG.box(0.085, 0.24, 0.085, handM, { pz: HC.thumb, px: HC.thumb, nx: HC.thumb, nz: HC.thumb, py: [HC.thumb[0], HC.thumb[3] - 0.04, HC.thumb[0] + 0.06, HC.thumb[3]], ny: HC.thumb }), 0, 0.12, 0);
    const tnail = PG.box(0.06, 0.06, 0.012, nailM, undefined, false); tnail.position.set(0, 0.2, 0.045); thumb.add(tnail);
    const base = V === 'strike' ? 16 : 1;
    update = function (dt, t, s) {
      if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
      const sc = s.scale || base; scaleG.scale.setScalar(sc);
      const dead = s.dead || 0, alive = dead <= 0, hurt = s.hurt || 0;
      const speed = alive ? clamp(s.speed || 0, 0, 1.4) : 0, crouch = clamp(s.crouch || 0, 0, 1) + (s.cd > 0 && s.cd < 0.45 ? 0.6 * (1 - s.cd / 0.45) : 0);
      const leap = clamp(s.leap || 0, 0, 1), wrap = clamp(s.wrap || 0, 0, 1), grip = clamp(Math.max(s.grip || 0, wrap), 0, 1), reach = clamp(s.reach || 0, 0, 1);
      PG.pend(st.rec, dt, 120, 9, clamp(s.recoil || 0, 0, 1) + hurt * 0.6, 0, -0.5, 1.5);
      st.ph += dt * (10 + 12 * speed) * (alive ? 1 : 0);
      st.bob = 0.03 * Math.abs(Math.sin(st.ph)) * speed;
      body.position.y = 0.2 - 0.08 * Math.min(1, crouch) + st.bob + 0.12 * leap;
      body.rotation.x = -0.25 * leap + 0.12 * Math.min(1, crouch) - 0.4 * st.rec.a - 0.3 * clamp(s.sweep || 0, 0, 1);
      body.rotation.z = 0.04 * Math.sin(st.ph * 0.5) * speed + 0.06 * hurt * Math.sin(t * 40);
      /* spider gait: diagonal pairs lift; tips touch the floor at y 0 (approximately: a fixed fold that reads right) */
      for (const f of fingers) {
        const lift = speed > 0.05 ? Math.max(0, Math.sin(st.ph + (f.i % 2 ? Math.PI : 0))) * 0.5 : 0;
        const tw = alive ? 0.08 * noise(t * 3, f.i + 2) : 0;
        const a1 = -0.6 - lift + 0.4 * crouch + 0.45 * leap - 0.4 * reach + 0.9 * grip;    /* knuckle: up and out */
        const a2 = 2.1 + 0.3 * crouch - 1.4 * leap - 0.8 * reach + 0.5 * grip + tw;       /* the long joint: straight down to the floor */
        f.p1.rotation.x = alive ? a1 : PG.lerp(a1, 0.6, smooth(dead / 0.4));
        f.p2.rotation.x = alive ? a2 : PG.lerp(a2, 1.9, smooth(dead / 0.4));                 /* dies with its fingers curled in */
        f.k.rotation.z = (f.i - 1.5) * 0.08 * (1 + reach);
        const bd = (s.bandage | 0) > (3 - f.i); f.band.visible = V === 'strike' && bd; f.red.visible = f.band.visible;
      }
      /* the thumb: the "head". Tracks the target, cocks back before a leap */
      st.hY += (clamp(s.yaw || 0, -0.9, 0.9) - st.hY) * Math.min(1, dt * 5);
      thumb.rotation.set(-0.25 - 0.5 * crouch + 0.6 * leap + 0.8 * grip, st.hY * 0.7, -0.3);
      if (!alive) { root.rotation.z = Math.PI * smooth(dead / 0.5); root.position.y = 0.3 * sc * smooth(dead / 0.5); }   /* flips onto its back, fingers curling */
      else { root.rotation.z = 0; root.position.y = 0; }
    };
  } else if (V === 'finger') {
    /* one huge finger standing up out of the dark (Inside the Frog), knuckle creases, a dirty nail */
    const segs = [], L = [0.9, 0.7, 0.55], W = 0.42;
    let par = scaleG;
    for (let i = 0; i < 3; i++) { const j = HR.joint(par, 0, i ? L[i - 1] : 0, 0); const cr = HC.middle, v0 = cr[1] + (cr[3] - cr[1]) * (i / 3), v1 = cr[1] + (cr[3] - cr[1]) * ((i + 1) / 3);
      HR.at(j, PG.box(W - i * 0.04, L[i], W - i * 0.05, handM, { pz: [cr[0], v0, cr[2], v1], px: [cr[0], v0, cr[2], v1], nx: [cr[0], v0, cr[2], v1], nz: [cr[0], v0, cr[2], v1], py: [cr[0], v1 - 0.02, cr[2], v1], ny: [cr[0], v0, cr[2], v0 + 0.02] }), 0, L[i] / 2, 0);
      segs.push(j); par = j; }
    const nail = PG.box(0.28, 0.3, 0.04, nailM, undefined, false); nail.position.set(0, 0.36, 0.2); segs[2].add(nail);
    const knk = PG.mesh(PG.sphereGeo(0.25, 10), handM); knk.position.y = 0; scaleG.add(knk);
    update = function (dt, t, s) {
      if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
      scaleG.scale.setScalar(s.scale || 1);
      const dead = s.dead || 0, grip = clamp(s.grip || 0, 0, 1), hurt = s.hurt || 0;
      PG.pend(st.rec, dt, 140, 10, clamp(s.recoil || 0, 0, 1) + hurt, 0, -0.5, 1.5);
      const tw = 0.05 * noise(t * 1.3, (s.seed || 1));
      segs[0].rotation.x = 0.25 * grip + tw - 0.35 * st.rec.a + 0.6 * smooth(dead);
      segs[1].rotation.x = 0.55 * grip + tw * 1.4 + 0.8 * smooth(dead);
      segs[2].rotation.x = 0.5 * grip + 0.4 * smooth(dead);
      segs[0].rotation.z = 0.06 * Math.sin(t * 0.7 + (s.seed || 1));
    };
  } else {
    /* the elbow (the Frog P3): the upper arm runs to its root (s.hl*), the forearm up to the Frog (s.am*); the elbow sits at the origin */
    const W = 1.1;
    const elb = PG.mesh(PG.sphereGeo(W * 0.62, 14), armM); scaleG.add(elb);
    const crease = PG.box(W * 0.8, 0.08, 0.2, PG.flat(C, 0x9a6a58, 0.7), undefined, false); crease.position.set(0, 0, W * 0.5); scaleG.add(crease);
    const upJ = HR.joint(scaleG, 0, 0, 0), foJ = HR.joint(scaleG, 0, 0, 0);
    const upM = PG.box(W, 1, W * 0.9, armM, { px: [ARMC[0], 0.4, ARMC[2], 1], nx: [ARMC[0], 0.4, ARMC[2], 1], pz: [ARMC[0], 0.4, ARMC[2], 1], nz: [ARMC[0], 0.4, ARMC[2], 1], py: [0.4, 0.9, 0.6, 1], ny: [0.4, 0.4, 0.6, 0.5] });
    upM.position.y = 0.5; upJ.add(upM);
    const foM = PG.box(W * 0.9, 1, W * 0.82, armM, { px: [ARMC[0], 0, ARMC[2], 0.6], nx: [ARMC[0], 0, ARMC[2], 0.6], pz: [ARMC[0], 0, ARMC[2], 0.6], nz: [ARMC[0], 0, ARMC[2], 0.6], py: [0.4, 0.5, 0.6, 0.6], ny: [0.4, 0, 0.6, 0.1] });
    foM.position.y = 0.5; foJ.add(foM);
    const sleeve = PG.mesh(PG.cylGeo(W * 0.7, W * 0.62, 1, 10), PG.mat(C, [['pgmat_frogfelt', 0xc8d0b8], ['mat_jersey', 0x4c8a30], [null, 0x4c8a30]], 0.95, { roughMap: true, repeat: [1, 1] }));
    foJ.add(sleeve);
    const UP = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), q = new THREE.Quaternion();
    const aimBone = (J, M, x, y, z, sl) => { d.set(x, y, z); let L = d.length(); if (L < 0.01) { d.set(0, 1, 0); L = 0.01; } d.divideScalar(L); q.setFromUnitVectors(UP, d); J.quaternion.copy(q);
      M.scale.y = L; M.position.y = L / 2; if (sl) { sl.scale.y = Math.min(L * 0.25, 4); sl.position.y = L - sl.scale.y / 2; } };
    update = function (dt, t, s) {
      if (!(dt > 0)) return; dt = Math.min(dt, 0.1); PG.tickHeal(C, dt);
      const sc = s.scale || 1; scaleG.scale.setScalar(sc);
      const hurt = s.hurt || 0; PG.pend(st.rec, dt, 90, 7, clamp(s.recoil || 0, 0, 1) + hurt * 0.8, 0, -0.5, 1.5);
      const hx = s.hlx !== undefined ? s.hlx / sc : -3, hy = s.hly !== undefined ? s.hly / sc : -2.5, hz = s.hlz !== undefined ? s.hlz / sc : 2;
      const ax = s.amx !== undefined ? s.amx / sc : 0.5, ay = s.amy !== undefined ? s.amy / sc : 9, az = s.amz !== undefined ? s.amz / sc : 0;
      aimBone(upJ, upM, hx, hy, hz, null); aimBone(foJ, foM, ax, ay, az, sleeve);
      elb.scale.setScalar(1 + 0.08 * Math.sin(t * 1.7) + 0.15 * st.rec.a);                  /* the elbow breathes; flinches when hit */
      scaleG.position.set(0.3 * st.rec.a * Math.sin(t * 30), 0, 0);
    };
  }
  PG.packGroups(root);
  return { root, update, mats, handles: { body: scaleG }, deathDur: 2 };
};
})();

