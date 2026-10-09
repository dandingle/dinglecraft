/* speedrun.js (P0 frame, PZ route): the 60-minute speed-run harness (the purgatory build plan section 9.1). Node, headless,
   deterministic (seeded Math.random, fake clock, 40 ms frames).
   node tests/pilot/speedrun.js --fast|--full [--to=auto|bomber|bigpig|bigfrog] [--bots] [--gauntlet] [--seed=1337] [--mobs] [-v]
   The pilot (qa/pilot.js) plays with honest primitives only and qa/nav.js walks it there: A* over standing cells, followed with
   movement keys, sprint, jump and look (no teleport), digging where the route needs it. The honesty ledger fails any free item
   and any jump that is not a knockback, a scripted throw, a respawn or a cutscene. Every main tick of PURG_LADDER is a leg, in
   order: the Woods (a tree goes limp, Felt, Rods, the hub can's Felt tools, Foam in a trench wall, LARP tools, an Arm Hole,
   Eyeball Lamps, the Foam Bat), the Kitchen (Laminate, a Burner Coil, the Hot Plate, Wire Ore down a sink drain, hangers
   smelted on the Burners, the Wire tier at Booth 1, Det Cord, Foam Padding, pies), THE DEMOLITIONIST (P4's qa/boss_scripts.js),
   Plane 3 (Tesla copper, the Lab Bench, Sequin Ore under the rot, the Yeti's fur, Satin, mirror shards, the Lab crafts),
   THE PIG, the Swamp (Pincushion pins, the Staple Gun and Staples, Felt Flies), THE FROG (12b inside the fight), and THE
   STRIKE out through the House to the EXIT doors. --to=auto runs as far as the build can go: with any of P1-P4 on its stub
   (V.pgStubs) the route is door -> ritual -> strip -> Mark -> Programme -> exit; a leg the pilot cannot play with this build is
   PENDING (never passed): under --to=auto that ends the run without failing it, under --to=<boss> it fails.
   --fast (gate) and --full (PZ, before release) play the same honest route; --fast stops after the last registered headliner
   (or the Strike), --full also asserts the expert-pilot bounds (bible 13): total <= 45 min of MP.clock, Woods -> Felt tools
   <= 5 min, Sequin dig <= 6 min. --mobs turns ambient spawning on (boot.world turns it off). Writes speedrun_<mode>.json to
   out/pilot/ (split repo: never into the tree), plus a markdown leg table on stdout.
   Dev aids (never in the gate): --ckpt=<dir> saves a snapshot after every leg, --from=<save.json> --start=<leg> resumes there. */
'use strict';
const path=require('path'),fs=require('fs');
const ARG=process.argv.slice(2),flag=k=>ARG.includes('--'+k),opt=(k,d)=>{const a=ARG.find(x=>x.startsWith('--'+k+'='));return a?a.slice(k.length+3):d;};
const MODE=flag('full')?'full':'fast',TO=opt('to','auto'),SEED=+opt('seed','1337'),VERB=ARG.includes('-v');
const CKPT=opt('ckpt',''),FROM=opt('from',''),START=opt('start','');
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
const V=boot({seed:SEED,clock:true});
const step=boot.stepper(500000),pilot=require('./pilot.js')(V,step);
const B=V.B,IT=V.IT,MPC=V.MPC,MP=()=>V.getMP(),D=V.DEFS;
const LOGS=[];const log=m=>{const s='['+(MP().clock/60).toFixed(1)+'m] '+m;LOGS.push(s);if(VERB)console.log('  '+s);};
const nav=require('./nav.js')(V,pilot,{log});
let BS=null;try{BS=require('./boss_scripts.js');}catch(e){}
const LEGS=[];let pending=null;
const R=require('./route.js')(V,pilot,{nav,BS,log,flag,MODE,VERB,env:process.env});
const {ROUTE,ST,DMG,invStr,have}=R;
function leg(name,fn){const t0=pilot.S.frames,c0=MP().clock;let r=false,err=null;R.begin(name);
  try{r=fn();}catch(e){err=e;if(VERB&&!/budget/.test(e.message))console.log(e.stack);}R.end();
  const L={leg:name,ok:r===true,pending:r==='pending',game_s:+((pilot.S.frames-t0)*0.04).toFixed(1),clock_s:+(MP().clock-c0).toFixed(1),err:err?String(err.message).slice(0,160):null};
  LEGS.push(L);if(L.pending)pending=pending||name;log('leg '+name+' -> '+(L.pending?'PENDING':L.ok?'ok':'FAIL')+' ('+L.clock_s+' s)'+(L.err?' '+L.err:'')+(VERB?'  inv: '+invStr():''));
  if(CKPT&&L.ok)try{fs.mkdirSync(CKPT,{recursive:true});fs.writeFileSync(path.join(CKPT,'ck_'+name+'.json'),JSON.stringify(V.snapshot('speedrun')));}catch(e){}
  return L;}

boot.run(async()=>{
  const stubs=V.mpInfo().stubs,a0=/[1234]/.test(stubs);
  ok('speedrun '+MODE+' --to='+TO+' on '+(a0?'the A0 route (stubs: '+stubs+')':'the full ladder'),true);
  if(FROM){const j=fs.readFileSync(FROM,'utf8');await window.storage.set('vxw:speedrun',j);await V.loadWorldByName('speedrun');V.GR.mobSpawn=flag('mobs');
    pilot.allowJump('load',40);pilot.frame(40);log('resumed from '+FROM+' in '+V.getDim());}
  else{
    leg('world',()=>{boot.world(V,'speedrun',String(SEED),null);if(flag('mobs'))V.GR.mobSpawn=true;pilot.allowJump('new world',4);pilot.frame(160);return V.getDim()==='over';});
    if(flag('bots')){V.GR.bots=true;V.agJoinAll(false);for(let i=0;i<40;i++){pilot.expect(V.IT.PCOMPASS,1);pilot.frame(1);}}   /* the overworld hands Dan a Player Compass when the bots join */
    leg('door',()=>{const d=V.mpDoorHere();pilot.allowJump('door stamped',2);pilot.frame(2);
      const f=[d.x+0.5+d.f[0]*3,d.z+0.5+d.f[1]*3];return pilot.walkTo(f[0],f[1],{tol:1.0,max:30});});
    leg('ritual',()=>{const d=MP().door;pilot.emptyHand();pilot.lookAt(d.x+0.5,d.y+1,d.z+0.5);pilot.use();pilot.lookAt(d.x+0.5,d.y+1,d.z+0.5);pilot.use();
      return V.mpInfo().cut&&!MP().inside;});                                  /* the strip waits for the black at t 4.1 */
    leg('cutscene',()=>{pilot.frame(25);pilot.allowJump('setDim (entry)',40);pilot.space(2);pilot.frame(30);return V.getDim()==='puppet'&&!V.mpInfo().cut&&MP().inside&&!!MP().trunks.Dan;});
    leg('mark',()=>{const P=V.P;return Math.hypot(P.x-0.5,P.z+135.5)<3&&P.inv[0]&&P.inv[0].id===IT.PG_PROGRAMME;});}
  const H=V.getHN();const last=TO==='auto'?(['bigfrog','bigpig','bomber'].find(n=>H['pg'+n])||null):TO;
  const strike=typeof V.hnStrikeStart==='function'||!!(V.getHN&&H.pgbigfrog);
  if(!a0&&last){let on=!START;
    for(const [id,fn] of ROUTE){if(!on){if(id===START)on=true;else continue;}
      const L=leg(id,fn);if(!L.ok)break;if(MODE==='fast'&&id===last&&!(last==='bigfrog'&&strike))break;}}
  else skip('the ladder legs',a0?'packages on their stubs: '+stubs:'no headliner registered in HN_NAMES yet');
  if(V.getDim()==='puppet')leg('exit',()=>{pilot.allowJump('setDim (exit)',40);
    V.mpExitNow({abandon:!(last&&MP().dead.bigfrog)});pilot.frame(10);if(V.presOn())V.presClose(true);return V.getDim()==='over';});
  const R=pilot.result();
  for(const L of LEGS){if(L.pending){if(TO==='auto')skip('leg '+L.leg,'PENDING: the pilot cannot play it with this build yet');else ok('leg '+L.leg+' (PENDING)',false);}
    else ok('leg '+L.leg+' completes ('+L.clock_s+' s)'+(L.err?' ERR '+L.err:''),L.ok);}
  ok('zero free items and no illegal jumps'+(R.fails.length?' ('+R.fails.slice(0,3).join('; ')+')':''),R.fails.length===0);
  const tot=MP().clock;ok('total MP.clock '+(tot/60).toFixed(1)+' min (expert bound 45)',tot<=45*60);
  /* the pacing table (bible 13, first-timer minutes) folded onto the legs; an expert segment may take at most 1.5x its share of the
     45-minute expert bound */
  const SEG=[['entry',3,['world','door','ritual','cutscene','mark','read','apron','beacon']],['Woods: Felt tools',4,['sleeve','forearm','felt','rod','floppy','shears','slapper']],
    ['Woods: Foam, lamps, bat',5,['foam','larp','armhole','lamp','bat']],['Kitchen: Hot Plate, Wire, smelting',7,['hotplate','wire','hpload','dough','smelt']],
    ['Booth 1: Wire tier',3,['snips','rapier','hpick','cord','fpad','pie']],['THE DEMOLITIONIST',8,['bomber']],['Plane 3: Sequin tier',11,['arch2','bench','satin','shard','sequin','shag','labbench','mitt','mirror']],
    ['THE PIG',7,['bigpig']],['Swamp: Frog kit',5,['arch3','pins','staple','staples','fly']],['THE FROG',7,['bigfrog','elbow']],['THE STRIKE',3,['escape']]];
  const segRows=[];for(const [nm,mins,ids] of SEG){const ls=LEGS.filter(L=>ids.includes(L.leg));if(!ls.length)continue;const s=ls.reduce((a,L)=>a+L.clock_s,0);
    const bound=1.5*mins/63*45*60;segRows.push({seg:nm,min:+(s/60).toFixed(1),table:mins,bound_min:+(bound/60).toFixed(1),over:s>bound});}
  if(MODE==='full'&&!pending){const w=LEGS.filter(L=>['sleeve','forearm','felt','rod','floppy','shears','slapper'].includes(L.leg)).reduce((a,L)=>a+L.clock_s,0),sq=(LEGS.find(L=>L.leg==='sequin')||{}).clock_s||0;
    ok('Woods -> Felt tools '+(w/60).toFixed(1)+' min (bound 5)',w<=300);ok('Sequin dig '+(sq/60).toFixed(1)+' min (bound 6)',sq<=360);
    for(const r of segRows)if(r.over)console.log('  OVER: '+r.seg+' '+r.min+' min (expert bound '+r.bound_min+')');}
  const out={segments:segRows,mode:MODE,bots:!!flag('bots'),to:TO,seed:SEED,stubs,frames:R.frames,game_s:R.seconds,clock_s:+tot.toFixed(1),deaths:ST.deaths,eats:ST.eats,fights:ST.fights,legs:LEGS,fails:R.fails,pending,damage:DMG,log:LOGS.slice(-400),at:'PZ route'};
  const dir=boot.P.outDir('pilot');   /* split repo: out/pilot/ */
  try{fs.writeFileSync(path.join(dir,'speedrun_'+MODE+(flag('bots')?'_bots':'')+(SEED!==1337?'_s'+SEED:'')+'.json'),JSON.stringify(out,null,1)+'\n');}catch(e){}
  console.log('  | leg | ok | game s | clock s |\n  |---|---|---|---|\n'+LEGS.map(L=>'  | '+L.leg+' | '+(L.pending?'PENDING':L.ok?'yes':'NO')+' | '+L.game_s+' | '+L.clock_s+' |').join('\n'));
  console.log('  | segment | expert min | first-timer table min | expert bound min |\n  |---|---|---|---|\n'+segRows.map(r=>'  | '+r.seg+' | '+r.min+' | '+r.table+' | '+r.bound_min+(r.over?' OVER':'')+' |').join('\n'));
  console.log('  deaths '+ST.deaths+', meals '+ST.eats+', scuffles '+ST.fights+', MP.clock '+(tot/60).toFixed(1)+' min');
  console.log('  damage taken: '+Object.entries(DMG).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+v.toFixed(0)).join(', '));
});
