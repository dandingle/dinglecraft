// cdp.mjs: the shared tiny CDP client for the MUTED QA rigs (from the v6.3 m3_lib.mjs). Your own headless Chrome
// (tools/qa/chrome.sh <port>) and your own static server on port+100 (node scripts/serve.mjs --port <port+100>).
// MUTED, always: Chrome runs with --mute-audio; every document gets vx_vox_settings {snd:0, mus:0, tp:'og'} merged in before
// the game runs; every evaluation sets soundOn=false and suspends AC; requestAnimationFrame is disabled from the first line
// (only __vox.frameStep or an explicit render draws); the brain URL points at a dead port (127.0.0.1:9).
// vx_vox_settings is shared by every page on the origin: call restoreOG() at the end of any Hyperreal session.
import fs from 'fs';import path from 'path';
import {REPO,defaultBuild,outDir,gameVersion} from './paths.mjs';
export {REPO,defaultBuild,outDir,gameVersion};
export const ROOT=REPO+'/';
export function args(){return Object.fromEntries(process.argv.slice(2).reduce((m,a,i,arr)=>{if(a.startsWith('--'))m.push([a.slice(2),arr[i+1]&&!arr[i+1].startsWith('--')?arr[i+1]:'1']);return m;},[]));}
export async function connect(port){const list=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  let pg=list.find(t=>t.type==='page');if(!pg)pg=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map(),logs=[];
  ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
    else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
    else if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;logs.push('exception: '+((d.exception&&d.exception.description)||d.text).slice(0,400));}};
  await new Promise(r=>ws.onopen=r);
  const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
  const MUTE="try{soundOn=false;if(typeof AC!=='undefined'&&AC)AC.suspend();}catch(e){}";
  const ev=async(code)=>{const r=await send('Runtime.evaluate',{expression:'(async()=>{'+MUTE+'\n'+code+'\n})()',awaitPromise:true,returnByValue:true});
    if(r.result&&r.result.exceptionDetails){const d=r.result.exceptionDetails;throw new Error(((d.exception&&d.exception.description)||d.text).slice(0,1200));}
    return r.result&&r.result.result?r.result.result.value:undefined;};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const open=async(url)=>{await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
    await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}"+
      "s.snd=0;s.mus=0;s.tp='og';if(!s.pn)s.pn='QA';localStorage.setItem(k,JSON.stringify(s));}catch(e){}"+
      "window.__DINGLE_BRAIN={url:'http://127.0.0.1:9',token:null};window.requestAnimationFrame=function(){return 0;};"});
    await send('Page.navigate',{url});
    for(let i=0;i<400;i++){try{const ok=await ev("return typeof window.__vox==='object'&&document.readyState==='complete'");if(ok)break;}catch(e){}await sleep(250);}
    await ev("try{usePLock=false;lockWanted=false;}catch(e){}if(__vox.BRAIN)Object.assign(__vox.BRAIN,{mock:null,ok:false,off:true,url:'http://127.0.0.1:9'});");};
  const shot=async(file,clip)=>{const r=await send('Page.captureScreenshot',Object.assign({format:'jpeg',quality:86},clip?{clip:Object.assign({scale:1},clip)}:{}));fs.writeFileSync(file,Buffer.from(r.result.data,'base64'));return file;};
  const restoreOG=async()=>{try{await ev("const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}s.tp='og';s.snd=0;localStorage.setItem(k,JSON.stringify(s));");}catch(e){}};
  return {send,ev,sleep,open,shot,logs,restoreOG,close:()=>ws.close()};}
/* write data-URL JPEGs to files */
export function saveData(file,dataURL){fs.writeFileSync(file,Buffer.from(dataURL.split(',')[1],'base64'));return file;}
export const rel=p=>{const r=path.relative(REPO,p);return r&&!r.startsWith('..')&&!path.isAbsolute(r)?r.split(path.sep).join('/'):path.basename(p);};
