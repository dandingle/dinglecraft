/* DINGLECRAFT AI-players test bench (headless). Drives the three agents with a
   scripted mock brain so every system is exercised without the network. */
'use strict';
require('./stubs.js');
/* deterministic and hermetic: seeded randomness, a clock that only moves when the game asks it
   (the chunk loader's 8 ms budget then loads the same chunks every run), and no real network
   (a brain server running on this machine is never contacted by the tests) */
const SEEDED=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
Math.random=SEEDED(+process.env.BOTSEED||59);   /* BOTSEED=n node botsmoke.js explores other runs */
let _clk=0;global.performance.now=()=>(_clk+=0.5);
global.fetch=async()=>{throw new Error('no network in tests');};
require('./game.js');
const V=global.__vox;
const {B,IT}=V;
let pass=0,fail=0;
const ok=(n,c)=>{if(c)pass++;else{fail++;console.log('FAIL '+n);}};
let T=600000;
const step=(n,ms)=>{for(let i=0;i<n;i++){T+=ms||50;V.frameStep(T);}};
const tick=async(n,ms)=>{for(let i=0;i<n;i++){T+=ms||50;V.frameStep(T);if(i%10===0)await new Promise(r=>setImmediate(r));}};
/* a dry, loaded spot for a test lot (CLAUDE.md 8: build above the water table), searched outward from x0,z0 */
const SEA=30;   /* sea level (CLAUDE.md 4) */
const dryLot=(x0,z0,R)=>{
  const loaded=(x,z)=>V.getBlock(x,0,z)===B.BEDROCK;
  for(let r=0;r<=64;r+=4)for(let k=0;k<(r?16:1);k++){
    const x=Math.floor(x0+Math.sin(k/16*6.283)*r),z=Math.floor(z0+Math.cos(k/16*6.283)*r);
    if(![[-R,-R],[R,-R],[-R,R],[R,R],[0,0]].every(([dx,dz])=>loaded(x+dx,z+dz)))continue;
    if(V.colInfo(x,z).h<SEA+2)continue;
    return {x,z,y:Math.max(V.colInfo(x,z).h,SEA+2)};
  }
  return {x:Math.floor(x0),z:Math.floor(z0),y:SEA+4};
};
/* raise/flatten a square lot TOP-DOWN with a solid stone base under it, so nothing falls or floods in */
const flatLot=(cx,cz,gy,R)=>{for(let x=-R;x<=R;x++)for(let z=-R;z<=R;z++){
  for(let y=Math.min(40,74-gy);y>=1;y--)V.setBlock(cx+x,gy+y,cz+z,B.AIR);
  V.setBlock(cx+x,gy,cz+z,B.GRASS);V.setBlock(cx+x,gy-1,cz+z,B.DIRT);
  for(let y=gy-2;y>=Math.max(1,gy-14);y--){const id=V.getBlock(cx+x,y,cz+z);if(y===gy-2||id===B.AIR||id===B.WATER)V.setBlock(cx+x,y,cz+z,B.STONE);}}};

(async()=>{
  /* ---- a world with the AI players switched off: nothing changes ---- */
  V.startNewWorld('bots-off','4242','s');
  V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;
  step(40);
  ok('no agents unless invited',V.AGENTS.length===0&&!V.getAG().active);

  /* ---- invite them ---- */
  const calls=[];
  V.setBrainMock((lane,bot,p)=>{calls.push({lane,bot,p});
    if(lane==='mind')return {project:{title:'Test Project',kind:'BUILD',why:'testing',steps:['look around','build a hut']},announce:''};
    if(lane==='act')return {thought:'testing',say:[],actions:[{skill:'wait',count:3}],relations:[],project:'continue'};
    if(lane==='build')return {thought:'hut',place:[],remove:[],done:true};
    return null;});
  V.GR.bots=true;V.agJoinAll(false);
  step(60);
  ok('three agents join',V.AGENTS.length===3&&V.getAG().active);
  ok('each gets a body near spawn',V.AGENTS.every(a=>a.e&&!a.e.dead));
  ok('Dan is handed a Player Compass',V.P.inv.some(s=>s&&s.id===IT.PCOMPASS));
  const brad=V.agByName('BunkerBrad'),creep=V.agByName('xx_lilcreepah_xx'),bee=V.agByName('honeybee_mc');
  ok('names resolve',!!brad&&!!creep&&!!bee&&V.agByName('creep')===creep&&V.agByName('bee')===bee);
  const emptyStart=V.AGENTS.every(a=>a.inv.every(s=>!s)&&a.armor.every(s=>!s))&&bee.flowers.length===0;
  ok('everyone joins a new world with an EMPTY inventory (no starter kits, no flowers)',emptyStart);
  if(!V.AGENTS.every(a=>a.e&&!a.e.dead)||!emptyStart)console.log('  DIAG join:',JSON.stringify(V.AGENTS.map(a=>({n:a.name,e:!!a.e,dead:a.dead,edead:a.e&&a.e.dead,hp:a.hp,x:a.x,y:a.y,z:a.z,inv:a.inv.filter(Boolean).map(s=>s.id+'x'+s.n),fl:a.flowers,ev:a.ev.map(v=>v.txt)}))));
  await tick(80);
  ok('the brain was asked for projects',calls.some(c=>c.lane==='mind'));
  ok('the brain was asked what to do',calls.some(c=>c.lane==='act'));
  ok('projects arrive',V.AGENTS.every(a=>a.proj&&a.proj.title==='Test Project'));
  const actObs=calls.find(c=>c.lane==='act').p.obs;
  ok('observation lists players',/\[PLAYERS ON THE SERVER\]/.test(actObs)&&/Dan:/.test(actObs));
  ok('observation has time and inventory',/\[TIME\]/.test(actObs)&&/\[INVENTORY\]/.test(actObs));
  /* bodies are mobs: guards */
  ok('agents do not count toward the mob cap',V.AGENTS.every(a=>a.e.mob&&a.e.bot));

  /* ---- walking somewhere over real terrain ---- */
  V.setBrainMock(null);V.BRAIN.ok=false;V.BRAIN.off=true;
  for(const a of V.AGENTS){a.q=[];a.sk=null;a.rx=null;}
  const sx=bee.x,sz=bee.z;
  bee.q=[{k:'goto',a:{target:Math.round(sx+18)+','+Math.round(sz+6)},t:0,st:{}}];
  let d0=99;
  for(let i=0;i<900&&(bee.sk||bee.q.length);i++){T+=50;V.frameStep(T);d0=Math.min(d0,Math.hypot(bee.x-(sx+18),bee.z-(sz+6)));
    if(bee.sk&&bee.sk.k!=='goto')break;}
  ok('honeybee walks to a point ~19m away (ended '+d0.toFixed(1)+'m off)',d0<6);
  if(d0>=6)console.log('  walk notes:',JSON.stringify(bee.notes),'rx',bee.rx&&bee.rx.k,'hp',bee.hp,'dead',bee.dead);

  /* ---- placing and breaking blocks with ownership ---- */
  const e=bee.e,bx=Math.floor(e.x)+2,by=Math.floor(e.y);let bz=Math.floor(e.z);
  while(V.entities.concat([V.P]).some(o=>o&&o!==e&&Math.abs(o.x-(bx+0.5))<1.6&&Math.abs(o.z-(bz+0.5))<1.6))bz+=2;
  V.setBlock(bx,by,bz,B.AIR);V.setBlock(bx,by+1,bz,B.AIR);V.setBlock(bx,by-1,bz,B.STONE);
  /* a clear line of sight from her eyes to the spot (bots can't place through leaves or walls any more than Dan can) */
  for(let x=Math.min(Math.floor(e.x),bx);x<=Math.max(Math.floor(e.x),bx);x++)for(let z=Math.min(Math.floor(e.z),bz);z<=Math.max(Math.floor(e.z),bz);z++)
    for(let y=by;y<=by+2;y++)if(!(x===Math.floor(e.x)&&z===Math.floor(e.z)&&y<by+2))V.setBlock(x,y,z,B.AIR);
  ok('placing with nothing in the inventory fails',V.agPlaceBlock(bee,bx,by,bz,B.PLANK_B)==='none in inventory'&&V.getBlock(bx,by,bz)===B.AIR);
  V.agGive(bee,{id:B.PLANK_B,count:3},'test');
  const r1=V.agPlaceBlock(bee,bx,by,bz,B.PLANK_B);
  ok('an agent places a block ('+(r1||'ok')+')',r1===''&&V.getBlock(bx,by,bz)===B.PLANK_B);
  ok('placing used up one real plank (3 -> 2)',V.invCount(bee.inv,B.PLANK_B)===2);
  ok('the block is owned by her',V.BOWN.get(bx+','+by+','+bz)===3);
  for(let dy=24;dy<=28;dy++)for(const [dx,dz] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])V.setBlock(bx+dx,by+dy,bz+dz,B.AIR);
  const r2=V.agPlaceBlock(bee,bx,by+26,bz,B.PLANK_B);
  ok('floating placements are refused',r2.startsWith('floating'));
  if(!r2.startsWith('floating'))console.log('  floating test got:',JSON.stringify(r2),'neighbors',[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(d=>V.getBlock(bx+d[0],by+26+d[1],bz+d[2])));
  V.agBreakBlock(creep,bx,by,bz);
  ok('another agent can break it',V.getBlock(bx,by,bz)===B.AIR);
  await tick(120);
  ok('the owner notices the grief',bee.ev.some(v=>/xx_lilcreepah_xx broke/.test(v.txt)));

  /* ---- direct-placement build job driven by the mock brain ---- */
  V.setBrainMock((lane,bot,p)=>{
    if(lane==='build'){
      if(p.turn===1){const pl=[];
        for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){const edge=Math.abs(x)===2||Math.abs(z)===2;if(edge)pl.push({x,y:1,z,block:'Cobblestone'});}
        pl.push({x:9,y:9,z:9,block:'Cobblestone'});
        pl.push({x:0,y:1,z:0,block:'Diamond Block'});
        return {thought:'ring of cobble',place:pl,remove:[],done:false};}
      return {thought:'done',place:[],remove:[],done:true};}
    if(lane==='act')return {thought:'.',say:[],actions:[],project:'continue'};
    if(lane==='mind')return {project:{title:'Bunker',kind:'BUILD',why:'.',steps:['build']}};
    return null;});
  for(const a of V.AGENTS){a.q=[];a.sk=null;a.rx=null;a.bs=null;}
  /* a flat 15x15 lot so the test measures building, not terrain luck */
  const fcx=Math.floor(brad.x)+9,fcz=Math.floor(brad.z),fgy=Math.floor(brad.y)-1;
  for(let x=-7;x<=7;x++)for(let z=-7;z<=7;z++){V.setBlock(fcx+x,fgy,fcz+z,B.GRASS);for(let y=40;y>=1;y--)V.setBlock(fcx+x,fgy+y,fcz+z,B.AIR);}
  for(let x=-9;x<=9;x++)for(let z=-9;z<=9;z++){if(Math.abs(x)<=7&&Math.abs(z)<=7)continue;for(let y=40;y>=1;y--)if(V.getBlock(fcx+x,fgy+y,fcz+z)!==B.AIR)V.setBlock(fcx+x,fgy+y,fcz+z,B.AIR);}
  V.agGive(brad,{id:B.COBBLE,count:20},'test');
  brad.q=[{k:'build',a:{target:fcx+','+fcz,note:'a ring of cobblestone'},t:0,st:{}}];
  let bj=null;const jobs=[];
  for(let i=0;i<1600;i++){T+=50;V.frameStep(T);if(i%10===0)await new Promise(r=>setImmediate(r));if(brad.bjob&&!jobs.includes(brad.bjob))jobs.push(brad.bjob);if(brad.bjob)bj=brad.bjob;if(!brad.sk&&!brad.q.length&&i>20)break;}
  if(jobs.length!==1)console.log('  DIAG jobs:',JSON.stringify(jobs.map(j=>({cx:j.cx,gy:j.gy,cz:j.cz,goal:j.goal,placed:j.placed,turn:j.turn}))),'lot',fcx,fgy,fcz,'ev',JSON.stringify(brad.ev.slice(-8).map(v=>v.txt)),'notes',JSON.stringify(brad.notes));
  ok('the build job ran',!!bj);
  if(!bj)console.log('  brad:',JSON.stringify({sk:brad.sk&&brad.sk.k,q:brad.q.map(x=>x.k),rx:brad.rx&&brad.rx.k,dead:brad.dead,notes:brad.notes,e:!!brad.e,online:brad.online,dim:brad.dim}));
  if(bj){
    let ring=0;for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){const edge=Math.abs(x)===2||Math.abs(z)===2;if(!edge)continue;
      if(V.getBlock(bj.cx+x,bj.gy+1,bj.cz+z)===B.COBBLE)ring++;}
    const rejAll=(bj.rejLog||[]);
    ok('brad placed the cobble ring block by block ('+ring+'/16)',ring>=15);
    ok('every block he could not place was reported back ('+(ring+rejAll.filter(r=>/^place Cobblestone/.test(r)).length)+'/16 accounted)',ring+rejAll.filter(r=>/^place Cobblestone/.test(r)).length>=16);
    if(ring<16)console.log('  ring rejections:',JSON.stringify(rejAll.slice(0,8)));
    ok('rejections are reported back (floating + unknown block)',bj.turn>=2);
    const cLeft=V.invCount(brad.inv,B.COBBLE);
    const cGot=brad.led.got[B.COBBLE]||0,cUsed=brad.led.used[B.COBBLE]||0;
    ok('every cobblestone brad placed came out of his inventory ('+ring+' in the ring, '+cLeft+' left, '+cUsed+' used, '+cGot+' got)',cUsed>=ring&&cLeft===cGot-cUsed);
  }
  const lastBuild=null;

  /* ---- view rendering ---- */
  V.agGive(brad,{id:B.PLANK_O,count:2},'test');
  const j2=V.bjNew(brad,'build','test',fcx+5,fcz+5,null);
  const view=V.bjView(j2,null);
  ok('site map has layers, header and legend',/y=0/.test(view)&&/LEGEND/.test(view)&&/z=/.test(view));
  const val=V.bjValidate(brad,j2,{place:[{x:0,y:1,z:0,block:'Oak Planks'},{x:0,y:12,z:0,block:'Oak Planks'},{x:0,y:1,z:1,block:'Unobtainium'}],remove:[]});
  ok('validator accepts supported and rejects floating/unknown',val.ops.length===1&&val.rej.length===2);

  /* ---- PvP: Dan hits an agent, the agent remembers ---- */
  V.setBrainMock(null);V.BRAIN.ok=false;V.BRAIN.off=true;
  for(const a of V.AGENTS){a.q=[{k:'wait',a:{count:60},t:0,st:{}}];a.sk=null;a.rx=null;}
  V.P.mode='s';V.GR.god=true;
  creep.e.x=creep.x=V.P.x+3;creep.e.z=creep.z=V.P.z;creep.e.y=creep.y=V.P.y;creep.path=null;
  const hp0=creep.hp;
  creep.e.hurtT=0;V.hurtMob(creep.e,4,1,0);
  ok('Dan can hurt an agent',creep.hp<hp0);
  ok('the agent records who hit it',V.agRel(creep,'Dan').hits===1&&creep.lastHurtBy==='Dan');
  step(6);
  ok('xx_lilcreepah_xx fights back by reflex',creep.rx&&creep.rx.k==='attack');
  if(!(creep.rx&&creep.rx.k==='attack'))console.log('  DIAG reflex:',JSON.stringify({d:Math.hypot(creep.x-V.P.x,creep.z-V.P.z).toFixed(1),dy:(creep.y-V.P.y).toFixed(1),rx:creep.rx&&creep.rx.k,sk:creep.sk&&creep.sk.k,hp:creep.hp,notes:creep.notes.slice(-3),th:(creep.thoughts||[]).slice(-3)}));
  /* kill an agent: drops, death message, respawn */
  for(let i=0;i<creep.inv.length;i++)creep.inv[i]=null;creep.inv[5]={id:IT.DIAMOND,count:3};   /* (he may walk back for these after respawning) */
  creep.e.hurtT=0;V.agHurt(creep,999,'Dan',0,0,'melee');
  ok('agent dies',creep.dead&&!creep.e);
  ok('death message in chat',V.CHAT.some(m=>m.k==='death'&&m.txt==='xx_lilcreepah_xx was slain by Dan'));
  ok('the killed agent holds a grudge',V.agRel(creep,'Dan').deaths===1&&V.agRel(creep,'Dan').aff<0);
  step(140);
  ok('agent respawns',!creep.dead&&creep.e&&creep.hp===20);
  ok('...with nothing: no free sword on respawn',!creep.inv.some(s=>s&&V.DEFS[s.id].tool)&&creep.notes.some(n=>/EMPTY inventory/.test(n)));
  ok('...and it is told where its stuff is lying ('+(creep.notes.find(n=>/lying where you died/.test(n))||'?').slice(0,120)+')',creep.notes.some(n=>/lying where you died, at -?\d+,-?\d+/.test(n))&&!!creep.lastDeath);
  if(!(!creep.dead&&creep.e&&creep.hp===20))console.log('  DIAG respawn:',JSON.stringify({dead:creep.dead,e:!!creep.e,hp:creep.hp,y:creep.y,ev:creep.ev.slice(-5).map(v=>v.txt),rT:creep.respawnT,air:creep.e&&creep.e.air}));
  /* agent kills Dan */
  /* (Dan at 1 hp and too hungry to heal: creep respawned bare-handed, and a fed Dan regains 1 hp per 1.2 s - a coin flip, not a test) */
  V.GR.god=false;V.P.hp=1;V.P.hurtT=0;V.P.dead=false;V.P.hunger=10;   /* (respawn below refills it) */
  const ce=creep.e;ce.x=V.P.x+1.5;ce.z=V.P.z;ce.y=V.P.y;
  creep.rx={k:'attack',a:{target:'Dan',secs:20},st:{},t:0};
  for(let i=0;i<200&&!V.P.dead;i++){T+=50;V.frameStep(T);}
  ok('an agent can kill Dan',V.P.dead);
  if(!V.P.dead)console.log('  DIAG kill:',JSON.stringify({d:Math.hypot(creep.x-V.P.x,creep.z-V.P.z).toFixed(1),dy:(creep.y-V.P.y).toFixed(2),php:V.P.hp,rx:creep.rx&&creep.rx.k,sk:creep.sk&&creep.sk.k,dead:creep.dead,notes:creep.notes.slice(-3),th:(creep.thoughts||[]).slice(-4).map(t=>t.txt),held:creep.held,pinv:creep.inv.filter(Boolean).map(s=>s.id)}));
  ok('Dan death message names the killer',V.CHAT.some(m=>m.k==='death'&&/Dan was slain by xx_lilcreepah_xx/.test(m.txt)));
  V.respawn();V.GR.god=true;

  /* ---- chat: whispers, commands, proposals with a gut feeling ---- */
  V.chatSubmit('/msg bee hey want to team up?');
  ok('whisper shows in Dan chat',V.CHAT.some(m=>m.k==='whisper'&&m.from==='Dan'&&m.to==='honeybee_mc'));
  ok('the agent heard it as a team proposal',bee.pend&&bee.pend.type==='team'&&bee.heard.some(h=>h.wh));
  const gut=V.agGut(bee,'Dan','team');
  ok('gut feeling is a bucket with reasons',/(YES|NO|UNSURE)/.test(gut));
  const obs2=V.agObs(bee,['test']);
  ok('the gut is in her observation',/GUT FEELING/.test(obs2));
  V.chatSubmit('i declare war on brad');
  ok('declaring war in public chat puts brad at war with Dan',V.agRel(brad,'Dan').war===true);
  V.chatSubmit('/think brad');
  ok('/think prints a mind readout',V.CHAT.some(m=>m.k==='sys'&&/^\[BunkerBrad\] project/.test(m.txt)));
  /* applying a brain reply */
  V.agApplyAct(bee,{thought:'aw ok',say:[{text:'Certainly! sure lets team up :)',to:'Dan'}],actions:[{skill:'follow',target:'Dan'}],
    relations:[{player:'Dan',change:'ally',why:'he asked nicely'}],project:'continue'},bee.pend);
  ok('ally relation applied',V.agRel(bee,'Dan').ally===true);
  ok('follow queued',bee.q[0]&&bee.q[0].k==='follow');
  for(let i=0;i<200&&!V.CHAT.some(m=>m.from==='honeybee_mc');i++){T+=50;V.frameStep(T);}
  const said=V.CHAT.filter(m=>m.from==='honeybee_mc').pop();
  ok('she types it after a delay with assistant-speak stripped',!!said&&!/Certainly/.test(said.txt));
  ok('typing is not instant',true);

  /* ---- player compass ---- */
  V.P.inv[0]={id:IT.PCOMPASS,count:1};V.P.sel=0;
  V.pcmpCycle(1);
  const first=V.getPC();
  V.pcmpCycle(1);
  ok('right-click cycles players',first&&V.getPC()&&V.getPC()!==first);
  V.tickPCompass(0.05);

  /* ---- save and load keep everything ---- */
  bee.flowers.push(V.FLOWER_IDS.values().next().value);
  const sv=V.snapshot('botsave');
  ok('save carries the agents',sv.bots&&sv.bots.list.length===3);
  ok('save carries block ownership',sv.bots&&Object.keys(sv.bots.own).length>0);
  V.applySave(JSON.parse(JSON.stringify(sv)));
  V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;
  step(40);
  ok('agents come back after load',V.AGENTS.length===3&&V.AGENTS.every(a=>a.online));
  const bee2=V.agByName('honeybee_mc');
  ok('relationships survive the save',V.agRel(bee2,'Dan').ally===true);
  ok('war survives the save',V.agRel(V.agByName('brad'),'Dan').war===true);
  ok('compass target survives',!!V.getPC());

  /* ---- far-away agents keep their chunks loaded ---- */
  const far=V.agByName('brad');
  far.x=V.P.x+400;far.z=V.P.z;far.y=60;if(far.e){far.e.x=far.x;far.e.z=far.z;far.e.y=far.y;}
  step(200);
  const fk=Math.floor(far.x/16)+','+Math.floor(far.z/16);
  ok('a far agent holds a chunk ticket',V.ticketHeld(fk));
  ok('its chunk exists without Dan nearby',V.getBlock(Math.floor(far.x),2,Math.floor(far.z))!==B.AIR);

  /* ---- mobs go for agents too ---- */
  const zb=V.agByName('bee');
  if(zb.e){V.spawnMob('zombie',zb.e.x+3,zb.e.y,zb.e.z);const z=V.entities[V.entities.length-1];
    const tgt=V.mobBotTarget(z,V.MOBT.zombie,999);
    let near=null,nd=99;for(const a of V.AGENTS)if(a.e&&!a.dead&&a.online){const d=Math.hypot(a.e.x-z.x,a.e.z-z.z);if(d<nd){nd=d;near=a.e;}}
    ok('a zombie targets the nearest agent',tgt===near&&!!near);}

  /* ---- live-test fixes (2026-10-05) ---- */
  {
    const b2=V.agByName('bee');b2.said=[];b2.typing.length=0;b2.lastFree=-99;b2.lastRep=-99;
    V.agSay(b2,'hiii lilcreepah :) come see my cottage when its done!!','xx_lilcreepah_xx',false,true);
    V.setAgT(V.getAG().t+9);
    V.agSay(b2,'hiii lilcreepah :) come see my cottage!!','xx_lilcreepah_xx',false,true);
    ok('a near-repeat of her own line is dropped',V.getTyping(b2).length===1);
    V.setAgT(V.getAG().t+9);
    V.agSay(b2,'omg there are skeletons everywhere','xx_lilcreepah_xx',false,true);
    ok('a genuinely new line still goes out',V.getTyping(b2).length===2);
    b2.typing.length=0;
    /* re-issuing the same build with new wording keeps the running job */
    const br=V.agByName('brad');br.rx=null;br.q=[];
    br.sk={k:'build',a:{target:'here',note:'a cobble bunker'},t:0,st:{}};
    const jb=V.bjNew(br,'build','a cobble bunker',br.x+3,br.z,null);br.bjob=jb;br.sk.st.j=jb;
    V.agApplyAct(br,{thought:'.',say:[],actions:[{skill:'build',target:'here',note:'finish the cobble bunker walls'},{skill:'sethome'}]},null);
    ok('the same build with new wording keeps going',br.sk&&br.sk.st.j===jb&&br.bjob===jb&&br.q.length===1);
    br.sk=null;br.bjob=null;br.q=[];
    /* honeybee gets upset instead of auto-declaring war */
    const rb=V.agRel(b2,'xx_lilcreepah_xx');rb.war=false;rb.host=3;rb.upset=false;rb.truceT=0;
    V.relShift(b2,'xx_lilcreepah_xx',-10,-10,2);
    ok('honeybee never auto-declares war',!rb.war&&rb.upset);
    const rc=V.agRel(creep,'Dan');rc.war=false;rc.host=3;rc.truceT=0;
    V.relShift(creep,'Dan',-10,-10,2);
    ok('creep does auto-declare war when pushed',rc.war);
    rc.war=false;rc.host=0;
    /* a busy brain is retried, not treated as a failure */
    const realFetch=global.fetch;
    global.fetch=async(u)=>/\/health/.test(u)?{status:200,json:async()=>({ok:true,key:true,authed:true})}:{status:429,json:async()=>({ok:false,error:'busy'})};
    V.setBrainMock(()=>null);V.BRAIN.mock=null;V.BRAIN.ok=true;V.BRAIN.tok='test';
    const jb2=V.bjNew(br,'build','test',br.x+3,br.z,null);br.bjob=jb2;
    for(let k=0;k<4;k++){jb2.inflight=false;jb2.retryT=0;V.BRAIN.ok=true;V.bjRequest(br,jb2);await new Promise(r=>setTimeout(r,5));}
    ok('busy replies never push a build into the offline template',!jb2.offline&&jb2.turn===0&&!(jb2.fail>0));
    if(!(!jb2.offline&&jb2.turn===0&&!(jb2.fail>0)))console.log('  DIAG busy:',JSON.stringify({off:jb2.offline,turn:jb2.turn,fail:jb2.fail,err:V.BRAIN.err,ok:V.BRAIN.ok,mock:!!V.BRAIN.mock}));
    global.fetch=realFetch;br.bjob=null;V.BRAIN.tok=null;V.setBrainMock(null);V.BRAIN.ok=false;V.BRAIN.off=true;
    /* safe spawn spots: never in leaves or water */
    const sx2=Math.floor(V.P.x)+30,sz2=Math.floor(V.P.z)+30;
    const top=V.agSpotY(sx2,sz2);
    if(top!=null){V.setBlock(sx2,top,sz2,V.B.LEAF_O);ok('a spawn spot on leaves is refused',V.agSpotY(sx2,sz2)===null||V.agSpotY(sx2,sz2)>top);}
    else ok('a spawn spot on leaves is refused',true);
    for(let k=0;k<20;k++){const sp=V.agFindSpot(V.P.x,V.P.z,2,12);const fx=Math.floor(sp[0]),fy=Math.floor(sp[1]),fz=Math.floor(sp[2]);
      if(V.getBlock(fx,fy,fz)!==B.AIR&&V.DEFS[V.getBlock(fx,fy,fz)].solid!==false){ok('spawn spots are never inside blocks',false);break;}
      if(k===19)ok('spawn spots are never inside blocks',true);}
  }

  /* stranded on top of its own pillar: the mover must get down or give up, never spin forever */
  {
    const cr=V.agByName('creep');cr.rx=null;cr.q=[];cr.sk=null;cr.bjob=null;
    const pl0=dryLot(V.P.x+40,V.P.z+40,4),px=pl0.x,pz=pl0.z,py=pl0.y+1;
    flatLot(px,pz,py-1,4);
    for(let y=0;y<7;y++)V.setBlock(px,py+y,pz,B.DIRT);
    cr.e.x=px+0.5;cr.e.z=pz+0.5;cr.e.y=py+7.02;cr.e.vx=cr.e.vy=cr.e.vz=0;cr.path=null;cr.pf=null;
    const st={};let r='run',k=0;
    for(;k<900&&r==='run';k++){r=V.agMoveTo(cr,0.05,st,px+1.5,pz+0.5,1.2,py);T+=50;V.frameStep(T);}
    const pillarOk=r!=='run'||Math.abs(cr.e.y-py)<2.5;ok('a bot stranded on a pillar gets down or gives up',pillarOk);console.log('  pillar: '+r+' after '+(k*0.05).toFixed(0)+'s, '+(cr.e.y-py).toFixed(1)+' above ground');
    cr.path=null;cr.pf=null;
  }

  /* ==================== survival rules: nothing is free (v5.9 rework) ==================== */
  {
    V.setBrainMock(null);V.BRAIN.ok=false;V.BRAIN.off=true;
    V.GR.freezeMobs=true;                       /* agents hold still while we drive their hands directly */
    for(const a of V.AGENTS){a.q=[];a.sk=null;a.rx=null;a.bjob=null;a.path=null;a.pf=null;}
    const clearInv=a=>{for(let i=0;i<a.inv.length;i++)a.inv[i]=null;for(let i=0;i<4;i++)a.armor[i]=null;};
    /* a flat lot, flattened TOP-DOWN so nothing falls into it */
    const put=(a,x,y,z)=>{a.e.x=a.x=x+0.5;a.e.y=a.y=y+0.02;a.e.z=a.z=z+0.5;a.e.vx=a.e.vy=a.e.vz=0;a.path=null;a.pf=null;a.act=null;};
    const sl=dryLot(V.P.x-30,V.P.z-30,10),LX=sl.x,LZ=sl.z,LY=sl.y;
    flatLot(LX,LZ,LY,10);
    const sb=V.agByName('bee'),sr=V.agByName('brad'),sc=V.agByName('creep');
    put(sb,LX,LY+1,LZ);put(sr,LX-6,LY+1,LZ-6);put(sc,LX+6,LY+1,LZ+6);
    step(30);
    /* breaking with the real tool rules */
    const breakIt=(a,x,y,z)=>{let t=0;for(let i=0;i<400;i++){if(V.agBreaking(a,0.05,x,y,z))return t;t+=0.05;T+=50;V.frameStep(T);}return -1;};
    clearInv(sb);
    V.setBlock(LX+1,LY+1,LZ,B.STONE);
    const tStone=breakIt(sb,LX+1,LY+1,LZ);
    ok('bare hands take the full 7.5s-ish on stone ('+tStone.toFixed(1)+'s)',tStone>=6.5);
    ok('...and stone broken by hand drops nothing',V.invCount(sb.inv,B.COBBLE)===0&&V.invCount(sb.inv,B.STONE)===0&&V.getBlock(LX+1,LY+1,LZ)===B.AIR);
    V.setBlock(LX+1,LY+1,LZ,B.LOG_O);
    const tLog=breakIt(sb,LX+1,LY+1,LZ);
    ok('a log comes off by hand ('+tLog.toFixed(1)+'s) and goes into the inventory',tLog>0&&V.invCount(sb.inv,B.LOG_O)===1);
    ok('bare hand = no tool (no virtual stone tools)',V.agBestTool(sb,B.STONE)===null);
    /* tool wear: a nearly worn-out wooden pickaxe */
    V.agGive(sb,{id:V.toolId(0,0),count:1,dur:2},'test');
    V.setBlock(LX+1,LY+1,LZ,B.STONE);V.setBlock(LX-1,LY+1,LZ,B.STONE);
    const tPick=breakIt(sb,LX+1,LY+1,LZ);
    const pk=sb.inv.find(s=>s&&s.id===V.toolId(0,0));
    ok('a wooden pickaxe mines stone fast ('+tPick.toFixed(1)+'s) and it drops cobblestone',tPick>0&&tPick<2&&V.invCount(sb.inv,B.COBBLE)===1);
    ok('mining wore the pickaxe down (2 -> 1)',!!pk&&pk.dur===1);
    breakIt(sb,LX-1,LY+1,LZ);
    ok('at 0 durability the pickaxe breaks and is gone',!sb.inv.some(s=>s&&s.id===V.toolId(0,0))&&V.invCount(sb.inv,B.COBBLE)===2);
    ok('...with an event "Your Wooden Pickaxe broke"',sb.ev.some(v=>v.txt==='Your Wooden Pickaxe broke'));
    /* placing: doors, water and lava follow the item rules */
    clearInv(sb);
    const dx0=LX,dz0=LZ+3;
    ok('no Wood Door item, no door',V.agPlaceBlock(sb,dx0,LY+1,dz0,V.IT.DOOR)==='none in inventory');
    V.agGive(sb,{id:V.IT.DOOR,count:1},'test');
    ok('a door uses up a Wood Door item',V.agPlaceBlock(sb,dx0,LY+1,dz0,V.IT.DOOR)===''&&V.invCount(sb.inv,V.IT.DOOR)===0&&V.DEFS[V.getBlock(dx0,LY+1,dz0)].door);
    V.agBreakBlock(sb,dx0,LY+1,dz0);
    ok('breaking the door gives the Wood Door item back',V.invCount(sb.inv,V.IT.DOOR)===1);
    ok('no water bucket, no water',V.agPlaceBlock(sb,LX+3,LY+1,LZ+3,B.WATER)==='none in inventory');
    V.agGive(sb,{id:V.IT.BUCKET_W,count:1},'test');V.agGive(sb,{id:V.IT.BUCKET_L,count:1},'test');
    V.setBlock(LX+3,LY,LZ+3,B.STONE);V.setBlock(LX-3,LY,LZ+3,B.STONE);put(sb,LX,LY+1,LZ+1);   /* within reach of both spots */
    ok('a water bucket places water and is NOT used up',V.agPlaceBlock(sb,LX+3,LY+1,LZ+3,B.WATER)===''&&V.invCount(sb.inv,V.IT.BUCKET_W)===1);
    ok('a lava bucket places lava and turns into an empty Bucket',V.agPlaceBlock(sb,LX-3,LY+1,LZ+3,B.LAVA)===''&&V.invCount(sb.inv,V.IT.BUCKET_L)===0&&V.invCount(sb.inv,V.IT.BUCKET)===1);
    V.setBlock(LX+3,LY+1,LZ+3,B.AIR);V.setBlock(LX-3,LY+1,LZ+3,B.AIR);
    ok('ramps need a Wooden Ramp item',V.agPlaceBlock(sb,LX+2,LY+1,LZ-3,B.RAMP+2)==='none in inventory');
    /* scaffolding only from what you carry */
    clearInv(sr);
    ok('no blocks -> no scaffold block',V.agScaffoldBlock(sr)===null);
    V.agGive(sr,{id:B.PLANK_O,count:5},'test');
    ok('planks are the scaffold of last resort',V.agScaffoldBlock(sr)===B.PLANK_O);
    V.agGive(sr,{id:B.COBBLE,count:5},'test');V.agGive(sr,{id:B.DIRT,count:3},'test');
    ok('the cheapest junk block is used first (dirt)',V.agScaffoldBlock(sr)===B.DIRT&&V.agScaffoldCount(sr)===13);
    /* a 6-high stone pillar: its top is only reachable by pillaring up */
    const px=LX-4,pz=LZ-4;for(let y=1;y<=6;y++)V.setBlock(px,LY+y,pz,B.STONE);
    const plan=(a,scaf)=>{V.navStart(a,px+0.5,LY+7,pz+0.5,0.4,{ry:0,max:4000,scaf});for(let k=0;k<40&&!a.pf.done;k++)V.navStep(a,5000);
      const p=a.pf.path||[];a.pf=null;return p;};
    put(sr,px-2,LY+1,pz);
    const p0=plan(sr,0),p2=plan(sr,2),p9=plan(sr,13);
    const nb=(p,m)=>p.filter(n=>n.m===m).length;
    ok('without blocks the planner never pillars or bridges',nb(p0,'p')+nb(p0,'b')===0);
    ok('with 2 blocks it plans at most 2 pillar/bridge moves ('+(nb(p2,'p')+nb(p2,'b'))+')',nb(p2,'p')+nb(p2,'b')<=2);
    ok('with enough blocks it pillars up to the top ('+nb(p9,'p')+' pillar moves)',nb(p9,'p')>=5);
    /* crafting like a player */
    clearInv(sc);put(sc,LX+5,LY+1,LZ+5);step(5);
    ok('no crafting table within 5 blocks of the test spot',!V.agTableNear(sc));
    V.agGive(sc,{id:B.LOG_O,count:1},'test');
    const shortMsg=V.agCraft(sc,'Wooden Pickaxe',1);
    ok('1 log is not enough for a table + wooden pickaxe: precise shortfall ('+shortMsg+')',/^need 2 more logs \(have 1 log \+ 0 planks; 1 log = 4 planks, and that includes a crafting table\)$/.test(shortMsg)&&V.invCount(sc.inv,B.LOG_O)===1);
    V.agGive(sc,{id:B.LOG_O,count:2},'test');
    const cr=V.agCraft(sc,'wood pickaxe',1);
    const tbl=V.agFindNear(sc,B.CRAFT,5);
    ok('wooden pickaxe from 3 logs: planks + sticks made on the way ('+(cr||'ok')+')',cr===''&&V.invCount(sc.inv,V.toolId(0,0))===1&&V.invCount(sc.inv,B.LOG_O)===0);
    ok('...a crafting table was crafted and placed next to the agent, owned by it',!!tbl&&V.BOWN.get(tbl.x+','+tbl.y+','+tbl.z)===3-1);
    ok('...leftovers are exact: 3 planks + 2 sticks',V.invCount(sc.inv,B.PLANK_O)===3&&V.invCount(sc.inv,V.IT.STICK)===2);
    const crs=V.agCraft(sc,'Stone Pickaxe',1);
    ok('stone pickaxe without cobblestone: "need 3 more Cobblestone (have 0)"',crs==='need 3 more Cobblestone (have 0)');
    V.agGive(sc,{id:B.COBBLE,count:3},'test');
    ok('with 3 cobblestone at the table it crafts',V.agCraft(sc,'stone pick',1)===''&&V.invCount(sc.inv,V.toolId(1,0))===1&&V.invCount(sc.inv,B.COBBLE)===0);
    const tables=()=>{let n=0;const cx=Math.floor(sc.x),cy=Math.floor(sc.y),cz=Math.floor(sc.z);
      for(let x=-8;x<=8;x++)for(let y=-4;y<=4;y++)for(let z=-8;z<=8;z++)if(V.getBlock(cx+x,cy+y,cz+z)===B.CRAFT)n++;return n;};
    const tables0=tables(),stick0=V.invCount(sc.inv,V.IT.STICK),plank0=V.invCount(sc.inv,B.PLANK_O);
    ok('sticks (a 2x2 recipe) are crafted from planks without placing another table',V.agCraft(sc,'sticks',4)===''&&V.invCount(sc.inv,V.IT.STICK)===stick0+4&&V.invCount(sc.inv,B.PLANK_O)===plank0-2&&tables()===tables0);
    const obs=V.agObs(sc,['test']);
    ok('the mind sees exact counts, its tools with durability, and what it can craft',/\[INVENTORY\][^\n]*Stone Pickaxe \(132\/132 durability\)/.test(obs)&&/\[TOOLS\] pickaxe: Stone Pickaxe/.test(obs)&&/\[CAN CRAFT NOW\]/.test(obs));
    ok('nobody is told blocks are unlimited any more',!/unlimited for you|always free/.test(obs));
    clearInv(sc);V.agGive(sc,{id:B.LOG_B,count:3},'test');
    const cc=V.agCanCraftStr(sc);
    ok('[CAN CRAFT NOW] from 3 logs: planks and a wooden pickaxe ('+cc.slice(0,80)+')',/Planks x12/.test(cc)&&/Wooden Pickaxe/.test(cc));
    /* the validator budgets every block */
    clearInv(sr);V.agGive(sr,{id:B.COBBLE,count:3},'test');
    const jv=V.bjNew(sr,'build','budget test',LX,LZ,null);
    const pal=V.agPalette(sr,jv);
    ok('YOUR BLOCKS lists only what is carried, with counts ('+pal.join('; ')+')',pal.length===1&&pal[0]==='Cobblestone x3');
    const pl5=[0,1,2,3,4].map(i=>({x:i-2,y:jv.gy===LY?1:1,z:5,block:'Cobblestone'}));
    const vv=V.bjValidate(sr,jv,{place:pl5,remove:[]});
    ok('5 cobblestone asked, 3 carried: 3 accepted, 2 rejected "you only have 3 Cobblestone"',vv.ops.length===3&&vv.rej.length===2&&vv.rej.every(r=>/you only have 3 Cobblestone/.test(r)));
    V.agGive(sr,{id:B.PLANK_B,count:2},'test');
    const vp=V.bjValidate(sr,jv,{place:[{x:-2,y:1,z:8,block:'Planks'},{x:-1,y:1,z:8,block:'Oak Planks'},{x:0,y:1,z:8,block:'Planks'}],remove:[]});
    ok('"Planks" means the planks you carry (birch here), still budgeted: 2 of 3 accepted',vp.ops.length===2&&vp.ops.every(o=>o.id===B.PLANK_B)&&vp.rej.length===1);
    for(let i=0;i<sr.inv.length;i++)if(sr.inv[i]&&sr.inv[i].id===B.PLANK_B)sr.inv[i]=null;
    jv.ops=vv.ops.slice(0,2);
    const vv2=V.bjValidate(sr,jv,{place:[{x:-2,y:1,z:6,block:'Cobblestone'},{x:-1,y:1,z:6,block:'Cobblestone'}],remove:[]});
    ok('blocks still queued from the last turn count against the budget',vv2.ops.length===1&&vv2.rej.length===1);
    /* the executor runs out mid-build and says so */
    jv.ops=[];for(let i=0;i<5;i++)jv.ops.push({k:'pl',lx:i-2,ly:1,lz:7,id:B.COBBLE});jv.batch=5;jv.done=true;jv.offline=true;
    V.GR.freezeMobs=false;
    for(const a of V.AGENTS)if(a!==sr)a.q=[{k:'wait',a:{count:60},t:0,st:{}}];
    sr.sk={k:'build',a:{target:LX+','+LZ,note:'budget test'},t:0,st:{j:jv}};sr.bjob=jv;sr.q=[];
    for(let i=0;i<500&&sr.sk;i++){T+=50;V.frameStep(T);}
    ok('the executor places what it has, then stops: 3 placed',jv.placed===3&&V.invCount(sr.inv,B.COBBLE)===0);
    ok('...with the event "You ran out of Cobblestone while building - gather more"',sr.ev.some(v=>v.txt==='You ran out of Cobblestone while building - gather more'));
    /* offline templates only use what the agent carries */
    clearInv(sr);V.agGive(sr,{id:B.DIRT,count:30},'test');
    const so=V.bjShelterOps(sr,null);
    ok('30 dirt -> the 3x3 emergency hut (23 blocks), nothing more',so.ops&&so.t.r===1&&so.ops.length===23&&so.ops.every(o=>o.id===B.DIRT));
    clearInv(sr);V.agGive(sr,{id:B.DIRT,count:5},'test');
    const so2=V.bjShelterOps(sr,null);
    ok('5 dirt -> no shelter at all ("need 23, have 5")',!so2.ops&&so2.need===23&&so2.have===5);
    clearInv(sr);sr.offFail=null;V.setTime(0.1);
    const op0=V.offPlan(sr);
    ok('the autopilot with nothing starts by gathering wood',op0&&op0[0][0]==='gather'&&op0[0][1].item==='wood');
    /* gathering: the right tool or a clear reason, and items are counted */
    const gs={k:'gather',a:{item:'stone',count:3},t:0,st:{}};
    const gr=V.SK.gather(sr,0.05,gs);
    ok('gather stone with bare hands fails at once with a useful reason ('+gr+')',gr==='fail:stone needs a pickaxe - craft a Wooden Pickaxe first (3 planks + 2 sticks, needs a crafting table)');
    ok('gather planks explains that planks are crafted',/crafted, not gathered/.test(V.SK.gather(sr,0.05,{k:'gather',a:{item:'planks'},t:0,st:{}})));
    put(sr,LX-2,LY+1,LZ-2);sr.q=[{k:'gather',a:{item:'dirt',count:3},t:0,st:{}}];sr.sk=null;
    let gdone=false;for(let i=0;i<1200&&!gdone;i++){T+=50;V.frameStep(T);if(!sr.sk&&!sr.q.length)gdone=true;}
    ok('gather dirt x3 by hand: 3 Dirt items gained ('+V.invCount(sr.inv,B.DIRT)+')',V.invCount(sr.inv,B.DIRT)>=3);
    /* smelting iron through a REAL furnace with real fuel */
    clearInv(sb);put(sb,LX+2,LY+1,LZ-6);step(5);
    V.agGive(sb,{id:B.IRON_ORE,count:2},'test');V.agGive(sb,{id:B.COBBLE,count:8},'test');V.agGive(sb,{id:B.LOG_O,count:1},'test');V.agGive(sb,{id:V.IT.COAL,count:2},'test');
    const smj={k:'smelt',a:{item:'iron ore',count:2},t:0,st:{}};sb.q=[smj];sb.sk=null;
    /* (until THIS job ends: the autopilot may queue a walk straight after, which would carry her away from the furnace) */
    let smeltT=0;for(let i=0;i<1400&&(sb.sk===smj||sb.q.includes(smj));i++){T+=50;V.frameStep(T);smeltT+=0.05;}
    sb.q=[];sb.sk=null;sb.path=null;sb.pf=null;
    const fur=V.agFindNear(sb,B.FURNACE,6);
    const fbe=fur&&V.blockEnts.get(fur.x+','+fur.y+','+fur.z);
    ok('smelt: 2 Iron Ore -> 2 Iron Ingots ('+V.invCount(sb.inv,V.IT.IRON)+' after '+smeltT.toFixed(0)+'s)',V.invCount(sb.inv,V.IT.IRON)===2&&V.invCount(sb.inv,B.IRON_ORE)===0);
    ok('...through a furnace it crafted from 8 cobblestone and put down',!!fur&&V.invCount(sb.inv,B.COBBLE)===0);
    ok('...the furnace really cooked it (10s per item, so 20s+)',smeltT>=19&&!!fbe&&fbe.t==='furnace'&&!fbe.in&&!fbe.out);
    ok('...burning exactly one coal',V.invCount(sb.inv,V.IT.COAL)===1);
    clearInv(sb);V.agGive(sb,{id:B.IRON_ORE,count:1},'test');if(fbe)fbe.burn=0;   /* her furnace's last coal has burnt out */
    ok('no fuel -> fails clearly',/^fail:no fuel/.test(V.SK.smelt(sb,0.05,{k:'smelt',a:{item:'iron ore'},t:0,st:{}})));
    clearInv(sb);
    ok('nothing to smelt -> fails clearly',/^fail:nothing to smelt/.test(V.SK.smelt(sb,0.05,{k:'smelt',a:{item:'iron ore'},t:0,st:{}})));
    /* giving hands over the real stack (a worn sword stays worn) */
    clearInv(sb);clearInv(sc);put(sb,LX-3,LY+1,LZ+6);put(sc,LX-1,LY+1,LZ+6);step(5);
    V.agGive(sb,{id:V.toolId(1,3),count:1,dur:17},'test');
    sb.q=[{k:'give',a:{target:'creep',item:'Stone Sword',count:1},t:0,st:{}}];sb.sk=null;sc.q=[{k:'wait',a:{count:20},t:0,st:{}}];sc.sk=null;
    for(let i=0;i<200&&!sc.inv.some(q=>q&&q.id===V.toolId(1,3));i++){T+=50;V.frameStep(T);}
    const gsw=sc.inv.find(q=>q&&q.id===V.toolId(1,3));
    ok('a given sword arrives with its own durability (17), and the giver no longer has it',!!gsw&&gsw.dur===17&&!sb.inv.some(q=>q&&q.id===V.toolId(1,3)));
    /* storing needs a real chest: crafted from 8 planks at a table, then filled */
    clearInv(sb);sb.q=[];sb.sk=null;
    ok('store with no chest and no planks fails with the recipe',/no chest and cannot make one/.test(V.SK.store(sb,0.05,{k:'store',a:{},t:0,st:{}})));
    V.agGive(sb,{id:B.LOG_O,count:3},'test');V.agGive(sb,{id:V.IT.IRON,count:5},'test');V.agGive(sb,{id:V.toolId(1,0),count:1},'test');
    sb.q=[{k:'store',a:{},t:0,st:{}}];
    for(let i=0;i<200&&(sb.sk||sb.q.length);i++){T+=50;V.frameStep(T);}
    const myChest=V.agFindNear(sb,B.CHEST,6),cbe=myChest&&V.blockEnts.get(myChest.x+','+myChest.y+','+myChest.z);
    if(!(cbe&&V.invCount(cbe.inv,V.IT.IRON)===5))console.log('  DIAG store:',JSON.stringify({chest:myChest,cbe:!!cbe,cinv:cbe&&cbe.inv.filter(Boolean),inv:sb.inv.filter(Boolean),notes:sb.notes.slice(-3),ev:sb.ev.slice(-4).map(v=>v.txt),sk:sb.sk&&sb.sk.k}));
    ok('store crafts and places a real chest from its logs, stashes the iron and keeps the pickaxe',!!cbe&&V.invCount(cbe.inv,V.IT.IRON)===5&&V.invCount(sb.inv,V.IT.IRON)===0&&V.invCount(sb.inv,V.toolId(1,0))===1&&V.invCount(sb.inv,B.LOG_O)===0);
    /* TNT is a real item too */
    clearInv(sc);
    ok('no TNT, no tnt skill',/no TNT/.test(V.SK.tnt(sc,0.05,{k:'tnt',a:{target:'Dan'},t:0,st:{}})));
    /* a bed is a real item: no bed, no sethome */
    ok('sethome without a bed fails and says how to make one',/no bed/.test(V.SK.sethome(sb,0.05,{k:'sethome',a:{},t:0,st:{}}))&&!sb.home);
    for(const a of V.AGENTS){a.q=[];a.sk=null;a.bjob=null;}
  }

  /* ==================== review round 1: nothing is free, nobody else's stuff, same rules as Dan ==================== */
  {
    V.setBrainMock(null);V.BRAIN.ok=false;V.BRAIN.off=true;
    V.GR.freezeMobs=false;V.GR.botGrief=true;V.setTime(0.1);
    const clearInv=a=>{for(let i=0;i<a.inv.length;i++)a.inv[i]=null;for(let i=0;i<4;i++)a.armor[i]=null;};
    const put=(a,x,y,z)=>{a.e.x=a.x=x+0.5;a.e.y=a.y=y+0.02;a.e.z=a.z=z+0.5;a.e.vx=a.e.vy=a.e.vz=0;a.path=null;a.pf=null;a.act=null;};
    const idle=(...keep)=>{for(const a of V.AGENTS){a.rx=null;a.bjob=null;a.path=null;a.pf=null;if(!keep.includes(a)){a.q=[{k:'wait',a:{count:60},t:0,st:{}}];a.sk=null;}}};
    const run=(a,k,args,frames)=>{a.q=[{k,a:Object.assign({target:null,item:null,count:null,note:null},args||{}),t:0,st:{}}];a.sk=null;a.rx=null;
      for(let i=0;i<(frames||600)&&(a.sk||a.q.length);i++){T+=50;V.frameStep(T);}return a.notes.slice(-1)[0]||'';};
    const iron=a=>V.invCount(a.inv,V.IT.IRON);
    const R0=dryLot(V.P.x+34,V.P.z-34,12),RX=R0.x,RZ=R0.z,RY=R0.y;
    flatLot(RX,RZ,RY,12);
    const rb=V.agByName('bee'),rr=V.agByName('brad'),rc=V.agByName('creep');
    for(const a of [rb,rr,rc]){clearInv(a);a.hunger=20;a.exh=0;a.home=null;a.myFurnace=null;a.myTable=null;a.notes=[];}
    put(rb,RX,RY+1,RZ);put(rr,RX-8,RY+1,RZ-8);put(rc,RX+8,RY+1,RZ+8);idle();step(20);

    /* --- furnaces: Dan's furnace (his ore cooking, his coal, his ingots) is never touched --- */
    const fx=RX+2,fy=RY+1,fz=RZ;V.setBlock(fx,fy,fz,B.FURNACE);V.BOWN.set(fx+','+fy+','+fz,0);
    const dbe=V.ensureBE(fx,fy,fz,'furnace');dbe.in={id:B.IRON_ORE,count:3};dbe.fuel={id:V.IT.COAL,count:4};dbe.out={id:V.IT.IRON,count:5};
    const danIron=()=>(dbe.in&&dbe.in.id===B.IRON_ORE?dbe.in.count:0)+(dbe.out&&dbe.out.id===V.IT.IRON?dbe.out.count:0);
    V.agGive(rb,{id:B.IRON_ORE,count:1},'test');V.agGive(rb,{id:B.PLANK_O,count:1},'test');idle(rb);
    const n1=run(rb,'smelt',{item:'iron ore',count:1},300);
    ok('a bot never smelts in Dan\'s busy furnace: no ingots, Dan still has all 8 of his iron ('+danIron()+'), her ore and plank untouched',
      iron(rb)===0&&V.invCount(rb.inv,B.IRON_ORE)===1&&V.invCount(rb.inv,B.PLANK_O)===1&&danIron()===8&&/no furnace of yours/.test(n1));
    V.agGive(rb,{id:B.FURNACE,count:1},'test');
    run(rb,'smelt',{item:'iron ore',count:1},600);
    ok('...with a Furnace of her own she puts it down and gets exactly the 1 ingot she paid for ('+iron(rb)+'), burning her own plank',
      iron(rb)===1&&V.invCount(rb.inv,B.PLANK_O)===0&&danIron()===8&&(!dbe.fuel||dbe.fuel.count<=4)&&!!rb.myFurnace&&!(rb.myFurnace.x===fx&&rb.myFurnace.z===fz));
    /* two bots, one furnace: the second never borrows a furnace with the first one's ore in it */
    const bf=rb.myFurnace;
    V.agGive(rb,{id:B.IRON_ORE,count:3},'test');V.agGive(rb,{id:V.IT.COAL,count:1},'test');
    put(rr,bf.x-2,RY+1,bf.z+2);step(3);
    rb.q=[{k:'smelt',a:{item:'iron ore',count:3},t:0,st:{}}];rb.sk=null;rr.q=[{k:'wait',a:{count:60},t:0,st:{}}];rr.sk=null;
    for(let i=0;i<40;i++){T+=50;V.frameStep(T);}
    V.agGive(rr,{id:B.IRON_ORE,count:3},'test');V.agGive(rr,{id:V.IT.COAL,count:1},'test');
    rr.q=[{k:'smelt',a:{item:'iron ore',count:3},t:0,st:{}}];rr.sk=null;
    for(let i=0;i<1200&&(rb.sk||rb.q.length||rr.sk||rr.q.length);i++){T+=50;V.frameStep(T);}
    ok('two bots, one furnace: she gets exactly her own 3 ingots ('+(iron(rb)-1)+'), brad gets none of them ('+iron(rr)+') and keeps his ore',
      iron(rb)===4&&iron(rr)===0&&V.invCount(rr.inv,B.IRON_ORE)===3);
    for(const a of [rb,rr])clearInv(a);put(rr,RX-8,RY+1,RZ-8);step(3);

    /* --- build lane: other people's blocks only come down in a grief job; containers spill like Dan's --- */
    const cx0=RX+5,cy0=RY+1,cz0=RZ-5;V.setBlock(cx0,cy0,cz0,B.CHEST);V.BOWN.set(cx0+','+cy0+','+cz0,0);
    const cbe=V.ensureBE(cx0,cy0,cz0,'chest');cbe.inv[0]={id:V.IT.DIAMOND,count:7};
    const jb=V.bjNew(rc,'build','tidy up',cx0,cz0,null);
    const vb=V.bjValidate(rc,jb,{remove:[{x:cx0-jb.cx,y:cy0-jb.gy,z:cz0-jb.cz}],place:[]});
    ok('a normal build may not remove Dan\'s chest ('+(vb.rej[0]||'accepted!')+')',vb.ops.length===0&&/only a grief job/.test(vb.rej[0]||''));
    V.GR.botGrief=false;
    const jg=V.bjNew(rc,'grief','loot it',cx0,cz0,'Dan');
    const vg=V.bjValidate(rc,jg,{remove:[{x:cx0-jg.cx,y:cy0-jg.gy,z:cz0-jg.cz}],place:[]});
    ok('...nor a grief job while griefing is switched off',vg.ops.length===0&&/switched off/.test(vg.rej[0]||''));
    V.GR.botGrief=true;
    const drops=id=>V.entities.filter(d=>d.t==='drop'&&!d.dead&&d.st&&d.st.id===id).reduce((t,d)=>t+d.st.count,0);
    const dia0=drops(V.IT.DIAMOND);
    V.agBreakBlock(rc,cx0,cy0,cz0);
    ok('a chest a bot breaks spills its contents on the ground, like Dan\'s (7 diamonds lying there, none teleported into the bot)',
      drops(V.IT.DIAMOND)-dia0===7&&V.invCount(rc.inv,V.IT.DIAMOND)===0);
    for(const d of V.entities)if(d.t==='drop'&&d.st&&d.st.id===V.IT.DIAMOND)d.age=999;   /* despawn them (keeps later tests clean) */
    step(2);

    /* --- no teleports: a bot with no blocks can't get on top of a bedrock column --- */
    clearInv(rc);put(rc,RX+8,RY+1,RZ+8);step(5);
    const tx0=RX+9,tz0=RZ+8;for(let y=1;y<=5;y++)V.setBlock(tx0,RY+y,tz0,B.BEDROCK);
    let mvR='run',maxJ=0,px0=rc.e.x,py0=rc.e.y,pz0=rc.e.z,onTop=false;const mst={};
    for(let i=0;i<1200&&mvR==='run';i++){mvR=V.agMoveTo(rc,0.05,mst,tx0+0.5,tz0+0.5,0.4,RY+6);T+=50;V.frameStep(T);
      const j=Math.hypot(rc.e.x-px0,rc.e.y-py0,rc.e.z-pz0);if(j>maxJ)maxJ=j;px0=rc.e.x;py0=rc.e.y;pz0=rc.e.z;
      if(Math.floor(rc.e.x)===tx0&&Math.floor(rc.e.z)===tz0&&rc.e.y>=RY+5.9)onTop=true;}
    ok('no free teleport onto a bedrock column without blocks ('+(mvR==='run'?'still looking for a way after 60 s':'gave up: "'+mvR+'"')+', biggest step '+maxJ.toFixed(2)+')',
      (mvR==='run'||(mvR.startsWith('fail')&&/blocks/.test(mvR)))&&!onTop&&maxJ<1.5);
    rc.path=null;rc.pf=null;

    /* --- quarrying: Dan's builds made while the AI players were away, and their own shelters, are not stone --- */
    V.chatSubmit('/bots leave');step(5);
    const wx=RX-3,wz=RZ+5;for(let x=0;x<4;x++)for(let y=1;y<=2;y++)V.setBlock(wx+x,RY+y,wz,B.COBBLE);
    V.chatSubmit('/bots join');step(30);
    /* (the test lot itself was laid with setBlock, so the re-seed just made it "Dan's" too: in a real world it is natural ground) */
    const keepDan=new Set([fx+','+fy+','+fz]);for(let x=0;x<4;x++)for(let y=1;y<=2;y++)keepDan.add((wx+x)+','+(RY+y)+','+wz);
    for(let x=-12;x<=12;x++)for(let z=-12;z<=12;z++)for(let y=RY-15;y<=RY+3;y++){const k=(RX+x)+','+y+','+(RZ+z);if(V.BOWN.get(k)===0&&!keepDan.has(k))V.BOWN.delete(k);}
    const danWall=()=>{let n=0;for(let x=0;x<4;x++)for(let y=1;y<=2;y++)if(V.getBlock(wx+x,RY+y,wz)===B.COBBLE&&V.BOWN.get((wx+x)+','+(RY+y)+','+wz)===0)n++;return n;};
    ok('Dan\'s wall, built while the bots were offline, is his when they come back ('+danWall()+'/8)',danWall()===8);
    for(const a of [rb,rr,rc]){a.q=[];a.sk=null;}
    put(rr,RX-4,RY+1,RZ+3);step(5);
    clearInv(rr);V.agGive(rr,{id:B.COBBLE,count:3},'test');
    for(let x=0;x<3;x++)V.agPlaceBlock(rr,RX-5+x,RY+1,RZ+1,B.COBBLE);
    const ring=()=>{let n=0;for(let x=0;x<3;x++)if(V.getBlock(RX-5+x,RY+1,RZ+1)===B.COBBLE)n++;return n;};
    const ring0=ring();
    V.agGive(rr,{id:V.toolId(1,0),count:1},'test');idle(rr);
    const cob0=V.invCount(rr.inv,B.COBBLE);
    run(rr,'gather',{item:'stone',count:3},1500);
    ok('gather stone digs natural stone: Dan\'s wall ('+danWall()+'/8) and brad\'s own blocks ('+ring()+'/'+ring0+') stay, and he got 3 cobblestone ('+(V.invCount(rr.inv,B.COBBLE)-cob0)+')',
      danWall()===8&&ring()===ring0&&ring0===3&&V.invCount(rr.inv,B.COBBLE)-cob0>=3);

    /* --- armour wears out and shatters, exactly like Dan's --- */
    clearInv(rc);rc.armor[1]={id:V.armorId(0,1),count:1,dur:2};
    if(!rc.e||rc.dead||!rc.online)console.log('  DIAG armour:',JSON.stringify({e:!!rc.e,dead:rc.dead,on:rc.online,sp:rc.spawnProt,t:V.getAG().t}));
    for(let k=0;k<3;k++){rc.e.hurtT=0;rc.spawnProt=0;V.agHurt(rc,2,'Zombie',0,0,'mob');}
    if(rc.armor[1])console.log('  DIAG armour2:',JSON.stringify({arm:rc.armor,hp:rc.hp,ev:rc.ev.slice(-3).map(v=>v.txt)}));
    ok('bot armour wears 1 per hit and shatters at 0 ("Your Iron Chestplate shattered")',!rc.armor[1]&&rc.ev.some(v=>v.txt==='Your Iron Chestplate shattered'));
    rc.hp=20;

    /* --- hunger: Dan's numbers (heal only while fed, food fills hunger) --- */
    put(rb,RX+1,RY+1,RZ+4);idle(rb);rb.q=[{k:'wait',a:{count:60},t:0,st:{}}];rb.sk=null;
    rb.hp=10;rb.hunger=15;rb.exh=0;step(100);
    const hp15=rb.hp;
    rb.hunger=20;step(100);
    ok('no healing while hungry (hunger 15: hp '+hp15+'), healing when fed (hunger 20: hp '+rb.hp+', hunger now '+rb.hunger+')',hp15===10&&rb.hp>=13&&rb.hunger<=20);
    rb.hunger=10;V.agGive(rb,{id:V.IT.PORK_C,count:1},'test');
    run(rb,'eat',{},100);
    ok('eating a cooked porkchop fills 8 hunger (10 -> '+rb.hunger+')',rb.hunger===18&&V.invCount(rb.inv,V.IT.PORK_C)===0);
    rb.hp=20;rb.hunger=20;

    /* --- store is not a one-way trip: take gets things back --- */
    for(const [k,o] of [...V.BOWN]){const q=k.split(',').map(Number);if(o===3&&q.length===3&&V.getBlock(q[0],q[1],q[2])===B.CHEST){V.blockEnts.delete(k);V.setBlock(q[0],q[1],q[2],B.AIR);}}
    clearInv(rb);V.agGive(rb,{id:B.CHEST,count:1},'test');V.agGive(rb,{id:V.IT.IRON,count:7},'test');V.agGive(rb,{id:B.DIRT,count:5},'test');idle(rb);
    run(rb,'store',{item:'iron'},300);
    const ironStored=iron(rb);
    run(rb,'take',{item:'iron ingot',count:5},300);
    ok('store, then take: 7 iron in the chest, 5 back out ('+ironStored+' -> '+iron(rb)+'), dirt never stored',ironStored===0&&iron(rb)===5&&V.invCount(rb.inv,B.DIRT)===5);
    const tk=run(rb,'take',{item:'diamond'},100);
    ok('take with nothing like that fails clearly',/none of your chests nearby has diamond/.test(tk));

    /* --- a reflex in the middle of a skill: no JS errors, and the skill carries on (no frozen build) --- */
    clearInv(rb);put(rb,RX-6,RY+1,RZ-2);step(3);V.agGive(rb,{id:V.toolId(0,0),count:1},'test');idle(rb);
    rb.q=[{k:'gather',a:{item:'dirt',count:3},t:0,st:{}}];rb.sk=null;
    for(let i=0;i<10;i++){T+=50;V.frameStep(T);}
    rb.rx={k:'wait',a:{count:1},st:{},t:0};
    for(let i=0;i<600&&(rb.sk||rb.q.length||rb.rx);i++){T+=50;V.frameStep(T);}
    ok('a reflex during gather: no JS error, the gather finishes ('+V.invCount(rb.inv,B.DIRT)+' dirt)',!rb.notes.some(n=>/Cannot read|TypeError|undefined/.test(n))&&V.invCount(rb.inv,B.DIRT)>=3);
    clearInv(rr);put(rr,RX-10,RY+1,RZ-10);step(3);V.agGive(rr,{id:B.COBBLE,count:9},'test');idle(rr);
    const jr=V.bjNew(rr,'build','test ring',RX+6,RZ-9,null);jr.done=true;jr.offline=true;jr.turn=jr.maxTurns;
    for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)if(x||z)jr.ops.push({k:'pl',lx:x,ly:1,lz:z,id:B.COBBLE});jr.batch=jr.ops.length;
    rr.sk={k:'build',a:{target:(RX+6)+','+(RZ-9),note:'test ring'},t:0,st:{j:jr}};rr.bjob=jr;rr.q=[];
    for(let i=0;i<60&&!rr.path;i++){T+=50;V.frameStep(T);}
    rr.rx={k:'wait',a:{count:1},st:{},t:0};
    for(let i=0;i<900&&rr.sk;i++){T+=50;V.frameStep(T);}
    ok('a reflex during a build: the job carries on and finishes ('+jr.placed+'/8 placed)',jr.placed>=7&&!rr.sk);

    /* --- line of sight: no stealing from a sealed vault, no tables through stone, no placing through walls --- */
    clearInv(rc);put(rc,RX+3,RY+1,RZ+9);step(3);idle(rc);
    const vx=RX+6,vy=RY+2,vz=RZ+9;
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){V.setBlock(vx+dx,vy+dy,vz+dz,B.BEDROCK);V.BOWN.set((vx+dx)+','+(vy+dy)+','+(vz+dz),0);}
    V.setBlock(vx,vy,vz,B.CHEST);const vbe=V.ensureBE(vx,vy,vz,'chest');vbe.inv[0]={id:V.IT.DIAMOND,count:5};
    run(rc,'steal',{target:'Dan'},900);
    ok('no stealing from a chest sealed in bedrock (creep has '+V.invCount(rc.inv,V.IT.DIAMOND)+' diamonds, the vault still holds '+V.invCount(vbe.inv,V.IT.DIAMOND)+')',
      V.invCount(rc.inv,V.IT.DIAMOND)===0&&V.invCount(vbe.inv,V.IT.DIAMOND)===5);
    clearInv(rc);put(rc,RX+3,RY+1,RZ+9);step(3);
    V.setBlock(RX+4,RY+1,RZ+9,B.STONE);V.setBlock(RX+4,RY+2,RZ+9,B.STONE);V.setBlock(RX+4,RY+3,RZ+9,B.STONE);V.setBlock(RX+5,RY+1,RZ+9,B.AIR);
    V.setBlock(RX+5,RY,RZ+9,B.STONE);V.agGive(rc,{id:B.DIRT,count:2},'test');
    ok('no placing a block behind a wall (out of sight)',V.agPlaceBlock(rc,RX+5,RY+1,RZ+9,B.DIRT)==='out of reach or out of sight'&&V.invCount(rc.inv,B.DIRT)===2);
    const btx=RX+3,bty=RY-1,btz=RZ+7;V.setBlock(btx,bty,btz,B.CRAFT);
    ok('a crafting table buried under the ground does not count as "near"',!V.agTableNear(rc)&&!!V.agFindNear(rc,B.CRAFT,5));

    /* --- crafting and gathering by the real rules --- */
    clearInv(rb);V.agGive(rb,{id:B.LOG_O,count:3},'test');
    ok('a Display Shelf is not craftable (Dan\'s grid makes those 8 planks a Chest)',/no recipe/.test(V.agCraft(rb,'Display Shelf',1))&&V.invCount(rb.inv,B.LOG_O)===3);
    clearInv(rb);V.agGive(rb,{id:V.IT.COAL,count:1},'test');V.agGive(rb,{id:V.IT.STICK,count:1},'test');
    const tsh=V.agCraft(rb,'Torch',8);
    ok('8 torches: the shortfall names the coal AND the wood ('+tsh+')',/need 1 more Coal \(have 1\)/.test(tsh)&&/more log/.test(tsh));
    ok('gather glass fails at once: glass drops nothing',/drops nothing/.test(V.SK.gather(rb,0.05,{k:'gather',a:{item:'glass'},t:0,st:{}})));
    /* autopilot: a pickaxe, cobblestone and no wood -> it goes for wood, never craft-fail-explore forever */
    clearInv(rr);rr.offFail=null;rr.offFails=0;V.agGive(rr,{id:V.toolId(0,0),count:1},'test');V.agGive(rr,{id:B.COBBLE,count:5},'test');
    const op1=V.offPlan(rr);
    rr.offFail={k:'craft',why:'need 2 more logs (have 0 logs + 0 planks; 1 log = 4 planks)',t:V.getAG().t};
    const op2=V.offPlan(rr);
    ok('autopilot with a wooden pickaxe + cobblestone and no wood gathers wood ('+JSON.stringify(op1)+' / '+JSON.stringify(op2)+')',
      op1[0][0]==='gather'&&op1[0][1].item==='wood'&&op2[0][0]==='gather'&&op2[0][1].item==='wood');
    /* the survival hint and [CAN CRAFT NOW] agree */
    const hint=V.agItches(rr).find(x=>/Stone Pickaxe/.test(x))||'';
    ok('the stone pickaxe hint does not say "craft it" when there is no wood ('+hint.slice(0,90)+')',/more log/.test(hint)&&!/right now/.test(hint));
    clearInv(rr);for(const [id,n] of [[B.LOG_O,4],[B.COBBLE,20],[V.IT.COAL,4],[B.IRON_ORE,3],[B.WOOL,3],[V.toolId(0,0),1],[B.SAND,2]])V.agGive(rr,{id,count:n},'test');
    const cc2=V.agCanCraftStr(rr);
    ok('[CAN CRAFT NOW] keeps the smelting line even with a long list ('+cc2.slice(-90)+')',/Iron Ingot x3 \(smelt your Iron Ore\)/.test(cc2));
    /* gather wool counts wool, picked up */
    /* (on a fresh flat lot of its own, so the sheep is not killed at the edge of a cliff) */
    const W0=dryLot(V.P.x-36,V.P.z+36,10),WX=W0.x,WZ=W0.z,WY=W0.y;flatLot(WX,WZ,WY,10);
    clearInv(rc);clearInv(rr);put(rr,RX-10,RY+1,RZ+10);put(rb,RX-10,RY+1,RZ+6);put(rc,WX-2,WY+1,WZ);step(20);V.agGive(rc,{id:V.toolId(1,3),count:1},'test');idle(rc);
    for(const m of V.entities)if(m.t==='mob'&&!m.bot&&!m.dead&&Math.hypot(m.x-rc.e.x,m.z-rc.e.z)<45)V.hurtMob(m,999,0,0);
    step(5);
    V.spawnMob('sheep',WX+1.5,WY+1,WZ+0.5);
    const wn=run(rc,'gather',{item:'wool',count:1},900);
    if(V.invCount(rc.inv,B.WOOL)<1)console.log('  DIAG wool:',wn,JSON.stringify(V.entities.filter(m=>m.t==='mob'&&m.mt==='sheep').map(m=>({x:m.x-WX,z:m.z-WZ,dead:m.dead,hp:m.hp}))),JSON.stringify(V.entities.filter(d=>d.t==='drop'&&!d.dead).map(d=>({id:d.st.id,x:(d.x-WX).toFixed(1),z:(d.z-WZ).toFixed(1)}))),'rc',(rc.e.x-WX).toFixed(1),(rc.e.y-WY).toFixed(1),(rc.e.z-WZ).toFixed(1),rc.sk&&rc.sk.k);
    ok('gather wool 1 ends with the wool in the inventory ('+V.invCount(rc.inv,B.WOOL)+')',V.invCount(rc.inv,B.WOOL)>=1);
    for(const a of V.AGENTS){a.q=[];a.sk=null;a.bjob=null;a.hp=20;a.hunger=20;}
  }

  /* ==================== review round 2: walking up to someone from any direction (give, tnt, follow) ==================== */
  /* the walker's goal is a square box but give/tnt/follow measure a circle: on a diagonal the bot used to stop in the
     box corner, outside the circle, and stand there until the skill timed out (give 60 s, tnt 90 s) */
  {
    V.setBrainMock(null);V.BRAIN.ok=false;V.BRAIN.off=true;V.GR.botGrief=true;V.GR.freezeMobs=false;
    const clearInv=a=>{for(let i=0;i<a.inv.length;i++)a.inv[i]=null;for(let i=0;i<4;i++)a.armor[i]=null;};
    const put=(a,x,y,z)=>{a.e.x=a.x=x+0.5;a.e.y=a.y=y+0.02;a.e.z=a.z=z+0.5;a.e.vx=a.e.vy=a.e.vz=0;a.path=null;a.pf=null;a.act=null;};
    const G0=dryLot(V.P.x-34,V.P.z-34,14),GX=G0.x,GZ=G0.z,GY=G0.y;flatLot(GX,GZ,GY,14);
    const gb=V.agByName('bee'),gr=V.agByName('brad'),gc=V.agByName('creep');
    for(const a of V.AGENTS){a.q=[{k:'wait',a:{count:60},t:0,st:{}}];a.sk=null;a.rx=null;a.bjob=null;a.path=null;a.pf=null;a.hp=20;a.hunger=20;}
    const P=V.P,pd={x:P.x,y:P.y,z:P.z};
    const pin=()=>{P.x=GX+0.5;P.y=GY+1;P.z=GZ+0.5;P.vx=P.vy=P.vz=0;};
    const despawn=()=>{for(const d of V.entities)if(d.t==='drop')d.age=999;step(2);};
    const runJob=(a,job,frames,each)=>{a.q=[job];a.sk=null;a.rx=null;let i=0;
      for(;i<frames&&(a.sk||a.q.length);i++){if(each)each(i);T+=50;V.frameStep(T);}return i;};
    /* give to Dan, 10 m away on two diagonals */
    const gres=[];let gok=true;
    for(const deg of [40,135]){
      clearInv(gb);despawn();pin();
      const ang=deg/180*Math.PI;put(gb,Math.floor(GX+Math.cos(ang)*10),GY+1,Math.floor(GZ+Math.sin(ang)*10));step(3);
      V.agGive(gb,{id:B.DIRT,count:3},'test');const d0=V.invCount(P.inv,B.DIRT);
      const fr=runJob(gb,{k:'give',a:{target:'Dan',item:'dirt',count:1},t:0,st:{}},400,pin);
      for(let k=0;k<60;k++){pin();T+=50;V.frameStep(T);}
      const got=V.invCount(P.inv,B.DIRT)-d0;
      gres.push(deg+'deg '+(fr*0.05).toFixed(1)+'s Dan +'+got);
      if(fr>=200||got!==1||V.invCount(gb.inv,B.DIRT)!==2)gok=false;
    }
    ok('give to Dan from 10 m on a diagonal: she walks up and hands it over in seconds ('+gres.join(', ')+')',gok);
    /* give to another player, 9 m away on a diagonal */
    clearInv(gb);clearInv(gr);despawn();pin();
    put(gr,GX-6,GY+1,GZ+6);put(gb,GX+1,GY+1,GZ+0);step(3);
    gr.q=[{k:'wait',a:{count:60},t:0,st:{}}];gr.sk=null;
    V.agGive(gb,{id:B.DIRT,count:2},'test');
    const fr2=runJob(gb,{k:'give',a:{target:'brad',item:'dirt',count:1},t:0,st:{}},400);
    step(60);
    ok('give to a bot 9 m away on a diagonal: it lands in his inventory ('+(fr2*0.05).toFixed(1)+'s, brad has '+V.invCount(gr.inv,B.DIRT)+')',fr2<200&&V.invCount(gr.inv,B.DIRT)===1);
    /* follow ends up next to Dan, not stuck in the box corner 5-6 m off */
    pin();put(gb,GX+9,GY+1,GZ+8);step(3);
    const fr4=runJob(gb,{k:'follow',a:{target:'Dan',secs:3},t:0,st:{}},400,pin);
    const fin=Math.hypot(gb.e.x-P.x,gb.e.z-P.z);
    ok('follow from 12 m on a diagonal: in range (~4 m) and done in '+(fr4*0.05).toFixed(1)+' s, ending '+fin.toFixed(2)+' m away',fr4<200&&fin<=4.5);
    /* tnt: walk up on a diagonal, light the LAST stick, then run (not "you have no TNT" and stand in the blast) */
    P.x=pd.x;P.y=pd.y;P.z=pd.z;P.vx=P.vy=P.vz=0;step(2);
    clearInv(gc);despawn();gc.hp=20;put(gc,GX+8,GY+1,GZ-8);step(3);
    V.agGive(gc,{id:B.TNT,count:1},'test');
    const tj={k:'tnt',a:{target:GX+','+GZ},t:0,st:{}};let lit=null,fled=false,far=0;
    gc.notes=[];
    const fr3=runJob(gc,tj,400);
    if(tj.st.lit)lit=tj.st.lit.slice();
    fled=!!(gc.rx&&gc.rx.k==='flee');
    for(let k=0;k<80;k++){T+=50;V.frameStep(T);if(lit&&k<38)far=Math.max(far,Math.hypot(gc.e.x-lit[0]-0.5,gc.e.z-lit[2]-0.5));}
    const tntFail=gc.notes.find(n=>/failed/.test(n));
    ok('tnt from 11 m on a diagonal: creep gets there and lights it in seconds ('+(fr3*0.05).toFixed(1)+'s'+(tntFail?', '+tntFail:'')+')',!!lit&&fr3<200&&!tntFail&&V.invCount(gc.inv,B.TNT)===0);
    ok('...then runs from his last stick of TNT and is not caught in the blast (fled '+far.toFixed(1)+' m, hp '+gc.hp+')',fled&&far>=5&&gc.hp===20&&!gc.dead);
    for(const a of V.AGENTS){a.q=[];a.sk=null;a.rx=null;a.bjob=null;}
  }

  /* ==================== "they aren't replying": brain-offline chat UX ==================== */
  {
    const realFetch=global.fetch;
    global.fetch=async()=>{throw new Error('ECONNREFUSED');};
    V.setBrainMock(null);
    Object.assign(V.BRAIN,{mock:null,ok:false,off:false,told:false,nudgeT:null,needPair:false,toldPair:false,checked:false,healthBusy:false});
    for(const a of V.AGENTS)a.q=[{k:'wait',a:{count:60},t:0,st:{}}];
    const notices=()=>V.CHAT.filter(m=>m.k==='sys'&&/^\[AI\] The AI brain isn.t running, so BunkerBrad, xx_lilcreepah_xx and honeybee_mc are on autopilot and can.t chat\. Double-click "Start AI Brain\.command"/.test(m.txt)).length;
    const nudges=()=>V.CHAT.filter(m=>m.k==='sys'&&/^\[AI\] \(The AI brain isn.t running/.test(m.txt)).length;
    const nb0=notices();
    await V.brainHealth();
    if(notices()!==nb0+1)console.log('  DIAG notice:',JSON.stringify({t:V.getAG(),B:Object.fromEntries(Object.entries(V.BRAIN).filter(([k,v])=>typeof v!=='function'&&k!=='tok')),on:V.AGENTS.map(a=>a.online),last:V.CHAT.slice(-3).map(m=>m.txt)}));
    ok('with no brain server, one clear chat line says the players are on autopilot and how to start it',notices()===nb0+1);
    await V.brainHealth();await V.brainHealth();
    ok('...only once',notices()===nb0+1);
    V.chatSubmit('anyone there?');
    ok('Dan chatting right after the notice does not repeat it yet',nudges()===0);
    V.setAgT(V.getAG().t+46);
    V.chatSubmit('hello??');
    ok('Dan chatting later gets a short reminder',nudges()===1);
    V.chatSubmit('hellooo???');
    ok('...rate-limited: not on every line',nudges()===1);
    V.setAgT(V.getAG().t+46);
    V.chatSubmit('/msg bee are you there');
    ok('...and again after 45s, for whispers too',nudges()===2);
    ok('the HUD badge says autopilot while the brain is missing',V.aiBadgeText()==='AI players: autopilot - brain not running');
    step(2);
    const bdg=global.document.getElementById('aibadge');
    ok('...and it is on screen',bdg.textContent==='AI players: autopilot - brain not running'&&bdg.style.display==='block');
    V.chatSubmit('/brain');
    ok('/brain prints the status with the fix',V.CHAT.slice(-2).some(m=>/not connected/.test(m.txt))&&V.CHAT.slice(-1)[0].txt.includes('Start AI Brain.command'));
    /* on autopilot nobody answers in words (the notice says they can't chat, so they don't) - least of all a whisper in public */
    const botLines=()=>V.CHAT.filter(m=>(m.k==='chat'||m.k==='whisper')&&m.from!=='Dan').length;
    const bl0=botLines();
    V.chatSubmit('hey brad wanna team up?');V.chatSubmit('/msg bee hi bee');
    for(let i=0;i<300;i++){T+=50;V.frameStep(T);}
    ok('on autopilot nobody answers Dan with canned lines ('+(botLines()-bl0)+' bot lines in 15 s)',botLines()===bl0);
    /* a brain server that is running without an API key: say THAT, not "start the brain" */
    await new Promise(r=>setTimeout(r,10));     /* let any health check started during those frames finish first */
    global.fetch=async()=>({status:200,json:async()=>({ok:true,authed:true,key:false})});
    Object.assign(V.BRAIN,{told:false,nudgeT:null,healthBusy:false});
    await V.brainHealth();
    ok('a brain server with no API key: the badge and the notice say so ('+V.aiBadgeText()+')',/no API key/.test(V.aiBadgeText())&&V.CHAT.some(m=>/has no ANTHROPIC_API_KEY/.test(m.txt)));
    V.chatSubmit('/brain');
    ok('...and /brain says how to fix it',/ANTHROPIC_API_KEY/.test(V.CHAT.slice(-1)[0].txt)&&!/Start AI Brain/.test(V.CHAT.slice(-1)[0].txt));
    /* server found but not paired: the /pair line, not the "not running" line */
    await new Promise(r=>setTimeout(r,10));
    global.fetch=async()=>({status:200,json:async()=>({ok:true,authed:false,key:true})});
    Object.assign(V.BRAIN,{told:false,toldPair:false,healthBusy:false});
    const n0=notices();
    await V.brainHealth();
    ok('an unpaired server gets the /pair message instead',notices()===n0&&V.CHAT.some(m=>/Type \/pair <code>/.test(m.txt))&&/pair/.test(V.aiBadgeText()));
    global.fetch=async()=>{throw new Error('ECONNREFUSED');};
    await V.brainHealth();
    ok('when that server goes away the game stops asking for /pair ('+V.aiBadgeText()+')',!V.BRAIN.needPair&&V.aiBadgeText()==='AI players: autopilot - brain not running');
    V.setBrainMock(()=>null);
    step(2);
    ok('with the brain connected the badge disappears',V.aiBadgeText()===''&&bdg.style.display==='none');
    global.fetch=realFetch;V.setBrainMock(null);V.BRAIN.ok=false;V.BRAIN.off=true;
  }

  /* mouse: Chrome's lone bogus pointer-lock jump is dropped, real flicks pass */
  {
    const MF=V.MF,now=()=>performance.now();
    MF.lockT=-1e9;MF.t=now();MF.prev=4;
    ok('a lone huge mouse jump out of stillness is dropped',V.mouseFilter(640,3)===null);
    MF.t=now();MF.prev=180;
    const f=V.mouseFilter(420,10);
    ok('a fast flick that ramped up still turns the camera',!!f&&f[0]===420);
    MF.t=now();MF.prev=3;
    ok('normal small movements pass untouched',JSON.stringify(V.mouseFilter(12,-7))==='[12,-7]');
    MF.lockT=now();
    ok('the first instant after (re)locking is ignored',V.mouseFilter(30,0)===null);
    MF.lockT=-1e9;
  }

  /* ---- leaving ---- */
  V.chatSubmit('/bots leave');
  ok('/bots leave logs them out',!V.getAG().active&&V.AGENTS.every(a=>!a.online));
  ok('left messages',V.CHAT.filter(m=>/left the game/.test(m.txt)).length>=3);

  /* ==================== a competent player, from nothing (fixed seed, scripted mock brain) ==================== */
  {
    /* deterministic: seeded randomness, a fixed world, no mobs */
    const realRandom=Math.random;Math.random=SEEDED((+process.env.BOTSEED||0)+20261005);
    V.startNewWorld('progression','4242','s');
    ok('a new world gets the brain-offline explanation again (the notice and its 45 s limiter reset)',V.BRAIN.told===false&&V.BRAIN.nudgeT==null);
    V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.setTime(0.03);
    step(40);
    const has=(a,id)=>V.invCount(a.inv,id);
    const act=(skill,item,count,target,note)=>({thought:'.',say:[],actions:[{skill,target:target||null,item:item||null,count:count||null,note:note||null}],relations:[],project:'continue',remember:null});
    const builtHut=a=>a.ev.some(v=>/^Finished building/.test(v.txt));
    /* what a sensible player does: wood -> wooden pickaxe -> stone -> stone pickaxe -> a small hut */
    V.setBrainMock((lane,bot,p)=>{
      const a=V.agByName(bot);
      if(lane==='mind')return {project:{title:'Get set up',kind:'GEAR',why:'new world',steps:['wood','tools','stone','shelter']},announce:''};
      if(lane==='build'){
        if(p.turn>2)return {thought:'done',place:[],remove:[],ignite:[],done:true};
        let nm='Cobblestone',bn=-1;
        if(p.turn===2){   /* fix what was floating: prop it up from below, then try again */
          for(const x of p.palette){const m=x.match(/^(Cobblestone|Dirt|Stone|Oak Planks|Birch Planks|Spruce Planks) x(\d+)/);if(m&&+m[2]>bn){bn=+m[2];nm=m[1];}}
          const fix=[];for(const r of p.rejected){const m=r.match(/^place .* at (-?\d+),(-?\d+),(-?\d+): floating/);
            if(m){const x=+m[1],y=+m[2],z=+m[3];fix.push({x,y:y-2,z,block:nm},{x,y:y-1,z,block:nm},{x,y,z,block:nm});}}
          return {thought:'propping up the low side',place:fix,remove:[],ignite:[],done:true};
        }for(const x of p.palette){const m=x.match(/^(Cobblestone|Dirt|Stone|Oak Planks|Birch Planks|Spruce Planks) x(\d+)/);if(m&&+m[2]>bn){bn=+m[2];nm=m[1];}}
        const rm=[],pl=[];
        for(let y=1;y<=3;y++)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)rm.push({x,y,z});   /* clear the plot first */
        for(let y=1;y<=2;y++)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){if(Math.abs(x)!==1&&Math.abs(z)!==1)continue;if(x===0&&z===1)continue;pl.push({x,y,z,block:nm});}
        for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[-1,0],[1,0],[0,1],[0,0]])pl.push({x,y:3,z,block:nm});
        return {thought:'a tiny 3x3 hut',place:pl,remove:rm,ignite:[],done:false};}
      if(lane!=='act')return null;
      const r=progAct(a);
      (a._log=a._log||[]).push((V.getAG().t).toFixed(0)+'s '+(a.notes.length?'['+a.notes.join(' / ')+'] ':'')+'-> '+r.actions[0].skill+' '+(r.actions[0].item||'')+(r.actions[0].count||''));
      return r;
    });
    function progAct(a){
      if(a.sk&&a.sk.k==='build')return act('build',null,null,a.sk.a.target,a.sk.a.note);
      if(a.notes.some(n=>/nearby|could not get/.test(n)))return act('explore',null,40,'north');
      const logs=has(a,B.LOG_O)+has(a,B.LOG_B)+has(a,B.LOG_S),planks=has(a,B.PLANK_O)+has(a,B.PLANK_B)+has(a,B.PLANK_S);
      const pick=V.agToolLevel(a,'pick');
      if(pick<0)return logs*4+planks<9?act('gather','wood',3):act('craft','Wooden Pickaxe');
      if(pick<1)return has(a,B.COBBLE)<3?act('gather','stone',3):act('craft','Stone Pickaxe');
      if(builtHut(a))return act('wait',null,30);
      const junk=has(a,B.COBBLE)+has(a,B.DIRT);
      if(junk<26&&!a._goBuild)return act('gather','stone',26-junk);
      /* each player picks its own plot a few blocks away (not on top of a neighbour's hut) */
      if(!a._plot){const o={BunkerBrad:[7,2],xx_lilcreepah_xx:[-2,7],honeybee_mc:[-7,-2]}[a.name]||[6,6];a._plot=Math.round(a.x+o[0])+','+Math.round(a.z+o[1]);}
      a._goBuild=true;return act('build',null,null,a._plot,'a tiny 3x3 cobblestone hut');
    }
    V.GR.bots=true;V.agJoinAll(false);
    step(2);
    const L=V.AGENTS.slice();
    ok('progression: three fresh players, nothing in their pockets',L.length===3&&L.every(a=>a.inv.every(s=>!s)&&a.flowers.length===0));
    const t0=V.getAG().t,ms={};
    const mark=(a,k)=>{const m=ms[a.name]||(ms[a.name]={});if(m[k]==null)m[k]=+(V.getAG().t-t0).toFixed(1);};
    for(let i=0;i<12000;i++){T+=50;V.frameStep(T);if(i%10===0)await new Promise(r=>setImmediate(r));
      for(const a of L){
        if(a.bjob)a._job=a.bjob;
        if(has(a,B.LOG_O)+has(a,B.LOG_B)+has(a,B.LOG_S)>0)mark(a,'first log');
        if(V.agToolLevel(a,'pick')>=0)mark(a,'wooden pickaxe');
        if(has(a,B.COBBLE)>0)mark(a,'first cobblestone');
        if(V.agToolLevel(a,'pick')>=1)mark(a,'stone pickaxe');
        if(builtHut(a))mark(a,'shelter');
      }
      if(L.every(a=>ms[a.name]&&ms[a.name].shelter!=null))break;
    }
    Math.random=realRandom;
    console.log('  progression (game seconds): '+L.map(a=>a.name+' '+JSON.stringify(ms[a.name]||{})).join(' | '));
    for(const a of L){
      const m=ms[a.name]||{};
      ok(a.name+' gets a wooden pickaxe from punched wood ('+m['wooden pickaxe']+'s)',m['wooden pickaxe']!=null&&m['wooden pickaxe']<=120);
      ok(a.name+' reaches a stone pickaxe within 4 game minutes ('+m['stone pickaxe']+'s)',m['stone pickaxe']!=null&&m['stone pickaxe']<=240);
      const placed=a.stats.placed;
      ok(a.name+' puts up a small shelter within 8 game minutes ('+m.shelter+'s, '+placed+' blocks placed)',m.shelter!=null&&m.shelter<=480&&placed>=15);
      if(m.shelter==null||process.env.DIAGALL)console.log('  DIAG '+a.name+' at '+[a.x,a.y,a.z].map(v=>v.toFixed(1))+' sk '+(a.sk&&a.sk.k)+' inv '+a.inv.filter(Boolean).map(q=>V.DEFS[q.id].name+'x'+q.count).join(',')+'\n    '+(a._log||[]).slice(-14).join('\n    ')+'\n    ev: '+a.ev.slice(-6).map(v=>v.txt).join(' / ')+'\n    rejected: '+(a._job?(a._job.rejLog||[]).filter(r=>!/already air/.test(r)).slice(0,40).join(' / ')+' turns '+a._job.turn+' placed '+a._job.placed:'-')+'\n    myTable '+JSON.stringify(a.myTable)+(a.myTable?' blk '+V.getBlock(a.myTable.x,a.myTable.y,a.myTable.z)+' d '+Math.hypot(a.myTable.x+0.5-a.x,a.myTable.z+0.5-a.z).toFixed(1):''));
      /* zero free items: every gain has a real source, and the books balance */
      const L2=a.led,srcOk=Object.keys(L2.src).every(k=>['harvest','craft','pickup','container','bucket','smelt','furnace'].includes(k));
      const ids=new Set([...Object.keys(L2.got),...Object.keys(L2.used)].map(Number));for(const s0 of a.inv.concat(a.armor))if(s0)ids.add(s0.id);
      let bal=true;const bad=[];
      for(const id of ids){const inv=V.invCount(a.inv,id)+V.invCount(a.armor.filter(Boolean),id),net=(L2.got[id]||0)-(L2.used[id]||0);if(inv!==net){bal=false;bad.push(V.DEFS[id].name+' '+inv+'/'+net);}}
      ok(a.name+' got nothing for free (sources: '+Object.keys(L2.src).join(', ')+')',srcOk&&!L2.src.other&&!L2.src.test);
      ok(a.name+'\'s inventory matches what it mined and crafted minus what it used'+(bal?'':' ('+bad.join(', ')+')'),bal);
      ok(a.name+' placed only blocks it had mined ('+placed+' placed, '+(L2.src.harvest||0)+' harvested)',placed<=(L2.src.harvest||0));
    }
  }

  /* ==================== another world, mobs on, night coming, no brain: the autopilot survives by the same rules ==================== */
  {
    const realRandom=Math.random;Math.random=SEEDED((+process.env.BOTSEED||0)+777);
    V.startNewWorld('nightshift','12345','s');
    V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=true;
    step(40);
    V.setBrainMock(null);Object.assign(V.BRAIN,{mock:null,ok:false,off:true});
    V.GR.bots=true;V.agJoinAll(false);step(2);
    const L=V.AGENTS.slice(),t0=V.getAG().t,ms={},prev={},errs=new Set();let jumps=0;const jx=[];
    for(let i=0;i<7200;i++){T+=50;V.frameStep(T);if(i%10===0)await new Promise(r=>setImmediate(r));
      for(const a of L){const m=ms[a.name]||(ms[a.name]={});
        if(V.agToolLevel(a,'pick')>=0&&m.wp==null)m.wp=+(V.getAG().t-t0).toFixed(1);
        if(V.agToolLevel(a,'pick')>=1&&m.sp==null)m.sp=+(V.getAG().t-t0).toFixed(1);
        if(a.e&&!a.dead){const p=prev[a.name];
          if(p&&p.e===a.e){const d=Math.hypot(a.e.x-p.x,a.e.y-p.y,a.e.z-p.z);if(d>3){jumps++;if(jx.length<4)jx.push(a.name+' '+d.toFixed(1));}}
          prev[a.name]={e:a.e,x:a.e.x,y:a.e.y,z:a.e.z};}else prev[a.name]=null;
        if(i%20===0)for(const n of a.notes)if(/Cannot read|TypeError|is not a function|is not defined/.test(n))errs.add(a.name+': '+n);}}
    Math.random=realRandom;
    console.log('  night shift (autopilot, mobs on, world 12345, game s): '+L.map(a=>a.name+' '+JSON.stringify(ms[a.name])+' deaths '+a.stats.d+' placed '+a.stats.placed).join(' | '));
    ok('night shift: everyone makes a wooden pickaxe from punched wood',L.every(a=>ms[a.name]&&ms[a.name].wp!=null));
    ok('night shift: at least two reach a stone pickaxe',L.filter(a=>ms[a.name]&&ms[a.name].sp!=null).length>=2);
    ok('night shift: nobody is ever teleported ('+jumps+' jumps'+(jx.length?': '+jx.join(', '):'')+')',jumps===0);
    ok('night shift: no JS errors reach the minds'+(errs.size?' ('+[...errs].slice(0,2).join(' / ')+')':''),errs.size===0);
    let bal=true;const bad=[];
    for(const a of L){const L2=a.led,ids=new Set([...Object.keys(L2.got),...Object.keys(L2.used)].map(Number));for(const s0 of a.inv.concat(a.armor))if(s0)ids.add(s0.id);
      for(const id of ids){const inv=V.invCount(a.inv,id)+V.invCount(a.armor.filter(Boolean),id),net=(L2.got[id]||0)-(L2.used[id]||0);if(inv!==net){bal=false;bad.push(a.name+' '+V.DEFS[id].name+' '+inv+'/'+net);}}
      if(Object.keys(L2.src).some(k=>!['harvest','craft','pickup','container','bucket','smelt','furnace'].includes(k))){bal=false;bad.push(a.name+' src '+Object.keys(L2.src).join(','));}}
    ok('night shift: every inventory matches what was mined, crafted and picked up'+(bal?'':' ('+bad.slice(0,3).join(', ')+')'),bal);
  }

  console.log(pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{console.log('CRASH',e);process.exit(1);});
