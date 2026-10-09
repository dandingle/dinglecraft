/* ---- PART 57: m2_adds.js ---- */
/* ===================================================================== */
/* PART 57 m2 (M2): the leftovers (bible 11). Morsels (the world trying  */
/* to get back into his mouth), Husks (what is left of earlier           */
/* architects: they fight like players and build), Bloaters (half-       */
/* digested Nuke Kegs: feed one to him). Never saved, purged at every    */
/* reset, <= 8 alive, frozen in his scenes, 2 XP, Husks drop ingots.     */
/* ===================================================================== */

/* ---- a wave: coughed up the Throat (R1), out of the holes and over the edge (R2), onto the islands from the gut (R3) ---- */
function mg2Wave(k){const w=MG2K.WAVES[k];if(!w||MG2.waves[k])return;MG2.waves[k]=1;mg2Mech('wave'+k);
  const list=[];for(let i=0;i<w.m;i++)list.push('mgmorsel');for(let i=0;i<w.h;i++)list.push(i<w.a?'mghuska':'mghusk');for(let i=0;i<w.b;i++)list.push('mgbloat');
  for(const mt of list){let demo=0;if(k==='2a'&&mt==='mgbloat'&&!MG2.L.demo2b){MG2.L.demo2b=1;demo=1;}else if(k==='3a')demo=1;MG2.addQ.push({mt,r:w.r,demo});}
  if(w.r===1){MGA.stance='lean';MG2.cough=1.0;mg2S('mg_cough');}
  else if(w.r===2)mg2S('mg_cough');
  mg2Bus('wave',k);}
function mg2AddsTick(dt){if(MG2.cough>0)MG2.cough-=dt;
  for(let i=MG2.adds.length-1;i>=0;i--)if(MG2.adds[i].dead)MG2.adds.splice(i,1);
  if(MG2.addQ.length&&MG2.adds.length<MG2K.ADDS.CAP&&!MG2.scene){MG2.addT=(MG2.addT||0)-dt;if(MG2.addT<=0){MG2.addT=0.35;mg2SpawnAdd(MG2.addQ.shift());}}}
function mg2AddSpot(r){const F=mgF();
  for(let i=0;i<30;i++){const th=mg2R()*Math.PI*2;let rr=r===1?7.6+mg2R()*1.2:(r===2?(mg2R()<0.6?23.2:9.2):12.8+mg2R()*1.2);
    if(r===3&&MG2.edge<16)rr=Math.min(rr,MG2.edge-1);
    const x=MGC.X+Math.cos(th)*rr,z=MGC.Z+Math.sin(th)*rr;
    if(mg2Stand(x,z)&&Math.hypot(x-P.x,z-P.z)>4)return {x:Math.floor(x)+0.5,y:F,z:Math.floor(z)+0.5};}
  return mg2Land(MGC.X+10,MGC.Z,{});}
function mg2SpawnAdd(q){if(!q||typeof THREE==='undefined')return null;const T0=q.mt==='mghuska'?'mghusk':q.mt,s=mg2AddSpot(q.r);
  const G=new THREE.Group(),mats=[];let body=null;try{body=mgMobMesh(T0,G,mats,{});}catch(err){mgFail('addMesh',err);}   /* OG body; M4 swaps it in place */
  const e=mgEnt(T0,s.x,s.y,s.z,(body&&body.G)||G,{mats:(body&&body.mats)||mats,legs:(body&&body.legs)||[],mgBody:body,archer:q.mt==='mghuska'?1:0,demo:q.demo||0,
    st:'climb',stT:0.6,cd:0.6,fuse:0,tgt:null,idle:0,built:0,hp:MOBT[T0].hp,mgr:q.r});
  if(q.r===1){const pr=mgPol(s.x,s.z),l=mg2Land(MGC.X+Math.cos(pr.th)*mg2Rng(13,19),MGC.Z+Math.sin(pr.th)*mg2Rng(13,19),{});
    e.lob={x0:s.x,y0:s.y,z0:s.z,x1:l.x,y1:l.y,z1:l.z,t:0,dur:0.9};}
  else e.vy=6;
  e.mesh.position.set(e.x,e.y,e.z);mgAddEnt(e);MG2.adds.push(e);
  mg2Burst('dust',s.x,s.y+0.4,s.z,{id:B.NETHROCK,n:6});return e;}
/* the add's gate: everyone can hurt them (Dan, bots, explosions); a Husk raises its arm for 0.6 s after a hit (half from the front) */
function mg2AddPreHurt(e,dmg,kx,kz){if(e.dead||MG2.scene)return -1;return Math.max(0,+dmg||0);}
function mg2AddKilled(e){if(e.mt==='mghusk'){if(mg2R()<0.5)spawnDrop(e.x,e.y+0.6,e.z,{id:IT.IRON,count:1},0,2,0);if(mg2R()<0.1)spawnDrop(e.x,e.y+0.6,e.z,{id:IT.GOLD,count:1},0,2,0);}
  mg2Mech('addKill');}
function mg2AddDie(e,why){if(e.dead)return;e.dead=false;mg2Burst('ash',e.x,e.y+0.6,e.z,{id:why==='eaten'?B.NETHROCK:B.STONE,n:6});removeEnt(e);}
function mg2AddEaten(e,heal){if(e.dead)return;mg2AddDie(e,'eaten');if(heal)mg2Heal(heal);mg2S('mg_eat',e.x,e.y,e.z);mg2Mech('fed');}
/* who an add goes for: the nearest player in play (Dan or a bot) */
function mg2AddTarget(e,range){let best=null,bd=range||40;for(const t of mg2Players()){if(!mg2InPlay(t))continue;const p=mg2TPos(t),d=Math.hypot(p.x-e.x,p.z-e.z);if(d<bd){bd=d;best=t;}}return best;}
function mg2AddBrain(e,dt,T){const F=mgF(),K=MG2K.ADDS;
  if(MG2.scene||!MGF.live){e.vx=e.vz=0;if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);return;}
  if(e.lob){const L=e.lob;L.t+=dt;const k=Math.min(1,L.t/L.dur);e.x=L.x0+(L.x1-L.x0)*k;e.z=L.z0+(L.z1-L.z0)*k;e.y=L.y0+(L.y1-L.y0)*k+5*k*(1-k);e.vx=e.vy=e.vz=0;
    if(k>=1){e.lob=null;e.y=L.y1+0.05;e.cd=0.8;}if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);return;}   /* coughed out over the teeth */
  e.cd=Math.max(0,(e.cd||0)-dt);e.stT=Math.max(0,(e.stT||0)-dt);
  let mvx=0,mvz=0,spd=T.spd;
  const r=MGF.round,boss=mg2Boss();
  if(e.mt==='mgmorsel'){const fp=mg2MorselGoal(e,r,boss),dx=fp.x-e.x,dz=fp.z-e.z,d=Math.hypot(dx,dz);
    if(d<1.4&&Math.abs(e.y-fp.y)<2.5&&fp.eat){mg2AddEaten(e,MG2K.R1.MORSEL);return;}
    if(d>0.3){mvx=dx/d;mvz=dz/d;}
    const t=mg2AddTarget(e,1.6);if(t&&e.cd<=0){const p=mg2TPos(t);if(Math.abs(p.y-e.y)<1.6){e.cd=1.0;mg2AddHit(t,K.MORSEL.bite,'morsel',e);}}
    if(e.onGround&&e.cd<=0.2&&mg2R()<dt*0.8)e.vy=6.2;}
  else if(e.mt==='mghusk'){const bmax=r===3?1:4;if(e.buildT>0){e.buildT-=dt;e.idle=(e.idle||0)+dt;if(e.idle>0.9&&e.built<bmax){e.idle=0;if(mg2AddBuild(e))e.built++;}}
    const t=e.buildT>0?null:mg2AddTarget(e,e.archer?18:12);                                 /* they fight what is near; the rest build */
    if(t){e.idle=0;const p=mg2TPos(t),dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz)||1;
      if(e.archer){const want=d>14?1:(d<8?-1:0);mvx=dx/d*want;mvz=dz/d*want;
        if(e.cd<=0&&d<18&&mg2AddSees(e,p)){e.cd=K.HUSK.arrowT;const a=[e.x,e.y+1.5,e.z],b=[p.x,p.y+1.4,p.z],ax=b[0]-a[0],ay=b[1]-a[1]+d*0.06,az=b[2]-a[2],l=Math.hypot(ax,ay,az)||1;
          spawnArrow(a[0],a[1],a[2],ax/l*18,ay/l*18,az/l*18,'m',K.HUSK.arrow);mg2S('bow',e.x,e.y,e.z);}}
      else{let n=0;for(const o of MG2.adds)if(o!==e&&!o.dead&&o.mt==='mghusk'&&!o.archer&&o.eng===mg2TId(t)&&Math.hypot(o.x-p.x,o.z-p.z)<3)n++;
        if(n>=2&&e.eng!==mg2TId(t)){const s2=d>5?1:(d<4?-1:0);mvx=dx/d*s2-dz/d*0.6;mvz=dz/d*s2+dx/d*0.6;}       /* two at a time: the others circle */
        else{e.eng=mg2TId(t);if(d>1.4){mvx=dx/d;mvz=dz/d;}
          if(d<1.9&&Math.abs(p.y-e.y)<1.8){if(!e.wind&&e.cd<=0){e.wind=K.HUSK.wind;}}
          if(e.wind){e.wind-=dt;if(e.wind<=0){e.wind=0;e.cd=K.HUSK.cd;e.swings=(e.swings||0)+1;if(d<2.3)mg2AddHit(t,K.HUSK.swing,'husk',e);
            if(e.swings>=2){e.swings=0;e.eng=null;e.buildT=K.HUSK.buildT;}}}}}}
    else if(!(e.buildT>0)){e.eng=null;e.idle+=dt;if(e.idle>K.HUSK.build&&e.built<bmax&&mg2AddBuild(e)){e.built++;e.idle=K.HUSK.build-0.4;}}}
  else if(e.mt==='mgbloat'&&e.demo&&r===2&&boss){const hd=mg2R2Head(boss),dx=hd.x-e.x,dz=hd.z-e.z,d=Math.hypot(dx,dz)||1;   /* the self-demo: it waddles into his path */
    if(d<3.2){mg2R2Swallow(e);return;}mvx=dx/d;mvz=dz/d;}
  else if(e.mt==='mgbloat'){const t=mg2AddTarget(e,30);
    if(t){const p=mg2TPos(t),dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz)||1;
      if(d<2.5){e.fuse+=dt;if(!e.hiss){e.hiss=1;mg2S('fuse',e.x,e.y,e.z);}}else{if(e.fuse>0)e.fuse=Math.max(0,e.fuse-dt*1.5);if(e.fuse===0)e.hiss=0;mvx=dx/d;mvz=dz/d;}
      const fl=e.fuse>0&&((e.fuse*8|0)%2===0);for(const m of e.mats)m.emissive&&m.emissive.setRGB(fl?0.9:0,fl?0.8:0,fl?0.3:0);
      if(e.fuse>=K.BLOAT.fuse){mg2Bloat(e);return;}}}
  /* the inhale pulls his own leftovers too (R3), and he eats any that reach his mouth */
  if(r===3&&MG2.inh&&MG2.inh.pull>0){const pr=mgPol(e.x,e.z);if(pr.r<12.2&&e.y<F+0.5){mg2AddEaten(e,e.mt==='mgmorsel'?MG2K.R1.MORSEL:(e.mt==='mghusk'?5:0));if(e.mt==='mgbloat')mg2R3Lit('bloat');return;}}
  /* physics (the generic brain's, with his pull applied separately as a displacement) */
  const inW=getBlock(Math.floor(e.x),Math.floor(e.y+0.3),Math.floor(e.z))===B.WATER;
  if(inW)e.vy=lerp(e.vy,2.2,0.08);else e.vy-=GRAV*dt;if(e.vy<-45)e.vy=-45;
  const k=1-Math.exp(-dt*(e.onGround?12:3));e.vx=lerp(e.vx,mvx*spd,k);e.vz=lerp(e.vz,mvz*spd,k);
  const wall=moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);if(wall&&e.onGround&&!inW)e.vy=7.6;
  if(e.y<mgGF()-6||e.y<-30){removeEnt(e);return;}
  if(e.y<F-5&&mgZone(e.x,e.y,e.z)==='gut'){e.gutT=(e.gutT||0)+dt;if(e.gutT>2.5){mg2AddDie(e,'eaten');return;}}   /* the gut digests leftovers */
  if(mvx||mvz)e.yaw=mg2Turn(e.yaw,Math.atan2(mvx,mvz),8,dt);
  if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;}
  const hv=Math.hypot(e.vx,e.vz);e.anim=(e.anim||0)+dt*hv*3.2;
  for(const L of e.legs){const sw=Math.sin(e.anim+L.ph)*L.amp*Math.min(1,hv);if(L.ax==='x')L.g.rotation.x=sw;else L.g.rotation.z=L.base+sw*0.6;}
  if(e.mgBody&&e.mgBody.step)try{e.mgBody.step(dt,e,e.fuse>0?'fuse':(hv>0.3?'walk':'idle'));}catch(err){mgFail('addStep',err);}}
function mg2MorselGoal(e,r,boss){const F=mgF();                                         /* the world trying to get back into his mouth */
  if(r===1){const w=MG2.win;if(w&&w.kind==='handeye'&&Math.hypot(w.part.x-e.x,w.part.z-e.z)<12)return {x:w.part.x,y:F,z:w.part.z,eat:1};   /* a planted hand */
    const pr=mgPol(e.x,e.z);return {x:MGC.X+Math.cos(pr.th)*7.3,y:F,z:MGC.Z+Math.sin(pr.th)*7.3,eat:1};}                                       /* back over the teeth */
  if(r===2&&boss)return {x:boss.x,y:F,z:boss.z,eat:Math.hypot(boss.x-e.x,boss.z-e.z)<3.2?1:0};                                              /* his feet */
  const t=mg2AddTarget(e,30);if(t){const p=mg2TPos(t);return {x:p.x,y:p.y,z:p.z,eat:0};}                                                    /* R3: they go for you; */
  return {x:e.x,y:e.y,z:e.z,eat:0};}                                                                                                         /* the inhale feeds them to him */
function mg2AddSees(e,p){const a=[e.x,e.y+1.5,e.z],dx=p.x-a[0],dy=p.y+1.4-a[1],dz=p.z-a[2],d=Math.hypot(dx,dy,dz)||1;return !raycastB(a[0],a[1],a[2],dx/d,dy/d,dz/d,d);}
/* an add's hit on a player: its own damage at pierce 0 through his hit rules (attributed to him for death lines) */
function mg2AddHit(t,n,how,e){const p=mg2TPos(t);mg2Hit(t,n,0,how,{kx:p.x-e.x,kz:p.z-e.z});}
/* the Husk builds: 2-4 rubble blocks stacked into a stub (placed blocks: he eats them after 3 s, +2 each) */
function mg2AddBuild(e){const F=mgF(),dx=Math.round(Math.sin(e.yaw)),dz=Math.round(Math.cos(e.yaw)),x=Math.floor(e.x)+dx,z=Math.floor(e.z)+dz;
  for(let y=F;y<=F+2;y++){if(getBlock(x,y,z)===B.AIR&&mg2Solid(x,y-1,z)){const pa=ACTOR;ACTOR='Husk';try{setBlock(x,y,z,mg2R()<0.5?B.COBBLE:B.DIRT);}finally{ACTOR=pa;}
      mg2S('place',x,y,z);mg2Mech('huskBuild');return true;}}
  return false;}
/* a Bloater pops: r 3, 9 at pierce 0.25, a pop of knockback, no block damage (bible 11) */
function mg2Bloat(e){const K=MG2K.ADDS.BLOAT,x=e.x,y=e.y+0.8,z=e.z;removeEnt(e);
  for(const t of mg2Players()){const p=mg2TPos(t),d=Math.hypot(p.x-x,p.y+0.9-y,p.z-z);if(d>K.r)continue;mg2Hit(t,K.dmg*(1-d/(K.r*1.6)),0.25,'boom',{kx:p.x-x,kz:p.z-z});
    if(mg2Alive(t))mg2TPos(t).vy=Math.max(mg2TPos(t).vy,7);}
  for(const m of MG2.adds)if(!m.dead&&m!==e&&Math.hypot(m.x-x,m.z-z)<K.r){m.hp-=K.dmg;if(m.hp<=0)mg2AddDie(m,'boom');}
  mg2Burst('boom',x,y,z,{id:B.TNT,n:24,pw:1.4});mg2Shake(0.35,0.4);mg2S('boom',x,y,z);}
