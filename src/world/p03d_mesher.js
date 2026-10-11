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
  const V=F.verts,N=F.n,nx=N[0],ny=N[1],nz=N[2];
  const u0=uvr[0],v0=uvr[1],u1=uvr[2],v1=uvr[3];
  const b0=br[0],b1=br[1],b2=br[2],b3=br[3];
  let W=V[0];b.p.push(x+W[0],y+W[1]-(W[1]===1?lower:0),z+W[2]);
  W=V[1];b.p.push(x+W[0],y+W[1]-(W[1]===1?lower:0),z+W[2]);
  W=V[2];b.p.push(x+W[0],y+W[1]-(W[1]===1?lower:0),z+W[2]);
  W=V[3];b.p.push(x+W[0],y+W[1]-(W[1]===1?lower:0),z+W[2]);
  b.n.push(nx,ny,nz,nx,ny,nz,nx,ny,nz,nx,ny,nz);
  b.u.push(u0,v0,u1,v0,u1,v1,u0,v1);
  b.c.push(b0,b0,b0,b1,b1,b1,b2,b2,b2,b3,b3,b3);
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
/* meshChunk: identical output to v6.9 (tests/core/w_mesher.js), from a padded chunk copy and per-id tables */
const MPX=CH+2,MPY=WH+2,MDX=MPY*MPX,MDY=MPX;
const MPAD=new Uint8Array(MPX*MPY*MPX);
const MOPQ=new Uint8Array(256),MCULL=new Uint8Array(256),MWAT=new Uint8Array(256),MAOB=new Uint8Array(256),MSPC=new Uint8Array(256);
const MNOF=FACES.map(F=>F.n[0]*MDX+F.n[1]*MDY+F.n[2]);
const MAOF=FACES.map(F=>F.ao.map(A=>A.map(o=>o[0]*MDX+o[1]*MDY+o[2])));
const MSHT=FACES.map(F=>[0,1,2,3].map(ao=>F.sh*(.45+.55*(ao/3))));
let mBusy=0;
function mTables(){
  for(let i=0;i<256;i++){
    const d=DEFS[i];
    if(!d){MOPQ[i]=MCULL[i]=MWAT[i]=MAOB[i]=0;MSPC[i]=1;continue;}
    MOPQ[i]=d.opq?1:0;MCULL[i]=d.cullSame?1:0;MWAT[i]=d.bucket==='wat'?1:0;MAOB[i]=d.bucket==='op'?1:0;
    MSPC[i]=(d.bed||d.crm||d.pcord||d.rail||d.railup||d.ramp||d.door||d.wt||d.cross)?1:0;
  }
}
function mPad(ch,pad){
  const cx=ch.cx,cz=ch.cz,AIR=B.AIR,BR=B.BEDROCK,nb=[];
  for(let i=-1;i<=1;i++)for(let k=-1;k<=1;k++){const n=(i||k)?chunks.get(ckey(cx+i,cz+k)):ch;nb.push(n?n.bl:null);}
  for(let px=0;px<MPX;px++){
    const lx=px-1,i=lx<0?0:(lx>=CH?2:1),sx=lx<0?CH-1:(lx>=CH?0:lx);
    for(let pz=0;pz<MPX;pz++){
      const lz=pz-1,k=lz<0?0:(lz>=CH?2:1),sz=lz<0?CH-1:(lz>=CH?0:lz),src=nb[i*3+k];
      let o=px*MDX+pz;
      pad[o]=BR;o+=MDY;
      if(src){let s=sx*WH*CH+sz;for(let y=0;y<WH;y++,o+=MDY,s+=CH)pad[o]=src[s];}
      else for(let y=0;y<WH;y++,o+=MDY)pad[o]=AIR;
      pad[o]=AIR;
    }
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
  const pad=mBusy?new Uint8Array(MPAD.length):MPAD;
  mBusy++;
  try{
    mTables();mPad(ch,pad);
    const AIR=B.AIR,WAT=B.WATER,tuv=[],br=[0,0,0,0];
    for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){
      let o=(lx+1)*MDX+MDY+lz+1;
      for(let y=0;y<WH;y++,o+=MDY){
        const id=pad[o];
        if(id===AIR)continue;
        const d=DEFS[id];
        if(MSPC[id]){
          if(d.bed){addBed(bufs.cut,lx,y,lz);continue;}
          if(d.crm&&crMesh(bufs,lx,y,lz,d,gb,ch))continue;
          if(d.pcord){piCordMesh(bufs.cut,lx,y,lz,gb,d);continue;}
          if(d.rail){addRail(bufs.cut,lx,y,lz,gb);continue;}
          if(d.railup){addRailUp(bufs.cut,lx,y,lz,d);continue;}
          if(d.ramp){addRamp(bufs.cut,lx,y,lz,d);continue;}
          if(d.door){addDoor(bufs.cut,lx,y,lz,d);continue;}
          if(d.wt){addWallTorch(bufs.cut,lx,y,lz,d);continue;}
          if(d.cross){addCross(bufs.cut,lx,y,lz,d);continue;}
        }
        const t=d._t,buf=bufs[d.bucket],aob=MAOB[id],cull=MCULL[id],wat=MWAT[id];
        for(let f=0;f<6;f++){
          const nid=pad[o+MNOF[f]];
          if((nid===id&&cull)||MOPQ[nid]||(wat&&nid===WAT))continue;
          const sh=MSHT[f];
          if(aob){
            const A=MAOF[f];
            for(let v=0;v<4;v++){
              const a=A[v],s1=MOPQ[pad[o+a[0]]],s2=MOPQ[pad[o+a[1]]],cc=MOPQ[pad[o+a[2]]];
              br[v]=sh[(s1&&s2)?0:3-(s1+s2+cc)];
            }
          }else br[0]=br[1]=br[2]=br[3]=sh[3];
          const ti=f===0?t.top:(f===1?t.bot:t.side);
          let uv=tuv[ti];if(uv===undefined)uv=tuv[ti]=tileUV(ti);
          const lower=(id===WAT&&f===0&&pad[o+MDY]!==WAT)?.12:0;
          addQuad(buf,lx,y,lz,FACES[f],uv,br,lower);
        }
      }
    }
  }finally{mBusy--;}
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

