/* p2_smoke.js (P2, gate x2): things you hold and make, in a real purgatory (the purgatory build plan section 5.2 + the audit's
   additions). Hand recipes and the ??? reveal; the Bin queue, volley, duck, never-below-1, batch pitching machine, Lost Property
   thrower and the Programme return; the Empty Can move-in; Lab Bench demos, the Panic Meter and the bolt, the Staple Gun block; the
   Transmogrifier (Gauntlet out of the chute after 3 s, the cooldown); Hot Plate and Burner smelting (no pickup while sizzling, the
   pop toward the nearest player, the smelt tick, the lights); raw food, Stuffing's slow eat, tomatoes, the pie, the Live Chicken;
   the soup slurp; Det Cord conduction (riser step, plate feed, one-cell gap) and the Demolitionist's Fuse; Charges (stick, Plunger blast-mining,
   protected volumes, 12 cap, the one that falls off Dan); the Pig Mitt window, the bite and the throw that mines nothing; the
   Vanity Mirror bounce; staples; Boa glide; Stiletto; UNHAND; Chop; the Felt Fly; armour perks; the walk-speed blocks, Stuffing and
   Dough landings; the Programme item; the Floppy Pick bend; the lamp torch; loot trunks; the trunk climb; the felt mitt; souvenirs
   in the overworld. Built on whatever P1 world is present: every rig clears its own site first. */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
const V=boot({});
const step=boot.stepper(500000),C=V.pgCore(),C2=V.p2Core(),B=V.B,IT=V.IT,D=V.DEFS;
const MP=()=>V.getMP(),S=()=>V.piS(),P=()=>V.P;
function tp(x,z,y){V.forceChunksNear(x,z);const p=V.P;p.x=x+0.5;p.z=z+0.5;p.y=y;p.vx=p.vy=p.vz=0;p.fallD=0;step(25);}
function aim(x,y,z){const p=V.P,dx=x-p.x,dy=y-(p.y+p.eyeY),dz=z-p.z;p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(dy,Math.hypot(dx,dz));}
function rclick(){V.MB.r=true;step(1);V.MB.r=false;step(2);}
function hold(id,count,extra){const p=V.P;p.inv[8]=id?Object.assign({id,count:count||1},extra||{}):null;p.sel=8;V.refreshHand();}
const inv=id=>V.invCount(V.P.inv,id);
const drops=()=>V.entities.filter(e=>e.t==='drop'&&!e.dead);
const mobs=mt=>V.entities.filter(e=>e.t==='mob'&&!e.dead&&e.mt===mt);
function untilIdle(max){for(let i=0;i<(max||120)&&V.piVolleyBusy();i++)step(1);step(30);}
function clearInv(){const p=V.P;for(let i=1;i<36;i++)p.inv[i]=null;}
function pickupAll(){for(const e of drops())if(Math.hypot(e.x-V.P.x,e.z-V.P.z)<12){e.x=V.P.x;e.z=V.P.z;e.y=V.P.y+0.6;e.vx=e.vy=e.vz=0;e.age=Math.max(e.age,0.6);}step(12);}
const SX=24,SZ=-112,Y0=40;            /* the test site: Woods, between two trench rows, far from every protected volume */
/* between sections: re-lay the site, kill the world's hostiles near it and fill any Arm Hole close enough for a tethered puppet to
   reach the rig (P1's real Woods has them), heal Dan */
function refloor(){site(SX,SZ,9);const p=V.P;
  for(let x=SX-18;x<=SX+18;x++)for(let z=SZ-18;z<=SZ+18;z++)for(let y=Y0-8;y<=Y0;y++)if(V.getBlock(x,y,z)===B.PG_ARMHOLE)V.setBlock(x,y,z,B.PG_DECK);
  for(const e of V.entities)if(e.t==='mob'&&!e.dead&&!e.bot&&Math.hypot(e.x-p.x,e.z-p.z)<48){const T=V.MOBT[e.mt]||{};if(T.prop||T.npc||e.mt==='pgttest'||e.mt==='pgtcatch')continue;
    if(/^pg/.test(e.mt))V.pgCore().removeEnt(e);}
  p.hp=20;p.hurtT=0;step(2);}
function site(x0,z0,r){for(let x=x0-r;x<=x0+r;x++)for(let z=z0-r;z<=z0+r;z++){V.setBlock(x,Y0,z,B.PG_DECK);for(let y=Y0+1;y<=Y0+22;y++)if(V.getBlock(x,y,z))V.setBlock(x,y,z,0);}}
/* stationary test target */
V.MOBT.pgttest={hp:60,hw:0.3,h:1.6,spd:0,body:'#888888',head:'#888888',legc:'#666666',pmob:1};
V.PREG.brain.pgttest=(e,dt)=>{if(e.fix){e.x=e.fix[0];e.y=e.fix[1];e.z=e.fix[2];}e.vx=e.vy=e.vz=0;if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);};
function target(x,y,z,hp){V.spawnMob('pgttest',x,y,z);const e=V.entities[V.entities.length-1];e.fix=[x,y,z];e.hp=hp||60;return e;}
/* a free target: its brain never touches its velocity (knockback measurements) */
V.MOBT.pgtfree={hp:60,hw:0.3,h:1.6,spd:0,body:'#888888',head:'#888888',legc:'#666666',pmob:1};
V.PREG.brain.pgtfree=(e,dt)=>{if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);};
/* a ballistic catchable */
V.MOBT.pgtcatch={hp:20,hw:0.3,h:0.6,spd:0,body:'#f2a6c1',head:'#f2a6c1',legc:'#e08cb0',pmob:1,pcatch:1};
V.PREG.brain.pgtcatch=(e,dt)=>{if(e.pheld)return;e.vy-=24*0.25*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);};
V.PREG.proj.ptest={r:0.35,g:0,life:4,mesh:()=>null,hit:()=>true,land:()=>true};
V.PREG.proj.ptpig={r:0.35,g:0.25,life:5,mesh:()=>null,hit:()=>true,land:()=>true};   /* P4's protocol: a thrown pig is a pproj with e.pcatch */

boot.run(async()=>{
  if(boot.stubbed('2')){skip('every P2 smoke check','P2 is on its stub');return;}
  boot.world(V,'p2smoke','1337',step);V.GR.mobSpawn=false;
  V.mpEnterNow();step(40);
  ok('purgatory entered (P2 suite runs inside)',V.getDim()==='puppet'&&V.P.inv[0]&&V.P.inv[0].id===IT.PG_PROGRAMME);
  V.P.mode='s';tp(SX,SZ,Y0+1);site(SX,SZ,9);step(20);tp(SX,SZ,Y0+1.05);

  /* ===== 1. hand recipes (2x2) and the ??? reveal ===== */
  {clearInv();const p=P();p.inv[1]={id:B.PG_SLEEVE,count:4};step(8);
    V.openModal('inv');const rs=C.MODAL.rset;
    ok('in purgatory the E grid reads the hand set only (H1-H10, no Bin recipe)',rs!==V.RECIPES&&rs.every(r=>r.st==='hand')&&rs.length===9);
    V.closeModal(true);
    ok('Felt Sleeve -> 4 Felt in the hands',V.piCraftSeam(IT.PG_FELT,'inv')&&inv(IT.PG_FELT)===4);
    ok('2 Felt -> 4 Puppet Rods in the hands',V.piCraftSeam(IT.PG_ROD,'inv')&&inv(IT.PG_ROD)===4&&inv(IT.PG_FELT)===2);
    ok('the Floppy Pick cannot be made in the hands',!V.piCraftSeam(IT.PG_FLOPPY,'inv'));
    const H4=V.getPRECIPES().find(r=>r.rid==='H4');delete MP().seenIng[IT.PG_GOOGLIES];
    ok('??? until the key ingredient has been held inside',!V.piRevealed(H4));
    p.inv[6]={id:IT.PG_GOOGLIES,count:2};step(10);
    ok('...revealed once Dan has held Googly Eyes (MP.seenIng)',V.piRevealed(H4)&&MP().seenIng[IT.PG_GOOGLIES]===1);
    p.inv[7]={id:IT.PG_PLASTICEYE,count:1};step(8);
    ok('a Plastic Eye on a rod -> 4 Eyeball Lamps',V.piCraftSeam(B.PG_LAMP,'inv')&&inv(B.PG_LAMP)===4);
    const H9=V.getPRECIPES().find(r=>r.rid==='H9');MP().dead.bomber=0;MP().unlock={};
    ok('the Charge recipe is locked (???) until the Demolitionist dies',!V.piRevealed(H9)&&!V.piRecipeSet('inv').includes(H9));
    MP().dead.bomber=1;MP().seenIng[B.PG_CORD]=1;step(10);
    ok('...and unlocked by P2\'s tick once MP.dead.bomber is set',MP().unlock[IT.PG_CHARGE]===1&&V.piRevealed(H9)&&V.piRecipeSet('inv').includes(H9));
    MP().dead.bomber=0;}

  /* ===== 2. the Bin: materials to the cursor, the big things queued and hurled on close ===== */
  const CAN=[SX+2,Y0+1,SZ];V.setBlock(CAN[0],CAN[1],CAN[2],B.PG_CAN);step(4);
  {clearInv();const p=P();p.hunger=15;p.hp=20;p.inv[1]={id:IT.PG_FELT,count:3};p.inv[2]={id:IT.PG_ROD,count:2};step(5);aim(CAN[0]+0.5,CAN[1]+0.5,CAN[2]+0.5);
    const ok1=V.piCraftSeam(IT.PG_FLOPPY,'pcan');
    ok('a Floppy Pick at the can: taken, but it does not reach the cursor or the inventory',ok1&&inv(IT.PG_FLOPPY)===0&&V.piVolleyBusy());
    let minHp=20,hit=false;for(let i=0;i<60;i++){step(1);minHp=Math.min(minHp,p.hp);if(S().stats.volleyHits>0)hit=true;}
    ok('closing the lid hurls it at Dan\'s head: 1 damage',hit&&minHp===19);
    pickupAll();ok('...and it is his (picked up)',inv(IT.PG_FLOPPY)===1);
    p.hp=1;p.inv[1]={id:IT.PG_FELT,count:3};p.inv[2]={id:IT.PG_ROD,count:2};step(3);
    V.piCraftSeam(IT.PG_PSHEARS,'pcan');let lo=1;for(let i=0;i<60;i++){step(1);lo=Math.min(lo,p.hp);}pickupAll();
    ok('the thing in the Bin never takes Dan below 1 HP',lo>=1&&p.hp>=1&&inv(IT.PG_PSHEARS)===1);
    p.hp=20;
    /* duck: sneaking at the close sends it over his head, behind him */
    p.inv[1]={id:IT.PG_FELT,count:3};p.inv[2]={id:IT.PG_ROD,count:2};delete MP().ticks.duck;V.KEY.ShiftLeft=true;step(3);
    const h0=S().stats.volleyHits;V.piCraftSeam(IT.PG_FSCOOP,'pcan');const hp0=p.hp;let behind=false;
    for(let i=0;i<50;i++){step(1);for(const e of drops())if(e.st.id===IT.PG_FSCOOP){const fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw);if((e.x-p.x)*fx+(e.z-p.z)*fz<-1)behind=true;}}
    V.KEY.ShiftLeft=false;step(2);
    ok('duck: sneak while closing and it sails over and lands behind (no hit, page 4 duck tick)',MP().ticks.duck===1&&S().stats.volleyHits===h0&&p.hp>=hp0&&behind);
    pickupAll();ok('...the ducked stack is still Dan\'s to pick up (owned by Dan for 60 s)',inv(IT.PG_FSCOOP)===1);
    /* shift-click batch: the pitching machine */
    V.openModal('pcan',V.bkey?V.bkey(CAN[0],CAN[1],CAN[2]):C.bkey(CAN[0],CAN[1],CAN[2]));const G=C.MODAL.grid;
    G[1]={id:IT.PG_FELT,count:2};G[4]={id:IT.PG_FELT,count:2};G[7]={id:IT.PG_ROD,count:2};      /* Sock Slapper x2 (F/F/R) */
    const rs=C.MODAL.slots.find(s=>s.kind==='result');C2.takeResult(rs,true);
    const q=V.blockEnts.get(C.bkey(CAN[0],CAN[1],CAN[2]));
    ok('shift-take queues every stack the grid makes (the can\'s block entity holds the queue)',q&&q.t==='pcan'&&q.q.length===2);
    const v0=S().stats.volleys;V.closeModal(true);untilIdle(120);pickupAll();
    ok('...and all of it is hurled on close (slappers '+inv(IT.PG_SLAPPER)+', volleys '+(S().stats.volleys-v0)+')',inv(IT.PG_SLAPPER)===2&&S().stats.volleys===v0+1);
    /* Lost Property: the same thrower at 0.2 s; materials do no damage */
    clearInv();p.hp=15;p.hunger=15;V.pcanVolley([{id:IT.PG_FELT,count:5},{id:IT.PG_ROD,count:3}],CAN,'Dan',{rate:0.2});untilIdle(80);pickupAll();
    ok('Lost Property throws every stack back; materials do not hurt',inv(IT.PG_FELT)===5&&inv(IT.PG_ROD)===3&&p.hp===15);
    /* a lost Programme comes back from the next can closed */
    p.inv[0]=null;step(5);V.openModal('pcan',C.bkey(CAN[0],CAN[1],CAN[2]));V.closeModal(true);untilIdle(60);pickupAll();
    ok('no Programme: the next can closed throws a fresh copy at Dan',inv(IT.PG_PROGRAMME)===1);
    const pi=p.inv.findIndex(s=>s&&s.id===IT.PG_PROGRAMME);if(pi>0){p.inv[0]=p.inv[pi];p.inv[pi]=null;}
    /* a boot out of the lid (bots crafting at the can, xx_lilcreepah_xx landing on it): no damage, a real knockback */
    p.hp=20;p.hurtT=0;p.vx=p.vz=0;const bt=V.piCanBoot(p,CAN);let kv=0;for(let i=0;i<12;i++){step(1);kv=Math.max(kv,Math.hypot(p.vx,p.vz));}
    ok('piCanBoot: a boot flies out of the lid at the target: knockback, no damage',!!bt&&bt.dead&&kv>2&&p.hp===20);
    p.hunger=20;}

  /* ===== 3. the Empty Can moves in after 5 s ===== */
  {clearInv();const p=P();p.inv[1]={id:IT.PG_FOAMCHUNK,count:4};step(5);
    ok('4 Foam Chunks -> an Empty Can (the Bin block) in the hands',V.piCraftSeam(B.PG_CAN,'inv')&&inv(B.PG_CAN)===1);
    const t=[SX-3,Y0,SZ+2];hold(B.PG_CAN,1);aim(t[0]+0.5,t[1]+1,t[2]+0.5);rclick();
    const placed=V.getBlock(t[0],t[1]+1,t[2])===B.PG_CAN;
    V.PREG.interact.pcan({x:t[0],y:t[1]+1,z:t[2]},D[B.PG_CAN]);
    ok('a placed can is empty: nobody home for 5 s (it will not open; piCanReady false)',placed&&!C.MODAL.kind&&!(typeof V.piCanReady==='function'&&V.piCanReady(t[0],t[1]+1,t[2])));
    step(135);V.PREG.interact.pcan({x:t[0],y:t[1]+1,z:t[2]},D[B.PG_CAN]);
    ok('...after 5 s something moves into the Bin and it opens (piCanReady true)',C.MODAL.kind==='pcan'&&(typeof V.piCanReady!=='function'||V.piCanReady(t[0],t[1]+1,t[2])));V.closeModal(true);
    const c0=inv(B.PG_CAN);hold(IT.PG_FLOPPY,1,{dur:48});aim(t[0]+0.5,t[1]+1.5,t[2]+0.5);V.MB.l=true;for(let i=0;i<120&&V.getBlock(t[0],t[1]+1,t[2])===B.PG_CAN;i++)step(1);V.MB.l=false;step(3);pickupAll();
    ok('break a can and it drops as itself: you can carry him with you',V.getBlock(t[0],t[1]+1,t[2])!==B.PG_CAN&&inv(B.PG_CAN)===c0+1);hold(null);}

  /* ===== 4. the Lab Bench: the Lab Rat demos, the Panic Meter, the bolt, the staple block ===== */
  const BEN=[SX-2,Y0+1,SZ-2];V.setBlock(BEN[0],BEN[1],BEN[2],B.PG_BENCH);step(3);
  {clearInv();const p=P();MP().squeak=0;p.hp=20;
    p.inv[1]={id:IT.PG_SEQUIN,count:3};p.inv[2]={id:IT.PG_DRUMSTICK,count:1};p.inv[3]={id:IT.PG_ROD,count:1};step(8);
    const g0=V.getMPF().giveLog.length;const r=V.piCraftSeam(IT.PG_DISCO,'plab');
    ok('a lab craft is demonstrated first: nothing appears at once',r&&inv(IT.PG_DISCO)===0&&MP().squeak>=0.99);
    step(30);ok('...still demonstrating at 1.2 s',inv(IT.PG_DISCO)===0);
    step(30);ok('...then the item appears (through mpGive, src craft)',inv(IT.PG_DISCO)===1&&V.getMPF().giveLog.slice(g0).some(g=>g.id===IT.PG_DISCO&&g.src==='craft'));
    ok('no Lab Rat in reach of the demo: Dan takes no damage'+(V.MOBT.pgratb?'':' (P3 stub: no pgbkr)'),p.hp===20);
    /* the Staple Gun adds 3 and staples the Lab Rat to the wall for 6 s */
    p.inv[1]={id:IT.PG_PINS,count:3};p.inv[2]={id:IT.PG_COPPER,count:1};p.inv[3]={id:IT.PG_WIRE,count:1};p.inv[4]={id:IT.PG_ROD,count:1};step(8);
    const m0=MP().squeak;V.piCraftSeam(IT.PG_STAPLER,'plab');
    ok('the Staple Gun adds 3 to the Panic Meter',MP().squeak>=m0+2.9);step(56);
    ok('...comes out after its demo',inv(IT.PG_STAPLER)===1);
    p.inv[1]={id:IT.PG_SEQUIN,count:1};p.inv[2]={id:IT.PG_ROD,count:2};step(6);
    ok('while the Lab Rat hangs stapled (6 s) the bench refuses lab crafts',!V.piCraftSeam(IT.PG_GSCOOP,'plab'));
    step(160);ok('...and works again afterwards',V.piCraftSeam(IT.PG_GSCOOP,'plab'));step(56);
    const mm=MP().squeak;step(100);ok('the Panic Meter decays 1 per 8 s',MP().squeak<mm-0.4&&MP().squeak>mm-0.6);
    MP().squeak=11.5;p.inv[1]={id:IT.PG_SEQUIN,count:1};p.inv[2]={id:IT.PG_ROD,count:2};step(4);V.piCraftSeam(IT.PG_GSCOOP,'plab');step(4);
    ok('at 12 the Lab Rat bolts and the bench is disabled',!!S().bolt&&MP().squeak<1);
    step(56);p.inv[1]={id:IT.PG_SEQUIN,count:1};p.inv[2]={id:IT.PG_ROD,count:2};step(4);
    ok('...no lab craft while he is gone',!V.piCraftSeam(IT.PG_GSCOOP,'plab'));
    S().bolt.until=MP().clock+0.3;step(15);ok('...he comes back by himself after 40 s',!S().bolt);
    /* a bench Dan places summons its own the Lab Rat (P3's pmNpcSpawn), who walks in and gets demonstrated on; 2 m costs 2 HP */
    const PB=[SX-3,Y0,SZ-3];hold(B.PG_BENCH,1);aim(PB[0]+0.5,PB[1]+1,PB[2]+0.5);rclick();hold(null);const pk=C.bkey(PB[0],PB[1]+1,PB[2]);
    ok('a placed Lab Bench is tracked for its Lab Rat',V.getBlock(PB[0],PB[1]+1,PB[2])===B.PG_BENCH&&!!S().benches[pk]);
    if(V.MOBT.pgratb&&!boot.stubbed('3')){const bk=S().benches[pk].e;step(205);
      ok('...a Lab Rat walks in from 12 m to the bench (pmNpcSpawn)',!!bk&&!bk.dead&&Math.hypot(bk.x-PB[0]-0.5,bk.z-PB[2]-0.5)<3.5);
      tp(Math.floor(bk.x),Math.floor(bk.z)+1,Y0+1.05);p.hp=20;p.hurtT=0;p.hunger=15;p.inv[1]={id:IT.PG_SEQUIN,count:1};p.inv[2]={id:IT.PG_ROD,count:2};step(4);
      const okc=V.piCraftSeam(IT.PG_GSCOOP,'plab');step(56);ok('...standing within 2 m of the Lab Rat during a demo costs 2 HP (hp '+p.hp+', crafted '+okc+', d '+Math.hypot(bk.x-p.x,bk.z-p.z).toFixed(2)+')',p.hp===18);
      p.hunger=20;tp(SX,SZ,Y0+1.05);}
    else skip('placed-bench Lab Rat walk-in and the 2 m demo hurt','P3 is on its stub (no pgbkr / pmNpcSpawn)');}

  refloor();
  /* ===== 5. the Transmogrifier ===== */
  {clearInv();const p=P();const TS=[SX+5,Y0+1,SZ+5];S().spots={trans:[TS]};step(35);
    const te=mobs('pgtrans');ok('the Transmogrifier prop appears at its Labs HQ post',te.length===1&&Math.abs(te[0].x-TS[0]-0.5)<0.01);
    tp(TS[0]-1,TS[2]-2,Y0+1.05);
    p.inv[1]={id:IT.PG_KNUCKLE,count:4};p.inv[2]={id:IT.PG_FUSE,count:1};p.inv[3]={id:IT.PG_PEARLS,count:1};p.inv[4]={id:IT.PG_STILETTO,count:1,dur:600};step(8);
    V.PREG.mobUse.pgtrans(te[0]);ok('right-clicking its console opens the Transmogrifier',C.MODAL.kind==='ptrans');V.closeModal(true);
    ok('Knuckles x4 + Lit Fuse + Pearl Necklace + The Stiletto: the machine runs',V.piCraftSeam(IT.PG_GAUNTLET,'ptrans')&&inv(IT.PG_KNUCKLE)===0&&!drops().some(e=>e.st.id===IT.PG_GAUNTLET));
    step(70);ok('...3 s of lightning, nothing yet',!drops().some(e=>e.st.id===IT.PG_GAUNTLET));
    step(10);const gd=drops().find(e=>e.st.id===IT.PG_GAUNTLET);
    ok('...then the Gauntlet drops out of the chute, still warm (owned by Dan)',!!gd&&gd.pown==='Dan'&&Math.hypot(gd.x-te[0].x,gd.z-te[0].z)<3);
    pickupAll();ok('...and it is his',inv(IT.PG_GAUNTLET)===1);
    p.inv[1]={id:IT.PG_KNUCKLE,count:4};p.inv[2]={id:IT.PG_FUSE,count:1};p.inv[3]={id:IT.PG_PEARLS,count:1};p.inv[4]={id:IT.PG_STILETTO,count:1,dur:600};step(6);
    ok('no Lab Rat for 30 s: the machine will not run again',!V.piCraftSeam(IT.PG_GAUNTLET,'ptrans')&&inv(IT.PG_KNUCKLE)===4);
    S().spots=null;tp(SX,SZ,Y0+1.05);}

  refloor();
  /* ===== 6. smelting: the Hot Plate and the Burners ===== */
  {clearInv();const p=P();const HP=[SX+3,Y0+1,SZ-3];V.setBlock(HP[0],HP[1],HP[2],B.PG_HOTPLATE);step(3);
    const be=V.ensureBE(HP[0],HP[1],HP[2],'furnace');be.in={id:IT.PG_HANGER,count:2};be.fuel={id:IT.PG_GREASE,count:1};
    step(20);ok('a burning Hot Plate joins MP_LIGHTS (OG light)',C2.MP_LIGHTS.has(C.bkey(HP[0],HP[1],HP[2])));
    step(240);ok('Raw Coat Hanger -> Armature Wire on the Hot Plate (10 s, Elbow Grease fuel)',be.out&&be.out.id===IT.PG_WIRE&&be.out.count===1);
    delete MP().ticks.smelt;V.openModal('furnace',C.bkey(HP[0],HP[1],HP[2]));step(1);const rs=C.MODAL.slots.find(s=>s.kind==='result');C2.takeResult(rs,false);step(2);
    ok('taking a smelted item from a Hot Plate ticks "smelt"',MP().ticks.smelt===1);V.closeModal(true);
    /* a Burner placed by Dan */
    const BU=[SX-2,Y0,SZ+2];hold(B.PG_BURNER,1);aim(BU[0]+0.5,BU[1]+1,BU[2]+0.5);rclick();hold(null);
    const bu=[BU[0],BU[1]+1,BU[2]];ok('a placed Burner joins MP_LIGHTS',V.getBlock(bu[0],bu[1],bu[2])===B.PG_BURNER&&C2.MP_LIGHTS.has(C.bkey(bu[0],bu[1],bu[2])));
    tp(bu[0]+2,bu[2],Y0+1.05);delete MP().ticks.smelt;const n0=inv(IT.PG_HANGER);
    V.spawnDrop(bu[0]+0.5,bu[1]+1.3,bu[2]+0.5,{id:IT.PG_HANGER,count:2},0,0,0);const raw=V.entities[V.entities.length-1];raw.thrower='Dan';
    step(30);ok('drops on a Burner sizzle (psz) and cannot be picked up ('+JSON.stringify({psz:!!raw.psz,dead:raw.dead,og:raw.onGround,x:raw.x.toFixed(2),y:raw.y.toFixed(2),z:raw.z.toFixed(2),b:V.getBlock(bu[0],bu[1],bu[2]),bu,inv:inv(IT.PG_HANGER),n0})+')',raw.psz&&!raw.dead&&inv(IT.PG_HANGER)===n0);
    step(80);const pop=drops().find(e=>e.st.id===IT.PG_WIRE);
    ok('every 4 s one item turns into its smelted form and pops toward the nearest player, owned by the dropper',!!pop&&pop.pown==='Dan'&&raw.st.count===1);
    for(let i=0;i<40&&!MP().ticks.smelt;i++)step(1);pickupAll();
    ok('picking up a Burner pop he owns ticks "smelt"',MP().ticks.smelt===1&&inv(IT.PG_WIRE)>=1);
    step(110);pickupAll();ok('the stack keeps cooking until it is all done',inv(IT.PG_WIRE)>=2&&!V.entities.some(e=>e===raw&&!e.dead));
    V.spawnDrop(bu[0]+0.5,bu[1]+1.3,bu[2]+0.5,{id:IT.PG_FELT,count:3},0,0,0);step(110);
    ok('a stack that does not smelt pops off unchanged after 4 s (never stuck on the coil)',drops().some(e=>e.st.id===IT.PG_FELT&&e.st.count===3&&!e.psz));
    pickupAll();tp(SX,SZ,Y0+1.05);}

  refloor();
  /* ===== 7. food ===== */
  {clearInv();const p=P();p.hunger=10;hold(IT.PG_RCHICK,2);const sp0=S().stats.sprays;V.MB.r=true;step(42);V.MB.r=false;step(2);
    ok('raw Rubber Chicken: 30% stays in (+2) and the rest sprays out of the back of the head',p.hunger===12&&S().stats.sprays===sp0+1);
    p.hunger=10;hold(IT.PG_STUFF,2);V.MB.r=true;step(42);const mid=p.hunger;step(40);V.MB.r=false;step(2);
    ok('Stuffing takes twice as long to eat (not done at 1.7 s, done by 3.3 s) and stays in (+1)',mid===10&&p.hunger===11);
    p.hunger=10;const t0=MP().stats.tomatoes|0;hold(IT.PG_TOMATO,1);V.MB.r=true;step(42);V.MB.r=false;step(2);
    ok('a Heckle Tomato is food (+3) and is counted (MP.stats.tomatoes)',p.hunger===13&&(MP().stats.tomatoes|0)===t0+1);
    p.hunger=10;p.yaw=0;p.pitch=0.35;hold(IT.PG_PIE,2);const pj0=V.entities.filter(e=>e.t==='pproj'&&e.kind==='pie').length;rclick();
    ok('Custard Pie: plain right-click throws it (pies '+V.entities.filter(e=>e.t==='pproj'&&e.kind==='pie').length+'/'+pj0+', inv '+inv(IT.PG_PIE)+', hunger '+p.hunger+')',V.entities.filter(e=>e.t==='pproj'&&e.kind==='pie').length===pj0+1&&inv(IT.PG_PIE)===1&&p.hunger===10);
    V.KEY.ShiftLeft=true;step(2);V.MB.r=true;step(44);V.MB.r=false;V.KEY.ShiftLeft=false;step(2);
    ok('...sneak + right-click eats it (+5)',p.hunger===15&&inv(IT.PG_PIE)===0);
    p.hunger=10;p.useT=0;p.yaw=0;p.pitch=0.3;hold(IT.PG_LIVECHICK,1);const ok1=!D[IT.PG_LIVECHICK].food;rclick();
    ok('a Live Chicken is not food: right-click throws it, wings flapping (hunger '+p.hunger+', inv '+inv(IT.PG_LIVECHICK)+')',ok1&&p.hunger===10&&inv(IT.PG_LIVECHICK)===0);
    p.hunger=20;}

  refloor();
  /* ===== 8. the soup slurp ===== */
  {const p=P();const SO=[SX+1,Y0,SZ+3];V.setBlock(SO[0],SO[1],SO[2],B.PG_SOUP);step(3);hold(null);p.hunger=10;p.hp=20;p.useT=0;aim(SO[0]+0.5,SO[1]+0.7,SO[2]+0.5);
    const R0=Math.random;Math.random=()=>0.5;rclick();Math.random=R0;
    ok('bare-handed right-click on Mystery Soup: slurp, +3 hunger, 1 damage (it is hot)',p.hunger===13&&p.hp===19);
    step(20);p.hurtT=0;const f0=drops().filter(e=>e.st.id===IT.PG_FISH).length;Math.random=()=>0.05;rclick();Math.random=R0;
    ok('...10% of the time a Homing Herring jumps out at your face (1 more damage, the fish drops)',drops().filter(e=>e.st.id===IT.PG_FISH).length===f0+1&&p.hp<=17);
    V.setBlock(SO[0],SO[1],SO[2],B.PG_DECK);p.hunger=20;p.hp=20;pickupAll();}

  refloor();
  /* ===== 9. Det Cord conduction (riser step, plate feed, one-cell gap) and the Demolitionist's Fuse ===== */
  {const y=Y0+1,z=SZ+6,x0=SX-6;for(let x=x0;x<=x0+3;x++)V.setBlock(x,y,z,B.PG_CORD);
    V.setBlock(x0+4,y,z,B.PG_DECK);V.setBlock(x0+4,y+1,z,B.PG_CORD);V.setBlock(x0+5,y+1,z,B.PG_CORD);   /* up a one-block riser */
    V.setBlock(x0+6,y,z,B.PG_PLATE);                                                                       /* a plate adjacent one lower */
    V.setBlock(x0+8,y+1,z,B.PG_CORD);                                                                      /* beyond a one-cell gap */
    step(4);const fed=[];const h=V.piCordSpark(x0,y,z,12,'the Demolitionist',(px,py,pz)=>fed.push([px,py,pz]));step(4);
    ok('a spark starts on a cord cell',!!h&&h.reached.size>=1);
    step(20);ok('it walks the cord at 12 blocks/s, steps up the riser and feeds the Charge Plate adjacent one lower',h.done&&h.reached.has((x0+5)+','+(y+1)+','+z)&&
      fed.some(f=>f[0]===x0+6&&f[1]===y&&f[2]===z));
    ok('a one-cell gap stops the spark',!h.reached.has((x0+8)+','+(y+1)+','+z));
    const hs=V.piCordSpark(x0,y,z,3,'the Demolitionist');step(10);const mid=hs.reached.size;step(50);
    ok('the Big One\'s fuse line runs at 3 blocks/s',mid>=1&&mid<=4&&hs.reached.size>=6);
    tp(x0+2,z-2,Y0+1.05);const before=V.piSparks().length;hold(IT.PG_FUSE,1);aim(x0+0.5,y+0.1,z+0.5);rclick();
    ok('the Lit Fuse lights a cord cell (a spark at 12 blocks/s)',V.piSparks().length===before+1||V.piSparks().some(s=>s.owner==='Dan'));
    const nS=S().fuseCD;rclick();ok('...with a 2 s cooldown',S().fuseCD===nS);hold(null);step(60);tp(SX,SZ,Y0+1.05);}

  refloor();
  /* ===== 10. Charges and the Plunger (blast-mining, protected volumes, the cap of 12, one stuck on Dan) ===== */
  {clearInv();const p=P();const F=[SX+3,Y0+1,SZ+2];V.setBlock(F[0],F[1],F[2],B.PG_FOAM);V.setBlock(F[0]+1,F[1],F[2],B.PG_FOAM);step(3);
    tp(SX,SZ,Y0+1.05);hold(IT.PG_CHARGE,4);aim(F[0]+0.5,F[1]+0.5,F[2]+0.02);p.pitch-=0.0;rclick();
    let c=mobs('pgcharge').filter(e=>e.owner==='Dan');
    ok('a Charge sticks to the block face you right-click (a beeping prop, owner Dan; e.blk for P4)',c.length===1&&c[0].stuck&&c[0].stuck.kind==='blk'&&c[0].blk===true&&!c[0].stuckTo&&inv(IT.PG_CHARGE)===3);
    tp(SX-6,SZ-6,Y0+1.05);hold(IT.PG_PLUNGER,1);rclick();step(8);
    ok('the Plunger: nothing yet (0.5 s spark)',V.getBlock(F[0],F[1],F[2])===B.PG_FOAM);step(10);
    ok('...then the Charge blows and breaks Foam outside a protected volume',V.getBlock(F[0],F[1],F[2])===0);
    ok('...the blasted block drops owned by Dan',drops().some(e=>e.st.id===IT.PG_FOAMCHUNK&&e.pown==='Dan'));
    const sx=2,sz=-138,sy=V.MPC.MARK_PAD.y;tp(0,-130,36.2);V.setBlock(sx,sy,sz,B.PG_FOAM);step(2);
    const cc=V.piChargeArm({x:sx,y:sy,z:sz,nx:0,ny:1,nz:0},'Dan');V.piChargeBlow(cc);step(3);
    ok('a Charge inside a protected volume (the Mark pad) breaks nothing',V.getBlock(sx,sy,sz)===B.PG_FOAM);V.setBlock(sx,sy,sz,B.PG_DECK);
    tp(SX,SZ,Y0+1.05);for(const e of mobs('pgcharge'))V.pgCore().removeEnt(e);step(2);
    let made=0;for(let i=0;i<13;i++)if(V.piChargeArm({x:SX+6,y:Y0,z:SZ-6+i%3,nx:0,ny:1,nz:0},'Dan'))made++;
    ok('at most 12 armed Charges per player',made===12);for(const e of mobs('pgcharge'))V.pgCore().removeEnt(e);step(2);
    const me=V.piChargeArm(p,'Dan',{force:1});step(5);ok('a Charge stuck on Dan rides along (e.stuckTo for P4)',me&&me.stuck.kind==='ent'&&me.stuckTo===p&&!me.blk&&Math.abs(me.x-p.x)<0.01);
    step(235);ok('...and falls off onto the floor after 8 s ('+JSON.stringify({dead:me.dead,st:me.stuck&&me.stuck.kind,y:me.y.toFixed(2),py:p.y.toFixed(2),loose:me.loose})+')',me.stuck&&me.stuck.kind==='blk');V.pgCore().removeEnt(me);
    p.hp=20;p.hurtT=0;const ch2=V.piChargeArm({x:Math.floor(p.x)+1,y:Y0,z:Math.floor(p.z),nx:0,ny:1,nz:0},'Dan');V.piChargeBlow(ch2);step(2);
    ok('a Charge blast hurts Dan nearby (how pg:charge)',p.hp<20&&V.getLASTDMG?true:p.hp<20);p.hp=20;
    hold(null);}

  refloor();
  /* ===== 11. the Pig Mitt: the 0.4 s window, the bite, the throw that mines nothing ===== */
  {const p=P();p.hp=20;p.hunger=15;tp(SX,SZ,Y0+1.05);p.yaw=0;p.pitch=0;hold(IT.PG_MITT,1,{dur:40});step(3);
    const throwAt=(dist,lead)=>{V.spawnMob('pgtcatch',p.x,p.y+1.0,p.z-dist);const e=V.entities[V.entities.length-1];e.vx=0;e.vz=10;e.vy=0.4;
      const T=Math.max(0,(dist-1.2)/10-lead);step(Math.round(T/0.04));V.MB.r=true;for(let i=0;i<Math.round(lead/0.04)+14;i++){step(1);if(V.piRaised()&&V.piRaised().held)break;}return e;};
    const pigs0=MP().stats.pigs|0;const e1=throwAt(7,0.2);
    ok('raised within 0.4 s of contact: the thrown thing is caught',V.piRaised()&&V.piRaised().held===e1&&e1.pheld==='Dan'&&(MP().stats.pigs|0)===pigs0+1);
    ok('...the catch wears the mitt (40 catches)',p.inv[8].dur===39);
    const hp0=p.hp;step(105);V.MB.r=false;step(2);ok('...it kicks for 4 s, then bites for 2 and wriggles free',p.hp===hp0-2&&!e1.pheld);
    V.pgCore().removeEnt(e1);step(5);
    const e2=throwAt(9,0.62);V.MB.r=false;step(3);ok('raised too early (0.6 s before contact): no catch',!e2.pheld);V.pgCore().removeEnt(e2);step(30);
    const fb=[Math.floor(p.x),Math.floor(p.y)-1,Math.floor(p.z)-2];V.setBlock(fb[0],fb[1]+1,fb[2],B.PG_FOAM);step(2);
    const e3=throwAt(7,0.2);const caught=!!(e3.pheld);aim(fb[0]+0.5,fb[1]+1.5,fb[2]+0.5);V.MB.l=true;step(1);V.MB.l=false;V.MB.r=false;step(3);
    ok('left-click throws what the mitt holds where you look (22 m/s)',caught&&!e3.pheld&&e3.pthrown&&e3.pthrown.by==='Dan'&&Math.hypot(e3.vx,e3.vy,e3.vz)>15);
    ok('...and that click mines nothing',V.getBlock(fb[0],fb[1]+1,fb[2])===B.PG_FOAM&&C2.MINE.prog===0);
    V.pgCore().removeEnt(e3);V.setBlock(fb[0],fb[1]+1,fb[2],0);
    V.MB.r=true;step(2);const sl=V.piSpeed(4.32);V.MB.r=false;step(2);ok('a raised mitt is a slow walk',Math.abs(sl-2.16)<0.01);
    /* P4's pigs are pooled projectiles: caught = removed and kept by kind; thrown back as the same kind, owner Dan, thrown:1 */
    p.yaw=0;p.pitch=0;step(2);const pp=V.puSpawn('ptpig',p.x,p.y+1.0,p.z-6,0,0.6,10,'the Pig',{pcatch:'pig'});step(Math.round((6-1.2)/10/0.04)-5);
    V.MB.r=true;let got=false;for(let i=0;i<20&&!got;i++){step(1);got=!!(S().held&&S().held.proj);}
    ok('the mitt catches a thrown pig projectile (removed, kind kept)',got&&pp.dead&&S().held.proj.kind==='ptpig');
    const n0=V.entities.filter(e=>e.t==='pproj'&&e.kind==='ptpig'&&!e.dead).length;V.MB.l=true;step(1);V.MB.l=false;V.MB.r=false;step(1);
    const back=V.entities.filter(e=>e.t==='pproj'&&e.kind==='ptpig'&&!e.dead&&e.owner==='Dan'&&e.thrown===1);
    ok('...and throws it back as the same kind (owner Dan, thrown:1, 22 m/s)',back.length===n0+1&&Math.hypot(back[0].vx,back[0].vy,back[0].vz)>15);
    hold(null);}

  refloor();
  /* ===== 12. the Vanity Mirror and the Staple Gun ===== */
  {const p=P();tp(SX,SZ,Y0+1.05);p.yaw=0;p.pitch=0;hold(IT.PG_VMIRROR,1,{dur:20});V.MB.r=true;step(3);
    const pj=V.puSpawn('ptest',p.x,p.y+1.2,p.z-4,0,0,12,'the Frog');step(12);
    ok('a raised Vanity Mirror bounces a projectile coming at it from the front (now Dan\'s)',pj.owner==='Dan'&&pj.vz<0&&p.inv[8].dur===19);
    V.MB.r=false;step(2);ok('P4\'s 4th look: piMirrorBreak chops the mirror to pieces',V.piMirrorBreak()&&inv(IT.PG_VMIRROR)===0);
    const tg=target(p.x,p.y,p.z-6);hold(IT.PG_STAPLER,1,{dur:300});p.inv[7]={id:IT.PG_STAPLES,count:5};aim(tg.x,tg.y+1.0,tg.z);step(2);rclick();step(8);
    ok('a staple: 2 damage and a 2 s pin on the target (e.ppin, seconds: P3 brains count it down)',tg.hp===58&&tg.ppin===2);
    ok('...uses one Staples and one point of the gun\'s 300',inv(IT.PG_STAPLES)===4&&p.inv[8].dur===299);
    p.inv[7]=null;p.useT=0;rclick();ok('no Staples: nothing fires',p.inv[8].dur===299);
    V.pgCore().removeEnt(tg);hold(null);}

  refloor();
  /* ===== 13. Diva's Boa glide; the Stiletto; UNHAND; Chop ===== */
  {const p=P();clearInv();p.hp=20;p.hunger=15;tp(SX,SZ,Y0+15);p.inv[7]={id:IT.PG_BOA,count:1};V.KEY.Space=true;let vmin=0;
    for(let i=0;i<120&&!p.onGround;i++){step(1);vmin=Math.min(vmin,p.vy);}V.KEY.Space=false;step(3);
    ok('Diva\'s Boa: hold Space while falling to glide (fall speed capped at 3 m/s, no fall damage)',vmin>=-3.3&&p.hp===20);
    p.inv[7]=null;tp(SX,SZ,Y0+12);for(let i=0;i<80&&!p.onGround;i++)step(1);step(2);ok('...without it the same fall hurts',p.hp<20);p.hp=20;
    /* the Stiletto: x1.6 while falling */
    tp(SX,SZ,Y0+1.05);p.y=Y0+16;p.vy=0;p.fallD=0;p.yaw=0;p.pitch=0;const tg=target(p.x,p.y-1.2,p.z-1.8);hold(IT.PG_STILETTO,1,{dur:600});for(let i=0;i<20&&p.vy>-3;i++){tg.fix=[p.x,p.y-0.4,p.z-1.6];step(1);}
    let hitOk=false;for(let i=0;i<40&&!hitOk;i++){tg.fix=[p.x,p.y-0.4,p.z-1.6];aim(tg.x,tg.y+0.9,tg.z);V.MB.l=true;step(1);V.MB.l=false;if(tg.hp<60)hitOk=true;}
    step(2);ok('The Stiletto hits for 7 x1.6 while you are falling (jump-crit: 7 + 4) (hp '+tg.hp+', hit '+hitOk+')',hitOk&&tg.hp===49);V.pgCore().removeEnt(tg);
    for(let i=0;i<80&&!p.onGround;i++)step(1);p.hp=20;
    /* UNHAND (the Gauntlet): 15% per hit on a puppet mob */
    tp(SX,SZ,Y0+1.05);p.yaw=0;p.pitch=0;if(!V.MOBT.pgwhat)V.MOBT.pgwhat={hp:12,hw:0.3,h:1.6,spd:0,body:'#f2a6c1',head:'#f2a6c1',legc:'#e08cb0',pmob:1,struct:1,pnc:1};
    const own=!V.PREG.brain.pgwhat,brain0=V.PREG.brain.pgwhat;V.PREG.brain.pgwhat=V.PREG.brain.pgttest;   /* a stationary puppet for the odds */
    const mk=()=>{V.spawnMob('pgwhat',p.x,p.y,p.z-1.8);const e=V.entities[V.entities.length-1];e.fix=[p.x,p.y,p.z-1.8];e.hp=60;e.tether=null;return e;};
    hold(IT.PG_GAUNTLET,1,{dur:1500});const R0=Math.random;
    const w1=mk();aim(w1.x,w1.y+1,w1.z);Math.random=()=>0.5;p.atkT=0;V.MB.l=true;step(1);V.MB.l=false;Math.random=R0;step(2);
    const w1hp=w1.hp;V.pgCore().removeEnt(w1);step(2);const w2=mk();aim(w2.x,w2.y+1,w2.z);p.atkT=0;step(10);Math.random=()=>0.05;V.MB.l=true;step(1);V.MB.l=false;Math.random=R0;step(2);
    ok('the Gauntlet: 85% of hits just hit (9) ...',w1hp===51);
    ok('...15% UNHAND the puppet: the hand rips out and it drops limp (instant kill) (hp '+w2.hp+')',w2.dead||w2.hp<=0);
    if(own)delete V.PREG.brain.pgwhat;else V.PREG.brain.pgwhat=brain0;
    /* Chop */
    const t1=target(p.x,p.y,p.z-2),t2=target(p.x,p.y,p.z-5.5);p.yaw=0;p.pitch=0.05;hold(IT.PG_CHOPGLOVE,1,{dur:400});p.useT=0;
    aim(t1.x,t1.y+1,t1.z);V.MB.r=true;step(23);V.MB.r=false;step(2);
    ok('Slam Gloves: a 0.8 s hold, release: 14 to the target in reach plus an 8-block shockwave line of 6',t1.hp===46&&t2.hp===54);
    V.MB.r=true;step(23);V.MB.r=false;step(2);ok('...6 s cooldown',t1.hp===46&&t2.hp===54);
    t1.hp=60;V.MB.r=true;step(10);V.MB.r=false;step(2);ok('released before 0.8 s: nothing',t1.hp===60);
    V.pgCore().removeEnt(t1);V.pgCore().removeEnt(t2);
    /* the Foam Bat: mob knockback x2 */
    const kb=id=>{V.spawnMob('pgtfree',p.x,p.y,p.z-1.8);const e=V.entities[V.entities.length-1];hold(id,1,{dur:110});aim(e.x,e.y+1,e.z);step(1);
      p.atkT=0;V.MB.l=true;step(1);V.MB.l=false;const v=Math.hypot(e.vx,e.vz);V.pgCore().removeEnt(e);step(2);return v;};
    const vb=kb(IT.PG_BAT),vs=kb(IT.PG_SLAPPER);ok('the Foam Bat knocks a mob back twice as far ('+vs.toFixed(1)+' -> '+vb.toFixed(1)+' m/s)',vs>4&&Math.abs(vb-2*vs)<0.6);
    hold(null);}

  refloor();
  /* ===== 14. the Felt Fly and the Custard Pie ===== */
  {const p=P();tp(SX,SZ,Y0+1.05);p.yaw=0;p.pitch=0.2;hold(IT.PG_FLY,16);rclick();let land=null;
    for(let i=0;i<60&&!land;i++){step(1);land=mobs('pgfly')[0]||null;}
    ok('a Felt Fly arcs out (about 12 m) and buzzes where it lands (pgfly, stack 16)',!!land&&Math.hypot(land.x-p.x,land.z-p.z)>6&&Math.hypot(land.x-p.x,land.z-p.z)<16&&inv(IT.PG_FLY)===15);
    step(520);ok('...for 20 s',land.dead);
    const tg=target(p.x,p.y,p.z-7);hold(IT.PG_PIE,4);aim(tg.x,tg.y+1.6,tg.z);step(1);rclick();for(let i=0;i<30&&!tg.pblind;i++)step(1);
    ok('a Custard Pie hit blinds the target for 4 s (e.pblind)',tg.pblind>MP().clock+3);V.pgCore().removeEnt(tg);hold(null);}

  refloor();
  /* ===== 15. armour perks and the walk-speed blocks ===== */
  {const p=P();clearInv();p.hp=20;tp(SX,SZ,Y0+1.05);
    const fall=(h)=>{p.hp=20;p.hurtT=0;tp(SX,SZ,Y0+1+h);for(let i=0;i<100&&!p.onGround;i++)step(1);step(2);return 20-p.hp;};
    const base=fall(10);p.armor=[{id:IT.PG_FPAD_H},{id:IT.PG_FPAD_C},{id:IT.PG_FPAD_L},{id:IT.PG_FPAD_B}];const fp=fall(10);
    ok('Foam Padding set: fall damage -50% ('+base+' -> '+fp+', before armour)',base>=4&&fp<=Math.floor(Math.floor(base)*0.5)+0.5);
    p.hp=20;p.hurtT=0;V.purgHit(p,8,'test','blast',{force:1});const fpb=20-p.hp;ok('...and blast damage -25% (8 -> '+fpb.toFixed(2)+')',Math.abs(fpb-8*0.75*(1-7*0.04))<0.01);
    p.armor=[{id:IT.PG_WIG},null,null,null];p.hp=20;p.hurtT=0;V.purgHit(p,8,'test','boom',{force:1});
    ok('Fright Wig: blast damage -40%',Math.abs((20-p.hp)-8*0.6*(1-2*0.04))<0.01);
    p.armor=[{id:IT.PG_GOWN_H},{id:IT.PG_GOWN_C},{id:IT.PG_GOWN_L},{id:IT.PG_GOWN_B}];const R0=Math.random;
    p.hp=20;p.hurtT=0;Math.random=()=>0.1;V.purgHit(p,3,'the Pig','pig',{force:1});Math.random=R0;const dfl=p.hp===20;
    p.hp=20;p.hurtT=0;Math.random=()=>0.5;V.purgHit(p,3,'the Pig','pig',{force:1});Math.random=R0;
    ok('Sequin Gown set: 20% of projectiles deflect',dfl&&p.hp<20);
    p.armor=[{id:IT.PG_STUNT},null,null,null];const ns=fall(12);p.hp=20;p.hurtT=0;tp(SX,SZ,Y0+1.05);p.vy=24;p.onGround=false;
    for(let i=0;i<200&&!(i>10&&p.onGround);i++)step(1);step(2);
    const st=20-p.hp;ok('Stunt Helmet: landing after a launch -50% ('+ns.toFixed(2)+' falling -> '+st.toFixed(2)+' launched)',S().launched===false&&st>0&&st<=ns*0.6);
    p.armor=[null,null,null,{id:IT.PG_SNEAKERS}];tp(SX,SZ,Y0+1.05);ok('Performer\'s Sneakers: +15% walk speed',Math.abs(V.piSpeed(4.32)-4.968)<0.01);
    const n0=V.piFootprints().length;p.yaw=0;V.KEY.KeyW=true;step(25);V.KEY.KeyW=false;step(2);
    ok('...and they leave footprints (the Hands follow them in BLACKOUT)',V.piFootprints().length>=n0+2);
    step(510);ok('...for 20 s',V.piFootprints().length===0);p.armor=[null,null,null,null];
    V.setBlock(SX,Y0,SZ,B.PG_SWAMP);tp(SX,SZ,Y0+1.05);ok('Swamp Felt: -15% walk speed',Math.abs(V.piSpeed(4.32)-4.32*0.85)<0.01);
    V.setBlock(SX,Y0,SZ,B.PG_DECK);V.setBlock(SX,Y0+1,SZ,B.PG_SOUP);tp(SX,SZ,Y0+1.05);ok('wading in Mystery Soup: x0.45',Math.abs(V.piSpeed(4.32)-4.32*0.45)<0.01);
    V.setBlock(SX,Y0+1,SZ,B.PG_SCUM);step(2);ok('...in Pond Scum: x0.5',Math.abs(V.piSpeed(4.32)-4.32*0.5)<0.01);V.setBlock(SX,Y0+1,SZ,0);
    V.setBlock(SX,Y0,SZ,B.PG_STUFFING);const sf=fall(12);ok('Stuffing Drift: no fall damage',sf===0);
    V.setBlock(SX,Y0,SZ,B.PG_DOUGH);p.hp=20;tp(SX,SZ,Y0+5);let up=0;for(let i=0;i<40;i++){step(1);up=Math.max(up,p.vy);}
    ok('Dough: landing bounces you (vy 20 with no mesa next to it, about 8 blocks)',up>=19&&p.hp===20);
    for(let i=0;i<120&&!(p.onGround&&p.vy<=0);i++)step(1);
    for(let y=Y0+1;y<=Y0+6;y++)V.setBlock(SX+1,y,SZ,B.PG_COUNTER);step(2);
    const want=Math.sqrt(2*24*(Y0+6+1+2-p.y));ok('...next to a mesa, exactly to its top + 2',Math.abs(V.piDoughVy(SX,Y0,SZ)-want)<0.01);
    for(let y=Y0+1;y<=Y0+6;y++)V.setBlock(SX+1,y,SZ,0);V.setBlock(SX,Y0,SZ,B.PG_DECK);p.hp=20;tp(SX,SZ,Y0+1.05);}

  refloor();
  /* ===== 16. the Programme, the Floppy Pick bend, the lamp, the trunks, the trunk climb, the felt mitt ===== */
  {const p=P();clearInv();p.sel=0;V.refreshHand();rclick();ok('right-clicking the Programme opens it',V.pguOn());V.pguClose&&V.pguClose(true);step(2);
    const tg=target(p.x,p.y,p.z-2);hold(IT.PG_FLOPPY,1,{dur:48});const b0=S().bends;p.yaw=0;p.pitch=0;
    for(let k=0;k<3;k++){aim(tg.x,tg.y+1,tg.z);p.atkT=0;V.MB.l=true;step(1);V.MB.l=false;step(10);}
    const hm=V.piHandModel();ok('the Floppy Pick head bends over on every swing (0.15 s)',S().bends===b0+3&&!!hm&&!!hm.pbend);V.pgCore().removeEnt(tg);
    const L=[SX-1,Y0,SZ+1];hold(B.PG_LAMP,2);aim(L[0]+0.5,L[1]+1,L[2]+0.5);rclick();
    ok('a placed Eyeball Lamp is a torch (in the torch registry: OG light, HR torch path)',V.getBlock(L[0],L[1]+1,L[2])===B.PG_LAMP&&C2.torches.has(C.bkey(L[0],L[1]+1,L[2])));
    hold(B.PG_LAMP,2);aim(SX+0.5,Y0+3.5,SZ-3.5);V.setBlock(SX,Y0+3,SZ-4,B.PG_DECK);V.setBlock(SX,Y0+2,SZ-4,0);V.setBlock(SX,Y0+1,SZ-4,0);step(2);
    aim(SX+0.5,Y0+3.5,SZ-3.01);rclick();ok('...it needs a floor (no lamp on a ceiling or wall face without one)',V.getBlock(SX,Y0+2,SZ-4)!==B.PG_LAMP||V.getBlock(SX,Y0+1,SZ-4)===0);
    V.setBlock(SX,Y0+3,SZ-4,0);hold(null);
    /* loot trunks */
    const WT=[SX+3,Y0+1,SZ+3],GT=[SX-3,Y0+1,SZ-3];V.setBlock(WT[0],WT[1],WT[2],B.PG_PTRUNK);V.setBlock(GT[0],GT[1],GT[2],B.PG_PTRUNK);
    S().spots={wingTrunk:[WT],guestTrunk:[GT]};step(25);
    const wb=V.blockEnts.get(C.bkey(...WT)),gb=V.blockEnts.get(C.bkey(...GT));
    ok('a wing Prop Trunk fills with purgatory loot once, when Dan first comes near',!!wb&&wb.t==='chest'&&wb.ploot===1&&wb.inv.some(Boolean));
    ok('the Last Guest\'s trunk holds half a kit (LARP Pick at 40%, 6 Rods, 4 Roast Rubber Chickens, a Custard Pie) and carries pguest',!!gb&&gb.pguest===1&&
      gb.inv.some(s=>s&&s.id===IT.PG_LARPPICK&&s.dur===44)&&V.invCount(gb.inv,IT.PG_ROD)===6&&V.invCount(gb.inv,IT.PG_ROAST)===4&&V.invCount(gb.inv,IT.PG_PIE)===1);
    gb.inv.fill(null);step(25);ok('...it does not refill within the same entry',!gb.inv.some(Boolean));
    gb.pentry=-1;step(25);ok('...and refills once per world entry',V.invCount(gb.inv,IT.PG_ROD)===6);
    S().spots=null;
    /* climb into a Prop Trunk */
    delete MP().ticks.trunk;hold(null);V.KEY.ShiftLeft=true;step(2);aim(WT[0]+0.5,WT[1]+0.5,WT[2]+0.5);rclick();V.KEY.ShiftLeft=false;step(2);
    ok('sneak + right-click a Prop Trunk: climb in; it becomes your trunk spawn point (page 7 tick)',JSON.stringify(MP().spawns.trunk)===JSON.stringify(WT)&&MP().ticks.trunk===1);
    step(60);
    /* the felt mitt */
    hold(null);step(3);const hg=C2.handG();ok('inside, Dan\'s empty hand is a felt mitt (OG)',!!hg&&!!S().mitt&&hg.children.indexOf(S().mitt)>=0);
    hold(IT.PG_FELT,1);step(3);ok('...holding something, the mitt goes away',hg.children.indexOf(S().mitt)<0);hold(null);step(3);}

  /* ===== 17. souvenirs in the overworld ===== */
  {const p=P();clearInv();V.mpExitNow({abandon:true});step(30);if(V.presOn())V.presClose(true);
    ok('back in the overworld',V.getDim()==='over');step(3);
    ok('outside, the empty hand is not the felt mitt',!S().mitt||C2.handG().children.indexOf(S().mitt)<0);
    const pigs=()=>V.entities.filter(e=>e.t==='mob'&&!e.dead&&e.mt==='pig').length;
    hold(IT.PG_SV_GLOVE,1);p.pitch=0.1;const g0=pigs();rclick();
    ok('the Pig-Hurling Glove hurls a live overworld pig where you look',pigs()===g0+1);
    const pig=V.entities.filter(e=>e.t==='mob'&&e.mt==='pig').pop();ok('...at speed (about 12 m)',pig&&Math.hypot(pig.vx,pig.vz)>6);
    p.useT=0;rclick();ok('...with a 20 s cooldown',pigs()===g0+1);
    const tx=Math.floor(p.x)+3,tz=Math.floor(p.z),ty=V.surfaceTop(tx,tz)+1;V.setBlock(tx,ty,tz,B.TNT);step(2);
    const placed=V.getBlock(tx,ty,tz)===B.TNT;hold(IT.PG_SV_PLUNGER,1);p.useT=0;rclick();step(6);const still=V.getBlock(tx,ty,tz)===B.TNT;let primed=false;
    for(let i=0;i<14;i++){step(1);if(V.entities.some(e=>e.t==='tnt'&&!e.dead))primed=true;}
    ok('the Detonator Plunger primes the TNT Dan placed within 48 m after a 0.5 s spark ('+JSON.stringify({placed,still,now:V.getBlock(tx,ty,tz),primed,door:!!MP().door})+')',placed&&still&&V.getBlock(tx,ty,tz)!==B.TNT&&primed);
    for(const e of V.entities)if(e.t==='tnt'&&!e.dead)V.pgCore().removeEnt(e);
    hold(IT.PG_SV_FROG,1);p.yaw=0;p.pitch=-0.15;const L=V.pgCore().lookDir(),E=V.pgCore().eyePos();
    V.spawnDrop(E[0]+L[0]*6,E[1]+L[1]*6,E[2]+L[2]*6,{id:B.DIRT,count:1},0,0,0);const dd=V.entities[V.entities.length-1];dd.vy=0;p.useT=0;V.MB.r=true;step(1);V.MB.r=false;
    ok('the Frog Puppet (Empty): the tongue yanks a dropped item to you (10 m)',Math.hypot(dd.x-p.x,dd.z-p.z)<1.5||dd.dead);
    step(10);hold(null);}
});
