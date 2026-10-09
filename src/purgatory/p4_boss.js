/* ---- PART 55: p4_boss.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p4_boss.js (P4): the rules every headliner follows (bible 10.0) and the shared machinery the three boss files use.
   - MOBT rows for the headliners, the Pig-fight mobs and every P4 prop (all pmob:1; props prop:1,pnc:1, hp 999)
   - the live fight (MPF.fight): Dan-only summon, keep-alive and the 15 s reset, phases with Dan-hit-in-10-s, the phase
     clamp, the 45% window cap, bots x0.5, the Plunger arena cap, charge-proofing, Lost Property in fights (gloat, heal to the
     phase start, wait on the Understudy Mark), the rubber band from the 3rd death, tomato hints on the 2nd/4th, intros,
     Intermission, loot to the inventory + the Headliner Trunk, the reveals (beacons)
   - hnState / hnSkipTo / hnCounters (the interface, plan 6.1), HN_NAMES
   - the arena prop/decoration manager, OG rig helpers (shared unit box, googly eyes whose pupils lock before every attack,
     hinged jaws), pooled effect meshes (aim lines, landing rings, shadows, smoke), the Det Cord spark walker
   Determinism: nothing here runs outside purgatory except the registrations themselves. THREE objects are built lazily.
   --------------------------------------------------------------------------------------------------------------------- */

/* ---- tuning (bible 13.2 knobs) ---- */
var HN_PH={bomber:[200,130,60,0],bigpig:[300,225,105,0],bigfrog:[360,240,126,0]};      /* phase tops; phase p runs PH[p-1] -> PH[p] */
var HN_CAPS={bomber:[31,31,27],bigpig:[33,54,47],bigfrog:[54,51,57]};                   /* 45% of each phase pool (bible 10.0 table) */
var HN_K={reset:15,danHit:10,pinv:2.4,gloat:3,inter:90,rubber:0.85,plCap:25,plCd:8,introT:3.2,wake:62,leave:84};
var HN_ORDER=['bomber','bigpig','bigfrog'];
var HN_MT={bomber:'pgbomber',bigpig:'pgbigpig',bigfrog:'pgbigfrog'};
var HN_TITLE={bomber:'LADIES AND GENTLEMEN... THE DEMOLITIONIST.',bigpig:'LADIES AND GENTLEMEN... THE PIG.',bigfrog:'AND NOW... THE MANAGEMENT.'};

/* ---- MOBT (plan 2.4, bible 20.2). legc never legs; drops {id,min,max}; every row pmob:1 ---- */
Object.assign(MOBT,{
  pgbomber:{hp:200,hw:0.4,h:1.8,spd:1.4,dmg:0,xp:60,hostile:true,boss:1,pboss:1,kbRes:0.9,pmob:1,body:'#22201e',legc:'#4a2a1a'},
  pgbigpig:{hp:300,hw:0.5,h:2.0,spd:1.5,dmg:4,xp:80,hostile:true,boss:1,pboss:1,kbRes:0.9,pmob:1,body:'#f2a6c1',legc:'#b98ad6'},
  pgbigfrog:{hp:360,hw:0.5,h:1.7,spd:0,dmg:0,xp:100,hostile:true,boss:1,pboss:1,kbRes:1,pmob:1,body:'#4ca82b',legc:'#2f7a1c'},
  pgpiglet:{hp:6,hw:0.32,h:0.62,spd:1.5,dmg:1,xp:2,hostile:true,pmob:1,body:'#f2a6c1',legc:'#d98aa6',drop:{id:IT.PG_HAM,min:1,max:1}},
  pghog:{hp:20,hw:0.35,h:1.6,spd:1.0,dmg:2,xp:6,hostile:true,pmob:1,body:'#f0a0b8',legc:'#e8e8ee',drop:{id:IT.PG_HAM,min:2,max:2}},
  pgtoss:{hp:999,hw:0.35,h:0.6,spd:0,dmg:0,xp:0,prop:1,pnc:1,pmob:1,body:'#f2a6c1',legc:'#d98aa6'},
  pgbundle:{hp:999,hw:0.25,h:0.4,spd:0,dmg:0,xp:0,prop:1,pnc:1,pmob:1,body:'#c0283a',legc:'#4a2a1a'},
  pgstation:{hp:999,hw:0.5,h:1.0,spd:0,dmg:0,xp:0,prop:1,pnc:1,pmob:1,body:'#8a8a90',legc:'#3a3a40'},
  pgbigone:{hp:999,hw:1.5,h:3.0,spd:0,dmg:0,xp:0,prop:1,pnc:1,pmob:1,body:'#141418',legc:'#3a3a40'},
  pgcleat:{hp:999,hw:0.3,h:0.6,spd:0,dmg:0,xp:0,prop:1,pnc:1,pmob:1,body:'#8a6a3a',legc:'#3a2a1a'},
  pgspot:{hp:999,hw:0.4,h:0.6,spd:0,dmg:0,xp:0,prop:1,pnc:1,pmob:1,body:'#2a2a30',legc:'#1a1a1e'},
  pgtip:{hp:999,hw:0.25,h:0.25,spd:0,dmg:0,xp:0,prop:1,pnc:1,pmob:1,body:'#e8608a',legc:'#b03060'},
  pgelbow:{hp:999,hw:0.9,h:1.2,spd:0,dmg:0,xp:0,prop:1,pnc:1,pmob:1,body:'#e8b9a0',legc:'#c99a84'},
  pgfinger:{hp:999,hw:0.5,h:1.5,spd:0,dmg:0,xp:0,prop:1,pnc:1,pmob:1,body:'#e8b9a0',legc:'#c99a84'},
  pgshand:{hp:999,hw:4.0,h:3.0,spd:0,dmg:0,xp:0,prop:1,pnc:1,pmob:1,body:'#e8b9a0',legc:'#c99a84'}});
/* MOB_NAME rows (P5's purgBotInit merges these); speedrun --to=auto reads the headliner keys */
var HN_NAMES={pgbomber:'the Demolitionist',pgbigpig:'the Pig',pgbigfrog:'the Frog',pgpiglet:'Fallen Piglet',pghog:'the Hero Hog',
  pgtoss:'Chorus Pig',pgbundle:'Sticky Bundle',pgstation:'Plunger Station',pgbigone:'The Big One',pgcleat:'Cleat',pgspot:'Followspot',
  pgtip:'Tongue',pgelbow:'Elbow',pgfinger:'Finger',pgshand:'Stagehand'};

/* ---- transient state (never saved; reset on load, exit and world reset) ---- */
var HN={inter:0,interName:null,props:{bomber:[],bigpig:[],bigfrog:[]},deco:{},near:{},fx:[],sparks:[],looks:null,mittT:-9,mittR:false,
  swing:0,lastSpawnTry:0,wired:{},beacons:{},strike:null,seen:{},say:{},t:0,kidle:null};
function hnTr(){HN.inter=0;HN.interName=null;HN.props={bomber:[],bigpig:[],bigfrog:[]};HN.near={};HN.sparks=[];HN.wired={};HN.kidle=null;
  for(const f of HN.fx)hnFxKill(f);HN.fx=[];
  for(const k in HN.deco){const d=HN.deco[k];if(d&&d.g&&d.g.parent)d.g.parent.remove(d.g);}
  HN.deco={};HN.strike=null;HN.looks=null;HN.say={};}

/* =====================================================================================================================
   OG rig helpers: one shared unit box, scaled per part (memory rule, bible 9.1); materials per instance only where the
   hurt flash needs them (e.pdisp + e.pmats, freed by P0's removeEnt hook).
   ===================================================================================================================== */
var HN_GEO=null,HN_MATS={};
function hnUnit(){if(!HN_GEO)HN_GEO=new THREE.BoxGeometry(1,1,1);return HN_GEO;}
function hnMat(col,o){const k=col+(o?JSON.stringify(o):'');if(HN_MATS[k])return HN_MATS[k];
  const m=new THREE.MeshLambertMaterial(Object.assign({color:col},o||{}));HN_MATS[k]=m;return m;}         /* shared (props, deco) */
function hnBasic(col,o){const k='b'+col+(o?JSON.stringify(o):'');if(HN_MATS[k])return HN_MATS[k];
  const m=new THREE.MeshBasicMaterial(Object.assign({color:col},o||{}));HN_MATS[k]=m;return m;}
function hnAdd(col,o){return hnBasic(col,Object.assign({transparent:true,opacity:0.6,depthWrite:false,fog:false,blending:THREE.AdditiveBlending},o||{}));}
/* box(parent, w,h,d, material, x,y,z): a unit box scaled to w,h,d (the position is the box centre) */
function hnB(par,w,h,d,m,x,y,z){const me=new THREE.Mesh(hnUnit(),m);me.scale.set(w,h,d);me.position.set(x||0,y||0,z||0);if(par)par.add(me);return me;}
/* a canvas-faced box: the face canvas on +z (material index 4), like the core boxMesh, but with shared geometry */
function hnFaceMat(cv){const t=new THREE.CanvasTexture(cv);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;
  if(t.userData)t.userData.pown=1;else t.userData={pown:1};return new THREE.MeshLambertMaterial({map:t});}
function hnCanvas(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(g){g.imageSmoothingEnabled=false;fn(g);}return c;}
/* per-instance flashing material set for a headliner: mats[] gets the hurt flash; pmats[] is freed on removeEnt */
function hnFlash(e,list){e.pdisp=1;e.pmats=(e.pmats||[]).concat(list);}
/* googly eyes: two white cubes with black pupils that slide to lock onto (tx,ty,tz) (the universal telegraph, bible 9.1).
   Returns {set(e,tx,ty,tz,lock)}; lock 0..1 blends from a wander to a hard stare. */
function hnEyes(par,sz,sep,y,z,matW,matP){const ey=[];
  for(const s of [-1,1]){const g=new THREE.Group();g.position.set(s*sep,y,z);par.add(g);hnB(g,sz,sz,sz,matW,0,0,0);
    const p=hnB(g,sz*0.42,sz*0.42,sz*0.12,matP,0,0,sz*0.52);ey.push({g,p});}
  return ey;}
function hnLook(eyes,e,tx,ty,tz,lock,t){if(!eyes)return;const yaw=e.yaw||0,dx=tx-e.x,dz=tz-e.z;
  let lx=dx*Math.cos(-yaw)-dz*Math.sin(-yaw),lz=dx*Math.sin(-yaw)+dz*Math.cos(-yaw);const l=Math.hypot(lx,lz)||1;lx/=l;lz/=l;
  const wx=Math.sin((t||0)*1.7)*0.6,wy=Math.cos((t||0)*1.3)*0.4,ly=clamp((ty-(e.y+(e.h||1.6)))/(l*2+1),-1,1);
  const k=clamp(lock,0,1);
  for(const E of eyes){const sz=E.g.children[0].scale.x;E.p.position.x=sz*0.28*(k*lx+(1-k)*wx);E.p.position.y=sz*0.28*(k*ly+(1-k)*wy);}}
/* the jaw flap: a group pivoting at the back of the head (rotation.x opens the mouth) */
function hnJaw(j,amt){if(j)j.rotation.x=amt;}

/* =====================================================================================================================
   pooled effect meshes: aim lines, landing rings, ground shadows, puffs. Effects are tiny records ticked by hnFxTick.
   ===================================================================================================================== */
var HN_POOL={};
function hnPoolGet(kind,make){const L=HN_POOL[kind]||(HN_POOL[kind]=[]);for(const m of L)if(!m.parent){m.visible=true;return m;}
  if(L.length>=48)return null;const m=make();L.push(m);return m;}
function hnFx(kind,opt,upd){if(DIM!=='puppet'||typeof scene==='undefined'||!scene)return null;
  const mk=HN_FXMAKE[kind];const m=mk?hnPoolGet(kind,mk):null;if(!m&&mk)return null;
  const f=Object.assign({kind,t:0,dur:1,m},opt||{});f.upd=upd||null;if(m){scene.add(m);m.scale.set(1,1,1);m.rotation.set(0,0,0);}
  HN.fx.push(f);if(upd)upd(f,0);return f;}
function hnFxKill(f){if(f&&f.m&&f.m.parent)f.m.parent.remove(f.m);if(f)f.dead=1;}
var HN_FXMAKE={
  line:()=>hnB(null,0.08,0.08,1,hnAdd(0xff6aa8,{opacity:0.85}),0,0,0),                        /* pink aim line (stretched along z) */
  /* flat fx lie down in their GEOMETRY: hnFx resets every pooled mesh's rotation on reuse */
  ring:()=>{const g=new THREE.RingGeometry(0.7,1.0,24);g.rotateX(-Math.PI/2);return new THREE.Mesh(g,hnAdd(0xff5aa0,{opacity:0.8,side:THREE.DoubleSide}));},
  shadow:()=>{const g=THREE.CircleGeometry?new THREE.CircleGeometry(1,20):new THREE.RingGeometry(0.01,1,20);
    g.rotateX(-Math.PI/2);return new THREE.Mesh(g,hnBasic(0x000000,{transparent:true,opacity:0.55,depthWrite:false,side:THREE.DoubleSide}));},
  puff:()=>hnB(null,1,1,1,hnBasic(0x9a9a9a,{transparent:true,opacity:0.5,depthWrite:false}),0,0,0),
  spark:()=>hnB(null,0.22,0.22,0.22,hnAdd(0xfff07a,{opacity:1}),0,0,0),
  glow:()=>hnB(null,1,0.06,1,hnAdd(0xff3a1a,{opacity:0.7}),0,0,0),
  beam:()=>{const g=new THREE.CylinderGeometry(0.4,1.6,1,14,1,true);g.translate(0,-0.5,0);return new THREE.Mesh(g,hnAdd(0xfff4d0,{opacity:0.28,side:THREE.DoubleSide}));},
  wall:()=>hnB(null,1,1,0.4,hnMat(0x7a1430),0,0,0),
  red:()=>hnB(null,1,0.04,1,hnAdd(0xff2a2a,{opacity:0.9}),0,0,0)};
function hnFxTick(dt){for(const f of HN.fx){if(f.dead)continue;f.t+=dt;
    if(f.upd){let r;try{r=f.upd(f,dt);}catch(err){mpFail('fx '+f.kind,err);r=false;}if(r===false){hnFxKill(f);continue;}}
    if(f.t>=f.dur&&!f.hold)hnFxKill(f);}
  if(HN.fx.length>64||HN.fx.some(f=>f.dead))HN.fx=HN.fx.filter(f=>!f.dead);}
/* a line from a to b (aim lines, tongue telegraphs, skid lines) */
function hnLineTo(m,a,b,w){if(!m)return;const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz)||0.01;
  m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);m.scale.set(w||0.08,w||0.08,l);
  m.rotation.set(0,0,0);m.rotation.y=Math.atan2(dx,dz);m.rotation.x=-Math.asin(clamp(dy/l,-1,1));}
function hnAimLine(a,b,dur,w,col){return hnFx('line',{dur:dur||0.7},f=>{hnLineTo(f.m,typeof a==='function'?a():a,typeof b==='function'?b():b,w);});}
function hnRing(x,y,z,r,dur){return hnFx('ring',{dur:dur||1},f=>{f.m.position.set(x,y+0.06,z);const s=(r||1)*(0.8+0.2*Math.sin(f.t*12));f.m.scale.set(s,s,s);});}
function hnShadow(x,y,z,r0,r1,dur){return hnFx('shadow',{dur:dur||1.2},f=>{const u=clamp(f.t/f.dur,0,1),s=r0+(r1-r0)*u;f.m.position.set(x,y+0.04,z);f.m.scale.set(s,s,s);});}
function hnPuff(x,y,z,s,dur,vy){return hnFx('puff',{dur:dur||1},f=>{const u=f.t/f.dur;f.m.position.set(x,y+(vy||1.2)*f.t,z);const k=(s||1)*(0.6+u);f.m.scale.set(k,k,k);
  if(f.m.material&&f.m.material.opacity!==undefined)f.m.material.opacity=0.5;});}

/* =====================================================================================================================
   the state other packages read (plan 6.1): hnState() and the counters text for PURG_GUIDE
   ===================================================================================================================== */
function hnState(){const F=MPF.fight;
  if(MP.strike)return {name:null,phase:0,live:false,inter:false,strike:true,light:'work',e:null};
  if(F&&!F.over)return {name:F.name,phase:F.phase,live:true,inter:false,strike:false,light:F.name,e:F.e||null};
  if(HN.inter>MP.clock)return {name:HN.interName,phase:0,live:false,inter:true,strike:false,light:null,e:null};
  return null;}
function hnCounters(name,phase){const T={
  bomber:['THE DEMOLITIONIST (the apron). Punch DO NOT PUSH only once you carry Wire Snips. Every bang comes down a Det Cord wire: cut it (Wire Snips) and everything past the cut is dead. He goes RED, BLUE, YELLOW, WHITE. Each station has a frayed seat lead one block short: place one Det Cord in the gap and his own seat blows up under him, then he kneels to snip your wire (hit him then). Punch a station while he stands on its plates. A Custard Pie makes him plunge at random. He takes a quarter damage while braced on a plunger.',
    'Phase 2: he lobs sticky bundles. One stuck on you: hit any other creature (or touch a bot) to pass it on. A Foam Bat sends a bundle back where it came from. On the Demolitionist it does big damage.',
    'Phase 3: he sits on THE BIG ONE and lights the long fuse. Cut the fuse ahead of the spark: he kneels to splice it (hit him). Pull the Trap Release lever by the WHITE plunger with Wire Snips while he sits on the bomb: he drops through the floor and is blown out of a hatch.'],
  bigpig:['THE PIG (the Grand Staircase). Step over the velvet rope to start. Climb fast; change lanes at the landings; rolling hogs cannot be jumped. Raise the Pig Mitt to CATCH a pig, left-click to throw it back at her. Foam Bat a Pork Bomb back up the stairs.',
    'Phase 2 (the Star Platform): she stops for every mirror. Raise a Vanity Mirror facing her when she charges or lunges: she admires herself, out of her light, and takes double. Three looks per mirror. Hitting a followspot tower swings its beam onto you; two beams and she charges you. When she pushes her gloves up she will grab and throw someone: keep a Pig Mitt up to catch a thrown friend and throw him back at her.',
    'Phase 3: kick the end chorus pig (or throw a pig into the kickline) and the line goes over like dominoes; she turns her back to slam them. When she poses under the big lamp, hit the Lamp Cleat on the right gantry pillar with any Shears (or stick a Charge on it and use the Plunger): the lamp drops on her.'],
  bigfrog:['THE FROG (the swamp clearing). Step onto a lily pad in the outer ring to start. Keep moving on the felt sheet; stand on pads when he croaks. Strafe when the pink aim line appears. Any Shears cut the tongue. Hit the stuck tongue for triple damage; two staples pin it to the floor. A thrown Felt Fly makes him tongue the fly. If he swallows you, punch the fingers of the hand inside.',
    'Phase 2: he calls cues. Sandbags: move off the shadows. Traveler GO: get to the split in the curtain. Cue the Daredevil: move off the red arc. He spins across the sheet once and trips: hit him then.',
    'Phase 3: the frog is on an arm. Hitting the frog does a quarter damage. Drop through the felt sheet (stand still or cut it with Shears) and hit the ELBOW down in the dark: double damage, the Gauntlet triple. Watch for the arm sweep shadow.']};
  const L=T[name];if(!L)return '';return L.slice(0,Math.max(1,Math.min(3,phase|0||1))).join(' ');}

/* =====================================================================================================================
   the live fight
   ===================================================================================================================== */
function hnAlive(name){const mt=HN_MT[name];for(const e of entities)if(e.t==='mob'&&!e.dead&&e.mt===mt)return e;return null;}
function hnBoss(){const F=MPF.fight;return F&&!F.over&&F.e&&!F.e.dead?F.e:null;}
function hnCap(F){const c=HN_CAPS[F.name][F.phase-1];return F.capOv!=null?F.capOv:c;}
function hnPool(F){const ph=HN_PH[F.name];return ph[F.phase-1]-ph[F.phase];}
function hnPhaseTop(F){return F.topOv!=null?F.topOv:HN_PH[F.name][F.phase-1];}
/* open a counter window: everything that hits the headliner until it ends is capped at 45% of the phase pool */
function hnWin(F,dur,why){if(!F)return null;F.win={cap:hnCap(F),dmg:0,until:MP.clock+(dur||3),why:why||'',t0:MP.clock};F.wins=(F.wins||0)+1;
  if(F.log)F.log.push({t:+(MP.clock-F.t0).toFixed(2),ev:'win',why,ph:F.phase});return F.win;}
function hnWinEnd(F){if(F&&F.win)F.win.until=MP.clock;}
function hnLog(F,ev,o){if(F&&F.log&&F.log.length<2000)F.log.push(Object.assign({t:+(MP.clock-F.t0).toFixed(2),ev,ph:F.phase,hp:F.e?Math.round(F.e.hp):0},o||{}));}
/* who caused a hit: 'Dan', a bot name, or the headliner's own name (self-inflicted: never Dan's hit) */
function hnIsBot(by){return !!(by&&by!=='Dan'&&typeof agByName==='function'&&agByName(by));}
/* scripted hits on a headliner always land (forced: i-frames zeroed). how is prefixed 'x:' so the per-boss multipliers skip it */
function hnHit(e,dmg,by,how){if(!e||e.dead)return false;return purgHit(e,dmg,by||'Dan',('x:'+(how||'counter')),{force:1});}
/* the pre-hurt policy (PREG.hurt[mt], called from P0's mpPreHurt before the mob i-frame check) */
var HN_MULT={};
function hnHurt(e,dmg,kx,kz){
  if(e.dead||e.hurtT>0.25)return -1;
  const F=e.hf;
  if(!F||F.over){e.pfloor=Math.max(1,e.hp-dmg);return dmg;}
  if(F.dying||F.gloat>0||F.intro||F.leaving)return -1;
  const by=HIT_BY||'Dan',how=HIT_HOW||'',bot=hnIsBot(by);
  if(F.wait&&by!=='Dan')return -1;                                     /* waiting for Dan on the Mark: bots are shrugged off */
  if(F.wait)F.wait=false;
  let d=dmg;
  if(how.slice(0,2)!=='x:'){const f=HN_MULT[e.mt];if(f){d=f(e,F,d,by,how);if(d<0)return -1;}}
  if(bot)d*=0.5;
  /* the Plunger in a live arena: a click's blasts deal at most 25 in total (a click = blasts within 1 s) */
  if(/blast|charge|plunger/.test(how)&&(by==='Dan'||bot)){if(MP.clock-(F.plT||-9)>1){F.plT=MP.clock;F.plD=0;}d=Math.min(d,Math.max(0,HN_K.plCap-F.plD));F.plD+=d;}
  if(by==='Dan'&&dmg>0)F.lastDan=MP.clock;
  if(F.win&&MP.clock<F.win.until){const room=Math.max(0,F.win.cap-F.win.dmg);d=Math.min(d,room);F.win.dmg+=d;}
  const ph=HN_PH[F.name],thr=ph[F.phase],fl=F.phase>=3?1:thr;
  let nh=e.hp-d;
  if(nh<=fl){d=Math.max(0,e.hp-fl);nh=Math.min(e.hp,fl);
    if(MP.clock-F.lastDan<=HN_K.danHit){F.pend=F.phase>=3?'die':'phase';F.held=0;}
    else F.held=1;}
  e.pfloor=nh;
  F.dmgLog=(F.dmgLog||0)+d;hnLog(F,'hit',{by,how,d:+d.toFixed(2)});
  return d;}
function hnShieldUpd(e,F){e.shield=(e.pinv>0||F.held||F.fullLit)?1:0;}

/* start a fight: Dan's own action only (each boss file calls this from its summon check) */
function hnFightStart(name,opts){opts=opts||{};if(MPF.fight&&!MPF.fight.over)return MPF.fight;
  if(MP.dead[name]||DIM!=='puppet'||!P||P.dead)return null;
  mpArenaReset(name);hnPropsClear(name);
  const att=(HN.seen[name]=(HN.seen[name]||0)+1);
  const F={name,mt:HN_MT[name],phase:1,att,t0:MP.clock,lastDan:-99,win:null,wins:0,demo:false,gloat:0,wait:false,dying:false,
    outT:0,pend:null,held:0,intro:true,over:false,data:{},log:[],plT:-9,plD:0,deathsAtStart:MP.deaths[name]|0};
  MPF.fight=F;
  const sp=HN_SPAWN[name](F);spawnMob(F.mt,sp[0],sp[1],sp[2]);const e=entities[entities.length-1];
  e.hf=F;F.e=e;e.yaw=sp[3]||0;e.pinv=0;e.hrS={phase:1};e.pkeep=1;
  if(HN_INIT[name])HN_INIT[name](F,e);
  hnPropsEnsure(name,true);
  hnLog(F,'start',{att});
  mwS('pg_gasp');
  /* the intro: a 3 s letterbox on the headliner with the title line (Dan and the bots invulnerable, hostiles docile) */
  if(!opts.noIntro){const cam=HN_CAM[name];
    mpCut({end:HN_K.introT,lines:[{at:0.2,n:'',t:HN_TITLE[name]}],cam:cam?(t=>cam(F,t)):null,
      onEnd:()=>{F.intro=false;F.t0i=MP.clock;if(HN_GO[name])HN_GO[name](F,F.e);}});}
  else{F.intro=false;if(HN_GO[name])HN_GO[name](F,e);}
  return F;}
/* the camera for intros: from (ox,oy,oz) relative to the boss, looking at its head */
function hnCamAt(F,t,off){const e=F.e;if(!e)return;const px=e.x+off[0],py=e.y+off[1],pz=e.z+off[2];camera.position.set(px,py,pz);
  const vx=e.x-px,vy=(e.y+1.4)-py,vz=e.z-pz,vl=Math.hypot(vx,vy,vz)||1;camera.rotation.y=Math.atan2(-vx,-vz);camera.rotation.x=Math.asin(clamp(vy/vl,-1,1));}
/* the headliner leaves (15 s outside, or the arena unloaded): props reset, the arena regenerates, the next summon starts fresh */
function hnFightLeave(why){const F=MPF.fight;if(!F||F.over)return;F.over=true;F.leaving=true;hnLog(F,'leave',{why});
  const e=F.e;if(e&&!e.dead){burstParticles(e.x,e.y+1,e.z,B.PG_MBLACK,10,0.6);removeEnt(e);}
  if(HN_END[F.name])try{HN_END[F.name](F,'leave');}catch(err){mpFail('end',err);}
  if(typeof pmSplatClear==='function')try{pmSplatClear();}catch(err){}
  mpArenaReset(F.name);hnPropsClear(F.name);hnSparkClear();
  MPF.fight=null;}
/* the kill: loot, flags, beacons, Intermission (each boss's death sequence calls this at its end) */
function hnFightWon(F){if(!F||F.over)return;F.over=true;const name=F.name,e=F.e;hnLog(F,'won',{});
  MP.dead[name]=1;
  if(e&&!e.dead){e.pfloor=null;e.hf=null;e.hp=0;HIT_BY='Dan';HIT_HOW='kill';try{killMob(e);}finally{HIT_BY=null;HIT_HOW=null;}}
  if(HN_END[name])try{HN_END[name](F,'won');}catch(err){mpFail('end',err);}
  if(typeof pmSplatClear==='function')try{pmSplatClear();}catch(err){}
  hnSparkClear();
  MPF.fight=null;
  mwS('pg_applause');
  if(name!=='bigfrog'){HN.inter=MP.clock+HN_K.inter;HN.interName=name;hnHealAll();}
  hnWriteTimeline(F);}
/* PREG.loot: the key items go straight into Dan's inventory, the rest into the Headliner Trunk */
function hnLoot(e){const name=e.mt==='pgbomber'?'bomber':e.mt==='pgbigpig'?'bigpig':e.mt==='pgbigfrog'?'bigfrog':null;if(!name)return;
  if(name==='bomber'){mpGive({id:IT.PG_PLUNGER,count:1},'boss');mpGive({id:IT.PG_FUSE,count:1},'boss');
    hnTrunkEnsure('bomber',HN_TRUNK.bomber.rest());showToast('The Demolitionist went up through the Grid. The Plunger and his Fuse are yours.');}
  if(name==='bigpig'){mpGive({id:IT.PG_CHOPGLOVE,count:1},'boss');mpGive({id:IT.PG_PEARLS,count:1},'boss');mpGive({id:IT.PG_BOA,count:1},'boss');
    hnTrunkEnsure('bigpig',HN_TRUNK.bigpig.rest());showToast('The Pig rolled all the way down. Her gloves, pearls and boa are yours.');}
  spawnXP(e.x,e.y+1,e.z,MOBT[e.mt].xp||20);}
function hnHealAll(){if(P&&!P.dead){P.hp=20;P.hunger=20;drawStats();}
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS)if(a.online&&!a.dead&&a.dim===DIM){a.hp=20;if(a.hunger!==undefined)a.hunger=20;if(a.e)a.e.hp=20;}}

/* ---- keep-alive, reset, gloat/wait, phase bookkeeping (run every purgatory tick) ---- */
function hnOnMark(name){const s=hnMarkStand(name);return !!(s&&P&&Math.hypot(P.x-s[0],P.z-s[2])<1.8&&Math.abs(P.y-s[1])<2.5);}
function hnDanIn(name){return !!(P&&mpInArena(name,Math.floor(P.x),Math.floor(P.y),Math.floor(P.z)));}
function hnFightTick(dt){const F=MPF.fight;if(!F||F.over)return;const e=F.e;
  if(!e||e.dead){if(!F.dying){MPF.fight=null;}return;}
  if(F.intro)return;
  const cen=HN_CEN[F.name];
  if(!chunkAt(cen[0],cen[1])){hnFightLeave('unloaded');return;}
  const alive=!P.dead,inB=hnDanIn(F.name),onM=hnOnMark(F.name);
  if(alive&&!inB&&!onM&&!F.dying){F.outT+=dt;if(F.outT>=HN_K.reset){hnFightLeave('dan left');return;}}else F.outT=0;
  if(F.gloat>0){F.gloat-=dt;if(F.gloat<=0){F.gloat=0;}}
  /* Dan stepped off the Understudy Mark (not while the Lost Property can is still throwing his kit at him: that knocks him about) */
  if(F.wait&&alive&&!onM&&F.gloat<=0&&P.hurtT<=0.5&&!(typeof piVolleyBusy==='function'&&piVolleyBusy()))F.wait=false;
  if(F.win&&MP.clock>=F.win.until)F.win=null;
  if(e.pinv>0)e.pinv=Math.max(0,e.pinv-dt);
  hnShieldUpd(e,F);
  if(F.pend==='phase'&&!F.dying){F.pend=null;hnPhaseUp(F);}
  else if(F.pend==='die'&&!F.dying){F.pend=null;F.dying=true;F.win=null;hnLog(F,'die',{});if(HN_DIE[F.name])HN_DIE[F.name](F,e);}
  /* charge-proof: a Charge stuck on a headliner is peeled off and sent back onto its owner, still armed (bible 10.0) */
  hnChargeProof(F,e);}
function hnPhaseUp(F){const e=F.e;F.phase++;F.win=null;F.held=0;F.capOv=null;F.topOv=null;e.pinv=HN_K.pinv;
  if(e.hrS)e.hrS.phase=F.phase;
  mwS('pg_gasp',e.x,e.y,e.z);mwGridFx('flicker',0.6);hnLog(F,'phase',{to:F.phase});
  if(HN_PHASE[F.name])HN_PHASE[F.name](F,e,F.phase);}
/* Dan dies in a fight: gloat 3 s, heal to the phase start (85% of the pool from the 3rd death), reset the arena for the phase,
   ignore bots and wait until he steps off the Understudy Mark. Tomato hints on the 2nd and 4th death (P3 draws the splat). */
function hnOnDeath(who){if(who!=='Dan')return;const F=MPF.fight;if(!F||F.over||F.dying)return;
  const n=(MP.deaths[F.name]=(MP.deaths[F.name]|0)+1);hnLog(F,'danDied',{n});
  F.gloat=HN_K.gloat;F.wait=true;F.win=null;F.held=0;
  const e=F.e,top=hnPhaseTop(F),thr=HN_PH[F.name][F.phase],pool=top-thr;
  const rb=n>=3;F.topOv=null;
  if(e&&!e.dead){e.hp=rb?Math.round(thr+pool*HN_K.rubber):top;e.pfloor=null;}
  if(rb){mwS('pg_boo');mwGridFx('dip',1.2);}
  mpArenaReset(F.name);
  if(HN_PHRESET[F.name])try{HN_PHRESET[F.name](F,e);}catch(err){mpFail('phreset',err);}
  if((n===2||n===4)&&MP.quiet<=MP.clock){const tg=HN_HINT[F.name]?HN_HINT[F.name](F):null;F.hint=tg;
    if(tg&&typeof pmSplat==='function')try{pmSplat(tg);}catch(err){}
    if(typeof pmHeckle==='function')try{pmHeckle('hint',{boss:F.name,phase:F.phase,deaths:n,target:tg});}catch(err){}}
  if(HN_GLOAT[F.name])try{HN_GLOAT[F.name](F,e);}catch(err){}}
function hnOnRespawn(who,pos){}
/* a Charge stuck on a headliner comes straight back onto its owner, still armed */
function hnChargeProof(F,e){for(const c of entities){if(c.dead||c.t!=='mob'||c.mt!=='pgcharge')continue;
  const on=c.on||c.att||c.host||c.stuckTo||c.target;
  const touching=on===e||(!c.blk&&!c.block&&Math.abs(c.x-e.x)<e.hw+0.5&&Math.abs(c.z-e.z)<e.hw+0.5&&c.y>e.y-0.3&&c.y<e.y+e.h+0.3);
  if(!touching)continue;const owner=c.owner||c.pown||'Dan';removeEnt(c);
  const t=owner==='Dan'?P:(agByName(owner)&&agByName(owner).e);
  if(typeof piChargeArm==='function'&&t)try{piChargeArm(t,owner);}catch(err){mpFail('chargeArm',err);}
  hnSay(F.name==='bigpig'?'SLAM!':F.name==='bigfrog'?'Pfft.':'HEE HEE!',1.4);hnLog(F,'chargeBack',{owner});}}
/* boss subtitles: one line at a time, rate-limited per key */
function hnSay(t,dur,key){if(key){if((HN.say[key]||-9)>MP.clock)return;HN.say[key]=MP.clock+(dur||2)+1;}mpSay('',t,dur||2.2);}

/* per-boss registration tables (filled by p4_bomber/p4_bigpig/p4_bigfrog at their top level) */
var HN_SPAWN={},HN_INIT={},HN_GO={},HN_END={},HN_DIE={},HN_PHASE={},HN_PHRESET={},HN_HINT={},HN_GLOAT={},HN_CAM={},HN_SUMMON={},HN_PROPS={},HN_DECO={},HN_IDLE={};
var HN_CEN={bomber:[0,-175],bigpig:[0,105],bigfrog:[0,215]};

/* =====================================================================================================================
   arena props (prop mobs) and decorations (plain meshes): present while Dan is near the arena, gone when he is far or out
   ===================================================================================================================== */
function hnPropsEnsure(name,force){const L=HN.props[name];const alive=L.filter(e=>!e.dead);if(alive.length&&!force){HN.props[name]=alive;return;}
  for(const e of alive)if(force&&e.hnArena)removeEnt(e);
  HN.props[name]=[];const f=HN_PROPS[name];if(!f)return;
  const spawn=(mt,x,y,z,o)=>{spawnMob(mt,x,y,z);const e=entities[entities.length-1];Object.assign(e,{hnArena:name,yaw:0,pkeep:1},o||{});
    if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;}HN.props[name].push(e);return e;};
  try{f(spawn);}catch(err){mpFail('props '+name,err);}}
function hnPropsClear(name){for(const e of HN.props[name]||[])if(!e.dead)removeEnt(e);HN.props[name]=[];}
function hnProp(name,kind){for(const e of HN.props[name]||[])if(!e.dead&&e.kind===kind)return e;return null;}
function hnDeco(name){let d=HN.deco[name];if(d)return d;if(typeof scene==='undefined'||!scene||!HN_DECO[name])return null;
  d={g:new THREE.Group(),parts:{}};try{HN_DECO[name](d);}catch(err){mpFail('deco '+name,err);}HN.deco[name]=d;return d;}
function hnArenaTick(dt){if(!P)return;
  for(const name of HN_ORDER){const c=HN_CEN[name],dist=Math.hypot(P.x-c[0],P.z-c[1]),loaded=!!chunkAt(c[0],c[1]);
    const near=loaded&&dist<(HN.near[name]?HN_K.leave:HN_K.wake);
    if(near!==!!HN.near[name]){HN.near[name]=near;
      if(near){hnPropsEnsure(name);const d=hnDeco(name);if(d&&!d.g.parent)scene.add(d.g);if(MP.dead[name])hnTrunkEnsure(name);}
      else{if(!(MPF.fight&&MPF.fight.name===name&&!MPF.fight.over))hnPropsClear(name);const d=HN.deco[name];if(d&&d.g.parent)d.g.parent.remove(d.g);}}
    if(near){if(MPF.tick%30===0){hnPropsEnsure(name);if(MP.dead[name]&&HN_TRUNK[name]){const tp=HN_TRUNK[name].pos();if(Math.hypot(P.x-tp[0]-0.5,P.z-tp[2]-0.5)<8)hnTrunkRestock(name);}}
      const d=HN.deco[name];if(d&&d.tick)try{d.tick(dt,d);}catch(err){mpFail('deco tick '+name,err);}
      if(!MP.dead[name]&&!(MPF.fight&&!MPF.fight.over)&&HN.inter<=MP.clock&&!MP.strike&&!P.dead&&P.mode!=='c'&&HN_SUMMON[name])
        try{HN_SUMMON[name]();}catch(err){mpFail('summon '+name,err);}
      if(HN_IDLE[name])try{HN_IDLE[name](dt);}catch(err){mpFail('idle '+name,err);}}}}

/* =====================================================================================================================
   the Det Cord spark walker (the Demolitionist's networks and fuse; bible 4 "Det Cord conduction"): a BFS over cord cells advancing at
   `speed` cells per second. Two cord cells link as horizontal 4-neighbours at the same y or one block up or down. A cord cell
   feeds a Charge Plate directly below it or horizontally adjacent one block lower. A gap stops the spark.
   ===================================================================================================================== */
function hnIsCord(x,y,z,virt){return getBlock(x,y,z)===B.PG_CORD||(virt&&virt.has(x+','+y+','+z));}
function hnCordNb(x,y,z,virt){const o=[];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(const dy of [0,1,-1])
  if(hnIsCord(x+dx,y+dy,z+dz,virt))o.push([x+dx,y+dy,z+dz]);return o;}
function hnFeeds(x,y,z){const o=[];if(getBlock(x,y-1,z)===B.PG_PLATE)o.push([x,y-1,z]);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(getBlock(x+dx,y-1,z+dz)===B.PG_PLATE)o.push([x+dx,y-1,z+dz]);return o;}
/* start a spark at cord cell c; onPlate(px,py,pz,spark) fires once per plate cell reached; virt = extra virtual cord cells */
function hnSpark(c,speed,owner,onPlate,opt){opt=opt||{};if(!hnIsCord(c[0],c[1],c[2],opt.virt))return null;
  const s={front:[c],seen:new Set([c.join(',')]),acc:0,speed,owner,onPlate,virt:opt.virt||null,plates:new Set(),t:0,cells:[c],tag:opt.tag||'',done:false};
  HN.sparks.push(s);hnSparkVis(c);hnSparkFeed(s,c);return s;}
function hnSparkFeed(s,c){for(const p of hnFeeds(c[0],c[1],c[2])){const k=p.join(',');if(s.plates.has(k))continue;s.plates.add(k);
  if(s.onPlate)try{s.onPlate(p[0],p[1],p[2],s);}catch(err){mpFail('spark plate',err);}}}
function hnSparkVis(c){if(typeof scene==='undefined'||!scene)return;hnFx('spark',{dur:0.18},f=>{f.m.position.set(c[0]+0.5,c[1]+0.15,c[2]+0.5);});}
function hnSparkTick(dt){for(const s of HN.sparks){if(s.done)continue;s.t+=dt;s.acc+=dt*s.speed;
    while(s.acc>=1&&!s.done){s.acc-=1;const nf=[];
      for(const c of s.front)for(const n of hnCordNb(c[0],c[1],c[2],s.virt)){const k=n.join(',');if(s.seen.has(k))continue;s.seen.add(k);nf.push(n);s.cells.push(n);hnSparkFeed(s,n);hnSparkVis(n);}
      s.front=nf;if(!nf.length)s.done=true;}
    if(s.front.length&&MPF.tick%4===0)mwS('pg_spark',s.front[0][0],s.front[0][1],s.front[0][2]);}
  if(HN.sparks.length>12||HN.sparks.some(s=>s.done))HN.sparks=HN.sparks.filter(s=>!s.done);}
function hnSparkClear(){HN.sparks=[];}
/* the spark cell nearest (x,z) (BunkerBrad's reflex reads this through PGEX) */
function hnSparkNear(x,z,r){let best=null,bd=r||4;for(const s of HN.sparks)for(const c of s.front){const d=Math.hypot(c[0]+0.5-x,c[2]+0.5-z);if(d<bd){bd=d;best=c;}}
  if(HN.fuseSpark&&HN.fuseSpark.cell){const c=HN.fuseSpark.cell,d=Math.hypot(c[0]+0.5-x,c[2]+0.5-z);if(d<bd)best=c;}return best;}

/* =====================================================================================================================
   input readers for the counters P2's gear provides (P4 reads held item + mouse state, so it never depends on P2's fields)
   ===================================================================================================================== */
function hnHolding(id){const s=P&&heldStack();return !!(s&&s.id===id);}
function hnHeldDef(by){let s=null;if(by==='Dan'||!by)s=P&&heldStack();else{const a=agByName(by);s=a&&a.inv[a.sel];}return s&&DEFS[s.id]?{st:s,d:DEFS[s.id]}:null;}
function hnShears(by,tier){const h=hnHeldDef(by);return !!(h&&h.d.tool&&h.d.tool.type==='axe'&&(h.d.tool.tier||0)>=(tier||0));}
/* the Vanity Mirror is raised while Dan holds it with the right button down; facing = within 60 degrees of the look */
function hnMirrorRaised(){return !!(P&&!P.dead&&hnHolding(IT.PG_VMIRROR)&&MB.r&&!modalOpen());}
function hnFacing(x,y,z,cosMin){if(!P)return false;const L=lookDir(),dx=x-P.x,dz=z-P.z,l=Math.hypot(dx,dz)||1;return (L[0]*dx+L[2]*dz)/(l*Math.hypot(L[0],L[2])||1)>=(cosMin==null?0.5:cosMin);}
function hnMirrorLook(){const st=heldStack();if(!st)return 4;if(!HN.looks)HN.looks=new WeakMap();const n=(HN.looks.get(st)||0)+1;HN.looks.set(st,n);return n;}
function hnMirrorBreak(){const i=P.sel,st=P.inv[i];if(st&&st.id===IT.PG_VMIRROR){P.inv[i]=st.count>1?{...st,count:st.count-1}:null;redrawHotbar();
  burstParticles(P.x,P.y+1.4,P.z,B.PG_MIRROR,14,0.8);playS('break2');}}
/* the pie flag (P2's Custard Pie sets one of these on the target; P4 accepts every reasonable spelling) */
function hnBlind(e){return !!(e&&((e.pblind&&e.pblind>MP.clock)||(e.pieT&&e.pieT>MP.clock)||(e.blindT>0)||(e.blind>0)));}

/* =====================================================================================================================
   moving bodies: Dan is moved kinematically (camera-safe: brains run before updateCamera), bots through a.pgrab (P5)
   ===================================================================================================================== */
function hnFoeBody(t){return t===P?P:t;}
function hnFoeName(t){return t===P?'Dan':(t&&t.A?t.A.name:(t&&t.name)||null);}
function hnPush(t,vx,vy,vz){if(!t)return;if(t===P){if(P.dead)return;P.vx+=vx;P.vz+=vz;P.vy=Math.max(P.vy,vy);P.fallD=0;return;}
  if(t.vx!==undefined){t.vx+=vx;t.vz+=vz;t.vy=Math.max(t.vy||0,vy);}}
/* a bot body thrown on a ballistic arc (P5's purgGrabTick moves it) */
function hnGrabBot(t,k,o){const a=t&&t.A;if(!a)return null;a.pgrab=Object.assign({k,by:o.by||'',src:o.src||null,x:t.x,y:t.y,z:t.z,vx:0,vy:0,vz:0,spd:o.spd||13,
  until:MP.clock+(o.dur||4),onEnd:o.onEnd||null},o);return a.pgrab;}

/* =====================================================================================================================
   debug skip (plan 3.7, P0's Debug buttons and the og_trace purg session): earlier acts beaten, the ladder kit through
   mpGive, Dan on that act's Understudy Mark. Unchanged behaviour from the stub.
   ===================================================================================================================== */
function hnSkipTo(n){n=n|0;if(DIM!=='puppet'||!P||n<1||n>3)return false;
  if(MPF.fight&&!MPF.fight.over)hnFightLeave('skip');
  const K=[[IT.PG_HPICK,1],[IT.PG_SNIPS,1],[IT.PG_RAPIER,1],[IT.PG_BAT,1],[B.PG_CORD,16],[IT.PG_PIE,6],[IT.PG_FLATBREAD,12],[B.PG_LAMP,8],
    [IT.PG_FPAD_H,1],[IT.PG_FPAD_C,1],[IT.PG_FPAD_L,1],[IT.PG_FPAD_B,1]];
  if(n>=2){MP.dead.bomber=1;MP.open.a2=1;MP.unlock[IT.PG_CHARGE]=1;
    K.push([IT.PG_PLUNGER,1],[IT.PG_FUSE,1],[IT.PG_CHARGE,8],[IT.PG_WIG,1],[IT.PG_DISCO,1],[IT.PG_MITT,1],[IT.PG_VMIRROR,1],[IT.PG_VMIRROR,1],
      [IT.PG_VMIRROR,1],[IT.PG_STILETTO,1]);}
  if(n>=3){MP.dead.bigpig=1;MP.open.a3=1;K.push([IT.PG_CHOPGLOVE,1],[IT.PG_PEARLS,1],[IT.PG_BOA,1],[IT.PG_STAPLER,1],[IT.PG_STAPLES,64],[IT.PG_FLY,16]);}
  for(const [id,c] of K)mpGive({id,count:c},'skip');
  const u=mpUmarkPos(['bomber','bigpig','bigfrog'][n-1]);forceChunksNear(u[0],u[2]);
  P.x=u[0]+0.5;P.z=u[2]+0.5;P.y=mpSafeY(P.x,u[1],P.z);P.vx=P.vy=P.vz=0;P.fallD=0;
  HN.inter=0;
  return true;}

/* =====================================================================================================================
   the boss-fight timeline (plan 9.2 output): written by the p4_boss harness through PGEX.hnTimelineOut
   ===================================================================================================================== */
var HN_TL={};
function hnWriteTimeline(F){HN_TL[F.name]={name:F.name,att:F.att,clock:+(MP.clock-F.t0).toFixed(1),deaths:(MP.deaths[F.name]|0)-(F.deathsAtStart|0),wins:F.wins,log:F.log.slice(0,1500)};}

/* =====================================================================================================================
   registration (P0's registries) and the tick
   ===================================================================================================================== */
for(const mt of ['pgbomber','pgbigpig','pgbigfrog']){PREG.hurt[mt]=hnHurt;PREG.loot[mt]=hnLoot;}
PREG.onDeath.push(hnOnDeath);
PREG.onRespawn.push(hnOnRespawn);
PREG.onReset.push(function hnReset(){hnTr();HN.seen={};MPF.fight=null;});
PREG.onLoad.push(function hnLoad(){hnTr();});
PREG.onExit.push(function hnExit(){hnTr();});
PREG.onEnter.push(function hnEnter(){hnTr();});
PREG.tick.push(function hnTick(dt){HN.t+=dt;
  hnArenaTick(dt);hnFightTick(dt);hnSparkTick(dt);hnFxTick(dt);
  if(HN.inter>MP.clock&&HN.inter-MP.clock>HN_K.inter-0.1)hnHealAll();});
/* test seam: a hit attributed to `by` with cause `how` (the suites cannot reach HIT_BY/HIT_HOW, which are PART 53 vars) */
function hnHitAs(e,dmg,by,how,force){if(!e)return 0;const pb=HIT_BY,ph=HIT_HOW,h0=e.hp;HIT_BY=by||'Dan';HIT_HOW=how||'melee';if(force)e.hurtT=0;
  try{hurtMob(e,dmg,0,0);}finally{HIT_BY=pb;HIT_HOW=ph;}return h0-e.hp;}
Object.assign(PGEX,{hnHitAs,hnState,hnSkipTo,hnCounters,hnA,hnFightStart,hnFightLeave,hnFightWon,hnHurt,hnWin,hnHit,hnBoss,hnSpark,hnSparkNear,
  hnTreadTop,hnMarkStand,hnMarkCan,hnTrunkRestock,hnTrunkEnsure,hnPropsEnsure,hnProp,hnArenaReset:mpArenaReset,
  getHNS:()=>HN,getHNT:()=>HN_TL,HN_PH,HN_CAPS,HN_K,hnCap,hnPool});
