/* PART 42 - SNAKES (they get longer; so can you, briefly) */
MOBT.snake={hp:10,hw:0.32,h:0.5,spd:3.4,dmg:0,xp:4,body:'#3f9a3f',head:'#57c257',legs:'#2a6a2a'};
function mkSnakeMesh(G,mats){
  const headMat=new THREE.MeshLambertMaterial({color:0x57c257});
  mats.push(headMat);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.4,0.5),headMat);
  head.name='snakehead';head.position.y=0.25;G.add(head);
  const eyeM=new THREE.MeshLambertMaterial({color:0x222233});
  for(const sx of[-1,1]){
    const ey=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.03),eyeM);
    ey.position.set(sx*0.12,0.34,-0.26);G.add(ey);
  }
  const tng=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.03,0.2),new THREE.MeshLambertMaterial({color:0xe83a5a}));
  tng.position.set(0,0.2,-0.33);G.add(tng);
  return {G,legs:[],mats};
}
function snakeBrain(e,dt,T){
  if(!e.trail){e.trail=[[e.x,e.y,e.z]];e.segs=[];e.segMeshes=[];e.wT=0;}
  e.wT-=dt;
  /* smell out the nearest apple on the ground */
  let apple=null,ad=12;
  for(const o of entities){
    if(o.dead||o.t!=='drop'||!o.st||o.st.id!==IT.APPLE)continue;
    const dd2=Math.hypot(o.x-e.x,o.z-e.z);
    if(dd2<ad){ad=dd2;apple=o;}
  }
  if(apple){
    e.dir=Math.atan2(apple.x-e.x,apple.z-e.z);
    if(ad<0.9&&e.segMeshes.length<14){
      apple.st.count--;
      if(apple.st.count<=0)removeEnt(apple);
      const segMat=new THREE.MeshLambertMaterial({color:e.segMeshes.length%2?0x3f9a3f:0x2f8a35});
      const seg=new THREE.Mesh(new THREE.BoxGeometry(0.38,0.34,0.42),segMat);
      e.mesh.add(seg);
      e.segMeshes.push(seg);
      e.segs.push(1);
      playS('eat');
      burstParticles(e.x,e.y+0.4,e.z,B.LEAF_O,4,0.4);
    }
  }else if(e.wT<=0){e.wT=2+Math.random()*3;e.dir=Math.random()*6.28;}
  e.vx=Math.sin(e.dir)*T.spd;e.vz=Math.cos(e.dir)*T.spd;
  e.vy-=GRAV*dt;
  const ox=e.x,oz=e.z;
  moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(e.onGround&&Math.abs(e.x-ox)+Math.abs(e.z-oz)<T.spd*dt*0.2){e.dir+=1.7;}
  /* lay down a trail and drape the body along it */
  const lastT=e.trail[e.trail.length-1];
  if(Math.hypot(e.x-lastT[0],e.z-lastT[2])>0.3){
    e.trail.push([e.x,e.y,e.z]);
    if(e.trail.length>e.segMeshes.length*3+10)e.trail.shift();
  }
  const head=e.mesh.getObjectByName&&e.mesh.getObjectByName('snakehead');
  e.mesh.position.set(0,0,0);
  const hx=e.x,hy=e.y,hz=e.z;
  if(head){head.position.set(hx,hy+0.25,hz);}
  for(let i2=0;i2<e.mesh.children.length;i2++){
    const c2=e.mesh.children[i2];
    if(c2===head)continue;
    if(e.segMeshes.includes(c2)){
      const si=e.segMeshes.indexOf(c2);
      const ti=Math.max(0,e.trail.length-1-(si+1)*3);
      const tp=e.trail[ti];
      c2.position.set(tp[0],tp[1]+0.2,tp[2]);
    }else{
      c2.position.x=hx+(c2.position._ox!==undefined?0:0);
    }
  }
  /* eyes/tongue ride with the head */
  for(const c2 of e.mesh.children){
    if(c2!==head&&!e.segMeshes.includes(c2)){
      /* offsets were set relative at build; re-anchor to head */
      if(c2.userData._off===undefined)c2.userData._off={x:c2.position.x,y:c2.position.y,z:c2.position.z};
      c2.position.set(hx+c2.userData._off.x,hy+c2.userData._off.y,hz+c2.userData._off.z);
    }
  }
  e.mesh.rotation.y=0;
  if(head)head.rotation.y=e.dir;
  if(Math.hypot(e.x-P.x,e.z-P.z)>70)removeEnt(e);
}
function tickBig(dt){
  if(!P||!(P.bigT>0))return;
  P.bigT-=dt;
  if(P.bigT<=0){P.bigT=0;showToast('You shrink back to regulation size.');}
}

