
/* ----- skills: what an agent can be told to do (each a small state machine) ----- */
const AG_SKILLS=['goto','follow','explore','wander','wait','emote','lookat','gather','hunt','build','grief',
  'tnt','steal','store','take','give','eat','sethome','craft','smelt','equip','attack','flee','guard','hide'];
function agTargetPos(a,name){
  if(!name)return null;
  const l=(''+name).toLowerCase();
  if(l==='dan'||l==='player'||l==='you'){if(!P||P.dead||DIM!==a.dim)return null;return {x:P.x,y:P.y,z:P.z,who:'Dan',ent:null};}
  const o=agByName(name);
  if(o&&o!==a&&o.online&&!o.dead&&o.dim===a.dim)return {x:o.x,y:o.y,z:o.z,who:o.name,ent:o.e};
  return null;
}
function agParseXZ(s){
  if(s==null)return null;
  if(typeof s==='object'&&s.x!=null)return {x:+s.x,z:+s.z};
  const m=(''+s).match(/(-?\d+)\s*[, ]\s*(-?\d+)(?:\s*[, ]\s*(-?\d+))?/);
  if(!m)return null;
  if(m[3]!=null)return {x:+m[1],z:+m[3],y:+m[2]};
  return {x:+m[1],z:+m[2]};
}
/* resolve "home", "Dan", "Dan's base", "x,z", a compass direction... into a point */
function agResolve(a,t){
  if(t==null||t==='')return null;
  if(typeof t==='object'&&t.x!=null)return {x:+t.x,z:+t.z,y:t.y};
  const s=(''+t).trim(),l=s.toLowerCase();
  const xz=agParseXZ(s);if(xz)return xz;
  if(l==='here')return {x:a.x,z:a.z};
  if(l==='home'||l==='my base'||l==='base'||l==='my home'){
    if(a.home)return {x:a.home[0],z:a.home[2]};
    const b=mainBase(a.name);if(b)return {x:b.x,z:b.z};
    return null;
  }
  if(l==='spawn'){const w=worldSpawn();return {x:w[0],z:w[2]};}
  const bm=l.match(/^(.+?)(?:'s|s)?\s+(base|house|home|build|town|garden|bunker|castle)$/);
  if(bm){const who=bm[1]==='dan'?'Dan':(agByName(bm[1])||{}).name;
    if(who){const b=mainBase(who);if(b)return {x:b.x,z:b.z,base:b};}}
  const tp=agTargetPos(a,s);if(tp)return tp;
  const D8={n:[0,-1],north:[0,-1],s:[0,1],south:[0,1],e:[1,0],east:[1,0],w:[-1,0],west:[-1,0],
    ne:[0.707,-0.707],nw:[-0.707,-0.707],se:[0.707,0.707],sw:[-0.707,0.707]};
  if(D8[l])return {x:a.x+D8[l][0]*60,z:a.z+D8[l][1]*60};
  return null;
}
/* where a walker's feet end up on this column: the ground, or the top of the water (you swim across the sea, not along its floor) */
function agGroundY(x,z){
  const fx=Math.floor(x),fz=Math.floor(z);
  if(!chunkAt(fx,fz)){const h=DIM==='puppet'?mpSurf(fx,fz):colInfo(fx,fz).h;return Math.max(h+1,SEA);}
  for(let y=WH-1;y>0;y--){const id=getBlock(fx,y,fz);if(id===B.AIR)continue;if(id===B.WATER)return y;break;}
  return surfaceTop(fx,fz)+1;
}
/* --- movement core shared by goto/follow/explore/flee --- */
function agMoveTo(a,dt,st,gx,gz,r,gy){
  const e=a.e;
  if(st.planned&&!a.pf&&!a.path)st.planned=false;     /* the plan was dropped under us (a reflex, a new op): make a new one */
  const d=Math.hypot(gx-e.x,gz-e.z);
  if(d<=r+0.4&&(gy==null||Math.abs(gy-e.y)<(st.ry!=null?st.ry+0.5:2.5))){a.path=null;a.pf=null;st.fin=null;return 'done';}
  if(st.fin){
    if(Math.abs(st.fin.gx-gx)>0.5||Math.abs(st.fin.gz-gz)>0.5)st.fin=null;    /* the goal moved: plan for the new one */
    else{const r3=d<=r+0.4?'done':agFinalStep(a,dt,st.fin,gx,gz,d);if(r3!=='run'){st.fin=null;st.finAt=[gx,gz];a.ctl.mx=a.ctl.mz=0;}return r3;}
  }
  if(!st.planned||(a.pf&&a.pf.done&&(!a.path||a.pi>=a.path.length))){
    if(a.pf&&a.pf.done&&st.planned){
      if(st.lastPlanD!=null&&d>st.lastPlanD-0.5){st.noProg=(st.noProg||0)+1;}else st.noProg=0;
      if(st.noProg>=3)return agUnstick(a,st,gx,gz,gy)?'run':'fail:'+agNoWay(a);
    }
    let sx=gx,sz=gz,sy=gy;
    if(d>40){const k=34/d;sx=e.x+(gx-e.x)*k;sz=e.z+(gz-e.z)*k;sy=null;}
    if(sy==null)sy=agGroundY(sx,sz);
    navStart(a,sx,sy,sz,d>40?3:r,{ry:d>40?6:(st.ry!=null?st.ry:(gy==null?3:2)),max:d>40?2500:3500,scaf:agScaffoldCount(a),hard:!!st.hard});
    st.planned=true;st.lastPlanD=d;a.path=null;a.pi=0;
  }
  if(a.pf&&!a.pf.done){
    const used=navStep(a,Math.max(80,Math.min(NAV_BUDGET,700)));NAV_BUDGET-=used;
    a.ctl.mx=a.ctl.mz=0;
    if(!a.pf.done)return 'run';
    a.path=a.pf.path;a.pi=0;a.bestD=99;a.stuckT=0;
    /* the planner says we are already inside the goal area. Its goal is a square box, wider than the circle the
       caller asked for (corners reach ~1.4x r): walk the last stretch straight in, then report arrival */
    if(!a.path.length&&a.pf.full){a.pf=null;a.path=null;st.planned=false;st.noProg=0;
      if(d>r+0.4&&!(st.finAt&&Math.abs(st.finAt[0]-gx)<=0.5&&Math.abs(st.finAt[1]-gz)<=0.5)){st.fin={gx,gz,t:0,pt:0,bd:d};return 'run';}
      return 'done';}
    if(!a.path.length){st.noProg=(st.noProg||0)+1;
      if(st.noProg>=3)return agUnstick(a,st,gx,gz,gy)?'run':'fail:'+agNoWay(a);return 'run';}
    st.finAt=null;                       /* a real walk: a later final approach is a fresh try */
  }
  if(!a.path)return 'run';
  const r2=agPathTick(a,dt);
  if(r2==='stuck'){st.stucks=(st.stucks||0)+1;a.pf=null;st.planned=false;
    if(st.stucks>4){st.stucks=0;if(!agUnstick(a,st,gx,gz,gy))return 'fail:stuck - '+agNoWay(a);}
    return 'run';}
  if(r2&&r2.startsWith('fail')){a.pf=null;st.planned=false;st.stucks=(st.stucks||0)+1;if(st.stucks>5)return r2;}
  if(r2==='done'){a.pf=null;st.planned=false;
    /* a "finished" path that left us no closer (planner gave up, best node = here): count it */
    const dd=d+(gy!=null?Math.abs(gy-e.y):0);
    if(st.bestDD!=null&&dd>=st.bestDD-0.5)st.dng=(st.dng||0)+1;else{st.dng=0;st.bestDD=dd;}
    if(st.dng>=3){st.dng=0;st.bestDD=null;return agUnstick(a,st,gx,gz,gy)?'run':'fail:'+agNoWay(a);}
  }
  return 'run';
}
/* why a route failed, in the words a player would use */
function agNoWay(a){
  const sc=agScaffoldCount(a),pk=agToolLevel(a,'pick');
  if(!sc&&pk<0)return 'no way there - you need blocks to pillar or bridge with, or a pickaxe to dig through';
  if(!sc)return 'no way there - you need blocks (dirt, cobblestone) to pillar up or bridge across';
  return 'no way through';
}
/* when the route is blocked: never a free teleport. First plan again allowing slow digs (a staircase
   out of a pit, stone by hand); then a tiny nudge out of a physics wedge (same level, next cell, never
   into water); otherwise give up and say why. */
function agUnstick(a,st,gx,gz,gy){
  if(!st.hard){st.hard=true;st.planned=false;st.noProg=0;st.dng=0;st.bestDD=null;a.pf=null;a.path=null;return true;}
  if(!st.nudged&&agNudge(a,gx,gz)){st.nudged=true;st.planned=false;st.noProg=0;a.pf=null;a.path=null;return true;}
  return false;
}
function agNudge(a,gx,gz){
  const e=a.e;
  if(danSees(e.x,e.y+1,e.z))return false;
  const fx=Math.floor(e.x),fy=Math.floor(e.y+0.05),fz=Math.floor(e.z);
  let best=null,bd=1e9;
  for(const [dx,dz] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){
    const x=fx+dx,z=fz+dz;
    if(!nStand(x,fy,z)||nb(x,fy,z)===B.WATER||nb(x,fy-1,z)===B.WATER)continue;
    if(boxCollides(x+0.5,fy+0.02,z+0.5,e.hw,e.h))continue;
    const dd=Math.hypot(x+0.5-gx,z+0.5-gz);
    if(dd<bd){bd=dd;best=[x,z];}
  }
  if(!best||Math.hypot(best[0]+0.5-e.x,best[1]+0.5-e.z)>1.3)return false;
  e.x=best[0]+0.5;e.z=best[1]+0.5;e.y=Math.min(e.y,fy+0.02);e.vx=e.vy=e.vz=0;a.fallD=0;
  return true;
}
/* the last metre or so, walked straight at the goal: only over level ground it can stand on (no drops,
   no climbs, no water, nothing dangerous), and it stops as soon as that stops getting it closer */
function agFinalStep(a,dt,f,gx,gz,d){
  const e=a.e;f.t+=dt;
  if(d<f.bd-0.04){f.bd=d;f.pt=0;}else f.pt+=dt;
  if(f.t>2.5||f.pt>0.5||d<0.05){a.ctl.mx=a.ctl.mz=0;return 'done';}
  const ux=(gx-e.x)/d,uz=(gz-e.z)/d,fy=Math.floor(e.y+0.05);
  const nx=Math.floor(e.x+ux*0.65),nz=Math.floor(e.z+uz*0.65);
  if(nx!==Math.floor(e.x)||nz!==Math.floor(e.z)){
    const f0=nb(nx,fy,nz),g0=nb(nx,fy-1,nz);
    if(!nStand(nx,fy,nz)||f0===B.WATER||g0===B.WATER||nDanger(f0)||nDanger(g0)){a.ctl.mx=a.ctl.mz=0;return 'done';}
  }
  agSteer(a,gx,gz,0.7);
  return 'run';
}
/* --- skill runners --- */
const SK={};
SK.goto=(a,dt,s)=>{
  if(s.st.tgt||s.a.target){
    if(!s.st.t||AG_T-s.st.t>1){s.st.t=AG_T;const p=agResolve(a,s.a.target||s.st.tgt);
      if(!p)return 'fail:cannot find '+(s.a.target||'that place');
      if(s.st.gx==null||Math.hypot(p.x-s.st.gx,p.z-s.st.gz)>3){s.st.gx=p.x;s.st.gz=p.z;s.st.planned=false;}}
  }
  if(s.st.gx==null)return 'fail:no destination';
  return agMoveTo(a,dt,s.st,s.st.gx,s.st.gz,s.a.r!=null?+s.a.r:2,null);
};
SK.follow=(a,dt,s)=>{
  const p=agTargetPos(a,s.a.target);
  if(!p)return 'fail:cannot see '+(s.a.target||'them');
  const d=agDist(a,p.x,p.z),want=s.a.r!=null?+s.a.r:3.5;
  if(d<=want+0.5){a.ctl.mx=a.ctl.mz=0;a.look={x:p.x,y:p.y+1.5,z:p.z,t:AG_T+0.5};a.path=null;a.pf=null;
    return s.t>(s.a.secs||75)?'done':'run';}
  if(s.st.gx==null||Math.hypot(p.x-s.st.gx,p.z-s.st.gz)>3){s.st.gx=p.x;s.st.gz=p.z;s.st.planned=false;}
  const r=agMoveTo(a,dt,s.st,s.st.gx,s.st.gz,want,null);
  if(d>12)a.ctl.sprint=true;
  if(r==='done'&&Math.hypot(p.x-s.st.gx,p.z-s.st.gz)>0.3){s.st.gx=p.x;s.st.gz=p.z;s.st.planned=false;}   /* got to where they were: now to where they are */
  return r==='done'?'run':r;
};
SK.explore=(a,dt,s)=>{
  if(s.st.gx==null){
    let p=agResolve(a,s.a.target||s.a.dir);
    if(!p){const ang=Math.random()*6.28;p={x:a.x+Math.sin(ang)*70,z:a.z+Math.cos(ang)*70};}
    const dist=clamp(+s.a.count||+s.a.dist||Math.hypot(p.x-a.x,p.z-a.z)||70,16,260);
    const dd=Math.hypot(p.x-a.x,p.z-a.z)||1;
    s.st.gx=a.x+(p.x-a.x)/dd*dist;s.st.gz=a.z+(p.z-a.z)/dd*dist;
  }
  const r=agMoveTo(a,dt,s.st,s.st.gx,s.st.gz,4,null);
  if(r==='run'&&Math.hypot(a.e.vx,a.e.vz)>3)a.ctl.sprint=Math.random()<0.98;
  return r;
};
SK.wander=(a,dt,s)=>{
  if(s.st.gx==null){const c=agResolve(a,s.a.target)||{x:a.x,z:a.z};const rr=+s.a.r||10;
    const ang=Math.random()*6.28,d=3+Math.random()*rr;s.st.gx=c.x+Math.sin(ang)*d;s.st.gz=c.z+Math.cos(ang)*d;}
  if(s.st.arr){a.ctl.mx=a.ctl.mz=0;return AG_T>s.st.arr?'done':'run';}
  const r=agMoveTo(a,dt,s.st,s.st.gx,s.st.gz,1.5,null);
  if(r==='done'||r.startsWith('fail')){s.st.arr=AG_T+1.5+Math.random()*3;}
  return 'run';
};
SK.wait=(a,dt,s)=>{
  a.ctl.mx=a.ctl.mz=0;
  if(!s.st.lt||AG_T>s.st.lt){s.st.lt=AG_T+1.5+Math.random()*3;
    const e=a.e,ang=e.yaw+(Math.random()-0.5)*2.2;
    a.look={x:e.x-Math.sin(ang)*6,y:e.y+1+Math.random()*2-1,z:e.z-Math.cos(ang)*6,t:s.st.lt};}
  return s.t>=clamp(+s.a.count||+s.a.secs||4,1,60)?'done':'run';
};
SK.emote=(a,dt,s)=>{
  const k=(s.a.note||s.a.item||s.a.target||'crouch').toLowerCase();
  a.ctl.mx=a.ctl.mz=0;
  const tp=agTargetPos(a,s.a.target);
  if(tp)a.look={x:tp.x,y:tp.y+1.5,z:tp.z,t:AG_T+0.4};
  if(k.includes('jump'))a.ctl.jump=Math.floor(s.t*2.5)%2===0;
  else if(k.includes('spin')){a.look=null;a.e.yaw+=dt*8;}
  else if(k.includes('wave')||k.includes('punch')||k.includes('swing')){if(a.swing<=0)a.swing=1;}
  else if(k.includes('nod')){a.look={x:a.e.x-Math.sin(a.e.yaw)*4,y:a.e.y+1.62+Math.sin(s.t*9)*1.6,z:a.e.z-Math.cos(a.e.yaw)*4,t:AG_T+0.2};}
  else a.ctl.sneak=Math.floor(s.t*6)%2===0;
  return s.t>2.4?'done':'run';
};
SK.lookat=(a,dt,s)=>{
  const tp=agTargetPos(a,s.a.target)||agResolve(a,s.a.target);
  if(!tp)return 'fail:cannot see '+(s.a.target||'it');
  a.ctl.mx=a.ctl.mz=0;a.look={x:tp.x,y:(tp.y||a.y)+1.5,z:tp.z,t:AG_T+0.4};
  return s.t>2?'done':'run';
};
/* gather: walk to blocks of a kind and mine them with the real tool rules.
   Progress = ITEMS GAINED (stone gives Cobblestone, bare hands on stone give nothing). */
const AG_GATHER={
  wood:[B.LOG_O,B.LOG_B,B.LOG_S],log:[B.LOG_O,B.LOG_B,B.LOG_S],logs:[B.LOG_O,B.LOG_B,B.LOG_S],tree:[B.LOG_O,B.LOG_B,B.LOG_S],trees:[B.LOG_O,B.LOG_B,B.LOG_S],
  'oak log':[B.LOG_O],'birch log':[B.LOG_B],'spruce log':[B.LOG_S],
  stone:[B.STONE,B.COBBLE],cobblestone:[B.STONE,B.COBBLE],cobble:[B.STONE,B.COBBLE],rock:[B.STONE,B.COBBLE],
  coal:[B.COAL_ORE],iron:[B.IRON_ORE],gold:[B.GOLD_ORE],diamond:[B.DIA_ORE],diamonds:[B.DIA_ORE],
  sand:[B.SAND],sandstone:[B.SANDSTONE],dirt:[B.DIRT,B.GRASS],clay:[B.CLAY],gravel:[B.GRAVEL],
  obsidian:[B.OBSIDIAN],glowstone:[B.GLOWSTONE],netherrack:[B.NETHROCK],netherrock:[B.NETHROCK],
};
function agGatherSpec(a,what){
  if(a&&a.dim==='puppet')return purgGatherSpec(a,what);
  const l=(''+(what||'')).toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim();
  if(!l)return null;
  if(/\bwool\b/.test(l))return {kind:'wool'};
  if(/\b(water|lava)\b/.test(l))return {kind:'liquid'};
  if(/\bplanks?\b/.test(l))return {kind:'craft',msg:'planks are crafted, not gathered - gather wood (logs) and craft planks (1 log = 4 planks)'};
  if(/\bsticks?\b/.test(l))return {kind:'craft',msg:'sticks are crafted, not gathered - craft them from planks (2 planks = 4 sticks)'};
  if(/\bflowers?\b/.test(l)){const want=[...FLOWER_IDS].filter(i=>!a.flowers.includes(i));return {kind:'flower',ids:want.length?want:[...FLOWER_IDS]};}
  for(const id of FLOWER_IDS){const n=DEFS[id].name.toLowerCase();if(n===l||(l.length>3&&n.includes(l))||l.includes(n))return {kind:'flower',ids:[id]};}
  if(AG_GATHER[l])return {kind:'mine',ids:AG_GATHER[l]};
  let bk=null;for(const k in AG_GATHER)if(l.includes(k)&&(!bk||k.length>bk.length))bk=k;
  if(bk)return {kind:'mine',ids:AG_GATHER[bk]};
  for(const k in DEFS){const d=DEFS[k];if(!d.item&&!d.hide&&!d.cr&&d.hard>=0&&d.name.toLowerCase()===l)return {kind:'mine',ids:[+k]};}
  return null;
}
function agGatherIds(a,what){const g=agGatherSpec(a,what);return g&&g.ids?g.ids:null;}
/* what a player would tell you when you try to mine it with the wrong tool */
function agToolHint(id){
  const d=DEFS[id],nm=d.name.toLowerCase(),tier=d.tier||0;
  if(d.hint)return nm+' '+d.hint;
  if(d.toolClass==='pick'){
    if(tier<=0)return nm+' needs a pickaxe - craft a Wooden Pickaxe first (3 planks + 2 sticks, needs a crafting table)';
    if(tier===1)return nm+' needs a Stone Pickaxe or better (3 cobblestone + 2 sticks at a crafting table)';
    if(tier===2)return nm+' needs an Iron Pickaxe or better (3 iron ingots + 2 sticks; smelt iron ore in a furnace first)';
    return nm+' needs a Diamond Pickaxe';
  }
  const t=TOOLCLASS.indexOf(d.toolClass);
  return nm+' needs a '+(t>=0?TOOLTYPE[t].toLowerCase():'proper tool');
}
function agScanFor(a,ids,R,vis,dyMin,anyOwned){
  const e=a.e,cx=Math.floor(e.x),cy=Math.floor(e.y),cz=Math.floor(e.z);
  const set=new Set(ids);let best=null,bd=1e9;const bc=a.badCells;
  for(let dx=-R;dx<=R;dx++)for(let dz=-R;dz<=R;dz++)for(let dy=(dyMin==null?-8:dyMin);dy<=10;dy++){
    const id=nb(cx+dx,cy+dy,cz+dz);
    if(!set.has(id))continue;
    if(BOWN.size&&(anyOwned?BOWN.has(bkey(cx+dx,cy+dy,cz+dz)):nTheirs(a,cx+dx,cy+dy,cz+dz)))continue;   /* a build is not a quarry */
    if(vis){const x=cx+dx,y=cy+dy,z=cz+dz;let open=false;
      for(const [ox,oy,oz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const n=nb(x+ox,y+oy,z+oz);if(n===B.AIR||n===B.WATER||(DEFS[n]&&DEFS[n].solid===false)){open=true;break;}}
      if(!open)continue;}
    const d=dx*dx+dz*dz+dy*dy*(dy<0?4:2.5);      /* digging down is the last resort */
    if(d>=bd)continue;
    if(bc){const t=bc.get((cx+dx)+','+(cy+dy)+','+(cz+dz));if(t!==undefined&&AG_T-t<90)continue;}
    bd=d;best={x:cx+dx,y:cy+dy,z:cz+dz,id};
  }
  return best;
}
function agBadCell(a,c){if(!a.badCells||a.badCells.size>400)a.badCells=new Map();a.badCells.set(c.x+','+c.y+','+c.z,AG_T);}
/* feet height to aim for when walking up to a block: beside a tree on the ground, down to a buried ore */
function agStandY(c){
  const g=bjGroundY(c.x,c.z)+1;
  return c.y>=g?Math.max(g,c.y-3):c.y;
}
/* what to break to get at c: c itself if it is in plain view, else the block in the way (never someone's build) */
function agMineTarget(a,c,st){
  const e=a.e,ex=e.x,ey=e.y+1.62,ez=e.z;
  const dx=c.x+0.5-ex,dy=c.y+0.5-ey,dz=c.z+0.5-ez,ds=Math.hypot(dx,dy,dz)||1;
  const h=raycastB(ex,ey,ez,dx/ds,dy/ds,dz/ds,ds+0.9);
  const unsafe=(x,y,z)=>nLeaky(x,y,z)||nb(x,y-1,z)===B.LAVA||agFloorOf(a,x,y,z);   /* don't open the sea, a floor over lava, or someone's floor */
  if(!h||(h.x===c.x&&h.y===c.y&&h.z===c.z))return unsafe(c.x,c.y,c.z)&&!FLOWER_IDS.has(c.id)?null:c;
  if((st.obs||0)>=10||!nBreakable(h.id)||!agReach(a,h.x,h.y,h.z)||unsafe(h.x,h.y,h.z))return null;
  const k=bkey(h.x,h.y,h.z);
  if(BOWN.has(k)&&OWN_NAMES[BOWN.get(k)]!==a.name)return null;
  return h;
}
/* is someone standing on this block? (another player: never mine it; yourself: only if the drop is short) */
function agFloorOf(a,x,y,z){
  /* standing on it, or in the air just above it (mid-jump, pillaring) */
  const on=(px,py,pz,hw)=>{const h=py-(y+1);return h>-0.05&&h<1.7&&Math.abs(px-(x+0.5))<0.5+hw&&Math.abs(pz-(z+0.5))<0.5+hw;};
  if(P&&!P.dead&&DIM===a.dim&&on(P.x,P.y,P.z,P.hw||0.3))return true;
  for(const en of entities){if(!en.bot||en.dead||!on(en.x,en.y,en.z,en.hw))continue;
    if(en!==a.e)return true;
    if(nFree(nb(x,y-1,z))&&nFree(nb(x,y-2,z)))return true;}
  return false;
}
function agGathered(a,st){let n=0;for(const o of st.outs)n+=(a.led.got[o]||0)-(st.base[o]||0);return n;}
SK.gather=(a,dt,s)=>{
  const st=s.st;
  if(!st.init){
    st.init=true;
    const g=agGatherSpec(a,s.a.item||s.a.target||s.a.note);
    if(!g)return 'fail:do not know how to gather '+(s.a.item||'that');
    if(g.kind==='craft')return 'fail:'+g.msg;
    st.kind=g.kind;
    if(g.ids){
      const drops=g.ids.filter(id=>blockDrop(id));
      if(!drops.length){const nm=DEFS[g.ids[0]].name;
        return 'fail:'+nm+' drops nothing when you break it'+(g.ids.includes(B.GLASS)?' - glass is made by smelting sand in a furnace':'')+' (no point mining it)';}
      const ok=drops.filter(id=>!DEFS[id].req||agCanHarvest(a,id));
      if(!ok.length)return 'fail:'+agToolHint(drops[0]);
      st.ids=ok;
      st.outs=[...new Set(ok.map(id=>blockDrop(id).id))];
      st.base={};for(const o of st.outs)st.base[o]=a.led.got[o]||0;
    }
  }
  if(st.kind==='wool')return SK.hunt(a,dt,s);
  if(st.kind==='liquid')return SK.fill(a,dt,s);
  const want=clamp(+s.a.count||8,1,64);
  const got=agGathered(a,st);
  if(got>=want)return 'done';
  if(!st.cell||getBlock(st.cell.x,st.cell.y,st.cell.z)!==st.cell.id){
    st.cell=null;
    const ok=st.ids.filter(id=>!DEFS[id].req||agCanHarvest(a,id));
    if(!ok.length){a.notes.push('You stopped gathering: '+agToolHint(st.ids[0]));return got>0?'done':'fail:'+agToolHint(st.ids[0]);}
    /* common blocks: what's in reach first; ores may be buried deeper and are worth the dig */
    const ore=ok.some(id=>id===B.COAL_ORE||id===B.IRON_ORE||id===B.GOLD_ORE||id===B.DIA_ORE||DEFS[id].pore===1);
    let c=agScanFor(a,ok,14,true,null,true)||agScanFor(a,ok,14,false,ore?-8:-4,true);
    /* trees can be a fair walk away: look further before giving up (a player would see them) */
    if(!c&&ok.some(id=>isLogId(id)||DEFS[id].ptree===1))c=agScanFor(a,ok,40,true,-6,true);
    if(!c)return got>0?'done':'fail:no '+(s.a.item||'of that')+' nearby';
    st.cell=c;st.mv={};st.obs=0;st.tries=st.tries||0;
  }
  const c=st.cell;
  if(agReach(a,c.x,c.y,c.z)){
    /* keep hitting the block already being broken (re-aiming every frame restarts the dig) */
    const k=a.act,cur=k&&k.k==='brk'?getBlock(k.x,k.y,k.z):-1;
    const t=(cur>0&&nBreakable(cur)&&agReach(a,k.x,k.y,k.z)&&Math.abs(k.x-c.x)+Math.abs(k.y-c.y)+Math.abs(k.z-c.z)<=3)?
      ((k.x===c.x&&k.y===c.y&&k.z===c.z)?c:{x:k.x,y:k.y,z:k.z}):agMineTarget(a,c,st);
    if(t){
      a.ctl.mx=a.ctl.mz=0;
      const tid=getBlock(t.x,t.y,t.z),dr=canHarvest(tid,agBestTool(a,tid))?blockDrop(tid):null;
      if(dr&&!agRoomFor(a,dr.id)){
        a.notes.push('Your inventory is full - store, give away or use things before gathering more');if(a.notes.length>8)a.notes.shift();
        return got>0?'done':'fail:your inventory is full';
      }
      if(agBreaking(a,dt,t.x,t.y,t.z)){if(t===c)st.cell=null;else st.obs=(st.obs||0)+1;}
      return 'run';
    }
  }
  const r=agMoveTo(a,dt,st.mv||(st.mv={}),c.x+0.5,c.z+0.5,1.6,agStandY(c));
  if(r.startsWith('fail')){agBadCell(a,c);st.cell=null;if(++st.tries>5)return got?'done':r;}
  else if(r==='done'){agBadCell(a,c);st.cell=null;st.mv={};if(++st.tries>10)return got?'done':'fail:could not get at any '+(s.a.item||'of it');}
  return 'run';
};
/* fill an empty bucket at water or lava (water stays put: an endless source; lava is scooped up) */
SK.fill=(a,dt,s)=>{
  const st=s.st;
  const l=(''+(s.a.item||s.a.target||s.a.note||'water')).toLowerCase();
  const liq=/lava/.test(l)?B.LAVA:B.WATER,lname=liq===B.LAVA?'lava':'water';
  const want=clamp(+s.a.count||1,1,16);
  if((st.n||0)>=want)return 'done';
  if(agHas(a,IT.BUCKET)<1)return st.n?'done':'fail:you need an empty Bucket to carry '+lname+' (3 iron ingots at a crafting table)';
  if(!st.cell||getBlock(st.cell.x,st.cell.y,st.cell.z)!==liq){
    const c=agScanFor(a,[liq],14,true);
    if(!c)return st.n?'done':'fail:no '+lname+' nearby';
    st.cell=c;st.mv={};st.wt=0;
  }
  const c=st.cell;
  if(agReach(a,c.x,c.y,c.z)&&agSeesCell(a,c.x,c.y,c.z)){
    a.ctl.mx=a.ctl.mz=0;a.look={x:c.x+0.5,y:c.y+0.5,z:c.z+0.5,t:AG_T+0.4};
    st.wt=(st.wt||0)+dt;if(st.wt<0.4)return 'run';
    if(liq===B.LAVA){ACTOR=a.name;try{setBlock(c.x,c.y,c.z,B.AIR);}finally{ACTOR=null;}}
    agConsume(a,IT.BUCKET,1);
    agGive(a,{id:liq===B.WATER?IT.BUCKET_W:IT.BUCKET_L,count:1},'bucket');
    st.n=(st.n||0)+1;st.cell=null;a.swing=1;
    playSAt('pop',c.x+0.5,c.y+0.5,c.z+0.5);
    agEvent(a,'You filled a bucket with '+lname,2);
    return 'run';
  }
  const r=agMoveTo(a,dt,st.mv||(st.mv={}),c.x+0.5,c.z+0.5,2.5,null);
  if(r.startsWith('fail')||r==='done'){agBadCell(a,c);st.cell=null;st.tries=(st.tries||0)+1;if(st.tries>5)return st.n?'done':'fail:could not reach the '+lname;}
  return 'run';
};
/* a liquid (or any) cell in plain view: nothing solid between the eye and it (water does not block a look) */
function agSeesCell(a,x,y,z){
  for(const [fx,fy,fz] of AG_AIM){
    const r=agEyeRay(a,x+fx,y+fy,z+fz);
    const h=raycastB(r.ox,r.oy,r.oz,r.ux,r.uy,r.uz,Math.max(0,r.ds-0.01));
    if(!h||(h.x===x&&h.y===y&&h.z===z))return true;
  }
  return false;
}
/* hunt mobs (food from animals, wool from sheep, gunpowder from boomers, string from spiders); creeper/creepers stay as input words */
const AG_HUNT={pig:'pig',pigs:'pig',cow:'cow',cows:'cow',sheep:'sheep',wool:'sheep',zombie:'zombie',zombies:'zombie',
  skeleton:'skel',skeletons:'skel',creeper:'boomer',creepers:'boomer',boomer:'boomer',spider:'spider',spiders:'spider',
  food:'pig|cow|sheep',meat:'pig|cow|sheep',animal:'pig|cow|sheep',gunpowder:'boomer',string:'spider',mob:'zombie|skel|spider|boomer'};
function agNearDrop(a,R,fresh){
  const e=a.e;let best=null,bd=R;
  for(const d of entities){if(d.t!=='drop'||d.dead||(!fresh&&d.age<0.3))continue;
    if(d.giver===a.name&&AG_T-(d.giveT||0)<6)continue;
    const dd=Math.hypot(d.x-e.x,d.z-e.z);
    if(dd<bd&&Math.abs(d.y-e.y)<(fresh?5:3)&&agRoomFor(a,d.st.id)){bd=dd;best=d;}}
  return best;
}
SK.hunt=(a,dt,s)=>{
  const k=(''+(s.a.target||s.a.item||'food')).toLowerCase().replace(/[^a-z]/g,'');
  const kinds=(AG_HUNT[k]||'pig|cow|sheep').split('|');
  const want=clamp(+s.a.count||2,1,10);
  const wool=s.st.kind==='wool'||k==='wool';
  if(wool&&s.st.wbase==null)s.st.wbase=a.led.got[B.WOOL]||0;
  let tgt=s.st.tgt;
  if(tgt&&tgt.dead){s.st.kills=(s.st.kills||0)+1;s.st.tgt=tgt=null;s.st.loot=AG_T+8;s.st.lootFrom=AG_T;s.st.lmv={};}
  /* walk over the loot before moving on (it is only yours if you pick it up) - fresh drops included */
  if(s.st.loot>AG_T){const dr=agNearDrop(a,8,true);
    if(dr){const dd=Math.hypot(dr.x-a.e.x,dr.z-a.e.z),dy=dr.y-a.e.y;
      if(Math.abs(dy)>1.2){agMoveTo(a,dt,s.st.lmv||(s.st.lmv={}),dr.x,dr.z,0.4,Math.floor(dr.y+0.1));}   /* it landed on a ledge: climb to it */
      else{if(dd>0.3)agSteer(a,dr.x,dr.z,dd>1?1:0.4);else a.ctl.mx=a.ctl.mz=0;if(a.e.wall&&a.e.onGround)a.ctl.jump=true;}
      a.look={x:dr.x,y:dr.y,z:dr.z,t:AG_T+0.3};return 'run';}
    if(AG_T<(s.st.lootFrom||0)+1.5){a.ctl.mx=a.ctl.mz=0;return 'run';}   /* the drop may still be on its way out */
    s.st.loot=0;}
  const got=wool?(a.led.got[B.WOOL]||0)-s.st.wbase:(s.st.kills||0);
  if(got>=want)return 'done';
  if(!tgt){
    let bd=40;
    for(const m of entities)if(m.t==='mob'&&!m.dead&&!m.bot&&kinds.includes(m.mt)){const d=Math.hypot(m.x-a.e.x,m.z-a.e.z);if(d<bd){bd=d;tgt=m;}}
    s.st.tgt=tgt;s.st.mv=null;
    if(!tgt)return got>0?'done':'fail:no '+k+' around';
  }
  return agFight(a,dt,s.st,tgt,false)==='fail'?'fail:lost it':'run';
};
SK.give=(a,dt,s)=>{
  const p=agTargetPos(a,s.a.target);
  if(!p)return 'fail:cannot find '+(s.a.target||'them');
  const id=agItemId(a,s.a.item);
  if(id==null)return 'fail:you do not have '+(s.a.item||'that');
  /* "arrived" = within 2.6 m, or the walker said this is as close as it gets (then a firmer toss covers the gap).
     The arrival lives on the move state: the target walking off (a new move) or a reflex (a fresh one) forgets it. */
  if(!s.st.mv||Math.hypot(p.x-(s.st.mv.gx||0),p.z-(s.st.mv.gz||0))>2)s.st.mv={gx:p.x,gz:p.z};
  const mv=s.st.mv;
  if(agDist(a,p.x,p.z)>2.6&&!(mv.at&&agDist(a,p.x,p.z)<5)){
    const r=agMoveTo(a,dt,mv,p.x,p.z,2,null);
    if(r!=='done')return r.startsWith('fail')?r:'run';
    if(agDist(a,p.x,p.z)>=5){s.st.mv=null;return 'run';}
    mv.at=true;}
  a.ctl.mx=a.ctl.mz=0;a.look={x:p.x,y:p.y+1,z:p.z,t:AG_T+0.6};
  if(s.t<0.7)return 'run';
  const n=Math.min(clamp(+s.a.count||1,1,64),agHas(a,id));
  if(n<=0)return 'fail:you have none';
  const e=a.e,dx=p.x-e.x,dz=p.z-e.z,dd=Math.hypot(dx,dz)||1;
  const hs=clamp((dd-1)/0.55,3,6);         /* lands about at their feet (never harder than Dan can throw: 6) */
  for(const st0 of agTake(a,id,n)){
    spawnDrop(e.x+dx/dd*0.5,e.y+1.3,e.z+dz/dd*0.5,st0,dx/dd*hs,2.5,dz/dd*hs);
    const de=entities[entities.length-1];if(de&&de.t==='drop'){de.giver=a.name;de.giveT=AG_T;}
  }
  a.swing=1;playSAt('pop',e.x,e.y+1,e.z);
  agEvent(a,'You gave '+p.who+' '+n+' '+DEFS[id].name,3,p.who);
  agGiftNote(a.name,p.who,id,n);
  return 'done';
};
/* an item the agent actually carries, by (loose) name */
function agItemId(a,name){
  if(name==null)return null;
  if(typeof name==='number')return agHas(a,name)>0?name:null;
  const l=(''+name).toLowerCase().replace(/s$/,'').trim();
  if(!l)return null;
  let best=null;
  for(const st of a.inv){if(!st)continue;const n=DEFS[st.id].name.toLowerCase();
    if(n===l||n.replace(/s$/,'')===l)return st.id;if(best==null&&n.includes(l))best=st.id;}
  return best;
}
SK.eat=(a,dt,s)=>{
  let food=null;for(const st of a.inv)if(st&&DEFS[st.id].food&&(!food||DEFS[st.id].food>DEFS[food.id].food))food=st;
  if(!food)return 'fail:no food';
  if((a.hunger==null?20:a.hunger)>=20)return s.st.ate?'done':'fail:you are not hungry (hunger 20/20) - you heal by yourself while your hunger is 16 or more';
  a.ctl.mx=a.ctl.mz=0;a.swing=Math.max(a.swing,0.3);
  if(frameCount%8===0)playSAt('eat',a.x,a.y+1.5,a.z);
  if((s.st.et=(s.st.et||0)+dt)<1.6)return 'run';
  s.st.et=0;s.st.ate=(s.st.ate||0)+1;
  const id=food.id,v=DEFS[id].food;agConsume(a,id,1);a.hunger=Math.min(20,(a.hunger||0)+v);
  if(a.e)playSAt('burp',a.e.x,a.e.y+1.5,a.e.z);
  /* keep eating while still hungry and there is food (count = how many at most) */
  const more=a.hunger<20&&a.inv.some(q=>q&&DEFS[q.id].food)&&s.st.ate<clamp(+s.a.count||3,1,8);
  return more?'run':'done';
};
/* put your (real) bed down: that is where you respawn from now on */
SK.sethome=(a,dt,s)=>{
  const e=a.e;
  if(agHas(a,B.BED)<1){
    const er=agCraft(a,'Bed',1);
    if(er)return 'fail:you have no bed - craft one from 3 wool + 3 planks (wool from sheep, or 4 string each): '+er;
  }
  const tx=Math.floor(e.x),ty=Math.floor(e.y),tz=Math.floor(e.z);
  for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){
    const x=tx+dx,z=tz+dz;
    if(getBlock(x,ty,z)===B.AIR&&solidAt(x,ty-1,z)){
      a.look={x:x+0.5,y:ty,z:z+0.5,t:AG_T+0.5};
      if(agPlaceBlock(a,x,ty,z,B.BED)===''){a.home=[x+0.5,ty+1.1,z+0.5];a.spawn=a.home.slice();
        agEvent(a,'You put down your bed here - this is home now (you respawn here)',3);return 'done';}
    }
  }
  const p=agPlaceNear(a,B.BED);
  if(p){a.home=[p.x+0.5,p.y+1.1,p.z+0.5];a.spawn=a.home.slice();agEvent(a,'You put down your bed here - this is home now (you respawn here)',3);return 'done';}
  return 'fail:no room to put your bed down here';
};
SK.craft=(a,dt,s)=>{
  if(a.dim==='puppet')return purgSkCraft(a,dt,s);
  const st=s.st,e=a.e;
  if(!st.init){
    st.init=true;
    const id=agRecipeOut(s.a.item,a);
    if(id==null)return 'fail:no recipe for '+(s.a.item||'that');
    st.big=agRecipeBig(agRecipeFor(id));
  }
  /* a 3x3 recipe and your table is over there: walk back to it like a player would (and stay put once there) */
  if(st.big&&!st.noWalk&&!(agTableNear(a)&&e.onGround)){
    const t=st.go||(st.go=agKnownBlock(a,B.CRAFT,'myTable'));
    if(t&&getBlock(t.x,t.y,t.z)===B.CRAFT){
      st.ct=0;st.wk=(st.wk||0)+dt;
      const ap=agApproach(a,dt,st,t.x,t.y,t.z,{what:'your crafting table',r:1.5});
      /* can't get at it (or it takes too long): make a new one here instead */
      if(ap.startsWith('fail')||st.wk>20||((st.amv&&st.amv.stucks)||0)>=2)st.noWalk=true;
      return 'run';
    }
    st.noWalk=true;
  }
  a.ctl.mx=a.ctl.mz=0;
  st.ct=(st.ct||0)+dt;
  if(st.ct<0.5){a.swing=Math.max(a.swing,0.35);return 'run';}
  const out=agCraft(a,s.a.item,clamp(+s.a.count||1,1,64));
  if(out)return 'fail:'+out;
  a.swing=1;agAutoEquip(a);
  return 'done';
};
/* a crafting table / furnace this agent can walk back to: its own last one, else any within 16 */
function agKnownBlock(a,id,slot,ok){
  const m=a[slot];
  if(m&&getBlock(m.x,m.y,m.z)===id&&agDist(a,m.x+0.5,m.z+0.5)<40&&(!ok||ok(m.x,m.y,m.z)))return m;
  return agFindNear(a,id,16,ok);
}
SK.equip=(a,dt,s)=>{agAutoEquip(a,s.a.item);return 'done';};

/* ----- crafting exactly like a player: real ingredients, 2x2 anywhere, 3x3 at a crafting table ----- */
const PLANK_OF={[B.LOG_O]:B.PLANK_O,[B.LOG_B]:B.PLANK_B,[B.LOG_S]:B.PLANK_S};
/* a recipe only counts if Dan's crafting grid really makes it (8 planks in a ring is a Chest, never a Display Shelf) */
const _recOK=new Map();
function agRecipeWorks(r){
  if(_recOK.has(r))return _recOK.get(r);
  const rep=k=>typeof k==='string'?GROUPS[k][0]:k;
  let ok=false;
  for(const w of [2,3]){
    const grid=Array(w*w).fill(null);
    if(r.s){if(r.s.length>w*w)continue;r.s.forEach((k,i)=>{grid[i]={id:rep(k),count:1};});}
    else{if(r.p.length>w||r.p[0].length>w)continue;
      for(let y=0;y<r.p.length;y++)for(let x=0;x<r.p[y].length;x++){const ch=r.p[y][x];if(ch!==' ')grid[y*w+x]={id:rep(r.k[ch]),count:1};}}
    const res=calcCraft(grid,w);ok=!!res&&res.id===r.o;break;
  }
  _recOK.set(r,ok);return ok;
}
function agRecipeFor(id){if(DIM==='puppet')return purgRecipeFor(id);return RECIPES.find(q=>q.o===id&&agRecipeWorks(q))||null;}
function agRecipeNeed(r){
  const m=new Map();const add=q=>{if(q==null)return;m.set(q,(m.get(q)||0)+1);};
  if(r.s)r.s.forEach(add);else for(const row of r.p)for(const ch of row)if(ch!==' ')add(r.k[ch]);
  /* sticks first: making them eats planks, so the plank check must come after */
  return new Map([...m].sort((x,y)=>(x[0]===IT.STICK?0:1)-(y[0]===IT.STICK?0:1)));
}
function agRecipeBig(r){if(r.s)return r.s.length>4;return r.p.length>2||r.p[0].length>2;}
function agIngName(k){return k==='planks'?'Planks':k==='logs'?'Logs':DEFS[k].name;}
/* the nearest block of a kind within R of the agent's eyes */
function agFindNear(a,id,R,ok){
  const e=a.e;if(!e)return null;
  const ex=e.x,ey=e.y+1.5,ez=e.z,cx=Math.floor(ex),cy=Math.floor(ey),cz=Math.floor(ez),r=Math.ceil(R);
  let best=null,bd=R+0.01;
  for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)for(let dz=-r;dz<=r;dz++){
    const x=cx+dx,y=cy+dy,z=cz+dz;
    if(nb(x,y,z)!==id)continue;
    const d=Math.hypot(x+0.5-ex,y+0.5-ey,z+0.5-ez);
    if(d<bd&&(!ok||ok(x,y,z))){bd=d;best={x,y,z};}
  }
  return best;
}
/* put a block down right next to the agent (crafting table, furnace, chest, bed) */
function agPlaceNear(a,id){
  const e=a.e;if(!e)return null;
  const fx=Math.floor(e.x),fy=Math.floor(e.y+0.05),fz=Math.floor(e.z);
  const ring=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[0,2],[-2,0],[0,-2]];
  for(const dy of [0,1,-1])for(const [dx,dz] of ring){
    const x=fx+dx,y=fy+dy,z=fz+dz;
    const cur=getBlock(x,y,z);
    if(cur===-1||!(cur===B.AIR||(DEFS[cur]&&DEFS[cur].replace)))continue;
    if(!solidAt(x,y-1,z))continue;
    if(!agReach(a,x,y,z))continue;
    if(agPlaceBlock(a,x,y,z,id)===''){a.look={x:x+0.5,y:y+0.5,z:z+0.5,t:AG_T+0.6};return {x,y,z};}
  }
  return null;
}
/* dry-run a craft on a copy of the inventory: auto-makes planks from logs and sticks from planks,
   and (o.needTable) a crafting table first. Returns {err,inv,steps}. */
function agCraftSim(a,id,n,o){
  o=o||{};
  const inv=a.inv.map(s=>s?{...s}:null),steps=[];
  if(o.extraLogs)inv.push({id:B.LOG_O,count:o.extraLogs});   /* "how many more logs would do it?" */
  const cnt=k=>typeof k==='string'?GROUPS[k].reduce((t,i)=>t+invCount(inv,i),0):invCount(inv,k);
  const take=(k,c)=>{
    if(typeof k!=='string'){invConsume(inv,k,c);return;}
    while(c>0){let best=null,bn=0;for(const i of GROUPS[k]){const h=invCount(inv,i);if(h>bn){bn=h;best=i;}}
      if(best==null)return;const m=Math.min(bn,c);invConsume(inv,best,m);c-=m;}
  };
  const planks=short=>{
    const need=Math.ceil(short/4),logs=cnt('logs');
    if(logs<need){const m=need-logs;return 'need '+m+' more log'+(m>1?'s':'')+' (have '+logs+' log'+(logs===1?'':'s')+' + '+cnt('planks')+' planks; 1 log = 4 planks)';}
    let k=need;
    while(k>0){let best=null,bn=0;for(const i of GROUPS.logs){const h=invCount(inv,i);if(h>bn){bn=h;best=i;}}
      const m=Math.min(bn,k);invConsume(inv,best,m);
      if(invAddTo(inv,{id:PLANK_OF[best],count:m*4})>0)return 'your inventory is full';
      steps.push({id:PLANK_OF[best],n:m*4});k-=m;}
    return '';
  };
  const make=(id,want,depth)=>{
    const r=agRecipeFor(id);if(!r)return 'no recipe for '+DEFS[id].name;
    const times=Math.ceil(want/r.n),need=agRecipeNeed(r);
    /* every missing ingredient, not just the first (8 torches: the coal AND the sticks) */
    const errs=[];
    for(const [k,c] of need){
      const tot=c*times,h=cnt(k);
      if(h>=tot)continue;
      let e;
      if(k==='planks')e=planks(tot-h);
      else if(k===IT.STICK&&depth<2)e=make(IT.STICK,tot-h,depth+1);
      else e='need '+(tot-h)+' more '+agIngName(k)+' (have '+h+')';
      if(e&&!errs.includes(e))errs.push(e);
    }
    if(errs.length){const wood=errs.filter(e=>/more logs?\b|more Planks/.test(e));return errs.filter(e=>!wood.includes(e)).concat(wood).join(' and ');}
    for(const [k,c] of need){const tot=c*times,h=cnt(k);
      if(h<tot)return 'need '+(tot-h)+' more '+agIngName(k)+' (have '+h+')';}
    for(const [k,c] of need)take(k,c*times);
    const res=mkResult(r);res.count=r.n*times;
    if(invAddTo(inv,res)>0)return 'your inventory is full';
    steps.push({id,n:r.n*times});
    return '';
  };
  if(o.needTable){
    if(invCount(inv,B.CRAFT)>0)invConsume(inv,B.CRAFT,1);
    else{const e=make(B.CRAFT,1,1);if(e)return {err:'needs a crafting table (4 planks): '+e,inv,steps};invConsume(inv,B.CRAFT,1);}
  }
  const err=make(id,n,0);
  return {err,inv,steps};
}
function agInvCounts(inv){const m={};for(const s of inv)if(s)m[s.id]=(m[s.id]||0)+s.count;return m;}
function agCraftCommit(a,plan){
  const before=agInvCounts(a.inv),after=agInvCounts(plan.inv);
  for(let i=0;i<a.inv.length;i++)a.inv[i]=plan.inv[i]||null;
  for(const id in before){const d=(after[id]||0)-before[id];if(d<0)agLed(a,'used',+id,-d);}
  for(const id in after){const d=after[id]-(before[id]||0);if(d>0)agLed(a,'got',+id,d,'craft');}
  if(a._tc)a._tc.f=-1;
}
function agTableNear(a){return !!agFindNear(a,B.CRAFT,5,(x,y,z)=>agCanTouch(a,x,y,z));}   /* in reach AND in view */
/* "planks" from whatever logs you carry (oak, birch and spruce all count) */
function agCraftPlanks(a,n){
  let lg=0;for(const i of GROUPS.logs)lg+=agHas(a,i);
  if(!lg)return 'need 1 more log (have 0 logs; 1 log = 4 planks)';
  let left=Math.min(Math.ceil(n/4),lg),made=0;
  for(const i of GROUPS.logs){const k=Math.min(agHas(a,i),left);if(k<=0)continue;
    const p=agCraftSim(a,PLANK_OF[i],k*4,{});if(p.err)return made?'':p.err;agCraftCommit(a,p);made+=k*4;left-=k;if(left<=0)break;}
  agEvent(a,'You crafted '+made+' Planks',2);
  return '';
}
/* craft n of an item from the agent's own stuff; '' or the exact shortfall */
function agCraft(a,name,n){
  if(/^\s*(wood(en)?\s+)?planks?\s*$/i.test(''+(name||'')))return agCraftPlanks(a,Math.max(1,n|0||1));
  const id=agRecipeOut(name,a);
  if(id==null)return 'no recipe for '+(name||'that');
  n=Math.max(1,n|0||1);
  const r=agRecipeFor(id),big=agRecipeBig(r);
  const tableNear=!big||agTableNear(a);
  const plan=agCraftSim(a,id,n,{needTable:!tableNear});
  if(plan.err)return agCraftShortfall(a,id,n,!tableNear,plan.err);
  if(!tableNear){
    if(agHas(a,B.CRAFT)<1){
      const p1=agCraftSim(a,B.CRAFT,1,{});
      if(p1.err)return 'needs a crafting table: '+p1.err;
      agCraftCommit(a,p1);agEvent(a,'You crafted a Crafting Table',2);
    }
    const tp=agPlaceNear(a,B.CRAFT);
    if(!tp)return DEFS[id].name+' needs a crafting table and there is no room to put yours down here';
    a.myTable=tp;agEvent(a,'You put down a Crafting Table',2);
  }
  const p2=agCraftSim(a,id,n,{});
  if(p2.err)return p2.err;
  agCraftCommit(a,p2);
  const made=p2.steps.length?p2.steps[p2.steps.length-1].n:n;
  const extra=p2.steps.slice(0,-1).map(q=>q.n+' '+DEFS[q.id].name);
  agEvent(a,'You crafted '+made+' '+DEFS[id].name+(extra.length?' (made '+extra.join(', ')+' on the way)':''),2);
  return '';
}
/* wood shortfalls in plain numbers against what the agent really has (planks and sticks included) */
function agCraftShortfall(a,id,n,needTable,err){
  if(!/more log|more Planks/.test(err))return err;
  for(let k=1;k<=24;k++){
    const e2=agCraftSim(a,id,n,{needTable,extraLogs:k}).err;
    if(e2&&/more log|more Planks/.test(e2))continue;     /* still short of wood: try more logs */
    let lg=0,pl=0;for(const i of GROUPS.logs)lg+=agHas(a,i);for(const i of GROUPS.planks)pl+=agHas(a,i);
    const wood='need '+k+' more log'+(k>1?'s':'')+' (have '+lg+' log'+(lg===1?'':'s')+' + '+pl+' planks; 1 log = 4 planks'+(needTable?', and that includes a crafting table':'')+')';
    return e2?e2+' and '+wood:wood;          /* the other shortfalls (coal, cobblestone...) come first */
  }
  return err;
}
function agNameTok(w){if(/(ch|sh|x)es$/.test(w))return w.slice(0,-2);if(w.length>3&&/s$/.test(w)&&!/ss$/.test(w))return w.slice(0,-1);return w;}
/* recipe output by loose name ("wood pickaxe", "torches", "planks" = the kind your logs make) */
function agRecipeOut(name,a){
  if(DIM==='puppet')return purgRecipeOut(name,a);
  if(name==null)return null;
  const l=(''+name).toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim();
  if(!l)return null;
  if(/^(wood(en)? )?planks?$/.test(l)){
    let best=B.LOG_O,bn=-1;if(a)for(const lg of GROUPS.logs){const h=agHas(a,lg);if(h>bn){bn=h;best=lg;}}
    return PLANK_OF[best];
  }
  if(/^(crafting )?table$|^workbench$/.test(l))return B.CRAFT;
  const toks=l.split(' ').map(agNameTok).map(t=>t==='wood'?'wooden':t==='gold'?'golden':t);
  const cand=[];
  for(const r of RECIPES){const d=DEFS[r.o];if(!d||cand.includes(r.o)||!agRecipeWorks(r))continue;const n=d.name.toLowerCase();
    if(n===l||agNameTok(n)===agNameTok(l))return r.o;
    const words=n.split(' ');
    if(toks.every(t=>words.some(w=>w.startsWith(t))||(t==='wooden'&&words.includes('wood'))))cand.push(r.o);}
  if(!cand.length)return null;
  /* "sword", "pickaxe": the best one you can actually make right now, else the simplest name */
  const val=id=>{const d=DEFS[id];return d.tool?(d.tool.tier*10+d.tool.mult):d.armor?ARM_M[d.armor.m].pts:0;};
  cand.sort((x,y)=>val(y)-val(x)||DEFS[x].name.length-DEFS[y].name.length);
  if(a&&cand.length>1){const tn=agTableNear(a);
    for(const id of cand){const r=agRecipeFor(id);if(!agCraftSim(a,id,1,{needTable:agRecipeBig(r)&&!tn}).err)return id;}}
  return cand.slice().sort((x,y)=>val(x)-val(y)||DEFS[x].name.length-DEFS[y].name.length)[0];
}

/* ----- smelting in a REAL furnace: input + fuel in, furnaceTick cooks it, take the output ----- */
const AG_SMELT_ALIAS={iron:B.IRON_ORE,'iron ore':B.IRON_ORE,'iron ingot':B.IRON_ORE,gold:B.GOLD_ORE,'gold ore':B.GOLD_ORE,'gold ingot':B.GOLD_ORE,
  sand:B.SAND,glass:B.SAND,cobblestone:B.COBBLE,cobble:B.COBBLE,stone:B.COBBLE,clay:IT.CLAYBALL,'clay ball':IT.CLAYBALL,brick:IT.CLAYBALL,
  pork:IT.PORK,porkchop:IT.PORK,'raw pork':IT.PORK,'raw porkchop':IT.PORK,beef:IT.BEEF,'raw beef':IT.BEEF,steak:IT.BEEF};
const AG_FUEL_ORDER=[IT.COAL,B.PLANK_O,B.PLANK_B,B.PLANK_S,B.LOG_O,B.LOG_B,B.LOG_S,IT.STICK];
function agSmeltIn(a,name){
  const l=(''+(name||'')).toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim().replace(/s$/,'');
  if(!l)return null;
  if(/\b(log|wood|charcoal)\b/.test(l)){let best=null,bn=0;for(const lg of GROUPS.logs){const h=agHas(a,lg);if(h>bn){bn=h;best=lg;}}return best||B.LOG_O;}
  if(/\b(meat|food)\b/.test(l))return agHas(a,IT.BEEF)>agHas(a,IT.PORK)?IT.BEEF:IT.PORK;
  if(AG_SMELT_ALIAS[l]!=null)return AG_SMELT_ALIAS[l];
  for(const k in SMELT){const id=+k,n=DEFS[id].name.toLowerCase(),o=DEFS[SMELT[k]].name.toLowerCase();
    if(n===l||o===l||n.includes(l)||o.includes(l))return id;}
  return null;
}
function agFuelSecs(a,exclude){let t=0;for(const id of AG_FUEL_ORDER)if(id!==exclude)t+=agHas(a,id)*FUELS[id];return t;}
/* who has what cooking in which furnace: an agent only ever takes ITS OWN share back out
   (bkey -> {who,inId,outId,loaded,made,fuel:{id:n}}; session only) */
const FSHARE=new Map();
function agFurnaceMine(a,x,y,z){const k=bkey(x,y,z),sh=FSHARE.get(k);
  return (sh&&sh.who===a.name)||(BOWN.has(k)&&OWN_NAMES[BOWN.get(k)]===a.name&&!(sh&&sh.who!==a.name));}
function agFurnaceEmpty(be){return !be||(!be.in&&!be.out&&!be.fuel&&!(be.burn>0));}
/* may this agent use the furnace for inId? Its own (or one with its own share in it) when the contents
   fit, or one that is completely empty. Never one with someone else's ore, ingots or fuel inside. */
function agFurnaceOK(a,x,y,z,inId,outId){
  const k=bkey(x,y,z),be=blockEnts.get(k),sh=FSHARE.get(k);
  if(agFurnaceEmpty(be)){if(sh&&sh.who!==a.name)FSHARE.delete(k);return true;}
  if(sh&&sh.who!==a.name)return false;
  if(!agFurnaceMine(a,x,y,z))return false;
  return (!be.in||be.in.id===inId)&&(!be.out||be.out.id===outId)&&(!be.fuel||AG_FUEL_ORDER.includes(be.fuel.id));
}
/* put fuel in, best first (coal, then planks/logs, then sticks) - never the thing being smelted */
function agFuelUp(a,be,st,sh,needSec){
  if(needSec<=0)return true;
  for(const id of AG_FUEL_ORDER){
    if(id===st.in)continue;
    const h=agHas(a,id);if(!h)continue;
    if(be.fuel&&be.fuel.id!==id)continue;
    const room=stackMax(id)-(be.fuel?be.fuel.count:0);
    const k=Math.min(h,Math.ceil(needSec/FUELS[id]),room);if(k<=0)continue;
    agTake(a,id,k);
    if(be.fuel)be.fuel.count+=k;else be.fuel={id,count:k};
    sh.fuel[id]=(sh.fuel[id]||0)+k;
    return true;
  }
  return false;
}
function agFurnaceRedraw(be){if(MODAL.kind==='furnace'&&MODAL.be===be)redrawModal();}
/* take your finished items (never more than you put in) */
function agSmeltCollect(a,st,be,sh){
  if(!be.out||be.out.id!==st.out)return 0;
  const mine=Math.min(be.out.count,sh.loaded-sh.made);if(mine<=0)return 0;
  const left=agGive(a,{id:be.out.id,count:mine},'smelt'),got=mine-left;
  sh.made+=got;st.made=(st.made||0)+got;be.out.count-=got;if(be.out.count<=0)be.out=null;
  agFurnaceRedraw(be);
  return left;
}
function agSmeltDone(a,st,be,sh,why){
  if(be&&sh){
    if(agSmeltCollect(a,st,be,sh)>0&&!why)why='your inventory is full';
    /* stopping early: your own unsmelted input comes back, nobody else's */
    if(why&&be.in&&be.in.id===st.in){const mine=Math.min(be.in.count,sh.loaded-sh.made);
      if(mine>0){const left=agGive(a,{id:be.in.id,count:mine},'furnace'),got=mine-left;be.in.count-=got;sh.loaded-=got;if(be.in.count<=0)be.in=null;}}
    /* and your own leftover fuel */
    if(be.fuel&&sh.fuel[be.fuel.id]){const fid=be.fuel.id,k=Math.min(be.fuel.count,sh.fuel[fid]);
      const left=agGive(a,{id:fid,count:k},'furnace'),got=k-left;be.fuel.count-=got;sh.fuel[fid]-=got;if(be.fuel.count<=0)be.fuel=null;}
    if(sh.made>=sh.loaded&&st.fk)FSHARE.delete(st.fk);
    agFurnaceRedraw(be);
  }
  const made=st.made||0;
  if(made)agEvent(a,'You smelted '+made+' '+DEFS[st.out].name+(why?' ('+why+')':''),3);
  if(why){a.notes.push('Smelting stopped: '+why);if(a.notes.length>8)a.notes.shift();}
  return made?'done':'fail:'+(why||'nothing came out');
}
SK.smelt=(a,dt,s)=>{
  if(a.dim==='puppet')return purgSkSmelt(a,dt,s);
  const st=s.st;
  if(!st.init){
    st.init=true;
    const inId=agSmeltIn(a,s.a.item||s.a.target||s.a.note);
    if(inId==null||SMELT[inId]===undefined)return 'fail:nothing to smelt - that does not go in a furnace ('+(s.a.item||'?')+')';
    if(agHas(a,inId)<1)return 'fail:nothing to smelt (you have no '+DEFS[inId].name+')';
    st.in=inId;st.out=SMELT[inId];
    st.want=clamp(+s.a.count||agHas(a,inId),1,64);
    const ok=(x,y,z)=>agFurnaceOK(a,x,y,z,inId,st.out);
    const mine=(x,y,z)=>ok(x,y,z)&&agFurnaceMine(a,x,y,z);
    /* your own furnace close by; else put down the one you carry; else your own one further off;
       else an EMPTY furnace someone left around; else craft one from 8 cobblestone */
    let f=agFindNear(a,B.FURNACE,5,mine);
    if(!f&&agHas(a,B.FURNACE)>0){f=agPlaceNear(a,B.FURNACE);if(f){a.myFurnace=f;agEvent(a,'You put down a Furnace',2);}}
    if(!f)f=agKnownBlock(a,B.FURNACE,'myFurnace',mine);
    if(!f)f=agFindNear(a,B.FURNACE,16,ok);
    const fuelOwn=agFuelSecs(a,inId);
    const fb=f?blockEnts.get(bkey(f.x,f.y,f.z)):null;
    if(fuelOwn<SMELT_TIME&&!(f&&fb&&agFurnaceMine(a,f.x,f.y,f.z)&&((fb.burn||0)>0||fb.fuel)))
      return 'fail:no fuel - you need coal, planks, logs or sticks to burn';
    if(!f){
      if(agHas(a,B.FURNACE)<1){
        const er=agCraft(a,'Furnace',1);
        if(er)return 'fail:no furnace of yours nearby and you cannot make one: '+er;
      }
      f=agPlaceNear(a,B.FURNACE);
      if(!f)return 'fail:no room to put a furnace down here';
      a.myFurnace=f;
      agEvent(a,'You put down a Furnace',2);
      if(agHas(a,inId)<1)return 'fail:nothing left to smelt after making the furnace';
    }
    st.f=f;st.fk=bkey(f.x,f.y,f.z);st.phase='load';
  }
  const f=st.f;
  if(getBlock(f.x,f.y,f.z)!==B.FURNACE)return st.made?'done':'fail:the furnace is gone';
  const ap=agApproach(a,dt,st,f.x,f.y,f.z,{what:'the furnace',r:1.8});
  if(ap!=='ok')return ap;
  a.ctl.mx=a.ctl.mz=0;a.look={x:f.x+0.5,y:f.y+0.5,z:f.z+0.5,t:AG_T+0.5};
  const be=ensureBE(f.x,f.y,f.z,'furnace');
  let sh=FSHARE.get(st.fk);
  if(st.phase==='load'){
    if(!agFurnaceOK(a,f.x,f.y,f.z,st.in,st.out))return 'fail:someone else is using that furnace';
    if(!sh||sh.who!==a.name||sh.inId!==st.in||agFurnaceEmpty(be)){
      /* leftovers in your OWN furnace are yours; a borrowed furnace starts empty */
      sh={who:a.name,inId:st.in,outId:st.out,loaded:0,made:0,fuel:{}};
      if(agFurnaceMine(a,f.x,f.y,f.z)){sh.loaded=(be.in?be.in.count:0)+(be.out?be.out.count:0);if(be.fuel)sh.fuel[be.fuel.id]=be.fuel.count;}
      FSHARE.set(st.fk,sh);
    }
    const room=stackMax(st.in)-(be.in?be.in.count:0);
    let n=Math.min(st.want,agHas(a,st.in),room);
    if(n<=0&&!be.in)return 'fail:nothing to smelt (you have no '+DEFS[st.in].name+')';
    /* fuel in the furnace is all yours here (it was empty, or it is your own) */
    const inF=(be.burn||0)+(be.fuel&&FUELS[be.fuel.id]?FUELS[be.fuel.id]*be.fuel.count:0);
    const fuel=agFuelSecs(a,st.in)+inF;
    n=Math.max(0,Math.min(n,Math.floor(fuel/SMELT_TIME)-(be.in?be.in.count:0)));
    if(n<=0&&!be.in)return 'fail:no fuel - you need coal, planks, logs or sticks to burn';
    if(n>0){agTake(a,st.in,n);
      if(be.in)be.in.count+=n;else be.in={id:st.in,count:n};
      sh.loaded+=n;}
    agFuelUp(a,be,st,sh,(be.in?be.in.count:0)*SMELT_TIME-inF);
    st.loaded=n;st.phase='wait';a.swing=1;
    if(n>0)agEvent(a,'You put '+n+' '+DEFS[st.in].name+' in the furnace',2);
    agFurnaceRedraw(be);
    return 'run';
  }
  if(!sh||sh.who!==a.name)return agSmeltDone(a,st,be,null,'someone else took over the furnace');
  /* waiting by the furnace: grab YOUR output as it comes */
  if(agSmeltCollect(a,st,be,sh)>0)return agSmeltDone(a,st,be,sh,'your inventory is full');
  if(sh.made>=sh.loaded)return agSmeltDone(a,st,be,sh,null);
  if(!be.in||be.in.id!==st.in)return agSmeltDone(a,st,be,sh,null);
  if(be.burn<=0&&!be.fuel&&!agFuelUp(a,be,st,sh,Math.min(be.in.count,sh.loaded-sh.made)*SMELT_TIME))return agSmeltDone(a,st,be,sh,'ran out of fuel');
  if(frameCount%40===0)a.swing=Math.max(a.swing,0.2);
  return 'run';
};
/* get a hand on block (x,y,z): 'ok' once it is in reach AND in view. Otherwise walk closer, or dig
   through what is in the way when allowed (natural ground or your own blocks; anyone's when o.grief). */
function agApproach(a,dt,st,x,y,z,o){
  o=o||{};
  const e=a.e;
  /* in view - unless only from the top of a jump in the middle of a climb: finish the step first */
  if(agCanTouch(a,x,y,z)&&(e.onGround||!a.path||a.pi>=a.path.length))return 'ok';
  if(e.onGround&&!agCanTouch(a,x,y,z)&&agReach(a,x,y,z)&&(st.adig||0)<8&&!(a.path&&a.path[a.pi]&&a.path[a.pi].m==='p')){   /* not mid-jump or mid-pillar */
    const r=agEyeRay(a,x+0.5,y+0.5,z+0.5);
    const h=raycastB(r.ox,r.oy,r.oz,r.ux,r.uy,r.uz,r.ds+0.9);
    if(h&&!(h.x===x&&h.y===y&&h.z===z)&&nBreakable(h.id)&&agReach(a,h.x,h.y,h.z)&&!nLeaky(h.x,h.y,h.z)&&
       !agFloorOf(a,h.x,h.y,h.z)&&(o.grief||!nTheirs(a,h.x,h.y,h.z))&&agBT(a,h.id)<20){
      a.ctl.mx=a.ctl.mz=0;
      if(agBreaking(a,dt,h.x,h.y,h.z))st.adig=(st.adig||0)+1;
      return 'run';
    }
  }
  const mv=st.amv||(st.amv={});
  const rr=st.ar!=null?st.ar:(o.r||2);
  /* missed it once: walk to a spot it can actually be seen from */
  if(st.at&&st.avant===undefined)st.avant=agVantage(a,x,y,z,'touch');
  const v=st.at?st.avant:null;
  if(st.at&&!v)mv.ry=1;                    /* no clear spot known: at least get level with it */
  const res=v?agMoveTo(a,dt,mv,v.x+0.5,v.z+0.5,0.3,v.y):agMoveTo(a,dt,mv,x+0.5,z+0.5,rr,y);
  if(res==='done'){st.amv={};st.at=(st.at||0)+1;st.ar=Math.max(0.5,(o.r||2)-st.at*0.6);st.avant=undefined;
    if(st.at>3)return 'fail:cannot get at '+(o.what||'it')+' (walled in or out of sight)';}
  else if(res.startsWith('fail'))return res;
  return 'run';
}
function agAutoEquip(a,pref){
  let bi=-1,bd=0;
  for(let i=0;i<a.inv.length;i++){const st=a.inv[i];if(!st)continue;const t=DEFS[st.id].tool;
    const dmg=t?t.dmg+(t.type==='sword'?1:0):0;if(dmg>bd){bd=dmg;bi=i;}}
  if(pref){const id=agItemId(a,pref);if(id!=null){const i=a.inv.findIndex(s=>s&&s.id===id);if(i>=0)bi=i;}}
  if(bi>=0)a.sel=bi;
  for(let i=0;i<a.inv.length;i++){const st=a.inv[i];if(!st)continue;const d=DEFS[st.id];
    if(!d.armor)continue;const sl=d.armor.s;
    const cur=a.armor[sl];if(!cur||ARM_M[DEFS[cur.id].armor.m].pts<ARM_M[d.armor.m].pts){a.armor[sl]=st;a.inv[i]=cur||null;}}
}
function agArmorPts(a){let n=0;for(const st of a.armor)if(st&&DEFS[st.id]&&DEFS[st.id].armor)n+=ARM_M[DEFS[st.id].armor.m].pts;return n;}
