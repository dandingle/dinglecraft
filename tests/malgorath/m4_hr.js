/* m4_hr.js (M4, gate x1, full builds only): Malgorath in Hyperreal (the Malgorath plan 5.4 / 8.4).
   boot({stubs:['A','B','C'], models:'fake', assets:'fake'}) plus a fake hrMgAssets (two packed ids: mg_hide, face_husk) so both the
   art path and the procedural/flat fallbacks are exercised. Frames from 760000 (strictly increasing).
   Statics: the HR block and its file order, the m4 names, HR_MG kept apart from HR_MOB / HR_CAST, hrLoadMModels (mg_malgorath.js
   spliced verbatim, strict, early return, the rig.js contract), the shader patch (object-space position/normal varyings, never
   worldPosition; every r128 anchor it replaces; its own program cache key), the asset pack's coverage (every packed mg id is used by
   a role or an add, every role id with art has a basecolor, no orphans), the grade presets' shape.
   Behaviour: the grade (null beyond 140 m; the weight ramp 140 -> 40 m; Ash asleep, Ember R1, Blood R2, the Eclipse on top in R3,
   the Dawn, the fade after his death to {w:0}; keyM/dark weighted; the sun disc eaten only near and only under the Eclipse; hrSky
   applies it through the HR1 hook; v6.2-identical beyond 140 m), the boss in Hyperreal (skin hr, M4 materials on his meshes, exactly
   one PointLight, untagged and mirrored with its distance, meshes owning their shadow flags, the per-round hue, the gold window, the
   death glow), the pack swap both ways (one light, the OG rig after disable, materials freed, identity of the entity), the prewarm
   spare (built once within 70 m, consumed by the spawn), the adds' Hyperreal bodies (opt-in only while the cast is live, the char
   pass, the morsel, the eye, stepped once a frame, reconciled across a pack switch, freed when they die), OG untouched. */
'use strict';
const W='data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
const FAKE_MG={};for(const id of ['mg_hide','face_husk'])for(const m of ['b','n','r','m'])FAKE_MG['m:'+id+'|'+m]=W;
global.hrMgAssets=()=>FAKE_MG;
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const fs=require('fs');
const V=boot({stubs:['A','B','C'],models:'fake',assets:'fake'});
const step=boot.stepper(760000);
const S=boot.scene(),G=fs.readFileSync(boot.BUILD+'game.js','utf8'),GD=boot.SRC.mgHr,MD=boot.SRC.mgModels;   /* split repo: the m4 sources and his model */
const X=V.hrMgX,HI=()=>V.getHRMG(),MGL=()=>V.getMGL(),MGA=()=>V.getMGA(),info=()=>V.mgInfo();
const inScene=o=>{for(let p=o;p&&p.parent;p=p.parent){if(!p.parent.children.includes(p))return false;if(p.parent===S)return true;}return false;};
const sec=(name,fn)=>{try{return fn();}catch(e){ok(name+' ran without throwing ('+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ').slice(0,300)+')',false);}};
const asec=async(name,fn)=>{try{return await fn();}catch(e){ok(name+' ran without throwing ('+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ').slice(0,300)+')',false);}};
const near=(a,b,e)=>Math.abs(a-b)<=(e||1e-6);
const mineSet=r=>new Set(r&&r.hrMats?r.hrMats.list:[]);
const meshesOf=root=>{const o=[];root.traverse(q=>{if(q.material&&q.geometry)o.push(q);});return o;};
const bossE=()=>boot.boss(V);
const wake=r=>{V.mgSkipTo(r||1);for(let i=0;i<600&&(V.getCUT().on||!info().live);i++)step(1);step(3);return bossE();};
const tpTo=(x,z,y)=>{V.forceChunksNear(x,z);boot.tp(V,x,y==null?V.mgF():y,z);step(25);};

boot.run(async()=>{
  const full=G.indexOf('/* ---- PART 54: t0_contract.js ---- */')>=0;
  if(!full){skip('m4_hr','DC_NO_TEX build: no Hyperreal');return;}
  /* ================= statics ================= */
  sec('statics',()=>{
    const iH=G.indexOf('/* ---- PART 57 HR: '),iLM=G.indexOf('\nfunction hrLoadModels(){'),iCast=iLM<0?-1:G.lastIndexOf('\n',iLM-1);   /* the cast loader's comment line (its wording may change) */
    const pH=G.slice(iH,iCast),files=(pH.match(/\/\* ---- PART 57 HR: [^ ]+ ---- \*\//g)||[]).map(s=>s.slice(20,-8));
    const real=fs.readdirSync(GD).filter(f=>/^m4_[A-Za-z0-9_]+\.js$/.test(f)).sort();
    ok('the HR block holds the real m4 files in name order ('+files.join(' ')+')',real.length>0&&files.join()===real.join());
    ok('the frozen HR names exist (HR_MG, hrMgGrade, hrMgSun, hrMgInstall) and MGREG.rig.hr / hrOn / mesh_hr are M4\'s',
      !!X&&typeof X.hrMgGrade==='function'&&typeof X.hrMgSun==='function'&&typeof X.hrMgInstall==='function'&&!!X.HR_MG&&
      V.MGREG.rig.hr===X.hrMgRigHr&&V.MGREG.hrOn===X.hrMgLive&&['mghusk','mgbloat','mgmorsel','mgeye'].every(k=>typeof V.MGREG.mesh_hr[k]==='function'));
    const E=V.hrEnt;
    ok('HR_MG is separate from the pinned v6.0 cast maps (no mg type in HR_MOB, no malgorath in HR_CAST)',!Object.keys(E.HR_MOB).some(k=>/^mg|demon/.test(k))&&!E.HR_CAST.some(n=>/malg|^mg/.test(n)));
    const mf=fs.readdirSync(MD).filter(f=>/^mg_[a-z0-9_]+\.js$/.test(f)).sort();
    const iMM=G.indexOf('\nfunction hrLoadMModels(){\n'),seg=iMM>=0&&iCast>iMM?G.slice(iMM+'\nfunction hrLoadMModels(){\n'.length,iCast):'';
    const body=seg.slice(0,seg.lastIndexOf('\n}\n'));
    ok('hrLoadMModels() holds every src/malgorath/hr/models/mg_*.js verbatim, sorted ('+mf.join(' ')+')',mf.includes('mg_malgorath.js')&&
      mf.every(f=>body.indexOf(fs.readFileSync(MD+f,'utf8').trim())>=0));
    let se='';try{new Function('"use strict";\n'+body);}catch(e){se=e.message;}
    ok('hrLoadMModels compiles in strict mode'+(se?' ('+se+')':''),!se&&body.length>200);
    for(const f of mf){const s=fs.readFileSync(MD+f,'utf8');
      ok(f+': a strict IIFE that returns early without window.HR, nothing declared at column 0, HTML-safe',/^\(function \(\) \{\n  'use strict';\n  const HR = window\.HR;\n  if \(!HR \|\| !HR\.MODELS\) return;/m.test(s)&&
        !/^(?:function|var|let|const)\b/m.test(s)&&s.toLowerCase().indexOf('</script')<0&&s.indexOf('<!--')<0&&s.indexOf('\r')<0&&!/^pg_/.test(f));}
    const src=X.src,all=Object.values(src).join('\n');
    ok('the patch sanitises NaN (a degenerate normal must never become a black bloom block)',/isnan\(normal\)/.test(src.fsN||'')||/isnan/.test(all+String(X.hrMgPatch)));
    ok('the triplanar patch projects from object-space varyings only (vMgP/vMgN from position/normal or their rest copies; never worldPosition)',
      /vMgP=mgOk\?mgRest:position/.test(src.vsB)&&/vMgN=mgOk\?mgRestN:normal/.test(src.vsB)&&all.indexOf('worldPosition')<0&&all.indexOf('modelMatrix')<0);
    const fake={uniforms:{},vertexShader:'#include <common>\nvoid main(){\n#include <begin_vertex>\n}',fragmentShader:['#include <common>','void main(){',
      '#include <clipping_planes_fragment>','#include <map_fragment>','#include <roughnessmap_fragment>','#include <normal_fragment_begin>','#include <normal_fragment_maps>',
      '#include <emissivemap_fragment>','}'].join('\n')};
    const m=X.hrMgMat('hide');let pe='';try{m.onBeforeCompile.call(m,fake);}catch(e){pe=e.message;}
    ok('the patch finds every r128 anchor it replaces and wires its per-material uniforms'+(pe?' ('+pe+')':''),!pe&&fake.fragmentShader.indexOf('#include <map_fragment>')<0&&
      fake.fragmentShader.indexOf('mgTri(')>0&&fake.vertexShader.indexOf('vMgP')>0&&fake.uniforms.uMgGrow===m.userData.mgU.uMgGrow&&fake.uniforms.uMgRim===m.userData.mgU.uMgRim);
    ok('every patched material is hr-tagged and keys its own program (customProgramCacheKey per role)',m.userData.hr===1&&typeof m.customProgramCacheKey==='function'&&
      m.customProgramCacheKey()!==X.hrMgMat('flesh').customProgramCacheKey()&&m.customProgramCacheKey()===X.hrMgMat('hide').customProgramCacheKey());
    ok('the material set has the frozen o.mats roles (hide, flesh, horn, brow, enamel, eye, crust, bile) plus drool',
      ['hide','flesh','horn','brow','enamel','eye','crust','bile','drool'].every(k=>X.HR_MG_ROLES.includes(k)));
    /* the asset pack's coverage */
    const man=boot.P.PACKED+'mg/manifest.json';   /* split repo: the committed pack manifest */
    if(fs.existsSync(man)){const J=JSON.parse(fs.readFileSync(man,'utf8')),ids=[...new Set(Object.keys(J.keys||{}).map(k=>k.slice(2).split('|')[0]))];
      const used=new Set([...X.HR_MG_ROLES.map(r=>X.HR_MG_ROLE[r].id).filter(Boolean),'mg_char','face_husk']);
      ok('mg_assets: every packed id is used by a role or an add ('+ids.join(',')+'), each has a basecolor, no orphans',ids.length>0&&ids.every(i=>used.has(i))&&ids.every(i=>(J.keys||{})['m:'+i+'|b']));
      const live=J.file==='mg_assets.gen.js'||(!J.file&&fs.existsSync(boot.BUILD+'mg_assets.gen.js'));
      ok('the pack ('+(J.file||'mg_assets.gen.js')+') is <= 2.4 MB (v6.3 MZ: 2.2 -> 2.4 keeps the hide, brow and flesh albedo at 1024)'+(live?' and appended to hrassets.js (hrMgAssets defined there)':' (pending the tA_static pin: not in the build yet)'),
        (J.fileBytes||0)<=2400000&&(!live||fs.readFileSync(boot.BUILD+'hrassets.js','latin1').indexOf('function hrMgAssets(')>0));}
    else skip('mg_assets coverage','no art packed yet (flat-colour + procedural fallbacks)');
    const P=X.HR_MG_PRE;
    ok('five grade presets with every field the HR1 hook reads (keyM key sky gnd hemi fog hor zen near far exp bloom haze amb dark)',
      ['ash','ember','blood','eclipse','dawn'].every(k=>P[k]&&['keyM','hemi','near','far','exp','bloom','haze','amb','dark'].every(f=>typeof P[k][f]==='number')&&
        ['key','sky','gnd','fog','hor','zen'].every(f=>Array.isArray(P[k][f])&&P[k][f].length===3)));
    ok('the Eclipse eats the key (x0.05), kills the stars and moon (dark 1), fogs 8-55 m; Ember/Blood keep exposure >= 1.0',
      P.eclipse.keyM===0.05&&P.eclipse.dark===1&&P.eclipse.near===8&&P.eclipse.far===55&&P.ember.exp>=1&&P.blood.exp>=1);});

  /* ================= OG: nothing Hyperreal ================= */
  boot.world(V,'m4hr','1337',step);
  V.GR.dayCycle=false;V.setTime(0.3);
  sec('og',()=>{
    ok('in OG MGREG.hrOn() is false and the grade/sun are idle',V.MGREG.hrOn()===false&&X.hrMgSun()===1);
    boot.bite(V,step);const e=wake(1);
    ok('in OG the boss gets the OG skin (no M4 material on him)',!!e&&X.hrMgSkinOf(e)==='og'&&!meshesOf(e.mesh).some(m=>[].concat(m.material).some(q=>q&&q.userData&&q.userData.mgRole)));
    ok('in OG makeMobMesh(mghusk,{hr:1}) is the OG body (no Hyperreal body while the cast is off)',!V.hrEnt.mk('mghusk',{hr:1}).hrM);});

  /* ================= Hyperreal on: the boss swaps in ================= */
  await V.setQuality(2);
  const okHR=await V.setPack('hr',{only:['light','ents']});
  ok('setPack(hr,{only:[light,ents]}) with the boss live',okHR===true&&V.getHRE().on===true&&V.getHRL().on===true);
  step(3);
  let e=bossE();
  await asec('swap in',async()=>{
    ok('MGREG.hrOn() is true while the cast is live',V.MGREG.hrOn()===true);
    ok('the live boss swapped to the Hyperreal skin on the pack event (same entity, new rig)',!!e&&X.hrMgSkinOf(e)==='hr'&&e.mgSkin==='hr'&&!!e.mgRig&&!!e.mgRig.hrMats&&inScene(e.mesh)&&HI().swaps>=1);
    const r=e.mgRig,mine=mineSet(r),ms=meshesOf(r.root);
    ok('his meshes wear M4 materials (o.mats when M3 uses them, else the role fallback) and own their shadow flags (userData.hr)',
      ms.length>0&&ms.some(m=>[].concat(m.material).some(q=>mine.has(q)))&&ms.every(m=>m.userData.hr===1));
    const L=boot.lights(r.root);
    ok('exactly ONE PointLight in the Hyperreal rig, flagged mgLight, NOT hr-tagged (the foreign-light mirror carries it)',L.length===1&&L[0].userData.mgLight===1&&!L[0].userData.hr);
    step(2);
    ok('Hyperreal hid his light before a frame and mirrors it (HR2 copies its distance, not 24)',L[0].visible===false&&V.getHRL().foreign>=1&&
      V.getHRL().mirrorI>0&&near(V.hrLState().HRL.mirror.distance,L[0].distance));
    ok('his M4 materials are hr-tagged (never adopted by the legacy linear patch)',[...mine].every(q=>q.userData.hr===1&&!q.userData.hrLin));
    ok('at High his body casts the arena\'s biggest shadow (castShadow on opaque meshes)',ms.some(m=>m.castShadow===true));
    ok('the rest copy (mgRest/mgRestN) sits on every geometry that has positions + normals (chain-swept skins keep their texture)',
      ms.filter(m=>m.geometry.attributes&&m.geometry.attributes.position&&m.geometry.attributes.normal).every(m=>!!m.geometry.attributes.mgRest&&!!m.geometry.attributes.mgRestN));});

  /* ================= the skin drive ================= */
  sec('drive',()=>{e=bossE();const r=e.mgRig,M=r.hrMats.set,A=MGA(),own=!r.mgEmissive;
    const C=X.HR_MG_CRACK;A.round=1;A.vuln=0;A.dead=0;A.hurt=0;r.update(0.016,A);
    const em=M.hide.emissive;
    if(own)ok('round I: the hide\'s cracks glow ember orange (M4 animates emissive: the builder does not)',near(em.r,C[1][0],0.02)&&near(em.g,C[1][1],0.02)&&near(em.b,C[1][2],0.02)&&M.hide.emissiveIntensity>0);
    else skip('M4 hue','M3 animates emissive on the HR mats (r.mgEmissive)');
    const rim1=M.hide.userData.mgU.uMgRim.value.r;A.round=3;r.update(0.016,A);
    if(own)ok('round III: white-gold cracks (the sun leaking out of him)',near(M.hide.emissive.r,C[3][0],0.02)&&near(M.hide.emissive.b,C[3][2],0.02));
    ok('round III: a white-gold fresnel rim (blue channel lit, unlike round I\'s ember rim)',M.hide.userData.mgU.uMgRim.value.b>0.2*M.hide.userData.mgU.uMgRim.value.r&&rim1>0);
    if(own){A.round=1;A.vuln=1;r.update(0.016,A);const g=M.hide.emissive.g;A.vuln=0;r.update(0.016,A);
      ok('an open weak point warms the cracks toward gold',g>M.hide.emissive.g);
      const i0=[];for(let k=0;k<40;k++){r.update(0.05,A);i0.push(M.hide.emissiveIntensity);}
      ok('the cracks pulse with his heart (emissive intensity varies over a beat)',Math.max(...i0)-Math.min(...i0)>0.3);}
    A.dead=0.17;r.update(0.016,A);const gr=M.hide.userData.mgU.uMgGrow.value;
    ok('the death (M2: dead = scene s / 8): by the burst (1.4 s) light cracks cover the hide and the crust (uMgGrow)',gr>0.8&&M.crust.userData.mgU.uMgGrow.value>0.8);
    A.dead=0.45;r.update(0.016,A);
    ok('after the burst the sun has left him: the blaze drains (uMgGrow and the gain drop)',M.hide.userData.mgU.uMgGrow.value<0.4&&M.hide.userData.mgU.uMgEmK.value<0.5);
    A.dead=1;r.update(0.016,A);
    ok('after the burst the hide goes dark (emissive gain 0) and his light goes out',M.hide.userData.mgU.uMgEmK.value<1e-6&&r.light.intensity<1e-6);
    A.dead=0;A.round=1;r.update(0.016,A);
    if(r.joints&&r.joints.contents){const keep=A.belly.items;A.belly.items=[{k:'cow',id:'cow'}];r.update(0.016,A);   /* no frame between: M2 rewrites MGA */
      ok('the belly window holds the real cast cow in Hyperreal (M3 rebuilds the contents, M4 swaps the OG body)',!!r.hrM4.bellyH&&r.hrM4.bellyH.length===1&&
        r.joints.contents.children.length>=1);A.belly.items=keep||[];step(2);r.update(0.016,A);}
    else skip('belly cast model','no contents joint (M3 on its stub)');
    ok('his light in Hyperreal follows MGA.light with the round gain (the mirror makes it the Eclipse key in R3)',r.light.intensity>(A.light.i||1.6));});

  /* ================= the grade ================= */
  sec('grade',()=>{const L=MGL();
    tpTo(1000.5+150,1000.5);
    ok('beyond 140 m hrMgGrade is null (v6.2 character for character) and the sun disc is whole',X.hrMgGrade(0.05,false)===null&&X.hrMgSun()===1);
    step(2);ok('beyond 140 m hrSky\'s arena weight is the v6.2 one (0 out here)',V.getHRL().wA===0);
    tpTo(1000.5+90,1000.5);const g90=X.hrMgGrade(0.05,true),w90=g90&&g90.w,k90=g90&&g90.keyM,d90=g90&&g90.dark,K=X.HR_MG.g.keyM,D=X.HR_MG.g.dark;
    ok('keyM and dark arrive weighted (the hook applies them unweighted)',near(k90,1+(K-1)*w90,1e-9)&&near(d90,D*w90,1e-9)&&k90>K);
    boot.bite(V,step);const g30=X.hrMgGrade(0.05,true);
    ok('the weight ramps from 140 m to 40 m (partial at 90 m, full inside 40 m)',w90>0.1&&w90<0.9&&!!g30&&near(g30.w,1,1e-6));
    const keep={live:L.live,round:L.round,ecl:L.eclipse,dawn:L.dawn,dark:L.dark};
    L.live=0;L.eclipse=0;L.dawn=0;L.dark=0;const ga=X.hrMgGrade(0.05,true);
    ok('asleep: the Ash preset (overcast ash, fog 16-110 m)',X.HR_MG.pre==='ash'&&near(ga.near,X.HR_MG_PRE.ash.near)&&near(ga.far,X.HR_MG_PRE.ash.far)&&near(ga.fog[0],X.HR_MG_PRE.ash.fog[0]));
    L.live=1;L.round=1;const g1=X.hrMgGrade(0.05,true);
    ok('round I: the Ember preset (ember fog, furnace bounce, bloom x1.6)',X.HR_MG.pre==='ember'&&near(g1.fog[0],X.HR_MG_PRE.ember.fog[0])&&near(g1.bloom,1.6)&&g1.exp>=1);
    L.round=2;const g2=X.hrMgGrade(0.05,true);
    ok('round II: the Blood preset (blood fog 12-90 m, bloom x1.8, haze x2)',X.HR_MG.pre==='blood'&&near(g2.near,12)&&near(g2.bloom,1.8)&&near(g2.haze,2));
    L.round=3;L.eclipse=1;L.dark=1;const g3=X.hrMgGrade(0.05,true);
    ok('round III: the Eclipse (zenith #050208, fog 8-55 m, key x0.05, no stars or moon)',near(g3.zen[2],X.HR_MG_PRE.eclipse.zen[2])&&near(g3.near,8)&&near(g3.far,55)&&
      near(g3.keyM,0.05)&&near(g3.dark,1));
    ok('the sun disc is eaten under the Eclipse (hrMgSun 0) and only there',X.hrMgSun()<1e-6);
    step(2);const H=V.getHRL();
    ok('hrSky applies it through the HR1 hook (fog 8-55 m, the weight from hrMgGrade)',near(H.fog.n,8,0.01)&&near(H.fog.f,55,0.01)&&near(H.wA,1,1e-6));
    L.dawn=1;L.flash=1;const gd=X.hrMgGrade(0.05,true);
    ok('the Dawn: the flash over-exposes, golden hour follows',gd.exp>X.HR_MG_PRE.dawn.exp*2&&near(gd.fog[0],X.HR_MG_PRE.dawn.fog[0]));
    L.flash=0;
    Object.assign(L,{live:keep.live,round:keep.round,eclipse:keep.ecl||0,dawn:keep.dawn||0,dark:keep.dark||0});X.hrMgGrade(0.05,true);});

  sec('air',()=>{boot.bite(V,step);step(3);const a=V.hrMgAir();
    ok('the air of the Bite: one Points field of motes around Dan while the grade is up (by tier), hr-tagged, no light',a.on&&a.vis&&a.n>=120&&a.op>0);
    tpTo(1000.5+170,1000.5);step(2);
    ok('beyond 140 m the motes are hidden',!V.hrMgAir().vis);boot.bite(V,step);step(2);});

  /* ================= the swap back to OG and in again ================= */
  await asec('swap out',async()=>{e=bossE();const r=e.mgRig,mats=r.hrMats.list.slice(),lc=V.tpLightCount?V.tpLightCount().point:0;
    ok('setPack(og) with the boss live resolves',await V.setPack('og')===true);step(2);
    ok('after disable the same boss wears the OG rig with ONE light (visible again), the HR rig is gone',bossE()===e&&X.hrMgSkinOf(e)==='og'&&!r.root.parent&&
      boot.lights(e.mesh).length===1&&boot.lights(e.mesh)[0].visible!==false&&!inScene(r.root));
    ok('the HR rig\'s materials were disposed (per-instance), its embers too',r.hrMats.disposed===true&&r.hrM4.gone===1&&!r.hrM4.em);
    ok('the air field is freed on OG',!V.hrMgAir().on);
    ok('the grade is idle in OG (hrSky never runs) and hrOn() is false',V.MGREG.hrOn()===false);
    ok('setPack(hr) again: the boss swaps back in',await V.setPack('hr',{only:['light','ents']})===true);step(2);
    ok('one light again, Hyperreal skin, light count unchanged by the swap',X.hrMgSkinOf(bossE())==='hr'&&boot.lights(bossE().mesh).length===1&&(!V.tpLightCount||V.tpLightCount().point===lc||lc===0));});

  /* ================= the adds ================= */
  await asec('adds',async()=>{
    const hk=V.hrEnt.mk('mghusk',{hr:1}),bl=V.hrEnt.mk('mgbloat',{hr:1}),mo=V.hrEnt.mk('mgmorsel',{hr:1}),ey=V.hrEnt.mk('mgeye',{hr:1});
    ok('mgMobMesh gives his adds Hyperreal bodies while the cast is live (Husk, Bloater, Morsel, eye)',!!hk.hrM&&!!bl.hrM&&!!mo.hrM&&!!ey.hrM&&hk.G.userData.mgHrM===hk.hrM);
    ok('the Husk is the zombie cast charred: per-instance hr-tagged clones with ember cracks, face_husk on the face when packed',
      hk.hrM.mgOwn.length>0&&hk.hrM.mgOwn.every(m=>m.userData.hr===1&&m.emissiveIntensity>0));
    ok('the Bloater is the creeper cast swollen (scaled), the Morsel bites with enamel teeth, the eye wears mg_eye',
      bl.hrM.hr.root.scale.x>1.2&&meshesOf(mo.G).length>=10&&meshesOf(ey.G).some(m=>m.material&&m.material.userData&&m.material.userData.mgRole==='eye'));
    ok('no add body hands a material with authored emissive to the generic hurt flash (mats empty)',[hk,bl,mo,ey].every(q=>q.mats.length===0));
    for(const q of [hk,bl,mo,ey])X.hrMgAddFree(q.hrM);
    /* a live add built OG (as a brain might) is swapped in place, stepped once a frame, swapped back on OG, freed on death */
    const T=V.MOBT.mghusk,b=bossE(),og=V.MGREG.mesh.mghusk?V.MGREG.mesh.mghusk(new THREE.Group(),[],{}):null;
    if(!og){skip('add reconcile','no OG husk body');return;}
    const P=V.P,a={t:'mob',mob:true,mt:'mghusk',hp:T.hp,hw:T.hw,h:T.h,hostile:true,x:P.x+3,y:P.y,z:P.z+3,vx:1,vy:0,vz:0,onGround:true,yaw:0,mode:'chase',tT:0,dir:0,atkT:0,hurtT:0,
      burnAcc:0,fuse:0,hissed:false,mesh:og.G,legs:og.legs||[],mats:og.mats||[],hrM:null,anim:0,pkeep:1};
    og.G.position.set(a.x,a.y,a.z);S.add(og.G);V.entities.push(a);step(2);
    const H=a.mesh.userData&&a.mesh.userData.mgHrM;
    ok('a live OG add is swapped to its Hyperreal body in place (the OG mesh left the scene)',!!H&&!inScene(og.G)&&inScene(a.mesh));
    const n0=(require('../lib/fake_models.js').FAKE.inst.find(q=>q.root===H.hr.root)||{updates:0}).updates;step(3);
    const n1=(require('../lib/fake_models.js').FAKE.inst.find(q=>q.root===H.hr.root)||{updates:0}).updates;
    ok('its body is stepped every frame from MGREG.tick (never twice a frame)',n1-n0>=1&&n1-n0<=3&&H.mgF>=0);
    await V.setPack('og');step(3);
    ok('on OG it gets an OG body back and the Hyperreal body is freed',!(a.mesh.userData&&a.mesh.userData.mgHrM)&&H.mgFreed===1);
    await V.setPack('hr',{only:['light','ents']});step(3);
    const H2=a.mesh.userData&&a.mesh.userData.mgHrM;
    ok('Hyperreal again: the add is Hyperreal again',!!H2&&H2!==H);
    a.dead=true;if(a.mesh&&a.mesh.parent)a.mesh.parent.remove(a.mesh);step(2);
    ok('a dead add\'s Hyperreal body is freed (its clones disposed)',H2.mgFreed===1);});

  /* ================= the prewarm spare ================= */
  await asec('prewarm',async()=>{
    const Mg=V.getMALG(),met0=Mg.met;Mg.met=0;                 /* not met: nothing spawns him in the idle while we look */
    boot.lip(V,step);if(V.MGREG.fight&&V.MGREG.fight.dormant)V.MGREG.fight.dormant('skip');
    const b=bossE();if(b){V.mgCore().removeEnt(b);V.mgCore().MGF.boss=null;}
    X.hrMgFreeSpare();X.HR_MG.backoff=0;X.HR_MG.texOK=1;step(4);
    const hi=HI();
    ok('within 70 m in the height band, not live: one spare rig is built and warmed (TP.warm), off the scene',hi.spare===true&&hi.warmN>=1&&!inScene(X.HR_MG.spare.root));
    const sp=X.HR_MG.spare,b0=HI().builds;
    const e2=V.mgSpawnBoss(1);
    ok('the spawn takes the spare (no build during the intro), skin hr, one light',e2.mgRig===sp&&HI().builds===b0&&X.hrMgSkinOf(e2)==='hr'&&boot.lights(e2.mesh).length===1&&!X.HR_MG.spare);
    V.mgCore().removeEnt(e2);V.mgCore().MGF.boss=null;Mg.met=met0;});

  /* ================= the rig.js contract ================= */
  sec('model',()=>{
    ok('install loaded hrLoadMModels(): HR.MODELS.malgorath exists',HI().model===true&&typeof global.HR.MODELS.malgorath==='function');
    const m=global.HR.MODELS.malgorath();
    ok('HR.MODELS.malgorath() follows the rig.js contract {root, update(dt,t,s), mats, deathDur} on M3\'s skeleton',!!m&&!!m.root&&typeof m.update==='function'&&
      Array.isArray(m.mats)&&m.mats.length>=8&&m.deathDur===14&&!!m.rig);
    let thr='';try{m.update(0.016,0,{speed:0,attack:0,hurt:0.5,dead:0});m.update(0.016,0,{mg:MGA()});}catch(err){thr=err.message;}
    ok('its update takes a plain rig.js s (preview) and the shared MGA'+(thr?' ('+thr+')':''),!thr);
    if(m.rig)m.rig.dispose();
    ok('nothing failed inside the HR block during the suite (hr:* events)',!V.mgTel().events.some(x=>/^fail:hr:/.test(x))&&HI().fails===0);});
  await V.setPack('og');
});
