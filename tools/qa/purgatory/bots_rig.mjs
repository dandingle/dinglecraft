// bots_rig.mjs (P5): muted browser QA of the AI players' round trip: they fall out of the dark onto the heap 2 s apart (Brad face-first,
// creep onto the Bin and booted off, the followspot), work at the hub can, and fall out of the Stage Door after the escape while
// the stool frog bites xx_lilcreepah_xx at Dan's trunk. Screenshots + index.json in <outDir>; sheet: python3 qa/p2_sheet.py <outDir> <prefix>.
//   node tools/qa/purgatory/bots_rig.mjs <build-url> <outDir> [port]      (your own muted headless Chrome, see cdp_pg.mjs)
// requestAnimationFrame is disabled from the first line of the page (only __vox.frameStep moves the game), the brain URL points at a
// dead port (the page never contacts a brain server on this machine) and every load is muted (snd:0, soundOn=false, AC.suspend()).
import fs from 'fs';
const url=process.argv[2],out=process.argv[3],port=+(process.argv[4]||9346);fs.mkdirSync(out,{recursive:true});
const pg=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map();const logs=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
  else if(m.method==='Runtime.exceptionThrown'){logs.push('exception: '+(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text).slice(0,400));}};
await new Promise(r=>ws.onopen=r);
const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
await send('Runtime.enable');await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}s.snd=0;s.tp='og';localStorage.setItem(k,JSON.stringify(s));}catch(e){}"+
  "window.__DINGLE_BRAIN={url:'http://127.0.0.1:9',token:null};window.requestAnimationFrame=function(){return 0;};"});
await send('Page.navigate',{url});
for(let i=0;i<240;i++){const r=await send('Runtime.evaluate',{expression:"typeof window.__vox==='object'&&document.readyState==='complete'",returnByValue:true});if(r.result&&r.result.result&&r.result.result.value)break;await new Promise(r=>setTimeout(r,500));}
const ev=async(code)=>{const r=await send('Runtime.evaluate',{expression:'(()=>{try{soundOn=false;if(typeof AC!=="undefined"&&AC&&AC.suspend)AC.suspend();}catch(e){}\n'+code+'\n})()',returnByValue:true});
  if(r.result&&r.result.exceptionDetails)logs.push('EVAL: '+(r.result.exceptionDetails.exception&&r.result.exceptionDetails.exception.description||'').slice(0,300));return r.result&&r.result.result&&r.result.result.value;};
let n=0;const shots=[];const shot=async(label)=>{await ev('if(__vox.tpRenderOnce)__vox.tpRenderOnce();');const s=await send('Page.captureScreenshot',{format:'jpeg',quality:80});
  const f=out+'/'+String(n++).padStart(2,'0')+'.jpg';fs.writeFileSync(f,Buffer.from(s.result.data,'base64'));shots.push([f,label]);};
/* aim Dan's eye at a point from a position (first person: the bots are what we are looking at) */
const AIM=`window.QAIM=(x,y,z,tx,ty,tz)=>{const P=__vox.P;P.x=x;P.y=y;P.z=z;P.vx=P.vy=P.vz=0;const dx=tx-x,dy=ty-(y+P.eyeY),dz=tz-z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));};`;
await ev(`window.QT=4e6;window.QS=n=>{for(let i=0;i<n;i++){QT+=40;__vox.frameStep(QT);}};${AIM}const V=__vox;V.BRAIN.url='http://127.0.0.1:9';
 V.startNewWorld('qa5','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);QS(120);
 V.setBrainMock(null);Object.assign(V.BRAIN,{mock:null,ok:false,off:true,url:'http://127.0.0.1:9'});V.GR.bots=true;V.agJoinAll(false);QS(80);
 for(const a of V.AGENTS){V.agGive(a,{id:V.B.DIRT,count:20},'pickup');}
 V.mpDoorHere();QS(30);const d=V.getMP().door;window.QD=d;return [d,V.AGENTS.map(a=>a.name+' '+!!a.e)];`);
/* Dan's own arrival view: standing on the Mark (the heap is 6 m to one side, the hub can 3 m to the other) */
const HEAP='QAIM(1.5,36.2,-133.5,-6,36.4,-136)',CAN='QAIM(-1.5,36.2,-130.5,3.5,37.2,-133.5)';
await ev(`const V=__vox;V.mpEnterNow();QS(30);${HEAP};QS(1);`);
await shot('inside on the Mark, looking at the stuffing heap (bots still in the dark)');
const T=[[14,HEAP,'1.8 s: BunkerBrad falls out of the dark (followspot)'],[10,HEAP,'2.2 s: Brad lands on the stuffing heap'],[8,HEAP,'2.5 s: face-first, lying there'],
  [18,HEAP,'3.2 s: still face down in the stuffing'],[8,CAN,'3.5 s: xx_lilcreepah_xx falls at the hub can'],[5,CAN,'3.7 s: he lands on the Bin'],
  [6,CAN,'4.0 s: ...and a boot sends him off it'],[10,CAN,'4.4 s'],[26,HEAP,'5.4 s: honeybee_mc falls'],[12,HEAP,'5.9 s: honeybee_mc lands'],[40,HEAP,'7.5 s: all three inside']];
for(const [f,cam,l] of T){await ev(`QS(${f});${cam};QS(1);`);await shot(l);}
await ev(`QS(150);const V=__vox;const b=V.agByName('BunkerBrad');if(b&&b.e)QAIM(b.e.x+5,b.e.y+1.2,b.e.z+5,b.e.x,b.e.y+0.8,b.e.z);QS(1);`);await shot('the autopilot at work (Brad, 13 s in)');
await ev(`QS(400);const V=__vox;const b=V.agByName('honeybee_mc');if(b&&b.e)QAIM(b.e.x+4,b.e.y+1.5,b.e.z+4,b.e.x,b.e.y+0.8,b.e.z);QS(1);return V.AGENTS.map(a=>a.name+': '+a.inv.filter(Boolean).map(s=>V.DEFS[s.id].name+'x'+s.count).join(','));`);
await shot('honeybee_mc 30 s in');
const inv=await ev(`const V=__vox;return V.AGENTS.map(a=>a.name+' ['+(a.sk?a.sk.k:'-')+']: '+a.inv.filter(Boolean).map(s=>V.DEFS[s.id].name+'x'+s.count).join(','));`);
await ev(`const V=__vox;for(const a of V.AGENTS)V.agGive(a,{id:V.IT.PG_FELT,count:3},'pickup');V.mpExitNow({abandon:false});if(V.presOn())V.presClose(true);
 const d=QD,P=V.P;QAIM(d.x+0.5+d.f[0]*7+d.f[1]*1.5,d.y+0.2,d.z+0.5+d.f[1]*7-d.f[0]*1.5,d.x+0.5+d.f[1]*1.5,d.y+1.0,d.z+0.5-d.f[0]*1.5);QS(1);`);
await shot('out: the door set, the trunks (bots held)');
const E=[[26,'1.1 s: BunkerBrad falls out of the Stage Door'],[16,'1.7 s'],[36,'3.1 s: xx_lilcreepah_xx falls out'],[50,'5.1 s: honeybee_mc falls out'],
  [40,'6.7 s: creep makes a run at Dan’s trunk'],[25,'7.7 s: the stool frog bites him'],[20,'8.5 s'],[40,'10 s: "wasnt even going for it"']];
for(const [f,l] of E){await ev(`QS(${f});`);await shot(l);}
const fin=await ev(`const V=__vox;return {dims:V.AGENTS.map(a=>a.name+':'+a.dim+' '+(a.e?Math.round(a.e.x)+','+Math.round(a.e.z):'-')+' inv '+a.inv.filter(Boolean).length),
  bite:V.p5Core().mpDS.biteName,trunks:Object.keys(V.getMP().trunks),door:V.getMP().door};`);
fs.writeFileSync(out+'/index.json',JSON.stringify({shots,logs,inv,fin},null,1));
console.log(JSON.stringify({n:shots.length,logs:logs.slice(0,12),inv,fin}));
await send('Target.closeTarget',{targetId:pg.id}).catch(()=>{});ws.close();process.exit(0);
