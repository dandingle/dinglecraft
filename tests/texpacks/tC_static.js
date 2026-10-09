/* tC_static.js (Package C): statics for the cast adapter. No world is started.
   Maps vs the game's tables, angle helpers, tier fields, the module registration, the hooks as spliced,
   and the model sources' embedding rules (plan section 6 C5). */
'use strict';
const boot=require('../lib/hr_boot.js'),{ok}=boot;
const fs=require('fs'),path=require('path');
const V=boot({stubs:['C']});
const X=V.hrEnt;
const MD=boot.SRC.models;   /* the cast model sources */
const G=fs.readFileSync(boot.BUILD+'game.js','utf8');

boot.run(async()=>{
  ok('the cast seam is exported (hrEnt, getHRE, hrInstallFake, hrCorpseCount)',!!X&&typeof V.getHRE==='function'&&typeof V.hrInstallFake==='function'&&typeof V.hrCorpseCount==='function');
  /* ---- maps ---- */
  const mobKeys=Object.keys(X.HR_MOB);
  ok('HR_MOB covers the 7 mob types with a Hyperreal model (aliens render OG)',mobKeys.sort().join()==='boomer,cow,pig,sheep,skel,spider,zombie');
  ok('every HR_MOB key is a MOBT mob type',mobKeys.every(k=>!!V.MOBT[k]));
  ok('no boss, flyer or Nether/Aether mob is mapped',mobKeys.every(k=>!V.MOBT[k].boss&&!V.MOBT[k].fly));
  const order=(G.match(/const AG_ORDER=\[([^\]]*)\]/)||[])[1];
  const agNames=order?order.split(',').map(s=>s.trim().replace(/'/g,'')):[];
  ok('HR_BOT keys equal the AI player names (AG_ORDER)',agNames.length===3&&Object.keys(X.HR_BOT).sort().join()===agNames.slice().sort().join());
  const cast=[...new Set(Object.values(X.HR_MOB).concat(Object.values(X.HR_BOT),['player']))].sort();
  ok('the maps use exactly the 11 cast models',cast.length===11&&cast.join()===X.HR_CAST.slice().sort().join());
  for(const n of X.HR_CAST)ok('model source '+n+'.js exists',fs.existsSync(MD+n+'.js'));

  /* ---- angle helpers ---- */
  let wrapOK=true;for(let a=-10*Math.PI;a<=10*Math.PI;a+=0.37){const w=X.hrWrap(a);if(!(w>=-Math.PI-1e-9&&w<=Math.PI+1e-9)||Math.abs(Math.sin(w)-Math.sin(a))>1e-9||Math.abs(Math.cos(w)-Math.cos(a))>1e-9)wrapOK=false;}
  ok('hrWrap maps any angle in +-10 pi to (-pi, pi] without changing it',wrapOK);
  ok('hrWrap(-3.5 pi) is +0.5 pi (OG ((x+3pi)%2pi)-pi breaks there)',Math.abs(X.hrWrap(-3.5*Math.PI)-0.5*Math.PI)<1e-9);
  ok('pitch is positive looking down: a target above gives a negative pitch',X.hrMobPitch(1.6,3.6,2)<0&&X.hrMobPitch(1.6,0.6,2)>0);
  ok('pitch never divides by a zero distance (min 0.6)',Math.abs(X.hrMobPitch(0,1,0)+Math.atan2(1,0.6))<1e-9);
  ok('amax: skeleton 1.9, zombie 1.1, boss 1.4',X.hrMobAmax(V.MOBT.skel)===1.9&&X.hrMobAmax(V.MOBT.zombie)===1.1&&X.hrMobAmax({boss:true})===1.4);

  /* ---- tiers + module ---- */
  const Q=V.HRQ;
  ok('tier fields lod0/shadowR/entScale/corpses on every tier',['lod0','shadowR','entScale','corpses'].every(k=>Q.every(t=>typeof t[k]==='number')));
  ok('tier values as planned',Q.map(t=>[t.lod0,t.shadowR,t.entScale,t.corpses].join('/')).join(' ')==='16/0/0.5/4 24/16/1/8 32/24/1/8 40/32/1/8');
  const tp=V.getTP();
  ok('module ents is registered',tp.mods.includes('ents'));
  ok('no contract misuse at load',tp.errs.length===0||(console.log('  '+tp.errs.join(' | ')),false));
  const h=V.getHRE();
  ok('the cast starts off (OG): nothing installed, no corpses',h.on===false&&h.installed===false&&h.corpses===0&&h.live===0&&h.player===false);
  ok('the HRE state object is the module state (not a copy)',X.HRE&&X.HRE.on===false&&Array.isArray(X.HRE.corpses));

  /* ---- hooks as spliced (one check per hook: the inserted text is in the build) ---- */
  const HOOKS={C1:'function makeMobMesh(mt,opts){',C2:'if(opts&&opts.hr&&HRE.on&&HR_MOB[mt]){const r=hrMobMesh(mt,G);if(r)return r;}',
    C3:'const {G,legs,mats,hrM}=makeMobMesh(mt,{hr:1});',C4:'mesh:G,legs,mats,hrM:hrM||null,anim:0});',C5:'if(e.hrM)e._a0=e.atkT;',
    C6:'if(e.hrM){hrMobTick(e,dt,T,tdx,tdz,td,_tb,hostileNow);return;}',C7:'if(!(e.hrM&&hrCorpse(e,B.TNT)))',C8:'if(e.hrM){hrFree(e.hrM);e.hrM=null;}',
    C9:'if(TP.hr)hrEntFrame(dt);',C10:'if(HRE.corpses.length)hrTickCorpses(dt);',C11:'  hrClearCorpses();\n  for(const e of entities)removeEnt(e);',
    C12:'function stashEnts(){\n  hrClearCorpses();',C13:'if(HRE.on&&P){const M=hrPlayerModel();if(M)return M;}',C14:'if(M.hr){hrPlayerTick(M,paused?0:dt);return;}',
    C15:'helm.position.y=M.helmA?0:1.62;',C16:'chest.position.y=M.chestA?0:1.0;',C17:'(M.helmA||M.G).add(helm);(M.chestA||M.G).add(chest);',
    C18:'if(!st){if(HRE.on&&P)hrFistAttach();return;}',C19:'if(HRE.on&&hrFistTick(dt))return;',C20:'const M=(HRE.on&&hrBotBody(a))||agHumanoid(D);',
    C21:'if(M.hr)M.tag.position.y=2.62;else shadowify(M.G);',C22:'mats:M.mats,M,hrM:M.hrM||null,anim:0};',C23:'if(M.hr){hrBotTick(a,e,dt);return;}',
    C24:'if(a.e&&a.e.hrM){a.hrPlT=AG_T;a.hrPlId=id;}',C25:'if(a.e&&a.e.hrM&&hrCorpse(a.e,B.WOOL))a.e=null;'};
  for(const k in HOOKS)ok('hook '+k+' is spliced exactly once',G.split(HOOKS[k]).length===2);
  ok('C24 never touches PART 53\'s a.placeT build pacer',G.indexOf('a.placeT=AG_T')<0);
  ok('in the core, only spawnMob asks for a Hyperreal body (figurines and every other caller stay OG)',(G.slice(0,G.indexOf('/* ---- PART 54: t0_contract.js ---- */')).match(/makeMobMesh\([^)]*\{hr:1\}\)/g)||[]).length===1&&G.indexOf('const {G}=makeMobMesh(be.fig.t);')>0);

  /* ---- model sources: embedding rules (C5) ---- */
  const rig=fs.readFileSync(MD+'rig.js','utf8');
  ok('rig.js: HR.texURL / HR.loadTex / HR.loadImg are overridable defaults',/HR\.texURL = HR\.texURL \|\|/.test(rig)&&/HR\.loadTex = HR\.loadTex \|\|/.test(rig)&&/HR\.loadImg = HR\.loadImg \|\|/.test(rig));
  ok('rig.js: HR.mat builds every URL through HR.texURL and loads through HR.loadTex',rig.indexOf("HR.texURL(id, '_basecolor.png')")>0&&rig.indexOf("HR.texURL(id, '_normal.png')")>0&&rig.indexOf("HR.texURL(id, '_roughness.png')")>0&&(rig.match(/HR\.loadTex\(u[BNR]/g)||[]).length===3);
  ok('rig.js: load(\'\') fails asynchronously (a microtask), like a 404',/if \(!url\) \{ const t = new THREE\.Texture\(\); if \(onFail\) Promise\.resolve\(\)\.then\(onFail\)/.test(rig));
  ok('rig.js: no BUST suffix outside the preview default texURL',(rig.replace(/\/\*[\s\S]*?\*\//g,'').match(/HR\.BUST/g)||[]).length===2);
  for(const n of X.HR_CAST){const s=fs.readFileSync(MD+n+'.js','utf8');
    const heals=(s.match(/function heal(Mats)?\((pairs|list)\) \{\n  if \(HR\.EMBEDDED\) return;/g)||[]).length;
    ok(n+'.js: its texture heal block starts with the HR.EMBEDDED guard',heals===1);
    ok(n+'.js: no raw HR.TEXBASE URL, no raw new Image() (all through HR.texURL / HR.loadImg)',s.indexOf('HR.TEXBASE')<0&&s.indexOf('new Image(')<0);
    ok(n+'.js: retries only through HR.retryURL (never a ?retry= on a data URI)',s.indexOf("'?retry='")<0&&s.indexOf("'&retry='")<0);}
  const body=G.slice(G.indexOf('\nfunction hrLoadModels(){\n'));
  ok('the spliced cast matches the model sources on disk (rig + 11)',['rig'].concat(X.HR_CAST).every(n=>body.indexOf(fs.readFileSync(MD+n+'.js','utf8'))>0));
  const pv=fs.readFileSync(MD+'preview.html','utf8');
  ok('preview.html still loads rig.js and every model with its own BUST (the preview keeps working)',pv.indexOf('window.HR={BUST:Date.now()}')>0&&pv.indexOf('<script src="rig.js"></script>')>0&&X.HR_CAST.every(n=>pv.indexOf("'"+n+"'")>0));

  /* ---- PART 54 sources: names ---- */
  const GD=boot.SRC.tex;
  const srcs=fs.readdirSync(GD).filter(f=>/^tC_.*\.js$/.test(f));
  ok('package C sources: tC_adapter, tC_mobs, tC_player, tC_bots, tC_corpse',['tC_adapter.js','tC_mobs.js','tC_player.js','tC_bots.js','tC_corpse.js'].every(f=>srcs.includes(f)));
  const bad=[];for(const f of srcs){const s=boot.readSrc(GD+f,{legacy:true});const re=/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;let m;
    while((m=re.exec(s))){const n=m[1]||m[2];if(!/^(HRE|HR_[A-Z_]+|hr[A-Z]\w*|hrWrap|hrS|hrC25)$/.test(n))bad.push(f+':'+n);}}
  ok('package C top-level names stay in its prefixes (HRE, HR_*, hr*)'+(bad.length?' ('+bad.join(',')+')':''),bad.length===0);
  const top=srcs.map(f=>boot.readSrc(GD+f,{legacy:true}).replace(/\/\*[\s\S]*?\*\//g,'').split('\n').filter(l=>/^[^\s}]/.test(l)&&!/^(function|async function|const|var|let|tpRegister|tpOn|Object\.assign|tpTierFields)\b/.test(l)&&!/^  /.test(l))).flat();
  ok('no stray top-level statements in package C (no THREE constructors at load)',top.length===0||(console.log('  '+top.slice(0,3).join(' | ')),false));
});
