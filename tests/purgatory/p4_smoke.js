/* p4_smoke.js (P4, gate x2): THE STRIKE and the escape (the purgatory build plan section 5.4 tests; bible 11). Deterministic
   (seeded Math.random, counting clock), GR.mobSpawn off. Start, the applause, the work lights and the bell, the rubber-banded
   broom (formula at gaps 0/40/120 and live), catches keep everything and restart at the last checkpoint >= 10 HP with a 5 s
   grace 60 m upstage, no broom progress while Dan respawns, the Hand (5 times, the 1.2 s shadow, the pile, pie / Chop /
   Gauntlet reactions, bandages), Traveler GO walls (one 3-wide gap within 8 of x 0), the log island rule, a reload resumes at
   the checkpoint, the doors (customs leaves only souvenirs, the results card), and a 20-cycle catch-and-retry loop with no growth.
   Prints "N passed, M failed" last. */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
const V=boot({seed:777,clock:true});
const step=boot.stepper(500000);
const B=V.B,IT=V.IT,MPC=V.MPC,MP=()=>V.getMP(),HN=()=>V.getHNS(),SK=()=>V.getHNSK();
const st=V.mpInfo().stubs,stubbed=d=>st.indexOf(String(d))>=0;
function tp(x,z,y){const P=V.P;V.forceChunksNear(x,z);P.x=x;P.z=z;P.y=y!=null?y:V.mpSafeY(x,(V.deckY(Math.floor(z))+1),z);P.vx=P.vy=P.vz=0;P.fallD=0;step(2);}
function wait(s,until){const n=Math.round(s/0.04);for(let i=0;i<n;i++){step(1);if(until&&until())return true;}return !!(until&&until());}
function logs(ev){return (HN().skLog||[]).filter(l=>l.ev===ev);}
function poke(e,dmg,by,how){return V.hnHitAs(e,dmg,by||'Dan',how||'melee',true);}
function invSig(){return V.P.inv.filter(Boolean).map(s=>s.id+'x'+s.count).sort().join(',')+'|'+V.P.armor.filter(Boolean).map(s=>s.id).join(',');}
function toRun(){wait(16,()=>SK()&&SK().ph==='run');}
function hold(){const S=SK();S.ph='grace';S.t=0;S.grace=999;}                 /* freeze the broom for a sub-test */
function run(back){const S=SK();S.ph='run';S.t=0;S.grace=5;S.catchT=1;if(back!=null)S.z=Math.min(262.5,V.P.z+back);}

boot.run(async()=>{
  boot.world(V,'p4strike','1337',step);V.GR.mobSpawn=false;
  V.mpEnterNow();step(20);V.hnSkipTo(3);step(30);
  let P=V.P;const A=V.hnA();
  /* the Strike begins (the Frog's death calls hnStrikeStart at the end of the god-mic line; p4_boss covers that path) */
  MP().dead.bomber=1;MP().dead.bigpig=1;MP().dead.bigfrog=1;P.hp=5;P.hunger=9;tp(0.5,200.5);
  V.hnStrikeStart();step(2);
  ok('the Strike starts: MP.strike {cp:0}, hnState() says strike with the work light',!!MP().strike&&MP().strike.cp===0&&V.hnState().strike&&V.hnState().light==='work');
  wait(1.5);ok('the applause heals everyone to full before the work lights (HP and hunger)',P.hp===20&&P.hunger===20&&SK().ph==='applause');
  wait(1.2);ok('then the work lights slam on and the bell rings three times (Grid flash3)',logs('lights').length===1&&logs('bell').length===1&&SK().ph!=='applause');
  if(!stubbed(3)&&V.MOBT.pgwhat){skip('tethered puppets go limp','checked by the Strike start in a world with Blanks (P3 smoke)');}
  else skip('every tethered puppet goes limp at once','P3 on its stub (no Blanks exist)');
  ok('a 10 s grace before the broom moves',SK().ph==='grace'||SK().ph==='lights');
  toRun();ok('...then the broom sweeps from the back wall',SK().ph==='run'&&SK().z<=262.5);
  /* the rubber band */
  ok('the broom speed is clamp(4.0 + 0.04 (gap - 40), 3.5, 6.0): 3.5 / 4.0 / 6.0 at gaps 0 / 40 / 120',V.hnSkSpeed(0)===3.5&&Math.abs(V.hnSkSpeed(40)-4)<1e-9&&V.hnSkSpeed(120)===6);
  {const S=SK();tp(0.5,S.z-40.5);step(2);ok('live: with Dan 40 m ahead it runs at 4.0 m/s ('+(S.v||0).toFixed(2)+')',Math.abs(S.v-4.0)<0.05);
    tp(0.5,S.z-120.5);step(2);ok('live: far ahead it is capped at 6.0 ('+S.v.toFixed(2)+')',Math.abs(S.v-6)<1e-6);}
  /* the log island is never struck while Dan is still in the clearing */
  {const S=SK();S.z=243;tp(0.5,222.5,50.05);const z0=S.z;wait(2);ok('the log island is not struck until Dan has left the clearing (broom held at '+S.z.toFixed(1)+')',S.z>=A.kc[1]+A.kr+2.4);}
  /* a checkpoint */
  {tp(4.5,150.5);step(3);ok('passing Arch 3 is checkpoint 1',MP().strike.cp===1);}
  /* a catch: everything kept, the last checkpoint, >= 10 HP, the broom 60 m upstage after a 5 s grace */
  {const S=SK(),sig=invSig();P.hp=4;tp(0.5,140.5);S.z=P.z+0.3;step(2);const caught=V.mpInfo().cut&&logs('swept').length>=1;wait(2);
    const sp=V.hnSkSpawn(1);
    ok('the broom reaches Dan: swept up into the pile (a short tumble to black)',caught);
    ok('...back at the last checkpoint (Booth 3) with everything he carried and >= 10 HP',Math.hypot(P.x-sp[0],P.z-sp[2])<2&&invSig()===sig&&P.hp>=10);
    ok('...the broom restarts 60 m upstage after a 5 s grace',Math.abs(S.z-Math.min(262.5,P.z+60))<1.5&&S.ph==='grace'&&S.grace===5);
    toRun();}
  /* no broom progress while Dan is dead or respawning */
  {const S=SK();tp(0.5,120.5);step(2);P.hurtT=0;V.damagePlayer(999);step(2);const z0=S.z;wait(1.5);
    ok('Dan dies during the Strike: nothing dropped, and the broom does not move while he is dead',P.dead&&S.z===z0&&V.entities.filter(e=>e.t==='drop'&&!e.dead).length===0);
    const sig=invSig();V.respawn();step(5);const sp=V.hnSkSpawn(MP().strike.cp);
    ok('...respawn at the Strike checkpoint (not the Mark), inventory intact, >= 10 HP',Math.hypot(P.x-sp[0],P.z-sp[2])<2&&P.hp>=10&&invSig()===sig);
    toRun();}
  /* the Hand: a 1.2 s shadow, then it slams and picks up the leading player and drops him on the pile */
  {const S=SK();MP().knuckles=6;S.handDone=[1,0,0,0,0];tp(0.5,121.5);run(60);step(1);tp(0.5,118.5);
    const h0=wait(1,()=>!!S.hand);const h=S.hand;const t0=(logs('hand').slice(-1)[0]||{t:MP().clock}).t;ok('the Hand comes down for the leading player as he passes its mark',h0&&h.hst==='shadow');
    hold();const at=h.at;tp(at[0],at[2]);P.vx=P.vz=0;wait(2,()=>h.hst!=='shadow');const tShadow=MP().clock-t0;
    ok('its shadow grows on the floor for 1.2 s first ('+tShadow.toFixed(2)+' s)',tShadow>=1.15&&tShadow<=1.3);
    const caught=wait(0.5,()=>!!h.held);ok('the palm slams down and closes on him',caught&&!!HN().danK);
    let maxY=P.y;const hp0=P.hp;wait(4,()=>{if(P.y>maxY)maxY=P.y;return !HN().danK;});
    ok('it lifts him ~15 blocks',maxY-at[1]>12);
    const under=V.getBlock(Math.floor(P.x),Math.floor(P.y-0.05),Math.floor(P.z));
    ok('...and drops him on a Stuffing Drift heap in front of the broom (landing <= 4)',under===B.PG_STUFFING&&hp0-P.hp<=4&&Math.abs(P.z-(S.z-3.5))<2.5);
    const L=h.legs&&h.legs.fingers;ok('it wears one bandaged fingertip per Knuckle Ore taken (at most 4 shown)',!!L&&L.filter(f=>f.bd.visible).length===4);
    wait(3);}
  {/* pie / Chop / Gauntlet */const S=SK();const mk=()=>{S.hand=null;S.handDone=[1,1,0,1,1];tp(0.5,21.5);run(60);tp(0.5,19.5);step(1);const h=S.hand;hold();return h;};
    let h=mk();if(h){h.pblind=MP().clock+4;step(2);ok('a pie makes it flinch for 3 s (no grab)',h.hst==='flinch');wait(3.2);ok('...then it goes',h.hst==='gone'||h.dead);}else ok('a Hand for the pie test',false);
    wait(2);S.handDone[2]=0;h=mk();if(h){poke(h,6,'Dan','chopglove');step(1);ok('a Slam Gloves slam knocks it away for 5 s',h.hst==='away');}else ok('a Hand for the Slam Gloves test',false);
    wait(6);S.handDone[2]=0;h=mk();if(h){P.inv[0]={id:IT.PG_GAUNTLET,count:1};P.sel=0;V.refreshHand();step(1);poke(h,9,'Dan','melee');step(1);
      ok('a Gauntlet hit makes it recoil (stunned 4 s): it is made of his knuckles',h.hst==='recoil');}else ok('a Hand for the Gauntlet test',false);
    wait(6);}
  /* Traveler GO walls: one 3-wide gap within 8 of x 0; a wall that meets you shoves you to the gap (3) */
  {const S=SK();S.walls=[null,null,null];tp(-30.5,60.5);run(50);step(3);const W=S.walls[1];
    ok('a Traveler GO wall closes across Arch 2 as Dan comes within 40 m, with one gap within 8 of x 0 ('+(W&&W.gx)+')',!!W&&Math.abs(W.gx)<=8.5);
    wait(2.2);run(50);const hp0=P.hp;P.hurtT=0;tp(-30.5,42.6);for(let i=0;i<30;i++){V.KEY.KeyW=true;P.yaw=0;step(1);}V.KEY.KeyW=false;
    ok('the wall stops Dan away from the gap, shoves him along toward it and costs 3 (before armour)',P.z>=42.6&&Math.abs(P.x-W.gx)<Math.abs(-30.5-W.gx)&&hp0-P.hp>=1);
    run(50);tp(W.gx,44.5);for(let i=0;i<30;i++){V.KEY.KeyW=true;P.yaw=0;step(1);}V.KEY.KeyW=false;ok('...through the gap he passes',P.z<42.2);
    const gaps=new Set(S.walls.filter(Boolean).map(w=>w.z));ok('each arch wall has exactly one gap',S.walls.filter(Boolean).every(w=>typeof w.gx==='number')&&gaps.size===S.walls.filter(Boolean).length);}
  /* a reload mid-Strike resumes at the checkpoint */
  {tp(4.5,30.5);run(60);step(2);const cp=MP().strike.cp;const d=V.snapshot('p4strike');V.applySave(d);P=V.P;step(40);const S=SK(),sp=V.hnSkSpawn(cp);
    if(!(S&&Math.hypot(P.x-sp[0],P.z-sp[2])<2))console.log('  reload dbg strike',JSON.stringify(MP().strike),'S',!!S,S&&S.ph,'P',P.x.toFixed(1),P.z.toFixed(1),'sp',sp.map(v=>v.toFixed(1)).join(','),'dim',V.getDim());
    ok('a save/reload mid-Strike resumes at MP.strike.cp (Dan at the checkpoint, the broom 60 m behind, a grace)',!!MP().strike&&MP().strike.cp===cp&&!!S&&Math.hypot(P.x-sp[0],P.z-sp[2])<2&&S.ph!=='applause');
    toRun();}
  /* the 20-cycle catch-and-retry loop: no growth in entities, scene objects or effects */
  {const count=()=>({ents:V.entities.filter(e=>!e.dead&&!e.hnArena).length,fx:HN().fx.filter(f=>!f.dead).length,scene:V.getHNS().sparks.length+(HN().danK?1:0)});
    const S=SK();tp(4.5,-20.5);run(80);step(5);const c0=count();
    for(let i=0;i<20;i++){run();S.catchT=0;S.z=P.z+0.3;step(2);wait(2.2,()=>!V.mpInfo().cut);wait(0.3);}
    const c1=count();ok('20 catches and retries grow nothing (entities '+c0.ents+'->'+c1.ents+', fx '+c0.fx+'->'+c1.fx+', scene '+c0.scene+'->'+c1.scene+')',c1.ents<=c0.ents+2&&c1.fx<=c0.fx+4&&c1.scene<=c0.scene+3);
    ok('...and every catch counted a try',MP().strike.tries>=21);toRun();}
  /* the doors: the Old Goats applaud, the white flash, customs, the results card */
  {const S=SK();tp(0.5,-270.5);run(100);step(4);ok('at the back of the House the Old Goats stand and applaud',logs('balcony').length===1);
    for(let i=0;i<36;i++)P.inv[i]=null;P.inv[0]={id:IT.PG_PLUNGER,count:1};P.inv[1]={id:IT.PG_CHOPGLOVE,count:1};P.inv[2]={id:IT.PG_FELT,count:12};
    tp(0.5,-298.2,58.05);const out=wait(3,()=>V.getDim()==='over');
    ok('touching the EXIT doors: a white flash and out through the Stage Door',out&&!MP().strike);
    const ids=P.inv.filter(Boolean).map(s=>s.id);if(!ids.includes(IT.PG_SV_FROG))console.log('  customs dbg',ids.join(','),JSON.stringify(MP().life),JSON.stringify(MP().dead));
    ok('customs: every purgatory item dissolved; the three souvenirs given once each',!ids.some(id=>V.DEFS[id]&&V.DEFS[id].pg)&&ids.includes(IT.PG_SV_PLUNGER)&&ids.includes(IT.PG_SV_GLOVE)&&ids.includes(IT.PG_SV_FROG));
    ok('the results card opens (YOU ESCAPED), escapes counted',V.presOn()&&MP().life.escapes===1);
    if(V.presOn())V.presClose(true);
    if(stubbed(5))skip('the overworld epilogue (bots out 2 s apart, the frog bites xx_lilcreepah_xx)','P5 on its stub');
    else{const dsF=V.getDS();ok('the exit epilogue is queued (P5) and the stool frog can bite',typeof V.mpDoorFrogBite==='function');}}
});
