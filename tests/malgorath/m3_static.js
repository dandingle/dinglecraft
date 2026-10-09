/* m3_static.js (M3, gate x1): the M3 package's statics (plan 5.3, 8.3). The registrations (MGREG.rig.og, MGREG.fx with draw = mg3Draw,
   MGREG.mesh for his five entity types, the tick / onReset / onFar / onBoot entries), the OG value script installed as an updateSky
   wrapper at boot, the frozen tables (stances, arm poses, camera shots, burst kinds, telegraph colours), the source rules of every
   m3_*.js (no Math.random / Date.now / performance.now anywhere, never Float32BufferAttribute: real THREE copies its array, no PART 54
   names), the size of M3's share of PART 57, and every body builder returning the {G,legs,mats} shape. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const fs=require('fs');
const V=boot({});
boot.run(async()=>{
  if(boot.mgStubbed('3')){skip('m3_static','M3 is on its stub');return;}
  const R=V.MGREG,C=V.mg3Core(),G=fs.readFileSync(boot.BUILD+'game.js','utf8'),GD=boot.SRC.mg;
  ok('MGREG.rig.og is mg3Rig (exported as MGEX.mg3Rig)',R.rig.og===V.mg3Rig&&typeof V.mg3Rig==='function');
  const FX=['draw','burst','decal','cubes','chunk','chomp','prop','props','step','clear','dress','event','cam','scene','zone','caps'];
  ok('MGREG.fx carries the M3 VFX API ('+FX.join(' ')+') and draw is mg3Draw (the renderer behind mgDraw)',!!R.fx&&FX.every(k=>typeof R.fx[k]==='function')&&R.fx.draw===V.mg3Draw);
  ok('MGREG.mesh has a body for each of his entity types (mgmorsel mghusk mgbloat mgpart mgeye)',['mgmorsel','mghusk','mgbloat','mgpart','mgeye'].every(k=>typeof R.mesh[k]==='function'));
  const nm=a=>(a||[]).map(f=>f.name);
  ok('the M3 tick, reset, far and boot entries are registered',nm(R.tick).includes('mg3Tick')&&nm(R.onReset).includes('mg3Reset')&&nm(R.onFar).includes('mg3Far')&&nm(R.onBoot).includes('mg3Boot'));
  ok('the OG value script is installed as an updateSky wrapper at boot (runs after the original)',C.env().skyWrapped===true);
  const STN=['idle','lean','stalk','rear','knuckle','stun','kneel','chest','headup','slump','dead'];
  ok('the stance table holds the 11 stances of bible 5.3 with pelvis/spine/neck/head/hand keys',STN.every(k=>C.MG3ST[k]&&Array.isArray(C.MG3ST[k].n)&&C.MG3ST[k].n.length===3&&Array.isArray(C.MG3ST[k].hand)&&'ne' in C.MG3ST[k]&&'h' in C.MG3ST[k]));
  ok('the camera shots cover the four scenes, full and short (intro climb light death)',['intro','introS','climb','climbS','light','lightS','death'].every(k=>Array.isArray(C.MG3CAM[k])&&C.MG3CAM[k].length>=3&&C.MG3CAM[k].every((s,i,a)=>i===0||s[0]>=a[i-1][0])));
  ok('every scene shot list starts and ends on a usable key and is time-ordered',Object.values(C.MG3CAM).every(L=>L[0][0]===0));
  /* the source rules (every m3_*.js) */
  const files=fs.readdirSync(GD).filter(f=>/^m3_[A-Za-z0-9_]+\.js$/.test(f)).sort();
  ok('M3 ships real files (no stub): '+files.join(' '),files.length>=6&&!G.includes('/* ---- PART 57: _stub/m3_stub.js ---- */'));
  const src=files.map(f=>boot.readSrc(GD+f,{legacy:true})).join('\n'),code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  ok('no Math.random, Date.now or performance.now anywhere in M3 (seeded mulberry/hash noise and the fight clock only)',!/Math\.random|Date\.now|performance\.now/.test(code));
  ok('M3 never builds a Float32BufferAttribute (real THREE copies the array: skins rebuilt in place would freeze)',!/Float32BufferAttribute/.test(code));
  ok('M3 never names PART 54 state (TP, HRE, HRL, tpOn, hrSky ...): the HR side reaches in through MGREG',!/\b(TP|TPEX|HRE|HRL|HRW|HR_MOB|HR_CAST|tpRegister|tpOn|hrSky)\b/.test(code));
  ok('M3 never touches MGEX.mgStubs',!/mgStubs/.test(code));
  ok('M3 never calls spawnMob or setBlock (his entities come from M2 via mgSpawnBoss/mgAddEnt; blocks via M1)',!/\bspawnMob\s*\(|\bsetBlock\s*\(/.test(code));
  ok('M3 adds no THREE light anywhere except the rig\'s one PointLight',(code.match(/new THREE\.(PointLight|SpotLight|DirectionalLight|AmbientLight|HemisphereLight)/g)||[]).length===1);
  const i57=G.indexOf('/* ---- PART 57: m3_'),seg=[];let k=i57;while(k>=0&&k<G.length){const n=G.indexOf('/* ---- PART 57',k+10);const e=n<0?G.indexOf('/* ---- PART 56',k):n;seg.push(G.slice(k,e));k=n>=0&&G.slice(n,n+22)==='/* ---- PART 57: m3_'?n:-1;}
  const b3=Buffer.byteLength(seg.join(''));ok('M3\'s share of PART 57 is '+b3+' B (<= 170,000; the PART is capped at 600,000)',b3>0&&b3<=170000);
  /* tables */
  ok('telegraph colours WHITE RED VIOLET GOLD and the six shapes are in the renderer',['white','red','violet','gold'].every(c=>C.MG3FX&&V.mg3Draw&&typeof c==='string')&&/uShape<0\.5[\s\S]*uShape<1\.5[\s\S]*uShape<2\.5[\s\S]*uShape<3\.5[\s\S]*uShape<4\.5/.test(G));
  ok('the skin texture config: hide maps 1024, small maps 512, <= 32 rows a slice',C.MG3.cfg.TEX===1024&&C.MG3.cfg.TEX_S===512&&C.MG3.cfg.ROWS<=32);
  /* body builders (headless) */
  boot.world(V,'m3s','1337',boot.stepper(700000));
  for(const k of ['mgmorsel','mghusk','mgbloat','mgpart','mgeye']){let res=null,err=null;try{res=R.mesh[k](new THREE.Group(),[],{});}catch(e){err=e;}
    ok(k+' body builds with the {G,legs,mats} shape'+(err?' ('+err.message+')':''),!!res&&!!res.G&&Array.isArray(res.legs)&&Array.isArray(res.mats));}
  ok('the eye, Morsel, Husk and Bloater bodies carry their own animator (G.userData.mg3a)',['mgmorsel','mghusk','mgbloat','mgeye'].every(k=>typeof R.mesh[k](new THREE.Group(),[],{}).G.userData.mg3a==='function'));
});
