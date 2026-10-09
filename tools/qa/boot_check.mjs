#!/usr/bin/env node
/* boot_check.mjs: the MUTED browser boot check of a built html (the first thing to run after `npm run build`).

   node tools/qa/boot_check.mjs --launch [--port 9397] [--profile DIR] [--build dist/dinglecraft_v<VER>.html] [--out DIR] [--no-hr]
   node tools/qa/boot_check.mjs --port 9397 [--server 9497] ...      (your own Chrome + server already running)

   --launch starts YOUR OWN headless Chrome (tools/qa/chrome.sh, --mute-audio) on --port and the repo's static server
   (scripts/serve.mjs) on port+100, and stops both at the end. Checks: the page loads with WebGL2, three r128, __vox and the
   repo's GAME_VERSION, sound off; an OG world starts and renders (frames step, the picture is neither black nor flat);
   Hyperreal switches on and renders; back to OG; zero console errors or exceptions throughout. Screenshots + summary.json
   go to --out (default out/qa/boot_check_<time>/). Exit 1 on any failed check.
   MUTED, always (tools/qa/lib/cdp.mjs): --mute-audio, vx_vox_settings {snd:0,mus:0,tp:'og'} before the page runs,
   soundOn=false + AC.suspend() on every evaluation, rAF disabled (only __vox.frameStep moves the game), the brain on a dead
   port, and tp:'og' restored at the end (vx_vox_settings is shared by every page on the origin). */
import fs from 'fs';import path from 'path';import {spawn,execFileSync} from 'child_process';
import {args,connect,REPO,defaultBuild,outDir,gameVersion,rel} from './lib/cdp.mjs';

const A=args(),PORT=+(A.port||9397),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild(),DO_HR=!A['no-hr'];
const OUT=path.resolve(A.out||outDir('boot_check'));fs.mkdirSync(OUT,{recursive:true});
const VER=gameVersion();
if(!fs.existsSync(path.join(REPO,BUILD))){console.log(`boot_check: ${BUILD} not found: run \`npm run build\` first`);process.exit(2);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const kids=[];
const stopKids=()=>{for(const k of kids){try{process.kill(k.pid,'SIGTERM');}catch(e){}}};
process.on('exit',stopKids);process.on('SIGINT',()=>{stopKids();process.exit(130);});

if(A.launch){
  const prof=path.resolve(A.profile||path.join(REPO,'out','qa','chrome_'+PORT));
  const pid=execFileSync(path.join(REPO,'tools','qa','chrome.sh'),[String(PORT),prof],{encoding:'utf8'}).trim();
  kids.push({pid:+pid,name:'chrome'});
  const srv=spawn(process.execPath,[path.join(REPO,'scripts','serve.mjs'),'--port',String(SRV)],{cwd:REPO,stdio:'ignore'});
  kids.push({pid:srv.pid,name:'server'});
  for(let i=0;i<50;i++){try{const r=await fetch(`http://127.0.0.1:${SRV}/`);if(r)break;}catch(e){}await sleep(100);}
}

const checks=[],shots=[];
const check=(name,cond,info)=>{checks.push({name,ok:!!cond,info:info===undefined?null:info});console.log((cond?'ok   ':'FAIL ')+name+(info!==undefined?'  '+JSON.stringify(info).slice(0,300):''));};
const C=await connect(PORT);
const shot=async name=>{const f=path.join(OUT,String(shots.length+1).padStart(2,'0')+'_'+name+'.jpg');await C.shot(f);shots.push(f);return f;};
/* step frames with strictly increasing timestamps; render once and measure the picture in the same task */
const HELP=`window.__bc={T:700000,stp(n){for(let i=0;i<(n||1);i++){if(paused&&playing)resumeGame();this.T+=40;__vox.frameStep(this.T);}},
  pic(){__vox.tpRenderOnce();const src=renderer.domElement,c=document.createElement('canvas');c.width=64;c.height=36;const g=c.getContext('2d');
    g.drawImage(src,0,0,64,36);const d=g.getImageData(0,0,64,36).data;let s=0,s2=0,n=0;for(let i=0;i<d.length;i+=4){const y=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];s+=y;s2+=y*y;n++;}
    const m=s/n;return {mean:+m.toFixed(1),sd:+Math.sqrt(Math.max(0,s2/n-m*m)).toFixed(1)};}};`;
const errs=()=>C.logs.filter(l=>/^(error|exception)/.test(l));

const t0=Date.now();
await C.open(`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`);
const loadS=(Date.now()-t0)/1000;
await C.ev(HELP);
const I=await C.ev(`const c=document.createElement('canvas');return {ver:__vox.GAME_VERSION,three:typeof THREE!=='undefined'?THREE.REVISION:null,
  gl2:!!c.getContext('webgl2'),rgl2:!!(typeof renderer!=='undefined'&&renderer.capabilities&&renderer.capabilities.isWebGL2),sound:soundOn,
  tp:JSON.parse(localStorage.getItem('vx_vox_settings')||'{}').tp,hasHR:typeof __vox.setPack==='function',
  payloads:typeof hrAssets==='function'?Object.keys(hrAssets()).length:0,mg:typeof hrMgAssets==='function'?Object.keys(hrMgAssets()).length:0};`);
check(`page loads (${loadS.toFixed(1)} s): GAME_VERSION ${I.ver} = repo ${VER}`,I.ver===VER,I);
check('three r128',I.three==='128',I.three);
check('WebGL2 (browser and the game renderer)',I.gl2&&I.rgl2,{gl2:I.gl2,renderer:I.rgl2});
check('sound off, tp og at load',I.sound===false&&I.tp==='og',{sound:I.sound,tp:I.tp});
check('embedded art present (hr + mg payloads)',I.payloads>0&&I.mg>0,{hr:I.payloads,mg:I.mg});
check('no console errors at load',errs().length===0,errs().slice(0,5));
await shot('title');

await C.ev(`const V=__vox;V.startNewWorld('bootcheck','1337','s');V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);__bc.stp(200);`);
const W=await C.ev(`return {playing,frame:__bc.T,y:+__vox.P.y.toFixed(2),pic:__bc.pic(),hr:__vox.getTP().hr,sound:soundOn};`);
check('OG world starts and steps 200 frames',W.playing===true&&W.hr===false&&W.sound===false,{playing:W.playing,y:W.y});
check('OG renders a real picture (not black, not flat)',W.pic.mean>20&&W.pic.sd>8,W.pic);
await shot('og_world');

if(DO_HR){
  const H=await C.ev(`await __vox.setQuality(1);const ok=await __vox.setPack('hr');__bc.stp(30);return {ok,tp:__vox.getTP(),pic:__bc.pic(),sound:soundOn};`);
  check('Hyperreal switches on',H.ok===true&&H.tp.hr===true&&H.tp.id==='hr',{id:H.tp.id,hr:H.tp.hr,q:H.tp.q,qr:H.tp.qr});
  check('Hyperreal renders a real picture',H.pic.mean>20&&H.pic.sd>8,H.pic);
  await shot('hr_world');
  const O=await C.ev(`const ok=await __vox.setPack('og');__bc.stp(10);return {ok,tp:__vox.getTP(),pic:__bc.pic(),sound:soundOn};`);
  check('back to OG',O.ok===true&&O.tp.hr===false&&O.tp.id==='og',{id:O.tp.id,hr:O.tp.hr});
  check('OG renders again after the switch',O.pic.mean>20&&O.pic.sd>8,O.pic);
  await shot('og_again');
}
const fin=await C.ev(`return {sound:soundOn,acState:typeof AC!=='undefined'&&AC?AC.state:null};`);
check('sound never on',fin.sound===false,fin);
await C.restoreOG();
const tpAfter=await C.ev(`return JSON.parse(localStorage.getItem('vx_vox_settings')||'{}').tp`);
check("vx_vox_settings tp restored to 'og'",tpAfter==='og',tpAfter);
check('zero console errors / exceptions in the whole session',errs().length===0,errs().slice(0,8));
const warns=C.logs.filter(l=>l.startsWith('warning'));
C.close();

const pass=checks.filter(c=>c.ok).length,fail=checks.length-pass;
fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify({build:BUILD,version:VER,loadSeconds:loadS,checks,warnings:warns.slice(0,40),
  shots:shots.map(rel),date:new Date().toISOString()},null,1));
console.log(`boot_check: ${pass} passed, ${fail} failed, ${warns.length} warning(s); shots + summary.json in ${rel(OUT)}`);
stopKids();
process.exit(fail?1:0);
