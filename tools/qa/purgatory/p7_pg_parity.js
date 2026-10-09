/* p7_pg_parity.js (P7): browser-only OG -> Hyperreal -> OG round trip INSIDE purgatory (BUILD_PLAN.md 8.7, the P7 variant of
   the v6.0 og_parity recipe). Load it into a running private build page (muted, manual frames), then:
     (0,eval)(await (await fetch('/tools/qa/purgatory/p7_pg_parity.js')).text());  const r=await pgParity();
   r = {pass, results:[{label, same, hrDiffered, h0, hHR, h2, ok}], skipped}. Every case: OG frame hash (paused, fixed camera)
   -> setPack('hr') -> Hyperreal frames -> setPack('og') -> the hash must be identical. Cases: on the Mark (first person, the
   Programme in hand), with three purgatory bodies on screen (test-only types on the generic and the custom brain path, and a
   boss scale), third person, BLACKOUT forced (the followspot rides the mirror light). Starts its own world. */
(function(){
'use strict';
window.pgParity=async function(o){
  o=Object.assign({},o||{});
  const V=window.__vox;if(!V||!V.getTP||!V.mpEnterNow)throw new Error('pgParity: needs a v6.1 build');
  let T=Math.max(performance.now(),1e6)+3e5;const step=n=>{for(let i=0;i<n;i++){T+=40;V.frameStep(T);}};const H=()=>V.tpHashFrame();
  if(V.getTP().id!=='og')await V.setPack('og');
  V.startNewWorld('pgparity','1337','s');V.GR.mobSpawn=false;V.GR.dayCycle=false;V.GR.snail=false;V.GR.jsc=0;V.GR.god=true;step(100);
  V.mpEnterNow();step(80);
  if(V.getMP().inside!==true)throw new Error('pgParity: did not enter purgatory');
  const P=V.P,sx=P.x,sy=P.y,sz=P.z;
  const pose=()=>{P.x=sx;P.y=sy;P.z=sz;P.yaw=Math.PI;P.pitch=-0.12;P.vx=P.vy=P.vz=0;};
  const settle=n=>{V.resumeGame();for(let i=0;i<n;i++){pose();step(1);}V.pauseGame();step(3);};
  for(const e of V.entities)if(e.t==='mob'&&!e.bot){e.dead=true;if(e.mesh)scene.remove(e.mesh);}
  settle(30);
  const results=[],skipped=[];
  const rt=async(label,mid)=>{const h0=H(),h0b=H();if(h0!==h0b){skipped.push(label+' (OG frame not stable)');return;}
    const ok1=await V.setPack('hr');V.tpRenderOnce();V.tpRenderOnce();step(3);if(mid)await mid();
    const hHR=H();const ok2=await V.setPack('og');step(3);const h2=H();
    results.push({label,same:h0===h2,hrDiffered:hHR!==h0,h0,hHR,h2,ok:ok1&&ok2});};
  await rt('on the Mark: paused, first person, the Programme in hand');
  /* purgatory bodies: test-only types (independent of P3/P4), spawned in OG, swapped in at the pack event */
  const og=(G0,mats)=>{const m=new THREE.MeshLambertMaterial({color:0x8a6a9a});mats.push(m);const b=new THREE.Mesh(new THREE.BoxGeometry(0.6,1.2,0.6),m);b.position.y=0.6;G0.add(b);return {G:G0,legs:[],mats};};
  V.MOBT.pgp7gen={hp:12,hw:0.3,h:1.2,spd:1,body:'#888888',legc:'#666666',pmob:1};V.PREG.mesh.pgp7gen=og;V.hrPg.HR_PMOB.pgp7gen='pg_blank';
  V.MOBT.pgp7boss={hp:200,hw:0.4,h:2,spd:1,body:'#888888',legc:'#666666',pmob:1,boss:1,pboss:1};V.PREG.mesh.pgp7boss=og;V.hrPg.HR_PMOB.pgp7boss='pg_bigpig';
  V.PREG.brain.pgp7boss=(e)=>{e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;};
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
  [['pgp7gen',-1.6],['pgp7boss',0],['pgp7gen',1.6]].forEach(([mt,ox])=>{V.spawnMob(mt,sx+fx*5+ox,sy,sz+fz*5);const e=V.entities[V.entities.length-1];e.yaw=0.4;});
  V.GR.freezeMobs=true;settle(4);
  await rt('three purgatory bodies on screen (generic brain, custom brain, boss scale)');
  V.setCam(1);step(4);
  await rt('third person');
  V.setCam(0);step(3);
  await rt('BLACKOUT forced while live (the followspot on the mirror light)',async()=>{V.hrMupForce('blackout');V.hrMupFollowT({x:sx,y:sy,z:sz+3});step(4);V.hrMupFollowT(null);V.hrMupForce(null);step(2);});
  V.GR.freezeMobs=false;
  for(const e of V.entities)if(e.mt==='pgp7gen'||e.mt==='pgp7boss')V.pgCore().removeEnt(e);step(1);
  for(const mt of ['pgp7gen','pgp7boss']){delete V.MOBT[mt];delete V.PREG.mesh[mt];delete V.PREG.brain[mt];delete V.hrPg.HR_PMOB[mt];}
  return {pass:results.length>0&&results.every(r=>r.same&&r.ok),results,skipped,tp:V.getTP().id};
};
})();
