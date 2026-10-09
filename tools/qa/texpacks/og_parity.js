/* og_parity.js (WP0): browser-only OG parity round trips (INTEGRATION_PLAN.md section 3.6).
   Load it into the running game page (same origin as the repo root (node scripts/serve.mjs)), then call it:
     (0,eval)(await (await fetch('/tools/qa/texpacks/og_parity.js')).text());
     const r=await ogParity();                       // real modules: setPack('hr') with no `only`
     const r=await ogParity({only:['light']});       // one package in isolation
     const r=await ogParity({fakes:true});           // the WP0 contract self-test (stand-in A/B modules)
   r = {pass, results:[{label, same, hrDiffered, h0, hHR, h2, ok}], skipped:[...]}
   Every case: h0 = OG frame hash (paused, fixed camera) -> setPack('hr') -> a few Hyperreal frames -> setPack('og')
   -> h2. `same` must be true. `hrDiffered` false means Hyperreal changed nothing visible (suspicious for real modules).
   Cases: base (no mobs, first person, empty hand), three frozen mobs on screen, a held block, third person, X-ray on,
   Shaders on (with a water chunk re-meshed after the toggle and the held block built after it), tier changes while live.
   Options: start (default true: a new creative seed-1337 world), only (module names), fakes, tod (default 0.3).
   Frames are driven with __vox.frameStep, so it works while the Browser pane is hidden. Run it after a fresh page load:
   it starts its own world. */
(function(){
'use strict';
window.ogParity=async function(o){
  o=Object.assign({start:true,only:null,fakes:false,tod:0.3},o||{});
  const V=window.__vox;if(!V||!V.getTP)throw new Error('ogParity: no texture-pack build here (__vox.getTP missing)');
  let T=Math.max(performance.now(),1e6)+2e5;
  const step=n=>{for(let i=0;i<n;i++){T+=40;V.frameStep(T);}};
  const H=()=>V.tpHashFrame();
  if(o.fakes&&!window.__ogpFakes){
    /* A-like: swap the three chunk materials (every mesh using them, held block included) to MeshStandardMaterial */
    const fa={name:'wp0a',order:10,required:false,supported:()=>true,async prepare(){},
      swap(from,to){const M=new Map([[from.op,to.op],[from.cut,to.cut],[from.wat,to.wat]]);
        scene.traverse(q=>{if(q.material&&M.has(q.material))q.material=M.get(q.material);});matOp=to.op;matCut=to.cut;matWat=to.wat;},
      enable(){this.og={op:matOp,cut:matCut,wat:matWat};const b={map:atlasTex,vertexColors:true,roughness:1,metalness:0,flatShading:true};
        this.hr={op:new THREE.MeshStandardMaterial(b),cut:new THREE.MeshStandardMaterial(Object.assign({alphaTest:.5,side:THREE.DoubleSide},b)),
          wat:new THREE.MeshStandardMaterial(Object.assign({transparent:true,opacity:.78,depthWrite:false},b))};
        for(const k in this.hr)V.hrTag(this.hr[k]);this.swap(this.og,this.hr);},
      disable(){if(!this.hr)return;this.swap(this.hr,this.og);for(const k in this.hr)this.hr[k].dispose();this.hr=null;}};
    /* B-like: every renderer flag the contract snapshots, a new light, sun shadows, all mesh shadow flags rewritten */
    const fb={name:'wp0b',order:20,required:false,supported:()=>true,async prepare(){},setQuality(){},
      enable(){const R=renderer;this.s={sc:sunL.castShadow,si:sunL.intensity};
        R.physicallyCorrectLights=true;R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
        R.setPixelRatio(1.25);R.setSize(innerWidth,innerHeight);R.setClearColor(0x123456,1);
        R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.shadowMap.autoUpdate=true;
        this.hemi=V.hrTag(new THREE.HemisphereLight(0x9cc4ff,0x5a4630,0.85));scene.add(this.hemi);
        sunL.castShadow=true;sunL.intensity=4.5;TP.shadow=true;
        scene.traverse(q=>{if(q.isMesh){q.castShadow=true;q.receiveShadow=true;}});},
      disable(){if(!this.hemi)return;scene.remove(this.hemi);this.hemi=null;sunL.castShadow=this.s.sc;sunL.intensity=this.s.si;
        if(sunL.shadow.map){sunL.shadow.map.dispose();sunL.shadow.map=null;}}};
    V.tpRegister(fa);V.tpRegister(fb);window.__ogpFakes=[fa,fb];}
  const opt=o.fakes?{only:['wp0a','wp0b']}:(o.only?{only:o.only}:{});
  if(V.getTP().id!=='og')await V.setPack('og');
  if(o.start){V.startNewWorld('ogparity','1337','c');step(5);}
  if(!V.P)throw new Error('ogParity: no world running');
  V.GR.mobSpawn=false;V.GR.dayCycle=false;V.GR.snail=false;V.GR.jsc=0;
  const sx=Math.floor(V.P.x),sz=Math.floor(V.P.z);V.forceChunksNear(sx,sz);step(60);V.setTime(o.tod);
  const pose=()=>{const P=V.P;P.mode='c';P.flying=true;P.x=sx+.5;P.y=V.surfaceTop(sx,sz)+6;P.z=sz+.5;P.yaw=0.8;P.pitch=-0.35;P.vx=P.vy=P.vz=0;};
  const settle=n=>{V.resumeGame();for(let i=0;i<n;i++){pose();step(1);}V.pauseGame();step(3);};
  for(const e of V.entities)if(e.t==='mob'&&!e.bot){e.dead=true;if(e.mesh)scene.remove(e.mesh);}   /* purge (pruned next frame) */
  V.P.inv[V.P.sel]=null;V.refreshHand();
  settle(40);
  const results=[],skipped=[];
  const rt=async(label,mid)=>{const h0=H(),h0b=H();
    if(h0!==h0b){skipped.push(label+' (OG frame not stable)');return;}
    const ok1=await V.setPack('hr',opt);
    V.tpRenderOnce();V.tpRenderOnce();step(3);if(mid)await mid();
    const hHR=H();const ok2=await V.setPack('og');step(3);const h2=H();
    results.push({label,same:h0===h2,hrDiffered:hHR!==h0,h0,hHR,h2,ok:ok1&&ok2});};
  await rt('base: paused, no mobs, first person, empty hand');
  const P=V.P,fx=Math.sin(P.yaw),fz=Math.cos(P.yaw);
  ['zombie','pig','cow'].forEach((mt,i)=>{const d=6+i*1.5,x=P.x-fx*d+(i-1)*2.2,z=P.z-fz*d;V.spawnMob(mt,x,V.surfaceTop(Math.floor(x),Math.floor(z))+1,z);});
  V.GR.freezeMobs=true;settle(3);
  await rt('three living mobs on screen');
  P.inv[P.sel]={id:V.B.STONE,count:4};V.refreshHand();step(3);
  await rt('held stone block');
  V.setCam(1);step(4);
  await rt('third person');
  V.toggleXray();step(4);
  await rt('third person + X-ray on');
  V.toggleXray();V.setCam(0);step(3);
  /* Shaders on: water re-meshed after the toggle (receive-only in OG) and the held block rebuilt after it (no cast) */
  P.inv[P.sel]=null;V.refreshHand();V.setShaders(true);settle(4);
  const wc=[...V.chunks.values()].find(ch=>ch.meshes&&ch.meshes.some(m=>m.material===matWat));
  if(wc)wc.dirty=true;else skipped.push('Shaders: no water chunk in range to re-mesh');
  settle(4);P.inv[P.sel]={id:V.B.STONE,count:4};V.refreshHand();step(3);
  await rt('Shaders on (water re-meshed + block built after the toggle)');
  V.setShaders(false);settle(4);
  await rt('tier changes while live',async()=>{await V.setQuality(2);step(2);await V.setQuality(0);step(2);await V.setQuality(-1);step(2);});
  V.GR.freezeMobs=false;
  return {pass:results.length>0&&results.every(r=>r.same&&r.ok),results,skipped,tp:V.getTP()};
};
})();
