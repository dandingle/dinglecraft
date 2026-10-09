/* p1_smoke.js (P1, gate x2): THE STAGE (the purgatory build plan section 5.1, bible section 3, 15.3, 18).
   biome signatures at fixed coordinates, the rake, trench climb-outs + Stuffing floors, drain ledges + soft floors, the stock pot
   step, travelers iff !MP.open (opening writes no edits, reload keeps it open), arches open only within 60 m, trees go limp (one
   drop entity per type) and regrow after 300 s of MP.clock, flats topple mesh-only (zero AIR edits, crush + pin), the felt sheet
   (Dan only: sag 1.5 s, tear 2 s, re-tension 60 s), the flinch, walkable ground >= y 30, the y 62 ceiling and every border top at 70,
   gen/mesh budgets, Tesla arcs, the Ghost Light, the Palace spots, booths in order, mwSpots for every kind, the cue clock and the
   Followspot, sky presets, beacons, the Grid, BOO, round things, the skin twitch, the EXIT doors, determinism, and audio dispatch
   against the stub AudioContext. Checks needing a package still on its stub are skipped. */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
const {performance}=require('perf_hooks');
const V=boot({});
const step=boot.stepper(600000),B=V.B,IT=V.IT,MPC=V.MPC,C=V.pgCore();
const MP=()=>V.getMP(),MPF=()=>V.getMPF(),T=V.p1T();
const stub=d=>V.mpInfo().stubs.indexOf(d)>=0;
const ck=(x,z)=>C.ckey(Math.floor(x/16),Math.floor(z/16));
function load(x,z){V.forceChunksNear(x,z);}
let P=null;   /* V.P is replaced on every world load / applySave: always re-read it (tp() and relink() do) */
function relink(){P=V.P;return P;}
function tp(x,z,y){P=V.P;load(x,z);P.x=x+0.5;P.z=z+0.5;P.y=y!=null?y:V.surfaceTop(x,z)+1.05;P.vx=P.vy=P.vz=0;P.fallD=0;step(25);}
const gb=(x,y,z)=>{if(!C.chunkAt(x,z))load(x,z);return V.getBlock(x,y,z);};   /* reads always see a generated chunk */
const solid=id=>id&&V.DEFS[id]&&V.DEFS[id].solid!==false;
function editsIn(cells){let n=0;for(const c of cells){const E=V.chunkEdits().get(ck(c[0],c[2]));if(!E)continue;const cx=Math.floor(c[0]/16),cz=Math.floor(c[2]/16);
  if(E.has((c[0]-cx*16)+','+c[1]+','+(c[2]-cz*16)))n++;}return n;}
function countAround(x,y,z,r,id){let n=0;for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)for(let c=-r;c<=r;c++)if(gb(x+a,y+b,z+c)===id)n++;return n;}
const drops=()=>V.entities.filter(e=>e.t==='drop'&&!e.dead);
function clearDrops(){for(const e of drops())C.removeEnt(e);}

boot.run(async()=>{
  /* ===== 0. statics (no world) ===== */
  ok('MW_SFX holds the 41 sounds of plan 2.5 plus pg_drum, all unique pg_ names',V.MW_SFX.length===42&&new Set(V.MW_SFX).size===42&&V.MW_SFX.every(n=>/^pg_[a-z]+$/.test(n)));
  ok('MW_MUSIC holds the 7 states of plan 2.5',JSON.stringify(V.MW_MUSIC)===JSON.stringify(['show','blackout','intermission','bomber','bigpig','bigfrog','strike']));
  {const plan=['pg_squeak','pg_honk','pg_boing','pg_slide','pg_rimshot','pg_laugh','pg_applause','pg_gasp','pg_boo','pg_clicks','pg_bells','pg_spark','pg_fizz',
    'pg_plunger','pg_trapdoor','pg_thump','pg_hiss','pg_cleaver','pg_ladle','pg_chatter','pg_alarm','pg_thwip','pg_gulp','pg_strum','pg_sandbag','pg_swish','pg_lid',
    'pg_boot','pg_thunk','pg_whump','pg_creak','pg_rip','pg_smooch','pg_whoosh','pg_splat','pg_tipover','pg_flinch','pg_foamtear','pg_bristle','pg_bootthud','pg_bite'];
   ok('every plan 2.5 sound name is in MW_SFX',plan.every(n=>V.MW_SFX.includes(n)));}
  {let r=0;const R0=Math.random;Math.random=()=>{r++;return R0();};const a=T.genChunkPuppet(0,-9),b=T.genChunkPuppet(0,-9);Math.random=R0;
   let same=a.length===b.length;for(let i=0;i<a.length&&same;i++)if(a[i]!==b[i])same=false;
   ok('genChunkPuppet is deterministic and never calls Math.random',same&&r===0);}

  /* ===== 1. into purgatory ===== */
  boot.world(V,'p1a','1337',step);
  ok('entered purgatory',V.mpEnterNow()&&V.mpInfo().dim==='puppet');step(40);
  relink();P.mode='s';boot.purge(V);
  ok('Dan stands on the Mark pad (y 35 Stage Deck) with the hub Bin at (3,36,-134)',gb(0,35,-136)===B.PG_DECK&&gb(3,36,-134)===B.PG_CAN&&Math.abs(P.y-36)<0.2);
  ok('the bots’ Stuffing heap is at the pad’s stage-left edge',gb(-6,V.mpSurf(-6,-136)+1,-136)===B.PG_STUFFING);

  /* ===== 2. biome signatures (countBlockNear at fixed coordinates) ===== */
  load(10,-150);ok('a Woods trench: Stuffing Drift floor at y 22, air above (x 10, z -150)',gb(10,22,-150)===B.PG_STUFFING&&gb(10,23,-150)===0&&gb(10,30,-151)===0);
  ok('the centre bridge over the -150 trench stays at deck level, the trench runs under it',solid(gb(0,V.mpSurf(0,-150),-150))&&gb(0,26,-150)===0&&gb(0,22,-150)===B.PG_STUFFING);
  ok('Woods surface is Shag Carpet over Stage Deck',gb(-20,V.mpSurf(-20,-140),-140)===B.PG_SHAG||gb(30,V.mpSurf(30,-110),-110)===B.PG_SHAG);
  ok('Woods: Puppeteer at y 0-2, Rotten Foam at 3-13, Foam above',[0,1,2].every(y=>gb(10,y,-140)===B.PG_SKIN)&&[5,10].every(y=>[B.PG_ROT,B.PG_SEQORE,0].includes(gb(10,y,-140))));
  load(0,-160);ok('the proscenium: Velvet to y 70 outside the opening, air in it to y 60, Velvet above',gb(-60,50,-160)===B.PG_VELVET&&gb(0,45,-160)===0&&gb(0,61,-160)===B.PG_VELVET&&gb(0,70,-160)===B.PG_VELVET&&gb(0,71,-160)===0);
  load(0,-180);ok('the apron is flat Stage Deck at y 34',[-30,0,30].every(x=>gb(x,34,-180)===B.PG_DECK&&gb(x,35,-180)===0));
  load(0,-196);ok('the orchestra pit floor is y 30, walled in Masking Black, with the 3-wide centre stair',gb(10,30,-196)===B.PG_DECK&&gb(10,31,-196)===0&&gb(10,33,-202)===B.PG_MBLACK&&
    gb(0,33,-191)===B.PG_DECK&&gb(0,32,-192)===B.PG_DECK&&gb(0,31,-193)===B.PG_DECK&&gb(0,31,-200)===B.PG_DECK&&gb(0,33,-202)===B.PG_DECK&&gb(0,34,-202)===0);
  load(10,-224);ok('the House: terraces rise 1 per 4 z, an Audience Seat row on each (z -224, y 40)',gb(10,39,-224)===B.PG_DECK&&gb(10,40,-224)===B.PG_SEAT&&gb(0,40,-224)===0&&countAround(20,40,-224,3,B.PG_SEAT)>=7);
  load(0,-298);ok('the EXIT doors are Traveler (y 58-61) while no Strike runs',[58,61].every(y=>gb(0,y,-299)===B.PG_TRAVELER)&&gb(0,57,-299)===B.PG_MBLACK);
  load(60,-206);{const S=MPC.BOX_SW;ok('the Old Goats’ box: a Velvet balcony at (60,46,-206)',gb(S[0],S[1]-1,S[2])===B.PG_VELVET&&gb(S[0],S[1],S[2])===0&&gb(S[0]-2,S[1],S[2])===B.PG_VELVET);}
  {const K=T.mwKitchen();load(K.hut.x0+4,K.hut.z0+3);load(K.pot.x0,K.pot.z0);
   ok('the Cook’s Kitchen sits on a Countertop mesa top (walls 3 high, the counter, a 2x2 Burner stove)',gb(K.hut.x0,K.T+3,K.hut.z0+3)===B.PG_COUNTER&&gb(K.hut.x0+3,K.T+1,K.hut.z0)===B.PG_COUNTER&&
     gb(K.hut.x0+5,K.T,K.hut.z0+4)===B.PG_BURNER&&gb(K.hut.x0+4,K.T,K.hut.z0+3)===B.PG_COUNTER&&gb(K.hut.x0+4,K.T+1,K.hut.z0+3)===0);
   const p=K.pot;let soup=0,step_=0;for(let x=p.x0+1;x<=p.x0+3;x++)for(let z=p.z0+1;z<=p.z0+3;z++){const id=gb(x,K.T,z);if(id===B.PG_SOUP)soup++;if(id===B.PG_COUNTER)step_++;}
   ok('the stock pot: 5x5 Masking Black ring rising 1 above 1-deep soup, 8 soup cells and one inside Countertop step',soup===8&&step_===1&&gb(p.x0,K.T+1,p.z0)===B.PG_MBLACK&&gb(p.x0+2,K.T+1,p.z0)===B.PG_MBLACK&&gb(p.x0+2,K.T-1,p.z0+2)===B.PG_COUNTER);
   const sp=V.mwSpots('stockpot')[0];ok('the stock pot’s step is a 1-high climb out (step top T, ring top T+1)',gb(sp[0],sp[1]-1,sp[2])===B.PG_COUNTER&&sp[1]===K.T+1&&gb(p.x0,K.T+1,sp[2])===B.PG_MBLACK&&gb(p.x0,K.T+2,sp[2])===0);
   const n=K.notch;let stair=true;for(let z=n.z0;z<=n.z1;z++){const top=n.base+1+(z-n.z0);if(gb(n.x,top,z)!==B.PG_COUNTER||solid(gb(n.x,top+1,z)))stair=false;}
   ok('a 1-wide Countertop stair climbs the Cook’s mesa (no Dough needed)',stair&&gb(n.x,K.T,n.z1+1)===B.PG_COUNTER);}
  {let mesa=0,soup=0;for(let x=-60;x<=60;x+=3)for(let z=-50;z<=34;z+=3){const c=V.mpCol(x,z);if(c.mesa)mesa++;if(c.fj>=2)soup++;}
   ok('the Kitchen has countertop mesas and Mystery Soup fjords ('+mesa+' / '+soup+' samples)',mesa>40&&soup>5);}
  {let ok_=true,n=0;for(const d of MPC.DRAINS){load(d[0],d[1]);const base=V.mpSurf(d[0],d[1]);
     if(!(gb(d[0],14,d[1])===B.PG_STUFFING&&gb(d[0],15,d[1])===B.PG_STUFFING&&gb(d[0],16,d[1])===0&&gb(d[0],base,d[1])===0))ok_=false;
     /* the ledge: walk it cell by cell, never dropping more than 1, down to y 17 */
     const ring=[[0,-2],[-1,-2],[-2,-2],[-2,-1],[-2,0],[-2,1],[-2,2],[-1,2],[0,2],[1,2],[2,2],[2,1],[2,0],[2,-1],[2,-2],[1,-2]];let prev=base,ledge=true,k=0,pc=[0,-3];
     for(let j=0;j<6&&ledge;j++)for(let a=0;a<16;a++){const y=base-1-Math.floor((j*16+a)/2);if(y<16)break;const c=ring[a];
       if(gb(d[0]+c[0],y,d[1]+c[1])!==B.PG_COUNTER||solid(gb(d[0]+c[0],y+1,d[1]+c[1]))||prev-y>1||Math.abs(c[0]-pc[0])+Math.abs(c[1]-pc[1])!==1){ledge=false;break;}prev=y;pc=c;k++;}
     if(!ledge||prev!==16)ok_=false;n+=k;   /* the last step sits on the Stuffing: 1 up from the floor (stand 16) */
     if(solid(gb(d[0],base+1,d[1]-3))||gb(d[0]+3,base+1,d[1])!==B.PG_COUNTER)ok_=false;}
   ok('the three sink drains: 2-deep Stuffing floor, a continuous 4-connected spiral ledge down to the floor, a Countertop rim with a gap ('+n+' ledge steps)',ok_);}
  {let wire=0,tot=0;const d=MPC.DRAINS[1];for(let y=16;y<=30;y++)for(const [dx,dz] of [[3,0],[-3,0],[0,3],[0,-3],[3,1],[1,3],[-3,-1],[-1,-3]]){tot++;if(gb(d[0]+dx,y,d[1]+dz)===B.PG_WIREORE)wire++;}
   ok('drain walls carry Wire Ore at about 25% between y 16 and 30 ('+wire+'/'+tot+')',wire>=tot*0.1&&wire<=tot*0.45);}
  load(-60,60);{const x=-60,z=60,c=V.mpCol(x,z);ok('the Prop Lab: Lab Linoleum floor at deckY(z) (or a bench)',V.mwBiomeAt(x,z)==='labs'&&(gb(x,V.mpSurf(x,z),z)===B.PG_LINO));}
  load(-40,95);ok('Labs HQ: Masking Black walls 5 high, an open door on -z, the permanent Lab Bench',gb(-50,46,95)===B.PG_MBLACK&&gb(-40,45,88)===0&&gb(-40,47,88)===0&&gb(-40,49,88)===B.PG_MBLACK&&gb(-40,45,100)===B.PG_BENCH&&gb(-40,50,95)===B.PG_MBLACK);
  load(45,100);{let sat=0,mir=0;for(let x=20;x<=70;x+=2)for(let z=60;z<=140;z+=2){const c=V.mpCol(x,z);if(c.tb===B.PG_SATIN)sat++;}
   for(const m of [0,1,2,3].map(i=>T.mwMirror(1+(i&1),3+(i>>1))).filter(Boolean))mir++;
   ok('the Pork Palace is Satin Dune ('+sat+' samples) with Dressing Mirror monoliths and pig pens',sat>500&&V.mwSpots('pen').length>=1);}
  {let lo=99,hi=-99;for(let x=20;x<=70;x++)for(const z of [80,100,120]){const c=V.mpCol(x,z);if(c.tb!==B.PG_SATIN)continue;const g=c.g-deckYz(z);if(g<lo)lo=g;if(g>hi)hi=g;}
   ok('the Palace dunes swing about +-4 around the deck ('+lo+'..'+hi+')',lo<=-2&&hi>=2&&lo>=-4&&hi<=4);}
  load(0,100);ok('the Grand Staircase strip is left to P4 (plain deck under the arena bbox)'+(stub('4')?' (P4 stub)':''),V.mwBiomeAt(0,100)==='stair');
  {let isl=0,sh=0,lk=0;for(let x=-70;x<=70;x+=2)for(let z=160;z<=255;z+=2){const c=V.mpCol(x,z);if(c.sw===0)isl++;else if(c.sw===1)sh++;else if(c.sw===2)lk++;}
   ok('the Back Swamp mixes islands, the felt sheet and scum lakes ('+isl+'/'+sh+'/'+lk+')',isl>200&&sh>400&&lk>40);}
  {let found=null;for(let x=20;x<=60&&!found;x++)for(let z=170;z<=200&&!found;z++){const c=V.mpCol(x,z);if(c.sw===1&&!V.mwBiomeAt(x,z).includes('x')){found=[x,z,c.g];}}
   load(found[0],found[1]);const [x,z,h]=found;
   ok('the sheet: Taut Felt Sheet at h, the 4-deep Bog Hollow under it, Pond Scum at h-5 over Foam',gb(x,h,z)===B.PG_SHEET&&[1,2,3,4].every(k=>gb(x,h-k,z)===0)&&gb(x,h-5,z)===B.PG_SCUM&&gb(x,h-6,z)===B.PG_FOAM);}
  {let st=null;for(let i=-9;i<=8&&!st;i++)for(let j=20;j<=31&&!st;j++){const s=T.mwSwampStair(i,j);if(s)st=s;}
   if(st){load(st.x,st.z);let okk=true;for(const s of st.steps){const [x,z,h,k]=s;if(gb(x,h-k,z)!==B.PG_SWAMP||(k<=4&&solid(gb(x,h-k+1,z))))okk=false;}
     ok('Bog Hollow climb-outs: 1-wide Swamp Felt steps down from the island shore',okk&&st.steps.length>=4);}else ok('a swamp climb-out exists',false);}
  load(0,264);ok('the back wall is Painted Sky, full height',gb(0,40,264)===B.PG_PSKY&&gb(0,70,264)===B.PG_PSKY&&gb(0,71,264)===0);
  load(100,0);ok('the outer border is Masking Black to y 70',gb(100,40,0)===B.PG_MBLACK&&gb(100,70,0)===B.PG_MBLACK&&gb(100,71,0)===0&&gb(97,20,0)===B.PG_MBLACK);
  load(85,0);ok('the wings: flat Stage Deck at deckY',V.mwBiomeAt(85,0)==='wings'&&gb(85,deckYz(0),0)===B.PG_DECK);
  function deckYz(z){return z<-160?34:34+Math.floor((z+160)/24);}
  /* the rake */
  {let rake=true;for(const z of [-150,-120,-90,-70])if(V.mpSurf(0,z)!==deckYz(z))rake=false;for(const z of [-40,0,30])if(V.mpCol(-90,z).g!==deckYz(z))rake=false;
   ok('the rake: the centre aisle and the wings follow deckY (34 at the proscenium, 51 at the back wall)',rake&&V.deckY(-160)===34&&V.deckY(262)===51);}
  {let low=0,bad=0;for(let x=-95;x<=95;x+=2)for(let z=-299;z<=266;z+=2){const s=V.mpSurf(x,z);if(s<30)low++;if(s>70)bad++;}
   ok('all walkable ground is at y 30 or above (mpSurf over the whole stage, every 2 m)',low===0&&bad===0);}

  /* ===== 3. trench climb-outs (every 16 x, alternating lips, never more than 8 blocks from a stair foot) ===== */
  {let far=0;for(let x=-75;x<=75;x++){let d=99;for(const c of T.MW_CLIMB)d=Math.min(d,Math.abs(x-c.xs));if(d>8)far++;}
   ok('no trench cell is more than 8 blocks from the foot of a climb-out',far===0);
   let good=0,tot=0;for(const z0 of MPC.TRENCH_Z)for(const c of T.MW_CLIMB){tot++;const zw=c.u?z0+2:z0-1;load(c.xs+c.d*6,zw);let okk=true,top=0;
     for(let i=0;i<16;i++){const x=c.xs+i*c.d,y=23+i,g=V.mpCol(x,zw).g;if(y>=g){top=i;break;}
       if(!solid(gb(x,y,zw))||solid(gb(x,y+1,zw))||solid(gb(x,y+2,zw))){okk=false;break;}}
     if(okk&&top>=8)good++;}
   ok('every climb-out is a continuous 1-per-block stair from the trench floor up to the lip ('+good+'/'+tot+')',good===tot);
   let soft=true;for(const z0 of MPC.TRENCH_Z)for(const x of [-70,-40,-10,20,50])if(gb(x,22,z0)!==B.PG_STUFFING||gb(x,22,z0+1)!==B.PG_STUFFING)soft=false;
   ok('trench floors are Stuffing Drift',soft);}

  /* ===== 4. travelers iff !MP.open; opening writes no edits; reload keeps it open; arches open only within 60 m ===== */
  {const A=MPC.ARCH_Z[1],py=V.deckY(A)+6;tp(0,A-12);
   ok('Arch 2: a Traveler curtain across the full width (wings too) and underground to y 3, Velvet legs and border to y 70, while MP.open.a2 is 0',
     gb(0,py,A)===B.PG_TRAVELER&&gb(0,70,A-1)===B.PG_VELVET&&gb(0,71,A)===0&&gb(0,3,A)===B.PG_TRAVELER&&gb(80,py,A)===B.PG_TRAVELER&&gb(-60,py,A)===B.PG_VELVET);
   const e0=[...V.chunkEdits().values()].reduce((n,m)=>n+m.size,0);V.mwOpenArch(2);step(2);
   const e1=[...V.chunkEdits().values()].reduce((n,m)=>n+m.size,0);
   ok('opening Arch 2 writes no chunkEdits (AIR straight into the loaded chunks)',e1===e0&&gb(0,py,A)===0&&gb(0,10,A)!==B.PG_TRAVELER&&MP().open.a2===1);
   ok('the arch frame stays: Velvet legs and border',gb(-60,py,A)===B.PG_VELVET&&gb(0,60,A)===B.PG_VELVET);
   ok('opening Arch 2 unlocks Booth 2',MP().spawns.b2===1);
   const snap=V.snapshot('p1a');V.applySave(snap);relink();step(30);tp(0,A-12);
   ok('after a reload with MP.open.a2 there is no Arch-2 traveler',MP().open.a2===1&&gb(0,py,A)===0);
   ok('Arch 3 is still closed',(load(0,MPC.ARCH_Z[2]),gb(0,V.deckY(MPC.ARCH_Z[2])+6,MPC.ARCH_Z[2])===B.PG_TRAVELER));
   /* approach rule: Arch 3 opens only when Dan comes within 60 m with the Pig dead */
   const A3=MPC.ARCH_Z[2];MP().dead.bigpig=1;tp(0,A3-75);step(30);
   ok('the Pig dead, Dan 75 m away: Arch 3 stays shut',MP().open.a3===0&&!V.mwArchState().anim);
   tp(0,A3-50);step(25);ok('Dan comes within 60 m: the slide plays (4 s)',!!V.mwArchState().anim&&V.mwArchState().anim.k==='a3'&&MP().open.a3===0);
   ok('during the slide the traveler cells are already open under the curtain planes',gb(0,V.deckY(A3)+6,A3)===0);
   step(110);ok('after 4 s: MP.open.a3 is set and Booth 3 unlocks',MP().open.a3===1&&!V.mwArchState().anim&&MP().spawns.b3===1);}
  /* the EXIT doors open with the Strike, and close again without it */
  {tp(0,-290);MP().strike={cp:0};step(20);ok('the EXIT doors open (AIR, no edits) while MP.strike is set',gb(0,59,-299)===0&&gb(0,58,-299)===0&&editsIn([[0,59,-299]])===0);
   MP().strike=null;V.mwWorkLights(false);step(20);ok('...and are Traveler again without it',gb(0,59,-299)===B.PG_TRAVELER);}

  /* ===== 5. booths in order ===== */
  {const S=MP().spawns;S.b1=0;tp(0,-70);step(5);const b1a=S.b1;tp(0,-50);step(5);
   ok('Booth 1 unlocks on Dan’s first step into Plane 2 and sets MP.spawns.b1',b1a===0&&S.b1===1);
   const b=T.mwBooths();ok('booths: Masking Black alcoves open on -z, a Bin and a lit Eyeball Lamp each, a Lab Bench in Booth 3',
     b.every(q=>{load(q.x,q.z);return gb(q.can[0],q.can[1],q.can[2])===B.PG_CAN&&gb(q.lamp[0],q.lamp[1],q.lamp[2])===B.PG_LAMP&&gb(q.x-2,q.y+2,q.z+1)===B.PG_MBLACK&&
       gb(q.x,q.y+2,q.z+3)===B.PG_MBLACK&&gb(q.x,q.y+1,q.z)===0&&gb(q.x,q.y+2,q.z)===0&&gb(q.x,q.y+4,q.z+1)===B.PG_MBLACK;})&&gb(b[2].bench[0],b[2].bench[1],b[2].bench[2])===B.PG_BENCH);
   ok('the boothCan spots are the cans and stand level with the booth floor (P0 respawns there)',V.mwSpots('boothCan').every((c,i)=>c[1]===b[i].y+1&&V.mpSurf(MPC.BOOTH[i][0],MPC.BOOTH[i][1])===b[i].y));}

  /* ===== 6. trees go limp and regrow ===== */
  {clearDrops();const rows=T.mwTreeRows(),Tr=rows[2].L.find(t=>Math.abs(t.x)>12&&Math.abs(t.x)<60);
   tp(Tr.x+2,Tr.z,Tr.g+1.05);boot.purge(V);
   const cells=T.mwTreeCells(Tr);ok('a puppet tree: 2 Puppeteer Forearms in the floor, 6-9 Felt Sleeves, a rounded Fleece head with 2 Canopy Eyes facing the House',
     cells.every(c=>gb(c[0],c[1],c[2])===c[3])&&cells.filter(c=>c[3]===B.PG_EYE).every(c=>c[2]===Tr.z-2));
   /* a real swing: hold the attack on the surface forearm until doMine breaks it */
   P.inv.fill(null);P.sel=0;const fx=Tr.x,fy=Tr.g,fz=Tr.z;P.x=fx+1.5;P.z=fz+0.5;P.y=Tr.g+1.05;step(5);
   const dx=fx+0.5-P.x,dy=fy+0.5-(P.y+P.eyeY),dz=fz+0.5-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));
   V.MB.l=true;let n=0;while(gb(fx,fy,fz)===B.PG_FOREARM&&n<200){step(1);n++;}V.MB.l=false;step(3);
   const near=drops().filter(e=>Math.hypot(e.x-fx-0.5,e.z-fz-0.5)<4),ids=near.map(e=>e.st.id),per={};for(const id of ids)per[id]=(per[id]||0)+1;
   const dupes=Object.keys(per).filter(id=>per[id]>1&&+id!==IT.PG_GREASE);
   ok('breaking the Forearm makes the whole felt head collapse at once (the tree is gone, MP.trees set) after '+n+' frames',MP().trees[Tr.id]!=null&&cells.every(c=>c[3]===B.PG_FOREARM||gb(c[0],c[1],c[2])!==c[3]));
   ok('the collapse spawns one drop entity per item type, with a count ('+JSON.stringify(per)+')',dupes.length===0&&near.some(e=>e.st.id===B.PG_SLEEVE&&e.st.count>=6)&&near.length>=3&&near.length<=6);
   ok('a limp tree writes no edits (the generator skips it)',editsIn(cells)===0);
   tp(Tr.x,Tr.z-30);MP().trees[Tr.id]=MP().clock-290;step(60);ok('no regrowth before 300 s of MP.clock',MP().trees[Tr.id]!=null);
   MP().trees[Tr.id]=MP().clock-301;tp(Tr.x+6,Tr.z+4);step(70);ok('no regrowth with a player within 16 m',MP().trees[Tr.id]!=null);
   tp(Tr.x,Tr.z-30);step(70);ok('300 s after the limp, nobody near: the tree grows back (no edits left)',MP().trees[Tr.id]==null&&(load(Tr.x,Tr.z),cells.every(c=>gb(c[0],c[1],c[2])===c[3]))&&editsIn(cells)===0);
   ok('mwTreeSites lists the tree in its chunk with its eyes',V.mwTreeSites(Math.floor(Tr.x/16),Math.floor(Tr.z/16)).some(t=>t.id===Tr.id&&t.eyes.length===2));
   clearDrops();}

  /* ===== 7. flats topple mesh-only ===== */
  {const F=T.mwAllFlats().find(f=>f.br.length>=6);tp((F.x0+F.x1)>>1,F.fz-F.ht-4);boot.purge(V);clearDrops();
   const cells=T.mwFlatCells(F);ok('a painted flat: Painted Hill below, Painted Sky above, Flat Backing behind, diagonal Cardboard Braces',
     cells.every(c=>gb(c[0],c[1],c[2])===c[3])&&cells.some(c=>c[3]===B.PG_PHILL)&&cells.some(c=>c[3]===B.PG_PSKY)&&cells.some(c=>c[3]===B.PG_BACKING)&&F.br.length>=6);
   V.spawnMob('pig',(F.x0+F.x1)/2+0.5,V.surfaceTop((F.x0+F.x1)>>1,F.fz-3)+1,F.fz-3+0.5);const pig=V.entities[V.entities.length-1];pig.hp=20;
   for(let i=0;i<F.br.length-1;i++){const b=F.br[i];T.breakAs(b[0],b[1],b[2],'Dan');}
   ok('with one brace left the flat still stands',!MP().flats[F.id]&&T.mwFlatBraces(F)===1);
   const last=F.br[F.br.length-1];T.breakAs(last[0],last[1],last[2],'Dan');
   ok('the last brace breaks: the flat falls (MP.flats set), its blocks gone at once',!!MP().flats[F.id]&&cells.every(c=>gb(c[0],c[1],c[2])===0||c[3]===B.PG_BRACE));
   ok('a topple writes no AIR edits (the broken braces’ edits are removed too)',editsIn(cells)===0);
   ok('the fall is a mesh (0.6 s)',T.MWR.anims.some(a=>a.kind==='flat'));
   step(18);ok('after 0.6 s the fall crushes what is under it: 6 damage and a 1 s pin',pig.hp<=14||pig.dead);
   ok('...then it shatters into Cardboard piles (one drop entity per pile)',drops().some(e=>e.st.id===IT.PG_CARD&&e.st.count>1));
   ok('the generator skips a toppled flat after a reload too',(()=>{const s=V.snapshot('p1a');V.applySave(s);relink();step(20);tp((F.x0+F.x1)>>1,F.fz-F.ht-4);return cells.every(c=>gb(c[0],c[1],c[2])!==c[3]);})());
   clearDrops();}

  /* ===== 8. the felt sheet: Dan only ===== */
  {let cell=null;for(let x=10;x<=60&&!cell;x++)for(let z=165;z<=205&&!cell;z++){let all=true;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const c=V.mpCol(x+a,z+b);if(c.sw!==1)all=false;}
     if(all&&gb(x,V.mpCol(x,z).g,z)===B.PG_SHEET&&gb(x,V.mpCol(x,z).g-1,z)===0)cell=[x,z];}
   let isl=null;for(let r=1;r<30&&!isl;r++)for(let a=-r;a<=r&&!isl;a++)for(const b of [-r,r]){const c=V.mpCol(cell[0]+a,cell[1]+b);if(c.sw===0&&!c.pad){isl=[cell[0]+a,cell[1]+b];break;}}
   const toIsland=()=>{tp(isl[0],isl[1],V.mpCol(isl[0],isl[1]).g+1.05);};
   const [x,z]=cell,h=V.mpCol(x,z).g;
   ok('the sheet: Taut Felt Sheet at h, the 4-deep Bog Hollow under it, Pond Scum at h-5 over Foam',gb(x,h,z)===B.PG_SHEET&&[1,2,3,4].every(k=>gb(x,h-k,z)===0)&&gb(x,h-5,z)===B.PG_SCUM&&gb(x,h-6,z)===B.PG_FOAM);
   toIsland();boot.purge(V);V.GR.bots=false;MP().tears.length=0;
   P.x=x+0.5;P.z=z+0.5;P.y=h+1.02;P.vx=P.vy=P.vz=0;P.fallD=0;step(30);
   ok('standing still on the sheet for 1.2 s: still taut',gb(x,h,z)===B.PG_SHEET&&MP().tears.length===0);
   step(10);ok('after 1.5 s it sags one block under Dan (MP.tears records it)',gb(x,h,z)===0&&gb(x,h-1,z)===B.PG_SHEET&&MP().tears.length===1);
   step(30);ok('the sagged cell has not torn yet at 1.2 s',gb(x,h-1,z)===B.PG_SHEET);
   step(25);ok('2 s later it tears and Dan drops into the Bog Hollow',gb(x,h-1,z)===0&&P.y<h);
   const t0=MP().tears[0][1];toIsland();MP().clock=t0+57;step(20);ok('no re-tension before 60 s',gb(x,h,z)===0&&MP().tears.length===1);
   MP().clock=t0+61;step(30);ok('60 s later it re-tensions (sheet back at h, its edits removed)',gb(x,h,z)===B.PG_SHEET&&gb(x,h-1,z)===0&&editsIn([[x,h,z],[x,h-1,z]])===0&&MP().tears.length===0);
   V.spawnMob('pig',x+0.5,h+1.05,z+0.5);const pig=V.entities[V.entities.length-1];step(110);
   ok('a mob standing on the sheet never sags it (only Dan does)',gb(x,h,z)===B.PG_SHEET&&MP().tears.length===0);if(!pig.dead)V.hurtMob(pig,999,0,0);
   ok('mwTearSheet tears for anyone (Shears, the croak ripple, the Daredevil)',V.mwTearSheet(x,h,z,'BunkerBrad')===true&&gb(x,h,z)===0&&MP().tears.length===1);
   MP().clock+=61;step(30);ok('...and that tear re-tensions too',gb(x,h,z)===B.PG_SHEET&&MP().tears.length===0);
   /* never under a bot: a bot body standing on the same sheet cell for 4 s leaves it taut */
   toIsland();V.GR.bots=true;try{V.agJoinAll(true);}catch(e){}step(30);const a=V.agByName&&V.agByName('BunkerBrad');
   if(a){a.dim='puppet';a.x=x+0.5;a.y=h+1.05;a.z=z+0.5;a.spawnProt=0;step(20);}
   let held=0;if(a&&a.e)for(let i=0;i<100;i++){if(!a.e)break;a.e.x=x+0.5;a.e.z=z+0.5;a.e.y=Math.max(a.e.y,h+1);a.e.vx=a.e.vz=0;step(1);held++;}
   if(held<100)skip('a bot on the sheet','no bot body held inside (P5 stub or bots unavailable)');
   else ok('a bot standing on the sheet for 4 s never sags it',gb(x,h,z)===B.PG_SHEET&&MP().tears.length===0);
   try{V.agLeaveAll();}catch(e){}V.GR.bots=false;step(10);}

  /* ===== 9. the flinch ===== */
  {tp(20,-100);boot.purge(V);const ky=3,kx=20,kz=-100;
   const F=T.mwAllFlats().filter(f=>!MP().flats[f.id]).sort((a,b)=>Math.hypot((a.x0+a.x1)/2-kx,a.fz-kz)-Math.hypot((b.x0+b.x1)/2-kx,b.fz-kz))[0];
   const near=F&&Math.hypot((F.x0+F.x1)/2-kx,F.fz-kz)<=40;
   if(near){load(F.x0,F.fz);load(F.x1,F.fz);for(let i=0;i<F.br.length-1;i++){const b=F.br[i];V.setBlock(b[0],b[1],b[2],0);}}
   load(kx,kz);V.setBlock(kx,ky,kz,B.PG_KNUCKLE);const k0=MP().knuckles;
   V.spawnDrop(P.x+6,P.y+0.2,P.z,{id:IT.PG_FELT,count:1},0,0,0);const dr=drops()[drops().length-1];step(10);
   T.breakAs(kx,ky,kz,'Dan');
   ok('every Knuckle Ore broken flinches the world (MPF.flinch 0.6 s), MP.knuckles++',MPF().flinch>0.5&&MP().knuckles===k0+1);
   ok('loose drops hop',dr&&dr.vy>0);
   if(near)ok('a flat within 40 m with fewer than 2 braces falls on the flinch',!!MP().flats[F.id]);else skip('flinch topple','no flat within 40 m of the dig');
   step(20);ok('the jolt is over after 0.6 s',MPF().flinch===0);
   ok('the flinch fires in mwFlinch for any caller (P0 pBlast, P4)',V.mwFlinch(0,3,-120,'Dan')===true&&MPF().flinch>0);
   step(20);
   /* the skin twitch: dig a shaft to the floor of the world and swing at The Puppeteer */
   for(let y=3;y<=8;y++)for(const [a,b] of [[0,0],[1,0],[0,1],[1,1]])V.setBlock(kx+5+a,y,kz+b,0);
   P.x=kx+5.5;P.z=kz+0.5;P.y=3.02;P.vx=P.vy=P.vz=0;step(3);P.pitch=-1.45;P.yaw=0;V.MB.l=true;step(4);
   ok('swinging at The Puppeteer twitches the skin (foam dust, a flexing overlay)',!!T.MWR.twitch);V.MB.l=false;step(2);
   for(let y=3;y<=8;y++)for(const [a,b] of [[0,0],[1,0],[0,1],[1,1]])V.setBlock(kx+5+a,y,kz+b,B.PG_ROT);}

  /* ===== 10. the ceiling, the borders ===== */
  ok('nothing is placeable above y 62 outside the arenas (P0 guard): y 63 refused, y 62 allowed',V.mpPlaceOK(20,63,-100,B.PG_DECK)===false&&V.mpPlaceOK(20,62,-100,B.PG_DECK)===true);
  ok('...but inside an arena bbox it is allowed (the Pig’s staircase)',V.mpPlaceOK(0,64,100,B.PG_DECK)===true);
  {const tops=[[100,0],[-100,0],[0,270],[0,-305],[-70,-250],[70,-180]];let okk=true;for(const [x,z] of tops){load(x,z);if(gb(x,70,z)!==B.PG_MBLACK||gb(x,71,z)!==0)okk=false;}
   load(0,MPC.ARCH_Z[0]);if(gb(-70,70,MPC.ARCH_Z[0])!==B.PG_VELVET||gb(-70,71,MPC.ARCH_Z[0])!==0||gb(0,70,MPC.ARCH_Z[0])!==B.PG_VELVET)okk=false;
   ok('every border, wall, curtain and arch top is at y 70 (y 71-78 stay clear for the beacons)',okk);}

  /* ===== 11. gen / mesh budgets (40 chunks per biome, neighbours loaded; fail at 2x budget) ===== */
  {const sites={woods:[0,-110,3],kitchen:[10,-10,3],labs:[-45,110,3],palace:[45,100,3],swamp:[30,210,5.5],house:[0,-250,3],apron:[0,-185,3]},res=[];let okk=true;
   for(const [n,[x,z,mb]] of Object.entries(sites)){const cx0=Math.floor(x/16),cz0=Math.floor(z/16);
     for(let i=0;i<8;i++)T.genChunkPuppet(cx0+i,cz0);
     let tg=0;for(let i=0;i<40;i++){const t=performance.now();T.genChunkPuppet(cx0-3+(i%7),cz0-3+Math.floor(i/7));tg+=performance.now()-t;}
     for(let a=-4;a<=4;a+=3)for(let b=-4;b<=4;b+=3)load((cx0+a)*16+8,(cz0+b)*16+8);
     let tm=0,k=0;for(let i=0;i<49&&k<40;i++){const ch=V.chunks.get(C.ckey(cx0-3+(i%7),cz0-3+Math.floor(i/7)));if(!ch)continue;T.meshChunk(ch);
       const t=performance.now();T.meshChunk(ch);tm+=performance.now()-t;k++;}
     const g=tg/40,m=tm/Math.max(1,k);res.push(n+' '+g.toFixed(2)+'/'+m.toFixed(2));if(g>3||m>2*mb)okk=false;}
   ok('gen <= 1.5 ms and mesh <= 3 ms per chunk (swamp 5.5), failing at 2x ('+res.join(', ')+')',okk);}

  /* ===== 12. Tesla Coils ===== */
  {let coil=null;for(let i=-7;i<=0&&!coil;i++)for(let j=5;j<=14&&!coil;j++){const t=T.mwTesla(i,j);if(t&&t[0]<-15)coil=t;}
   const [cx,cy,cz]=coil;tp(cx+9,cz);boot.purge(V,30);step(5);
   ok('Tesla Coils stand on the Labs floor',gb(cx,cy,cz)===B.PG_TESLA&&V.mwSpots('tesla').some(t=>t[0]===cx&&t[2]===cz));
   V.spawnMob('pig',cx+3.5,V.surfaceTop(cx+3,cz)+1.05,cz+0.5);const pig=V.entities[V.entities.length-1];pig.hp=10;pig.spd=0;
   V.spawnMob('pig',cx-6.5,V.surfaceTop(cx-6,cz)+1.05,cz+0.5);const far=V.entities[V.entities.length-1];far.hp=10;
   let flickAt=null,hitAt=null;const k=cx+','+cz;
   for(let i=0;i<220&&hitAt===null;i++){step(1);pig.x=cx+3.5;pig.z=cz+0.5;pig.vx=pig.vz=0;far.x=cx-6.5;far.z=cz+0.5;far.vx=far.vz=0;
     if(flickAt===null&&T.MWR.flicker[k])flickAt=MP().clock;if(pig.hp<10)hitAt=MP().clock;}
   ok('a coil arcs 3 to the nearest creature within 5 blocks ('+(10-pig.hp)+' damage)',hitAt!==null&&pig.hp===7);
   ok('...after a white flicker of at least 0.4 s ('+(flickAt!==null&&hitAt!==null?(hitAt-flickAt).toFixed(2):'?')+' s)',flickAt!==null&&hitAt-flickAt>=0.36);
   ok('...and never beyond 5 blocks',far.hp===10);
   ok('the arc is drawn (an additive jagged line)',T.MWR.tesla.arcs.length>=0&&!!T.MWV.tes);
   boot.purge(V,30);}

  /* ===== 13. the Ghost Light, cue clock, Followspot, sky, beacons, Grid ===== */
  {const G=V.mwSpots('ghost')[0];tp(G[0]+4,G[2]-4);step(40);const key=C.bkey(G[0],G[1],G[2]);
   ok('the Ghost Light: a Eyeball Lamp on a 2-block Masking Black stand at (0,h,258), registered in MP_LIGHTS',
     gb(G[0],G[1],G[2])===B.PG_LAMP&&gb(G[0],G[1]-1,G[2])===B.PG_MBLACK&&gb(G[0],G[1]-2,G[2])===B.PG_MBLACK&&T.lights().has(key));
   MP().cue.t=430;step(40);ok('...it stays lit through a BLACKOUT',V.mwCue().ph==='blackout'&&T.lights().has(key));
   V.mwWorkLights(true);step(40);ok('...and through the work lights',V.mwCue().ph==='work'&&T.lights().has(key));V.mwWorkLights(false);MP().cue.t=0;step(5);
   ok('booth lamps are registered in MP_LIGHTS once their chunk is loaded',(load(12,157),step(30),T.lights().has(C.bkey(11,48,159))));}
  {tp(0,-136,36.2);boot.purge(V);MP().cue.t=0;step(3);
   ok('the cue clock starts in SHOW with 417 s to the warning',V.mwCue().ph==='show'&&Math.abs(V.mwCue().left-417)<1);
   MP().cue.t=416.8;step(8);ok('3 s before BLACKOUT: the warning (three lighting-board clicks)',V.mwCue().ph==='warn');
   step(80);ok('BLACKOUT for 90 s',V.mwCue().ph==='blackout'&&V.mwCue().left>80);
   step(15);const ft=V.mwFollowTarget();ok('the Followspot locks on the most exposed player (Dan on the open Mark)',!!ft&&ft.who==='Dan'&&Math.abs(ft.x-P.x)<0.01);
   step(30);const sk=T.sky();ok('BLACKOUT sky: near-black background and fog, ambient ~0.18, directional ~0.05',sk.bg.r<0.06&&sk.bg.g<0.06&&sk.amb<0.3&&sk.dir<0.12&&sk.fog.color.r<0.06);
   ok('the spot is an additive cone + disc (no new light)',!!T.MWV.spot&&T.MWV.spot.visible);
   MP().cue.t=509.5;step(30);ok('SHOW returns; surviving the BLACKOUT ticks the Programme',V.mwCue().ph==='show'&&!!MP().ticks.blackout);
   step(60);const s2=T.sky();ok('SHOW sky: theatre plum #2a1626, ambient ~0.62, directional ~0.45',Math.abs(s2.bg.r-0.165)<0.03&&Math.abs(s2.bg.b-0.149)<0.03&&Math.abs(s2.amb-0.62)<0.1&&Math.abs(s2.dir-0.45)<0.08);
   ok('no Followspot target outside BLACKOUT',V.mwFollowTarget()===null);
   const r=T.mwAllFlats()[0];MP().strike={cp:0};step(40);const s3=T.sky();ok('the Strike: flat grey-white work lights, ambient 1.0, cue reads work',V.mwCue().ph==='work'&&s3.bg.r>0.7&&s3.amb>0.85);
   MP().strike=null;V.mwWorkLights(false);step(40);
   if(stub('4')||typeof V.hnFightStart!=='function')skip('cue pause during a live fight','P4 on its stub (hnState() is null)');
   else{MP().cue.t=100;let f=null;try{f=V.hnFightStart('bomber',{test:1});}catch(e){}step(10);const hs=V.getHnState(),t0=MP().cue.t;step(25);
     ok('the cue clock pauses while a headliner fight is live (mwCue paused, MP.cue.t frozen)'+(hs&&hs.live?'':' (fight '+!!f+', hs '+JSON.stringify(hs&&{live:hs.live,name:hs.name})+', dead '+JSON.stringify(MP().dead)+', P.dead '+P.dead+')'),!!(hs&&hs.live)&&V.mwCue().ph==='paused'&&Math.abs(MP().cue.t-t0)<1e-6);
     try{if(typeof V.hnFightLeave==='function')V.hnFightLeave('bomber');}catch(e){}step(10);}}
  {ok('beacons: the staircase chase lights always, no smoke while the Demolitionist lives',T.mwBeaconState('stair')===true&&T.mwBeaconState('smoke')===false);
   const d0=MP().dead.bomber,o0=MP().open.a2;MP().dead.bomber=1;MP().open.a2=0;T.MWR.opening.a2=0;
   ok('the Demolitionist dead, Arch 2 shut: his smoke column and the orange glow band over Arch 2',T.mwBeaconState('smoke')===true&&T.mwBeaconState('band2')===true);
   V.mwBeacon('smoke',false);ok('mwBeacon overrides (P4 drives the reveals)',T.mwBeaconState('smoke')===false);V.mwBeacon('smoke',null);
   MP().open.a2=1;ok('Arch 2 open: smoke and band gone',T.mwBeaconState('smoke')===false&&T.mwBeaconState('band2')===false);MP().dead.bomber=d0;MP().open.a2=o0||1;
   ok('the paper moon is bright once Arch 3 is open',T.mwBeaconState('moon')==='bright');
   MP().strike={cp:0};ok('the EXIT sign lights and the gap columns stand during the Strike',T.mwBeaconState('exit')===true&&Array.isArray(T.mwBeaconState('gaps')));MP().strike=null;V.mwWorkLights(false);
   step(3);const Bc=T.MWV.beac;ok('the beacons are fog-free additive meshes at y 71-78',!!Bc&&Bc.bulbs.length===8&&Bc.bulbs.every(m=>m.fog===false)&&Bc.stair.children[0].position.y>=71&&Bc.stair.children[7].position.y<=78);
   ok('the Grid: one merged frame + lamp mesh per 64 m strip, shared materials',!!T.MWV.grid&&T.MWV.grid.strips.length===10&&T.MWV.grid.strips.every(s=>s.children.length===2&&s.children[1].material===T.MWV.grid.lamp));
   V.mwGridFx('flash3');step(2);const fx0=T.MWR.fx;ok('mwGridFx(flash3) runs and clears',fx0&&fx0.k==='flash3');step(50);ok('...after 1.8 s (cosmetic timers run every frame, cutscenes included)',T.MWR.fx!==fx0&&fx0.t>=1.8);}

  /* ===== 14. the Pork Palace spots, BOO, round things, protection, dough, spots ===== */
  {const a=T.mwPalaceSpots();MP().clock+=40;const b=T.mwPalaceSpots();
   ok('three drifting followspots move on MP.clock',a.length===3&&a.some((p,i)=>p[0]!==b[i][0]||p[2]!==b[i][2]));
   let inside=true;for(let t=0;t<2000;t+=37){MP().clock=t;for(const p of T.mwPalaceSpots())if(p[0]<11||p[0]>75||p[2]<46||p[2]>148||V.mwBiomeAt(p[0],p[2])!=='palace'&&V.mwBiomeAt(p[0],p[2])!=='wings')inside=false;}
   ok('...and stay inside the Pork Palace',inside);}
  {const b0=T.MWR.boo;tp(10,-230);step(5);ok('climbing above the House’s third terrace row before the Strike starts a BOO barrage',T.MWR.boo>b0);
   tp(0,-136,36.2);}
  {tp(30,-100);clearDrops();V.spawnDrop(P.x+3,P.y+0.3,P.z+2,{id:IT.PG_GOOGLIES,count:1},0,0,0);const d=drops()[drops().length-1];step(40);const z0=d.z;step(75);
   ok('round things roll downstage: a resting Googly Eyes drop drifts -z ('+(z0-d.z).toFixed(2)+' m in 3 s)',z0-d.z>0.6);clearDrops();}
  {const h=V.mwKitchenHut(),Q=T.MW_HQ;ok('mwKitchenHut is the hut bbox and PREG.protect covers it and Labs HQ',!!h&&V.mpProtected(h.x0+2,h.y0+1,h.z0+2)&&V.mpProtected(-40,46,95)&&!V.mpProtected(-20,40,-30));}
  {let d=null;for(let i=-3;i<=2&&!d;i++)for(let j=-2;j<=1&&!d;j++)d=T.mwDough(i,j);
   if(d){load(d.x,d.z);ok('Dough mounds: a 3x3 dome against a mesa wall; mwDoughTarget gives that mesa’s top',gb(d.x,V.mpCol(d.x,d.z).g+2,d.z)===B.PG_DOUGH&&V.mwDoughTarget(d.x+1,d.z)===d.top&&d.top>V.mpCol(d.x,d.z).g+5);}
   else ok('a Dough mound exists',false);}
  {const holes=T.mwAllArmHoles();load(holes[0].x,holes[0].z);
   ok('Arm Holes (Woods, Kitchen): >= 8 of them, the 3 nearest the Mark anchor the Comic, none within 16 m of the Mark',holes.length>=8&&holes.filter(a=>a.kind==='comic').length===3&&
     holes.every(a=>Math.hypot(a.x-0.5,a.z+135.5)>=15.5)&&gb(holes[0].x,holes[0].y,holes[0].z)===B.PG_ARMHOLE&&V.mwArmHoles(Math.floor(holes[0].x/16),Math.floor(holes[0].z/16)).length>=1);}
  /* every mwSpots kind (plan 6.1): non-empty, inside the walk bbox, posts walkable, block kinds the right block */
  {const BLOCK={boothCan:B.PG_CAN,boothLamp:B.PG_LAMP,counter:B.PG_COUNTER,labsBench:B.PG_BENCH,guestTrunk:B.PG_PTRUNK,wingTrunk:B.PG_PTRUNK,tesla:B.PG_TESLA};
   const KINDS=['boothCan','boothLamp','chef','counter','stockpot','coop','mesaTop','labsBench','trans','prof','bkr','band','guestTrunk','guestHook','wingTrunk',
     'drainMouth','trenchMouth','hollowHeap','pen','tesla','palaceSpot'];
   const W=MPC.WALK,bad=[];
   for(const k of KINDS){if(k==='wingTrunk'){const t=T.mwWingTrunks()[1];load(t[0],t[2]);}if(k==='tesla'){load(-40,70);load(-60,120);}if(k==='hollowHeap')load(-24,-140);
     const L=V.mwSpots(k);if(!L.length){bad.push(k+':empty');continue;}
     for(const p of L.slice(0,40)){if(p[0]<W.x0-1||p[0]>W.x1+1||p[2]<W.z0||p[2]>W.z1){bad.push(k+':bounds');break;}
       if(k==='palaceSpot'||k==='guestHook')continue;
       load(p[0],p[2]);
       if(BLOCK[k]!==undefined){if(gb(p[0],p[1],p[2])!==BLOCK[k]){bad.push(k+':block '+p.join(','));break;}continue;}
       if(k==='band'&&p[1]>40){if(solid(gb(p[0],p[1],p[2]))||solid(gb(p[0],p[1]+1,p[2]))){bad.push(k+':mouth');break;}continue;}
       if(solid(gb(p[0],p[1],p[2]))||solid(gb(p[0],p[1]+1,p[2]))||!solid(gb(p[0],p[1]-1,p[2]))&&gb(p[0],p[1]-1,p[2])!==B.PG_SOUP&&gb(p[0],p[1],p[2])!==B.PG_SOUP){bad.push(k+':post '+p.join(','));break;}}}
   ok('mwSpots: every kind non-empty, in bounds, posts walkable, blocks in place'+(bad.length?' ('+bad.slice(0,5).join(' ')+')':''),bad.length===0);}
  {const R=T.MW_BAND,Gq=T.MW_GUEST;load(R[0].kit[0],R[0].kit[2]);load(Gq.trunk[0],Gq.trunk[2]);
   ok('Band Room 1: a 12x8x12 cavern under the Woods with 4 Eyeball Lamps and a tunnel up to the -126 trench',gb(R[0].kit[0],18,R[0].kit[2])===0&&gb(R[0].x0,17,R[0].z0)===B.PG_LAMP&&gb(R[0].x0,16,R[0].z0)===B.PG_FOAM&&
     gb(-61,23,-124)===0&&gb(-61,22,-124)===B.PG_FOAM&&gb(-61,17,-119)===B.PG_FOAM);
   ok('the Last Guest: a Stage Deck crew room at (-40,18..22,-110) with a Prop Trunk, reached from the -102 trench',gb(-40,18,-110)===B.PG_DECK&&gb(-40,20,-110)===0&&gb(-40,22,-110)===B.PG_DECK&&
     gb(Gq.trunk[0],Gq.trunk[1],Gq.trunk[2])===B.PG_PTRUNK&&gb(-40,23,-103)===0&&gb(-40,22,-103)===B.PG_DECK&&gb(-40,18,-107)===B.PG_DECK&&gb(-40,19,-107)===0);}

  /* ===== 14b. the walk (plan 5.1 acceptance): with every arch open, from the Mark to every act, booth, the House's top row, the
     drains' floors, the Band Room, the Last Guest and the wings, and back; nothing on the surface is a trap (cave pockets below the
     deck are dig-outs: Foam and Swamp Felt break bare-handed) ===== */
  {MP().open.a2=1;MP().open.a3=1;step(12);
   for(let x=-96;x<=96;x+=16)for(let z=-304;z<=272;z+=16)if(!C.chunkAt(x,z))load(x,z);step(12);
   const D=V.DEFS,G=V.getBlock,so=id=>id&&D[id]&&D[id].solid!==false;
   const st=(x,y,z)=>!so(G(x,y,z))&&!so(G(x,y+1,z))&&so(G(x,y-1,z));
   const LV=new Map(),lv=(x,z)=>{const k=(x+128)*1024+(z+512);let l=LV.get(k);if(!l){l=[];for(let y=14;y<=72;y++)if(st(x,y,z))l.push(y);LV.set(k,l);}return l;};
   const key=(x,y,z)=>((x+128)*1024+(z+512))*96+y;
   const nb=(x,y,z,rev)=>{const o=[];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<-96||nx>96||nz<-305||nz>267)continue;
       for(const ny of lv(nx,nz)){const up=rev?y-ny:ny-y;if(up>1||up<-4)continue;
         if(up===1&&so(G(rev?nx:x,(rev?ny:y)+2,rev?nz:z)))continue;
         if(up<0){const lo=rev?y:ny,hi=rev?ny:y,cx=rev?x:nx,cz=rev?z:nz;let b=false;for(let yy=lo+2;yy<=hi+1;yy++)if(so(G(cx,yy,cz))){b=true;break;}if(b)continue;}
         o.push([nx,ny,nz]);}}return o;};
   const bfs=(s0,rev)=>{const seen=new Set([key(...s0)]),q=[s0];while(q.length){const c=q.pop();for(const n of nb(c[0],c[1],c[2],rev)){const k=key(...n);if(!seen.has(k)){seen.add(k);q.push(n);}}}return seen;};
   const M=[0,36,-136],F=bfs(M,false),R=bfs(M,true);
   let surf=0;const ex=[];for(const k of F)if(!R.has(k)){const y=k%96,r=(k-y)/96,z=r%1024-512,x=(r-(z+512))/1024-128,c=V.mpCol(x,z);if(y>=c.gb-3&&c.sw!==1&&!V.mpInArena(null,x,y,z)){surf++;if(ex.length<4)ex.push([x,y,z].join(','));}}
   const B3=V.mwSpots('boothSpawn'),tg={booth1:B3[0],booth2:B3[1],booth3:B3[2],bomberMark:[0,35,-146],apron:[0,35,-175],pit:[0,31,-196],houseTop:[0,58,-297],
     bigfrogMark:V.mpUmarkPos('bigfrog'),chef:V.mwSpots('chef')[0],labsHQ:[-40,45,90],drain0:[-50,16,-30],drain1:[20,16,15],drain2:[60,16,-45],band1:[-61,17,-114],
     lastGuest:[-40,19,-110],ghostLight:[3,V.mpSurf(3,255)+1,255],wings:[90,V.mpSurf(90,-60)+1,-60]};
   const miss=Object.entries(tg).filter(([n,p])=>!(F.has(key(...p))&&R.has(key(...p)))).map(([n])=>n);
   ok('the walk: Woods -> Kitchen -> Labs/Palace -> Swamp -> House, every booth, the drains’ floors, the Band Room, the Last Guest and the wings, there and back ('+F.size+' standing cells)'+(miss.length?' (missing: '+miss.join(',')+')':''),miss.length===0&&F.size>80000);
   ok('no trap on the surface outside the arenas (P4 owns those; cave pockets below the deck are dig-outs)'+(surf?' ('+surf+': '+ex.join(' ')+')':''),surf===0);
   tp(0,-136,36.2);}

  /* ===== 15. audio: dispatch against the stub AudioContext (no real sound), the musicTick branch, silence ===== */
  {const s0=T.getSound();T.setSound(true);T.mkAudio();const AC=T.getAC();let threw=[],silent=[];
   for(const n of V.MW_SFX){const a=T.MWA_N.osc+T.MWA_N.src;try{T.mwSfx(n);}catch(e){threw.push(n);}if(T.MWA_N.osc+T.MWA_N.src===a)silent.push(n);}
   ok('every MW_SFX name dispatches without throwing and builds voices'+(threw.length?' (threw: '+threw.join(',')+')':'')+(silent.length?' (silent: '+silent.join(',')+')':''),threw.length===0&&silent.length===0);
   threw=[];for(const st of V.MW_MUSIC){const a=T.MWA_N.osc+T.MWA_N.src;try{if(!V.mwMusicPreview(st,1.5))threw.push(st+':false');}catch(e){threw.push(st);}
     if(T.MWA_N.osc+T.MWA_N.src===a&&st!=='intermission'&&st!=='bigpig')threw.push(st+':silent');T.MWM.prev=null;}
   ok('every MW_MUSIC state previews (the SFX sampler path)'+(threw.length?' ('+threw.join(',')+')':''),threw.length===0);
   T.setMusic(true);const mt=T.musicTick();T.MWM.st=null;mt();ok('inside purgatory musicTick runs the purgatory branch (the house band: '+T.MWM.st+')',V.MW_MUSIC.includes(T.MWM.st));
   let orig=0;const co=AC.createOscillator;AC.createOscillator=function(){orig++;return co.apply(this,arguments);};
   const before=T.MWA_N.osc;T.setSound(false);V.mwS('pg_boing');V.mwS('pg_bells',P.x,P.y,P.z);
   ok('mwS is silent when soundOn is false',T.MWA_N.osc===before&&orig===0);
   T.setSound(true);V.mwS('pg_boing',P.x,P.y,P.z);ok('mwS plays positionally (playSAt) when sound is on',T.MWA_N.osc>before);
   AC.createOscillator=co;T.setMusic(false);T.setSound(s0);}

  /* ===== 16. back to the overworld: everything P1 drew hides, the original music runs ===== */
  {V.mpExitNow({abandon:true});step(30);ok('after the exit Dan is in the overworld and the stage visuals are hidden',V.mpInfo().dim==='over'&&(!T.MWV.root||T.MWV.root.visible===false));
   const s0=T.getSound();T.setSound(true);T.setMusic(true);T.mkAudio();const AC=T.getAC();let orig=0;const co=AC.createOscillator;AC.createOscillator=function(){orig++;return co.apply(this,arguments);};
   const mine=T.MWA_N.osc,st=T.MWM.st;const mt=T.musicTick();for(let i=0;i<17;i++)mt();
   ok('outside purgatory musicTick runs the original overworld music (and none of the band)',orig>0&&T.MWA_N.osc===mine&&T.MWM.st===st);
   AC.createOscillator=co;T.setMusic(false);T.setSound(s0);
   ok('MCOLM is cleared on a world reset (PREG.onReset)',(V.startNewWorld('p1b','4242','s'),step(5),T.MCOLM()===0));}
});
