/* c_boot.js (lead): boots the spliced game headless for the creativity suites (pg_boot.js semantics: hr_boot + the firstChild DOM
   stub extension, one boot per process, $DC_BUILD/game.js) plus creativity helpers.
   const boot=require('./c_boot.js');const V=boot({});            // V = window.__vox
   boot.ok/skip/run/done/stepper/settle as pg_boot                 // prints "(k skipped: ...)" then "N passed, M failed"
   boot.crStubbed('1')            -> true while creativity package 1 is on its stub (V.crInfo().stubs)
   boot.studio(V,step,o)          -> a fresh survival world with a little studio around Dan: stone floor, stone walls at x+6 (faces -x),
                                     x-2 (faces +x), z-6 (faces +z) and z+6 (faces -z), air between, 6 high; returns {x,y,z}
                                     o.dx/o.dz offset it from Dan; o.keep builds it in the CURRENT world (no new world)
   boot.aim(V,x,y,z)              -> point Dan's eye at a world point (pitch positive is up)
   boot.rclick(V,step)            -> one frame of right mouse (a held right-click keeps placing), then 2 frames up
   boot.mine(V,step,n)            -> hold left mouse n frames (survival) then release
   boot.give(V,id,slot)           -> put {id,count:1} in a hotbar slot and select it (whatever was there moves to the backpack)
   boot.works(V)                  -> [{n,id,rec}] of every work in the registry
   boot.invIds(V)                 -> ids of every non-empty inventory stack */
'use strict';
const pg=require('./pg_boot.js');
function crStubbed(d){const V=global.__vox;return !!(V&&V.crInfo&&V.crInfo().stubs.indexOf(String(d))>=0);}
function aim(V,x,y,z){const P=V.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));}
function rclick(V,step){V.MB.r=true;step(1);V.MB.r=false;step(2);}
function mine(V,step,n){V.MB.l=true;step(n||20);V.MB.l=false;step(2);}
function give(V,id,slot){const P=V.P,s=slot==null?0:slot;if(P.inv[s]){const e=P.inv.findIndex((q,i)=>!q&&i>8);if(e>0)P.inv[e]=P.inv[s];}  /* never overwrite a stack */
  P.inv[s]={id,count:1};P.sel=s;V.refreshHand();return P.inv[s];}
function studio(V,step,o){o=o||{};if(!o.keep){V.startNewWorld(o.name||'crtest',String(o.seed||'1337'),o.mode||'s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;
  step(160);}const P=V.P,B=V.B;const x=Math.floor(P.x)+(o.dx||0),z=Math.floor(P.z)+(o.dz||0);
  if(o.dx||o.dz){V.forceChunksNear(x,z);step(25);}
  const y=Math.max(V.surfaceTop(x,z)+1,Math.floor(P.y));
  for(let dx=-2;dx<=6;dx++)for(let dz=-6;dz<=6;dz++){V.setBlock(x+dx,y-1,z+dz,B.STONE);
    for(let dy=0;dy<=6;dy++)V.setBlock(x+dx,y+dy,z+dz,(dx===6||dx===-2||dz===-6||dz===6)?B.STONE:B.AIR);}
  P.x=x+0.5;P.z=z+0.5;P.y=y;P.vx=P.vy=P.vz=0;P.fallD=0;P.mode=o.mode||'s';step(10);
  for(const e of V.entities)if(e.t==='mob'&&!e.dead&&!e.bot&&Math.hypot(e.x-P.x,e.z-P.z)<64){e.hurtT=0;V.hurtMob(e,99999,0,0);}
  step(5);return {x,y,z};}
function works(V){const W=V.getCR().CRW;return Object.keys(W).map(k=>({n:+k,id:V.crItemId(+k),rec:W[k]}));}
function invIds(V){return V.P.inv.filter(Boolean).map(s=>s.id);}
/* no network, ever: the game's brain client would otherwise talk to Dan's brain server on 127.0.0.1:8644 when bots join */
function noNet(){global.fetch=async()=>{throw new Error('no network in the creativity suites');};}
function boot(o){noNet();const V=pg(o||{});noNet();
  if(V&&V.BRAIN){V.setBrainMock(null);Object.assign(V.BRAIN,{mock:null,ok:false,off:true});}
  if(V&&typeof V.getCRFD==='function')V.getCRFD().off=true;   /* rare found works off by default in the suites (c3_found turns them on) */
  return V;}
module.exports=boot;
Object.assign(boot,pg,{crStubbed,aim,rclick,mine,give,studio,works,invIds});
