/* ---- PART 55: p1_rules.js ---- */
/* ===================================================================== */
/* PART 55 . p1 rules (P1): the world's rules, cues, sky, the Grid, beacons, the Followspot, arches, booths (bible 3.4-3.15, 15.3) */
/* ===================================================================== */
/* Logic runs from PREG.tick (inside purgatory, never during a purgatory CUT) and PREG.onBreak. Visuals (the Grid, beacons, spots,
   reveals, collapses, props) are built lazily inside purgatory only and stepped once per frame from mpSky (OG) and from the tick
   (Hyperreal owns the sky through hrSky, so mpSky may not run there). Never a new THREE light: every glow is an additive mesh.
   World edits that must not reach the save (arch openings, the EXIT doors, tree limps and regrowth, flat topples, sheet
   re-tension) regenerate the loaded chunk from genChunk + its edits instead of calling setBlock. */
var MWR=mwRulesFresh();
function mwRulesFresh(){return {opening:{a2:0,a3:0},anim:null,work:false,fx:null,bfx:{},entry:0,spot:{x:0,y:40,z:-136,who:null,acqT:0},
  sag:{k:null,t:0,y:0},pins:[],top:[],tesla:{last:{},sec:-1,n:0,list:[],lt:-9,arcs:[]},boo:-99,cpSeen:undefined,
  skin:{k:null,cd:0},band:{t:0,n:0},lt:-9,at:0,rt:-9,gt:-9,ft:0,sky:null,ug:0,f:-1,flare:[0,0,0],twitch:null,flicker:{},anims:[]};}
var MWV={root:null,seed:null,grid:null,beac:null,spot:null,pal:null,tes:null,props:null,flare:null,glow:null};   /* visuals (session) */
function mwAdd(){return THREE.AdditiveBlending!==undefined?THREE.AdditiveBlending:2;}
function mwMat(color,o){o=o||{};if(o.lit)return new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide});   /* props darken with the cues */
  const m=new THREE.MeshBasicMaterial({color,transparent:o.op!=null||!!o.add||!!o.map,opacity:o.op!=null?o.op:1,
    depthWrite:!(o.add||o.nodw),fog:o.fog!==false,side:o.side!=null?o.side:THREE.DoubleSide,map:o.map||null});
  if(o.add)m.blending=mwAdd();return m;}
function mwCanvas(w,h,f){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');f(g,w,h);
  const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t;}
function mwSoftDisc(){if(MWV.disc)return MWV.disc;return MWV.disc=mwCanvas(64,64,(g,w)=>{
  if(typeof g.createRadialGradient==='function'){const r=g.createRadialGradient(32,32,2,32,32,31);r.addColorStop(0,'rgba(255,255,255,1)');
    r.addColorStop(0.55,'rgba(255,255,255,0.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;}else g.fillStyle='#fff';
  g.beginPath&&g.beginPath();g.arc&&g.arc(32,32,31,0,6.283);g.fill&&g.fill();});}
function mwSprite(color,scale,op){const m=new THREE.SpriteMaterial({map:mwSoftDisc(),color,transparent:true,depthWrite:false,fog:false,opacity:op!=null?op:1});
  m.blending=mwAdd();const s=new THREE.Sprite(m);s.scale.set(scale,scale,1);return s;}
function mwBox(w,h,d,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);return m;}
/* merged box geometry for static decoration (one draw call per strip) */
function mwBoxPush(P,I,x0,y0,z0,x1,y1,z1){const b=P.length/3;
  P.push(x0,y0,z0,x1,y0,z0,x1,y1,z0,x0,y1,z0,x0,y0,z1,x1,y0,z1,x1,y1,z1,x0,y1,z1);
  I.push(b,b+2,b+1,b,b+3,b+2,b+4,b+5,b+6,b+4,b+6,b+7,b,b+1,b+5,b,b+5,b+4,b+3,b+7,b+6,b+3,b+6,b+2,b+1,b+2,b+6,b+1,b+6,b+5,b,b+4,b+7,b,b+7,b+3);}
function mwGeo(P,I){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);
  if(g.computeBoundingSphere)g.computeBoundingSphere();return g;}

/* ===== the cue clock (bible 3.5): SHOW 7:00 (last 3 s = the warning) -> BLACKOUT 1:30, paused during fights, Intermission, Strike ===== */
const MW_CUE={SHOW:420,WARN:3,BLACK:90};
function mwPaused(){const hs=typeof hnState==='function'?hnState():null;return !!(hs&&(hs.live||hs.inter||hs.strike));}
function mwCue(){if(MP.strike||MWR.work)return {ph:'work',left:0};
  if(mwPaused())return {ph:'paused',left:0};
  const t=MP.cue&&typeof MP.cue.t==='number'?MP.cue.t:0,C=MW_CUE;
  if(t<C.SHOW-C.WARN)return {ph:'show',left:C.SHOW-C.WARN-t};
  if(t<C.SHOW)return {ph:'warn',left:C.SHOW-t};
  return {ph:'blackout',left:C.SHOW+C.BLACK-t};}
function mwCueTick(dt){const C=MW_CUE;if(!MP.cue||typeof MP.cue.t!=='number')MP.cue={t:0,ph:'show'};
  const before=mwCue().ph;
  if(!(MP.strike||MWR.work)&&!mwPaused()){MP.cue.t+=dt;if(MP.cue.t>=C.SHOW+C.BLACK)MP.cue.t-=C.SHOW+C.BLACK;}
  const now=mwCue().ph;MP.cue.ph=now==='paused'||now==='work'?MP.cue.ph:now;
  if(before!==now){
    if(now==='warn')mwS('pg_clicks');
    if(now==='blackout'){MWR.spot.who=null;MWR.spot.acqT=0;}
    if(before==='blackout'&&now==='show'&&P&&!P.dead&&DIM==='puppet')mpTickOff('blackout');}}

/* ===== the Followspot (BLACKOUT): an additive cone + ground disc on the most exposed player; hostiles read mwFollowTarget() ===== */
function mwPlayers(){const L=[];if(P&&!P.dead&&DIM==='puppet')L.push({who:'Dan',e:P});
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS)if(a.e&&!a.dead&&a.online&&a.dim===DIM)L.push({who:a.name,e:a.e});
  return L;}
function mwLampNear(x,y,z,r){for(const k of torches){const p=dimP(k);if(!p)continue;if(Math.abs(+p[0]-x)<=r&&Math.abs(+p[1]-y)<=r&&Math.abs(+p[2]-z)<=r)return true;}
  for(const k of MP_LIGHTS){const p=dimP(k);if(!p)continue;const id=getBlock(+p[0],+p[1],+p[2]);if(id!==B.PG_LAMP)continue;
    if(Math.abs(+p[0]-x)<=r&&Math.abs(+p[1]-y)<=r&&Math.abs(+p[2]-z)<=r)return true;}
  return false;}
function mwExposed(e){const x=Math.floor(e.x),y=Math.floor(e.y+1.5),z=Math.floor(e.z);return skyOpen(x,y,z)&&!mwLampNear(x,y,z,4);}
function mwFollowTick(){const S=MWR.spot;if(mwCue().ph!=='blackout'){S.who=null;return;}
  const L=mwPlayers().filter(p=>mwExposed(p.e));
  let pick=L.find(p=>p.who===S.who)||null;
  if(!pick&&L.length){let bd=1e9;for(const p of L){const d=Math.hypot(p.e.x-S.x,p.e.z-S.z);if(d<bd){bd=d;pick=p;}}}
  S.who=pick?pick.who:null;}
function mwFollowTarget(){if(mwCue().ph!=='blackout'||!MWR.spot.who)return null;const S=MWR.spot;
  const e=S.who==='Dan'?P:(agByName(S.who)||{}).e;if(!e)return null;return {who:S.who,x:e.x,y:e.y,z:e.z};}

/* ===== the sky (OG updateSky puppet branch, hook P1-01): colours and near/far only, never null fog or background ===== */
const MW_SKY={show:{bg:[0.165,0.086,0.149],n:0.35,f:0.9,amb:0.62,ac:[1,0.886,0.69],dir:0.45,lamp:[1,0.83,0.42]},
  blackout:{bg:[0.027,0.024,0.039],n:0.3,f:0.8,amb:0.18,ac:[0.8,0.8,1],dir:0.05,lamp:[0.06,0.05,0.05]},
  bomber:{bg:[0.227,0.141,0.071],n:0.3,f:0.85,amb:0.56,ac:[1,0.82,0.6],dir:0.42,lamp:[1,0.7,0.35]},
  bigpig:{bg:[0.227,0.078,0.188],n:0.33,f:0.9,amb:0.6,ac:[1,0.8,0.9],dir:0.45,lamp:[1,0.62,0.8]},
  bigfrog:{bg:[0.063,0.102,0.165],n:0.3,f:0.85,amb:0.45,ac:[0.78,0.88,1],dir:0.35,lamp:[0.6,0.75,1]},
  work:{bg:[0.847,0.847,0.816],n:0.6,f:1.25,amb:1.0,ac:[1,1,1],dir:0.6,lamp:[1,1,0.96]}};
function mwSkyKey(){if(MP.strike||MWR.work)return 'work';
  const hs=typeof hnState==='function'?hnState():null;if(hs&&hs.live&&hs.light&&MW_SKY[hs.light])return hs.light;
  if(MWR.fx&&MWR.fx.k==='dark')return 'blackout';
  return mwCue().ph==='blackout'?'blackout':'show';}
function mwLampMul(){let m=1;const c=mwCue();
  if(c.ph==='warn')m=c.left>2?0.75:(c.left>1?0.5:0.25);                      /* the Grid dips in three visible steps */
  const fx=MWR.fx;if(fx){const t=fx.t;
    if(fx.k==='flicker')m*=(Math.floor(t*17)%3===0||Math.floor(t*11)%4===1)?0.15:1;
    else if(fx.k==='dip')m*=0.35;
    else if(fx.k==='flash3')m*=(t%0.6)<0.22?2.2:0.7;}
  return m;}
function mpSky(dt){if(!scene||!scene.background||!scene.fog)return;
  if(CUT.on&&CUT.script)mwVisual(dt);   /* PZ: only in cutscenes; in a running frame mwTick draws it AFTER MP.clock advances (from here it
   lagged a frame, and the updateSky(0) at the Hyperreal->OG switch redrew the bulbs one tick later: the OG->HR->OG hash changed) */
  const key=mwSkyKey(),T=MW_SKY[key],S=MWR.sky||(MWR.sky={bg:T.bg.slice(),n:T.n,f:T.f,amb:T.amb,ac:T.ac.slice(),dir:T.dir,key});
  const snap=key==='blackout'||key==='work'||S.key==='blackout'&&key!=='blackout';S.key=key;
  const k=1-Math.exp(-dt*(snap?16:2.6)),L=(a,b)=>a+(b-a)*k;
  for(let i=0;i<3;i++){S.bg[i]=L(S.bg[i],T.bg[i]);S.ac[i]=L(S.ac[i],T.ac[i]);}
  S.n=L(S.n,T.n);S.f=L(S.f,T.f);S.amb=L(S.amb,T.amb);S.dir=L(S.dir,T.dir);
  const c=P?mpCol(P.x,P.z):null,under=c&&P.y+1.4<c.gb-2&&key!=='work'&&!skyOpen(Math.floor(P.x),Math.floor(P.y+1.6),Math.floor(P.z))?1:0;   /* the Understage is always dark (a trench is not) */
  MWR.ug=MWR.ug+(under-MWR.ug)*(1-Math.exp(-dt*2.5));
  const mul=key==='show'?Math.max(0.55,mwLampMul()):(MWR.fx&&MWR.fx.k==='flash3'?1.3:1);
  scene.background.setRGB(S.bg[0],S.bg[1],S.bg[2]);scene.fog.color.copy(scene.background);
  scene.fog.near=RD*CH*S.n;scene.fog.far=RD*CH*S.f;
  let amb=S.amb*mul*(1-0.7*MWR.ug);if(fullbright)amb=Math.max(1.05,amb);
  ambL.intensity=amb;ambL.color&&ambL.color.setRGB&&ambL.color.setRGB(S.ac[0],S.ac[1],S.ac[2]);
  sunL.intensity=fullbright?0.3:S.dir*mul*(1-0.9*MWR.ug);
  if(P){sunL.position.set(P.x+0.01,P.y+120,P.z+0.01);
    if(SHD.on&&sunL.target){sunL.target.position.set(P.x,P.y,P.z);sunL.target.updateMatrixWorld&&sunL.target.updateMatrixWorld();}}}

/* ===== visuals: one root group, lazily built inside purgatory ===== */
function mwRoot(){if(MWV.root)return MWV.root;MWV.root=new THREE.Group();MWV.root.name='pg_p1';scene.add(MWV.root);return MWV.root;}
function mwHideAll(){if(MWV.root)MWV.root.visible=false;}
/* the Grid: battens, lamp rows every 12 blocks, pipes, rope strands; one merged geometry per 64 m z-strip, shared materials */
function mwGridBuild(){if(MWV.grid)return MWV.grid;const R=mwRoot(),G={strips:[],frame:mwMat(0x1c1a21),lamp:mwMat(0xffd36a)};
  for(let zs=-320;zs<288;zs+=64){const FP=[],FI=[],LP=[],LI=[];
    for(let z=zs+6;z<zs+64;z+=12){mwBoxPush(FP,FI,-96,66,z-0.2,96,66.4,z+0.2);
      for(let x=-92;x<=92;x+=8)mwBoxPush(LP,LI,x-0.4,65.2,z-0.4,x+0.4,65.9,z+0.4);}
    for(const x of [-64,-32,0,32,64])mwBoxPush(FP,FI,x-0.15,69,zs,x+0.15,69.3,zs+64);
    for(let k=0;k<7;k++){const x=-90+Math.floor(h2(zs,k,0x3a2f)*180),z=zs+Math.floor(h2(k,zs,0x3a2e)*64),y0=63+Math.floor(h2(zs+k,7,0x3a2d)*3);
      mwBoxPush(FP,FI,x-0.05,y0,z-0.05,x+0.05,79,z+0.05);if(k%3===0)mwBoxPush(FP,FI,x-0.3,y0-0.6,z-0.3,x+0.3,y0,z+0.3);}
    const fm=new THREE.Mesh(mwGeo(FP,FI),G.frame),lm=new THREE.Mesh(mwGeo(LP,LI),G.lamp);
    const g=new THREE.Group();g.add(fm);g.add(lm);g.userData.zc=zs+32;R.add(g);G.strips.push(g);}
  return MWV.grid=G;}
/* fog-free beacons (bible 3.14), y 71-78 above every curtain top */
function mwBeaconBuild(){if(MWV.beac)return MWV.beac;const R=mwRoot(),Bc={};
  const ST=MPC.STAR;Bc.stair=new THREE.Group();Bc.bulbs=[];
  for(let i=0;i<8;i++){const m=mwMat(0xffe7a0,{add:true,fog:false,op:1});const b=mwBox(1.4,0.8,1.4,m);b.position.set(ST[0]+0.5,71+i,ST[2]+0.5);Bc.stair.add(b);Bc.bulbs.push(m);
    const gl=mwSprite(0xffd890,5.5,0.55);gl.position.copy(b.position);Bc.stair.add(gl);(Bc.glows||(Bc.glows=[])).push(gl);}
  {const m=mwMat(0xffd36a,{add:true,fog:false,op:0.25});const s=mwBox(0.25,9,0.25,m);s.position.set(ST[0]+0.5,74.5,ST[2]+0.5);Bc.stair.add(s);}
  R.add(Bc.stair);
  const K=MPC.ARENA.bigfrog;Bc.moon=new THREE.Group();
  Bc.moonMat=mwMat(0xfff4c8,{fog:false,op:0.35,nodw:true,map:mwCanvas(64,64,(g)=>{g.clearRect(0,0,64,64);g.fillStyle='#f4ecd0';
    g.beginPath&&g.beginPath();g.arc&&g.arc(32,32,28,0,6.283);g.fill&&g.fill();g.fillStyle='rgba(0,0,0,0)';g.globalCompositeOperation='destination-out';
    g.beginPath&&g.beginPath();g.arc&&g.arc(44,26,24,0,6.283);g.fill&&g.fill();g.globalCompositeOperation='source-over';
    g.strokeStyle='#bdb08a';g.lineWidth=1;g.beginPath&&g.beginPath();g.moveTo&&g.moveTo(12,40);g.lineTo&&g.lineTo(30,50);g.stroke&&g.stroke();})});
  const disc=new THREE.Mesh(new THREE.PlaneGeometry(7,7),Bc.moonMat);Bc.moon.add(disc);Bc.moonDisc=disc;
  const wire=mwBox(0.06,4,0.06,mwMat(0x8a8a8a,{fog:false,op:0.6}));wire.position.set(0,5.4,0);Bc.moon.add(wire);
  Bc.moon.position.set(K.cx+0.5,74,K.cz+0.5);R.add(Bc.moon);
  Bc.smoke=new THREE.Group();Bc.puffs=[];for(let i=0;i<9;i++){const s=mwSprite(0x9a9086,5,0.45);s.material.blending=1;s.userData.ph=i/9;Bc.smoke.add(s);Bc.puffs.push(s);}
  Bc.smoke.position.set(0.5,64,-162.5);R.add(Bc.smoke);
  Bc.band={};for(const [k,z,col] of [['band2',MPC.ARCH_Z[1]-1,0xff7a22],['band3',MPC.ARCH_Z[2]-1,0x5cff6a]]){
    const m=mwMat(col,{add:true,fog:false,op:0.6});const p=new THREE.Mesh(new THREE.PlaneGeometry(192,6),m);p.position.set(0,69,z-0.6);R.add(p);Bc.band[k]={mesh:p,mat:m};}
  Bc.exitMat=mwMat(0xffffff,{fog:false,op:1,nodw:true,map:mwCanvas(64,32,(g)=>{g.fillStyle='#1a0303';g.fillRect(0,0,64,32);g.fillStyle='#ff2a1a';
    g.font='bold 22px monospace';if(g.fillText)g.fillText('EXIT',6,24);else g.fillRect(8,8,48,16);})});
  Bc.exit=new THREE.Mesh(new THREE.PlaneGeometry(6,3),Bc.exitMat);Bc.exit.position.set(-0.5,64.5,MPC.EXIT.z+1.02);R.add(Bc.exit);
  Bc.gaps=[];for(let i=0;i<6;i++){const m=mwMat(0xffffff,{add:true,fog:false,op:0.35});const c=mwBox(1.6,44,1.6,m);c.visible=false;R.add(c);Bc.gaps.push(c);}
  return MWV.beac=Bc;}
function mwBeacon(name,on){if(on===undefined||on===null){delete MWR.bfx[name];return;}MWR.bfx[name]=on;}
function mwBeaconState(name){if(MWR.bfx[name]!==undefined)return MWR.bfx[name];
  switch(name){case 'stair':return true;case 'moon':return MP.open.a3?'bright':'dim';
    case 'smoke':return !!(MP.dead.bomber&&!MP.open.a2);case 'band2':return !!(MP.dead.bomber&&!MP.open.a2&&!MWR.opening.a2);
    case 'band3':return !!(MP.dead.bigpig&&!MP.open.a3&&!MWR.opening.a3);case 'exit':return !!MP.strike;
    case 'gaps':return MP.strike?[[0,MPC.ARCH_Z[2]],[0,MPC.ARCH_Z[1]],[0,MPC.ARCH_Z[0]],[0,MPC.PROSC_Z]]:false;}
  return false;}
function mwGridFx(kind,dur){MWR.fx={k:kind,t:0,dur:kind==='dark'?(dur||4):(kind==='flash3'?1.8:(kind==='flicker'?1.2:(dur||1.2)))};}
function mwWorkLights(on){MWR.work=!!on;}
/* the Followspot and the three drifting Palace spots: additive cones from the Grid + ground discs */
function mwSpotMesh(col,op){const g=new THREE.Group(),cm=mwMat(col,{add:true,fog:false,op:op,side:THREE.FrontSide}),   /* FrontSide: a camera inside the cone sees nothing */cone=new THREE.Mesh(new THREE.ConeGeometry(1,1,20,1,true),cm);
  const dm=mwMat(col,{add:true,fog:false,op:Math.min(1,op*3.2),map:mwSoftDisc()}),disc=new THREE.Mesh(new THREE.PlaneGeometry(1,1),dm);disc.rotation.x=-Math.PI/2;
  g.add(cone);g.add(disc);g.userData={cone,disc,cm,dm};mwRoot().add(g);return g;}
function mwPlaceSpot(g,x,gy,z,r){const top=72,h=Math.max(2,top-gy),U=g.userData;U.cone.position.set(x,gy+h/2,z);U.cone.scale.set(r,h,r);
  U.disc.position.set(x,gy+0.06,z);U.disc.scale.set(r*2,r*2,1);}
const MW_PAL=[[0.031,0.7,0.023,1.9],[0.024,2.6,0.029,0.4],[0.037,4.1,0.019,3.3]];
function mwPalaceSpots(){const t=MP.clock||0,o=[];
  for(const q of MW_PAL){const x=Math.round(43+25*Math.sin(t*q[0]+q[1])),z=Math.round(97+44*Math.sin(t*q[2]+q[3]));o.push([x,mpSurf(x,z)+1,z]);}
  return o;}

/* ===== arches (bible 3.14): open as Dan comes within 60 m with the headliner dead; burn (Arch 2) / slide (Arch 3) for 4 s ===== */
function mwArchChunks(i){const z0=MW_ARCH[i][0],z1=MW_ARCH[i][1],o=[];
  for(let cz=Math.floor(z0/CH);cz<=Math.floor(z1/CH);cz++)for(let cx=Math.floor(-112/CH);cx<=Math.floor(111/CH);cx++)o.push([cx,cz]);return o;}
function mwRegen(cx,cz){const ch=chunks.get(ckey(cx,cz));if(!ch)return false;const nb=genChunk(cx,cz);
  for(const [lk,id] of ch.edits){const p=lk.split(',');nb[bidx(+p[0],+p[1],+p[2])]=id;}
  ch.bl.set(nb);ch.dirty=true;markDirty(cx-1,cz);markDirty(cx+1,cz);markDirty(cx,cz-1);markDirty(cx,cz+1);return true;}
function mwRegenCells(cells){const seen=new Set();let n=0;for(const c of cells){const cx=Math.floor(c[0]/CH),cz=Math.floor(c[2]/CH),k=cx+','+cz;
    if(seen.has(k))continue;seen.add(k);if(mwRegen(cx,cz))n++;}return n;}
function mwDelEdits(cells){let n=0;for(const c of cells){const cx=Math.floor(c[0]/CH),cz=Math.floor(c[2]/CH),E=chunkEdits.get(ckey(cx,cz));
    if(E&&E.delete((c[0]-cx*CH)+','+c[1]+','+(c[2]-cz*CH)))n++;torches.delete(bkey(c[0],c[1],c[2]));}return n;}
function mwOpenArch(n){const k=n===2||n==='a2'?'a2':(n===3||n==='a3'?'a3':(n==='exit'?'exit':null));if(!k)return false;
  if(k==='exit'){mwExitSync(true);return true;}
  MP.open[k]=1;MWR.opening[k]=0;for(const c of mwArchChunks(k==='a2'?1:2))mwRegen(c[0],c[1]);mwBoothUnlock(k==='a2'?1:2);return true;}
function mwArchState(){return {a2:MP.open.a2,a3:MP.open.a3,anim:MWR.anim?{k:MWR.anim.k,t:+MWR.anim.t.toFixed(2)}:null,opening:{...MWR.opening},
  exit:!!MP.strike};}
function mwArchTick(){if(!P||DIM!=='puppet')return;
  for(const [i,k,dead] of [[1,'a2','bomber'],[2,'a3','bigpig']]){const A=MPC.ARCH_Z[i],open=MP.open[k]||MWR.opening[k];
    const probe=[0,deckY(A)+6,A];
    if(chunkAt(probe[0],probe[2])){const id=getBlock(probe[0],probe[1],probe[2]);
      if(open&&id===B.PG_TRAVELER)for(const c of mwArchChunks(i))mwRegen(c[0],c[1]);
      else if(!open&&id!==B.PG_TRAVELER)for(const c of mwArchChunks(i))mwRegen(c[0],c[1]);}
    if(MP.open[k])mwBoothUnlock(i);
    if(!MP.open[k]&&!MWR.anim&&MP.dead[dead]&&!P.dead&&Math.abs(P.z-(A-0.5))<=60)mwArchStart(i,k);}
  mwExitSync(false);}
function mwExitSync(force){const E=MPC.EXIT;if(!chunkAt(0,E.z))return;const id=getBlock(0,E.y0+2,E.z),want=!!MP.strike||force;
  if(want&&id===B.PG_TRAVELER||!want&&id!==B.PG_TRAVELER)for(let cx=Math.floor(E.x0/CH);cx<=Math.floor(E.x1/CH);cx++)mwRegen(cx,Math.floor(E.z/CH));}
function mwArchStart(i,k){MWR.opening[k]=1;MWR.anim={i,k,t:0,mesh:null,last:-1};
  for(const c of mwArchChunks(i))mwRegen(c[0],c[1]);
  const A=MPC.ARCH_Z[i];mwS(k==='a2'?'pg_fizz':'pg_swish',P.x,P.y,Math.max(P.z-20,Math.min(P.z+20,A)));}
function mwArchFinish(){const a=MWR.anim;if(!a)return;MP.open[a.k]=1;MWR.opening[a.k]=0;mwBoothUnlock(a.i);
  if(a.mesh){mwRoot().remove(a.mesh);a.mesh.traverse&&a.mesh.traverse(o=>{if(o.geometry&&o.geometry.dispose)o.geometry.dispose();if(o.material){if(o.material.map&&o.material.map.dispose)o.material.map.dispose();o.material.dispose&&o.material.dispose();}});}
  MWR.anim=null;}
function mwTravelerArt(g,w,h){g.fillStyle='#4a1030';g.fillRect(0,0,w,h);
  for(let x=0;x<w;x+=6){g.fillStyle=(x/6)%2?'#5a1640':'#3a0a24';g.fillRect(x,0,3,h);}
  g.fillStyle='rgba(201,164,58,0.35)';g.fillRect(w*0.4,h*0.42,w*0.2,h*0.12);g.fillStyle='#c9a43a';g.fillRect(0,h-3,w,3);}
function mwArchVisual(dt){const a=MWR.anim;if(!a)return;const A=MPC.ARCH_Z[a.i],dy=deckY(A),H=70-dy,yc=(dy+1+70)/2;
  if(!a.mesh){const g=new THREE.Group();
    if(a.k==='a2'){const cv=document.createElement('canvas');cv.width=192;cv.height=48;a.cv=cv;a.tex=new THREE.CanvasTexture(cv);a.tex.magFilter=THREE.NearestFilter;
      const m=mwMat(0xffffff,{map:a.tex,op:1,nodw:false});m.alphaTest=0.5;const p=new THREE.Mesh(new THREE.PlaneGeometry(192,H),m);p.position.set(0,yc,A-1-0.02);g.add(p);}
    else{const tex=mwCanvas(96,48,mwTravelerArt);for(const sd of [-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(96,H),mwMat(0xffffff,{map:tex}));
        p.position.set(sd*48,yc,A-1-0.02);p.userData.sd=sd;g.add(p);}}
    a.mesh=g;mwRoot().add(g);}
  const u=clamp(a.t/4,0,1);
  if(a.k==='a2'){const step=Math.floor(a.t*12);if(step!==a.last&&a.cv){a.last=step;const g=a.cv.getContext('2d');mwTravelerArt(g,192,48);
      if(g.globalCompositeOperation!==undefined){g.globalCompositeOperation='destination-out';const s=0.15+u*u*7.5,cx=96,by=48;
        g.beginPath&&g.beginPath();g.ellipse?g.ellipse(cx,by-26*s*0.35,5*s,6*s,0,0,6.283):g.arc&&g.arc(cx,by-12*s,6*s,0,6.283);g.fill&&g.fill();
        g.beginPath&&g.beginPath();g.ellipse?g.ellipse(cx,by-12*s*0.35,9*s,12*s,0,0,6.283):g.arc&&g.arc(cx,by-4*s,10*s,0,6.283);g.fill&&g.fill();
        g.fillRect&&g.fillRect(cx-14*s,by-16*s*0.35,28*s,4*s);g.globalCompositeOperation='source-over';}
      a.tex.needsUpdate=true;
      if(P&&Math.abs(P.z-A)<70)for(let q=0;q<4;q++){const ang=Math.random()*6.283,r=(0.15+u*u*7.5)*10*(192/192);
        burstParticles(Math.cos(ang)*r*1,dy+1+Math.abs(Math.sin(ang))*r*0.7*(H/48)*2,A-1.2,B.LAVA,3,0.8);}}}
  else for(const p of a.mesh.children){const e=u*u*(3-2*u);p.position.x=p.userData.sd*(48+e*98);}}

/* ===== Quick-Change Booths (bible 3.4): unlock, lamps in MP_LIGHTS, flares on unlock and as Strike checkpoints pass ===== */
function mwBoothUnlock(i){const k='b'+(i+1);if(MP.spawns[k])return false;MP.spawns[k]=1;mwBoothFlare(i);return true;}
function mwBoothFlare(i){MWR.flare[i]=1.2;const b=mwBooths()[i];if(b)mwS('pg_lid',b.can[0],b.can[1],b.can[2]);}
/* fixed OG light sources other than player torches that P1 generates: the Ghost Light, booth lamps, band-room lamps (generated
   Burners and lit Hot Plates are P2's). A lamp someone breaks leaves MP_LIGHTS on the next pass. */
function mwLightsTick(){const L=[];const G=mwSpots('ghost')[0];L.push(G);for(const b of mwBooths())L.push(b.lamp);
  for(const R of MW_BAND)for(const [x,z] of [[R.x0,R.z0],[R.x1,R.z0],[R.x0,R.z1],[R.x1,R.z1]])L.push([x,17,z]);
  for(const p of L){if(!chunkAt(p[0],p[2]))continue;mpLight(p[0],p[1],p[2],getBlock(p[0],p[1],p[2])===B.PG_LAMP);}}

/* ===== trees go limp (bible 3.4): the Forearm breaks -> the whole felt head collapses at once, one drop entity per item type ===== */
function mwTreeById(id){for(const R of mwTreeRows())for(const T of R.L)if(T.id===id)return T;return null;}
function mwLimp(T,who){if(!T||MP.trees[T.id]!=null)return null;const cells=mwTreeCells(T),agg=new Map();let n=0;
  for(const c of cells){const id=getBlock(c[0],c[1],c[2]);if(id!==c[3])continue;n++;
    const d=DEFS[id],dr=d&&d.pdrop?d.pdrop(null,who):blockDrop(id);if(dr&&dr.count>0)agg.set(dr.id,(agg.get(dr.id)||0)+dr.count);}
  MP.trees[T.id]=MP.clock;mwDelEdits(cells);mwRegenCells(cells);
  for(const [id,count] of agg)mpDrop(T.x+0.5,T.g+1.3,T.z+0.5,{id,count},who==='Dan'||agByName(who)?who:null,(Math.random()-0.5)*1.5,2.5,(Math.random()-0.5)*1.5);
  mwCollapseAnim(cells.filter(c=>c[3]!==B.PG_FOREARM),T.x,T.g,T.z,'limp');
  mwS('pg_whump',T.x,T.g+4,T.z);burstParticles(T.x+0.5,T.g+T.s+2,T.z+0.5,B.PG_FLEECE,22,1.6);
  return {blocks:n,drops:agg.size};}
function mwRegrowTick(){for(const id of Object.keys(MP.trees)){const t=MP.trees[id];if(typeof t!=='number'||MP.clock-t<300)continue;
    const T=mwTreeById(id);if(!T){delete MP.trees[id];continue;}
    if(mwPlayers().some(p=>Math.hypot(p.e.x-(T.x+0.5),p.e.z-(T.z+0.5))<16))continue;
    delete MP.trees[id];const cells=mwTreeCells(T);mwDelEdits(cells);mwRegenCells(cells);}}

/* ===== flats topple (bible 3.4): mesh-only, 0.6 s, 6 damage + a 1 s pin under the fall rectangle, then Cardboard piles ===== */
function mwFlatBraces(f){let n=0;for(const b of f.br)if(getBlock(b[0],b[1],b[2])===B.PG_BRACE)n++;return n;}
function mwToppleFlat(f,who,o){if(!f||MP.flats[f.id])return false;o=o||{};const cells=mwFlatCells(f);
  MP.flats[f.id]=1;const live=cells.filter(c=>getBlock(c[0],c[1],c[2])===c[3]);
  mwDelEdits(cells);mwRegenCells(cells);
  MWR.top.push({f,t:0,who:who||null,dir:o.dir||-1,n:live.length});
  mwCollapseAnim(live,f.x0,f.gc,f.fz+(o.dir>0?2:0),'flat',f,o.dir||-1);
  mwS('pg_creak',(f.x0+f.x1)/2,f.gc+3,f.fz);return true;}
function mwToppleNear(x,z,r,o){let n=0;for(const f of mwAllFlats()){if(MP.flats[f.id])continue;
    if(Math.hypot((f.x0+f.x1)/2-x,f.fz-z)<=r&&mwToppleFlat(f,o&&o.who,o))n++;}return n;}
/* P4's Strike: every standing flat within r of (x,z) folds over (mesh-only; o.dir -1 falls toward -z, +1 toward +z; o.who) */
function mwTopple(x,z,r,o){return mwToppleNear(x,z,r,o||{dir:-1});}
function mwToppleTick(dt){for(let i=MWR.top.length-1;i>=0;i--){const q=MWR.top[i];q.t+=dt;if(q.t<0.6)continue;MWR.top.splice(i,1);
    const f=q.f,zA=q.dir<0?f.fz-f.ht:f.fz+2,zB=q.dir<0?f.fz:f.fz+2+f.ht;
    for(const p of mwPlayers()){const e=p.e;if(e.x>=f.x0&&e.x<=f.x1+1&&e.z>=zA&&e.z<=zB+1){purgHit(e,6,'a falling flat','flat',{force:1});MWR.pins.push({e,t:1});}}
    for(const m of entities){if(m.dead||m.t!=='mob'||m.bot)continue;const T=MOBT[m.mt];if(T&&(T.prop||T.npc))continue;
      if(m.x>=f.x0&&m.x<=f.x1+1&&m.z>=zA&&m.z<=zB+1){purgHit(m,6,q.who||'a falling flat','flat',{force:1});MWR.pins.push({e:m,t:1});}}
    const total=Math.max(4,Math.round(f.w*f.ht/6)),piles=Math.max(1,Math.ceil(total/16));
    for(let k=0;k<piles;k++){const x=f.x0+0.5+(f.w-1)*(piles>1?k/(piles-1):0.5),cnt=Math.min(16,total-k*16);if(cnt<=0)break;
      mpDrop(x,f.gc+1.2,(zA+zB)/2,{id:IT.PG_CARD,count:cnt},q.who,0,1.5,0);}
    mwS('pg_whump',(f.x0+f.x1)/2,f.gc+1,(zA+zB)/2);burstParticles((f.x0+f.x1)/2+0.5,f.gc+1.5,(zA+zB)/2,B.PG_BACKING,26,2.2);
    if(P&&Math.hypot(P.x-(f.x0+f.x1)/2,P.z-(zA+zB)/2)<24)mpShake(0.35,0.4);}
  for(let i=MWR.pins.length-1;i>=0;i--){const p=MWR.pins[i];p.t-=dt;if(p.t<=0||p.e.dead){MWR.pins.splice(i,1);continue;}
    p.e.vx=0;p.e.vz=0;if(p.e.vy>0)p.e.vy=0;}}
/* a collapse mesh built from the real atlas (a tiny mesher over the cells): the tree head slumps, a flat falls forward */
function mwCellMesh(cells,ox,oy,oz){if(typeof FACES==='undefined'||!matOp)return null;const set=new Map();for(const c of cells)set.set(c[0]+','+c[1]+','+c[2],c[3]);
  const bf={op:newBuf(),cut:newBuf()};
  for(const c of cells){const d=DEFS[c[3]];if(!d||!d._t)continue;const bk=d.bucket==='cut'?'cut':'op';
    for(let f=0;f<6;f++){const F=FACES[f],nid=set.get((c[0]+F.n[0])+','+(c[1]+F.n[1])+','+(c[2]+F.n[2]));if(nid&&DEFS[nid].opq&&d.opq)continue;
      const ti=f===0?d._t.top:(f===1?d._t.bot:d._t.side),s=F.sh;addQuad(bf[bk],c[0]-ox,c[1]-oy,c[2]-oz,F,tileUV(ti),[s,s,s,s],0);}}
  const g=new THREE.Group();
  for(const k of ['op','cut']){const b=bf[k];if(!b.vc)continue;const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.u,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));geo.setIndex(b.ix);
    g.add(new THREE.Mesh(geo,k==='op'?matOp:matCut));}
  return g;}
function mwCollapseAnim(cells,x,y,z,kind,f,dir){if(DIM!=='puppet'||!cells.length||!scene)return;let g=null;try{g=mwCellMesh(cells,x,y,z);}catch(e){mpFail('collapse',e);}
  if(!g)return;const piv=new THREE.Group();piv.position.set(x+(kind==='flat'?0:0.5),y+(kind==='flat'?1:0),z+(kind==='flat'?(dir>0?0:0):0.5));
  if(kind==='flat'){g.position.set(0,-1,0);}else g.position.set(-0.5,0,-0.5);
  piv.add(g);mwRoot().add(piv);MWR.anims.push({piv,g,kind,t:0,dur:kind==='flat'?0.6:0.5,dir:dir||-1});}
function mwAnimTick(dt){for(let i=MWR.anims.length-1;i>=0;i--){const a=MWR.anims[i];a.t+=dt;const u=clamp(a.t/a.dur,0,1);
    if(a.kind==='flat')a.piv.rotation.x=a.dir<0?-(u*u)*Math.PI/2:(u*u)*Math.PI/2;
    else{a.piv.scale.set(1+0.25*u,Math.max(0.08,1-u*u*0.92),1+0.25*u);a.piv.rotation.x=-0.25*u;}
    if(a.t>=a.dur+(a.kind==='flat'?0.05:0.25)){mwRoot().remove(a.piv);a.g.traverse(o=>{if(o.geometry&&o.geometry.dispose)o.geometry.dispose();});MWR.anims.splice(i,1);}}}

/* ===== Taut Felt Sheet (bible 3.9): sags under Dan only after 1.5 s, tears 2 s later, re-tensions 60 s later on MP.clock ===== */
function mwTearKey(x,y,z){return bkey(x,y,z);}
function mwTearRec(x,yTop,z){const k=mwTearKey(x,yTop,z);const e=MP.tears.find(q=>q[0]===k);if(e)e[1]=MP.clock;else MP.tears.push([k,MP.clock]);}
function mwSagged(x,y,z){const k=mwTearKey(x,y+1,z);return MP.tears.some(q=>q[0]===k);}
function mwSheetTick(dt){const S=MWR.sag;if(!P||P.dead||P.mode==='c'||!P.onGround){S.k=null;S.t=0;return;}
  const bx=Math.floor(P.x),bz=Math.floor(P.z),by=Math.floor(P.y-0.02);
  if(getBlock(bx,by,bz)!==B.PG_SHEET){S.k=null;S.t=0;return;}
  const k=bx+','+by+','+bz;if(S.k!==k){S.k=k;S.t=0;}S.t+=dt;
  const sag=mwSagged(bx,by,bz);
  if(!sag&&S.t>=1.5){if(getBlock(bx,by-1,bz)===B.AIR){setBlock(bx,by,bz,B.AIR);setBlock(bx,by-1,bz,B.PG_SHEET);mwTearRec(bx,by,bz);mwS('pg_creak',bx+0.5,by,bz+0.5);}
    S.k=null;S.t=0;}
  else if(sag&&S.t>=2){setBlock(bx,by,bz,B.AIR);mwTearRec(bx,by+1,bz);mwS('pg_rip',bx+0.5,by,bz+0.5);
    burstParticles(bx+0.5,by+0.5,bz+0.5,B.PG_SHEET,10,1);S.k=null;S.t=0;}}
function mwTearSheet(x,y,z,who){x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);if(getBlock(x,y,z)!==B.PG_SHEET)return false;
  const top=mwSagged(x,y,z)?y+1:y;setBlock(x,y,z,B.AIR);mwTearRec(x,top,z);mwS('pg_rip',x+0.5,y,z+0.5);burstParticles(x+0.5,y+0.5,z+0.5,B.PG_SHEET,8,1);return true;}
function mwRetensionTick(){if(!MP.tears.length)return;const L=mwPlayers(),gen=new Map();
  for(let i=MP.tears.length-1;i>=0;i--){const q=MP.tears[i];if(MP.clock-q[1]<60)continue;const p=dimP(q[0]);if(!p){continue;}
    const x=+p[0],y=+p[1],z=+p[2];
    if(L.some(o=>Math.abs(o.e.x-(x+0.5))<0.9&&Math.abs(o.e.z-(z+0.5))<0.9&&o.e.y>y-6&&o.e.y<y+2.2))continue;
    const cx=Math.floor(x/CH),cz=Math.floor(z/CH),ch=chunks.get(ckey(cx,cz));
    mwDelEdits([[x,y,z],[x,y-1,z]]);
    if(ch){const gk=cx+','+cz;let g=gen.get(gk);if(!g){g=genChunk(cx,cz);gen.set(gk,g);}const lx=x-cx*CH,lz=z-cz*CH;
      for(const yy of [y,y-1]){const i2=bidx(lx,yy,lz),ek=lx+','+yy+','+lz;ch.bl[i2]=ch.edits.has(ek)?ch.edits.get(ek):g[i2];}
      ch.dirty=true;if(lx===0)markDirty(cx-1,cz);if(lx===CH-1)markDirty(cx+1,cz);if(lz===0)markDirty(cx,cz-1);if(lz===CH-1)markDirty(cx,cz+1);}
    MP.tears.splice(i,1);}}

/* ===== the Puppeteer flinches (bible 3.15) ===== */
function mwFlinch(x,y,z,who){MPF.flinch=0.6;mwS('pg_flinch');
  if(P&&DIM==='puppet')mpShake(0.55,0.6);
  for(const e of entities)if(!e.dead&&e.t==='drop'&&Math.hypot(e.x-x,e.z-z)<64){e.vy=Math.max(e.vy||0,3.2);e.onGround=false;}
  for(const f of mwAllFlats()){if(MP.flats[f.id])continue;const d=Math.hypot((f.x0+f.x1)/2-x,f.fz-z);if(d>40)continue;
    if(mwFlatBraces(f)<2)mwToppleFlat(f,who||null);else for(let i=0;i<4;i++)burstParticles(f.x0+Math.random()*f.w,f.top+0.5,f.fz+0.5,B.PG_BACKING,3,0.6);}
  const tgt=who==='Dan'||!who?P:((agByName(who)||{}).e||P);
  if(typeof pmSpawnHand==='function'&&tgt&&Math.hypot(tgt.x-x,tgt.z-z)<=24)for(let k=0;k<2;k++){const a=Math.random()*6.283,r=4+Math.random()*5;
    try{pmSpawnHand(x+Math.cos(a)*r,y,z+Math.sin(a)*r,tgt);}catch(err){mpFail('pmSpawnHand',err);}}
  return true;}
function mwSkinTick(dt){const S=MWR.skin;S.cd=Math.max(0,S.cd-dt);
  if(MWR.twitch){MWR.twitch.t+=dt;if(MWR.twitch.t>0.5){if(MWR.twitch.m){mwRoot().remove(MWR.twitch.m);}MWR.twitch=null;}}
  /* The Puppeteer is unbreakable, so doMine never starts a MINE on it: read the swing itself (attack held, ray on the skin) */
  if(!MB.l||P.dead||modalOpen()){S.k=null;return;}
  const e=eyePos(),d=lookDir(),hit=raycastB(e[0],e[1],e[2],d[0],d[1],d[2],REACH);
  if(!hit||hit.id!==B.PG_SKIN){S.k=null;return;}
  const k=hit.x+','+hit.y+','+hit.z;if(S.k===k||S.cd>0)return;S.k=k;S.cd=1.2;
  burstParticles(hit.x+0.5,hit.y+1.1,hit.z+0.5,B.PG_FOAM,10,0.7);
  if(!MWR.twitch){const m=mwBox(1.04,1.04,1.04,mwMat(0xffc9b0,{op:0.55,nodw:true}));m.position.set(hit.x+0.5,hit.y+0.5,hit.z+0.5);mwRoot().add(m);MWR.twitch={m,t:0};}
  if(Math.random()<0.3&&typeof pmSpawnHand==='function'){const a=Math.random()*6.283,r=3+Math.random()*5;
    try{pmSpawnHand(hit.x+Math.cos(a)*r,hit.y+1,hit.z+Math.sin(a)*r,P);}catch(err){mpFail('pmSpawnHand',err);}}}

/* ===== Tesla Coils (bible 3.8): every 3 s each coil within 32 m of a player arcs 3 to the nearest creature within 5, after a 0.4 s flicker ===== */
function mwTeslaTick(){const T=MWR.tesla;if(MP.clock-T.lt>=1){T.lt=MP.clock;const L=mwPlayers();
    T.list=mwSpots('tesla').filter(c=>L.some(p=>Math.hypot(p.e.x-c[0],p.e.z-c[2])<32));}
  const sec=Math.floor(MP.clock);if(sec!==T.sec){T.sec=sec;T.n=0;}
  const seen=new Set();
  for(const c of T.list){const k=c[0]+','+c[2];seen.add(k);const ph=mwH(c[0],c[2],0,31)*3,w=Math.floor((MP.clock+ph)/3),fr=(MP.clock+ph)%3;
    if(T.last[k]===undefined){T.last[k]=fr>=2.6?w+1:w;continue;}
    MWR.flicker[k]=fr>=2.6&&T.last[k]<=w?1:0;
    if(T.last[k]>=w)continue;T.last[k]=w;
    if(getBlock(c[0],c[1],c[2])!==B.PG_TESLA)continue;
    const t=mwTeslaTarget(c);if(!t||T.n>=6)continue;T.n++;
    purgHit(t.e,3,'Tesla Coil','tesla');T.arcs.push({a:[c[0]+0.5,c[1]+1,c[2]+0.5],b:[t.e.x,t.e.y+(t.e.h||1.8)*0.5,t.e.z],t:0.16,who:t.who});
    mwS('pg_spark',c[0]+0.5,c[1]+1,c[2]+0.5);}
  for(const k in T.last)if(!seen.has(k)){delete T.last[k];delete MWR.flicker[k];}}
function mwTeslaTarget(c){const ox=c[0]+0.5,oy=c[1]+1,oz=c[2]+0.5;let best=null,bd=5;
  const tryE=(e,who,h)=>{const d=Math.hypot(e.x-ox,e.y+h*0.5-oy,e.z-oz);if(d<=bd){bd=d;best={e,who,d};}};
  if(P&&!P.dead&&P.mode!=='c'&&DIM==='puppet')tryE(P,'Dan',1.8);
  for(const m of entities){if(m.dead||m.t!=='mob')continue;if(m.bot){if(m.A&&m.A.dim===DIM&&!m.A.dead)tryE(m,m.A.name,1.8);continue;}
    const T=MOBT[m.mt];if(!T||T.prop||T.npc)continue;tryE(m,m.mt,m.h||1);}
  return best;}

/* ===== BOO (bible 3.10), round things roll downstage, band-room tells, the main tick ===== */
function mwBoo(x,z,why){if(MP.clock-MWR.boo<8)return false;MWR.boo=MP.clock;mwS('pg_boo',x,40,z);
  if(typeof pmBooBarrage==='function')try{pmBooBarrage(x,z);}catch(err){mpFail('pmBooBarrage',err);}return true;}
const MW_ROLL=[IT.PG_PLASTICEYE,IT.PG_GOOGLIES,IT.PG_MEATBALL];
function mwRollTick(dt){for(const e of entities){if(e.dead||e.t!=='drop'||!e.onGround||!e.st||e.age<0.3)continue;
    const d=DEFS[e.st.id];if(!(d&&d.pround)&&MW_ROLL.indexOf(e.st.id)<0)continue;   /* P2 flags them pround:1 */
    const og=e.onGround;moveBody(e,0,0,-0.4*dt,false);e.onGround=og;}}
/* Band Rooms (bible 3.11): the drumming is audio, so two lamps flicker on every hit; P3 (real) puffs the dust and owns the beat
   (pmBandState(i).beat); without it P1 keeps a 132 bpm beat itself so the room still reads with the sound off */
function mwBandTick(dt){const B_=MWR.band,p3=typeof pmBandState==='function';   /* the P3 stub does not declare pmBandState */
  if(p3){for(let i=0;i<3;i++){const k=MW_BAND[i].kit;if(Math.hypot(P.x-k[0],P.z-k[2])>56)continue;let s=null;try{s=pmBandState(i);}catch(err){mpFail('pmBandState',err);}
      if(s&&s.beat)MWR.band['h'+i]=0.18;}return;}
  B_.t+=dt;if(B_.t<0.454)return;B_.t-=0.454;B_.n++;
  for(let i=0;i<3;i++){const R=MW_BAND[i],k=R.kit;if(Math.hypot(P.x-k[0],P.z-k[2])>56)continue;
    const m=R.mouth;burstParticles(m[0]+0.5,m[1]+0.6,m[2]+0.5,B.PG_FOAM,4,0.9);
    if(B_.n%2===0)mwS('pg_drum',k[0]+0.5,k[1],k[2]+0.5);
    MWR.band['h'+i]=0.18;}}
function mwTick(dt){if(DIM!=='puppet'||!P)return;
  mwVisual(dt);
  mwCueTick(dt);
  if(MPF.flinch>0)MPF.flinch=Math.max(0,MPF.flinch-dt);

  MWR.ft+=dt;if(MWR.ft>=0.25){MWR.ft=0;mwFollowTick();}
  if(MWR.anim){MWR.anim.t+=dt;if(MWR.anim.t>=4)mwArchFinish();}
  MWR.at+=dt;if(MWR.at>=0.4){MWR.at=0;mwArchTick();}
  if(MP.clock-MWR.lt>=1){MWR.lt=MP.clock;mwLightsTick();}
  if(MP.clock-MWR.rt>=1){MWR.rt=MP.clock;mwRetensionTick();}
  if(MP.clock-MWR.gt>=2){MWR.gt=MP.clock;mwRegrowTick();}
  if(!MP.spawns.b1&&P.z>=MPC.ARCH_Z[0]+1&&!P.dead)mwBoothUnlock(0);
  {const cp=MP.strike?MP.strike.cp:undefined;if(cp!==MWR.cpSeen){if(MWR.cpSeen!==undefined&&cp!==undefined&&cp!==null){let bi=0,bd=1e9;
        for(const b of mwBooths()){const d=Math.hypot(b.x-P.x,b.z-P.z);if(d<bd){bd=d;bi=b.i;}}if(bd<80)mwBoothFlare(bi);}MWR.cpSeen=cp;}}
  if(!MP.strike&&!P.dead&&P.z<=-215&&P.z>=-298&&P.x>=-64&&P.x<=63)mwBoo(P.x,P.z,'climb');
  mwSheetTick(dt);mwToppleTick(dt);mwSkinTick(dt);mwTeslaTick();mwRollTick(dt);mwBandTick(dt);mwAnimTick(dt);
  for(const a of MWR.tesla.arcs)a.t-=dt;MWR.tesla.arcs=MWR.tesla.arcs.filter(a=>a.t>0);}
function mwOnBreak(x,y,z,id,who){
  if(id===B.PG_FOREARM){const T=mwTreeAt(x,y,z);if(T)mwLimp(T,who);}
  else if(id===B.PG_BRACE){const f=mwFlatAt(x,y,z);if(f&&!MP.flats[f.id]&&mwFlatBraces(f)===0)mwToppleFlat(f,who);}
  else if(id===B.PG_SHEET){mwTearRec(x,mwSagged(x,y,z)?y+1:y,z);}
  else if(id===B.PG_KNUCKLE){if(who==='Dan')MP.knuckles++;mwFlinch(x,y,z,who);}
  else if(id===B.PG_SEAT){mwBoo(x,z,'seat');}}
PREG.tick.push(mwTick);
PREG.onBreak.push(mwOnBreak);
PREG.onEnter.push(function mwOnEnter(){MWR=mwRulesFresh();MWR.entry=7;MWR.spot.x=MPC.MARK[0]+0.5;MWR.spot.z=MPC.MARK[2]+0.5;if(MWV.root)MWV.root.visible=true;});
PREG.onExit.push(function mwOnExit(){if(MWR.anim)mwArchFinish();for(const a of MWR.anims)mwRoot().remove(a.piv);MWR=mwRulesFresh();mwHideAll();});
PREG.onReset.push(function mwOnReset(){MCOLM.clear();MWW={seed:null};for(const a of MWR.anims)if(MWV.root)MWV.root.remove(a.piv);MWR=mwRulesFresh();mwHideAll();});
PREG.onLoad.push(function mwOnLoad(){MCOLM.clear();MWW={seed:null};MWR=mwRulesFresh();});

/* ===== the per-frame visual step (from mpSky in OG, from the tick otherwise; once per frame) ===== */
function mwVisual(dt){if(DIM!=='puppet'||!scene||!P)return;if(MWR.f===frameCount)return;MWR.f=frameCount;
  /* cosmetic timers run here (every frame, cutscenes included): Grid fx, booth flares, the entry spot, band-room lamp hits */
  if(MWR.fx){MWR.fx.t+=dt;if(MWR.fx.t>=MWR.fx.dur)MWR.fx=null;}
  for(let i=0;i<3;i++)if(MWR.flare[i]>0)MWR.flare[i]=Math.max(0,MWR.flare[i]-dt);
  if(MWR.entry>0)MWR.entry=Math.max(0,MWR.entry-dt);
  for(const k in MWR.band)if(k[0]==='h'&&MWR.band[k]>0)MWR.band[k]=Math.max(0,MWR.band[k]-dt);
  const R=mwRoot();R.visible=true;
  const G=mwGridBuild(),near=RD*CH+48;for(const s of G.strips)s.visible=Math.abs(s.userData.zc-P.z)<near;
  const key=mwSkyKey(),lc=MW_SKY[key].lamp,lm=mwLampMul();G.lamp.color.setRGB(Math.min(1,lc[0]*lm),Math.min(1,lc[1]*lm),Math.min(1,lc[2]*lm));
  const Bc=mwBeaconBuild(),t=MP.clock;
  Bc.stair.visible=!!mwBeaconState('stair');for(let i=0;i<8;i++){const w=0.35+0.65*Math.max(0,Math.sin(t*5-i*0.9));Bc.bulbs[i].color.setRGB(w,w*0.9,w*0.55);
    if(Bc.glows){const d=Math.hypot(P.x-0.5,P.z-131.5),s=Math.max(3,d*0.022)*(0.6+0.5*w);Bc.glows[i].scale.set(s,s,1);Bc.glows[i].material.opacity=0.25+0.45*w;}}   /* glows grow with distance: a landmark from the Mark */
  {const mo=mwBeaconState('moon');Bc.moon.visible=!!mo;Bc.moonMat.opacity=mo==='bright'?1:0.32;Bc.moon.rotation.y=Math.atan2(P.x-Bc.moon.position.x,P.z-Bc.moon.position.z);}
  {const on=!!mwBeaconState('smoke');Bc.smoke.visible=on;if(on)for(const s of Bc.puffs){const u=(s.userData.ph+t*0.08)%1;s.position.set(Math.sin(u*9+s.userData.ph*6)*1.4,u*14,Math.cos(u*7)*1.2);
      const sc=3+u*6;s.scale.set(sc,sc,1);s.material.opacity=0.5*(1-u);}}
  for(const k of ['band2','band3']){const b=Bc.band[k],on=!!mwBeaconState(k);b.mesh.visible=on;if(on)b.mat.opacity=0.35+0.3*Math.abs(Math.sin(t*7.3+(k==='band3'?1:0)))+0.1*Math.sin(t*23);}
  {const on=!!mwBeaconState('exit');Bc.exitMat.color.setRGB(on?1:0.22,on?1:0.18,on?1:0.18);Bc.exit.visible=true;}
  {const gp=mwBeaconState('gaps'),L=Array.isArray(gp)?gp:[];for(let i=0;i<Bc.gaps.length;i++){const c=Bc.gaps[i],q=L[i];c.visible=!!q;
      if(q){const x=Array.isArray(q)?q[0]:q.x,z=Array.isArray(q)?q[1]:q.z;c.position.set(x+0.5,deckY(z)+22,z+0.5);}}}
  /* the Followspot (BLACKOUT, and on the Mark for the first 7 s after the curtain) */
  if(!MWV.spot)MWV.spot=mwSpotMesh(0xfff8e8,0.16);
  {const S=MWR.spot,sp=MWV.spot,bo=mwCue().ph==='blackout';let tx=null,tz=null;
    if(MWR.entry>0){tx=P.x;tz=P.z;}else if(bo){const ft=mwFollowTarget();if(ft){tx=ft.x;tz=ft.z;}else{tx=P.x+Math.sin(t*0.7)*18;tz=P.z+Math.cos(t*0.53)*18;}}
    sp.visible=tx!==null;if(tx!==null){const k=1-Math.exp(-dt*7);S.x+=(tx-S.x)*k;S.z+=(tz-S.z)*k;
      const fx=Math.floor(S.x),fz=Math.floor(S.z),gy=MWR.entry>0?P.y-0.05:(chunkAt(fx,fz)?surfaceTop(fx,fz):mpSurf(fx,fz))+1;mwPlaceSpot(sp,S.x,gy,S.z,2.6);}}
  /* the Pork Palace drifting spots (within view only) */
  if(!MWV.pal)MWV.pal=[0,1,2].map(()=>mwSpotMesh(0xffd0e8,0.1));
  {const show=P.z>20&&P.z<175,L=show?mwPalaceSpots():null;for(let i=0;i<3;i++){const g=MWV.pal[i];g.visible=show;if(show)mwPlaceSpot(g,L[i][0]+0.5,L[i][1]-1+1,L[i][2]+0.5,3);}}
  /* Tesla flickers and arcs */
  if(!MWV.tes){MWV.tes={fl:[],arc:[],mat:mwMat(0xffffff,{add:true,op:0.85}),amat:mwMat(0xc8e8ff,{add:true,fog:false,op:0.95})};
    for(let i=0;i<10;i++){const m=mwBox(0.62,0.5,0.62,MWV.tes.mat);m.visible=false;R.add(m);MWV.tes.fl.push(m);}
    for(let i=0;i<18;i++){const m=mwBox(0.08,0.08,1,MWV.tes.amat);m.visible=false;R.add(m);MWV.tes.arc.push(m);}}
  {const V=MWV.tes;let n=0;for(const c of MWR.tesla.list){if(n>=V.fl.length)break;if(!MWR.flicker[c[0]+','+c[2]])continue;const m=V.fl[n++];m.visible=true;m.position.set(c[0]+0.5,c[1]+0.78,c[2]+0.5);}
    for(;n<V.fl.length;n++)V.fl[n].visible=false;
    let q=0;for(const a of MWR.tesla.arcs){let px=a.a[0],py=a.a[1],pz=a.a[2];for(let s=1;s<=3&&q<V.arc.length;s++){const u=s/3,j=s<3?0.45:0;
        const nx=a.a[0]+(a.b[0]-a.a[0])*u+(Math.random()-0.5)*j,ny=a.a[1]+(a.b[1]-a.a[1])*u+(Math.random()-0.5)*j,nz=a.a[2]+(a.b[2]-a.a[2])*u+(Math.random()-0.5)*j;
        const m=V.arc[q++],l=Math.hypot(nx-px,ny-py,nz-pz)||0.01;m.visible=true;m.position.set((px+nx)/2,(py+ny)/2,(pz+nz)/2);m.scale.set(1,1,l);
        m.lookAt&&m.lookAt(nx,ny,nz);px=nx;py=ny;pz=nz;}}
    for(;q<V.arc.length;q++)V.arc[q].visible=false;}
  mwArchVisual(dt);mwPropsVisual(dt);}
/* ===== props (bible 15.6 and 3.x): tape marks, booth rails, the Last Guest's stool and dead monitor, pit band gear, the cyclorama
   moon, glows. Built once per seed, shown within 90 m. ===== */
function mwPropsBuild(){if(MWV.props&&MWV.seed===SEED)return MWV.props;
  if(MWV.props){mwRoot().remove(MWV.props.g);}MWV.seed=SEED;const g=new THREE.Group(),L=[];
  const tape=mwMat(0xf2d21a,{lit:true}),add=(o,x,y,z,r)=>{o.position.set(x,y,z);o.userData.r=r||90;g.add(o);L.push(o);return o;};
  const X=(x,y,z,s)=>{const q=new THREE.Group();const a=mwBox(s,0.03,0.32,tape),b=mwBox(s,0.03,0.32,tape);a.rotation.y=Math.PI/4;b.rotation.y=-Math.PI/4;q.add(a);q.add(b);return add(q,x,y,z,70);};
  X(MPC.MARK[0]+0.5,MPC.MARK_PAD.y+1.02,MPC.MARK[2]+0.5,4.2);
  for(const n of ['bomber','bigpig','bigfrog']){const u=mpUmarkPos(n);X(u[0]+0.5,mpSurf(u[0],u[2])+1.02,u[2]+0.5,2.6);}
  for(const b of mwBooths()){X(b.x+0.5,b.y+1.02,b.z+0.5,1.6);const rail=new THREE.Group();
    const rod=mwBox(2.6,0.06,0.06,mwMat(0x9a9aa4,{lit:true}));rod.position.set(0,0,0);rail.add(rod);
    [0x4ca82b,0xf2a6c1,0xd9822b].forEach((c,i)=>{const s=mwBox(0.55,0.95,0.12,mwMat(c,{lit:true}));s.position.set(-0.8+i*0.8,-0.55,0);rail.add(s);});
    add(rail,b.x+0.5,b.y+3.6,b.z+3.25,60);}
  {const Gq=MW_GUEST,st=new THREE.Group(),dark=mwMat(0x2a2a2e,{lit:true}),seat=mwMat(0x6b2222,{lit:true});
    const sc=mwBox(0.75,0.12,0.75,seat);sc.position.y=0.62;st.add(sc);const po=mwBox(0.08,0.5,0.08,dark);po.position.y=0.32;st.add(po);
    for(let k=0;k<5;k++){const a=k*1.2566,f=mwBox(0.36,0.05,0.06,dark);f.position.set(Math.cos(a)*0.18,0.06,Math.sin(a)*0.18);f.rotation.y=-a;st.add(f);}
    add(st,Gq.x0+1.5,Gq.y0+1,Gq.z0+4.5,40);
    const mon=new THREE.Group(),body=mwBox(0.9,0.7,0.65,mwMat(0xb8b4a6,{lit:true}));mon.add(body);const scr=mwBox(0.72,0.52,0.02,mwMat(0x101412,{lit:true}));scr.position.z=-0.34;mon.add(scr);
    const desk=mwBox(1.2,0.7,0.8,mwMat(0x3a3530,{lit:true}));desk.position.y=-0.7;mon.add(desk);add(mon,Gq.x1-1.5,Gq.y0+1.7,Gq.z0+4.5,40);}
  {const Pt=MPC.PIT,stand=mwMat(0x22222a,{lit:true}),wood=mwMat(0x5a3a22,{lit:true});
    for(const [x,z] of [[-20,-196],[-6,-198],[12,-195]]){const s=new THREE.Group(),p=mwBox(0.06,1.1,0.06,stand);p.position.y=0.55;s.add(p);
      const d=mwBox(0.55,0.4,0.04,stand);d.position.set(0,1.15,0);d.rotation.x=-0.4;s.add(d);add(s,x+0.5,Pt.y+1,z+0.5,70);}
    const drum=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,0.45,16),mwMat(0xe8e0d0,{lit:true}));drum.rotation.z=Math.PI/2;add(drum,24.5,Pt.y+1.7,-197.5,70);
    for(const [x,z,r] of [[-16,-194,0.3],[-2,-196,2.1],[18,-199,1],[28,-194,2.8]]){const c=new THREE.Group(),s=mwBox(0.5,0.08,0.5,wood);s.position.y=0.45;c.add(s);
      const bk=mwBox(0.5,0.5,0.06,wood);bk.position.set(0,0.75,0.22);c.add(bk);c.rotation.y=r;add(c,x+0.5,Pt.y+1,z+0.5,70);}}
  {const P_=[],I=[],C=[],cy=46,rr=[0,9,13],cols=[[1,0.97,0.86],[0.95,0.91,0.76],[0.78,0.74,0.6]];   /* a plain painted moon on the cyclorama */
    P_.push(0,cy,0);C.push(...cols[0]);
    for(let k=1;k<3;k++)for(let s=0;s<32;s++){const a=Math.PI*2*s/32;P_.push(Math.cos(a)*rr[k],cy+Math.sin(a)*rr[k],0);C.push(...cols[k]);}
    for(let s=0;s<32;s++){const n=(s+1)%32;I.push(0,1+s,1+n,1+s,33+s,33+n,1+s,33+n,1+n);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P_,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(C,3));geo.setIndex(I);
    const m=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.55,side:THREE.DoubleSide,depthWrite:false});m.blending=mwAdd();
    add(new THREE.Mesh(geo,m),0.5,6,MPC.BACKWALL_Z-0.05,160);}
  {const G=mwSpots('ghost')[0];add(mwSprite(0xfff1c0,2.6,0.9),G[0]+0.5,G[1]+0.55,G[2]+0.5,200);}
  MWV.flare=mwBooths().map(b=>add(mwSprite(0xffe6a0,1,0.95),b.lamp[0]+0.5,b.lamp[1]+0.5,b.lamp[2]+0.5,120));
  MWV.bandGlow=[];for(let i=0;i<3;i++){const R=MW_BAND[i];MWV.bandGlow.push([[R.x0,R.z0],[R.x1,R.z0],[R.x0,R.z1],[R.x1,R.z1]].map(([x,z])=>add(mwSprite(0xffd36a,1.3,0.7),x+0.5,17.5,z+0.5,48)));}
  mwRoot().add(g);return MWV.props={g,L};}
function mwPropsVisual(dt){const Pp=mwPropsBuild();if(frameCount%20===0)for(const o of Pp.L)o.visible=Math.hypot(o.position.x-P.x,o.position.z-P.z)<o.userData.r;
  for(let i=0;i<3;i++){const s=MWV.flare[i];if(!s)continue;const f=MWR.flare[i],sc=0.9+f*3.2;s.scale.set(sc,sc,1);s.material.opacity=0.55+0.4*Math.min(1,f);}
  for(let i=0;i<3;i++){const h=MWR.band['h'+i]||0;MWV.bandGlow[i].forEach((s,j)=>{const on=j%2===0?h:0;const sc=1.1+on*6;s.scale.set(sc,sc,1);s.material.opacity=0.45+on*3;});}}

/* ===== exports (PGEX: P1's seams for suites, the pilot and QA) ===== */
Object.assign(PGEX,{mpCol,mpSurf,mwCue,mwSpots,mwArmHoles,mwTreeSites,mwBiomeAt,mwOpenArch,mwArchState,mwFlinch,mwFollowTarget,mwTearSheet,
  mwWorkLights,mwBeacon,mwGridFx,mwS,MW_SFX,MW_MUSIC,mwMusicPreview,mwKitchenHut,mwDoughTarget,mwMusicCue,mwTopple,
  p1T:()=>({get MWR(){return MWR;},MWV,MWM,MWA_N,MW_K,MW_BAND,MW_GUEST,MW_HQ,MW_ARCH,mwKitchen,mwBooths,mwTreeRows,mwTreeCells,mwTreeAt,mwAllFlats,mwFlatCells,mwFlatAt,
    mwFlatBraces,mwToppleFlat,mwToppleNear,mwLimp,mwRegen,mwAllArmHoles,mwPalaceSpots,mwBeaconState,mwSkyKey,mwExposed,mwSfx,mwMusicTick,mwMusicState,
    mwTeslaTarget,mwBoo,mwBoothUnlock,mwDough,mwWoodsG,mwRostrumAt,mwLabsEdge,mwVor,mwSwampStair,mwPins,mwPen,mwMirror,mwTesla,mwHeap,mwArmHole,
    mwBurner,mwWingTrunks,mwFill,mwSagged,mwOpenGround,MW_SKY,mwMusic0,setSound:v=>{soundOn=!!v;},getSound:()=>soundOn,setMusic:v=>{musicOn=!!v;},
    getAC:()=>AC,setAC:v=>{AC=v;},MW_CLIMB,lights:()=>MP_LIGHTS,MCOLM:()=>MCOLM.size,
    breakAs:(x,y,z,who)=>{const id=getBlock(x,y,z);if(!id)return 0;scatterBE(x,y,z);setBlock(x,y,z,B.AIR);mpOnBreak(x,y,z,id,who||'Dan');return id;},genChunkPuppet,meshChunk:typeof meshChunk==='function'?meshChunk:null,genChunk,mkAudio:()=>audio(),frame:()=>frameCount,musicTick:()=>musicTick,mpSky,sky:()=>({bg:scene.background,fog:scene.fog,amb:ambL.intensity,dir:sunL.intensity})})});
