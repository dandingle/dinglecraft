/* t0_static.js (WP0): contract statics. No world is started.
   Checks the TP contract surface, TPEX/__vox key hygiene, tier-table integrity, the shader-patch helpers,
   and static rules over every PART 54 source (src/texpacks/t*_*.js, read in their pre-split form) and the build. */
'use strict';
const boot=require('../lib/hr_boot.js'),{ok}=boot;
const fs=require('fs'),path=require('path');
const V=boot({});
const GDIR=boot.SRC.tex;   /* the PART 54 sources */

boot.run(async()=>{
  /* ---- the contract surface ---- */
  const tp=V.getTP();
  ok('the default pack is OG',tp.id==='og'&&tp.hr===false&&tp.busy===false&&tp.want===null&&tp.live.length===0);
  ok('quality defaults to Auto (q -1, resolved Medium)',tp.q===-1&&tp.qr===1&&V.tpQ().n==='Medium');
  ok('no contract misuse at load (tier fields, registrations)',tp.errs.length===0||(console.log('  errs: '+tp.errs.join(' | ')),false));
  ok('registered modules are the planned ones ('+(tp.mods.join(',')||'none yet')+')',tp.mods.every(n=>['world','light','ents'].includes(n)));
  for(const k of ['setPack','setQuality','tpCaps','tpAutoQ','tpHashFrame','tpPerf','tpRenderOnce','getTP','tpRegister','tpOn','tpEmit','tpTierFields','tpQ','hrRep','hrTag','shadowsOn'])
    ok('__vox exports '+k,typeof V[k]==='function');
  ok('HRQ is exported',Array.isArray(V.HRQ)&&V.HRQ===V.__tpx.HRQ);

  /* ---- TPEX (texture-pack exports) never collide with core __vox keys (core wins the spread) ---- */
  const tpx=V.__tpx;ok('__tpx is the TPEX export object',!!tpx&&tpx.__tpx===tpx);
  const clash=Object.keys(tpx).filter(k=>V[k]!==tpx[k]);
  ok('every TPEX key reaches __vox unshadowed'+(clash.length?' (clashes: '+clash.join(',')+')':''),clash.length===0);

  /* ---- version + patch-notes slot ---- */
  /* v6.1 (Puppet Purgatory, owned by P0 of the purgatory build plan section 3.5);
     v6.2 (the Creativity Update, owned by the lead of the creativity plan section 3.5): a DC_NO_CREA build is v6.1;
     v6.3 (the Malgorath Update, owned by the lead of the Malgorath plan section 9.6): a DC_NO_MALG build is v6.2 */
  /* split repo: a later version (npm run bump) keeps every older entry pinned; NEW counts the entries newer than v6.3 (0 at v6.3) */
  const crea=typeof V.crInfo==='function',malg=typeof V.mgInfo==='function',NEW=malg?Math.max(0,V.PATCH_LOG.findIndex(e=>e.v==='6.3')):0;
  const vgt=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);return x[0]>y[0]||(x[0]===y[0]&&x[1]>y[1]);};
  const VER=malg?(NEW?V.GAME_VERSION:'6.3'):crea?'6.2':'6.1',M=NEW+(malg?1:0),L=M+(crea?1:0),N63=V.PATCH_LOG[NEW];
  ok('GAME_VERSION is '+VER+(NEW?' (newer than 6.3)':''),V.GAME_VERSION===VER&&(!NEW||vgt(VER,'6.3')));
  if(malg){ok(NEW?'the v6.3 Malgorath Update notes are kept, pinned to 6.3':'the newest patch notes are the v6.3 Malgorath Update entry',V.PATCH_NOTES===V.PATCH_LOG[0]&&N63.v==='6.3'&&N63.title==='The Malgorath Update');
    ok('the v6.3 notes are written (no placeholder, at least 5 lines)',N63.lines.length>=5&&N63.lines.every(l=>!/PLACEHOLDER/.test(l)));}
  if(crea){const C=V.PATCH_LOG[M];ok('the v6.2 Creativity Update notes are '+(malg?'kept next, pinned to 6.2':'the newest entry'),(malg||V.PATCH_NOTES===C)&&C.v==='6.2'&&C.title==='The Creativity Update');
    ok('the v6.2 notes are written (no placeholder, at least 5 lines)',C.lines.length>=5&&C.lines.every(l=>!/PLACEHOLDER/.test(l)));}
  ok('the v6.1 Puppet Purgatory notes are kept, pinned to 6.1 (no placeholder, at least 6 lines)',V.PATCH_LOG[L].v==='6.1'&&V.PATCH_LOG[L].title==='Puppet Purgatory'&&
    V.PATCH_LOG[L].lines.length>=6&&V.PATCH_LOG[L].lines.every(l=>!/PLACEHOLDER/.test(l))&&(crea||V.PATCH_NOTES===V.PATCH_LOG[0]));
  ok('the v6.0 Hyperreal notes are kept, pinned to 6.0 (at least 8 lines)',V.PATCH_LOG[L+1].v==='6.0'&&V.PATCH_LOG[L+1].title==='Hyperreal'&&V.PATCH_LOG[L+1].lines.length>=8);
  ok('the v5.9 notes are kept, pinned to 5.9',V.PATCH_LOG[L+2].v==='5.9'&&V.PATCH_LOG[L+2].title==='Other Players');
  {const hh=fs.readFileSync(boot.BUILD+'head.html','utf8');
   ok('the help screen is Controls only ('+(crea?'the creativity controls row, ':'')+'no purgatory, final boss or texture-pack blurbs) and the title says v'+VER,!hh.includes('<b>Puppet Purgatory</b>')&&!/PLACEHOLDER/.test(hh)&&
     (!crea||hh.includes('<b>Creativity</b> '))&&!hh.includes('<b>The Final Boss</b>')&&!hh.includes('<b>Texture packs</b>')&&(NEW?(/id="t_ver"[^>]*>([^<]*)</.exec(hh)||[])[1]===V.RELEASE_LABEL:hh.includes('voxel sandbox — v'+VER+'</div>')));}

  /* ---- quality tiers ---- */
  const Q=V.HRQ;
  ok('four tiers: Low, Medium, High, Ultra',Q.length===4&&Q.map(t=>t.n).join()==='Low,Medium,High,Ultra');
  const fields=Object.keys(Q[0]);
  ok('every tier field has a value on all four tiers ('+(fields.length-1)+' fields)',fields.every(k=>Q.every(t=>t[k]!==undefined)));

  /* ---- shader-patch + tagging helpers ---- */
  let threw='';try{V.hrRep('abc','zzz','y','T1');}catch(e){threw=e.message;}
  ok('hrRep throws on a missing anchor, naming its tag',threw.includes('T1'));
  ok('hrRep replaces the first occurrence only',V.hrRep('a-b-a','a','X','T2')==='X-b-a');
  ok('hrRep inserts replacement text literally ($& is not a pattern)',V.hrRep('vec3 x;','x','$&$1','T3')==='vec3 $&$1;');
  const m={};ok('hrTag marks userData.hr and returns the object',V.hrTag(m)===m&&m.userData.hr===1&&V.hrTag(null)===null);
  ok('shadowsOn() is false in OG with Shaders off',V.shadowsOn()===false);
  const c=V.tpCaps();
  ok('tpCaps() is safe without WebGL2 (headless)',c&&c.webgl2===false&&c.floatRT===false&&c.maxLayers===0);
  ok('Auto resolves to Low without float render targets',V.tpAutoQ()===0);

  /* ---- static rules over the PART 54 sources ---- */
  const files=fs.readdirSync(GDIR).filter(f=>/^t[0ABC]_[A-Za-z0-9_]+\.js$/.test(f)).sort();
  ok('t0_contract.js is present',files.includes('t0_contract.js'));
  const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"\\])\/\/.*$/gm,'$1');
  const CONTRACT=['setPack','setQuality','tpEnable','tpDisable','tpFrame','tpRegister','tpTierFields','tpQ','tpOn','tpEmit','hrRep','hrTag','shadowsOn','tpNote','tpCaps','tpAutoQ','tpSnapR','tpRestoreR','tpSnapF','tpRestoreF','tpHand','tpRenderOnce','tpHashFrame','tpPerf','tpErr'];
  for(const f of files){const raw=boot.readSrc(GDIR+f,{legacy:true}),s=strip(raw);
    ok(f+': HTML-safe (no </script, no <!--)',!/<\/script/i.test(raw)&&raw.indexOf('<!--')<0);
    if(f==='t0_contract.js')continue;
    ok(f+': exports go to TPEX (TPX is the atlas tile size, 16)',!/\bTPX\b/.test(s));
    const redef=CONTRACT.filter(n=>new RegExp('^\\s*(?:async\\s+)?function\\s+'+n+'\\s*\\(','m').test(s)||new RegExp('^\\s*(?:const|let|var)\\s+'+n+'\\b','m').test(s));
    ok(f+': does not redefine contract functions'+(redef.length?' ('+redef.join(',')+')':''),redef.length===0);
    const shadow=(s.match(/^(?:const|let|var)\s+(B|P|T|G|HR|TP)\b|^(?:async\s+)?function\s+(B|P|T|G|HR|TP)\s*\(/gm)||[]);
    ok(f+': never shadows B, P, T, G, HR or TP at top level',shadow.length===0);
    ok(f+': no `var TP` / TP re-declaration',!/^\s*(?:var|let|const)\s+TP\s*=/m.test(s));}

  /* ---- the spliced build ---- */
  const G=fs.readFileSync(boot.BUILD+'game.js','utf8');
  const i54=G.indexOf('/* ---- PART 54: t0_contract.js ---- */');
  ok('PART 54 sits before the export branch',i54>0&&i54<G.indexOf("\nif(typeof window==='undefined'||typeof __VOXTEST"));
  ok('the Hyperreal cast is spliced inside hrLoadModels()',G.indexOf('\nfunction hrLoadModels(){\n')>i54);
  ok('the built game.js is HTML-safe',!/<\/script/i.test(G)&&G.indexOf('<!--')<0);
  let mfn=null;try{mfn=new Function('window','THREE','document','"use strict";'+require('../lib/real3.js').extractModels(G)+'\nreturn hrLoadModels;');}catch(e){console.log('  '+e.message);}
  ok('hrLoadModels() extracts and compiles standalone in strict mode (real3.models seam)',typeof mfn==='function');
  /* a PART 54 top-level function/var silently replacing a core one is the dangerous collision (const/let fail node --check) */
  const decl=(txt)=>{const out=[];const re=/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^var\s+([A-Za-z_$][\w$]*)/gm;let mm;while((mm=re.exec(txt)))out.push(mm[1]||mm[2]);return out;};
  const core=new Set(decl(G.slice(0,i54))),p54=decl(G.slice(i54,G.indexOf('\nfunction hrLoadModels(){\n')));
  const dupe=p54.filter((n,i)=>core.has(n)||p54.indexOf(n)!==i);
  ok('PART 54 declares no name the core (or another PART 54 file) already declares'+(dupe.length?' ('+[...new Set(dupe)].join(',')+')':''),dupe.length===0);
  const A=fs.readFileSync(boot.BUILD+'hrassets.js','latin1');
  ok('hrassets.js is ASCII with no < and a trailing newline',/^[\x00-\x7f]*$/.test(A)&&A.indexOf('<')<0&&A.endsWith('\n'));
  const am=require(boot.BUILD+'hrassets.js');
  ok('hrassets.js exports hrAssets/hrAssetMeta (profile '+(am.hrAssetMeta&&am.hrAssetMeta().profile)+')',typeof am.hrAssets==='function'&&am.hrAssetMeta().v===1&&Array.isArray(am.hrAssetMeta().tiles));

  /* ---- misuse is recorded, never thrown at load (a throw at PART 54 top level would brick the game) ---- */
  const w=console.warn;console.warn=()=>{};
  try{V.tpTierFields({t0bad:[1,2,3]});V.tpTierFields({n:['a','b','c','d']});V.tpRegister({name:'t0x'});}finally{console.warn=w;}
  ok('bad tier fields and bad modules are recorded, not thrown',V.getTP().errs.length===3&&V.getTP().mods.indexOf('t0x')<0);
});
