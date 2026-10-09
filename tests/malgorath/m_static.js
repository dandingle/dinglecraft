/* m_static.js (lead, gate x1): the v6.3 Malgorath Update statics (the Malgorath plan section 9.1).
   ids (no new block id, no new tile, item 365 only), mob types, MALG / MG_K / MGREG frozen shapes, MGEX hygiene, PART 57 placement +
   size + file order, the PART 57 HR block (full builds only) placement + size, declarations vs everything (PARTs 47-50 included),
   package name prefixes, top-level determinism, the core-slice rules of the texture-pack statics, every hooks_M*.py anchor proven
   unique in both assembled texts and far from PARTs 47-50 (m_anchors.py), every replacement present once, no PART 57 text repeating
   another stage's hook marker, the v2.1 boss gone and CUT/WIN kept, PARTs 47-50 in the build verbatim (to v6.7: md5-pinned to the shipped v6.2), stub markers +
   interface parity, head.html, version + notes + help, the gate's v6.3 rules.
   Split repo (v6.3): sources are src/malgorath/ (+ hr/); m_anchors.py, the hooks_M*.py marker checks and the _stub/ checks are retired
   (18 checks: folded sources, no splice, no stub build); the gate rules are checked against tests/gate.json + scripts/guards.json +
   tests/fixtures/shipped.json (docs/PARITY.md lists every change).
   v6.8: PARTs 47-50 (src/features/part47-50.js) are ordinary sources; their v6.2 md5 pin is retired and the check that held it
   now proves they reach the build verbatim and in order. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const V=boot({});
boot.run(async()=>{
  const D=V.DEFS,B=V.B,MT=V.MOBT,I=V.mgInfo(),C=V.mgCore();
  const G=fs.readFileSync(boot.BUILD+'game.js','utf8'),HH=fs.readFileSync(boot.BUILD+'head.html','utf8');
  const full=G.indexOf('/* ---- PART 54: t0_contract.js ---- */')>=0,ROOT=boot.ROOT,GD=boot.SRC.mg;
  const md5=b=>crypto.createHash('md5').update(b).digest('hex');
  const strip=t=>t.replace(/\/\*[\s\S]*?\*\//g,'');
  const decl=t=>{const out=[];const re=/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:var|let|const)\s+([A-Za-z_$][\w$]*)/gm;let m;while((m=re.exec(t)))out.push(m[1]||m[2]);return out;};

  /* ---- ids, tiles, names (plan 2.1) ---- */
  const free=[];for(let i=1;i<256;i++)if(!D[i])free.push(i);
  ok('no new block id: the free ids below 256 are still exactly 212, 217, 218, 219, 248, 249',free.join()==='212,217,218,219,248,249');
  const st=Object.keys(D).map(Number).filter(i=>i>=256&&i<10000);
  ok('one new static item: 365 is the highest static id; 309 and 339 stay unused',Math.max(...st)===365&&!D[309]&&!D[339]);
  const J=D[365];
  ok("item 365 is Malgorath's Jaw: a sword (dmg 10, dur 900), stack 1, hidden from the palette, off-atlas icon painter",!!J&&J.item&&J.name==="Malgorath's Jaw"&&J.tool&&J.tool.type==='sword'&&
    J.tool.dmg===10&&J.tool.dur===900&&J.stack===1&&J.hide===true&&typeof J.ipaint==='function'&&V.IT.MG_JAW===365&&V.MGC.JAW===365);
  ok("no other def is named Malgorath's Jaw (bots resolve names)",Object.keys(D).filter(i=>D[i].name==="Malgorath's Jaw").length===1);
  const Cc=V.crCore();
  ok('no new atlas tile (tn 298 = 285 + 13 creativity tiles; no mg_ tile)',Cc.tn===285+V.CR_TILES.length&&!Object.keys(Cc.Tl).some(n=>/^mg/.test(n)));
  const dm=MT.demon;
  ok('MOBT.demon: hp 300 (one round), boss, hostile, xp 0, hw 2.5, h 14, kbRes 1, pnc 1, mg boss, body/legc unchanged (the egg tile)',dm.hp===300&&dm.boss&&dm.hostile&&dm.xp===0&&
    dm.hw===2.5&&dm.h===14&&dm.kbRes===1&&dm.pnc===1&&dm.mg==='boss'&&dm.body==='#3d1014'&&dm.legc==='#1a1416');
  const mts={mgeye:'eye',mgpart:'part',mgmorsel:'add',mghusk:'add',mgbloat:'add'};
  ok('his five other mob types exist with their mg kind and pnc (never counted, never despawned): '+Object.keys(mts).join(' '),Object.keys(mts).every(k=>MT[k]&&MT[k].mg===mts[k]&&MT[k].pnc===1&&!MT[k].boss));
  ok('no other mob type starts with mg or carries an mg kind',Object.keys(MT).filter(k=>MT[k].mg).sort().join()===['demon',...Object.keys(mts)].sort().join()&&Object.keys(MT).filter(k=>/^mg/.test(k)).length===5);
  ok('spawn egg 264 keeps egg:demon and its name (old inventories)',D[264].egg==='demon'&&D[264].name==='MALGORATH Spawn Egg');
  ok('MOB_NAME rows: a Morsel, a Husk, a Bloater; demon stays Malgorath',C.MOB_NAME.mgmorsel==='a Morsel'&&C.MOB_NAME.mghusk==='a Husk'&&C.MOB_NAME.mgbloat==='a Bloater'&&C.MOB_NAME.demon==='Malgorath');
  ok("the compass keeps 7 targets: [5] demon is Malgorath's Bite, [6] pdoor",!!C.CMP_DEFS&&C.CMP_DEFS.length===7&&C.CMP_DEFS[5].k==='demon'&&C.CMP_DEFS[5].n==="Malgorath's Bite"&&C.CMP_DEFS[6].k==='pdoor');

  /* ---- frozen shapes (plan 4.2) ---- */
  ok('MALG schema (bible 1.1 + spill)',Object.keys(V.mgDefault()).join()==='v,met,round,dead,kills,deaths,gut,hat,heads,offer,oldKill,seen,jaw,migr,spill');
  const KN='BAR,HIDE,HIDE_BUDGET,TONGUE,LASER_WEAK,BOOM_WEAK,BOT,BOT_FLOOR,BOT_WIN,CAP_HIT,GATE,DAN_TOKENS,PIERCE,CHOMP,STEAL_CAP,BILE,BILE_T,GUT_FALL_CAP,PLUCK,PLUCK_DMG,DAZE,AWAY_REGEN,ABANDON,GRACE,GAP,GAP_LOW,COMMIT,LOCK_MIN,SLAP_LOCK,CHOMP_LOCK,MIN_TELL,LEAD,IN_RING,RUBBER,DEATH_MIN_T,DEATH_MIN_DMG,DEATH_GRACE,GLOAT,BELCH,BOT_BELCH,HEADS,ADDS_CAP';
  const K=V.getMGK(),kk=Object.keys(K);
  ok('MG_K holds every frozen knob name (packages may add names in their own prefix only)',KN.split(',').every(n=>n in K)&&kk.every(n=>KN.split(',').includes(n)||/^(M1|M2|M3|M4)_/.test(n)));
  ok('MG_K.BAR is 300 (test.js pins MOBT.demon.hp) and mgSetK refuses unknown names',K.BAR===300&&V.mgSetK('NOT_A_KNOB',1)===false);
  const RK='stamp,layoutAt,world,fight,rig,mesh,mesh_hr,fx,hrOn,tick,onReset,onLoad,onRound,onBoot,onFar,onNear,music';
  ok('MGREG holds exactly the frozen slots',Object.keys(V.MGREG).join()===RK);
  ok('the geometry on seed-independent maths: Rw 36 at the cusps, 38.5 at the arcs; mgNoStruct inside 60 m only',Math.abs(V.mgRw(0)-36)<1e-9&&Math.abs(V.mgRw(Math.PI/11)-38.5)<1e-9&&V.mgNoStruct(1059,1000)&&!V.mgNoStruct(1061.5,1000.5));
  ok('MGS is the 49 overworld chunk keys of the site (59..65 x 59..65)',C.MGS.size===49&&C.MGS.has('59,59')&&C.MGS.has('65,65')&&!C.MGS.has('66,62'));

  /* ---- MGEX hygiene ---- */
  const mgx=V.MGEX||null,MX=V.__mgx;
  ok('__mgx is the MGEX export object',!!MX&&MX.__mgx===MX);
  const shadow=Object.keys(MX).filter(k=>V[k]!==MX[k]);
  ok('every MGEX key reaches __vox unshadowed'+(shadow.length?' ('+shadow.join(',')+')':''),shadow.length===0);
  const others=[V.__crx,V.__pgx,full?V.__tpx:null].filter(Boolean),clash=Object.keys(MX).filter(k=>others.some(o=>k in o));
  ok('MGEX shares no key with CREX, PGEX'+(full?' or TPEX':'')+(clash.length?' ('+clash.join(',')+')':''),clash.length===0);
  ok('the __vox literal spreads MGEX right after PGEX (TPEX and core keys win; CREX/PGEX keep their place)',G.includes('window.__vox={...CREX,...PGEX,...MGEX,'));

  /* ---- PART 57 placement, size, files ---- */
  const i57=G.indexOf('/* ---- PART 57: m0_contract.js ---- */'),i56=G.indexOf('/* ---- PART 56: c0_contract.js ---- */');
  ok('PART 57 starts with m0_contract.js and sits immediately before PART 56',i57>0&&i56>i57&&G.indexOf('/* ---- PART 57: ')===i57&&G.lastIndexOf('/* ---- PART 57: ',i56)>=i57&&
    G.indexOf('/* ---- PART 57: ',i56)<0);
  const p57=G.slice(i57,i56),b57=Buffer.byteLength(p57);
  ok('PART 57 code is '+b57+' B (<= 600,000; v6.3 MZ: raised from 400,000, all four packages real are ~431 KB)',b57<=600000);
  const files=(p57.match(/\/\* ---- PART 57: [^ ]+ ---- \*\//g)||[]).map(s=>s.slice(17,-8));
  ok('PART 57 files in package order (m0 first, then m1, m2, m3 or their stubs): '+files.join(' '),files[0]==='m0_contract.js'&&files.every((f,i)=>/^m[0-3]_/.test(f)&&(i===0||+f[1]>=+files[i-1][1])));
  const iH=G.indexOf('/* ---- PART 57 HR: '),iLM=G.indexOf('\nfunction hrLoadModels(){'),iCast=iLM<0?-1:G.lastIndexOf('\n',iLM-1);   /* the cast loader's comment line (its wording may change) */
  let pH='';
  if(full){pH=iH>0&&iCast>iH?G.slice(iH,iCast):'';
    ok('the PART 57 HR block sits right before the Hyperreal cast, after every PART 54 file, and ends with hrLoadMModels()',iH>G.indexOf('/* ---- PART 54: tC_corpse.js ---- */')&&iCast>iH&&/function hrLoadMModels\(\)\{\n[\s\S]*\n\}\n$/.test(pH));
    ok('the HR block is '+Buffer.byteLength(pH)+' B (<= 700,000) and holds m4 files or the m4 stub',Buffer.byteLength(pH)<=700000&&/\/\* ---- PART 57 HR: (m4_[A-Za-z0-9_]+|m4_stub)\.js ---- \*\//.test(pH));}
  else{ok('a DC_NO_TEX build has no PART 57 HR block (and no HR hooks)',iH<0&&G.indexOf('hrMgGrade(')<0);}

  /* ---- declarations, prefixes, determinism, core-slice rules ---- */
  const coreTxt=G.slice(0,i57)+G.slice(i56).replace(pH,''),cd=new Set(decl(coreTxt)),pd=decl(p57),dd=pd.filter((n,i)=>cd.has(n)||pd.indexOf(n)!==i);
  ok('PART 57 declares no top-level name anything else declares (PARTs 47-50 included), none twice'+(dd.length?' ('+[...new Set(dd)].join(',')+')':''),dd.length===0);
  if(full){const hd=decl(pH),all=new Set(decl(G.replace(pH,''))),hdup=hd.filter((n,i)=>all.has(n)||hd.indexOf(n)!==i);
    ok('the HR block declares no top-level name anything else declares, none twice'+(hdup.length?' ('+[...new Set(hdup)].join(',')+')':''),hdup.length===0);}
  const seg=(t,f)=>{const a=t.indexOf('/* ---- PART 57'+(f[1]==='4'?' HR':'')+': '+f+' ---- */');if(a<0)return '';const b=t.indexOf('/* ---- PART 57',a+10);return t.slice(a,b<0?t.length:b);};
  const PFX={'0':/^(MG[A-Z_]*|MALG|mg[A-Z]\w*|tickMalg|IT_MG_JAW)$/,'1':/^(MG1\w*|mg1\w*)$/,'2':/^(MG2\w*|mg2\w*)$/,'3':/^(MG3\w*|mg3\w*)$/,'4':/^(HR_MG\w*|hrMg\w*|hrLoadMModels)$/};
  const badN=[];for(const f of files.concat(full?(pH.match(/\/\* ---- PART 57 HR: [^ ]+ ---- \*\//g)||[]).map(s=>s.slice(20,-8)):[])){const d=f[1],s=f[1]==='4'?seg(pH,f):seg(p57,f);
    for(const n of decl(s))if(!PFX[d].test(n))badN.push(f+':'+n);}
  if(full&&pH)for(const n of decl(pH.slice(pH.indexOf('function hrLoadMModels(){'))))if(n!=='hrLoadMModels')badN.push('hrLoadMModels:'+n);
  ok('every PART 57 top-level name is in its owner\'s prefix (m0 MG*/mg*, m1 mg1, m2 mg2, m3 mg3, m4 hrMg/HR_MG)'+(badN.length?' ('+badN.slice(0,6).join(' ')+')':''),badN.length===0);
  const top=t=>strip(t).split('\n').filter(l=>/^\S/.test(l)&&!/^(function |async function |\}|\)|\])/.test(l));
  const bad=top(p57+'\n'+pH).filter(l=>/Math\.random|Date\.now|performance\.now|\bfetch\s*\(|new\s+THREE\./.test(l));
  ok('no Math.random, Date.now, performance.now, fetch or THREE constructor in a top-level statement of PART 57 or its HR block'+(bad.length?' ('+bad[0].slice(0,60)+')':''),bad.length===0);
  const s57=strip(p57);
  ok('PART 57 never names PART 54 state (TP, TPEX, HRE, HRL, HRW, tpRegister, tpOn, hrSky...) and keeps the core-slice rules (no TP.hr&&HRL.on, no makeMobMesh({hr:1}))',
    !/\b(TP|TPEX|HRE|HRL|HRW|HR_MOB|HR_CAST|tpRegister|tpOn|hrSky|hrTorches|hrRender|hrResize|hrShadowify|hrApplyShadows)\b/.test(s57)&&!/TP\.hr&&HRL\.on/.test(s57)&&!/makeMobMesh\([^)]*\{hr:1\}\)/.test(s57));
  ok('PART 57 never names purgatory state at top level (MP, PREG, PGEX are runtime-only there)',!strip(p57).split('\n').some(l=>/^\S/.test(l)&&/\b(MP|PREG|PGEX|CRREG|CRF)\b/.test(l)&&!/^(function |var |\}|\))/.test(l)));

  /* ---- hooks: RETIRED at the split (6 checks: m_anchors.py ran, the 65/62 reps, anchors unique, far from the block, every hooks_M0.py
     replacement present, no earlier stage's hook marker repeated in PART 57). The hooks are folded into src/ as normal code. ---- */

  /* ---- the v2.1 boss is gone, CUT/WIN are kept ---- */
  const gone=['mkDemonMesh','demonBrain','stampDemonArena','tickDemon','demonSkinTex','demonCrackTex','_dSkin','_dCrack','demonToastT'];
  const left=gone.filter(n=>new RegExp('\\b'+n+'\\b').test(G));
  ok('the v2.1 boss is gone everywhere (skin, mesh, brain, arena stamp, watcher)'+(left.length?' ('+left.join(',')+')':''),left.length===0);
  ok('the Demonblade grant and the v2.1 WIN path are gone from bossLoot',G.indexOf('DEMON HORNS unlocked in the DINGLE STORE')<0&&G.indexOf("  if(e.mt==='demon')return;\n  if(e.mt==='dking'){")>0);
  const keep=['DEMON_X','DEMON','demonAY','CUT','CUT_LINES','CUT_END','startCut','setCutLine','cutSay','updateCut','endCut','cutCam','winOpen','WIN','tickWin','openWin','closeWin','winHome'];
  const once=n=>(G.match(new RegExp('^(?:const|let|var|function)\\s+'+n.replace('$','\\$')+'\\b','gm'))||[]).length+(n==='DEMON_X'?0:0);
  ok('kept in place: DEMON_X/Z, DEMON, demonAY, the CUT system and the WIN screen are each declared once',keep.every(n=>once(n)===1||(n==='DEMON_X'&&/const DEMON_X=1000,DEMON_Z=1000;/.test(G))));
  ok('purgatory\'s generalised CUT lines are intact once (P0-50..54)',G.split('const CL=CUT.script?CUT.script.lines:CUT_LINES;').length===2&&G.split('if(CUT.script&&CUT.script.cam){CUT.script.cam(CUT.t);return;}').length===2&&
    G.split("if(CUT.script){const s=CUT.script;CUT.script=null;const el=$('cut');if(el)el.style.display='none';if(s.onEnd)s.onEnd();return;}").length===2);
  /* PARTs 47-50: ordinary sources since v6.8 (the v6.2 md5 pin is retired: the Watcher and the Reaper were cut); they reach the build verbatim, once, in order */
  {const p4=['part47','part48','part49','part50'].map(n=>fs.readFileSync(boot.SRC.feat+n+'.js','utf8')).join('');
   ok('PARTs 47-50 (src/features/part47-50.js) are in the build verbatim, once, in order',p4.length>0&&G.split(p4).length===2);}

  /* ---- stubs: markers and interface parity: RETIRED at the split (12 checks: no _stub/ files, no stub build) ---- */
  ok('mgInfo().stubs names exactly the packages still on their stubs ('+I.stubs+')',[...'123'].every(d=>(I.stubs.indexOf(d)>=0)===!fs.readdirSync(GD).some(f=>new RegExp('^m'+d+'_').test(f))||String(process.env.DC_MG_STUB||'').indexOf(d)>=0));

  /* ---- head.html, version, notes, help ---- */
  ok('head.html: #mgbar (name + canvas), #mgedge and #mgin once each, after #boss',['mgbar','mgbarname','mgbarc','mgedge','mgin'].every(id=>HH.split('id="'+id+'"').length===2)&&HH.indexOf('id="mgbar"')>HH.indexOf('id="boss"'));
  /* split repo (bump-safe): VER is the build's version (6.3 at the split) and NEW the patch-log entries newer than v6.3 (0 at v6.3) */
  const VER=V.GAME_VERSION,NEW=Math.max(0,V.PATCH_LOG.findIndex(e=>e.v==='6.3')),vgt=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);return x[0]>y[0]||(x[0]===y[0]&&x[1]>y[1]);};
  ok('the WIN copy is the v6.3 one (MALGORATH IS UNDONE. / DINGLECRAFT '+VER+') and the old 2.1 lines are gone',HH.includes('<div id="winsub">MALGORATH IS UNDONE.</div>')&&HH.includes('DINGLECRAFT '+(NEW?V.RELEASE_LABEL:VER)+'. The dirt remembers you.')&&
    HH.indexOf('MALGORATH IS SLAIN')<0&&HH.indexOf('three\n      phases and a speech')<0&&HH.includes("or Malgorath's Bite."));
  if(full){ok('v'+(NEW?VER+' (newer than 6.3)':'6.3')+': GAME_VERSION, the title line and the help row (The Final Boss)',(NEW?vgt(VER,'6.3'):VER==='6.3')&&(NEW?(/id="t_ver"[^>]*>([^<]*)</.exec(HH)||[])[1]===V.RELEASE_LABEL:HH.includes('voxel sandbox — v'+VER+'</div>'))&&HH.includes('<div class="krow"><b>The Final Boss</b> MALGORATH has been rebuilt'));
    const pn=V.PATCH_LOG[NEW];ok('v6.3 patch notes: The Malgorath Update, >= 5 lines, no placeholder, spoiler-free (no round, sun, burst, hat, gut words), 6.2 kept next',pn.v==='6.3'&&pn.title==='The Malgorath Update'&&
      pn.lines.length>=5&&pn.lines.every(l=>!/PLACEHOLDER/.test(l))&&!/\b(round|rounds|sun|burst|hat|gut|tongue|inhale|plate|maw|table)\b/i.test(pn.lines.join(' '))&&V.PATCH_LOG[NEW+1].v==='6.2');}
  else skip('version, notes and help row','DC_NO_TEX build (stage 2 did not run)');

  /* ---- the gate ---- */
  /* split repo: the gate is scripts/gate.mjs over tests/gate.json; caps live in scripts/guards.json; a shipped version is frozen by
     tests/fixtures/shipped.json; the nomalg parity session is retired (golden digests) */
  {const GJ=JSON.parse(fs.readFileSync(ROOT+'tests/gate.json','utf8')),GU=JSON.parse(fs.readFileSync(boot.P.SCRIPTS+'guards.json','utf8')),SH=JSON.parse(fs.readFileSync(boot.FIX+'shipped.json','utf8')).shipped;
   const s57=GU.sections.find(s=>s.name==='PART 57'),sH=GU.sections.find(s=>s.name==='PART 57 HR block'),E=GJ.entries||[],has=n=>E.some(e=>e.suite==='tests/malgorath/'+n+'.js');
   ok('the gate refuses v6.2 and older (frozen: '+Object.keys(SH).join(',')+'), guards PART 57 at 600,000 B and its HR block at 700,000 B, keeps the 45 MB cap',['5.9','6.0','6.1','6.2'].every(v=>SH[v]&&/^[0-9a-f]{32}$/.test(SH[v].md5))&&
     !!s57&&s57.cap===600000&&s57.lastIndexOf==='/* ---- PART 57: '&&!!sH&&sH.cap===700000&&GU.html_cap===45000000);
   ok('the gate runs the Malgorath suites (smokes twice) and the malg og_trace session (golden digest)',['m_static','m1_static','m2_static','m3_static','m0_smoke','m1_smoke','m2_smoke','m3_smoke','m_harness','m2_fight','m2_audio','m3_model','m4_hr'].every(has)&&
     E.filter(e=>/^tests\/malgorath\/m\d_smoke\.js$/.test(e.suite)).every(e=>e.repeat===2)&&E.some(e=>/og_trace\.js$/.test(e.suite)&&(e.args||[]).join(' ').includes('og_trace/malg.json'))&&fs.existsSync(boot.FIX+'og_trace/malg.json'));}
});
