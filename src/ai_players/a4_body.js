
/* ----- the body: physics, look, animation (same rules as Dan's) ----- */
function agMotor(a,e,dt){
  const c=a.ctl;
  const fx=Math.floor(e.x),fz=Math.floor(e.z);
  const fb=getBlock(fx,Math.floor(e.y+0.4),fz);
  const inW=fb===B.WATER,inL=fb===B.LAVA;
  if(inL){a.lavaAcc+=dt;if(a.lavaAcc>0.5){a.lavaAcc=0;agHurt(a,4,null,0,0,'lava');}}else a.lavaAcc=0;
  if(getBlock(fx,Math.floor(e.y+1.62),fz)===B.WATER){
    a.airT+=dt;if(a.airT>1){a.airT=0;if(a.air>0)a.air--;else agHurt(a,2,null,0,0,'drown');}
  }else{a.air=10;a.airT=0;}
  if(boxTouches(e.x,e.y,e.z,e.hw,e.h,'hurts')){a.cactT=(a.cactT||0)-dt;if(a.cactT<=0){a.cactT=0.6;agHurt(a,1,null,0,0,'cactus');}}
  let spd=4.32*(c.spd||0);
  const sprint=c.sprint&&c.spd>0&&(a.hunger==null||a.hunger>3);   /* like Dan: no sprinting on an empty stomach */
  if(sprint)spd=5.6;
  if(c.sneak)spd=Math.min(spd,1.31);
  if(inW)spd=Math.min(spd,2.2);
  if(inL)spd=Math.min(spd,1.6);
  const k=1-Math.exp(-dt*(e.onGround?16:(inW?6:4.5)));
  e.vx=lerp(e.vx,c.mx*spd,k);e.vz=lerp(e.vz,c.mz*spd,k);
  if(inW){
    e.vy-=8*dt;
    if(c.jump||c.up||a.air<9)e.vy=lerp(e.vy,3.6,1-Math.exp(-dt*8));
    if(c.jump){
      const bx=Math.floor(e.x+c.mx*0.62),bz=Math.floor(e.z+c.mz*0.62),by=Math.floor(e.y+0.3);
      if(solidAt(bx,by,bz)&&!solidAt(bx,by+1,bz)&&!solidAt(bx,by+2,bz))e.vy=8.6;
    }
    e.vy=clamp(e.vy,-3.2,8.6);a.fallD=0;
  }else{
    if(c.jump&&e.onGround){e.vy=8.2;a.exh=(a.exh||0)+0.2;}
    e.vy-=GRAV*dt;if(e.vy<-50)e.vy=-50;
  }
  if(Math.hypot(e.vx,e.vz)>0.5)a.exh=(a.exh||0)+dt*(sprint?0.45:0.06);
  const wasG=e.onGround;
  e.wall=moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,c.sneak);
  rampSnap(e,true,0.6);
  if(!inW){
    if(!e.onGround&&e.vy<0)a.fallD+=-e.vy*dt;
    if(e.onGround&&!wasG){
      const tb=getBlock(fx,Math.floor(e.y)-1,fz)===B.TRAMP;
      if(tb&&!c.sneak&&a.fallD>0.5){e.vy=Math.min(26,Math.max(10,a.fallD*1.35));e.onGround=false;}
      else{const dmg=(GR.fallDmg&&!tb)?Math.floor(a.fallD-3.2):0;if(dmg>0)agHurt(a,dmg,null,0,0,'fall');}
      a.fallD=0;
    }
  }else a.fallD=0;
  if(e.y<-12){a.voidT=(a.voidT||0)-dt;if(a.voidT<=0){a.voidT=0.4;agHurt(a,4,null,0,0,'void');}}
}
/* human-ish aim: rate-limited turning toward a look target or the walk direction */
function agLook(a,e,dt){
  let ty=e.yaw,tp=0,urgent=false;
  const L=a.look;
  if(L&&L.t>AG_T){
    const dx=L.x-e.x,dy=L.y-(e.y+1.62),dz=L.z-e.z;
    ty=Math.atan2(-dx,-dz);tp=Math.atan2(dy,Math.hypot(dx,dz));urgent=!!L.urgent;
  }else if(Math.hypot(e.vx,e.vz)>0.6){ty=Math.atan2(-e.vx,-e.vz);tp=-0.1;}
  else tp=e.pitch;
  let dyw=((ty-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
  const rate=(urgent?9.5:4.8)*dt;
  e.yaw+=clamp(dyw,-rate,rate);
  e.pitch=lerp(e.pitch||0,clamp(tp,-1.4,1.4),1-Math.exp(-dt*7));
}
function agAnimate(a,e,dt){
  const M=e.M;if(!M)return;
  const far=P&&Math.hypot(e.x-P.x,e.z-P.z)>RD*CH+8;
  M.G.visible=!far;
  if(far)return;
  M.G.position.set(e.x,e.y,e.z);
  M.G.rotation.y=e.yaw;
  if(M.hr){hrBotTick(a,e,dt);return;}
  M.head.rotation.x=-(e.pitch||0)*0.8;
  const sn=a.ctl.sneak;
  M.G.position.y=e.y-(sn?0.12:0);
  if(M.tag)M.tag.visible=!sn;
  const spd=Math.hypot(e.vx,e.vz);
  e.anim+=spd*dt*2.4;
  const sw=Math.sin(e.anim)*0.7*clamp(spd/4.4,0,1);
  M.lL.rotation.x=sw;M.lR.rotation.x=-sw;
  M.aL.rotation.x=-sw*0.8;
  if(a.swing>0){a.swing=Math.max(0,a.swing-dt*3.2);M.aR.rotation.x=-1.6*Math.sin(a.swing*Math.PI);}
  else M.aR.rotation.x=sw*0.8;
  if(e.hurtT<0.2)for(const m of e.mats)m.emissive&&m.emissive.setRGB(0,0,0);
  agSyncHeld(a,e);
}
function agSyncHeld(a,e){
  const st=a.inv[a.sel];
  const id=(st&&(toolIdParts(st.id)||gunIdParts(st.id)||st.id===IT.BOW||(DIM==='puppet'&&DEFS[st.id].gadget)))?st.id:0;
  const M=e.M;
  if(M._toolId===id)return;
  M._toolId=id;
  if(M._tool){M.aR.remove(M._tool);M._tool=null;}
  if(!id)return;
  let g;
  if(toolIdParts(id)){g=mkTool3D(id,0.55);g.position.set(0,-0.6,-0.04);g.rotation.set(-1.1,0,0);}
  else{g=mkWpn3D(id,0.6);g.position.set(0,-0.62,-0.14);g.rotation.set(-0.15,0,0);}
  M.aR.add(g);M._tool=g;
}
/* the per-frame body entity update (called from updateEntities) */
function agBodyTick(e,dt){
  const a=e.A;
  if(!(dt>0))return;
  if(!a||!a.online||a.dead||a.e!==e){removeEnt(e);return;}
  e.hurtT=Math.max(0,e.hurtT-dt);e.atkT=Math.max(0,e.atkT-dt);
  if(!chunkAt(Math.floor(e.x),Math.floor(e.z))){e.vx=e.vz=0;return;}
  if(a.pgrab&&purgGrabTick(a,e,dt)){agAnimate(a,e,dt);agSyncFromBody(a);return;}
  if(a.typingT>0){a.ctl.mx=a.ctl.mz=0;a.ctl.jump=false;}
  agMotor(a,e,dt);
  agLook(a,e,dt);
  agAnimate(a,e,dt);
  agSyncFromBody(a);
}

/* ----- hands: tools, breaking and placing (exactly Dan's rules: nothing is free) ----- */
/* cheapest blocks first: what an agent spends on scaffolding (pillars, bridges) */
const AG_JUNK=[B.DIRT,B.COBBLE,B.NETHROCK,B.STONE,B.PLANK_O,B.PLANK_B,B.PLANK_S];
/* the best REAL tool in the inventory for breaking id (bare hand = null) */
function agBestTool(a,id){
  const d=DEFS[id];if(!d||!d.toolClass)return null;
  let best=null,bs=-1;
  for(const st of a.inv){if(!st)continue;const t=DEFS[st.id]&&DEFS[st.id].tool;
    if(!t||t.type!==d.toolClass)continue;
    const sc=(t.tier>=(d.tier||0)?1000:0)+t.mult;
    if(sc>bs||(sc===bs&&(st.dur!=null?st.dur:t.dur)<(best.dur!=null?best.dur:t.dur))){bs=sc;best=st;}}
  return best;
}
function agCanHarvest(a,id){return canHarvest(id,agBestTool(a,id));}
/* wear a tool down; at 0 it breaks and is gone (Dan's damageHeld rules) */
function agToolWear(a,st,n){
  if(!st)return;
  const d=DEFS[st.id],mx=d&&(d.tool?d.tool.dur:d.dur);
  if(!mx)return;
  if(st.ench&&st.ench.unb&&Math.random()<st.ench.unb/(st.ench.unb+1))return;
  st.dur=(st.dur==null?mx:st.dur)-n;
  if(st.dur>0)return;
  const i=a.inv.indexOf(st);
  if(i>=0){a.inv[i]=null;agLed(a,'used',st.id,1);}
  agEvent(a,'Your '+d.name+' broke',5);
  a.notes.push('Your '+d.name+' broke - craft a new one');if(a.notes.length>8)a.notes.shift();
  const e=a.e;if(e)playSAt('break2',e.x,e.y+1.2,e.z);
  if(a._tc)a._tc.f=-1;
}
/* hold the right tool while digging (looks right, and it is what gets used) */
function agHoldTool(a,st){if(!st)return;const i=a.inv.indexOf(st);if(i>=0)a.sel=i;}
function agBreakBlock(a,x,y,z){
  const id=getBlock(x,y,z);
  if(id===B.AIR||id===-1||!DEFS[id]||DEFS[id].hard<0||DEFS[id].cr)return false;
  if(MGP_ON&&mgProtected(x,y,z,'bot'))return false;
  const d=DEFS[id];
  const tool=agBestTool(a,id),harvest=canHarvest(id,tool);
  ACTOR=a.name;
  try{
    if(d.door){
      const ly=d.door.half?y-1:y;
      setBlock(x,ly,z,B.AIR);setBlock(x,ly+1,z,B.AIR);
      agGiveOrDrop(a,{id:IT.DOOR,count:1},'harvest',x+0.5,ly+0.6,z+0.5);
    }else{
      const k=bkey(x,y,z),be=blockEnts.get(k);
      if(be){
        if(MODAL.bek===k)closeModal(true);
        /* whatever was inside spills on the ground, exactly like when Dan breaks it (figurines included) */
        const owner=BOWN.has(k)?OWN_NAMES[BOWN.get(k)]:null,took=[];
        if(be.t==='chest')for(const st of be.inv)if(st)took.push(st.count+' '+DEFS[st.id].name);
        const spilt=be.t==='chest'?be.inv.some(Boolean):be.t==='furnace'?!!(be.in||be.fuel||be.out):be.t==='disp'?!!be.fig:false;
        scatterBE(x,y,z);
        FSHARE.delete(k);
        if(spilt)a.spill={x:x+0.5,y:y+0.5,z:z+0.5,t:AG_T};
        if(owner&&owner!==a.name&&took.length)agOnStolen(owner,a.name,took);
      }
      setBlock(x,y,z,B.AIR);
      if(DIM==='puppet')mpOnBreak(x,y,z,id,a.name);
      if(harvest){const dr=DEFS[id].pdrop?DEFS[id].pdrop(tool,a.name):blockDrop(id);
        if(dr){let cnt=dr.count;
          if(tool&&tool.ench&&tool.ench.fort&&ORE_F.has(id)&&Math.random()<tool.ench.fort*0.33)cnt+=1;   /* Fortune, as for Dan */
          agGiveOrDrop(a,{id:dr.id,count:cnt},'harvest',x+0.5,y+0.5,z+0.5);}}
      if(FLOWER_IDS.has(id))agFlowerFound(a,id);
    }
  }finally{ACTOR=null;}
  /* one point of durability per block, for the tool that fits the block (like Dan's pick on stone) */
  if(tool&&d.hard>0)agToolWear(a,tool,1);
  a.exh=(a.exh||0)+0.03;
  a.stats.broke++;
  burstParticles(x+0.5,y+0.5,z+0.5,id,8);
  playSAt('dig',x+0.5,y+0.5,z+0.5);
  return true;
}
/* the inventory item that placing block id uses up */
function agPlaceItem(id){
  if(id===B.WATER)return IT.BUCKET_W;
  if(id===B.LAVA)return IT.BUCKET_L;
  if(id===IT.DOOR||(DEFS[id]&&DEFS[id].door))return IT.DOOR;
  if(id>=B.RAMP&&id<B.RAMP+4)return B.RAMP;
  if(id!==B.TORCH&&id!==B.PG_LAMP&&isTorch(id))return B.TORCH;
  return id;
}
/* how many of block id this agent can put down right now (a water bucket never runs dry) */
function agBlockCount(a,id){
  if(id===B.WATER)return agHas(a,IT.BUCKET_W)>0?Infinity:0;
  return agHas(a,agPlaceItem(id));
}
/* place a block the way Dan's right-click would; returns '' or a reason */
function agPlaceBlock(a,x,y,z,id,face){
  if(id==null)return 'nothing to place';
  if(y<1||y>=WH-1)return 'out of the world';
  if(DIM==='puppet'&&!mpPlaceOK(x,y,z,id))return 'too high: the rigging is up there';
  const cur=getBlock(x,y,z);
  if(cur===-1)return 'unloaded';
  const cd=DEFS[cur];
  const liquid=id===B.WATER||id===B.LAVA;
  if(!(cur===B.AIR||cd.replace||(cur===B.WATER&&!liquid)||(liquid&&cur===B.WATER)))return 'occupied by '+cd.name;
  const d=DEFS[id];
  if(!d)return 'unknown block';
  if(!agHasBlock(a,id))return 'none in inventory';
  let sup=false;
  for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
    const n=getBlock(x+dx,y+dy,z+dz);
    if(n!==B.AIR&&n!==B.WATER&&n!==B.LAVA&&!(DEFS[n].replace)&&!isTorch(n)){sup=true;break;}
  }
  if(!sup)return 'floating (nothing to place it against)';
  if(!agCanPlaceAt(a,x,y,z))return 'out of reach or out of sight';
  if(d.solid!==false&&!liquid){
    if(P&&!P.dead&&aabbOverlap(x,y,z,P.x-P.hw,P.y,P.z-P.hw,P.x+P.hw,P.y+P.h,P.z+P.hw))return 'Dan is standing there';
    for(const en of entities)if(en.mob&&!en.dead&&aabbOverlap(x,y,z,en.x-en.hw,en.y,en.z-en.hw,en.x+en.hw,en.y+en.h,en.z+en.hw))
      return en.bot?en.name+' is standing there':'a mob is in the way';
  }
  let pid=id;
  if(id===B.TORCH){
    if(!solidAt(x,y-1,z)){
      let ok=false;
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(solidAt(x-dx,y,z-dz)){pid=wallTorchId(dx,dz);ok=true;break;}
      if(!ok)return 'torch needs a floor or wall';
    }
  }
  ACTOR=a.name;
  try{
    if(id===IT.DOOR||id===B.DOOR_BASE){
      if(!solidAt(x,y-1,z))return 'doors need solid ground';
      const up=getBlock(x,y+1,z);
      if(!(up===B.AIR||DEFS[up].replace))return 'doors need two clear blocks';
      const fyaw=a.e?a.e.yaw:a.yaw,lx=-Math.sin(fyaw),lz=-Math.cos(fyaw);
      const di=Math.abs(lx)>Math.abs(lz)?(lx>0?1:0):(lz>0?3:2);
      setBlock(x,y,z,doorId(0,0,di));setBlock(x,y+1,z,doorId(0,1,di));
    }else{
      setBlock(x,y,z,pid);
      if(id===B.WATER)flowPush(x,y,z);
      if(liquid)lavaWaterCheck(x,y,z);
    }
  }finally{ACTOR=null;}
  agUseBlock(a,id);
  a.stats.placed++;if(a.e&&a.e.hrM){a.hrPlT=AG_T;a.hrPlId=id;}
  a.swing=1;
  playSAt('place',x+0.5,y+0.5,z+0.5);
  return '';
}
function agHasBlock(a,id){return agBlockCount(a,id)>0;}
/* every placement uses one real item: lava empties its bucket, water buckets are an endless source */
function agUseBlock(a,id){
  if(id===B.WATER)return;
  if(id===B.LAVA){agConsume(a,IT.BUCKET_L,1);agGive(a,{id:IT.BUCKET,count:1},'bucket');return;}
  agConsume(a,agPlaceItem(id),1);
}
/* break progress on one block (call each frame; true when it's gone) */
function agBreaking(a,dt,x,y,z){
  const id=getBlock(x,y,z);
  if(id===B.AIR||id===B.WATER||!DEFS[id]){a.act=null;return true;}
  if(id===B.LAVA||DEFS[id].hard<0||DEFS[id].cr)return false;
  if(MGP_ON&&mgProtected(x,y,z,'bot'))return false;
  if(!a.act||a.act.k!=='brk'||a.act.x!==x||a.act.y!==y||a.act.z!==z){
    a.act={k:'brk',x,y,z,t:0,need:agBT(a,id)*(1+Math.random()*0.25)};   /* never faster than Dan */
    agHoldTool(a,agBestTool(a,id));
  }
  a.look={x:x+0.5,y:y+0.5,z:z+0.5,t:AG_T+0.5};
  a.act.t+=dt;a.swing=Math.max(a.swing,0.6);
  if(frameCount%9===0)burstParticles(x+0.5,y+0.5,z+0.5,id,2);
  if(a.act.t>=a.act.need){a.act=null;agBreakBlock(a,x,y,z);return true;}
  return false;
}
function agReach(a,x,y,z){
  const e=a.e;if(!e)return false;
  return Math.hypot(x+0.5-e.x,y+0.5-(e.y+1.5),z+0.5-e.z)<=4.6;
}
/* points to aim at on a block: its centre and the middle of each face (just inside it) */
const AG_AIM=[[0.5,0.5,0.5],[0.02,0.5,0.5],[0.98,0.5,0.5],[0.5,0.02,0.5],[0.5,0.98,0.5],[0.5,0.5,0.02],[0.5,0.5,0.98]];
/* the eye ray, starting outside any non-solid block the body itself is standing in (a flower or tall grass at
   its feet, a doorway, a torch at head height): those never hide what is right in front of a player */
function agEyeRay(a,px,py,pz){
  const e=a.e;let ox=e.x,oy=e.y+1.62,oz=e.z;
  const dx=px-ox,dy=py-oy,dz=pz-oz,ds=Math.hypot(dx,dy,dz)||1;
  const ux=dx/ds,uy=dy/ds,uz=dz/ds;
  const bx=Math.floor(e.x),bz=Math.floor(e.z),y0=Math.floor(e.y),y1=Math.floor(oy);
  let skip=0;
  const tx=Math.floor(px),ty=Math.floor(py),tz=Math.floor(pz);
  let any=false;
  for(;skip<2.6;skip+=0.04){
    const cx=Math.floor(ox+ux*skip),cy=Math.floor(oy+uy*skip),cz=Math.floor(oz+uz*skip);
    if(cx!==bx||cz!==bz||cy<y0||cy>y1)break;                  /* left the body's own column */
    if(cx===tx&&cy===ty&&cz===tz)break;                       /* reached the target itself */
    const id=getBlock(cx,cy,cz);
    if(id!==B.AIR&&id!==B.WATER&&id!==-1){
      if(DEFS[id]&&DEFS[id].solid!==false)break;              /* a real wall is a real wall */
      any=true;}
  }
  if(!any||skip>=2.6)skip=0;
  return {ox:ox+ux*skip,oy:oy+uy*skip,oz:oz+uz*skip,ux,uy,uz,ds:ds-skip};
}
/* can the agent put its hand on block (x,y,z)? In reach AND in plain view: the first block its look
   ray meets is that block (Dan's rule: raycast from the eye, REACH 5). No reaching through walls. */
function agCanTouch(a,x,y,z){
  if(!a.e||!agReach(a,x,y,z))return false;
  for(const [fx,fy,fz] of AG_AIM){
    const r=agEyeRay(a,x+fx,y+fy,z+fz);
    if(r.ds>REACH+0.3)continue;
    const h=raycastB(r.ox,r.oy,r.oz,r.ux,r.uy,r.uz,r.ds+0.05);
    if(h&&h.x===x&&h.y===y&&h.z===z)return true;
  }
  return false;
}
/* line of sight from an eye position: 'touch' = block (x,y,z) is the first thing the look ray meets,
   'place' = nothing solid between the eye and cell (x,y,z) */
function agLosFrom(ox,oy,oz,x,y,z,mode){
  for(const [fx,fy,fz] of AG_AIM){
    const px=x+fx,py=y+fy,pz=z+fz,dx=px-ox,dy=py-oy,dz=pz-oz,ds=Math.hypot(dx,dy,dz)||1;
    if(ds>REACH+0.3)continue;
    const h=raycastB(ox,oy,oz,dx/ds,dy/ds,dz/ds,mode==='touch'?ds+0.05:Math.max(0,ds-0.01));
    if(mode==='touch'?(h&&h.x===x&&h.y===y&&h.z===z):(!h||(h.x===x&&h.y===y&&h.z===z)))return true;
  }
  return false;
}
/* the nearest spot to stand on from which block/cell (x,y,z) is in reach and in view (null if none) */
function agVantage(a,x,y,z,mode){
  const e=a.e;if(!e)return null;
  let best=null,bd=1e9;
  for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)for(let fy=y-2;fy<=y+1;fy++){
    const sx=x+dx,sz=z+dz;
    if(sx===x&&sz===z&&fy<=y&&fy+1>=y)continue;            /* not inside the target */
    if(!nStand(sx,fy,sz)||nb(sx,fy,sz)===B.WATER)continue;
    if(Math.hypot(x+0.5-(sx+0.5),y+0.5-(fy+1.5),z+0.5-(sz+0.5))>4.4)continue;
    if(!agLosFrom(sx+0.5,fy+1.62,sz+0.5,x,y,z,mode))continue;
    const d=Math.hypot(sx+0.5-e.x,sz+0.5-e.z)+Math.abs(fy-e.y)*1.5;
    if(d<bd){bd=d;best={x:sx,y:fy,z:sz};}
  }
  return best;
}
/* can the agent place a block into cell (x,y,z)? The cell must be in reach and in view (nothing solid
   between the eye and the cell), like aiming at the face of the block it goes against. */
function agCanPlaceAt(a,x,y,z){
  if(!a.e||!agReach(a,x,y,z))return false;
  for(const [fx,fy,fz] of AG_AIM){
    const r=agEyeRay(a,x+fx,y+fy,z+fz);
    if(r.ds>REACH+0.3)continue;
    const h=raycastB(r.ox,r.oy,r.oz,r.ux,r.uy,r.uz,Math.max(0,r.ds-0.01));
    if(!h||(h.x===x&&h.y===y&&h.z===z))return true;
  }
  return false;
}

/* ----- following a path ----- */
function agPathTick(a,dt){
  const e=a.e,c=a.ctl;
  c.mx=c.mz=0;c.jump=false;c.up=false;c.sneak=false;c.spd=1;c.sprint=false;
  const path=a.path;
  if(!path||a.pi>=path.length)return 'done';
  const n=path[a.pi];
  const fy=Math.floor(e.y+0.05);
  const cx=Math.floor(e.x),cz=Math.floor(e.z);
  /* safety net: no single move may take forever (a dig through stone by hand is the slowest) */
  if(a.pnode!==n){a.pnode=n;a.pnodeT=0;}
  else if((a.pnodeT+=dt)>(n.m==='g'||n.m==='v'?30:n.m==='p'?14:9)){a.pnodeT=0;a.stuckT=0;a.bestD=99;return 'stuck';}
  /* pre-move work */
  if(n.m==='g'){
    for(const yy of [n.y+1,n.y]){
      const id=getBlock(n.x,yy,n.z);
      if(nSolid(id)&&id!==-1){if(!agBreaking(a,dt,n.x,yy,n.z))return 'run';}
    }
  }else if(n.m==='v'){
    if(nSolid(getBlock(n.x,n.y,n.z))){
      if(Math.abs(e.x-(n.x+0.5))>0.3||Math.abs(e.z-(n.z+0.5))>0.3){agSteer(a,n.x+0.5,n.z+0.5,0.5);return 'run';}
      if(!agBreaking(a,dt,n.x,n.y,n.z))return 'run';
    }
  }else if(n.m==='p'){
    if(agScaffoldBlock(a)==null&&nFree(getBlock(n.x,n.y-1,n.z)))return 'fail:out of blocks to pillar with';
    if(e.onGround&&e.y<n.y-1.45)return 'stuck';     /* the block this pillar step stands on is gone: replan */
    const hy=n.y+1;
    if(nSolid(getBlock(n.x,hy,n.z))&&getBlock(n.x,hy,n.z)!==-1){if(!agBreaking(a,dt,n.x,hy,n.z))return 'run';}
    if(Math.abs(e.x-(n.x+0.5))>0.16||Math.abs(e.z-(n.z+0.5))>0.16){agSteer(a,n.x+0.5,n.z+0.5,0.35);return 'run';}
    if(e.y>=n.y-0.02&&e.onGround){a.pi++;return 'run';}
    c.jump=true;
    a.look={x:n.x+0.5,y:n.y-1,z:n.z+0.5,t:AG_T+0.3};
    if(e.y>n.y-1+1.02&&!e.onGround){
      const id=getBlock(n.x,n.y-1,n.z);
      if(id===B.AIR||DEFS[id].replace){
        const sb=agScaffoldBlock(a),pr=sb!=null?agPlaceBlock(a,n.x,n.y-1,n.z,sb):'';
        if(sb!=null&&pr===''){a.scaff=a.scaff||[];a.scaff.push([n.x,n.y-1,n.z,sb]);}
        /* another player squeezed into the same shaft: bodies push, so they come up with you (a jump, nothing more) */
        else if(/ is standing there/.test(pr))for(const en of entities)
          if(en.bot&&en!==e&&!en.dead&&en.onGround&&Math.abs(en.x-(n.x+0.5))<0.8&&Math.abs(en.z-(n.z+0.5))<0.8&&Math.abs(en.y-(n.y-1))<0.6)en.vy=Math.max(en.vy,8.2);
      }
    }
    return 'run';
  }else if(n.m==='b'){
    const by=n.y-1;
    const id=getBlock(n.x,by,n.z);
    if(id===B.AIR||id===B.WATER||(DEFS[id]&&DEFS[id].replace)){
      c.sneak=true;
      const dx=n.x+0.5-e.x,dz=n.z+0.5-e.z,dd=Math.hypot(dx,dz);
      if(dd>1.25){agSteer(a,n.x+0.5,n.z+0.5,0.35);return 'run';}
      a.look={x:n.x+0.5,y:by+0.5,z:n.z+0.5,t:AG_T+0.3};
      const sb=agScaffoldBlock(a);
      if(sb==null)return 'fail:out of blocks to bridge with';
      const r=agPlaceBlock(a,n.x,by,n.z,sb);
      if(r)return 'fail:'+r;
      return 'run';
    }
  }
  /* steer to the next cell */
  const tx=n.x+0.5,tz=n.z+0.5;
  const dx=tx-e.x,dz=tz-e.z,dist=Math.hypot(dx,dz);
  const arrived=dist<0.32&&(n.m==='d'?e.y<n.y+0.6:Math.abs(e.y-n.y)<0.6);
  if(arrived||(dist<0.5&&e.onGround&&Math.abs(e.y-n.y)<0.3&&a.pi<path.length-1)){a.pi++;a.stuckT=0;a.bestD=99;return a.pi>=path.length?'done':'run';}
  agSteer(a,tx,tz,1);
  if(n.y>fy+0.3&&dist<1.4)c.jump=true;
  if(e.wall&&e.onGround)c.jump=true;
  if(getBlock(cx,Math.floor(e.y+0.4),cz)===B.WATER&&n.y>=fy)c.up=true;
  if(n.m==='b')c.sneak=true;
  /* stuck detection */
  if(dist<(a.bestD||99)-0.08){a.bestD=dist;a.stuckT=0;}
  else{a.stuckT+=dt;if(a.stuckT>2.6){a.stuckT=0;a.bestD=99;return 'stuck';}}
  return 'run';
}
function agSteer(a,tx,tz,spd){
  const e=a.e,dx=tx-e.x,dz=tz-e.z,d=Math.hypot(dx,dz);
  if(d<0.05)return;
  a.ctl.mx=dx/d;a.ctl.mz=dz/d;a.ctl.spd=spd;
}
/* the cheapest junk block actually in the inventory, or null */
function agScaffoldBlock(a){for(const id of AG_JUNK)if(agHas(a,id)>0)return id;return null;}
function agScaffoldCount(a){let n=0;for(const id of AG_JUNK)n+=agHas(a,id);return n;}
