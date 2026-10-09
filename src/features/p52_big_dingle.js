/* PART 52 - THE BIG DINGLE (a very large mistake you can craft) */
B.BUNKER=97;B.BGLASS=98;
def(B.BUNKER,{name:'Bunkercrete',tiles:'bunk',hard:14,toolClass:'pick',req:true,tier:1});
def(B.BGLASS,{name:'Bunker Glass',tiles:'bglass',hard:8,opq:false,bucket:'cut',cullSame:true,toolClass:'pick'});
tile('bunk',c=>{c.fillStyle='#3a3f46';c.fillRect(0,0,16,16);
  c.fillStyle='#2c3037';c.fillRect(0,0,16,1);c.fillRect(0,8,16,1);c.fillRect(0,15,16,1);
  c.fillRect(7,1,1,7);c.fillRect(3,9,1,6);c.fillRect(11,9,1,6);
  c.fillStyle='#565d66';
  c.fillRect(1,2,1,1);c.fillRect(5,5,1,1);c.fillRect(9,3,1,1);c.fillRect(13,6,1,1);
  c.fillRect(1,13,1,1);c.fillRect(6,11,1,1);c.fillRect(13,12,1,1);
  c.fillStyle='#ffd24a';c.fillRect(7,11,2,2);});
tile('bglass',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='rgba(150,215,230,0.30)';c.fillRect(0,0,16,16);
  c.fillStyle='#4a5a66';c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);
  c.fillRect(0,0,1,16);c.fillRect(15,0,1,16);
  c.fillRect(0,7,16,2);c.fillRect(7,0,2,16);
  c.fillStyle='rgba(255,255,255,0.55)';c.fillRect(2,2,1,3);c.fillRect(3,2,1,1);
  c.fillRect(11,10,1,3);c.fillRect(12,10,1,1);});
IT.NUKE=282;
idef(IT.NUKE,{name:'The Big Dingle',icon:'i_nuke',stack:1});
tile('i_nuke',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#23252c';c.fillRect(5,2,6,10);c.fillRect(6,1,4,1);
  c.fillStyle='#31343d';c.fillRect(6,2,2,9);
  c.fillStyle='#b8322a';c.fillRect(4,12,2,3);c.fillRect(10,12,2,3);c.fillRect(7,12,2,2);
  c.fillStyle='#ffd24a';c.fillRect(6,5,4,4);
  c.fillStyle='#23252c';c.fillRect(7,6,2,2);c.fillRect(7,5,2,1);});
RS([B.TNT,B.TNT,B.TNT,B.TNT,IT.DIAMOND,IT.DIAMOND,IT.GUNPOWDER,IT.GUNPOWDER,B.GLOWSTONE],IT.NUKE,1);
RS([B.STONE,B.STONE,B.STONE,IT.IRON],B.BUNKER,8);
RS([B.BUNKER,B.GLASS],B.BGLASS,4);

const NUKES=[];
const NARM={t:0,e:null,sir:0};
const NK_FULL=42,NK_RIM=58,NK_KILL=128;
function nkFloorY(d){return d<=NK_FULL?0:Math.round(46*Math.pow((d-NK_FULL)/(NK_RIM-NK_FULL),1.7));}
function craterHits(wx,wy,wz,n){
  const d=Math.hypot(wx+0.5-n.x,wz+0.5-n.z);
  if(d>NK_RIM)return false;
  return wy>=nkFloorY(d);
}
function nkCarve(bl,x0,z0,n){
  let any=false;
  for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){
    const d=Math.hypot(x0+lx+0.5-n.x,z0+lz+0.5-n.z);
    if(d>NK_RIM)continue;
    if(mgCraterSkip(x0+lx,z0+lz))continue;
    for(let y=nkFloorY(d);y<WH;y++){
      const i=bidx(lx,y,lz);
      const id=bl[i];
      if(id===B.AIR||id===B.BUNKER||id===B.BGLASS)continue;
      bl[i]=B.AIR;any=true;
    }
  }
  return any;
}
function applyCraters(bl,ed,cx,cz){
  if(!NUKES.length)return;
  const x0=cx*CH,z0=cz*CH;
  for(const n of NUKES){
    if(n.d!==DIM)continue;
    if(x0>n.x+NK_RIM||x0+CH<n.x-NK_RIM||z0>n.z+NK_RIM||z0+CH<n.z-NK_RIM)continue;
    for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){
      const d=Math.hypot(x0+lx+0.5-n.x,z0+lz+0.5-n.z);
      if(d>NK_RIM)continue;
      if(mgCraterSkip(x0+lx,z0+lz))continue;
      for(let y=nkFloorY(d);y<WH;y++){
        const i=bidx(lx,y,lz);
        const id=bl[i];
        if(id===B.AIR||id===B.BUNKER||id===B.BGLASS)continue;
        if(ed.has(lx+','+y+','+lz))continue;
        bl[i]=B.AIR;
      }
    }
  }
}
/* completely enclosed by bunker material = the blast cannot reach you */
function nukeSealed(){
  const sx=Math.floor(P.x),sy=Math.floor(P.y+1),sz=Math.floor(P.z);
  const q=[[sx,sy,sz]],seen=new Set([sx+','+sy+','+sz]);
  let n=0;
  while(q.length){
    if(++n>1400)return false;
    const c=q.pop();
    if(Math.abs(c[0]-sx)+Math.abs(c[1]-sy)+Math.abs(c[2]-sz)>30)return false;
    for(const o of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
      const nx=c[0]+o[0],ny=c[1]+o[1],nz=c[2]+o[2];
      if(ny>=WH)return false;
      if(ny<0)continue;
      const k=nx+','+ny+','+nz;
      if(seen.has(k))continue;
      const id=getBlock(nx,ny,nz);
      if(id===B.BUNKER||id===B.BGLASS)continue;
      const dd=DEFS[id];
      if(id===B.AIR||(dd&&dd.solid===false)||id===B.WATER){seen.add(k);q.push([nx,ny,nz]);}
      else return false;
    }
  }
  return true;
}
function mkBombMesh(){
  const G=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.95,0.5),
    new THREE.MeshLambertMaterial({color:0x23252c}));
  G.add(body);
  const nose=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.25,0.36),
    new THREE.MeshLambertMaterial({color:0x31343d}));
  nose.position.y=-0.58;G.add(nose);
  const band=new THREE.Mesh(new THREE.BoxGeometry(0.54,0.16,0.54),
    new THREE.MeshBasicMaterial({color:0xffd24a}));
  band.position.y=0.1;G.add(band);
  for(const a of [0,1,2,3]){
    const fin=new THREE.Mesh(new THREE.BoxGeometry(a%2?0.06:0.7,0.34,a%2?0.7:0.06),
      new THREE.MeshLambertMaterial({color:0xb8322a}));
    fin.position.y=0.6;G.add(fin);
  }
  return G;
}
function spawnABomb(x,y,z,vx,vz){
  const G=mkBombMesh();
  scene.add(G);
  entities.push({t:'abomb',x,y,z,vx:vx||0,vy:0,vz:vz||0,hw:0.3,h:0.8,
    onGround:false,spin:0,mesh:G});
}
function updateBomb(e,dt){
  e.vy-=GRAV*dt*0.75;
  if(e.vy<-38)e.vy=-38;
  moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(e.onGround){e.vx*=0.6;e.vz*=0.6;}
  e.spin+=dt;
  e.mesh.position.set(e.x,e.y+0.45,e.z);
  e.mesh.rotation.y=e.spin*0.7;
}
function nukeDrop(){
  if(!P.ride||P.ride.t!=='plane'){
    showToast('Air delivery only — it says so on the sticker. Craft a plane.');
    return false;
  }
  if(NARM.e){showToast('One apocalypse at a time.');return false;}
  const st=heldStack();
  if(!st||st.id!==IT.NUKE)return false;
  if(P.mode!=='c'){st.count--;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();}
  const c=P.ride;
  spawnABomb(c.x,c.y-0.4,c.z,c.vx*0.5,c.vz*0.5);
  NARM.e=entities[entities.length-1];
  NARM.t=20;NARM.sir=0;
  playS('planedrop');
  showToast('Bombs away. You have 20 seconds to be somewhere else.');
  return true;
}
function nukeHud(t){
  const el=$('nuket');
  if(!el)return;
  if(t<0){el.style.display='none';return;}
  el.style.display='block';
  el.textContent='☢ '+Math.max(0,Math.ceil(t));
  el.style.color=t<=5.5?'#ff2f22':'#ffd24a';
}
function tickMega(dt){
  if(!NARM.e)return;
  if(NARM.e.dead||entities.indexOf(NARM.e)<0){NARM.e=null;nukeHud(-1);return;}
  const prev=Math.ceil(NARM.t);
  NARM.t-=dt;
  const now=Math.ceil(NARM.t);
  if(now!==prev&&now>0)playS(now<=5?'ntickf':'ntick');
  NARM.sir-=dt;
  if(NARM.sir<=0){NARM.sir=2.4;playS('siren');}
  nukeHud(NARM.t);
  if(NARM.t<=0){
    const b=NARM.e;
    NARM.e=null;nukeHud(-1);
    removeEnt(b);
    megaNuke(b.x,b.y+0.5,b.z);
  }
}
function megaNuke(x,y,z){
  const n={x:Math.round(x),y:Math.round(y),z:Math.round(z),d:DIM};
  NUKES.push(n);
  /* the crater: everything to the void. bunkercrete politely declines. */
  const cx0=Math.floor((x-NK_RIM)/CH),cx1=Math.floor((x+NK_RIM)/CH);
  const cz0=Math.floor((z-NK_RIM)/CH),cz1=Math.floor((z+NK_RIM)/CH);
  for(let ccx=cx0;ccx<=cx1;ccx++)for(let ccz=cz0;ccz<=cz1;ccz++){
    const ch=chunks.get(ckey(ccx,ccz));
    if(!ch)continue;
    if(nkCarve(ch.bl,ccx*CH,ccz*CH,n)){
      ch.dirty=true;
      markDirty(ccx-1,ccz);markDirty(ccx+1,ccz);markDirty(ccx,ccz-1);markDirty(ccx,ccz+1);
    }
  }
  /* pre-war edits inside the crater die with it (bunker edits stay) */
  for(const [k,ed] of chunkEdits){
    if(keyDim(k)!==DIM)continue;
    const cc=keyCore(k).split(',');
    const bx0=+cc[0]*CH,bz0=+cc[1]*CH;
    if(bx0>n.x+NK_RIM||bx0+CH<n.x-NK_RIM||bz0>n.z+NK_RIM||bz0+CH<n.z-NK_RIM)continue;
    for(const [lk,id] of [...ed]){
      if(id===B.BUNKER||id===B.BGLASS)continue;
      const p=lk.split(',');
      if(craterHits(bx0+ +p[0],+p[1],bz0+ +p[2],n))ed.delete(lk);
    }
  }
  /* furniture, torches, fires, lawns, spawners: vaporized */
  for(const M of [blockEnts,LWN,SPW,fires]){
    for(const k of [...M.keys()]){
      const p=dimP(k);
      if(p&&craterHits(+p[0],+p[1],+p[2],n))M.delete(k);
    }
  }
  for(const k of [...torches]){
    const p=dimP(k);
    if(p&&craterHits(+p[0],+p[1],+p[2],n))torches.delete(k);
  }
  /* everything that breathes within eight chunks stops doing that */
  if(P&&!P.dead){
    const pd=Math.hypot(P.x-x,(P.y+0.9)-y,P.z-z);
    if(pd<NK_KILL&&!GR.god){
      if(nukeSealed())showToast('The bunker holds. Outside, nothing else did.');
      else{
        P.hurtT=0;
        damagePlayer(pd<118?9999:Math.max(2,Math.round(14-(pd-118)*1.2)),(P.x-x)||0.1,(P.z-z)||0.1);
      }
    }
  }
  for(const o of entities.slice()){
    if(o.dead)continue;
    const od=Math.hypot(o.x-x,(o.y-y)||0,o.z-z);
    if(o.t==='mob'&&od<NK_KILL){o.hurtT=0;hurtMob(o,99999,(o.x-x)||0.1,(o.z-z)||0.1);}
    else if((o.t==='car'||o.t==='skate'||o.t==='cart'||o.t==='boat'||o.t==='plane')&&od<NK_KILL)hitCar(o,99999);
    else if((o.t==='drop'||o.t==='ball')&&od<NK_RIM+4&&!crKeepDrop(o))removeEnt(o);
  }
  /* the show */
  NUKE.flash=1.8;
  nukeShake(3.6,7);
  playS('meganuke');
  spawnMcloud(x,Math.max(2,y),z);
}
function spawnMcloud(x,y,z){
  const G=new THREE.Group();
  G.position.set(x,y,z);
  if(G.frustumCulled!==undefined)G.frustumCulled=false;
  const puffs=[];
  const sg=new THREE.SphereGeometry(1,7,6);
  function puff(role,i,tot){
    const m=new THREE.Mesh(sg,new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0,fog:false}));
    m.frustumCulled=false;
    G.add(m);
    puffs.push({m,role,i,tot,ph:(i*2.399)%6.283});
  }
  for(let i=0;i<10;i++)puff('ball',i,10);
  for(let i=0;i<22;i++)puff('col',i,22);
  for(let i=0;i<26;i++)puff('cap',i,26);
  scene.add(G);
  entities.push({t:'mcloud',x,y,z,age:0,mesh:G,puffs,snd:0});
}
function mcTint(m,r,g,b){
  const c=m.material&&m.material.color;
  if(c&&c.setRGB)c.setRGB(r,g,b);
}
function updateMcloud(e,dt){
  e.age+=dt;
  const a=e.age;
  if(a>1.4&&e.snd<1){e.snd=1;playS('boom');playS('rumble');}
  if(a>4&&e.snd<2){e.snd=2;playS('meganuke');}
  if(a>9&&e.snd<3){e.snd=3;playS('rumble');}
  const grow=Math.min(1,a/26);
  const capY=14+64*Math.min(1,a/22);
  const fade=a>72?Math.max(0,1-(a-72)/16):1;
  for(const p of e.puffs){
    const m=p.m,f=p.i/p.tot;
    if(p.role==='ball'){
      const s=2+Math.min(a,3)*9;
      m.scale.set(s,s,s);
      m.position.set(Math.sin(p.ph)*s*0.25,s*0.4+Math.sin(p.ph*2)*s*0.15,Math.cos(p.ph)*s*0.25);
      const heat=Math.max(0,1-a/7);
      mcTint(m,1,0.32+0.65*heat,0.12+0.8*heat*heat);
      if(m.material)m.material.opacity=Math.max(0,1-a/9)*fade;
    }else if(p.role==='col'){
      const h=f*capY;
      const r=(5.5+3*Math.sin(p.ph+f*9))*(0.5+grow*0.7);
      const s=(6+f*5)*(0.35+grow);
      m.position.set(Math.sin(p.ph+a*0.14)*r*0.4,h,Math.cos(p.ph+a*0.14)*r*0.4);
      m.scale.set(s,s*1.15,s);
      const g=0.34+0.2*Math.sin(p.ph);
      const heat=Math.max(0,1-a/10)*Math.max(0,1-f);
      mcTint(m,Math.min(1,g+heat*0.7),g*0.92+heat*0.35,g*0.86);
      if(m.material)m.material.opacity=0.9*fade*Math.min(1,a*0.8);
    }else{
      const R=(8+38*Math.min(1,a/30))*(0.3+0.7*Math.min(1,a/9));
      const ang=p.ph+a*0.05;
      const rr=R*(0.35+0.65*f);
      m.position.set(Math.sin(ang)*rr,capY+Math.sin(p.ph*3+a*0.2)*3+(1-f)*6,Math.cos(ang)*rr);
      const s=10+9*(1-f)+3*Math.sin(a*0.3+p.ph);
      m.scale.set(s,s*0.72,s);
      const g=0.4+0.18*Math.sin(p.ph*2);
      const heat=Math.max(0,1-a/12)*0.5*(1-f);
      mcTint(m,Math.min(1,g+heat),g*0.94+heat*0.4,g*0.9);
      if(m.material)m.material.opacity=0.92*fade*Math.min(1,Math.max(0,a-1.5)*0.5);
    }
  }
  if(a>88){
    scene.remove(e.mesh);
    removeEnt(e);
  }
}
/* the sounds of the end of the world */
const _pS52=playS;
playS=function(n){
  if(!soundOn)return;
  try{
    switch(n){
      case 'ntick':    tone(1180,1170,0.06,'square',0.2);return;
      case 'ntickf':   tone(1560,1550,0.05,'square',0.24);return;
      case 'siren':    tone(520,880,0.9,'sawtooth',0.09);tone(392,660,0.9,'sawtooth',0.07);return;
      case 'planedrop':noiseS(0.5,0.2,700,90,true);tone(320,60,0.5,'sine',0.18);return;
      case 'meganuke': noiseS(3.5,0.9,900,40);tone(36,22,3.2,'sine',0.65);
                       tone(52,30,2.4,'triangle',0.4);noiseS(6,0.5,300,30);return;
      default:_pS52(n);
    }
  }catch(e){}
};

