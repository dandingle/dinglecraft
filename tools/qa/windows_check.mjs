#!/usr/bin/env node
/* windows_check.mjs: plays the committed DINGLECRAFT.html the way a player does (double-click: a file:// page, no server) in a
   MUTED headless Chrome or Edge, on any OS. Written for the Windows runner in .github/workflows/windows.yml.

   node tools/qa/windows_check.mjs --browser chrome|edge|<path to the browser exe> [--port 9461] [--out DIR] [--no-hr]
   node tools/qa/windows_check.mjs --repro          the build reproduces DINGLECRAFT.html byte for byte on this machine

   Checks: the page loads from file:// with WebGL2, three r128 and the newest shipped GAME_VERSION, sound off; an OG world
   starts and renders (not black, not flat); the world saves, survives a page reload (file:// storage) and loads again;
   Hyperreal switches on and renders, and back to OG; zero console errors or exceptions. Screenshots + summary.json go to
   --out (default out/qa/windows_check_<time>/). Exit 1 on any failed check.
   MUTED, always (tools/qa/lib/cdp.mjs): --mute-audio, vx_vox_settings {snd:0,mus:0,tp:'og'} before the page runs,
   soundOn=false + AC.suspend() on every evaluation, rAF disabled (only __vox.frameStep moves the game), the brain on a dead
   port. CI has no GPU, so WebGL runs on SwiftShader (software): slow, but the same WebGL2 code path. */
import fs from 'fs';import os from 'os';import path from 'path';import crypto from 'crypto';
import {spawn,spawnSync} from 'child_process';import {pathToFileURL} from 'url';
import {args,connect,REPO,outDir,rel} from './lib/cdp.mjs';

const A=args(),PLAY=path.join(REPO,'DINGLECRAFT.html');
const md5=f=>crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
const vcmp=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);return x[0]-y[0]||x[1]-y[1];};
const shipped=JSON.parse(fs.readFileSync(path.join(REPO,'tests','fixtures','shipped.json'),'utf8')).shipped||{};
const NEWEST=Object.keys(shipped).sort(vcmp).pop();
if(!fs.existsSync(PLAY)){console.log('windows_check: DINGLECRAFT.html not found (npm run release puts it at the repo root)');process.exit(2);}

/* --repro: build here and compare with the committed play file (only meaningful when the sources are that release) */
if(A.repro){
  const r=spawnSync(process.execPath,[path.join(REPO,'scripts','build.mjs'),'--strict'],{cwd:REPO,encoding:'utf8'});
  const out=(r.stdout||'')+(r.stderr||'');console.log(out.split('\n').filter(l=>/FROZEN|BUILD|WARNING|not shipped/.test(l)).join('\n'));
  if(r.status!==0){console.log('windows_check --repro: FAIL the build failed on '+os.platform());process.exit(1);}
  const info=JSON.parse(fs.readFileSync(path.join(REPO,'build','build.json'),'utf8'));
  if(info.version!==NEWEST){console.log(`windows_check --repro: skipped (the sources are v${info.version}, the play file is the v${NEWEST} release)`);process.exit(0);}
  const same=info.html.md5===md5(PLAY);
  console.log(`windows_check --repro: ${same?'ok  ':'FAIL'} the ${os.platform()} build of v${info.version} is byte-identical to DINGLECRAFT.html (md5 ${info.html.md5})`);
  process.exit(same?0:1);
}

const CANDIDATES={
  chrome:['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/google-chrome-stable'],
  edge:['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge','/usr/bin/microsoft-edge'],
};
const want=A.browser||'chrome',EXE=CANDIDATES[want]?CANDIDATES[want].find(p=>fs.existsSync(p)):want;
if(!EXE||!fs.existsSync(EXE)){console.log(`windows_check: no ${want} browser found`);process.exit(2);}
const NAME=CANDIDATES[want]?want:path.basename(EXE),PORT=+(A.port||9461),DO_HR=!A['no-hr'];
const OUT=path.resolve(A.out||outDir('windows_check'));fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const prof=fs.mkdtempSync(path.join(os.tmpdir(),'dc_wincheck_'));
const br=spawn(EXE,['--headless=new','--mute-audio','--remote-debugging-port='+PORT,'--user-data-dir='+prof,'--no-first-run',
  '--no-default-browser-check','--enable-unsafe-swiftshader','--window-size=1280,720','about:blank'],{stdio:'ignore'});
const stop=()=>{try{br.kill();}catch(e){}};
process.on('exit',stop);process.on('SIGINT',()=>{stop();process.exit(130);});
let verStr='';
for(let i=0;i<100;i++){try{const v=await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();verStr=v.Browser;break;}catch(e){}await sleep(200);}
if(!verStr){console.log(`windows_check: ${NAME} did not open its debugging port`);process.exit(1);}

const checks=[],shots=[];
const check=(name,cond,info)=>{checks.push({name,ok:!!cond,info:info===undefined?null:info});console.log((cond?'ok   ':'FAIL ')+name+(info!==undefined?'  '+JSON.stringify(info).slice(0,300):''));};
const C=await connect(PORT);
await C.send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__glev=[];for(const k of ['webglcontextlost','webglcontextrestored','webglcontextcreationerror'])"+
  "addEventListener(k,e=>{try{__glev.push({k,id:(e.target&&e.target.id)||'?',t:Math.round(performance.now())});}catch(x){}},true);"});
const shot=async name=>{const f=path.join(OUT,String(shots.length+1).padStart(2,'0')+'_'+name+'.jpg');await C.shot(f);shots.push(f);return f;};
const HELP=`window.__wc={T:700000,stp(n){for(let i=0;i<(n||1);i++){if(paused&&playing)resumeGame();this.T+=40;__vox.frameStep(this.T);}},
  pic(){__vox.tpRenderOnce();const src=renderer.domElement,c=document.createElement('canvas');c.width=64;c.height=36;const g=c.getContext('2d');
    g.drawImage(src,0,0,64,36);const d=g.getImageData(0,0,64,36).data;let s=0,s2=0,n=0;for(let i=0;i<d.length;i+=4){const y=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];s+=y;s2+=y*y;n++;}
    const m=s/n;return {mean:+m.toFixed(1),sd:+Math.sqrt(Math.max(0,s2/n-m*m)).toFixed(1)};}};`;
const errs=()=>C.logs.filter(l=>/^(error|exception)/.test(l));
const real=p=>p.mean>20&&p.sd>8;
const URL_=pathToFileURL(PLAY).href;

console.log(`windows_check: ${verStr} on ${os.platform()} ${os.release()}, DINGLECRAFT.html v${NEWEST} (md5 ${md5(PLAY)})`);
const t0=Date.now();
await C.open(URL_);
const loadS=(Date.now()-t0)/1000;
await C.ev(HELP);
const I=await C.ev(`const c=document.createElement('canvas');return {ver:__vox.GAME_VERSION,three:typeof THREE!=='undefined'?THREE.REVISION:null,
  proto:location.protocol,gl2:!!c.getContext('webgl2'),rgl2:!!(typeof renderer!=='undefined'&&renderer.capabilities&&renderer.capabilities.isWebGL2),
  sound:soundOn,tp:JSON.parse(localStorage.getItem('vx_vox_settings')||'{}').tp,storage:typeof storageOK==='function'&&storageOK(),
  gpu:(()=>{try{const g=renderer.getContext(),x=g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER);}catch(e){return null;}})(),
  title:{live:document.getElementById('title').classList.contains('tbg-live'),css:document.getElementById('title').classList.contains('tbg-css')},glev:window.__glev};`);
console.log('gpu: '+I.gpu+' | title panorama: '+JSON.stringify(I.title)+' | webgl events: '+JSON.stringify(I.glev));
check(`page loads from ${I.proto} (${loadS.toFixed(1)} s): GAME_VERSION ${I.ver} = the newest release ${NEWEST}`,I.ver===NEWEST&&I.proto==='file:',I);
check('three r128',I.three==='128',I.three);
check('WebGL2 (browser and the game renderer)',I.gl2&&I.rgl2,{gl2:I.gl2,renderer:I.rgl2});
check('sound off, tp og at load; world storage available',I.sound===false&&I.tp==='og'&&I.storage===true,{sound:I.sound,tp:I.tp,storage:I.storage});
check('no console errors at load',errs().length===0,errs().slice(0,5));
await shot('title');

await C.ev(`const V=__vox;V.startNewWorld('wincheck','1337','s');V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);__wc.stp(200);`);
const W=await C.ev(`return {playing,y:+__vox.P.y.toFixed(2),pic:__wc.pic(),sound:soundOn};`);
check('a new OG world starts and steps 200 frames',W.playing===true&&W.sound===false,{playing:W.playing,y:W.y});
let rec=null;
if(!real(W.pic)){for(let i=1;i<=10&&!rec;i++){await sleep(500);const p=await C.ev(`__wc.stp(10);return __wc.pic();`);if(real(p))rec={afterS:i*0.5,pic:p};}}
const ev1=await C.ev(`return window.__glev;`);
check('OG renders a real picture (not black, not flat)'+(rec?` (black at first, recovered by itself after ${rec.afterS} s)`:''),real(W.pic)||!!rec,{first:W.pic,recovered:rec,webglEvents:ev1});
await shot('og_world');

const S=await C.ev(`const ok=await saveToStorage('wincheck',true);return {ok,list:await listWorlds()};`);
check('the world saves',S.ok!==false&&Array.isArray(S.list)&&S.list.includes('wincheck'),S);
await C.open(URL_);await C.ev(HELP);
const R=await C.ev(`const list=await listWorlds();if(!(list||[]).includes('wincheck'))return {list};await loadWorldByName('wincheck');__wc.stp(60);
  return {list,playing,pic:__wc.pic()};`);
check('the save survives a page reload (file:// storage) and loads again',(R.list||[]).includes('wincheck')&&R.playing===true&&real(R.pic),R);
await shot('reloaded_world');

if(DO_HR){
  const H=await C.ev(`await __vox.setQuality(1);const ok=await __vox.setPack('hr');__wc.stp(30);return {ok,tp:__vox.getTP(),pic:__wc.pic(),sound:soundOn};`);
  check('Hyperreal switches on',H.ok===true&&H.tp.hr===true&&H.tp.id==='hr',{id:H.tp.id,hr:H.tp.hr,q:H.tp.q,qr:H.tp.qr});
  check('Hyperreal renders a real picture',real(H.pic),H.pic);
  await shot('hr_world');
  const O=await C.ev(`const ok=await __vox.setPack('og');__wc.stp(10);return {ok,tp:__vox.getTP(),pic:__wc.pic()};`);
  check('back to OG, and it renders',O.ok===true&&O.tp.hr===false&&real(O.pic),{id:O.tp.id,pic:O.pic});
}
const fin=await C.ev(`return {sound:soundOn};`);
check('sound never on',fin.sound===false,fin);
check('zero console errors / exceptions in the whole session',errs().length===0,errs().slice(0,8));
const warns=C.logs.filter(l=>l.startsWith('warning'));
const glevAll=await C.ev(`return window.__glev;`).catch(()=>null);
C.close();stop();

const pass=checks.filter(c=>c.ok).length,fail=checks.length-pass;
fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify({browser:verStr,platform:os.platform()+' '+os.release(),play:'DINGLECRAFT.html',
  version:NEWEST,gpu:I.gpu,titlePanorama:I.title,webglEvents:glevAll,loadSeconds:loadS,checks,warnings:warns.slice(0,40),shots:shots.map(rel),date:new Date().toISOString()},null,1));
console.log(`windows_check (${NAME}): ${pass} passed, ${fail} failed, ${warns.length} warning(s); shots + summary.json in ${rel(OUT)}`);
try{fs.rmSync(prof,{recursive:true,force:true});}catch(e){}
process.exit(fail?1:0);
