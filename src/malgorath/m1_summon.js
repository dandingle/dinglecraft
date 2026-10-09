/* ---- PART 57: m1_summon.js ---- */
/* ===================================================================== */
/* PART 57 m1 (M1): THE BITE · the summon (bible 4.1-4.4, 8.0).          */
/* In the middle of the plate is a ring of teeth closed like an iris,    */
/* between the teeth is a slit, and in the slit is an EYE. It follows    */
/* you. Poke it once: it squeezes shut, the plate jolts, "...Don't."     */
/* Poke it again within 12 s, or drop something into the slit, or use    */
/* the spawn egg inside the Bite, and he comes up through the teeth.     */
/* Only Dan; overworld only; not while riding; not after his death.      */
/* Once met, the eye is retired: stepping onto the plate wakes him.      */
/* The eye is a non-saved mgeye pseudo-mob (spawned here through         */
/* mgAddEnt; hits reach world.poke through m0's mgPreHurt). Its look     */
/* state rides on the entity for the renderer (M3 mesh / M2 brain):      */
/*   e.mgLook [x,y,z] what it watches · e.mgShut 0..1 · e.mgBlood 0..1   */
/*   e.mgPupil 0..1 (narrows as Dan comes closer) · e.mgBlink 0..1       */
/*   e.poked: the fight clock (MGF.clock) of the last counted poke (M3's */
/*   body squeezes shut for 0.5 s and stays bloodshot for 60 s off it)   */
/* M3's body turns its own pivot toward Dan: M1 never writes its yaw.    */
/* ===================================================================== */
function mg1Wake(cause){const F=MGREG.fight;if(!F||!F.wake||DEMON.dead)return false;let ok=false;
  try{ok=!!F.wake(cause);}catch(err){mgFail('wake',err);}
  if(ok)MG1.wakes[cause]=(MG1.wakes[cause]||0)+1;return ok;}

/* the eye exists in L0 while Dan is within 24 m (3D) of the slit, at most 12 m above the plate, in the height band */
function mg1EyeTick(dt,g){const E=MG1.eye;
  E.shut=Math.max(0,E.shut-dt);E.blood=Math.max(0,E.blood-dt);E.ring=Math.max(0,E.ring-dt);
  const ex=MGC.X,ey=g.F-0.95,ez=MGC.Z;
  const want=MG1.L==='L0'&&!MALG.met&&!DEMON.dead&&!!MGF.band&&!P.dead&&P.y<=g.F+12&&Math.hypot(P.x-ex,P.y-ey,P.z-ez)<MG_K.M1_EYE_R&&!mg1Busy();
  let e=E.ent;if(e&&(e.dead||(entities.indexOf(e)<0&&!MGF.add.some(a=>a[0]===e))))e=E.ent=null;   /* purged (mgPurge) or dropped from the add queue */
  if(want&&!e){let r=null;try{r=mgMobMesh('mgeye',new THREE.Group(),[],{hr:1});}catch(err){mgFail('m1-eye',err);}
    const G=r&&r.G?r.G:new THREE.Group();
    e=mgEnt('mgeye',ex,ey,ez,G,{mats:(r&&r.mats)||[],legs:(r&&r.legs)||[],mgNoBot:1,mgBar:1,hostile:false,mgEye:1,mgLook:[P.x,P.y+P.eyeY,P.z],mgShut:0,mgBlood:0,mgPupil:0,mgBlink:0});
    G.position.set(ex,ey,ez);mgAddEnt(e);E.ent=e;}
  else if(!want&&e){removeEnt(e);E.ent=null;e=null;}
  if(!e)return;
  E.blinkT-=dt;if(E.blinkT<=0){E.blinkT=6+5*h2(MG1.chewN+(E.n|0),(MGF.clock*10)|0,SEED+5771);E.blink=0.18;}   /* every 6-11 s (seeded) */
  E.blink=Math.max(0,E.blink-dt);
  const d=Math.hypot(P.x-ex,P.y-ey,P.z-ez);
  e.mgLook=[P.x,P.y+P.eyeY,P.z];e.mgShut=E.shut>0?1:0;e.mgBlood=E.blood>0?1:0;e.mgPupil=Math.max(0,Math.min(1,1-d/MG_K.M1_EYE_R));e.mgBlink=E.blink>0?1:0;
  e.poked=E.p1>-99?E.p1:null;e.x=ex;e.y=ey;e.z=ez;e.vx=e.vy=e.vz=0;
  if(e.mesh)e.mesh.position.set(ex,ey,ez);}
/* world.poke(e,dmg,by,how): every hit on the eye (m0 routes them here). Dan's, from the arena, count */
function mg1Poke(e,dmg,by,how){const E=MG1.eye,now=MGF.clock;
  if(by!=='Dan'||!(dmg>0)||!P||P.dead||P.ride||DIM!=='over'||DEMON.dead||MALG.met||MGF.live||!mgArena(P.x,P.y,P.z))return false;
  if(E.shut>0)return false;                                                   /* squeezed shut: nothing to poke */
  if(E.n>=1&&now-E.p1<=MG_K.M1_POKE_WIN){E.n=0;E.p1=-99;MG1.pokes=(MG1.pokes||0)+1;return mg1Wake('poke');}   /* the intro */
  E.n=1;E.p1=now;E.shut=MG_K.M1_SHUT;E.blood=60;E.clack=now;E.ring=2;MG1.pokes=(MG1.pokes||0)+1;e.poked=now;   /* poke 1 */
  nukeShake(0.3,0.4);playSAt('thud',MGC.X,mgF(),MGC.Z);
  if(typeof cutSay==='function')cutSay('MALGORATH','...Don\'t.',2.5);
  return true;}
/* the offering (L0): a drop entering the slit (within 1.2 m of its centre, below F) is gulped: it counts as both pokes */
function mg1Offer(g){if(MG1.L!=='L0'||MALG.met||DEMON.dead||MGF.live||(CUT.on&&CUT.script))return false;
  for(const e of entities){if(e.t!=='drop'||e.dead||!e.st)continue;
    if(Math.abs(e.x-MGC.X)>1.2||Math.abs(e.z-MGC.Z)>1.2||Math.hypot(e.x-MGC.X,e.z-MGC.Z)>1.2||e.y>=g.F||e.y<g.F-2.5)continue;
    const st=JSON.parse(JSON.stringify(e.st));
    if(!mg1Wake('offer'))return false;
    removeEnt(e);if(MALG.offer==null)MALG.offer=st;else spawnDrop(MGC.X,g.F+0.5,MGC.Z,st,0,4,0);   /* he floats it in his belly window */
    burstParticles(MGC.X,g.F+0.2,MGC.Z,B.NETHROCK,6,0.4);MG1.offers=(MG1.offers||0)+1;return true;}
  return false;}
/* once met: the moment Dan steps from the stair onto the plate (or an island), he wakes (M2 takes the door and clears the table) */
function mg1PlateWake(){
  if(!MALG.met||MGF.live||DEMON.dead||!P||P.dead||!MGF.band||(CUT.on)||mg1Busy())return false;
  if(!mgArena(P.x,P.y,P.z))return false;
  return mg1Wake('plate');}
