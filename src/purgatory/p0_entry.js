/* ---- PART 55: p0_entry.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p0_entry.js (P0): the Stage Door event, the door set, the ritual, the strip and the trunks, entry and its cutscene,
   death and Lost Property, the exit (customs, souvenirs, results), the re-entry wipe, the Debug buttons, the SFX sampler.
   Bible sections 2, 10.0 (Lost Property), 11.3-11.6. Nothing here allocates or rolls dice on an overworld path until a
   Stage Door exists (the og_trace parity session never stamps one).
   --------------------------------------------------------------------------------------------------------------------- */

/* ---- the door timer (bible 2.1): 10 minutes of pointer-locked survival play in the overworld; seam PGEX.mpSetPlayT ---- */
function mpDoorTimer(dt){
  if(!P||P.dead||MP.door)return;
  if(P.mode==='s'&&document.pointerLockElement)MP.playT+=dt;
  if(MP.playT>=600&&DIM==='over')mpStampDoor();}
function mpSetPlayT(t){MP.playT=Math.max(0,+t||0);return MP.playT;}
function mpDoorHere(){return mpStampDoor({here:1});}

/* ---- where the door goes: 60-90 m ahead (then +-90, 180 degrees), 9x7 footprint, height variance <= 2, dry, 48 m clear
   of villages, parks, dungeons, vaults, roosts and Malgorath, never inside a claimed base; last resort 30 m behind ---- */
const MP_DOOR_AVOID=['village','park','wd','ls','roost'];
function mpSnapF(dx,dz){return Math.abs(dx)>=Math.abs(dz)?[dx>=0?1:-1,0]:[0,dz>=0?1:-1];}
function mpDoorSiteOK(cx,cz,f){const r=[f[1],-f[0]];let mn=999,mx=-999;
  for(let i=-4;i<=4;i++)for(let j=-3;j<=3;j++){const x=cx+r[0]*i+f[0]*j,z=cz+r[1]*i+f[1]*j;
    if(!chunkAt(x,z))return null;
    const h=surfaceTop(x,z),a=getBlock(x,h+1,z),top=getBlock(x,h,z);
    if(a===B.WATER||a===B.LAVA||top===B.WATER||top===B.LAVA||h<SEA)return null;
    if(h<mn)mn=h;if(h>mx)mx=h;if(mx-mn>2)return null;}
  for(const k of MP_DOOR_AVOID){const d=cmpDef(k);if(!d||!d.cell)continue;const gx=Math.floor(cx/d.grid),gz=Math.floor(cz/d.grid);
    for(let ix=gx-1;ix<=gx+1;ix++)for(let iz=gz-1;iz<=gz+1;iz++){const c=d.cell(ix,iz);if(c&&Math.hypot(c.cx-cx,c.cz-cz)<48)return null;}}
  if(Math.hypot(DEMON_X-cx,DEMON_Z-cz)<75)return null;
  if(typeof agStructs==='function')for(const s of agStructs())if(Math.hypot(s.x-cx,s.z-cz)<24)return null;
  return {y:mx+1};}
function mpFindDoorSite(){const fw=[-Math.sin(P.yaw),-Math.cos(P.yaw)];
  for(const da of [0,Math.PI/2,-Math.PI/2,Math.PI]){const c=Math.cos(da),s=Math.sin(da),d=[fw[0]*c-fw[1]*s,fw[0]*s+fw[1]*c];
    for(let dist=60;dist<=90;dist+=2){const x=Math.floor(P.x+d[0]*dist),z=Math.floor(P.z+d[1]*dist);
      const f=mpSnapF(P.x-x,P.z-z),ok=mpDoorSiteOK(x,z,f);if(ok)return {x,y:ok.y,z,f};}}
  const x=Math.floor(P.x-fw[0]*30),z=Math.floor(P.z-fw[1]*30);forceChunksNear(x,z);
  return {x,y:surfaceTop(x,z)+1,z,f:mpSnapF(P.x-x,P.z-z),last:1};}
function mpDoorWall(fn){const d=MP.door;if(!d)return;const r=[d.f[1],-d.f[0]];
  for(let i=-3;i<=3;i++)for(let j=-6;j<7;j++)fn(d.x+r[0]*i,d.y+j,d.z+r[1]*i,i,j);}
function mpStampDoor(o){o=o||{};if(!P||DIM!=='over')return MP.door;
  if(MP.door&&!o.here)return MP.door;                                        /* once per world (the Debug button moves it) */
  if(MP.door&&o.here)mpDoorWall((x,y,z,i,j)=>{const id=getBlock(x,y,z);if(id===B.PG_DOOR||id===B.PG_MBLACK)setBlock(x,y,z,B.AIR);});
  let s;
  if(o.here){const fw=[-Math.sin(P.yaw),-Math.cos(P.yaw)],x=Math.floor(P.x+fw[0]*7),z=Math.floor(P.z+fw[1]*7);
    forceChunksNear(x,z);s={x,y:surfaceTop(x,z)+1,z,f:mpSnapF(P.x-x,P.z-z)};}
  else s=mpFindDoorSite();
  const {x,y,z,f}=s,r=[f[1],-f[0]],pa=ACTOR;ACTOR=null;
  try{
    for(let i=-3;i<=3;i++){const wx=x+r[0]*i,wz=z+r[1]*i;
      for(let yy=y-1;yy>y-8&&yy>0;yy--){const id=getBlock(wx,yy,wz);if(id&&DEFS[id]&&DEFS[id].solid!==false)break;setBlock(wx,yy,wz,B.PG_MBLACK);}
      for(let j=0;j<7;j++)setBlock(wx,y+j,wz,(i===0&&j<2)?B.PG_DOOR:B.PG_MBLACK);}
    for(let i=-5;i<=5;i++)for(const j of [1,2,3,-1,-2,-3]){const px=x+r[0]*i+f[0]*j,pz=z+r[1]*i+f[1]*j;
      for(let yy=y;yy<=y+3;yy++){const id=getBlock(px,yy,pz);const d=id&&DEFS[id];
        if(d&&!d.interact&&d.hard>=0&&id!==B.PG_STRUNK)setBlock(px,yy,pz,B.AIR);}
      const fl=getBlock(px,y-1,pz);if(!fl||!DEFS[fl]||DEFS[fl].solid===false)setBlock(px,y-1,pz,B.GRASS);
      for(let yy=y-2;yy>y-6&&yy>0;yy--){const id=getBlock(px,yy,pz);if(id&&DEFS[id]&&DEFS[id].solid!==false)break;setBlock(px,yy,pz,B.DIRT);}}
  }finally{ACTOR=pa;}
  MP.door={x,y,z,f:[f[0],f[1]]};mpDS.dirty=1;
  if(!o.quiet)showToast('Somewhere nearby, a searchlight is sweeping the sky.');
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS){
    if(a.name==='honeybee_mc')agEvent(a,'There is a door standing on its own in a field nearby, with a frog puppet lying on a stool beside it and a searchlight behind it',7);
    if(a.name==='BunkerBrad')agEvent(a,'A backstage door appeared out of nowhere in a field nearby, with a searchlight sweeping the sky behind it',7);}
  return MP.door;}

/* ---- the door set (OG prop meshes, built lazily once a door exists; animated by mpOverTick) ---- */
var mpDS={g:null,dirty:0,closed:-1,bulbs:[],bulbOn:null,bulbOff:null,beam:null,beamM:null,piv:null,plate:null,plateCv:null,plateTx:null,
  frog:null,head:null,tags:[],rit:{st:0,t:0},t:0,snap:0,turn:0,bite:0,biteName:null,biteT:0,chase:0,disp:[]};
function mpDoorSetDispose(){const S=mpDS;if(S.g&&typeof scene!=='undefined'&&scene)scene.remove(S.g);
  for(const o of S.disp)try{o.dispose();}catch(e){}
  S.disp=[];S.g=null;S.bulbs=[];S.beam=null;S.piv=null;S.plate=null;S.frog=null;S.head=null;S.tags=[];S.closed=-1;S.dirty=0;}
function mpMarquee(closed){const S=mpDS;const cv=S.plateCv,g=cv&&cv.getContext('2d');if(!g)return;
  g.fillStyle=closed?'#1a0f0f':'#2a0e14';g.fillRect(0,0,128,40);g.fillStyle='#c9a43a';g.fillRect(0,0,128,3);g.fillRect(0,37,128,3);
  g.font='bold 22px Georgia, serif';g.textAlign='center';g.textBaseline='middle';
  g.fillStyle=closed?'#7a6a6a':'#ffe9a8';g.fillText(closed?'CLOSED':'STAGE DOOR',64,21,120);
  if(S.plateTx)S.plateTx.needsUpdate=true;S.closed=closed?1:0;}
function mpFrogFace(){const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d');   /* a plain frog: round eyes, round pupils */
  g.fillStyle='#5a9a3a';g.fillRect(0,0,16,16);g.fillStyle='#f4f1e6';for(const x of [1,9]){g.fillRect(x+1,1,4,6);g.fillRect(x,2,6,4);}
  g.fillStyle='#14100c';g.fillRect(3,3,2,2);g.fillRect(11,3,2,2);g.fillStyle='#7a1220';g.fillRect(2,10,12,2);g.fillStyle='#3a0a10';g.fillRect(3,11,10,1);return c;}
function mpTagTex(name){const c=document.createElement('canvas');c.width=128;c.height=32;const g=c.getContext('2d');
  g.fillStyle='#e8d9a8';g.fillRect(0,0,128,32);g.strokeStyle='#5a3a1a';g.lineWidth=2;g.strokeRect(1,1,126,30);
  g.fillStyle='#2a1a0a';g.font='bold 16px Georgia, serif';g.textAlign='center';g.textBaseline='middle';g.fillText(name,64,17,118);
  const t=new THREE.CanvasTexture(c);mpDS.disp.push(t);return t;}
function mpDoorSetBuild(){const S=mpDS,d=MP.door;mpDoorSetDispose();if(!d||typeof scene==='undefined'||!scene)return;
  const G=new THREE.Group();G.position.set(d.x+0.5,d.y,d.z+0.5);G.rotation.y=Math.atan2(d.f[0],d.f[1]);
  const mat=(c,o)=>{const m=new THREE.MeshLambertMaterial(Object.assign({color:c},o||{}));S.disp.push(m);return m;};
  const bas=(c,o)=>{const m=new THREE.MeshBasicMaterial(Object.assign({color:c},o||{}));S.disp.push(m);return m;};
  const box=(w,h,dd,m,x,y,z,par)=>{const gg=new THREE.BoxGeometry(w,h,dd);S.disp.push(gg);const me=new THREE.Mesh(gg,m);me.position.set(x,y,z);(par||G).add(me);return me;};
  /* marquee plate + 14 chase bulbs */
  S.plateCv=document.createElement('canvas');S.plateCv.width=128;S.plateCv.height=40;
  S.plateTx=new THREE.CanvasTexture(S.plateCv);S.plateTx.magFilter=THREE.NearestFilter;S.disp.push(S.plateTx);
  S.plate=box(3.2,1.0,0.08,bas(0xffffff,{map:S.plateTx}),0,2.75,0.56);
  mpMarquee(MP.life.escapes>0);
  S.bulbOn=bas(0xfff0a0);S.bulbOff=bas(0x4a3a20);S.bulbs=[];
  for(let i=0;i<14;i++){const u=i<5?[-1.45+i*0.725,3.33]:i<7?[1.72,3.05-(i-5)*0.55]:i<12?[1.45-(i-7)*0.725,2.17]:[-1.72,2.45+(i-12)*0.55];
    S.bulbs.push(box(0.13,0.13,0.1,S.bulbOff,u[0],u[1],0.6));}
  /* velvet rope posts */
  const brass=mat(0xc9a43a),vel=mat(0x8e1424);
  for(const sx of [-1.7,1.7]){box(0.12,0.95,0.12,brass,sx,0.48,2.3);box(0.22,0.06,0.22,brass,sx,0.02,2.3);box(0.16,0.12,0.16,brass,sx,0.98,2.3);}
  box(3.3,0.07,0.07,vel,0,0.78,2.3);
  /* the stool and the limp frog puppet (a plain felt frog, flattened) */
  const wood=mat(0x6b4a2a);box(0.56,0.07,0.56,wood,1.45,0.62,1.15);
  for(const [lx,lz] of [[1.25,0.95],[1.65,0.95],[1.45,1.38]])box(0.06,0.6,0.06,wood,lx,0.3,lz);
  const frog=new THREE.Group();frog.position.set(1.45,0.67,1.15);G.add(frog);S.frog=frog;
  const felt=mat(0x5a9a3a),dark=mat(0x3e7a2a);
  box(0.36,0.07,0.5,felt,0,0.04,-0.05,frog);
  for(const s of [-1,1])box(0.1,0.04,0.16,dark,s*0.2,0.03,0.12,frog);                         /* two limp front feet */
  const hp=new THREE.Group();hp.position.set(0,0.06,0.2);frog.add(hp);S.head=hp;
  const fc=mpFrogFace(),ft=new THREE.CanvasTexture(fc);ft.magFilter=THREE.NearestFilter;S.disp.push(ft);
  const hg=new THREE.BoxGeometry(0.42,0.26,0.36);S.disp.push(hg);
  const hm=new THREE.Mesh(hg,[felt,felt,felt,felt,mat(0xffffff,{map:ft}),felt]);hm.position.set(0,0.13,0.14);hp.add(hm);
  hp.rotation.x=1.25;                                                          /* face down on the stool */
  /* the searchlight: a drum on a tripod behind the wall, its additive beam rotating and tilted 20 degrees */
  const iron=mat(0x2b2b30);for(const a of [0,2.1,4.2])box(0.06,1.2,0.06,iron,Math.sin(a)*0.35,0.55,-2.8+Math.cos(a)*0.35);
  box(0.8,0.6,0.8,iron,0,1.3,-2.8);box(0.66,0.06,0.66,bas(0xfff6d0),0,1.62,-2.8);
  const piv=new THREE.Group();piv.position.set(0,1.62,-2.8);G.add(piv);S.piv=piv;
  const tilt=new THREE.Group();tilt.rotation.z=0.35;piv.add(tilt);
  S.beamM=bas(0xfff2c8,{transparent:true,opacity:0.3,depthWrite:false,fog:false,blending:THREE.AdditiveBlending});
  S.beam=box(2,120,2,S.beamM,0,60,0,tilt);
  /* name tags over the Stage Trunks */
  S.tags=[];for(const who in MP.trunks){const p=(''+MP.trunks[who]).split(',');if(p.length!==3||MP.trunks[who].indexOf(';')>=0)continue;
    const sm=new THREE.SpriteMaterial({map:mpTagTex(who.replace(/~\d+$/,'')),transparent:true});S.disp.push(sm);const sp=new THREE.Sprite(sm);
    sp.scale.set(1.2,0.3,1);sp.position.set(+p[0]+0.5,+p[1]+1.45,+p[2]+0.5);S.tags.push(sp);}
  scene.add(G);for(const sp of S.tags)scene.add(sp);S.disp.push({dispose:()=>{for(const sp of S.tags)scene.remove(sp);}});
  S.g=G;S.dirty=0;}
/* mpOverTick: overworld, only once MP.door exists. No Math.random, no clock, no THREE constructor after the first build. */
function mpOverTick(dt){const S=mpDS,d=MP.door;S.t+=dt;
  if((S.dirty||!S.g)&&!(CUT.on&&CUT.script&&S.g)){try{mpDoorSetBuild();}catch(err){mpFail('doorset',err);S.dirty=0;}}   /* never mid-cutscene */
  const R=S.rit;R.t+=dt;
  if(R.st===1&&(R.t>5||!P||Math.hypot(P.x-d.x-0.5,P.z-d.z-0.5)>8))R.st=0;    /* walking away or waiting 5 s resets the frog */
  if(S.g){S.g.visible=true;for(const sp of S.tags)sp.visible=true;
    const night=!sunUp(),dd=P?Math.hypot(P.x-d.x,P.z-d.z):0,fade=clamp(1.15-dd/((RD+1)*CH),0,1);
    if(S.piv)S.piv.rotation.y+=dt*0.55;
    if(S.beamM)S.beamM.opacity=(night?0.34:0.12)*fade;
    if(S.closed!==(MP.life.escapes>0?1:0))mpMarquee(MP.life.escapes>0);
    S.chase+=dt;const k=Math.floor(S.chase/0.14);
    for(let i=0;i<S.bulbs.length;i++){const on=MP.life.escapes>0?((k>>3)&1)===0&&i%7===0:(i+k)%3===0;S.bulbs[i].material=on?S.bulbOn:S.bulbOff;}
    mpFrogAnim(dt);}
  for(const f of PREG.overTick)try{f(dt);}catch(err){mpFail('overTick',err);}}
function mpFrogDir(x,z){const S=mpDS,G=S.g,th=G.rotation.y,wx=x-G.position.x,wz=z-G.position.z;   /* frog-local (stool) direction */
  const lx=wx*Math.cos(th)-wz*Math.sin(th)-S.frog.position.x,lz=wx*Math.sin(th)+wz*Math.cos(th)-S.frog.position.z,l=Math.hypot(lx,lz)||1;
  return [lx/l,lz/l,l];}
function mpFrogAnim(dt){const S=mpDS,h=S.head;if(!h)return;
  let rx=1.25,ry=0,sc=1,py=0.06,pz=0.2,px=0;
  if(S.snap>0){S.snap=Math.max(0,S.snap-dt);const u=Math.sin(Math.min(1,(0.9-S.snap)/0.9)*Math.PI);rx=1.25-1.6*u;py+=0.12*u;}
  if(S.turn>0||S.rit.st===1){S.turn=Math.max(0,S.turn-dt);const u=S.rit.st===1?Math.min(1,(2-S.turn)/2):0;rx=1.25-1.25*u;
    if(P&&S.g){const q=mpFrogDir(P.x,P.z);ry=Math.atan2(q[0],q[1])*u;}}
  if(S.bite>0){S.bite=Math.max(0,S.bite-dt);const u=Math.sin(Math.min(1,(1.5-S.bite)/1.5)*Math.PI);
    if(P&&S.g){const q=mpFrogDir(P.x,P.z),reach=Math.min(q[2]-0.9,2.2)*u;ry=Math.atan2(q[0],q[1]);px=q[0]*reach;pz=0.2+q[1]*reach;}
    rx=-0.25*u;sc=1+2.4*u;py=0.06+0.75*u;}
  if(S.biteT>0){S.biteT=Math.max(0,S.biteT-dt);const u=Math.sin(Math.min(1,(2.5-S.biteT)/2.5)*Math.PI);
    const a=typeof agByName==='function'?agByName(S.biteName):null,b=a&&a.e;rx=-0.2*u;sc=1+0.6*u;pz=0.2+0.6*u;
    if(b&&S.g){const q=mpFrogDir(b.x,b.z);ry=Math.atan2(q[0],q[1])*u;px=q[0]*0.5*u;pz=0.2+q[1]*0.5*u;}}
  h.rotation.x=rx;h.rotation.y=ry;h.position.x=px;h.position.y=py;h.position.z=pz;h.scale.set(sc,sc,sc);}
/* the stool frog bites somebody at the trunks (P5's exit epilogue calls this for xx_lilcreepah_xx) */
function mpDoorFrogBite(name){mpDS.biteName=name||null;mpDS.biteT=2.5;const d=MP.door;if(d)mwS('pg_bite',d.x,d.y,d.z);return !!d;}

/* ---- the ritual (bible 2.2): PREG.interact.pdoor runs from P0-21 when Dan right-clicks a Stage Door block ---- */
PREG.interact.pdoor=function(hit,hd){
  if(DIM!=='over'||!P||P.dead||CUT.on||!MP.door)return;
  const d=MP.door,R=mpDS.rit;
  if(heldStack()){R.st=0;mpDS.snap=0.9;mwS('pg_bite',d.x,d.y+1,d.z);mpSay('','Empty hand.',2.2);return;}
  if(R.st===1&&R.t<5){R.st=0;mpEnter();return;}
  R.st=1;R.t=0;mpDS.turn=2;mpSay('','Everything you’re carrying stays out here.',3.2);};
/* Stage Trunks (and every Headliner Trunk inside): a 54-slot stash, opened like a chest */
PREG.interact.pstash=function(hit,hd){const k=bkey(hit.x,hit.y,hit.z),be=blockEnts.get(k);
  if(!be||be.t!=='stash'){showToast('The trunk is locked.');return;}
  if(be.who&&be.who!=='Dan'&&DIM==='puppet'){showToast('Not yours.');return;}
  openModal('chest',k);const t=$('mtitle');if(t)t.textContent=(be.name||((be.who||'Someone')+'’s'))+' Stage Trunk';};
/* emptied overworld Stage Trunks vanish on close (bible 11.3); Headliner Trunks inside are P4's and stay */
function mpStashClosed(be,bek){if(DIM!=='over'||!bek||be.inv.some(Boolean))return;
  for(const who in MP.trunks)if(MP.trunks[who]===bek){mpRemoveTrunk(bek);delete MP.trunks[who];mpDS.dirty=1;break;}}
function mpRemoveTrunk(bek){const p=dimP(bek);if(!p)return false;const x=+p[0],y=+p[1],z=+p[2];
  if(getBlock(x,y,z)===B.PG_STRUNK)setBlock(x,y,z,B.AIR);blockEnts.delete(bek);mpDS.dirty=1;return true;}
/* a free spot in the trunk row: right of the door (Dan at 3, the bots at 5, 7, 9), one block in front; ring search */
function mpTrunkSpot(idx){const d=MP.door;if(!d)return null;const f=d.f,r=[f[1],-f[0]],o=3+2*(idx|0);
  const bx=d.x+r[0]*o+f[0],bz=d.z+r[1]*o+f[1];
  const ok=(x,y,z)=>{if(!chunkAt(x,z))return false;const a=getBlock(x,y,z),u=getBlock(x,y+1,z),b=getBlock(x,y-1,z);
    const free=id=>!id||(DEFS[id]&&(DEFS[id].replace||DEFS[id].solid===false)&&id!==B.WATER&&id!==B.LAVA&&id!==B.PORTAL_N&&id!==B.PORTAL_A);
    return free(a)&&free(u)&&b&&DEFS[b]&&DEFS[b].solid!==false&&b!==B.PG_STRUNK&&b!==B.PG_DOOR;};
  for(let rr=0;rr<=3;rr++)for(let dx=-rr;dx<=rr;dx++)for(let dz=-rr;dz<=rr;dz++){if(Math.max(Math.abs(dx),Math.abs(dz))!==rr)continue;
    for(const dy of [0,1,-1,2,-2])if(ok(bx+dx,d.y+dy,bz+dz))return [bx+dx,d.y+dy,bz+dz];}
  return [bx,d.y,bz];}
/* place a named Stage Trunk holding `stacks` (by reference) in the row; returns its bkey (P5 uses this for the bots' trunks) */
function mpPlaceTrunk(who,idx,stacks){
  {const old=MP.trunks[who],ob=old&&blockEnts.get(old);if(ob&&ob.inv&&ob.inv.some(Boolean)){let n=2;while(MP.trunks[who+'~'+n])n++;MP.trunks[who+'~'+n]=old;}}  /* an unopened old trunk stays tracked */
  const s=mpTrunkSpot(idx);if(!s)return null;forceChunksNear(s[0],s[2]);
  const pa=ACTOR;ACTOR=null;try{setBlock(s[0],s[1],s[2],B.PG_STRUNK);}finally{ACTOR=pa;}
  const inv=(stacks||[]).filter(Boolean).slice(0,54);while(inv.length<54)inv.push(null);
  const k=bkey(s[0],s[1],s[2]);blockEnts.set(k,{t:'stash',inv,who});MP.trunks[who]=k;mpDS.dirty=1;return k;}

/* ---- the strip (bible 2.4 steps 1-5, overworld, before setDim). Returns the notable stack and the old hotbar (cosmetic). ---- */
function mpCloseAllPanels(){const T=(f,on)=>{if(on)try{f();}catch(e){mpFail('close',e);}};
  T(closeStore,storeOpen);T(closePow,powOpen);T(closeEnch,enchOpen);T(closeDSel,dselOpen);T(closeCas,casOpen);T(closeDlg,dlgOpen);
  T(closePC,pcOpen);T(closeCmp,cmpOpen);T(closeTerr,terrOpen);T(closeCine,cineOpen);T(closeWin,winOpen);T(closeChat,chatOpen);
  if(pguOn)pguClose(true);if(presOn)presClose(true);}
const MP_NOTABLE=[  /* the opening heckle reads the most notable stashed stack (bible 12.3): nuke, guns, vehicles and gadgets, dragon items, ores */
  {is:id=>id===IT.NUKE,a:()=>'He had a NUKE in there.',b:'Not anymore. Baa-ha-ha.'},
  {is:id=>!!gunIdParts(id),a:()=>'He brought a gun.',b:'To a puppet show. Baa-ha-ha.'},
  {is:id=>id===IT.CAR||id===IT.PLANE||id===IT.BOAT||id===IT.CART||id===IT.SKATE,a:n=>'He packed a '+n.toLowerCase()+'.',b:'He’s walking now. Baa-ha-ha.'},
  {is:id=>!!(DEFS[id]&&DEFS[id].gadget),a:()=>'He had gadgets in there.',b:'Not in here he doesn’t. Baa-ha-ha.'},
  {is:id=>id===IT.DSCALE,a:()=>'He had dragon scales.',b:'The frog doesn’t care. Baa-ha-ha.'},
  {is:id=>id===IT.DIAMOND||id===IT.CRYSTAL,a:(n,c)=>mpCap(mpWords(c))+' '+(c===1?n.replace(/s$/,''):n.replace(/s?$/,'s'))+'.',b:'Not anymore. Baa-ha-ha.',count:1},
  {is:id=>id===IT.GOLD||id===IT.IRON,a:(n,c)=>mpCap(mpWords(c))+' '+n.toLowerCase()+'.',b:'He’ll want those. Baa-ha-ha.',count:1}];
function mpNotable(loot){for(const R of MP_NOTABLE){let c=0,nm='';for(const s of loot)if(s&&R.is(s.id)){c+=s.count||1;if(!nm)nm=(DEFS[s.id]&&DEFS[s.id].name)||'thing';}
    if(c)return {a:R.a(nm,c),b:R.b};}
  const n=loot.filter(Boolean).length;
  if(!n)return {a:'Empty pockets.',b:'He’s learning. Baa-ha-ha.'};
  return {a:mpCap(mpWords(n))+(n===1?' stack.':' stacks.'),b:'He’ll want those. Baa-ha-ha.'};}
function mpUnbank(){const k=MP.keep;MP.keep=null;if(!k||!P)return;
  P.mode=k.mode==='c'?'c':'s';if(k.cos)P.cos={hat:k.cos.hat||null,trail:k.cos.trail||null};
  if(Array.isArray(k.spawn)&&k.spawn.length===3)P.spawn=k.spawn.slice();
  if(typeof plModel!=='undefined'&&plModel&&typeof applyHat==='function')try{applyHat(plModel);}catch(e){}}
function mpStrip(){const loot=[],take=st=>{if(st&&st.count>0)loot.push(st);};
  if(MODAL.grid){for(let i=0;i<MODAL.grid.length;i++){take(MODAL.grid[i]);MODAL.grid[i]=null;}}
  take(cursorStack);cursorStack=null;
  closeModal(true);mpCloseAllPanels();
  const hot=P.inv.slice(0,9);
  for(let i=0;i<36;i++){take(P.inv[i]);P.inv[i]=null;}
  for(let i=0;i<4;i++){const a=P.armor[i];if(a){a.count=1;take(a);}P.armor[i]=null;}  /* by reference: dur/ench/mob ride along */
  const notable=mpNotable(loot);
  mpPlaceTrunk('Dan',0,loot);
  if(typeof purgBotsStash==='function')try{purgBotsStash();}catch(err){mpFail('purgBotsStash',err);}
  MP.keep={mode:P.mode,cos:{hat:P.cos&&P.cos.hat||null,trail:P.cos&&P.cos.trail||null},spawn:P.spawn.slice()};
  P.mode='s';P.flying=false;P.cos={hat:null,trail:null};
  if(typeof plModel!=='undefined'&&plModel&&typeof applyHat==='function')try{applyHat(plModel);}catch(e){}
  MINE.active=false;MINE.prog=0;P.eatT=0;P.bowT=0;P.ride=null;
  redrawHotbar();updateArmorHud();if(typeof plModel!=='undefined'&&plModel)syncArmorModel(plModel);
  endDisaster(true);
  P.hp=20;P.hunger=20;P.air=10;P.exh=0;drawStats();
  MP.inside=true;MP.ret={dim:'over',x:P.x,y:P.y,z:P.z};MP.stats.t0=MP.clock;
  return {notable,hot,count:loot.length};}

/* ---- entry (bible 2.3-2.4). mpEnter() is the ritual's bite; mpEnterNow() (tests, debug) skips the cutscene. ---- */
function mpEnter(o){o=o||{};
  if(DIM!=='over'||!P||P.dead||MP.inside)return false;
  if(CUT.on){if(!o.now)return false;endCut();}
  if(!MP.door){if(!o.now)return false;mpStampDoor({here:1,quiet:1});}
  if(MP.clock>0||MP.stats.t0>0)mpWipe();                                  /* the show reopens: a fresh purgatory */
  if(o.now){MPF.entry=mpStrip();mpArrive();mpGiveProgramme(false);return true;}
  /* the cutscene strips under the black at t 4.1 (or when skipped), so an autosave during the bite keeps everything on Dan */
  const pre=[...P.inv,...P.armor].filter(Boolean);MPF.entry={notable:mpNotable(pre),hot:P.inv.slice(0,9),count:pre.length,pending:true};
  mpEntryCut(MPF.entry);return true;}
function mpEnterNow(){return mpEnter({now:1});}
function mpArrive(){if(DIM==='puppet')return;
  if(mpDS.g)mpDS.g.visible=false;for(const sp of mpDS.tags)sp.visible=false;
  const E=MPC.ENTRY,M=MPC.MARK;
  setDim('puppet',E.x,E.y,E.z);forceChunksNear(M[0],M[2]);
  P.x=M[0]+0.5;P.z=M[2]+0.5;P.y=mpSafeY(P.x,M[1],P.z);P.yaw=Math.PI;P.pitch=0;P.vx=P.vy=P.vz=0;P.fallD=0;
  if(typeof purgBotsEnter==='function')try{purgBotsEnter();}catch(err){mpFail('purgBotsEnter',err);}
  for(const f of PREG.onEnter)try{f();}catch(err){mpFail('onEnter',err);}
  if(typeof hrPgPrewarm==='function')try{hrPgPrewarm();}catch(err){mpFail('hrPgPrewarm',err);}
  redrawHotbar();drawStats();}
function mpGiveProgramme(hurl){if(DIM!=='puppet'||mpHas(IT.PG_PROGRAMME))return false;
  mpGive({id:IT.PG_PROGRAMME,count:1},'programme');
  if(hurl&&P){const fw=[-Math.sin(P.yaw),-Math.cos(P.yaw)];P.vx-=fw[0]*3;P.vz-=fw[1]*3;P.vy=Math.max(P.vy,2.5);
    const h=MPC.HUB_CAN;mwS('pg_lid',h[0],h[1],h[2]);}
  return true;}
/* the cutscene: 0-1.5 the frog lunges; 1.5-4 the felt mouth closes while the hotbar empties slot by slot (HUD only, the
   strip already happened); 4-5 black, a lid slam and a slide whistle (the switch happens at 4.5 under the black); 5-6.6 the
   red curtain rises on the stage; the box heckles; at the end the Programme is hurled out of the can into your face. */
function mpFeltEls(){const el=$('pfelt');if(!el)return null;
  if(!el._pg){el._pg=1;el.innerHTML=
    '<div id="pfeltT" style="position:absolute;left:-5%;right:-5%;top:0;height:54%;transform:translateY(-102%);background:'+
    'radial-gradient(ellipse at 50% 100%,#f5a9b8 0%,#d9707f 55%,#8e2f42 100%);border-bottom:6px solid #5a1424;'+
    'box-shadow:inset 0 -14px 0 #f6c9cf, inset 0 -18px 0 #7a1c30"></div>'+
    '<div id="pfeltB" style="position:absolute;left:-5%;right:-5%;bottom:0;height:54%;transform:translateY(102%);background:'+
    'radial-gradient(ellipse at 50% 0%,#f5a9b8 0%,#d9707f 55%,#8e2f42 100%);border-top:6px solid #5a1424;'+
    'box-shadow:inset 0 14px 0 #f6c9cf, inset 0 18px 0 #7a1c30"></div>'+
    '<div id="pfeltK" style="position:absolute;inset:0;background:#000;opacity:0"></div>'+
    '<div id="pfeltC" style="position:absolute;inset:0;display:none;background:'+
    'repeating-linear-gradient(90deg,#5e0c18 0px,#9c1b2c 22px,#c0283a 34px,#8e1424 48px,#5e0c18 64px);'+
    'border-bottom:18px solid #c9a43a"></div>';}
  return {el,T:$('pfeltT'),Bt:$('pfeltB'),K:$('pfeltK'),C:$('pfeltC')};}
function mpEntryCut(info){const d=MP.door,F=mpFeltEls();
  const fr=[d.x+0.5+d.f[1]*1.45+d.f[0]*1.15,d.y+0.95,d.z+0.5-d.f[0]*1.45+d.f[1]*1.15];   /* the frog's head on the stool */
  const eye0=[P.x,P.y+P.eyeY,P.z],ghost=info.hot.slice(),cleared=[];let arrived=false,stripped=false,lid=false,slide=false,ended=false;
  const strip=()=>{if(stripped)return;stripped=true;const r=mpStrip();MPF.entry=Object.assign(r,{notable:info.notable});drawGhost();};
  mpDS.bite=1.5;mwS('pg_bite',fr[0],fr[1],fr[2]);
  const drawGhost=()=>{for(let i=0;i<9;i++){const c=typeof HOTCV!=='undefined'&&HOTCV[i];if(!c)continue;const g=c.getContext('2d');g.clearRect(0,0,48,48);
    if(ghost[i]&&!cleared[i])drawStackIn(g,ghost[i],0,0,48);}};
  drawGhost();
  if(F){F.el.style.display='block';F.C.style.display='none';F.C.style.transform='translateY(0)';F.K.style.opacity=0;}
  const finish=()=>{if(ended)return;ended=true;
    strip();if(!arrived){arrived=true;mpArrive();}
    if(F){F.el.style.display='none';F.T.style.transform='translateY(-102%)';F.Bt.style.transform='translateY(102%)';F.K.style.opacity=0;F.C.style.display='none';}
    redrawHotbar();mpGiveProgramme(true);MPF.cut=false;};
  mpCut({end:8.8,
    lines:[{at:0,n:'',t:''},{at:5.7,n:'OLD GOAT',t:info.notable.a},{at:7.1,n:'OLDER GOAT',t:info.notable.b},{at:8.5,n:'',t:''}],
    cam:t=>{if(t<4.5){const k=clamp(t/1.2,0,1);const lx=fr[0]-eye0[0],ly=fr[1]-eye0[1],lz=fr[2]-eye0[2],l=Math.hypot(lx,ly,lz)||1;
        const push=Math.min(0.85,l-0.6)*clamp((t-0.2)/1.3,0,1);
        camera.position.set(eye0[0]+lx/l*push,eye0[1]+ly/l*push,eye0[2]+lz/l*push);
        camera.rotation.y=P.yaw+(Math.atan2(-lx,-lz)-P.yaw)*k;camera.rotation.x=P.pitch+(Math.asin(clamp(ly/l,-1,1))-P.pitch)*k;}
      else{const u=clamp((t-5)/1.8,0,1);camera.position.set(P.x,P.y+0.45+(P.eyeY-0.45)*u,P.z);camera.rotation.y=P.yaw;camera.rotation.x=0.18*(1-u);}},
    tick:(dt,t)=>{
      if(t>=1.5){for(let i=0;i<9;i++)if(!cleared[i]&&t>=1.5+i*0.27){cleared[i]=1;if(ghost[i]){if(typeof playS==='function')playS('pop');}drawGhost();}}
      if(F){const u=clamp((t-1.5)/2.5,0,1),cl=u*u*(3-2*u);F.T.style.transform='translateY('+(-102+cl*100)+'%)';F.Bt.style.transform='translateY('+(102-cl*100)+'%)';
        F.K.style.opacity=t<4?0:(t<4.9?1:clamp(1-(t-4.9)/0.4,0,1));
        if(t>=4.5){F.C.style.display='block';F.T.style.display=F.Bt.style.display='none';F.C.style.transform='translateY('+(-clamp((t-5.0)/1.6,0,1)*104)+'%)';}
        else{F.T.style.display=F.Bt.style.display='block';}}
      if(!lid&&t>=4.1){lid=true;strip();mwS('pg_lid');}
      if(!slide&&t>=4.3){slide=true;mwS('pg_slide');}
      if(!arrived&&t>=4.5){arrived=true;strip();mpArrive();}},
    onEnd:finish});}

/* ---- death and respawn inside (bible 1 Respawn, 10.0 Lost Property) ---- */
function mpOnDeath(){
  MPF.deathAt=[P.x,P.y,P.z];                                                         /* PZ: core updateCoords nulls P.deathPos and respawn() moves P first */
  if(!GR.keepInv&&!MP.strike){const L=MP.lost.Dan||(MP.lost.Dan=[]);
    for(let i=0;i<36;i++){const st=P.inv[i];if(st){L.push(st);P.inv[i]=null;}}}       /* armour stays on (engine default) */
  MP.stats.deaths++;mwS('pg_laugh');
  for(const f of PREG.onDeath)try{f('Dan');}catch(err){mpFail('onDeath',err);}}
/* unlocked spawn points with their Lost Property can (the Mark: the hub can; a booth: its can; a Prop Trunk: the trunk itself) */
function mpSpawnPoints(){const out=[],M=MPC.MARK,S=MP.spawns;
  out.push({k:'mark',pos:[M[0]+0.5,M[1],M[2]+0.5],can:MPC.HUB_CAN.slice()});
  const cans=typeof mwSpots==='function'?mwSpots('boothCan'):[];
  for(let i=0;i<3;i++)if(S['b'+(i+1)]){const b=MPC.BOOTH[i],c=cans&&cans[i];
    const y=c?c[1]:(typeof mpSurf==='function'?mpSurf(b[0],b[1])+1:deckY(b[1])+1);out.push({k:'b'+(i+1),pos:[b[0]+0.5,y,b[1]+0.5],can:c?c.slice():[b[0]+2,y,b[1]]});}
  if(Array.isArray(S.trunk)&&S.trunk.length===3){const t=S.trunk;out.push({k:'trunk',pos:[t[0]+0.5,t[1]+1,t[2]+0.5],can:t.slice()});}
  return out;}
function mpRespawn(){if(DIM!=='puppet'||!P)return null;
  let pick=null;const hs=typeof hnState==='function'?hnState():null;
  if(hs&&hs.live&&hs.name&&MPC.UMARK[hs.name]){const u=mpUmarkPos(hs.name);pick={k:'umark',pos:[u[0]+0.5,u[1],u[2]+0.5],can:[u[0]+3,u[1],u[2]+1]};}
  else{const at=MPF.deathAt||P.deathPos||[P.x,P.y,P.z];let bd=1e9;
    for(const s of mpSpawnPoints()){const dd=Math.hypot(s.pos[0]-at[0],s.pos[2]-at[2]);if(dd<bd){bd=dd;pick=s;}}}
  forceChunksNear(pick.pos[0],pick.pos[2]);
  P.x=pick.pos[0];P.z=pick.pos[2];P.y=mpSafeY(P.x,pick.pos[1],P.z);P.vx=P.vy=P.vz=0;
  MPF.lastSpawn={k:pick.k,pos:[P.x,P.y,P.z]};MPF.deathAt=null;
  const L=MP.lost.Dan;if(L&&L.length){delete MP.lost.Dan;try{pcanVolley(L,pick.can,'Dan',{rate:0.2});}catch(err){mpFail('pcanVolley',err);for(const s of L)if(invAddTo(P.inv,s)>0)mpDrop(P.x,P.y+1,P.z,s,'Dan');}}
  for(const f of PREG.onRespawn)try{f('Dan',MPF.lastSpawn.pos);}catch(err){mpFail('onRespawn',err);}
  redrawHotbar();return MPF.lastSpawn;}

/* ---- the exit (bible 11.3-11.5). mpExit runs at the EXIT doors (P4's Strike) and for Debug -> Abandon. ---- */
function mpResultsStats(){const s=MP.stats;return {time:Math.max(0,MP.clock-(s.t0||0)),deaths:s.deaths|0,swallowed:s.swallowed|0,thrown:s.thrown|0,
  pigs:s.pigs|0,splices:s.splices|0,tomatoes:s.tomatoes|0,knuckles:MP.knuckles|0,
  bots:Object.keys(MP.bots||{}).map(n=>({name:n,deaths:(MP.bots[n]&&MP.bots[n].deaths)|0}))};}
const MP_SOUVENIRS=[['bomber',362],['bigpig',363],['bigfrog',364]];
function mpExit(o){o=o||{};if(DIM!=='puppet'||!P)return false;const abandon=!!o.abandon;
  if(CUT.on){if(CUT.script){const s=CUT.script;CUT.script=null;CUT.on=false;const el=$('cut');if(el)el.style.display='none';}else endCut();}
  closeModal(true);mpCloseAllPanels();
  if(P.dead){P.dead=false;P.hp=20;const dm=$('death');if(dm)dm.style.display='none';}
  if(!abandon)mpTickOff('escape');
  const stats=mpResultsStats();
  /* customs: every purgatory item on Dan dissolves; souvenirs once each per beaten headliner, never twice */
  let gone=0;for(let i=0;i<36;i++){const s=P.inv[i];if(s&&DEFS[s.id]&&DEFS[s.id].pg){P.inv[i]=null;gone++;}}
  for(let i=0;i<4;i++){const a=P.armor[i];if(a&&DEFS[a.id]&&DEFS[a.id].pg){P.armor[i]=null;gone++;}}
  if(cursorStack&&DEFS[cursorStack.id]&&DEFS[cursorStack.id].pg)cursorStack=null;
  const sv=[];if(!abandon)for(const [k,id] of MP_SOUVENIRS)if(MP.dead[k]&&!MP.life.souvenirs[k]){MP.life.souvenirs[k]=1;sv.push(id);}
  MP.inside=false;mpUnbank();
  const d=MP.door,R=MP.ret||(d?{x:d.x+0.5+d.f[0]*1.5,y:d.y,z:d.z+0.5+d.f[1]*1.5}:{x:P.spawn[0],y:P.spawn[1],z:P.spawn[2]});
  const px=d?d.x+0.5+d.f[0]*1.6:R.x,pz=d?d.z+0.5+d.f[1]*1.6:R.z;
  setDim('over',px,R.y,pz);forceChunksNear(px,pz);
  P.y=mpSafeY(px,d?d.y:R.y,pz);P.vx=P.vy=P.vz=0;P.fallD=0;P.hurtT=1;if(d)P.yaw=Math.atan2(-d.f[0],-d.f[1]);
  for(const id of sv)mpGive({id,count:1},'souvenir');                       /* logged: the speed-run ledger explains it */
  if(typeof purgBotsExit==='function')try{purgBotsExit();}catch(err){mpFail('purgBotsExit',err);}
  redrawHotbar();updateArmorHud();if(typeof plModel!=='undefined'&&plModel)syncArmorModel(plModel);drawStats();
  burstParticles(P.x,P.y+1.2,P.z,B.WOOL,10,0.6);mwS('pg_thunk');
  showToast(abandon?'Purgatory abandoned. The show will reopen.':'Everything from in there stays in there.');
  MPF.fight=null;MPF.lastExit={abandon,stats,souvenirs:sv,dissolved:gone};mpDS.dirty=1;
  if(!abandon){MP.life.escapes++;presOpen(stats);}
  for(const f of PREG.onExit)try{f(o);}catch(err){mpFail('onExit',err);}
  return true;}
function mpExitNow(o){return mpExit(o||{});}
/* the re-entry wipe (bible 11.5): every m; key, every puppet store, MP except door, playT and life */
function mpWipe(){const isM=k=>typeof k==='string'&&k.charCodeAt(0)===109&&k[1]===';';
  for(const k of [...chunkEdits.keys()])if(isM(k))chunkEdits.delete(k);
  for(const k of [...blockEnts.keys()])if(isM(k))blockEnts.delete(k);
  for(const k of [...torches])if(isM(k))torches.delete(k);
  for(const k of [...SPW.keys()])if(isM(k))SPW.delete(k);
  if(typeof LWN!=='undefined')for(const k of [...LWN.keys()])if(isM(k))LWN.delete(k);
  if(typeof BOWN!=='undefined')for(const k of [...BOWN.keys()])if(isM(k))BOWN.delete(k);
  if(typeof OWNC!=='undefined')for(const k of [...OWNC.keys()])if(k.startsWith('puppet|'))OWNC.delete(k);
  if(typeof TICKETS!=='undefined')for(const k of [...TICKETS.keys()])if(isM(k))TICKETS.delete(k);
  for(let i=NUKES.length-1;i>=0;i--)if(NUKES[i].d==='puppet')NUKES.splice(i,1);
  for(const k of [...MP_LIGHTS])if(isM(k))MP_LIGHTS.delete(k);
  delete ENT_STASH.puppet;
  const keep={door:MP.door,playT:MP.playT,life:MP.life,trunks:MP.trunks};
  MP=Object.assign(mpDefault(),keep);MPF.fight=null;MPF.flinch=0;MPF.results=false;MPF.giveLog=[];
  for(const f of PREG.onReset)try{f();}catch(err){mpFail('onReset',err);}}

/* ---- P0's own registrations ---- */
var mpBatL=false,mpBatSw=0;
PREG.tick.push(function mpP0Tick(dt){
  /* the swing that bats pooled projectiles (no attack hook exists; pickMob ignores pproj) */
  const lEdge=MB.l&&!mpBatL&&!modalOpen(),swEdge=P.swing>=0.99&&mpBatSw<0.99;mpBatL=MB.l;mpBatSw=P.swing;
  if((lEdge||swEdge)&&!P.dead)puBatSwing();
  mpGuideTick(dt);});
PREG.onBreak.push(function mpP0Break(x,y,z,id,who){if(id===B.PG_ARMHOLE&&who==='Dan')mpTickOff('armhole');});

/* ---- Debug Menu buttons (P0-62) and the SFX sampler (bible 18: Dan unmutes it himself) ---- */
function mpDbgDone(){if(typeof dbgmOpen!=='undefined'&&dbgmOpen){dbgmOpen=false;const el=$('dbgm');if(el)el.style.display='none';}
  if(typeof paused!=='undefined'&&paused&&typeof resumeGame==='function')resumeGame();}
var mpSamp={on:false,i:0,list:[],tm:null};
function mpSampler(stop){const S=mpSamp;if(S.tm){clearTimeout(S.tm);S.tm=null;}
  if(stop||S.on){S.on=false;showToast('SFX sampler stopped.');return 0;}
  const sfx=(typeof MW_SFX!=='undefined'&&Array.isArray(MW_SFX))?MW_SFX:[],mus=(typeof MW_MUSIC!=='undefined'&&Array.isArray(MW_MUSIC))?MW_MUSIC:[];
  S.list=sfx.map(n=>({k:'sfx',n})).concat(mus.map(n=>({k:'music',n})));S.i=0;
  if(!S.list.length){showToast('SFX sampler: no purgatory sounds are built yet.');return 0;}
  S.on=true;
  const step=()=>{if(!S.on)return;if(S.i>=S.list.length){S.on=false;showToast('SFX sampler: done ('+S.list.length+' cues).');return;}
    const c=S.list[S.i++],lab=(c.k==='sfx'?'SFX ':'MUSIC ')+S.i+'/'+S.list.length+': '+c.n;showToast(lab);
    try{if(c.k==='sfx')mwS(c.n);else if(typeof mwMusicPreview==='function')mwMusicPreview(c.n,5.5);}catch(err){mpFail('sampler '+c.n,err);}
    S.tm=setTimeout(step,c.k==='sfx'?1700:6200);};
  step();return S.list.length;}
{ const on=(id,f)=>{const b=$(id);if(b)b.onclick=f;};
  on('dbg_pgdoor',()=>{if(DIM!=='over'){showToast('Only in the overworld.');return;}mpDbgDone();mpStampDoor({here:1});});
  on('dbg_pgabandon',()=>{if(DIM!=='puppet'){showToast('You are not in purgatory.');return;}mpDbgDone();mpExit({abandon:true});});
  for(const n of [1,2,3])on('dbg_pgskip'+n,()=>{mpDbgDone();if(DIM!=='puppet'){if(DIM!=='over'||!mpEnterNow())return;}hnSkipTo(n);});
  on('dbg_pgsfx',()=>{mpDbgDone();mpSampler();});}
Object.assign(PGEX,{mpEnter,mpArrive,mpStrip,mpExit,mpWipe,mpOnDeath,mpSpawnPoints,mpPlaceTrunk,mpTrunkSpot,mpRemoveTrunk,mpNotable,
  mpResultsStats,mpSampler,mpDoorSiteOK,mpFindDoorSite,getDS:()=>mpDS,mpOverTick,mpGiveProgramme,mpUnbank});
