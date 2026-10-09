/* tB_smoke.js (Package B): the 'light' module on a real seed-1337 world, headless (plan B10).
   setPack('hr',{only:['light']}) with stubs_B (WebGL2 + float targets, so Auto = Medium and the post path runs).
   Title-screen enable; a full day with a constant light count; the pass graph; tiers (memory stable); caves; the Nether and
   the Aether; v6.1 Puppet Purgatory (the theatre sub-presets); X-ray; fullbright; underwater; the Malgorath mirror; adoption round trip; shadow rules; the emitter pool;
   resize/DPR; a failing enable; and an exact OG restore (with and without Shaders). Frames start at 500000. */
'use strict';
const boot=require('../lib/hr_boot.js'),{ok}=boot;
const V=boot({stubs:['B']});
const step=boot.stepper(500000);
const R=boot.renderer(),S=boot.scene(),SB=global.stubsB;
const st=V.hrLState(),HRL=st.HRL,HRFX=st.HRFX;
const H=()=>V.getHRL();
const rflags=()=>JSON.stringify([R.physicallyCorrectLights,R.outputEncoding,R.toneMapping,R.toneMappingExposure,R.autoClear,
  R.shadowMap.enabled,R.shadowMap.type,R.shadowMap.autoUpdate,R.getPixelRatio(),R.info.autoReset]);
const ogScene=()=>JSON.stringify({tl:st.TLIGHTS.map(l=>[l.visible,l.intensity]),sun:[st.sunL.castShadow,+st.sunL.intensity.toFixed(6),st.sunL.shadow.mapSize.width,
  st.sunL.shadow.bias,st.sunL.shadow.normalBias,st.sunL.shadow.camera.left,st.sunL.shadow.camera.far,!!st.sunL.shadow.map],
  spr:[st.sunSpr.visible,st.moonSpr.visible],stars:[st.stars.material.color.r,st.stars.material.opacity],
  cloud:st.cloudG.children[0].material.color.r,lights:V.tpLightCount().key});
const camOf=()=>{let c=null;S.traverse(o=>{if(!c&&o instanceof THREE.PerspectiveCamera)c=o;});return c;};
const warns=[];const w0=console.warn;console.warn=(...a)=>{warns.push(a.map(String).join(' '));};

boot.run(async()=>{
  /* ---- 1. enable at the title screen (P === null, no chunks), then start a world ---- */
  const R0t=rflags();
  ok('title screen: no world yet',V.P===null&&V.playing===false);
  ok('setPack(hr,{only:[light]}) works at the title screen',await V.setPack('hr',{only:['light']})===true&&H().on===true&&V.getTP().live.join()==='light');
  ok('Auto resolves to Medium with float targets: post path, 7 render targets',V.getTP().qr===1&&H().post===true&&H().rts===7);
  ok('the renderer is in Hyperreal mode (physical lights, no renderer tone mapping on the post path)',R.physicallyCorrectLights===true&&R.toneMapping===THREE.NoToneMapping);
  V.startNewWorld('tbsmoke','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.GR.god=true;
  V.setTime(0.3);step(120);
  ok('a world started after the switch picks Hyperreal up (sky, key light, exposure)',HRL.skyOK&&H().keyI>3&&H().exp>0.9&&H().exp<1.2&&H().dim==='over');
  ok('the frame goes through the post chain',R.info.resets>100);
  ok('back to OG from a session begun at the title',await V.setPack('og')===true&&H().on===false&&rflags()===R0t&&SB.rts.size===0);

  /* ---- 2. OG baseline ---- */
  V.setTime(0.3);step(100);
  const R0=rflags(),O0=ogScene(),amb0=V.getLight().amb,L0=V.tpLightCount(),fog0=JSON.stringify([S.fog.near,S.fog.far,S.fog.color.r]);
  ok('OG baseline: 6 OG torch lights + sun + ambient, no shadows',L0.key==='a1 d1 h0 p6 s0'&&V.getShadow()===false&&V.getSHD().on===false);

  /* ---- 3. enable in-world ---- */
  ok('setPack(hr) in a world',await V.setPack('hr',{only:['light']})===true);
  const L1=V.tpLightCount();
  ok('lights: OG torches hidden; hemisphere + 6 pool + mirror added; the sun casts (Medium)',L1.key==='a1 d1 h1 p7 s1'&&st.TLIGHTS.every(l=>!l.visible)&&HRL.pool.length===6);
  ok('the dome replaces the sun sprite; stars boosted for ACES',!!HRL.dome&&HRL.dome.parent===S&&st.sunSpr.visible===false&&st.stars.material.color.r===1.6);
  ok('TP.shadow and shadowsOn() are on (Medium has a 1024 sun shadow)',V.getTP().shadow===true&&V.shadowsOn()===true&&V.getShadow()===true&&st.sunL.shadow.mapSize.width===1024);
  ok('shadow camera: +-40, near 1, far 420, bias -0.0003, normalBias 0.02',st.sunL.shadow.camera.left===-40&&st.sunL.shadow.camera.top===40&&st.sunL.shadow.camera.near===1&&
    st.sunL.shadow.camera.far===420&&st.sunL.shadow.bias===-0.0003&&st.sunL.shadow.normalBias===0.02);
  ok('info.autoReset off (one reset per frame covers every pass)',R.info.autoReset===false);

  /* ---- 4. a full day: light count constant, key never negative, exposure eased ---- */
  let keys=new Set(),neg=false,expBad=false,fogNull=false,minK=1e9,maxK=0;
  for(let i=0;i<600;i++){V.setTime(i/600);step(1);keys.add(V.tpLightCount().key);const h=H();if(h.keyI<0)neg=true;if(!(h.exp>.9&&h.exp<2.3))expBad=true;
    if(!S.fog||!S.background)fogNull=true;minK=Math.min(minK,h.keyI);maxK=Math.max(maxK,h.keyI);}
  ok('600 frames over a full day: the light count never changes',keys.size===1&&[...keys][0]===L1.key||(console.log('  keys '+[...keys]),false));
  ok('key light stays physical (0 .. 4.6), exposure 0.9 .. 2.3, fog and background never null',!neg&&!expBad&&!fogNull&&maxK>4&&maxK<=4.6+1e-9&&minK<0.05);
  V.setTime(0.25);step(80);const noonK=H().keyI,noonE=H().exp;
  V.setTime(0.75);step(1);const e1=H().exp;step(200);const e2=H().exp;
  ok('noon: sun 4.6 from above; midnight: the moon from the other side',Math.abs(noonK-4.6)<1e-6&&H().keyI>0.45&&H().keyI<=0.5&&H().keyDir[1]>0.9);
  ok('exposure eases toward the night value instead of jumping',e1>noonE&&e1<1.2&&Math.abs(e2-1.45)<0.01);
  V.setTime(0.3);step(60);

  /* ---- 5. the pass graph (Medium: bloom 3, no SSAO, FXAA) ---- */
  SB.log=[];step(1);const lg=SB.log;SB.log=null;
  ok('Medium pass graph: scene, 3 bloom downs, 2 ups, composite, FXAA (8 renders)',lg.length===8&&lg[0]===HRFX.sceneRT&&!!lg[0].depthTexture&&lg[1]===HRFX.down[0]&&
    lg[3]===HRFX.down[2]&&lg[4]===HRFX.up[1]&&lg[5]===HRFX.up[0]&&lg[6]===HRFX.ldrRT&&lg[7]===null||(console.log('  renders '+lg.length),false));
  ok('the scene target is half-float with a depth texture; ldr is 8-bit',HRFX.sceneRT.texture.type===THREE.HalfFloatType&&HRFX.sceneRT.depthTexture.type===THREE.UnsignedIntType&&
    HRFX.ldrRT.texture.type!==THREE.HalfFloatType&&HRFX.down[0].width===640&&HRFX.down[2].width===160);
  ok('the composite reads the camera matrices by reference',HRFX.M.comp.uniforms.uInvProj.value===camOf().projectionMatrixInverse&&HRFX.M.comp.uniforms.uCamWorld.value===camOf().matrixWorld);

  /* ---- 6. tiers: switches keep memory stable; Low uses the renderer's ACES ---- */
  await V.setQuality(0);step(2);
  SB.log=[];step(1);const lgLow=SB.log;SB.log=null;
  ok('Low: one render to the screen, renderer ACES, no shadows, 4 pool lights, exposure on the renderer',lgLow.length===1&&lgLow[0]===null&&R.toneMapping===THREE.ACESFilmicToneMapping&&
    R.shadowMap.enabled===false&&HRL.pool.length===4&&H().rts===0&&Math.abs(R.toneMappingExposure-H().exp)<1e-12);
  ok('Low: the fog colour is in display space (ACES + sRGB of the linear horizon)',(()=>{const c=new THREE.Color();const f=HRL.F;V.hrToneJS({r:f[0],g:f[1],b:f[2]},H().exp,c);
    return Math.abs(c.r-S.fog.color.r)<1e-9&&Math.abs(c.b-S.fog.color.b)<1e-9;})());
  await V.setQuality(2);step(2);
  SB.log=[];step(1);const lgHi=SB.log;SB.log=null;
  ok('High: SSAO + blur + 5 bloom levels (13 targets, 14 renders), 2048 shadow, 8 pool lights',H().rts===13&&lgHi.length===14&&lgHi[1]===HRFX.aoRT&&lgHi[2]===HRFX.aoRT2&&
    st.sunL.shadow.mapSize.width===2048&&HRL.pool.length===8&&HRFX.M.ao.defines.HR_N===8);
  await V.setQuality(3);step(2);
  ok('Ultra: 4096 shadow, 12 pool lights, the first one casts, 16 SSAO samples',st.sunL.shadow.mapSize.width===4096&&HRL.pool.length===12&&HRL.pool[0].castShadow===true&&
    HRL.pool.slice(1).every(l=>!l.castShadow)&&HRFX.M.ao.defines.HR_N===16&&V.tpLightCount().key==='a1 d1 h1 p13 s2');
  const made0=SB.made;
  for(let i=0;i<5;i++){await V.setQuality(0);step(2);await V.setQuality(3);step(2);await V.setQuality(1);step(2);}
  ok('15 tier switches: live render targets back to the Medium set (7), none leaked',SB.rts.size===7&&H().rts===7&&SB.made>made0);
  ok('Medium again: 6 pool lights, 1024 shadow, light count as at enable',HRL.pool.length===6&&st.sunL.shadow.mapSize.width===1024&&V.tpLightCount().key===L1.key);
  await V.setQuality(-1);step(2);

  /* ---- 7. caves ---- */
  const P=V.P,sx=Math.floor(P.x),sz=Math.floor(P.z),ci=V.colInfo(sx,sz);
  const dayHemi=H().hemiI;
  P.y=ci.h-11;P.vy=0;P.x=sx+.5;P.z=sz+.5;
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=-1;dy<=3;dy++)V.setBlock(sx+dx,Math.floor(P.y)+dy,sz+dz,(Math.abs(dx)===2||Math.abs(dz)===2||dy===-1||dy===3)?V.B.STONE:V.B.AIR);
  for(let i=0;i<60;i++){P.x=sx+.5;P.z=sz+.5;step(1);}
  ok('ugT rises in a sealed cave',V.getUG()>0.8&&Math.abs(H().ug-V.getUG())<1e-12);
  ok('caves: hemisphere x0.05-ish, ambient floor up to 0.12, exposure up (x1.5)',H().hemiI<dayHemi*.25&&H().amb>0.1&&H().cfg.exp>1.2);
  ok('caves fog to dark, not to the sky colour',S.fog.color.r<0.2&&S.fog.color.g<0.2);
  /* torches, lava and glowstone feed the pool */
  const ty=Math.floor(P.y);
  V.setBlock(sx+1,ty,sz+1,V.B.TORCH);
  step(16);
  const lit=H().poolLit,torchSlot=HRL.slots.findIndex(c=>c&&c.kind===0);
  ok('a torch nearby lights a pool light at its position (torch colour, range 14)',lit>=1&&torchSlot>=0&&HRL.pool[torchSlot].distance===14&&
    Math.abs(HRL.pool[torchSlot].position.x-(sx+1.5))<1e-9&&HRL.pool[torchSlot].intensity>10);
  const i1=HRL.pool[torchSlot].intensity;step(3);
  ok('torch light flickers frame to frame',HRL.pool[torchSlot].intensity!==i1);
  V.setBlock(sx-1,ty-1,sz-1,V.B.LAVA);V.setBlock(sx+1,ty+3,sz-1,V.B.GLOWSTONE);
  step(20);
  const kinds=new Set(HRL.slots.filter(Boolean).map(c=>c.kind));
  ok('lava (air above) and glowstone clusters join the pool from the emitter cache',kinds.has(1)&&kinds.has(2)&&H().emCells>=2);
  {const cells=[...HRL.em.values()].reduce((a,e)=>a.concat(e.cells),[]),tc=HRL.slots.find(c=>c&&c.kind===0);   /* WP-Z: no light sitting on the melt */
   const lv=cells.find(c=>c.kind===1&&Math.abs(c.x-(sx-.5))<1e-6&&Math.abs(c.z-(sz-.5))<1e-6);
   ok('the lava light hangs 0.6-2 blocks over the melt, the torch light just above the flame'+(lv&&tc?'':' (lava '+(lv&&lv.y)+', torch '+(tc&&tc.y)+', floor '+ty+')'),
     !!lv&&lv.y>=ty+0.6-1e-9&&lv.y<=ty+2+1e-9&&!!tc&&Math.abs(tc.y-(ty+.8))<1e-9);}
  V.setBlock(sx+1,ty,sz+1,V.B.AIR);step(16);
  ok('removing the torch frees its pool light',!HRL.slots.some(c=>c&&c.kind===0));
  P.y=ci.h+2;P.vy=0;for(let i=0;i<120;i++)step(1);
  ok('back on the surface ugT falls',V.getUG()<0.2);

  /* ---- 8. dimensions ---- */
  const LK=V.tpLightCount().key;
  V.travelNether();step(30);
  ok('Nether: no key light, hemi 1.1, ambient 0.12, ember fog at OG near/far, flat dome, no shadow updates',H().dim==='nether'&&H().keyI===0&&Math.abs(H().hemiI-1.1)<1e-9&&Math.abs(H().amb-.12)<1e-9&&
    Math.abs(S.fog.near-V.getRD()*16*.3)<1e-9&&Math.abs(S.fog.far-V.getRD()*16*.85)<1e-9&&HRL.domeU.uFlat.value===1&&R.shadowMap.needsUpdate===false&&H().cfg.hazeFall===0);
  ok('Nether keeps the light count',V.tpLightCount().key===LK);
  V.travelNether();step(30);
  ok('back to the overworld from the Nether',H().dim==='over'&&H().keyI>3);
  V.travelAether();step(90);
  ok('Aether: key 5.3 from a fixed high sun, hemi 1.2, exposure 0.85, haze base below the player, capped at .35',H().dim==='aether'&&Math.abs(H().keyI-5.3)<1e-9&&Math.abs(H().hemiI-1.2)<1e-9&&
    Math.abs(H().cfg.exp-.85)<.02&&Math.abs(H().cfg.hazeBase-(V.P.y-8))<1e-9&&H().cfg.hazeMax===.35&&H().keyDir[1]>.8);
  ok('Aether keeps the light count',V.tpLightCount().key===LK);
  V.setDim('over',sx+.5,ci.h+2,sz+.5);step(30);
  ok('back to the overworld from the Aether',H().dim==='over');

  /* ---- 8b. v6.1 Puppet Purgatory (P7): the theatre preset and its sub-presets keep the light count ---- */
  if(typeof V.mpEnterNow==='function'&&typeof V.hrMupForce==='function'){
    const LKp=V.tpLightCount().key;
    V.mpEnterNow();step(40);
    ok('purgatory: the theatre preset (dim puppet, SHOW, no sun disc, fog and background kept)',H().dim==='puppet'&&H().theatre!==''&&HRL.domeU.uFlat.value===1&&!!S.fog&&!!S.background);
    let pk=new Set(),pneg=false,pnull=false;
    for(const k of [null,'show','warn','blackout','bomber','bigpig','bigfrog','work',null]){V.hrMupForce(k);
      for(let i=0;i<60;i++){step(1);pk.add(V.tpLightCount().key);if(H().keyI<0)pneg=true;if(!S.fog||!S.background)pnull=true;}}
    ok('purgatory: 540 frames over every sub-preset, the light count never changes',pk.size===1&&[...pk][0]===LKp||(console.log('  keys '+[...pk]),false));
    ok('purgatory: key never negative, fog and background never null',!pneg&&!pnull);
    V.hrMupForce(null);V.mpExitNow({abandon:true});step(30);
    V.setDim('over',sx+.5,ci.h+2,sz+.5);step(30);
    ok('back to the overworld from purgatory (overworld preset, same light count)',H().dim==='over'&&H().keyI>1&&V.tpLightCount().key===LKp);
  }

  /* ---- 9. X-ray, fullbright, underwater ---- */
  V.toggleXray();step(4);
  ok('X-ray: no AO, no haze, no shadow-map updates',H().cfg.aoOn===0&&H().cfg.hazeOn===0&&R.shadowMap.needsUpdate===false);
  V.toggleXray();step(4);
  ok('X-ray off: shadow updates resume (every 2nd frame at Medium)',(()=>{let n=0;for(let i=0;i<4;i++){step(1);if(R.shadowMap.needsUpdate)n++;}return n===2;})());
  V.setBright(true);step(3);
  ok('fullbright: hemi white/0xd8d8d8 at 2.7, ambient 0.8, AO halved',Math.abs(H().hemiI-2.7)<1e-9&&Math.abs(H().amb-.8)<1e-9&&Math.abs(H().cfg.aoStr-.35)<1e-9);
  V.setBright(false);step(3);
  const eyeY=Math.floor(V.P.y+V.P.eyeY);
  V.setBlock(sx,eyeY,sz,V.B.WATER);for(let i=0;i<3;i++){V.P.x=sx+.5;V.P.z=sz+.5;step(1);}
  ok('underwater: teal fog 0.5 .. 18, flat dome, haze off, lighter overlay (0.12)',V.P.eyeWater===true&&S.fog.near===.5&&S.fog.far===18&&HRL.domeU.uFlat.value===1&&
    H().cfg.hazeOn===0&&+document.getElementById('waterov').style.opacity===0.12);
  V.setBlock(sx,eyeY,sz,V.B.AIR);step(3);

  /* ---- 10. Malgorath's core light is mirrored, never counted ---- */
  const LKm=V.tpLightCount().key;
  V.spawnMob('demon',V.P.x+6,V.P.y,V.P.z+6);const dm=V.entities[V.entities.length-1];
  let core=null;dm.mesh.traverse(o=>{if(o.isPointLight)core=o;});
  step(2);
  ok('a spawned demon\'s point light is hidden before its first Hyperreal frame',!!core&&core.visible===false&&H().foreign===1);
    ok('the mirror carries it (intensity x16, its colour)',H().mirrorI>0&&Math.abs(H().mirrorI-core.intensity*16)<1e-9&&Math.abs(HRL.mirror.color.r-core.color.r)<1e-9);
  ok('the light count is unchanged by the demon',V.tpLightCount().key===LKm);
  dm.dead=true;S.remove(dm.mesh);step(2);
  ok('the mirror goes dark when the demon is gone',H().mirrorI===0);

  /* ---- 11. adoption ---- */
  V.spawnMob('pig',V.P.x+3,V.P.y,V.P.z+3);const pig=V.entities[V.entities.length-1];step(1);
  const pm=[];pig.mesh.traverse(o=>{if(o.material)for(const m of [].concat(o.material))pm.push(m);});
  ok('a spawned pig\'s materials are adopted (hrLin, flag)',pm.length>0&&pm.every(m=>m.onBeforeCompile===V.hrLin&&m.userData.hrLin===1)&&H().adopted>=pm.length);
  const tagged=V.hrTag(new THREE.MeshStandardMaterial()),shm=new THREE.ShaderMaterial({uniforms:{}});
  const own=new THREE.MeshLambertMaterial();own.onBeforeCompile=function mine(sh){sh.mine=1;};const ownF=own.onBeforeCompile;
  const g=new THREE.Group();g.add(new THREE.Mesh(undefined,tagged),new THREE.Mesh(undefined,shm),new THREE.Mesh(undefined,own));S.add(g);step(1);
  ok('Hyperreal-tagged and ShaderMaterials are never adopted',!tagged.userData.hrLin&&!Object.prototype.hasOwnProperty.call(tagged,'onBeforeCompile')&&!shm.userData);
  const shTest={fragmentShader:'vec4 diffuseColor = vec4( diffuse, opacity );'};own.onBeforeCompile(shTest,R);
  ok('a material with its own onBeforeCompile is wrapped (its patch, then hrLin) with its own cache key',shTest.mine===1&&shTest.fragmentShader.includes('pow( diffuse')&&
    typeof own.customProgramCacheKey==='function'&&own.customProgramCacheKey().startsWith('hrlin|'));
  ok('chunk materials are adopted in a B-only build (no A to tag them)',st.HRFX.adopted.has([...V.chunks.values()].find(c=>c.meshes&&c.meshes.length).meshes[0].material));

  /* ---- 12. shadow rules ---- */
  const chs=[...V.chunks.values()].filter(c=>c.meshes);
  const opm=chs.flatMap(c=>c.meshes.filter(m=>m.renderOrder===0)),wat=chs.flatMap(c=>c.meshes.filter(m=>m.renderOrder===2));
  ok('chunk solids cast + receive; water receives only',opm.length>20&&opm.every(m=>m.castShadow&&m.receiveShadow)&&wat.length>0&&wat.every(m=>!m.castShadow&&m.receiveShadow));
  ok('clouds neither cast nor receive',st.cloudG.children.every(m=>!m.castShadow&&!m.receiveShadow));
  ok('the pig (spawned in Hyperreal) casts + receives through hrShadowify',(()=>{let a=true;pig.mesh.traverse(o=>{if(o.isMesh&&!(o.castShadow&&o.receiveShadow))a=false;});return a;})());
  V.P.inv[V.P.sel]={id:V.B.STONE,count:4};V.refreshHand();step(1);V.applyShadows(true);
  const hand=[];camOf().traverse(o=>{if(o.isMesh)hand.push(o);});
  ok('the held block neither casts nor receives; applyShadows in Hyperreal keeps B\'s rules',hand.length>=1&&hand.every(m=>!m.castShadow&&!m.receiveShadow)&&
    st.sunL.shadow.mapSize.width===1024&&R.shadowMap.autoUpdate===false);
  V.P.inv[V.P.sel]=null;V.refreshHand();

  /* ---- 13. resize and DPR ---- */
  const rz=SB.resize;
  global.devicePixelRatio=2;global.innerWidth=1000;global.innerHeight=600;for(const f of rz)f();
  ok('resize + DPR 2: pixel ratio capped at the tier (1.25), targets rebuilt at the drawing-buffer size',rz.length>0&&R.getPixelRatio()===1.25&&HRFX.sceneRT.width===1250&&
    HRFX.sceneRT.height===750&&HRFX.M.fxaa.uniforms.uTexel.value.x===1/1250&&SB.rts.size===7);
  global.devicePixelRatio=1;global.innerWidth=1280;global.innerHeight=720;for(const f of rz)f();
  ok('back to DPR 1',R.getPixelRatio()===1&&HRFX.sceneRT.width===1280);

  /* ---- 14. paused frames render without sky updates ---- */
  V.pauseGame();const t0=HRL.t;step(5);
  ok('paused: frames still render, the sky clock stands still',HRL.t===t0&&R.info.resets>0);
  V.resumeGame();step(2);

  /* ---- 15. back to OG: everything B touched is restored ---- */
  V.setTime(0.3);step(100);
  ok('setPack(og) resolves true',await V.setPack('og')===true);
  step(2);
  ok('OG: getShadow() false, Shaders off, TP.shadow off',V.getShadow()===false&&V.getSHD().on===false&&V.getTP().shadow===false);
  ok('OG: renderer flags equal the pre-Hyperreal snapshot',rflags()===R0||(console.log('  '+rflags()+' vs '+R0),false));
  ok('OG: torch lights, sun, sprites, stars, clouds and light count exactly as before',ogScene()===O0||(console.log('  '+ogScene()+'\n  vs '+O0),false));
  ok('OG: ambient equals OG for the same time of day',Math.abs(V.getLight().amb-amb0)<1e-3);
  ok('OG: fog near/far/colour recomputed by OG',JSON.stringify([S.fog.near,S.fog.far,S.fog.color.r])===fog0);
  ok('OG: nothing of B is left in the scene (dome, hemi, pool, mirror)',(()=>{let n=0;S.traverse(o=>{if(o.userData&&o.userData.hr&&(o.isLight||o.name==='hrDome'))n++;});return n===0;})()&&!HRL.dome&&!HRL.hemi&&!HRL.mirror);
  ok('OG: every adopted material is restored (no own onBeforeCompile, no flag), the wrapped one gets its own back',
    pm.every(m=>!Object.prototype.hasOwnProperty.call(m,'onBeforeCompile')&&!m.userData.hrLin)&&own.onBeforeCompile===ownF&&!Object.prototype.hasOwnProperty.call(own,'customProgramCacheKey')&&HRFX.adopted.size===0);
  ok('OG: render targets disposed, shadow map released, info.autoReset back',SB.rts.size===0&&!st.sunL.shadow.map&&R.info.autoReset===true);
  S.remove(g);
  /* OG frames render through OG's path again */
  SB.log=[];step(1);const lgOG=SB.log;SB.log=null;
  ok('OG frames render exactly once, straight to the screen',lgOG.length===1&&lgOG[0]===null);

  /* ---- 16. Shaders on before Hyperreal ---- */
  V.setShaders(true);step(3);const R1=rflags(),sm1=st.sunL.shadow.mapSize.width;
  await V.setPack('hr',{only:['light']});step(5);
  ok('Shaders on, then Hyperreal: B owns the shadow setup',st.sunL.shadow.mapSize.width===1024&&R.shadowMap.autoUpdate===false);
  await V.setPack('og');step(2);
  ok('Shaders mode survives the round trip (shadows on, OG 2048 map, renderer as before)',V.getSHD().on===true&&V.getShadow()===true&&sm1===2048&&
    st.sunL.shadow.mapSize.width===2048&&rflags()===R1);
  V.setShaders(false);step(2);
  const R2=rflags(),O2=ogScene();   /* OG's own Shaders toggle leaves PCFSoft + its 2048 map settings behind: new baseline */

  /* ---- 17. an enable that fails half-way leaves OG intact ---- */
  const SG=THREE.SphereGeometry;THREE.SphereGeometry=function(){throw new Error('tB deliberate dome failure');};
  const Rb=rflags(),Ob=ogScene(),rt0=SB.rts.size;let r17;   /* OG keeps SHD.rt from step 16 */
  const n17=await boot.capture('[TP] ',async()=>{r17=await V.setPack('hr',{only:['light']});});
  THREE.SphereGeometry=SG;
  ok('a failing enable resolves false with one note',r17===false&&V.getTP().id==='og'&&n17.length===1);
  ok('and disable() undid the partial enable (renderer, lights, sprites)',rflags()===Rb&&ogScene()===Ob&&H().on===false&&H().rts===0&&SB.rts.size===rt0);
  step(20);
  ok('OG keeps running afterwards',!!V.P&&V.getTP().id==='og'&&!V.getTP().busy);

  /* ---- 18. a second full Hyperreal session reuses nothing stale ---- */
  ok('Hyperreal again',await V.setPack('hr',{only:['light']})===true&&H().rts===7&&SB.rts.size===rt0+7&&V.tpLightCount().key===L1.key);
  step(30);await V.setPack('og');step(2);
  ok('and OG again, identical',rflags()===R2&&ogScene()===O2);
  console.warn=w0;
  const bad=warns.filter(s=>!/deliberate/.test(s));
  ok('no warnings during the suite'+(bad.length?' ('+bad[0].slice(0,120)+')':''),bad.length===0);
  ok('no contract errors',V.getTP().errs.length===0);
});
