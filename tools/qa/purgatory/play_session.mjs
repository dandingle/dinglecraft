// play_session.mjs (PZ): a muted, brain-off play session in a REAL headless Chrome (WebGL, the real THREE, the real HUD):
// the speed-run pilot (qa/pilot.js + qa/nav.js + qa/route.js + P4's qa/boss_scripts.js) plays Puppet Purgatory from the
// Stage Door to the EXIT with the three AI players on their autopilot, while this script photographs it, times every frame
// and collects console errors. Writes <outDir>/NNN.jpg (+ hr_NNN.jpg), session.json, and prints a markdown report.
//   node tools/qa/purgatory/play_session.mjs <build-url> <outDir> [port] [--no-bots] [--hr-every=N] [--shot-every=S] [--legs=a,b]
// Your own muted headless Chrome (launch line in cdp_pg.mjs). Every load: vx_vox_settings snd:0 + tp:'og', soundOn=false,
// AC.suspend(); requestAnimationFrame is a no-op (only __vox.frameStep moves the game); the brain URL points at a dead port,
// so the page never contacts a brain server on this machine (the bots play on their autopilot). Sound is never turned on.
import fs from 'fs';
const A=process.argv.slice(2),pos=A.filter(a=>!a.startsWith('--')),opt=(k,d)=>{const a=A.find(x=>x.startsWith('--'+k+'='));return a?a.slice(k.length+3):d;};
const url=pos[0],out=pos[1],port=+(pos[2]||9350),BOTS=!A.includes('--no-bots'),HREV=+opt('hr-every','4'),SHOTS=+opt('shot-every','45'),ONLY=opt('legs',''),PRE=opt('pre',''),STOP=opt('stop-after','');
if(!url||!out){console.log('usage: node play_session.mjs <build-url> <outDir> [port] [--no-bots] [--hr-every=N] [--shot-every=S] [--seed=N] [--pre=file.js] [--stop-after=leg]');process.exit(2);}
fs.mkdirSync(out,{recursive:true});
const pg=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map();const logs=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
  else if(m.method==='Runtime.exceptionThrown'){logs.push('exception: '+(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text).slice(0,400));}};
await new Promise(r=>ws.onopen=r);
const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
await send('Runtime.enable');await send('Page.enable');
await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});   /* SimpleHTTP sends no Cache-Control: never test a stale build or pilot */
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}s.snd=0;s.tp='og';localStorage.setItem(k,JSON.stringify(s));}catch(e){}"+
  "window.__DINGLE_BRAIN={url:'http://127.0.0.1:9',token:null};window.requestAnimationFrame=function(){return 0;};"+
  /* a seeded Math.random from the first line of the page: the session is reproducible */
  "(function(){let s="+(+opt('seed','1337')>>>0)+";Math.random=function(){s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};})();"});
await send('Page.navigate',{url});
for(let i=0;i<240;i++){const r=await send('Runtime.evaluate',{expression:"typeof window.__vox==='object'&&document.readyState==='complete'",returnByValue:true});if(r.result&&r.result.result&&r.result.result.value)break;await new Promise(r=>setTimeout(r,500));}
const ev=async(code,awaitP)=>{const r=await send('Runtime.evaluate',{expression:'(async()=>{try{soundOn=false;if(typeof AC!=="undefined"&&AC&&AC.suspend)AC.suspend();}catch(e){}\n'+code+'\n})()',returnByValue:true,awaitPromise:true});
  if(r.result&&r.result.exceptionDetails)logs.push('EVAL: '+(r.result.exceptionDetails.exception&&r.result.exceptionDetails.exception.description||'').slice(0,400));return r.result&&r.result.result&&r.result.result.value;};
const base=new URL('/tests/pilot/',url).href;
/* the pilot in the page: the same modules the node harness uses, loaded with a tiny CommonJS shim */
const setup=await ev(`
  const V=__vox;window.PS={log:[],shots:[],frameMs:[],legMs:{},seq:0,lastShot:-1e9};const L=m=>{PS.log.push('['+(V.getMP().clock/60).toFixed(1)+'m] '+m);};
  const load=async f=>{const t=await (await fetch('${base}'+f)).text();const module={exports:{}};(new Function('module','exports','require',t))(module,module.exports,()=>{throw new Error('no require in the page');});return module.exports||window.makeRoute;};
  const mkPilot=await load('pilot.js'),mkNav=await load('nav.js'),BS=await load('boss_scripts.js'),mkRoute=await load('route.js');
  window.QT=5e6;const step=n=>{for(let i=0;i<(n||1);i++){QT+=40;const t0=performance.now();V.frameStep(QT);PS.frameMs.push(performance.now()-t0);}};
  const pilot=mkPilot(V,step);const nav=mkNav(V,pilot,{log:L});const R=mkRoute(V,pilot,{nav,BS,log:L,flag:()=>false,MODE:'full',VERB:true,env:{}});
  window.PS.pilot=pilot;window.PS.nav=nav;window.PS.R=R;window.PS.BS=BS;window.PS.L=L;window.PS.step=step;
  /* a photograph every SHOTS s of MP.clock: render once, copy the canvas at 640x360 (same task as the render) */
  const cv=document.createElement('canvas');cv.width=640;cv.height=360;const cx=cv.getContext('2d');
  PS.snap=(label,hr)=>{try{if(V.tpRenderOnce)V.tpRenderOnce();const g=document.getElementById('gl');cx.drawImage(g,0,0,640,360);PS.shots.push({n:PS.seq++,label,hr:!!hr,clock:+V.getMP().clock.toFixed(1),img:cv.toDataURL('image/jpeg',0.72)});}catch(e){L('snap failed '+e.message);}};
  const f0=pilot.S.pre;pilot.S.pre=()=>{if(f0)f0();const c=V.getMP().clock;if(c-PS.lastShot>=${SHOTS}){PS.lastShot=c;PS.snap('auto');}};
  return {ok:true,legs:R.ROUTE.length};`,true);
console.log('setup',JSON.stringify(setup),logs.slice(0,5));
const shots=[];let hrN=0;
async function pull(){const s=await ev(`const s=PS.shots;PS.shots=[];return s.map(x=>({n:x.n,label:x.label,hr:x.hr,clock:x.clock,img:x.img}));`,true)||[];
  for(const x of s){const f=out+'/'+(x.hr?'hr_':'')+String(x.n).padStart(3,'0')+'.jpg';fs.writeFileSync(f,Buffer.from(x.img.split(',')[1],'base64'));shots.push({file:f,label:x.label,clock:x.clock,hr:x.hr});}}
async function runLeg(name,code){const t0=Date.now();const r=await ev(`const {pilot,nav,R,BS,L,step}=PS;const V=__vox;const MP=()=>V.getMP();const f0=pilot.S.frames,c0=MP().clock,n0=PS.frameMs.length;let r=false,err=null;R.begin('${name}');
    try{r=await (async()=>{${code}})();}catch(e){err=String(e&&e.message||e);}R.end();
    const fm=PS.frameMs.slice(n0).sort((a,b)=>a-b),med=fm.length?fm[Math.floor(fm.length/2)]:0,p99=fm.length?fm[Math.floor(fm.length*0.99)]:0,mx=fm.length?fm[fm.length-1]:0;
    PS.snap('end of ${name}');return {leg:'${name}',ok:r===true,pending:r==='pending',clock_s:+(MP().clock-c0).toFixed(1),frames:pilot.S.frames-f0,err,frameMs:{median:+med.toFixed(2),p99:+p99.toFixed(2),max:+mx.toFixed(1)},
      bots:V.AGENTS.filter(a=>a.online).map(a=>({name:a.name,dim:a.dim,dead:!!a.dead,hp:a.hp,deaths:(MP().bots[a.name]||{}).deaths||0})),fails:pilot.S.fails.length};`,true);
  r.wall_s=+((Date.now()-t0)/1000).toFixed(1);await pull();return r;}
const LEGS=[];
/* the overworld: a fresh world, the bots join (brain off), the door, the frog, the cutscene */
LEGS.push(await runLeg('world',`V.startNewWorld('ps','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;
  Object.assign(V.BRAIN,{mock:null,ok:false,off:true,url:'http://127.0.0.1:9'});${BOTS?"V.GR.bots=true;V.agJoinAll(false);":""}
  pilot.allowJump('new world',4);for(let i=0;i<40;i++){pilot.expect(V.IT.PCOMPASS,1);pilot.frame(1);}pilot.frame(120);return V.getDim()==='over';`));
LEGS.push(await runLeg('door',`const d=V.mpDoorHere();pilot.allowJump('door stamped',2);pilot.frame(2);PS.snap('the Stage Door appears');
  return pilot.walkTo(d.x+0.5+d.f[0]*3,d.z+0.5+d.f[1]*3,{tol:1.0,max:30});`));
LEGS.push(await runLeg('ritual',`const d=MP().door;pilot.emptyHand();pilot.lookAt(d.x+0.5,d.y+1,d.z+0.5);pilot.use();PS.snap('the frog wants an empty hand');pilot.lookAt(d.x+0.5,d.y+1,d.z+0.5);pilot.use();
  for(let i=0;i<20;i++){pilot.frame(1);if(i%5===0)PS.snap('the entry cutscene');}return V.mpInfo().cut||MP().inside;`));
LEGS.push(await runLeg('cutscene',`pilot.frame(10);pilot.allowJump('setDim (entry)',40);pilot.space(2);pilot.frame(30);PS.snap('on the Mark');return V.getDim()==='puppet'&&MP().inside;`));
if(PRE)await ev(fs.readFileSync(PRE,'utf8'),true);   /* --pre=<file>: extra tracing in the page (fills PS.extra) */
const ids=await ev(`return PS.R.ROUTE.map(r=>r[0]);`,true);let k=0;
for(const lid of ids){if(ONLY&&!ONLY.split(',').includes(lid))continue;
  const r=await runLeg(lid,`const fn=R.ROUTE.find(q=>q[0]==='${lid}')[1];return fn();`);LEGS.push(r);
  console.log('leg',lid,r.ok?'ok':r.pending?'PENDING':'FAIL',r.clock_s+'s game',r.wall_s+'s wall','frame ms med/p99/max',r.frameMs.median,r.frameMs.p99,r.frameMs.max,r.err||'');
  if(HREV>0&&(++k%HREV===0)){/* a Hyperreal look at the same moment, then straight back to OG */
    await ev(`const V=__vox;const idle=async()=>{for(let i=0;i<300&&V.getTP().busy;i++)await new Promise(r=>setTimeout(r,100));};
      await idle();await V.setPack('hr');await idle();if(!PS.hq){PS.hq=1;await V.setQuality(1);await idle();}for(let i=0;i<6;i++)PS.step(1);
      PS.snap('Hyperreal Medium: after ${lid} ('+V.getTP().id+')',true);await V.setPack('og');await idle();for(let i=0;i<4;i++)PS.step(1);`,true);await pull();hrN++;}
  if(!r.ok&&!r.pending)break;if(STOP&&lid===STOP)break;}
const tail=await ev(`const V=__vox;const P=V.P;return {dim:V.getDim(),clock:+V.getMP().clock.toFixed(1),fails:PS.pilot.S.fails.slice(0,10),deaths:PS.R.ST.deaths,meals:PS.R.ST.eats,
  dmg:PS.R.DMG,frames:PS.pilot.S.frames,log:PS.log.slice(-3000),extra:PS.extra||null,bots:V.AGENTS.map(a=>({name:a.name,online:a.online,dim:a.dim,inv:(a.inv||[]).filter(Boolean).length})),
  hpMp:V.getMP().bots,results:V.presOn&&V.presOn()};`,true);
try{await ev(`try{const k='vx_vox_settings';let s=JSON.parse(localStorage.getItem(k)||'{}')||{};s.tp='og';s.snd=0;localStorage.setItem(k,JSON.stringify(s));}catch(e){}`,true);}catch(e){}
const allMs=LEGS.map(l=>l.frameMs.median);
const rep={url,bots:BOTS,legs:LEGS,tail,shots,consoleErrors:logs.slice(0,200)};
fs.writeFileSync(out+'/session.json',JSON.stringify(rep,null,1));
console.log('\n| leg | ok | game s | wall s | frame ms median | p99 | max |\n|---|---|---|---|---|---|---|');
for(const l of LEGS)console.log('| '+l.leg+' | '+(l.ok?'yes':l.pending?'PENDING':'NO')+' | '+l.clock_s+' | '+l.wall_s+' | '+l.frameMs.median+' | '+l.frameMs.p99+' | '+l.frameMs.max+' |');
console.log('end: dim '+tail.dim+', MP.clock '+(tail.clock/60).toFixed(1)+' min, deaths '+tail.deaths+', ledger fails '+tail.fails.length+', shots '+shots.length+' (HR '+hrN+'), console errors/warnings '+logs.length);
await send('Page.close').catch(()=>{});process.exit(0);
