/* ---- PART 55: p4_arena.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p4_arena.js (P4): the three headliner arenas. Geometry tables (built once, lazily, pure functions of the layout),
   mpStampArenas (called by P1's generator, or the P1 stub, for every purgatory chunk), mpArenaReset (deletes the arena's
   chunkEdits and regenerates those cells), the Understudy Marks and their Bins, and the Headliner Trunks.
   Bible sections 10.0-10.3, plan section 5.4. Coordinates: x across the stage, z upstage (+) / downstage (-).
   No Math.random, clock or THREE constructor here: this file only writes block ids into chunk arrays.
   --------------------------------------------------------------------------------------------------------------------- */

var HN_A=null;
/* the whole layout as data: every other P4 file reads it from here */
function hnA(){if(HN_A)return HN_A;const A={};
  /* ===== THE DEMOLITIONIST: THE APRON (floor x -40..39, z -190..-161, top block y 34, you stand at 35) ===== */
  A.hy=34;A.hbox={x0:-40,x1:39,z0:-190,z1:-161};
  A.groups={R1:[20,23,-170,-167],R2:[6,9,-170,-167],R3:[20,23,-178,-175],B1:[20,23,-186,-183],B2:[6,9,-186,-183],B3:[6,9,-178,-175],
    Y1:[-24,-21,-186,-183],Y2:[-10,-7,-186,-183],Y3:[-10,-7,-178,-175],W1:[-24,-21,-170,-167],W2:[-10,-7,-170,-167],W3:[-24,-21,-178,-175]};
  const seg=(out,a,b)=>{const dx=Math.sign(b[0]-a[0]),dz=Math.sign(b[1]-a[1]);let x=a[0],z=a[1];
    for(let g=0;g<200;g++){out.push([x,35,z]);if(x===b[0]&&z===b[1])break;x+=dx;z+=dz;}return out;};
  /* stations: riser 3x3 one high centred on c, the seat (a Charge Plate) in its top centre; the frayed lead runs from the
     riser top beside the seat (y 36) down one step to the floor (y 35) and stops ONE block short of the network's root */
  const ST=[['red',[28,-164],1,'#d02a2a',['R1','R2','R3'],[16,-166]],['blue',[28,-188],1,'#2f5fd0',['B1','B2','B3'],[16,-182]],
    ['yellow',[-29,-188],-1,'#e6c21c',['Y1','Y2','Y3'],[-16,-182]],['white',[-29,-164],-1,'#ececec',['W1','W2','W3'],[-16,-166]]];
  A.st=ST.map(([k,c,sx,col,g,hatch],i)=>({k,i,c,sx,col,groups:g,hatch,seat:[c[0],35,c[1]],
    lead:[[c[0]-sx,36,c[1]],[c[0]-2*sx,35,c[1]]],gap:[c[0]-3*sx,35,c[1]],root:[c[0]-4*sx,35,c[1]],cells:[]}));
  const S=k=>A.st.find(s=>s.k===k);
  /* the four Det Cord networks (each feeds exactly its own three plate groups; checked in p4_boss) */
  {const r=S('red').cells;r.push([24,35,-164]);seg(r,[24,-165],[24,-175]);seg(r,[23,-171],[9,-171]);}
  {const b=S('blue').cells;b.push([24,35,-188]);seg(b,[24,-187],[24,-187]);seg(b,[23,-187],[10,-187]);seg(b,[10,-186],[10,-178]);}
  {const y=S('yellow').cells;y.push([-25,35,-188]);seg(y,[-25,-187],[-25,-187]);seg(y,[-24,-187],[-11,-187]);seg(y,[-11,-186],[-11,-178]);}
  {const w=S('white').cells;w.push([-25,35,-164]);seg(w,[-25,-165],[-25,-175]);seg(w,[-24,-171],[-10,-171]);}
  A.order=['red','blue','yellow','white'];
  A.dnp={c:[0,-176],plinth:[0,35,-176],mat:[-1,1,-174,-172],cord:[0,35,-175],hatch:[0,-178]};
  /* the fuse line (dormant until P3): YELLOW corner along the downstage edge, up the stage-right edge, along z -161 to x 0,
     then one cell onto the Big One hatch. The risers sit on z -189..-187, so the downstage run uses the last row, z -190. */
  A.fuse=[];seg(A.fuse,[-28,-190],[31,-190]);seg(A.fuse,[31,-189],[31,-161]);seg(A.fuse,[30,-161],[0,-161]);A.fuse.push([0,35,-162]);
  A.bigone=[0,-163];A.lever=[-32,35,-161];
  A.hatches=[[16,-182],[-16,-182],[16,-166],[-16,-166],[0,-188],[0,-178],[0,-163]];
  A.htrunk=[0,35,-170];
  /* ===== THE PIG: THE GRAND STAIRCASE (x -9..9, z 70..121, the Star Platform r 9 at (0,131), y 63) ===== */
  A.pbox={x0:-12,x1:12,z0:62,z1:146};A.rope=68;A.stairZ0=70;A.platY=63;A.plat=[0,131];A.platR=9;
  A.lanes=[[-8,-4],[-2,2],[4,8]];A.laneX=[-6,0,6];
  A.towers=[[-9,131],[9,131],[0,140]];A.gantry=[[-10,136],[10,136]];A.beamY=74;A.cleat=[9.4,64,136];A.vanity=[0,64,139];
  A.lampHang=[0,69.5,131];
  A.landings=[[80,83,48],[94,97,53],[108,111,58]];
  A.ptrunk=[0,44,66];
  /* ===== THE FROG: THE BACK SWAMP CLEARING (r 24 at (0,215), sheet y 49 over the 4-deep Bog Hollow) ===== */
  A.kc=[0,215];A.kr=24;A.ky=49;A.kfloor=44;A.armRoot=[0,44,219];A.logY=50;A.kseat=[0,51,215];
  A.room=MPC.FROG_ROOM;
  A.spokes=[];for(let k=0;k<12;k++){const a=(k*30+15)*Math.PI/180,cells=[];
    /* a 4-connected stair, one block up per cell (step tops 45..48), each step the side-neighbour that heads most outward:
       rounding a diagonal line gives corner-only or doubled cells, which nobody can climb */
    const ux=Math.sin(a),uz=Math.cos(a);let x=Math.round(ux*20),z=Math.round(215+uz*20);cells.push([x,A.ky-4,z]);
    for(let h=A.ky-3;h<=A.ky-1;h++){let bx=0,bz=0,bs=-1e9;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const sc=dx*ux+dz*uz;if(sc>bs){bs=sc;bx=dx;bz=dz;}}
      const r0=Math.hypot(x+bx,z+bz-215),alt=Math.abs(ux)>Math.abs(uz)?[0,Math.sign(uz)||1]:[Math.sign(ux)||1,0];
      /* alternate axes on a diagonal so the stair follows the spoke's angle instead of running off along one axis */
      const off=(x+bx)*uz-(z+bz-215)*ux;if(Math.abs(off)>0.8&&(alt[0]*ux+alt[1]*uz)>0.2){bx=alt[0];bz=alt[1];}
      x+=bx;z+=bz;cells.push([x,h,z]);}
    A.spokes.push(cells);}
  const spokeSet=new Set();for(const c of A.spokes)for(const p of c)spokeSet.add(p[0]+','+p[2]);
  A.pads=[];for(const [r,n] of [[8,8],[14,12],[20,16]])for(let i=0;i<n;i++){const a=(i+0.5)*2*Math.PI/n;
    const px=Math.sin(a)*r,pz=215+Math.cos(a)*r,x0=Math.floor(px-0.5),z0=Math.floor(pz-0.5);
    const cells=[[x0,z0],[x0+1,z0],[x0,z0+1],[x0+1,z0+1]];
    if(cells.some(c=>spokeSet.has(c[0]+','+c[1])))continue;
    A.pads.push({ring:r,i,x:x0+1,z:z0+1,cells});}
  A.padSet=new Map();for(const p of A.pads)for(const c of p.cells)A.padSet.set(c[0]+','+c[1],p);
  A.spokeSet=spokeSet;
  A.kbox={x0:-27,x1:27,z0:188,z1:242};
  return (HN_A=A);}

/* ---- small layout queries used by the brains ---- */
function hnTreadTop(x,z){const A=hnA();                                       /* top block y of the staircase at (x,z), or -1 */
  const dx=x-A.plat[0],dz=z-A.plat[1];if(dx*dx+dz*dz<=A.platR*A.platR)return A.platY;
  if(x>=-9&&x<=9&&z>=122&&z<=A.plat[1])return A.platY;                       /* the platform's straight front apron */
  if(x<-9||x>9||z<A.stairZ0||z>121)return -1;
  const k=Math.floor((z-A.stairZ0)/14),r=(z-A.stairZ0)-k*14;
  if(r>=10)return k<3?48+5*k:63;
  return 44+5*k+Math.floor(r/2);}
function hnIsLanding(z){const A=hnA();for(const L of A.landings)if(z>=L[0]&&z<=L[1])return L;return null;}
function hnGroupOf(x,z){const G=hnA().groups;for(const k in G){const g=G[k];if(x>=g[0]&&x<=g[1]&&z>=g[2]&&z<=g[3])return k;}return null;}
function hnStationOfGroup(gk){return hnA().st.find(s=>s.groups.indexOf(gk)>=0)||null;}
function hnInClear(x,z,r){const A=hnA();return Math.hypot(x+0.5-A.kc[0],z+0.5-A.kc[1])<=(r==null?A.kr:r);}
function hnFloorY(name){const A=hnA();return name==='bomber'?A.hy:name==='bigfrog'?A.ky:deckY(70);}

/* ---- the stamp (called once per generated purgatory chunk; writes only inside the arena volumes) ---- */
function hnPut(bl,x0,z0,x,y,z,id){const lx=x-x0,lz=z-z0;if(lx<0||lx>=CH||lz<0||lz>=CH||y<1||y>=WH)return;bl[bidx(lx,y,lz)]=id;}
function hnHits(x0,z0,b){return b.x1>=x0&&b.x0<x0+CH&&b.z1>=z0&&b.z0<z0+CH;}
function mpStampArenas(blocks,x0,z0){
  const A=hnA();
  if(hnHits(x0,z0,{x0:-41,x1:40,z0:-191,z1:-144}))hnStampBomber(blocks,x0,z0,A);
  if(hnHits(x0,z0,A.pbox))hnStampBigPig(blocks,x0,z0,A);
  if(hnHits(x0,z0,{x0:-27,x1:27,z0:186,z1:242}))hnStampBigFrog(blocks,x0,z0,A);}
function hnStampBomber(bl,x0,z0,A){const put=(x,y,z,id)=>hnPut(bl,x0,z0,x,y,z,id),H=A.hbox;
  const xa=Math.max(H.x0,x0),xb=Math.min(H.x1,x0+CH-1),za=Math.max(H.z0,z0),zb=Math.min(H.z1,z0+CH-1);
  for(let x=xa;x<=xb;x++)for(let z=za;z<=zb;z++){for(let y=30;y<=A.hy;y++)put(x,y,z,B.PG_DECK);for(let y=A.hy+1;y<=62;y++)put(x,y,z,B.AIR);}
  if(xa<=xb&&za<=zb){
    for(const k in A.groups){const g=A.groups[k];for(let x=g[0];x<=g[1];x++)for(let z=g[2];z<=g[3];z++)put(x,A.hy,z,B.PG_PLATE);}
    for(const s of A.st){for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)put(s.c[0]+dx,35,s.c[1]+dz,B.PG_DECK);
      put(s.seat[0],35,s.seat[2],B.PG_PLATE);
      for(const c of s.lead)put(c[0],c[1],c[2],B.PG_CORD);
      for(const c of s.cells)put(c[0],c[1],c[2],B.PG_CORD);}
    const D=A.dnp;put(D.plinth[0],D.plinth[1],D.plinth[2],B.PG_MBLACK);put(D.cord[0],D.cord[1],D.cord[2],B.PG_CORD);
    for(let x=D.mat[0];x<=D.mat[1];x++)for(let z=D.mat[2];z<=D.mat[3];z++)put(x,A.hy,z,B.PG_PLATE);
    for(const c of A.fuse)put(c[0],c[1],c[2],B.PG_CORD);
    put(A.lever[0],A.lever[1],A.lever[2],B.PG_MBLACK);
    if(MP.dead.bomber)put(A.htrunk[0],A.htrunk[1],A.htrunk[2],B.PG_STRUNK);}
  hnStampMark(bl,x0,z0,'bomber');}
function hnStampBigPig(bl,x0,z0,A){const put=(x,y,z,id)=>hnPut(bl,x0,z0,x,y,z,id),Bx=A.pbox;
  const xa=Math.max(Bx.x0,x0),xb=Math.min(Bx.x1,x0+CH-1),za=Math.max(Bx.z0,z0),zb=Math.min(Bx.z1,z0+CH-1);
  for(let x=xa;x<=xb;x++)for(let z=za;z<=zb;z++){const g=deckY(z);
    for(let y=g-2;y<=g;y++)put(x,y,z,B.PG_DECK);for(let y=g+1;y<=75;y++)put(x,y,z,B.AIR);
    const dp=Math.hypot(x-A.plat[0],z-A.plat[1]),top=hnTreadTop(x,z);
    if(top>0){const isPlat=dp<=A.platR||z>=122;
      for(let y=g+1;y<top;y++)put(x,y,z,B.PG_MBLACK);put(x,top,z,B.PG_DECK);
      if(!isPlat){
        if(x===-9||x===9)put(x,top+1,z,B.PG_VELVET);
        if((x===-3||x===3)&&!hnIsLanding(z)){put(x,top+1,z,B.PG_MBLACK);put(x,top+2,z,B.PG_MBLACK);if(z%2===0)put(x,top+3,z,B.PG_LAMP);}}}
    else{const nearStair=(z>=70&&z<=121&&(Math.abs(x)===10||Math.abs(x)===11));
      const nearPlat=dp>A.platR&&dp<=A.platR+2.6&&z>=118;
      if((nearStair||nearPlat)&&!(Math.abs(x)===10&&z===136)){put(x,g,z,B.PG_STUFFING);put(x,g-1,z,B.PG_STUFFING);}}}
  if(xa<=xb&&za<=zb){
    for(const t of A.towers)for(let y=A.platY+1;y<=A.platY+4;y++)put(t[0],y,t[1],B.PG_MBLACK);
    for(const p of A.gantry){for(let y=deckY(p[1])+1;y<A.beamY;y++)put(p[0],y,p[1],B.PG_MBLACK);}
    for(let x=-10;x<=10;x++)put(x,A.beamY,A.gantry[0][1],B.PG_MBLACK);
    if(MP.dead.bigpig)put(A.ptrunk[0],A.ptrunk[1],A.ptrunk[2],B.PG_STRUNK);}
  hnStampMark(bl,x0,z0,'bigpig');}
function hnStampBigFrog(bl,x0,z0,A){const put=(x,y,z,id)=>hnPut(bl,x0,z0,x,y,z,id),cx=A.kc[0],cz=A.kc[1];
  for(let x=Math.max(-27,x0);x<=Math.min(27,x0+CH-1);x++)for(let z=Math.max(188,z0);z<=Math.min(242,z0+CH-1);z++){
    const d=Math.hypot(x+0.5-cx,z+0.5-cz);
    if(d<=26.2){for(let y=A.ky+1;y<=62;y++)put(x,y,z,B.AIR);}
    if(d<=A.kr){for(let y=A.kfloor-3;y<=A.kfloor;y++)put(x,y,z,B.PG_SWAMP);for(let y=A.kfloor+1;y<A.ky;y++)put(x,y,z,B.AIR);
      const key=x+','+z;
      put(x,A.ky,z,A.padSet.has(key)?B.PG_LILY:B.PG_SHEET);
      if(d<=3.2)for(let y=A.kfloor;y<=A.ky;y++)put(x,y,z,B.PG_SWAMP);}
    else if(d<=26.2){for(let y=A.kfloor-3;y<=A.ky;y++)put(x,y,z,B.PG_SWAMP);}}
  for(const sp of A.spokes)for(const c of sp){put(c[0],A.ky,c[2],B.AIR);for(let y=A.kfloor;y<=c[1];y++)put(c[0],y,c[2],B.PG_SWAMP);}
  for(let x=-3;x<=3;x++)put(x,A.logY,215,B.PG_SLEEVE);
  put(A.armRoot[0],A.armRoot[1],A.armRoot[2],B.PG_MBLACK);
  /* Inside the Frog: a Masking Black shell, Swamp Felt lining, air x -3..3, y 8..12, z 212..218 (carved after the caves) */
  const R=A.room;
  if(hnHits(x0,z0,{x0:R.x0-2,x1:R.x1+2,z0:R.z0-2,z1:R.z1+2}))
    for(let x=R.x0-2;x<=R.x1+2;x++)for(let z=R.z0-2;z<=R.z1+2;z++)for(let y=R.y0-2;y<=R.y1+2;y++){
      const ex=x<R.x0||x>R.x1,ey=y<R.y0||y>R.y1,ez=z<R.z0||z>R.z1;
      if(!ex&&!ey&&!ez){put(x,y,z,B.AIR);continue;}
      const outer=x<R.x0-1||x>R.x1+1||y<R.y0-1||y>R.y1+1||z<R.z0-1||z>R.z1+1;
      put(x,y,z,outer?B.PG_MBLACK:B.PG_SWAMP);}
  hnStampMark(bl,x0,z0,'bigfrog');}
/* the Understudy Mark: a level 3x3 Stage Deck pad and its own Bin at UMARK+[3,0,1] (Lost Property, plan 6.1) */
function hnStampMark(bl,x0,z0,name){const u=mpUmarkPos(name);if(!u)return;
  if(!hnHits(x0,z0,{x0:u[0]-2,x1:u[0]+4,z0:u[2]-2,z1:u[2]+2}))return;
  const top=name==='bomber'?34:(name==='bigfrog'?deckY(u[2]):deckY(u[2]));
  for(let dx=-1;dx<=3;dx++)for(let dz=-1;dz<=1;dz++){
    for(let y=top-2;y<=top;y++)hnPut(bl,x0,z0,u[0]+dx,y,u[2]+dz,B.PG_DECK);
    for(let y=top+1;y<=top+3;y++)hnPut(bl,x0,z0,u[0]+dx,y,u[2]+dz,B.AIR);}
  hnPut(bl,x0,z0,u[0]+3,top+1,u[2]+1,B.PG_CAN);}
function hnMarkCan(name){const u=mpUmarkPos(name);if(!u)return null;const top=name==='bomber'?34:deckY(u[2]);return [u[0]+3,top+1,u[2]+1];}
function hnMarkStand(name){const u=mpUmarkPos(name);if(!u)return null;const top=name==='bomber'?34:deckY(u[2]);return [u[0]+0.5,top+1.02,u[2]+0.5];}

/* ---- arena volumes (for resets) ---- */
function hnBox(name){const A=hnA();if(name==='bomber')return {x0:-40,x1:39,z0:-190,z1:-161,y0:30,y1:62};
  if(name==='bigpig')return {x0:A.pbox.x0,x1:A.pbox.x1,z0:A.pbox.z0,z1:A.pbox.z1,y0:30,y1:75};
  if(name==='bigfrog')return {x0:-27,x1:27,z0:188,z1:242,y0:4,y1:62,round:1};
  return null;}
/* mpArenaReset(name): delete every chunkEdit inside the arena volume and re-generate those cells from genChunk (which stamps
   the arena from MP), so snipped cords, wired seats, sandbags, tears, digs and placed blocks all come back as built.
   Headliner Trunks are generated from MP.dead, so they survive. Loaded chunks are patched in place and re-meshed. */
function mpArenaReset(name){const b=hnBox(name);if(!b||DIM!=='puppet')return 0;let n=0;
  const inB=(x,y,z)=>x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1&&y>=b.y0&&y<=b.y1&&(!b.round||Math.hypot(x+0.5,z+0.5-215)<=27);
  for(let cx=Math.floor(b.x0/CH);cx<=Math.floor(b.x1/CH);cx++)for(let cz=Math.floor(b.z0/CH);cz<=Math.floor(b.z1/CH);cz++){
    const k=ckey(cx,cz),ed=chunkEdits.get(k);
    if(ed)for(const lk of [...ed.keys()]){const p=lk.split(','),x=cx*CH+ +p[0],y=+p[1],z=cz*CH+ +p[2];if(inB(x,y,z)){ed.delete(lk);n++;}}
    const ch=chunks.get(k);if(!ch)continue;
    let fresh=null;try{fresh=genChunk(cx,cz);}catch(err){mpFail('arenaReset gen',err);continue;}
    let ch2=0;
    for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){const x=cx*CH+lx,z=cz*CH+lz;if(x<b.x0||x>b.x1||z<b.z0||z>b.z1)continue;
      for(let y=b.y0;y<=b.y1;y++){if(!inB(x,y,z))continue;const i=bidx(lx,y,lz);
        if(ch.bl[i]!==fresh[i]){ch.bl[i]=fresh[i];ch2++;}}}
    if(ch2){ch.dirty=true;markDirty(cx-1,cz);markDirty(cx+1,cz);markDirty(cx,cz-1);markDirty(cx,cz+1);}}
  for(const k of [...blockEnts.keys()]){const p=dimP(k);if(!p)continue;const x=+p[0],y=+p[1],z=+p[2];
    if(inB(x,y,z)&&blockEnts.get(k).t!=='stash'&&getBlock(x,y,z)!==B.PG_CAN)blockEnts.delete(k);}
  for(const k of [...torches]){const p=dimP(k);if(!p)continue;const x=+p[0],y=+p[1],z=+p[2];if(inB(x,y,z)&&!isTorch(getBlock(x,y,z)))torches.delete(k);}
  if(typeof hnOnArenaReset==='function')hnOnArenaReset(name);
  return n;}
/* write ids straight into loaded chunks (no chunkEdits): Headliner Trunks appearing, the EXIT travelers opening */
function hnRaw(x,y,z,id){const ch=chunkAt(x,z);if(!ch||y<0||y>=WH)return false;const lx=x-ch.cx*CH,lz=z-ch.cz*CH,i=bidx(lx,y,lz);
  if(ch.bl[i]===id)return false;ch.bl[i]=id;ch.dirty=true;if(lx===0)markDirty(ch.cx-1,ch.cz);if(lx===CH-1)markDirty(ch.cx+1,ch.cz);
  if(lz===0)markDirty(ch.cx,ch.cz-1);if(lz===CH-1)markDirty(ch.cx,ch.cz+1);return true;}

/* ---- Headliner Trunks (block 247, t:'stash', Dan only, restocked from MP: bible 10.0 "Loot") ---- */
var HN_TRUNK={bomber:{pos:()=>hnA().htrunk,keys:()=>[[IT.PG_PLUNGER,[IT.PG_PLUNGER]],[IT.PG_FUSE,[IT.PG_FUSE,IT.PG_GAUNTLET]]],
    rest:()=>[{id:IT.PG_CHARGE,count:8},{id:B.PG_CORD,count:16},{id:IT.PG_WIG,count:1}],name:"The Demolitionist's Trunk"},
  bigpig:{pos:()=>hnA().ptrunk,keys:()=>[[IT.PG_PEARLS,[IT.PG_PEARLS,IT.PG_GAUNTLET]],[IT.PG_CHOPGLOVE,[IT.PG_CHOPGLOVE]]],
    rest:()=>[{id:IT.PG_HAM,count:8},{id:IT.PG_SEQUIN,count:6},{id:IT.PG_SHARD,count:4}],name:"The Pig's Trunk"}};
function hnTrunkBE(name,init){const T=HN_TRUNK[name],p=T.pos(),k=bkey(p[0],p[1],p[2]);let be=blockEnts.get(k);
  if(!be||be.t!=='stash'){be={t:'stash',inv:Array(54).fill(null),who:'Dan',name:T.name,hn:name};blockEnts.set(k,be);
    if(init)for(const s of init)if(s){const i=be.inv.findIndex(v=>!v);if(i>=0)be.inv[i]={...s};}}
  else{be.hn=name;be.name=T.name;}   /* old saves: the stored name is replaced by the current one */
  return be;}
/* applySave: every saved Headliner Trunk (t:'stash' with hn) gets the current hn key and name (v6.1-v6.3 stored the old ones) */
function hnTrunkMigrate(){let n=0;for(const be of blockEnts.values()){if(!be||be.t!=='stash'||!be.hn)continue;
  const k=MP_LEGACY_HN[be.hn]||be.hn;if(!HN_TRUNK[k])continue;if(be.hn!==k||be.name!==HN_TRUNK[k].name)n++;be.hn=k;be.name=HN_TRUNK[k].name;}return n;}
/* place the trunk (raw write, no edit) and fill it; called on the kill and lazily whenever Dan comes near a beaten arena */
function hnTrunkEnsure(name,init){if(DIM!=='puppet'||!MP.dead[name]||!HN_TRUNK[name])return null;const p=HN_TRUNK[name].pos();
  if(!chunkAt(p[0],p[2]))return null;hnRaw(p[0],p[1],p[2],B.PG_STRUNK);return hnTrunkBE(name,init);}
/* the restock rule: a key item comes back whenever Dan has neither it nor something crafted from it (inventory, cursor,
   armour, this trunk, Lost Property in flight) */
function hnTrunkRestock(name){const be=hnTrunkEnsure(name);if(!be)return 0;let n=0;
  const has=ids=>{const all=[...P.inv,...P.armor,cursorStack,...be.inv,...((MP.lost&&MP.lost.Dan)||[])];return all.some(s=>s&&ids.indexOf(s.id)>=0);};
  for(const [id,from] of HN_TRUNK[name].keys())if(!has(from)){const i=be.inv.findIndex(v=>!v);if(i>=0){be.inv[i]={id,count:1};n++;}}
  return n;}
