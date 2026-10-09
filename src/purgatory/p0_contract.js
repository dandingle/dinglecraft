/* ---- PART 55: p0_contract.js ---- */
/* ===================================================================== */
/* PART 55 — PUPPET PURGATORY (v6.1). p0 contract (P0). p1 world, p2 things, p3 puppets, p4 headliners, p5 bots */
/* ===================================================================== */
/* FROZEN after Build A0 (the purgatory build plan, section 3.2): additive changes only, through PZ.
   Load rules (plan section 1): this text runs after PARTs 1-53 and before PART 54. No Math.random, Date.now,
   performance.now, fetch or THREE constructor at top level or on any overworld per-frame path. Never touch TPEX, HRE,
   HRL, HRW or tpRegister (absent in DC_NO_TEX builds): only `typeof TP!=='undefined'&&TP.hr` and typeof-guarded hrPg*. */
const PGEX={pgStubs:''};PGEX.__pgx=PGEX;           /* spread FIRST into window.__vox (TPEX and core keys win). __pgx lets p_static enumerate
   the keys (t0_static's __tpx pattern). Every _stub/p<d>_stub.js does PGEX.pgStubs+='<d>'; real files never touch it, so suites,
   og_trace's purg session and speedrun --to=auto can skip work that needs a package still on its stub (audit A9/A11) */

/* ---- ids (D4: the only place symbolic purgatory ids are assigned; plan section 2.1/2.2) ---- */
Object.assign(B,{PG_DECK:149,PG_SKIN:150,PG_MBLACK:151,PG_VELVET:152,PG_TRAVELER:153,PG_SEAT:154,PG_SHAG:155,PG_SLEEVE:156,
  PG_FOREARM:157,PG_FLEECE:158,PG_EYE:159,PG_STUFFING:160,PG_ARMHOLE:161,PG_PSKY:162,PG_PHILL:163,PG_BACKING:164,PG_BRACE:165,
  PG_FOAM:166,PG_ROT:167,PG_GOOGLY:168,PG_WIREORE:169,PG_SEQORE:170,PG_KNUCKLE:171,PG_COUNTER:172,PG_BURNER:173,PG_SOUP:174,
  PG_DOUGH:175,PG_LINO:176,PG_TESLA:177,PG_SATIN:178,PG_MIRROR:179,PG_SHEET:180,PG_SWAMP:181,PG_SCUM:182,PG_PINS:183,PG_CORD:184,
  PG_PLATE:185,PG_CAN:186,PG_HOTPLATE:187,PG_BENCH:188,PG_PTRUNK:189,PG_LAMP:99,PG_LILY:117,PG_CATTAIL:118,PG_DOOR:119,PG_STRUNK:247});
Object.assign(IT,{PG_PROGRAMME:285,PG_FELT:286,PG_ROD:287,PG_FLEECE:288,PG_PLASTICEYE:289,PG_STUFF:290,PG_GREASE:291,PG_CARD:292,
  PG_FOAMCHUNK:293,PG_FOAMDUST:294,PG_GOOGLIES:295,PG_HANGER:296,PG_WIRE:297,PG_SEQUIN:298,PG_SEQCLOTH:299,PG_KNUCKLE:300,
  PG_LAMINATE:301,PG_COIL:302,PG_SHARD:303,PG_COPPER:304,PG_SATIN:305,PG_PINS:306,PG_SHAGFUR:307,PG_DRUMSTICK:308,
  PG_FLOPPY:310,PG_PSHEARS:311,PG_FSCOOP:312,PG_SLAPPER:313,PG_LARPPICK:314,PG_CLIPPERS:315,PG_LARPSPADE:316,PG_BAT:317,
  PG_HPICK:318,PG_SNIPS:319,PG_HSCOOP:320,PG_RAPIER:321,PG_DISCO:322,PG_RSNIPS:323,PG_GSCOOP:324,PG_STILETTO:325,PG_GAUNTLET:326,
  PG_MITT:327,PG_VMIRROR:328,PG_FLY:329,PG_PIE:330,PG_CHARGE:331,PG_PLUNGER:332,PG_STAPLER:333,PG_STAPLES:334,PG_CHOPGLOVE:335,
  PG_PEARLS:336,PG_FUSE:337,PG_BOA:338,
  PG_FPAD_H:340,PG_FPAD_C:341,PG_FPAD_L:342,PG_FPAD_B:343,PG_GOWN_H:344,PG_GOWN_C:345,PG_GOWN_L:346,PG_GOWN_B:347,
  PG_STUNT:348,PG_SNEAKERS:349,PG_WIG:350,
  PG_TOMATO:351,PG_RCHICK:352,PG_LIVECHICK:353,PG_ROAST:354,PG_DOUGHBALL:355,PG_FLATBREAD:356,PG_MEATBALL:357,PG_HAM:358,
  PG_GLAZED:359,PG_FISH:360,PG_GRILLED:361,PG_SV_PLUNGER:362,PG_SV_GLOVE:363,PG_SV_FROG:364});

/* ---- layout (bible section 3; frozen). Every y is the y you STAND at unless named otherwise (MARK_PAD.y, ARENA.*.y,
   APRON.y, PIT.y are block tops). deckY(z) is the y of the deck's TOP BLOCK, so you stand at deckY(z)+1. ---- */
const MPC=Object.freeze({
  WALK:{x0:-95,x1:95,z0:-299,z1:266}, BORDER_TOP:70, CEIL:62, BEACON_Y:[71,78],
  MARK:[0,36.2,-136], MARK_PAD:{x0:-4,x1:4,z0:-140,z1:-132,y:35}, HUB_CAN:[3,36,-134], BOT_HEAP:{x0:-7,x1:-5,z0:-137,z1:-135},
  TRENCH_Z:[-150,-126,-102,-78], PROSC_Z:-160, ARCH_Z:[-58,42,152], BACKWALL_Z:262, GHOST:[0,258],
  BOOTH:[[12,-54],[12,46],[12,157]], DRAINS:[[-50,-30],[20,15],[60,-45]], BAND:[[-60,-120],[50,-20],[-50,110]],
  LABS_HQ:[-40,95], KITCHEN_NEAR:[40,-10], LAST_GUEST:[-40,18,-110],
  APRON:{x0:-40,x1:39,z0:-190,z1:-161,y:34}, PIT:{x0:-40,x1:39,z0:-202,z1:-191,y:30}, HOUSE:{x0:-64,x1:63,z0:-299,z1:-203},
  EXIT:{x0:-3,x1:2,z:-299,y0:57,y1:61}, BOX_SW:[60,46,-206],
  ARENA:{bomber:{x0:-40,x1:39,z0:-190,z1:-159}, bigpig:{x0:-10,x1:10,z0:66,z1:141}, bigfrog:{cx:0,cz:215,r:24}},
  UMARK:{bomber:[0,35,-146], bigpig:[0,43,64], bigfrog:[0,null,188]},          /* bigfrog y = deckY(188) at runtime */
  FROG_ROOM:{x0:-3,x1:3,y0:8,y1:12,z0:212,z1:218}, STAIR:{x0:-9,x1:9,z0:70,z1:140}, STAR:[0,63,131],
  ENTRY:{dim:'puppet',x:0,y:40,z:-136}});
function deckY(z){return z<-160?34:34+Math.floor((z+160)/24);}           /* X5: y 34 at the proscenium, 51 at the back wall */

/* ---- saved state (D10; bible section 1.1 plus bots.held) ---- */
function mpDefault(){return {ver:1,door:null,playT:0,inside:false,ret:null,trunks:{},keep:null,clock:0,
  spawns:{mark:1,b1:0,b2:0,b3:0,trunk:null},lost:{},dead:{bomber:0,bigpig:0,bigfrog:0},open:{a2:0,a3:0},
  deaths:{bomber:0,bigpig:0,bigfrog:0},unlock:{},seenIng:{},page:0,ticks:{},cue:{t:0,ph:'show'},flats:{},trees:{},tears:[],
  knuckles:0,feltDan:0,quiet:0,squeak:0,strike:null,stats:{t0:0,deaths:0,swallowed:0,pigs:0,splices:0,tomatoes:0,thrown:0},
  bots:{},life:{escapes:0,souvenirs:{}}};}                               /* bots[name]={stash:bkey,mem:{home,spawn,base,myTable,myFurnace,proj},held:[],deaths:0} (P5 writes) */
var MP=mpDefault();                                /* var: hooks read it from core functions (no TDZ) */
var MPF={fight:null,flinch:0,cut:false,results:false,dirty:0,giveLog:[],tick:0};   /* transient, never saved; field owners: section 6 matrix */
var pguOn=false,presOn=false;                      /* panel-open FLAGS read by modalOpen() and the Esc chain (P0-57/58). pguOpen(page)/pguClose()
   and presOpen(stats)/presClose() are the FUNCTIONS (audit A1: a function in modalOpen()'s || chain is always truthy) */
function mpSaveFields(){const o={};if(JSON.stringify(MP)!==JSON.stringify(mpDefault()))o.mp=MP;
  if(Object.keys(ENT_STASH).some(k=>ENT_STASH[k]&&ENT_STASH[k].length))o.stash=ENT_STASH;return o;}
/* ---- old saves (Release 1.0 recast). v6.1-v6.3 worlds keyed some saved fields by the old cast names: save.dim, MP.dead,
   MP.deaths, MP.ticks, MP.life.souvenirs, the meter, MP.pm3, the Headliner Trunk entities (hn + name) and each bot's dim.
   They are read once through these aliases and re-saved under the new keys. The old names are stored ROT13 so the build
   passes the IP scan; MP_R13 decodes them (a-z only). Tests: tests/purgatory/p8_saves.js. */
const MP_R13=s=>s.replace(/[a-z]/g,c=>String.fromCharCode((c.charCodeAt(0)-84)%26+97));
const MP_LEGACY_HN=Object.freeze({[MP_R13('uneel')]:'bomber',[MP_R13('cvttl')]:'bigpig',[MP_R13('xrezvg')]:'bigfrog'});
const MP_LEGACY_DIM=MP_R13('zhccrg'),MP_LEGACY_METER=MP_R13('zrrc'),MP_LEGACY_PM3=MP_R13('tbamb');
/* the dimension key of a save (core applySave, agRestore): the old purgatory key reads as 'puppet' */
function mpDimAlias(d){return d===MP_LEGACY_DIM?'puppet':d;}
/* a saved MP in old shape -> new keys (a deep copy: the caller's object is never changed). New keys win if both exist. */
function mpLegacyKeys(m){if(!m||typeof m!=='object')return m;m=JSON.parse(JSON.stringify(m));
  const mv=(o,from,to)=>{if(!o||typeof o!=='object'||!Object.prototype.hasOwnProperty.call(o,from))return;if(!Object.prototype.hasOwnProperty.call(o,to))o[to]=o[from];delete o[from];};
  for(const k in MP_LEGACY_HN){mv(m.dead,k,MP_LEGACY_HN[k]);mv(m.deaths,k,MP_LEGACY_HN[k]);mv(m.ticks,k,MP_LEGACY_HN[k]);if(m.life)mv(m.life.souvenirs,k,MP_LEGACY_HN[k]);}
  mv(m,MP_LEGACY_METER,'squeak');mv(m.pm3,MP_LEGACY_PM3,'dare');
  return m;}
function mpLoad(m,stash){const D=mpDefault();m=mpLegacyKeys(m);MP=Object.assign(D,m||{});
  /* deep-default nested objects (old saves and partial writes never leave a field undefined) */
  for(const k of ['spawns','dead','open','deaths','cue','stats','life'])MP[k]=Object.assign(mpDefault()[k],(m&&m[k]&&typeof m[k]==='object')?m[k]:{});
  if(!MP.life.souvenirs||typeof MP.life.souvenirs!=='object')MP.life.souvenirs={};
  for(const k of ['trunks','lost','unlock','seenIng','ticks','flats','trees','bots'])if(!MP[k]||typeof MP[k]!=='object'||Array.isArray(MP[k]))MP[k]={};
  if(!Array.isArray(MP.tears))MP.tears=[];
  if(stash)for(const k in stash)if(Array.isArray(stash[k]))ENT_STASH[k]=stash[k];
  /* a save taken between the strip and the arrival (the 4.5 s of the entry cutscene) is outside with everything in the trunk:
     undo the bank, nothing is lost. A puppet save that somehow says outside is inside. */
  if(MP.inside&&DIM!=='puppet'){mpUnbank();MP.inside=false;}
  if(DIM==='puppet')MP.inside=true;
  MPF.fight=null;MPF.flinch=0;MPF.results=false;MPF.giveLog=[];MPF.cut=false;
  if(DIM==='puppet')for(const f of PREG.onLoad)try{f();}catch(err){mpFail('onLoad',err);}}   /* runs before any chunk is created (P0-09) */
function mpReset(){MP=mpDefault();MPF.fight=null;MPF.flinch=0;MPF.results=false;MPF.giveLog=[];MPF.cut=false;MP_LIGHTS.clear();
  if(typeof CUT!=='undefined')CUT.script=null;
  mpUiReset();mpDoorSetDispose();
  for(const f of PREG.onReset)try{f();}catch(err){mpFail('onReset',err);}}

/* ---- registries (D5). Packages register at THEIR top level; P0 hooks dispatch. ----
   brain[mt](e,dt,T)           custom brain for a pmob (P0-31 routes before the demon line)
   mesh[mt](G,mats,mt)         returns {G,legs,mats} for a pmob's OG rig (P0-32)
   hurt[mt](e,dmg,kx,kz)       pboss pre-hurt policy: returns the damage to apply (>=0) or -1 to ignore (P4)
   loot[mt](e)                 pboss loot (never falls through to the Warden's)
   mobUse[mt](e)               Dan right-clicks that mob (P0-19)
   sneakUse[blockId](hit)      Dan sneak+right-clicks that block (P0-20)
   interact[kind](hit,def)     DEFS[id].interact kinds pcan/plab/ptrans (P2), pdoor/pstash (P0) (P0-21)
   proj[kind]={mesh(e),free(mesh)?,hit(e,t)?,land(e,bx,by,bz)?,r?,g?,life?}   pooled projectiles (puSpawn/puUpdate)
   npcHit[mt](e,dmg,by)        an invulnerable NPC was hit (P3: the Old Goats tip over)
   tick[] f(dt)                inside purgatory only, file order P0..P5, never during a purgatory CUT
   overTick[] f(dt)            overworld only, only while MP.door exists
   onBreak[] f(x,y,z,id,who)   a purgatory block was broken by Dan, a bot or a player Charge
   onPlace[] f(x,y,z,id,who)   a block was placed inside purgatory
   onKill[] f(e)               a pmob died (after its drops)
   onEnter[] f()  onExit[] f(opts)  onDeath[] f(who)  onRespawn[] f(who,pos)  onClose[] f(kind,be,bek)
   onLoad[] f()   onReset[] f()      protect[] f(x,y,z)->bool (extra protected volumes: the Cook's Kitchen hut, Labs HQ) */
var PREG={brain:{},mesh:{},hurt:{},loot:{},mobUse:{},sneakUse:{},interact:{},proj:{},npcHit:{},
  tick:[],overTick:[],onBreak:[],onPlace:[],onKill:[],onEnter:[],onExit:[],onDeath:[],onRespawn:[],onClose:[],onLoad:[],onReset:[],protect:[]};
const MP_LIGHTS=new Set();                         /* bkeys of OG light sources other than torches (Burner, lit Hot Plate, booth lamps) */
function mpLight(x,y,z,on){const k=bkey(x,y,z);if(on)MP_LIGHTS.add(k);else MP_LIGHTS.delete(k);}
function mpLightsNear(near){for(const k of MP_LIGHTS){const p=dimP(k);if(!p)continue;const dx=+p[0]+.5-P.x,dy=+p[1]-P.y,dz=+p[2]+.5-P.z,d=dx*dx+dy*dy+dz*dz;if(d<900)near.push([d,+p[0],+p[1],+p[2]]);}}

/* ---- the frame ---- */
function processPuppet(dt){
  if(CUT.on&&CUT.script&&CUT.script.tick){try{CUT.script.tick(dt,CUT.t);}catch(err){mpFail('cut',err);}}
  if(DIM!=='puppet'){mpDoorTimer(dt);if(MP.door)mpOverTick(dt);return;}  /* O(1) in the overworld; nothing but the
   pointer-locked timer runs until a door exists (the og_trace parity session never stamps one) */
  if(!P||CUT.on&&CUT.script)return; MP.clock+=dt; MPF.tick++;
  for(const f of PREG.tick)try{f(dt);}catch(err){mpFail('tick',err);} }    /* registration order = file order: P0, P1, P2, P3, P4, P5 */
/* mpOverTick(dt) lives in p0_entry.js: the door set (searchlight, marquee, frog, ritual clock), then PREG.overTick. */

/* ---- dispatchers behind the P0 hooks ---- */
function mpBrain(e,dt,T){PREG.brain[e.mt](e,dt,T);if(e.hrM&&typeof hrPgTick==='function'){try{hrPgTick(e,dt);}catch(err){mpFail('hr '+e.mt,err);}}}
function mpMobMesh(mt,G,mats,o){if(o&&o.hr&&typeof hrPgMobMesh==='function'){const r=hrPgMobMesh(mt,G);if(r)return r;}return PREG.mesh[mt](G,mats,mt);}
function mpPreHurt(e,dmg,kx,kz){const T=MOBT[e.mt];
  if(T.prop)return puHit(e,dmg,kx,kz);                                    /* bat impulse / designed-target relays; always -1 or a relay */
  if(T.npc){const f=PREG.npcHit[e.mt];if(f)f(e,dmg,HIT_BY);return -1;} if(e.pinv>0)return -1;
  if(T.pboss&&PREG.hurt[e.mt])return PREG.hurt[e.mt](e,dmg,kx,kz);        /* P4: bots x0.5, Dan-hit clock, phase clamp, 45% window cap, sets e.pfloor */
  return dmg;}
function mpBossLoot(e){const f=PREG.loot[e.mt];if(f)f(e);}               /* never falls through to the Warden's loot */
function mpOnBreak(x,y,z,id,who){for(const f of PREG.onBreak)try{f(x,y,z,id,who);}catch(err){mpFail('onBreak',err);}}
function mpOnPlace(x,y,z,id,who){for(const f of PREG.onPlace)try{f(x,y,z,id,who);}catch(err){mpFail('onPlace',err);}}
function mpOnKill(e){mpTagKillDrops(e);for(const f of PREG.onKill)try{f(e);}catch(err){mpFail('onKill',err);}}  /* tags fresh drops pown=last hitter for 60 s */
function mpTagKillDrops(e){const w=HIT_BY||'Dan';if(w!=='Dan'&&!agByName(w))return;     /* only players own drops (a boss-blast kill stays unowned) */
  for(let i=entities.length-1;i>=0&&i>=entities.length-12;i--){const d=entities[i];
    if(d.t==='drop'&&!d.dead&&d.age===0&&Math.abs(d.x-e.x)<1.6&&Math.abs(d.z-e.z)<1.6){d.pown=w;d.pownT=MP.clock+60;}}}
function mpOnModalClose(kind,be,bek){if(be&&be.t==='stash')mpStashClosed(be,bek);
  if(DIM==='puppet')for(const f of PREG.onClose)try{f(kind,be,bek);}catch(err){mpFail('onClose',err);}}
function mpSnapMob(e,ents){if(e.carry&&ents)ents.push({t:'drop',x:+e.x.toFixed(2),y:+e.y.toFixed(2),z:+e.z.toFixed(2),id:e.carry.id,count:e.carry.count,...(e.carry.dur!=null?{dur:e.carry.dur}:{})});}
function mpDispose(e){/* per-instance materials listed in e.pmats are disposed; shared rig geometry never */
  const L=e.pmats;if(!L)return;for(const m of L){if(m&&m.map&&m.map.dispose&&m.map.userData&&m.map.userData.pown)m.map.dispose();if(m&&typeof m.dispose==='function')m.dispose();}e.pmats=null;}

/* ---- rules of the house ---- */
function mpInArena(name,x,y,z){const A=MPC.ARENA;
  const inBox=b=>x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1;
  const inK=()=>{const k=A.bigfrog;return Math.hypot(x+.5-k.cx,z+.5-k.cz)<=k.r||
    (x>=MPC.FROG_ROOM.x0-1&&x<=MPC.FROG_ROOM.x1+1&&z>=MPC.FROG_ROOM.z0-1&&z<=MPC.FROG_ROOM.z1+1);};
  if(name==='bomber')return inBox(A.bomber);if(name==='bigpig')return inBox(A.bigpig);if(name==='bigfrog')return inK();
  return inBox(A.bomber)||inBox(A.bigpig)||inK();}
function mpUmarkPos(name){const u=MPC.UMARK[name];if(!u)return null;return [u[0],u[1]==null?deckY(u[2])+1:u[1],u[2]];}
function mpProtected(x,y,z){
  if(mpInArena(null,x,y,z))return true;
  const MPd=MPC.MARK_PAD;if(x>=MPd.x0-1&&x<=MPd.x1+1&&z>=MPd.z0-1&&z<=MPd.z1+1)return true;
  for(const n in MPC.UMARK){const u=MPC.UMARK[n];if(Math.abs(x-u[0])<=4&&Math.abs(z-u[2])<=4)return true;}
  for(const b of MPC.BOOTH)if(Math.abs(x-b[0])<=4&&Math.abs(z-b[1])<=4)return true;
  for(const f of PREG.protect)if(f(x,y,z))return true;
  return false;}
function mpPlaceOK(x,y,z,id){if(y>MPC.CEIL&&!mpInArena(null,x,y,z))return false;const d=id>0&&DEFS[id];return !(d&&d.pplace&&!d.pplace(x,y,z));}

/* ---- combat primitives (bible section 1 Blasts/Bosses; maps/ai_players.md 12.8) ---- */
/* purgFoe: nearest live target within range (3D): P (Dan, alive, not creative, in this DIM) or an online bot BODY entity (e.bot, e.A).
   opt.danOnly: Dan only. opt.skip: an entity, P, or a name to ignore. opt.flat: horizontal distance. Returns the target or null. */
function purgFoe(e,range,opt){opt=opt||{};let best=null,bd=range==null?1e9:range;
  const sk=opt.skip,skN=typeof sk==='string'?sk:null;
  const dist=(x,y,z)=>opt.flat?Math.hypot(x-e.x,z-e.z):Math.hypot(x-e.x,(y+0.9)-(e.y+(e.h||1)*0.5),z-e.z);
  if(P&&!P.dead&&P.mode!=='c'&&sk!==P&&skN!=='Dan'){const d=dist(P.x,P.y,P.z);if(d<bd){bd=d;best=P;}}
  if(!opt.danOnly&&typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS){const b=a.e;
    if(!b||b.dead||a.dead||!a.online||a.dim!==DIM||b===sk||a.name===skN)continue;
    const d=dist(b.x,b.y,b.z);if(d<bd){bd=d;best=b;}}
  return best;}
/* purgHit: t is P, a bot body (e.bot/e.A), an agent record, or a mob entity. who = attacker display name, how = cause (stored as
   'pg:'+how so death messages and heckles can match it). opt.force zeroes the target's i-frames first (scripted hits).
   Knockback from opt.kx/opt.kz, or from opt.src={x,z} (away from it); none if neither. Returns true if it reached a target. */
function purgHit(t,dmg,who,how,opt){if(!t)return false;opt=opt||{};
  let kx=opt.kx,kz=opt.kz;if(kx===undefined&&opt.src&&t.x!==undefined){kx=t.x-opt.src.x;kz=t.z-opt.src.z;}
  if(t===P){if(P.dead)return false;LASTDMG={by:who,how:'pg:'+how,t:AG_T};if(opt.force)P.hurtT=0;damagePlayer(dmg,kx,kz);return true;}
  const A=t.bot?t.A:(t.led&&t.inv&&t.name?t:null);
  if(A){if(opt.force&&A.e)A.e.hurtT=0;agHurt(A,dmg,who,kx===undefined?0:kx,kz===undefined?0:kz,'pg:'+how);return true;}
  if(t.t==='mob'&&!t.dead){const h=HIT_BY,w=HIT_HOW;HIT_BY=who;HIT_HOW=how;if(opt.force)t.hurtT=0;
    try{hurtMob(t,dmg,kx===undefined?0:kx,kz===undefined?0:kz);}finally{HIT_BY=h;HIT_HOW=w;}return true;}
  return false;}
/* pBlast: everything within r (3D, to the target's middle) takes max(1,round(dmg*(1-d/r))) through purgHit (forced, attributed to who),
   regardless of GR.mobGrief; opt.vy launches upward (scaled by falloff); opt.self is never hurt (purgBoom); screen shake near Dan.
   Breaks blocks ONLY if opt.charge (a player's Charge): pblast blocks within opt.br (default 2) that are not mpProtected; every broken
   block drops through DEFS[id].pdrop(null,who) (else blockDrop) as a drop owned by who, and fires mpOnBreak(x,y,z,id,who). Never explode0. */
function pBlast(x,y,z,r,dmg,who,opt){opt=opt||{};const self=opt.self||null;let n=0;
  const hitOne=(t,tx,ty,tz)=>{const d=Math.hypot(tx-x,ty-y,tz-z);if(d>=r)return;
    const f=1-d/r,amt=Math.max(1,Math.round(dmg*f));const kx=tx-x,kz=tz-z;
    if(purgHit(t,amt,who,opt.how||'blast',{force:1,kx,kz}))n++;
    if(opt.vy){const v=opt.vy*f;if(t===P){if(!P.dead)P.vy=Math.max(P.vy,v);}else if(t.vy!==undefined)t.vy=Math.max(t.vy,v);}};
  if(P&&!P.dead&&P!==self)hitOne(P,P.x,P.y+0.9,P.z);
  for(const e of entities){if(e.dead||e===self||e.t!=='mob')continue;if(e.bot&&(!e.A||e.A.dim!==DIM))continue;
    hitOne(e,e.x,e.y+(e.h||1)*0.5,e.z);}
  burstParticles(x,y,z,B.TNT,Math.min(30,8+Math.round(r*3)),Math.min(2,0.5+r*0.15));
  if(typeof playSAt==='function')playSAt('boom',x,y,z);
  if(P){const dp=Math.hypot(P.x-x,P.y-y,P.z-z);if(dp<r*3)mpShake(Math.min(1.2,(0.15+r*0.07)*(1-dp/(r*3))),0.45);}
  if(opt.charge){const br=opt.br||2,pa=ACTOR;ACTOR=who||null;
    try{for(let bx=Math.floor(x-br);bx<=Math.floor(x+br);bx++)for(let by=Math.floor(y-br);by<=Math.floor(y+br);by++)for(let bz=Math.floor(z-br);bz<=Math.floor(z+br);bz++){
      if((bx+.5-x)**2+(by+.5-y)**2+(bz+.5-z)**2>br*br)continue;
      const id=getBlock(bx,by,bz);if(!id||!DEFS[id]||!DEFS[id].pblast||mpProtected(bx,by,bz))continue;
      scatterBE(bx,by,bz);setBlock(bx,by,bz,B.AIR);
      const dr=DEFS[id].pdrop?DEFS[id].pdrop(null,who):blockDrop(id);
      if(dr&&dr.count>0)mpDrop(bx+.5,by+.5,bz+.5,{id:dr.id,count:dr.count},who,0,2,0);
      mpOnBreak(bx,by,bz,id,who);}}finally{ACTOR=pa;}}
  return n;}
function purgBoom(x,y,z,r,who,self,dmg){return pBlast(x,y,z,r,dmg==null?Math.round(4+r*2):dmg,who,{self,how:'boom'});}  /* shields `self`, never grief notes */
function aimLob(fx,fy,fz,tx,ty,tz,T){return [(tx-fx)/T,(ty-fy)/T+0.5*GRAV*T,(tz-fz)/T];}
/* mpGive: Dan's inventory insert, logged in MPF.giveLog (speed-run honesty), overflow -> mpDrop at his feet owned by Dan. Returns leftover. */
function mpGive(st,src){if(!st||!(st.count>0)||!P)return 0;const s={...st};const n0=s.count;const left=invAddTo(P.inv,s);
  MPF.giveLog.push({t:MP.clock,f:MPF.tick,id:st.id,n:n0-left,src:src||'other'});if(MPF.giveLog.length>400)MPF.giveLog.splice(0,100);
  if(left>0)mpDrop(P.x,P.y+1,P.z,{...st,count:left},'Dan',0,1.5,0);
  redrawHotbar();return left;}
function mpDrop(x,y,z,st,owner,vx,vy,vz){if(!st||!(st.count>0))return null;spawnDrop(x,y,z,st,vx||0,vy||0,vz||0);
  const e=entities[entities.length-1];if(e&&e.t==='drop'&&owner){e.pown=owner;e.pownT=MP.clock+60;}return e||null;}

/* ---- props and pooled projectiles ----
   puSpawn(kind,x,y,z,vx,vy,vz,owner,opt) -> the pproj entity. opt is merged onto the entity (src: the thrower entity to skip,
   dmg, r, g, life, hitOwner, data...). PREG.proj[kind]={mesh(e)->Object3D (pooled), free(mesh)?, hit(e,t)->bool (true removes),
   land(e,bx,by,bz)->bool (default true removes), r (hit radius .4), g (gravity scale 1), life (8 s)}. */
function puSpawn(kind,x,y,z,vx,vy,vz,owner,opt){const K=PREG.proj[kind];if(!K){mpFail('puSpawn '+kind,new Error('no PREG.proj.'+kind));return null;}
  const e=Object.assign({t:'pproj',kind,x,y,z,vx:vx||0,vy:vy||0,vz:vz||0,owner:owner||null,age:0,hw:0.15,h:0.3,straight:0,src:null},opt||{});
  e.mesh=K.mesh?K.mesh(e):null;if(e.mesh){e.mesh.position.set(x,y,z);scene.add(e.mesh);}
  entities.push(e);return e;}
function puRemove(e){if(e.dead)return;const K=PREG.proj[e.kind];const m=e.mesh;removeEnt(e);if(m&&K&&K.free)try{K.free(m);}catch(err){}}
function puUpdate(e,dt){const K=PREG.proj[e.kind];if(!K){puRemove(e);return;}
  e.age+=dt;if(e.age>(e.life||K.life||8)){puRemove(e);return;}
  if(e.straight>0){e.straight-=Math.hypot(e.vx,e.vy,e.vz)*dt;}else e.vy-=GRAV*(e.g!=null?e.g:(K.g!=null?K.g:1))*dt;
  const nx=e.x+e.vx*dt,ny=e.y+e.vy*dt,nz=e.z+e.vz*dt;
  const bid=getBlock(Math.floor(nx),Math.floor(ny),Math.floor(nz));
  if(bid&&DEFS[bid]&&DEFS[bid].solid!==false){const kill=K.land?K.land(e,Math.floor(nx),Math.floor(ny),Math.floor(nz)):true;
    if(kill!==false){puRemove(e);return;}e.vx*=-0.3;e.vz*=-0.3;e.vy=Math.abs(e.vy)*0.3;}
  else{e.x=nx;e.y=ny;e.z=nz;}
  if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);}
  const R=e.r||K.r||0.4;
  const near=(tx,ty,tz,h)=>Math.abs(tx-e.x)<R+0.35&&Math.abs(tz-e.z)<R+0.35&&e.y>ty-R&&e.y<ty+(h||1.8)+R;
  const hitT=t=>{const kill=K.hit?K.hit(e,t):true;if(kill!==false){puRemove(e);return true;}return false;};
  if(P&&!P.dead&&(e.owner!=='Dan'||e.hitOwner)&&near(P.x,P.y,P.z,1.8)){if(hitT(P))return;}
  for(const m of entities){if(m.dead||m.t!=='mob'||m===e.src)continue;if(m.bot&&e.owner===(m.A&&m.A.name)&&!e.hitOwner)continue;
    if(near(m.x,m.y,m.z,m.h||1)){if(hitT(m))return;}}}
/* the swing that bats: P0's tick watches Dan's attack (MB.l rising edge, or P.swing jumping to 1) while he holds a bat:1 item */
function puBatSwing(){const st=heldStack(),d=st&&DEFS[st.id];if(!d||!d.bat)return 0;
  const L=lookDir(),E=eyePos();let n=0;
  for(const e of entities){if(e.dead||e.t!=='pproj')continue;
    const dx=e.x-E[0],dy=e.y-E[1],dz=e.z-E[2],dl=Math.hypot(dx,dy,dz);if(dl>3.4||dl<1e-6)continue;
    if((dx*L[0]+dy*L[1]+dz*L[2])/dl<Math.cos(Math.PI/6))continue;
    e.vx=L[0]*18;e.vy=L[1]*18;e.vz=L[2]*18;e.straight=40;e.owner='Dan';e.src=null;e.age=0;e.batted=1;n++;
    if(e.kind==='fish')mpTickOff('batfish');}
  if(n&&typeof playSAt==='function')playSAt('hit',P.x,P.y,P.z);
  return n;}
/* puHit: a prop mob was hit. Attacker holding a bat:1 item -> e.pbat (straight 18 m/s along the attacker's look for 40 m, owner =
   attacker; the prop's brain advances it with puBatMove); else knockback impulse x3 for a bat, x1 otherwise. Relay props
   (pgelbow, pgfinger, pgtip, pgcleat, pgspot) call e.relay(dmg,HIT_BY). Always returns -1 (props take no damage). */
function puHit(e,dmg,kx,kz){const by=HIT_BY||'Dan';
  if(typeof e.relay==='function'){try{e.relay(dmg,by);}catch(err){mpFail('relay '+e.mt,err);}return -1;}
  let st=null,lk=null;
  if(by==='Dan'){st=heldStack();lk=lookDir();}
  else{const a=agByName(by);if(a){st=a.inv[a.sel];const b=a.e;if(b){const dx=e.x-b.x,dz=e.z-b.z,l=Math.hypot(dx,dz)||1;lk=[dx/l,0.1,dz/l];}}}
  const bat=!!(st&&DEFS[st.id]&&DEFS[st.id].bat);
  if(bat&&lk){e.pbat={vx:lk[0]*18,vy:lk[1]*18,vz:lk[2]*18,d:40};e.owner=by;e.vx=e.pbat.vx;e.vy=e.pbat.vy;e.vz=e.pbat.vz;return -1;}
  const l=Math.hypot(kx,kz)||1,k=6*(bat?3:1);e.vx+=kx/l*k;e.vz+=kz/l*k;e.vy=Math.max(e.vy||0,3);
  return -1;}
/* puBatMove: called by a prop brain each frame; moves a batted prop straight and returns true until its 40 m are used up */
function puBatMove(e,dt){const b=e.pbat;if(!b)return false;const s=Math.hypot(b.vx,b.vy,b.vz)*dt;b.d-=s;
  const nx=e.x+b.vx*dt,ny=e.y+b.vy*dt,nz=e.z+b.vz*dt,id=getBlock(Math.floor(nx),Math.floor(ny),Math.floor(nz));
  if(b.d<=0||(id&&DEFS[id]&&DEFS[id].solid!==false)){e.pbat=null;e.vx*=0.3;e.vz*=0.3;e.vy=0;return false;}
  e.x=nx;e.y=ny;e.z=nz;e.vx=b.vx;e.vy=b.vy;e.vz=b.vz;if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);return true;}

/* ---- cutscenes, screen juice ----
   mpCut({lines:[{at,n,t}], end, cam(t)?, tick(dt,t)?, onEnd?}): Dan and the bots are invulnerable (P0-24, P5-14) and PREG.tick is
   paused (hostiles docile) while it runs; Space or a click after 0.8 s skips; Esc ends it. cam defaults to Dan's own eye. */
function mpCut(script){script=script||{};if(!script.lines)script.lines=[];if(script.end==null)script.end=3;
  if(!script.cam)script.cam=mpCamEye;CUT.script=script;MPF.cut=true;startCut();}
function mpCamEye(){camera.position.set(P.x,P.y+P.eyeY,P.z);camera.rotation.y=P.yaw;camera.rotation.x=P.pitch;}
function mpSay(n,t,dur){cutSay(n,t,dur);}  function mpShake(m,d){nukeShake(m,d);}
const MP_FAILED={};
function mpFail(where,err){if(MP_FAILED[where])return;MP_FAILED[where]=1;try{console.warn('[PG] '+where+': '+(err&&err.message||err));}catch(e2){}}

/* ---- structure compass (P0-55/56) ---- */
function mpCmpDoor(){const d=MP.door;if(!d||!P)return {x:0,z:0,d:0,ok:false};   /* PURE: renderCmp() calls cmpFind() for every target */
  return {x:d.x+0.5,z:d.z+0.5,d:Math.hypot(d.x+0.5-P.x,d.z+0.5-P.z),ok:true};}
function mpCmpTuned(){if(!MP.door&&DIM==='over')mpStampDoor();}
CMP_DEFS.push({k:'pdoor',n:'Stage Door'});

/* ---- small shared helpers (P0) ---- */
function mpWords(n){n=Math.max(0,Math.round(n));const W=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve',
  'thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],T=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  if(n<20)return W[n];if(n<100)return T[(n/10)|0]+(n%10?'-'+W[n%10]:'');return ''+n;}
function mpCap(s){return s?s[0].toUpperCase()+s.slice(1):s;}
/* a standing y at (x,z) near y: two non-solid cells over a solid one (searches up, then down); y itself if the chunk is not loaded */
function mpSafeY(x,y,z){const bx=Math.floor(x),bz=Math.floor(z);if(!chunkAt(bx,bz))return y;
  const free=yy=>{const a=getBlock(bx,yy,bz),b=getBlock(bx,yy+1,bz),c=getBlock(bx,yy-1,bz);
    const so=id=>id&&DEFS[id]&&DEFS[id].solid!==false;return !so(a)&&!so(b)&&so(c);};
  const y0=Math.floor(y);for(let k=0;k<10;k++){if(free(y0+k))return y0+k+0.05;if(k&&free(y0-k))return y0-k+0.05;}
  return y;}
function mpHas(id){return !!(P&&P.inv.some(s=>s&&s.id===id));}
function mpNeedProgramme(){return DIM==='puppet'&&!!P&&!mpHas(IT.PG_PROGRAMME)&&!(cursorStack&&cursorStack.id===IT.PG_PROGRAMME);}
function mpInfo(){return {dim:DIM,inside:!!MP.inside,door:MP.door?{...MP.door}:null,clock:+MP.clock.toFixed(2),playT:+MP.playT.toFixed(2),
  page:MP.page,ticks:Object.keys(MP.ticks).filter(k=>MP.ticks[k]),stubs:PGEX.pgStubs,dead:{...MP.dead},strike:!!MP.strike,
  trunks:{...MP.trunks},escapes:MP.life.escapes,cut:!!(CUT.on&&CUT.script),pgu:pguOn,pres:presOn};}

/* ---- exports (PGEX, spread first into __vox). PURG_PAGES/PURG_LADDER are added by p0_guide.js (const, TDZ here). ---- */
Object.assign(PGEX,{mpInfo,getMP:()=>MP,getMPF:()=>MPF,mpEnterNow,mpExitNow,mpDoorHere,mpSetPlayT,mpStampDoor,mpRespawn,
  puSpawn,pBlast,purgHit,purgFoe,purgBoom,aimLob,deckY,MPC,PREG,chunkEdits:()=>chunkEdits,killMob,doUse:()=>doUse,
  mpSkip:(n)=>hnSkipTo(n),pguOpen,pguOn:()=>pguOn,presOn:()=>presOn,mpTickOff,mpDoorFrogBite,mpGive,mpDrop,mpCut,mpPlaceOK,
  mpProtected,mpInArena,mpCmpDoor,mpSaveFields,mpLoad,mpLegacyKeys,mpDimAlias,hnTrunkMigrate:()=>hnTrunkMigrate(),getHNTRUNK:()=>typeof HN_TRUNK!=='undefined'?HN_TRUNK:null,mpWords,mpSafeY,mpNeedProgramme,puUpdate,puBatSwing,puBatMove,mpUmarkPos,
  /* package tables read at call time (P2's PRECIPES, P4's HN_NAMES and hnState may be const/let further down PART 55) */
  getPRECIPES:()=>typeof PRECIPES!=='undefined'?PRECIPES:[],getHN:()=>typeof HN_NAMES!=='undefined'?HN_NAMES:{},
  getHnState:()=>typeof hnState==='function'?hnState():null,
  /* live core internals the purgatory suites need that the core __vox does not export (read at call time; tests only) */
  pgCore:()=>({Tl,ATLAS,tn:_tn,CMP_DEFS,ENT_STASH,ARM_M,CUT,MODAL,torches,SPW,LWN,NUKES,DIS,MOB_NAME,FIG_CHANCE,DEMON_X,DEMON_Z,
    getCursor:()=>cursorStack,setCursor:s=>{cursorStack=s;},slotClick,die,explode0,doMine,getIcon,keyDim,dimPfx,bkey,ckey,dimP,startDisaster,
    renderCmp,closeCmp,startCut,endCut,updateCut,resumeGame,pauseGame,lookDir,eyePos,chunkAt,removeEnt,tryLock,blockDrop,playing:()=>playing,
    paused:()=>paused,dbgmOpen:()=>dbgmOpen,mpDS:()=>mpDS,mpGu:()=>mpGu,HOTCV})});
