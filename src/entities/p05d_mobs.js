/* ----- mobs ----- */
const MOBT={
  pig:   {hp:10,hw:0.45,h:0.9, spd:1.0, quad:true, body:'#ec9d9d',legc:'#e08c8c',
          drop:{id:IT.PORK,min:1,max:2}},
  cow:   {hp:10,hw:0.45,h:1.35,spd:0.85,quad:true, body:'#6b4a33',legc:'#5a3d2a',
          drop:{id:IT.BEEF,min:1,max:2}},
  sheep: {hp:8, hw:0.45,h:1.25,spd:0.85,quad:true, body:'#e9e9e9',legc:'#cbb89a',
          drop:{id:B.WOOL,min:1,max:1}},
  zombie:{hp:20,hw:0.3, h:1.9, spd:1.0, hostile:true,burns:true,dmg:3,body:'#5d7a45',legc:'#4a3b2c',
          drop:{id:IT.FLESH,min:0,max:2}},
  skel:  {hp:20,hw:0.3, h:1.9, spd:1.05,hostile:true,burns:true,ranged:true,body:'#cfcfcf',legc:'#bdbdbd',
          drop:{id:IT.ARROW,min:0,max:2}},
  boomer:{hp:20,hw:0.3, h:1.62,spd:1.1, hostile:true,boom:true,body:'#58a84e',legc:'#4c9344',
          drop:{id:IT.GUNPOWDER,min:2,max:4}},
  spider:{hp:16,hw:0.65,h:0.9, spd:1.35,hostile:true,nightOnly:true,dmg:2,body:'#2e2a2a',legc:'#221f1f',
          drop:{id:IT.STRING,min:0,max:2}},
  alien: {hp:16,hw:0.3, h:1.8, spd:1.0, dmg:3,body:'#7ec850',legc:'#4a4f63',
          drop:{id:IT.IRON,min:0,max:1}},
};
const MOBFACE={};
function mobFace(mt){
  if(MOBFACE[mt])return MOBFACE[mt];
  const c=document.createElement('canvas');c.width=c.height=16;
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  const T=MOBT[mt];
  g.fillStyle=T.body;g.fillRect(0,0,16,16);
  const e=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
  if(mt==='alien'){
    e(1,4,5,6,'#101018');e(10,4,5,6,'#101018');           /* almond eyes */
    e(2,5,2,2,'#9fe8ff');e(11,5,2,2,'#9fe8ff');           /* glints */
    e(7,12,2,1,'#2c5b21');                                 /* tiny mouth */
  }else if(mt==='pig'){
    e(2,4,3,2,'#fff');e(3,4,1,2,'#1a1a2e');e(11,4,3,2,'#fff');e(12,4,1,2,'#1a1a2e');
    e(5,9,6,4,'#d97f7f');e(6,10,1,2,'#7e3b3b');e(9,10,1,2,'#7e3b3b');
  }else if(mt==='cow'){
    e(0,10,16,6,'#d8c6b0');
    e(2,4,3,2,'#fff');e(3,4,1,2,'#1a1a2e');e(11,4,3,2,'#fff');e(12,4,1,2,'#1a1a2e');
    e(5,11,2,3,'#b59a7c');e(9,11,2,3,'#b59a7c');
    e(0,0,3,3,'#9c9c9c');e(13,0,3,3,'#9c9c9c');
  }else if(mt==='sheep'){
    e(3,6,10,10,'#cbb89a');
    e(4,8,2,2,'#1a1a2e');e(10,8,2,2,'#1a1a2e');e(7,12,2,2,'#8a755a');
  }else if(mt==='zombie'){
    e(2,5,3,3,'#16161f');e(11,5,3,3,'#16161f');
    e(3,3,10,1,'#46603a');e(5,10,6,2,'#2c4022');e(6,12,1,1,'#2c4022');e(9,12,1,1,'#2c4022');
  }else if(mt==='skel'){
    e(2,5,4,3,'#3a3a3a');e(10,5,4,3,'#3a3a3a');e(7,8,2,2,'#5c5c5c');
    for(let i=0;i<5;i++)e(3+i*2,12,1,2,'#7a7a7a');
    e(2,12,12,1,'#8c8c8c');
  }else if(mt==='boomer'){
    for(let i=0;i<26;i++){g.fillStyle=['#4c9344','#69bd5e','#3e7f39'][i%3];
      g.fillRect((i*7)%16,(i*5)%16,2,2);}
    e(2,4,4,3,'#101418');e(10,4,4,3,'#101418');e(3,5,1,1,'#e8f6e2');e(11,5,1,1,'#e8f6e2');
    e(4,9,2,2,'#101418');e(6,11,2,2,'#101418');e(8,9,2,2,'#101418');e(10,11,2,2,'#101418');e(12,9,1,2,'#101418');e(3,11,1,2,'#101418');
  }else if(mt==='spider'){
    e(1,6,2,2,'#c43c3c');e(5,5,2,2,'#e05050');e(9,5,2,2,'#e05050');e(13,6,2,2,'#c43c3c');
    e(4,11,2,3,'#15100f');e(10,11,2,3,'#15100f');
  }
  MOBFACE[mt]=c;return c;
}
function boxMesh(w,h,d,col,face){
  const g=new THREE.BoxGeometry(w,h,d);
  const m=new THREE.MeshLambertMaterial({color:col});
  if(!face)return new THREE.Mesh(g,m);
  const tx=new THREE.CanvasTexture(face);
  tx.magFilter=THREE.NearestFilter;tx.minFilter=THREE.NearestFilter;
  const fm=new THREE.MeshLambertMaterial({map:tx});
  /* +z face gets the face texture */
  return new THREE.Mesh(g,[m,m,m,m,fm,m]);
}
function makeMobMesh(mt,opts){
  const T=MOBT[mt];
  const G=new THREE.Group();
  const mats=[];
  if(opts&&opts.hr&&HRE.on&&HR_MOB[mt]){const r=hrMobMesh(mt,G);if(r)return r;}
  if(mt==='blockling')return mkBlocklingMesh(G,mats);
  if(T&&T.pmob&&PREG.mesh[mt])return mpMobMesh(mt,G,mats,arguments[1]);
  if(mt==='snake')return mkSnakeMesh(G,mats);
  const reg=o=>{(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.push(m));return o;};
  const legs=[];
  if(mt==='demon'||(T&&T.mg))return mgMobMesh(mt,G,mats,arguments[1]);
  if(mt==='creep'||mt==='nuker')return mkCreepMesh(mt);
  if(mt==='dragon'||mt==='dking'){
    const k=mt==='dking'?1.8:1;
    const bodyC=mt==='dking'?'#d4a017':T.body;
    const body=reg(boxMesh(0.9*k,0.7*k,1.7*k,bodyC));body.position.y=1.1*k;G.add(body);
    const neck=reg(boxMesh(0.4*k,0.4*k,0.7*k,bodyC));neck.position.set(0,1.45*k,-1.0*k);neck.rotation.x=0.4;G.add(neck);
    const head=reg(boxMesh(0.55*k,0.45*k,0.7*k,bodyC,mobFace(mt==='dking'?'dragon':mt)));head.position.set(0,1.7*k,-1.5*k);G.add(head);
    const jaw=reg(boxMesh(0.4*k,0.15*k,0.5*k,'#5e1414'));jaw.position.set(0,1.5*k,-1.6*k);G.add(jaw);
    for(let i=0;i<3;i++){
      const t=reg(boxMesh((0.5-i*0.13)*k,(0.3-i*0.07)*k,0.6*k,bodyC));
      t.position.set(0,(1.0-i*0.1)*k,(1.1+i*0.55)*k);G.add(t);
    }
    for(const s of[-1,1]){
      const wing=new THREE.Group();
      const w1=reg(boxMesh(1.5*k,0.09*k,1.0*k,mt==='dking'?'#8a6a0a':T.legc));
      w1.position.x=s*0.85*k;wing.add(w1);
      const w2=reg(boxMesh(0.9*k,0.07*k,0.7*k,mt==='dking'?'#8a6a0a':T.legc));
      w2.position.x=s*1.85*k;wing.add(w2);
      wing.position.set(0,1.4*k,0.1*k);
      G.add(wing);legs.push(wing);
    }
    for(const s of[-1,1]){
      const lg=reg(boxMesh(0.18*k,0.5*k,0.18*k,T.legc));
      lg.position.set(s*0.3*k,0.55*k,0.4*k);G.add(lg);
    }
    return {G,legs,mats};
  }
  if(mt==='spider'){
    const body=reg(boxMesh(1.1,0.5,1.2,T.body));body.position.y=0.45;G.add(body);
    const head=reg(boxMesh(0.62,0.55,0.6,T.body,mobFace(mt)));head.position.set(0,0.5,0.85);G.add(head);
    for(let i=0;i<4;i++)for(const s of[-1,1]){
      const lg=new THREE.Group();
      const seg=reg(boxMesh(0.9,0.12,0.12,T.legc));seg.position.x=s*0.45;lg.add(seg);
      lg.position.set(0,0.5,-0.42+i*0.3);lg.rotation.z=s*0.5;
      G.add(lg);legs.push({g:lg,ph:i*1.5,ax:'z',base:s*0.5,amp:0.25});
    }
  }else if(T.quad){
    const bh=mt==='cow'?0.75:(mt==='sheep'?0.72:0.55);
    const by=T.h-bh*0.5-(mt==='pig'?0.02:0.05);
    const body=reg(boxMesh(0.8,bh,1.2,T.body));body.position.y=by;G.add(body);
    const head=reg(boxMesh(0.55,0.55,0.5,mt==='sheep'?'#cbb89a':T.body,mobFace(mt)));
    head.position.set(0,by+bh*0.35,0.78);G.add(head);
    if(mt==='sheep'){const wf=reg(boxMesh(0.62,0.6,0.55,T.body));wf.position.set(0,by+bh*0.33,0.74);G.add(wf);}
    const ly=by-bh*0.5;
    for(const sx of[-1,1])for(const sz of[-1,1]){
      const lg=new THREE.Group();
      const seg=reg(boxMesh(0.22,ly,0.22,T.legc));seg.position.y=-ly*0.5;lg.add(seg);
      lg.position.set(sx*0.26,ly,sz*0.4);
      G.add(lg);legs.push({g:lg,ph:(sx*sz>0?0:Math.PI),ax:'x',base:0,amp:0.6});
    }
  }else{
    const legH=0.75,bodyH=0.72;
    for(const s of[-1,1]){
      const lg=new THREE.Group();
      const seg=reg(boxMesh(0.24,legH,0.26,T.legc));seg.position.y=-legH*0.5;lg.add(seg);
      lg.position.set(s*0.13,legH,0);
      G.add(lg);legs.push({g:lg,ph:s>0?0:Math.PI,ax:'x',base:0,amp:0.55});
    }
    const body=reg(boxMesh(0.52,bodyH,0.3,T.body));body.position.y=legH+bodyH*0.5;G.add(body);
    const armY=legH+bodyH-0.08;
    for(const s of[-1,1]){
      const ar=new THREE.Group();
      const seg=reg(boxMesh(0.2,0.7,0.24,mt==='skel'?T.body:T.legc===''?T.body:T.body));
      seg.position.y=-0.27;ar.add(seg);
      ar.position.set(s*0.37,armY,0);
      if(mt==='zombie'||mt==='boomer'){ar.rotation.x=-Math.PI/2;}
      G.add(ar);
      if(mt==='skel')legs.push({g:ar,ph:s>0?Math.PI:0,ax:'x',base:0,amp:0.35});
    }
    const head=reg(boxMesh(0.5,0.5,0.5,T.body,mobFace(mt)));
    head.position.y=legH+bodyH+0.27;G.add(head);
    if(mt==='alien'){
      for(const s of[-1,1]){
        const st=reg(boxMesh(0.05,0.32,0.05,T.body));
        st.position.set(s*0.14,legH+bodyH+0.66,0);G.add(st);
        const tip=reg(boxMesh(0.11,0.11,0.11,'#9fe8ff'));
        tip.position.set(s*0.14,legH+bodyH+0.86,0);G.add(tip);
      }
    }
  }
  return {G,legs,mats};
}
function spawnMob(mt,x,y,z){
  const T=MOBT[mt];
  const {G,legs,mats,hrM}=makeMobMesh(mt,{hr:1});
  if(T.boss&&mt!=='demon')G.scale.set(1.5,1.4,1.5);
  if(!hrM)shadowify(G);
  scene.add(G);
  entities.push({t:'mob',mob:true,mt,hp:T.hp,hw:T.hw,h:T.h,hostile:!!T.hostile,
    x,y,z,vx:0,vy:0,vz:0,onGround:false,yaw:Math.random()*6.28,
    mode:'idle',tT:Math.random()*3,dir:0,atkT:0,hurtT:0,burnAcc:0,fuse:0,hissed:false,
    mesh:G,legs,mats,hrM:hrM||null,anim:0});
  if(mt==='alien'){
    const a=entities[entities.length-1];
    a.name=alienName();a.rel=0;a.rom=0;a.mood='c';
    a.hx=x;a.hz=z;a.insults=0;a.calmT=0;
  }
  if(T.fly){
    const a=entities[entities.length-1];
    a.hx=x;a.hy=y+10;a.hz=z;a.angry=!!T.boss;a.tame=false;a.fed=0;
    a.fT=2;a.orb=Math.random()*6.28;a.cool=0;a.flap=Math.random()*6;
    a.seatY=1.05;a.eyeH=1.7;
  }
}
function hurtMob(e,dmg,kx,kz){
  if(e.bot){agHurt(e.A,dmg,HIT_BY||'Dan',kx,kz,HIT_HOW||'melee');return;}
  if(MOBT[e.mt].mg){dmg=mgPreHurt(e,dmg,kx,kz);if(dmg<0)return;}
  if(MOBT[e.mt].pmob){dmg=mpPreHurt(e,dmg,kx,kz);if(dmg<0)return;}
  if(e.mt==='alien'&&e.hp>0&&dmg>0)alienAggro(e);
  if((e.mt==='dragon'||e.mt==='dking')&&dmg>0){e.angry=true;e.tame=false;}
  if(e.dead||e.hurtT>0.25)return;
  if(GR.instaKill&&dmg>0)dmg=(e.hp||1)+99999; /* debug: one hit, any weapon, one kill */
  e.hp-=dmg;e.hurtT=0.5;
  if(e.pfloor!=null&&e.hp<e.pfloor)e.hp=e.pfloor;
  for(const m of e.mats)m.emissive&&m.emissive.setRGB(0.45,0,0);
  const l=Math.hypot(kx,kz)||1;
  {const _kr=MOBT[e.mt].kbRes?1-MOBT[e.mt].kbRes:1;e.vx+=kx/l*6*_kr;e.vz+=kz/l*6*_kr;e.vy=Math.max(e.vy,5*_kr);}
  playS('hit');
  if(!MOBT[e.mt].hostile){e.mode='flee';e.tT=4;e.dir=Math.atan2(e.x-P.x,e.z-P.z);}
  else e.mode='chase';
  if(e.hp<=0)killMob(e);
}
function killMob(e){
  const T=MOBT[e.mt];
  if(e.blockId)spawnDrop(e.x,e.y+0.4,e.z,{id:e.blockId,count:1},0,2,0);
  if(e.mt==='snake'&&e.segs&&e.segs.length)
    spawnDrop(e.x,e.y+0.4,e.z,{id:IT.APPLE,count:Math.min(8,e.segs.length)},0,2,0);
  if(DIM!=='puppet'&&Math.random()<FIG_CHANCE)
    spawnDrop(e.x,e.y+0.6,e.z,{id:IT.FIGURINE,count:1,mob:{t:e.mt}},(Math.random()-0.5)*2,2.5,(Math.random()-0.5)*2);
  if(GR.ghosts&&DIM!=='puppet'&&Math.random()<GHOST_CHANCE)spawnGhost(e.mt,e.x,e.y+0.5,e.z);
  if(T.drop){
    const n=T.drop.min+Math.floor(Math.random()*(T.drop.max-T.drop.min+1));
    if(n>0)spawnDrop(e.x,e.y+0.4,e.z,{id:T.drop.id,count:n},(Math.random()-0.5)*2,2,(Math.random()-0.5)*2);
  }
  spawnXP(e.x,e.y+0.5,e.z,T.xp||(T.hostile?5:2));
  if(T.pmob)mpOnKill(e);
  if(T.boss)bossLoot(e);
  if(!(e.hrM&&hrCorpse(e,B.TNT))){burstParticles(e.x,e.y+e.h*0.5,e.z,B.TNT,8,0.5);removeEnt(e);}
}
function mobSees(e){
  const a=[e.x,e.y+e.h*0.85,e.z],b=eyePos();
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
  const ds=Math.hypot(dx,dy,dz);
  const hit=raycastB(a[0],a[1],a[2],dx/ds,dy/ds,dz/ds,ds);
  return !hit;
}
function updateMob(e,dt){
  const T=MOBT[e.mt];
  e.hurtT=Math.max(0,e.hurtT-dt);
  if(e.hurtT<0.2)for(const m of e.mats)m.emissive&&m.emissive.setRGB(0,0,0);
  e.atkT=Math.max(0,e.atkT-dt);if(e.hrM)e._a0=e.atkT;
  if(GR.freezeMobs){e.vx=e.vy=e.vz=0;e.mesh.position.set(e.x,e.y,e.z);return;} /* held in place until the rule is off */
  if(T.pmob&&PREG.brain[e.mt])return mpBrain(e,dt,T);
  if(T.mg)return mgBrain(e,dt,T);
  if(e.mt==='blockling')return blocklingBrain(e,dt,T);
  if(e.mt==='snake')return snakeBrain(e,dt,T);
  if(T.fly)return dragonBrain(e,dt,T);
  const pdx=P.x-e.x,pdz=P.z-e.z;
  const pd=Math.hypot(pdx,pdz);
  if(e.mt==='titan')titanExtra(e,dt,pd,pdx,pdz);
  /* daylight burn (the aether's light is kinder — the undead endure it) */
  if(T.burns&&DIM!=='aether'&&sunUp()&&skyOpen(Math.floor(e.x),Math.floor(e.y+0.5),Math.floor(e.z))
     &&getBlock(Math.floor(e.x),Math.floor(e.y+0.5),Math.floor(e.z))!==B.WATER){
    e.burnAcc+=dt;
    if(e.burnAcc>1){e.burnAcc=0;e.hp-=2;e.hurtT=0.4;
      for(const m of e.mats)m.emissive&&m.emissive.setRGB(0.5,0.2,0);
      burstParticles(e.x,e.y+e.h,e.z,B.TORCH,3,0.3);
      if(e.hp<=0){killMob(e);return;}}
  }
  /* AI state */
  if(e.mt==='alien')alienBrain(e,dt,pd,pdx,pdz);
  const hostileNow=e.mt==='alien'?e.mood==='h':T.hostile;
  const _tb=hostileNow?mobBotTarget(e,T,pd):null;
  const tdx=_tb?_tb.x-e.x:pdx,tdz=_tb?_tb.z-e.z:pdz,td=_tb?Math.hypot(tdx,tdz):pd,tty=_tb?_tb.y:P.y;
  const aggro=hostileNow&&(_tb||(!P.dead&&(P.mode!=='c'||T.nuke)))&&td<(T.boss?26:(T.nuke?22:16))&&(!T.nightOnly||!sunUp()||e.mode==='chase');
  if(aggro)e.mode='chase';
  else if(e.mode==='chase')e.mode='idle';
  e.tT-=dt;
  if(e.mode==='idle'&&e.tT<=0){e.mode='wander';e.tT=2+Math.random()*4;e.dir=Math.random()*6.28;}
  else if(e.mode==='wander'&&e.tT<=0){e.mode='idle';e.tT=1+Math.random()*3;}
  else if(e.mode==='flee'&&e.tT<=0)e.mode='idle';
  let mvx=0,mvz=0,spd=T.spd*2.2;
  if(e.mode==='wander'){mvx=Math.sin(e.dir);mvz=Math.cos(e.dir);spd*=0.55;}
  else if(e.mode==='flee'){mvx=Math.sin(e.dir);mvz=Math.cos(e.dir);spd*=1.25;}
  else if(e.mode==='chase'&&td>0.01){
    let to=1;
    if(T.ranged){to=td>10?1:(td<7?-1:0);}
    if(T.boom&&td<2.8)to=0;
    mvx=tdx/td*to;mvz=tdz/td*to;
  }
  /* melee / ranged / boom */
  if(e.mode==='chase'){
    if(T.dmg&&td<(T.boss?2.4:1.7)&&Math.abs(tty-e.y)<(T.boss?3:2)&&e.atkT<=0){
      e.atkT=T.boss?1.4:1.1;
      if(_tb)mobHitBot(_tb,e,T,T.dmg,tdx,tdz);
      else{LASTDMG={by:mobNameOf(e.mt),how:'mob',t:AG_T};damagePlayer(T.dmg,pdx,pdz);
      if(T.boss&&!P.dead){P.vy=Math.max(P.vy,9.5);playS('thud');}}
    }
    if(T.ranged&&e.atkT<=0&&td<15&&(_tb?agSees(_tb.A,e.x,e.y+e.h*0.8,e.z):mobSees(e))){
      e.atkT=1.9;
      const a=[e.x,e.y+e.h*0.8,e.z],b=_tb?[_tb.x,_tb.y+1.4,_tb.z]:eyePos();
      const dx=b[0]-a[0],dy=b[1]-a[1]+td*0.06,dz=b[2]-a[2];
      const dl=Math.hypot(dx,dy,dz);
      spawnArrow(a[0],a[1],a[2],dx/dl*18,dy/dl*18,dz/dl*18,'m',3);
      playS('bow');
    }
    if(T.boom){
      const trig=T.nuke?3.6:3;
      const cap=T.nuke?1.0:1.5;
      if(td<trig){
        if(!e.hissed){e.hissed=true;playS('fuse');if(T.nuke)playS('rumble');}
        e.fuse+=dt;
        const rate=T.nuke?3:6;
        const fl=(e.fuse*rate|0)%2===0;
        const w=T.nuke?1:0.7;
        for(const m of e.mats)m.emissive&&m.emissive.setRGB(fl?w:0,fl?w:0,fl?w:0);
        if(T.nuke&&e.fuse>cap-0.4){const sw=1+(e.fuse-cap+0.4)*0.6;e.mesh.scale.set(sw,sw,sw);}
        if(e.fuse>cap){
          removeEnt(e);
          if(T.nuke){nukeExplode(e.x,e.y+e.h*0.5,e.z);return;}
          spawnDrop(e.x,e.y+0.6,e.z,{id:IT.GUNPOWDER,count:1+(Math.random()<0.5?1:0)},
            (Math.random()-0.5)*3,4,(Math.random()-0.5)*3);
          explode(e.x,e.y+e.h*0.5,e.z,3,true);return;
        }
      }else if(e.fuse>0){e.fuse=Math.max(0,e.fuse-dt*1.5);if(e.fuse===0){e.hissed=false;
        e.mesh.scale.set(1,1,1);
        for(const m of e.mats)m.emissive&&m.emissive.setRGB(0,0,0);}}
    }
  }
  /* physics */
  const mfb=getBlock(Math.floor(e.x),Math.floor(e.y+0.3),Math.floor(e.z));
  const inW=mfb===B.WATER;
  if(mfb===B.LAVA)hurtMob(e,2,0,0);
  if(e.onGround&&getBlock(Math.floor(e.x),Math.floor(e.y)-1,Math.floor(e.z))===B.TRAMP){e.vy=7;e.onGround=false;}
  if(inW){e.vy=lerp(e.vy,2.2,0.08);}else e.vy-=GRAV*dt;
  if(e.vy<-45)e.vy=-45;
  const k=1-Math.exp(-dt*(e.onGround?12:3));
  e.vx=lerp(e.vx,mvx*spd,k);e.vz=lerp(e.vz,mvz*spd,k);
  const wall=moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(wall&&e.onGround&&!inW)e.vy=7.6;
  if(e.y<-40){removeEnt(e);return;}
  /* visuals */
  const want=Math.atan2(mvx!==0||mvz!==0?mvx:tdx, mvx!==0||mvz!==0?mvz:tdz);
  if(e.mode!=='idle'||hostileNow)e.yaw+=(((want-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI)*Math.min(1,dt*8);
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.y=e.yaw;
  if(e.hrM){hrMobTick(e,dt,T,tdx,tdz,td,_tb,hostileNow);return;}
  const hv=Math.hypot(e.vx,e.vz);
  e.anim+=dt*hv*3.2;
  for(const L of e.legs){
    const sw=Math.sin(e.anim+L.ph)*L.amp*Math.min(1,hv);
    if(L.ax==='x')L.g.rotation.x=sw;
    else L.g.rotation.z=L.base+sw*0.6;
  }
}

