/* ---- PART 54: tC_adapter.js ---- */
/* ===================================================================== */
/* PART 54 — tC_adapter.js (Package C): the Hyperreal cast               */
/* 11 models (src/texpacks/models, spliced into hrLoadModels())          */
/* replace 7 mob types, Dan (third person + the first-person fist) and   */
/* the three AI players, with corpses so the death animations play.       */
/* ===================================================================== */
/* Module 'ents' (order 30, optional: if the cast cannot install, Hyperreal runs with OG mobs).
   Opt-in per call: only spawnMob asks makeMobMesh for a Hyperreal body ({hr:1}); figurines and every
   other caller stay OG. OG meshes are stashed at enable and come back as the identical objects.
   Files: tC_adapter (core, install, textures, prewarm, live swap), tC_mobs, tC_player, tC_bots, tC_corpse.
   Hooks: hooks_C.py (C1-C25). Nothing here runs in OG: every hook is guarded by HRE.on, e.hrM or M.hr.
   Textures: entity ids come from the embedded asset table (e:<id>|b|n|r) through HR.texURL/HR.loadTex,
   decoded once in prepare() and shared by every instance (one GPU upload per image). Without embedded
   entity art, an http page falls back to loose files: TP.devTexBase, else final_ent/ beside the page (an art workspace). */
var HRE={on:false,installed:false,broken:false,t:0,n:0,corpses:[],cx:0,cz:0,far2:9216,cow:null,cowT:0,
  F:null,MX:null,SP:null,shared:null,uses:null,ogPl:null,dummy:null,img:null,tex:null,texs:[],es:1,aniso:8,
  emb:false,devBase:null,warmG:null,prewarmed:false,ps:null,pH:null,psF:-1,pAtk:0,pSw:0,mineT:0};
const HR_MOB={zombie:'zombie',skel:'skeleton',boomer:'boomer',spider:'spider',pig:'pig',cow:'cow',sheep:'sheep'};   /* alien: no HR model (renders OG in Hyperreal) */
const HR_BOT={BunkerBrad:'bunkerbrad',xx_lilcreepah_xx:'lilcreepah',honeybee_mc:'honeybee'};   /* names = AG_DEF keys */
const HR_CAST=['player','bunkerbrad','lilcreepah','honeybee','zombie','boomer','skeleton','spider','pig','cow','sheep'];
const HR_SUF={_basecolor:'b',_normal:'n',_roughness:'r'};
const hrWrap=a=>a-6.283185307179586*Math.round(a/6.283185307179586);   /* e.yaw is unbounded; OG ((x+3π)%2π)−π breaks below −3π */
const hrC25=v=>v>25?25:(v<-25?-25:v);
const hrClampE=(v,a,b)=>v<a?a:(v>b?b:v);
tpTierFields({lod0:[16,24,32,40],shadowR:[0,16,24,32],entScale:[.5,1,1,1],corpses:[4,8,8,8]});

/* ---- per-instance animation state (rig.js contract, extended: see the model headers) ---- */
function hrS(seed){return {speed:0,attack:0,hurt:0,dead:0,yaw:0,pitch:0,seed,fuse:0,cd:0,near:99,accel:new THREE.Vector3(),
  fired:false,woodHit:false,blockHit:false,build:false,plant:false,grief:false,mood:undefined,talk:false,hp:1,periscope:false,headroom:3};}
/* geometry/material use counts: anything seen in two instances is a module cache (never disposed by hrFree) */
function hrEntUse(o){if(!o||HRE.shared.has(o))return;const n=(HRE.uses.get(o)||0)+1;HRE.uses.set(o,n);if(n>1)HRE.shared.add(o);}
function hrBuild(name){if(!HRE.installed||HRE.broken||!window.HR||!HR.MODELS||!HR.MODELS[name])return null;
  let hr;try{hr=HR.MODELS[name]();}catch(err){console.warn('[HR]',name,err);return null;}
  if(!hr||!hr.root||typeof hr.update!=='function')return null;
  const meshes=[],tiny=[],own=new Set();
  const tagM=o=>{if(!o.isMesh)return;o.userData.hr=1;o.userData.cs=o.castShadow;for(const m of [].concat(o.material))hrTag(m);};
  hr.root.traverse(o=>{if(!o.isMesh)return;tagM(o);meshes.push(o);own.add(o.geometry);for(const m of [].concat(o.material))own.add(m);
    const g=o.geometry;if(g&&!g.boundingSphere&&g.computeBoundingSphere)g.computeBoundingSphere();
    if(g&&g.boundingSphere&&g.boundingSphere.radius<0.05)tiny.push(o);});   /* geometry radius, not scale: skeleton bones start at scale 0 */
  for(const o of own)hrEntUse(o);                          /* once per instance: a material on 5 meshes is still this instance's own */
  return {hr,name,s:hrS(1+(Math.random()*997|0)),pv:new THREE.Vector3(),k:HRE.n++,acc:0,lod:-1,meshes,tiny,G:null,r:2,
    pSw:0,pinT:0,pPl:-1,hfT:0,vm:null,tagM};}
/* the materials the game may flash (hurtMob red, boomer white strobe, agHurt): this instance's own clones only,
   never a shared cache, never one with authored emissive (the boomer's core, Brad's lenses, eyeshine) */
function hrEntFlashMats(H){const out=[];for(const m of H.hr.mats||[]){if(!m||!m.emissive||HRE.shared.has(m)||out.includes(m))continue;
  const e=m.emissive;if(e.r+e.g+e.b>0||m.emissiveMap)continue;out.push(m);}return out;}
function hrAccel(H,vx,vy,vz,dt){const k=1/Math.max(dt,1/120),A=H.s.accel;
  A.x+=(hrC25((vx-H.pv.x)*k)-A.x)*.5;A.y+=(hrC25((vy-H.pv.y)*k)-A.y)*.5;A.z+=(hrC25((vz-H.pv.z)*k)-A.z)*.5;H.pv.set(vx,vy,vz);}
/* hook C9: start of updateEntities (unpaused only). Frustum, fog-far cull distance, the periscope cow. */
function hrEntFrame(dt){HRE.t+=dt;if(!HRE.on||!camera||!HRE.F)return;
  try{HRE.MX.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);HRE.F.setFromProjectionMatrix(HRE.MX);
    HRE.cx=camera.position.x;HRE.cz=camera.position.z;const f=scene&&scene.fog?scene.fog.far:RD*CH;HRE.far2=(f+4)*(f+4);
    if((HRE.cowT-=dt)<=0){HRE.cowT=0.5;HRE.cow=hrNearestCow();}}catch(err){hrEntFail('frame',err);}}
function hrSetLod(H,lod){H.lod=lod;for(const o of H.tiny)o.layers.set(lod===2?1:0);for(const o of H.meshes)o.castShadow=lod===0&&!!o.userData.cs;}
/* one model step: distance cull, LOD (shadows + tiny parts only: no visible pop), view/distance-throttled update */
function hrStep(H,dt,x,y,z,r){const q=tpQ();H.acc+=dt;const dx=x-HRE.cx,dz=z-HRE.cz,d2=dx*dx+dz*dz,show=d2<HRE.far2;
  if(H.G.visible!==show)H.G.visible=show;if(!show)return;
  HRE.SP.center.set(x,y+r*.5,z);HRE.SP.radius=r;const inView=HRE.F.intersectsSphere(HRE.SP);
  const lod=d2<q.shadowR*q.shadowR?0:(d2<q.lod0*q.lod0?1:2);if(lod!==H.lod)hrSetLod(H,lod);
  const every=!inView?8:(d2<2304?1:4);if((frameCount+H.k)%every)return;
  try{H.hr.update(Math.min(H.acc,.1),HRE.t,H.s);}catch(err){if(!H.err){H.err=1;console.warn('[HR] update',H.name,err);}}
  H.acc=0;
  const s=H.s;s.fired=s.woodHit=s.blockHit=s.build=s.plant=s.grief=false;}   /* events are latched until an update actually runs */
/* dispose this instance's own geometries/materials (textures and module caches are shared: never disposed).
   Only the model's own meshes: tools, hats and armour the game hung on its joints are OG objects. */
function hrFree(H){if(!H||H.freed)return;H.freed=1;
  const f=o=>{if(!o.isMesh)return;if(o.geometry&&!HRE.shared.has(o.geometry))o.geometry.dispose();
    for(const m of [].concat(o.material))if(m&&!HRE.shared.has(m))m.dispose();};
  for(const o of H.meshes)f(o);if(H.vm&&H.vm.group){H.vm.group.traverse(f);if(H.vm.group.parent)H.vm.group.parent.remove(H.vm.group);}}

/* ---- textures: one decoded image and one THREE.Texture per URL, shared by every model and instance ---- */
function hrEntAsset(key){
  if(typeof tpAssetURL==='function'){const u=tpAssetURL(key);if(u)return u;}
  if(typeof hrAssets==='function'){const T=hrAssets();return (T&&T[key])||null;}
  return null;}
function hrEntTexURL(id,suf){const k=HR_SUF[String(suf).replace('.png','')];const u=k?hrEntAsset('e:'+id+'|'+k):null;
  if(u)return u;return HRE.devBase?HRE.devBase+id+suf:'';}
function hrEntImg(url){let r=HRE.img.get(url);if(r)return r;
  r={img:null,bad:false,half:null,p:null};HRE.img.set(url,r);
  r.p=new Promise(res=>{const im=new Image();let done=false;
    const ok=()=>{if(done)return;done=true;if(im.naturalWidth||im.width){r.img=im;res(im);}else{r.bad=true;res(null);}};
    const bad=()=>{if(done)return;done=true;r.bad=true;res(null);};
    im.onload=ok;im.onerror=bad;im.src=url;                 /* onload or decode(), whichever is first: decode() never */
    if(im.decode)im.decode().then(ok,()=>{});});           /* settles in a hidden tab, and a rejection leaves it to onload */
  return r;}
/* Low tier (entScale 0.5): entity textures are drawn into half-size canvases first */
function hrEntScaled(r){return HRE.es>=1?r.img:hrEntHalf(r);}
function hrEntHalf(r){if(!r.img)return null;
  if(!r.half){const w=Math.max(1,Math.round((r.img.naturalWidth||r.img.width)*0.5)),h=Math.max(1,Math.round((r.img.naturalHeight||r.img.height)*0.5));
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(r.img,0,0,w,h);r.half=c;}
  return r.half;}
function hrEntLoadTex(url,srgb,onFail){
  if(!url){const t=new THREE.Texture();if(onFail)Promise.resolve().then(onFail);return t;}
  let e=HRE.tex.get(url);if(!e){e={};HRE.tex.set(url,e);}
  const k=srgb?'s':'l';let E=e[k];
  if(!E){const t=new THREE.Texture();t.anisotropy=HRE.aniso;if(srgb)t.encoding=THREE.sRGBEncoding;
    E=e[k]={t,r:hrEntImg(url),fails:[]};HRE.texs.push(E);
    const set=()=>{const im=hrEntScaled(E.r);if(im){t.image=im;t.needsUpdate=true;}else{const F=E.fails;E.fails=null;for(const f of F)try{f();}catch(x){}}};
    if(E.r.img||E.r.bad)set();else E.r.p.then(set);}
  if(onFail){if(E.fails)E.fails.push(onFail);else if(E.r.bad)Promise.resolve().then(onFail);}
  return E.t;}
function hrEntLoadImg(url,cb){if(!url)return;const r=hrEntImg(url);if(r.img)cb(r.img);else r.p.then(im=>{if(im)cb(im);});}
function hrEntRescale(es){es=es<1?0.5:1;if(es===HRE.es)return;HRE.es=es;
  for(const E of HRE.texs){const im=hrEntScaled(E.r);if(im&&E.t.image!==im){E.t.image=im;E.t.needsUpdate=true;}}}

/* ---- install (prepare: async, no scene changes) ---- */
function hrEntAlloc(){if(HRE.F)return;
  HRE.F=new THREE.Frustum();HRE.MX=new THREE.Matrix4();HRE.SP=new THREE.Sphere();
  HRE.shared=new WeakSet();HRE.uses=new WeakMap();HRE.dummy=new THREE.Group();HRE.img=new Map();HRE.tex=new Map();}
function hrEntCanInstall(){return !HRE.broken&&typeof THREE!=='undefined'&&typeof THREE.Frustum==='function'&&
  (HRE.installed||typeof hrLoadModels==='function');}
async function hrEntInstall(q){
  if(HRE.broken)return;
  try{hrEntAlloc();
    const es=(HRQ[q]&&HRQ[q].entScale)||1;
    if(!HRE.installed){
      const meta=typeof hrAssetMeta==='function'?hrAssetMeta():null,ents=(meta&&meta.ents)||[];
      HRE.emb=ents.length>0;
      const http=typeof location!=='undefined'&&/^https?:/.test(location.protocol||'');
      HRE.devBase=TP.devTexBase||(!HRE.emb&&http?'final_ent/':null);
      HRE.aniso=Math.min(8,tpCaps().aniso||1);
      const H=window.HR=window.HR||{};
      H.EMBEDDED=HRE.emb;H.TEXBASE=HRE.emb?'embedded:':(HRE.devBase||'');
      H.texURL=hrEntTexURL;H.loadTex=hrEntLoadTex;H.loadImg=hrEntLoadImg;
      /* decode every embedded entity image first, so textures are assigned synchronously at build time */
      const P=[];for(const id of ents)for(const s of ['_basecolor.png','_normal.png','_roughness.png']){const u=hrEntTexURL(id,s);if(u)P.push(hrEntImg(u).p);}
      await Promise.all(P);
      if(!(H.MODELS&&H.MODELS.player))hrLoadModels();         /* rig.js + 12 models: registers HR.MODELS (once) */
      if(H.setAnisotropy)H.setAnisotropy(HRE.aniso);
      HRE.installed=true;
      const miss=HR_CAST.filter(n=>!H.MODELS||!H.MODELS[n]);
      if(miss.length)console.warn('[HR] cast models missing: '+miss.length);}
    if(es<1)for(const r of HRE.img.values())hrEntHalf(r);  /* Low: pre-scale before the swap */
  }catch(err){HRE.broken=true;console.warn('[HR] the cast could not install: Hyperreal runs with OG mobs',err);}}
/* test seam (headless): installed with stub-friendly fakes, no hrLoadModels(); window.HR.MODELS comes from fake_models.js */
function hrInstallFake(){hrEntAlloc();HRE.installed=true;HRE.broken=false;
  HRE.F={setFromProjectionMatrix(){},intersectsSphere:()=>true};HRE.MX={multiplyMatrices(){}};HRE.SP={center:{set(){}},radius:0};}

/* ---- prewarm: every model built twice (module caches found), one set compiled + uploaded through TP.warm ---- */
function hrEntPrewarm(){
  const G=new THREE.Group(),list=[];G.name='hr_prewarm';
  for(const n of HR_CAST){const a=hrBuild(n);if(!a)continue;
    if(!HRE.prewarmed){const b=hrBuild(n);if(b){if(n==='player')hrEntVM(b);hrFree(b);}}
    if(n==='player')hrEntVM(a);
    a.hr.root.position.set((list.length-5.5)*1.6,0,0);G.add(a.hr.root);if(a.vm)G.add(a.vm.group);list.push(a);}
  HRE.prewarmed=true;
  /* 7 m in front of the camera so the warm render (B: 64x64 target of the scene's type) sees and uploads it */
  const ry=camera?camera.rotation.y:0,rx=camera?camera.rotation.x:0,c=Math.cos(rx);
  if(camera)G.position.set(camera.position.x-Math.sin(ry)*c*7,camera.position.y+Math.sin(rx)*7-1,camera.position.z-Math.cos(ry)*c*7);
  G.rotation.y=ry;scene.add(G);HRE.warmG={G,list};}
function hrEntWarmDone(){const W=HRE.warmG;if(!W)return;HRE.warmG=null;scene.remove(W.G);for(const H of W.list)hrFree(H);}
/* the first-person fist: player.js viewmodel(), built once per player model and shared with its fist state */
function hrEntVM(H){if(H.vm||!H.hr.viewmodel)return H.vm;
  try{H.vm=H.hr.viewmodel();}catch(err){console.warn('[HR] viewmodel',err);H.vm=null;}
  if(H.vm&&H.vm.group)H.vm.group.traverse(o=>{if(!o.isMesh)return;H.tagM(o);hrEntUse(o.geometry);});
  return H.vm;}

/* a cast bug must never stop the game loop: every per-frame hook body is guarded, and the first error puts the OG
   bodies back (the rest of Hyperreal stays live) with one note. The 'ents' module stays listed: its disable() is idempotent. */
function hrEntFail(where,err){if(HRE.broken)return;console.warn('[HR] cast error in '+where+': OG mobs from here',err);
  try{hrEntDisable();}catch(e){console.warn('[HR]',e);}HRE.broken=true;tpNote('The Hyperreal cast hit an error: OG mobs from here');}

/* ---- live swap ---- */
function hrEntEnable(q){
  if(HRE.broken||!HRE.installed||!scene)return;
  try{hrEntSwapIn(q);}catch(err){hrEntFail('enable',err);}}
function hrEntSwapIn(q){
  HRE.on=true;hrEntRescale((HRQ[q]&&HRQ[q].entScale)||1);
  hrEntPrewarm();                                           /* removed again on the 'pack' event, after TP.warm(scene) */
  for(const e of entities){if(e.t!=='mob'||e.dead||!e.mesh)continue;
    if(e.bot){hrBotSwapIn(e);continue;}
    if(!HR_MOB[e.mt]||e.hrM)continue;
    const r=makeMobMesh(e.mt,{hr:1});if(!r||!r.hrM)continue;
    e._og={G:e.mesh,legs:e.legs,mats:e.mats};scene.remove(e.mesh);
    e.mesh=r.G;e.legs=r.legs;e.mats=r.mats;e.hrM=r.hrM;
    r.G.position.set(e.x,e.y,e.z);r.G.rotation.y=e.yaw;scene.add(r.G);}
  if(typeof plModel!=='undefined'&&plModel&&!plModel.hr){HRE.ogPl=plModel;scene.remove(plModel.G);plModel=null;}}
function hrEntDisable(){
  hrEntWarmDone();
  if(HRE.corpses.length)hrClearCorpses();
  for(const e of entities){if(e.t!=='mob'||e.dead)continue;
    if(e.bot){hrBotSwapOut(e);continue;}
    if(!e.hrM)continue;
    if(e.mesh)scene.remove(e.mesh);hrFree(e.hrM);e.hrM=null;
    let G,legs,mats;
    if(e._og){({G,legs,mats}=e._og);e._og=null;}          /* the identical OG objects, transform untouched (a frozen mob never set it) */
    else{({G,legs,mats}=makeMobMesh(e.mt));if(MOBT[e.mt].boss&&e.mt!=='demon')G.scale.set(1.5,1.4,1.5);shadowify(G);   /* born in Hyperreal */
      G.position.set(e.x,e.y,e.z);G.rotation.y=e.yaw;}
    e.mesh=G;e.legs=legs;e.mats=mats;scene.add(G);}
  if(typeof plModel!=='undefined'){
    if(plModel&&plModel.hr){scene.remove(plModel.G);hrFree(plModel.hrM);plModel=null;}
    if(HRE.ogPl){plModel=HRE.ogPl;HRE.ogPl=null;scene.add(plModel.G);}}
  HRE.on=false;}
function hrEntQuality(q,prev){
  hrEntRescale((HRQ[q]&&HRQ[q].entScale)||1);
  const cap=(HRQ[q]&&HRQ[q].corpses)||8;while(HRE.corpses.length>cap)hrCorpseEnd(HRE.corpses.shift());
  for(const e of entities)if(e.hrM)e.hrM.lod=-1;}          /* LOD radii changed: re-evaluate on the next step */

tpRegister({name:'ents',order:30,required:false,
  supported:hrEntCanInstall,
  why:()=>HRE.broken?'the cast failed to install':'the cast is not in this build',
  async prepare(q){await hrEntInstall(q);},
  enable(q){hrEntEnable(q);},
  disable(){hrEntDisable();},
  setQuality(q,prev){hrEntQuality(q,prev);}});
tpOn('pack',hrEntWarmDone);

Object.assign(TPEX,{
  getHRE:()=>({on:HRE.on,installed:HRE.installed,broken:HRE.broken,corpses:HRE.corpses.length,emb:HRE.emb,
    models:Object.keys((typeof window!=='undefined'&&window.HR&&window.HR.MODELS)||{}),textures:HRE.texs.length,es:HRE.es,
    live:(typeof entities!=='undefined'?entities:[]).filter(e=>e.hrM&&!e.dead).length,player:!!(typeof plModel!=='undefined'&&plModel&&plModel.hr)}),
  hrCorpseCount:()=>HRE.corpses.length,
  hrInstallFake,
  /* test seams (headless suites and browser QA): internals, never used by the game */
  hrEnt:{HRE,HR_MOB,HR_BOT,HR_CAST,hrWrap,hrS,hrBuild,hrStep,hrFree,hrAccel,hrMobAmax,hrMobPitch,hrHeadroom,hrNearestCow,
    hrEntFlashMats,hrEntTexURL,hrEntLoadTex,hrEntRescale,hrClearCorpses,hrPlayerState,
    mk:(mt,o)=>makeMobMesh(mt,o),pl:()=>plModel,hand:()=>handG,cam:()=>camMode}});
