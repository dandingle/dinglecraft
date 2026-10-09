/* ----- furnaces ----- */
function furnaceTick(dt){
  for(const be of blockEnts.values()){
    if(be.t!=='furnace')continue;
    const out=be.in?SMELT[be.in.id]:undefined;
    const can=out!==undefined&&(!be.out||(be.out.id===out&&be.out.count<stackMax(out)));
    if(be.burn>0)be.burn=Math.max(0,be.burn-dt);
    if(can){
      if(be.burn<=0&&be.fuel&&FUELS[be.fuel.id]){
        be.burnMax=be.burn=FUELS[be.fuel.id];
        be.fuel.count--;if(be.fuel.count<=0)be.fuel=null;
      }
      if(be.burn>0){
        be.cook+=dt;
        if(be.cook>=SMELT_TIME){
          be.cook=0;
          if(!be.out)be.out={id:out,count:1};else be.out.count++;
          be.in.count--;if(be.in.count<=0)be.in=null;
          if(MODAL.kind==='furnace'&&MODAL.be===be)redrawModal();
        }
      }else be.cook=Math.max(0,be.cook-dt*2);
    }else be.cook=Math.max(0,be.cook-dt*2);
  }
}

