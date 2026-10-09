/* m1_smoke.js (M1, gate x2): THE BITE in behaviour (MALGORATH_PLAN.md 8.1 acceptance, bible 2-4, 7.6, 7.10, 8.0, 15).
   The fight is replaced by a recording double (MGREG.fight) wherever the world's own rules are under test, so these checks hold with
   M2 on its stub or real; the last section runs the real one.
   1 the stamp in a live world (ocean seed), the sea-wall (and after his death the bedrock still holds) · 2 the eye: spawn, a real melee
   poke, 2 pokes in 12 s wake, one does not, a bot's does not, the shut eye ignores pokes, outside is outside · 3 the offering · 4 the
   egg in the Bite (survival uses it, creative keeps it) · 5 the plate wake once met · 6 the door · 7 the table clearing · 8 anyone's
   block eaten after 3 s (2 s in an inhale) with the +2 feed, water slurped after 1 s · 9 placement and protection · 10 the height band
   at smoke's burn spot · 11 the Pen's cows · 12 every transition L0 -> Ldead under the 250-cell cap, the live world = the classifier ·
   13 save + reload mid-R2 · 14 Ldead is permanent · 15 an orphaned chest's stacks come back at the Bone Pile · 16 a ridden dragon
   refuses the lip · 17 a land seed's approach stair · 18 a mixed coast keeps the sea out · 19 safe cells · 20 a reset after damage ·
   20b a reset from another dimension · 21 the real fight (stub or real M2) wakes on the plate, clears the table, keeps the queue cap ·
   22 a bot left in the gut while he is dormant is tossed onto the Bone Pile. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const V=boot({});
const step=boot.stepper(700000);
const B=V.B,IT=V.IT,C=V.mgCore();
const M=()=>V.getMALG(),MF=()=>V.getMGF(),G1=()=>V.getMG1(),info=()=>V.mgInfo();
const sec=(name,fn)=>{try{fn();}catch(e){ok(name+' ran without throwing ('+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ').slice(0,300)+')',false);}};
const tp=(x,y,z)=>boot.tp(V,x,y,z);
const REAL=V.MGREG.fight;let calls=[],fed=0,inh=false;
const DBL={stub:0,tick(){},wake(c){calls.push(c);return true;},dormant(){},brain(e){if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);},preHurt(){return -1;},
  inhaling:()=>inh,onDie(){return false;},onRespawn(){},fed(k,n){fed+=n;}};
const useDbl=()=>{V.MGREG.fight=DBL;calls=[];fed=0;inh=false;};
const settleL=(n)=>{for(let i=0;i<(n||400)&&(V.mg1Busy()||G1().L!==V.mg1Want());i++)step(1);step(2);};
const world=(name,seed)=>{boot.world(V,name,seed||'1337',step);useDbl();V.GR.mobSpawn=false;V.forceChunksNear(1000,1000);V.forceChunksNear(960,1000);V.forceChunksNear(1040,1000);
  V.forceChunksNear(1000,960);V.forceChunksNear(1000,1040);boot.lip(V,step);};   /* Dan at the Bone Pile: the watcher runs only within 220 m */
const plateAt=(r,th)=>boot.bite(V,step,{r,th});
const cows=()=>V.entities.filter(e=>e.t==='mob'&&!e.dead&&e.mt==='cow'&&Math.abs(e.x-1000.5)<=3.6&&Math.abs(e.z-983.5)<=3.6).length;
const siteEdits=()=>{let n=0;for(const k of C.MGS){const ed=C.chunkEdits.get(k);if(!ed)continue;const cc=k.split(','),bx=+cc[0]*16,bz=+cc[1]*16;
  for(const lk of ed.keys()){const p=lk.split(',');if(V.mgSiteCell(bx+ +p[0],+p[1],bz+ +p[2]))n++;}}return n;};
const matches=(n)=>{const F=V.mgF(),GF=V.mgGF(),L=G1().L;let bad=0;for(let i=0;i<n;i++){const dx=((i*37)%49)-24,dz=((i*61)%49)-24;if(dx*dx+dz*dz>24*24)continue;
  const y=GF+((i*13)%24),want=V.mg1In(L,1000+dx,y,1000+dz);if(want>=0&&V.getBlock(1000+dx,y,1000+dz)!==want)bad++;}return bad;};

boot.run(async()=>{
  if(boot.mgStubbed('1')){skip('all M1 smoke','M1 is on its stub');return;}
  const F=()=>V.mgF(),G=()=>V.mgG(),GF=()=>V.mgGF();

  /* ===== 1. the stamp in a live world, the sea-wall ===== */
  world('m1a');
  sec('stamp',()=>{boot.lip(V,step);step(30);const F_=F(),G_=G(),GF_=GF();
    ok('seed 1337 live: the plate at F-1 (obsidian), the Cap and slit, the gut floor at GF-1/GF-2, the lip at G-1 (L0 dormant)',G1().L==='L0'&&
      V.getBlock(986,F_-1,1000)===B.OBSIDIAN&&V.getBlock(1000,F_-1,1000)===B.AIR&&V.getBlock(1000,F_-2,1000)===B.BEDROCK&&V.getBlock(1003,F_-1,1000)===B.BEDROCK&&
      V.getBlock(1000,GF_-1,1012)===B.SOULSAND&&V.getBlock(1000,GF_-2,1012)===B.BEDROCK&&V.getBlock(961,G_-1,1000)===B.NBRICK);
    let wet=0,holes=0;for(let k=0;k<96;k++){const a=k*Math.PI/48,rw=V.mgRw(a);
      for(let r=0;r<rw-0.6;r+=1.5){const x=Math.floor(1000.5+Math.cos(a)*r),z=Math.floor(1000.5+Math.sin(a)*r);for(let y=GF_-2;y<=G_+2;y++)if(V.getBlock(x,y,z)===B.WATER)wet++;}
      for(const dr of [0.4,1.4,2.4]){const x=Math.floor(1000.5+Math.cos(a)*(rw+dr)),z=Math.floor(1000.5+Math.sin(a)*(rw+dr));const c=V.mg1Col(x-1000,z-1000);if(c.zone!==2)continue;
        for(let y=GF_-2;y<=G_-1;y++){const b=V.getBlock(x,y,z);if(b===B.AIR||b===B.WATER)holes++;}}}
    ok('no sea inside the Bite (96 rays, GF-2..G+2), and the skin is solid from the gut floor to the lip all the way round (no water path)',wet===0&&holes===0);
    let old=0;for(let dx=-24;dx<=24;dx++)for(let dz=-24;dz<=24;dz++)for(let y=GF_;y<=F_+10;y++){const b=V.getBlock(1000+dx,y,1000+dz);if(b===B.LAVA||b===(B.SBRICK||73))old++;}
    ok('the v2.1 arena is gone (no lava moat, no stone-brick floor anywhere in the plate disc)',old===0);
    ok('the compass target is "Malgorath\'s Bite" at the fixed point 1000.5, 1000.5',C.CMP_DEFS[5].n==="Malgorath's Bite"&&V.cmpFind('demon').x===1000.5);});

  /* ===== 2. the eye ===== */
  sec('eye',()=>{plateAt(2.2,Math.PI/2);step(5);const e=V.MGREG.world.eye();
    ok('L0, Dan on the Cap within 24 m: the eye (mgeye) watches from the slit; it is his, hidden from bots, never saved',!!e&&e.mt==='mgeye'&&Math.abs(e.x-1000.5)<0.01&&e.y<F()&&e.y>F()-1.2&&
      e.mgNoBot===1&&!V.snapshot('e').ents.some(q=>q.t==='mgeye'));
    ok('...and it tracks Dan (look target at his eye)',Array.isArray(e.mgLook)&&Math.abs(e.mgLook[1]-(V.P.y+V.P.eyeY))<0.01);
    const p0=G1().pokes||0;boot.aim(V,e.x,e.y+0.35,e.z);V.MB.l=true;step(1);V.MB.l=false;step(3);
    ok('a real melee swing at the eye is a poke (Dan, from the plate)',(G1().pokes||0)===p0+1&&calls.length===0&&G1().eye.shut>0);
    V.mgHitAs(e,5,'Dan','melee');ok('the eye is squeezed shut for 0.5 s: a poke then does nothing',calls.length===0);
    step(20);V.mgHitAs(e,5,'Dan','melee');step(2);
    ok('a second poke within 12 s wakes him: fight.wake(\'poke\')',calls.join()==='poke');
    calls=[];G1().eye.n=0;V.mgHitAs(e,5,'BunkerBrad','melee');step(20);V.mgHitAs(e,5,'BunkerBrad','arrow');step(2);
    ok('a bot\'s hits on the eye never count (only Dan can summon)',calls.length===0&&G1().eye.n===0);
    V.mgHitAs(e,5,'Dan','melee');step(13*25);V.mgHitAs(e,5,'Dan','melee');step(2);
    ok('two pokes 13 s apart do not wake him (the second is a first poke again)',calls.length===0&&G1().eye.n===1);
    boot.lip(V,step);step(20);G1().eye.n=0;const e2=V.MGREG.world.eye();
    ok('from the Bone Pile (outside, 42 m): no eye at all (24 m), so nothing to poke from outside',!e2);});

  /* ===== 3. the offering ===== */
  sec('offering',()=>{world('m1b');plateAt(3,Math.PI/2);step(5);calls=[];
    V.spawnDrop(1000.5,F()-0.3,1000.5,{id:B.COBBLE,count:3},0,0,0);step(4);
    ok('a stack dropped into the slit is gulped: fight.wake(\'offer\'), MALG.offer holds it, the drop is gone',calls.join()==='offer'&&M().offer&&M().offer.id===B.COBBLE&&M().offer.count===3&&
      !V.entities.some(q=>q.t==='drop'&&!q.dead&&q.st.id===B.COBBLE&&Math.hypot(q.x-1000.5,q.z-1000.5)<1.5));});

  /* ===== 4. the egg ===== */
  sec('egg',()=>{world('m1c');plateAt(12,Math.PI);const P=V.P;P.inv[0]={id:264,count:2};P.sel=0;V.refreshHand();calls=[];
    P.pitch=-1.2;V.MB.r=true;step(1);V.MB.r=false;step(3);
    ok('the MALGORATH egg used inside the Bite (dormant) is an offering: fight.wake(\'egg\'), used up in survival',calls.join()==='egg'&&P.inv[0]&&P.inv[0].count===1);
    P.mode='c';calls=[];step(10);V.MB.r=true;step(1);V.MB.r=false;step(3);
    ok('...and kept in creative',calls.join()==='egg'&&P.inv[0].count===1);P.mode='s';});

  /* ===== 5. the plate wake once met ===== */
  sec('plate',()=>{world('m1d');M().met=1;settleL();ok('met: the layout is L1 (the Cap is gone: the Throat is open)',G1().L==='L1'&&V.getBlock(1000,F()-1,1003)===B.AIR);
    calls=[];tp(1000.5-30,F()+4,1000.5);step(15);
    ok('standing on the stair (outside the arena) does not wake him',calls.length===0&&V.mgZone(V.P.x,V.P.y,V.P.z)!=='arena');
    tp(1000.5-22,F(),1000.5);step(3);
    ok('stepping onto the plate does: fight.wake(\'plate\')',calls[0]==='plate');});

  /* ===== 6. the door ===== */
  sec('door',()=>{const W=V.MGREG.world,F_=F();boot.lip(V,step);
    const cells=[];for(let dx=-28;dx<=-24;dx++)for(let dz=-2;dz<=2;dz++){const c=V.mg1Col(dx,dz);if(c.door)for(let y=F_-3;y<=F_+3;y++)if(V.getBlock(1000+dx,y,1000+dz)!==B.AIR)cells.push([1000+dx,y,1000+dz]);}
    const n=W.door(false);step(3);
    ok('world.door(false): steps 0-2 and their rails crumble ('+n+' cells), step 3 still stands, the plate edge still stands',n===cells.length&&n>20&&cells.every(c=>V.getBlock(c[0],c[1],c[2])===B.AIR)&&
      V.getBlock(971,F_+2,1000)===B.NBRICK&&V.getBlock(976,F_-1,1000)!==B.AIR);
    const d=V.snapshot('door');ok('the broken door is never saved (site edits are his while he lives)',!Object.keys(d.edits).some(k=>C.MGS.has(k)&&Object.keys(d.edits[k]).some(lk=>{const p=lk.split(',');return V.mgSiteCell(+k.split(',')[0]*16+ +p[0],+p[1],+k.split(',')[1]*16+ +p[2]);})));
    W.door(true);step(3);ok('world.door(true): whole again, and nothing of it left as an edit',cells.every(c=>V.getBlock(c[0],c[1],c[2])!==B.AIR)&&siteEdits()===0);});

  /* ===== 7. the table clearing ===== */
  sec('table',()=>{const W=V.MGREG.world,F_=F(),GF_=GF();const put=[];
    for(let i=0;i<20;i++){const x=1000-20+((i*3)%12),z=1000+((i*5)%9)-4,y=i<12?F_:(i<16?GF_+2:F_+6);if(V.getBlock(x,y,z)!==B.AIR)continue;V.setBlock(x,y,z,B.COBBLE);if(V.getBlock(x,y,z)===B.COBBLE)put.push([x,y,z]);}
    const n=W.clearTable();step(3);
    ok('the door-shut beat: every block built in advance inside the volume ('+put.length+': plate, gut, over the void) streams into his mouth, no edit left',put.length>=18&&n===put.length&&
      put.every(c=>V.getBlock(c[0],c[1],c[2])===B.AIR)&&siteEdits()===0&&fed===0);});

  /* ===== 8. "show me what you built", liquids ===== */
  sec('eat',()=>{const F_=F();plateAt(15,Math.PI);MF().live=1;fed=0;const x=984,z=1003;
    V.setBlock(x,F_,z,B.COBBLE);let t=0,gone=-1;for(;t<200;t++){step(1);if(V.getBlock(x,F_,z)===B.AIR){gone=t*0.04;break;}}
    ok('a block placed on the plate during a live round glows for 3 s and is eaten (gone after '+gone.toFixed(2)+' s), +2 to him (fight.fed)',gone>=2.9&&gone<=3.25&&fed===2&&siteEdits()===0);
    inh=true;V.setBlock(x,F_,z,B.COBBLE);gone=-1;for(t=0;t<200;t++){step(1);if(V.getBlock(x,F_,z)===B.AIR){gone=t*0.04;break;}}inh=false;
    ok('during an inhale it is ripped off after 2 s ('+gone.toFixed(2)+' s)',gone>=1.9&&gone<=2.25);
    V.setBlock(x+3,F_+2,z,B.COBBLE);V.setBlock(x+3,F_+1,z,B.COBBLE);V.setBlock(x+3,F_,z,B.COBBLE);step(10);
    ok('the glow: violet boxes over the blocks while they wait',G1().glow.filter(m=>m.visible).length===3);step(100);
    V.setBlock(x,F_,z,B.WATER);gone=-1;for(t=0;t<120;t++){step(1);if(V.getBlock(x,F_,z)!==B.WATER){gone=t*0.04;break;}}step(80);
    let wet=0;for(let dx=-6;dx<=6;dx++)for(let dz=-6;dz<=6;dz++)for(let y=F_-1;y<=F_+1;y++)if(V.getBlock(x+dx,y,z+dz)===B.WATER)wet++;
    ok('water poured on the plate is slurped after 1 s ('+gone.toFixed(2)+' s), and what flowed with it too',gone>=0.9&&gone<=1.45&&wet===0&&G1().slurped>=1);
    MF().live=0;step(2);});

  /* ===== 9. placement and protection ===== */
  sec('protection',()=>{const F_=F(),G_=G(),x=985,z=1000;
    ok('inside the Bite: chests, furnaces, beds, shelves, easels and jukeboxes are refused (spat back)',[B.CHEST,B.FURNACE,77,92,213,215].every(id=>V.mgPlaceOK(x,F_,z,id)===false));
    ok('...TNT, a crafting table and plain blocks are allowed (then eaten)',V.mgPlaceOK(x,F_,z,B.TNT)===true&&V.mgPlaceOK(x,F_,z,B.CRAFT)===true&&V.mgPlaceOK(x,F_,z,B.COBBLE)===true);
    ok('no portal lights anywhere in the site',V.tryIgnitePortal(x,F_,z,B.OBSIDIAN,B.PORTAL_N||85)===false);
    const lip=[961,G_-1,1000],heap=[955,G_,998],tread=[970,F_+3,1000];const was=[lip,heap,tread].map(c=>V.getBlock(...c));[lip,heap,tread].forEach(c=>V.setBlock(c[0],c[1],c[2],B.AIR));
    ok('his lip, the Bone Pile heap and the stair treads cannot be broken while he lives',[lip,heap,tread].every((c,i)=>V.getBlock(...c)===was[i]&&was[i]!==B.AIR));
    V.setBlock(959,G_,1000,B.COBBLE);V.setBlock(959,G_,1000,B.AIR);ok('a block Dan placed on the pad comes off again',V.getBlock(959,G_,1000)===B.AIR);
    const W=V.MGREG.world;ok('his bites never take bedrock (a spire) unless it topples',W.eat(1011,F_+1,1011,'bite')===false&&W.eat(1011,F_+4,1011,'topple')===true);step(2);
    W.reset(M().round);settleL();});

  /* ===== 10. the height band at smoke's burn spot ===== */
  sec('band',()=>{world('m1e');for(const e of V.entities)if(e.t==='mob'&&e.mt==='cow')V.mgCore().removeEnt(e);V.GR.god=true;tp(1000.5,71,1000.5);for(let i=0;i<60;i++){V.P.y=71;V.P.vy=0;step(1);}V.GR.god=false;
    ok('Dan 39 m above the Bite (smoke\'s burn spot): out of the band: no eye, no cows, no wake',!V.MGREG.world.eye()&&cows()===0&&calls.length===0&&info().band===0);});

  /* ===== 11. the Pen's cows ===== */
  sec('cows',()=>{plateAt(10,Math.PI);step(25*7);
    ok('near the Bite in L0 the Pen holds '+cows()+' cows (topped up to 4, never more)',cows()===4);step(25*3);ok('...still 4',cows()===4);});

  /* ===== 12. every transition, the 250-cell cap, the live world = the classifier ===== */
  sec('layouts',()=>{G1().maxFrame=0;const seq=[['L1',()=>{M().met=1;}],['L2',()=>{M().round=2;}],['L3',()=>{M().round=3;}],['Ldead',()=>{M().dead=1;V.getDEMON().dead=true;}]];
    const res=[];for(const [L,fn] of seq){fn();settleL(600);res.push(L+':'+(G1().L===L)+'/'+matches(1200));}
    ok('L0 -> L1 -> L2 -> L3 -> Ldead each follow the checkpoint and leave the live plate disc exactly as the classifier says ('+res.join(' ')+')',res.every(s=>/:true\/0$/.test(s)));
    ok('the Pen went with whatever cows were left (none in it after L2)',cows()===0);
    ok('the queue never wrote more than 250 cells in a frame (max '+G1().maxFrame+')',G1().maxFrame>0&&G1().maxFrame<=250);
    ok('in the dead layout the burial mound fills the gut (rubble at the centre up to F-4)',V.getBlock(1000,F()-4,1000)!==B.AIR&&V.getBlock(1000,F()-3,1000)===B.AIR);});

  /* ===== 13. save + reload mid-R2 ===== */
  sec('reload',()=>{world('m1f');M().met=1;M().round=2;settleL(600);plateAt(15,Math.PI);MF().live=1;const W=V.MGREG.world,F_=F();
    const bit=[];for(let i=0;i<20;i++){const x=985+(i%5),z=995+((i/5)|0);if(W.eat(x,F_-1,z,'test'))bit.push([x,F_-1,z]);}W.put(992,F_,1004,B.COBBLE);V.setBlock(984,F_,1000,B.DIRT);step(3);
    ok('mid-R2: his bites and rubble land (through the queue) and Dan\'s block stands',bit.length===20&&bit.every(c=>V.getBlock(...c)===B.AIR)&&V.getBlock(992,F_,1004)===B.COBBLE&&V.getBlock(984,F_,1000)===B.DIRT);
    const d=V.snapshot('m1f');MF().live=0;
    ok('the save holds the checkpoint (met, round 2) and not one edit inside the site',d.mg&&d.mg.round===2&&d.mg.met===1&&!Object.keys(d.edits).some(k=>C.MGS.has(k)&&Object.keys(d.edits[k]).some(lk=>{const p=lk.split(',');return V.mgSiteCell(+k.split(',')[0]*16+ +p[0],+p[1],+k.split(',')[1]*16+ +p[2]);})));
    V.applySave(JSON.parse(JSON.stringify(d)));useDbl();step(40);settleL();
    ok('reload: the Bite comes back as L2 (whole plate, the three scars), nothing he ate or Dan built is left, no site edit',G1().L==='L2'&&bit.every(c=>V.getBlock(...c)!==B.AIR)&&
      V.getBlock(992,F_,1004)===B.AIR&&V.getBlock(984,F_,1000)===B.AIR&&V.getBlock(1016,F_-1,1009)===B.AIR&&matches(1200)===0&&siteEdits()===0);});

  /* ===== 14. Ldead is permanent ===== */
  sec('dead',()=>{M().round=3;M().dead=1;V.getDEMON().dead=true;settleL(600);const F_=F();plateAt(15,Math.PI);V.setBlock(985,F_,1000,B.COBBLE);V.setBlock(985,F_-1,1001,B.AIR);
    const d=V.snapshot('dead');V.applySave(JSON.parse(JSON.stringify(d)));useDbl();step(40);settleL();
    ok('after his death the Bite is Ldead for good, and it is just terrain: Dan\'s block and Dan\'s hole survive a reload',G1().L==='Ldead'&&V.getDEMON().dead===true&&
      V.getBlock(985,F_,1000)===B.COBBLE&&V.getBlock(985,F_-1,1001)===B.AIR&&V.getBlock(1000,F_-4,1000)!==B.AIR);});

  /* ===== 15. an orphaned chest ===== */
  sec('orphan',()=>{world('m1g');boot.lip(V,step);const G_=G(),x=1000,y=G_,z=1040;V.forceChunksNear(x,z);step(20);
    V.setBlock(x,y,z,B.CHEST);V.ensureBE(x,y,z,'chest');const be=C.blockEnts.get(C.bkey(x,y,z));be.inv[0]={id:IT.DIAMOND,count:5};
    ok('a chest can stand on the lip (outside the volume)',V.getBlock(x,y,z)===B.CHEST&&!!be);
    const d=V.snapshot('orph');V.applySave(JSON.parse(JSON.stringify(d)));useDbl();boot.lip(V,step);step(25*4);
    const b=V.mg1BonePile(),dia=V.entities.filter(q=>q.t==='drop'&&!q.dead&&q.st.id===IT.DIAMOND&&Math.hypot(q.x-b.x,q.z-b.z)<6).reduce((n,q)=>n+q.st.count,0)+
      V.P.inv.reduce((n,s)=>n+(s&&s.id===IT.DIAMOND?s.count:0),0);
    ok('after a reload its block is gone (site edits are his) but its 5 diamonds come back at the Bone Pile, and the orphan is cleared',V.getBlock(x,y,z)!==B.CHEST&&dia===5&&!C.blockEnts.has(C.bkey(x,y,z)));});

  /* ===== 16. the dragon ===== */
  sec('dragon',()=>{const P=V.P;tp(1030.5,G()+4,1000.5);step(5);V.spawnMob('dragon',1030.5,G()+3,1000.5);const dr=V.entities[V.entities.length-1];dr.tame=true;P.ride=dr;step(1);
    const p=V.mgPol(P.x,P.z);ok('a ridden dragon refuses the lip: Dan is set down on the lip (no damage), the dragon backs off',!P.ride&&p.r>=V.mgRw(p.th)&&p.r<V.mgRw(p.th)+3&&P.y===G()&&!P.dead&&
      Math.hypot(dr.x-1000.5,dr.z-1000.5)>V.mgRw(p.th)+3);});

  /* ===== 17. a land seed: the approach stair ===== */
  sec('land',()=>{world('m1h','3');boot.lip(V,step);V.forceChunksNear(945,1000);step(30);const G_=G();
    let prev=G_,okS=true,met=false,hs=[];for(let dx=-46;dx>=-56;dx--){const h=V.surfaceTop(1000+dx,1000)+1;hs.push(h);if(Math.abs(h-prev)>1)okS=false;prev=h;
      if(h===V.colInfo(1000+dx,1000).h+1&&dx<-46){met=true;break;}}
    ok('land seed 3 (G '+G_+'): a stair steps from the Bone Pile pad to the natural ground one block at a time ('+hs.join(' ')+')',okS&&met);
    const b=V.mg1BonePile();ok('...and the respawn point stands on the pad, open to the sky',V.getBlock(Math.floor(b.x),G_-1,Math.floor(b.z))===B.NBRICK&&V.getBlock(Math.floor(b.x),G_,Math.floor(b.z))===B.AIR&&V.getBlock(Math.floor(b.x),G_+1,Math.floor(b.z))===B.AIR);});

  /* ===== 18. a mixed coast ===== */
  sec('coast',()=>{world('m1i','25');boot.lip(V,step);step(30);const G_=G(),GF_=GF();let wet=0;
    for(let k=0;k<96;k++){const a=k*Math.PI/48,rw=V.mgRw(a);for(let r=0;r<rw-0.6;r+=1.5){const x=Math.floor(1000.5+Math.cos(a)*r),z=Math.floor(1000.5+Math.sin(a)*r);
      for(let y=GF_-2;y<=G_+2;y++)if(V.getBlock(x,y,z)===B.WATER)wet++;}}
    ok('seed 25 (G '+G_+', a coast dipping under the sea): no water inside the Bite',wet===0);});

  /* ===== 19. safe cells ===== */
  sec('safe',()=>{world('m1j');plateAt(15,Math.PI);const W=V.MGREG.world,res=[];
    for(const [L,fn] of [['L1',()=>{M().met=1;}],['L2',()=>{M().round=2;}],['L3',()=>{M().round=3;}]]){fn();settleL(600);
      for(const [x,z] of [[1000.5,1000.5],[1016.5,1009.5],[1000.5,1023.5],[985.5,1000.5]]){const s=W.safeCell(x,z,{});const F_=F(),fx=Math.floor(s.x),fz=Math.floor(s.z);
        let firm=true;for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)if(i*i+j*j<=6.25&&V.getBlock(fx+i,F_-1,fz+j)===B.AIR)firm=false;
        res.push(V.getBlock(fx,F_-1,fz)!==B.AIR&&V.getBlock(fx,F_,fz)===B.AIR&&Math.hypot(s.x-1000.5,s.z-1000.5)>=6&&firm&&V.mgArena(s.x,s.y,s.z));}}
    ok('world.safeCell finds standing plate (or island) at least 6 m from him and 2.5 m from any hole, from anywhere, in L1, L2 and L3 ('+res.filter(Boolean).length+'/'+res.length+')',res.every(Boolean));});

  /* ===== 20. a reset after damage ===== */
  sec('reset',()=>{world('m1k');M().met=1;settleL();plateAt(15,Math.PI);const W=V.MGREG.world,F_=F();MF().live=1;
    for(let i=0;i<30;i++)W.eat(986+(i%6),F_-1-((i/6|0)%3),995+((i/18)|0),'test');W.door(false);for(let i=0;i<5;i++)V.setBlock(990+i,F_,990,B.COBBLE);step(4);
    const d0=siteEdits();MF().live=0;const n=W.reset(1);settleL();
    ok('world.reset(1) after a fight ('+d0+' site edits: bites, the door, Dan\'s blocks): '+n+' cells rewritten, the plate and the door whole, no site edit, nothing of his left in MGF.own',
      d0>=35&&n>=d0&&matches(1500)===0&&V.getBlock(975,F_-1,1000)===B.NBRICK&&siteEdits()===0&&[...MF().own].every(k=>!V.mgSiteCell(...k.split(',').map(Number))));});

  /* ===== 20b. a reset called from another dimension (the overworld chunks are unloaded there) ===== */
  sec('reset away',()=>{world('m1n');M().met=1;settleL();plateAt(15,Math.PI);const W=V.MGREG.world,F_=F();
    const bit=[];for(let i=0;i<10;i++){const x=985+(i%5),z=997+((i/5)|0);if(W.eat(x,F_-1,z,'test'))bit.push([x,F_-1,z]);}W.door(false);step(4);
    const d0=siteEdits();V.setDim('nether',100.5,64,100.5);step(5);W.reset(1);const d1=siteEdits();
    const b=V.mg1BonePile();V.setDim('over',b.x,b.y,b.z);V.forceChunksNear(1000,1000);step(40);settleL();
    ok('world.reset from the Nether purges the site ('+d0+' -> '+d1+' edits) and home again the plate and the door are whole',d0>=10&&d1===0&&bit.every(c=>V.getBlock(...c)!==B.AIR)&&
      V.getBlock(975,F_-1,1000)===B.NBRICK&&matches(1200)===0);});

  /* ===== 21. the real fight on top (M2 on its stub or real) ===== */
  sec('real',()=>{world('m1l');V.MGREG.fight=REAL;boot.lip(V,step);M().met=1;settleL();const F_=F();
    const pl=[];for(let i=0;i<6;i++){const x=984+i,z=997;if(V.getBlock(x,F_,z)===B.AIR){V.setBlock(x,F_,z,B.COBBLE);if(V.getBlock(x,F_,z)===B.COBBLE)pl.push([x,F_,z]);}}G1().maxFrame=0;
    plateAt(20,Math.PI);let t=0;for(;t<300&&!info().live;t++)step(1);for(let i=0;i<300&&V.getCUT().on;i++)step(1);step(30);
    ok('with the real fight ('+(boot.mgStubbed('2')?'M2 stub':'M2')+'): stepping onto the plate wakes him, the table is cleared ('+pl.length+' blocks), the queue stays under its cap',info().live===1&&
      pl.length===6&&pl.every(c=>V.getBlock(...c)===B.AIR)&&G1().maxFrame<=250);
    useDbl();});

  /* ===== 22. bots (last: they grief) ===== */
  sec('bots',()=>{world('m1m');M().met=1;settleL();if(V.BRAIN)Object.assign(V.BRAIN,{mock:null,ok:false,off:true});V.agJoinAll(false);step(10);
    const bots=V.AGENTS.filter(a=>a.e&&!a.dead);if(!bots.length){skip('bots in the gut','no agent joined');return;}
    const a=bots[0],GF_=GF(),t0=G1().tossed||0;a.e.x=a.x=1020.5;a.e.y=a.y=GF_;a.e.z=a.z=1000.5;a.e.vx=a.e.vy=a.e.vz=0;
    let f=0;for(;f<200&&(G1().tossed||0)===t0;f++)step(1);step(2);const b=V.mg1BonePile();
    ok('a bot left in the gut while he is dormant is fished out and tossed onto the Bone Pile (no wake, no damage)',Math.hypot(a.e.x-b.x,a.e.z-b.z)<6&&Math.abs(a.e.y-b.y)<3&&
      calls.indexOf('plate')<0&&!a.dead);});
});
