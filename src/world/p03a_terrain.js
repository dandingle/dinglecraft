/* ===================================================================== */
/* PART 3: WORLD GENERATION, CHUNK STORE, MESHER                         */
/* ===================================================================== */
let SEED=1337;
const BIOME={OCEAN:0,BEACH:1,PLAINS:2,FOREST:3,BIRCH:4,DESERT:5,SNOWY:6,MOUNTAIN:7};
const BIOME_NAME=['Ocean','Beach','Plains','Forest','Birch Forest','Desert','Snowy Tundra','Mountains'];

const COLM=new Map();
function terrainInfo(x,z){
  const cont=fbm2(x*.004,z*.004,SEED,4);
  const ero =fbm2(x*.008,z*.008,SEED+777,3);
  const tmp =fbm2(x*.0025,z*.0025,SEED+1555,3);
  const moi =fbm2(x*.003,z*.003,SEED+2333,3);
  let h=SEA-14+(cont-.42)*58;
  const mtn=Math.max(0,cont-.62)*(1-ero);
  h+=mtn*95;
  h+=(fbm2(x*.02,z*.02,SEED+91,3)-.5)*9;
  h=clamp(Math.round(h),3,WH-6);
  let b;
  if(h<SEA-1)b=BIOME.OCEAN;
  else if(h<=SEA+1)b=BIOME.BEACH;
  else if(mtn>.16&&h>SEA+18)b=BIOME.MOUNTAIN;
  else if(tmp>.62&&moi<.45)b=BIOME.DESERT;
  else if(tmp<.34)b=BIOME.SNOWY;
  else if(moi>.6)b=BIOME.FOREST;
  else if(moi>.5&&tmp>.5)b=BIOME.BIRCH;
  else b=BIOME.PLAINS;
  return {h,b};
}
function colInfo(x,z){
  const k=x+','+z;let v=COLM.get(k);
  if(v)return v;
  v=terrainInfo(x,z);
  if(COLM.size>60000)COLM.clear();
  COLM.set(k,v);return v;
}
function stoneOrOre(x,y,z){
  const cx=x>>1,cy=y>>1,cz=z>>1;
  if(y<14&&h3(cx,cy,cz,SEED+9101)<.0016)return B.DIA_ORE;
  if(y<26&&h3(cx,cy,cz,SEED+9202)<.0026)return B.GOLD_ORE;
  if(y<44&&h3(cx,cy,cz,SEED+9303)<.006)return B.IRON_ORE;
  if(y<56&&h3(cx,cy,cz,SEED+9404)<.0085)return B.COAL_ORE;
  return B.STONE;
}
function topBlock(b,h,x,z){
  switch(b){
    case BIOME.OCEAN:
      if(vnoise2(x*.06,z*.06,SEED+808)>.74)return B.CLAY;
      return h>SEA-5?B.SAND:(h2(x,z,SEED+33)<.5?B.GRAVEL:B.SAND);
    case BIOME.BEACH:case BIOME.DESERT:return B.SAND;
    case BIOME.SNOWY:return B.SNOWGRASS;
    case BIOME.MOUNTAIN:return h>=60?B.SNOWGRASS:B.STONE;
    default:return B.GRASS;
  }
}
function fillerBlock(b){
  switch(b){
    case BIOME.OCEAN:case BIOME.BEACH:case BIOME.DESERT:return B.SAND;
    case BIOME.MOUNTAIN:return B.STONE;
    default:return B.DIRT;
  }
}
function treeAt(x,z){
  const ci=colInfo(x,z);
  if(ci.h<=SEA+1)return null;
  const b=ci.b;let dens=0,type=0;
  if(b===BIOME.FOREST){dens=.05;type=h2(x,z,SEED+901)<.12?1:0;}
  else if(b===BIOME.BIRCH){dens=.045;type=1;}
  else if(b===BIOME.PLAINS){dens=.005;type=0;}
  else if(b===BIOME.SNOWY){dens=.024;type=2;}
  else if(b===BIOME.MOUNTAIN&&ci.h<55){dens=.01;type=2;}
  else return null;
  if(h2(x,z,SEED+4242)>=dens)return null;
  const th=4+((h2(x,z,SEED+555)*3)|0);
  return {h:ci.h,th,type};
}
/* coarse 3D cave field per chunk, trilinear-sampled per block */
function genCaveField(x0,z0){
  const NX=5,NY=(WH>>2)+1,NZ=5;
  const f1=new Float32Array(NX*NY*NZ),f2=new Float32Array(NX*NY*NZ);
  let i=0;
  for(let gx=0;gx<NX;gx++)for(let gy=0;gy<NY;gy++)for(let gz=0;gz<NZ;gz++,i++){
    const x=(x0+gx*4)*.075,y=(gy*4)*.075,z=(z0+gz*4)*.075;
    f1[i]=vnoise3(x,y,z,SEED+31);
    f2[i]=vnoise3(x,y,z,SEED+67);
  }
  return {f1,f2,NX,NY,NZ};
}
function caveSample(cf,lx,y,lz){
  const gx=lx/4,gy=y/4,gz=lz/4;
  const x0=gx|0,y0=gy|0,z0=gz|0;
  const tx=gx-x0,ty=gy-y0,tz=gz-z0;
  const x1=Math.min(x0+1,cf.NX-1),y1=Math.min(y0+1,cf.NY-1),z1=Math.min(z0+1,cf.NZ-1);
  function tri(f){
    const S=(xx,yy,zz)=>f[(xx*cf.NY+yy)*cf.NZ+zz];
    const a=lerp(S(x0,y0,z0),S(x1,y0,z0),tx),b=lerp(S(x0,y1,z0),S(x1,y1,z0),tx);
    const c=lerp(S(x0,y0,z1),S(x1,y0,z1),tx),d=lerp(S(x0,y1,z1),S(x1,y1,z1),tx);
    return lerp(lerp(a,b,ty),lerp(c,d,ty),tz);
  }
  return Math.abs(tri(cf.f1)-.5)<.062&&Math.abs(tri(cf.f2)-.5)<.062;
}

function bidx(lx,y,lz){return (lx*WH+y)*CH+lz;}
