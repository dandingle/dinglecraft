/* PART 33 — the SUBSCRIBE button (throwable boomerang) */
/* Red, loud, aerodynamically dubious. RMB hurls it; it smacks every mob on the way
   out AND on the way home, then lands back in your inventory minus one durability.
   Enchants: Viral (extra damage), Recoil (faster return + longer throw), Unbreaking. */
IT.SUBBTN=227;
idef(IT.SUBBTN,{name:'Subscribe Button',icon:'i_subbtn',stack:1,dur:64,subbtn:true});
/* not craftable — DINGLE STORE exclusive, obviously */
tile('i_subbtn',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#7a0000';c.fillRect(1,5,14,7);
  c.fillStyle='#cc0000';c.fillRect(1,4,14,7);
  c.fillStyle='#ff2a2a';c.fillRect(1,4,14,2);
  c.fillStyle='#fff';
  for(let x=3;x<13;x+=2)c.fillRect(x,7,1,1);
  c.fillRect(3,9,3,1);c.fillRect(7,9,2,1);c.fillRect(10,9,3,1);});
let SUBFACE=null;
function mkSubBtnMesh(){
  if(!SUBFACE){
    SUBFACE=document.createElement('canvas');
    SUBFACE.width=64;SUBFACE.height=32;
    const c=SUBFACE.getContext('2d');
    c.fillStyle='#cc0000';c.fillRect(0,0,64,32);
    c.fillStyle='#ff2a2a';c.fillRect(0,0,64,5);
    c.fillStyle='#8f0000';c.fillRect(0,27,64,5);
    c.fillStyle='#ffffff';c.font='bold 10px sans-serif';
    c.textAlign='center';c.textBaseline='middle';
    c.fillText('SUBSCRIBE',32,16);
  }
  const g=new THREE.Group();
  const m=boxMesh(0.56,0.3,0.09,0xcc0000,SUBFACE);
  g.add(m);
  return g;
}
function throwSubBtn(st){
  const lv=(st.ench&&st.ench.srec)||0;
  P.useT=0.5;P.swing=1;playS('whoosh');
  const g=mkSubBtnMesh();
  shadowify(g);
  scene.add(g);
  const e=eyePos(),l=lookDir();
  const spd=15+lv*3;
  entities.push({t:'subb',x:e[0]+l[0]*0.6,y:e[1]+l[1]*0.6-0.08,z:e[2]+l[2]*0.6,
    vx:l[0]*spd,vy:l[1]*spd,vz:l[2]*spd,hw:0.26,h:0.3,onGround:false,
    st:{id:IT.SUBBTN,count:1,dur:(st.dur===undefined?DEFS[IT.SUBBTN].dur:st.dur),
      ...(st.ench?{ench:{...st.ench}}:{})},
    out:1,age:0,spd,mesh:g});
  P.inv[P.sel]=null;redrawHotbar();
}
function updateSubBtn(e,dt){
  e.age+=dt;
  e.mesh.rotation.y+=dt*15;
  const enc=e.st.ench||{};
  const dmg=6+(enc.viral||0);
  if(e.out){
    if(e.age>0.42+((enc.srec||0)*0.05))e.out=0;
    const nx=e.x+e.vx*dt,ny=e.y+e.vy*dt,nz=e.z+e.vz*dt;
    if(solidAt(Math.floor(nx),Math.floor(ny),Math.floor(nz))){e.out=0;playS('thud');}
    else{e.x=nx;e.y=ny;e.z=nz;}
  }else{
    const dx=P.x-e.x,dy=(P.y+1.1)-e.y,dz=P.z-e.z;
    const ds=Math.hypot(dx,dy,dz)||0.001;
    const rs=e.spd*(1+(enc.srec||0)*0.25);
    e.vx=dx/ds*rs;e.vy=dy/ds*rs;e.vz=dz/ds*rs;
    e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;
    if(ds<1.15){
      removeEnt(e);
      let dur=e.st.dur;
      const unb=enc.unb||0;
      if(!(unb&&Math.random()<unb/(unb+1)))dur--;
      if(dur<=0){playS('break2');showToast('Your Subscribe Button wore out. Smash that craft button!');}
      else{
        const back={id:IT.SUBBTN,count:1,dur,...(e.st.ench?{ench:{...e.st.ench}}:{})};
        if(invAddTo(P.inv,back)>0)spawnDrop(P.x,P.y+0.5,P.z,back,0,1,0);
        redrawHotbar();
      }
      if(e.loot)for(const s of e.loot){if(invAddTo(P.inv,s)>0)spawnDrop(P.x,P.y+0.5,P.z,s,0,1,0);}
      if(e.loot)redrawHotbar();
      playS('pop');
      return;
    }
    if(e.age>6){removeEnt(e);spawnDrop(e.x,e.y,e.z,e.st,0,1,0);
      if(e.loot)for(const s of e.loot)spawnDrop(e.x,e.y,e.z,s,0,1,0);return;}
  }
  for(const m of entities){
    if(m.dead)continue;
    if(m.t==='drop'&&m.age>0.4){
      if(Math.hypot(m.x-e.x,(m.y-e.y)*0.6,m.z-e.z)<1.1){
        (e.loot=e.loot||[]).push(m.st);removeEnt(m);playS('pop');
      }
      continue;
    }
    if(m.t!=='mob'||m.hurtT>0)continue;
    if(Math.hypot(m.x-e.x,((m.y+m.h*0.5)-e.y)*0.6,m.z-e.z)<1.2){
      hurtMob(m,dmg,e.vx,e.vz);playS('hit');
    }
  }
  e.mesh.position.set(e.x,e.y,e.z);
}
/* new meshes cast/receive shadows while fancy mode is on */
function shadowify(o){
  if(TP.hr&&HRL.on){if(o&&o.traverse)hrShadowify(o);return;}
  if(!SHD.on||!o||!o.traverse)return;
  o.traverse(q=>{if(q.isMesh&&!q.isSprite){q.castShadow=true;q.receiveShadow=true;}});
}
function applyShadows(on){
  if(TP.hr&&HRL.on){hrApplyShadows();return;}
  if(typeof renderer==='undefined'||!renderer||!renderer.shadowMap)return;
  renderer.shadowMap.enabled=on;
  renderer.shadowMap.type=(THREE.PCFSoftShadowMap!==undefined?THREE.PCFSoftShadowMap:2);
  if(sunL){
    sunL.castShadow=on;
    if(on&&sunL.shadow){
      sunL.shadow.mapSize.width=2048;sunL.shadow.mapSize.height=2048;
      const sc=sunL.shadow.camera;
      if(sc){sc.left=-80;sc.right=80;sc.top=80;sc.bottom=-80;sc.near=5;sc.far=420;
        sc.updateProjectionMatrix&&sc.updateProjectionMatrix();}
      sunL.shadow.bias=-0.0006;
    }
    if(sunL.target&&scene)scene.add(sunL.target);
  }
  if(scene)scene.traverse(o=>{
    if(o.isSprite)return;
    if(o.isMesh){
      o.castShadow=on;o.receiveShadow=on;
      const ms=Array.isArray(o.material)?o.material:[o.material];
      for(const mm of ms)if(mm)mm.needsUpdate=true;
    }
  });
}

