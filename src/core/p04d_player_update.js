/* ----- per-frame player logic ----- */
/* ---- capture speed control: run the sim slow, slow+smooth the mouse to match,
   so recorded footage sped back up looks like normal 1x gameplay ---- */
let GAMESPD=1;
let lookPX=0,lookPY=0; /* pending look delta buffered for slow-mo smoothing */
/* Chrome sometimes reports one huge bogus movement under pointer lock (worst right after a
   re-lock, e.g. closing chat): the camera "pings" sideways. Real flicks ramp up over several
   events, so a lone giant jump out of near-stillness, or anything in the first moments after
   locking, is dropped. */
const MF={lockT:0,prev:0,t:0};
function mouseFilter(dx,dy){
  const now=performance.now();
  if(now-MF.lockT<80)return null;
  const mag=Math.max(Math.abs(dx),Math.abs(dy));
  const prev=now-MF.t>120?0:MF.prev;
  MF.t=now;
  if(mag>280&&prev<70){MF.prev=0;return null;}
  MF.prev=mag;
  return [dx,dy];
}
let MSENS=1;   /* Release 1.0: the Mouse Sensitivity slider (Settings), 1 = classic */
function look(dx,dy,sens){
  if(!P)return;
  sens*=MSENS;
  if(GAMESPD<1){
    /* slow the mouse by the same factor as time, and buffer it for smoothing */
    lookPX-=dx*sens*GAMESPD;
    lookPY-=dy*sens*GAMESPD;
  }else{
    P.yaw-=dx*sens;
    P.pitch=clamp(P.pitch-dy*sens,-1.55,1.55);
  }
}
function drainLook(){
  if(!P||GAMESPD>=1||(!lookPX&&!lookPY))return;
  const k=0.3; /* ease toward the target so sped-up footage reads smooth */
  const ax=lookPX*k,ay=lookPY*k;
  lookPX-=ax;lookPY-=ay;
  if(Math.abs(lookPX)<1e-4)lookPX=0;
  if(Math.abs(lookPY)<1e-4)lookPY=0;
  P.yaw+=ax;
  P.pitch=clamp(P.pitch+ay,-1.55,1.55);
  if(P.pitch<=-1.55||P.pitch>=1.55)lookPY=0;
}
function updatePlayer(dt){
  if(!P||P.dead)return;
  if(CUT.on){P.vx=0;P.vz=0;P.vy=0;return;}
  if(!chunkAt(Math.floor(P.x),Math.floor(P.z)))return; /* terrain not ready */
  if(P.ride&&P.ride.dead)P.ride=null;
  if(P.ride){
    updateRide(dt);
    if(P.ride){
      P.hurtT=Math.max(0,P.hurtT-dt);P.atkT=Math.max(0,P.atkT-dt);P.useT=Math.max(0,P.useT-dt);
      if(hurtFlash>0)hurtFlash=Math.max(0,hurtFlash-dt);
      if(P.swing>0)P.swing=Math.max(0,P.swing-dt*3.5);
      if(P.y<-12){P.voidT-=dt;if(P.voidT<=0){P.voidT=0.4;P.hurtT=0;LASTDMG={by:null,how:'void',t:AG_T};damagePlayer(4);}}
      ACTOR='Dan';try{doMine(dt);doUse(dt);}finally{ACTOR=null;}
      return;
    }
  }
  const fly=P.flying&&(P.mode==='c'||powActive('fly'));
  /* -- read input -- */
  let f=(terrOpen||cineOpen)?0:(KEY.KeyW?1:0)-(KEY.KeyS?1:0)+TOUCH.f, s=(terrOpen||cineOpen)?0:(KEY.KeyD?1:0)-(KEY.KeyA?1:0)+TOUCH.s;
  f=clamp(f,-1,1);s=clamp(s,-1,1);
  P.sneak=!!KEY.ShiftLeft&&!fly&&!modalOpen();
  const wantSprint=(!!KEY.ControlLeft||!!KEY.Sprint||DBLW.on)&&f>0&&P.hunger>3&&!P.sneak;
  P.sprint=wantSprint&&(P.sprint||true)&&f>0;
  /* double-tap space toggles fly in creative (or with Sky Walker) */
  if(KEY.Space&&!P._sp&&!terrOpen&&!cineOpen){
    if(P.mode==='c'||powActive('fly')){
      if(performance.now()-P._tap<280){P.flying=!P.flying;P.vy=0;}
      P._tap=performance.now();
    }
    if(!P.onGround&&!P.flying&&!P.inWater&&GDG.dj&&!P._dj){
      P.vy=Math.max(P.vy,8.8);P._dj=true;
      burstParticles(P.x,P.y+0.1,P.z,B.WOOL,6,0.5);playS('pop');
    }
  }
  P._sp=!!KEY.Space;
  /* -- water state -- */
  const fb=getBlock(Math.floor(P.x),Math.floor(P.y+0.4),Math.floor(P.z));
  P.inWater=fb===B.WATER;
  P.inLava=fb===B.LAVA;
  if(P.inLava){
    P.lavaAcc=(P.lavaAcc||0)+dt;
    if(P.lavaAcc>0.5){P.lavaAcc=0;if(!powActive('fire')){LASTDMG={by:null,how:'lava',t:AG_T};damagePlayer(4);playS('sizzle');}
      burstParticles(P.x,P.y+0.8,P.z,B.LAVA,4,0.5);}
  }else P.lavaAcc=0;
  const ep=eyePos();
  P.eyeWater=getBlock(Math.floor(ep[0]),Math.floor(ep[1]),Math.floor(ep[2]))===B.WATER;
  /* -- wish direction -- */
  const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw);
  let wx=-sy*f+cy*s, wz=-cy*f-sy*s;
  const wl=Math.hypot(wx,wz);
  if(wl>0){wx/=wl;wz/=wl;}
  let spd=4.32;
  if(P.sprint)spd=5.6;
  if(P.sneak)spd=1.31;
  if(powActive('speed'))spd*=1.6;
  if(P.inWater){spd=2.2;P.sprint=false;}
  if(getBlock(Math.floor(P.x),Math.floor(P.y)-1,Math.floor(P.z))===B.SOULSAND){spd*=0.45;P.sprint=false;}
  if(DIM==='puppet')spd=piSpeed(spd);
  if(P.inLava){spd=1.6;P.sprint=false;P.vy=Math.min(P.vy,1.2);}
  if(fly){spd=P.sprint?21:10.9;}
  /* slipperiness */
  const under=getBlock(Math.floor(P.x),Math.floor(P.y-0.5),Math.floor(P.z));
  const ice=DEFS[under].slippery&&P.onGround;
  let rate=P.onGround?(ice?2.5:16):4.5;
  if(P.inWater)rate=6;
  if(fly)rate=9;
  const k=1-Math.exp(-dt*rate);
  P.vx=lerp(P.vx,wx*spd,k);
  P.vz=lerp(P.vz,wz*spd,k);
  /* -- vertical -- */
  if(fly){
    const vt=(terrOpen||cineOpen)?0:(KEY.Space?9:0)+(KEY.ShiftLeft?-9:0);
    P.vy=lerp(P.vy,vt,1-Math.exp(-dt*9));
  }else if(P.inWater){
    P.vy-=8*dt;
    if(KEY.Space&&!terrOpen&&!cineOpen)P.vy=lerp(P.vy,3.6,1-Math.exp(-dt*8));
    if(KEY.Space&&!terrOpen&&!cineOpen){ /* clamber out onto land */
      const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
      const bx=Math.floor(P.x+fx*0.62),bz=Math.floor(P.z+fz*0.62),by=Math.floor(P.y+0.3);
      if(DEFS[getBlock(bx,by,bz)].solid&&!DEFS[getBlock(bx,by+1,bz)].solid&&!DEFS[getBlock(bx,by+2,bz)].solid)
        P.vy=8.6;
    }
    P.vy=clamp(P.vy,-3.2,8.6);
    P.fallD=0;
  }else{
    if(KEY.Space&&P.onGround&&!terrOpen&&!cineOpen){P.vy=powActive('jump')?12.5:((P.bigT||0)>0?9.6:8.2);P.exh+=0.2;playSStep();}
    P.vy-=GRAV*(GDG.grav?0.55:1)*dt;
    if(P.vy<-50)P.vy=-50;
    if(DIM==='puppet')piVertical(dt);
  }
  /* -- integrate -- */
  const wasG=P.onGround;
  moveBody(P,P.vx*dt,P.vy*dt,P.vz*dt,P.sneak);
  rampSnap(P,true,0.6);
  /* fall damage */
  if(!fly&&!P.inWater){
    if(!P.onGround&&P.vy<0)P.fallD+=-P.vy*dt;
    if(P.onGround&&!wasG){
      const _tb=getBlock(Math.floor(P.x),Math.floor(P.y)-1,Math.floor(P.z))===B.TRAMP;
      if(_tb&&!P.sneak&&P.fallD>0.5){P.vy=Math.min(26,Math.max(10,P.fallD*1.35));P.onGround=false;playS('boing');}
      else if(GDG.tramp&&P.fallD>4){P.vy=Math.min(12,P.fallD*0.85);P.onGround=false;playS('pop');}
      let dmg=(powActive('feather')||!GR.fallDmg||GDG.tramp||_tb)?0:Math.floor(P.fallD-3.2);
      if(DIM==='puppet')dmg=piLand(dmg);
      if(dmg>0){LASTDMG={by:null,how:'fall',t:AG_T};damagePlayer(dmg);}
      if(P.fallD>0.8&&dmg<=0)playSStep();
      P.fallD=0;
    }
  }else P.fallD=0;
  if(DIM==='aether'&&P.y<1.5&&!P.dead){
    setDim('over',P.x,WH-4,P.z);
    showToast('The islands have rejected you.');
  }
  /* eye height smoothing */
  P.eyeY=lerp(P.eyeY,P.sneak?1.42:1.62,1-Math.exp(-dt*14));
  /* exhaustion from motion */
  const hv=Math.hypot(P.vx,P.vz);
  if(hv>0.5)P.exh+=dt*(P.sprint?0.45:0.06);
  /* -- environment damage -- */
  if(P.eyeWater){
    P.airT+=dt;
    if(P.airT>1){P.airT=0;if(P.air>0)P.air--;else{LASTDMG={by:null,how:'drown',t:AG_T};damagePlayer(2);}drawStats();}
  }else if(P.air<10){P.air=10;P.airT=0;drawStats();}
  if(boxTouches(P.x,P.y,P.z,P.hw,P.h,'hurts')){
    P.cactusT-=dt;
    if(P.cactusT<=0){P.cactusT=0.6;damagePlayer(1);}
  }else P.cactusT=0;
  if(P.y<-12){P.voidT-=dt;if(P.voidT<=0){P.voidT=0.4;P.hurtT=0;LASTDMG={by:null,how:'void',t:AG_T};damagePlayer(4);}}
  /* -- hunger / regen -- */
  if(P.mode==='s'){
    while(P.exh>=4){P.exh-=4;if(P.hunger>0)P.hunger--;drawStats();}
    if(P.hunger>=16&&P.hp<20){
      P.regenT+=dt;
      if(P.regenT>=1.2){P.regenT=0;P.hp=Math.min(20,P.hp+1);P.exh+=1.0;drawStats();}
    }else P.regenT=0;
    if(P.hunger<=0){
      P.starveT+=dt;
      if(P.starveT>=4){P.starveT=0;if(P.hp>1){P.hurtT=0;damagePlayer(1);}}
    }else P.starveT=0;
  }
  /* -- timers -- */
  P.hurtT=Math.max(0,P.hurtT-dt);
  P.atkT=Math.max(0,P.atkT-dt);
  P.useT=Math.max(0,P.useT-dt);
  if(hurtFlash>0)hurtFlash=Math.max(0,hurtFlash-dt);
  if(P.swing>0)P.swing=Math.max(0,P.swing-dt*3.5);
  /* -- actions -- */
  ACTOR='Dan';try{doMine(dt);doUse(dt);}finally{ACTOR=null;}
}

/* left mouse: attack / mine */
function doMine(dt){
  if(!MB.l||modalOpen()){MINE.active=false;MINE.prog=0;return;}
  const hsg=heldStack();
  if(hsg&&DEFS[hsg.id].gun){MINE.active=false;MINE.prog=0;return;} /* LMB fires instead */
  const e=eyePos(),d=lookDir();
  let tgt=pickMob(e[0],e[1],e[2],d[0],d[1],d[2],3.2);
  const carT=pickCar(e[0],e[1],e[2],d[0],d[1],d[2],3.4);
  if(carT&&(!tgt||carT.t<tgt.t))tgt={e:carT.e,t:carT.t,car:true};
  const hit=raycastB(e[0],e[1],e[2],d[0],d[1],d[2],REACH);
  if(MGP_ON&&!tgt)mgSwingMiss(e,d,hit);
  if(tgt&&(!hit||tgt.t<hit.t)){
    MINE.active=false;MINE.prog=0;
    if(P.atkT<=0){
      P.atkT=0.32;P.swing=1;
      const st=heldStack(),tl=st&&DEFS[st.id].tool;
      let dmg=(tl?tl.dmg:1)+((P.bigT||0)>0?2:0);
      const E=st&&st.ench;
      if(E&&E.sharp)dmg+=E.sharp*1.2;
      if(tgt.car)hitCar(tgt.e,dmg);
      else{
        const kb=1+(E&&E.knock?E.knock*0.8:0);
        HIT_BY='Dan';HIT_HOW='melee';hurtMob(tgt.e,dmg,(tgt.e.x-P.x)*kb,(tgt.e.z-P.z)*kb);HIT_BY=null;HIT_HOW=null;
        if(E&&E.steal&&P.hp<20){P.hp=Math.min(20,P.hp+mgSteal(tgt.e,E.steal*0.5));drawStats();}
      }
      if(tl)damageHeld(tl.type==='sword'?1:2);
    }
    return;
  }
  if(!hit){MINE.active=false;MINE.prog=0;return;}
  const dd=DEFS[hit.id];
  if(dd.hard<0||(MGP_ON&&mgProtected(hit.x,hit.y,hit.z,'mine'))){MINE.active=false;MINE.prog=0;return;}
  P.swing=Math.max(P.swing,0.6);
  if(P.mode==='c'){
    if(P.atkT<=0){P.atkT=0.22;breakBlock(hit.x,hit.y,hit.z,false);}
    MINE.active=false;return;
  }
  if(!MINE.active||MINE.x!==hit.x||MINE.y!==hit.y||MINE.z!==hit.z){
    if(DIM!=='puppet'&&blockComesAlive(hit.x,hit.y,hit.z,hit.id)){MINE.active=false;MINE.prog=0;return;}
    MINE.active=true;MINE.x=hit.x;MINE.y=hit.y;MINE.z=hit.z;
    MINE.prog=0;MINE.need=breakTime(hit.id,heldStack());
  }
  MINE.prog+=dt;
  if(frameCount%9===0)burstParticles(hit.x+0.5+hit.nx*0.45,hit.y+0.5+hit.ny*0.45,hit.z+0.5+hit.nz*0.45,hit.id,2);
  if(MINE.prog>=MINE.need){
    const harvest=canHarvest(hit.id,heldStack());
    breakBlock(hit.x,hit.y,hit.z,harvest);
    if(dd.hard>0)damageHeld(dd.toolClass&&heldStack()&&DEFS[heldStack().id].tool&&DEFS[heldStack().id].tool.type===dd.toolClass?1:1);
    MINE.active=false;MINE.prog=0;P.exh+=0.03;
  }
}

/* right mouse: interact / eat / bow / place */
let rEdge=false;
function doUse(dt){
  if(modalOpen()){rEdge=false;P.bowT=0;P.eatT=0;return;}
  const st=heldStack();
  const d=DEFS[st?st.id:0]||{};
  if(!d.gun)P.aimT=Math.max(0,(P.aimT||0)-dt*6);
  /* guns sit outside the right-click gate so LMB can fire from the hip */
  if(st&&d.gun){
    if(!MB.l)gunLArm=true;
    P.aimT=clamp((P.aimT||0)+(MB.r?dt*5:-dt*6),0,1);
    P.bowT=P.aimT*(d.gun.scope?1:0.55);
    const lEdge=MB.l&&gunLArm;
    if((d.gun.auto?MB.l:lEdge)&&P.useT<=0){gunLArm=false;tryFire(st,d.gun,lEdge,P.aimT);}
    if(!MB.r)rEdge=true;else rEdge=false;
    return;
  }
  if(!MB.r){
    if(P.bowT>0.18&&st&&d.bow){
      const pow=clamp(P.bowT/1.1,0.15,1);
      fireBow(pow);
    }
    P.bowT=0;P.eatT=0;rEdge=true;return;
  }
  const e=eyePos(),l=lookDir();
  const hit=raycastB(e[0],e[1],e[2],l[0],l[1],l[2],REACH);
  /* talk to an alien */
  if(rEdge&&!P.ride){
    const am=pickMob(e[0],e[1],e[2],l[0],l[1],l[2],3.4);
    if(am&&PREG.mobUse[am.e.mt]&&(!hit||am.t<hit.t)){rEdge=false;PREG.mobUse[am.e.mt](am.e);return;}
    if(am&&am.e.mt==='alien'&&(!hit||am.t<hit.t)){
      rEdge=false;
      if(am.e.mood==='h'){showToast(am.e.name+' is too furious to talk!');return;}
      openDlg(am.e);return;
    }
  }
  /* drop The Big Dingle (air delivery only) */
  if(st&&st.id===IT.NUKE&&rEdge){
    rEdge=false;
    nukeDrop();
    return;
  }
  /* mount a car */
  if(rEdge&&!P.ride){
    const ch=pickCar(e[0],e[1],e[2],l[0],l[1],l[2],3.5);
    if(ch&&(!hit||ch.t<hit.t)){
      P.ride=ch.e;P.ride.spd=P.ride.spd||0;
      P.yaw=ch.e.yaw;P.pitch*=0.3; /* hop on facing forward */
      rEdge=false;playS('place');return;
    }
  }
  if(rEdge&&hit&&P.sneak&&PREG.sneakUse[hit.id]){rEdge=false;PREG.sneakUse[hit.id](hit);return;}
  /* interactable blocks (unless sneaking) */
  if(rEdge&&hit&&!P.sneak){
    const hd=DEFS[hit.id];
    if(hd.door){
      rEdge=false;
      toggleDoor(hit.x,hd.door.half?hit.y-1:hit.y,hit.z);
      return;
    }
    if(hd.interact){
      rEdge=false;
      if(PREG.interact[hd.interact])PREG.interact[hd.interact](hit,hd);
      else if(hd.interact==='craft')openModal('craft');
      else if(hd.interact==='furnace'){ensureBE(hit.x,hit.y,hit.z,'furnace');openModal('furnace',bkey(hit.x,hit.y,hit.z));}
      else if(hd.interact==='chest'){ensureBE(hit.x,hit.y,hit.z,'chest');openModal('chest',bkey(hit.x,hit.y,hit.z));}
      else if(hd.interact==='disp'){dispUse(hit.x,hit.y,hit.z);}
      else if(hd.interact==='cine')openCine();
      else if(hd.interact==='tnt'){setBlock(hit.x,hit.y,hit.z,B.AIR);primeTNT(hit.x,hit.y,hit.z,undefined,'Dan');playS('fuse');}
      else if(hd.interact==='terr'){ensureBE(hit.x,hit.y,hit.z,'terr');openTerr(bkey(hit.x,hit.y,hit.z));}
      else if(hd.interact==='pc')openPC();
      else if(hd.interact==='cas')openCas();
      else if(hd.interact==='ench')openEnch();
      else if(hd.interact==='bed')doSleep(hit.x,hit.y,hit.z);
      else if(hd.interact==='crea')crInteract(hit,hd);
      return;
    }
  }
  if(st&&rEdge&&d.crw&&crUseHeld(st,hit)){rEdge=false;return;}
  if(st&&d.mgUse&&rEdge&&d.mgUse(st,hit,dt)){rEdge=false;return;}
  /* village egg */
  if(st&&st.id===IT.VEGG&&rEdge){
    rEdge=false;
    if(P.useT>0)return;
    if(VB){showToast('A village is already landing!');return;}
    const tx=Math.floor(P.x+l[0]*16),tz=Math.floor(P.z+l[2]*16);
    if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
    P.useT=0.6;P.swing=1;
    startVillageBuild(tx,tz);
    return;
  }
  /* laser eyes: sneak + right-click, empty hand */
  if(!st&&P.sneak&&MB.r&&P.useT<=0&&powActive('laser')){
    fireLaser();
    P.useT=0.09;
    return;
  }
  /* feed or mount a dragon */
  if(rEdge&&!MB.l){
    const e0=eyePos(),d0=lookDir();
    const tg=pickMob(e0[0],e0[1],e0[2],d0[0],d0[1],d0[2],3.6);
    if(tg&&(tg.e.mt==='dragon')){
      const dr=tg.e;
      if(st&&st.id===IT.STEAK&&!dr.angry){
        rEdge=false;
        if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
        dr.fed=(dr.fed||0)+1;
        burstParticles(dr.x,dr.y+1.6,dr.z,B.WOOL,5,0.5);
        playS('eat');
        if(dr.fed>=5&&!dr.tame){
          dr.tame=true;dr.angry=false;
          showToast('The dragon bows to you! Right-click bare-handed to ride.');
          playS('jackpot');
        }else if(!dr.tame)showToast('The dragon eyes you... ('+dr.fed+'/5)');
        P.useT=0.3;
        return;
      }
      if(!st&&dr.tame&&!P.ride){
        rEdge=false;
        P.ride=dr;
        showToast('Hold W to fly where you look. Space climbs. Shift dismounts.');
        playS('ollie');
        P.useT=0.3;
        return;
      }
    }
  }
  if(st&&d.puse&&(rEdge||d.puseHold)&&d.puse(st,hit,dt,rEdge)){rEdge=false;return;}
  /* dungeon egg: there is no going back */
  if(st&&st.id===IT.DEGG&&rEdge){
    rEdge=false;
    if(P.useT>0)return;
    if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
    P.useT=0.8;P.swing=1;
    dungeonBuild(P.x,P.y,P.z);
    return;
  }
  /* disaster sphere: choose your catastrophe */
  if(st&&st.id===IT.DSPH&&rEdge){
    rEdge=false;
    if(P.useT>0)return;
    if(DIS.kind){showToast('A disaster is already raging!');return;}
    P.useT=0.4;
    openDSel();
    return;
  }
  /* critter jar */
  if(st&&d.ball){
    if(rEdge&&P.useT<=0)throwBall(st);
    rEdge=false;return;
  }
  /* subscribe button boomerang */
  if(st&&d.subbtn){
    if(rEdge&&P.useT<=0)throwSubBtn(st);
    rEdge=false;return;
  }
  /* fishing rods: one honest, one deeply dishonest */
  if(st&&(d.rod||d.rodr)){
    if(rEdge&&P.useT<=0){
      P.useT=0.45;P.swing=1;
      if(!FISHB||FISHB.dead){
        castBobber();
      }else{
        if(d.rodr){
          const dxr=FISHB.x-P.x,dyr=FISHB.y-P.y,dzr=FISHB.z-P.z;
          const ddr=Math.hypot(dxr,dyr,dzr)||1;
          P.vx=dxr/ddr*17;P.vy=Math.max(4,dyr/ddr*17+4);P.vz=dzr/ddr*17;
          P.fallD=0;
          showToast('The rod knows only one direction.');
          playS('whoosh');
          damageHeld(1);
        }else{
          if(FISHB.bite>0){
            const r4=Math.random();
            const prize=r4<0.68?{id:IT.FISH,count:1}
              :r4<0.86?{id:IT.FLESH,count:1}
              :r4<0.95?{id:IT.GOLD,count:2}
              :{id:IT.ROD_R,count:1,dur:64};
            spawnDrop(P.x,P.y+1.6,P.z,prize,0,2,0);
            showToast(prize.id===IT.ROD_R?'You fished up... a rod? It feels wrong.':'Caught something!');
            playS('pop');
          }else showToast(FISHB.inWater?'Nothing biting yet.':'That is dry land, angler.');
          damageHeld(1);
        }
        removeEnt(FISHB);FISHB=null;
      }
    }
    rEdge=false;return;
  }
  /* active gadgets in hand */
  if(st&&d.gadget==='m8'){
    if(rEdge&&P.useT<=0){
      P.useT=1;P.swing=1;
      M8LAST=M8A[(Math.random()*M8A.length)|0];
      showToast('\ud83c\udfb1 '+M8LAST);
      playS('pop');
    }
    rEdge=false;return;
  }
  if(st&&d.gadget==='blink'){
    if(rEdge&&BLINKCD<=0&&MGP_ON&&mgBlinkFail()){BLINKCD=1.5;}
    else if(rEdge&&BLINKCD<=0){
      const e3=eyePos(),l3=lookDir();
      for(let t3=9;t3>=2;t3-=0.5){
        const bx=Math.floor(e3[0]+l3[0]*t3),by=Math.floor(e3[1]+l3[1]*t3-0.9),bz=Math.floor(e3[2]+l3[2]*t3);
        if(!solidAt(bx,by,bz)&&!solidAt(bx,by+1,bz)){
          burstParticles(P.x,P.y+1,P.z,B.PORTAL_A,10,0.8);
          P.x=bx+0.5;P.y=by+0.2;P.z=bz+0.5;P.vx=P.vy=P.vz=0;P.fallD=0;
          burstParticles(P.x,P.y+1,P.z,B.PORTAL_A,10,0.8);
          BLINKCD=1.5;P.swing=1;playS('pop');
          break;
        }
      }
    }
    rEdge=false;return;
  }
  if(st&&d.gadget==='grap'){
    if(rEdge&&!GRAP&&P.useT<=0){
      const e3=eyePos(),l3=lookDir();
      const hg=raycastB(e3[0],e3[1],e3[2],l3[0],l3[1],l3[2],26);
      if(hg&&MGP_ON&&mgGrapNo(hg)){P.useT=0.5;P.swing=1;}
      else if(hg){GRAP={x:hg.x+0.5,y:hg.y+1,z:hg.z+0.5,t:1.7};P.useT=0.5;P.swing=1;playS('whoosh');}
      else showToast('Nothing to anchor to.');
    }
    rEdge=false;return;
  }
  if(st&&d.gadget==='pig'){
    if(rEdge&&P.useT<=0){
      P.useT=0.8;P.swing=1;playS('pop');
      const e3=eyePos(),l3=lookDir();
      spawnMob('pig',e3[0]+l3[0],e3[1]+l3[1]-0.3,e3[2]+l3[2]);
      const pg=entities[entities.length-1];
      pg.vx=l3[0]*16;pg.vy=l3[1]*16+3;pg.vz=l3[2]*16;
      showToast('Pig deployed.');
    }
    rEdge=false;return;
  }
  /* buckets: scoop and pour liquids */
  if(st&&(st.id===IT.BUCKET||st.id===IT.BUCKET_W||st.id===IT.BUCKET_L)){
    if(rEdge&&P.useT<=0){
      P.useT=0.3;
      const be2=eyePos(),bl2=lookDir();
      if(st.id===IT.BUCKET){
        let got=0,gx2=0,gy2=0,gz2=0;
        for(let t2=0.5;t2<=4.5&&!got;t2+=0.2){
          const bx=Math.floor(be2[0]+bl2[0]*t2),by=Math.floor(be2[1]+bl2[1]*t2),bz=Math.floor(be2[2]+bl2[2]*t2);
          const id2=getBlock(bx,by,bz);
          if(id2===B.WATER||id2===B.LAVA){got=id2;gx2=bx;gy2=by;gz2=bz;}
          else if(DEFS[id2].solid)break;
        }
        if(got){
          setBlock(gx2,gy2,gz2,B.AIR);
          P.inv[P.sel]={id:got===B.WATER?IT.BUCKET_W:IT.BUCKET_L,count:1};
          redrawHotbar();playS('pop');P.swing=1;
        }
      }else{
        const hit2=raycastB(be2[0],be2[1],be2[2],bl2[0],bl2[1],bl2[2],4.5);
        let tx2,ty2,tz2;
        if(hit2){tx2=hit2.x+hit2.nx;ty2=hit2.y+hit2.ny;tz2=hit2.z+hit2.nz;}
        else{tx2=Math.floor(be2[0]+bl2[0]*3);ty2=Math.floor(be2[1]+bl2[1]*3);tz2=Math.floor(be2[2]+bl2[2]*3);}
        if(st.id===IT.BUCKET_W&&tryIgnitePortal(tx2,ty2,tz2,B.GLOWSTONE,B.PORTAL_A)){
          P.inv[P.sel]={id:IT.BUCKET,count:1};
          redrawHotbar();playS('jackpot');P.swing=1;
          showToast('The glowstone drinks the water. A door opens above.');
        }else{
          const cur=getBlock(tx2,ty2,tz2);
          if(cur===B.AIR||DEFS[cur].replace||cur===B.WATER||cur===B.LAVA){
            const liq=st.id===IT.BUCKET_W?B.WATER:B.LAVA;
            setBlock(tx2,ty2,tz2,liq);
            if(liq===B.WATER)flowPush(tx2,ty2,tz2);
            lavaWaterCheck(tx2,ty2,tz2);
            P.inv[P.sel]={id:IT.BUCKET,count:1};
            redrawHotbar();playS('place');P.swing=1;
          }
        }
      }
    }
    rEdge=false;return;
  }
  /* a torch against obsidian lights a nether portal */
  if(rEdge&&st&&st.id===B.TORCH&&hit&&getBlock(hit.x,hit.y,hit.z)===B.OBSIDIAN){
    if(tryIgnitePortal(hit.x,hit.y,hit.z,B.OBSIDIAN,B.PORTAL_N)){
      st.count--;if(st.count<=0)P.inv[P.sel]=null;
      redrawHotbar();playS('jackpot');P.swing=1;
      showToast('The obsidian catches. Something hot answers.');
      rEdge=false;return;
    }
  }
  /* grenade */
  if(st&&d.grenade){
    if(rEdge&&P.useT<=0)throwGrenade(st);
    rEdge=false;return;
  }
  /* food */
  if(st&&d.food&&P.hunger<20&&P.mode==='s'){
    P.eatT+=dt;P.swing=Math.max(P.swing,0.4);
    if(frameCount%8===0)playS('eat');
    if(P.eatT>=1.6){
      P.eatT=0;
      P.hunger=Math.min(20,P.hunger+d.food);
      if(st.id===IT.APPLE){P.bigT=25;showToast('You feel... larger. (25s)');}
      if(d.raw)piRawSpray(d);
      st.count--;if(st.count<=0)P.inv[P.sel]=null;
      redrawHotbar();drawStats();playS('burp');
    }
    rEdge=false;return;
  }
  /* bow charge */
  if(st&&d.bow){
    if(P.mode==='c'||invCount(P.inv,IT.ARROW)>0)P.bowT=Math.min(1.1,P.bowT+dt);
    rEdge=false;return;
  }
  /* place a ramp (faces away from you) */
  if(st&&DEFS[st.id]&&DEFS[st.id].ramp&&rEdge&&hit){
    rEdge=false;
    let tx=hit.x+hit.nx,ty=hit.y+hit.ny,tz=hit.z+hit.nz;
    if(DEFS[hit.id].replace){tx=hit.x;ty=hit.y;tz=hit.z;}
    const cur=getBlock(tx,ty,tz);
    if(ty>0&&ty<WH&&(cur===B.AIR||DEFS[cur].replace)){
      const l2=lookDir();
      let di;
      if(Math.abs(l2[0])>Math.abs(l2[2]))di=l2[0]>0?0:1;
      else di=l2[2]>0?2:3;
      setBlock(tx,ty,tz,B.RAMP+di);
      if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
      playS('place');P.useT=0.25;P.swing=1;
    }
    return;
  }
  /* place a door */
  if(st&&st.id===IT.DOOR&&rEdge&&hit){
    rEdge=false;
    let tx=hit.x+hit.nx,ty=hit.y+hit.ny,tz=hit.z+hit.nz;
    if(DEFS[hit.id].replace){tx=hit.x;ty=hit.y;tz=hit.z;}
    const c0=getBlock(tx,ty,tz),c1=getBlock(tx,ty+1,tz);
    const free=v=>v===B.AIR||DEFS[v].replace;
    const pover=P.x+P.hw>tx&&P.x-P.hw<tx+1&&P.y+P.h>ty&&P.y<ty+2&&P.z+P.hw>tz&&P.z-P.hw<tz+1;
    if(ty>0&&ty+1<WH&&solidAt(tx,ty-1,tz)&&free(c0)&&free(c1)&&!pover){
      const l2=lookDir();
      let di;
      if(Math.abs(l2[0])>Math.abs(l2[2]))di=l2[0]>0?1:0;
      else di=l2[2]>0?3:2;
      setBlock(tx,ty,tz,doorId(0,0,di));
      setBlock(tx,ty+1,tz,doorId(0,1,di));
      if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
      playS('place');P.useT=0.3;P.swing=1;
    }else showToast('Doors need solid ground and two clear blocks');
    return;
  }
  /* point the player compass at the next player */
  if(st&&st.id===IT.PCOMPASS&&rEdge){
    rEdge=false;
    pcmpCycle(P.sneak?-1:1);
    P.useT=0.25;
    return;
  }
  /* tune the structure compass */
  if(st&&st.id===IT.COMPASS&&rEdge){
    rEdge=false;
    openCmp();
    P.useT=0.3;
    return;
  }
  /* don armor */
  if(st&&d.armor&&rEdge){
    rEdge=false;
    equipArmor();
    return;
  }
  /* place a vehicle */
  if(st&&(d.car||d.skate||d.cart||d.boat||d.egg||d.plane)&&rEdge&&hit){
    rEdge=false;
    const sk=!!d.skate;
    const cx=hit.x+hit.nx+0.5,cy=hit.y+hit.ny,cz=hit.z+hit.nz+0.5;
    if(d.egg==='demon'){mgEggUse(st,hit,cx,cy,cz);P.useT=0.25;P.swing=1;return;}
    if(d.egg){
      spawnMob(d.egg,cx,cy+0.15,cz);
      if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
      playS('pop');P.useT=0.25;P.swing=1;
      return;
    }
    if(d.plane){
      if(!boxCollides(cx,cy+0.15,cz,0.95,1.1)){
        spawnPlane(cx,cy+0.15,cz,P.yaw);
        if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
        playS('place');P.useT=0.4;P.swing=1;
      }else showToast('Not enough room');
      return;
    }
    if(d.boat){
      spawnBoat(cx,cy+0.1,cz,P.yaw);
      if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
      playS('place');P.useT=0.3;P.swing=1;
      return;
    }
    if(d.cart){
      spawnCart(cx,cy+0.1,cz,P.yaw);
      if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
      playS('place');P.useT=0.3;P.swing=1;
      return;
    }
    if(!boxCollides(cx,cy+0.05,cz,sk?0.36:0.85,sk?0.3:1.0)){
      if(sk)spawnSkate(cx,cy+0.05,cz,P.yaw);
      else spawnCar(cx,cy+0.05,cz,P.yaw);
      if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
      playS('place');P.useT=0.4;
    }else showToast('Not enough room');
    return;
  }
  /* place block */
  if(st&&!DEFS[st.id].item&&st.id!==B.AIR&&hit&&(rEdge||P.useT<=0)){
    let tx=hit.x+hit.nx,ty=hit.y+hit.ny,tz=hit.z+hit.nz;
    if(DEFS[hit.id].replace){tx=hit.x;ty=hit.y;tz=hit.z;}
    const cur=getBlock(tx,ty,tz);
    const cd=DEFS[cur];
    if(cur===B.AIR||cur===B.WATER||cd.replace){
      const def=DEFS[st.id];
      let blocked=false;
      if(def.solid!==false){
        if(aabbOverlap(tx,ty,tz,P.x-P.hw,P.y,P.z-P.hw,P.x+P.hw,P.y+P.h,P.z+P.hw))blocked=true;
        if(!blocked)for(const en of entities){
          if(en.mob&&!en.dead&&aabbOverlap(tx,ty,tz,en.x-en.hw,en.y,en.z-en.hw,en.x+en.hw,en.y+en.h,en.z+en.hw)){blocked=true;break;}
        }
      }
      let pid=st.id;
      if(st.id===B.TORCH){
        if(DEFS[hit.id].replace||hit.ny===1){
          if(!solidAt(tx,ty-1,tz))blocked=true;
        }else if(hit.ny===0&&DEFS[hit.id].solid!==false){
          pid=wallTorchId(hit.nx,hit.nz);
        }else if(solidAt(tx,ty-1,tz)){
          /* clicked ceiling/odd face but target cell has floor: stand it */
        }else blocked=true;
      }
      if(!blocked&&DIM==='puppet'&&!mpPlaceOK(tx,ty,tz,pid))blocked=true;
      if(!blocked&&MGP_ON&&!mgPlaceOK(tx,ty,tz,pid))blocked=true;
      if(!blocked&&ty>=0&&ty<WH){
        setBlock(tx,ty,tz,pid);
        lawnCheck(tx,ty,tz);
        if(DEFS[pid].cr)crOnPlace(tx,ty,tz,pid);
        if(DIM==='puppet')mpOnPlace(tx,ty,tz,pid,'Dan');
        if(pid===B.CINEMA)stampCinema(tx,ty,tz);
        playS('place');P.swing=1;P.useT=0.22;
        if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
      }
    }
    rEdge=false;return;
  }
  rEdge=false;
}
function aabbOverlap(bx,by,bz,x0,y0,z0,x1,y1,z1){
  return bx+1>x0&&bx<x1&&by+1>y0&&by<y1&&bz+1>z0&&bz<z1;
}
function fireBow(pow){
  if(P.mode!=='c'){
    if(!invConsume(P.inv,IT.ARROW,1))return;
    redrawHotbar();
  }
  const e=eyePos(),d=lookDir();
  const bst=heldStack();
  const pw=bst&&bst.ench&&bst.ench.power?bst.ench.power:0;
  spawnArrow(e[0]+d[0]*0.4,e[1]+d[1]*0.4-0.1,e[2]+d[2]*0.4,
             d[0]*(8+pow*20),d[1]*(8+pow*20)+0.5,d[2]*(8+pow*20),'p',2+Math.round(pow*5)+Math.round(pw*1.5));
  damageHeld(1);
  playS('bow');P.swing=1;
}

