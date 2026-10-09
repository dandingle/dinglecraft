/* ---- PART 55: p4_bigpig.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p4_bigpig.js (P4): THE PIG, "THE GRAND STAIRCASE" (bible 10.2). 300 HP.
   P1 THE ENTRANCE: pigs rolled down the stairs at you. A throw every 1.2 s down alternating lanes: piglets bounce step by step
     (catchable), rolling hogs (change lanes at a landing), the Hero Hog every 5th (blocks a landing), a Pork Bomb every 7th
     (blows on a landing; bat it back up for 20). A caught pig thrown back: 18 and she stops for 2 s. Ends at 225 or when Dan
     reaches the Star Platform (P2's pool is then her HP - 105).
   P2 THE CLOSE-UP: she preens at her vanity (the self-demo, x2). Three followspots: -25% each on her. Hit a tower and its
     beam is on you for 20 s; two beams on one player and she CHARGES him. A raised Vanity Mirror stops her dead (3 looks, the
     4th she smashes it). SLAM within 5 m. The Diva Toss (trotters up, lunge, smooch, overhead, hurled). Fastballs from her
     6 platform pigs; at 0 pigs she throws a bot.
   P3 THE DIVA FINALE: a kickline every 15 s (jump the kicks; hit the end pig or throw a pig into it: dominoes, she slams her
     own chorus with her back turned); a completed line restocks her and a Pig Storm follows; then she poses under the Big
     Lamp: drop it with Shears on the Lamp Cleat (or a Charge + the Plunger): 40 and stunned. Death: she rolls down the stairs.
   --------------------------------------------------------------------------------------------------------------------- */

var HN_P={beams:[null,null,null],line:null,lamp:{st:'up',t:0,y:69.5},held:null,heldBot:null,fly:null,stopT:0,chorT:15,tossT:7,chopCd:0,fastT:3,
  botCd:0,slapT:0,n:0,lane:0,pressL:false,presses:0,allyT:-9,tint:null};
function hnPReset(){HN_P.beams=[null,null,null];HN_P.line=null;HN_P.lamp={st:'up',t:0,y:69.5};HN_P.held=null;HN_P.heldBot=null;HN_P.fly=null;
  HN_P.stopT=0;HN_P.chorT=15;HN_P.tossT=7;HN_P.chopCd=0;HN_P.fastT=3;HN_P.botCd=0;HN_P.slapT=0;HN_P.n=0;HN_P.lane=0;HN_P.presses=0;HN_P.tint=null;
  if(HN.danK&&HN.danK.by==='the Pig')HN.danK=null;}
PREG.onReset.push(hnPReset);PREG.onLoad.push(hnPReset);PREG.onExit.push(hnPReset);

/* ---- Dan carried by a headliner (held overhead, thrown, reeled): moved in the brain, before the camera ---- */
function hnDanK(mode,o){if(!P||P.dead)return null;HN.danK=Object.assign({mode,t:0},o||{});if(P.ride)P.ride=null;return HN.danK;}
function hnDanKTick(dt){const K=HN.danK;if(!K)return;if(!P||P.dead||DIM!=='puppet'){HN.danK=null;return;}K.t+=dt;
  if(K.mode==='hold'){const p=K.at();P.x=p[0];P.y=p[1];P.z=p[2];P.vx=P.vy=P.vz=0;P.fallD=0;P.onGround=false;
    if(K.t>=(K.dur||1e9)){HN.danK=null;if(K.onEnd)K.onEnd(false);}return;}
  if(K.mode==='fly'){K.vy-=GRAV*dt;const ox=P.x,oz=P.z;moveBody(P,K.vx*dt,K.vy*dt,K.vz*dt,false);P.vx=P.vy=P.vz=0;P.fallD=0;
    if(K.check&&K.check(K))return;
    if((P.onGround&&K.t>0.12)||K.t>4){HN.danK=null;let d=Math.min(K.cap==null?6:K.cap,Math.floor(Math.max(0,-K.vy-8)*0.6)+3);
      if(P.armor&&P.armor[0]&&P.armor[0].id===IT.PG_STUNT)d=Math.floor(d/2);
      const st=hnStandOn();if(st===B.PG_STUFFING)d=0;
      if(d>0)purgHit(P,d,K.by||'the Pig',K.how||'toss',{force:1});if(K.onEnd)K.onEnd(true);}return;}
  if(K.mode==='reel'){const p=K.to(),dx=p[0]-P.x,dy=p[1]-P.y,dz=p[2]-P.z,d=Math.hypot(dx,dy,dz);
    if(d<(K.arrive||1.2)){HN.danK=null;if(K.onEnd)K.onEnd(true);return;}
    const s=Math.min(d,(K.spd||13)*dt);P.vx=P.vy=P.vz=0;P.fallD=0;moveBody(P,dx/d*s,dy/d*s,dz/d*s,false);
    if(K.t>(K.max||3)){HN.danK=null;if(K.onEnd)K.onEnd(false);}return;}}
function hnStandOn(){return P?getBlock(Math.floor(P.x),Math.floor(P.y-0.05),Math.floor(P.z)):0;}

/* ---- the staircase helpers ---- */
function hnPOnPlat(x,y,z){const A=hnA();if(y<A.platY+0.5)return false;if(Math.hypot(x-A.plat[0]-0.5,z-A.plat[1]-0.5)<=A.platR+0.6)return true;
  return x>=-9.2&&x<=10.2&&z>=122&&z<=A.plat[1]+1;}
function hnPTopAt(x,z){const t=hnTreadTop(Math.floor(x),Math.floor(z));return t>0?t:deckY(Math.floor(z));}
function hnPFoes(){const o=[];if(P&&!P.dead&&P.mode!=='c'&&DIM==='puppet')o.push(P);
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS)if(a.e&&!a.dead&&a.online&&a.dim===DIM&&!(a.pgrab&&a.pgrab.until>MP.clock))o.push(a.e);return o;}
function hnPSequins(t){const ar=t===P?P.armor:(t.A&&t.A.armor)||[];let n=0;for(const s of ar)if(s&&s.id>=IT.PG_GOWN_H&&s.id<=IT.PG_GOWN_B)n++;return n;}
/* she always targets the player wearing the most Sequin Gown pieces (a liability you can hand to a bot), else the nearest */
function hnPTarget(e,range){let best=null,bs=-1,bd=1e9;for(const t of hnPFoes()){const d=Math.hypot(t.x-e.x,t.z-e.z);if(d>(range||40))continue;
  const s=hnPSequins(t);if(s>bs||(s===bs&&d<bd)){bs=s;bd=d;best=t;}}return best;}
function hnPFallen(x,y,z){let n=0;for(const m of entities)if(!m.dead&&m.t==='mob'&&m.mt==='pgpiglet')n++;
  if(n<6){spawnMob('pgpiglet',x,y,z);const m=entities[entities.length-1];m.pkeep=1;m.hnArena='bigpig';m.dazeT=1.2;return m;}
  spawnDrop(x,y+0.4,z,{id:IT.PG_HAM,count:1},0,2,0);return null;}

/* Fallen Piglets (bible 13): dazed at the FOOT of the staircase, nibbling whoever stands next to them. They never climb:
   one that lands on the steps tumbles down to the foot first; on the floor they waddle after anyone within 6 m. */
PREG.brain.pgpiglet=function(e,dt){if(puBatMove(e,dt)){hnPPigAnim(e,dt);return;}
  if(e.pheld){hnPPigAnim(e,dt);return;}                                              /* in P2's Pig Mitt */
  if(e.pthrown&&hnPThrownFly(e,dt))return;
  const A=hnA();e.pT=(e.pT||0)+dt;e.dazeT=Math.max(0,(e.dazeT||0)-dt);e.nibT=Math.max(0,(e.nibT||0)-dt);
  e.vx=e.vz=0;e.vy=(e.vy||0)-GRAV*dt;if(e.vy<-20)e.vy=-20;let mx=0,mz=0,t=null;
  const stairs=c=>hnTreadTop(Math.floor(c[0]),Math.floor(c[1]))>=0;
  if(stairs([e.x,e.z])){mz=-3*dt;e.pst='bolt';e.yaw=Math.PI;}                       /* tumbling down the steps */
  else{if(!e.home)e.home=[e.x,e.z];let bd=6;
    for(const f of hnPFoes()){const fy=f===P?P.y:f.y,d=Math.hypot(f.x-e.x,f.z-e.z);if(d<bd&&Math.abs(fy-e.y)<1.5){bd=d;t=f;}}
    let tx,tz,sp;if(t&&e.dazeT<=0){tx=t.x;tz=t.z;sp=1.5;e.pst='scurry';}else{tx=e.home[0]+Math.sin(e.pT*0.7)*1.5;tz=e.home[1]+Math.cos(e.pT*0.9)*1.5;sp=0.6;e.pst='mill';}
    const dx=tx-e.x,dz=tz-e.z,l=Math.hypot(dx,dz);
    if(l>0.9){mx=dx/l*sp*dt;mz=dz/l*sp*dt;if(stairs([e.x+mx*8,e.z+mz*8])){mx=mz=0;}e.yaw=Math.atan2(dx,dz);}}
  moveBody(e,mx,e.vy*dt,mz,false);if(e.onGround)e.vy=0;
  if(t&&e.nibT<=0&&Math.hypot(t.x-e.x,t.z-e.z)<1.1){e.nibT=1.6;purgHit(t,1,'Fallen Piglet','nibble',{src:e});}
  hnPPigAnim(e,dt);};

/* ---- pig projectiles (pproj): pig, hog, link, porkbomb ---- */
function hnPCompBounce(p,vx,vy,vz){p.vx=-vx/0.3;p.vz=-vz/0.3;p.vy=Math.abs(vy)/0.3;return false;}   /* puUpdate scales a bounce by -0.3 / 0.3 */
function hnPHop(p,bx,by,bz){const z=Math.floor(p.z),top=hnPTopAt(p.x,z),nz=z-2,ntop=hnPTopAt(p.x,nz),dy=ntop-top,T=0.45;
  const lx=p.lane!=null?hnA().laneX[p.lane]+0.5:p.x,vx=(lx-p.x)*1.2;
  return hnPCompBounce(p,vx,(dy+0.5*GRAV*T*T)/T,-2/T);}
function hnPPigHit(p,t,dmg,kind){const e=hnAlive('bigpig'),T=t.t==='mob'?MOBT[t.mt]:null;
  const byPlayer=p.owner==='Dan'||hnIsBot(p.owner);
  if(byPlayer){
    if(e&&t===e){const F=e.hf;if(F){const d=kind==='link'?36:kind==='porkbomb'?20:18;hnWin(F,2.2,'thrown '+kind);hnHit(e,d,p.owner,'pig');
        HN_P.stopT=2;hnSay(kind==='link'?'NOT YOU!':'HOW DARE—',1.4,'howdare');hnLog(F,'pigBack',{kind,by:p.owner});}
      if(kind==='porkbomb')burstParticles(p.x,p.y,p.z,B.TNT,16,0.9);return true;}
    if(t.t==='mob'&&t.mt==='pgtoss'&&t.kind==='chorus'&&HN_P.line&&!HN_P.line.fallen){hnPDominoes(p.owner);return true;}
    if(T&&T.npc){purgHit(t,1,p.owner,'pig');return true;}
    return false;}
  if(T&&(T.prop||t.mt==='pgpiglet'||t.mt==='pghog'||t.mt==='pgbigpig'))return false;
  if(t===P||t.bot){purgHit(t,dmg,'the Pig',kind,{force:kind!=='pig',kx:p.vx,kz:p.vz});
    if(kind==='porkbomb'){pBlast(p.x,p.y,p.z,2.5,5,'the Pig',{self:e,how:'porkbomb'});return true;}
    return kind!=='hog';}
  return false;}
function hnPLandPig(p,bx,by,bz){
  if(by+1>p.y+0.3)return false;                                                /* a wall (a banister post, a rail): the default bounce reflects it */
  p.y=Math.max(p.y,by+1.06);
  if(p.owner!=='the Pig'){const x=p.x,y=by+1.05,z=p.z;if(hnPOnPlat(x,y,z))hnPPlatPig(x,y,z,'dazed');else hnPFallen(x,y,z);return true;}
  if(p.mode==='fast'){const y=by+1.05;if(hnPOnPlat(p.x,y,p.z))hnPPlatPig(p.x,y,p.z,'dazed');else hnPFallen(p.x,y,p.z);return true;}
  const top=hnTreadTop(Math.floor(p.x),Math.floor(p.z));
  if(top<0||Math.floor(p.z)<hnA().stairZ0){hnPFallen(p.x,by+1.05,p.z);return true;}
  if(p.kind==='porkbomb'&&hnIsLanding(Math.floor(p.z))){pBlast(p.x,by+1.3,p.z,2.5,5,'the Pig',{self:hnAlive('bigpig'),how:'porkbomb'});
    burstParticles(p.x,by+1.3,p.z,B.TNT,18,1);mpShake(0.3,0.3);return true;}
  if(p.kind==='hog'){return hnPCompBounce(p,(hnA().laneX[p.lane|0]+0.5-p.x)*2,0.6,-9);}
  return hnPHop(p,bx,by,bz);}
PREG.proj.pig={r:0.42,life:9,mesh:()=>hnPoolGet('pigM',()=>hnPPigMesh(false)),hit:(p,t)=>hnPPigHit(p,t,p.mode==='fast'?4:3,'pig'),land:hnPLandPig};
PREG.proj.hog={r:0.8,life:9,mesh:()=>hnPoolGet('hogM',()=>hnPPigMesh(false,1)),hit:(p,t)=>hnPPigHit(p,t,5,'hog'),land:hnPLandPig};
PREG.proj.porkbomb={r:0.45,life:9,mesh:()=>hnPoolGet('bombM',()=>hnPPigMesh(false,2)),hit:(p,t)=>hnPPigHit(p,t,5,'porkbomb'),land:hnPLandPig};
PREG.proj.link={r:0.5,life:6,mesh:()=>hnPoolGet('linkM',()=>hnPHogMesh()),hit:(p,t)=>{if(p.owner!=='the Pig')return hnPPigHit(p,t,0,'link');
    const T=t.t==='mob'?MOBT[t.mt]:null;if(T&&(T.prop||t.mt==='pgpiglet'||t.mt==='pghog'||t.mt==='pgbigpig'))return false;
    if(t===P||t.bot){purgHit(t,4,'the Hero Hog','link',{src:p});}return false;},
  land:(p,bx,by,bz)=>{if(p.owner!=='the Pig'){hnPFallen(p.x,by+1.05,p.z);return true;}
    spawnMob('pghog',p.x,by+1.02,p.z);const m=entities[entities.length-1];m.pkeep=1;m.hnArena='bigpig';m.yaw=Math.PI;m.home=[p.x,by+1.02,p.z];
    hnSay("Stand aside, I'm saving her!",2,'link');return true;}};
/* a throw down a lane (P1) */
function hnPThrowDown(e,kind,lane){const A=hnA(),lx=A.laneX[lane]+0.5,fx=lx,fy=e.y+1.9,fz=Math.min(e.z-0.4,122.2);
  let v;if(kind==='hog'){v=[(lx-fx)*1.5,1.5,-9];}
  else if(kind==='link'){const tz=hnPHogZ();v=aimLob(fx,fy,fz,lx,hnPTopAt(lx,tz)+1.2,tz+0.5,1.0);}
  else{const tz=118.5;v=aimLob(fx,fy,fz,lx,hnPTopAt(lx,tz)+1.3,tz,0.6);}
  const opt={src:e,lane,mode:'bounce'};if(kind==='pig'||kind==='link')opt.pcatch=kind;
  const p=puSpawn(kind,fx,fy,fz,v[0],v[1],v[2],'the Pig',opt);
  if(p&&kind==='pig'&&HN_P.tint==='next'){HN_P.tint=null;p.red=1;if(p.mesh)hnPRedPig(p.mesh,true);}
  else if(p&&p.mesh)hnPRedPig(p.mesh,false);
  e.hrS.throwT=1;mwS('pg_whoosh',fx,fy,fz);return p;}
function hnPHogZ(){const A=hnA();const pz=P?P.z:70;for(const L of A.landings)if(L[0]>pz+1)return (L[0]+L[1])/2;return A.landings[2][0]+2;}
/* a fastball / storm pig at a player */
function hnPThrowAt(e,t,mode){const tb=hnFoeBody(t),T=mode==='storm'?0.75:0.6,fx=e.x,fy=e.y+2.0,fz=e.z;
  const tx=tb.x+(tb.vx||0)*T*0.5,tz=tb.z+(tb.vz||0)*T*0.5,ty=(t===P?P.y:tb.y)+0.9,v=aimLob(fx,fy,fz,tx,ty,tz,T);
  const p=puSpawn('pig',fx,fy,fz,v[0],v[1],v[2],'the Pig',{src:e,mode:'fast',pcatch:'pig'});if(p&&p.mesh)hnPRedPig(p.mesh,false);
  e.hrS.throwT=1;mwS('pg_whoosh',fx,fy,fz);return p;}

/* ---- platform pigs (her ammunition, pgtoss props): mill, dazed 2 s after landing, scurry back; hit a scurrier and it bolts ---- */
function hnPPlatPig(x,y,z,st){spawnMob('pgtoss',x,y,z);const m=entities[entities.length-1];Object.assign(m,{kind:'plat',pst:st||'mill',pT:0,pkeep:1,hnArena:'bigpig',yaw:0});
  m.relay=(d,by)=>{if(m.pst==='scurry'&&(by==='Dan'||hnIsBot(by))){m.pst='bolt';m.pT=0;mwS('pg_squeak',m.x,m.y,m.z);}};return m;}
function hnPPlatPigs(){const o=[];for(const m of entities)if(!m.dead&&m.t==='mob'&&m.mt==='pgtoss'&&m.kind==='plat'&&m.pst!=='bolt')o.push(m);return o;}
PREG.brain.pgtoss=function(e,dt){if(puBatMove(e,dt)){hnPPigAnim(e,dt);return;}
  if(e.pheld){hnPPigAnim(e,dt);return;}                                         /* in P2's Pig Mitt: P2 moves it */
  if(e.pthrown){if(hnPThrownFly(e,dt))return;}
  e.vx=e.vy=e.vz=0;e.onGround=true;e.pT=(e.pT||0)+dt;const A=hnA(),pg=hnAlive('bigpig');
  if(e.kind==='chorus'){hnPPigAnim(e,dt);return;}
  if(e.kind==='plat'){
    if(e.pst==='dazed'){if(e.pT>2){e.pst='scurry';e.pT=0;}}
    else if(e.pst==='scurry'){if(pg){const dx=pg.x-e.x,dz=pg.z-e.z,d=Math.hypot(dx,dz);if(d>1.6){const s=Math.min(d,3.2*dt);e.x+=dx/d*s;e.z+=dz/d*s;e.yaw=Math.atan2(dx,dz);}else{e.pst='mill';e.pT=0;}}
      else{e.pst='mill';}}
    else if(e.pst==='mill'){const a=(e.seed||(e.seed=1+((MPF.tick*7919)%97)))+MP.clock*0.4,r=4+Math.sin(e.seed)*2;
      const tx=A.plat[0]+0.5+Math.sin(a)*r,tz=A.plat[1]+0.5+Math.cos(a)*r,dx=tx-e.x,dz=tz-e.z,d=Math.hypot(dx,dz);if(d>0.1){const s=Math.min(d,1.2*dt);e.x+=dx/d*s;e.z+=dz/d*s;e.yaw=Math.atan2(dx,dz);}}
    else if(e.pst==='bolt'){const dx=e.x-A.plat[0]-0.5,dz=e.z-A.plat[1]-0.5,d=Math.hypot(dx,dz)||1;e.x+=dx/d*6*dt;e.z+=dz/d*6*dt;
      if(d>A.platR+1){e.y-=dt*10;}if(e.pT>3){removeEnt(e);return;}}
    if(e.pst!=='bolt'&&hnPOnPlat(e.x,e.y,e.z))e.y=A.platY+1.02;}
  hnPPigAnim(e,dt);};
function hnPPigAnim(e,dt){if(!e.mesh)return;e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw||0;
  {const s=e.hrS||(e.hrS={});s.squeal=(e.pst==='dazed'||e.pst==='bolt'||(HN_P.line&&HN_P.line.fallen&&e.kind==='chorus'))?1:0;s.roll=0;s.speed=(e.pst==='scurry'||e.pst==='bolt'||e.pst==='mill')?1:0;}
  const L=e.legs;if(!L||!L.body)return;
  if(L.hat)L.hat.visible=e.kind==='chorus';
  const t=MP.clock+(e.seed||0);
  if(e.kind==='chorus'){const ln=HN_P.line,fallen=ln&&ln.fallen;L.body.rotation.z=fallen?1.4:0;
    const k=fallen?0:Math.max(0,Math.sin(t*8+(e.ci||0)*0.9))*1.2;if(L.legs[0])L.legs[0].rotation.x=-k;if(L.legs[1])L.legs[1].rotation.x=k*0.2;
    if(L.hat&&ln&&ln.tell>0)L.hat.rotation.x=-0.6*Math.sin(ln.tell*Math.PI);}
  else{L.body.rotation.z=e.pst==='dazed'?Math.sin(t*9)*0.3:0;const w=e.pst==='mill'||e.pst==='scurry'||e.pst==='bolt'?Math.sin(t*14)*0.6:0;for(let i=0;i<L.legs.length;i++)L.legs[i].rotation.x=i%2?w:-w;}}

/* a pig or the Hero Hog thrown by a player (P2's Pig Mitt sets e.pthrown and the launch velocity): a true arc until it lands */
function hnPThrownFly(e,dt){e.onGround=false;e.vy-=GRAV*dt;moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.x+=dt*8;}
  if(e.onGround||e.y<0){const th=e.pthrown;e.pthrown=null;e.vx=e.vy=e.vz=0;
    if(e.mt==='pgtoss'){if(hnPOnPlat(e.x,e.y,e.z)){e.kind='plat';e.pst='dazed';e.pT=0;}else{const x=e.x,y=e.y,z=e.z;removeEnt(e);hnPFallen(x,y,z);return true;}}
    else if(e.mt==='pghog'){e.home=[e.x,e.y,e.z];}
    return false;}
  return true;}
/* ---- the kickline (P3) ---- */
function hnPLineStart(e){const A=hnA();const line={x:A.plat[0]+0.5-10.5,dir:1,z0:A.plat[1]+0.5-4.9,pigs:[],tell:1.0,fallen:false,fallT:0,done:false,kicked:new Map()};
  for(let i=0;i<8;i++){spawnMob('pgtoss',line.x,A.platY+1.02,line.z0+i*1.4);const m=entities[entities.length-1];
    Object.assign(m,{kind:'chorus',ci:i,pkeep:1,hnArena:'bigpig',yaw:Math.PI/2,seed:i*1.3});
    m.relay=(d,by)=>{if((m.ci===0||m.ci===7)&&(by==='Dan'||hnIsBot(by))&&!line.fallen&&line.tell<=0)hnPDominoes(by);};line.pigs.push(m);}
  HN_P.line=line;hnSay('And-a-one... and-a-two...',1.2,'count');mwS('pg_gasp');return line;}
function hnPDominoes(by){const ln=HN_P.line;if(!ln||ln.fallen)return;ln.fallen=true;ln.fallT=0;mwS('pg_squeak');
  const e=hnAlive('bigpig');if(e&&e.hf){hnLog(e.hf,'dominoes',{by});e.st='stormOver';e.stT=0;}}
function hnPLineTick(dt,e){const ln=HN_P.line;if(!ln)return;const A=hnA();
  if(ln.tell>0){ln.tell-=dt;return;}
  if(ln.fallen){ln.fallT+=dt;if(ln.fallT>4.6){for(const m of ln.pigs)if(!m.dead)removeEnt(m);HN_P.line=null;}return;}
  ln.x+=ln.dir*4*dt;
  for(const m of ln.pigs){if(m.dead)continue;m.x=ln.x;m.z=ln.z0+m.ci*1.4;const inside=Math.hypot(m.x-A.plat[0]-0.5,m.z-A.plat[1]-0.5)<=A.platR+0.4;
    m.y=A.platY+1.02;if(m.mesh)m.mesh.visible=inside;
    if(!inside)continue;
    for(const t of hnPFoes()){const ty=t===P?P.y:t.y;if(Math.abs(t.x-m.x)<0.65&&Math.abs(t.z-m.z)<0.7&&ty<A.platY+1.6){const k=(t===P?'Dan':(t.A&&t.A.name))+m.ci;
        if(ln.kicked.has(k))continue;ln.kicked.set(k,1);purgHit(t,2,'the Pig','kick',{force:1,kx:ln.dir,kz:0});hnPush(t,ln.dir*6,5,0);}}}
  if(ln.x>A.plat[0]+0.5+10.5){ln.done=true;for(const m of ln.pigs)if(!m.dead)removeEnt(m);HN_P.line=null;
    /* a completed line restocks her ammunition to 6, then a Pig Storm */
    const have=hnPPlatPigs().length;for(let i=have;i<6;i++){const a=i*1.05;hnPPlatPig(A.plat[0]+0.5+Math.sin(a)*5,A.platY+1.02,A.plat[1]+0.5+Math.cos(a)*5,'mill');}
    if(e&&e.hf){e.storm=6;e.stormT=0;hnLog(e.hf,'lineDone',{});}}}

/* ---- the Big Lamp: the Lamp Cleat (Shears, or a player's Charge + the Plunger) drops it; winched back up in 12 s ---- */
function hnPCleat(cl,d,by){const how=HIT_HOW||'';const ok=hnShears(by,0)||((by==='Dan'||hnIsBot(by))&&/blast|charge|plunger/.test(how));
  if(!ok){hnSay('The rope holds. It wants cutting.',1.6,'cleat');return;}
  if(HN_P.lamp.st!=='up')return;HN_P.lamp={st:'fall',t:0,y:HN_P.lamp.y,by};mwS('pg_creak',cl.x,cl.y,cl.z);cl.pulled=1.5;
  if(MPF.fight)hnLog(MPF.fight,'lampDrop',{by});}
function hnPLampTick(dt,e){const L=HN_P.lamp,A=hnA();L.t+=dt;
  if(L.st==='fall'){L.y=Math.max(A.platY+1.6,69.5-24*L.t*L.t*0.5);
    if(L.y<=A.platY+1.6){L.st='down';L.t=0;mpShake(0.6,0.4);burstParticles(A.plat[0]+0.5,A.platY+1.5,A.plat[1]+0.5,B.PG_LAMP,24,1.2);mwS('pg_thump',A.plat[0],64,A.plat[1]);
      for(const t of hnPFoes()){if(Math.hypot(t.x-A.plat[0]-0.5,t.z-A.plat[1]-0.5)<2.2)purgHit(t,6,'the Pig','lamp',{force:1});}
      if(e&&e.hf&&!e.hf.dying&&Math.hypot(e.x-A.plat[0]-0.5,e.z-A.plat[1]-0.5)<2.4){const F=e.hf;hnWin(F,4.2,'lamp');hnHit(e,40,L.by||'Dan','lamp');
        e.st='lampStun';e.stT=0;hnSay('OOF!',1.2);hnLog(F,'lampHit',{by:L.by});}}}
  else if(L.st==='down'){if(L.t>1.2){L.st='winch';L.t=0;}}
  else if(L.st==='winch'){L.y=A.platY+1.6+(69.5-A.platY-1.6)*Math.min(1,L.t/12);if(L.t>=12){L.st='up';L.y=69.5;const cl=hnProp('bigpig','cleat');if(cl)cl.pulled=0;}}}

/* ---- the followspots: three beams, on her unless a tower was hit (then on the hitter for 20 s) ---- */
function hnPSpot(sp,d,by){const i=sp.si|0;if(!(by==='Dan'||hnIsBot(by)))return;HN_P.beams[i]={who:by,until:MP.clock+20};mwS('pg_clicks',sp.x,sp.y,sp.z);
  if(MPF.fight)hnLog(MPF.fight,'upstage',{i,by});}
function hnPBeamOn(i){const b=HN_P.beams[i];if(!b||b.until<=MP.clock){HN_P.beams[i]=null;return 'bigpig';}return b.who;}
function hnPBeamsOnHer(e){const F=e.hf;if(!F)return 0;if(F.phase<2||e.st==='admire'||e.st==='lampStun'||e.st==='preen')return 0;
  if(e.st==='pose')return 3;let n=0;for(let i=0;i<3;i++)if(hnPBeamOn(i)==='bigpig')n++;return n;}
function hnPUpstaged(){const c={};for(let i=0;i<3;i++){const w=hnPBeamOn(i);if(w!=='bigpig')c[w]=(c[w]||0)+1;}for(const k in c)if(c[k]>=2)return k;return null;}

/* ---- props and decorations ---- */
HN_PROPS.bigpig=function(spawn){const A=hnA();
  A.towers.forEach((t,i)=>{const sp=spawn('pgspot',t[0]+0.5,A.platY+5,t[1]+0.5,{kind:'spot'+i,si:i});sp.relay=(d,by)=>hnPSpot(sp,d,by);});
  const cl=spawn('pgcleat',A.cleat[0],A.cleat[1],A.cleat[2]+0.5,{kind:'cleat',yaw:-Math.PI/2});cl.relay=(d,by)=>hnPCleat(cl,d,by);};
PREG.mesh.pgspot=function(G,mats){const iron=hnMat(0x26262c),lens=hnBasic(0xfff4c8);
  const yoke=new THREE.Group();G.add(yoke);hnB(yoke,0.1,0.4,0.6,iron,0,0.2,0);const can=new THREE.Group();can.position.y=0.4;yoke.add(can);
  hnB(can,0.42,0.42,0.8,iron,0,0,0);hnB(can,0.36,0.36,0.04,lens,0,0,0.42);const legs=[];legs.can=can;legs.yoke=yoke;return {G,legs,mats};};
PREG.brain.pgspot=function(e,dt){e.vx=e.vy=e.vz=0;if(!e.mesh)return;e.mesh.position.set(e.x,e.y,e.z);
  const w=hnPBeamOn(e.si|0),tg=w==='bigpig'?hnAlive('bigpig'):(w==='Dan'?P:(agByName(w)&&agByName(w).e));
  const L=e.legs;if(L&&L.yoke&&tg){const dx=tg.x-e.x,dz=tg.z-e.z,dy=(tg.y+1)-e.y;L.yoke.rotation.y=Math.atan2(dx,dz);if(L.can)L.can.rotation.x=-Math.atan2(dy,Math.hypot(dx,dz));}
  e.beamTo=tg||null;};
HN_DECO.bigpig=function(d){const A=hnA(),g=d.g,gold=hnMat(0xc9a43a),vel=hnMat(0x8e1424),blk=hnMat(0x141418);
  /* the velvet rope at the foot */
  for(const sx of [-9.6,9.6]){hnB(g,0.14,1.0,0.14,gold,sx,deckY(A.rope)+1.5,A.rope+0.5);hnB(g,0.24,0.08,0.24,gold,sx,deckY(A.rope)+1.04,A.rope+0.5);}
  d.parts.rope=hnB(g,19.2,0.08,0.08,vel,0,deckY(A.rope)+1.8,A.rope+0.5);
  /* the vanity: a bulb-ringed mirror on a table, facing the House */
  const V=A.vanity,vg=new THREE.Group();vg.position.set(V[0]+0.5,V[1],V[2]+0.5);g.add(vg);
  hnB(vg,2.0,0.9,0.7,hnMat(0xf2e8d8),0,0.45,0);hnB(vg,1.6,1.5,0.08,hnBasic(0xc8d4e4),0,1.75,-0.1);
  for(let i=0;i<10;i++){const a=i/9;hnB(vg,0.12,0.12,0.12,hnBasic(0xffe28a),-0.85+a*1.7,2.55,-0.05);}
  for(let i=0;i<5;i++){hnB(vg,0.12,0.12,0.12,hnBasic(0xffe28a),-0.9,1.05+i*0.35,-0.05);hnB(vg,0.12,0.12,0.12,hnBasic(0xffe28a),0.9,1.05+i*0.35,-0.05);}
  /* the Big Lamp, its chain up to the gantry beam and over to the Lamp Cleat */
  const lamp=new THREE.Group();g.add(lamp);d.parts.lamp=lamp;
  hnB(lamp,2.0,1.2,2.0,blk,0,0,0);hnB(lamp,1.6,0.16,1.6,hnBasic(0xfff1b0),0,-0.66,0);hnB(lamp,2.3,0.2,2.3,hnMat(0x3a3a40),0,0.55,0);
  d.parts.chain=hnB(g,0.08,1,0.08,hnMat(0x6a6a70),0,0,0);d.parts.chain2=hnB(g,0.06,1,0.06,hnMat(0xd8c890),0,0,0);
  /* three followspot beams */
  d.parts.beams=[0,1,2].map(()=>{const m=HN_FXMAKE.beam();g.add(m);m.visible=false;return m;});
  d.tick=(dt,dd)=>{const L=HN_P.lamp,lp=dd.parts.lamp;lp.position.set(A.plat[0]+0.5,L.y,A.plat[1]+0.5);
    hnLineTo(dd.parts.chain,[A.plat[0]+0.5,L.y+0.6,A.plat[1]+0.5],[0.5,A.beamY,A.gantry[0][1]+0.5],0.08);
    hnLineTo(dd.parts.chain2,[0.5,A.beamY,A.gantry[0][1]+0.5],[A.cleat[0],A.cleat[1]+0.4,A.cleat[2]+0.5],0.06);
    const live=MPF.fight&&MPF.fight.name==='bigpig'&&!MPF.fight.over&&MPF.fight.phase>=2;
    for(let i=0;i<3;i++){const m=dd.parts.beams[i],sp=hnProp('bigpig','spot'+i);if(!live||!sp||!sp.beamTo){m.visible=false;continue;}
      const a=[sp.x,sp.y+0.4,sp.z],t=sp.beamTo,b=[t.x,(t===P?P.y:t.y),t.z],l=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
      m.visible=true;m.position.set(a[0],a[1],a[2]);m.scale.set(1,l,1);m.lookAt(b[0],b[1],b[2]);m.rotateX&&m.rotateX(-Math.PI/2);}};};

/* ---- meshes: the Pig, the pigs (plain / top hat / dynamite variants), the Hero Hog ---- */
function hnPPigMesh(prop,variant){const g=new THREE.Group(),pink=hnMat(0xf2a6c1),dk=hnMat(0xd886a6),k=hnMat(0x101010);
  const body=new THREE.Group();g.add(body);hnB(body,0.42,0.34,0.56,pink,0,0.32,0);const head=new THREE.Group();head.position.set(0,0.42,0.3);body.add(head);
  hnB(head,0.3,0.28,0.26,pink,0,0,0);hnB(head,0.14,0.1,0.06,dk,0,-0.03,0.15);hnB(head,0.05,0.05,0.03,k,-0.07,0.06,0.13);hnB(head,0.05,0.05,0.03,k,0.07,0.06,0.13);
  hnB(head,0.08,0.08,0.03,dk,-0.11,0.16,0.02);hnB(head,0.08,0.08,0.03,dk,0.11,0.16,0.02);
  hnB(body,0.06,0.06,0.12,dk,0,0.42,-0.3);
  const legs=[];for(const [x,z] of [[-0.13,0.17],[0.13,0.17],[-0.13,-0.17],[0.13,-0.17]]){const l=new THREE.Group();l.position.set(x,0.18,z);body.add(l);hnB(l,0.09,0.18,0.09,dk,0,-0.09,0);legs.push(l);}
  const hat=new THREE.Group();hat.position.set(0,0.16,0);head.add(hat);hnB(hat,0.3,0.03,0.3,k,0,0,0);hnB(hat,0.18,0.24,0.18,k,0,0.13,0);hat.visible=false;
  if(variant===1){body.scale.set(1.2,1.2,1.2);}
  if(variant===2){for(let i=-1;i<=1;i++)hnB(body,0.07,0.3,0.07,hnMat(0xc0283a),i*0.08,0.62,-0.05);hnB(body,0.03,0.16,0.03,hnMat(0x3a2a1a),0,0.84,-0.05);}
  g.userData.pig={body,legs,hat};return g;}
function hnPRedPig(m,on){const p=m&&m.userData&&m.userData.pig;if(!p)return;if(!p.red){p.red=hnB(p.body,0.44,0.05,0.58,hnBasic(0xd01a1a),0,0.5,0);}p.red.visible=!!on;}
PREG.mesh.pgtoss=function(G,mats){const m=hnPPigMesh(true);G.add(m);const P0=m.userData.pig;const legs=[];Object.assign(legs,{body:P0.body,legs:P0.legs,hat:P0.hat});return {G,legs,mats};};
PREG.mesh.pgpiglet=function(G,mats){const m=hnPPigMesh(true);G.add(m);const P0=m.userData.pig;
  const legs=P0.legs.map((l,i)=>({g:l,ph:i%2?Math.PI:0,ax:'x',base:0,amp:0.6}));return {G,legs,mats};};
/* the Hero Hog: a brown boar standing tall, tusks, a bristly crest and a short red cape */
function hnPHogMesh(){const g=new THREE.Group(),hide=hnMat(0x6a4a3a),dk=hnMat(0x4a3228),snout=hnMat(0x9a6a5a),tusk=hnMat(0xf2ead2),cape=hnMat(0xc82a2a),k=hnMat(0x101010);
  const body=new THREE.Group();g.add(body);hnB(body,0.44,0.62,0.3,hide,0,0.85,0);for(const s of [-1,1])hnB(body,0.16,0.55,0.18,dk,s*0.12,0.28,0);
  hnB(body,0.48,0.64,0.04,cape,0,0.82,-0.18);hnB(body,0.5,0.06,0.12,cape,0,1.14,-0.12);
  const head=new THREE.Group();head.position.set(0,1.32,0);body.add(head);hnB(head,0.36,0.34,0.36,hide,0,0,0);hnB(head,0.22,0.14,0.14,snout,0,-0.08,0.22);
  hnB(head,0.06,0.06,0.03,k,-0.08,0.07,0.18);hnB(head,0.06,0.06,0.03,k,0.08,0.07,0.18);hnB(head,0.08,0.1,0.34,dk,0,0.2,-0.02);
  for(const s of [-1,1]){const t=hnB(head,0.04,0.12,0.04,tusk,s*0.1,-0.05,0.28);t.rotation.z=-s*0.3;hnB(head,0.1,0.12,0.04,dk,s*0.16,0.2,0.02);}
  for(const s of [-1,1])hnB(body,0.12,0.5,0.14,hide,s*0.3,0.86,0);g.userData.hog={body};return g;}
PREG.mesh.pghog=function(G,mats){const m=hnPHogMesh();G.add(m);return {G,legs:[],mats};};
/* the Hero Hog holds the landing he lands on and shoves anyone who comes close: "Stand aside, I'm saving her!" */
PREG.brain.pghog=function(e,dt,T){if(e.pheld){if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);return;}if(e.pthrown&&hnPThrownFly(e,dt))return;
  e.vx=e.vy=e.vz=0;e.onGround=true;const h=e.home||[e.x,e.y,e.z];e.x+=(h[0]-e.x)*Math.min(1,dt*4);e.z+=(h[2]-e.z)*Math.min(1,dt*4);e.y=h[1];
  e.shT=Math.max(0,(e.shT||0)-dt);const t=purgFoe(e,6);if(t){const tb=hnFoeBody(t);e.yaw=Math.atan2(tb.x-e.x,tb.z-e.z);
    if(e.shT<=0&&Math.hypot(tb.x-e.x,tb.z-e.z)<1.35&&Math.abs((t===P?P.y:tb.y)-e.y)<1.8){e.shT=1.2;purgHit(t,2,'the Hero Hog','link',{src:e});hnPush(t,0,5,-6);
      if((MPF.tick%3)===0)hnSay("Stand aside, I'm saving her!",1.6,'hogline');}}
  if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw||0;}};
/* the Pig: a very large plain pink pig standing on her hind trotters (snout, ears, a curly tail). gl = the forearms (raised for
   the Diva Toss), tell = the red flash on her trotter that warns of a SLAM */
PREG.mesh.pgbigpig=function(G,mats){const pink=new THREE.MeshLambertMaterial({color:0xf2a6c1}),belly=new THREE.MeshLambertMaterial({color:0xf8c8d6}),
    hoof=hnMat(0x4a3038),k=hnMat(0x101010),w=hnMat(0xf6f3ea),snout=hnMat(0xd886a6);
  mats.push(pink,belly);
  const body=new THREE.Group();G.add(body);
  for(const s of [-1,1]){hnB(body,0.16,0.3,0.18,pink,s*0.12,0.15,0);hnB(body,0.17,0.06,0.19,hoof,s*0.12,0.03,0.01);}
  hnB(body,0.54,0.6,0.42,pink,0,0.6,0);hnB(body,0.4,0.44,0.03,belly,0,0.56,0.215);hnB(body,0.46,0.26,0.36,pink,0,0.98,0);
  hnB(body,0.05,0.05,0.12,snout,0,0.62,-0.26);hnB(body,0.05,0.1,0.05,snout,0.03,0.68,-0.31);
  const head=new THREE.Group();head.position.set(0,1.16,0);body.add(head);
  hnB(head,0.38,0.34,0.34,pink,0,0.17,0);
  hnB(head,0.18,0.13,0.1,snout,0,0.12,0.2);hnB(head,0.03,0.04,0.02,k,-0.04,0.12,0.255);hnB(head,0.03,0.04,0.02,k,0.04,0.12,0.255);
  for(const s of [-1,1]){const ear=hnB(head,0.12,0.13,0.04,snout,s*0.15,0.37,0.04);ear.rotation.z=-s*0.45;}
  const jaw=new THREE.Group();jaw.position.set(0,0.02,-0.1);head.add(jaw);hnB(jaw,0.3,0.06,0.26,pink,0,-0.02,0.12);
  const eyes=hnEyes(head,0.08,0.08,0.26,0.17,w,k);
  const arms=[],gl=[];for(const s of [-1,1]){const a=new THREE.Group();a.position.set(s*0.29,0.98,0);body.add(a);hnB(a,0.12,0.22,0.12,pink,0,-0.1,0);
    const g2=new THREE.Group();a.add(g2);hnB(g2,0.12,0.3,0.12,pink,0,-0.34,0);hnB(g2,0.13,0.07,0.13,hoof,0,-0.52,0);gl.push(g2);arms.push(a);}
  const tell=hnB(gl[1],0.16,0.16,0.16,hnBasic(0xff5a3a),0,-0.54,0);tell.visible=false;
  const legs=[];Object.assign(legs,{body,head,jaw,eyes,arms,gl,tell});return {G,legs,mats};};
function hnPAnim(e,dt,tx,ty,tz,lock){if(!e.mesh)return;e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;
  if(!e.pdisp&&e.mats){e.pdisp=1;e.pmats=e.mats.slice();}
  const s=e.hrS;if(s){s.pose=e.st==='pose'?1:0;s.charge=e.st==='charge'||e.st==='chargeTell'?1:0;s.toss=(e.st==='tossTell'?0.3:(e.st==='lift'||e.st==='smooch')?0.7:e.st==='hurl'?1:0);
    s.preen=(e.st==='preen'||e.st==='admire')?1:0;if(s.throwT>0)s.throwT=Math.max(0,s.throwT-dt*2.5);}
  const L=e.legs;if(!L||!L.head)return;const t=MP.clock;let jaw=0.05+Math.abs(Math.sin(t*7))*0.08,ar=0,al=0,bx=0,glv=0;
  switch(e.st){case 'tossTell':glv=Math.min(1,e.stT/1.0);ar=al=-0.4;break;case 'lift':case 'smooch':ar=al=-3.0;jaw=0.3;break;case 'hurl':ar=al=-2.2+e.stT*6;break;
    case 'chopTell':ar=-2.6;break;case 'chop':ar=0.6;jaw=0.5;break;case 'chargeTell':bx=0.5;jaw=0.4;break;case 'charge':bx=0.6;break;
    case 'admire':case 'preen':al=-1.8+Math.sin(t*6)*0.3;jaw=0.15;break;case 'pose':ar=-2.8;al=-0.6;break;case 'lampStun':bx=Math.sin(t*5)*0.3;break;
    case 'swoon':bx=-0.4-e.stT*0.4;break;case 'roll':bx=t*12;break;case 'throw':case 'top':ar=-1.2-Math.max(0,s?s.throwT:0)*1.4;break;}
  hnJaw(L.jaw,jaw);L.arms[1].rotation.x=ar;L.arms[0].rotation.x=al;L.body.rotation.x=bx;
  for(const g2 of L.gl)g2.position.y=glv*0.18;L.tell.visible=e.st==='chopTell'&&Math.sin(t*30)>0;
  hnLook(L.eyes,e,tx,ty,tz,lock,t);}

/* ---- damage rules: -25% per beam on her, x2 while admiring / preening / chopping her chorus, x1.5 melee under the lamp ---- */
HN_MULT.pgbigpig=function(e,F,d,by,how){if(hnIsBot(by)&&HN_P.held)HN_P.allyT=MP.clock;
  if(e.st==='admire'||e.st==='preen'||e.st==='chorusChop')return d*2;
  if(e.st==='lampStun')return how==='melee'?d*1.5:d;
  const n=hnPBeamsOnHer(e);return d*(1-0.25*n);};

/* ---- fight hooks ---- */
HN_SPAWN.bigpig=F=>[0.5,hnA().platY+1.02,122.6,Math.PI];
HN_INIT.bigpig=(F,e)=>{hnPReset();e.st='top';e.stT=0;F.data={};const A=hnA();
  for(let i=0;i<6;i++){const a=i*1.05;hnPPlatPig(A.plat[0]+0.5+Math.sin(a)*5,A.platY+1.02,A.plat[1]+0.5+Math.cos(a)*5,'mill');}};
HN_CAM.bigpig=(F,t)=>hnCamAt(F,t,[1.6,-3.4,-9]);
HN_GO.bigpig=(F,e)=>{hnSay('Who let YOU in?',2.2);e.st='top';e.stT=0;HN_P.throwT=0.8;};
HN_PHASE.bigpig=(F,e,ph)=>{if(ph===2){hnSay('Close-up, please.',1.8);e.st='sweep';e.stT=0;F.data.demoDone=false;}
  if(ph===3){hnSay('And now... the FINALE!',2);HN_P.chorT=4;e.st='idle';e.stT=0;}};
HN_PHRESET.bigpig=(F,e)=>{const keepT=HN_P.tint;hnPCleanup();hnPReset();HN_P.tint=keepT;if(e&&!e.dead){e.st=F.phase===1?'top':'gloat';e.stT=0;
  if(F.phase===1){e.x=0.5;e.z=122.6;e.y=hnA().platY+1.02;}else{e.x=0.5;e.z=hnA().plat[1]+0.5;e.y=hnA().platY+1.02;}
  if(F.phase>=2){const A=hnA();for(let i=0;i<6;i++){const a=i*1.05;hnPPlatPig(A.plat[0]+0.5+Math.sin(a)*5,A.platY+1.02,A.plat[1]+0.5+Math.cos(a)*5,'mill');}}}};
HN_GLOAT.bigpig=(F,e)=>{hnSay('Thank you, thank you, you are too kind.',2.6,'gloat');};
HN_HINT.bigpig=F=>{const A=hnA();if(F.phase===1){HN_P.tint='next';return {x:0.5,y:A.platY+1.5,z:122.5,boss:'bigpig',what:'nextPiglet'};}
  if(F.phase===2)return {x:A.vanity[0]+0.5,y:A.vanity[1]+1.6,z:A.vanity[2]+0.4,boss:'bigpig',what:'vanity'};
  return {x:A.cleat[0],y:A.cleat[1]+0.3,z:A.cleat[2]+0.5,boss:'bigpig',what:'cleat'};};
HN_END.bigpig=(F,why)=>{hnPCleanup();hnPReset();};
HN_DIE.bigpig=(F,e)=>{e.st='swoon';e.stT=0;hnPCleanup(true);hnSay('Tell my fans... it was the lighting...',2.6);mwS('pg_gasp');};
function hnPCleanup(keepPiglets){for(const m of entities){if(m.dead||m.t!=='mob')continue;
    if((m.mt==='pgtoss')||(!keepPiglets&&(m.mt==='pghog'||m.mt==='pgpiglet')&&m.hnArena==='bigpig'))removeEnt(m);}
  for(const p of entities)if(!p.dead&&p.t==='pproj'&&(p.kind==='pig'||p.kind==='hog'||p.kind==='porkbomb'||p.kind==='link')&&p.owner==='the Pig')puRemove(p);
  HN_P.line=null;if(HN_P.heldBot&&HN_P.heldBot.A&&HN_P.heldBot.A.pgrab)HN_P.heldBot.A.pgrab.until=0;HN_P.heldBot=null;if(HN.danK&&HN.danK.by==='the Pig')HN.danK=null;}

/* ---- summon: Dan steps over the velvet rope ---- */
HN_SUMMON.bigpig=function(){const A=hnA();if(!P||P.dead)return;if(P.z>A.rope+0.6&&P.z<A.rope+3&&Math.abs(P.x-0.5)<9.6&&P.y<deckY(70)+4&&(HN.ropeLast||0)<=A.rope+0.6)hnFightStart('bigpig');HN.ropeLast=P.z;};
/* bots never cross the rope while she is unbeaten and Dan is outside (P5 also refuses); one that does gets nudged back */
HN_IDLE.bigpig=function(dt){const A=hnA();if(MP.dead.bigpig||(MPF.fight&&!MPF.fight.over))return;if(typeof AG_ACTIVE==='undefined'||!AG_ACTIVE)return;
  for(const a of AGENTS){const b=a.e;if(!b||a.dead||!a.online||a.dim!==DIM)continue;if(b.z>A.rope+0.2&&b.z<A.rope+4&&Math.abs(b.x-0.5)<9.6){b.z=A.rope-0.6;b.vz=Math.min(0,b.vz||0);}}};

/* ---- the brain ---- */
function hnPMove(e,tx,tz,spd,dt){const dx=tx-e.x,dz=tz-e.z,d=Math.hypot(dx,dz);if(d<0.06)return true;const s=Math.min(d,spd*dt);e.x+=dx/d*s;e.z+=dz/d*s;e.yaw=Math.atan2(dx,dz);
  const A=hnA();if(hnPOnPlat(e.x,A.platY+1,e.z))e.y=A.platY+1.02;return d-s<0.06;}
function hnPMirrorCheck(e){if(!hnMirrorRaised())return false;const d=Math.hypot(P.x-e.x,P.z-e.z);if(d>8||!hnFacing(e.x,e.y,e.z,0.5))return false;
  const n=hnMirrorLook();if(n>=4){hnMirrorBreak();hnSay("That's not even my good side!",2);if(e.hf)hnLog(e.hf,'mirrorChopped',{});e.st='chop';e.stT=0;return true;}
  e.st='admire';e.stT=0;if(e.hf){hnWin(e.hf,3,'mirror');hnLog(e.hf,'mirror',{n});}hnSay('Gorgeous...',1.6,'darling');mwS('pg_smooch',e.x,e.y,e.z);return true;}
PREG.brain.pgbigpig=function(e,dt,T){e.vx=e.vy=e.vz=0;hnDanKTick(dt);
  const F=e.hf;if(!F||F.over){if(!F)removeEnt(e);return;}const A=hnA();e.stT+=dt;
  const tg=hnPTarget(e,40),tb=tg?hnFoeBody(tg):null;const tx=tb?tb.x:P.x,ty=tb?(tg===P?P.y+1.5:tb.y+1.5):P.y+1.5,tz=tb?tb.z:P.z;let lock=0;
  if(CUT.on&&CUT.script){hnPAnim(e,dt,P.x,P.y+1.5,P.z,0.3);return;}
  if(F.intro){hnPAnim(e,dt,P.x,P.y+1.5,P.z,1);return;}
  hnPLampTick(dt,e);
  if(F.dying){hnPDying(e,F,dt);hnPAnim(e,dt,tx,ty,tz,0);return;}
  if(e.pstagger>MP.clock&&HN_P.held==null){e.stT-=dt;hnPAnim(e,dt,tx,ty,tz,0);return;}
  if(F.gloat>0||F.wait){if(e.st!=='gloat'){e.st='gloat';e.stT=0;}e.yaw=Math.PI;hnPAnim(e,dt,P.x,P.y+1.5,P.z,0.3);return;}
  if(e.st==='gloat'){e.st=F.phase===1?'top':'idle';e.stT=0;}
  /* early end of P1: Dan reached the Star Platform. P2's pool is then her HP - 105 */
  if(F.phase===1&&P&&!P.dead&&hnPOnPlat(P.x,P.y,P.z)&&!F.pend){const hp=e.hp;hnPhaseUp(F);F.topOv=hp;F.capOv=Math.max(1,Math.floor(0.45*(hp-105)));hnLog(F,'earlyP2',{hp});}
  hnPLineTick(dt,e);
  /* player-thrown bots hitting her (P2's Pig Mitt throw writes a.pgrab.k='thrown', by a player) */
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS){const g=a.pgrab,b=a.e;if(!g||!b||g.k!=='thrown'||g.until<=MP.clock)continue;
    if(g.by==='the Pig'){if(P&&!P.dead&&Math.hypot(b.x-P.x,b.z-P.z)<1.2&&Math.abs(b.y-P.y)<1.8){purgHit(P,6,'the Pig','toss',{force:1,src:b});purgHit(b,6,'the Pig','toss',{force:1});g.until=0;}continue;}
    if(Math.hypot(b.x-e.x,b.z-e.z)<1.4&&Math.abs(b.y-e.y)<2.2){hnWin(F,2.2,'thrown bot');hnHit(e,18,g.by||'Dan','pig');HN_P.stopT=2;g.until=0;hnSay('HOW DARE—',1.4,'howdare');hnLog(F,'botBack',{by:g.by});}}
  /* pig mobs or the Hero Hog thrown at her by a player (P2's Pig Mitt): 18, the Hero Hog x2 ("NOT YOU"), and she stops throwing for 2 s */
  for(const m of entities){if(m.dead||m.t!=='mob'||!m.pthrown||m.pheld)continue;const by=m.pthrown.by;if(!(by==='Dan'||hnIsBot(by)))continue;
    if(m.mt!=='pgtoss'&&m.mt!=='pgpiglet'&&m.mt!=='pghog'&&m.mt!=='pgpig')continue;
    if(Math.hypot(m.x-e.x,m.z-e.z)<1.5&&m.y>e.y-0.8&&m.y<e.y+2.6){m.pthrown=null;const link=m.mt==='pghog';hnWin(F,2.2,'thrown '+m.mt);hnHit(e,link?36:18,by,'pig');
      HN_P.stopT=2;hnSay(link?'NOT YOU!':'HOW DARE—',1.4,'howdare');hnLog(F,'pigBack',{kind:m.mt,by});
      if(link){m.vx=8;m.vy=6;m.vz=-4;m.pthrown={by:'the Pig',t:MP.clock};}else if(m.mt==='pgtoss'){m.vx=m.vz=0;}}
    else if(HN_P.line&&!HN_P.line.fallen&&m.mt!=='pghog'){for(const c of HN_P.line.pigs)if(!c.dead&&Math.hypot(m.x-c.x,m.z-c.z)<0.9&&Math.abs(m.y-c.y)<1.2){m.pthrown=null;hnPDominoes(by);break;}}}
  HN_P.stopT=Math.max(0,HN_P.stopT-dt);HN_P.chopCd=Math.max(0,HN_P.chopCd-dt);HN_P.botCd=Math.max(0,HN_P.botCd-dt);HN_P.slapT=Math.max(0,HN_P.slapT-dt);
  const blind=hnBlind(e);
  if(F.phase===1){
    /* P1: at the top edge, a throw every 1.2 s down alternating lanes */
    e.y=A.platY+1.02;const lx=A.laneX[HN_P.lane]+0.5;hnPMove(e,lx,122.6,3,dt);e.yaw=Math.PI;
    HN_P.throwT=(HN_P.throwT==null?1.2:HN_P.throwT)-dt;
    if(HN_P.throwT<=0&&HN_P.stopT<=0){HN_P.throwT=1.2;HN_P.n++;const n=HN_P.n;
      const kind=n%7===0?'porkbomb':n%5===0?'link':(n%3===2?'hog':'pig');
      const lane=blind?((MPF.tick*7)%3):HN_P.lane;hnPThrowDown(e,kind,lane);e.st='throw';e.stT=0;hnLog(F,'throw',{kind,lane});
      HN_P.lane=(HN_P.lane+1)%3;}
    if(e.st==='throw'&&e.stT>0.3)e.st='top';
    hnPAnim(e,dt,tx,ty,tz,0.6);return;}
  /* P2 / P3 on the Star Platform */
  const mirrorable=e.st==='chargeTell'||e.st==='charge'||e.st==='tossTell'||e.st==='lunge'||e.st==='pose';
  if(mirrorable&&hnPMirrorCheck(e)){hnPAnim(e,dt,P.x,P.y+1.5,P.z,1);return;}
  if(e.storm>0&&e.st==='idle'){e.stormT=(e.stormT||0)-dt;if(e.stormT<=0){e.stormT=0.5;e.storm--;const t=hnPTarget(e,30);if(t)hnPThrowAt(e,t,'storm');if(e.storm<=0){e.st='toCentre';e.stT=0;}}}
  switch(e.st){
    case 'sweep':{const V=A.vanity;if(hnPMove(e,V[0]+0.5,V[2]-0.6,4,dt)||e.stT>5){e.st='preen';e.stT=0;e.yaw=0;
        if(!F.data.demoDone){F.data.demoDone=true;hnWin(F,3,'preen');hnLog(F,'selfDemo',{});}hnSay('Gorgeous...',1.8,'darling');}break;}
    case 'preen':e.yaw=0;if(e.stT>=3){e.st='idle';e.stT=0;}break;
    case 'admire':e.yaw=Math.atan2(P.x-e.x,P.z-e.z);if(e.stT>=3){e.st='idle';e.stT=0;}break;
    case 'idle':{lock=0.4;
      if(F.phase===3&&!HN_P.line&&!(e.storm>0)){HN_P.chorT-=dt;if(HN_P.chorT<=0){HN_P.chorT=15;hnPLineStart(e);e.st='lineWatch';e.stT=0;break;}}
      const up=hnPUpstaged();if(up){e.target=up;e.st='chargeTell';e.stT=0;hnSay('THAT SPOTLIGHT IS MINE.',2,'upstage');break;}
      HN_P.tossT-=dt;if(HN_P.tossT<=0&&tg&&!(e.storm>0)){HN_P.tossT=8;e.target=hnFoeName(tg);e.st='tossTell';e.stT=0;break;}
      if(tg&&HN_P.chopCd<=0&&Math.hypot(tb.x-e.x,tb.z-e.z)<5){HN_P.chopCd=6;e.st='chopTell';e.stT=0;break;}
      HN_P.fastT-=dt;if(HN_P.fastT<=0&&HN_P.stopT<=0&&!(e.storm>0)){HN_P.fastT=3;const pigs=hnPPlatPigs().filter(m=>m.pst==='mill');
        if(pigs.length&&tg){let best=pigs[0],bd=1e9;for(const m of pigs){const d=Math.hypot(m.x-e.x,m.z-e.z);if(d<bd){bd=d;best=m;}}removeEnt(best);
          const t2=blind?hnPFoes()[(MPF.tick*3)%Math.max(1,hnPFoes().length)]:tg;if(t2)hnPThrowAt(e,t2,'fast');hnLog(F,'fastball',{});}
        else if(!hnPPlatPigs().length&&HN_P.botCd<=0){const bot=hnPNearestBot(e);if(bot){HN_P.botCd=6;hnPThrowBot(e,bot,tg);}}}
      /* a slap if you stand next to her between moves */
      if(tb&&HN_P.slapT<=0&&Math.hypot(tb.x-e.x,tb.z-e.z)<1.3&&Math.abs((tg===P?P.y:tb.y)-e.y)<1.6){HN_P.slapT=1.4;purgHit(tg,4,'the Pig','slap',{src:e});}
      /* strut */
      const a=MP.clock*0.35,sx=A.plat[0]+0.5+Math.sin(a)*3.5,sz=A.plat[1]+0.5+Math.cos(a*1.3)*3;hnPMove(e,sx,sz,1.4,dt);if(tb)e.yaw=Math.atan2(tb.x-e.x,tb.z-e.z);break;}
    /* every tell tracks its target for its first third, then LOCKS: the line on the floor is the lane, so a sidestep dodges */
    case 'chargeTell':{lock=1;const t=hnPByName(e.target);if(!t){e.st='idle';break;}const tb2=hnFoeBody(t);if(e.stT<0.35)e.yaw=Math.atan2(tb2.x-e.x,tb2.z-e.z);
      if(e.stT<0.05){const f=e;hnAimLine(()=>[f.x,f.y+0.05,f.z],()=>[f.x+Math.sin(f.yaw)*12,f.y+0.05,f.z+Math.cos(f.yaw)*12],1.0,0.35);}
      if(e.stT>=1.0){e.st='charge';e.stT=0;e.cdir=[Math.sin(e.yaw),Math.cos(e.yaw)];e.cdist=0;e.chit={};}break;}
    case 'charge':{const s=16*dt;e.x+=e.cdir[0]*s;e.z+=e.cdir[1]*s;e.cdist+=s;
      for(const t of hnPFoes()){const k=hnFoeName(t);if(e.chit[k])continue;if(Math.hypot(t.x-e.x,t.z-e.z)<1.3){e.chit[k]=1;purgHit(t,8,'the Pig','charge',{force:1,kx:e.cdir[0],kz:e.cdir[1]});hnPush(t,e.cdir[0]*14,9,e.cdir[1]*14);}}
      if(e.cdist>=12||!hnPOnPlat(e.x,A.platY+1,e.z)){if(!hnPOnPlat(e.x,A.platY+1,e.z)){e.x-=e.cdir[0]*s;e.z-=e.cdir[1]*s;}
        for(let i=0;i<3;i++)if(HN_P.beams[i]&&HN_P.beams[i].who===e.target)HN_P.beams[i]=null;e.st='idle';e.stT=0;}break;}
    case 'tossTell':{lock=1;const t=hnPByName(e.target);if(!t){e.st='idle';break;}const tb2=hnFoeBody(t);if(e.stT<0.4)e.yaw=Math.atan2(tb2.x-e.x,tb2.z-e.z);
      if(e.stT>=1.0){e.st='lunge';e.stT=0;e.cdir=[Math.sin(e.yaw),Math.cos(e.yaw)];e.cdist=0;}break;}
    case 'lunge':{const s=13*dt;e.x+=e.cdir[0]*s;e.z+=e.cdir[1]*s;e.cdist+=s;if(!hnPOnPlat(e.x,A.platY+1,e.z)){e.x-=e.cdir[0]*s;e.z-=e.cdir[1]*s;e.cdist=99;}
      const t=hnPByName(e.target);
      if(t){const tb2=hnFoeBody(t);if(Math.hypot(tb2.x-e.x,tb2.z-e.z)<1.25&&Math.abs((t===P?P.y:tb2.y)-e.y)<2){hnPGrab(e,t);break;}}
      if(e.cdist>=10){e.st='idle';e.stT=0;}break;}
    case 'smooch':case 'lift':{const held=HN_P.held;
      if(held==='Dan'&&HN.danK&&HN.danK.by==='the Pig'){
        const edge=MB.l&&!HN_P.pressL;HN_P.pressL=MB.l;if(edge)HN_P.presses++;
        if(HN_P.presses>=4||HN_P.allyT>MP.clock-0.5||(hnMirrorRaised()&&hnPMirrorBreakLift())){hnPRelease(e,'escape');break;}}
      if(e.st==='smooch'&&e.stT>=0.5){e.st='lift';e.stT=0;}
      else if(e.st==='lift'&&e.stT>=1.0){hnPHurl(e);}break;}
    case 'hurl':if(e.stT>0.4){e.st='idle';e.stT=0;}break;
    case 'chopTell':{lock=1;if(tb&&e.stT<0.35)e.yaw=Math.atan2(tb.x-e.x,tb.z-e.z);if(e.stT>=0.9){e.st='chop';e.stT=0;hnSay('SLAM!',1,'chopglove');hnPChopWave(e);}break;}
    case 'chop':if(e.stT>0.6){e.st='idle';e.stT=0;}break;
    case 'lineWatch':{e.yaw=Math.PI/2;const ln=HN_P.line;if(!ln){e.st=e.storm>0?'idle':'toCentre';e.stT=0;}break;}
    case 'stormOver':{const ln=HN_P.line;const tx2=ln&&ln.pigs[0]?ln.pigs[0].x-1.4:e.x,tz2=ln?ln.z0+5:e.z;if(hnPMove(e,tx2,tz2,5,dt)||e.stT>2.5){e.st='chorusChop';e.stT=0;hnWin(F,3,'chorusChop');hnSay('USELESS! SLAM! SLAM!',2);}break;}
    case 'chorusChop':{e.yaw=-Math.PI/2;if(e.stT>=3){const ln=HN_P.line;if(ln){for(const m of ln.pigs)if(!m.dead){m.pbat={vx:6,vy:4,vz:0,d:30};}ln.fallT=4.2;}e.st='toCentre';e.stT=0;}break;}
    case 'toCentre':{if(hnPMove(e,A.plat[0]+0.5,A.plat[1]+0.5,3.5,dt)||e.stT>4){e.st='pose';e.stT=0;e.yaw=Math.PI;hnSay('Hold your applause. No, release it.',2,'pose');hnLog(F,'pose',{});}break;}
    case 'pose':F.fullLit=1;e.yaw=Math.PI;if(e.stT>=3){F.fullLit=0;e.st='idle';e.stT=0;}break;
    case 'lampStun':F.fullLit=0;if(e.stT>=4){e.st='idle';e.stT=0;}break;
    default:e.st='idle';e.stT=0;}
  if(e.st!=='pose')F.fullLit=hnPBeamsOnHer(e)>=3?1:0;
  hnPAnim(e,dt,tx,ty,tz,lock);};
function hnPByName(n){if(n==='Dan')return P&&!P.dead?P:null;const a=agByName(n);return a&&a.e&&!a.dead?a.e:null;}
function hnPNearestBot(e){let best=null,bd=1e9;if(typeof AG_ACTIVE==='undefined'||!AG_ACTIVE)return null;
  for(const a of AGENTS){const b=a.e;if(!b||a.dead||!a.online||a.dim!==DIM||(a.pgrab&&a.pgrab.until>MP.clock))continue;const d=Math.hypot(b.x-e.x,b.z-e.z);if(d<bd){bd=d;best=b;}}return best;}
function hnPThrowBot(e,bot,tg){const tb=tg?hnFoeBody(tg):P;const T=0.8,v=aimLob(e.x,e.y+2,e.z,tb.x,(tg===P?P.y:tb.y)+0.6,tb.z,T);
  hnGrabBot(bot,'thrown',{by:'the Pig',src:e,vx:v[0],vy:v[1],vz:v[2],x:e.x,y:e.y+2,z:e.z,dur:3});mwS('pg_whoosh',e.x,e.y+2,e.z);
  hnSay('Catch!',1,'catchbot');if(e.hf)hnLog(e.hf,'throwBot',{bot:bot.A&&bot.A.name});}
/* the Diva Toss: smooch, lift overhead for 1 s, hurl at another player in line (both 6) or down the stairs (landing <= 6) */
function hnPGrab(e,t){e.st='smooch';e.stT=0;HN_P.presses=0;HN_P.pressL=!!MB.l;mwS('pg_smooch',e.x,e.y,e.z);
  if(t===P){HN_P.held='Dan';hnDanK('hold',{by:'the Pig',at:()=>[e.x+Math.sin(e.yaw)*0.2,e.y+2.6,e.z+Math.cos(e.yaw)*0.2]});}
  else{HN_P.held=t.A&&t.A.name;HN_P.heldBot=t;hnGrabBot(t,'held',{by:'the Pig',src:e,dur:2.2,x:e.x,y:e.y+2.6,z:e.z});}
  if(e.hf)hnLog(e.hf,'grab',{who:HN_P.held});}
function hnPMirrorBreakLift(){const n=hnMirrorLook();if(n>=4){hnMirrorBreak();hnSay("That's not even my good side!",2);return false;}hnSay('Gorgeous...',1.2,'darling');return true;}
function hnPRelease(e,why){if(HN.danK&&HN.danK.by==='the Pig')HN.danK=null;if(HN_P.heldBot&&HN_P.heldBot.A&&HN_P.heldBot.A.pgrab)HN_P.heldBot.A.pgrab.until=0;
  HN_P.held=null;HN_P.heldBot=null;e.st='admire';e.stT=1.6;if(e.hf)hnLog(e.hf,'tossEscape',{why});if(P&&!P.dead){P.vy=4;}}
function hnPHurl(e){const A=hnA(),held=HN_P.held;e.st='hurl';e.stT=0;mwS('pg_whoosh',e.x,e.y+2.6,e.z);
  const others=hnPFoes().filter(t=>hnFoeName(t)!==held);let tgt=null,bd=14;for(const t of others){const d=Math.hypot(t.x-e.x,t.z-e.z);if(d<bd){bd=d;tgt=t;}}
  const from=[e.x,e.y+2.6,e.z];let to,T;
  if(tgt){const tb=hnFoeBody(tgt);to=[tb.x,(tgt===P?P.y:tb.y)+0.8,tb.z];T=0.7;}
  else{const z=A.landings[1][0]+2,lx=A.laneX[1]+0.5;to=[lx,hnPTopAt(lx,z)+1.2,z];T=1.25;}
  const v=aimLob(from[0],from[1],from[2],to[0],to[1],to[2],T);
  if(held==='Dan'){MP.stats.thrown=(MP.stats.thrown|0)+1;hnDanK('fly',{by:'the Pig',how:'toss',vx:v[0],vy:v[1],vz:v[2],cap:6,
      check:K=>{if(!tgt||tgt===P)return false;const tb=hnFoeBody(tgt);if(Math.hypot(tb.x-P.x,tb.z-P.z)<1.3&&Math.abs((tb.y||0)-P.y)<2){HN.danK=null;
        purgHit(P,6,'the Pig','toss',{force:1});purgHit(tgt,6,'the Pig','toss',{force:1});return true;}return false;}});}
  else if(HN_P.heldBot){hnGrabBot(HN_P.heldBot,'thrown',{by:'the Pig',src:e,vx:v[0],vy:v[1],vz:v[2],x:from[0],y:from[1],z:from[2],dur:3});}
  HN_P.held=null;HN_P.heldBot=null;if(e.hf)hnLog(e.hf,'hurl',{at:tgt?hnFoeName(tgt):'stairs'});}
/* the SLAM: an 8-block shockwave line, 8 damage and a big knockback */
function hnPChopWave(e){const dx=Math.sin(e.yaw),dz=Math.cos(e.yaw);
  for(let i=1;i<=8;i++)hnPuff(e.x+dx*i,e.y+0.2,e.z+dz*i,0.5,0.5,0.4);
  for(const t of hnPFoes()){const rx=t.x-e.x,rz=t.z-e.z,along=rx*dx+rz*dz,side=Math.abs(rx*dz-rz*dx);
    if(along>0&&along<8.5&&side<1.4&&Math.abs((t===P?P.y:t.y)-e.y)<2.5){purgHit(t,8,'the Pig','chop',{force:1,kx:dx,kz:dz});hnPush(t,dx*12,7,dz*12);}}}
/* the death: she swoons, topples off the platform edge and rolls down the entire staircase */
function hnPDying(e,F,dt){const A=hnA();
  switch(e.st){
    case 'swoon':if(e.stT>=1.6){e.st='toEdge';e.stT=0;}break;
    case 'toEdge':if(hnPMove(e,0.5,122.4,3,dt)||e.stT>3){e.st='roll';e.stT=0;e.rz=122.4;}break;
    case 'roll':{e.rz-=6*dt;const top=hnPTopAt(0.5,e.rz),base=top+1.02,hop=Math.abs(Math.sin(e.rz*Math.PI/2))*0.5;e.z=e.rz;e.x=0.5;e.y=base+hop;
      for(const t of hnPFoes()){if(Math.abs(t.x-0.5)<2.6&&Math.abs(t.z-e.z)<1.1){const k='rolled'+hnFoeName(t);if(!F.data[k]){F.data[k]=1;purgHit(t,2,'the Pig','roll',{force:1});hnPush(t,(t.x>=0.5?1:-1)*8,4,0);}}}
      if(e.rz<A.stairZ0-1.5){e.st='heap';e.stT=0;e.y=deckY(68)+1.02;mwS('pg_thump',e.x,e.y,e.z);}break;}
    case 'heap':if(e.stT>=1.2){hnFightWon(F);}break;
    default:e.st='swoon';e.stT=0;}}
Object.assign(PGEX,{getHNP:()=>HN_P,hnPThrowDown,hnPThrowAt,hnPPlatPigs,hnPLineStart,hnPDominoes,hnPCleat,hnPSpot,hnPTarget,hnDanK,hnPOnPlat,hnPRelease});
