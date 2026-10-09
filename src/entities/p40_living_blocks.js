/* PART 40 - LIVING BLOCKS (1 in 500 has feelings) */
MOBT.blockling={hp:6,hw:0.45,h:0.95,spd:4.6,dmg:0,xp:3,body:'#8a8a8a',head:'#8a8a8a',legs:'#333338'};
const ALIVE_CHANCE=0.002;
function blockAliveRoll(x,y,z){return h3(x,y,z,SEED^0xA11FE)<ALIVE_CHANCE;}
function blockComesAlive(x,y,z,id){
  const d2=DEFS[id];
  if(!d2||d2.hard<=0||d2.interact||d2.door||!d2.solid||d2.item)return false;
  if(id===B.BEDROCK||id===B.OBSIDIAN||id===B.TERM)return false;
  if(!blockAliveRoll(x,y,z))return false;
  setBlock(x,y,z,B.AIR);
  spawnMob('blockling',x+0.5,y,z+0.5);
  const e=entities[entities.length-1];
  e.blockId=id;
  const cube=e.mesh.getObjectByName&&e.mesh.getObjectByName('blkcube');
  if(cube&&cube.material&&cube.material.color&&AVGCOL[id]!==undefined&&cube.material.color.setHex)
    cube.material.color.setHex(AVGCOL[id]);
  playS('squeak');
  showToast('The block does NOT want to be mined today.');
  return true;
}
function mkBlocklingMesh(G,mats){
  const bodyMat=new THREE.MeshLambertMaterial({color:0x8a8a8a});
  mats.push(bodyMat);
  const cube=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8),bodyMat);
  cube.name='blkcube';cube.position.y=0.62;G.add(cube);
  const eyeW=new THREE.MeshLambertMaterial({color:0xffffff});
  const eyeB=new THREE.MeshLambertMaterial({color:0x222233});
  const tearM=new THREE.MeshLambertMaterial({color:0x5fa8ff});
  for(const sx of[-1,1]){
    const w=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.24,0.03),eyeW);
    w.position.set(sx*0.18,0.72,-0.42);G.add(w);
    const p2=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.12,0.03),eyeB);
    p2.position.set(sx*0.18,0.68,-0.435);G.add(p2);
    const tr=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.2,0.03),tearM);
    tr.position.set(sx*0.18,0.5,-0.43);G.add(tr);
  }
  const legM=new THREE.MeshLambertMaterial({color:0x333338});
  const legs=[];
  for(const sx of[-1,1])for(const sz of[-1,1]){
    const piv=new THREE.Group();
    const lm=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.24,0.14),legM);
    lm.position.y=-0.12;piv.add(lm);
    piv.position.set(sx*0.24,0.24,sz*0.24);
    G.add(piv);
    legs.push({g:piv,ph:(sx+1)+(sz+1)*0.5,ax:'x',base:0,amp:0.7});
  }
  return {G,legs,mats};
}
function blocklingBrain(e,dt,T){
  e.anim=(e.anim||0)+dt*10;
  const away=Math.atan2(e.x-P.x,e.z-P.z);
  e.vx=Math.sin(away)*T.spd;e.vz=Math.cos(away)*T.spd;
  e.vy-=GRAV*dt;
  const ox=e.x,oz=e.z;
  moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(e.onGround&&Math.abs(e.x-ox)+Math.abs(e.z-oz)<T.spd*dt*0.3)e.vy=7;
  e.cryT=(e.cryT||0)-dt;
  if(e.cryT<=0){
    e.cryT=0.35;
    burstParticles(e.x,e.y+0.55,e.z,B.WATER,3,0.4);
    if(Math.random()<0.3)playS('squeak');
  }
  for(const L of e.legs)L.g.rotation.x=Math.sin(e.anim+L.ph*2.4)*L.amp;
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.y=away;
  if(Math.hypot(e.x-P.x,e.z-P.z)>70)removeEnt(e);
}

