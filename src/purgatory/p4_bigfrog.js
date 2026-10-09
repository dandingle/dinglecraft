/* ---- PART 55: p4_bigfrog.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p4_bigfrog.js (P4): THE FROG, "THE BACK SWAMP" (bible 10.3). 360 HP.
   The Tongue (all phases): a 0.7 s pink aim line, then THWIP at 30 m/s, range 22; it sticks to the first thing it touches.
     A player: reeled in at 13 m/s (3 hits on the tip, any Shears, or a Chop frees him); reach the mouth: SWALLOWED.
     A block or a pad: stuck 1.5 s (hits on the tongue x3); two staples PIN it for 6 s (x1.5). Felt Flies pull it. Self-demo:
     his first tongue of every attempt goes at a wild fly over an inner-ring pad and sticks there.
   SWALLOWED (P1/P2): Inside the Frog, 12 s, the Hand's fingers (12 a hit, the Gauntlet 18), 4 hits or 12 s and he spits you
     12 m (4 hits also stun him 3 s); he heals 15 per swallow.
   P1 THE MANAGEMENT: seated; tongue every 4 s; a croak every 8 s sends a ripple through the sheet.
   P2 STANDBY... GO: a cue every 6 s (sandbags, Traveler GO, Cue the Daredevil, blackout); the Flail once at 162.
   P3 THE ARM: up on the arm; tongue slam, arm sweep, deflating pads, tongue drag, Hands in the hollow; hit the ELBOW in the
     Bog Hollow (x2, the Gauntlet x3; every hit drops him 2 m); direct hits x0.25. Death: the hand slides out. Then the Strike.
   --------------------------------------------------------------------------------------------------------------------- */

var HN_K2={tg:null,cueT:6,cueI:0,strumT:8,ripple:null,bags:[],wall:null,dare:null,flail:null,flailDone:false,swal:null,botSwal:[],
  elbow:null,sweep:null,slamT:6,dragT:9,padT:{},deflated:{},hands:[],fly:null,arm:null,dark:0,tongueT:2.5,riseT:0,yBase:51,drops:0,regrow:0};
function hnKReset(){Object.assign(HN_K2,{tg:null,cueT:6,cueI:0,strumT:8,ripple:null,bags:[],wall:null,dare:null,flail:null,swal:null,botSwal:[],
  elbow:null,sweep:null,slamT:6,dragT:9,padT:{},deflated:{},fly:null,dark:0,tongueT:2.5,riseT:0,yBase:51,drops:0,regrow:0});
  if(HN.danK&&HN.danK.by==='the Frog')HN.danK=null;}
PREG.onReset.push(()=>{hnKReset();HN_K2.flailDone=false;});PREG.onLoad.push(()=>{hnKReset();HN_K2.flailDone=false;});PREG.onExit.push(hnKReset);

/* ---- clearing helpers ---- */
function hnKC(){const A=hnA();return [A.kc[0]+0.5,A.ky+1,A.kc[1]+0.5];}
function hnKMouth(e){return [e.x+Math.sin(e.yaw)*0.35,e.y+1.15,e.z+Math.cos(e.yaw)*0.35];}
function hnKOnSheet(t){const x=Math.floor(t.x),z=Math.floor(t.z),y=Math.floor((t===P?P.y:t.y)-0.05);const id=getBlock(x,y,z);return id===B.PG_SHEET&&hnInClear(x,z);}
function hnKInHollow(t){const y=(t===P?P.y:t.y);const A=hnA();return hnInClear(Math.floor(t.x),Math.floor(t.z),24)&&y<A.ky-0.2&&y>A.kfloor;}
function hnKTear(x,z,who){const A=hnA();for(const y of [A.ky,A.ky-1]){if(getBlock(x,y,z)===B.PG_SHEET){
    if(typeof mwTearSheet==='function'&&mwTearSheet(x,y,z,who||'the Frog'))return true;const pa=ACTOR;ACTOR=null;try{setBlock(x,y,z,B.AIR);}finally{ACTOR=pa;}return true;}}return false;}
function hnKFoes(){return hnPFoes();}
function hnKPad(x,z){return hnA().padSet.get(Math.floor(x)+','+Math.floor(z))||null;}

/* =====================================================================================================================
   the tongue
   ===================================================================================================================== */
function hnKTongueStart(e,F,target,opt){opt=opt||{};const mouth=hnKMouth(e);let aim;
  if(opt.at)aim=opt.at.slice();
  else if(target){const tb=hnFoeBody(target),ty=(target===P?P.y:tb.y)+0.9;aim=[tb.x+(tb.vx||0)*0.25,ty,tb.z+(tb.vz||0)*0.25];}
  else{const a=MPF.tick*0.37;aim=[e.x+Math.sin(a)*14,hnA().ky+1,e.z+Math.cos(a)*14];}
  /* a Felt Fly within 12 m pulls the next shot (P2's pgfly prop) */
  if(!opt.at&&!opt.slam){let fly=null,fd=12;for(const m of entities)if(!m.dead&&m.t==='mob'&&m.mt==='pgfly'){const d=Math.hypot(m.x-e.x,m.z-e.z);if(d<fd){fd=d;fly=m;}}
    if(fly){aim=[fly.x,fly.y,fly.z];target=null;opt.fly=fly;}}
  const T={st:'aim',t:0,aimT:opt.slam?1.0:0.7,aim,from:mouth,tip:mouth.slice(),len:0,dir:null,target:null,tgName:target?hnFoeName(target):null,staples:0,hits:0,prop:null,
    fly:opt.fly||null,demo:!!opt.demo,slam:!!opt.slam,drag:!!opt.drag,blind:hnBlind(e),line:null};
  if(!T.blind)T.line=hnAimLine(()=>hnKMouth(e),()=>T.aim,T.aimT,0.07);
  HN_K2.tg=T;e.hrS.tongue=0.2;mwS('pg_gulp',e.x,e.y,e.z);if(F)hnLog(F,'tongueAim',{demo:T.demo,slam:T.slam,drag:T.drag});return T;}
function hnKTipProp(T){if(T.prop&&!T.prop.dead)return T.prop;spawnMob('pgtip',T.tip[0],T.tip[1],T.tip[2]);const p=entities[entities.length-1];
  Object.assign(p,{kind:'tip',pkeep:1,hnArena:'bigfrog'});p.relay=(d,by)=>hnKTipHit(T,d,by);T.prop=p;return p;}
function hnKTipHit(T,d,by){const e=hnAlive('bigfrog'),F=e&&e.hf;if(!e||!F||F.over)return;const how=HIT_HOW||'';
  const sever=hnShears(by,0)||/hi.?yah|chop|shock/i.test(how);
  if(T.st==='reel'){if(sever){hnKSever(e,F,by);return;}T.hits++;mwS('pg_squeak',T.tip[0],T.tip[1],T.tip[2]);if(T.hits>=3){hnKRelease(T);T.st='back';hnLog(F,'freed',{by});}return;}
  if(T.st==='stuck'||T.st==='pinned'){
    if(/staple/i.test(how)){T.staples++;mwS('pg_thwip',T.tip[0],T.tip[1],T.tip[2]);
      if(T.staples>=2&&T.st==='stuck'){T.st='pinned';T.t=0;hnWin(F,6,'pinned');e.st='strain';hnSay('Mmmmrrrph!',1.6,'pinned');hnLog(F,'pinned',{by});}return;}
    if(sever){hnKSever(e,F,by);return;}
    hnHit(e,d*3,by,'tongue');}}
function hnKSever(e,F,by){const T=HN_K2.tg;if(T){hnKRelease(T);if(T.prop&&!T.prop.dead)removeEnt(T.prop);HN_K2.tg=null;}
  HN_K2.regrow=6;e.st='stun';e.stT=0;e.stunT=2.5;hnWin(F,2.6,'severed');hnSay('YEEOWWW!',1.6);mwS('pg_rip',e.x,e.y,e.z);hnLog(F,'severed',{by});}
function hnKRelease(T){if(T.target===P){if(HN.danK&&HN.danK.by==='the Frog')HN.danK=null;}else if(T.target&&T.target.A&&T.target.A.pgrab)T.target.A.pgrab.until=0;T.target=null;}
function hnKTongueTick(e,F,dt){const T=HN_K2.tg;if(!T)return;T.t+=dt;const A=hnA(),mouth=hnKMouth(e);
  switch(T.st){
    case 'aim':e.hrS.tongue=0.2+0.3*(T.t/T.aimT);if(T.t>=T.aimT){T.st='out';T.t=0;const dx=T.aim[0]-mouth[0],dy=T.aim[1]-mouth[1],dz=T.aim[2]-mouth[2],l=Math.hypot(dx,dy,dz)||1;
        T.dir=[dx/l,dy/l,dz/l];T.max=T.slam?Math.min(26,l+1):22;mwS('pg_thwip',mouth[0],mouth[1],mouth[2]);}break;
    case 'out':{T.len+=30*dt;T.tip=[mouth[0]+T.dir[0]*T.len,mouth[1]+T.dir[1]*T.len,mouth[2]+T.dir[2]*T.len];hnKTipProp(T);
      if(T.slam){const id=getBlock(Math.floor(T.tip[0]),Math.floor(T.tip[1]),Math.floor(T.tip[2]));
        if((id&&DEFS[id]&&DEFS[id].solid!==false)||T.len>=T.max){hnKSlamLine(e,F,T);T.st='back';}break;}
      /* the first thing it touches: a player, a fly, a block or a pad */
      for(const t of hnKFoes()){const tb=hnFoeBody(t),ty=(t===P?P.y:tb.y);if(Math.abs(tb.x-T.tip[0])<0.7&&Math.abs(tb.z-T.tip[2])<0.7&&T.tip[1]>ty-0.3&&T.tip[1]<ty+2.1){
          T.target=t;T.st=T.drag?'drag':'reel';T.t=0;hnKGrab(e,F,T,t);return;}}
      if(T.fly&&!T.fly.dead&&Math.hypot(T.fly.x-T.tip[0],T.fly.z-T.tip[2])<0.8&&Math.abs(T.fly.y-T.tip[1])<1){removeEnt(T.fly);T.fly=null;}
      const id=getBlock(Math.floor(T.tip[0]),Math.floor(T.tip[1]),Math.floor(T.tip[2]));
      if(id&&DEFS[id]&&DEFS[id].solid!==false){T.st='stuck';T.t=0;if(T.fly&&!T.fly.dead){removeEnt(T.fly);T.fly=null;}   /* the fly it went for is gone: one fly baits one shot */
        /* stuck to the TOP of what it hit (a pad, the sheet, a block), so the tip sits where you can hit it */
        {const bx=Math.floor(T.tip[0]),bz=Math.floor(T.tip[2]);let by=Math.floor(T.tip[1]);for(let k=0;k<3&&getBlock(bx,by+1,bz)&&DEFS[getBlock(bx,by+1,bz)].solid!==false;k++)by++;
          T.tip=[T.tip[0],by+1.04,T.tip[2]];const dx=T.tip[0]-mouth[0],dy=T.tip[1]-mouth[1],dz=T.tip[2]-mouth[2];T.len=Math.hypot(dx,dy,dz);T.dir=[dx/T.len,dy/T.len,dz/T.len];}hnWin(F,1.6,T.demo?'demo':'stuck');e.st='tug';e.stT=0;mwS('pg_squeak',T.tip[0],T.tip[1],T.tip[2]);
        hnLog(F,T.demo?'selfDemo':'stuck',{});break;}
      if(T.len>=T.max){T.st='back';if(T.fly&&!T.fly.dead){removeEnt(T.fly);T.fly=null;}}break;}
    case 'stuck':e.hrS.strain=0.6;if(T.t>=1.5){T.st='back';e.st=F.phase>=3?'arm':'seat';e.stT=0;}break;
    case 'pinned':e.hrS.strain=1;if(T.t>=6){T.st='back';e.st='stun';e.stT=0;e.stunT=1;mwS('pg_rip',T.tip[0],T.tip[1],T.tip[2]);hnSay('Hhhhrrp!',1,'rip');}break;
    case 'reel':{const t=T.target;if(!t||(t===P&&P.dead)||(t!==P&&t.dead)){T.st='back';break;}
      /* PZ: the pull on Dan gave up (4 s, e.g. he is under the felt sheet and cannot be dragged through it): the tongue goes back
         instead of staying out forever (that left the Frog with a tongue in 'reel' and no attack at all: a soft-lock) */
      if(t===P&&T.t>0.5&&!(HN.danK&&HN.danK.mode==='reel')){T.st='back';hnLog(F,'reelLost',{});break;}
      const tb=hnFoeBody(t);T.tip=[tb.x,(t===P?P.y:tb.y)+1,tb.z];hnKTipProp(T);
      if(t!==P&&tb.A&&(!tb.A.pgrab||tb.A.pgrab.until<=MP.clock)){T.st='back';break;}
      const d=Math.hypot(tb.x-mouth[0],(t===P?P.y+0.9:tb.y+0.9)-mouth[1],tb.z-mouth[2]);
      if(d<1.4){if(F.phase<=2)hnKSwallow(e,F,t);else{T.st='back';}}
      break;}
    case 'drag':{const t=T.target;if(!t){T.st='back';break;}if(T.t>=1.1){T.st='back';hnKRelease(T);
        const tb=hnFoeBody(t);let sx=tb.x,sz=tb.z;for(let r=1;r<6;r++){const a=r*1.3,x=Math.floor(tb.x+Math.sin(a)*r),z=Math.floor(tb.z+Math.cos(a)*r);
          const id=getBlock(x,A.ky,z);if(id===B.PG_SHEET||id===B.PG_LILY||id===B.PG_SWAMP||id===B.PG_STUFFING){sx=x+0.5;sz=z+0.5;break;}}
        if(t===P){P.x=sx;P.z=sz;P.y=A.ky+1.05;P.vy=0;}else{tb.x=sx;tb.z=sz;tb.y=A.ky+1.05;}
        purgHit(t,6,'the Frog','drag',{force:1});mwS('pg_thump',sx,A.ky+1,sz);hnLog(F,'dragSlap',{who:hnFoeName(t)});}
      else{const tb=hnFoeBody(t);const y0=T.dragY0==null?(T.dragY0=(t===P?P.y:tb.y)):T.dragY0;const ny=Math.min(y0+4,y0+T.t*5);
        if(t===P){P.y=ny;P.vy=0;P.fallD=0;}else{tb.y=ny;tb.vy=0;}T.tip=[tb.x,ny+1,tb.z];hnKTipProp(T);}break;}
    case 'back':T.len=Math.max(0,T.len-45*dt);if(T.dir)T.tip=[mouth[0]+T.dir[0]*T.len,mouth[1]+T.dir[1]*T.len,mouth[2]+T.dir[2]*T.len];
      if(T.prop&&!T.prop.dead){T.prop.x=T.tip[0];T.prop.y=T.tip[1];T.prop.z=T.tip[2];}
      if(T.len<=0.1){if(T.prop&&!T.prop.dead)removeEnt(T.prop);HN_K2.tg=null;e.hrS.tongue=0;e.hrS.strain=0;if(e.st==='tug'||e.st==='strain')e.st=F.phase>=3?'arm':'seat';}break;}
  if(T.prop&&!T.prop.dead&&T.st!=='back'){T.prop.x=T.tip[0];T.prop.y=(T.st==='stuck'||T.st==='pinned')?T.tip[1]:T.tip[1]-0.12;T.prop.z=T.tip[2];}
  e.hrS.tongue=T.st==='aim'?e.hrS.tongue:Math.min(1,T.len/22);e.hrS.tlen=T.len;}
function hnKGrab(e,F,T,t){mwS('pg_thwip',T.tip[0],T.tip[1],T.tip[2]);hnLog(F,T.drag?'dragGrab':'reel',{who:hnFoeName(t)});
  if(T.drag)return;
  if(t===P){hnDanK('reel',{by:'the Frog',spd:13,arrive:0.6,max:4,to:()=>{const m=hnKMouth(e);return [m[0],m[1]-0.9,m[2]];},onEnd:()=>{}});}
  else{const m=hnKMouth(e);hnGrabBot(t,'reel',{by:'the Frog',src:e,x:m[0],y:m[1]-0.9,z:m[2],spd:13,dur:4});}}
/* the tongue slam (P3): an aim line down to a target, then a slam along the floor line for 8 */
function hnKSlamLine(e,F,T){const a=hnKMouth(e),b=T.tip;const n=12;
  for(let i=0;i<=n;i++){const u=i/n,x=a[0]+(b[0]-a[0])*u,z=a[2]+(b[2]-a[2])*u;if(i%3===0)hnPuff(x,hnA().ky+1.1,z,0.5,0.5,0.4);}
  for(const t of hnKFoes()){const tb=hnFoeBody(t),dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz)||1,rx=tb.x-a[0],rz=tb.z-a[2],along=(rx*dx+rz*dz)/l,side=Math.abs(rx*dz-rz*dx)/l;
    if(along>0&&along<l+1&&side<1.1&&(t===P?P.y:tb.y)>=hnA().ky-0.5)purgHit(t,8,'the Frog','slam',{force:1,kx:-dz,kz:dx});}
  mpShake(0.35,0.3);mwS('pg_thump',b[0],b[1],b[2]);hnLog(F,'slam',{});}

/* =====================================================================================================================
   SWALLOWED: Inside the Frog (bible 10.3)
   ===================================================================================================================== */
function hnKSwallow(e,F,t){const T=HN_K2.tg;if(T){if(T.prop&&!T.prop.dead)removeEnt(T.prop);HN_K2.tg=null;}
  const R=hnA().room,top=hnPhaseTop(F);e.hp=Math.min(top,e.hp+15);e.pfloor=null;mwS('pg_gulp',e.x,e.y,e.z);
  if(t===P){HN.danK=null;MP.stats.swallowed=(MP.stats.swallowed|0)+1;
    P.x=(R.x0+R.x1)/2+0.5;P.y=R.y0+0.05;P.z=R.z0+1.5;P.yaw=Math.PI;P.pitch=0.25;P.vx=P.vy=P.vz=0;P.fallD=0;
    HN_K2.swal={t:0,hits:0};hnWin(F,12.5,'swallow');hnKFingers(true);e.st='gulp';e.stT=0;
    if(typeof pmHeckle==='function')try{pmHeckle('swallowed',{who:'Dan'});}catch(err){}
    hnLog(F,'swallowed',{});}
  else if(t.A){const r=[(R.x0+R.x1)/2+0.5,R.y0+0.05,R.z0+2.5];hnGrabBot(t,'swallowed',{by:'the Frog',src:e,x:r[0],y:r[1],z:r[2],dur:6,
      onEnd:()=>hnKSpitBot(t)});t.x=r[0];t.y=r[1];t.z=r[2];HN_K2.botSwal.push({b:t,until:MP.clock+6});hnLog(F,'botSwallowed',{bot:t.A.name});}}
function hnKFingers(on){const R=hnA().room;const L=HN.props.bigfrog;for(const p of L)if(!p.dead&&p.kind==='finger')removeEnt(p);HN.props.bigfrog=L.filter(p=>!p.dead);
  if(!on)return;for(let i=0;i<4;i++){spawnMob('pgfinger',R.x0+1.7+i*1.2,R.y0+1.4,R.z1+0.4);const p=entities[entities.length-1];
    Object.assign(p,{kind:'finger',fi:i,pkeep:1,hnArena:'bigfrog',yaw:Math.PI,z0:R.z1+0.4});p.relay=(d,by)=>hnKFingerHit(p,d,by);HN.props.bigfrog.push(p);}}
function hnKFingerHit(p,d,by){const e=hnAlive('bigfrog'),F=e&&e.hf,S=HN_K2.swal;if(!F||!S||by!=='Dan')return;
  if((p.hitT||0)>MP.clock)return;p.hitT=MP.clock+0.28;S.hits++;
  const dmg=hnHolding(IT.PG_GAUNTLET)?18:12;hnHit(e,dmg,by,'finger');p.flinch=0.3;mwS('pg_squeak',p.x,p.y,p.z);hnLog(F,'finger',{n:S.hits});
  if(S.hits>=4)hnKSpit(e,F,true);}
function hnKSpit(e,F,stun){const S=HN_K2.swal;HN_K2.swal=null;hnKFingers(false);if(!P||P.dead)return;
  const m=hnKMouth(e),A=hnA(),a=(MPF.tick%6)*1.05+Math.PI*0.75,tx=A.kc[0]+0.5+Math.sin(a)*12,tz=A.kc[1]+0.5+Math.cos(a)*12;
  P.x=m[0];P.y=m[1]-0.9;P.z=m[2];const v=aimLob(P.x,P.y,P.z,tx,A.ky+1.1,tz,1.0);
  hnDanK('fly',{by:'the Frog',how:'swallow',vx:v[0],vy:v[1],vz:v[2],cap:5});mwS('pg_whoosh',m[0],m[1],m[2]);hnWinEnd(F);
  if(stun){e.st='stun';e.stT=0;e.stunT=3;hnWin(F,3.1,'spitStun');hnSay('BLEAAAGH!',1.4);}else e.st='seat';
  hnLog(F,'spit',{stun:!!stun});}
function hnKSpitBot(b){const e=hnAlive('bigfrog');if(!e||!b||!b.A)return;const m=hnKMouth(e),A=hnA(),a=MPF.tick*0.71,tx=A.kc[0]+0.5+Math.sin(a)*12,tz=A.kc[1]+0.5+Math.cos(a)*12;
  const v=aimLob(m[0],m[1],m[2],tx,A.ky+1.1,tz,1.0);hnGrabBot(b,'thrown',{by:'the Frog',src:e,x:m[0],y:m[1],z:m[2],vx:v[0],vy:v[1],vz:v[2],dur:2});}
PREG.mesh.pgfinger=function(G,mats){const sk=hnMat(0xe8b9a0),nail=hnMat(0xd8c8b0);hnB(G,0.7,1.6,0.7,sk,0,0.8,0);hnB(G,0.5,0.3,0.12,nail,0,1.45,-0.36);
  hnB(G,0.76,0.12,0.76,hnMat(0xc99a84),0,0.9,0);const legs=[];return {G,legs,mats};};
PREG.brain.pgfinger=function(e,dt){e.vx=e.vy=e.vz=0;const S=HN_K2.swal;if(S){const u=Math.min(1,S.t/12);e.z=e.z0-u*3.2;const s=e.hrS||(e.hrS={});s.grip=u;s.recoil=e.flinch>0?1:0;}
  if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.x=(e.flinch>0?0.4:0)-0.2*Math.sin(MP.clock*2+e.fi);e.flinch=Math.max(0,(e.flinch||0)-dt);}};
PREG.mesh.pgtip=function(G,mats){hnB(G,0.34,0.22,0.34,hnMat(0xe8608a),0,0.11,0);hnB(G,0.4,0.08,0.4,hnMat(0xb03060),0,0.02,0);return {G,legs:[],mats};};
PREG.brain.pgtip=function(e,dt){e.vx=e.vy=e.vz=0;if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);};

/* =====================================================================================================================
   the stage manager's cues (P2), the croak (P1: hnKStrum, the old name), the Flail
   ===================================================================================================================== */
function hnKStrum(e,F){HN_K2.ripple={r:0,hit:new Set()};mwS('pg_strum',e.x,e.y,e.z);e.hrS.strum=1;
  const f=hnFx('ring',{dur:2.2},ff=>{const R=HN_K2.ripple;if(!R){ff.m.visible=false;return false;}const C=hnKC();ff.m.position.set(C[0],hnA().ky+1.05,C[2]);const s=Math.max(0.1,R.r);ff.m.scale.set(s,s,s);});}
function hnKRippleTick(e,F,dt){const R=HN_K2.ripple;if(!R)return;R.r+=12*dt;const C=hnKC(),A=hnA();
  for(const t of hnKFoes()){const tb=hnFoeBody(t),d=Math.hypot(tb.x-C[0],tb.z-C[2]),k=hnFoeName(t);if(R.hit.has(k)||Math.abs(d-R.r)>0.9)continue;
    if(hnKOnSheet(t)){R.hit.add(k);purgHit(t,4,'the Frog','strum',{force:1});hnPush(t,0,7,0);}}
  /* already-sagged cells the ring crosses tear (a sagged cell: sheet one block down, air where the sheet was) */
  const r0=Math.max(0,R.r-0.6),r1=R.r+0.6;
  if(MPF.tick%2===0)for(let a=0;a<Math.PI*2;a+=0.35/Math.max(1,R.r)){const x=Math.floor(C[0]+Math.sin(a)*R.r),z=Math.floor(C[2]+Math.cos(a)*R.r);
    if(getBlock(x,A.ky,z)===B.AIR&&getBlock(x,A.ky-1,z)===B.PG_SHEET)hnKTear(x,z,'the Frog');}
  if(R.r>A.kr+1)HN_K2.ripple=null;}
var HN_KCUES=['sandbags','traveler','dare','blackout'];
function hnKCue(e,F){const k=HN_KCUES[HN_K2.cueI%4];HN_K2.cueI++;hnLog(F,'cue',{k});e.hrS.cue=1;
  if(k==='sandbags'){hnSay('Standby sandbags... sandbags GO.',2.2,'cue');const A=hnA(),C=hnKC();HN_K2.bags=[];const tg=hnKFoes();
    for(let i=0;i<4;i++){const t=tg[i%Math.max(1,tg.length)];let x,z;if(t&&i<tg.length){const tb=hnFoeBody(t);x=tb.x+(i?1.5:0);z=tb.z+(i>1?-1.5:0);}
      else{const a=i*1.57+MPF.tick*0.1;x=C[0]+Math.sin(a)*9;z=C[2]+Math.cos(a)*9;}
      if(!hnInClear(Math.floor(x),Math.floor(z),23))continue;const b={x:Math.floor(x)+0.5,z:Math.floor(z)+0.5,t:0};HN_K2.bags.push(b);hnShadow(b.x,A.ky+1,b.z,0.4,1.0,1.2);}}
  else if(k==='traveler'){hnSay('Traveler GO.',1.6,'cue');const A=hnA(),C=hnKC(),dir=(HN_K2.cueI%2)?1:-1;
    const split=C[2]-8+((MPF.tick*7)%16);HN_K2.wall={x:C[0]-dir*26,dir,split,hit:new Set(),t:0};mwS('pg_swish',C[0],A.ky+2,C[2]);}
  else if(k==='dare'){hnSay('Cue the Daredevil.',1.6,'cue');const t=hnPTarget(e,30);const tb=t?hnFoeBody(t):{x:hnKC()[0]+6,z:hnKC()[2]-6};
    const land=[tb.x,hnA().ky+1,tb.z],from=[hnKC()[0]-34,hnA().ky+9,tb.z];HN_K2.dare={from,land,t:0,warn:1.5,fly:0.9,done:false,tgt:t};
    hnAimLine(from,land,1.5,0.12);hnRing(land[0],hnA().ky+1,land[2],1.5,1.5);}
  else if(k==='blackout'){hnSay('Lights... blackout GO.',1.8,'cue');HN_K2.dark=5;if(typeof mwGridFx==='function')mwGridFx('dark',5);HN_K2.darkShots=2;HN_K2.darkT=0.8;}}
function hnKCueTick(e,F,dt){const A=hnA(),C=hnKC();
  /* sandbags: 1.2 s after their shadows, 5 each; they stay as Stuffing Drift footholds until the fight resets */
  for(const b of HN_K2.bags){if(b.done)continue;b.t+=dt;if(b.t>=1.2){b.done=1;const x=Math.floor(b.x),z=Math.floor(b.z);
      for(const t of hnKFoes()){const tb=hnFoeBody(t);if(Math.hypot(tb.x-b.x,tb.z-b.z)<1.05)purgHit(t,5,'the Frog','sandbag',{force:1});}
      const pa=ACTOR;ACTOR=null;try{setBlock(x,A.ky,z,B.PG_STUFFING);}finally{ACTOR=pa;}burstParticles(b.x,A.ky+1.2,b.z,B.PG_STUFFING,10,0.6);mwS('pg_sandbag',b.x,A.ky+1,b.z);}}
  if(HN_K2.bags.length&&HN_K2.bags.every(b=>b.done))HN_K2.bags=[];
  /* the Traveler wall: sweeps at 6 m/s with one 3-wide split; shoves you along to the rim (3) */
  const W=HN_K2.wall;if(W){W.t+=dt;W.x+=W.dir*6*dt;
    for(const t of hnKFoes()){const tb=hnFoeBody(t),ahead=W.dir*(tb.x-W.x);
      if(ahead>-0.25&&ahead<0.8&&Math.abs(tb.z-W.split)>1.5&&hnInClear(Math.floor(tb.x),Math.floor(tb.z),22.5)){
        const k=hnFoeName(t);if(!W.hit.has(k)){W.hit.add(k);purgHit(t,3,'the Frog','traveler',{force:1});}
        /* shoved ahead of the curtain WITH collision (moveBody): a rim, the log or a pad stem stops you and the curtain
           passes through you instead; never shoved past the edge of the clearing (r 22.5) */
        const nx=W.x+W.dir*0.85,body=t===P?P:tb,dx=nx-body.x;if(W.dir*dx>0)moveBody(body,dx,0,0,false);}}
    if(Math.abs(W.x-C[0])>27)HN_K2.wall=null;}
  /* the Daredevil: a red arc for 1.5 s, then he is fired in face-first: 6 within 1.5 m and a 3x3 tear */
  const G=HN_K2.dare;if(G){G.t+=dt;
    if(G.t>=G.warn&&!G.fired){G.fired=1;if(typeof pmFireDare==='function'){try{G.ent=pmFireDare(G.tgt||null);}catch(err){G.ent=null;}}
      if(!G.ent)G.fx=hnFx('puff',{dur:G.fly+0.1},f=>{const u=Math.min(1,f.t/G.fly);f.m.position.set(G.from[0]+(G.land[0]-G.from[0])*u,G.from[1]+(G.land[1]-G.from[1])*u+Math.sin(u*Math.PI)*4,G.from[2]+(G.land[2]-G.from[2])*u);
        f.m.scale.set(0.6,0.9,0.6);if(f.m.material&&f.m.material.color&&f.m.material.color.setHex)f.m.material.color.setHex(0x3f6fb5);});}
    if(G.fired&&!G.ent&&G.t>=G.warn+G.fly&&!G.done){G.done=1;for(const t of hnKFoes()){const tb=hnFoeBody(t);if(Math.hypot(tb.x-G.land[0],tb.z-G.land[2])<1.5)purgHit(t,6,'the Frog','dare',{force:1});}
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)hnKTear(Math.floor(G.land[0])+dx,Math.floor(G.land[2])+dz,'the Daredevil');
      mpShake(0.4,0.3);hnSay("I'm okaaay!",1.6,'dare');mwS('pg_thump',G.land[0],G.land[1],G.land[2]);}
    if(G.t>G.warn+G.fly+3)HN_K2.dare=null;}
  /* blackout: 5 s of dark, two quick tongue shots with only his eyes and the aim lines */
  if(HN_K2.dark>0){HN_K2.dark-=dt;HN_K2.darkT-=dt;if(HN_K2.darkT<=0&&HN_K2.darkShots>0&&!HN_K2.tg&&HN_K2.regrow<=0){HN_K2.darkT=2;HN_K2.darkShots--;const t=hnPTarget(e,24);if(t)hnKTongueStart(e,F,t);}}}
/* THE FLAIL (once, at 162): a pink skid line, 5 s of pinwheeling (5 and a knockback within 2.5 m, every sheet cell torn), the trip */
function hnKFlailStart(e,F){const t=hnPTarget(e,30),tb=t?hnFoeBody(t):{x:e.x+5,z:e.z-5},dx=tb.x-e.x,dz=tb.z-e.z,l=Math.hypot(dx,dz)||1;
  HN_K2.flail={dir:[dx/l,dz/l],t:0,hit:{}};HN_K2.flailDone=true;e.st='flailTell';e.stT=0;hnLog(F,'flail',{});
  hnAimLine(()=>[e.x,hnA().ky+1.05,e.z],()=>[e.x+HN_K2.flail.dir[0]*16,hnA().ky+1.05,e.z+HN_K2.flail.dir[1]*16],1.0,0.4);}

/* =====================================================================================================================
   the arm (P3): the hole, the rise, the elbow in the Bog Hollow, the sweep, deflating pads, Hands
   ===================================================================================================================== */
function hnKHoleCells(){const o=[];for(let dx=-2;dx<=2;dx++)for(let dz=0;dz<=4;dz++)o.push([dx,219+dz]);return o;}
function hnKElbowSpots(){const C=hnKC();return [0,1,2,3,4,5].map(i=>{const a=i*1.047+0.5;return [C[0]+Math.sin(a)*9,hnA().kfloor+1.05,C[2]+Math.cos(a)*9];});}
function hnKArmStart(e,F){const A=hnA();for(const [x,z] of hnKHoleCells())hnKTear(x,z,'the Frog');
  HN_K2.riseT=0;e.st='rise';e.stT=0;HN_K2.drops=0;
  const sp=hnKElbowSpots();HN_K2.elbow={i:0,pos:sp[0].slice(),to:sp[0].slice(),swingT:0,bumped:{}};
  spawnMob('pgelbow',sp[0][0],sp[0][1],sp[0][2]);const el=entities[entities.length-1];Object.assign(el,{kind:'elbow',pkeep:1,hnArena:'bigfrog'});
  el.relay=(d,by)=>hnKElbowHit(el,d,by);HN.props.bigfrog.push(el);HN_K2.elbowE=el;
  hnSay('...',1.4);mwS('pg_rip',0.5,A.ky,221);mpShake(0.7,1.0);hnLog(F,'armRises',{});}
function hnKElbowHit(el,d,by){const e=hnAlive('bigfrog'),F=e&&e.hf;if(!F||F.over||F.phase<3||F.dying)return;if((el.hitT||0)>MP.clock)return;el.hitT=MP.clock+0.25;
  const g=hnHeldDef(by);const gaunt=!!(g&&g.st.id===IT.PG_GAUNTLET);const how=HIT_HOW||'';
  const mul=gaunt?3:2;if(!F.win||MP.clock>=F.win.until)hnWin(F,1.6,'elbow');            /* the arm jerks: a 1.5 s state, so a window */
  hnHit(e,d*mul,by,/blast|charge|plunger/.test(how)?'elbow-blast':'elbow');
  if(by==='Dan')mpTickOff('elbow');
  HN_K2.drops++;e.hrS.recoil=1;mwS('pg_creak',el.x,el.y,el.z);
  /* the arm jerks: the elbow swings to the far side of the hollow for 1.5 s */
  const sp=hnKElbowSpots(),E=HN_K2.elbow;E.i=(E.i+3)%sp.length;E.to=sp[E.i].slice();E.swingT=1.5;E.from=[el.x,el.y,el.z];E.bumped={};
  hnLog(F,'elbowHit',{by,gaunt});}
PREG.mesh.pgelbow=function(G,mats){const sk=hnMat(0xe8b9a0),dk=hnMat(0xc99a84),h=hnMat(0x3a2a1a);hnB(G,1.6,1.4,1.6,sk,0,0.7,0);hnB(G,1.2,0.3,1.2,dk,0,1.3,0);
  for(let i=0;i<6;i++)hnB(G,0.05,0.25,0.05,h,-0.6+i*0.24,1.45,0.3*Math.sin(i));return {G,legs:[],mats};};
PREG.brain.pgelbow=function(e,dt){e.vx=e.vy=e.vz=0;const E=HN_K2.elbow;if(!E){if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);return;}
  if(E.swingT>0){E.swingT=Math.max(0,E.swingT-dt);const u=1-E.swingT/1.5,f=E.from||E.to;e.x=f[0]+(E.to[0]-f[0])*u;e.z=f[2]+(E.to[2]-f[2])*u;e.y=E.to[1];
    for(const t of hnKFoes()){const tb=hnFoeBody(t),k=hnFoeName(t);if(E.bumped[k])continue;if(Math.hypot(tb.x-e.x,tb.z-e.z)<1.6&&Math.abs((t===P?P.y:tb.y)-e.y)<2){E.bumped[k]=1;purgHit(t,4,'the Frog','bump',{force:1,src:e});hnPush(t,(tb.x-e.x)*3,4,(tb.z-e.z)*3);}}}
  else{e.x=E.to[0];e.y=E.to[1];e.z=E.to[2];}
  {const s=e.hrS||(e.hrS={});s.recoil=E.swingT>0?E.swingT/1.5:0;s.sweep=E.swingT>0?1:0;}
  if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);};
function hnKSweepStart(e,F){const a0=(MPF.tick%7)*0.9;HN_K2.sweep={a0,a:a0-1.2,t:0,hit:{},sh:null};hnLog(F,'sweep',{});
  HN_K2.sweep.sh=hnFx('shadow',{dur:3.4},f=>{const S=HN_K2.sweep;if(!S)return false;const C=hnKC(),ah=S.a+1.2*(1.2/2.2),r=10;
    f.m.position.set(C[0]+Math.sin(ah)*r,hnA().ky+1.05,C[2]+Math.cos(ah)*r);f.m.scale.set(4,4,4);});}
function hnKSweepTick(e,F,dt){const S=HN_K2.sweep;if(!S)return;S.t+=dt;if(S.t<1.2)return;const u=Math.min(1,(S.t-1.2)/2.2);S.a=S.a0-1.2+u*2.4;
  const C=hnKC(),A=hnA(),dx=Math.sin(S.a),dz=Math.cos(S.a);
  for(let r=2;r<=24;r+=1){const x=Math.floor(C[0]+dx*r),z=Math.floor(C[2]+dz*r);hnKTear(x,z,'the Frog');}
  for(const t of hnKFoes()){const tb=hnFoeBody(t),rx=tb.x-C[0],rz=tb.z-C[2],along=rx*dx+rz*dz,side=Math.abs(rx*dz-rz*dx),k=hnFoeName(t);
    if(S.hit[k]||along<1||along>25||side>1.4||(t===P?P.y:tb.y)<A.ky-0.5)continue;S.hit[k]=1;purgHit(t,6,'the Frog','sweep',{force:1,kx:dz,kz:-dx});hnPush(t,dz*10,6,-dx*10);}
  if(u>=1)HN_K2.sweep=null;}
function hnKPadsTick(e,F,dt){if(!P||P.dead)return;const A=hnA(),pad=hnKPad(P.x,P.z),y=Math.floor(P.y-0.05);
  for(const k in HN_K2.padT)if(!pad||k!==pad.ring+':'+pad.i)HN_K2.padT[k]=0;
  if(!pad||y!==A.ky)return;const k=pad.ring+':'+pad.i;if(HN_K2.deflated[k])return;HN_K2.padT[k]=(HN_K2.padT[k]||0)+dt;
  if(HN_K2.padT[k]>=3){HN_K2.deflated[k]=1;const pa=ACTOR;ACTOR=null;try{for(const c of pad.cells){setBlock(c[0],A.ky,c[1],B.AIR);setBlock(c[0],A.ky-1,c[1],B.PG_LILY);}}finally{ACTOR=pa;}
    mwS('pg_creak',P.x,A.ky,P.z);hnLog(F,'padDeflate',{k});}}
function hnKHandsTick(e,F){if(typeof pmSpawnHand!=='function'||MPF.tick%45!==0)return;HN_K2.hands=HN_K2.hands.filter(h=>h&&!h.dead);
  if(HN_K2.hands.length>=2)return;const C=hnKC(),A=hnA(),a=MPF.tick*0.13,x=C[0]+Math.sin(a)*12,z=C[2]+Math.cos(a)*12;
  try{const h=pmSpawnHand(x,A.kfloor+1,z,purgFoe({x,y:A.kfloor+1,z,h:1},30));if(h){h.pkeep=1;h.hnArena='bigfrog';HN_K2.hands.push(h);}}catch(err){mpFail('hand',err);}}

/* =====================================================================================================================
   props, decorations, meshes
   ===================================================================================================================== */
HN_PROPS.bigfrog=function(spawn){if(MP.dead.bigfrog||(MPF.fight&&!MPF.fight.over))return;const S=hnA().kseat;
  const k=spawn('pgbigfrog',S[0]+0.5,S[1],S[2]+0.5,{kind:'idle',idle:1,pinv:99,yaw:Math.PI,hrS:{}});HN.kidle=k;};
HN_DECO.bigfrog=function(d){const g=d.g,sk=hnMat(0xe8b9a0),dk=hnMat(0xc99a84),sl=hnMat(0x5a9a3a),w=hnMat(0x1a1a1a),gold=hnMat(0xc9a43a);
  /* the arm: upper arm in the hollow (root -> elbow), forearm up to the hole, then the tower to the frog; a watch and a sleeve */
  const arm=new THREE.Group();g.add(arm);arm.visible=false;d.parts.arm=arm;
  d.parts.up=hnB(arm,1.6,1.6,1,sk,0,0,0);d.parts.fore=hnB(arm,1.5,1.5,1,sk,0,0,0);d.parts.tower=hnB(arm,1.7,1,1.7,sk,0,0,0);
  d.parts.watch=hnB(arm,1.8,0.4,1.8,w,0,0,0);d.parts.face=hnB(arm,0.6,0.42,0.1,gold,0,0,0);d.parts.sleeve=hnB(arm,2.1,1.6,2.1,sl,0,0,0);
  d.parts.hairs=[];for(let i=0;i<10;i++)d.parts.hairs.push(hnB(arm,0.06,0.5,0.06,hnMat(0x2a1a10),0,0,0));
  /* the tongue (one stretched box) and the Traveler wall */
  d.parts.tongue=hnB(g,0.22,0.12,1,hnMat(0xe8608a),0,0,0);d.parts.tongue.visible=false;
  const wall=new THREE.Group();g.add(wall);wall.visible=false;d.parts.wall=wall;d.parts.wallA=hnB(wall,0.4,9,1,hnMat(0x4a1030),0,0,0);d.parts.wallB=hnB(wall,0.4,9,1,hnMat(0x4a1030),0,0,0);
  d.tick=(dt,dd)=>{const e=hnAlive('bigfrog'),A=hnA(),C=hnKC();
    const T=HN_K2.tg,tm=dd.parts.tongue;if(T&&e&&T.st!=='aim'&&T.len>0.2){tm.visible=true;hnLineTo(tm,hnKMouth(e),T.tip,0.2);}else tm.visible=false;
    const W=HN_K2.wall;dd.parts.wall.visible=!!W;if(W){const z0=A.kc[1]+0.5-25,z1=A.kc[1]+0.5+25,sa=W.split-1.5,sb=W.split+1.5;
      dd.parts.wallA.position.set(W.x,A.ky+5.5,(z0+sa)/2);dd.parts.wallA.scale.set(0.4,9,Math.max(0.1,sa-z0));
      dd.parts.wallB.position.set(W.x,A.ky+5.5,(sb+z1)/2);dd.parts.wallB.scale.set(0.4,9,Math.max(0.1,z1-sb));}
    const F=MPF.fight,live=F&&F.name==='bigfrog'&&!F.over&&F.phase>=3&&e;dd.parts.arm.visible=!!(live||(e&&e.st==='slideOut'));
    if(dd.parts.arm.visible&&e){const R=A.armRoot,root=[R[0]+0.5,R[1]+1.2,R[2]+0.5],el=HN_K2.elbowE&&!HN_K2.elbowE.dead?[HN_K2.elbowE.x,HN_K2.elbowE.y+0.7,HN_K2.elbowE.z]:[0.5,46,222];
      const hole=[0.5,A.ky-0.5,221.5],top=[e.x,e.y-0.2,e.z];
      hnLineTo(dd.parts.up,root,el,1.6);hnLineTo(dd.parts.fore,el,hole,1.5);
      const h=Math.max(0.5,top[1]-hole[1]);dd.parts.tower.position.set(hole[0],hole[1]+h/2,hole[2]);dd.parts.tower.scale.set(1.7,h,1.7);
      dd.parts.watch.position.set(hole[0],hole[1]+h*0.55,hole[2]);dd.parts.face.position.set(hole[0],hole[1]+h*0.55,hole[2]-0.92);
      dd.parts.sleeve.position.set(hole[0],top[1]-0.5,hole[2]);
      dd.parts.hairs.forEach((m,i)=>{m.position.set(hole[0]+Math.sin(i*2.1)*0.9,hole[1]+h*(0.15+0.07*i),hole[2]+Math.cos(i*2.1)*0.9);m.rotation.z=Math.sin(i)*0.6;});}};};
/* the Frog: a big squat, wide frog on his log: thick bent hind legs, eyes on top of his head with round black pupils, a pale belly
   and a throat sac that swells when he croaks (sac); the arm rods are the puppeteer's */
PREG.mesh.pgbigfrog=function(G,mats){const gr=new THREE.MeshLambertMaterial({color:0x5a9a3a}),dk=new THREE.MeshLambertMaterial({color:0x3e7a2a}),
    belly=hnMat(0xd2dc9a),w=hnMat(0xf4f1e6),k=hnMat(0x0a0a0a),pink=hnMat(0xc0405a),blk=hnMat(0x141418),sacM=hnMat(0xdce4a8);mats.push(gr,dk);
  const body=new THREE.Group();G.add(body);
  hnB(body,0.5,0.3,0.42,gr,0,0.32,0);hnB(body,0.36,0.22,0.03,belly,0,0.32,0.215);
  const head=new THREE.Group();head.position.set(0,0.5,0.02);body.add(head);
  hnB(head,0.52,0.18,0.42,gr,0,0.09,0);const jaw=new THREE.Group();jaw.position.set(0,0.0,-0.18);head.add(jaw);
  hnB(jaw,0.5,0.07,0.4,gr,0,-0.02,0.2);hnB(jaw,0.44,0.02,0.34,pink,0,0.02,0.2);
  const sac=hnB(jaw,0.26,0.12,0.2,sacM,0,-0.08,0.26);                                                  /* the throat sac */
  for(const s of [-1,1])hnB(head,0.17,0.12,0.17,gr,s*0.14,0.2,0.07);                                    /* eye bumps */
  const eyes=hnEyes(head,0.13,0.14,0.28,0.1,w,k);
  const legsA=[];for(const s of [-1,1]){const l=new THREE.Group();l.position.set(s*0.24,0.24,-0.05);body.add(l);hnB(l,0.15,0.17,0.32,gr,0,-0.04,0);
    hnB(l,0.21,0.04,0.28,dk,0,-0.21,0.1);legsA.push(l);}
  const arms=[];for(const s of [-1,1]){const a=new THREE.Group();a.position.set(s*0.22,0.42,0.12);body.add(a);hnB(a,0.09,0.24,0.09,gr,0,-0.12,0);hnB(a,0.13,0.04,0.13,dk,0,-0.25,0.03);
    hnB(a,0.015,0.4,0.015,blk,0,-0.45,0);arms.push(a);}
  const legs=[];Object.assign(legs,{body,head,jaw,eyes,arms,legsA,sac});return {G,legs,mats};};
function hnKAnim(e,dt,tx,ty,tz,lock){if(!e.mesh)return;e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;
  if(!e.pdisp&&e.mats){e.pdisp=1;e.pmats=e.mats.slice();}
  const F=e.hf,s=e.hrS||(e.hrS={});s.phase=F?F.phase:0;s.flail=e.st==='flail'?1:0;s.empty=e.st==='slideOut'||e.st==='sack'?1:0;s.swallow=HN_K2.swal?1:0;
  if(s.strum>0)s.strum=Math.max(0,s.strum-dt*2);if(s.cue>0)s.cue=Math.max(0,s.cue-dt);if(s.recoil>0)s.recoil=Math.max(0,s.recoil-dt*2);
  const L=e.legs;if(!L||!L.head)return;const t=MP.clock;let jaw=0.05,hr=0,headX=0,ar=0,al=0,bodyR=0,bodyZ=0;
  const strum=e.st==='seat'||e.st==='strum'||(e.idle);
  if(strum){ar=al=-0.25;hr=Math.sin(t*1.3)*0.25;jaw=0.04+Math.abs(Math.sin(t*2))*0.05;}
  const T=HN_K2.tg;if(T&&F&&T.st==='aim'){headX=-0.5;jaw=0.3;}else if(T&&F&&(T.st==='out'||T.st==='reel'||T.st==='stuck'||T.st==='pinned')){jaw=0.7;}
  if(e.st==='strain'||e.st==='tug'){ar=-2.4+Math.sin(t*18)*0.8;al=-2.4-Math.sin(t*18)*0.8;bodyR=-0.2;}
  if(e.st==='flail'){bodyZ=t*14;ar=-2.8;al=2.8;}if(e.st==='flailTell'){headX=-0.9;jaw=0.8;}
  if(e.st==='stun'||e.st==='trip'){bodyR=1.3;}if(e.st==='turn'){hr=Math.PI*Math.min(1,e.stT/1.2);}
  if(e.st==='sack'||e.st==='slideOut'){bodyR=0.9;jaw=0.6;}
  hnJaw(L.jaw,jaw);L.head.rotation.y=hr;L.head.rotation.x=headX;L.arms[1].rotation.x=ar;L.arms[0].rotation.x=al;L.body.rotation.x=bodyR;L.body.rotation.z=bodyZ;
  if(L.sac){const k=1+(s.strum||0)*0.9+(strum?0.12*Math.max(0,Math.sin(t*3)):0);L.sac.scale.set(0.26*k,0.12*k,0.2*k);}   /* the croak swells the sac */
  const sc=e.st==='sack'?0.75:1;L.body.scale.set(sc,e.st==='sack'?0.5:1,sc);
  hnLook(L.eyes,e,tx,ty,tz,lock,t);}

/* ---- damage rules: P3 direct hits x0.25; pinned x1.5; stunned after the Flail's trip x1.5 (melee) ---- */
HN_MULT.pgbigfrog=function(e,F,d,by,how){if(F.phase>=3)return d*0.25;if(e.st==='strain')return d*1.5;if(e.st==='trip')return how==='melee'?d*1.5:d;return d;};

/* ---- fight hooks ---- */
HN_SPAWN.bigfrog=F=>{if(HN.kidle&&!HN.kidle.dead)removeEnt(HN.kidle);HN.kidle=null;const S=hnA().kseat;return [S[0]+0.5,S[1],S[2]+0.5,Math.PI];};
HN_INIT.bigfrog=(F,e)=>{hnKReset();e.st='turn';e.stT=0;F.data={};
  /* the self-demo fly: a wild Felt Fly buzzing over an inner-ring pad */
  const A=hnA(),pads=A.pads.filter(p=>p.ring===8),pad=pads[(F.att*3)%pads.length];F.data.demoPad=pad;
  if(MOBT.pgfly){try{spawnMob('pgfly',pad.x,A.ky+1.0,pad.z);const f=entities[entities.length-1];f.pkeep=1;f.hnArena='bigfrog';HN_K2.fly=f;}catch(err){HN_K2.fly=null;}}};
HN_CAM.bigfrog=(F,t)=>hnCamAt(F,t,[-2.4,0.6,-5.2]);
HN_GO.bigfrog=(F,e)=>{hnSay('Evening. Tonight’s guest is... about to die. Hooray.',3);e.st='seat';e.stT=0;HN_K2.tongueT=1.6;};
HN_PHASE.bigfrog=(F,e,ph)=>{if(HN_K2.swal&&P&&!P.dead)hnKSpit(e,F,false);
  if(ph===2){hnSay('Okay, everybody, places! Standby...',2.2);HN_K2.cueT=3;e.st='seat';}
  if(ph===3){hnKArmStart(e,F);}};
HN_PHRESET.bigfrog=(F,e)=>{hnKCleanup();const keep={flailDone:HN_K2.flailDone};hnKReset();HN_K2.flailDone=keep.flailDone;
  if(e&&!e.dead){e.st='gloat';e.stT=0;const S=hnA().kseat;if(F.phase<3){e.x=S[0]+0.5;e.y=S[1];e.z=S[2]+0.5;}else{hnKArmStart(e,F);e.st='gloat';}}};
HN_GLOAT.bigfrog=(F,e)=>{hnSay('(croaks)',2.4,'gloat');};
HN_HINT.bigfrog=F=>{const A=hnA();if(F.phase>=3){const E=HN_K2.elbowE;const x=E?E.x:0.5,z=E?E.z:221;return {x,y:A.ky+1.05,z,boss:'bigfrog',what:'tear'};}
  let best=A.pads[0],bd=1e9;for(const p of A.pads)if(p.ring===8){const d=Math.hypot(p.x-P.x,p.z-P.z);if(d<bd){bd=d;best=p;}}return {x:best.x,y:A.ky+1.05,z:best.z,boss:'bigfrog',what:'pad'};};
HN_END.bigfrog=(F,why)=>{hnKCleanup();hnKReset();};
HN_DIE.bigfrog=(F,e)=>{hnKCleanup();e.st='slideOut';e.stT=0;hnSay('...',1.5);};
function hnKCleanup(){const T=HN_K2.tg;if(T){hnKRelease(T);if(T.prop&&!T.prop.dead)removeEnt(T.prop);}HN_K2.tg=null;
  if(HN_K2.swal&&P&&!P.dead){const C=hnKC();P.x=C[0]+3;P.z=C[2]-6;P.y=hnA().ky+1.05;P.vx=P.vy=P.vz=0;}HN_K2.swal=null;hnKFingers(false);
  for(const b of HN_K2.botSwal)if(b.b&&b.b.A&&b.b.A.pgrab)b.b.A.pgrab.until=0;HN_K2.botSwal=[];
  if(HN_K2.elbowE&&!HN_K2.elbowE.dead)removeEnt(HN_K2.elbowE);HN_K2.elbowE=null;HN_K2.elbow=null;
  if(HN_K2.fly&&!HN_K2.fly.dead)removeEnt(HN_K2.fly);HN_K2.fly=null;
  for(const h of HN_K2.hands)if(h&&!h.dead)removeEnt(h);HN_K2.hands=[];
  if(HN.danK&&HN.danK.by==='the Frog')HN.danK=null;}

/* ---- summon: Dan steps onto a pad of the outer ring ---- */
HN_SUMMON.bigfrog=function(){const A=hnA();if(!P||P.dead||!P.onGround)return;const pad=hnKPad(P.x,P.z);
  if(pad&&pad.ring===20&&Math.floor(P.y-0.05)===A.ky&&getBlock(Math.floor(P.x),A.ky,Math.floor(P.z))===B.PG_LILY)hnFightStart('bigfrog');};

/* ---- the brain ---- */
PREG.brain.pgbigfrog=function(e,dt,T){e.vx=e.vy=e.vz=0;hnDanKTick(dt);
  if(e.idle){e.stT=(e.stT||0)+dt;e.st='strum';hnKAnim(e,dt,P.x,P.y+1.5,P.z,0);return;}
  const F=e.hf;if(!F||F.over){if(!F)removeEnt(e);return;}const A=hnA(),C=hnKC();e.stT+=dt;
  const tg=hnPTarget(e,30),tb=tg?hnFoeBody(tg):null;const tx=tb?tb.x:P.x,ty=tb?(tg===P?P.y+1.5:tb.y+1.5):P.y+1.5,tz=tb?tb.z:P.z;let lock=0;
  if(CUT.on&&CUT.script){if(e.st==='turn')e.yaw=Math.PI;hnKAnim(e,dt,P.x,P.y+1.5,P.z,0.5);return;}
  if(F.intro){hnKAnim(e,dt,P.x,P.y+1.5,P.z,1);return;}
  if(F.dying){hnKDying(e,F,dt);hnKAnim(e,dt,tx,ty,tz,0);return;}
  if(e.pstagger>MP.clock&&!HN_K2.swal){e.stT-=dt;hnKTongueTick(e,F,dt);hnKAnim(e,dt,tx,ty,tz,0);return;}
  /* inside: the swallow timer; a bot's swallow lasts 6 s */
  if(HN_K2.swal){const S=HN_K2.swal;S.t+=dt;if(P.dead){HN_K2.swal=null;hnKFingers(false);}else if(S.t>=12)hnKSpit(e,F,false);}
  HN_K2.botSwal=HN_K2.botSwal.filter(b=>{if(MP.clock>=b.until){hnKSpitBot(b.b);return false;}return true;});
  if(F.gloat>0||F.wait){e.st='gloat';hnKAnim(e,dt,P.x,P.y+1.5,P.z,0.2);if(HN_K2.tg)hnKTongueTick(e,F,dt);return;}
  if(e.st==='gloat'){e.st=F.phase>=3?'arm':'seat';e.stT=0;}
  HN_K2.regrow=Math.max(0,HN_K2.regrow-dt);
  hnKTongueTick(e,F,dt);hnKRippleTick(e,F,dt);
  if(F.phase===2)hnKCueTick(e,F,dt);
  const blind=hnBlind(e);
  switch(e.st){
    case 'turn':e.yaw=Math.PI;if(e.stT>=1.2){e.st='seat';e.stT=0;}break;
    case 'seat':{e.x+=(C[0]-e.x)*Math.min(1,dt*6);e.z+=(C[2]-e.z)*Math.min(1,dt*6);e.y=A.kseat[1];if(tb)e.yaw=Math.atan2(tb.x-e.x,tb.z-e.z);lock=HN_K2.tg?1:0.3;
      if(HN_K2.swal)break;
      /* the Flail once at 162 */
      if(F.phase===2&&!HN_K2.flailDone&&e.hp<=162&&!HN_K2.tg){hnKFlailStart(e,F);break;}
      if(F.phase===1){HN_K2.strumT-=dt;if(HN_K2.strumT<=0&&!HN_K2.tg){HN_K2.strumT=8;hnKStrum(e,F);}}
      if(F.phase===2){HN_K2.cueT-=dt;if(HN_K2.cueT<=0){HN_K2.cueT=6;hnKCue(e,F);}}
      HN_K2.tongueT-=dt;
      if(HN_K2.tongueT<=0&&!HN_K2.tg&&HN_K2.regrow<=0&&HN_K2.dark<=0){HN_K2.tongueT=F.phase===1?4:5;
        if(!F.demo){F.demo=true;const pad=F.data.demoPad;const fly=HN_K2.fly&&!HN_K2.fly.dead?HN_K2.fly:null;
          hnKTongueStart(e,F,null,{at:[pad.x,A.ky+0.5,pad.z],demo:true,fly});}
        else if(blind){hnKTongueStart(e,F,null,{at:[e.x+Math.sin(MPF.tick)*12,A.ky+1,e.z+Math.cos(MPF.tick)*12]});}
        else if(tg)hnKTongueStart(e,F,tg);}
      break;}
    case 'tug':case 'strain':lock=1;break;
    case 'gulp':if(e.stT>=1){e.st='seat';e.stT=0;}break;
    case 'stun':if(e.stT>=(e.stunT||2.5)){e.st=F.phase>=3?'arm':'seat';e.stT=0;}break;
    case 'flailTell':lock=1;if(e.stT>=1.0){e.st='flail';e.stT=0;mwS('pg_rip',e.x,e.y,e.z);}break;
    case 'flail':{const FL=HN_K2.flail;FL.t+=dt;const s=6*dt;let nx=e.x+FL.dir[0]*s,nz=e.z+FL.dir[1]*s;
      if(Math.hypot(nx-C[0],nz-C[2])>A.kr-1.5){FL.dir=[-FL.dir[0]+(Math.sin(FL.t)*0.3),-FL.dir[1]];nx=e.x;nz=e.z;}e.x=nx;e.z=nz;e.y=A.ky+1.02;
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)hnKTear(Math.floor(e.x)+dx,Math.floor(e.z)+dz,'the Frog');
      for(const t of hnKFoes()){const b=hnFoeBody(t),k=hnFoeName(t);if((FL.hit[k]||0)>MP.clock)continue;if(Math.hypot(b.x-e.x,b.z-e.z)<2.5){FL.hit[k]=MP.clock+0.8;purgHit(t,5,'the Frog','flail',{force:1,src:e});hnPush(t,(b.x-e.x)*4,6,(b.z-e.z)*4);}}
      if(FL.t>=5){e.st='trip';e.stT=0;hnWin(F,3,'flailTrip');mwS('pg_thump',e.x,e.y,e.z);hnLog(F,'trip',{});}break;}
    case 'trip':e.y=A.ky+1.02;if(e.stT>=3){e.st='scramble';e.stT=0;}break;
    case 'scramble':{const S=A.kseat;const dx=S[0]+0.5-e.x,dz=S[2]+0.5-e.z,d=Math.hypot(dx,dz);if(d>0.2){const s2=Math.min(d,7*dt);e.x+=dx/d*s2;e.z+=dz/d*s2;}
      e.y=A.ky+1.02+Math.min(1,e.stT)*1;if(d<=0.25||e.stT>4){e.st='seat';e.stT=0;e.y=S[1];}break;}
    /* ---- P3: up on the arm ---- */
    case 'rise':{const u=Math.min(1,e.stT/3);e.x+=(0.5-e.x)*Math.min(1,dt*3);e.z+=(221.5-e.z)*Math.min(1,dt*3);e.y=A.kseat[1]+u*18;if(u>=1){e.st='arm';e.stT=0;HN_K2.yBase=e.y;}break;}
    case 'arm':{e.x=0.5;e.z=221.5;const ty0=A.kseat[1]+18-Math.min(10,HN_K2.drops*2);e.y+=(ty0-e.y)*Math.min(1,dt*4);if(tb)e.yaw=Math.atan2(tb.x-e.x,tb.z-e.z);
      if(e.hrS.recoil>0)e.y-=Math.sin(MP.clock*40)*0.06;
      hnKSweepTick(e,F,dt);hnKPadsTick(e,F,dt);hnKHandsTick(e,F);
      if(HN_K2.tg||HN_K2.sweep)break;
      /* the tongue drag: a player down in the hollow gets dragged up through a tear and slapped onto the sheet */
      HN_K2.dragT-=dt;HN_K2.slamT-=dt;
      const low=hnKFoes().find(t=>hnKInHollow(t));
      if(low&&HN_K2.dragT<=0){HN_K2.dragT=9;hnKTongueStart(e,F,low,{drag:true});break;}
      if(HN_K2.slamT<=0&&tg){HN_K2.slamT=5;if((MPF.tick%3)===0){hnKSweepStart(e,F);}else{const b=hnFoeBody(tg);hnKTongueStart(e,F,tg,{slam:true,at:blind?null:[b.x,A.ky+0.4,b.z]});}}
      break;}
    default:e.st=F.phase>=3?'arm':'seat';e.stT=0;}
  hnKAnim(e,dt,tx,ty,tz,lock);};
/* the death: the hand slides out; the empty sack falls onto the log; the arm sinks; "Okay. That's a wrap. Strike it." */
function hnKDying(e,F,dt){const A=hnA();
  switch(e.st){
    case 'slideOut':if(e.stT>=1.6){e.st='fall';e.stT=0;e.kvy=0;mwS('pg_rip',e.x,e.y,e.z);}break;
    case 'fall':{e.kvy=(e.kvy||0)-GRAV*dt;e.y+=e.kvy*dt;e.x+=(0.5-e.x)*Math.min(1,dt*2);e.z+=(215.5-e.z)*Math.min(1,dt*2);
      if(e.y<=A.kseat[1]){e.y=A.kseat[1];e.st='sack';e.stT=0;mwS('pg_thump',e.x,e.y,e.z);if(HN_K2.elbowE&&!HN_K2.elbowE.dead)removeEnt(HN_K2.elbowE);}break;}
    case 'sack':if(e.stT>=2.2){e.st='godmic';e.stT=0;mpSay('','Okay. That’s a wrap. Strike it.',3.4);}break;
    case 'godmic':if(e.stT>=3.4){const keep={x:e.x,y:e.y,z:e.z};hnFightWon(F);if(typeof hnStrikeStart==='function')hnStrikeStart(keep);}break;
    default:e.st='slideOut';e.stT=0;}}
Object.assign(PGEX,{getHNK:()=>HN_K2,hnKTongueStart,hnKSwallow,hnKSpit,hnKCue,hnKFlailStart,hnKArmStart,hnKStrum,hnKTear,hnKPad});
