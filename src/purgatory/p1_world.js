/* ---- PART 55: p1_world.js ---- */
/* ===================================================================== */
/* PART 55 . p1 world (P1): THE STAGE. Column function, generator, structure sites, spots (bible 3, 15.6) */
/* ===================================================================== */
/* Pure and deterministic: SEED, coordinates and MP.open / MP.flats / MP.trees / MP.strike (+ the transient arch-opening flag)
   only. No getBlock, no Math.random, no clock, no THREE here. Salts SEED^0x3a10..0x3a3f (mwSa). Layout (bible 3.1):
     z -298..-203 House . -202..-191 pit . -190..-161 apron . -160/-159 proscenium . -158..-60 FELT FOREST . -59/-58 Arch 1
     -57..40 KITCHEN . 41/42 Arch 2 . 43..150 LABS | STAIR | PORK PALACE . 151/152 Arch 3 . 153..261 BACK SWAMP
     262..266 back wall (painted cyclorama) . wings |x| 76..95 . Masking Black border |x| 96..111, z -315..-300 and 267..282.
   mpSurf(x,z) is the y of the top solid block a body would stand on (P0 contract), always >= 30: trenches, drains, fjords and
   the Bog Hollow report the deck level around them (nominal walkable top), walls report 70. */
var MCOLM=new Map();
var MWW={seed:null};                                  /* per-world site caches, rebuilt when SEED changes and on PREG.onReset */
function mwW(){if(MWW.seed!==SEED){MWW={seed:SEED};MCOLM.clear();}return MWW;}
function mwSa(k){return SEED^(0x3a10+k);}
function mwH(a,b,c,k){let h=Math.imul(a|0,0x27d4eb2d)^Math.imul(b|0,0x165667b1)^Math.imul(c|0,0x9e3779b1)^Math.imul(SEED^(0x3a10+k),0x85ebca6b);   /* one hash per (cell, parameter, salt): */
  h^=h>>>15;h=Math.imul(h,0x2c1b3c6d);h^=h>>>12;h=Math.imul(h,0x297a2d39);h^=h>>>15;return (h>>>0)/4294967296;}             /* a murmur-style finaliser */
const MW_K={VOID:0,BORDER:1,HWALL:2,HOUSE:3,PIT:4,APRON:5,SIDE:6,PROSC:7,WOODS:8,ARCH:9,KITCHEN:10,LABS:11,PALACE:12,STAIR:13,
  SWAMP:14,BACK:15,WINGS:16,EXIT:17,VEST:18};
const MW_BN=['void','border','border','house','pit','apron','apron','woods','woods','arch','kitchen','labs','palace','stair','swamp',
  'swamp','wings','house','house'];
const MW_ARCH=[[-59,-58],[41,42],[151,152]];          /* arch slab z cells (MPC.ARCH_Z = the upstage cell of each) */
const MW_DRAIN_ORDER=[[0,-2],[-1,-2],[-2,-2],[-2,-1],[-2,0],[-2,1],[-2,2],[-1,2],[0,2],[1,2],[2,2],[2,1],[2,0],[2,-1],[2,-2],[1,-2]];   /* the ledge ring: the 5x5 shaft's
   perimeter from the rim gap (-z) round, 4-connected (every step is a straight step), half a block down per cell = one turn per 8 */
const MW_BAND=[   /* band rooms: interior box, floor block y 16, interior air 17..22, ceiling 23; kit centre, stake, tunnel mouth */
  {x0:-65,x1:-56,z0:-118,z1:-109,kit:[-61,17,-114],stake:[-61,17,-116],mouth:[-61,23,-124],tun:'t1'},
  {x0:45,x1:54,z0:-25,z1:-16,kit:[49,17,-20],stake:[49,17,-23],mouth:[59,17,-42],tun:'t2'},
  {x0:-55,x1:-46,z0:105,z1:114,kit:[-51,17,109],stake:[-51,17,107],mouth:[-86,46,109],tun:'t3'}];
const MW_GUEST={x0:-43,x1:-37,y0:18,y1:22,z0:-113,z1:-107,trunk:[-40,19,-112],hook:[-40,21,-112]};
const MW_HQ={x0:-50,x1:-30,z0:88,z1:102,F:44,bench:[-40,45,100],trans:[-45,45,98],prof:[-35,45,96],bkr:[-37,45,97]};
function mwDeck(z){return deckY(z);}
function mwRectGap(a,x0,x1,z0,z1){const dx=a.x1<x0?x0-a.x1:(a.x0>x1?a.x0-x1:0),dz=a.z1<z0?z0-a.z1:(a.z0>z1?a.z0-z1:0);return Math.max(dx,dz);}
function mwZone(g,x,z,x0,x1,z0,z1,y,f){const dx=x<x0?x0-x:(x>x1?x-x1:0),dz=z<z0?z0-z:(z>z1?z-z1:0),d=Math.max(dx,dz);
  if(d===0)return y;if(d>=f)return g;return Math.round(y+(g-y)*d/f);}
function mwTrenchAt(z){const T=MPC.TRENCH_Z;for(let i=0;i<4;i++)if(z===T[i]||z===T[i]+1)return i;return -1;}
function mwIsBridge(x){const m=((x%32)+32)%32;return m<=1||m===31;}
function mwArchAt(z){for(let i=0;i<3;i++)if(z===MW_ARCH[i][0]||z===MW_ARCH[i][1])return i;return -1;}
function mwArchOpen(i){if(i===0)return true;const k=i===1?'a2':'a3';return !!(MP.open[k]||(typeof MWR!=='undefined'&&MWR.opening[k]));}
function mwLabsEdge(z){return Math.round(8*(vnoise2(z*0.05,0.5,mwSa(29))*2-1));}   /* Labs x < edge <= Pork Palace (bible 3.8) */

/* ---- the Woods surface (bible 3.6): deckY + round(3 fbm2), faded to the deck at the proscenium, Arch 1, the wings, the pads and the
   centre aisle (|x| <= 4, over every trench's centre bridge: a clear, legible line from the Mark to Arch 1) ---- */
function mwWoodsG(x,z){let lip=99;for(const z0 of MPC.TRENCH_Z)lip=Math.min(lip,z<z0-3?z0-3-z:(z>z0+4?z-z0-4:0));
  const a=Math.min(clamp((z+158)/8,0,1),clamp((-60-z)/8,0,1),clamp((75-Math.abs(x))/6,0,1),clamp((Math.abs(x)-4)/6,0,1),clamp(lip/4,0,1));   /* centre aisle + trench lips rake with deckY */
  let g=deckY(z)+Math.round(a*3*fbm2(x*0.04,z*0.04,mwSa(0),2));
  g=mwZone(g,x,z,-4,4,-140,-132,MPC.MARK_PAD.y,6);            /* the Mark pad, levelled to y 35 */
  g=mwZone(g,x,z,-2,4,-148,-144,MPC.UMARK.bomber[1]-1,4);       /* the Demolitionist's Understudy Mark and its can */
  return g;}
/* ---- rostra (the hills): jittered 24-grid in the 4 bands between the trenches, 60% occupied, hollow crawlspace >= 2 ---- */
const MW_RB=[[-144,-131],[-120,-107],[-96,-83],[-72,-63]];
function mwRostrum(gx,bi){const W=mwW();const R=W.ros||(W.ros=new Map());const key=gx*8+bi;if(R.has(key))return R.get(key);
  let r=null;
  if(mwH(gx,bi,0,1)<0.6){const b=MW_RB[bi],L=b[1]-b[0]+1;
    const w=6+Math.floor(mwH(gx,bi,1,1)*9),d=Math.min(L,6+Math.floor(mwH(gx,bi,2,1)*9));
    const x0=gx*24+Math.floor(mwH(gx,bi,3,1)*(24-w+1)),z0=b[0]+Math.floor(mwH(gx,bi,4,1)*(L-d+1));
    r={x0,x1:x0+w-1,z0,z1:z0+d-1,H:3+Math.floor(mwH(gx,bi,5,1)*3),gog:mwH(gx,bi,6,1)<0.15,id:'R'+gx+','+bi};
    if(r.x0<-70||r.x1>70||(r.x0<=8&&r.x1>=-8)||mwRectGap(r,-4,4,-140,-132)<12||mwRectGap(r,-2,4,-148,-144)<4||mwFlatWNear(r.x0,r.x1,r.z0,r.z1,2))r=null;
    else r.g0=mwWoodsG((r.x0+r.x1)>>1,(r.z0+r.z1)>>1);}
  R.set(key,r);return r;}
function mwRostrumAt(x,z){let bi=-1;for(let i=0;i<4;i++)if(z>=MW_RB[i][0]&&z<=MW_RB[i][1]){bi=i;break;}if(bi<0)return null;
  const r=mwRostrum(Math.floor(x/24),bi);return r&&x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1?r:null;}
/* ---- trench climb-outs: a 1-wide step stair cut into the trench wall, every 16 x on alternating lips (bible 3.6) ---- */
/* bases every 16 x on alternating lips (downstage x = 8 mod 32, upstage x = 24 mod 32; the two end bases turn inward), so no trench
   cell is more than 8 blocks from the foot of a stair; each stair climbs 1 per block along the wall column next to the trench */
const MW_CLIMB=[{u:0,xs:-56,d:1},{u:0,xs:-24,d:1},{u:0,xs:8,d:1},{u:0,xs:40,d:1},{u:0,xs:72,d:-1},
  {u:1,xs:-72,d:1},{u:1,xs:-40,d:-1},{u:1,xs:-8,d:-1},{u:1,xs:24,d:-1},{u:1,xs:56,d:-1}];
function mwClimbStep(x,z){const T=MPC.TRENCH_Z;
  for(let t=0;t<4;t++){const z0=T[t],u=z===z0+2?1:(z===z0-1?0:-1);if(u<0)continue;
    for(const c of MW_CLIMB){if(c.u!==u)continue;const i=(x-c.xs)*c.d;if(i>=0&&i<16)return 23+i;}}
  return -1;}

/* ---- the Kitchen (bible 3.7): countertop mesas on a jittered Voronoi 40-grid, soup fjords in the borders, sink drains ---- */
function mwVorSite(i,j){return [i*40+20+(mwH(i,j,0,22)-0.5)*32,j*40+20+(mwH(i,j,1,22)-0.5)*32];}
function mwVor(x,z){const gi=Math.floor(x/40),gj=Math.floor(z/40);let d1=1e9,d2=1e9,a=null,b=null;
  for(let i=gi-1;i<=gi+1;i++)for(let j=gj-1;j<=gj+1;j++){const s=mwVorSite(i,j),d=(x+0.5-s[0])**2+(z+0.5-s[1])**2;
    if(d<d1){d2=d1;b=a;d1=d;a=[i,j,s[0],s[1]];}else if(d<d2){d2=d;b=[i,j,s[0],s[1]];}}
  const sep=Math.hypot(a[2]-b[2],a[3]-b[3])||1;return {i:a[0],j:a[1],sx:a[2],sz:a[3],bi:b[0],bj:b[1],e:(d2-d1)/(2*sep)};}
function mwMesaCell(i,j){const K=mwKitchen();if(K&&K.i===i&&K.j===j)return true;
  const s=mwVorSite(i,j);if(s[1]<-50||s[1]>34||Math.abs(s[0])>66)return false;return mwH(i,j,2,22)>0.45;}
function mwMesaTop(i,j,x,z){const s=mwVorSite(i,j);let t=Math.min(56,deckY(Math.round(s[1]))+8+Math.floor(mwH(i,j,3,22)*7));
  const K=mwKitchen();if(K&&K.i===i&&K.j===j)return K.T;
  if(x!=null&&mwH(i,j,4,22)<0.2){const a=mwH(i,j,5,22)*6.283;if((x+0.5-s[0])*Math.cos(a)+(z+0.5-s[1])*Math.sin(a)>0)t=Math.min(60,t+4);}
  return t;}
function mwKitchenFree(x,z){                         /* forced plain kitchen floor: drains, Booth 1's pad, the arches, the wings */
  if(z<-54||z>37||Math.abs(x)>72)return true;
  for(const d of MPC.DRAINS)if((x-d[0])**2+(z-d[1])**2<=64)return true;
  const b=MPC.BOOTH[0];if(Math.abs(x-b[0])<=6&&Math.abs(z-b[1])<=6)return true;
  return false;}
/* the Cook's Kitchen: the tallest mesa near (40,-10) whose interior holds the stair notch, the hut, the stock pot and the coop */
function mwKitchen(){const W=mwW();if(W.kit!==undefined)return W.kit;W.kit=null;
  const C=MPC.KITCHEN_NEAR,cand=[];
  for(let i=-3;i<=3;i++)for(let j=-2;j<=1;j++){const s=mwVorSite(i,j);const d=Math.hypot(s[0]-C[0],s[1]-C[1]);if(d>75)continue;
    if(s[1]<-44||s[1]>26||Math.abs(s[0])>58)continue;
    const T=Math.min(56,deckY(Math.round(s[1]))+8+Math.floor(mwH(i,j,3,22)*7));cand.push({i,j,s,T,d,occ:mwH(i,j,2,22)>0.45});}
  cand.sort((a,b)=>(b.occ-a.occ)||((b.T-b.d*0.15)-(a.T-a.d*0.15)));   /* tall and near (40,-10) */
  const inside=(c,x,z)=>{if(mwKitchenFree(x,z))return false;const v=mwVor(x,z);return v.i===c.i&&v.j===c.j&&v.e>=3;};
  for(const c of cand){const sx=Math.round(c.s[0]);let ze=Math.round(c.s[1]);
    while(ze>c.s[1]-30&&inside(c,sx,ze))ze--;                 /* ze: the first floor cell downstage of the mesa edge */
    if(inside(c,sx,ze))continue;
    const base=deckY(ze),H=c.T-base;if(H<6)continue;
    const nz0=ze+1,nz1=ze+H-1,hz0=ze+H+2,hx0=sx-4;
    const box=[[sx,sx,nz0,nz1+1],[hx0-1,hx0+9,hz0-1,hz0+7],[hx0-8,hx0-2,hz0,hz0+6],[hx0+9,hx0+15,hz0,hz0+6]];
    let ok=true;
    for(const b of box){for(let x=b[0];x<=b[1]&&ok;x++)for(let z=b[2];z<=b[3]&&ok;z++)if(!inside(c,x,z))ok=false;if(!ok)break;}
    if(!ok)continue;
    W.kit={i:c.i,j:c.j,T:c.T,sx,base,notch:{x:sx,z0:nz0,z1:nz1,base},hut:{x0:hx0,z0:hz0},pot:{x0:hx0-7,z0:hz0+1},coop:{x0:hx0+10,z0:hz0+1}};
    break;}
  if(!W.kit){const sx=40,ze=-28,base=deckY(ze),T=base+12,v=mwVor(40,-10);   /* never seen in testing: force the cell under (40,-10) */
    W.kit={i:v.i,j:v.j,T,sx,base,forced:1,notch:{x:sx,z0:ze+1,z1:ze+T-base-1,base},hut:{x0:sx-4,z0:ze+T-base+2},pot:{x0:sx-11,z0:ze+T-base+3},coop:{x0:sx+6,z0:ze+T-base+3}};}
  return W.kit;}
function mwKitchenHut(){const K=mwKitchen();if(!K)return null;const h=K.hut;
  return {x0:Math.min(h.x0,K.pot.x0),x1:h.x0+8,y0:K.T,y1:K.T+4,z0:h.z0,z1:h.z0+6};}

/* ---- the Pork Palace and the Labs (bible 3.8) ---- */
function mwBench(bi,bj){const W=mwW();const M=W.ben||(W.ben=new Map());const k=bi*512+bj;if(M.has(k))return M.get(k);let r=null;
  if(mwH(bi,bj,0,30)<0.4){const w=3+Math.floor(mwH(bi,bj,1,30)*4),d=3+Math.floor(mwH(bi,bj,2,30)*3);
    const x0=bi*12+Math.floor(mwH(bi,bj,3,30)*(12-w)),z0=bj*12+Math.floor(mwH(bi,bj,4,30)*(12-d));
    r={x0,x1:x0+w-1,z0,z1:z0+d-1,top:deckY(z0)+1+Math.floor(mwH(bi,bj,5,30)*2)};
    if(r.z0<46||r.z1>147||r.x0<-72||r.x1>=Math.min(mwLabsEdge(r.z0),mwLabsEdge(r.z1))-2||mwRectGap(r,MW_HQ.x0,MW_HQ.x1,MW_HQ.z0,MW_HQ.z1)<3||
      mwRectGap(r,-12,12,62,143)<2||mwRectGap(r,-56,-45,104,115)<1)r=null;}
  M.set(k,r);return r;}
function mwBenchAt(x,z){const r=mwBench(Math.floor(x/12),Math.floor(z/12));return r&&x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1?r:null;}

/* ---- the column function ---- */
function mpCol(x,z){x=Math.floor(x);z=Math.floor(z);
  if(x<-120||x>120||z<-330||z>300)return MW_VOIDC;
  mwW();const key=(x+512)*2048+(z+1024);let c=MCOLM.get(key);if(c)return c;
  if(MCOLM.size>60000)MCOLM.clear();
  c=mwColCompute(x,z);MCOLM.set(key,c);return c;}
const MW_VOIDC=Object.freeze({k:0,b:'void',g:0,h:30,tb:0});
function mpSurf(x,z){return mpCol(x,z).h;}
function mwBiomeAt(x,z,y){const c=mpCol(x,z);if(y!=null&&c.k>=MW_K.HOUSE&&c.k!==MW_K.BACK&&y<c.gb-3)return 'under';return c.b;}
function mwColCompute(x,z){const K=MW_K,ax=Math.abs(x);
  const C=(k,o)=>Object.assign({k,b:MW_BN[k]},o);
  /* outside the stage */
  if(ax>111||z<-315||z>282)return C(K.VOID,{g:0,h:30,gb:0,tb:0});
  if(z>=-304&&z<=-300&&x>=MPC.EXIT.x0&&x<=MPC.EXIT.x1)return C(K.VEST,{g:57,h:57,gb:57,tb:B.PG_MBLACK});
  if(ax>95||z>266||z<-299)return C(K.BORDER,{g:70,h:70,gb:70,tb:B.PG_MBLACK});
  /* the House, the pit, the apron */
  if(z===-299){if(x>=MPC.EXIT.x0&&x<=MPC.EXIT.x1)return C(K.EXIT,{g:57,h:57,gb:57,tb:B.PG_MBLACK});return C(K.HWALL,{g:70,h:70,gb:70,tb:B.PG_MBLACK});}
  if(z<=-161&&(x<-64||x>63))return C(K.HWALL,{g:70,h:70,gb:70,tb:B.PG_MBLACK});
  if(z<=-203){const t=Math.floor((-203-z)/4),y=Math.min(57,34+t),zt=-203-4*t;
    const aisle=(x>=-36&&x<=-34)||(x>=-1&&x<=1)||(x>=34&&x<=36);
    return C(K.HOUSE,{g:y,h:y,gb:y,tb:B.PG_DECK,seat:(t<=23&&z===zt-1&&!aisle)?1:0,row:t});}
  if(z<=-161){
    if(x>=-40&&x<=39&&z<=-191){const ring=z===-202||z===-191||x===-40||x===39;let st=-1;
      const cs=(x>=-1&&x<=1),es=(x>=-39&&x<=-38)||(x>=37&&x<=38);
      if(cs||es){if(z===-191)st=33;else if(z===-192)st=32;else if(z===-193)st=31;}
      if(cs){if(z===-202)st=33;else if(z===-201)st=32;else if(z===-200)st=31;}
      if(st>0)return C(K.PIT,{g:st,h:st,gb:st,tb:B.PG_DECK,step:1});
      if(ring)return C(K.PIT,{g:34,h:34,gb:30,tb:B.PG_MBLACK,ring:1});
      return C(K.PIT,{g:30,h:30,gb:30,tb:B.PG_DECK});}
    if(x>=-40&&x<=39)return C(K.APRON,{g:34,h:34,gb:34,tb:B.PG_DECK});
    return C(K.SIDE,{g:34,h:34,gb:34,tb:B.PG_DECK});}
  if(z<=-159)return C(K.PROSC,{g:34,h:(x>=-40&&x<=39)?34:70,gb:34,tb:B.PG_DECK});
  if(z>=262)return C(K.BACK,{g:70,h:70,gb:deckY(z),tb:B.PG_PSKY});
  const ai=mwArchAt(z);
  if(ai>=0){const d=deckY(z);return C(K.ARCH,{g:d,h:ax>=56?70:d,gb:d,tb:B.PG_DECK,ai});}
  if(ax>=76)return C(K.WINGS,{g:deckY(z),h:deckY(z),gb:deckY(z),tb:B.PG_DECK});
  /* ---- PLANE 1: FELT FOREST ---- */
  if(z<=-60){let g=mwWoodsG(x,z);const o={tb:B.PG_SHAG};
    const tr=ax<=75?mwTrenchAt(z):-1;
    if(tr>=0){if(mwIsBridge(x))o.bridge=1;else o.trench=1;o.g=g;o.h=g;o.gb=g;return C(K.WOODS,o);}
    const st=mwClimbStep(x,z);if(st>0&&st<g){o.step=st;o.g=g;o.h=g;o.gb=g;return C(K.WOODS,o);}
    for(const z0 of MPC.TRENCH_Z)if(z>=z0-2&&z<=z0+3){o.tw=1;break;}
    const r=mwRostrumAt(x,z);
    if(r){g=r.g0;const top=g+r.H,edge=x===r.x0||x===r.x1||z===r.z0||z===r.z1;
      const leg=edge&&((z===r.z0||z===r.z1)&&((x-r.x0)%4===0||x===r.x1)||(x===r.x0||x===r.x1)&&((z-r.z0)%4===0||z===r.z1));
      const cxm=(r.x0+r.x1)>>1,czm=(r.z0+r.z1)>>1;
      o.ros={top,leg:leg?1:0,rim:edge?1:0,gog:(r.gog&&(x===cxm||x===cxm+1)&&(z===czm||z===czm+1))?1:0};o.g=g;o.h=top;o.gb=g;return C(K.WOODS,o);}
    const Mp=MPC.MARK_PAD,Hu=MPC.UMARK.bomber;if((x>=Mp.x0&&x<=Mp.x1&&z>=Mp.z0&&z<=Mp.z1)||(Math.abs(x-Hu[0])<=1&&Math.abs(z-Hu[2])<=1)){o.tb=B.PG_DECK;o.pad=1;}
    o.g=g;o.h=g;o.gb=g;return C(K.WOODS,o);}
  /* ---- PLANE 2: KITCHEN ---- */
  if(z<=40){const base=deckY(z),o={g:base,h:base,gb:base,tb:B.PG_DECK};
    for(let i=0;i<3;i++){const d=MPC.DRAINS[i],cd=Math.max(Math.abs(x-d[0]),Math.abs(z-d[1]));   /* a 5x5 shaft in a 7x7 Countertop rim */
      if(cd<=2){o.drain=1;o.di=i;o.dx=x-d[0];o.dz=z-d[1];return C(K.KITCHEN,o);}
      if(cd===3){o.dwall=1;o.di=i;o.dx=x-d[0];o.dz=z-d[1];return C(K.KITCHEN,o);}}
    const b0=MPC.BOOTH[0];if(Math.abs(x-b0[0])<=4&&Math.abs(z-b0[1])<=4){o.g=o.h=o.gb=deckY(b0[1]);return C(K.KITCHEN,o);}
    const Kt=mwKitchen();
    if(Kt&&x===Kt.notch.x&&z>=Kt.notch.z0&&z<=Kt.notch.z1){o.mesa=1;o.g=o.h=Kt.notch.base+1+(z-Kt.notch.z0);o.tb=B.PG_COUNTER;return C(K.KITCHEN,o);}
    if(mwKitchenFree(x,z))return C(K.KITCHEN,o);
    const v=mwVor(x,z);
    if(v.e>=3){if(mwMesaCell(v.i,v.j)){o.mesa=1;o.g=o.h=mwMesaTop(v.i,v.j,x,z);o.tb=B.PG_COUNTER;o.mi=v.i;o.mj=v.j;o.e=v.e;}
      return C(K.KITCHEN,o);}
    const a=Math.min(v.i*64+v.j,v.bi*64+v.bj),bb=Math.max(v.i*64+v.j,v.bi*64+v.bj);
    if(mwH(a,bb,0,26)<0.4){const dep=3-Math.floor(v.e);o.g=base-dep;o.fj=dep;}
    o.nearMesa=(mwMesaCell(v.i,v.j)||mwMesaCell(v.bi,v.bj))?1:0;
    return C(K.KITCHEN,o);}
  /* ---- PLANE 3: PROP LAB | GRAND STAIRCASE | PORK PALACE ---- */
  if(z<=150){const base=deckY(z);
    const u=MPC.UMARK.bigpig;if(x>=u[0]-2&&x<=u[0]+4&&z>=u[2]-2&&z<=u[2]+1)return C(K.LABS,{g:base,h:base,gb:base,tb:B.PG_DECK,pad:1});   /* P4 stamps the pad + can on the deck (deckY(64)=43) */
    if(x>=-10&&x<=10&&z>=66&&z<=141)return C(K.STAIR,{g:base,h:base,gb:base,tb:B.PG_DECK});
    const b2=MPC.BOOTH[1];if(Math.abs(x-b2[0])<=4&&Math.abs(z-b2[1])<=4){const y=deckY(b2[1]);return C(K.PALACE,{g:y,h:y,gb:y,tb:B.PG_DECK});}
    const edge=mwLabsEdge(z);
    if(x<edge){const o={g:base,h:base,gb:base,tb:B.PG_LINO};
      if(x>=MW_HQ.x0&&x<=MW_HQ.x1&&z>=MW_HQ.z0&&z<=MW_HQ.z1){o.g=o.h=o.gb=MW_HQ.F;o.hq=1;return C(K.LABS,o);}
      const bn=mwBenchAt(x,z);if(bn){o.g=o.h=bn.top;o.bench=1;}
      return C(K.LABS,o);}
    let amp=clamp((x-edge)/4,0,1)*Math.min(clamp((z-43)/4,0,1),clamp((150-z)/4,0,1),clamp((75-ax)/4,0,1));
    if(z>=62&&z<=145)amp*=clamp((ax-12)/4,0,1);
    const n=2*fbm2(x*0.02,z*0.02,mwSa(32),2),g=base+Math.round(amp*4*Math.sin(x*0.15+n)*Math.cos(z*0.09));
    return C(K.PALACE,{g,h:g,gb:g,tb:B.PG_SATIN});}
  /* ---- PLANE 4: THE BACK SWAMP ---- */
  {const h=deckY(z);let ty;
    const b3=MPC.BOOTH[2],ku=MPC.UMARK.bigfrog,G=MPC.GHOST;
    if((Math.abs(x-b3[0])<=4&&Math.abs(z-b3[1])<=4)||(x>=ku[0]-3&&x<=ku[0]+5&&z>=ku[2]-3&&z<=ku[2]+3)){
      const y=(Math.abs(x-b3[0])<=4&&Math.abs(z-b3[1])<=4)?deckY(b3[1]):deckY(ku[2]);return C(K.SWAMP,{g:y,h:y,gb:y,tb:B.PG_DECK,sw:0,pad:1});}
    ty=mwSwampType(x,z);
    if(ty===1){let nx=0,nz=0;for(let k=1;k<=3;k++){if(mwSwampType(x+k,z)===0)nx|=1;if(mwSwampType(x-k,z)===0)nx|=2;if(mwSwampType(x,z+k)===0)nz|=1;if(mwSwampType(x,z-k)===0)nz|=2;}
      if(nx===3||nz===3)return C(K.SWAMP,{g:h,h,gb:h,tb:B.PG_SHEET,sw:5});}   /* a sheet strip <= 5 wide between islands lies on felt: no hollow to be trapped in */
    if(ty===0)return C(K.SWAMP,{g:h,h,gb:h,tb:B.PG_SWAMP,sw:0});
    if(ty===1)return C(K.SWAMP,{g:h,h,gb:h-6,tb:B.PG_SHEET,sw:1});
    if(ty===3)return C(K.SWAMP,{g:h-1,h,gb:h-1,tb:B.PG_FOAM,sw:2,shal:1});   /* the lake's 1-deep shore ring */
    return C(K.SWAMP,{g:h-2,h,gb:h-2,tb:B.PG_FOAM,sw:2});}
}
function mwSwampType(x,z){const G=MPC.GHOST;if(Math.hypot(x-G[0],z-G[1])<=4||z>=258||z<=155)return 0;   /* 0 island, 1 sheet, 2 lake, 3 lake shore */
  const n=fbm2(x*0.05,z*0.05,mwSa(35),3)*2-1;return n>0.25?0:(n<-0.35?(n<-0.45?2:3):1);}
/* is this column plain open ground of its biome (for holes, heaps, mounds, coils, mirrors, pens...) */
function mwOpenGround(c){return !c.trench&&!c.bridge&&!c.step&&!c.ros&&!c.mesa&&!c.fj&&!c.drain&&!c.dwall&&!c.bench&&!c.hq&&!c.pad&&!c.tw&&c.sw!==1&&c.sw!==2;}

/* ---- seam caves: a coarse 5x9x5 lattice (copied from genCaveField), y 8..30, lens tunnels taller than wide ---- */
function mwCaveField(x0,z0){const NX=5,NY=9,NZ=5,n=NX*NY*NZ,f1=new Float32Array(n),f2=new Float32Array(n);let i=0;
  for(let gx=0;gx<NX;gx++)for(let gy=0;gy<NY;gy++)for(let gz=0;gz<NZ;gz++,i++){const x=(x0+gx*4)*0.075,y=(gy*4)*0.052,z=(z0+gz*4)*0.075;
    f1[i]=vnoise3(x,y,z,mwSa(16));f2[i]=vnoise3(x,y,z,mwSa(17));}
  return {f1,f2,NY,NZ};}
function mwCave(cf,lx,y,lz){const gx=lx/4,gy=y/4,gz=lz/4,x0=gx|0,y0=gy|0,z0=gz|0,tx=gx-x0,ty=gy-y0,tz=gz-z0;
  const x1=Math.min(x0+1,4),y1=Math.min(y0+1,cf.NY-1),z1=Math.min(z0+1,4),NY=cf.NY,NZ=cf.NZ;
  const tri=f=>{const S=(a,b,c)=>f[(a*NY+b)*NZ+c];
    const a=lerp(S(x0,y0,z0),S(x1,y0,z0),tx),b=lerp(S(x0,y1,z0),S(x1,y1,z0),tx),c=lerp(S(x0,y0,z1),S(x1,y0,z1),tx),d=lerp(S(x0,y1,z1),S(x1,y1,z1),tx);
    return lerp(lerp(a,b,ty),lerp(c,d,ty),tz);};
  const a=Math.abs(tri(cf.f1)-0.5);if(a>=0.11)return 0;const b=Math.abs(tri(cf.f2)-0.5);
  return (a<0.062&&b<0.062)?1:(b<0.11?2:0);}
/* Knuckle Ore: 1-3 per chunk on y 3, touching The Puppeteer (bible 6) */
function mwKnuckles(cx,cz){const n=1+Math.floor(mwH(cx,cz,0,25)*3),o=[];
  for(let k=0;k<n;k++)o.push(Math.floor(mwH(cx,cz,k+1,25)*256));return o;}

/* ---- the generator ---- */
function genChunkPuppet(cx,cz){const bl=new Uint8Array(CH*WH*CH),x0=cx*CH,z0=cz*CH;
  if(x0>111||x0+CH<=-111||z0>282||z0+CH<=-315)return bl;
  const cf=mwCaveField(x0,z0),kn=mwKnuckles(cx,cz);
  for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){const x=x0+lx,z=z0+lz;
    mwFill(bl,lx,lz,x,z,mpCol(x,z),cf,kn.indexOf(lx*16+lz)>=0);}
  if(typeof mpStampArenas==='function')mpStampArenas(bl,x0,z0);   /* P4: apron layout, the staircase, the Frog's clearing + Inside the Frog */
  mwStampFixed(bl,x0,z0);
  mwStampCells(bl,x0,z0);
  mwStampTrees(bl,x0,z0);
  mwStampFlats(bl,x0,z0);
  return bl;}
function mwFill(bl,lx,lz,x,z,c,cf,knk){const K=MW_K,o=lx*WH*CH+lz;   /* bidx(lx,y,lz) = o + y*CH */
  const S=(y,id)=>{bl[o+y*CH]=id;};
  if(c.k===K.VOID)return;
  for(let y=0;y<=2;y++)S(y,B.PG_SKIN);
  if(c.k===K.BORDER||c.k===K.HWALL){for(let y=3;y<=70;y++)S(y,B.PG_MBLACK);return;}
  if(c.k===K.BACK){for(let y=3;y<=70;y++)S(y,B.PG_PSKY);return;}
  if(c.k===K.EXIT||c.k===K.VEST){const op=c.k===K.VEST||!!MP.strike;
    for(let y=3;y<=70;y++)S(y,y>=58&&y<=61?(c.k===K.VEST?B.AIR:(op?B.AIR:B.PG_TRAVELER)):B.PG_MBLACK);return;}
  /* the ground: Rotten Foam 3-13, Foam 14..gb-4, Stage Deck gb-3..gb-1, the top block at gb */
  const gb=c.gb,cav=c.k!==K.ARCH&&!c.step,top=gb-4,sub=c.k===K.SWAMP&&c.sw===1?gb:gb-3;
  const sq=z>42?0.02:0.01,tw=c.tw?3:1,dw=c.dwall?1:0;
  let prevAir=false;
  for(let y=3;y<=gb;y++){let id;
    if(y<=13){id=B.PG_ROT;
      if(y>=4&&h3(x>>1,y>>1,z>>1,mwSa(24))<sq&&h3(x,y,z,mwSa(24)+1)<0.6)id=B.PG_SEQORE;
      else if(y===3&&knk)id=B.PG_KNUCKLE;}
    else if(y<=top||(sub===gb&&y<gb)){id=B.PG_FOAM;
      const r=h3(x,y,z,mwSa(23));
      if(dw&&y>=16&&y<=30&&r<0.25)id=B.PG_WIREORE;
      else if(y<=30&&r<0.007)id=B.PG_WIREORE;
      else if(y>=18&&r<0.007+0.012*tw)id=B.PG_GOOGLY;}
    else if(y<gb)id=B.PG_DECK;
    else id=c.k===K.SWAMP&&c.sw===1?B.PG_FOAM:(c.k===K.SWAMP&&c.sw===2?B.PG_FOAM:(c.tb===B.PG_COUNTER||c.tb===B.PG_MBLACK?B.PG_DECK:c.tb));
    if(cav&&y>=8&&y<=30&&y<=gb-4){const cv=mwCave(cf,lx,y,lz);
      if(cv===1){if(!prevAir&&h3(x,y,z,mwSa(39))<0.025&&y>8)S(y-1,B.PG_BACKING);id=B.AIR;prevAir=true;}
      else{prevAir=false;if(cv===2&&id===B.PG_FOAM&&y>=18&&h3(x,y,z,mwSa(23))<0.024)id=B.PG_GOOGLY;}}
    S(y,id);}
  switch(c.k){
    case K.WOODS:
      if(c.trench){for(let y=23;y<=gb;y++)S(y,B.AIR);S(22,B.PG_STUFFING);break;}
      if(c.bridge){for(let y=23;y<=gb-2;y++)S(y,B.AIR);S(22,B.PG_STUFFING);S(gb-1,B.PG_DECK);S(gb,B.PG_DECK);break;}
      if(c.step){for(let y=c.step+1;y<=gb;y++)S(y,B.AIR);break;}
      if(c.ros){const r=c.ros;for(let y=gb+1;y<r.top;y++)S(y,r.leg?B.PG_BRACE:B.AIR);S(r.top,r.rim?B.PG_DECK:B.PG_SHAG);if(r.gog)S(gb,B.PG_GOOGLY);}
      break;
    case K.KITCHEN:{const base=deckY(z);
      if(c.mesa){for(let y=base;y<=c.g;y++)S(y,B.PG_COUNTER);break;}
      if(c.fj){for(let y=c.g+1;y<=gb;y++)S(y,B.AIR);for(let y=c.g;y>c.g-3;y--)S(y,B.PG_DECK);for(let y=c.g+1;y<=base-1;y++)S(y,B.PG_SOUP);break;}
      if(c.drain){for(let y=16;y<=base;y++)S(y,B.AIR);S(14,B.PG_STUFFING);S(15,B.PG_STUFFING);
        let a=-1;for(let k=0;k<16;k++)if(MW_DRAIN_ORDER[k][0]===c.dx&&MW_DRAIN_ORDER[k][1]===c.dz){a=k;break;}
        if(a>=0)for(let j=0;j<6;j++){const y=base-1-Math.floor((j*16+a)/2);if(y<16)break;S(y,B.PG_COUNTER);}
        break;}
      if(c.dwall){const gap=c.dx===0&&c.dz===-3;if(!gap)S(base+1,B.PG_COUNTER);}
      break;}
    case K.LABS:if(c.bench){for(let y=deckY(z);y<=c.g;y++)S(y,B.PG_LINO);}break;
    case K.PALACE:if(c.tb===B.PG_SATIN)S(gb-1,B.PG_SATIN);break;
    case K.SWAMP:
      if(c.sw===1){const h=c.g;S(h-5,B.PG_SCUM);for(let y=h-4;y<h;y++)S(y,B.AIR);S(h,B.PG_SHEET);}
      else if(c.sw===2){for(let y=gb+1;y<=c.h;y++)S(y,B.PG_SCUM);}
      else if(c.sw===0&&!c.pad&&mwH(x,z,0,37)<0.2&&mwSwampEdge(x,z))S(gb+1,B.PG_CATTAIL);
      break;
    case K.HOUSE:if(c.seat)S(gb+1,B.PG_SEAT);break;
    case K.PIT:if(c.ring){for(let y=31;y<=34;y++)S(y,B.PG_MBLACK);}break;
    case K.PROSC:{const op=x>=-40&&x<=39;for(let y=35;y<=70;y++)S(y,op&&y<=60?B.AIR:B.PG_VELVET);break;}
    case K.ARCH:{const ax=Math.abs(x),open=mwArchOpen(c.ai);
      for(let y=3;y<=70;y++){const vel=y>gb&&(ax>=56&&ax<=75||y>=56);
        if(vel)S(y,B.PG_VELVET);else if(!open)S(y,B.PG_TRAVELER);}
      break;}
  }
}
function mwSwampEdge(x,z){const n=[mpCol(x+1,z),mpCol(x-1,z),mpCol(x,z+1),mpCol(x,z-1)];
  for(const c of n)if(c.k===MW_K.SWAMP&&c.sw!==0)return true;return false;}

/* ---- stamps: fixed structures ---- */
function mwIn(x0,z0,ax0,ax1,az0,az1){return !(ax1<x0||ax0>=x0+CH||az1<z0||az0>=z0+CH);}
function mwPut(bl,x0,z0,x,y,z,id){const lx=x-x0,lz=z-z0;if(lx<0||lx>=CH||lz<0||lz>=CH||y<1||y>=WH)return;bl[bidx(lx,y,lz)]=id;}
function mwGet(bl,x0,z0,x,y,z){const lx=x-x0,lz=z-z0;if(lx<0||lx>=CH||lz<0||lz>=CH||y<0||y>=WH)return -1;return bl[bidx(lx,y,lz)];}
function mwBooths(){const W=mwW();if(W.booths)return W.booths;
  W.booths=MPC.BOOTH.map((b,i)=>{const y=deckY(b[1]);return {i,x:b[0],z:b[1],y,can:[b[0]+1,y+1,b[1]+2],lamp:[b[0]-1,y+1,b[1]+2],
    bench:i===2?[b[0],y+1,b[1]+2]:null,bkr:i===2?[b[0]-1,y+1,b[1]+1]:null,spawn:[b[0],y+1,b[1]]};});
  return W.booths;}
function mwStampFixed(bl,x0,z0){const P_=(x,y,z,id)=>mwPut(bl,x0,z0,x,y,z,id);
  /* the Mark: hub Bin, the bots' Stuffing heap */
  if(mwIn(x0,z0,-8,4,-138,-133)){const h=MPC.HUB_CAN;P_(h[0],h[1],h[2],B.PG_CAN);const H=MPC.BOT_HEAP;
    for(let x=H.x0;x<=H.x1;x++)for(let z=H.z0;z<=H.z1;z++){const g=mpCol(x,z).g;P_(x,g+1,z,B.PG_STUFFING);
      if(x===(H.x0+H.x1)>>1&&z===(H.z0+H.z1)>>1)P_(x,g+2,z,B.PG_STUFFING);}}
  /* Quick-Change Booths: 5x4 Masking Black alcove, 3 high, open on -z, Bin + Eyeball Lamp (+ Lab Bench in Booth 3) */
  for(const b of mwBooths()){if(!mwIn(x0,z0,b.x-2,b.x+2,b.z,b.z+3))continue;const y=b.y;
    for(let x=b.x-2;x<=b.x+2;x++)for(let z=b.z;z<=b.z+3;z++){const wall=x===b.x-2||x===b.x+2||z===b.z+3;
      for(let yy=y+1;yy<=y+3;yy++)P_(x,yy,z,wall?B.PG_MBLACK:B.AIR);P_(x,y+4,z,B.PG_MBLACK);}
    P_(b.can[0],b.can[1],b.can[2],B.PG_CAN);P_(b.lamp[0],b.lamp[1],b.lamp[2],B.PG_LAMP);
    if(b.bench)P_(b.bench[0],b.bench[1],b.bench[2],B.PG_BENCH);}
  /* the Understudy pads (P4 stamps their cans at UMARK+[3,0,1]); the pads themselves are levelled by the column function */
  /* Labs HQ: Lab Linoleum floor, Masking Black walls 5 high with window gaps, an open door on -z, a roof, the permanent Lab Bench */
  {const Q=MW_HQ;if(mwIn(x0,z0,Q.x0,Q.x1,Q.z0,Q.z1)){const F=Q.F;
    for(let x=Q.x0;x<=Q.x1;x++)for(let z=Q.z0;z<=Q.z1;z++){const wx=x===Q.x0||x===Q.x1,wz=z===Q.z0||z===Q.z1;
      for(let y=F+1;y<=F+5;y++){let id=B.AIR;
        if(wx||wz){id=B.PG_MBLACK;const corner=wx&&wz;
          if(!corner&&(y===F+2||y===F+3)&&((wx&&(z-Q.z0)%3===2)||(wz&&z===Q.z1&&(x-Q.x0)%3===2)))id=B.AIR;
          if(z===Q.z0&&x>=-41&&x<=-39&&y<=F+3)id=B.AIR;}
        P_(x,y,z,id);}
      P_(x,F+6,z,B.PG_MBLACK);}
    P_(Q.bench[0],Q.bench[1],Q.bench[2],B.PG_BENCH);}}
  /* the Cook's Kitchen: the hut, the counter, the 2x2 stove, the stock pot (with its inside step), the hen coop */
  {const Kt=mwKitchen();if(Kt){const T=Kt.T,h=Kt.hut,p=Kt.pot,co=Kt.coop;
    if(mwIn(x0,z0,h.x0,h.x0+8,h.z0,h.z0+6)){
      for(let x=h.x0;x<=h.x0+8;x++)for(let z=h.z0;z<=h.z0+6;z++){const wall=x===h.x0||x===h.x0+8||z===h.z0+6;
        if(wall)for(let y=T+1;y<=T+3;y++)P_(x,y,z,B.PG_COUNTER);
        else if(z===h.z0)P_(x,T+1,z,B.PG_COUNTER);}
      for(const [dx,dz] of [[5,4],[6,4],[5,5],[6,5]])P_(h.x0+dx,T,h.z0+dz,B.PG_BURNER);}
    if(mwIn(x0,z0,p.x0,p.x0+4,p.z0,p.z0+4)){
      for(let x=p.x0;x<=p.x0+4;x++)for(let z=p.z0;z<=p.z0+4;z++){const ring=x===p.x0||x===p.x0+4||z===p.z0||z===p.z0+4;
        if(ring){P_(x,T,z,B.PG_MBLACK);P_(x,T+1,z,B.PG_MBLACK);}
        else{P_(x,T-1,z,B.PG_COUNTER);P_(x,T,z,(x===p.x0+1&&z===p.z0+1)?B.PG_COUNTER:B.PG_SOUP);}}}
    if(mwIn(x0,z0,co.x0,co.x0+4,co.z0,co.z0+4))
      for(let x=co.x0;x<=co.x0+4;x++)for(let z=co.z0;z<=co.z0+4;z++)if(x===co.x0||x===co.x0+4||z===co.z0||z===co.z0+4)P_(x,T+1,z,B.PG_BRACE);}}
  /* the Old Goats' box on the stage-right house wall (MPC.BOX_SW is the standing spot): a 5x3 Velvet balcony */
  {const S=MPC.BOX_SW,fy=S[1]-1;if(mwIn(x0,z0,S[0]-2,S[0]+3,S[2]-1,S[2]+1)){
    for(let x=S[0]-2;x<=S[0]+3;x++)for(let z=S[2]-1;z<=S[2]+1;z++){
      if(x===S[0]+3){for(let y=fy;y<=fy+5;y++)P_(x,y,z,B.PG_VELVET);continue;}
      P_(x,fy,z,B.PG_VELVET);P_(x,fy+5,z,B.PG_VELVET);
      if(x===S[0]-2||z===S[2]+1)P_(x,fy+1,z,B.PG_VELVET);}}}
  /* the Ghost Light: an Eyeball Lamp on a 2-block Masking Black stand */
  {const G=MPC.GHOST;if(mwIn(x0,z0,G[0],G[0],G[1],G[1])){const g=mpCol(G[0],G[1]).g;
    P_(G[0],g+1,G[1],B.PG_MBLACK);P_(G[0],g+2,G[1],B.PG_MBLACK);P_(G[0],g+3,G[1],B.PG_LAMP);}}
  /* the Band Rooms: 12x8x12 caverns, 4 Eyeball Lamps, a tunnel to a trench, a drain or the wings */
  for(const R of MW_BAND){
    if(mwIn(x0,z0,R.x0,R.x1,R.z0,R.z1)){for(let x=R.x0;x<=R.x1;x++)for(let z=R.z0;z<=R.z1;z++){P_(x,16,z,B.PG_FOAM);for(let y=17;y<=22;y++)P_(x,y,z,B.AIR);}
      for(const [x,z] of [[R.x0,R.z0],[R.x1,R.z0],[R.x0,R.z1],[R.x1,R.z1]])P_(x,17,z,B.PG_LAMP);}
    mwStampTunnel(bl,x0,z0,R.tun);}
  /* the Last Guest: a 7x5x7 Stage Deck crew room at (-40,18..22,-110), a short tunnel from the -102 trench, a Prop Trunk */
  {const Gq=MW_GUEST;if(mwIn(x0,z0,Gq.x0,Gq.x1,Gq.z0,Gq.z1+4)){
    for(let x=Gq.x0;x<=Gq.x1;x++)for(let z=Gq.z0;z<=Gq.z1;z++)for(let y=Gq.y0;y<=Gq.y1;y++){
      const shell=x===Gq.x0||x===Gq.x1||z===Gq.z0||z===Gq.z1||y===Gq.y0||y===Gq.y1;P_(x,y,z,shell?B.PG_DECK:B.AIR);}
    for(let i=0;i<5;i++){const z=-103-i,t=22-i;for(const x of [-40,-39]){P_(x,t,z,B.PG_DECK);for(let y=t+1;y<=t+3;y++)P_(x,y,z,B.AIR);}}
    P_(Gq.trunk[0],Gq.trunk[1],Gq.trunk[2],B.PG_PTRUNK);}}
}
function mwStampTunnel(bl,x0,z0,k){const P_=(x,y,z,id)=>mwPut(bl,x0,z0,x,y,z,id);
  if(k==='t1'){if(!mwIn(x0,z0,-61,-60,-124,-119))return;            /* -126 trench upstage wall -> band room 1, 6 steps down */
    for(let i=0;i<6;i++){const z=-124+i,t=22-i;for(const x of [-61,-60]){P_(x,t,z,B.PG_FOAM);for(let y=t+1;y<=t+3;y++)P_(x,y,z,B.AIR);}}}
  else if(k==='t2'){if(!mwIn(x0,z0,58,59,-42,-26))return;            /* band room 2 -> the (60,-45) drain, level */
    for(let z=-42;z<=-26;z++)for(const x of [58,59]){P_(x,16,z,B.PG_FOAM);for(let y=17;y<=19;y++)P_(x,y,z,B.AIR);}}
  else if(k==='t3'){if(!mwIn(x0,z0,-86,-56,109,110))return;          /* band room 3 -> up to the stage-left wing, 29 steps */
    for(let i=0;i<=30;i++){const x=-56-i;for(const z of [109,110]){const g=mpCol(x,z).g,t=Math.min(g,16+i);
      P_(x,t,z,t===g?B.PG_DECK:B.PG_FOAM);for(let y=t+1;y<=Math.max(t+3,g);y++)P_(x,y,z,B.AIR);}}}}

/* ---- stamps: cell structures ---- */
function mwStampCells(bl,x0,z0){const P_=(x,y,z,id)=>mwPut(bl,x0,z0,x,y,z,id);
  const x1=x0+CH-1,z1=z0+CH-1;
  /* kitchen: Burner clusters on 60% of mesa tops; Dough mounds against mesa walls */
  if(z1>=-57&&z0<=40){
    for(let i=Math.floor((x0-40)/40);i<=Math.floor((x1+40)/40);i++)for(let j=Math.floor((z0-40)/40);j<=Math.floor((z1+40)/40);j++){
      const b=mwBurner(i,j);if(b&&mwIn(x0,z0,b.x,b.x+1,b.z,b.z+1))for(const [dx,dz] of [[0,0],[1,0],[0,1],[1,1]])P_(b.x+dx,b.y,b.z+dz,B.PG_BURNER);}
    for(let i=Math.floor((x0-20)/30);i<=Math.floor((x1+20)/30);i++)for(let j=Math.floor((z0-20)/30);j<=Math.floor((z1+20)/30);j++){
      const d=mwDough(i,j);if(!d||!mwIn(x0,z0,d.x-1,d.x+1,d.z-1,d.z+1))continue;
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const c=mpCol(d.x+dx,d.z+dz);if(c.k!==MW_K.KITCHEN||!mwOpenGround(c))continue;
        P_(d.x+dx,c.g+1,d.z+dz,B.PG_DOUGH);if(!dx&&!dz)P_(d.x,c.g+2,d.z,B.PG_DOUGH);}}}
  /* arm holes (Woods, Kitchen) */
  if(z1>=-158&&z0<=40)for(let i=Math.floor(x0/20);i<=Math.floor(x1/20);i++)for(let j=Math.floor(z0/20);j<=Math.floor(z1/20);j++){
    const a=mwArmHole(i,j);if(a&&mwIn(x0,z0,a.x,a.x,a.z,a.z))P_(a.x,a.y,a.z,B.PG_ARMHOLE);}
  /* labs: Tesla Coils; palace: Dressing Mirror monoliths and pig pens */
  if(z1>=43&&z0<=150){
    for(let i=Math.floor(x0/10);i<=Math.floor(x1/10);i++)for(let j=Math.floor(z0/10);j<=Math.floor(z1/10);j++){
      const t=mwTesla(i,j);if(t&&mwIn(x0,z0,t[0],t[0],t[2],t[2]))P_(t[0],t[1],t[2],B.PG_TESLA);}
    for(let i=Math.floor(x0/20);i<=Math.floor(x1/20);i++)for(let j=Math.floor((z0-2)/20);j<=Math.floor(z1/20);j++){
      const m=mwMirror(i,j);if(!m||!mwIn(x0,z0,m.x,m.x,m.z,m.z+1))continue;
      for(const z of [m.z,m.z+1]){const g=mpCol(m.x,z).g;for(let y=g+1;y<=g+m.H;y++)P_(m.x,y,z,B.PG_MIRROR);}}
    for(let i=Math.floor((x0-7)/40);i<=Math.floor(x1/40);i++)for(let j=Math.floor((z0-7)/40);j<=Math.floor(z1/40);j++){
      const p=mwPen(i,j);if(!p||!mwIn(x0,z0,p.x,p.x+6,p.z,p.z+6))continue;
      for(let x=p.x;x<=p.x+6;x++)for(let z=p.z;z<=p.z+6;z++)if(x===p.x||x===p.x+6||z===p.z||z===p.z+6)P_(x,mpCol(x,z).g+1,z,B.PG_BRACE);}}
  /* swamp: lily pads, Pincushion mounds, climb-outs into the Bog Hollow */
  if(z1>=153&&z0<=261){
    for(let i=Math.floor(x0/6);i<=Math.floor(x1/6);i++)for(let j=Math.floor(z0/6);j<=Math.floor(z1/6);j++){
      if(mwH(i,j,0,35)>=0.35)continue;const x=i*6+Math.floor(mwH(i,j,1,34)*6),z=j*6+Math.floor(mwH(i,j,2,34)*6);
      if(!mwIn(x0,z0,x,x,z,z))continue;const c=mpCol(x,z);if(c.k===MW_K.SWAMP&&c.sw===1&&!mwInClearing(x,z,26))P_(x,c.g,z,B.PG_LILY);}
    for(let i=Math.floor((x0-3)/40);i<=Math.floor(x1/40);i++)for(let j=Math.floor((z0-3)/40);j<=Math.floor(z1/40);j++){
      const p=mwPins(i,j);if(!p||!mwIn(x0,z0,p.x-1,p.x+1,p.z-1,p.z+1))continue;
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const g=mpCol(p.x+dx,p.z+dz).g;for(let y=g+1;y<=p.y+2;y++)P_(p.x+dx,y,p.z+dz,B.PG_PINS);}}
    for(let i=Math.floor((x0-14)/8);i<=Math.floor((x1+14)/8);i++)for(let j=Math.floor((z0-14)/8);j<=Math.floor((z1+14)/8);j++){
      const s=mwSwampStair(i,j);if(!s)continue;
      for(const st of s.steps){if(!mwIn(x0,z0,st[0],st[0],st[1],st[1]))continue;const h=st[2],k=st[3];
        for(let y=h-5;y<=h-k;y++)P_(st[0],y,st[1],B.PG_SWAMP);if(k<=4)for(let y=h-k+1;y<=h;y++)P_(st[0],y,st[1],B.AIR);}}}
  /* the wings: flats leaning on the wing walls (painted side in), Cardboard Brace piles, a Prop Trunk every ~40 z */
  if(x0<=-76||x1>=76)for(let j=Math.floor((z0-14)/24);j<=Math.floor((z1+14)/24);j++)for(const sd of [-1,1]){
    const L=mwWingFlat(j,sd);if(L&&mwIn(x0,z0,Math.min(L.xi,L.xo),Math.max(L.xi,L.xo),L.z0,L.z1))
      for(let z=L.z0;z<=L.z1;z++){const g=mpCol(L.xi,z).g;for(let y=g+1;y<=g+L.H;y++){P_(L.xi,y,z,y<=g+Math.ceil(L.H*0.6)?B.PG_PHILL:B.PG_PSKY);P_(L.xo,y,z,B.PG_BACKING);}}
    const pl=mwWingPile(j,sd);if(pl&&mwIn(x0,z0,pl[0],pl[0]+1,pl[2],pl[2]+1)){P_(pl[0],pl[1],pl[2],B.PG_BRACE);P_(pl[0]+1,pl[1],pl[2],B.PG_BRACE);P_(pl[0],pl[1],pl[2]+1,B.PG_BRACE);P_(pl[0],pl[1]+1,pl[2],B.PG_BRACE);}}
  if(x0<=-76||x1>=76)for(const t of mwWingTrunks())if(mwIn(x0,z0,t[0],t[0],t[2],t[2]))P_(t[0],t[1],t[2],B.PG_PTRUNK);
}
function mwInClearing(x,z,r){const A=MPC.ARENA.bigfrog;return Math.hypot(x+0.5-A.cx,z+0.5-A.cz)<=r;}
function mwBurner(i,j){const W=mwW();const M=W.bur||(W.bur=new Map());const k=i*64+j;if(M.has(k))return M.get(k);let r=null;
  const Kt=mwKitchen();
  /* PZ: up to 8 deterministic offsets per mesa (the single try put a cluster on ~1 mesa a world; the bible says 60% of mesa tops) */
  if(mwMesaCell(i,j)&&!(Kt&&Kt.i===i&&Kt.j===j)&&mwH(i,j,6,27)<0.6){const s=mwVorSite(i,j);
    for(let a=0;a<8&&!r;a++){const x=Math.round(s[0])+Math.floor(mwH(i,j,7+a*2,27)*13)-6,z=Math.round(s[1])+Math.floor(mwH(i,j,8+a*2,27)*13)-6;
      let ok=true,y=null;for(const [dx,dz] of [[0,0],[1,0],[0,1],[1,1]]){const c=mpCol(x+dx,z+dz);
        if(c.k!==MW_K.KITCHEN||!c.mesa||c.mi!==i||c.mj!==j||c.e<4){ok=false;break;}if(y===null)y=c.g;else if(y!==c.g){ok=false;break;}}
      if(ok)r={x,z,y};}}
  M.set(k,r);return r;}
function mwDough(i,j){const W=mwW();const M=W.dou||(W.dou=new Map());const k=i*64+j;if(M.has(k))return M.get(k);let r=null;
  /* a 3x3 Dough dome against a mesa wall (80% of 30-cells try: mesas leave few open walls): up to 48 hashed points, the first open-floor point that has a mesa column
     2 blocks away along an axis or a diagonal (the dome's edge then touches the wall) and >= 6 open cells under the dome */
  if(mwH(i,j,0,28)<0.8){const isM=c=>c.k===MW_K.KITCHEN&&c.mesa&&c.mi!=null,isF=c=>c.k===MW_K.KITCHEN&&mwOpenGround(c);
    for(let at=0;at<48&&!r;at++){const x=i*30+2+Math.floor(mwH(i,j,1+at,28)*26),z=j*30+2+Math.floor(mwH(i,j,60+at,28)*26);
      if(z<-50||z>34||!isF(mpCol(x,z)))continue;
      let top=null;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const c=mpCol(x+dx*2,z+dz*2);
        if(isM(c)&&!isM(mpCol(x+dx,z+dz))){top=c.g;break;}}
      if(top===null)continue;let n=0;
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(isF(mpCol(x+dx,z+dz)))n++;
      if(n>=6)r={x,z,top};}}
  M.set(k,r);return r;}
function mwDoughTarget(x,z){x=Math.floor(x);z=Math.floor(z);           /* the mesa top a Dough mound bounces you onto (P2 reads it) */
  for(let i=Math.floor((x-20)/30);i<=Math.floor((x+20)/30);i++)for(let j=Math.floor((z-20)/30);j<=Math.floor((z+20)/30);j++){
    const d=mwDough(i,j);if(d&&Math.abs(x-d.x)<=1&&Math.abs(z-d.z)<=1)return d.top;}
  return null;}
function mwArmHole(i,j){const W=mwW();const M=W.arm||(W.arm=new Map());const k=i*64+j;if(M.has(k))return M.get(k);let r=null;
  if(mwH(i,j,0,14)<0.4){const x=i*20+2+Math.floor(mwH(i,j,1,14)*16),z=j*20+2+Math.floor(mwH(i,j,2,14)*16),c=mpCol(x,z);
    const woods=c.k===MW_K.WOODS,kit=c.k===MW_K.KITCHEN;
    if((woods||kit)&&Math.abs(x)<=72&&mwOpenGround(c)&&!c.nearMesa&&Math.hypot(x+0.5-MPC.MARK[0]-0.5,z+0.5-MPC.MARK[2]-0.5)>=16&&
       !(x>=-4&&x<=6&&z>=-150&&z<=-142)&&!mwFlatNear(x,z,2)&&!mwRostrumAt(x+1,z)&&!mwRostrumAt(x-1,z)&&!mwRostrumAt(x,z+1)&&!mwRostrumAt(x,z-1)&&
       !(kit&&(z<-54||z>36))&&!mwDoughNear(x,z)){
      r={id:'A'+x+','+z,x,y:c.g,z,kind:'what',reach:6,woods};}}
  M.set(k,r);return r;}
function mwDoughNear(x,z){for(let i=Math.floor((x-20)/30);i<=Math.floor((x+20)/30);i++)for(let j=Math.floor((z-20)/30);j<=Math.floor((z+20)/30);j++){
    const d=mwDough(i,j);if(d&&Math.abs(x-d.x)<=2&&Math.abs(z-d.z)<=2)return true;}return false;}
/* every Arm Hole in the world (finite), the 3 nearest the Mark anchor the Comic instead of a Blank */
function mwAllArmHoles(){const W=mwW();if(W.allArm)return W.allArm;const L=[];
  for(let i=-4;i<=3;i++)for(let j=-8;j<=2;j++){const a=mwArmHole(i,j);if(a)L.push(a);}
  const M=MPC.MARK;const w=L.filter(a=>a.woods).sort((a,b)=>Math.hypot(a.x-M[0],a.z-M[2])-Math.hypot(b.x-M[0],b.z-M[2]));
  for(let k=0;k<w.length;k++){w[k].kind=k<3?'comic':'what';w[k].reach=k<3?5:6;}
  W.allArm=L;return L;}
function mwArmHoles(cx,cz){const out=[],x0=cx*CH,z0=cz*CH;
  for(const a of mwAllArmHoles())if(a.x>=x0&&a.x<x0+CH&&a.z>=z0&&a.z<z0+CH)out.push({id:a.id,x:a.x,y:a.y,z:a.z,kind:a.kind,reach:a.reach});
  return out;}
function mwHeap(i,j){const W=mwW();const M=W.heap||(W.heap=new Map());const k=i*64+j;if(M.has(k))return M.get(k);let r=null;
  if(mwH(i,j,0,15)<1/6){const x=i*20+3+Math.floor(mwH(i,j,1,15)*14),z=j*20+3+Math.floor(mwH(i,j,2,15)*14),c=mpCol(x,z);
    if(c.k===MW_K.WOODS&&Math.abs(x)<=70&&mwOpenGround(c)&&Math.hypot(x-MPC.MARK[0],z-MPC.MARK[2])>=18&&!mwFlatNear(x,z,2)&&!mwRostrumAt(x,z)&&
       !(x>=-4&&x<=6&&z>=-150&&z<=-142)){const a=mwArmHole(Math.floor(x/20),Math.floor(z/20));if(!(a&&Math.abs(a.x-x)<3&&Math.abs(a.z-z)<3))r=[x,c.g+1,z];}}
  M.set(k,r);return r;}
function mwTesla(i,j){const W=mwW();const M=W.tes||(W.tes=new Map());const k=i*64+j;if(M.has(k))return M.get(k);let r=null;
  if(mwH(i,j,0,31)<0.4){const x=i*10+1+Math.floor(mwH(i,j,1,31)*8),z=j*10+1+Math.floor(mwH(i,j,2,31)*8),c=mpCol(x,z);
    if(c.k===MW_K.LABS&&!c.bench&&!c.hq&&!c.pad&&z>=46&&z<=147&&Math.abs(x)<=72&&x<mwLabsEdge(z)-2&&
       mwRectGap({x0:x,x1:x,z0:z,z1:z},MW_HQ.x0,MW_HQ.x1,MW_HQ.z0,MW_HQ.z1)>=2&&!mwBenchAt(x+1,z)&&!mwBenchAt(x-1,z)&&!mwBenchAt(x,z+1)&&!mwBenchAt(x,z-1))r=[x,c.g+1,z];}
  M.set(k,r);return r;}
function mwMirror(i,j){const W=mwW();const M=W.mir||(W.mir=new Map());const k=i*64+j;if(M.has(k))return M.get(k);let r=null;
  if(mwH(i,j,0,33)<0.35){const x=i*20+3+Math.floor(mwH(i,j,1,33)*14),z=j*20+3+Math.floor(mwH(i,j,2,33)*13);
    const a=mpCol(x,z),b=mpCol(x,z+1);
    if(a.k===MW_K.PALACE&&b.k===MW_K.PALACE&&a.tb===B.PG_SATIN&&b.tb===B.PG_SATIN&&z>=46&&z<=146&&Math.abs(x)<=72&&!mwPenNear(x,z))r={x,z,H:4+Math.floor(mwH(i,j,3,33)*3)};}
  M.set(k,r);return r;}
function mwPen(i,j){const W=mwW();const M=W.pen||(W.pen=new Map());const k=i*64+j;if(M.has(k))return M.get(k);let r=null;
  if(mwH(i,j,0,34)<0.5){const x=i*40+4+Math.floor(mwH(i,j,1,34)*26),z=j*40+4+Math.floor(mwH(i,j,2,34)*26);let ok=z>=46&&z+6<=146&&x>=-70&&x+6<=72;
    for(let dx=0;dx<=6&&ok;dx+=2)for(let dz=0;dz<=6&&ok;dz+=2){const c=mpCol(x+dx,z+dz);if(c.k!==MW_K.PALACE||c.tb!==B.PG_SATIN)ok=false;}
    if(ok)r={x,z,c:[x+3,mpCol(x+3,z+3).g+1,z+3]};}
  M.set(k,r);return r;}
function mwPenNear(x,z){for(let i=Math.floor((x-10)/40);i<=Math.floor((x+10)/40);i++)for(let j=Math.floor((z-10)/40);j<=Math.floor((z+10)/40);j++){
    const p=mwPen(i,j);if(p&&x>=p.x-2&&x<=p.x+8&&z>=p.z-3&&z<=p.z+8)return true;}return false;}
function mwPins(i,j){const W=mwW();const M=W.pin||(W.pin=new Map());const k=i*64+j;if(M.has(k))return M.get(k);let r=null;
  /* PZ: up to 8 deterministic tries per 40x40 cell, and the island may slope by 2 (the stamp fills each column up from its own top):
     the old single try on a perfectly flat 3x3 found 0 mounds on 6 of 7 seeds, so Steel Pins (Staple Gun, Staples) were unobtainable */
  for(let a=0;a<8&&!r;a++){const x=i*40+3+Math.floor(mwH(i,j,1+a*2,36)*34),z=j*40+3+Math.floor(mwH(i,j,2+a*2,36)*34);
    if(z>=157&&z<=255&&Math.abs(x)<=70&&!mwInClearing(x,z,29)){let ok=true,lo=1e9,hi=-1e9;
      for(let dx=-1;dx<=1&&ok;dx++)for(let dz=-1;dz<=1&&ok;dz++){const c=mpCol(x+dx,z+dz);if(c.k!==MW_K.SWAMP||c.sw!==0||c.pad)ok=false;else{lo=Math.min(lo,c.g);hi=Math.max(hi,c.g);}}
      if(ok&&hi-lo<=2)r={x,z,y:hi};}}
  M.set(k,r);return r;}
function mwSwampStair(i,j){const W=mwW();const M=W.sst||(W.sst=new Map());const k=i*64+j;if(M.has(k))return M.get(k);let r=null;
  /* Bog Hollow climb-outs: up to 3 hashed points per 8-cell; from each, the first island->sheet shore within 8 along an axis gets a
     1-wide Swamp Felt stair 4-5 steps down into the hollow (the sheet above the top 4 steps is cut away) */
  const isl=c=>c.k===MW_K.SWAMP&&c.sw===0&&!c.pad,sh=c=>c.k===MW_K.SWAMP&&c.sw===1;
  for(let at=0;at<3&&!r;at++){const px=i*8+Math.floor(mwH(i,j,1+at*3,38)*8),pz=j*8+Math.floor(mwH(i,j,2+at*3,38)*8);
    if(pz<156||pz>256||Math.abs(px)>72||mwInClearing(px,pz,28))continue;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]],o=Math.floor(mwH(i,j,3+at*3,38)*4);
    for(let q=0;q<4&&!r;q++){const [dx,dz]=dirs[(q+o)&3];
      for(let s=0;s<=8;s++){const a=mpCol(px+dx*s,pz+dz*s),b=mpCol(px+dx*(s+1),pz+dz*(s+1));
        if(isl(a)&&sh(b)){const ax=px+dx*s,az=pz+dz*s,steps=[];
          for(let kk=1;kk<=5;kk++){const x=ax+dx*kk,z=az+dz*kk,c=mpCol(x,z);if(!sh(c)||mwInClearing(x,z,27))break;steps.push([x,z,c.g,kk]);}
          if(steps.length>=4)r={x:ax,z:az,steps};break;}}}}
  M.set(k,r);return r;}
function mwWingFlat(j,sd){const W=mwW();const M=W.wfl||(W.wfl=new Map());const k=j*4+sd+2;if(M.has(k))return M.get(k);let r=null;
  if(mwH(j,sd,0,40)<0.6){const z0=j*24+2+Math.floor(mwH(j,sd,1,40)*8),len=8+Math.floor(mwH(j,sd,2,40)*7),z1=z0+len-1;
    if(z0>=-156&&z1<=259&&mwArchAt(z0)<0&&mwArchAt(z1)<0&&!MW_ARCH.some(a=>a[0]>=z0&&a[1]<=z1))
      r={xi:sd*94,xo:sd*95,z0,z1,H:6+Math.floor(mwH(j,sd,3,40)*5)};}
  M.set(k,r);return r;}
function mwWingPile(j,sd){if(mwH(j,sd,4,40)>=0.5)return null;const x=sd>0?80+Math.floor(mwH(j,sd,5,40)*8):-88+Math.floor(mwH(j,sd,5,40)*8),z=j*24+14+Math.floor(mwH(j,sd,6,40)*6);
  if(z<-156||z>258||mwArchAt(z)>=0||mwArchAt(z+1)>=0)return null;const c=mpCol(x,z);if(c.k!==MW_K.WINGS)return null;
  if(mwWingTrunks().some(t=>Math.abs(t[0]-x)<=2&&Math.abs(t[2]-z)<=2))return null;return [x,c.g+1,z];}
function mwWingTrunks(){const W=mwW();if(W.wtr)return W.wtr;const L=[];
  for(let k=0;k<=10;k++)for(const sd of [-1,1]){const z=-150+40*k+Math.floor(mwH(k,sd,7,40)*12);if(z>258||mwArchAt(z)>=0)continue;
    const x=sd*88,c=mpCol(x,z);if(c.k===MW_K.WINGS)L.push([x,c.g+1,z]);}
  W.wtr=L;return L;}

/* ---- puppet trees: rows on every Woods trench lip, one every 7-11 x by hash (bible 3.6) ---- */
function mwTreeRows(){const W=mwW();if(W.trees)return W.trees;const rows=[];
  for(let t=0;t<4;t++)for(let sd=0;sd<2;sd++){const z0=MPC.TRENCH_Z[t],zr=sd?z0+3:z0-2,L=[];
    let x=-74+Math.floor(mwH(t,sd,0,7)*4);
    while(x<=72){const ok=!mwIsBridge(x)&&Math.abs(x)>5&&Math.abs(x)<=72;   /* the centre aisle stays clear: the Mark sees the staircase beacon */
      if(ok){const g=mwWoodsG(x,zr),s=6+Math.floor(mwH(x,zr,0,8)*4);
        L.push({id:'T'+x+','+zr,x,z:zr,g,s,y0:g-1,h:s+6,top:g+s+4});}
      x+=7+Math.floor(mwH(x,zr,1,7)*5);}
    rows.push({z:zr,L});}
  W.trees=rows;return rows;}
function mwTreeCells(T){const o=[],g=T.g,s=T.s,hy=g+s+1;          /* [x,y,z,id] for every block of a standing tree */
  o.push([T.x,g-1,T.z,B.PG_FOREARM],[T.x,g,T.z,B.PG_FOREARM]);
  for(let y=g+1;y<=g+s;y++)o.push([T.x,y,T.z,B.PG_SLEEVE]);
  for(let dy=0;dy<4;dy++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
    if((dy===0||dy===3)&&Math.abs(dx)===2&&Math.abs(dz)===2)continue;
    const eye=dz===-2&&(dx===-1||dx===1)&&dy===2;o.push([T.x+dx,hy+dy,T.z+dz,eye?B.PG_EYE:B.PG_FLEECE]);}
  return o;}
function mwTreeSites(cx,cz){const out=[],x0=cx*CH,z0=cz*CH;
  for(const R of mwTreeRows()){if(R.z<z0||R.z>=z0+CH)continue;for(const T of R.L)if(T.x>=x0&&T.x<x0+CH)
    out.push({id:T.id,x:T.x,z:T.z,y0:T.y0,h:T.h,eyes:[[T.x-1,T.g+T.s+3,T.z-2],[T.x+1,T.g+T.s+3,T.z-2]],felled:MP.trees[T.id]!=null});}
  return out;}
function mwTreeAt(x,y,z){for(const R of mwTreeRows()){if(Math.abs(z-R.z)>2)continue;
    for(const T of R.L){if(Math.abs(x-T.x)>2||y<T.y0||y>T.top)continue;if(x===T.x&&z===T.z)return T;
      if(y>=T.g+T.s+1)return T;}}
  return null;}
function mwStampTrees(bl,x0,z0){for(const R of mwTreeRows()){if(R.z+2<z0||R.z-2>=z0+CH)continue;
    for(const T of R.L){if(T.x+2<x0||T.x-2>=x0+CH||MP.trees[T.id]!=null)continue;
      for(const c of mwTreeCells(T))mwPut(bl,x0,z0,c[0],c[1],c[2],c[3]);}}}

/* ---- painted flats (bible 3.6): Woods flats sit in the bands between trenches (>= 6 from a trench, >= 12 from the Mark), one
   candidate per 48-wide cell and band (45%); Kitchen flats on a 48 x 40 jittered grid where the floor is open. Front layer (-z) Painted
   Hill (lower 60%) / Painted Sky, back layer Flat Backing, a diagonal Cardboard Brace line every 4 columns down to the deck behind.
   Woods flats use only pure functions (mwWoodsG), so the rostra can yield to them without recursion. ---- */
function mwFlatMake(id,x0,w,fz,ht,L,gAt){const f={id,x0,x1:x0+w-1,z0:fz,z1:fz+2+L,fz,w,ht,L};
  const gc=gAt((f.x0+f.x1)>>1,fz);f.gc=gc;f.top=gc+ht;f.mid=Math.floor(ht/2);f.split=gc+Math.ceil(ht*0.6);
  f.br=[];for(let bx=f.x0;bx<=f.x1;bx+=4)for(let q=0;q<=L;q++){const y=gc+f.mid-Math.round(q*(f.mid-1)/L),z=fz+2+q;if(y>gAt(bx,z))f.br.push([bx,y,z]);}
  return f;}
function mwFlatW(i,k){const W=mwW();const M=W.flw||(W.flw=new Map());const key=i*8+k;if(M.has(key))return M.get(key);let r=null;
  if(mwH(i,k,0,9)<0.45){const z0=MPC.TRENCH_Z[k],lo=z0+8,hi=k<3?z0+17:-64;
    const w=12+Math.floor(mwH(i,k,1,9)*9),ht=10+Math.floor(mwH(i,k,2,9)*7);let L=4+Math.floor(mwH(i,k,3,9)*3);
    while(L>4&&3+L>hi-lo+1)L--;
    if(3+L<=hi-lo+1){const x0=i*48+Math.floor(mwH(i,k,4,9)*(48-w)),fz=lo+Math.floor(mwH(i,k,5,9)*(hi-lo+1-(3+L)+1));
      const f={x0,x1:x0+w-1,z0:fz,z1:fz+2+L};
      if(f.x0>=-70&&f.x1<=70&&!(f.x0<=8&&f.x1>=-8)&&mwRectGap(f,-4,4,-140,-132)>=12&&mwRectGap(f,-2,4,-148,-144)>=6)r=mwFlatMake('FW'+i+','+k,x0,w,fz,ht,L,mwWoodsG);}}
  M.set(key,r);return r;}
function mwFlatK(i,j){const W=mwW();const M=W.flk||(W.flk=new Map());const key=i*8+j+4;if(M.has(key))return M.get(key);let r=null;
  if(mwH(i,j,0,10)<0.45){const w=12+Math.floor(mwH(i,j,1,10)*9),ht=10+Math.floor(mwH(i,j,2,10)*7),L=4+Math.floor(mwH(i,j,3,10)*3);
    const x0=i*48+Math.floor(mwH(i,j,4,10)*(48-w)),fz=j*40+Math.floor(mwH(i,j,5,10)*(40-3-L));
    const f={x0,x1:x0+w-1,z0:fz,z1:fz+2+L};let ok=f.x0>=-70&&f.x1<=70&&f.z0>=-52&&f.z1<=34;
    for(let x=f.x0-1;x<=f.x1+1&&ok;x+=2)for(let z=f.z0-1;z<=f.z1+1&&ok;z++){const c=mpCol(x,z);if(c.k!==MW_K.KITCHEN||c.mesa||c.drain||c.dwall||c.fj||c.pad)ok=false;}
    const Kt=mwKitchen();if(ok&&Kt&&mwRectGap(f,Kt.notch.x-2,Kt.notch.x+2,Kt.notch.z0-3,Kt.notch.z1)<2)ok=false;
    if(ok)r=mwFlatMake('FK'+i+','+j,x0,w,fz,ht,L,(x,z)=>mpCol(x,z).g);}
  M.set(key,r);return r;}
function mwFlatWNear(x0,x1,z0,z1,m){for(let i=Math.floor((x0-60)/48);i<=Math.floor((x1+60)/48);i++)for(let k=0;k<4;k++){
    const f=mwFlatW(i,k);if(f&&!(f.x1<x0-m||f.x0>x1+m||f.z1<z0-m||f.z0>z1+m))return f;}return null;}
function mwFlatNear(x,z,m){if(z<=-60){return mwFlatWNear(x,x,z,z,m);}
  if(z>-57&&z<=40)for(let i=Math.floor((x-30)/48);i<=Math.floor((x+30)/48);i++)for(let j=Math.floor((z-30)/40);j<=Math.floor((z+30)/40);j++){
    const f=mwFlatK(i,j);if(f&&x>=f.x0-m&&x<=f.x1+m&&z>=f.z0-m&&z<=f.z1+m)return f;}
  return null;}
function mwFlatCells(f){const o=[];for(let x=f.x0;x<=f.x1;x++){const g0=mpCol(x,f.fz).g,g1=mpCol(x,f.fz+1).g;
    for(let y=g0+1;y<=f.top;y++)o.push([x,y,f.fz,y<=f.split?B.PG_PHILL:B.PG_PSKY]);
    for(let y=g1+1;y<=f.top;y++)o.push([x,y,f.fz+1,B.PG_BACKING]);}
  for(const b of f.br)o.push([b[0],b[1],b[2],B.PG_BRACE]);return o;}
function mwFlatAt(x,y,z){const f=mwFlatNear(x,z,0);if(!f)return null;if(y<f.gc-2||y>f.top)return null;
  if(z===f.fz||z===f.fz+1)return f;for(const b of f.br)if(b[0]===x&&b[1]===y&&b[2]===z)return f;return null;}
function mwAllFlats(){const W=mwW();if(W.allFlat)return W.allFlat;const L=[];
  for(let i=-2;i<=1;i++){for(let k=0;k<4;k++){const f=mwFlatW(i,k);if(f)L.push(f);}for(let j=-2;j<=0;j++){const f=mwFlatK(i,j);if(f)L.push(f);}}
  W.allFlat=L;return L;}
function mwStampFlats(bl,x0,z0){if(z0>40||z0+CH<-158)return;
  for(const f of mwAllFlats()){if(MP.flats[f.id]||!mwIn(x0,z0,f.x0,f.x1,f.z0,f.z1))continue;
    for(const c of mwFlatCells(f))mwPut(bl,x0,z0,c[0],c[1],c[2],c[3]);}}

/* ---- spots (plan 6.1): block kinds give block coordinates, posts give standing (feet) positions ---- */
function mwSpots(kind){const W=mwW();const fixed=W.spots||(W.spots={});
  switch(kind){
    case 'boothCan':return mwBooths().map(b=>b.can.slice());
    case 'boothLamp':return mwBooths().map(b=>b.lamp.slice());
    case 'boothSpawn':return mwBooths().map(b=>b.spawn.slice());
    case 'chef':{const K=mwKitchen();return K?[[K.hut.x0+4,K.T+1,K.hut.z0+2]]:[];}
    case 'counter':{const K=mwKitchen();if(!K)return [];const o=[];for(let x=K.hut.x0+1;x<=K.hut.x0+7;x++)o.push([x,K.T+1,K.hut.z0]);return o;}
    case 'stockpot':{const K=mwKitchen();if(!K)return [];const p=K.pot,o=[[p.x0+1,K.T+1,p.z0+1]];
      for(let x=p.x0+1;x<=p.x0+3;x++)for(let z=p.z0+1;z<=p.z0+3;z++)if(!(x===p.x0+1&&z===p.z0+1))o.push([x,K.T,z]);return o;}
    case 'coop':{const K=mwKitchen();if(!K)return [];const c=K.coop,o=[];for(let x=c.x0+1;x<=c.x0+3;x++)for(let z=c.z0+1;z<=c.z0+3;z++)o.push([x,K.T+1,z]);return o;}
    case 'mesaTop':{if(fixed.mesaTop)return fixed.mesaTop;const K=mwKitchen();const o=[];if(K){const s=mwVorSite(K.i,K.j);
        for(let x=Math.round(s[0])-34;x<=Math.round(s[0])+34;x++)for(let z=Math.round(s[1])-34;z<=Math.round(s[1])+34;z++){
          const c=mpCol(x,z);if(c.k===MW_K.KITCHEN&&c.mesa&&c.mi===K.i&&c.mj===K.j&&c.g===K.T)o.push([x,K.T+1,z]);}}
      return fixed.mesaTop=o;}
    case 'labsBench':return [MW_HQ.bench.slice()];
    case 'trans':return [MW_HQ.trans.slice()];
    case 'prof':return [MW_HQ.prof.slice()];
    case 'bkr':return [MW_HQ.bkr.slice(),mwBooths()[2].bkr.slice()];
    case 'band':{const o=[];for(const R of MW_BAND)o.push(R.stake.slice(),R.kit.slice(),R.mouth.slice());return o;}
    case 'guestTrunk':return [MW_GUEST.trunk.slice()];
    case 'guestHook':return [MW_GUEST.hook.slice()];
    case 'wingTrunk':return mwWingTrunks().filter(t=>chunkAt(t[0],t[2])&&getBlock(t[0],t[1],t[2])===B.PG_PTRUNK).map(t=>t.slice());
    case 'drainMouth':return MPC.DRAINS.map(d=>[d[0],deckY(d[1]-3)+1,d[1]-3]);
    case 'trenchMouth':{if(fixed.trench)return fixed.trench;const o=[];
      for(const z0 of MPC.TRENCH_Z)for(const cl of MW_CLIMB){const zl=cl.u?z0+2:z0-1;   /* the top of each climb-out, in its own wall column */
        for(let i=0;i<16;i++){const x=cl.xs+i*cl.d,c=mpCol(x,zl);if(23+i>=c.g){o.push([x,c.g+1,zl]);break;}}}
      return fixed.trench=o;}
    case 'hollowHeap':{const o=[];if(typeof chunks==='undefined')return o;
      for(let i=-4;i<=3;i++)for(let j=-8;j<=-3;j++){const h=mwHeap(i,j);if(h&&chunkAt(h[0],h[2]))o.push(h.slice());}return o;}
    case 'pen':{if(fixed.pen)return fixed.pen;const o=[];for(let i=-2;i<=1;i++)for(let j=1;j<=3;j++){const p=mwPen(i,j);if(p)o.push(p.c.slice());}return fixed.pen=o;}
    case 'tesla':{const o=[];for(let i=-8;i<=1;i++)for(let j=4;j<=14;j++){const t=mwTesla(i,j);if(t&&chunkAt(t[0],t[2])&&getBlock(t[0],t[1],t[2])===B.PG_TESLA)o.push(t.slice());}return o;}
    case 'burner':{const o=[];for(let i=-3;i<=2;i++)for(let j=-2;j<=1;j++){const b=mwBurner(i,j);if(!b||!chunkAt(b.x,b.z))continue;
        for(const [dx,dz] of [[0,0],[1,0],[0,1],[1,1]])if(getBlock(b.x+dx,b.y,b.z+dz)===B.PG_BURNER)o.push([b.x+dx,b.y,b.z+dz]);}
      const K=mwKitchen();if(K&&chunkAt(K.hut.x0+5,K.hut.z0+4))for(const [dx,dz] of [[5,4],[6,4],[5,5],[6,5]])if(getBlock(K.hut.x0+dx,K.T,K.hut.z0+dz)===B.PG_BURNER)o.push([K.hut.x0+dx,K.T,K.hut.z0+dz]);
      return o;}
    case 'palaceSpot':return typeof mwPalaceSpots==='function'?mwPalaceSpots():[];
    case 'ghost':{const G=MPC.GHOST,g=mpCol(G[0],G[1]).g;return [[G[0],g+3,G[1]]];}
    case 'umark':return ['bomber','bigpig','bigfrog'].map(n=>mpUmarkPos(n));
  }
  return [];}
/* protected volumes P1 adds (P0's mpProtected also covers arenas, the Mark pad, Understudy Marks and booths) */
function mwProtect(x,y,z){const h=mwKitchenHut();if(h&&x>=h.x0&&x<=h.x1&&z>=h.z0&&z<=h.z1+1&&y>=h.y0-1&&y<=h.y1)return true;
  const Q=MW_HQ;if(x>=Q.x0&&x<=Q.x1&&z>=Q.z0&&z<=Q.z1&&y>=Q.F&&y<=Q.F+6)return true;
  const G=MPC.GHOST;if(x===G[0]&&z===G[1])return true;
  return false;}
PREG.protect.push(mwProtect);
