/* ----- held item in view ----- */
let handG=null,handKind=null;
function refreshHand(){
  if(!camera)return;
  if(!handG){handG=new THREE.Group();camera.add(handG);}
  const st=P?heldStack():null;
  const key=st?st.id:-1;
  if(key===handKind)return;
  handKind=key;
  while(handG.children.length)handG.remove(handG.children[0]);
  if(!st){if(HRE.on&&P)hrFistAttach();return;}
  const dd=DEFS[st.id];
  if(!dd.item&&dd._t){
    const m=(dd.cross||dd.wt)?new THREE.Mesh(mkCrossGeo(st.id,0.6),matCut)
                             :new THREE.Mesh(mkCubeGeo(st.id,0.34),matOp);
    m.rotation.y=Math.PI*0.18;
    handG.add(m);
  }else if(gunIdParts(st.id)||st.id===IT.BOW||st.id===IT.SKATE||st.id===IT.SUBBTN||(DEFS[st.id]&&DEFS[st.id].gadget)){
    const gp=gunIdParts(st.id);
    const VMW={pistol:[0.58,0.12,-0.13,0.0],shotgun:[1.05,0.05,-0.12,-0.02],
      smg:[0.95,0.05,-0.12,-0.02],sniper:[1.45,0.06,-0.06,-0.03],bow:[0.7,0.02,-0.2,-0.06],
      skate:[0.62,0.06,-0.27,-0.06],subbtn:[0.5,0.1,-0.19,-0.03]};
    const kk=gp?WPN_KEY[gp.t]:(st.id===IT.BOW?'bow':(st.id===IT.SKATE?'skate':(st.id===IT.SUBBTN?'subbtn':'gdgt')));
    const cfg=VMW[kk]||[0.55,0.07,-0.2,-0.04];
    let m;
    if(kk==='subbtn'){m=mkSubBtnMesh();m.isT3D=true;m.scale.set(cfg[0],cfg[0],cfg[0]);}
    else m=mkWpn3D(st.id,cfg[0]);
    m.position.set(cfg[1],cfg[2],cfg[3]);
    m.rotation.set(0.02,-0.06,0.01);
    handG.add(m);
  }else if(toolIdParts(st.id)){
    const m=mkTool3D(st.id,0.62);
    m.position.set(0.04,-0.28,0);
    m.rotation.set(-0.5,-0.7,0.12);
    handG.add(m);
  }else{
    const sp=new THREE.Sprite(iconTex(st.id));
    sp.scale.set(0.4,0.4,0.4);
    handG.add(sp);
  }
}
let bobT=0;
function updateHand(dt){
  if(!handG)return;
  if(HRE.on&&hrFistTick(dt))return;
  const hv=Math.hypot(P.vx,P.vz);
  bobT+=dt*(2+hv*1.6);
  const sw=P.swing;
  const dip=Math.sin(Math.min(1,1-sw)*Math.PI)* (sw>0?0.28:0);
  handG.position.set(0.36+dip*0.1,-0.34+Math.sin(bobT)*0.012*Math.min(1,hv)-dip*0.18,-0.62-(P.bowT>0?P.bowT*0.1:0));
  handG.rotation.set(-dip*1.1,dip*0.5,0);
}
/* ----- camera ----- */
let curFov=75;
let FOVB=75;   /* Release 1.0: the Field of View slider (Settings); 75 is the classic default */
function updateCamera(){
  if(CUT.on){cutCam();return;}
  camera.position.set(P.x,P.y+P.eyeY,P.z);
  camera.rotation.y=P.yaw;
  camera.rotation.x=P.pitch;
  applyCamMode();
  const hs=heldStack(),hg=hs&&DEFS[hs.id].gun;
  const tf=(hg&&hg.scope&&P.bowT>0.05)?26:(P.bowT>0.2?Math.min(62,FOVB-13):(P.sprint?FOVB+7:FOVB));
  if(Math.abs(tf-curFov)>0.1){
    curFov=lerp(curFov,tf,0.18);
    camera.fov=curFov;camera.updateProjectionMatrix();
  }
}

