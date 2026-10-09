// items_rig.mjs (P2): muted browser QA of things you hold and make. Screenshots of all 46 blocks placed in the world, all 78 item
// icons (an icon atlas + inventory screenshots), the Bin's recipe book (??? and hints), every gear item held in first person
// and a set in third person, the felt mitt, and the P2 set pieces (Det Cord with a riser, a Burner sizzling, a Charge, a Felt Fly,
// the Transmogrifier, a Bin volley in flight). Writes <outDir>/NN.jpg + index.json + icons.png; build 5x6 sheets with p2_sheet.py.
//   node tools/qa/purgatory/items_rig.mjs <build-url> <outDir> [port]      (your own muted headless Chrome, see cdp_pg.mjs)
// requestAnimationFrame is disabled from the first line of the page: only __vox.frameStep moves the game. Always muted.
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
/* boot, enter, a clean gallery site */
await ev(`window.QT=4e6;window.QS=n=>{for(let i=0;i<n;i++){QT+=40;__vox.frameStep(QT);}};const V=__vox;V.startNewWorld('qa2','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);QS(160);
  V.mpEnterNow();QS(60);const B=V.B,IT=V.IT;window.SX=24;window.SZ=-112;window.Y0=40;
  const P=V.P;V.forceChunksNear(SX,SZ);P.x=SX+0.5;P.z=SZ+0.5;P.y=Y0+1.05;QS(30);
  for(let x=SX-14;x<=SX+14;x++)for(let z=SZ-14;z<=SZ+14;z++){V.setBlock(x,Y0,z,B.PG_DECK);for(let y=Y0+1;y<=Y0+24;y++)if(V.getBlock(x,y,z))V.setBlock(x,y,z,0);}
  P.x=SX+0.5;P.z=SZ+0.5;P.y=Y0+1.05;P.mode='c';P.flying=true;QS(20);return V.mpInfo().stubs;`);
/* the icon atlas (not a screenshot): every purgatory block and item icon at 2x */
const icons=await ev(`const V=__vox,D=V.DEFS,C2=V.p2Core();const ids=Object.keys(D).map(Number).filter(i=>D[i].pg||(i>=362&&i<=364)).sort((a,b)=>a-b);
  const cols=14,cs=72,rows=Math.ceil(ids.length/cols),cv=document.createElement('canvas');cv.width=cols*cs;cv.height=rows*(cs+14)+4;const g=cv.getContext('2d');
  g.fillStyle='#2a1626';g.fillRect(0,0,cv.width,cv.height);g.imageSmoothingEnabled=false;g.font='9px monospace';g.fillStyle='#e8dcc0';
  ids.forEach((id,i)=>{const x=(i%cols)*cs,y=((i/cols)|0)*(cs+14);g.drawImage(C2.getIcon(id),x+12,y+4,48,48);g.fillStyle='#e8dcc0';g.fillText(String(id),x+4,y+60);
    const nm=D[id].name;g.fillText(nm.length>12?nm.slice(0,12):nm,x+4,y+70);});
  return {n:ids.length,png:cv.toDataURL('image/png')};`);
if(icons&&icons.png)fs.writeFileSync(out+'/icons.png',Buffer.from(icons.png.split(',')[1],'base64'));
/* 1. all 46 blocks in the world (6 rows of 8, a block apart, on the deck), several angles */
await ev(`const V=__vox,D=V.DEFS;const ids=Object.keys(D).map(Number).filter(i=>D[i].pg&&!D[i].item).sort((a,b)=>a-b);window.BIDS=ids;
  ids.forEach((id,i)=>{const c=i%8,r=(i/8)|0,x=SX-7+c*2,z=SZ-12+r*2;if(D[id].pcord||D[id].cross||id===V.B.PG_LAMP){V.setBlock(x,Y0+1,z,id);}else V.setBlock(x,Y0+1,z,id);});
  const P=V.P;P.x=SX+0.5;P.z=SZ+2.5;P.y=Y0+9;P.yaw=0;P.pitch=-0.62;QS(30);return ids.length;`);
await shot('all 46 purgatory blocks placed, overview (SHOW light)');
await ev(`const P=__vox.P;P.x=SX-3.5;P.z=SZ-0.5;P.y=Y0+3.2;P.yaw=0.15;P.pitch=-0.35;QS(8);`);await shot('blocks rows 5-6 close (counter..strunk)');
await ev(`const P=__vox.P;P.x=SX-3.5;P.z=SZ-5.5;P.y=Y0+3.2;P.yaw=0.1;P.pitch=-0.35;QS(8);`);await shot('blocks rows 3-4 close');
await ev(`const P=__vox.P;P.x=SX-3.5;P.z=SZ-8.5;P.y=Y0+3.0;P.yaw=0.1;P.pitch=-0.3;QS(8);`);await shot('blocks rows 1-2 close (deck..fleece)');
await ev(`const P=__vox.P;P.x=SX+9.5;P.z=SZ-7.5;P.y=Y0+3.0;P.yaw=Math.PI/2;P.pitch=-0.25;QS(8);`);await shot('blocks from the side (side tiles)');
/* the important tiles big: a felt tree (sleeve column, forearm base, fleece head with two eyes) and an ore wall */
await ev(`const V=__vox,B=V.B;const x0=SX+6,z0=SZ+6;V.setBlock(x0,Y0+1,z0,B.PG_FOREARM);V.setBlock(x0,Y0+2,z0,B.PG_FOREARM);for(let y=Y0+3;y<=Y0+9;y++)V.setBlock(x0,y,z0,B.PG_SLEEVE);
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=0;dy<4;dy++){const c=(Math.abs(dx)===2&&Math.abs(dz)===2)&&(dy===0||dy===3);if(!c)V.setBlock(x0+dx,Y0+10+dy,z0+dz,B.PG_FLEECE);}
  V.setBlock(x0-1,Y0+11,z0-2,B.PG_EYE);V.setBlock(x0+1,Y0+11,z0-2,B.PG_EYE);
  const ores=[B.PG_FOAM,B.PG_GOOGLY,B.PG_WIREORE,B.PG_ROT,B.PG_SEQORE,B.PG_KNUCKLE,B.PG_SKIN];for(let i=0;i<ores.length;i++)for(let y=Y0+1;y<=Y0+3;y++)V.setBlock(SX-9+i,y,SZ+8,ores[i]);
  V.setBlock(x0+2,Y0+1,z0,B.PG_SLEEVE);V.setBlock(x0+3,Y0+1,z0,B.PG_FOREARM);
  const P=V.P;P.x=x0+0.5;P.z=z0-9.5;P.y=Y0+6;P.yaw=Math.PI;P.pitch=0.1;QS(10);`);
await shot('a Puppet Tree: forearm base, felt sleeves, fleece head, two canopy eyes');
await ev(`const P=__vox.P;P.x=SX+8.5;P.z=SZ+4.2;P.y=Y0+2.6;P.yaw=Math.PI;P.pitch=-0.6;QS(8);`);await shot('cross-sections: felt sleeve and forearm tops (flesh, bone dot)');
await ev(`const P=__vox.P;P.x=SX-5.5;P.z=SZ+4.5;P.y=Y0+2.2;P.yaw=0;P.pitch=0.0;QS(8);`);await shot('ore wall: foam, googly, wire, rot, sequin, knuckle, skin');
/* 2. the inventory (all item icons) */
for(const [a,b] of [[285,320],[320,350],[350,365]]){
  await ev(`const V=__vox,P=V.P,D=V.DEFS;P.mode='s';const ids=Object.keys(D).map(Number).filter(i=>i>=${a}&&i<${b}&&D[i].item);for(let i=0;i<36;i++)P.inv[i]=null;
    ids.forEach((id,i)=>{P.inv[i]={id,count:D[id].stack>1?Math.min(D[id].stack,(id%7)+2):1,...(D[id].tool?{dur:Math.round(D[id].tool.dur*0.7)}:{})};});V.redrawHotbar&&V.redrawHotbar();
    V.openModal('inv');QS(2);`);
  await shot('inventory: items '+a+'-'+(b-1));
  await ev(`__vox.closeModal(true);QS(2);`);}
/* 3. the recipe books: the hands (2x2), the Bin (???, hints), the Lab Bench */
await ev(`const V=__vox,P=V.P,IT=V.IT,B=V.B,M=V.getMP();for(let i=0;i<36;i++)P.inv[i]=null;P.inv[0]={id:IT.PG_PROGRAMME,count:1};M.seenIng={};
  M.seenIng[B.PG_SLEEVE]=1;M.seenIng[IT.PG_FELT]=1;M.seenIng[IT.PG_FOAMCHUNK]=1;P.inv[1]={id:IT.PG_FELT,count:6};P.inv[2]={id:IT.PG_ROD,count:4};QS(10);
  V.openModal('inv');QS(2);`);await shot('the hands: 2x2 grid, the purgatory book open by default (??? + hints)');
await ev(`__vox.closeModal(true);const V=__vox,B=V.B;V.setBlock(SX+2,Y0+1,SZ+12,B.PG_CAN);const P=V.P;P.x=SX+0.5;P.z=SZ+11.5;P.y=Y0+1.05;QS(4);V.openModal('pcan',V.pgCore().bkey(SX+2,Y0+1,SZ+12));QS(2);`);
await shot('the Bin: hand + can recipes, ??? silhouettes with their hint lines');
await ev(`const V=__vox,C=V.pgCore();const g=C.MODAL.grid;g[0]=g[1]=g[2]={id:V.IT.PG_FELT,count:1};g[4]=g[7]={id:V.IT.PG_ROD,count:1};QS(2);
  const rs=C.MODAL.slots.find(s=>s.kind==='result');V.p2Core().takeResult(rs,false);QS(2);`);await shot('a Floppy Pick taken: the lid rattles (1 in the can)');
await ev(`const V=__vox,P=V.P;V.closeModal(true);P.yaw=Math.atan2(-(SX+2.5-P.x),-(SZ+12.5-P.z));P.pitch=-0.1;QS(5);`);await shot('the lid flies open: the Floppy Pick hurled at the face');
await ev(`QS(4);`);await shot('volley +0.16 s');
await ev(`const V=__vox,B=V.B;QS(30);V.setBlock(SX-2,Y0+1,SZ+12,B.PG_BENCH);const M=V.getMP();M.seenIng[V.IT.PG_SEQUIN]=1;M.seenIng[V.IT.PG_COPPER]=1;M.squeak=5;
  V.openModal('plab',V.pgCore().bkey(SX-2,Y0+1,SZ+12));QS(2);`);await shot('the Lab Bench: hand + can + lab, Panic Meter in the title');
await ev(`__vox.closeModal(true);QS(2);`);
/* 4. every gear item held, first person, then a set in third person */
const GEAR=await ev(`const D=__vox.DEFS;return Object.keys(D).map(Number).filter(i=>D[i].gadget&&(D[i].pg||(i>=362&&i<=364))).sort((a,b)=>a-b);`);
await ev(`const V=__vox,P=V.P;P.x=SX+0.5;P.z=SZ+6.5;P.y=Y0+1.05;P.yaw=Math.PI;P.pitch=-0.05;P.mode='s';P.flying=false;for(let i=0;i<36;i++)P.inv[i]=null;P.sel=0;V.refreshHand();QS(6);`);
await shot('empty hand inside purgatory: the felt mitt');
for(const gid of GEAR){await ev(`const V=__vox,P=V.P,D=V.DEFS;P.inv[0]={id:${gid},count:1,...(D[${gid}].tool?{dur:D[${gid}].tool.dur}:{})};P.sel=0;V.refreshHand();QS(3);return D[${gid}].name;`);
  await shot('held (first person): '+(await ev(`return __vox.DEFS[${gid}].name;`)));}
await ev(`camMode=2;const P=__vox.P;P.yaw=Math.PI*0.85;P.pitch=-0.15;QS(4);`);
for(const gid of [310,313,317,321,325,326,327,328,332,333,335,364].filter(g=>GEAR.includes(g))){await ev(`const V=__vox,P=V.P,D=V.DEFS;P.inv[0]={id:${gid},count:1};P.sel=0;V.refreshHand();QS(3);`);
  await shot('held (third person): '+(await ev(`return __vox.DEFS[${gid}].name;`)));}
await ev(`camMode=0;QS(2);`);
/* 5. P2 set pieces */
await ev(`const V=__vox,B=V.B,P=V.P;for(let i=0;i<36;i++)P.inv[i]=null;V.refreshHand();const y=Y0+1,z=SZ+2,x0=SX-6;for(let x=x0;x<=x0+3;x++)V.setBlock(x,y,z,B.PG_CORD);
  V.setBlock(x0+4,y,z,B.PG_DECK);V.setBlock(x0+4,y+1,z,B.PG_CORD);V.setBlock(x0+5,y+1,z,B.PG_CORD);V.setBlock(x0+6,y,z,B.PG_PLATE);V.setBlock(x0+3,y,z+1,B.PG_CORD);V.setBlock(x0+3,y,z+2,B.PG_CORD);
  P.x=x0+2.5;P.z=z+4.5;P.y=Y0+3.2;P.yaw=0;P.pitch=-0.55;QS(8);`);await shot('Det Cord: a flat cord line, a corner, up a riser, a Charge Plate');
await ev(`const V=__vox;V.piCordSpark(SX-6,Y0+1,SZ+2,4,'Dan');QS(12);`);await shot('a spark walking the cord');
await ev(`const V=__vox,B=V.B,IT=V.IT,P=V.P;QS(20);const bx=SX+4,bz=SZ+2;V.setBlock(bx,Y0+1,bz,B.PG_BURNER);V.setBlock(bx+1,Y0+1,bz,B.PG_BURNER);
  V.spawnDrop(bx+0.5,Y0+2.4,bz+0.5,{id:IT.PG_HANGER,count:3},0,0,0);V.spawnDrop(bx+1.5,Y0+2.4,bz+0.5,{id:IT.PG_RCHICK,count:2},0,0,0);
  P.x=bx+1.0;P.z=bz+3.6;P.y=Y0+2.4;P.yaw=0;P.pitch=-0.45;QS(50);`);await shot('Burners: drops sizzling on the coils (unpickable)');
await ev(`QS(60);`);await shot('a Burner pop: the smelted item hops toward the player');
await ev(`const V=__vox,B=V.B,P=V.P;const fx=SX-2,fz=SZ-2;V.setBlock(fx,Y0+1,fz,B.PG_FOAM);V.setBlock(fx,Y0+2,fz,B.PG_FOAM);
  V.piChargeArm({x:fx,y:Y0+1,z:fz,nx:0,ny:0,nz:1},'Dan');V.piChargeArm({x:fx,y:Y0+2,z:fz,nx:0,ny:0,nz:1},'Dan');V.piFlySpawn(fx+2,Y0+1.6,fz+1,'Dan');
  P.x=fx+0.5;P.z=fz+3.2;P.y=Y0+1.4;P.yaw=0;P.pitch=-0.05;QS(10);`);await shot('two Charges stuck on foam, a Felt Fly buzzing');
await ev(`const V=__vox;V.piS().spots={trans:[[SX+8,Y0+1,SZ-4]]};QS(40);const P=V.P;P.x=SX+8.5;P.z=SZ+1;P.y=Y0+2.2;P.yaw=0;P.pitch=-0.12;QS(6);`);await shot('the Transmogrifier (glass chamber, console, lever, chute)');
await ev(`const V=__vox,B=V.B,P=V.P;for(let x=SX-11;x<=SX-9;x++)for(let z=SZ-3;z<=SZ-1;z++){V.setBlock(x,Y0,z,B.PG_SOUP);}for(let x=SX-11;x<=SX-9;x++)V.setBlock(x,Y0,SZ+1,B.PG_SCUM);
  V.setBlock(SX-8,Y0+1,SZ-2,B.PG_LAMP);V.setBlock(SX-8,Y0+1,SZ,B.PG_LAMP);V.setBlock(SX-12,Y0+1,SZ,B.PG_CATTAIL);V.setBlock(SX-12,Y0,SZ+1,B.PG_LILY);
  P.x=SX-6.5;P.z=SZ+3.5;P.y=Y0+2.6;P.yaw=Math.atan2(-(SX-10-P.x),-(SZ-1-P.z));P.pitch=-0.35;QS(10);`);await shot('Mystery Soup, Pond Scum, Eyeball Lamps (pupils on the player), a cattail, a lily pad');
fs.writeFileSync(out+'/index.json',JSON.stringify({shots,logs,icons:icons&&icons.n,gear:GEAR},null,1));
console.log(JSON.stringify({n:shots.length,icons:icons&&icons.n,logs}));
await send('Target.closeTarget',{targetId:pg.id}).catch(()=>{});ws.close();process.exit(0);
