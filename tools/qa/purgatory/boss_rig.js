/* boss_rig.js (P4): muted browser QA of the three headliners and the Strike (BUILD_PLAN.md 9.3). Drives YOUR OWN muted headless
   Chrome (see cdp_pg.mjs for the launch line) with requestAnimationFrame disabled, so only __vox.frameStep moves the game.
   Every telegraph, self-demo and phase is staged and photographed; 5x6 contact sheets are written to qa/sheets/boss_<fight>.jpg
   (labels burned in; under $DC_OUT_DIR/qa/sheets when set), plus <outDir>/index.json with the console log.
     node tools/qa/purgatory/boss_rig.js <build-url> <outDir> [port] [bomber,bigpig,bigfrog,strike] [--hr]
   Dan is god-mode (GR.god) so the bosses keep targeting him without killing him; the camera is Dan's eye, placed at vantage
   points (the pilot is not used: this is photography, not play). Never turns sound on. */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const A=process.argv.slice(2),HRF=A.includes('--hr'),pos=A.filter(a=>!a.startsWith('--'));
const url=pos[0],out=pos[1],port=+(pos[2]||9345),which=(pos[3]||'bomber,bigpig,bigfrog,strike').split(',');
const SHEETS=path.join(process.env.DC_OUT_DIR?path.resolve(process.env.DC_OUT_DIR):path.join(__dirname,'..','..','..','out'),'qa','sheets');
(async()=>{fs.mkdirSync(out,{recursive:true});fs.mkdirSync(SHEETS,{recursive:true});
  const pg=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map();const logs=[];
  ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
    else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
    else if(m.method==='Runtime.exceptionThrown'){logs.push('exception: '+(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text).slice(0,400));}};
  await new Promise(r=>ws.onopen=r);
  const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}s.snd=0;"+(HRF?"s.tp='hr';s.tq=1;":"s.tp='og';")+"localStorage.setItem(k,JSON.stringify(s));}catch(e){}window.requestAnimationFrame=function(){return 0;};(function(){let a=4242;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();"});
  await send('Page.navigate',{url});
  for(let i=0;i<300;i++){const r=await send('Runtime.evaluate',{expression:"typeof window.__vox==='object'&&document.readyState==='complete'",returnByValue:true});if(r.result&&r.result.result&&r.result.result.value)break;await new Promise(r=>setTimeout(r,500));}
  const ev=async(code)=>{const r=await send('Runtime.evaluate',{expression:'(()=>{try{soundOn=false;if(typeof AC!=="undefined"&&AC&&AC.suspend)AC.suspend();}catch(e){}\n'+code+'\n})()',returnByValue:true});
    if(r.result&&r.result.exceptionDetails)logs.push('EVAL: '+(r.result.exceptionDetails.exception&&r.result.exceptionDetails.exception.description||'').slice(0,400));return r.result&&r.result.result&&r.result.result.value;};
  let shots=[];const all={};
  const shot=async(fight,label)=>{const s=await send('Page.captureScreenshot',{format:'jpeg',quality:82});const f=path.join(out,fight+'_'+String(shots.length).padStart(2,'0')+'.jpg');
    fs.writeFileSync(f,Buffer.from(s.result.data,'base64'));shots.push([f,label]);};
  /* helpers living in the page */
  await ev(`window.QT=6e6;window.QS=n=>{for(let i=0;i<n;i++){QT+=40;__vox.frameStep(QT);}};
    window.QLOOK=(x,y,z)=>{const P=__vox.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));};
    window.QAT=(x,y,z,lx,ly,lz)=>{const V=__vox,P=V.P;V.forceChunksNear(x,z);P.x=x;P.y=y;P.z=z;P.vx=P.vy=P.vz=0;P.fallD=0;QLOOK(lx,ly,lz);};
    window.QF=()=>{const f=__vox.getMPF().fight;return f&&!f.over?f:null;};window.QE=()=>{const f=QF();return f?f.e:null;};
    window.QHOLD=(e,st)=>{e.st=st;e.stT=0;};
    const V=__vox;V.startNewWorld('bossqa','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);QS(160);
    V.mpEnterNow();QS(40);return V.mpInfo();`);
  const fresh=async n=>ev(`const V=__vox;if(V.getDim()==='puppet'){V.mpExitNow({abandon:true});QS(10);if(V.presOn())V.presClose(true);}V.mpEnterNow();QS(30);V.hnSkipTo(${n});QS(40);V.GR.god=true;V.P.hp=20;QS(5);`);
  const camFree=`const P=__vox.P;P.mode='c';P.flying=true;`;
  /* ------------------------------------------------------------------ THE DEMOLITIONIST */
  if(which.includes('bomber')){shots=[];await fresh(1);
    await ev(camFree+`QAT(0.5,48,-150.5,0.5,35,-176);QS(25);`);await shot('bomber','the apron from the proscenium: 4 stations, 12 plate groups, DO NOT PUSH');
    await ev(`QAT(36,44,-156,26,36,-166);QS(10);`);await shot('bomber','RED station: riser, seat plate, frayed lead one block short');
    await ev(`const V=__vox,P=V.P;P.mode='s';P.flying=false;for(let i=0;i<36;i++){const s=P.inv[i];if(s&&s.id===V.IT.PG_SNIPS)P.inv[i]=null;}
      QAT(0.5,35.05,-172.5,0.5,36.4,-176);QS(10);const d=V.hnProp('bomber','dnp');V.hnHitAs(d,2,'Dan','melee',true);QS(14);QLOOK(0.5,36,-177.5);QS(1);`);await shot('bomber','no Wire Snips: the demo. The Demolitionist pops out behind the plunger');
    await ev(`QS(36);`);await shot('bomber','...looks your felt tools over, giggles');
    await ev(`QS(10);QLOOK(0.5,36.5,-176);QS(1);`);await shot('bomber','he slams DO NOT PUSH himself');
    await ev(`QS(6);`);await shot('bomber','the spark crawls into the welcome mat under Dan');
    await ev(`QS(16);`);await shot('bomber','"COME BACK WHEN YOU CAN CUT A WIRE!"');
    await ev(`const V=__vox;QS(80);V.P.inv[5]={id:V.IT.PG_SNIPS,count:1};QAT(0.5,35.05,-178.6,0.5,36.4,-176);QS(10);V.hnHitAs(V.hnProp('bomber','dnp'),2,'Dan','melee',true);QS(25);`);await shot('bomber','the real fight: the intro letterbox');
    await ev(`QS(60);const e=QE();QAT(36,37,-160,28,36,-164);QS(1);return e&&e.st;`);
    for(let k=0;k<40;k++){const st=await ev(`QS(4);const e=QE();if(e)QLOOK(e.x,e.y+1,e.z);return e&&e.st;`);if(st==='windup')break;}
    await shot('bomber','The Demolitionist climbs on his seat: the cackling wind-up');
    await ev(`QS(31);`);await shot('bomber','the self-demo: the lead round his ankle, his own seat blows');
    await ev(`QS(10);const e=QE();QLOOK(e.x,e.y+1,e.z);`);await shot('bomber','launched 10 m up');
    await ev(`QS(35);const e=QE();QLOOK(e.x,e.y+0.5,e.z);`);await shot('bomber','dazed in a heap (x1.5)');
    for(let k=0;k<60;k++){const st=await ev(`QS(4);const e=QE();return e&&e.st;`);if(st==='windup')break;}
    await ev(`const e=QE();QAT(e.x-4,e.y+3,e.z+5,e.x,e.y+1,e.z);QS(2);`);await shot('bomber','the next station (BLUE): wind-up');
    await ev(`QS(36);const V=__vox;const A=V.hnA();QAT(10.5,40,-170,15,35,-182);QS(1);`);await shot('bomber','the spark runs the network; the plate groups blow');
    /* wire a seat */
    await ev(`const V=__vox,A=V.hnA(),s=A.st[3];V.setBlock(s.gap[0],s.gap[1],s.gap[2],V.B.PG_CORD);QAT(s.gap[0]+0.5,38,s.gap[2]-3,s.gap[0]+0.5,35,s.gap[2]+0.5);QS(2);`);await shot('bomber','a Det Cord placed in WHITE’s lead gap (the seat is wired)');
    for(let k=0;k<120;k++){const st=await ev(`QS(4);const e=QE();return e?e.st+':'+e.tgt:'';`);if(st==='windup:3')break;}
    await ev(`const e=QE();QAT(e.x+5,e.y+2,e.z-4,e.x,e.y+1,e.z);QS(32);QLOOK(QE().x,QE().y+1,QE().z);`);await shot('bomber','his own seat blows under him (the signature move)');
    for(let k=0;k<60;k++){const st=await ev(`QS(4);const e=QE();return e&&e.st;`);if(st==='trace'||st==='snip')break;}
    await ev(`const e=QE();QAT(e.x-3,e.y+2.2,e.z-3,e.x,e.y+0.6,e.z);QS(2);`);await shot('bomber','he follows your wire with his finger, back turned (x2)');
    /* P2 */
    await ev(`const V=__vox,f=QF(),e=QE();e.hp=131;e.pfloor=null;f.lastDan=V.getMP().clock;V.hnHitAs(e,4,'Dan','melee',true);QS(60);`);
    for(let k=0;k<80;k++){const n=await ev(`QS(3);return __vox.entities.filter(x=>x.t==='pproj'&&x.kind==='bundle'&&!x.dead).length;`);if(n>0)break;}
    await ev(`const V=__vox,P=V.P,e=QE();QAT(P.x+2.5,P.y+3.2,P.z-2.5,P.x,P.y,P.z);QS(1);`);await shot('bomber','P2 STICKY: a sticky bundle lobbed, the pink landing ring');
    await ev(`const V=__vox,e=QE(),P=V.P;V.hnHStick(P,'the Demolitionist',P.x,P.y+1,P.z);QS(4);QLOOK(e.x,e.y+1,e.z);`);await shot('bomber','stuck on Dan: smoke at the top of the screen, a red wick');
    await ev(`const V=__vox,e=QE(),H=V.getHNH();const b=H.bundles.find(x=>x.host===V.P);if(b){b.host=e;b.cd=1;e.st='panic';e.stT=0;}QS(12);QLOOK(e.x,e.y+1,e.z);`);await shot('bomber','passed to the Demolitionist: he panics, flapping');
    await ev(`QS(70);const e=QE();QLOOK(e.x,e.y+0.5,e.z);`);await shot('bomber','it blows on him: 20 and stunned');
    /* P3 */
    await ev(`const V=__vox,f=QF(),e=QE();e.hp=61;e.pfloor=null;f.lastDan=V.getMP().clock;V.hnHitAs(e,4,'Dan','melee',true);QS(100);QAT(8.5,42,-170,0.5,37,-163);QS(30);`);await shot('bomber','P3 THE BIG ONE: rolled onto its hatch, the long fuse lit');
    for(let k=0;k<60;k++){const on=await ev(`QS(5);return !!__vox.getHNH().fuse;`);if(on)break;}
    await ev(`QS(40);const H=__vox.getHNH(),A=__vox.hnA();const c=H.fuse&&A.fuse[H.fuse.i];if(c)QAT(c[0]+3,38,c[2]+3,c[0]+0.5,35,c[2]+0.5);QS(2);`);await shot('bomber','the spark crawls the fuse at 3 blocks/s');
    await ev(`const V=__vox,H=V.getHNH(),A=V.hnA();const c=H.fuse&&A.fuse[H.fuse.i+3];if(c)V.setBlock(c[0],c[1],c[2],V.B.AIR);QS(150);const e=QE();QAT(e.x+3,e.y+2,e.z-3,e.x,e.y+0.5,e.z);QS(2);return e.st;`);await shot('bomber','cut ahead of the spark: he kneels to splice it (x2)');
    for(let k=0;k<80;k++){const st=await ev(`QS(4);const e=QE();return e&&e.st;`);if(st==='bomb')break;}
    await ev(`const V=__vox,A=V.hnA();const lv=V.hnProp('bomber','lever');QAT(lv.x+1.6,35.05,lv.z-0.8,0.5,37,-163);V.P.mode='s';V.P.flying=false;V.P.inv[0]={id:V.IT.PG_SNIPS,count:1};V.P.sel=0;V.refreshHand();QS(1);V.hnHitAs(lv,3,'Dan','melee',true);QS(8);`);await shot('bomber','the Trap Release lever: the hatch drops');
    await ev(`QS(22);const P=__vox.P;P.mode='c';P.flying=true;QAT(0.5,46,-150,0.5,35,-176);QS(4);`);await shot('bomber','a thump: smoke from all seven hatches');
    await ev(`QS(8);const e=QE();if(e)QLOOK(e.x,e.y,e.z);`);await shot('bomber','he is blown out of a random hatch');
    await ev(`const V=__vox,f=QF(),e=QE();e.pinv=0;f.win=null;e.hp=3;f.lastDan=V.getMP().clock;V.hnHitAs(e,10,'Dan','melee',true);QS(140);QAT(10.5,40,-150,0.5,38,-163);QS(2);`);await shot('bomber','the kill: he climbs onto the Big One and lights his own fuse');
    await ev(`QS(70);QLOOK(0.5,60,-163);`);await shot('bomber','...launched straight up through the Grid');
    await ev(`QS(60);QAT(0.5,40,-164,0.5,35,-170);QS(4);`);await shot('bomber','The Demolitionist’s Headliner Trunk; the Plunger and his Fuse in the hotbar');
    all.bomber=shots.slice();}
  /* ------------------------------------------------------------------ THE PIG */
  if(which.includes('bigpig')){shots=[];await fresh(2);
    await ev(camFree+`QAT(0.5,58,52,0.5,58,100);QS(30);`);await shot('bigpig','THE GRAND STAIRCASE: three lanes, banisters, landings, the Star Platform');
    await ev(`QAT(14,66,128,0.5,64,131);QS(4);`);await shot('bigpig','the Star Platform: vanity, followspot towers, the gantry and the Big Lamp');
    await ev(`const V=__vox,P=V.P;P.mode='s';P.flying=false;QAT(0.5,44.05,67.4,0.5,48,90);QS(5);P.z=69.4;QS(4);`);await shot('bigpig','over the velvet rope: the intro');
    await ev(`QS(90);QAT(-7.5,54.05,96.5,1.5,47,76);QS(2);`);   /* on the middle landing, looking down the flights the pigs bounce down */
    for(let i=0;i<6;i++){await ev(`QS(14);`);await shot('bigpig',['P1: piglets bounce down step by step','a rolling hog down a lane','the pigs come every 1.2 s','the Hero Hog lands on a landing','a Pork Bomb','Fallen Piglets at the foot'][i]);}
    await ev(`QAT(-6.5,64.05,125.5,0.5,64,131);QS(4);`);await shot('bigpig','Dan on the platform: P2 begins');
    for(let k=0;k<60;k++){const st=await ev(`QS(3);const e=QE();return e&&e.st;`);if(st==='preen')break;}
    await ev(`const e=QE();QAT(e.x+2.5,e.y+0.6,e.z-3,e.x,e.y+1.4,e.z);QS(2);`);await shot('bigpig','the self-demo: she preens at her own vanity (x2)');
    await ev(`QS(80);const e=QE();QAT(e.x-6,e.y+1,e.z-4,e.x,e.y+1.2,e.z);QS(2);`);await shot('bigpig','three followspots on her (-25% each)');
    await ev(`const V=__vox;V.hnPSpot(V.hnProp('bigpig','spot0'),1,'Dan');V.hnPSpot(V.hnProp('bigpig','spot1'),1,'Dan');QS(12);const e=QE();QLOOK(e.x,e.y+1,e.z);`);await shot('bigpig','two beams on Dan: "HOW DARE YOU UPSTAGE ME" (the pink dust line)');
    await ev(`const V=__vox,P=V.P,e=QE();P.inv[0]={id:V.IT.PG_VMIRROR,count:1};P.sel=0;V.refreshHand();V.MB.r=true;for(let i=0;i<8;i++){QLOOK(e.x,e.y+1.4,e.z);QS(1);}`);await shot('bigpig','a Vanity Mirror raised: she stops dead to admire herself');
    await ev(`const V=__vox;V.MB.r=false;QS(80);const H=V.getHNP();H.chopCd=0;H.tossT=99;const e=QE();QAT(e.x,e.y+1.05-1,e.z-3,e.x,e.y+1.4,e.z);QS(14);QLOOK(e.x,e.y+1.4,e.z);`);await shot('bigpig','CHOP: the chop tell');
    await ev(`QS(10);`);await shot('bigpig','...YAH! the shockwave');
    await ev(`QS(60);const V=__vox,H=V.getHNP();H.tossT=0;H.chopCd=99;const e=QE();QAT(e.x+3.5,e.y+1.05-1,e.z,e.x,e.y+1.4,e.z);QS(18);QLOOK(e.x,e.y+1.6,e.z);`);await shot('bigpig','THE DIVA TOSS: she raises her trotters');
    await ev(`QS(22);`);await shot('bigpig','the smooch; lifted overhead');
    await ev(`QS(30);`);await shot('bigpig','hurled down the staircase');
    await ev(`const V=__vox,f=QF(),e=QE();QS(60);e.hp=106;e.pinv=0;f.win=null;f.lastDan=V.getMP().clock;V.hnHitAs(e,4,'Dan','melee',true);QS(40);V.getHNP().chorT=0;QAT(-2.5,66,124.5,0.5,64,131);QS(30);`);await shot('bigpig','P3: the kickline ("And-a-one...")');
    await ev(`QS(25);`);await shot('bigpig','eight pigs in top hats sweep the platform');
    await ev(`const V=__vox,L=V.getHNP().line;if(L)V.hnPDominoes('Dan');QS(20);`);await shot('bigpig','hit the end pig: dominoes');
    await ev(`QS(40);const e=QE();QLOOK(e.x,e.y+1,e.z);`);await shot('bigpig','she CHOPs her own chorus, back turned (x2)');
    for(let k=0;k<60;k++){const st=await ev(`QS(4);const e=QE();return e&&e.st;`);if(st==='pose')break;}
    await ev(`const e=QE();QAT(6,65.5,126,0.5,66,131);QS(2);`);await shot('bigpig','the pose under the Big Lamp, fully lit');
    await ev(`const V=__vox;V.P.inv[1]={id:V.IT.PG_SNIPS,count:1};V.P.sel=1;V.refreshHand();V.hnHitAs(V.hnProp('bigpig','cleat'),2,'Dan','melee',true);QS(9);`);await shot('bigpig','the Lamp Cleat cut: the Big Lamp drops on her (40)');
    await ev(`const V=__vox,f=QF(),e=QE();QS(30);e.pinv=0;f.win=null;e.hp=3;f.lastDan=V.getMP().clock;V.hnHitAs(e,10,'Dan','melee',true);QS(30);QAT(12,60,100,0.5,60,120);QS(2);`);await shot('bigpig','"Tell my fans... it was the lighting..."');
    await ev(`QS(70);QLOOK(0.5,52,95);`);await shot('bigpig','she rolls down the entire staircase');
    await ev(`QS(160);QAT(4,46,62,0.5,44,66);QS(4);`);await shot('bigpig','a heap at the foot; her Headliner Trunk');
    all.bigpig=shots.slice();}
  /* ------------------------------------------------------------------ THE FROG */
  if(which.includes('bigfrog')){shots=[];await fresh(3);
    await ev(camFree+`QAT(0.5,64,186,0.5,50,215);QS(30);`);await shot('bigfrog','THE BACK SWAMP clearing: three rings of lily pads, the log, the moon');
    await ev(`QAT(4,52,206,0.5,51.5,215.5);QS(10);`);await shot('bigfrog','the Frog on his log, croaking');
    await ev(`const V=__vox,A=V.hnA(),P=V.P;P.mode='s';P.flying=false;const pad=A.pads.find(p=>p.ring===20&&p.z<200);QAT(pad.x-0.4,50.05,pad.z-0.4,0.5,52,215.5);QS(3);QS(30);`);await shot('bigfrog','an outer pad: he settles and turns his head 180');
    await ev(`QS(70);`);
    for(let k=0;k<60;k++){const st=await ev(`QS(2);const T=__vox.getHNK().tg;return T&&T.st;`);if(st==='aim')break;}
    await ev(`QS(6);`);await shot('bigfrog','the tongue: a 0.7 s pink aim line (the self-demo fly)');
    await ev(`QS(14);const T=__vox.getHNK().tg;if(T)QLOOK(T.tip[0],T.tip[1],T.tip[2]);`);await shot('bigfrog','stuck to an inner pad: x3 on the tongue');
    await ev(`QS(60);const V=__vox,A=V.hnA(),P=V.P;const pad=A.pads.find(p=>p.ring===8);QAT(pad.x-0.4,50.05,pad.z-0.4,0.5,52,215.5);QS(2);V.hnKTongueStart(QE(),QF(),P);QS(18);`);await shot('bigfrog','the tongue hits Dan');
    await ev(`QS(10);`);await shot('bigfrog','reeled in at 13 m/s');
    await ev(`QS(30);`);await shot('bigfrog','SWALLOWED: Inside the Frog, the Hand fills the far wall');
    await ev(`QS(80);`);await shot('bigfrog','the fingers close in (the 12 s timer)');
    await ev(`const V=__vox;const fs=V.getHNS().props.bigfrog.filter(p=>!p.dead&&p.kind==='finger');for(const f of fs){f.hitT=0;f.relay(5,'Dan');QS(8);}QS(10);`);await shot('bigfrog','four finger hits: spat 12 m across the clearing');
    await ev(`QS(40);const V=__vox,A=V.hnA();let s=null;for(let dx=-12;dx<=12&&!s;dx++)for(let dz=-12;dz<=12&&!s;dz++){const x=dx,z=215+dz;if(V.getBlock(x,49,z)===V.B.PG_SHEET&&Math.hypot(x+0.5,z-214.5)>6&&Math.hypot(x+0.5,z-214.5)<10)s=[x,z];}
      QAT(s[0]+0.5,50.05,s[1]+0.5,0.5,51,215.5);QS(2);V.hnKStrum(QE(),QF());QS(10);QLOOK(0.5,49,215.5);`);await shot('bigfrog','a croak: the ripple runs out through the sheet');
    await ev(`const V=__vox,f=QF(),e=QE();QS(30);e.hp=241;e.pinv=0;f.win=null;f.lastDan=V.getMP().clock;V.hnHitAs(e,4,'Dan','melee',true);QS(80);QAT(e.x+4,52,e.z-5,e.x,e.y+1.2,e.z);QS(2);`);await shot('bigfrog','P2: the Frog calls the cues');
    await ev(`const V=__vox,K=V.getHNK();K.cueT=999;K.cueI=0;V.hnKCue(QE(),QF());QS(8);QLOOK(V.P.x,49,V.P.z+2);`);await shot('bigfrog','"Standby sandbags... sandbags GO." (shadows)');
    await ev(`QS(24);`);await shot('bigfrog','the sandbags drop and stay as footholds');
    await ev(`const V=__vox,K=V.getHNK();K.cueI=1;V.hnKCue(QE(),QF());QS(50);QLOOK(V.P.x-8,52,V.P.z);`);await shot('bigfrog','"Traveler GO." a curtain wall with one split');
    await ev(`const V=__vox,K=V.getHNK();QS(60);K.cueI=2;V.hnKCue(QE(),QF());QS(10);const g=K.dare;if(g)QLOOK(g.land[0],g.land[1],g.land[2]);`);await shot('bigfrog','"Cue the Daredevil." the red arc');
    await ev(`QS(40);`);await shot('bigfrog','the Daredevil lands face-first: a 3x3 tear');
    await ev(`const V=__vox,K=V.getHNK();QS(40);K.cueI=3;V.hnKCue(QE(),QF());QS(30);const e=QE();QLOOK(e.x,e.y+1.2,e.z);`);await shot('bigfrog','"Lights... blackout GO."');
    await ev(`const V=__vox,K=V.getHNK(),e=QE();QS(140);e.hp=163;K.flailDone=false;K.tg=null;e.st='seat';V.hnHitAs(e,2,'Dan','melee',true);QS(40);QAT(e.x+6,54,e.z-8,e.x,e.y,e.z);QS(2);`);
    for(let k=0;k<60;k++){const st=await ev(`QS(3);const e=QE();return e&&e.st;`);if(st==='flail')break;}
    await ev(`QS(20);const e=QE();QLOOK(e.x,e.y,e.z);`);await shot('bigfrog','THE FLAIL: pinwheeling across the sheet');
    await ev(`QS(90);const e=QE();QLOOK(e.x,e.y,e.z);`);await shot('bigfrog','...he trips over his own feet');
    await ev(`const V=__vox,f=QF(),e=QE();QS(60);e.hp=127;e.pinv=0;f.win=null;f.lastDan=V.getMP().clock;V.getHNK().tg=null;e.st='seat';V.hnHitAs(e,4,'Dan','melee',true);QS(30);QAT(10,60,200,0.5,58,221);QS(1);`);await shot('bigfrog','P3 THE ARM: the sheet rips, he rises');
    await ev(`QS(70);QLOOK(0.5,62,221);`);await shot('bigfrog','a frog on a colossal forearm');
    await ev(`const V=__vox,K=V.getHNK();const el=K.elbowE;QAT(el.x+2.6,45.05,el.z,el.x,el.y+0.7,el.z);QS(2);`);await shot('bigfrog','under the floor: the ELBOW in the Bog Hollow');
    await ev(`const V=__vox,K=V.getHNK();const el=K.elbowE;el.hitT=0;V.hnHitAs(el,7,'Dan','melee',true);QS(12);`);await shot('bigfrog','an elbow hit: it swings to the far side');
    await ev(`const V=__vox,f=QF(),e=QE();QS(30);e.pinv=0;f.win=null;e.hp=3;f.lastDan=V.getMP().clock;const el=V.getHNK().elbowE;el.hitT=0;V.hnHitAs(el,9,'Dan','melee',true);QS(20);QAT(8,56,206,0.5,60,221);QS(2);`);await shot('bigfrog','the hand slides out of him');
    await ev(`QS(60);QLOOK(0.5,51,215.5);`);await shot('bigfrog','an empty felt sack on his log');
    await ev(`QS(60);`);await shot('bigfrog','"Okay. That’s a wrap. Strike it."');
    all.bigfrog=shots.slice();}
  /* ------------------------------------------------------------------ STRIKE */
  if(which.includes('strike')){shots=[];await fresh(3);
    await ev(`const V=__vox,M=V.getMP();M.dead.bomber=1;M.dead.bigpig=1;M.dead.bigfrog=1;QAT(0.5,50.05,200.5,0.5,52,230);QS(5);V.hnStrikeStart();QS(20);`);await shot('strike','the applause heals');
    await ev(`QS(60);`);await shot('strike','WORK LIGHTS: everything looks like what it is');
    await ev(`QS(300);QAT(0.5,58,232,0.5,52,262);QS(1);`);await shot('strike','the push broom comes out of the dark at the back wall');
    await ev(`QS(40);QLOOK(0.5,55,260);`);await shot('strike','bristles 192 wide, two filthy work boots');
    await ev(`const V=__vox,S=V.getHNSK();QAT(0.5,48,160.5,0.5,48,200);S.z=V.P.z+28;QS(10);`);await shot('strike','running downhill, the broom behind');
    await ev(`const V=__vox,S=V.getHNSK();S.handDone=[0,1,1,1,1];QAT(0.5,48,206.5,0.5,48,180);QS(1);V.P.z=204.5;QS(4);`);await shot('strike','the Hand: its shadow grows ahead of you');
    await ev(`QS(22);QLOOK(__vox.P.x,60,__vox.P.z-4);`);await shot('strike','...and it slams down');
    await ev(`const V=__vox,S=V.getHNSK();QS(80);S.walls=[null,null,null];S.z=V.P.z+60;QAT(-20.5,52,75.5,0,48,42);QS(70);`);await shot('strike','Traveler GO: a wall across Arch 2, one gap with a work-light column');
    await ev(`const V=__vox,S=V.getHNSK();S.z=V.P.z+60;QAT(0.5,50,-240.5,0.5,55,-280);QS(30);`);await shot('strike','up the House aisle to the EXIT');
    await ev(`const V=__vox,S=V.getHNSK();S.z=V.P.z+60;QAT(0.5,58.05,-288.5,0.5,60,-299);QS(30);`);await shot('strike','the Old Goats stand and applaud');
    await ev(`const V=__vox;V.P.z=-298.2;QS(30);`);await shot('strike','out through the Stage Door: the results card');
    all.strike=shots.slice();}
  /* the sheets (5x6, labels burned in) */
  const py=`import json,sys
from PIL import Image,ImageDraw,ImageFont
d=json.load(open(sys.argv[1]))['all']
for name,L in d.items():
  W,H=1280//4,720//4;cols,rows=5,6;sheet=Image.new('RGB',(W*cols,H*rows),(16,16,16));dr=ImageDraw.Draw(sheet)
  for i,(f,lab) in enumerate(L[:30]):
    im=Image.open(f).resize((W,H));x,y=(i%cols)*W,(i//cols)*H;sheet.paste(im,(x,y))
    dr.rectangle([x,y+H-16,x+W,y+H],fill=(0,0,0));dr.text((x+3,y+H-14),(str(i+1)+' '+lab)[:56],fill=(255,240,160))
  sheet.save(sys.argv[2]+'/boss_'+name+'.jpg',quality=82)
print('ok')`;
  fs.writeFileSync(path.join(out,'index.json'),JSON.stringify({all,logs},null,1));
  const r=cp.spawnSync('python3',['-c',py,path.join(out,'index.json'),SHEETS],{encoding:'utf8'});
  console.log(JSON.stringify({sheets:Object.keys(all).map(k=>'qa/sheets/boss_'+k+'.jpg'),py:(r.stdout||'').trim()+(r.stderr||'').slice(0,300),logs:logs.slice(-30)}));
  await send('Target.closeTarget',{targetId:pg.id}).catch(()=>{});ws.close();process.exit(0);})().catch(e=>{console.log('CRASH',e&&e.stack||e);process.exit(1);});
