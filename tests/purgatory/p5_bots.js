/* p5_bots.js (P5, gate x2): the AI players in Puppet Purgatory (the purgatory build plan section 5.5). The botsmoke
   extension: seeded Math.random (BOTSEED), a fake clock, fetch throws (a brain server on this machine is never contacted),
   the autopilot or a mock brain. botsmoke.js itself is untouched and still runs x3 in the gate. One boot per process.
   Checks that need another package still on its stub (P1's world rules, P2's recipes, P4's headliners) report as skipped. */
'use strict';
const path=require('path'),fs=require('fs'),crypto=require('crypto');
const boot=require(process.env.P5_PGBOOT||'../lib/pg_boot.js');
const V=boot({seed:(+process.env.BOTSEED||59)+5,clock:true});
global.fetch=async()=>{throw new Error('no network in tests');};
const {ok,skip}=boot,{B,IT}=V,step=boot.stepper(500000);
const ALLOW=['harvest','craft','pickup','container','bucket','smelt','furnace'];
const SPOIL=/\barm\b|puppeteer|felt dan|broom|strike|hand slid|elbow/i;
const MP=()=>V.getMP(),C=()=>V.p5Core(),DEFS=V.DEFS;
const tk=async n=>{await step.tick(n||1);};
/* the ledger is session-only (a reload starts the books again), so after a reload balances are checked against a baseline taken then */
const invOf=(a,id)=>V.invCount(a.inv,id)+V.invCount(a.armor.filter(Boolean),id);
function lbase(a){const inv={};for(const s of a.inv.concat(a.armor))if(s)inv[s.id]=(inv[s.id]||0)+s.count;return {got:{...a.led.got},used:{...a.led.used},inv};}
function ledger(a,base){const L2=a.led,srcOk=Object.keys(L2.src).every(k=>ALLOW.includes(k)),b=base||{got:{},used:{},inv:{}};
  const ids=new Set([...Object.keys(L2.got),...Object.keys(L2.used),...Object.keys(b.inv)].map(Number));for(const s of a.inv.concat(a.armor))if(s)ids.add(s.id);
  const bad=[];for(const id of ids){const inv=invOf(a,id)-(b.inv[id]||0),net=(L2.got[id]||0)-(b.got[id]||0)-((L2.used[id]||0)-(b.used[id]||0));
    if(inv!==net)bad.push((DEFS[id]?DEFS[id].name:id)+' '+inv+'/'+net);}
  return {ok:srcOk&&!bad.length&&!L2.src.other&&!L2.src.test,why:(srcOk?'':'src '+Object.keys(L2.src).join(','))+bad.slice(0,4).join(', ')};}
function sig(st){return st?[st.id,st.count,st.dur==null?'-':st.dur,st.ench?JSON.stringify(st.ench):'-'].join(':'):'';}
function invSig(a){return a.inv.concat(a.armor).filter(Boolean).map(sig).sort().join('|');}
function tabSnap(){return JSON.stringify([V.AG_GATHER,V.AG_HUNT,V.AG_JUNK,V.VG]);}
function give(a,id,n,extra){const st=Object.assign({id,count:n},extra||{});return V.agGive(a,st,'pickup');}
function wear(a,id,slot){const i=a.inv.findIndex(s=>s&&s.id===id);if(i<0)return false;const old=a.armor[slot];a.armor[slot]=a.inv[i];a.inv[i]=old||null;return true;}
function near(a,x,z){const e=a.e;return e?Math.hypot(e.x-x,e.z-z):1e9;}
function tp(x,z,yy){const P=V.P;V.forceChunksNear(x,z);P.x=x;P.z=z;P.y=V.mpSafeY(x,yy==null?V.surfaceTop(Math.floor(x),Math.floor(z))+1:yy,z);P.vx=P.vy=P.vz=0;P.fallD=0;}
function bodyTo(a,x,z){const e=a.e;if(!e)return false;e.x=x;e.z=z;e.y=V.mpSafeY(x,V.surfaceTop(Math.floor(x),Math.floor(z))+1,z);e.vx=e.vy=e.vz=0;a.x=e.x;a.y=e.y;a.z=e.z;a.path=null;a.pf=null;return true;}
function quiet(){for(const a of V.AGENTS){a.sk=null;a.q=[];a.rx=null;a.path=null;a.pf=null;}}

const LB={};
boot.run(async()=>{
  if(boot.stubbed('5')){skip('every P5 check','P5 on its stub');return;}
  const p2=V.getPRECIPES().length>0,p1=!boot.stubbed('1'),p4=!boot.stubbed('4');
  /* ===== 0. a world, the three bots on the autopilot (no brain), the realm tables pristine ===== */
  boot.world(V,'p5bots','1337',step);
  V.setBrainMock(null);Object.assign(V.BRAIN,{mock:null,ok:false,off:true});
  V.GR.bots=true;V.agJoinAll(false);await tk(60);
  const brad=V.agByName('BunkerBrad'),creep=V.agByName('xx_lilcreepah_xx'),bee=V.agByName('honeybee_mc'),BOTS=[brad,creep,bee];
  ok('three bots join with bodies',BOTS.every(a=>a&&a.e&&!a.e.dead));
  const s0=tabSnap();V.purgBotInit();V.purgBotInit();
  ok('purgBotInit is idempotent and leaves the overworld tables untouched',tabSnap()===s0);
  ok('GR.botPurg exists and defaults on',V.GR.botPurg===true);
  ok('outside: agRecipeOut keeps the v6.0 resolutions (sticks, chest, pickaxe)',C().agRecipeOut('sticks',brad)===IT.STICK&&C().agRecipeOut('chest',brad)===B.CHEST&&
    (()=>{const id=C().agRecipeOut('pickaxe',brad);return id!=null&&!DEFS[id].pg;})());
  /* gear: an enchanted, worn stone pick, logs, cobble, a worn iron chestplate (armorId(2,1) = 239) */
  give(brad,124,1,{dur:57,ench:{eff:1}});give(brad,B.LOG_O,12);give(brad,239,1,{dur:120});wear(brad,239,1);
  give(creep,B.COBBLE,40);give(creep,B.TNT,3);give(bee,V.FLOWER_IDS?[...V.FLOWER_IDS][0]:B.LOG_B,5);
  brad.home=[brad.x,brad.y,brad.z];const bradHome=JSON.stringify(brad.home);
  const pre={};for(const a of BOTS)pre[a.name]=invSig(a);
  ok('the ledgers balance before the door (setup)',BOTS.every(a=>ledger(a).ok));
  /* creep wanders 60 m off: he still gets his trunk */
  {const e=creep.e,P=V.P;e.x=P.x+60;e.z=P.z;e.y=V.surfaceTop(Math.floor(e.x),Math.floor(e.z))+1.05;creep.x=e.x;creep.z=e.z;quiet();}
  await tk(4);
  const d=V.mpDoorHere();await tk(6);
  ok('a Stage Door exists in the overworld',!!d&&!!MP().door);

  /* ===== 1. entry: the strip, the trunks, the ledger, the pending arrivals ===== */
  V.mpEnterNow();
  const M=MP();
  ok('Dan is inside',V.getDim()==='puppet'&&M.inside===true);
  ok('every online bot is stripped bare',BOTS.every(a=>a.inv.every(s=>!s)&&a.armor.every(s=>!s)));
  ok('each bot has its own Stage Trunk in the row (the far bot too)',BOTS.every(a=>!!M.trunks[a.name]&&M.bots[a.name]&&M.bots[a.name].stash===M.trunks[a.name]));
  const trunkSig=a=>{const be=C().blockEnts.get(M.trunks[a.name]);return be&&be.t==='stash'&&be.who===a.name?be.inv.filter(Boolean).map(sig).sort().join('|'):'?';};
  ok('each trunk holds exactly what that bot carried (ids, counts, durability, enchantments)',BOTS.every(a=>trunkSig(a)===pre[a.name]));
  ok('the ledgers balance after the strip (stash logged as used)',BOTS.every(a=>ledger(a).ok));
  ok('the far bot was removed where it stood',!creep.e);
  ok('the bots wait in the dark (not yet arrived, frozen)',BOTS.every(a=>a.dim==='over'&&M.bots[a.name].pend===1&&!a.e));
  ok('the overworld home is kept in MP.bots and cleared inside',brad.home===null&&JSON.stringify(M.bots.BunkerBrad.mem.home)===bradHome);
  ok('the realm swapped: wood is a Felt Sleeve, the scaffold blocks are purgatory blocks, the demolitionist is pgbomber',
    JSON.stringify(V.AG_GATHER.wood)===JSON.stringify([B.PG_SLEEVE])&&JSON.stringify(V.AG_JUNK)===JSON.stringify([B.PG_DECK,B.PG_SLEEVE,B.PG_LINO,B.PG_SWAMP])&&V.AG_HUNT.demolitionist==='pgbomber'&&!V.AG_GATHER.sand);
  /* ===== 2. they fall out of the dark 2 s apart; Brad face-first, creep on the can and booted ===== */
  const arr={},land={},C0=M.clock;let held=false,rot=false,creepLand=null,creepFar=0;
  for(let i=0;i<360&&Object.keys(arr).length<3;i++){await tk(1);
    for(const a of BOTS){if(a.dim==='puppet'&&arr[a.name]==null)arr[a.name]=M.clock-C0;if(a.e&&a.e.onGround&&arr[a.name]!=null&&!land[a.name])land[a.name]=[a.e.x,a.e.z];}
    if(brad.pgrab&&brad.pgrab.k==='held')held=true;if(brad.e&&brad.e.M&&brad.e.M.G&&brad.e.M.G.rotation.x<-1)rot=true;}
  for(let i=0;i<200;i++){await tk(1);for(const a of BOTS)if(a.e&&a.e.onGround&&!land[a.name])land[a.name]=[a.e.x,a.e.z];if(brad.pgrab&&brad.pgrab.k==='held')held=true;if(brad.e&&brad.e.M&&brad.e.M.G&&brad.e.M.G.rotation.x<-1)rot=true;
    if(creep.e&&creep.e.onGround&&creepLand==null&&creep.ev.some(v=>/boot flew out of the lid/.test(v.txt)))creepLand=[creep.e.x,creep.e.z];
    if(creepLand)creepFar=Math.max(creepFar,Math.hypot(creep.e.x-3.5,creep.e.z+133.5));}
  const t=['BunkerBrad','xx_lilcreepah_xx','honeybee_mc'].map(n=>arr[n]);
  ok('all three arrive inside (a.dim puppet, bodies)',BOTS.every(a=>a.dim==='puppet'&&a.e&&!a.e.dead));
  ok('they arrive 2 s apart ('+t.map(x=>x==null?'-':x.toFixed(2)).join(', ')+')',t.every(x=>x!=null)&&Math.abs(t[1]-t[0]-2)<0.25&&Math.abs(t[2]-t[1]-2)<0.25);
  ok('they land on the stuffing heap and the can by the Mark',BOTS.every(a=>land[a.name]&&(a===creep?Math.hypot(land[a.name][0]-3.5,land[a.name][1]+133.5)<3:Math.hypot(land[a.name][0]+5.5,land[a.name][1]+135.5)<2.5)))||
    console.log('  DIAG land: '+JSON.stringify(land));
  ok('BunkerBrad lands face-first and lies there',held&&rot&&brad.e.M.G.rotation.x===0);
  ok('xx_lilcreepah_xx lands on the Bin and is booted off it',!!creepLand&&creepFar>1.0);
  ok('the ledgers still balance',BOTS.every(a=>ledger(a).ok));
  /* ===== 3. names, recipes and gather words inside ===== */
  {const A=C().agRecipeOut;
    ok('inside: "sticks" is the Puppet Rod, "chest" the Prop Trunk, "crafting table" the Bin, "torch" the Eyeball Lamp',
      A('sticks',bee)===IT.PG_ROD&&A('chest',bee)===B.PG_PTRUNK&&A('crafting table',bee)===B.PG_CAN&&A('torch',bee)===B.PG_LAMP);
    const loose=['stick','stone','chest','snips','padding','pickaxe','sword','axe','shovel','wooden pickaxe','stone pickaxe'].map(w=>A(w,bee));
    ok('no loose word resolves to Drumstick, Rhinestone Snips or Foam Padding Chest',loose.every(id=>id!==IT.PG_DRUMSTICK&&id!==IT.PG_RSNIPS&&(id!==IT.PG_FPAD_C||false)));
    ok('inside: agRecipeOut never returns an overworld id',['pickaxe','sword','furnace','planks','stone pickaxe','iron sword','torch','bed','door','tnt'].every(w=>{const id=A(w,bee);return id==null||!!DEFS[id].pg;}));
    if(p2){ok('with the real recipes: "pickaxe" is a purgatory pick and "rhinestone snips" names itself',DEFS[A('pickaxe',bee)].tool.type==='pick'&&A('rhinestone snips',bee)===IT.PG_RSNIPS);
      ok('agRecipeFor inside only ever returns PRECIPES rows',[IT.PG_FLOPPY,IT.PG_ROD,B.PG_CAN].every(id=>{const r=C().agRecipeFor(id);return !r||V.getPRECIPES().includes(r);})&&C().agRecipeFor(IT.STICK)===null);}
    else skip('real-recipe resolution','P2 on its stub');
    const G=C().agGatherSpec;
    ok('inside: gather "wood" mines Felt Sleeves, "stone" Foam Rubber, "wire" Wire Ore, "planks" explains Felt',
      JSON.stringify(G(bee,'wood').ids)===JSON.stringify([B.PG_SLEEVE])&&JSON.stringify(G(bee,'stone').ids)===JSON.stringify([B.PG_FOAM])&&
      JSON.stringify(G(bee,'wire').ids)===JSON.stringify([B.PG_WIREORE])&&G(bee,'planks').kind==='craft'&&G(bee,'sand').kind==='craft');}
  /* ===== 4. headliners: attack by name, attribution, the blast never hurts its owner ===== */
  {const e=bee.e;quiet();
    const fake={t:'mob',mob:true,mt:'pgbomber',x:e.x+3,y:e.y,z:e.z,hp:200,hw:0.4,h:1.8,dead:false,vx:0,vy:0,vz:0,hurtT:0,mats:[],legs:[]};
    V.entities.push(fake);const s={k:'attack',a:{target:'the demolitionist'},t:0,st:{}};let r='x';try{r=V.SK.attack(bee,0.016,s);}catch(err){r='threw '+err.message;}
    const i=V.entities.indexOf(fake);if(i>=0)V.entities.splice(i,1);
    ok('attack "the demolitionist" resolves to the headliner ('+r+')',s.st.mob===fake);quiet();
    const rel0=JSON.stringify(V.agRel(bee,'Dan'));bee.spawnProt=0;bee.e.hurtT=0;const hp0=bee.hp;
    V.purgHit(bee.e,3,'the Demolitionist','blast',{force:1});
    ok('a headliner hit is blamed on the headliner, never on Dan',bee.hp<hp0&&bee.lastHurtBy==='the Demolitionist'&&JSON.stringify(V.agRel(bee,'Dan'))===rel0);
    if(!V.MOBT.pgt5)V.MOBT.pgt5={hp:40,hw:0.4,h:1.8,spd:0,body:'#888',legc:'#666',pmob:1};
    V.spawnMob('pgt5',bee.e.x+1.5,bee.e.y,bee.e.z);const h=V.entities[V.entities.length-1];const hh=h.hp;
    for(const a of BOTS){a.spawnProt=0;if(a.e)a.e.hurtT=0;}const bh=bee.hp;
    V.purgBoom(h.x,h.y+0.5,h.z,4,'the Demolitionist',h);
    ok('the Demolitionist’s blast never hurts him and hurts the bot beside him, attributed to him',h.hp===hh&&bee.hp<bh&&bee.lastHurtBy==='the Demolitionist');
    V.pgCore().removeEnt(h);await tk(20);}
  /* ===== 5. the house rules: never past the Pig's rope while she is unbeaten and Dan is outside ===== */
  {const spawns0=JSON.stringify(M.spawns);M.open.a2=1;tp(0.5,58.5);await tk(30);quiet();bee.spawnProt=0;
    bodyTo(bee,0.5,80.5);await tk(2);let maxZ=-1e9,ejected=false;
    for(let i=0;i<220;i++){await tk(1);if(bee.e&&bee.e.z<66)ejected=true;}
    ok('a bot inside the Pig’s arena while she is unbeaten and Dan is outside walks back out ('+(bee.e?bee.e.z.toFixed(1):'-')+')',ejected&&bee.e.z<66.5);
    quiet();bee.q=[{k:'goto',a:{target:'0,110',r:2},t:0,st:{}}];
    for(let i=0;i<260;i++){await tk(1);if(bee.e)maxZ=Math.max(maxZ,bee.e.z);}
    ok('...and a goto up the staircase stops at the rope (max z '+maxZ.toFixed(1)+')',maxZ<67.5&&bee.notes.concat(bee.ev.map(v=>v.txt)).some(n=>/velvet rope/.test(n)));
    M.dead.bigpig=1;quiet();bee.q=[{k:'goto',a:{target:'0,90',r:2},t:0,st:{}}];maxZ=-1e9;
    for(let i=0;i<400&&maxZ<69;i++){await tk(1);if(bee.e)maxZ=Math.max(maxZ,bee.e.z);}
    ok('once the Pig is beaten the staircase is open to bots (max z '+maxZ.toFixed(1)+')',maxZ>68.5);
    M.dead.bigpig=0;M.open.a2=0;Object.assign(M.spawns,JSON.parse(spawns0));quiet();tp(0.5,-135.5,36.2);await tk(40);for(const a of BOTS)if(a.e)bodyTo(a,-2.5+BOTS.indexOf(a)*2,-130.5);await tk(20);}
  /* ===== 5b. DO NOT PUSH: no bot touches it while the Demolitionist is unbeaten and Dan is outside; creep's gag (once, about 8 minutes in) ===== */
  {tp(0.5,-150.5);await tk(30);quiet();bodyTo(bee,0.5,-174.2);await tk(2);let minD=99;
    for(let i=0;i<120;i++){await tk(1);if(bee.e)minD=Math.min(minD,Math.hypot(bee.e.x-0.5,bee.e.z+175.5));}
    ok('a bot standing by DO NOT PUSH while the Demolitionist is unbeaten walks away from it ('+Math.hypot(bee.e.x-0.5,bee.e.z+175.5).toFixed(1)+' m)',Math.hypot(bee.e.x-0.5,bee.e.z+175.5)>2.4);
    quiet();bodyTo(creep,0.5,-160.5);M.stats.t0=M.clock-500;let booted=false;
    for(let i=0;i<500&&!booted;i++){await tk(1);booted=creep.ev.some(v=>/boot shot out of a hatch/.test(v.txt));}
    ok('about eight minutes in, xx_lilcreepah_xx runs down to punch DO NOT PUSH and a boot out of a hatch knocks him back',booted&&M.bots.xx_lilcreepah_xx.gag.dnp===2);
    const n=creep.ev.length;for(let i=0;i<60;i++)await tk(1);
    ok('...only once',!creep.ev.slice(n).some(v=>/boot shot out of a hatch/.test(v.txt))&&!(creep.rx&&creep.rx.pgDNP));
    quiet();tp(0.5,-135.5,36.2);await tk(40);for(const a of BOTS)if(a.e)bodyTo(a,-2.5+BOTS.indexOf(a)*2,-130.5);await tk(20);}
  /* ===== 6. Dan's things: owned drops are left alone for 60 s ===== */
  {quiet();bee.q=[{k:'wait',a:{count:8},t:0,st:{}}];await tk(2);const e=bee.e;V.mpDrop(e.x,e.y+0.3,e.z,{id:IT.PG_FELT,count:3},'Dan',0,0,0);const dr=V.entities[V.entities.length-1];
    const n0=V.invCount(bee.inv,IT.PG_FELT);await tk(40);
    ok('a drop Dan owns is left alone by a bot standing on it',!dr.dead&&V.invCount(bee.inv,IT.PG_FELT)===n0);
    dr.pownT=M.clock-1;await tk(40);
    ok('...and picked up once its 60 s are up (ledger "pickup")',dr.dead&&V.invCount(bee.inv,IT.PG_FELT)===n0+3&&ledger(bee).ok);}
  /* ===== 7. death inside: Lost Property, nearest spawn, deaths counted, the overworld home intact ===== */
  {quiet();give(brad,IT.PG_FELT,7);give(brad,IT.PG_FLOPPY,1,{dur:40});const want=invSig(brad),wantInv=brad.inv.filter(Boolean).map(sig).sort().join('|'),bx0=brad.e.x,bz0=brad.e.z;
    const pre0=new Set(V.entities.filter(e=>e.t==='drop'&&!e.dead));
    brad.spawnProt=0;brad.e.hurtT=0;V.agHurt(brad,999,'the Demolitionist',0,0,'pg:blast');await tk(2);
    const R=M.bots.BunkerBrad,mine=V.entities.filter(e=>e.t==='drop'&&!e.dead&&!pre0.has(e)&&Math.hypot(e.x-bx0,e.z-bz0)<4&&(e.st.id===IT.PG_FELT||e.st.id===IT.PG_FLOPPY));
    ok('a bot that dies inside drops nothing on the floor; everything goes to Lost Property',brad.dead&&mine.length===0&&R.lost.map(sig).sort().join('|')===wantInv&&brad.inv.every(s=>!s))||
      console.log('  DIAG death: dead '+brad.dead+' drops '+mine.length+' lost '+JSON.stringify(R.lost.map(s=>s.id+'x'+s.count))+' inv '+brad.inv.filter(Boolean).map(s=>s.id+'x'+s.count).join(',')+' hp '+brad.hp+' armor '+brad.armor.filter(Boolean).map(s=>s.id).join(','));
    ok('MP.bots[name].deaths counts deaths inside',R.deaths===1);
    ok('the death message is a purgatory one',V.CHAT.some(m=>m.k==='death'&&/BunkerBrad was blown up by the Demolitionist/.test(m.txt)));
    let back=false;for(let i=0;i<500&&!back;i++){await tk(1);back=!brad.dead&&invSig(brad)===want;}
    ok('he respawns at the nearest spawn point and gets his things back'+(p2?' (thrown by the can)':' (P2 stub: handed back)'),back&&near(brad,0.5,-135.5)<10);
    ok('the respawn keeps the overworld home in MP.bots and none inside',brad.home===null&&JSON.stringify(R.mem.home)===bradHome);
    ok('his ledger balances (used at death, back by pickup/container)',ledger(brad).ok);}
  /* ===== 8. cooked food first; a thrown bot lands with damage <= 6, halved by a Stunt Helmet ===== */
  {quiet();give(bee,IT.PG_RCHICK,2);give(bee,IT.PG_ROAST,1);bee.hunger=10;bee.q=[{k:'eat',a:{count:1},t:0,st:{}}];await tk(60);
    ok('a bot eats cooked food before raw',V.invCount(bee.inv,IT.PG_ROAST)===0&&V.invCount(bee.inv,IT.PG_RCHICK)===2);
    /* thrown from the flat Mark pad straight up and back down onto it, so both landings are the same */
    const throwOnce=async(vx)=>{quiet();bodyTo(creep,-3.5,-138.5);creep.spawnProt=0;creep.hp=20;creep.e.hurtT=0;creep.e.vx=creep.e.vy=creep.e.vz=0;await tk(4);
      quiet();creep.e.hurtT=0;const y0=creep.e.y;let top=y0,n=0;creep.pgLand=null;creep.pgrab={k:'thrown',by:'the Pig',vx:vx||0,vy:11,vz:0,src:null};
      while(creep.pgrab&&n<300){await tk(1);n++;if(creep.e)top=Math.max(top,creep.e.y);}
      return {arc:top-y0,loss:+(20-creep.hp).toFixed(2),done:!creep.pgrab,land:creep.pgLand};};
    const r1=await throwOnce(0);
    ok('a thrown bot follows a ballistic arc and lands with damage <= 6 (arc '+r1.arc.toFixed(1)+' m, '+r1.loss+' damage)',r1.done&&r1.arc>1.5&&r1.land&&r1.land.dmg===r1.land.raw&&r1.loss>0&&r1.loss<=6);
    give(creep,IT.PG_STUNT,1);wear(creep,IT.PG_STUNT,0);const r2=await throwOnce(0);
    ok('...and a Stunt Helmet halves the landing ('+JSON.stringify(r2.land)+', lost '+r2.loss+')',r2.done&&r2.land&&r2.land.dmg===r2.land.raw*0.5&&r2.loss<=3&&r2.loss<r1.loss);
    quiet();give(bee,B.PG_LAMP,2);bee.q=[{k:'wait',a:{count:3},t:0,st:{}}];await tk(3);
    let placed='no spot';const e=bee.e,fx=Math.floor(e.x),fy=Math.floor(e.y+0.05),fz=Math.floor(e.z);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){const x=fx+dx,z=fz+dz;if(V.getBlock(x,fy,z)!==B.AIR||!DEFS[V.getBlock(x,fy-1,z)]||DEFS[V.getBlock(x,fy-1,z)].solid===false)continue;
      placed=V.agPlaceBlock(bee,x,fy,z,B.PG_LAMP);if(placed===''){ok('a bot places an Eyeball Lamp from its own lamps (hook P5-41)',V.getBlock(x,fy,z)===B.PG_LAMP&&V.invCount(bee.inv,B.PG_LAMP)===1&&ledger(bee).ok);break;}}
    if(placed!=='')ok('a bot places an Eyeball Lamp from its own lamps (hook P5-41): '+placed,false);
    ok('the ledgers balance',BOTS.every(a=>ledger(a).ok));}
  /* ===== 9. perception and the guide (gated like the Programme) ===== */
  {M.page=7;const g=V.purgGuide({name:'honeybee_mc',dim:'puppet',inv:[],armor:[]});
    ok('the guide is <= 10,000 chars and names the stations ('+g.length+')',g.length<=10000&&/The Bin/.test(g)&&/Hot Plate/.test(g));
    ok('the guide carries no Strike, broom or hand text before the Frog is beaten',!/\bstrike\b|\bbroom\b|hand slid|hand the whole time|felt dan/i.test(g));
    const all=(1<<14)-1;M.page=all;M.dead.bomber=M.dead.bigpig=M.dead.bigfrog=1;
    const g2=V.purgGuide({name:'honeybee_mc',dim:'puppet',inv:[],armor:[]});
    ok('with every page open and the show over it is still <= 10,000 chars ('+g2.length+') and gives honeybee_mc her line',g2.length<=10000&&/just a hand the whole time/.test(g2));
    M.page=7;M.dead.bomber=M.dead.bigpig=M.dead.bigfrog=0;
    const o=V.agObs(bee,['test']);
    ok('the observation has the [PUPPET PURGATORY] block, the trunk line and the headliners',/\[PUPPET PURGATORY\]/.test(o)&&/Stage Trunk/.test(o)&&/The Demolitionist/.test(o));
    ok('the observation names no later headliner location before its act',!/Grand Staircase/.test(o.split('[NEARBY]')[0])&&!/clearing/.test(o.split('[NEARBY]')[0]));
    ok('[CAN CRAFT NOW], [NEARBY] and [PLACES] are the purgatory versions',/\[CAN CRAFT NOW\] (nothing yet - punch the Felt Sleeves|.*(Felt|Puppet))/.test(o)&&/Area: /.test(o)&&/The Mark \(spawn point/.test(o)&&!/World spawn at/.test(o));
    const calls=[];V.setBrainMock((lane,bot,p)=>{calls.push({lane,bot,p});return lane==='act'?{thought:'t',say:[],actions:[{skill:'wait',count:2}],relations:[],project:'continue'}:
      lane==='mind'?{project:{title:'Get Out',kind:'ESCAPE',why:'w',steps:['a'],where:'here'},announce:''}:null;});
    await tk(160);
    const ins=calls.filter(c=>c.lane==='act'||c.lane==='mind');
    ok('inside, every brain request carries the guide ('+ins.length+' requests)',ins.length>0&&ins.every(c=>typeof c.p.guide==='string'&&c.p.guide.length>500));
    V.setBrainMock(null);Object.assign(V.BRAIN,{mock:null,ok:false,off:true});quiet();}
  /* ===== 10. the brain side: prompts.mjs (no guide = byte-identical v6.0; a guide = a third cached block) ===== */
  {const pm=await import(path.join(boot.ROOT,'brain','prompts.mjs'));
    const fx=JSON.parse(fs.readFileSync(path.join(boot.FIX,'p5_prompts_fixture.json'),'utf8')).cases;
    const pay={act:{obs:'[YOU] test obs line\n[INVENTORY] EMPTY',skills:['goto','gather']},mind:{obs:'[YOU] mind obs',why:'you have no project'},build:{goal:'a hut',turn:2,maxTurns:12,palette:['Dirt x9'],notes:['n1'],rejected:['r1'],pending:3,site:'SITE',view:'VIEW'}};
    const bad=Object.keys(fx).filter(k=>{const [lane,bot]=k.split('|');return crypto.createHash('sha256').update(JSON.stringify(pm.buildRequest(lane,bot,pay[lane]))).digest('hex')!==fx[k];});
    ok('a request without a guide is byte-identical to the fixture ('+Object.keys(fx).length+' lane x bot cases'+(bad.length?', differ: '+bad.join(','):'')+')',bad.length===0);
    const q=pm.buildRequest('act','honeybee_mc',{obs:'x',guide:'GUIDE TEXT'}),q2=pm.buildRequest('mind','BunkerBrad',{obs:'x',why:'w',guide:'GUIDE'});
    ok('with a guide: a third cached system block that replaces the overworld rules',q.system.length===3&&/^PUPPET PURGATORY \(you are in it now: these rules REPLACE the overworld SURVIVAL RULES/.test(q.system[2].text)&&q.system[2].cache_control.type==='ephemeral'&&/GUIDE TEXT$/.test(q.system[2].text));
    ok('with a guide: the persona addendum rides in the persona block and the mind may pick ESCAPE',q.system[1].text.includes(pm.PERSONAS_PURG.honeybee_mc)&&q2.output_config.format.schema.properties.project.properties.kind.enum.includes('ESCAPE'));
    ok('PERSONAS_PURG never mentions the arm, the Puppeteer, Felt Dan, the broom, the Strike, the elbow or the hand',Object.keys(pm.PERSONAS_PURG).length===3&&Object.values(pm.PERSONAS_PURG).every(t=>!SPOIL.test(t)));}
  /* ===== 11. the autopilot climbs the ladder with PRECIPES only (needs P2's recipes) ===== */
  if(p2){const res=await ladderRun();
    ok('autopilot: a bot reaches Wire Snips (Hot Plate and smelting included) within 20 game minutes ('+res.txt+')',res.snips);
    ok('autopilot: zero free items, every ledger balances'+(res.bad?' ('+res.bad+')':''),!res.bad);}
  else skip('autopilot ladder to Wire Snips','P2 on its stub (no PRECIPES)');
  if(p1)skip('bots walk the sheet without sagging it','covered in p1_smoke (P1 owns the sag rule)');else skip('bots walk the sheet without sagging it','P1 on its stub');
  /* ===== 11b. the headliner reflexes (need P4): BunkerBrad cuts the sparking cord next to Dan; honeybee_mc hits the Pig off Dan ===== */
  if(p4&&typeof V.hnSpark==='function'){quiet();tp(0.5,-135.5,36.2);await tk(30);quiet();
    /* a cord across the flat Mark pad, 3.5 m from Dan */
    const cy=35+1,cz=-139,cells=[];for(let x=-4;x<=4;x++){V.setBlock(x,cy,cz,B.PG_CORD);V.setBlock(x,cy+1,cz,B.AIR);cells.push(x);}
    give(brad,IT.PG_SNIPS,1,{dur:260});bodyTo(brad,-2.5,-133.5);bodyTo(bee,6.5,-128.5);bodyTo(creep,-8.5,-128.5);await tk(4);quiet();
    const cnt=()=>cells.filter(x=>V.getBlock(x,cy,cz)===B.PG_CORD).length,n0=cnt();
    V.hnSpark([-4,cy,cz],3,'the Demolitionist');let snip=false;
    for(let i=0;i<160;i++){await tk(1);if(brad.rx&&brad.rx.k==='pgsnip')snip=true;}
    const n1=cnt();
    ok('BunkerBrad cuts the sparking Det Cord next to Dan ('+n0+' -> '+n1+' cord cells)',snip&&n1<n0&&brad.ev.some(v=>/cut the sparking cord/.test(v.txt)));
    for(const x of cells)if(V.getBlock(x,cy,cz)===B.PG_CORD)V.setBlock(x,cy,cz,B.AIR);
    V.hnSkipTo(2);await tk(20);const F=V.hnFightStart('bigpig',{noIntro:true});await tk(4);const pg=F&&F.e;
    if(pg){bodyTo(bee,pg.x+3,pg.z-3);await tk(2);quiet();V.getHNP().held='Dan';let hit=false;
      for(let i=0;i<30&&!hit;i++){await tk(1);hit=!!(bee.rx&&bee.rx.k==='attack'&&bee.rx.st&&bee.rx.st.mob===pg);}
      ok('honeybee_mc goes for the Pig the moment she holds Dan overhead',hit);V.getHNP().held=null;}
    else ok('the Pig fight starts for the reflex check',false);
    if(V.hnFightLeave)V.hnFightLeave('test');await tk(10);MP().dead.bomber=0;MP().open.a2=0;quiet();tp(0.5,-135.5,36.2);await tk(40);
    for(const a of BOTS)if(a.e)bodyTo(a,-2.5+BOTS.indexOf(a)*2,-130.5);await tk(20);}
  else skip('headliner reflexes (Brad snips, honeybee frees Dan)','P4 on its stub');
  /* ===== 12. save and load inside: DIM and every a.dim come back ===== */
  {const d=JSON.parse(JSON.stringify(V.snapshot('p5bots')));
    ok('the save carries the bots inside',d.dim==='puppet'&&d.bots&&d.bots.list.every(s=>s.dim==='puppet')&&d.mp&&d.mp.bots&&d.mp.bots.BunkerBrad);
    V.applySave(d);V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.setBrainMock(null);Object.assign(V.BRAIN,{mock:null,ok:false,off:true});await tk(60);
    const b2=V.AGENTS.slice();for(const a of b2)LB[a.name]=lbase(a);
    ok('reload inside: DIM and every bot are inside with bodies',V.getDim()==='puppet'&&b2.length===3&&b2.every(a=>a.dim==='puppet'&&a.online&&a.e&&!a.e.dead));
    ok('reload inside: the stash, the mem and the realm tables survive',b2.every(a=>MP().bots[a.name]&&MP().bots[a.name].stash)&&JSON.stringify(MP().bots.BunkerBrad.mem.home)===bradHome&&V.AG_HUNT.demolitionist==='pgbomber');}
  /* ===== 13. the escape: customs, the epilogue out of the Stage Door 2 s apart, the frog bites creep ===== */
  {const B2=V.AGENTS.slice(),b=n=>V.agByName(n);for(const a of B2)give(a,IT.PG_FELT,2);
    const danT=MP().trunks.Dan,danInv=JSON.stringify(C().blockEnts.get(danT).inv);
    V.mpExitNow({abandon:false});if(V.presOn())V.presClose(true);
    ok('Dan is out; the bots are held (frozen) for the epilogue',V.getDim()==='over'&&B2.every(a=>a.dim==='puppet'&&!a.e&&MP().bots[a.name].out===1));
    ok('customs: no purgatory item is left on any bot',B2.every(a=>a.inv.concat(a.armor).every(s=>!s||!DEFS[s.id].pg)));
    ok('the overworld tables are back exactly as they were (AG_GATHER, AG_HUNT, AG_JUNK, VG)',tabSnap()===s0);
    const out={},osig={},opos={},t0=V.getAG().t;let bite=false;
    for(let i=0;i<700;i++){await tk(1);for(const a of B2){if(a.dim==='over'&&out[a.name]==null){out[a.name]=V.getAG().t-t0;osig[a.name]=invSig(a);}
        if(out[a.name]!=null&&!opos[a.name]&&a.e)opos[a.name]={x:a.e.x,z:a.e.z,dead:a.dead};}
      if(C().mpDS.biteName==='xx_lilcreepah_xx'&&C().mpDS.biteT>0)bite=true;if(bite&&i>300)break;}
    const ts=['BunkerBrad','xx_lilcreepah_xx','honeybee_mc'].map(n=>out[n]);
    ok('the bots fall out of the Stage Door 2 s apart ('+ts.map(x=>x==null?'-':x.toFixed(2)).join(', ')+')',ts.every(x=>x!=null)&&Math.abs(ts[1]-ts[0]-2)<0.3&&Math.abs(ts[2]-ts[1]-2)<0.3);
    const dd=MP().door;
    ok('...right at the door, alive, with bodies',B2.every(a=>a.dim==='over'&&opos[a.name]&&!opos[a.name].dead&&Math.hypot(opos[a.name].x-dd.x-0.5,opos[a.name].z-dd.z-0.5)<2.5));
    ok('everyone has their own things back (ids, counts, durability, enchantments)',B2.every(a=>osig[a.name]===pre[a.name])||(()=>{for(const a of B2)if(osig[a.name]!==pre[a.name])console.log('  DIAG back '+a.name+': '+osig[a.name]+' vs '+pre[a.name]);return false;})());
    ok('their trunks are gone',B2.every(a=>!MP().trunks[a.name]&&!MP().bots[a.name].stash));
    ok('every ledger balances after the round trip (since the reload)',B2.every(a=>ledger(a,LB[a.name]).ok)||(()=>{for(const a of B2){const l=ledger(a,LB[a.name]);if(!l.ok)console.log('  DIAG ledger '+a.name+': '+l.why);}return false;})());
    ok('xx_lilcreepah_xx runs at Dan’s trunk and the frog bites him',bite);
    ok('...and he takes nothing from it',JSON.stringify(C().blockEnts.get(danT).inv)===danInv);
    ok('b(name) still resolves',!!b('creep'));}
  /* ===== 14. GR.botPurg off: v6.0 behaviour, the bots stay frozen at the door ===== */
  {V.GR.botPurg=false;V.GR.freezeMobs=true;quiet();const sigs={};for(const a of V.AGENTS)sigs[a.name]=invSig(a);
    V.mpEnterNow();await tk(80);
    ok('botPurg off: nobody follows Dan in, nothing is stripped, no bot trunk',V.getDim()==='puppet'&&V.AGENTS.every(a=>a.dim==='over'&&invSig(a)===sigs[a.name]&&!MP().trunks[a.name]));
    V.mpExitNow({abandon:true});if(V.presOn())V.presClose(true);await tk(80);
    ok('botPurg off: after the exit they are exactly as before',V.AGENTS.every(a=>a.dim==='over'&&invSig(a)===sigs[a.name]&&ledger(a,LB[a.name]).ok)&&tabSnap()===s0);
    V.GR.botPurg=true;V.GR.freezeMobs=false;}
});

/* the autopilot ladder (P2 real): a rig of resources by the Mark, then 20 game minutes of autopilot */
async function ladderRun(){const M=MP();quiet();
  /* a clean start for the ladder: everyone back by the Mark, fed, no remembered failures (earlier sections moved and killed them) */
  for(const a of V.AGENTS){if(a.dead||!a.e)continue;bodyTo(a,-2.5+V.AGENTS.indexOf(a)*2,-130.5);a.hunger=20;a.hp=20;a.pgSkip=null;a.pgRowF=null;a.offFail=null;a.offFails=0;}
  await step.tick(10);quiet();
  /* a generous rig within ~16 m of the hub can, on open ground at the Mark's level (the stub stage has no trees or kitchen; on P1's real
     stage it adds to what is there): 24 trees, a row of Countertops with two Burners, Stuffing, Wire Ore two blocks under the deck */
  const free=[],used=new Set();
  for(let r=6;r<=22&&free.length<90;r++)for(let k=0;k<r*8;k++){const x=Math.round(0.5+Math.sin(k/(r*8)*6.283)*r),z=Math.round(-135.5+Math.cos(k/(r*8)*6.283)*r);
    const id=x+','+z;if(used.has(id)||(x>=-5&&x<=5&&z>=-141&&z<=-131))continue;used.add(id);const t=V.surfaceTop(x,z);
    if(t>=33&&t<=37&&V.getBlock(x,t+1,z)===B.AIR&&V.getBlock(x,t+2,z)===B.AIR&&DEFS[V.getBlock(x,t,z)]&&DEFS[V.getBlock(x,t,z)].solid!==false)free.push([x,t,z]);}
  const take=n=>free.splice(0,Math.min(n,free.length));
  for(const [x,t,z] of take(24))for(let y=t+1;y<=t+6;y++)V.setBlock(x,y,z,y===t+1?B.PG_FOREARM:B.PG_SLEEVE);
  const cs=take(26);cs.forEach(([x,t,z],i)=>{V.setBlock(x,t+1,z,B.PG_COUNTER);if(i%6===0)V.setBlock(x,t+2,z,B.PG_BURNER);});   /* enough for three Hot Plates */
  for(const [x,t,z] of take(8))V.setBlock(x,t+1,z,B.PG_STUFFING);
  for(const [x,t,z] of take(30))V.setBlock(x,t-2,z,B.PG_WIREORE);
  const t0=M.clock,L=V.AGENTS.filter(a=>a.dim==='puppet');let snips=null;const trail={};for(const a of L)trail[a.name]=[];
  for(let i=0;i<24000&&!snips;i++){await step.tick(1);for(const a of L){if(!snips&&(V.invCount(a.inv,IT.PG_SNIPS)>0))snips={who:a.name,t:M.clock-t0};
      const n=a.notes[a.notes.length-1];const T=trail[a.name];if(n&&T[T.length-1]!==n){T.push(n);if(T.length>6)T.shift();}
      if(process.env.P5TRACE===a.name&&process.env.P5TRACEV&&i%150===0&&a.sk&&a.e){const st=a.sk.st||{};console.log('    v '+(M.clock-t0).toFixed(0)+'s '+a.sk.k+' @'+a.e.x.toFixed(1)+','+a.e.y.toFixed(1)+','+a.e.z.toFixed(1)+' st '+JSON.stringify(st,(k,v)=>typeof v==='object'&&v&&k&&!Array.isArray(v)&&k!=='tg'&&k!=='t'?'{..}':v).slice(0,260)+' path '+(a.path?a.path.length+'@'+a.pi:'-')+(a.path&&a.path[a.pi]?' node '+JSON.stringify(a.path[a.pi])+' below '+DEFS[V.getBlock(a.path[a.pi].x,a.path[a.pi].y-1,a.path[a.pi].z)].name+' at '+DEFS[V.getBlock(a.path[a.pi].x,a.path[a.pi].y,a.path[a.pi].z)].name+' head '+DEFS[V.getBlock(a.path[a.pi].x,a.path[a.pi].y+1,a.path[a.pi].z)].name+' feetblk '+DEFS[V.getBlock(Math.floor(a.e.x),Math.floor(a.e.y+0.05),Math.floor(a.e.z))].name+' sb '+(V.agScaffoldBlock?V.agScaffoldBlock(a):'?')+' gnd '+a.e.onGround+' vy '+a.e.vy.toFixed(1)+' ents '+V.entities.filter(en=>en!==a.e&&!en.dead&&Math.hypot(en.x-a.e.x,en.z-a.e.z)<1.5).map(en=>(en.bot||en.mt||en.type||'?')+'@'+en.x.toFixed(1)+','+en.y.toFixed(1)+','+en.z.toFixed(1)).join(';'):''));}
      if(process.env.P5TRACE===a.name){const sk=a.rx?'rx:'+a.rx.k+JSON.stringify(a.rx.a):a.sk?a.sk.k+JSON.stringify(a.sk.a):'-';
        if(sk!==a._tr){a._tr=sk;console.log('  TR '+(M.clock-t0).toFixed(0)+'s '+sk+' @'+(a.e?Math.round(a.e.x)+','+Math.round(a.e.y)+','+Math.round(a.e.z):'-')+' | '+(n||'').slice(0,120));
          if(/explore|gather\{"item":"laminate/.test(sk)&&a.e){const e=a.e,fx=Math.floor(e.x),fy=Math.floor(e.y+0.05),fz=Math.floor(e.z),rows=[];
            for(let dy=3;dy>=-1;dy--){let r='y'+(fy+dy)+': ';for(let dz=-2;dz<=2;dz++){for(let dx=-2;dx<=2;dx++){const id=V.getBlock(fx+dx,fy+dy,fz+dz);r+=id===0?'.':id===B.PG_DECK?'D':id===B.PG_FOAM?'F':id===-1?'?':'#';}r+=' ';}rows.push(r);}
            console.log('    scaf '+V.agScaffoldCount(a)+' junk '+JSON.stringify(V.AG_JUNK)+' onGround '+e.onGround+'\n    '+rows.join('\n    '));}}}}}
  if(!snips&&process.env.P5DIAG!=='0')for(const a of L)console.log('  DIAG ladder '+a.name+' skip '+JSON.stringify(a.pgSkip||{})+' step '+JSON.stringify(V.purgNextStep(a).row?V.purgNextStep(a).row.id:V.purgNextStep(a))+'\n    '+trail[a.name].join('\n    '));
  const bad=L.map(a=>{const l=ledger(a);return l.ok?null:a.name+': '+l.why;}).filter(Boolean).join('; ');
  const smelted=L.some(a=>(a.led.src.smelt||0)>0);
  return {snips:!!snips&&snips.t<=1200&&smelted,bad,txt:snips?snips.who+' at '+(snips.t/60).toFixed(1)+' min, smelted '+smelted:'not reached; '+L.map(a=>a.name+' '+a.inv.filter(Boolean).map(s=>DEFS[s.id].name+'x'+s.count).join(',')).join(' | ')};}
