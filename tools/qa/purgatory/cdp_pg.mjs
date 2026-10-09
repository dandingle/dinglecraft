// cdp_pg.mjs (P0): a tiny CDP driver for YOUR OWN muted headless Chrome (the purgatory build plan section 9.3).
// usage: node cdp_pg.mjs <port> <url|-> <jsfile | -e code> [timeoutSec] [--shot out.png] [--seed N] [--hr] [--fresh] [--manual]
//   Launch Chrome yourself first (background), one per agent, on your own port and profile, ALWAYS muted:
//     tools/qa/chrome.sh <port> (or: "$CHROME" --headless=new --user-data-dir=out/qa/chrome_<port>
//       --remote-debugging-port=<port> --mute-audio --no-first-run --no-default-browser-check
//       --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows
//       --window-size=1280,720 --enable-gpu --use-angle=metal --ignore-gpu-blocklist about:blank
//   Every page load is muted before any game code runs: localStorage vx_vox_settings is MERGED with snd:0 (and tp:'og'
//   unless --hr), and after load soundOn=false; AC.suspend(). --seed N replaces Math.random with a seeded PRNG from the first
//   line of the page (deterministic cross-build comparisons). The code runs as an async function body in the page; the
//   result prints as {value, logs} (console warnings/errors and exceptions). --shot writes a PNG of the viewport afterwards.
//   Frames: with these flags headless rAF DOES run, unthrottled and fast, and frame() turns a backwards timestamp into
//   dt 0.016, so the game keeps running between your evaluate calls. --manual (from the first line of the page) makes
//   requestAnimationFrame a no-op: nothing moves except your own __vox.frameStep calls (strictly increasing timestamps).
//   Render with __vox.tpRenderOnce() in the same task as any canvas copy. Kill your Chrome when done.
import fs from 'fs';
const A=process.argv.slice(2),pos=[],o={};
for(let i=0;i<A.length;i++){const a=A[i];if(a==='--shot')o.shot=A[++i];else if(a==='--seed')o.seed=+A[++i];else if(a==='--hr')o.hr=1;else if(a==='--fresh')o.fresh=1;else if(a==='--manual')o.manual=1;else if(a==='-e'){o.code=A[++i];}else pos.push(a);}
const [port,url,a3,a4]=pos;
let code=o.code,tmo=+(o.code?(a3||120):(a4||120));if(!code)code=fs.readFileSync(a3,'utf8');
const list=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
let pg=list.find(t=>t.type==='page');
if(!pg||o.fresh){pg=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();}
const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map();const logs=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
  else if(m.method==='Runtime.exceptionThrown'){logs.push('exception: '+(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text).slice(0,400));}};
await new Promise(r=>ws.onopen=r);
const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
await send('Runtime.enable');await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
const MUTE=`try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}s.snd=0;${o.hr?'':"s.tp='og';"}localStorage.setItem(k,JSON.stringify(s));}catch(e){}`;
const SEED=o.seed!=null?`(function(){let a=${o.seed|0};Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();`:'';
await send('Page.addScriptToEvaluateOnNewDocument',{source:SEED+MUTE+(o.manual?'window.requestAnimationFrame=function(){return 0;};':'')});
if(url&&url!=='-'){await send('Page.navigate',{url});
  for(let i=0;i<240;i++){const r=await send('Runtime.evaluate',{expression:"typeof window.__vox==='object'&&document.readyState==='complete'",returnByValue:true});if(r.result&&r.result.result&&r.result.result.value)break;await new Promise(r=>setTimeout(r,500));}}
await send('Runtime.evaluate',{expression:"try{soundOn=false;if(typeof AC!=='undefined'&&AC&&AC.suspend)AC.suspend();}catch(e){}",returnByValue:true});
const r=await Promise.race([send('Runtime.evaluate',{expression:'(async()=>{try{soundOn=false;if(typeof AC!=="undefined"&&AC&&AC.suspend)AC.suspend();}catch(e){}\n'+code+'\n})()',awaitPromise:true,returnByValue:true}),new Promise(r=>setTimeout(()=>r({timeout:true}),tmo*1000))]);
if(o.shot){const s=await send('Page.captureScreenshot',{format:'png'});if(s.result&&s.result.data)fs.writeFileSync(o.shot,Buffer.from(s.result.data,'base64'));}
if(r.timeout)console.log(JSON.stringify({timeout:tmo,logs:logs.slice(-20)}));
else if(r.result&&r.result.exceptionDetails)console.log(JSON.stringify({error:(r.result.exceptionDetails.exception&&r.result.exceptionDetails.exception.description||r.result.exceptionDetails.text).slice(0,1500),logs:logs.slice(-20)}));
else console.log(JSON.stringify({value:r.result&&r.result.result&&r.result.result.value,logs:logs.slice(-30)},null,1));
ws.close();process.exit(0);
