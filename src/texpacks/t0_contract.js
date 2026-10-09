/* ---- PART 54: t0_contract.js ---- */
/* ===================================================================== */
/* PART 54 — TEXTURE PACKS (v6.0): OG / Hyperreal                        */
/* t0 contract (WP0, FROZEN). tA_ = world/assets/UI, tB_ = light/post, tC_ = cast */
/* ===================================================================== */
/* `var TP` is declared near the top of game.js by splice stage 2, so hooks can read it at any time.
   The export object is TPEX, NOT the plan's `TPX`: game.js:286 already has `const ATLAS=16, TPX=16`
   (atlas tile pixels), so TPX is the number 16 here and Object.assign(TPX,...) silently does nothing.
   Rules (plan section 1.3): no THREE constructors, Math.random, Date.now, performance.now or fetch at
   PART 54 top level or in any per-frame path while OG is active. Allocate in prepare()/enable().
   Module protocol: tpRegister({name, order, required, supported(), why(), async prepare(q,progress),
   enable(q), disable(), setQuality(q,prev), frame(dt)}). disable() must tolerate a partial enable().
   Beyond plan section 3.2 (all verified headless in t0_smoke and in the browser with og_parity {fakes:true}):
   queued setPack requests resolve (latest wins); tier changes made while busy are applied afterwards; a failed
   enable or a throwing frame() falls back to OG with one note; the renderer snapshot also covers autoClear, the
   clear colour and shadowMap.needsUpdate; per-mesh shadow flags are snapshotted and restored exactly (tpSnapF/
   tpRestoreF), which removes the plan's Shaders-mode water exemption; the hand is rebuilt only when empty (tpHand). */
const TPEX={};                                            /* merged into window.__vox (spread first: core keys win) */
const TPERR=[];                                           /* contract misuse found at load (asserted empty by t0_static) */
const HRQ=[{n:'Low'},{n:'Medium'},{n:'High'},{n:'Ultra'}];
function tpErr(msg){TPERR.push(msg);if(typeof console!=='undefined')console.warn('[TP] '+msg);}
function tpTierFields(o){for(const k in o){const v=o[k];
  if(!Array.isArray(v)||v.length!==4){tpErr('tier field '+k+' needs 4 values (Low, Medium, High, Ultra)');continue;}
  if(k in HRQ[0]){tpErr('tier field '+k+' declared twice');continue;}
  for(let i=0;i<4;i++)HRQ[i][k]=v[i];}}
function tpQ(){return HRQ[TP.qr]||HRQ[1];}
function tpRegister(m){
  if(!m||typeof m.name!=='string'||typeof m.enable!=='function'||typeof m.disable!=='function'){tpErr('tpRegister: a module needs name, enable() and disable()');return;}
  if(TP.mods.some(x=>x.name===m.name)){tpErr('module registered twice: '+m.name);return;}
  if(typeof m.order!=='number')m.order=50;
  TP.mods.push(m);TP.mods.sort((a,b)=>a.order-b.order);}
function tpOn(ev,fn){(TP.ev[ev]||(TP.ev[ev]=[])).push(fn);}
function tpEmit(ev,a){const L=TP.ev[ev];if(L)for(const f of L)try{f(a);}catch(e){console.warn('[TP] '+ev+' listener',e);}}
function hrRep(s,from,to,tag){if(s.indexOf(from)<0)throw new Error('[HR] shader anchor missing: '+tag);return s.replace(from,()=>to);}
function hrTag(m){if(m){m.userData=m.userData||{};m.userData.hr=1;}return m;}
function shadowsOn(){return SHD.on||(TP.hr&&TP.shadow);}
function tpNote(msg,quiet){if(!quiet&&typeof showToast==='function')showToast(msg);if(typeof console!=='undefined')console.log('[TP] '+msg);}
TP.warm=function(){};                                     /* B replaces on enable (compile + upload with the right render target) */
function tpCaps(){const c={webgl2:false,maxTex:0,maxLayers:0,floatRT:false,aniso:1,mobile:false};
  try{const R=renderer,cap=R&&R.capabilities;if(!cap)return c;
    c.webgl2=!!cap.isWebGL2;c.maxTex=cap.maxTextureSize|0;c.aniso=cap.getMaxAnisotropy?cap.getMaxAnisotropy():1;
    const gl=R.getContext&&R.getContext();if(gl&&c.webgl2)c.maxLayers=gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS)|0;
    const E=R.extensions,n=c.webgl2?'EXT_color_buffer_float':'EXT_color_buffer_half_float';
    c.floatRT=!!(E&&(E.has?E.has(n):(E.get&&E.get(n))));
    c.mobile=!!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);}catch(e){}
  return c;}
function tpAutoQ(){const c=tpCaps();return (c.mobile||!c.floatRT)?0:1;}   /* High/Ultra are opt-in only */
/* renderer snapshot/restore: everything Hyperreal may change on the renderer (OG never sets any of it) */
function tpSnapR(){const R=renderer,S=R.shadowMap||{};
  return {pr:R.getPixelRatio?R.getPixelRatio():Math.min(window.devicePixelRatio||1,2),
    pcl:R.physicallyCorrectLights,oe:R.outputEncoding,tm:R.toneMapping,tme:R.toneMappingExposure,ac:R.autoClear,
    ca:R.getClearAlpha?R.getClearAlpha():undefined,cc:(R.getClearColor&&THREE.Color)?R.getClearColor(new THREE.Color()).getHex():undefined,
    se:S.enabled,st:S.type,sau:S.autoUpdate,snu:S.needsUpdate,shd:SHD.on};}
function tpRestoreR(s){const R=renderer;R.physicallyCorrectLights=s.pcl;R.outputEncoding=s.oe;R.toneMapping=s.tm;R.toneMappingExposure=s.tme;
  R.autoClear=s.ac;
  if(s.cc!==undefined&&R.setClearColor)R.setClearColor(s.cc,s.ca);
  if(R.shadowMap){R.shadowMap.enabled=s.se;R.shadowMap.type=s.st;R.shadowMap.autoUpdate=s.sau;R.shadowMap.needsUpdate=s.snu;}
  if(R.setPixelRatio){const cv=R.domElement,pr=R.getPixelRatio?R.getPixelRatio():s.pr;
    if(pr!==s.pr||(cv&&(cv.width!==Math.floor(window.innerWidth*s.pr)||cv.height!==Math.floor(window.innerHeight*s.pr)))){
      R.setPixelRatio(s.pr);R.setSize(window.innerWidth,window.innerHeight);}}
  if(R.setRenderTarget)R.setRenderTarget(null);
  const nu=o=>{if(o.material)for(const m of [].concat(o.material))if(m)m.needsUpdate=true;};
  if(scene)scene.traverse(nu);if(SHD.scn)SHD.scn.traverse(nu);}            /* r128 keys programs on these flags */
/* per-mesh shadow flags. OG's are history-dependent (applyMesh: water receive-only; shadowify at spawn; applyShadows
   rewrites everything; refreshHand never shadowifies), so applyShadows(SHD.on) alone cannot put them back. */
function tpSnapF(){const F=new WeakMap();scene.traverse(o=>{if(o.isMesh)F.set(o,(o.castShadow?1:0)|(o.receiveShadow?2:0));});return F;}
function tpRestoreF(F){scene.traverse(o=>{if(!o.isMesh)return;const f=F.get(o);if(f!==undefined){o.castShadow=!!(f&1);o.receiveShadow=!!(f&2);}});
  if(SHD.on)for(const ch of chunks.values())if(ch.meshes)for(const m of ch.meshes)if(!F.has(m)&&m.material===matWat)m.castShadow=false;}  /* applyMesh's rule */
/* the hand differs between packs only when it is empty (C's fist), so only then is it rebuilt; a held block keeps
   its mesh (A's material swap reaches it under the camera) and so its OG shadow flags */
function tpHand(){if(typeof handG!=='undefined'&&handG&&(handKind===-1||handKind===null)){handKind=null;refreshHand();}}
/* setPack(id,{only:['world'|'light'|'ents'], quiet, progress}) resolves true iff the pack is `id` when it settles.
   A request made while busy is queued (latest wins); its promise resolves when it has run (superseded: false). */
async function setPack(id,opt){opt=opt||{};id=id==='hr'?'hr':'og';
  if(TP.busy){if(TP.want)TP.want[2](false);return new Promise(res=>{TP.want=[id,opt,res];});}
  if(id===TP.id&&(id==='hr')===TP.hr&&!opt.only)return true;     /* no-op: loadSettings runs repeatedly */
  TP.busy=true;
  try{if(id==='hr'){if(TP.hr)tpDisable();await tpEnable(opt);}else tpDisable();}
  catch(err){console.warn('[TP]',err);try{tpDisable();}catch(e){console.warn('[TP]',e);}
    if(id==='hr')tpNote('Hyperreal could not start: staying on OG',opt.quiet);}
  TP.busy=false;
  if(typeof syncSetUI==='function')syncSetUI();
  if(TP.want){const w=TP.want;TP.want=null;w[2](await setPack(w[0],w[1]));}
  else if(TP.hr&&(TP.q<0?tpAutoQ():TP.q)!==TP.qr)await setQuality(TP.q);   /* a tier change that arrived while busy */
  return TP.id===id;}
async function tpEnable(opt){
  if(!renderer||!scene){tpNote('Hyperreal needs a running game',true);return false;}
  const mods=TP.mods.filter(m=>!opt.only||opt.only.includes(m.name));
  if(!mods.length){tpNote('Hyperreal unavailable: '+(opt.only?'no module '+opt.only.join('/'):'not in this build'),opt.quiet);return false;}
  for(const m of mods)if(m.required&&!opt.only&&m.supported&&!m.supported()){tpNote('Hyperreal unavailable: '+(m.why?m.why():m.name),opt.quiet);return false;}
  const use=mods.filter(m=>!m.supported||m.supported());
  if(!use.length){tpNote('Hyperreal unavailable: '+(mods[0].why?mods[0].why():mods[0].name),opt.quiet);return false;}
  TP.qr=TP.q<0?tpAutoQ():TP.q;
  for(const m of use)if(m.prepare)await m.prepare(TP.qr,opt.progress||null);
  TP.ogR=tpSnapR();TP.ogF=tpSnapF();const xr=XR.on;if(xr){XR.on=false;xrayApply();}
  TP.live=[];
  try{for(const m of use){TP.live.push(m);m._tpErr=0;m.enable(TP.qr);}TP.hr=true;TP.id='hr';}
  finally{if(xr){XR.on=true;xrayApply();}}
  tpHand();
  try{TP.warm(scene);}catch(e){console.warn('[TP] warm',e);}
  tpEmit('pack','hr');return true;}
function tpDisable(){if(!TP.hr&&!TP.live.length&&!TP.ogR)return;   /* nothing to undo: OG stays untouched */
  const xr=XR.on;if(xr){XR.on=false;xrayApply();}
  try{for(const m of TP.live.slice().reverse())try{m.disable();}catch(e){console.warn('[TP]',m.name,e);}
    const s=TP.ogR;TP.live=[];if(s)tpRestoreR(s);TP.ogR=null;TP.hr=false;TP.id='og';TP.shadow=false;TP.warm=function(){};
    applyShadows(SHD.on);                                 /* OG's renderer/sun shadow state, and flags for meshes born in Hyperreal */
    const F=TP.ogF;TP.ogF=null;
    if(s&&s.shd===SHD.on){if(renderer.shadowMap)renderer.shadowMap.type=s.st;   /* applyShadows always picks PCFSoft */
      if(F)tpRestoreF(F);}                                /* exact pre-Hyperreal flags for every mesh that was there */
    if(playing&&P&&scene&&camera)updateSky(0);}
  finally{if(xr){XR.on=true;xrayApply();}}
  tpHand();
  tpEmit('pack','og');}
async function setQuality(q,opt){q=Math.max(-1,Math.min(3,q|0));TP.q=q;if(!TP.hr||TP.busy)return true;
  const qr=q<0?tpAutoQ():q,prev=TP.qr;if(qr===prev)return true;
  TP.busy=true;const done=[];
  try{for(const m of TP.live)if(m.prepare)await m.prepare(qr,(opt&&opt.progress)||null);
      TP.qr=qr;for(const m of TP.live){done.push(m);if(m.setQuality)m.setQuality(qr,prev);}
      try{TP.warm(scene);}catch(e){console.warn('[TP] warm',e);}}
  catch(e){console.warn('[TP]',e);TP.qr=prev;
    for(const m of done.reverse())try{if(m.setQuality)m.setQuality(prev,qr);}catch(e2){console.warn('[TP]',e2);}}
  TP.busy=false;tpEmit('quality',TP.qr);if(typeof syncSetUI==='function')syncSetUI();
  if(TP.want){const w=TP.want;TP.want=null;w[2](await setPack(w[0],w[1]));}
  else if(TP.hr&&TP.q!==q)await setQuality(TP.q,opt);      /* a newer tier request arrived while this one ran */
  return TP.qr===qr;}
/* contract frame step (hook in frame(), unpaused only). A module that throws drops the game back to OG. */
function tpFrame(dt){for(const m of TP.live)if(m.frame&&!m._tpErr){try{m.frame(dt);}catch(e){m._tpErr=1;console.warn('[TP] frame',m.name,e);
  tpNote('Hyperreal hit an error: back to OG');setPack('og');return;}}}
/* QA (browser only): identical-frame hash and a perf sampler (tpPerf needs a visible tab: it counts real frames) */
function tpRenderOnce(){if(TP.hr&&typeof hrRender==='function')hrRender();else if(SHD.on&&SHD.rt){renderer.setRenderTarget(SHD.rt);renderer.render(scene,camera);
  renderer.setRenderTarget(null);renderer.render(SHD.scn,SHD.cam);}else renderer.render(scene,camera);}
function tpHashFrame(){const gl=renderer.getContext();tpRenderOnce();const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(w*h*4);
  gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);let x=2166136261>>>0;for(let i=0;i<px.length;i++)x=Math.imul(x^px[i],16777619)>>>0;
  return x.toString(16)+'@'+w+'x'+h;}
function tpPerf(n){return new Promise(res=>{const t=[];let last=performance.now(),k=0;
  const step=()=>{const now=performance.now();t.push(now-last);last=now;if(++k<(n||300))requestAnimationFrame(step);else{t.sort((a,b)=>a-b);
    const I=renderer.info;res({avg:t.reduce((a,b)=>a+b,0)/t.length,p95:t[Math.floor(t.length*.95)],calls:I.render.calls,tris:I.render.triangles,
      programs:I.programs?I.programs.length:0,geos:I.memory.geometries,texs:I.memory.textures,tier:TP.hr?tpQ().n:'OG'});}};requestAnimationFrame(step);});}
Object.assign(TPEX,{setPack,setQuality,HRQ,tpCaps,tpAutoQ,tpHashFrame,tpPerf,tpRenderOnce,__tpx:TPEX,
  tpRegister,tpOn,tpEmit,tpTierFields,tpQ,hrRep,hrTag,shadowsOn,                    /* test seams */
  getTP:()=>({id:TP.id,q:TP.q,qr:TP.qr,hr:TP.hr,busy:TP.busy,want:TP.want?TP.want[0]:null,shadow:TP.shadow,
    mods:TP.mods.map(m=>m.name),live:TP.live.map(m=>m.name),errs:TPERR.slice()})});
