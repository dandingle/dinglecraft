// crea_qa.mjs (lead): the MUTED headless-Chrome QA rig for the Creativity Update (CREATIVITY_PLAN.md section 10).
// It never turns sound on: Chrome runs with --mute-audio (you start it, see below), every new document gets vx_vox_settings merged
// with snd:0 and tp:'og' BEFORE the game loads, and after load the rig sets soundOn=false and suspends AC; music is verified offline
// in node (c2_audio.js), never by ear.
//
// 1) your own static server and Chrome (ports per package: lead 9371/9471, C1 9372/9472, C2 9373/9473, reviewers 9375-9376 ...):
//    node scripts/serve.mjs --port 9471      (repo root, background)
//    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir=<scratch>/chrome_<you>
//      --remote-debugging-port=9371 --mute-audio --no-first-run --no-default-browser-check --disable-background-timer-throttling
//      --disable-renderer-backgrounding --window-size=1280,720 --enable-gpu --use-angle=metal --ignore-gpu-blocklist about:blank
// 2) node tools/qa/creativity/crea_qa.mjs --port 9371 [--build dist/dinglecraft_v<VER>.html] [--out dir] [--scene all|paint|music|hang]
//    -> screenshots + summary.json in --out (default out/qa/<scene>_<time>/), console errors listed, exit 1 on any.
// Steps that need a package still on its stub (V.crInfo().stubs) are skipped and reported as skipped.
// Kill your Chrome and server when you are done.
import fs from 'fs';import {defaultBuild,gameVersion} from '../lib/paths.mjs';import path from 'path';import {fileURLToPath} from 'url';
const A=Object.fromEntries(process.argv.slice(2).reduce((m,a,i,arr)=>{if(a.startsWith('--'))m.push([a.slice(2),arr[i+1]&&!arr[i+1].startsWith('--')?arr[i+1]:'1']);return m;},[]));
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..')+'/';
const PORT=+(A.port||9371),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild(),SCENE=A.scene||'all';
const OUT=path.resolve(A.out||ROOT+'out/qa/'+SCENE+'_'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19));
fs.mkdirSync(OUT,{recursive:true});
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
let pg=list.find(t=>t.type==='page');if(!pg)pg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(pg.webSocketDebuggerUrl);let id=0;const pend=new Map(),logs=[];
ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
  else if(m.method==='Runtime.consoleAPICalled'){const t=m.params.type;if(t==='error'||t==='warning')logs.push(t+': '+m.params.args.map(x=>x.value!==undefined?x.value:(x.description||'')).join(' ').slice(0,300));}
  else if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;logs.push('exception: '+((d.exception&&d.exception.description)||d.text).slice(0,400));}};
await new Promise(r=>ws.onopen=r);
const send=(method,params)=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params:params||{}}));});
const ev=async(code,awaitP=true)=>{const r=await send('Runtime.evaluate',{expression:'(async()=>{'+code+'\n})()',awaitPromise:awaitP,returnByValue:true});
  if(r.result&&r.result.exceptionDetails){const d=r.result.exceptionDetails;throw new Error(((d.exception&&d.exception.description)||d.text).slice(0,600));}
  return r.result&&r.result.result?r.result.result.value:undefined;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shots=[],skipped=[],checks=[];
const shot=async name=>{await sleep(250);const r=await send('Page.captureScreenshot',{format:'jpeg',quality:82});const f=OUT+'/'+String(shots.length+1).padStart(2,'0')+'_'+name+'.jpg';
  fs.writeFileSync(f,Buffer.from(r.result.data,'base64'));shots.push(path.relative(ROOT,f));};
const check=(name,cond)=>{checks.push([name,!!cond]);if(!cond)console.log('FAIL '+name);};
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
/* muted before the first line of the game runs: merge snd:0 (and the OG pack) into the saved settings */
await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}"+
  "s.snd=0;s.mus=0;s.tp='og';localStorage.setItem(k,JSON.stringify(s));}catch(e){}"});
await send('Page.navigate',{url:`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`});
for(let i=0;i<240;i++){let v=false;try{v=await ev("return typeof window.__vox==='object'&&document.readyState==='complete'");}catch(e){}if(v)break;await sleep(500);}
const MUTE="try{soundOn=false;if(typeof AC!=='undefined'&&AC)AC.suspend();}catch(e){}";
await ev(MUTE);
const info=await ev("return {ver:__vox.GAME_VERSION,crea:typeof __vox.crInfo==='function',stubs:__vox.crInfo?__vox.crInfo().stubs:'',sound:soundOn}");
check('the page loaded v6.2 with PART 56, sound off',info&&info.crea&&info.sound===false);
const stub=d=>info.stubs.indexOf(d)>=0;
/* a world and a studio (same layout as the node suites' boot.studio) */
await ev(MUTE+`const V=__vox;V.startNewWorld('crqa','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;
  {const r=window.requestAnimationFrame;window.requestAnimationFrame=()=>0;try{for(let i=0;i<200;i++)V.frameStep(500000+i*40);}finally{window.requestAnimationFrame=r;}}const P=V.P,B=V.B,x=Math.floor(P.x),z=Math.floor(P.z),y=Math.max(V.surfaceTop(x,z)+1,Math.floor(P.y));
  for(let dx=-2;dx<=6;dx++)for(let dz=-6;dz<=6;dz++){V.setBlock(x+dx,y-1,z+dz,B.STONE);for(let dy=0;dy<=6;dy++)V.setBlock(x+dx,y+dy,z+dz,(dx===6||dx===-2||dz===-6||dz===6)?B.STONE:B.AIR);}
  P.x=x+0.5;P.z=z+0.5;P.y=y;window.__crqa={x,y,z,t:508000};V.setTime(0.3);V.GR.dayCycle=false;`);
/* manual frames freeze requestAnimationFrame (v6.2 CZ): frame() re-arms itself, so every manual frameStep used to start one more perpetual
   rAF loop and the page ran the game many times faster than real time (C1/C2 found it; C2's section still collapses any extra loop) */
const STEP="const V=__vox,Q=window.__crqa,stp=n=>{const r=window.requestAnimationFrame;window.requestAnimationFrame=()=>0;try{for(let i=0;i<n;i++){Q.t+=40;V.frameStep(Q.t);}}finally{window.requestAnimationFrame=r;}};"+
  "const aim=(x,y,z)=>{const P=V.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));};"+
  "const rc=()=>{V.MB.r=true;stp(1);V.MB.r=false;stp(2);};const give=(id,s)=>{V.P.inv[s]={id,count:1};V.P.sel=s;V.refreshHand();};";
const scenes=SCENE==='all'?['paint','hang','music']:[SCENE];
if(scenes.includes('paint')){
  await ev(MUTE+STEP+"give(V.B.CR_EASEL,0);aim(Q.x+2.5,Q.y-0.02,Q.z+0.5);rc();V.P.inv[0]=null;V.refreshHand();aim(Q.x+2.5,Q.y+0.5,Q.z+0.5);stp(5);");
  await shot('easel_placed');
  await ev(MUTE+STEP+"rc();stp(3);");await shot('paint_editor_open');
  check('right-click opens the painting editor',await ev("return __vox.crOn()==='paint'"));
  if(stub('1'))skipped.push('painting editor screens (C1 on its stub)');
  else{ /* ---- C1 section (real clicks on #crpaintwin, Input.dispatchMouseEvent): size picker, strokes, fill, right-click erase,
       undo, Done with a typed title. Leaves the easel EMPTY and a 64x64 painting in the inventory (the hang scene below expects 4 cells).
       The fuller C1 rig (gallery, OG + HR, reload) is qa/c1_paint_qa.mjs. ---- */
    const M=(type,x,y,b,bs,m)=>send('Input.dispatchMouseEvent',{type,x,y,button:b||'none',buttons:bs||0,clickCount:type==='mouseMoved'?0:1,modifiers:m||0});
    const CEN=async e=>await ev('const r=('+e+').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];');
    const CL=async e=>{const [x,y]=await CEN(e);await M('mouseMoved',x,y);await M('mousePressed',x,y,'left',1);await M('mouseReleased',x,y,'left',0);};
    check('C1: an empty easel opens the size picker',await ev("return __vox.getCRP().screen==='pick'&&__vox.getCRP().el.sizes.length===3"));
    await shot('paint_size_picker');
    await CL('__vox.getCRP().el.sizes[0]');
    const AR=await ev("const p=__vox.getCRP(),r=p.el.art.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,W:p.w,H:p.h,n:p.n};");
    const XY=(x,y)=>[AR.x+(x+0.5)*AR.w/AR.W,AR.y+(y+0.5)*AR.h/AR.H];
    const DR=async(pts,b)=>{const bb=b||'left',bs=bb==='right'?2:1;let [x,y]=XY(...pts[0]);await M('mouseMoved',x,y);await M('mousePressed',x,y,bb,bs);
      for(const q of pts.slice(1)){[x,y]=XY(...q);await M('mouseMoved',x,y,bb,bs);}await M('mouseReleased',x,y,bb,0);};
    await CL('__vox.getCRP().el.sw[22]');await CL('__vox.getCRP().el.tools.fill');await DR([[3,3]]);                 /* sky */
    await CL('__vox.getCRP().el.sw[7]');await CL('__vox.getCRP().el.tools.pencil');await DR([[0,46],[20,40],[40,44],[63,38]]);
    await CL('__vox.getCRP().el.tools.fill');await DR([[8,60]]);                                                    /* hill */
    await CL('__vox.getCRP().el.tools.pencil');await CL('__vox.getCRP().el.sizes[2]');await CL('__vox.getCRP().el.sw[6]');
    for(let y=8;y<=16;y+=2)await DR([[44,y],[54,y]]);                                                               /* sun */
    await CL('__vox.getCRP().el.sw[0]');await DR([[4,4],[16,12]]);await DR([[4,4],[16,12]],'right');               /* a slip, erased */
    await CL('__vox.getCRP().el.undo');await CL('__vox.getCRP().el.undo');
    check('C1: real strokes land (sky fill, hill fill, sun), the slip is undone, every step saved',await ev(
      "const p=__vox.getCRP(),r=__vox.crRec(p.n),d=__vox.crArtDecode(r.d,64,64);return p.px[4*64+4]===23&&p.px[12*64+49]===7&&p.px[60*64+8]===8&&d.every((v,i)=>v===p.px[i]);"));
    await shot('paint_editor_c1');
    await CL('__vox.getCRP().el.done');await send('Input.insertText',{text:'QA Hills'});await shot('paint_done_confirm');
    await CL("document.getElementById('craskok')");
    check('C1: Done (typed title) gives ONE painting "QA Hills" and clears the easel',await ev(
      "const V=__vox,id=V.crItemId("+AR.n+");return !V.crOn()&&V.DEFS[id]&&V.DEFS[id].name==='Painting: QA Hills'&&V.P.inv.filter(q=>q&&q.id===id).length===1&&!V.blockEnts.get((__crqa.x+2)+','+__crqa.y+','+__crqa.z).id;"));
  } /* ---- end of the C1 section ---- */
  await ev(STEP+"V.crKey({code:'Escape',target:null});stp(2);");
}
if(scenes.includes('hang')){
  const art=stub('1')?"''":"__vox.crArtEncode(new Uint8Array(64*64).map((_,i)=>1+((i>>4)+(i>>10))%24),64,64)";
  await ev(MUTE+STEP+"aim(Q.x+2.5,Q.y+0.5,Q.z+0.5);rc();const c=V.getCR().CRF.ctx;if(c){V.crStartWork(c,{w:64,h:64,d:"+art+"});V.crEndWork(c,'QA');}V.crKey({code:'Escape',target:null});stp(2);"+
    "V.P.x=Q.x+3.5;V.P.z=Q.z+0.5;const s=V.P.inv.findIndex(q=>q&&V.crWorkN(q.id));if(s>=0){V.P.sel=s<9?s:0;if(s>8){V.P.inv[0]=V.P.inv[s];V.P.inv[s]=null;}}V.refreshHand();"+
    "aim(Q.x+6.01,Q.y+1.5,Q.z+0.5);rc();V.P.x=Q.x+0.5;V.P.z=Q.z+0.5;aim(Q.x+6,Q.y+2,Q.z+1);stp(10);");
  check('a finished painting hangs on the wall (4 cells)',await ev("let n=0;for(const b of __vox.blockEnts.values())if(b.t==='crpaint')n++;return n===4;"));
  await shot('painting_hung_og');
  const hr=await ev("return typeof __vox.setPack==='function'&&typeof __vox.getTP==='function'");
  if(hr){await ev("await __vox.setPack('hr');");for(let i=0;i<40;i++){if(await ev("const t=__vox.getTP();return !t.busy&&t.hr;"))break;await sleep(500);}
    await ev(MUTE+STEP+"stp(10);");await shot('painting_hung_hr');await ev("await __vox.setPack('og');");await ev(MUTE+STEP+"stp(5);");}
  else skipped.push('Hyperreal shot (no setPack)');
}
if(scenes.includes('music')){
  await ev(MUTE+STEP+"give(V.B.CR_DECK,1);aim(Q.x+2.5,Q.y-0.02,Q.z+2.5);rc();give(V.B.CR_JUKE,2);aim(Q.x+2.5,Q.y-0.02,Q.z-2.5);rc();"+
    "V.P.inv[1]=null;V.P.inv[2]=null;V.refreshHand();aim(Q.x+2.5,Q.y+0.5,Q.z+2.5);rc();stp(3);");
  await shot('music_editor_open');check('right-click opens the music editor',await ev("return __vox.crOn()==='music'"));
  if(stub('2'))skipped.push('music editor screens (C2 on its stub)');
  else{ /* ---- C2 section (real input on #crmusicwin: Input.dispatchMouseEvent / dispatchKeyEvent / insertText): notes on the grid,
       the drum track, an instrument from the list, the tempo slider, Space plays (MUTED: soundOn is false, so the playhead runs
       silently on the game clock), Space stops, Done with a typed title. The full rig is qa/c2_qa.mjs. ---- */
    /* every manual frameStep above started one more requestAnimationFrame loop (frame() re-arms itself), so the page now runs the game
       many times faster than real time; collapse them to one pending frame so the silent playhead below moves at its real speed */
    await ev("if(!window.__c2raf){window.__c2raf=1;const r0=window.requestAnimationFrame.bind(window);let pend=false;window.requestAnimationFrame=cb=>{if(pend)return 0;pend=true;return r0(t=>{pend=false;cb(t);});};}");
    await sleep(300);
    const U='__vox.crMusInfo().CRMU',mm=(type,x,y,b,bs)=>send('Input.dispatchMouseEvent',{type,x,y,button:b||'none',buttons:bs||0,clickCount:type==='mouseMoved'?0:1});
    const tapXY=async(x,y)=>{await mm('mouseMoved',x,y);await mm('mousePressed',x,y,'left',1);await mm('mouseReleased',x,y,'left',0);await sleep(40);};
    const tapCell=async(s,r)=>{const c=await ev('return __vox.crMusCellXY('+s+','+r+');');await tapXY(c.x,c.y);};
    const tapEl=async ex=>{const b=await ev('const e='+ex+';const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,l:r.left,w:r.width};');await tapXY(b.x,b.y);return b;};
    const kb=async(code,k,vk)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:k,windowsVirtualKeyCode:vk});await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:k,windowsVirtualKeyCode:vk});await sleep(60);};
    for(const [s,r] of [[0,0],[4,2],[8,4],[12,7],[16,5],[20,4],[24,2],[28,0]])await tapCell(s,r);
    await tapEl(U+'.el.tr[1].row');for(let s=0;s<32;s+=4)await tapCell(s,s%8===0?0:1);
    await tapEl(U+'.el.tr[0].inst');await shot('music_instrument_list');await tapEl(U+'.el.tr[0].pick[2]');
    {const b=await ev('const r='+U+'.el.tempo.getBoundingClientRect();return {l:r.left,w:r.width,y:r.top+r.height/2};');await tapXY(b.l+b.w*0.8,b.y);}
    const m1=await ev('const m='+U+'.m;return {notes:__vox.crSongCount(m),inst:m.tr[0].i,bpm:m.bpm,saved:!!__vox.crCtxRec('+U+'.ctx)}');
    check('music editor: 16 notes clicked in, the first track switched to Lead Synth, the tempo moved, all saved as a Demo Tape',m1.notes===16&&m1.inst==='lead'&&m1.bpm!==120&&m1.saved)
    await ev(MUTE);await kb('Space',' ',32);await sleep(200);const q0=await ev('return '+U+'.lastSt');await sleep(700);
    const q1=await ev('return {st:'+U+'.lastSt,msg:'+U+'.msg,snd:soundOn}');await shot('music_editor_playing_muted');
    check('Space plays with Sound off: "Sound is off (Settings)" and the playhead moves silently',q1.st!==q0&&q1.msg==='Sound is off (Settings)'&&q1.snd===false);
    await kb('Space',' ',32);await tapEl(U+'.el.done');await sleep(120);await send('Input.insertText',{text:'QA Tune'});await tapEl("document.getElementById('craskok')");await sleep(120);
    check('Done with a typed title presses "Music Disc: QA Tune"',await ev("return __vox.P.inv.some(q=>q&&__vox.DEFS[q.id]&&__vox.DEFS[q.id].name==='Music Disc: QA Tune')&&__vox.crOn()===''"));
  }
  await ev(STEP+"V.crKey({code:'Escape',target:null});stp(2);");
  await ev(MUTE+STEP+"aim(Q.x+2.5,Q.y+0.5,Q.z+2.5);rc();const c=V.getCR().CRF.ctx;if(c){V.crStartWork(c,{d:V.crSongBlank?V.crSongBlank():{v:1}});V.crEndWork(c,'QA Song');}"+
    "V.crKey({code:'Escape',target:null});stp(2);const s=V.P.inv.findIndex(q=>q&&V.crWorkN(q.id)&&V.crRec(V.crWorkN(q.id)).k==='song');if(s>=0){V.P.sel=s<9?s:0;if(s>8){V.P.inv[0]=V.P.inv[s];V.P.inv[s]=null;}V.refreshHand();}"+
    "aim(Q.x+2.5,Q.y+0.5,Q.z-2.5);rc();stp(20);"+MUTE);
  check('the disc plays in the jukebox (and the page is still silent)',await ev("const b=__vox.blockEnts.get((__crqa.x+2)+','+__crqa.y+','+(__crqa.z-3));return !!(b&&b.id)&&soundOn===false;"));
  await shot('jukebox_playing');
}
await ev("try{const k='vx_vox_settings';const s=JSON.parse(localStorage.getItem(k)||'{}');s.tp='og';s.snd=0;localStorage.setItem(k,JSON.stringify(s));}catch(e){}");
const errs=logs.filter(l=>/^(error|exception)/.test(l));
check('no console errors or exceptions',errs.length===0);
const summary={build:BUILD,scene:SCENE,info,checks,skipped,shots,logs:logs.slice(-40)};
fs.writeFileSync(OUT+'/summary.json',JSON.stringify(summary,null,1));
console.log(JSON.stringify({out:path.relative(ROOT,OUT),pass:checks.filter(c=>c[1]).length,fail:checks.filter(c=>!c[1]).length,skipped,errors:errs.slice(0,8)},null,1));
ws.close();process.exit(checks.every(c=>c[1])?0:1);
