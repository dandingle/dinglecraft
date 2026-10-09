/* ----- boot + main loop ----- */
let autoT=0,lastT=0;
function boot(){
  renderer=new THREE.WebGLRenderer({canvas:$('gl'),antialias:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.08,1200);
  camera.rotation.order='YXZ';
  scene=new THREE.Scene();
  scene.add(camera);
  buildAtlas();
  matOp=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true});
  matCut=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true,alphaTest:0.5,side:THREE.DoubleSide});
  matWat=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true,transparent:true,opacity:0.78,depthWrite:false});
  TP.og={op:matOp,cut:matCut,wat:matWat};
  setupSky();setupTorchLights();
  buildHotbar();setupInput();wireMenus();
  addEventListener('resize',()=>{
    renderer.setSize(window.innerWidth,window.innerHeight);
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    if(TP.hr&&HRL.on)hrResize();
    if(SHD.rt){SHD.rt.setSize(window.innerWidth,window.innerHeight);
      SHD.mat.uniforms.uR.value.set(window.innerWidth,window.innerHeight);}
  });
  $('title').style.display='flex';
  refreshWorldList();
  mgBoot();
  setInterval(musicTick,300);
  requestAnimationFrame(frame);
}
function frame(t){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,Math.max(0,t-lastT)/1000||0.016)*GAMESPD;lastT=t;
  if(playing&&P){
    if(!paused){
      if(GR.dayCycle)timeOfDay+=dt/DAY_LEN;
      drainLook();
      updatePlayer(dt);
      updateEntities(dt);
      mobsTick(dt);
      furnaceTick(dt);
      updateChunks();
      updateSky(dt);
      updateTorchLights();
      if(TP.hr)tpFrame(dt);
      updateHand(dt);
      updateCamera();applyShake();
      /* footsteps */
      const hv=Math.hypot(P.vx,P.vz);
      if(P.onGround&&hv>1.5){stepAcc+=dt*hv;if(stepAcc>2.4){stepAcc=0;playSStep();}}
      autoT+=dt;
      if(autoT>60){autoT=0;saveToStorage(WORLD.name,true);}
      if(MODAL.kind==='furnace'&&frameCount%10===0)redrawModal();
    }
    updatePlayerMesh(dt);
    updateDisaster(paused?0:dt);
    if(playing&&!paused)updateStocks(dt);
    trickFrame(paused?0:dt);
    if(playing&&!paused){if(DIM==='over'){processVillages(dt);processParks(dt);processWD(dt);processCells(dt);tickTitans(dt);processRoosts(dt);tickMalg(dt);tickCompass(dt);}tickSpawners(dt);updateBossBar();updateXPHud();tickFlow(dt);updateArmorHud();tickDragons(dt);tickTrail(dt);tickBPass(dt);updateCut(dt);tickWin(dt);tickNuke(dt);tickMega(dt);tickTerr(dt);tickXray(dt);tickGadgets(dt);tickBig(dt);tickDisp(dt);tickLawns(dt);tickCine(dt);tickSnail(dt);tickScare(dt);tickHorror(dt);processNether(dt);processAether(dt);processPuppet(dt);tickPortal(dt);tickBots(dt);tickPCompass(dt);processCrea(dt);}
    const hideCur=playing&&!paused&&P&&!P.dead&&!modalOpen();
    if(hideCur!==curHidden){curHidden=hideCur;$('gl').style.cursor=hideCur?'none':'default';}
    engineSnd(!paused&&!!P.ride&&(P.ride.t==='car'||P.ride.t==='plane'),P.ride?P.ride.spd:0);
    drawRing();
    drawDebug(dt);
    tickAgHud(dt);
    hudLayout();   /* toasts clear of menus, F3 and the player list clear of the HUD (p06e) */
    $('vignette').style.opacity=clamp(hurtFlash*2,0,0.55)+(P.hp<=4&&P.mode==='s'?0.12:0);
    $('waterov').style.opacity=P.eyeWater?(TP.hr&&HRL.on?0.12:0.35):0;
    if(TP.hr&&HRL.on)hrRender();
    else if(SHD.on&&SHD.rt){
      renderer.setRenderTarget(SHD.rt);renderer.render(scene,camera);
      renderer.setRenderTarget(null);renderer.render(SHD.scn,SHD.cam);
    }else renderer.render(scene,camera);
    if(typeof recFrame==='function')recFrame();   /* replays (features/replay.js): grab the frame while the buffer holds it */
    frameCount++;
  }
}

