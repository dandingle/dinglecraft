/* Puppet Purgatory (v6.1, P7): entity texture ids used OUTSIDE a model, plus the purgatory id contract.
   pack_assets.py embeds an entity texture only if a quoted literal in models/*.js names it, so the two ids used by game code
   (fist_pg: tC_player.js through hrPgFistSync; pgface_feltdan: the OG Felt Dan rig through hrPgFace) are listed here.
   HR.PG_ART is the full purgatory entity id list: quoting an id here is what makes the packer embed it (and an id that is no
   longer quoted anywhere drops out of the pack). Release 1.0 recast the cast generically: the old character faces and
   costume textures are gone, the faces are painted in code (PG.face falls back to each model's painter). Spliced into
   hrLoadPModels() with the models. */
(function () {
'use strict';
const HR = window.HR;
if (!HR) return;
HR.PG_IDS = ['fist_pg', 'pgface_feltdan'];
HR.PG_ART = [
  'pgmat_frogfelt', 'pgmat_tongue', 'pgmat_cuff',
  'pgent_satchel', 'pgent_arm', 'pgent_hand',
  'pgface_piglet', 'pgface_blank',
  'pgent_apron', 'pgent_sneakers',
  'pgface_feltdan', 'fist_pg',
  /* tintable neutrals (patina text-only): every felt puppet in any colour, every fur in any colour */
  'pgmat_felt', 'pgmat_fur'];
})();
