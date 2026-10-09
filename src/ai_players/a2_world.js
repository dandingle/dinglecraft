
/* ----- world presence: data-only chunk tickets around each agent ----- */
/* A real server keeps chunks loaded around every player. The engine only
   loads around Dan, so each agent holds a small square of chunk DATA (no
   meshes) that the unloader leaves alone. Structures generated in those
   chunks are deferred until Dan gets close — otherwise their mobs would
   spawn and be despawned at once, leaving villages empty for good. */
const TICKETS=new Map();     /* ckey -> expiry (AG_T) */
const TICKET_Q=[];           /* [cx,cz] waiting to be generated */
const DEFER=[];              /* {q:array, v:entry} structure spawns on hold */
function ticketHeld(k){const t=TICKETS.get(k);return t!==undefined&&t>AG_T;}
function ticketCreateChunk(cx,cz){
  const qs=[VPEND,PPEND,WDPEND,LSPEND,RPEND];
  const n0=qs.map(q=>q.length);
  const ch=createChunk(cx,cz);
  for(let i=0;i<qs.length;i++){
    const q=qs[i];
    while(q.length>n0[i]){const v=q.pop();DEFER.push({q,v});}
  }
  return ch;
}
function tickTickets(dt){
  if(!AG_ACTIVE)return;
  const live=agOnlineInDim();
  if(frameCount%15===0){
    for(const a of live){
      if(a.dead)continue;
      const r=TICKETS.size>150?1:2;
      const acx=Math.floor(a.x/CH),acz=Math.floor(a.z/CH);
      for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
        const k=ckey(acx+dx,acz+dz);
        TICKETS.set(k,AG_T+20);
        if(!chunks.has(k)&&!TICKET_Q.some(q=>q[0]===acx+dx&&q[1]===acz+dz))
          TICKET_Q.push([acx+dx,acz+dz,Math.abs(dx)+Math.abs(dz)]);
      }
    }
    TICKET_Q.sort((p,q)=>p[2]-q[2]);
    for(const [k,t] of TICKETS)if(t<=AG_T)TICKETS.delete(k);
  }
  if(TICKET_Q.length){
    const c=TICKET_Q.shift();
    if(!chunks.has(ckey(c[0],c[1])))ticketCreateChunk(c[0],c[1]);
  }
  if(frameCount%60===0&&DEFER.length&&P&&DIM==='over'){
    const lim=(RD+1)*CH;
    for(let i=DEFER.length-1;i>=0;i--){
      const d=DEFER[i];
      if(Math.hypot(d.v.cx-P.x,d.v.cz-P.z)<lim){d.q.push(d.v);DEFER.splice(i,1);}
    }
  }
}

/* ----- who built what: block ownership + grief detection ----- */
const OWN_NAMES=['Dan'].concat(AG_ORDER);
var BOWN=new Map();          /* bkey -> owner index into OWN_NAMES */
var OWNC=new Map();          /* "dim|cx8,cz8" -> {o:[n..], y0,y1} */
let OWN_SEEDED=false,_structCache=null,_structT=-99;
const GRIEFQ=new Map();      /* "victim|actor" -> {n,x,z,y} */
function ownIdx(n){return OWN_NAMES.indexOf(n);}
function ownCellKey(x,z){return DIM+'|'+(x>>3)+','+(z>>3);}
function ownCellAdd(x,y,z,oi,d){
  const k=ownCellKey(x,z);let c=OWNC.get(k);
  if(!c){if(d<0)return;c={o:[0,0,0,0],y0:y,y1:y};OWNC.set(k,c);}
  c.o[oi]=Math.max(0,c.o[oi]+d);
  if(d>0){if(y<c.y0)c.y0=y;if(y>c.y1)c.y1=y;}
  if(c.o[0]+c.o[1]+c.o[2]+c.o[3]===0)OWNC.delete(k);
  _structCache=null;
}
const OWN_SKIP=new Set();    /* ids that never count as built (liquids, fire...) */
function ownTrack(x,y,z,old,id){
  const k=bkey(x,y,z);
  const prev=BOWN.get(k);
  const solidNew=id!==B.AIR&&id!==B.WATER&&id!==B.LAVA&&!OWN_SKIP.has(id);
  if(prev!==undefined&&(!solidNew||ACTOR)){
    BOWN.delete(k);ownCellAdd(x,y,z,prev,-1);
    if(ACTOR&&ACTOR!==OWN_NAMES[prev]&&!solidNew)griefNote(OWN_NAMES[prev],ACTOR,x,y,z);
  }
  if(solidNew&&ACTOR){
    const oi=ownIdx(ACTOR);
    if(oi>=0){BOWN.set(k,oi);ownCellAdd(x,y,z,oi,1);}
  }
}
function griefNote(victim,actor,x,y,z){
  const k=victim+'|'+actor;
  let g=GRIEFQ.get(k);
  if(!g){g={n:0,x,y,z,t:AG_T};GRIEFQ.set(k,g);}
  g.n++;g.x=x;g.y=y;g.z=z;
}
function flushGrief(){
  for(const [k,g] of GRIEFQ){
    if(AG_T-g.t<3.5)continue;
    GRIEFQ.delete(k);
    const [victim,actor]=k.split('|');
    agOnGriefed(victim,actor,g.n,g.x,g.z);
  }
}
/* seed Dan's builds from the world's edit log. Runs on EVERY join: anything Dan built while the AI
   players were switched off is his too (it is not a quarry), and bot blocks that are gone stop counting. */
const NATURALISH=new Set();
function ownSeedFromEdits(){
  OWN_SEEDED=true;
  const savedDim=DIM;DIM='over';            /* ownership cells are keyed by dimension */
  try{
    if(savedDim==='over'){
      const gone=[];
      for(const [k,o] of BOWN){
        if(k.indexOf(';')>=0)continue;
        const p=k.split(',');const x=+p[0],y=+p[1],z=+p[2];
        if(!chunkAt(x,z))continue;
        const id=getBlock(x,y,z);
        if(id===B.AIR||id===B.WATER||id===B.LAVA)gone.push([k,x,y,z,o]);
      }
      for(const [k,x,y,z,o] of gone){BOWN.delete(k);ownCellAdd(x,y,z,o,-1);}
    }
    for(const [ck,ed] of chunkEdits){
      if(keyDim(ck)!=='over')continue;
      const p=keyCore(ck).split(',');const cx=+p[0],cz=+p[1];
      for(const [lk,id] of ed){
        if(id===B.AIR||id===B.WATER||id===B.LAVA||NATURALISH.has(id))continue;
        const q=lk.split(',');const x=cx*CH+ +q[0],y=+q[1],z=cz*CH+ +q[2];
        const k=x+','+y+','+z;
        if(BOWN.has(k))continue;
        BOWN.set(k,0);ownCellAdd(x,y,z,0,1);
      }
    }
  }finally{DIM=savedDim;}
}
/* clusters of owned cells -> named places ("Dan's base") */
function agStructs(){
  if(_structCache&&AG_T-_structT<5)return _structCache;
  const cells=[];
  for(const [k,c] of OWNC){
    const bar=k.indexOf('|');if(k.slice(0,bar)!==DIM)continue;
    const p=k.slice(bar+1).split(',');
    let best=0;for(let i=1;i<4;i++)if(c.o[i]>c.o[best])best=i;
    const tot=c.o[0]+c.o[1]+c.o[2]+c.o[3];
    if(tot<5)continue;
    cells.push({gx:+p[0],gz:+p[1],o:best,n:tot,mine:c.o.slice(),y0:c.y0,y1:c.y1});
  }
  const seen=new Set(),out=[];
  const at=new Map(cells.map(c=>[c.gx+','+c.gz,c]));
  for(const c of cells){
    const ck=c.gx+','+c.gz;if(seen.has(ck))continue;
    const grp=[],st=[c];seen.add(ck);
    while(st.length){const q=st.pop();grp.push(q);
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
        const nk=(q.gx+dx)+','+(q.gz+dz);const nc=at.get(nk);
        if(nc&&!seen.has(nk)&&nc.o===c.o){seen.add(nk);st.push(nc);}
      }}
    let n=0,sx=0,sz=0,y0=99,y1=0;const by=[0,0,0,0];
    for(const g of grp){n+=g.n;sx+=(g.gx*8+4)*g.n;sz+=(g.gz*8+4)*g.n;y0=Math.min(y0,g.y0);y1=Math.max(y1,g.y1);
      for(let i=0;i<4;i++)by[i]+=g.mine[i];}
    if(n<12)continue;
    out.push({owner:OWN_NAMES[c.o],x:Math.round(sx/n),z:Math.round(sz/n),n,y0,y1,by,cells:grp.length});
  }
  out.sort((a,b)=>b.n-a.n);
  const cnt={};
  for(const s of out){cnt[s.owner]=(cnt[s.owner]||0)+1;
    s.name=s.owner+"'s "+(cnt[s.owner]===1?'base':'build #'+cnt[s.owner]);}
  _structCache=out;_structT=AG_T;
  return out;
}
function structsOf(name){return agStructs().filter(s=>s.owner===name);}
function mainBase(name){const s=structsOf(name);return s.length?s[0]:null;}

/* world spawn (the "server spawn"), independent of beds */
let _wspawn=null;
function worldSpawn(){if(!_wspawn)_wspawn=findSpawn();return _wspawn;}
/* feet height for a safe spawn at x,z, or null: real blocks when loaded (trees, builds, pits) */
function agSpotY(x,z){
  if(DIM==='puppet')return purgSpotY(x,z);
  const ci=colInfo(x,z);
  if(!chunkAt(x,z))return ci.h>=SEA+1&&ci.b!==BIOME.OCEAN?ci.h+1:null;
  const y=surfaceTop(x,z),id=getBlock(x,y,z);
  if(y<=SEA-1||isLeafId(id)||id===B.CACTUS||id===B.TNT||(DEFS[id]&&DEFS[id].hurts))return null;
  for(let k=1;k<=2;k++){const b=getBlock(x,y+k,z);
    if(b===B.WATER||b===B.LAVA||(b!==B.AIR&&DEFS[b]&&DEFS[b].solid!==false))return null;}
  return y+1;
}
function agFindSpot(cx,cz,r0,r1){
  for(let i=0;i<60;i++){
    const ang=Math.random()*Math.PI*2,d=r0+Math.random()*(r1-r0)*Math.min(1,0.4+i/30);
    const x=Math.floor(cx+Math.sin(ang)*d),z=Math.floor(cz+Math.cos(ang)*d);
    const y=agSpotY(x,z);
    if(y!=null)return [x+0.5,y+0.05,z+0.5];
  }
  const x=Math.floor(cx),z=Math.floor(cz);
  return [x+0.5,(chunkAt(x,z)?surfaceTop(x,z):(DIM==='puppet'?mpSurf(x,z):colInfo(x,z).h))+1.05,z+0.5];
}
