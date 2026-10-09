/* nav.js (PZ): the speed-run pilot's legs. A* over standing cells of the voxel grid + a follower that drives Dan with real
   input only (KEY.KeyW / Space / ControlLeft, yaw and pitch, MB.l to dig through), plus reach-and-mine and gather helpers.
   const nav=require('./nav.js')(V,pilot);   // V = __vox, pilot = qa/pilot.js
     nav.plan(goal,o)        -> [{x,y,z,m}] cells (m: 'w' walk, 'j' jump up, 'd' drop) or null. goal = [x,y,z] | {near:[x,y,z],r} | fn(x,y,z)
     nav.go(goal,o)          -> plans and follows, replanning when stuck or pushed off the path; true on arrival
     nav.goXZ(x,z,o)         -> go to the standing cell nearest (x,z) (surface first)
     nav.reachMine(x,y,z,o)  -> walk to a cell that sees the block within reach, pick the best tool, mine it, collect the drop
     nav.collect(ids,r,o)    -> walk over resting drops of these ids within r
     nav.findBlocks(ids,r,o) -> block cells sorted by straight distance (only loaded chunks; o.load forces chunks first)
   Planning reads blocks only (it may force-generate chunks, which is deterministic); every step of Dan's body is real input
   through pilot.frame, so the honesty ledger and the displacement check watch all of it. */
'use strict';
module.exports=function makeNav(V,pilot,opts){
  opts=opts||{};
  const D=V.DEFS,B=V.B,P=()=>V.P,K=V.KEY,M=V.MB;
  const log=opts.log||(()=>{});
  const G=(x,y,z)=>V.getBlock(x,y,z);
  const C=()=>V.pgCore();
  const loaded=(x,z)=>!!C().chunkAt(x,z);
  const ensure=(x,z)=>{if(!loaded(x,z))V.forceChunksNear(x,z);};
  const solid=id=>id>0&&!!D[id]&&D[id].solid!==false;
  const hurts=id=>!!(D[id]&&D[id].hurts);
  const fluid=id=>id>0&&!!D[id]&&!!D[id].pliquid;
  const soft=id=>!!(D[id]&&D[id].psoft);
  const bouncy=id=>!!(D[id]&&D[id].pbounce);
  const WALK=V.MPC.WALK;
  /* a standing cell: feet and head free (fluid is fine: wading), a solid non-hurting floor */
  function stand(x,y,z){if(y<1||y>66)return false;ensure(x,z);
    const f=G(x,y,z),h=G(x,y+1,z),g=G(x,y-1,z);
    if(solid(f)||solid(h)||hurts(f))return false;
    if(!solid(g)&&!fluid(g))return false;
    if(hurts(g))return false;
    if(fluid(g)){/* standing ON fluid means we sink: only the bottom counts */return false;}
    return true;}
  const key=(x,y,z)=>((x+256)*2048+(z+1024))*128+y;
  const unkey=k=>{const y=k%128,r=(k-y)/128,z=r%2048-1024,x=(r-(z+1024))/2048-256;return [x,y,z];};
  const avoid=new Map();let costFn=null,costPrep=null;   /* extra cost per cell (danger zones), prepared once per plan */               /* cells that failed while following: extra cost (key -> cost) */
  function cellCost(x,y,z){let c=0;const g=G(x,y-1,z),f=G(x,y,z);
    if(fluid(f)||fluid(G(x,y+1,z)))c+=1.6;
    if(g===B.PG_SHEET)c+=2.5;
    if(bouncy(g))c+=1.5;
    if(D[g]&&D[g].slippery)c+=0.2;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=G(x+dx,y,z+dz),n2=G(x+dx,y-1,z+dz);if(hurts(n)||hurts(n2)&&!solid(G(x+dx,y,z+dz)))c+=0.8;}
    const a=avoid.get(key(x,y,z));if(a)c+=a;if(costFn)c+=costFn(x,y,z);return c;}
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  function neighbours(x,y,z,out){out.length=0;
    for(const [dx,dz] of DIRS){const nx=x+dx,nz=z+dz,diag=dx&&dz;
      if(nx<WALK.x0-1||nx>WALK.x1+1||nz<WALK.z0-1||nz>WALK.z1+1)continue;
      if(diag){/* no corner cutting: both side columns clear at body height, same level only */
        if(solid(G(x+dx,y,z))||solid(G(x+dx,y+1,z))||solid(G(x,y,z+dz))||solid(G(x,y+1,z+dz)))continue;
        if(stand(nx,y,nz))out.push([nx,y,nz,'w',1.414]);continue;}
      /* jump up one: head room over our own cell */
      if(!solid(G(x,y+2,z))&&stand(nx,y+1,nz)){out.push([nx,y+1,nz,'j',1.6]);continue;}
      if(solid(G(nx,y,nz))||solid(G(nx,y+1,nz)))continue;
      if(stand(nx,y,nz)){out.push([nx,y,nz,'w',1]);continue;}
      /* walk off the edge: we land on the first floor below */
      for(let ny=y-1;ny>=Math.max(1,y-24);ny--){const f=G(nx,ny,nz);if(solid(f))break;
        if(stand(nx,ny,nz)){const drop=y-ny,lf=G(nx,ny-1,nz);
          if(drop<=4||soft(lf))out.push([nx,ny,nz,'d',1+0.15*drop+(drop>4&&!soft(lf)?99:0)]);break;}
        if(fluid(f)&&ny<y-4)break;}}
    return out;}
  /* binary heap */
  function Heap(){const a=[];return {a,push(n){a.push(n);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p].f<=a[i].f)break;[a[p],a[i]]=[a[i],a[p]];i=p;}},
    pop(){const t=a[0],l=a.pop();if(a.length){a[0]=l;let i=0;for(;;){const L=2*i+1,R=L+1;let m=i;if(L<a.length&&a[L].f<a[m].f)m=L;if(R<a.length&&a[R].f<a[m].f)m=R;if(m===i)break;[a[m],a[i]]=[a[i],a[m]];i=m;}}return t;},get size(){return a.length;}};}
  function startCell(){const p=P();let x=Math.floor(p.x),z=Math.floor(p.z),y=Math.floor(p.y+0.05);
    if(stand(x,y,z))return [x,y,z];for(const dy of [1,-1,2,-2])if(stand(x,y+dy,z))return [x,y+dy,z];
    for(const [dx,dz] of DIRS)for(const dy of [0,1,-1])if(stand(x+dx,y+dy,z+dz))return [x+dx,y+dy,z+dz];return [x,y,z];}
  function goalFn(goal){
    if(typeof goal==='function')return {test:goal,h:()=>0};
    if(Array.isArray(goal)){const [gx,gy,gz]=goal.map(Math.floor);return {test:(x,y,z)=>x===gx&&z===gz&&Math.abs(y-gy)<=1,h:(x,y,z)=>Math.hypot(x-gx,z-gz)+Math.abs(y-gy)*0.5,t:[gx,gy,gz]};}
    const [gx,gy,gz]=goal.near,r=goal.r||1.5,ry=goal.ry==null?2:goal.ry;
    return {test:(x,y,z)=>Math.hypot(x+0.5-gx,z+0.5-gz)<=r&&Math.abs(y-gy)<=ry&&(!goal.ok||goal.ok(x,y,z)),h:(x,y,z)=>Math.max(0,Math.hypot(x+0.5-gx,z+0.5-gz)-r)+Math.max(0,Math.abs(y-gy)-ry)*0.5,t:[gx,gy,gz]};}
  function plan(goal,o){o=o||{};if(costPrep)costPrep();const g=goalFn(goal),s=o.from||startCell(),max=o.max||120000;
    const hW=o.greedy||1.15;const open=Heap(),best=new Map(),par=new Map(),nb=[];
    const k0=key(...s);best.set(k0,0);par.set(k0,null);open.push({k:k0,x:s[0],y:s[1],z:s[2],g:0,f:g.h(...s)*hW,m:'s'});let n=0,bestN=null;
    while(open.size){const c=open.pop();if(c.g>best.get(c.k)+1e-9)continue;
      if(g.test(c.x,c.y,c.z)){const out=[];let k=c.k,m=c.m;while(k!=null){const [x,y,z]=unkey(k);const pp=par.get(k);out.push({x,y,z,m:pp?pp.m:'s'});k=pp?pp.k:null;}out.reverse();return out;}
      if(!bestN||g.h(c.x,c.y,c.z)<g.h(bestN.x,bestN.y,bestN.z))bestN=c;
      if(++n>max)break;
      for(const q of neighbours(c.x,c.y,c.z,nb)){const k=key(q[0],q[1],q[2]),ng=c.g+q[4]+cellCost(q[0],q[1],q[2]);
        if(ng<(best.has(k)?best.get(k):1e18)){best.set(k,ng);par.set(k,{k:c.k,m:q[3]});open.push({k,x:q[0],y:q[1],z:q[2],g:ng,f:ng+g.h(q[0],q[1],q[2])*hW,m:q[3]});}}}
    plan.last={n,closest:bestN?[bestN.x,bestN.y,bestN.z]:null};return null;}
  /* a straight run from (ax,az) to cell b at floor level y: every sampled cell (and the body's width) stands at y */
  function clearRun(ax,az,b,y){const dx=b.x+0.5-ax,dz=b.z+0.5-az,d=Math.hypot(dx,dz);if(d<0.01)return true;const ux=dx/d,uz=dz/d,n=Math.ceil(d/0.25);
    for(let i=1;i<=n;i++){const t=Math.min(d,i*0.25);for(const off of [-0.32,0,0.32]){const px=ax+ux*t-uz*off,pz=az+uz*t+ux*off;
        const cx=Math.floor(px),cz=Math.floor(pz);if(!stand(cx,y,cz)||cellCost(cx,y,cz)>0.9)return false;}}return true;}
  let tickHook=null;          /* called every follow frame (combat, eating); returns true if it took over this frame */
  function release(){K.KeyW=K.KeyS=K.KeyA=K.KeyD=false;K.Space=false;K.ControlLeft=false;M.l=false;M.r=false;}
  function steer(tx,tz,o){const p=P(),dx=tx-p.x,dz=tz-p.z;p.yaw=Math.atan2(-dx,-dz);p.pitch=o&&o.pitch!=null?o.pitch:-0.15;K.KeyW=true;}
  /* follow a planned path; returns 'ok' | 'stuck' | 'off' | 'dead' */
  function follow(path,o){o=o||{};let i=1;const maxF=Math.round((o.maxS||90)/0.04);let lastProg=0,bestD=1e9,f=0;
    const fin=path[path.length-1];
    for(;f<maxF;f++){const p=P();if(p.dead){release();return 'dead';}
      if(tickHook&&tickHook()){continue;}
      if(i>=path.length){const d=Math.hypot(fin.x+0.5-p.x,fin.z+0.5-p.z),inC=Math.floor(p.x)===fin.x&&Math.floor(p.z)===fin.z;
        if(d<(o.tol||0.3)||(inC&&d<0.42&&p.onGround)){release();return 'ok';}
        steer(fin.x+0.5,fin.z+0.5);K.ControlLeft=false;K.Space=false;pilot.frame(1);if(f-lastProg>40){release();return 'stuck';}continue;}
      const w=path[i],fy=Math.floor(p.y+0.05);
      const hd=Math.hypot(w.x+0.5-p.x,w.z+0.5-p.z);
      /* advance past waypoints we stand on (or have just passed) */
      const inW=Math.floor(p.x)===w.x&&Math.floor(p.z)===w.z;
      if((inW&&hd<0.5||hd<0.25)&&Math.abs(fy-w.y)<=1&&(p.onGround||w.m==='d'||fluid(G(w.x,w.y,w.z)))){i++;continue;}
      if(i+1<path.length){const nx=path[i+1];if(Math.floor(p.x)===nx.x&&Math.floor(p.z)===nx.z&&Math.abs(fy-nx.y)<=1&&p.onGround){i+=2;continue;}}
      /* look ahead along same-level waypoints with a clear straight run */
      let j=i;if(w.m!=='j'&&p.onGround)for(let k=i+1;k<Math.min(path.length,i+10);k++){const q=path[k];if(q.y!==w.y||q.m==='j'||q.m==='d')break;if(clearRun(p.x,p.z,q,w.y))j=k;else break;}
      const t=path[j];steer(t.x+0.5,t.z+0.5);
      const jumpNeed=w.m==='j'||(w.y>fy&&!fluid(G(w.x,w.y,w.z)));
      K.Space=(jumpNeed&&hd<1.45)||(fluid(G(Math.floor(p.x),fy,Math.floor(p.z)))&&w.y>fy);
      const run=j-i+(hd>2?2:0);K.ControlLeft=!o.walk&&run>=3&&!jumpNeed&&p.hunger>6;
      pilot.frame(1);
      /* progress: distance to the final cell (or the waypoint index) */
      const dd=Math.hypot(fin.x+0.5-P().x,fin.z+0.5-P().z)+Math.abs(fin.y-P().y)*0.5;
      if(dd<bestD-0.4||i>lastProg+1000){bestD=Math.min(bestD,dd);lastProg=f;}
      if(f-lastProg>50){release();avoid.set(key(w.x,w.y,w.z),(avoid.get(key(w.x,w.y,w.z))||0)+4);return 'stuck';}
      /* pushed off the path (knockback, a thrown thing, a fall) */
      const cx=Math.floor(P().x),cz=Math.floor(P().z);let near=false;for(let k=Math.max(0,i-2);k<Math.min(path.length,i+4);k++){const q=path[k];if(Math.abs(q.x-cx)<=2&&Math.abs(q.z-cz)<=2&&Math.abs(q.y-Math.floor(P().y))<=3){near=true;break;}}
      if(!near&&P().onGround){release();return 'off';}}
    release();return 'stuck';}
  /* dig a block in the way (tunnel fallback) */
  function digThrough(x,y,z){const id=G(x,y,z);if(!solid(id)||!(D[id].hard>=0))return false;tool(id);return pilot.mine(x,y,z,{max:20});}
  function go(goal,o){o=o||{};let tries=0;const t0=pilot.S.frames,maxF=Math.round((o.maxS||240)/0.04);
    while(tries++<(o.tries||12)&&pilot.S.frames-t0<maxF){if(P().dead)return false;
      const g=goalFn(goal);const s=startCell();if(g.test(...s)){release();return true;}
      const path=plan(goal,{max:o.max||160000,greedy:o.greedy});
      if(!path){log('nav: no path to '+JSON.stringify(g.t||'fn')+' from '+s+' (closest '+(plan.last&&plan.last.closest)+', '+(plan.last&&plan.last.n)+' nodes)');
        if(o.dig===true&&plan.last&&plan.last.closest&&tries<4){   /* tunnelling is opt-in: it must never eat a ledge or a stair *//* walk to the closest cell, then tunnel toward the goal */
          const cl=plan.last.closest;const p2=plan(cl,{max:60000});if(p2)follow(p2,{maxS:60});if(g.t&&!tunnel(g.t))return false;continue;}
        return false;}
      const r=follow(path,{maxS:Math.min(o.legS||120,(maxF-(pilot.S.frames-t0))*0.04),tol:o.tol,walk:o.walk});
      if(r==='ok'){const s2=startCell();if(g.test(...s2))return true;}
      if(r==='dead')return false;}
    release();return false;}
  /* tunnel one step toward a target: mine the head/feet blocks in the direction of travel */
  function tunnel(t){const p=P(),dx=t[0]+0.5-p.x,dz=t[2]+0.5-p.z;const ax=Math.abs(dx)>Math.abs(dz)?Math.sign(dx):0,az=ax?0:Math.sign(dz);
    const x=Math.floor(p.x)+ax,z=Math.floor(p.z)+az,y=Math.floor(p.y+0.05);let ok=true;
    for(const yy of [y+1,y])if(solid(G(x,yy,z))){if(!(D[G(x,yy,z)].hard>=0))return false;ok=digThrough(x,yy,z)&&ok;}
    if(t[1]>y&&solid(G(Math.floor(p.x),y+2,Math.floor(p.z))))digThrough(Math.floor(p.x),y+2,Math.floor(p.z));
    return ok;}
  function goXZ(x,z,o){o=o||{};x=Math.floor(x);z=Math.floor(z);ensure(x,z);
    const ys=[];for(let y=66;y>=2;y--)if(stand(x,y,z))ys.push(y);
    const ref=o.y!=null?o.y:(z>=-160?V.deckY(z)+1:Math.min(V.mpSurf(x,z),60)+1);
    const pref=ys.sort((a,b)=>Math.abs(a-ref)-Math.abs(b-ref))[0];
    if(pref==null)return go({near:[x+0.5,o.y||40,z+0.5],r:o.r||2.5,ry:40},o);
    return go(o.r?{near:[x+0.5,pref,z+0.5],r:o.r,ry:o.ry==null?3:o.ry}:[x,pref,z],o);}
  /* tools: the best stack in the inventory for this block (tier and mult), else an empty hand */
  /* the cheapest tool that still harvests the block (lowest sufficient tier, then the fastest): an expert does not dig spoil with his
     best pick; for a block that needs no tool tier, the lowest-tier tool of the right class */
  function bestTool(id){const d=D[id];if(!d||!d.toolClass)return null;const need=d.req?(d.tier||0):0;let best=null,bk=null;
    for(const s of P().inv){if(!s)continue;const t=D[s.id]&&D[s.id].tool;if(!t||t.type!==d.toolClass||(t.tier||0)<need)continue;
      const k=[(t.tier||0)>=2&&need<2?1:0,-(t.mult||1)];if(!bk||k[0]<bk[0]||(k[0]===bk[0]&&k[1]<bk[1])){bk=k;best=s.id;}}
    return best;}
  function canHarvest(id){const d=D[id];if(!d||!(d.hard>=0))return false;if(!d.req)return true;const t=bestTool(id);return !!t&&(D[t].tool.tier||0)>=(d.tier||0);}
  function tool(id){const t=bestTool(id);if(t)pilot.select(t);else pilot.emptyHand();return t;}
  /* line of sight from the eye to the block centre: the first solid cell on the ray is the block itself */
  function sees(ex,ey,ez,x,y,z){const tx=x+0.5,ty=y+0.5,tz=z+0.5,dx=tx-ex,dy=ty-ey,dz=tz-ez,d=Math.hypot(dx,dy,dz),n=Math.ceil(d/0.1);
    for(let i=1;i<n;i++){const t=i/n,cx=Math.floor(ex+dx*t),cy=Math.floor(ey+dy*t),cz=Math.floor(ez+dz*t);if(cx===x&&cy===y&&cz===z)return true;if(solid(G(cx,cy,cz))||fluid(G(cx,cy,cz)))return false;}return true;}
  function reachGoal(x,y,z,r){r=r||4.3;return {near:[x+0.5,y,z+0.5],r:r+0.5,ry:6,ok:(cx,cy,cz)=>{const ex=cx+0.5,ey=cy+1.62,ez=cz+0.5;
      if(Math.hypot(ex-x-0.5,ey-y-0.5,ez-z-0.5)>r)return false;if(cx===x&&cz===z&&(cy-1===y||cy+1===y||cy===y||cy+2===y))return cy-1!==y||true;return sees(ex,ey,ez,x,y,z);}};}
  /* stand somewhere that sees the block within reach and mine it */
  function reachMine(x,y,z,o){o=o||{};const id0=G(x,y,z);if(!id0)return true;
    const p=P(),E=[p.x,p.y+1.62,p.z];
    if(!(Math.hypot(E[0]-x-0.5,E[1]-y-0.5,E[2]-z-0.5)<=4.4&&sees(E[0],E[1],E[2],x,y,z))){
      if(!go(reachGoal(x,y,z,o.r||4.2),{maxS:o.maxS||90,dig:o.dig}))return false;}
    tool(id0);const ok=pilot.mine(x,y,z,{max:o.mineS||25});if(!ok)return false;
    if(o.collect!==false)collect(null,4,{maxS:4,near:[x+0.5,y+0.5,z+0.5]});return true;}
  /* pick up resting drops (ids null = any) within r of `near` (default Dan) */
  /* the engine's magnet pulls a resting drop in from 2 m of Dan's middle (through anything), so any cell that close will do */
  function collect(ids,r,o){o=o||{};const t0=pilot.S.frames,maxF=Math.round((o.maxS||10)/0.04);let n=0;const skip=new Set();
    for(let guard=0;guard<14&&pilot.S.frames-t0<maxF;guard++){const p=P(),c=o.near||[p.x,p.y,p.z];
      const ds=V.entities.filter(e=>e.t==='drop'&&!e.dead&&!skip.has(e)&&(!ids||ids.includes(e.st.id))&&Math.hypot(e.x-c[0],e.z-c[2])<r&&Math.abs(e.y-c[1])<(o.dy||12)&&!(e.pown&&e.pown!=='Dan'&&e.pownT>V.getMP().clock)&&!e.psz)
        .sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
      if(!ds.length)break;const d=ds[0];
      const near=(x,y,z)=>Math.hypot(x+0.5-d.x,y+0.6-d.y,z+0.5-d.z)<1.75;
      if(Math.hypot(p.x-d.x,p.y+0.6-d.y,p.z-d.z)<1.9){for(let i=0;i<25&&!d.dead;i++)pilot.frame(1);if(d.dead)n++;else skip.add(d);continue;}
      const ok=go({near:[d.x,Math.floor(d.y),d.z],r:2.2,ry:3,ok:near},{maxS:Math.max(2,(maxF-(pilot.S.frames-t0))*0.04),tries:2,dig:false,max:25000});
      for(let i=0;i<20&&!d.dead;i++)pilot.frame(1);if(d.dead)n++;else if(!ok)skip.add(d);}
    return n;}
  /* block cells of these ids around (cx,cz) within r, nearest first; scans loaded chunks (o.load forces the area) */
  function findBlocks(ids,r,o){o=o||{};const p=P(),cx=Math.floor(o.cx!=null?o.cx:p.x),cz=Math.floor(o.cz!=null?o.cz:p.z),cy=o.cy!=null?o.cy:p.y;
    if(o.load)for(let x=cx-r;x<=cx+r;x+=16)for(let z=cz-r;z<=cz+r;z+=16)ensure(x,z);
    const out=[],y0=o.y0||2,y1=o.y1||64,set=new Set(ids);
    for(let x=cx-r;x<=cx+r;x++)for(let z=cz-r;z<=cz+r;z++){if(Math.hypot(x-cx,z-cz)>r||!loaded(x,z))continue;
      for(let y=y0;y<=y1;y++){if(set.has(G(x,y,z)))out.push({x,y,z,id:G(x,y,z),d:Math.hypot(x+0.5-p.x,(y-cy)*(o.yw||1.5),z+0.5-p.z)});}}
    out.sort((a,b)=>a.d-b.d);return out;}
  /* exposed: at least one face touches a free cell (so it can be seen without digging) */
  function exposed(b){for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]])if(!solid(G(b.x+dx,b.y+dy,b.z+dz))&&!fluid(G(b.x+dx,b.y+dy,b.z+dz)))return true;return false;}
  return {plan,follow,go,goXZ,tunnel,reachMine,reachGoal,collect,findBlocks,exposed,stand,startCell,bestTool,canHarvest,tool,sees,solid,fluid,hurts,
    release,steer,avoid,setTick:f=>{tickHook=f;},setCost:(prep,fn)=>{costPrep=prep;costFn=fn;},ensure,loaded};};
