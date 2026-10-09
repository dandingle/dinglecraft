/* PART 51 - THE PROP PLANE (Dingle Airlines: one seat, no refunds) */
function mkPlaneMesh(){
  const G=new THREE.Group(),mats=[];
  const M=(c,o)=>{const m=new THREE.MeshLambertMaterial(Object.assign({color:c},o||{}));mats.push(m);return m;};
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.85,0.85,3.3),M(0xe8e2d0));
  body.position.y=0.95;G.add(body);
  const nose=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.72,0.5),M(0xb8322a));
  nose.position.set(0,0.95,-1.85);G.add(nose);
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.4,0.85),M(0x9fd4ff,{transparent:true,opacity:0.75}));
  canopy.position.set(0,1.5,-0.3);G.add(canopy);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(4.8,0.12,0.95),M(0xb8322a));
  wing.position.set(0,1.3,-0.45);G.add(wing);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.1,0.5),M(0xb8322a));
  tail.position.set(0,1.15,1.5);G.add(tail);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.75,0.55),M(0xe8e2d0));
  fin.position.set(0,1.5,1.52);G.add(fin);
  const prop=new THREE.Group();
  prop.add(new THREE.Mesh(new THREE.BoxGeometry(0.12,1.5,0.08),M(0x2c2c30)));
  prop.add(new THREE.Mesh(new THREE.BoxGeometry(1.5,0.12,0.08),M(0x2c2c30)));
  prop.position.set(0,0.95,-2.14);
  G.add(prop);
  const wg=new THREE.BoxGeometry(0.16,0.4,0.4);
  const wm=M(0x1a1a1e);
  for(const sx of[-1,1]){const w=new THREE.Mesh(wg,wm);w.position.set(sx*0.55,0.2,-0.7);G.add(w);}
  const tw=new THREE.Mesh(wg,wm);tw.position.set(0,0.2,1.6);G.add(tw);
  return {G,prop,mats};
}
function spawnPlane(x,y,z,yaw){
  const {G,prop,mats}=mkPlaneMesh();
  scene.add(G);
  entities.push({t:'plane',x,y,z,vx:0,vy:0,vz:0,hw:0.95,h:1.6,hp:40,spd:0,
    yaw:yaw||0,onGround:false,hurtT:0,mesh:G,prop,mats,seatY:0.8,eyeH:1.15});
}
function updatePlane(e,dt){
  if(!chunkAt(Math.floor(e.x),Math.floor(e.z)))return;
  e.hurtT=Math.max(0,e.hurtT-dt);
  if(e.hurtT<0.15)for(const m of e.mats)m.emissive&&m.emissive.setRGB(0,0,0);
  const ridden=P&&P.ride===e&&!P.dead;
  let f=0,s=0;
  if(ridden&&!modalOpen()&&!paused){
    f=clamp((KEY.KeyW?1:0)-(KEY.KeyS?1:0)+TOUCH.f,-1,1);
    s=clamp((KEY.KeyD?1:0)-(KEY.KeyA?1:0)+TOUCH.s,-1,1);
  }
  const target=f>0?f*26:(e.onGround?f*4:0);
  e.spd=lerp(e.spd,ridden?target:(e.onGround?0:Math.max(0,e.spd-dt*3)),1-Math.exp(-dt*(f>0?1.1:0.75)));
  if(Math.abs(e.spd)>0.5)e.yaw-=s*dt*(e.onGround?1.7:1.05);
  const lift=clamp((e.spd-8)/9,0,1);
  const fx=-Math.sin(e.yaw),fz=-Math.cos(e.yaw);
  const gl=1-Math.exp(-dt*3.2);
  e.vx=lerp(e.vx,fx*e.spd,gl);
  e.vz=lerp(e.vz,fz*e.spd,gl);
  let tv=0;
  if(ridden&&lift>0){const l=lookDir();tv=l[1]*e.spd*0.95*lift;}
  e.vy=lerp(e.vy,tv,1-Math.exp(-dt*2.6))-GRAV*dt*(1-lift);
  if(e.vy<-38)e.vy=-38;
  const spdWas=Math.abs(e.spd);
  const wall=moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(wall){
    if(spdWas>11){
      e.hp-=Math.round(spdWas*0.5);e.hurtT=0.4;playS('thud');
      for(const m of e.mats)m.emissive&&m.emissive.setRGB(0.4,0.1,0);
      if(e.hp<=0){killCar(e);return;}
    }
    e.spd*=0.3;
  }
  if(e.y<-40){if(P&&P.ride===e)P.ride=null;removeEnt(e);return;}
  e.prop.rotation.z+=dt*(3+Math.abs(e.spd)*1.6);
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.y=e.yaw;
  const vp=Math.asin(clamp(e.vy/Math.max(9,Math.abs(e.spd)+3),-0.85,0.85));
  e.mesh.rotation.x=lerp(e.mesh.rotation.x||0,vp*0.8,1-Math.exp(-dt*4));
  e.mesh.rotation.z=lerp(e.mesh.rotation.z||0,s*-0.4,1-Math.exp(-dt*3));
}
IT.PLANE=283;
idef(IT.PLANE,{name:'Prop Plane',icon:'i_plane',stack:1,plane:1});
tile('i_plane',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#e8e2d0';c.fillRect(2,7,11,3);
  c.fillStyle='#b8322a';c.fillRect(1,7,2,3);c.fillRect(5,4,3,8);c.fillRect(11,5,2,3);
  c.fillStyle='#9fd4ff';c.fillRect(9,6,2,2);
  c.fillStyle='#2c2c30';c.fillRect(0,5,1,7);
  c.fillStyle='#1a1a1e';c.fillRect(4,10,2,2);c.fillRect(10,10,2,2);});
RS([IT.IRON,IT.IRON,IT.IRON,IT.IRON,IT.IRON,B.GLASS],IT.PLANE,1);

