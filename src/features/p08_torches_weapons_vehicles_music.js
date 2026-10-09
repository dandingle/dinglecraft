/* ===================================================================== */
/* PART 8 — wall torches, weapons, vehicles, music  (v1.1)               */
/* ===================================================================== */

/* ----- wall-mounted torches ----- */
B.TORCH_PX=39;B.TORCH_NX=40;B.TORCH_PZ=41;B.TORCH_NZ=42;
function isTorch(id){return id===B.TORCH||(id>=B.TORCH_PX&&id<=B.TORCH_NZ)||id===B.PG_LAMP;}
function wallTorchId(nx,nz){return nx>0?B.TORCH_PX:nx<0?B.TORCH_NX:nz>0?B.TORCH_PZ:B.TORCH_NZ;}
const WTD={[B.TORCH_PX]:[1,0],[B.TORCH_NX]:[-1,0],[B.TORCH_PZ]:[0,1],[B.TORCH_NZ]:[0,-1]};
for(const k in WTD){
  def(+k,{name:'Torch',tiles:'torch',hard:0,solid:false,opq:false,bucket:'cut',
    cross:true,wt:WTD[k],drop:B.TORCH,light:true,hide:true});
}
function addWallTorch(b,x,y,z,d){
  const uvr=tileUV(d._t.side);
  const u0=uvr[0],v0=uvr[1],u1=uvr[2],v1=uvr[3];
  const nx=d.wt[0],nz=d.wt[1];
  const cx=x+0.5-nx*0.30,cz=z+0.5-nz*0.30,sh=0.42,sy=0.62,by=0.14;
  const qs=[[[-.34,-.34],[.34,.34]],[[.34,-.34],[-.34,.34]]];
  for(const q of qs){
    const pts=[[q[0][0],0,q[0][1]],[q[1][0],0,q[1][1]],[q[1][0],1,q[1][1]],[q[0][0],1,q[0][1]]];
    const uvs=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
    for(let i=0;i<4;i++){
      const vy=pts[i][1];
      b.p.push(cx+pts[i][0]+nx*sh*vy, y+by+vy*sy, cz+pts[i][2]+nz*sh*vy);
      b.n.push(0,1,0);
      b.u.push(uvs[i][0],uvs[i][1]);
      b.c.push(.92,.92,.92);
    }
    const s=b.vc;b.ix.push(s,s+1,s+2,s,s+2,s+3);b.vc+=4;
  }
}
function popTorch(x,y,z){
  const id=getBlock(x,y,z);
  if(!isTorch(id))return;
  setBlock(x,y,z,B.AIR);
  spawnDrop(x+0.5,y+0.3,z+0.5,{id:B.TORCH,count:1},0,1.5,0);
  burstParticles(x+0.5,y+0.4,z+0.5,B.TORCH,4,0.3);
}
function checkTorchPop(x,y,z){
  const up=getBlock(x,y+1,z);
  if(up===B.TORCH)popTorch(x,y+1,z);
  else if(isDoorId(up)&&DEFS[up].door.half===0)popDoor(x,y+1,z);
  const D4=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const dd of D4){
    const id=getBlock(x+dd[0],y,z+dd[1]);
    const w=DEFS[id]&&DEFS[id].wt;
    if(w&&w[0]===dd[0]&&w[1]===dd[1])popTorch(x+dd[0],y,z+dd[1]);
  }
}
/* crossed-quad geometry for holding torches / plants */
const CROSSGEO={};
function mkCrossGeo(id,sc){
  const key=id+'_'+sc;
  if(CROSSGEO[key])return CROSSGEO[key];
  const U=tileUV(DEFS[id]._t.side);
  const pos=[],uv=[],col=[],nrm=[],idx=[];
  const h=0.5*sc,w=0.38*sc;
  const qs=[[[-w,-w],[w,w]],[[w,-w],[-w,w]]];
  for(const q of qs){
    const pts=[[q[0][0],-h,q[0][1]],[q[1][0],-h,q[1][1]],[q[1][0],h,q[1][1]],[q[0][0],h,q[0][1]]];
    const base=pos.length/3;
    for(let i=0;i<4;i++){
      pos.push(pts[i][0],pts[i][1],pts[i][2]);
      nrm.push(0,1,0);
      uv.push(i===0||i===3?U[0]:U[2], i<2?U[1]:U[3]);
      col.push(1,1,1);
    }
    idx.push(base,base+1,base+2,base,base+2,base+3);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx);
  CROSSGEO[key]=g;
  return g;
}

/* ----- weapon + vehicle items ----- */
IT.BULLET=190;IT.SHELL=191;IT.GRENADE=192;IT.WHEEL=193;IT.CAR=194;
const GUNTYPE=['Pistol','Shotgun','SMG','Sniper Rifle'];
const GUNBASE=[
  {dmg:5,  cd:0.38, spd:62, sp:0.012,pel:1,ammo:0,rec:0.020,grav:4,dur:250,snd:'pistol'},
  {dmg:2.4,cd:0.95, spd:46, sp:0.085,pel:8,ammo:1,rec:0.065,grav:7,dur:200,snd:'shotgun'},
  {dmg:3,  cd:0.115,spd:55, sp:0.034,pel:1,ammo:0,rec:0.011,grav:4,dur:380,snd:'smg',auto:true},
  {dmg:15, cd:1.35, spd:130,sp:0.003,pel:1,ammo:0,rec:0.05, grav:0,dur:170,snd:'sniper',scope:true}];
const GUNMAT=[
  {n:'Iron',   col:'#d8d8d8',dmg:1,   cd:1,   dur:1},
  {n:'Golden', col:'#ffe34d',dmg:0.85,cd:0.62,dur:0.45},
  {n:'Diamond',col:'#46e2cf',dmg:1.4, cd:0.95,dur:3}];
const gunId=(m,t)=>200+m*4+t;
for(let m=0;m<3;m++)for(let t=0;t<4;t++){
  const b=GUNBASE[t],M=GUNMAT[m];
  idef(gunId(m,t),{name:M.n+' '+GUNTYPE[t],icon:'gun_'+m+'_'+t,stack:1,
    dur:Math.round(b.dur*M.dur),
    gun:{dmg:+(b.dmg*M.dmg).toFixed(1),cd:+(b.cd*M.cd).toFixed(3),spd:b.spd,sp:b.sp,
      pel:b.pel,ammo:b.ammo,rec:b.rec,grav:b.grav,auto:!!b.auto,scope:!!b.scope,snd:b.snd}});
}
idef(IT.BULLET,{name:'Bullet',icon:'i_bullet'});
idef(IT.SHELL,{name:'Shotgun Shell',icon:'i_shell'});
idef(IT.GRENADE,{name:'Grenade',icon:'i_grenade',stack:16,grenade:true});
idef(IT.WHEEL,{name:'Wheel',icon:'i_wheel',stack:16});
idef(IT.CAR,{name:'Car',icon:'i_car',stack:1,car:true});

/* icon tiles */
function drawGun(c,t,col){
  c.clearRect(0,0,16,16);
  const q=(x,y,w,h,cl)=>{c.fillStyle=cl;c.fillRect(x,y,w,h);};
  const D='#26262b',Br='#6b4a2e';
  if(t===0){q(3,6,10,2,col);q(11,5,2,1,col);q(3,8,4,1,D);q(4,9,3,4,D);}
  else if(t===1){q(1,6,12,2,col);q(1,8,5,1,'#4a4a52');q(5,9,4,2,D);q(12,6,3,4,Br);q(13,10,2,2,Br);}
  else if(t===2){q(2,6,11,3,col);q(2,5,3,1,D);q(12,5,3,2,D);q(6,9,3,5,D);q(1,7,1,1,D);}
  else{q(0,7,12,2,col);q(4,4,5,2,D);q(5,5,1,1,'#8fd8ff');q(11,6,4,4,Br);q(9,9,2,3,D);q(2,9,1,3,D);}
}
for(let m=0;m<3;m++)for(let t=0;t<4;t++){
  (function(mm,tt){tile('gun_'+mm+'_'+tt,c=>drawGun(c,tt,GUNMAT[mm].col));})(m,t);
}
tile('i_bullet',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#c9a23a';c.fillRect(6,6,4,7);
  c.fillStyle='#e6c870';c.fillRect(6,6,1,7);
  c.fillStyle='#9b9ba3';c.fillRect(6,3,4,3);
  c.fillStyle='#c9ccd4';c.fillRect(7,2,2,1);});
tile('i_shell',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#c0392b';c.fillRect(6,3,4,8);
  c.fillStyle='#e05a4a';c.fillRect(6,3,1,8);
  c.fillStyle='#c9a23a';c.fillRect(6,11,4,3);
  c.fillStyle='#8a6d22';c.fillRect(7,12,2,1);});
tile('i_grenade',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#3b5634';c.fillRect(5,5,6,8);c.fillRect(4,6,8,6);
  c.fillStyle='#54774a';c.fillRect(5,6,2,5);
  c.fillStyle='#23341f';c.fillRect(9,7,2,4);
  c.fillStyle='#8d949e';c.fillRect(7,3,2,2);c.fillRect(9,2,3,2);
  c.fillStyle='#c9ccd4';c.fillRect(10,3,1,1);});
tile('i_wheel',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#17171a';c.fillRect(4,2,8,12);c.fillRect(2,4,12,8);
  c.fillStyle='#2e2e34';c.fillRect(4,4,2,8);
  c.fillStyle='#9b9ba3';c.fillRect(6,6,4,4);
  c.fillStyle='#5b5b63';c.fillRect(7,7,2,2);});
tile('i_car',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#c23b2e';c.fillRect(1,7,14,4);
  c.fillStyle='#e0584a';c.fillRect(1,7,14,1);
  c.fillStyle='#9fd4ff';c.fillRect(4,4,7,3);
  c.fillStyle='#c23b2e';c.fillRect(3,4,1,3);c.fillRect(11,4,1,3);c.fillRect(7,4,1,3);
  c.fillStyle='#17171a';c.fillRect(3,11,3,3);c.fillRect(10,11,3,3);
  c.fillStyle='#5b5b63';c.fillRect(4,12,1,1);c.fillRect(11,12,1,1);
  c.fillStyle='#fff2b0';c.fillRect(14,8,1,2);});

/* recipes */
for(let m=0;m<3;m++){
  const M=[IT.IRON,IT.GOLD,IT.DIAMOND][m];
  R(['MM ','  S'],{M:M,S:IT.STICK},gunId(m,0),1);
  R(['MMM',' S '],{M:M,S:IT.STICK},gunId(m,1),1);
  R(['MMM','SS '],{M:M,S:IT.STICK},gunId(m,2),1);
  R(['MMM','GS '],{M:M,S:IT.STICK,G:B.GLASS},gunId(m,3),1);
}
RS([IT.IRON,IT.GUNPOWDER],IT.BULLET,8);
RS([IT.IRON,IT.GUNPOWDER,IT.GUNPOWDER],IT.SHELL,4);
RS([IT.GUNPOWDER,IT.GUNPOWDER,IT.GUNPOWDER,IT.IRON],IT.GRENADE,2);
R([' I ','I I',' I '],{I:IT.IRON},IT.WHEEL,1);
R(['IGI','III','W W'],{I:IT.IRON,G:B.GLASS,W:IT.WHEEL},IT.CAR,1);

/* ----- firing ----- */
function tryFire(st,g,edge,aim){
  const ammoId=g.ammo===1?IT.SHELL:IT.BULLET;
  if(P.mode!=='c'){
    if(invCount(P.inv,ammoId)<1){
      P.useT=Math.max(P.useT,0.25);
      playS('click');
      if(edge)showToast('Out of '+DEFS[ammoId].name+'s — craft more at a table');
      return;
    }
    invConsume(P.inv,ammoId,1);
    redrawHotbar();
  }
  P.useT=g.cd;P.swing=1;
  const sp2=g.sp*((aim||0)>0.5?0.35:1.7); /* steadier when aiming, looser from the hip */
  const e=eyePos(),l=lookDir();
  for(let i=0;i<g.pel;i++){
    let dx=l[0]+(Math.random()-0.5)*2*sp2,
        dy=l[1]+(Math.random()-0.5)*2*sp2,
        dz=l[2]+(Math.random()-0.5)*2*sp2;
    const dl=Math.hypot(dx,dy,dz);
    spawnBullet(e[0]+l[0]*0.5,e[1]+l[1]*0.5-0.06,e[2]+l[2]*0.5,
                dx/dl*g.spd,dy/dl*g.spd,dz/dl*g.spd,g.dmg,g.grav);
  }
  burstParticles(e[0]+l[0]*0.9,e[1]+l[1]*0.9-0.05,e[2]+l[2]*0.9,B.TORCH,3,0.22);
  P.pitch=clamp(P.pitch+g.rec,-1.55,1.55);
  damageHeld(1);
  playS(g.snd);
}
let bltGeo=null,bltMat=null;
function spawnBullet(x,y,z,vx,vy,vz,dmg,grav){
  if(!bltGeo){
    bltGeo=new THREE.BoxGeometry(0.055,0.055,0.34);
    bltMat=new THREE.MeshBasicMaterial({color:0xffd877});
  }
  const m=new THREE.Mesh(bltGeo,bltMat);
  m.position.set(x,y,z);
  scene.add(m);
  entities.push({t:'blt',x,y,z,vx,vy,vz,dmg,grav,age:0,mesh:m});
}
function updateBullet(e,dt){
  e.age+=dt;
  if(e.age>1.8){removeEnt(e);return;}
  e.vy-=e.grav*dt;
  const n=Math.max(1,Math.ceil(Math.hypot(e.vx,e.vy,e.vz)*dt/0.5));
  for(let i=0;i<n;i++){
    const nx=e.x+e.vx*dt/n,ny=e.y+e.vy*dt/n,nz=e.z+e.vz*dt/n;
    for(const m of entities){
      if((m.t!=='mob'&&m.t!=='car'&&m.t!=='skate'&&m.t!=='plane')||m.dead)continue;
      if(m===P.ride)continue;
      if(nx>m.x-m.hw-0.08&&nx<m.x+m.hw+0.08&&ny>m.y-0.08&&ny<m.y+m.h+0.08&&nz>m.z-m.hw-0.08&&nz<m.z+m.hw+0.08){
        if(m.t==='car'||m.t==='skate'||m.t==='plane')hitCar(m,e.dmg);
        else{HIT_BY='Dan';HIT_HOW='arrow';hurtMob(m,e.dmg,e.vx,e.vz);HIT_BY=null;HIT_HOW=null;}
        burstParticles(nx,ny,nz,B.BRICK,4,0.3);
        removeEnt(e);return;
      }
    }
    const bid=getBlock(Math.floor(nx),Math.floor(ny),Math.floor(nz));
    if(DEFS[bid].solid!==false){
      burstParticles(nx,ny,nz,bid,4,0.3);
      playS('thud');
      removeEnt(e);return;
    }
    e.x=nx;e.y=ny;e.z=nz;
  }
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.lookAt(e.x+e.vx,e.y+e.vy,e.z+e.vz);
}
/* ----- grenades ----- */
let nadeG=null,nadeM=null;
function throwGrenade(st){
  if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
  P.useT=0.45;P.swing=1;playS('whoosh');
  if(!nadeG){
    nadeG=new THREE.BoxGeometry(0.2,0.24,0.2);
    nadeM=new THREE.MeshLambertMaterial({color:0x3b5634});
  }
  const m=new THREE.Mesh(nadeG,nadeM);
  const fl=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.3,0.26),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.7}));
  fl.visible=false;m.add(fl);
  scene.add(m);
  const e=eyePos(),l=lookDir();
  entities.push({t:'nade',x:e[0]+l[0]*0.4,y:e[1]+l[1]*0.4,z:e[2]+l[2]*0.4,
    vx:l[0]*13+P.vx*0.5,vy:l[1]*13+3.4,vz:l[2]*13+P.vz*0.5,
    hw:0.12,h:0.22,onGround:false,fuse:2.4,mesh:m,flash:fl});
}
function updateNade(e,dt){
  e.fuse-=dt;
  const pv=e.vy,og=e.onGround;
  e.vy-=GRAV*0.85*dt;
  moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(e.onGround){
    if(pv<-5&&!og){e.vy=-pv*0.38;e.onGround=false;playS('thud');}
    else{e.vx*=Math.exp(-dt*6);e.vz*=Math.exp(-dt*6);}
  }
  e.flash.visible=e.fuse<0.9&&((e.fuse*7|0)%2===0);
  e.mesh.position.set(e.x,e.y+0.12,e.z);
  e.mesh.rotation.x+=dt*6;
  if(e.fuse<=0){removeEnt(e);explode(e.x,e.y+0.15,e.z,2.4,false,mgNadeOwner(e));}
}
/* ----- cars ----- */
function rayAABB(e,ox,oy,oz,dx,dy,dz,max){
  let t0=0,t1=max;
  const p=[ox,oy,oz],d=[dx,dy,dz];
  const mn=[e.x-e.hw,e.y,e.z-e.hw],mx=[e.x+e.hw,e.y+e.h,e.z+e.hw];
  for(let a=0;a<3;a++){
    if(Math.abs(d[a])<1e-9){if(p[a]<mn[a]||p[a]>mx[a])return null;continue;}
    let ta=(mn[a]-p[a])/d[a],tb=(mx[a]-p[a])/d[a];
    if(ta>tb){const tmp=ta;ta=tb;tb=tmp;}
    if(ta>t0)t0=ta;
    if(tb<t1)t1=tb;
    if(t0>t1)return null;
  }
  return t0;
}
function pickCar(ox,oy,oz,dx,dy,dz,max){
  let best=null,bt=max;
  for(const e of entities){
    if((e.t!=='car'&&e.t!=='skate'&&e.t!=='cart'&&e.t!=='boat'&&e.t!=='plane')||e.dead)continue;
    const t=rayAABB(e,ox,oy,oz,dx,dy,dz,bt);
    if(t!==null&&t<bt){bt=t;best=e;}
  }
  return best?{e:best,t:bt}:null;
}
function mkCarMesh(){
  const G=new THREE.Group(),mats=[];
  const reg=o=>{(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.push(m));return o;};
  const body=reg(new THREE.Mesh(new THREE.BoxGeometry(1.05,0.5,1.9),
    new THREE.MeshLambertMaterial({color:0xc23b2e})));
  body.position.y=0.52;G.add(body);
  const cab=reg(new THREE.Mesh(new THREE.BoxGeometry(0.92,0.5,0.95),
    new THREE.MeshLambertMaterial({color:0x9fd4ff,transparent:true,opacity:0.8})));
  cab.position.set(0,0.95,-0.15);G.add(cab);
  const bump=reg(new THREE.Mesh(new THREE.BoxGeometry(1.05,0.16,0.18),
    new THREE.MeshLambertMaterial({color:0x2a2a2e})));
  bump.position.set(0,0.34,0.97);G.add(bump);
  const hlm=new THREE.MeshBasicMaterial({color:0xfff2b0});
  const hl=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.12,0.05),hlm);
  hl.position.set(0.32,0.56,0.97);G.add(hl);
  const hl2=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.12,0.05),hlm);
  hl2.position.set(-0.32,0.56,0.97);G.add(hl2);
  const wheels=[];
  const wg=new THREE.BoxGeometry(0.18,0.42,0.42);
  const wm=new THREE.MeshLambertMaterial({color:0x17171a});
  mats.push(wm);
  for(const sx of[-1,1])for(const sz of[-1,1]){
    const w=new THREE.Mesh(wg,wm);
    w.position.set(sx*0.56,0.22,sz*0.62);
    G.add(w);wheels.push(w);
  }
  return {G,wheels,mats};
}
function spawnCar(x,y,z,yaw){
  const {G,wheels,mats}=mkCarMesh();
  scene.add(G);
  entities.push({t:'car',x,y,z,vx:0,vy:0,vz:0,hw:0.85,h:1.15,hp:30,spd:0,
    yaw:yaw||0,onGround:false,hurtT:0,mesh:G,wheels,mats});
}
function hitCar(e,dmg){
  e.hp-=dmg;e.hurtT=0.4;
  for(const m of e.mats)m.emissive&&m.emissive.setRGB(0.45,0.05,0);
  playS('thud');
  if(e.hp<=0)killCar(e);
}
function killCar(e){
  if(P&&P.ride===e){P.ride=null;dismountPlace(e);}
  spawnDrop(e.x,e.y+0.6,e.z,{id:e.t==='skate'?IT.SKATE:(e.t==='cart'?IT.CART:(e.t==='boat'?IT.BOAT:(e.t==='plane'?IT.PLANE:IT.CAR))),count:1},0,2,0);
  burstParticles(e.x,e.y+0.6,e.z,B.TNT,14,0.7);
  playS('break2');
  removeEnt(e);
}
function updateCar(e,dt){
  if(!chunkAt(Math.floor(e.x),Math.floor(e.z)))return;
  e.hurtT=Math.max(0,e.hurtT-dt);
  if(e.hurtT<0.15)for(const m of e.mats)m.emissive&&m.emissive.setRGB(0,0,0);
  const ridden=P&&P.ride===e&&!P.dead;
  let f=0,s=0;
  if(ridden&&!modalOpen()&&!paused){
    f=clamp((KEY.KeyW?1:0)-(KEY.KeyS?1:0)+TOUCH.f,-1,1);
    s=clamp((KEY.KeyD?1:0)-(KEY.KeyA?1:0)+TOUCH.s,-1,1);
  }
  const inW=getBlock(Math.floor(e.x),Math.floor(e.y+0.4),Math.floor(e.z))===B.WATER;
  let target=f>0?f*14.5:f*5.5;
  if(inW)target*=0.3;
  e.spd=lerp(e.spd,ridden?target:0,1-Math.exp(-dt*(ridden?1.7:2.6)));
  if(Math.abs(e.spd)>0.4)e.yaw-=s*dt*2.1*clamp(Math.abs(e.spd)/5,0.25,1)*Math.sign(e.spd);
  const fx=-Math.sin(e.yaw),fz=-Math.cos(e.yaw);
  const grip=1-Math.exp(-dt*(e.onGround?7:1.5));
  e.vx=lerp(e.vx,fx*e.spd,grip);
  e.vz=lerp(e.vz,fz*e.spd,grip);
  if(inW)e.vy=lerp(e.vy,-1.2,0.05);
  else e.vy-=GRAV*dt;
  if(e.vy<-45)e.vy=-45;
  const spdWas=Math.abs(e.spd);
  const wall=moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(wall){
    /* try to step up one block, keeping momentum */
    let stepped=false;
    if(e.onGround&&spdWas>1&&!inW){
      const fx2=-Math.sin(e.yaw),fz2=-Math.cos(e.yaw);
      const sxp=e.x+fx2*0.45,szp=e.z+fz2*0.45;
      if(!boxCollides(sxp,e.y+1.02,szp,e.hw,e.h)){
        e.x=sxp;e.z=szp;e.y+=1.02;e.onGround=true;stepped=true;
        /* momentum fully preserved */
      }else if(spdWas>2.5&&e.vy<1)e.vy=7.8;
    }
    if(!stepped&&spdWas>9){
      e.hp-=2;e.hurtT=0.4;playS('thud');
      for(const m of e.mats)m.emissive&&m.emissive.setRGB(0.4,0.1,0);
      if(e.hp<=0){killCar(e);return;}
    }
    if(!stepped)e.spd*=0.45;
  }
  rampSnap(e,true,0.8);
  if(e.y<-40){if(P&&P.ride===e)P.ride=null;removeEnt(e);return;}
  for(const w of e.wheels)w.rotation.x-=e.spd*dt*2.6;
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.y=e.yaw;
}
function dismountPlace(c){
  const cands=[[1.6,0],[-1.6,0],[0,1.6],[0,-1.6],[0,0]];
  for(const o of cands){
    const px=c.x+o[0],pz=c.z+o[1],py=(o[0]===0&&o[1]===0)?c.y+1.25:c.y+0.1;
    if(!boxCollides(px,py,pz,P.hw,P.h)){P.x=px;P.y=py;P.z=pz;break;}
  }
  P.vx=c.vx;P.vz=c.vz;P.vy=0;P.fallD=0;
}
function updateRide(dt){
  const c=P.ride;
  if(KEY.ShiftLeft){
    if(!P._shl){P._shl=true;P.ride=null;dismountPlace(c);return;}
  }else P._shl=false;
  P.x=c.x;P.z=c.z;P.y=c.y+(c.seatY!=null?c.seatY:0.45);
  P.vx=c.vx;P.vy=c.vy;P.vz=c.vz;
  P.onGround=true;P.fallD=0;P.sneak=false;
  P.sprint=Math.abs(c.spd)>(c.t==='skate'?7.5:10); /* speed FOV */
  P.eyeY=lerp(P.eyeY,(c.eyeH!=null?c.eyeH:1.25),1-Math.exp(-dt*10));
  P.inWater=getBlock(Math.floor(P.x),Math.floor(P.y+0.4),Math.floor(P.z))===B.WATER;
  const ep=eyePos();
  P.eyeWater=getBlock(Math.floor(ep[0]),Math.floor(ep[1]),Math.floor(ep[2]))===B.WATER;
}
/* ----- new sounds / engine / music ----- */
function kickAudio(){if(soundOn)audio();}
const _playS=playS;
playS=function(n){
  if(!soundOn)return;
  try{
    switch(n){
      case 'pistol': tone(820,180,0.09,'square',0.22);noiseS(0.07,0.26,2600,500);return;
      case 'smg':    tone(700,220,0.06,'square',0.16);noiseS(0.05,0.2,2400,600);return;
      case 'shotgun':noiseS(0.3,0.5,1600,180);tone(150,55,0.22,'square',0.3);return;
      case 'sniper': noiseS(0.32,0.5,2800,260);tone(620,70,0.24,'sawtooth',0.3);return;
      case 'click':  tone(1300,900,0.035,'square',0.14);return;
      case 'whoosh': noiseS(0.16,0.12,900,2800,true);return;
      case 'honk':   tone(440,438,0.3,'square',0.14);tone(554,552,0.3,'square',0.14);return;
      default:_playS(n);
    }
  }catch(e){}
};
let ENG=null;
function engineSnd(on,spd){
  try{
    if(on&&soundOn){
      const a=audio();
      if(!a)return;
      if(!ENG){
        const o=a.createOscillator(),g=a.createGain(),f=a.createBiquadFilter();
        o.type='sawtooth';f.type='lowpass';f.frequency.value=320;
        g.gain.value=0;
        o.connect(f).connect(g).connect(a.destination);
        o.start();
        ENG={o,g};
      }
      ENG.o.frequency.value=44+Math.abs(spd)*7.5;
      ENG.g.gain.value=0.034;
    }else if(ENG)ENG.g.gain.value=0;
  }catch(e){}
}
let musicOn=false,musStep=0,musOct=1,musDeg=0;
function mnote(f,dur,vol,type){
  try{
    if(!AC)return;
    const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;
    o.type=type;o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(vol,t+0.07);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(musDest(AC));
    o.start(t);o.stop(t+dur+0.05);
  }catch(e){}
}
function musicTick(){
  if(!playing||paused||!musicOn||!soundOn||!AC)return;
  const day=sunUp();
  const scale=day?[0,2,4,7,9]:[0,3,5,7,10];
  const base=day?220:174.61;
  musStep++;
  if(musStep%16===1)mnote(base/2,2.6,0.045,'sine');
  if(musStep%16===9)mnote(base/2*Math.pow(2,scale[3]/12),2.4,0.035,'sine');
  if(Math.random()<(day?0.6:0.42)){
    musDeg+=(Math.random()<0.5?-1:1)*(Math.random()<0.82?1:2);
    if(musDeg<0){musDeg+=scale.length;musOct=Math.max(0,musOct-1);}
    if(musDeg>=scale.length){musDeg-=scale.length;musOct=Math.min(2,musOct+1);}
    if(Math.random()<0.05)musOct=1;
    const f=base*Math.pow(2,musOct)*Math.pow(2,scale[musDeg]/12);
    mnote(f,day?0.5:0.8,day?0.04:0.03,'triangle');
  }
}


