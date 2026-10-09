/* m1_static.js (M1, gate x1): THE BITE's layouts as pure maths (bible 3.1-3.5, MALGORATH_PLAN.md 5.1 / 8.1). Seed 1337 (the Bite in
   the open sea: G 32, F 22, GF 6) and a land seed (3: G 52). Every zone of every layout through the classifier the stamp uses
   (MGEX.mg1In / mg1Target / MGREG.layoutAt): the Cap and its slit, the plate's three layers and inlays, the Meal (pen, cottage, grove)
   on torn plinths, spires, columns, the mound / pedestal / burial, the L2 scars, the L3 islands with their gaps (sprint-jumpable
   4 m, the scars unjumpable) and bridges (island pairs), the Gullet Stair and its door, the ledge out of the gut, the Bone Pile, the
   -x ray every lead suite stands on, no gravity block, nothing block-built above F+24, no old-arena block, determinism. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const V=boot({});
const step=boot.stepper(700000);
boot.run(async()=>{
  if(boot.mgStubbed('1')){skip('all M1 statics','M1 is on its stub');return;}
  boot.world(V,'m1s','1337',step);
  const B=V.B,G=V.mgG(),F=V.mgF(),GF=V.mgGF(),g=V.mg1Geo(),X=1000,Z=1000;
  const at=(L,dx,y,dz)=>V.mg1In(L,X+dx,y,Z+dz);
  const LS=['L0','L1','L2','L3','Ldead'];
  ok('seed 1337: G 32, F 22, GF 6; the stair has 10 steps of 1.45 m (G-F = 10, r 24 -> 38.5)',G===32&&F===22&&GF===6&&g.N===10&&Math.abs(g.sl-1.45)<1e-9);

  /* ---- shared by every layout: the gut floor, the columns, the stair, the ledge, the Bone Pile ---- */
  let floor=true;for(let k=0;k<64;k++){const a=k*Math.PI/32;for(const r of [3,15,30,35]){const dx=Math.round(Math.cos(a)*r),dz=Math.round(Math.sin(a)*r);
    for(const L of LS)if(at(L,dx,GF-2,dz)!==B.BEDROCK||at(L,dx,GF-1,dz)!==B.SOULSAND)floor=false;}}
  ok('every layout: bedrock at GF-2 and soul sand at GF-1 everywhere inside the wall (the gut floor)',floor);
  let cols=true;for(const [cx,cz] of [[18,0],[9,16],[-9,16],[-18,0],[-9,-16],[9,-16]])for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const L of LS)
    for(let y=GF;y<=F-4;y++)if(at(L,cx+i,y,cz+j)!==B.BEDROCK)cols=false;
  ok('six 3x3 bedrock columns hold the plate up (r 18, theta 60k, GF..F-4) in every layout',cols);
  let stair=true;for(let k=0;k<10;k++){const s=Math.ceil(24+1.45*k+0.01);if(s>=24+1.45*(k+1))continue;const dx=-s;
    for(const dz of [-1,0,1])for(const L of LS){if(at(L,dx,F+k-1,dz)!==B.NBRICK&&!(k===0&&dz===0))stair=false;if(at(L,dx,F+k,dz)!==B.AIR||at(L,dx,F+k+1,dz)!==B.AIR)stair=false;
      if(at(L,dx,F-3,dz)!==B.BEDROCK)stair=false;}
    for(const dz of [-2,2]){const v=at('L1',dx,F+k,dz);if(v!==B.BEDROCK&&v!==B.NBRICK)stair=false;}}
  ok('the Gullet Stair (theta 180, 3 wide): step k stands at F+k (nether brick treads, bedrock underside at F-3, rails 1 high), step 9 at G-1',stair);
  const door=[];for(let dx=-30;dx<=-24;dx++)for(let dz=-2;dz<=2;dz++){const c=V.mg1Col(dx,dz);if(c.door)door.push(-dx);}
  ok('the door is steps 0-2 (r 24 .. 28.35: '+Math.min(...door)+'..'+Math.max(...door)+') and nothing else',door.length>0&&Math.min(...door)>=24&&Math.max(...door)<=28);
  /* the ledge: a band of treads on the inner face, theta 40 -> 168, from GF+1 to G-1, every neighbour within one block */
  const led=new Map();for(let dx=-40;dx<=40;dx++)for(let dz=-40;dz<=40;dz++){const c=V.mg1Col(dx,dz);if(c.zone===1&&c.ledge>=0)led.set(dx+','+dz,{dx,dz,h:c.ledge,th:c.th});}
  let lo=null,hi=null;for(const v of led.values()){if(!lo||v.th<lo.th)lo=v;if(!hi||v.th>hi.th)hi=v;}
  const seen=new Set([lo.dx+','+lo.dz]),q=[lo];while(q.length){const a=q.shift();for(const [i,j] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(a.dx+i)+','+(a.dz+j),b=led.get(k);
    if(b&&!seen.has(k)&&Math.abs(b.h-a.h)<=1){seen.add(k);q.push(b);}}}
  let treads=true;for(const v of led.values())for(const L of LS)if(at(L,v.dx,v.h-1,v.dz)!==B.NBRICK||at(L,v.dx,v.h,v.dz)!==B.AIR||at(L,v.dx,v.h+1,v.dz)!==B.AIR)treads=false;
  ok('the ledge climbs out of the gut: '+led.size+' tread cells from standing GF+1 (theta 40) to G-1 (theta 168), 4-connected with no step over 1 block',
    lo.h===GF+1&&hi.h===G-1&&seen.has(hi.dx+','+hi.dz)&&seen.size===led.size&&treads);
  {const p=V.mgPol(1000.5+hi.dx+Math.cos(hi.th)*2,1000.5+hi.dz+Math.sin(hi.th)*2),c=V.mg1Col(Math.round(hi.dx+Math.cos(hi.th)*2),Math.round(hi.dz+Math.sin(hi.th)*2));
   ok('...and its top tread steps straight onto the lip (skin, nether brick at G-1, open above)',c.zone===2&&V.mg1Target(X+c.dx,G-1,Z+c.dz,'L1')===B.NBRICK&&V.mg1Target(X+c.dx,G,Z+c.dz,'L1')===B.AIR&&p.r>0);}
  const bp=V.mg1BonePile();
  ok('the Bone Pile respawn point stands on the pad (nether brick at G-1, clear at G and G+1), outside the arena and the volume, facing +x',
    V.mg1Target(Math.floor(bp.x),G-1,Math.floor(bp.z))===B.NBRICK&&V.mg1Target(Math.floor(bp.x),G,Math.floor(bp.z))===B.AIR&&V.mg1Target(Math.floor(bp.x),G+1,Math.floor(bp.z))===B.AIR&&
    bp.y===G&&V.mgZone(bp.x,bp.y,bp.z)==='site'&&!V.mgIn(bp.x,bp.y,bp.z)&&Math.abs(-Math.sin(bp.yaw)-1)<1e-9);
  let path=true;for(let dx=-45;dx<=-39;dx++)for(const dz of [-1,0,1])if(V.mg1Target(X+dx,G-1,Z+dz)!==B.NBRICK||V.mg1Target(X+dx,G,Z+dz)!==B.AIR||V.mg1Target(X+dx,G+1,Z+dz)!==B.AIR)path=false;
  let heap=0,glow=0;for(let dx=-45;dx<=-39;dx++)for(let dz=-3;dz<=3;dz++){const v=V.mg1Target(X+dx,G,Z+dz);if(v===B.SANDSTONE||v===B.GRAVEL||v===B.COBBLE)heap++;if(v===B.GLOWSTONE)glow++;}
  ok('the pad keeps a clear 3-wide path to the stair head; the heap ('+heap+' cells) flanks it; one glowstone brazier',path&&heap>=8&&glow===1);

  /* ---- L0 dormant ---- */
  let cap=true,slit=0;for(let dx=-6;dx<=6;dx++)for(let dz=-6;dz<=6;dz++){if(dx*dx+dz*dz>=49)continue;const v=at('L0',dx,F-1,dz);
    if(dx===0&&Math.abs(dz)<=1){if(v===B.AIR&&at('L0',dx,F-2,dz)===B.BEDROCK)slit++;}else if(v!==B.BEDROCK)cap=false;
    if(!(dx===0&&Math.abs(dz)<=1)&&at('L0',dx,F-2,dz)!==B.AIR)cap=false;}
  ok('L0: the Cap is a bedrock lid over the Throat (r < 7) with the eye\'s 1x3 slit carved into it (a 1-deep socket)',cap&&slit===3);
  let plate=true,inl=0;for(let dx=-24;dx<=24;dx++)for(let dz=-24;dz<=24;dz++){const c=V.mg1Col(dx,dz);if(!c.plate||c.pl)continue;
    if(at('L0',dx,F-3,dz)!==B.OBSIDIAN||at('L0',dx,F-2,dz)!==B.OBSIDIAN)plate=false;const t=at('L0',dx,F-1,dz);if(t===B.NBRICK)inl++;else if(t!==B.OBSIDIAN)plate=false;}
  ok('L0: the plate (7 <= r <= 24) is three layers of obsidian with '+inl+' nether-brick tooth-mark inlay cells (rim + rosette)',plate&&inl>=80&&inl<=260);
  let rim=0,ros=0;for(let k=0;k<33;k++){const a=k*Math.PI*2/33,dx=Math.round(Math.cos(a)*23.5),dz=Math.round(Math.sin(a)*23.5);if(at('L0',dx,F-1,dz)===B.NBRICK)rim++;}
  for(let k=0;k<12;k++){const a=k*Math.PI/6,dx=Math.round(Math.cos(a)*7.5),dz=Math.round(Math.sin(a)*7.5);if(at('L0',dx,F-1,dz)===B.NBRICK)ros++;}
  ok('L0: the inlays read as bites: '+rim+'/33 rim bites and '+ros+'/12 rosette bites under the iris',rim>=28&&ros>=10);
  let mound=true;for(let r=0;r<=6;r++){const h=Math.max(0,Math.round(8-1.33*r));if(at('L0',r,GF+h,0)===B.AIR||at('L0',r,GF+h+1,0)!==B.AIR)mound=false;}
  ok('L0: the mound of packed eaten world rises in the gut to F-8 at the centre (no gravity blocks in the mosaic)',mound&&at('L0',0,F-8,0)!==B.AIR&&at('L0',0,F-7,0)===B.AIR);
  const PL=[[16,9],[-16,9],[0,-17]];let plin=true,miss=0,ring=0;
  for(const [px,pz] of PL)for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){const r=Math.max(Math.abs(a),Math.abs(b))===3,v=at('L0',px+a,F,pz+b);
    if(!r&&v!==B.GRASS&&!(px===-16&&a===3))plin=false;if(r){ring++;if(v===B.AIR)miss++;}if(at('L0',px+a,F-1,pz+b)!==B.DIRT||at('L0',px+a,F-2,pz+b)!==B.STONE)plin=false;}
  ok('L0: the Meal sits on three 7x7 chunks torn out of another world (grass over dirt and stone) with ragged edges ('+miss+'/'+ring+' ring cells missing)',plin&&miss>=ring*0.2&&miss<=ring*0.55);
  let pen=true;for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const wall=Math.abs(a)===2||Math.abs(b)===2;for(const y of [F+1,F+2]){const v=at('L0',a,y,-17+b);if(wall?(v!==B.LOG_O&&v!==B.PLANK_O):v!==B.AIR)pen=false;}}
  ok('L0: the Pen (theta 270) is closed: log posts and plank walls 2 high around a 3x3 of grass',pen);
  const cx=-16,cz=9;
  ok('L0: the Cottage (theta 150): a doorway facing the Throat, a torch beside it, a window a side, a planks roof, the back wall stopping at F+2, a dirt pillar mid-build',
    at('L0',cx+2,F+1,cz)===B.AIR&&at('L0',cx+2,F+2,cz)===B.AIR&&at('L0',cx+3,F+1,cz+1)===B.TORCH&&at('L0',cx+2,F+2,cz+1)===B.GLASS&&at('L0',cx,F+2,cz-2)===B.GLASS&&
    at('L0',cx,F+4,cz)===B.PLANK_O&&at('L0',cx-2,F+3,cz)===B.AIR&&at('L0',cx-2,F+3,cz-2)===B.LOG_O&&at('L0',cx-3,F+3,cz-1)===B.DIRT&&at('L0',cx+3,F,cz)===B.COBBLE);
  let trunks=0;for(const [a,b,h] of [[-1,-1,4],[1,2,3],[2,-1,4]])if(at('L0',16+a,F+1,9+b)===B.LOG_O&&at('L0',16+a,F+h,9+b)===B.LOG_O&&at('L0',16+a,F+h+1,9+b)===B.LEAF_O)trunks++;
  ok('L0: the Grove (theta 30): three oaks with leaf crowns',trunks===3);
  let spires=true;for(const [sx,sz] of [[11,11],[-11,11],[-11,-11],[11,-11]])for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const L of LS)
    for(let y=F;y<=F+4;y++)if(at(L,sx+i,y,sz+j)!==B.BEDROCK||at(L,sx+i,F+5,sz+j)!==B.AIR)spires=false;
  ok('four 3x3 bedrock spires stand F..F+4 at (+-11, +-11) in every layout (cover in R2, R3)',spires);

  /* ---- L1 the Table ---- */
  let thr=true;for(let dx=-6;dx<=6;dx++)for(let dz=-6;dz<=6;dz++){if(dx*dx+dz*dz>=49)continue;for(let y=F-3;y<=F+2;y++)if(at('L1',dx,y,dz)!==B.AIR)thr=false;}
  ok('L1: the Throat is open (r < 7, a 14 m hole down to the mound); the Meal and the plate are unchanged',thr&&at('L1',0,F-8,0)!==B.AIR&&at('L1',0,F+1,-17+2)===B.LOG_O&&at('L1',12,F-1,0)===B.OBSIDIAN);

  /* ---- L2 the Plate: three canonical scars ---- */
  let scar=true;for(const [px,pz] of PL)for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)for(let y=F-3;y<=F+5;y++)if(at('L2',px+a,y,pz+b)!==B.AIR)scar=false;
  let rest=true;for(let dx=-24;dx<=24;dx++)for(let dz=-24;dz<=24;dz++){const c=V.mg1Col(dx,dz);if(!c.plate||c.pl||c.spire)continue;if(at('L2',dx,F-1,dz)===B.AIR)rest=false;}
  ok('L2: the Meal and the plate under it are torn out through all three layers (three ragged 7x7 holes at theta 30, 150, 270); the rest of the plate is whole',scar&&rest&&thr);
  let meal2=0;for(let dx=-24;dx<=24;dx++)for(let dz=-24;dz<=24;dz++)for(let y=F;y<=F+6;y++){const v=at('L2',dx,y,dz);if(v!==B.AIR&&v!==B.BEDROCK)meal2++;}
  ok('L2: nothing of the Meal is left above the plate (only the spires stand)',meal2===0);

  /* ---- L3 the Maw: the centre, six islands, gaps, bridges, the pedestal ---- */
  let cen=true;for(let dx=-11;dx<=11;dx++)for(let dz=-11;dz<=11;dz++){if(dx*dx+dz*dz>=144)continue;for(let y=F-3;y<=F-1;y++)if(at('L3',dx,y,dz)!==B.AIR)cen=false;}
  ok('L3: the plate\'s centre is gone to r 12',cen);
  const clear=(L,deg,r)=>{const a=deg*Math.PI/180,ux=Math.cos(a),uz=Math.sin(a),vx=-uz,vz=ux;const air=t=>at(L,Math.floor(0.5+r*ux+t*vx),F-1,Math.floor(0.5+r*uz+t*vz))===B.AIR;
    if(!air(0))return 0;let l=0,h=0;while(l>-9&&air(l-0.02))l-=0.02;while(h<9&&air(h+0.02))h+=0.02;return h-l;};
  const RS=[];for(let r=12.5;r<=23;r+=0.5)if(r<16.9||r>19.1)RS.push(r);
  const wa=RS.map(r=>clear('L3',90,r)),wd=[].concat(...[210,330].map(d=>RS.map(r=>clear('L3',d,r)))),md=wd.reduce((a,b)=>a+b,0)/wd.length;
  ok('L3: the bridged gaps are 4 m, sprint-jumpable only: exactly 4.0 on the axis ray (90: '+Math.min(...wa).toFixed(2)+'..'+Math.max(...wa).toFixed(2)+
    '), a pixel staircase averaging '+md.toFixed(2)+' on the diagonals (210, 330: '+Math.min(...wd).toFixed(2)+'..'+Math.max(...wd).toFixed(2)+')',
    wa.every(x=>Math.abs(x-4)<0.05)&&md>=3.7&&md<=4.3&&wd.every(x=>x>=3.2&&x<=4.8));
  const ws=[30,150,270].map(d=>clear('L3',d,18)),wo=[].concat(...[30,150,270].map(d=>[12.5,13,22.5,23].map(r=>clear('L3',d,r))));
  ok('L3: where the Meal stood the gaps are torn wide (unjumpable, > 4.43 at r 18: '+ws.map(x=>x.toFixed(2)).join(' ')+') and about 4 m on the inner and outer stretches ('+
    Math.min(...wo).toFixed(2)+'..'+Math.max(...wo).toFixed(2)+')',ws.every(x=>x>4.43)&&wo.every(x=>x>=3.2&&x<=4.8));
  const stand=(L,dx,dz)=>{const t=at(L,dx,F-1,dz);return t!==B.AIR&&t!==-1&&at(L,dx,F,dz)===B.AIR&&at(L,dx,F+1,dz)===B.AIR;};
  const reach=(L,a0,a1,eight)=>{const s=[Math.round(18*Math.cos(a0*Math.PI/180)),Math.round(18*Math.sin(a0*Math.PI/180))],t=[Math.round(18*Math.cos(a1*Math.PI/180)),Math.round(18*Math.sin(a1*Math.PI/180))];
    const N=eight?[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1]];const S=new Set([s+'']),Q=[s];
    while(Q.length){const p=Q.shift();if(p[0]===t[0]&&p[1]===t[1])return true;for(const [i,j] of N){const n=[p[0]+i,p[1]+j];if(S.has(n+''))continue;if(n[0]*n[0]+n[1]*n[1]>24.5*24.5)continue;if(!stand(L,n[0],n[1]))continue;S.add(n+'');Q.push(n);}}return false;};
  ok('L3: three 1-wide bridges join the islands in pairs: 60-120, 180-240, 300-0 are walkable (4-connected)',reach('L3',60,120)&&reach('L3',180,240)&&reach('L3',300,0));
  ok('L3: ...and the pairs are cut from each other by the wide gaps (no walk, even corner to corner, 0-60, 120-180, 240-300)',!reach('L3',0,60,1)&&!reach('L3',120,180,1)&&!reach('L3',240,300,1));
  let ped=true;for(let r=0;r<=5;r++){if(at('L3',r,GF+2,0)===B.AIR||at('L3',r,GF+3,0)!==B.AIR)ped=false;}
  ok('L3: the mound is crushed into a rubble pedestal (r <= 5, GF..GF+2: his feet at F-13)',ped&&at('L3',6,GF,0)===B.AIR);
  let rays=true;for(const r of [12,14,18,21])if(!stand('L3',-r,0))rays=false;
  ok('L3: the stair lands on island 180 (the -x ray r 12..21 is standing ground)',rays&&stand('L3',-23,0));

  /* ---- Ldead ---- */
  let bury=true;for(let r=0;r<=10;r++){const top=Math.round(F-4-0.6*r);if(at('Ldead',r,top,0)===B.AIR||at('Ldead',r,top+1,0)!==B.AIR)bury=false;}
  let same=true;for(let dx=-24;dx<=24;dx+=2)for(let dz=-24;dz<=24;dz+=2)for(let y=F-3;y<=F+5;y++)if(at('Ldead',dx,y,dz)!==at('L3',dx,y,dz))same=false;
  ok('Ldead: L3\'s islands, and the burial mound in the gut (r <= 10, top F-4-0.6r): he is under there',bury&&same);

  /* ---- every layout ---- */
  let ray9=true;for(const L of ['L0','L1','L2'])for(let r=9;r<=21;r++)if(!stand(L,-r,0))ray9=false;
  ok('the -x ray (theta 180) is standing plate from r 9 to 21 in L0, L1 and L2 and from r 12 in L3 and Ldead (the lead suites stand there)',ray9&&rays);
  const YS=[];for(let y=GF-2;y<=F+26;y++)YS.push(y);for(let y=F+30;y<80;y+=6)YS.push(y);YS.push(79);
  let grav=0,high=0,old=0;for(const L of LS)for(let dx=-46;dx<=46;dx++)for(let dz=-46;dz<=46;dz++){if(dx*dx+dz*dz>46*46)continue;const c=V.mg1Col(dx,dz);
    for(const y of YS){const v=c.zone===1?at(L,dx,y,dz):V.mg1Target(X+dx,y,Z+dz,L);if(v<=0)continue;
      if((v===B.SAND||v===B.GRAVEL)){const below=c.zone===1?at(L,dx,y-1,dz):V.mg1Target(X+dx,y-1,Z+dz,L);if(below===B.AIR)grav++;}
      if(c.zone===1&&y>F+24)high++;if(v===B.LAVA||v===(B.SBRICK||73))old++;}}
  ok('no gravity block stands over air, nothing is block-built above F+24 inside, no lava or old-arena stone brick, in any layout',grav===0&&high===0&&old===0);
  let la=true;for(let i=0;i<300;i++){const dx=((i*37)%93)-46,dz=((i*61)%93)-46,y=GF+((i*13)%30);if(V.MGREG.layoutAt(X+dx,y,Z+dz)!==V.mg1Target(X+dx,y,Z+dz,V.getMG1().L))la=false;}
  ok('MGREG.layoutAt is the stamp\'s classifier for the current layout (300 spot cells)',la);
  const r0=Math.random;let calls=0;Math.random=function(){calls++;return r0();};
  const a1=[],a2=[];for(let i=0;i<2000;i++){const dx=((i*7)%49)-24,dz=((i*11)%49)-24,y=GF+(i%24);a1.push(at('L3',dx,y,dz));}
  for(let i=0;i<2000;i++){const dx=((i*7)%49)-24,dz=((i*11)%49)-24,y=GF+(i%24);a2.push(at('L3',dx,y,dz));}Math.random=r0;
  ok('the classifier is deterministic (seeded hashes only: no Math.random)',calls===0&&a1.join()===a2.join());

  /* ---- a land seed ---- */
  boot.world(V,'m1s3','3',step);
  const G3=V.mgG(),F3=V.mgF(),GF3=V.mgGF();
  ok('land seed 3: G '+G3+', F '+F3+', GF '+GF3+' (F = G-10 on land too)',G3>=40&&F3===G3-10&&GF3===F3-16);
  let st3=true;for(let k=0;k<V.mg1Geo().N;k++){const s=Math.ceil(24+V.mg1Geo().sl*k+0.01);if(s>=24+V.mg1Geo().sl*(k+1))continue;if(V.mg1In('L1',X-s,F3+k-1,Z)!==B.NBRICK)st3=false;}
  ok('land seed: the stair still rises from F to G-1 and the plate still floats over the gut',st3&&V.mg1In('L1',X-12,F3-1,Z)===B.OBSIDIAN&&V.mg1In('L1',X-12,F3-4,Z)===B.AIR);
});
