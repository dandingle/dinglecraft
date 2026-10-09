// cast_pg.js (P3): muted browser QA of the purgatory cast (the purgatory build plan 5.3, 9.3).
// Every P3 type idle and at its tell/attack (the pupils locked), plus the set pieces (tether strain, the face wrap, the Drummer
// yanked, a Lab Rat split, the Yeti tripped, the Daredevil stuck, the frog's tongue, the Comic's grab, the Cook's chase, the Weatherman
// flattened, Old Goat tipped, the BOO, a hint splat). Writes <outDir>/NN.jpg + index.json and two 5x6 sheets:
// out/qa/sheets/cast_og_idle.jpg and cast_og_attack.jpg (or cast_hr_* with --hr: P7 runs it with Hyperreal on).
//   node tools/qa/purgatory/cast_pg.js <build-url> <outDir> [port] [--hr]       (your own muted headless Chrome, see cdp_pg.mjs)
// requestAnimationFrame is disabled from the first line of the page: only __vox.frameStep moves the game. Always muted.
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const args=process.argv.slice(2),HR=args.includes('--hr'),pos=args.filter(a=>a!=='--hr');
const url=pos[0],out=pos[1],port=+(pos[2]||9344);fs.mkdirSync(out,{recursive:true});
const SHEETS=path.join(process.env.DC_OUT_DIR?path.resolve(process.env.DC_OUT_DIR):path.join(__dirname,'..','..','..','out'),'qa','sheets');fs.mkdirSync(SHEETS,{recursive:true});
(async()=>{
  const pg=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map(),logs=[];
  ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
    else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
    else if(m.method==='Runtime.exceptionThrown'){logs.push('exception: '+(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text).slice(0,400));}};
  await new Promise(r=>ws.onopen=r);
  const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}s.snd=0;"+(HR?"s.tp='hr';":"s.tp='og';")+"localStorage.setItem(k,JSON.stringify(s));}catch(e){}window.requestAnimationFrame=function(){return 0;};"});
  await send('Page.navigate',{url});
  for(let i=0;i<240;i++){const r=await send('Runtime.evaluate',{expression:"typeof window.__vox==='object'&&document.readyState==='complete'",returnByValue:true});if(r.result&&r.result.result&&r.result.result.value)break;await new Promise(r=>setTimeout(r,500));}
  const ev=async code=>{const r=await send('Runtime.evaluate',{expression:'(()=>{try{soundOn=false;if(typeof AC!=="undefined"&&AC&&AC.suspend)AC.suspend();}catch(e){}\n'+code+'\n})()',returnByValue:true});
    if(r.result&&r.result.exceptionDetails)logs.push('EVAL: '+(r.result.exceptionDetails.exception&&r.result.exceptionDetails.exception.description||'').slice(0,400));return r.result&&r.result.result&&r.result.result.value;};
  let n=0;const shots=[];const shot=async(label,group)=>{const s=await send('Page.captureScreenshot',{format:'jpeg',quality:82});const f=path.join(out,String(n++).padStart(2,'0')+'.jpg');
    fs.writeFileSync(f,Buffer.from(s.result.data,'base64'));shots.push({f,label,group});};
  /* the stage: a cleared, lit patch of deck in the Woods; Dan's eye is the camera; one puppet at a time */
  await ev(`window.QT=4e6;window.QS=n=>{for(let i=0;i<n;i++){QT+=40;__vox.frameStep(QT);}};const V=__vox;V.startNewWorld('cast','1337','s');
    V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;QS(120);V.mpDoorHere();QS(4);V.mpEnterNow();QS(40);V.GR.mobSpawn=false;V.GR.god=true;
    ${HR?"if(V.setPack)V.setPack('hr');QS(20);":''}
    window.CQ={X:30,Z:-108};const B=V.B,Y=V.deckY(CQ.Z);CQ.Y=Y;
    for(let x=CQ.X-9;x<=CQ.X+9;x++)for(let z=CQ.Z-8;z<=CQ.Z+14;z++){for(let y=Y+1;y<=Y+8;y++)V.setBlock(x,y,z,B.AIR);V.setBlock(x,Y,z,B.PG_DECK);}
    for(let i=0;i<5;i++)V.setBlock(CQ.X-6+i*3,Y+1,CQ.Z+12,B.PG_LAMP);
    CQ.wipe=()=>{for(const e of V.entities){if(e.dead)continue;if((e.t==='mob'&&!e.bot&&/^pg/.test(e.mt))||e.t==='drop'||e.t==='pproj'||e.t==='xp')V.pgCore().removeEnt(e);}QS(24);};
    CQ.cam=(d,h,side,mid)=>{const P=V.P;P.mode='c';P.flying=true;P.x=CQ.X+0.5+(side||0);P.z=CQ.Z+2.5-(d||3);P.y=CQ.Y+1+(h||0)-P.eyeY+(mid!=null?mid:0.9);P.vx=P.vy=P.vz=0;
      const dx=CQ.X+0.5-P.x,dz=CQ.Z+2.5-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=-Math.atan2(h||0,Math.hypot(dx,dz));for(let i=0;i<36;i++)if(P.inv[i]&&i!==P.sel)continue;P.inv[P.sel]=null;P.inv[0]=null;if(V.refreshHand)V.refreshHand();};
    CQ.put=(mt,dx,dz,props)=>{const x=CQ.X+0.5+(dx||0),z=CQ.Z+2.5+(dz||0);const e=V.pmSpawnAt(mt,x,CQ.Y+1.02,z,props);e.yaw=Math.PI;return e;};
    CQ.hole=(dx,dz)=>{const x=CQ.X+(dx||0),z=CQ.Z+2+(dz||0);V.setBlock(x,CQ.Y,z,B.PG_ARMHOLE);return [x,CQ.Y,z];};
    CQ.unhole=()=>{for(let x=CQ.X-9;x<=CQ.X+9;x++)for(let z=CQ.Z-8;z<=CQ.Z+14;z++)if(V.getBlock(x,CQ.Y,z)===B.PG_ARMHOLE)V.setBlock(x,CQ.Y,z,B.PG_DECK);};
    CQ.cam();QS(20);return [V.mpInfo().dim,CQ.Y];`);
  const T=['pgwhat','pghollow','pghand','pgposs','pgfeltdan','pgcomic','pghen','pgpelican','pgdrummer','pgrat','pgrat2','pgrat4','pgyeti','pgdare',
    'pgfrog','pgpig','pgcook','pgprof','pgratb','pgoldgoat','pgoldergoat','pgweather'];
  const big={pgyeti:[5.2,1.5],pgcook:[3.8,1.1],pgdrummer:[3.6,1],pgweather:[3.6,1],pgfeltdan:[3.4,0.9],pgpelican:[3.4,0.9],pgdare:[3.2,0.8],pgprof:[3.4,0.9],pgratb:[3.2,0.9],
    pgrat:[3.2,0.9],pgoldgoat:[2.8,0.7],pgoldergoat:[2.8,0.7],pgrat4:[1.5,0.2],pgrat2:[2,0.45],pgfrog:[1.6,0.2],pghen:[2,0.45],pghand:[1.8,0.3],pghollow:[2,0.25],
    pgpig:[2.2,0.4],pgwhat:[3.6,1.6],pgcomic:[3.6,1.6],pgposs:[2.6,0.7]};
  /* idle */
  for(const mt of T){await ev(`CQ.wipe();CQ.unhole();const V=__vox,mt='${mt}';V.getPMS().cueO=(mt==='pghand'||mt==='pgposs'||mt==='pgfeltdan')?'blackout':null;
      let e;if(mt==='pgwhat'||mt==='pgcomic'){const h=CQ.hole(0,1);e=V.pmSpawnTether(mt==='pgcomic'?'comic':'what',h[0],h[1],h[2]);}
      else e=CQ.put(mt,0,0,mt==='pgdrummer'?{stake:[CQ.X+0.5,CQ.Y+1,CQ.Z+5.5],kit:[CQ.X+2.5,CQ.Y+1,CQ.Z+2.5]}:(mt==='pgoldgoat'||mt==='pgoldergoat'?{pfix:1,seatAt:[CQ.X+0.5,CQ.Y+1.02,CQ.Z+2.5]}:{}));
      CQ.cam(${(big[mt]||[3,0.9])[0]},0.6,0,${(big[mt]||[3,0.9])[1]});QS(12);if(e&&!e.dead){e.yaw=Math.PI;e.vx=e.vz=0;}QS(2);`);
    await shot(mt+' idle','idle');}
  /* the set pieces, idle sheet */
  await ev(`CQ.wipe();CQ.unhole();const V=__vox,P=V.P;V.getPMS().cueO=null;const h=CQ.hole(0,2);const e=V.pmSpawnTether('what',h[0],h[1],h[2]);CQ.cam(4.2,0.2);QS(4);
    P.mode='s';P.flying=false;P.x=CQ.X+0.5;P.z=CQ.Z+2.5-11;P.y=CQ.Y+1;QS(30);P.mode='c';P.flying=true;P.x=e.x+3.2;P.z=e.z-2.2;P.y=e.y+0.2;{const dx=e.x-P.x,dz=e.z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=-0.25;}QS(2);`);await shot('a Blank strains at the end of its arm','idle');
  await ev(`CQ.wipe();const V=__vox;CQ.cam(3,1.4,0,0.3);for(let i=0;i<4;i++)CQ.put('pghollow',(i-1.5)*0.9,(i%2)*0.6);QS(10);`);await shot('a Hollow heap','idle');
  await ev(`CQ.wipe();const V=__vox;const a=CQ.put('pgdrummer',0,0,{stake:[CQ.X+0.5,CQ.Y+1,CQ.Z+5.5],kit:[CQ.X+0.5,CQ.Y+1,CQ.Z+7.5],seat:[CQ.X+0.5,CQ.Y+1,CQ.Z+6.6]});QS(60);CQ.cam(4,1.6,2.5,1);QS(4);`);await shot('the Drummer drums on his chain','idle');
  await ev(`CQ.wipe();const V=__vox;const g=CQ.put('pgdare',0,0);g.st='stuck';g.stuck=3;CQ.cam(3,0.6,0,0.8);QS(6);`);await shot('the Daredevil stuck head-first','idle');
  await ev(`CQ.wipe();const V=__vox;const s=CQ.put('pgyeti',0,0);s.trip=3;CQ.cam(4.5,2,0,0.6);QS(14);`);await shot('the Yeti tripped on his sneakers','idle');
  await ev(`CQ.wipe();const V=__vox;const s=CQ.put('pgoldgoat',-0.9,0,{pfix:1,seatAt:[CQ.X-0.4,CQ.Y+1.02,CQ.Z+2.5]});const w=CQ.put('pgoldergoat',0.9,0,{pfix:1,seatAt:[CQ.X+1.4,CQ.Y+1.02,CQ.Z+2.5]});QS(3);V.pmNpcPose(s,'tip',8);QS(10);CQ.cam(3.2,0.8,0,0.7);QS(2);`);await shot('Old Goat tipped over backwards','idle');
  await ev(`CQ.wipe();const V=__vox;const b=CQ.put('pgratb',0,0);V.pmNpcPose(b,'zap');QS(3);V.pmNpcPose(b,'zap');QS(3);V.pmNpcPose(b,'stapled',6);QS(8);CQ.cam(2.8,0.4,0,1.1);QS(2);`);await shot('the Lab Rat stapled (whiskers singed twice)','idle');
  await ev(`CQ.wipe();const V=__vox;const P=V.P;P.mode='c';V.pmNewsStart({x:CQ.X+0.5,y:CQ.Y+1,z:CQ.Z-26});QS(40);const N=V.getPMS().news;if(N){P.x=N.S[0]+0.5;P.z=N.S[2]-6;P.y=N.S[1]+1;const dx=N.S[0]-P.x,dz=N.S[2]-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=-0.1;}QS(110);`);
  await shot('the Weatherman reads; something drops','idle');
  /* attack / tell sheet: Dan in survival with god mode on, so every puppet locks its pupils on him */
  for(const mt of T){await ev(`CQ.wipe();CQ.unhole();const V=__vox,P=V.P,mt='${mt}';V.getPMS().cueO=(mt==='pghand'||mt==='pgposs'||mt==='pgfeltdan')?'blackout':null;let e;
      if(mt==='pgwhat'||mt==='pgcomic'){const h=CQ.hole(0,0);e=V.pmSpawnTether(mt==='pgcomic'?'comic':'what',h[0],h[1],h[2]);}
      else e=CQ.put(mt,0,0,mt==='pgdrummer'?{stake:[CQ.X+0.5,CQ.Y+1,CQ.Z+7.5],kit:[CQ.X+0.5,CQ.Y+1,CQ.Z+9.5]}:(mt==='pgoldgoat'||mt==='pgoldergoat'?{pfix:1,seatAt:[CQ.X+0.5,CQ.Y+1.02,CQ.Z+2.5]}:{}));
      if(mt==='pgrat'||mt==='pgrat2'||mt==='pgrat4'){e.grp=999;V.getPMS()['bkg999']=V.getMP().clock+60;}
      P.mode='s';P.flying=false;P.x=CQ.X+0.5;P.z=CQ.Z+2.5-(mt==='pgpelican'||mt==='pgdare'?8:2.2);P.y=CQ.Y+1;P.hp=20;
      if(mt==='pgfrog')P.inv[P.sel]={id:V.IT.PG_FELT,count:8};
      let i=0;for(;i<220;i++){QS(1);if(e.dead)break;if((e.plock>0&&e.plock<0.3)||(e.grab&&e.grab.t>1)||e.tongueT>0||(e.st==='setup'&&e.plock<0.6))break;
        if(mt==='pgcook'||mt==='pgprof'||mt==='pgratb'||mt==='pgoldgoat'||mt==='pgoldergoat'||mt==='pgweather'||mt==='pghen'||mt==='pgpig'||mt==='pghollow'||(mt==='pgrat4'&&i>6))break;}
      if(mt==='pgcook'){e.cook=[{id:V.IT.PG_RCHICK,n:1,to:P,out:[V.IT.PG_ROAST,2]}];QS(20);}
      if(mt==='pgprof')V.pmNpcPose(e,'nod',2);if(mt==='pgratb')V.pmNpcPose(e,'catch',2);if(mt==='pgweather')V.pmNpcPose(e,'flattened',2);
      if(mt==='pgoldgoat'||mt==='pgoldergoat'){e.talkT=2;}if(mt==='pghen'){e.mode='flee';e.tT=2;e.dir=0;e.vy=8;}if(mt==='pgpig'){e.mode='flee';e.tT=2;e.dir=0;}
      if(mt==='pghollow'){V.purgHit(e,1,'Dan','melee',{force:1});}
      QS(2);const ex=e.x,ez=e.z,ey=e.y;P.mode='c';P.flying=true;const BG=${JSON.stringify(big)},b0=BG[mt]||[3,0.9],bb=[Math.max(2.6,b0[0]),b0[1]];
      P.x=ex+bb[0]*0.45;P.z=ez-bb[0]*0.9;P.y=ey+bb[1]+0.3-P.eyeY+0.6;const dx=ex-P.x,dz=ez-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=-Math.atan2(0.9,Math.hypot(dx,dz));P.inv[P.sel]=null;QS(1);return [i,e.plock||0];`);
    await shot(mt+' at its tell','attack');}
  await ev(`CQ.wipe();const V=__vox,P=V.P;V.getPMS().cueO='blackout';P.mode='s';P.flying=false;P.x=CQ.X+0.5;P.z=CQ.Z;P.y=CQ.Y+1;P.yaw=Math.PI;P.pitch=0;
    const h=CQ.put('pghand',0,0);h.x=P.x;h.z=P.z+2.4;QS(80);`);await shot('the Hands: the face wrap (inside a puppet)','attack');
  await ev(`const V=__vox;V.MB.l=true;QS(1);V.MB.l=false;QS(2);V.MB.l=true;QS(1);V.MB.l=false;QS(2);V.MB.l=true;QS(1);V.MB.l=false;QS(4);V.getPMS().cueO=null;CQ.wipe();
    const b=CQ.put('pgrat',0,0,{grp:5});QS(2);V.purgHit(b,3,'Dan','melee',{force:1});QS(2);const h=V.entities.find(e=>e.mt==='pgrat2'&&!e.dead);if(h)V.purgHit(h,3,'Dan','melee',{force:1});QS(3);CQ.cam(2.4,0.8,0,0.3);QS(2);`);
  await shot('a Lab Rat Clone split twice','attack');
  await ev(`CQ.wipe();const V=__vox,P=V.P;const a=CQ.put('pgdrummer',0,6,{stake:[CQ.X+0.5,CQ.Y+1,CQ.Z+8.5],kit:[CQ.X+0.5,CQ.Y+1,CQ.Z+10.5]});QS(10);
    P.mode='s';P.flying=false;P.x=CQ.X+0.5;P.z=CQ.Z+8.5-9.6;P.y=CQ.Y+1;let i=0;for(;i<160&&a.st!=='yanked';i++)QS(1);QS(6);P.mode='c';P.flying=true;P.x=a.x+3.5;P.z=a.z-3.5;P.y=a.y+1;const dx=a.x-P.x,dz=a.z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=-0.3;QS(1);`);await shot('the Drummer yanked off his feet by his chain','attack');
  await ev(`CQ.wipe();CQ.unhole();const V=__vox,P=V.P;const h=CQ.hole(0,0);const f=V.pmSpawnTether('comic',h[0],h[1],h[2]);P.mode='s';P.flying=false;P.x=CQ.X+0.5;P.z=CQ.Z+0.5;P.y=CQ.Y+1;
    let i=0;for(;i<120&&!f.grab;i++)QS(1);QS(60);P.mode='c';P.flying=true;P.x+=2.5;P.z-=3;P.y+=0.6;const dx=f.x-P.x,dz=f.z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=-0.1;QS(1);`);await shot('the Comic holds your wrist through the routine','attack');
  await ev(`CQ.wipe();CQ.unhole();const V=__vox,P=V.P;const f=CQ.put('pgfrog',0,0);P.mode='s';P.flying=false;P.inv[P.sel]={id:V.IT.PG_FELT,count:8};P.x=CQ.X+0.5;P.z=CQ.Z+0.2;P.y=CQ.Y+1;
    let i=0;for(;i<200&&!(f.tongueT>0);i++)QS(1);QS(2);P.mode='c';P.flying=true;P.x+=1.2;P.z-=0.6;P.y+=0.3;const dx=f.x-P.x,dz=f.z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=-0.6;QS(1);`);await shot("the frog's tongue takes a stack",'attack');
  await ev(`CQ.wipe();const V=__vox,P=V.P;P.mode='c';P.flying=true;V.forceChunksNear(0,-214);P.x=0.5;P.z=-212.5;P.y=V.deckY(-214)+3;QS(25);V.pmBooBarrage(0.5,-218);QS(22);P.yaw=0;P.pitch=-0.05;QS(4);`);await shot('the BOO (tomatoes from the House)','attack');
  await ev(`CQ.wipe();const V=__vox,P=V.P;const h=CQ.put('pghollow',0,0);V.pmSplat(h);V.pmSplat({x:CQ.X+1,y:CQ.Y,z:CQ.Z+2});QS(45);CQ.cam(2.6,1.4,0,0.3);QS(2);`);await shot('hint splats (an entity, a block)','attack');
  await ev(`const V=__vox;V.pmSplatClear();CQ.wipe();V.getPMS().cueO=null;V.GR.god=false;${HR?"if(V.setPack)V.setPack('og');":''}return V.mpInfo();`);
  fs.writeFileSync(path.join(out,'index.json'),JSON.stringify({shots,logs},null,1));
  /* two 5x6 contact sheets (PIL) */
  const py=`
import json,sys
from PIL import Image,ImageDraw
d=json.load(open(sys.argv[1]));out=sys.argv[2];pre=sys.argv[3]
for g in ['idle','attack']:
    S=[s for s in d['shots'] if s['group']==g][:30]
    W,H=256,144;sheet=Image.new('RGB',(W*5,(H+14)*6),(18,14,16));dr=ImageDraw.Draw(sheet)
    for i,s in enumerate(S):
        im=Image.open(s['f']).convert('RGB').resize((W,H));x=(i%5)*W;y=(i//5)*(H+14);sheet.paste(im,(x,y));dr.text((x+3,y+H+1),s['label'][:42],fill=(235,225,200))
    sheet.save(out+'/'+pre+g+'.jpg',quality=86)
`;
  const pf=path.join(out,'sheet.py');fs.writeFileSync(pf,py);
  try{cp.execFileSync('python3',[pf,path.join(out,'index.json'),SHEETS,HR?'cast_hr_':'cast_og_'],{stdio:'inherit'});}catch(e){logs.push('sheet: '+e.message);}
  console.log(JSON.stringify({n:shots.length,logs:logs.slice(0,30)}));
  await send('Target.closeTarget',{targetId:pg.id}).catch(()=>{});ws.close();process.exit(0);
})().catch(e=>{console.log('CRASH',e&&e.stack||e);process.exit(1);});
