/* ===================================================================== */
/* PART 15 — rails, carts, theme parks, disaster chooser  (v1.8)         */
/* ===================================================================== */
/* ----- rails ----- */
B.RAIL=68;B.RAILUP=69;
def(B.RAIL,{name:'Coaster Rail',tiles:'rail',hard:0.7,solid:false,opq:false,bucket:'cut',rail:true});
for(let di=0;di<4;di++){
  def(B.RAILUP+di,{name:'Sloped Rail',tiles:'railup',hard:0.7,solid:false,opq:false,bucket:'cut',
    railup:true,ramp:DOORD[di],drop:B.RAILUP,hide:di>0});
}
tile('rail',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#7a5232';for(let y=1;y<16;y+=4)c.fillRect(0,y,16,2);
  c.fillStyle='#b9bec7';c.fillRect(3,0,2,16);c.fillRect(11,0,2,16);
  c.fillStyle='#e6eaef';c.fillRect(3,0,1,16);c.fillRect(11,0,1,16);});
tile('railup',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#7a5232';for(let y=0;y<16;y+=3)c.fillRect(0,y,16,2);
  c.fillStyle='#b9bec7';c.fillRect(3,0,2,16);c.fillRect(11,0,2,16);
  c.fillStyle='#e6eaef';c.fillRect(3,0,1,16);c.fillRect(11,0,1,16);});
IT.CART=221;
idef(IT.CART,{name:'Coaster Cart',icon:'i_cart',stack:1,cart:true});
tile('i_cart',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#b03a3a';c.fillRect(2,5,12,6);
  c.fillStyle='#d65454';c.fillRect(2,5,12,2);
  c.fillStyle='#2b2b30';c.fillRect(3,11,3,3);c.fillRect(10,11,3,3);
  c.fillStyle='#ffe34d';c.fillRect(3,6,2,2);});
R(['I I','ISI','I I'],{I:IT.IRON,S:IT.STICK},B.RAIL,12);
R(['R','M'],{R:B.RAIL,M:B.RAMP},B.RAILUP,1);
R(['I I','III'],{I:IT.IRON},IT.CART,1);

const railFam=id=>id===B.RAIL||(id>=B.RAILUP&&id<B.RAILUP+4);
function addRail(b,x,y,z,gb){
  const U=tileUV(Tl.rail),u0=U[0],v0=U[1],u1=U[2],v1=U[3];
  const xAx=railFam(gb(x+1,y,z))||railFam(gb(x-1,y,z))||railFam(gb(x+1,y-1,z))||railFam(gb(x-1,y-1,z))||railFam(gb(x+1,y+1,z))||railFam(gb(x-1,y+1,z));
  const zAx=railFam(gb(x,y,z+1))||railFam(gb(x,y,z-1))||railFam(gb(x,y-1,z+1))||railFam(gb(x,y-1,z-1))||railFam(gb(x,y+1,z+1))||railFam(gb(x,y+1,z-1));
  const quads=[];
  if(xAx||!zAx)quads.push(0);
  if(zAx)quads.push(1);
  let off=0;
  for(const q of quads){
    const yy=y+0.06+off;off+=0.006;
    const s=b.vc;
    if(q===0){ /* runs along x: stripes (v-axis bars) must lie across z */
      b.p.push(x,yy,z, x+1,yy,z, x+1,yy,z+1, x,yy,z+1);
      b.u.push(u0,v0, u0,v1, u1,v1, u1,v0);
    }else{
      b.p.push(x,yy,z, x+1,yy,z, x+1,yy,z+1, x,yy,z+1);
      b.u.push(u0,v0, u1,v0, u1,v1, u0,v1);
    }
    for(let i=0;i<4;i++){b.n.push(0,1,0);b.c.push(.95,.95,.95);}
    b.ix.push(s,s+1,s+2,s,s+2,s+3);
    b.vc+=4;
  }
}
function addRailUp(b,x,y,z,d){
  const U=tileUV(Tl.railup),u0=U[0],v0=U[1],u1=U[2],v1=U[3];
  const nx=d.ramp[0],nz=d.ramp[1],tx=-nz,tz=nx;
  const cx=x+0.5,cz=z+0.5;
  const lo=[cx-nx*0.5,cz-nz*0.5],hi=[cx+nx*0.5,cz+nz*0.5];
  const V=(px,py,pz,u,v)=>{b.p.push(px,py,pz);b.n.push(0,1,0);b.u.push(u,v);b.c.push(.95,.95,.95);};
  const s=b.vc;
  V(lo[0]-tx*0.5,y+0.06,  lo[1]-tz*0.5,u0,v1);
  V(lo[0]+tx*0.5,y+0.06,  lo[1]+tz*0.5,u1,v1);
  V(hi[0]+tx*0.5,y+1.06,hi[1]+tz*0.5,u1,v0);
  V(hi[0]-tx*0.5,y+1.06,hi[1]-tz*0.5,u0,v0);
  b.ix.push(s,s+1,s+2,s,s+2,s+3);
  b.vc+=4;
}

/* ----- the cart ----- */
function railAt(x,y,z){
  const id=getBlock(x,y,z);
  if(id===B.RAIL)return {f:1};
  if(id>=B.RAILUP&&id<B.RAILUP+4)return {f:2,r:DEFS[id].ramp};
  return null;
}
function mkCartMesh(){
  const G=new THREE.Group(),mats=[];
  const reg=m=>{mats.push(m.material);return m;};
  const body=reg(boxMesh(0.84,0.42,1.15,'#b03a3a'));body.position.y=0.34;G.add(body);
  const rim=reg(boxMesh(0.9,0.1,1.2,'#d65454'));rim.position.y=0.56;G.add(rim);
  const seat=reg(boxMesh(0.6,0.1,0.7,'#3a3a42'));seat.position.set(0,0.36,0.05);G.add(seat);
  const wheels=[];
  for(const sx of[-1,1])for(const sz of[-1,1]){
    const w=reg(boxMesh(0.16,0.28,0.28,'#2b2b30'));
    w.position.set(sx*0.42,0.14,sz*0.42);G.add(w);wheels.push(w);
  }
  return {G,mats,wheels};
}
function spawnCart(x,y,z,yaw){
  const {G,mats,wheels}=mkCartMesh();
  scene.add(G);
  const e={t:'cart',hp:8,hw:0.45,h:0.6,x,y,z,vx:0,vy:0,vz:0,yaw:yaw||0,spd:0,
    free:true,cell:null,dirx:0,dirz:1,tr:0.5,seatY:0.42,eyeH:1.05,
    onGround:false,hurtT:0,rattleT:0,mesh:G,mats,wheels};
  entities.push(e);
  cartAttach(e);
}
function cartAttach(e){
  const fx=Math.floor(e.x),fz=Math.floor(e.z);
  for(const oy of [0,-1]){
    const fy=Math.floor(e.y+0.05)+oy;
    if(railAt(fx,fy,fz)){
      e.free=false;e.cell=[fx,fy,fz];
      if(Math.abs(Math.sin(e.yaw))>Math.abs(Math.cos(e.yaw))){
        e.dirx=Math.sin(e.yaw)>0?-1:1;e.dirz=0;
      }else{e.dirx=0;e.dirz=Math.cos(e.yaw)>0?-1:1;}
      const t=e.dirx!==0?(e.dirx>0?e.x-fx:fx+1-e.x):(e.dirz>0?e.z-fz:fz+1-e.z);
      e.tr=clamp(t,0.05,0.95);
      const hsp=Math.hypot(e.vx,e.vz);
      e.spd=Math.max(e.spd,hsp*0.9);
      e.vx=e.vy=e.vz=0;
      return true;
    }
  }
  return false;
}
function cartNext(e){
  const [cx,cy,cz]=e.cell,dx=e.dirx,dz=e.dirz;
  let r;
  /* straight ahead, level */
  r=railAt(cx+dx,cy,cz+dz);
  if(r&&(r.f===1||(r.r[0]===dx&&r.r[1]===dz)||(r.r[0]===-dx&&r.r[1]===-dz)))
    return {cell:[cx+dx,cy,cz+dz],dx,dz};
  /* topped a climb */
  r=railAt(cx+dx,cy+1,cz+dz);
  if(r){
    const cur=railAt(cx,cy,cz);
    if(cur&&cur.f===2&&cur.r[0]===dx&&cur.r[1]===dz)
      return {cell:[cx+dx,cy+1,cz+dz],dx,dz};
  }
  /* start descending */
  r=railAt(cx+dx,cy-1,cz+dz);
  if(r&&r.f===2&&r.r[0]===-dx&&r.r[1]===-dz)
    return {cell:[cx+dx,cy-1,cz+dz],dx,dz};
  if(r&&r.f===1){
    const cur=railAt(cx,cy,cz);
    if(cur&&cur.f===2&&cur.r[0]===-dx&&cur.r[1]===-dz)
      return {cell:[cx+dx,cy-1,cz+dz],dx,dz};
  }
  /* 90-degree turns */
  for(const [lx,lz] of [[-dz,dx],[dz,-dx]]){
    r=railAt(cx+lx,cy,cz+lz);
    if(r&&r.f===1)return {cell:[cx,cy,cz],dx:lx,dz:lz,turn:true};
  }
  return null;
}
function cartY(e){
  const ri=rampInfo(e.x,e.y+0.2,e.z);
  if(ri)return ri.rf+0.1;
  return e.cell[1]+0.15;
}
function updateCart(e,dt){
  if(!chunkAt(Math.floor(e.x),Math.floor(e.z)))return;
  e.hurtT=Math.max(0,e.hurtT-dt);
  if(e.hurtT<0.15)for(const m of e.mats)m.emissive&&m.emissive.setRGB(0,0,0);
  const ridden=P&&P.ride===e&&!P.dead;
  if(e.free){
    e.vy-=GRAV*dt;
    if(e.vy<-45)e.vy=-45;
    moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
    if(e.onGround){e.vx*=Math.exp(-dt*4);e.vz*=Math.exp(-dt*4);}
    if(e.vy<=0&&cartAttach(e)){playS('thud');}
    /* nudge a parked cart by walking into it */
    if(!ridden&&P&&!P.dead&&!P.ride&&e.onGround){
      const px=Math.abs(P.x-e.x),pz=Math.abs(P.z-e.z);
      if(px<P.hw+e.hw&&pz<P.hw+e.hw&&P.y<e.y+0.8&&P.y+1.6>e.y){
        const ddx=e.x-P.x,ddz=e.z-P.z,dd=Math.hypot(ddx,ddz)||0.01;
        e.vx=ddx/dd*2.4;e.vz=ddz/dd*2.4;
      }
    }
  }else{
    /* on the track */
    let f=0;
    if(ridden&&!modalOpen()&&!paused)
      f=clamp((KEY.KeyW?1:0)-(KEY.KeyS?1:0)+TOUCH.f,-1,1);
    const cur=railAt(e.cell[0],e.cell[1],e.cell[2]);
    if(!cur){e.free=true;e.vx=e.dirx*e.spd;e.vz=e.dirz*e.spd;e.vy=0;}
    else{
      if(cur.f===2){
        const along=e.dirx*cur.r[0]+e.dirz*cur.r[1];
        e.spd-=along*GRAV*0.5*dt;
        if(along>0&&e.spd<3)e.spd=lerp(e.spd,3,1-Math.exp(-dt*5)); /* chain lift */
      }else{
        e.spd*=Math.exp(-dt*0.06);
      }
      if(f>0)e.spd=Math.min(e.spd+4.5*dt,Math.max(e.spd,4));
      if(f<0)e.spd*=Math.exp(-dt*6);
      if(e.spd<0){e.spd=-e.spd;e.dirx*=-1;e.dirz*=-1;e.tr=1-e.tr;}
      e.spd=Math.min(e.spd,16);
      e.tr+=e.spd*dt;
      let guard=0;
      while(e.tr>=1&&guard++<4){
        const nx=cartNext(e);
        if(!nx){
          /* end of the line: take flight */
          const c2=railAt(e.cell[0],e.cell[1],e.cell[2]);
          e.free=true;
          e.vx=e.dirx*e.spd;e.vz=e.dirz*e.spd;
          e.vy=(c2&&c2.f===2)?-(e.dirx*c2.r[0]+e.dirz*c2.r[1])*e.spd*0.8:1.2;
          if(ridden&&e.spd>6)playS('ollie');
          break;
        }
        if(nx.turn){
          e.dirx=nx.dx;e.dirz=nx.dz;
          e.tr=0.5;
          e.spd*=0.96;
        }else{
          e.tr-=1;
          e.cell=nx.cell;
          e.dirx=nx.dx;e.dirz=nx.dz;
        }
      }
      if(!e.free){
        const [cx,cy,cz]=e.cell;
        e.x=(cx+0.5)+e.dirx*(e.tr-0.5);
        e.z=(cz+0.5)+e.dirz*(e.tr-0.5);
        e.y=cartY(e);
        e.rattleT-=dt;
        if(Math.abs(e.spd)>2&&e.rattleT<=0){e.rattleT=0.9/Math.max(1,Math.abs(e.spd)*0.3);playS('rattle');}
      }
    }
  }
  /* visuals */
  const wantYaw=Math.atan2(-e.dirx,-e.dirz);
  e.yaw+=(((wantYaw-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI)*Math.min(1,dt*10);
  for(const w of e.wheels)w.rotation.x-=e.spd*dt*4;
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.y=e.yaw;
  if(e.y<-40)removeEnt(e);
}

/* ----- theme parks ----- */
const PGRID=176;
const PSEEN=new Set();
const PLAY_=new Map();
const PPEND=[];
function pCell(gx,gz){
  if(h2(gx*11+7,gz*11-3,SEED+7878)>0.34)return null;
  const ox=40+Math.floor(h2(gx,gz,SEED+7979)*(PGRID-80));
  const oz=40+Math.floor(h2(gx,gz,SEED+8080)*(PGRID-80));
  const cx=gx*PGRID+ox,cz=gz*PGRID+oz;
  const ci=colInfo(cx,cz);
  if(ci.h<SEA+2||ci.h>WH-26||ci.b===BIOME.OCEAN)return null;
  if(mgNoStruct(cx,cz))return null;
  return {id:gx+','+gz,cx,cz,gy:ci.h};
}
function parkLayout(px,pz,gy){
  const bl=new Map();
  const put=(x,y,z,id)=>{if(y>0&&y<WH)bl.set(x+','+y+','+z,id);};
  /* flatten */
  for(let dx=-23;dx<=23;dx++)for(let dz=-23;dz<=23;dz++){
    const d=Math.hypot(dx,dz);
    if(d>23)continue;
    const x=px+dx,z=pz+dz;
    for(let y=gy-3;y<=gy-1;y++)put(x,y,z,B.DIRT);
    put(x,gy,z,B.GRASS);
    for(let y=gy+1;y<=gy+12;y++)put(x,y,z,B.AIR);
  }
  const sup=(x,z,topY)=>{for(let y=gy+1;y<topY;y++)put(x,y,z,B.PLANK_S);};
  const rails=[];
  const flat=(x,y,z)=>rails.push([x,y,z,B.RAIL]);
  const up=(x,y,z,di)=>rails.push([x,y,z,B.RAILUP+di]);
  /* station straight */
  for(let i=0;i<12;i++)flat(px-10+i,gy+1,pz-8);
  /* lift hill (+x ascending) */
  for(let i=0;i<8;i++){up(px+2+i,gy+1+i,pz-8,0);if(i%2===0)sup(px+2+i,pz-8,gy+1+i);}
  flat(px+10,gy+9,pz-8);sup(px+10,pz-8,gy+9);
  /* the big drop */
  for(let i=0;i<8;i++){up(px+11+i,gy+8-i,pz-8,1);if(i%2===1)sup(px+11+i,pz-8,gy+8-i);}
  flat(px+19,gy+1,pz-8);
  flat(px+20,gy+1,pz-8); /* corner -> +z */
  /* right lane with a bump */
  for(let z=pz-7;z<=pz-3;z++)flat(px+20,gy+1,z);
  up(px+20,gy+1,pz-2,2);up(px+20,gy+2,pz-1,2);
  flat(px+20,gy+3,pz);sup(px+20,pz,gy+3);
  up(px+20,gy+2,pz+1,3);up(px+20,gy+1,pz+2,3);
  for(let z=pz+3;z<=pz+8;z++)flat(px+20,gy+1,z);
  flat(px+20,gy+1,pz+9); /* corner -> -x */
  for(let x=px+19;x>=px-10;x--)flat(x,gy+1,pz+9);
  flat(px-11,gy+1,pz+9); /* corner -> -z */
  for(let z=pz+8;z>=pz-7;z--)flat(px-11,gy+1,z);
  flat(px-11,gy+1,pz-8); /* corner -> +x, closes the circuit */
  for(const r of rails)put(r[0],r[1],r[2],r[3]);
  /* station platform + ticket hut */
  for(let x=px-11;x<=px+2;x++)for(let z=pz-10;z<=pz-9;z++)put(x,gy,z,B.PLANK_O);
  for(let dx=0;dx<4;dx++)for(let dz=0;dz<4;dz++){
    const hx=px-16+dx,hz=pz-13+dz;
    put(hx,gy,hz,B.PLANK_O);
    const ring=dx===0||dx===3||dz===0||dz===3;
    for(let y=gy+1;y<=gy+3;y++)put(hx,y,hz,ring?B.PLANK_B:B.AIR);
    put(hx,gy+4,hz,B.PLANK_B);
  }
  put(px-13,gy+1,pz-13,B.AIR);put(px-13,gy+2,pz-13,B.AIR); /* hut doorway */
  put(px-14,gy+4,pz-12,B.TORCH);
  /* snack stall */
  for(const [sx,sz] of [[px+7,pz-14],[px+10,pz-14],[px+7,pz-11],[px+10,pz-11]]){
    put(sx,gy+1,sz,B.LOG_O);put(sx,gy+2,sz,B.LOG_O);
  }
  for(let dx=0;dx<=3;dx++)for(let dz=0;dz<=3;dz++)
    put(px+7+dx,gy+3,pz-14+dz,B.WOOL);
  put(px+8,gy+1,pz-13,B.CRAFT);
  /* carousel of torch posts */
  for(let i=0;i<8;i++){
    const a=i/8*6.283;
    const tx=px+6+Math.round(Math.sin(a)*4),tz=pz+14+Math.round(Math.cos(a)*4);
    put(tx,gy+1,tz,B.LOG_B);put(tx,gy+2,tz,B.LOG_B);put(tx,gy+3,tz,B.TORCH);
  }
  /* perimeter torches */
  for(let i=0;i<8;i++){
    const a=i/8*6.283;
    const tx=px+Math.round(Math.sin(a)*21),tz=pz+Math.round(Math.cos(a)*21);
    put(tx,gy+1,tz,B.LOG_S);put(tx,gy+2,tz,B.TORCH);
  }
  return {bl,carts:[[px-9+0.5,gy+1.2,pz-8+0.5],[px-6+0.5,gy+1.2,pz-8+0.5]]};
}
function parkLay(v){
  let lay=PLAY_.get(v.id);
  if(!lay){lay=parkLayout(v.cx,v.cz,v.gy);PLAY_.set(v.id,lay);}
  return lay;
}
function stampParks(blocks,x0,z0){
  const g0x=Math.floor((x0-48)/PGRID),g1x=Math.floor((x0+CH+48)/PGRID);
  const g0z=Math.floor((z0-48)/PGRID),g1z=Math.floor((z0+CH+48)/PGRID);
  for(let gx=g0x;gx<=g1x;gx++)for(let gz=g0z;gz<=g1z;gz++){
    const v=pCell(gx,gz);
    if(!v)continue;
    if(v.cx+24<x0||v.cx-24>=x0+CH||v.cz+24<z0||v.cz-24>=z0+CH)continue;
    const lay=parkLay(v);
    for(const [k,id] of lay.bl){
      const p=k.split(',');
      const wx=+p[0],y=+p[1],wz=+p[2];
      if(wx<x0||wx>=x0+CH||wz<z0||wz>=z0+CH)continue;
      blocks[bidx(wx-x0,y,wz-z0)]=id;
      if(id===B.TORCH)torches.add(bkey(wx,y,wz));
    }
    if(v.cx>=x0&&v.cx<x0+CH&&v.cz>=z0&&v.cz<z0+CH&&!PSEEN.has(v.id))
      PPEND.push(v);
  }
}
function processParks(dt){
  while(PPEND.length){
    const v=PPEND.pop();
    if(PSEEN.has(v.id))continue;
    PSEEN.add(v.id);
    const lay=parkLay(v);
    for(const c of lay.carts)spawnCart(c[0],c[1],c[2],-Math.PI/2);
  }
}

/* ----- disaster chooser ----- */
let dselOpen=false;
function dselWire(){
  if(dselWire.done)return;
  dselWire.done=true;
  const w=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
  w('dselT',()=>dselPick('tornado'));
  w('dselW',()=>dselPick('tsunami'));
  w('dselV',()=>dselPick('volcano'));
  w('dselF',()=>dselPick('fire'));
  w('dselC',closeDSel);
}
function openDSel(){
  if(dselOpen)return;
  dselOpen=true;
  dselWire();
  const el=$('dsel');if(el)el.style.display='flex';
  document.exitPointerLock&&document.exitPointerLock();
  MB.l=MB.r=false;
  playS('dsph');
}
function closeDSel(){
  if(!dselOpen)return;
  dselOpen=false;
  const el=$('dsel');if(el)el.style.display='none';
  tryLock();
}
function dselPick(kind){
  if(!dselOpen)return;
  if(DIS.kind){closeDSel();showToast('A disaster is already raging!');return;}
  if(P.mode!=='c'){
    if(invCount(P.inv,IT.DSPH)<1){closeDSel();showToast('The sphere is gone!');return;}
    invConsume(P.inv,IT.DSPH,1);
    redrawHotbar();
  }
  closeDSel();
  P.swing=1;
  startDisaster(kind,P.x,P.z);
}
/* extra sounds */
const _playS8=playS;
playS=function(n){
  if(!soundOn)return;
  try{
    switch(n){
      case 'rattle':noiseS(0.04,0.14,1400,500);return;
      default:_playS8(n);
    }
  }catch(e){}
};


