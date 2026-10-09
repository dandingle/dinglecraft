// cz_qa.mjs (CZ, the v6.2 integrator): the MUTED end-to-end browser session for the Creativity Update, both packages real, both packs.
// One world, played the way Dan would, with REAL input inside both editors (Input.dispatchMouseEvent / dispatchKeyEvent / insertText):
//   1 craft check (recipes in the table's recipe list), an easel: Wide canvas, paint with fill / pencil / brush / right-erase / undo,
//     Done with a typed title (the c0 crAsk focus fix: the title field has focus on its own)
//   2 hang it (4x2), break it by hand (ONE drop, same id), pick it up, re-hang it on another wall
//   3 a Tall canvas left unfinished on a second easel; break that easel: the Unfinished Canvas drops; put it back on a new easel
//   4 the record player: notes, drums, an instrument, the tempo, Space plays (muted: the playhead runs silently), Done with a typed title
//   5 the jukebox: insert, "Now playing", eject (same disc back), insert again, break the jukebox by hand (the disc drops), re-place, insert
//   6 save, reload the page, load the world: everything where it was, the registry byte-identical
//   7 Hyperreal (day + night) and back to OG: painting materials adopted (matte Standard + sharp bilinear since the fix lead), shades restored
//   8 Puppet Purgatory through the real door ritual carrying the painting and the disc: both in Dan's Stage Trunk with their data,
//     no creativity recipe inside, save + page reload INSIDE, abandon, the trunk gives both back, the painting re-hangs, the disc plays
//   9 the AI players (brain off, griefing on) loose in the studio for 600 frames: no crash, nothing creative taken, broken or moved
//  10 an OfflineAudioContext parity check of the disc (rendered offline, never played): Chrome's WebAudio reproduces crSongRender
// Writes numbered JPEGs, summary.json, disc.json (the composed song, for qa/cz_audio.js) and a 5x6 contact sheet into --out.
// MUTED: Chrome runs with --mute-audio, every document gets vx_vox_settings {snd:0, mus:0, tp:'og'} before the game runs, every
// evaluation sets soundOn=false and suspends AC, sound is never turned on. requestAnimationFrame is disabled from the first line of the
// page (only __vox.frameStep moves the game) and the brain URL points at a dead port (the page never talks to a brain server).
//   node scripts/serve.mjs --port 9474                      (repo root, background)
//   Chrome --headless=new --remote-debugging-port=9374 --mute-audio ... (see crea_qa.mjs)
//   node tools/qa/creativity/cz_qa.mjs --port 9374 [--build dist/dinglecraft_v<VER>.html] [--out dir]
import fs from 'fs';import {defaultBuild,gameVersion} from '../lib/paths.mjs';import path from 'path';import {fileURLToPath} from 'url';import {execFileSync} from 'child_process';
const A=Object.fromEntries(process.argv.slice(2).reduce((m,a,i,arr)=>{if(a.startsWith('--'))m.push([a.slice(2),arr[i+1]&&!arr[i+1].startsWith('--')?arr[i+1]:'1']);return m;},[]));
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..')+'/';
const PORT=+(A.port||9374),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild();
const OUT=path.resolve(A.out||ROOT+'out/qa/cz_'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19));
fs.mkdirSync(OUT,{recursive:true});
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
const shots=[],checks=[],skipped=[];
const check=(name,cond,info)=>{checks.push([name,!!cond,info===undefined?null:info]);console.log((cond?'ok   ':'FAIL ')+name+(info!==undefined&&!cond?' '+JSON.stringify(info).slice(0,600):''));};
const shot=async(name,clip)=>{await ev('__cz.render();');await sleep(80);
  const r=await send('Page.captureScreenshot',Object.assign({format:'jpeg',quality:84},clip?{clip:Object.assign({scale:1},clip)}:{}));
  const f=OUT+'/'+String(shots.length+1).padStart(2,'0')+'_'+name+'.jpg';fs.writeFileSync(f,Buffer.from(r.result.data,'base64'));shots.push(f);};
/* ---- real input ---- */
const mouse=(type,x,y,button,buttons,mods)=>send('Input.dispatchMouseEvent',{type,x,y,button:button||'none',buttons:buttons||0,clickCount:type==='mouseMoved'?0:1,modifiers:mods||0,pointerType:'mouse'});
const clickAt=async(x,y,btn,mods)=>{const b=btn||'left',bs=b==='right'?2:1;await mouse('mouseMoved',x,y,'none',0,mods);await mouse('mousePressed',x,y,b,bs,mods);await mouse('mouseReleased',x,y,b,0,mods);await sleep(15);};
const rectOf=async expr=>await ev('const e=('+expr+');if(!e||!e.getBoundingClientRect)return null;const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,dis:!!e.disabled};');
const clickEl=async expr=>{const r=await rectOf(expr);if(!r)throw new Error('no element: '+expr);await clickAt(r.x+r.w/2,r.y+r.h/2);return r;};
const KEYS={Space:[' ',32],Escape:['Escape',27],KeyZ:['z',90],KeyB:['b',66],KeyG:['g',71],KeyE:['e',69],BracketRight:[']',221],BracketLeft:['[',219],Enter:['Enter',13]};
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

/* ---- page-side helpers (re-injected after every load) ---- */
const HELP=`window.__cz={T:600000,
  stp(n){for(let i=0;i<(n||1);i++){if(paused&&playing&&!__vox.P.dead){window.__czUnpause=(window.__czUnpause||0)+1;resumeGame();}this.T+=40;__vox.frameStep(this.T);}},
  render(){this.stp(1);if(__vox.getTP&&__vox.getTP().hr&&__vox.tpRenderOnce)try{__vox.tpRenderOnce();}catch(e){}},
  aim(x,y,z){const P=__vox.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));},
  rc(){__vox.MB.r=true;this.stp(1);__vox.MB.r=false;this.stp(2);},
  dig(n){__vox.MB.l=true;this.stp(n);__vox.MB.l=false;this.stp(3);},
  tp(x,z,y){const P=__vox.P;P.x=x;P.z=z;if(y!=null)P.y=y;P.vx=P.vy=P.vz=0;P.fallD=0;this.stp(2);},
  give(id,s){const P=__vox.P;s=s||0;if(P.inv[s]){const e=P.inv.findIndex((q,i)=>!q&&i>8);if(e>0)P.inv[e]=P.inv[s];}P.inv[s]={id,count:1};P.sel=s;__vox.refreshHand();},
  select(id){const P=__vox.P;let i=P.inv.findIndex(q=>q&&q.id===id);if(i<0)return false;if(i>8){const t=P.inv[8];P.inv[8]=P.inv[i];P.inv[i]=t;i=8;}P.sel=i;__vox.refreshHand();return true;},
  empty(){const P=__vox.P;let i=P.inv.findIndex((q,k)=>!q&&k<9);if(i<0){const e=P.inv.findIndex((q,k)=>!q&&k>8);i=0;if(e>0)P.inv[e]=P.inv[0];P.inv[0]=null;}P.sel=i;__vox.refreshHand();},
  cells(id){const o=[];for(const [k,b] of __vox.blockEnts)if(b.t==='crpaint'&&b.id===id)o.push(k);return o;},
  drops(id){return __vox.entities.filter(e=>e.t==='drop'&&!e.dead&&e.st&&e.st.id===id);},
  cnt(id){return __vox.P.inv.reduce((n,s)=>n+(s&&s.id===id?s.count:0),0);},
  pick(id){const P=__vox.P,x=P.x,y=P.y,z=P.z;for(const e of this.drops(id)){this.tp(e.x,e.z,Math.floor(e.y)+0.01);this.stp(25);}this.tp(x,z,y);return this.cnt(id);},
  be(x,y,z){return __vox.blockEnts.get(x+','+y+','+z)||null;},
  crw(){return JSON.stringify(__vox.getCR().CRW);},
  works(){return Object.keys(__vox.getCR().CRW).map(k=>__vox.crItemId(+k));},
  rec(id){return __vox.crRec(__vox.crWorkN(id));},
  hash(s){let h=0x811c9dc5;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);},
  kill(r){const P=__vox.P;for(const e of __vox.entities)if(e.t==='mob'&&!e.dead&&!e.bot&&Math.hypot(e.x-P.x,e.z-P.z)<(r||80)){e.hurtT=0;__vox.hurtMob(e,99999,0,0);}},
  room(x0,y,z0,W,D,Hh){const V=__vox,B=V.B;for(let x=x0-1;x<=x0+W;x++)for(let z=z0-1;z<=z0+D;z++){V.setBlock(x,y-1,z,B.STONE);
      for(let dy=0;dy<=Hh;dy++)V.setBlock(x,y+dy,z,(x===x0-1||x===x0+W||z===z0-1||z===z0+D)?(dy===Hh?B.STONE:B.PLANK_O||B.STONE):B.AIR);}},
  hidden(){const s=document.getElementById('crask');return !s||s.style.display!=='flex';}};
if(!window.__czPG&&typeof pauseGame==='function'){window.__czPG=pauseGame;window.__czPause=[];
  pauseGame=function(){window.__czPause.push({T:__cz.T,lock:!!document.pointerLockElement,st:String(new Error().stack).split('\\n').slice(2,7).map(s=>s.trim().slice(0,90)).join(' | ')});return window.__czPG.apply(this,arguments);};}`;
const boot=async()=>{for(let i=0;i<240;i++){let v=false;try{v=await ev("return typeof window.__vox==='object'&&document.readyState==='complete'");}catch(e){}if(v)break;await sleep(500);}
  /* headless Chrome grants and then revokes pointer lock after a page reload, and the core pauses on the lost lock (not a creativity
     matter: Dan has a real mouse): use the core's own drag-look fallback, and resume if a pause slipped through (counted in summary.json) */
  await ev(HELP+"try{usePLock=false;lockWanted=false;}catch(e){}Object.assign(__vox.BRAIN,{mock:null,ok:false,off:true,url:'http://127.0.0.1:9'});if(__vox.setBrainMock)__vox.setBrainMock(null);");};
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}"+
  "s.snd=0;s.mus=0;s.tp='og';localStorage.setItem(k,JSON.stringify(s));}catch(e){}"+
  "window.__DINGLE_BRAIN={url:'http://127.0.0.1:9',token:null};window.requestAnimationFrame=function(){return 0;};"});
await send('Page.navigate',{url:`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`});await boot();
const info=await ev("return {ver:__vox.GAME_VERSION,stubs:__vox.crInfo().stubs,pg:__vox.mpInfo?__vox.mpInfo().stubs:'?',sound:soundOn,hr:typeof __vox.setPack==='function',title:document.title}");
check('v'+gameVersion()+' loaded with both creativity packages real, PART 55 present, sound off',info.ver===gameVersion()&&info.stubs===''&&info.sound===false&&info.hr,info);
/* the patch notes and the help screen (title screen) */
{/* label-aware (Release 1.0): the newest entry heads the panel with its public label (RELEASE_LABEL) or v<ver>; the v6.2 entry is kept further down */
  const pn=await ev("openPatch();const b=document.getElementById('patchbody'),L=__vox.PATCH_LOG,e=L.find(x=>x.v==='6.2')||{lines:[]},top=L[0];const o={t:b?b.textContent:'',n:e.lines.length,v:e.v,title:e.title,top:(top.label||'v'+top.v)+' \u2014 '+top.title,topV:top.v,ver:__vox.GAME_VERSION,label:__vox.RELEASE_LABEL||null};closePatch();return o;");
  await ev("openHelp();const h=document.getElementById('help'),row=[...h.querySelectorAll('.krow')].find(k=>/^Creativity/.test(k.textContent));if(row&&row.scrollIntoView)row.scrollIntoView({block:'center'});");
  await sleep(150);const r2=await send('Page.captureScreenshot',{format:'jpeg',quality:84});fs.writeFileSync(OUT+'/00_help_screen.jpg',Buffer.from(r2.result.data,'base64'));
  const hp=await ev("const h=document.getElementById('help'),row=[...h.querySelectorAll('.krow')].find(k=>/^Creativity/.test(k.textContent));const t=row?row.textContent:'';try{closeHelp();}catch(e){h.style.display='none';}return t;");
  check('the patch notes open on the current release ('+pn.top+'), keep the v6.2 Creativity Update notes ('+pn.n+' lines), and the Creativity help row is on screen',
    pn.topV===pn.ver&&pn.t.startsWith(pn.top)&&(!pn.label||pn.top.startsWith(pn.label))&&pn.v==='6.2'&&pn.title==='The Creativity Update'&&pn.n>=5&&pn.t.includes('v6.2 \u2014 The Creativity Update')&&/Easel/.test(hp)&&/Jukebox/.test(hp),{pn:{...pn,t:pn.t.slice(0,80)},hp});}
const Q=await ev(`const V=__vox;V.startNewWorld('czqa','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);
  __cz.stp(220);const P=V.P,x=Math.floor(P.x),z=Math.floor(P.z),y=Math.max(V.surfaceTop(x,z)+1,Math.floor(P.y));
  __cz.room(x-6,y,z-6,14,14,6);P.x=x+0.5;P.z=z+0.5;P.y=y;__cz.stp(30);__cz.kill();window.__q={x,y,z};return window.__q;`);
const QS=`const V=__vox,Q=__q,C=V.crCore();`;
await ev('openPatch();__cz.stp(1);');await sleep(150);{const r=await send('Page.captureScreenshot',{format:'jpeg',quality:84});fs.writeFileSync(OUT+'/00_patch_notes.jpg',Buffer.from(r.result.data,'base64'));}
await ev('closePatch();__cz.stp(1);');

/* ===== 1. crafting + the easel + a painting with real input ===== */
{const r=await ev(QS+`V.openModal('craft');const M=C.MODAL,rs=M.rset||V.RECIPES,outs=[V.B.CR_EASEL,V.B.CR_DECK,V.B.CR_JUKE].map(o=>rs.some(q=>q.o===o));__cz.stp(2);return {outs,kind:M.kind};`);
  await clickEl("[...document.querySelectorAll('button')].find(b=>b.textContent==='Recipes'&&b.offsetParent)");
  const rl=await ev("const rl=document.getElementById('rlist');if(!rl)return null;rl.scrollTop=rl.scrollHeight;const t=rl.textContent;return {shown:rl.style.display!=='none',easel:t.includes('Easel'),deck:t.includes('Record Player'),juke:t.includes('Jukebox')};");
  await shot('recipe_list_overworld');await ev(QS+'V.closeModal(true);__cz.stp(2);');
  check('the overworld crafting table knows the Easel, the Record Player and the Jukebox, and its Recipes list shows all three',r.outs.every(Boolean)&&rl&&rl.shown&&rl.easel&&rl.deck&&rl.juke,{r,rl});}
await ev(QS+`__cz.give(V.B.CR_EASEL,0);__cz.aim(Q.x+2.5,Q.y-0.02,Q.z+0.5);__cz.rc();__cz.empty();__cz.aim(Q.x+2.5,Q.y+0.6,Q.z+0.5);__cz.stp(3);`);
await shot('easel_placed');
await ev(QS+'__cz.rc();');
check('right-click on the easel opens the size picker',await ev("return __vox.crOn()==='paint'&&__vox.getCRP().screen==='pick'"));
await shot('paint_size_picker');
await clickEl('__vox.getCRP().el.sizes[1]');
await artRect();
check('a real click on Wide starts a 128x64 canvas, shown whole on a 1280x720 screen',ART.W===128&&ART.H===64&&ART.x>=0&&ART.x+ART.w<=1280&&ART.y+ART.h<=720,ART);
/* a harbour at dusk */
await swatch(23);await key('KeyG');await paintAt(5,5);                                                            /* sky: fill (G) */
await swatch(6);await tool('pencil');await clickEl('__vox.getCRP().el.sizes[2]');
for(let y=14;y<=24;y+=2)await paintPath([[96-Math.round(Math.sqrt(Math.max(0,36-(y-19)*(y-19)))*1.6),y],[96+Math.round(Math.sqrt(Math.max(0,36-(y-19)*(y-19)))*1.6),y]]);   /* sun */
await clickEl('__vox.getCRP().el.sizes[0]');await swatch(12);await paintPath([[0,38],[127,38]]);                  /* horizon */
await tool('fill');await paintAt(10,50);                                                                          /* sea (navy) */
await swatch(11);await tool('pencil');for(let y=42;y<62;y+=5)await paintPath([[4+(y%3)*7,y],[20+(y%3)*7,y]]);    /* waves */
await swatch(16);await key('BracketRight');await key('BracketRight');for(let y=33;y<=37;y+=2)await paintPath([[20,y],[44,y]]);   /* hull */
await key('BracketLeft');await key('BracketLeft');await swatch(15);await paintPath([[32,33],[32,12]]);           /* mast */
await swatch(2);for(let i=0;i<16;i++)await paintPath([[33,13+i],[33+Math.round(i*0.8),13+i]]);                  /* sail */
await swatch(1);await paintPath([[60,4],[90,30]]);const slip=await ev("return __vox.getCRP().px[4*128+60]");
await paintPath([[60,4],[90,30]],'right');const erased=await ev("return __vox.getCRP().px[4*128+60]");
await key('KeyZ',2);await key('KeyZ',2);
const pnt=await ev("const p=__vox.getCRP(),r=__vox.crRec(p.n);return {sky:p.px[4*128+60],sea:p.px[50*128+10],sail:p.px[20*128+35],mast:p.px[20*128+32],saved:__vox.crArtDecode(r.d,128,64).every((v,i)=>v===p.px[i]),n:p.n}");
check('real strokes land (sky fill, sea fill, mast, sail), right-drag erases a slip, Ctrl+Z twice undoes both, every step is saved',
  slip===1&&erased===0&&pnt.sky===23&&pnt.sea===12&&pnt.sail===2&&pnt.mast===15&&pnt.saved,{slip,erased,pnt});
await shot('paint_editor_harbour');
await clickEl('__vox.getCRP().el.done');
const focus=await ev("return {shown:document.getElementById('crask').style.display,act:document.activeElement&&document.activeElement.id}");
check('Done opens the title dialog with the field focused',focus.shown==='flex'&&focus.act==='craskin',focus);
await send('Input.insertText',{text:'CZ Harbour'});await shot('paint_done_title');await key('Enter');await ev('__cz.stp(2);');
const PA=await ev(QS+"const s=V.P.inv.find(q=>q&&V.crWorkN(q.id)&&__cz.rec(q.id).st==='done');return s?{id:s.id,name:V.DEFS[s.id].name,cnt:__cz.cnt(s.id),easel:__cz.be(Q.x+2,Q.y,Q.z).id,on:V.crOn(),d:__cz.rec(s.id).d}:null;");
check('Enter finishes it: ONE "Painting: CZ Harbour" in the inventory, the easel is empty, the editor closed',!!PA&&PA.name==='Painting: CZ Harbour'&&PA.cnt===1&&PA.easel===0&&PA.on==='',PA&&{...PA,d:undefined});
const PID=PA?PA.id:0,PD=PA?PA.d:'';
/* the c0 crAsk fix on its own (no package workaround involved) */
check('c0 crAsk: the title field takes focus by itself (the dialog is shown before the focus)',await ev(
  "__vox.crUIOpen('paint',null);let ok=false;__vox.crAsk({title:'t',text:'x',input:{value:'abc',max:24},ok:'OK',no:'No'});ok=document.activeElement&&document.activeElement.id==='craskin';__vox.crAskDone(false);__vox.crUIClose();__cz.stp(2);return ok;"));

/* ===== 2. hang, break, pick up, re-hang ===== */
await ev(QS+`__cz.tp(Q.x+4.5,Q.z+0.5,Q.y);__cz.select(${PID});__cz.aim(Q.x+8.01,Q.y+1.5,Q.z+0.5);__cz.rc();__cz.stp(8);__cz.tp(Q.x+0.5,Q.z+0.5,Q.y);__cz.aim(Q.x+8,Q.y+1.6,Q.z+0.5);__cz.stp(8);`);
check('a right-click on the east wall hangs it: 8 cells (4x2), the item used up',await ev(`return __cz.cells(${PID}).length===8&&__cz.cnt(${PID})===0`));
await shot('hung_wide_og');
await ev(QS+`const c=__cz.cells(${PID})[0].split(',').map(Number);__cz.tp(Q.x+5.5,Q.z+0.5,Q.y);__cz.empty();__cz.aim(c[0]+0.5,c[1]+0.5,c[2]+0.5);__cz.dig(18);`);
check('broken by hand: the whole painting comes down as ONE drop of the same item',await ev(`return __cz.cells(${PID}).length===0&&__cz.drops(${PID}).length===1&&__cz.cnt(${PID})===0`));
check('picked up again: the same id, count 1',await ev(`return __cz.pick(${PID})===1`));
await ev(QS+`__cz.tp(Q.x+0.5,Q.z-3.5,Q.y);__cz.select(${PID});__cz.aim(Q.x+0.5,Q.y+1.5,Q.z-6.01);__cz.rc();__cz.stp(8);__cz.tp(Q.x+0.5,Q.z+2.5,Q.y);__cz.aim(Q.x+0.5,Q.y+1.8,Q.z-6);__cz.stp(8);`);
check('re-hung on the north wall: 8 cells, the same pixels',await ev(`return __cz.cells(${PID}).length===8&&__cz.rec(${PID}).d===${JSON.stringify(PD)}`));
await shot('rehung_north_og');

/* ===== 3. an unfinished canvas survives its easel ===== */
const WIP=await ev(QS+`__cz.tp(Q.x+0.5,Q.z+0.5,Q.y);__cz.give(V.B.CR_EASEL,0);__cz.aim(Q.x-1.5,Q.y-0.02,Q.z+3.5);__cz.rc();__cz.empty();__cz.aim(Q.x-1.5,Q.y+0.6,Q.z+3.5);__cz.rc();
  return {on:V.crOn(),screen:V.getCRP().screen};`);
await clickEl('__vox.getCRP().el.sizes[2]');await artRect();
await swatch(10);await key('KeyG');await paintAt(10,10);await swatch(5);await key('KeyB');await clickEl('__vox.getCRP().el.sizes[2]');await paintPath([[10,100],[54,20]]);
const W0=await ev("const p=__vox.getCRP();return {n:p.n,id:__vox.crItemId(p.n),d:__vox.crRec(p.n).d,w:p.w,h:p.h}");
await key('Escape');await ev('__cz.stp(3);');
check('a Tall canvas: painted, Esc closes the editor, the easel keeps the Unfinished Canvas',WIP.on==='paint'&&W0.w===64&&W0.h===128&&await ev(QS+`return !V.crOn()&&__cz.be(Q.x-2,Q.y,Q.z+3).id===${W0.id}`),{WIP,W0:{...W0,d:undefined}});
await ev(QS+`__cz.empty();__cz.aim(Q.x-1.5,Q.y+0.6,Q.z+3.5);__cz.dig(48);`);
const wipDrop=await ev(QS+`return {block:V.getBlock(Q.x-2,Q.y,Q.z+3),drops:__cz.drops(${W0.id}).length,name:V.DEFS[${W0.id}].name}`);
check('breaking that easel drops the Unfinished Canvas (64×128) as one item',wipDrop.block===0&&wipDrop.drops===1&&/^Unfinished Canvas/.test(wipDrop.name),wipDrop);
await ev(QS+`__cz.pick(${W0.id});__cz.pick(V.B.CR_EASEL);__cz.select(V.B.CR_EASEL)||__cz.give(V.B.CR_EASEL,0);__cz.aim(Q.x-1.5,Q.y-0.02,Q.z+3.5);__cz.rc();
  __cz.select(${W0.id});__cz.aim(Q.x-1.5,Q.y+0.6,Q.z+3.5);__cz.rc();__cz.stp(2);`);
check('back on a new easel: the editor opens on the same unfinished canvas, pixel for pixel',await ev(`const p=__vox.getCRP();return __vox.crOn()==='paint'&&p.screen==='edit'&&p.n===${W0.n}&&__vox.crArtEncode(p.px,64,128)===${JSON.stringify(W0.d)}&&__cz.cnt(${W0.id})===0`));
await key('Escape');await ev('__cz.stp(3);');

/* ===== 4. the record player with real input ===== */
await ev(QS+`__cz.tp(Q.x+0.5,Q.z+0.5,Q.y);__cz.give(V.B.CR_DECK,1);__cz.aim(Q.x+2.5,Q.y-0.02,Q.z+2.5);__cz.rc();__cz.give(V.B.CR_JUKE,2);__cz.aim(Q.x+2.5,Q.y-0.02,Q.z-2.5);__cz.rc();
  V.P.inv[1]=null;V.P.inv[2]=null;__cz.empty();__cz.aim(Q.x+2.5,Q.y+0.5,Q.z+2.5);__cz.stp(3);`);
await shot('deck_and_jukebox');
await ev('__cz.rc();');
check('right-click on the record player opens the music editor on a blank song (no Demo Tape yet)',await ev(QS+`return V.crOn()==='music'&&__cz.be(Q.x+2,Q.y,Q.z+2).id===0`));
const MEL=[[0,0],[2,2],[4,4],[6,7],[8,9],[10,7],[12,4],[14,2],[16,0],[18,4],[20,7],[22,11],[24,9],[26,7],[28,4]];
for(const [s,r] of MEL)await tapCell(s,r);
await dragCells(29,2,31,2,6);
await clickEl(`${UI}.el.tr[1].row`);
for(let s=0;s<32;s+=8)await tapCell(s,0);for(let s=4;s<32;s+=8)await tapCell(s,1);
await dragCells(0,2,31,2,40);
await clickEl(`${UI}.el.add`);for(const [s,r] of [[0,0],[8,3],[16,4],[24,3]])await tapCell(s,r);
await clickEl(`${UI}.el.tr[0].inst`);await shot('music_instrument_list');await clickEl(`${UI}.el.tr[0].pick[3]`);
{const b=await rectOf(`${UI}.el.tempo`);await clickAt(b.x+b.w*0.7,b.y+b.h/2);}
const M1=await ev(`const m=${UI}.m;return {tr:m.tr.map(t=>t.i+':'+t.n.length),bpm:m.bpm,notes:__vox.crSongCount(m),saved:!!__vox.crCtxRec(${UI}.ctx)}`);
check('16 melody notes (one dragged long), 8 kicks/snares, 32 hats by one drag, a 4-note bass; track 1 switched to Pluck Guitar; tempo moved; all saved as a Demo Tape',
  M1.tr.join()==='pluck:16,drums:40,bass:4'&&M1.bpm!==120&&M1.saved,M1);
await ev(MUTE);await key('Space');const ph0=await ev(`return ${UI}.lastSt`);await ev('__cz.stp(12);');
const ph1=await ev(`return {st:${UI}.lastSt,msg:${UI}.msg,snd:soundOn,ac:typeof AC==='undefined'?'none':(AC?AC.state:'null')}`);
await shot('music_playing_silently');
check('Space plays with Sound off: "Sound is off (Settings)", the playhead moves on the game clock, no AudioContext',ph1.st!==ph0&&ph1.msg==='Sound is off (Settings)'&&ph1.snd===false&&ph1.ac==='null',{ph0,ph1});
await key('Space');
await clickEl(`${UI}.el.done`);
check('Done opens "Press the disc?" with the field focused',await ev("return document.getElementById('crask').style.display==='flex'&&document.activeElement.id==='craskin'"));
await send('Input.insertText',{text:'CZ Groove'});await clickEl("document.getElementById('craskok')");await ev('__cz.stp(2);');
const DS=await ev(QS+"const s=V.P.inv.find(q=>q&&V.crWorkN(q.id)&&__cz.rec(q.id).k==='song');return s?{id:s.id,name:V.DEFS[s.id].name,st:__cz.rec(s.id).st,deck:__cz.be(Q.x+2,Q.y,Q.z+2).id,d:__cz.rec(s.id).d}:null;");
check('it presses ONE "Music Disc: CZ Groove" and the record player is cleared',!!DS&&DS.name==='Music Disc: CZ Groove'&&DS.st==='done'&&DS.deck===0,DS&&{...DS,d:undefined});
const DID=DS?DS.id:0,DD=DS?DS.d:null;fs.writeFileSync(OUT+'/disc.json',JSON.stringify({title:'CZ Groove',d:DD},null,1));

/* ===== 5. the jukebox ===== */
const JK=`__cz.be(Q.x+2,Q.y,Q.z-3)`;
await ev(QS+`__cz.select(${DID});__cz.aim(Q.x+2.5,Q.y+0.5,Q.z-2.5);__cz.rc();__cz.stp(6);`);
const J1=await ev(QS+`return {id:${JK}.id,toast:document.getElementById('toast').textContent,snd:soundOn,voices:V.crMusInfo().CRM.voices.size,fx:V.crMusInfo().CRM.fx.size,duck:V.crDuckNow(),cnt:__cz.cnt(${DID})}`);
check('the disc goes into the jukebox: "Now playing", used up, a floating note, still silent (no voice is built with Sound off)',J1.id===DID&&/Now playing/.test(J1.toast)&&J1.cnt===0&&J1.fx===1&&J1.voices===0&&J1.snd===false,J1);
await ev(QS+`__cz.aim(Q.x+2.5,Q.y+1.4,Q.z-2.5);__cz.tp(Q.x-1.5,Q.z+0.5,Q.y);__cz.aim(Q.x+2.5,Q.y+1.2,Q.z-2.5);__cz.stp(10);`);await shot('jukebox_playing_og');
await ev(QS+`__cz.tp(Q.x+0.5,Q.z+0.5,Q.y);__cz.empty();__cz.aim(Q.x+2.5,Q.y+0.5,Q.z-2.5);__cz.rc();__cz.stp(4);`);
check('right-click again ejects the SAME disc back to Dan, the note stops',await ev(QS+`return ${JK}.id===0&&__cz.cnt(${DID})===1&&V.crMusInfo().CRM.fx.size===0&&JSON.stringify(__cz.rec(${DID}).d)===${JSON.stringify(JSON.stringify(DD))}`));
await ev(QS+`__cz.select(${DID});__cz.aim(Q.x+2.5,Q.y+0.5,Q.z-2.5);__cz.rc();__cz.empty();__cz.aim(Q.x+2.5,Q.y+0.5,Q.z-2.5);__cz.dig(75);`);
const J2=await ev(QS+`return {blk:V.getBlock(Q.x+2,Q.y,Q.z-3),disc:__cz.drops(${DID}).length,juke:__cz.drops(V.B.CR_JUKE).length}`);
check('breaking the playing jukebox by hand drops the disc (and the jukebox)',J2.blk===0&&J2.disc===1&&J2.juke===1,J2);
await ev(QS+`__cz.pick(${DID});__cz.pick(V.B.CR_JUKE);__cz.select(V.B.CR_JUKE);__cz.aim(Q.x+2.5,Q.y-0.02,Q.z-2.5);__cz.rc();__cz.select(${DID});__cz.aim(Q.x+2.5,Q.y+0.5,Q.z-2.5);__cz.rc();__cz.empty();__cz.stp(4);`);
check('picked up, placed again, the same disc plays again',await ev(QS+`return ${JK}&&${JK}.id===${DID}&&__cz.cnt(${DID})===0`));

/* ===== 6. save, reload the page, load the world ===== */
const pre=await ev(QS+`return {crw:__cz.crw(),wip:__cz.be(Q.x-2,Q.y,Q.z+3).id}`);
check('the world saves',await ev("return await saveToStorage('czqa',true);")===true);
await send('Page.reload',{ignoreCache:true});await sleep(600);await boot();
await ev(`window.__q=${JSON.stringify(Q)};await loadWorldByName('czqa');__cz.stp(60);`);
const post=await ev(QS+`return {crw:__cz.crw(),cells:__cz.cells(${PID}).length,juke:${JK}&&${JK}.id,wip:__cz.be(Q.x-2,Q.y,Q.z+3)&&__cz.be(Q.x-2,Q.y,Q.z+3).id,meshes:V.getCRPM().size,ver:V.GAME_VERSION}`);
check('after a page reload: the registry is byte-identical, the painting hangs (8 cells), the jukebox still holds the disc, the easel its canvas, meshes rebuilt',
  post.crw===pre.crw&&post.cells===8&&post.juke===DID&&post.wip===pre.wip&&post.meshes===2,{...post,crw:post.crw.length+'/'+pre.crw.length});
await ev(QS+`__cz.tp(Q.x+0.5,Q.z+2.5,Q.y);__cz.aim(Q.x+0.5,Q.y+1.8,Q.z-6);__cz.stp(6);`);await shot('after_reload_og');

/* ===== 7. Hyperreal and back ===== */
const views=async tag=>{
  await ev(QS+`__cz.tp(Q.x+0.5,Q.z+2.5,Q.y);__cz.aim(Q.x+0.5,Q.y+1.8,Q.z-6);__cz.stp(4);`);await shot(tag+'_painting');
  await ev(QS+`__cz.tp(Q.x-2.5,Q.z+0.5,Q.y);__cz.aim(Q.x+2.5,Q.y+0.6,Q.z+0.2);__cz.stp(4);`);await shot(tag+'_deck_juke');
  await ev(QS+`__cz.tp(Q.x-1.5,Q.z+1.1,Q.y);__cz.aim(Q.x-1.5,Q.y+0.75,Q.z+3.5);__cz.stp(4);`);await shot(tag+'_easel_tall');};
await ev("__vox.setTime(0.8);__cz.stp(4);");await views('og_night');await ev("__vox.setTime(0.3);__cz.stp(4);");
await ev("await __vox.setPack('hr');");for(let i=0;i<120;i++){if(await ev("const t=__vox.getTP();return !t.busy&&t.hr;"))break;await sleep(500);}
await ev("__cz.stp(10);");
check('Hyperreal on: painting and easel-canvas materials are matte Standard + sharp bilinear (fix lead), adopted, linear mipmaps, no shadow cast, shade 1',await ev("const V=__vox;let ok=V.getTP().hr&&V.getCRPM().size===2;for(const e of V.getCRPM().values())ok=ok&&e.mat.type===\"MeshStandardMaterial\"&&e.mat.userData.hrLin===1&&e.tex.magFilter===THREE.LinearFilter&&e.tex.minFilter===THREE.LinearMipmapLinearFilter&&e.m.castShadow===false&&e.mat.color.r===1;return ok;"));
await views('hr_day');await ev("__vox.setTime(0.8);__cz.stp(6);");await views('hr_night');await ev("__vox.setTime(0.3);__cz.stp(4);");
const SP=await ev(QS+`const n=V.crNew('art',{w:64,h:64,d:V.crArtEncode(new Uint8Array(4096).map((_,i)=>((i>>6)+(i&63))%5?23:(1+((i>>9)%24))),64,64)});V.crFinish(n,'Spare Stripes','Dan');const id=V.crItemId(n);
  const s=V.crNew('song',{d:V.crSongBlank()});V.crFinish(s,'Spare Tune','Dan');const sid=V.crItemId(s);
  V.crGiveDan({id,count:1});__cz.tp(Q.x+0.5,Q.z+0.5,Q.y);V.spawnDrop(Q.x+0.5,Q.y+0.4,Q.z-1.5,{id:sid,count:1},0,0,0);
  __cz.select(id);__cz.aim(Q.x+1,Q.y+0.2,Q.z-2.5);__cz.stp(20);return {id,sid,drops:__cz.drops(sid).length,hand:C.handKind()};`);
await shot('hr_holding_a_painting_drops');
check('Hyperreal: holding a painting and a disc dropped on the floor render without errors (held kind = the work id)',SP.hand===SP.id&&SP.drops===1&&logs.filter(l=>/^(error|exception)/.test(l)).length===0,SP);
await ev(QS+`__cz.pick(${SP.sid});__cz.empty();__cz.stp(2);`);
await ev("await __vox.setPack('og');");for(let i=0;i<60;i++){if(await ev("const t=__vox.getTP();return !t.busy&&!t.hr;"))break;await sleep(300);}await ev("__cz.stp(4);");
check('back to OG: shades 0.8 / 0.65 restored, nothing Hyperreal left on them (a plain Lambert, nearest filters again)',await ev("let ok=true;for(const e of __vox.getCRPM().values())ok=ok&&!(e.mat.userData&&e.mat.userData.hrLin)&&e.mat.type==='MeshLambertMaterial'&&e.tex.magFilter===THREE.NearestFilter&&e.tex.minFilter===THREE.NearestFilter&&(e.mat.color.r===0.8||e.mat.color.r===0.65);return ok;"));

/* ===== 8. Puppet Purgatory carrying the painting and the disc ===== */
const K0=await ev(QS+`const c=__cz.cells(${PID})[0].split(',').map(Number);__cz.tp(Q.x+0.5,Q.z-3.5,Q.y);__cz.empty();__cz.aim(c[0]+0.5,c[1]+0.5,c[2]+0.5);__cz.dig(18);__cz.pick(${PID});
  __cz.tp(Q.x+0.5,Q.z+0.5,Q.y);__cz.aim(Q.x+2.5,Q.y+0.5,Q.z-2.5);__cz.rc();__cz.stp(3);
  return {crw:__cz.crw(),art:__cz.cnt(${PID}),disc:__cz.cnt(${DID}),ph:__cz.hash(__cz.rec(${PID}).d),dh:__cz.hash(JSON.stringify(__cz.rec(${DID}).d))};`);
check('Dan carries the painting (taken down) and the disc (ejected)',K0.art===1&&K0.disc===1,K0);
await ev(QS+`__cz.tp(Q.x+0.5+60,Q.z+0.5,V.surfaceTop(Q.x+60,Q.z)+1);__cz.stp(30);V.P.yaw=0;const d=V.mpDoorHere();__cz.stp(4);
  __cz.tp(d.x+0.5+d.f[0]*3,d.z+0.5+d.f[1]*3,d.y);__cz.stp(4);__cz.empty();__cz.aim(d.x+0.5,d.y+1,d.z+0.5);__cz.stp(2);`);
await shot('stage_door_carrying_works');
await ev(QS+`const d=V.getMP().door;__cz.aim(d.x+0.5,d.y+1,d.z+0.5);__cz.rc();__cz.stp(10);__cz.aim(d.x+0.5,d.y+1,d.z+0.5);__cz.rc();__cz.stp(30);`);
await shot('entry_cutscene');
await key('Space');await ev('__cz.stp(4);');await key('Space');
for(let i=0;i<20;i++){if(await ev("__cz.stp(15);return __vox.getDim()==='puppet'&&__vox.getMP().inside&&!__vox.mpInfo().cut;"))break;}
const IN=await ev(QS+`const MP=V.getMP(),tk=MP.trunks.Dan,tb=tk&&V.blockEnts.get(tk);
  return {dim:V.getDim(),inside:MP.inside,trunk:!!tb,art:!!(tb&&tb.inv.some(s=>s&&s.id===${PID})),disc:!!(tb&&tb.inv.some(s=>s&&s.id===${DID})),onDan:__cz.cnt(${PID})+__cz.cnt(${DID}),
    crw:__cz.crw()===${JSON.stringify(K0.crw)},meshes:V.getCRPM().size,voices:V.crMusInfo().CRM.voices.size,fx:V.crMusInfo().CRM.fx.size}`);
check('through the real door ritual into Puppet Purgatory: both works wait in Dan’s Stage Trunk, none on Dan, the registry untouched, no overworld mesh or note follows him',
  IN.dim==='puppet'&&IN.inside&&IN.art&&IN.disc&&IN.onDan===0&&IN.crw&&IN.meshes===0&&IN.fx===0,IN);
await ev("__cz.stp(6);");await shot('inside_purgatory_og');
{const r=await ev(QS+"V.openModal('craft');const rs=C.MODAL.rset;__cz.stp(2);return {own:rs!==V.RECIPES,none:(rs||[]).every(q=>![V.B.CR_EASEL,V.B.CR_DECK,V.B.CR_JUKE].includes(q.o)),n:(rs||[]).length};");
  await shot('purgatory_crafting');await ev(QS+'V.closeModal(true);__cz.stp(2);');
  check('inside purgatory the crafting list is the purgatory set, with no creativity recipe',r.own&&r.none&&r.n>0,r);}
check('saving inside purgatory works',await ev("return await saveToStorage('czqa',true);")===true);
await send('Page.reload',{ignoreCache:true});await sleep(600);await boot();
await ev(`window.__q=${JSON.stringify(Q)};await loadWorldByName('czqa');__cz.stp(60);`);
const IN2=await ev(QS+`const MP=V.getMP(),tb=V.blockEnts.get(MP.trunks.Dan);return {dim:V.getDim(),art:!!(tb&&tb.inv.some(s=>s&&s.id===${PID})),disc:!!(tb&&tb.inv.some(s=>s&&s.id===${DID})),
  crw:__cz.crw()===${JSON.stringify(K0.crw)},ph:__cz.hash(__cz.rec(${PID}).d),dh:__cz.hash(JSON.stringify(__cz.rec(${DID}).d))}`);
check('page reload INSIDE purgatory: still inside, the trunk still holds both, the registry byte-identical, the data hashes equal',
  IN2.dim==='puppet'&&IN2.art&&IN2.disc&&IN2.crw&&IN2.ph===K0.ph&&IN2.dh===K0.dh,IN2);
const OUTP=await ev(QS+`V.mpExitNow({abandon:true});__cz.stp(10);const tk=V.getMP().trunks.Dan,p=tk.split(',').map(Number);
  const dr=V.getMP().door;__cz.tp(p[0]+0.5+dr.f[0]*2,p[2]+0.5+dr.f[1]*2,p[1]);__cz.stp(4);__cz.empty();__cz.aim(p[0]+0.5,p[1]+0.5,p[2]+0.5);__cz.rc();__cz.stp(2);let how='right-click';
  if(C.MODAL.kind!=='stash'&&!(C.MODAL.slots||[]).some(q=>q.home==='be')){V.PREG.interact.pstash({x:p[0],y:p[1],z:p[2]},V.DEFS[V.B.PG_STRUNK]);how='PREG';}
  const kind=C.MODAL.kind;for(const q of (C.MODAL.slots||[]).filter(q=>q.home==='be'))if(q.get())C.quickMove(q);V.closeModal(true);__cz.stp(3);
  return {dim:V.getDim(),how,kind,art:__cz.cnt(${PID}),disc:__cz.cnt(${DID}),crw:__cz.crw()===${JSON.stringify(K0.crw)},ph:__cz.hash(__cz.rec(${PID}).d),dh:__cz.hash(JSON.stringify(__cz.rec(${DID}).d))};`);
check('abandon and come home: customs leaves them alone, the Stage Trunk gives both back (same ids, same data)',OUTP.dim==='over'&&OUTP.art===1&&OUTP.disc===1&&OUTP.crw&&OUTP.ph===K0.ph&&OUTP.dh===K0.dh,OUTP);
await ev(QS+`__cz.tp(Q.x+0.5,Q.z-3.5,Q.y);__cz.stp(20);__cz.select(${PID});__cz.aim(Q.x+0.5,Q.y+1.5,Q.z-6.01);__cz.rc();__cz.tp(Q.x+0.5,Q.z+0.5,Q.y);__cz.select(${DID});__cz.aim(Q.x+2.5,Q.y+0.5,Q.z-2.5);__cz.rc();__cz.empty();__cz.stp(10);`);
console.log('pause log:',JSON.stringify(await ev('return window.__czPause;')));
check('home again: the painting re-hangs and the disc plays',await ev(QS+`return __cz.cells(${PID}).length===8&&${JK}.id===${DID}&&V.getCRPM().size===2&&V.crMusInfo().CRM.fx.size===1`));

/* ===== 9. the AI players ===== */
const BOT=await ev(QS+`V.GR.bots=true;V.GR.botGrief=true;Object.assign(V.BRAIN,{mock:null,ok:false,off:true,url:'http://127.0.0.1:9'});
  const fw=V.crNew('art',{w:64,h:64,d:V.crArtEncode(new Uint8Array(4096).map((_,i)=>1+((i>>3)^(i>>9))%24),64,64)});V.crFinish(fw,'Bot Bait','Dan');const fid=V.crItemId(fw);
  V.spawnDrop(Q.x+4.5,Q.y+0.5,Q.z+4.5,{id:fid,count:1},0,0,0);
  if(!V.AGENTS.length||!V.AGENTS.some(a=>a.e))V.agJoinAll(false);__cz.stp(20);
  V.AGENTS.forEach((a,i)=>{if(a.e){a.e.x=Q.x+1.5+i*1.5;a.e.z=Q.z+4.5;a.e.y=Q.y;}});__cz.stp(4);
  window.__fid=fid;return {n:V.AGENTS.filter(a=>a.e).length,fid,names:V.AGENTS.map(a=>a.name)};`);
let crash=null;
for(let k=0;k<6;k++){try{await ev('__cz.stp(100);');}catch(e){crash=String(e.message).slice(0,200);break;}
  if(k===1||k===4){await ev(QS+`__cz.tp(Q.x-4.5,Q.z+5.5,Q.y);__cz.aim(Q.x+2,Q.y+1.2,Q.z-2);__cz.stp(2);`);await shot('bots_in_the_studio_'+k);}}
const B2=await ev(QS+`const fid=window.__fid;return {joined:V.AGENTS.filter(a=>a.e).length,
  botWorks:V.AGENTS.some(a=>(a.inv||[]).some(q=>q&&q.id>V.CRC.ID0)),
  easel1:V.getBlock(Q.x+2,Q.y,Q.z)===V.B.CR_EASEL,easel2:V.getBlock(Q.x-2,Q.y,Q.z+3)===V.B.CR_EASEL&&__cz.be(Q.x-2,Q.y,Q.z+3).id===${W0.id},
  deck:V.getBlock(Q.x+2,Q.y,Q.z+2)===V.B.CR_DECK,juke:${JK}&&${JK}.id===${DID},cells:__cz.cells(${PID}).length,floor:__cz.drops(fid).length,
  crw:__cz.rec(${PID}).d===${JSON.stringify(PD)}&&__cz.hash(JSON.stringify(__cz.rec(${DID}).d))===${JSON.stringify(K0.dh)},fails:Object.keys(V.getCR().CRF.fails)}`);
check('three AI players (brain off, griefing on) loose in the studio for 600 frames: no crash, no bot holds a work',!crash&&BOT.n>=1&&!B2.botWorks&&B2.fails.length===0,{crash,BOT,B2});
check('  ... both easels (one still holding its canvas), the record player, the playing jukebox, the hung painting and the work on the floor are all untouched',
  B2.easel1&&B2.easel2&&B2.deck&&B2.juke&&B2.cells===8&&B2.floor===1&&B2.crw,B2);
await ev("await __vox.setPack('hr');");for(let i=0;i<120;i++){if(await ev("const t=__vox.getTP();return !t.busy&&t.hr;"))break;await sleep(500);}
await ev(QS+`__cz.stp(6);__cz.tp(Q.x-4.5,Q.z+5.5,Q.y);__cz.aim(Q.x+1,Q.y+1.4,Q.z-3);__cz.stp(3);`);await shot('bots_in_the_studio_hr');
await ev("await __vox.setPack('og');");for(let i=0;i<60;i++){if(await ev("const t=__vox.getTP();return !t.busy&&!t.hr;"))break;await sleep(300);}
await ev(QS+"V.agLeaveAll();V.GR.botGrief=false;__cz.stp(5);");
/* the inventory with every kind of work in it */
await ev(QS+`const P=V.P;const sid=V.crNew('song',{d:V.crSongBlank()});V.crGiveDan({id:V.crItemId(sid),count:1});const s=V.crNew('art',{w:64,h:64,d:V.crArtBlank(64,64)});V.crGiveDan({id:V.crItemId(s),count:1});
  V.openModal('inv');__cz.stp(2);`);
await shot('inventory_all_kinds');await ev(QS+'V.closeModal(true);__cz.stp(2);');

/* ===== 10. OfflineAudioContext parity (rendered offline, never played; the game's own AC is untouched) ===== */
const OA=await ev(`const V=__vox,r=__cz.rec(${DID}),sr=44100,x=V.crSongRender(r.d,sr);
  const oc=new OfflineAudioContext(2,x.length,sr),b=oc.createBuffer(1,x.length,sr);b.copyToChannel(x,0);
  const s=oc.createBufferSource();s.buffer=b;const g=oc.createGain();g.gain.value=0.5;s.connect(g);g.connect(oc.destination);s.start(0);
  const out=await oc.startRendering(),L=out.getChannelData(0),R=out.getChannelData(1);let md=0,e=0,pk=0;
  for(let i=0;i<x.length;i++){md=Math.max(md,Math.abs(L[i]-x[i]*0.5),Math.abs(R[i]-x[i]*0.5));e+=x[i]*x[i];pk=Math.max(pk,Math.abs(x[i]));}
  return {n:x.length,len:V.crSongLen(r.d),maxDiff:md,rms:Math.sqrt(e/x.length),peak:pk,game:typeof AC==='undefined'?'none':(AC?AC.state:'null'),snd:soundOn};`);
check('OfflineAudioContext renders the disc through a gain node exactly as crSongRender made it (max diff < 1e-6), not silent, never clipped',
  OA.maxDiff<1e-6&&OA.rms>0.02&&OA.peak<1&&Math.abs(OA.n-Math.round(OA.len*44100))<=1,OA);
check('the game never made a sound: soundOn false, no game AudioContext',OA.snd===false&&(OA.game==='null'||OA.game==='suspended'),OA);
await ev("try{const k='vx_vox_settings';const s=JSON.parse(localStorage.getItem(k)||'{}');s.tp='og';s.snd=0;localStorage.setItem(k,JSON.stringify(s));}catch(e){}");
const errs=logs.filter(l=>/^(error|exception)/.test(l));
check('no console errors or exceptions',errs.length===0,errs.slice(0,6));
try{execFileSync('python3',['-c',`
import sys,glob
from PIL import Image,ImageDraw
fa=sorted(glob.glob(sys.argv[1]+'/[0-9][0-9]_*.jpg'))
W,H=384,216
for p in range(0,len(fa),30):
  fs=fa[p:p+30];S=Image.new('RGB',(5*W,6*(H+18)),(24,24,24));d=ImageDraw.Draw(S)
  for i,f in enumerate(fs):
    im=Image.open(f).convert('RGB');im.thumbnail((W,H));x=(i%5)*W;y=(i//5)*(H+18);S.paste(im,(x,y+18));d.text((x+4,y+3),f.split('/')[-1][:-4],fill=(255,230,150))
  S.save(sys.argv[1]+('/sheet.jpg' if p==0 else '/sheet%d.jpg'%(p//30+1)),quality=88)`,OUT]);}catch(e){console.log('sheet failed',String(e).slice(0,200));}
const rigNotes=await ev("return {unpaused:window.__czUnpause||0,pauses:window.__czPause||[]};");
fs.writeFileSync(OUT+'/summary.json',JSON.stringify({build:BUILD,info,rigNotes,checks,skipped,shots:shots.map(f=>path.relative(ROOT,f)),logs:logs.slice(-40)},null,1));
console.log(JSON.stringify({out:path.relative(ROOT,OUT),pass:checks.filter(c=>c[1]).length,fail:checks.filter(c=>!c[1]).length,skipped,errors:errs.slice(0,8)},null,1));
ws.close();process.exit(checks.every(c=>c[1])?0:1);
