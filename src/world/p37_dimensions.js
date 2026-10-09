/* PART 37 - DIMENSIONS: the Nether & the Aether */
/* One chunk engine, three worlds: keys carry an 'n;'/'a;' prefix outside the
   overworld, so edits/chests/spawners/torches persist per-dimension for free.
   Travel flushes loaded chunks and stashes this dimension's entities. */
B.NETHROCK=80;B.SOULSAND=81;B.GLOWSTONE=82;B.NBRICK=83;B.OBSIDIAN=84;B.PORTAL_N=85;
B.CLOUDSTONE=86;B.SKYGRASS=87;B.AMBRO=88;B.ABRICK=89;B.PORTAL_A=90;
def(B.NETHROCK,{name:'Netherrock',tiles:'nethrock',hard:0.7,toolClass:'pick'});
def(B.SOULSAND,{name:'Soul Sand',tiles:'soulsand',hard:0.6,toolClass:'shovel'});
def(B.GLOWSTONE,{name:'Glowstone',tiles:'glowstone',hard:0.4});
def(B.NBRICK,{name:'Nether Brick',tiles:'nbrick',hard:2.4,toolClass:'pick',req:true});
def(B.OBSIDIAN,{name:'Obsidian',tiles:'obsidian',hard:18,toolClass:'pick',req:true,tier:3});
def(B.PORTAL_N,{name:'Nether Portal',tiles:'portal_n',hard:-1,solid:false,opq:false,bucket:'cut',cullSame:true,drop:null,hide:true});
def(B.CLOUDSTONE,{name:'Cloudstone',tiles:'cloudstone',hard:0.8,toolClass:'pick'});
def(B.SKYGRASS,{name:'Sky Grass',tiles:{top:'skygrass',side:'skygrass_s',bot:'cloudstone'},hard:0.6,toolClass:'shovel',drop:B.CLOUDSTONE});
def(B.AMBRO,{name:'Skyhoney Ore',tiles:'ambro',hard:2,toolClass:'pick'});
def(B.ABRICK,{name:'Aether Brick',tiles:'abrick',hard:2.4,toolClass:'pick',req:true});
def(B.PORTAL_A,{name:'Aether Portal',tiles:'portal_a',hard:-1,solid:false,opq:false,bucket:'cut',cullSame:true,drop:null,hide:true});
B.TRAMP=91;
def(B.TRAMP,{name:'Trampoline',tiles:{top:'tramp_t',side:'tramp_s',bot:'tramp_b'},hard:0.8,toolClass:'axe'});
tile('tramp_t',(c,R)=>{fillN(c,R,'#2a4ac2',.08);
  c.fillStyle='#1a2a7a';for(let i=2;i<16;i+=3){c.fillRect(i,0,1,16);c.fillRect(0,i,16,1);}
  c.fillStyle='#3d6de8';c.fillRect(0,0,16,2);c.fillRect(0,14,16,2);c.fillRect(0,0,2,16);c.fillRect(14,0,2,16);});
tile('tramp_s',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#3d6de8';c.fillRect(0,0,16,4);
  c.fillStyle='#26262e';c.fillRect(1,4,2,12);c.fillRect(13,4,2,12);c.fillRect(7,4,2,8);
  c.fillStyle='#4a4a55';c.fillRect(1,4,2,2);c.fillRect(13,4,2,2);});
tile('tramp_b',(c,R)=>{fillN(c,R,'#26262e',.1);});
R(['SSS','PPP'],{S:IT.STRING,P:'planks'},B.TRAMP,1);
tile('nethrock',(c,R)=>{fillN(c,R,'#6d2320',.16);px(c,4,5,'#8f3a30');px(c,11,9,'#54140f');});
tile('soulsand',(c,R)=>{fillN(c,R,'#4a3527',.12);px(c,5,6,'#241811');px(c,10,4,'#241811');px(c,7,11,'#241811');});
tile('glowstone',(c,R)=>{fillN(c,R,'#e8b954',.2);px(c,3,3,'#fff2b0');px(c,10,6,'#fff2b0');px(c,6,11,'#fff2b0');px(c,12,12,'#fff2b0');});
tile('nbrick',(c,R)=>{fillN(c,R,'#3d1412',.08);c.fillStyle='#2a0c0a';c.fillRect(0,5,16,1);c.fillRect(0,11,16,1);c.fillRect(5,0,1,5);c.fillRect(11,5,1,6);c.fillRect(3,11,1,5);});
tile('obsidian',(c,R)=>{fillN(c,R,'#171126',.1);px(c,4,4,'#3a2a5e');px(c,11,8,'#2a1e46');px(c,7,13,'#3a2a5e');});
tile('portal_n',(c,R)=>{fillN(c,R,'#5a1e8f',.3);px(c,5,5,'#b26aff');px(c,9,9,'#b26aff');px(c,12,3,'#8f3aff');});
tile('cloudstone',(c,R)=>{fillN(c,R,'#c9d4e0',.07);px(c,5,5,'#aab6c6');px(c,11,10,'#aab6c6');});
tile('skygrass',(c,R)=>fillN(c,R,'#7fd0e8',.1));
tile('skygrass_s',(c,R)=>{fillN(c,R,'#c9d4e0',.07);
  for(let x=0;x<16;x++){const d2=2+((R()*3)|0);for(let y=0;y<d2;y++)px(c,x,y,'#7fd0e8');}});
tile('ambro',(c,R)=>{fillN(c,R,'#c9d4e0',.07);px(c,4,4,'#ffd23d');px(c,5,4,'#ffe98a');px(c,10,8,'#ffd23d');px(c,11,9,'#ffe98a');px(c,7,12,'#ffd23d');});
tile('abrick',(c,R)=>{fillN(c,R,'#e8eef4',.05);c.fillStyle='#c2ccd8';c.fillRect(0,5,16,1);c.fillRect(0,11,16,1);c.fillRect(7,0,1,5);c.fillRect(4,5,1,6);c.fillRect(11,11,1,5);});
tile('portal_a',(c,R)=>{fillN(c,R,'#3d9de8',.3);px(c,5,5,'#aee2ff');px(c,10,8,'#e0f4ff');px(c,3,11,'#7fc8ff');});

MOBT.imp={hp:8,hw:0.3,h:0.9,spd:2.7,dmg:3,hostile:1,xp:4,body:'#7a2020',head:'#933023',legs:'#54140f'};
MOBT.hellhog={hp:12,hw:0.42,h:0.85,spd:1.7,dmg:0,xp:2,body:'#b8433a',head:'#c85548',legs:'#8f2a22',drop:{id:IT.PORK,count:2}};
MOBT.cherub={hp:6,hw:0.3,h:0.9,spd:3.1,dmg:2,hostile:1,xp:3,body:'#eef0fa',head:'#ffe9c8',legs:'#d8dce8'};
MOBT.infernis={hp:180,hw:0.55,h:2.2,spd:3.2,dmg:8,hostile:1,boss:1,xp:60,body:'#8f1a1a',head:'#b3241a',legs:'#54140f'};
MOBT.valkyra={hp:150,hw:0.5,h:2.0,spd:4.2,dmg:7,hostile:1,boss:1,fly:1,xp:60,body:'#f2f2fa',head:'#ffe9c8',legs:'#d8b23d'};

const NCOLM=new Map(),ACOLM=new Map();
function nCol(x,z){
  const k=x+','+z;
  let c=NCOLM.get(k);
  if(c)return c;
  const f=10+Math.floor(h2(x,z,SEED^0x17e77)*14+Math.sin(x*0.05)*2+Math.cos(z*0.06)*2);
  const cl=56+Math.floor(h2(x,z,SEED^0x2b3a1)*12);
  c={f:Math.max(4,f),c:Math.min(72,cl),p:h2(x,z,SEED^0x3c4d2)<0.012};
  NCOLM.set(k,c);
  return c;
}
function genChunkNether(cx,cz){
  const blocks=new Uint8Array(CH*WH*CH);
  const x0=cx*CH,z0=cz*CH;
  for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){
    const wx=x0+lx,wz=z0+lz;
    const nc=nCol(wx,wz);
    const glow=h2(wx>>2<<2,wz>>2<<2,SEED^0x9e10)<0.05&&(wx&3)<2&&(wz&3)<2;
    const soul=h2(wx,wz,SEED^0x50a1)<0.08;
    for(let y=0;y<WH;y++){
      let id=B.AIR;
      if(y<=1||y>=WH-3)id=B.BEDROCK;
      else if(nc.p)id=B.NETHROCK;
      else if(y<=nc.f)id=(y===nc.f&&soul)?B.SOULSAND:B.NETHROCK;
      else if(y>=nc.c)id=B.NETHROCK;
      else if(y<12)id=B.LAVA;
      else if(glow&&(y===nc.c-1||y===nc.c-2))id=B.GLOWSTONE;
      blocks[bidx(lx,y,lz)]=id;
    }
    if(h3(wx,4,wz,SEED^0x66)<0.004){
      const gy=nc.f+1;
      if(gy<nc.c&&blocks[bidx(lx,gy,lz)]===B.AIR)blocks[bidx(lx,gy,lz)]=B.GLOWSTONE;
    }
  }
  /* nether fortress stamp + discovery */
  const x0b=cx*CH,z0b=cz*CH;
  for(let gx2=Math.floor((x0b-24)/176);gx2<=Math.floor((x0b+CH+24)/176);gx2++)
  for(let gz2=Math.floor((z0b-24)/176);gz2<=Math.floor((z0b+CH+24)/176);gz2++){
    const fc=nfCell(gx2,gz2);
    if(!fc)continue;
    for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){
      const wx=x0b+lx,wz=z0b+lz;
      const dx=wx-fc.cx,dz=wz-fc.cz;
      if(Math.abs(dx)>11||Math.abs(dz)>11)continue;
      const edge=Math.max(Math.abs(dx),Math.abs(dz));
      for(let y=26;y<=34;y++){
        let id2=-1;
        if(y===26)id2=B.NBRICK;
        else if(edge===11)id2=(y<=30)?B.NBRICK:-1;
        else if(edge>=10&&Math.abs(dx)>=10&&Math.abs(dz)>=10)id2=(y<=32)?B.NBRICK:-1;
        else if(edge<=4&&y===27&&(Math.abs(dx)===4||Math.abs(dz)===4))id2=B.NBRICK;
        else if(dx===0&&dz===0&&y===27)id2=B.GLOWSTONE;
        else id2=(y>26)?B.AIR:-1;
        if(id2>=0)blocks[bidx(lx,y,lz)]=id2;
      }
    }

  }
  return blocks;
}
function aCol(x,z){
  const k=x+','+z;
  if(ACOLM.has(k))return ACOLM.get(k);
  const gx=Math.floor(x/40),gz=Math.floor(z/40);
  let out=null;
  for(let ix=gx-1;ix<=gx+1&&!out;ix++)for(let iz=gz-1;iz<=gz+1&&!out;iz++){
    if(h2(ix,iz,SEED^0xae7e)>=0.62)continue;
    const cx2=ix*40+8+h2(ix,iz,SEED^0xb1)*24;
    const cz2=iz*40+8+h2(ix,iz,SEED^0xc2)*24;
    const r=9+h2(ix,iz,SEED^0xd3)*8;
    const d2=Math.hypot(x-cx2,z-cz2);
    if(d2>r)continue;
    const t=46+Math.floor(h2(ix,iz,SEED^0xe4)*6+Math.sin(x*0.11)*1.5+Math.cos(z*0.13)*1.5);
    const th=Math.max(2,Math.floor((1-(d2/r)*(d2/r))*10+2));
    out={t:Math.min(70,t),th};
  }
  ACOLM.set(k,out);
  return out;
}
function genChunkAether(cx,cz){
  const blocks=new Uint8Array(CH*WH*CH);
  const x0=cx*CH,z0=cz*CH;
  for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){
    const wx=x0+lx,wz=z0+lz;
    const a=aCol(wx,wz);
    if(!a)continue;
    for(let y=a.t-a.th;y<=a.t;y++){
      if(y<1||y>=WH)continue;
      let id=(y===a.t)?B.SKYGRASS:B.CLOUDSTONE;
      if(id===B.CLOUDSTONE&&h3(wx,y,wz,SEED^0xf5a)<0.03)id=B.AMBRO;
      blocks[bidx(lx,y,lz)]=id;
    }
    if(blocks[bidx(lx,a.t,lz)]===B.SKYGRASS&&a.t+1<WH&&h2(wx,wz,SEED^0x1f2)<0.06)
      blocks[bidx(lx,a.t+1,lz)]=B.FLOWER_Y;
  }
  /* aether shrine stamp + discovery */
  const ax0=cx*CH,az0=cz*CH;
  for(let gx2=Math.floor((ax0-16)/144);gx2<=Math.floor((ax0+CH+16)/144);gx2++)
  for(let gz2=Math.floor((az0-16)/144);gz2<=Math.floor((az0+CH+16)/144);gz2++){
    const sc=asCell(gx2,gz2);
    if(!sc)continue;
    for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){
      const wx=ax0+lx,wz=az0+lz;
      const dx=wx-sc.cx,dz=wz-sc.cz;
      if(Math.abs(dx)>4||Math.abs(dz)>4)continue;
      const by=sc.y;
      blocks[bidx(lx,by,lz)]=B.ABRICK;
      for(let y2=by+1;y2<=by+4&&y2<WH;y2++)blocks[bidx(lx,y2,lz)]=B.AIR;
      if(Math.abs(dx)===4&&Math.abs(dz)===4)
        for(let y2=by+1;y2<=by+3;y2++)blocks[bidx(lx,y2,lz)]=B.ABRICK;
      if(Math.abs(dx)===4&&Math.abs(dz)===4&&by+4<WH)blocks[bidx(lx,by+4,lz)]=B.GLOWSTONE;
      if(dx===0&&dz===0)blocks[bidx(lx,by+1,lz)]=B.AMBRO;
    }

  }
  return blocks;
}
const ENT_STASH={};
function stashEnts(){
  hrClearCorpses();
  const out=[];
  for(const e of entities){
    if(e.dead)continue;
    if(e.t==='mob'&&e.bot){if(e.A){agSyncFromBody(e.A);e.A.e=null;}removeEnt(e);continue;}
    if(e.t==='mob'&&MOBT[e.mt].pmob){mpSnapMob(e,null);removeEnt(e);continue;}
    if(e.t==='mob'&&MOBT[e.mt].mg){mgStashed(e);continue;}
    if(e.t==='mob'){
      const o={t:e.mt,x:e.x,y:e.y,z:e.z,hp:e.hp};
      if(e.cellId)o.ci=e.cellId;
      if(e.mt==='alien'){o.nm=e.name;o.rel=e.rel;o.rom=e.rom;o.md=e.mood==='h'?'h':'c';o.hx=e.hx;o.hz=e.hz;}
      if(MOBT[e.mt].fly){o.tm=e.tame?1:0;o.fed=e.fed||0;o.ang=e.angry?1:0;o.hx=e.hx;o.hy=e.hy;o.hz=e.hz;}
      out.push(o);removeEnt(e);
    }else if(e.t==='drop'&&e.st){out.push({t:'drop',x:e.x,y:e.y,z:e.z,st:e.st});removeEnt(e);}
    else if(e.t==='car'||e.t==='skate'||e.t==='boat'||e.t==='cart'||e.t==='plane'){out.push({t:e.t,x:e.x,y:e.y,z:e.z,yaw:e.yaw||0});removeEnt(e);}
    else if(e.t!=='esnail')removeEnt(e);
  }
  pruneEnts();
  ENT_STASH[DIM]=out;
}
function unstashEnts(){
  for(const o of (ENT_STASH[DIM]||[])){
    if(o.t==='drop'){spawnDrop(o.x,o.y,o.z,o.st,0,0,0);continue;}
    if(o.t==='car'){spawnCar(o.x,o.y,o.z,o.yaw);continue;}
    if(o.t==='skate'){spawnSkate(o.x,o.y,o.z,o.yaw);continue;}
    if(o.t==='boat'){spawnBoat(o.x,o.y,o.z);continue;}
    if(o.t==='cart'){spawnCart(o.x,o.y,o.z);continue;}
    if(o.t==='plane'){spawnPlane(o.x,o.y,o.z,o.yaw);continue;}
    if(!MOBT[o.t]||MOBT[o.t].mg)continue;
    spawnMob(o.t,o.x,o.y,o.z);
    const e=entities[entities.length-1];
    e.hp=o.hp;
    if(o.ci)e.cellId=o.ci;
    if(o.t==='alien'){e.name=o.nm;e.rel=o.rel;e.rom=o.rom;e.mood=o.md==='h'?'h':'c';e.hx=o.hx;e.hz=o.hz;}
    if(MOBT[o.t].fly){e.tame=!!o.tm;e.fed=o.fed||0;e.angry=!!o.ang;e.hx=o.hx;e.hy=o.hy;e.hz=o.hz;}
  }
  ENT_STASH[DIM]=[];
}
function setDim(d,x,y,z){
  if(d===DIM){
    if(P){P.x=x;P.y=y;P.z=z;P.vx=P.vy=P.vz=0;P.fallD=0;}
    return;
  }
  stashEnts();
  DIM=d;
  for(const [k,ch] of chunks)disposeChunkMeshes(ch);
  chunks.clear();
  if(P){P.x=x;P.y=y;P.z=z;P.vx=P.vy=P.vz=0;P.fallD=0;P.portalT=0;P.ride=null;}
  unstashEnts();
  if(typeof refreshHand==='function')refreshHand();
}
const NSEEN=new Set(),NPEND=[];
const ASEEN=new Set(),APEND=[];
function nfCell(gx,gz){
  if(h2(gx,gz,SEED^0xf047)>=0.5)return null;
  return {id:gx+','+gz,
    cx:gx*176+40+Math.floor(h2(gx,gz,SEED^0xf147)*96),
    cz:gz*176+40+Math.floor(h2(gx,gz,SEED^0xf247)*96)};
}
function asCell(gx,gz){
  if(h2(gx,gz,SEED^0xa047)>=0.55)return null;
  const cx2=gx*144+24+Math.floor(h2(gx,gz,SEED^0xa147)*96);
  const cz2=gz*144+24+Math.floor(h2(gx,gz,SEED^0xa247)*96);
  const a=aCol(cx2,cz2);
  if(!a)return null;
  return {id:gx+','+gz,cx:cx2,cz:cz2,y:a.t+1};
}
function dimLoot(x,y,z,aeth){
  const be=ensureBE(x,y,z,'chest');
  const tab=aeth?[[IT.GOLD,2,4],[IT.CRYSTAL,1,2],[B.GLOWSTONE,2,5],[IT.STEAK,1,3],[IT.DIAMOND,1,2]]
                :[[IT.GOLD,2,5],[IT.CRYSTAL,1,2],[B.GLOWSTONE,3,6],[IT.GUNPOWDER,2,5],[IT.DIAMOND,1,2]];
  for(let i=0;i<4;i++){
    const it=tab[(Math.random()*tab.length)|0];
    const cnt=it[1]+Math.floor(Math.random()*(it[2]-it[1]+1));
    const slot=(Math.random()*27)|0;
    be.inv[slot]={id:it[0],count:cnt};
  }
  if(Math.random()<0.75)be.inv[(Math.random()*27)|0]={id:randGadget(),count:1};
  if(typeof crFoundRoll==='function')crFoundRoll(be,x,y,z);   /* Release 1.0: Nether and Aether chests can hold a rare found work too */
}
const INFKILL=new Set(),VALKILL=new Set();
function bossAlive(mt,cellId){
  for(const e of entities)
    if(e.t==='mob'&&!e.dead&&e.mt===mt&&e.cellId===cellId)return true;
  return false;
}
function processNether(dt){
  if(DIM!=='nether'||!P||P.dead||frameCount%30!==0)return;
  const gx=Math.floor(P.x/176),gz=Math.floor(P.z/176);
  for(let ix=gx-1;ix<=gx+1;ix++)for(let iz=gz-1;iz<=gz+1;iz++){
    const fc=nfCell(ix,iz);
    if(!fc)continue;
    if(Math.hypot(fc.cx+0.5-P.x,fc.cz+0.5-P.z)>44)continue;
    if(!chunkAt(fc.cx,fc.cz))continue;
    if(!NSEEN.has(fc.id)){
      NSEEN.add(fc.id);
      setBlock(fc.cx,28,fc.cz,B.CHEST);dimLoot(fc.cx,28,fc.cz,false);
      setBlock(fc.cx+3,28,fc.cz+3,B.CHEST);dimLoot(fc.cx+3,28,fc.cz+3,false);
      showToast('A nether fortress looms...');
    }
    if(INFKILL.has(fc.id)||bossAlive('infernis',fc.id))continue;
    spawnMob('infernis',fc.cx+0.5,27.2,fc.cz+0.5);
    entities[entities.length-1].cellId=fc.id;
    for(let i=0;i<3;i++)spawnMob('imp',fc.cx-3+i*3+0.5,27.2,fc.cz-3+0.5);
    showToast('INFERNIS stirs within the keep.');
  }
}
function processAether(dt){
  if(DIM!=='aether'||!P||P.dead||frameCount%30!==0)return;
  const gx=Math.floor(P.x/144),gz=Math.floor(P.z/144);
  for(let ix=gx-1;ix<=gx+1;ix++)for(let iz=gz-1;iz<=gz+1;iz++){
    const sc=asCell(ix,iz);
    if(!sc)continue;
    if(Math.hypot(sc.cx+0.5-P.x,sc.cz+0.5-P.z)>44)continue;
    if(!chunkAt(sc.cx,sc.cz))continue;
    if(!ASEEN.has(sc.id)){
      ASEEN.add(sc.id);
      setBlock(sc.cx+2,sc.y+1,sc.cz,B.CHEST);dimLoot(sc.cx+2,sc.y+1,sc.cz,true);
      showToast('An aether shrine hums above the void...');
    }
    if(VALKILL.has(sc.id)||bossAlive('valkyra',sc.id))continue;
    spawnMob('valkyra',sc.cx+0.5,sc.y+2,sc.cz+0.5);
    entities[entities.length-1].cellId=sc.id;
    for(let i=0;i<2;i++)spawnMob('cherub',sc.cx-2+i*4+0.5,sc.y+1.2,sc.cz+2.5);
    showToast('VALKYRA descends to defend her shrine.');
  }
}
function randGadget(){return GADGET_IDS[(Math.random()*GADGET_IDS.length)|0];}
