/* c_static.js (lead, gate x1): the v6.2 Creativity Update statics (the creativity plan section 9.1).
   ids and flags, names, tiles (registered at boot after PART 55, contiguous, name-seeded), recipes (3, no pattern clash with the 98),
   the work-id band, CREX hygiene, PART 56 placement and size, declarations vs the core/PART 55/PART 54 (PARTs 47-50 included),
   top-level determinism, every hooks_C*.py anchor proven unique in the pristine stage-1 text AND the stage-3a text and far from
   PARTs 47-50 (anchors.py), every replacement present once, PARTs 47-50 in the build verbatim (to v6.7: md5-pinned to the shipped v6.1), stub markers and
   interface parity, head.html overlays, the gate's v6.2 rules.
   Split repo (v6.3): sources are src/creativity/ (read in their pre-split form); anchors.py, the hooks_C*.py marker check and the _stub/
   checks are retired (11 checks: folded sources, no splice, no stub build); the gate rules are checked against tests/gate.json +
   scripts/guards.json + tests/fixtures/shipped.json (docs/PARITY.md lists every change).
   v6.8: PARTs 47-50 (src/features/part47-50.js) are ordinary sources; their v6.1 md5 pin is retired and the check that held it
   now proves they reach the build verbatim and in order. */
'use strict';
const boot=require('../lib/c_boot.js'),{ok,skip}=boot;
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const V=boot({});
boot.run(async()=>{
  const C=V.crCore(),D=V.DEFS,B=V.B,CRC=V.CRC,I=V.crInfo();
  const G=fs.readFileSync(boot.BUILD+'game.js','utf8'),HH=fs.readFileSync(boot.BUILD+'head.html','utf8');
  const full=G.indexOf('/* ---- PART 54: t0_contract.js ---- */')>=0,ROOT=boot.ROOT,GD=boot.SRC.cr;
  const md5=b=>crypto.createHash('md5').update(b).digest('hex');
  const stub=d=>I.stubs.indexOf(d)>=0;

  /* ---- ids and flags (plan 2.1) ---- */
  const ids={CR_EASEL:213,CR_DECK:214,CR_JUKE:215,CR_PAINT:216};
  ok('B.CR_* are 213-216',Object.keys(ids).every(k=>B[k]===ids[k])&&Object.keys(B).filter(k=>/^CR_/.test(k)).length===4);
  ok('the four blocks are defined with their names, cr kinds and interact:crea',[['Easel','easel'],['Record Player','deck'],['Jukebox','juke'],['Hung Painting','paint']]
    .every((x,i)=>{const d=D[213+i];return d&&!d.item&&d.name===x[0]&&d.cr===x[1]&&d.interact==='crea';}));
  ok('easel: solid, not opaque, cut bucket, cross icon, crm easel; painting cell: not solid, hidden, drops nothing, crm paint',
    D[213].solid!==false&&!D[213].opq&&D[213].bucket==='cut'&&D[213].cross&&D[213].crm==='easel'&&
    D[216].solid===false&&!D[216].opq&&D[216].hide&&D[216].drop===null&&D[216].crm==='paint'&&!D[214].hide&&!D[215].hide);
  ok('212, 217-219 (spare) and 248, 249 (purgatory spares) stay undefined',[212,217,218,219,248,249].every(i=>!D[i]));
  ok('every block id < 256 is now taken except those six',(()=>{for(let i=1;i<256;i++)if(!D[i]&&![212,217,218,219,248,249].includes(i))return false;return true;})());
  const bandUsed=Object.keys(D).map(Number).filter(i=>i>CRC.ID0&&i<=CRC.ID0+CRC.MAXN);
  ok('the work-id band '+(CRC.ID0+1)+'-'+(CRC.ID0+CRC.MAXN)+' holds no static def (works are synthesised at runtime)',bandUsed.length===0&&Object.keys(D).map(Number).every(i=>i<CRC.ID0||i>CRC.ID0+CRC.MAXN));
  ok('caps: 256 works, 600,000 B registry, art 7,000 / song 6,000 chars, three sizes, 32 px per block',
    CRC.MAX_WORKS===256&&CRC.MAX_BYTES===600000&&CRC.MAX_D.art===7000&&CRC.MAX_D.song===6000&&JSON.stringify(CRC.SIZES)==='[[64,64],[128,64],[64,128]]'&&CRC.PXB===32);
  /* ---- names ---- */
  const crN=[213,214,215,216].map(i=>D[i].name),others=Object.keys(D).map(Number).filter(i=>i<213||i>216).map(i=>D[i].name);
  ok('creativity names collide with no other def name (bots look things up by name)',crN.every(n=>!others.includes(n))&&new Set(crN).size===4);

  /* ---- tiles (plan 2.3) ---- */
  const T=V.CR_TILES;
  ok('13 tiles, registered at boot right after the last PART tile (slot '+I.tile0+' = after purgatory 284)',T.length===13&&I.tile0===285&&
    T.every((n,i)=>C.Tl[n]===I.tile0+i)&&C.tn===I.tile0+T.length&&C.tn<=C.ATLAS*C.ATLAS);
  const badT=[];for(const i of [213,214,215,216]){const t=D[i].tiles,ns=typeof t==='string'?[t]:[t.top,t.side,t.bot];for(const n of ns)if(C.Tl[n]===undefined||!/^cr_/.test(n))badT.push(i+':'+n);
    if(!D[i]._t)badT.push(i+':_t');}
  ok('every creativity tile name resolves (cr_ prefix) and the blocks were resolved by buildAtlas'+(badT.length?' ('+badT.join(' ')+')':''),badT.length===0);
  ok('no tile name outside cr_* was added by PART 56 (purgatory pg_* slots 222-284 unchanged)',Object.keys(C.Tl).filter(n=>C.Tl[n]>=I.tile0).every(n=>/^cr_/.test(n))&&C.Tl.pg_deck===222&&C.Tl.pg_strunk_s===284);

  /* ---- recipes (plan 2.4) ---- */
  const R=V.RECIPES,N=V.CR_RECIPE_N;
  ok('3 creativity recipes appended to RECIPES (98 + 3)',N===3&&R.length===101&&R.slice(98).map(r=>r.o).join()==='213,214,215');
  const firstOf=v=>typeof v==='string'?V.GROUPS[v][0]:v;
  const gridOf=r=>{const g=Array(9).fill(null);if(r.p){r.p.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch!==' ')g[y*3+x]={id:firstOf(r.k[ch]),count:1};}));}
    else r.s.forEach((v,i)=>{g[i]={id:firstOf(v),count:1};});return g;};
  const clash=[];R.forEach((r,i)=>{const out=V.calcCraft(gridOf(r),3);if(!out||out.id!==r.o){/* a pre-existing duplicate pattern (Chest/Display Shelf) is not ours */
    const first=R.findIndex(q=>JSON.stringify(gridOf(q))===JSON.stringify(gridOf(r)));if(!(first<i&&first<98&&i<98))clash.push(i+':'+D[r.o].name);}});
  ok('every recipe still makes its own output on a 3x3 table (no creativity pattern shadows the 98)'+(clash.length?' ('+clash.join(',')+')':''),clash.length===0);
  ok('creativity recipes use only overworld ingredients (no pg:1 id)',R.slice(98).every(r=>[r.o,...Object.values(r.k||{})].every(x=>typeof x==='string'||!D[x].pg)));

  /* ---- CREX hygiene ---- */
  const crx=V.__crx;ok('__crx is the CREX export object',!!crx&&crx.__crx===crx);
  const shadow=Object.keys(crx).filter(k=>V[k]!==crx[k]);
  ok('every CREX key reaches __vox unshadowed'+(shadow.length?' ('+shadow.join(',')+')':''),shadow.length===0);
  ok('CREX shares no key with PGEX'+(full?' or TPEX':''),Object.keys(crx).every(k=>!(V.__pgx&&k in V.__pgx)&&!(V.__tpx&&k in V.__tpx)));
  ok('the __vox literal spreads CREX first (PGEX, TPEX and core keys win)',G.includes('window.__vox={...CREX,...PGEX,'));

  /* ---- PART 56 placement, size, declarations ---- */
  const i56=G.indexOf('/* ---- PART 56: c0_contract.js ---- */'),i55=G.indexOf('/* ---- PART 55: p0_contract.js ---- */');
  ok('PART 56 starts with c0_contract.js and sits immediately before PART 55',i56>0&&i55>i56&&G.lastIndexOf('/* ---- PART 56: ',i55)>=i56&&
    G.indexOf('/* ---- PART 56: ')===i56&&G.indexOf('/* ---- PART 56: ',i55)<0);
  const p56=G.slice(i56,i55),b56=Buffer.byteLength(p56);
  ok('PART 56 code is '+b56+' B (<= 450,000)',b56<=450000);
  const files=p56.match(/\/\* ---- PART 56: [^ ]+ ---- \*\//g).map(s=>s.slice(17,-8));
  ok('PART 56 files in package order: '+files.join(' '),files[0]==='c0_contract.js'&&files.every((f,i)=>/^c\d_/.test(f)&&(i===0||+f[1]>=+files[i-1][1])));
  const decl=t=>{const out=[];const re=/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:var|let|const)\s+([A-Za-z_$][\w$]*)/gm;let m;while((m=re.exec(t)))out.push(m[1]||m[2]);return out;};
  const core=G.slice(0,i56)+G.slice(i55),cd=new Set(decl(core)),pd=decl(p56),dd=pd.filter((n,i)=>cd.has(n)||pd.indexOf(n)!==i);
  ok('PART 56 declares no top-level name the core, PART 55 or PART 54 declares (PARTs 47-50 included), none twice'+(dd.length?' ('+[...new Set(dd)].join(',')+')':''),dd.length===0);
  ok('PART 56 never shadows B, P, T, G, HR, TP, TPX, MB, MINE, MM, MMM, PGRID, PR or KEY at top level',
    !/^(?:const|let|var)\s+(B|P|T|G|HR|TP|TPX|MB|MINE|MM|MMM|PGRID|PR|KEY)\b|^(?:async\s+)?function\s+(B|P|T|G|HR|TP|TPX|MB|MINE|MM|MMM|PGRID|PR|KEY)\s*\(/m.test(p56));
  const p56c=p56.replace(/\/\*[\s\S]*?\*\//g,'');
  ok('PART 56 never touches TPEX, HRE, HRL, HRW, tpRegister, MP/PREG/PGEX at top level, nor tB_static/tC_static markers',
    !/\b(TPEX|HRE|HRL|HRW|tpRegister)\b/.test(p56c)&&!/TP\.hr&&HRL\.on|makeMobMesh\([^)]*\{hr:1\}\)/.test(p56c)&&!p56c.split('\n').some(l=>/^\S/.test(l)&&/\b(MP|PREG|PGEX)\b/.test(l)&&!/^(function |var |\}|\))/.test(l)));
  const top=p56c.split('\n').filter(l=>/^\S/.test(l)&&!/^(function |async function |\}|\)|\])/.test(l));
  ok('no Math.random, Date.now, performance.now, fetch or THREE constructor in a top-level statement of PART 56'+
    (top.filter(l=>/Math\.random|Date\.now|performance\.now|\bfetch\s*\(|new\s+THREE\./.test(l)).map(l=>' ('+l.slice(0,50)+')').join('')),
    !top.some(l=>/Math\.random|Date\.now|performance\.now|\bfetch\s*\(|new\s+THREE\./.test(l)));

  /* ---- hooks: the anchor proof and the replacement markers: RETIRED at the split (5 checks: anchors.py ran, 24 reps, anchors unique,
     anchors far from the block, every hooks_C0.py replacement present). The 24 hooks are folded into src/ as normal code. ---- */
  /* PARTs 47-50: ordinary sources since v6.8 (the v6.1 md5 pin is retired: the Watcher and the Reaper were cut); they reach the build verbatim, once, in order */
  {const p4=['part47','part48','part49','part50'].map(n=>fs.readFileSync(boot.SRC.feat+n+'.js','utf8')).join('');
   ok('PARTs 47-50 (src/features/part47-50.js) are in the build verbatim, once, in order',p4.length>0&&G.split(p4).length===2);}

  /* ---- stubs: markers and interface parity: RETIRED at the split (6 checks: no _stub/ files, no stub build) ---- */

  /* ---- head.html ---- */
  ok('head.html has the #crpaint, #crmusic and #crask overlays once, inside panels',['crpaint','crmusic','crask','crpaintwin','crmusicwin','craskwin','craskin','craskok','craskno']
    .every(id=>HH.split('id="'+id+'"').length===2)&&/\.crui\{z-index:22/.test(HH)&&/#crask\{z-index:26/.test(HH));
  {const a=G.indexOf('function crAsk(o){'),b=G.indexOf('function crAskDone(',a),s=a>0&&b>a?G.slice(a,b):'',i=s.indexOf("el.style.display='flex'");   /* v6.2 (CZ) */
   ok('crAsk shows #crask BEFORE it focuses the title field (a field in a hidden overlay cannot take focus: typed titles were swallowed)',i>0&&i<s.indexOf('inp.focus()'));}
  /* v6.3 (lead, the Malgorath plan 9.6): a build with PART 57 is v6.3 (the creativity rows and notes are kept) */
  /* split repo (bump-safe): NEW counts the patch-log entries newer than v6.3 (0 at v6.3: the legacy checks exactly) */
  const malg=typeof V.mgInfo==='function',NEW=malg?Math.max(0,V.PATCH_LOG.findIndex(e=>e.v==='6.3')):0,VER=malg?(NEW?V.GAME_VERSION:'6.3'):'6.2';
  if(full)ok('help row (Creativity) and the title says v'+VER,HH.includes('<b>Creativity</b> ')&&(NEW?(/id="t_ver"[^>]*>([^<]*)</.exec(HH)||[])[1]===V.RELEASE_LABEL:HH.includes('voxel sandbox — v'+VER+'</div>'))&&V.GAME_VERSION===VER);
  else skip('help row and version','DC_NO_TEX build (stage 2 did not run)');
  if(full){const i=NEW+(malg?1:0),pn=V.PATCH_LOG[i];ok('v6.2 patch notes: The Creativity Update'+(malg?' (kept after 6.3)':'')+', >= 5 lines, no placeholder, the 6.1 entry kept next',pn.v==='6.2'&&pn.title==='The Creativity Update'&&
      pn.lines.length>=5&&pn.lines.every(l=>!/PLACEHOLDER/.test(l))&&V.PATCH_LOG[i+1].v==='6.1'&&(!malg||V.PATCH_LOG[NEW].v==='6.3'));}
  else skip('patch notes','DC_NO_TEX build');

  /* ---- the gate ---- */
  /* split repo: the gate is scripts/gate.mjs over tests/gate.json; caps live in scripts/guards.json; a shipped version is frozen by
     tests/fixtures/shipped.json (the build refuses to change its bytes); the nocrea parity session is retired (golden digests) */
  {const GJ=JSON.parse(fs.readFileSync(ROOT+'tests/gate.json','utf8')),GU=JSON.parse(fs.readFileSync(boot.P.SCRIPTS+'guards.json','utf8')),SH=JSON.parse(fs.readFileSync(boot.FIX+'shipped.json','utf8')).shipped;
   const s56=GU.sections.find(s=>s.name==='PART 56'),E=GJ.entries||[],has=n=>E.some(e=>e.suite==='tests/creativity/'+n+'.js');
   ok('the gate refuses v6.1 and older (frozen: '+Object.keys(SH).join(',')+'), guards PART 56 at 450,000 B and keeps the 45 MB cap',['5.9','6.0','6.1'].every(v=>SH[v]&&/^[0-9a-f]{32}$/.test(SH[v].md5))&&
     !!s56&&s56.cap===450000&&s56.mode==='required'&&s56.to==='/* ---- PART 55: p0_contract.js ---- */'&&GU.html_cap===45000000);
   ok('the gate runs the creativity suites and the crea og_trace session (golden digest)',['c_static','c1_static','c2_static','c0_smoke','c1_smoke','c2_smoke','c2_audio'].every(has)&&
     E.some(e=>/og_trace\.js$/.test(e.suite)&&(e.args||[]).join(' ').includes('og_trace/crea.json'))&&fs.existsSync(boot.FIX+'og_trace/crea.json'));}
});
