/* ----- mesher ----- */
function buildFaces(){
  const defs=[
    {n:[0,1,0], u:[0,0,1],  v:[1,0,0], o:[0,1,0], sh:1.0},
    {n:[0,-1,0],u:[1,0,0],  v:[0,0,1], o:[0,0,0], sh:0.55},
    {n:[1,0,0], u:[0,0,-1], v:[0,1,0], o:[1,0,1], sh:0.8},
    {n:[-1,0,0],u:[0,0,1],  v:[0,1,0], o:[0,0,0], sh:0.8},
    {n:[0,0,1], u:[1,0,0],  v:[0,1,0], o:[0,0,1], sh:0.65},
    {n:[0,0,-1],u:[-1,0,0], v:[0,1,0], o:[1,0,0], sh:0.65}];
  return defs.map(d=>{
    const verts=[],ao=[],uvc=[[0,0],[1,0],[1,1],[0,1]];
    const na=d.n[0]!==0?0:(d.n[1]!==0?1:2);
    const t=[0,1,2].filter(a=>a!==na);
    for(const c of uvc){
      const p=[d.o[0]+d.u[0]*c[0]+d.v[0]*c[1],
               d.o[1]+d.u[1]*c[0]+d.v[1]*c[1],
               d.o[2]+d.u[2]*c[0]+d.v[2]*c[1]];
      verts.push(p);
      const s1=[0,0,0],s2=[0,0,0],cc=[0,0,0];
      s1[na]=s2[na]=cc[na]=d.n[na];
      s1[t[0]]=p[t[0]]===1?1:-1;
      s2[t[1]]=p[t[1]]===1?1:-1;
      cc[t[0]]=s1[t[0]];cc[t[1]]=s2[t[1]];
      ao.push([s1,s2,cc]);
    }
    return {n:d.n,verts,ao,sh:d.sh};
  });
}
const FACES=buildFaces();
function faceVisible(id,nid){
  const d=DEFS[id],nd=DEFS[nid];
  if(id===nid&&d.cullSame)return false;
  if(nd.opq)return false;
  if(d.bucket==='wat'&&nid===B.WATER)return false;
  return true;
}
function newBuf(){return {p:[],n:[],u:[],c:[],ix:[],vc:0};}
function addQuad(b,x,y,z,F,uvr,br,lower){
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
function addCross(b,x,y,z,d){
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
function meshChunk(ch){
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
    if(d.cross){addCross(bufs.cut,lx,y,lz,d);continue;}
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
      addQuad(bufs[d.bucket],lx,y,lz,F,tileUV(ti),br,lower);
    }
  }
  return bufs;
}
function disposeChunkMeshes(ch){
  if(ch.meshes)for(const m of ch.meshes){scene.remove(m);m.geometry.dispose();}
  ch.meshes=null;
}
function applyMesh(ch,bufs){
  disposeChunkMeshes(ch);
  ch.meshes=[];
  const mats={op:matOp,cut:matCut,wat:matWat};
  for(const k in bufs){
    const b=bufs[k];
    if(!b.vc)continue;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(b.u,2));
    g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));
    g.setIndex(b.ix);
    const m=new THREE.Mesh(g,mats[k]);
    if(shadowsOn()&&k!=='wat'){m.castShadow=true;m.receiveShadow=true;}
    else if(shadowsOn())m.receiveShadow=true;
    if(TP.hr&&k==='cut'&&HRW.on&&HRW.cutDepth)m.customDepthMaterial=HRW.cutDepth;
    m.position.set(ch.cx*CH,0,ch.cz*CH);
    if(k==='cut')m.renderOrder=1;
    if(k==='wat')m.renderOrder=2;
    scene.add(m);
    ch.meshes.push(m);
  }
  ch.dirty=false;
  if(TP.hr)tpEmit('mesh',ch);
}
let RD=8;
function updateChunks(){
  const t0=performance.now();
  const pcx=Math.floor(P.x/CH),pcz=Math.floor(P.z/CH);
  const need=[];
  for(let dx=-RD;dx<=RD;dx++)for(let dz=-RD;dz<=RD;dz++){
    const ch=chunks.get(ckey(pcx+dx,pcz+dz));
    if(!ch||ch.dirty)need.push([dx*dx+dz*dz,pcx+dx,pcz+dz]);
  }
  need.sort((a,b)=>a[0]-b[0]);
  for(const nd of need){
    if(performance.now()-t0>8)break;
    let ch=chunks.get(ckey(nd[1],nd[2]));
    if(!ch)ch=createChunk(nd[1],nd[2]);
    if(ch.dirty)applyMesh(ch,meshChunk(ch));
  }
  if(frameCount%180===0){
    for(const [k,ch] of chunks){
      if(Math.max(Math.abs(ch.cx-pcx),Math.abs(ch.cz-pcz))>RD+2){
        if(AG_ACTIVE&&ticketHeld(k)){if(ch.meshes){disposeChunkMeshes(ch);}ch.dirty=true;continue;}
        disposeChunkMeshes(ch);
        chunks.delete(k);
      }
    }
  }
}

