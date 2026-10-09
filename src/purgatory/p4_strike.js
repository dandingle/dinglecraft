/* ---- PART 55: p4_strike.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p4_strike.js (P4): THE STRIKE (bible 11.1-11.2, 11.6). "Okay. That's a wrap. Strike it."
   The applause heals; the work lights slam on; every tethered puppet goes limp; three bells; the EXIT unlocks (P1 opens the
   doors while MP.strike is set). After a 10 s grace a push broom as wide as the stage sweeps downstage from the back wall,
   rubber-banded to Dan: clamp(4.0 + 0.04 (gap - 40), 3.5, 6.0) m/s. Behind the bristles the set is gone (chunk meshes
   hidden, mobs removed; nothing is setBlock'ed away). Checkpoints at Arch 3, Arch 2, Arch 1 and the proscenium. The Hand
   comes down 5 times on a full run (a 1.2 s shadow first), picks up the leading player and drops him on the litter pile.
   Traveler GO walls close across the arches with one 3-wide gap within 8 of x 0. Swept up: everything kept, back at the
   last checkpoint with >= 10 HP, the broom restarts 60 m upstage after 5 s. Touch the EXIT doors: customs (P0's mpExit).
   --------------------------------------------------------------------------------------------------------------------- */

var HN_SK_CPZ=[MPC.ARCH_Z[2],MPC.ARCH_Z[1],MPC.ARCH_Z[0],MPC.PROSC_Z];      /* the lines: Arch 3 152, Arch 2 42, Arch 1 -58, proscenium -160 */
var HN_SK_HANDZ=[205,120,20,-90,-235];                                         /* where the leading player calls the Hand down */
var HN_SK={g:null,parts:null,hidden:new Set()};
function hnSkLog(ev,o){if(!HN.skLog)HN.skLog=[];if(HN.skLog.length<600)HN.skLog.push(Object.assign({ev,t:+MP.clock.toFixed(2)},o||{}));}
function hnSkSpeed(gap){return clamp(4.0+0.04*(gap-40),3.5,6.0);}
function hnSkSpawn(cp){const A=hnA();
  if(!cp)return hnMarkStand('bigfrog');
  if(cp>=4)return hnMarkStand('bomber');
  const b=MPC.BOOTH[3-cp],x=b[0],z=b[1],cans=typeof mwSpots==='function'?mwSpots('boothCan'):[];
  const y=(typeof mpSurf==='function'?mpSurf(x,z):deckY(z))+1.02;return [x+0.5,y,z+0.5];}
/* the Strike begins (the Frog's death calls this at the end of the god-mic line) */
function hnStrikeStart(){if(MP.strike)return;MP.strike={cp:0,tries:0};HN.skLog=[];hnSkLog('start',{});
  HN.strike={ph:'applause',t:0,z:262.5,grace:10,hand:null,handDone:[0,0,0,0,0],walls:[null,null,null],doorsSaid:false,topT:0,lastY:0,catchT:0};
  mwS('pg_applause');hnSay('(the House applauds)',2);hnHealAll();
  if(typeof mpTickOff==='function'){}                                            /* page 13 unlocks from MP.dead.bigfrog (P0 polls) */}
/* the per-tick Strike */
function hnSkTick(dt){if(!MP.strike){if(HN.strike)hnSkClear();return;}
  if(!HN.strike)hnSkResume();
  const S=HN.strike;S.t+=dt;const A=hnA();
  if(S.ph==='applause'){hnHealAll();if(S.t>=2){S.ph='lights';S.t=0;
      if(typeof mwWorkLights==='function')mwWorkLights(true);
      /* every tethered puppet in the world drops limp at once and its arm slithers back down its hole */
      for(const m of entities)if(!m.dead&&m.t==='mob'&&(m.mt==='pgwhat'||m.mt==='pgcomic')){burstParticles(m.x,m.y+0.5,m.z,B.PG_FLEECE,6,0.4);m.plimp=1;removeEnt(m);}
      if(typeof mwGridFx==='function')mwGridFx('flash3');mwS('pg_bells');hnSkLog('lights',{});hnSkLog('bell',{});
      if(typeof mwBeacon==='function')mwBeacon('gaps',false);
      hnSay('Strike it.',1.6);}}
  else if(S.ph==='lights'){if(S.t>=1.8){S.ph='grace';S.t=0;}}
  else if(S.ph==='grace'){hnSkBuild();if(S.t>=S.grace){S.ph='run';S.t=0;hnSay('(a work boot lands somewhere behind the curtain)',2.2,'boot');}}
  if(S.ph!=='run'&&S.ph!=='grace')return;
  hnSkBuild();
  const alive=P&&!P.dead&&!(CUT.on&&CUT.script);
  /* checkpoints */
  if(alive)while(MP.strike.cp<4&&P.z<HN_SK_CPZ[MP.strike.cp]){MP.strike.cp++;hnSkLog('cp',{cp:MP.strike.cp});}
  /* the broom: rubber-banded to Dan, never advancing while he is dead or respawning, never striking the log island while he is
     still in the clearing */
  if(S.ph==='run'&&alive){const gap=S.z-P.z,v=hnSkSpeed(gap);S.v=v;let nz=S.z-v*dt;
    if(hnInClear(Math.floor(P.x),Math.floor(P.z),A.kr+2))nz=Math.max(nz,A.kc[1]+A.kr+2.5);
    S.z=Math.max(nz,MPC.WALK.z0-4);
    if(S.z<=P.z+0.6&&S.catchT<=0&&!(HN.danK)){hnSkCatch('broom');return;}}
  S.catchT=Math.max(0,S.catchT-dt);
  hnSkHide();
  /* mobs behind the line are gone; bots ride the pile */
  for(const m of entities){if(m.dead||m.t!=='mob')continue;
    if(m.bot){if(m.z>S.z-0.4&&m.A&&m.A.dim===DIM){m.z=S.z-1.6;m.vz=Math.min(0,m.vz||0)-1;}continue;}
    if(m.z>S.z+1&&MOBT[m.mt]&&MOBT[m.mt].pmob&&m.mt!=='pgshand'&&m.mt!=='pgoldgoat'&&m.mt!=='pgoldergoat')removeEnt(m);}
  /* chaos: flats near the broom topple toward you (P1's mesh-only topple) */
  S.topT-=dt;if(S.topT<=0&&S.ph==='run'){S.topT=1.5;if(typeof mwToppleNear==='function')try{mwToppleNear(P.x,S.z-14,30,{dir:-1,who:'Stagehand'});}catch(err){}}
  /* the boots: each step shakes the deck within 40 m */
  S.stepT=(S.stepT||0)-dt;if(S.stepT<=0&&S.ph==='run'){S.stepT=1.1;const d=Math.abs(P.z-(S.z+9));if(d<40)mpShake(0.25*(1-d/40)+0.05,0.25);mwS('pg_bootthud',0,40,S.z+9);}
  hnSkHandTick(dt);hnSkWallTick(dt);
  /* at the doors: the Old Goats stand and applaud; touching the doors is the exit */
  if(alive&&P.z<-262&&!S.doorsSaid){S.doorsSaid=true;hnSkBalcony();}
  const E=MPC.EXIT;if(alive&&P.z<=E.z+1.7&&P.x>=E.x0-0.4&&P.x<=E.x1+1.4&&P.y>=E.y0-1.5){hnSkOut();}}
function hnSkBalcony(){hnSkLog('balcony',{});const L=[['OLD GOAT','Bravo!'],['OLDER GOAT','Encore!'],['OLD GOAT','Don’t encourage him.'],['OLDER GOAT','Baa-ha-ha-ha!']];
  if(typeof pmHeckle==='function')try{pmHeckle('applaud',{who:'Dan'});}catch(err){}
  for(const n of ['oldgoat','oldergoat']){const e=typeof pmNpcFind==='function'?pmNpcFind(n,null):null;if(e&&typeof pmNpcPose==='function')try{pmNpcPose(e,'nod',6);}catch(err){}}
  let i=0;const next=()=>{if(i>=L.length||!MP.strike)return;mpSay(L[i][0],L[i][1],1.4);i++;HN.strike.sayT=1.45;HN.strike.sayN=next;};next();mwS('pg_applause');}
/* the doors: a white flash, then the exit. mpExit runs from the cut's onEnd (updateCut, before processPuppet), never from inside
   the PREG.tick loop, so no later purgatory tick runs in the overworld this frame */
function hnSkOut(){const S=HN.strike;if(S.out)return;S.out=1;if(typeof NUKE!=='undefined')NUKE.flash=1;mwS('pg_applause');hnSkLog('exit',{});
  mpCut({end:0.5,lines:[{at:0,n:'',t:''}],onEnd:()=>{hnSkClear();MP.strike=null;if(typeof mwWorkLights==='function')mwWorkLights(false);mpExit({});}});}
/* swept up (or a death during the Strike, through onRespawn): back at the last checkpoint with everything, >= 10 HP, the broom
   restarts 60 m upstage after a 5 s grace; the set behind is shown again */
function hnSkCatch(why){const S=HN.strike;if(!S||S.catching)return;S.catching=1;MP.strike.tries=(MP.strike.tries|0)+1;hnSkLog('swept',{why,cp:MP.strike.cp});
  mwS('pg_swish');HN.danK=null;
  const p0=[P.x,P.y,P.z];
  mpCut({end:1.6,lines:[{at:0,n:'',t:''}],cam:t=>{const a=t*7;camera.position.set(p0[0]+Math.sin(a)*0.6,p0[1]+1+Math.cos(a)*0.4,p0[2]);camera.rotation.set(a,a*0.6,0);},
    tick:(dt,t)=>{const el=typeof $==='function'?$('pfelt'):null;if(el&&el.style){el.style.display=t>0.9?'block':'none';el.style.background=t>0.9?'#000':'';}},
    onEnd:()=>{const el=typeof $==='function'?$('pfelt'):null;if(el&&el.style){el.style.display='none';el.style.background='';}hnSkRespawn();S.catching=0;}});}
function hnSkRespawn(){const S=HN.strike;if(!S)return;const sp=hnSkSpawn(MP.strike.cp);forceChunksNear(sp[0],sp[2]);
  P.x=sp[0];P.z=sp[2];P.y=mpSafeY(sp[0],sp[1],sp[2]);P.vx=P.vy=P.vz=0;P.fallD=0;P.hp=Math.max(10,P.hp);P.hurtT=1;drawStats();
  S.z=Math.min(262.5,P.z+60);S.ph='grace';S.t=0;S.grace=5;S.catchT=1;hnSkShowAll();
  /* the Hands downstage of this checkpoint can come again; walls reopen behind */
  for(let i=0;i<5;i++)if(HN_SK_HANDZ[i]<P.z)S.handDone[i]=0;
  for(let i=0;i<3;i++)if(S.walls[i]&&HN_SK_CPZ[i]<P.z)S.walls[i]=null;hnSkGapBeacons();
  if(S.hand){hnSkHandEnd();}}
/* a reload mid-Strike resumes at MP.strike.cp */
function hnSkResume(){HN.strike={ph:'grace',t:0,z:262.5,grace:5,hand:null,handDone:[0,0,0,0,0],walls:[null,null,null],doorsSaid:false,topT:0,catchT:1};
  if(typeof mwWorkLights==='function')mwWorkLights(true);if(P&&DIM==='puppet')hnSkRespawn();}
function hnSkClear(){hnSkShowAll();if(typeof mwBeacon==='function')mwBeacon('gaps',null);if(HN_SK.g&&HN_SK.g.parent)HN_SK.g.parent.remove(HN_SK.g);if(HN.strike&&HN.strike.hand)hnSkHandEnd();HN.strike=null;}
/* the set behind the bristles is gone: chunk meshes fully behind the line are hidden (no applyMesh hook) */
function hnSkHide(){const S=HN.strike;for(const [k,ch] of chunks){if(!ch.meshes)continue;const behind=ch.cz*CH>S.z+0.5;
    for(const m of ch.meshes)m.visible=!behind;if(behind)HN_SK.hidden.add(k);else HN_SK.hidden.delete(k);}}
function hnSkShowAll(){for(const k of HN_SK.hidden){const ch=chunks.get(k);if(ch&&ch.meshes)for(const m of ch.meshes)m.visible=true;}HN_SK.hidden.clear();}

/* ---- the broom and the boots (OG set piece: tan bristle boxes, a brown handle into the dark, two filthy work boots) ---- */
function hnSkBuild(){if(HN_SK.g){if(!HN_SK.g.parent&&typeof scene!=='undefined'&&scene)scene.add(HN_SK.g);hnSkPose();return;}
  if(typeof scene==='undefined'||!scene)return;const g=new THREE.Group(),tan=hnMat(0xc8a46a),dk=hnMat(0x7a5a32),hdl=hnMat(0x6b4226),boot=hnMat(0x5a3a22),sole=hnMat(0x2a1a10),lace=hnMat(0xd8c8a0),mud=hnMat(0x4a3a20);
  const band=new THREE.Group();g.add(band);hnB(band,1,3,1.4,tan,0,1.5,0);hnB(band,1,0.4,1.5,dk,0,0.2,0);hnB(band,1,0.9,2.2,hnMat(0x8a6a3a),0,3.4,0.5);
  const handle=hnB(g,0.9,0.9,90,hdl,0,0,0);
  const boots=[];for(const s of [-1,1]){const b=new THREE.Group();g.add(b);hnB(b,9,6,16,boot,0,3,0);hnB(b,9.4,1,16.6,sole,0,0.3,0);hnB(b,8,6,7,boot,0,9,-4);
    for(let i=0;i<4;i++)hnB(b,7,0.4,0.6,lace,0,6.2+i*1.2,3.5-i*0.4);hnB(b,2,1,3,mud,2.5,1.2,6);boots.push(b);}
  const pile=[];for(let i=0;i<14;i++){const c=[0x4ca82b,0xd9822b,0x3f6fb5,0xb08a5a,0xf2a6c1,0xecebe6][i%6];pile.push(hnB(g,1.2+(i%3)*0.5,0.8+(i%2)*0.6,1.1,hnMat(c),0,0,0));}
  HN_SK.g=g;HN_SK.parts={band,handle,boots,pile};scene.add(g);hnSkPose();}
function hnSkPose(){const S=HN.strike,Pp=HN_SK.parts;if(!S||!Pp)return;const z=S.z,house=z<MPC.HOUSE.z1,w=house?128:192,cx=house?-0.5:0.5,dy=deckY(Math.floor(z));
  Pp.band.position.set(cx,dy+1,z+0.7);Pp.band.scale.set(w,1,1);
  hnLineTo(Pp.handle,[cx,dy+3.5,z+1.2],[cx,dy+70,z+48],0.9);
  const t=S.t;for(let i=0;i<2;i++){const b=Pp.boots[i],ph=Math.sin(t*2.86+i*Math.PI),lift=Math.max(0,ph)*5;b.position.set((i?14:-14)+cx,dy+1+lift,z+11+(ph*4));}
  for(let i=0;i<Pp.pile.length;i++){const m=Pp.pile[i],u=i/Pp.pile.length;m.position.set(cx-w*0.4+u*w*0.8,dy+1.3+((i*7)%3)*0.5+Math.abs(Math.sin(t*3+i))*0.2,z-1.4-((i*5)%3)*0.7);m.rotation.y=i;}
  HN_SK.g.visible=S.ph==='run'||S.ph==='grace';}

/* ---- the Hand: the stagehand's other hand, picking up litter (5 times on a full run) ---- */
function hnSkLeader(){let best=null,bz=1e9;if(P&&!P.dead){best=P;bz=P.z;}
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS){const b=a.e;if(b&&!a.dead&&a.online&&a.dim===DIM&&b.z<bz){bz=b.z;best=b;}}return best;}
function hnSkHandTick(dt){const S=HN.strike;if(S.ph!=='run')return;
  if(!S.hand){const L=hnSkLeader();if(!L)return;for(let i=0;i<5;i++)if(!S.handDone[i]&&L.z<HN_SK_HANDZ[i]){S.handDone[i]=1;hnSkHandStart(L,i);break;}return;}}
function hnSkHandStart(t,i){const S=HN.strike,tb=hnFoeBody(t),lead=1.2,px=tb.x+(tb.vx||0)*lead,pz=tb.z+(tb.vz||(t===P?-4:-3))*lead;
  const gy=(typeof mpSurf==='function'?mpSurf(Math.floor(px),Math.floor(pz)):deckY(Math.floor(pz)))+1;
  spawnMob('pgshand',px,gy+22,pz);const h=entities[entities.length-1];Object.assign(h,{kind:'hand',pkeep:1,hst:'shadow',hT:0,tgt:t,at:[px,gy,pz],idx:i,yaw:0});
  h.relay=(d,by)=>hnSkHandHit(h,d,by);S.hand=h;hnShadow(px,gy,pz,1.0,4.2,1.2);hnSkLog('hand',{i});}
function hnSkHandHit(h,d,by){if(h.hst==='gone'||h.hst==='recoil'||h.hst==='away'||h.hst==='flinch')return;const g=hnHeldDef(by),how=HIT_HOW||'';
  if(g&&g.st.id===IT.PG_GAUNTLET){h.hst='recoil';h.hT=0;hnSkReleaseHeld(h);hnSay('(the giant hand flinches back from the Gauntlet)',1.8,'recoil');mwS('pg_creak',h.x,h.y,h.z);return;}
  if(/hi.?yah|chop|shock/i.test(how)){h.hst='away';h.hT=0;hnSkReleaseHeld(h);mwS('pg_thump',h.x,h.y,h.z);return;}}
function hnSkReleaseHeld(h){if(h.held===P&&HN.danK&&HN.danK.by==='Stagehand'){HN.danK=null;}else if(h.held&&h.held.A&&h.held.A.pgrab)h.held.A.pgrab.until=0;h.held=null;}
function hnSkHandEnd(){const S=HN.strike;if(S&&S.hand){if(!S.hand.dead)removeEnt(S.hand);S.hand=null;}}
PREG.mesh.pgshand=function(G,mats){const sk=hnMat(0xe8b9a0),dk=hnMat(0xc99a84),nail=hnMat(0xd8c8b0),band=hnMat(0xf4f4ee);
  const palm=new THREE.Group();G.add(palm);hnB(palm,6,1.6,6.5,sk,0,1.6,0);hnB(palm,6.2,0.4,1.4,dk,0,2.4,-3);
  const fingers=[];for(let i=0;i<4;i++){const f=new THREE.Group();f.position.set(-2.25+i*1.5,1.6,3.2);palm.add(f);hnB(f,1.2,1.2,3.6,sk,0,0,1.8);hnB(f,1.0,0.3,0.7,nail,0,0.6,3.3);
    const bd=hnB(f,1.3,1.3,0.9,band,0,0,3.0);bd.visible=false;fingers.push({f,bd});}
  const thumb=new THREE.Group();thumb.position.set(3.3,1.6,0.5);palm.add(thumb);hnB(thumb,1.3,1.3,3,sk,0.8,0,0);
  hnB(G,4,1.6,4,hnMat(0x2a2a2a),0,1.6,-4.8);                                       /* the black cuff stub */
  const legs=[];legs.fingers=fingers;legs.palm=palm;return {G,legs,mats};};
PREG.brain.pgshand=function(e,dt){e.vx=e.vy=e.vz=0;hnDanKTick(dt);const S=HN.strike;e.hT=(e.hT||0)+dt;
  if(!S){removeEnt(e);return;}const L=e.legs||{};
  if(L.fingers&&!e._band){e._band=1;const n=Math.min(4,MP.knuckles|0);for(let i=0;i<4;i++)L.fingers[i].bd.visible=i<n;}
  const blind=hnBlind(e);if(blind&&(e.hst==='shadow'||e.hst==='slam')){e.hst='flinch';e.hT=0;}
  const at=e.at;
  switch(e.hst){
    case 'shadow':{e.x=at[0];e.z=at[2];e.y=at[1]+22-Math.max(0,e.hT-0.8)*40;if(e.hT>=1.2){e.y=at[1];e.hst='slam';e.hT=0;mpShake(0.5,0.4);mwS('pg_thump',at[0],at[1],at[2]);
        const t=e.tgt,tb=t&&hnFoeBody(t);if(tb&&Math.hypot(tb.x-at[0],tb.z-at[2])<2.6&&Math.abs((t===P?P.y:tb.y)-at[1])<2.5&&!(t===P&&P.dead)){e.held=t;
          if(t===P){hnDanK('hold',{by:'Stagehand',at:()=>[e.x,e.y+1.2,e.z+1]});}else hnGrabBot(tb,'lift',{by:'Stagehand',src:e,x:e.x,y:e.y+1,z:e.z,dur:4});
          hnSkLog('handCaught',{who:hnFoeName(t)});}}break;}
    case 'slam':if(e.held){e.hst='lift';e.hT=0;}else if(e.hT>0.6){e.hst='gone';e.hT=0;}break;
    case 'lift':{e.y=at[1]+Math.min(1,e.hT)*15;if(e.held&&e.held!==P&&e.held.A&&e.held.A.pgrab){const g=e.held.A.pgrab;g.x=e.x;g.y=e.y+1;g.z=e.z;}
      if(e.hT>=1){e.hst='carry';e.hT=0;e.from=[e.x,e.z];}break;}
    case 'carry':{const tz=S.z-3.5,u=Math.min(1,e.hT/1.2);e.z=e.from[1]+(tz-e.from[1])*u;if(e.held&&e.held!==P&&e.held.A&&e.held.A.pgrab){const g=e.held.A.pgrab;g.x=e.x;g.y=e.y+1;g.z=e.z;}
      if(u>=1){/* it drops a Stuffing Drift heap there first, then you (landing capped at 4) */
        const gx=Math.floor(e.x),gz=Math.floor(e.z),gy=(typeof mpSurf==='function'?mpSurf(gx,gz):deckY(gz));const pa=ACTOR;ACTOR=null;
        try{for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const id=getBlock(gx+dx,gy+1,gz+dz);if(!id||(DEFS[id]&&DEFS[id].replace))setBlock(gx+dx,gy+1,gz+dz,B.PG_STUFFING);}}finally{ACTOR=pa;}
        if(e.held===P){HN.danK=null;hnDanK('fly',{by:'Stagehand',how:'hand',vx:0,vy:0,vz:0,cap:4});}else if(e.held&&e.held.A){hnGrabBot(e.held,'thrown',{by:'Stagehand',src:e,x:e.x,y:e.y,z:e.z,vx:0,vy:0,vz:0,dur:3});}
        e.held=null;e.hst='gone';e.hT=0;mwS('pg_squeak',e.x,e.y,e.z);}break;}
    case 'flinch':e.y+=dt*6;if(e.hT>=3){e.hst='gone';e.hT=0;}break;
    case 'away':e.y+=dt*10;e.x+=dt*12;if(e.hT>=5){e.hst='gone';e.hT=0;}break;
    case 'recoil':e.y+=Math.sin(e.hT*30)*0.05+dt*2;if(e.hT>=4){e.hst='gone';e.hT=0;}break;
    case 'gone':e.y+=dt*16;if(e.hT>1.6&&!HN.danK){if(S.hand===e)S.hand=null;removeEnt(e);return;}break;}
  {const s=e.hrS||(e.hrS={});s.grip=(e.hst==='slam'||e.hst==='lift'||e.hst==='carry')?1:0;s.reach=e.hst==='shadow'?Math.min(1,e.hT/1.2):0;s.bandage=Math.min(4,MP.knuckles|0);
    s.recoil=e.hst==='recoil'?1:0;}
  if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=Math.PI;const pl=L.palm;if(pl&&L.fingers){const close=e.hst==='slam'||e.hst==='lift'||e.hst==='carry'?0.9:0.1;for(const f of L.fingers)f.f.rotation.x=close;}}};

/* ---- Traveler GO walls: one closes across each arch as Dan comes within 40 m of it, with a single 3-wide gap within 8 of x 0 ---- */
function hnSkGap(i){const tr=(MP.strike&&MP.strike.tries)|0;return Math.round(-8+16*h2(i+7,tr+3,SEED^0x3a41))+0.5;}
function hnSkWallTick(dt){const S=HN.strike;if(S.ph!=='run'||!P||P.dead)return;
  for(let i=0;i<3;i++){const z=HN_SK_CPZ[i];let W=S.walls[i];
    if(!W&&P.z>z+0.5&&P.z<z+40){W=S.walls[i]={z,gx:hnSkGap(i),u:0,hit:{}};hnSkGapBeacons();mwS('pg_swish',P.x,P.y,z);hnSkLog('wall',{i,gx:W.gx});}
    if(!W)continue;W.u=Math.min(1,W.u+dt/2);
    /* a wall that meets you shoves you sideways along to the gap (3) */
    const cover=W.u>=0.6;if(cover&&Math.abs(P.z-z)<0.75&&Math.abs(P.x-W.gx)>1.5&&Math.abs(P.x)<96){const dir=Math.sign(W.gx-P.x);moveBody(P,dir*Math.min(Math.abs(W.gx-P.x)-1.4,7*dt),0,0,false);
      if(P.z<z+0.75&&P.z>z-0.75)P.z=z+0.75;if(!W.hit.Dan){W.hit.Dan=1;purgHit(P,3,'Stagehand','wall',{force:1,kx:dir,kz:0});}}}
  hnSkWallPose();}
function hnSkGapBeacons(){const S=HN.strike;if(!S||typeof mwBeacon!=='function')return;const L=[];for(const W of S.walls)if(W)L.push([W.gx,W.z]);mwBeacon('gaps',L.length?L:false);}
function hnSkWallPose(){const S=HN.strike;if(!HN_SK.g||!S)return;const Pp=HN_SK.parts;if(!Pp.walls){Pp.walls=[];for(let i=0;i<3;i++){const a=hnB(HN_SK.g,1,1,0.6,hnMat(0x4a1030),0,0,0),b=hnB(HN_SK.g,1,1,0.6,hnMat(0x4a1030),0,0,0);Pp.walls.push([a,b]);}}
  for(let i=0;i<3;i++){const W=S.walls[i],pr=Pp.walls[i];if(!W){pr[0].visible=pr[1].visible=false;continue;}const dy=deckY(W.z),h=70-dy,yc=dy+1+h/2;
    const la=-96+(W.gx-1.5+96)*W.u,lb=96-(96-(W.gx+1.5))*W.u;
    pr[0].visible=pr[1].visible=true;pr[0].position.set((-96+la)/2,yc,W.z+0.5);pr[0].scale.set(Math.max(0.1,la+96),h,0.6);
    pr[1].position.set((lb+96)/2,yc,W.z+0.5);pr[1].scale.set(Math.max(0.1,96-lb),h,0.6);}}

/* ---- registration ---- */
PREG.tick.push(function hnSkTickReg(dt){hnSkTick(dt);if(HN.strike&&HN.strike.sayT>0){HN.strike.sayT-=dt;if(HN.strike.sayT<=0&&HN.strike.sayN)HN.strike.sayN();}});
PREG.onRespawn.push(function hnSkOnRespawn(who,pos){if(who!=='Dan'||!MP.strike||!HN.strike)return;hnSkRespawn();hnSkLog('respawnStrike',{});});
PREG.onExit.push(function hnSkExit(){hnSkClear();if(MP.strike)MP.strike=null;if(typeof mwWorkLights==='function')mwWorkLights(false);});
PREG.onReset.push(function hnSkReset(){hnSkClear();});
PREG.onLoad.push(function hnSkLoad(){HN.strike=null;HN_SK.hidden.clear();if(HN_SK.g&&HN_SK.g.parent)HN_SK.g.parent.remove(HN_SK.g);});
Object.assign(PGEX,{hnStrikeStart,hnSkSpeed,hnSkSpawn,hnSkCatch,hnSkRespawn,getHNSK:()=>HN.strike,HN_SK_CPZ,HN_SK_HANDZ,hnSkGap,hnSkLeader});
