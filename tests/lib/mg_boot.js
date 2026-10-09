/* mg_boot.js (lead): boots the spliced game headless for the Malgorath suites (c_boot semantics: hr_boot + the firstChild DOM stub
   extension, one boot per process, $DC_BUILD/game.js, no network, the bot brain switched off) plus Malgorath helpers.
   const boot=require('./mg_boot.js');const V=boot({seed:1337});     // V = window.__vox
   boot.ok/skip/run/done/stepper/settle/purge as pg_boot             // prints "(k skipped: ...)" then "N passed, M failed"
   boot.mgStubbed('2')     -> true while Malgorath package 2 is on its stub (V.mgInfo().stubs)
   boot.world(V,name,seed,step) -> a fresh survival world (snail off, mobs off), settled 160 frames
   boot.bite(V,step,o)     -> Dan on the plate of the Bite: chunks forced, settled; o.r (default 14) and o.th (default PI, the -x side)
   boot.lip(V,step)        -> Dan at the Bone Pile (outside, on the stair head)
   boot.kit(V,'A'|'D'|'M') -> the bible 16.1 reference kits (armour worn, sword in slot 0, bow + arrows, steaks, TNT, grenades)
   boot.boss(V)            -> the live boss entity (mt 'demon', mgBoss) or null
   boot.detClock(V)        -> load-independent chunk budget for fight-length suites (performance.now on the stepper clock)
   boot.lights(o)          -> PointLights under an Object3D (walks children: the root stub traverse is used as is)
   Rules (plan 9.5): stepper base >= 700000 and strictly increasing; settle >= 25 frames after every teleport; GR.mobSpawn=false and
   purge before damage-sensitive phases; never cache V.P (applySave/startNewWorld replace it); run live bots last. */
'use strict';
const cb=require('./c_boot.js');
function mgStubbed(d){const V=global.__vox;return !!(V&&V.mgInfo&&String(V.mgInfo().stubs).indexOf(String(d))>=0);}
function tp(V,x,y,z){const P=V.P;P.x=x;P.y=y;P.z=z;P.vx=P.vy=P.vz=0;P.fallD=0;}
function bite(V,step,o){o=o||{};const r=o.r==null?14:o.r,th=o.th==null?Math.PI:o.th,F=V.mgF();
  const x=1000.5+Math.cos(th)*r,z=1000.5+Math.sin(th)*r;
  V.forceChunksNear(x,z);V.forceChunksNear(1000,1000);tp(V,Math.floor(x)+0.5,F,Math.floor(z)+0.5);
  V.P.yaw=Math.atan2(-(1000.5-V.P.x),-(1000.5-V.P.z));V.P.pitch=0;
  step(o.settle==null?25:o.settle);return {x:V.P.x,y:V.P.y,z:V.P.z};}
function lip(V,step){const b=V.mgBonePile();V.forceChunksNear(b.x,b.z);tp(V,b.x,b.y,b.z);step(25);return b;}
function kit(V,k){const P=V.P,IT=V.IT,m=k==='D'?3:(k==='M'?0:2);   /* ARM_M: 0 iron, 1 golden, 2 diamond, 3 dragon (armorId 230+m*4+s) */
  P.armor=[0,1,2,3].map(s=>({id:V.armorId(m,s)}));
  const sw=k==='M'?{id:V.toolId(3,3),count:1,ench:{sharp:3}}:{id:V.toolId(3,3),count:1,ench:{sharp:5,steal:3}};
  P.inv[0]=sw;P.sel=0;
  if(k!=='M'){P.inv[1]={id:IT.BOW,count:1,ench:{pow:5}};P.inv[2]={id:IT.ARROW,count:64};P.inv[3]={id:IT.STEAK,count:16};
    P.inv[4]={id:V.B.TNT,count:6};P.inv[5]={id:IT.GRENADE,count:6};}
  P.hp=20;P.hunger=20;V.refreshHand();return P;}
function boss(V){return V.entities.find(e=>!e.dead&&e.mt==='demon'&&e.mgBoss)||null;}
/* v6.3 (MZ) detClock(V): the engine budgets chunk meshing by performance.now (updateChunks stops after 8 ms of wall time), so on a busy
   machine chunks build in a different order and a long fight diverges (M2: world 1337 374.9 s / 1 death solo, 653.9 s / 4 deaths with
   8 runs in parallel). For fight-length suites: performance.now reads the stepper's frame time plus 2 ms per call within a frame, so
   every frame gets the same meshing budget (about 4 chunks) whatever the load. Long-scale timers stay on game time. */
function detClock(V){if(V.__detClock)return;V.__detClock=1;let base=0,n=0;const fs=V.frameStep;
  V.frameStep=function(T){base=T;n=0;return fs.apply(this,arguments);};
  const now=()=>base+(n++)*2;try{performance.now=now;}catch(e){}
  if(performance.now!==now)Object.defineProperty(globalThis,'performance',{value:{now},configurable:true,writable:true});}
function lights(o){const out=[];const walk=n=>{if(!n)return;if(n instanceof THREE.PointLight||n.isPointLight)out.push(n);   /* root stubs: every light is one class */
  for(const c of (n.children||[]))walk(c);};walk(o);return out;}
module.exports=cb;
const hb=require('./hr_boot.js');
Object.assign(cb,{mgStubbed,tp,bite,lip,kit,boss,lights,detClock,scene:()=>hb.scene(),renderer:()=>hb.renderer()});
