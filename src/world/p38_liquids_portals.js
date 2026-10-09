/* PART 38 - liquid chemistry + portals */
IT.BUCKET=228;IT.BUCKET_W=229;IT.BUCKET_L=246;
idef(IT.BUCKET,{name:'Bucket',icon:'i_bucket',stack:1});
idef(IT.BUCKET_W,{name:'Water Bucket',icon:'i_bucketw',stack:1});
idef(IT.BUCKET_L,{name:'Lava Bucket',icon:'i_bucketl',stack:1});
R(['I I',' I '],{I:IT.IRON},IT.BUCKET,1);
tile('i_bucket',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#b8bcc4';c.fillRect(4,6,8,7);c.fillRect(3,6,1,5);c.fillRect(12,6,1,5);
  c.fillStyle='#8a8f96';c.fillRect(4,12,8,1);
  c.fillStyle='#d8dce4';c.fillRect(4,4,1,2);c.fillRect(11,4,1,2);c.fillRect(5,3,6,1);});
tile('i_bucketw',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#b8bcc4';c.fillRect(4,6,8,7);c.fillRect(3,6,1,5);c.fillRect(12,6,1,5);
  c.fillStyle='#3d6de8';c.fillRect(5,6,6,2);c.fillStyle='#6a9af4';c.fillRect(6,6,2,1);
  c.fillStyle='#d8dce4';c.fillRect(4,4,1,2);c.fillRect(11,4,1,2);c.fillRect(5,3,6,1);});
tile('i_bucketl',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#b8bcc4';c.fillRect(4,6,8,7);c.fillRect(3,6,1,5);c.fillRect(12,6,1,5);
  c.fillStyle='#e85d1a';c.fillRect(5,6,6,2);c.fillStyle='#ffb03d';c.fillRect(7,6,2,1);
  c.fillStyle='#d8dce4';c.fillRect(4,4,1,2);c.fillRect(11,4,1,2);c.fillRect(5,3,6,1);});
function lavaWaterCheck(x,y,z){
  const NB=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  const here=getBlock(x,y,z);
  if(here===B.LAVA){
    for(const nb of NB)if(getBlock(x+nb[0],y+nb[1],z+nb[2])===B.WATER){
      setBlock(x,y,z,B.OBSIDIAN);
      burstParticles(x+0.5,y+0.7,z+0.5,B.OBSIDIAN,8,0.7);
      playS('dig');
      return;
    }
  }else if(here===B.WATER){
    for(const nb of NB){
      const nx2=x+nb[0],ny2=y+nb[1],nz2=z+nb[2];
      if(getBlock(nx2,ny2,nz2)===B.LAVA){
        setBlock(nx2,ny2,nz2,B.OBSIDIAN);
        burstParticles(nx2+0.5,ny2+0.7,nz2+0.5,B.OBSIDIAN,8,0.7);
        playS('dig');
      }
    }
  }
}
/* portals: frames are 4 wide x 5 tall with a 2x3 interior */
function frameOK(ox,oy,oz,ax,frameId){
  const dx=ax==='x'?1:0,dz=ax==='x'?0:1;
  for(let i=0;i<2;i++){
    if(getBlock(ox+dx*i,oy-1,oz+dz*i)!==frameId)return false;
    if(getBlock(ox+dx*i,oy+3,oz+dz*i)!==frameId)return false;
  }
  for(let j=0;j<3;j++){
    if(getBlock(ox-dx,oy+j,oz-dz)!==frameId)return false;
    if(getBlock(ox+dx*2,oy+j,oz+dz*2)!==frameId)return false;
  }
  for(let i=0;i<2;i++)for(let j=0;j<3;j++){
    const c2=getBlock(ox+dx*i,oy+j,oz+dz*i);
    if(c2!==B.AIR&&!DEFS[c2].replace)return false;
  }
  return true;
}
function tryIgnitePortal(x,y,z,frameId,portalId){
  if(MGP_ON&&mgNoPortal(x,y,z))return false;
  for(const ax of ['x','z']){
    const dx=ax==='x'?1:0,dz=ax==='x'?0:1;
    for(let oi=-2;oi<=2;oi++)for(let oj=-3;oj<=1;oj++){
      const ox=x+dx*oi,oy=y+oj,oz=z+dz*oi;
      if(!frameOK(ox,oy,oz,ax,frameId))continue;
      for(let i=0;i<2;i++)for(let j=0;j<3;j++)
        setBlock(ox+dx*i,oy+j,oz+dz*i,portalId);
      return true;
    }
  }
  return false;
}
function forceChunksNear(x,z){
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    const cx=Math.floor(x/CH)+dx,cz=Math.floor(z/CH)+dz;
    if(!chunks.get(ckey(cx,cz)))createChunk(cx,cz);
  }
}
function ensurePortalAt(frameId,portalId){
  forceChunksNear(P.x,P.z);
  const px2=Math.floor(P.x),py2=Math.floor(P.y),pz2=Math.floor(P.z);
  for(let dx=-9;dx<=9;dx++)for(let dy=-6;dy<=6;dy++)for(let dz=-9;dz<=9;dz++)
    if(getBlock(px2+dx,py2+dy,pz2+dz)===portalId)return;
  const bx=px2+2,by=py2,bz=pz2;
  for(let i=-1;i<=2;i++){
    setBlock(bx+i,by-1,bz,frameId);
    setBlock(bx+i,by+3,bz,frameId);
    if(getBlock(bx+i,by-2,bz)===B.AIR||getBlock(bx+i,by-2,bz)===B.LAVA)setBlock(bx+i,by-2,bz,frameId);
  }
  for(let j=0;j<3;j++){setBlock(bx-1,by+j,bz,frameId);setBlock(bx+2,by+j,bz,frameId);}
  for(let i=0;i<2;i++)for(let j=0;j<3;j++)setBlock(bx+i,by+j,bz,portalId);
}
function travelNether(){
  if(DIM==='nether'){
    const gx=Math.floor(P.x),gz=Math.floor(P.z);
    setDim('over',P.x,10,P.z);
    forceChunksNear(P.x,P.z);
    P.y=colInfo(gx,gz).h+1.2;
    ensurePortalAt(B.OBSIDIAN,B.PORTAL_N);
  }else{
    setDim('nether',P.x,20,P.z);
    forceChunksNear(P.x,P.z);
    const nc=nCol(Math.floor(P.x),Math.floor(P.z));
    const base=Math.max(nc.f,12);
    for(let dx=-2;dx<=3;dx++)for(let dz=-2;dz<=2;dz++){
      setBlock(Math.floor(P.x)+dx,base,Math.floor(P.z)+dz,B.NETHROCK);
      for(let dy=1;dy<=4;dy++)setBlock(Math.floor(P.x)+dx,base+dy,Math.floor(P.z)+dz,B.AIR);
    }
    P.y=base+1.2;
    ensurePortalAt(B.OBSIDIAN,B.PORTAL_N);
  }
  showToast(DIM==='nether'?'Welcome to the Nether. Mind the everything.':'Back to the overworld. The air tastes less like pennies.');
}
function travelAether(){
  if(DIM==='aether'){
    const gx=Math.floor(P.x),gz=Math.floor(P.z);
    setDim('over',P.x,10,P.z);
    forceChunksNear(P.x,P.z);
    P.y=colInfo(gx,gz).h+1.2;
    ensurePortalAt(B.GLOWSTONE,B.PORTAL_A);
  }else{
    setDim('aether',P.x,50,P.z);
    let isl=null;
    for(let dx=-32;dx<=32&&!isl;dx+=2)for(let dz=-32;dz<=32&&!isl;dz+=2){
      const a=aCol(Math.floor(P.x)+dx,Math.floor(P.z)+dz);
      if(a)isl=[Math.floor(P.x)+dx,Math.floor(P.z)+dz,a];
    }
    if(isl){P.x=isl[0]+0.5;P.z=isl[1]+0.5;P.y=isl[2].t+1.2;forceChunksNear(P.x,P.z);}
    else{
      forceChunksNear(P.x,P.z);
      const bx=Math.floor(P.x),bz=Math.floor(P.z);
      for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)setBlock(bx+dx,47,bz+dz,B.CLOUDSTONE);
      P.y=48.2;
    }
    ensurePortalAt(B.GLOWSTONE,B.PORTAL_A);
  }
  showToast(DIM==='aether'?'The Aether. Do not look down. (Look down once.)':'Back to solid, boring, wonderful ground.');
}
function tickPortal(dt){
  if(!playing||!P||P.dead)return;
  if(P.portalT<0){P.portalT=Math.min(0,P.portalT+dt);return;}
  const fb=getBlock(Math.floor(P.x),Math.floor(P.y+0.2),Math.floor(P.z));
  if(fb===B.PORTAL_N||fb===B.PORTAL_A){
    P.portalT+=dt;
    if(P.portalT>1.1){
      P.portalT=-2;
      if(fb===B.PORTAL_N)travelNether();else travelAether();
    }
  }else if(P.portalT>0)P.portalT=0;
}

