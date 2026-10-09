// mz_qa.mjs (MZ): the whole Malgorath in the game, MUTED, one pack per run: the Bite dormant (approach, lip, eye), the full intro
// (two pokes), every R1 and R2 attack from Dan's eye (tell -> lock -> impact -> after) with an orbit of each impact, the full
// climb-out, the full light, the R3 loop (inhale, lanes, swallow, hands, drag, the gag and the sun), the busiest wave (3c) with
// per-tier frame timing in Hyperreal, then an honest kill in R3 (1 HP, the sun window, one Dan hit) -> the full burst, the burial
// and YOU WIN. Dan is in survival with GR.god (he is targeted and hit, never killed). JPEGs + summary.json + 5x6 sheets into --out.
//   node scripts/serve.mjs --port 9486                         (repo root, background)
//   Chrome --headless=new --remote-debugging-port=9386 --mute-audio --enable-gpu --use-angle=metal ... about:blank
//   node tools/qa/malgorath/mz_qa.mjs --port 9386 [--build dist/dinglecraft_v<VER>.html] --pack og|hr [--q 2] [--out dir]
// MUTED: --mute-audio, vx_vox_settings {snd:0, mus:0, tp:'og'} before the page runs, soundOn=false + AC.suspend() on every evaluation,
// rAF disabled from the first line (only __vox.frameStep moves the game), the brain URL on a dead port, tp:'og' restored at the end.
import fs from 'fs';import path from 'path';import {execFileSync} from 'child_process';import {args,connect,ROOT,defaultBuild,gameVersion} from './m3_lib.mjs';
const A=args(),PORT=+(A.port||9386),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild();
const PACK=A.pack==='hr'?'hr':'og',Q=A.q!=null?+A.q:2,PERF=A.perf!=='0';
const OUT=path.resolve(A.out||ROOT+'out/qa/mz_'+PACK+'_'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19));
fs.mkdirSync(OUT,{recursive:true});
const C=await connect(PORT);await C.open(`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`);
const shots=[],checks=[],meta={pack:PACK,q:Q};
const check=(n,c,info)=>{checks.push([n,!!c,info===undefined?null:info]);console.log((c?'ok   ':'FAIL ')+n+(!c&&info!==undefined?' '+JSON.stringify(info).slice(0,500):''));};
await C.ev(`window.__mz={T:700000,
  stp(n){for(let i=0;i<(n||1);i++){if(typeof paused!=='undefined'&&paused&&playing&&!__vox.P.dead)resumeGame();this.T+=40;__vox.frameStep(this.T);__vox.P.hp=Math.max(__vox.P.hp,6);}},
  hr(){return !!(__vox.getTP&&__vox.getTP().hr);},
  draw(){if(this.hr()&&__vox.tpRenderOnce)__vox.tpRenderOnce();else renderer.render(scene,camera);},
  cam(px,py,pz,tx,ty,tz){camera.position.set(px,py,pz);const vx=tx-px,vy=ty-py,vz=tz-pz,vl=Math.hypot(vx,vy,vz)||1;camera.rotation.order='YXZ';
    camera.rotation.y=Math.atan2(-vx,-vz);camera.rotation.x=Math.asin(vy/vl);camera.rotation.z=0;camera.updateMatrixWorld(true);
    if(typeof handG!=='undefined'&&handG)handG.visible=false;this.draw();},   /* a free camera: no first-person hand in the shot */
  look(x,y,z){const P=__vox.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));},
  boss(){return __vox.entities.find(e=>!e.dead&&e.mt==='demon'&&e.mgBoss)||null;},
  tp(r,th){const V=__vox,P=V.P,F=V.mgF(),x=1000.5+Math.cos(th)*r,z=1000.5+Math.sin(th)*r;V.forceChunksNear(x,z);V.forceChunksNear(1000,1000);
    P.x=Math.floor(x)+0.5;P.z=Math.floor(z)+0.5;P.y=F;P.vx=P.vy=P.vz=0;P.fallD=0;},
  rel(d,ang){const V=__vox,b=this.boss(),P=V.P,F=V.mgF();if(!b)return false;const fw=Math.atan2(Math.sin(b.yaw),Math.cos(b.yaw));
    for(let k=0;k<24;k++){const a=fw+ang+(k%2?1:-1)*Math.ceil(k/2)*0.26,x=b.x+Math.sin(a)*d,z=b.z+Math.cos(a)*d,r=Math.hypot(x-1000.5,z-1000.5);
      if(r<9.5||r>21.5)continue;let id=0;try{id=V.mgCore().getBlock(Math.floor(x),Math.floor(F)-1,Math.floor(z));}catch(e){}if(!id)continue;
      V.forceChunksNear(x,z);P.x=Math.floor(x)+0.5;P.z=Math.floor(z)+0.5;P.y=F;P.vx=P.vy=P.vz=0;P.fallD=0;return true;}return false;},
  tp3(tx,tz){const V=__vox,P=V.P,F=V.mgF(),b=this.boss(),bx=b?b.x:1000.5,bz=b?b.z:1000.5,dx=P.x-bx,dz=P.z-bz,l=Math.hypot(dx,dz)||1;
    const cx=P.x+dx/l*9+dz/l*4,cz=P.z+dz/l*9-dx/l*4;this.cam(cx,F+7.5,cz,(P.x*2+(tx==null?bx:tx))/3,F+0.5,(P.z*2+(tz==null?bz:tz))/3);},
  aimBoss(){const b=this.boss();if(!b)return;const r=b.mgRig,h=r&&r.zone?r.zone('head'):{x:b.x,y:b.y+10,z:b.z};const P=__vox.P;
    const dx=h.x-P.x,dy=h.y-(P.y+P.eyeY),dz=h.z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.max(-1.0,Math.min(1.1,Math.atan2(dy,Math.hypot(dx,dz))*0.75));},
  st(){const V=__vox,M2=V.getMG2?V.getMG2():null,T=V.mgTel(),b=this.boss();return {t:T.clock,live:V.mgInfo().live,r:V.mgInfo().round,hp:b?Math.round(b.hp):0,
    cut:V.getCUT().on,ct:V.getCUT().t,ph:V.getMGL().phase,atk:M2&&M2.atk?M2.atk.k:null,win:M2&&M2.win?M2.win.kind:null,r3:M2&&M2.r3?M2.r3.ph:null,
    tel:T.tel.map(q=>({k:q.kind,c:q.col,l:!!q.locked,i:q.impactT})),adds:M2?M2.adds.length:0,dead:!!V.getDEMON().dead,P:[+V.P.x.toFixed(1),+V.P.y.toFixed(1),+V.P.z.toFixed(1)]};}};
  return 1;`);
const shot=async(name,info)=>{await C.sleep(40);const r=await C.send('Page.captureScreenshot',{format:'jpeg',quality:84});
  const f=OUT+'/'+String(shots.length+1).padStart(3,'0')+'_'+name+'.jpg';fs.writeFileSync(f,Buffer.from(r.result.data,'base64'));shots.push(f);if(info)meta[path.basename(f)]=info;return f;};
const eye=async(name)=>{await C.ev('__mz.stp(1);__mz.draw();');return shot(name);};                 /* Dan's eye, HUD included */
const orbit=async(name,code)=>{await C.ev(code);return shot(name);};                                 /* a free camera this frame only */
const st=()=>C.ev('return __mz.st();');
/* ---- the world ---- */
const I0=await C.ev(`const V=__vox;V.startNewWorld('mzqa','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);
  V.GR.god=true;__mz.stp(200);return {ver:V.GAME_VERSION,stubs:V.mgInfo().stubs,sound:soundOn,mg:V.mgInfo()};`);
check('v'+gameVersion()+' loaded, every package real, sound off '+JSON.stringify(I0),I0.ver===gameVersion()&&I0.stubs===''&&I0.sound===false);
if(PACK==='hr'){await C.ev(`await __vox.setQuality(${Q});await __vox.setPack('hr');__mz.stp(30);`);check('Hyperreal live',await C.ev('return __mz.hr();'));}
/* ---- the Bite asleep ---- */
await C.ev(`const V=__vox,P=V.P;V.forceChunksNear(880,1000);P.x=880.5;P.z=1000.5;P.y=44;P.flying=true;P.vx=P.vy=P.vz=0;__mz.look(1000.5,26,1000.5);__mz.stp(80);`);
await eye('asleep_sea_120m');
await C.ev(`const V=__vox,b=V.mgBonePile(),P=V.P;V.forceChunksNear(b.x,b.z);V.forceChunksNear(1000,1000);P.x=b.x;P.y=b.y+0.1;P.z=b.z;P.flying=false;__mz.look(1000.5,V.mgF()-2,1000.5);__mz.stp(60);`);
await eye('asleep_lip');
await orbit('asleep_orbit',`const F=__vox.mgF();__mz.cam(1000.5-52,F+30,1000.5-34,1000.5,F-5,1000.5);`);
await C.ev(`__mz.tp(6.5,Math.PI);const e=__vox.entities.find(q=>!q.dead&&q.mt==='mgeye');if(e)__mz.look(e.x,e.y,e.z);__mz.stp(20);`);
await eye('asleep_eye');
/* ---- the intro: two pokes ---- */
const ok1=await C.ev(`const e=__vox.entities.find(q=>!q.dead&&q.mt==='mgeye');if(!e)return 'no eye';__mz.tp(9,Math.PI);__mz.stp(10);__vox.mgHitAs(e,4,'Dan','melee');__mz.stp(20);__vox.mgHitAs(e,4,'Dan','melee');__mz.stp(2);return __mz.st();`);
check('two pokes wake him: the intro plays',ok1&&ok1.cut&&ok1.ph==='intro',ok1);
const scene=async(tag,every,maxN)=>{every=Math.max(1,Math.round(every));let n=0,seen=false;for(let i=0;i<400;i++){const s=await C.ev(`__mz.stp(${every});return __mz.st();`);
    if(!s.cut){if(seen)break;continue;}seen=true;if(n<maxN){n++;await C.ev('__mz.draw();');await shot(tag+'_t'+s.ct.toFixed(1),s);}}return n;};
const nIntro=await scene('intro',12,30);check('intro frames '+nIntro,nIntro>=8);
await C.ev(`for(let i=0;i<300&&(__vox.getCUT().on||!__vox.mgInfo().live);i++)__mz.stp(1);__mz.stp(10);`);
let s1=await st();check('R1 live after the intro',s1.live&&s1.r===1,s1);
await C.ev(`__mz.tp(14,Math.PI);__mz.stp(10);__mz.aimBoss();__mz.stp(1);`);await eye('R1_start');
await orbit('R1_orbit_wide',`const F=__vox.mgF();__mz.cam(1000.5-40,F+20,1000.5+26,1000.5,F+4,1000.5);`);
await orbit('R1_face_close',`const b=__mz.boss(),r=b.mgRig,h=r.zone('head'),fx=Math.sin(b.yaw),fz=Math.cos(b.yaw);__mz.cam(h.x+fx*7-fz*2.5,h.y+1.6,h.z+fz*7+fx*2.5,h.x,h.y+0.4,h.z);`);
await orbit('R1_side_body',`const b=__mz.boss(),F=__vox.mgF(),fx=Math.sin(b.yaw),fz=Math.cos(b.yaw);__mz.cam(b.x-fz*18+fx*8,F+7,b.z+fx*18+fz*8,b.x,F+5,b.z);`);
/* one attack: forced as the selector would, shots at the tell, the lock, the impact and after (window) */
const attack=async(r,k,o)=>{o=o||{};const place=o.rel?`if(!__mz.rel(${o.rel[0]},${o.rel[1]}))__mz.tp(${o.r||14},${o.th||'Math.PI'});`:`__mz.tp(${o.r||14},${o.th||'Math.PI'});`;
  await C.ev(`${place}const M2=__vox.getMG2();for(let i=0;i<900&&(M2.atk||M2.win||M2.scene||M2.holdDan||M2.throws.length||M2.pluck||__vox.getCUT().on||!__vox.mgInfo().live);i++)__mz.stp(1);${place}__mz.stp(3);__mz.aimBoss();`);
  const f=await C.ev(`return __vox.mg2Force?__vox.mg2Force('${k}'):'no mg2Force';`);
  if(f!==true){check('R'+r+' '+k+' forced',false,f);return;}
  let tell=false,lock=false,imp=false,after=false,t0=null;
  for(let i=0;i<160;i++){const s=await C.ev(`__mz.stp(1);__mz.aimBoss();return __mz.st();`);if(t0==null)t0=s.t;const L=s.tel.find(q=>q.l&&q.c!=='gold'),U=s.tel.find(q=>q.c!=='gold');
    if(!tell&&s.t-t0>=0.35){tell=true;await C.ev('__mz.draw();');await shot('R'+r+'_'+k+'_1tell',s);}
    if(!lock&&L){lock=true;await C.ev('__mz.draw();');await shot('R'+r+'_'+k+'_2lock',s);if(L.i)o.imp=L.i;
      const tl=await C.ev(`const q=__vox.mgTel().tel.find(q=>q.locked&&q.col!=='gold');return q?[q.x,q.z]:null;`);
      await orbit('R'+r+'_'+k+'_2lock_3p',tl?`__mz.tp3(${tl[0]},${tl[1]});`:`__mz.tp3();`);}
    if(lock&&!imp&&o.imp&&s.t>=o.imp+0.05){imp=true;await C.ev('__mz.draw();');await shot('R'+r+'_'+k+'_3impact',s);
      const b=await C.ev('const b=__mz.boss();return b?[b.x,b.z]:[1000.5,1000.5];');
      await orbit('R'+r+'_'+k+'_4orbit',`const F=__vox.mgF(),P=__vox.P,dx=P.x-${b[0]},dz=P.z-${b[1]},l=Math.hypot(dx,dz)||1;__mz.cam(P.x+dz/l*16+dx/l*10,F+11,P.z-dx/l*16+dz/l*10,(P.x+${b[0]})/2,F+3,(P.z+${b[1]})/2);`);o.it=s.t;}
    if(imp&&!after&&s.t>=o.it+1.0){after=true;await C.ev('__mz.draw();');await shot('R'+r+'_'+k+'_5after',s);}
    if(after||(!lock&&!s.atk&&i>40&&!U))break;}
  check('R'+r+' '+k+': tell, lock, impact and after captured',tell&&lock&&imp&&after,{tell,lock,imp,after});};
for(const k of ['slap','scoop','crumbs'])await attack(1,k);
/* ---- the climb-out (full): instaKill-free, the round's bar to zero through the gate's own path: windows only ---- */
const toEnd=async(want)=>{for(let g=0;g<700;g++){const s=await C.ev(`const V=__vox,b=__mz.boss();if(b&&!V.getCUT().on&&V.mgInfo().live){const pt=V.entities.find(q=>!q.dead&&q.mt==='mgpart');
      if(pt){const P=V.P;V.mgHitAs(pt,30,'Dan','melee');}}__mz.stp(8);return __mz.st();`);if(s.cut&&s.ph===want)return s;}return null;};
const sc=await toEnd('climb');check('R1 cleared through windows: THE CLIMB-OUT plays',!!sc,sc);
const nClimb=await scene('climb',13,14);check('climb frames '+nClimb,nClimb>=5);
await C.ev(`for(let i=0;i<300&&(__vox.getCUT().on||!__vox.mgInfo().live||__vox.mgInfo().round!==2);i++)__mz.stp(1);__mz.stp(20);`);
s1=await st();check('R2 live after the climb-out',s1.live&&s1.r===2,s1);
await C.ev(`__mz.tp(15,Math.PI);__mz.stp(10);__mz.aimBoss();__mz.stp(1);`);await eye('R2_start');
await orbit('R2_orbit_wide',`const F=__vox.mgF(),b=__mz.boss(),x=b?b.x:1000.5,z=b?b.z:1000.5;__mz.cam(x-26,F+12,z+18,x,F+6,z);`);
for(const k of ['lunge','stomp','tail','squat'])await attack(2,k,{rel:{lunge:[12,0],stomp:[6,0.6],tail:[6,Math.PI],squat:[1.5,0]}[k]});
const sl=await toEnd('light');check('R2 cleared through windows: THE LIGHT plays',!!sl,sl);
const nLight=await scene('light',17,16);check('light frames '+nLight,nLight>=5);
await C.ev(`for(let i=0;i<400&&(__vox.getCUT().on||!__vox.mgInfo().live||__vox.mgInfo().round!==3);i++)__mz.stp(1);__mz.stp(20);__mz.tp(17,Math.PI);__mz.stp(10);`);
s1=await st();check('R3 live after the light',s1.live&&s1.r===3,s1);
await orbit('R3_orbit_wide',`const F=__vox.mgF();__mz.cam(1000.5-36,F+12,1000.5+22,1000.5,F,1000.5);`);
await orbit('R3_orbit_high',`const F=__vox.mgF();__mz.cam(1000.5+22,F+36,1000.5+30,1000.5,F-4,1000.5);`);
/* ---- the R3 loop: first frames of each phase, Dan bracing on his island (sneak) so the inhale shows without a chomp every cycle ---- */
const phases={};const want=['inhale','swallow','hands','gag'];
for(let i=0;i<1400&&Object.keys(phases).length<want.length+2;i++){const s=await C.ev(`__vox.KEY.ShiftLeft=true;__mz.stp(2);__mz.aimBoss();return __mz.st();`);
  const key=s.win==='sun'?'sun':s.r3;if(key&&!phases[key]){phases[key]=s.t;await C.ev('__mz.draw();');await shot('R3_'+key,s);
    if(key==='hands'||key==='inhale'){await C.ev('__mz.stp(10);__mz.draw();');await shot('R3_'+key+'_b',await st());}}
  if(s.tel.some(q=>q.k==='lane')&&!phases.lane){phases.lane=s.t;await C.ev('__mz.draw();');await shot('R3_lane',s);}}
await C.ev('__vox.KEY.ShiftLeft=false;');
check('R3 phases seen: '+Object.keys(phases).join(','),want.every(k=>phases[k]),phases);
/* ---- the busiest wave (3c below 100) + per-tier timing ---- */
await C.ev(`const b=__mz.boss();if(b)b.hp=95;__mz.stp(60);`);
const busy=await st();meta.busy=busy;await C.ev('__mz.aimBoss();__mz.stp(1);__mz.draw();');await shot('R3_wave3c',busy);
const timing=async(label)=>C.ev(`const gl=renderer.getContext(),px=new Uint8Array(4),ft=[],rt=[];let tris=0,calls=0;
  for(let i=0;i<70;i++){const a=performance.now();__mz.stp(1);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);const b=performance.now();
    if(i>=10){ft.push(b-a);tris+=renderer.info.render.triangles;calls+=renderer.info.render.calls;}}
  ft.sort((x,y)=>x-y);const n=ft.length;return {label:'${label}',median:+ft[n>>1].toFixed(1),p95:+ft[Math.floor(n*0.95)].toFixed(1),max:+ft[n-1].toFixed(1),
    fps:+(1000/ft[n>>1]).toFixed(0),tris:Math.round(tris/n),calls:Math.round(calls/n),adds:__mz.st().adds};`);
meta.perf=[];
/* the same busy state for every tier: waves 3b + 3c re-queued (the adds cap is 8 at once), spawned and compiled before timing starts */
const refill=`const V=__vox,M2=V.getMG2(),b=__mz.boss();if(b)b.hp=95;M2.waves['3b']=0;M2.waves['3c']=0;V.KEY.ShiftLeft=true;
  for(let i=0;i<260&&M2.adds.length<8;i++)__mz.stp(1);__mz.stp(30);V.KEY.ShiftLeft=false;__mz.aimBoss();return M2.adds.length;`;
if(PERF){if(PACK==='hr'){for(const q of [0,1,2,3]){await C.ev(`await __vox.setQuality(${q});__mz.stp(20);`);const a0=await C.ev(refill);const t=await timing(['Low','Medium','High','Ultra'][q]);t.adds0=a0;meta.perf.push(t);console.log('perf',JSON.stringify(t));}
    await C.ev(`await __vox.setQuality(${Q});__mz.stp(10);`);}
  else{const a0=await C.ev(refill);const t=await timing('OG');t.adds0=a0;meta.perf.push(t);console.log('perf',JSON.stringify(t));}}
/* ---- an honest kill: 1 HP, wait for the gag's sun window, one Dan hit on it ---- */
let killed=null;
for(let g=0;g<900&&!killed;g++){const s=await C.ev(`const V=__vox,b=__mz.boss(),M2=V.getMG2();if(b&&b.hp>1)b.hp=1;V.KEY.ShiftLeft=true;
    if(M2.win&&M2.win.kind==='sun'){const pt=V.entities.find(q=>!q.dead&&q.mt==='mgpart');if(pt)V.mgHitAs(pt,13,'Dan','melee');}__mz.stp(2);return __mz.st();`);
  if(s.cut&&s.ph==='death')killed=s;}
await C.ev('__vox.KEY.ShiftLeft=false;');
check('an honest kill in the sun window starts THE BURST',!!killed,killed);
const nDeath=await scene('death',18,22);check('death frames '+nDeath,nDeath>=10);
await C.ev(`for(let i=0;i<200;i++)__mz.stp(1);`);
const fin=await C.ev(`const V=__vox;return {dead:!!V.getDEMON().dead,jaw:V.P.inv.some(s=>s&&V.DEFS[s.id]&&/Jaw/.test(V.DEFS[s.id].name||''))||V.entities.some(e=>e.t==='drop'&&!e.dead&&V.DEFS[e.st.id]&&/Jaw/.test(V.DEFS[e.st.id].name||'')),
  win:!!(document.getElementById('win')&&getComputedStyle(document.getElementById('win')).display!=='none'),st:__mz.st()};`);
await shot('after_win_screen',fin);
check('after the burst: DEMON.dead, the Jaw paid, YOU WIN up',fin.dead&&fin.jaw&&fin.win,fin);
await C.ev(`try{closeWin();}catch(e){}__mz.stp(20);const b=__vox.mgBonePile(),P=__vox.P;P.x=b.x;P.y=b.y+0.1;P.z=b.z;__mz.look(1000.5,__vox.mgF()-3,1000.5);__mz.stp(80);`);
await eye('buried_lip');
await orbit('buried_orbit',`const F=__vox.mgF();__mz.cam(1000.5-52,F+30,1000.5-34,1000.5,F-5,1000.5);`);
/* ---- finish ---- */
const logs=C.logs.filter(l=>!/WebGL|GPU stall|favicon|Automatic fallback to software/.test(l));meta.logs=logs;meta.checks=checks;
check('no console error or exception during the session',!logs.some(l=>/^(error|exception)/.test(l)),logs.slice(0,8));
await C.ev('try{if(__vox.getTP().hr)await __vox.setPack("og");}catch(e){}');await C.restoreOG();
fs.writeFileSync(OUT+'/summary.json',JSON.stringify({shots:shots.map(f=>path.basename(f)),meta},null,1));
try{execFileSync('python3',[ROOT+'tools/qa/malgorath/mz_sheet.py',OUT],{stdio:'inherit'});}catch(e){console.log('sheet failed',e.message);}
console.log('OUT',OUT,checks.filter(c=>!c[1]).length+' failed of '+checks.length);C.close();process.exit(0);
