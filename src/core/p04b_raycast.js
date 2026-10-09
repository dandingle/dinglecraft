/* ----- DDA voxel raycast (Amanatides & Woo) ----- */
function raycastB(ox,oy,oz,dx,dy,dz,max){
  let x=Math.floor(ox),y=Math.floor(oy),z=Math.floor(oz);
  const sx=dx>0?1:-1,sy=dy>0?1:-1,sz=dz>0?1:-1;
  const tdx=Math.abs(1/dx),tdy=Math.abs(1/dy),tdz=Math.abs(1/dz);
  let tmx=dx===0?Infinity:(sx>0?x+1-ox:ox-x)*tdx;
  let tmy=dy===0?Infinity:(sy>0?y+1-oy:oy-y)*tdy;
  let tmz=dz===0?Infinity:(sz>0?z+1-oz:oz-z)*tdz;
  let nx=0,ny=0,nz=0,t=0;
  for(let i=0;i<256;i++){
    const id=getBlock(x,y,z);
    if(id!==B.AIR&&id!==B.WATER)return{x,y,z,nx,ny,nz,id,t};
    if(tmx<tmy&&tmx<tmz){x+=sx;t=tmx;tmx+=tdx;nx=-sx;ny=0;nz=0;}
    else if(tmy<tmz){y+=sy;t=tmy;tmy+=tdy;nx=0;ny=-sy;nz=0;}
    else{z+=sz;t=tmz;tmz+=tdz;nx=0;ny=0;nz=-sz;}
    if(t>max)return null;
  }
  return null;
}
/* segment vs entity AABBs -> nearest mob */
function pickMob(ox,oy,oz,dx,dy,dz,max){
  let best=null,bt=max;
  for(const e of entities){
    if(!e.mob||e.dead)continue;
    const x0=e.x-e.hw,x1=e.x+e.hw,y0=e.y,y1=e.y+e.h,z0=e.z-e.hw,z1=e.z+e.hw;
    let t0=0,t1=bt,ok=true;
    const p=[ox,oy,oz],d=[dx,dy,dz],mn=[x0,y0,z0],mx=[x1,y1,z1];
    for(let a=0;a<3;a++){
      if(Math.abs(d[a])<1e-9){if(p[a]<mn[a]||p[a]>mx[a]){ok=false;break;}continue;}
      let ta=(mn[a]-p[a])/d[a],tb=(mx[a]-p[a])/d[a];
      if(ta>tb){const tmp=ta;ta=tb;tb=tmp;}
      if(ta>t0)t0=ta;
      if(tb<t1)t1=tb;
      if(t0>t1){ok=false;break;}
    }
    if(ok&&t0<bt){bt=t0;best=e;}
  }
  return best?{e:best,t:bt}:null;
}

