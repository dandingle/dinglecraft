/* ===================================================================== */
/* PART 16 — XP, enchanting, mob spawners, THE DUNGEON  (v1.9)           */
/* ===================================================================== */
/* ----- blocks ----- */
B.SBRICK=73;B.SPAWNER_Z=74;B.SPAWNER_S=75;B.ENCH=76;
def(B.SBRICK,{name:'Stone Bricks',tiles:'sbrick',hard:2.2,toolClass:'pick',req:true});
def(B.SPAWNER_Z,{name:'Mob Spawner',tiles:'spawner',hard:4,toolClass:'pick',req:true,drop:null});
def(B.SPAWNER_S,{name:'Mob Spawner',tiles:'spawner',hard:4,toolClass:'pick',req:true,drop:null});
def(B.ENCH,{name:'Enchantment Table',tiles:{top:'ench_t',side:'ench_s',bot:'sbrick'},
  hard:3,toolClass:'pick',interact:'ench'});
tile('sbrick',c=>{c.fillStyle='#8a8d92';c.fillRect(0,0,16,16);
  c.strokeStyle='#5e6166';c.lineWidth=1;
  c.strokeRect(0.5,0.5,8,4);c.strokeRect(8.5,0.5,8,4);
  c.strokeRect(-3.5,4.5,8,4);c.strokeRect(4.5,4.5,8,4);c.strokeRect(12.5,4.5,8,4);
  c.strokeRect(0.5,8.5,8,4);c.strokeRect(8.5,8.5,8,4);
  c.strokeRect(-3.5,12.5,8,4);c.strokeRect(4.5,12.5,8,4);c.strokeRect(12.5,12.5,8,4);
  c.fillStyle='rgba(255,255,255,.12)';c.fillRect(1,1,3,1);c.fillRect(10,9,3,1);});
tile('spawner',c=>{c.fillStyle='#1f2226';c.fillRect(0,0,16,16);
  c.strokeStyle='#454c54';c.lineWidth=1;
  for(let i=0;i<=16;i+=4){c.beginPath();c.moveTo(i+0.5,0);c.lineTo(i+0.5,16);c.stroke();
    c.beginPath();c.moveTo(0,i+0.5);c.lineTo(16,i+0.5);c.stroke();}
  c.fillStyle='#ff7b3a';c.fillRect(7,7,2,2);c.fillStyle='#ffd24d';c.fillRect(7,7,1,1);});
tile('ench_t',c=>{c.fillStyle='#3d2f4f';c.fillRect(0,0,16,16);
  c.fillStyle='#b03acb';c.fillRect(4,4,8,8);c.fillStyle='#e8d9f5';c.fillRect(5,5,6,2);
  c.fillStyle='#46e2cf';c.fillRect(7,9,2,2);
  c.fillStyle='#ffe34d';c.fillRect(1,1,1,1);c.fillRect(14,2,1,1);c.fillRect(2,13,1,1);c.fillRect(13,14,1,1);});
tile('ench_s',c=>{c.fillStyle='#2a2138';c.fillRect(0,0,16,16);
  c.fillStyle='#3d2f4f';c.fillRect(1,0,14,12);
  c.fillStyle='#b03acb';c.fillRect(3,3,2,2);c.fillRect(11,5,2,2);c.fillRect(6,7,2,2);
  c.fillStyle='#0f0c16';c.fillRect(0,12,16,4);});
IT.DEGG=222;
idef(IT.DEGG,{name:'Dungeon Egg',icon:'i_degg',stack:8,degg:true});
tile('i_degg',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#46e2cf';c.beginPath();c.ellipse(8,9,5,6,0,0,7);c.fill();
  c.fillStyle='#1f8e80';c.fillRect(5,6,2,2);c.fillRect(9,9,2,2);c.fillRect(6,12,2,2);
  c.fillStyle='#e8fffb';c.fillRect(6,4,2,2);});
R(['DDD','DGD','DDD'],{D:IT.DIAMOND,G:B.GLASS},IT.DEGG,1);
R([' G ','DDD','SSS'],{G:B.GLASS,D:IT.DIAMOND,S:B.STONE},B.ENCH,1);

/* ----- the Warden ----- */
MOBT.boss={hp:80,hw:0.55,h:2.6,spd:1.55,hostile:true,dmg:6,xp:5,boss:true,
  body:'#3d2f4f',legc:'#2a2138'};

/* ----- XP orbs ----- */
function spawnXP(x,y,z,amt){
  amt=Math.round(amt);
  if(amt<=0)return;
  const n=Math.min(5,Math.max(1,Math.round(amt/3)));
  for(let i=0;i<n;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.22,0.22),
      new THREE.MeshLambertMaterial({color:0x7dff5e,emissive:0x2f8f1a}));
    scene.add(m);
    entities.push({t:'xp',v:i===0?amt-Math.floor(amt/n)*(n-1):Math.floor(amt/n),
      x,y,z,vx:(Math.random()-0.5)*3,vy:2+Math.random()*2,vz:(Math.random()-0.5)*3,
      hw:0.11,h:0.22,onGround:false,age:0,mesh:m});
  }
}
function updateXP(e,dt){
  e.age+=dt;
  if(e.age>120){removeEnt(e);return;}
  const dx=P.x-e.x,dy=(P.y+0.9)-e.y,dz=P.z-e.z;
  const d=Math.hypot(dx,dy,dz);
  if(!P.dead&&d<4.5){
    const pull=14*dt/Math.max(0.5,d);
    e.vx+=dx*pull;e.vy+=dy*pull;e.vz+=dz*pull;
    e.vx*=0.94;e.vy*=0.94;e.vz*=0.94;
  }else{
    e.vy-=GRAV*0.6*dt;
    if(e.onGround){e.vx*=0.85;e.vz*=0.85;}
  }
  moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(!P.dead&&d<0.9){
    P.xp=(P.xp||0)+e.v;
    playS('xp');
    removeEnt(e);
    return;
  }
  e.mesh.position.set(e.x,e.y+0.1+Math.sin(e.age*5)*0.05,e.z);
  e.mesh.rotation.y=e.age*2.5;
  if(e.y<-40)removeEnt(e);
}
let _xpLast='';
function updateXPHud(){
  const el=$('xp');
  if(!el)return;
  const s='\u2726 '+Math.round(P.xp||0)+' XP';
  if(s!==_xpLast){_xpLast=s;el.textContent=s;}
}

/* ----- enchanting ----- */
const ENCH_DEFS={
  sharp:{name:'Sharpness',max:5,cls:'sword'},
  steal:{name:'Lifesteal',max:3,cls:'sword'},
  knock:{name:'Knockback',max:3,cls:'sword'},
  eff:{name:'Efficiency',max:5,cls:'dig'},
  fort:{name:'Fortune',max:3,cls:'dig'},
  power:{name:'Power',max:5,cls:'bow'},
  unb:{name:'Unbreaking',max:3,cls:'any'},
  viral:{name:'Viral',max:5,cls:'sub'},
  srec:{name:'Recoil',max:3,cls:'sub'}
};
const ORE_F=new Set([B.COAL_ORE,B.IRON_ORE,B.GOLD_ORE,B.DIA_ORE]);
const ROMAN=['','I','II','III','IV','V'];
function enchClassOf(st){
  if(!st)return null;
  if(st.id>=200&&st.id<220)return null; /* guns have their own rules */
  const d=DEFS[st.id];
  if(d&&d.bow)return 'bow';
  if(d&&d.subbtn)return 'sub';
  if(d&&d.tool)return d.tool.type==='sword'?'sword':'dig';
  return null;
}
function enchName(st){
  if(!st||!st.ench)return '';
  return Object.entries(st.ench).map(([k,v])=>ENCH_DEFS[k].name+' '+ROMAN[v]).join(', ');
}
function enchCost(st){
  let lv=0;
  if(st&&st.ench)for(const v of Object.values(st.ench))lv+=v;
  return 8+lv*6;
}
function rollOffers(st){
  const cls=enchClassOf(st);
  if(!cls)return [];
  const pool=[];
  for(const [k,d] of Object.entries(ENCH_DEFS)){
    if(d.cls!=='any'&&d.cls!==cls)continue;
    const cur=(st.ench&&st.ench[k])||0;
    if(cur<d.max)pool.push(k);
  }
  for(let i=pool.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,3);
}
let enchOpen=false;
let ENCHUI={offers:[],cost:0};
function enchApply(key){
  const st=heldStack();
  if(!st||!ENCHUI.offers.includes(key))return false;
  const cost=enchCost(st);
  if((P.xp||0)<cost){showToast('Not enough XP \u2014 need '+cost);playS('lose');return false;}
  P.xp-=cost;
  st.ench=st.ench||{};
  st.ench[key]=(st.ench[key]||0)+1;
  playS('ench');
  burstParticles(P.x,P.y+1.4,P.z,B.ENCH,10,0.6);
  showToast(DEFS[st.id].name+' \u2192 '+ENCH_DEFS[key].name+' '+ROMAN[st.ench[key]]);
  ENCHUI={offers:rollOffers(st),cost:enchCost(st)};
  redrawHotbar();
  renderEnch();
  return true;
}
function enchWire(){
  if(enchWire.done)return;
  enchWire.done=true;
  const w=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
  w('enchx',closeEnch);
  w('encho0',()=>enchApply(ENCHUI.offers[0]));
  w('encho1',()=>enchApply(ENCHUI.offers[1]));
  w('encho2',()=>enchApply(ENCHUI.offers[2]));
}
function renderEnch(){
  if(!enchOpen)return;
  const st=heldStack();
  const nm=$('enchitem'),cur=$('enchcur'),xpEl=$('enchxp');
  if(xpEl)xpEl.textContent='\u2726 '+Math.round(P.xp||0)+' XP';
  if(!st||!enchClassOf(st)){
    if(nm)nm.textContent='Hold a tool, sword or bow in your hand';
    if(cur)cur.textContent='';
    for(let i=0;i<3;i++){const b=$('encho'+i);if(b)b.style.display='none';}
    return;
  }
  if(nm)nm.textContent=DEFS[st.id].name;
  if(cur)cur.textContent=st.ench?enchName(st):'No enchantments yet';
  for(let i=0;i<3;i++){
    const b=$('encho'+i);
    if(!b)continue;
    const k=ENCHUI.offers[i];
    if(!k){b.style.display='none';continue;}
    b.style.display='block';
    const nxt=((st.ench&&st.ench[k])||0)+1;
    b.innerHTML='<b>'+ENCH_DEFS[k].name+' '+ROMAN[nxt]+'</b><span>'+ENCHUI.cost+' XP</span>';
  }
}
function openEnch(){
  if(enchOpen)return;
  enchOpen=true;
  enchWire();
  const st=heldStack();
  ENCHUI={offers:st?rollOffers(st):[],cost:st?enchCost(st):0};
  const el=$('ench');if(el)el.style.display='flex';
  document.exitPointerLock&&document.exitPointerLock();
  MB.l=MB.r=false;
  renderEnch();
  playS('jingle');
}
function closeEnch(){
  if(!enchOpen)return;
  enchOpen=false;
  const el=$('ench');if(el)el.style.display='none';
  tryLock();
}

/* ----- mob spawners ----- */
const SPW=new Map(); /* bkey -> cooldown */
function tickSpawners(dt){
  if(!P||P.dead)return;
  for(const [k,cd] of SPW){
    const p=dimP(k);
    if(!p)continue;
    const x=+p[0],y=+p[1],z=+p[2];
    if(!chunkAt(x,z))continue;
    const id=getBlock(x,y,z);
    if(id!==B.SPAWNER_Z&&id!==B.SPAWNER_S){SPW.delete(k);spawnXP(x+0.5,y+0.5,z+0.5,15);continue;}
    const pd=Math.hypot(P.x-(x+0.5),P.y-(y+0.5),P.z-(z+0.5));
    if(pd>14)continue;
    let n=cd-dt;
    if(n<=0){
      let near=0;
      for(const e of entities)
        if(e.t==='mob'&&!e.dead&&MOBT[e.mt].hostile&&Math.hypot(e.x-x,e.z-z)<11)near++;
      if(near<6){
        for(let tr=0;tr<8;tr++){
          const sx=x+((Math.random()*5)|0)-2,sz=z+((Math.random()*5)|0)-2;
          let ok=false,sy=y;
          for(const oy of [0,-1,1]){
            if(getBlock(sx,y+oy,sz)===B.AIR&&getBlock(sx,y+oy+1,sz)===B.AIR&&DEFS[getBlock(sx,y+oy-1,sz)].solid){sy=y+oy;ok=true;break;}
          }
          if(ok){
            spawnMob(id===B.SPAWNER_Z?'zombie':'skel',sx+0.5,sy+0.05,sz+0.5);
            burstParticles(sx+0.5,sy+0.8,sz+0.5,B.SPAWNER_Z,8,0.6);
            playS('spawner');
            break;
          }
        }
      }
      n=2.4+Math.random()*1.6;
    }
    SPW.set(k,n);
  }
}

/* ----- the dungeon ----- */
function carveRoom(cx,cy,cz,hw,hh,hl){
  for(let dx=-hw;dx<=hw;dx++)for(let dz=-hl;dz<=hl;dz++)for(let dy=-1;dy<=hh;dy++){
    const edge=dx===-hw||dx===hw||dz===-hl||dz===hl||dy===-1||dy===hh;
    setBlock(cx+dx,cy+dy,cz+dz,edge?B.SBRICK:B.AIR);
  }
}
function carveHall(x0,z0,x1,z1,cy){
  let x=x0,z=z0;
  for(let guard=0;guard<200;guard++){
    const mx=x!==x1?Math.sign(x1-x):0;
    const mz=mx===0&&z!==z1?Math.sign(z1-z):0;
    for(let ox=-1;ox<=1;ox++)for(let oz=-1;oz<=1;oz++)for(let dy=-1;dy<=3;dy++){
      const wx=x+ox,wz=z+oz;
      const floorCeil=dy===-1||dy===3;
      const side=(mx!==0&&Math.abs(oz)===1)||(mz!==0&&Math.abs(ox)===1)||(mx===0&&mz===0&&(Math.abs(ox)===1||Math.abs(oz)===1));
      const cur=getBlock(wx,cy+dy,wz);
      if(floorCeil){
        if(cur!==B.SBRICK&&cur!==B.AIR)setBlock(wx,cy+dy,wz,B.SBRICK);
        else if(cur!==B.SBRICK&&dy===-1)setBlock(wx,cy+dy,wz,B.SBRICK);
      }else if(side){
        if(cur!==B.AIR&&cur!==B.SBRICK)setBlock(wx,cy+dy,wz,B.SBRICK);
      }else{
        if(cur!==B.AIR)setBlock(wx,cy+dy,wz,B.AIR);
      }
    }
    if(x===x1&&z===z1)break;
    if(mx!==0)x+=mx;else z+=mz;
  }
}
function lootChest(x,y,z,epic){
  setBlock(x,y,z,B.CHEST);
  lootFill(x,y,z,epic);
}
function lootFill(x,y,z,epic){
  const be=ensureBE(x,y,z,'chest');
  const T_C=[[IT.IRON,2,5],[IT.COAL,3,7],[IT.STEAK,1,3],[IT.ARROW,4,10],[IT.GUNPOWDER,2,4],[IT.BULLET,4,10]];
  const T_R=[[IT.DIAMOND,1,3],[IT.GOLD,2,4],[B.TNT,1,2],[IT.SHELL,3,6],[B.RAIL,4,8]];
  const T_E=[[IT.DIAMOND,2,4],[IT.DSPH,1,1],[IT.CART,1,1],[IT.GOLD,3,6],[IT.CRYSTAL,1,2]];
  const rolls=epic?5:4;
  for(let i=0;i<rolls;i++){
    const tab=epic?(Math.random()<0.55?T_E:T_R):(Math.random()<0.3?T_R:T_C);
    const it=tab[(Math.random()*tab.length)|0];
    const cnt=it[1]+Math.floor(Math.random()*(it[2]-it[1]+1));
    const slot=(Math.random()*27)|0;
    be.inv[slot]=be.inv[slot]?be.inv[slot]:{id:it[0],count:cnt};
  }
  if(epic&&Math.random()<0.5){
    const guns=[204,205,208,212];
    be.inv[(Math.random()*27)|0]={id:guns[(Math.random()*guns.length)|0],count:1,dur:250};
  }
  crFoundRoll(be,x,y,z); /* PART 56 c3_found: a very rare found work (a seed + cell hash, never Math.random) */
}
function addSpawner(x,y,z,kind){
  setBlock(x,y,z,kind);
  SPW.set(bkey(x,y,z),1.5+Math.random()*2);
}
function dungeonBuild(px,py,pz){
  const cy=Math.max(8,Math.min(Math.floor(py),WH-12));
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const [dx,dz]=dirs[(Math.random()*4)|0];
  const lx=-dz,lz=dx; /* lateral */
  const cx=Math.floor(px),czz=Math.floor(pz);
  const rooms=[];
  const at=(f,l)=>[cx+dx*f+lx*l,czz+dz*f+lz*l];
  /* entry */
  carveRoom(cx,cy,czz,5,4,5);
  rooms.push({f:0,l:0,hw:5,hl:5});
  /* three spawner rooms along the spine with alternating side offsets */
  const spine=[14,28,42];
  const sides=[8,-8,8];
  for(let i=0;i<3;i++){
    const [rx,rz]=at(spine[i],sides[i]*0);
    carveRoom(rx,cy,rz,6,4,6);
    const [sx,sz]=at(spine[i],sides[i]);
    carveRoom(sx,cy,sz,4,4,4);
    rooms.push({c:[rx,rz],s:[sx,sz]});
  }
  /* boss hall */
  const [bx,bz]=at(58,0);
  carveRoom(bx,cy,bz,8,6,8);
  /* one long spine straight through every room, plus lateral stubs */
  const s0=at(4,0),s1=at(51,0);
  carveHall(s0[0],s0[1],s1[0],s1[1],cy);
  for(let i=0;i<3;i++){
    const sg=Math.sign(sides[i]);
    const a=at(spine[i],3*sg),b=at(spine[i],9*sg);
    carveHall(a[0],a[1],b[0],b[1],cy);
  }
  /* furnish: torches sparse, spawners, chests */
  for(let i=0;i<3;i++){
    const [rx,rz]=at(spine[i],0);
    addSpawner(rx,cy+1,rz,i===1?B.SPAWNER_S:B.SPAWNER_Z);
    if(i===2)addSpawner(rx+lx*3,cy+1,rz+lz*3,B.SPAWNER_S);
    lootChest(rx+dx*4,cy,rz+dz*4,false);
    const [sx,sz]=at(spine[i],sides[i]);
    lootChest(sx,cy,sz,Math.random()<0.4);
    setBlock(rx-dx*5,cy+2,rz-dz*5,B.TORCH);torches.add(bkey(rx-dx*5,cy+2,rz-dz*5));
  }
  lootChest(bx+lx*5,cy,bz+lz*5,true);
  lootChest(bx-lx*5,cy,bz-lz*5,true);
  setBlock(bx-dx*7,cy+3,bz-dz*7,B.TORCH);torches.add(bkey(bx-dx*7,cy+3,bz-dz*7));
  /* population */
  for(let i=0;i<3;i++){
    const [rx,rz]=at(spine[i],0);
    for(let m=0;m<3;m++)
      spawnMob(Math.random()<0.5?'zombie':'skel',rx+(Math.random()*6-3),cy+0.1,rz+(Math.random()*6-3));
  }
  spawnMob('boss',bx+0.5,cy+0.1,bz+0.5);
  /* make sure the player has floor */
  setBlock(cx,cy-1,czz,B.SBRICK);
  P.x=cx+0.5;P.z=czz+0.5;P.y=cy+0.2;P.vx=P.vy=P.vz=0;
  showToast('The Dungeon Warden awaits at the end of the halls...');
  playS('rumble');
}
function bossLoot(e){
  if(MOBT[e.mt].pmob){mpBossLoot(e);return;}
  if(e.mt==='infernis'){
    if(e.cellId)INFKILL.add(e.cellId);
    spawnDrop(e.x,e.y+1,e.z,{id:IT.CRYSTAL,count:3},(Math.random()-0.5)*3,4,(Math.random()-0.5)*3);
    spawnDrop(e.x,e.y+1,e.z,{id:IT.GOLD,count:4},(Math.random()-0.5)*3,4,(Math.random()-0.5)*3);
    spawnDrop(e.x,e.y+1,e.z,{id:IT.BUCKET_L,count:1},0,4,0);
    spawnDrop(e.x,e.y+1.2,e.z,{id:randGadget(),count:1},0,4.5,0);
    showToast('INFERNIS falls. The fortress is yours.');
    return;
  }
  if(e.mt==='valkyra'){
    if(e.cellId)VALKILL.add(e.cellId);
    spawnDrop(e.x,e.y+1,e.z,{id:IT.CRYSTAL,count:3},(Math.random()-0.5)*3,4,(Math.random()-0.5)*3);
    spawnDrop(e.x,e.y+1,e.z,{id:B.GLOWSTONE,count:8},(Math.random()-0.5)*3,4,(Math.random()-0.5)*3);
    spawnDrop(e.x,e.y+1.2,e.z,{id:randGadget(),count:1},0,4.5,0);
    showToast('VALKYRA yields the skies.');
    return;
  }
  if(e.mt==='demon')return;
  if(e.mt==='dking'){
    if(!P.own.includes('hat_crown')){
      P.own.push('hat_crown');
      showToast('\u2654 DRAGON CROWN unlocked in the DINGLE STORE \u2014 free, like all the best things.');
    }
    spawnDrop(e.x,e.y+0.7,e.z,{id:IT.CRYSTAL,count:3},(Math.random()-0.5)*2,3,(Math.random()-0.5)*2);
    spawnXP(e.x,e.y+0.8,e.z,80);
    showToast('THE DRAGON KING FALLS! The skies are yours.');
    playS('jackpot');
    return;
  }
  if(e.mt==='titan'){
    spawnDrop(e.x,e.y+0.7,e.z,{id:IT.CRYSTAL,count:2},(Math.random()-0.5)*2,3,(Math.random()-0.5)*2);
    spawnDrop(e.x,e.y+0.7,e.z,{id:IT.DIAMOND,count:3},(Math.random()-0.5)*2,3,(Math.random()-0.5)*2);
    spawnXP(e.x,e.y+0.8,e.z,60);
    showToast('THE STONE TITAN CRUMBLES!');
    playS('jackpot');
    return;
  }
  const tools=[[toolId(3,0),'dig'],[toolId(3,3),'sword'],[toolId(3,1),'dig']];
  const pick=tools[(Math.random()*tools.length)|0];
  const st={id:pick[0],count:1,ench:{}};
  const pool=pick[1]==='sword'?['sharp','steal','knock','unb']:['eff','fort','unb'];
  const n=1+(Math.random()<0.5?1:0);
  for(let i=0;i<n;i++){
    const k=pool[(Math.random()*pool.length)|0];
    st.ench[k]=Math.min(ENCH_DEFS[k].max,(st.ench[k]||0)+2+(Math.random()<0.4?1:0));
  }
  spawnDrop(e.x,e.y+0.6,e.z,st,(Math.random()-0.5)*2,3,(Math.random()-0.5)*2);
  spawnDrop(e.x,e.y+0.7,e.z,{id:IT.CRYSTAL,count:1},(Math.random()-0.5)*2,3,(Math.random()-0.5)*2);
  spawnXP(e.x,e.y+0.8,e.z,50);
  showToast('THE WARDEN FALLS! It dropped something special...');
  playS('jackpot');
}
let _bossLast='';
function updateBossBar(){
  const el=$('boss');
  if(!el)return;
  let b=null,bd=1e9;
  for(const e of entities){
    if(e.t==='mob'&&!e.dead&&MOBT[e.mt].boss&&!e.mgBar){
      const d=Math.hypot(e.x-P.x,e.z-P.z);
      if(d<(MOBT[e.mt].pboss?48:24)&&d<bd){bd=d;b=e;}
    }
  }
  const BN={pgbomber:'THE DEMOLITIONIST',pgbigpig:'THE PIG',pgbigfrog:'THE FROG',boss:'DUNGEON WARDEN',dking:'THE DRAGON KING',titan:'STONE TITAN',demon:'MALGORATH, THE WORLD-EATER',infernis:'INFERNIS, THE MOLTEN DUKE',valkyra:'VALKYRA OF THE HIGH ISLES'};
  const s=b?((b.bn||BN[b.mt]||'BOSS')+(b.shield?' [SHIELDED]':'')+'  '+'\u2665'.repeat(Math.max(1,Math.ceil(b.hp/(MOBT[b.mt].hp/10))))+' '+Math.max(0,Math.ceil(b.hp))):'';
  if(s!==_bossLast){
    _bossLast=s;
    el.style.display=s?'block':'none';
    el.textContent=s;
  }
}
/* extra sounds */
const _playS9=playS;
playS=function(n){
  if(!soundOn)return;
  try{
    switch(n){
      case 'xp':     tone(880+Math.random()*240,1400,0.06,'sine',0.14);return;
      case 'ench':   tone(520,1040,0.22,'sine',0.2);tone(780,1560,0.22,'sine',0.14);return;
      case 'spawner':tone(180,90,0.2,'sawtooth',0.16);noiseS(0.12,0.1,900,300);return;
      default:_playS9(n);
    }
  }catch(e){}
};


