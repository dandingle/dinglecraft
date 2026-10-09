/* m_harness.js (lead framework, gate x1): THE FIGHT HARNESS (the Malgorath plan section 9.3). Deterministic (seeded
   Math.random, one boot), headless, real inputs only: the pilots steer with KEY/MB/yaw/pitch through the real controller, see only
   what Dan sees (the telegraph channel MGT.tel, mgTelHit/mgTelEscape, open weak points as mgpart entities, MGT.hint) and react no
   earlier than a human (REACT after a drawing locks). The walk back from the Bone Pile after a death is skipped (a teleport to the
   stair foot): it is not part of the fight. It proves, on whatever M2 is in the build (the scaffold's placeholder or the real fight):
     (a) a skilled pilot with endgame kit A wins R1 -> R3 in a sensible time (M2's fight.timeBound per round, total <= 15 game-minutes)
         with at most 2 counted deaths;
     (b) a naive pilot (stands, melees the nearest box, never dodges, never braces) with kit D loses: it clears no round within 150 s;
     (c) every mechanic M2 lists per round (fight.mechList) fires at least once during the skilled run;
     (d) no cheese: a pillar is eaten from under Dan within 6 s; damaging him then stepping out 10 s gives back the round's start bar;
         three bots spamming him can never end a round nor take him below 30.
   M2 owns the per-round strategy hints (MGT.hint), the mechanic list and the time bounds; this file owns the pilots and the bars.
   Detailed per-attack proofs (lock timings, caps, every cheese row of bible 16.3) live in M2's m2_fight.js. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const V=boot({seed:20261008});boot.detClock(V);   /* v6.3 (MZ): the same fight on an idle or a loaded machine */
const step=boot.stepper(900000);
const B=V.B,IT=V.IT,K=V.KEY,MB=V.MB;
const M=()=>V.getMALG(),info=()=>V.mgInfo(),T=()=>V.mgTel(),FA=()=>V.MGREG.fight||{};
const REACT=0.20;   /* seconds after a drawing locks before the skilled pilot moves (a human reaction) */
const keysUp=()=>{K.KeyW=K.KeyA=K.KeyS=K.KeyD=false;K.Space=false;K.ShiftLeft=false;K.ControlLeft=false;MB.l=false;MB.r=false;};
const lookAt=(x,y,z)=>{const p=V.P,dx=x-p.x,dy=y-(p.y+p.eyeY),dz=z-p.z;p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(dy,Math.hypot(dx,dz));};
const steer=(dx,dz,sprint)=>{const p=V.P,l=Math.hypot(dx,dz);if(l<1e-6)return;p.yaw=Math.atan2(-dx,-dz);K.KeyW=true;K.ControlLeft=!!sprint;};   /* sprint is Ctrl + forward */
function targets(){const p=V.P,out=[];for(const e of V.entities){if(e.dead||!V.MOBT[e.mt]||!V.MOBT[e.mt].mg)continue;
    if(e.mt==='mgpart'&&e.hw>0)out.push({e,w:0});else if(e.mt==='demon'&&e.mgBoss&&e.hw>0)out.push({e,w:1});}
  return out.sort((a,b)=>a.w-b.w||Math.hypot(a.e.x-p.x,a.e.z-p.z)-Math.hypot(b.e.x-p.x,b.e.z-p.z));}
function reachPoint(e){const p=V.P,dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz)||1,want=Math.max(0.5,e.hw+1.6);
  return {x:e.x+dx/d*want,z:e.z+dz/d*want,d:Math.max(0,d-e.hw)};}
function swing(e){const p=V.P;lookAt(e.x,Math.min(e.y+Math.max(0.5,e.h*0.5),p.y+p.eyeY+1.2),e.z);if(p.atkT<=0)MB.l=true;}
function danger(react){const p=V.P,now=T().clock;let worst=null;
  for(const t of T().tel){if(t.col==='gold')continue;if(!V.mgTelHit(t,p.x,p.y,p.z))continue;
    if(react&&!(t.locked&&now-t.lockT>=REACT))continue;if(!worst||(t.impactT||1e9)<(worst.impactT||1e9))worst=t;}
  return worst;}
function eatIfSafe(){const p=V.P;if(p.hunger>=14||danger(false))return false;let i=p.inv.findIndex(s=>s&&s.id===IT.STEAK);if(i<0)return false;
  if(i>8){const t=p.inv[8];p.inv[8]=p.inv[i];p.inv[i]=t;i=8;}const s0=p.sel;p.sel=i;V.refreshHand();
  for(let f=0;f<44&&p.hunger<20&&!danger(false);f++){MB.r=true;step(1);}MB.r=false;p.sel=s0;V.refreshHand();step(1);return true;}
function backToFight(){const b=V.mgBonePile();V.respawn();step(2);boot.bite(V,step,{r:21,settle:10});}   /* the walk back is not the fight */
/* one pilot run: returns {won, deaths, t, roundsCleared, mech, why} */
function fly(mode,o){o=o||{};const start=T().clock;let deaths=0,lastRound=M().round,cleared=0,frames=0;const maxF=Math.round((o.max||900)/0.04);
  const counted=()=>M().deaths.reduce((a,b)=>a+b,0);
  while(frames++<maxF){keysUp();const p=V.P;
    if(V.getDEMON().dead){step(60);return {won:true,deaths,t:T().clock-start,cleared:3,why:'dead'};}
    if(M().round>lastRound){cleared+=M().round-lastRound;lastRound=M().round;}
    if(p.dead){deaths++;if(o.maxDeaths!=null&&deaths>o.maxDeaths)return {won:false,deaths,t:T().clock-start,cleared,why:'deaths'};backToFight();continue;}
    if(V.getCUT().on){step(1);continue;}                                                      /* scenes: Dan is invulnerable */
    if(!info().live){const s=info();if(s.met&&!V.mgArena(p.x,p.y,p.z))boot.bite(V,step,{r:21,settle:2});else if(!s.live)V.mgSkipTo(M().round);step(2);continue;}
    if(mode==='naive'){const tg=targets()[0];if(tg){const rp=reachPoint(tg.e);if(rp.d>2.2)steer(rp.x-p.x,rp.z-p.z,false);swing(tg.e);}step(1);continue;}
    /* skilled */
    const h=T().hint||{};
    const dz=danger(true);
    if(dz){const esc=V.mgTelEscape(dz,p.x,p.z);steer(esc[0],esc[1],true);if(dz.front)K.Space=true;step(1);continue;}
    if(h.sneak)K.ShiftLeft=true;
    if(h.stand){const d=Math.hypot(h.stand.x-p.x,h.stand.z-p.z);if(d>(h.stand.r||1)){steer(h.stand.x-p.x,h.stand.z-p.z,d>4);step(1);continue;}}
    if(eatIfSafe())continue;
    const tg=targets()[0];
    if(tg){const rp=reachPoint(tg.e);if(rp.d>2.2&&!danger(false))steer(rp.x-p.x,rp.z-p.z,rp.d>6);swing(tg.e);}
    step(1);}
  return {won:false,deaths,t:T().clock-start,cleared,why:'time'};}

boot.run(async()=>{
  const F=V.mgF(),stub2=boot.mgStubbed('2');
  const mechList=FA().mechList||{},bound=FA().timeBound||{1:300,2:300,3:300};

  /* ===== (a) + (c): the skilled pilot, kit A ===== */
  boot.world(V,'mgh_a','1337',step);boot.kit(V,'A');boot.bite(V,step);V.mgSkipTo(1);step(5);
  const A=fly('skilled',{max:900,maxDeaths:6});
  const tb=(bound[1]||300)+(bound[2]||300)+(bound[3]||300);
  console.log('  skilled (kit A): '+(A.won?'won':'lost: '+A.why)+' in '+A.t.toFixed(1)+' game-s, '+A.deaths+' death(s), mechanics '+JSON.stringify(T().mech)+(stub2?' [M2 placeholder]':''));
  ok('(a) the skilled pilot (kit A, reacts '+REACT+' s after each lock) kills him: '+(A.won?'won':'lost ('+A.why+')')+' in '+A.t.toFixed(1)+' game-s with '+A.deaths+' death(s)'+(stub2?' [placeholder M2]':''),A.won);
  ok('(a) ...within the sum of M2\'s round bounds ('+tb+' s) and 15 game-minutes, with at most 2 deaths',A.won&&A.t<=Math.min(tb,900)&&A.deaths<=2);
  const mech=T().mech||{},missing=[];for(const r of [1,2,3])for(const n of (mechList[r]||[]))if(!(mech[r]&&mech[r][n]))missing.push('R'+r+':'+n);
  ok('(c) every mechanic M2 lists fired at least once in its round ('+[1,2,3].map(r=>'R'+r+' '+(mechList[r]||[]).length).join(', ')+')'+(missing.length?' (missing '+missing.slice(0,6).join(' ')+')':''),
    Object.keys(mechList).length===3&&missing.length===0);
  ok('(a) the kill paid out once: DEMON.dead, one kill, the Jaw in the inventory',V.getDEMON().dead===true&&M().kills===1&&V.P.inv.some(s=>s&&s.id===365));

  /* ===== (b): the naive pilot, kit D (dragon armour), stands and swings ===== */
  boot.world(V,'mgh_b','1337',step);boot.kit(V,'D');boot.bite(V,step,{r:6});V.mgSkipTo(1);step(5);
  const N=fly('naive',{max:150,maxDeaths:0});
  console.log('  naive (kit D): '+(N.won?'WON':'lost: '+N.why)+' after '+N.t.toFixed(1)+' game-s, rounds cleared '+N.cleared);
  /* v6.3 (MZ): (b) is about the shipped fight's difficulty, on the shipped Bite. It runs on the M0 scaffold (M1 and M2 both placeholders:
     the placeholder must still kill the naive pilot) and on the real pair. A MIXED pair is a bisecting-only build that proves nothing about
     difficulty either way: the M2 placeholder's single slap on the real layout (an open Throat, no pluck: it survived 150 s), or the real
     fight on the M1 placeholder plate (no Throat, no spires, no scars: the masher cleared R1 and died at 87 s). Skipped there only. */
  if(boot.mgStubbed('1')!==boot.mgStubbed('2'))skip('(b) the naive pilot dies','a mixed M1/M2 bisecting build, M'+(boot.mgStubbed('1')?'1':'2')+' on its stub ('+(N.won?'WON':N.why)+' after '+N.t.toFixed(1)+' s, rounds cleared '+N.cleared+')');
  else ok('(b) the naive pilot (kit D, never dodges) dies before clearing a round: '+(N.won?'WON':N.why)+' after '+N.t.toFixed(1)+' s, rounds cleared '+N.cleared,!N.won&&N.cleared===0&&N.why==='deaths');

  /* ===== (d) no cheese ===== */
  boot.world(V,'mgh_d','1337',step);boot.kit(V,'A');boot.bite(V,step);V.mgSkipTo(1);step(60);V.GR.god=true;
  {const p=V.P,x=Math.floor(p.x),z=Math.floor(p.z),y0=Math.floor(p.y);for(let i=0;i<4;i++)V.setBlock(x,y0+i,z,B.COBBLE);p.y=y0+4;p.vy=0;step(1);
   let up=0;for(let f=0;f<150;f++){step(1);if(V.P.y>=y0+3.5)up++;}
   ok('(d) a 4-block pillar on the plate is eaten (or swatted) from under Dan within 6 s',V.P.y<y0+3.5&&V.getBlock(x,y0+3,z)===B.AIR);}
  {const e=boot.boss(V);if(!e){ok('(d) a boss to bleed',false);}else{const h0=e.hp;
     for(let i=0;i<6;i++){const t=boot.targets?null:null;V.mgHitAs(e,13,'Dan','melee');step(8);}
     const bled=h0-e.hp;boot.lip(V,step);step(250);const back=e.hp;boot.bite(V,step,{r:21});
     ok('(d) leave to heal: after '+bled.toFixed(1)+' damage, 10 s out on the stair head gives his bar back ('+back.toFixed(1)+' >= '+h0+')',back>=h0-0.01||bled<=0);}}
  {V.setBrainMock&&V.setBrainMock(null);if(V.BRAIN)Object.assign(V.BRAIN,{mock:null,ok:false,off:true});
   if(!V.AGENTS.length||!V.AGENTS[0].e)V.agJoinAll(false);step(10);const bots=V.AGENTS.filter(a=>a.e&&!a.dead);
   if(!bots.length)skip('(d) bots','no agents joined');
   else{const e=boot.boss(V);boot.lip(V,step);const r0=M().round;
     bots.forEach((a,i)=>{a.e.x=1000.5-8-i;a.e.z=1000.5+i;a.e.y=F;a.x=a.e.x;a.z=a.e.z;a.y=F;});step(5);
     let minHp=1e9;for(let k=0;k<160;k++){for(const a of bots){const b=boot.boss(V);if(b){V.mgHitAs(b,99,a.name,'melee');}}step(4);const b=boot.boss(V);if(b)minHp=Math.min(minHp,b.hp);}
     ok('(d) three bots spamming him for 25 s (Dan outside) never end the round and never take him below 30 (lowest '+(minHp===1e9?'-':minHp.toFixed(1))+')',M().round===r0&&minHp>=30);}}
  V.GR.god=false;
});
