/* ===================================================================== */
/* PART 9 — critter jars (v1.2)                                          */
/* ===================================================================== */
IT.BALL=195;IT.BALLF=196;
idef(IT.BALL ,{name:'Critter Jar',icon:'i_ball', stack:16,ball:true});
idef(IT.BALLF,{name:'Critter Jar',icon:'i_ballf',stack:1, ball:true,full:true,hide:true});
/* a glass jar with a cork; the full one has a tiny critter inside (and a sparkle) */
function jarIcon(c,full){c.clearRect(0,0,16,16);
  c.fillStyle='#8a5a32';c.fillRect(6,1,4,2);c.fillStyle='#b07a48';c.fillRect(6,1,3,1);            /* cork */
  c.fillStyle='#5f7f8c';c.fillRect(5,3,6,1);c.fillRect(4,4,1,1);c.fillRect(11,4,1,1);                /* neck + shoulders */
  c.fillRect(3,5,1,9);c.fillRect(12,5,1,9);c.fillRect(4,14,8,1);                                     /* outline */
  c.fillStyle='rgba(190,228,240,0.55)';c.fillRect(5,4,6,1);c.fillRect(4,5,8,9);                     /* glass */
  c.fillStyle='rgba(255,255,255,0.85)';c.fillRect(5,6,1,5);c.fillRect(6,5,1,1);                      /* glint */
  if(full){c.fillStyle='#3a2a20';c.fillRect(6,10,5,2);c.fillRect(9,8,3,2);c.fillRect(6,12,1,1);c.fillRect(10,12,1,1);   /* the critter */
    c.fillStyle='#f4f1e6';c.fillRect(10,8,1,1);
    c.fillStyle='#ffd24a';c.fillRect(13,1,2,2);c.fillRect(1,12,1,1);}}
tile('i_ball',c=>jarIcon(c,false));
tile('i_ballf',c=>jarIcon(c,true));
R([' I ','IGI',' I '],{I:IT.IRON,G:B.GLASS},IT.BALL,2);

function stackName(st){
  let n=DEFS[st.id].name;
  if(st.mob)n+=' \u2014 '+st.mob.t.charAt(0).toUpperCase()+st.mob.t.slice(1);
  return n;
}
let ballGeoT=null,ballGeoB=null,ballGeoM=null,ballMatT=null,ballMatB=null,ballMatM=null;
function mkBallMesh(){
  if(!ballGeoT){
    ballGeoT=new THREE.BoxGeometry(0.1,0.06,0.1);               /* cork */
    ballGeoB=new THREE.BoxGeometry(0.17,0.2,0.17);              /* glass body */
    ballGeoM=new THREE.BoxGeometry(0.13,0.03,0.13);             /* rim */
    ballMatT=new THREE.MeshLambertMaterial({color:0x8a5a32});
    ballMatB=new THREE.MeshLambertMaterial({color:0xcfeaf2,transparent:true,opacity:0.5,depthWrite:false});
    ballMatM=new THREE.MeshLambertMaterial({color:0x8fb4c2});
  }
  const G=new THREE.Group();
  const t=new THREE.Mesh(ballGeoT,ballMatT);t.position.y=0.135;G.add(t);
  const b=new THREE.Mesh(ballGeoB,ballMatB);b.position.y=-0.01;G.add(b);
  const m=new THREE.Mesh(ballGeoM,ballMatM);m.position.y=0.1;G.add(m);
  return G;
}
function throwBall(st){
  const payload=st.mob?{t:st.mob.t,hp:st.mob.hp}:null;
  st.count--;
  if(st.count<=0)P.inv[P.sel]=null;
  redrawHotbar();
  P.useT=0.4;P.swing=1;playS('whoosh');
  const G=mkBallMesh();scene.add(G);
  const e=eyePos(),l=lookDir();
  entities.push({t:'ball',
    x:e[0]+l[0]*0.4,y:e[1]+l[1]*0.4,z:e[2]+l[2]*0.4,
    vx:l[0]*13+P.vx*0.5,vy:l[1]*13+3.0,vz:l[2]*13+P.vz*0.5,
    hw:0.11,h:0.2,onGround:false,age:0,
    thrownFull:!!payload,
    st:payload?{id:IT.BALLF,count:1,mob:payload}:{id:IT.BALL,count:1},
    mesh:G});
}
function ballCapture(e,m){
  if(mgBall(e,m))return;
  e.st={id:IT.BALLF,count:1,mob:{t:m.mt,hp:m.hp}};
  burstParticles(m.x,m.y+m.h*0.5,m.z,B.WOOL,10,0.55);
  playS('pop');
  removeEnt(m);
  e.vx*=0.2;e.vz*=0.2;
  if(e.vy>1.5)e.vy=1.5;
}
function updateBall(e,dt){
  e.age+=dt;
  /* capture sweep while empty */
  if(!e.st.mob){
    for(let s=0;s<2&&!e.st.mob;s++){
      const nx=e.x+e.vx*dt*(s+1)/2,ny=e.y+e.vy*dt*(s+1)/2,nz=e.z+e.vz*dt*(s+1)/2;
      for(const m of entities){
        if(m.t!=='mob'||m.dead||m.bot)continue;
        if(nx>m.x-m.hw-0.3&&nx<m.x+m.hw+0.3&&ny>m.y-0.25&&ny<m.y+m.h+0.3&&nz>m.z-m.hw-0.3&&nz<m.z+m.hw+0.3){
          ballCapture(e,m);break;
        }
      }
    }
  }
  const pv=e.vy,og=e.onGround;
  e.vy-=GRAV*0.9*dt;
  moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  if(e.onGround){
    if(pv<-5&&!og){e.vy=-pv*0.35;e.onGround=false;playS('thud');}
    else{e.vx*=Math.exp(-dt*7);e.vz*=Math.exp(-dt*7);}
  }
  if(e.mesh){e.mesh.position.set(e.x,e.y+0.1,e.z);e.mesh.rotation.x+=dt*8;}
  if(e.st.mob&&e.thrownFull){
    /* releasing throw: pop open on first ground contact */
    if(e.onGround||e.age>4){
      const t=e.st.mob.t;
      if(MOBT[t]){
        spawnMob(t,e.x,e.y+0.1,e.z);
        const m=entities[entities.length-1];
        const mh=e.st.mob.hp|0;
        if(mh>0)m.hp=Math.min(MOBT[t].hp,mh);
        m.yaw=P?Math.atan2(P.x-e.x,P.z-e.z):m.yaw;
      }
      burstParticles(e.x,e.y+0.4,e.z,B.WOOL,12,0.6);
      playS('pop');
      spawnDrop(e.x,e.y+0.3,e.z,{id:IT.BALL,count:1},0,2,0);
      removeEnt(e);return;
    }
  }else{
    /* empty miss, or a fresh capture: settle into a pickable item */
    const slow=Math.hypot(e.vx,e.vz)<0.7&&Math.abs(e.vy)<0.7;
    if((e.onGround&&slow&&e.age>0.25)||e.age>5){
      spawnDrop(e.x,e.y+0.1,e.z,e.st,0,0.5,0);
      removeEnt(e);return;
    }
  }
}


