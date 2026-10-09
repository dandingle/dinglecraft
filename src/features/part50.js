/* PART 50 - THE OTHERS (v6.8: the Watcher and the Reaper were removed; the lights-out, the twin and the whispers stay) */
const HRR={quietT:0,muteT:0,twinT:0,twin:null};
function tickHorror(dt){
  if(!playing||paused||!P||P.dead)return;
  /* undocumented event one */
  if(HRR.muteT>0){
    HRR.muteT-=dt;
    for(const L of TLIGHTS)L.intensity=0;
    if(HRR.muteT<=0)playS('knock');
  }else if(DIM==='over'&&!sunUp()&&Math.random()<dt*0.0006){
    HRR.muteT=8;
  }
  /* undocumented event two */
  if(HRR.twin){
    HRR.twinT-=dt;
    const td=Math.hypot(HRR.twin.position.x-P.x,HRR.twin.position.z-P.z);
    if(HRR.twinT<=0||td<6){
      scene.remove(HRR.twin);
      HRR.twin=null;
    }else HRR.twin.rotation.y=Math.atan2(P.x-HRR.twin.position.x,P.z-HRR.twin.position.z);
  }else if(ugT>0.85&&Math.random()<dt*0.0011){
    /* your twin wears what you wear (the p11 third-person colours) */
    const g=new THREE.Group();
    const mat=c2=>new THREE.MeshLambertMaterial({color:c2});
    const hd2=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),mat(0xe8b88f));hd2.position.y=1.62;g.add(hd2);
    const bd2=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.72,0.27),mat(0xd9822b));bd2.position.y=1.0;g.add(bd2);
    const lg2=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.66,0.21),mat(0x34343a));lg2.position.y=0.33;g.add(lg2);
    const a=Math.random()*6.28;
    g.position.set(P.x+Math.sin(a)*14,P.y,P.z+Math.cos(a)*14);
    scene.add(g);
    HRR.twin=g;HRR.twinT=3.5;
  }
  /* undocumented event three (v6.8: 10x rarer) */
  if(Math.random()<dt*0.000025){
    const L3=['don’t turn around.','it is behind the '+DEFS[[B.STONE,B.CRAFT,B.CHEST,B.FURNACE][(Math.random()*4)|0]].name.toLowerCase()+'.','you placed that torch. didn’t you?','the snail is not the worst one.'];
    showToast(L3[(Math.random()*L3.length)|0]);
  }
}

/* ----- node test export / browser boot ----- */
