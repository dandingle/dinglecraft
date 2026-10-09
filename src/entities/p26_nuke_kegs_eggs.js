/* ===================================================================== */
/* PART 26 — NUKE KEGS & SPAWN EGGS  (2.3)                               */
/* ===================================================================== */
MOBT.creep={hp:22,hw:0.3,h:1.6,spd:1.45,hostile:true,boom:true,nuke:true,xp:8,
  body:'#8a5a2e',legc:'#4a2c14'};
MOBT.nuker={hp:26,hw:0.34,h:1.7,spd:1.3,hostile:true,boom:true,nuke:true,xp:8,
  body:'#8a5a2e',legc:'#4a2c14'};

/* ----- the Nuke Keg: a gunpowder barrel on legs (wood staves, iron hoops, two round eyes, a stitched grin, a lit fuse) ----- */
let _camoTex=null,_camoCv=null;
function camoCanvas(){      /* the keg's wood: four staves of 16 px, one Math.random() shade per 4x4 cell (256 draws, as ever) */
  if(_camoCv)return _camoCv;
  const cv=document.createElement('canvas');cv.width=64;cv.height=64;
  const c=cv.getContext('2d');
  const staves=[['#8a5a2e','#7c5028','#966636'],['#9c6a3a','#8c5e32','#a87442'],['#7e5028','#704622','#8a5a30'],['#966434','#88582e','#a06e3c']];
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const cols=staves[(x>>2)&3];
    c.fillStyle=cols[(Math.random()*cols.length)|0];
    c.fillRect(x*4,y*4,4,4);
  }
  c.fillStyle='#4a2c14';for(let x=0;x<64;x+=16)c.fillRect(x,0,1,64);                     /* the seams between staves */
  c.fillStyle='rgba(58,32,14,0.35)';for(let x=0;x<64;x+=16){c.fillRect(x+5,0,1,64);c.fillRect(x+11,0,1,64);}   /* grain */
  _camoCv=cv;
  return cv;
}
function camoTex(){
  if(_camoTex)return _camoTex;
  _camoTex=new THREE.CanvasTexture(camoCanvas());
  _camoTex.magFilter=THREE.NearestFilter;_camoTex.minFilter=THREE.NearestFilter;
  return _camoTex;
}
function creepFaceCv(){     /* the keg's face: two round white eyes and a stitched grin */
  const cv=document.createElement('canvas');cv.width=16;cv.height=16;
  const c=cv.getContext('2d');
  c.drawImage(camoCanvas(),0,0,16,16,0,0,16,16);
  const e=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  for(const ex of [2,10]){e(ex+1,2,2,1,'#2a1608');e(ex,3,4,4,'#2a1608');e(ex+1,7,2,1,'#2a1608');                /* rims */
    e(ex+1,3,2,1,'#f4f1e6');e(ex,4,4,2,'#f4f1e6');e(ex+1,6,2,1,'#f4f1e6');e(ex+1,4,2,2,'#101010');}            /* round eyes */
  e(4,11,8,1,'#2a1608');e(3,10,1,1,'#2a1608');e(12,10,1,1,'#2a1608');e(2,9,1,1,'#2a1608');e(13,9,1,1,'#2a1608'); /* the grin */
  for(const sx of [4,7,10])e(sx,10,1,3,'#e0cc9a');                                                              /* its stitches */
  return cv;
}
let _kegHaz=null,_kegTre=null;
function kegHazardCv(){if(_kegHaz)return _kegHaz;      /* the armed keg's band: yellow and black hazard stripes */
  const cv=document.createElement('canvas');cv.width=16;cv.height=16;const c=cv.getContext('2d');
  c.fillStyle='#f2c81e';c.fillRect(0,0,16,16);c.fillStyle='#141414';
  for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(((x+y)>>2)%2===0)c.fillRect(x,y,1,1);
  return (_kegHaz=cv);}
function kegTrefoilCv(){if(_kegTre)return _kegTre;     /* ...and a radiation trefoil on the belly */
  const cv=document.createElement('canvas');cv.width=16;cv.height=16;const c=cv.getContext('2d');
  c.fillStyle='#f2c81e';c.fillRect(0,0,16,16);c.fillStyle='#141414';
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const dx=x+0.5-8,dy=y+0.5-8,r=Math.hypot(dx,dy),a=(Math.atan2(dy,dx)+Math.PI*8/3)%(Math.PI*2/3);
    if(r<1.6||(r>2.6&&r<7&&a<Math.PI/3))c.fillRect(x,y,1,1);}
  return (_kegTre=cv);}
function camoBox(w,h,d,faceCv,col){
  const g=new THREE.BoxGeometry(w,h,d);
  const cm=col!=null?new THREE.MeshLambertMaterial({color:col}):new THREE.MeshLambertMaterial({map:camoTex()});
  if(!faceCv)return new THREE.Mesh(g,cm);
  const tx=new THREE.CanvasTexture(faceCv);
  tx.magFilter=THREE.NearestFilter;tx.minFilter=THREE.NearestFilter;
  const fm=new THREE.MeshLambertMaterial({map:tx});
  return new THREE.Mesh(g,[cm,cm,cm,cm,fm,cm]); /* face on +z, like everyone else */
}
function mkCreepMesh(mt){
  const G=new THREE.Group(),legs=[],mats=[];
  const reg=m=>{
    if(Array.isArray(m.material))for(const mm of m.material)mats.push(mm);
    else mats.push(m.material);
    return m;
  };
  const thin=mt==='creep';
  const bw=thin?0.5:0.56,bd=bw,bh=thin?0.5:0.46,hh=0.5;
  const legH=thin?0.42:0.5;
  const body=reg(camoBox(bw,bh,bd));                                 /* the barrel's belly */
  body.position.y=legH+bh/2;G.add(body);
  const head=reg(camoBox(bw,hh,bd,creepFaceCv()));                   /* its top half, with the face */
  head.position.y=legH+bh+hh/2;G.add(head);
  const top=legH+bh+hh;
  for(const [y,k] of [[legH+0.05,0.03],[legH+bh,0.07],[top-0.05,0.03]]){   /* iron hoops (the middle one bulges) */
    if(!thin&&k>0.05)continue;
    const hp=reg(camoBox(bw+k,0.07,bd+k,null,0x3a3a40));hp.position.y=y;G.add(hp);}
  if(!thin){                                                         /* the armed keg: a hazard band and a trefoil */
    const hz=new THREE.CanvasTexture(kegHazardCv());hz.magFilter=THREE.NearestFilter;hz.minFilter=THREE.NearestFilter;
    if(hz.repeat&&hz.repeat.set){hz.wrapS=THREE.RepeatWrapping;hz.repeat.set(4,1);}
    const band=reg(new THREE.Mesh(new THREE.BoxGeometry(bw+0.07,0.14,bd+0.07),new THREE.MeshLambertMaterial({map:hz})));band.position.y=legH+bh;G.add(band);
    const tre=reg(camoBox(0.3,0.3,0.02,kegTrefoilCv()));tre.position.set(0,legH+bh*0.42,bd/2+0.011);G.add(tre);}
  const fuse=reg(camoBox(0.05,0.2,0.05,null,0x3a2a1a));fuse.position.set(0.08,top+0.1,-0.04);G.add(fuse);
  const spark=reg(camoBox(0.08,0.08,0.08,null,0xc8641e));spark.position.set(0.08,top+0.22,-0.04);G.add(spark);   /* flares with the fuse strobe */
  if(thin){
    /* four stubby legs */
    for(const [sx,sz,ph] of [[-1,-1,0],[1,-1,Math.PI],[-1,1,Math.PI],[1,1,0]]){
      const lg=new THREE.Group();
      const seg=reg(camoBox(0.18,legH,0.2));
      seg.position.y=-legH/2;lg.add(seg);
      lg.position.set(sx*0.14,legH,sz*0.14);
      G.add(lg);
      legs.push({g:lg,ph,ax:'x',base:0,amp:0.55});
    }
  }else{
    /* two legs + the zombie reach */
    for(const s of [-1,1]){
      const lg=new THREE.Group();
      const seg=reg(camoBox(0.24,legH,0.26));
      seg.position.y=-legH/2;lg.add(seg);
      lg.position.set(s*0.15,legH,0);
      G.add(lg);
      legs.push({g:lg,ph:s>0?Math.PI:0,ax:'x',base:0,amp:0.55});
      const ar=new THREE.Group();
      const aseg=reg(camoBox(0.18,0.62,0.2));
      aseg.position.y=-0.27;ar.add(aseg);
      ar.position.set(s*(bw/2+0.1),legH+bh+0.18,0);
      ar.rotation.x=-Math.PI/2;
      G.add(ar);
      legs.push({g:ar,ph:s>0?Math.PI:0,ax:'z',base:0,amp:0.1});
    }
  }
  return {G,legs,mats};
}
/* ----- the bomb ----- */
const SHAKE={t:0,dur:1,mag:0};
const NUKE={flash:0};
function applyShake(){
  if(SHAKE.t<=0)return;
  const k=SHAKE.t/SHAKE.dur;
  const m=SHAKE.mag*k*k;
  camera.position.x+=(Math.random()*2-1)*m;
  camera.position.y+=(Math.random()*2-1)*m*0.6;
  camera.position.z+=(Math.random()*2-1)*m;
  camera.rotation.z=(Math.random()*2-1)*m*0.04;
}
function nukeShake(mag,dur){
  if(mag<=SHAKE.mag*(SHAKE.t/SHAKE.dur))return;
  SHAKE.mag=mag;SHAKE.dur=dur;SHAKE.t=dur;
}
function tickNuke(dt){
  if(SHAKE.t>0){
    SHAKE.t-=dt;
    if(SHAKE.t<=0&&camera)camera.rotation.z=0;
  }
  if(NUKE.flash>0){
    NUKE.flash=Math.max(0,NUKE.flash-dt*(NUKE.flash>0.6?0.9:1.6));
    const el=$('nukeflash');
    if(el)el.style.opacity=NUKE.flash.toFixed(3);
  }
}
function nukeExplode(x,y,z){
  /* the crater: vaporize, don't litter */
  const grief=GR.mobGrief;
  const r=9,r2=r*r;
  if(grief)
  for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)for(let dz=-r;dz<=r;dz++){
    const ds=dx*dx+dy*dy+dz*dz;
    if(ds>r2)continue;
    const bx=Math.floor(x)+dx,by=Math.floor(y)+dy,bz=Math.floor(z)+dz;
    const id=getBlock(bx,by,bz);
    if(id===B.AIR||id===B.BEDROCK||id===B.PG_STRUNK||id===B.PG_DOOR||id===B.PG_MBLACK)continue;
    if(MGP_ON&&mgProtected(bx,by,bz,'nuke'))continue;
    if(id===B.TNT){setBlock(bx,by,bz,B.AIR);primeTNT(bx,by,bz,0.3+Math.random()*0.6,ACTOR);continue;}
    setBlock(bx,by,bz,B.AIR);
    if(Math.random()<0.015){
      const dr=blockDrop(id);
      if(dr)spawnDrop(bx+0.5,by+0.5,bz+0.5,{id:dr.id,count:dr.count},(Math.random()-0.5)*3,3,(Math.random()-0.5)*3);
    }
  }
  /* scorched earth + spot fires on the rim */
  if(grief)for(let i=0;i<60;i++){
    const a=Math.random()*6.28,rr=r+Math.random()*5;
    const bx=Math.floor(x+Math.sin(a)*rr),bz=Math.floor(z+Math.cos(a)*rr);
    const ci=colInfo(bx,bz);
    if(getBlock(bx,ci.h-1,bz)===B.GRASS)setBlock(bx,ci.h-1,bz,B.DIRT);
    if(i<14&&typeof igniteAt==='function')igniteAt(bx,ci.h,bz);
  }
  /* hurt everything that breathes */
  const pdx=P.x-x,pdz=P.z-z;
  const pdist=Math.hypot(pdx,(P.y+0.9)-y,pdz);
  if(!P.dead&&pdist<16){
    P.hurtT=0;
    damagePlayer(Math.max(3,Math.round(20-pdist*1.2)),pdx,pdz);
    P.vy=Math.max(P.vy,Math.max(2,11-pdist*0.6));
  }
  for(const o of entities){
    if(o.t!=='mob'||o.dead)continue;
    const od=Math.hypot(o.x-x,o.z-z);
    if(od<14){
      o.hurtT=0;
      hurtMob(o,Math.max(2,Math.round(22-od*1.4)),(o.x-x)||0.1,(o.z-z)||0.1);
    }
  }
  /* the show: flash, quake, mushroom */
  nukeShake(Math.max(0.25,1.7-pdist*0.045),2.4);
  NUKE.flash=clamp(1.4-pdist*0.02,0.25,1);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,0.32,8,36),
    new THREE.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:0.95}));
  ring.rotation.x=Math.PI/2;
  ring.position.set(x,y+0.4,z);
  scene.add(ring);
  entities.push({t:'nukefx',x,y,z,age:0,mesh:ring,puffs:[],snd:0});
  burstParticles(x,y,z,B.TNT,60,2.2);
  burstParticles(x,y+2,z,B.LAVA,40,2);
  playS('boom');
  playS('rumble');
}
function updateNukefx(e,dt){
  e.age+=dt;
  /* expanding shockwave */
  const s=1+e.age*26;
  e.mesh.scale.set(s,s,s);
  if(e.mesh.material)e.mesh.material.opacity=Math.max(0,0.95-e.age*0.75);
  /* staged thunder */
  if(e.age>0.5&&e.snd<1){e.snd=1;playS('boom');}
  if(e.age>1.2&&e.snd<2){e.snd=2;playS('boom');playS('rumble');}
  /* the column rises */
  if(e.age<2.6&&Math.random()<0.85){
    const col=Math.random()<0.4?0xff7a1a:(Math.random()<0.5?0x8a8a8a:0x55504a);
    const m=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.9,0.9),
      new THREE.MeshLambertMaterial({color:col,transparent:true,opacity:0.95}));
    m.position.set(e.x+(Math.random()-0.5)*2.4,e.y+0.5,e.z+(Math.random()-0.5)*2.4);
    m.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
    scene.add(m);
    e.puffs.push({m,vy:7+Math.random()*4,vx:(Math.random()-0.5)*0.8,vz:(Math.random()-0.5)*0.8,age:0,cap:false});
  }
  /* the cap blooms */
  if(e.age>1&&e.age<3.4&&Math.random()<0.8){
    const a=Math.random()*6.28,rr=2.5+Math.random()*3.5;
    const m=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2),
      new THREE.MeshLambertMaterial({color:Math.random()<0.3?0xc9742a:0x6e675f,transparent:true,opacity:0.92}));
    m.position.set(e.x+Math.sin(a)*rr,e.y+13+Math.random()*2.5,e.z+Math.cos(a)*rr);
    m.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
    scene.add(m);
    e.puffs.push({m,vy:0.7,vx:Math.sin(a)*1.1,vz:Math.cos(a)*1.1,age:0,cap:true});
  }
  for(let i=e.puffs.length-1;i>=0;i--){
    const p=e.puffs[i];
    p.age+=dt;
    p.m.position.y+=p.vy*dt;
    p.m.position.x+=p.vx*dt;
    p.m.position.z+=p.vz*dt;
    if(!p.cap)p.vy*=Math.exp(-dt*0.35);
    p.m.rotation.y+=dt*0.8;
    const life=p.cap?3.2:2.4;
    const k=1-p.age/life;
    const sc=(p.cap?1.5:1)*(0.6+p.age*0.5);
    p.m.scale.set(sc,sc,sc);
    if(p.m.material)p.m.material.opacity=Math.max(0,0.95*k);
    if(p.age>life){scene.remove(p.m);e.puffs.splice(i,1);}
  }
  if(e.age>5&&e.puffs.length===0)removeEnt(e);
}
/* ----- spawn eggs: one per beast ----- */
const EGG_BASE=250;
const EGG_MOBS=['pig','cow','sheep','zombie','skel','boomer','spider','alien',
  'dragon','creep','nuker','boss','dking','titan','demon'];
const EGG_NAMES={pig:'Pig',cow:'Cow',sheep:'Sheep',zombie:'Zombie',skel:'Skeleton',
  boomer:'Boomer',spider:'Spider',alien:'Alien',dragon:'Dragon',
  creep:'Nuke Keg',nuker:'Armed Nuke Keg',boss:'Warden',
  dking:'Dragon King',titan:'Stone Titan',demon:'MALGORATH'};
for(let i=0;i<EGG_MOBS.length;i++){
  const mt=EGG_MOBS[i];
  idef(EGG_BASE+i,{name:EGG_NAMES[mt]+' Spawn Egg',icon:'egg_'+mt,stack:16,egg:mt});
  tile('egg_'+mt,(m=>c=>{
    const T=MOBT[m];
    c.clearRect(0,0,16,16);
    c.fillStyle=T.body;
    c.beginPath();c.ellipse?c.ellipse(8,9,5,6,0,0,7):c.arc(8,9,5.5,0,7);c.fill();
    c.fillStyle=T.legc;
    c.fillRect(5,5,2,2);c.fillRect(9,7,2,2);c.fillRect(6,11,2,2);c.fillRect(10,11,1,2);
    c.fillStyle='rgba(255,255,255,.35)';c.fillRect(6,4,2,2);
    if(MOBT[m].nuke){c.fillStyle='#ffd84d';c.fillRect(7,8,2,2);c.fillRect(5,9,1,1);c.fillRect(10,9,1,1);}
  })(mt));
}


