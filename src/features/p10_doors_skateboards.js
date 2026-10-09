/* ===================================================================== */
/* PART 10 — wood doors, skateboards, sprint helper  (v1.3)              */
/* ===================================================================== */
const DBLW={t:0,on:false};

/* ----- wood doors ----- */
const DOORD=[[1,0],[-1,0],[0,1],[0,-1]];
B.DOOR_BASE=43;
function doorId(open,half,di){return B.DOOR_BASE+(open?8:0)+(half?4:0)+di;}
function isDoorId(id){const d=DEFS[id];return !!(d&&d.door);}
for(let open=0;open<2;open++)for(let half=0;half<2;half++)for(let di=0;di<4;di++){
  def(doorId(open,half,di),{name:'Wood Door',tiles:half?'door_u':'door_l',
    hard:0.55,cls:'axe',solid:!open,opq:false,bucket:'cut',hide:true,
    door:{open:!!open,half:half,d:DOORD[di]},
    drop:half?null:IT.DOOR});
}
tile('door_l',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#9a6b3f';c.fillRect(0,0,16,16);
  c.fillStyle='#7c5430';c.fillRect(2,1,5,6);c.fillRect(9,1,5,6);c.fillRect(2,9,5,6);c.fillRect(9,9,5,6);
  c.fillStyle='#b07e4c';c.fillRect(2,1,5,1);c.fillRect(9,1,5,1);c.fillRect(2,9,5,1);c.fillRect(9,9,5,1);
  c.fillStyle='#5d431f';c.fillRect(0,0,16,1);c.fillRect(0,7,16,2);c.fillRect(0,15,16,1);
  c.fillRect(0,0,1,16);c.fillRect(15,0,1,16);c.fillRect(7,0,2,16);
  c.fillStyle='#ffd24a';c.fillRect(13,7,2,2);});
tile('door_u',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#9a6b3f';c.fillRect(0,0,16,16);
  c.clearRect(3,3,4,5);c.clearRect(9,3,4,5);
  c.fillStyle='#5d431f';c.fillRect(0,0,16,2);c.fillRect(0,9,16,2);c.fillRect(0,15,16,1);
  c.fillRect(0,0,2,16);c.fillRect(14,0,2,16);c.fillRect(7,0,2,16);
  c.fillStyle='#7c5430';c.fillRect(2,11,5,4);c.fillRect(9,11,5,4);
  c.fillStyle='#b07e4c';c.fillRect(2,11,5,1);c.fillRect(9,11,5,1);});
tile('i_door',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#9a6b3f';c.fillRect(4,1,8,14);
  c.fillStyle='#5d431f';c.fillRect(4,1,8,1);c.fillRect(4,14,8,1);
  c.fillRect(4,1,1,14);c.fillRect(11,1,1,14);c.fillRect(4,7,8,1);
  c.fillStyle='#cfe9ff';c.fillRect(6,3,4,3);
  c.fillStyle='#5d431f';c.fillRect(7,3,1,3);
  c.fillStyle='#ffd24a';c.fillRect(10,8,1,2);});
IT.DOOR=197;
idef(IT.DOOR,{name:'Wood Door',icon:'i_door',stack:16});
R(['PP','PP','PP'],{P:'planks'},IT.DOOR,3);

function addDoor(b,x,y,z,d){
  const half=d.door.half;
  const U=tileUV(Tl[half?'door_u':'door_l']);
  const u0=U[0],v0=U[1],u1=U[2],v1=U[3];
  const th=0.19,nx=d.door.d[0],nz=d.door.d[1],tx=-nz,tz=nx;
  const cx=x+0.5+nx*(0.5-th/2),cz=z+0.5+nz*(0.5-th/2);
  const quad=(px0,pz0,px1,pz1,uu0,uu1,sh)=>{
    const uvs=[[uu0,v0],[uu1,v0],[uu1,v1],[uu0,v1]];
    const pts=[[px0,0,pz0],[px1,0,pz1],[px1,1,pz1],[px0,1,pz0]];
    for(let i=0;i<4;i++){
      b.p.push(pts[i][0],y+pts[i][1],pts[i][2]);
      b.n.push(0,1,0);
      b.u.push(uvs[i][0],uvs[i][1]);
      b.c.push(sh,sh,sh);
    }
    const s=b.vc;b.ix.push(s,s+1,s+2,s,s+2,s+3);b.vc+=4;
  };
  for(const sg of[1,-1]){
    const ox=cx+nx*sg*th/2,oz=cz+nz*sg*th/2;
    quad(ox-tx*0.5,oz-tz*0.5,ox+tx*0.5,oz+tz*0.5,u0,u1,sg>0?0.88:0.72);
  }
  const w=(u1-u0)*th;
  for(const sg of[1,-1]){
    const ex=cx+tx*sg*0.5,ez=cz+tz*sg*0.5;
    quad(ex-nx*th/2,ez-nz*th/2,ex+nx*th/2,ez+nz*th/2,u0,u0+w,0.6);
  }
}
function toggleDoor(x,y,z){
  const lo=getBlock(x,y,z);
  if(!isDoorId(lo)||DEFS[lo].door.half)return;
  const inf=DEFS[lo].door;
  const closing=inf.open;
  if(closing&&P.x+P.hw>x&&P.x-P.hw<x+1&&P.y+P.h>y&&P.y<y+2&&P.z+P.hw>z&&P.z-P.hw<z+1)return;
  const nd=closing?[-inf.d[1],inf.d[0]]:[inf.d[1],-inf.d[0]];
  const di=DOORD.findIndex(v=>v[0]===nd[0]&&v[1]===nd[1]);
  setBlock(x,y,z,doorId(closing?0:1,0,di));
  setBlock(x,y+1,z,doorId(closing?0:1,1,di));
  playS('door');
}
function popDoor(x,y,z){
  if(!isDoorId(getBlock(x,y,z)))return;
  setBlock(x,y,z,B.AIR);
  spawnDrop(x+0.5,y+0.4,z+0.5,{id:IT.DOOR,count:1},0,1.5,0);
  burstParticles(x+0.5,y+0.8,z+0.5,B.PLANK_O,6,0.4);
}

/* ----- skateboard ----- */
IT.SKATE=198;
idef(IT.SKATE,{name:'Skateboard',icon:'i_skate',stack:1,skate:true});
tile('i_skate',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#8a5a2b';c.fillRect(1,7,14,2);c.fillRect(0,6,2,2);c.fillRect(14,6,2,2);
  c.fillStyle='#232327';c.fillRect(2,6,12,1);
  c.fillStyle='#9b9ba3';c.fillRect(3,9,2,1);c.fillRect(11,9,2,1);
  c.fillStyle='#e8e4da';c.fillRect(2,10,3,3);c.fillRect(11,10,3,3);
  c.fillStyle='#8d949e';c.fillRect(3,11,1,1);c.fillRect(12,11,1,1);});
R(['PPP','W W'],{P:'planks',W:IT.WHEEL},IT.SKATE,1);
function mkSkateMesh(){
  /* real deck ("Skateboard" by Poly by Google, CC-BY 3.0, credited in THIRD_PARTY.md) — model length runs along X,
     decks ride along Z, so yaw 90; bottom-anchored in the data */
  const G=new THREE.Group(),mats=[];
  const mat=new THREE.MeshLambertMaterial({vertexColors:true});mats.push(mat);
  const m=new THREE.Mesh(wpnGeo('skate',-1),mat);
  m.rotation.y=Math.PI/2;
  m.scale.set(1.15,1.15,1.15);
  shadowify(m);
  G.add(m);
  return {G,wheels:[],mats};
}
function spawnSkate(x,y,z,yaw){
  const {G,wheels,mats}=mkSkateMesh();
  scene.add(G);
  entities.push({t:'skate',x,y,z,vx:0,vy:0,vz:0,hw:0.36,h:0.3,hp:12,spd:0,
    yaw:yaw||0,onGround:false,hurtT:0,grind:false,gAx:'x',spin:0,lean:0,flip:0,_ol:false,
    seatY:0.18,eyeH:1.5,mesh:G,wheels,mats});
}
function updateSkate(e,dt){
  if(!chunkAt(Math.floor(e.x),Math.floor(e.z)))return;
  e.hurtT=Math.max(0,e.hurtT-dt);
  if(e.hurtT<0.15)for(const m of e.mats)m.emissive&&m.emissive.setRGB(0,0,0);
  const ridden=P&&P.ride===e&&!P.dead;
  let f=0,s=0;
  if(ridden&&!modalOpen()&&!paused){
    f=clamp((KEY.KeyW?1:0)-(KEY.KeyS?1:0)+TOUCH.f,-1,1);
    s=clamp((KEY.KeyD?1:0)-(KEY.KeyA?1:0)+TOUCH.s,-1,1);
  }
  const wasG=e.onGround;
  if(ridden){
    if(wasG){
      e.yaw-=s*dt*2.6*clamp(Math.abs(e.spd)/3,0.2,1.4)*Math.sign(e.spd||1);
      e.lean=lerp(e.lean,-s*0.32*clamp(Math.abs(e.spd)/8,0,1),1-Math.exp(-dt*9));
    }else{
      e.yaw-=s*dt*4.4;
      e.spin+=Math.abs(s)*dt*4.4;
      e.lean=lerp(e.lean,-s*0.45,1-Math.exp(-dt*6));
    }
  }else e.lean=lerp(e.lean,0,1-Math.exp(-dt*6));
  if(wasG){
    if(ridden&&f>0)e.spd=lerp(e.spd,9.4,1-Math.exp(-dt*1.5));
    else if(ridden&&f<0)e.spd=lerp(e.spd,-2.4,1-Math.exp(-dt*3));
    else e.spd*=Math.exp(-dt*(e.grind?0.10:0.30));
  }
  /* surf: water turns the deck into a surfboard, momentum intact */
  const wfx=Math.floor(e.x),wfz=Math.floor(e.z);
  const inWb=getBlock(wfx,Math.floor(e.y+0.05),wfz)===B.WATER||getBlock(wfx,Math.floor(e.y-0.25),wfz)===B.WATER;
  let surf=false;
  if(inWb){
    let wy=Math.floor(e.y+0.05);
    while(wy<WH&&getBlock(wfx,wy,wfz)===B.WATER)wy++;
    const target=wy-0.12;
    if(e.y<target-1.6)e.vy=lerp(e.vy,5,1-Math.exp(-dt*4));
    else{
      if(!e.surf&&e.vy<-3){e.spd=Math.min(14,e.spd+Math.min(3,(-e.vy)*0.14));playS('thud');}
      if(ridden&&KEY.Space&&!P._sj&&e.vy<=0.5){
        P._sj=true;e.vy=7.4;surf=false;playS('ollie');
      }else if(e.vy<=0.5){
        surf=true;
        e.y=lerp(e.y,target,1-Math.exp(-dt*10));
        e.vy=0;
      }
    }
    if(!KEY.Space)P._sj=false;
  }else e.vy-=GRAV*dt;
  e.surf=surf;
  const inW=inWb; /* for the bail check below */
  if(surf&&ridden&&f>0)e.spd=lerp(e.spd,8.6,1-Math.exp(-dt*1.5));
  else if(surf)e.spd*=Math.exp(-dt*(ridden&&f<0?2.5:0.18));
  if(surf&&ridden){
    e.yaw-=s*dt*2.4*clamp(Math.abs(e.spd)/3,0.2,1.3)*Math.sign(e.spd||1);
    e.lean=lerp(e.lean,-s*0.3*clamp(Math.abs(e.spd)/8,0,1),1-Math.exp(-dt*9));
    e.sprayT=(e.sprayT||0)-dt;
    if(Math.abs(e.spd)>3&&e.sprayT<=0){
      e.sprayT=0.14;
      burstParticles(e.x+Math.sin(e.yaw)*0.5,e.y+0.05,e.z+Math.cos(e.yaw)*0.5,B.WATER,2,0.4);
      playS('surfs');
    }
  }
  if(ridden&&KEY.Space){
    if(!e._ol&&(e.onGround||surf)){
      e._ol=true;
      e.vy=7.6;e.onGround=false;e.surf=false;surf=false;
      e.spd+=e.grind?1.0:0.4;
      e.flip=0.45;e.spin=0;e.grind=false;
      trickBump(e,12);
      playS('ollie');
    }
  }else e._ol=false;
  if(e.flip>0)e.flip=Math.max(0,e.flip-dt);
  if(e.vy<-45)e.vy=-45;
  const fx=-Math.sin(e.yaw),fz=-Math.cos(e.yaw);
  const grip=1-Math.exp(-dt*((wasG||surf)?(e.grind?14:9):1.1));
  e.vx=lerp(e.vx,fx*e.spd,grip);
  e.vz=lerp(e.vz,fz*e.spd,grip);
  const prevVy=e.vy,spdWas=Math.abs(e.spd);
  const wall=moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  rampSnap(e,true,0.95);
  let justLanded=false;
  if(!wasG&&e.onGround){
    justLanded=true;
    if(ridden){
      e.spd=Math.min(14,e.spd+Math.min(3.4,Math.abs(prevVy)*0.16));
      if(e.spin>4.5){showToast((e.spin>9?'720':'360')+' spin!');e.spd=Math.min(14,e.spd+0.9);}
    }
    e.spin=0;
    playS('thud');
  }
  /* grinding: ride the lip of any block edge */
  const sx=Math.floor(e.x),sy=Math.round(e.y)-1,sz=Math.floor(e.z);
  let edge=false;
  if(e.onGround&&solidAt(sx,sy,sz)){
    const ax=Math.abs(e.vx)>=Math.abs(e.vz)?'x':'z';
    const a1=ax==='x'?!solidAt(sx,sy,sz-1):!solidAt(sx-1,sy,sz);
    const a2=ax==='x'?!solidAt(sx,sy,sz+1):!solidAt(sx+1,sy,sz);
    edge=a1||a2;
    if(!e.grind&&ridden&&justLanded&&edge&&Math.abs(e.spd)>3.4){
      e.grind=true;e.gAx=ax;playS('grind');
    }
  }
  if(e.grind&&(!edge||Math.abs(e.spd)<2.4||!ridden))e.grind=false;
  if(e.grind){
    if(e.gAx==='x'){
      e.yaw=e.vx>=0?-Math.PI/2:Math.PI/2;
      e.z=lerp(e.z,sz+0.5,1-Math.exp(-dt*12));e.vz*=0.2;
    }else{
      e.yaw=e.vz>=0?Math.PI:0;
      e.x=lerp(e.x,sx+0.5,1-Math.exp(-dt*12));e.vx*=0.2;
    }
    e.sparkT=(e.sparkT||0)-dt;
    if(e.sparkT<=0){
      e.sparkT=0.09;
      burstParticles(e.x,e.y+0.05,e.z,B.TORCH,2,0.18);
      playS('grind');
    }
    trickBump(e,dt*(28+Math.abs(e.spd)*3));
  }
  if(wall){
    if(ridden&&spdWas>8.5&&!inW){
      e.spd=0;
      P.ride=null;dismountPlace(e);
      P.hurtT=0;damagePlayer(2);
      trickBail();
      showToast('Bailed!');
      playS('hurt');
    }else e.spd*=0.4;
  }
  if(e.y<-40){if(P&&P.ride===e)P.ride=null;removeEnt(e);return;}
  if(ridden&&e.onGround&&!e.grind&&!surf){
    e.rollA=(e.rollA||0)+Math.abs(e.spd)*dt;
    if(e.rollA>2.4){e.rollA=0;playS('roll');}
  }
  /* nudge a parked board by walking into it */
  if(!ridden&&P&&!P.dead&&!P.ride){
    const px=Math.abs(P.x-e.x),pz=Math.abs(P.z-e.z);
    if(px<P.hw+e.hw&&pz<P.hw+e.hw&&P.y<e.y+0.7&&P.y+1.6>e.y){
      const dx=e.x-P.x,dz=e.z-P.z;
      if(Math.hypot(dx,dz)>0.01){
        e.yaw=Math.atan2(-dx,-dz);
        const shove=2.2+Math.hypot(P.vx,P.vz)*0.8;
        if(e.spd<shove){e.spd=shove;playS('roll');}
      }
    }
  }
  /* trick scoring */
  trickTick(e,dt,ridden,surf,justLanded,wasG);
  e.surfV=lerp(e.surfV||0,surf?1:0,1-Math.exp(-dt*10));
  for(const w of e.wheels){w.visible=e.surfV<0.5;if(!e.grind)w.rotation.x-=e.spd*dt*4;}
  e.mesh.scale.set(1+0.1*e.surfV,1-0.25*e.surfV,1+0.3*e.surfV);
  const bob=surf?Math.sin(performance.now()*0.004+e.x)*0.045:0;
  e.mesh.position.set(e.x,e.y+0.06+bob,e.z);
  e.mesh.rotation.y=e.yaw+(e.grind?Math.PI/2:0);
  e.mesh.rotation.z=e.lean+(e.flip>0?((0.45-e.flip)/0.45)*Math.PI*2:0);
}
/* extra sounds */
const _playS3=playS;
playS=function(n){
  if(!soundOn)return;
  try{
    switch(n){
      case 'door': tone(165,120,0.10,'square',0.22);noiseS(0.05,0.16,900,300);return;
      case 'ollie':tone(640,920,0.05,'square',0.22);noiseS(0.04,0.18,2200,800);return;
      case 'grind':noiseS(0.08,0.20,2400,1200);return;
      case 'roll': noiseS(0.13,0.07,520,240);return;
      default:_playS3(n);
    }
  }catch(e){}
};


