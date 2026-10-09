/* ===================================================================== */
/* PART 22 — SUPERPOWERS  (2.0)                                          */
/* ===================================================================== */
IT.CRYSTAL=225;
idef(IT.CRYSTAL,{name:'Power Crystal',icon:'i_crystal'});
tile('i_crystal',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#b44dff';c.beginPath();c.moveTo(8,1);c.lineTo(13,6);c.lineTo(11,14);c.lineTo(5,14);c.lineTo(3,6);c.closePath();c.fill();
  c.fillStyle='#e2b3ff';c.fillRect(6,4,2,5);
  c.fillStyle='#7a1fc0';c.fillRect(9,7,2,6);});
const POW=[
  {k:'jump',   cost:3, name:'Super Jump',   desc:'Leap 5 blocks. Knees are fine.'},
  {k:'speed',  cost:3, name:'Swift Feet',   desc:'Run 60% faster, everywhere, always.'},
  {k:'feather',cost:2, name:'Feather Fall', desc:'Fall damage is for other people.'},
  {k:'fire',   cost:3, name:'Fire Heart',   desc:'Lava is now a warm bath.'},
  {k:'laser',  cost:5, name:'Laser Eyes',   desc:'Sneak + right-click, empty hand. Sustained beam. Melts mobs AND terrain. HR has been notified.'},
  {k:'fly',    cost:8, name:'Sky Walker',   desc:'Double-tap Space. Survival flight.'},
];
function powActive(k){if(DIM==='puppet')return false;return !!(P&&P.pow&&P.pow.u&&P.pow.u[k]&&P.pow.a[k]);}
function powUnlock(k){
  const p=POW.find(x=>x.k===k);
  if(!p||P.pow.u[k])return false;
  if(!invConsume(P.inv,IT.CRYSTAL,p.cost)){
    showToast('Needs '+p.cost+' Power Crystals. Wardens and dragons carry them...');
    return false;
  }
  P.pow.u[k]=1;P.pow.a[k]=1;
  redrawHotbar();
  showToast(p.name+' unlocked!');
  playS('jackpot');
  burstParticles(P.x,P.y+1.4,P.z,B.DIA_ORE,12,0.9);
  renderPow();
  return true;
}
function powToggle(k){
  if(!P.pow.u[k])return false;
  P.pow.a[k]=P.pow.a[k]?0:1;
  if(k==='fly'&&!P.pow.a[k]&&P.mode!=='c')P.flying=false;
  playS('click');
  renderPow();
  return true;
}
function fireLaser(){
  const e0=eyePos(),d0=lookDir();
  let len=32;
  /* melt the first block the beam touches (bedrock and portals shrug it off) */
  const bh=raycastB(e0[0],e0[1],e0[2],d0[0],d0[1],d0[2],32);
  if(bh){
    len=Math.min(len,bh.t+0.4);
    const bd=DEFS[bh.id];
    if(bd&&bd.hard>=0&&bh.id!==B.PORTAL_N&&bh.id!==B.PORTAL_A&&!(MGP_ON&&mgProtected(bh.x,bh.y,bh.z,'laser'))){
      setBlock(bh.x,bh.y,bh.z,B.AIR);
      burstParticles(bh.x+0.5,bh.y+0.5,bh.z+0.5,B.LAVA,10,0.8);
      if(Math.random()<0.25){
        const dr=blockDrop(bh.id);
        if(dr)spawnDrop(bh.x+0.5,bh.y+0.5,bh.z+0.5,{id:dr.id,count:dr.count},0,2,0);
      }
    }
  }
  /* fry everything fleshy along the beam */
  const tg=pickMob(e0[0],e0[1],e0[2],d0[0],d0[1],d0[2],len);
  if(tg){
    tg.e.hurtT=0;
    const _mL=mgTag(tg.e,'laser');
    hurtMob(tg.e,12,d0[0],d0[2]);
    if(_mL){HIT_BY=null;HIT_HOW=null;}
    burstParticles(tg.e.x,tg.e.y+tg.e.h*0.5,tg.e.z,B.LAVA,6,0.6);
  }
  const ex=e0[0]+d0[0]*len,ey=e0[1]+d0[1]*len,ez=e0[2]+d0[2]*len;
  const G=new THREE.Group();
  const core=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,1),
    new THREE.MeshBasicMaterial({color:0xfff0e8,transparent:true,opacity:1}));
  const glow=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.44,1),
    new THREE.MeshBasicMaterial({color:0xff2a1a,transparent:true,opacity:0.34,depthWrite:false}));
  G.add(glow);G.add(core);
  G.position.set((e0[0]+ex)/2,(e0[1]+ey)/2-0.12,(e0[2]+ez)/2);
  G.scale.set(1,1,len);
  const dx=ex-e0[0],dy=ey-e0[1],dz=ez-e0[2];
  G.rotation.y=Math.atan2(dx,dz);
  G.rotation.x=-Math.asin(clamp(dy/(len||1),-1,1));
  scene.add(G);
  entities.push({t:'beam',x:G.position.x,y:G.position.y,z:G.position.z,age:0,mesh:G,thick:1});
  burstParticles(ex,ey,ez,B.LAVA,6,0.6);
  playS('laser');
}
function updateBeam(e,dt){
  e.age+=dt;
  /* holds steady, then a quick fade — no strobing while sustained fire overlaps */
  const f=e.age<0.16?1:Math.max(0,1-(e.age-0.16)*7);
  if(e.mesh.children)for(const c of e.mesh.children)
    if(c.material)c.material.opacity=(c===e.mesh.children[1]?1:0.34)*f;
  if(e.mesh.material)e.mesh.material.opacity=0.9*f;
  if(e.age>0.3)removeEnt(e);
}
function openPow(){
  if(!GR.powers)return;   /* the Superpowers game rule */
  powOpen=true;
  const el=$('pow');
  if(el)el.style.display='flex';
  renderPow();
}
function renderPow(){
  const cc=$('powcrystals');
  if(cc)cc.textContent=invCount(P.inv,IT.CRYSTAL)+' \u2726';
  const list=$('powlist');
  if(!list)return;
  let h='';
  for(const p of POW){
    const u=!!P.pow.u[p.k],a=!!P.pow.a[p.k];
    h+='<div class="pitem'+(a?' pon':'')+'"><div class="sname">'+p.name+'</div><div class="sdesc">'+p.desc+'</div>'+
       '<button class="pbtn" data-k="'+p.k+'">'+(u?(a?'ON':'OFF'):('UNLOCK \u2726'+p.cost))+'</button></div>';
  }
  list.innerHTML=h;
  if(typeof list.querySelectorAll==='function'){
    for(const b of list.querySelectorAll('.pbtn')){
      const k=b.getAttribute('data-k');
      b.onclick=()=>{if(P.pow.u[k])powToggle(k);else powUnlock(k);};
    }
  }
}
{
  const pc=$('powclose');
  if(pc)pc.onclick=()=>{closePow();};
  const pb=$('p_pow');
  if(pb)pb.onclick=()=>{hidePause();openPow();};
}


