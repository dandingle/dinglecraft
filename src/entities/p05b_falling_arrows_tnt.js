/* ----- falling blocks ----- */
function checkFalling(x,y,z){
  const id=getBlock(x,y,z);
  if(!DEFS[id].gravity)return;
  const below=getBlock(x,y-1,z);
  const bd=DEFS[below];
  if(below===B.AIR||below===B.WATER||bd.replace){
    setBlock(x,y,z,B.AIR);
    const m=new THREE.Mesh(mkCubeGeo(id,0.98),matOp);
    scene.add(m);
    entities.push({t:'fall',id,x:x+0.5,y:y,z:z+0.5,vx:0,vy:0,vz:0,hw:0.45,h:0.95,onGround:false,mesh:m});
    checkFalling(x,y+1,z);
  }
}
function updateFall(e,dt){
  e.vy-=GRAV*dt;
  moveBody(e,0,e.vy*dt,0,false);
  e.mesh.position.set(e.x,e.y+0.49,e.z);
  if(e.onGround){
    const bx=Math.floor(e.x),by=Math.round(e.y),bz=Math.floor(e.z);
    const cur=getBlock(bx,by,bz);
    if(cur===B.AIR||cur===B.WATER||DEFS[cur].replace)setBlock(bx,by,bz,e.id);
    else spawnDrop(e.x,e.y+0.3,e.z,{id:e.id,count:1},0,1,0);
    removeEnt(e);
  }
  if(e.y<-30)removeEnt(e);
}

/* ----- arrows ----- */
let arrowGeo=null,arrowMat=null;
function spawnArrow(x,y,z,vx,vy,vz,owner,dmg){
  if(!arrowGeo){
    arrowGeo=new THREE.BoxGeometry(0.07,0.07,0.55);
    arrowMat=new THREE.MeshLambertMaterial({color:0x8a6a45});
  }
  const m=new THREE.Mesh(arrowGeo,arrowMat);
  scene.add(m);
  entities.push({t:'arrow',x,y,z,vx,vy,vz,owner,dmg,age:0,mesh:m});
}
function updateArrow(e,dt){
  e.age+=dt;
  if(e.age>20){removeEnt(e);return;}
  e.vy-=14*dt;
  const nx=e.x+e.vx*dt,ny=e.y+e.vy*dt,nz=e.z+e.vz*dt;
  /* mob / player hits */
  for(const m of entities){
    if(m.t!=='mob'||m.dead)continue;
    if(e.owner!=='p'&&m.hostile)continue;
    if(nx>m.x-m.hw-0.1&&nx<m.x+m.hw+0.1&&ny>m.y-0.1&&ny<m.y+m.h+0.1&&nz>m.z-m.hw-0.1&&nz<m.z+m.hw+0.1){
      HIT_BY=e.owner==='p'?'Dan':(e.owner==='m'?'Skeleton':e.owner);HIT_HOW='arrow';hurtMob(m,e.dmg,e.vx,e.vz);HIT_BY=null;HIT_HOW=null;removeEnt(e);return;
    }
  }
  if(e.owner!=='p'&&!P.dead&&e.age>0.1){
    if(nx>P.x-P.hw-0.1&&nx<P.x+P.hw+0.1&&ny>P.y&&ny<P.y+P.h+0.1&&nz>P.z-P.hw-0.1&&nz<P.z+P.hw+0.1){
      LASTDMG={by:e.owner==='m'?'Skeleton':(e.owner||null),how:'arrow',t:AG_T};damagePlayer(e.dmg,e.vx,e.vz);removeEnt(e);return;
    }
  }
  if(solidAt(Math.floor(nx),Math.floor(ny),Math.floor(nz))){
    playS('thud');
    if(e.owner==='p'&&Math.random()<0.85)spawnDrop(e.x,e.y,e.z,{id:IT.ARROW,count:1},0,0.5,0);
    removeEnt(e);return;
  }
  e.x=nx;e.y=ny;e.z=nz;
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.lookAt(e.x+e.vx,e.y+e.vy,e.z+e.vz);
}

/* ----- TNT ----- */
function primeTNT(x,y,z,fuse,owner){
  const m=new THREE.Mesh(mkCubeGeo(B.TNT,0.98),matOp);
  const fl=new THREE.Mesh(new THREE.BoxGeometry(1.02,1.02,1.02),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.6}));
  fl.visible=false;m.add(fl);
  scene.add(m);
  entities.push({t:'tnt',x:x+0.5,y:y,z:z+0.5,vx:0,vy:0,vz:0,hw:0.45,h:0.95,
    onGround:false,fuse:fuse!==undefined?fuse:1.7,mesh:m,flash:fl,owner:owner||null});
}
function updateTNT(e,dt){
  e.vy-=GRAV*dt;
  moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  e.vx*=0.92;e.vz*=0.92;
  e.fuse-=dt;
  e.flash.visible=(e.fuse*5|0)%2===0;
  e.mesh.position.set(e.x,e.y+0.49,e.z);
  if(e.fuse<=0){removeEnt(e);explode(e.x,e.y+0.5,e.z,3.2,false,e.owner);}
}
function explode(x,y,z,r,byMob,owner){
  const pa=ACTOR,ph=HIT_BY,pw=HIT_HOW,pe=EXPL_BY;
  ACTOR=owner||null;HIT_BY=owner||(byMob?'Boomer':null);HIT_HOW='tnt';EXPL_BY=HIT_BY;
  try{explode0(x,y,z,r,byMob);}finally{ACTOR=pa;HIT_BY=ph;HIT_HOW=pw;EXPL_BY=pe;}
}
function explode0(x,y,z,r,byMob){
  playS('boom');
  if(byMob&&!GR.mobGrief){
    burstParticles(x,y,z,B.TNT,30,1.4);
    return;
  }
  const r2=r*r;
  for(let dx=-r|0;dx<=r;dx++)for(let dy=-r|0;dy<=r;dy++)for(let dz=-r|0;dz<=r;dz++){
    const ds=dx*dx+dy*dy+dz*dz;
    if(ds>r2)continue;
    const bx=Math.floor(x)+dx,by=Math.floor(y)+dy,bz=Math.floor(z)+dz;
    const id=getBlock(bx,by,bz);
    if(id===B.AIR||id===B.BEDROCK||id===B.WATER||id===B.PG_STRUNK||id===B.PG_DOOR||id===B.PG_MBLACK)continue;
    if(MGP_ON&&mgProtected(bx,by,bz,'boom'))continue;
    if(id===B.TNT){setBlock(bx,by,bz,B.AIR);primeTNT(bx,by,bz,0.3+Math.random()*0.6,ACTOR);continue;}
    setBlock(bx,by,bz,B.AIR);
    if(Math.random()<0.3){
      const dr=blockDrop(id);
      if(dr)spawnDrop(bx+0.5,by+0.5,bz+0.5,{id:dr.id,count:dr.count},(Math.random()-0.5)*2,2,(Math.random()-0.5)*2);
    }
  }
  burstParticles(x,y,z,B.TNT,40,1.2);
  /* damage entities + player */
  for(const m of entities){
    if(m.dead)continue;
    if(m.t==='mob'){
      const d=Math.hypot(m.x-x,m.y+m.h*0.5-y,m.z-z);
      if(d<r*1.6)hurtMob(m,Math.round((1-d/(r*1.6))*22),m.x-x,m.z-z);
    }else if(m.t==='tnt'){
      const d=Math.hypot(m.x-x,m.y-y,m.z-z);
      if(d<r)m.fuse=Math.min(m.fuse,0.2+Math.random()*0.4);
    }
  }
  const pd=Math.hypot(P.x-x,P.y+0.9-y,P.z-z);
  if(pd<r*1.6){P.hurtT=0;LASTDMG={by:EXPL_BY,how:'tnt',t:AG_T};damagePlayer(Math.round((1-pd/(r*1.6))*22),P.x-x,P.z-z);}
}

