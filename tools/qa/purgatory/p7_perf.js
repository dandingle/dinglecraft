/* p7_perf.js (P7): browser-only Hyperreal cost of the purgatory cast (BUILD_PLAN.md 7.2 acceptance: <= 1,800 draw calls,
   <= 1.5 ms Hyperreal CPU at Medium). Load into a running build page (muted, manual frames), then:
     (0,eval)(await (await fetch('/tools/qa/purgatory/p7_perf.js')).text());  const r=await pgPerf({at:'mark'|'here', crowd:16});
   Puts a crowd of purgatory bodies (test-only types on the real models: 2 headliners at boss scale, Blanks, Hands, pigs,
   frogs, Rats) in view, then measures per frame, OG vs Hyperreal Medium on the same scene: frameStep CPU ms (median of
   120 frames), draw calls and triangles of one full render (all post passes), and the model-update share. */
(function(){
'use strict';
window.pgPerf=async function(o){
  o=Object.assign({at:'mark',crowd:16,frames:120},o||{});
  const V=window.__vox;let T=Math.max(performance.now(),1e6)+4e5;const step=n=>{for(let i=0;i<n;i++){T+=40;V.frameStep(T);}};
  if(o.at==='mark'){if(V.getTP().id!=='og')await V.setPack('og');V.startNewWorld('pgperf','1337','s');V.GR.mobSpawn=false;V.GR.dayCycle=false;V.GR.god=true;step(100);V.mpEnterNow();step(80);}
  const P=V.P,sx=P.x,sy=P.y,sz=P.z;P.yaw=Math.PI;P.pitch=-0.1;
  const og=(G0,mats)=>{const m=new THREE.MeshLambertMaterial({color:0x8a6a9a});mats.push(m);const b=new THREE.Mesh(new THREE.BoxGeometry(0.6,1.2,0.6),m);b.position.y=0.6;G0.add(b);return {G:G0,legs:[],mats};};
  const kinds=[['pg_bigfrog',null,1],['pg_bigpig',null,1],['pg_blank','tether'],['pg_blank','possessed'],['pg_arm','hand'],['pg_pig','toss'],['pg_frog',null],['pg_labrat','clone'],['pg_bomber',null,1],['pg_drummer',null],['pg_cook',null],['pg_comic',null]];
  const mts=[];kinds.forEach(([m,v,b],i)=>{const mt='pgp7perf'+i;V.MOBT[mt]=Object.assign({hp:50,hw:0.3,h:1.4,spd:1,body:'#888888',legc:'#666666',pmob:1},b?{boss:1,pboss:1}:{});
    V.PREG.mesh[mt]=og;V.PREG.brain[mt]=(e)=>{e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;e.vx=Math.sin(T*0.001+i)*2;};V.hrPg.HR_PMOB[mt]=m;if(v)V.hrPg.HR_PMOB_V[mt]=v;mts.push(mt);});
  for(let i=0;i<o.crowd;i++){const mt=mts[i%mts.length],a=(i/o.crowd-0.5)*1.6,d=6+(i%4)*2.5;V.spawnMob(mt,sx-Math.sin(P.yaw+a)*d,sy,sz-Math.cos(P.yaw+a)*d);}
  step(10);
  const measure=async(label)=>{for(let i=0;i<20;i++)step(1);const ts=[];for(let i=0;i<o.frames;i++){const t0=performance.now();T+=40;V.frameStep(T);ts.push(performance.now()-t0);}
    ts.sort((a,b)=>a-b);const R=renderer,I=R.info;const ar=I.autoReset;I.autoReset=false;I.reset();V.tpRenderOnce();const calls=I.render.calls,tris=I.render.triangles;I.autoReset=ar;
    const gl=R.getContext();const g0=performance.now();V.tpRenderOnce();gl.finish();const gpu=performance.now()-g0;
    return {label,cpuMed:+ts[ts.length>>1].toFixed(2),cpuP95:+ts[Math.floor(ts.length*.95)].toFixed(2),calls,tris,renderFinish:+gpu.toFixed(1),
      bodies:V.entities.filter(e=>e.hrM&&/^pgp7perf/.test(e.mt)).length,tier:V.getTP().qr};};
  const out=[];out.push(await measure('OG'));
  await V.setPack('hr');await V.setQuality(1);step(10);out.push(await measure('Hyperreal Medium'));
  /* the model-update share: time spent in this crowd's model updates over the measured frames */
  let mt0=0;const Hs=V.entities.filter(e=>e.hrM&&/^pgp7perf/.test(e.mt)).map(e=>e.hrM);
  for(const H of Hs){const u=H.hr.update;H.hr.update=function(a,b,c){const t0=performance.now();const r=u(a,b,c);mt0+=performance.now()-t0;return r;};}
  for(let i=0;i<o.frames;i++){T+=40;V.frameStep(T);}
  out.push({label:'model updates per frame (ms, the whole crowd)',ms:+(mt0/o.frames).toFixed(3),bodies:Hs.length});
  await V.setPack('og');step(2);
  for(const e of V.entities)if(/^pgp7perf/.test(e.mt))V.pgCore().removeEnt(e);step(1);
  for(const mt of mts){delete V.MOBT[mt];delete V.PREG.mesh[mt];delete V.PREG.brain[mt];delete V.hrPg.HR_PMOB[mt];delete V.hrPg.HR_PMOB_V[mt];}
  return out;};
})();
