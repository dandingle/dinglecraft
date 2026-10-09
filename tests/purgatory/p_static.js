/* p_static.js (P0, gate x1): statics for Puppet Purgatory (the purgatory build plan section 8.1). No world is started.
   ids and the v6.0 fixture, tiles, names, PGEX hygiene, stub markers and interface parity, PART 55 declarations, hook markers,
   PARTs 47-50 in the build verbatim, explosion and placement guards, MOBT rules, recipes, sizes and caps,
   spoiler rules, the verbatim Programme pages. Checks that need a package still on its stub are reported as skipped.
   Split repo (v6.3): the PART 55 sources are src/purgatory/ (read in their pre-split form); the _stub/ files and the hooks_P*.py
   files are gone (folded into the sources), so their 27 checks are retired; the caps are checked against scripts/guards.json
   (docs/PARITY.md lists every change).
   v6.8: PARTs 47-50 (src/features/part47-50.js) are ordinary sources; their md5 pin is retired and the check that held it now
   proves they reach the build verbatim and in order. */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const V=boot({});
const ROOT=boot.ROOT,GD=boot.SRC.pg,GUARDS=JSON.parse(fs.readFileSync(boot.P.SCRIPTS+'guards.json','utf8'));
const C=V.pgCore();
const md5=s=>crypto.createHash('md5').update(s).digest('hex');

boot.run(async()=>{
  const stubs=V.mpInfo().stubs,DEFS=V.DEFS,B=V.B,IT=V.IT;
  const G=fs.readFileSync(boot.BUILD+'game.js','utf8'),HH=fs.readFileSync(boot.BUILD+'head.html','utf8');
  const full=G.indexOf('/* ---- PART 54: t0_contract.js ---- */')>=0;

  /* ---- ids (plan 2.1 / 2.2) ---- */
  const BLK=[99,117,118,119,247];for(let i=149;i<=189;i++)BLK.push(i);
  const ITM=[];for(let i=285;i<=361;i++)if(i!==309&&i!==339)ITM.push(i);
  const pgB=Object.keys(DEFS).map(Number).filter(id=>DEFS[id].pg&&!DEFS[id].item).sort((a,b)=>a-b);
  const pgI=Object.keys(DEFS).map(Number).filter(id=>DEFS[id].pg&&DEFS[id].item).sort((a,b)=>a-b);
  ok('46 purgatory blocks, exactly the planned ids (all < 256, none in 212-219)',JSON.stringify(pgB)===JSON.stringify(BLK.slice().sort((a,b)=>a-b))&&pgB.every(i=>i<256&&(i<212||i>219)));
  ok('75 purgatory items, exactly the planned ids (285-361 minus 309, 339)',JSON.stringify(pgI)===JSON.stringify(ITM));
  ok('souvenirs 362-364 exist and are overworld items (no pg)',[362,363,364].every(i=>DEFS[i]&&DEFS[i].item&&!DEFS[i].pg));
  ok('spare ids 248, 249, 309, 339 stay unused',[248,249,309,339].every(i=>!DEFS[i]));
  const bk=Object.keys(B).filter(k=>/^PG_/.test(k)),ik=Object.keys(IT).filter(k=>/^PG_/.test(k));
  ok('B.PG_* names the 46 blocks and IT.PG_* the 78 items',bk.length===46&&ik.length===78&&bk.every(k=>BLK.includes(B[k]))&&ik.every(k=>DEFS[IT[k]]&&DEFS[IT[k]].item));
  const fx=JSON.parse(fs.readFileSync(boot.FIX+'v60_defs.json','utf8')).defs;
  const over=Object.keys(fx).filter(id=>!DEFS[id]||DEFS[id].name!==fx[id]);
  ok('no v6.0 id is overwritten ('+Object.keys(fx).length+' defs in the fixture)'+(over.length?' (changed: '+over.slice(0,6).join(',')+')':''),over.length===0);

  /* ---- tiles ---- */
  ok('ATLAS is 32 and the atlas never overflows (_tn '+C.tn+' <= 1024)',C.ATLAS===32&&C.tn<=C.ATLAS*C.ATLAS);
  const bad=[];for(const id in DEFS){const d=DEFS[id];
    if(!d.item&&d.tiles){const t=d.tiles,ns=typeof t==='string'?[t]:[t.top,t.side,t.bot];for(const n of ns)if(C.Tl[n]===undefined)bad.push(id+':'+n);}
    if(d.item&&d.icon&&C.Tl[d.icon]===undefined&&!d.ipaint)bad.push(id+':'+d.icon);
    if(d.pg&&d.item&&typeof d.ipaint!=='function')bad.push(id+':no ipaint');}
  ok('every tiles/icon name resolves in Tl and every purgatory item has ipaint'+(bad.length?' ('+bad.slice(0,6).join(' ')+')':''),bad.length===0);

  /* ---- names ---- */
  const pgN=[...pgB,...pgI,362,363,364].map(id=>DEFS[id].name),others=new Set(Object.keys(DEFS).filter(id=>!DEFS[id].pg&&id<362||id>364).map(id=>DEFS[id].name));
  const dupe=pgN.filter((n,i)=>pgN.indexOf(n)!==i||others.has(n));
  ok('purgatory display names are unique and collide with no other name'+(dupe.length?' ('+dupe.join(', ')+')':''),dupe.length===0);

  /* ---- PGEX hygiene ---- */
  const pgx=V.__pgx;ok('__pgx is the PGEX export object',!!pgx&&pgx.__pgx===pgx);
  const clash=Object.keys(pgx).filter(k=>V[k]!==pgx[k]);
  ok('every PGEX key reaches __vox unshadowed'+(clash.length?' (clashes: '+clash.join(',')+')':''),clash.length===0);
  ok('PGEX exports the plan 3.6 list',['mpInfo','getMP','getMPF','mpEnterNow','mpExitNow','mpDoorHere','mpSetPlayT','mpStampDoor','mpRespawn','puSpawn','pBlast',
    'purgHit','purgFoe','deckY','MPC','PREG','chunkEdits','killMob','doUse','mpSkip','pguOpen','pguOn','PURG_LADDER','PURG_PAGES','mpTickOff','mpDoorFrogBite'].every(k=>k in V));

  /* ---- stubs: markers and interface parity: RETIRED at the split (21 checks). The _stub/ bisect files cannot be built from folded
     sources; there is no stub build any more. ---- */
  const rd=f=>f.startsWith(boot.SRC.root)?boot.readSrc(f,{legacy:true}):fs.readFileSync(f,'utf8');
  const hookRan=d=>true;   /* every purgatory hook is folded into the sources: the hook-dependent checks always run */

  /* ---- PART 55 declarations ---- */
  const i55=G.indexOf('/* ---- PART 55: '),i54=full?G.indexOf('/* ---- PART 54: t0_contract.js ---- */'):G.search(/\nif\(typeof window==='undefined'\|\|typeof __VOXTEST/);
  ok('PART 55 is spliced before PART 54 (or the export branch) and starts with p0_contract.js',i55>0&&i54>i55&&G.startsWith('/* ---- PART 55: p0_contract.js ---- */',i55));
  const p55=G.slice(i55,i54),core=G.slice(0,i55)+G.slice(i54);
  const decl=t=>{const out=[];const re=/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^var\s+([A-Za-z_$][\w$]*)/gm;let m;while((m=re.exec(t)))out.push(m[1]||m[2]);return out;};
  const cd=new Set(decl(core)),pd=decl(p55),dd=pd.filter((n,i)=>cd.has(n)||pd.indexOf(n)!==i);
  ok('PART 55 declares no function/var name the core or PART 54 declares, and none twice'+(dd.length?' ('+[...new Set(dd)].join(',')+')':''),dd.length===0);
  ok('PART 55 never shadows B, P, T, G, HR, TP, TPX, MB, MINE, MM, MMM, PGRID, PR at top level',
    !/^(?:const|let|var)\s+(B|P|T|G|HR|TP|TPX|MB|MINE|MM|MMM|PGRID|PR)\b|^(?:async\s+)?function\s+(B|P|T|G|HR|TP|TPX|MB|MINE|MM|MMM|PGRID|PR)\s*\(/m.test(p55));
  ok('PART 55 never touches TPEX, HRE, HRL, HRW or tpRegister',!/\b(TPEX|HRE|HRL|HRW|tpRegister)\b/.test(p55.replace(/\/\*[\s\S]*?\*\//g,'')));
  const b5=GD+'p5_bots.js';
  if(fs.existsSync(b5)){const t=rd(b5).replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"\\])\/\/.*$/gm,'$1');
    const top=t.split('\n').filter(l=>/^\S/.test(l)&&!/^(function |var |\}|\)|PREG\.|Object\.assign\(PGEX|$)/.test(l));
    ok('p5_bots.js top level holds only function declarations and vars (plus registrations)'+(top.length?' ('+top[0].slice(0,60)+')':''),top.length===0);}
  else skip('p5_bots.js top-level rule','no p5_bots.js yet');

  /* ---- hooks: RETIRED at the split (6 checks: hooks_P*.py are folded into src/; no hooks file is left to parse) ---- */
  /* PARTs 47-50: ordinary sources since v6.8 (the md5 pin is retired: the Watcher and the Reaper were cut); they reach the build verbatim, once, in order */
  {const G0=fs.readFileSync(boot.BUILD+'game.js','utf8'),p4=['part47','part48','part49','part50'].map(n=>fs.readFileSync(boot.SRC.feat+n+'.js','utf8')).join('');
   ok('PARTs 47-50 (src/features/part47-50.js) are in the build verbatim, once, in order',p4.length>0&&G0.split(p4).length===2);}

  /* ---- explosion and placement guards ---- */
  ok('Stage Trunk, Stage Door and Masking Black are in both explosion skip lines',
    G.includes('if(id===B.AIR||id===B.BEDROCK||id===B.WATER||id===B.PG_STRUNK||id===B.PG_DOOR||id===B.PG_MBLACK)continue;')&&
    G.includes('if(id===B.AIR||id===B.BEDROCK||id===B.PG_STRUNK||id===B.PG_DOOR||id===B.PG_MBLACK)continue;'));
  ok('the y 62 placement guard is in Dan\u2019s place branch (P0-23)',G.includes("if(!blocked&&DIM==='puppet'&&!mpPlaceOK(tx,ty,tz,pid))blocked=true;"));
  if(hookRan('5'))
    ok('the placement guard is in agPlaceBlock and the nav pillar planner (P5-09, P5-07)',G.includes("if(DIM==='puppet'&&!mpPlaceOK(x,y,z,id))return 'too high")&&G.includes("&&(DIM!=='puppet'||mpPlaceOK(x,y,z,-1))"));
  else skip('placement guard in the bot paths','hooks_P5.py not applied');
  ok('living blocks, figurines, ghosts, store, battle pass, dragons, superpowers and the Player Compass are gated',
    G.includes("if(DIM!=='puppet'&&blockComesAlive(")&&G.includes("if(DIM!=='puppet'&&Math.random()<FIG_CHANCE)")&&G.includes("GR.ghosts&&DIM!=='puppet'&&")&&
    G.includes("if(DIM==='puppet'){showToast('No crew on stage.');")&&G.includes("P.dead||DIM==='puppet')return;")&&G.includes("dragT=9;\n  if(DIM==='puppet')return;")&&
    G.includes("function powActive(k){if(DIM==='puppet')return false;")&&G.includes("if(P&&DIM!=='puppet'&&!P.inv.some(s=>s&&s.id===IT.PCOMPASS)"));

  /* ---- MOBT rules ---- */
  const pm=Object.keys(V.MOBT).filter(k=>/^pg/.test(k)),PREG=V.PREG;const mbad=[];
  for(const k of pm){const T=V.MOBT[k];
    if(!T.pmob)mbad.push(k+' pmob');if(!T.legc)mbad.push(k+' legc');
    if(T.drop&&!(T.drop.id&&T.drop.min!=null&&T.drop.max!=null))mbad.push(k+' drop');
    if(!!T.pnc!==!!(T.prop||T.npc||T.struct))mbad.push(k+' pnc');
    if(T.pboss&&!(PREG.loot[k]&&PREG.hurt[k]))mbad.push(k+' loot/hurt');}
  if(pm.length)ok('every pg* MOBT entry: pmob, legc, {id,min,max} drop, pnc iff prop/npc/struct, pboss with loot+hurt'+(mbad.length?' ('+mbad.slice(0,6).join(', ')+')':''),mbad.length===0);
  else skip('MOBT rules','no purgatory mob is defined yet (P3/P4 on stubs)');
  if(pm.length&&stubs.indexOf('5')<0&&typeof V.purgBotInit==='function'){V.purgBotInit();const MN=C.MOB_NAME,nn=pm.filter(k=>!MN[k]);
    ok('MOB_NAME covers every purgatory mob after purgBotInit()'+(nn.length?' (missing: '+nn.join(',')+')':''),nn.length===0);}
  else skip('MOB_NAME coverage','P5 on its stub or no purgatory mobs');
  if(hookRan('4'))ok('the boss bar names the three headliners',G.includes("const BN={pgbomber:'THE DEMOLITIONIST',pgbigpig:'THE PIG',pgbigfrog:'THE FROG',"));
  else skip('boss bar names','hooks_P4.py not applied');

  /* ---- AG tables (P5) ---- */
  if(stubs.indexOf('5')<0&&V.AG_GATHER&&typeof V.purgRealm==='function'){
    const snap=()=>JSON.stringify([V.AG_GATHER,V.AG_HUNT,V.AG_JUNK]);const s0=snap();V.purgBotInit();V.purgBotInit();V.purgRealm('puppet');
    const und=[];for(const t of [V.AG_GATHER,V.AG_HUNT,V.AG_JUNK,V.AGP_GATHER,V.AGP_HUNT,V.AGP_JUNK])if(t)for(const k in t)if(t[k]===undefined)und.push(k);
    ok('no purgatory key in AG_*/AGP_* is undefined after purgBotInit()',und.length===0);V.purgRealm('over');
    ok('purgRealm(\'over\') restores AG_GATHER/AG_HUNT/AG_JUNK exactly',snap()===s0);}
  else skip('AG tables','P5 on its stub');

  /* ---- recipes ---- */
  /* v6.2 (lead, the creativity plan 3.5): the Creativity Update appends CR_RECIPE_N overworld recipes */
  ok('RECIPES still holds 98 overworld recipes (+ '+(V.CR_RECIPE_N|0)+' v6.2 creativity recipes) and no purgatory id',V.RECIPES.length===98+(V.CR_RECIPE_N|0)&&V.RECIPES.every(r=>![r.o,...(r.s||[]),...Object.values(r.k||{})].some(x=>typeof x==='number'&&DEFS[x]&&DEFS[x].pg)));
  {const g=[{id:B.LOG_O,count:1},null,null,null];const r=V.calcCraft(g,2);ok('calcCraft(grid,w) unchanged (a log makes 4 oak planks)',r&&r.id===B.PLANK_O&&r.count===4);}

  /* ---- sizes and caps ---- */
  const p55b=Buffer.byteLength(p55);ok('PART 55 code is '+p55b+' B (<= 950,000)',p55b<=950000);
  const pagesTxt=V.PURG_PAGES.map(p=>[p.title,p.printed,p.margin,p.shaky||'',...p.ticks.map(t=>t.label)].join(' ')).join(' ');
  ok('the Programme pages are '+pagesTxt.length+' chars (<= 10,000)',pagesTxt.length<=10000);
  if(stubs.indexOf('5')<0&&typeof V.purgGuide==='function'){const g=V.purgGuide({name:'honeybee_mc',dim:'puppet',inv:[],armor:[]})||'';ok('PURG_GUIDE is <= 10,000 chars ('+g.length+')',g.length<=10000);}
  else skip('PURG_GUIDE size','P5 on its stub');
  {const paF=boot.P.TOOLS+'art/texpacks/pack_assets.py',pa=fs.existsSync(paF)?fs.readFileSync(paF,'utf8'):'',ts=fs.readFileSync(path.join(__dirname,'..','texpacks','tA_static.js'),'utf8');
   const g55=GUARDS.sections.find(s=>s.name==='PART 55');   /* split repo: scripts/guards.json is the build's (and the gate's) cap table */
   ok('the three HTML/asset caps are equal (scripts/guards.json html_cap, pack_assets.py std, tA_static std = 45 MB)',GUARDS.html_cap===45000000&&/'std':.*cap=45_000_000/.test(pa)&&/std:45e6/.test(ts));
   ok('the gate guards PART 55 at 950,000 B (scripts/guards.json)',!!g55&&g55.cap===950000&&g55.from==='/* ---- PART 55: '&&g55.to==='/* ---- PART 54: t0_contract.js ---- */');}

  /* ---- spoilers (plan 8.1, audit A12) ---- */
  const P1=/\belbow\b|felt dan|\bbroom\b|\bstrike\b|hand slid|under the floor|flinch/i,ARM=/\barm\b/i;
  /* P0 at A0: the plan's corrected regex still failed two verbatim lines that are about tethers and the Drummer, not the reveals:
     page 6 "It can't reach past the elbow." and page 10 "The Drummer's under the floor." Those exact sentences are exempt; the words
     stay banned everywhere else on pages 1-12. */
  const OK_LINES=["It can't reach past the elbow.","The Drummer's under the floor."];
  const sp=[];for(const p of V.PURG_PAGES){if(p.id==='12b'||p.id==='13')continue;const n=+p.id;
    let t=[p.title,p.printed,p.margin,p.shaky||'',...p.ticks.map(x=>x.label)].join(' ');for(const l of OK_LINES)t=t.split(l).join(' ');
    if(P1.test(t))sp.push(p.id+':strict');if(n>=7&&ARM.test(t))sp.push(p.id+':arm');
    if(/puppeteer/i.test(t.replace(/Puppeteer Forearm|Puppeteer Knuckle|The Puppeteer's Gauntlet/g,'')))sp.push(p.id+':puppeteer');}
  ok('pages 1-12 keep the reveals (no elbow, Felt Dan, broom, Strike, hand slid, under the floor, flinch; no arm from page 7)'+(sp.length?' ('+sp.join(',')+')':''),sp.length===0);
  if(full){const pn=V.PATCH_LOG.find(e=>e.v==='6.1')||{lines:[]},nl=pn.lines.join(' ');   /* v6.2: the 6.1 entry is no longer the newest */
    ok('the v6.1 patch notes tease only (strict spoiler regex)',pn.v==='6.1'&&pn.lines.length>0&&!/\barm\b|puppeteer|felt dan|broom|strike|hand slid|elbow/i.test(nl));
    ok('the help row tells you how to find the door',HH.includes('<b>Puppet Purgatory</b>')&&/Stage Door/.test(HH));}
  else skip('patch notes','DC_NO_TEX build (stage 2 did not run)');

  /* ---- verbatim pages (audit A10) ---- */
  const fxp=JSON.parse(fs.readFileSync(boot.FIX+'pages_fixture.json','utf8'));
  const F=['id','title','unlock','printed','margin','marginNote','shaky','ticks'];
  const diffp=[];for(let i=0;i<Math.max(fxp.length,V.PURG_PAGES.length);i++){const a=fxp[i]||{},b=V.PURG_PAGES[i]||{};
    for(const k of F)if(JSON.stringify(a[k])!==JSON.stringify(b[k]))diffp.push((a.id||b.id)+'.'+k);}
  ok('PURG_PAGES equals the bible fixture field by field ('+fxp.length+' pages, '+fxp.reduce((n,p)=>n+p.ticks.length,0)+' ticks)'+(diffp.length?' ('+diffp.slice(0,6).join(',')+')':''),diffp.length===0);
  const ids=V.PURG_PAGES.flatMap(p=>p.ticks.map(t=>t.id)),lad=V.PURG_LADDER.filter(r=>r.page).map(r=>r.id);
  ok('every Programme tick is a PURG_LADDER row on the same page with the same tag',ids.every(id=>{const r=V.PURG_LADDER.find(x=>x.id===id),pg=V.PURG_PAGES.find(p=>p.ticks.some(t=>t.id===id));
    const t=pg.ticks.find(x=>x.id===id);return r&&r.page===pg.id&&r.tag===t.tag;})&&lad.length===ids.length);
  ok('PURG_LADDER rows are well formed (id, tag, done(), craft [id,kind], gather [alias,n])',V.PURG_LADDER.every(r=>r.id&&(r.tag==='main'||r.tag==='side')&&typeof r.done==='function'&&
    (!r.craft||(DEFS[r.craft[0]]&&['inv','pcan','plab','ptrans'].includes(r.craft[1])))&&(!r.gather||(typeof r.gather[0]==='string'&&r.gather[1]>0))&&(!r.item||DEFS[r.item])));
  ok('CMP_DEFS has the 7th target, Stage Door',C.CMP_DEFS.length===7&&C.CMP_DEFS[6].k==='pdoor'&&C.CMP_DEFS[6].n==='Stage Door');
});
