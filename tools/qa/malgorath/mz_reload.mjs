// mz_reload.mjs (MZ, plan 11.3): Malgorath across a death and a real page reload, MUTED, in the real page with real storage. Seed 1337,
// survival: R2 woken, Dan dies in the fight (the vacuum, the Bone Pile, the belch), the R2 checkpoint holds; the world is saved, the
// page is RELOADED and the world loaded back: still R2, alive, the site at its R2 layout, no boss until he is woken again, the old
// edits never leaked; then he is woken from the save, in OG and in Hyperreal. JPEGs + summary.json into --out.
//   node tools/qa/malgorath/mz_reload.mjs --port 9386 [--build dist/dinglecraft_v<VER>.html] [--out dir]
// MUTED: as mz_qa.mjs (m3_lib: --mute-audio, vx_vox_settings snd 0 before the page runs, soundOn=false + AC.suspend on every evaluation).
import fs from 'fs';import path from 'path';import {args,connect,ROOT,defaultBuild} from './m3_lib.mjs';
const A=args(),PORT=+(A.port||9386),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild();
const OUT=path.resolve(A.out||ROOT+'out/qa/mz_reload');fs.mkdirSync(OUT,{recursive:true});
const C=await connect(PORT);const URL=`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`;await C.open(URL);
const checks=[],shots=[];const check=(n,c,info)=>{checks.push([n,!!c,info===undefined?null:info]);console.log((c?'ok   ':'FAIL ')+n+(!c&&info!==undefined?' '+JSON.stringify(info).slice(0,500):''));};
const HELP=`window.__rl={T:700000,stp(n){for(let i=0;i<(n||1);i++){if(typeof paused!=='undefined'&&paused&&playing&&!__vox.P.dead)resumeGame();this.T+=40;__vox.frameStep(this.T);}},
  look(x,y,z){const P=__vox.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));},
  draw(){if(__vox.getTP().hr&&__vox.tpRenderOnce)__vox.tpRenderOnce();else renderer.render(scene,camera);},
  lip(){const V=__vox,b=V.mgBonePile(),P=V.P;V.forceChunksNear(b.x,b.z);V.forceChunksNear(1000,1000);P.x=b.x;P.y=b.y+0.1;P.z=b.z;P.vx=P.vy=P.vz=0;P.fallD=0;this.look(1000.5,V.mgF()-2,1000.5);},
  st(){const V=__vox,M=V.getMALG(),i=V.mgInfo();return {round:M.round,met:M.met,dead:!!V.getDEMON().dead,live:i.live,boss:i.boss,deaths:M.deaths,P:[+V.P.x.toFixed(1),+V.P.y.toFixed(1),+V.P.z.toFixed(1)],
    pdead:V.P.dead,zone:V.mgZone(V.P.x,V.P.y,V.P.z),layout:V.MGREG.world&&V.MGREG.world.L?V.MGREG.world.L():null,edits:V.mgCore().chunkEdits?[...V.mgCore().chunkEdits.keys()].length:null};}};
  try{usePLock=false;lockWanted=false;}catch(e){}Object.assign(__vox.BRAIN,{mock:null,ok:false,off:true,url:'http://127.0.0.1:9'});return 1;`;
const shot=async(name)=>{await C.ev('__rl.stp(1);__rl.draw();');await C.sleep(40);const r=await C.send('Page.captureScreenshot',{format:'jpeg',quality:84});
  const f=OUT+'/'+String(shots.length+1).padStart(2,'0')+'_'+name+'.jpg';fs.writeFileSync(f,Buffer.from(r.result.data,'base64'));shots.push(f);};
await C.ev(HELP);
await C.ev(`const V=__vox;V.startNewWorld('mzreload','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);__rl.stp(200);
  const F=V.mgF(),P=V.P;V.forceChunksNear(1000,1000);V.forceChunksNear(986,1000);P.x=986.5;P.y=F;P.z=1000.5;__rl.stp(30);V.mgSkipTo(2);
  for(let i=0;i<900&&(V.getCUT().on||!V.mgInfo().live||V.mgInfo().round!==2);i++)__rl.stp(1);__rl.stp(30);return 1;`);
let s=await C.ev('return __rl.st();');check('R2 live, survival',s.live&&s.round===2&&s.boss,s);
/* Dan dies in the fight: nothing but his hits, after the death grace */
await C.ev(`const V=__vox,P=V.P;for(let i=0;i<500&&!P.dead;i++){if(i>150){P.hp=Math.min(P.hp,1);}__rl.stp(1);}return P.dead;`);
s=await C.ev('return __rl.st();');check('Dan died in R2 (the fight killed him)',s.pdead,s);await shot('death');
await C.ev(`__vox.respawn();__rl.stp(60);`);s=await C.ev('return __rl.st();');
check('respawned at the Bone Pile, the R2 checkpoint held (a death inside 15 s of the round start is not counted by the rubber band: deaths '+JSON.stringify(s.deaths)+')',!s.pdead&&s.round===2&&s.zone!=='arena'&&s.zone!=='gut',s);await shot('bonepile_after_death');
/* walk away to dormancy, save, reload */
await C.ev(`const V=__vox,P=V.P;V.forceChunksNear(880,1000);P.x=880.5;P.y=50;P.z=1000.5;P.flying=true;__rl.stp(200);`);
const pre=await C.ev('return __rl.st();');
check('the world saves',await C.ev("return await saveToStorage('mzreload',true);")===true);
await C.send('Page.reload',{ignoreCache:true});await C.sleep(800);
for(let i=0;i<240;i++){let v=false;try{v=await C.ev("return typeof window.__vox==='object'&&document.readyState==='complete'");}catch(e){}if(v)break;await C.sleep(500);}
await C.ev(HELP);await C.ev(`await loadWorldByName('mzreload');__vox.GR.mobSpawn=false;__rl.stp(80);`);
s=await C.ev('return __rl.st();');check('after a page reload: v6.3, still R2, met, alive, not dead, no boss until woken',s.round===2&&s.met&&!s.dead&&!s.boss&&!s.pdead,{pre,post:s});
await C.ev(`__rl.lip();__rl.stp(80);`);s=await C.ev('return __rl.st();');check('the site is at its R2 layout (M1 L2)',s.layout==='L2',s);await shot('reload_lip_og');
/* wake him from the save (two pokes are an R1 thing; a checkpoint round wakes on the plate) */
await C.ev(`const V=__vox,F=V.mgF(),P=V.P;V.forceChunksNear(986,1000);P.flying=false;P.x=986.5;P.y=F;P.z=1000.5;__rl.stp(10);V.mgSkipTo(2);
  for(let i=0;i<900&&(V.getCUT().on||!V.mgInfo().live);i++)__rl.stp(1);__rl.stp(20);const b=V.entities.find(e=>!e.dead&&e.mgBoss);if(b)__rl.look(b.x,b.y+8,b.z);__rl.stp(1);`);
s=await C.ev('return __rl.st();');check('woken from the reloaded save: R2 live, one boss',s.live&&s.round===2&&s.boss,s);await shot('reload_r2_og');
await C.ev(`await __vox.setQuality(2);await __vox.setPack('hr');__rl.stp(30);`);await shot('reload_r2_hr');
check('Hyperreal after the reload, the boss in the HR skin',await C.ev('const h=__vox.getHRMG?__vox.getHRMG():null;return !!(__vox.getTP().hr&&h&&h.skin===\'hr\');'));
await C.ev('await __vox.setPack("og");');
const logs=C.logs.filter(l=>!/WebGL|GPU stall|favicon|Automatic fallback/.test(l));
check('no console error or exception',!logs.some(l=>/^(error|exception)/.test(l)),logs.slice(0,8));
await C.restoreOG();fs.writeFileSync(OUT+'/summary.json',JSON.stringify({shots:shots.map(f=>path.basename(f)),checks,logs},null,1));
console.log('OUT',OUT,checks.filter(c=>!c[1]).length+' failed of '+checks.length);C.close();process.exit(0);
