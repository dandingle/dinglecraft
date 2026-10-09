// m3_game.mjs (M3): the OG model + VFX IN THE GAME, MUTED. Seed 1337 (the Bite at sea), Dan teleported to the lip and the plate, the
// fight woken through mgSkipTo, frames driven only by __vox.frameStep (rAF disabled), then orbit shots rendered with the game's own
// renderer/scene/camera after each step (the core camera is put back by the next frame). Writes JPEGs + a 5x6 sheet into --out.
//   node tools/qa/malgorath/m3_game.mjs --port 9384 [--build dist/dinglecraft_v<VER>.html] [--out dir] [--pack hr]
import fs from 'fs';import path from 'path';import {execFileSync} from 'child_process';import {args,connect,ROOT,saveData,defaultBuild} from './m3_lib.mjs';
const A=args(),PORT=+(A.port||9384),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild();
const OUT=path.resolve(A.out||ROOT+'out/qa/m3_game_'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19));fs.mkdirSync(OUT,{recursive:true});
const C=await connect(PORT);await C.open(`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`);
const HELP=`window.__m3g={T:900000,step(n){for(let i=0;i<(n||1);i++){this.T+=40;__vox.frameStep(this.T);}},
  orbit(px,py,pz,tx,ty,tz){camera.position.set(px,py,pz);const vx=tx-px,vy=ty-py,vz=tz-pz,vl=Math.hypot(vx,vy,vz)||1;camera.rotation.y=Math.atan2(-vx,-vz);camera.rotation.x=Math.asin(vy/vl);camera.rotation.z=0;
    renderer.render(scene,camera);return renderer.domElement.toDataURL('image/jpeg',0.85);},
  dan(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/jpeg',0.85);},
  boss(){return __vox.entities.find(e=>!e.dead&&e.mt==='demon'&&e.mgBoss)||null;},
  aim(){const b=this.boss(),P=__vox.P;if(!b||!b.mgRig)return;const h=b.mgRig.zone('head');const dx=h.x-P.x,dy=h.y-(P.y+1.62),dz=h.z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.max(-1.2,Math.min(1.2,Math.atan2(dy,Math.hypot(dx,dz))*0.8));}};`;
await C.ev(HELP);
await C.ev(`const V=__vox;V.startNewWorld('m3game','1337','s');V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.32);V.GR.god=true;__m3g.step(160);return 1;`);
if(A.pack==='hr'){const r=await C.ev(`try{__vox.setPack('hr');}catch(e){return 'nopack '+e.message;}__m3g.step(30);return 'hr';`);console.log('pack',r);}
const shots=[];const keep=async(name,code)=>{const d=await C.ev(code);if(d)shots.push(saveData(OUT+'/'+String(shots.length+1).padStart(2,'0')+'_'+name+'.jpg',d));};
const tp=(x,y,z,yaw,pitch)=>`const P=__vox.P;__vox.forceChunksNear(${x},${z});P.x=${x};P.y=${y};P.z=${z};P.vx=P.vy=P.vz=0;P.fallD=0;P.yaw=${yaw};P.pitch=${pitch};`;
/* approach: from the sea at 120 m and the lip */
await C.ev(tp(1000.5-120,44,1000.5,'-Math.PI/2',-0.05)+'__m3g.step(60);return 1;');
await keep('approach_120m',`return __m3g.dan();`);
await C.ev(`const b=__vox.mgBonePile();${tp('b.x','b.y','b.z','-Math.PI/2','-0.3')}__m3g.step(80);return 1;`);
await keep('lip_bonepile',`return __m3g.dan();`);
await keep('lip_orbit',`const F=__vox.mgF();return __m3g.orbit(1000.5-50,F+30,1000.5-30,1000.5,F-6,1000.5);`);
/* round 1: on the plate, woken (no intro) */
await C.ev(`const F=__vox.mgF();${tp('1000.5-14','F','1000.5','-Math.PI/2','0.25')}__m3g.step(30);__vox.mgSkipTo(1);for(let i=0;i<600&&(__vox.getCUT().on||!__vox.mgInfo().live);i++)__m3g.step(1);__m3g.step(30);return __vox.mgInfo();`);
for(let i=0;i<6;i++){await C.ev('__m3g.step(14);__m3g.aim();__m3g.step(1);return 1;');await keep('r1_dan_'+i,`return __m3g.dan();`);}
await keep('r1_orbit_front',`const F=__vox.mgF(),b=__m3g.boss();return __m3g.orbit(1000.5-30,F+12,1000.5+10,1000.5,F+4,1000.5);`);
await keep('r1_orbit_high',`const F=__vox.mgF();return __m3g.orbit(1000.5+28,F+26,1000.5-28,1000.5,F,1000.5);`);
/* round 2 */
await C.ev(`__vox.mgSkipTo(2);for(let i=0;i<900&&(__vox.getCUT().on||!__vox.mgInfo().live||__vox.mgInfo().round!==2);i++)__m3g.step(1);__m3g.step(40);return __vox.mgInfo();`);
for(let i=0;i<5;i++){await C.ev('__m3g.step(16);__m3g.aim();__m3g.step(1);return 1;');await keep('r2_dan_'+i,`return __m3g.dan();`);}
await keep('r2_orbit',`const F=__vox.mgF(),b=__m3g.boss();const x=b?b.x:1000.5,z=b?b.z:1000.5;return __m3g.orbit(x-22,F+9,z+14,x,F+6,z);`);
/* round 3 */
await C.ev(`__vox.mgSkipTo(3);for(let i=0;i<900&&(__vox.getCUT().on||!__vox.mgInfo().live||__vox.mgInfo().round!==3);i++)__m3g.step(1);__m3g.step(40);
  const F=__vox.mgF();${tp('1000.5-17','F','1000.5','-Math.PI/2','0.1')}__m3g.step(20);return __vox.mgInfo();`);
for(let i=0;i<6;i++){await C.ev('__m3g.step(20);__m3g.aim();__m3g.step(1);return 1;');await keep('r3_dan_'+i,`return __m3g.dan();`);}
await keep('r3_orbit',`const F=__vox.mgF();return __m3g.orbit(1000.5-34,F+10,1000.5+20,1000.5,F,1000.5);`);
await keep('r3_orbit_high',`const F=__vox.mgF();return __m3g.orbit(1000.5+20,F+34,1000.5+30,1000.5,F-4,1000.5);`);
const logs=C.logs.filter(l=>!/WebGL|GPU stall|favicon/.test(l));
fs.writeFileSync(OUT+'/summary.json',JSON.stringify({shots:shots.map(f=>path.basename(f)),logs},null,1));
execFileSync('python3',[ROOT+'tools/qa/malgorath/m3_sheet.py',OUT,OUT+'/sheet.jpg'],{stdio:'inherit'});
await C.restoreOG();console.log(JSON.stringify({out:OUT,shots:shots.length,logs:logs.slice(0,10)}));C.close();process.exit(0);
