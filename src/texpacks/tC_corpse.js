/* ---- PART 54: tC_corpse.js ---- */
/* ---- tC_corpse.js (Package C): corpses, so the death animations play ----
   killMob (hook C7) and agDie (hook C25) hand a Hyperreal body over here instead of removing it: the entity is
   removed at once (no collision, picks, saves or targeting; drops, XP, loot, figurine and ghost rolls already ran),
   the model keeps its Group and plays s.dead 0->1 over deathDur (<= 3 s), holds 0.8 s, sinks 0.4 in 0.5 s and poofs.
   Explosions, despawn, the void and critter jars call removeEnt directly, so they leave no corpse.
   The dead entity keeps a shared dummy Object3D as its mesh: updateMob may still write e.mesh after a lava death. */
function hrCorpse(e,poof){const H=e.hrM;if(!H||!e.mesh||!HRE.on)return false;
  const G=e.mesh;e.mesh=HRE.dummy;e.hrM=null;
  for(const m of e.mats||[])m.emissive&&m.emissive.setRGB(0,0,0);   /* nobody resets the red flash any more */
  if(e.M){if(e.M.tag)e.M.tag.visible=false;e.M=null;}       /* bots: agAnimate stops at !e.M */
  removeEnt(e);
  const s=H.s;s.speed=s.attack=s.fuse=s.cd=0;s.fired=s.woodHit=s.blockHit=s.build=s.plant=s.grief=false;s.accel.set(0,0,0);
  G.visible=true;H.G=G;if(H.lod!==0&&H.lod!==1)hrSetLod(H,1);
  const C=HRE.corpses,cap=tpQ().corpses||8;while(C.length>=cap)hrCorpseEnd(C.shift());
  C.push({H,G,poof,x:e.x,y:e.y,z:e.z,vy:0,age:0,dur:Math.min(3,H.hr.deathDur||2.5)});return true;}
/* hook C10: end of updateEntities (unpaused) */
function hrTickCorpses(dt){try{hrTickCorpses1(dt);}catch(err){hrEntFail('corpses',err);}}
function hrTickCorpses1(dt){const C=HRE.corpses;for(let i=C.length-1;i>=0;i--){const c=C[i];c.age+=dt;
  if(c.y>0&&!solidAt(Math.floor(c.x),Math.floor(c.y-.02),Math.floor(c.z))){c.vy=Math.max(-30,c.vy-GRAV*dt);c.y+=c.vy*dt;
    if(solidAt(Math.floor(c.x),Math.floor(c.y),Math.floor(c.z))){c.y=Math.floor(c.y)+1;c.vy=0;}}
  const sink=Math.max(0,c.age-c.dur-.8)/.5;c.G.position.set(c.x,c.y-.4*Math.min(1,sink),c.z);
  c.H.s.dead=Math.max(.001,Math.min(1,c.age/c.dur));
  try{c.H.hr.update(Math.min(dt,.1),HRE.t,c.H.s);}catch(err){if(!c.H.err){c.H.err=1;console.warn('[HR] corpse',c.H.name,err);}}
  if(sink>=1||c.y<-40){C.splice(i,1);hrCorpseEnd(c);}}}
function hrCorpseEnd(c){burstParticles(c.x,c.y+.5,c.z,c.poof||B.TNT,8,.5);scene.remove(c.G);hrFree(c.H);}
/* resetWorld, every dimension change (stashEnts), pack switch: gone without a poof */
function hrClearCorpses(){for(const c of HRE.corpses){scene.remove(c.G);hrFree(c.H);}HRE.corpses.length=0;}

