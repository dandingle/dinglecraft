/* ---- PART 55: p2_gear.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   PART 55 · p2_gear.js (P2): every gear verb (bible 5.2-5.3), the block physics read by hooks P2-15..17 (Swamp Felt, the soup
   and scum wade, Sneakers, Boa glide, Stuffing and Dough landings, armour perks), Det Cord (the flat cord mesher P2-18 and the
   spark conduction piCordSpark), Charges (the pgcharge prop, the Plunger), the Felt Fly (pgfly) and the pooled projectiles
   (fly, pie, staple, charge, boot), bespoke held models (P2-20 piGadgetMesh), the first-person felt mitt, raw food spraying out
   of the back of your head (P2-14), the soup slurp, the Eyeball Lamp pupil, Sneaker footprints, and the three souvenirs'
   overworld verbs. No THREE constructor, Math.random or clock at top level; every mesh is built lazily.
   --------------------------------------------------------------------------------------------------------------------- */
/* ---- the shared OG box rig: one unit-box geometry, one material per colour (per-instance only for emissive parts) ---- */
var piRigC=null;
function piRig(){if(piRigC)return piRigC;const geo=new THREE.BoxGeometry(1,1,1),M={};
  const mat=col=>M[col]||(M[col]=new THREE.MeshLambertMaterial({color:col}));
  piRigC={geo,mat,box(w,h,d,col,own){const m=new THREE.Mesh(geo,own?new THREE.MeshLambertMaterial({color:col}):mat(col));m.scale.set(w,h,d);return m;}};
  return piRigC;}
function piPart(g,w,h,d,col,x,y,z,own){const m=piRig().box(w,h,d,col,own);m.position.set(x,y,z);g.add(m);return m;}

/* ---- bespoke held models (hook P2-20: mkGadgetProc -> piGadgetMesh(gk,g,bm)). y-up models in a pivot leaning forward; the
   engine scales g (hand 0.55, third person 0.6, drops 0.5). Animated parts are exposed on g (g.pbend, g.pjaw, g.pglint). ---- */
function piGadgetMesh(gk,g,bm){const pv=new THREE.Group();pv.rotation.x=-0.75;pv.position.y=0.1;pv.piPivot=1;g.add(pv);
  const P_=(w,h,d,c,x,y,z,own)=>piPart(pv,w,h,d,c,x,y,z,own);const k=gk.slice(3);
  const handle=(c,len)=>P_(0.07,len||0.95,0.07,c||'#141214',0,0.2,0);
  const pick=(head,dk,hc,bend)=>{handle(hc);if(!bend){P_(0.78,0.12,0.12,head,0,0.66,0);P_(0.12,0.1,0.1,dk,-0.4,0.6,0);P_(0.12,0.1,0.1,dk,0.4,0.6,0);return;}
    P_(0.42,0.13,0.13,head,-0.16,0.66,0);const b=new THREE.Group();b.position.set(0.05,0.66,0);pv.add(b);
    const h1=piRig().box(0.42,0.12,0.12,head);h1.position.set(0.21,0,0);b.add(h1);const h2=piRig().box(0.1,0.1,0.1,dk);h2.position.set(0.42,-0.06,0);b.add(h2);
    b.rotation.z=-0.35;g.pbend=b;};
  const shears=(blade,hc)=>{P_(0.06,0.6,0.04,blade,-0.06,0.55,0).rotation.z=0.18;P_(0.06,0.6,0.04,blade,0.06,0.55,0).rotation.z=-0.18;
    P_(0.18,0.16,0.06,hc,-0.12,0.12,0);P_(0.18,0.16,0.06,hc,0.12,0.12,0);P_(0.06,0.06,0.08,'#5e6266',0,0.28,0);};
  const scoop=(head,hc)=>{handle(hc);P_(0.34,0.4,0.05,head,0,0.82,0.03);P_(0.34,0.05,0.12,head,0,0.62,0.06);};
  if(k==='floppy')pick('#4ca82b','#2e7a18','#141214',true);
  else if(k==='larppick'){pick('#d8b649','#a8862a','#141214');P_(0.14,0.15,0.15,'#9aa0a6',0,0.66,0);}
  else if(k==='hpick'){handle();P_(0.7,0.04,0.04,'#a8acb2',0,0.66,0);P_(0.04,0.14,0.04,'#a8acb2',-0.35,0.6,0);P_(0.04,0.14,0.04,'#a8acb2',0.35,0.6,0);P_(0.04,0.1,0.04,'#c8ccd4',0,0.74,0);}
  else if(k==='disco'){pick('#f2d24a','#d886a6','#d8b07a');for(let i=0;i<5;i++)P_(0.05,0.05,0.05,i%2?'#ffffff':'#ffb8e0',-0.32+i*0.16,0.74,0.07);}
  else if(k==='pshears')shears('#c8ccd4','#e8822b');
  else if(k==='clippers')shears('#d8b649','#9aa0a6');
  else if(k==='snips')shears('#a8acb2','#d81a1a');
  else if(k==='rsnips'){shears('#e8ecf8','#f27ab0');P_(0.05,0.05,0.05,'#ffffff',0,0.6,0.04);}
  else if(k==='fscoop')scoop('#4ca82b','#141214');
  else if(k==='larpspade')scoop('#d8b649','#141214');
  else if(k==='hscoop')scoop('#a8acb2','#141214');
  else if(k==='gscoop'){scoop('#f27ab0','#d8b07a');P_(0.05,0.05,0.05,'#ffe86a',0.1,0.85,0.07);P_(0.05,0.05,0.05,'#ffffff',-0.08,0.75,0.07);}
  else if(k==='slapper'){handle('#141214',0.6);P_(0.22,0.4,0.22,'#e8e8ee',0,0.68,0);P_(0.23,0.05,0.23,'#d81a1a',0,0.58,0);P_(0.23,0.05,0.23,'#d81a1a',0,0.72,0);
    P_(0.06,0.06,0.04,'#111111',-0.06,0.8,0.12);P_(0.06,0.06,0.04,'#111111',0.06,0.8,0.12);
    const j=new THREE.Group();j.position.set(0,0.52,0.1);pv.add(j);const jb=piRig().box(0.22,0.06,0.16,'#c41a3a');jb.position.set(0,-0.03,0.04);j.add(jb);g.pjaw=j;}
  else if(k==='bat'){P_(0.08,0.3,0.08,'#9aa0a6',0,0.0,0);for(let i=0;i<5;i++)P_(0.1+i*0.025,0.16,0.1+i*0.025,'#d8b649',0,0.22+i*0.15,0);}
  else if(k==='rapier'){P_(0.07,0.28,0.07,'#141214',0,0.0,0);P_(0.04,0.95,0.03,'#c8ccd4',0,0.62,0);P_(0.3,0.04,0.04,'#8e9296',0,0.16,0);P_(0.04,0.12,0.04,'#8e9296',-0.15,0.22,0);
    P_(0.04,0.04,0.04,'#8e9296',-0.12,0.28,0);}
  else if(k==='stiletto'){handle('#d8b07a',0.7);P_(0.16,0.12,0.42,'#b01a6a',0,0.68,0.08);P_(0.17,0.04,0.12,'#d83a8a',0,0.75,0.24);P_(0.03,0.3,0.03,'#111111',0,0.52,-0.1);}
  else if(k==='gauntlet'){P_(0.3,0.28,0.18,'#e8b9a0',0,0.3,0);for(let i=0;i<4;i++){P_(0.06,0.22,0.07,'#e8b9a0',-0.11+i*0.075,0.54,0);P_(0.06,0.04,0.075,'#4a3424',-0.11+i*0.075,0.66,0);}
    P_(0.07,0.16,0.07,'#e8b9a0',0.18,0.32,0);P_(0.32,0.08,0.2,'#141214',0,0.12,0);for(let i=0;i<5;i++)P_(0.04,0.04,0.04,'#f4f0f8',-0.12+i*0.06,0.12,0.11);}
  else if(k==='chopglove'){P_(0.22,0.3,0.14,'#a8322a',0,0.5,0);P_(0.16,0.5,0.12,'#c8564a',0,0.12,0);g.pglint=P_(0.07,0.07,0.07,'#ffffff',0.08,0.6,0.08,true);g.pglint.visible=false;}
  else if(k==='mitt'){P_(0.32,0.38,0.16,'#f2a6c1',0,0.45,0);P_(0.1,0.18,0.12,'#f2a6c1',0.2,0.42,0);P_(0.34,0.1,0.18,'#d886a6',0,0.22,0);
    for(let i=0;i<6;i++)P_(0.04,0.04,0.02,i%2?'#ffe86a':'#ffffff',-0.12+(i%3)*0.12,0.38+((i/3)|0)*0.14,0.09);}
  else if(k==='vmirror'){handle('#f27ab0',0.45);P_(0.42,0.46,0.05,'#ffd36a',0,0.68,0);P_(0.34,0.38,0.06,'#c8d4e4',0,0.68,0.01);
    for(const [x,y] of [[-0.2,0.9],[0,0.92],[0.2,0.9],[-0.22,0.68],[0.22,0.68],[-0.2,0.46],[0.2,0.46]])P_(0.05,0.05,0.07,'#fff6b0',x,y,0);}
  else if(k==='fly'){P_(0.16,0.12,0.2,'#2e7a18',0,0.4,0);P_(0.18,0.02,0.12,'#dcefff',-0.14,0.47,0);P_(0.18,0.02,0.12,'#dcefff',0.14,0.47,0);
    P_(0.06,0.06,0.04,'#f4f4f0',-0.05,0.44,0.11);P_(0.06,0.06,0.04,'#f4f4f0',0.05,0.44,0.11);}
  else if(k==='pie'){P_(0.36,0.06,0.36,'#b8bec6',0,0.3,0);P_(0.32,0.06,0.32,'#d8a858',0,0.35,0);P_(0.28,0.1,0.28,'#fff8d8',0,0.42,0);P_(0.1,0.06,0.1,'#ffffff',0,0.5,0);}
  else if(k==='charge'){P_(0.26,0.2,0.16,'#c41a1a',0,0.35,0);P_(0.27,0.06,0.17,'#4ca82b',0,0.32,0);P_(0.06,0.06,0.03,'#f4f4f0',-0.06,0.4,0.09);
    P_(0.03,0.12,0.03,'#b81818',0.06,0.5,0);P_(0.05,0.05,0.05,'#ff3a1a',0.06,0.57,0);}
  else if(k==='plunger'||k==='svplunger'){const t=k==='svplunger'?'#c9a43a':'#8a5a32';P_(0.36,0.24,0.26,'#6a4424',0,0.25,0);P_(0.37,0.04,0.27,t,0,0.38,0);
    P_(0.05,0.36,0.05,'#8e9296',0,0.55,0);P_(0.3,0.06,0.06,'#141214',0,0.74,0);P_(0.12,0.04,0.02,'#c41a1a',0,0.25,0.14);}
  else if(k==='stapler'){P_(0.12,0.16,0.5,'#5e6a7a',0,0.5,0);P_(0.12,0.04,0.52,'#8a96a6',0,0.6,0);P_(0.1,0.3,0.12,'#2a2e34',0,0.3,0.1);P_(0.11,0.08,0.2,'#d81a1a',0,0.38,-0.08);}
  else if(k==='fuse'){for(let i=0;i<6;i++)P_(0.05,0.05,0.18,'#3a2a1a',Math.sin(i)*0.1,0.25+i*0.08,Math.cos(i)*0.06);P_(0.05,0.05,0.05,'#ff7a1a',0,0.74,0);}
  else if(k==='boa'){for(let i=0;i<9;i++)P_(0.11,0.11,0.11,i%2?'#f27ab0':'#ffb8d8',Math.sin(i*0.9)*0.12,0.1+i*0.08,Math.cos(i*0.9)*0.05);}
  else if(k==='pearls'){for(let i=0;i<10;i++){const a=i/10*6.28;P_(0.06,0.06,0.06,'#f4f0f8',Math.cos(a)*0.18,0.45+Math.sin(a)*0.18,0);}}
  else if(k==='svglove'){P_(0.22,0.3,0.14,'#7a5232',0,0.5,0);P_(0.16,0.5,0.12,'#9a6e48',0,0.12,0);P_(0.17,0.05,0.13,'#c8a878',0,-0.1,0);}
  else if(k==='svfrog'){P_(0.36,0.3,0.32,'#5a9a3a',0,0.3,0);P_(0.12,0.12,0.06,'#f4f4f0',-0.09,0.5,0.14);P_(0.12,0.12,0.06,'#f4f4f0',0.09,0.5,0.14);
    P_(0.05,0.05,0.07,'#111111',-0.09,0.5,0.17);P_(0.05,0.05,0.07,'#111111',0.09,0.5,0.17);
    const j=new THREE.Group();j.position.set(0,0.2,0.05);pv.add(j);const jb=piRig().box(0.34,0.06,0.3,'#3e7a2a');jb.position.set(0,-0.03,0.05);j.add(jb);g.pjaw=j;}
  else P_(0.3,0.3,0.3,'#8f8f96',0,0.3,0);}

/* ---- the first-person felt mitt (bible 15.5): Dan's empty hand inside purgatory, burlap like Felt Dan, OG only (Hyperreal swaps its own fist) ---- */
function piMittMesh(){if(piS.mitt)return piS.mitt;const g=new THREE.Group();
  piPart(g,0.17,0.15,0.24,'#a87e52',0,0,0);for(let i=0;i<3;i++)piPart(g,0.03,0.14,0.02,'#7a5a36',-0.04+i*0.04,0,-0.12);
  piPart(g,0.06,0.07,0.12,'#a87e52',-0.11,0.02,-0.02);piPart(g,0.18,0.05,0.25,'#f2f6ee',0,-0.08,0.02);
  g.position.set(0.02,-0.06,0.02);g.rotation.set(0.2,-0.5,0.1);piS.mitt=g;return g;}
function piMittShow(on){if(typeof handG==='undefined'||!handG)return;const m=on?piMittMesh():piS.mitt;if(!m)return;
  const has=handG.children&&handG.children.indexOf(m)>=0;if(on&&!has)handG.add(m);else if(!on&&has)handG.remove(m);piS.mittOn=!!on;}

/* ---- physics read by the hooks (P2-15..17) ---- */
function piFullSet(m){for(let s=0;s<4;s++){const a=P.armor[s];if(!a||!DEFS[a.id]||!DEFS[a.id].armor||DEFS[a.id].armor.m!==m)return false;}return true;}
function piWearing(id){return !!(P&&P.armor.some(a=>a&&a.id===id));}
function piSpeed(spd){const x=Math.floor(P.x),z=Math.floor(P.z),y=Math.floor(P.y);
  const below=DEFS[getBlock(x,y-1,z)]||{},feet=DEFS[getBlock(x,y,z)]||{},knee=DEFS[getBlock(x,Math.floor(P.y+0.6),z)]||{};
  if(below.pslow)spd*=below.pslow;                                       /* Swamp Felt -15% */
  const lq=feet.pliquid||knee.pliquid;if(lq){spd*=lq;P.sprint=false;}  /* Mystery Soup x0.45, Pond Scum x0.5 (wading, not swimming) */
  if(piWearing(IT.PG_SNEAKERS))spd*=1.15;
  if(piS.raise)spd*=0.5;                                                 /* a raised mitt or mirror is a slow walk */
  return spd;}
function piDoughVy(bx,by,bz){let top=-1;
  if(typeof mwDoughTarget==='function'){let t=null;try{t=mwDoughTarget(bx,bz);}catch(e){}if(t!=null&&t>by)top=t;}   /* P1 knows the mound's mesa */
  if(top<0)for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){if(Math.abs(dx)+Math.abs(dz)>4)continue;const ch=chunkAt(bx+dx,bz+dz);if(!ch)continue;
    for(let y=Math.min(WH-2,by+16);y>by;y--){const id=getBlock(bx+dx,y,bz+dz);if(id===B.PG_COUNTER){if(y>top)top=y;break;}if(id&&DEFS[id]&&DEFS[id].solid!==false&&id!==B.PG_DOUGH)break;}}
  if(top<0)return 20;const H=top+1+2-P.y;return H>0.5?Math.min(32,Math.sqrt(2*GRAV*H)):20;}
function piVertical(dt){const x=Math.floor(P.x),z=Math.floor(P.z),under=getBlock(x,Math.floor(P.y)-1,z);
  if(under===B.PG_DOUGH&&P.onGround&&KEY.Space&&!P.sneak&&P.vy>5){P.vy=piDoughVy(x,Math.floor(P.y)-1,z);piS.dough=MP.clock+3;mwS('pg_boing',P.x,P.y,P.z);}
  if(!P.onGround&&P.vy<0&&KEY.Space&&piHas(P.inv,IT.PG_BOA)>0){                               /* Diva's Boa: glide */
    P.vy=Math.max(P.vy,-3);const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),k=Math.min(1,dt*3);P.vx+=(fx*6-P.vx)*k;P.vz+=(fz*6-P.vz)*k;P.fallD=0;
    if(frameCount%8===0)burstParticles(P.x,P.y+1.0,P.z,B.PG_FLEECE,1,0.3);}
  if(!P.onGround&&P.fallD>=8&&!piS.slide){piS.slide=true;mwS('pg_slide',P.x,P.y,P.z);}}       /* a long fall gets the slide whistle */
function piLand(dmg){const bx=Math.floor(P.x),by=Math.floor(P.y)-1,bz=Math.floor(P.z),d=DEFS[getBlock(bx,by,bz)]||{};let out=dmg;
  if(d.psoft)out=0;                                                       /* Stuffing Drift: no fall damage */
  if(d.pbounce&&!P.sneak&&P.fallD>0.5){P.vy=piDoughVy(bx,by,bz);P.onGround=false;out=0;piS.dough=MP.clock+3;mwS('pg_boing',P.x,P.y,P.z);}
  if(out>0&&piFullSet(4))out=Math.floor(out*0.5);                         /* Foam Padding set: fall -50% */
  if(out>0&&piS.launched&&piWearing(IT.PG_STUNT))out=Math.floor(out*0.5);  /* Stunt Helmet: landing after a launch -50% */
  piS.launched=false;piS.slide=false;return out;}
/* armour perks on damage taken inside (Foam Padding set -25% blast, Fright Wig -40% blast, Sequin Gown set: 20% of projectiles
   deflect). The engine's damagePlayer is wrapped the way PARTs 9-40 wrap playS; the overworld path is a pure pass-through. */
const piDmg0=damagePlayer;
damagePlayer=function(n,kx,kz){if(DIM==='puppet'&&P&&n>0){n=piDmgPerks(n);if(n<0)return;}return piDmg0(n,kx,kz);};
const PI_BLAST=/^pg:(blast|boom|bomb|charge|seat|plate|bigone|demo-blast|bundle)/,PI_PROJ=/^pg:(proj|pig|toss|tomato|fish|staple|throw|thrown|pie|fly|boot|bolt|hog|link|cleaver|safe|piano)/;
function piDmgPerks(n){const L=LASTDMG;if(!L||L===piS.dmgSeen)return n;piS.dmgSeen=L;const how=L.how||'';
  if(P.mode==='c'||P.hurtT>0||P.dead)return n;
  if(PI_BLAST.test(how)){if(piFullSet(4))n*=0.75;if(piWearing(IT.PG_WIG))n*=0.6;}
  else if(PI_PROJ.test(how)&&piFullSet(5)&&Math.random()<0.2){piS.stats.deflect++;burstParticles(P.x,P.y+1.2,P.z,B.PG_SEQORE,6,0.6);return -1;}
  return n;}

/* ---- food (bible 8): Stuffing eats at half speed, the Rubber Chicken squeaks, Heckle Tomatoes are counted; raw food sprays
   out of the back of your head (P2-14, cosmetic: the effective value is already in DEFS.food) ---- */
function piFoodUse(st,hit,dt,rEdge){if(st.id===IT.PG_PIE)return piUsePie(st,hit,dt,rEdge);
  const d=DEFS[st.id];if(!(d&&d.food&&P.hunger<20&&P.mode==='s'))return false;
  if(st.id===IT.PG_STUFF)P.eatT=Math.max(0,P.eatT-dt*0.5);
  if(st.id===IT.PG_RCHICK&&frameCount%9===0)mwS('pg_squeak',P.x,P.y+1.5,P.z);
  if(st.id===IT.PG_TOMATO&&P.eatT+dt>=1.6)MP.stats.tomatoes=(MP.stats.tomatoes|0)+1;
  return false;}
function piRawSpray(d,ent){const e=ent||P;if(!e)return;const yaw=e===P?P.yaw:(e.yaw||0),bx=Math.sin(yaw),bz=Math.cos(yaw),hy=e===P?P.eyeY+0.05:(e.h||1.6)*0.9;
  const id=d&&(d===DEFS[IT.PG_HAM]||d.name==='Ham Hock')?B.PG_FLEECE:(d&&d===DEFS[IT.PG_FISH]?B.PG_SCUM:B.PG_DOUGH);
  const n0=entities.length;burstParticles(e.x+bx*0.3,e.y+hy,e.z+bz*0.3,id,9,0.4);
  for(let i=n0;i<entities.length;i++){const p=entities[i];if(p.t!=='part')continue;p.vx=bx*(3+Math.random()*2.5)+(Math.random()-0.5);p.vz=bz*(3+Math.random()*2.5)+(Math.random()-0.5);p.vy=1+Math.random()*2.5;}
  piS.stats.sprays++;}
function piSlurp(hit){if(P.useT>0||P.dead)return;P.useT=0.7;P.swing=1;playS('eat');
  if(P.mode==='s'){P.hunger=Math.min(20,P.hunger+3);drawStats();}
  if(P.hp>1)purgHit(P,1,'Mystery Soup','soup',{force:1});                 /* it is hot */
  burstParticles(hit.x+0.5,hit.y+0.9,hit.z+0.5,B.PG_SOUP,5,0.4);piS.stats.slurps++;
  if(Math.random()<0.1){const L=lookDir(),E=eyePos();                      /* a small Homing Herring jumps out at your face */
    if(P.hp>1){P.hurtT=0;purgHit(P,1,'a Homing Herring','fish',{force:1});}
    mpDrop(E[0]+L[0]*0.6,E[1],E[2]+L[2]*0.6,{id:IT.PG_FISH,count:1},'Dan',-L[0]*1.5,1.5,-L[2]*1.5);showToast('Something in the soup jumped out at you.');}}

/* ---- thrown things (pooled projectiles registered in PREG.proj; puSpawn/puUpdate are P0's) ---- */
var piPools={};
function piPoolGet(kind,build){const L=piPools[kind]||(piPools[kind]=[]);const m=L.pop()||build();if(m.visible===false)m.visible=true;return m;}
function piPoolFree(kind){return m=>{(piPools[kind]||(piPools[kind]=[])).push(m);};}
function piThrowFrom(){const E=eyePos(),L=lookDir();return {E,L,x:E[0]+L[0]*0.6,y:E[1]+L[1]*0.6-0.15,z:E[2]+L[2]*0.6};}
PREG.proj.fly={r:0.3,g:1,life:6,mesh:()=>piPoolGet('fly',()=>{const g=new THREE.Group();piGadgetMesh('pg_fly',g,null);g.scale.set(0.6,0.6,0.6);return g;}),free:piPoolFree('fly'),
  hit:()=>false,land:(e,bx,by,bz)=>{const y=e.vy<0?by+1:e.y;piFlySpawn(e.x,y,e.z,e.owner||'Dan');return true;}};
PREG.proj.pie={r:0.45,g:1,life:5,mesh:()=>piPoolGet('pie',()=>{const g=new THREE.Group();piGadgetMesh('pg_pie',g,null);g.scale.set(0.7,0.7,0.7);return g;}),free:piPoolFree('pie'),
  hit:(e,t)=>{if(t&&t.t==='mob'&&MOBT[t.mt]&&MOBT[t.mt].prop&&!t.relay)return false;piPieSplat(e,t);return true;},land:(e)=>{burstParticles(e.x,e.y,e.z,B.PG_STUFFING,8,0.6);return true;}};
PREG.proj.staple={r:0.35,g:0.12,life:2,mesh:()=>piPoolGet('staple',()=>piRig().box(0.12,0.04,0.04,'#c8ccd4')),free:piPoolFree('staple'),
  hit:(e,t)=>{purgHit(t,2,e.owner||'Dan','staple',{src:{x:e.x-e.vx,z:e.z-e.vz}});if(t!==P&&!t.bot)t.ppin=2;burstParticles(e.x,e.y,e.z,B.PG_PINS,2,0.3);return true;},
  land:()=>true};
PREG.proj.charge={r:0.4,g:1,life:6,mesh:()=>piPoolGet('chg',()=>{const g=new THREE.Group();piGadgetMesh('pg_charge',g,null);return g;}),free:piPoolFree('chg'),
  hit:(e,t)=>{if(t&&t.t==='mob'&&MOBT[t.mt]&&MOBT[t.mt].prop)return false;piChargeArm(t,e.chargeOwner||e.owner||'Dan',{force:1});return true;},
  land:(e,bx,by,bz)=>{const n=piFaceFromVel(e,bx,by,bz);piChargeArm({x:bx,y:by,z:bz,nx:n[0],ny:n[1],nz:n[2]},e.chargeOwner||e.owner||'Dan',{force:1});return true;}};
PREG.proj.boot={r:0.45,g:0.4,life:2,mesh:()=>piPoolGet('boot',()=>{const g=new THREE.Group();piPart(g,0.22,0.18,0.36,'#5a3a1e',0,0,0);piPart(g,0.24,0.05,0.38,'#2a1a10',0,-0.1,0);return g;}),
  free:piPoolFree('boot'),hit:(e,t)=>{if(e.tgt&&t!==e.tgt&&!(e.tgt.bot&&t===e.tgt))return false;const l=Math.hypot(e.vx,e.vz)||1;
    purgHit(t,0,'the Bin','boot',{force:1,kx:e.vx/l,kz:e.vz/l});mwS('pg_boot',e.x,e.y,e.z);return true;},land:()=>true};
function piFaceFromVel(e,bx,by,bz){const cx=bx+0.5,cy=by+0.5,cz=bz+0.5,dx=e.x-cx,dy=e.y-cy,dz=e.z-cz,ax=Math.abs(dx),ay=Math.abs(dy),az=Math.abs(dz);
  if(ay>=ax&&ay>=az)return [0,dy>0?1:-1,0];if(ax>=az)return [dx>0?1:-1,0,0];return [0,0,dz>0?1:-1];}
/* a pie hit: the target is blinded for 4 s (e.pblind / a.pblind: brains read it) */
function piPieSplat(e,t){burstParticles(e.x,e.y,e.z,B.PG_STUFFING,10,0.7);mwS('pg_splat',e.x,e.y,e.z);
  if(t===P){P.pblind=MP.clock+4;return;}if(t.bot&&t.A){t.A.pblind=MP.clock+4;t.pblind=MP.clock+4;return;}t.pblind=MP.clock+4;}

/* ---- the Felt Fly (bible 5.3): thrown 12 m, it buzzes where it lands for 20 s (pgfly prop; the Frog's tongue prefers it) ---- */
MOBT.pgfly={hp:999,hw:0.2,h:0.2,spd:0,body:'#2e7a18',legc:'#dcefff',pmob:1,prop:1,pnc:1};
PREG.mesh.pgfly=function piFlyMesh(G,mats){const g=new THREE.Group();piGadgetMesh('pg_fly',g,null);g.scale.set(0.8,0.8,0.8);G.add(g);G.pfly=g;return {G,legs:[],mats};};
PREG.brain.pgfly=function piFlyBrain(e,dt){if(puBatMove(e,dt))return;e.life=(e.life==null?20:e.life)-dt;if(e.life<=0){removeEnt(e);return;}
  if(e.hy==null)e.hy=e.y+0.6;e.t0=(e.t0||0)+dt;e.y=e.hy+Math.sin(e.t0*7)*0.12;e.x+=Math.sin(e.t0*3.1)*0.01;e.vx=e.vy=e.vz=0;
  if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.t0*2;const f=e.mesh.pfly;if(f)f.rotation.z=Math.sin(e.t0*40)*0.15;}};
function piFlySpawn(x,y,z,owner){if(DIM!=='puppet')return null;spawnMob('pgfly',x,y,z);const e=entities[entities.length-1];e.owner=owner;e.life=20;e.hy=y+0.6;e.pkeep=1;return e;}
function piUseFly(st,hit,dt,rEdge){if(!rEdge||P.useT>0)return true;const T=piThrowFrom();
  puSpawn('fly',T.x,T.y,T.z,T.L[0]*10,T.L[1]*10+3.2,T.L[2]*10,'Dan',{src:null});
  if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}P.useT=0.3;P.swing=1;return true;}
function piUsePie(st,hit,dt,rEdge){if(P.sneak)return false;                 /* sneak + right-click eats it (the food branch) */
  if(rEdge&&P.useT<=0){const T=piThrowFrom();puSpawn('pie',T.x,T.y,T.z,T.L[0]*14,T.L[1]*14+3,T.L[2]*14,'Dan',{src:null});
    if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}P.useT=0.4;P.swing=1;mwS('pg_whoosh',P.x,P.y+1.5,P.z);}
  return true;}
function piUseLiveChicken(st,hit,dt,rEdge){if(!rEdge||P.useT>0)return true;const T=piThrowFrom();
  if(MOBT.pghen){spawnMob('pghen',T.x,T.y,T.z);const e=entities[entities.length-1];e.vx=T.L[0]*11;e.vy=T.L[1]*11+4;e.vz=T.L[2]*11;
    e.pthrown={by:'Dan',t:MP.clock};e.plive=1;}
  else mpDrop(T.x,T.y,T.z,{id:IT.PG_LIVECHICK,count:1},'Dan',T.L[0]*9,T.L[1]*9+3,T.L[2]*9);
  P.inv[P.sel]=null;redrawHotbar();P.useT=0.4;P.swing=1;mwS('pg_honk',P.x,P.y+1.5,P.z);return true;}

/* ---- Charges (bible 5.3): stick to a block face or a creature (12 armed per player), beep, blow on the Plunger or a spark ---- */
MOBT.pgcharge={hp:999,hw:0.2,h:0.3,spd:0,body:'#c41a1a',legc:'#4ca82b',pmob:1,prop:1,pnc:1};
PREG.mesh.pgcharge=function piChargeMesh(G,mats){const g=new THREE.Group();piGadgetMesh('pg_charge',g,null);g.children[0].rotation.x=0;g.children[0].position.y=-0.25;G.add(g);
  const bulb=new THREE.MeshLambertMaterial({color:'#ff3a1a'});const bm=new THREE.Mesh(piRig().geo,bulb);bm.scale.set(0.08,0.08,0.08);bm.position.set(0.06,0.36,0);G.add(bm);
  G.pbulb=bulb;return {G,legs:[],mats};};
function piChargesOf(owner){let n=0;for(const e of entities)if(!e.dead&&e.mt==='pgcharge'&&e.owner===owner)n++;return n;}
function piChargeArm(target,owner,opt){opt=opt||{};owner=owner||'Dan';if(!target||DIM!=='puppet')return null;
  if(piChargesOf(owner)>=12&&!opt.force)return null;
  let x,y,z,stuck;
  if(typeof target.nx==='number'&&target.mt===undefined&&target!==P&&!target.bot){x=target.x+0.5+target.nx*0.58;y=target.y+0.42+target.ny*0.62;z=target.z+0.5+target.nz*0.58;
    stuck={kind:'blk',x:target.x,y:target.y,z:target.z,nx:target.nx,ny:target.ny,nz:target.nz};}
  else if(target===P){x=P.x;y=P.y+1.1;z=P.z;stuck={kind:'ent',ent:P,ox:0,oy:1.1,oz:0,t:0};}
  else if(target.x!==undefined){const h=target.h||1;x=target.x;y=target.y+h*0.6;z=target.z;stuck={kind:'ent',ent:target,ox:0,oy:h*0.6,oz:0,t:0};}
  else return null;
  spawnMob('pgcharge',x,y,z);const e=entities[entities.length-1];e.owner=owner;e.armed=1;e.stuck=stuck;e.pkeep=1;e.yaw=0;e.beep=0;piChargeSync(e);
  if(e.mesh&&e.mesh.pbulb){e.pmats=[e.mesh.pbulb];e.pdisp=1;}
  mwS('pg_squeak',x,y,z);return e;}
function piChargeSync(e){const s=e.stuck;e.stuckTo=s&&s.kind==='ent'?s.ent:null;e.blk=!!(s&&s.kind==='blk');}
PREG.brain.pgcharge=function piChargeBrain(e,dt){piChargeSync(e);
  if(e.pbat){if(puBatMove(e,dt)){e.stuck=null;e.loose=1;return;}e.loose=1;e.stuck=null;}
  const s=e.stuck;
  if(s&&s.kind==='ent'){const t=s.ent;if(!t||t.dead||(t===P&&(P.dead||DIM!=='puppet'))){e.stuck=null;e.loose=1;}
    else{e.x=t.x+s.ox;e.y=t.y+s.oy;e.z=t.z+s.oz;if(t===P){s.t+=dt;if(s.t>8){e.stuck=null;e.loose=1;e.vx=0;e.vy=1;e.vz=0;}}}}
  else if(s&&s.kind==='blk'){const id=getBlock(s.x,s.y,s.z);if(!id||!DEFS[id]||DEFS[id].solid===false){e.stuck=null;e.loose=1;}}
  else if(!s)e.loose=1;
  if(e.loose){e.vy=(e.vy||0)-GRAV*dt;const ny=e.y+e.vy*dt,nx=e.x+(e.vx||0)*dt,nz=e.z+(e.vz||0)*dt,bid=getBlock(Math.floor(nx),Math.floor(ny-0.05),Math.floor(nz));
    if(bid&&DEFS[bid]&&DEFS[bid].solid!==false){e.loose=0;e.vx=e.vy=e.vz=0;const by=Math.floor(ny-0.05);e.y=by+1.02;
      e.stuck={kind:'blk',x:Math.floor(nx),y:by,z:Math.floor(nz),nx:0,ny:1,nz:0};}
    else{e.x=nx;e.y=ny;e.z=nz;if(e.y<-20){removeEnt(e);return;}}}
  e.beep+=dt;const on=((e.beep*(e.pfuse>0?10:1.2))|0)%2===0;if(e.mesh&&e.mesh.pbulb&&e.mesh.pbulb.emissive)e.mesh.pbulb.emissive.setRGB(on?1:0.1,on?0.2:0,0);
  if(e.pfuse>0){e.pfuse-=dt;if(frameCount%2===0)burstParticles(e.x,e.y+0.3,e.z,B.TORCH,2,0.4);if(e.pfuse<=0){piChargeBlow(e,e.pcap);return;}}
  if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);};
/* a Charge blows: player Charges break pblast blocks within r 2 outside protected volumes (through P0's pBlast, so drops and the
   break event follow the contract) and deal 10 falloff in r 2.5. cap (the Plunger in a live arena) is shared by one click: a
   headliner and its relay props take at most cap.left in total. */
function piChargeBlow(e,cap){if(!e||e.dead)return;const x=e.x,y=e.y+0.15,z=e.z,who=e.owner||'Dan';removeEnt(e);
  pBlast(x,y,z,0.01,0,who,{charge:1,br:2,how:'charge'});
  const r=2.5,dmg=10;
  const hit=(t,tx,ty,tz,cappable)=>{const d=Math.hypot(tx-x,ty-y,tz-z);if(d>=r)return;let amt=Math.max(1,Math.round(dmg*(1-d/r)));
    if(cappable&&cap){amt=Math.min(amt,cap.left);if(amt<=0)return;cap.left-=amt;}
    purgHit(t,amt,who,'charge',{force:1,kx:tx-x,kz:tz-z});if(t===P)P.vy=Math.max(P.vy,5*(1-d/r));};
  if(P&&!P.dead)hit(P,P.x,P.y+0.9,P.z,false);
  for(const m of entities){if(m.dead||m.t!=='mob'||m===e)continue;if(m.bot&&(!m.A||m.A.dim!==DIM))continue;const T=MOBT[m.mt]||{};
    if(T.prop&&!m.relay)continue;hit(m,m.x,m.y+(m.h||1)*0.5,m.z,!!(T.pboss||m.relay));}
  burstParticles(x,y,z,B.TNT,14,0.9);if(P){const dp=Math.hypot(P.x-x,P.y-y,P.z-z);if(dp<9)mpShake(Math.min(0.9,0.5*(1-dp/9)+0.1),0.4);}}
function piUseCharge(st,hit,dt,rEdge){if(!rEdge||P.useT>0)return true;P.useT=0.25;
  const E=eyePos(),L=lookDir(),am=pickMob(E[0],E[1],E[2],L[0],L[1],L[2],3.4);let c=null;
  if(am&&(!hit||am.t<hit.t)&&!(MOBT[am.e.mt]&&MOBT[am.e.mt].prop))c=piChargeArm(am.e,'Dan');
  else if(hit)c=piChargeArm({x:hit.x,y:hit.y,z:hit.z,nx:hit.nx,ny:hit.ny,nz:hit.nz},'Dan');
  else return true;
  if(!c){showToast(piChargesOf('Dan')>=12?'Twelve armed Charges is plenty.':'It will not stick there.');return true;}
  if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}P.swing=1;return true;}
/* The Plunger: every Charge you own within 24 m sparks 0.5 s and blows. In a live headliner arena: 8 s cooldown, at most 25 damage
   to the headliner (and its relays) per click. */
function piUsePlunger(st,hit,dt,rEdge){if(!rEdge||P.useT>0)return true;P.useT=0.35;P.swing=1;
  const hs=typeof hnState==='function'?hnState():null,live=!!(hs&&hs.live&&mpInArena(null,Math.floor(P.x),Math.floor(P.y),Math.floor(P.z)));
  if(live&&piS.plungeCD>MP.clock){showToast('The Plunger is still springing back up.');return true;}
  mwS('pg_plunger',P.x,P.y+1,P.z);const cap=live?{left:25}:null;if(live)piS.plungeCD=MP.clock+8;let n=0;
  for(const e of entities)if(!e.dead&&e.mt==='pgcharge'&&e.owner==='Dan'&&e.armed&&Math.hypot(e.x-P.x,e.y-P.y,e.z-P.z)<=24&&!(e.pfuse>0)){e.pfuse=0.5;e.pcap=cap;n++;}
  if(!n)showToast('Nothing of yours is wired to it.');return true;}

/* ---- Det Cord: the flat cord mesher (hook P2-18; vertex colour .93, never a face shade) ---- */
function piCordMesh(b,x,y,z,gb,d){const U=tileUV(d._t.top),u0=U[0],v0=U[1],u1=U[2],v1=U[3],isC=id=>id===B.PG_CORD;
  let xA=false,zA=false;const ups=[];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(const dy of [0,-1,1])if(isC(gb(x+dx,y+dy,z+dz))){if(dx)xA=true;else zA=true;if(dy===1)ups.push([dx,dz]);break;}
  const C=.93,quad=(pts,uvs,n)=>{const s=b.vc;for(let i=0;i<4;i++){b.p.push(pts[i][0],pts[i][1],pts[i][2]);b.n.push(n[0],n[1],n[2]);b.u.push(uvs[i][0],uvs[i][1]);b.c.push(C,C,C);}
    b.ix.push(s,s+1,s+2,s,s+2,s+3);b.vc+=4;};
  let off=0;
  if(xA||!zA){const yy=y+0.03;quad([[x,yy,z],[x+1,yy,z],[x+1,yy,z+1],[x,yy,z+1]],[[u0,v0],[u0,v1],[u1,v1],[u1,v0]],[0,1,0]);off=0.006;}
  if(zA){const yy=y+0.03+off;quad([[x,yy,z],[x+1,yy,z],[x+1,yy,z+1],[x,yy,z+1]],[[u0,v0],[u1,v0],[u1,v1],[u0,v1]],[0,1,0]);}
  for(const [dx,dz] of ups){                                              /* the cord climbs the riser face to the next cell up */
    if(dx){const X=x+(dx>0?0.97:0.03);quad([[X,y,z],[X,y,z+1],[X,y+1.03,z+1],[X,y+1.03,z]],[[u0,v0],[u1,v0],[u1,v1],[u0,v1]],[-dx,0,0]);}
    else{const Z=z+(dz>0?0.97:0.03);quad([[x,y,Z],[x+1,y,Z],[x+1,y+1.03,Z],[x,y+1.03,Z]],[[u0,v0],[u1,v0],[u1,v1],[u0,v1]],[0,0,-dz]);}}}
/* ---- Det Cord conduction (bible 4, the build rule): a BFS over cord cells at `speed` blocks/s (12: plunges and the Demolitionist's Fuse; 3:
   the Big One). Cells link as horizontal 4-neighbours at the same y or one higher/lower. A reached cell feeds a Charge Plate
   directly below it or horizontally adjacent one lower (onPlate(px,py,pz,handle), once per plate), and blows any Charge stuck on it
   or on a face beside it. A one-cell gap stops it. Returns a handle {reached:Set, front, done, stopped, plates, cells, onEnd, cancel()}. ---- */
var piSparks=[];
function piCordSpark(x,y,z,speed,owner,onPlate){if(getBlock(x,y,z)!==B.PG_CORD)return null;
  const h={x,y,z,speed:speed||12,owner:owner||null,onPlate:typeof onPlate==='function'?onPlate:null,reached:new Set([x+','+y+','+z]),front:[[x,y,z]],acc:0,
    done:false,stopped:false,plates:new Set(),cells:1,onEnd:null,t:0,cancel(){this.done=true;this.stopped=true;}};
  piSparks.push(h);piSparkVisit(h,x,y,z);mwS('pg_spark',x+0.5,y+0.3,z+0.5);return h;}
function piSparkVisit(h,x,y,z){
  for(const [dx,dy,dz] of [[0,-1,0],[1,-1,0],[-1,-1,0],[0,-1,1],[0,-1,-1]]){const px=x+dx,py=y+dy,pz=z+dz;
    if(getBlock(px,py,pz)===B.PG_PLATE){const k=px+','+py+','+pz;if(!h.plates.has(k)){h.plates.add(k);if(h.onPlate)try{h.onPlate(px,py,pz,h);}catch(e){mpFail('onPlate',e);}}}}
  for(const e of entities){if(e.dead||e.mt!=='pgcharge'||e.pfuse>0)continue;const s=e.stuck;
    const near=s&&s.kind==='blk'?(Math.abs(s.x-x)<=1&&Math.abs(s.y-y)<=1&&Math.abs(s.z-z)<=1):(Math.abs(e.x-x-0.5)<1.4&&Math.abs(e.y-y-0.3)<1.4&&Math.abs(e.z-z-0.5)<1.4);
    if(near){e.pfuse=0.05;e.pcap=null;}}
  burstParticles(x+0.5,y+0.2,z+0.5,B.TORCH,2,0.35);}
function piSparkTick(dt){for(let i=piSparks.length-1;i>=0;i--){const h=piSparks[i];if(h.done){piSparks.splice(i,1);continue;}
    h.t+=dt;h.acc+=dt*h.speed;
    while(h.acc>=1&&!h.done){h.acc-=1;const next=[];
      for(const [x,y,z] of h.front)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(const dy of [0,1,-1]){const nx=x+dx,ny=y+dy,nz=z+dz,k=nx+','+ny+','+nz;
        if(h.reached.has(k)||getBlock(nx,ny,nz)!==B.PG_CORD)continue;h.reached.add(k);next.push([nx,ny,nz]);h.cells++;piSparkVisit(h,nx,ny,nz);}
      h.front=next;if(next.length&&h.cells%3===0)mwS('pg_spark',next[0][0]+0.5,next[0][1]+0.3,next[0][2]+0.5);
      if(!next.length){h.done=true;if(h.onEnd)try{h.onEnd(h);}catch(e){mpFail('spark onEnd',e);}}}}}
function piUseFuse(st,hit,dt,rEdge){if(!rEdge)return true;
  if(!hit||hit.id!==B.PG_CORD){showToast('Light a Det Cord with it.');return true;}
  if(piS.fuseCD>MP.clock)return true;piS.fuseCD=MP.clock+2;P.swing=1;piCordSpark(hit.x,hit.y,hit.z,12,'Dan');return true;}

/* ---- the Staple Gun: 40 m/s, 2 damage, 1 Staples per shot, wears to 300; a staple pins a Hand or a frog 2 s (e.ppin) ---- */
function piUseStapler(st,hit,dt,rEdge){if(!rEdge||P.useT>0)return true;
  if(P.mode!=='c'&&!invConsume(P.inv,IT.PG_STAPLES,1)){showToast('Out of Staples.');P.useT=0.3;return true;}
  const T=piThrowFrom();puSpawn('staple',T.x,T.y,T.z,T.L[0]*40,T.L[1]*40,T.L[2]*40,'Dan',{src:null});
  P.useT=0.22;P.swing=1;damageHeld(1);redrawHotbar();if(typeof playSAt==='function')playSAt('click',P.x,P.y+1,P.z);return true;}

/* ---- the Pig Mitt and the Vanity Mirror: hold right-click to raise (a slow walk). piRaised() is what P4 reads. ---- */
function piRaise(k){if(!piS.raise||piS.raise.k!==k)piS.raise={k,t0:MP.clock,fc:frameCount,blocked:0};else piS.raise.fc=frameCount;}
function piRaised(){const r=piS.raise;return r?{k:r.k,t:MP.clock-r.t0,st:heldStack(),held:piS.held?piS.held.e||piS.held.a:null}:null;}
function piUseMitt(st,hit,dt,rEdge){piRaise('mitt');return true;}
function piUseMirror(st,hit,dt,rEdge){piRaise('mirror');return true;}
/* P4: the 4th look -> she smashes it (piMirrorBreak) */
function piMirrorBreak(msg){const i=P.inv.findIndex(s=>s&&s.id===IT.PG_VMIRROR);if(i<0)return false;P.inv[i]=null;redrawHotbar();piS.raise=null;
  burstParticles(P.x,P.y+1.2,P.z,B.PG_MIRROR,12,0.8);if(msg)mpSay('THE PIG',msg,2.5);return true;}
const PI_CATCH={pgtoss:1,pgpiglet:1,pghog:1,pghen:1,pgpig:1};
function piMittTick(dt){const r=piS.raise,held=heldStack(),hasM=held&&held.id===IT.PG_MITT;
  if(r&&(r.fc!==frameCount||!held||(r.k==='mitt'&&!hasM)||(r.k==='mirror'&&held.id!==IT.PG_VMIRROR)))piS.raise=null;
  const L=lookDir(),E=eyePos(),fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
  /* catch: anything thrown that touches the mitt's front within 0.4 s of raising */
  if(piS.raise&&piS.raise.k==='mitt'&&!piS.held&&MP.clock-piS.raise.t0<=0.4){
    for(const e of entities){if(e.dead||e.t!=='mob'||e.bot)continue;const T=MOBT[e.mt]||{};if(!(e.pthrown||T.pcatch||e.pcatch||PI_CATCH[e.mt])||e.pheld)continue;
      if(e.onGround&&!e.pthrown&&!e.pcatch)continue;const dx=e.x-P.x,dy=e.y+(e.h||0.5)*0.5-(P.y+1.2),dz=e.z-P.z,d=Math.hypot(dx,dy,dz);
      if(d>1.9||(dx*fx+dz*fz)/Math.max(0.01,Math.hypot(dx,dz))<0.3)continue;piCatch({e});break;}
    /* P4's thrown pigs are pooled projectiles carrying e.pcatch ('pig' | 'link'): caught = puRemove + keep the kind */
    if(!piS.held)for(const e of entities){if(e.dead||e.t!=='pproj'||!e.pcatch||e.owner==='Dan')continue;
      const dx=e.x-P.x,dy=e.y-(P.y+1.2),dz=e.z-P.z,d=Math.hypot(dx,dy,dz);if(d>1.9||(dx*fx+dz*fz)/Math.max(0.01,Math.hypot(dx,dz))<0.3)continue;
      const K=PREG.proj[e.kind],pj={kind:e.kind,pcatch:e.pcatch,mesh:null};puRemove(e);
      if(K&&K.mesh&&typeof THREE!=='undefined'&&scene){try{pj.mesh=K.mesh({kind:pj.kind,pcatch:pj.pcatch,held:1});if(pj.mesh)scene.add(pj.mesh);}catch(err){pj.mesh=null;}}
      piCatch({proj:pj});break;}
    if(!piS.held&&typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS){const g=a.pgrab,b=a.e;if(!g||g.k!=='thrown'||!b||b.dead||a.dim!==DIM)continue;
      const dx=b.x-P.x,dz=b.z-P.z,d=Math.hypot(dx,b.y+0.9-(P.y+1.2),dz);if(d>2.0||(dx*fx+dz*fz)/Math.max(0.01,Math.hypot(dx,dz))<0.3)continue;
      a.pgrab={k:'held',by:'Dan',src:P,x:P.x+fx*0.8+rx*0.5,y:P.y+0.9,z:P.z+fz*0.8+rz*0.5,vx:0,vy:0,vz:0,spd:0,until:MP.clock+4,onEnd:null};piCatch({a});break;}}
  const H=piS.held;if(!H)return;
  if(!hasM||P.dead){piRelease(false);return;}
  const age=MP.clock-H.t;
  if(H.e){const e=H.e;if(e.dead){piS.held=null;return;}e.x=P.x+fx*0.7+rx*0.75;e.z=P.z+fz*0.7+rz*0.75;e.y=P.y+0.75+Math.sin(age*30)*0.05;e.vx=e.vy=e.vz=0;e.onGround=false;
    if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.z=Math.sin(age*24)*0.4;}
    if(age>=4){P.hurtT=0;purgHit(P,2,'a pig','bite',{force:1});mwS('pg_squeak',e.x,e.y,e.z);piRelease(false);return;}}
  else if(H.a){const g=H.a.pgrab;if(!g||g.k!=='held'||g.by!=='Dan'){piS.held=null;return;}g.x=P.x+fx*0.8+rx*0.6;g.y=P.y+0.6;g.z=P.z+fz*0.8+rz*0.6;
    if(age>=4){piS.held=null;}}
  else if(H.proj){const m=H.proj.mesh;if(m){m.position.set(P.x+fx*0.7+rx*0.75,P.y+0.75+Math.sin(age*30)*0.05,P.z+fz*0.7+rz*0.75);m.rotation.z=Math.sin(age*24)*0.4;}
    if(age>=4){P.hurtT=0;purgHit(P,2,'a pig','bite',{force:1});mwS('pg_squeak',P.x,P.y+1,P.z);piRelease(false);return;}}
  MINE.prog=0;
  /* left-click throws whatever you hold where you look (22 m/s, light arc); that click mines nothing */
  if(MB.l&&!piS.prevMBl){piRelease(true);MINE.active=false;MINE.prog=0;}}
function piCatch(o){piS.held=Object.assign({t:MP.clock},o);MP.stats.pigs=(MP.stats.pigs|0)+1;damageHeld(1);
  if(o.e){o.e.pheld='Dan';o.e.pthrown=null;o.e.pcaught=MP.clock;mwS('pg_squeak',o.e.x,o.e.y,o.e.z);}
  else if(o.proj)mwS('pg_squeak',P.x,P.y+1.2,P.z);
  else mwS('pg_honk',P.x,P.y+1.2,P.z);}
function piRelease(throwIt){const H=piS.held;piS.held=null;if(!H)return;const L=lookDir();
  if(H.e){const e=H.e;e.pheld=null;if(throwIt){e.vx=L[0]*22;e.vy=L[1]*22+2.5;e.vz=L[2]*22;e.pthrown={by:'Dan',t:MP.clock};mwS('pg_whoosh',P.x,P.y+1.4,P.z);}
    else{e.vy=3;e.vx=(Math.random()-0.5)*3;e.vz=(Math.random()-0.5)*3;}}
  else if(H.proj){const pj=H.proj,fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
    if(pj.mesh){scene.remove(pj.mesh);const K=PREG.proj[pj.kind];if(K&&K.free)try{K.free(pj.mesh);}catch(err){}}
    const x=P.x+fx*0.7+rx*0.75,y=P.y+0.9,z=P.z+fz*0.7+rz*0.75;
    if(throwIt){puSpawn(pj.kind,x,y,z,L[0]*22,L[1]*22+2.5,L[2]*22,'Dan',{thrown:1,pcatch:pj.pcatch,src:null});mwS('pg_whoosh',P.x,P.y+1.4,P.z);}
    else puSpawn(pj.kind,x,y,z,(Math.random()-0.5)*3,3,(Math.random()-0.5)*3,'Dan',{pcatch:pj.pcatch,src:null,wriggle:1});}
  else if(H.a&&H.a.pgrab&&H.a.pgrab.by==='Dan'){if(throwIt){const g=H.a.pgrab;H.a.pgrab={k:'thrown',by:'Dan',src:null,x:g.x,y:g.y,z:g.z,vx:L[0]*22,vy:L[1]*22+2.5,vz:L[2]*22,spd:22,until:MP.clock+5,onEnd:null};
      mwS('pg_whoosh',P.x,P.y+1.4,P.z);}else H.a.pgrab=null;}
  P.swing=1;}
/* a raised Vanity Mirror bounces projectiles that come at it from the front (breaks after 20) */
function piMirrorTick(){const r=piS.raise;if(!r||r.k!=='mirror')return;const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
  for(const e of entities){if(e.dead)continue;const isP=e.t==='pproj',isT=e.t==='mob'&&e.pthrown&&e.pthrown.by!=='Dan'&&!e.pheld;if(!isP&&!isT)continue;
    if(isP&&e.owner==='Dan')continue;const dx=e.x-P.x,dz=e.z-P.z,dy=e.y-(P.y+1.2),d=Math.hypot(dx,dy,dz);if(d>1.6||d<0.05)continue;
    if((dx*fx+dz*fz)/Math.max(0.01,Math.hypot(dx,dz))<0.35)continue;if((e.vx||0)*dx+(e.vz||0)*dz>=0)continue;   /* must be coming at you */
    e.vx=-(e.vx||0)*0.8;e.vz=-(e.vz||0)*0.8;e.vy=Math.abs(e.vy||0)*0.5+1;if(isP){e.owner='Dan';e.src=null;e.age=0;}else e.pthrown={by:'Dan',t:MP.clock};
    burstParticles(e.x,e.y,e.z,B.PG_MIRROR,4,0.5);damageHeld(1);r.blocked++;}}

/* ---- Slam Gloves: hold right-click 0.8 s ("Wind up...", the glove glints), release ("SLAM!"): 14 to the target in reach plus an 8-block
   shockwave line of 6 (knockback, headliners stagger 1 s: e.pstagger; the tongue tip's relay sees how 'chopglove'). 6 s cooldown. ---- */
function piUseChopGlove(st,hit,dt,rEdge){if(piS.hy.cd>MP.clock){if(rEdge)showToast('The gloves are still stinging.');return true;}
  piS.hy.c+=dt;piS.hy.fc=frameCount;if(piS.hy.c>=0.8&&!piS.hy.glint){piS.hy.glint=true;mpSay('','Wind up…',0.9);}return true;}
function piChopGloveTick(){const H=piS.hy,held=heldStack();if(H.c<=0)return;
  if(H.fc===frameCount&&held&&held.id===IT.PG_CHOPGLOVE&&MB.r)return;          /* still charging */
  const ok=H.c>=0.8&&held&&held.id===IT.PG_CHOPGLOVE;H.c=0;H.glint=false;if(!ok)return;
  H.cd=MP.clock+6;P.swing=1;damageHeld(1);mpSay('','SLAM!',1.2);
  const E=eyePos(),L=lookDir(),am=pickMob(E[0],E[1],E[2],L[0],L[1],L[2],3.4);
  if(am&&!am.e.dead)purgHit(am.e,14,'Dan','chopglove',{force:1,kx:L[0],kz:L[2]});
  const hl=Math.hypot(L[0],L[2])||1,lx=L[0]/hl,lz=L[2]/hl;
  for(const e of entities){if(e.dead||e.t!=='mob'||(am&&e===am.e))continue;if(e.bot&&(!e.A||e.A.dim!==DIM))continue;
    const dx=e.x-P.x,dz=e.z-P.z,along=dx*lx+dz*lz;if(along<0.5||along>8)continue;const lat=Math.abs(dx*lz-dz*lx);if(lat>1.2||Math.abs(e.y-P.y)>3)continue;
    purgHit(e,6,'Dan','chopglove',{force:1,kx:lx,kz:lz});if(MOBT[e.mt]&&MOBT[e.mt].pboss)e.pstagger=MP.clock+1;}
  for(let d=1;d<=8;d++)burstParticles(P.x+lx*d,P.y+0.6,P.z+lz*d,B.PG_SATIN,2,0.5);mwS('pg_whoosh',P.x,P.y+1,P.z);}

/* ---- melee flourishes read from the attack edge (no attack hook exists): Floppy Pick bend, Sock Slapper flap, Rapier stuffing,
   Stiletto x1.6 while falling, the Gauntlet's UNHAND, Disco sparkles ---- */
const PI_UNHAND={pgwhat:1,pgposs:1,pgfeltdan:1,pgcomic:1,pgpelican:1,pgyeti:1};
function piHandModel(){if(typeof handG==='undefined'||!handG||!handG.children)return null;for(const c of handG.children)if(c&&c.isT3D)return c;return null;}
function piMeleeTick(dt){const st=heldStack(),id=st?st.id:0,edge=P.atkT>piS.prevAtk+0.05;piS.prevAtk=P.atkT;
  if(edge){const E=eyePos(),L=lookDir(),am=pickMob(E[0],E[1],E[2],L[0],L[1],L[2],3.3),t=am&&!am.e.dead?am.e:null;
    if(id===IT.PG_FLOPPY)piBend();
    if(id===IT.PG_SLAPPER)piS.flapT=0.25;
    if(t&&id===IT.PG_BAT&&!(MOBT[t.mt]&&(MOBT[t.mt].prop||MOBT[t.mt].pboss))){const l=Math.hypot(t.x-P.x,t.z-P.z)||1;t.vx+=(t.x-P.x)/l*6;t.vz+=(t.z-P.z)/l*6;}  /* the bat: mob knockback x2 */
    if(t&&id===IT.PG_RAPIER)burstParticles(t.x,t.y+(t.h||1)*0.6,t.z,B.PG_STUFFING,7,0.7);
    if(t&&id===IT.PG_STILETTO&&P.vy<-2){purgHit(t,4,'Dan','stiletto',{force:1,kx:L[0],kz:L[2]});burstParticles(t.x,t.y+(t.h||1)*0.7,t.z,B.PG_SEQORE,6,0.6);}
    if(t&&id===IT.PG_GAUNTLET&&PI_UNHAND[t.mt]&&Math.random()<0.15){piS.stats.unhand++;burstParticles(t.x,t.y+(t.h||1)*0.6,t.z,B.PG_SKIN,10,0.8);
      t.punhand=1;purgHit(t,9999,'Dan','unhand',{force:1});mwS('pg_rip',t.x,t.y,t.z);}}
  if(id===IT.PG_FLOPPY&&MINE.active){piS.mineT-=dt;if(piS.mineT<=0){piS.mineT=0.35;piBend();}}
  if(id===IT.PG_DISCO&&MINE.active&&frameCount%4===0)burstParticles(MINE.x+0.5,MINE.y+0.5,MINE.z+0.5,B.PG_SEQORE,2,0.5);
  const hm=piHandModel();
  if(piS.bendT>0){piS.bendT=Math.max(0,piS.bendT-dt);if(hm&&hm.pbend)hm.pbend.rotation.z=-0.35-Math.sin((1-piS.bendT/0.15)*Math.PI)*1.1;}
  if(piS.flapT>0){piS.flapT=Math.max(0,piS.flapT-dt);if(hm&&hm.pjaw)hm.pjaw.rotation.x=Math.sin(piS.flapT*40)*0.5;}
  if(hm&&hm.pglint)hm.pglint.visible=!!piS.hy.glint;
  if(hm&&piS.raise){hm.position.y=-0.2+0.16;}else if(hm&&(id===IT.PG_MITT||id===IT.PG_VMIRROR))hm.position.y=-0.2;}
function piBend(){piS.bendT=0.15;piS.bends++;}

/* ---- Performer's Sneakers: +15% speed, a squeak, and footprints for 20 s that the Hands follow in BLACKOUT (piFootprints) ---- */
function piFootprints(){return piS.prints.filter(p=>MP.clock-p.t<=20).map(p=>({x:p.x,y:p.y,z:p.z,t:p.t}));}
function piPrintTick(dt){for(let i=piS.prints.length-1;i>=0;i--){const p=piS.prints[i];if(MP.clock-p.t>20){if(p.m){scene.remove(p.m);piPoolFree('print')(p.m);}piS.prints.splice(i,1);}}
  if(!piWearing(IT.PG_SNEAKERS)||!P.onGround){piS.lastPrint=null;return;}
  const lp=piS.lastPrint;if(lp&&Math.hypot(P.x-lp[0],P.z-lp[1])<1.0)return;piS.lastPrint=[P.x,P.z];piS.printAcc=(piS.printAcc||0)+1;
  const side=piS.printAcc%2?0.15:-0.15,rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw),x=P.x+rx*side,z=P.z+rz*side,y=Math.floor(P.y)+0.02;
  let m=null;if(typeof THREE!=='undefined'&&scene){m=piPoolGet('print',()=>piRig().box(0.18,0.02,0.3,'#3a2a1a'));m.position.set(x,y,z);m.rotation.y=P.yaw;scene.add(m);}
  piS.prints.push({x,y,z,t:MP.clock,m});if(piS.printAcc%2)mwS('pg_squeak',x,y,z);if(piS.prints.length>40){const o=piS.prints.shift();if(o.m){scene.remove(o.m);piPoolFree('print')(o.m);}}}
function piPrintsClear(){for(const p of piS.prints)if(p.m&&scene){scene.remove(p.m);piPoolFree('print')(p.m);}piS.prints.length=0;piS.lastPrint=null;}

/* ---- the Eyeball Lamp pupil turns to the nearest player (bible 19 #7): a lazily built overlay within 16 m, OG only ---- */
function piPupilTick(){if(frameCount%4!==0)return;const hr=typeof TP!=='undefined'&&TP.hr;let n=0;
  if(!hr&&typeof THREE!=='undefined'&&scene)for(const k of torches){const p=dimP(k);if(!p)continue;const x=+p[0],y=+p[1],z=+p[2];
    if(Math.abs(x-P.x)>16||Math.abs(z-P.z)>16||Math.abs(y-P.y)>12||getBlock(x,y,z)!==B.PG_LAMP)continue;if(n>=16)break;
    let m=piS.pupils[n];if(!m){m=piRig().box(0.11,0.11,0.04,'#0a0a0a');piS.pupils[n]=m;scene.add(m);}
    const cx=x+0.5,cy=y+0.69,cz=z+0.5,np=piNearestPlayer(cx,cz),tx=np?np.x:P.x,tz=np?np.z:P.z,a=Math.atan2(tx-cx,tz-cz);
    m.position.set(cx+Math.sin(a)*0.21,cy,cz+Math.cos(a)*0.21);m.rotation.y=a;m.visible=true;n++;}
  for(let i=n;i<piS.pupils.length;i++)if(piS.pupils[i])piS.pupils[i].visible=false;}
function piPupilsHide(){for(const m of piS.pupils)if(m)m.visible=false;}

/* ---- the gear tick (called from p2_craft.js's PREG.tick entry) ---- */
function piGearTick(dt){
  piMittTick(dt);piMirrorTick();piChopGloveTick();piMeleeTick(dt);piSparkTick(dt);piPrintTick(dt);piPupilTick();
  piS.prevMBl=!!MB.l;
  if(P.vy>9.8&&!(piS.dough>MP.clock))piS.launched=true;
  if(P.onGround&&P.vy<=0)piS.slide=false;
  piMittShow(!heldStack()&&!P.dead&&!(typeof hrPgFistOwns==='function'?hrPgFistOwns():(typeof TP!=='undefined'&&TP.hr)));
  {const M=typeof plModel!=='undefined'?plModel:null,t=M&&M._tool,pv=t&&t.children&&t.children[0];   /* third person: point the gear forward from the hand */
   if(pv&&pv.piPivot&&!t.piTP){t.piTP=1;pv.rotation.x=-1.75;pv.position.set(0,-0.05,0.05);}}
  const st=heldStack();if(st&&st.id===IT.PG_LIVECHICK&&typeof handG!=='undefined'&&handG&&handG.children[0]){const c=handG.children[0];c.position.x=Math.sin(MP.clock*23)*0.04;c.position.y=Math.cos(MP.clock*31)*0.03;}}

/* ---- souvenirs (bible 5.6): overworld only. the Demolitionist's Plunger primes every TNT Dan placed within 48 m after a 0.5 s spark;
   the Pig's Glove hurls a live overworld pig 12 m (20 s cooldown); the Frog (Empty) fires a 10 m tongue (yank a mob or a drop, or
   grapple to a block) and flaps when you attack. Timers run on piS.ot (PREG.overTick; MP.clock only runs inside). ---- */
piS.ot=0;piS.tnt=[];piS.tongue=null;
PREG.overTick.push(function piOverTick(dt){piS.ot+=dt;
  for(let i=piS.tnt.length-1;i>=0;i--){const t=piS.tnt[i];t.t-=dt;if(frameCount%3===0)burstParticles(t.x+0.5,t.y+1,t.z+0.5,B.TORCH,1,0.3);
    if(t.t<=0){piS.tnt.splice(i,1);if(getBlock(t.x,t.y,t.z)===B.TNT){setBlock(t.x,t.y,t.z,B.AIR);primeTNT(t.x,t.y,t.z,0.05+i*0.03,'Dan');}}}
  const st=P&&heldStack(),hm=piHandModel();
  if(st&&st.id===IT.PG_SV_FROG&&hm&&hm.pjaw){const sw=P.swing>0.3;hm.pjaw.rotation.x=sw?Math.sin(piS.ot*30)*0.6:0;}
  const T=piS.tongue;if(T){T.t-=dt;if(T.m){const E=eyePos(),dx=T.x-E[0],dy=T.y-E[1],dz=T.z-E[2],d=Math.hypot(dx,dy,dz)||1;
      T.m.position.set(E[0]+dx*0.5,E[1]-0.2+dy*0.5,E[2]+dz*0.5);T.m.scale.set(0.06,0.06,d);T.m.lookAt&&T.m.lookAt(T.x,T.y,T.z);}
    if(T.t<=0){if(T.m)scene.remove(T.m);piS.tongue=null;}}});
function piUseSvPlunger(st,hit,dt,rEdge){if(!rEdge||DIM==='puppet')return DIM!=='puppet';P.swing=1;P.useT=0.4;mwS('pg_plunger',P.x,P.y+1,P.z);
  const me=typeof ownIdx==='function'?ownIdx('Dan'):-1,cx0=Math.floor((P.x-48)/CH),cx1=Math.floor((P.x+48)/CH),cz0=Math.floor((P.z-48)/CH),cz1=Math.floor((P.z+48)/CH);let n=0;
  for(let cx=cx0;cx<=cx1;cx++)for(let cz=cz0;cz<=cz1;cz++){const ch=chunks.get(ckey(cx,cz));if(!ch)continue;const bl=ch.bl;
    for(let i=0;i<bl.length;i++){if(bl[i]!==B.TNT)continue;const lx=(i/(WH*CH))|0,rem=i-lx*WH*CH,y=(rem/CH)|0,lz=rem-y*CH,x=cx*CH+lx,z=cz*CH+lz;
      if(Math.hypot(x+0.5-P.x,y+0.5-P.y,z+0.5-P.z)>48)continue;const o=typeof BOWN!=='undefined'?BOWN.get(bkey(x,y,z)):undefined;if(o!==undefined&&o!==me)continue;
      piS.tnt.push({x,y,z,t:0.5});n++;}}
  showToast(n?'Something, somewhere, goes click.':'Nothing of yours is wired to it.');return true;}
function piUseSvGlove(st,hit,dt,rEdge){if(DIM==='puppet')return false;if(!rEdge)return true;
  if(piS.ot<piS.svGlove){showToast('The glove needs a moment.');return true;}piS.svGlove=piS.ot+20;
  const T=piThrowFrom();spawnMob('pig',T.x,T.y,T.z);const e=entities[entities.length-1];e.vx=T.L[0]*11;e.vy=T.L[1]*11+4.5;e.vz=T.L[2]*11;
  P.swing=1;P.useT=0.5;mpSay('','SLAM!',1.2);mwS('pg_whoosh',P.x,P.y+1,P.z);return true;}
function piUseSvFrog(st,hit,dt,rEdge){if(DIM==='puppet')return false;if(!rEdge||P.useT>0)return true;P.useT=0.6;P.swing=1;
  const E=eyePos(),L=lookDir();let tx=null,ty,tz;
  const am=pickMob(E[0],E[1],E[2],L[0],L[1],L[2],10);
  if(am&&(!hit||am.t<hit.t)){const e=am.e,dx=P.x-e.x,dz=P.z-e.z,d=Math.hypot(dx,dz)||1;e.vx=dx/d*13;e.vz=dz/d*13;e.vy=5;tx=e.x;ty=e.y+(e.h||1)*0.5;tz=e.z;}
  else{let best=null,bd=1;for(const e of entities){if(e.dead||e.t!=='drop')continue;const vx=e.x-E[0],vy=e.y-E[1],vz=e.z-E[2],t=vx*L[0]+vy*L[1]+vz*L[2];
      if(t<0.5||t>10)continue;const off=Math.hypot(vx-L[0]*t,vy-L[1]*t,vz-L[2]*t);if(off<bd){bd=off;best=e;}}
    if(best){best.x=P.x;best.y=P.y+1;best.z=P.z;best.vx=best.vy=best.vz=0;best.age=Math.max(best.age,0.6);tx=best.x;ty=best.y;tz=best.z;}
    else{const hg=raycastB(E[0],E[1],E[2],L[0],L[1],L[2],10);if(hg){GRAP={x:hg.x+0.5,y:hg.y+1,z:hg.z+0.5,t:1.7};tx=hg.x+0.5;ty=hg.y+0.5;tz=hg.z+0.5;}}}
  if(tx!=null&&typeof THREE!=='undefined'&&scene){if(piS.tongue&&piS.tongue.m)scene.remove(piS.tongue.m);const m=piRig().box(1,1,1,'#e86a8a');scene.add(m);piS.tongue={m,t:0.25,x:tx,y:ty,z:tz};}
  if(tx==null)showToast('The tongue flops out and comes back with nothing.');return true;}
/* helpers for P3/P4 brains: is this held stack a cutter (Wire Snips or Rhinestone Snips: cords, the tongue, the Drummer's stake, the
   Trap Release lever, the Lamp Cleat) or any Shears-class tool (felt, fleece, cardboard, the sheet)? */
function piCuts(st){const id=st&&st.id!==undefined?st.id:st;return id===IT.PG_SNIPS||id===IT.PG_RSNIPS;}
function piShears(st){const id=st&&st.id!==undefined?st.id:st,d=DEFS[id];return !!(d&&d.tool&&d.tool.type==='axe'&&d.pg);}
Object.assign(PGEX,{piCuts,piShears,piCordSpark,piChargeArm,piChargeBlow,piRaised,piMirrorBreak,piFootprints,piSpeed,piLand,piDoughVy,piRawSpray,piSlurp,
  piSparks:()=>piSparks,piFlySpawn,piGadgetMesh,piFullSet,piHandModel});
