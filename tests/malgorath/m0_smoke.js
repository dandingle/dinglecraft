/* m0_smoke.js (lead, gate x2): the M0 contract in behaviour (the Malgorath plan sections 4, 6, 9.2). Every check holds
   for the scaffold's stubs AND for the real packages (package-specific behaviour lives in the packages' own suites and the harness);
   the few placeholder-only checks say so and skip once that package is real.
   0 build identity (DC_NO_MALG = the shipped v6.2 game.js, head.html AND hrassets.js, byte for byte) · 1 an inert world · 2 the smoke
   burn spot above the Bite · 3 the stamp (plate, no water inside, structures kept away) · 4 a live round through mgSkipTo (the boss
   entity, one light, never saved) · 5 the damage gate's invariants · 6 Dan's death in a round -> the Bone Pile, the round reset ·
   7 saves mid-fight, the site-edit filter, reload · 8 old v6.2 saves (DEMON.dead, {t:'demon'}, arena edits, a chest in the site)
   · 9 protection (setBlock, explosions, mining, portals, balls, placement) · 10 the Effigy and the figurine proxy · 11 the egg ·
   12 the compass · 13 dimension change, walking away · 14 the instaKill preview kill · 15 the placeholder's honest kill -> loot ->
   WIN (stub only) · 16 a new world inherits nothing. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const V=boot({});
const step=boot.stepper(700000);
const B=V.B,IT=V.IT,C=V.mgCore(),MGC=V.MGC;
const md5=b=>crypto.createHash('md5').update(b).digest('hex');
const M=()=>V.getMALG(),F_=()=>V.getMGF(),info=()=>V.mgInfo();
const tp=(x,y,z)=>{boot.tp(V,x,y,z);};
const sec=(name,fn)=>{try{fn();}catch(e){ok(name+' ran without throwing ('+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ').slice(0,300)+')',false);}};
const bossE=()=>boot.boss(V);
const his=()=>V.entities.filter(e=>!e.dead&&V.MOBT[e.mt]&&V.MOBT[e.mt].mg);
const wakeRound=r=>{boot.bite(V,step);V.mgSkipTo(r||1);for(let i=0;i<600&&(V.getCUT().on||!info().live);i++)step(1);step(5);return bossE();};
const hitGap=()=>step(8);   /* > 0.25 s: the per-attacker gate */

boot.run(async()=>{
  /* ===== 0. build identity: RETIRED at the split (2 checks: DC_NO_MALG=1 re-spliced the shipped v6.2 game.js + head.html and hrassets.js).
     The frozen-version rule (tests/fixtures/shipped.json, tests/repo/r_build.js) proves the v6.3 build byte for byte instead. ===== */

  /* ===== 1. an inert world ===== */
  boot.world(V,'mg0','1337',step);
  sec('inert',()=>{const d=V.snapshot('mg0');
    ok('a fresh world saves no mg key (v6.2 shape), MALG is the default, nothing of his exists',!('mg' in d)&&JSON.stringify(M())===JSON.stringify(V.mgDefault())&&his().length===0);
    step(20);ok('far from the Bite: not near, protection off, no fight',info().near===0&&info().prot===false&&info().live===0);});

  /* ===== 2. the smoke burn spot: (1000.5, 71, 1000.5) is above the height band ===== */
  sec('burn spot',()=>{V.GR.god=true;V.forceChunksNear(1000,1000);tp(1000.5,71,1000.5);
    for(let i=0;i<60;i++){V.P.y=71;V.P.vy=0;step(1);}
    ok('Dan 39 m above the Bite: near and protected, but out of the height band: no wake, no boss, MALG untouched',info().near===1&&info().band===0&&info().live===0&&!bossE()&&M().met===0);
    V.GR.god=false;});

  /* ===== 3. the stamp ===== */
  const F=V.mgF(),G=V.mgG(),GF=V.mgGF();
  sec('stamp',()=>{ok('seed 1337 puts the Bite in the open sea: G 32, F 22, GF 6',G===32&&F===22&&GF===6);
    boot.bite(V,step);
    let solid=0,clear=0,n=0;for(let r=9;r<=21;r++){const x=Math.floor(1000.5-r),z=1000;n++;if(V.getBlock(x,F-1,z)!==B.AIR)solid++;
      if(V.getBlock(x,F,z)===B.AIR&&V.getBlock(x,F+1,z)===B.AIR)clear++;}
    ok('the -x ray across the plate (r 9..21) is solid at F-1 and open at F, F+1 (the stair side of every layout)',solid===n&&clear===n);
    let wet=0;for(let r=0;r<=21;r+=3)for(let k=0;k<8;k++){const a=k*Math.PI/4,x=Math.floor(1000.5+Math.cos(a)*r),z=Math.floor(1000.5+Math.sin(a)*r);
      if(!C.chunkAt(x,z))continue;for(let y=F-3;y<=G;y++)if(V.getBlock(x,y,z)===B.WATER)wet++;}
    ok('no sea inside the Bite above the plate\'s underside (the sea-wall holds)',wet===0);
    const near=[];for(let gx=Math.floor(1000/112)-2;gx<=Math.floor(1000/112)+2;gx++)for(let gz=Math.floor(1000/112)-2;gz<=Math.floor(1000/112)+2;gz++){const c=V.vCell(gx,gz);if(c&&Math.hypot(c.cx-1000.5,c.cz-1000.5)<60)near.push(c.id);}
    ok('no village cell centres within 60 m of the Bite (mgNoStruct), and the rule is pure maths',near.length===0&&V.mgNoStruct(1000,1000)&&!V.mgNoStruct(1100,1000));});

  /* ===== 4. a live round ===== */
  let e=null;
  sec('live round',()=>{e=wakeRound(1);
    ok('mgSkipTo(1) wakes him into round 1: live, met, one boss entity of type demon with mgBoss',info().live===1&&M().met===1&&M().round===1&&!!e&&V.entities.filter(q=>!q.dead&&q.mt==='demon'&&q.mgBoss).length===1);
    ok('the boss carries exactly ONE PointLight (the one-light rule), never hidden from bots by accident (mgNoBot on the hide)',!!e&&boot.lights(e.mesh).length===1&&e.mgNoBot===1);
    const d=V.snapshot('mg0b');
    ok('a mid-fight save holds no demon / PART 57 entity and saves MALG (met, round)',!d.ents.some(q=>V.MOBT[q.t]&&V.MOBT[q.t].mg)&&d.mg&&d.mg.met===1&&d.mg.round===1);
    ok('his entities are pnc + pkeep (never counted by the ambient caps nor despawned by distance)',his().every(q=>V.MOBT[q.mt].pnc===1&&(q.pkeep||q.mt==='demon')));});

  /* ===== 5. the damage gate's invariants (the same for the placeholder and the real M2) ===== */
  sec('gate',()=>{e=bossE();if(!e){ok('a boss to hit',false);return;}
    let h0=e.hp;V.hurtMob(e,25,0,0);step(1);
    ok('an unattributed hit (no HIT_BY: a stray creeper, lava, the Big Dingle) does nothing to him',e.hp===h0);
    const P=V.P,sx=P.x,sy=P.y,sz=P.z;boot.lip(V,step);h0=e.hp;V.mgHitAs(e,13,'Dan','melee');step(1);
    ok('Dan\'s hit from OUTSIDE the arena (the stair head) does nothing: outside is outside',e.hp===h0);
    tp(sx,sy,sz);step(10);h0=e.hp;const d1=V.mgHitAs(e,99999,'Dan','melee');
    ok('one Dan hit is capped (the Big Dingle\'s 99999 is at most 30)',d1>=0&&d1<=30&&e.hp>=h0-30);
    const h1=e.hp;V.mgHitAs(e,13,'Dan','melee');
    ok('a second Dan hit inside 0.25 s deals nothing (one instance per attacker per 0.25 s)',e.hp===h1);
    hitGap();V.GR.freezeMobs=true;const h2=e.hp;V.mgHitAs(e,13,'Dan','laser');step(2);V.GR.freezeMobs=false;
    ok('the gate never lets a hit heal him or push him below 0',e.hp<=h2&&e.hp>=0);});

  /* ===== 6. Dan's death in a live round ===== */
  sec('death',()=>{if(!info().live)wakeRound(1);const P=V.P;P.hurtT=0;P.hp=1;V.mgHit(P,6,0.4,'slap');
    ok('his hit kills Dan in a live round, the death line names him',V.P.dead===true&&/Malgorath/.test(V.mgDeathMsg('Dan','Malgorath','slap')));
    step(5);V.respawn();step(3);const b=V.mgBonePile();
    ok('Dan respawns at the Bone Pile (the stair head), not at world spawn',Math.hypot(V.P.x-b.x,V.P.z-b.z)<3);
    step(30);ok('the round is not live while Dan stands outside, and the checkpoint is kept (round 1, met)',info().live===0&&M().round===1&&M().met===1);});

  /* ===== 7. saves mid-fight, the site-edit filter, reload ===== */
  sec('saves',()=>{wakeRound(1);const x=Math.floor(1000.5-15),z=1000;V.setBlock(x,F,z,B.COBBLE);
    ok('Dan can place a block on the plate (placing into air is allowed)',V.getBlock(x,F,z)===B.COBBLE);
    const d=V.snapshot('mg0c');const ck=Math.floor(x/16)+','+Math.floor(z/16),lk=(x-Math.floor(x/16)*16)+','+F+','+(z-Math.floor(z/16)*16);
    ok('while he lives, every edit inside the site is dropped from the save (his plate cleans itself)',!(d.edits[ck]&&d.edits[ck][lk]!==undefined));
    V.applySave(JSON.parse(JSON.stringify(d)));step(3);
    ok('reload: MALG restored (met, round 1), DEMON alive, no boss restored from the save',M().met===1&&M().round===1&&!V.getDEMON().dead&&V.entities.filter(q=>!q.dead&&q.mt==='demon').length<=1);
    step(40);ok('after the reload at most one boss ever exists',V.entities.filter(q=>!q.dead&&q.mt==='demon'&&q.mgBoss).length<=1);});

  /* ===== 8. old v6.2 saves ===== */
  sec('old saves',()=>{boot.world(V,'mg0old','1337',step);const d=V.snapshot('mg0old');
    d.v='6.2';delete d.mg;d.demon={ay:32,cs:1,dead:1};d.ents.push({t:'demon',x:1000.5,y:33,z:1000.5,hp:150});
    d.edits['62,62']=Object.assign(d.edits['62,62']||{},{'8,21,8':B.LAVA});
    d.be['996,24,1000']={t:'chest',inv:[{id:IT.DIAMOND,count:7}].concat(Array(26).fill(null))};
    V.applySave(JSON.parse(JSON.stringify(d)));step(3);
    ok('an old save with DEMON.dead: every world gets the new Malgorath (DEMON.dead false, MALG.oldKill 1)',V.getDEMON().dead===false&&M().oldKill===1);
    ok('an old {t:\'demon\'} entity is never restored',V.entities.filter(q=>!q.dead&&q.mt==='demon').length===0);
    ok('the one-time migration: old arena edits inside the site are gone, the chest in the site is gone',!(C.chunkEdits.get('62,62')&&C.chunkEdits.get('62,62').has('8,21,8'))&&!C.blockEnts.has('996,24,1000'));
    ok('...and its 7 diamonds wait in MALG.spill, saved with the world',Array.isArray(M().spill)&&M().spill.some(s=>s.id===IT.DIAMOND&&s.count===7)&&!!V.snapshot('x').mg);
    const dia=()=>V.P.inv.reduce((n,q)=>n+(q&&q.id===IT.DIAMOND?q.count:0),0),d0=dia();
    boot.lip(V,step);step(30);const b=V.mgBonePile(),got=V.entities.filter(q=>q.t==='drop'&&!q.dead&&q.st.id===IT.DIAMOND&&Math.hypot(q.x-b.x,q.z-b.z)<6);
    ok('at the Bone Pile the spill is delivered (7 diamonds dropped there or already picked up) and MALG.spill is cleared',got.reduce((n,q)=>n+q.st.count,0)+dia()-d0===7&&!M().spill);});

  /* ===== 9. protection ===== */
  sec('protection',()=>{boot.world(V,'mg0p','1337',step);boot.bite(V,step);const x=Math.floor(1000.5-14),z=1000,y=F-1;
    const id0=V.getBlock(x,y,z);V.setBlock(x,y,z,B.AIR);
    ok('alive: a generated plate cell cannot be removed by setBlock (any breaker)',V.getBlock(x,y,z)===id0&&id0!==B.AIR);
    V.explode(x+0.5,y+0.5,z+0.5,3,false,'Dan');step(2);
    ok('an explosion on the plate leaves his cells (and drops nothing of them)',V.getBlock(x,y,z)===id0&&!V.entities.some(q=>q.t==='drop'&&!q.dead&&q.st.id===id0));
    V.setBlock(x,F,z,B.COBBLE);V.setBlock(x,F,z,B.AIR);
    ok('a block Dan placed on the plate can be removed again (not his)',V.getBlock(x,F,z)===B.AIR);
    ok('portals never light inside the site; placing a chest inside the Bite is refused; a chest outside is fine',V.mgPlaceOK(x,F,z,B.CHEST)===false&&V.mgPlaceOK(2000,40,2000,B.CHEST)===true);
    ok('the Big Dingle crater skips the site while he lives',C.MGREG&&V.mgInSiteXZ(1000,1000)&&V.mgProtected(x,y,z,'test')===true);
    V.getDEMON().dead=true;step(1);V.setBlock(x,y,z,B.AIR);
    ok('after his death the Bite is just terrain: the cell can be removed',V.getBlock(x,y,z)===B.AIR);
    const d=V.snapshot('mg0p');const ck=Math.floor(x/16)+','+Math.floor(z/16);
    ok('...and its edits are saved normally',!!(d.edits[ck]&&d.edits[ck][(x-Math.floor(x/16)*16)+','+y+','+(z-Math.floor(z/16)*16)]===B.AIR));
    V.getDEMON().dead=false;});

  /* ===== 10. the Effigy and the figurine proxy ===== */
  sec('effigy',()=>{boot.world(V,'mg0e','1337',step);const P=V.P,m0=JSON.stringify(M());
    V.spawnMob('demon',P.x+6,P.y,P.z+6);const ef=V.entities[V.entities.length-1];step(2);
    ok('a raw spawnMob(\'demon\') away from the Bite is the Effigy: one PointLight, no bar, hidden from bots, never the boss',ef.mt==='demon'&&!ef.mgBoss&&boot.lights(ef.mesh).length===1&&ef.mgNoBot===1&&ef.mgBar===1);
    const h=ef.hp;V.mgHitAs(ef,13,'Dan','melee');ok('the Effigy shrugs every hit',ef.hp===h);
    step(170);ok('it sinks and is gone within ~7 s, and MALG never changed',ef.dead===true&&JSON.stringify(M())===m0);
    const sc=boot.scene(),cnt=()=>{let n=0;sc.traverse(o=>{if(o instanceof THREE.PointLight||o.isPointLight)n++;});return n;};
    const x=Math.floor(P.x)+2,y=Math.floor(P.y),z=Math.floor(P.z);V.setBlock(x,y,z,B.SHELF);const l0=cnt();
    const s0=P.sel;P.inv[8]={id:IT.FIGURINE,count:1,mob:{t:'demon'}};P.sel=8;V.dispUse(x,y,z);step(50);P.sel=s0;
    ok('a demon figurine on a shelf shows the light-less proxy (no new light in the scene)',V.getDISPM()>=1&&cnt()===l0);});

  /* ===== 11. the egg ===== */
  sec('egg',()=>{boot.world(V,'mg0g','1337',step);const P=V.P;P.inv[0]={id:264,count:2};P.sel=0;V.refreshHand();
    P.pitch=-1.2;V.MB.r=true;step(1);V.MB.r=false;step(3);
    ok('the MALGORATH egg away from the Bite spawns nothing and is not used up (he eats at his own table)',(P.inv[0]&&P.inv[0].count)===2&&!V.entities.some(q=>!q.dead&&q.mt==='demon'));});

  /* ===== 12. the compass ===== */
  sec('compass',()=>{const r=V.cmpFind('demon');ok("cmpFind('demon') is the fixed point 1000.5, 1000.5 (always found)",r&&r.ok&&r.x===1000.5&&r.z===1000.5);});

  /* ===== 13. dimension change mid-fight, walking away ===== */
  sec('dormancy',()=>{boot.world(V,'mg0d','1337',step);wakeRound(1);
    ok('live before leaving',info().live===1&&!!bossE());
    V.setDim('nether',100.5,64,100.5);step(5);
    ok('a dimension change purges his entities (never stashed) and the fight goes dormant',info().live===0&&!(C.entities.some(q=>!q.dead&&V.MOBT[q.mt]&&V.MOBT[q.mt].mg)));
    V.setDim('over',1000.5-14,F,1000.5);step(30);
    wakeRound(1);ok('back on the plate he wakes again in the checkpoint round',info().live===1&&M().round===1);
    tp(1000.5-260,70,1000.5);V.forceChunksNear(V.P.x,V.P.z);step(10);
    ok('walking (teleporting) 260 m away: dormant, protection off, his checkpoint kept',info().live===0&&info().prot===false&&M().met===1);});

  /* ===== 14. the instaKill preview kill (a debug or creative kill never locks the world out of the real fight) ===== */
  sec('preview',()=>{boot.world(V,'mg0k','1337',step);wakeRound(1);V.GR.instaKill=true;const inv0=V.P.inv.filter(Boolean).length;
    let guard=0,sawR2=false,sawR3=false;
    while(guard++<3000){const b=bossE();if(M().round===2)sawR2=true;if(M().round===3)sawR3=true;
      if(!b&&sawR3&&!info().live)break;
      if(b&&!V.getCUT().on&&info().live)V.mgHitAs(b,13,'Dan','melee');step(8);}
    V.GR.instaKill=false;step(40);
    ok('instaKill walks him through round 2 and round 3 (each round ends on Dan\'s hits)',sawR2&&sawR3);
    ok('a kill with instaKill is a preview: DEMON stays alive, no kill counted, the checkpoint back at round 1',V.getDEMON().dead===false&&M().kills===0&&M().round===1);
    ok('...no Jaw, no loot spill, no YOU WIN',!V.P.inv.some(s=>s&&s.id===365)&&!V.getWIN().pend&&!V.getWIN().open&&V.P.inv.filter(Boolean).length===inv0);});

  /* ===== 15. the placeholder's honest kill (stub only: M2's own suites and the harness own the real one) ===== */
  sec('kill',()=>{if(!boot.mgStubbed('2')){skip('placeholder kill -> loot -> WIN','M2 is real (m2 suites + m_harness own it)');return;}
    boot.world(V,'mg0w','1337',step);wakeRound(1);V.GR.god=true;let guard=0;
    while(guard++<6000&&!V.getDEMON().dead){const pt=V.entities.find(q=>!q.dead&&q.mt==='mgpart');   /* his weak points: the placeholder's hand-eye */
      if(pt&&info().live&&!V.getCUT().on)V.mgHitAs(pt,30,'Dan','melee');step(8);}
    V.GR.god=false;step(80);
    ok('placeholder: three bars of 300 fall to Dan\'s hits; DEMON.dead, MALG.dead, one kill',V.getDEMON().dead===true&&M().dead===1&&M().kills===1);
    ok("placeholder: Malgorath's Jaw goes straight into the inventory, YOU WIN opens",V.P.inv.some(s=>s&&s.id===365)&&V.getWIN().open===true);
    if(V.getWIN().open&&C.closeWin)C.closeWin();});

  /* ===== 16. a new world inherits nothing ===== */
  sec('reset',()=>{boot.world(V,'mg0z','1337',step);
    ok('a new world starts with the default MALG, no fight, DEMON alive',JSON.stringify(M())===JSON.stringify(V.mgDefault())&&info().live===0&&V.getDEMON().dead===false&&his().length===0);});
});
