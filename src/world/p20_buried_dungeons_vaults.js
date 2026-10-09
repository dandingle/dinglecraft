/* ===================================================================== */
/* PART 20 — buried dungeons & lone spawner vaults  (2.0)                */
/* ===================================================================== */
const WDGRID=224,WDSEEN=new Set(),WDLAY=new Map(),WDPEND=[];
function wdCell(gx,gz){
  if(h2(gx*5+1,gz*5-9,SEED+5151)>0.5)return null;
  const ox=60+Math.floor(h2(gx,gz,SEED+5252)*(WDGRID-120));
  const oz=60+Math.floor(h2(gx,gz,SEED+5353)*(WDGRID-120));
  const cx=gx*WDGRID+ox,cz=gz*WDGRID+oz;
  const ci=colInfo(cx,cz);
  if(ci.h<SEA+1)return null;
  if(mgNoStruct(cx,cz))return null;
  return {id:gx+','+gz,cx,cz,gy:ci.h,
    y0:14+Math.floor(h2(gx*3,gz*7,SEED+5454)*10),
    dir:Math.floor(h2(gx*9,gz*2,SEED+5555)*4)};
}
function wdLayout(v){
  const rnd=mulberry32((v.cx*73856093)^(v.cz*19349663)^SEED);
  const bl=new Map();
  const put=(x,y,z,id)=>{if(y>0&&y<WH)bl.set(x+','+y+','+z,id);};
  const cy=v.y0;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const dx=dirs[v.dir][0],dz=dirs[v.dir][1];
  const lx=-dz,lz=dx;
  const at=(f,l)=>[v.cx+dx*f+lx*l,v.cz+dz*f+lz*l];
  const room=(rx,rz,hw,hh,hl)=>{
    for(let ox=-hw;ox<=hw;ox++)for(let oz=-hl;oz<=hl;oz++)for(let oy=-1;oy<=hh;oy++){
      const edge=ox===-hw||ox===hw||oz===-hl||oz===hl||oy===-1||oy===hh;
      put(rx+ox,cy+oy,rz+oz,edge?B.SBRICK:B.AIR);
    }
  };
  const hall=(x0,z0,x1,z1)=>{
    let x=x0,z=z0;
    for(let g=0;g<200;g++){
      const mx=x!==x1?Math.sign(x1-x):0;
      const mz=mx===0&&z!==z1?Math.sign(z1-z):0;
      for(let ox=-1;ox<=1;ox++)for(let oz=-1;oz<=1;oz++)for(let oy=-1;oy<=3;oy++){
        const k=(x+ox)+','+(cy+oy)+','+(z+oz);
        const cur=bl.get(k);
        const fc=oy===-1||oy===3;
        const side=(mx!==0&&Math.abs(oz)===1)||(mz!==0&&Math.abs(ox)===1)||(mx===0&&mz===0&&(Math.abs(ox)===1||Math.abs(oz)===1));
        if(fc){if(cur!==B.AIR)put(x+ox,cy+oy,z+oz,B.SBRICK);}
        else if(side){if(cur!==B.AIR)put(x+ox,cy+oy,z+oz,B.SBRICK);}
        else put(x+ox,cy+oy,z+oz,B.AIR);
      }
      if(x===x1&&z===z1)break;
      if(mx!==0)x+=mx;else z+=mz;
    }
  };
  /* entry, three spawner rooms, boss hall on a spine */
  room(v.cx,v.cz,5,4,5);
  const spine=[14,28,42],sides=[8,-8,8];
  const spw=[],chs=[];
  for(let i=0;i<3;i++){
    const [rx,rz]=at(spine[i],0);
    room(rx,rz,6,4,6);
    spw.push([rx,cy+1,rz,(i===1?B.SPAWNER_S:B.SPAWNER_Z)]);
    if(i===2)spw.push([rx+lx*3,cy+1,rz+lz*3,B.SPAWNER_S]);
    chs.push([rx+dx*4,cy,rz+dz*4,false]);
    const [sx,sz]=at(spine[i],sides[i]);
    room(sx,sz,4,4,4);
    chs.push([sx,cy,sz,rnd()<0.4]);
    put(rx-dx*5,cy+2,rz-dz*5,B.TORCH);
  }
  const [bx,bz]=at(58,0);
  room(bx,bz,8,6,8);
  chs.push([bx+lx*5,cy,bz+lz*5,true]);
  chs.push([bx-lx*5,cy,bz-lz*5,true]);
  put(bx-dx*7,cy+3,bz-dz*7,B.TORCH);
  const s0=at(4,0),s1=at(51,0);
  hall(s0[0],s0[1],s1[0],s1[1]);
  for(let i=0;i<3;i++){
    const sg=Math.sign(sides[i]);
    const a=at(spine[i],3*sg),b=at(spine[i],9*sg);
    hall(a[0],a[1],b[0],b[1]);
  }
  /* place spawners + chests as blocks now; furnish on first visit */
  for(const s of spw)put(s[0],s[1],s[2],s[3]);
  for(const c of chs)put(c[0],c[1],c[2],B.CHEST);
  /* staircase to the surface behind the entry, capped by a little ruin */
  const topY=Math.min(v.gy,WH-4);
  let sx2=v.cx-dx*6,sz2=v.cz-dz*6,sy=cy;
  while(sy<topY){
    put(sx2,sy-1,sz2,B.SBRICK);
    put(sx2,sy,sz2,B.AIR);put(sx2,sy+1,sz2,B.AIR);put(sx2,sy+2,sz2,B.AIR);
    sx2-=dx;sz2-=dz;sy++;
  }
  for(let ox=-1;ox<=1;ox++)for(let oz=-1;oz<=1;oz++){
    put(sx2+ox,topY,sz2+oz,B.SBRICK);
    if((ox===0||oz===0)&&!(ox===0&&oz===0)&&((ox+oz)%2===0))put(sx2+ox,topY+1,sz2+oz,B.SBRICK);
  }
  put(sx2,topY,sz2,B.AIR);put(sx2,topY+1,sz2,B.AIR);
  put(sx2+dx,topY,sz2+dz,B.TORCH);
  return {bl,spw,chs,boss:[bx+0.5,cy+0.1,bz+0.5],
    mobs:spine.map(f=>at(f,0)),cy};
}
function wdLay(v){
  let l=WDLAY.get(v.id);
  if(!l){l=wdLayout(v);WDLAY.set(v.id,l);}
  return l;
}
function stampWDungeons(blocks,x0,z0){
  const g0x=Math.floor((x0-80)/WDGRID),g1x=Math.floor((x0+CH+80)/WDGRID);
  const g0z=Math.floor((z0-80)/WDGRID),g1z=Math.floor((z0+CH+80)/WDGRID);
  for(let gx=g0x;gx<=g1x;gx++)for(let gz=g0z;gz<=g1z;gz++){
    const v=wdCell(gx,gz);
    if(!v)continue;
    if(v.cx+75<x0||v.cx-75>=x0+CH||v.cz+75<z0||v.cz-75>=z0+CH)continue;
    const lay=wdLay(v);
    for(const [k,id] of lay.bl){
      const p=k.split(',');
      const wx=+p[0],y=+p[1],wz=+p[2];
      if(wx<x0||wx>=x0+CH||wz<z0||wz>=z0+CH)continue;
      blocks[bidx(wx-x0,y,wz-z0)]=id;
      if(id===B.TORCH)torches.add(bkey(wx,y,wz));
    }
    if(v.cx>=x0&&v.cx<x0+CH&&v.cz>=z0&&v.cz<z0+CH&&!WDSEEN.has(v.id))
      WDPEND.push(v);
  }
}
function processWD(dt){
  while(WDPEND.length){
    const v=WDPEND.pop();
    if(WDSEEN.has(v.id))continue;
    WDSEEN.add(v.id);
    const lay=wdLay(v);
    for(const s of lay.spw)SPW.set(bkey(s[0],s[1],s[2]),2+Math.random()*2);
    for(const c of lay.chs)lootFill(c[0],c[1],c[2],c[3]);
    for(const m of lay.mobs)
      for(let i=0;i<3;i++)
        spawnMob(Math.random()<0.5?'zombie':'skel',m[0]+(Math.random()*6-3),lay.cy+0.1,m[1]+(Math.random()*6-3));
    spawnMob('boss',lay.boss[0],lay.boss[1],lay.boss[2]);
  }
}

/* ----- lone spawner vaults ----- */
const LSGRID=96,LSSEEN=new Set(),LSPEND=[];
function lsCell(gx,gz){
  if(h2(gx*13+5,gz*13-11,SEED+6161)>0.55)return null;
  const ox=20+Math.floor(h2(gx,gz,SEED+6262)*(LSGRID-40));
  const oz=20+Math.floor(h2(gx,gz,SEED+6363)*(LSGRID-40));
  const cx=gx*LSGRID+ox,cz=gz*LSGRID+oz;
  const cy=10+Math.floor(h2(gx*7,gz*3,SEED+6464)*22);
  const ci=colInfo(cx,cz);
  if(cy>ci.h-8)return null; /* keep it buried */
  if(mgNoStruct(cx,cz))return null;
  return {id:gx+','+gz,cx,cz,cy,
    kind:h2(gx,gz,SEED+6565)<0.5?B.SPAWNER_Z:B.SPAWNER_S,
    two:h2(gx,gz,SEED+6666)<0.35};
}
function stampCells(blocks,x0,z0){
  const g0x=Math.floor((x0-12)/LSGRID),g1x=Math.floor((x0+CH+12)/LSGRID);
  const g0z=Math.floor((z0-12)/LSGRID),g1z=Math.floor((z0+CH+12)/LSGRID);
  for(let gx=g0x;gx<=g1x;gx++)for(let gz=g0z;gz<=g1z;gz++){
    const v=lsCell(gx,gz);
    if(!v)continue;
    if(v.cx+5<x0||v.cx-5>=x0+CH||v.cz+5<z0||v.cz-5>=z0+CH)continue;
    for(let ox=-3;ox<=3;ox++)for(let oz=-3;oz<=3;oz++)for(let oy=-1;oy<=4;oy++){
      const wx=v.cx+ox,wz=v.cz+oz,y=v.cy+oy;
      if(wx<x0||wx>=x0+CH||wz<z0||wz>=z0+CH||y<1||y>=WH)continue;
      const edge=Math.abs(ox)===3||Math.abs(oz)===3||oy===-1||oy===4;
      blocks[bidx(wx-x0,y,wz-z0)]=edge?(h2(wx,y*31+wz,SEED+6767)<0.4?B.SBRICK:B.STONE):B.AIR;
    }
    if(v.cx>=x0&&v.cx<x0+CH&&v.cz>=z0&&v.cz<z0+CH&&!LSSEEN.has(v.id))
      LSPEND.push(v);
  }
}
function processCells(dt){
  while(LSPEND.length){
    const v=LSPEND.pop();
    if(LSSEEN.has(v.id))continue;
    LSSEEN.add(v.id);
    setBlock(v.cx,v.cy+1,v.cz,v.kind);
    SPW.set(bkey(v.cx,v.cy+1,v.cz),2+Math.random()*2);
    lootChest(v.cx+2,v.cy,v.cz+2,false);
    if(v.two)lootChest(v.cx-2,v.cy,v.cz-2,h2(v.cx,v.cz,SEED+6868)<0.3);
  }
}


