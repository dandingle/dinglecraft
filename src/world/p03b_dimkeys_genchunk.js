/* ---- dimensions: keys carry an 'n;'/'a;' prefix outside the overworld ---- */
var DIM='over';
function dimPfx(){return DIM==='over'?'':(DIM==='nether'?'n;':(DIM==='puppet'?'m;':'a;'));}
function keyDim(k){return k[1]===';'?(k[0]==='n'?'nether':(k[0]==='m'?'puppet':'aether')):'over';}
function keyCore(k){return k[1]===';'?k.slice(2):k;}
function dimP(k){
  if(keyDim(k)!==DIM)return null;
  return keyCore(k).split(',');
}
function ckey(cx,cz){return dimPfx()+cx+','+cz;}
function bkey(x,y,z){return dimPfx()+x+','+y+','+z;}

function stampTree(blocks,x0,z0,x,z,t){
  const logId=[B.LOG_O,B.LOG_B,B.LOG_S][t.type];
  const leafId=[B.LEAF_O,B.LEAF_B,B.LEAF_S][t.type];
  const baseY=t.h+1,topY=t.h+t.th;
  function put(wx,wy,wz,id,keep){
    const lx=wx-x0,lz=wz-z0;
    if(lx<0||lx>=CH||lz<0||lz>=CH||wy<1||wy>=WH)return;
    const i=bidx(lx,wy,lz);
    if(keep&&blocks[i]!==B.AIR)return;
    blocks[i]=id;
  }
  if(t.type===2){ /* spruce cone */
    for(let y=baseY;y<=topY;y++)put(x,y,z,logId);
    for(let y=baseY+1;y<=topY-1;y++){
      const rr=((topY-1-y)%2===0)?1:2;
      for(let dx=-rr;dx<=rr;dx++)for(let dz=-rr;dz<=rr;dz++){
        if(dx===0&&dz===0)continue;
        if(rr===2&&Math.abs(dx)===2&&Math.abs(dz)===2)continue;
        put(x+dx,y,z+dz,leafId,true);
      }
    }
    put(x,topY+1,z,leafId,true);
    put(x+1,topY,z,leafId,true);put(x-1,topY,z,leafId,true);
    put(x,topY,z+1,leafId,true);put(x,topY,z-1,leafId,true);
  }else{
    for(let y=baseY;y<topY;y++)put(x,y,z,logId);
    for(let y=topY-2;y<=topY-1;y++)
      for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
        if(dx===0&&dz===0)continue;
        if(Math.abs(dx)===2&&Math.abs(dz)===2&&h2(x+dx+y*7,z+dz,SEED+71)<.5)continue;
        put(x+dx,y,z+dz,leafId,true);
      }
    for(let y=topY;y<=topY+1;y++)
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
        if(y===topY+1&&Math.abs(dx)+Math.abs(dz)>1)continue;
        put(x+dx,y,z+dz,leafId,true);
      }
  }
}

function genChunk(cx,cz){
  if(DIM==='nether')return genChunkNether(cx,cz);
  if(DIM==='aether')return genChunkAether(cx,cz);
  if(DIM==='puppet')return genChunkPuppet(cx,cz);
  const blocks=new Uint8Array(CH*WH*CH);
  const x0=cx*CH,z0=cz*CH;
  const cf=genCaveField(x0,z0);
  for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){
    const wx=x0+lx,wz=z0+lz;
    const ci=colInfo(wx,wz),h=ci.h,b=ci.b;
    const caveLimit=(h>=SEA+1)?h:h-4;
    for(let y=0;y<WH;y++){
      let id=B.AIR;
      if(y===0)id=B.BEDROCK;
      else if(y<=h){
        if(y>3&&y<=caveLimit&&caveSample(cf,lx,y,lz))id=(y<9?B.LAVA:B.AIR);
        else if(y===h)id=topBlock(b,h,wx,wz);
        else if(b===BIOME.DESERT&&y>=h-7&&y<h-3)id=B.SANDSTONE;
        else if(y>=h-3)id=fillerBlock(b);
        else id=stoneOrOre(wx,y,wz);
      }else if(y<=SEA){
        id=(b===BIOME.SNOWY&&y===SEA)?B.ICE:B.WATER;
      }
      blocks[bidx(lx,y,lz)]=id;
    }
  }
  /* trees (with 3-block margin so canopies cross chunk borders) */
  for(let wx=x0-3;wx<x0+CH+3;wx++)for(let wz=z0-3;wz<z0+CH+3;wz++){
    const t=treeAt(wx,wz);
    if(t)stampTree(blocks,x0,z0,wx,wz,t);
  }
  /* small plants, cactus */
  for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){
    const wx=x0+lx,wz=z0+lz;
    const ci=colInfo(wx,wz),h=ci.h;
    if(h+1>=WH)continue;
    const top=blocks[bidx(lx,h,lz)],above=blocks[bidx(lx,h+1,lz)];
    if(above!==B.AIR)continue;
    if(ci.b===BIOME.DESERT&&top===B.SAND){
      if(h2(wx,wz,SEED+1212)<.01){
        const ch_=2+((h2(wx,wz,SEED+1313)*2)|0);
        for(let i=1;i<=ch_&&h+i<WH;i++)blocks[bidx(lx,h+i,lz)]=B.CACTUS;
      }else{const f=bioFlower(ci.b,top,h,wx,wz);if(f)blocks[bidx(lx,h+1,lz)]=f;}
    }else if(top===B.GRASS){
      const r=h2(wx,wz,SEED+606);
      if(r<.09)blocks[bidx(lx,h+1,lz)]=B.TALLGRASS;
      else if(r<.105)blocks[bidx(lx,h+1,lz)]=B.FLOWER_Y;
      else if(r<.12)blocks[bidx(lx,h+1,lz)]=B.FLOWER_R;
      else{const f=bioFlower(ci.b,top,h,wx,wz);if(f)blocks[bidx(lx,h+1,lz)]=f;}
    }else if(top===B.SNOWGRASS||top===B.SAND){const f=bioFlower(ci.b,top,h,wx,wz);if(f)blocks[bidx(lx,h+1,lz)]=f;}
  }
  /* alien villages */
  stampVillages(blocks,x0,z0);
  /* theme parks */
  stampParks(blocks,x0,z0);
  /* buried dungeons + lone spawner vaults */
  stampWDungeons(blocks,x0,z0);
  stampCells(blocks,x0,z0);
  stampRoosts(blocks,x0,z0);
  mgStampChunk(blocks,x0,z0);
  return blocks;
}

