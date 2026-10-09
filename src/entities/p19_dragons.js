/* ===================================================================== */
/* PART 19 — DRAGONS  (2.0)                                              */
/* ===================================================================== */
MOBT.dragon={hp:60,hw:1.0,h:1.4,spd:7,fly:true,dmg:5,xp:20,
  body:'#8f2222',legc:'#5e1414',drop:{id:IT.DSCALE,min:2,max:4}};

function dragonFire(e,tx,ty,tz,spread){
  const hx=e.x-Math.sin(e.yaw)*1.6,hy=e.y+1.6,hz=e.z-Math.cos(e.yaw)*1.6;
  let dx=tx-hx,dy=ty-hy,dz=tz-hz;
  const dd=Math.hypot(dx,dy,dz)||1;
  const sp=14;
  dx=dx/dd*sp+(Math.random()-0.5)*(spread||0);
  dy=dy/dd*sp+1.2+(Math.random()-0.5)*(spread||0);
  dz=dz/dd*sp+(Math.random()-0.5)*(spread||0);
  const m=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.22,0.22),
    new THREE.MeshLambertMaterial({color:0xff9a3f,emissive:new THREE.Color(0.7,0.3,0)}));
  scene.add(m);
  entities.push({t:'fireb',x:hx,y:hy,z:hz,vx:dx,vy:dy,vz:dz,age:0,mesh:m,trailT:0});
  playS('rumble');
}
function dragonBrain(e,dt,T){
  if(!chunkAt(Math.floor(e.x),Math.floor(e.z)))return;
  const ridden=P&&P.ride===e&&!P.dead;
  e.fT=Math.max(0,(e.fT||0)-dt);
  e.cool=Math.max(0,(e.cool||0)-dt);
  e.flap=(e.flap||0)+dt*(6+Math.hypot(e.vx,e.vy,e.vz)*0.5);
  const pdx=P.x-e.x,pdy=(P.y+1)-e.y,pdz=P.z-e.z;
  const pd=Math.hypot(pdx,pdz);
  let tx,ty,tz,sp;
  if(ridden){
    /* you are the pilot */
    e.yaw=P.yaw;
    const f=(!modalOpen()&&!paused)?clamp((KEY.KeyW?1:0)-(KEY.KeyS?0.5:0)+TOUCH.f,-0.5,1):0;
    const d=lookDir();
    sp=f>0?11:0;
    let vx=d[0]*sp*f,vy=d[1]*sp*f,vz=d[2]*sp*f;
    if(KEY.Space)vy+=6;
    if(f===0&&!KEY.Space)vy=lerp(e.vy,-0.6,0.4); /* gentle hover-sink */
    const k=1-Math.exp(-dt*3.2);
    e.vx=lerp(e.vx,vx,k);e.vy=lerp(e.vy,vy,k);e.vz=lerp(e.vz,vz,k);
    moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
    e.hx=e.x;e.hy=Math.max(e.y,e.hy||e.y);e.hz=e.z;
  }else{
    const hostile=e.angry&&!P.dead&&P.mode!=='c';
    if(e.tame&&!hostile){
      /* loyal: drift near the player */
      if(pd>16){tx=P.x;ty=P.y+8;tz=P.z;sp=9;}
      else{
        e.orb+=dt*0.5;
        tx=P.x+Math.sin(e.orb)*9;ty=P.y+7+Math.sin(e.orb*1.7)*1.5;tz=P.z+Math.cos(e.orb)*9;sp=5;
      }
    }else if(hostile&&pd<30){
      if(e.cool>0){ /* climb away after a strike */
        tx=e.x+(e.x-P.x);ty=e.y+6;tz=e.z+(e.z-P.z);sp=8;
      }else{
        tx=P.x;ty=P.y+1.2;tz=P.z;sp=9.5;
        const d3=Math.hypot(pdx,pdy,pdz);
        if(d3<2.4&&e.atkT<=0){
          e.atkT=1.2;e.cool=1.8;
          damagePlayer(T.dmg,pdx,pdz);
        }
        if(e.fT<=0&&pd>6&&pd<26&&mobSees(e)){
          e.fT=T.boss?2.2:3.4;
          if(T.boss){for(let i=0;i<3;i++)dragonFire(e,P.x,P.y+1,P.z,3);}
          else dragonFire(e,P.x,P.y+1,P.z,0.6);
        }
      }
    }else{
      /* circle home */
      e.orb+=dt*0.55;
      tx=e.hx+Math.sin(e.orb)*12;ty=e.hy+Math.sin(e.orb*1.3)*2;tz=e.hz+Math.cos(e.orb)*12;sp=6;
    }
    let dx=tx-e.x,dy=ty-e.y,dz=tz-e.z;
    const dd=Math.hypot(dx,dy,dz)||1;
    const k=1-Math.exp(-dt*2.2);
    e.vx=lerp(e.vx,dx/dd*sp,k);
    e.vy=lerp(e.vy,dy/dd*sp,k);
    e.vz=lerp(e.vz,dz/dd*sp,k);
    moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
    const want=Math.atan2(-e.vx,-e.vz);
    e.yaw+=(((want-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI)*Math.min(1,dt*4);
  }
  /* wings (generic humanoids wrap their limbs; dragons carry raw meshes) */
  for(let i=0;i<e.legs.length;i++){
    const s=i===0?-1:1;
    const w=e.legs[i].rotation?e.legs[i]:(e.legs[i].g&&e.legs[i].g.rotation?e.legs[i].g:null);
    if(w)w.rotation.z=s*Math.sin(e.flap)*0.55;
  }
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.y=e.yaw;
  e.mesh.rotation.x=clamp(-e.vy*0.04,-0.35,0.35);
  if(e.y<-40)removeEnt(e);
  if(e.y>WH+30){e.y=WH+30;e.vy=Math.min(e.vy,0);}
}
let dragT=0;
function tickDragons(dt){
  dragT-=dt;
  if(dragT>0)return;
  dragT=9;
  if(DIM==='puppet')return;
  if(!P||P.dead||!GR.mobSpawn)return;
  let wild=0;
  for(const e of entities)
    if(e.t==='mob'&&e.mt==='dragon'&&!e.dead&&!e.tame&&Math.hypot(e.x-P.x,e.z-P.z)<140)wild++;
  if(wild>=2||Math.random()>0.3)return;
  const a=Math.random()*6.28,r=45+Math.random()*30;
  const sx=Math.floor(P.x+Math.sin(a)*r),sz=Math.floor(P.z+Math.cos(a)*r);
  const ci=colInfo(sx,sz);
  if(ci.h>52&&ci.h<WH-20){
    spawnMob('dragon',sx+0.5,ci.h+14,sz+0.5);
    if(Math.hypot(sx-P.x,sz-P.z)<70)showToast('A dragon wheels overhead...');
  }
}


