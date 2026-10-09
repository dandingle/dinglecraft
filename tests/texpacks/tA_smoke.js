/* tA_smoke.js (Package A): the world module on a seed-1337 world, headless, with stubs_A + fake_assets.
   Every switch uses opt.only=['world'] (B/C are tested by their own suites). Frames from 500000, increasing. */
'use strict';
const boot=require('../lib/hr_boot.js'),{ok}=boot;
const fa=require('../lib/fake_assets.js');
const V=boot({stubs:['A'],assets:'fake',seed:1337});
const step=boot.stepper(500000);
const W={only:['world']};

boot.run(async()=>{
  const B=V.B,P=()=>V.P,scene=boot.scene();
  V.startNewWorld('ta','1337','c');step(5);
  V.GR.mobSpawn=false;V.GR.dayCycle=false;V.GR.snail=false;V.GR.jsc=0;
  V.forceChunksNear(Math.floor(P().x),Math.floor(P().z));step(40);
  const M0=V.tpMats(),OG=M0.og;
  const meshes=()=>{const L=[];for(const ch of V.chunks.values())if(ch.meshes)L.push(...ch.meshes);return L;};
  const users=set=>{const L=[];scene.traverse(o=>{if(o.material&&set.has(o.material))L.push(o);});return L;};
  ok('the default pack is OG',V.getTP().id==='og'&&!V.getHRW().on);
  ok('OG globals are the boot materials (TP.og)',!!OG&&M0.cur.op===OG.op&&M0.cur.cut===OG.cut&&M0.cur.wat===OG.wat);
  ok('the world meshed ('+meshes().length+' chunk meshes)',meshes().length>20);
  ok('Hyperreal is supported with the A stubs and fake assets',V.hrWWhy()==='');
  const ogFlags=['op','cut','wat'].map(k=>[OG[k].transparent,OG[k].opacity,OG[k].depthWrite]);

  /* a held block, a sprite drop and a primed TNT exist before the switch */
  P().inv[P().sel]={id:B.STONE,count:5};V.refreshHand();
  V.spawnDrop(P().x+6,P().y+1,P().z,{id:B.DIRT,count:1});   /* out of pickup range */
  const dropE=V.entities[V.entities.length-1],dropSprite=dropE.mesh;
  ok('an OG block drop is a sprite',dropE.t==='drop'&&dropE.m3d===0&&!dropSprite.geometry);
  V.primeTNT(Math.floor(P().x)+3,Math.floor(P().y)+2,Math.floor(P().z),99);
  const tnt=V.entities[V.entities.length-1];
  const held=()=>users(new Set([OG.op,OG.cut,...(V.tpMats().hr?Object.values(V.tpMats().hr):[])])).filter(o=>!meshes().includes(o)&&o!==tnt.mesh&&!o._hrCube);
  const heldOG=held()[0];
  ok('the held block uses the OG op material',!!heldOG&&heldOG.material===OG.op);

  /* ---- OG -> Hyperreal ---- */
  const packEv=[];V.tpOn('pack',p=>packEv.push(p));
  const prog=[];const r=await V.setPack('hr',Object.assign({progress:f=>prog.push(f)},W));
  const M=V.tpMats(),HR=M.hr;
  ok('setPack(hr,{only:[world]}) resolves true',r===true&&V.getTP().id==='hr'&&V.getHRW().on);
  ok('progress was reported up to 100%',prog.length>0&&prog[prog.length-1]===1);
  ok('the globals are the Hyperreal materials (tagged)',M.cur.op===HR.op&&M.cur.cut===HR.cut&&M.cur.wat===HR.wat&&HR.op.userData.hr===1);
  ok('Hyperreal materials: standard, flat-shaded, atlas map, vertex colours, own cache keys',
    ['op','cut','wat'].every(k=>HR[k].flatShading&&HR[k].map===OG.op.map&&HR[k].vertexColors&&typeof HR[k].customProgramCacheKey==='function'&&HR[k].customProgramCacheKey()==='hrw1|'+k));
  ok('bucket defines: op HR_AO, cut HR_CUT (alpha test, double-sided), wat HR_WATER (transparent, no depth write)',
    'HR_AO' in HR.op.defines&&'HR_CUT' in HR.cut.defines&&HR.cut.alphaTest===0.5&&HR.cut.side===2&&'HR_WATER' in HR.wat.defines&&HR.wat.transparent&&!HR.wat.depthWrite);
  const ms=meshes(),hrSet=new Set(Object.values(HR));
  ok('every chunk mesh carries a Hyperreal material ('+ms.length+')',ms.every(m=>hrSet.has(m.material)));
  const cuts=ms.filter(m=>m.material===HR.cut);
  ok('cut chunk meshes ('+cuts.length+') carry the cutout depth material',cuts.length>0&&cuts.every(m=>m.customDepthMaterial===M.cutDepth)&&M.cutDepth.userData.hr===1);
  ok('Medium uses the atlas-alpha depth material',V.getHRW().cd===0&&!M.cutDepth.onBeforeCompile);
  ok('the held block was swapped (same mesh object)',heldOG.material===HR.op);
  ok('primed TNT was swapped',tnt.mesh.material===HR.op);
  ok('the old sprite drop became a spinning mini cube',dropE.mesh!==dropSprite&&dropE.mesh._hrCube===1&&dropE.m3d===1&&dropE.mesh.material===HR.op);
  ok('no OG chunk material is left on any mesh',users(new Set([OG.op,OG.cut,OG.wat])).length===0);
  ok('the pack event fired once',packEv.join()==='hr');
  const U=M.U;
  ok('uniforms: LUT, albedo + NR arrays, time, normal strength',U&&U.hrLut.value&&U.hrAlb.value&&U.hrNR.value&&U.hrTime.value===0&&U.hrNormalStr.value===1);
  ok('arrays are '+fa.META.blockPx+'px x 3 layers, mipmapped, repeat, anisotropic',U.hrAlb.value.image.width===fa.META.blockPx&&U.hrAlb.value.image.depth===3&&
    U.hrAlb.value.generateMipmaps&&U.hrAlb.value.anisotropy===8&&U.hrAlb.value.flipY===false&&typeof U.hrAlb.value.onUpdate==='function');
  /* packing: layer order = art tiles in meta order (grass_top, lava, leaf_o) */
  const S=64*64,ad=U.hrAlb.value.image.data,nd=U.hrNR.value.image.data;
  ok('albedo packed per layer (RGB from |c, alpha from |m or 255)',ad[0]===10&&ad[3]===255&&ad[S*4]===11&&ad[S*4+3]===77&&ad[2*S*4]===12&&ad[2*S*4+3]===77&&ad[2*S*4+1]===20);
  ok('normal/roughness/emissive packed per layer (X, Y, roughness planes; emissive from |m)',nd[0]===100&&nd[1]===150&&nd[2]===200&&nd[3]===0&&nd[S*4+3]===33);
  const lut=U.hrLut.value.image.data,row=n=>V.tpLutRow(n);
  ok('LUT rows by atlas index: grass_top layer 0 rot+mirror, lava layer 1 opaque/scroll/em 3, leaf_o layer 2',
    row('grass_top').layer===0&&row('grass_top').rot===2&&row('grass_top').mirror&&row('lava').layer===1&&row('lava').opaque&&Math.abs(row('lava').em-3)<.05&&row('leaf_o').layer===2);
  ok('LUT: fallback tiles sample the OG atlas; crosses/wall torches are lit like the ground',row('stone').layer===-1&&row('fl_corn').up&&row('torch').up&&row('torch').layer===-1&&lut.length===4096);   /* v6.1 (P0, ATLAS 32): 1024 rows x RGBA */

  /* ---- live in Hyperreal ---- */
  const t0=U.hrTime.value;step(40);
  ok('40 Hyperreal frames run; the shader clock advances',U.hrTime.value>t0&&V.getTP().id==='hr');
  const bx=Math.floor(P().x),bz=Math.floor(P().z),by=V.surfaceTop(bx,bz);
  V.setBlock(bx+2,by+1,bz+2,B.LEAF_O);V.setBlock(bx+2,by+2,bz+2,B.GLASS);step(4);
  const ms2=meshes();
  ok('re-meshed chunks pick up the Hyperreal materials and the cutout depth',ms2.every(m=>hrSet.has(m.material))&&ms2.filter(m=>m.material===HR.cut).every(m=>m.customDepthMaterial===M.cutDepth));
  V.spawnDrop(P().x+6,P().y+1,P().z+3,{id:B.STONE,count:1});
  const d2=V.entities[V.entities.length-1];
  ok('a Hyperreal block drop is a Mesh with m3d===1',d2.mesh._hrCube===1&&d2.m3d===1&&!!d2.mesh.geometry);
  V.spawnDrop(P().x-6,P().y+1,P().z+3,{id:B.TORCH,count:1});
  const d3=V.entities[V.entities.length-1];
  ok('a torch drop stays a sprite',!d3.mesh._hrCube&&d3.m3d===0);
  P().inv[P().sel]={id:B.TORCH,count:1};V.refreshHand();
  const heldCross=users(new Set([HR.cut])).filter(o=>!meshes().includes(o));
  ok('a held torch uses the Hyperreal cut material',heldCross.length===1);
  P().inv[P().sel]={id:B.STONE,count:5};V.refreshHand();

  /* ---- quality tiers ---- */
  const builds0=V.getHRW().built,medAlb=U.hrAlb.value;
  await V.setQuality(2);
  const Mh=V.tpMats();
  ok('High: new arrays (aniso 16), High cut depth (Hyperreal alpha) on every cut mesh',V.getHRW().key==='64|16'&&V.getHRW().built===builds0+1&&
    V.getHRW().cd===1&&typeof Mh.cutDepth.onBeforeCompile==='function'&&Mh.cutDepth.customProgramCacheKey()==='hrwd1'&&Mh.cutDepth.vertexColors===true&&
    meshes().filter(m=>m.material===HR.cut).every(m=>m.customDepthMaterial===Mh.cutDepth));
  ok('a new cut depth material replaced the Medium one',Mh.cutDepth!==M.cutDepth);
  await V.setQuality(0);
  ok('Low: aniso 4, atlas cut depth, the Medium arrays disposed (only live + previous kept)',V.getHRW().key==='64|4'&&V.getHRW().cd===0&&
    V.getHRW().cache.length===2&&medAlb.disposed>0);
  await V.setQuality(-1);
  ok('Auto resolves to Medium again',V.getTP().qr===1&&V.getHRW().key==='64|8');
  ok('the same materials survive tier changes (no rebuild, no recompile key change)',V.tpMats().hr===HR&&V.tpMats().cur.op===HR.op);

  /* ---- settings persistence ---- */
  await V.setQuality(2);V.saveSettings();await new Promise(r=>setImmediate(r));
  const saved=JSON.parse((await global.storage.get('vox_settings')).value);
  ok('tp/tq are saved with the client settings',saved.tp==='hr'&&saved.tq===2);
  const evBefore=packEv.length,builtBefore=V.getHRW().built;
  for(let i=0;i<3;i++)await V.loadSettings();
  await new Promise(r=>setImmediate(r));
  ok('loadSettings x3 with an unchanged pack: no extra enable',packEv.length===evBefore&&V.getHRW().built===builtBefore&&V.getTP().id==='hr');
  saved.tq=0;await global.storage.set('vox_settings',JSON.stringify(saved));await V.loadSettings();
  ok('loadSettings restores the saved tier (TP.q)',V.getTP().q===0);
  await V.setQuality(-1);

  /* ---- X-ray: Hyperreal materials ghosted while live, OG flags untouched ---- */
  V.toggleXray();step(2);
  const Mx=V.tpMats().hr;
  ok('X-ray in Hyperreal ghosts the Hyperreal materials',Mx.op.transparent&&Mx.op.opacity===0.08&&Mx.wat.opacity===0.04&&Mx.op._xo!==undefined);
  ok('X-ray in Hyperreal leaves the OG materials alone',['op','cut','wat'].every((k,i)=>OG[k]._xo===undefined&&OG[k].transparent===ogFlags[i][0]&&OG[k].opacity===ogFlags[i][1]));
  await V.setPack('og');
  ok('OG with X-ray on: OG materials ghosted, globals OG',V.tpMats().cur.op===OG.op&&OG.op.transparent&&OG.op._xo!==undefined);
  V.toggleXray();step(2);
  ok('X-ray off: OG flags exactly as before',['op','cut','wat'].every((k,i)=>OG[k]._xo===undefined&&OG[k].transparent===ogFlags[i][0]&&OG[k].opacity===ogFlags[i][1]&&OG[k].depthWrite===ogFlags[i][2]));
  await V.setPack('hr',W);
  V.toggleXray();step(2);
  ok('X-ray turned on in Hyperreal ghosts Hyperreal materials',V.tpMats().hr.op._xo!==undefined&&OG.op._xo===undefined);

  /* ---- Hyperreal -> OG: identity ---- */
  const HR2=V.tpMats().hr,alb2=V.tpMats().U.hrAlb.value;
  await V.setPack('og');
  V.toggleXray();step(2);
  const M2=V.tpMats();
  ok('back on OG: the globals are the identical boot materials',M2.cur.op===OG.op&&M2.cur.cut===OG.cut&&M2.cur.wat===OG.wat&&!M2.hr&&!V.getHRW().on);
  ok('no Hyperreal material is left in the scene',users(new Set(Object.values(HR2))).length===0&&users(hrSet).length===0);
  let cdm=0;scene.traverse(o=>{if(o.customDepthMaterial)cdm++;});
  ok('no custom depth material is left in the scene',cdm===0);
  ok('the held block (rebuilt meanwhile) and TNT are back on the OG material',held().length===1&&held()[0].material===OG.op&&tnt.mesh.material===OG.op&&!tnt.dead);
  ok('the OG drop got its identical sprite back; Hyperreal-born cubes became sprites',dropE.mesh===dropSprite&&dropE.m3d===0&&!d2.mesh._hrCube&&d2.m3d===0&&!!d2.mesh.material);
  ok('the arrays were disposed',alb2.disposed>0);
  ok('OG flags after the round trips equal the originals',['op','cut','wat'].every((k,i)=>OG[k].transparent===ogFlags[i][0]&&OG[k].opacity===ogFlags[i][1]&&OG[k].depthWrite===ogFlags[i][2]&&OG[k]._xo===undefined));
  step(20);
  ok('OG frames run after the round trip',V.getTP().id==='og');

  /* ---- a failing enable is fully undone (disable tolerates a partial enable) ---- */
  const MSM=THREE.MeshStandardMaterial;
  THREE.MeshStandardMaterial=class{constructor(){throw new Error('test: no materials');}};
  const notes=await boot.capture('[TP] ',async()=>{const w=console.warn;console.warn=()=>{};try{ok('a failing enable resolves false',await V.setPack('hr',W)===false);}finally{console.warn=w;}});
  THREE.MeshStandardMaterial=MSM;
  ok('...with exactly one note',notes.length===1);
  ok('...and the game is exactly OG again',V.getTP().id==='og'&&V.tpMats().cur.op===OG.op&&!V.getHRW().on&&users(hrSet).length===0&&V.getHRW().cache.length===0);
  step(20);

  /* ---- unsupported: refuses once, stays OG, keeps running ---- */
  const R=boot.renderer();R.capabilities.isWebGL2=false;
  ok('without WebGL2 the world module says why',V.hrWWhy()==='needs WebGL2');
  const n2=await boot.capture('[TP] ',async()=>{ok('setPack(hr) resolves false when unsupported',await V.setPack('hr')===false);});
  ok('...with exactly one note, staying OG',n2.length===1&&V.getTP().id==='og'&&V.tpMats().cur.op===OG.op);
  step(40);ok('...and survives 40 frames',V.getTP().id==='og');
  R.capabilities.isWebGL2=true;

  /* ---- the settings UI follows the pack ---- */
  const el=id=>global.document.getElementById(id);
  V.tpSyncUI();
  ok('OG: the quality row is hidden, the pack select reads og',el('s_pack').value==='og'&&el('s_qrow').style.display==='none');
  await V.setPack('hr',W);V.tpSyncUI();
  ok('Hyperreal: quality row shown, Shaders button hidden, info line shows the Auto tier',el('s_pack').value==='hr'&&el('s_qrow').style.display===''&&
    el('s_shaders').style.display==='none'&&el('s_tpinfo').textContent==='Auto → Medium');
  await V.setPack('og');V.tpSyncUI();
  ok('back on OG: the Shaders button is shown again',el('s_shaders').style.display===''&&el('s_qrow').style.display==='none');
  ok('tpDebugRot toggles the define on live materials',V.tpDebugRot(true)===true&&V.tpDebugRot(false)===false);
});
