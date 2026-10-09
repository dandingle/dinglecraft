// c2_qa.mjs (C2): the MUTED headless-Chrome QA rig for the record player, the music editor and the jukebox (CREATIVITY_PLAN.md
// sections 8.2 and 10). Real input only inside the editor: Input.dispatchMouseEvent clicks and drags on the grid canvas and the buttons,
// Input.dispatchKeyEvent for Space / Escape / Ctrl+Z, Input.insertText for the disc title. It never turns sound on: Chrome runs with
// --mute-audio (you start it), every new document gets vx_vox_settings merged with snd:0 / mus:0 / tp:'og' BEFORE the game loads, and
// after load and around every step the rig sets soundOn=false and suspends AC. With sound off the editor's playhead runs silently on
// the game clock, which is exactly what this rig checks; the audio itself is verified offline in node (test/c2_audio.js).
//
//   node scripts/serve.mjs --port 9473           (repo root, background)
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir=<scratch>/chrome_C2
//     --remote-debugging-port=9373 --mute-audio --no-first-run --no-default-browser-check --disable-background-timer-throttling
//     --disable-renderer-backgrounding --window-size=1280,720 --enable-gpu --use-angle=metal --ignore-gpu-blocklist about:blank
//   node tools/qa/creativity/c2_qa.mjs --port 9373 [--build dist/dinglecraft_v<VER>.html] [--out dir]
//   -> numbered JPEGs + summary.json (+ sheet.jpg when python3 has PIL) in --out (default out/qa/c2_<time>/); exit 1 on
//      any failed check or console error. Kill your Chrome and server when done.
import fs from 'fs';import {defaultBuild,gameVersion} from '../lib/paths.mjs';import path from 'path';import {fileURLToPath} from 'url';import {execFileSync} from 'child_process';
const A=Object.fromEntries(process.argv.slice(2).reduce((m,a,i,arr)=>{if(a.startsWith('--'))m.push([a.slice(2),arr[i+1]&&!arr[i+1].startsWith('--')?arr[i+1]:'1']);return m;},[]));
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..')+'/';
const PORT=+(A.port||9373),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild();
const OUT=path.resolve(A.out||ROOT+'out/qa/c2_'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19));
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
  if(r.result&&r.result.exceptionDetails){const d=r.result.exceptionDetails;throw new Error(((d.exception&&d.exception.description)||d.text).slice(0,600));}
  return r.result&&r.result.result?r.result.result.value:undefined;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shots=[],checks=[];
const shot=async name=>{await sleep(200);const r=await send('Page.captureScreenshot',{format:'jpeg',quality:84});const f=OUT+'/'+String(shots.length+1).padStart(2,'0')+'_'+name+'.jpg';
  fs.writeFileSync(f,Buffer.from(r.result.data,'base64'));shots.push(f);};
const check=(name,cond,info)=>{checks.push([name,!!cond,info===undefined?null:info]);console.log((cond?'ok   ':'FAIL ')+name+(info!==undefined?' '+JSON.stringify(info):''));};
/* real input */
const mouse=async(type,x,y,button='left',buttons=1)=>send('Input.dispatchMouseEvent',{type,x,y,button,buttons:type==='mouseReleased'?0:buttons,clickCount:1,pointerType:'mouse'});
const clickAt=async(x,y,button='left')=>{await mouse('mouseMoved',x,y,'none',0);await mouse('mousePressed',x,y,button,button==='right'?2:1);await mouse('mouseReleased',x,y,button,0);await sleep(40);};
const dragAt=async(x0,y0,x1,y1,n=6)=>{await mouse('mouseMoved',x0,y0,'none',0);await mouse('mousePressed',x0,y0,'left',1);
  for(let k=1;k<=n;k++)await mouse('mouseMoved',x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,'left',1);await mouse('mouseReleased',x1,y1,'left',0);await sleep(40);};
const KEYS={Space:[' ',32],Escape:['Escape',27],KeyZ:['z',90],Enter:['Enter',13]};
const key=async(code,mods=0)=>{const [k,vk]=KEYS[code];await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:k,windowsVirtualKeyCode:vk,modifiers:mods});
  await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:k,windowsVirtualKeyCode:vk,modifiers:mods});await sleep(60);};
const cell=async(s,r)=>ev(`return __vox.crMusCellXY(${s},${r});`);
const rect=async expr=>ev(`const e=${expr};if(!e||!e.getBoundingClientRect)return null;const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2,w:b.width,h:b.height,l:b.left,t:b.top,dis:!!e.disabled};`);
const clickEl=async expr=>{const b=await rect(expr);if(!b)throw new Error('no element '+expr);await clickAt(b.x,b.y);return b;};
const UI="__vox.crMusInfo().CRMU";
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}"+
  "s.snd=0;s.mus=0;s.tp='og';localStorage.setItem(k,JSON.stringify(s));}catch(e){}"});
await send('Page.navigate',{url:`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`});
for(let i=0;i<240;i++){let v=false;try{v=await ev("return typeof window.__vox==='object'&&document.readyState==='complete'");}catch(e){}if(v)break;await sleep(500);}
const MUTE="try{soundOn=false;if(typeof AC!=='undefined'&&AC)AC.suspend();}catch(e){}";
await ev(MUTE);
const info=await ev("return {ver:__vox.GAME_VERSION,crea:typeof __vox.crInfo==='function',stubs:__vox.crInfo?__vox.crInfo().stubs:'',sound:soundOn}");
check('the page loaded with PART 56 and C2 real, sound off',info&&info.crea&&info.stubs.indexOf('2')<0&&info.sound===false,info);
/* a world and the studio (as in crea_qa.mjs), frames driven by the page's own requestAnimationFrame from here on */
await ev(MUTE+`const V=__vox;V.startNewWorld('c2qa','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;
  {const r=window.requestAnimationFrame;window.requestAnimationFrame=()=>0;try{for(let i=0;i<200;i++)V.frameStep(500000+i*40);}finally{window.requestAnimationFrame=r;}}const P=V.P,B=V.B,x=Math.floor(P.x),z=Math.floor(P.z),y=Math.max(V.surfaceTop(x,z)+1,Math.floor(P.y));
  for(let dx=-2;dx<=6;dx++)for(let dz=-6;dz<=6;dz++){V.setBlock(x+dx,y-1,z+dz,B.STONE);for(let dy=0;dy<=6;dy++)V.setBlock(x+dx,y+dy,z+dz,(dx===6||dx===-2||dz===-6||dz===6)?B.STONE:B.AIR);}
  P.x=x+0.5;P.z=z+0.5;P.y=y;window.__c2q={x,y,z,t:508000};V.setTime(0.3);V.GR.dayCycle=false;`);
/* manual frames freeze requestAnimationFrame: every frame() call schedules another rAF loop otherwise (the page would then run many
   loops at once, each advancing the game every vsync) */
const STEP="const V=__vox,Q=window.__c2q,stp=n=>{const r=window.requestAnimationFrame;window.requestAnimationFrame=()=>0;try{for(let i=0;i<n;i++){Q.t+=40;V.frameStep(Q.t);}}finally{window.requestAnimationFrame=r;}};"+
  "const aim=(x,y,z)=>{const P=V.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));};"+
  "const rc=()=>{V.MB.r=true;stp(1);V.MB.r=false;stp(2);};const give=(id,s)=>{V.P.inv[s]={id,count:1};V.P.sel=s;V.refreshHand();};";
await ev(MUTE+STEP+"give(V.B.CR_DECK,1);aim(Q.x+2.5,Q.y-0.02,Q.z+2.5);rc();give(V.B.CR_JUKE,2);aim(Q.x+3.5,Q.y-0.02,Q.z-2.5);rc();"+
  "V.P.inv[1]=null;V.P.inv[2]=null;V.P.sel=0;V.refreshHand();aim(Q.x+2.5,Q.y+0.5,Q.z+2.5);stp(5);");
await shot('record_player_and_jukebox');
await ev(MUTE+STEP+"rc();stp(2);");
const op=await ev(`return {on:__vox.crOn(),be:__vox.crBE((__c2q.x+2)+','+__c2q.y+','+(__c2q.z+2)).id,notes:__vox.crSongCount(${UI}.m),tracks:${UI}.m.tr.map(t=>t.i)}`);
check('right-click opens the music editor on a blank song (piano + drums) without making a Demo Tape',op.on==='music'&&op.be===0&&op.notes===0&&op.tracks.join()==='piano,drums',op);
const fit=await ev(`const w=document.getElementById('crmusicwin').getBoundingClientRect(),g=${UI}.el.grid.getBoundingClientRect();return {w:[w.left,w.top,w.right,w.bottom],g:[g.left,g.top,g.right,g.bottom],sh:document.getElementById('crmusicwin').scrollHeight,ch:document.getElementById('crmusicwin').clientHeight};`);
check('at 1280x720 the whole editor is on screen and nothing scrolls',fit.w[0]>=0&&fit.w[1]>=0&&fit.w[2]<=1280&&fit.w[3]<=720&&fit.sh<=fit.ch+1,fit);
await shot('editor_blank');
/* a melody on the piano: taps and one drag (a long note) */
const mel=[[0,0],[2,2],[4,4],[6,7],[8,5],[10,4],[12,2],[14,0],[16,1],[18,3],[20,5],[22,8],[24,7],[26,5],[28,3]];
for(const [s,r] of mel){const c=await cell(s,r);await clickAt(c.x,c.y);}
{const a=await cell(29,4),b=await cell(31,4);await dragAt(a.x,a.y,b.x,b.y);}
let st=await ev(`const t=${UI}.m.tr[0];return {n:t.n.length,last:t.n[t.n.length-1],work:!!__vox.crCtxRec(${UI}.ctx)}`);
check('clicks on the grid put 15 piano notes down and a drag makes a 3-step note; the first note made the Demo Tape',st.n===16&&st.last.join()==='29,4,3'&&st.work,st);
/* the drum kit: select its track, a hat line by dragging, kicks and snares by clicking */
await clickEl(`${UI}.el.tr[1].row`);
{const a=await cell(0,2),b=await cell(31,2);await dragAt(a.x,a.y,b.x,b.y,40);}
for(let s=0;s<32;s+=4){const c=await cell(s,s%8===0?0:1);await clickAt(c.x,c.y);}
{const c=await cell(30,3);await clickAt(c.x,c.y);}
st=await ev(`const t=${UI}.m.tr[1];return {sel:${UI}.sel,hat:t.n.filter(q=>q[1]===2).length,ks:t.n.filter(q=>q[1]<2).length,clap:t.n.filter(q=>q[1]===3).length}`);
check('the Drum Kit: one drag paints 32 hats, clicks add 8 kicks and snares and a clap',st.sel===1&&st.hat===32&&st.ks===8&&st.clap===1,st);
await shot('editor_drums');
/* a bass track: + Track picks the first unused instrument (Bass) */
await clickEl(`${UI}.el.add`);
for(const [s,r] of [[0,0],[6,0],[8,4],[14,4],[16,3],[22,3],[24,4],[28,2]]){const c=await cell(s,r);await clickAt(c.x,c.y);}
st=await ev(`return {tracks:${UI}.m.tr.map(t=>t.i),sel:${UI}.sel,n:${UI}.m.tr[2].n.length}`);
check('+ Track adds a Bass track, selected, and clicks fill it',st.tracks.join()==='piano,drums,bass'&&st.sel===2&&st.n===8,st);
/* tempo: click the slider about 60% along */
{const b=await rect(`${UI}.el.tempo`);await clickAt(b.l+b.w*0.6,b.y);}
st=await ev(`return {bpm:${UI}.m.bpm,label:${UI}.el.bpm.textContent,saved:__vox.crCtxRec(${UI}.ctx).d.bpm}`);
check('a click on the tempo slider changes the tempo, shows it and saves it',st.bpm>130&&st.bpm<170&&st.label===String(st.bpm)&&st.saved===st.bpm,st);
/* the instrument list */
await clickEl(`${UI}.el.tr[2].inst`);await shot('instrument_list');
st=await ev(`return {pick:${UI}.pick,n:(${UI}.el.tr[2].pick||[]).length}`);check('the instrument button opens the list of six',st.pick===2&&st.n===6,st);
await key('Escape');st=await ev(`return {pick:${UI}.pick,on:__vox.crOn()}`);check('Escape closes the list and leaves the editor open',st.pick===-1&&st.on==='music',st);
/* undo with the keyboard */
const n0=await ev(`return __vox.crSongCount(${UI}.m)`);{const c=await cell(30,9);await clickAt(c.x,c.y);}
const n1=await ev(`return __vox.crSongCount(${UI}.m)`);await key('KeyZ',process.platform==='darwin'?4:2);const n2=await ev(`return __vox.crSongCount(${UI}.m)`);
check('Ctrl/Cmd+Z undoes the last note',n1===n0+1&&n2===n0,{n0,n1,n2});
/* play: Space; sound is off, so the playhead runs silently and says so */
await ev(MUTE);await key('Space');await sleep(250);const p0=await ev(`return {on:!!(__vox.crMusInfo().CRM.prev&&__vox.crMusInfo().CRM.prev.on),st:${UI}.lastSt,msg:${UI}.msg,snd:soundOn}`);
await sleep(900);const p1=await ev(`return {st:${UI}.lastSt,snd:soundOn,ac:typeof AC==='undefined'?'none':(AC?AC.state:'null')}`);
check('Space plays: "Sound is off (Settings)", the playhead moves on its own (silently), no AudioContext exists',p0.on&&p0.msg==='Sound is off (Settings)'&&p1.st!==p0.st&&p1.snd===false&&p1.ac==='null',{p0,p1});
await shot('editor_playing_silently');
await key('Space');st=await ev(`return !!__vox.crMusInfo().CRM.prev`);check('Space again stops',st===false);
/* copy bar 1 -> 2 */
await clickEl(`${UI}.el.bar[0]`);await clickEl(`${UI}.el.copy`);
st=await ev(`const m=${UI}.m;return m.tr.every(t=>JSON.stringify(t.n.filter(q=>q[0]<16).map(q=>[q[0],q[1]]))===JSON.stringify(t.n.filter(q=>q[0]>=16&&q[0]<32).map(q=>[q[0]-16,q[1]])))`);
check('Copy bar 1->2 makes bar 2 a copy of bar 1 on every track',st===true);
await shot('editor_after_copy');
/* Done: the real confirm dialog, a typed title */
await clickEl(`${UI}.el.done`);await sleep(150);
st=await ev(`const a=document.getElementById('crask');return {shown:a.style.display,title:document.getElementById('crasktitle').textContent,val:document.getElementById('craskin').value}`);
check('Done asks "Press the disc?" with a title field',st.shown==='flex'&&/Press the disc/.test(st.title)&&st.val==='Untitled Song',st);
await shot('done_dialog');
await send('Input.insertText',{text:'Night Drive'});await clickEl("document.getElementById('craskok')");await sleep(150);
st=await ev(`const P=__vox.P,s=P.inv.find(q=>q&&__vox.crWorkN(q.id));const r=s&&__vox.crRec(__vox.crWorkN(s.id));return {on:__vox.crOn(),name:s&&__vox.DEFS[s.id].name,st:r&&r.st,notes:r&&__vox.crSongCount(__vox.crSongNorm(r.d)),deck:__vox.crBE((__c2q.x+2)+','+__c2q.y+','+(__c2q.z+2)).id}`);
check('typing a title and pressing it gives ONE "Music Disc: Night Drive" and clears the record player',st.on===''&&st.name==='Music Disc: Night Drive'&&st.st==='done'&&st.notes>50&&st.deck===0,st);
/* the jukebox: hold the disc, right-click it */
await ev(MUTE+STEP+"stp(3);const s=V.P.inv.findIndex(q=>q&&V.crWorkN(q.id));if(s>8){V.P.inv[0]=V.P.inv[s];V.P.inv[s]=null;V.P.sel=0;}else V.P.sel=s;V.refreshHand();stp(2);"+
  "aim(Q.x+3.5,Q.y+0.5,Q.z-2.5);stp(4);");
await shot('holding_the_disc');
await ev(MUTE+STEP+"rc();stp(8);"+MUTE);
st=await ev(`const b=__vox.crBE((__c2q.x+3)+','+__c2q.y+','+(__c2q.z-3));return {id:b&&b.id,snd:soundOn,toast:document.getElementById('toast').textContent,voices:__vox.crMusInfo().CRM.voices.size}`);
check('the disc plays in the jukebox (Now playing), and the page is silent: sound off, no voice built',!!st.id&&/Now playing/.test(st.toast)&&st.snd===false&&st.voices===0,st);
st=await ev("const f=[...__vox.crMusInfo().CRM.fx.values()];return {n:f.length,vis:f.map(x=>!!x.sp.parent)}");
check('a playing jukebox shows its floating note (one sprite in the scene)',st.n===1&&st.vis[0]===true,st);
await shot('jukebox_playing');
/* both texture packs */
const hr=await ev("return typeof __vox.setPack==='function'&&typeof __vox.getTP==='function'");
if(hr){await ev("await __vox.setPack('hr');");for(let i=0;i<60;i++){if(await ev("const t=__vox.getTP();return !t.busy&&t.hr;"))break;await sleep(500);}
  await ev(MUTE+STEP+"V.P.sel=1;V.refreshHand();aim(Q.x+3,Q.y+0.6,Q.z);stp(8);");await shot('hyperreal_deck_and_jukebox');
  await ev("await __vox.setPack('og');");await ev(MUTE+STEP+"stp(5);");await shot('og_again');}
/* the Demo Tape and the disc icons in the inventory */
await ev(MUTE+STEP+"const n=V.crNew('song',{d:V.crSongBlank()});V.crGiveDan({id:V.crItemId(n),count:1});aim(Q.x+2.5,Q.y+0.5,Q.z-2.5);rc();stp(2);V.openModal('inv');stp(2);");
await shot('inventory_icons');await ev(STEP+"V.closeModal(true);stp(2);");
await ev("try{const k='vx_vox_settings';const s=JSON.parse(localStorage.getItem(k)||'{}');s.tp='og';s.snd=0;localStorage.setItem(k,JSON.stringify(s));}catch(e){}");
const errs=logs.filter(l=>/^(error|exception)/.test(l));
check('no console errors or exceptions',errs.length===0,errs.slice(0,5));
const fin=await ev("return {snd:soundOn,ac:typeof AC==='undefined'?'none':(AC?AC.state:'null')}");
check('the page never made a sound: soundOn false and no AudioContext to the end',fin.snd===false&&(fin.ac==='null'||fin.ac==='suspended'),fin);
let sheet=null;try{execFileSync('python3',['-c',"import sys\nfrom PIL import Image,ImageDraw\nfs=sys.argv[2:];ims=[Image.open(f).convert('RGB') for f in fs];tw=640;th=360;cols=3;rows=(len(ims)+2)//3\n"+
  "S=Image.new('RGB',(cols*tw,rows*th),(17,17,17));d=ImageDraw.Draw(S)\nfor i,(f,im) in enumerate(zip(fs,ims)):\n x=(i%cols)*tw;y=(i//cols)*th;S.paste(im.resize((tw,th)),(x,y));lab=f.split('/')[-1][:-4];d.rectangle([x,y,x+len(lab)*7+8,y+14],fill=(0,0,0));d.text((x+4,y+1),lab,fill=(255,255,255))\nS.save(sys.argv[1],quality=86)",
  OUT+'/sheet.jpg',...shots]);sheet=path.relative(ROOT,OUT+'/sheet.jpg');}catch(e){}
fs.writeFileSync(OUT+'/summary.json',JSON.stringify({build:BUILD,info,checks,shots:shots.map(f=>path.relative(ROOT,f)),sheet,logs:logs.slice(-40)},null,1));
console.log(JSON.stringify({out:path.relative(ROOT,OUT),pass:checks.filter(c=>c[1]).length,fail:checks.filter(c=>!c[1]).length,sheet,errors:errs.slice(0,8)},null,1));
ws.close();process.exit(checks.every(c=>c[1])?0:1);
