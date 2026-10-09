/* ===================================================================== */
/* PART 11 — third person, lava, disaster spheres  (v1.4)                */
/* ===================================================================== */
/* ----- lava ----- */
B.LAVA=59;
def(B.LAVA,{name:'Lava',tiles:'lava',solid:false,opq:false,bucket:'wat',cullSame:true,hard:-1,hide:true});
tile('lava',c=>{c.fillStyle='#e2641e';c.fillRect(0,0,16,16);
  c.fillStyle='#ffae37';
  c.fillRect(1,2,5,3);c.fillRect(9,1,5,2);c.fillRect(3,8,4,4);c.fillRect(10,9,5,3);c.fillRect(6,13,6,2);
  c.fillStyle='#ffd76e';c.fillRect(2,3,2,1);c.fillRect(11,10,2,1);c.fillRect(4,9,1,2);
  c.fillStyle='#9c3b10';c.fillRect(0,6,7,1);c.fillRect(8,5,8,1);c.fillRect(7,0,1,6);c.fillRect(8,11,1,5);c.fillRect(0,12,4,1);});

/* ----- third person camera + player model ----- */
let camMode=0,plModel=null,plAnim=0;
function mkPlayerModel(){
  if(HRE.on&&P){const M=hrPlayerModel();if(M)return M;}
  const G=new THREE.Group();
  const mat=c=>new THREE.MeshLambertMaterial({color:c});
  const skin=mat(0xe8b88f),shirt=mat(0xd9822b),pants=mat(0x34343a),shoe=mat(0x2b2b30);   /* Dan: orange hoodie, charcoal trousers */
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),skin);head.position.y=1.62;G.add(head);
  const eyeM=mat(0x2b2430);
  for(const sx of[-1,1]){
    const e=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.08,0.02),eyeM);
    e.position.set(sx*0.11,1.66,-0.26);G.add(e);head.attach?head.attach(e):0;
  }
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.72,0.27),shirt);body.position.y=1.0;G.add(body);
  const mkLimb=(m,w,h)=>{
    const piv=new THREE.Group();
    const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),m);
    me.position.y=-h/2;piv.add(me);G.add(piv);return piv;
  };
  const aL=mkLimb(shirt,0.18,0.66),aR=mkLimb(shirt,0.18,0.66);
  aL.position.set(-0.34,1.32,0);aR.position.set(0.34,1.32,0);
  const lL=mkLimb(pants,0.21,0.66),lR=mkLimb(pants,0.21,0.66);
  lL.position.set(-0.13,0.66,0);lR.position.set(0.13,0.66,0);
  for(const sx of[-1,1]){
    const s=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.1,0.26),shoe);
    s.position.set(sx*0.13,0.05,-0.02);G.add(s);
  }
  scene.add(G);
  return {G,head,aL,aR,lL,lR,shoes:null};
}
function updatePlayerMesh(dt){
  if(!playing||!P){if(plModel)plModel.G.visible=false;return;}
  if(!plModel)plModel=mkPlayerModel();
  const M=plModel;
  M.G.visible=camMode>0&&!P.dead;
  if(!M.G.visible)return;
  M.G.position.set(P.x,P.y,P.z);
  const bs2=(P.bigT||0)>0?1.45:1;M.G.scale.set(bs2,bs2,bs2);
  M.G.rotation.y=P.yaw;
  if(M.hr){hrPlayerTick(M,paused?0:dt);return;}
  M.head.rotation.x=P.pitch*0.55;
  if(M._hat!==(P.cos&&P.cos.hat||null))applyHat(M);
  syncArmTool(M);
  syncArmorModel(M);
  const _hs=M.head.getObjectByName('hat');
  if(_hs){
    const sp=_hs.getObjectByName('hatspin');
    if(sp)sp.rotation.y+=dt*10;
    const ha=_hs.getObjectByName('hathalo');
    if(ha)ha.position.y=0.5+Math.sin(Date.now()*0.003)*0.05;
  }
  if(P.ride){
    const sit=P.ride.t==='skate'?0.25:1.15;
    M.lL.rotation.x=M.lR.rotation.x=-sit;
    M.aL.rotation.x=M.aR.rotation.x=-0.5;
  }else{
    const spd=Math.hypot(P.vx,P.vz);
    plAnim+=spd*dt*2.4;
    const sw=Math.sin(plAnim)*0.7*clamp(spd/4.4,0,1);
    M.lL.rotation.x=sw;M.lR.rotation.x=-sw;
    M.aL.rotation.x=-sw*0.8;M.aR.rotation.x=sw*0.8;
  }
}
function applyCamMode(){
  if(typeof handG!=='undefined'&&handG)handG.visible=camMode===0;
  if(camMode===0||!P)return;
  const back=camMode===1?1:-1;
  const l=lookDir();
  const ex=P.x,ey=P.y+P.eyeY,ez=P.z;
  let d=4;
  for(let t=0.4;t<=4;t+=0.2){
    const sx=ex-l[0]*t*back,sy=ey-l[1]*t*back,sz=ez-l[2]*t*back;
    if(solidAt(Math.floor(sx),Math.floor(sy),Math.floor(sz))){d=Math.max(0.6,t-0.3);break;}
  }
  camera.position.set(ex-l[0]*d*back,ey-l[1]*d*back,ez-l[2]*d*back);
  if(camMode===2){camera.rotation.y=P.yaw+Math.PI;camera.rotation.x=-P.pitch;}
}

/* ----- disaster spheres ----- */
IT.DSPH=199;
idef(IT.DSPH,{name:'Disaster Sphere',icon:'i_dsph',stack:4});
tile('i_dsph',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#241b30';c.fillRect(4,2,8,12);c.fillRect(2,4,12,8);c.fillRect(3,3,10,10);
  c.fillStyle='#7a3df0';c.fillRect(4,4,4,3);c.fillRect(9,9,3,3);
  c.fillStyle='#ff7a2f';c.fillRect(9,4,3,3);c.fillRect(4,9,3,3);
  c.fillStyle='#46e2cf';c.fillRect(7,7,2,2);c.fillRect(3,3,2,1);c.fillRect(12,11,1,2);
  c.fillStyle='#fff';c.fillRect(5,3,1,1);c.fillRect(11,12,1,1);});
R([' D ','DGD',' D '],{D:IT.DIAMOND,G:IT.GUNPOWDER},IT.DSPH,1);

function isLogId(id){return id===B.LOG_O||id===B.LOG_B||id===B.LOG_S;}
function isLeafId(id){return id===B.LEAF_O||id===B.LEAF_B||id===B.LEAF_S;}
function isTreeId(id){return isLogId(id)||isLeafId(id);}
const DIS={kind:null,t:0,dur:0,cx:0,cz:0,gy:0,data:null};
const DISNAME={tornado:'TORNADO',tsunami:'TSUNAMI',volcano:'VOLCANO',fire:'FIRE RAIN'};
const fires=new Map();
function heightAt(x,z){
  for(let y=WH-1;y>=0;y--){
    const id=getBlock(x,y,z);
    if(id!==B.AIR&&id!==B.WATER&&id!==B.LAVA&&DEFS[id].solid!==false)return y+1;
  }
  return SEA;
}
function fmtT(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2);}
function disHud(txt){
  const el=$('dis');if(!el)return;
  el.textContent=txt||'';
  el.style.display=txt?'block':'none';
}
function startDisaster(kind,px,pz){
  if(DIS.kind)endDisaster(true);
  DIS.kind=kind;DIS.t=0;
  DIS.cx=Math.floor(px);DIS.cz=Math.floor(pz);
  DIS.gy=heightAt(DIS.cx,DIS.cz);
  playS('dsph');
  if(kind==='tornado'){
    DIS.dur=180;
    const G=new THREE.Group(),mats=[];
    for(let i=0;i<12;i++){
      const r=0.5+i*0.34,m=new THREE.Mesh(new THREE.BoxGeometry(r*2,0.8,r*2),
        new THREE.MeshLambertMaterial({color:0x4a4650,transparent:true,opacity:0.55}));
      m.position.y=i*0.85+0.4;m.rotation.y=i*0.7;G.add(m);mats.push(m);
    }
    scene.add(G);
    const te={t:'twister',x:px,y:DIS.gy,z:pz,vx:0,vz:0,wT:3,tx:px,tz:pz,scanT:0,mesh:G,parts:mats,deb:0};
    entities.push(te);
    DIS.data={te};
    showToast('A tornado touches down!');
  }else if(kind==='tsunami'){
    DIS.dur=90;
    const cols=[];
    for(let dx=-36;dx<=36;dx++)for(let dz=-36;dz<=36;dz++)
      if(dx*dx+dz*dz<=1296)cols.push([DIS.cx+dx,DIS.cz+dz]);
    DIS.data={cols,lvl:SEA,q:[]};
    showToast('The sea is rising — and it is NOT going back!');
  }else if(kind==='volcano'){
    DIS.dur=182.5;
    const list=[],R=12,H=18;
    for(let dx=-R;dx<=R;dx++)for(let dz=-R;dz<=R;dz++){
      const dd=Math.hypot(dx,dz);
      if(dd>R)continue;
      const gy=heightAt(DIS.cx+dx,DIS.cz+dz);
      const top=DIS.gy+Math.max(0,Math.round(H*(1-dd/R)));
      for(let y=Math.min(gy,top);y<=top;y++){
        if(dd<=2.6&&y>DIS.gy+H-7)continue; /* crater */
        list.push([DIS.cx+dx,y,DIS.cz+dz]);
      }
    }
    list.sort((a,b)=>a[1]-b[1]);
    DIS.data={list,idx:0,lava:[],bombT:0,streamT:0,cd:{},H,R};
    P.x=DIS.cx+4.0;P.z=DIS.cz+0.5;P.y=DIS.gy+H+3;
    P.vx=P.vz=0;P.vy=1.5;P.fallD=0;
    showToast('The ground swells beneath you!');
    playS('rumble');
  }else if(kind==='fire'){
    DIS.dur=180;
    DIS.data={bT:0,ckT:0};
    showToast('The sky burns — fire rain!');
  }
}
function endDisaster(force){
  if(!DIS.kind)return;
  const k=DIS.kind,d=DIS.data;
  if(k==='tornado'){
    if(d&&d.te&&!d.te.dead)removeEnt(d.te);
    for(const e of entities)if(e.t==='debris'&&!e.dead)removeEnt(e);
  }else if(k==='tsunami'){
    /* the flood is the new coastline */
  }else if(k==='volcano'){
    /* the lava is forever */
    for(const e of entities)if(e.t==='lavab'&&!e.dead)removeEnt(e);
  }else if(k==='fire'){
    fires.clear();
    for(const e of entities)if(e.t==='fireb'&&!e.dead)removeEnt(e);
  }
  DIS.kind=null;DIS.data=null;
  setWind(0);disHud('');
  if(!force)showToast(DISNAME[k]+' has passed.');
}
function disasterHardReset(){
  DIS.kind=null;DIS.data=null;fires.clear();setWind(0);disHud('');
}
function updateDisaster(dt){
  if(!playing||!DIS.kind){setWind(0);return;}
  if(dt>0)DIS.t+=dt;
  const d=DIS.data,left=DIS.dur-DIS.t;
  if(DIS.kind==='tornado'){
    setWind(0.85);
    disHud('TORNADO \u2014 '+fmtT(left));
  }else if(DIS.kind==='tsunami'){
    setWind(0.3);
    disHud('TSUNAMI \u2014 '+fmtT(left));
    if(dt>0){
      const RISE=18;
      const want=SEA+Math.min(6,Math.floor(DIS.t/RISE*6)+1);
      while(d.lvl<want){
        d.lvl++;
        for(const c of d.cols)d.q.push([c[0],d.lvl,c[1]]);
        playS('wave');
      }
      let n=0;
      while(d.q.length&&n<700){
        const c=d.q.pop();n++;
        if(getBlock(c[0],c[1],c[2])===B.AIR){
          setBlock(c[0],c[1],c[2],B.WATER);
          if(Math.random()<0.01)burstParticles(c[0]+0.5,c[1]+0.7,c[2]+0.5,B.WATER,3,0.5);
        }
      }
    }
  }else if(DIS.kind==='volcano'){
    const BUILD=2.5,CD=60;
    if(DIS.t<BUILD+CD){
      setWind(0.15);
      const cd=Math.ceil(BUILD+CD-DIS.t);
      disHud('VOLCANO \u2014 eruption in '+fmtT(cd));
      if(dt>0){
        if(DIS.t<BUILD){
          const want=Math.floor(DIS.t/BUILD*d.list.length);
          while(d.idx<want){
            const c=d.list[d.idx++];
            const cur=getBlock(c[0],c[1],c[2]);
            const cd2=DEFS[cur];
            if(cur===B.AIR||cur===B.WATER||cd2.replace||isTreeId(cur))
              setBlock(c[0],c[1],c[2],B.STONE);
          }
          P.vy=Math.max(P.vy,0);P.fallD=0;
          if(Math.random()<0.3)burstParticles(DIS.cx+(Math.random()-0.5)*10,DIS.gy+Math.random()*8,DIS.cz+(Math.random()-0.5)*10,B.STONE,3,0.8);
        }
        if([45,30,15,10,5,4,3,2,1].includes(cd)&&!d.cd[cd]){
          d.cd[cd]=1;
          showToast('Volcano erupts in '+cd+'s!');
          if(cd%15===0||cd<=5)playS('rumble');
        }
      }
    }else{
      setWind(0.4);
      disHud('VOLCANO \u2014 '+fmtT(left));
      if(dt>0){
        if(!d.erupted){
          d.erupted=true;
          playS('boom');playS('rumble');
          showToast('ERUPTION!');
          for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)
            for(let y=DIS.gy+d.H-6;y<=DIS.gy+d.H-1;y++){
              if(Math.hypot(dx,dz)<=2.6&&getBlock(DIS.cx+dx,y,DIS.cz+dz)===B.AIR){
                setBlock(DIS.cx+dx,y,DIS.cz+dz,B.LAVA);
                d.lava.push([DIS.cx+dx,y,DIS.cz+dz]);
              }
            }
        }
        d.bombT-=dt;
        if(d.bombT<=0){
          d.bombT=0.22;
          for(let nb=0;nb<2;nb++){
          const a=Math.random()*6.28,sp=3+Math.random()*8;
          const m=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3),
            new THREE.MeshLambertMaterial({color:0xff8a2f,emissive:new THREE.Color(0.6,0.2,0)}));
          scene.add(m);
          entities.push({t:'lavab',x:DIS.cx+0.5,y:DIS.gy+d.H,z:DIS.cz+0.5,
            vx:Math.sin(a)*sp,vy:9+Math.random()*4.5,vz:Math.cos(a)*sp,
            age:0,mesh:m,trailT:0});
          }
          playS('rumble');
        }
        d.streamT-=dt;
        if(d.streamT<=0){
          d.streamT=1.1;
          const a=Math.random()*6.28;
          let lx=DIS.cx+0.5+Math.sin(a)*3,lz=DIS.cz+0.5+Math.cos(a)*3;
          for(let i=0;i<26;i++){
            lx+=Math.sin(a);lz+=Math.cos(a);
            const fx=Math.floor(lx),fz=Math.floor(lz);
            const hy=heightAt(fx,fz);
            if(hy<=DIS.gy-2)break;
            if(getBlock(fx,hy,fz)===B.AIR){
              setBlock(fx,hy,fz,B.LAVA);
              d.lava.push([fx,hy,fz]);
            }
          }
        }
      }
    }
  }else if(DIS.kind==='fire'){
    setWind(0.3);
    disHud('FIRE RAIN \u2014 '+fmtT(left));
    if(dt>0){
      d.bT-=dt;
      if(d.bT<=0){
        d.bT=0.08;
        for(let i=0;i<3;i++){
          const m=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.5,0.18),
            new THREE.MeshLambertMaterial({color:0xff9a3f,emissive:new THREE.Color(0.7,0.3,0)}));
          scene.add(m);
          entities.push({t:'fireb',
            x:DIS.cx+(Math.random()-0.5)*60,
            y:DIS.gy+30+Math.random()*8,
            z:DIS.cz+(Math.random()-0.5)*60,
            vx:(Math.random()-0.5)*2,vy:-13,vz:(Math.random()-0.5)*2,
            age:0,mesh:m,trailT:0});
        }
      }
      d.ckT-=dt;
      if(d.ckT<=0&&fires.size>0){d.ckT=0.45;playS('crackle');}
    }
  }
  if(dt>0)updateFires(dt);
  if(DIS.t>=DIS.dur)endDisaster();
}
/* tornado pieces */
function updateTwister(e,dt){
  e.wT-=dt;
  if(e.wT<=0){
    e.wT=2.5+Math.random()*2.5;
    const a=Math.random()*6.28,r=Math.random()*50;
    e.tx=DIS.cx+Math.sin(a)*r;e.tz=DIS.cz+Math.cos(a)*r;
  }
  const dx=e.tx-e.x,dz=e.tz-e.z,dd=Math.hypot(dx,dz)||1;
  e.x+=dx/dd*3.4*dt;e.z+=dz/dd*3.4*dt;
  if(((e.x*7)|0)!==e._lx||((e.z*7)|0)!==e._lz){
    e._lx=(e.x*7)|0;e._lz=(e.z*7)|0;
    e.y=heightAt(Math.floor(e.x),Math.floor(e.z));
  }
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.y+=dt*7;
  /* shred trees */
  e.scanT-=dt;
  if(e.scanT<=0){
    e.scanT=0.1;
    const bx=Math.floor(e.x),bz=Math.floor(e.z),by=Math.floor(e.y);
    for(let i=0;i<40;i++){
      const x=bx+((Math.random()*13)|0)-6,z=bz+((Math.random()*13)|0)-6,y=by-6+((Math.random()*17)|0);
      const id=getBlock(x,y,z);
      const dd2=DEFS[id];
      const soft=dd2&&dd2.hard>=0&&dd2.hard<=2.5&&!dd2.interact&&!dd2.door&&id!==B.BEDROCK;
      if(isTreeId(id)||soft){
        setBlock(x,y,z,B.AIR);
        if(e.deb<70){
          e.deb++;
          const dcol=isLogId(id)?0x6b4a2c:isLeafId(id)?0x3f8f3a:
            (id===B.SAND||id===B.SANDSTONE)?0xd8c98a:
            (id===B.GRASS||id===B.DIRT)?0x7a5a38:
            id===B.GLASS?0xdfeefa:0x9a9aa2;
          const m=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.45,0.45),
            new THREE.MeshLambertMaterial({color:dcol}));
          scene.add(m);
          entities.push({t:'debris',x:x+0.5,y:y+0.5,z:z+0.5,vx:0,vy:2,vz:0,age:0,mesh:m,
            tw:e});
        }
      }
    }
  }
  /* drag entities + player */
  if(P&&!P.dead&&!P.ride){
    const pdx=e.x-P.x,pdz=e.z-P.z,pd=Math.hypot(pdx,pdz);
    if(pd<9&&pd>0.01){
      P.x+=pdx/pd*5.5*dt;P.z+=pdz/pd*5.5*dt;
      if(pd<4)P.vy=Math.max(P.vy,13);
    }
  }
  for(const m of entities){
    if(m.t!=='mob'||m.dead)continue;
    const mdx=e.x-m.x,mdz=e.z-m.z,md=Math.hypot(mdx,mdz);
    if(md<7&&md>0.01){
      m.vx+=mdx/md*9*dt;m.vz+=mdz/md*9*dt;
      if(md<3)m.vy=Math.max(m.vy,4);
    }
  }
  if(Math.random()<0.5)burstParticles(e.x+(Math.random()-0.5)*4,e.y+Math.random()*8,e.z+(Math.random()-0.5)*4,B.DIRT,2,0.6);
}
function updateDebris(e,dt){
  e.age+=dt;
  const tw=e.tw;
  if(tw&&!tw.dead&&e.age<4){
    const dx=tw.x-e.x,dz=tw.z-e.z,dd=Math.hypot(dx,dz)||0.01;
    /* swirl: pull in + tangent + lift */
    const tx=-dz/dd,tz=dx/dd;
    e.vx=lerp(e.vx,dx/dd*2+tx*7,1-Math.exp(-dt*3));
    e.vz=lerp(e.vz,dz/dd*2+tz*7,1-Math.exp(-dt*3));
    e.vy=lerp(e.vy,e.y<tw.y+9?2.5:0,1-Math.exp(-dt*2));
  }else{
    e.vy-=GRAV*0.8*dt;
  }
  e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.x+=dt*5;e.mesh.rotation.y+=dt*4;
  if(e.age>6.5||e.y<-10||(e.age>4&&solidAt(Math.floor(e.x),Math.floor(e.y),Math.floor(e.z)))){
    burstParticles(e.x,e.y,e.z,B.DIRT,4,0.4);
    if(e.tw)e.tw.deb--;
    removeEnt(e);
  }
}
/* volcano bombs */
function updateLavaBomb(e,dt){
  e.age+=dt;
  e.vy-=GRAV*0.8*dt;
  e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;
  e.trailT-=dt;
  if(e.trailT<=0){e.trailT=0.08;burstParticles(e.x,e.y,e.z,B.LAVA,2,0.2);}
  e.mesh.position.set(e.x,e.y,e.z);
  const fx=Math.floor(e.x),fy=Math.floor(e.y),fz=Math.floor(e.z);
  if(e.vy<0&&(solidAt(fx,fy,fz)||e.age>8)){
    const ty=fy+ (solidAt(fx,fy,fz)?1:0);
    if(getBlock(fx,ty,fz)===B.AIR&&DIS.kind==='volcano'){
      setBlock(fx,ty,fz,B.LAVA);
      DIS.data.lava.push([fx,ty,fz]);
    }
    burstParticles(e.x,e.y+0.5,e.z,B.LAVA,10,0.8);
    playS('sizzle');
    if(P&&!P.dead&&Math.hypot(P.x-e.x,P.y-e.y,P.z-e.z)<4)damagePlayer(6);
    igniteAt(fx,ty+1,fz);
    removeEnt(e);
  }
}
/* fire rain */
function isFlam(id){
  return isTreeId(id)||id===B.PLANK_O||id===B.PLANK_B||id===B.PLANK_S||
    id===B.WOOL||id===B.TALLGRASS||(id>=B.RAMP&&id<B.RAMP+4);
}
function igniteAt(x,y,z){
  if(fires.size>600)return;
  if(!isFlam(getBlock(x,y,z)))return;
  fires.set(x+','+y+','+z,0);
}
function updateFires(dt){
  if(!fires.size||!GR.fireTick)return;
  for(const [k,v] of fires){
    const fp=dimP(k);
    if(!fp)continue;
    const nv=v+dt;
    const [x,y,z]=fp.map(Number);
    if(Math.random()<0.25)burstParticles(x+0.5,y+0.7,z+0.5,B.LAVA,2,0.4);
    if(nv>0.9){
      fires.delete(k);
      const id=getBlock(x,y,z);
      if(isFlam(id)){
        setBlock(x,y,z,B.AIR);
        if(getBlock(x,y-1,z)===B.GRASS)setBlock(x,y-1,z,B.DIRT); /* scorched earth */
        for(const [ox,oy,oz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]])
          igniteAt(x+ox,y+oy,z+oz);
      }
    }else fires.set(k,nv);
  }
  if(P&&!P.dead){
    const pk=Math.floor(P.x)+','+Math.floor(P.y)+','+Math.floor(P.z);
    const pk2=Math.floor(P.x)+','+(Math.floor(P.y)+1)+','+Math.floor(P.z);
    if(fires.has(pk)||fires.has(pk2)){
      P.fireAcc=(P.fireAcc||0)+dt;
      if(P.fireAcc>0.45){P.fireAcc=0;if(!powActive('fire')){damagePlayer(2);playS('sizzle');}}
    }
  }
}
function updateFireBomb(e,dt){
  e.age+=dt;
  e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;
  e.trailT-=dt;
  if(e.trailT<=0){e.trailT=0.07;burstParticles(e.x,e.y,e.z,B.LAVA,1,0.15);}
  e.mesh.position.set(e.x,e.y,e.z);
  const fx=Math.floor(e.x),fy=Math.floor(e.y),fz=Math.floor(e.z);
  const hid=getBlock(fx,fy,fz);
  if(solidAt(fx,fy,fz)||isTreeId(hid)){
    if(isTreeId(hid))igniteAt(fx,fy,fz);
    else burstParticles(e.x,e.y+0.4,e.z,B.LAVA,5,0.5);
    removeEnt(e);return;
  }
  if(e.age>6||e.y<-10)removeEnt(e);
}
/* wind loop */
let windN=null,windG=null,windLvl=0;
function setWind(l){
  windLvl=l;
  try{
    if(!AC)return;
    if(l>0&&!windN){
      const bufferSize=2*AC.sampleRate,b=AC.createBuffer(1,bufferSize,AC.sampleRate);
      const data=b.getChannelData(0);
      for(let i=0;i<bufferSize;i++)data[i]=Math.random()*2-1;
      windN=AC.createBufferSource();windN.buffer=b;windN.loop=true;
      const f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=420;f.Q.value=0.6;
      windG=AC.createGain();windG.gain.value=0;
      windN.connect(f);f.connect(windG);windG.connect(AC.destination);
      windN.start();
    }
    if(windG)windG.gain.linearRampToValueAtTime(l*0.12,AC.currentTime+0.4);
  }catch(e){}
}
/* extra sounds */
const _playS4=playS;
playS=function(n){
  if(!soundOn)return;
  try{
    switch(n){
      case 'rumble': tone(46,30,0.5,'sine',0.5);noiseS(0.4,0.22,160,60);return;
      case 'sizzle': noiseS(0.18,0.2,3200,1500);return;
      case 'crackle':noiseS(0.05,0.25,2600,900);tone(180,60,0.04,'square',0.12);return;
      case 'wave':   noiseS(0.5,0.18,500,180);return;
      case 'dsph':   tone(220,60,0.5,'sine',0.3);tone(440,880,0.4,'sine',0.2);noiseS(0.3,0.12,2000,400);return;
      default:_playS4(n);
    }
  }catch(e){}
};


