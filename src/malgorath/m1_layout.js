/* ---- PART 57: m1_layout.js ---- */
/* ===================================================================== */
/* PART 57 m1 (M1): THE BITE · layouts (bible 3.1-3.5).                  */
/* A perfectly round hole bitten out of the world at (1000.5, 1000.5):   */
/* eleven scalloped tooth-marks for an edge, a seabed cross-section for  */
/* a wall, a floating obsidian plate ten metres down over a gut that     */
/* glows sixteen metres further down. The blocks are a PURE function of  */
/* the layout MG1.L:                                                     */
/*   L0 dormant  the Cap (with the eye's slit), the Meal on torn plinths */
/*   L1 Table    the Throat open (r < 7) down to the mound               */
/*   L2 Plate    the Meal torn out: three ragged canonical scars         */
/*   L3 Maw      centre gone to r 12, six islands, 4 m gaps, 3 bridges,  */
/*               the mound crushed to a pedestal                         */
/*   Ldead       L3 + the burial mound (permanent)                       */
/* Everything that differs between layouts lies in the plate disc        */
/* r <= 24.5, y GF..F+8 (mg1DiffBox). Live fight damage is setBlock      */
/* edits through m1_world's queue, purged on every reset.                */
/* Coordinates: dx = wx-1000, dz = wz-1000 (cell centres sit on integer  */
/* offsets from C), theta from +x toward +z (mgPol).                     */
/* ===================================================================== */
var MG1={L:'L0',geo:null,qHi:[],qLo:[],qLoI:0,qLoN:0,over:0,wrote:0,maxFrame:0,frameW:0,his:new Map(),seen:new Map(),
  glow:[],glowM:null,decal:[],decalM:null,eye:{p1:-99,n:0,shut:0,blood:0,ent:null,clack:-99,ring:0,blinkT:3,blink:0},
  scanT:0,cowT:0,cowN:0,chewT:3,chewN:0,chew:-99,orphT:0,spill:[],eaten:0,cleared:0,slurped:0,spit:0,spitT:-9,wakes:{},
  derives:0,lastDerive:null,doorOpen:true,dragon:0,fx:0,fxF:0,syncs:0};
/* knobs (M1_* names may join MG_K: plan 2.3) */
Object.assign(MG_K,{M1_GAP:2.0,M1_EAT:3.0,M1_EAT_INHALE:2.0,M1_SLURP:1.0,M1_QMAX:250,M1_EYE_R:24,M1_POKE_WIN:12,M1_SHUT:0.5,M1_COWS:4});
/* the layout's fixed features (cell offsets from C) */
var MG1_PL=[[16,9,30],[-16,9,150],[0,-17,270]];                 /* the Meal plinths: 1 grove (θ 30), 2 cottage (θ 150), 3 pen (θ 270) */
var MG1_COLS=[[18,0],[9,16],[-9,16],[-18,0],[-9,-16],[9,-16]];   /* bedrock columns under the plate (r 18, θ 60k) */
var MG1_SPIRES=[[11,11],[-11,11],[-11,-11],[11,-11]];            /* bedrock spires, 3x3, 5 tall */
var MG1_TREES=[[-1,-1,4],[1,2,3],[2,-1,4]];                      /* the grove: local offset + trunk height */
var MG1_LEDGE=[40*Math.PI/180,168*Math.PI/180];                  /* the ledge spirals up the inner face from θ 40 (gut) to θ 168 (lip) */
var MG1_LAYOUTS=['L0','L1','L2','L3','Ldead'];
var MG1_C={},MG1_C2={},MG1_C3={};                                /* scratch column descriptors (no allocation per cell) */

/* the heights of this world's Bite (cached per G; F/GF/G from m0) */
function mg1Geo(){const G=mgG();const g=MG1.geo;if(g&&g.G===G)return g;
  const F=mgF(),GF=mgGF(),N=Math.max(1,G-F),RS=mgRw(Math.PI);
  return (MG1.geo={G,F,GF,N,RS,sl:(RS-MGC.R_PLATE)/N});}
/* ring cells of a plinth that must stand (the cottage's path, torch and the dirt pillar) */
function mg1Keep(i,a,b){return i===1&&((a===3&&b>=-1&&b<=1)||(a===-3&&b===-1));}
function mg1Solid(id){return id!==B.AIR&&id!==B.WATER&&id!==B.LAVA&&!!DEFS[id]&&DEFS[id].solid!==false;}
/* the packed eaten world (the mound, the pedestal, the burial): no gravity blocks */
function mg1Mosaic(x,y,z){const q=(h3(x,y,z,SEED+5731)*8)|0;
  return q<2?B.COBBLE:q<3?B.DIRT:q<5?B.STONE:q<6?B.PLANK_O:q<7?B.COAL_ORE:B.IRON_ORE;}
/* the seabed he bit through, in horizontal bands (no sand, no gravel) with ore glints */
function mg1Strata(x,y,z){const q=(h2(y>>1,77,SEED+5741)*8)|0;
  let id=q<2?B.SANDSTONE:q<3?B.DIRT:q<5?B.STONE:q<6?B.COBBLE:q<7?B.CLAY:B.STONE;
  if(id===B.STONE){const o=h3(x,y,z,SEED+5743);if(o<0.05)id=B.COAL_ORE;else if(o<0.08)id=B.IRON_ORE;}return id;}
function mg1Heap(x,y,z){const q=(h3(x,y,z,SEED+5723)*3)|0;return q===0?B.SANDSTONE:q===1?B.GRAVEL:B.COBBLE;}

/* the column descriptor: everything about a column that does not depend on y or on the layout */
function mg1Col(dx,dz,c,g){
  const r=Math.hypot(dx,dz),th=Math.atan2(dz,dx),rw=mgRw(th);
  c.dx=dx;c.dz=dz;c.r=r;c.th=th;c.rw=rw;
  c.zone=r<rw?1:(r<rw+3?2:(r<=MGC.R_SITE?3:0));                  /* 1 inside, 2 the skin (sea-wall + lip), 3 site outside, 0 out */
  c.inner=c.zone===2&&r<rw+1;
  c.throat=r<MGC.R_THROAT;c.plate=!c.throat&&r<=MGC.R_PLATE;c.cen=r<12;
  c.inlay=false;
  if(c.plate){if(r>=22.5){const st=Math.PI*2/33,k=Math.round(th/st);c.inlay=Math.hypot(dx-24*Math.cos(k*st),dz-24*Math.sin(k*st))<=1.6;}
    else if(r<=8.5){const st=Math.PI/6,k=Math.round(th/st);c.inlay=Math.hypot(dx-7*Math.cos(k*st),dz-7*Math.sin(k*st))<=1.2;}}
  c.pl=0;c.pdx=0;c.pdz=0;c.ring=false;c.miss=false;c.scar=false;c.gv=false;c.ga=0;c.gb=0;
  if(c.plate)for(let i=0;i<3;i++){const p=MG1_PL[i],a=dx-p[0],b=dz-p[1];
    if(i===0&&Math.abs(a)<=4&&Math.abs(b)<=4){c.gv=true;c.ga=a;c.gb=b;}                     /* the grove's canopy reaches past its plinth */
    if(Math.abs(a)<=3&&Math.abs(b)<=3){c.pl=i+1;c.pdx=a;c.pdz=b;c.ring=Math.max(Math.abs(a),Math.abs(b))===3;
      const hx=MGC.BX+dx,hz=MGC.BZ+dz;
      c.miss=c.ring&&!mg1Keep(i,a,b)&&h2(hx,hz,SEED+5711)<0.4;                                 /* the torn edge: ~40% of the ring is missing */
      c.scar=!c.ring||h2(hx,hz,SEED+5713)<0.6;}}                                               /* L2: the ragged hole where it was torn out */
  c.spire=false;for(const s of MG1_SPIRES)if(Math.abs(dx-s[0])<=1&&Math.abs(dz-s[1])<=1)c.spire=true;
  c.colm=false;for(const s of MG1_COLS)if(Math.abs(dx-s[0])<=1&&Math.abs(dz-s[1])<=1)c.colm=true;
  c.gap=false;c.bridge=false;c.ray=-1;
  if(r>=12&&r<=MGC.R_PLATE+0.5)for(let k=0;k<6;k++){const a=(30+60*k)*Math.PI/180,ux=Math.cos(a),uz=Math.sin(a);
    const al=dx*ux+dz*uz;if(al>0&&Math.abs(-dx*uz+dz*ux+0.5)<MG_K.M1_GAP){c.gap=true;c.ray=k;if(k%2===1)c.bridge=Math.abs(al-18)<=0.8;break;}}   /* bridges at 90, 210, 330 (wide enough to stay 4-connected on a diagonal) */
  c.mound=r<=6?Math.max(0,Math.round(8-1.33*r)):-1;c.ped=r<=5;c.bury=r<=10?Math.round(g.F-4-0.6*r):-1;
  c.slit=dx===0&&Math.abs(dz)<=1;
  c.stair=-1;c.rail=-1;
  if(dx<0&&Math.abs(dz)<=2&&r>MGC.R_PLATE){const k=Math.floor((-dx-MGC.R_PLATE)/g.sl);if(k>=0&&k<g.N){if(Math.abs(dz)<=1)c.stair=k;else c.rail=k;}}
  c.door=(c.stair>=0&&c.stair<=2)||(c.rail>=0&&c.rail<=2);
  c.ledge=-1;
  if(c.zone===1&&r>=rw-2&&th>=MG1_LEDGE[0]&&th<=MG1_LEDGE[1]){const t=(th-MG1_LEDGE[0])/(MG1_LEDGE[1]-MG1_LEDGE[0]);
    const u=(Math.min(t,0.32)+Math.max(0,Math.min(t,0.64)-0.38)+Math.max(0,t-0.70))/0.88;                                  /* two landings */
    c.ledge=g.GF+1+Math.round(u*(g.G-1-(g.GF+1)));}                                                                        /* standing height */
  c.pad=dx>=-45&&dx<=-39&&Math.abs(dz)<=3;c.heap=0;c.brz=false;                         /* 7x7; the path (dz -1..1) stays clear */
  if(c.pad){if(dx<=-42&&Math.abs(dz)>=2)c.heap=h2(MGC.BX+dx,MGC.BZ+dz,SEED+5721)<0.45?2:1;c.brz=dx===-41&&dz===2;}
  return c;}

/* the block layout L wants at height y of an INSIDE column (zone 1), or -1 for "natural" (below the gut floor) */
function mg1In(L,c,y,g,wx,wz){const F=g.F,GF=g.GF;
  if(y<GF-2)return -1;
  if(y===GF-2)return B.BEDROCK;
  if(y===GF-1)return B.SOULSAND;
  const late=L==='L3'||L==='Ldead',meal=L==='L0'||L==='L1';
  if(y<F-3){                                                                  /* the gut: columns, the mound, the ledge */
    if(c.colm)return B.BEDROCK;
    if(L==='Ldead'){if(c.bury>=0&&y<=c.bury)return mg1Mosaic(wx,y,wz);}
    else if(L==='L3'){if(c.ped&&y<=GF+2)return mg1Mosaic(wx,y,wz);}
    else if(c.mound>=0&&y<=GF+c.mound)return mg1Mosaic(wx,y,wz);
    if(c.ledge>=0&&y===c.ledge-1)return B.NBRICK;
    return B.AIR;}
  if(c.stair>=0)return y<=F+c.stair-1?(y===F-3?B.BEDROCK:B.NBRICK):B.AIR;    /* the Gullet Stair (whole in every stamp: the door is live state) */
  if(c.rail>=0)return y<=F+c.rail?B.BEDROCK:B.AIR;
  if(c.ledge>=0&&y===c.ledge-1)return B.NBRICK;
  if(y<=F-1){                                                                 /* the plate's three layers */
    if(c.throat){if(L==='L0'&&((y===F-1&&!c.slit)||(y===F-2&&c.slit)))return B.BEDROCK;return B.AIR;}   /* the Cap; the slit is a 1-deep socket */
    if(!c.plate)return B.AIR;
    if(late&&(c.cen||(c.gap&&!(c.bridge&&y===F-1))))return B.AIR;
    if(c.pl&&!meal&&c.scar)return B.AIR;
    if(c.pl&&meal){if(y===F-1)return B.DIRT;if(y===F-2)return B.STONE;}     /* the torn chunk's dirt and stone */
    if(y===F-1&&c.inlay)return B.NBRICK;
    return B.OBSIDIAN;}
  if(c.spire&&y<=F+4)return B.BEDROCK;
  if(meal&&(c.pl||c.gv))return mg1Meal(c,y,g,wx,wz);
  return B.AIR;}
/* the Meal: three chunks torn out of somebody else's world, still attached to their grass and dirt */
function mg1Meal(c,y,g,wx,wz){const F=g.F,a=c.pdx,b=c.pdz;
  if(c.pl&&y===F){if(c.miss)return B.AIR;
    if(c.pl===2&&a===3&&b===0)return B.COBBLE;                                /* the path that runs to the edge and stops */
    if(c.ring){const q=h2(wx,wz,SEED+5751);return q<0.45?B.DIRT:(q<0.7?B.STONE:B.GRASS);}
    return B.GRASS;}
  if(c.pl===3){const A=Math.abs(a),Bb=Math.abs(b);                           /* the Pen: posts and planks, 2 high, closed */
    if(y<=F+2&&A<=2&&Bb<=2&&(A===2||Bb===2))return (a===0||b===0||A===Bb)?B.LOG_O:B.PLANK_O;
    return B.AIR;}
  if(c.pl===2){const A=Math.abs(a),Bb=Math.abs(b);                           /* the Cottage: the last architect's */
    if(a===3&&b===1)return y===F+1?B.TORCH:B.AIR;
    if(a===-3&&b===-1)return y<=F+3?B.DIRT:B.AIR;                             /* somebody was mid-build */
    if(A>2||Bb>2)return B.AIR;
    if(y===F+4)return B.PLANK_O;
    if(y>F+3||(A<2&&Bb<2))return B.AIR;
    if(A===2&&Bb===2)return B.LOG_O;
    if(a===2&&b===0&&y<=F+2)return B.AIR;                                     /* the doorway faces the Throat */
    if(a===-2&&y===F+3)return B.AIR;                                          /* the back wall stops at F+2 */
    if(y===F+2&&((a===2&&b===1)||(a===0&&Bb===2)||(a===-2&&b===0)))return B.GLASS;
    return B.PLANK_O;}
  if(c.gv){const ga=c.ga,gb=c.gb;                                            /* the Grove */
    for(const t of MG1_TREES)if(ga===t[0]&&gb===t[1]&&y>=F+1&&y<=F+t[2])return B.LOG_O;
    for(const t of MG1_TREES){const da=Math.abs(ga-t[0]),db=Math.abs(gb-t[1]),top=F+t[2];
      if(y>=top-1&&y<=top&&da<=2&&db<=2&&!(da===2&&db===2))return B.LEAF_O;
      if(y===top+1&&da+db<=1)return B.LEAF_O;}}
  return B.AIR;}
/* the skin r_w <= r < r_w+3: the gut lining, the seabed wall + its bedrock sea-wall, the lip (open above). nat = natural block */
function mg1Skin(c,y,g,wx,wz,nat){const F=g.F,GF=g.GF,G=g.G;
  if(y<=GF-3)return mg1Solid(nat)?-1:B.BEDROCK;                              /* deep safety: the sea never gets under the floor */
  if(y<=F-4)return c.inner?B.NETHROCK:B.BEDROCK;
  if(y<=G-2){if(!c.inner){if(y<=SEA+1)return B.BEDROCK;return (nat>=0&&mg1Solid(nat))?-1:mg1Strata(wx,y,wz);}   /* the sea-wall is bedrock where water can be */
    return (y>F+6&&nat>=0&&mg1Solid(nat))?-1:mg1Strata(wx,y,wz);}
  if(y===G-1)return B.NBRICK;
  return B.AIR;}                                                              /* the lip is open to the sky and walkable all the way round */
/* the Bone Pile (centred (-42, 0), at the stair head): a nether-brick pad over the sea, a heap, a brazier */
function mg1PadAt(c,y,g,wx,wz){const G=g.G;
  if(y===G-1)return B.NBRICK;
  if(y<G)return -1;
  if(c.brz&&y===G)return B.GLOWSTONE;
  if(c.heap&&y<G+c.heap)return mg1Heap(wx,y,wz);
  return B.AIR;}

/* MGREG.stamp: the current layout into a generating overworld chunk (last in genChunk; straight into the array, no edits) */
function mg1Stamp(blocks,x0,z0){
  if(DIM!=='over')return;
  const g=mg1Geo(),L=MG1.L,c=MG1_C,R2=MGC.R_SITE*MGC.R_SITE;
  for(let lx=0;lx<CH;lx++)for(let lz=0;lz<CH;lz++){
    const wx=x0+lx,wz=z0+lz,dx=wx-MGC.BX,dz=wz-MGC.BZ;
    if(dx*dx+dz*dz>R2)continue;
    mg1Col(dx,dz,c,g);
    if(c.zone===1){for(let y=Math.max(1,g.GF-2);y<WH;y++){const id=mg1In(L,c,y,g,wx,wz);if(id>=0)blocks[bidx(lx,y,lz)]=id;}}
    else if(c.zone===2){for(let y=1;y<WH;y++){const i=bidx(lx,y,lz),id=mg1Skin(c,y,g,wx,wz,blocks[i]);if(id>=0)blocks[i]=id;}}
    if(c.pad)for(let y=g.G-1;y<WH;y++){const id=mg1PadAt(c,y,g,wx,wz);if(id>=0)blocks[bidx(lx,y,lz)]=id;}
    if(dx===-13&&dz===10){const k=bkey(wx,g.F+1,wz);if(blocks[bidx(lx,g.F+1,lz)]===B.TORCH)torches.add(k);else torches.delete(k);}   /* the cottage torch */
  }
  mg1Approach(blocks,x0,z0,g);}
/* land seeds: a 3-wide stair from the Bone Pile pad out along -x that steps one block a cell to meet the natural ground (ocean seeds
   land boats on the pad instead). Layout-independent, partly outside the site (unprotected there) */
function mg1Top(blocks,lx,lz){for(let y=WH-1;y>0;y--){const id=blocks[bidx(lx,y,lz)];
    if(id!==B.AIR&&id!==B.WATER&&id!==B.LEAF_O&&id!==B.LEAF_B&&id!==B.LEAF_S&&id!==B.LOG_O&&id!==B.LOG_B&&id!==B.LOG_S&&DEFS[id]&&DEFS[id].solid!==false)return y;}
  return 0;}
function mg1Approach(blocks,x0,z0,g){const lzc=MGC.BZ-z0;if(lzc<1||lzc>=CH-1)return;let s=g.G;
  for(let i=0;i<=10;i++){const lx=MGC.BX-46-i-x0;if(lx<0||lx>=CH)return;
    const want=mg1Top(blocks,lx,lzc)+1;if(i===0&&want<=SEA+1)return;                 /* the sea comes up to the pad: no stair */
    const ns=Math.max(s-1,Math.min(s+1,want));
    for(let dz=-1;dz<=1;dz++){const lz=lzc+dz,top=mg1Top(blocks,lx,lz);
      for(let y=Math.max(1,top+1);y<ns;y++)blocks[bidx(lx,y,lz)]=y===ns-1?B.NBRICK:B.COBBLE;
      for(let y=ns;y<=Math.min(WH-1,Math.max(ns+2,top));y++)blocks[bidx(lx,y,lz)]=B.AIR;}
    s=ns;if(ns===want)return;}}
/* the target of one cell under layout L, where it is pure (inside columns, the skin's fixed part, the pad), else -1 */
function mg1Target(x,y,z,L,g){g=g||mg1Geo();L=L||MG1.L;const dx=x-MGC.BX,dz=z-MGC.BZ;if(dx*dx+dz*dz>MGC.R_SITE*MGC.R_SITE)return -1;
  const c=mg1Col(dx,dz,MG1_C3,g);
  if(c.pad&&y>=g.G-1&&y<=g.G+3)return mg1PadAt(c,y,g,x,z);
  if(c.zone===1)return mg1In(L,c,y,g,x,z);
  if(c.zone===2){if(y<=g.GF-3)return -1;if(y<=g.G-2&&((y>g.F+6&&c.inner)||(y>SEA+1&&!c.inner)))return -1;return mg1Skin(c,y,g,x,z,-1);}
  if(c.zone===3&&x===MGC.BX-46&&Math.abs(z-MGC.BZ)<=1)return -1;                    /* the approach (natural-dependent) */
  return -1;}
/* every cell of the plate disc (r <= 24.5, y GF..F+8) whose LIVE block differs from layout L (loaded chunks only) */
function mg1DiffBox(L,g,fn){const c=MG1_C2;
  for(let dx=-25;dx<=25;dx++)for(let dz=-25;dz<=25;dz++){if(dx*dx+dz*dz>24.5*24.5)continue;
    const wx=MGC.BX+dx,wz=MGC.BZ+dz,ch=chunkAt(wx,wz);if(!ch)continue;mg1Col(dx,dz,c,g);
    const lx=wx-ch.cx*CH,lz=wz-ch.cz*CH;
    for(let y=g.GF;y<=g.F+8;y++){const want=mg1In(L,c,y,g,wx,wz),cur=ch.bl[bidx(lx,y,lz)];if(want>=0&&want!==cur)fn(wx,y,wz,want,cur,c);}}}
/* the layout a state wants: dead -> Ldead, never met -> L0, else the checkpoint round */
function mg1LayoutFor(round){if(DEMON.dead||MALG.dead)return 'Ldead';if(!MALG.met)return 'L0';return 'L'+Math.max(1,Math.min(MGC.ROUNDS,round|0||1));}
function mg1Want(){return mg1LayoutFor(MALG.round);}
