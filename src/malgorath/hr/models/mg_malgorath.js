/* Malgorath (v6.3, M4): the rig.js contract wrapper. HR.MODELS.malgorath(o) -> {root, update(dt, t, s), mats, deathDur}.
   One skeleton, two skins (plan D11): the geometry, joints and every animation are M3's mg3Rig (PART 57); this model asks it
   for the Hyperreal skin through hrMgBuild (the PART 57 HR block: the M4 material set, object-space triplanar maps, the round
   hue, the heartbeat, the rim, the death glow, embers). s is the shared rig state MGA (bible 5.3) or {mg: MGA}; a plain
   rig.js s (speed/attack/hurt/dead) drives a preview pose. Spliced into hrLoadMModels() (strict, returns early without
   window.HR, like pg_*.js; never named pg_*.js). Nothing at top level allocates; update never allocates. */
(function () {
  'use strict';
  const HR = window.HR;
  if (!HR || !HR.MODELS) return;
  HR.MODELS.malgorath = function (o) {
    const r = typeof hrMgBuild === 'function' ? hrMgBuild(Object.assign({ kind: 'boss' }, o || {})) : null;
    if (!r) return { root: new THREE.Group(), update: function () {}, mats: [], deathDur: 14, rig: null };
    const prev = { round: 1, stance: 'idle', heart: 60, hurt: 0, dead: 0, rim: 0, light: { at: 'chest', i: 1.6, col: 0xff5a22 } };
    return {
      root: r.root, mats: r.hrMats.list.slice(), deathDur: 14, rig: r,
      update: function (dt, t, s) {
        if (s && s.mg) { r.update(dt, s.mg); return; }
        if (s && s.stance !== undefined) { r.update(dt, s); return; }
        prev.hurt = s && s.hurt ? s.hurt : 0; prev.dead = s && s.dead ? s.dead : 0;
        r.update(dt, prev);
      }
    };
  };
})();
