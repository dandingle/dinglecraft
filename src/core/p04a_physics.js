/* ===================================================================== */
/* PART 4 — physics, raycast, player                                     */
/* ===================================================================== */
const KEY={};                      /* e.code -> held (bound in part 6) */
const MB={l:false,r:false};        /* mouse buttons */
let hurtFlash=0;
const MINE={x:0,y:0,z:0,prog:0,need:0,active:false};

function solidAt(x,y,z){return DEFS[getBlock(x,y,z)].solid!==false;}
function boxCollides(px,py,pz,hw,h){
  const x0=Math.floor(px-hw),x1=Math.floor(px+hw);
  const y0=Math.floor(py),y1=Math.floor(py+h-1e-4);
  const z0=Math.floor(pz-hw),z1=Math.floor(pz+hw);
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)
    if(solidAt(x,y,z))return true;
  return false;
}
function boxTouches(px,py,pz,hw,h,flag){ /* any overlapped block has DEFS flag */
  const g=0.06;
  const x0=Math.floor(px-hw-g),x1=Math.floor(px+hw+g);
  const y0=Math.floor(py-g),y1=Math.floor(py+h+g-1e-4);
  const z0=Math.floor(pz-hw-g),z1=Math.floor(pz+hw+g);
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)
    if(DEFS[getBlock(x,y,z)][flag])return true;
  return false;
}
function sweep(e,axis,d){
  if(d===0)return false;
  const p=[e.x,e.y,e.z];
  const steps=Math.max(1,Math.ceil(Math.abs(d)/0.4)),st=d/steps;
  let hit=false;
  for(let i=0;i<steps;i++){
    p[axis]+=st;
    if(boxCollides(p[0],p[1],p[2],e.hw,e.h)){
      if(axis===0)p[0]=st>0?Math.floor(p[0]+e.hw)-e.hw-1e-4:Math.floor(p[0]-e.hw)+1+e.hw+1e-4;
      else if(axis===1)p[1]=st>0?Math.floor(p[1]+e.h)-e.h-1e-4:Math.floor(p[1])+1+1e-4;
      else p[2]=st>0?Math.floor(p[2]+e.hw)-e.hw-1e-4:Math.floor(p[2]-e.hw)+1+e.hw+1e-4;
      hit=true;break;
    }
  }
  e.x=p[0];e.y=p[1];e.z=p[2];
  return hit;
}
function supported(e){return boxCollides(e.x,e.y-0.06,e.z,e.hw,0.05);}
function moveBody(e,dx,dy,dz,sneak){
  const og=e.onGround;
  const cy=sweep(e,1,dy);
  e.onGround=dy<=0&&cy;
  if(cy)e.vy=0;
  let wall=false;
  for(const ad of [[0,dx],[2,dz]]){
    const px=e.x,pz=e.z;
    const c=sweep(e,ad[0],ad[1]);
    if(c){wall=true;if(ad[0]===0)e.vx=0;else e.vz=0;}
    if(sneak&&og&&!supported(e)){
      e.x=px;e.z=pz;
      if(ad[0]===0)e.vx=0;else e.vz=0;
    }
  }
  return wall;
}

