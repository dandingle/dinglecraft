// release_qa.mjs (release engineer, v6.2; version- and label-aware since Release 1.0): a short MUTED smoke of a built
//   dinglecraft_v<VER>.html booted FRESH in one texture pack. The expected GAME_VERSION comes from the --build file name
//   (default: the current version's dist html); the public label (RELEASE_LABEL, e.g. "Release 1.0") is recorded when present.
//   node scripts/serve.mjs --port 9478   (repo root, background) + your own muted headless Chrome on 9378 (see crea_qa.mjs)
//   node tools/qa/creativity/release_qa.mjs --port 9378 --server 9478 --build dist/dinglecraft_v<VER>.html --pack og|hr --out <dir>
//   python3 tools/qa/creativity/release_sheet.py out/qa/release_sheet.jpg <og dir> <hr dir>   (the 5x6 sheet, 15 + 15 frames)
// Real input inside both editors (CDP Input.*). Flow: boot (pack chosen in vx_vox_settings BEFORE the page runs), new world, easel,
// 64x64 canvas, a few strokes + pixels + an erase + an undo, Done with a typed title, hang it, record player + jukebox, a 2-bar loop
// (melody + kick/snare/hats), tempo, Space plays silently, Done with a title, disc into the jukebox, OfflineAudioContext render of
// the disc (never played), save + page reload + load, night view, console errors. 15 numbered JPEGs + summary.json + disc.json.
// MUTED: --mute-audio Chrome, vx_vox_settings snd:0 mus:0 before the game runs, soundOn=false + AC.suspend() on every evaluation,
// requestAnimationFrame disabled from the first line (only __vox.frameStep moves the game), brain URL at a dead port.
import fs from 'fs';import path from 'path';import {defaultBuild,gameVersion} from '../lib/paths.mjs';
const A=Object.fromEntries(process.argv.slice(2).reduce((m,a,i,arr)=>{if(a.startsWith('--'))m.push([a.slice(2),arr[i+1]&&!arr[i+1].startsWith('--')?arr[i+1]:'1']);return m;},[]));
const PORT=+(A.port||9378),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild(),WANT=(/dinglecraft_v(\d+\.\d+)\.html$/.exec(BUILD)||[])[1]||gameVersion(),PACK=A.pack==='hr'?'hr':'og';
const OUT=path.resolve(A.out||'./rel_'+PACK);fs.mkdirSync(OUT,{recursive:true});
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
let pg=list.find(t=>t.type==='page');if(!pg)pg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map(),logs=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
  else if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;logs.push('exception: '+((d.exception&&d.exception.description)||d.text).slice(0,400));}};
await new Promise(r=>ws.onopen=r);
const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
const MUTE="try{soundOn=false;if(typeof AC!=='undefined'&&AC)AC.suspend();}catch(e){}";
const ev=async(code)=>{const r=await send('Runtime.evaluate',{expression:'(async()=>{'+MUTE+'\n'+code+'\n})()',awaitPromise:true,returnByValue:true});
  if(r.result&&r.result.exceptionDetails){const d=r.result.exceptionDetails;throw new Error(((d.exception&&d.exception.description)||d.text).slice(0,900));}
  return r.result&&r.result.result?r.result.result.value:undefined;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shots=[],checks=[];
const check=(name,cond,info)=>{checks.push([name,!!cond,info===undefined?null:info]);console.log((cond?'ok   ':'FAIL ')+'['+PACK+'] '+name+(info!==undefined&&!cond?' '+JSON.stringify(info).slice(0,700):''));};
const shot=async(name)=>{await ev('__rq.render();');await sleep(80);const r=await send('Page.captureScreenshot',{format:'jpeg',quality:86});
  const f=OUT+'/'+String(shots.length+1).padStart(2,'0')+'_'+PACK+'_'+name+'.jpg';fs.writeFileSync(f,Buffer.from(r.result.data,'base64'));shots.push(f);};
const mouse=(type,x,y,button,buttons,mods)=>send('Input.dispatchMouseEvent',{type,x,y,button:button||'none',buttons:buttons||0,clickCount:type==='mouseMoved'?0:1,modifiers:mods||0,pointerType:'mouse'});
const clickAt=async(x,y,btn)=>{const b=btn||'left',bs=b==='right'?2:1;await mouse('mouseMoved',x,y);await mouse('mousePressed',x,y,b,bs);await mouse('mouseReleased',x,y,b,0);await sleep(15);};
const rectOf=async expr=>await ev('const e=('+expr+');if(!e||!e.getBoundingClientRect)return null;const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};');
const clickEl=async expr=>{const r=await rectOf(expr);if(!r)throw new Error('no element: '+expr);await clickAt(r.x+r.w/2,r.y+r.h/2);return r;};
const KEYS={Space:[' ',32],Escape:['Escape',27],KeyZ:['z',90],KeyG:['g',71],KeyB:['b',66],Enter:['Enter',13]};
const key=async(code,mods)=>{const [k,vk]=KEYS[code];await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:k,windowsVirtualKeyCode:vk,modifiers:mods||0});
  await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:k,windowsVirtualKeyCode:vk,modifiers:mods||0});await sleep(20);};
let ART=null;
const artRect=async()=>{ART=await ev('const p=__vox.getCRP(),r=p.el.art.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,W:p.w,H:p.h,n:p.n};');return ART;};
const pxc=(x,y)=>[ART.x+(x+0.5)*ART.w/ART.W,ART.y+(y+0.5)*ART.h/ART.H];
const paintPath=async(pts,btn)=>{const b=btn||'left',bs=b==='right'?2:1;let [x,y]=pxc(...pts[0]);await mouse('mouseMoved',x,y);await mouse('mousePressed',x,y,b,bs);
  for(const p of pts.slice(1)){[x,y]=pxc(...p);await mouse('mouseMoved',x,y,b,bs);}await mouse('mouseReleased',x,y,b,0);await sleep(10);};
const paintAt=async(x,y,btn)=>{const [cx,cy]=pxc(x,y);await clickAt(cx,cy,btn);};
const swatch=i=>clickEl('__vox.getCRP().el.sw['+(i-1)+']');
const tool=t=>clickEl('__vox.getCRP().el.tools.'+t);
const UI='__vox.crMusInfo().CRMU';
const cellXY=(s,r)=>ev(`return __vox.crMusCellXY(${s},${r});`);
const tapCell=async(s,r)=>{const c=await cellXY(s,r);await clickAt(c.x,c.y);};
const dragCells=async(s0,r0,s1,r1,n)=>{const a=await cellXY(s0,r0),b=await cellXY(s1,r1);await mouse('mouseMoved',a.x,a.y);await mouse('mousePressed',a.x,a.y,'left',1);
  for(let k=1;k<=(n||8);k++)await mouse('mouseMoved',a.x+(b.x-a.x)*k/(n||8),a.y+(b.y-a.y)*k/(n||8),'left',1);await mouse('mouseReleased',b.x,b.y,'left',0);await sleep(15);};
const HELP=`window.__rq={T:600000,
  stp(n){for(let i=0;i<(n||1);i++){if(paused&&playing&&!__vox.P.dead){window.__rqUnpause=(window.__rqUnpause||0)+1;resumeGame();}this.T+=40;__vox.frameStep(this.T);}},
  render(){this.stp(1);if(__vox.getTP&&__vox.getTP().hr&&__vox.tpRenderOnce)try{__vox.tpRenderOnce();}catch(e){}},
  aim(x,y,z){const P=__vox.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));},
  rc(){__vox.MB.r=true;this.stp(1);__vox.MB.r=false;this.stp(2);},
  tp(x,z,y){const P=__vox.P;P.x=x;P.z=z;if(y!=null)P.y=y;P.vx=P.vy=P.vz=0;P.fallD=0;this.stp(2);},
  give(id,s){const P=__vox.P;s=s||0;if(P.inv[s]){const e=P.inv.findIndex((q,i)=>!q&&i>8);if(e>0)P.inv[e]=P.inv[s];}P.inv[s]={id,count:1};P.sel=s;__vox.refreshHand();},
  select(id){const P=__vox.P;let i=P.inv.findIndex(q=>q&&q.id===id);if(i<0)return false;if(i>8){const t=P.inv[8];P.inv[8]=P.inv[i];P.inv[i]=t;i=8;}P.sel=i;__vox.refreshHand();return true;},
  empty(){const P=__vox.P;let i=P.inv.findIndex((q,k)=>!q&&k<9);if(i<0){const e=P.inv.findIndex((q,k)=>!q&&k>8);i=0;if(e>0)P.inv[e]=P.inv[0];P.inv[0]=null;}P.sel=i;__vox.refreshHand();},
  cells(id){const o=[];for(const [k,b] of __vox.blockEnts)if(b.t==='crpaint'&&b.id===id)o.push(k);return o;},
  cnt(id){return __vox.P.inv.reduce((n,s)=>n+(s&&s.id===id?s.count:0),0);},
  be(x,y,z){return __vox.blockEnts.get(x+','+y+','+z)||null;},
  crw(){return JSON.stringify(__vox.getCR().CRW);},
  rec(id){return __vox.crRec(__vox.crWorkN(id));},
  kill(r){const P=__vox.P;for(const e of __vox.entities)if(e.t==='mob'&&!e.dead&&!e.bot&&Math.hypot(e.x-P.x,e.z-P.z)<(r||80)){e.hurtT=0;__vox.hurtMob(e,99999,0,0);}},
  room(x0,y,z0,W,D,Hh){const V=__vox,B=V.B;for(let x=x0-1;x<=x0+W;x++)for(let z=z0-1;z<=z0+D;z++){V.setBlock(x,y-1,z,B.STONE);
      for(let dy=0;dy<=Hh;dy++)V.setBlock(x,y+dy,z,(x===x0-1||x===x0+W||z===z0-1||z===z0+D)?(dy===Hh?B.STONE:B.PLANK_O||B.STONE):B.AIR);}}};`;
const waitPack=async want=>{for(let i=0;i<160;i++){if(await ev(`const t=__vox.getTP();return !t.busy&&(!!t.hr)===${want==='hr'};`))return true;await sleep(500);}return false;};
const boot=async()=>{for(let i=0;i<240;i++){let v=false;try{v=await ev("return typeof window.__vox==='object'&&document.readyState==='complete'");}catch(e){}if(v)break;await sleep(500);}
  await ev(HELP+"try{usePLock=false;lockWanted=false;}catch(e){}Object.assign(__vox.BRAIN,{mock:null,ok:false,off:true,url:'http://127.0.0.1:9'});if(__vox.setBrainMock)__vox.setBrainMock(null);");
  return await waitPack(PACK);};
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}"+
  "s.snd=0;s.mus=0;s.tp='"+PACK+"';localStorage.setItem(k,JSON.stringify(s));}catch(e){}"+
  "window.__DINGLE_BRAIN={url:'http://127.0.0.1:9',token:null};window.requestAnimationFrame=function(){return 0;};"});
await send('Page.navigate',{url:`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`});
const packOk=await boot();
const info=await ev("return {ver:__vox.GAME_VERSION,label:__vox.RELEASE_LABEL||null,stubs:__vox.crInfo().stubs,sound:soundOn,tp:__vox.getTP().hr?'hr':'og',busy:__vox.getTP().busy,title:document.title,ac:typeof AC==='undefined'?'none':(AC?AC.state:'null')}");
check('boots v'+WANT+(info.label?' ('+info.label+')':'')+' FRESH in '+PACK.toUpperCase()+' (pack from settings at load), both creativity packages real, sound off, no AudioContext',
  packOk&&info.ver===WANT&&info.stubs===''&&info.sound===false&&info.tp===PACK&&info.ac!=='running',info);
const Q=await ev(`const V=__vox;V.startNewWorld('rel_${PACK}','1337','s');V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);
  __rq.stp(220);const P=V.P,x=Math.floor(P.x),z=Math.floor(P.z),y=Math.max(V.surfaceTop(x,z)+1,Math.floor(P.y));
  __rq.room(x-6,y,z-6,14,14,6);P.x=x+0.5;P.z=z+0.5;P.y=y;__rq.stp(30);__rq.kill();window.__q={x,y,z};return window.__q;`);
const QS=`const V=__vox,Q=__q,C=V.crCore();`;
await ev(QS+`__rq.aim(Q.x+8,Q.y+1.4,Q.z+0.5);__rq.stp(4);`);await shot('fresh_world');

/* ===== the easel ===== */
await ev(QS+`__rq.give(V.B.CR_EASEL,0);__rq.aim(Q.x+2.5,Q.y-0.02,Q.z+0.5);__rq.rc();__rq.empty();__rq.aim(Q.x+2.5,Q.y+0.6,Q.z+0.5);__rq.stp(3);`);
check('the easel is placed',await ev(QS+'return V.getBlock(Q.x+2,Q.y,Q.z)===V.B.CR_EASEL&&!!__rq.be(Q.x+2,Q.y,Q.z);'));
await shot('easel_placed');
await ev('__rq.rc();');
check('right-click on the easel opens the size picker',await ev("return __vox.crOn()==='paint'&&__vox.getCRP().screen==='pick'"));
await shot('size_picker');
await clickEl('__vox.getCRP().el.sizes[0]');await artRect();
check('a real click on Square starts a 64x64 canvas that fits the screen',ART.W===64&&ART.H===64&&ART.x>=0&&ART.x+ART.w<=1280&&ART.y+ART.h<=720,ART);
/* a few strokes: sky fill, a horizon, sea fill, a fat sun, three stars, one slip erased with the right button, one undone stroke */
await swatch(23);await key('KeyG');await paintAt(4,4);
await tool('pencil');await swatch(12);await paintPath([[0,44],[63,44]]);await tool('fill');await paintAt(10,56);
await tool('pencil');await swatch(6);await clickEl('__vox.getCRP().el.sizes[2]');for(let y=14;y<=20;y+=2)await paintPath([[44,y],[50,y]]);await clickEl('__vox.getCRP().el.sizes[0]');
await swatch(1);for(const [x,y] of [[8,8],[16,5],[24,10]])await paintAt(x,y);
await swatch(16);await paintAt(30,30);const slip=await ev('return __vox.getCRP().px[30*64+30]');await paintAt(30,30,'right');const erased=await ev('return __vox.getCRP().px[30*64+30]');
await swatch(2);await paintPath([[2,60],[60,60]]);const before=await ev('return __vox.getCRP().px[60*64+30]');await key('KeyZ',2);
const P1=await ev("const p=__vox.getCRP(),r=__vox.crRec(p.n);return {sky:p.px[4*64+4],sea:p.px[56*64+10],sun:p.px[17*64+47],stars:[p.px[8*64+8],p.px[5*64+16],p.px[10*64+24]],line:p.px[60*64+30],saved:__vox.crArtDecode(r.d,64,64).every((v,i)=>v===p.px[i]),n:p.n}");
check('real strokes land (fill, pencil, brush 3, single pixels), right-click erases, Ctrl+Z undoes the last stroke, every step is saved in the easel',
  P1.sky===23&&P1.sea===12&&P1.sun===6&&P1.stars.every(v=>v===1)&&slip===16&&erased===0&&before===2&&P1.line===12&&P1.saved,{P1,slip,erased,before});
await shot('paint_editor');
await clickEl('__vox.getCRP().el.done');
const focus=await ev("return {shown:document.getElementById('crask').style.display,act:document.activeElement&&document.activeElement.id}");
check('Done opens the title dialog with the field focused',focus.shown==='flex'&&focus.act==='craskin',focus);
const TITLE='Release '+PACK.toUpperCase();
await send('Input.insertText',{text:TITLE});await shot('painting_title');await key('Enter');await ev('__rq.stp(2);');
const PA=await ev(QS+"const s=V.P.inv.find(q=>q&&V.crWorkN(q.id)&&__rq.rec(q.id).st==='done'&&__rq.rec(q.id).k==='art');return s?{id:s.id,name:V.DEFS[s.id].name,cnt:__rq.cnt(s.id),easel:__rq.be(Q.x+2,Q.y,Q.z).id,on:V.crOn(),d:__rq.rec(s.id).d}:null;");
check('Done gives ONE "Painting: '+TITLE+'", the easel is cleared, the editor closed',!!PA&&PA.name==='Painting: '+TITLE&&PA.cnt===1&&PA.easel===0&&PA.on==='',PA&&{...PA,d:undefined});
const PID=PA?PA.id:0,PD=PA?PA.d:'';
await ev(QS+`__rq.select(${PID});__rq.tp(Q.x+3.5,Q.z+0.5,Q.y);__rq.aim(Q.x+8,Q.y+1.3,Q.z+0.5);__rq.stp(6);`);await shot('holding_painting');
await ev(QS+`__rq.tp(Q.x+4.5,Q.z+0.5,Q.y);__rq.select(${PID});__rq.aim(Q.x+8.01,Q.y+1.5,Q.z+0.5);__rq.rc();__rq.stp(8);__rq.tp(Q.x+3.5,Q.z+0.5,Q.y);__rq.empty();__rq.aim(Q.x+8,Q.y+1.5,Q.z+0.5);__rq.stp(8);`);
const H1=await ev(`return {cells:__rq.cells(${PID}).length,cnt:__rq.cnt(${PID}),meshes:__vox.getCRPM().size}`);
check('right-click on the east wall hangs it: 4 cells (2x2), the item used up, a mesh built',H1.cells===4&&H1.cnt===0&&H1.meshes===1,H1);
await shot('painting_hung');
if(PACK==='hr')check('Hyperreal art material: matte Standard + sharp bilinear, linear mipmaps, casts no shadow',await ev("const V=__vox;let ok=V.getCRPM().size===1;for(const e of V.getCRPM().values())ok=ok&&e.mat.type==='MeshStandardMaterial'&&e.mat.userData.hrLin===1&&e.tex.magFilter===THREE.LinearFilter&&e.tex.minFilter===THREE.LinearMipmapLinearFilter&&e.m.castShadow===false;return ok;"));
else check('OG art material: nearest-filtered Lambert, wall shade 0.8 / 0.65',await ev("let ok=__vox.getCRPM().size===1;for(const e of __vox.getCRPM().values())ok=ok&&e.mat.type==='MeshLambertMaterial'&&e.tex.magFilter===THREE.NearestFilter&&e.tex.minFilter===THREE.NearestFilter&&(e.mat.color.r===0.8||e.mat.color.r===0.65);return ok;"));

/* ===== the record player and the jukebox ===== */
await ev(QS+`__rq.tp(Q.x+0.5,Q.z+0.5,Q.y);__rq.give(V.B.CR_DECK,1);__rq.aim(Q.x+2.5,Q.y-0.02,Q.z+2.5);__rq.rc();__rq.give(V.B.CR_JUKE,2);__rq.aim(Q.x+2.5,Q.y-0.02,Q.z-2.5);__rq.rc();
  V.P.inv[1]=null;V.P.inv[2]=null;__rq.empty();__rq.tp(Q.x-1.5,Q.z+0.5,Q.y);__rq.aim(Q.x+2.5,Q.y+0.4,Q.z);__rq.stp(3);`);
check('the record player and the jukebox are placed',await ev(QS+'return V.getBlock(Q.x+2,Q.y,Q.z+2)===V.B.CR_DECK&&V.getBlock(Q.x+2,Q.y,Q.z-3)===V.B.CR_JUKE;'));
await shot('deck_and_jukebox');
await ev(QS+`__rq.tp(Q.x+0.5,Q.z+0.5,Q.y);__rq.aim(Q.x+2.5,Q.y+0.5,Q.z+2.5);__rq.stp(2);__rq.rc();`);
check('right-click on the record player opens the music editor',await ev(QS+`return V.crOn()==='music'`));
const MEL=[[0,0],[4,2],[8,4],[12,7],[16,9],[20,7],[24,4],[28,2]];
for(const [s,r] of MEL)await tapCell(s,r);
await clickEl(`${UI}.el.tr[1].row`);
for(let s=0;s<32;s+=8)await tapCell(s,0);for(let s=4;s<32;s+=8)await tapCell(s,1);
await dragCells(0,2,31,2,40);
{const b=await rectOf(`${UI}.el.tempo`);await clickAt(b.x+b.w*0.6,b.y+b.h/2);}
const M1=await ev(`const m=${UI}.m;return {tr:m.tr.map(t=>t.i+':'+t.n.length),bpm:m.bpm,bars:m.bars,notes:__vox.crSongCount(m),saved:!!__vox.crCtxRec(${UI}.ctx)}`);
check('a 2-bar loop by real clicks: 8 melody notes, 4 kicks + 4 snares + 32 hats (one drag), tempo moved off 120, saved in the record player',
  /^piano:8,drums:40/.test(M1.tr.join())&&M1.bpm!==120&&M1.saved,M1);
await shot('music_editor');
await key('Space');const ph0=await ev(`return ${UI}.lastSt`);await ev('__rq.stp(14);');
const ph1=await ev(`return {st:${UI}.lastSt,msg:${UI}.msg,snd:soundOn,ac:typeof AC==='undefined'?'none':(AC?AC.state:'null')}`);
await shot('music_playing_silently');
check('Space plays with Sound off: the playhead moves on the game clock, "Sound is off", no AudioContext',ph1.st!==ph0&&ph1.msg==='Sound is off (Settings)'&&ph1.snd===false&&ph1.ac==='null',{ph0,ph1});
await key('Space');
await clickEl(`${UI}.el.done`);
check('Done opens "Press the disc?" with the field focused',await ev("return document.getElementById('crask').style.display==='flex'&&document.activeElement.id==='craskin'"));
const DT='Release Loop '+PACK.toUpperCase();
await send('Input.insertText',{text:DT});await shot('disc_title');await clickEl("document.getElementById('craskok')");await ev('__rq.stp(2);');
const DS=await ev(QS+"const s=V.P.inv.find(q=>q&&V.crWorkN(q.id)&&__rq.rec(q.id).k==='song');return s?{id:s.id,name:V.DEFS[s.id].name,st:__rq.rec(s.id).st,cnt:__rq.cnt(s.id),deck:__rq.be(Q.x+2,Q.y,Q.z+2).id,d:__rq.rec(s.id).d}:null;");
check('it presses ONE "Music Disc: '+DT+'" and clears the record player',!!DS&&DS.name==='Music Disc: '+DT&&DS.st==='done'&&DS.cnt===1&&DS.deck===0,DS&&{...DS,d:undefined});
const DID=DS?DS.id:0;fs.writeFileSync(OUT+'/disc.json',JSON.stringify({title:DT,d:DS?DS.d:null},null,1));
const JK=`__rq.be(Q.x+2,Q.y,Q.z-3)`;
await ev(QS+`__rq.select(${DID});__rq.aim(Q.x+2.5,Q.y+0.5,Q.z-2.5);__rq.rc();__rq.empty();__rq.stp(6);`);
const J1=await ev(QS+`return {id:${JK}.id,toast:document.getElementById('toast').textContent,snd:soundOn,voices:V.crMusInfo().CRM.voices.size,fx:V.crMusInfo().CRM.fx.size,cnt:__rq.cnt(${DID})}`);
check('the disc goes into the jukebox: "Now playing", used up, the floating note, still silent (no voice with Sound off)',J1.id===DID&&/Now playing/.test(J1.toast)&&J1.cnt===0&&J1.fx===1&&J1.voices===0&&J1.snd===false,J1);
await ev(QS+`__rq.tp(Q.x-1.5,Q.z+0.5,Q.y);__rq.aim(Q.x+2.5,Q.y+1.0,Q.z-2.5);__rq.stp(10);`);await shot('jukebox_playing');
/* ===== offline render of the disc (OfflineAudioContext; never played) ===== */
const OA=await ev(`const V=__vox,r=__rq.rec(${DID}),sr=44100,x=V.crSongRender(r.d,sr),m=V.crSongNorm(r.d),stepS=60/m.bpm/4;
  const oc=new OfflineAudioContext(2,x.length,sr),b=oc.createBuffer(1,x.length,sr);b.copyToChannel(x,0);
  const s=oc.createBufferSource();s.buffer=b;const g=oc.createGain();g.gain.value=0.5;s.connect(g);g.connect(oc.destination);s.start(0);
  const out=await oc.startRendering(),L=out.getChannelData(0),R=out.getChannelData(1);let md=0,e=0,pk=0,nan=0;
  for(let i=0;i<x.length;i++){if(!isFinite(L[i]))nan++;md=Math.max(md,Math.abs(L[i]-x[i]*0.5),Math.abs(R[i]-x[i]*0.5));e+=L[i]*L[i];pk=Math.max(pk,Math.abs(L[i]));}
  /* where the sound is: RMS of the rendered output in each 16th-note step (the loop has a note on every even step: the hats) */
  const per=[];for(let st=0;st<m.bars*16;st++){const a=Math.round(st*stepS*sr),z=Math.round((st+1)*stepS*sr);let q=0;for(let i=a;i<z;i++)q+=L[i]*L[i];per.push(Math.sqrt(q/Math.max(1,z-a)));}
  const silentSteps=per.filter(v=>v<0.002).length;
  return {n:x.length,len:V.crSongLen(r.d),bpm:m.bpm,bars:m.bars,maxDiff:md,rms:Math.sqrt(e/x.length),peak:pk,nan,silentSteps,minStep:Math.min(...per),maxStep:Math.max(...per),
    game:typeof AC==='undefined'?'none':(AC?AC.state:'null'),snd:soundOn};`);
check('OfflineAudioContext render of the disc: not silent (RMS > 0.01 after a 0.5 gain), never clipped, no NaN, sound in every step, equal to crSongRender, the right length',
  OA.rms>0.01&&OA.peak<1&&OA.nan===0&&OA.silentSteps===0&&OA.maxDiff<1e-6&&Math.abs(OA.n-Math.round(OA.len*44100))<=1,OA);
check('the game itself never made a sound: soundOn false, no game AudioContext',OA.snd===false&&(OA.game==='null'||OA.game==='suspended'),OA);
/* ===== save, reload the page, load the world ===== */
const pre=await ev(QS+'return __rq.crw();');
check('the world saves',await ev(`return await saveToStorage('rel_${PACK}',true);`)===true);
await send('Page.reload',{ignoreCache:true});await sleep(600);const packOk2=await boot();
await ev(`window.__q=${JSON.stringify(Q)};await loadWorldByName('rel_${PACK}');__rq.stp(60);`);
const post=await ev(QS+`return {crw:__rq.crw(),cells:__rq.cells(${PID}).length,juke:${JK}&&${JK}.id,meshes:V.getCRPM().size,tp:V.getTP().hr?'hr':'og',d:__rq.rec(${PID}).d===${JSON.stringify(PD)}}`);
check('after a page reload (still '+PACK.toUpperCase()+'): the registry byte-identical, the painting hangs with the same pixels, the jukebox still holds the disc',
  packOk2&&post.crw===pre&&post.cells===4&&post.juke===DID&&post.meshes===1&&post.tp===PACK&&post.d,{...post,crw:post.crw.length+'/'+pre.length});
await ev(QS+`__rq.tp(Q.x+4.5,Q.z+0.5,Q.y);__rq.aim(Q.x+8,Q.y+1.5,Q.z+0.5);__rq.stp(6);`);await shot('painting_close_after_reload');
await ev(QS+`__rq.tp(Q.x-2.5,Q.z+2.5,Q.y);__rq.aim(Q.x+8,Q.y+1.2,Q.z-0.5);__rq.stp(6);`);await shot('studio_day');
await ev(QS+`V.setTime(0.8);__rq.stp(8);__rq.aim(Q.x+8,Q.y+1.2,Q.z-0.5);__rq.stp(4);`);await shot('studio_night');
await ev("try{const k='vx_vox_settings';const s=JSON.parse(localStorage.getItem(k)||'{}');s.tp='og';s.snd=0;s.mus=0;localStorage.setItem(k,JSON.stringify(s));}catch(e){}");
const errs=logs.filter(l=>/^(error|exception)/.test(l));
check('no console errors or exceptions',errs.length===0,errs.slice(0,6));
const rig=await ev("return {unpaused:window.__rqUnpause||0};");
fs.writeFileSync(OUT+'/summary.json',JSON.stringify({build:BUILD,pack:PACK,info,rig,checks,shots:shots.map(f=>path.basename(f)),logs:logs.slice(-40)},null,1));
console.log(JSON.stringify({pack:PACK,out:OUT,pass:checks.filter(c=>c[1]).length,fail:checks.filter(c=>!c[1]).length,shots:shots.length,warnings:logs.filter(l=>/^warning/.test(l)).length,errors:errs.slice(0,8)},null,1));
ws.close();process.exit(checks.every(c=>c[1])?0:1);
