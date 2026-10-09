// photo_pg.js (P1): muted browser QA of THE STAGE (the purgatory build plan section 9.3). 30 views of every biome, the House,
// the apron, the pit, the Understage, the beacons, the cues (BLACKOUT + Followspot, the work lights), the arch reveals and the wings,
// as JPGs in <outDir> plus a labelled 5x6 contact sheet (default out/qa/sheets/photo_og.jpg, photo_hr.jpg with --hr).
//   node tools/qa/purgatory/photo_pg.js <build-url> <outDir> [port] [--hr] [--sheet path.jpg] [--only 3,7,...]
// Your own muted headless Chrome (see cdp_pg.mjs / qa/README.md). requestAnimationFrame is disabled from the first line of the
// page: only __vox.frameStep moves the game; sound is off (vx_vox_settings snd:0, soundOn=false, AC.suspend) on every load.
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const A=process.argv.slice(2),pos=[],o={};
for(let i=0;i<A.length;i++){const a=A[i];if(a==='--hr')o.hr=1;else if(a==='--sheet')o.sheet=A[++i];else if(a==='--only')o.only=A[++i].split(',').map(Number);else pos.push(a);}
const [url,out,portS]=pos,port=+(portS||9342);
if(!url||!out){console.log('usage: node photo_pg.js <build-url> <outDir> [port] [--hr] [--sheet out.jpg] [--only i,j]');process.exit(2);}
fs.mkdirSync(out,{recursive:true});
const SHEET=o.sheet||path.join(process.env.DC_OUT_DIR?path.resolve(process.env.DC_OUT_DIR):path.join(__dirname,'..','..','..','out'),'qa','sheets','photo_'+(o.hr?'hr':'og')+'.jpg');
(async()=>{
  const pg=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map(),logs=[];
  ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
    else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
    else if(m.method==='Runtime.exceptionThrown')logs.push('exception: '+((m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description)||m.params.exceptionDetails.text).slice(0,400));};
  await new Promise(r=>ws.onopen=r);
  const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}s.snd=0;"+(o.hr?"s.tp='hr';s.tq=1;":"s.tp='og';")+"localStorage.setItem(k,JSON.stringify(s));}catch(e){}window.requestAnimationFrame=function(){return 0;};"});
  await send('Page.navigate',{url});
  for(let i=0;i<240;i++){const r=await send('Runtime.evaluate',{expression:"typeof window.__vox==='object'&&document.readyState==='complete'",returnByValue:true});
    if(r.result&&r.result.result&&r.result.result.value)break;await new Promise(r=>setTimeout(r,500));}
  const ev=async(code)=>{const r=await send('Runtime.evaluate',{expression:'(()=>{try{soundOn=false;if(typeof AC!=="undefined"&&AC&&AC.suspend)AC.suspend();}catch(e){}\n'+code+'\n})()',returnByValue:true});
    if(r.result&&r.result.exceptionDetails)logs.push('EVAL: '+((r.result.exceptionDetails.exception&&r.result.exceptionDetails.exception.description)||'').slice(0,300));
    return r.result&&r.result.result&&r.result.result.value;};
  const shots=[];let n=0;
  const shot=async(label)=>{n++;if(o.only&&!o.only.includes(n))return;const s=await send('Page.captureScreenshot',{format:'jpeg',quality:82});
    const f=path.join(out,String(n).padStart(2,'0')+'.jpg');fs.writeFileSync(f,Buffer.from(s.result.data,'base64'));shots.push([f,n+'. '+label]);};
  /* boot a world, enter purgatory, helpers in the page */
  await ev(`window.QT=6e6;window.QS=k=>{for(let i=0;i<k;i++){QT+=40;__vox.frameStep(QT);}};const V=__vox;
    V.startNewWorld('qa_p1','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);QS(60);
    V.mpEnterNow();QS(120);
    window.QV=(x,y,z,yaw,pitch,k,fly)=>{const P=V.P;V.forceChunksNear(x,z);P.x=x+0.5;P.y=y;P.z=z+0.5;P.vx=P.vy=P.vz=0;P.yaw=yaw;P.pitch=pitch;
      if(fly!==false){P.mode='c';P.flying=true;}else{P.mode='s';P.flying=false;}QS(k||150);P.x=x+0.5;P.y=y;P.z=z+0.5;P.yaw=yaw;P.pitch=pitch;QS(2);};
    window.Q={M:V.getMP(),T:V.p1T()};return V.mpInfo();`);
  if(o.hr){for(let i=0;i<90;i++){const st=await ev("QS(4);const t=__vox.getTP?__vox.getTP():null;return t?{hr:t.hr,busy:t.busy}:null;");   /* wait for the pack */
      if(st&&st.hr&&!st.busy)break;await new Promise(r=>setTimeout(r,500));}}
  const N=Math.PI,E=-Math.PI/2,W=Math.PI/2,S=0;   /* yaw: forward = (-sin yaw, -cos yaw): N(+z upstage)=PI, S(-z)=0, E(+x)=-PI/2, W(-x)=PI/2 */
  const V=async(x,y,z,yaw,pitch,label,pre,k)=>{await ev((pre||'')+`;QV(${x},${y},${z},${yaw},${pitch},${k||150});`);await shot(label);};
  await V(0,36.1,-136,N,0.02,'THE MARK at y 35, facing upstage: the staircase chase lights over the far curtains','camMode=0;',190);
  await V(-24,47,-140,N-0.55,-0.3,'the Felt Forest: tree rows on the trench lips, felt heads staring at the House');
  await V(12,24,-150,E,0.05,'inside the -150 trench: Stuffing floor, foam walls with googly ore, a climb-out stair');
  await V(-28,40,-125,N,-0.1,'the centre bridges and the trench line, raked uphill');
  await ev(`const f=Q.T.mwAllFlats()[0];window.QF=f;`);
  await ev(`const f=QF;QV(Math.round((f.x0+f.x1)/2),f.gc+4,f.fz-4,${N},0.35,150);`);await shot('a painted flat from the front (Painted Hill / Painted Sky)');
  await ev(`const f=QF;QV(Math.round((f.x0+f.x1)/2)+9,f.gc+4,f.fz+12,${S}+0.6,-0.05,120);`);await shot('the same flat from behind: Flat Backing and the diagonal braces');
  await ev(`const r=Q.T.mwRostrumAt;let R=null;for(let x=-70;x<=70&&!R;x+=3)for(let z=-145;z<=-60&&!R;z+=3){const q=r(x,z);if(q&&q.H>=4)R=q;}window.QR=R;
    QV(R.x0-6,R.g0+1.6,Math.round((R.z0+R.z1)/2),${E},0.02,150);`);await shot('a rostrum: hollow crawlspace on Cardboard Brace legs (blackout shelter)');
  await V(0,46,-150,S,-0.2,'downstage: the proscenium opening, the apron, the pit, the House');
  await V(0,37,-185,S,0.12,'the apron (the Demolitionist\'s floor) and the orchestra pit with its centre stair');
  await V(-20,44,-205,S+0.3,0.08,'the House: Audience Seats rising to the back, the Old Goats\' box');
  await V(0,60,-292,S,0.05,'the EXIT doors at the top of the centre aisle (Traveler until the Strike)');
  await V(0,41,-72,N,0.08,'Arch 1 (always open), the Kitchen beyond');
  await V(-20,60,-40,N+0.4,-0.35,'the Kitchen: countertop mesas, Mystery Soup fjords');
  await ev(`const K=Q.T.mwKitchen();QV(K.hut.x0-6,K.T+9,K.hut.z0-10,${N}+0.45,-0.5,170);`);await shot('the Cook\'s Kitchen: hut, counter, stove, stock pot, hen coop');
  await ev(`const d=__vox.MPC.DRAINS[0],b=__vox.mpSurf(d[0],d[1]);QV(d[0]+0.0,b+4,d[1]-4,${N},-1.0,150);`);await shot('a sink drain: Countertop rim, spiral ledge, soft floor far below');
  await ev(`const R=Q.T.MW_BAND[0];QV(R.x0+1,19.5,R.z0+1,${N}-0.6,-0.12,120);`);await shot('Band Room 1 under the Woods: the lamps and the tunnel (the Drummer: P3)');
  await ev(`QV(-38,19.6,-108,${S}+0.4,-0.15,100);`);await shot('the Last Guest: crew room, stool, dead monitor, Prop Trunk');
  await V(0,48,25,N,0.02,'Arch 2 closed: the Traveler, solid to y 70, the glow band waiting');
  await ev(`QV(0,47,-5,${N},0.05,120);Q.M.dead.bomber=1;Q.M.open.a2=0;QS(50);`);await shot('Demolitionist dead, Dan within 60 m: Arch 2 burns open from a body-shaped hole');
  await ev(`QS(70);Q.M.open.a2=1;`);await V(-40,56,60,N+0.3,-0.3,'the Prop Lab: Lab Linoleum, benches, Tesla Coils, Labs HQ');
  await V(45,54,70,N-0.2,-0.3,'the Pork Palace: Satin dunes, Dressing Mirror monoliths, pig pens, drifting spots');
  await V(0,55,60,N,0.15,'the Grand Staircase strip (P4 stamps it) under its chase-light beacon');
  await ev(`QV(0,52,120,${N},0.04,120);Q.M.dead.bigpig=1;Q.M.open.a3=0;QS(50);`);await shot('Pig dead: Arch 3 slides apart');
  await ev(`QS(70);Q.M.open.a3=1;`);await V(25,55,175,N-0.2,-0.35,'the Back Swamp: felt sheet, lily pads, islands, cattails, pincushions');
  await V(0,58,192,N,0.05,'the Frog\'s clearing ahead, the paper moon, the painted cyclorama and its rainbow');
  await ev(`let c=null;for(let x=20;x<60&&!c;x++)for(let z=170;z<210&&!c;z++){const q=__vox.mpCol(x,z);if(q.sw===1&&__vox.mpCol(x+1,z).sw===1&&__vox.mpCol(x,z+1).sw===1)c=[x,z,q.g];}
    QV(c[0],c[2]-3.6,c[1],${N},-0.05,120);`);await shot('the Bog Hollow under the sheet (Pond Scum floor, dark, wet)');
  await ev(`Q.M.cue.t=430;QV(0,36.1,-136,${N},-0.25,80);`);await shot('BLACKOUT on the Mark: the Grid dark, the Followspot on Dan');
  await ev(`camMode=1;QV(-6,37.1,-136,${N}+0.6,-0.3,60,false);`);await shot('BLACKOUT: the Followspot finds the exposed player (third person)');
  await ev(`camMode=0;Q.M.cue.t=0;Q.M.strike={cp:0};QV(20,46,-110,${N}-0.3,-0.1,80);`);await shot('the work lights: everything looks like what it is');
  await ev(`QV(0,61,-288,${S},0.1,60);`);await shot('the Strike: the EXIT sign lit red, the doors open');
  await ev(`Q.M.strike=null;QV(86,42,-20,${N},-0.1,120);`);await shot('the wings: the Prop Graveyard (leaning flats, Prop Trunks, brace piles)');
  await ev(`QV(0,44,-110,${N},0.9,80);`);await shot('looking up: the Grid (battens, lamp rows, rope strands)');
  fs.writeFileSync(path.join(out,'index.json'),JSON.stringify({shots,logs},null,1));
  /* the 5x6 contact sheet (PIL) */
  const py=`import json,sys
from PIL import Image,ImageDraw
d=json.load(open(sys.argv[1]));W,H=384,216;S=Image.new('RGB',(W*5,H*6),(16,12,16));D=ImageDraw.Draw(S)
for i,(f,lab) in enumerate(d['shots'][:30]):
    im=Image.open(f).convert('RGB').resize((W,H));x,y=(i%5)*W,(i//5)*H;S.paste(im,(x,y))
    D.rectangle([x,y+H-15,x+W,y+H],fill=(0,0,0));D.text((x+3,y+H-14),lab[:62],fill=(255,230,150))
S.save(sys.argv[2],quality=86)`;
  fs.mkdirSync(path.dirname(SHEET),{recursive:true});
  try{cp.execFileSync('python3',['-c',py,path.join(out,'index.json'),SHEET]);}catch(e){logs.push('sheet: '+e.message.slice(0,200));}
  console.log(JSON.stringify({shots:shots.length,sheet:SHEET,logs:logs.slice(0,20)}));
  await send('Target.closeTarget',{targetId:pg.id}).catch(()=>{});ws.close();process.exit(0);
})().catch(e=>{console.log('CRASH',e&&e.stack||e);process.exit(1);});
