/* ---- PART 54: tC_mobs.js ---- */
/* ---- tC_mobs.js (Package C): Hyperreal mob bodies (zombie, skel, boomer, spider, pig, cow, sheep, alien) ----
   Hook C2 (makeMobMesh, spawnMob's {hr:1} only) builds the body into the game's own Group G, which already faces +z
   with G.rotation.y = e.yaw, so the model goes in unflipped. Hook C6 (updateMob, after the yaw/position write)
   fills s from the mob's state and steps the model instead of OG's leg swing. */
/* the mob's re-arm time, so cd = atkT/amax (skeleton's DRAW_CD assumes /1.9) */
function hrMobAmax(T){return T.ranged?1.9:(T.boss?1.4:1.1);}
/* rig pitch is positive looking DOWN; a target eye above the mob's eye gives a negative pitch */
function hrMobPitch(eyeY,targetEyeY,dist){return -Math.atan2(targetEyeY-eyeY,Math.max(.6,dist));}
/* culling-sphere radius: the cow's periscope neck rises two blocks over its head */
const HR_MOB_R={cow:3.6,spider:1.6,pig:1.4,sheep:1.6};
function hrMobMesh(mt,G){
  const H=hrBuild(HR_MOB[mt]);if(!H)return null;
  H.G=G;H.r=HR_MOB_R[mt]||Math.max(1,MOBT[mt].h*1.25);G.add(H.hr.root);
  return {G,legs:[],mats:hrEntFlashMats(H),hrM:H};}
/* free blocks above a cow's head (0-3): fewer than 3 and the periscope extends sideways instead */
function hrHeadroom(e){const x=Math.floor(e.x),z=Math.floor(e.z),y0=Math.floor(e.y+e.h);let n=0;
  while(n<3&&!solidAt(x,y0+n,z))n++;return n;}
/* the one cow allowed to periscope: nearest within 6 blocks that can see Dan (every 0.5 s) */
function hrNearestCow(){if(!P||P.dead)return null;let best=null,bd=36;
  for(const e of entities){if(e.dead||e.mt!=='cow'||!e.hrM)continue;const dx=e.x-P.x,dz=e.z-P.z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=e;}}
  return best&&mobSees(best)?best:null;}
/* hook C6: called from updateMob with its function-scope target (tdx, tdz, td, _tb) and hostility */
function hrMobTick(e,dt,T,tdx,tdz,td,_tb,hostileNow){try{hrMobTick1(e,dt,T,tdx,tdz,td,_tb,hostileNow);}catch(err){hrEntFail('mob '+e.mt,err);}}
function hrMobTick1(e,dt,T,tdx,tdz,td,_tb,hostileNow){
  const H=e.hrM,s=H.s,amax=hrMobAmax(T);
  s.speed=Math.min(1.3,Math.hypot(e.vx,e.vz)/(T.spd*2.2));
  if(e.atkT>e._a0+1e-4)s.fired=true;                        /* re-armed this frame: the damage tick or the arrow spawn */
  const ag=amax-e.atkT;s.attack=e.atkT>0&&ag<.8?Math.sin(ag/.8*Math.PI):0;
  s.cd=e.atkT/amax;s.near=td;s.hurt=e.hurtT/0.5;
  if(T.boom){if(e.mode==='chase')s.fuse=Math.min(1,e.fuse/1.5);else s.fuse=Math.max(0,s.fuse-dt);}   /* OG freezes e.fuse outside chase */
  if(hostileNow||td<10){
    const ty=_tb?_tb.y+1.62:(P.y+(P.eyeY||1.62));
    s.yaw=hrClampE(hrWrap(Math.atan2(tdx,tdz)-e.yaw),-1.1,1.1);
    s.pitch=hrClampE(hrMobPitch(e.y+.85*e.h,ty,td),-0.6,0.6);}
  else{const k=Math.pow(0.92,dt*60);s.yaw*=k;s.pitch*=k;}
  if(e.mt==='alien'){s.talk=!!(dlgOpen&&DLGE===e);s.mood=e.mood==='h'?'displeased':((e.rom===2||e.rel>=40)?'happy':undefined);}
  else if(e.mt==='cow'){s.periscope=HRE.cow===e;if((frameCount+H.k)%30===0)s.headroom=hrHeadroom(e);}
  hrAccel(H,e.vx,e.vy,e.vz,dt);
  hrStep(H,dt,e.x,e.y,e.z,H.r);}
