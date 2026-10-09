/* ===================================================================== */
/* PART 21 — THE DINGLE STORE(tm)  (2.0)                                 */
/* ===================================================================== */
let storeOpen=false;
let powOpen=false;
function closePow(){
  powOpen=false;
  const el=$('pow');
  if(el)el.style.display='none';
  restorePause();
}
function givePlayer(id,count){
  let n=count||1;
  const mx=stackMax(id);
  for(let i=0;i<36&&n>0;i++){
    const s=P.inv[i];
    if(s&&s.id===id&&s.dur==null&&!s.ench&&s.count<mx){
      const mv=Math.min(mx-s.count,n);s.count+=mv;n-=mv;
    }
  }
  for(let i=0;i<36&&n>0;i++){
    if(!P.inv[i]){
      const mv=Math.min(mx,n);
      P.inv[i]={id,count:mv,...(DEFS[id].maxDur?{dur:DEFS[id].maxDur}:{})};
      n-=mv;
    }
  }
  while(n>0){spawnDrop(P.x,P.y+1,P.z,{id,count:Math.min(mx,n)},0,2,0);n-=Math.min(mx,n);}
  redrawHotbar();
}
const STORE_CAT=[
  {key:'hat_tophat', kind:'hat', id:'tophat', price:499, name:'Distinguished Top Hat', desc:'For the voxel gentleperson.'},
  {key:'hat_cone',   kind:'hat', id:'cone',   price:299, name:'Traffic Cone',          desc:'Found it. Yours now. Legally.'},
  {key:'hat_crown',  kind:'hat', id:'crown',  price:999, name:'Royal Crown',           desc:'Heavy is the head. Also blocky.'},
  {key:'hat_prop',   kind:'hat', id:'prop',   price:599, name:'Propeller Cap',         desc:'Does not grant flight. We checked.'},
  {key:'hat_halo',   kind:'hat', id:'halo',   price:799, name:'Halo',                  desc:'Forgives nothing.'},
  {key:'hat_horns',  kind:'hat', id:'horns',  price:2499,name:'Demon Horns',            desc:'Proof of regicide. Or cosplay.'},
  {key:'tr_rainbow', kind:'trail', id:'rainbow', price:399, name:'Rainbow Trail', desc:'Leave joy behind you.'},
  {key:'tr_fire',    kind:'trail', id:'fire',    price:299, name:'Fire Trail',    desc:'You are NOT actually on fire.'},
  {key:'tr_hearts',  kind:'trail', id:'hearts',  price:199, name:'Hearts Trail',  desc:'Love, scattered carelessly.'},
  {key:'joke_ads',   kind:'joke', once:true, price:99,   name:'Remove Ads',      desc:'Act now!'},
  {key:'joke_p2w',   kind:'joke', once:true, price:1499, name:'PAY-TO-WIN SWORD',desc:'Devastating. Game-breaking. Wooden.'},
  {key:'joke_loot',  kind:'joke', once:false,price:250,  name:'Loot Box',        desc:'Could be ANYTHING! (It is dirt.)'},
  {key:'joke_bpass', kind:'joke', once:true, price:999,  name:'Battle Pass S1',  desc:'Earn rewards for continuing to exist.'},
  {key:'joke_subbtn',kind:'joke', once:false,price:1287, name:'Subscribe Button', desc:'Throwable. Comes back. Monetizes mobs on impact.'},
  {key:'joke_terr',  kind:'joke', once:false,price:5999, name:'DEEP DIRT 2D',        desc:'A 2D mining game. Probably. Pre-installed on a Gaming Rig. Place it. Play it. Touch even less grass.'},
  {key:'joke_cine',  kind:'joke', once:false,price:3999, name:'DINGLE CINEMA',    desc:'A whole cinema in a box. Three films. You can climb into all of them. Popcorn for winners.'},
];
function storeBuy(key){
  const it=STORE_CAT.find(c=>c.key===key);
  if(!it)return false;
  if(it.kind==='joke'){
    if(key==='joke_bpass'&&P.own.includes(key)){
      P.bp=!P.bp;
      if(P.bp)P.bpT=180;
      showToast(P.bp?'Battle Pass resumed. The dirt flows once more.':'Battle Pass paused. No more rewards. No more joy. No refunds.');
      playS('click');renderStore();
      return true;
    }
    if(it.once&&P.own.includes(key)){showToast('You already own that. It does the same amount of nothing.');return false;}
    if(P.db<it.price){showToast('Insufficient DingleBucks. Have you considered buying more DingleBucks?');playS('click');return false;}
    P.db-=it.price;
    if(it.once)P.own.push(key);
    if(key==='joke_ads')showToast('Ads removed forever! (There were never any ads.)');
    if(key==='joke_p2w'){givePlayer(toolId(0,3),1);showToast('PAY-TO-WIN SWORD acquired! Damage: identical to a stick.');}
    if(key==='joke_loot'){
      const win=Math.random()<0.1;
      givePlayer(win?IT.DIAMOND:B.DIRT,1);
      burstParticles(P.x,P.y+1.5,P.z,win?B.DIA_ORE:B.DIRT,10,0.8);
      showToast(win?'LOOT BOX: \u2726 RARE DIAMOND \u2726 (0.0001% drop rate*)':'LOOT BOX: 1x Dirt. Better luck next purchase!');
      playS(win?'jackpot':'pop');
    }
    if(key==='joke_bpass'){P.bp=true;P.bpLvl=0;P.bpT=180;showToast('BATTLE PASS SEASON 1 ACTIVATED! Rewards every 3 minutes of your finite life.');playS('jackpot');}
    if(key==='joke_subbtn'){givePlayer(IT.SUBBTN,1);showToast('SUBSCRIBE BUTTON acquired! Ring the bell for... no, that one is DLC.');playS('jackpot');}
    if(key==='joke_terr'){givePlayer(B.TERM,1);showToast('DEEP DIRT 2D acquired! One (1) Gaming Rig added to your inventory. Games sold separately (this one is included).');playS('jackpot');}
    if(key==='joke_cine'){givePlayer(B.CINEMA,1);showToast('DINGLE CINEMA acquired! Place the kit and the building assembles itself. Union rules.');playS('jackpot');}
    renderStore();
    return true;
  }
  /* cosmetics */
  if(!P.own.includes(key)){
    if(P.db<it.price){showToast('Insufficient DingleBucks. Have you considered buying more DingleBucks?');playS('click');return false;}
    P.db-=it.price;
    P.own.push(key);
    showToast(it.name+' purchased! A real money-was-spent moment.');
    playS('jackpot');
  }
  if(it.kind==='hat')P.cos.hat=P.cos.hat===it.id?null:it.id;
  if(it.kind==='trail')P.cos.trail=P.cos.trail===it.id?null:it.id;
  renderStore();
  return true;
}
function buyDB(){
  if(invConsume(P.inv,IT.DIAMOND,10)){
    P.db+=1000;
    redrawHotbar();
    showToast('+1000 DingleBucks! BEST VALUE! Most popular! Everyone is doing this!');
    playS('jackpot');
  }else showToast('You need 10 diamonds. The DingleBucks economy thanks you for your interest.');
  renderStore();
}
function openStore(){
  if(!GR.store){if(typeof restorePause==='function')restorePause();return;}   /* the Dingle Store game rule */
  if(DIM==='puppet'){showToast('No crew on stage.');if(typeof restorePause==='function')restorePause();return;}
  storeOpen=true;
  const el=$('store');
  if(el)el.style.display='flex';
  renderStore();
}
function closeStore(){
  storeOpen=false;
  const el=$('store');
  if(el)el.style.display='none';
  restorePause();
}
function renderStore(){
  const bal=$('storedb');
  if(bal)bal.textContent=P.db+' DB';
  const list=$('storelist');
  if(!list)return;
  let h='';
  for(const it of STORE_CAT){
    const owned=P.own.includes(it.key);
    const eq=(it.kind==='hat'&&P.cos.hat===it.id)||(it.kind==='trail'&&P.cos.trail===it.id);
    let btn=owned?(it.kind==='joke'?'OWNED':(eq?'UNEQUIP':'EQUIP')):(it.price+' DB');
    if(it.key==='joke_bpass'&&owned)btn=P.bp?'PAUSE ⏸':'RESUME ▶';
    if(it.key==='joke_loot')btn=it.price+' DB';
    h+='<div class="sitem'+(eq?' eq':'')+'"><div class="sname">'+it.name+'</div><div class="sdesc">'+it.desc+'</div>'+
       '<button class="sbuy" data-k="'+it.key+'">'+btn+'</button></div>';
  }
  list.innerHTML=h;
  if(typeof list.querySelectorAll==='function'){
    for(const b of list.querySelectorAll('.sbuy'))
      b.onclick=()=>storeBuy(b.getAttribute('data-k'));
  }
}
{
  const sb=$('p_store');
  if(sb)sb.onclick=()=>{hidePause();openStore();};
  const sc=$('storeclose');
  if(sc)sc.onclick=()=>{closeStore();};
  const sdb=$('storebuydb');
  if(sdb)sdb.onclick=()=>{buyDB();};
}
/* ----- hats on the player model ----- */
function buildHat(kind){
  const G=new THREE.Group();
  G.name='hat';
  const m=c=>new THREE.MeshLambertMaterial({color:c});
  const bx=(w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m(c));
  if(kind==='tophat'){
    const brim=bx(0.62,0.05,0.62,0x18181c);G.add(brim);
    const top=bx(0.34,0.42,0.34,0x18181c);top.position.y=0.23;G.add(top);
    const band=bx(0.36,0.08,0.36,0x8f2222);band.position.y=0.07;G.add(band);
  }else if(kind==='cone'){
    for(let i=0;i<4;i++){
      const s=0.5-i*0.11;
      const seg=bx(s,0.12,s,i===2?0xffffff:0xff7a1a);
      seg.position.y=0.06+i*0.12;G.add(seg);
    }
  }else if(kind==='crown'){
    const band=bx(0.54,0.14,0.54,0xffd84d);band.position.y=0.07;G.add(band);
    for(const [px,pz] of [[-0.2,-0.2],[0.2,-0.2],[-0.2,0.2],[0.2,0.2]]){
      const sp=bx(0.1,0.18,0.1,0xffd84d);sp.position.set(px,0.21,pz);G.add(sp);
    }
    const gem=bx(0.09,0.09,0.05,0xe23b3b);gem.position.set(0,0.1,-0.28);G.add(gem);
  }else if(kind==='prop'){
    const cap=bx(0.5,0.16,0.5,0x2f6fdc);cap.position.y=0.08;G.add(cap);
    const axle=bx(0.05,0.14,0.05,0x999999);axle.position.y=0.22;G.add(axle);
    const spin=new THREE.Group();spin.name='hatspin';spin.position.y=0.3;
    const b1=bx(0.55,0.03,0.09,0xe23b3b);spin.add(b1);
    const b2=bx(0.09,0.03,0.55,0xffd84d);spin.add(b2);
    G.add(spin);
  }else if(kind==='horns'){
    for(const s of[-1,1]){
      let hx=s*0.2,hy=0.08,ang=s*0.5;
      for(let i=0;i<4;i++){
        const seg=bx(0.1-i*0.015,0.14,0.1-i*0.015,0x171114);
        seg.position.set(hx,hy,0);
        seg.rotation.z=ang;
        G.add(seg);
        ang+=s*0.3;hx+=s*0.07;hy+=0.11;
      }
    }
  }else if(kind==='halo'){
    const ring=new THREE.Group();ring.name='hathalo';ring.position.y=0.5;
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      const seg=bx(0.14,0.04,0.05,0xfff066);
      seg.position.set(Math.sin(a)*0.26,0,Math.cos(a)*0.26);
      seg.rotation.y=a;
      ring.add(seg);
    }
    G.add(ring);
  }
  G.position.y=0.27;
  return G;
}
function applyHat(M){
  const old=M.head.getObjectByName('hat');
  if(old)M.head.remove(old);
  M._hat=P.cos&&P.cos.hat||null;
  if(M._hat)M.head.add(buildHat(M._hat));
}
/* ----- trails ----- */
let trailT=0;
function tickTrail(dt){
  if(!P||P.dead||!P.cos||!P.cos.trail)return;
  const spd=Math.hypot(P.vx,P.vz);
  if(spd<3.4&&!P.ride)return;
  trailT-=dt;
  if(trailT>0)return;
  trailT=0.07;
  const kind=P.cos.trail;
  let col;
  if(kind==='rainbow'){
    const hues=[0xff4d4d,0xffb14d,0xfff04d,0x5fe05f,0x4da7ff,0xb44dff];
    col=hues[(frameCount/3|0)%hues.length];
  }else if(kind==='fire')col=Math.random()<0.5?0xff6a00:0xffb300;
  else col=0xff5fa2;
  const m=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,0.16),
    new THREE.MeshLambertMaterial({color:col,transparent:true,opacity:0.95}));
  m.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
  m.position.set(P.x+(Math.random()-0.5)*0.4,P.y+0.15,P.z+(Math.random()-0.5)*0.4);
  scene.add(m);
  entities.push({t:'puff',x:m.position.x,y:m.position.y,z:m.position.z,age:0,mesh:m,
    vy:kind==='hearts'?1.4:0.6});
}
function updatePuff(e,dt){
  e.age+=dt;
  e.y+=e.vy*dt;
  e.mesh.position.y=e.y;
  e.mesh.rotation.y+=dt*3;
  const k=1-e.age/0.7;
  const sc=Math.max(0.05,k);e.mesh.scale.set(sc,sc,sc);
  if(e.mesh.material)e.mesh.material.opacity=Math.max(0,k);
  if(e.age>0.7)removeEnt(e);
}
/* ----- battle pass ----- */
function tickBPass(dt){
  if(!P||!P.bp||P.dead||DIM==='puppet')return;
  P.bpT-=dt;
  if(P.bpT>0)return;
  P.bpT=180;
  P.bpLvl=(P.bpLvl|0)+1;
  givePlayer(B.DIRT,1);
  showToast('\u2b50 BATTLE PASS: LEVEL '+P.bpLvl+'! Reward: 1x Dirt. You earned this.');
  playS('jackpot');
}


