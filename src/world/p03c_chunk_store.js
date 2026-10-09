/* ----- chunk store ----- */
const chunks=new Map();        /* ckey -> {bl,cx,cz,dirty,meshes,edits} */
const chunkEdits=new Map();    /* ckey -> Map("lx,y,lz" -> id)  (persists across unload) */
const blockEnts=new Map();     /* bkey -> {t:'furnace'|'chest',...} */
const torches=new Set();       /* bkey of placed torches */
let frameCount=0;

function createChunk(cx,cz){
  const k=ckey(cx,cz);
  const bl=genChunk(cx,cz);
  let ed=chunkEdits.get(k);
  if(!ed){ed=new Map();chunkEdits.set(k,ed);}
  for(const [lk,id] of ed){
    const p=lk.split(',');
    bl[bidx(+p[0],+p[1],+p[2])]=id;
  }
  for(const [lk,id] of ed){
    if(id!==B.FLOWER_R&&id!==B.FLOWER_Y&&id!==B.TALLGRASS&&id!==B.CACTUS)continue;
    const p=lk.split(',');
    if(+p[1]>0&&bl[bidx(+p[0],+p[1]-1,+p[2])]===B.LAWN)
      LWN.set(bkey(cx*CH+ +p[0],+p[1],cz*CH+ +p[2]),{p:id,cd:0});
  }
  applyCraters(bl,ed,cx,cz);
  const ch={bl,cx,cz,dirty:true,meshes:null,edits:ed};
  chunks.set(k,ch);
  markDirty(cx-1,cz);markDirty(cx+1,cz);markDirty(cx,cz-1);markDirty(cx,cz+1);
  return ch;
}
function markDirty(cx,cz){
  const ch=chunks.get(ckey(cx,cz));
  if(ch)ch.dirty=true;
}
function chunkAt(x,z){
  return chunks.get(ckey(Math.floor(x/CH),Math.floor(z/CH)));
}
function getBlock(x,y,z){
  if(y<0)return B.BEDROCK;
  if(y>=WH)return B.AIR;
  const cx=Math.floor(x/CH),cz=Math.floor(z/CH);
  const ch=chunks.get(ckey(cx,cz));
  if(!ch)return B.AIR;
  return ch.bl[bidx(x-cx*CH,y,z-cz*CH)];
}
function setBlock(x,y,z,id){
  if(y<0||y>=WH)return;
  if(MGP_ON&&mgProtect(x,y,z,id))return;
  const cx=Math.floor(x/CH),cz=Math.floor(z/CH);
  const ch=chunks.get(ckey(cx,cz));
  if(!ch)return;
  const lx=x-cx*CH,lz=z-cz*CH;
  const i=bidx(lx,y,lz);
  const old=ch.bl[i];
  if(old===id)return;
  ch.bl[i]=id;
  ch.edits.set(lx+','+y+','+lz,id);
  if(AG_ACTIVE)ownTrack(x,y,z,old,id);
  const k=bkey(x,y,z);
  if(isTorch(old))torches.delete(k);
  if(isTorch(id))torches.add(k);
  if(isDoorId(old)&&!isDoorId(id)){
    const py=DEFS[old].door.half?y-1:y+1;
    if(isDoorId(getBlock(x,py,z)))setBlock(x,py,z,B.AIR);
  }
  ch.dirty=true;
  if(id===B.WATER)flowAround(x,y,z);
  else if(id===B.AIR&&old!==B.AIR)flowPush(x,y,z);
  if(id===B.TCORE)TITQ.push({x,y,z,t:2.2,pT:0});
  if(lx===0)markDirty(cx-1,cz);
  if(lx===CH-1)markDirty(cx+1,cz);
  if(lz===0)markDirty(cx,cz-1);
  if(lz===CH-1)markDirty(cx,cz+1);
  checkFalling(x,y+1,z);
  if(id!==B.AIR&&DEFS[id].gravity)checkFalling(x,y,z);
  if(DEFS[id].solid===false)checkTorchPop(x,y,z);
}
function surfaceTop(x,z){
  const ch=chunkAt(x,z);
  if(!ch)return DIM==='puppet'?mpSurf(x,z):colInfo(x,z).h;
  const lx=x-ch.cx*CH,lz=z-ch.cz*CH;
  for(let y=WH-1;y>=0;y--){
    const id=ch.bl[bidx(lx,y,lz)];
    if(id!==B.AIR&&DEFS[id].solid!==false)return y;
  }
  return 0;
}
function skyOpen(x,y,z){
  const ch=chunkAt(x,z);
  if(!ch)return true;
  const lx=x-ch.cx*CH,lz=z-ch.cz*CH;
  for(let yy=y+1;yy<WH;yy++){
    if(DEFS[ch.bl[bidx(lx,yy,lz)]].opq)return false;
  }
  return true;
}

