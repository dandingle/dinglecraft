/* PART 44 - GUARD TURF (plants with a security contract) */
B.LAWN=94;
def(B.LAWN,{name:'Guard Turf',tiles:{top:'lawn_t',side:'lawn_s',bot:'dirt'},hard:0.6,toolClass:'shovel'});
tile('lawn_t',(c,R)=>{fillN(c,R,'#4c8a34',.09);
  for(let x=0;x<16;x+=4){c.fillStyle='#5a9a3e';c.fillRect(x,0,2,16);}
  c.fillStyle='#2f5a22';c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);});
tile('lawn_s',(c,R)=>{fillN(c,R,'#866043',.13);
  for(let x=0;x<16;x++){c.fillStyle='#4c8a34';c.fillRect(x,0,1,2+((x*7)%3));}});
RS([B.DIRT,IT.STRING,IT.GUNPOWDER],B.LAWN,2);
const LWN=new Map();
let LAWN_T=0;
function lawnCheck(x,y,z){
  const id=getBlock(x,y,z);
  if(id!==B.FLOWER_R&&id!==B.FLOWER_Y&&id!==B.TALLGRASS&&id!==B.CACTUS)return;
  if(getBlock(x,y-1,z)!==B.LAWN)return;
  LWN.set(bkey(x,y,z),{p:id,cd:0});
  showToast(id===B.FLOWER_R?'The rose accepts the contract.':
            id===B.FLOWER_Y?'The dandelion will keep you well.':
            id===B.CACTUS?'The cactus needs no instructions.':'The grass will slow them down.');
}
function tickLawns(dt){
  LAWN_T+=dt;
  if(LAWN_T<0.55)return;
  const step=LAWN_T;LAWN_T=0;
  for(const [k,L] of LWN){
    const p2=dimP(k);
    if(!p2)continue;
    const x=+p2[0],y=+p2[1],z=+p2[2];
    if(!chunkAt(x,z))continue;
    if(getBlock(x,y,z)!==L.p||getBlock(x,y-1,z)!==B.LAWN){LWN.delete(k);continue;}
    if(Math.hypot(x-P.x,z-P.z)>48)continue;
    L.cd-=step;
    if(L.p===B.FLOWER_R){
      if(L.cd>0)continue;
      let tgt=null,td=10;
      for(const e of entities){
        if(e.t!=='mob'||e.dead||!MOBT[e.mt].hostile)continue;
        const dd2=Math.hypot(e.x-(x+0.5),e.z-(z+0.5));
        if(dd2<td){td=dd2;tgt=e;}
      }
      if(tgt){
        L.cd=1.1;
        tgt.hurtT=0;
        hurtMob(tgt,2,tgt.x-(x+0.5),tgt.z-(z+0.5));
        burstParticles(x+0.5,y+0.6,z+0.5,B.FLOWER_R,3,0.5);
        burstParticles(tgt.x,tgt.y+tgt.h*0.5,tgt.z,B.FLOWER_R,4,0.5);
      }
    }else if(L.p===B.FLOWER_Y){
      if(L.cd>0)continue;
      if(P.hp<20&&!P.dead&&Math.hypot(x-P.x,z-P.z)<7){
        L.cd=5;
        P.hp=Math.min(20,P.hp+1);
        drawStats();
        burstParticles(P.x,P.y+1.2,P.z,B.FLOWER_Y,5,0.6);
      }
    }else if(L.p===B.CACTUS){
      if(L.cd>0)continue;
      for(const e of entities){
        if(e.t!=='mob'||e.dead||!MOBT[e.mt].hostile)continue;
        if(Math.hypot(e.x-(x+0.5),e.z-(z+0.5))<1.8){hurtMob(e,2,e.x-(x+0.5),e.z-(z+0.5));L.cd=0.8;}
      }
    }else if(L.p===B.TALLGRASS){
      for(const e of entities){
        if(e.t!=='mob'||e.dead||!MOBT[e.mt].hostile)continue;
        if(Math.hypot(e.x-(x+0.5),e.z-(z+0.5))<1.4){e.vx*=0.35;e.vz*=0.35;}
      }
    }
  }
}

