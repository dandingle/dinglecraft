/* ---- PART 57: m1_world.js ---- */
/* ===================================================================== */
/* PART 57 m1 (M1): THE BITE · the live world (bible 3.5, 3.7, 8.0, 15). */
/* Every block he writes goes through ONE queue of at most 250 cells a   */
/* frame (m0's mgWrite underneath): his bites and rubble (world.eat /    */
/* put, high priority), the door, the table clearing, anyone's placed    */
/* block torn out after 3 s (2 s in an inhale), liquids slurped after    */
/* 1 s, and the re-derivations: world.reset (a death, a leave, a reload: */
/* the round's start layout, every site edit purged) and world.layout    */
/* (the transitions L0 -> L1 -> L2 -> L3 -> Ldead, staged in order).     */
/* A queued write is skipped if the cell changed since it was queued     */
/* (theirs wins). "Clean" writes leave the cell exactly as the generator */
/* stamps it (no edit, protected as generated); his bites keep an edit   */
/* + MGF.own + MG1.his so they stay his until the next reset.            */
/* Item: [x, y, z, id, from, tag, clean]                                 */
/* ===================================================================== */
function mg1Busy(){return MG1.qLoI<MG1.qLo.length;}                            /* a re-derivation is still writing */
function mg1QHi(x,y,z,id,from,tag,clean){MG1.qHi.push([x,y,z,id,from,tag,clean?1:0]);}
/* one write: true when it changed the world */
function mg1Write(it){const x=it[0],y=it[1],z=it[2],id=it[3];
  if(DIM!=='over'||y<0||y>=WH)return false;
  const ch=chunkAt(x,z);if(!ch)return false;
  const lx=x-ch.cx*CH,lz=z-ch.cz*CH,i=bidx(lx,y,lz),cur=ch.bl[i],lk=lx+','+y+','+lz,bk=bkey(x,y,z);
  if(cur!==it[4])return false;                                                 /* somebody changed it since: theirs wins */
  let clean=!!it[6];
  if(it[5]==='food'||it[5]==='table'){const t=mg1Target(x,y,z);clean=t===B.AIR;}   /* a foreign block goes back to what was there before it */
  if(cur!==id){const be=blockEnts.get(bk);if(be)mg1SpillBE(bk,be,x,y,z);mgWrite(x,y,z,id);}
  MG1.seen.delete(bk);                                                         /* a block placed here again is a new meal */
  if(clean){ch.edits.delete(lk);MGF.own.delete(bk);MG1.his.delete(bk);}
  else{MG1.his.set(bk,id);MGF.own.add(bk);}
  if(cur!==id){MG1.wrote++;MG1.frameW++;mg1FxWrite(it,cur);return true;}
  return false;}
/* drain both queues: high priority first, never more than M1_QMAX cells a frame (MG1.over staggers a transition over seconds) */
function mg1Drain(dt){MG1.frameW=0;const max=MG_K.M1_QMAX;let guard=0;
  while(MG1.qHi.length&&MG1.frameW<max&&guard++<4000)mg1Write(MG1.qHi.shift());
  if(mg1Busy()){let budget=max-MG1.frameW;
    if(MG1.over>0)budget=Math.min(budget,Math.max(1,Math.ceil(MG1.qLoN*dt/MG1.over)));
    const stop=MG1.frameW+budget;
    while(MG1.qLoI<MG1.qLo.length&&MG1.frameW<stop&&guard++<6000)mg1Write(MG1.qLo[MG1.qLoI++]);
    if(!mg1Busy()){MG1.qLo=[];MG1.qLoI=0;MG1.qLoN=0;MG1.over=0;}}
  MG1.maxFrame=Math.max(MG1.maxFrame,MG1.frameW);}

/* ---- the re-derivation: the site back to layout L (purge every site edit, queue every difference) ---- */
var MG1_ORDER={
  iris:(a,b)=>Math.atan2(a[2]-MGC.BZ,a[0]-MGC.BX)-Math.atan2(b[2]-MGC.BZ,b[0]-MGC.BX),               /* the Cap peels round the ring */
  L2:(a,b)=>mg1Rank2(a)-mg1Rank2(b),                                                                 /* refill under the dust, then the three chunks one after another */
  L3:(a,b)=>Math.hypot(a[0]-MGC.BX,a[2]-MGC.BZ)-Math.hypot(b[0]-MGC.BX,b[2]-MGC.BZ),                  /* the centre comes out, then the cracks race outward */
  Ldead:(a,b)=>(a[3]===B.AIR?0:1)-(b[3]===B.AIR?0:1)||a[1]-b[1]};                                    /* the islands re-form, the burial piles up */
var MG1_STAGE={L1:1.2,L2:2.0,L3:1.5,Ldead:3.0};                                                      /* seconds (the climb-out's three chunks, the cracks, the burial) */
function mg1Rank2(it){if(it[3]!==B.AIR)return 0;const dx=it[0]-MGC.BX,dz=it[2]-MGC.BZ;            /* cottage (150), pen (270), grove (30) */
  for(const [i,o] of [[1,1],[2,2],[0,3]]){const p=MG1_PL[i];if(Math.abs(dx-p[0])<=4&&Math.abs(dz-p[1])<=4)return o;}return 0;}
function mg1Derive(L,o){o=o||{};if(MG1_LAYOUTS.indexOf(L)<0)return 0;
  if(DIM!=='over'){MG1.L=L;MG1.qLo=[];MG1.qLoI=0;MG1.qLoN=0;MG1.over=0;MG1.qHi=[];                  /* called from another dimension: the overworld chunks are */
    for(const k of MGS){const ed=chunkEdits.get(k);if(!ed||!ed.size)continue;const cc=k.split(','),bx=+cc[0]*CH,bz=+cc[1]*CH;   /* unloaded, so purging the edits is */
      for(const lk of [...ed.keys()]){const p=lk.split(','),x=bx+ +p[0],y=+p[1],z=bz+ +p[2];if(!mgSiteCell(x,y,z))continue;ed.delete(lk);   /* the whole reset */
        const bk=x+','+y+','+z;MGF.own.delete(bk);MG1.his.delete(bk);const be=blockEnts.get(bk);if(be)mg1SpillBE(bk,be,x,y,z);}}
    MG1.derives++;MG1.lastDerive={L,prev:L,n:0,tag:(o.tag||'derive')+':away',t:MGF.clock};return 0;}
  const g=mg1Geo(),prev=MG1.L,items=new Map(),key=(x,y,z)=>x+','+y+','+z;MG1.L=L;
  const add=(x,y,z,id,cur)=>{items.set(key(x,y,z),[x,y,z,id,cur,o.tag||'derive',1]);};
  const genC=new Map(),target=(x,y,z,k,cx,cz,lx,lz)=>{let t=mg1Target(x,y,z,L,g);
    if(t<0){let gg=genC.get(k);if(!gg){gg=genChunk(cx,cz);genC.set(k,gg);}t=gg[bidx(lx,y,lz)];}return t;};
  for(let i=MG1.qLoI;i<MG1.qLo.length;i++){const it=MG1.qLo[i],ch=chunkAt(it[0],it[2]);if(!ch)continue;   /* unwritten items of an earlier derive: re-aimed */
    const cx=ch.cx,cz=ch.cz,lx=it[0]-cx*CH,lz=it[2]-cz*CH,cur=ch.bl[bidx(lx,it[1],lz)],t=target(it[0],it[1],it[2],ckey(cx,cz),cx,cz,lx,lz);
    if(t!==cur)add(it[0],it[1],it[2],t,cur);}
  for(const k of MGS){const ed=chunkEdits.get(k);if(!ed||!ed.size)continue;                       /* 1. every site edit is purged */
    const cc=k.split(','),cx=+cc[0],cz=+cc[1],bx=cx*CH,bz=cz*CH,ch=chunks.get(k);
    for(const lk of [...ed.keys()]){const p=lk.split(','),lx=+p[0],y=+p[1],lz=+p[2],x=bx+lx,z=bz+lz;if(!mgSiteCell(x,y,z))continue;
      ed.delete(lk);const bk=bkey(x,y,z);MGF.own.delete(bk);MG1.his.delete(bk);
      if(!ch){const be=blockEnts.get(bk);if(be)mg1SpillBE(bk,be,x,y,z);continue;}
      const cur=ch.bl[bidx(lx,y,lz)],t=target(x,y,z,k,cx,cz,lx,lz);if(t!==cur)add(x,y,z,t,cur);}}
  if(L!==prev||o.full)mg1DiffBox(L,g,(x,y,z,want,cur)=>add(x,y,z,want,cur));                      /* 2. a new layout: every difference in the disc */
  const a=[...items.values()];const ord=typeof o.order==='function'?o.order:MG1_ORDER[o.order||L];
  if(ord&&L!==prev)a.sort(ord);
  const stage=L!==prev&&o.tag!=='reset'&&o.tag!=='sync'?(MG1_STAGE[L]||0):0;              /* a real transition is staged over its beat */
  MG1.qLo=a;MG1.qLoI=0;MG1.qLoN=a.length;MG1.over=o.instant?0:(o.over!=null?Math.max(0,+o.over||0):stage);
  MG1.derives++;MG1.lastDerive={L,prev,n:a.length,tag:o.tag||'derive',t:MGF.clock};
  if((L==='L2'||L==='L3'||L==='Ldead')&&(prev==='L0'||prev==='L1'))for(const e of mg1PenCows(g))removeEnt(e);   /* the Pen goes with whatever cows are left */
  if(L!=='L0'&&MG1.eye.ent){removeEnt(MG1.eye.ent);MG1.eye.ent=null;}
  return a.length;}
/* the door (bible 8.0): the stair's steps 0-2 (and their rails) gone while a round is live, whole while he waits */
function mg1Door(open){const g=mg1Geo(),c=MG1_C2;let n=0;if(DIM!=='over')return 0;
  for(let dx=-30;dx<=-24;dx++)for(let dz=-2;dz<=2;dz++){mg1Col(dx,dz,c,g);if(!c.door)continue;const wx=MGC.BX+dx,wz=MGC.BZ+dz;
    if(!chunkAt(wx,wz))continue;
    for(let y=g.F-3;y<=g.F+4;y++){const cur=getBlock(wx,y,wz);
      if(!open){if(cur!==B.AIR){mg1QHi(wx,y,wz,B.AIR,cur,'door',0);n++;}}
      else{const t=mg1In(MG1.L,c,y,g,wx,wz);if(t>=0&&t!==cur){mg1QHi(wx,y,wz,t,cur,'doorup',1);n++;}}}}
  MG1.doorOpen=!!open;return n;}
/* every block in the volume that is not his: placed by anyone (Dan, a bot, a Husk), liquids included */
function mg1Foreign(fn){for(const k of MGS){const ed=chunkEdits.get(k);if(!ed||!ed.size)continue;const cc=k.split(','),bx=+cc[0]*CH,bz=+cc[1]*CH;
  for(const [lk,id] of ed){if(id===B.AIR)continue;const p=lk.split(','),x=bx+ +p[0],y=+p[1],z=bz+ +p[2];
    if(!mgIn(x+0.5,y,z+0.5))continue;const bk=bkey(x,y,z);if(MG1.his.get(bk)===id)continue;fn(x,y,z,id,bk);}}}
/* the door-shut beat: everything built in advance streams into his mouth (+0 HP) */
function mg1ClearTable(){let n=0;if(DIM!=='over')return 0;mg1Foreign((x,y,z,id,bk)=>{MGF.own.delete(bk);mg1QHi(x,y,z,B.AIR,id,'table',1);n++;});
  MG1.seen.clear();MG1.cleared+=n;return n;}
/* "show me what you built": anyone's block in the volume during a live round glows VIOLET 3 s (2 s in an inhale), then it is torn out
   and flies into his mouth (+2 HP through fight.fed when M2 offers it); water and lava are slurped after 1 s */
function mg1Scan(){const now=MGF.clock,live=new Set();                     /* discovery (every 0.1 s) */
  mg1Foreign((x,y,z,id,bk)=>{live.add(bk);const s=MG1.seen.get(bk);
    if(!s||s.id!==id){MG1.seen.set(bk,{t:now,id,x,y,z,liq:id===B.WATER||id===B.LAVA});MGF.own.delete(bk);}});
  for(const bk of [...MG1.seen.keys()])if(!live.has(bk))MG1.seen.delete(bk);}
function mg1Due(){if(!MG1.seen.size)return;const now=MGF.clock,F=MGREG.fight;let inh=false;try{inh=!!(F&&F.inhaling&&F.inhaling());}catch(err){}   /* deadlines (every frame) */
  for(const s of MG1.seen.values()){if(s.q)continue;const delay=s.liq?MG_K.M1_SLURP:(inh?MG_K.M1_EAT_INHALE:MG_K.M1_EAT);
    if(now-s.t>=delay-1e-6){s.q=1;mg1QHi(s.x,s.y,s.z,B.AIR,s.id,'food',1);}}}
/* what a write looks like: debris and void decals for his bites, the throw into his mouth for food (rate-limited) */
function mg1FxWrite(it,old){const tag=it[5],x=it[0]+0.5,y=it[1]+0.5,z=it[2]+0.5;
  if(tag==='derive'||tag==='reset'||tag==='layout'||tag==='doorup')return;
  if(tag==='food'||tag==='table'){if(old===B.WATER||old===B.LAVA){MG1.slurped++;if(MG1.fxF++<10){burstParticles(x,y,z,B.CLOUDSTONE,4,0.5);playSAt('burp',x,y,z);}return;}
    MG1.eaten++;const f=MGREG.fight;if(tag==='food'&&f&&f.fed)try{f.fed('block',2,it[0],it[1],it[2]);}catch(err){mgFail('fed',err);}
    if(MG1.fxF++<12){const b=MGF.boss&&!MGF.boss.dead?MGF.boss:null,X=MGREG.fx;
      if(X&&!X.stub&&X.burst)try{X.burst('eat',x,y,z,{id:old,to:b?[b.x,b.y+(b.h||14)*0.75,b.z]:[MGC.X,mgF()+6,MGC.Z]});}catch(err){mgFail('m1-fx',err);}
      else burstParticles(x,y,z,old,4,0.7);
      playSAt('eat',x,y,z);}
    return;}
  if(old!==B.AIR&&it[3]===B.AIR){mg1Decal(it[0],it[1],it[2]);if(MG1.fxF++<14)burstParticles(x,y,z,old,3,0.6);}}
/* ---- pooled visuals (lazy, never at load; disposed on reset and when Dan goes far) ---- */
function mg1Decal(x,y,z){if(MG1.decal.length>=32){const d=MG1.decal.find(q=>!q.live);if(!d)return;mg1DecalSet(d,x,y,z);return;}
  if(!MG1.decalM)MG1.decalM={g:new THREE.BoxGeometry(1.02,1.02,1.02),m:new THREE.MeshBasicMaterial({color:0x000000})};
  const m=new THREE.Mesh(MG1.decalM.g,MG1.decalM.m);m.userData.hr=1;m.castShadow=false;m.receiveShadow=false;const d={m,live:0};MG1.decal.push(d);mg1DecalSet(d,x,y,z);}
function mg1DecalSet(d,x,y,z){d.live=1;d.t=0;d.x=x;d.y=y;d.z=z;d.m.position.set(x+0.5,y+0.5,z+0.5);d.m.visible=true;if(!d.m.parent)scene.add(d.m);}
function mg1Glows(dt){const want=[];if(MGF.live)for(const s of MG1.seen.values())if(!s.liq&&!s.q)want.push(s);
  want.sort((a,b)=>a.t-b.t);const n=Math.min(32,want.length);
  if(n&&!MG1.glowM){MG1.glowM={g:new THREE.BoxGeometry(1.08,1.08,1.08),m:new THREE.MeshBasicMaterial({color:0x9a3cff,transparent:true,opacity:0.35,depthWrite:false})};
    if(THREE.AdditiveBlending!==undefined)MG1.glowM.m.blending=THREE.AdditiveBlending;}
  while(MG1.glow.length<n){const m=new THREE.Mesh(MG1.glowM.g,MG1.glowM.m);m.userData.hr=1;m.castShadow=false;m.receiveShadow=false;MG1.glow.push(m);}   /* no shadow rule in Hyperreal */
  const now=MGF.clock;if(MG1.glowM)MG1.glowM.m.opacity=0.22+0.16*Math.sin(now*9);
  for(let i=0;i<MG1.glow.length;i++){const m=MG1.glow[i];
    if(i<n){const s=want[i],age=now-s.t,j=age>MG_K.M1_EAT-1?0.05*Math.sin(now*61+i):0.015*Math.sin(now*23+i);   /* it shudders, harder at the end */
      m.position.set(s.x+0.5+j,s.y+0.5,s.z+0.5-j);m.visible=true;if(!m.parent)scene.add(m);}
    else if(m.parent){m.visible=false;m.parent.remove(m);}}}
function mg1Decals(dt){for(const d of MG1.decal){if(!d.live)continue;d.t+=dt;const ch=chunkAt(d.x,d.z);
  if(d.t>0.6||!ch||!ch.dirty){d.live=0;d.m.visible=false;if(d.m.parent)d.m.parent.remove(d.m);}}}   /* until its chunk remeshes */
function mg1Dispose(){for(const m of MG1.glow)if(m.parent)m.parent.remove(m);for(const d of MG1.decal)if(d.m.parent)d.m.parent.remove(d.m);
  if(MG1.glowM){MG1.glowM.g.dispose&&MG1.glowM.g.dispose();MG1.glowM.m.dispose&&MG1.glowM.m.dispose();}
  if(MG1.decalM){MG1.decalM.g.dispose&&MG1.decalM.g.dispose();MG1.decalM.m.dispose&&MG1.decalM.m.dispose();}
  MG1.glow=[];MG1.decal=[];MG1.glowM=null;MG1.decalM=null;}

/* ---- world.tick (from tickMalg, overworld, within 220 m of C) ---- */
function mg1Tick(dt){if(DIM!=='over'||!P)return;
  const g=mg1Geo();MG1.fxF=0;
  if(!mg1Busy()&&!CUT.on&&MG1.L!==mg1Want()){MG1.syncs++;mg1Derive(mg1Want(),{tag:'sync'});}      /* the layout follows the checkpoint (M2 may stage it) */
  if(MGF.live){MG1.scanT-=dt;if(MG1.scanT<=0){MG1.scanT=0.1;mg1Scan();}mg1Due();}else if(MG1.seen.size)MG1.seen.clear();
  mg1Drain(dt);
  if(MGF.d<MGC.R_SPAWN+20){mg1EyeTick(dt,g);mg1Offer(g);mg1PlateWake();}
  else if(MG1.eye.ent){removeEnt(MG1.eye.ent);MG1.eye.ent=null;}
  mg1Cows(dt,g);mg1Chew(dt,g);mg1Dragon(g);mg1BotRescue(dt,g);
  MG1.orphT-=dt;if(MG1.orphT<=0){MG1.orphT=2;if(!DEMON.dead&&MGF.d<MGC.R_GRADE)mg1Orphans();}
  mg1DeliverSpill();
  mg1Glows(dt);mg1Decals(dt);}
function mg1Reset(round,o){o=o||{};MG1.seen.clear();MG1.eye.n=0;MG1.doorOpen=true;     /* world.reset: the round's start layout, behind dust or the death screen */
  return mg1Derive(mg1LayoutFor(round==null?MALG.round:round),Object.assign({tag:'reset'},o,{full:o.full}));}
function mg1Layout(name,o){o=o||{};if(MG1_LAYOUTS.indexOf(name)<0)return 0;return mg1Derive(name,Object.assign({tag:'layout'},o));}
/* a new world, a load, Dan far away (m0 lists) */
MGREG.onReset.push(function(){mg1Dispose();
  Object.assign(MG1,{L:'L0',geo:null,qHi:[],qLo:[],qLoI:0,qLoN:0,over:0,his:new Map(),seen:new Map(),spill:[],doorOpen:true,lastDerive:null,cowT:0,chewT:3,orphT:0,
    eye:{p1:-99,n:0,shut:0,blood:0,ent:null,clack:-99,ring:0,blinkT:3,blink:0}});});
MGREG.onLoad.push(function(d){MG1.geo=null;MG1.L=mg1Want();});
MGREG.onFar.push(function(){mg1Dispose();if(MG1.eye.ent){removeEnt(MG1.eye.ent);MG1.eye.ent=null;}MG1.seen.clear();});

/* ---- the registry (plan 5.1) ---- */
MGREG.stamp=mg1Stamp;
MGREG.layoutAt=function(x,y,z){return mg1Target(x|0,y|0,z|0);};
MGREG.world={
  tick:mg1Tick,
  eat:function(x,y,z,how){x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);if(DIM!=='over'||!mgSiteCell(x,y,z)||!chunkAt(x,z))return false;   /* his bites */
    const cur=getBlock(x,y,z);if(cur===B.AIR||(cur===B.BEDROCK&&how!=='topple'))return false;mg1QHi(x,y,z,B.AIR,cur,how||'eat',0);return true;},   /* bedrock only when a spire topples */
  put:function(x,y,z,id){x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);if(DIM!=='over'||!mgSiteCell(x,y,z)||!chunkAt(x,z))return false;  /* his rubble */
    const cur=getBlock(x,y,z);if(cur===id||cur===B.BEDROCK)return false;mg1QHi(x,y,z,id,cur,'put',0);return true;},
  reset:mg1Reset,layout:mg1Layout,
  capOpen:function(o){return mg1Layout('L1',Object.assign({order:'iris',over:1.2},o||{}));},
  door:mg1Door,clearTable:mg1ClearTable,
  finish:function(){MG1.over=0;},                                                                     /* a skipped scene: the world change jumps to its end (<= 250 cells a frame) */
  safeCell:mg1SafeCell,bonePile:mg1BonePile,
  egg:mg1Egg,poke:mg1Poke,
  protect:null,placeOK:mg1PlaceOK,grapNo:null,
  L:function(){return MG1.L;},busy:mg1Busy,stand:function(x,z){return mg1Stand(Math.floor(x),Math.floor(z));},
  cows:function(){return mg1PenCows(mg1Geo());},
  eye:function(){return MG1.eye.ent&&!MG1.eye.ent.dead?MG1.eye.ent:null;}};
MGEX.mg1Stamp=mg1Stamp;MGEX.getMG1=()=>MG1;MGEX.mg1Col=function(dx,dz){return Object.assign({},mg1Col(dx,dz,{},mg1Geo()));};
MGEX.mg1In=function(L,x,y,z){const g=mg1Geo(),c=mg1Col(x-MGC.BX,z-MGC.BZ,{},g);return c.zone===1?mg1In(L,c,y,g,x,z):mg1Target(x,y,z,L,g);};
MGEX.mg1Target=mg1Target;MGEX.mg1Geo=mg1Geo;MGEX.mg1Want=mg1Want;MGEX.mg1Derive=mg1Derive;MGEX.mg1SafeCell=mg1SafeCell;MGEX.mg1BonePile=mg1BonePile;
MGEX.mg1Busy=mg1Busy;MGEX.mg1Drain=mg1Drain;MGEX.mg1Stand=mg1Stand;
