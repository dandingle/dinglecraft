/* m3_smoke.js (M3, gate x2): the OG VFX and set dressing in behaviour (plan 5.3; bible 2, 3.6, 7.3, 12, 13, 19.1). Seed 1337 (the Bite at sea).
   A far from the Bite: M3 does nothing (no tick, no dressing, no grade) · B the approach: the dressing builds within 220 m, the skin maps
   build in slices (never in one frame) · C the lip: iris, bile, falls, plume, brazier · D R1 woken: the ember grade, the boss rig, LOD by
   distance, his one light · E the telegraph renderer (pool <= 24, lock, the commit flash, "you're in it", free) · F the FX API (bursts,
   cube rain, a rigid chunk, void decals, the chomp POV, clear) · G his bodies animate themselves · H R3: the sun is eaten (sprite hidden,
   sky near-black, ambient 0.45), the gold curtains, the live edge, the ring's funnel · I the scene pictures: the sun disc slides between
   the sky and his throat with MGL.eclipse · J the cutscene cameras · K walking away and a dimension change dispose everything; a new
   world frees the caches. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const V=boot({});const step=boot.stepper(700000);
const warn=[];const ow=console.warn;console.warn=(...a)=>{warn.push(a.join(' '));ow.apply(console,a);};
const sec=(name,fn)=>{try{fn();}catch(e){ok(name+' ran without throwing ('+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ').slice(0,300)+')',false);}};
boot.run(async()=>{
  if(boot.mgStubbed('3')){skip('m3_smoke','M3 is on its stub');return;}
  const C=V.mg3Core(),E=()=>C.env(),D=()=>C.MG3D,info=()=>V.mgInfo();
  const dress=()=>E().scene.children.filter(c=>c.name==='mgDress');
  boot.world(V,'m3s1','1337',step);V.GR.dayCycle=false;V.setTime(0.3);
  /* A far */
  sec('far',()=>{const f0=C.MG3.frame;step(30);
    ok('far from the Bite (~1 km): M3 never ticks, builds no dressing, grades nothing',C.MG3.frame===f0&&dress().length===0&&!D().sk.on&&info().near===0);});
  /* B approach */
  sec('approach',()=>{const P=V.P,G=V.mgG();V.forceChunksNear(1000.5-150,1000.5);boot.tp(V,1000.5-150,G+3,1000.5);step(30);
    ok('within 220 m the set dressing builds once (one mgDress group: the leftovers ring\'s 3 tiers)',dress().length===1&&D().ring&&D().ring.tiers.length===3);
    const T=C.MG3.tex;ok('the OG skin maps build in slices in the height band (started, not finished in one frame)',!!T&&(T.step>0||T.row>0||T.done));
    let nf=0;while(nf<900&&!(C.MG3.tex&&C.MG3.tex.done)){step(10);nf+=10;}ok('...and finish within ~20 s of the approach (<= 2 ms slices): '+nf+' frames',!!C.MG3.tex&&C.MG3.tex.done&&nf>=200);
    boot.tp(V,1000.5-110,G+3,1000.5);step(30);ok('ash flakes fall inside 140 m',C.MG3FX.parts&&C.MG3FX.parts.alp.live>0);});
  /* C lip and plate (dormant) */
  sec('lip',()=>{boot.lip(V,step);step(20);const d=D();
    ok('the iris: 12 fangs round the Throat; the bile and its glow; the sea falls on this ocean seed; the far plume',d.iris&&d.iris.it.length===12&&d.bile&&d.falls&&d.falls.sheets.length>=6&&!!d.plume);
    ok('the dormant grade (ash): the OG fog leans toward #4a3a40 near the Bite',D().sk.w>0.05&&D().sk.on===1);});
  /* I the sun disc */
  sec('sun',()=>{const L=V.getMGL();V.mgCut({lines:[],end:30});L.phase='light';L.eclipse=0.5;step(1);L.phase='light';L.eclipse=0.5;step(1);const U=D().sun;
    ok('THE LIGHT: with MGL.eclipse 0.5 the scripted disc is on its way from the sky to his throat',U.disc.visible&&isFinite(U.disc.position.x));
    L.eclipse=1;step(2);ok('...and gone into him at 1',!U.disc.visible);L.phase='round';V.getCUT().on=false;V.getCUT().script=null;step(2);});
  /* D R1 */
  let boss=null;
  sec('r1',()=>{boot.bite(V,step);V.mgSkipTo(1);for(let i=0;i<700&&(V.getCUT().on||!info().live);i++)step(1);step(60);boss=boot.boss(V);
    ok('R1 is live with the boss on M3\'s rig (OG skin)',info().live===1&&!!boss&&!!boss.mgRig&&boss.mgRig.kind==='boss'&&boss.mgSkin==='og');
    const fog=E().fog.color;ok('the R1 ember haze (#6a2c18): warm fog (r > g > b) near the Bite',fog.r>fog.g&&fog.g>=fog.b&&D().sk.on===1);
    const r=boss.mgRig;ok('his one light rides its anchor (chest in R1) and is the rig\'s only PointLight',boot.lights(boss.mesh).length===1&&r.light.distance>=30);
    const P=V.P,sx=P.x,sy=P.y,sz=P.z;boot.tp(V,1000.5-110,V.mgG()+2,1000.5);V.forceChunksNear(P.x,P.z);step(6);ok('seen from far (> 50 m), the boss swaps to the L1 geometry',r.lodLevel===1);
    boot.tp(V,sx,sy,sz);step(30);ok('...and back to L0 up close',r.lodLevel===0);});
  /* E telegraphs */
  sec('telegraph',()=>{const F=V.mgF(),P=V.P,clk=()=>V.getMGF().clock;const h=V.mgDraw('slap',{col:'white',shape:'disc',x:P.x,z:P.z,r:2.5,y0:F-1,y1:F+4,impactT:clk()+1.0});
    const pool=C.MG3FX.pool,s=pool.find(q=>q.t===h.t);ok('mgDraw renders through M3: a pooled shader quad in the scene for the drawing',!!s&&s.live===1&&!!s.mesh.parent&&s.mesh.visible);
    h.lock();step(2);ok('lock(): the drawing stops moving; Dan inside a locked zone lights "you\'re in it"',s.U.uLock.value===1&&s.U.uIn.value===1);
    for(let i=0;i<30&&clk()<h.t.impactT-0.3;i++)step(1);ok('the commit flash at T-0.35',s.U.uFlash.value===1);
    h.free();ok('free(): the slot is released and hidden',s.live===0&&!s.mesh.visible);
    const hs=[];for(let i=0;i<30;i++)hs.push(V.mgDraw('t'+i,{col:['red','violet','gold','white'][i%4],shape:['ring','band','line','crescent','box','disc'][i%6],x:P.x+i,z:P.z,r:3,r0:1,len:8,w:3,th:1,dth:0.4}));
    ok('the pool never exceeds 24 live drawings (oldest recycled)',pool.length<=24);for(const q of hs)q.free();});
  /* F fx API */
  sec('fx',()=>{const F=V.mgF(),P=V.P,X=V.MGREG.fx;
    for(const k of ['spark','ember','blood','gold','white','violet','flash','sun','dust','steam','smoke','ash','bile','drool'])X.burst(k,P.x,F+2,P.z,{n:4});X.burst('debris',P.x,F+1,P.z,{id:V.B.STONE,n:3});
    ok('every burst kind spawns smooth particles (additive + alpha systems)',C.MG3FX.parts.add.live>0&&C.MG3FX.parts.alp.live>0);
    const cs=[];for(let i=0;i<20;i++)cs.push({id:V.B.DIRT,x:P.x,y:F+6,z:P.z,vx:i-10,vy:3,vz:0,floor:F});X.cubes(cs);step(3);ok('cube rain: tumbling atlas cubes in one dynamic mesh',C.MG3FX.rain&&C.MG3FX.rain.mesh.visible);
    const ch=X.chunk([{id:V.B.GRASS,x:Math.floor(P.x),y:F-1,z:Math.floor(P.z)},{id:V.B.DIRT,x:Math.floor(P.x)+1,y:F-1,z:Math.floor(P.z)}]);ch.set(P.x,F+4,P.z,0.3,0.1,0);
    ok('a rigid chunk (the slab) follows set()',Math.abs(ch.mesh.position.y-(F+4))<1e-6);ch.drop(0,0,0,F-10);step(60);ok('...drops, shatters into cubes and frees itself',!ch.mesh.parent);
    X.decal(Math.floor(P.x)+3,F-1,Math.floor(P.z));step(1);ok('void decals cover an eaten cell',C.MG3FX.decals&&C.MG3FX.decals.mesh.visible);
    X.chomp(0.35);step(2);ok('the chomp POV: tooth rows in front of the camera',C.MG3FX.pov.up.visible&&C.MG3FX.pov.lo.visible);step(12);ok('...for 0.35 s only',!C.MG3FX.pov.up.visible);
    const tooth=X.prop('tooth',P.x+2,F,P.z,{yaw:0.4});ok('props: the cracked tooth stuck in the plate',!!tooth&&!!tooth.parent);X.props();ok('props() clears them (the round reset)',!tooth.parent);
    X.clear();step(1);ok('clear() leaves nothing live',C.MG3FX.parts.add.live===0&&!C.MG3FX.rain.mesh.visible);});
  /* G bodies */
  sec('bodies',()=>{const F=V.mgF(),P=V.P,G=new THREE.Group(),r=V.MGREG.mesh.mgmorsel(G,[],{});const e={t:'mob',mt:'mgmorsel',mesh:G,x:P.x+3,y:F,z:P.z,vx:2,vz:0,yaw:0,dead:false,anim:0};
    for(let i=0;i<5;i++){V.MGREG.fx.step(e,0.04);C.MG3.frame++;}ok('his bodies carry their own animator, stepped once a frame (a Morsel scuttles)',e.anim>0);});
  /* H R3 */
  sec('r3',()=>{V.mgSkipTo(3);for(let i=0;i<900&&(V.getCUT().on||!info().live||info().round!==3);i++)step(1);step(80);
    const en=E();ok('R3: the sun is eaten (the OG sun sprite hidden near the Bite)',info().round===3&&en.sun&&en.sun.visible===false);
    ok('R3: the sky near-black (#0a0408) and the fog dark',en.bg.r<0.12&&en.bg.g<0.08&&en.fog.color.r<0.15);
    ok('R3: the island-top ambient floor ~0.45',en.amb&&Math.abs(en.amb.intensity-0.45)<0.08);
    const cu=D().curt;ok('R3: the gold curtains rise through the gaps',cu&&cu.mesh.visible&&cu.mat.opacity>0.2);
    V.getMGL().edge=22;step(3);ok('R3: an ember band runs along the live edge (MGL.edge)',cu.edge.visible);
    ok('R3: the leftovers drop and tighten into a fast funnel',D().ring.k>0.3);});
  /* J cameras */
  sec('cams',()=>{const X=V.MGREG.fx,cam=E().camera;let fin=true;for(const k of ['intro','climb','light','death'])for(const full of [true,false]){const f=X.cam(k,full);if(!f){fin=false;continue;}
      for(const t of [0,1,2.5,4,6,9,12,14]){f(t);if(!isFinite(cam.position.x+cam.position.y+cam.position.z+cam.rotation.x+cam.rotation.y))fin=false;}}
    ok('fx.cam(scene, full) shots frame his joints for every scene and time without NaN',fin);});
  /* K far, dimension, reset */
  sec('dispose',()=>{const P=V.P;boot.tp(V,1000.5-260,70,1000.5);V.forceChunksNear(P.x,P.z);step(10);
    ok('walking 260 m away disposes the dressing and every FX object',dress().length===0&&!C.MG3FX.pool.some(s=>s.live));
    boot.bite(V,step);step(10);ok('back near: the dressing rebuilds',dress().length===1);
    V.setDim('nether',100.5,64,100.5);step(5);ok('a dimension change disposes the dressing (the sky wrapper watches)',dress().length===0);
    V.setDim('over',1000.5-14,V.mgF(),1000.5);step(10);
    boot.world(V,'m3s2','1337',step);ok('a new world frees the skin maps and the shared geometry (rebuilt on the next approach)',C.MG3.tex===null&&!C.MG3.geo.p1);});
  ok('no [MG] callback failure was logged during the suite',!warn.some(w=>/\[MG\]/.test(w)));
});
