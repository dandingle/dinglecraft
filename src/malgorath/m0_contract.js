/* ---- PART 57: m0_contract.js ---- */
/* ===================================================================== */
/* PART 57 — MALGORATH, THE WORLD-EATER (v6.3). m0 contract (lead).      */
/* m1 the Bite (world, summon, compass), m2 the fight (rounds, waves,    */
/* damage, scenes, death, loot, bar, audio, bots), m3 the OG model + OG  */
/* VFX follow in this PART; m4 Hyperreal lives in the PART 57 HR block   */
/* (full builds only, right before hrLoadModels).                        */
/* Spec: the Malgorath plan and bible (not in this repository).          */
/* FROZEN after M0: additive changes only, through the lead.             */
/* ===================================================================== */
/* Rules for every PART 57 file (m_static checks them):
   - no THREE constructor, Math.random, Date.now, performance.now or fetch in a top-level statement; nothing beyond 220 m of
     (1000.5, 1000.5) except tickMalg's O(1) distance check (og_trace nomalg digests the overworld with and without PART 57);
   - PART 57 loads after PARTs 1-53 and BEFORE PART 56, PART 55 and PART 54: CR*, MP, PREG, TP, HRL, HRE, hr* are runtime-only;
   - names: the lead owns MG* / mg* names declared here; packages declare only their prefixes (plan section 2.3);
   - anything a core hook reads is a var or a function (hoisted: the hooks may run before this file's top level in theory). */

/* ---- the flags the core hooks read ---- */
var MGP_ON=false;          /* protection + gadget hooks armed: overworld, DEMON alive, Dan within MGC.R_ARM of C (tickMalg writes it) */
var MGF_FIG=0;             /* the figurine hook sets it right before makeMobMesh('demon'): that one call returns the light-less proxy */

/* ---- constants (frozen; plan 2.1) ---- */
var MGC={X:1000.5,Z:1000.5,BX:1000,BZ:1000,
  R_ARM:220,R_GRADE:140,R_CHEW:90,R_TOAST:70,R_PREWARM:70,R_SPAWN:60,R_STRUCT:60,R_BAR:48,R_DOOR_EXCL:80,R_DOOR_PAUSE:140,
  R_THROAT:7,R_PLATE:24,R_ARENA:24.5,R_W0:36,R_W1:38.5,SCALLOPS:11,R_SITE:46,
  DY_PLATE:10,DY_GUT:16,F_MIN:22,F_MAX:46,ARENA_DN:4,ARENA_UP:24,SITE_DN:3,SITE_UP:26,BAND_DN:4,BAND_UP:30,
  JAW:365,BAR:300,ROUNDS:3,GATE:0.25,CAP_HIT:30,AWAY:30,
  MT:['demon','mgeye','mgpart','mgmorsel','mghusk','mgbloat']};

/* ---- the geometry of the Bite (pure, frozen; bible 3.1). Feet positions are continuous; block cells use their centre ---- */
function mgG(){return demonAY();}                                                       /* the surface: max(colInfo(1000,1000).h, SEA+2) */
function mgF(){return Math.max(MGC.F_MIN,Math.min(MGC.F_MAX,mgG()-MGC.DY_PLATE));}       /* plate standing surface (blocks at F-1..F-3) */
function mgGF(){return mgF()-MGC.DY_GUT;}                                               /* gut standing surface (soul sand at GF-1) */
function mgRw(th){return MGC.R_W0+(MGC.R_W1-MGC.R_W0)*(1-Math.abs(Math.cos(MGC.SCALLOPS*th/2)));}   /* wall inner radius, 11 scallops */
function mgPol(x,z){const dx=x-MGC.X,dz=z-MGC.Z;return {r:Math.hypot(dx,dz),th:Math.atan2(dz,dx)};}   /* theta from +x toward +z */
function mgZone(x,y,z){const dx=x-MGC.X,dz=z-MGC.Z,r=Math.hypot(dx,dz);if(r>MGC.R_SITE+0.5)return 'out';
  const F=mgF(),GF=F-MGC.DY_GUT;
  if(r<=MGC.R_ARENA&&y>=F-MGC.ARENA_DN&&y<=F+MGC.ARENA_UP)return 'arena';
  const rw=mgRw(Math.atan2(dz,dx));
  if(r<rw&&y>=GF-2&&y<F-MGC.ARENA_DN)return 'gut';
  if(r<rw&&y>=F-MGC.ARENA_DN&&y<=F+MGC.ARENA_UP)return 'void';
  if(r<=MGC.R_SITE&&y>=GF-MGC.SITE_DN&&y<=F+MGC.SITE_UP)return 'site';
  return 'out';}
function mgIn(x,y,z){const q=mgZone(x,y,z);return q==='arena'||q==='gut'||q==='void';}   /* "inside the Bite" (the volume) */
function mgArena(x,y,z){return mgZone(x,y,z)==='arena';}
function mgSite(x,y,z){const r=Math.hypot(x-MGC.X,z-MGC.Z);if(r>MGC.R_SITE)return false;const F=mgF();return y>=F-MGC.DY_GUT-MGC.SITE_DN&&y<=F+MGC.SITE_UP;}
function mgSiteCell(wx,wy,wz){return mgSite(wx+0.5,wy,wz+0.5);}
function mgInSiteXZ(wx,wz){return Math.hypot(wx+0.5-MGC.X,wz+0.5-MGC.Z)<=MGC.R_SITE;}
function mgBand(y){const G=mgG(),GF=mgGF();return y>=GF-MGC.BAND_DN&&y<=G+MGC.BAND_UP;}   /* everything heavier than the ring needs it */
function mgNoStruct(cx,cz){return Math.hypot(cx-MGC.X,cz-MGC.Z)<MGC.R_STRUCT;}           /* structure cells never centre near the Bite */
function mgCraterSkip(wx,wz){return !DEMON.dead&&mgInSiteXZ(wx,wz);}                     /* the Big Dingle never cuts the site while he lives */
function mgSiteKeys(){const s=new Set(),a=Math.floor((MGC.X-MGC.R_SITE)/CH),b=Math.floor((MGC.X+MGC.R_SITE)/CH),
  c=Math.floor((MGC.Z-MGC.R_SITE)/CH),d=Math.floor((MGC.Z+MGC.R_SITE)/CH);
  for(let cx=a;cx<=b;cx++)for(let cz=c;cz<=d;cz++)s.add(cx+','+cz);return s;}            /* overworld chunk keys carry no prefix */
var MGS=mgSiteKeys();      /* the site's overworld chunk keys (constant): the snapshot filter's O(1) test */

/* ---- saved state: MALG (bible 1.1), written only when it differs from the default (save.mg) ---- */
function mgDefault(){return {v:1,met:0,round:1,dead:0,kills:0,deaths:[0,0,0],gut:null,hat:null,heads:0,offer:null,oldKill:0,seen:0,jaw:0,migr:0,spill:null};}
var MALG=mgDefault();
/* transient fight state (never saved; rebuilt from MALG.round after a death, a reset, a reload or an abandonment) */
function mgFDefault(){return {live:0,boss:null,round:0,att:0,phase:'idle',t:0,w:0,own:new Set(),add:[],near:0,band:0,d:1e9,
  clock:0,attT:0,eye:null,hold:null,cut:0,tok:{},why:''};}
var MGF=mgFDefault();
/* the published look: written by M2, read by M3 (OG) and M4 (HR) every frame; never saved */
var MGL={live:0,round:0,phase:'',w:0,near:0,flash:0,pulse:0,eclipse:0,dawn:0,dark:0,heart:60,light:{at:'chest',i:0,col:0xff5a22}};
/* the shared rig state `s` (bible 5.3): M2 writes it, both skins read it (one skeleton, two skins). Field set frozen. */
function mgAnimDefault(){return {round:1,stance:'idle',heart:60,breathe:0,jaw:0,split:0,tongue:0,armL:{pose:'rest',t:0},armR:{pose:'rest',t:0},
  eyeL:0,eyeR:0,tail:{pose:'rest',t:0},cubeGlow:0,belly:{bulge:0,lift:0,glow:0,items:[]},strata:{tree:0,roof:1},tel:[0,0,0,0,0],
  crack:{hue:0,i:0},rim:0,commit:0,vuln:0,hurt:0,flinch:0,recoil:0,light:{at:'chest',i:1.6,col:0xff5a22},hat:null,heads:0,dead:0,
  yaw:0,x:0,y:0,z:0,lookX:0,lookY:0,lookZ:0};}
var MGA=mgAnimDefault();
/* telemetry for the suites and the harness (M2 fills it; mgTel() returns it) */
var MGT={atk:null,lock:0,impact:0,win:{kind:'',open:0,cap:0,dmg:0,capped:0},hits:[],chomps:0,tokens:{},events:[],tel:[],mech:{},hint:null,clock:0};

/* ---- the knobs (bible Appendix B). Frozen NAMES; M2 may override VALUES at its top level (Object.assign(MG_K,{...})) ---- */
var MG_K={BAR:300,HIDE:0.10,HIDE_BUDGET:15,TONGUE:2.0,LASER_WEAK:0.5,BOOM_WEAK:0.5,BOT:0.5,BOT_FLOOR:30,BOT_WIN:0.5,CAP_HIT:30,
  GATE:0.25,DAN_TOKENS:0.7,PIERCE:0.4,CHOMP:10,STEAL_CAP:3,BILE:1,BILE_T:0.5,GUT_FALL_CAP:4,PLUCK:1.5,PLUCK_DMG:4,DAZE:1.0,
  AWAY_REGEN:10,ABANDON:30,GRACE:2.0,GAP:[0.30,0.60],GAP_LOW:[0.15,0.35],COMMIT:0.35,LOCK_MIN:0.85,SLAP_LOCK:0.95,CHOMP_LOCK:1.0,
  MIN_TELL:0.6,LEAD:0.35,IN_RING:1.5,
  RUBBER:{4:0.85,7:0.70},DEATH_MIN_T:45,DEATH_MIN_DMG:30,DEATH_GRACE:15,GLOAT:3,BELCH:1.2,BOT_BELCH:[15,25],HEADS:5,ADDS_CAP:8};
function mgSetK(k,v){if(!(k in MG_K))return false;MG_K[k]=v;return true;}   /* test seam (unknown names are refused: frozen) */

/* ---- the registry: packages register at THEIR top level (file order m0, m1, m2, m3, then the HR block's m4) ---- */
var MGREG={
  /* M1 · the Bite */
  stamp:null,        /* (blocks,x0,z0) -> void: writes the current layout into a generating overworld chunk that overlaps the site */
  layoutAt:null,     /* (x,y,z) -> block id the current layout wants there, or -1 (outside the site / natural) */
  world:null,        /* the M1 API object (plan 5.1): eat, put, reset, door, safeCell, bonePile, protect, placeOK, grapNo, tick, ... */
  /* M2 · the fight */
  fight:null,        /* the M2 API object (plan 5.2): tick, wake, brain, preHurt, onKill, onDie, onRespawn, steal, egg, ... */
  /* M3 · the OG model and VFX; M4 · Hyperreal */
  rig:{og:null,hr:null},   /* (opts) -> rig (plan 5.3): opts.kind 'boss'|'effigy'|'proxy'; opts.skin 'og'|'hr' */
  mesh:{},           /* mt -> (G,mats,opts) -> {G,legs,mats[,hrM]}: OG bodies of his adds/parts (M3); mesh_hr for HR (M4) */
  mesh_hr:{},
  fx:null,           /* the M3 VFX API object (plan 5.3): draw, burst, dress, decal, ... (M4 may wrap it for HR) */
  hrOn:()=>false,    /* M4: true while the Hyperreal cast is live (core text never names HRE/TP.hr: tB/tC statics) */
  /* shared lists */
  tick:[],onReset:[],onLoad:[],onRound:[],onBoot:[],onFar:[],onNear:[],
  music:null         /* M2: (prev) -> new musicTick, installed by mgBoot OUTSIDE every PART's wrapper */
};
function mgEmit(list){const a=MGREG[list];if(!a||!a.length)return;const args=[].slice.call(arguments,1);
  for(const f of a)try{f.apply(null,args);}catch(err){mgFail(list,err);}}
function mgFail(where,err){MGT.events.push('fail:'+where);if(MGT.events.length>64)MGT.events.shift();
  if(typeof console!=='undefined'&&console.warn)console.warn('[MG] '+where+': '+(err&&err.message||err));}

/* ---- the dispatchers behind the core hooks (hooks_M0.py). Each is O(1) away from the Bite. ---- */
function mgOn(){return MGP_ON&&DIM==='over';}
function mgStampChunk(blocks,x0,z0){                                                    /* M0-03 genChunk (overworld only) */
  if(x0>MGC.X+MGC.R_SITE||x0+CH<MGC.X-MGC.R_SITE||z0>MGC.Z+MGC.R_SITE||z0+CH<MGC.Z-MGC.R_SITE)return;
  if(MGREG.stamp)try{MGREG.stamp(blocks,x0,z0);}catch(err){mgFail('stamp',err);}}
function mgLayoutAt(x,y,z){return MGREG.layoutAt?MGREG.layoutAt(x,y,z):-1;}
function mgMobMesh(mt,G,mats,opts){                                                      /* M0-09 makeMobMesh */
  if(mt==='demon'){const fig=MGF_FIG;MGF_FIG=0;const f=MGREG.rig.og;
    if(f){const r=f({kind:fig?'proxy':'effigy',skin:'og'});if(r&&r.root){r.root.userData.mgRig=r;return {G:r.root,legs:[],mats:[]};}}
    return mgFallbackMesh(G,mats,fig?0:1);}
  const fh=opts&&opts.hr&&MGREG.hrOn()?MGREG.mesh_hr[mt]:null;
  if(fh){const r=fh(G,mats,opts);if(r)return r;}
  const f=MGREG.mesh[mt];if(f){const r=f(G,mats,opts);if(r)return r;}
  return mgFallbackMesh(G,mats,0);}
function mgFallbackMesh(G,mats,light){                                                   /* never crash on a missing body */
  const m=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0x3d1014,emissive:new THREE.Color(0.5,0.12,0.02)}));
  m.position.y=1;G.add(m);
  if(light){const l=new THREE.PointLight(0xff5a22,1.6,30);l.position.y=2;G.add(l);}
  return {G,legs:[],mats:[]};}
function mgPreHurt(e,dmg,kx,kz){                                                         /* M0-11 hurtMob: ALWAYS handled here (-1) */
  if(e.mt==='demon'&&!e.mgBoss)return -1;                                                /* the Effigy shrugs everything */
  if(e.mt==='mgeye'){const W=MGREG.world;if(W&&W.poke)try{W.poke(e,dmg,HIT_BY,HIT_HOW);}catch(err){mgFail('poke',err);}return -1;}   /* M1: the summon */
  const F=MGREG.fight;
  try{if(F&&F.preHurt){const r=F.preHurt(e,dmg,kx,kz);if(r>=0&&MOBT[e.mt].mg==='add')mgAddHurt(e,r,kx,kz);return -1;}}
  catch(err){mgFail('preHurt',err);return -1;}
  if(MOBT[e.mt].mg==='add')mgAddHurt(e,dmg,kx,kz);
  return -1;}                                                                            /* never the generic path: no killMob, no rolls */
function mgAddHurt(e,dmg,kx,kz){                                                          /* the default for his adds (M2 may do its own) */
  if(e.dead||dmg<=0||e.hurtT>0.25)return;
  e.hp-=dmg;e.hurtT=0.5;for(const m of e.mats)m.emissive&&m.emissive.setRGB(0.45,0,0);
  if(kx!==undefined){const l=Math.hypot(kx,kz)||1;e.vx+=kx/l*2.5;e.vz+=kz/l*2.5;e.vy=Math.max(e.vy,3);}
  if(e.hp<=0)mgAddDie(e);}
function mgAddDie(e){if(e.dead)return;const F=MGREG.fight;                                /* drops (M2's onKill), 2 XP, a puff; never killMob */
  if(F&&F.onKill)try{F.onKill(e);}catch(err){mgFail('onKill',err);}
  spawnXP(e.x,e.y+0.5,e.z,MOBT[e.mt].xp||2);burstParticles(e.x,e.y+e.h*0.5,e.z,B.TNT,8,0.5);removeEnt(e);}
function mgBrain(e,dt,T){                                                                /* M0-15 updateMob */
  if(e.mt==='demon'&&!e.mgBoss)return mgEffigyBrain(e,dt);
  const F=MGREG.fight;
  if(F&&F.brain)try{return F.brain(e,dt,T);}catch(err){mgFail('brain',err);}
  if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);}
function mgSteal(e,amt){if(!MOBT[e.mt]||!MOBT[e.mt].mg)return amt;const F=MGREG.fight;   /* M0-12: other mobs unchanged */
  return F&&F.steal?Math.max(0,+F.steal(e,amt)||0):0;}
function mgTag(e,how){if(!e||!MOBT[e.mt]||!MOBT[e.mt].mg)return false;HIT_BY='Dan';HIT_HOW=how;return true;}   /* M0-13 */
function mgNadeOwner(e){return mgOn()&&mgSite(e.x,e.y,e.z)?'Dan':undefined;}             /* M0-14: v6.2 behaviour elsewhere */
function mgEditsSave(k,ed){const o={};let n=0;                                           /* M0-17: his edits are never saved */
  const cc=k.split(','),bx=+cc[0]*CH,bz=+cc[1]*CH;
  for(const [lk,id] of ed){if(!DEMON.dead){const p=lk.split(',');if(mgSiteCell(bx+ +p[0],+p[1],bz+ +p[2]))continue;}o[lk]=id;n++;}
  return n?o:null;}
function mgSaveFields(){                                                                  /* M0-19: v6.2-shaped until Dan meets him */
  return JSON.stringify(MALG)===JSON.stringify(mgDefault())?{}:{mg:JSON.parse(JSON.stringify(MALG))};}
function mgLoad(d){                                                                       /* M0-21: right after crLoad, before any chunk */
  MALG=mgDefault();MGF=mgFDefault();MGA=mgAnimDefault();
  const m=d&&d.mg;
  if(m&&typeof m==='object'){const D=mgDefault();
    for(const k in D){if(!(k in m))continue;const v=m[k];
      if(k==='deaths'){if(Array.isArray(v))MALG.deaths=[0,1,2].map(i=>Math.max(0,v[i]|0));}
      else if(k==='gut'||k==='offer'||k==='spill'){MALG[k]=v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):null;}
      else if(k==='hat'){MALG.hat=typeof v==='string'?v:null;}
      else MALG[k]=+v||0;}
    MALG.round=Math.max(1,Math.min(MGC.ROUNDS,MALG.round|0));MALG.heads=Math.max(0,Math.min(MG_K.HEADS,MALG.heads|0));}
  mgEmit('onLoad',d);}
function mgVerLess(v,w){const a=String(v||'0').split('.').map(Number),b=String(w).split('.').map(Number);
  for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x<y;}return false;}
function mgLoadDemon(d){                                                                  /* M0-22: after the core restored DEMON + edits */
  if(d&&d.mg)DEMON.dead=!!MALG.dead;
  else{const old=!!d&&mgVerLess(d.v,'6.3');
    if(old){MALG.oldKill=d.demon&&d.demon.dead?1:0;mgMigrate();}                         /* bible 15.6: every world gets the new Malgorath */
    DEMON.dead=false;}
  DEMON.cutSeen=false;}
function mgMigrate(){                                                                     /* old arena edits and block entities in the site */
  for(const k of MGS){const ed=chunkEdits.get(k);if(!ed||!ed.size)continue;const cc=k.split(','),bx=+cc[0]*CH,bz=+cc[1]*CH;
    for(const lk of [...ed.keys()]){const p=lk.split(',');if(mgSiteCell(bx+ +p[0],+p[1],bz+ +p[2]))ed.delete(lk);}}
  const spill=[];
  for(const [k,be] of [...blockEnts]){if(k[1]===';')continue;const p=k.split(',').map(Number);if(!mgSiteCell(p[0],p[1],p[2]))continue;
    if(typeof CR_BET!=='undefined'&&CR_BET[be.t]){try{if(be.id)crLost(k,be);}catch(err){mgFail('migrate-cr',err);}blockEnts.delete(k);continue;}
    let held=[];if(Array.isArray(be.inv))held=be.inv;else if(be.t==='disp'){if(be.fig)held=[{id:IT.FIGURINE,count:1,mob:be.fig}];}
    else if(be.t!=='terr')held=[be.in,be.fuel,be.out];
    for(const st of held)if(st&&st.count>0)spill.push(JSON.parse(JSON.stringify(st)));
    blockEnts.delete(k);}
  if(spill.length)MALG.spill=(MALG.spill||[]).concat(spill);
  MALG.migr=1;}
function mgReset(){MALG=mgDefault();MGF=mgFDefault();MGA=mgAnimDefault();MGP_ON=false;   /* M0-20: new worlds inherit nothing */
  MGL.live=0;MGL.round=0;MGL.near=0;MGL.w=0;MGT.hits.length=0;MGT.events.length=0;MGT.tel.length=0;MGT.mech={};MGT.hint=null;mgEmit('onReset');}
function mgOnDie(){const F=MGREG.fight;if(!F||!F.onDie||DIM!=='over')return false;        /* M0-31: true = it took the inventory */
  try{return !!F.onDie();}catch(err){mgFail('onDie',err);return false;}}
function mgOnRespawn(){const F=MGREG.fight;if(F&&F.onRespawn&&DIM==='over')try{F.onRespawn();}catch(err){mgFail('onRespawn',err);}}   /* M0-32 */
function mgProtect(x,y,z,id){                                                             /* M0-33 setBlock: true = refuse the write */
  if(DIM!=='over'||MGF.w||DEMON.dead||!mgSiteCell(x,y,z))return false;
  const W=MGREG.world;if(W&&W.protect)return !!W.protect(x,y,z,id);
  return mgHis(x,y,z,id);}
function mgHis(x,y,z,id){                                                                 /* the default rule (bible 3.7 rule 1) */
  const old=getBlock(x,y,z);if(old===B.AIR||old===id)return false;                       /* placing into air is allowed (then eaten) */
  const ch=chunkAt(x,z);if(!ch)return false;
  const lk=(x-ch.cx*CH)+','+y+','+(z-ch.cz*CH);
  return !ch.edits.has(lk)||MGF.own.has(bkey(x,y,z));}                                   /* generated, or written by him */
function mgProtected(x,y,z,tag){if(!mgOn())return false;const r=mgProtect(x,y,z,B.AIR);   /* M0-34..38, 54..55: breakers ask first */
  if(r){MGT.events.push('prot:'+tag);if(MGT.events.length>64)MGT.events.shift();}return r;}
function mgPlaceOK(x,y,z,id){if(!mgOn()||DEMON.dead||!mgIn(x+0.5,y,z+0.5))return true;   /* M0-41: no block entities in the Bite */
  const W=MGREG.world;if(W&&W.placeOK)return !!W.placeOK(x,y,z,id);
  const d=DEFS[id];return !(d&&(d.interact||d.cr));}
function mgNoPortal(x,y,z){return mgOn()&&mgSiteCell(x,y,z);}                             /* M0-43 */
function mgBlinkFail(){const F=MGREG.fight;return !!(mgOn()&&F&&F.blinkFail&&F.blinkFail());}   /* M0-44 */
function mgGrapNo(hg){if(!mgOn()||DEMON.dead)return false;const W=MGREG.world;            /* M0-45 */
  if(W&&W.grapNo)return !!W.grapNo(hg);return mgSiteCell(hg.x,hg.y,hg.z)&&hg.id!==B.BEDROCK&&mgHis(hg.x,hg.y,hg.z,B.AIR);}
function mgGrapCut(){const F=MGREG.fight;return !!(mgOn()&&F&&F.grapCut&&F.grapCut());}   /* M0-46 */
function mgNoSpawn(x,z){return mgOn()&&MGF.live&&Math.hypot(x-MGC.X,z-MGC.Z)<MGC.R_SPAWN;}   /* M0-47 */
function mgEggUse(st,hit,x,y,z){const W=MGREG.world;                                      /* M0-29: never spawnMob (M1: offering or ash) */
  if(W&&W.egg)try{if(W.egg(st,hit,x,y,z))return;}catch(err){mgFail('egg',err);}
  showToast('The ground rumbles. Something far away is not hungry yet.');}
function mgBall(e,m){if(!m||!MOBT[m.mt]||!MOBT[m.mt].mg)return false;                    /* M0-30: balls bounce off everything of his */
  e.vx=-e.vx*0.5;e.vz=-e.vz*0.5;e.vy=Math.max(e.vy,2);burstParticles(e.x,e.y,e.z,B.STONE,4,0.4);playS('thud');return true;}
function mgSwingMiss(e,d,hit){const F=MGREG.fight;if(F&&F.swingMiss)try{F.swingMiss(e,d,hit);}catch(err){mgFail('swing',err);}}   /* M0-35 */
function mgBotShield(a,by,how){const F=MGREG.fight;return !!(F&&F.botShield&&F.botShield(a,by,how));}   /* M0-49 */
function mgBotKeep(a){const F=MGREG.fight;return !!(F&&F.botKeep&&F.botKeep(a));}        /* M0-50 */
function mgBotSpawn(a){const F=MGREG.fight;return F&&F.botSpawn?F.botSpawn(a):null;}      /* M0-51 */
function mgBotNo(st){return !!st&&st.id===MGC.JAW;}                                       /* M0-53: bots never hold the Jaw */
function mgDeathMsg(name,by,how){const F=MGREG.fight;if(F&&F.deathMsg){const s=F.deathMsg(name,by,how);if(s)return s;}   /* M0-58 */
  const L={slap:'was slapped flat by',swat:'was swatted by',tail:'was thrown by the tail of',squat:'was squashed under',stomp:'was stomped by',
    drag:'was dragged by',grind:'was ground up by',crumb:'was spat on by',debris:'was hit by the leftovers of',bile:'was digested by',
    fall:'fell into the gut of',boom:'was blown up by',chomp:'was chomped by',supper:'was the last supper of',husk:'was killed by a Husk of',morsel:'was bitten by a Morsel of'};
  return name+' '+(L[how]||'was eaten by')+' Malgorath';}
function tickMalg(dt){                                                                    /* M0-26: the watcher (overworld group) */
  if(!playing||!P)return;
  const dx=P.x-MGC.X,dz=P.z-MGC.Z;
  if(dx*dx+dz*dz>MGC.R_ARM*MGC.R_ARM){if(MGF.near)mgFar();return;}                       /* O(1), allocation-free, no random */
  if(!MGF.near){MGF.near=1;mgEmit('onNear');}
  MGF.d=Math.hypot(dx,dz);MGF.band=mgBand(P.y)?1:0;MGL.near=1;MGF.clock+=dt;MGT.clock=MGF.clock;   /* the fight clock: only m0 advances it */
  MGP_ON=!DEMON.dead;
  if(MGF.d<MGC.R_TOAST&&!DEMON.toasted&&!DEMON.dead){DEMON.toasted=true;showToast('The air tastes of ash. Something old is waiting...');}
  mgFlushAdds();
  mgDeliverSpill();
  const W=MGREG.world,F=MGREG.fight;
  if(W&&W.tick)try{W.tick(dt);}catch(err){mgFail('world',err);}
  if(F&&F.tick)try{F.tick(dt);}catch(err){mgFail('fight',err);}
  mgEmit('tick',dt);}
function mgFar(){MGF.near=0;MGP_ON=false;MGL.near=0;MGL.w=0;mgAbandon('far');mgEmit('onFar');}
function mgAbandon(why){const F=MGREG.fight;if(MGF.live&&F&&F.dormant)try{F.dormant(why);}catch(err){mgFail('dormant',err);}}   /* bible 15.4 */
function mgStashed(e){removeEnt(e);if(e===MGF.boss){MGF.boss=null;mgAbandon('dim');}}     /* M0-24: a dimension change purges, never stashes */
function mgBoot(){                                                                         /* M0-48: after every PART loaded, at boot */
  if(MGREG.music&&typeof musicTick==='function')try{const f=MGREG.music(musicTick);if(typeof f==='function')musicTick=f;}catch(err){mgFail('music',err);}
  if(typeof mpDoorTimer==='function'){const t0=mpDoorTimer;                                /* the Stage Door's 10 minutes pause near him */
    mpDoorTimer=function(dt){if(DIM==='over'&&P&&!P.dead&&!DEMON.dead&&Math.hypot(P.x-MGC.X,P.z-MGC.Z)<MGC.R_DOOR_PAUSE)return;return t0(dt);};}
  if(typeof mpFindDoorSite==='function'){const f0=mpFindDoorSite;                          /* ...and its last-resort site keeps clear of him */
    mpFindDoorSite=function(){const s=f0();if(s&&Math.hypot(s.x-MGC.BX,s.z-MGC.BZ)<MGC.R_DOOR_EXCL){const a=Math.atan2(s.z-MGC.BZ,s.x-MGC.BX);
        s.x=Math.floor(MGC.BX+Math.cos(a)*(MGC.R_DOOR_EXCL+10));s.z=Math.floor(MGC.BZ+Math.sin(a)*(MGC.R_DOOR_EXCL+10));forceChunksNear(s.x,s.z);s.y=surfaceTop(s.x,s.z)+1;}
      return s;};}
  mgEmit('onBoot');}

/* ---- entities: the boss, his parts, the eye and his adds (never saved, never stashed, never restored) ---- */
function mgIsHis(e){return !!(e&&e.t==='mob'&&MOBT[e.mt]&&MOBT[e.mt].mg);}
function mgEnt(mt,x,y,z,G,o){const T=MOBT[mt];                                             /* the spawnMob entity shape, no makeMobMesh */
  return Object.assign({t:'mob',mob:true,mt,hp:T.hp,hw:T.hw,h:T.h,hostile:!!T.hostile,x,y,z,vx:0,vy:0,vz:0,onGround:false,yaw:0,
    mode:'idle',tT:0,dir:0,atkT:0,hurtT:0,burnAcc:0,fuse:0,hissed:false,mesh:G,legs:[],mats:[],hrM:null,anim:0,pkeep:1},o||{});}
function mgAddEnt(e,ahead){MGF.add.push([e,ahead||null]);return e;}                      /* queued: inserted by tickMalg, never mid-loop */
function mgFlushAdds(){if(!MGF.add.length)return;
  for(const [e,ah] of MGF.add.splice(0)){if(e.mesh&&!e.mesh.parent)scene.add(e.mesh);
    const i=ah?entities.indexOf(ah):-1;if(i>=0)entities.splice(i,0,e);else entities.push(e);}}   /* parts AHEAD of the boss: arrows test them first */
function mgPurge(keepBoss){for(const e of entities){if(e.dead||!mgIsHis(e))continue;   /* parts, adds and the eye (and the boss unless kept) */
    if(e.mt==='demon'&&!e.mgBoss)continue;                                               /* an Effigy runs its own 6 s clock */
    if(e.mgBoss&&keepBoss)continue;removeEnt(e);}
  MGF.add.length=0;if(!keepBoss)MGF.boss=null;}
function mgSpawnBoss(round){                                                              /* only from tickMalg (M2's fight.tick) */
  const F=mgF(),skin=MGREG.hrOn()&&MGREG.rig.hr?'hr':'og',f=MGREG.rig[skin]||MGREG.rig.og;
  let r=null;if(f)try{r=f({kind:'boss',skin,round});}catch(err){mgFail('rig',err);}
  const G=r&&r.root?r.root:mgFallbackMesh(new THREE.Group(),[],1).G;
  const e=mgEnt('demon',MGC.X,F,MGC.Z,G,{mgBoss:1,mgRig:r,mgSkin:skin,mgNoBot:1,hp:MG_K.BAR,round:round|0||1});
  if(typeof shadowify==='function'&&skin==='og')shadowify(G);
  G.position.set(e.x,e.y,e.z);
  for(const x of entities)if(!x.dead&&x.mt==='demon'&&x.mgBoss)removeEnt(x);                /* never two */
  scene.add(G);entities.push(e);MGF.boss=e;return e;}
function mgPart(kind,o){const G=new THREE.Group();                                        /* a weak point: a box that follows a joint */
  const e=mgEnt('mgpart',MGC.X,mgF(),MGC.Z,G,Object.assign({kind,mgNoBot:0},o||{}));
  return mgAddEnt(e,MGF.boss);}
function mgCut(script){script=script||{};if(!script.lines)script.lines=[];if(script.end==null)script.end=3;   /* an overworld CUT.script */
  CUT.script=script;MGF.cut=1;startCut();}

/* ---- the Effigy: any raw spawnMob('demon') (old critter jars, debug spawns, tB_smoke): docile 4 s, sinks 2 s, gone (bible 4.5) ---- */
function mgEffigyBrain(e,dt){e.mgNoBot=1;e.mgBar=1;e.ef=(e.ef||0)+dt;
  const r=e.mesh&&e.mesh.userData&&e.mesh.userData.mgRig;
  if(r&&r.update)try{r.update(dt,null);}catch(err){mgFail('effigy',err);}
  const sink=Math.max(0,e.ef-4)/2;
  if(e.mesh){e.mesh.position.set(e.x,e.y-sink*Math.max(2,e.h),e.z);e.mesh.rotation.y=e.yaw;}
  if(e.ef>=6)removeEnt(e);}

/* ---- the overworld spill (old block entities from the migration, delivered at the Bone Pile once its chunk is loaded) ---- */
function mgBonePile(){const W=MGREG.world;if(W&&W.bonePile)return W.bonePile();
  return {x:MGC.X-42,y:mgG()+1,z:MGC.Z,yaw:-Math.PI/2};}
function mgDeliverSpill(){if(!MALG.spill||!MALG.spill.length||MGF.d>MGC.R_SPAWN)return;const b=mgBonePile();
  if(!chunkAt(Math.floor(b.x),Math.floor(b.z)))return;
  for(const st of MALG.spill.splice(0))spawnDrop(b.x,b.y+0.6,b.z,st,0,1.5,0);MALG.spill=null;}

/* ---- his own block writes (they pass the setBlock gate and stay protected: MGF.own). M1's queue and every M2 bite use it ---- */
function mgWrite(x,y,z,id){MGF.w=1;try{setBlock(x,y,z,id);}finally{MGF.w=0;}MGF.own.add(bkey(x,y,z));return true;}
/* revert every edit inside the site to what the generator writes (the scaffold's reset; M1's queue replaces it for live play) */
function mgRevertSite(){let n=0;const keep=MGF.w;MGF.w=1;
  try{for(const k of MGS){const ed=chunkEdits.get(k);if(!ed||!ed.size)continue;const cc=k.split(','),cx=+cc[0],cz=+cc[1],bx=cx*CH,bz=cz*CH;
      const ch=chunks.get(k);let gen=null;
      for(const lk of [...ed.keys()]){const p=lk.split(','),x=bx+ +p[0],y=+p[1],z=bz+ +p[2];if(!mgSiteCell(x,y,z))continue;
        if(ch){if(!gen)gen=genChunk(cx,cz);const want=gen[bidx(+p[0],y,+p[2])];if(ch.bl[bidx(+p[0],y,+p[2])]!==want)setBlock(x,y,z,want);}
        ed.delete(lk);n++;}}}
  finally{MGF.w=keep;}MGF.own.clear();return n;}

/* ---- the telegraph channel (bible 7.3): every drawing Dan sees goes through mgDraw, so the harness pilots, the "you're in it" rim
   and the bots' danger query read exactly what is on screen. M3 renders it (MGREG.fx.draw); M2 decides what and when. ----
   o: {col:'white'|'red'|'violet'|'gold', shape:'disc'|'ring'|'band'|'line'|'crescent'|'box', x,z (centre or start), r (disc/ring
   outer, crescent radius), r0 (ring/band inner), th (band centre angle about C), dth (band half-width, rad), len,w,yaw (line: from
   x,z along yaw for len, w wide), y0,y1 (absolute height range of the hit volume), locked, lockT, impactT, front (a jump cue)} */
var MGTEL_N=0;
function mgDraw(kind,o){o=o||{};const t=Object.assign({id:++MGTEL_N,kind,col:'white',shape:'disc',x:MGC.X,z:MGC.Z,r:1,locked:0,lockT:0,impactT:0,front:0,t0:MGF.clock},o);
  MGT.tel.push(t);const fx=MGREG.fx&&MGREG.fx.draw?MGREG.fx.draw(kind,t):null;
  return {t,set:function(p){if(p)Object.assign(t,p);if(fx&&fx.set)fx.set(t);},
    lock:function(){if(!t.locked){t.locked=1;t.lockT=MGF.clock;MGT.lock=MGF.clock;}if(fx&&fx.set)fx.set(t);},
    free:function(){const i=MGT.tel.indexOf(t);if(i>=0)MGT.tel.splice(i,1);if(fx&&fx.free)fx.free();}};}
function mgTelHit(t,x,y,z){if(t.y0!=null&&(y<t.y0||y>(t.y1==null?t.y0+4:t.y1)))return false;   /* is a FEET position inside the drawing's hit volume */
  const dx=x-t.x,dz=z-t.z,d=Math.hypot(dx,dz);
  if(t.shape==='disc')return d<=t.r;
  if(t.shape==='ring')return d<=t.r&&d>=(t.r0||0);
  if(t.shape==='box')return Math.abs(dx)<=(t.w||t.r)&&Math.abs(dz)<=(t.w||t.r);
  if(t.shape==='crescent')return d<=t.r&&Math.hypot(x-MGC.X,z-MGC.Z)>=(t.r0||0);
  if(t.shape==='band'){const p=mgPol(x,z);let a=Math.abs(((p.th-(t.th||0))%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI);return p.r>=(t.r0||0)&&p.r<=t.r&&a<=(t.dth==null?Math.PI:t.dth);}
  if(t.shape==='line'){const ux=-Math.sin(t.yaw||0),uz=-Math.cos(t.yaw||0),along=dx*ux+dz*uz,side=Math.abs(-dx*uz+dz*ux);return along>=0&&along<=(t.len||0)&&side<=(t.w||1)/2;}
  return false;}
function mgTelEscape(t,x,z){let dx=x-t.x,dz=z-t.z;                                       /* unit (x,z) of the shortest way out */
  if(Math.hypot(dx,dz)<1e-3){dx=x-MGC.X;dz=z-MGC.Z;if(Math.hypot(dx,dz)<1e-3){dx=1;dz=0;}}   /* dead centre: away from him */
  const d=Math.hypot(dx,dz);
  if(t.shape==='line'){const ux=-Math.sin(t.yaw||0),uz=-Math.cos(t.yaw||0),side=-dx*uz+dz*ux,s=side>=0?1:-1;return [-uz*s,ux*s];}
  if(t.shape==='band'||t.shape==='crescent'){const p=mgPol(x,z),mid=((t.r0||0)+t.r)/2,s=p.r>=mid?1:-1,cx=x-MGC.X,cz=z-MGC.Z,l=Math.hypot(cx,cz)||1;return [cx/l*s,cz/l*s];}
  return [dx/d,dz/d];}
function mgMech(name){const r=MGF.round||MALG.round||1;const m=MGT.mech[r]||(MGT.mech[r]={});m[name]=(m[name]||0)+1;}   /* a mechanic fired (harness (c)) */

/* ---- the hit helpers every attack uses (bible 7.1). M2 may replace them through MGREG.fight.hit/chomp/knock ---- */
function mgHit(t,n,p,how,opt){const F=MGREG.fight;if(F&&F.hit)return F.hit(t,n,p,how,opt);
  opt=opt||{};if(t!==P||P.dead||P.mode==='c'||GR.god||(CUT.on&&CUT.script))return 0;
  const A=Math.min(0.8,armorPts()*0.04),pp=p==null?MG_K.PIERCE:p,eff=n*(1-A*(1-pp)),pre=A<1?eff/(1-A):eff;
  LASTDMG={by:'Malgorath',how:'mg:'+(how||'hit'),t:AG_T};
  const h0=P.hp;if(opt.tick){const s=P.hurtT;P.hurtT=0;damagePlayer(pre);if(!P.dead)P.hurtT=s;}else damagePlayer(pre,opt.kx,opt.kz);
  return h0-P.hp;}

/* ---- test and info seams ---- */
function mgSkipTo(r,o){const F=MGREG.fight;if(F&&F.skipTo)return F.skipTo(r,o);           /* round r live now, no intro (debug rows, suites) */
  if(DEMON.dead||!F)return false;MALG.met=1;MALG.round=Math.max(1,Math.min(MGC.ROUNDS,r|0||1));
  if(MGF.live&&F.dormant)F.dormant('skip');return !!(F.wake&&F.wake('skip'));}
function mgHitAs(e,dmg,by,how){if(!e||e.dead)return 0;const pb=HIT_BY,ph=HIT_HOW,h0=e.hp;HIT_BY=by||'Dan';HIT_HOW=how||'melee';e.hurtT=0;   /* attributed hit */
  try{hurtMob(e,dmg,0,0);}finally{HIT_BY=pb;HIT_HOW=ph;}return h0-e.hp;}
function mgInfo(){return {stubs:MGEX.mgStubs,live:MGF.live,round:MALG.round,met:MALG.met,dead:!!DEMON.dead,near:MGF.near,band:MGF.band,
  d:MGF.d,prot:!!MGP_ON,boss:!!(MGF.boss&&!MGF.boss.dead),hp:MGF.boss&&!MGF.boss.dead?MGF.boss.hp:0,phase:MGF.phase,F:mgF(),GF:mgGF(),G:mgG(),
  ents:entities.filter(e=>!e.dead&&mgIsHis(e)).length};}
function mgCore(){return {chunkEdits,blockEnts,entities,MGS,MGF,MGL,MGA,MGT,MGREG,CUT,WIN,DEMON,LASTDMG:()=>LASTDMG,setBlock,getBlock,chunkAt,
  bkey,ckey,genChunk,createChunk,removeEnt,spawnMob,hurtMob,damagePlayer,armorPts,moveBody,pickMob,raycastB,die,respawn,snapshot,applySave,
  resetWorld,stashEnts,unstashEnts,setDim,forceChunksNear,surfaceTop,eyePos,lookDir,closeModal,modalOpen,MOB_NAME,openWin,closeWin,CMP_DEFS:typeof CMP_DEFS!=='undefined'?CMP_DEFS:null};}

/* his mob types (frozen names; M2 tunes the numbers through MG_K and its own tables). pnc: never counted by the ambient caps nor
   despawned by distance; mg: the PART 57 routes (makeMobMesh, updateMob, hurtMob, killMob, saves, stash, balls, bars) */
MOBT.mgeye={hp:1e9,hw:0.35,h:0.7,spd:0,dmg:0,hostile:false,xp:0,pnc:1,mg:'eye',body:'#d8a020',legc:'#401000'};
MOBT.mgpart={hp:1e9,hw:0.6,h:1.0,spd:0,dmg:0,hostile:true,xp:0,pnc:1,mg:'part',body:'#ffd060',legc:'#402000'};
MOBT.mgmorsel={hp:12,hw:0.6,h:1.2,spd:4.2,dmg:3,hostile:true,xp:2,pnc:1,mg:'add',body:'#6a8a3a',legc:'#4a3020'};
MOBT.mghusk={hp:30,hw:0.3,h:1.8,spd:4.3,dmg:5,hostile:true,xp:2,pnc:1,mg:'add',body:'#2a1a14',legc:'#140c08'};
MOBT.mgbloat={hp:16,hw:0.42,h:1.7,spd:2.4,dmg:9,hostile:true,xp:2,pnc:1,mg:'add',body:'#5a7a2a',legc:'#2a3a10'};
MOB_NAME.mgmorsel='a Morsel';MOB_NAME.mghusk='a Husk';MOB_NAME.mgbloat='a Bloater';MOB_NAME.mgeye='Malgorath';MOB_NAME.mgpart='Malgorath';

/* Malgorath's Jaw (item 365; bible 14.2). The id and the base def are the contract; M2 owns its behaviour (d.mgUse, the bite). */
var IT_MG_JAW=MGC.JAW;IT.MG_JAW=MGC.JAW;
idef(MGC.JAW,{name:"Malgorath's Jaw",icon:'tool_3_3',stack:1,hide:true,tool:{type:'sword',tier:3,mult:11,dur:900,dmg:10},mgJaw:1,
  ipaint:(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#d8cfb8';c.fillRect(3,11,10,3);c.fillStyle='#5a1a14';c.fillRect(4,5,8,6);
    c.fillStyle='#f4ecd8';for(let i=0;i<4;i++){c.fillRect(4+i*2,5,1,2);c.fillRect(5+i*2,9,1,2);}c.fillStyle='#ff6a1a';c.fillRect(7,7,2,1);}});

/* ---- exports (spread into __vox right after PGEX: TPEX and core keys win; m_static checks no key is shadowed) ---- */
var MGEX={mgStubs:'',getMALG:()=>MALG,getMGF:()=>MGF,getMGL:()=>MGL,getMGA:()=>MGA,mgTel:()=>MGT,mgSetK,getMGK:()=>MG_K,mgInfo,mgCore,
  mgG,mgF,mgGF,mgRw,mgPol,mgZone,mgIn,mgArena,mgSite,mgSiteCell,mgInSiteXZ,mgBand,mgNoStruct,mgLayoutAt,mgHit,mgReset,mgDefault,
  mgAddHurt,mgAddDie,mgDraw,mgTelHit,mgTelEscape,mgMech,mgSaveFields,mgLoad,mgLoadDemon,mgVerLess,mgProtect,mgWrite,mgRevertSite,mgProtected,mgPlaceOK,mgBonePile,mgSpawnBoss,mgPurge,mgPart,mgCut,mgDeathMsg,
  tickMalg,mgOn,mgSkipTo,mgHitAs,MGC,MGREG};
MGEX.__mgx=MGEX;
