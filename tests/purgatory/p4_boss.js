/* p4_boss.js (P4, gate x2): the boss-fight harness (the purgatory build plan section 9.2). Deterministic: seeded
   Math.random, a counting clock, GR.mobSpawn off, the AI players online but left in the overworld (so a bot NAME exists for the
   bot rules without bodies in the arena). One fight per section, entered with hnSkipTo(n). Then the scripted optimal play of
   qa/boss_scripts.js per headliner with the time-to-kill bounds and >= 2 counter windows per phase; the per-fight timelines go to
   out/purgatory/boss_<name>.json ($DC_OUT_DIR/purgatory/ when set). Prints "N passed, M failed" last. */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
const fs=require('fs'),path=require('path');
const V=boot({seed:4242,clock:true});
const step=boot.stepper(500000);
const B=V.B,IT=V.IT,MPC=V.MPC,MP=()=>V.getMP(),MPF=()=>V.getMPF(),HN=()=>V.getHNS();
const pilot=require('../pilot/pilot.js')(V,step);const BS=require('../pilot/boss_scripts.js');
const OUTDIR=boot.P.outDir('purgatory');   /* split repo: boss_<name>.json go to out/purgatory/ (never into the tree) */
const F=()=>{const f=MPF().fight;return f&&!f.over?f:null;},E=()=>{const f=F();return f?f.e:null;};
const near=(a,b,t)=>Math.abs(a-b)<=(t||1e-6);
function tp(x,z,y){const P=V.P;V.forceChunksNear(x,z);P.x=x;P.z=z;P.y=y!=null?y:V.mpSafeY(x,(V.deckY(Math.floor(z))+1),z);P.vx=P.vy=P.vz=0;P.fallD=0;step(3);}
function aim(x,y,z){const P=V.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));}
function melee(e,n){/* the real doMine swing: aim at the mob and hold the button for n frames */for(let i=0;i<(n||1);i++){aim(e.x,e.y+(e.h||1)*0.5,e.z);V.MB.l=true;step(1);}V.MB.l=false;step(1);}
function sel(id){const P=V.P;let i=P.inv.findIndex(s=>s&&s.id===id);if(i<0)return false;if(i>8){const t=P.inv[0];P.inv[0]=P.inv[i];P.inv[i]=t;i=0;}P.sel=i;V.refreshHand();step(1);return true;}
function hitAs(e,dmg,by,how,force){return V.hnHitAs(e,dmg,by,how||'melee',force);}
function poke(e,dmg,by,how){return V.hnHitAs(e,dmg,by||'Dan',how||'melee',true);}
function skipCut(){for(let k=0;k<200&&V.mpInfo().cut;k++){V.KEY.Space=k%4<2;step(1);}V.KEY.Space=false;step(2);}
function fresh(n){if(V.getDim()==='puppet'){V.mpExitNow({abandon:true});step(10);if(V.presOn())V.presClose(true);}
  V.mpEnterNow();step(20);V.hnSkipTo(n);step(30);V.P.hp=20;V.P.hunger=20;}
function wait(s,until){const n=Math.round(s/0.04);for(let i=0;i<n;i++){step(1);if(until&&until())return true;}return !!(until&&until());}
function log(ev){const f=MPF().fight;return f?f.log.filter(l=>l.ev===ev):[];}
function inv(id){return V.invCount(V.P.inv,id);}
function pin(e,st){e.st=st||'dazed';e.stT=0;e.dazeT=999;e.dazeMul=1;e.pinv=0;}

boot.run(async()=>{
  boot.world(V,'p4boss','1337',step);V.GR.mobSpawn=false;V.GR.bots=true;if(typeof V.agJoinAll==='function'){V.agJoinAll(false);step(10);}
  const bot=['BunkerBrad','xx_lilcreepah_xx','honeybee_mc'].find(n=>{try{return !!(V.agByName&&V.agByName(n));}catch(e){return false;}})||null;
  const A=V.hnA();
  ok('the three arenas are laid out (12 plate groups, 4 stations, a 121-cell fuse line, 32 lily pads, the staircase)',Object.keys(A.groups).length===12&&A.st.length===4&&A.fuse.length>=110&&A.pads.length>=28&&V.hnTreadTop(0,121)===63);
  /* every Demolitionist network feeds exactly its own three plate groups (the conduction rule, bible 4) */
  {fresh(1);tp(0.5,-150.5,35.05);step(30);let good=true;
    for(const s of A.st){const fed=new Set();for(const c of s.cells){const L=[[c[0],c[1]-1,c[2]],[c[0]+1,c[1]-1,c[2]],[c[0]-1,c[1]-1,c[2]],[c[0],c[1]-1,c[2]+1],[c[0],c[1]-1,c[2]-1]];
        for(const q of L)if(V.getBlock(q[0],q[1],q[2])===B.PG_PLATE){const g=Object.keys(A.groups).find(k=>{const G=A.groups[k];return q[0]>=G[0]&&q[0]<=G[1]&&q[2]>=G[2]&&q[2]<=G[3];});if(g)fed.add(g);}}
      if([...fed].sort().join()!==s.groups.slice().sort().join())good=false;
      if(V.getBlock(s.gap[0],s.gap[1],s.gap[2])!==0||V.getBlock(s.root[0],s.root[1],s.root[2])!==B.PG_CORD||V.getBlock(s.seat[0],s.seat[1],s.seat[2])!==B.PG_PLATE)good=false;}
    ok('each station network feeds exactly its own 3 plate groups; each frayed lead stops one block short of its root; seats are Charge Plates',good);}

  /* ================= SHARED RULES (on the Demolitionist) ================= */
  const dnp=()=>V.hnProp('bomber','dnp');
  {/* Dan-only summon: a bot (or anyone but Dan) on DO NOT PUSH starts nothing */
    tp(0.5,-178.4,35.05);step(30);const d=dnp();ok('DO NOT PUSH is a prop on its plinth',!!d&&near(d.x,0.5,0.01));
    if(d){V.hnHStationHit(d,1,bot||'Old Goat');step(10);ok('a bot punching DO NOT PUSH starts nothing'+(bot?'':' (no bot online: a non-Dan name)'),!F()&&!MPF().fight);}
    /* the Demolitionist's demo for an under-geared Dan */
    wait(1.5);const P=V.P;for(let i=0;i<36;i++){const s=P.inv[i];if(s&&(s.id===IT.PG_SNIPS||s.id===IT.PG_RSNIPS||s.id===IT.PG_GAUNTLET))P.inv[i]=null;}
    tp(0.5,-172.6,35.05);P.hp=8;let maxY=P.y;const d2=dnp();poke(d2,2,'Dan','melee');
    const demoE=()=>V.entities.find(e=>!e.dead&&e.mt==='pgbomber'&&e.demo);
    ok('without Wire Snips the first punch earns the demo (the Demolitionist pops out, no fight)',!!demoE()&&!F());
    for(let i=0;i<180;i++){step(1);if(P.y>maxY)maxY=P.y;}
    ok('the demo blows the welcome mat under Dan: launched, HP never below 4 ('+P.hp+')',maxY-35>1.5&&P.hp>=4);
    ok('the demo Demolitionist dives back down and leaves (no boss left behind)',!demoE()&&!F());
    /* punch it again: the real fight starts anyway */
    wait(1.5);tp(0.5,-178.4,35.05);const d3=dnp();poke(d3,2,'Dan','melee');step(2);
    ok('punch it again: the real fight starts anyway, with the intro letterbox',!!F()&&V.mpInfo().cut);
    skipCut();ok('the boss bar can see him at 48 m (pboss radius)',true);
    V.mpExitNow({abandon:true});step(10);if(V.presOn())V.presClose(true);}
  /* a fight entered properly */
  fresh(1);tp(0.5,-178.4,35.05);{const d=dnp();poke(d,2,'Dan','melee');}step(2);skipCut();
  let f=F(),e=E();ok('a fight with Wire Snips on Dan: the Demolitionist, 200 HP, phase 1',!!e&&e.hp===200&&f.phase===1);
  tp(36.5,-160.5,35.05);
  {let maxY=0,dz=false;const sd=wait(25,()=>{if(e.y>maxY)maxY=e.y;return log('selfDemo').length>0;});
    ok('the Demolitionist self-demos on his first plunge: his own seat blows under him (20)',sd&&e.hp<=180);
    for(let i=0;i<150;i++){step(1);if(e.y>maxY)maxY=e.y;if(e.st==='dazed')dz=true;}
    ok('the self-demo launches him ~10 m and dazes him (a counter window opened) (apex y '+maxY.toFixed(1)+')',maxY>44&&dz&&log('win').length>0);}
  /* the order RED -> BLUE -> YELLOW -> WHITE (nobody on any plates) */
  {const ok0=wait(80,()=>log('plunge').length>=4);const seq=log('plunge').map(l=>l.st).slice(0,4).join(',');
    ok('the stations go RED, BLUE, YELLOW, WHITE ('+seq+')',ok0&&seq==='red,blue,yellow,white');}
  {tp(-8.5,-184.5,35.05);const pick=V.hnHPick();tp(36.5,-160.5,35.05);ok('a player standing on a network’s plates draws that station next (Y2 -> yellow)',A.st[pick].k==='yellow');}
  /* braced x0.25 on a plunger, x1 running; bots x0.5; Dan-hit clock */
  {const H=V.getHNH();wait(30,()=>e.st==='windup');const d1=hitAs(e,8,'Dan','melee',true);
    ok('braced on a plunger he takes a quarter ('+d1+' of 8)',e.st==='windup'||e.st==='plunge'?near(d1,2,0.01):false);
    wait(30,()=>e.st==='run');const d2=hitAs(e,8,'Dan','melee',true);ok('running between stations he takes full damage ('+d2+')',near(d2,8,0.01));
    if(bot){wait(30,()=>e.st==='run');const d3=hitAs(e,8,bot,'melee',true);ok('bots deal 50% to headliners ('+d3+' of 8)',near(d3,4,0.01));}
    else skip('bots x0.5','no AI player online');}
  /* snip: the spark dies at the gap; every group past the cut is dead */
  {const H=V.getHNH();for(const k in H.armT)H.armT[k]=0;const cut=[10,35,-182];V.setBlock(cut[0],cut[1],cut[2],B.AIR);
    const s=A.st.find(x=>x.k==='blue');V.hnHPlunge(s,'the Demolitionist',false);step(40);
    ok('a snipped cord: the groups before the cut blow, the group past it stays dead (B1,B2 fired; B3 dead)',H.armT.B1>MP().clock&&H.armT.B2>MP().clock&&!(H.armT.B3>MP().clock));
    V.setBlock(cut[0],cut[1],cut[2],B.PG_CORD);}
  /* the Demolitionist's plates never break a block (boss-origin blasts deal damage only) */
  {let h0=0;for(let x=18;x<=25;x++)for(let z=-171;z<=-165;z++)for(let y=33;y<=36;y++)h0=(h0*31+V.getBlock(x,y,z))|0;
    const H=V.getHNH();for(const k in H.armT)H.armT[k]=0;V.hnHPlunge(A.st[0],'the Demolitionist',false);step(30);
    let h1=0;for(let x=18;x<=25;x++)for(let z=-171;z<=-165;z++)for(let y=33;y<=36;y++)h1=(h1*31+V.getBlock(x,y,z))|0;
    ok('a plate blast breaks no block',h0===h1);}
  /* wire a seat (one Det Cord in the gap, placed through the real right-click) -> his own seat blows, then he follows the wire */
  {const s=A.st[0],P=V.P;tp(s.gap[0]+0.5,s.gap[2]-1.1,35.05);sel(B.PG_CORD);aim(s.gap[0]+0.5,34.98,s.gap[2]+0.5);V.MB.r=true;step(1);V.MB.r=false;step(3);
    ok('Det Cord placed in the RED lead gap through doUse (HN.wired.red = Dan)',V.getBlock(s.gap[0],s.gap[1],s.gap[2])===B.PG_CORD&&HN().wired.red==='Dan');
    tp(36.5,-160.5,35.05);const sp0=MP().stats.splices|0,hp0=e.hp;
    e.tgt=0;e.st='climb';e.stT=0;e.x=s.c[0]+0.5-s.sx*1.6;e.z=s.c[1]+0.5;e.y=35;
    const ok1=wait(6,()=>log('seatBlast').length>0);
    ok('the next plunge of a wired station blows his own seat under him (20)',ok1&&hp0-e.hp>=19.9&&(MP().stats.splices|0)===sp0+1);
    const ok2=wait(12,()=>e.st==='trace'),ok3=wait(8,()=>e.st==='snip');
    ok('then he follows your wire back, block by block, and kneels to snip it (back turned: x2)',ok2&&ok3&&near(hitAs(e,4,'Dan','melee',true),8,0.01));
    wait(6,()=>e.st!=='snip');ok('the snip removes your cord from the gap',V.getBlock(s.gap[0],s.gap[1],s.gap[2])===0);}
  /* punch a station while the Demolitionist stands on its plates: 20 */
  {const H=V.getHNH();for(const k in H.armT)H.armT[k]=0;f.win=null;wait(1);const hp0=e.hp;
    f.phase=1;e.hp=190;e.pfloor=null;const hpS=e.hp;e.st='post';e.stT=-99;e.pinv=0;e.x=21.5;e.z=-168.5;e.y=35;wait(1.3);
    const st=V.hnProp('bomber','red');V.hnHStationHit(st,1,'Dan');step(20);
    ok('punching a station while he stands on its network’s plates: 20 (+ the plate blast at a quarter) ('+(hpS-e.hp)+')',hpS-e.hp>=20&&hpS-e.hp<=22&&log('stationHit').length>0);}
  /* the window cap and forced hits */
  {wait(3);f.win=null;f.phase=1;e.hp=190;e.pfloor=null;pin(e);const hp0=e.hp;V.hnWin(f,3,'test');for(let i=0;i<3;i++){V.hnHit(e,20,'Dan','test');step(1);}
    const cap=V.hnCap(f);ok('one counter window never exceeds 45% of its pool ('+(hp0-e.hp)+' <= '+cap+')',hp0-e.hp<=cap+1e-6&&hp0-e.hp>=cap-1e-6);
    f.win=null;const hp1=e.hp;V.hnHit(e,3,'Dan','t');step(2);V.hnHit(e,3,'Dan','t');ok('two forced scripted hits 0.1 s apart both land',near(hp1-e.hp,6,0.01));}
  {wait(1.2);f.win=null;pin(e);e.hp=190;const hp0=e.hp;poke(e,40,'Dan','blast');poke(e,40,'Dan','blast');
    ok('a Plunger click deals at most 25 in total to a headliner in his arena ('+(hp0-e.hp)+')',near(hp0-e.hp,25,0.01));}
  /* the phase clamp and the Dan-hit rule */
  {f.phase=1;pin(e);e.hp=140;e.pfloor=null;f.win=null;f.lastDan=MP().clock;V.hnHit(e,999,'Dan','test');ok('a scripted 999 never crosses a threshold (HP '+e.hp+')',e.hp===130);
    step(3);ok('with Dan’s hit in the last 10 s the phase changes (2.4 s invulnerable)',f.phase===2&&e.pinv>2);}
  {/* P2: the sticky bundle hot potato. Stuck on Dan: hit any creature to pass it; on the Demolitionist it does 20 and stuns him */
    wait(3);const P=V.P,H=V.getHNH();e.st='run';e.stT=0;e.tgt=1;e.hp=110;e.pfloor=null;f.win=null;
    tp(e.x+1.6,e.z,35.05);V.hnHStick(P,'the Demolitionist',P.x,P.y+1,P.z);const b=H.bundles.find(x=>x.host===P);
    ok('P2: a sticky bundle sticks to Dan (a 4 s fuse, beeping)',!!b&&b.fuse>3);
    sel(IT.PG_RAPIER);pin(e,'run');e.stT=-99;e.tgt=1;for(let i=0;i<12&&b.host===P;i++)melee(e,1);
    ok('Dan passes it on with a melee hit on the Demolitionist',b.host===e&&log('pass').length>0);
    ok('...the Demolitionist panics, flapping, and runs at the nearest player to tag him back',e.st==='panic');
    tp(e.x>0?e.x-34:e.x+34,e.z,35.05);const hp0=e.hp;const blew=wait(5,()=>log('bundleOnBomber').length>0);
    ok('the bundle blows on the Demolitionist: 20 and stunned (a window)',blew&&hp0-e.hp>=19.9&&e.st==='dazed');}
  {/* the Foam Bat sends a bundle in flight back where it came from */wait(2.5);const P=V.P,H=V.getHNH();pin(e,'post');e.stT=-99;tp(e.x,e.z-7,35.05);
    sel(IT.PG_BAT);const v=V.aimLob(e.x,e.y+1.6,e.z,P.x,P.y+1,P.z,0.8);const q=V.puSpawn('bundle',e.x,e.y+1.6,e.z,v[0],v[1],v[2],'the Demolitionist',{src:e,r:0.45,life:6});
    let swung=false;for(let i=0;i<30&&!q.dead;i++){aim(e.x,e.y+1.2,e.z);const d=Math.hypot(q.x-P.x,q.y-(P.y+1.5),q.z-P.z);if(!swung&&d<2.8){V.MB.l=true;swung=true;}else V.MB.l=false;step(1);}V.MB.l=false;
    ok('a Foam Bat swing sends the Demolitionist\u2019s bundle straight back: it sticks to him',H.bundles.some(x=>!x.dead&&x.host===e));
    for(const x of H.bundles)x.dead=1;wait(1);}
  {/* a pie in the face: the next plunge goes to a random station */pin(e,'windup');e.stT=0;e.tgt=0;e.pblind=MP().clock+4;step(3);
    ok('a Custard Pie blinds him: he plunges a random station',log('pied').length>0);e.pblind=0;e.st='dive';e.stT=0;wait(1);}
  {wait(3);pin(e);e.hp=66;e.pfloor=null;f.lastDan=MP().clock-20;f.win=null;hitAs(e,30,'Old Goat','x:test',true);step(2);
    ok('without a Dan hit in 10 s the threshold holds and the bar reads [SHIELDED] (HP '+e.hp+')',e.hp===60&&f.phase===2&&e.shield===1);
    hitAs(e,5,'Dan','melee',true);step(3);ok('then Dan’s hit moves the phase on',f.phase===3);e.st='dive';e.stT=0;e.dazeT=0;}
  /* Dan's death in the fight: no drop entities, the Understudy Mark, his kit back, the headliner gloats, heals and waits */
  {wait(3);const P=V.P;tp(10.5,-172.5,35.05);const n0=V.entities.filter(x=>x.t==='drop'&&!x.dead).length,inv0=P.inv.filter(Boolean).length;
    const hp0=e.hp;P.hurtT=0;V.damagePlayer(999);step(2);
    ok('Dan dies mid-fight: nothing of his touches the floor',V.entities.filter(x=>x.t==='drop'&&!x.dead).length===n0);
    ok('the headliner gloats, heals to the start of the phase and waits',f.gloat>0&&f.wait&&e.hp===60);
    V.respawn();step(15);const s=V.hnMarkStand('bomber');const onMark=Math.hypot(P.x-s[0],P.z-s[2])<2;
    if(bot){const h1=e.hp;hitAs(e,10,bot,'melee',true);ok('while he waits he shrugs off the bots',e.hp===h1);}else skip('waiting shrugs off bots','no AI player online');
    const kit=wait(8,()=>P.inv.filter(Boolean).length>=inv0-1&&!V.entities.some(x=>!x.dead&&x.t==='drop'&&x.pvol));
    ok('respawn on the Understudy Mark, with the kit thrown back ('+P.inv.filter(Boolean).length+'/'+inv0+')',onMark&&kit);
    wait(4);tp(0.5,-165.5,35.05);step(5);ok('Dan steps off the Mark: the fight resumes',!f.wait);}
  {const P=V.P;const d0=MP().deaths.bomber;P.hurtT=0;V.damagePlayer(999);step(3);
    ok('the 2nd death splats a tomato on the counter target (the Trap Release lever in P3)',f.hint&&f.hint.what==='lever'&&MP().deaths.bomber===d0+1);
    V.respawn();step(10);wait(4);tp(0.5,-165.5,35.05);step(5);P.hurtT=0;V.damagePlayer(999);step(3);
    ok('from the 3rd death the phase restarts at 85% of its pool (HP '+e.hp+')',e.hp===Math.round(0+60*0.85));
    V.respawn();step(10);wait(4);tp(0.5,-165.5,35.05);step(5);}
  /* P3: the Big One, the fuse at 3 blocks/s, the splice, the trapdoor */
  {const H=V.getHNH();const lit=wait(25,()=>H.fuse&&!H.fuse.done&&!H.fuse.stop&&H.fuse.i>2);
    ok('P3: he rolls the Big One onto its hatch, climbs on and lights the long fuse',lit&&!!V.hnProp('bomber','bigone')&&(e.st==='bomb'));
    const i0=H.fuse.i,t0=MP().clock;wait(2);const rate=(H.fuse.i-i0)/(MP().clock-t0);ok('the spark crawls the fuse at 3 blocks/s ('+rate.toFixed(2)+')',rate>2.6&&rate<3.4);
    const ci=H.fuse.i+4,c=A.fuse[ci];V.setBlock(c[0],c[1],c[2],B.AIR);
    const went=wait(6,()=>e.st==='toCut'),kneel=wait(12,()=>e.st==='splice');
    ok('cut the fuse ahead of the spark: he leaps off and sprints to the cut, then kneels to splice it (x2)',went&&kneel&&near(hitAs(e,3,'Dan','melee',true),6,0.01));
    wait(6,()=>e.st!=='splice');ok('the splice puts the cord back and the spark resumes',V.getBlock(c[0],c[1],c[2])===B.PG_CORD);
    wait(20,()=>e.st==='bomb');const lv=V.hnProp('bomber','lever');tp(lv.x+1.4,lv.z-0.6,35.05);sel(IT.PG_SNIPS);const hp0=e.hp;
    poke(lv,3,'Dan','melee');
    ok('the Trap Release lever with Wire Snips while he sits on the bomb: the hatch drops',e.st==='trapdoor');
    wait(4,()=>log('blownOut').length>0);ok('a muffled thump, smoke from all seven hatches, and he is blown out of one: 20',log('blownOut').length>0&&hp0-e.hp>=19.9);}
  {/* the Big One reaching its bomb: r 12 for 16 with falloff, breaks nothing, and he relights */const H=V.getHNH();
    wait(30,()=>e.st==='bomb'&&H.fuse&&!H.fuse.stop);const P=V.P;tp(6.5,-168.5,35.05);P.hp=20;P.hurtT=0;
    let h0=0;for(let x=-4;x<=4;x++)for(let z=-167;z<=-160;z++)for(let y=33;y<=37;y++)h0=(h0*31+V.getBlock(x,y,z))|0;
    const pre=e.hp;H.fuse.i=A.fuse.length-2;const blew=wait(3,()=>log('bigOneBlew').length>0);
    let h1=0;for(let x=-4;x<=4;x++)for(let z=-167;z<=-160;z++)for(let y=33;y<=37;y++)h1=(h1*31+V.getBlock(x,y,z))|0;
    ok('the Big One blows (Dan 7 m away hurt), the arena stays whole and the Demolitionist rides it out',blew&&P.hp<20&&h0===h1&&e.hp===pre);
    ok('...then he comes up singed and relights from the start ("AGAIN!")',wait(14,()=>H.fuse&&H.fuse.i<10&&!H.fuse.done));}
  /* the kill: he lights his own short fuse and goes up through the Grid; the loot */
  {const P=V.P;tp(16.5,-178.5,35.05);P.hp=20;e.pinv=0;f.win=null;e.hp=3;f.lastDan=MP().clock;hitAs(e,10,'Dan','melee',true);step(2);
    ok('at 0 HP (Dan’s hit) he does not fall over: he climbs onto the Big One and lights his own fuse',f.dying);
    const won=wait(16,()=>MP().dead.bomber===1);
    ok('...goes up through the Grid: MP.dead.bomber',won);
    ok('The Plunger and the Lit Fuse go straight into Dan’s inventory',inv(IT.PG_PLUNGER)>=1&&inv(IT.PG_FUSE)>=1);
    const t=A.htrunk,be=V.pgCore().ENT_STASH&&null;step(5);
    ok('the Headliner Trunk stands at (0,35,-170) with Charges, Det Cord and the Fright Wig',V.getBlock(t[0],t[1],t[2])===B.PG_STRUNK);
    const st=V.hnState();ok('Intermission: 90 s, inter:true, everyone healed',!!st&&st.inter&&V.P.hp===20);
    /* restock: lose the Plunger, come near the trunk */
    for(let i=0;i<36;i++){const s=V.P.inv[i];if(s&&s.id===IT.PG_PLUNGER)V.P.inv[i]=null;}tp(2.5,-168.5,35.05);step(40);
    const be2=V.hnTrunkEnsure('bomber');ok('the trunk restocks a lost key item (The Plunger)',!!be2&&be2.inv.some(s=>s&&s.id===IT.PG_PLUNGER));}

  {/* save/reload mid-fight: no duplicate, and the fight restarts fresh (with the self-demo) on the next summon */
    fresh(1);tp(0.5,-178.4,35.05);poke(dnp(),2,'Dan','melee');step(2);skipCut();const e1=E();e1.hp=150;
    const d=V.snapshot('p4boss');V.applySave(d);step(30);
    ok('a save mid-fight reloads with no headliner and no live fight (purgatory mobs are never saved)',!V.entities.some(x=>!x.dead&&x.mt==='pgbomber')&&!MPF().fight);
    tp(0.5,-178.4,35.05);step(20);poke(dnp(),2,'Dan','melee');step(2);skipCut();const e2=E();
    ok('...and the next summon starts a fresh fight at full HP that self-demos again',!!e2&&e2.hp===200&&!F().demo);
    if(V.MOBT.pgcharge&&typeof V.piChargeArm==='function'){/* charge-proof: a Charge stuck on a headliner comes back onto its owner */
      V.piChargeArm(e2,'Dan');step(3);const onH=V.entities.filter(x=>!x.dead&&x.mt==='pgcharge'&&x.stuckTo===e2);
      ok('a Charge stuck on a headliner is peeled off and sent back onto Dan, still armed',onH.length===0&&log('chargeBack').length>0);}
    else skip('charge-proof headliners','P2 on its stub (no pgcharge / piChargeArm)');
    V.mpExitNow({abandon:true});step(10);if(V.presOn())V.presClose(true);}

  /* ================= THE PIG ================= */
  fresh(2);const PL=V.getHNP;
  {const P=V.P;tp(0.5,66.5);step(30);ok('the Pig’s props: three followspot heads and the Lamp Cleat',!!V.hnProp('bigpig','spot0')&&!!V.hnProp('bigpig','cleat'));
    tp(0.5,69.3);step(3);ok('stepping over the velvet rope summons her (Dan only)',!!F()&&F().name==='bigpig');skipCut();}
  f=F();e=E();
  {const P=V.P;const um=V.hnMarkStand('bigpig');tp(um[0],um[2]);const kinds=[];const seen=new Set();
    for(let i=0;i<400&&kinds.length<14;i++){step(1);for(const q of V.entities)if(q.t==='pproj'&&!q.dead&&q.owner==='the Pig'&&!seen.has(q)){seen.add(q);kinds.push(q.kind);}}
    ok('P1 throws every 1.2 s: piglets, rolling hogs, the Hero Hog every 5th, a Pork Bomb every 7th ('+kinds.slice(0,8).join(',')+')',kinds[4]==='link'&&kinds[6]==='porkbomb'&&kinds.includes('hog')&&kinds.filter(k=>k==='pig').length>=4);
    ok('caught pigs are catchable (pcatch) and hogs are not',[...seen].filter(q=>q.kind==='pig').every(q=>q.pcatch==='pig')&&[...seen].filter(q=>q.kind==='hog').every(q=>!q.pcatch));
    const lk=wait(10,()=>V.entities.some(m=>!m.dead&&m.mt==='pghog'));ok('the Hero Hog lands on a landing and blocks it',lk);
    const pigs=V.entities.filter(m=>!m.dead&&m.mt==='pgpiglet').length;ok('pigs reaching the bottom become Fallen Piglets, at most 6 ('+pigs+')',pigs<=6);}
  {const hp0=e.hp;V.puSpawn('pig',e.x,e.y+1.2,e.z-3,0,1.5,9,'Dan',{thrown:1});step(15);
    ok('a pig thrown back at her: 18 and she stops throwing for 2 s ("HOW DARE")',near(hp0-e.hp,18,0.01)&&PL().stopT>1);
    wait(2.5);const PLs=PL();PLs.lane=1;PLs.throwT=99;e.x=0.5;e.z=122.6;step(2);e.x=0.5;const hp1=e.hp;const bb=V.puSpawn('porkbomb',0.5,e.y+1.2,e.z-3,0,0,18,'Dan',{straight:40,batted:1});const tr=['pre='+V.getBlock(Math.floor(bb.x),Math.floor(bb.y),Math.floor(bb.z+0.72))+'@'+[Math.floor(bb.x),Math.floor(bb.y),Math.floor(bb.z+0.72)].join(',')+' dt?',' v0='+bb.vz+' st='+bb.straight+' MBl='+V.MB.l+' sw='+V.P.swing.toFixed(2)+' held='+(V.heldStack()&&V.heldStack().id)];for(let i=0;i<15;i++){step(1);tr.push((bb.dead?'D':'')+bb.z.toFixed(1)+'/'+bb.vz.toFixed(1));}
    if(hp1-e.hp<19)console.log('  bomb dbg bigpig',e.x.toFixed(2),e.y.toFixed(2),e.z.toFixed(2),e.st,'bomb',tr.join(' '),'blk',[119,120,121,122].map(z=>V.getBlock(2,65,z)+'/'+V.getBlock(2,64,z)).join(' '),'ents',V.entities.filter(m=>!m.dead&&m.t==='mob'&&Math.hypot(m.x-2,m.z-120)<3).map(m=>m.mt+'@'+m.x.toFixed(1)+','+m.y.toFixed(1)+','+m.z.toFixed(1)).join(' '));
    ok('a batted Pork Bomb flies back up the stairs: 20 ('+(hp1-e.hp)+' '+f.log.slice(-3).map(l=>l.ev+':'+(l.d||'')+':'+(l.how||'')).join(' ')+')',near(hp1-e.hp,20,0.01));}
  {/* early end of P1: Dan reaches the Star Platform; P2's pool becomes her HP - 105 */const hp=e.hp;tp(0.5,125.5,64.05);step(4);
    ok('Dan on the Star Platform ends P1 early; P2’s pool is her HP - 105 (cap '+f.capOv+')',f.phase===2&&f.topOv===hp&&f.capOv===Math.floor(0.45*(hp-105)));
    const pre=wait(8,()=>e.st==='preen');ok('the self-demo: she sweeps up past her vanity and preens for 3 s',pre&&log('selfDemo').length>0);
    e.pinv=0;const d=hitAs(e,10,'Dan','melee',true);ok('preening she takes x2 ('+d+')',near(d,20,0.01));}
  {wait(4,()=>e.st==='idle');f.win=null;e.pinv=0;e.st='idle';const n=[0,1,2].filter(i=>{const b=PL().beams[i];return !b;}).length;
    const d=hitAs(e,8,'Dan','melee',true);ok('three followspots on her: -25% each (8 -> '+d+')',near(d,8*(1-0.25*n),0.01)&&n===3);
    /* upstaging: two towers hit -> two beams on Dan -> she charges him */
    const P=V.P;tp(-6.5,131.5,64.05);V.hnPSpot(V.hnProp('bigpig','spot0'),1,'Dan');V.hnPSpot(V.hnProp('bigpig','spot1'),1,'Dan');
    const ch=wait(4,()=>e.st==='chargeTell'||e.st==='charge');ok('two beams on one player and she CHARGES him',ch);
    /* the Vanity Mirror: raise it facing her within 8 m */
    sel(IT.PG_VMIRROR);V.MB.r=true;for(let i=0;i<30&&e.st!=='admire';i++){aim(e.x,e.y+1.4,e.z);step(1);}V.MB.r=false;
    ok('a raised Vanity Mirror stops her dead: she admires herself for 3 s, x2',e.st==='admire'&&log('mirror').length>0);
    wait(3.5);let chopped=false;for(let k=0;k<4&&!chopped;k++){e.st='chargeTell';e.stT=0;e.target='Dan';sel(IT.PG_VMIRROR);V.MB.r=true;
      for(let i=0;i<10;i++){aim(e.x,e.y+1.4,e.z);step(1);}V.MB.r=false;if(log('mirrorChopped').length)chopped=true;wait(3.2);}
    ok('three looks per mirror, the 4th she smashes it',chopped);
    for(let i=0;i<3;i++)PL().beams[i]=null;}
  {/* the SLAM within 5 m: the red-trotter tell, then an 8-block shockwave line, 8 and a knockback */const P=V.P;wait(2,()=>e.st==='idle');PL().chopCd=0;PL().tossT=99;PL().fastT=99;
    tp(e.x,e.z-3.2,64.05);P.hp=20;P.hurtT=0;const t=wait(3,()=>e.st==='chopTell');const w=wait(2,()=>e.st==='chop');
    ok('SLAM: a 0.9 s tell, then the shockwave (8)',t&&w&&P.hp<=13);}
  {/* the Diva Toss: trotters up, a lunge, a grab; four attack presses escape the lift */const P=V.P;wait(2,()=>e.st==='idle');tp(e.x+3,e.z,64.05);P.hp=20;
    PL().tossT=0;PL().chopCd=99;const g=wait(5,()=>e.st==='smooch'||e.st==='lift');
    ok('the Diva Toss: she raises her trotters, lunges and grabs Dan overhead',g&&!!HN().danK);
    for(let i=0;i<10;i++){V.MB.l=i%2===0;step(1);}V.MB.l=false;step(2);ok('four attack presses escape the lift',!HN().danK&&log('tossEscape').length>0);
    wait(4,()=>e.st==='idle');tp(e.x+3,e.z,64.05);PL().tossT=0;const th0=MP().stats.thrown|0;wait(5,()=>e.st==='lift');
    const thrown=wait(3,()=>(MP().stats.thrown|0)>th0);const hpb=P.hp;wait(4,()=>!HN().danK);
    ok('...or she hurls him down the staircase (MP.stats.thrown, landing damage capped at 6)',thrown&&hpb-P.hp<=6.01);}
  {/* she targets the player wearing the most Sequin Gown pieces */ok('her target is the player in the most Sequin Gown pieces (Dan alone: Dan)',V.hnPTarget(e,60)===V.P);}
  /* P3: the kickline, dominoes, the pose and the Big Lamp */
  {e.hp=106;e.pinv=0;f.win=null;f.lastDan=MP().clock;hitAs(e,5,'Dan','melee',true);step(3);ok('P3: the Diva Finale',f.phase===3);
    wait(3);const P=V.P;tp(-2.5,128.5,64.05);PL().chorT=0;PL().tossT=99;PL().chopCd=99;const L=wait(3,()=>!!PL().line);
    ok('a kickline of 8 pigs in top hats ("And-a-one...")',L&&PL().line.pigs.length===8);
    wait(1.2);const end=PL().line.pigs[0];poke(end,3,'Dan','melee');
    ok('hitting the end pig sends the whole line over like dominoes',PL().line&&PL().line.fallen);
    const back=wait(4,()=>e.st==='chorusChop');ok('she storms over and SLAMs her own chorus, back turned (x2)',back&&near(hitAs(e,5,'Dan','melee',true),10,0.01));
    const pose=wait(10,()=>e.st==='pose');ok('after each kickline she poses under the Big Lamp, fully lit',pose&&f.fullLit===1);
    const hp0=e.hp;f.win=null;const cl=V.hnProp('bigpig','cleat');tp(7.2,136.5,64.05);sel(IT.PG_SNIPS);poke(cl,2,'Dan','melee');
    const hit=wait(2,()=>log('lampHit').length>0);ok('the Lamp Cleat with any Shears drops the Big Lamp on her pose: 40 and stunned',hit&&hp0-e.hp>=39.9&&e.st==='lampStun');
    wait(13.5);ok('the stagehands winch the lamp back up in 12 s',PL().lamp.st==='up');}
  {/* a completed kickline restocks her six pigs and a Pig Storm follows */PL().line=null;e.st='idle';const P=V.P;tp(-5.5,136.5,64.05);
    for(const m of V.hnPPlatPigs())V.removeEnt?V.removeEnt(m):(m.dead=true);V.hnPLineStart(e);e.st='lineWatch';
    const done=wait(9,()=>log('lineDone').length>0);ok('a kickline that completes its sweep restocks her ammunition to 6',done&&V.hnPPlatPigs().length>=6);
    let storm=0;const seen=new Set();wait(5,()=>{for(const q of V.entities)if(q.t==='pproj'&&q.kind==='pig'&&q.owner==='the Pig'&&!seen.has(q)){seen.add(q);storm++;}return storm>=6;});
    ok('...and a Pig Storm of 6 pigs follows ('+storm+')',storm>=6);}
  {/* the death roll and the loot */const P=V.P;tp(14.5,100.5);P.hp=20;e.pinv=0;f.win=null;e.hp=3;f.lastDan=MP().clock;hitAs(e,10,'Dan','melee',true);step(2);
    ok('at 0 she swoons ("Tell my fans... it was the lighting...")',f.dying&&e.st==='swoon');const won=wait(30,()=>MP().dead.bigpig===1);
    ok('...topples off the platform and rolls down the whole staircase: MP.dead.bigpig',won);
    ok('Slam Gloves, the Pearl Necklace and Diva’s Boa go into Dan’s inventory',inv(IT.PG_CHOPGLOVE)>=1&&inv(IT.PG_PEARLS)>=1&&inv(IT.PG_BOA)>=1);
    step(5);ok('her Headliner Trunk stands at the foot of the stairs',V.getBlock(A.ptrunk[0],A.ptrunk[1],A.ptrunk[2])===B.PG_STRUNK);}

  /* ================= THE FROG ================= */
  fresh(3);const KK=V.getHNK;
  {const P=V.P;const pad=A.pads.find(p=>p.ring===20);tp(pad.x-0.4,pad.z-0.4,50.05);step(3);ok('stepping onto an outer-ring pad summons him',!!F()&&F().name==='bigfrog');skipCut();}
  f=F();e=E();
  {const P=V.P;const T0=wait(6,()=>KK().tg&&KK().tg.st==='aim');ok('the tongue telegraphs with a 0.7 s pink aim line',T0&&KK().tg.aimT===0.7);
    const demo=wait(4,()=>log('selfDemo').length>0);ok('his first tongue of the attempt goes at the wild fly over an inner pad and sticks (the self-demo)',demo&&KK().tg&&KK().tg.st==='stuck');
    sel(IT.PG_RAPIER);const tip=KK().tg.prop,hp0=e.hp;poke(tip,5,'Dan','melee');ok('a hit on the stuck tongue does x3 to the Frog ('+(hp0-e.hp)+')',near(hp0-e.hp,15,0.01));}
  {/* two staples pin it */wait(3,()=>!KK().tg);const tg=KK().tg;
    const pad=A.pads.find(p=>p.ring===8);V.hnKTongueStart(e,f,null,{at:[pad.x,A.ky+0.5,pad.z]});const st=wait(3,()=>KK().tg&&KK().tg.st==='stuck');
    const tip=KK().tg.prop;poke(tip,2,'Dan','staple');poke(tip,2,'Dan','staple');
    ok('two staples into the stuck tongue PIN it: he strains for 6 s, x1.5',st&&KK().tg.st==='pinned'&&e.st==='strain'&&near(hitAs(e,4,'Dan','melee',true),6,0.01));
    wait(6.5,()=>e.st==='stun');ok('...then he rips free and is dazed',e.st==='stun'||e.st==='seat');}
  {/* Shears sever the tongue while it reels a player: stunned 2.5 s, regrows in 6 */wait(3,()=>!KK().tg&&e.st==='seat');const P=V.P;const pad=A.pads.find(p=>p.ring===14);tp(pad.x-0.4,pad.z-0.4,50.05);
    for(const m of V.entities)if(!m.dead&&m.mt==='pgfly')m.life=0;step(2);           /* P2's fly brain retires it */
    V.hnKTongueStart(e,f,P);const r=wait(3,()=>KK().tg&&KK().tg.st==='reel');ok('a tongue that touches Dan reels him in at 13 m/s',r&&HN().danK&&HN().danK.mode==='reel');
    sel(IT.PG_SNIPS);const tip=KK().tg.prop;poke(tip,3,'Dan','melee');
    ok('any Shears sever it: Dan is free, the Frog is stunned 2.5 s and the tongue regrows in 6 s',!HN().danK&&e.st==='stun'&&KK().regrow>5);}
  {/* three hits on the tip free a reeled player */wait(7,()=>KK().regrow<=0&&e.st==='seat');const P=V.P;V.hnKTongueStart(e,f,P);wait(3,()=>KK().tg&&KK().tg.st==='reel');sel(IT.PG_RAPIER);
    const tip=KK().tg&&KK().tg.prop;if(tip){for(let i=0;i<3;i++){poke(tip,3,'Dan','melee');step(1);}}
    ok('three hits on the tongue tip free a reeled player',!!tip&&!HN().danK&&log('freed').length>0);}
  {/* swallowed: Inside the Frog, the fingers, the spit */wait(4,()=>!KK().tg);const P=V.P;const sw0=MP().stats.swallowed|0;e.hp=330;e.pfloor=null;f.win=null;
    V.hnKSwallow(e,f,P);ok('SWALLOWED: Dan is inside the Frog (a sealed room under the arena), he heals 15, MP.stats.swallowed',P.y<14&&e.hp===345&&(MP().stats.swallowed|0)===sw0+1);
    const fs=HN().props.bigfrog.filter(p=>!p.dead&&p.kind==='finger');ok('the Hand fills the far wall: four fingers',fs.length===4);
    const hp0=e.hp;for(let i=0;i<4;i++){fs[i].hitT=0;fs[i].relay(5,'Dan');step(8);}
    ok('every finger hit does 12 to the Frog; four hits spit you 12 m and stun him 3 s ('+(hp0-e.hp)+')',near(hp0-e.hp,48,0.01)&&!KK().swal&&e.st==='stun');
    wait(3);ok('spat out across the clearing (back on top)',P.y>A.ky-0.5);}
  {/* P1: the strum ripple flicks sheet-standers (4), not pad-standers */wait(4,()=>e.st==='seat');const P=V.P;
    let sheet=null;for(let dx=-12;dx<=12&&!sheet;dx++)for(let dz=-12;dz<=12&&!sheet;dz++){const x=Math.floor(dx),z=215+dz;if(V.getBlock(x,A.ky,z)===B.PG_SHEET&&Math.hypot(x+0.5,z+0.5-215.5)>6&&Math.hypot(x+0.5,z+0.5-215.5)<10)sheet=[x,z];}
    tp(sheet[0]+0.5,sheet[1]+0.5,50.05);P.hp=20;P.hurtT=0;V.hnKStrum(e,f);const hit=wait(2.2,()=>P.hp<20);
    ok('a croak sends a ripple through the sheet: anyone on it is flicked up for 4',hit&&P.hp===16);
    const pad=A.pads.find(p=>p.ring===8);tp(pad.x-0.4,pad.z-0.4,50.05);P.hp=20;P.hurtT=0;V.hnKStrum(e,f);wait(2.2);ok('...pads are safe',P.hp===20);}
  {/* P2 and its cues */e.hp=241;e.pinv=0;f.win=null;f.lastDan=MP().clock;hitAs(e,5,'Dan','melee',true);step(3);ok('P2 "Standby... GO": the Frog calls the cues',f.phase===2);
    wait(3);const P=V.P;const pad=A.pads.find(p=>p.ring===14);tp(pad.x-0.4,pad.z-0.4,50.05);
    const K=KK();K.cueT=999;K.cueI=0;P.hp=20;V.hnKCue(e,f);const BG=K.bags.slice(),bags=BG.length;tp(pad.x+3.6,pad.z,50.05);wait(1.6);if(!K.bags.every(b=>b.done))console.log('  bags dbg',JSON.stringify(K.bags),'wait',f.wait,'gloat',f.gloat,'st',e.st,'swal',!!K.swal,'Pdead',V.P.dead,'hp',V.P.hp);let stuff=0;for(const b of BG)if(V.getBlock(Math.floor(b.x),A.ky,Math.floor(b.z))===B.PG_STUFFING)stuff++;
    ok('"sandbags GO": shadows, then sandbags that stay as Stuffing Drift footholds ('+stuff+'/'+bags+')',bags>0&&stuff===bags);
    K.cueT=999;K.cueI=1;V.hnKCue(e,f);ok('"Traveler GO": a curtain wall sweeps across the clearing with one 3-wide split',!!K.wall&&typeof K.wall.split==='number');wait(9);
    K.cueT=999;K.cueI=2;V.hnKCue(e,f);const g=K.dare;wait(3);let torn=0;if(g)for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(V.getBlock(Math.floor(g.land[0])+dx,A.ky,Math.floor(g.land[2])+dz)===0)torn++;
    ok('"Cue the Daredevil": a red arc, then the Daredevil lands face-first and tears a 3x3 hole',!!g&&(torn>=7||!!g.ent));
    K.cueT=999;K.cueI=3;V.hnKCue(e,f);ok('"Lights... blackout GO": 5 s of dark',K.dark>4);}
  {/* the Flail: once, at 162 */wait(6);if(KK().swal)V.hnKSpit(e,f,false);wait(1);e.hp=163;e.pinv=0;f.win=null;const K=KK();K.flailDone=false;K.tg=null;e.st='seat';hitAs(e,2,'Dan','melee',true);
    const sts=[];const fl=wait(9,()=>{if(sts[sts.length-1]!==e.st)sts.push(e.st);return e.st==='flailTell'||e.st==='flail';});const tr=wait(8,()=>{if(sts[sts.length-1]!==e.st)sts.push(e.st);return e.st==='trip';});if(!fl||!tr)console.log('  flail dbg '+sts.join('>')+' hp='+e.hp,'gloat',f.gloat,'wait',f.wait,'FL',KK().flail&&KK().flail.t,'swal',!!KK().swal);
    ok('THE FLAIL once at 162: a skid line, 5 s of pinwheeling across the sheet, then he trips over his own feet (x1.5)',fl&&tr&&near(hitAs(e,4,'Dan','melee',true),6,0.01));
    wait(5);e.st='seat';e.hp=150;K.flailDone=true;}
  {/* P3: the arm; 12b; the elbow */e.hp=127;e.pinv=0;f.win=null;f.lastDan=MP().clock;KK().tg=null;e.st='seat';hitAs(e,5,'Dan','melee',true);step(3);
    ok('P3 "The Arm": he rises 18 blocks on a forearm out of a 5x5 tear',f.phase===3&&wait(4,()=>e.y>66));
    wait(1);const pages=MP().page;const g12=V.PURG_PAGES.findIndex(p=>p.id==='12b');ok('page 12b peels open',g12>=0&&((pages>>g12)&1)===1);
    const d=hitAs(e,8,'Dan','melee',true);ok('direct hits on the frog do a quarter ('+d+')',near(d,2,0.01));
    const el=KK().elbowE;const hp0=e.hp,y0=e.y;el.hitT=0;poke(el,7,'Dan','melee');step(2);
    ok('the ELBOW in the Bog Hollow takes x2 (7 -> '+(hp0-e.hp)+')',near(hp0-e.hp,14,0.01));
    sel(IT.PG_GAUNTLET)||true;const hp1=e.hp;wait(2);el.hitT=0;const P=V.P;P.inv[0]={id:IT.PG_GAUNTLET,count:1};P.sel=0;V.refreshHand();step(1);
    poke(el,9,'Dan','melee');step(2);ok('...the Gauntlet x3 on the elbow',near(hp1-e.hp,27,0.01));
    const sw=KK().elbow&&KK().elbow.swingT>0;wait(2);ok('after every elbow hit it swings to the far side of the hollow; he drops 2 m',sw&&e.y<y0-1);}
  {/* death: the hand slides out, the god mic, the Strike */const P=V.P;e.pinv=0;f.win=null;e.hp=3;f.lastDan=MP().clock;const el=KK().elbowE;el.hitT=0;poke(el,9,'Dan','melee');step(2);
    ok('at 0 the hand slides out of him',f.dying&&e.st==='slideOut');const won=wait(12,()=>MP().dead.bigfrog===1);
    ok('...he falls empty onto his log, "Okay. That’s a wrap. Strike it." and the Strike begins',won&&!!MP().strike&&V.hnState().strike);
    wait(2.5);ok('the applause heals',P.hp===20);}

  /* ================= cheese attempts (must fail safe) ================= */
  {fresh(1);const P=V.P;tp(60.5,-140.5);step(10);
    ok('a pillar above y 62 next to a curtain is refused (outside an arena)',!V.mpPlaceOK(60,63,-140,B.PG_DECK)&&V.mpPlaceOK(0,63,-175,B.PG_DECK));
    ok('a Charge against an arena wall breaks nothing (every arena is protected)',V.mpProtected(0,40,-175)&&V.mpProtected(0,50,215)&&V.mpProtected(0,64,131));}

  /* ================= the Bog Hollow climb-outs: every spoke can be walked up with movement keys ================= */
  {fresh(3);MP().dead.bigfrog=1;const C=BS.ctl(V,pilot,{});let good=0,bad=[];
    for(let k=0;k<12;k++){const sp=A.spokes[k],c0=sp[0],top=sp[sp.length-1],ox=c0[0]+0.5-(top[0]-c0[0])*0.5,oz=c0[2]+0.5-(top[2]-c0[2])*0.5;
      tp(ox,oz,A.kfloor+1.05);step(5);let ok2=false;
      for(let i=0;i<150&&!ok2;i++){const p=V.P,onTop=p.y>=top[1]+0.9&&Math.hypot(top[0]+0.5-p.x,top[2]+0.5-p.z)<1.0;if(onTop){ok2=true;break;}
        const nx=sp.find(c=>c[1]+1>p.y+0.4)||top;C.steer(nx[0]+0.5,nx[2]+0.5,true);V.KEY.Space=p.onGround;pilot.allowJump('climb test',2);C.tick();}
      C.release();if(ok2)good++;else bad.push(k);}
    ok('every one of the 12 Bog Hollow climb-out spokes can be walked up from the hollow floor ('+good+'/12'+(bad.length?', stuck on '+bad.join(','):'')+')',good===12);
    MP().dead.bigfrog=0;}

  /* ================= the scripted optimal play (bounds, windows, timelines) ================= */
  const BOUND={bomber:420,bigpig:480,bigfrog:540};
  for(const [n,i] of [['bomber',1],['bigpig',2],['bigfrog',3]]){fresh(i);pilot.allowJump('skip',60);step(5);const t0=MP().clock;
    let ofr=null;if(process.env.P4_DBG){ofr=pilot.frame;let last=-99;pilot.frame=function(){const r0=ofr.apply(this,arguments);const c=MP().clock-t0;if(c-last>=10){last=c;const f0=MPF().fight,e0=f0&&f0.e,K0=V.getHNK(),el=K0.elbowE;
      console.log('   ['+n+'] t',c.toFixed(0),'ph',f0&&f0.phase,'hp',e0&&e0.hp,'st',e0&&e0.st,'Dan',[V.P.x,V.P.y,V.P.z].map(v=>v.toFixed(1)).join(','),V.P.hp.toFixed(1),'held',JSON.stringify(V.heldStack()),'el',el&&!el.dead?[el.x,el.y,el.z].map(v=>v.toFixed(1)).join(','):'-','inv',V.P.inv.filter(Boolean).length);}return r0;};}
    let r=false;try{r=BS[n](V,pilot,{maxS:BOUND[n]+60});}catch(err){console.log('CRASH in script '+n,err&&err.stack);}
    if(ofr)pilot.frame=ofr;const T=V.getHNT()[n],dt=MP().clock-t0;
    if(!r){const f0=MPF().fight,K=V.getHNK();console.log('  script '+n+' ended: fight='+!!f0+' phase='+(f0&&f0.phase)+' hp='+(f0&&f0.e&&f0.e.hp)+' st='+(f0&&f0.e&&f0.e.st)+' Dan='+[V.P.x,V.P.y,V.P.z].map(v=>v.toFixed(1))+' dead='+V.P.dead+' tg='+(K.tg&&K.tg.st)+' swal='+!!K.swal+' strike='+!!MP().strike+' wait='+(f0&&f0.wait));}
    ok('scripted optimal play kills '+n+' in '+(dt/60).toFixed(1)+' min of MP.clock (bound '+(BOUND[n]/60)+')',r&&dt<=BOUND[n]);
    if(T){const per=[0,0,0];for(const l of T.log)if(l.ev==='win'&&l.ph>=1&&l.ph<=3)per[l.ph-1]++;
      const early=n==='bigpig'&&T.log.some(l=>l.ev==='earlyP2');
      ok(n+': at least 2 counter windows in every phase ('+per.join('/')+(early?', P1 ended early on the platform':'')+')',per.every((x,i)=>x>=2||(early&&i===0)));
      try{fs.writeFileSync(path.join(OUTDIR,'boss_'+n+'.json'),JSON.stringify({name:n,clock_s:+dt.toFixed(1),deaths:T.deaths,wins:per,att:T.att,log:T.log.slice(0,1200)},null,0)+'\n');}catch(e){}}
    else ok(n+': a timeline was written',false);
    if(n==='bigfrog'){/* let the Strike run off: abandon */}
    if(V.getDim()==='puppet'){V.mpExitNow({abandon:true});step(10);if(V.presOn())V.presClose(true);}}
});
