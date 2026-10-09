// m3_scenes.mjs (M3): the four scenes in the game, MUTED, as the player sees them (the cutscene camera, the scene pictures): the full
// intro (two pokes of the eye), then GR.instaKill hits walk him through THE CLIMB-OUT, THE LIGHT and THE BURST (a preview kill: nothing is
// paid). Frames every ~0.5 s of scene time into --out + a 5x6 sheet. rAF disabled; frames only through __vox.frameStep.
//   node tools/qa/malgorath/m3_scenes.mjs --port 9384 [--build dist/dinglecraft_v<VER>.html] [--out dir] [--night 1]
import fs from 'fs';import path from 'path';import {execFileSync} from 'child_process';import {args,connect,ROOT,saveData,defaultBuild} from './m3_lib.mjs';
const A=args(),PORT=+(A.port||9384),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild();
const OUT=path.resolve(A.out||ROOT+'out/qa/m3_scenes_'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19));fs.mkdirSync(OUT,{recursive:true});
const C=await connect(PORT);await C.open(`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`);
await C.ev(`window.__m3g={T:900000,step(n){for(let i=0;i<(n||1);i++){this.T+=40;__vox.frameStep(this.T);}},shot(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/jpeg',0.82);},
  boss(){return __vox.entities.find(e=>!e.dead&&e.mt==='demon'&&e.mgBoss)||null;}};
  const V=__vox;V.startNewWorld('m3scenes','1337','s');V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(${A.night?0.8:0.3});V.GR.god=true;__m3g.step(160);
  const F=V.mgF(),P=V.P;V.forceChunksNear(1000,1000);P.x=1000.5-9;P.y=F;P.z=1000.5;P.yaw=-Math.PI/2;P.pitch=-0.4;P.vx=P.vy=P.vz=0;__m3g.step(60);return 1;`);
const shots=[];const keep=async(name)=>{const d=await C.ev('return __m3g.shot();');shots.push(saveData(OUT+'/'+String(shots.length+1).padStart(2,'0')+'_'+name+'.jpg',d));};
/* the eye: two pokes within 12 s -> the intro */
const eye=await C.ev(`const e=__vox.entities.find(q=>!q.dead&&q.mt==='mgeye');if(!e)return null;__vox.mgHitAs(e,4,'Dan','melee');__m3g.step(20);__vox.mgHitAs(e,4,'Dan','melee');__m3g.step(2);return {cut:__vox.getCUT().on,ph:__vox.getMGL().phase};`);
console.log('eye',JSON.stringify(eye));await keep('poke');
const MY=A.mycam?1:0;
const scene=async(label,maxSteps,every)=>{let n=0,last='';for(let i=0;i<maxSteps;i++){const s=await C.ev(`if(${MY}){const S=__vox.getCUT().script;if(S&&!S._m3){S._m3=1;const ph=__vox.getMGL().phase;const f=__vox.MGREG.fx.cam(ph,(S.end||0)>5);if(f)S.cam=f;}}__m3g.step(${every});return {on:__vox.getCUT().on,t:__vox.getCUT().t,ph:__vox.getMGL().phase,live:__vox.mgInfo().live,r:__vox.mgInfo().round};`);
    if(!s.on){if(n>0)break;continue;}n++;last=s.ph;await keep(label+'_'+s.ph+'_t'+s.t.toFixed(1));}return n;};
const ni=await scene('intro',60,12);console.log('intro frames',ni);
/* R1 -> instaKill hits until the climb-out plays, then the light, then the death */
await C.ev(`__vox.GR.instaKill=true;return 1;`);
for(const k of ['climb','light','death']){let started=false;for(let g=0;g<200&&!started;g++){const s=await C.ev(`const b=__m3g.boss();if(b&&!__vox.getCUT().on&&__vox.mgInfo().live){
      const P=__vox.P,F=__vox.mgF(),z=b.mgRig&&b.mgRig.zone?b.mgRig.zone('${k==='death'?'sun':'head'}'):null;__vox.mgHitAs(b,13,'Dan','melee');
      const pt=__vox.entities.find(q=>!q.dead&&q.mt==='mgpart');if(pt)__vox.mgHitAs(pt,13,'Dan','melee');}
    __m3g.step(8);return {on:__vox.getCUT().on,ph:__vox.getMGL().phase};`);started=s.on&&s.ph===k;}
  const n=await scene(k,60,k==='death'?10:8);console.log(k,'frames',n);}
await C.ev(`__vox.GR.instaKill=false;return 1;`);
const logs=C.logs.filter(l=>!/WebGL|GPU stall|favicon/.test(l));
fs.writeFileSync(OUT+'/summary.json',JSON.stringify({shots:shots.map(f=>path.basename(f)),logs},null,1));
const sub=[];for(let i=0;i<shots.length;i+=Math.max(1,Math.ceil(shots.length/30)))sub.push(shots[i]);
fs.mkdirSync(OUT+'/pick',{recursive:true});for(const f of sub)fs.copyFileSync(f,OUT+'/pick/'+path.basename(f));
execFileSync('python3',[ROOT+'tools/qa/malgorath/m3_sheet.py',OUT+'/pick',OUT+'/sheet.jpg'],{stdio:'inherit'});
await C.restoreOG();console.log(JSON.stringify({out:OUT,shots:shots.length,logs:logs.slice(0,10)}));C.close();process.exit(0);
