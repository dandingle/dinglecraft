/* ---- PART 56: c0_contract.js ---- */
/* ===================================================================== */
/* PART 56 — THE CREATIVITY UPDATE (v6.2). c0 contract (lead). c1 paintings, c2 music */
/* ===================================================================== */
/* FROZEN after Build S0 (the creativity build plan, section 3): additive changes only, through the lead.
   Load rules (plan section 1): PART 56 runs after PARTs 1-53 and BEFORE PART 55 (Puppet Purgatory) and PART 54 (texture packs).
   At top level it may use PARTs 1-53 only: MP, PREG, PGEX, TP, TPEX and every hr* name are runtime-only and typeof-guarded.
   No Math.random, Date.now, performance.now, fetch or THREE constructor at top level, and nothing at all on a per-frame path
   while no creativity block entity exists and no editor is open (og_trace's nocrea parity session digests both builds).
   Tiles are registered at boot (crTiles, from hook C0-01 at the top of buildAtlas), AFTER every PART's top-level tile() calls,
   so the purgatory slots 222-284 never move; our painters are seeded by tile NAME, so a slot shift never changes a pixel. */
const CREX={crStubs:''};CREX.__crx=CREX;           /* spread FIRST into window.__vox (PGEX, TPEX and core keys win). Every
   _stub/c<d>_stub.js does CREX.crStubs+='<d>'; real package files never touch it (suites skip checks that need a stubbed package) */

/* ---- ids (plan 2.1; the only place symbolic creativity ids are assigned). 212 stays undefined (lootFill's latent id),
   248/249 stay purgatory's spares (p_static asserts it), 217-219 are this update's spares. ---- */
Object.assign(B,{CR_EASEL:213,CR_DECK:214,CR_JUKE:215,CR_PAINT:216});
/* works are DYNAMIC item ids: work n (1..MAXN) is item CRC.ID0+n, its def is synthesised from the saved registry CRW (plan 4) */
const CRC=Object.freeze({ID0:10000,MAXN:9999,MAX_WORKS:256,MAX_BYTES:600000,MAX_D:Object.freeze({art:7000,song:6000}),
  SIZES:Object.freeze([[64,64],[128,64],[64,128]]),PXB:32,TITLE:24,JUKE_R:32,SWEEP:0.5,
  FN:Object.freeze([[1,0],[-1,0],[0,1],[0,-1]])}); /* FN[f]: outward normal (x,z) of facing f: 0 +x, 1 -x, 2 +z, 3 -z */
var CR_BET=Object.assign(Object.create(null),{crease:B.CR_EASEL,crdeck:B.CR_DECK,crjuke:B.CR_JUKE,crpaint:B.CR_PAINT}); /* BE type -> block */
var CR_KIND=Object.assign(Object.create(null),{easel:'crease',deck:'crdeck',juke:'crjuke',paint:'crpaint'});           /* def.cr -> BE type */

/* ---- saved state (plan 4.3): the registry CRW (n -> record) and the next serial CRN, written as save.cr only when non-empty.
   record = {k:'art'|'song', st:'wip'|'done', t:title, by:author, w,h (art: pixels), d:payload (C1/C2-owned, plain JSON), u:edits} */
var CRW={},CRN=1;
var CRSZ=new Map();                                /* n -> JSON length of the record (running byte budget, never saved) */
var CRBE=new Map();                                /* bkey -> our block entity (index over blockEnts, every dimension; rebuilt at load) */
var crOn='';                                       /* '' | 'paint' | 'music': an editor is open (modalOpen() reads it: hook C0-16) */
var CRF={clock:0,sweepT:0,dim:null,live:false,ctx:null,ask:null,askAuto:null,toast:'',tiled:0,tile0:-1,gc:0,fails:{},css:{}};
/* ---- registries (packages register at THEIR top level; c0 dispatches) ---- */
var CRREG={ui:{},thumb:{},mesh:{},tile:{},tick:[],onBE:[],onWork:[],onReset:[],onLoad:[],onDim:[],onJuke:[]};
/* ui[kind]   = {open(ctx), close(force), key(e,isEsc)->bool}  kind 'paint' (C1) | 'music' (C2); ctx = crCtx(...)
   thumb[k]   = (rec,g,size) paints a size x size item icon for a work kind 'art' (C1) | 'song' (C2)
   mesh[crm]  = (bufs,lx,y,lz,d,gb,ch,be)->bool chunk special mesher for def.crm 'easel' | 'paint' (C1); false = fall through
   tile[name] = (c,R) painter body for one of CR_TILES (C1: cr_easel_*, cr_canvas, cr_c1*; C2: cr_deck_*, cr_juke_*, cr_c2*)
   tick       = f(dt) every unpaused frame while anything creative exists (CRF.live) or an editor is open
   onBE       = f(key,be,op) op 'add'|'del'      onWork = f(n,rec,op) op 'new'|'edit'|'done'|'del'|'load'
   onReset    = f() world reset (dispose meshes, stop voices)   onLoad = f() after a save is applied   onDim = f(dim)
   onJuke     = f(key,be,op) op 'play'|'stop' (C2 is declarative from the BEs anyway; this is the immediate nudge) */

/* ---- tiles (plan 2.3): registered at boot, in this order, right after the last tile any PART registered ---- */
var CR_TILES=['cr_easel_s','cr_easel_t','cr_canvas','cr_deck_t','cr_deck_s','cr_deck_b','cr_juke_t','cr_juke_s','cr_juke_b',
  'cr_c1a','cr_c1b','cr_c2a','cr_c2b'];
function crHash(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function crTiles(){if(CRF.tiled)return;CRF.tiled=1;CRF.tile0=_tn;for(const n of CR_TILES)tile(n,c=>crTilePaint(n,c));}
function crTilePaint(n,c){const f=CRREG.tile[n]||CR_TDEF[n];if(f)f(c,mulberry32(crHash(n)));}
function crWood(c,R,col){fillN(c,R,col||'#9a6a36',.09);c.fillStyle=shade(col||'#9a6a36',-.22);for(let y=3;y<16;y+=5)c.fillRect(0,y,16,1);}
var CR_TDEF={
  cr_easel_s:(c,R)=>{c.clearRect(0,0,16,16);const W='#8a5b2d',D='#5e3c1c';
    for(let y=1;y<16;y++){const o=Math.round((15-y)*0.22);px(c,4-o+1,y,y<3?D:W);px(c,11+o-1,y,y<3?D:W);}
    px(c,7,0,D);px(c,8,0,D);for(let y=1;y<4;y++){px(c,7,y,W);px(c,8,y,W);}
    c.fillStyle='#cfc4a8';c.fillRect(3,3,10,8);c.fillStyle='#f4eedc';c.fillRect(4,4,8,6);
    c.fillStyle='#7fb3e0';c.fillRect(4,4,8,3);c.fillStyle='#5aa04a';c.fillRect(4,7,8,3);px(c,10,5,'#ffd84a');px(c,6,7,'#3f7f35');
    c.fillStyle=D;c.fillRect(2,11,12,1);c.fillStyle=W;c.fillRect(2,12,12,1);},
  cr_easel_t:(c,R)=>crWood(c,R,'#8a5b2d'),
  cr_canvas:(c,R)=>{fillN(c,R,'#efe7d2',.04);c.fillStyle='rgba(120,100,70,.10)';for(let i=0;i<16;i+=2){c.fillRect(i,0,1,16);c.fillRect(0,i,16,1);}},
  cr_deck_t:(c,R)=>{crWood(c,R,'#7a4e26');c.fillStyle='#1b1b1f';c.beginPath();c.arc(7.5,8.5,6,0,7);c.fill();
    c.strokeStyle='#2c2c33';c.lineWidth=1;c.beginPath();c.arc(7.5,8.5,4,0,7);c.stroke();c.fillStyle='#c8322e';c.fillRect(6,7,3,3);
    px(c,7,8,'#f0d060');c.fillStyle='#c9ccd2';for(let i=0;i<6;i++)px(c,14-i,2+i,'#c9ccd2');px(c,14,1,'#8a8d93');px(c,15,1,'#8a8d93');},
  cr_deck_s:(c,R)=>{crWood(c,R,'#7a4e26');c.fillStyle='#2a1a0c';c.fillRect(2,5,12,7);c.fillStyle='#3a2a18';
    for(let y=6;y<11;y+=2)for(let x=3;x<13;x+=2)c.fillRect(x,y,1,1);px(c,13,13,'#d8c070');px(c,11,13,'#d8c070');},
  cr_deck_b:(c,R)=>crWood(c,R,'#5e3c1c'),
  cr_juke_t:(c,R)=>{crWood(c,R,'#6e4420');c.fillStyle='#d8b040';c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);c.fillRect(0,0,1,16);c.fillRect(15,0,1,16);
    c.fillStyle='#120c08';c.fillRect(3,7,10,2);c.fillStyle='#2a1e14';c.fillRect(3,9,10,1);},
  cr_juke_s:(c,R)=>{crWood(c,R,'#6e4420');c.fillStyle='#d8b040';c.fillRect(1,1,14,1);c.fillRect(1,14,14,1);
    c.fillStyle='#1d140c';c.fillRect(3,3,10,9);c.fillStyle='#43301c';for(let y=4;y<11;y+=2)for(let x=4;x<12;x+=2)c.fillRect(x,y,1,1);
    c.fillStyle='#e05a3a';c.fillRect(7,12,2,1);},
  cr_juke_b:(c,R)=>crWood(c,R,'#4a2c14'),
  cr_c1a:c=>c.clearRect(0,0,16,16),cr_c1b:c=>c.clearRect(0,0,16,16),cr_c2a:c=>c.clearRect(0,0,16,16),cr_c2b:c=>c.clearRect(0,0,16,16)};

/* ---- blocks (plan 2.1). Every block carries cr:<kind> and interact:'crea' (bots' nBreakable skips interact blocks; living
   blocks skip them too). The painting cell is hidden (never in the creative palette, never an item). ---- */
def(B.CR_EASEL,{name:'Easel',tiles:{top:'cr_easel_t',side:'cr_easel_s',bot:'cr_easel_t'},hard:1,toolClass:'axe',
  solid:true,opq:false,bucket:'cut',cross:true,crm:'easel',interact:'crea',cr:'easel'});   /* cross: icon, hand and the stub render */
def(B.CR_DECK,{name:'Record Player',tiles:{top:'cr_deck_t',side:'cr_deck_s',bot:'cr_deck_b'},hard:1.5,toolClass:'axe',interact:'crea',cr:'deck'});
def(B.CR_JUKE,{name:'Jukebox',tiles:{top:'cr_juke_t',side:'cr_juke_s',bot:'cr_juke_b'},hard:1.5,toolClass:'axe',interact:'crea',cr:'juke'});
def(B.CR_PAINT,{name:'Hung Painting',tiles:'cr_canvas',hard:0.3,solid:false,opq:false,bucket:'cut',drop:null,hide:true,
  crm:'paint',interact:'crea',cr:'paint'});
/* ---- recipes (plan 2.4): overworld RECIPES (purgatory's modal uses PRECIPES inside, so they never show or craft there) ---- */
var CR_RECIPE_N=RECIPES.length;
R([' S ','SWS','S S'],{S:IT.STICK,W:B.WOOL},B.CR_EASEL,1);          /* a stick frame holding a wool canvas */
R(['SIS','PPP'],{S:IT.STICK,I:IT.IRON,P:'planks'},B.CR_DECK,1);     /* a tonearm over a plank box */
R(['PPP','PDP','PPP'],{P:'planks',D:IT.DIAMOND},B.CR_JUKE,1);       /* the classic: eight planks around a diamond */
CR_RECIPE_N=RECIPES.length-CR_RECIPE_N;

/* ---- helpers ---- */
function crToast(t){CRF.toast=t;try{showToast(t);}catch(e){}}
function crFail(where,err){if(CRF.fails[where])return;CRF.fails[where]=1;try{console.warn('[CR] '+where,err);}catch(e){}}
function crEmit(list,a,b,c){const L=CRREG[list];for(let i=0;i<L.length;i++){try{L[i](a,b,c);}catch(err){crFail(list,err);}}}
function crTitle(s){return String(s==null?'':s).replace(/[\u0000-\u001f\u007f<>&"\\`]/g,'').replace(/\s+/g,' ').trim().slice(0,CRC.TITLE);}
function crCSS(id,css){if(CRF.css[id])return;CRF.css[id]=1;try{if(typeof document==='undefined'||!document.head||typeof document.head.appendChild!=='function')return;
  const s=document.createElement('style');s.id=id;s.textContent=css;document.head.appendChild(s);}catch(e){}}

/* ---- the registry (plan 4) ---- */
function crItemId(n){return CRC.ID0+n;}
function crWorkN(id){if(typeof id!=='number')return 0;const n=id-CRC.ID0;return n>0&&n<=CRC.MAXN&&CRW[n]?n:0;}
function crRec(n){return (n&&CRW[n])||null;}
function crRecOf(st){return st?crRec(crWorkN(st.id)):null;}
function crDLen(d){return d==null?0:(typeof d==='string'?d.length:JSON.stringify(d).length);}
function crSz(n){if(CRW[n])CRSZ.set(n,JSON.stringify(CRW[n]).length+8);else CRSZ.delete(n);}
function crBytes(){let b=24;for(const v of CRSZ.values())b+=v;return b;}
function crName(r){const x='\u00d7';
  if(r.k==='art')return r.st==='done'?'Painting: '+r.t:'Unfinished Canvas ('+r.w+x+r.h+')';
  return r.st==='done'?'Music Disc: '+r.t:'Demo Tape';}
function crThumbDef(r,g,s){g.clearRect(0,0,s,s);
  if(r.k==='art'){g.fillStyle='#6e4420';g.fillRect(s*.1,s*.1,s*.8,s*.8);g.fillStyle='#efe7d2';g.fillRect(s*.17,s*.17,s*.66,s*.66);
    if(r.st!=='done'){g.fillStyle='#8a8070';g.fillRect(s*.3,s*.45,s*.4,s*.06);}}
  else{g.fillStyle='#16161a';g.beginPath();g.arc(s/2,s/2,s*.4,0,7);g.fill();g.fillStyle=r.st==='done'?'#'+(0x400000+crHash(r.t||'?')%0xbfffff).toString(16).slice(-6):'#9a9a9a';
    g.beginPath();g.arc(s/2,s/2,s*.14,0,7);g.fill();g.fillStyle='#000';g.fillRect(s/2-1,s/2-1,2,2);}}
function crIcon(r){const cv=document.createElement('canvas');cv.width=cv.height=48;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  try{(CRREG.thumb[r.k]||crThumbDef)(r,g,48);}catch(e){crFail('thumb '+r.k,e);try{crThumbDef(r,g,48);}catch(e2){}}return cv;}
/* (re)build the synthetic def + icon of work n; never in the creative palette (hide), always stack:1, never a block */
function crDefSync(n){const id=crItemId(n),r=CRW[n];
  delete ICONS[id];if(ICONTEX[id]){try{if(ICONTEX[id].map)ICONTEX[id].map.dispose();ICONTEX[id].dispose();}catch(e){}delete ICONTEX[id];}
  if(typeof handKind!=='undefined'&&handKind===id)handKind=-2;
  if(!r){delete DEFS[id];return;}
  DEFS[id]={item:true,name:crName(r),stack:1,hide:true,icon:'cr_canvas',crw:n,crk:r.k,crst:r.st};
  ICONS[id]=crIcon(r);}
function crNew(k,init){init=init||{};
  if(k!=='art'&&k!=='song')return 0;
  if(Object.keys(CRW).length>=CRC.MAX_WORKS){crToast('Your gallery is full ('+CRC.MAX_WORKS+' works in this world).');return 0;}
  if(CRN>CRC.MAXN){crToast('This world has made too many works. Impressive. Also: no more.');return 0;}
  const r={k,st:'wip',t:'',by:'',d:init.d==null?null:init.d,u:0};
  if(k==='art'){if(!CRC.SIZES.some(s=>s[0]===init.w&&s[1]===init.h))return 0;r.w=init.w;r.h=init.h;}
  if(crDLen(r.d)>CRC.MAX_D[k]){crToast('Too much detail to save.');return 0;}
  if(crBytes()+JSON.stringify(r).length+8>CRC.MAX_BYTES){crToast('Your gallery is full (this world keeps '+(CRC.MAX_BYTES/1000)+' KB of art and music).');return 0;}
  const n=CRN++;CRW[n]=r;crSz(n);crDefSync(n);crEmit('onWork',n,r,'new');return n;}
function crSetData(n,d){const r=CRW[n];if(!r||r.st!=='wip')return false;          /* finished works are immutable */
  if(crDLen(d)>CRC.MAX_D[r.k]){crToast('Too much detail to save: undo a little.');return false;}
  const old=r.d;r.d=d;const was=CRSZ.get(n)||0;crSz(n);
  if(crBytes()>CRC.MAX_BYTES&&(CRSZ.get(n)||0)>was){r.d=old;crSz(n);crToast('Your gallery is full: this edit cannot be saved.');return false;}
  r.u=(r.u|0)+1;delete ICONS[crItemId(n)];ICONS[crItemId(n)]=crIcon(r);crEmit('onWork',n,r,'edit');return true;}
function crFinish(n,title,by){const r=CRW[n];if(!r||r.st!=='wip')return null;
  r.st='done';r.t=crTitle(title)||(r.k==='art'?'Untitled':'Untitled Song');r.by=crTitle(by)||'Dan';
  crSz(n);crDefSync(n);crEmit('onWork',n,r,'done');return {id:crItemId(n),count:1};}
/* a placeholder for a work id with no record (crLoad): never a real work (crWorkN stays 0, nothing can hang, play or edit it), but a
   real def, so inventories, chests, drops and the hand never meet an undefined def; it keeps crw so bots and the despawn leave it be */
var CRLOST=new Set();
function crLostPaint(g){g.fillStyle='#6e4420';g.fillRect(1,1,14,14);g.fillStyle='#9a9286';g.fillRect(3,3,10,10);g.fillStyle='#3f3a34';
  g.fillRect(6,4,4,1);g.fillRect(5,5,2,2);g.fillRect(9,5,2,2);g.fillRect(8,7,2,1);g.fillRect(7,8,2,2);g.fillRect(7,11,2,1);}
function crLostDef(n){const id=crItemId(n);CRLOST.add(n);delete ICONS[id];
  DEFS[id]={item:true,name:'Lost Work (an older version forgot it)',stack:1,hide:true,icon:'cr_canvas',crw:n,crk:'lost',crst:'lost',ipaint:crLostPaint};}
function crDiscard(n){const r=CRW[n];if(!r||r.st!=='wip')return false;delete CRW[n];crSz(n);crDefSync(n);crEmit('onWork',n,r,'del');return true;}
function crStats(){let art=0,song=0,wip=0;for(const k in CRW){const r=CRW[k];if(r.k==='art')art++;else song++;if(r.st==='wip')wip++;}
  return {works:art+song,art,song,wip,bytes:crBytes(),next:CRN,be:CRBE.size,gc:CRF.gc};}

/* ---- giving, taking, dropping work stacks (works are consumed and returned in EVERY game mode: they are 1/1) ---- */
function crGiveDan(st,x,y,z){const s={id:st.id,count:st.count||1};const left=invAddTo(P.inv,s);
  if(left>0)spawnDrop(x!=null?x:P.x,y!=null?y:P.y+1,z!=null?z:P.z,{id:s.id,count:left},0,1.5,0);redrawHotbar();return left;}
function crTakeHeld(st){for(let i=0;i<P.inv.length;i++)if(P.inv[i]===st){P.inv[i]=null;break;}redrawHotbar();}
function crSpawnWork(id,x,y,z,nx,nz){if(!crWorkN(id))return;spawnDrop(x,y,z,{id,count:1},(nx||0)*1.2+(Math.random()-0.5)*0.8,2.2,(nz||0)*1.2+(Math.random()-0.5)*0.8);}
/* bots never hold works (hooks C0-11/12): agGive refuses them, agTryPickup leaves their drops alone */
function crBotNo(st){const d=st&&DEFS[st.id];return !!(d&&d.crw);}
function crKeepDrop(e){const d=e&&e.st&&DEFS[e.st.id];return !!(d&&d.crw);}       /* work drops never despawn (hook C0-10) */

/* ---- block entities (plan 5) ---- */
function crIndex(k,be){CRBE.set(k,be);CRF.live=true;crEmit('onBE',k,be,'add');}
function crUnindex(k){const be=CRBE.get(k);if(!be)return;CRBE.delete(k);crEmit('onBE',k,be,'del');}
function crFaceToward(x,z){const dx=P.x-(x+0.5),dz=P.z-(z+0.5);return Math.abs(dx)>Math.abs(dz)?(dx>0?0:1):(dz>0?2:3);}
function crBE(k){const be=blockEnts.get(k);return be&&CR_BET[be.t]?be:null;}
function crEnsureBE(x,y,z,kind){const t=CR_KIND[kind],k=bkey(x,y,z);let be=blockEnts.get(k);
  if(be&&be.t===t){if(!CRBE.has(k))crIndex(k,be);return be;}
  if(be){if(CR_BET[be.t])crOrphan(k,be,'retype');else scatterBE(x,y,z);}      /* a stale BE on this cell spills, never vanishes */
  be=t==='crjuke'?{t,f:crFaceToward(x,z),id:0,s:0}:{t,f:crFaceToward(x,z),id:0};
  blockEnts.set(k,be);crIndex(k,be);return be;}
function crOnPlace(x,y,z,id){const d=DEFS[id];if(!d||!d.cr||d.cr==='paint')return;crEnsureBE(x,y,z,d.cr);}
/* paintings: W x H cells in front of a wall, cell (i,j) = anchor + right*i + up*j, right = (nz,-nx) as the viewer sees it */
function crRight(f){const n=CRC.FN[f];return [n[1],-n[0]];}
function crFaceOf(nx,nz){return nx===1?0:nx===-1?1:nz===1?2:nz===-1?3:-1;}
function crCellsAt(ax,ay,az,f,w,h){const r=crRight(f),o=[];for(let j=0;j<h;j++)for(let i=0;i<w;i++)o.push([ax+r[0]*i,ay+j,az+r[1]*i,i,j]);return o;}
function crPaintCells(be){const a=be.a.split(',').map(Number);return crCellsAt(a[0],a[1],a[2],be.f,be.w,be.h);}
function crWallOK(x,y,z){const id=getBlock(x,y,z),d=DEFS[id];return !!(d&&d.solid!==false&&d.opq&&!d.cr&&!d.door&&id!==B.AIR);}
function crPaintLoaded(be){const n=CRC.FN[be.f];for(const c of crPaintCells(be))if(!chunkAt(c[0],c[2])||!chunkAt(c[0]-n[0],c[2]-n[1]))return false;return true;}
function crPaintSupported(be){const n=CRC.FN[be.f];for(const c of crPaintCells(be))if(!crWallOK(c[0]-n[0],c[1],c[2]-n[1]))return false;return true;}
function crPaintFits(ax,ay,az,f,w,h){const n=CRC.FN[f];
  for(const c of crCellsAt(ax,ay,az,f,w,h)){if(c[1]<1||c[1]>=WH-2||!chunkAt(c[0],c[2]))return false;
    if(getBlock(c[0],c[1],c[2])!==B.AIR||!crWallOK(c[0]-n[0],c[1],c[2]-n[1]))return false;
    if(DIM==='puppet'&&typeof mpPlaceOK==='function'&&!mpPlaceOK(c[0],c[1],c[2],B.CR_PAINT))return false;}
  return true;}
/* the painted surface for meshes and tests: centre (world), outward normal, right vector, size in blocks */
function crPaintGeom(be){const a=be.a.split(',').map(Number),n=CRC.FN[be.f],r=crRight(be.f),e=0.03;
  const along=(ac,nc,rc,w)=>nc!==0?(nc>0?ac+e:ac+1-e):(rc!==0?ac+0.5+rc*(w-1)/2:ac+0.5);
  return {x:along(a[0],n[0],r[0],be.w),y:a[1]+be.h/2,z:along(a[2],n[1],r[1],be.w),nx:n[0],nz:n[1],rx:r[0],rz:r[1],w:be.w,h:be.h,f:be.f,id:be.id};}
function crHang(ax,ay,az,f,w,h,st){const a=ax+','+ay+','+az,id=st.id;
  for(const c of crCellsAt(ax,ay,az,f,w,h)){const k=bkey(c[0],c[1],c[2]),be={t:'crpaint',id,f,a,i:c[3],j:c[4],w,h};
    blockEnts.set(k,be);crIndex(k,be);setBlock(c[0],c[1],c[2],B.CR_PAINT);}
  crTakeHeld(st);playS('place');P.swing=1;P.useT=0.3;}
function crPlacePainting(st,hit){const r=crRecOf(st);if(!r||r.k!=='art'||r.st!=='done'||!hit)return false;
  if(hit.ny!==0){crToast('Paintings go on walls.');return true;}
  const f=crFaceOf(hit.nx,hit.nz),W=r.w/CRC.PXB,H=r.h/CRC.PXB,R2=crRight(f),cx=hit.x+hit.nx,cy=hit.y,cz=hit.z+hit.nz;
  const pi=(W-1)>>1,pj=(H-1)>>1,C=[];for(let oj=0;oj<H;oj++)for(let oi=0;oi<W;oi++)C.push([oi,oj,Math.abs(oi-pi)+Math.abs(oj-pj)]);
  C.sort((p,q)=>p[2]-q[2]||p[1]-q[1]||p[0]-q[0]);
  for(const [oi,oj] of C){const ax=cx-R2[0]*oi,ay=cy-oj,az=cz-R2[1]*oi;if(crPaintFits(ax,ay,az,f,W,H)){crHang(ax,ay,az,f,W,H,st);return true;}}
  crToast('Not enough flat wall here: this one needs '+W+'\u00d7'+H+' blocks.');return true;}
/* take a painting down: every cell that still belongs to it goes (BE + block), the work drops ONCE at its centre */
function crRemovePainting(be,drop){const g=crPaintGeom(be);
  for(const c of crPaintCells(be)){const k=bkey(c[0],c[1],c[2]),b=blockEnts.get(k);
    if(b&&b.t==='crpaint'&&b.a===be.a&&b.id===be.id){blockEnts.delete(k);crUnindex(k);if(getBlock(c[0],c[1],c[2])===B.CR_PAINT)setBlock(c[0],c[1],c[2],B.AIR);}}
  if(drop)crSpawnWork(be.id,g.x+g.nx*0.35,g.y-0.3,g.z+g.nz*0.35,g.nx,g.nz);}
/* a block of ours is being broken through breakBlock/agBreakBlock (hook C0-06: scatterBE dispatches here) */
function crScatter(x,y,z,be){const k=bkey(x,y,z);
  if(crOn&&CRF.ctx&&CRF.ctx.bek===k)crUIClose(true);
  if(be.t==='crpaint'){crRemovePainting(be,true);return;}
  if(be.t==='crjuke'&&be.id)crEmit('onJuke',k,be,'stop');
  if(be.id)crSpawnWork(be.id,x+0.5,y+0.6,z+0.5);
  be.id=0;blockEnts.delete(k);crUnindex(k);}
/* the block under one of our BEs is gone or replaced (explosion, nuke, laser, tornado, anything): the work still comes out */
function crOrphan(k,be,why){if(crOn&&CRF.ctx&&CRF.ctx.bek===k)crUIClose(true);
  if(be.t==='crpaint'){crRemovePainting(be,true);if(blockEnts.get(k)===be){blockEnts.delete(k);crUnindex(k);}return;}
  const p=keyCore(k).split(',').map(Number);
  if(be.t==='crjuke'&&be.id)crEmit('onJuke',k,be,'stop');
  if(be.id&&keyDim(k)===DIM)crSpawnWork(be.id,p[0]+0.5,p[1]+0.5,p[2]+0.5);
  else if(be.id)return;                                 /* another dimension: leave it until that dimension is loaded */
  be.id=0;if(blockEnts.get(k)===be)blockEnts.delete(k);crUnindex(k);}
/* one of our BEs left blockEnts behind our back while it held a work (the Big Dingle's crater deletes block entities outright,
   purgatory's wipes and arena resets do too): the work still comes out, once per painting (fix lead, v6.2 review) */
function crLost(k,be){const p=keyCore(k).split(',').map(Number),dm=keyDim(k);
  if(be.t==='crpaint'){const a=be.a,id=be.id;
    for(const [k2,b2] of [...CRBE])if(b2.t==='crpaint'&&b2.a===a&&b2.id===id&&keyDim(k2)===dm&&blockEnts.get(k2)!==b2){
      const q=keyCore(k2).split(',').map(Number);crUnindex(k2);if(b2!==be)b2.id=0;
      if(chunkAt(q[0],q[2])&&getBlock(q[0],q[1],q[2])===B.CR_PAINT)setBlock(q[0],q[1],q[2],B.AIR);}
    crRemovePainting(be,true);be.id=0;return;}
  if(be.t==='crjuke')crEmit('onJuke',k,be,'stop');
  crUnindex(k);crSpawnWork(be.id,p[0]+0.5,p[1]+0.5,p[2]+0.5);be.id=0;}
function crSweep(){
  for(const [k,be] of CRBE){
    if(blockEnts.get(k)!==be){
      if(!be.id||!crWorkN(be.id)){crUnindex(k);continue;}
      if(keyDim(k)!==DIM)continue;                       /* another dimension: it waits until that dimension is loaded */
      const q=keyCore(k).split(',');if(!chunkAt(+q[0],+q[2])||(be.t==='crpaint'&&!crPaintLoaded(be)))continue;
      crLost(k,be);continue;}
    if(keyDim(k)!==DIM)continue;
    const p=keyCore(k).split(','),x=+p[0],y=+p[1],z=+p[2];
    if(!chunkAt(x,z))continue;
    if(be.t==='crpaint'&&!crPaintLoaded(be))continue;   /* a painting across the render edge waits until every cell and wall is loaded */
    if(getBlock(x,y,z)!==CR_BET[be.t]){crOrphan(k,be,'gone');continue;}
    if(be.t==='crpaint'&&be.i===0&&be.j===0&&!crPaintSupported(be))crRemovePainting(be,true);}}

/* ---- right-click (hooks C0-03 interact, C0-04 held work) ---- */
function crCtx(kind,x,y,z,be){return {kind,x,y,z,bek:bkey(x,y,z),be};}
function crCtxRec(ctx){return ctx&&ctx.be?crRec(crWorkN(ctx.be.id)):null;}
function crInteract(hit,hd){const x=hit.x,y=hit.y,z=hit.z,kind=hd.cr,st=heldStack(),r=crRecOf(st);
  if(kind==='paint'){const be=crBE(bkey(x,y,z)),w=be?crRec(crWorkN(be.id)):null;
    crToast(w?'\u201c'+w.t+'\u201d by '+(w.by||'Dan')+' ('+w.w+'\u00d7'+w.h+')':'A painting.');return;}
  const be=crEnsureBE(x,y,z,kind);
  if(be.id&&!crWorkN(be.id))be.id=0;                  /* a record that no longer exists (never expected) */
  if(kind==='juke')return crJukeUse(x,y,z,be,st,r);
  const wk=kind==='easel'?'art':'song';
  if(r&&r.k===wk&&r.st==='done'){crToast(wk==='art'?'That one is finished. Hang it on a wall.':'That one is finished. Play it in a jukebox.');return;}
  if(r&&r.k===wk&&!be.id){be.id=st.id;crTakeHeld(st);playS('place');crToast(wk==='art'?'Back on the easel.':'Back on the record player.');}
  else if(r&&r.k===wk&&be.id){crToast(wk==='art'?'This easel already has a canvas on it.':'This record player already has a song on it.');return;}
  crUIOpen(kind==='easel'?'paint':'music',crCtx(kind==='easel'?'paint':'music',x,y,z,be));}
function crJukeUse(x,y,z,be,st,r){const k=bkey(x,y,z);
  if(be.id){const id=be.id,w=crRec(crWorkN(id));be.id=0;be.s=0;crEmit('onJuke',k,be,'stop');crGiveDan({id,count:1},x+0.5,y+1.1,z+0.5);
    playS('pop');crToast('Ejected '+(w?'\u201c'+w.t+'\u201d':'the disc')+'.');return;}
  if(r&&r.k==='song'&&r.st==='done'){be.id=st.id;be.s=CRF.clock;crTakeHeld(st);crEmit('onJuke',k,be,'play');CRF.live=true;
    playS('place');crToast('Now playing: \u201c'+r.t+'\u201d');return;}
  if(r&&r.k==='song'){crToast('It is a demo. Finish it at a record player first.');return;}
  crToast('Jukebox: right-click it holding a music disc. (Make one at a record player.)');}
function crUseHeld(st,hit){const r=crRecOf(st);if(!r)return false;
  if(r.k==='art'&&r.st==='done')return crPlacePainting(st,hit);
  if(!hit)return false;
  crToast(r.k==='art'?'Put it on an easel to keep painting.':(r.st==='done'?'Play it in a jukebox.':'Put it in a record player to keep working on it.'));
  return true;}
/* editor helpers for C1/C2 (plan 6.1): start, finish or throw away the work on the block the editor is open on */
function crStartWork(ctx,init){if(!ctx||!ctx.be||ctx.be.id)return 0;const n=crNew(ctx.kind==='paint'?'art':'song',init);
  if(n){ctx.be.id=crItemId(n);playS('place');}return n;}
function crEndWork(ctx,title){const n=ctx&&ctx.be?crWorkN(ctx.be.id):0;if(!n)return null;const st=crFinish(n,title,'Dan');if(!st)return null;
  ctx.be.id=0;const r=CRW[n];crGiveDan({id:st.id,count:1},ctx.x+0.5,ctx.y+1.1,ctx.z+0.5);playS('pop');
  crToast((r.k==='art'?'Painting':'Music disc')+' \u201c'+r.t+'\u201d is done. It is the only one there is.');return st;}
function crDropWork(ctx){const n=ctx&&ctx.be?crWorkN(ctx.be.id):0;if(!n||!crDiscard(n))return false;ctx.be.id=0;return true;}

/* ---- the editor shell (plan 6.2): #crpaint / #crmusic overlays (hook C0-22), #crask confirm, keyboard first-dibs (C0-17) ---- */
function crUIOpen(kind,ctx){const ui=CRREG.ui[kind];if(!ui||typeof ui.open!=='function'){crToast('Not built yet.');return false;}
  if(crOn)crUIClose(true);
  if(MODAL.kind)closeModal(true);
  crOn=kind;CRF.ctx=ctx||null;MB.l=MB.r=false;for(const k in KEY)KEY[k]=false;
  try{if(typeof document!=='undefined'&&document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();}catch(e){}
  const el=$('cr'+kind);if(el&&el.style)el.style.display='flex';
  try{ui.open(ctx);}catch(e){crFail('open '+kind,e);crUIClose(true);return false;}
  return true;}
function crUIClose(force){const kind=crOn;if(!kind)return;const ui=CRREG.ui[kind];
  try{if(ui&&ui.close)ui.close(!!force);}catch(e){crFail('close '+kind,e);}
  if(CRF.ask)crAskDone(false,true);
  const el=$('cr'+kind);if(el&&el.style)el.style.display='none';
  crOn='';CRF.ctx=null;
  if(!force&&typeof tryLock==='function')try{tryLock();}catch(e){}}
function crKey(e){if(!crOn)return false;
  if(CRF.ask){if(e.code==='Enter'||e.code==='NumpadEnter'){if(e.preventDefault)e.preventDefault();crAskDone(true);}
    else if(e.code==='Escape'){if(e.preventDefault)e.preventDefault();crAskDone(false);}return true;}
  const t=e.target,typing=!!(t&&t.tagName&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const ui=CRREG.ui[crOn];
  if(e.code==='Escape'){if(e.preventDefault)e.preventDefault();if(typing&&t.blur){t.blur();return true;}
    try{if(ui&&ui.key&&ui.key(e,true))return true;}catch(err){crFail('key',err);}crUIClose();return true;}
  if(typing)return true;                              /* the field gets the key: no shortcuts, no game keys */
  try{if(ui&&ui.key)ui.key(e,false);}catch(err){crFail('key',err);}
  return true;}
/* shared confirm: o={title,text,input:{value,max,ph}|null,ok:'OK',no:'Cancel',onOk(value),onNo()}. CRF.askAuto (tests) answers at once */
function crAsk(o){if(CRF.ask)crAskDone(false,true);
  if(CRF.askAuto){const a=CRF.askAuto(o)||{};try{if(a.ok){if(o.onOk)o.onOk(a.value!=null?a.value:(o.input?o.input.value:''));}else if(o.onNo)o.onNo();}catch(e){crFail('ask',e);}return;}
  CRF.ask=o;const T=(id,v)=>{const el=$(id);if(el)el.textContent=v;};
  T('crasktitle',o.title||'');T('crasktext',o.text||'');T('craskok',o.ok||'OK');T('craskno',o.no||'Cancel');
  const el=$('crask');if(el&&el.style)el.style.display='flex';   /* shown BEFORE the focus: a field in a display:none overlay cannot take it (CZ fix) */
  const inp=$('craskin');if(inp){if(inp.style)inp.style.display=o.input?'block':'none';if(o.input){inp.value=o.input.value||'';inp.maxLength=o.input.max||CRC.TITLE;
    inp.placeholder=o.input.ph||'';try{if(inp.focus)inp.focus();if(inp.select)inp.select();}catch(e){}}}}
function crAskDone(ok,silent){const o=CRF.ask;if(!o)return;CRF.ask=null;const el=$('crask');if(el&&el.style)el.style.display='none';
  if(silent)return;const inp=$('craskin'),v=o.input&&inp?inp.value:'';try{if(ok){if(o.onOk)o.onOk(v);}else if(o.onNo)o.onNo();}catch(e){crFail('ask',e);}}
{const b=$('craskok');if(b)b.onclick=()=>crAskDone(true);}
{const b=$('craskno');if(b)b.onclick=()=>crAskDone(false);}

/* ---- chunk meshing (hook C0-02): our blocks route here before the core special meshers ---- */
function crFlatQuad(b,lx,y,lz,f,ti,eps){const n=CRC.FN[f],r=crRight(f),uv=tileUV(ti),c=.92;
  const ox=n[0]>0?lx+eps:n[0]<0?lx+1-eps:null,oz=n[1]>0?lz+eps:n[1]<0?lz+1-eps:null;
  const P4=[];for(const [s,t] of [[0,0],[1,0],[1,1],[0,1]]){const u=r[0]!==0?(r[0]>0?lx+s:lx+1-s):(r[1]>0?lz+s:lz+1-s);
    P4.push(ox!==null?[ox,y+t,u]:[u,y+t,oz]);}
  const U=[[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]];
  for(let i=0;i<4;i++){b.p.push(P4[i][0],P4[i][1],P4[i][2]);b.n.push(n[0],0,n[1]);b.u.push(U[i][0],U[i][1]);b.c.push(c,c,c);}
  const s=b.vc;b.ix.push(s,s+1,s+2,s,s+2,s+3);b.vc+=4;}
function crMesh(bufs,lx,y,lz,d,gb,ch){const be=blockEnts.get(bkey(ch.cx*CH+lx,y,ch.cz*CH+lz)),f=CRREG.mesh[d.crm];
  if(f){try{if(f(bufs,lx,y,lz,d,gb,ch,be))return true;}catch(e){crFail('mesh '+d.crm,e);}}
  if(d.crm==='paint'){crFlatQuad(bufs.cut,lx,y,lz,be&&be.t==='crpaint'?be.f:0,d._t.side,0.03);return true;}
  return false;}                                       /* the easel without C1: falls through to its cross render */

/* ---- the frame (hook C0-18) ---- */
function processCrea(dt){
  if(!CRF.live&&!crOn)return;                         /* O(1) until the first creativity block entity or editor (og_trace) */
  CRF.clock+=dt;
  if(crOn&&P&&P.dead)crUIClose(true);
  if(CRF.dim!==DIM){CRF.dim=DIM;crEmit('onDim',DIM);}
  if((CRF.sweepT-=dt)<=0){CRF.sweepT=CRC.SWEEP;crSweep();}
  for(let i=0;i<CRREG.tick.length;i++){try{CRREG.tick[i](dt);}catch(err){crFail('tick',err);}}
  if(!CRBE.size&&!crOn)CRF.live=false;}              /* one last tick after the last block goes, so packages can clean up */

/* ---- persistence (hooks C0-19 snapshot, C0-20 applySave, C0-21 resetWorld) ---- */
function crSaveFields(){const ks=Object.keys(CRW);if(!ks.length)return {};const w={};for(const k of ks)w[k]=CRW[k];return {cr:{v:1,n:CRN,w}};}
function crReset(){if(crOn)crUIClose(true);if(CRF.ask)crAskDone(false,true);
  for(const k in CRW){const id=crItemId(+k);delete DEFS[id];delete ICONS[id];delete ICONTEX[id];}
  for(const n of CRLOST){const id=crItemId(n);if(!CRW[n]){delete DEFS[id];delete ICONS[id];delete ICONTEX[id];}}CRLOST.clear();
  CRW={};CRN=1;CRSZ.clear();CRBE.clear();CRF.clock=0;CRF.sweepT=0;CRF.dim=null;CRF.live=false;CRF.gc=0;
  crEmit('onReset');}
/* runs right after resetWorld() inside applySave, BEFORE any stack, drop or block entity is restored: every work def exists first.
   Conservative GC: a record whose item id appears nowhere else in the save (inventory, chests, trunks, drops, stash, bots, BEs)
   is gone for good and is dropped; anything referenced is kept. */
function crLoad(d){const c=d&&d.cr;let refs=null;
  if(d&&typeof d==='object')try{if(c)delete d.cr;const j=JSON.stringify(d);refs=new Set();const re=/"id":(\d+)(?=[,}\]])/g;let m;   /* the save minus cr */
      while((m=re.exec(j)))refs.add(+m[1]);}catch(e){refs=null;crFail('gc',e);}finally{if(c)d.cr=c;}
  if(c&&c.w&&typeof c.w==='object'){
    let top=0;
    for(const key in c.w){const n=+key,r=c.w[key];if(!(n>0&&n<=CRC.MAXN)||!r||(r.k!=='art'&&r.k!=='song'))continue;top=Math.max(top,n);
      if(refs&&!refs.has(crItemId(n))){CRF.gc++;continue;}
      CRW[n]={k:r.k,st:r.st==='done'?'done':'wip',t:crTitle(r.t),by:crTitle(r.by),d:r.d==null?null:r.d,u:r.u|0,
        ...(r.k==='art'?{w:r.w|0,h:r.h|0}:{})};crSz(n);}
    CRN=Math.max(c.n|0,top+1,1);
    for(const key in CRW)crDefSync(+key);}
  /* a work id the save points at with no record (a v6.2 world re-saved by v6.1 or older, which drops save.cr): a placeholder def,
     so nothing reads an undefined def, and the serial moves past it, so no new work ever takes that id (fix lead, v6.2 review) */
  if(refs){let top=0;for(const id of refs){const n=id-CRC.ID0;if(!(n>0&&n<=CRC.MAXN))continue;top=Math.max(top,n);if(!CRW[n])crLostDef(n);}
    CRN=Math.max(CRN,top+1);}
  for(const k in (d&&d.be)||{}){const b=d.be[k];if(b&&CR_BET[b.t]){if(b.t==='crjuke')b.s=0;CRBE.set(k,b);CRF.live=true;}}
  for(const key in CRW)crEmit('onWork',+key,CRW[key],'load');
  crEmit('onLoad');}

/* ---- head.html CSS shared by both editors (hooks C0-22/23 add the overlays and the shared CSS; packages add their own via crCSS) ---- */
function crInfo(){const s=crStats();return {...s,ui:crOn,clock:+CRF.clock.toFixed(2),stubs:CREX.crStubs,tile0:CRF.tile0,dim:DIM};}
/* ---- exports (CREX, spread first into __vox) ---- */
Object.assign(CREX,{crInfo,crStats,getCR:()=>({CRW,CRN,CRBE,CRF,CRSZ}),CRC,CRREG,CR_TILES,CR_RECIPE_N,crNew,crRec,crRecOf,crSetData,crFinish,
  crDiscard,crItemId,crWorkN,crTitle,crName,crBytes,crPlacePainting,crPaintCells,crPaintGeom,crPaintFits,crPaintSupported,crPaintLoaded,crCellsAt,
  crRight,crFaceOf,crInteract,crUseHeld,crEnsureBE,crBE,crOnPlace,crScatter,crOrphan,crSweep,crRemovePainting,crCtx,crCtxRec,
  crStartWork,crEndWork,crDropWork,crUIOpen,crUIClose,crKey,crAsk,crAskDone,crGiveDan,crSpawnWork,crBotNo,crKeepDrop,crSaveFields,
  crLoad,crReset,crDefSync,crIcon,processCrea,crOn:()=>crOn,crLost,crLostDef,getCRLOST:()=>CRLOST,
  crCore:()=>({Tl,ATLAS,tn:_tn,ICONS,ICONTEX,MODAL,getCursor:()=>cursorStack,setCursor:s=>{cursorStack=s;},slotClick,quickMove,die,
    scatterBE,breakBlock,explode0,nukeExplode,doMine,doUse:()=>doUse,getIcon,keyDim,keyCore,bkey,chunkAt,removeEnt,closeModal,
    stashEnts,unstashEnts,setDim,modalOpen,lookDir,eyePos,raycastB,meshChunk,ENT_STASH,handKind:()=>handKind,sortInv,dropSel,
    resetWorld,tileUV,mulberry32,agPlaceable,agBreaking,setHandKind:v=>{handKind=v;}})});
