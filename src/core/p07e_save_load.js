/* ----- save / load (format v1, see header) ----- */
const WORLD={name:'world'};
/* When the artifact storage API is absent (file:// / plain hosting), back it with localStorage */
if(typeof window!=='undefined'&&!window.storage){
  try{
    const LS=window.localStorage;
    if(LS){
      window.storage={
        async get(k){const v=LS.getItem('vx_'+k);return v==null?null:{key:k,value:v};},
        async set(k,v){LS.setItem('vx_'+k,v);return {key:k,value:v};},
        async delete(k){LS.removeItem('vx_'+k);return {key:k,deleted:true};},
        async list(pf){const keys=[];for(let i=0;i<LS.length;i++){const kk=LS.key(i);
          if(kk&&kk.indexOf('vx_'+(pf||''))===0)keys.push(kk.slice(3));}return {keys};}
      };
    }
  }catch(e){}
}
function storageOK(){return typeof window!=='undefined'&&window.storage&&typeof window.storage.set==='function';}
async function setLastWorld(n){try{await window.storage.set('vxwlast',n);}catch(e){}}
async function getLastWorld(){try{const r=await window.storage.get('vxwlast');return r&&r.value;}catch(e){return null;}}
function snapshot(name){
  const edits={};
  for(const [k,ed] of chunkEdits){
    if(!ed.size)continue;
    if(MGS.has(k)){const om=mgEditsSave(k,ed);if(om)edits[k]=om;continue;}
    const o={};for(const [lk,id] of ed)o[lk]=id;
    edits[k]=o;
  }
  const be={};
  for(const [k,b] of blockEnts)be[k]=b;
  const ents=[];
  for(const e of entities){
    if(e.dead)continue;
    if(e.t==='mob'&&MOBT[e.mt].pmob){mpSnapMob(e,ents);continue;}
    if(e.t==='mob'&&MOBT[e.mt].mg)continue;
    if(e.t==='mob'&&!e.bot){
      const o={t:e.mt,x:+e.x.toFixed(2),y:+e.y.toFixed(2),z:+e.z.toFixed(2),hp:e.hp};
      if(e.mt==='alien'){o.nm=e.name;o.rel=Math.round(e.rel);o.rom=e.rom;
        o.md=e.mood==='h'?'h':'c';o.hx=Math.round(e.hx);o.hz=Math.round(e.hz);}
      if(MOBT[e.mt].fly){o.tm=e.tame?1:0;o.fed=e.fed||0;o.ang=e.angry?1:0;
        o.hx=Math.round(e.hx);o.hy=Math.round(e.hy);o.hz=Math.round(e.hz);}
      ents.push(o);
    }
    else if(e.t==='subb'){
      const dj=s=>({t:'drop',x:+e.x.toFixed(2),y:+e.y.toFixed(2),z:+e.z.toFixed(2),
        id:s.id,count:s.count||1,dur:s.dur,
        ...(s.mob?{mob:s.mob}:{}),...(s.ench?{ench:s.ench}:{})});
      ents.push(dj(e.st));
      if(e.loot)for(const s of e.loot)ents.push(dj(s));
    }
    else if(e.t==='drop'||e.t==='ball')ents.push({t:'drop',x:+e.x.toFixed(2),y:+e.y.toFixed(2),z:+e.z.toFixed(2),
      id:e.st.id,count:e.st.count||1,dur:e.st.dur,
      ...(e.st.mob?{mob:e.st.mob}:{}),...(e.st.ench?{ench:e.st.ench}:{})});
    else if(e.t==='car'||e.t==='skate'||e.t==='cart'||e.t==='boat'||e.t==='plane')ents.push({t:e.t,x:+e.x.toFixed(2),y:+e.y.toFixed(2),z:+e.z.toFixed(2),
      hp:e.hp,yaw:+e.yaw.toFixed(2)});
  }
  return {f:SAVE_FORMAT,v:GAME_VERSION,name,seed:SEED,mode:P.mode,
    time:+(timeOfDay%1).toFixed(4),
    dim:DIM,
    snl:SNL_ON?1:0,
    nukes:NUKES.map(n=>[n.x,n.y,n.z,n.d==='nether'?1:(n.d==='aether'?2:(n.d==='puppet'?3:0))]),
    player:{x:+P.x.toFixed(2),y:+P.y.toFixed(2),z:+P.z.toFixed(2),
      yaw:+P.yaw.toFixed(3),pitch:+P.pitch.toFixed(3),hp:P.hp,hunger:P.hunger,sel:P.sel,
      spawn:P.spawn.map(v=>+v.toFixed(1)),
      inv:P.inv.map(s=>s?{id:s.id,count:s.count,...(s.dur!=null?{dur:s.dur}:{}),...(s.mob?{mob:s.mob}:{}),...(s.ench?{ench:s.ench}:{})}:0),
      stox:{bal:+(P.stox?P.stox.bal:0).toFixed(4),
        sh:Object.fromEntries(Object.entries(P.stox?P.stox.sh:{}).filter(e=>e[1]>1e-9).map(e=>[e[0],+e[1].toFixed(6)])),
        cb:Object.fromEntries(Object.entries((P.stox&&P.stox.cb)||{}).filter(e=>e[1]>1e-9).map(e=>[e[0],+e[1].toFixed(4)]))},
      xp:Math.round(P.xp||0),
      armor:(P.armor||[]).map(a=>a?{id:a.id,...(a.dur!=null?{dur:a.dur}:{})}:0),
      db:Math.round(P.db||0),own:(P.own||[]).slice(),
      cos:{hat:P.cos&&P.cos.hat||null,trail:P.cos&&P.cos.trail||null},
      bp:P.bp?1:0,bpl:P.bpLvl|0,cmp:P.cmpT||0,pcmp:P.pcmpT||0,
      pow:{u:{...(P.pow&&P.pow.u||{})},a:{...(P.pow&&P.pow.a||{})}}},
    market:{p:Object.fromEntries(STOX.map(s=>[s,+MKT.p[s].toFixed(3)])),
      mu:Object.fromEntries(STOX.map(s=>[s,+MKT.mu[s].toFixed(6)]))},
    vseen:[...VSEEN],
    nseen:[...NSEEN],
    infkill:[...INFKILL],
    valkill:[...VALKILL],
    ...mpSaveFields(),
    aseen:[...ASEEN],
    pseen:[...PSEEN],
    wdseen:[...WDSEEN],
    lsseen:[...LSSEEN],
    rseen:[...RSEEN],
    demon:{ay:DEMON.ay,cs:DEMON.cutSeen?1:0,dead:DEMON.dead?1:0},
    ...mgSaveFields(),
    gr:{...GR},
    ...crSaveFields(),
    bots:agSnapshot(),
    spw:[...SPW.keys()],
    edits,be,ents};
}
function resetWorld(){
  agReset();
  DIM='over';
  SNL=null;SNL_ON=false;
  NUKES.length=0;NARM.e=null;NARM.t=0;nukeHud(-1);
  for(const k2 in ENT_STASH)delete ENT_STASH[k2];
  NCOLM.clear();ACOLM.clear();mpReset();
  closeModal(true);
  for(const ch of chunks.values())disposeChunkMeshes(ch);
  chunks.clear();chunkEdits.clear();blockEnts.clear();torches.clear();COLM.clear();
  crReset();
  initMarket();
  VSEEN.clear();VLAY.clear();VPEND.length=0;VB=null;
  NSEEN.clear();NPEND.length=0;ASEEN.clear();APEND.length=0;INFKILL.clear();VALKILL.clear();
  PSEEN.clear();PLAY_.clear();PPEND.length=0;
  WDSEEN.clear();WDLAY.clear();WDPEND.length=0;
  LSSEEN.clear();LSPEND.length=0;
  RSEEN.clear();RPEND.length=0;TITQ.length=0;
  Object.assign(GR,GR_DEF());
  DEMON.ay=0;DEMON.cutSeen=false;DEMON.dead=false;DEMON.toasted=false;
  mgReset();
  CUT.on=false;WIN.open=false;WIN.pend=0;winOpen=false;
  SPW.clear();
  if(enchOpen)closeEnch();
  if(dselOpen)closeDSel();
  if(dlgOpen)closeDlg();
  if(casOpen)closeCas();
  bjReset();
  hrClearCorpses();
  for(const e of entities)removeEnt(e);
  entities.length=0;
  disasterHardReset();
  MINE.active=false;MINE.prog=0;cursorStack=null;hurtFlash=0;
}
function applySave(d){
  if(!d||d.f==null||!d.player)throw new Error('bad save');
  if(d.f>SAVE_FORMAT)showToast('Save is from a newer version — trying anyway');
  resetWorld();
  crLoad(d);
  SEED=d.seed|0;
  mgLoad(d);
  timeOfDay=+d.time||0.3;
  const dd=typeof mpDimAlias==='function'?mpDimAlias(d.dim):d.dim;        /* Release 1.0: the old purgatory key loads as 'puppet' */
  DIM=(dd==='nether'||dd==='aether'||dd==='puppet')?dd:'over';
  SNL=null;SNL_ON=!!d.snl;
  NUKES.length=0;
  for(const a of (d.nukes||[]))NUKES.push({x:a[0],y:a[1],z:a[2],d:a[3]===1?'nether':(a[3]===2?'aether':(a[3]===3?'puppet':'over'))});
  for(const k in (d.edits||{})){
    const m=new Map();
    const kd=(k[1]===';')?k.slice(0,2):'';
    const ck=(kd?k.slice(2):k).split(',');
    for(const lk in d.edits[k]){
      const id=d.edits[k][lk]|0;
      m.set(lk,id);
      if(isTorch(id)){
        const p=lk.split(',');
        torches.add(kd+(+ck[0]*CH+ +p[0])+','+(+p[1])+','+(+ck[1]*CH+ +p[2]));
      }
    }
    chunkEdits.set(k,m);
  }
  for(const k in (d.be||{})){
    const b=d.be[k];
    if(b.t==='chest'){b.inv=(b.inv||[]).slice(0,27);while(b.inv.length<27)b.inv.push(null);}
    blockEnts.set(k,b);
  }
  const pl=d.player;
  P=newPlayer(pl.spawn&&pl.spawn.length===3?pl.spawn:[pl.x,pl.y,pl.z]);
  P.x=pl.x;P.y=pl.y;P.z=pl.z;P.yaw=pl.yaw||0;P.pitch=pl.pitch||0;
  P.hp=pl.hp!=null?pl.hp:20;P.hunger=pl.hunger!=null?pl.hunger:20;P.sel=pl.sel|0;
  P.mode=d.mode==='c'?'c':'s';
  P.inv=(pl.inv||[]).slice(0,36).map(s=>s?{id:s.id,count:s.count,...(s.dur!=null?{dur:s.dur}:{}),...(s.mob?{mob:s.mob}:{}),...(s.ench?{ench:{...s.ench}}:{})}:null);
  P.stox={bal:(pl.stox&&+pl.stox.bal)||0,sh:stoxMigrate((pl.stox&&pl.stox.sh)?{...pl.stox.sh}:{}),
    cb:stoxMigrate((pl.stox&&pl.stox.cb)?{...pl.stox.cb}:{})};
  P.xp=Math.max(0,Math.round(+pl.xp||0));
  P.armor=(pl.armor||[0,0,0,0]).slice(0,4).map(a=>a?{id:a.id,...(a.dur!=null?{dur:a.dur}:{})}:null);
  while(P.armor.length<4)P.armor.push(null);
  P.db=Math.max(0,Math.round(+pl.db||0));
  P.own=Array.isArray(pl.own)?pl.own.slice():[];
  P.cos={hat:pl.cos&&pl.cos.hat||null,trail:pl.cos&&pl.cos.trail||null};
  P.bp=!!pl.bp;P.bpLvl=pl.bpl|0;P.bpT=P.bp?180:0;
  P.cmpT=pl.cmp||null;P.pcmpT=pl.pcmp||null;
  P.pow={u:{...(pl.pow&&pl.pow.u||{})},a:{...(pl.pow&&pl.pow.a||{})}};
  VSEEN.clear();for(const v of (d.vseen||[]))VSEEN.add(v);
  NSEEN.clear();NPEND.length=0;for(const v of (d.nseen||[]))NSEEN.add(v);
  INFKILL.clear();for(const v of (d.infkill||[]))INFKILL.add(v);
  VALKILL.clear();for(const v of (d.valkill||[]))VALKILL.add(v);
  mpLoad(d.mp,d.stash);
  ASEEN.clear();APEND.length=0;for(const v of (d.aseen||[]))ASEEN.add(v);
  PSEEN.clear();for(const v of (d.pseen||[]))PSEEN.add(v);
  WDSEEN.clear();for(const v of (d.wdseen||[]))WDSEEN.add(v);
  LSSEEN.clear();for(const v of (d.lsseen||[]))LSSEEN.add(v);
  RSEEN.clear();for(const v of (d.rseen||[]))RSEEN.add(v);
  Object.assign(GR,GR_DEF(),d.gr||{});
  if(typeof grApplyUI==='function')grApplyUI();
  if(d.demon){DEMON.ay=d.demon.ay||0;DEMON.cutSeen=!!d.demon.cs;DEMON.dead=!!d.demon.dead;}
  else{DEMON.ay=0;DEMON.cutSeen=false;DEMON.dead=false;}
  mgLoadDemon(d);
  if(typeof hnTrunkMigrate==='function')hnTrunkMigrate();
  DEMON.toasted=DEMON.dead;
  SPW.clear();for(const k of (d.spw||[]))SPW.set(k,1+Math.random()*2);
  if(d.market&&d.market.p){
    const mp=stoxMigrate(d.market.p),mmu=d.market.mu?stoxMigrate(d.market.mu):null;
    for(const s of STOX){
      if(mp[s]!=null)MKT.p[s]=+mp[s];
      if(mmu&&mmu[s]!=null)MKT.mu[s]=+mmu[s];
      MKT.h[s]=[MKT.p[s]];
    }
  }
  while(P.inv.length<36)P.inv.push(null);
  for(const e of (d.ents||[])){
    if(e.t==='drop')spawnDrop(e.x,e.y,e.z,{id:e.id,count:e.count,dur:e.dur,...(e.mob?{mob:e.mob}:{})},0,0,0);
    else if(e.t==='car'){
      spawnCar(e.x,e.y,e.z,e.yaw||0);
      const c=entities[entities.length-1];
      if(e.hp!=null)c.hp=e.hp;
    }
    else if(e.t==='skate'){
      spawnSkate(e.x,e.y,e.z,e.yaw||0);
      const c=entities[entities.length-1];
      if(e.hp!=null)c.hp=e.hp;
    }
    else if(e.t==='cart'){
      spawnCart(e.x,e.y,e.z,e.yaw||0);
      const c=entities[entities.length-1];
      if(e.hp!=null)c.hp=e.hp;
    }
    else if(e.t==='boat'){
      spawnBoat(e.x,e.y,e.z,e.yaw||0);
      const c=entities[entities.length-1];
      if(e.hp!=null)c.hp=e.hp;
    }
    else if(e.t==='plane'){
      spawnPlane(e.x,e.y,e.z,e.yaw||0);
      const c=entities[entities.length-1];
      if(e.hp!=null)c.hp=e.hp;
    }
    else if(MOBT[e.t]&&!MOBT[e.t].mg){
      spawnMob(e.t,e.x,e.y,e.z);
      const m=entities[entities.length-1];
      if(e.hp!=null)m.hp=e.hp;
      if(e.t==='alien'){
        if(e.nm)m.name=e.nm;
        m.rel=e.rel||0;m.rom=e.rom||0;
        m.mood=e.md==='h'?'h':'c';
        if(e.hx!=null){m.hx=e.hx;m.hz=e.hz;}
      }
      if(MOBT[e.t].fly){
        m.tame=!!e.tm;m.fed=e.fed||0;m.angry=!!e.ang;
        if(e.hx!=null){m.hx=e.hx;m.hy=e.hy!=null?e.hy:m.hy;m.hz=e.hz;}
      }
    }
  }
  agRestore(d);
}
async function saveToStorage(name,quiet){
  if(!playing)return false;
  const j=JSON.stringify(snapshot(name));
  if(j.length>4.5e6&&!quiet)showToast('World save is getting large ('+(j.length/1e6).toFixed(1)+' MB)');
  if(!storageOK()){if(!quiet)showToast('No save storage here — use Export instead');return false;}
  try{
    const r=await window.storage.set('vxw:'+name,j);
    if(!quiet)showToast(r?'World saved':'Save failed — try Export');
    return !!r;
  }catch(e){if(!quiet)showToast('Save failed — try Export');return false;}
}
async function listWorlds(){
  if(!storageOK())return null;
  try{
    const r=await window.storage.list('vxw:');
    return r&&r.keys?r.keys.map(k=>k.slice(4)):[];
  }catch(e){return [];}
}
async function loadWorldByName(name){
  try{
    const r=await window.storage.get('vxw:'+name);
    if(!r)throw 0;
    applySave(JSON.parse(r.value));
    WORLD.name=name;
    enterGame();
  }catch(e){showToast('Could not load "'+name+'"');}
}
function exportWorld(){
  const j=JSON.stringify(snapshot(WORLD.name));
  const bl=new Blob([j],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(bl);
  a.download=(WORLD.name||'world').replace(/[^\w-]+/g,'_')+'.vxw.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  showToast('World exported');
}
function importWorldFile(file){
  const fr=new FileReader();
  fr.onload=()=>{
    try{
      const d=JSON.parse(fr.result);
      applySave(d);
      WORLD.name=d.name||file.name.replace(/\.vxw\.json$|\.json$/,'');
      if(storageOK())saveToStorage(WORLD.name,true); /* imported worlds are remembered too */
      enterGame();
    }catch(e){showToast('Import failed: not a valid world file');}
  };
  fr.readAsText(file);
}
