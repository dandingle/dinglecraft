/* the v6.9 mesher, renamed _ref: the reference for tests/core/w_mesher.js. Never edit. */
function addQuad_ref(b,x,y,z,F,uvr,br,lower){
  const u0=uvr[0],v0=uvr[1],u1=uvr[2],v1=uvr[3];
  const uvs=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
  for(let i=0;i<4;i++){
    const V=F.verts[i];
    b.p.push(x+V[0],y+V[1]-(V[1]===1?lower:0),z+V[2]);
    b.n.push(F.n[0],F.n[1],F.n[2]);
    b.u.push(uvs[i][0],uvs[i][1]);
    b.c.push(br[i],br[i],br[i]);
  }
  const s=b.vc;
  if(br[0]+br[2]<=br[1]+br[3])b.ix.push(s,s+1,s+2,s,s+2,s+3);
  else b.ix.push(s+1,s+2,s+3,s+1,s+3,s);
  b.vc+=4;
}
function addCross_ref(b,x,y,z,d){
  const uvr=tileUV(d._t.side);
  const u0=uvr[0],v0=uvr[1],u1=uvr[2],v1=uvr[3];
  const quads=[
    [[x+.12,y,z+.12],[x+.88,y,z+.88],[x+.88,y+1,z+.88],[x+.12,y+1,z+.12]],
    [[x+.88,y,z+.12],[x+.12,y,z+.88],[x+.12,y+1,z+.88],[x+.88,y+1,z+.12]]];
  for(const q of quads){
    const uvs=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
    for(let i=0;i<4;i++){
      b.p.push(q[i][0],q[i][1],q[i][2]);
      b.n.push(0,1,0);
      b.u.push(uvs[i][0],uvs[i][1]);
      b.c.push(.92,.92,.92);
    }
    const s=b.vc;
    b.ix.push(s,s+1,s+2,s,s+2,s+3);
    b.vc+=4;
  }
}
function meshChunk_ref(ch){
  const bl=ch.bl,x0=ch.cx*CH,z0=ch.cz*CH;
  const bufs={op:newBuf(),cut:newBuf(),wat:newBuf()};
  const gb=(x,y,z)=>{
    if(y<0)return B.BEDROCK;
    if(y>=WH)return B.AIR;
    if(x>=0&&x<CH&&z>=0&&z<CH)return bl[bidx(x,y,z)];
    return getBlock(x0+x,y,z0+z);
  };
  for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++)for(let y=0;y<WH;y++){
    const id=bl[bidx(lx,y,lz)];
    if(id===B.AIR)continue;
    const d=DEFS[id];
    if(d.bed){addBed(bufs.cut,lx,y,lz);continue;}
    if(d.crm&&crMesh(bufs,lx,y,lz,d,gb,ch))continue;
    if(d.pcord){piCordMesh(bufs.cut,lx,y,lz,gb,d);continue;}
    if(d.rail){addRail(bufs.cut,lx,y,lz,gb);continue;}
    if(d.railup){addRailUp(bufs.cut,lx,y,lz,d);continue;}
    if(d.ramp){addRamp(bufs.cut,lx,y,lz,d);continue;}
    if(d.door){addDoor(bufs.cut,lx,y,lz,d);continue;}
    if(d.wt){addWallTorch(bufs.cut,lx,y,lz,d);continue;}
    if(d.cross){addCross_ref(bufs.cut,lx,y,lz,d);continue;}
    for(let f=0;f<6;f++){
      const F=FACES[f];
      const nid=gb(lx+F.n[0],y+F.n[1],lz+F.n[2]);
      if(!faceVisible(id,nid))continue;
      const ti=f===0?d._t.top:(f===1?d._t.bot:d._t.side);
      const br=[0,0,0,0];
      for(let v=0;v<4;v++){
        let ao=3;
        if(d.bucket==='op'){
          const A=F.ao[v];
          const s1=DEFS[gb(lx+A[0][0],y+A[0][1],lz+A[0][2])].opq?1:0;
          const s2=DEFS[gb(lx+A[1][0],y+A[1][1],lz+A[1][2])].opq?1:0;
          const cc=DEFS[gb(lx+A[2][0],y+A[2][1],lz+A[2][2])].opq?1:0;
          ao=(s1&&s2)?0:3-(s1+s2+cc);
        }
        br[v]=F.sh*(.45+.55*(ao/3));
      }
      const lower=(id===B.WATER&&f===0&&gb(lx,y+1,lz)!==B.WATER)?.12:0;
      addQuad_ref(bufs[d.bucket],lx,y,lz,F,tileUV(ti),br,lower);
    }
  }
  return bufs;
}
