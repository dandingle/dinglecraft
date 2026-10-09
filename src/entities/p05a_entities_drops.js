/* ===================================================================== */
/* PART 5 — entities: drops, falling blocks, arrows, TNT, particles, mobs */
/* ===================================================================== */
const entities=[];
function removeEnt(e){
  if(e.pdisp)mpDispose(e);
  e.dead=true;
  if(e.mesh){scene.remove(e.mesh);}
  if(e.hrM){hrFree(e.hrM);e.hrM=null;}
}
function pruneEnts(){
  for(let i=entities.length-1;i>=0;i--)if(entities[i].dead)entities.splice(i,1);
}

/* cube geometry for a block id (atlas uvs, used by falling blocks/TNT/held) */
const CUBEGEO={};
function mkCubeGeo(id,sc){
  const key=id+'_'+sc;
  if(CUBEGEO[key])return CUBEGEO[key];
  const t=DEFS[id]._t;
  const pos=[],uv=[],col=[],idx=[],nrm=[];
  for(const f of FACES){
    const ti=f.n[1]>0?t.top:(f.n[1]<0?t.bot:t.side);
    const U=tileUV(ti);
    const base=pos.length/3;
    for(let v=0;v<4;v++){
      const vert=f.verts[v];
      pos.push((vert[0]-0.5)*sc,(vert[1]-0.5)*sc,(vert[2]-0.5)*sc);
      nrm.push(f.n[0],f.n[1],f.n[2]);
      uv.push(v===0||v===3?U[0]:U[2], v<2?U[1]:U[3]);
      col.push(f.sh,f.sh,f.sh);
    }
    idx.push(base,base+1,base+2,base,base+2,base+3);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx);
  CUBEGEO[key]=g;
  return g;
}

/* ----- item drops ----- */
const ICONTEX={};
function iconTex(id){
  if(ICONTEX[id])return ICONTEX[id];
  const tx=new THREE.CanvasTexture(getIcon(id));
  tx.magFilter=THREE.NearestFilter;tx.minFilter=THREE.NearestFilter;
  const m=new THREE.SpriteMaterial({map:tx,transparent:true});
  ICONTEX[id]=m;return m;
}
function spawnDrop(x,y,z,st,vx,vy,vz){
  if(!st||st.count<=0)return;
  const tp3=toolIdParts(st.id);
  const wp3=(!tp3&&(gunIdParts(st.id)||st.id===IT.BOW||st.id===IT.SKATE||st.id===IT.SUBBTN||(DEFS[st.id]&&DEFS[st.id].gadget)))?1:0;
  let sp;
  if(tp3){sp=mkTool3D(st.id,0.42,true);}
  else if(wp3&&st.id===IT.SUBBTN){sp=mkSubBtnMesh();sp.isT3D=true;sp.scale.set(0.6,0.6,0.6);}
  else if(wp3){sp=mkWpn3D(st.id,0.5);}
  else if(TP.hr&&HRW.on&&tpCubeDrop(st.id)){sp=new THREE.Mesh(mkCubeGeo(st.id,0.25),DEFS[st.id].bucket==='cut'?matCut:matOp);sp._hrCube=1;}
  else{sp=new THREE.Sprite(iconTex(st.id));sp.scale.set(0.42,0.42,0.42);}
  scene.add(sp);
  entities.push({t:'drop',x,y,z,vx:vx||0,vy:vy||0,vz:vz||0,hw:0.12,h:0.24,
    onGround:false,st:{id:st.id,count:st.count,dur:st.dur,...(st.mob?{mob:st.mob}:{}),...(st.ench?{ench:st.ench}:{})},age:0,mesh:sp,m3d:(tp3||wp3||sp._hrCube)?1:0,bob:Math.random()*6});
}
function updateDrop(e,dt){
  e.age+=dt;
  if(e.age>300&&!crKeepDrop(e)){removeEnt(e);return;}
  if(crKeepDrop(e)&&!chunkAt(Math.floor(e.x),Math.floor(e.z)))return;
  e.vy-=GRAV*0.7*dt;
  if(getBlock(Math.floor(e.x),Math.floor(e.y),Math.floor(e.z))===B.WATER){e.vy=lerp(e.vy,1.2,0.1);}
  const fr=e.onGround?Math.exp(-dt*9):Math.exp(-dt*0.6);
  e.vx*=fr;e.vz*=fr;
  moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  /* magnet + pickup */
  if(!P.dead&&e.age>0.55){
    const dx=P.x-e.x,dy=(P.y+0.6)-e.y,dz=P.z-e.z;
    const ds=Math.hypot(dx,dy,dz);
    if(ds<(GDG.mag?7.5:2.0)){
      const pull=10*dt/Math.max(ds,0.25);
      e.x+=dx*pull;e.y+=dy*pull;e.z+=dz*pull;
    }
    if(ds<0.75){
      const before=e.st.count,left=invAddTo(P.inv,e.st);   /* invAddTo shrinks e.st as it goes: compare with the count from before */
      if(left<before){playS('pop');redrawHotbar();}
      if(e.st.count<=0){removeEnt(e);return;}
    }
  }
  if(AG_ACTIVE&&agTryPickup(e))return;
  /* merge with nearby same drops occasionally */
  if(((frameCount+(e.bob*10|0))%30)===0&&e.st.count<stackMax(e.st.id)&&e.st.dur==null){
    for(const o of entities){
      if(o!==e&&!o.dead&&o.t==='drop'&&o.st.id===e.st.id&&o.st.dur==null&&
         Math.abs(o.x-e.x)<1&&Math.abs(o.y-e.y)<1&&Math.abs(o.z-e.z)<1){
        const mv=Math.min(stackMax(e.st.id)-e.st.count,o.st.count);
        e.st.count+=mv;o.st.count-=mv;
        if(o.st.count<=0)removeEnt(o);
      }
    }
  }
  e.mesh.position.set(e.x,e.y+0.22+Math.sin(e.age*2.5+e.bob)*0.045,e.z);
  if(e.m3d)e.mesh.rotation.y=e.age*1.5;
}

