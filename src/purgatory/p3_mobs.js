/* ---- PART 55: p3_mobs.js ---- */
/* ===================================================================== */
/* PART 55 p3_mobs.js (P3, puppets): the 16 regular purgatory mobs (bible 9.2, 15.4; plan 5.3)                               */
/* ===================================================================== */
/* Rules: every mob spawns through spawnMob, targets through purgFoe (pmFoe adds the BLACKOUT followspot rule), hits through
   purgHit with its display name, and telegraphs every attack (pmTele: the pupils lock first; e.plock counts down, the hit
   only lands when it reaches 0). Top level: MOBT rows, tables and registrations only (no THREE, no random, no clock). */
Object.assign(MOBT,{
  pgwhat:   {hp:12,hw:0.34,h:1.05,spd:1.3,dmg:2,xp:3,hostile:true,pmob:1,pnc:1,struct:1,body:'#4ca82b',legc:'#e8b9a0',drop:{id:IT.PG_FLEECE,min:1,max:2}},
  pghollow: {hp:6, hw:0.45,h:0.5, spd:0,  dmg:0,xp:1,pmob:1,pnc:1,struct:1,body:'#d9822b',legc:'#d9822b',drop:{id:IT.PG_FLEECE,min:2,max:2}},
  pghand:   {hp:10,hw:0.3, h:0.62,spd:2.2,dmg:2,xp:3,hostile:true,pmob:1,body:'#e8b9a0',legc:'#e8b9a0',drop:{id:IT.PG_GREASE,min:1,max:1}},
  pgposs:   {hp:16,hw:0.34,h:1.45,spd:1.6,dmg:3,xp:4,hostile:true,pmob:1,body:'#7a4fa0',legc:'#e8b9a0',drop:{id:IT.PG_FLEECE,min:2,max:2}},
  pgfeltdan:{hp:30,hw:0.3, h:1.85,spd:1.4,dmg:4,xp:10,hostile:true,pmob:1,body:'#a87e52',legc:'#7a5a36'},
  pgcomic: {hp:16,hw:0.34,h:1.1, spd:1.0,dmg:0,xp:3,pmob:1,pnc:1,struct:1,body:'#c8843c',legc:'#e8b9a0',drop:{id:IT.PG_FLEECE,min:2,max:2}},
  pghen:    {hp:4, hw:0.25,h:0.9, spd:1.1,dmg:0,xp:1,pmob:1,body:'#f2d23c',legc:'#e0901e',drop:{id:IT.PG_RCHICK,min:1,max:1}},
  pgpelican:    {hp:20,hw:0.3, h:1.9, spd:1.0,dmg:3,xp:5,hostile:true,pmob:1,body:'#f0f0ea',legc:'#2a2a38',drop:{id:IT.PG_FISH,min:1,max:2}},
  pgdrummer: {hp:60,hw:0.4, h:1.9, spd:2.2,dmg:6,xp:12,hostile:true,pmob:1,pnc:1,struct:1,kbRes:0.5,body:'#c8401e',legc:'#c8401e',drop:{id:IT.PG_DRUMSTICK,min:2,max:2}},
  pgrat: {hp:18,hw:0.26,h:1.75,spd:1.4,dmg:2,xp:3,hostile:true,pmob:1,body:'#f4f4f0',legc:'#d8d0c0',drop:{id:IT.PG_COPPER,min:0,max:1}},
  pgrat2:{hp:9, hw:0.14,h:0.88,spd:1.6,dmg:2,xp:2,hostile:true,pmob:1,body:'#f4f4f0',legc:'#d8d0c0',drop:{id:IT.PG_COPPER,min:0,max:1}},
  pgrat4:{hp:4.5,hw:0.08,h:0.44,spd:1.6,dmg:2,xp:1,hostile:true,pmob:1,body:'#f4f4f0',legc:'#d8d0c0'},
  pgyeti:  {hp:60,hw:0.6, h:2.6, spd:0.9,dmg:6,xp:15,hostile:true,pmob:1,kbRes:0.7,body:'#6b4a2b',legc:'#6b4a2b',drop:{id:IT.PG_SHAGFUR,min:3,max:3}},
  pgdare:  {hp:30,hw:0.3, h:1.75,spd:1.2,dmg:7,xp:8,hostile:true,pmob:1,body:'#3f6fb5',legc:'#3f6fb5',drop:{id:IT.PG_RCHICK,min:3,max:3}},
  pgfrog:   {hp:4, hw:0.22,h:0.38,spd:2.0,dmg:0,xp:1,hostile:true,pmob:1,body:'#3f9a3a',legc:'#3f9a3a',drop:{id:IT.PG_FELT,min:1,max:1}},
  pgpig:    {hp:6, hw:0.38,h:0.85,spd:1.0,dmg:0,xp:1,pmob:1,body:'#f2a6c1',legc:'#e893b0',drop:{id:IT.PG_HAM,min:1,max:1}}});
var PM_NAMES={pgwhat:'Blank',pghollow:'Hollow',pghand:'The Hands',pgposs:'Possessed Hollow',pgfeltdan:'Felt Dan',pgcomic:'the Comic',
  pghen:'Rubber Hen',pgpelican:'the Pelican',pgdrummer:'the Drummer',pgrat:'Lab Rat Clone',pgrat2:'Lab Rat Clone',pgrat4:'Lab Rat Clone',
  pgyeti:'the Yeti',pgdare:'the Daredevil',pgfrog:'Thieving Frog',pgpig:'Chorus Pig',
  pgcook:'the Cook',pgprof:'the Professor',pgratb:'the Lab Rat',pgoldgoat:'Old Goat',pgoldergoat:'Older Goat',pgweather:'the Weatherman'};
/* extra loot beyond MOBT.drop: [id, min, max, chance] (killMob drops MOBT.drop; PREG.onKill drops these, owned by the killer) */
var PM_LOOT={pgwhat:[[IT.PG_ROD,1,1,1],[IT.PG_STUFF,0,1,1]],pghollow:[[IT.PG_STUFF,1,1,1],[IT.PG_PLASTICEYE,1,1,0.3]],
  pgposs:[[IT.PG_STUFF,1,1,1],[IT.PG_GREASE,1,1,1]],pgdrummer:[[IT.PG_SHAGFUR,1,1,1]],pgyeti:[[IT.PG_SNEAKERS,1,1,0.25]]};
/* transient P3 state (never saved; reset on world reset, entry and load) */
var PMS={seq:0,log:[],logOn:false,flight:null,flF:-1,wrap:null,prints:[],printT:0,band:[{},{},{}],henKills:{},
  st:new Map(),fish:[],splats:[],boo:null,hq:[],lastLD:null,lastHp:20,mbl:false,sayQ:[],sayT:0,newsT:0,spawnT:0,structT:0,
  dareT:0,tomBuf:[]};

/* ---- shared brain helpers ---- */
function pmDocile(){return !!(CUT.on&&CUT.script);}
/* test seams (never set by the game): PMS.cueO (cue phase), PMS.hnO (hnState), PMS.spotO (mwSpots kinds), PMS.holesO (Arm Holes), PMS.biomeO */
function pmCue(){if(PMS.cueO)return PMS.cueO;try{const c=mwCue();return (c&&c.ph)||'show';}catch(err){return 'show';}}
function pmBlackout(){return pmCue()==='blackout';}
function pmNm(e){return PM_NAMES[e.mt]||mobNameOf(e.mt);}
function pmLog(e,k){if(!PMS.logOn)return;PMS.log.push({id:e.pid,mt:e.mt,k,t:+MP.clock.toFixed(3),f:frameCount});if(PMS.log.length>600)PMS.log.splice(0,200);}
function pmInit(e){e.pi=1;const ud=(e.mesh&&e.mesh.userData)||{};e.pr=ud.pr||null;
  if(ud.pmats&&ud.pmats.length&&!e.hrM){e.pmats=ud.pmats;e.pdisp=1;}
  e.pid=++PMS.seq;e.seed=(e.pid*2.399)%6.283;e.hrS=e.hrS||{};e.pt0=MP.clock;if(e.pr&&e.pr.googly)e.googly=1;e.plock=e.plock||0;}
/* every P3 brain starts here: init, the shared flight step, pins, poses */
function pmPre(e,dt){if(!e.pi)pmInit(e);if(PMS.flF!==frameCount)pmFlightStep(dt);e.hrS.fired=false;
  if(e.ppin>0)e.ppin-=dt;
  /* P2's Pig Mitt: a caught hen or pig hangs in Dan's mitt (P2 moves it), a thrown one flies ballistic until it lands */
  if(e.pheld){e.vx=e.vy=e.vz=0;if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);if(e.pr)pmJaw(e.pr,0.5+0.5*Math.abs(Math.sin(MP.clock*20)),dt);e.hrS.held=1;return true;}
  e.hrS.held=0;
  if(e.pthrown){e.pthrT=(e.pthrT||0)+dt;e.vy-=GRAV*dt;if(e.vy<-40)e.vy=-40;const w=moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);
    if(!((e.onGround||w)&&e.pthrT>0.15))return true;e.pthrown=null;e.pthrT=0;e.vx*=0.2;e.vz*=0.2;}
  return e.pose?pmPoseTick(e,dt):false;}
/* nearest target: Dan or a bot body (purgFoe); in BLACKOUT hostiles go for the followspot's player within 48 m, else 8 m */
function pmFoe(e,range,opt){opt=opt||{};if(e.pblind>MP.clock)return null;     /* a Custard Pie in the face: it wanders 4 s */
  if(pmBlackout()&&!opt.noSpot){let f=null;try{f=mwFollowTarget();}catch(err){}
    if(f){const a=f.who==='Dan'?null:agByName(f.who),t=f.who==='Dan'?((P&&!P.dead&&P.mode!=='c')?P:null):(a&&a.online&&!a.dead&&a.dim===DIM?a.e:null);
      if(t&&!t.dead&&Math.hypot(t.x-e.x,t.z-e.z)<=48&&(!opt.danOnly||t===P)&&t!==opt.skip)return t;}
    range=Math.min(range,8);}
  return purgFoe(e,range,opt);}
function pmTele(e,dur,tgt){e.plock=dur;e.ptgt=tgt||null;e.ptel=MP.clock;pmLog(e,'lock');}
function pmStrike(e,t,dmg,how,opt){if(!t)return false;opt=opt||{};e.phit=MP.clock;pmLog(e,'hit');e.hrS.fired=true;
  return purgHit(t,dmg,opt.who||pmNm(e),how,Object.assign({src:{x:e.x,z:e.z}},opt));}
function pmTurn(e,dx,dz,dt,rate){if(Math.abs(dx)+Math.abs(dz)<1e-6)return;const w=Math.atan2(dx,dz);e.yaw+=(((w-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI)*Math.min(1,dt*(rate||8));}
/* ground movement: the generic brain's lerp, gravity and 1-block hop */
function pmWalk(e,dt,mx,mz,spd,o){o=o||{};if(e.ppin>0){mx=mz=0;}
  const k=1-Math.exp(-dt*(e.onGround?12:3));e.vx=lerp(e.vx,mx*spd,k);e.vz=lerp(e.vz,mz*spd,k);
  e.vy-=GRAV*dt;if(e.vy<-45)e.vy=-45;
  const wall=moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(wall&&e.onGround&&o.hop!==false)e.vy=o.hopV||7.6;
  if(e.y<-20){removeEnt(e);}return wall;}
/* kinematic steer (puppets on arms, flights): straight at (tx,ty,tz) at most spd m/s, collisions kept */
function pmSteer(e,dt,tx,ty,tz,spd){const dx=tx-e.x,dy=ty-e.y,dz=tz-e.z,d=Math.hypot(dx,dy,dz);if(d<1e-3){e.vx=e.vy=e.vz=0;return;}
  const s=Math.min(spd,d/Math.max(dt,1e-3));e.vx=dx/d*s;e.vy=dy/d*s;e.vz=dz/d*s;moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);}
/* visuals + the Hyperreal s-fields (hrPgTick copies e.hrS into the model each frame) */
function pmPost(e,dt,o){o=o||{};if(e.dead)return;e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;
  const pr=e.pr,sp=Math.hypot(e.vx,e.vz);
  if(pr){const L=o.look;pmEyes(e,pr,L?L[0]:null,L?L[1]:null,L?L[2]:null,!!o.lock,dt);pmJaw(pr,o.jaw!=null?o.jaw:0.08,dt);
    if(o.legs!==false)pmAnimLegs(e,dt,o.legSp!=null?o.legSp:Math.min(1.4,sp/Math.max(0.5,(MOBT[e.mt].spd||1)*2.2)));
    if(pr.bob&&pr.root&&!o.noBob)pr.root.position.y=Math.sin((MP.clock+e.seed)*3.1)*0.05+(o.bobY||0);}
  const s=e.hrS;s.speed=Math.min(1.3,sp/Math.max(0.5,(MOBT[e.mt].spd||1)*2.2));s.hurt=e.hurtT/0.5;s.attack=e.plock>0?1-e.plock/Math.max(0.3,e.plockD||0.6):(s.attack||0)*0.85;
  if(o.look){const dx=o.look[0]-e.x,dz=o.look[2]-e.z;s.near=Math.hypot(dx,dz);s.yaw=clamp(((Math.atan2(dx,dz)-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI,-1.1,1.1);}
  else{s.yaw=(s.yaw||0)*0.9;}
  if(o.hr)Object.assign(s,o.hr);}
/* hurt flash for custom brains (updateMob clears it at hurtT<0.2; nothing else to do) */

/* a wandering passive (hen, Chorus Pig, a calm Lab Rat) never strolls into a headliner's arena */
function pmArenaAhead(e,mx,mz){const x=e.x+mx*1.5,z=e.z+mz*1.5;return mpInArena(null,Math.floor(x),Math.floor(e.y),Math.floor(z))&&!mpInArena(null,Math.floor(e.x),Math.floor(e.y),Math.floor(e.z));}
/* ---- one shared kinematic flight (the Yeti's throw, the Daredevil's launch, the Cook's lob and slap). Bots go through a.pgrab. ---- */
function pmThrow(t,vx,vy,vz,by,how,o){o=o||{};
  if(t===P){if(P.dead)return false;P.ride=null;PMS.flight={vx,vy,vz,t:0,by,how,max:o.max||3,land:o.land||0,to:o.to||null,dmgLand:o.dmgLand||0};P.fallD=0;return true;}
  const a=t&&(t.A||(t.bot?t.A:null));if(a){a.pgrab={k:'thrown',by,src:null,x:t.x,y:t.y,z:t.z,vx,vy,vz,spd:0,until:MP.clock+(o.max||3),onEnd:null};return true;}
  return false;}
function pmFlightStep(dt){PMS.flF=frameCount;const F=PMS.flight;if(!F)return;
  if(!P||P.dead||DIM!=='puppet'){PMS.flight=null;return;}
  F.t+=dt;F.vy-=GRAV*dt;if(F.vy<-40)F.vy=-40;
  if(F.to){const dx=F.to[0]-P.x,dz=F.to[2]-P.z,d=Math.hypot(dx,dz);if(d<0.25){F.vx*=0.2;F.vz*=0.2;}}
  P.vx=P.vy=P.vz=0;moveBody(P,F.vx*dt,F.vy*dt,F.vz*dt,false);P.fallD=0;P.hurtT=Math.max(P.hurtT||0,0.35);   /* a throw is a knockback: i-frames in the air */
  if((P.onGround&&F.t>0.15)||F.t>F.max){PMS.flight=null;P.vx=P.vz=0;if(F.dmgLand)purgHit(P,F.dmgLand,F.by,F.how,{force:1});}}

/* ---- the hurt rules for P3 mobs (deviation, see status/P3.md): a wrapper of the core hurtMob, the engine's own playS
   pattern. It acts only inside purgatory on a P3 mob with a rule and a hit that will land; otherwise the original runs
   unchanged (overworld parity: no allocation, no random, no clock). ---- */
var PM_HURT={};
const pmHurtMob0=hurtMob;
hurtMob=function(e,dmg,kx,kz){
  if(DIM==='puppet'&&e&&e.t==='mob'&&!e.bot&&!e.dead&&dmg>0&&e.hurtT<=0.25&&PM_NAMES[e.mt]&&!MOBT[e.mt].npc){
    let r=dmg;try{r=pmPreHit(e,dmg,kx,kz);}catch(err){mpFail('p3 prehit '+e.mt,err);r=dmg;}if(r<0)return;dmg=r;}
  return pmHurtMob0(e,dmg,kx,kz);};
function pmHeldOf(by){if(!by||by==='Dan')return P?heldStack():null;const a=agByName(by);return a?a.inv[a.sel]:null;}
function pmPreHit(e,dmg,kx,kz){if(!e.pi)pmInit(e);const by=HIT_BY||'Dan',how=HIT_HOW,mel=how==null||how==='melee';
  const st=mel?pmHeldOf(by):null;
  if(st&&st.id===IT.PG_GAUNTLET&&e.mt==='pghand')dmg*=3;          /* x3 against flesh; UNHAND itself is P2's (piMeleeTick) */
  const f=PM_HURT[e.mt];if(f){const r=f(e,dmg,by,how,st,kx,kz);if(r<0)return -1;dmg=r;}
  return dmg;}
/* the hit height of Dan's melee ray on e (for the Yeti's sneakers) */
function pmHitY(e){if(!P)return e.y+e.h*0.6;const E=eyePos(),L=lookDir();
  const mn=[e.x-e.hw,e.y,e.z-e.hw],mx=[e.x+e.hw,e.y+e.h,e.z+e.hw];let t0=0,t1=6;
  for(let a=0;a<3;a++){if(Math.abs(L[a])<1e-9)continue;let ta=(mn[a]-E[a])/L[a],tb=(mx[a]-E[a])/L[a];if(ta>tb){const q=ta;ta=tb;tb=q;}if(ta>t0)t0=ta;if(tb<t1)t1=tb;}
  return E[1]+L[1]*Math.max(0,t0);}

/* ===================================================================== */
/* tethered puppets: the Blank and the Comic live on an arm out of an Arm Hole (e.hole = the block cell, e.reach)             */
/* ===================================================================== */
function pmTetherBase(e){const H=e.hole;return [H.x+0.5,H.y+1,H.z+0.5];}
/* the Blank family's felt colour (0xRRGGBB) and googly flag for P7's model (the OG rig picks them at mesh time) */
function pmFeltHr(e){if(e.pcolI==null){const c=e.pr&&e.pr.col||PM_FELT[(e.pid||0)%4];e.pcolI=parseInt(String(c).slice(1),16)||0x4ca82b;
    if(!e.pr)e.googly=e.googly||(((e.pid||0)*37+11)%10<3?1:0);}return {col:e.pcolI,googly:e.googly?1:0};}
/* move the puppet toward (tx,ty,tz), clamped to its reach (+slack while lunging), and pose its arm */
function pmTetherMove(e,dt,tx,ty,tz,spd,rigid){const A=pmTetherBase(e),R=(e.reach||6)+(e.lungeT>0?0.7:0);
  let dx=tx-A[0],dz=tz-A[2];const d=Math.hypot(dx,dz);if(d>R){tx=A[0]+dx/d*R;tz=A[2]+dz/d*R;}
  ty=clamp(ty,A[1]+0.4,A[1]+2.6);pmSteer(e,dt,tx,ty,tz,spd);
  const hx=e.x-A[0],hz=e.z-A[2],hd=Math.hypot(hx,hz);if(hd>R+0.2){e.x=A[0]+hx/hd*R;e.z=A[2]+hz/hd*R;}
  const G=pmArmFor(e);if(e.hrM){G.visible=false;}else if(G&&G.userData.parts&&e.pwd==null)pmArmPose(G.userData.parts,A[0],A[1]-0.02,A[2],e.x,e.y+0.25,e.z,rigid);
  e.parm={hx:A[0],hy:A[1],hz:A[2],bx:e.x,by:e.y,bz:e.z,reach:e.reach||6,strain:rigid?1:0};}
/* withdraw: the arm slides down its hole carrying the puppet (Arm Hole broken); the kill lands when it is under */
function pmWithdraw(e,who){if(e.pwd!=null||e.dead)return;e.pwd=0.7;e.pwdKill=()=>{purgHit(e,9999,who||null,'armhole',{force:1});};
  mwS('pg_squeak',e.x,e.y,e.z);}
function pmTetherWithdrawTick(e,dt){e.y-=dt*4.6;e.mesh.position.set(e.x,e.y,e.z);if(e.pr)pmJaw(e.pr,0.5+0.5*Math.abs(Math.sin(MP.clock*16)),dt);
  e.hrS.withdraw=clamp(1-(e.pwd||0)/0.7,0,1);e.hrS.flap=1;}
/* a puppet spawned without a hole (spawnMob from anywhere) wears an arm straight out of the floor under it */
function pmVirtHole(e){if(!e.hole){const y=pmSurfY(e.x,e.z);e.hole={x:Math.floor(e.x),y:Math.min(Math.floor(e.y)-1,y),z:Math.floor(e.z),id:'v'+e.pid,virt:1};e.reach=e.reach||(e.mt==='pgcomic'?5:6);}}
PREG.brain.pgwhat=function(e,dt,T){if(pmPre(e,dt))return;pmVirtHole(e);
  if(e.pwd!=null){pmTetherWithdrawTick(e,dt);return;}
  const A=pmTetherBase(e),R=e.reach||6,doc=pmDocile(),t=doc?null:pmFoe(e,R+6);
  let tx=A[0]+Math.sin(MP.clock*0.6+e.seed)*0.8,tz=A[2]+Math.cos(MP.clock*0.5+e.seed)*0.8,ty=A[1]+1.0,jaw=0.12+0.12*Math.sin(MP.clock*4+e.seed),lock=false,look=null,spd=T.spd*2.2;
  e.strain=0;
  const fl=(MPF.flinch||0)>0;if(fl&&!e.pfl){e.lungeT=0.4;e.lungeDir=[Math.sin(e.yaw),Math.cos(e.yaw)];e.strain=1;}e.pfl=fl;
  if(t&&!e.punhand){const dxh=t.x-A[0],dzh=t.z-A[2],dh=Math.hypot(dxh,dzh)||1;look=[t.x,t.y+1.4,t.z];
    const want=Math.min(R,Math.max(0,dh-1.0));tx=A[0]+dxh/dh*want;tz=A[2]+dzh/dh*want;ty=t.y+0.5;
    const dT=Math.hypot(t.x-e.x,t.z-e.z),dy=Math.abs((t.y+0.9)-(e.y+0.5));
    if(dh>R+1.5){e.strain=1;jaw=0.5+0.5*Math.abs(Math.sin(MP.clock*15));spd=7;e.plock=0;
      e.yankT=(e.yankT||0)-dt;if(e.yankT<=0){e.yankT=1.4+((e.pid*7)%10)*0.08;e.lungeT=0.32;e.lungeDir=[dxh/dh,dzh/dh];mwS('pg_squeak',e.x,e.y,e.z);}}
    else if(e.plock>0){lock=true;jaw=0.9;e.plock-=dt;
      if(e.plock<=0){e.plock=0;e.lungeT=0.24;e.lungeDir=[dxh/dh,dzh/dh];e.atkT=1.2;if(dT<2.1&&dy<1.7)pmStrike(e,t,T.dmg,'blank');}}
    else if(e.atkT<=0&&dT<2.4&&dy<1.8){e.plockD=0.6;pmTele(e,0.6,t);lock=true;}}
  if(e.lungeT>0){e.lungeT-=dt;const L=e.lungeT>0.12?1.1:0.4;tx+=e.lungeDir[0]*L;tz+=e.lungeDir[1]*L;spd=14;e.strain=1;}
  pmTetherMove(e,dt,tx,ty,tz,spd,e.strain>0);
  if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,10);else pmTurn(e,e.vx,e.vz,dt,3);
  pmPost(e,dt,{look,lock,jaw,hr:Object.assign({strain:e.strain,lunge:e.lungeT>0?1:0,flap:jaw,limp:0,possessed:0,withdraw:0,hole:e.hrM?A:undefined},pmFeltHr(e))});};
/* the Comic: grabs your wrist, does his whole routine at you, a beat of stillness, then the balcony's barrage lands on both */
PREG.brain.pgcomic=function(e,dt,T){if(pmPre(e,dt))return;pmVirtHole(e);
  const g=e.grab;
  if(e.pwd!=null){pmTetherWithdrawTick(e,dt);if(g)pmFozRelease(e);return;}
  const A=pmTetherBase(e),R=e.reach||5,doc=pmDocile();let tx=A[0]+Math.sin(MP.clock*0.5+e.seed)*0.6,tz=A[2]+Math.cos(MP.clock*0.4+e.seed)*0.6,ty=A[1]+1,jaw=0.1,lock=false,look=null,bobY=0;
  const fl=(MPF.flinch||0)>0;if(fl&&!e.pfl){e.lungeT=0.4;e.lungeDir=[Math.sin(e.yaw),Math.cos(e.yaw)];}e.pfl=fl;
  if(g){const w=g.who,dead=w===P?P.dead:(w.dead||(w.A&&(w.A.dead||!w.A.online)));
    if(dead||Math.hypot(w.x-e.x,w.z-e.z)>4.5){pmFozRelease(e);}
    else{g.t+=dt;look=[w.x,w.y+1.5,w.z];const dx=w.x-A[0],dz=w.z-A[2],d=Math.hypot(dx,dz)||1;
      tx=A[0]+dx/d*Math.min(R,Math.max(0,d-1.3));tz=A[2]+dz/d*Math.min(R,Math.max(0,d-1.3));ty=w.y+0.6;
      const loud=e.louder?1.4:1;
      if(g.t<5){jaw=(0.3+0.7*Math.abs(Math.sin(g.t*(9+3*loud))))*loud;bobY=Math.abs(Math.sin(g.t*6))*0.16*loud;}
      else if(g.t<6){jaw=0;lock=true;if(!g.rim){g.rim=1;mwS('pg_rimshot',e.x,e.y,e.z);}}
      else{if(!g.bar){g.bar=1;if(MP.quiet>MP.clock)g.silent=1;
          else{const n=3+((e.pid+Math.floor(MP.clock))%3);for(let i=0;i<n;i++){const tg=i%2?e:w;pmTomatoFromDark(tg,{dmg:1,delay:i*0.22,food:true});}
            mwS('pg_laugh',e.x,e.y,e.z);}}
        if(g.t>(g.silent?6.6:7.2))pmFozRelease(e);}
      if(e.grab){const hx=e.x+Math.sin(e.yaw)*0.5,hz=e.z+Math.cos(e.yaw)*0.5;    /* hold the wrist at arm's length */
        if(w===P){const ddx=P.x-hx,ddz=P.z-hz,dd=Math.hypot(ddx,ddz);if(dd>1.5){P.x=hx+ddx/dd*1.5;P.z=hz+ddz/dd*1.5;P.vx=P.vz=0;}}
        else if(w.A){w.A.pgrab={k:'held',by:'the Comic',src:e,x:hx,y:w.y,z:hz,vx:0,vy:0,vz:0,spd:0,until:MP.clock+0.3,onEnd:null};}}}}
  else if(!doc&&!(e.cd>MP.clock)&&!e.punhand){const t=pmFoe(e,R+1.6,{noSpot:1});
    if(t){const dh=Math.hypot(t.x-A[0],t.z-A[2]),dT=Math.hypot(t.x-e.x,t.z-e.z);look=[t.x,t.y+1.4,t.z];
      tx=t.x;tz=t.z;ty=t.y+0.6;
      if(dh<=R+0.9&&dT<1.9&&Math.abs(t.y-e.y)<2.2){e.grab={who:t,t:0};e.louder=0;pmLog(e,'grab');mwS('pg_honk',e.x,e.y,e.z);}}}
  if(e.lungeT>0){e.lungeT-=dt;tx+=e.lungeDir[0];tz+=e.lungeDir[1];}
  pmTetherMove(e,dt,tx,ty,tz,e.lungeT>0?12:4,!!e.grab||e.lungeT>0);
  if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,10);
  pmPost(e,dt,{look,lock,jaw,bobY,hr:{routine:g&&g.t<5?1:0,grab:g?1:0,still:g&&g.t>=5&&g.t<6?1:0,louder:e.louder?1:0,withdraw:0,hole:e.hrM?A:undefined}});};
function pmFozRelease(e){const g=e.grab;if(!g)return;e.grab=null;e.cd=MP.clock+90;if(g.who&&g.who.A&&g.who.A.pgrab&&g.who.A.pgrab.by==='the Comic')g.who.A.pgrab=null;}
PM_HURT.pgcomic=(e,dmg)=>{if(e.grab&&e.grab.t<5){e.louder=1;e.grab.t=Math.max(e.grab.t,3.4);mwS('pg_honk',e.x,e.y,e.z);}return dmg;};

/* ===================================================================== */
/* Hollows, the Hands and Possessed Hollows                                                                                  */
/* ===================================================================== */
PREG.brain.pghollow=function(e,dt,T){if(pmPre(e,dt))return;pmWalk(e,dt,0,0,0,{hop:false});pmPost(e,dt,{legs:false,noBob:1,hr:Object.assign({limp:1,possessed:0},pmFeltHr(e))});};
function pmUnder(x,y,z){return y<pmSurfY(x,z)-3;}
function pmHandsBelow(t){let n=0;for(const m of entities)if(!m.dead&&m.t==='mob'&&m.mt==='pghand'&&pmUnder(m.x,m.y,m.z)&&Math.hypot(m.x-t.x,m.z-t.z)<40)n++;return n;}
/* the face wrap: the screen becomes the inside of a puppet; 1 a second until 3 attack presses or an ally's hit */
function pmWrapEl(on){let el=PMS.wrapEl;
  if(!el&&on&&document.body&&typeof document.body.appendChild==='function'){el=document.createElement('div');el.id='pmwrap';
    el.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:8;display:none;background:radial-gradient(ellipse 18% 6% at 52% 38%,#fff7d8 0%,#ffe9a8 30%,rgba(0,0,0,0) 60%),repeating-linear-gradient(100deg,#c95a6e 0 14px,#b84a5e 14px 16px,#d06a7c 16px 40px),#c95a6e;opacity:.97';
    document.body.appendChild(el);PMS.wrapEl=el;}
  if(el&&el.style)el.style.display=on?'block':'none';return el;}
function pmWrapStart(e){if(PMS.wrap||!P||P.dead)return;PMS.wrap={e,t:0,acc:0,press:0};e.pwrap=1;pmWrapEl(true);mwS('pg_squeak',P.x,P.y,P.z);pmLog(e,'wrap');}
function pmWrapEnd(fling){const W=PMS.wrap;if(!W)return;PMS.wrap=null;pmWrapEl(false);const e=W.e;if(!e||e.dead)return;e.pwrap=0;e.st='seek';e.atkT=2.2;
  if(fling&&P){const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);e.x=P.x+fx*0.9;e.z=P.z+fz*0.9;e.y=P.y+1.0;e.vx=fx*7;e.vz=fz*7;e.vy=4;}}
function pmWrapTick(dt){const W=PMS.wrap;if(!W)return;const e=W.e;
  if(!e||e.dead||!P||P.dead||DIM!=='puppet'){pmWrapEnd(false);return;}
  W.t+=dt;W.acc+=dt;if(W.acc>=1){W.acc-=1;purgHit(P,1,'The Hands','hand',{});}
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);e.x=P.x+fx*0.25;e.z=P.z+fz*0.25;e.y=P.y+1.25;e.vx=e.vy=e.vz=0;e.yaw=P.yaw+Math.PI;
  if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;}
  const l=!!MB.l;if(l&&!PMS.mbl){W.press++;pmLog(e,'press');}PMS.mbl=l;
  if(W.press>=3)pmWrapEnd(true);}
PM_HURT.pghand=(e,dmg,by,how,st)=>{if(e.pwrap&&PMS.wrap&&PMS.wrap.e===e){if(by==='Dan')return -1;pmWrapEnd(true);return dmg;}
  if(e.wrapA&&by===e.wrapA.name){e.wrapA=null;e.st='seek';}return dmg;};
PREG.brain.pghand=function(e,dt,T){if(pmPre(e,dt))return;const doc=pmDocile(),blk=pmBlackout(),und=pmUnder(e.x,e.y,e.z);
  if(e.pwrap){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;if(e.pr&&e.pr.fingers)for(const f of e.pr.fingers)f.a.rotation.x=0.9+Math.sin(MP.clock*20+f.ph)*0.2;
    e.hrS.grip=1;e.hrS.wrap=1;return;}
  if(e.st==='flee'||(!blk&&!und&&!(e.ptgtHold>MP.clock))){if(e.st!=='flee'){e.st='flee';e.fleeT=1.0;}           /* SHOW: surface Hands go back down a hole */
    e.fleeT-=dt;e.y-=dt*2.2;e.mesh.position.set(e.x,e.y,e.z);if(e.fleeT<=0)removeEnt(e);return;}
  if(e.wrapA){const a=e.wrapA,b=a&&a.e;if(!a||a.dead||!b||!a.online||MP.clock>e.wrapEnd){e.wrapA=null;e.st='seek';e.atkT=2;}
    else{e.x=b.x;e.z=b.z;e.y=b.y+1.25;e.wrapAcc=(e.wrapAcc||0)+dt;if(e.wrapAcc>=1){e.wrapAcc-=1;purgHit(b,1,'The Hands','hand',{});}
      e.mesh.position.set(e.x,e.y,e.z);e.hrS.wrap=1;e.hrS.grip=1;return;}}
  let mx=0,mz=0,spd=T.spd*2.2,look=null,lock=false;
  if(e.st==='leap'){e.leapT-=dt;e.vy-=GRAV*dt;moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);const t=e.ptgt;
    if(t&&!t.dead&&Math.hypot(t.x-e.x,t.z-e.z)<0.95&&e.y>t.y-0.4&&e.y<t.y+1.9){
      if(t===P&&!PMS.wrap){pmWrapStart(e);e.st='wrap';}
      else if(t.A){e.wrapA=t.A;e.wrapEnd=MP.clock+3;e.st='wrap';pmStrike(e,t,1,'hand');}}
    else if((e.onGround&&e.leapT<0.35)||e.leapT<-0.6){e.st='seek';e.atkT=1.4;}
    pmPost(e,dt,{look:t?[t.x,t.y+1.5,t.z]:null,legs:false,hr:{reach:1,grip:0.6,leap:1,crouch:0,wrap:0,scale:1}});pmHandFingers(e,dt,0.2);return;}
  if(!doc){
    /* (a) BLACKOUT: a Hollow within 16 m gets worn */
    if(blk&&!e.ptgt){let h=null,hd=16;for(const m of entities)if(!m.dead&&m.mt==='pghollow'&&!m.pclaim){const d=Math.hypot(m.x-e.x,m.z-e.z);if(d<hd){hd=d;h=m;}}
      if(h){e.hol=h;h.pclaim=e;}}
    if(e.hol&&(e.hol.dead||!blk)){if(e.hol.pclaim===e)e.hol.pclaim=null;e.hol=null;}
    if(e.hol){const h=e.hol,dx=h.x-e.x,dz=h.z-e.z,d=Math.hypot(dx,dz)||1;mx=dx/d;mz=dz/d;look=[h.x,h.y,h.z];
      if(d<0.9){pmPossess(e,h);return;}}
    else{let t=e.ptgt&&!e.ptgt.dead&&e.ptgtHold>MP.clock?e.ptgt:pmFoe(e,16);
      if(!t&&blk&&P&&PMS.prints.length&&P.mode!=='c'&&!P.dead){const pt=pmPrintNear(e);if(pt){const dx=pt[0]-e.x,dz=pt[2]-e.z,d=Math.hypot(dx,dz)||1;mx=dx/d;mz=dz/d;}}
      if(t){const dx=t.x-e.x,dz=t.z-e.z,d=Math.hypot(dx,dz)||1;look=[t.x,t.y+1.5,t.z];
        if(e.plock>0){lock=true;e.plock-=dt;mx=mz=0;
          if(e.plock<=0){e.plock=0;e.st='leap';e.leapT=0.9;e.ptgt=t;const ty=(t.y+1.2)-e.y,T2=0.42;e.vx=dx/d*Math.min(10.5,d/T2);e.vz=dz/d*Math.min(10.5,d/T2);e.vy=ty/T2+0.5*GRAV*T2;
            pmLog(e,'hit');}}
        else if(e.atkT<=0&&e.onGround&&d<4.6&&Math.abs(t.y-e.y)<2.5&&!PMS.wrap){e.plockD=0.5;pmTele(e,0.5,t);lock=true;}
        else{mx=dx/d;mz=dz/d;}}}}
  pmWalk(e,dt,mx,mz,spd,{hopV:7.2});
  if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,10);else pmTurn(e,e.vx,e.vz,dt,8);
  pmPost(e,dt,{look,lock,legs:false,hr:{reach:lock?0.3:0,grip:lock?0.8:0,crouch:lock?1:0,leap:0,wrap:0,scale:1}});pmHandFingers(e,dt,Math.hypot(e.vx,e.vz)/4,lock);};
function pmHandFingers(e,dt,sp,crouch){const pr=e.pr;if(!pr||!pr.fingers)return;e.anim=(e.anim||0)+dt*(2+sp*12);
  for(const f of pr.fingers){f.a.rotation.x=(crouch?0.75:0.35)+Math.sin(e.anim+f.ph)*0.35*Math.min(1,sp);f.b.rotation.x=(crouch?-0.9:-0.35)-Math.sin(e.anim+f.ph)*0.2*Math.min(1,sp);}
  if(pr.palm)pr.palm.position.y=crouch?0.3:0.42;}
function pmPossess(hand,hol){const x=hol.x,y=hol.y,z=hol.z,heap=hol.pheap;removeEnt(hand);hol.pclaim=null;removeEnt(hol);
  spawnMob('pgposs',x,y+0.05,z);const p=entities[entities.length-1];p.pheap=heap;p.yaw=hol.yaw||0;mwS('pg_foamtear',x,y,z);
  if(heap!=null)pmHeapGone(heap);return p;}
/* footprints (Performer's Sneakers): Dan's trail for 20 s, which the Hands follow in BLACKOUT */
function pmPrintsTick(dt){if(!P||P.dead)return;const a=P.armor&&P.armor[3];const on=!!(a&&a.id===IT.PG_SNEAKERS);
  PMS.printT-=dt;if(on&&PMS.printT<=0&&P.onGround){PMS.printT=0.5;PMS.prints.push([P.x,P.y,P.z,MP.clock]);}
  while(PMS.prints.length&&MP.clock-PMS.prints[0][3]>20)PMS.prints.shift();}
/* follow the trail forward: from the nearest print to the next one, and from the newest one to Dan himself */
function pmPrintNear(e){let best=-1,bd=24;for(let i=0;i<PMS.prints.length;i++){const p=PMS.prints[i],d=Math.hypot(p[0]-e.x,p[2]-e.z);if(d<bd){bd=d;best=i;}}
  if(best<0)return null;if(best>=PMS.prints.length-1)return [P.x,P.y,P.z];return PMS.prints[best+1];}
/* Possessed Hollow: sprints at you, jaw flapping, eyes wide; collapses when SHOW returns (the Hand flees, the loot stays) */
PREG.brain.pgposs=function(e,dt,T){if(pmPre(e,dt))return;
  if(!pmBlackout()&&!e.pkeepShow){pmCollapse(e,true);return;}
  const doc=pmDocile(),t=doc?null:pmFoe(e,20);let mx=0,mz=0,look=null,lock=false,jaw=0.5+0.5*Math.abs(Math.sin(MP.clock*13+e.seed));
  if(t){const dx=t.x-e.x,dz=t.z-e.z,d=Math.hypot(dx,dz)||1;look=[t.x,t.y+1.4,t.z];
    if(e.plock>0){lock=true;e.plock-=dt;if(e.plock<=0){e.plock=0;e.atkT=1.0;if(d<1.9&&Math.abs(t.y-e.y)<2)pmStrike(e,t,T.dmg,'possessed');}}
    else if(e.atkT<=0&&d<1.8){e.plockD=0.6;pmTele(e,0.6,t);}
    else{mx=dx/d;mz=dz/d;}}
  pmWalk(e,dt,mx,mz,T.spd*2.2*1.25);if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,9);
  if(e.pr&&e.pr.lump){e.pr.lump.position.x=Math.sin(MP.clock*5+e.seed)*0.1;e.pr.lump.position.y=0.3+Math.sin(MP.clock*7)*0.08;}
  pmPost(e,dt,{look,lock,jaw,hr:Object.assign({possessed:1,strain:0,flap:jaw,limp:0},pmFeltHr(e))});};
/* collapse where it stands: loot (a Possessed Hollow) or nothing (Felt Dan walks again next BLACKOUT) */
function pmCollapse(e,loot){if(e.dead)return;burstParticles(e.x,e.y+0.4,e.z,B.PG_FLEECE,10,0.6);mwS('pg_squeak',e.x,e.y,e.z);
  if(loot){const h=HIT_BY,w=HIT_HOW;HIT_BY=null;HIT_HOW='collapse';try{e.hurtT=0;e.pfloor=null;pmHurtMob0(e,99999,0,0);}finally{HIT_BY=h;HIT_HOW=w;}}
  else removeEnt(e);}

/* ===================================================================== */
/* Felt Dan: a Hand climbs into the felt Dan from the Last Guest camp and comes after Dan specifically                        */
/* ===================================================================== */
PREG.brain.pgfeltdan=function(e,dt,T){if(pmPre(e,dt))return;
  if(!pmBlackout()){e.limp=(e.limp||0)+dt;if(e.pr&&e.pr.root){e.pr.root.rotation.x=-Math.min(1.5,e.limp*2.4);}
    e.mesh.position.set(e.x,e.y,e.z);if(e.limp>1.4)removeEnt(e);return;}
  const doc=pmDocile();let t=null;
  if(!doc){t=purgFoe(e,64,{danOnly:true});if(e.grudge)for(const nm in e.grudge){const a=agByName(nm),g=a&&a.online&&!a.dead&&a.dim===DIM?a.e:null;   /* a bot that hit it */
      if(g&&!g.dead&&Math.hypot(g.x-e.x,g.z-e.z)<24&&(!t||Math.hypot(g.x-e.x,g.z-e.z)<Math.hypot(t.x-e.x,t.z-e.z)))t=g;}}
  let mx=0,mz=0,look=null,lock=false;const pr=e.pr;
  if(t){const dx=t.x-e.x,dz=t.z-e.z,d=Math.hypot(dx,dz)||1;look=[t.x,t.y+1.5,t.z];
    if(e.plock>0){lock=true;e.plock-=dt;const pull=clamp((0.5-e.plock)/0.5,0,1);if(pr&&pr.armR)pr.armR.rotation.x=e.plock<0.5?pull*1.3:0;
      if(e.plock<=0){e.plock=0;e.atkT=1.3;if(pr&&pr.armR)pr.armR.rotation.x=-1.5;e.punchT=0.25;
        if(d<2.0&&Math.abs(t.y-e.y)<2)pmStrike(e,t,T.dmg,'feltdan',{kx:dx*1.6,kz:dz*1.6});}}
    else if(e.atkT<=0&&d<1.9){e.plockD=1.1;pmTele(e,1.1,t);}
    else{mx=dx/d;mz=dz/d;}}
  if(e.punchT>0){e.punchT-=dt;if(e.punchT<=0&&pr&&pr.armR)pr.armR.rotation.x=0;}
  pmWalk(e,dt,mx,mz,T.spd*2.2);if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,9);else pmTurn(e,e.vx,e.vz,dt,6);
  pmPost(e,dt,{look,lock});};
PM_HURT.pgfeltdan=(e,dmg,by)=>{if(by&&by!=='Dan'&&agByName(by)){e.grudge=e.grudge||{};e.grudge[by]=1;}return dmg;};

/* ===================================================================== */
/* rubber hens, Chorus Pigs, Thieving Frogs                                                                               */
/* ===================================================================== */
PREG.brain.pghen=function(e,dt,T){if(pmPre(e,dt))return;let mx=0,mz=0,spd=T.spd*2.2;
  if(e.runner){const R=e.runner,ch=R.chef;R.t-=dt;                                 /* a Live Chicken bolting across the Cook's mesa */
    if(R.t<=0||!ch||ch.dead){e.runner=null;}
    else{const dx=e.x-ch.x,dz=e.z-ch.z,d=Math.hypot(dx,dz)||1;let ax=dx/d,az=dz/d;
      const ok=(x,z)=>R.cells.has(Math.floor(x)+','+Math.floor(z));
      if(!ok(e.x+ax*1.2,e.z+az*1.2)){const a2=Math.atan2(ax,az)+(R.side||1)*1.6;ax=Math.sin(a2);az=Math.cos(a2);if(!ok(e.x+ax*1.2,e.z+az*1.2)){R.side=-(R.side||1);ax=-ax;az=-az;}}
      if(!ok(e.x+ax*0.6,e.z+az*0.6)){ax=az=0;}
      mx=ax;mz=az;spd=4.2;}}
  else if(e.mode==='flee'){e.tT-=dt;mx=Math.sin(e.dir);mz=Math.cos(e.dir);spd*=1.6;if(e.onGround&&((e.pid+frameCount)%37===0))e.vy=10.6;if(e.tT<=0)e.mode='idle';}
  else{e.tT=(e.tT||0)-dt;if(e.tT<=0){e.tT=1.5+((e.pid*13+frameCount)%40)*0.08;e.wdir=e.seed+MP.clock*0.9;e.wander=!e.wander;}
    if(e.wander){mx=Math.sin(e.wdir);mz=Math.cos(e.wdir);spd*=0.5;if(pmArenaAhead(e,mx,mz)){e.wdir+=Math.PI;mx=-mx;mz=-mz;}}}
  pmWalk(e,dt,mx,mz,spd,{hopV:7.2,hop:!(e.pcoop&&e.mode!=='flee')});if(mx||mz)pmTurn(e,mx,mz,dt,7);   /* coop hens stay behind their fence */
  const pr=e.pr;if(pr&&pr.wings){const fl=!e.onGround||e.mode==='flee'||e.runner?Math.sin(MP.clock*30)*0.8:0;pr.wings[0].rotation.z=-fl;pr.wings[1].rotation.z=fl;
    if(pr.neck)pr.neck.rotation.x=Math.sin(MP.clock*6+e.seed)*0.25;}
  pmPost(e,dt,{jaw:0});};
PREG.mobUse.pghen=function(e){if(!P||P.dead)return;const st=heldStack();
  if(st){showToast('Empty hand.');return;}
  mpGive({id:IT.PG_LIVECHICK,count:1},'hen');burstParticles(e.x,e.y+0.5,e.z,B.PG_FLEECE,6,0.4);mwS('pg_honk',e.x,e.y,e.z);
  e.pnodrop=1;removeEnt(e);};
PREG.brain.pgpig=function(e,dt,T){if(pmPre(e,dt))return;let mx=0,mz=0,spd=T.spd*2.2;e.admire=0;e.posing=0;
  const fx=Math.sin(e.yaw),fz=Math.cos(e.yaw);
  if((e.pid+frameCount)%6===0)e.pmir=pmMirrorAhead(e,fx,fz);
  if(e.pmir){e.admire=1;}
  else if(e.mode==='flee'){e.tT-=dt;mx=Math.sin(e.dir);mz=Math.cos(e.dir);spd*=1.5;if(e.tT<=0)e.mode='idle';}
  else{let spot=null,sd=6;try{for(const s of pmSpots('palaceSpot')){const d=Math.hypot(s[0]-e.x,s[2]-e.z);if(d<sd){sd=d;spot=s;}}}catch(err){}
    if(spot){if(sd>0.8){mx=(spot[0]-e.x)/sd;mz=(spot[2]-e.z)/sd;spd*=0.8;}else e.posing=1;}
    else{e.tT=(e.tT||0)-dt;if(e.tT<=0){e.tT=2+((e.pid*7+frameCount)%30)*0.1;e.wdir=e.seed+MP.clock;e.wander=!e.wander;}if(e.wander){mx=Math.sin(e.wdir);mz=Math.cos(e.wdir);spd*=0.5;if(pmArenaAhead(e,mx,mz)){e.wdir+=Math.PI;mx=-mx;mz=-mz;}}}}
  pmWalk(e,dt,mx,mz,spd);if(mx||mz)pmTurn(e,mx,mz,dt,6);
  if(e.posing&&e.pr&&e.pr.head){e.pr.head.rotation.x=-0.4;e.yaw+=dt*0.6;}else if(e.pr&&e.pr.head)e.pr.head.rotation.x=e.admire?-0.15:0;
  pmPost(e,dt,{look:e.admire&&P?[P.x,P.y+1,P.z]:null,hr:{roll:0,squeal:e.mode==='flee'?1:0,dazed:0}});};
/* a Dressing Mirror block within 3 in front, or a raised Vanity Mirror (Dan holding it up) within 3 */
function pmMirrorAhead(e,fx,fz){for(let k=1;k<=3;k++)for(let h=0;h<=1;h++){const id=getBlock(Math.floor(e.x+fx*k),Math.floor(e.y+0.3+h),Math.floor(e.z+fz*k));if(id===B.PG_MIRROR)return 1;}
  if(P&&!P.dead){const st=heldStack();if(st&&st.id===IT.PG_VMIRROR&&(MB.r||(typeof MPF!=='undefined'&&MPF.vmirror))){const dx=P.x-e.x,dz=P.z-e.z,d=Math.hypot(dx,dz);if(d<3.2&&(dx*fx+dz*fz)/(d||1)>0.2){e.yaw=Math.atan2(dx,dz);return 2;}}}
  return 0;}
PREG.brain.pgfrog=function(e,dt,T){if(pmPre(e,dt))return;const doc=pmDocile();let look=null,lock=false;const pr=e.pr;
  e.hopT=(e.hopT||0)-dt;let hop=null;
  if(e.carry){if(P&&e.hopT<=0){const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz)||1;hop=[dx/d,dz/d];}}       /* hop away with your stack */
  else if(!doc&&P&&!P.dead&&P.mode!=='c'&&!(e.ppin>0)){const dx=P.x-e.x,dz=P.z-e.z,d=Math.hypot(dx,dz)||1;
    if(d<14){look=[P.x,P.y+1.2,P.z];
      if(e.plock>0){lock=true;e.plock-=dt;if(e.plock<=0){e.plock=0;e.atkT=2.5;e.tongueT=0.35;pmLog(e,'hit');if(d<4.6&&Math.abs(P.y-e.y)<2.5)pmFrogSnatch(e);}}
      else if(e.atkT<=0&&d<4.2&&e.onGround){e.plockD=0.5;pmTele(e,0.5,P);}
      else if(e.hopT<=0&&d>3.2)hop=[dx/d,dz/d];}
    else if(e.hopT<=0&&((e.pid+frameCount)%3===0)){const a=e.seed+MP.clock;hop=[Math.sin(a),Math.cos(a)];}}
  if(hop&&e.onGround&&!(e.ppin>0)){e.hopT=0.55+((e.pid*5+frameCount)%9)*0.05;e.vx=hop[0]*3.4;e.vz=hop[1]*3.4;e.vy=6;e.yaw=Math.atan2(hop[0],hop[1]);}
  if(e.onGround&&!hop){e.vx*=Math.exp(-dt*10);e.vz*=Math.exp(-dt*10);}
  e.vy-=GRAV*dt;moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(look&&!e.carry)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,8);
  if(pr&&pr.tongueG){if(e.tongueT>0){e.tongueT-=dt;const k=Math.sin(Math.min(1,(0.35-e.tongueT)/0.35)*Math.PI);pr.tongueG.visible=true;pr.tongueG.scale.z=Math.max(0.01,k*4);}else pr.tongueG.visible=false;}
  pmPost(e,dt,{look,lock,legs:false,jaw:e.tongueT>0?1:0,hr:{tongue:e.tongueT>0?1:0,aim:e.tongueT>0&&P?[P.x,P.y+1,P.z]:undefined,carry:e.carry?1:0,hop:e.onGround?0:1,pinned:e.ppin>0?1:0}});};
/* the tongue takes the stack in your selected slot if it is a material, food or ammo (never a tool, weapon, armour or the Programme) */
function pmStealable(st){if(!st)return false;const d=DEFS[st.id];if(!d)return false;
  if(st.id===IT.PG_PROGRAMME||d.tool||d.armor||d.gun)return false;
  if(d.food>0||st.id===IT.PG_STAPLES)return true;                         /* food (pies included) and ammo */
  return !(d.gadget||d.dur||d.puseHold||d.dmg);}                          /* gear and weapons stay; materials go */
function pmFrogSnatch(e){if(!P)return false;const st=P.inv[P.sel];mwS('pg_thwip',e.x,e.y,e.z);
  if(!pmStealable(st))return false;e.carry=st;P.inv[P.sel]=null;redrawHotbar();pmLog(e,'steal');return true;}

/* ===================================================================== */
/* the Pelican and the Homing Herring                                                                                        */
/* ===================================================================== */
PREG.proj.fish={mesh:e=>pmPoolGet('fish'),free:m=>pmPoolPut('fish',m),r:0.45,g:0,life:7,
  hit:(f,t)=>{if(f.batted){const pelican=t.t==='mob'&&t.mt==='pgpelican';purgHit(t,pelican?6:3,f.owner||'Dan','batfish',{force:1,kx:f.vx,kz:f.vz});
      if(pelican){t.down=1.6;t.vy=7;t.vx+=f.vx*0.4;t.vz+=f.vz*0.4;mwS('pg_honk',t.x,t.y,t.z);}return true;}
    if(t===P||t.bot){if(f.ph==='out'&&!f.hitOut){f.hitOut=1;purgHit(t,3,'the Pelican','fish',{kx:f.vx,kz:f.vz});}
      else if(f.ph==='back'&&!f.hitBack){f.hitBack=1;purgHit(t,3,'the Pelican','fish',{kx:f.vx,kz:f.vz});}}
    return false;},
  land:(f)=>{burstParticles(f.x,f.y,f.z,B.PG_SCUM,4,0.4);return true;}};
function pmPoolGet(k){const P0=PMS.pool||(PMS.pool={});const L=P0[k]||(P0[k]=[]);return L.pop()||pmProp(k);}
function pmPoolPut(k,m){const P0=PMS.pool||(PMS.pool={});const L=P0[k]||(P0[k]=[]);if(L.length<24)L.push(m);}
PREG.brain.pgpelican=function(e,dt,T){if(pmPre(e,dt))return;const pr=e.pr;
  if(e.down>0){e.down-=dt;pmWalk(e,dt,0,0,0,{hop:false});if(pr&&pr.root)pr.root.rotation.x=-Math.min(1.45,(1.6-e.down)*5);pmPost(e,dt,{jaw:0.6,legs:false});pmLewFish(e,dt);return;}
  if(pr&&pr.root)pr.root.rotation.x=0;
  const doc=pmDocile(),t=doc?null:pmFoe(e,20);let mx=0,mz=0,look=null,lock=false;
  if(e.stag>0){e.stag-=dt;}
  else if(t){const dx=t.x-e.x,dz=t.z-e.z,d=Math.hypot(dx,dz)||1;look=[t.x,t.y+1.4,t.z];
    const to=d>10?1:(d<7?-1:0);mx=dx/d*to;mz=dz/d*to;
    e.thrT=(e.thrT||1.5)-dt;
    if(e.plock>0){lock=true;e.plock-=dt;mx=mz=0;if(e.plock<=0){e.plock=0;pmLewThrow(e,t);}}
    else if(e.thrT<=0&&!(e.fishes&&e.fishes.length)){e.thrT=3;e.plockD=0.6;pmTele(e,0.6,t);}}
  pmWalk(e,dt,mx,mz,T.spd*2.2);if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,8);
  if(pr&&pr.armR)pr.armR.rotation.x=lock?-2.4:(e.thrownT>0?-0.6:0);if(e.thrownT>0)e.thrownT-=dt;
  if(pr&&pr.fish)pr.fish.visible=!(e.fishes&&e.fishes.length);
  pmLewFish(e,dt);pmPost(e,dt,{look,lock,jaw:lock?0.7:0.1});};
function pmLewHand(e){return [e.x+Math.sin(e.yaw+0.6)*0.45,e.y+1.2,e.z+Math.cos(e.yaw+0.6)*0.45];}
function pmLewThrow(e,t){const h=pmLewHand(e),dx=t.x-h[0],dz=t.z-h[2],d=Math.hypot(dx,dz)||1,s=13,side=((e.pid+(e.thrN=(e.thrN||0)+1))%2)?1:-1;
  const a0=Math.atan2(dx,dz)+side*0.45*(d/s),ty=(t.y+1.0-h[1])/(d/s);   /* the curve turns 0.9 rad/s: start half of it the other way */
  const f=puSpawn('fish',h[0],h[1],h[2],Math.sin(a0)*s,clamp(ty,-3,3),Math.cos(a0)*s,'the Pelican',{src:e,pelican:e,ph:'out',gone:0,hitOut:0,hitBack:0,g:0,ox:h[0],oz:h[2],side});
  if(f){(e.fishes||(e.fishes=[])).push(f);e.thrownT=0.3;e.hrS.fired=true;pmLog(e,'hit');mwS('pg_swish',h[0],h[1],h[2]);}}
/* steer each fish: 12 m out in a slight curve, then home on the Pelican's hand; a return that missed hits the Pelican (6, staggered 1 s) */
function pmLewFish(e,dt){const L=e.fishes;if(!L||!L.length)return;
  for(let i=L.length-1;i>=0;i--){const f=L[i];if(f.dead){L.splice(i,1);continue;}
    if(f.batted){L.splice(i,1);continue;}
    if(f.mesh)f.mesh.rotation.y+=dt*18;
    if(f.ph==='out'){const ox=f.x-f.ox,oz=f.z-f.oz,a=-f.side*dt*0.9;
      const c=Math.cos(a),s=Math.sin(a),nx=f.vx*c+f.vz*s,nz=-f.vx*s+f.vz*c;f.vx=nx;f.vz=nz;if(f.age>0.5)f.vy*=Math.exp(-dt*3);
      if(Math.hypot(ox,oz)>=12)f.ph='back';}
    else{const h=pmLewHand(e),dx=h[0]-f.x,dy=h[1]-f.y,dz=h[2]-f.z,d=Math.hypot(dx,dy,dz)||1;
      f.vx=dx/d*13;f.vy=dy/d*13;f.vz=dz/d*13;
      if(d<0.9){if(f.hitBack){mwS('pg_squeak',e.x,e.y,e.z);}
        else{e.hurtT=0;purgHit(e,6,'the Pelican','fish',{force:1,kx:-f.vx,kz:-f.vz});e.stag=1;pmLog(e,'self');}
        puRemove(f);L.splice(i,1);}}}}

/* ===================================================================== */
/* the Drummer: chained to a stake in a Band Room (chain 8)                                                                */
/* ===================================================================== */
function pmChainFor(e){if(e.pchain)return e.pchain;const G=new THREE.Group(),R={pm:[],own:{},legs:[]},links=[];
  for(let i=0;i<10;i++)links.push(pmB(R,G,0.09,0.09,0.4,'#8a8a92',0,0,0,{shared:1}));
  const st=pmProp('stake');G.add(st);pmAdd(G);PMS.ownP.add(e);e.pchain={G,links,stake:st};return e.pchain;}
function pmChainPose(e,taut){const C=pmChainFor(e),S=e.stake;C.stake.position.set(S[0],S[1],S[2]);
  const ax=S[0],ay=S[1]+0.8,az=S[2],bx=e.x,by=e.y+1.25,bz=e.z,n=C.links.length,d=Math.hypot(bx-ax,bz-az),sag=taut?0:Math.max(0,(8-d)*0.18);
  let px=ax,py=ay,pz=az;for(let i=0;i<n;i++){const u=(i+1)/n,qx=ax+(bx-ax)*u,qz=az+(bz-az)*u,qy=ay+(by-ay)*u-Math.sin(u*Math.PI)*sag;
    pmSeg(C.links[i],px,py,pz,qx,qy,qz,0.08,0.12);C.links[i].visible=!e.free;px=qx;py=qy;pz=qz;}
  C.G.visible=!e.hrM;}                                         /* Hyperreal draws the chain when it gets e.hrS.stake */
function pmAnimalProps(e){if(!e.pkit&&e.kit){e.pkit=pmProp('kit');e.pkit.position.set(e.kit[0],e.kit[1],e.kit[2]);pmAdd(e.pkit);PMS.ownP.add(e);}}
function pmAnimalDrop(e){if(e.pchain){pmDel(e.pchain.G);e.pchain=null;}if(e.pkit){pmDel(e.pkit);e.pkit=null;}}
PREG.brain.pgdrummer=function(e,dt,T){if(pmPre(e,dt))return;if(!e.stake)e.stake=[e.x,e.y,e.z];if(!e.kit)e.kit=[e.stake[0],e.stake[1],e.stake[2]+2.2];
  pmAnimalProps(e);const pr=e.pr,S=e.stake,K=e.seat||e.kit,doc=pmDocile();let mx=0,mz=0,spd=T.spd*2.2,look=null,lock=false,jaw=0.2,drum=false,taut=false;
  const st=e.st||(e.st='drum');const BS=PMS.band[e.room|0]||(PMS.band[e.room|0]={});
  const sd=Math.hypot(e.x-S[0],e.z-S[2]);
  if(st==='yanked'||st==='sleep'){e.stun-=dt;if(e.onGround&&st==='yanked'){e.vx*=Math.exp(-dt*6);e.vz*=Math.exp(-dt*6);}
    if(pr&&pr.root)pr.root.rotation.x=st==='yanked'?Math.min(1.5,(pr.root.rotation.x||0)+dt*9):-1.5;
    if(e.stun<=0){e.st=st==='sleep'?'return':'up';e.upT=0.6;e.free=0;if(pr&&pr.root)pr.root.rotation.x=0;}
    e.vy-=GRAV*dt;moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);pmChainPose(e,false);pmPost(e,dt,{jaw:st==='sleep'?0:0.9,legs:false,hr:{yank:st==='yanked'?1:0,stun:st==='yanked'?1:0,sleep:st==='sleep'?1:0,drum:0,charge:0,berserk:0,stake:e.hrM?S:undefined}});return;}
  if(st==='up'){e.upT-=dt;if(e.upT<=0)e.st='drum';}
  if(e.free>0){e.free-=dt;let t=doc?null:purgFoe(e,20);let tm=null,td=t?Math.hypot(t.x-e.x,t.z-e.z):20;
    for(const m of entities)if(m!==e&&!m.dead&&m.t==='mob'&&!m.bot&&MOBT[m.mt]&&!MOBT[m.mt].prop&&!MOBT[m.mt].npc){const d=Math.hypot(m.x-e.x,m.z-e.z);if(d<td){td=d;tm=m;}}
    const tg=tm||t;jaw=0.6+0.4*Math.abs(Math.sin(MP.clock*16));
    if(tg){const dx=tg.x-e.x,dz=tg.z-e.z,d=Math.hypot(dx,dz)||1;mx=dx/d;mz=dz/d;spd=7;look=[tg.x,tg.y+1,tg.z];
      if(d<1.6&&e.atkT<=0){e.atkT=0.9;pmStrike(e,tg,T.dmg,'animal');}}
    if(e.free<=0){e.st='sleep';e.stun=20;e.free=0;mwS('pg_thump',e.x,e.y,e.z);}}
  else if(e.st==='drum'||e.st==='charge'||e.st==='return'){
    const t=doc?null:purgFoe(e,30);const tIn=t&&Math.hypot(t.x-S[0],t.z-S[2])<=10&&Math.abs(t.y-S[1])<4;
    if(tIn&&e.st!=='charge'&&e.st!=='up'){if(!(e.plock>0)){e.plockD=0.6;pmTele(e,0.6,t);mwS('pg_thump',e.x,e.y,e.z);}}
    if(e.plock>0){e.plock-=dt;lock=true;look=t?[t.x,t.y+1.4,t.z]:null;if(e.plock<=0){e.plock=0;e.st='charge';}}
    else if(e.st==='charge'){if(!tIn){e.st='return';}
      else{const dx=t.x-e.x,dz=t.z-e.z,d=Math.hypot(dx,dz)||1;mx=dx/d;mz=dz/d;spd=8.5;look=[t.x,t.y+1.4,t.z];jaw=1;
        if(d<1.5&&e.atkT<=0){e.atkT=1.0;pmStrike(e,t,T.dmg,'animal');}
        if(sd>=8){taut=true;e.st='yanked';e.stun=1.5;const ux=(S[0]-e.x)/(sd||1),uz=(S[2]-e.z)/(sd||1);e.vx=ux*9;e.vz=uz*9;e.vy=5.5;
          mwS('pg_thump',e.x,e.y,e.z);if(P&&Math.hypot(P.x-e.x,P.z-e.z)<12)mpShake(0.35,0.3);pmLog(e,'yank');}}}
    else if(e.st==='return'||Math.hypot(e.x-K[0],e.z-K[2])>1.6){const dx=K[0]-e.x,dz=K[2]-e.z,d=Math.hypot(dx,dz)||1;
      if(d>1.0){mx=dx/d;mz=dz/d;spd=2.4;}else e.st='drum';}
    else drum=true;}
  if(sd>8.2&&!e.free){const ux=(S[0]-e.x)/sd,uz=(S[2]-e.z)/sd;e.x+=ux*(sd-8.2);e.z+=uz*(sd-8.2);}  /* the chain is the chain */
  BS.drum=drum;BS.beat=false;BS.awake=e.st!=='sleep';
  if(drum){e.beatT=(e.beatT||0)-dt;if(e.beatT<=0){e.beatT=0.3;BS.beat=true;BS.t=MP.clock;e.beatN=(e.beatN||0)+1;
      if(e.mouth)burstParticles(e.mouth[0]+0.5,e.mouth[1]+0.6,e.mouth[2]+0.5,B.PG_FOAM,3,0.7);
      if(e.pkit&&e.pkit.userData.cym)e.pkit.userData.cym.rotation.z=0.25;}
    else if(e.pkit&&e.pkit.userData.cym)e.pkit.userData.cym.rotation.z*=0.85;
    pmTurn(e,e.kit[0]-e.x+0.0001,e.kit[2]-e.z,dt,6);
    if(pr&&pr.armL){pr.armL.rotation.x=-1.2+Math.sin(MP.clock*22)*0.7;pr.armR.rotation.x=-1.2+Math.sin(MP.clock*22+2)*0.7;}}
  else if(pr&&pr.armL){pr.armL.rotation.x=e.st==='charge'?-1.4:0;pr.armR.rotation.x=e.st==='charge'?-1.4:0;}
  if(pr&&pr.sticks){pr.sticks[0].visible=pr.sticks[1].visible=drum;}
  pmWalk(e,dt,mx,mz,spd);if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,10);else if(mx||mz)pmTurn(e,mx,mz,dt,8);
  pmChainPose(e,taut||sd>7.6);pmPost(e,dt,{look,lock,jaw:drum?0.3+0.3*Math.abs(Math.sin(MP.clock*11)):jaw,hr:{yank:0,stun:0,sleep:0,drum:drum?1:0,charge:e.st==='charge'?1:0,berserk:e.free>0?1:0,stake:e.hrM?S:undefined}});};
PM_HURT.pgdrummer=(e,dmg)=>{if(e.st==='yanked')return dmg*1.5;if(e.st==='sleep')return dmg*2;return dmg;};
function pmBandState(i){const s=PMS.band[i|0]||{};return {drum:!!s.drum,beat:!!s.beat,awake:s.awake!==false};}
/* Wire Snips on the Drummer's stake (an attack press with snips held, looking at the stake within 2.6 m) frees him: berserk 30 s */
function pmSnipCheck(){if(!P||P.dead)return;const l=!!MB.l,edge=l&&!PMS.mbl2;PMS.mbl2=l;if(!edge)return;
  const st=heldStack();if(!st||(st.id!==IT.PG_SNIPS&&st.id!==IT.PG_RSNIPS))return;const E=eyePos(),L=lookDir();
  for(const e of entities){if(e.dead||e.mt!=='pgdrummer'||!e.stake||e.free>0)continue;const S=e.stake,dx=S[0]-E[0],dy=S[1]+0.6-E[1],dz=S[2]-E[2],d=Math.hypot(dx,dy,dz);
    if(d<2.8&&(dx*L[0]+dy*L[1]+dz*L[2])/d>0.88){e.free=30;e.st='free';e.plock=0;mwS('pg_spark',S[0],S[1],S[2]);burstParticles(S[0],S[1]+0.8,S[2],B.PG_WIREORE,8,0.5);pmLog(e,'freed');return;}}}

/* ===================================================================== */
/* Lab Rat Clones: hit one and it splits (own hitboxes per size); Tesla arcs pop them                                         */
/* ===================================================================== */
var PM_BKSPLIT={pgrat:'pgrat2',pgrat2:'pgrat4'};
function pmRatCount(){let n=0;for(const m of entities)if(!m.dead&&m.t==='mob'&&(m.mt==='pgrat'||m.mt==='pgrat2'||m.mt==='pgrat4'))n++;return n;}
function pmRatPop(e){if(e.dead)return;burstParticles(e.x,e.y+e.h,e.z,B.PG_BURNER,10,0.7);mwS('pg_alarm',e.x,e.y,e.z);
  pBlast(e.x,e.y+e.h*0.5,e.z,2,2,'Lab Rat Clone',{self:e,how:'boom'});const h=HIT_BY,w=HIT_HOW;HIT_BY=null;HIT_HOW='tesla';
  try{e.hurtT=0;pmHurtMob0(e,99999,0,0);}finally{HIT_BY=h;HIT_HOW=w;}}
function pmRatSplit(e,by){const nx=PM_BKSPLIT[e.mt];if(!nx)return false;const g=e.grp,x=e.x,y=e.y,z=e.z;
  if(pmRatCount()>=16)return false;
  if(MOBT[e.mt].drop&&Math.random()<0.5)mpDrop(x,y+0.5,z,{id:IT.PG_COPPER,count:1},(agByName(by)||by==='Dan')?by:null,0,2,0);
  e.pnodrop=1;removeEnt(e);burstParticles(x,y+0.6,z,B.PG_LINO,8,0.5);mwS('pg_alarm',x,y,z);
  for(const s of [-1,1]){spawnMob(nx,x+s*0.3,y+0.05,z+s*0.1);const c=entities[entities.length-1];c.grp=g;c.vx=s*3;c.vy=4;c.hurtT=0.35;c.pangry=MP.clock+40;}
  if(g!=null)PMS['bkg'+g]=MP.clock+40;return true;}
PM_HURT.pgrat=(e,dmg,by,how)=>{if(how==='tesla'){pmRatPop(e);return -1;}if(pmRatSplit(e,by))return -1;return dmg;};
PM_HURT.pgrat2=PM_HURT.pgrat;
PM_HURT.pgrat4=(e,dmg,by,how)=>{if(how==='tesla'){pmRatPop(e);return -1;}if(e.grp!=null)PMS['bkg'+e.grp]=MP.clock+40;return dmg;};
function pmRatBrain(e,dt,T){if(pmPre(e,dt))return;const doc=pmDocile(),small=e.mt==='pgrat4';let mx=0,mz=0,spd=T.spd*2.2,look=null,lock=false;
  const angry=(e.grp!=null&&PMS['bkg'+e.grp]>MP.clock)||(e.pangry>MP.clock);
  if(small&&!doc){const t=purgFoe(e,12);if(t){const dx=e.x-t.x,dz=e.z-t.z,d=Math.hypot(dx,dz)||1;mx=dx/d;mz=dz/d;spd*=1.4;}}
  else if(angry&&!doc){const t=pmFoe(e,24);
    if(t){const dx=t.x-e.x,dz=t.z-e.z,d=Math.hypot(dx,dz)||1;look=[t.x,t.y+1.2,t.z];
      if(e.plock>0){lock=true;e.plock-=dt;if(e.plock<=0){e.plock=0;e.atkT=1.0;if(d<1.6+e.hw)pmStrike(e,t,T.dmg,'rat');}}
      else if(e.atkT<=0&&d<1.4+e.hw){e.plockD=0.5;pmTele(e,0.5,t);}
      else{mx=dx/d;mz=dz/d;}}}
  else{e.tT=(e.tT||0)-dt;if(e.tT<=0){e.tT=1.5+((e.pid*11+frameCount)%25)*0.1;e.wdir=e.seed+MP.clock*1.3;e.wander=!e.wander;}
    if(e.wander){mx=Math.sin(e.wdir);mz=Math.cos(e.wdir);spd*=0.45;if(pmArenaAhead(e,mx,mz)){e.wdir+=Math.PI;mx=-mx;mz=-mz;}}
    if(((e.pid*31+frameCount)%400)===0)mwS('pg_alarm',e.x,e.y,e.z);}
  pmWalk(e,dt,mx,mz,spd);if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,9);else if(mx||mz)pmTurn(e,mx,mz,dt,7);
  const pr=e.pr;if(pr&&pr.armL){const up=small||lock?-2.6:0;pr.armL.rotation.x=up+(small?Math.sin(MP.clock*18)*0.3:0);pr.armR.rotation.x=up-(small?Math.sin(MP.clock*18)*0.3:0);}
  pmPost(e,dt,{look,lock,hr:{split:0,burn:0,panic:small?1:0,squeak:((e.pid*31+frameCount)%400)<12?1:0,pinned:0,empty:0,zap:0}});}
PREG.brain.pgrat=pmRatBrain;PREG.brain.pgrat2=pmRatBrain;PREG.brain.pgrat4=pmRatBrain;

/* ===================================================================== */
/* the Yeti: never stops following; the sneakers are the weak point; sits at the Pig's rope during her fight                  */
/* ===================================================================== */
PREG.brain.pgyeti=function(e,dt,T){if(pmPre(e,dt))return;const pr=e.pr,doc=pmDocile();let mx=0,mz=0,spd=2.0,look=null,lock=false,jaw=0.1;
  if(e.trip>0){e.trip-=dt;if(pr&&pr.root)pr.root.rotation.x=Math.min(1.5,(pr.root.rotation.x||0)+dt*8);pmWalk(e,dt,0,0,0,{hop:false});
    if(e.trip<=0&&pr&&pr.root)pr.root.rotation.x=0;pmPost(e,dt,{legs:false,jaw:0.6,hr:{trip:1}});return;}
  if(pr&&pr.root)pr.root.rotation.x=0;
  const hs=pmHn(),watch=hs&&hs.name==='bigpig'&&hs.live;
  if(watch){const r=pmRopeSpot(e);const dx=r[0]-e.x,dz=r[2]-e.z,d=Math.hypot(dx,dz);
    if(d>0.8){mx=dx/d;mz=dz/d;spd=2.4;e.sit=0;}else{e.sit=1;e.yaw=0;}e.pkeep=1;}
  else{e.sit=0;let t=e.fol&&!e.fol.dead&&!(e.fol===P&&(P.dead||P.mode==='c'))&&!(e.fol.A&&(e.fol.A.dead||!e.fol.A.online))?e.fol:null;
    if(hs&&hs.live&&hs.name!=='bigpig'){t=null;e.fol=null;e.pkeep=0;}      /* PZ: he does not follow anyone into the Demolitionist's or the Frog's fight */
    if(t&&Math.hypot(t.x-e.x,t.z-e.z)>64){t=null;e.fol=null;e.pkeep=0;}
    if(!t&&!doc){const s=pmFoe(e,22);if(s){e.fol=s;t=s;e.pkeep=1;mwS('pg_thump',e.x,e.y,e.z);}}
    if(t&&!doc){const dx=t.x-e.x,dz=t.z-e.z,d=Math.hypot(dx,dz)||1;look=[t.x,t.y+1.5,t.z];
      if(e.plock>0){lock=true;e.plock-=dt;jaw=1;mx=mz=0;if(e.plock<=0){e.plock=0;e.atkT=2.5;if(d<2.6&&Math.abs(t.y-e.y)<2.4)pmYetiThrow(e,t);}}
      else if(e.atkT<=0&&d<2.0){e.plockD=1.0;pmTele(e,1.0,t);mwS('pg_thump',e.x,e.y,e.z);}
      else{mx=dx/d;mz=dz/d;}}}
  pmWalk(e,dt,mx,mz,spd,{hopV:8});if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,5);else if(mx||mz)pmTurn(e,mx,mz,dt,5);
  if(pr&&pr.armL){const up=lock?-2.9:Math.sin(e.anim||0)*0.3;pr.armL.rotation.x=up;pr.armR.rotation.x=lock?-2.9:-up;}
  if(e.sit&&pr&&pr.root){pr.root.position.y=-0.55;}else if(pr&&pr.root)pr.root.position.y=0;
  pmPost(e,dt,{look,lock,jaw,legs:!e.sit,hr:{sit:e.sit?1:0,trip:0,grab:lock?1:0,throw:e.atkT>2.2?1:0}});};
/* where the Yeti sits during the Pig's fight: beside the velvet rope at the staircase base, facing the stairs */
function pmRopeSpot(e){const z=MPC.ARENA.bigpig.z0-4,x=MPC.ARENA.bigpig.x0-3-((e.pid%2)*2);const y=pmSurfY(x,z)+1;return [x+0.5,y,z+0.5];}
function pmYetiThrow(e,t){const fx=Math.sin(e.yaw),fz=Math.cos(e.yaw);pmStrike(e,t,MOBT.pgyeti.dmg,'yeti',{force:1});
  pmThrow(t,fx*8.5,8,fz*8.5,'the Yeti','yeti',{max:2.4});mwS('pg_whoosh',e.x,e.y,e.z);if(t===P)pmHeckleSoon('thrown');}
PM_HURT.pgyeti=(e,dmg,by,how)=>{if(e.trip>0)return dmg*3;
  if(by==='Dan'&&(how==='melee'||how==null)){const hy=pmHitY(e)-e.y;if(hy<0.4){e.trip=3;e.plock=0;mwS('pg_thump',e.x,e.y,e.z);if(P&&Math.hypot(P.x-e.x,P.z-e.z)<14)mpShake(0.45,0.35);pmLog(e,'trip');return dmg;}}
  return dmg*0.3;};

/* ===================================================================== */
/* the Daredevil: sets up a cannon, climbs in, fires himself at you; misses go head-first into the floor                            */
/* ===================================================================== */
function pmDareCannon(e){if(!e.pcan){e.pcan=pmProp('cannon');pmAdd(e.pcan);PMS.ownP.add(e);}return e.pcan;}
function pmDareDrop(e){if(e.pcan){pmDel(e.pcan);e.pcan=null;}}
PREG.brain.pgdare=function(e,dt,T){if(pmPre(e,dt))return;const pr=e.pr,doc=pmDocile();e.st=e.st||'walk';let mx=0,mz=0,spd=T.spd*2.2,look=null,lock=false;
  if(e.st==='fly'){e.vy-=GRAV*dt;const hitW=moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);e.flyT+=dt;
    const t=e.ptgt;if(t&&!t.dead&&!e.flyHit&&Math.hypot(t.x-e.x,t.z-e.z)<1.0&&e.y>t.y-0.8&&e.y<t.y+1.9){e.flyHit=1;
      pmStrike(e,t,T.dmg,'dare',{force:1});const d=Math.hypot(e.vx,e.vz)||1;pmThrow(t,e.vx/d*7,9,e.vz/d*7,'the Daredevil','dare',{max:2.4});
      if(t===P)pmHeckleSoon('thrown');e.vx*=-0.2;e.vz*=-0.2;}
    if(pr&&pr.root){pr.root.rotation.x=Math.atan2(-e.vy,Math.hypot(e.vx,e.vz))+Math.PI/2;}
    if((e.onGround||hitW)&&e.flyT>0.15){const x=Math.floor(e.x),y=Math.floor(e.y-0.2),z=Math.floor(e.z);e.pkeep=0;
      if(e.flyHit){e.st='walk';if(pr&&pr.root)pr.root.rotation.x=0;}
      else{e.st='stuck';e.stuck=3;mpSay('THE DAREDEVIL','Nailed it!',2);mwS('pg_thump',e.x,e.y,e.z);pmLog(e,'stuck');
        for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const by=getBlock(x+dx,y,z+dz);if(by===B.PG_SHEET)try{mwTearSheet(x+dx,y,z+dz,'the Daredevil');}catch(err){}}}
      e.vx=e.vz=0;}
    e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;e.hrS.launch=1;return;}
  e.hrS.launch=0;
  if(e.st==='stuck'){e.stuck-=dt;if(pr&&pr.root){pr.root.rotation.x=Math.PI;pr.root.position.y=1.7;}
    if(pr&&pr.legL){pr.legL.rotation.x=Math.sin(MP.clock*20)*0.8;pr.legR.rotation.x=-Math.sin(MP.clock*20)*0.8;}
    pmWalk(e,dt,0,0,0,{hop:false});if(e.stuck<=0){e.st='walk';if(pr&&pr.root){pr.root.rotation.x=0;pr.root.position.y=0;}}
    e.mesh.position.set(e.x,e.y,e.z);e.hrS.stuck=1;return;}
  e.hrS.stuck=0;
  const t=doc?null:pmFoe(e,32);
  if(t){const dx=t.x-e.x,dz=t.z-e.z,d=Math.hypot(dx,dz)||1;look=[t.x,t.y+1.2,t.z];
    if(e.st==='setup'){lock=true;e.plock-=dt;mx=mz=0;const C=pmDareCannon(e),piv=C.userData.piv;C.position.set(e.x,e.y,e.z);C.rotation.y=Math.atan2(dx,dz);
      if(piv)piv.rotation.x=-0.5;e.mesh.visible=e.plock>1.0;
      if(((frameCount+e.pid)%4)===0)burstParticles(e.x-dx/d*0.6,e.y+0.9,e.z-dz/d*0.6,B.TORCH,1,0.2);
      if(e.plock<=0){e.plock=0;e.mesh.visible=true;e.st='fly';e.flyT=0;e.flyHit=0;e.ptgt=t;
        const miss=((e.pid*7+Math.floor(MP.clock*3))%10)<6,off=miss?2.5+((e.pid+frameCount)%3):0,ang=(frameCount%628)/100;
        const tx=t.x+(t.vx||0)*0.9+Math.sin(ang)*off,tz=t.z+(t.vz||0)*0.9+Math.cos(ang)*off,ty=t.y+0.4,v=aimLob(e.x,e.y+1.0,e.z,tx,ty,tz,1.0);
        e.y+=1.0;e.vx=v[0];e.vy=v[1];e.vz=v[2];e.yaw=Math.atan2(dx,dz);mwS('pg_boing',e.x,e.y,e.z);pmLog(e,'hit');mpShake(0.15,0.2);}}
    else if(d>16){mx=dx/d;mz=dz/d;e.st='walk';}
    else if(d<6){mx=-dx/d;mz=-dz/d;}
    else if(e.atkT<=0&&e.onGround){e.st='setup';e.atkT=4;e.plockD=1.5;pmTele(e,1.5,t);}}
  if(e.st!=='setup'&&e.pcan&&!e.stagger){pmDareDrop(e);}
  pmWalk(e,dt,mx,mz,spd);if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,8);else if(mx||mz)pmTurn(e,mx,mz,dt,6);
  pmPost(e,dt,{look,lock,jaw:lock?0.2:0.1,hr:{climb:e.st==='setup'?1:0,launch:0,stuck:0}});};
PM_HURT.pgdare=(e,dmg)=>e.st==='stuck'?dmg*2:dmg;
/* fired in from the nearest wing in an arc at `target` (the hen rule; the Frog's P2 cue) */
function pmFireDare(target){if(DIM!=='puppet'||!target)return null;const side=target.x>=0?1:-1,wx=side*90,wz=clamp(target.z,MPC.WALK.z0+4,MPC.WALK.z1-4);
  const wy=pmSurfY(wx,wz)+1.5;
  spawnMob('pgdare',wx+0.5,wy,wz+0.5);const e=entities[entities.length-1];if(!e.pi)pmInit(e);
  const T=clamp(Math.hypot(target.x-wx,target.z-wz)/26,1.2,3.2),v=aimLob(e.x,e.y,e.z,target.x,target.y+0.4,target.z,T);
  e.vx=v[0];e.vy=v[1];e.vz=v[2];e.st='fly';e.flyT=0;e.flyHit=0;e.ptgt=target;e.yaw=Math.atan2(v[0],v[2]);e.pkeep=1;mwS('pg_boing',wx,wy,wz);pmLog(e,'fired');return e;}

/* ===================================================================== */
/* the kill event: extra loot owned by the killer, Felt Dan's half-kit, the Daredevil's helmet, the frog's stolen stack, the hen rule */
/* ===================================================================== */
function pmKiller(){const w=HIT_BY;if(w==='Dan')return 'Dan';return w&&agByName(w)?w:null;}
function pmDropAt(e,st,owner){const a=e.seed+(PMS.seq++);return mpDrop(e.x,e.y+0.5,e.z,st,owner,Math.sin(a)*1.5,2.2,Math.cos(a)*1.5);}
PREG.onKill.push(function(e){if(!PM_NAMES[e.mt]||MOBT[e.mt].npc)return;const who=pmKiller();
  if(e.parmG&&e.pwd==null){e.pwd=0.7;}
  if(!e.pnodrop){for(const L of (PM_LOOT[e.mt]||[])){if(Math.random()>L[3])continue;const n=L[1]+Math.floor(Math.random()*(L[2]-L[1]+1));if(n>0)pmDropAt(e,{id:L[0],count:n},who);}
    if(e.googly)pmDropAt(e,{id:IT.PG_GOOGLIES,count:1},who);}
  if(e.carry){const c=e.carry;e.carry=null;pmDropAt(e,c,'Dan');}
  if(e.mt==='pgfeltdan'){MP.feltDan=2;const d=DEFS[IT.PG_BAT],mx=(d&&(d.tool?d.tool.dur:d.dur))||110;
    pmDropAt(e,{id:IT.PG_BAT,count:1,dur:Math.round(mx*0.4)},who);pmDropAt(e,{id:B.PG_LAMP,count:8},who);pmDropAt(e,{id:IT.PG_PIE,count:2},who);
    burstParticles(e.x,e.y+0.5,e.z,B.PG_SKIN,10,0.8);}
  if(e.mt==='pgdare'){pmDareDrop(e);if(!(MP.pm3&&MP.pm3.dare)){MP.pm3=Object.assign(MP.pm3||{},{dare:1});pmDropAt(e,{id:IT.PG_STUNT,count:1},who);}}
  if(e.mt==='pgdrummer')pmAnimalDrop(e);
  if(e.mt==='pghen'&&who)pmHenRule(who);
  if(e.pheap!=null)pmHeapGone(e.pheap);
  pmStructDied(e);});
/* a player killing 4+ hens within 3 minutes of MP.clock gets the Daredevil fired in from the nearest wing */
function pmHenRule(who){const L=PMS.henKills[who]||(PMS.henKills[who]=[]);L.push(MP.clock);while(L.length&&MP.clock-L[0]>180)L.shift();
  if(L.length>=4){L.length=0;const t=who==='Dan'?P:(agByName(who)||{}).e;if(t&&!t.dead){pmFireDare(t);pmLog({pid:0,mt:'pgdare'},'henrule');}}}
