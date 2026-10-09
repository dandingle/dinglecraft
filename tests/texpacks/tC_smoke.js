/* tC_smoke.js (Package C): the cast adapter on a real seed-1337 world with fake models (fake_models.js).
   setPack('hr',{only:['ents']}) with hrInstallFake() (no hrLoadModels on the stub). Frames from 500000, increasing.
   Covers: the live swap (OG meshes stashed, identity on the way back), spawnMob opt-in, s filled from mob state,
   s.fired on exactly the damage frame, per-instance flashes, corpses (ramp, sink, poof, cap/eviction, explosions
   leave none, resetWorld/setDim clear), AI-player bodies (swap, flash, place edge, corpse, Hyperreal respawn), the
   player (third-person model, hat/armour/tool anchors, the first-person fist), LOD, tiers, figurines stay OG. */
'use strict';
const boot=require('../lib/hr_boot.js'),{ok}=boot;
const V=boot({stubs:['C'],models:'fake'});
const {FAKE}=require('../lib/fake_models.js');
const step=boot.stepper(500000);
const S=boot.scene(),X=V.hrEnt,HRE=X.HRE;
/* the stub's remove() keeps .parent, so membership is checked through children lists */
const inScene=o=>{for(let p=o;p&&p.parent;p=p.parent){if(!p.parent.children.includes(p))return false;if(p.parent===S)return true;}return false;};
const recOf=root=>FAKE.inst.find(r=>r.root===root);
const hrMeshesInScene=()=>{let n=0;S.traverse(o=>{if(o.isMesh&&o.userData&&o.userData.hr)n++;});return n;};
const near=(dx,dz)=>[V.P.x+dx,V.P.y+0.2,V.P.z+dz];

boot.run(async()=>{
  V.startNewWorld('tcsmoke','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.75);
  step(160);
  ok('a world boots on OG',!!V.P&&V.getTP().id==='og'&&V.getHRE().on===false);

  /* ---- OG state before Hyperreal ---- */
  V.spawnMob('cow',...near(4,4));const cow=V.entities[V.entities.length-1];
  const cowG=cow.mesh,cowLegs=cow.legs,cowMats=cow.mats;
  ok('in OG a spawned mob is OG (no hrM, OG legs)',cow.hrM===null&&cowLegs.length===4);
  ok('makeMobMesh(mt,{hr:1}) is OG while the cast is off',!X.mk('zombie',{hr:1}).hrM);
  V.setCam(1);step(2);const plOG=X.pl();
  ok('the OG player model exists in third person',!!plOG&&!plOG.hr);
  V.setCam(0);V.P.inv[V.P.sel]=null;V.refreshHand();step(2);
  ok('the OG empty hand is empty',V.getHand().kind===-1&&V.getHand().n===0);
  const hand0=JSON.stringify([X.hand().position.x,X.hand().position.y,X.hand().position.z]);

  /* ---- OG -> Hyperreal (ents only, Medium so the corpse cap is 8) ---- */
  await V.setQuality(1);
  ok('setPack(hr,{only:[ents]}) resolves true',await V.setPack('hr',{only:['ents']})===true);
  let h=V.getHRE();
  ok('the cast is live and installed',h.on===true&&h.installed===true&&V.getTP().live.join()==='ents'&&V.getTP().qr===1);
  ok('every model was built twice at prewarm (module caches found)',X.HR_CAST.every(n=>FAKE.builds[n]>=2));
  const zi=FAKE.inst.find(r=>r.name==='zombie'),zOwn=zi.root.children[6].material[0];
  ok('module caches are shared, per-instance objects are not',HRE.shared.has(FAKE.geo.zombie)&&HRE.shared.has(FAKE.cache.zombie)&&!HRE.shared.has(zOwn)&&!HRE.shared.has(zi.root.children[6].geometry));
  let pre=0;S.traverse(o=>{if(o.name==='hr_prewarm')pre++;});
  ok('the prewarm set left the scene after TP.warm (pack event)',pre===0&&HRE.warmG===null);
  ok('the live OG cow became Hyperreal, OG mesh stashed',!!cow.hrM&&cow.mesh!==cowG&&cow._og.G===cowG&&cow.legs.length===0&&!inScene(cowG)&&inScene(cow.mesh));
  ok('the Hyperreal cow carries only its own non-emissive materials as flash mats',cow.mats.length===2&&cow.mats.every(m=>m.emissive.r===0&&!HRE.shared.has(m)));
  ok('the OG player model was stashed; the Hyperreal one is current',X.pl()&&X.pl().hr===true&&HRE.ogPl===plOG&&!inScene(plOG.G));
  ok('the empty hand is the fist viewmodel',V.getHand().n===1&&X.hand().children[0]===X.pl().hrM.vm.group);
  const vm0=FAKE.vmUpdates;step(3);
  ok('the fist runs every first-person frame and owns handG',FAKE.vmUpdates===vm0+3&&X.hand().position.x===0&&X.hand().position.y===0&&X.hand().position.z===0);
  V.P.swing=1;step(1);
  ok('a swing is a jab: s.fired reaches the fist',FAKE.vmLast.fired===true);
  step(1);ok('s.fired lasts one frame',FAKE.vmLast.fired===false);

  ok('a quick round trip restores the stashed OG cow (identical mesh, legs, mats)',await V.setPack('og')&&cow.mesh===cowG&&cow.legs===cowLegs&&cow.mats===cowMats&&inScene(cowG)&&!cow.hrM&&!cow._og&&X.pl()===plOG);
  ok('and Hyperreal again',await V.setPack('hr',{only:['ents']})&&!!cow.hrM&&X.pl().hr===true);
  /* ---- spawnMob opt-in, s from the mob, the damage frame ---- */
  V.P.hp=20;V.spawnMob('zombie',...near(6,0));const z=V.entities[V.entities.length-1];
  ok('a spawned zombie is Hyperreal with no OG legs',!!z.hrM&&z.legs.length===0&&z.hrM.G===z.mesh&&inScene(z.mesh));
  const zr=recOf(z.hrM.hr.root);
  let hits=0,firedOnHit=0,firedOff=0,maxSpeed=0,frames=0;
  for(let i=0;i<500&&hits<3;i++){const hp=V.P.hp,u=zr.updates;step(1);frames++;
    if(zr.updates>u){maxSpeed=Math.max(maxSpeed,zr.last.speed);
      const hit=V.P.hp<hp;if(hit){hits++;if(zr.last.fired)firedOnHit++;}else if(zr.last.fired)firedOff++;}
    if(V.P.hp<8)V.P.hp=20;}
  ok('walking toward Dan gives s.speed > 0',maxSpeed>0.3);
  ok('the zombie hit Dan three times',hits===3);
  ok('s.fired is set on exactly the melee damage frames ('+firedOnHit+'/'+hits+' hits, '+firedOff+' stray)',firedOnHit===hits&&firedOff===0);
  ok('near/cd/attack come from the mob (near < 2, cd in 0..1)',zr.last.near<2.2&&zr.last.cd>=0&&zr.last.cd<=1&&zr.last.attack>=0);
  ok('the head tracks Dan (yaw within +-1.1, pitch within +-0.6)',Math.abs(zr.last.yaw)<=1.1&&Math.abs(zr.last.pitch)<=0.6);

  /* ---- flashes on per-instance materials ---- */
  V.spawnMob('zombie',...near(-6,0));const z2=V.entities[V.entities.length-1];
  z.hurtT=0;V.hurtMob(z,1,1,0);
  const glow=z.hrM.hr.mats[2];
  ok('hurtMob flashes the hit mob red',z.mats.every(m=>Math.abs(m.emissive.r-0.45)<1e-9));
  ok('the other zombie does not flash',z2.mats.every(m=>m.emissive.r===0));
  ok('authored emissive and the shared cache are untouched',glow.emissive.r===1&&FAKE.cache.zombie.emissive.r===0);
  step(10);ok('the flash resets (updateMob, hurtT < 0.2)',z.mats.every(m=>m.emissive.r===0));

  /* ---- corpses ---- */
  V.spawnMob('pig',...near(3,-3));const pig=V.entities[V.entities.length-1];step(2);
  const pigRoot=pig.mesh,pigH=pig.hrM,pr=recOf(pigH.hr.root),drops0=V.entities.filter(e=>e.t==='drop'&&!e.dead).length;
  V.hurtMob(pig,999,1,0);
  ok('killMob leaves exactly one corpse',V.hrCorpseCount()===1);
  ok('the pig entity is dead at once (smoke.js expects pig.dead immediately)',pig.dead===true&&pig.hrM===null&&pig.mesh===HRE.dummy);
  ok('the corpse keeps its Group in the scene',inScene(pigRoot));
  ok('drops still happen',V.entities.filter(e=>e.t==='drop'&&!e.dead).length>drops0);
  step(1);ok('the dead entity is pruned',!V.entities.includes(pig));
  const ds=[];for(let i=0;i<20;i++){step(1);ds.push(pr.last.dead);}
  ok('s.dead ramps up over deathDur (>= 0.001, increasing)',ds[0]>=0.001&&ds.every((d,i)=>i===0||d>=ds[i-1])&&ds[19]>0.5);
  ok('the corpse is still there before dur + 1.3 s',V.hrCorpseCount()===1);
  const parts0=V.entities.filter(e=>e.t==='part').length;
  step(45);
  ok('the corpse is gone after dur + 1.3 s, with a poof',V.hrCorpseCount()===0&&!inScene(pigRoot)&&V.entities.filter(e=>e.t==='part').length>parts0);
  ok('the corpse model was freed: own objects disposed, module caches kept',FAKE.disposed.has(pigH.hr.mats[0])&&!FAKE.disposed.has(FAKE.cache.pig)&&!FAKE.disposed.has(FAKE.geo.pig));

  /* ---- the corpse cap: a 9th corpse evicts the oldest ---- */
  const sheep=[];for(let i=0;i<9;i++){V.spawnMob('sheep',...near(-3+i*0.7,5));sheep.push(V.entities[V.entities.length-1]);}
  step(1);const firstRoot=sheep[0].mesh;
  for(let i=0;i<8;i++)V.hurtMob(sheep[i],999,0,1);
  ok('eight corpses at Medium',V.hrCorpseCount()===8&&inScene(firstRoot));
  V.hurtMob(sheep[8],999,0,1);
  ok('the 9th corpse evicts the oldest',V.hrCorpseCount()===8&&!inScene(firstRoot));
  await V.setQuality(0);
  ok('Low caps corpses at 4',V.hrCorpseCount()===4&&V.getTP().qr===0);
  await V.setQuality(1);
  step(60);ok('all corpses finish',V.hrCorpseCount()===0);

  /* ---- a boomer that detonates leaves no corpse ---- */
  V.P.hp=20;V.spawnMob('boomer',...near(1.8,0));const bm=V.entities[V.entities.length-1];
  const br=recOf(bm.hrM.hr.root),bmH=bm.hrM;let maxFuse=0,strobe=false;
  for(let i=0;i<120&&!bm.dead;i++){step(1);if(br.last)maxFuse=Math.max(maxFuse,br.last.fuse);if(!bm.dead&&bm.mats.some(m=>m.emissive.r>0.6))strobe=true;if(V.P.hp<8)V.P.hp=20;}
  ok('the boomer fused (s.fuse rose) with the white strobe on its own materials',maxFuse>0.5&&strobe);
  ok('the detonation leaves no corpse and frees the model',bm.dead&&V.hrCorpseCount()===0&&FAKE.disposed.has(bmH.hr.mats[0]));

  /* ---- AI players ---- */
  V.setBrainMock(null);V.BRAIN.ok=false;V.BRAIN.off=true;
  V.GR.bots=true;V.agJoinAll(true);
  for(let i=0;i<40&&!V.AGENTS.every(a=>a.e);i++)step(1);
  const bots=V.AGENTS;
  ok('three AI players joined with bodies',bots.length===3&&bots.every(a=>a.e&&!a.e.dead));
  ok('their bodies are Hyperreal (born while the cast is live)',bots.every(a=>a.e.hrM&&a.e.M.hr===true&&a.e.M.tag.position.y===2.62));
  ok('each body is its own model (bunkerbrad, lilcreepah, honeybee)',bots.map(a=>a.e.hrM.name).sort().join()==='bunkerbrad,honeybee,lilcreepah');
  ok('M.aR is an OG-frame pivot under the model arm',bots.every(a=>a.e.M.aR.rotation.y===Math.PI&&a.e.M.aR.parent===a.e.hrM.hr.handles.aR));
  step(4);
  const a0=bots[0],a1=bots[1],r0=recOf(a0.e.hrM.hr.root);
  ok('hrBotTick runs: s.hp from the agent',r0.updates>0&&Math.abs(r0.last.hp-a0.hp/20)<1e-9);
  a0.e.hurtT=0;a0.spawnProt=0;V.agHurt(a0,1,'Dan',1,0,'melee');
  ok('agHurt flashes only that body',a0.e.mats.every(m=>Math.abs(m.emissive.r-0.45)<1e-9)&&a1.e.mats.every(m=>m.emissive.r===0));
  a0.hrPlT=V.getAG().t+0.001;a0.hrPlId=V.B.DIRT;const bu=r0.updates;step(2);
  ok('a placement is a build edge for one update',FAKE.log.some(l=>l.root===a0.e.hrM.hr.root&&l.build===true)&&r0.last.build===false&&r0.updates>bu);
  const bee=bots.find(a=>a.e.hrM.name==='honeybee'),beer=recOf(bee.e.hrM.hr.root);
  bee.hrPlT=V.getAG().t+0.002;bee.hrPlId=V.B.FLOWER_R;step(2);
  ok('a flower is a plant for the bee',FAKE.log.some(l=>l.root===bee.e.hrM.hr.root&&l.plant===true));
  const deadE=a1.e,deadRoot=deadE.mesh;
  V.agDie(a1,'Dan','melee');
  ok('a bot death leaves a corpse and clears a.e',V.hrCorpseCount()===1&&a1.e===null&&deadE.dead===true&&inScene(deadRoot)&&deadE.M===null);
  step(110);
  ok('the bot respawns with a Hyperreal body',!!a1.e&&!a1.dead&&!!a1.e.hrM&&a1.e.M.hr===true);
  ok('the bot corpse is gone',V.hrCorpseCount()===0&&!inScene(deadRoot));

  /* ---- the player: hat, armour and tool anchors, hand switching ---- */
  V.P.cos=V.P.cos||{};V.P.cos.hat='tophat';V.P.armor=[{id:V.armorId(2,0)},{id:V.armorId(2,1)},null,null];
  V.setCam(1);step(2);
  const M=X.pl(),hat=M.head.getObjectByName('hat');
  ok('the hat lands on the head anchor (M.head, OG frame)',!!hat&&hat.parent===M.head&&M.head.parent===M.hrM.hr.handles.head&&M.head.rotation.y===Math.PI);
  ok('armour follows head and torso (helm on helmA, chest on chestA, centred)',M._arm&&M._arm[0][0].parent===M.helmA&&M._arm[1][0].parent===M.chestA&&M._arm[0][0].position.y===0&&M._arm[1][0].position.y===0);
  ok('getArmVis reports helm + chest',JSON.stringify(V.getArmVis())==='[true,true,false,false]');
  V.P.inv[V.P.sel]={id:V.toolId(3,0),count:1};V.refreshHand();step(2);
  ok('third person: the tool rides the right-arm anchor',V.getArmTool()===V.toolId(3,0)&&M._tool&&M._tool.parent===M.aR);
  V.setCam(0);step(1);
  ok('a pickaxe in hand replaces the fist (getHand().n===1, not the viewmodel)',V.getHand().n===1&&X.hand().children[0]!==M.hrM.vm.group);
  ok('OG updateHand owns handG again',X.hand().position.x!==0||X.hand().position.z!==0);
  V.P.inv[V.P.sel]=null;V.refreshHand();step(1);
  ok('empty again: the fist is back',V.getHand().n===1&&X.hand().children[0]===M.hrM.vm.group);
  V.P.cos.hat=null;V.P.armor=[null,null,null,null];

  /* ---- LOD: shadows and tiny parts only ---- */
  V.spawnMob('pig',...near(5,0));const lp=V.entities[V.entities.length-1];step(2);
  const tiny=lp.hrM.tiny[0],cs=lp.hrM.meshes.find(o=>o.userData.cs);
  ok('LOD 0 within shadowR (16 at Medium): casts, tiny parts on layer 0',lp.hrM.lod===0&&cs.castShadow===true&&tiny.layers.mask===1);
  lp.x=V.P.x+20;lp.z=V.P.z;step(2);
  ok('LOD 1 between shadowR and lod0: no shadow, tiny parts kept',lp.hrM.lod===1&&cs.castShadow===false&&tiny.layers.mask===1);
  lp.x=V.P.x+30;step(2);
  ok('LOD 2 beyond lod0 (24): tiny parts on layer 1',lp.hrM.lod===2&&tiny.layers.mask===2);
  lp.x=V.P.x+5;step(2);

  /* ---- figurines stay OG ---- */
  ok('makeMobMesh(mt) without {hr:1} stays OG while the cast is live',!X.mk('pig').hrM&&!!X.mk('pig',{hr:1}).hrM);

  /* ---- setDim and resetWorld clear corpses ---- */
  V.spawnMob('cow',...near(-4,-4));const c2=V.entities[V.entities.length-1];step(1);V.hurtMob(c2,999,1,0);
  ok('one corpse before the dimension change',V.hrCorpseCount()===1);
  const home=[V.P.x,V.P.y,V.P.z];
  V.setDim('nether',300.5,40,300.5);step(5);
  ok('setDim clears corpses',V.hrCorpseCount()===0);
  V.setDim('over',home[0],home[1],home[2]);step(20);
  ok('mobs come back from the stash as Hyperreal',V.entities.filter(e=>e.t==='mob'&&!e.dead&&!e.bot&&X.HR_MOB[e.mt]).every(e=>!!e.hrM));

  /* ---- Hyperreal -> OG ---- */
  const zOG=V.entities.find(e=>e.t==='mob'&&!e.dead&&e.mt==='zombie');
  V.spawnMob('sheep',...near(2,2));const sh=V.entities[V.entities.length-1];step(1);V.hurtMob(sh,999,1,0);
  ok('a corpse exists before the switch',V.hrCorpseCount()===1);
  const botE=V.AGENTS[0].e;
  ok('setPack(og) resolves true',await V.setPack('og')===true);
  h=V.getHRE();
  ok('the cast is off; corpses cleared',h.on===false&&h.corpses===0&&V.getTP().id==='og');
  ok('a mob born in Hyperreal gets an OG body',!!zOG&&!zOG.hrM&&zOG.legs.length>0&&inScene(zOG.mesh));
  ok('the OG player model is back (identity)',X.pl()===plOG&&inScene(plOG.G));
  ok('the hand is OG again (empty hand: no fist)',V.getHand().kind===-1&&V.getHand().n===0);
  ok('Hyperreal-born bot bodies were dropped',botE.dead===true);
  step(30);
  ok('bots respawn with OG bodies',V.AGENTS.every(a=>a.dead||(a.e&&!a.e.hrM&&!a.e.M.hr)));
  ok('no Hyperreal mesh is left in the scene',hrMeshesInScene()===0);
  ok('OG updateHand runs again',JSON.stringify([X.hand().position.x,X.hand().position.y,X.hand().position.z])!==JSON.stringify([0,0,0])||hand0==='[0,0,0]');
  ok('no contract misuse',V.getTP().errs.length===0);

  /* ---- a Hyperreal round trip with OG mobs alive keeps the OG objects ---- */
  V.spawnMob('pig',...near(3,3));const pg=V.entities[V.entities.length-1];const pgG=pg.mesh,pgL=pg.legs,pgM=pg.mats;
  await V.setPack('hr',{only:['ents']});step(3);
  ok('second enable swaps again',!!pg.hrM&&V.getHRE().on);
  await V.setPack('og');
  ok('second disable restores the same OG pig mesh, legs and mats',pg.mesh===pgG&&pg.legs===pgL&&pg.mats===pgM&&inScene(pgG)&&!pg.hrM&&!pg._og);
  ok('and the same OG player model',X.pl()===plOG);

  /* ---- resetWorld clears corpses ---- */
  await V.setPack('hr',{only:['ents']});
  V.spawnMob('cow',...near(2,-2));const c3=V.entities[V.entities.length-1];step(1);V.hurtMob(c3,999,1,0);
  ok('a corpse before the new world',V.hrCorpseCount()===1);
  V.startNewWorld('tcsmoke2','1337','s');step(20);
  ok('resetWorld (a new world) clears corpses',V.hrCorpseCount()===0);
  ok('the cast stays live in the new world (player model rebuilt as Hyperreal)',V.getHRE().on&&(V.setCam(1),step(2),X.pl().hr===true));
  V.setCam(0);
  await V.setPack('og');
  ok('OG back after the new world',V.getTP().id==='og'&&hrMeshesInScene()===0);

  /* ---- a cast bug never stops the game loop: OG bodies come back, Hyperreal stays live ---- */
  await V.setPack('hr',{only:['ents']});
  V.spawnMob('pig',...near(3,1));const bp=V.entities[V.entities.length-1];step(2);
  ok('a Hyperreal pig before the fault',!!bp.hrM);
  bp.hrM.s=null;                                              /* hrMobTick will throw on the next frame */
  let threw=null,warned=0;const cw=console.warn;console.warn=(...x)=>{if(String(x[0]).startsWith('[HR]'))warned++;else cw(...x);};
  const notes=await boot.capture('[TP] ',async()=>{try{step(3);}catch(e){threw=e;}});console.warn=cw;
  ok('the fault does not escape the frame (one [HR] warning)',threw===null&&warned===1);
  ok('the cast drops to OG bodies with one note',V.getHRE().broken===true&&V.getHRE().on===false&&!bp.hrM&&bp.legs.length>0&&notes.length===1);
  ok('the rest of Hyperreal stays up (the pack is still live)',V.getTP().hr===true);
  step(5);ok('frames keep running',!!V.P&&V.getHRE().live===0);
  await V.setPack('og');
  ok('OG at the end',V.getTP().id==='og'&&hrMeshesInScene()===0);
});
