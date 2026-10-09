/* ----- player ----- */
let P=null;
function newPlayer(spawn){
  return {x:spawn[0],y:spawn[1],z:spawn[2],vx:0,vy:0,vz:0,yaw:Math.PI*0.25,pitch:0,
    hw:0.3,h:1.8,eyeY:1.62,onGround:false,inWater:false,eyeWater:false,
    inv:Array(36).fill(null),sel:0,hp:20,hunger:20,air:10,exh:0,
    mode:'s',flying:false,sneak:false,sprint:false,dead:false,
    spawn:spawn.slice(),hurtT:0,atkT:0,useT:0,eatT:0,bowT:0,fallD:0,swing:0,portalT:0,
    regenT:0,starveT:0,cactusT:0,voidT:0,airT:0,_sp:false,_tap:0,
    stox:{bal:0,sh:{},cb:{}},xp:0,armor:[null,null,null,null],
    db:0,own:[],cos:{hat:null,trail:null},bp:false,bpLvl:0,bpT:0,cmpT:null,pcmpT:null,
    pow:{u:{},a:{}},aimT:0};
}
function lookDir(){
  const cp=Math.cos(P.pitch);
  return [-cp*Math.sin(P.yaw),Math.sin(P.pitch),-cp*Math.cos(P.yaw)];
}
function eyePos(){return [P.x,P.y+P.eyeY,P.z];}
function heldStack(){return P.inv[P.sel];}
function damageHeld(n){
  const st=heldStack();if(!st)return;
  const d=DEFS[st.id],mx=d.tool?d.tool.dur:d.dur;
  if(!mx||P.mode==='c')return;
  if(st.ench&&st.ench.unb&&Math.random()<st.ench.unb/(st.ench.unb+1))return;
  st.dur=(st.dur===undefined?mx:st.dur)-n;
  if(st.dur<=0){P.inv[P.sel]=null;playS('break2');}
  redrawHotbar();
}
function damagePlayer(n,kx,kz){
  if(P.dead||P.mode==='c'||P.hurtT>0||GR.god||(CUT.on&&CUT.script))return;
  n=armorAbsorb(n);
  P.hp-=n;P.hurtT=0.6;hurtFlash=0.35;playS('hurt');
  if(kx!==undefined){
    const l=Math.hypot(kx,kz)||1;
    P.vx+=kx/l*5;P.vz+=kz/l*5;P.vy=Math.max(P.vy,4);
  }
  if(P.hp<=0){P.hp=0;die();}
  drawStats();
}
function die(){
  if(AG_ACTIVE&&!P.dead)agOnDanDeath();
  P.dead=true;
  P.deathPos=[Math.floor(P.x),Math.floor(P.y),Math.floor(P.z)];
  if(DIM==='puppet')mpOnDeath();
  else if(mgOnDie()){}
  else if(!GR.keepInv){
    for(let i=0;i<36;i++){
      const st=P.inv[i];
      if(st){spawnDrop(P.x,P.y+1,P.z,st,(Math.random()-0.5)*5,Math.random()*4+2,(Math.random()-0.5)*5);P.inv[i]=null;}
    }
  }
  redrawHotbar();
  showDeath();
}
function respawn(){
  {const dm=$('deathmsg');if(dm)dm.textContent='';}
  P.x=P.spawn[0];P.y=P.spawn[1];P.z=P.spawn[2];
  P.vx=P.vy=P.vz=0;P.hp=20;P.hunger=20;P.air=10;P.exh=0;
  P.dead=false;P.fallD=0;P.hurtT=1;
  if(DIM==='puppet')mpRespawn();
  else mgOnRespawn();
  drawStats();
}
function dropSel(all){
  const st=heldStack();if(!st)return;
  const n=all?st.count:1;
  const d=lookDir();
  const e=eyePos();
  spawnDrop(e[0]+d[0]*0.5,e[1]-0.3,e[2]+d[2]*0.5,{id:st.id,count:n,dur:st.dur,...(st.ench?{ench:st.ench}:{})},d[0]*6,d[1]*6+2,d[2]*6);
  {const _de=entities[entities.length-1];if(_de&&_de.t==='drop'){_de.thrower='Dan';_de.thrownT=AG_T;}}
  st.count-=n;
  if(st.count<=0)P.inv[P.sel]=null;
  redrawHotbar();playS('pop');
}
function ensureBE(x,y,z,t){
  const k=bkey(x,y,z);
  let be=blockEnts.get(k);
  if(be&&CR_BET[be.t]){crOrphan(k,be,'reuse');be=null;}
  if(!be){
    be=t==='furnace'?{t:'furnace',in:null,fuel:null,out:null,burn:0,burnMax:0,cook:0}
      :t==='terr'?{t:'terr',terr:null}
      :t==='disp'?{t:'disp',fig:null}
                    :{t:'chest',inv:Array(27).fill(null)};
    blockEnts.set(k,be);
  }
  return be;
}
function scatterBE(x,y,z){
  const be=blockEnts.get(bkey(x,y,z));
  if(!be)return;
  if(CR_BET[be.t]){crScatter(x,y,z,be);return;}
  const all=(be.t==='chest'||be.t==='stash')?be.inv:be.t==='disp'?[be.fig?{id:IT.FIGURINE,count:1,mob:be.fig}:null]:be.t==='terr'?[]:[be.in,be.fuel,be.out];
  for(const st of all)if(st)spawnDrop(x+0.5,y+0.6,z+0.5,st,(Math.random()-0.5)*3,2.5,(Math.random()-0.5)*3);
  blockEnts.delete(bkey(x,y,z));
}
function breakBlock(x,y,z,harvest){
  const id=getBlock(x,y,z);
  if(id===B.AIR)return;
  if(DEFS[id].door){
    const ly=DEFS[id].door.half?y-1:y;
    setBlock(x,ly,z,B.AIR);
    setBlock(x,ly+1,z,B.AIR);
    burstParticles(x+0.5,ly+1,z+0.5,id,12);
    playS('dig');
    if(harvest&&P.mode!=='c')
      spawnDrop(x+0.5,ly+0.6,z+0.5,{id:IT.DOOR,count:1},(Math.random()-0.5),2.2,(Math.random()-0.5));
    return;
  }
  scatterBE(x,y,z);
  setBlock(x,y,z,B.AIR);
  if(DIM==='puppet')mpOnBreak(x,y,z,id,'Dan');
  burstParticles(x+0.5,y+0.5,z+0.5,id,12);
  playS('dig');
  if(harvest&&P.mode!=='c'){
    const dr=DEFS[id].pdrop?DEFS[id].pdrop(heldStack(),'Dan'):blockDrop(id);
    if(dr){
      let cnt=dr.count;
      const hh=heldStack();
      if(hh&&hh.ench&&hh.ench.fort&&ORE_F.has(id)&&Math.random()<hh.ench.fort*0.33)cnt+=1;
      spawnDrop(x+0.5,y+0.4,z+0.5,{id:dr.id,count:cnt},(Math.random()-0.5)*1.5,2.2,(Math.random()-0.5)*1.5);
    }
  }
}

