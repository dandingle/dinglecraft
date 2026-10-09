/* PART 34 — armor on the player model */
function armorAccepts(slot,st){
  if(!st)return true;
  const d=DEFS[st.id];
  return !!(d&&d.armor&&d.armor.s===slot);
}
function syncArmorModel(M){
  const sig=(P.armor||[]).map(a=>a?a.id:0).join(',');
  if(M._armSig===sig)return;
  M._armSig=sig;
  if(!M._arm){
    const mk=(w,h,d)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
      new THREE.MeshLambertMaterial({color:0xffffff}));
    const helm=mk(0.56,0.56,0.56);helm.position.y=M.helmA?0:1.62;
    const chest=mk(0.56,0.78,0.33);chest.position.y=M.chestA?0:1.0;
    const legL=mk(0.25,0.5,0.25);legL.position.y=-0.28;
    const legR=mk(0.25,0.5,0.25);legR.position.y=-0.28;
    const bootL=mk(0.27,0.2,0.27);bootL.position.y=-0.58;
    const bootR=mk(0.27,0.2,0.27);bootR.position.y=-0.58;
    (M.helmA||M.G).add(helm);(M.chestA||M.G).add(chest);
    M.lL.add(legL);M.lR.add(legR);M.lL.add(bootL);M.lR.add(bootR);
    M._arm=[[helm],[chest],[legL,legR],[bootL,bootR]];
    for(const grp of M._arm)for(const q of grp)shadowify(q);
  }
  for(let s=0;s<4;s++){
    const a=P.armor[s];
    for(const q of M._arm[s]){
      q.visible=!!a;
      if(a&&q.material&&q.material.color&&q.material.color.set)
        q.material.color.set(ARM_M[DEFS[a.id].armor.m].col);
    }
  }
}

