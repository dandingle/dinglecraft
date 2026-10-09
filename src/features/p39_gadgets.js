/* PART 39 - GADGETS (dungeon loot from the new dimensions) */
/* Passives work from anywhere in your inventory; actives (blink/grapple/pig
   cannon) fire on right-click while held. Models: Poly by Google and Roman Miller (the
   jetpack), CC-BY 3.0; the cannon is Quaternius, CC0. Full credits in THIRD_PARTY.md. */
const GADGET_IDS=[265,266,267,268,269,270,271,272,273,274];
IT.G_DJ=265;IT.G_JET=266;IT.G_GRAP=267;IT.G_GLIDE=268;IT.G_MAG=269;
IT.G_CLAW=270;IT.G_TRAMP=271;IT.G_BLINK=272;IT.G_GRAV=273;IT.G_PIG=274;
idef(265,{name:'Double-Jump Boots',icon:'gd_dj',stack:1,gadget:'dj'});
idef(266,{name:'Jetpack',icon:'gd_jet',stack:1,gadget:'jet'});
idef(267,{name:'Grappling Anchor',icon:'gd_grap',stack:1,gadget:'grap'});
idef(268,{name:'Hang Glider',icon:'gd_glide',stack:1,gadget:'glide'});
idef(269,{name:'Loot Magnet',icon:'gd_mag',stack:1,gadget:'mag'});
idef(270,{name:'Climbing Claws',icon:'gd_claw',stack:1,gadget:'claw'});
idef(271,{name:'Pocket Trampoline',icon:'gd_tramp',stack:1,gadget:'tramp'});
idef(272,{name:'Blink Pearl',icon:'gd_blink',stack:1,gadget:'blink'});
idef(273,{name:'Anti-Gravity Belt',icon:'gd_grav',stack:1,gadget:'grav'});
idef(274,{name:'Pig Cannon',icon:'gd_pig',stack:1,gadget:'pig'});
tile('gd_dj',c=>{c.clearRect(0,0,16,16);c.fillStyle='#8f5a2a';c.fillRect(2,7,5,6);c.fillRect(9,7,5,6);c.fillStyle='#c8c8d4';c.fillRect(2,12,6,2);c.fillRect(9,12,6,2);c.fillStyle='#7fc8ff';c.fillRect(3,5,3,2);c.fillRect(10,5,3,2);});
tile('gd_jet',c=>{c.clearRect(0,0,16,16);c.fillStyle='#8a8f96';c.fillRect(3,2,4,10);c.fillRect(9,2,4,10);c.fillStyle='#5a5f66';c.fillRect(3,2,4,2);c.fillRect(9,2,4,2);c.fillStyle='#ffab3d';c.fillRect(4,12,2,3);c.fillRect(10,12,2,3);});
tile('gd_grap',c=>{c.clearRect(0,0,16,16);c.fillStyle='#5a6470';c.fillRect(7,2,2,9);c.fillRect(4,10,8,2);c.fillRect(3,8,2,3);c.fillRect(11,8,2,3);c.fillRect(6,2,4,2);});
tile('gd_glide',c=>{c.clearRect(0,0,16,16);c.fillStyle='#e85d3a';c.fillRect(1,4,14,2);c.fillStyle='#c8442a';c.fillRect(2,6,12,1);c.fillStyle='#5a4a3a';c.fillRect(7,6,2,7);});
tile('gd_mag',c=>{c.clearRect(0,0,16,16);c.fillStyle='#e83a3a';c.fillRect(3,3,4,9);c.fillRect(9,3,4,9);c.fillRect(3,3,10,4);c.fillStyle='#eee';c.fillRect(3,10,4,2);c.fillRect(9,10,4,2);});
tile('gd_claw',c=>{c.clearRect(0,0,16,16);c.fillStyle='#d8dce4';for(let i=0;i<3;i++)c.fillRect(4+i*3,3,2,8);c.fillStyle='#6a4a26';c.fillRect(3,11,10,3);});
tile('gd_tramp',c=>{c.clearRect(0,0,16,16);c.fillStyle='#3d6de8';c.fillRect(2,6,12,2);c.fillStyle='#26262e';c.fillRect(3,8,2,6);c.fillRect(11,8,2,6);c.fillRect(7,8,2,4);});
tile('gd_blink',c=>{c.clearRect(0,0,16,16);c.fillStyle='#7fc8ff';c.fillRect(5,4,6,8);c.fillRect(4,5,8,6);c.fillStyle='#e0f4ff';c.fillRect(6,5,2,2);});
tile('gd_grav',c=>{c.clearRect(0,0,16,16);c.fillStyle='#3a2a12';c.fillRect(2,7,12,3);c.fillStyle='#ffe34d';c.fillRect(6,6,4,5);c.fillStyle='#8f6a1a';c.fillRect(7,7,2,3);});
tile('gd_pig',c=>{c.clearRect(0,0,16,16);c.fillStyle='#6a4a26';c.fillRect(2,9,12,4);c.fillStyle='#5a6470';c.fillRect(4,4,8,6);c.fillStyle='#f2a0b4';c.fillRect(10,5,3,3);});
var GDG={};
let JETF=3,GRAP=null,BLINKCD=0;
function tickGadgets(dt){
  if(!P)return;
  GDG={};
  for(const s of P.inv)if(s&&DEFS[s.id]&&DEFS[s.id].gadget)GDG[DEFS[s.id].gadget]=1;
  BLINKCD=Math.max(0,BLINKCD-dt);
  if(P.onGround){P._dj=false;JETF=Math.min(3,JETF+dt*1.2);}
  if(GDG.jet&&KEY.Space&&!P.onGround&&!terrOpen&&!cineOpen&&!P.flying&&!P.inWater&&JETF>0){
    P.vy=lerp(P.vy,6.8,1-Math.exp(-dt*7));
    JETF-=dt;
    if(frameCount%4===0)burstParticles(P.x,P.y+0.3,P.z,B.TORCH,2,0.4);
  }
  if(GDG.glide&&!P.onGround&&P.vy<-1&&KEY.ShiftLeft&&!terrOpen&&!cineOpen){
    P.vy=Math.max(P.vy,-2.0);
    const f2=lookDir();
    P.vx=lerp(P.vx,f2[0]*7,0.06);P.vz=lerp(P.vz,f2[2]*7,0.06);
    P.fallD=0;
  }
  if(GDG.claw&&!P.onGround&&KEY.KeyW&&!terrOpen&&!cineOpen){
    const fx4=-Math.sin(P.yaw),fz4=-Math.cos(P.yaw);
    const cx3=Math.floor(P.x+fx4*0.7),cz3=Math.floor(P.z+fz4*0.7);
    const feetS=solidAt(cx3,Math.floor(P.y+0.15),cz3);
    const chestS=solidAt(cx3,Math.floor(P.y+1.1),cz3);
    if(feetS||chestS){
      if(feetS&&!chestS&&!solidAt(cx3,Math.floor(P.y+2.1),cz3)){
        /* mantle: chest is clear of the lip - pop up and over instead of bobbing */
        P.vy=Math.max(P.vy,6.4);
      }else{
        P.vy=Math.max(P.vy,2.9);
      }
      P.fallD=0;
    }
  }
  if(GRAP&&MGP_ON&&mgGrapCut())GRAP=null;
  if(GRAP){
    GRAP.t-=dt;
    const dx=GRAP.x-P.x,dy=GRAP.y-P.y-0.9,dz=GRAP.z-P.z;
    const dd=Math.hypot(dx,dy,dz);
    if(dd<2||GRAP.t<=0)GRAP=null;
    else{P.vx=dx/dd*17;P.vy=dy/dd*17;P.vz=dz/dd*17;P.fallD=0;}
  }
}
function mkGadgetProc(gk){
  const g=new THREE.Group();
  const bm=(w,h,d2,c2,x,y,z)=>{const m=boxMesh(w,h,d2,c2);m.position.set(x,y,z);g.add(m);return m;};
  if(gk==='blink'){
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8),new THREE.MeshLambertMaterial({color:0x7fc8ff}));
    m.position.y=0.3;g.add(m);
  }else if(gk==='claw'){
    for(let i=0;i<3;i++)bm(0.09,0.55,0.09,0xd8dce4,(i-1)*0.17,0.4,0);
    bm(0.55,0.2,0.14,0x6a4a26,0,0.08,0);
  }else if(gk==='grav'){
    bm(0.7,0.16,0.44,0x3a2a12,0,0.2,0);
    bm(0.2,0.2,0.05,0xffe34d,0,0.2,0.24);
  }else if(gk==='m8'){
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.32,12,10),new THREE.MeshLambertMaterial({color:0x7a3ab8,emissive:0x2a0a4a}));
    m.position.y=0.4;g.add(m);
    const w2=boxMesh(0.34,0.1,0.34,0xc9a43a);w2.position.set(0,0.05,0);g.add(w2);
  }else if(gk.slice(0,3)==='pg_')piGadgetMesh(gk,g,bm);
  else bm(0.4,0.4,0.4,0x8f8f96,0,0.2,0);
  g.isT3D=true;
  return g;
}

