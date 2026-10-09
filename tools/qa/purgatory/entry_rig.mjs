// entry_rig.mjs (P0): muted browser QA of the door set, the ritual through the real doUse, the entry cutscene, the Programme and
// the results card. 21 screenshots in <outDir> plus index.json; build a 5x6 sheet from them (sheets/a0_door_ritual_entry.jpg).
//   node tools/qa/purgatory/entry_rig.mjs <build-url> <outDir> [port]      (your own muted headless Chrome, see cdp_pg.mjs)
// requestAnimationFrame is disabled from the first line of the page: only __vox.frameStep moves the game.
import fs from 'fs';
const url=process.argv[2],out=process.argv[3],port=+(process.argv[4]||9341);fs.mkdirSync(out,{recursive:true});
const list=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const pg=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map();const logs=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
  else if(m.method==='Runtime.exceptionThrown'){logs.push('exception: '+(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text).slice(0,400));}};
await new Promise(r=>ws.onopen=r);
const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
await send('Runtime.enable');await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}s.snd=0;s.tp='og';localStorage.setItem(k,JSON.stringify(s));}catch(e){}window.requestAnimationFrame=function(){return 0;};"});
await send('Page.navigate',{url});
for(let i=0;i<240;i++){const r=await send('Runtime.evaluate',{expression:"typeof window.__vox==='object'&&document.readyState==='complete'",returnByValue:true});if(r.result&&r.result.result&&r.result.result.value)break;await new Promise(r=>setTimeout(r,500));}
const ev=async(code)=>{const r=await send('Runtime.evaluate',{expression:'(()=>{try{soundOn=false;if(typeof AC!=="undefined"&&AC&&AC.suspend)AC.suspend();}catch(e){}\n'+code+'\n})()',returnByValue:true});
  if(r.result&&r.result.exceptionDetails)logs.push('EVAL: '+(r.result.exceptionDetails.exception&&r.result.exceptionDetails.exception.description||'').slice(0,300));return r.result&&r.result.result&&r.result.result.value;};
let n=0;const shots=[];const shot=async(label)=>{const s=await send('Page.captureScreenshot',{format:'jpeg',quality:80});const f=out+'/'+String(n++).padStart(2,'0')+'.jpg';fs.writeFileSync(f,Buffer.from(s.result.data,'base64'));shots.push([f,label]);};
await ev(`window.QT=4e6;window.QS=n=>{for(let i=0;i<n;i++){QT+=40;__vox.frameStep(QT);}};const V=__vox;V.startNewWorld('qa','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.25);QS(160);
 V.P.inv[0]={id:V.B.DIRT,count:12};V.P.inv[1]={id:V.IT.NUKE,count:1};V.P.inv[2]={id:V.toolId(3,0),count:1};V.refreshHand();V.mpDoorHere();QS(30);
 const d=V.getMP().door;window.QD=d;const P=V.P;P.x=d.x+0.5+d.f[0]*9+d.f[1]*2;P.z=d.z+0.5+d.f[1]*9-d.f[0]*2;P.y=d.y+2.2;P.mode='c';P.flying=true;
 const dx=d.x+0.5-P.x,dz=d.z+0.5-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=0.05;QS(40);return [d,P.x,P.z];`);
await shot('door set by day');
await ev(`__vox.setTime(0.8);QS(20);`);await shot('door set at night (searchlight)');
await ev(`const V=__vox,P=V.P,d=QD;P.yaw+=0.0;P.pitch=0.55;QS(4);`);await shot('the beam at night');
await ev(`const V=__vox,P=V.P,d=QD;V.setTime(0.3);P.mode='s';P.flying=false;P.x=d.x+0.5+d.f[0]*3;P.z=d.z+0.5+d.f[1]*3;P.y=d.y+0.05;QS(25);
 const ax=d.x+0.5,ay=d.y+1,az=d.z+0.5,dx=ax-P.x,dy=ay-(P.y+P.eyeY),dz=az-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));
 P.sel=0;V.refreshHand();V.MB.r=true;QS(1);V.MB.r=false;QS(8);`);await shot('holding dirt: the frog snaps, Empty hand.');
await ev(`const V=__vox,P=V.P;P.sel=5;V.refreshHand();V.MB.r=true;QS(1);V.MB.r=false;QS(40);`);await shot('empty hand: the frog looks at you');
await ev(`const V=__vox;V.MB.r=true;QS(1);V.MB.r=false;QS(20);`);await shot('the bite: the frog lunges (t 0.8)');
await ev(`QS(30);`);await shot('the felt mouth closes, hotbar empties (t 2)');
await ev(`QS(20);`);await shot('t 2.8');
await ev(`QS(35);`);await shot('black, lid slam (t 4.2)');
await ev(`QS(30);`);await shot('the curtain rises on the stage (t 5.4)');
await ev(`QS(25);`);await shot('OLD GOAT heckles (t 6.4)');
await ev(`QS(25);`);await shot('OLDER GOAT (t 7.4)');
await ev(`QS(40);`);await shot('on the Mark, Programme hurled (t 9)');
await ev(`QS(30);const V=__vox;return V.mpInfo();`);await shot('purgatory stub stage');
await ev(`__vox.pguOpen(0);`);await shot('Programme page 1');
await ev(`__vox.pguGo(2);`);await shot('Programme page 3');
await ev(`__vox.pguGo(3);`);await shot('page 4 glued');
await ev(`const V=__vox,M=V.getMP();M.seenIng[V.IT.PG_FELT]=1;M.seenIng[V.IT.PG_FLOPPY]=1;V.pguClose(true);QS(10);V.pguOpen(0);V.pguNext();`);await shot('What next? highlights');
await ev(`__vox.pguOpen(12);__vox.getMP().page|=1<<12;__vox.pguRender();`);await shot('page 12b unlocked (forced)');
await ev(`__vox.pguClose(true);const V=__vox;V.getMP().dead.bomber=1;V.getMP().stats.deaths=6;V.mpExitNow();QS(20);`);await shot('results card');
await ev(`__vox.presClose(true);QS(10);const V=__vox,P=V.P,d=QD;P.mode='c';P.flying=true;P.x=d.x+0.5+d.f[0]*8;P.z=d.z+0.5+d.f[1]*8;P.y=d.y+2;const dx=d.x+0.5-P.x,dz=d.z+0.5-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=0;QS(30);`);await shot('after the escape: marquee CLOSED, trunk + Plunger');
fs.writeFileSync(out+'/index.json',JSON.stringify({shots,logs},null,1));
console.log(JSON.stringify({n:shots.length,logs}));
await send('Target.closeTarget',{targetId:pg.id}).catch(()=>{});ws.close();process.exit(0);
