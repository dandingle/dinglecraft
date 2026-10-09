// items_world_rig.mjs (P2): P2's things in the REAL stage (needs P1 and P3 real): the hub Bin and its volley, a Kitchen Burner
// cluster with drops sizzling, the Cook's Kitchen counters, the Labs HQ bench with the Lab Rat demoing (P3's NPCs) and the Transmogrifier,
// the Last Guest's trunk, a booth can. Muted, rAF disabled (only __vox.frameStep moves the game). Writes <outDir>/NN.jpg + index.json.
//   node tools/qa/purgatory/items_world_rig.mjs <build-url> <outDir> [port]
import fs from 'fs';
const url=process.argv[2],out=process.argv[3],port=+(process.argv[4]||9343);fs.mkdirSync(out,{recursive:true});
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
  if(r.result&&r.result.exceptionDetails)logs.push('EVAL: '+(r.result.exceptionDetails.exception&&r.result.exceptionDetails.exception.description||'').slice(0,400));return r.result&&r.result.result&&r.result.result.value;};
let n=0;const shots=[];const shot=async(label)=>{const s=await send('Page.captureScreenshot',{format:'jpeg',quality:82});const f=out+'/'+String(n++).padStart(2,'0')+'.jpg';fs.writeFileSync(f,Buffer.from(s.result.data,'base64'));shots.push([f,label]);};
const stubs=await ev(`window.QT=4e6;window.QS=n=>{for(let i=0;i<n;i++){QT+=40;__vox.frameStep(QT);}};const V=__vox;V.startNewWorld('qaw','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);QS(160);
  V.mpEnterNow();QS(120);window.GO=(x,z,y)=>{const P=V.P;V.forceChunksNear(x,z);P.x=x+0.5;P.z=z+0.5;P.y=y!=null?y:V.mpSurf(x,z)+1.05;P.vx=P.vy=P.vz=0;P.mode='c';P.flying=true;QS(40);};
  window.LOOK=(x,y,z)=>{const P=V.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));};return V.mpInfo().stubs;`);
/* the hub can at the Mark: a Floppy Pick crafted and hurled */
await ev(`const V=__vox,P=V.P,IT=V.IT,c=V.MPC.HUB_CAN;P.mode='s';P.flying=false;GO(c[0]-3,c[2]+1,36.05);P.inv[1]={id:IT.PG_FELT,count:3};P.inv[2]={id:IT.PG_ROD,count:2};QS(10);LOOK(c[0]+0.5,c[1]+0.5,c[2]+0.5);QS(2);`);
await shot('the Mark: Dan and the hub Bin');
await ev(`const V=__vox;V.piCraftSeam(V.IT.PG_FLOPPY,'pcan');QS(4);`);await shot('the lid flies open: the Floppy Pick comes at his face');
await ev(`QS(4);`);await shot('volley +0.16 s');await ev(`QS(40);`);
/* the Kitchen: a Burner cluster with drops sizzling */
const bu=await ev(`const V=__vox;GO(40,-10,null);let L=V.mwSpots('burner')||[];if(!L.length){GO(20,-20,null);L=V.mwSpots('burner')||[];}return L.slice(0,4);`);
if(bu&&bu.length){await ev(`const V=__vox,P=V.P,b=${JSON.stringify(bu[0])};GO(b[0]+3,b[2]+3,b[1]+3.5);V.spawnDrop(b[0]+0.5,b[1]+1.4,b[2]+0.5,{id:V.IT.PG_HANGER,count:3},0,0,0);
    V.spawnDrop(b[0]+1.5,b[1]+1.4,b[2]+0.5,{id:V.IT.PG_DOUGHBALL,count:2},0,0,0);QS(40);LOOK(b[0]+1,b[1]+1,b[2]+0.5);QS(2);`);
  await shot('a Kitchen Burner cluster: hangers and dough sizzling on the coils');
  await ev(`QS(70);`);await shot('a pop: the cooked item hops off toward the player');}
/* Labs HQ: the bench, the Lab Rat's demo, the Transmogrifier */
const tr=await ev(`const V=__vox;GO(-40,85,null);const t=V.mwSpots('trans')||[],b=V.mwSpots('labsBench')||[];QS(40);return {t:t[0],b:b[0]};`);
if(tr&&tr.b){await ev(`const V=__vox,P=V.P,IT=V.IT,b=${JSON.stringify(tr.b)};P.mode='s';P.flying=false;GO(b[0]+2,b[2]-3,b[1]+1.05);QS(10);const M=V.getMP();M.seenIng[IT.PG_SEQUIN]=1;
    P.inv[1]={id:IT.PG_SEQUIN,count:3};P.inv[2]={id:IT.PG_DRUMSTICK,count:1};P.inv[3]={id:IT.PG_ROD,count:1};QS(4);V.piCraftSeam(IT.PG_DISCO,'plab');QS(6);LOOK(b[0]+0.5,b[1]+1,b[2]+0.5);QS(2);`);
  await shot('Labs HQ: a Disco Pick at the Lab Bench, demonstrated on the Lab Rat (zap)');
  await ev(`QS(25);`);await shot('the demo +1 s');await ev(`QS(40);`);}
if(tr&&tr.t){await ev(`const V=__vox,P=V.P,t=${JSON.stringify(tr.t)};GO(t[0]+1,t[2]-5,t[1]+1.2);QS(40);LOOK(t[0]+0.5,t[1]+1.2,t[2]+0.5);QS(2);`);
  await shot('the Transmogrifier at Labs HQ');
  await ev(`const V=__vox,P=V.P,IT=V.IT;P.mode='s';P.flying=false;QS(4);P.inv[1]={id:IT.PG_KNUCKLE,count:4};P.inv[2]={id:IT.PG_FUSE,count:1};P.inv[3]={id:IT.PG_PEARLS,count:1};P.inv[4]={id:IT.PG_STILETTO,count:1,dur:600};
    V.getMP().seenIng[IT.PG_KNUCKLE]=1;QS(4);const t=${JSON.stringify(tr.t)};V.forceChunksNear(t[0],t[2]);P.x=t[0]+0.5;P.z=t[2]-3.5;P.y=V.mpSurf(t[0],t[2]-4)+1.05;QS(10);V.piCraftSeam(IT.PG_GAUNTLET,'ptrans');QS(30);LOOK(t[0]+0.5,t[1]+1.2,t[2]+0.5);QS(1);`);
  await shot('Transmogrifier running: 3 s of lightning');
  await ev(`QS(60);`);await shot('the Gauntlet out of the chute');}
/* the Last Guest's camp trunk */
const gt=await ev(`const V=__vox;GO(-40,-112,22);const g=V.mwSpots('guestTrunk')||[];return g[0];`);
if(gt){await ev(`const V=__vox,P=V.P,g=${JSON.stringify(gt)};P.mode='s';P.flying=false;GO(g[0]+2,g[2]+2,g[1]+0.05);QS(30);LOOK(g[0]+0.5,g[1]+0.5,g[2]+0.5);QS(2);`);
  await shot('the Last Guest camp: the half-kit Prop Trunk');
  await ev(`const V=__vox,g=${JSON.stringify(gt)};V.PREG.interact.chest?0:0;V.ensureBE(g[0],g[1],g[2],'chest');V.openModal('chest',V.pgCore().bkey(g[0],g[1],g[2]));QS(2);`);
  await shot('...inside: LARP Pick at 40%, 6 Rods, 4 Roast Rubber Chickens, a Custard Pie');await ev(`__vox.closeModal(true);QS(2);`);}
/* a booth's can */
const bc=await ev(`const V=__vox;GO(12,-50,null);return (V.mwSpots('boothCan')||[])[0];`);
if(bc){await ev(`const V=__vox,P=V.P,c=${JSON.stringify(bc)};GO(c[0]-2,c[2]+3,c[1]+1.2);QS(10);LOOK(c[0]+0.5,c[1]+0.5,c[2]+0.5);QS(2);`);await shot('Booth 1: its Bin');}
fs.writeFileSync(out+'/index.json',JSON.stringify({shots,logs,stubs},null,1));
console.log(JSON.stringify({n:shots.length,stubs,logs}));
await send('Target.closeTarget',{targetId:pg.id}).catch(()=>{});ws.close();process.exit(0);
