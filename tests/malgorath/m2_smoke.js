/* m2_smoke.js (M2, gate x2): the fight in behaviour (plan 8.2 acceptance). Every section boots its own state from a fresh world.
   1 the summon and the intro (full, then short) · 2 the gate on a live window (caps, recoil, multipliers, lifesteal, bots) · 3 the round
   floor and the end hit -> the climb-out -> Round II · 4 Round II: the lunge, the recovery, the tooth crack and the learning · 5 Round III:
   the inhale (pull, brace, cover), the swallow, the hands, the gag and the closing mouth · 6 the kill -> burst -> loot -> YOU WIN ·
   7 a creative kill is a preview · 8 Dan's death: the vacuum, the hat, the heads, the Bone Pile, the belch, the gloat · 9 the rubber
   band · 10 Malgorath's Jaw · 11 the swat · 12 save and reload mid-fight · 13 bots: swallowed, belched, shielded, never below 30. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const V=boot({seed:20261009});
const step=boot.stepper(1100000);
const B=V.B,IT=V.IT;
const M=()=>V.getMALG(),G=()=>V.getMG2(),T=()=>V.mgTel(),info=()=>V.mgInfo(),bossE=()=>boot.boss(V),F=()=>V.mgF();
const sec=(name,fn)=>{try{fn();}catch(e){ok(name+' ran without throwing ('+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ').slice(0,300)+')',false);}};
const until=(f,max)=>{for(let i=0;i<(max||600);i++){if(f())return true;step(1);}return !!f();};
const live=r=>{boot.bite(V,step,{r:15});V.mgSkipTo(r||1);until(()=>!V.getCUT().on&&info().live,600);step(2);return bossE();};
const winOf=k=>{const w=G().win;return w&&w.kind===k?w:null;};
const hitPart=(w,dmg,by,how)=>{step(7);const b=bossE(),h=b?b.hp:0;V.mgHitAs(w.part,dmg,by||'Dan',how||'melee');return b?h-b.hp:0;};   /* a part forwards to his bar */

boot.run(async()=>{
  if(boot.mgStubbed('2')){skip('m2 smoke','M2 is on its stub');return;}
  const realM1=!boot.mgStubbed('1');

  /* ===== 1. the summon and the intro ===== */
  sec('intro',()=>{boot.world(V,'m2a','1337',step);boot.bite(V,step,{r:15});V.GR.god=true;
    /* v6.3 (MZ): the M1 placeholder wakes him the moment Dan stands on its plate (only the real Bite needs the eye), so this needs real M1 */
    if(realM1)ok('a fresh world: never met, no fight',M().met===0&&info().live===0);else skip('a fresh world: never met, no fight','M1 is on its stub (its placeholder plate wakes him on contact)');
    V.MGREG.fight.wake('poke');step(2);
    ok('wake(poke): MALG.met, the FULL intro (15 s, a scripted CUT, first time in this world)',M().met===1&&V.getCUT().on&&G().scene&&G().scene.k==='intro'&&G().scene.end===15);
    ok('...line 1 answers the poke, line 2 names him, line 3 is the threat',V.mgCore().CUT.script.lines.map(l=>l.t).join('|').indexOf('...You touched my eye.|I am MALGORATH')===0&&/I eat them last\./.test(V.mgCore().CUT.script.lines[2].t));
    step(30);V.KEY.Space=true;step(1);V.KEY.Space=false;step(3);
    ok('Space after 0.8 s skips: the scene ends at its end state and Round I is live (door gone, grace running)',!V.getCUT().on&&info().live===1&&M().round===1&&(M().seen&1)===1);
    ok('the boss is on the mound in the Throat, his chest at the plate, one entity',!!bossE()&&Math.abs(bossE().y-(F()-8))<0.01&&V.entities.filter(e=>!e.dead&&e.mgBoss).length===1);
    boot.world(V,'m2a2','1337',step);M().seen=1;boot.bite(V,step,{r:15});V.MGREG.fight.wake('egg');step(2);
    ok('a later summon in a world that saw the intro plays the SHORT one (4 s)',G().scene&&G().scene.k==='intro'&&G().scene.end===4);
    until(()=>!V.getCUT().on&&info().live,200);ok('...and Round I starts after it',info().live===1);V.GR.god=false;});

  /* ===== 2. the gate on a live window ===== */
  sec('gate',()=>{boot.world(V,'m2b','1337',step);boot.kit(V,'A');const e=live(1);V.GR.god=true;
    const h0=e.hp;for(let i=0;i<30;i++){V.mgHitAs(e,13,'Dan','melee');step(7);}
    ok('the hide: Dan\'s blade at x0.1, at most 15 a round ('+(h0-e.hp).toFixed(1)+')',h0-e.hp<=15.01&&h0-e.hp>=14.9);
    const h1=e.hp;V.mgHitAs(e,13,'Dan','arrow');step(7);V.mgHitAs(e,13,'Dan','laser');step(7);
    ok('arrows and the laser deal 0 to the hide',e.hp===h1);
    ok('a slap opens a HAND-EYE window: a GOLD part ahead of the boss, the hide collapses',until(()=>!!winOf('handeye'),400)&&e.hw===0&&V.entities.indexOf(winOf('handeye').part)<V.entities.indexOf(e));
    let w=winOf('handeye');const hp0=e.hp,d1=hitPart(w,13);
    ok('a melee hit on the hand-eye lands at x1.0 ('+d1+')',Math.abs(d1-13)<1e-6);
    const st=V.MGREG.fight.steal(w.part,1.5);ok('lifesteal on a weak point the frame it landed: '+st,st>0&&st<=1.5);
    hitPart(w,13);const d3=hitPart(w,13);
    ok('the hit that crosses the cap (30) is clipped to it and the window closes at once (capped)',Math.abs(d3-4)<1e-6&&!winOf('handeye')&&T().win.capped===1&&Math.abs(hp0-e.hp-30)<1e-6);
    ok('...and his next attack comes early (the selector <= 0.4 s)',G().sel<=0.41||!!G().atk);
    ok('a hit on the closed part does nothing',hitPart(w,13)===0);
    /* v6.3 (MZ): on the M1 placeholder Dan ends this section at r 23, out of slap reach, so no second hand-eye comes: needs real M1 */
    if(realM1)ok('a second window: laser x0.5, explosions x0.5 on weak points',until(()=>!!winOf('handeye'),500)&&(w=winOf('handeye'))&&Math.abs(hitPart(w,12,'Dan','laser')-6)<1e-6&&Math.abs(hitPart(w,20,'Dan','tnt')-10)<1e-6);
    else skip('a second window: laser x0.5, explosions x0.5 on weak points','M1 is on its stub (Dan is left out of slap reach on its plate)');
    V.GR.god=false;});

  /* ===== 3. the round floor, the end hit, the climb-out ===== */
  sec('round end',()=>{boot.world(V,'m2c','1337',step);boot.kit(V,'A');const e=live(1);V.GR.god=true;e.hp=1.5;V.P.hp=7;
    V.mgHitAs(e,13,'Dan','melee');step(7);
    ok('a hide hit stops at the floor (1): the round does not end on the hide',e.hp===1&&M().round===1&&!G().scene);
    until(()=>!!winOf('handeye'),500);const w=winOf('handeye');e.hp=1;V.P.hp=7;hitPart(w,13);step(2);   /* the waves' Morsels fed him meanwhile */
    ok('Dan\'s weak-point hit at 1 ends the round: checkpoint 2, the climb-out scene (full, first time)',M().round===2&&G().scene&&G().scene.k==='climb'&&V.getCUT().on);
    ok('Dan is healed to full at the transition',V.P.hp===20);
    until(()=>!V.getCUT().on&&info().live,400);step(2);
    ok('Round II is live: he stands on the plate (feet at F), the stalk, a new bar of 300',info().live===1&&MGF_round()===2&&Math.abs(bossE().y-F())<0.01&&bossE().hp===300);
    if(realM1)ok('the layout is L2 (M1): the Pen\'s plinth at theta 270 is a scar into the gut',V.getBlock(1000,F()-1,983)===B.AIR&&V.getBlock(1000,F()-3,983)===B.AIR);
    V.GR.god=false;});
  function MGF_round(){return V.getMGF().round;}

  /* ===== 4. Round II: the lunge, the recovery, the tooth crack ===== */
  sec('round 2',()=>{boot.world(V,'m2d','1337',step);boot.kit(V,'A');live(2);V.GR.god=true;
    let sawLine=null;const okLine=until(()=>{for(const t of T().tel)if(t.kind==='lunge'&&t.locked)sawLine=t;return !!sawLine;},800);
    ok('a lunge: a RED drool line that sets 0.3 s into a 1.6 s tell (lock to impact >= 1.0 s)',okLine&&sawLine.col==='red'&&sawLine.shape==='line'&&sawLine.impactT-sawLine.lockT>=0.999);
    ok('...its side band is WHITE, 7 wide (8 damage within 2 m of the line)',T().tel.some(t=>t.kind==='lungeSide'&&t.w===7&&t.col==='white'));
    ok('...then the RECOVERY (eyes on the floor at the trench end, 1.5 s, cap 30) or a TOOTH CRACK (4 s, cap 50)',until(()=>!!(winOf('recovery')||winOf('crack')),200));
    const w=G().win;ok('the window\'s cap: '+w.kind+' '+w.cap,(w.kind==='recovery'&&w.cap===30)||(w.kind==='crack'&&w.cap===50));
    if(realM1){const cr=()=>Object.values(G().L.cracks).reduce((a,b)=>a+b,0);let n0=cr();
      for(let i=0;i<3000&&cr()<2;i++){const p=V.P,e=bossE();if(!e)break;const s=[[11,11],[-11,11],[-11,-11],[11,-11]].map(q=>({x:1000.5+q[0],z:1000.5+q[1]})).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
        const dx=s.x-e.x,dz=s.z-e.z,d=Math.hypot(dx,dz)||1;p.x=s.x+dx/d*3;p.z=s.z+dz/d*3;p.vx=p.vz=0;step(1);}
      ok('standing behind a bedrock spire makes his lunge crack a tooth (stunned, GOLD, cap 50)',cr()>n0);
      const learned=()=>Object.values(G().L.cracks).some(n=>n>=2);for(let i=0;i<4000&&!learned();i++){const p=V.P,e=bossE();if(!e)break;const k=Object.keys(G().L.cracks)[0];if(!k)break;
        const q=k.split(',').map(Number),sx=1000.5+q[0],sz=1000.5+q[1],dx=sx-e.x,dz=sz-e.z,d=Math.hypot(dx,dz)||1;p.x=sx+dx/d*3;p.z=sz+dz/d*3;p.vx=p.vz=0;step(1);}
      ok('two cracks on one spire and he learns it: lunge lines never cross it again',learned());}
    else skip('tooth crack','M1 on its stub (no spires)');
    V.GR.god=false;});

  /* ===== 5. Round III ===== */
  sec('round 3',()=>{boot.world(V,'m2e','1337',step);boot.kit(V,'A');live(3);V.GR.god=true;
    ok('Round III: he is chest-deep (feet at F-13), the sun is eaten (MGL.eclipse 1)',Math.abs(bossE().y-(F()-13))<0.01&&V.getMGL().eclipse===1);
    until(()=>V.MGREG.fight.inhaling(),400);
    ok('the inhale: blinks fail and grapples are cut while he breathes in',V.MGREG.fight.inhaling()&&V.MGREG.fight.blinkFail()===true&&V.MGREG.fight.grapCut()===true);
    const p=V.P,th=Math.PI,r0=20;p.x=1000.5+Math.cos(th)*r0;p.z=1000.5+Math.sin(th)*r0;p.y=F();p.vx=p.vz=0;step(25);
    const rA=V.mgPol(p.x,p.z).r;
    ok('the pull drags a standing player toward his mouth ('+r0+' -> '+rA.toFixed(1)+' m in 1 s)',rA<r0-1.0);
    ok('mgCovered: false on an open island (the floor never covers), true behind a 1-high block',(()=>{const a=V.mgCovered(p);const x=Math.floor(p.x+1.2),z=Math.floor(p.z);V.mgWrite(x,F(),z,B.STONE);const b=V.mgCovered(p);V.mgWrite(x,F(),z,B.AIR);return a===false&&b===true;})());
    ok('the swallow: the BELLY window (cap 25), seen from above',until(()=>!!winOf('belly'),400)&&winOf('belly').cap===25&&winOf('belly').part.y<F()-3);
    ok('the hands: a slap onto an island, the drag (a WHITE moving bar with a jump front), a hand-eye (cap 25)',until(()=>T().tel.some(t=>t.kind==='drag'&&t.front)||!!winOf('handeye'),400)&&until(()=>!!winOf('handeye'),200)&&winOf('handeye').cap===25);
    ok('every third swallow: THE GAG (the sun 4 m inside the mouth, cap 75)',until(()=>!!winOf('sun'),3000)&&winOf('sun').cap===75);
    const w=winOf('sun'),e=bossE(),edge0=G().edge;e.hp=1;step(1);
    ok('the closing mouth has eaten the edge meanwhile ('+edge0+' m)',edge0<24);
    {const q=G().r3,ux=Math.cos(q.th),uz=Math.sin(q.th);boot.tp(V,q.sun.x+ux*2.2,F(),q.sun.z+uz*2.2);}hitPart(w,13);step(2);
    ok('Dan\'s hit in a gag window at 1 HP ends him: the death scene starts',G().scene&&G().scene.k==='death');
    V.GR.god=false;});

  /* ===== 6. the kill -> the burst -> loot -> YOU WIN ===== */
  sec('kill',()=>{ok('the kill commits at the hit: DEMON.dead, MALG.dead, one kill, the Jaw in the inventory, the Horns owned',
      V.getDEMON().dead===true&&M().dead===1&&M().kills===1&&V.P.inv.some(s=>s&&s.id===365)&&V.P.own.includes('hat_horns'));
    const dia=()=>V.entities.filter(q=>q.t==='drop'&&!q.dead&&q.st.id===IT.DIAMOND).reduce((n,q)=>n+q.st.count,0)+V.P.inv.reduce((n,s)=>n+(s&&s.id===IT.DIAMOND?s.count:0),0);
    const d0=dia();ok('the first burst cannot be skipped',(()=>{step(30);V.KEY.Space=true;step(2);V.KEY.Space=false;step(1);return V.getCUT().on;})());
    until(()=>!V.getCUT().on,500);step(5);
    ok('the spill from his mouth: 19 diamonds (16 + the slot machine\'s 3)',dia()-d0===19);
    until(()=>V.getWIN().open,200);ok('YOU WIN opens 1.5 s after the letterbox',V.getWIN().open===true);
    if(V.getWIN().open)V.mgCore().closeWin();
    ok('MALG.heads cleared, no boss, no fight; the Bite is Ldead for good',M().heads===0&&!bossE()&&info().live===0);});

  /* ===== 7. a creative kill is a preview ===== */
  sec('preview',()=>{boot.world(V,'m2f','1337',step);boot.kit(V,'A');live(3);V.P.mode='c';const e=bossE();const h0=e.hp;V.mgHitAs(e,13,'Dan','melee');step(8);
    const last=T().hits[T().hits.length-1],hpD=V.P.hp;step(120);
    ok('creative: he is docile toward Dan (nothing lands in 5 s) but his hide takes full damage (previews)',!!last&&last[2]==='hide'&&last[3]===13&&V.P.hp===hpD&&!V.P.dead);
    e.hp=1;V.mgHitAs(e,13,'Dan','melee');step(2);
    ok('...and the end hit plays the burst',G().scene&&G().scene.k==='death');
    until(()=>!V.getCUT().on,600);step(5);
    ok('...a preview: DEMON alive, no kill, no Jaw, back to Round I (met kept), no WIN',!V.getDEMON().dead&&M().kills===0&&M().round===1&&M().met===1&&!V.P.inv.some(s=>s&&s.id===365)&&!V.getWIN().pend&&!V.getWIN().open);
    V.P.mode='s';});

  /* ===== 8. Dan's death: the vacuum, the hat, the heads, the Bone Pile, the belch, the gloat ===== */
  sec('death',()=>{boot.world(V,'m2g','1337',step);boot.kit(V,'A');live(1);const P=V.P;P.cos.hat='tophat';P.own.push('hat_tophat');
    const inv0=JSON.stringify(P.inv);const P2=V.P;P2.hurtT=0;P2.hp=1;G().startT-=60;V.mgHit(P2,6,0.4,'slap');
    ok('his hit kills Dan; the drops never touch the floor: the stacks go into MALG.gut (saved)',P2.dead&&Array.isArray(M().gut)&&M().gut.length>=6&&P2.inv.every(s=>!s)&&!V.entities.some(q=>q.t==='drop'&&!q.dead&&q.st.id===IT.STEAK));
    ok('he takes Dan\'s hat and skewers a head on his horn',M().hat==='tophat'&&!P2.cos.hat&&M().heads===1);
    ok('a counted death (the attempt was over 45 s)',M().deaths[0]===1);
    ok('the round resets during the death screen (dormant, bar refilled)',info().live===0&&bossE()&&bossE().hp===300);
    V.respawn();step(2);const b=V.mgBonePile();
    ok('Dan respawns at the Bone Pile',Math.hypot(V.P.x-b.x,V.P.z-b.z)<2);
    step(40);ok('the belch: every stack is back in its original slot',JSON.stringify(V.P.inv)===inv0&&!M().gut);
    ok('the store will not put the hat back on while he wears it',(()=>{V.P.cos.hat='tophat';step(2);return !V.P.cos.hat;})());
    live(1);V.P.hurtT=0;V.P.hp=1;G().startT-=60;V.mgHit(V.P,14,0.4,'slap');V.respawn();step(30);
    ok('the second counted death in the round gets a gloat that names the mistake (FOOD STANDS STILL.)',M().deaths[0]===2&&/FOOD STANDS STILL\./.test(global.document.getElementById('cuttext').textContent||''));
    step(60);});

  /* ===== 9. the rubber band ===== */
  sec('rubber band',()=>{boot.world(V,'m2h','1337',step);M().met=1;M().deaths=[4,0,0];const e=live(1);
    ok('from the 4th counted death in a round it restarts at 85% (255)',e.hp===255);
    V.mg2Dormant('skip');M().deaths=[7,0,0];G().reform=0;const e2=live(1);ok('from the 7th at 70% (210)',e2.hp===210);
    G().startT=V.mgTel().clock;V.P.hurtT=0;V.P.hp=1;V.mgHit(V.P,6,0.4,'slap');
    ok('a death within 15 s of the round start never counts',M().deaths[0]===7);V.respawn();step(5);});

  /* ===== 10. Malgorath's Jaw ===== */
  sec('jaw',()=>{boot.world(V,'m2i','1337',step);const P=V.P;P.yaw=0;P.pitch=0;const ex=P.x,ey=P.y+P.eyeY,ez=P.z,x=Math.floor(ex),y=Math.floor(ey)-1,z=Math.floor(ez-2.5);   /* 2.5 m ahead (-z) */
    for(let dx=-1;dx<=1;dx++)for(let dy=0;dy<=2;dy++)for(let dz=-1;dz<=1;dz++)V.setBlock(x+dx,y+dy,z+dz,B.STONE);
    P.inv[0]={id:365,count:1};P.sel=0;V.refreshHand();P.x=ex;P.z=ez;step(1);P.yaw=0;P.pitch=0;
    const c0=P.inv.reduce((n,s)=>n+(s&&(s.id===B.COBBLE||s.id===B.STONE)?s.count:0),0);V.MB.r=true;step(1);V.MB.r=false;step(2);
    let gone=0;for(let dx=-1;dx<=1;dx++)for(let dy=0;dy<=2;dy++)for(let dz=-1;dz<=1;dz++)if(V.getBlock(x+dx,y+dy,z+dz)===B.AIR)gone++;
    const c1=P.inv.reduce((n,s)=>n+(s&&(s.id===B.COBBLE||s.id===B.STONE)?s.count:0),0);
    ok('right-click bites a 3x3x3 chunk minus its 8 corners ('+gone+' cells) straight into the inventory ('+(c1-c0)+')',gone===19&&c1-c0===19);
    V.MB.r=true;step(1);V.MB.r=false;ok('...with a 1.0 s cooldown',P.useT>0.5);
    ok('bedrock is never bitten',(()=>{for(let dx=-1;dx<=1;dx++)for(let dy=0;dy<=2;dy++)for(let dz=-1;dz<=1;dz++)V.setBlock(x+dx,y+dy,z+dz,B.BEDROCK);step(30);P.yaw=0;P.pitch=0;V.MB.r=true;step(1);V.MB.r=false;step(2);
      let n=0;for(let dx=-1;dx<=1;dx++)for(let dy=0;dy<=2;dy++)for(let dz=-1;dz<=1;dz++)if(V.getBlock(x+dx,y+dy,z+dz)===B.BEDROCK)n++;return n===27;})());});

  /* ===== 11. the swat ===== */
  sec('swat',()=>{boot.world(V,'m2j','1337',step);boot.kit(V,'A');live(1);V.GR.god=true;const p=V.P,x=Math.floor(p.x),z=Math.floor(p.z),y0=Math.floor(p.y);
    for(let i=0;i<4;i++)V.mgWrite(x,y0+i,z,B.STONE);p.y=y0+4;p.vy=0;const m0=(T().mech[1]||{}).swat||0;
    ok('perching 4 m over his plate is answered by the swat within 2.6 s (VIOLET box, his hands clap)',until(()=>((T().mech[1]||{}).swat||0)>m0,70));
    V.GR.god=false;});

  /* ===== 12. save and reload mid-fight ===== */
  sec('save',()=>{boot.world(V,'m2k','1337',step);boot.kit(V,'A');live(2);const d=V.snapshot('m2k');
    ok('a mid-R2 save carries MALG (round 2, met) and no entity of his',d.mg&&d.mg.round===2&&d.mg.met===1&&!d.ents.some(q=>V.MOBT[q.t]&&V.MOBT[q.t].mg));
    V.applySave(JSON.parse(JSON.stringify(d)));step(40);
    ok('reload: the R2 checkpoint, at most one boss',M().round===2&&V.entities.filter(e=>!e.dead&&e.mgBoss).length<=1);
    boot.bite(V,step,{r:15});until(()=>info().live,200);ok('stepping onto the plate re-erupts him into Round II',info().live===1&&V.getMGF().round===2);});

  /* ===== 13. bots (run last: they grief) ===== */
  sec('bots',()=>{if(V.setBrainMock)V.setBrainMock(null);if(V.BRAIN)Object.assign(V.BRAIN,{mock:null,ok:false,off:true});
    boot.world(V,'m2l','1337',step);boot.kit(V,'A');const e=live(1);V.GR.god=true;if(!V.AGENTS.length||!V.AGENTS[0].e)V.agJoinAll(false);step(10);
    const bots=V.AGENTS.filter(a=>a.e&&!a.dead);if(!bots.length){skip('bots','no agents joined');return;}
    bots.forEach((a,i)=>{a.e.x=1000.5-12-i;a.e.z=1000.5+2*i;a.e.y=F();a.x=a.e.x;a.z=a.e.z;});step(5);
    const h=e.hp;for(const a of bots)V.mgHitAs(e,99,a.name,'melee');step(8);ok('bots deal 0 to the hide',e.hp===h);
    const a=bots[0];V.MGREG.fight.chomp(a);step(2);
    ok('a chomped bot is swallowed instead: hidden, invulnerable, in his belly window',G().eaten.some(q=>q.a===a)&&V.MGREG.fight.botShield(a,'Malgorath','mg:slap')===true&&V.getMGA().belly.items.some(q=>q.k==='bot'));
    G().eaten.find(q=>q.a===a).t=0.05;step(5);ok('...and belched back onto the plate later',!G().eaten.some(q=>q.a===a)&&a.e.mesh.visible!==false);
    e.hp=40;until(()=>!!winOf('handeye'),500);const w=winOf('handeye');if(w){for(const b of bots){V.mgHitAs(w.part,13,b.name,'melee');step(2);}}
    ok('bots on a weak point deal x0.5 and can never take him below 30 ('+e.hp+')',e.hp>=30);
    ok('a bot that dies in the Bite keeps its kit and wakes at the Bone Pile',V.MGREG.fight.botKeep(a.e)===true&&Array.isArray(V.MGREG.fight.botSpawn(Object.assign({},a,{lastDeath:{x:990,z:1000}}))));
    V.GR.god=false;});
});
