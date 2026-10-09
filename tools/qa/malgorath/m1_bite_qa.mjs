// m1_bite_qa.mjs (M1): the MUTED browser look at THE BITE, every layout, both packs, as 5x6 contact sheets (MALGORATH_PLAN.md 10:
// "M1 the Bite from the lip / plate / gut in each layout, both packs"). Layouts are reached by setting the checkpoint (MALG.met / round
// / dead) with the fight replaced by an inert double, so the arena is photographed alone (whatever M2/M3 are in the build); --fight real
// keeps the build's fight. Shots per layout: the lip (the Bone Pile, looking in), high over the rim, on the plate, down in the gut,
// the stair from the side; then a night view, then Hyperreal. Checks: the layout settled, the live plate disc equals the classifier,
// no water inside, no console error. MUTED: --mute-audio Chrome, vx_vox_settings {snd:0,mus:0,tp:'og'} before the game runs, soundOn
// false + AC suspended on every evaluation, requestAnimationFrame disabled from the first line (only __vox.frameStep moves the game),
// the brain URL at a dead port. tp:'og' is put back at the end.
//   node scripts/serve.mjs --port 9482                                        (repo root, background)
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir=<scratch>/chrome_M1 \
//     --remote-debugging-port=9382 --mute-audio --no-first-run --no-default-browser-check --disable-background-timer-throttling \
//     --disable-renderer-backgrounding --window-size=1280,720 --enable-gpu --use-angle=metal --ignore-gpu-blocklist about:blank
//   node tools/qa/malgorath/m1_bite_qa.mjs --port 9382 [--build dist/dinglecraft_v<VER>.html] [--seed 1337] [--nohr]
import fs from 'fs';import {defaultBuild,gameVersion} from '../lib/paths.mjs';import path from 'path';import {fileURLToPath} from 'url';import {execFileSync} from 'child_process';
const A=Object.fromEntries(process.argv.slice(2).reduce((m,a,i,arr)=>{if(a.startsWith('--'))m.push([a.slice(2),arr[i+1]&&!arr[i+1].startsWith('--')?arr[i+1]:'1']);return m;},[]));
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..')+'/';
const PORT=+(A.port||9382),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild(),SEED=A.seed||'1337';
const OUT=path.resolve(A.out||ROOT+'out/qa/m1_bite_'+SEED+'_'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19));
fs.mkdirSync(OUT,{recursive:true});
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
let pg=list.find(t=>t.type==='page');if(!pg)pg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map(),logs=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
  else if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;logs.push('exception: '+((d.exception&&d.exception.description)||d.text).slice(0,400));}};
await new Promise(r=>ws.onopen=r);
const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
const MUTE="try{soundOn=false;if(typeof AC!=='undefined'&&AC)AC.suspend();}catch(e){}";
const ev=async(code)=>{const r=await send('Runtime.evaluate',{expression:'(async()=>{'+MUTE+'\n'+code+'\n})()',awaitPromise:true,returnByValue:true});
  if(r.result&&r.result.exceptionDetails){const d=r.result.exceptionDetails;throw new Error(((d.exception&&d.exception.description)||d.text).slice(0,900));}
  return r.result&&r.result.result?r.result.result.value:undefined;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shots=[],checks=[];
const check=(name,cond,info)=>{checks.push([name,!!cond,info===undefined?null:info]);console.log((cond?'ok   ':'FAIL ')+name+(info!==undefined&&!cond?' '+JSON.stringify(info).slice(0,500):''));};
const shot=async(name)=>{await ev('__m1.render();');await sleep(60);const r=await send('Page.captureScreenshot',{format:'jpeg',quality:84});
  const f=OUT+'/'+String(shots.length+1).padStart(2,'0')+'_'+name+'.jpg';fs.writeFileSync(f,Buffer.from(r.result.data,'base64'));shots.push(f);};
const HELP=`window.__m1={T:900000,
  stp(n){for(let i=0;i<(n||1);i++){if(paused&&playing&&!__vox.P.dead){try{resumeGame();}catch(e){}}this.T+=40;__vox.frameStep(this.T);}},
  render(){this.stp(1);if(__vox.getTP&&__vox.getTP().hr&&__vox.tpRenderOnce)try{__vox.tpRenderOnce();}catch(e){}},
  cam(x,y,z,lx,ly,lz){const P=__vox.P;P.mode='c';P.flying=true;P.x=x;P.y=y;P.z=z;P.vx=P.vy=P.vz=0;P.fallD=0;const dx=lx-x,dy=ly-(y+P.eyeY),dz=lz-z;
    P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));__vox.forceChunksNear(x,z);},
  hold(n){const P=__vox.P,s=[P.x,P.y,P.z,P.yaw,P.pitch];for(let i=0;i<(n||1);i++){this.stp(1);P.x=s[0];P.y=s[1];P.z=s[2];P.yaw=s[3];P.pitch=s[4];P.vx=P.vy=P.vz=0;}},
  settle(){for(let i=0;i<900&&(__vox.mg1Busy()||__vox.getMG1().L!==__vox.mg1Want());i++)this.stp(1);this.stp(2);return __vox.getMG1().L;},
  match(){const V=__vox,F=V.mgF(),GF=V.mgGF(),L=V.getMG1().L;let bad=0,n=0;for(let i=0;i<1500;i++){const dx=((i*37)%49)-24,dz=((i*61)%49)-24;if(dx*dx+dz*dz>576)continue;
    const y=GF+((i*13)%24),w=V.mg1In(L,1000+dx,y,1000+dz);if(w<0)continue;n++;if(V.getBlock(1000+dx,y,1000+dz)!==w)bad++;}return {bad,n};},
  wet(){const V=__vox,G=V.mgG(),GF=V.mgGF();let w=0;for(let k=0;k<64;k++){const a=k*Math.PI/32,rw=V.mgRw(a);for(let r=0;r<rw-0.6;r+=2){const x=Math.floor(1000.5+Math.cos(a)*r),z=Math.floor(1000.5+Math.sin(a)*r);
    for(let y=GF-2;y<=G+2;y++)if(V.getBlock(x,y,z)===V.B.WATER)w++;}}return w;}};`;
const boot=async()=>{for(let i=0;i<240;i++){let v=false;try{v=await ev("return typeof window.__vox==='object'&&document.readyState==='complete'");}catch(e){}if(v)break;await sleep(500);}
  await ev(HELP+"try{usePLock=false;lockWanted=false;}catch(e){}Object.assign(__vox.BRAIN,{mock:null,ok:false,off:true,url:'http://127.0.0.1:9'});if(__vox.setBrainMock)__vox.setBrainMock(null);");};
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}"+
  "s.snd=0;s.mus=0;s.tp='og';localStorage.setItem(k,JSON.stringify(s));}catch(e){}"+
  "window.__DINGLE_BRAIN={url:'http://127.0.0.1:9',token:null};window.requestAnimationFrame=function(){return 0;};"});
await send('Page.navigate',{url:`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`});await boot();
const info=await ev("return {ver:__vox.GAME_VERSION,stubs:__vox.mgInfo().stubs,sound:soundOn,title:document.title}");
check('the v'+gameVersion()+' build loaded with M1 real and the sound off',info.ver===gameVersion()&&info.stubs.indexOf('1')<0&&info.sound===false,info);
await ev(`const V=__vox;V.startNewWorld('m1qa','${SEED}','c');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);
  ${A.fight==='real'?'':"window.__m1F=V.MGREG.fight;V.MGREG.fight={stub:0,tick(){},wake(){return false;},dormant(){},brain(e){if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);},preHurt(){return -1;}};"}
  __m1.stp(60);const b=V.mg1BonePile();__m1.cam(b.x,b.y,b.z,1000.5,V.mgF(),1000.5);__m1.hold(220);`);
const geo=await ev("const V=__vox;return {G:V.mgG(),F:V.mgF(),GF:V.mgGF()};");
const views=async(tag,full)=>{const {G,F,GF}=geo;
  await ev(`const V=__vox,b=V.mg1BonePile();__m1.cam(b.x,b.y,b.z,1000.5,${F},1000.5);__m1.hold(40);`);await shot(tag+'_lip');
  await ev(`__m1.cam(1000.5-44,${G}+26,1000.5-30,1000.5,${F},1000.5);__m1.hold(90);`);await shot(tag+'_high');
  await ev(`__m1.cam(1000.5-15,${F},1000.5+3,1000.5+20,${F}+3,1000.5-4);__m1.hold(40);`);await shot(tag+'_plate');
  if(full){await ev(`__m1.cam(1000.5+18,${GF}+0.2,1000.5+20,1000.5-4,${F}-2,1000.5-6);__m1.hold(60);`);await shot(tag+'_gut');
    await ev(`__m1.cam(1000.5-31,${F}+6,1000.5+14,1000.5-31,${F}+2,1000.5);__m1.hold(40);`);await shot(tag+'_stair');}};
const STATES=[['L0',''],['L1','M.met=1;'],['L2','M.round=2;'],['L3','M.round=3;'],['Ldead','M.dead=1;V.getDEMON().dead=true;']];
for(const [L,code] of STATES){const got=await ev(`const V=__vox,M=V.getMALG();${code}return __m1.settle();`);
  const m=await ev('return __m1.match();'),w=await ev('return __m1.wet();');
  check(L+': the layout settled and the live plate disc is exactly the classifier, no water inside',got===L&&m.bad===0&&m.n>500&&w===0,{got,m,w});
  await views('og_'+L,true);}
await ev("__vox.setTime(0.8);__m1.stp(4);");await views('og_night_Ldead',false);await ev("__vox.setTime(0.3);__m1.stp(4);");
if(!A.nohr){const ok_=await ev("if(!__vox.setPack)return false;await __vox.setPack('hr');for(let i=0;i<400;i++){const t=__vox.getTP();if(!t.busy&&t.hr)return true;await new Promise(r=>setTimeout(r,250));}return false;");
  check('Hyperreal switched on',ok_);
  if(ok_){for(const [L,code] of [['L0','M.met=0;M.round=1;M.dead=0;V.getDEMON().dead=false;'],['L1','M.met=1;'],['L2','M.round=2;'],['L3','M.round=3;'],['Ldead','M.dead=1;V.getDEMON().dead=true;']]){
      const got=await ev(`const V=__vox,M=V.getMALG();${code}return __m1.settle();`);check('HR '+L+' settled',got===L,{got});await views('hr_'+L,L==='L0'||L==='L3');}
    await ev("await __vox.setPack('og');for(let i=0;i<200;i++){const t=__vox.getTP();if(!t.busy&&!t.hr)break;await new Promise(r=>setTimeout(r,200));}__m1.stp(4);");}}
const OA=await ev("return {snd:soundOn,game:typeof AC!=='undefined'&&AC?AC.state:'null'};");
check('the game never made a sound: soundOn false, no running AudioContext',OA.snd===false&&(OA.game==='null'||OA.game==='suspended'),OA);
await ev("try{const k='vx_vox_settings';const s=JSON.parse(localStorage.getItem(k)||'{}');s.tp='og';s.snd=0;localStorage.setItem(k,JSON.stringify(s));}catch(e){}");
const errs=logs.filter(l=>/^(error|exception)/.test(l));
check('no console errors or exceptions',errs.length===0,errs.slice(0,6));
try{execFileSync('python3',['-c',`
import sys,glob
from PIL import Image,ImageDraw
fa=sorted(glob.glob(sys.argv[1]+'/[0-9][0-9]_*.jpg'))
W,H=384,216
for p in range(0,len(fa),30):
  fs=fa[p:p+30];S=Image.new('RGB',(5*W,6*(H+18)),(24,24,24));d=ImageDraw.Draw(S)
  for i,f in enumerate(fs):
    im=Image.open(f).convert('RGB');im.thumbnail((W,H));x=(i%5)*W;y=(i//5)*(H+18);S.paste(im,(x,y+18));d.text((x+4,y+3),f.split('/')[-1][:-4],fill=(255,230,150))
  S.save(sys.argv[1]+('/sheet.jpg' if p==0 else '/sheet%d.jpg'%(p//30+1)),quality=88)`,OUT]);}catch(e){console.log('sheet failed',String(e).slice(0,200));}
fs.writeFileSync(OUT+'/summary.json',JSON.stringify({build:BUILD,seed:SEED,info,geo,checks,shots:shots.map(f=>path.relative(ROOT,f)),logs:logs.slice(-40)},null,1));
console.log(JSON.stringify({out:path.relative(ROOT,OUT),pass:checks.filter(c=>c[1]).length,fail:checks.filter(c=>!c[1]).length,errors:errs.slice(0,8)},null,1));
ws.close();process.exit(0);
