/* ===================================================================== */
/* PART 18 — armor, boats, flowing water, QOL  (2.0)                     */
/* ===================================================================== */
/* ----- flowing water ----- */
const FLOWQ=[];const FLOWS=new Set();
function flowPush(x,y,z){
  if(y<0||y>=WH)return;
  const k=x+','+y+','+z;
  if(FLOWS.has(k)||FLOWQ.length>4000)return;
  FLOWS.add(k);FLOWQ.push([x,y,z]);
}
function flowAround(x,y,z){
  flowPush(x+1,y,z);flowPush(x-1,y,z);
  flowPush(x,y,z+1);flowPush(x,y,z-1);
  flowPush(x,y-1,z);
}
let flowT=0;
function tickFlow(dt){
  flowT-=dt;
  if(flowT>0)return;
  flowT=0.22;
  let n=0;
  while(FLOWQ.length&&n<70){
    const c=FLOWQ.shift();
    const x=c[0],y=c[1],z=c[2];
    FLOWS.delete(x+','+y+','+z);
    n++;
    if(!chunkAt(x,z))continue;
    if(getBlock(x,y,z)!==B.AIR)continue;
    const above=getBlock(x,y+1,z)===B.WATER;
    let side=false,deep=false;
    for(const o of [[1,0],[-1,0],[0,1],[0,-1]]){
      if(getBlock(x+o[0],y,z+o[1])===B.WATER){
        side=true;
        if(getBlock(x+o[0],y+1,z+o[1])===B.WATER)deep=true;
      }
    }
    const belowSolid=DEFS[getBlock(x,y-1,z)].solid;
    if(above||(side&&(deep||!belowSolid))){setBlock(x,y,z,B.WATER);lavaWaterCheck(x,y,z);}
  }
}

/* ----- armor ----- */
IT.DSCALE=224;
idef(IT.DSCALE,{name:'Dragon Scale',icon:'i_dscale'});
tile('i_dscale',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#8f2222';c.beginPath();c.moveTo(8,1);c.lineTo(14,7);c.lineTo(8,15);c.lineTo(2,7);c.closePath();c.fill();
  c.fillStyle='#c24545';c.fillRect(6,4,4,2);
  c.fillStyle='#5e1414';c.fillRect(7,9,2,4);});
function armorId(m,s){return 230+m*4+s;}
const ARM_M=[
  {n:'Iron',   pts:2,  dur:140, it:()=>IT.IRON,   col:'#d8d8d8'},
  {n:'Golden', pts:1.5,dur:70,  it:()=>IT.GOLD,   col:'#ffe34d'},
  {n:'Diamond',pts:3.5,dur:380, it:()=>IT.DIAMOND,col:'#46e2cf'},
  {n:'Dragon', pts:5,  dur:600, it:()=>IT.DSCALE, col:'#8f2222'}];
const ARM_S=['Helmet','Chestplate','Leggings','Boots'];
for(let m=0;m<4;m++)for(let s=0;s<4;s++){
  idef(armorId(m,s),{name:ARM_M[m].n+' '+ARM_S[s],icon:'arm_'+m+'_'+s,stack:1,armor:{m,s}});
  tile('arm_'+m+'_'+s,((m,s)=>c=>{
    c.clearRect(0,0,16,16);c.fillStyle=ARM_M[m].col;
    if(s===0){c.fillRect(3,3,10,6);c.fillRect(3,9,3,3);c.fillRect(10,9,3,3);}
    else if(s===1){c.fillRect(5,2,6,3);c.fillRect(2,4,12,7);c.fillRect(2,4,3,9);c.fillRect(11,4,3,9);}
    else if(s===2){c.fillRect(3,2,10,4);c.fillRect(3,6,4,8);c.fillRect(9,6,4,8);}
    else{c.fillRect(3,8,4,6);c.fillRect(9,8,4,6);c.fillRect(2,12,5,2);c.fillRect(9,12,5,2);}
    c.fillStyle='rgba(0,0,0,.25)';c.fillRect(4,4,2,1);
  })(m,s));
}
const ARM_PAT=[['MMM','M M'],['M M','MMM','MMM'],['MMM','M M','M M'],['M M','M M']];
for(let m=0;m<4;m++)for(let s=0;s<4;s++)
  R(ARM_PAT[s],{M:ARM_M[m].it()},armorId(m,s),1);
function armorPts(){
  let p=0;
  for(const a of (P.armor||[]))if(a)p+=ARM_M[DEFS[a.id].armor.m].pts;
  return p;
}
function armorAbsorb(n){
  const pts=armorPts();
  if(pts<=0)return n;
  const red=Math.min(0.8,pts*0.04);
  /* the hit chews a random piece */
  const worn=[];
  for(let i=0;i<4;i++)if(P.armor[i])worn.push(i);
  if(worn.length){
    const i=worn[(Math.random()*worn.length)|0];
    const a=P.armor[i];
    const mx=ARM_M[DEFS[a.id].armor.m].dur;
    a.dur=(a.dur===undefined?mx:a.dur)-1;
    if(a.dur<=0){
      showToast('Your '+DEFS[a.id].name+' shattered!');
      playS('break2');
      P.armor[i]=null;
    }
  }
  return n*(1-red);
}
function equipArmor(){
  const st=heldStack();
  if(!st||!DEFS[st.id].armor)return;
  const s=DEFS[st.id].armor.s;
  const old=P.armor[s];
  P.armor[s]={id:st.id,...(st.dur!=null?{dur:st.dur}:{})};
  P.inv[P.sel]=old?{id:old.id,count:1,...(old.dur!=null?{dur:old.dur}:{})}:null;
  redrawHotbar();
  playS('place');
  showToast(DEFS[P.armor[s].id].name+' equipped \u2014 \u26e8 '+armorPts());
}
let _armLast='';
function updateArmorHud(){
  const el=$('armor');
  if(!el)return;
  const pts=armorPts();
  const s=pts>0?'\u26e8 '+pts:'';
  if(s!==_armLast){
    _armLast=s;
    el.textContent=s;
    el.style.display=s?'block':'none';
  }
}
/* ----- boats ----- */
IT.BOAT=223;
idef(IT.BOAT,{name:'Boat',icon:'i_boat',stack:1,boat:true});
tile('i_boat',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#7d5634';c.fillRect(2,8,12,4);
  c.fillStyle='#553a22';c.fillRect(2,12,12,2);
  c.fillStyle='#9a6b39';c.fillRect(2,8,2,4);c.fillRect(12,8,2,4);});
R(['P P','PPP'],{P:'planks'},IT.BOAT,1);
function mkBoatMesh(){
  const G=new THREE.Group(),mats=[];
  const reg=m=>{mats.push(m.material);return m;};
  const hull=reg(boxMesh(1.1,0.25,1.9,'#7d5634'));hull.position.y=0.12;G.add(hull);
  for(const sx of[-1,1]){
    const w=reg(boxMesh(0.12,0.3,1.9,'#9a6b39'));w.position.set(sx*0.55,0.32,0);G.add(w);
  }
  const bow=reg(boxMesh(0.9,0.3,0.14,'#9a6b39'));bow.position.set(0,0.32,-0.95);G.add(bow);
  const aft=reg(boxMesh(0.9,0.3,0.14,'#9a6b39'));aft.position.set(0,0.32,0.95);G.add(aft);
  const seat=reg(boxMesh(0.7,0.08,0.5,'#553a22'));seat.position.set(0,0.3,0.25);G.add(seat);
  return {G,mats};
}
function spawnBoat(x,y,z,yaw){
  const {G,mats}=mkBoatMesh();
  scene.add(G);
  entities.push({t:'boat',hp:6,hw:0.6,h:0.5,x,y,z,vx:0,vy:0,vz:0,yaw:yaw||0,
    spd:0,seatY:0.38,eyeH:1.1,onGround:false,hurtT:0,sprayT:0,mesh:G,mats});
}
function updateBoat(e,dt){
  if(!chunkAt(Math.floor(e.x),Math.floor(e.z)))return;
  e.hurtT=Math.max(0,e.hurtT-dt);
  if(e.hurtT<0.15)for(const m of e.mats)m.emissive&&m.emissive.setRGB(0,0,0);
  const ridden=P&&P.ride===e&&!P.dead;
  let f=0,s=0;
  if(ridden&&!modalOpen()&&!paused){
    f=clamp((KEY.KeyW?1:0)-(KEY.KeyS?1:0)+TOUCH.f,-1,1);
    s=clamp((KEY.KeyD?1:0)-(KEY.KeyA?1:0)+TOUCH.s,-1,1);
  }
  const fx=Math.floor(e.x),fz=Math.floor(e.z);
  const inW=getBlock(fx,Math.floor(e.y+0.05),fz)===B.WATER||getBlock(fx,Math.floor(e.y-0.2),fz)===B.WATER;
  if(inW){
    let wy=Math.floor(e.y+0.05);
    while(wy<WH&&getBlock(fx,wy,fz)===B.WATER)wy++;
    e.y=lerp(e.y,wy-0.18,1-Math.exp(-dt*9));
    e.vy=0;
    const top=f<0?-3:9;
    if(f!==0)e.spd=lerp(e.spd,f*Math.abs(top),1-Math.exp(-dt*1.4));
    else e.spd*=Math.exp(-dt*0.5);
    e.yaw-=s*dt*2.0*clamp(Math.abs(e.spd)/3,0.25,1.2)*Math.sign(e.spd||1);
    e.sprayT-=dt;
    if(Math.abs(e.spd)>3&&e.sprayT<=0){
      e.sprayT=0.16;
      burstParticles(e.x-Math.sin(e.yaw)*0.6,e.y+0.15,e.z-Math.cos(e.yaw)*0.6,B.WATER,2,0.5);
    }
  }else{
    e.vy-=GRAV*dt;
    if(e.vy<-45)e.vy=-45;
    if(f!==0&&e.onGround)e.spd=lerp(e.spd,f*1.4,1-Math.exp(-dt*3));
    else e.spd*=Math.exp(-dt*(e.onGround?5:0.3));
  }
  const dx=-Math.sin(e.yaw),dz=-Math.cos(e.yaw);
  e.vx=dx*e.spd;e.vz=dz*e.spd;
  moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  /* push a parked boat */
  if(!ridden&&P&&!P.dead&&!P.ride){
    const px=Math.abs(P.x-e.x),pz=Math.abs(P.z-e.z);
    if(px<P.hw+e.hw&&pz<P.hw+e.hw&&P.y<e.y+0.9&&P.y+1.6>e.y){
      const ddx=e.x-P.x,ddz=e.z-P.z,dd=Math.hypot(ddx,ddz)||0.01;
      e.x+=ddx/dd*2.2*dt;e.z+=ddz/dd*2.2*dt;
    }
  }
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.y=e.yaw;
  e.mesh.rotation.z=lerp(e.mesh.rotation.z||0,Math.sin(Date.now()*0.002)*(inW?0.04:0),0.1);
  if(e.y<-40)removeEnt(e);
}
/* ----- inventory sort ----- */
function sortInv(){
  const items=[];
  for(let i=9;i<36;i++){
    if(P.inv[i]){items.push(P.inv[i]);P.inv[i]=null;}
  }
  /* merge stackables */
  const merged=[];
  for(const st of items){
    let done=false;
    if(st.dur==null&&!st.ench&&!st.mob){
      for(const m of merged){
        if(m.id===st.id&&m.dur==null&&!m.ench&&!m.mob){
          const mx=stackMax(m.id);
          const take=Math.min(st.count,mx-m.count);
          m.count+=take;st.count-=take;
          if(st.count<=0){done=true;break;}
        }
      }
    }
    if(!done)merged.push(st);
  }
  merged.sort((a,b)=>a.id-b.id||(b.count||0)-(a.count||0));
  for(let i=0;i<merged.length&&i<27;i++)P.inv[9+i]=merged[i];
  if(MODAL.kind)redrawModal();
  playS('pop');
  showToast('Inventory sorted');
}


