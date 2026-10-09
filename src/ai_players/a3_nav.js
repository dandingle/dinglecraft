
/* ----- navigation: time-sliced A* over the voxel grid ----- */
/* Moves: w walk, j step up, d drop (<=3), s swim, g dig through, p pillar up,
   v dig down, b bridge a gap. Missing chunks count as walls. Pillar and bridge
   moves spend real blocks from the inventory: the planner only uses as many as
   the agent carries (pf.scaf), and none at all when it has nothing to place. */
let _nc=null,_nck='';
function nb(x,y,z){                     /* fast block read with a one-chunk cache */
  if(y<0)return B.BEDROCK;if(y>=WH)return B.AIR;
  const cx=Math.floor(x/CH),cz=Math.floor(z/CH),k=ckey(cx,cz);
  if(k!==_nck){_nck=k;_nc=chunks.get(k)||null;}
  if(!_nc)return -1;
  return _nc.bl[bidx(x-cx*CH,y,z-cz*CH)];
}
function nSolid(id){return id===-1||(DEFS[id]&&DEFS[id].solid!==false);}
function nFree(id){return id!==-1&&!nSolid(id)&&id!==B.LAVA;}
function nDanger(id){return id===B.LAVA||id===B.CACTUS||id===-1||(DIM==='puppet'&&id>0&&DEFS[id].hurts===true);}
function nBreakable(id){return id!==-1&&id!==B.WATER&&id!==B.LAVA&&DEFS[id]&&DEFS[id].hard>=0&&!nDanger(id)&&!DEFS[id].interact;}
/* someone else's build: never dug through by accident (griefing is a deliberate act, with its own skill) */
function nTheirs(a,x,y,z){if(!BOWN.size)return false;const o=BOWN.get(bkey(x,y,z));return o!==undefined&&OWN_NAMES[o]!==a.name;}
/* would opening this cell let water or lava pour in? (players don't dig into the sea) */
function nLeaky(x,y,z){for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0]]){const n=nb(x+dx,y+dy,z+dz);if(n===B.WATER||n===B.LAVA)return true;}return false;}
function nStand(x,y,z){
  const f=nb(x,y,z),h=nb(x,y+1,z);
  if(!nFree(f)||!nFree(h))return false;
  if(f===B.WATER)return true;
  const g=nb(x,y-1,z);
  if(g===B.LAVA||g===-1)return false;
  return nSolid(g)||g===B.WATER||(DEFS[g]&&DEFS[g].ramp)||(DEFS[f]&&DEFS[f].ramp);
}
function agBT(a,id){                       /* seconds for this agent to break id (the real rule, real tools) */
  const d=DEFS[id];
  if(!d||d.hard<0)return 99;
  if(!d.toolClass)return breakTime(id,null);
  const c=a._tc&&a._tc.f===frameCount?a._tc:(a._tc={f:frameCount,m:{}});
  const k=d.toolClass+(d.tier||0);
  let t=c.m[k];if(t===undefined)t=c.m[k]=agBestTool(a,id);
  return breakTime(id,t);
}
function agNavBT(a,id){return Math.min(30,agBT(a,id));}   /* planner cost (a slow dig still costs, it just isn't infinite) */
class MinHeap{constructor(){this.a=[];}push(n){const a=this.a;a.push(n);let i=a.length-1;
  while(i>0){const p=(i-1)>>1;if(a[p].f<=a[i].f)break;[a[p],a[i]]=[a[i],a[p]];i=p;}}
  pop(){const a=this.a;const top=a[0],last=a.pop();if(a.length){a[0]=last;let i=0;
    for(;;){const l=i*2+1,r=l+1;let m=i;if(l<a.length&&a[l].f<a[m].f)m=l;if(r<a.length&&a[r].f<a[m].f)m=r;
      if(m===i)break;[a[m],a[i]]=[a[i],a[m]];i=m;}}return top;}
  get size(){return this.a.length;}}
const NAV_DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
function navStart(a,gx,gy,gz,r,opt){
  opt=opt||{};
  const e=a.e;
  const sx=Math.floor(e.x),sy=Math.floor(e.y+0.05),sz=Math.floor(e.z);
  const h=(x,y,z)=>Math.hypot(x-gx,(y-gy)*1.2,z-gz);
  const s={x:sx,y:sy,z:sz,g:0,f:h(sx,sy,sz),m:'w',p:null};
  const scaf=opt.scaf==null?Infinity:Math.max(0,opt.scaf|0);
  s.sb=0;
  a.pf={gx,gy,gz,r:r==null?1.2:r,ry:opt.ry==null?2:opt.ry,open:new MinHeap(),seen:new Map(),
    best:s,bestH:s.f,n:0,max:opt.max||3500,done:false,path:null,h,noDig:!!opt.noDig,noBuild:!!opt.noBuild||scaf<=0,
    scaf,t0:AG_T,hard:!!opt.hard};
  a.pf.open.push(s);a.pf.seen.set(sx+','+sy+','+sz,0);
}
function navGoal(pf,x,y,z){
  return Math.abs(x+0.5-pf.gx)<=pf.r+0.5&&Math.abs(z+0.5-pf.gz)<=pf.r+0.5&&Math.abs(y-pf.gy)<=pf.ry;
}
function navExpand(a,pf,n,push){
  const {x,y,z}=n;
  const hereW=nb(x,y,z)===B.WATER;
  for(const [dx,dz] of NAV_DIRS){
    const nx=x+dx,nz=z+dz;
    const f=nb(nx,y,nz),hd=nb(nx,y+1,nz);
    if(f===-1)continue;
    if(nFree(f)&&nFree(hd)){
      if(nStand(nx,y,nz)){push(nx,y,nz,f===B.WATER||hereW?1.6:1,'w');continue;}
      let landed=false;
      for(let d=1;d<=3;d++){
        const c=nb(nx,y-d,nz);
        if(!nFree(c))break;
        if(nStand(nx,y-d,nz)){push(nx,y-d,nz,1+d*0.35,'d');landed=true;break;}
      }
      if(!landed&&!pf.noBuild&&(n.sb||0)<pf.scaf){
        const under=nb(nx,y-1,nz);
        if(under!==B.LAVA&&under!==-1)push(nx,y,nz,5,'b');
      }
      continue;
    }
    /* step up a block */
    if(nSolid(f)&&nFree(hd)&&nFree(nb(nx,y+2,nz))&&nFree(nb(x,y+2,z))&&nStand(nx,y+1,nz)){
      push(nx,y+1,nz,1.7,'j');continue;
    }
    /* dig through */
    if(!pf.noDig&&(nBreakable(f)||nFree(f))&&(nBreakable(hd)||nFree(hd))&&!(nSolid(f)&&nTheirs(a,nx,y,nz))&&!(nSolid(hd)&&nTheirs(a,nx,y+1,nz))){
      const g=nb(nx,y-1,nz);
      if(nSolid(g)&&g!==-1&&nb(nx,y+2,nz)!==B.LAVA&&nb(nx,y+2,nz)!==B.WATER&&(nFree(f)||!nLeaky(nx,y,nz))&&(nFree(hd)||!nLeaky(nx,y+1,nz))){
        const c=1+(nFree(f)?0:agNavBT(a,f)*1.6)+(nFree(hd)?0:agNavBT(a,hd)*1.6);
        if(c<14||pf.hard)push(nx,y,nz,c,'g');   /* hard: dig a slow staircase out (stone by hand) rather than give up */
      }
    }
  }
  /* pillar up */
  if(!pf.noBuild&&(n.sb||0)<pf.scaf&&y+3<WH&&!hereW&&(DIM!=='puppet'||mpPlaceOK(x,y,z,-1))){
    const up=nb(x,y+2,z);
    if(nFree(up))push(x,y+1,z,2.6,'p');
    else if(!pf.noDig&&nBreakable(up)&&nFree(nb(x,y+3,z))&&!nTheirs(a,x,y+2,z)){const c=2.6+agNavBT(a,up)*1.6;if(c<12||pf.hard)push(x,y+1,z,c,'p');}
  }
  /* swim up */
  if(hereW&&nFree(nb(x,y+1,z))&&nFree(nb(x,y+2,z)))push(x,y+1,z,1.4,'s');
  /* dig down */
  if(!pf.noDig&&y>2){
    const dn=nb(x,y-1,z),dd=nb(x,y-2,z);
    if(nBreakable(dn)&&dd!==B.LAVA&&dd!==B.WATER&&dd!==-1&&nSolid(dd)&&!nLeaky(x,y-1,z)&&!nTheirs(a,x,y-1,z))push(x,y-1,z,2+agNavBT(a,dn)*1.6,'v');
  }
}
function navStep(a,budget){
  const pf=a.pf;if(!pf||pf.done)return 0;
  let used=0;
  const push=(x,y,z,c,m)=>{
    const k=x+','+y+','+z;const g=pf.cur.g+c;
    const old=pf.seen.get(k);
    if(old!==undefined&&old<=g)return;
    pf.seen.set(k,g);
    const hh=pf.h(x,y,z);
    pf.open.push({x,y,z,g,f:g+hh*1.05,m,p:pf.cur,hh,sb:(pf.cur.sb||0)+(m==='p'||m==='b'?1:0)});
  };
  while(pf.open.size&&used<budget){
    const n=pf.open.pop();used++;pf.n++;
    if((pf.seen.get(n.x+','+n.y+','+n.z)??1e9)<n.g)continue;
    const hh=n.hh!==undefined?n.hh:pf.h(n.x,n.y,n.z);
    if(hh<pf.bestH){pf.bestH=hh;pf.best=n;}
    if(navGoal(pf,n.x,n.y,n.z)){pf.done=true;pf.path=navTrace(n);pf.full=true;return used;}
    if(pf.n>=pf.max)break;
    pf.cur=n;navExpand(a,pf,n,push);
  }
  if(!pf.open.size||pf.n>=pf.max){pf.done=true;pf.path=navTrace(pf.best);pf.full=false;}
  return used;
}
function navTrace(n){const out=[];while(n){out.push({x:n.x,y:n.y,z:n.z,m:n.m});n=n.p;}out.reverse();out.shift();return out;}
let NAV_BUDGET=0;
