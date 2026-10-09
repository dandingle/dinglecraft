/* ---- PART 57: m3_h_reg.js ---- */
/* ===================================================================== */
/* PART 57 m3 · file h: registration (plan 5.3) and the M3 tick.         */
/* MGREG.rig.og, MGREG.mesh (his entities), MGREG.fx (draw = mg3Draw,    */
/* burst, dress, decal, cubes, chunk, chomp, prop, event, cam, scene,    */
/* step, clear, zone), the OG value script (an updateSky wrapper on      */
/* onBoot, after the original, only within 140 m), the sliced prewarm    */
/* (textures in the height band within 220 m; the model within 70 m),    */
/* LOD, the bodies' animators, disposal on reset / far / dimension.      */
/* ===================================================================== */
var MG3T={live:0,prewarm:0,pw:null,lastD:1e9};
/* the per-frame M3 work (MGREG.tick: only called by tickMalg within 220 m, overworld, unpaused) */
function mg3Tick(dt){MG3.frame++;MG3T.live=1;MG3T.lastD=MGF.d;
  /* the sliced build (bible 5.6, 5.8): textures from 220 m in the height band; the model's geometry from 70 m */
  if(MGF.band&&!DEMON.dead){if(!(MG3.tex&&MG3.tex.done))mg3TexStep();else if(MGF.d<MGC.R_PREWARM&&!MG3.geo.p1)mg3PartsStep(1);}
  mg3FxTick(dt);
  /* his entities' bodies (eye, Morsels, Husks, Bloaters) animate themselves; rig LOD by camera distance */
  for(const e of entities){if(e.dead||e.t!=='mob'||!e.mesh)continue;const a=e.mesh.userData&&e.mesh.userData.mg3a;if(a&&MOBT[e.mt]&&MOBT[e.mt].mg&&e.mesh.userData.mg3f!==MG3.frame){e.mesh.userData.mg3f=MG3.frame;try{a(dt,e);}catch(err){mgFail('m3 body',err);}}}
  const cx=typeof camera!=='undefined'&&camera?camera.position.x:P.x,cz=typeof camera!=='undefined'&&camera?camera.position.z:P.z;
  for(const r of MG3.rigs){if(!r.root.parent||r.kind==='proxy')continue;const p=r.root.position,d=Math.hypot(p.x-cx,p.z-cz);r.lod(d>50?1:0);}
  if(typeof mg3DressTick==='function')mg3DressTick(dt);}
/* one prewarm step: build the next missing part of the L0 geometry set */
function mg3PartsStep(q){const k='p'+q;if(MG3.geo[k])return true;if(!MG3T.pw||MG3T.pw.q!==q){MG3T.pw={q,i:0};}
  /* the full set is built by mg3Parts in one go; spread it over frames by building the heavy lofts first into a scratch cache */
  const steps=[()=>mg3PSkull(q),()=>mg3PChest(q),()=>mg3PBelly(q),()=>mg3TeethUpper(q),()=>mg3PHorn(q,1)];
  if(MG3T.pw.i<steps.length){steps[MG3T.pw.i++]();return false;}mg3Parts(q);return true;}
/* body stepper for M2 (fx.step): idempotent per frame */
function mg3Step(e,dt){const a=e&&e.mesh&&e.mesh.userData&&e.mesh.userData.mg3a;if(a&&e.mesh.userData.mg3f!==MG3.frame){e.mesh.userData.mg3f=MG3.frame;a(dt,e);}}
/* disposal: a new world, walking out past 220 m, a dimension change (bible plan 1.8) */
function mg3Clear(full){mg3FxClear();if(typeof mg3DressClear==='function')mg3DressClear();MG3T.live=0;
  if(full){for(const r of MG3.rigs.slice())if(!r.root.parent)mg3Dispose(r);}}
function mg3Reset(){mg3Clear(true);if(MG3.tex){for(const k in MG3.tex.list){const t=MG3.tex.list[k].t;if(t&&t.dispose)t.dispose();}MG3.tex=null;}
  for(const k in MG3.geo){if(/^p\d/.test(k)){const G=MG3.geo[k];for(const n in G){const g=G[n];if(g&&g.dispose)g.dispose();}delete MG3.geo[k];}}delete MG3.geo.strataSpec;MG3T.pw=null;}
function mg3Far(){mg3Clear(true);}
/* boot: install the OG value script (an updateSky wrapper that runs after the original; inert beyond 140 m and outside the overworld) */
function mg3CamGuard(){if(!CUT.on||!CUT.script||typeof camera==='undefined'||!camera)return;const b=MGF.boss,r=b&&!b.dead&&b.mgRig;if(!r||!r.caps||r.kind!=='boss')return;
  const c=camera.position,caps=r.caps(1);for(let it=0;it<2;it++)for(const k of caps){const a=k.a,bb=k.b,ab=[bb[0]-a[0],bb[1]-a[1],bb[2]-a[2]],l2=ab[0]*ab[0]+ab[1]*ab[1]+ab[2]*ab[2]||1;
    const u=mg3Cl(((c.x-a[0])*ab[0]+(c.y-a[1])*ab[1]+(c.z-a[2])*ab[2])/l2,0,1),q=[a[0]+ab[0]*u,a[1]+ab[1]*u,a[2]+ab[2]*u],dx=c.x-q[0],dy=c.y-q[1],dz=c.z-q[2],d=Math.hypot(dx,dy,dz),R=k.r+1.0;
    if(d<R){const s=d>1e-4?(R/d):0;if(s)c.set(q[0]+dx*s,q[1]+dy*s,q[2]+dz*s);else c.set(q[0],q[1]+R,q[2]);MG3T.guard=(MG3T.guard||0)+1;}}}
function mg3Boot(){if(typeof cutCam==='function'&&!cutCam.mg3){const c0=cutCam;const wc=function(){const r=c0.apply(this,arguments);try{mg3CamGuard();}catch(err){mgFail('m3 camguard',err);}return r;};wc.mg3=1;cutCam=wc;}
  if(typeof updateSky!=='function'||updateSky.mg3)return;const f0=updateSky;
  const w=function(dt){const r=f0.apply(this,arguments);try{if(typeof mg3Sky==='function')mg3Sky(dt);}catch(err){mgFail('m3 sky',err);}return r;};w.mg3=1;updateSky=w;}
MGREG.rig.og=mg3Rig;
MGREG.mesh.mgmorsel=mg3Morsel;MGREG.mesh.mghusk=mg3Husk;MGREG.mesh.mgbloat=mg3Bloat;MGREG.mesh.mgpart=mg3PartBody;MGREG.mesh.mgeye=mg3EyeBody;
MGREG.fx={draw:mg3Draw,burst:mg3Burst,decal:mg3Decal,cubes:mg3Cubes2,chunk:mg3Chunk,chomp:mg3Chomp,prop:mg3Prop,step:mg3Step,clear:mg3FxClear,props:mg3PropsClear,
  dress:function(st){if(typeof mg3Dress==='function')return mg3Dress(st);},event:function(n,o){if(typeof mg3Event==='function')return mg3Event(n,o);},
  cam:function(n,o){return typeof mg3Cam==='function'?mg3Cam(n,o):null;},scene:function(n,t,o){if(typeof mg3Scene==='function')return mg3Scene(n,t,o);},
  zone:function(n){const b=MGF.boss;const r=b&&b.mgRig;return r&&r.zone?r.zone(n):null;},caps:function(){const b=MGF.boss;const r=b&&b.mgRig;return r&&r.caps?r.caps():[];}};
MGREG.tick.push(mg3Tick);MGREG.onReset.push(mg3Reset);MGREG.onFar.push(mg3Far);MGREG.onBoot.push(mg3Boot);
MGEX.mg3Rig=mg3Rig;MGEX.getMG3=()=>MG3;MGEX.mg3Draw=mg3Draw;MGEX.mg3Core=()=>({MG3,MG3FX,MG3P,MG3ST,MG3T,MG3D,MG3CAM,mg3Cam,mg3Sky,mg3Grade,mg3Fang,mg3Loft,mg3Sweep,
  env:()=>({scene,camera,fog:scene&&scene.fog,bg:scene&&scene.background,sun:typeof sunSpr!=='undefined'?sunSpr:null,moon:typeof moonSpr!=='undefined'?moonSpr:null,amb:typeof ambL!=='undefined'?ambL:null,stars:typeof stars!=='undefined'?stars:null,skyWrapped:typeof updateSky==='function'&&!!updateSky.mg3}),mg3Parts,mg3Fk,mg3Wp,mg3Me,mg3Eu,mg3TexAll,mg3TexStep,mg3Pose,mg3Proxy,mg3StrataSpec,mg3Cubes2,mg3Chunk,mg3Burst,mg3Decal,mg3Chomp});

