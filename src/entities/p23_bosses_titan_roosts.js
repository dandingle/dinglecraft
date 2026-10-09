/* ===================================================================== */
/* PART 23 — BOSS FIGHTS: the Dragon King & the Stone Titan  (2.0)       */
/* ===================================================================== */
MOBT.dking={hp:150,hw:1.7,h:2.4,spd:8,fly:true,boss:true,dmg:7,xp:0,
  body:'#d4a017',legc:'#8a6a0a',drop:{id:IT.DSCALE,min:5,max:8}};
MOBT.titan={hp:120,hw:0.75,h:2.7,spd:1.7,dmg:8,hostile:true,boss:true,xp:0,
  body:'#8e8e96',legc:'#6e6e76'};

/* ----- the Stone Titan: build a core, regret it ----- */
B.TCORE=78;
def(B.TCORE,{name:'Titan Core',tiles:'t_tcore',hard:3,toolClass:'pick',req:true});
tile('t_tcore',(c,R)=>{fillN(c,R,'#7e7e86',.08);
  c.fillStyle='#ffd84d';c.fillRect(7,1,2,14);c.fillRect(1,7,14,2);
  c.fillStyle='#46e2cf';c.fillRect(6,6,4,4);
  c.fillStyle='#ffffff';c.fillRect(7,7,1,1);
});
R(['SGS','GDG','SGS'],{S:B.SBRICK,G:IT.GOLD,D:IT.DIAMOND},B.TCORE,1);
const TITQ=[];
function tickTitans(dt){
  for(let i=TITQ.length-1;i>=0;i--){
    const q=TITQ[i];
    if(getBlock(q.x,q.y,q.z)!==B.TCORE){TITQ.splice(i,1);continue;}
    q.t-=dt;
    q.pT-=dt;
    if(q.pT<=0){
      q.pT=0.25;
      burstParticles(q.x+0.5,q.y+0.5,q.z+0.5,B.SBRICK,4,0.7);
      playS('rumble');
    }
    if(q.t<=0){
      TITQ.splice(i,1);
      setBlock(q.x,q.y,q.z,B.AIR);
      spawnMob('titan',q.x+0.5,q.y,q.z+0.5);
      const t=entities[entities.length-1];
      t.mesh.scale.set(1.9,1.75,1.9);
      t.rockT=2.5;t.slamT=5;
      burstParticles(q.x+0.5,q.y+1.5,q.z+0.5,B.STONE,18,1.3);
      showToast('THE GROUND SHAKES. THE STONE TITAN RISES.');
      playS('thud');
    }
  }
}
function titanExtra(e,dt,pd,pdx,pdz){
  if(P.dead||P.mode==='c')return;
  e.rockT=(e.rockT===undefined?2.5:e.rockT)-dt;
  e.slamT=(e.slamT===undefined?5:e.slamT)-dt;
  /* hurl a boulder */
  if(e.rockT<=0&&pd>5&&pd<26&&mobSees(e)){
    e.rockT=3.2;
    const dd=pd||1;
    const m=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),
      new THREE.MeshLambertMaterial({color:0x77777f}));
    scene.add(m);
    entities.push({t:'rock',x:e.x,y:e.y+2.6,z:e.z,
      vx:pdx/dd*10,vy:6.5+pd*0.12,vz:pdz/dd*10,age:0,mesh:m});
    playS('throw');
  }
  /* shockwave slam */
  if(e.slamT<=0&&pd<6.5){
    e.slamT=8;
    for(let i=0;i<14;i++){
      const a=i/14*Math.PI*2;
      burstParticles(e.x+Math.sin(a)*3,e.y+0.3,e.z+Math.cos(a)*3,B.STONE,2,0.8);
    }
    const dd=pd||0.5;
    P.vx+=pdx/dd*9;P.vz+=pdz/dd*9;P.vy=Math.max(P.vy,9.5);
    P.hurtT=0;
    damagePlayer(4);
    for(const o of entities){
      if(o.t==='mob'&&!o.dead&&o!==e){
        const ox=o.x-e.x,oz=o.z-e.z,od=Math.hypot(ox,oz);
        if(od<6.5){o.vx+=ox/od*8;o.vz+=oz/od*8;o.vy=6;hurtMob(o,3,ox,oz);}
      }
    }
    playS('boom');
  }
}
function updateRock(e,dt){
  e.age+=dt;
  e.vy-=22*dt;
  e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.x+=dt*6;e.mesh.rotation.z+=dt*4;
  const dx=P.x-e.x,dy=(P.y+0.9)-e.y,dz=P.z-e.z;
  if(!P.dead&&Math.hypot(dx,dy,dz)<1.3){
    P.hurtT=0;
    damagePlayer(5,e.vx,e.vz);
    burstParticles(e.x,e.y,e.z,B.STONE,8,0.9);
    removeEnt(e);
    return;
  }
  const bid=getBlock(Math.floor(e.x),Math.floor(e.y),Math.floor(e.z));
  if(DEFS[bid].solid||e.age>7){
    burstParticles(e.x,e.y+0.2,e.z,B.STONE,8,0.9);
    playS('thud');
    removeEnt(e);
  }
}
/* ----- Dragon Roosts: where the King sleeps ----- */
const RGRID=320,RSEEN=new Set(),RPEND=[];
function rstCell(gx,gz){
  if(h2(gx*11+3,gz*11-7,SEED+7171)>0.6)return null;
  const ox=70+Math.floor(h2(gx,gz,SEED+7272)*(RGRID-140));
  const oz=70+Math.floor(h2(gx,gz,SEED+7373)*(RGRID-140));
  const cx=gx*RGRID+ox,cz=gz*RGRID+oz;
  const ci=colInfo(cx,cz);
  if(ci.h<50)return null; /* only the high places */
  if(mgNoStruct(cx,cz))return null;
  return {id:gx+','+gz,cx,cz,gy:Math.min(ci.h,WH-8)};
}
function stampRoosts(blocks,x0,z0){
  const g0x=Math.floor((x0-10)/RGRID),g1x=Math.floor((x0+CH+10)/RGRID);
  const g0z=Math.floor((z0-10)/RGRID),g1z=Math.floor((z0+CH+10)/RGRID);
  for(let gx=g0x;gx<=g1x;gx++)for(let gz=g0z;gz<=g1z;gz++){
    const v=rstCell(gx,gz);
    if(!v)continue;
    if(v.cx+7<x0||v.cx-7>=x0+CH||v.cz+7<z0||v.cz-7>=z0+CH)continue;
    for(let ox=-6;ox<=6;ox++)for(let oz=-6;oz<=6;oz++){
      const wx=v.cx+ox,wz=v.cz+oz;
      if(wx<x0||wx>=x0+CH||wz<z0||wz>=z0+CH)continue;
      const r=Math.hypot(ox,oz);
      if(r>6)continue;
      const lx=wx-x0,lz=wz-z0;
      blocks[bidx(lx,v.gy,lz)]=B.STONE;          /* platform */
      for(let dy=1;dy<=4;dy++)blocks[bidx(lx,v.gy+dy,lz)]=B.AIR;
      if(r>5)blocks[bidx(lx,v.gy+1,lz)]=B.STONE; /* rim */
      if(r<=1.6)blocks[bidx(lx,v.gy+1,lz)]=B.SBRICK; /* nest */
    }
    const gold=[[4,4],[-4,4],[4,-4],[-4,-4]];
    for(const [ox,oz] of gold){
      const wx=v.cx+ox,wz=v.cz+oz;
      if(wx>=x0&&wx<x0+CH&&wz>=z0&&wz<z0+CH)
        blocks[bidx(wx-x0,v.gy+1,wz-z0)]=B.GOLD_ORE;
    }
    if(v.cx>=x0&&v.cx<x0+CH&&v.cz>=z0&&v.cz<z0+CH&&!RSEEN.has(v.id))
      RPEND.push(v);
  }
}
function processRoosts(dt){
  while(RPEND.length){
    const v=RPEND.pop();
    if(RSEEN.has(v.id))continue;
    RSEEN.add(v.id);
    spawnMob('dking',v.cx+0.5,v.gy+7,v.cz+0.5);
    for(const s of [-1,1]){
      spawnMob('dragon',v.cx+s*6,v.gy+9,v.cz-4);
      const d=entities[entities.length-1];
      d.angry=true;
      d.hx=v.cx;d.hy=v.gy+10;d.hz=v.cz;
    }
    if(Math.hypot(v.cx-P.x,v.cz-P.z)<60)
      showToast('\u2654 A terrible screech splits the air...');
  }
}


