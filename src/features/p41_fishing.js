/* PART 41 - FISHING (and reverse fishing) */
IT.ROD=275;IT.ROD_R=276;IT.FISH=277;IT.FISH_C=278;
idef(IT.ROD,{name:'Fishing Rod',icon:'i_rod',stack:1,dur:64,rod:1});
idef(IT.ROD_R,{name:'Reverse Fishing Rod',icon:'i_rodr',stack:1,dur:64,rodr:1});
idef(IT.FISH,{name:'Raw Fish',icon:'i_fish',food:3});
idef(IT.FISH_C,{name:'Cooked Fish',icon:'i_fishc',food:8});
SMELT[IT.FISH]=IT.FISH_C;
R([' T','ST','S '],{T:IT.STICK,S:IT.STRING},IT.ROD,1);
RS([IT.ROD,IT.GUNPOWDER],IT.ROD_R,1);
tile('i_rod',c=>{c.clearRect(0,0,16,16);c.fillStyle='#8f5a2a';
  c.fillRect(12,2,1,1);c.fillRect(11,3,1,1);c.fillRect(10,4,1,2);c.fillRect(9,6,1,2);c.fillRect(8,8,1,2);c.fillRect(7,10,1,2);c.fillRect(6,12,1,2);
  c.fillStyle='#d8dce4';c.fillRect(13,3,1,7);c.fillStyle='#e83a3a';c.fillRect(12,10,2,2);});
tile('i_rodr',c=>{c.clearRect(0,0,16,16);c.fillStyle='#5a2a8f';
  c.fillRect(12,2,1,1);c.fillRect(11,3,1,1);c.fillRect(10,4,1,2);c.fillRect(9,6,1,2);c.fillRect(8,8,1,2);c.fillRect(7,10,1,2);c.fillRect(6,12,1,2);
  c.fillStyle='#d8dce4';c.fillRect(13,3,1,7);c.fillStyle='#3fd06a';c.fillRect(12,10,2,2);
  c.fillStyle='#fff';c.fillRect(2,2,1,1);c.fillRect(3,3,1,1);c.fillRect(2,4,2,1);});
tile('i_fish',c=>{c.clearRect(0,0,16,16);c.fillStyle='#6a9ac2';c.fillRect(3,6,8,4);
  c.fillStyle='#4a7aa2';c.fillRect(11,5,3,6);c.fillStyle='#fff';c.fillRect(4,7,1,1);});
tile('i_fishc',c=>{c.clearRect(0,0,16,16);c.fillStyle='#c28a4a';c.fillRect(3,6,8,4);
  c.fillStyle='#a26a2a';c.fillRect(11,5,3,6);c.fillStyle='#7a4a1a';c.fillRect(5,7,2,1);c.fillRect(8,8,2,1);});
let FISHB=null;
function castBobber(){
  const e0=eyePos(),l0=lookDir();
  const g=new THREE.Group();
  const top=boxMesh(0.18,0.1,0.18,0xe83a3a);top.position.y=0.05;g.add(top);
  const bot=boxMesh(0.18,0.1,0.18,0xf2f2f2);bot.position.y=-0.05;g.add(bot);
  scene.add(g);
  entities.push({t:'bobber',x:e0[0]+l0[0]*0.6,y:e0[1]+l0[1]*0.6,z:e0[2]+l0[2]*0.6,
    vx:l0[0]*13+P.vx*0.4,vy:l0[1]*13+3.5,vz:l0[2]*13+P.vz*0.4,
    hw:0.1,h:0.2,onGround:false,inWater:false,biteT:3+Math.random()*5,bite:0,age:0,mesh:g});
  FISHB=entities[entities.length-1];
  playS('whoosh');
}
function updateBobber(e,dt){
  e.age+=dt;
  if(e.age>90||Math.hypot(e.x-P.x,e.z-P.z)>40){removeEnt(e);if(FISHB===e)FISHB=null;return;}
  const inw=getBlock(Math.floor(e.x),Math.floor(e.y),Math.floor(e.z))===B.WATER;
  if(inw){
    e.inWater=true;
    let sy=Math.floor(e.y);
    while(getBlock(Math.floor(e.x),sy+1,Math.floor(e.z))===B.WATER)sy++;
    const surf=sy+0.85;
    e.vx*=0.9;e.vz*=0.9;
    e.y=lerp(e.y,surf+(e.bite>0?-0.3:Math.sin(e.age*2.2)*0.06),0.3);
    if(e.bite>0){
      e.bite-=dt;
    }else{
      e.biteT-=dt;
      if(e.biteT<=0){
        e.bite=1.2;e.biteT=3+Math.random()*5;
        burstParticles(e.x,e.y+0.2,e.z,B.WATER,6,0.5);
        playS('pop');
      }
    }
  }else{
    e.vy-=GRAV*0.8*dt;
    moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
    if(e.onGround){e.vx*=0.6;e.vz*=0.6;}
  }
  e.mesh.position.set(e.x,e.y,e.z);
}

