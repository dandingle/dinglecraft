/* DINGLECRAFT smoke seed suite — boots the real game headless and simulates.
   Rebuilt after a sandbox reset; grow this back toward full coverage using
   the test inventory in CLAUDE.md. Timestamps must strictly increase. */
'use strict';
require('./stubs.js');
require('./game.js');
const V=global.__vox;
const {B,IT}=V;
let pass=0,fail=0;
const ok=(n,c)=>{if(c)pass++;else{fail++;console.log('FAIL '+n);}};

(async()=>{
  /* boot */
  V.startNewWorld('smoke','1337','s');
  V.GR.snail=false;V.GR.jsc=0;
  for(let i=1;i<=160;i++)V.frameStep(i*40);
  ok('a world boots and the player stands',!!V.P&&V.P.hp===20&&V.getBlock(Math.floor(V.P.x),Math.floor(V.P.y)-1,Math.floor(V.P.z))!==B.AIR);

  /* time flows, and can be stopped */
  const t0=V.getTime();
  for(let i=0;i<10;i++)V.frameStep(7000+i*50);
  ok('the sun moves',V.getTime()>t0);
  V.GR.dayCycle=false;
  const t1=V.getTime();
  for(let i=0;i<10;i++)V.frameStep(7600+i*50);
  ok('and can be paused',V.getTime()===t1);
  V.GR.dayCycle=true;

  /* blocks */
  const px=Math.floor(V.P.x),py=Math.floor(V.P.y),pz=Math.floor(V.P.z);
  V.setBlock(px+2,py+3,pz,B.SBRICK);
  ok('setBlock/getBlock roundtrip',V.getBlock(px+2,py+3,pz)===B.SBRICK);
  V.setBlock(px+2,py+3,pz,B.AIR);

  /* gravity + landing */
  V.P.y+=8;V.P.vy=0;V.P.fallD=0;V.P.hp=20;
  for(let i=0;i<40;i++)V.frameStep(8200+i*50);
  ok('gravity works and landings register',V.P.onGround===true);

  /* god mode vs mortality (fall damage source) */
  for(const e of V.entities)
    if(e.t==='mob'&&!e.dead&&V.MOBT[e.mt].hostile&&Math.hypot(e.x-V.P.x,e.z-V.P.z)<40){e.hurtT=0;V.hurtMob(e,999,0,0);}
  if(V.P.pow)V.P.pow.a={};
  const gx=px,gy=py-1,gz=pz;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    V.setBlock(gx+dx,gy,gz+dz,B.STONE);
    for(let dy=1;dy<=16;dy++)V.setBlock(gx+dx,gy+dy,gz+dz,B.AIR);
  }
  const drop=()=>{V.P.x=gx+0.5;V.P.z=gz+0.5;V.P.y=gy+14;V.P.vx=V.P.vy=V.P.vz=0;V.P.fallD=0;V.P.hurtT=0;};
  V.GR.god=true;drop();V.P.hp=20;
  for(let i=0;i<45;i++)V.frameStep(11000+i*50);
  ok('god mode shrugs off a fall',V.P.hp===20&&V.P.onGround);
  V.GR.god=false;drop();V.P.hp=20;
  for(let i=0;i<45;i++)V.frameStep(13500+i*50);
  ok('mortals take fall damage',V.P.hp<20);
  V.P.hp=20;

  /* water flows sideways when deep */
  const fx=gx-8,fy=gy+2,fz=gz-8;
  for(let dx=-1;dx<=4;dx++)for(let dz=-1;dz<=1;dz++)for(let dy=-1;dy<=3;dy++)
    V.setBlock(fx+dx,fy+dy,fz+dz,B.STONE);
  for(let dx=0;dx<=3;dx++){V.setBlock(fx+dx,fy+1,fz,B.AIR);V.setBlock(fx+dx,fy+2,fz,B.AIR);}
  V.setBlock(fx,fy+1,fz,B.WATER);V.setBlock(fx,fy+2,fz,B.WATER);
  V.setBlock(fx+1,fy+1,fz,B.WATER);V.setBlock(fx+1,fy+2,fz,B.WATER);
  for(let i=0;i<60;i++)V.frameStep(16000+i*60);
  ok('deep water spreads',V.getBlock(fx+2,fy+1,fz)===B.WATER);

  /* mobs live. Track the EXACT spawned entity (not .pop() — world-gen spawns pigs too)
     and sample wander MID-loop: an idle pig can drift out and back inside 80 frames.
     (Live mobs have dead===undefined, so the old `pig.dead===false` fallback never fired
     and this silently reduced to a too-tight one-shot distance check.) */
  const pigBefore=V.entities.length;
  V.spawnMob('pig',px+5.5,py+1,pz+5.5);
  const pig=V.entities[pigBefore];
  const pig0=[pig.x,pig.z];
  let pigWander=0;
  for(let i=0;i<80;i++){V.frameStep(20000+i*50);pigWander=Math.max(pigWander,Math.hypot(pig.x-pig0[0],pig.z-pig0[1]));}
  ok('a pig wanders',!!pig&&!pig.dead&&pigWander>0.4);
  pig.hurtT=0;V.hurtMob(pig,999,0,0);
  ok('and can be dispatched',pig.dead===true);

  /* armor */
  V.P.armor=[null,null,null,null];
  V.P.inv[0]={id:V.armorId(2,1),count:1};V.P.sel=0;
  V.equipArmor();
  ok('armor equips and counts',V.P.armor[1]&&V.armorPts()===3.5);
  V.P.armor=[null,null,null,null];

  /* structures answer the compass */
  const park=V.cmpFind('park');
  ok('the compass finds a theme park',park&&park.ok&&park.d>0);
  ok('world structures exist in cells',(()=>{
    let n=0;
    for(let gx2=-3;gx2<=3;gx2++)for(let gz2=-3;gz2<=3;gz2++){
      if(V.wdCell(gx2,gz2))n++;
      if(V.lsCell(gx2,gz2))n++;
    }
    return n>2;
  })());

  /* save / load roundtrip */
  V.setBlock(px+3,py+4,pz+3,B.TCORE); /* marker (TITQ side effect harmless: consumed on tick) */
  V.setBlock(px+3,py+4,pz+3,B.AIR);
  V.setBlock(px+3,py+5,pz+3,B.SBRICK);
  V.GR.keepInv=true;
  await V.saveToStorage('seed1',true);
  V.setBlock(px+3,py+5,pz+3,B.AIR);
  V.GR.keepInv=false;
  await V.loadWorldByName('seed1');
  for(let i=0;i<20;i++)V.frameStep(30000+i*40);
  ok('saves round-trip blocks and gamerules',V.getBlock(px+3,py+5,pz+3)===B.SBRICK&&V.GR.keepInv===true);
  V.GR.keepInv=false;V.GR.snail=false;V.GR.jsc=0;

  /* settings memory */
  V.setRD(9);
  V.setRD(4,true);
  await V.loadSettings();
  ok('render distance is remembered',V.getRD()===9);
  V.setRD(4);

  /* the demon sleeps until visited */
  ok('Malgorath waits at 1000,1000',V.getDEMON().dead===false&&V.getCUT().on===false);

  /* ---- v1.x core runtime: held stack, inventory, damage, explode ----
     These paths lean on __vox internals restored by infra task #1. */
  V.P.mode='s';V.GR.god=false;V.P.dead=false;
  V.P.sel=0;V.P.inv[0]={id:B.STONE,count:5};
  ok('heldStack returns the selected slot',!!V.heldStack()&&V.heldStack().id===B.STONE&&V.heldStack().count===5);
  V.P.inv[1]={id:B.STONE,count:7};
  const stoneBefore=V.invCount(V.P.inv,B.STONE);
  ok('invConsume spans real inventory slots',V.invConsume(V.P.inv,B.STONE,10)===true&&V.invCount(V.P.inv,B.STONE)===stoneBefore-10);
  V.P.inv[0]=null;V.P.inv[1]=null;

  /* damagePlayer honours god mode; armour-free hit lands in full */
  V.P.armor=[null,null,null,null];
  V.P.hp=20;V.P.hurtT=0;V.GR.god=true;
  V.damagePlayer(5);
  ok('god mode ignores damagePlayer',V.P.hp===20);
  V.GR.god=false;V.P.hp=20;V.P.hurtT=0;
  V.damagePlayer(5);
  ok('mortals lose hearts to damagePlayer',V.P.hp===15);
  V.P.hp=20;V.P.hurtT=0;

  /* explode() from a non-mob source always craters (mobGriefing is mob-only) */
  const ex=gx,ey=gy+3,ez=gz;
  for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)for(let dz=-2;dz<=2;dz++)
    V.setBlock(ex+dx,ey+dy,ez+dz,B.STONE);
  for(let i=0;i<8;i++)V.frameStep(32000+i*45);
  V.GR.god=true;                       /* keep the rig alive; blast is centred on it */
  V.explode(ex+0.5,ey+0.5,ez+0.5,3,false);
  let holes=0;
  for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)for(let dz=-2;dz<=2;dz++)
    if(V.getBlock(ex+dx,ey+dy,ez+dz)===B.AIR)holes++;
  ok('a player-sourced explosion craters solid blocks',holes>20);
  V.GR.god=false;

  /* v2.4: patch notes panel renders the latest summary into its overlay */
  V.openPatch();
  const patchBody=document.getElementById('patchbody');
  ok('patch notes render into the panel',typeof patchBody.innerHTML==='string'&&patchBody.innerHTML.includes('v'+V.PATCH_NOTES.v)&&patchBody.innerHTML.includes('<li>'));
  ok('patch panel registers as an open modal',V.getPatch()===true&&V.modalOpen()===true);
  V.closePatch();
  ok('and clears when closed',V.getPatch()===false&&V.modalOpen()===false);

  /* ---- v2.5: 3D tool models in hand, on the arm, on the ground ---- */
  V.P.inv[0]={id:V.toolId(3,0),count:1,dur:780};V.P.sel=0;
  V.refreshHand();
  let hd=V.getHand();
  ok('a held pickaxe becomes a 3D model in the hand',hd.kind===V.toolId(3,0)&&hd.n===1&&hd.t3d===true);
  V.P.inv[1]={id:B.STONE,count:1};V.P.sel=1;
  V.refreshHand();
  hd=V.getHand();
  ok('held blocks keep their cube form (only tools swapped)',hd.kind===B.STONE&&hd.t3d===false);
  V.P.sel=0;V.refreshHand();
  /* third person: the player model carries the tool on its right arm */
  V.setCam(1);
  for(let i=0;i<5;i++)V.frameStep(33000+i*45);
  ok('the player model holds the tool in third person',V.getArmTool()===V.toolId(3,0));
  V.setCam(0);
  for(let i=0;i<5;i++)V.frameStep(33300+i*45);
  /* drops: tools fall as spinning 3D models; other items stay sprites */
  V.spawnDrop(V.P.x+4,V.P.y+1,V.P.z+4,{id:V.toolId(2,1),count:1},0,0,0);
  V.spawnDrop(V.P.x+4,V.P.y+1,V.P.z-4,{id:B.STONE,count:1},0,0,0);
  const tdrops=V.entities.filter(e=>e.t==='drop').slice(-2);
  ok('tool drops are 3D models, block drops stay sprites',tdrops.length===2&&tdrops[0].m3d===1&&tdrops[0].mesh.isT3D===true&&tdrops[1].m3d===0);
  for(let i=0;i<10;i++)V.frameStep(33600+i*45);
  const spun=V.entities.filter(e=>e.t==='drop'&&e.m3d===1).pop();
  ok('dropped tools spin where they lie',!spun||spun.mesh.rotation.y>0);
  V.P.inv[0]=null;V.P.inv[1]=null;V.refreshHand();

  /* ---- v2.6: 3D weapons, shaders, settings panel, persisted client settings ---- */
  V.P.inv[0]={id:205,count:1,dur:100};V.P.sel=0;   /* 205 = golden shotgun */
  V.refreshHand();
  let wh=V.getHand();
  ok('a held shotgun becomes a 3D model',wh.kind===205&&wh.t3d===true);
  V.P.inv[0]={id:IT.BOW,count:1,dur:120};V.refreshHand();
  wh=V.getHand();
  ok('the bow is a 3D model too (a crossbow, even)',wh.kind===IT.BOW&&wh.t3d===true);
  V.setCam(1);
  for(let i=0;i<5;i++)V.frameStep(34500+i*45);
  ok('third person carries the weapon on the arm',V.getArmTool()===IT.BOW);
  V.setCam(0);
  V.spawnDrop(V.P.x+5,V.P.y+1,V.P.z+5,{id:200,count:1},0,0,0);
  const gdrop=V.entities.filter(e=>e.t==='drop').pop();
  ok('gun drops are 3D models',gdrop.m3d===1&&gdrop.mesh.isT3D===true);
  /* shaders */
  ok('shaders start off',V.getSHD().on===false);
  V.setShaders(true);
  ok('shaders toggle on and build their pipeline',V.getSHD().on===true&&V.getSHD().ready===true);
  for(let i=0;i<5;i++)V.frameStep(34800+i*45);
  ok('the world keeps rendering through the post pass',V.playing===true);
  V.setShaders(false);
  /* settings panel is a proper modal */
  V.openSet();
  ok('settings panel registers as a modal',V.getSet()===true&&V.modalOpen()===true);
  V.closeSet();
  ok('and closes clean',V.getSet()===false&&V.modalOpen()===false);
  /* client settings persist */
  V.setSnd(false);V.setMus(false);V.saveSettings();
  V.setSnd(true);V.setMus(true);
  await V.loadSettings();
  ok('sound & music choices survive a reload',V.getSnd()===false&&V.getMus()===false);
  V.setSnd(true);V.setMus(true);V.saveSettings();
  V.P.inv[0]=null;V.refreshHand();

  /* ---- v2.7: real skateboard model ---- */
  V.spawnSkate(V.P.x+3,V.P.y+1,V.P.z+3,0);
  const sk=V.entities.filter(e=>e.t==='skate').pop();
  ok('skateboards ride the real model (own material, baked wheels)',
    !!sk&&sk.mats.length===1&&sk.wheels.length===0&&!!sk.mesh);

  /* ---- v2.7: the Subscribe Button boomerang, via the real doUse path ---- */
  for(const e of V.entities)
    if(e.t==='mob'&&!e.dead&&V.MOBT[e.mt].hostile&&Math.hypot(e.x-V.P.x,e.z-V.P.z)<40){e.hurtT=0;V.hurtMob(e,999,0,0);}
  V.GR.god=true;V.P.mode='s';V.P.useT=0;
  /* flat throwing range well above the terrain slope (the button bounces off walls) */
  const rgx=Math.floor(V.P.x),rgz=Math.floor(V.P.z),rgy=Math.floor(V.P.y)+14;
  for(let dx=-1;dx<=9;dx++)for(let dz=-2;dz<=2;dz++){
    V.setBlock(rgx+dx,rgy,rgz+dz,B.STONE);
    for(let dy=1;dy<=4;dy++)V.setBlock(rgx+dx,rgy+dy,rgz+dz,B.AIR);
  }
  V.P.x=rgx+0.5;V.P.z=rgz+0.5;V.P.y=rgy+1;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<15;i++)V.frameStep(35000+i*30);
  const sbx=rgx+5.5,sbz=rgz+0.5;
  V.spawnMob('pig',sbx,rgy+1.1,sbz);
  const target=V.entities[V.entities.length-1];
  const pigHP0=target.hp;
  V.P.yaw=Math.atan2(-(sbx-V.P.x),-(sbz-V.P.z));V.P.pitch=-0.18; /* aim at the pig, not the horizon */
  V.P.inv[0]={id:227,count:1,dur:64,ench:{viral:2}};V.P.sel=0;
  V.MB.r=false;
  for(let i=0;i<3;i++)V.frameStep(35500+i*45);
  V.MB.r=true;
  for(let i=0;i<4;i++)V.frameStep(35700+i*45);
  V.MB.r=false;
  const flying=V.entities.some(e=>e.t==='subb'&&!e.dead);
  ok('right-click hurls the Subscribe Button',flying&&V.P.inv[0]===null);
  for(let i=0;i<90;i++)V.frameStep(36000+i*45);
  ok('it smacks mobs on the way',target.dead===true||target.hp<pigHP0);
  ok('and boomerangs home with one durability spent',
    V.invCount(V.P.inv,227)===1&&(()=>{for(const s of V.P.inv)if(s&&s.id===227)return s.dur===63&&s.ench&&s.ench.viral===2;return false;})());
  for(const s of V.P.inv)if(s&&s.id===227){V.P.inv[V.P.inv.indexOf(s)]=null;}
  V.GR.god=false;

  /* ---- v2.7: caves keep their own light ---- */
  const cgx=Math.floor(V.P.x)+9,cgz=Math.floor(V.P.z)+9;
  const cci=V.colInfo(cgx,cgz);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let dy=0;dy<=2;dy++)
    V.setBlock(cgx+dx,cci.h-11+dy,cgz+dz,B.AIR);
  V.GR.god=true;
  V.P.x=cgx+0.5;V.P.z=cgz+0.5;V.P.y=cci.h-11;V.P.vx=V.P.vy=V.P.vz=0;
  V.setTime(0.25);
  for(let i=0;i<60;i++)V.frameStep(41000+i*45);
  const caveDay=V.getLight().amb;
  ok('the rig is actually underground',V.getUG()>0.8);
  V.setTime(0.75);
  for(let i=0;i<60;i++)V.frameStep(44000+i*45);
  const caveNight=V.getLight().amb;
  ok('cave light ignores the surface clock',Math.abs(caveDay-caveNight)<0.03);
  V.P.y=cci.h+8;V.P.vy=0;
  for(let i=0;i<70;i++)V.frameStep(47000+i*45);
  const surfNight=V.getLight().amb;
  V.setTime(0.25);
  for(let i=0;i<60;i++)V.frameStep(51000+i*45);
  const surfDay=V.getLight().amb;
  ok('the surface still follows the sun',V.getUG()<0.2&&surfDay-surfNight>0.15);
  V.GR.god=false;

  /* ---- v2.7: shaders drive real shadow maps ---- */
  ok('shadows off by default',V.getShadow()===false);
  V.setShaders(true);
  ok('fancy mode enables shadow maps',V.getShadow()===true);
  for(let i=0;i<5;i++)V.frameStep(54500+i*45);
  V.setShaders(false);
  ok('and they switch off cleanly',V.getShadow()===false);

  /* ---- v2.8: pause menu swaps to submenus instead of stacking ---- */
  V.pauseGame();
  const pauseDiv=document.getElementById('pause');
  ok('pausing shows the pause menu',V.getPaused()===true&&pauseDiv.style.display==='flex');
  document.getElementById('p_settings').onclick();
  ok('opening Settings hides the pause menu behind it',V.getSet()===true&&pauseDiv.style.display==='none');
  V.closeSet();
  ok('closing Settings brings the pause menu back',V.getSet()===false&&pauseDiv.style.display==='flex');
  document.getElementById('p_patch').onclick();
  ok('patch notes swap in the same way',V.getPatch()===true&&pauseDiv.style.display==='none');
  V.closePatch();
  ok('and swap back',pauseDiv.style.display==='flex');
  V.resumeGame();

  /* ---- v2.8: subscribe button is a store exclusive ---- */
  V.P.db=5000;
  const dbBefore=V.P.db;
  ok('the store sells the Subscribe Button',V.storeBuy('joke_subbtn')===true&&V.P.db===dbBefore-1287&&V.invCount(V.P.inv,227)===1);
  for(let i=0;i<V.P.inv.length;i++)if(V.P.inv[i]&&V.P.inv[i].id===227)V.P.inv[i]=null;

  /* ---- v2.8: skateboard + subscribe button render 3D in hand ---- */
  V.P.inv[0]={id:IT.SKATE,count:1};V.P.sel=0;V.refreshHand();
  ok('a held skateboard is a 3D deck',V.getHand().t3d===true);
  V.P.inv[0]={id:227,count:1,dur:64};V.refreshHand();
  ok('a held Subscribe Button is a 3D button',V.getHand().t3d===true);
  V.setCam(1);
  for(let i=0;i<4;i++)V.frameStep(56000+i*45);
  ok('and rides the arm in third person',V.getArmTool()===227);
  V.setCam(0);
  V.P.inv[0]=null;V.refreshHand();

  /* ---- v2.8: the boomerang fetches dropped items ---- */
  const fgx=Math.floor(V.P.x),fgz=Math.floor(V.P.z),fgy=Math.floor(V.P.y)+14;
  for(let dx=-1;dx<=9;dx++)for(let dz=-2;dz<=2;dz++){
    V.setBlock(fgx+dx,fgy,fgz+dz,B.STONE);
    for(let dy=1;dy<=4;dy++)V.setBlock(fgx+dx,fgy+dy,fgz+dz,B.AIR);
  }
  V.GR.god=true;
  V.P.x=fgx+0.5;V.P.z=fgz+0.5;V.P.y=fgy+1;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<15;i++)V.frameStep(56500+i*30);
  const stoneBefore2=V.invCount(V.P.inv,B.STONE);
  V.spawnDrop(fgx+5.5,fgy+1.4,fgz+0.5,{id:B.STONE,count:3},0,0,0);
  for(let i=0;i<14;i++)V.frameStep(57000+i*45);   /* let the drop age past the pickup gate */
  V.P.yaw=Math.atan2(-5,0);V.P.pitch=-0.14;
  V.P.inv[0]={id:227,count:1,dur:64};V.P.sel=0;V.P.useT=0;
  V.MB.r=false;
  for(let i=0;i<3;i++)V.frameStep(57700+i*45);
  V.MB.r=true;
  for(let i=0;i<4;i++)V.frameStep(57900+i*45);
  V.MB.r=false;
  for(let i=0;i<90;i++)V.frameStep(58200+i*45);
  ok('the boomerang fetches dropped items on its way',
    V.invCount(V.P.inv,B.STONE)===stoneBefore2+3&&V.invCount(V.P.inv,227)===1);
  V.GR.god=false;
  for(let i=0;i<V.P.inv.length;i++)if(V.P.inv[i]&&V.P.inv[i].id===227)V.P.inv[i]=null;

  /* ---- v2.9: armor visible on the player model ---- */
  V.P.armor=[{id:V.armorId(2,0)},null,{id:V.armorId(3,2)},null];
  V.setCam(1);
  for(let i=0;i<4;i++)V.frameStep(62400+i*45);
  let av=V.getArmVis();
  ok('equipped armor shows on the model (helmet + leggings only)',
    !!av&&av[0]===true&&av[1]===false&&av[2]===true&&av[3]===false);
  V.P.armor=[null,null,null,null];
  for(let i=0;i<4;i++)V.frameStep(62700+i*45);
  av=V.getArmVis();
  ok('and vanishes when unequipped',!!av&&av.every(v=>v===false));
  V.setCam(0);

  /* ---- v2.9: DIRTARIA on the Gaming Rig ---- */
  V.P.db=9000;
  ok('the store sells DIRTARIA',V.storeBuy('joke_terr')===true&&V.invCount(V.P.inv,B.TERM)===1);
  for(let i=0;i<V.P.inv.length;i++)if(V.P.inv[i]&&V.P.inv[i].id===B.TERM)V.P.inv[i]=null;
  const tx2=Math.floor(V.P.x)+2,ty2=Math.floor(V.P.y)+1,tz2=Math.floor(V.P.z)+2;
  V.setBlock(tx2,ty2,tz2,B.TERM);
  V.openTerrAt(tx2,ty2,tz2);
  let tg=V.getTG();
  ok('the rig boots a generated 2D world',tg.on===true&&tg.hasT===true&&V.modalOpen()===true);
  ok('the world has terrain layers',(()=>{
    let stone=0,dirt=0,air=0;
    for(let y=0;y<tg.h;y++)for(let x=0;x<tg.w;x+=4){
      const v=V.terrTile(x,y);
      if(v===3)stone++;else if(v===1)dirt++;else if(v===0)air++;
    }
    return stone>200&&dirt>50&&air>200;
  })());
  for(let i=0;i<30;i++)V.frameStep(63000+i*45);
  tg=V.getTG();
  ok('the 2D player exists and has settled somewhere sane',tg.on===true&&tg.py>0&&tg.py<tg.h&&tg.hp===10);
  /* saves persist in the rig */
  V.terrPoke(3,3,6);
  V.closeTerr();
  ok('powering off closes the game',V.getTG().on===false&&V.modalOpen()===false);
  V.openTerrAt(tx2,ty2,tz2);
  ok('the rig remembers its save',V.terrTile(3,3)===6);
  V.closeTerr();
  /* and the save survives a full world save/load */
  await V.saveToStorage('seed1',true);
  await V.loadWorldByName('seed1');
  for(let i=0;i<20;i++)V.frameStep(65000+i*45);
  V.openTerrAt(tx2,ty2,tz2);
  V.GR.snail=false;V.GR.jsc=0;
  ok('DIRTARIA saves survive world save/load',V.getTG().on===true&&V.terrTile(3,3)===6);
  V.closeTerr();
  /* genuine v1-format save (synthesized): 160x96, must load at its own size */
  {const rle=[];let n2=160*96;while(n2>0){const c3=Math.min(255,n2);rle.push(0,c3);n2-=c3;}
   V.blockEnts.set('9,-9,9',{t:'terr',terr:{v:1,d:V.b64enc(new Uint8Array(rle)),px:80,py:40,hp:9,tm:0.3,sel:1,binv:{1:2},ore:0,sx:80,sy:40}});
   V.openTerrAt(9,-9,9);
   ok('old v1 saves still load at their original size',V.getTG().w===160&&V.getTG().h===96&&V.getTG().hp===9);
   V.closeTerr();}

  /* ---- v2.10: DIRTARIA v2 — fresh world, trees, crafting, jump isolation ---- */
  const tx3=tx2+2;
  V.setBlock(tx3,ty2,tz2,B.TERM);
  V.openTerrAt(tx3,ty2,tz2);
  let tg2=V.getTG();
  ok('new worlds are the v2 size',tg2.w===220&&tg2.h===110);
  ok('the surface grew trees',(()=>{
    let wood=0,leaves=0;
    for(let y=0;y<tg2.h;y++)for(let x=0;x<tg2.w;x+=2){
      const v=V.terrTile(x,y);
      if(v===7)wood++;else if(v===8)leaves++;
    }
    return wood>8&&leaves>10;
  })());
  /* crafting: wood -> planks -> torches, then a stone pick */
  V.terrGive(7,4);V.terrGive(3,10);
  const inv0=V.getTGX();
  ok('crafting planks consumes wood',V.terrCraft('planks')===true&&V.getTGX().binv[9]===inv0.binv[9]+4&&V.getTGX().binv[7]===inv0.binv[7]-1);
  ok('crafting torches consumes planks',V.terrCraft('torch')===true&&V.getTGX().binv[6]===inv0.binv[6]+2);
  ok('the stone pick upgrades the tool tier',V.terrCraft('spick')===true&&V.getTGX().pick===1);
  ok('and cannot be crafted twice',V.terrCraft('spick')===false);
  ok('the trophy is out of reach without 15 ore',V.terrCraft('trophy')===false);
  V.terrGive('ore',15);
  ok('15 ore wins the game',V.terrCraft('trophy')===true&&V.getTGX().won===true);
  /* jump isolation: Space moves the 2D gamer, not the 3D body.
     Build a poked platform so spawn-terrain luck can't fail the rig. */
  for(let x2=18;x2<=26;x2++){V.terrPoke(x2,60,3);for(let y2=56;y2<60;y2++)V.terrPoke(x2,y2,0);}
  V.terrWarp(22,58.5);
  for(let i=0;i<25;i++)V.frameStep(67000+i*45);   /* settle both players */
  const outerY=V.P.y,outerG=V.P.onGround;
  const py0=V.getTG().py;
  let jumped=false;
  V.KEY.Space=true;
  for(let i=0;i<20;i++){
    V.frameStep(68500+i*45);
    if(V.getTG().py<py0-1)jumped=true;
  }
  V.KEY.Space=false;
  ok('Space makes the DIRTARIA player jump',jumped);
  ok('while the outer body stays grounded',V.P.onGround===outerG&&Math.abs(V.P.y-outerY)<0.6);
  V.closeTerr();

  /* ---- v2.11: patch archive, inescapable help, mouse capture ---- */
  V.openPatch();
  const pb2=document.getElementById('patchbody').innerHTML;
  ok('the patch panel shows the whole archive',pb2.includes('v'+V.GAME_VERSION)&&pb2.includes('v2.10'));
  V.closePatch();
  V.openHelp();
  ok('help registers as a modal you cannot Esc out of',V.getHelp()===true&&V.modalOpen()===true);
  V.closeHelp();
  ok('but the Close button still works',V.getHelp()===false&&V.modalOpen()===false);
  ok('mouse capture starts on',V.getLock()===true);
  V.setLock(false);V.saveSettings();
  V.setLock(true);
  await V.loadSettings();
  ok('mouse capture choice survives a reload',V.getLock()===false);
  V.setLock(true);V.saveSettings();

  /* ---- v2.12: x-ray sees only diamonds ---- */
  ok('x-ray starts off',V.getXR().on===false);
  V.setBlock(Math.floor(V.P.x)+3,Math.floor(V.P.y)+1,Math.floor(V.P.z)+3,B.DIA_ORE);
  V.toggleXray();
  V.xrayRefresh();
  const xr1=V.getXR();
  ok('x-ray lights up nearby diamond ore',xr1.on===true&&xr1.n>=1);
  V.toggleXray();
  ok('and cleans up after itself',V.getXR().on===false&&V.getXR().n===0);
  V.setBlock(Math.floor(V.P.x)+3,Math.floor(V.P.y)+1,Math.floor(V.P.z)+3,B.AIR);

  /* ---- v2.13: battle pass pause ---- */
  V.P.db=2000;
  ok('buying the battle pass activates it',V.storeBuy('joke_bpass')===true&&V.P.bp===true);
  const dbAfterBuy=V.P.db;
  ok('the owned button pauses it for free',V.storeBuy('joke_bpass')===true&&V.P.bp===false&&V.P.db===dbAfterBuy);
  ok('and resumes it again',V.storeBuy('joke_bpass')===true&&V.P.bp===true&&V.P.db===dbAfterBuy);
  V.storeBuy('joke_bpass'); /* leave it paused so later frames stay quiet */

  /* ---- v3.0 batch 1: dimensions ---- */
  const homeX=V.P.x,homeY=V.P.y,homeZ=V.P.z;
  /* a pig left behind should be waiting when we return */
  const stashBefore=V.entities.length;
  V.spawnMob('pig',V.P.x+2.5,V.P.y+1,V.P.z+2.5);
  V.setDim('nether',300.5,40,300.5);
  ok('travel to the nether swaps dimension and clears entities',
    V.getDim()==='nether'&&!V.entities.some(e=>e.t==='mob'&&!e.dead));
  for(let i=0;i<50;i++)V.frameStep(72000+i*45);
  ok('the nether is made of netherrock',V.countBlockNear(B.NETHROCK,2,79)>2000);
  ok('with a lava sea at the bottom',V.countBlockNear(B.LAVA,2,11)>200);
  ok('and glowstone in the dark',V.countBlockNear(B.GLOWSTONE,12,75)>0);
  /* stand on the nether floor */
  const nc=V.nCol(300,300);
  ok('nether columns have floor and ceiling',nc.f>=4&&nc.c>nc.f+8);
  /* return home first: unstash should put the pig back beside us */
  V.setDim('over',homeX,homeY,homeZ);
  ok('entities stashed on travel came back',V.entities.some(e=>e.t==='mob'&&e.mt==='pig'&&!e.dead));
  for(const e of V.entities)if(e.t==='mob'&&!e.dead&&e.mt==='pig'){e.hurtT=0;V.hurtMob(e,999,0,0);}
  /* aether: find a real island deterministically, then go stand on it */
  V.setDim('aether',300.5,50,300.5);
  ok('travel to the aether',V.getDim()==='aether');
  let isl=null;
  for(let dx=-80;dx<=80&&!isl;dx+=4)for(let dz=-80;dz<=80&&!isl;dz+=4){
    const a=V.aCol(300+dx,300+dz);
    if(a)isl=[300+dx,300+dz,a];
  }
  ok('the aether generates islands',!!isl);
  /* keep the rig alive and the island quiet through setup, or a stray spawn can
     kill the player before the fall and the fall-out teleport never fires */
  V.GR.god=true;V.GR.mobSpawn=false;
  V.setDim('aether',isl[0]+0.5,isl[2].t+3,isl[1]+0.5);
  V.P.dead=false;V.P.hp=20;
  for(let i=0;i<40;i++)V.frameStep(75000+i*45);
  ok('islands are cloudstone capped with sky grass',
    V.getBlock(isl[0],isl[2].t,isl[1])===B.SKYGRASS||V.getBlock(isl[0],isl[2].t,isl[1])===B.CLOUDSTONE);
  ok('the player can stand on an island',V.P.onGround===true);
  /* fall off the world (god on: the landing is the overworld's problem) */
  V.P.dead=false;V.P.hp=20;
  V.P.y=1.2;V.P.vy=-5;
  for(let i=0;i<6;i++)V.frameStep(77000+i*45);
  ok('falling off the aether dumps you into the overworld sky',V.getDim()==='over'&&V.P.y>55);
  for(let i=0;i<80;i++)V.frameStep(77400+i*45);
  ok('and gravity does the rest',V.P.y<70);
  V.GR.mobSpawn=true;
  /* overworld cave-bottoms now hold lava (fresh chunks far away) */
  V.setDim('over',homeX+500,70,homeZ+500);
  for(let i=0;i<70;i++)V.frameStep(83000+i*45);
  ok('overworld caves bottom out in lava lakes',V.countBlockNear(B.LAVA,1,8)>0);
  V.setDim('over',homeX,homeY,homeZ);
  for(let i=0;i<20;i++)V.frameStep(87000+i*45);

  /* ---- v3.0 batch 2: buckets, obsidian chemistry, portals ---- */
  V.GR.god=true;V.P.mode='s';V.P.dead=false;V.P.hp=20;V.P.hurtT=0;
  const bgx=Math.floor(V.P.x),bgz=Math.floor(V.P.z),bgy=Math.floor(V.P.y)+16;
  for(let dx=-2;dx<=10;dx++)for(let dz=-4;dz<=4;dz++){
    V.setBlock(bgx+dx,bgy,bgz+dz,B.STONE);
    for(let dy=1;dy<=7;dy++)V.setBlock(bgx+dx,bgy+dy,bgz+dz,B.AIR);
  }
  V.P.x=bgx+0.5;V.P.z=bgz+0.5;V.P.y=bgy+1;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<12;i++)V.frameStep(90000+i*40);
  /* scoop water */
  V.setBlock(bgx+3,bgy+1,bgz,B.WATER);
  V.P.yaw=Math.atan2(-3,0);V.P.pitch=-0.25;
  V.P.inv[0]={id:IT.BUCKET,count:1};V.P.sel=0;V.P.useT=0;
  V.MB.r=false;for(let i=0;i<3;i++)V.frameStep(90600+i*40);
  V.MB.r=true;for(let i=0;i<4;i++)V.frameStep(90800+i*40);
  V.MB.r=false;
  ok('an empty bucket scoops water',V.P.inv[0].id===IT.BUCKET_W&&V.getBlock(bgx+3,bgy+1,bgz)===B.AIR);
  /* pour water beside lava -> obsidian */
  V.setBlock(bgx+3,bgy+1,bgz,B.LAVA);
  V.P.useT=0;
  V.MB.r=false;for(let i=0;i<3;i++)V.frameStep(91200+i*40);
  V.MB.r=true;for(let i=0;i<4;i++)V.frameStep(91400+i*40);
  V.MB.r=false;
  ok('water meeting lava quenches it to obsidian',V.getBlock(bgx+3,bgy+1,bgz)===B.OBSIDIAN&&V.P.inv[0].id===IT.BUCKET);
  /* nether portal: obsidian frame + torch */
  const fx2=bgx+6,fy2=bgy+1,fz2=bgz;
  for(let i=0;i<2;i++){V.setBlock(fx2+i,fy2-1,fz2,B.OBSIDIAN);V.setBlock(fx2+i,fy2+3,fz2,B.OBSIDIAN);}
  for(let j=0;j<3;j++){V.setBlock(fx2-1,fy2+j,fz2,B.OBSIDIAN);V.setBlock(fx2+2,fy2+j,fz2,B.OBSIDIAN);}
  V.P.x=fx2-3.5;V.P.z=fz2+0.5;V.P.y=bgy+1;
  V.P.yaw=Math.atan2(-1,0);V.P.pitch=0; /* face +x at the side pillar */
  V.P.inv[0]={id:B.TORCH,count:2};V.P.useT=0;
  V.MB.r=false;for(let i=0;i<3;i++)V.frameStep(92000+i*40);
  V.MB.r=true;for(let i=0;i<4;i++)V.frameStep(92200+i*40);
  V.MB.r=false;
  let pcount=0;
  for(let i=0;i<2;i++)for(let j=0;j<3;j++)if(V.getBlock(fx2+i,fy2+j,fz2)===B.PORTAL_N)pcount++;
  ok('a torch lights the obsidian frame',pcount===6);
  /* step in and go to hell */
  V.P.x=fx2+0.5;V.P.z=fz2+0.5;V.P.y=fy2+0.2;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<40;i++)V.frameStep(93000+i*45);
  ok('standing in the portal takes you to the Nether',V.getDim()==='nether');
  ok('with a return portal waiting',(()=>{
    for(let dx=-9;dx<=9;dx++)for(let dy=-6;dy<=6;dy++)for(let dz=-9;dz<=9;dz++)
      if(V.getBlock(Math.floor(V.P.x)+dx,Math.floor(V.P.y)+dy,Math.floor(V.P.z)+dz)===B.PORTAL_N)return true;
    return false;
  })());
  /* cool down, then ride it home */
  for(let i=0;i<55;i++)V.frameStep(95000+i*45);
  let rp=null;
  for(let dx=-9;dx<=9&&!rp;dx++)for(let dy=-6;dy<=6&&!rp;dy++)for(let dz=-9;dz<=9&&!rp;dz++)
    if(V.getBlock(Math.floor(V.P.x)+dx,Math.floor(V.P.y)+dy,Math.floor(V.P.z)+dz)===B.PORTAL_N)
      rp=[Math.floor(V.P.x)+dx,Math.floor(V.P.y)+dy,Math.floor(V.P.z)+dz];
  V.P.x=rp[0]+0.5;V.P.z=rp[2]+0.5;V.P.y=rp[1]+0.2;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<40;i++)V.frameStep(98000+i*45);
  ok('and the return portal brings you home',V.getDim()==='over');
  /* douse the old nether portal so it can't contaminate the next rig */
  for(let i=0;i<2;i++)for(let j=0;j<3;j++)V.setBlock(fx2+i,fy2+j,fz2,B.AIR);
  /* aether portal: glowstone frame + water bucket */
  const ax2=bgx+2,ay2=bgy+1,az2=bgz+3;
  for(let i=0;i<2;i++){V.setBlock(ax2+i,ay2-1,az2,B.GLOWSTONE);V.setBlock(ax2+i,ay2+3,az2,B.GLOWSTONE);}
  for(let j=0;j<3;j++){V.setBlock(ax2-1,ay2+j,az2,B.GLOWSTONE);V.setBlock(ax2+2,ay2+j,az2,B.GLOWSTONE);}
  V.P.x=ax2+0.5;V.P.z=az2-2.5;V.P.y=bgy+1;V.P.vx=V.P.vy=V.P.vz=0;
  V.P.yaw=Math.atan2(0,-1);V.P.pitch=0; /* face +z into the frame */
  V.P.inv[0]={id:IT.BUCKET_W,count:1};V.P.useT=0;
  for(let i=0;i<10;i++)V.frameStep(100000+i*40); /* let portal cooldown clear */
  V.MB.r=false;for(let i=0;i<3;i++)V.frameStep(100500+i*40);
  V.MB.r=true;for(let i=0;i<4;i++)V.frameStep(100700+i*40);
  V.MB.r=false;
  let acount=0;
  for(let i=0;i<2;i++)for(let j=0;j<3;j++)if(V.getBlock(ax2+i,ay2+j,az2)===B.PORTAL_A)acount++;
  ok('water poured into a glowstone frame opens the Aether',acount===6&&V.P.inv[0].id===IT.BUCKET);
  V.P.x=ax2+0.5;V.P.z=az2+0.5;V.P.y=ay2+0.2;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<40;i++)V.frameStep(101500+i*45);
  ok('and carries you up to the islands',V.getDim()==='aether');
  V.setDim('over',homeX,homeY,homeZ);
  V.P.inv[0]=null;V.GR.god=false;
  for(let i=0;i<15;i++)V.frameStep(104000+i*45);

  /* ---- v3.0 batch 3: fortresses, shrines, bosses ---- */
  let fort=null;
  for(let gx3=-3;gx3<=3&&!fort;gx3++)for(let gz3=-3;gz3<=3&&!fort;gz3++){
    const c=V.nfCell(gx3,gz3);if(c)fort=c;
  }
  ok('nether fortress cells exist',!!fort);
  V.GR.god=true;
  V.setDim('nether',fort.cx+0.5,30,fort.cz+0.5);
  for(let i=0;i<60;i++)V.frameStep(106000+i*45);
  ok('the fortress is built of nether brick',V.countBlockNear(B.NBRICK,20,40)>200);
  ok('INFERNIS holds the keep',V.entities.some(e=>e.t==='mob'&&e.mt==='infernis'&&!e.dead));
  ok('with loot chests placed',V.getBlock(fort.cx,28,fort.cz)===B.CHEST);
  ok('fortress discovery persists',V.getNSEEN().size>=1);
  let shr=null;
  for(let gx3=-4;gx3<=4&&!shr;gx3++)for(let gz3=-4;gz3<=4&&!shr;gz3++){
    const c=V.asCell(gx3,gz3);if(c)shr=c;
  }
  ok('aether shrine cells exist',!!shr);
  V.setDim('aether',shr.cx+0.5,shr.y+3,shr.cz+0.5);
  for(let i=0;i<60;i++)V.frameStep(109000+i*45);
  ok('the shrine stands in white aether brick',V.countBlockNear(B.ABRICK,30,75)>30);
  ok('VALKYRA guards it',V.entities.some(e=>e.t==='mob'&&e.mt==='valkyra'&&!e.dead));
  ok('shrine discovery persists',V.getASEEN().size>=1);
  V.setDim('over',homeX,homeY,homeZ);
  for(const e of V.entities)if(e.t==='mob'&&!e.dead){e.hurtT=0;V.hurtMob(e,999,0,0);}
  V.GR.god=false;
  for(let i=0;i<15;i++)V.frameStep(112000+i*45);

  /* ---- v3.0 batch 4: gadgets ---- */
  const ggx=Math.floor(V.P.x),ggz=Math.floor(V.P.z),ggy=Math.floor(V.P.y)+16;
  for(let dx=-3;dx<=9;dx++)for(let dz=-3;dz<=3;dz++){
    V.setBlock(ggx+dx,ggy,ggz+dz,B.STONE);
    for(let dy=1;dy<=14;dy++)V.setBlock(ggx+dx,ggy+dy,ggz+dz,B.AIR);
  }
  V.P.x=ggx+0.5;V.P.z=ggz+0.5;V.P.y=ggy+1;V.P.vx=V.P.vy=V.P.vz=0;V.P.mode='s';
  for(let i=0;i<12;i++)V.frameStep(113000+i*40);
  /* double jump: boots anywhere in the inventory */
  V.P.inv[8]={id:265,count:1};
  V.KEY.Space=true;
  for(let i=0;i<3;i++)V.frameStep(113600+i*40);
  V.KEY.Space=false;
  for(let i=0;i<4;i++)V.frameStep(113750+i*40);
  V.KEY.Space=true;
  let djBoost=false;
  for(let i=0;i<6;i++){V.frameStep(113950+i*40);if(!V.P.onGround&&V.P.vy>7)djBoost=true;}
  V.KEY.Space=false;
  ok('double-jump boots grant a second jump mid-air',djBoost);
  for(let i=0;i<30;i++)V.frameStep(114300+i*40);
  V.P.inv[8]=null;
  /* loot magnet pulls from across the room */
  V.P.inv[8]={id:269,count:1};
  const stB4=V.invCount(V.P.inv,B.STONE);
  V.spawnDrop(ggx+6.5,ggy+1.5,ggz+0.5,{id:B.STONE,count:2},0,0,0);
  for(let i=0;i<50;i++)V.frameStep(116000+i*40);
  ok('the loot magnet pulls drops from afar',V.invCount(V.P.inv,B.STONE)===stB4+2);
  V.P.inv[8]=null;
  /* blink pearl teleports forward */
  V.P.inv[0]={id:272,count:1};V.P.sel=0;
  V.P.yaw=Math.atan2(-1,0);V.P.pitch=0;
  const bx4=V.P.x;
  V.P.useT=0;
  V.MB.r=false;for(let i=0;i<3;i++)V.frameStep(118500+i*40);
  V.MB.r=true;for(let i=0;i<3;i++)V.frameStep(118700+i*40);
  V.MB.r=false;
  ok('the blink pearl teleports you forward',V.P.x-bx4>4);
  V.P.x=ggx+0.5;V.P.z=ggz+0.5;V.P.vx=V.P.vy=V.P.vz=0;
  /* pig cannon deploys pig at speed */
  V.P.inv[0]={id:274,count:1};V.P.useT=0;
  const pigsB4=V.entities.filter(e=>e.t==='mob'&&e.mt==='pig'&&!e.dead).length;
  V.MB.r=false;for(let i=0;i<3;i++)V.frameStep(119200+i*40);
  V.MB.r=true;for(let i=0;i<3;i++)V.frameStep(119400+i*40);
  V.MB.r=false;
  const newPigs=V.entities.filter(e=>e.t==='mob'&&e.mt==='pig'&&!e.dead);
  ok('the pig cannon deploys one (1) live pig at speed',
    newPigs.length===pigsB4+1&&newPigs.some(p2=>Math.abs(p2.vx)>8||Math.abs(p2.vz)>8));
  for(const e of V.entities)if(e.t==='mob'&&e.mt==='pig'&&!e.dead){e.hurtT=0;V.hurtMob(e,999,0,0);}
  /* pocket trampoline: big fall, zero damage */
  V.P.inv[0]=null;V.P.inv[8]={id:271,count:1};
  V.GR.fallDmg=true;V.P.hp=20;V.P.fallD=0;
  V.P.x=ggx+0.5;V.P.z=ggz+0.5;V.P.y=ggy+13;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<50;i++)V.frameStep(121000+i*40);
  ok('the pocket trampoline turns falls into bounces',V.P.hp===20);
  ok('gadgets held in hand are 3D models',(()=>{
    V.P.inv[0]={id:266,count:1};V.P.sel=0;V.refreshHand();
    const r=V.getHand().t3d===true;
    V.P.inv[0]=null;V.refreshHand();
    return r;})());
  V.P.inv[8]=null;

  /* ---- v3.1: laser eyes melt terrain and triple their damage ---- */
  V.P.pow.u.laser=1;V.P.pow.a.laser=1;
  V.P.yaw=Math.atan2(-1,0);V.P.pitch=0;
  const lwx=Math.floor(V.P.x)+4,lwy=Math.floor(V.P.y)+1,lwz=Math.floor(V.P.z);
  V.setBlock(lwx,lwy,lwz,B.STONE);
  V.setBlock(lwx,lwy+1,lwz,B.STONE);
  V.fireLaser();
  ok('the laser vaporizes the block it touches',
    V.getBlock(lwx,lwy+1,lwz)===B.AIR||V.getBlock(lwx,lwy,lwz)===B.AIR);
  const lbeam=V.entities.filter(e=>e.t==='beam').pop();
  ok('the beam is the new thick glowing kind',!!lbeam&&lbeam.thick===1&&lbeam.mesh.children.length===2);
  V.setBlock(lwx,lwy,lwz,B.AIR);V.setBlock(lwx,lwy+1,lwz,B.AIR);
  V.spawnMob('pig',V.P.x+4,V.P.y+1,V.P.z);
  const lpig=V.entities[V.entities.length-1];
  V.fireLaser();
  ok('and hits like a boss-tier weapon',lpig.dead===true||lpig.hp<=V.MOBT.pig.hp-12);
  if(!lpig.dead){lpig.hurtT=0;V.hurtMob(lpig,999,0,0);}
  V.P.pow.a.laser=0;
  for(let i=0;i<10;i++)V.frameStep(124000+i*45);

  /* ---- v3.2: bosses stay at work ---- */
  V.GR.god=true;
  let fort2=null;
  for(let gx4=-4;gx4<=4&&!fort2;gx4++)for(let gz4=-4;gz4<=4&&!fort2;gz4++){
    const c=V.nfCell(gx4,gz4);
    if(c&&(!fort||c.id!==fort.id))fort2=c;
  }
  ok('a second fortress exists to test with',!!fort2);
  V.setDim('nether',fort2.cx+0.5,30,fort2.cz+0.5);
  for(let i=0;i<45;i++)V.frameStep(126000+i*45);
  const inf1=V.entities.filter(e=>e.t==='mob'&&e.mt==='infernis'&&!e.dead&&e.cellId===fort2.id);
  ok('INFERNIS spawns when you actually arrive',inf1.length===1);
  /* walk far away: he must NOT be distance-culled */
  V.setDim('nether',fort2.cx+100.5,40,fort2.cz+0.5);
  for(let i=0;i<70;i++)V.frameStep(129000+i*45);
  ok('and refuses to be despawned from afar',
    V.entities.some(e=>e.t==='mob'&&e.mt==='infernis'&&!e.dead&&e.cellId===fort2.id));
  /* come back: still exactly one, no clones */
  V.setDim('nether',fort2.cx+0.5,30,fort2.cz+0.5);
  for(let i=0;i<45;i++)V.frameStep(133000+i*45);
  ok('returning does not clone the boss',
    V.entities.filter(e=>e.t==='mob'&&e.mt==='infernis'&&!e.dead&&e.cellId===fort2.id).length===1);
  /* kill him: the kill is recorded and permanent */
  for(const e of V.entities)if(e.t==='mob'&&e.mt==='infernis'&&!e.dead&&e.cellId===fort2.id){
    while(!e.dead){e.hurtT=0;e.inv=0;V.hurtMob(e,999,0,0);}
  }
  ok('the kill goes on his permanent record',V.getINFKILL().size>=1);
  V.setDim('nether',fort2.cx+90.5,40,fort2.cz+0.5);
  for(let i=0;i<40;i++)V.frameStep(136000+i*45);
  V.setDim('nether',fort2.cx+0.5,30,fort2.cz+0.5);
  for(let i=0;i<45;i++)V.frameStep(138000+i*45);
  ok('slain stays slain',!V.entities.some(e=>e.t==='mob'&&e.mt==='infernis'&&!e.dead&&e.cellId===fort2.id));
  V.setDim('over',homeX,homeY,homeZ);
  for(const e of V.entities)if(e.t==='mob'&&!e.dead){e.hurtT=0;V.hurtMob(e,999,0,0);}
  V.GR.god=false;
  for(let i=0;i<10;i++)V.frameStep(141000+i*45);

  /* ---- v3.3: placeable trampolines ---- */
  V.GR.mobSpawn=false;
  for(const e of V.entities)if(e.t==='mob'&&!e.dead){e.hurtT=0;V.hurtMob(e,999,0,0);}
  const tgx2=Math.floor(V.P.x),tgz2=Math.floor(V.P.z),tgy2=Math.floor(V.P.y)+16;
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
    V.setBlock(tgx2+dx,tgy2,tgz2+dz,B.STONE);
    for(let dy=1;dy<=15;dy++)V.setBlock(tgx2+dx,tgy2+dy,tgz2+dz,B.AIR);
  }
  V.setBlock(tgx2,tgy2+1,tgz2,B.TRAMP);
  V.GR.fallDmg=true;V.P.hp=20;V.P.fallD=0;V.P.hurtT=0;V.P.mode='s';
  V.P.x=tgx2+0.5;V.P.z=tgz2+0.5;V.P.y=tgy2+13;V.P.vx=V.P.vy=V.P.vz=0;
  let bounced=false,peakAfter=0,landed=false;
  for(let i=0;i<90;i++){
    V.frameStep(142000+i*45);
    if(V.P.vy>4&&V.P.y<tgy2+9)bounced=true;
    if(bounced)peakAfter=Math.max(peakAfter,V.P.y);
  }
  ok('landing on a trampoline launches you back up',bounced&&peakAfter>tgy2+4.5);
  ok('and costs zero hearts',V.P.hp===20);
  /* mobs bounce forever */
  V.GR.god=true;
  V.spawnMob('pig',tgx2+0.5,tgy2+6,tgz2+0.5);
  const bpig=V.entities[V.entities.length-1];
  let pigAir=false;
  for(let i=0;i<80;i++){
    V.frameStep(147000+i*45);
    if(bpig.vy>3)pigAir=true;
  }
  ok('mobs bounce on trampolines indefinitely',pigAir&&!bpig.dead);
  bpig.hurtT=0;V.hurtMob(bpig,999,0,0);
  V.setBlock(tgx2,tgy2+1,tgz2,B.AIR);
  V.GR.god=false;

  /* ---- v3.4: climbing claws mantle the ledge instead of bobbing ---- */
  const cwx=tgx2,cwy=tgy2,cwz=tgz2;
  for(let dy2=1;dy2<=3;dy2++)for(let dxw=2;dxw<=4;dxw++)V.setBlock(cwx+dxw,cwy+dy2,cwz,B.STONE); /* 3-high, 3-deep wall */
  V.P.inv[8]={id:270,count:1};
  V.P.x=cwx+0.7;V.P.z=cwz+0.5;V.P.y=cwy+1;V.P.vx=V.P.vy=V.P.vz=0;
  V.P.yaw=Math.atan2(-1,0);V.P.pitch=0; /* face +x into the wall */
  V.GR.god=true;
  V.KEY.KeyW=true;V.KEY.Space=true; /* run at the wall and jump; claws catch in the air */
  let climbPeak=0;
  for(let i=0;i<90;i++){
    V.frameStep(152000+i*45);
    climbPeak=Math.max(climbPeak,V.P.y);
  }
  const topped=climbPeak>=cwy+4.2; /* feet clear the 3-high lip; the old code bobbed at ~+3 */
  V.KEY.KeyW=false;V.KEY.Space=false;
  ok('climbing claws mantle you onto the ledge, no bobbing',topped);
  V.P.inv[8]=null;
  for(let dy2=1;dy2<=3;dy2++)for(let dxw=2;dxw<=4;dxw++)V.setBlock(cwx+dxw,cwy+dy2,cwz,B.AIR);

  /* ---- v3.5: the grab bag (quiet world: spawns off, god on) ---- */
  const gbx=cwx,gby=cwy,gbz=cwz;
  V.P.x=gbx+0.5;V.P.z=gbz+0.5;V.P.y=gby+1;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<10;i++)V.frameStep(158000+i*40);
  /* living blocks: find a fated coordinate on the pad */
  let lb=null;
  for(let dx=-2;dx<=2&&!lb;dx++)for(let dz=-2;dz<=2&&!lb;dz++)
    for(let dy=1;dy<=2&&!lb;dy++)
      if(V.blockAliveRoll(gbx+dx,gby+dy,gbz+dz))lb=[gbx+dx,gby+dy,gbz+dz];
  if(!lb){ /* widen the search and build a perch there */
    for(let dx=-20;dx<=20&&!lb;dx++)for(let dz=-20;dz<=20&&!lb;dz++)
      if(V.blockAliveRoll(gbx+dx,gby+1,gbz+dz))lb=[gbx+dx,gby+1,gbz+dz];
    if(lb)V.setBlock(lb[0],lb[1]-1,lb[2],B.STONE);
  }
  ok('a fated living block exists nearby',!!lb);
  V.setBlock(lb[0],lb[1],lb[2],B.STONE);
  const mobsB4=V.entities.filter(e=>e.t==='mob'&&!e.dead).length;
  ok('mining it brings it to life instead',V.blockComesAlive(lb[0],lb[1],lb[2],B.STONE)===true&&V.getBlock(lb[0],lb[1],lb[2])===B.AIR);
  const blk=V.entities.filter(e=>e.t==='mob'&&e.mt==='blockling'&&!e.dead).pop();
  ok('and it has legs and feelings',!!blk&&blk.blockId===B.STONE);
  const bd0=Math.hypot(blk.x-V.P.x,blk.z-V.P.z);
  for(let i=0;i<30;i++)V.frameStep(159000+i*45);
  ok('it flees, crying',blk.dead||Math.hypot(blk.x-V.P.x,blk.z-V.P.z)>bd0+1);
  if(!blk.dead){blk.hurtT=0;V.hurtMob(blk,999,0,0);}
  ok('killing it returns the block',V.entities.some(e=>e.t==='drop'&&e.st&&e.st.id===B.STONE));
  /* fishing: dig a pool, catch something */
  const plx=gbx+2,plz=gbz-2;
  V.setBlock(plx,gby+1,plz,B.AIR);V.setBlock(plx+1,gby+1,plz,B.AIR);
  V.setBlock(plx,gby+1,plz,B.WATER);V.setBlock(plx+1,gby+1,plz,B.WATER);
  V.P.inv[0]={id:IT.ROD,count:1,dur:64};V.P.sel=0;V.P.useT=0;
  V.P.yaw=Math.atan2(-(plx+0.5-V.P.x),-(plz+0.5-V.P.z));V.P.pitch=-0.5;
  V.MB.r=false;for(let i=0;i<3;i++)V.frameStep(161000+i*40);
  V.MB.r=true;for(let i=0;i<3;i++)V.frameStep(161200+i*40);
  V.MB.r=false;
  ok('casting a rod launches a bobber',V.getFISHB()!==null);
  for(let i=0;i<40;i++)V.frameStep(161500+i*45);
  ok('the bobber settles in the water',(V.getFISHB()||{}).inWater===true);
  V.fishForceBite();
  const dropsB4=V.entities.filter(e=>e.t==='drop'&&!e.dead).length;
  V.P.useT=0;
  V.MB.r=false;for(let i=0;i<2;i++)V.frameStep(164000+i*40);
  V.MB.r=true;for(let i=0;i<3;i++)V.frameStep(164200+i*40);
  V.MB.r=false;
  ok('reeling during a bite lands a catch',V.getFISHB()===null&&V.entities.filter(e=>e.t==='drop'&&!e.dead).length>dropsB4);
  /* reverse rod: the water fishes YOU */
  V.P.inv[0]={id:IT.ROD_R,count:1,dur:64};V.P.useT=0;
  V.MB.r=false;for(let i=0;i<3;i++)V.frameStep(165000+i*40);
  V.MB.r=true;for(let i=0;i<3;i++)V.frameStep(165200+i*40);
  V.MB.r=false;
  for(let i=0;i<30;i++)V.frameStep(165500+i*45);
  V.P.useT=0;
  V.MB.r=false;for(let i=0;i<2;i++)V.frameStep(167000+i*40);
  V.MB.r=true;for(let i=0;i<3;i++)V.frameStep(167200+i*40);
  V.MB.r=false;
  ok('the reverse rod reels YOU toward the water',Math.abs(V.P.vx)+Math.abs(V.P.vz)+Math.abs(V.P.vy)>6);
  for(let i=0;i<30;i++)V.frameStep(168000+i*45);
  V.P.x=gbx+0.5;V.P.z=gbz+0.5;V.P.y=gby+1;V.P.vx=V.P.vy=V.P.vz=0;V.P.inv[0]=null;
  /* snake grows by apples */
  V.spawnMob('snake',gbx-2.5,gby+1.1,gbz+0.5);
  const snk=V.entities[V.entities.length-1];
  V.spawnDrop(gbx-2.5,gby+1.5,gbz+0.5,{id:IT.APPLE,count:2},0,0,0);
  for(let i=0;i<90;i++)V.frameStep(170000+i*45);
  ok('snakes grow longer from apples',!snk.dead&&snk.segMeshes&&snk.segMeshes.length>=1);
  snk.hurtT=0;V.hurtMob(snk,999,0,0);
  /* apples make YOU bigger */
  V.P.hunger=10;V.P.inv[0]={id:IT.APPLE,count:2};V.P.sel=0;
  V.MB.r=true;
  for(let i=0;i<45;i++)V.frameStep(175000+i*45);
  V.MB.r=false;
  ok('eating an apple makes you BIG',(V.P.bigT||0)>0);
  V.P.bigT=0;V.P.inv[0]=null;
  /* figurines: guaranteed roll, display, retrieve */
  V.setFigChance(1);
  V.spawnMob('pig',gbx+2.5,gby+1.1,gbz-2.5);
  const fpig=V.entities[V.entities.length-1];
  fpig.hurtT=0;V.hurtMob(fpig,999,0,0);
  const fig=V.entities.filter(e=>e.t==='drop'&&e.st&&e.st.id===IT.FIGURINE).pop();
  ok('kills can drop a figurine of the victim',!!fig&&fig.st.mob&&fig.st.mob.t==='pig');
  V.setFigChance(0.05);
  for(const e of V.entities)if(e.t==='drop'&&e.st&&e.st.id===IT.FIGURINE)e.age=9999; /* despawn strays before the shelf test */
  V.setBlock(gbx-2,gby+1,gbz-2,B.SHELF);
  V.P.inv[0]={id:IT.FIGURINE,count:1,mob:{t:'pig'}};V.P.sel=0;
  V.dispUse(gbx-2,gby+1,gbz-2);
  ok('figurines go on shelves',V.P.inv[0]===null&&V.getDISPM()>=1);
  V.dispUse(gbx-2,gby+1,gbz-2);
  ok('and come back off them',V.invCount(V.P.inv,IT.FIGURINE)>=1);
  for(let i2=0;i2<V.P.inv.length;i2++)if(V.P.inv[i2]&&V.P.inv[i2].id===IT.FIGURINE)V.P.inv[i2]=null;
  /* guard turf: a rose earns its keep */
  V.setBlock(gbx+2,gby+1,gbz+2,B.LAWN);
  V.setBlock(gbx+2,gby+2,gbz+2,B.FLOWER_R);
  V.lawnCheck(gbx+2,gby+2,gbz+2);
  ok('the turf registers its soldier',V.getLWN()>=1);
  V.spawnMob('zombie',gbx+6.5,gby+1.1,gbz+2.5);
  const zmb=V.entities[V.entities.length-1];
  const zhp0=zmb.hp;
  for(let i=0;i<80;i++)V.frameStep(178000+i*45);
  ok('the rose opens fire on the horde',zmb.dead||zmb.hp<zhp0);
  if(!zmb.dead){zmb.hurtT=0;V.hurtMob(zmb,999,0,0);}
  /* cinema: buy, build, watch, enter */
  V.P.db=9000;
  ok('the store sells a whole cinema',V.storeBuy('joke_cine')===true&&V.invCount(V.P.inv,B.CINEMA)===1);
  for(let i2=0;i2<V.P.inv.length;i2++)if(V.P.inv[i2]&&V.P.inv[i2].id===B.CINEMA)V.P.inv[i2]=null;
  V.stampCinema(gbx+30,gby+1,gbz);
  let scr=0;
  for(let dx=-3;dx<=3;dx++)for(let dy=2;dy<=4;dy++)if(V.getBlock(gbx+30+dx,gby+dy,gbz+6)===B.SCREEN)scr++;
  ok('the cinema assembles with a full screen',scr===21);
  V.openCine();
  ok('the lobby opens as a modal',V.getCIN().on===true&&V.getCIN().mode==='menu'&&V.modalOpen()===true);
  V.cineSelect(2);
  ok('a film rolls',V.getCIN().mode==='play');
  V.cineEnter();
  ok('and you can step inside it',V.getCIN().mode==='inside');
  V.KEY.KeyW=true;
  for(let i=0;i<160;i++)V.frameStep(183000+i*45);
  V.KEY.KeyW=false;
  ok('walking to your love wins the picture',V.getCIN().mode==='end'&&V.getCIN().res==='win'&&V.invCount(V.P.inv,IT.POPCORN)>=2);
  V.closeCine();
  ok('leaving the cinema releases the modal',V.getCIN().on===false&&V.modalOpen()===false);
  for(let i2=0;i2<V.P.inv.length;i2++)if(V.P.inv[i2]&&V.P.inv[i2].id===IT.POPCORN)V.P.inv[i2]=null;
  /* the 8-ball has opinions */
  V.P.inv[0]={id:IT.M8BALL,count:1};V.P.sel=0;V.P.useT=0;
  V.MB.r=false;for(let i=0;i<3;i++)V.frameStep(191000+i*40);
  V.MB.r=true;for(let i=0;i<3;i++)V.frameStep(191200+i*40);
  V.MB.r=false;
  ok('the 8-ball answers',V.getM8().length>0);
  V.P.inv[0]=null;

  /* ---- v4.0: THE HORROR UPDATE ---- */
  /* jumpscares obey the slider */
  V.GR.jsc=100;
  for(let i=0;i<3;i++)V.frameStep(193000+i*40);
  ok('at 100% the jumpscares are wall to wall',V.getSCARE().t>0);
  V.GR.jsc=0;
  for(let i=0;i<40;i++)V.frameStep(193200+i*40);
  ok('and vanish after their second of fame',V.getSCARE().t===0);
  /* guilt ghosts */
  V.setGhostChance(1);
  V.spawnMob('pig',V.P.x+2.5,V.P.y+1,V.P.z+2.5);
  const gpig=V.entities[V.entities.length-1];
  gpig.hurtT=0;V.hurtMob(gpig,999,0,0);
  ok('the slain return to haunt you',V.getHorror().ghosts>=1);
  V.setGhostChance(0.1);
  /* THE ETERNAL SNAIL */
  V.GR.snail=true;V.snailReset();
  for(let i=0;i<10;i++)V.frameStep(196000+i*45);
  let snl=V.getSNL();
  ok('on first load he arrives, ten blocks out',snl.on===true&&typeof snl.x==='number'&&
    Math.hypot(snl.x-V.P.x,snl.z-V.P.z)<16);
  /* outrun him: he does not chase. he arrives. */
  V.setDim('over',V.P.x+300,70,V.P.z+300);
  for(let i=0;i<30;i++)V.frameStep(197000+i*45);
  snl=V.getSNL();
  ok('outrunning him just changes where he is',typeof snl.x==='number'&&
    Math.hypot(snl.x-V.P.x,snl.z-V.P.z)<58);
  /* he crosses dimensions */
  V.GR.god=true;
  V.setDim('nether',V.P.x,40,V.P.z);
  for(let i=0;i<30;i++)V.frameStep(199000+i*45);
  snl=V.getSNL();
  ok('he follows you into hell without comment',V.getDim()==='nether'&&typeof snl.x==='number'&&
    Math.hypot(snl.x-V.P.x,snl.z-V.P.z)<58);
  V.setDim('over',homeX,homeY,homeZ);
  /* the touch */
  V.GR.god=false;V.P.hp=20;V.P.dead=false;V.P.hurtT=0;
  snl=V.getSNL();
  V.P.x=snl.x;V.P.y=snl.y;V.P.z=snl.z;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<6;i++)V.frameStep(201000+i*45);
  ok('his touch is the end',V.P.dead===true);
  V.respawn();V.P.hp=20;V.P.dead=false;
  V.GR.snail=false;V.snailReset();

  /* ---- v4.2: altitude first ---- */
  V.GR.god=true;V.GR.snail=true;V.snailReset();
  /* let him arrive and settle at ground level first */
  for(let i=0;i<140;i++)V.frameStep(203000+i*45);
  const twx=Math.floor(V.P.x),twz=Math.floor(V.P.z),tgy0=Math.floor(V.P.y);
  /* deterministic start pad: his random spawn bearing is not the thing under test */
  V.setBlock(twx+6,tgy0,twz,B.STONE);
  for(let dy=1;dy<=3;dy++)V.setBlock(twx+6,tgy0+dy,twz,B.AIR);
  V.snailWarp(twx+6.5,tgy0+1,twz+0.5);
  for(let i=0;i<20;i++)V.frameStep(209400+i*45);
  const sy0=V.getSNL().y;
  for(let dy=0;dy<8;dy++)V.setBlock(twx,tgy0+dy,twz,B.STONE);
  V.P.x=twx+0.5;V.P.z=twz+0.5;V.P.y=tgy0+8.2;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<720;i++)V.frameStep(211000+i*45);
  const syClimb=V.getSNL().y;
  ok('the snail pillars up toward your altitude',syClimb>sy0+2.5);
  /* now hide beneath him */
  const pitX=twx+6,pitZ=twz;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let dy=0;dy<3;dy++)
    V.setBlock(pitX+dx,tgy0-9+dy,pitZ+dz,B.AIR);
  V.P.x=pitX+0.5;V.P.z=pitZ+0.5;V.P.y=tgy0-9;V.P.vx=V.P.vy=V.P.vz=0;
  for(let i=0;i<420;i++)V.frameStep(245000+i*45);
  const syDig=V.getSNL().y;
  ok('and digs down when you cower below',syDig<sy0-2);
  for(let dy=0;dy<8;dy++)V.setBlock(twx,tgy0+dy,twz,B.AIR);
  V.GR.snail=false;V.snailReset();

  /* ---- v5.0: the plane, the bomb, the bunker ---- */
  V.GR.god=true;
  ok('the recipes of the apocalypse exist',
    V.RECIPES.some(r=>r.o===V.IT.NUKE)&&V.RECIPES.some(r=>r.o===V.IT.PLANE)&&
    V.RECIPES.some(r=>r.o===B.BUNKER)&&V.RECIPES.some(r=>r.o===B.BGLASS));
  V.respawn();V.P.dead=false;V.P.hp=20;
  const pgy=64;
  V.spawnPlane(V.P.x+2,pgy,V.P.z,0);
  const pln=V.entities.find(e=>e.t==='plane'&&!e.dead);
  ok('a plane exists',!!pln);
  V.P.ride=pln;V.P.pitch=0.5;V.TOUCH.f=1;
  const px0=pln.x,pz0=pln.z;
  for(let i=0;i<160;i++)V.frameStep(276000+i*45);
  ok('the plane flies where you look',
    pln.spd>14&&Math.hypot(pln.x-px0,pln.z-pz0)>25&&pln.y>pgy+4);
  /* bombs away */
  V.P.inv[V.P.sel]={id:V.IT.NUKE,count:1};
  V.P.ride=null;
  ok('no ground delivery',V.nukeDrop()===false&&V.P.inv[V.P.sel]!==null);
  V.P.ride=pln;
  ok('bombs away arms the clock',V.nukeDrop()===true&&V.getNARM().armed&&V.getNARM().t>19);
  const bomb=V.entities.find(e=>e.t==='abomb');
  ok('the bomb falls free of the plane',!!bomb);
  for(let i=0;i<40;i++)V.frameStep(284000+i*45);
  ok('the countdown counts down',V.getNARM().armed&&V.getNARM().t<19.2);
  /* be somewhere else: eight chunks is the law */
  V.P.ride=null;V.TOUCH.f=0;V.P.pitch=0;
  V.GR.god=false;V.P.hp=20;
  V.P.x=Math.floor(bomb.x)+200.5;V.P.z=Math.floor(bomb.z)+0.5;V.P.y=72;V.P.vx=V.P.vy=V.P.vz=0;
  V.setNARM(0.6);
  for(let i=0;i<50;i++)V.frameStep(286000+i*45);
  ok('detonation is recorded for the ages',V.getNUKES().length===1);
  const bx=V.getNUKES()[0].x,bz=V.getNUKES()[0].z;
  ok('safe past eight chunks',V.P.dead===false&&V.P.hp===20);
  V.GR.god=true;
  V.P.x=bx+0.5;V.P.z=bz+0.5;V.P.y=66;V.P.vx=V.P.vy=V.P.vz=0;
  V.forceChunksNear(bx,bz);
  for(let i=0;i<10;i++)V.frameStep(289000+i*45);
  ok('the crater goes to the void, bedrock included',
    V.getBlock(bx,0,bz)===B.AIR&&V.getBlock(bx,20,bz)===B.AIR&&V.getBlock(bx,45,bz)===B.AIR);
  V.forceChunksNear(bx+75,bz);
  ok('the world survives past the rim',V.getBlock(bx+75,0,bz)===B.BEDROCK);
  ok('a mushroom cloud rises',V.entities.some(e=>e.t==='mcloud'&&!e.dead));
  /* the crater is forever: save, load, regenerate */
  const sv=V.snapshot('nuked');
  V.applySave(sv);
  V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.god=true;
  for(let i=0;i<30;i++)V.frameStep(290000+i*45);
  V.forceChunksNear(bx,bz);V.forceChunksNear(bx+75,bz);
  ok('the crater is forever',
    V.getNUKES().length===1&&V.getBlock(bx,0,bz)===B.AIR&&V.getBlock(bx+75,0,bz)===B.BEDROCK);
  /* the bunker: completely sealed = completely fine */
  V.P.dead=false;V.P.hp=20;
  const hx=bx+90,hz=bz;
  V.forceChunksNear(hx,hz);
  let hy=WHTOP();
  function WHTOP(){for(let y=79;y>0;y--)if(V.getBlock(hx,y,hz)!==B.AIR)return y;return 10;}
  hy=WHTOP();
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let dy=0;dy<=3;dy++){
    const inner=(dx===0&&dz===0&&(dy===1||dy===2));
    V.setBlock(hx+dx,hy+1+dy,hz+dz,inner?B.AIR:B.BUNKER);
  }
  V.setBlock(hx+1,hy+3,hz,B.BGLASS); /* a window on the end of the world */
  V.P.x=hx+0.5;V.P.z=hz+0.5;V.P.y=hy+2;V.P.vx=V.P.vy=V.P.vz=0;
  V.spawnMob('pig',hx+22,hy+6,hz);
  const doomedPig=V.entities[V.entities.length-1];
  V.GR.god=false;
  V.nukeSpawnBomb(hx+30,hy+16,hz);
  V.setNARM(0.8);
  for(let i=0;i<70;i++)V.frameStep(292000+i*45);
  ok('the pig did not make it',doomedPig.dead===true||doomedPig.hp<=0);
  ok('the sealed bunker holds',V.P.dead===false);
  ok('bunkercrete and its window shrug off the blast',
    V.getBlock(hx-1,hy+3,hz)===B.BUNKER&&V.getBlock(hx+1,hy+3,hz)===B.BGLASS);
  ok('nothing else nearby made it either',V.getBlock(hx+6,0,hz)===B.AIR);
  /* one missing block is a lesson in sealing */
  V.setBlock(hx,hy+4,hz,B.AIR);
  V.nukeSpawnBomb(hx+30,hy+16,hz);
  V.setNARM(0.5);
  for(let i=0;i<50;i++)V.frameStep(296000+i*45);
  ok('a leaky bunker is a lesson',V.P.dead===true);
  V.respawn();V.P.hp=20;V.P.dead=false;
  V.GR.god=false;V.GR.mobSpawn=true;

  /* ---- v5.1: mercy settings (snail toggle + jumpscares off by default) ---- */
  V.startNewWorld('mercy','7','s');
  ok('jumpscares are off by default now',V.GR.jsc===0);
  ok('the snail rule still defaults on',V.GR.snail===true);
  V.GR.god=true;V.GR.mobSpawn=false;V.GR.jsc=0;
  for(let i=1;i<=60;i++)V.frameStep(300000+i*40);
  V.snailReset();
  for(let i=0;i<180;i++)V.frameStep(303000+i*45);
  ok('the eternal snail arrives while his rule is on',
    V.entities.some(e=>e.t==='esnail'&&!e.dead));
  V.grToggle('snail');
  ok('the debug toggle flips his rule off',V.GR.snail===false);
  ok('and banishes the one already after you',
    !V.entities.some(e=>e.t==='esnail'&&!e.dead));
  for(let i=0;i<200;i++)V.frameStep(312000+i*45);
  ok('he stays gone while the rule is off',
    !V.entities.some(e=>e.t==='esnail'&&!e.dead));
  V.grToggle('snail');
  for(let i=0;i<200;i++)V.frameStep(322000+i*45);
  ok('toggling the rule back on returns him',
    V.entities.some(e=>e.t==='esnail'&&!e.dead));
  V.GR.snail=false;V.snailReset();
  V.GR.god=false;V.GR.mobSpawn=true;

  /* ---- v5.2: the undead endure the aether's daylight ---- */
  const burnPad=(cx,fy,cz)=>{
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
      V.setBlock(cx+dx,fy,cz+dz,B.STONE);
      for(let yy=fy+1;yy<80;yy++)V.setBlock(cx+dx,yy,cz+dz,B.AIR);
    }
  };
  V.GR.mobSpawn=false;V.GR.god=true;V.setTime(0.25); /* high noon */
  /* aether: open sky, bright noon, undead unbothered */
  V.setDim('aether',500.5,60,500.5);
  V.forceChunksNear(500,500);
  burnPad(500,58,500);
  V.P.x=500.5;V.P.z=500.5;V.P.y=59;V.P.vx=V.P.vy=V.P.vz=0;
  V.spawnMob('zombie',500.5,59.1,500.5);
  const azom=V.entities[V.entities.length-1];azom.hp=20;
  ok('the sky is genuinely open above the aether zombie',
    V.getBlock(500,66,500)===B.AIR&&V.getBlock(500,79,500)===B.AIR);
  for(let i=0;i<160;i++){azom.x=500.5;azom.z=500.5;V.frameStep(340000+i*45);}
  ok('the aether sun does not burn the undead',!azom.dead&&azom.hp===20);
  /* overworld: the identical setup DOES burn — the mechanic is intact */
  V.setDim('over',1000.5,72,1000.5);
  V.forceChunksNear(1000,1000);
  burnPad(1000,70,1000);
  V.P.x=1000.5;V.P.z=1000.5;V.P.y=71;V.P.vx=V.P.vy=V.P.vz=0;
  V.spawnMob('zombie',1000.5,71.1,1000.5);
  const ozom=V.entities[V.entities.length-1];ozom.hp=20;
  for(let i=0;i<160;i++){ozom.x=1000.5;ozom.z=1000.5;V.frameStep(348000+i*45);}
  ok('overworld daylight still burns the undead',ozom.dead||ozom.hp<20);
  V.GR.god=false;V.GR.mobSpawn=true;

  /* ---- v5.3: the aether void swallows what falls into it ---- */
  V.GR.mobSpawn=false;V.GR.god=true;
  V.setDim('aether',700.5,55,700.5);
  V.forceChunksNear(700,700);
  /* a solid pad keeps the player (and a control mob) safely aloft */
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)V.setBlock(700+dx,50,700+dz,B.CLOUDSTONE);
  V.P.x=700.5;V.P.z=700.5;V.P.y=51;V.P.vx=V.P.vy=V.P.vz=0;
  V.spawnMob('pig',700.5,51.1,700.5);
  const safeMob=V.entities[V.entities.length-1];
  /* find an open void column nearby (no island at all, clear of the pad) */
  let vx=null,vz=null;
  for(let dx=6;dx<64&&vx===null;dx++)if(!V.aCol(700+dx,700)){vx=700+dx;vz=700;}
  ok('found an open aether void column to drop into',vx!==null);
  V.spawnMob('pig',vx+0.5,48,vz+0.5);
  const fallMob=V.entities[V.entities.length-1];
  V.spawnSkate(vx+0.5,48,vz+0.5,0);
  const fallSkate=V.entities[V.entities.length-1];
  for(let i=0;i<240;i++){
    V.P.x=700.5;V.P.z=700.5;V.P.y=51;V.P.vy=0;
    safeMob.x=700.5;safeMob.z=700.5;
    /* pin the fallers over the void column so random wander can't drift them onto a neighbour island */
    if(!fallMob.dead){fallMob.x=vx+0.5;fallMob.z=vz+0.5;}
    if(!fallSkate.dead){fallSkate.x=vx+0.5;fallSkate.z=vz+0.5;}
    V.frameStep(360000+i*45);
  }
  ok('a mob that falls into the aether void despawns',fallMob.dead===true);
  ok('a skateboard that falls into the aether void despawns',fallSkate.dead===true);
  ok('a mob resting on an aether island is left alone',safeMob.dead!==true);
  ok('the player stays in the aether while the void does its work',V.getDim()==='aether');
  V.GR.god=false;V.GR.mobSpawn=true;
  V.setDim('over',homeX,homeY,homeZ);

  /* ---- v5.6: instant kill debug rule ---- */
  V.GR.mobSpawn=false;V.GR.god=true;
  V.GR.instaKill=false;
  V.spawnMob('zombie',V.P.x+2,V.P.y,V.P.z+2);
  const ik1=V.entities[V.entities.length-1];ik1.hp=20;ik1.hurtT=0;
  V.hurtMob(ik1,1,0,0);
  ok('with instant kill off, a 1-damage hit only chips the mob',!ik1.dead&&ik1.hp<20&&ik1.hp>0);
  V.GR.instaKill=true;
  V.spawnMob('zombie',V.P.x+2,V.P.y,V.P.z+2);
  const ik2=V.entities[V.entities.length-1];ik2.hp=20;ik2.hurtT=0;
  V.hurtMob(ik2,1,0,0);
  ok('with instant kill on, a single 1-damage hit is lethal',ik2.dead===true);
  /* it does not matter how much health the target had */
  V.spawnMob('zombie',V.P.x+2,V.P.y,V.P.z+2);
  const ik3=V.entities[V.entities.length-1];ik3.hp=5000;ik3.hurtT=0;
  V.hurtMob(ik3,1,0,0);
  ok('instant kill ignores the mob health pool',ik3.dead===true);
  /* a 0-damage aggro ping must NOT count as a kill */
  V.spawnMob('zombie',V.P.x+2,V.P.y,V.P.z+2);
  const ik4=V.entities[V.entities.length-1];ik4.hp=20;ik4.hurtT=0;
  V.hurtMob(ik4,0,0,0);
  ok('instant kill needs real damage, not a zero-damage ping',ik4.dead!==true);
  V.GR.instaKill=false;
  V.GR.god=false;V.GR.mobSpawn=true;

  /* ---- v5.7: freeze all mobs ---- */
  V.GR.mobSpawn=false;V.GR.god=true;V.GR.freezeMobs=false;
  /* a mob spawned in mid-air: gravity should hold it only while frozen */
  V.spawnMob('pig',V.P.x+3,V.P.y+8,V.P.z);
  const fzm=V.entities[V.entities.length-1];fzm.hurtT=0;
  const fx0=fzm.x,fy0=fzm.y,fz0=fzm.z;
  V.GR.freezeMobs=true;
  for(let i=0;i<80;i++)V.frameStep(400000+i*45);
  ok('a frozen mob holds its exact position (no falling, no drift)',
    Math.abs(fzm.x-fx0)<0.05&&Math.abs(fzm.y-fy0)<0.05&&Math.abs(fzm.z-fz0)<0.05&&fzm.dead!==true);
  /* still killable while frozen */
  V.spawnMob('pig',V.P.x+3,V.P.y,V.P.z);
  const fzk=V.entities[V.entities.length-1];fzk.hurtT=0;fzk.hp=10;
  V.hurtMob(fzk,999,0,0);
  ok('a frozen mob can still be hit and killed',fzk.dead===true);
  /* unfreeze: motion resumes and the airborne one finally falls */
  V.GR.freezeMobs=false;
  for(let i=0;i<80;i++)V.frameStep(407000+i*45);
  ok('unfreezing lets mobs move again',fzm.y<fy0-1);
  V.GR.freezeMobs=false;
  V.GR.god=false;V.GR.mobSpawn=true;

  /* ---- v5.8: disable ghosts + game-speed slow-mo ---- */
  V.GR.mobSpawn=false;V.GR.god=true;
  /* ghosts on (forced 100%): a killed mob leaves a ghost */
  V.setGhostChance(1);V.GR.ghosts=true;
  V.spawnMob('pig',V.P.x+2,V.P.y,V.P.z+2);
  const ghA=V.entities[V.entities.length-1];ghA.hurtT=0;V.hurtMob(ghA,999,0,0);
  ok('with guilt ghosts on, a slain mob leaves a ghost',V.getHorror().ghosts>=1);
  /* ghosts off: no new ghost, and the existing one is banished by the toggle */
  V.grToggle('ghosts');
  ok('toggling guilt ghosts off banishes the lurking ones',V.GR.ghosts===false&&V.getHorror().ghosts===0);
  V.spawnMob('pig',V.P.x+2,V.P.y,V.P.z+2);
  const ghB=V.entities[V.entities.length-1];ghB.hurtT=0;V.hurtMob(ghB,999,0,0);
  ok('and no new ghost rises while it is off',V.getHorror().ghosts===0);
  V.grToggle('ghosts');V.setGhostChance(0.1);
  ok('the ghost rule flips back on cleanly',V.GR.ghosts===true);

  /* game speed: half speed makes the sim advance half as far per real second */
  V.GR.god=true;
  /* v6.3 (lead, dev/malgorath/MALGORATH_PLAN.md 9.6): stand Dan on a pad at home first. Until v6.2 the old Malgorath's 19.4 s
     cutscene (started by the 1000.5 burn test above) was still running when Dan came home and froze him in mid-air for its last
     1.4 s; these pigs' open air depended on where that left him. Same assertion, hermetic setup. */
  V.P.x=homeX;V.P.y=homeY;V.P.z=homeZ;V.P.vx=V.P.vy=V.P.vz=0;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)V.setBlock(Math.floor(homeX)+dx,Math.floor(homeY)-1,Math.floor(homeZ)+dz,B.STONE);
  V.setGameSpeed(1);
  V.spawnMob('pig',V.P.x+3,V.P.y+20,V.P.z);
  const gsFull=V.entities[V.entities.length-1];gsFull.hurtT=0;
  const gsFullY0=gsFull.y;let gsT=460000;
  for(let i=0;i<20;i++){gsT+=45;V.frameStep(gsT);}
  const gsFullFall=gsFullY0-gsFull.y;
  V.setGameSpeed(0.5);
  V.spawnMob('pig',V.P.x+3,V.P.y+20,V.P.z);
  const gsHalf=V.entities[V.entities.length-1];gsHalf.hurtT=0;
  const gsHalfY0=gsHalf.y;
  for(let i=0;i<20;i++){gsT+=45;V.frameStep(gsT);}
  const gsHalfFall=gsHalfY0-gsHalf.y;
  ok('at half game-speed the sim advances markedly slower',gsFullFall>0.5&&gsHalfFall<gsFullFall*0.75);
  V.setGameSpeed(1);

  /* mouse: instant at 1x, slowed + smoothed (deferred, then eased) below 1x */
  V.setGameSpeed(1);
  const gsY1=V.getYaw();
  V.look(100,0,0.0024);
  ok('at 1x the mouse turns the view immediately',Math.abs(V.getYaw()-(gsY1-0.24))<1e-6);
  V.setGameSpeed(0.5);
  const gsY2=V.getYaw();
  V.look(100,0,0.0024);
  ok('below 1x a mouse move does not snap the view (it is buffered)',Math.abs(V.getYaw()-gsY2)<1e-9);
  V.drainLook();
  const gsMoved=Math.abs(V.getYaw()-gsY2);
  ok('draining eases the buffered look in gradually and slowed by speed',gsMoved>0&&gsMoved<0.5*0.24);
  V.setGameSpeed(1);
  V.GR.god=false;V.GR.mobSpawn=true;

  console.log(pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{console.log('CRASH',e);process.exit(1);});
