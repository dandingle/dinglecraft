/* p7_boss_hr.js (P7): browser-only Hyperreal contact sheet of every headliner phase and set piece (BUILD_PLAN.md 7.2 acceptance,
   "HR contact sheets of every biome and boss phase at Medium"). Needs a build with the real P1-P4. Load into a running page
   (muted, manual frames), then:  (0,eval)(await (await fetch('/tools/qa/purgatory/p7_boss_hr.js')).text());  await pgBossHR();
   Uses P4's own seams (hnSkipTo, hnFightStart, the per-boss starters) and forces F.phase for the phase shots; the camera
   frames the headliner from 7 m. Returns {img (JPEG data URL, 5 per row), log}. */
(function(){
'use strict';
window.pgBossHR=async function(o){o=Object.assign({},o||{});
  const V=window.__vox;let T=Math.max(performance.now(),1e6)+5e5;const step=n=>{for(let i=0;i<n;i++){T+=40;V.frameStep(T);}};
  for(let i=0;i<300&&V.getTP().busy;i++)await new Promise(r=>setTimeout(r,100));
  if(!V.P||V.getMP().inside!==true){V.startNewWorld('pgbosshr','1337','s');V.GR.mobSpawn=false;V.GR.dayCycle=false;V.GR.god=true;step(120);V.mpEnterNow();step(80);}
  if(V.getTP().id!=='hr'||!V.getHRL().on)await V.setPack('hr');await V.setQuality(1);step(10);
  const cv=renderer.domElement,cells=[],log=[];
  const shot=(label,d,h,side)=>{const e=V.hnBoss();if(!e){log.push('no boss for '+label);return;}const P=V.P;P.mode='c';P.flying=true;
    const ang=(e.yaw||0)+(side||0),cx=e.x+Math.sin(ang)*(d||7),cz=e.z+Math.cos(ang)*(d||7);
    for(let k=0;k<3;k++){P.x=cx;P.z=cz;P.y=e.y+(h==null?2.2:h);const dx=e.x-P.x,dz=e.z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=-Math.atan2(P.y+1.6-(e.y+2),Math.hypot(dx,dz));step(1);}
    V.tpRenderOnce();const c=document.createElement('canvas');c.width=384;c.height=288;const g=c.getContext('2d');const sw=cv.width/1.5,sh=cv.height/1.5;
    g.drawImage(cv,(cv.width-sw)/2,(cv.height-sh)/2,sw,sh,0,0,384,288);g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,268,384,20);g.fillStyle='#fff';g.font='12px system-ui';
    const S=V.getHnState();g.fillText(label+' | '+V.getHRL().theatre+(S?' | ph '+S.phase:''),6,282);cells.push(c);};
  const run=(n)=>{for(let i=0;i<n;i++){T+=40;V.frameStep(T);}};
  const fight=(n,name)=>{if(V.getMPF().fight&&!V.getMPF().fight.over)V.hnFightLeave('qa');step(5);V.hnSkipTo(n);step(30);const F=V.hnFightStart(name,{});step(40);return F;};
  const phase=(F,k)=>{F.phase=k;if(F.e&&F.e.hrS)F.e.hrS.phase=k;};
  try{let F=fight(1,'bomber');shot('Demolitionist P1 summon');run(60);shot('Demolitionist P1 +2.4s',7,2.2,0.6);
    phase(F,2);run(90);shot('Demolitionist P2 sticky',7,2.2,-0.6);phase(F,3);run(90);shot('Demolitionist P3 the Big One',9,3);run(60);shot('Demolitionist P3 +2.4s',7,2.2,1.2);}catch(e){log.push('bomber: '+e.message);}
  try{let F=fight(2,'bigpig');shot('Pig P1 entrance',9,3);run(60);shot('Pig P1 throwing',9,3,0.5);
    phase(F,2);run(90);shot('Pig P2 close-up',7,2.2);run(60);shot('Pig P2 +2.4s',7,2.2,-0.7);phase(F,3);run(30);try{V.hnPLineStart(F.e);}catch(e){}run(60);shot('Pig P3 kickline',9,3,0.9);}catch(e){log.push('bigpig: '+e.message);}
  try{let F=fight(3,'bigfrog');shot('Frog P1 the management',7,2.2);run(80);shot('Frog P1 +3s',7,2.2,0.6);
    phase(F,2);run(90);shot('Frog P2 croak',7,2.2,-0.5);try{V.hnKFlailStart(F.e,F);}catch(e){}run(30);shot('Frog P2 the Flail',9,3);
    phase(F,3);try{V.hnKArmStart(F.e,F);}catch(e){}run(120);shot('Frog P3 the arm',16,10);run(60);shot('Frog P3 +2.4s',12,6,0.8);}catch(e){log.push('bigfrog: '+e.message);}
  try{if(V.getMPF().fight&&!V.getMPF().fight.over)V.hnFightLeave('qa');step(5);V.hnStrikeStart();run(120);
    const P=V.P;V.tpRenderOnce();const c=document.createElement('canvas');c.width=384;c.height=288;c.getContext('2d').drawImage(cv,0,0,384,288);cells.push(c);}catch(e){log.push('strike: '+e.message);}
  const out=document.createElement('canvas');out.width=5*384;out.height=Math.ceil(cells.length/5)*288;const g=out.getContext('2d');cells.forEach((c,i)=>g.drawImage(c,(i%5)*384,Math.floor(i/5)*288));
  return {img:out.toDataURL('image/jpeg',0.82),log,cells:cells.length};};
})();
