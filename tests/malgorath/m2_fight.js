/* m2_fight.js (M2, gate x1): the per-attack proofs of bible 16.3 on the real fight (plan 9.3), next to the lead's m_harness.js.
   Deterministic (boot seed 20261008), headless, real inputs (KEY/MB/yaw through updatePlayer). Sections:
     1 the instrumented skilled run (kit A, the harness pilot: reacts 0.2 s after a lock): every drawing's lock-to-impact (slaps >= 0.95 s,
       RED >= 1.0 s, other positional >= 0.85 s, all >= 0.6 s) and its honesty (nothing lands before its drawn impact), every window
       closes at its cap and never takes more, every round's winning attempt inside 2.5x the bible's perfect estimate
     2 the scripted dodger: from the worst legal spot (the drawing's centre at the lock), moving 0.2 s after the lock through the real
       controller, in a forward-sprint and a pure-strafe variant, clears every zone (slap, double slap, scoop, crumbs, lunge, squat; the R3
       slap); the jumper (0.2 s after the front reaches his feet) clears the stomp ring, the tail and the drag
     3 the cheese rows: hide melee <= 15 a round, laser/arrows/bots 0 on the hide, a hide hit at 1 HP ends nothing, the squat under the
       pelvis, the third tongue scoop has no tongue, a hover at 3.9 m swatted within 1.6 s, a spire-top perch swatted, a Super Jump never
       swatted, the inhale's pull at 30 and 60 fps within 2%, a sneaker at the inner edge pulled off, a still player takes exactly one
       chomp per inhale, every scripted throw within 10% of its table distance, the rubber band ignores a death inside 15 s, a
       creative kill is a preview
   Rows that belong to other packages (M1: dormancy blocks, bot blocks; the Big Dingle and the rim bite, cut) are listed as skips. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const V=boot({seed:20261008});boot.detClock(V);   /* v6.3 (MZ): load-independent chunk meshing (identical result: skilled 374.8 s, 1 death) */
const step=boot.stepper(1500000);
const B=V.B,IT=V.IT,K=V.KEY,MB=V.MB;
const M=()=>V.getMALG(),G=()=>V.getMG2(),info=()=>V.mgInfo(),T=()=>V.mgTel(),FA=()=>V.MGREG.fight||{},F=()=>V.mgF(),MGF=()=>V.getMGF();
const REACT=0.20,DT=0.04,RF=Math.round(REACT/DT);
const keysUp=()=>{K.KeyW=K.KeyA=K.KeyS=K.KeyD=false;K.Space=false;K.ShiftLeft=false;K.ControlLeft=false;MB.l=false;MB.r=false;};
const lookAt=(x,y,z)=>{const p=V.P,dx=x-p.x,dy=y-(p.y+p.eyeY),dz=z-p.z;p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(dy,Math.hypot(dx,dz));};
const steer=(dx,dz,sprint)=>{const p=V.P,l=Math.hypot(dx,dz);if(l<1e-6)return;p.yaw=Math.atan2(-dx,-dz);K.KeyW=true;K.ControlLeft=!!sprint;};
const until=(f,max)=>{for(let i=0;i<(max||600);i++){if(f())return true;step(1);}return !!f();};
const lastHow=()=>{const L=V.mgCore().LASTDMG();return L&&L.how||'';};
const ADD_HOWS=/husk|morsel|bloat|arrow|add|bite|swing|melee/;
/* ---------- the harness pilot (m_harness.js) with a watcher ---------- */
function targets(){const p=V.P,out=[];for(const e of V.entities){if(e.dead||!V.MOBT[e.mt]||!V.MOBT[e.mt].mg)continue;
    if(e.mt==='mgpart'&&e.hw>0)out.push({e,w:0});else if(e.mt==='demon'&&e.mgBoss&&e.hw>0)out.push({e,w:1});}
  return out.sort((a,b)=>a.w-b.w||Math.hypot(a.e.x-p.x,a.e.z-p.z)-Math.hypot(b.e.x-p.x,b.e.z-p.z));}
function reachPoint(e){const p=V.P,dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz)||1,want=Math.max(0.5,e.hw+1.6);return {x:e.x+dx/d*want,z:e.z+dz/d*want,d:Math.max(0,d-e.hw)};}
function swing(e){const p=V.P;lookAt(e.x,Math.min(e.y+Math.max(0.5,e.h*0.5),p.y+p.eyeY+1.2),e.z);if(p.atkT<=0)MB.l=true;}
function danger(react){const p=V.P,now=T().clock;let worst=null;
  for(const t of T().tel){if(t.col==='gold')continue;if(!V.mgTelHit(t,p.x,p.y,p.z))continue;
    if(react&&!(t.locked&&now-t.lockT>=REACT))continue;if(!worst||(t.impactT||1e9)<(worst.impactT||1e9))worst=t;}
  return worst;}
function eatIfSafe(S){const p=V.P;if(p.hunger>=14||danger(false))return false;let i=p.inv.findIndex(s=>s&&s.id===IT.STEAK);if(i<0)return false;
  if(i>8){const t=p.inv[8];p.inv[8]=p.inv[i];p.inv[i]=t;i=8;}const s0=p.sel;p.sel=i;V.refreshHand();
  for(let f=0;f<44&&p.hunger<20&&!danger(false);f++){MB.r=true;S(1);}MB.r=false;p.sel=s0;V.refreshHand();S(1);return true;}
function backToFight(S){V.respawn();S(2);boot.bite(V,S,{r:21,settle:10});}
/* the watcher: every drawing (lock, drawn impact, the frame it is freed and whether an impact landed on that frame), every window */
const W={d:new Map(),imp:0,win:null,wins:[],winBad:[],rs:{},re:{},att:{},swept:0};
function watch(){const tel=T().tel,now=T().clock,imp=T().impact,cur=new Set();
  for(const t of tel){cur.add(t.id);let d=W.d.get(t.id);
    if(!d){d={id:t.id,kind:t.kind,col:t.col,front:!!t.front,lockT:0,imp0:0,impactT:t.impactT,atk:T().atk,round:MGF().round,freed:0,fImp:0};W.d.set(t.id,d);}
    if(t.locked&&!d.lockT){d.lockT=t.lockT;d.imp0=t.impactT;}d.impactT=t.impactT;}
  const newImp=imp!==W.imp;W.imp=imp;
  const fr=[];for(const d of W.d.values())if(!d.freed&&!cur.has(d.id)){d.freed=now;d.fImp=newImp?imp:0;fr.push(d);}
  /* one impact, one owner (v6.8): a death clears every drawing on the frame of the killing blow; when a drawing freed on that
     frame owns the impact on time, the others freed with it were swept by the reset and landed nothing */
  if(newImp&&V.P.dead&&fr.some(d=>Math.abs(d.impactT-imp)<=0.06))for(const d of fr)if(Math.abs(d.impactT-imp)>0.06){d.fImp=0;W.swept++;}
  const w=T().win;
  if(w.open&&w.kind){if(!W.win||W.win.kind!==w.kind||W.win.open!==w.open)W.win={kind:w.kind,open:w.open,cap:w.cap,dmg:0,atCap:0};W.win.dmg=w.dmg;W.win.capped=w.capped;
    if(w.dmg>w.cap+0.01)W.winBad.push(w.kind+' took '+w.dmg.toFixed(1)+' > cap '+w.cap);
    if(w.dmg>=w.cap-0.01){W.win.atCap++;if(W.win.atCap>2)W.winBad.push(w.kind+' stayed open at its cap');}}
  else if(W.win){W.wins.push(W.win);W.win=null;}}
function fly(o){o=o||{};const start=T().clock;let deaths=0,frames=0,lastR=M().round;const maxF=Math.round((o.max||900)/DT);
  const S=n=>{for(let i=0;i<(n||1);i++){step(1);watch();}};
  W.rs[lastR]=T().clock;
  while(frames++<maxF){keysUp();const p=V.P;
    if(V.getDEMON().dead){W.re[3]=W.re[3]||T().clock;S(60);return {won:true,deaths,t:T().clock-start};}
    if(M().round>lastR){W.re[lastR]=T().clock;lastR=M().round;W.rs[lastR]=null;}
    if(p.dead){const da=G().deathAt||{};console.log('    death '+(deaths+1)+': R'+lastR+' '+(da.how||lastHow())+(da.chompHow?' ('+da.chompHow+')':'')+' at r '+(da.x!=null?Math.hypot(da.x-1000.5,da.z-1000.5).toFixed(1):'?')+', t '+(T().clock-start).toFixed(0)+' s');deaths++;W.att[lastR]=(W.att[lastR]||1)+1;W.rs[lastR]=null;if(deaths>(o.maxDeaths||6))return {won:false,deaths,t:T().clock-start};backToFight(S);continue;}
    if(V.getCUT().on){S(1);continue;}
    if(!info().live){const s=info();if(s.met&&!V.mgArena(p.x,p.y,p.z))boot.bite(V,step,{r:21,settle:2});else if(!s.live)V.mgSkipTo(M().round);S(2);continue;}
    if(W.rs[lastR]==null)W.rs[lastR]=T().clock;                                                /* this attempt's live start */
    const h=T().hint||{},dz=danger(true);
    if(dz){const esc=V.mgTelEscape(dz,p.x,p.z);steer(esc[0],esc[1],true);if(dz.front)K.Space=true;S(1);continue;}
    if(h.sneak)K.ShiftLeft=true;
    if(h.stand){const d=Math.hypot(h.stand.x-p.x,h.stand.z-p.z);if(d>(h.stand.r||1)){steer(h.stand.x-p.x,h.stand.z-p.z,d>4);S(1);continue;}}
    if(eatIfSafe(S))continue;
    const tg=targets()[0];if(tg){const rp=reachPoint(tg.e);if(rp.d>2.2&&!danger(false))steer(rp.x-p.x,rp.z-p.z,rp.d>6);swing(tg.e);}
    S(1);}
  return {won:false,deaths,t:T().clock-start};}

/* ---------- the scripted dodger ---------- */
let STRAFE=null;   /* which key strafes along +right of the facing, measured once */
function calibrate(){const p=V.P;boot.bite(V,step,{r:15});keysUp();p.yaw=0;const x0=p.x,z0=p.z;for(let i=0;i<8;i++){K.KeyD=true;step(1);}keysUp();step(4);
  const dx=p.x-x0,dz=p.z-z0;STRAFE={key:'KeyD',rx:Math.sign(dx)||1};return Math.hypot(dx,dz)>0.3;}
/* move along (ex,ez): sprint = face it and Ctrl+W; strafe = face across it and hold D (or A), no sprint */
function dodgeKeys(ex,ez,variant){const p=V.P;if(variant==='sprint'){steer(ex,ez,true);return;}
  /* yaw 0 faces -z; D moves along +x * STRAFE.rx at yaw 0, i.e. the facing rotated: right = (cos yaw, -sin yaw) * rx */
  const yaw=Math.atan2(ez,ex)*-1;p.yaw=yaw;const rx=Math.cos(yaw)*STRAFE.rx,rz=-Math.sin(yaw)*STRAFE.rx;if(rx*ex+rz*ez>=0)K.KeyD=true;else K.KeyA=true;}
/* a standing spot on the plate d m from (x,z): solid floor, r 9..21.5 from him, not in a gap */
function openSpot(x,z,d){for(let k=0;k<16;k++){const a=k*Math.PI/8,sx=x+Math.cos(a)*d,sz=z+Math.sin(a)*d,r=Math.hypot(sx-1000.5,sz-1000.5);
    if(r<9||r>21.5)continue;if(V.getBlock(Math.floor(sx),Math.floor(F())-1,Math.floor(sz))===B.AIR)continue;if(V.getBlock(Math.floor(sx),Math.floor(F()),Math.floor(sz))!==B.AIR)continue;return {x:sx,z:sz};}return null;}
/* the R3 drag: wait for a hand's slap to lock, stand 3-4 m inward of it on the drag's path (outside the slap), jump 0.2 s after the
   dust front reaches the feet */
function dragTrial(){const p=V.P;keysUp();V.GR.mobSpawn=false;clearAdds();let H=null;V.GR.god=true;
  for(let i=0;i<2500&&!H;i++){keysUp();const pr=V.mgPol(p.x,p.z);if(!T().tel.some(q=>q.kind==='slap')&&Math.abs(pr.r-19)>0.6&&!G().holdDan&&!G().throws.length)boot.tp(V,1000.5+Math.cos(pr.th)*19,F(),1000.5+Math.sin(pr.th)*19);   /* out on his island, where a drag is long */
    step(1);const t=T().tel.find(q=>q.kind==='slap'&&q.locked);if(t){const pr=V.mgPol(t.x,t.z),len=pr.r-Math.max(12.8,pr.r-6);if(len>=3.4)H={x:t.x,z:t.z,th:pr.th,r:pr.r,len};}}
  if(!H){V.GR.god=false;return {done:false,why:'no slap with a 3.4 m drag'};}
  const al=Math.min(4,H.len-0.4),r=H.r-al;boot.tp(V,1000.5+Math.cos(H.th)*r,F(),1000.5+Math.sin(H.th)*r);step(1);V.GR.god=false;p.hp=20;p.hurtT=0;let hp=p.hp,front=0,d=null,hits=[];
  for(let f=0;f<120;f++){keysUp();if(!d)d=T().tel.find(q=>q.kind==='drag')||null;
    if(d&&!front&&V.mgTelHit(d,p.x,p.y,p.z))front=f;if(front&&f===front+RF&&p.onGround)K.Space=true;
    step(1);if(p.hp<hp&&/^mg:drag$/.test(lastHow()))hits.push('drag '+(hp-p.hp).toFixed(1));hp=p.hp;if(d&&!T().tel.some(q=>q.id===d.id))break;}
  keysUp();return {done:!!front,hit:hits.length>0,how:hits.join(','),why:d?(front?'':'the front never reached him'):'no drag drawn'};}
function clearAdds(){for(const a of G().adds||[]){if(!a.dead){a.x=a.x+400;a.z=a.z+400;a.mgFar=1;}}}
/* one trial: force attack k (or wait for the drawing in R3), put Dan on the worst spot at the lock, react 0.2 s later. o.hows: the damage
   tags that count as this attack landing; o.caught: a hold (the scoop's ride) */
function trial(k,kind,variant,o){o=o||{};const p=V.P;keysUp();V.GR.mobSpawn=false;clearAdds();
  if(!until(()=>!G().atk&&!G().win&&info().live&&!V.getCUT().on&&!G().holdDan&&!G().throws.length,600))return {done:false,why:'busy'};
  p.hp=20;p.hunger=20;p.hurtT=0;if(o.place)o.place();step(3);
  if(k&&!V.mg2Force(k))return {done:false,why:'refused'};
  let d=null,locked=null,lockF=0,hits=[],hp=p.hp,f=0,front=0,w=0;
  if(!k){V.GR.god=true;for(w=0;w<(o.wait||1500)&&!d;w++){keysUp();if(o.hold)o.hold();step(1);d=T().tel.find(t=>t.kind===kind)||null;}V.GR.god=false;if(!d)return {done:false,why:'no '+kind+' in '+(w*DT).toFixed(0)+' s'};
    p.hp=20;p.hurtT=0;hp=p.hp;}
  const land=h=>(o.hows||/.^/).test(h.replace(/^mg:/,''));
  for(f=0;f<400;f++){keysUp();
    if(!d){d=T().tel.find(t=>t.kind===kind&&(o.pick?o.pick(t):true))||null;if(d&&o.onDraw)o.onDraw(d);}
    if(d&&!locked&&d.locked&&!o.jump){locked=d;lockF=f;const s=o.worst?o.worst(d):{x:d.x,z:d.z};boot.tp(V,s.x,F(),s.z);p.hurtT=0;}
    if(o.jump&&d){if(!front&&V.mgTelHit(d,p.x,p.y,p.z))front=f;if(front&&f===front+RF&&p.onGround)K.Space=true;}
    if(locked&&f>=lockF+RF){const now=T().clock,ext=q=>q.shape==='line'?(q.w||1):(q.shape==='band'?q.r-(q.r0||0):(q.r||1));   /* out of every locked drawing he is in, the widest first */
      const ins=T().tel.filter(q=>q.col!=='gold'&&q.locked&&now-q.lockT>=REACT-1e-6&&V.mgTelHit(q,p.x,p.y,p.z)).sort((a,b)=>ext(b)-ext(a));
      if(ins.length){const e=V.mgTelEscape(ins[0],p.x,p.z);dodgeKeys(e[0],e[1],variant);}}
    step(1);
    if(p.hp<hp&&land(lastHow()))hits.push(lastHow()+' '+(hp-p.hp).toFixed(1));hp=p.hp;
    if(o.caught&&o.caught())hits.push('caught');
    if(p.dead||hits.length)break;
    if(d&&!T().tel.some(q=>q.id===d.id)){for(let i=0;i<(o.tail==null?6:o.tail);i++){step(1);if(p.hp<hp&&land(lastHow()))hits.push(lastHow());hp=p.hp;if(o.caught&&o.caught())hits.push('caught');}break;}}
  keysUp();return {done:!!d&&(o.jump?!!front:!!locked),hit:hits.length>0,how:hits.join(','),why:d?(o.jump&&!front?'the front never reached him':''):'no drawing'};}

boot.run(async()=>{
  if(boot.mgStubbed('2')){skip('m2 fight','M2 is on its stub');return;}
  /* v6.3 (MZ): bible 16.3's proofs are about the real fight ON THE REAL BITE (worst legal spots, the L3 islands and edges, the controller on
     the real plate); on the M1 placeholder plate (a DC_MG_STUB=1 bisecting build) four rows measured the placeholder, not the game */
  if(boot.mgStubbed('1')){skip('m2 fight','M1 is on its stub (the proofs need the real Bite; m2_smoke still runs)');return;}
  const S1=n=>{for(let i=0;i<(n||1);i++){step(1);watch();}};

  /* ===== 1. the instrumented skilled run ===== */
  boot.world(V,'mgf_a','1337',step);boot.kit(V,'A');boot.bite(V,step);V.mgSkipTo(1);step(5);
  const A=fly({max:900,maxDeaths:6});
  const all=[...W.d.values()].filter(d=>d.lockT&&!d.front&&d.col!=='gold'&&!/^(edge|supper|swat)$/.test(d.kind));
  const by={};for(const d of all){const L=d.imp0-d.lockT;const k=d.kind+(d.col==='red'?'(RED)':'');if(!by[k]||L<by[k].min)by[k]={min:L,n:(by[k]?by[k].n:0)};by[k].n++;}
  const need=d=>/slap/.test(d.kind)?0.95:(d.col==='red'?1.0:0.85);
  const low=all.filter(d=>d.imp0-d.lockT<need(d)-1e-6);
  console.log('  skilled run: '+(A.won?'won':'lost')+' in '+A.t.toFixed(1)+' s, '+A.deaths+' death(s); lock-to-impact minima '+Object.keys(by).map(k=>k+' '+by[k].min.toFixed(2)+'s x'+by[k].n).join(', '));
  ok('the skilled run (kit A) wins (it is the field the timings are measured on): '+(A.won?'won':'lost')+' in '+A.t.toFixed(1)+' s, '+A.deaths+' deaths',A.won);
  ok('lock-to-impact: slaps >= 0.95 s, RED >= 1.0 s, every other positional attack >= 0.85 s ('+all.length+' locked drawings over '+Object.keys(by).length+' kinds'+(low.length?'; short: '+low.slice(0,5).map(d=>d.kind+' '+(d.imp0-d.lockT).toFixed(2)).join(', '):'')+')',all.length>=20&&low.length===0&&Object.keys(by).length>=6);
  {const dis=[...W.d.values()].filter(d=>d.fImp&&d.lockT&&!d.front&&d.col!=='gold'),early=dis.filter(d=>d.fImp<d.impactT-0.06);
    ok('honest drawings: no attack lands before its drawn impact ('+dis.length+' impacts checked'+(W.swept?', '+W.swept+' swept by a death reset':'')+(early.length?'; early: '+early.slice(0,4).map(d=>d.kind+' '+(d.impactT-d.fImp).toFixed(2)+'s'):'')+')',dis.length>=10&&early.length===0);}
  {const caps=W.wins.filter(w=>w.capped||w.dmg>=w.cap-0.01);
    ok('every window closes at its cap and never takes more ('+W.wins.length+' windows, '+caps.length+' capped'+(W.winBad.length?'; '+W.winBad.slice(0,4).join('; '):'')+')',W.wins.length>=6&&W.winBad.length===0);}
  {const PERF={1:80,2:75,3:75},dur=[1,2,3].map(r=>W.rs[r]!=null&&W.re[r]?W.re[r]-W.rs[r]:-1);
    ok('one honest kill per round inside 2.5x its perfect estimate (R1 '+dur[0].toFixed(0)+'/200 s, R2 '+dur[1].toFixed(0)+'/188 s, R3 '+dur[2].toFixed(0)+'/188 s; attempts '+JSON.stringify(W.att)+')',
      A.won&&dur.every((d,i)=>d>0&&d<=2.5*PERF[i+1]));}

  /* ===== 2. the scripted dodger and the jumper ===== */
  boot.world(V,'mgf_d1','1337',step);boot.kit(V,'A');boot.bite(V,step,{r:15});ok('the strafe keys move Dan sideways (controller calibration)',calibrate());
  const res=[],run=(label,fn)=>{const r=fn();res.push([label,r]);return r;};
  V.mgSkipTo(1);until(()=>!V.getCUT().on&&info().live,600);step(60);
  const spot=(r,th)=>()=>{const t=th==null?Math.PI:th;boot.tp(V,1000.5+Math.cos(t)*r,F(),1000.5+Math.sin(t)*r);};
  for(const v of ['sprint','strafe']){
    run('R1 slap '+v,()=>trial('slap','slap',v,{place:spot(15),hows:/^(slap|grind)$/}));
    run('R1 scoop '+v,()=>trial('scoop','scoop',v,{place:spot(15),hows:/^(chomp|scoop)$/,caught:()=>!!(G().ride&&G().ride.tg===V.P),worst:d=>{const r=(d.r0+d.r)/2;return {x:1000.5+Math.cos(d.th)*r,z:1000.5+Math.sin(d.th)*r};}}));
    run('R1 crumbs '+v,()=>trial('crumbs','crumb',v,{place:spot(18),hows:/^(crumb|debris)$/}));}
  V.mgSkipTo(2);until(()=>!V.getCUT().on&&info().live&&MGF().round===2,900);step(60);
  const lineMid=d=>{const ux=-Math.sin(d.yaw||0),uz=-Math.cos(d.yaw||0),a=Math.min((d.len||0)*0.5,9);return {x:d.x+ux*a,z:d.z+uz*a};};
  const bossBack=(r)=>()=>{const e=boot.boss(V);const b=e.yaw+Math.PI;boot.tp(V,e.x+Math.sin(b)*r,F(),e.z+Math.cos(b)*r);};
  for(const v of ['sprint','strafe']){
    run('R2 lunge '+v,()=>trial('lunge','lunge',v,{place:spot(20,0),worst:lineMid,hows:/^(chomp|side|lunge)$/}));
    run('R2 squat '+v,()=>trial('squat','squat',v,{hows:/^squat$/,place:()=>{const e=boot.boss(V);boot.tp(V,e.x+0.6,F(),e.z+0.6);}}));}
  run('R2 stomp ring (jumper)',()=>trial('stomp','stompRing',null,{jump:true,hows:/^stomp$/,place:bossBack(-9),
    onDraw:d=>{const s=openSpot(d.x,d.z,7);if(s)boot.tp(V,s.x,F(),s.z);}}));
  run('R2 tail (jumper)',()=>trial('tail','tail',null,{jump:true,hows:/^tail$/,place:bossBack(5)}));
  V.mgSkipTo(3);until(()=>!V.getCUT().on&&info().live&&MGF().round===3,900);
  for(const v of ['sprint','strafe'])run('R3 slap '+v,()=>trial(null,'slap',v,{hows:/^slap$/,tail:2}));
  run('R3 drag (jumper)',()=>dragTrial());
  for(const [label,r] of res)ok('dodge: '+label+' -> '+(r.done?(r.hit?'HIT ('+r.how+')':'clear'):'not run ('+r.why+')'),r.done&&!r.hit);

  /* ===== 3. the cheese rows ===== */
  /* R2: the hide */
  boot.world(V,'mgf_c2','1337',step);boot.kit(V,'A');boot.bite(V,step,{r:15});V.mgSkipTo(2);until(()=>!V.getCUT().on&&info().live&&MGF().round===2,900);V.GR.god=true;
  {const e=boot.boss(V),h0=e.hp;for(let i=0;i<120;i++){V.mgHitAs(e,13,'Dan','melee');step(12);if(!info().live)break;}
    ok('hide melee for 60 s deals <= 15 this round ('+(h0-e.hp).toFixed(1)+')',h0-e.hp<=15.01);
    const h1=e.hp;V.mgHitAs(e,13,'Dan','laser');step(8);V.mgHitAs(e,13,'Dan','arrow');step(8);V.mgHitAs(e,99,'BunkerBrad','melee');step(8);
    ok('laser, arrows and bots deal 0 to the hide',e.hp===h1);
    e.hp=1;V.mgHitAs(e,13,'Dan','melee');step(10);ok('a hide hit at 1 HP ends nothing (the end hit is a weak point)',info().live===1&&MGF().round===2&&e.hp>=1&&!e.dead);
    e.hp=200;const sq=(T().mech[2]||{}).squat||0;keysUp();
    let fired=false;for(let i=0;i<300&&!fired;i++){const b=boot.boss(V);if(!G().atk)boot.tp(V,b.x+0.5,F(),b.z+0.5);step(1);fired=((T().mech[2]||{}).squat||0)>sq;}
    ok('the squat fires on a pilot parked under the pelvis (within 12 s)',fired);}
  /* swat rows (R2: spires exist) */
  {const p=V.P;keysUp();step(40);until(()=>!G().atk&&!G().swat&&!(G().swatT>0)&&!G().throws.length&&!G().holdDan&&!G().pluck,300);const tr=[];const s0=(T().mech[2]||{}).swat||0;boot.tp(V,1000.5-15,F()+3.9,1000.5);let tS=-1;
    for(let i=0;i<60;i++){p.y=F()+3.9;p.vy=0;p.onGround=false;p.fallD=0;step(1);if(i%5===4)tr.push((G().air||0).toFixed(2)+(p.onGround?'g':'')+(G().holdDan?'h':'')+(G().pluck?'p':'')+(G().throws.length?'t':'')+(p.mode));if(tS<0&&G().swat)tS=(i+1)*DT;if(tS>=0)break;}
    ok('a hover at 3.9 m over the plate is swatted within 1.6 s ('+(tS<0?'never':tS.toFixed(2)+' s')+(tS>1.6||tS<0?'; air '+tr.join(' '):'')+')',tS>0&&tS<=1.6);until(()=>!G().swat&&!V.getMG2().throws.length,200);step(30);
    const sw1=((T().mech[2]||{}).swat||0);let perch=false;{const x=Math.floor(1000.5+14),z=Math.floor(1000.5);for(let y=0;y<3;y++)V.mgWrite(x,F()+y,z,B.STONE);boot.tp(V,x+0.5,F()+3,z+0.5);
      for(let i=0;i<120&&!perch;i++){step(1);perch=!!G().swat||((T().mech[2]||{}).swat||0)>sw1;}for(let y=0;y<3;y++)V.mgWrite(x,F()+y,z,B.AIR);}
    ok('a perch 3 m above the plate (a spire top) is swatted',perch);until(()=>!G().swat&&!G().throws.length,200);step(40);
    p.pow=p.pow||{};p.pow.u=Object.assign({},p.pow.u||{},{jump:1});p.pow.a=Object.assign({},p.pow.a||{},{jump:1});const sw2=((T().mech[2]||{}).swat||0);
    boot.tp(V,1000.5-16,F(),1000.5);step(5);let maxY=0;for(let j=0;j<5;j++){keysUp();K.Space=true;step(1);K.Space=false;for(let i=0;i<40;i++){step(1);maxY=Math.max(maxY,p.y-F());}}
    ok('a Super Jump on the plate is never swatted (5 jumps, '+maxY.toFixed(1)+' m high)',((T().mech[2]||{}).swat||0)===sw2&&!G().swat&&maxY>2.5);
    p.pow.a.jump=0;}
  /* the scripted throws: every table distance within 10% on an open plate */
  {const p=V.P;V.GR.god=true;const rows=[];for(const d of [1.5,2.5,3,4,6]){boot.tp(V,1000.5-15,F(),1000.5+((d*7)%5)-2);step(25);const x0=p.x,z0=p.z;
      V.mg2Knock(p,p.x+1,p.z,d,{free:1});until(()=>!G().throws.length,100);step(10);rows.push([d,Math.hypot(p.x-x0,p.z-z0)]);}
    ok('every scripted throw lands within 10% of its table distance ('+rows.map(r=>r[0]+'->'+r[1].toFixed(2)).join(', ')+' m)',rows.every(r=>Math.abs(r[1]-r[0])<=0.1*r[0]));}
  V.GR.god=false;

  /* R3: the inhale */
  boot.world(V,'mgf_c3','1337',step);boot.kit(V,'A');boot.bite(V,step,{r:15});V.mgSkipTo(3);until(()=>!V.getCUT().on&&info().live&&MGF().round===3,900);V.GR.god=true;
  {const p=V.P;keysUp();
    /* 30 vs 60 fps: the same pull for 6 s from r 20 on a flat line, the player held still */
    const pull=ms=>{until(()=>FA().inhaling(),900);const st=V.mgPol(p.x,p.z);const th=Math.PI*0.5;boot.tp(V,1000.5+Math.cos(th)*21,F(),1000.5+Math.sin(th)*21);
      const r0=V.mgPol(p.x,p.z).r;let t=0;const n=Math.round(1.0/(ms/1000));for(let i=0;i<n&&FA().inhaling();i++){step(1,ms);t+=ms/1000;}return {d:r0-V.mgPol(p.x,p.z).r,t};};
    const a=pull(1000/30);until(()=>!FA().inhaling(),900);const b=pull(1000/60);
    const ra=a.d/a.t,rb=b.d/b.t;
    ok('the inhale pull rate is frame-rate independent: 30 fps '+ra.toFixed(3)+' m/s vs 60 fps '+rb.toFixed(3)+' m/s (within 2%)',a.t>0.9&&b.t>0.9&&ra>0.5&&Math.abs(ra-rb)/Math.max(ra,rb)<=0.02);
    ok('a blink during the inhale fails (Dan does not move) and a grapple is cut',FA().blinkFail()===true&&FA().grapCut()===true);
    until(()=>!FA().inhaling(),900);
    /* the sneaker at the inner edge (r 13.2, the island's mouth side) */
    until(()=>FA().inhaling(),900);{const th=Math.PI*0.5;boot.tp(V,1000.5+Math.cos(th)*13.4,F(),1000.5+Math.sin(th)*13.4);let off=false;
      for(let i=0;i<150&&FA().inhaling()&&!off;i++){keysUp();K.ShiftLeft=true;step(1);off=V.mgPol(p.x,p.z).r<12.6||p.y<F()-0.5||T().chomps>0&&G().holdDan!=null;}keysUp();
      ok('a sneaking player at the inner edge is pulled off it',off);}
    until(()=>!FA().inhaling()&&!G().holdDan,1500);V.GR.god=false;p.hp=20;
    /* the still player: exactly one chomp per inhale */
    until(()=>FA().inhaling(),900);{const c0=T().chomps;const th=Math.PI*0.5;boot.tp(V,1000.5+Math.cos(th)*16,F(),1000.5+Math.sin(th)*16);p.hp=20;
      let n=0;while(FA().inhaling()&&n<400){keysUp();step(1);n++;if(p.dead)break;}step(40);
      ok('a player who stands still through an inhale takes exactly one chomp ('+(T().chomps-c0)+')',T().chomps-c0===1);}
    if(V.P.dead){V.respawn();step(5);}}
  /* the rubber band: a death within 15 s of the round start is not counted */
  {boot.world(V,'mgf_rb','1337',step);boot.kit(V,'A');boot.bite(V,step,{r:15});V.mgSkipTo(1);until(()=>!V.getCUT().on&&info().live,600);step(25);
    const d0=M().deaths[0];V.P.hp=0.5;V.P.hurtT=0;V.MGREG.fight.chomp(V.P);step(30);const early=M().deaths[0]-d0;if(V.P.dead){V.respawn();step(5);}
    boot.bite(V,step,{r:15});until(()=>info().live,600);V.GR.god=true;step(Math.round(46/DT));V.GR.god=false;const d1=M().deaths[0];V.P.hp=0.5;V.P.hurtT=0;V.MGREG.fight.chomp(V.P);step(30);const late=M().deaths[0]-d1;if(V.P.dead){V.respawn();step(5);}
    ok('the rubber band ignores a death within 15 s of the round start ('+early+') and counts one 46 s into an attempt ('+late+')',early===0&&late===1);}
  /* creative = preview */
  {boot.world(V,'mgf_cr','1337',step);boot.kit(V,'A');boot.bite(V,step,{r:15});V.mgSkipTo(3);until(()=>!V.getCUT().on&&info().live,900);V.P.mode='c';
    until(()=>!!(G().win&&G().win.kind==='sun'),4000);const w=G().win;
    if(w&&w.kind==='sun'){boot.boss(V).hp=1;V.mgHitAs(w.part,13,'Dan','melee');step(2);until(()=>!V.getCUT().on,600);step(20);}
    ok('a creative kill is a preview: DEMON.dead stays false and no kill is counted',!!w&&V.getDEMON().dead===false&&M().kills===0);V.P.mode='s';}
  skip('20 blocks placed in dormancy gone 1 s after the round start; a bot-placed block eaten after 3 s','M1 (world.clearTable, the eating queue): m1_smoke');
  skip('the Big Dingle KO / gag; the rim bite','cut-lines (not built in 6.3)');
});
