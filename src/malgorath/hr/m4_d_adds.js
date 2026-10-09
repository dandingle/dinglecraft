/* ---- PART 57 HR: m4_d_adds.js ---- */
/* ===================================================================== */
/* PART 57 HR · m4_d_adds.js (M4): MGREG.mesh_hr, the Hyperreal bodies of */
/* his leftovers (bible 11, 20): the Husk (the zombie cast, charred, with */
/* face_husk when packed), the Bloater (the boomer keg, swollen and       */
/* charred, bile glowing through), the Morsel (a cube of the world that   */
/* bites: the pack's own block material, enamel teeth) and the eye in the */
/* slit (the photoreal mg_eye: the first thing you see of him in HR).     */
/* ===================================================================== */
/* mgMobMesh asks mesh_hr[mt](G,mats,opts) when opts.hr and MGREG.hrOn(). The body handle rides on G.userData.mgHrM (and is
   returned as hrM, so a brain that copies it into e.hrM gets the v6.0 cast's pack-off rebuild for free). Bodies are stepped
   here, once per frame, from MGREG.tick (M2's brains need not know about them); adds that were built OG while the cast was
   live (or HR after it went off) are swapped in place, two per frame. Every instance owns its materials (disposed with it). */
const HR_MG_ADD={mghusk:{model:'zombie',r:2.2,char:0.3,em:0xff5a1a,ei:0.7},mgbloat:{model:'boomer',r:2.4,char:0.55,em:0xa8c020,ei:0.85,
  sx:1.38,sy:1.18},mgmorsel:{r:1.6},mgeye:{r:0.8}};
function hrMgAddH(root,update,mats,r,kind){const s=typeof hrS==='function'?hrS(1+(HR_MG.addN=(HR_MG.addN||0)+1)%997):{speed:0,attack:0,hurt:0,dead:0,yaw:0,pitch:0};
  const meshes=[];hrMgRestify(root);root.traverse(o=>{if(o.material&&o.geometry){o.userData.hr=1;o.userData.cs=o.castShadow;meshes.push(o);}});
  return {hr:{root,update,mats},s,k:typeof HRE!=='undefined'?HRE.n++:0,acc:0,lod:-1,meshes,tiny:[],G:null,r,mgKind:kind,mgOwn:mats.slice(),mgF:-1};}
/* the char pass on a v6.0 cast body: per-instance clones, darkened, ember cracks through the procedural (or mg_char) mask */
function hrMgChar(H,A){let m3=null;try{const T=typeof mg3TexInit==='function'?mg3TexInit():null;m3=T&&T.list&&T.list.hideE?T.list.hideE.t:null;}catch(err){m3=null;}
  const art=hrMgTex('mg_char','m'),pr=art||m3?null:hrMgProc(),mask=art||m3||(pr&&pr.mask),own=[],seen=new Map();   /* fal char, else M3's organic crack mask */
  const fz=typeof hrEntTexURL==='function'?hrEntTexURL('face_zombie','_basecolor.png'):'',fzt=fz&&typeof hrEntLoadTex==='function'?hrEntLoadTex(fz,true):null;
  const fh=hrMgTex('face_husk','b'),cb=hrMgTex('mg_char','b');
  for(const o of H.meshes){const arr=Array.isArray(o.material),ms=[].concat(o.material).map(m=>{if(!m||!m.isMeshStandardMaterial&&m.type!=='MeshStandardMaterial'&&!(m.color&&m.emissive))return m;
      if(seen.has(m))return seen.get(m);const c=hrTag(m.clone());seen.set(m,c);own.push(c);
      const face=fzt&&m.map===fzt;
      if(face&&fh){c.map=fh;c.color.setRGB(1,1,1);}
      else{c.color.setRGB(m.color.r*A.char,m.color.g*A.char*0.92,m.color.b*A.char*0.85);if(cb&&!face&&!m.map)c.map=cb;}
      if(mask){c.emissiveMap=mask;c.emissive=new THREE.Color(A.em);c.emissiveIntensity=face?A.ei*0.4:A.ei;}
      c.roughness=Math.min(1,(c.roughness||0.8)+0.1);return c;});
    o.material=arr?ms:ms[0];}
  /* the replaced originals are left alone: the cast mixes per-instance clones with module caches (HR.mat) that a first instance cannot
     tell apart, and disposing a cache other zombies still wear would only buy a recompile hitch */
  H.mgOwn=H.mgOwn.concat(own);return own;}
function hrMgCastBody(mt,G){const A=HR_MG_ADD[mt];if(typeof hrBuild!=='function')return null;
  const H=hrBuild(A.model);if(!H)return null;
  H.mgKind=mt;H.mgOwn=[];H.mgF=-1;H.r=A.r;H.G=G;
  hrMgChar(H,A);
  if(A.sx)H.hr.root.scale.set(A.sx,A.sy,A.sx);
  G.add(H.hr.root);G.userData.mgHrM=H;
  return {G,legs:[],mats:[],hrM:H};}
/* the Morsel: a cube of somebody's world that bites, on four stubby legs (M3's OG design, 4K here): the pack's own block material
   (the world is the world in both packs: pillar 2), a wet flesh mouth on its front face with two rows of real enamel teeth that
   chomp as it runs, hide-skinned legs */
function hrMgMorsel(G){const k=1.2,blk=typeof B!=='undefined'?B:null,M=hrMgMats(),body=new THREE.Group(),legs=[];body.position.y=0.95;
  const ids=blk?[blk.GRASS,blk.DIRT,blk.STONE,blk.SAND,blk.COAL_ORE,blk.IRON_ORE,blk.COBBLE].filter(x=>x!==undefined):[1],id=ids[(HR_MG.addN||0)%ids.length];
  const cube=new THREE.Mesh(typeof mkCubeGeo==='function'&&blk?mkCubeGeo(id,k):new THREE.BoxGeometry(k,k,k),matOp);body.add(cube);
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(0.86,0.42,0.08),M.set.flesh);mouth.position.set(0,-0.12,k/2-0.01);body.add(mouth);
  const tg=new THREE.ConeGeometry(0.055,0.17,6),up=new THREE.Group(),dn=new THREE.Group();up.position.set(0,0.07,k/2+0.02);dn.position.set(0,-0.31,k/2+0.02);
  for(let i=0;i<6;i++){const x=(i-2.5)*0.14;const a=new THREE.Mesh(tg,M.set.enamel);a.rotation.x=Math.PI;a.position.set(x,-0.04,0);up.add(a);
    const c=new THREE.Mesh(tg,M.set.enamel);c.position.set(x+0.07,0.04,0);dn.add(c);}
  body.add(up);body.add(dn);
  const lg=new THREE.BoxGeometry(0.28,0.42,0.28);
  for(const [sx,sz,ph] of [[-1,-1,0],[1,-1,Math.PI],[-1,1,Math.PI],[1,1,0]]){const g=new THREE.Group();g.position.set(sx*0.36,0.4,sz*0.36);
    const m=new THREE.Mesh(lg,M.set.hide);m.position.y=-0.2;g.add(m);legs.push({g,ph});}
  const root=new THREE.Group();root.name='mg_morsel';root.add(body);for(const l of legs)root.add(l.g);
  let an=0;
  const H=hrMgAddH(root,function(dt,tt,s){const sp=Math.min(1.3,s.speed||0);an+=dt*(2+sp*7);body.position.y=0.95+Math.abs(Math.sin(an))*0.12*Math.min(1,sp*2);
    const open=0.05+0.1*Math.abs(Math.sin(an*1.7))+0.12*(s.attack||0);up.position.y=0.07+open*0.5;dn.position.y=-0.31-open*0.5;mouth.scale.y=1+open*2;
    for(const l of legs)l.g.rotation.x=Math.sin(an+l.ph)*0.7*Math.min(1,sp*2);},M.list,HR_MG_ADD.mgmorsel.r,'mgmorsel');
  H.mgMats=M;H.G=G;G.add(root);G.userData.mgHrM=H;
  return {G,legs:[],mats:[],hrM:H};}
/* the eye in the slit: a wet amber eye with a vertical slit pupil (mg_eye, projected by the object-space normal: the iris sits on
   the +z pole), a hide lid that blinks and squeezes shut, bloodshot after the first poke. It reads M1's eye entity every frame:
   e.mgLook (the world point it stares at), e.mgShut, e.mgBlink, e.mgBlood, e.mgPupil (Dan's closeness narrows and brightens it). */
function hrMgEyeBody(G){const M=hrMgMats(),root=new THREE.Group(),aim=new THREE.Group();root.add(aim);
  const em=M.set.eye,U=em.userData.mgU;if(U){U.uMgUV.value=0;U.uMgEye.value=1;}
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.3,32,24),em);ball.name='mg_eye';aim.add(ball);
  const lidG=new THREE.SphereGeometry(0.335,28,14,0,Math.PI*2,0,Math.PI*0.5);
  const lidT=new THREE.Mesh(lidG,M.set.hide),lidB=new THREE.Mesh(lidG,M.set.hide);lidB.rotation.z=Math.PI;aim.add(lidT);aim.add(lidB);
  let t=0,cl=0;const base=em.color.clone?em.color.clone():null;
  const H=hrMgAddH(root,function(dt,tt,s){t+=dt;const e=H.mgE;
    if(e&&e.mgLook&&G.parent){const L=e.mgLook,dx=L[0]-e.x,dy=L[1]-(e.y+0.35),dz=L[2]-e.z;aim.rotation.y=Math.atan2(dx,dz)-(G.rotation.y||0);
      aim.rotation.x=-Math.atan2(dy,Math.max(0.2,Math.hypot(dx,dz)));aim.rotation.order='YXZ';}
    const shut=e&&(e.mgShut||e.mgBlink)?1:0;cl+=((shut?1:0)-cl)*Math.min(1,dt*(shut?22:9));
    lidT.rotation.x=-0.25-1.05*(1-cl);lidB.rotation.x=0.25+1.05*(1-cl);
    const pu=e&&e.mgPupil?+e.mgPupil:0,bl=e&&e.mgBlood?1:0;em.emissiveIntensity=(0.45+0.6*pu+1.5*(s.hurt||0))*(1-0.85*cl);
    if(base&&em.color.setRGB)em.color.setRGB(base.r+(0.9-base.r)*0.35*bl,base.g*(1-0.45*bl),base.b*(1-0.45*bl));},M.list,HR_MG_ADD.mgeye.r,'mgeye');
  H.mgMats=M;H.G=G;G.add(root);G.userData.mgHrM=H;
  return {G,legs:[],mats:[],hrM:H};}
MGREG.mesh_hr.mghusk=function(G,mats,opts){try{return hrMgCastBody('mghusk',G);}catch(err){hrMgFail('husk',err);return null;}};
MGREG.mesh_hr.mgbloat=function(G,mats,opts){try{return hrMgCastBody('mgbloat',G);}catch(err){hrMgFail('bloat',err);return null;}};
MGREG.mesh_hr.mgmorsel=function(G,mats,opts){try{return hrMgMorsel(G);}catch(err){hrMgFail('morsel',err);return null;}};
MGREG.mesh_hr.mgeye=function(G,mats,opts){try{return hrMgEyeBody(G);}catch(err){hrMgFail('eye',err);return null;}};
/* free one body: the v6.0 cast's own geometry/material bookkeeping (hrFree) plus the clones and sets made here */
function hrMgAddFree(H){if(!H||H.mgFreed)return;H.mgFreed=1;
  if(H.mgKind==='mghusk'||H.mgKind==='mgbloat'){if(typeof hrFree==='function')try{hrFree(H);}catch(err){}}
  for(const m of H.mgOwn||[])if(m&&m.dispose)m.dispose();if(H.mgMats)hrMgMatsFree(H.mgMats);
  if(H.hr&&H.hr.root&&H.hr.root.parent)H.hr.root.parent.remove(H.hr.root);}
/* step one body (once per frame, whoever asks first): the entity's motion becomes the model's s */
function hrMgAddStep(e,dt){const H=e.mesh&&e.mesh.userData&&e.mesh.userData.mgHrM;if(!H||H.mgFreed||!H.G)return;
  if(H.mgF===frameCount)return;H.mgF=frameCount;H.mgE=e;const s=H.s,T=MOBT[e.mt]||{};
  s.speed=Math.min(1.3,Math.hypot(e.vx||0,e.vz||0)/Math.max(0.5,(T.spd||1)*2.2));s.hurt=(e.hurtT||0)/0.5;
  if(typeof e.atkT==='number'){const ag=0.8-e.atkT;s.attack=e.atkT>0&&ag>=0?Math.sin(hrMgCl(ag/0.8,0,1)*Math.PI):0;}
  if(e.mt==='mgbloat')s.fuse=hrMgCl((e.fuse||0)/1.5,0,1);
  if(P&&!P.dead&&typeof hrWrap==='function'){const dx=P.x-e.x,dz=P.z-e.z,d=Math.hypot(dx,dz);s.near=d;
    if(d<24){s.yaw=hrMgCl(hrWrap(Math.atan2(dx,dz)-(e.yaw||0)),-1.1,1.1);s.pitch=hrMgCl(Math.atan2((P.y+1.6)-(e.y+(e.h||1)*0.85),Math.max(0.5,d)),-0.6,0.6);}}
  if(typeof hrAccel==='function'&&H.pv)hrAccel(H,e.vx||0,e.vy||0,e.vz||0,dt);
  if(typeof hrStep==='function'&&HRE.F)hrStep(H,dt,e.x,e.y,e.z,H.r);
  else try{H.hr.update(dt,0,s);}catch(err){}}
MGREG.mesh_hr.step=hrMgAddStep;
/* swap one add between skins in place (the OG mesh comes back from MGREG.mesh, an HR body from mesh_hr) */
function hrMgAddSwap1(e,toHr){if(!e||e.dead||!e.mesh)return false;const H=e.mesh.userData&&e.mesh.userData.mgHrM;
  if(toHr===!!H)return false;
  let r=null;try{const G=new THREE.Group();r=toHr?(MGREG.mesh_hr[e.mt]?MGREG.mesh_hr[e.mt](G,[],{hr:1}):null):(MGREG.mesh[e.mt]?MGREG.mesh[e.mt](G,[],{}):null);}
  catch(err){hrMgFail('add swap',err);r=null;}
  if(!r||!r.G)return false;
  const old=e.mesh;r.G.position.copy(old.position);r.G.rotation.copy(old.rotation);if(old.parent)old.parent.remove(old);scene.add(r.G);
  e.mesh=r.G;e.legs=r.legs||[];e.mats=r.mats||[];
  if(H){if(e.hrM===H)e.hrM=null;hrMgAddFree(H);}
  if(!toHr&&typeof shadowify==='function')shadowify(r.G);
  return true;}
function hrMgAddsSwap(toHr){let n=0;for(const e of entities){if(e.dead||!e.mesh||!HR_MG_ADD[e.mt])continue;if(hrMgAddSwap1(e,toHr&&hrMgLive()))n++;}return n;}
/* per frame: free the bodies of the dead (a registry: pruneEnts may drop an entity before we see it), reconcile skins (two
   swaps a frame) and step every Hyperreal add body */
function hrMgAddsTick(dt,live){let sw=0;const R=HR_MG.addReg||(HR_MG.addReg=new Map());
  for(const [H,e] of R)if(e.dead||H.mgFreed||!e.mesh||!e.mesh.userData||e.mesh.userData.mgHrM!==H){hrMgAddFree(H);R.delete(H);}
  for(const e of entities){if(e.dead||!e.mesh||!HR_MG_ADD[e.mt])continue;
    if(sw<2&&(live?!e.mesh.userData.mgHrM:!!e.mesh.userData.mgHrM)&&hrMgAddSwap1(e,live))sw++;
    const H=e.mesh.userData&&e.mesh.userData.mgHrM;
    if(H){if(!R.has(H))R.set(H,e);if(live)hrMgAddStep(e,dt);}}
  HR_MG.addN2=R.size;}
