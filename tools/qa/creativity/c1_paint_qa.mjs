// c1_paint_qa.mjs (C1): the MUTED headless-Chrome rig for paintings (CREATIVITY_PLAN.md 7.4 and 10).
// It paints a recognisable picture on an easel with REAL input (Input.dispatchMouseEvent / dispatchKeyEvent on the editor's DOM),
// finishes it with a typed title, hangs it, breaks it, picks it up, re-hangs it on another wall, saves, reloads the page and loads
// the world, then stages a gallery (three sizes on all four walls) and shoots it by day and night in OG and Hyperreal, plus the easel
// with a canvas on it. Writes JPEGs, summary.json and a 5x6 contact sheet (PIL) into --out. Never turns sound on: Chrome runs with
// --mute-audio, every document gets vx_vox_settings merged with snd:0 / mus:0 / tp:'og' before the game runs, and every evaluation
// sets soundOn=false and suspends AC. The game's rAF loop is frozen while the rig steps frames itself (frameStep from a live rAF loop
// would stack extra loops), and restored before each screenshot sequence ends.
//
//   node scripts/serve.mjs --port 9472                      (repo root, background)
//   Chrome --headless=new --remote-debugging-port=9372 --mute-audio ... (see crea_qa.mjs)
//   node tools/qa/creativity/c1_paint_qa.mjs --port 9372 [--build dist/dinglecraft_v<VER>.html] [--out dir] [--hr 0]
import fs from 'fs';import {defaultBuild,gameVersion} from '../lib/paths.mjs';import path from 'path';import {fileURLToPath} from 'url';import {execFileSync} from 'child_process';
const A=Object.fromEntries(process.argv.slice(2).reduce((m,a,i,arr)=>{if(a.startsWith('--'))m.push([a.slice(2),arr[i+1]&&!arr[i+1].startsWith('--')?arr[i+1]:'1']);return m;},[]));
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..')+'/';
const PORT=+(A.port||9372),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild(),DO_HR=A.hr!=='0';
const OUT=path.resolve(A.out||ROOT+'out/qa/c1_'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19));
fs.mkdirSync(OUT,{recursive:true});
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
let pg=list.find(t=>t.type==='page');if(!pg)pg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map(),logs=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
  else if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;logs.push('exception: '+((d.exception&&d.exception.description)||d.text).slice(0,400));}};
await new Promise(r=>ws.onopen=r);
const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
const ev=async(code)=>{const r=await send('Runtime.evaluate',{expression:'(async()=>{'+code+'\n})()',awaitPromise:true,returnByValue:true});
  if(r.result&&r.result.exceptionDetails){const d=r.result.exceptionDetails;throw new Error(((d.exception&&d.exception.description)||d.text).slice(0,800));}
  return r.result&&r.result.result?r.result.result.value:undefined;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shots=[],checks=[],skipped=[];
const check=(name,cond,info)=>{checks.push([name,!!cond,info===undefined?null:info]);console.log((cond?'ok   ':'FAIL ')+name+(info!==undefined?' '+JSON.stringify(info):''));};
const MUTE="try{soundOn=false;if(typeof AC!=='undefined'&&AC)AC.suspend();}catch(e){}";
const shot=async(name,clip)=>{await ev(MUTE+'__c1.render();');await sleep(120);
  const r=await send('Page.captureScreenshot',Object.assign({format:'jpeg',quality:85},clip?{clip:Object.assign({scale:1},clip)}:{}));
  const f=OUT+'/'+String(shots.length+1).padStart(2,'0')+'_'+name+'.jpg';fs.writeFileSync(f,Buffer.from(r.result.data,'base64'));shots.push(f);};
/* real input */
const mouse=(type,x,y,button,buttons,mods)=>send('Input.dispatchMouseEvent',{type,x,y,button:button||'none',buttons:buttons||0,clickCount:type==='mouseMoved'?0:1,modifiers:mods||0});
const clickAt=async(x,y,btn,mods)=>{const b=btn||'left',bs=b==='right'?2:1;await mouse('mouseMoved',x,y,'none',0,mods);await mouse('mousePressed',x,y,b,bs,mods);await mouse('mouseReleased',x,y,b,0,mods);};
const rectOf=async expr=>await ev('const r=('+expr+').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};');
const clickEl=async expr=>{const r=await rectOf(expr);await clickAt(r.x+r.w/2,r.y+r.h/2);};
let ART=null;  /* the editor canvas rect + size, refreshed when the editor (re)builds */
const artRect=async()=>{ART=await ev('const p=__vox.getCRP(),r=p.el.art.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,W:p.w,H:p.h};');return ART;};
const pxc=(x,y)=>[ART.x+(x+0.5)*ART.w/ART.W,ART.y+(y+0.5)*ART.h/ART.H];
const paintPath=async(pts,btn)=>{const b=btn||'left',bs=b==='right'?2:1;let [x,y]=pxc(...pts[0]);await mouse('mouseMoved',x,y);await mouse('mousePressed',x,y,b,bs);
  for(const p of pts.slice(1)){[x,y]=pxc(...p);await mouse('mouseMoved',x,y,b,bs);}await mouse('mouseReleased',x,y,b,0);};
const paintAt=async(x,y,btn,mods)=>{const [cx,cy]=pxc(x,y);await clickAt(cx,cy,btn,mods);};
const KEYS={KeyB:['b',66],KeyE:['e',69],KeyG:['g',71],KeyI:['i',73],BracketLeft:['[',219],BracketRight:[']',221],KeyZ:['z',90],KeyY:['y',89],Escape:['Escape',27],
  Digit1:['1',49],Digit2:['2',50],Digit3:['3',51],Digit4:['4',52],Digit5:['5',53],Digit6:['6',54],Digit7:['7',55],Digit8:['8',56],Digit9:['9',57],Digit0:['0',48]};
const key=async(code,mods)=>{const [k,vk]=KEYS[code];await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:k,windowsVirtualKeyCode:vk,modifiers:mods||0});
  await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:k,windowsVirtualKeyCode:vk,modifiers:mods||0});};
const swatch=async i=>clickEl('__vox.getCRP().el.sw['+(i-1)+']');
const tool=async t=>clickEl('__vox.getCRP().el.tools.'+t);
const brush=async s=>clickEl('__vox.getCRP().el.sizes['+(s-1)+']');

/* ---- page-side helpers (re-injected after every load) ---- */
const HELP=`window.__c1={T:0,raf:null,
  freeze(){if(!this.raf){this.raf=window.requestAnimationFrame;window.requestAnimationFrame=()=>0;}this.T=Math.max(this.T,performance.now()+1000);},
  thaw(){if(this.raf){window.requestAnimationFrame=this.raf;this.raf=null;}},
  stp(n){for(let i=0;i<(n||1);i++){this.T+=40;__vox.frameStep(this.T);}},
  render(){this.stp(1);},
  mute(){try{soundOn=false;if(typeof AC!=='undefined'&&AC)AC.suspend();}catch(e){}},
  aim(x,y,z){const P=__vox.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));},
  rc(){__vox.MB.r=true;this.stp(1);__vox.MB.r=false;this.stp(2);},
  tp(x,z,y){const P=__vox.P;P.x=x;P.z=z;if(y!=null)P.y=y;P.vx=P.vy=P.vz=0;P.fallD=0;this.stp(2);},
  give(id,s){const P=__vox.P;s=s||0;if(P.inv[s]){const e=P.inv.findIndex((q,i)=>!q&&i>8);if(e>0)P.inv[e]=P.inv[s];}P.inv[s]={id,count:1};P.sel=s;__vox.refreshHand();},
  select(id){const P=__vox.P;let i=P.inv.findIndex(q=>q&&q.id===id);if(i<0)return false;if(i>8){const t=P.inv[8];P.inv[8]=P.inv[i];P.inv[i]=t;i=8;}P.sel=i;__vox.refreshHand();return true;},
  empty(){const P=__vox.P;let i=P.inv.findIndex((q,k)=>!q&&k<9);if(i<0){const e=P.inv.findIndex((q,k)=>!q&&k>8);i=0;if(e>0)P.inv[e]=P.inv[0];P.inv[0]=null;}P.sel=i;__vox.refreshHand();},
  cells(id){const o=[];for(const [k,b] of __vox.blockEnts)if(b.t==='crpaint'&&b.id===id)o.push(k);return o;},
  drops(id){return __vox.entities.filter(e=>e.t==='drop'&&!e.dead&&e.st.id===id);},
  cnt(id){return __vox.P.inv.reduce((n,s)=>n+(s&&s.id===id?s.count:0),0);},
  room(x0,y,z0,W,D,Hh,roof){const V=__vox,B=V.B;for(let x=x0-1;x<=x0+W;x++)for(let z=z0-1;z<=z0+D;z++){V.setBlock(x,y-1,z,B.STONE);
      for(let dy=0;dy<=Hh;dy++)V.setBlock(x,y+dy,z,(x===x0-1||x===x0+W||z===z0-1||z===z0+D)?(dy===Hh?B.STONE:B.PLANK_O||B.STONE):B.AIR);
      if(roof)V.setBlock(x,y+Hh+1,z,B.STONE);}},
  /* palette-index pictures for the gallery */
  pic(kind,w,h){const a=new Uint8Array(w*h),S=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<w&&y<h)a[y*w+x]=c;},
      R=(x0,y0,x1,y1,c)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)S(x,y,c);},Ci=(cx,cy,r,c)=>{for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r+r*0.6)S(cx+x,cy+y,c);};
    if(kind==='sea'){R(0,0,w-1,h-1,23);R(0,0,w-1,8,10);Ci(w*0.78,h*0.28,7,7);for(let y=h*0.55|0;y<h;y++)R(0,y,w-1,y,y%3?11:12);
      R(30,30,50,33,15);R(32,34,48,35,16);for(let y=12;y<30;y++)R(40-((y-12)>>1),y,40,y,2);R(41,10,41,30,16);
      for(const [bx,by] of [[14,10],[22,14],[96,8]]){S(bx,by,1);S(bx+1,by-1,1);S(bx-1,by-1,1);}
      for(let x=0;x<w;x+=6)S(x+((x/6)%2),h*0.55+2,2);}
    else if(kind==='tower'){R(0,0,w-1,h-1,23);R(0,0,w-1,20,10);for(let y=h-26;y<h;y++)R(0,y,w-1,y,y%2?11:12);
      R(18,h-34,46,h-24,4);R(14,h-28,50,h-26,3);
      for(let y=30;y<h-34;y++){const hw=9+((y-30)*5/(h-64))|0;R(32-hw,y,32+hw,y,((y-30)>>3)%2?2:5);}
      R(22,20,42,29,1);R(25,22,39,27,7);R(20,18,44,19,4);R(27,12,37,17,5);S(32,11,4);
      for(let i=0;i<14;i++){S(44+i,24-i*0.3,22);S(20-i,24-i*0.3,22);}}
    else if(kind==='face'){R(0,0,w-1,h-1,14);Ci(32,34,22,17);R(10,8,54,16,16);R(10,8,14,30,16);R(50,8,54,30,16);
      Ci(24,30,3,2);Ci(40,30,3,2);S(24,30,1);S(25,30,1);S(40,30,1);S(41,30,1);
      for(let x=22;x<=42;x++)S(x,44+Math.round(((x-32)*(x-32))/40),19);R(30,36,33,38,18);S(18,40,5);S(46,40,5);}
    else{R(0,0,w-1,h-1,23);Ci(48,12,7,7);R(0,40,w-1,h-1,8);for(let x=0;x<w;x++)for(let y=36;y<40;y++)if(y>36+Math.sin(x/6)*2)S(x,y,8);
      R(14,30,30,46,15);for(let i=0;i<9;i++)R(13+i,29-i,31-i,29-i,5);R(20,38,24,46,16);R(26,33,28,35,10);}
    return a;},
  make(kind,w,h,title){const V=__vox,n=V.crNew('art',{w,h,d:V.crArtEncode(this.pic(kind,w,h),w,h)});V.crFinish(n,title,'Dan');return V.crItemId(n);},
  hang(id,x,y,z,nx,nz){const V=__vox,P=V.P;let s=P.inv.findIndex(q=>q&&q.id===id);if(s<0){V.crGiveDan({id,count:1});s=P.inv.findIndex(q=>q&&q.id===id);}
    const st=P.inv[s];return V.crPlacePainting(st,{x:x-nx,y,z:z-nz,nx,ny:0,nz});}};`;
const boot=async(fresh)=>{
  for(let i=0;i<240;i++){let v=false;try{v=await ev("return typeof window.__vox==='object'&&document.readyState==='complete'");}catch(e){}if(v)break;await sleep(500);}
  await ev(MUTE+HELP+'__c1.mute();');};
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}"+
  "s.snd=0;s.mus=0;s.tp='og';localStorage.setItem(k,JSON.stringify(s));}catch(e){}"});
const URL0=`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`;
await send('Page.navigate',{url:URL0});await boot(true);
const info=await ev("return {ver:__vox.GAME_VERSION,stubs:__vox.crInfo().stubs,sound:soundOn,hr:typeof __vox.setPack==='function'}");
check('the page loaded v'+gameVersion()+' with C1 real and sound off',info.ver===gameVersion()&&info.stubs.indexOf('1')<0&&info.sound===false,info);
const R=await ev(MUTE+`const V=__vox;V.startNewWorld('c1qa','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;V.GR.dayCycle=false;V.GR.god=true;
  __c1.freeze();__c1.stp(220);const P=V.P,x=Math.floor(P.x),z=Math.floor(P.z),y=Math.max(V.surfaceTop(x,z)+1,Math.floor(P.y));
  __c1.room(x-6,y,z-6,14,14,6,false);P.x=x+0.5;P.z=z+0.5;P.y=y;V.setTime(0.3);__c1.stp(30);
  for(const e of V.entities)if(e.t==='mob'&&!e.dead&&Math.hypot(e.x-P.x,e.z-P.z)<80){e.hurtT=0;V.hurtMob(e,99999,0,0);}
  window.__q={x,y,z};return window.__q;`);
const {x:QX,y:QY,z:QZ}=R;
/* ===== 1. the easel and the size picker ===== */
await ev(MUTE+`const V=__vox,Q=__q;__c1.give(V.B.CR_EASEL,0);__c1.aim(Q.x+2.5,Q.y-0.02,Q.z+0.5);__c1.rc();__c1.empty();__c1.aim(Q.x+2.5,Q.y+0.6,Q.z+0.5);__c1.stp(4);`);
await shot('easel_placed');
await ev(MUTE+'__c1.rc();');
check('right-click on the easel opens the size picker',await ev("return __vox.crOn()==='paint'&&__vox.getCRP().screen==='pick'"));
await shot('A_size_picker');
await clickEl('__vox.getCRP().el.sizes[0]');
check('a real click on Square starts a 64x64 canvas and opens the editor',await ev("const p=__vox.getCRP();return p.screen==='edit'&&p.w===64&&p.h===64"));
await artRect();
check('the canvas is shown at zoom 9 (576 px) and fits the 1280x720 window',ART.w===576&&ART.h===576&&ART.y+ART.h<=720&&ART.x+ART.w<=1280,ART);
const panel=await rectOf("document.getElementById('crpaintwin')");
check('the whole editor panel fits on screen (no scrolling)',panel.x>=0&&panel.y>=0&&panel.x+panel.w<=1280&&panel.y+panel.h<=720&&
  await ev("const w=document.getElementById('crpaintwin');return w.scrollHeight<=w.clientHeight+1&&w.scrollWidth<=w.clientWidth+1;"),panel);
/* ===== 2. paint "Sunny Side" with real input ===== */
await swatch(23);await key('KeyG');await paintAt(10,10);                                       /* sky: fill */
check('fill (key G) floods the empty canvas with sky blue',await ev("return __vox.getCRP().px.every(v=>v===23)"));
await swatch(7);await key('KeyB');await brush(3);                                              /* the sun */
for(let r=0;r<=6;r+=2)await paintPath([[48-Math.round(Math.sqrt(49-r*r)),9+r],[48+Math.round(Math.sqrt(49-r*r)),9+r]]);
for(let r=2;r<=6;r+=2)await paintPath([[48-Math.round(Math.sqrt(49-r*r)),9-r],[48+Math.round(Math.sqrt(49-r*r)),9-r]]);
await swatch(2);for(const [cx,cy] of [[12,10],[17,8],[22,10],[16,12]])await paintAt(cx,cy);  /* a cloud */
await brush(1);await swatch(9);await paintPath([[0,42],[8,39],[16,37],[26,38],[36,41],[46,39],[56,36],[63,35]]);   /* the hill line */
await swatch(8);await tool('fill');await paintAt(5,58);                                        /* the hill */
await swatch(9);await tool('pencil');for(const [a,b] of [[[4,50],[9,48]],[[40,55],[46,53]],[[52,47],[58,45]]])await paintPath([a,b]);
await shot('B_editor_midway');
await swatch(15);await key('BracketRight');await key('BracketRight');                          /* the house: brush 3 */
for(let y=31;y<=47;y+=2)await paintPath([[22,y],[36,y]]);
await key('BracketLeft');await key('BracketLeft');await swatch(5);                             /* the roof */
for(let i=0;i<9;i++)await paintPath([[20+i,29-i],[38-i,29-i]]);
await swatch(16);for(let x=27;x<=30;x++)await paintPath([[x,40],[x,48]]);                      /* the door */
await swatch(10);await brush(2);await paintAt(32,34);await paintAt(24,34);                     /* windows */
await brush(1);await swatch(16);await paintPath([[50,48],[50,41]]);await paintPath([[51,48],[51,41]]);   /* a tree */
await swatch(9);await brush(3);for(const [cx,cy] of [[50,38],[48,36],[53,36],[50,34],[47,39],[54,39]])await paintAt(cx,cy);
/* a mistake, erased with the right button, and an undo */
await brush(1);await swatch(1);await paintPath([[2,2],[12,6]]);
const oops=await ev("return __vox.getCRP().px[2*64+2]");
await paintPath([[2,2],[12,6]],'right');
check('right-drag erases the stray line (to empty)',oops===1&&await ev("return __vox.getCRP().px[2*64+2]===0"));
await key('KeyZ',2);await key('KeyZ',2);
check('Ctrl+Z twice: the erase and the stray line are both undone (sky is back)',await ev("const p=__vox.getCRP().px;return p[2*64+2]===23&&p[6*64+12]===23"));
await key('KeyZ',2|8);await key('KeyY',2);await key('KeyZ',2);await key('KeyZ',2);
check('Ctrl+Shift+Z / Ctrl+Y redo, then undo again: the sky is clean',await ev("const p=__vox.getCRP().px;return p[2*64+2]===23"));
await swatch(4);await paintAt(30,20,'left',1);                                                 /* Alt+click picks the sky */
check('Alt+click picks a colour from the canvas (sky)',await ev("const p=__vox.getCRP();return p.col===23&&p.tool==='pencil'"));
const art=await ev("return Array.from(__vox.getCRP().px)");
check('every stroke was saved: the record decodes to exactly the canvas',await ev("const p=__vox.getCRP(),r=__vox.crRec(p.n);return __vox.crArtDecode(r.d,64,64).every((v,i)=>v===p.px[i])"));
await mouse('mouseMoved',pxc(40,20)[0],pxc(40,20)[1]);
await shot('B_editor_painted');
/* ===== 3. Done, with a typed title ===== */
await clickEl('__vox.getCRP().el.done');
check('Done opens the confirm with a title field',await ev("return document.getElementById('crask').style.display==='flex'&&document.activeElement&&document.activeElement.id==='craskin'"));
await send('Input.insertText',{text:'Sunny Side'});
await shot('C_done_confirm');
await clickEl("document.getElementById('craskok')");
const fin=await ev("const V=__vox,P=V.P,s=P.inv.find(q=>q&&V.crWorkN(q.id)&&V.crRec(V.crWorkN(q.id)).st==='done');return s?{id:s.id,name:V.DEFS[s.id].name,n:V.crWorkN(s.id),on:V.crOn()}:null;");
check('Finish: one painting "Sunny Side" in the inventory, the editor closed',!!fin&&fin.name==='Painting: Sunny Side'&&fin.on==='',fin);
const PID=fin?fin.id:0;
check('the finished painting holds exactly the pixels painted',await ev("const V=__vox,r=V.crRec("+(fin?fin.n:0)+");const a="+JSON.stringify(art)+";return !!r&&V.crArtDecode(r.d,64,64).every((v,i)=>v===a[i])"));
await ev(MUTE+"__c1.select("+PID+");__c1.aim(__q.x+3,__q.y+1.4,__q.z+0.5);__c1.stp(3);");
await shot('D_holding_painting');
/* ===== 4. hang, break, pick up, re-hang ===== */
await ev(MUTE+`const Q=__q;__c1.tp(Q.x+4.5,Q.z+0.5,Q.y);__c1.select(${PID});__c1.aim(Q.x+8.01,Q.y+1.5,Q.z+0.5);__c1.rc();__c1.stp(14);
  __c1.tp(Q.x+0.5,Q.z+0.5,Q.y);__c1.aim(Q.x+8,Q.y+2,Q.z+1);__c1.stp(14);`);
check('hung on the east wall: 2x2 cells, the item used up',await ev("return __c1.cells("+PID+").length===4&&__c1.cnt("+PID+")===0"));
await shot('E_hung_og');
await ev(MUTE+`const Q=__q,c=__c1.cells(${PID})[0].split(',').map(Number);__c1.tp(Q.x+5.5,Q.z+0.5,Q.y);__c1.empty();__c1.aim(c[0]+0.5,c[1]+0.5,c[2]+0.5);
  __vox.MB.l=true;__c1.stp(18);__vox.MB.l=false;__c1.stp(4);`);
check('broken by hand: the whole painting comes down as ONE drop of the same painting',await ev("return __c1.cells("+PID+").length===0&&__c1.drops("+PID+").length===1"));
await ev(MUTE+`const e=__c1.drops(${PID})[0];__c1.tp(e.x,e.z,Math.floor(e.y));__c1.stp(25);__c1.tp(__q.x+0.5,__q.z+0.5,__q.y);`);
check('picked up again: same id, count 1',await ev("return __c1.cnt("+PID+")===1"));
await ev(MUTE+`const Q=__q;__c1.tp(Q.x+0.5,Q.z-3.5,Q.y);__c1.select(${PID});__c1.aim(Q.x+0.5,Q.y+1.5,Q.z-6.01);__c1.rc();__c1.stp(14);
  __c1.tp(Q.x+0.5,Q.z+1.5,Q.y);__c1.aim(Q.x+0.5,Q.y+2,Q.z-6);__c1.stp(14);`);
check('re-hung on the north wall with the same pixels',await ev("const V=__vox,r=V.crRec(V.crWorkN("+PID+"));const a="+JSON.stringify(art)+";return __c1.cells("+PID+").length===4&&V.crArtDecode(r.d,64,64).every((v,i)=>v===a[i])"));
await shot('F_rehung_og');
/* ===== 5. save, reload the page, load the world ===== */
const saved=await ev("__c1.thaw();return await saveToStorage('c1qa',true);");
check('the world saves to storage',saved===true);
await send('Page.reload',{ignoreCache:true});await sleep(800);await boot(false);
await ev(MUTE+"window.__q={x:"+QX+",y:"+QY+",z:"+QZ+"};await loadWorldByName('c1qa');__c1.freeze();__c1.stp(60);__c1.mute();");
{const st=await ev(MUTE+"const V=__vox,r=V.crRec(V.crWorkN("+PID+"));const a="+JSON.stringify(art)+";return {cells:__c1.cells("+PID+").length,rec:!!r,t:r&&r.t,"+
  "same:!!r&&V.crArtDecode(r.d,64,64).every((v,i)=>v===a[i]),meshes:V.getCRPM().size,playing:typeof playing!=='undefined'&&playing,works:V.crInfo().works,P:[V.P.x|0,V.P.y|0,V.P.z|0]};");
  check('after a page reload the loaded world has the painting hung, the same pixels, and its mesh',st.cells===4&&st.rec&&st.same&&st.meshes===1,st);}
await ev(MUTE+"const Q=__q;__c1.tp(Q.x+0.5,Q.z+1.5,Q.y);__c1.aim(Q.x+0.5,Q.y+2,Q.z-6);__c1.stp(10);");
await shot('G_after_reload');
/* ===== 6. the gallery: three sizes on all four walls ===== */
const G=await ev(MUTE+`const V=__vox,Q=__q,y=Q.y,x0=Q.x-6,z0=Q.z-6,W=14,res=[];
  const c=__c1.cells(${PID});if(c.length){const p=c[0].split(',').map(Number);__c1.empty();V.crRemovePainting(V.blockEnts.get(c[0]),false);V.crGiveDan({id:${PID},count:1});}
  const walls=[[0,'east',x0+W-1,null,-1,0],[1,'west',x0,null,1,0],[2,'north',null,z0,0,1],[3,'south',null,z0+W-1,0,-1]];
  const kinds=[['land','sea','tower'],['face','sea','tower'],['land','sea','tower'],['face','sea','tower']];
  for(const [wi,name,wx,wz,nx,nz] of walls){const R=[nz,-nx];const ks=kinds[wi];
    /* along the wall (viewer's right): square at 2..3, wide at 5..8, tall at 10..11 (wall is 14 long); a painting is centred on (W-1)>>1 */
    const slots=[[ks[0],64,64,2,y+2],[ks[1],128,64,6,y+2],[ks[2],64,128,10,y+2]];
    for(const [k,w,h,off,yy] of slots){const id=(k==='land'&&wi===0)?${PID}:__c1.make(k,w,h,name+' '+k);
      const along=R[0]!==0?R[0]:R[1],base=R[0]!==0?(R[0]>0?x0:x0+W-1):(R[1]>0?z0:z0+W-1);const t=base+along*off;
      const px=wx!==null?wx:t,pz=wz!==null?wz:t;res.push([name,k,w,h,!!__c1.hang(id,px,yy,pz,nx,nz)&&__c1.cells(id).length===(w*h)/1024]);}}
  for(const [tx,tz] of [[x0+1,z0+1],[x0+W-2,z0+1],[x0+1,z0+W-2],[x0+W-2,z0+W-2],[x0+7,z0+1],[x0+7,z0+W-2],[x0+1,z0+7],[x0+W-2,z0+7]])V.setBlock(tx,y,tz,V.B.TORCH);
  __c1.empty();__c1.tp(x0+7,z0+7,y);__c1.stp(30);return {res,cells:[...V.blockEnts.values()].filter(b=>b.t==='crpaint').length,meshes:V.getCRPM().size};`);
check('the gallery: 12 paintings (3 sizes x 4 walls) hung, '+G.cells+' cells, '+G.meshes+' meshes',G.res.length===12&&G.res.every(r=>r[4])&&G.cells===4*(4+8+8)&&G.meshes===12,G.res.filter(r=>!r[4]));
const views=[['east',1,0],['west',-1,0],['north',0,-1],['south',0,1]];
const gallery=async tag=>{for(const [nm,dx,dz] of views){await ev(MUTE+`const Q=__q,x0=Q.x-6,z0=Q.z-6;__c1.tp(x0+7-(${dx})*1.0,z0+7-(${dz})*1.0,Q.y);__c1.aim(x0+7+(${dx})*7,Q.y+2.6,z0+7+(${dz})*7);__c1.stp(6);`);
  await shot(tag+'_'+nm);}};
await ev("__vox.setTime(0.3);__c1.stp(10);");await gallery('og_day');
await ev("__vox.setTime(0.8);__c1.stp(10);");await gallery('og_night');
/* the easel with a canvas on it */
const ez=await ev(MUTE+`const V=__vox,Q=__q,x0=Q.x-6,z0=Q.z-6;V.setTime(0.3);const ex=x0+4,ezz=z0+9;__c1.tp(x0+4.5,z0+6.5,Q.y);__c1.give(V.B.CR_EASEL,0);
  __c1.aim(ex+0.5,Q.y-0.02,ezz+0.5);__c1.rc();__c1.empty();__c1.aim(ex+0.5,Q.y+0.6,ezz+0.5);__c1.rc();
  const p=V.getCRP();if(p.screen==='pick'){p.el.sizes[1].onclick();}const n=V.getCRP().n;V.crSetData(n,V.crArtEncode(__c1.pic('sea',128,64),128,64));
  V.crKey({code:'Escape',target:null});__c1.stp(20);__c1.tp(x0+5.6,z0+7.0,Q.y);__c1.aim(ex+0.5,Q.y+0.6,ezz+0.5);__c1.stp(20);
  return {n,mesh:V.getCRPM().has(ex+','+Q.y+','+ezz),f:V.blockEnts.get(ex+','+Q.y+','+ezz).f};`);
check('an easel holding a wide canvas shows it (its own mesh on the board)',ez.mesh,ez);
await shot('og_easel_canvas');
if(DO_HR&&info.hr){
  await ev("__c1.thaw();await __vox.setPack('hr');");
  for(let i=0;i<120;i++){if(await ev("const t=__vox.getTP();return !t.busy&&t.hr;"))break;await sleep(500);}
  await ev(MUTE+"__c1.freeze();__c1.stp(20);");
  check('Hyperreal is on and the painting materials are adopted (matte Standard + sharp bilinear, linear mipmaps, no shadow cast: fix lead)',await ev("const V=__vox;let ok=V.getTP().hr;for(const e of V.getCRPM().values())ok=ok&&e.mat.type===\"MeshStandardMaterial\"&&e.mat.userData.hrLin===1&&e.tex.magFilter===THREE.LinearFilter&&e.tex.minFilter===THREE.LinearMipmapLinearFilter&&e.m.castShadow===false&&e.mat.color.r===1;return ok;"));
  await shot('hr_easel_canvas');
  await ev("__vox.setTime(0.3);__c1.stp(10);");await gallery('hr_day');
  await ev("__vox.setTime(0.8);__c1.stp(10);");await gallery('hr_night');
  await ev("__c1.thaw();await __vox.setPack('og');");await sleep(500);await ev(MUTE+"__c1.freeze();__c1.stp(5);");
  check('back to OG: shades restored',await ev("let ok=true;for(const e of __vox.getCRPM().values())ok=ok&&!(e.mat.userData&&e.mat.userData.hrLin)&&(e.mat.color.r===0.8||e.mat.color.r===0.65);return ok;"));}
else skipped.push('Hyperreal shots');
/* hotbar icons: a finished painting, a wide one and the canvas still on the easel (as an Unfinished Canvas) */
await ev(MUTE+`const V=__vox;V.setTime(0.3);const P=V.P;const wip=Object.keys(V.getCR().CRW).map(k=>V.crItemId(+k)).filter(i=>V.crRec(V.crWorkN(i)).st==='wip');
  const ids=[__c1.make('land',64,64,'Icon Land'),__c1.make('face',64,64,'Icon Face'),__c1.make('sea',128,64,'Icon Sea'),__c1.make('tower',64,128,'Icon Tower'),...wip];
  for(let i=0;i<9;i++)P.inv[i]=null;ids.slice(0,9).forEach((id,i)=>{P.inv[i]={id,count:1};});P.sel=0;__vox.refreshHand();__c1.stp(4);`);
await ev("try{redrawHotbar();}catch(e){}");
await shot('H_hotbar_icons',{x:340,y:600,width:600,height:120});
await ev("__c1.thaw();try{const k='vx_vox_settings';const s=JSON.parse(localStorage.getItem(k)||'{}');s.tp='og';s.snd=0;localStorage.setItem(k,JSON.stringify(s));}catch(e){}");
const errs=logs.filter(l=>/^(error|exception)/.test(l));
check('no console errors or exceptions',errs.length===0,errs.slice(0,5));
/* contact sheet (5 x 6, PIL) */
try{execFileSync('python3',['-c',`
import sys,glob
from PIL import Image,ImageDraw
fs=sorted(glob.glob(sys.argv[1]+'/[0-9][0-9]_*.jpg'))[:30]
W,H=384,216;S=Image.new('RGB',(5*W,6*(H+18)),(24,24,24));d=ImageDraw.Draw(S)
for i,f in enumerate(fs):
  im=Image.open(f).convert('RGB');im.thumbnail((W,H));x=(i%5)*W;y=(i//5)*(H+18);S.paste(im,(x,y+18));d.text((x+4,y+3),f.split('/')[-1][:-4],fill=(255,230,150))
S.save(sys.argv[1]+'/sheet.jpg',quality=88)`,OUT]);}catch(e){console.log('sheet failed',String(e).slice(0,200));}
fs.writeFileSync(OUT+'/summary.json',JSON.stringify({build:BUILD,info,checks,skipped,shots:shots.map(f=>path.relative(ROOT,f)),logs:logs.slice(-40)},null,1));
console.log(JSON.stringify({out:path.relative(ROOT,OUT),pass:checks.filter(c=>c[1]).length,fail:checks.filter(c=>!c[1]).length,skipped,errors:errs.slice(0,8)},null,1));
ws.close();process.exit(checks.every(c=>c[1])?0:1);
