/* ----- particles ----- */
const PARTMAT={};
function partMat(id){
  if(PARTMAT[id])return PARTMAT[id];
  const c=AVGCOL[id]||[150,150,150];
  const m=new THREE.SpriteMaterial({color:new THREE.Color(c[0]/255,c[1]/255,c[2]/255)});
  PARTMAT[id]=m;return m;
}
function burstParticles(x,y,z,id,n,pw){
  pw=pw||0.6;
  for(let i=0;i<n;i++){
    if(entities.length>900)break;
    const sp=new THREE.Sprite(partMat(id));
    const s=0.09+Math.random()*0.07;
    sp.scale.set(s,s,s);
    scene.add(sp);
    entities.push({t:'part',x,y,z,
      vx:(Math.random()-0.5)*4*pw,vy:Math.random()*4*pw+1,vz:(Math.random()-0.5)*4*pw,
      life:0.35+Math.random()*0.4,mesh:sp});
  }
}
function updatePart(e,dt){
  e.life-=dt;
  if(e.life<=0){removeEnt(e);return;}
  e.vy-=18*dt;
  e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;
  if(solidAt(Math.floor(e.x),Math.floor(e.y),Math.floor(e.z))){e.vy=0;e.vx*=0.7;e.vz*=0.7;e.y=Math.floor(e.y)+1.001;}
  e.mesh.position.set(e.x,e.y,e.z);
}

