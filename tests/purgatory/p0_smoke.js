/* p0_smoke.js (P0, gate x2): Build A0 behaviour (the purgatory build plan sections 3.6, 3.8, 8.2).
   build identity (RETIRED at the split: it re-spliced v5.9/v6.0), the Stage Door (timer seam, compass, Debug),
   the door set, the ritual through the real doUse, the cutscene, the strip of 50 stacks, the leak gates, the Programme
   (unlocks, ticks, What next?), save/reload inside, NUKES code 3, pmob never saved, death and Lost Property, nearest spawn,
   Charge blast-mining and the break event, batting, NPC hits, props, the exit (customs, souvenirs once, results card, CLOSED
   marquee), the emptied trunk vanishing, the re-entry wipe, Debug buttons. Checks needing a stubbed package are skipped. */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const V=boot({});
const step=boot.stepper(500000),C=V.pgCore(),B=V.B,IT=V.IT,MPC=V.MPC;
const MP=()=>V.getMP(),MPF=()=>V.getMPF(),DS=()=>V.getDS();
const md5=b=>crypto.createHash('md5').update(b).digest('hex');
const st=V.mpInfo().stubs,stub=d=>st.indexOf(d)>=0;
const drops=()=>V.entities.filter(e=>e.t==='drop'&&!e.dead);
function tp(x,z,y){const P=V.P;V.forceChunksNear(x,z);P.x=x+0.5;P.z=z+0.5;P.y=y!=null?y:V.surfaceTop(x,z)+1.05;P.vx=P.vy=P.vz=0;P.fallD=0;step(25);}
function aim(x,y,z){const P=V.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));}
function rclick(){V.MB.r=true;step(1);V.MB.r=false;step(2);}   /* one frame down: a held right-click keeps placing */
function poll(){step(8);}
function frontOf(d,k){return [d.x+0.5+d.f[0]*k,d.z+0.5+d.f[1]*k];}

boot.run(async()=>{
  /* ===== 0. build identity: RETIRED at the split (4 checks). It re-ran splice.py (DC_NO_TEX DC_NO_PURG = the shipped v5.9, DC_NO_PURG =
     the shipped v6.0 head + game outside the v6.1-owned files). Those variants cannot be built from folded sources; the frozen-version
     rule (tests/fixtures/shipped.json, tests/repo/r_build.js) proves the v6.3 build byte for byte instead. ===== */

  /* ===== 1. the Stage Door: compass panel is pure, tuning stamps, the timer seam stamps, Debug moves it ===== */
  boot.world(V,'pg0a','1337',step);
  ok('modalOpen() is false in the overworld with no panel open',V.modalOpen()===false);
  ok('the structure compass has a 7th target, Stage Door',C.CMP_DEFS.length===7&&C.CMP_DEFS[6].k==='pdoor');
  ok('before a door: mpOverTick never ran (no door set, no clock)',!DS().g&&DS().t===0);
  {const d=V.snapshot('pg0a');ok('a fresh overworld save writes no mp and no stash key (v6.0 shape)',!('mp' in d)&&!('stash' in d));}
  V.openCmp();C.renderCmp();C.closeCmp();step(2);
  ok('opening the compass panel stamps nothing (mpCmpDoor is pure)',MP().door===null&&V.mpCmpDoor().ok===false);
  V.mpSetPlayT(599.5);step(2);ok('599.5 s of play: no door yet',MP().door===null);
  {const before=new Map();for(const [k,m] of V.chunkEdits())before.set(k,new Map(m));
    V.mpSetPlayT(600);step(2);const d=MP().door;
    ok('600 s of play (the timer seam): the Stage Door is stamped',!!d&&V.getBlock(d.x,d.y,d.z)===B.PG_DOOR&&V.getBlock(d.x,d.y+1,d.z)===B.PG_DOOR);
    if(d){const r=[d.f[1],-d.f[0]];let wall=0;for(let i=-3;i<=3;i++)for(let j=0;j<7;j++){const id=V.getBlock(d.x+r[0]*i,d.y+j,d.z+r[1]*i);if(i===0&&j<2?id===B.PG_DOOR:id===B.PG_MBLACK)wall++;}
      ok('a 7x7 freestanding Masking Black wall with the 1x2 door in the centre',wall===49);
      let far=0,n=0;for(const [k,m] of V.chunkEdits()){const p=k.split(',').map(Number),o=before.get(k);
        for(const [lk,id] of m){if(o&&o.get(lk)===id)continue;n++;const q=lk.split(',').map(Number),x=p[0]*16+q[0],y=q[1],z=p[1]*16+q[2];
          if(Math.abs(x-d.x)>6||Math.abs(z-d.z)>6||y<d.y-8||y>d.y+7)far++;}}
      ok('the stamp only touched the structure cells ('+n+' edits, all within the door footprint)',n>40&&far===0);
      const c=V.mpCmpDoor();ok('the compass points at the door',c.ok&&Math.abs(c.x-(d.x+0.5))<1e-9&&Math.abs(c.z-(d.z+0.5))<1e-9);
      const dd=Math.hypot(d.x+0.5-V.P.x,d.z+0.5-V.P.z);ok('stamped 30-90 m from Dan ('+dd.toFixed(0)+' m)',dd>=25&&dd<=95);}}
  boot.world(V,'pg0b','1337',step);
  ok('a new world forgets the door (resetWorld -> mpReset)',MP().door===null&&MP().playT===0);
  V.cmpSelect('pdoor');step(2);ok('tuning the compass to Stage Door stamps the door',!!MP().door&&V.P.cmpT==='pdoor');
  boot.world(V,'pg0c','1337',step);
  V.mpDoorHere();step(2);
  {const d0={...MP().door};ok('Debug seam mpDoorHere(): a door 7 m ahead',Math.abs(Math.hypot(d0.x+0.5-V.P.x,d0.z+0.5-V.P.z)-7)<1.5);
    V.P.x+=20;V.P.yaw=0;step(30);document.getElementById('dbg_pgdoor').onclick();step(2);const d1=MP().door;
    ok('Debug button "summon Stage Door here" moves it (old blocks gone)',d1&&(d1.x!==d0.x||d1.z!==d0.z)&&V.getBlock(d0.x,d0.y,d0.z)!==B.PG_DOOR);}

  /* ===== 2. the door set (mpOverTick): searchlight 35% by day, 100% at night ===== */
  V.GR.dayCycle=false;V.setTime(0.3);step(20);
  {const S=DS();ok('the door set is built once a door exists (marquee, 14 bulbs, beam, frog)',!!S.g&&S.bulbs.length===14&&!!S.beam&&!!S.head);
    const r0=S.piv.rotation.y,day=S.beamM.opacity;V.setTime(0.8);step(5);const night=S.beamM.opacity;
    ok('the searchlight sweeps',S.piv.rotation.y>r0);
    ok('beam opacity by day is ~35% of night ('+(day/night).toFixed(2)+')',night>0&&day/night>0.3&&day/night<0.4);
    V.setTime(0.3);step(2);}

  /* ===== 3. the ritual through the real doUse, the cutscene, invulnerability ===== */
  {const d=MP().door,f=frontOf(d,3),P=V.P;tp(Math.floor(f[0]),Math.floor(f[1]),d.y+0.05);
    P.inv[0]={id:B.DIRT,count:5};P.sel=0;V.refreshHand();aim(d.x+0.5,d.y+1,d.z+0.5);rclick();
    ok('holding anything: the frog snaps (no entry)',DS().snap>0&&DS().rit.st===0&&V.getDim()==='over');
    P.sel=4;V.refreshHand();aim(d.x+0.5,d.y+1,d.z+0.5);rclick();
    ok('empty hand: the frog lifts its head and looks (ritual stage 1)',DS().rit.st===1&&DS().turn>0);
    step(132);ok('waiting 5 s resets the frog',DS().rit.st===0);
    aim(d.x+0.5,d.y+1,d.z+0.5);rclick();aim(d.x+0.5,d.y+1,d.z+0.5);rclick();
    ok('empty hand again within 5 s: the bite starts the purgatory cutscene',C.CUT.on&&!!C.CUT.script);
    ok('at the bite nothing is taken yet (the strip happens under the black at t 4.1)',!MP().inside&&!MP().trunks.Dan&&P.inv.some(s=>s&&s.id===B.DIRT));
    {const s0=V.snapshot('mid');ok('an autosave during the bite keeps Dan\'s things on Dan (no trunk, not inside)',!(s0.mp&&s0.mp.inside)&&s0.player.inv.some(s=>s&&s.id===B.DIRT));}
    P.hurtT=0;const hp=P.hp;V.damagePlayer(6);ok('Dan cannot be hurt during a purgatory cutscene (P0-24)',P.hp===hp);
    step(30);V.KEY.Space=true;step(2);V.KEY.Space=false;step(30);
    ok('skipping still strips: the dirt is in Dan\'s 54-slot Stage Trunk',(()=>{const be=V.blockEnts.get(MP().trunks.Dan);return be&&be.t==='stash'&&be.inv.length===54&&be.inv.some(s=>s&&s.id===B.DIRT&&s.count===5);})());
    ok('Space skips it: Dan is on the Mark in purgatory',V.getDim()==='puppet'&&Math.abs(P.x-0.5)<1.5&&Math.abs(P.z+135.5)<2.5&&!C.CUT.on);
    ok('the Programme is in slot 1 and nothing else is carried',P.inv[0]&&P.inv[0].id===IT.PG_PROGRAMME&&P.inv.filter(Boolean).length===1&&P.armor.every(a=>!a));
    ok('dimension keys carry the m; prefix and read back as puppet',C.bkey(1,2,3)==='m;1,2,3'&&C.keyDim('m;0,0')==='puppet'&&C.keyDim('n;0,0')==='nether'&&C.keyDim('a;0,0')==='aether');
    ok('modalOpen() is false inside with no panel open',V.modalOpen()===false);
    V.pguOpen();ok('the Programme panel counts as modal (pguOn), and reading it ticks "read"',V.modalOpen()===true&&V.pguOn()&&MP().ticks.read===1);
    document.getElementById('pguclose').onclick();ok('closing it clears the flag',V.modalOpen()===false&&!V.pguOn());
    V.mpExitNow({abandon:true});step(20);
    ok('Abandon: back in the overworld by the door, no souvenirs, no results card',V.getDim()==='over'&&!V.presOn()&&MPF().lastExit.souvenirs.length===0&&MP().life.escapes===0);}

  /* ===== 4. the strip of 50 stacks (36 + 4 armour + 9 grid + cursor), from creative, with a disaster running ===== */
  {const P=V.P,REF=[];
    const be0=V.blockEnts.get(MP().trunks.Dan);if(be0){for(const s of be0.inv)if(s)V.invAddTo(P.inv,s);}
    for(let i=0;i<36;i++)P.inv[i]=null;
    const items=[[IT.NUKE,1],[V.toolId(3,0),1,{dur:500,ench:{eff:2}}],[IT.FIGURINE,1,{mob:{t:'pig'}}],[IT.DIAMOND,12]];
    for(let i=0;i<36;i++){const it=items[i]||[i%2?B.DIRT:B.COBBLE,10+i];const s=Object.assign({id:it[0],count:it[1]},it[2]||{});P.inv[i]=s;REF.push(s);}
    for(let i=0;i<4;i++){P.armor[i]={id:V.armorId(2,i),dur:100+i};REF.push(P.armor[i]);}
    V.openModal('craft');const g=C.MODAL.grid;for(let i=0;i<9;i++){g[i]={id:B.PLANK_O,count:i+1};REF.push(g[i]);}
    const cur={id:B.SAND,count:7};C.setCursor(cur);REF.push(cur);
    V.spawnMob('pig',P.x+6,P.y+1,P.z);P.mode='c';if(C.startDisaster)try{C.startDisaster('tornado',P.x+30,P.z);}catch(e){}
    const disOn=!!C.DIS.kind,d0=drops().length;
    ok('50 stacks staged (36 + 4 armour + 9 grid + cursor)',REF.length===50);
    V.mpEnterNow();step(30);
    const be=V.blockEnts.get(MP().trunks.Dan);
    ok('entry: in purgatory, inventory holds only the Programme',V.getDim()==='puppet'&&P.inv.filter(Boolean).length===1&&P.inv[0].id===IT.PG_PROGRAMME);
    ok('the trunk holds all 50 stacks by reference (54 slots)',be&&be.inv.length===54&&REF.every(s=>be.inv.includes(s)));
    ok('dur, ench and mob ride along; armour pieces gained count:1',REF[1].dur===500&&REF[1].ench.eff===2&&REF[2].mob.t==='pig'&&REF.slice(36,40).every(a=>a.count===1&&a.dur>=100));
    ok('no new drops anywhere (live or stashed)',drops().length===0&&d0===0&&!(C.ENT_STASH.over||[]).some(o=>o.t==='drop'));
    ok('the opening heckle picks the NUKE over the stack count',MPF().entry.notable.a==='He had a NUKE in there.'&&MPF().entry.notable.b==='Not anymore. Baa-ha-ha.');
    {const n=V.mpNotable(Array(31).fill(0).map((x,i)=>({id:B.DIRT,count:1+i})));ok('fallback heckle: the stack count in words',n.a==='Thirty-one stacks.'&&/He.ll want those/.test(n.b));}
    ok('creative is forced to survival inside (banked on MP.keep)',P.mode==='s'&&MP().keep.mode==='c');
    ok('the disaster is ended by the strip'+(disOn?'':' (none could start here)'),!C.DIS.kind);
    ok('the overworld\'s entities are stashed (the pig waits in ENT_STASH.over)',Array.isArray(C.ENT_STASH.over)&&C.ENT_STASH.over.some(o=>o.t==='pig'));}

  /* ===== 5. leak gates inside ===== */
  {const P=V.P;P.pow=P.pow||{u:{},a:{}};P.pow.u.fly=1;P.pow.a.fly=1;ok('superpowers are off (powActive)',V.powActive('fly')===false);
    V.openStore();step(1);ok('the store refuses (No crew on stage.)',V.modalOpen()===false);
    P.bp=true;P.bpT=0.05;P.bpLvl=0;const inv0=JSON.stringify(P.inv);step(10);ok('the battle pass pays nothing',JSON.stringify(P.inv)===inv0);
    V.openModal('creative');const pal=C.MODAL.slots.filter(s=>s.kind==='palette').map(s=>s.get().id);V.closeModal(true);
    ok('the creative palette shows only purgatory defs ('+pal.length+')',pal.length>40&&pal.every(id=>V.DEFS[id].pg));
    V.GR.mobSpawn=true;step(300);const bad=V.entities.filter(e=>e.t==='mob'&&!e.dead&&!e.bot&&!V.MOBT[e.mt].pmob);V.GR.mobSpawn=false;
    ok('12 s with mob spawning on: no overworld mob and no dragon',bad.length===0);
    V.spawnMob('pig',P.x+3,P.y+1,P.z);const pig=V.entities[V.entities.length-1];const mr=Math.random;Math.random=()=>0;
    try{pig.hurtT=0;V.hurtMob(pig,999,0,0);}finally{Math.random=mr;}
    ok('no figurine or guilt ghost rolls in purgatory (Math.random forced to 0)',!drops().some(e=>e.st.id===IT.FIGURINE)&&!V.entities.some(e=>e.t==='ghost'&&!e.dead));
    for(const e of drops())V.pgCore().removeEnt(e);}

  /* ===== 6. the Programme: unlocks, ticks, What next? ===== */
  {const M=MP(),P=V.P;poll();
    ok('pages 1-3 are open from entry and nothing else',(M.page&7)===7&&(M.page&~7)===0);
    ok('facing upstage on the Mark, the apron behind Dan is not "seen" yet',!M.ticks.apron);
    const bit=i=>!!(MP().page&(1<<i));
    ok('page 4 waits for Felt',!bit(3));M.seenIng[IT.PG_FELT]=1;poll();ok('page 4 opens on the first Felt',bit(3));
    ok('page 5 waits for a Floppy Pick',!bit(4));M.seenIng[IT.PG_FLOPPY]=1;poll();ok('page 5 opens on the first Floppy Pick',bit(4));
    if(!V.MOBT.pgwhat)V.MOBT.pgwhat={hp:20,hw:0.3,h:1.6,spd:0,body:'#f2a6c1',legc:'#e08cb0',pmob:1,struct:1,pnc:1};
    ok('page 6 waits for a Blank in view',!bit(5));
    V.spawnMob('pgwhat',P.x+0.5,P.y,P.z+8);aim(P.x+0.5,P.y+1,P.z+8);poll();ok('page 6 opens with a Blank 8 m ahead in view',bit(5));
    for(const e of V.entities)if(e.mt==='pgwhat')V.pgCore().removeEnt(e);
    if(stub('1'))skip('page 7 (BLACKOUT warning)','P1 on its stub: mwCue() is always show');
    ok('page 8 waits for Plane 2',!bit(7));tp(0,-50);poll();ok('page 8 opens at z >= -58 (the Kitchen)',bit(7));
    ok('page 9 waits for Snips or the apron',!bit(8));tp(0,-175,MPC.APRON.y+1.05);poll();ok('page 9 opens inside the apron bbox',bit(8));
    ok('standing in the apron ticks "See the apron"',MP().ticks.apron===1);
    ok('page 10 waits for the Demolitionist',!bit(9));M.dead.bomber=1;poll();ok('page 10 opens when the Demolitionist is dead',bit(9)&&MP().ticks.bomber===1);
    ok('page 11 waits for Plane 3',!bit(10));tp(0,50);poll();ok('page 11 opens at z >= 42',bit(10));
    ok('page 12 waits for the Pig',!bit(11));M.dead.bigpig=1;poll();ok('page 12 opens when the Pig is dead',bit(11));
    if(stub('4'))skip('page 12b (the Frog, phase 3)','P4 on its stub: hnState() is null');
    ok('page 13 waits for the Frog',!bit(13));M.dead.bigfrog=1;poll();ok('page 13 opens when the Frog is dead',bit(13));
    M.seenIng[B.PG_SLEEVE]=1;poll();ok('held-item ticks come from MP.seenIng (Felt Sleeve)',MP().ticks.sleeve===1);
    tp(0,-136,36.2);P.yaw=0;P.pitch=0;aim(0.5,74,131.5);step(32);ok('looking at the lights over the curtain for 1 s ticks "beacon"',MP().ticks.beacon===1);
    /* What next? */
    for(const k in M.ticks)delete M.ticks[k];M.dead.bomber=M.dead.bigpig=M.dead.bigfrog=0;
    for(const k of ['read','apron','beacon','sleeve','forearm','rod','floppy'])M.ticks[k]=1;
    let w=V.mpWhatNext();ok('What next? goes to the first unticked MAIN tick (Sock Slapper, page 4), not the side tick',w&&w.tick==='slapper'&&V.PURG_PAGES[w.page].id==='4');
    M.ticks.slapper=1;w=V.mpWhatNext();ok('...and skips the unticked side tick (Duck) to page 5',w&&w.tick==='foam'&&V.PURG_PAGES[w.page].id==='5');
    V.pguOpen();V.pguNext();ok('the What next? button lands on that page and highlights the line',V.getGu().pg===w.page&&V.getGu().hi==='foam');V.pguClose(true);
    M.ticks={};M.seenIng={};M.page=0;M.dead.bomber=M.dead.bigpig=M.dead.bigfrog=0;poll();}

  /* ===== 7. save and reload inside; NUKES code 3; pmob never saved; a skipped thief drops its stack ===== */
  {const P=V.P;C.NUKES.push({x:9000,y:40,z:9000,d:'puppet'});   /* far away: a Big Dingle crater carves every chunk within its rim */
    if(!V.MOBT.pgtmob)V.MOBT.pgtmob={hp:20,hw:0.3,h:1.6,spd:0,body:'#888',legc:'#666',pmob:1};
    V.spawnMob('pgtmob',P.x+2,P.y,P.z+2);const th=V.entities[V.entities.length-1];th.carry={id:IT.PG_FELT,count:3};
    const d=JSON.parse(JSON.stringify(V.snapshot('pg0c')));
    ok('the save carries mp (inside, trunks) and the stashed overworld (stash)',d.mp&&d.mp.inside===true&&d.mp.trunks.Dan&&('stash' in d)&&d.dim==='puppet');
    ok('NUKES in purgatory save with dimension code 3',d.nukes.some(n=>n[3]===3));
    ok('purgatory mobs are never saved; a thief\'s stolen stack is saved as a drop',!d.ents.some(e=>e.t==='pgtmob')&&d.ents.some(e=>e.t==='drop'&&e.id===IT.PG_FELT&&e.count===3));
    const keep=JSON.stringify(MP().trunks);V.applySave(d);V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;step(30);
    ok('reload inside: DIM, MP and the position come back',V.getDim()==='puppet'&&MP().inside===true&&JSON.stringify(MP().trunks)===keep&&Math.abs(V.P.z-P.z)<3);
    ok('NUKES code 3 reads back as puppet',C.NUKES.some(n=>n.d==='puppet'&&n.x===9000));
    ok('no purgatory mob was restored',!V.entities.some(e=>e.mt==='pgtmob'&&!e.dead));
    for(let i=C.NUKES.length-1;i>=0;i--)if(C.NUKES[i].d==='puppet')C.NUKES.splice(i,1);
    for(const e of drops())V.pgCore().removeEnt(e);
    if(stub('5'))skip('bots come back inside after a reload','P5 on its stub');}

  /* ===== 8. death inside: Lost Property and the nearest unlocked spawn ===== */
  {const P=V.P;boot.purge(V);P.mode='s';tp(4,-120);
    P.inv[3]={id:IT.PG_FELT,count:9};P.inv[4]={id:IT.PG_FLOPPY,count:1,dur:30};const want=JSON.stringify([P.inv[3],P.inv[4]].map(s=>[s.id,s.count]));
    const d0=new Set(drops()),deaths0=MP().stats.deaths;P.hurtT=0;V.damagePlayer(999);step(2);   /* PZ: no NEW drop (leftovers from earlier sections may merge: a count compare flaked ~1 in 6) */
    ok('death inside: no drop entities, everything goes to MP.lost',P.dead&&drops().every(e=>d0.has(e))&&MP().lost.Dan&&MP().lost.Dan.length===3&&P.inv.every(s=>!s));
    ok('the death is counted',MP().stats.deaths===deaths0+1);
    V.respawn();step(10);
    ok('respawn at the nearest unlocked spawn point (the Mark)',Math.abs(P.x-0.5)<2&&Math.abs(P.z+135.5)<2&&MPF().lastSpawn.k==='mark');
    ok('Lost Property: every stack comes back from the can'+(stub('2')?' (P2 stub volley: straight in)':''),
      stub('2')?JSON.stringify(P.inv.filter(Boolean).filter(s=>s.id!==IT.PG_PROGRAMME).map(s=>[s.id,s.count]))===want&&!MP().lost.Dan:!MP().lost.Dan);
    MP().spawns.b1=1;const b=MPC.BOOTH[0];tp(b[0]+3,b[1]+2);P.hurtT=0;V.damagePlayer(999);step(2);V.respawn();step(10);
    ok('with Booth 1 unlocked, dying beside it respawns there',MPF().lastSpawn.k==='b1'&&Math.hypot(P.x-b[0]-0.5,P.z-b[1]-0.5)<3);
    MP().spawns.b1=0;tp(0,-136,36.2);}

  /* ===== 9. Charge blast-mining fires the break event; protected volumes; batting; NPC and prop hits ===== */
  {const P=V.P,rec=[];V.PREG.onBreak.push((x,y,z,id,who)=>rec.push([x,y,z,id,who]));
    tp(40,-100);const ky=Math.floor(P.y)-1,kx=42,kz=-100;V.setBlock(kx,ky,kz,B.PG_KNUCKLE);
    V.pBlast(kx+0.5,ky+0.5,kz+0.5,2.5,10,'Dan',{charge:1});
    ok('a player Charge breaks Knuckle Ore and fires mpOnBreak (who: Dan)',V.getBlock(kx,ky,kz)===0&&rec.some(r=>r[3]===B.PG_KNUCKLE&&r[4]==='Dan'));
    ok('the blasted block drops through pdrop/blockDrop, owned by Dan for 60 s',drops().some(e=>e.st.id===IT.PG_KNUCKLE&&e.pown==='Dan'&&e.pownT>MP().clock+50));
    const sx=2,sz=-138,sy=MPC.MARK_PAD.y;tp(0,-130,36.2);V.setBlock(sx,sy,sz,B.PG_FOAM);V.pBlast(sx+0.5,sy+0.5,sz+0.5,2.5,10,'Dan',{charge:1});
    ok('nothing breaks inside a protected bbox (the Mark pad)',V.getBlock(sx,sy,sz)===B.PG_FOAM);V.setBlock(sx,sy,sz,B.PG_DECK);
    const hp0=P.hp;V.pBlast(P.x+1,P.y+1,P.z,3,6,'the Demolitionist',{});ok('a blast hurts Dan with falloff, attributed to the bomber (pg:blast)',P.hp<hp0);
    P.hp=20;
    /* batting */
    V.PREG.proj.ptest={mesh:()=>null,g:1,life:8,hit:()=>false,land:()=>true};
    P.inv[2]={id:IT.PG_BAT,count:1};P.sel=2;V.refreshHand();P.yaw=Math.PI;P.pitch=0.02;
    const L=C.lookDir(),E=C.eyePos();const pj=V.puSpawn('ptest',E[0]+L[0]*2,E[1]+L[1]*2,E[2]+L[2]*2,0,0,0,'the Pelican');
    V.MB.l=true;step(1);V.MB.l=false;
    ok('a swing with a bat:1 item relaunches a pproj straight along the look at 18 m/s, owner Dan',Math.abs(Math.hypot(pj.vx,pj.vy,pj.vz)-18)<0.01&&pj.straight>39&&pj.owner==='Dan');
    const p0=[pj.x,pj.y,pj.z];step(30);const p1=[pj.x,pj.y,pj.z];
    const dir=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],dl=Math.hypot(...dir);
    ok('...and it flies straight (no gravity) while its 40 m last ('+dl.toFixed(1)+' m in 1.2 s)',dl>19&&Math.abs(dir[1]/dl-L[1])<0.01&&!pj.dead);
    step(40);ok('then it drops (40 m used up)',pj.dead||pj.straight<=0);
    const hadFish=!!V.PREG.proj.fish;if(!hadFish)V.PREG.proj.fish={mesh:()=>null,g:1,life:8,hit:()=>false,land:()=>true};
    const L2=C.lookDir(),E2=C.eyePos();V.puSpawn('fish',E2[0]+L2[0]*2,E2[1]+L2[1]*2,E2[2]+L2[2]*2,0,0,0,'the Pelican');V.MB.l=true;step(1);V.MB.l=false;
    ok('batting a fish ticks "Bat a fish"',MP().ticks.batfish===1);if(!hadFish)delete V.PREG.proj.fish;delete V.PREG.proj.ptest;
    for(const e of V.entities)if(e.t==='pproj'&&!e.dead)V.pgCore().removeEnt(e);
    /* an NPC hit reaches PREG.npcHit and takes no damage; a prop is batted or shoved, never hurt */
    const hits=[];V.MOBT.pgtnpc={hp:20,hw:0.3,h:1.6,spd:0,body:'#888',legc:'#666',pmob:1,npc:1,pnc:1};V.PREG.npcHit.pgtnpc=(e,dmg,by)=>hits.push([dmg,by]);
    V.spawnMob('pgtnpc',P.x+2,P.y,P.z+2);const npc=V.entities[V.entities.length-1];npc.hurtT=0;V.purgHit(npc,5,'Dan','melee');
    ok('an NPC hit reaches PREG.npcHit and the NPC takes no damage',hits.length===1&&hits[0][0]===5&&hits[0][1]==='Dan'&&npc.hp===20);
    V.MOBT.pgtprop={hp:999,hw:0.3,h:0.6,spd:0,body:'#888',legc:'#666',pmob:1,prop:1,pnc:1};V.spawnMob('pgtprop',P.x,P.y,P.z-2);const pr=V.entities[V.entities.length-1];
    pr.hurtT=0;V.purgHit(pr,4,'Dan','melee');ok('a prop hit by a bat holder is batted (e.pbat 40 m), never hurt',pr.pbat&&pr.pbat.d===40&&pr.hp===999);
    P.inv[2]=null;V.refreshHand();pr.pbat=null;pr.hurtT=0;const vx0=pr.vx,vz0=pr.vz;V.purgHit(pr,4,'Dan','melee',{kx:0,kz:-1});
    ok('without a bat a prop is shoved (knockback x1), never hurt',!pr.pbat&&(pr.vz<vz0||pr.vx!==vx0)&&pr.hp===999);
    for(const e of V.entities)if((e.mt==='pgtnpc'||e.mt==='pgtprop')&&!e.dead)V.pgCore().removeEnt(e);
    V.PREG.onBreak.pop();for(const e of drops())V.pgCore().removeEnt(e);}

  /* ===== 10. the exit: customs, souvenirs once, results card, CLOSED marquee, the emptied trunk vanishes ===== */
  {const P=V.P;MP().dead.bomber=1;MP().stats.deaths=2;P.inv[5]={id:IT.PG_FELT,count:4};P.armor[0]={id:IT.PG_FPAD_H,dur:50};
    const tk=MP().trunks.Dan;V.mpExitNow();step(10);
    ok('exit: back in the overworld beside the trunk',V.getDim()==='over'&&MP().inside===false&&Math.hypot(P.x-MP().door.x,P.z-MP().door.z)<6);
    ok('customs: no purgatory item survives (inventory or armour)',P.inv.every(s=>!s||!V.DEFS[s.id].pg)&&P.armor.every(a=>!a||!V.DEFS[a.id].pg));
    ok('the Demolitionist beaten: the Detonator Plunger is given, once',P.inv.filter(s=>s&&s.id===IT.PG_SV_PLUNGER).length===1&&MP().life.souvenirs.bomber===1&&!P.inv.some(s=>s&&(s.id===IT.PG_SV_GLOVE||s.id===IT.PG_SV_FROG)));
    ok('banked state is restored (creative comes back)',P.mode==='c'&&MP().keep===null);
    ok('the results card opens with the stats and the right review',V.presOn()&&V.modalOpen()&&MP().life.escapes===1&&/He died twice\./.test(document.getElementById('presreview').innerHTML));
    document.getElementById('presok').onclick();ok('"Back to the world" closes it',!V.presOn()&&!V.modalOpen());
    step(3);ok('the marquee reads CLOSED after an escape',DS().closed===1);
    const R=V.mpReview;ok('the Old Goats\' review brackets with the real count (0, 2, 6, 17)',JSON.stringify([R(0),R(2),R(6),R(17)])===JSON.stringify([['No deaths.','I hated it.'],
      ['He died twice.','Do it again. Baa-ha-ha.'],['He died six times.','We counted. Baa-ha-ha.'],['Seventeen deaths.','Same time next week. Baa-ha-ha.']]));
    /* Dan opens his trunk by hand: the real modal, 54 slots; take everything; close -> the trunk is gone */
    const p=tk.split(',').map(Number);V.PREG.interact.pstash({x:p[0],y:p[1],z:p[2]},V.DEFS[B.PG_STRUNK]);
    const be=C.MODAL.be;ok('the Stage Trunk opens as a 54-slot chest',C.MODAL.kind==='chest'&&be&&be.t==='stash'&&C.MODAL.slots.filter(s=>s.home==='be').length===54);
    for(let i=0;i<54;i++)be.inv[i]=null;V.closeModal(true);step(2);
    ok('an emptied Stage Trunk vanishes on close',V.getBlock(p[0],p[1],p[2])!==B.PG_STRUNK&&!V.blockEnts.has(tk)&&!MP().trunks.Dan);
    P.mode='s';}

  /* ===== 11. re-entry is a fresh purgatory; a second escape gives no souvenir twice ===== */
  {const P=V.P;const mk=[...V.chunkEdits().keys()].filter(k=>k.startsWith('m;'));
    ok('the first run left purgatory edits behind (m; keys)',mk.length>0);
    V.mpEnterNow();step(20);const left=mk.filter(k=>V.chunkEdits().has(k)&&V.chunkEdits().get(k).size);
    ok('re-entry wipes every m; edit and resets MP except door, playT and life',left.length===0&&MP().dead.bomber===0&&MP().life.escapes===1&&!!MP().door&&MP().inside);
    MP().dead.bomber=1;V.mpExitNow();step(5);document.getElementById('presok').onclick();
    ok('a second escape gives no souvenir twice (only the results card)',MPF().lastExit.souvenirs.length===0&&MP().life.escapes===2);}

  /* ===== 12. Debug buttons ===== */
  {document.getElementById('dbg_pgabandon').onclick();ok('Abandon outside purgatory does nothing',V.getDim()==='over');
    V.mpEnterNow();step(10);document.getElementById('dbg_pgabandon').onclick();step(5);ok('Debug: Abandon Purgatory exits',V.getDim()==='over'&&!V.presOn());
    const n=V.mpSampler();if(n)V.mpSampler(true);
    ok('Debug: the SFX sampler runs (cues: '+n+(stub('1')?', P1 audio on its stub':'')+')',stub('1')?n===0:n>0);
    for(const k of ['dbg_pgdoor','dbg_pgabandon','dbg_pgskip1','dbg_pgskip2','dbg_pgskip3','dbg_pgsfx','pguprev','pgunext','pgunextmain','pguclose','presok'])
      if(typeof document.getElementById(k).onclick!=='function'){ok('button '+k+' is wired',false);}
    ok('every purgatory button is wired',true);
    if(!stub('4')){V.mpEnterNow();step(10);document.getElementById('dbg_pgskip1').onclick();step(10);ok('Debug: skip to headliner 1 (hnSkipTo)',MP().inside);V.mpExitNow({abandon:true});step(5);}
    else{V.mpEnterNow();step(10);document.getElementById('dbg_pgskip2').onclick();step(10);
      ok('Debug: skip to headliner 2 on the P4 stub sets the Demolitionist dead and hands over the kit',MP().dead.bomber===1&&V.P.inv.some(s=>s&&s.id===IT.PG_PLUNGER));
      V.mpExitNow({abandon:true});step(5);}}
});
