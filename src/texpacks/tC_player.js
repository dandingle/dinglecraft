/* ---- PART 54: tC_player.js ---- */
/* ---- tC_player.js (Package C): Dan in third person, and the first-person empty-hand fist ----
   Hook C13 (mkPlayerModel) returns hrPlayerModel(); hook C14 (updatePlayerMesh) hands every frame to hrPlayerTick,
   which keeps OG's hat / held tool / armour sync. Hook C18 (refreshHand, empty hand) attaches the fist viewmodel to
   handG; hook C19 (updateHand) runs it. The model faces +z, the game's player faces -z: root sits in a flip Group.
   The joints the game hangs things on are OG-frame anchors (-z front) under the model's own joints:
     M.head   = head centre, rot.y PI    (buildHat's y 0.27, getObjectByName('hat'))
     M.aR     = right shoulder, rot.y PI (syncArmTool's frame; the tool rides the swollen fist)
     M.helmA  = head centre; M.chestA = torso centre (hooks C15-C17: armour follows head and torso)
   s is filled once per frame (hrPlayerState) and shared by both views, so the fist's swell/splinters are one state.
   v6.1 (P7): inside purgatory the fist material wears fist_pg (the swollen fist in a felt glove two sizes too small), swapped
   by hrPgFistSync (below, the purgatory cast section) on the material both views share; outside it is fist_dan again. */
function hrPlayerJ(p,y,ry){const g=new THREE.Group();g.position.y=y;g.rotation.y=ry;p.add(g);return g;}
function hrPlayerModel(){
  const H=hrBuild('player');if(!H)return null;
  const G=new THREE.Group(),flip=new THREE.Group();flip.rotation.y=Math.PI;flip.add(H.hr.root);G.add(flip);
  const h=H.hr.handles||{},root=H.hr.root;
  if(!HRE.ps){HRE.ps=hrS(7);HRE.pH={s:HRE.ps,pv:new THREE.Vector3()};}
  H.s=HRE.ps;H.G=G;H.r=2;hrSetLod(H,0);
  const head=hrPlayerJ(h.head||root,.25,Math.PI);
  const M={G,head,aL:h.aL||root,aR:hrPlayerJ(h.aR||root,0,Math.PI),lL:h.lL||root,lR:h.lR||root,shoes:null,
    hr:true,hrM:H,helmA:hrPlayerJ(h.head||root,.25,0),chestA:hrPlayerJ(h.torso||root,.36,0)};
  G.visible=false;                                          /* updatePlayerMesh decides (first person, death) */
  scene.add(G);return M;}
/* s from Dan's state, once per frame (both views read it) */
function hrPlayerState(dt){
  if(!HRE.ps){HRE.ps=hrS(7);HRE.pH={s:HRE.ps,pv:new THREE.Vector3()};}
  const s=HRE.ps;if(HRE.psF===frameCount||!P)return s;HRE.psF=frameCount;
  s.fired=s.woodHit=s.blockHit=false;
  s.speed=Math.hypot(P.vx,P.vz)/4.32;
  if(P.atkT>HRE.pAtk+1e-4||P.swing>HRE.pSw+0.2)s.fired=true;   /* a punch, a break, a use: the swing re-armed */
  if(MINE.active&&MB.l&&dt>0){HRE.mineT+=dt;
    if(HRE.mineT>=0.3){HRE.mineT-=0.3;s.fired=true;          /* still digging: a jab every 0.3 s */
      if(!heldStack()){if(isLogId(getBlock(MINE.x,MINE.y,MINE.z)))s.woodHit=true;else s.blockHit=true;}}}
  else if(!MINE.active)HRE.mineT=0;
  HRE.pAtk=P.atkT;HRE.pSw=P.swing;
  s.attack=P.swing>0?Math.sin((1-P.swing)*Math.PI):0;
  s.hurt=P.hurtT/0.6;s.yaw=0;s.pitch=hrClampE(-P.pitch,-0.6,0.6);s.dead=0;
  hrAccel(HRE.pH,P.vx,P.vy,P.vz,Math.max(dt,1/120));
  return s;}
/* hook C14: replaces OG's limb swing (the OG ride pose has its legs swung backwards: not copied) */
function hrPlayerTick(M,dt){try{hrPlayerTick1(M,dt);}catch(err){hrEntFail('player',err);}}
function hrPlayerTick1(M,dt){
  const H=M.hrM;if(!H)return;
  const s=hrPlayerState(dt);
  if(H.pgFist!==(DIM==='puppet'))hrPgFistSync(H);           /* v6.1 (P7): the felt-glove fist inside purgatory (below) */
  if(M._hat!==(P.cos&&P.cos.hat||null))applyHat(M);
  syncArmTool(M);
  syncArmorModel(M);
  const hs=M.head.getObjectByName('hat');
  if(hs){const sp=hs.getObjectByName('hatspin');if(sp)sp.rotation.y+=dt*10;
    const ha=hs.getObjectByName('hathalo');if(ha)ha.position.y=0.5+Math.sin(HRE.t*3)*0.05;}
  const ride=!!P.ride;if(ride)s.speed=0;
  try{H.hr.update(dt,HRE.t,s);}catch(err){if(!H.err){H.err=1;console.warn('[HR] player',err);}}
  if(ride){const h=H.hr.handles||{},sit=P.ride.t==='skate'?0.25:1.15;   /* model space: negative x swings a limb forward */
    if(h.lL)h.lL.rotation.x=-sit;if(h.lR)h.lR.rotation.x=-sit;if(h.aL)h.aL.rotation.x=-0.5;if(h.aR)h.aR.rotation.x=-0.5;}}
/* hook C18: the empty hand is Dan's swollen fist (shares the third-person model's materials and fist state) */
function hrFistAttach(){
  if(typeof plModel==='undefined')return;
  if(!plModel)plModel=mkPlayerModel();                     /* hook C13: Hyperreal while HRE.on */
  const M=plModel;if(!M||!M.hr)return;
  const vm=hrEntVM(M.hrM);if(!vm||!vm.group)return;
  handG.add(vm.group);}
/* hook C19: returns true while the fist owns handG (OG's bob/dip would fight the viewmodel's own) */
function hrFistTick(dt){try{return hrFistTick1(dt);}catch(err){hrEntFail('fist',err);return false;}}
function hrFistTick1(dt){
  if(!P)return false;
  const s=hrPlayerState(dt);
  const M=plModel,H=M&&M.hrM,vm=H&&H.vm;
  if(!vm||!vm.group||handG.children.indexOf(vm.group)<0)return false;
  if(H.pgFist!==(DIM==='puppet'))hrPgFistSync(H);           /* v6.1 (P7): fist_pg inside purgatory, fist_dan outside */
  handG.position.set(0,0,0);handG.rotation.set(0,0,0);
  if(camMode===0){try{vm.update(dt,HRE.t,s);}catch(err){if(!H.vmErr){H.vmErr=1;console.warn('[HR] fist',err);}}}
  return true;}
/* ==================== v6.1 PUPPET PURGATORY: the Hyperreal purgatory cast (P7) ==================== */
/* (BUILD_PLAN.md section 7.2 names this tC_purg.js. It lives at the end of tC_player.js instead: any extra tC_*.js file is
   spliced after tC_corpse.js and shifts that section's trailing newline, which p0_smoke's v6.0 identity check sees.)
   A parallel registry next to the v6.0 cast, so the pinned v6.0 tests (HR_MOB, HR_CAST, fake_models) stay untouched:
     HR_PMOB    mob type -> model name (src/texpacks/models/pg_*.js, spliced into hrLoadPModels(), NOT hrLoadModels)
     HR_PMOB_V  mob type -> model variant (one model serves several types: the arm is a Hand, the Strike Hand, the elbow...)
     HR_PMOB_R  culling-sphere radius per type (bosses are tall, the Strike Hand is a building)
   Entry points (PART 55 calls every one of them typeof-guarded, so DC_NO_TEX builds never see them):
     hrPgMobMesh(mt,G)   P0-32 asks it first for spawnMob's {hr:1} body: null unless the cast is live and the model exists
     hrPgTick(e,dt)      mpBrain calls it after every custom purgatory brain (they return before hook C6): fills s, steps the model
     hrPgPrewarm()       mpArrive calls it on entering purgatory: installs the purgatory cast once, builds every model twice
                         (module caches found) and warm-renders one set, so the first Blank does not hitch
     hrPgFace(id)        a THREE texture for an entity id when Hyperreal is on and the art is packed (P3's OG Felt Dan face)
     hrPgFistOwns()      true while the Hyperreal fist owns handG (P2: skip the OG felt mitt then)
   Per-entity animation: brains write plain numbers into e.hrS (no THREE); every update copies them onto the model's s
   (generic-brain mobs too: the copy lives in the model's update wrapper). The fields each model reads are listed in its header.
   Nothing here runs in OG: every path starts from HRE.on, e.hrM or a 'pack' event. No THREE constructor, Math.random or clock at
   top level. Absent PART 55 (DC_NO_PURG) hrLoadPModels does not exist and the purgatory cast simply never installs. */
const HR_PMOB={pgbigfrog:'pg_bigfrog',pgbomber:'pg_bomber',pgbigpig:'pg_bigpig',pgwhat:'pg_blank',pghollow:'pg_blank',pgposs:'pg_blank',
  pghand:'pg_arm',pgtoss:'pg_pig',pgpiglet:'pg_pig',pgpig:'pg_pig',pghog:'pg_pig',pgshand:'pg_arm',pgelbow:'pg_arm',pgfinger:'pg_arm',
  pgcook:'pg_cook',pgdrummer:'pg_drummer',pgyeti:'pg_yeti',pgrat:'pg_labrat',pgrat2:'pg_labrat',pgrat4:'pg_labrat',pgratb:'pg_labrat',
  pgdare:'pg_daredevil',pgcomic:'pg_comic',pgfrog:'pg_frog'};
const HR_PMOB_V={pgwhat:'tether',pghollow:'hollow',pgposs:'possessed',pghand:'hand',pgshand:'strike',pgelbow:'elbow',pgfinger:'finger',
  pgtoss:'toss',pgpiglet:'piglet',pgpig:'chorus',pghog:'hog',pgrat:'clone',pgrat2:'half',pgrat4:'quarter',pgratb:'bench'};
const HR_PMOB_R={pgbigfrog:3,pgbigpig:2.6,pgbomber:2.4,pgyeti:3.6,pgshand:26,pgelbow:5,pgfinger:4,pgdrummer:2.2,pgwhat:6,pgcomic:5.5,
  pgcook:2.6,pgdare:2,pghand:1.2,pgfrog:1};
/* the models in hrLoadPModels(), for prewarm (one build per model name; variants share caches) */
const HR_PMODELS=['pg_bigfrog','pg_bomber','pg_bigpig','pg_blank','pg_arm','pg_pig','pg_cook','pg_drummer','pg_yeti','pg_labrat','pg_daredevil','pg_comic','pg_frog'];
var HR_PST={inst:false,ok:false,warmed:false,warmDim:false,builds:0,warms:0,swaps:0,fistTx:null,fistOff:false};

/* install the purgatory cast once (after the v6.0 cast: rig.js has to exist). False = OG puppets in Hyperreal. */
function hrPgInstall(){
  if(HR_PST.inst)return HR_PST.ok;
  if(!HRE.installed||HRE.broken)return false;
  HR_PST.inst=true;
  try{const H=window.HR;
    if(H&&H.MODELS&&!H.MODELS.pg_bigfrog&&typeof hrLoadPModels==='function')hrLoadPModels();
    HR_PST.ok=!!(H&&H.MODELS&&HR_PMODELS.some(n=>!!H.MODELS[n]));
    if(HR_PST.ok){const miss=HR_PMODELS.filter(n=>!H.MODELS[n]);if(miss.length)console.warn('[HR] purgatory models missing: '+miss.join(','));}}
  catch(err){HR_PST.ok=false;console.warn('[HR] the purgatory cast could not install: OG puppets in Hyperreal',err);}
  return HR_PST.ok;}
/* hrBuild with a variant: the model factory is called as HR.MODELS[name](variant) */
function hrPgBuildM(name,v){const M=window.HR&&window.HR.MODELS,f=M&&M[name];if(!f)return null;
  M[name]=()=>f(v);let H=null;try{H=hrBuild(name);}finally{M[name]=f;}
  if(H){HR_PST.builds++;H.pv0=v;const up=H.hr.update;
    H.hr.update=function(dt,t,s){const e=H.pe===undefined?(H.pe=hrPgOwner(H)):H.pe,x=e&&e.hrS;
      if(x){for(const k in x)s[k]=x[k];if(x.hole)hrPgLocal(e,x.hole,s,'hl');else if(e.parm)hrPgLocalXYZ(e,e.parm.hx,e.parm.hy,e.parm.hz,s,'hl');   /* P3's tether */
        if(x.stake)hrPgLocal(e,x.stake,s,'sk');if(x.aim)hrPgLocal(e,x.aim,s,'am');}
      return up(dt,t,s);};}
  return H;}
/* a world point [x,y,z] in e.hrS (hole: a tether's Arm Hole; stake: the Drummer's chain stake; aim: a tongue/throw target) becomes
   model-space numbers on s (s.hlx/hly/hlz, s.skx.., s.amx..): models never see the world. Strings are interned: no allocation.
   P3's tethered puppets publish e.parm={hx,hy,hz,...} (their Arm Hole) and hide their OG arm while e.hrM: that is the hole. */
function hrPgLocal(e,w,s,p){hrPgLocalXYZ(e,w[0],w[1],w[2],s,p);}
function hrPgLocalXYZ(e,wx,wy,wz,s,p){const G=e.mesh,sx=(G&&G.scale&&G.scale.x)||1,sy=(G&&G.scale&&G.scale.y)||1,yaw=e.yaw||0,c=Math.cos(yaw),n=Math.sin(yaw);
  const dx=wx-e.x,dy=wy-e.y,dz=wz-e.z;
  if(p==='hl'){s.hlx=(dx*c-dz*n)/sx;s.hly=dy/sy;s.hlz=(dx*n+dz*c)/sx;}
  else if(p==='sk'){s.skx=(dx*c-dz*n)/sx;s.sky=dy/sy;s.skz=(dx*n+dz*c)/sx;}
  else{s.amx=(dx*c-dz*n)/sx;s.amy=dy/sy;s.amz=(dx*n+dz*c)/sx;}}
/* the entity that owns a body (found once, on its first update; spawnMob builds the body before the entity exists) */
function hrPgOwner(H){for(const e of entities)if(e.hrM===H)return e;return null;}
/* P0-32: spawnMob's Hyperreal body for a purgatory mob type */
function hrPgMobMesh(mt,G){
  if(!HRE.on||HRE.broken||!HRE.installed||!HR_PMOB[mt])return null;
  try{if(!hrPgInstall())return null;
    const H=hrPgBuildM(HR_PMOB[mt],HR_PMOB_V[mt]||null);if(!H)return null;
    H.G=G;H.r=HR_PMOB_R[mt]||Math.max(1,((MOBT[mt]&&MOBT[mt].h)||1)*1.25);G.add(H.hr.root);
    return {G,legs:[],mats:hrEntFlashMats(H),hrM:H};}
  catch(err){hrEntFail('pmob mesh '+mt,err);return null;}}
/* mpBrain: custom purgatory brains return before hook C6, so the body is stepped here. The brain has already written
   e.x/y/z, e.yaw, e.mesh position/rotation and (optionally) e.hrS. */
function hrPgTick(e,dt){try{hrPgTick1(e,dt);}catch(err){hrEntFail('pmob '+e.mt,err);}}
function hrPgTick1(e,dt){const H=e.hrM;if(!H||!H.G)return;const s=H.s,T=MOBT[e.mt]||{};
  if(H.pe===undefined)H.pe=e;
  const vx=e.vx||0,vy=e.vy||0,vz=e.vz||0;
  s.speed=Math.min(1.3,Math.hypot(vx,vz)/Math.max(0.5,(T.spd||1)*2.2));
  s.hurt=(e.hurtT||0)/0.5;
  if(typeof e.atkT==='number'){const amax=hrMobAmax(T);if(H.pAtk!==undefined&&e.atkT>H.pAtk+1e-4)s.fired=true;H.pAtk=e.atkT;
    const ag=amax-e.atkT;s.attack=e.atkT>0&&ag<.8?Math.sin(ag/.8*Math.PI):0;s.cd=e.atkT/amax;}
  /* head look: at Dan when he is near (a brain may aim elsewhere through e.hrS.yaw / e.hrS.pitch) */
  if(P&&!P.dead){const dx=P.x-e.x,dz=P.z-e.z,d=Math.hypot(dx,dz);s.near=d;
    if(d<24){s.yaw=hrClampE(hrWrap(Math.atan2(dx,dz)-(e.yaw||0)),-1.1,1.1);s.pitch=hrClampE(hrMobPitch(e.y+.85*(e.h||T.h||1),P.y+(P.eyeY||1.62),d),-0.6,0.6);}
    else{const k=Math.pow(0.92,dt*60);s.yaw*=k;s.pitch*=k;}}
  hrAccel(H,vx,vy,vz,dt);
  hrStep(H,dt,e.x,e.y,e.z,H.r);}
/* prewarm: on arrival in purgatory with the cast live. Builds each model twice the first time (shared caches), then one set
   7 m in front of the camera goes through TP.warm (compile + one render) and is freed again. */
function hrPgPrewarm(){
  if(!HRE.on||HRE.broken||!HRE.installed||DIM!=='puppet')return false;
  if(HR_PST.warmDim)return true;
  try{if(!hrPgInstall())return false;
    const G=new THREE.Group(),list=[];G.name='hr_pgwarm';
    for(const n of HR_PMODELS){const a=hrPgBuildM(n,null);if(!a)continue;
      if(!HR_PST.warmed){const b=hrPgBuildM(n,null);if(b)hrFree(b);}
      a.hr.root.position.set((list.length-6)*2.2,0,0);G.add(a.hr.root);list.push(a);}
    HR_PST.warmed=true;HR_PST.warmDim=true;HR_PST.warms++;
    const ry=camera?camera.rotation.y:0,rx=camera?camera.rotation.x:0,c=Math.cos(rx);
    if(camera)G.position.set(camera.position.x-Math.sin(ry)*c*7,camera.position.y+Math.sin(rx)*7-1,camera.position.z-Math.cos(ry)*c*7);
    G.rotation.y=ry;
    try{if(TP.warm)TP.warm(G);}finally{if(G.parent)G.parent.remove(G);for(const H of list)hrFree(H);}
    return true;}
  catch(err){hrEntFail('pg prewarm',err);return false;}}
/* a pack switch while inside purgatory: live purgatory mobs get their Hyperreal bodies (OG meshes stashed in e._og, so
   hrEntDisable puts the identical objects back on the way out) */
function hrPgSwapIn(){if(!HRE.on||HRE.broken||DIM!=='puppet'||!hrPgInstall())return 0;let n=0;
  for(const e of entities){if(e.t!=='mob'||e.dead||e.bot||!e.mesh||e.hrM||!HR_PMOB[e.mt])continue;
    const T=MOBT[e.mt];if(!T||!T.pmob)continue;
    const r=makeMobMesh(e.mt,{hr:1});if(!r||!r.hrM)continue;     /* P0-32 -> hrPgMobMesh */
    if(T.boss&&e.mt!=='demon')r.G.scale.set(1.5,1.4,1.5);
    e._og={G:e.mesh,legs:e.legs,mats:e.mats};scene.remove(e.mesh);
    e.mesh=r.G;e.legs=r.legs;e.mats=r.mats;e.hrM=r.hrM;r.hrM.pe=e;
    r.G.position.set(e.x,e.y,e.z);r.G.rotation.y=e.yaw||0;scene.add(r.G);n++;}
  HR_PST.swaps+=n;return n;}
function hrPgPack(id){try{
    if(id==='hr'&&HRE.on&&!HRE.broken&&DIM==='puppet'){hrPgPrewarm();hrPgSwapIn();}
    else HR_PST.warmDim=false;}
  catch(err){hrEntFail('pg pack',err);}}
/* the light module tells us when the dimension changes (a save loaded inside purgatory never passes mpArrive) */
function hrPgDim(dim){if(dim!=='puppet'){HR_PST.warmDim=false;return;}if(HRE.on&&!HRE.broken)hrPgPrewarm();}
/* P3's OG Felt Dan rig: Dan's own face rebuilt in felt, only when Hyperreal is live and the art is packed */
function hrPgFace(id){if(!HRE.on||!HRE.installed||HRE.broken)return null;
  const u=hrEntTexURL(id,'_basecolor.png');if(!u)return null;const r=hrEntImg(u);if(r.bad)return null;return hrEntLoadTex(u,true);}
function hrPgFistOwns(){if(!HRE.on||typeof plModel==='undefined'||!plModel||!plModel.hrM)return false;
  const vm=plModel.hrM.vm;return !!(vm&&vm.group&&handG&&handG.children.indexOf(vm.group)>=0);}
/* the felt-glove fist (bible 16.1): inside purgatory Dan's fist material wears fist_pg (an edit of fist_dan, same layout);
   outside it is fist_dan again. Swapped on the material the third-person model and the viewmodel share. tx: test seam. */
function hrPgFistTex(){if(HR_PST.fistTx||HR_PST.fistOff)return HR_PST.fistTx;
  const ub=hrEntTexURL('fist_pg','_basecolor.png'),db=hrEntTexURL('fist_dan','_basecolor.png');
  if(!ub||!db){HR_PST.fistOff=true;return null;}
  const un=hrEntTexURL('fist_pg','_normal.png'),dn=hrEntTexURL('fist_dan','_normal.png');
  HR_PST.fistTx={db:hrEntLoadTex(db,true),pb:hrEntLoadTex(ub,true),dn:dn?hrEntLoadTex(dn,false):null,pn:un?hrEntLoadTex(un,false):null};
  return HR_PST.fistTx;}
function hrPgFistSync(H,tx){if(!H||!H.hr)return false;const want=DIM==='puppet';if(H.pgFist===want&&!tx)return want;
  const a=tx||hrPgFistTex();H.pgFist=want;if(!a)return false;
  if(!H.pgFM){H.pgFM=[];const v=o=>{if(!o.isMesh)return;for(const m of [].concat(o.material))if(m&&(m.map===a.db||m.map===a.pb)&&H.pgFM.indexOf(m)<0)H.pgFM.push(m);};
    H.hr.root.traverse(v);if(H.vm&&H.vm.group)H.vm.group.traverse(v);}
  for(const m of H.pgFM){m.map=want?a.pb:a.db;if(a.pn&&a.dn&&m.normalMap)m.normalMap=want?a.pn:a.dn;}
  return want;}

tpOn('pack',hrPgPack);
Object.assign(TPEX,{
  getHRP:()=>({inst:HR_PST.inst,ok:HR_PST.ok,warmed:HR_PST.warmed,warmDim:HR_PST.warmDim,builds:HR_PST.builds,warms:HR_PST.warms,swaps:HR_PST.swaps,
    live:(typeof entities!=='undefined'?entities:[]).filter(e=>e.hrM&&!e.dead&&HR_PMOB[e.mt]).length}),
  /* test seams (headless suites and browser QA) */
  hrPg:{HR_PMOB,HR_PMOB_V,HR_PMOB_R,HR_PMODELS,HR_PST,hrPgInstall,hrPgBuildM,hrPgMobMesh,hrPgTick,hrPgPrewarm,hrPgSwapIn,hrPgFace,
    hrPgFistOwns,hrPgFistSync,hrPgDim,hrPgLocal}});
