/* p7_hr.js (P7, gate x1): the Hyperreal side of Puppet Purgatory (the purgatory build plan section 7.2).
   boot({stubs:['A','B','C'], models:'fake', assets:'fake'}); the 13 purgatory models are faked too (stub-friendly, logged).
   Statics: the parallel registry (HR_PMOB / HR_PMOB_V / HR_PMOB_R), the model sources and their embedding rules, the splice
   (hrLoadPModels holds every pg_*.js verbatim, lib first, strict-mode clean), pg_ids.js, preview.html, tC_purg names, the
   per-tile px override, the art protocol (every purgatory id P6 produced is packed or still staged). Behaviour on a real world:
   hrPgMobMesh is null while the cast is off; nothing purgatory is built in the overworld; mpArrive prewarms (each model built
   twice, the warm set leaves the scene); spawnMob gives purgatory mobs their bodies (generic and custom brains), e.hrS reaches
   the model's s (world points become model space), boss scale; a pack round trip inside purgatory (identity on the way back);
   the theatre light preset and its sub-presets keep the light count; the followspot rides the mirror light in BLACKOUT; Burners,
   Tesla Coils, lit Hot Plates and booth lamps join the pool; fist_pg only inside purgatory; leaving purgatory restores the
   overworld light. Frames from 500000. */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok}=boot;
const fs=require('fs'),path=require('path'),cp=require('child_process');
const H=boot.ROOT,MD=boot.SRC.models,GD=boot.SRC.tex,PI=boot.P.PACK_INPUTS;   /* split repo: models, PART 54 sources, packer inputs */
/* purgatory fakes, registered before the game loads (hrPgInstall skips hrLoadPModels when HR.MODELS.pg_bigfrog exists) */
const PNAMES=['pg_bigfrog','pg_bomber','pg_bigpig','pg_blank','pg_arm','pg_pig','pg_cook','pg_drummer','pg_yeti','pg_labrat','pg_daredevil','pg_comic','pg_frog'];
const PF={builds:{},vars:{},log:[],inst:[]};
function pgFake(name){return function(variant){const T=global.THREE;PF.builds[name]=(PF.builds[name]||0)+1;(PF.vars[name]=PF.vars[name]||[]).push(variant);
  const root=new T.Group();root.name='hr_'+name;const own=new T.MeshStandardMaterial(),own2=new T.MeshStandardMaterial();
  const body=new T.Mesh(new T.BoxGeometry(),[own,own2]);body.castShadow=true;root.add(body);
  const rec={name,variant,root,updates:0,last:null};PF.inst.push(rec);
  return {root,mats:[own,own2],deathDur:1,handles:{head:root},update(dt,t,s){rec.updates++;rec.last=Object.assign({},s,{accel:null});}};};}
const V=boot({stubs:['A','B','C'],models:'fake',assets:'fake'});
for(const n of PNAMES)global.HR.MODELS[n]=pgFake(n);
const step=boot.stepper(500000);
const X=V.hrPg,E=V.hrEnt,HRE=E&&E.HRE,S=require('../lib/hr_boot.js').scene();
const G=fs.readFileSync(boot.BUILD+'game.js','utf8');
const inScene=o=>{for(let p=o;p&&p.parent;p=p.parent){if(!p.parent.children.includes(p))return false;if(p.parent===S)return true;}return false;};
const recOf=root=>PF.inst.find(r=>r.root===root);
const PLANNED=['pgwhat','pghollow','pghand','pgposs','pgfeltdan','pgcomic','pghen','pgpelican','pgdrummer','pgrat','pgrat2','pgrat4','pgyeti',
  'pgdare','pgfrog','pgpig','pgcook','pgprof','pgratb','pgoldgoat','pgoldergoat','pgweather','pgbomber','pgbigpig','pgbigfrog','pgpiglet','pghog',
  'pgtoss','pgbundle','pgcharge','pgstation','pgbigone','pgcleat','pgspot','pgtip','pgelbow','pgfinger','pgfly','pgshand','pgtrans'];

boot.run(async()=>{
  /* ================= statics ================= */
  ok('the purgatory cast seam is exported (hrPg, getHRP)',!!X&&typeof V.getHRP==='function'&&typeof X.hrPgMobMesh==='function');
  const keys=Object.keys(X.HR_PMOB);
  ok('HR_PMOB keys are planned purgatory mob types (plan 2.4)',keys.length>=14&&keys.every(k=>PLANNED.includes(k)));
  ok('HR_PMOB holds the 14 wave-1 rows of plan 7.2',['pgbigfrog','pgbomber','pgbigpig','pgwhat','pghollow','pgposs','pghand','pgtoss','pgpiglet','pgpig','pghog','pgshand','pgelbow','pgfinger'].every(k=>!!X.HR_PMOB[k]));
  ok('every HR_PMOB value is one of the 13 models, and every model is used',keys.every(k=>X.HR_PMODELS.includes(X.HR_PMOB[k]))&&X.HR_PMODELS.every(n=>Object.values(X.HR_PMOB).includes(n))&&X.HR_PMODELS.length===13);
  ok('HR_PMOB_V / HR_PMOB_R only name mapped types',Object.keys(X.HR_PMOB_V).every(k=>!!X.HR_PMOB[k])&&Object.keys(X.HR_PMOB_R).every(k=>!!X.HR_PMOB[k]));
  ok('nothing purgatory sits in the pinned v6.0 maps (HR_MOB, HR_CAST)',!Object.keys(E.HR_MOB).some(k=>/^pg/.test(k))&&!E.HR_CAST.some(n=>/^pg_/.test(n)));
  const files=fs.readdirSync(MD).filter(f=>/^pg_[a-z0-9_]+\.js$/.test(f)).sort();
  for(const n of X.HR_PMODELS)ok('model '+n+'.js exists and registers HR.MODELS.'+n,files.includes(n+'.js')&&fs.readFileSync(MD+n+'.js','utf8').indexOf('HR.MODELS.'+n+' = ')>=0);
  ok('pg_0lib.js (HR.PG) sorts first, pg_ids.js is present',files[0]==='pg_0lib.js'&&files.includes('pg_ids.js'));
  const pseg=(G.split('\nfunction hrLoadPModels(){\n')[1]||''),pend=pseg.search(/\nif\(typeof window==='undefined'\|\|typeof __VOXTEST/);
  const pbody=pend>0?pseg.slice(0,pseg.lastIndexOf('\n}\n',pend)):'';
  /* by each file's first line (models are edited while other agents' gates run: a verbatim check would race) */
  const head1=f=>fs.readFileSync(MD+f,'utf8').split('\n')[0];
  /* Release 1.0: the recast renamed the model files in place in src/ORDER.txt (the build order did not change), so the order is ORDER.txt's, lib first */
  const ord=fs.readFileSync(boot.SRC.root+'ORDER.txt','utf8').split('\n').filter(l=>/^texpacks\/models\/pg_[a-z0-9_]+\.js$/.test(l)).map(l=>l.slice('texpacks/models/'.length));
  ok('hrLoadPModels() holds every pg_*.js, in src/ORDER.txt order (lib first)',ord.length===files.length&&ord[0]==='pg_0lib.js'&&files.every(f=>ord.includes(f)&&pbody.indexOf(head1(f))>=0)&&ord.every((f,i)=>!i||pbody.indexOf(head1(ord[i-1]))<pbody.indexOf(head1(f))));
  let strictErr='';try{new Function('"use strict";\n'+pbody);}catch(e){strictErr=e.message;}
  ok('hrLoadPModels compiles in strict mode'+(strictErr?' ('+strictErr+')':''),!strictErr&&pbody.length>1000);
  ok('the v6.0 cast is untouched: hrLoadModels holds no purgatory model',(G.split('\nfunction hrLoadModels(){\n')[1]||'').split('\nfunction hrLoadPModels(){')[0].indexOf('HR.MODELS.pg_')<0);
  const heals=[];
  for(const f of files){const s=fs.readFileSync(MD+f,'utf8');
    ok(f+': no raw HR.TEXBASE / new Image( / ?retry= (textures only through HR.texURL, HR.loadTex, HR.retryURL)',s.indexOf('HR.TEXBASE')<0&&s.indexOf('new Image(')<0&&s.indexOf("'?retry='")<0&&s.indexOf("'&retry='")<0);
    ok(f+': strict IIFE that returns early without window.HR',/^\(function \(\) \{\n'use strict';\nconst HR = window\.HR;\nif \(!HR/m.test(s));
    ok(f+': no </script, <!-- or CR',s.toLowerCase().indexOf('</script')<0&&s.indexOf('<!--')<0&&s.indexOf('\r')<0);
    if(/function heal\(/.test(s))heals.push(f);}
  const lib=fs.readFileSync(MD+'pg_0lib.js','utf8');
  ok('only the lib carries the texture heal, and it starts with the HR.EMBEDDED guard',heals.join()==='pg_0lib.js'&&/function heal\(list\) \{\n  if \(HR\.EMBEDDED\) return;/.test(lib));
  ok('models never allocate in update through HR.noise / HR.twitch (closures): they use HR.PG',files.every(f=>!/HR\.(noise|twitch)\(/.test(fs.readFileSync(MD+f,'utf8'))));
  const ids=fs.readFileSync(MD+'pg_ids.js','utf8');
  ok("pg_ids.js names fist_pg and pgface_feltdan for the packer (HR.PG_IDS)",/HR\.PG_IDS = \['fist_pg', 'pgface_feltdan'\];/.test(ids));
  const pv=fs.readFileSync(MD+'preview.html','utf8');
  ok('preview.html lists every purgatory model and still loads rig.js with its BUST',X.HR_PMODELS.every(n=>pv.indexOf("'"+n+"'")>0)&&pv.indexOf('window.HR={BUST:Date.now()}')>0&&pv.indexOf("'pg_0lib'")>0);
  const tpl=boot.readSrc(GD+'tC_player.js',{legacy:true}),mk=tpl.indexOf('/* ==================== v6.1 PUPPET PURGATORY: the Hyperreal purgatory cast (P7)'),tc=mk>0?tpl.slice(mk):'',bad=[];
  ok('the purgatory cast section closes tC_player.js (no extra tC_*.js file: p0_smoke\'s v6.0 identity check)',mk>0&&!fs.existsSync(GD+'tC_purg.js'));{const re=/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;let m;
    while((m=re.exec(tc))){const n=m[1]||m[2];if(!/^(HR_P[A-Z_]*|hrPg\w*)$/.test(n))bad.push(n);}}
  ok('the purgatory cast section\'s top-level names stay in P7\'s prefixes (HR_P*, hrPg*)'+(bad.length?' ('+bad.join(',')+')':''),bad.length===0&&tc.length>1000);
  ok('the purgatory light preset is in tB_light (theatre branch before the overworld else, 6 sub-presets)',G.indexOf('}else if(theatre){')>0&&['show','blackout','bomber','bigpig','bigfrog','work'].every(k=>!!V.hrMupState().T[k]));
  const paF=boot.P.TOOLS+'art/texpacks/pack_assets.py',pa=fs.existsSync(paF)?fs.readFileSync(paF,'utf8'):'';
  ok("pack_assets: pg_* tiles pack at 256 px (per-tile px override), std cap 45 MB",/PG_TILE_PX = 256/.test(pa)&&/min\(P\['block'\], int\(f\.get\('px', P\['block'\]\)\)\)/.test(pa)&&/'std':.*cap=45_000_000/.test(pa));
  /* the art protocol: every purgatory entity id P6 produced is either packed or still staged (never live and unpacked) */
  /* split repo: the source art is not in git; the committed manifest lists every entity id the packer found (entIds + entIdsNotReferenced);
     with DC_ART_SRC set, the real final_ent/ is listed instead */
  const man=JSON.parse(fs.readFileSync(boot.P.PACKED+'hr/manifest.json','utf8')),entIds=new Set(man.coverage.entIds),FE=boot.P.ART_SRC?boot.P.ART_SRC+'final_ent/':null;
  const pgFinals=[...new Set((FE?fs.readdirSync(FE).filter(f=>/_basecolor\.png$/.test(f)).map(f=>f.replace('_basecolor.png','')):[...man.coverage.entIds,...man.coverage.entIdsNotReferenced]).filter(i=>/^(face_pg_|pgface_|pgmat_|pgent_|fist_pg$)/.test(i)))];
  const unpacked=pgFinals.filter(i=>!entIds.has(i));
  ok('every purgatory entity id in final_ent/ is packed ('+pgFinals.length+' ids'+(unpacked.length?'; unpacked: '+unpacked.join(','):'')+')',unpacked.length===0);
  const FT=PI,tilesArt=new Set(man.coverage.tilesWithArt),tj=JSON.parse(fs.readFileSync(FT+'tiles.json','utf8'));
  const pgT=Object.keys(tj).filter(k=>/^pg_/.test(k)),tUnp=pgT.filter(k=>!tilesArt.has(k));
  ok('every pg tile in final/tiles.json is packed ('+pgT.length+' tiles'+(tUnp.length?'; unpacked: '+tUnp.join(','):'')+')',tUnp.length===0);
  if(pgT.length){const px=pgT.map(k=>man.keys['t:'+k+'|c']&&man.keys['t:'+k+'|c'].px[0]).filter(Boolean);ok('packed pg tiles are 256 px',px.length===pgT.length&&px.every(p=>p<=256));}
  else boot.skip('packed pg tiles are 256 px','no pg tile installed yet');
  const hrt=JSON.parse(fs.readFileSync(PI+'hr_tiles.json','utf8')),pgFlags=Object.keys(hrt.tiles).filter(k=>/^pg_/.test(k));
  const pf=JSON.parse(fs.readFileSync(boot.FIX+'p7_hr_tiles_pg.json','utf8')).tiles;
  if(pgFlags.length)ok('hr_tiles.json carries exactly P7\'s pg flags (tests/fixtures/p7_hr_tiles_pg.json)',pgFlags.length===Object.keys(pf).length&&pgFlags.every(k=>JSON.stringify(hrt.tiles[k])===JSON.stringify(pf[k])));
  else ok('no pg flag in hr_tiles.json before the tile install (they land with the tiles)',pgT.length===0);
  ok('the burner and hot plate tops glow (emissive 2.0, emask lum); soup and scum scroll as water',pf.pg_burner_t.emissive===2&&pf.pg_burner_t.emask==='lum'&&pf.pg_hotplate_t.emissive===2&&pf.pg_soup.water&&pf.pg_soup.scroll&&pf.pg_scum.water&&pf.pg_scum.scroll);
  const Tl=V.pgCore().Tl;
  if(boot.stubbed('2'))boot.skip('every pg name in hr_tiles.json / tiles.json exists in the atlas','P2 on its stub');
  else ok('every pg name in hr_tiles.json / tiles.json exists in the atlas',pgFlags.concat(pgT).every(n=>Tl[n]!==undefined));

  /* ================= behaviour ================= */
  const Gs=new THREE.Group();
  ok('hrPgMobMesh is null while the cast is off',X.hrPgMobMesh('pgwhat',Gs)===null&&X.hrPgMobMesh('pgbigfrog',Gs)===null);
  ok('hrPgPrewarm does nothing while the cast is off',X.hrPgPrewarm()===false&&V.getHRP().builds===0);
  V.startNewWorld('p7hr','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.GR.god=true;V.setTime(0.3);
  step(160);
  await V.setQuality(1);
  ok('setPack(hr,{only:[light,ents]}) in the overworld',await V.setPack('hr',{only:['light','ents']})===true&&V.getHRE().on===true);
  const LK=V.tpLightCount().key;
  ok('in the overworld nothing purgatory is built (no prewarm, no install)',V.getHRP().builds===0&&V.getHRP().inst===false&&X.hrPgPrewarm()===false);
  ok('hrPgFace is null without packed art (fake assets)',X.hrPgFace('pgface_feltdan')===null);
  /* two test-only mob types, independent of P3/P4 progress (their real brains expect their arenas): a generic-brain puppet on
     pg_blank and a custom-brain headliner on pg_bomber. Registered in MOBT, PREG and HR_PMOB, removed at the end. */
  const ogMesh=(G0,mats)=>{const m=new THREE.MeshLambertMaterial({color:0x888888});mats.push(m);const b=new THREE.Mesh(new THREE.BoxGeometry(0.5,1,0.5),m);G0.add(b);return {G:G0,legs:[],mats};};
  V.MOBT.pgp7gen={hp:12,hw:0.3,h:1.2,spd:1,body:'#888888',legc:'#666666',pmob:1};V.PREG.mesh.pgp7gen=ogMesh;X.HR_PMOB.pgp7gen='pg_blank';X.HR_PMOB_V.pgp7gen='tether';
  V.MOBT.pgp7boss={hp:200,hw:0.4,h:2,spd:1,body:'#888888',legc:'#666666',pmob:1,boss:1,pboss:1,kbRes:0.9};V.PREG.mesh.pgp7boss=ogMesh;X.HR_PMOB.pgp7boss='pg_bomber';
  V.PREG.brain.pgp7boss=(e,dt)=>{e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;e.hrS=e.hrS||{};e.hrS.plunge=0.5;};
  /* enter purgatory: mpArrive prewarms */
  ok('mpEnterNow enters purgatory',V.mpEnterNow()!==false);step(30);
  ok('in purgatory (DIM puppet)',V.mpInfo().dim==='puppet'||V.getMP().inside===true);
  const hp=V.getHRP();
  ok('arrival installed the purgatory cast and prewarmed it (every model built twice the first time)',hp.inst&&hp.ok&&hp.warmed&&hp.warmDim&&PNAMES.every(n=>PF.builds[n]>=2));
  let warm=0;S.traverse(o=>{if(o.name==='hr_pgwarm')warm++;});
  ok('the prewarm set left the scene (and its instances were freed)',warm===0);
  const b0=Object.assign({},PF.builds);step(10);
  ok('no second prewarm while still inside (the light module sees the new DIM, warmDim guards it)',PNAMES.every(n=>PF.builds[n]===b0[n])&&V.hrMupState().dimN>=1);
  /* spawnMob: a generic-brain puppet and a custom-brain headliner */
  const P=V.P;V.spawnMob('pgp7gen',P.x+4,P.y,P.z+3);const w=V.entities[V.entities.length-1];
  ok('a spawned Blank gets the pg_blank body (variant tether), no OG legs, the fake\'s flash mats',!!w.hrM&&w.hrM.name==='pg_blank'&&w.hrM.pv0==='tether'&&w.legs.length===0&&w.mats.length===2&&inScene(w.mesh));
  w.yaw=0;w.hrS={p7probe:0.7,hole:[w.x+1,w.y-2,w.z]};step(6);
  let r=recOf(w.hrM.hr.root);
  ok('e.hrS reaches the model\'s s on a generic brain (hook C6 path)',!!r&&r.updates>0&&r.last.p7probe===0.7);
  {const dx=w.hrS.hole[0]-w.x,dy=w.hrS.hole[1]-w.y,dz=w.hrS.hole[2]-w.z,c=Math.cos(w.yaw),n=Math.sin(w.yaw);   /* the wandering brain moved it a little */
   ok('a world point in e.hrS becomes model space (the hole, rotated into the mob\'s frame)',!!r&&Math.abs(r.last.hlx-(dx*c-dz*n))<0.3&&Math.abs(r.last.hly-dy)<0.3&&Math.abs(r.last.hlz-(dx*n+dz*c))<0.3);}
  V.spawnMob('pgp7boss',P.x-5,P.y,P.z+4);const hr=V.entities[V.entities.length-1];
  ok('a spawned Demolitionist gets pg_bomber with the boss scale on its group',!!hr.hrM&&hr.hrM.name==='pg_bomber'&&Math.abs(hr.mesh.scale.x-1.5)<1e-9&&Math.abs(hr.mesh.scale.y-1.4)<1e-9);
  hr.yaw=Math.PI/2;hr.hrS={plunge:0.5,aim:[hr.x+3,hr.y,hr.z]};step(6);r=recOf(hr.hrM.hr.root);
  ok('a custom purgatory brain steps its body through mpBrain -> hrPgTick (s.plunge from e.hrS)',!!r&&r.updates>0&&r.last.plunge===0.5);
  ok('model space respects yaw and the boss scale (yaw pi/2: world +x is local +z, /1.5)',!!r&&Math.abs(r.last.amz-2)<0.05&&Math.abs(r.last.amx)<0.05);
  ok('hrPgTick fills the generic s (speed, hurt, head look at Dan)',!!r&&typeof r.last.speed==='number'&&typeof r.last.hurt==='number'&&typeof r.last.yaw==='number');
  /* the light: theatre preset */
  ok('the theatre preset runs in purgatory (dim puppet, a known sub-preset from the cue)',V.getHRL().dim==='puppet'&&['show','warn','blackout','bomber','bigpig','bigfrog','work'].includes(V.getHRL().theatre));
  ok('purgatory keeps the overworld Hyperreal light count',V.tpLightCount().key===LK||(console.log('  '+V.tpLightCount().key+' vs '+LK),false));
  const T=V.hrMupState().T;let cnt=true,vals=true;
  for(const k of ['show','blackout','bomber','bigpig','bigfrog','work']){V.hrMupForce(k);step(3);const h=V.getHRL();
    if(V.tpLightCount().key!==LK)cnt=false;if(h.theatre!==k||Math.abs(h.keyI-T[k].keyI)>1e-6||Math.abs(h.hemiI-T[k].hemiI)>1e-6)vals=false;}
  ok('every sub-preset keeps the light count',cnt);
  ok('each sub-preset sets its key and hemisphere (snapped on a forced change)',vals);
  V.hrMupForce('blackout');V.hrMupFollowT({x:P.x+1,y:P.y,z:P.z+1});step(4);
  const st=V.hrLState();
  ok('BLACKOUT: the followspot rides the mirror light over its target',V.getHRL().mirrorI>50&&Math.abs(st.HRL.mirror.position.y-(P.y+4.2))<1e-6&&V.tpLightCount().key===LK);
  V.hrMupFollowT(null);V.hrMupForce('show');step(30);
  ok('SHOW: the followspot is gone',V.getHRL().follow<0.05);
  V.hrMupForce('warn');step(20);
  ok('warn: SHOW with a stuttering key (never above SHOW, sometimes well below)',V.getHRL().keyI<=T.show.keyI+1e-6);
  V.hrMupForce(null);step(2);
  /* emitters: a Burner and a Tesla Coil in the chunk scan, a lit Hot Plate and a booth lamp through MP_LIGHTS */
  const bx=Math.floor(P.x)+2,bz=Math.floor(P.z)+2,by=Math.floor(P.y);
  V.setBlock(bx,by,bz,V.B.PG_BURNER);V.setBlock(bx-4,by,bz,V.B.PG_TESLA);V.setBlock(bx,by,bz-4,V.B.PG_HOTPLATE);
  const ML=V.hrMupLights(),bk=V.pgCore().bkey;
  ok('MP_LIGHTS is visible to the light module',!!ML&&typeof ML.add==='function');
  ML.add(bk(bx,by,bz-4));ML.add(bk(bx-4,by,bz-4));step(20);
  const kinds=new Set(st.HRL.slots.filter(Boolean).map(c=>c.kind));
  ok('a Burner (3), a Tesla Coil (4), a lit Hot Plate (3) and a booth lamp (5) join the pool',kinds.has(3)&&kinds.has(4)&&kinds.has(5)&&st.HRL.slots.filter(c=>c&&c.kind===3).length>=2);
  ok('the pool never grows (light count constant)',V.tpLightCount().key===LK);
  ML.delete(bk(bx,by,bz-4));ML.delete(bk(bx-4,by,bz-4));
  /* the fist: fist_pg only inside purgatory (test textures: the fake assets carry no fist art) */
  const tx={db:new THREE.Texture(),pb:new THREE.Texture(),dn:new THREE.Texture(),pn:new THREE.Texture()};
  const fm=new THREE.MeshStandardMaterial();fm.map=tx.db;fm.normalMap=tx.dn;const fr=new THREE.Group();fr.add(new THREE.Mesh(new THREE.BoxGeometry(),fm));
  const FH={hr:{root:fr}};
  ok('inside purgatory the fist wears fist_pg (map and normal map)',X.hrPgFistSync(FH,tx)===true&&fm.map===tx.pb&&fm.normalMap===tx.pn);
  ok('without fist art nothing is swapped (fake assets)',X.hrPgFistSync({hr:{root:new THREE.Group()}})===false);
  /* a pack round trip inside purgatory */
  const wG=w.mesh;
  ok('back to OG inside purgatory: purgatory bodies go back to OG meshes',await V.setPack('og')===true&&!w.hrM&&!hr.hrM&&w.mesh!==wG&&inScene(w.mesh)&&Math.abs(hr.mesh.scale.y-1.4)<1e-9);
  const wOG=w.mesh,s0=V.getHRP().swaps;
  ok('Hyperreal again inside purgatory: live purgatory mobs swapped in (OG stashed)',await V.setPack('hr',{only:['light','ents']})===true&&!!w.hrM&&!!hr.hrM&&w._og&&w._og.G===wOG&&V.getHRP().swaps>=s0+2);
  ok('OG once more: the stashed OG meshes come back by identity',await V.setPack('og')===true&&w.mesh===wOG&&!w._og);
  ok('and Hyperreal (prewarm again on the pack event, warm set gone)',await V.setPack('hr',{only:['light','ents']})===true&&V.getHRP().warmDim===true&&(()=>{let n=0;S.traverse(o=>{if(o.name==='hr_pgwarm')n++;});return n===0;})());
  /* leaving purgatory */
  ok('mpExitNow leaves purgatory',V.mpExitNow({abandon:true})!==false);step(40);
  ok('the overworld light is back (dim over, keyI from the day palette) and the warm flag reset',V.getHRL().dim==='over'&&V.getHRL().keyI>1&&V.getHRP().warmDim===false&&V.tpLightCount().key===LK);
  ok('the fist is fist_dan again outside',X.hrPgFistSync(FH,tx)===false&&fm.map===tx.db&&fm.normalMap===tx.dn);
  await V.setPack('og');
  for(const mt of ['pgp7gen','pgp7boss']){delete V.MOBT[mt];delete V.PREG.mesh[mt];delete V.PREG.brain[mt];delete X.HR_PMOB[mt];delete X.HR_PMOB_V[mt];}
});
