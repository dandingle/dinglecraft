/* PART 47 - THE ETERNAL SNAIL */
/* He is slow. He is certain. Touch = death. Breaks blocks only when he must,
   builds when he needs to, follows across dimensions, respawns 50 blocks out
   if left behind. Introduced 10 blocks away on first load after v4.0. */
let SNL=null,SNL_ON=false;
function spawnSnail(x,y,z){
  if(SNL&&!SNL.dead)return;
  const g=new THREE.Group();
  const m=new THREE.Mesh(wpnGeo('snail',-1),new THREE.MeshLambertMaterial({vertexColors:true}));
  m.scale.set(1.6,1.6,1.6);
  g.add(m);
  scene.add(g);
  entities.push({t:'esnail',x,y,z,vx:0,vy:0,vz:0,hw:0.5,h:0.9,onGround:false,
    blkT:0,bob:0,mesh:g});
  SNL=entities[entities.length-1];
  SNL_ON=true;
}
function tickSnail(dt){
  if(!playing||!P||!GR.snail)return;
  if(!SNL||SNL.dead){
    SNL=null;
    if(SNL_ON){
      const a=Math.random()*6.28;
      spawnSnail(P.x+Math.sin(a)*50,P.y+4,P.z+Math.cos(a)*50);
    }else if(frameCount>240){
      const a=Math.random()*6.28;
      spawnSnail(P.x+Math.sin(a)*10,P.y+3,P.z+Math.cos(a)*10);
      showToast('Something slow this way comes.');
      playS('whisper');
    }
  }
}
function updateSnail(e,dt){
  if(!P)return;
  e.bob+=dt;
  const dx=P.x-e.x,dz=P.z-e.z;
  const dist=Math.hypot(dx,dz);
  /* left behind: he does not chase. he simply arrives. */
  if(dist>60){
    const a=Math.random()*6.28;
    e.x=P.x+Math.sin(a)*50;e.z=P.z+Math.cos(a)*50;e.y=P.y+4;
    e.vx=e.vy=e.vz=0;
    return;
  }
  const spd=0.62;
  const dy2=P.y-e.y;
  const wantUp=dy2>1.5,wantDown=dy2<-1.5;
  const dirx=dx/(dist||1),dirz=dz/(dist||1);
  e.vx=dirx*spd;e.vz=dirz*spd;
  e.vy-=GRAV*dt;
  const ox=e.x,oz=e.z;
  moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  const moved=Math.abs(e.x-ox)+Math.abs(e.z-oz);
  const fx=Math.floor(e.x+dirx*0.9),fz=Math.floor(e.z+dirz*0.9);
  const fy=Math.floor(e.y);
  if(e.onGround&&moved<spd*dt*0.3){
    /* blocked: prefer the polite hop; break only when there is no other way.
       no hopping while descending - it fights the dig */
    if(!wantDown&&!solidAt(fx,fy+1,fz)&&!solidAt(Math.floor(e.x),fy+2,Math.floor(e.z))){
      e.vy=7.8;
      e.blkT=0;
    }else{
      e.blkT+=dt;
      if(e.blkT>1.4){
        e.blkT=0;
        const by=solidAt(fx,fy,fz)?fy:fy+1;
        const bid=getBlock(fx,by,fz);
        if(bid!==B.AIR&&bid!==B.BEDROCK&&DEFS[bid].hard>=0){
          setBlock(fx,by,fz,B.AIR);
          burstParticles(fx+0.5,by+0.5,fz+0.5,bid,8,0.6);
          playS('dig');
          if(Math.random()<0.15)showToast('The snail does not respect your walls.');
        }
      }
    }
  }else if(moved>=spd*dt*0.3)e.blkT=0;
  /* altitude comes first: pillar-jump upward when you are above him */
  if(wantUp){
    e.pillT=(e.pillT||0)-dt;
    const cx=Math.floor(e.x),cz=Math.floor(e.z);
    if(e.onGround&&e.pillT<=0){
      /* his full footprint must clear the cell above, or the hop just bonks */
      let hbx=-1,hby=0,hbz=0;
      out:for(let xo=-1;xo<=1;xo++)for(let zo=-1;zo<=1;zo++){
        const sx=Math.floor(e.x+xo*(e.hw+0.01)),sz=Math.floor(e.z+zo*(e.hw+0.01));
        if(solidAt(sx,fy+1,sz)){hbx=sx;hby=fy+1;hbz=sz;break out;}
      }
      if(hbx===-1&&solidAt(cx,fy+2,cz)){hbx=cx;hby=fy+2;hbz=cz;}
      if(hbx===-1){
        e.pillT=1.1;
        e.vy=7.8;
      }else{
        /* something between him and you. briefly. */
        e.pillT=1.4;
        const cid=getBlock(hbx,hby,hbz);
        if(cid!==B.AIR&&cid!==B.BEDROCK&&DEFS[cid].hard>=0){
          setBlock(hbx,hby,hbz,B.AIR);
          burstParticles(hbx+0.5,hby+0.5,hbz+0.5,cid,8,0.6);
          playS('dig');
        }
      }
    }
    /* place the pillar block under himself near the top of the hop.
       vy window keeps him from catching himself during long falls */
    if(!e.onGround&&e.vy<2&&e.vy>-3&&e.y<=P.y+1){
      const by=Math.floor(e.y)-1;
      if(getBlock(cx,by,cz)===B.AIR){
        setBlock(cx,by,cz,B.DIRT);
        playS('place');
      }
    }
  }
  /* and he digs straight down when you are below */
  if(wantDown&&e.onGround){
    e.digT=(e.digT||0)+dt;
    if(e.digT>1.2){
      e.digT=0;
      /* clear everything under his footprint or he just hovers over the hole */
      const by=Math.floor(e.y)-1,seen={};
      let dug=false;
      for(let xo=-1;xo<=1;xo++)for(let zo=-1;zo<=1;zo++){
        const bx=Math.floor(e.x+xo*(e.hw+0.01)),bz=Math.floor(e.z+zo*(e.hw+0.01));
        const kk=bx+','+bz;
        if(seen[kk])continue;
        seen[kk]=1;
        const bid=getBlock(bx,by,bz);
        if(bid!==B.AIR&&bid!==B.BEDROCK&&DEFS[bid].hard>=0){
          setBlock(bx,by,bz,B.AIR);
          burstParticles(bx+0.5,by+0.5,bz+0.5,bid,6,0.6);
          dug=true;
        }
      }
      if(dug)playS('dig');
    }
  }
  /* bridge gaps only when he is not meant to be descending, never above you */
  if(e.onGround&&!wantDown&&dist>2&&e.y<=P.y+1&&getBlock(fx,fy-1,fz)===B.AIR&&getBlock(fx,fy-2,fz)===B.AIR){
    setBlock(fx,fy-1,fz,B.DIRT);
    playS('place');
  }
  /* the touch */
  if(!P.dead&&Math.hypot(P.x-e.x,P.y-e.y,P.z-e.z)<1.15){
    if(!GR.god){
      P.hurtT=0;
      damagePlayer(9999);
      showToast('The Eternal Snail touched you. It was always going to.');
    }
  }
  e.mesh.position.set(e.x,e.y+Math.sin(e.bob*2.2)*0.03,e.z);
  e.mesh.rotation.y=Math.atan2(dirx,dirz)+Math.PI;
}

