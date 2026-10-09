/* ---- PART 54: tC_bots.js ---- */
/* ---- tC_bots.js (Package C): the three AI players' Hyperreal bodies ----
   Hook C20 (agSpawnBody) asks hrBotBody(a) first; C21 lifts the name tag above Brad's periscope and skips OG's
   shadowify; C23 (agAnimate, after the position/yaw write) hands the frame to hrBotTick; C24 records placements
   (a.hrPlT/a.hrPlId: PART 53 already uses a.placeT as its build pacer); C25 (agDie) leaves a corpse.
   Bodies face -z like agHumanoid: root sits in a flip Group. M.aR is an OG-frame pivot (rot.y PI) under the model's
   right arm, so agSyncHeld's tool offsets land in the hand. Bodies alive at enable are stashed and restored as the
   identical OG objects at disable (a paused round trip is pixel-identical); bodies born in Hyperreal are dropped at
   disable and tickBots respawns them as OG. */
function hrBotBody(a){
  const n=HR_BOT[a&&a.name];if(!n)return null;
  const H=hrBuild(n);if(!H)return null;
  const G=new THREE.Group(),flip=new THREE.Group();flip.rotation.y=Math.PI;flip.add(H.hr.root);G.add(flip);
  const h=H.hr.handles||{},root=H.hr.root;
  const aR=new THREE.Group();aR.rotation.y=Math.PI;(h.aR||root).add(aR);
  H.G=G;H.r=2.4;
  return {G,head:h.head||root,aL:h.aL||root,aR,lL:h.lL||root,lR:h.lR||root,mats:hrEntFlashMats(H),hr:true,hrM:H};}
/* enable: a live OG body becomes Hyperreal in place (same entity, same tool, a fresh tag) */
function hrBotSwapIn(e){const a=e.A;if(!a||e.hrM||!e.M||e.M.hr)return;
  const M=hrBotBody(a);if(!M)return;
  M.tag=agTag(a.name);M.G.add(M.tag);M.tag.position.y=2.62;
  e._og={M:e.M,G:e.mesh,mats:e.mats};scene.remove(e.mesh);
  e.M=M;e.mesh=M.G;e.mats=M.mats;e.hrM=M.hrM;
  M.G.position.set(e.x,e.y-(a.ctl&&a.ctl.sneak?0.12:0),e.z);M.G.rotation.y=e.yaw;M.G.visible=e._og.G.visible;scene.add(M.G);}
/* disable: back to the stashed OG body, or drop a Hyperreal-born one (tickBots respawns it through agSpawnBody) */
function hrBotSwapOut(e){if(!e.hrM)return;
  const H=e.hrM;
  if(e._og){scene.remove(e.mesh);hrFree(H);e.hrM=null;const o=e._og;e._og=null;
    e.M=o.M;e.mesh=o.G;e.mats=o.mats;scene.add(o.G);}
  else if(e.A&&e.A.e===e)agDropBody(e.A);                   /* removeEnt -> hook C8 frees the model */
  else removeEnt(e);}
/* hook C23: everything agAnimate does after its position write, for a Hyperreal body */
function hrBotTick(a,e,dt){try{hrBotTick1(a,e,dt);}catch(err){hrEntFail('AI player body',err);}}
function hrBotTick1(a,e,dt){
  const M=e.M,H=e.hrM;if(!M||!H)return;
  const s=H.s,sn=!!(a.ctl&&a.ctl.sneak);
  M.G.position.y=e.y-(sn?0.12:0);
  if(M.tag)M.tag.visible=!sn;
  /* swing: a jump is a strike; held >= 0.55 frame after frame means breaking (a jab every 0.3 s) */
  const sw=a.swing||0;
  if(sw>H.pSw+0.2)s.fired=true;
  if(sw>=0.55&&H.pSw>=0.5){H.pinT+=dt;if(H.pinT>=0.3){H.pinT-=0.3;s.fired=true;}}else H.pinT=0;
  if(a.swing>0)a.swing=Math.max(0,a.swing-dt*3.2);         /* OG decay (agAnimate) */
  H.pSw=a.swing;
  s.attack=Math.sin(a.swing*Math.PI);
  s.speed=Math.min(1.3,Math.hypot(e.vx,e.vz)/4.32);s.hurt=e.hurtT/0.6;s.hp=a.hp/20;
  /* look: Dan within 16, else the mind's look target; heads turn relative to the body (which faces -z) */
  let tx=null,ty=0,tz=0,nd=99;
  if(P&&!P.dead){const d=Math.hypot(P.x-e.x,P.z-e.z);if(d<16){tx=P.x;ty=P.y+(P.eyeY||1.62);tz=P.z;nd=d;}}
  if(tx===null&&a.look&&a.look.t>AG_T){tx=a.look.x;ty=a.look.y;tz=a.look.z;nd=Math.hypot(tx-e.x,tz-e.z);}
  s.near=nd;
  if(tx!==null){s.yaw=hrClampE(hrWrap(Math.atan2(tx-e.x,tz-e.z)-e.yaw-Math.PI),-1.1,1.1);
    s.pitch=hrClampE(hrMobPitch(e.y+1.62,ty,Math.hypot(tx-e.x,tz-e.z)),-0.6,0.6);}
  else{const k=Math.pow(0.92,dt*60);s.yaw*=k;s.pitch*=k;}
  /* placements (hook C24): a flower is a plant (the bee kneels), TNT is grief (the pelt hisses), anything else a build */
  if(a.hrPlT!==undefined&&a.hrPlT!==H.pPl){H.pPl=a.hrPlT;
    if(typeof FLOWER_IDS!=='undefined'&&FLOWER_IDS.has(a.hrPlId))s.plant=true;else if(a.hrPlId===B.TNT)s.grief=true;else s.build=true;}
  if(H.name==='honeybee')s.mood=a.mood>=75?'happy':undefined;
  if(e.hurtT<0.2)for(const m of e.mats)m.emissive&&m.emissive.setRGB(0,0,0);
  agSyncHeld(a,e);
  hrAccel(H,e.vx,e.vy,e.vz,dt);
  hrStep(H,dt,e.x,e.y,e.z,H.r);}
