/* ----- spawner ----- */
let spawnT=0;
function countMobs(){
  let h=0,p=0;
  for(const e of entities)if(e.t==='mob'&&!e.dead&&!e.bot&&!MOBT[e.mt].pnc){if(e.hostile)h++;else p++;}
  return [h,p];
}
function torchNear(x,y,z){
  for(const k of torches){
    const p=dimP(k);
    if(!p)continue;
    const dx=p[0]-x,dy=p[1]-y,dz=p[2]-z;
    if(dx*dx+dy*dy+dz*dz<64)return true;
  }
  return false;
}
function mobsTick(dt){
  spawnT-=dt;
  if(spawnT>0)return;
  spawnT=1.4;
  const [h,p]=countMobs();
  /* despawn far */
  for(const e of entities)if(e.t==='mob'&&!e.dead&&!e.bot&&!MOBT[e.mt].boss&&!MOBT[e.mt].pnc&&!e.pkeep&&mobFarFromAll(e))removeEnt(e);
  if(!GR.mobSpawn)return;
  const _an=mobAnchor();
  const ang=Math.random()*6.28,dist=14+Math.random()*22;
  const x=Math.floor(_an.x+Math.sin(ang)*dist),z=Math.floor(_an.z+Math.cos(ang)*dist);
  if(!chunkAt(x,z))return;
  if(DIM==='nether'){
    if(h<10){
      const nc2=nCol(x,z);
      if(nc2.f>=12&&getBlock(x,nc2.f+1,z)===B.AIR&&getBlock(x,nc2.f+2,z)===B.AIR)
        spawnMob(Math.random()<0.55?'imp':'hellhog',x+0.5,nc2.f+1,z+0.5);
    }
    return;
  }
  if(DIM==='puppet'){mpAmbient(x,z,h,p);return;}
  if(DIM==='aether'){
    if(h<8){
      const ac2=aCol(x,z);
      if(ac2&&getBlock(x,ac2.t+1,z)===B.AIR)spawnMob('cherub',x+0.5,ac2.t+1.1,z+0.5);
    }
    return;
  }
  if(h<14&&(P.mode!=='c'||_an!==P)){
    let y=-1;
    if(!sunUp()){
      const sy=surfaceTop(x,z);
      if(sy>SEA-1&&!torchNear(x,sy+1,z))y=sy+1;
    }else{
      const ty=4+Math.floor(Math.random()*(SEA+18));
      if(getBlock(x,ty,z)===B.AIR&&getBlock(x,ty+1,z)===B.AIR&&solidAt(x,ty-1,z)
         &&!skyOpen(x,ty,z)&&!torchNear(x,ty,z))y=ty;
    }
    if(y>0&&mobClearOfPlayers(x,z)&&!(MGP_ON&&mgNoSpawn(x,z))){
      const r=Math.random();
      spawnMob(r<0.35?'zombie':r<0.62?'skel':r<0.82?'boomer':'spider',x+0.5,y,z+0.5);
    }
  }
  if(p<8&&sunUp()){
    const sy=surfaceTop(x,z);
    const g=getBlock(x,sy,z);
    if((g===B.GRASS||g===B.SNOWGRASS)&&Math.random()<0.5){
      const r=Math.random();
      spawnMob(r<0.08?'snake':(r<0.36?'pig':r<0.68?'cow':'sheep'),x+0.5,sy+1,z+0.5);
    }
  }
}
const AETHER_VOID_DESPAWN={mob:1,car:1,skate:1,cart:1,boat:1,plane:1,drop:1};
function updateEntities(dt){
  if(TP.hr)hrEntFrame(dt);
  for(const e of entities){
    if(e.dead)continue;
    /* the aether has no floor: things that tumble into the void are lost to it,
       not left standing on the invisible bottom of the world */
    if(DIM==='aether'&&e.y<2&&AETHER_VOID_DESPAWN[e.t]&&!e.bot&&!(P&&P.ride===e)){
      burstParticles(e.x,e.y+0.4,e.z,B.CLOUDSTONE,e.t==='drop'?4:8,0.5);
      if(P&&P.ride===e)P.ride=null;
      removeEnt(e);
      continue;
    }
    if(e.t==='drop')updateDrop(e,dt);
    else if(e.t==='fall')updateFall(e,dt);
    else if(e.t==='arrow')updateArrow(e,dt);
    else if(e.t==='tnt')updateTNT(e,dt);
    else if(e.t==='part')updatePart(e,dt);
    else if(e.t==='blt')updateBullet(e,dt);
    else if(e.t==='nade')updateNade(e,dt);
    else if(e.t==='subb')updateSubBtn(e,dt);
    else if(e.t==='bobber')updateBobber(e,dt);
    else if(e.t==='esnail')updateSnail(e,dt);
    else if(e.t==='ghost')updateGhost(e,dt);
    else if(e.t==='ball')updateBall(e,dt);
    else if(e.t==='car')updateCar(e,dt);
    else if(e.t==='skate')updateSkate(e,dt);
    else if(e.t==='twister')updateTwister(e,dt);
    else if(e.t==='debris')updateDebris(e,dt);
    else if(e.t==='lavab')updateLavaBomb(e,dt);
    else if(e.t==='fireb')updateFireBomb(e,dt);
    else if(e.t==='cart')updateCart(e,dt);
    else if(e.t==='xp')updateXP(e,dt);
    else if(e.t==='boat')updateBoat(e,dt);
    else if(e.t==='puff')updatePuff(e,dt);
    else if(e.t==='beam')updateBeam(e,dt);
    else if(e.t==='rock')updateRock(e,dt);
    else if(e.t==='nukefx')updateNukefx(e,dt);
    else if(e.t==='plane')updatePlane(e,dt);
    else if(e.t==='abomb')updateBomb(e,dt);
    else if(e.t==='mcloud')updateMcloud(e,dt);
    else if(e.t==='pproj')puUpdate(e,dt);
    else if(e.t==='mob'){if(e.bot)agBodyTick(e,dt);else updateMob(e,dt);}
  }
  if(HRE.corpses.length)hrTickCorpses(dt);
  pruneEnts();
}

