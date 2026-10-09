/* ---- PART 57: m1_site.js ---- */
/* ===================================================================== */
/* PART 57 m1 (M1): THE BITE · the site (bible 2, 3.4, 3.7, 4.4, 15).    */
/* The Bone Pile at the stair head (the respawn point), safe standing    */
/* cells for spits, plucks and transitions, the spawn egg (an offering   */
/* inside, an ash column leaning toward him anywhere else), no block     */
/* entities in the Bite (spat back), block-entity contents never lost    */
/* (spilled at the Bone Pile), the Pen's cows, the chewing you feel      */
/* from 90 m, and a ridden dragon that will not cross the lip.           */
/* ===================================================================== */

/* the respawn point: on the pad between the heap and the stair head, facing into the Bite (+x) */
function mg1BonePile(){const g=mg1Geo();return {x:MGC.BX-40+0.5,y:g.G,z:MGC.BZ+0.5,yaw:-Math.PI/2};}

/* a standing cell on the plate (or an island) under the TARGET layout and in the live world: solid underfoot, two clear */
function mg1Stand(wx,wz,g){g=g||mg1Geo();const dx=wx-MGC.BX,dz=wz-MGC.BZ;if(dx*dx+dz*dz>(MGC.R_PLATE-0.5)*(MGC.R_PLATE-0.5))return false;
  if(!chunkAt(wx,wz))return false;const F=g.F;
  if(!solidAt(wx,F-1,wz)||solidAt(wx,F,wz)||solidAt(wx,F+1,wz))return false;
  const t=mg1Target(wx,F-1,wz,MG1.L,g);return t>0&&mg1Solid(t);}
function mg1Firm(wx,wz,F,rad){const r=Math.ceil(rad);                       /* no hole within rad (the pluck's 3 m from any hole) */
  for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++){if(i*i+j*j>rad*rad)continue;if(!solidAt(wx+i,F-1,wz+j))return false;}return true;}
/* world.safeCell(x,z,o): the nearest standing cell to (x,z) at least o.minR (6) from his centre and o.hole (2.5) from any hole */
function mg1SafeCell(x,z,o){o=o||{};const g=mg1Geo(),F=g.F,minR=o.minR==null?6:o.minR,hole=o.hole==null?2.5:o.hole;
  const b=o.from||(MGF.boss&&!MGF.boss.dead?MGF.boss:{x:MGC.X,z:MGC.Z});
  const cx=Math.floor(x==null?MGC.X-14:x),cz=Math.floor(z==null?MGC.Z:z);
  for(let rad=0;rad<=36;rad++){
    for(let i=-rad;i<=rad;i++)for(let j=-rad;j<=rad;j++){if(Math.max(Math.abs(i),Math.abs(j))!==rad)continue;
      const wx=cx+i,wz=cz+j;if(Math.hypot(wx+0.5-b.x,wz+0.5-b.z)<minR)continue;
      if(mg1Stand(wx,wz,g)&&(hole<=0||mg1Firm(wx,wz,F,hole)))return {x:wx+0.5,y:F,z:wz+0.5};}}
  for(let r=14;r<=22;r++){const wx=MGC.BX-r,wz=MGC.BZ;if(mg1Stand(wx,wz,g))return {x:wx+0.5,y:F,z:wz+0.5};}   /* the stair side of every layout */
  return {x:MGC.X-14,y:F,z:MGC.Z};}

/* the spawn egg (M0-29 -> mgEggUse -> world.egg). true = handled (never spawnMob) */
function mg1Egg(st,hit,x,y,z){
  if(DIM==='over'&&!P.ride&&(mgIn(x,y,z)||mgIn(P.x,P.y,P.z))){
    if(DEMON.dead){burstParticles(x,y+0.5,z,B.GRAVEL,10,0.8);playSAt('thud',x,y,z);return true;}   /* the socket stays empty (the rematch is cut-line #1) */
    if(MGF.live||(CUT.on&&CUT.script)){burstParticles(x,y+0.5,z,B.NETHROCK,6,0.7);playSAt('pop',x,y,z);return true;}   /* busy: it bounces off */
    if(mg1Wake('egg')&&P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;if(typeof redrawHotbar==='function')redrawHotbar();}   /* "...Something fell in." */
    return true;}
  mg1Ash(x,y,z);return true;}                                                 /* he eats at his own table: not used up */
/* the ground rumbles and a column of ash rises, leaning toward (1000, 1000) */
function mg1Ash(x,y,z){let dx=MGC.X-x,dz=MGC.Z-z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
  for(let i=0;i<=24;i++){const t=i/24;burstParticles(x+dx*t*7,y+0.4+t*13,z+dz*t*7,i%3?B.GRAVEL:B.COAL_ORE,2,0.25);}
  nukeShake(0.3,0.6);playSAt('thud',x,y,z);MG1.ash=(MG1.ash||0)+1;}

/* world.placeOK: no block entities inside the Bite (bible 3.7 rule 4); TNT, tables and plain blocks are allowed (then eaten) */
var MG1_BE=['chest','furnace','disp','terr','crea','bed','cine'];
function mg1PlaceOK(x,y,z,id){const d=DEFS[id];if(!d)return true;
  if(!(d.cr||d.bed||MG1_BE.indexOf(d.interact)>=0))return true;
  if(MGF.clock-MG1.spitT>0.4){MG1.spitT=MGF.clock;burstParticles(x+0.5,y+0.5,z+0.5,id,6,0.7);playSAt('pop',x+0.5,y+0.5,z+0.5);}
  MG1.spit++;return false;}                                                   /* "ptoo": the item stays in Dan's hand */

/* a block entity removed by a layout write, a reset or an orphaned save: works go back through crLost, stacks to the Bone Pile */
function mg1SpillBE(bk,be,x,y,z){
  if(typeof CR_BET!=='undefined'&&CR_BET[be.t]){try{if(be.id&&typeof crLost==='function')crLost(bk,be);}catch(err){mgFail('m1-crlost',err);}blockEnts.delete(bk);return;}
  blockEnts.delete(bk);
  let held=[];if(Array.isArray(be.inv))held=be.inv;else if(be.t==='disp'){if(be.fig)held=[{id:IT.FIGURINE,count:1,mob:be.fig}];}
  else if(be.t!=='terr')held=[be.in,be.fuel,be.out];
  for(const st of held)if(st&&st.count>0)MG1.spill.push(JSON.parse(JSON.stringify(st)));}
function mg1Orphans(){                                                        /* a site edit dropped by the save filter can orphan its entity */
  for(const [k,be] of [...blockEnts]){if(k[1]===';')continue;const p=k.split(','),x=+p[0],y=+p[1],z=+p[2];
    if(!mgSiteCell(x,y,z)||!chunkAt(x,z))continue;const id=getBlock(x,y,z),d=DEFS[id];
    if(id===B.AIR||!d||!(d.interact||d.cr||d.bed))mg1SpillBE(k,be,x,y,z);}}
function mg1DeliverSpill(){if(!MG1.spill.length)return;const b=mg1BonePile();if(!chunkAt(Math.floor(b.x),Math.floor(b.z)))return;
  for(const st of MG1.spill.splice(0))spawnDrop(b.x,b.y+0.6,b.z,st,0,1.5,0);}

/* the Pen's cows (L0/L1, dormant, within 60 m and the height band): topped up to M1_COWS, one a second */
function mg1Cows(dt,g){MG1.cowT-=dt;if(MG1.cowT>0)return;MG1.cowT=1.0;
  if(MGF.live||!MGF.band||MGF.d>MGC.R_SPAWN||(MG1.L!=='L0'&&MG1.L!=='L1')||mg1Busy()||P.dead)return;
  const px=MGC.BX+MG1_PL[2][0],pz=MGC.BZ+MG1_PL[2][1];
  if(!chunkAt(px,pz)||getBlock(px,g.F,pz)!==B.GRASS||getBlock(px+2,g.F+1,pz)!==B.LOG_O)return;          /* the pen still stands */
  let n=0;for(const e of entities)if(e.t==='mob'&&!e.dead&&e.mt==='cow'&&Math.abs(e.x-px-0.5)<=2.6&&Math.abs(e.z-pz-0.5)<=2.6&&e.y>=g.F-1&&e.y<=g.F+4)n++;
  if(n>=MG_K.M1_COWS)return;
  const k=MG1.cowN++,ox=(k%3)-1,oz=((((k/3)|0)%3))-1;spawnMob('cow',px+ox+0.5,g.F+1,pz+oz+0.5);}
function mg1PenCows(g){const px=MGC.BX+MG1_PL[2][0]+0.5,pz=MGC.BZ+MG1_PL[2][1]+0.5;   /* the cows still in the pen when it is torn out */
  return entities.filter(e=>e.t==='mob'&&!e.dead&&e.mt==='cow'&&Math.abs(e.x-px)<=3.6&&Math.abs(e.z-pz)<=3.6&&e.y>=g.F-2&&e.y<=g.F+5);}

/* the chewing (within 90 m, dormant): every 6-9 s (seeded) a micro shake you feel through the floor; warm puffs out of the slit.
   M2's band can key its crunch off MG1.chew (the clock time of the last chew) */
function mg1Chew(dt,g){if(MGF.live||DEMON.dead||MGF.d>MGC.R_CHEW)return;MG1.chewT-=dt;if(MG1.chewT>0)return;
  MG1.chewN++;MG1.chewT=6+3*h2(MG1.chewN,91,SEED+5761);MG1.chew=MGF.clock;
  if(MGF.band)nukeShake(0.06,0.25);
  if(MG1.L==='L0'&&MGF.band&&MGF.d<40)burstParticles(MGC.X,g.F+0.1,MGC.Z,B.CLOUDSTONE,4,0.3);}

/* a bot left in the gut while he is dormant (no pluck runs then) is fished out after 3 s and tossed onto the Bone Pile in a heap */
function mg1BotRescue(dt,g){MG1.botT=(MG1.botT||0)-dt;if(MG1.botT>0)return;MG1.botT=0.5;
  if(MGF.live||typeof AGENTS==='undefined'||!AGENTS.length){if(MG1.botGut)MG1.botGut={};return;}
  const gut=MG1.botGut||(MG1.botGut={}),b=mg1BonePile();
  for(const a of AGENTS){const e=a&&a.e;if(!e||e.dead||a.dead||!a.online){delete gut[a&&a.name];continue;}
    if(mgZone(e.x,e.y,e.z)!=='gut'){delete gut[a.name];continue;}
    gut[a.name]=(gut[a.name]||0)+0.5;if(gut[a.name]<3)continue;delete gut[a.name];
    const k=(MG1.tossed=(MG1.tossed||0)+1);e.x=b.x-1-(k%3);e.z=b.z+((k%3)-1)*1.2;e.y=b.y+0.2;e.vx=e.vy=e.vz=0;if(e.fallD!=null)e.fallD=0;a.x=e.x;a.y=e.y;a.z=e.z;
    a.path=null;a.pf=null;burstParticles(e.x,e.y+0.5,e.z,B.NETHROCK,8,0.8);playSAt('thud',e.x,e.y,e.z);}}
/* a ridden dragon refuses the lip: it flares, lands on the lip and sets Dan down (no damage, no text) */
function mg1Dragon(g){const d=P.ride;if(!d||d.t!=='mob'||(d.mt!=='dragon'&&d.mt!=='dking'))return false;
  if(P.y>g.G+MGC.BAND_UP||P.y<g.GF-MGC.BAND_DN)return false;
  const p=mgPol(P.x,P.z),rw=mgRw(p.th);if(p.r>rw+3.2)return false;
  const r=rw+1.5,ro=rw+8;P.ride=null;
  P.x=Math.floor(MGC.X+Math.cos(p.th)*r)+0.5;P.z=Math.floor(MGC.Z+Math.sin(p.th)*r)+0.5;P.y=g.G;P.vx=P.vy=P.vz=0;P.fallD=0;
  d.x=MGC.X+Math.cos(p.th)*ro;d.z=MGC.Z+Math.sin(p.th)*ro;d.y=Math.max(d.y,g.G+3);d.vx=d.vy=d.vz=0;
  burstParticles(P.x,P.y+0.3,P.z,B.NBRICK,8,0.8);playSAt('thud',P.x,P.y,P.z);MG1.dragon++;return true;}
