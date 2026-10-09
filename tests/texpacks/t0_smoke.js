/* t0_smoke.js (WP0): the setPack / setQuality lifecycle against fake modules on a real seed-1337 world.
   Every pack switch here uses opt.only with this suite's own fake modules, so the real world/light/ents
   modules (which are unsupported headless) never run. Frames start at 500000 and only increase. */
'use strict';
const boot=require('../lib/hr_boot.js'),{ok}=boot;
const V=boot({});
const step=boot.stepper(500000);
const R=boot.renderer(),S=boot.scene();

const LOG=[];
const mk=(name,order,extra)=>Object.assign({name,order,required:false,supported:()=>true,frames:0,
  async prepare(q){LOG.push(name+':prepare:'+q);},
  enable(q){LOG.push(name+':enable:'+q+':xr'+V.getXR().on);},
  disable(){LOG.push(name+':disable:xr'+V.getXR().on);},
  setQuality(q,p){LOG.push(name+':quality:'+q+':'+p);},
  frame(){this.frames++;}},extra||{});
const rflags=()=>JSON.stringify([R.physicallyCorrectLights,R.outputEncoding,R.toneMapping,R.toneMappingExposure,R.autoClear,
  R.shadowMap.enabled,R.shadowMap.type,R.shadowMap.autoUpdate]);
const opMats=()=>{const s=new Set();for(const ch of V.chunks.values())if(ch.meshes)for(const m of ch.meshes)if(m.renderOrder===0)s.add(m.material);return [...s];};
const matFlags=m=>JSON.stringify([m.transparent,m.opacity,m.depthWrite,m._xo===undefined]);
const notes=fn=>boot.capture('[TP] ',fn);
const handOK=()=>{const st=V.P.inv[V.P.sel];const h=V.getHand();return h.kind===(st?st.id:-1);};

boot.run(async()=>{
  V.startNewWorld('t0smoke','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;
  step(160);
  ok('a world boots on OG',!!V.P&&V.getTP().id==='og');
  const R0=rflags(),shadow0=V.getShadow(),shd0=V.getSHD().on;

  /* fakes: registered out of order on purpose (f2 first) */
  const f2=mk('t0f2',25),f1=mk('t0f1',15,{enable(q){LOG.push('t0f1:enable:'+q+':xr'+V.getXR().on);
    R.physicallyCorrectLights=true;R.outputEncoding=3001;R.toneMapping=4;R.toneMappingExposure=1.3;R.autoClear=false;
    R.shadowMap.enabled=true;R.shadowMap.autoUpdate=false;}});
  V.tpRegister(f2);V.tpRegister(f1);
  ok('modules are kept sorted by order',V.getTP().mods.indexOf('t0f1')<V.getTP().mods.indexOf('t0f2'));
  const packEv=[];V.tpOn('pack',p=>packEv.push(p));

  /* ---- OG -> Hyperreal ---- */
  LOG.length=0;
  ok('setPack(hr) with the fakes resolves true',await V.setPack('hr',{only:['t0f1','t0f2']})===true);
  let tp=V.getTP();
  ok('Hyperreal is live with both fakes, in order',tp.id==='hr'&&tp.hr===true&&tp.live.join()==='t0f1,t0f2');
  ok('prepare runs for every module before any enable (ascending order)',LOG.join()==='t0f1:prepare:0,t0f2:prepare:0,t0f1:enable:0:xrfalse,t0f2:enable:0:xrfalse');
  ok('Auto resolves to Low headless (no float render targets)',tp.q===-1&&tp.qr===0&&V.tpQ().n==='Low');
  ok('the hand is rebuilt for the new pack',handOK());
  step(20);
  ok('module frame() runs every unpaused Hyperreal frame',f1.frames===20&&f2.frames===20);
  V.pauseGame();step(10);
  ok('module frame() does not run while paused',f1.frames===20);
  V.resumeGame();step(2);

  /* ---- quality ---- */
  LOG.length=0;
  ok('setQuality(2) resolves true',await V.setQuality(2)===true);
  ok('setQuality re-prepares, then switches every live module (q, prev)',LOG.join()==='t0f1:prepare:2,t0f2:prepare:2,t0f1:quality:2:0,t0f2:quality:2:0'&&V.getTP().qr===2&&V.tpQ().n==='High');
  LOG.length=0;await V.setQuality(2);
  ok('an unchanged tier is a no-op',LOG.length===0);
  await V.setQuality(-1);
  ok('Auto goes back to the resolved tier',V.getTP().q===-1&&V.getTP().qr===0);

  /* ---- Hyperreal -> OG ---- */
  LOG.length=0;
  ok('setPack(og) resolves true',await V.setPack('og')===true);
  tp=V.getTP();
  ok('OG again, nothing live',tp.id==='og'&&tp.hr===false&&tp.live.length===0&&tp.shadow===false);
  ok('disable runs in reverse order',LOG.join()==='t0f2:disable:xrfalse,t0f1:disable:xrfalse');
  ok('the renderer is restored exactly',rflags()===R0);
  ok('shadow state is OG again',V.getShadow()===shadow0&&V.getSHD().on===shd0);
  ok('the hand is rebuilt for OG',handOK());
  const fr=f1.frames;step(10);
  ok('no module frame() in OG',f1.frames===fr);
  ok('pack events fire hr then og',packEv.join()==='hr,og');
  LOG.length=0;
  ok('setPack(og) on OG is a no-op',await V.setPack('og')===true&&LOG.length===0);

  /* ---- X-ray stays correct across the switch ---- */
  const M0=opMats();ok('found the OG opaque chunk material',M0.length===1);
  const flags0=matFlags(M0[0]);
  V.toggleXray();step(2);
  const ghost=matFlags(M0[0]);
  LOG.length=0;await V.setPack('hr',{only:['t0f1']});
  ok('modules enable with X-ray temporarily off, then X-ray is back on',LOG.includes('t0f1:enable:0:xrfalse')&&V.getXR().on===true);
  await V.setPack('og');
  ok('modules disable with X-ray temporarily off',LOG.includes('t0f1:disable:xrfalse')&&V.getXR().on===true);
  ok('the OG material is ghosted exactly as before the switch',matFlags(M0[0])===ghost);
  V.toggleXray();step(2);
  ok('X-ray off restores the OG material flags',matFlags(M0[0])===flags0);

  /* ---- Shaders on before Hyperreal ---- */
  V.setShaders(true);step(2);
  await V.setPack('hr',{only:['t0f1']});R.shadowMap.enabled=false;
  await V.setPack('og');
  ok('Shaders mode survives a Hyperreal round trip (shadows back on)',V.getSHD().on===true&&V.getShadow()===true);
  /* ---- exact OG shadow flags survive a round trip with Shaders on (they are history-dependent in OG) ---- */
  THREE.Mesh.prototype.isMesh=true;   /* this process only: the root stub Mesh lacks isMesh, so applyShadows would skip every mesh */
  V.setShaders(true);step(2);
  V.P.inv[V.P.sel]={id:V.B.STONE,count:4};V.refreshHand();step(1);   /* built after the toggle: OG never shadowifies it */
  const cam=(()=>{let c=null;S.traverse(o=>{if(!c&&o instanceof THREE.PerspectiveCamera)c=o;});return c;})();
  const handMeshes=()=>{const L=[];if(cam)cam.traverse(o=>{if(o.isMesh)L.push(o);});return L;};
  const hm0=handMeshes();
  const F0=new Map();S.traverse(o=>{if(o.isMesh)F0.set(o,(o.castShadow?'c':'-')+(o.receiveShadow?'r':'-'));});
  const watCh=[...V.chunks.values()].find(ch=>ch.meshes&&ch.meshes.some(m=>m.renderOrder===2)&&ch.meshes.some(m=>m.renderOrder===0));
  ok('setup: a held block that does not cast, plus a chunk with water',hm0.length===1&&hm0[0].castShadow===false&&!!watCh&&F0.size>50);
  const wild=mk('t0wild',45,{enable(){LOG.push('t0wild:enable');S.traverse(o=>{if(o.isMesh){o.castShadow=!o.castShadow;o.receiveShadow=!o.receiveShadow;}});}});
  V.tpRegister(wild);
  await V.setPack('hr',{only:['t0wild']});
  ok('the held block keeps its mesh object across the switch',handMeshes()[0]===hm0[0]);
  watCh.dirty=true;step(4);                                          /* a water chunk re-meshed while Hyperreal is on */
  const born=watCh.meshes.filter(m=>!F0.has(m));
  await V.setPack('og');
  let back=0,wrong=[];S.traverse(o=>{if(!o.isMesh||!F0.has(o))return;const f=(o.castShadow?'c':'-')+(o.receiveShadow?'r':'-');if(f===F0.get(o))back++;else wrong.push(f+'!='+F0.get(o));});
  ok('every mesh that was there gets its exact OG shadow flags back ('+back+' meshes)',back>50&&wrong.length===0||(console.log('  wrong: '+wrong.slice(0,5).join(' ')),false));
  ok('the held block is the same mesh and still does not cast',handMeshes()[0]===hm0[0]&&hm0[0].castShadow===false);
  const bw=born.filter(m=>m.renderOrder===2),bo=born.filter(m=>m.renderOrder===0);
  ok('chunk meshes born in Hyperreal follow applyMesh: water receive-only, opaque cast+receive',bw.length===1&&bo.length===1&&
    !bw[0].castShadow&&bw[0].receiveShadow&&bo[0].castShadow&&bo[0].receiveShadow);
  V.P.inv[V.P.sel]=null;V.refreshHand();
  V.setShaders(false);step(2);
  const R1=rflags();   /* OG's own Shaders toggle leaves shadowMap.type set: compare against this from here on */

  /* ---- busy: requests queue, the latest wins ---- */
  let rel;const slow=mk('t0slow',40,{hold:true,prepare(q){LOG.push('t0slow:prepare:'+q);if(!this.hold)return;this.hold=false;return new Promise(r=>{rel=r;});}});
  V.tpRegister(slow);
  LOG.length=0;
  const p1=V.setPack('hr',{only:['t0slow']});
  ok('a switch in progress reports busy',V.getTP().busy===true);
  const p2=V.setPack('og');
  ok('a request made while busy is queued',V.getTP().want==='og');
  await V.setQuality(3);
  ok('a tier change while busy is only remembered',V.getTP().q===3);
  rel();const r1=await p1,r2=await p2;
  ok('the queued OG request wins (hr resolves false, og true)',r1===false&&r2===true&&V.getTP().id==='og');
  ok('the slow module was enabled then disabled',LOG.join()==='t0slow:prepare:0,t0slow:enable:0:xrfalse,t0slow:disable:xrfalse');
  LOG.length=0;slow.hold=true;
  const q1=V.setPack('hr',{only:['t0slow']}),q2=V.setPack('og'),q3=V.setPack('hr',{only:['t0slow']});
  rel();const [a1,a2,a3]=await Promise.all([q1,q2,q3]);
  ok('a superseded queued request resolves false; the last one runs',a2===false&&a3===true&&V.getTP().id==='hr'&&V.getTP().live.join()==='t0slow');
  await V.setPack('og');
  await V.setQuality(-1);

  /* ---- a tier change made while another tier change is running is applied afterwards ---- */
  slow.hold=false;await V.setPack('hr',{only:['t0slow']});
  LOG.length=0;slow.hold=true;
  const s1=V.setQuality(1);
  ok('a tier change in progress reports busy',V.getTP().busy===true);
  const s2=V.setQuality(3);
  rel();const [b1,b2]=await Promise.all([s1,s2]);
  ok('the newer tier wins once the running change settles',V.getTP().qr===3&&V.getTP().q===3&&b1===false&&b2===true);
  ok('both tier changes ran in order',LOG.join()==='t0slow:prepare:1,t0slow:quality:1:0,t0slow:prepare:3,t0slow:quality:3:1');
  await V.setPack('og');
  await V.setQuality(-1);

  /* ---- re-enable with a different module set ---- */
  await V.setPack('hr',{only:['t0f1']});LOG.length=0;
  await V.setPack('hr',{only:['t0f2']});
  ok('switching module sets disables the old set first',LOG.join()==='t0f1:disable:xrfalse,t0f2:prepare:0,t0f2:enable:0:xrfalse'&&V.getTP().live.join()==='t0f2');
  await V.setPack('og');

  /* ---- failures leave OG intact and say so once ---- */
  const bad=mk('t0bad',30,{enable(){LOG.push('t0bad:enable');throw new Error('t0 deliberate enable failure');}});
  V.tpRegister(bad);
  LOG.length=0;let ok1;
  const n1=await notes(async()=>{const w=console.warn;console.warn=()=>{};try{ok1=await V.setPack('hr',{only:['t0f1','t0bad']});}finally{console.warn=w;}});
  ok('an enable() that throws resolves false and stays OG',ok1===false&&V.getTP().id==='og'&&V.getTP().live.length===0);
  ok('the modules already enabled (and the failing one) are disabled',LOG.join()==='t0f1:prepare:0,t0bad:prepare:0,t0f1:enable:0:xrfalse,t0bad:enable,t0bad:disable:xrfalse,t0f1:disable:xrfalse');
  ok('the renderer is restored after a failed enable',rflags()===R1);
  ok('exactly one note for the failure',n1.length===1&&/could not start/.test(n1[0]));
  const req=mk('t0req',5,{required:true,supported:()=>false,why:()=>'needs a t0 miracle'});
  V.tpRegister(req);
  LOG.length=0;let ok2;
  const n2=await notes(async()=>{ok2=await V.setPack('hr');});
  ok('an unsupported required module refuses Hyperreal (no prepare, no enable)',ok2===false&&V.getTP().id==='og'&&LOG.length===0);
  ok('exactly one note when unsupported',n2.length===1&&/unavailable/.test(n2[0]));
  const n3=await notes(async()=>{ok2=await V.setPack('hr',{only:['nope']});});
  ok('an unknown module set refuses Hyperreal with one note',ok2===false&&n3.length===1&&V.getTP().id==='og');

  /* ---- a module that throws in frame() drops the game back to OG ---- */
  const boom=mk('t0boom',35,{frame(){if(++this.frames===3)throw new Error('t0 deliberate frame failure');}});
  V.tpRegister(boom);
  await V.setPack('hr',{only:['t0boom']});
  let n4;{const w=console.warn;console.warn=()=>{};try{n4=await notes(async()=>{step(6);await new Promise(r=>setImmediate(r));});}finally{console.warn=w;}}
  ok('a frame() error falls back to OG with one note',V.getTP().id==='og'&&n4.length===1&&/back to OG/.test(n4[0]));
  ok('the failing module stopped ticking',boom.frames===3);

  /* ---- OG survives, nothing left over ---- */
  step(40);
  ok('OG keeps running after all of that',!!V.P&&V.P.hp>0&&V.getTP().id==='og'&&!V.getTP().busy);
  ok('the renderer still matches OG',rflags()===R1);
  ok('no contract errors were recorded',V.getTP().errs.length===0);
});
