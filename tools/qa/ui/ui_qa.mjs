#!/usr/bin/env node
/* ui_qa.mjs: the MUTED browser rig for the Release 1.0 UI (the title menu and the UI scale, src/ui/p06e_ui_scale.js + p07g_title.js).

   node tools/qa/ui/ui_qa.mjs --launch [--port 9399] [--build dist/dinglecraft_v<VER>.html] [--out DIR]
   node tools/qa/ui/ui_qa.mjs --port 9399 [--server 9499] ...            (your own Chrome + server already running)
     --res 1280x720,1920x1080,2560x1440   window sizes (default: those three)
     --scales auto,1,1.25,1.5,2           UI scale settings (default: all five)
     --dpr 1                              device pixel ratio for every size (default 1)
     --phones 1|0                         also the title at 390x844 and 844x390, Auto (default 1)
     --no-sheets                          skip the contact sheets
     --no-behaviour                       skip the title behaviour checks (run once, at the first size)

   For every size x scale it opens and photographs: the title (main menu, Create New World, Saved Worlds), the HUD twice (a
   structure compass, a boss bar, chat, a toast, armor, XP / a player compass, Malgorath's bar, the player list, F3), the
   inventory, crafting table, chest, furnace, creative, settings, pause, the structure compass list, the Dingle Exchange (every
   stock symbol on one line, every cell inside its row), the store, the casino, the death screen, the debug menu, patch notes,
   help, the guide book, the painting editor and the music editor. Every title view and every menu also shows a toast, which must land
   clear of the menu's boxes (src/ui/p06e_ui_scale.js hudLayout). It measures every visible panel and HUD widget (getBoundingClientRect): inside the
   window, no horizontal overflow inside a panel, no two HUD widgets overlapping (F3 and the player list included), the smallest text in CSS px, and every slot
   and hotbar canvas backed at device resolution (crisp icons). 5x6 contact sheets (tools/qa/ui/ui_sheet.py, Pillow) and
   summary.json go to --out (default out/qa/ui_qa_<time>/). Exit 1 on any failed check.
   Once (the first size, <W>x<H>_behaviour/): real key presses (Tab, Shift+Tab, arrows, Enter, Esc) through the title, the hover
   look, What's New on top of the title, prefers-reduced-motion (a still island), no WebGL (the CSS sky, then back), the island's
   build time, and after the game views: quit to the title (the island again, Continue, the world count) and the two-click delete
   (armed, never confirmed).
   MUTED, always (tools/qa/lib/cdp.mjs): --mute-audio, vx_vox_settings {snd:0,mus:0,tp:'og'} before the page runs,
   soundOn=false + AC.suspend() on every evaluation, rAF disabled, the brain on a dead port. At the end the UI scale goes back
   to Auto and tp to 'og' (vx_vox_settings is shared by every page on the origin). Never touches the player's worlds: it plays
   in its own world named uiqa. */
import fs from 'fs';import path from 'path';import {spawn,execFileSync} from 'child_process';
import {args,connect,REPO,defaultBuild,outDir,rel} from '../lib/cdp.mjs';

const A=args(),PORT=+(A.port||9399),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild(),DPR=+(A.dpr||1);
const RES=(A.res||'1280x720,1920x1080,2560x1440').split(',').map(s=>s.split('x').map(Number));
const SCALES=(A.scales||'auto,1,1.25,1.5,2').split(',').map(s=>s==='auto'?'auto':+s);
const PHONES=A.phones!=='0';
const OUT=path.resolve(A.out||outDir('ui_qa'));fs.mkdirSync(OUT,{recursive:true});
if(!fs.existsSync(path.isAbsolute(BUILD)?BUILD:path.join(REPO,BUILD))){console.log(`ui_qa: ${BUILD} not found: run \`npm run build\` first`);process.exit(2);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const kids=[];
const stopKids=()=>{for(const k of kids){try{process.kill(k.pid,'SIGTERM');}catch(e){}}};
process.on('exit',stopKids);process.on('SIGINT',()=>{stopKids();process.exit(130);});
if(A.launch){
  const prof=path.resolve(A.profile||path.join(REPO,'out','qa','chrome_'+PORT));
  const pid=execFileSync(path.join(REPO,'tools','qa','chrome.sh'),[String(PORT),prof],{encoding:'utf8'}).trim();
  kids.push({pid:+pid,name:'chrome'});
  const root=path.isAbsolute(BUILD)?path.dirname(BUILD):REPO;
  const srv=spawn(process.execPath,[path.join(REPO,'scripts','serve.mjs'),'--port',String(SRV),'--root',root],{cwd:REPO,stdio:'ignore'});
  kids.push({pid:srv.pid,name:'server'});
  for(let i=0;i<50;i++){try{const r=await fetch(`http://127.0.0.1:${SRV}/`);if(r)break;}catch(e){}await sleep(100);}
}
const URL_PATH=path.isAbsolute(BUILD)?path.basename(BUILD):BUILD;

const checks=[];let fails=0;
const check=(name,cond,info)=>{checks.push({name,ok:!!cond,info:info===undefined?null:info});if(!cond)fails++;
  if(!cond||A.verbose)console.log((cond?'ok   ':'FAIL ')+name+(info!==undefined?'  '+JSON.stringify(info).slice(0,400):''));};

const C=await connect(PORT);
/* in-page helpers: frame stepping and the measurement of what is on screen */
const HELP=`window.__u={T:700000,stp(n){for(let i=0;i<(n||1);i++){this.T+=40;__vox.frameStep(this.T);}},
 vis(e){if(!e)return false;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||(e.id==='toast'?String(e.style.opacity)!=='1':+cs.opacity===0))return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;},
 toastHits(boxes,out){const t=document.getElementById('toast');if(!this.vis(t))return;const r=this.rect(t);out.items.push({id:'toast',...r});if(!this.inside(r))out.outside.push('toast');
   /* over a menu that fills the window the toast sits on the top edge, over the panel's header strip (the menu never moves) */
   const full=(b)=>t.classList.contains('up')&&b.t<=r.b+40&&b.b>=innerHeight-40&&r.t<=12;
   for(const b of boxes)if(this.hit(r,b)&&!full(b))out.overlap.push('toast/'+b.id);},
 rect(e){const r=e.getBoundingClientRect();return {l:+r.left.toFixed(1),t:+r.top.toFixed(1),r:+r.right.toFixed(1),b:+r.bottom.toFixed(1)};},
 hit(a,b){return a.l<b.r-1&&b.l<a.r-1&&a.t<b.b-1&&b.t<a.b-1;},
 inside(r){return r.l>=-1&&r.t>=-1&&r.r<=innerWidth+1&&r.b<=innerHeight+1;},
 fonts(root){let min=1e9,at='';const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
   while((n=w.nextNode())){if(!n.nodeValue.trim())continue;const e=n.parentElement;if(!e||!this.vis(e))continue;
     const r=e.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)continue;
     const px=parseFloat(getComputedStyle(e).fontSize)*(e.currentCSSZoom||1);if(px<min){min=px;at=(e.id||e.className||e.tagName)+': '+n.nodeValue.trim().slice(0,24);}}
   return {min:+min.toFixed(1),at};},
 canv(root){const bad=[];for(const c of root.querySelectorAll('.slot canvas,.hslot canvas')){if(!this.vis(c))continue;
     const want=Math.round(48*(c.currentCSSZoom||1)*devicePixelRatio);if(Math.abs(c.width-want)>1)bad.push(c.width+'!='+want);}return bad;},
 measure(kind){const out={W:innerWidth,H:innerHeight,ui:{pref:UIS.pref,eff:UIS.eff,hud:UIS.hud,want:UIS.want},items:[],outside:[],overflow:[],overlap:[],font:null,canv:[]};
   const add=(id,e)=>{const r=this.rect(e);out.items.push({id,...r});if(!this.inside(r))out.outside.push(id);};
   if(kind==='title'){const T=document.getElementById('title');
     for(const id of ['thead','tmain','tnew','tload','tfoot']){const e=document.getElementById(id);if(this.vis(e))add(id,e);}
     for(const b of T.querySelectorAll('button,input,.tseg')){if(this.vis(b)&&!this.inside(this.rect(b)))out.outside.push(b.id||b.textContent.trim().slice(0,16));}
     const L=out.items.filter(i=>i.id!=='tfoot'||innerHeight>520);
     for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++)if(this.hit(L[i],L[j]))out.overlap.push(L[i].id+'/'+L[j].id);
     this.toastHits(out.items.slice(),out);
     out.font=this.fonts(T);return out;}
   const boxes=[];
   for(const o of document.querySelectorAll('.ovl')){if(o.id==='title'||!this.vis(o))continue;
     for(const c of o.children)if(c.tagName!=='CANVAS'&&this.vis(c))boxes.push({id:o.id+(c.id?' #'+c.id:' '+c.tagName.toLowerCase()),...this.rect(c)});
     for(const p of o.children){if(!this.vis(p)||!p.classList.contains('panel'))continue;add(o.id+' .panel',p);
       if(p.scrollWidth>p.clientWidth+1)out.overflow.push(o.id+' ('+p.scrollWidth+'>'+p.clientWidth+')');
       out.canv.push(...this.canv(p));const f=this.fonts(p);if(!out.font||f.min<out.font.min)out.font=f;}}
   /* the Dingle Exchange rows: every symbol on one line, every cell inside its row */
   for(const row of document.querySelectorAll('#pclist .prow')){if(!this.vis(row))continue;const rr=this.rect(row),b=row.querySelector('b');
     if(b&&(b.scrollWidth>b.clientWidth+1||b.getBoundingClientRect().height>parseFloat(getComputedStyle(b).lineHeight||'0')*(b.currentCSSZoom||1)*1.6+2))out.overflow.push('symbol '+b.textContent);
     for(const c of row.children){const r=this.rect(c);if(r.r>rr.r+1||r.l<rr.l-1)out.overflow.push('row '+(b?b.textContent:'?')+' cell '+(c.className||c.tagName));}}
   if(kind!=='hud')this.toastHits(boxes,out);
   if(kind==='hud'){const ids=['hotbar','stats','handname','xp','armor','chatbox','cmphud','pcmphud','boss','mgbar','toast','coords','tablist','debug','trick','dis'];
     const L=[];for(const id of ids){const e=document.getElementById(id);if(!this.vis(e))continue;
       if(id==='chatbox'&&!e.querySelector('.cl')&&!this.vis(document.getElementById('aibadge'))&&!this.vis(document.getElementById('chatin')))continue;
       if(id==='handname'&&!e.textContent)continue;const r=this.rect(e);L.push({id,...r});add(id,e);}
     /* every pair, F3 (#debug) and the player list (#tablist) included: hudLayout keeps them clear (widgets it hides are not visible) */
     for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++)if(this.hit(L[i],L[j]))out.overlap.push(L[i].id+'/'+L[j].id);
     out.canv.push(...this.canv(document.getElementById('hotbar')));
     const f=this.fonts(document.getElementById('hud'));const t=this.fonts(document.getElementById('toast'));out.font=t.min<f.min?t:f;}
   return out;}};`;
const SETUP_WORLD=`const V=__vox;V.startNewWorld('uiqa','1337','s');V.GR.mobSpawn=false;V.GR.dayCycle=false;V.GR.snail=false;V.GR.jsc=0;V.GR.god=true;V.GR.freezeMobs=true;V.setTime(0.3);__u.stp(160);
 const P=V.P;P.hp=13;P.hunger=15;P.xp=1234;P.armor[0]={id:armorId(2,0)};P.armor[1]={id:armorId(2,1)};updateArmorHud();
 P.inv[0]={id:V.B.STONE,count:64};P.inv[1]={id:V.IT.IRON,count:7};P.inv[2]={id:V.B.GRASS,count:12};P.inv[3]={id:toolId(2,0),count:1,dur:120};
 P.inv[4]={id:V.IT.COMPASS,count:1};P.inv[5]={id:V.IT.PCOMPASS,count:1};P.inv[9]={id:V.B.CHEST,count:3};P.inv[12]={id:V.IT.DIAMOND,count:40};
 redrawHotbar();drawStats();__u.stp(2);
 for(const k of ['QA rig: a system line','<BunkerBrad> any of you seen my pickaxe? it was right here a minute ago','xx_lilcreepah_xx whispers: shh']){sysMsg(k);}
 const x=Math.floor(P.x),y=Math.floor(P.y)+4,z=Math.floor(P.z);ensureBE(x,y,z,'chest');ensureBE(x+1,y,z,'furnace');
 window.__ux={chest:bkey(x,y,z),furnace:bkey(x+1,y,z),easel:[x+3,y,z],deck:[x+4,y,z]};
 setBlock(x+3,y,z,V.B.CR_EASEL);setBlock(x+4,y,z,V.B.CR_DECK);return true;`;
const closeAll=`try{if(crOn)crUIClose(true);}catch(e){}closeModal(true);if(pcOpen)closePC();if(cmpOpen)closeCmp();if(storeOpen)closeStore();if(casOpen)closeCas();
 document.getElementById('death').style.display='none';if(setOpen)closeSet(true);if(dbgmOpen){dbgmOpen=false;document.getElementById('dbgm').style.display='none';}
 if(patchOpen)closePatch();if(helpOpen)closeHelp();if(pguOn)pguClose(true);if(chatOpen)closeChat();if(paused){paused=false;document.getElementById('pause').style.display='none';}
 tabHeld=false;debugOn=false;document.getElementById('toast').style.opacity=0;document.getElementById('mgbar').style.display='none';MG2HUD.shown=0;
 for(const e of __vox.entities)if(e.t==='mob'&&!e.dead&&e.mt==='boss')removeEnt(e);__vox.P.sel=0;redrawHotbar();__u.stp(2);`;
/* the in-game views: [name, kind, code] */
const VIEWS=[
  ['hud_a','hud',`__vox.P.sel=4;__vox.P.cmpT='village';redrawHotbar();const P=__vox.P;spawnMob('boss',P.x+6,P.y+1,P.z+6);__u.stp(4);
    updateBossBar();showToast('Compass tuned: Alien Village');__u.stp(1);`],
  ['hud_b','hud',`__vox.P.sel=5;redrawHotbar();if(!AGENTS.some(a=>a.online)){GR.bots=true;agJoinAll(false);}__u.stp(6);tabHeld=true;renderTab();debugOn=true;
    const m=document.getElementById('mgbar');m.style.display='block';MG2HUD.shown=1;MG2HUD.key='';mg2HudDraw(MG_K.BAR*0.62,false);__u.stp(1);
    m.style.display='block';mg2HudDraw(MG_K.BAR*0.62,false);`],
  ['chat','hud',`openChat('');document.getElementById('chatin').value='/msg BunkerBrad hello';__u.stp(1);`],
  ['inventory','modal',`openModal('inv');`],
  ['crafting','modal',`openModal('craft');const rb=[...document.querySelectorAll('#mbody button')].find(b=>b.textContent==='Recipes');if(rb)rb.click();`],
  ['chest','modal',`openModal('chest',__ux.chest);`],
  ['furnace','modal',`openModal('furnace',__ux.furnace);`],
  ['creative','modal',`openModal('creative');`],
  ['settings','modal',`paused=true;openSet();`],
  ['pause','modal',`pauseGame();`],
  ['compass_list','modal',`openCmp();`],
  ['exchange','modal',`__vox.P.inv[12]={id:__vox.IT.DIAMOND,count:40};openPC();`],
  ['store','modal',`openStore();`],
  ['casino','modal',`openCas();`],
  ['death','modal',`showDeath();document.getElementById('deathmsg').textContent='Dan was squished by a falling anvil of bureaucracy';`],
  ['debug','modal',`paused=true;openDbgm();`],
  ['patch','modal',`openPatch();`],
  ['help','modal',`openHelp();`],
  ['guide','modal',`pguOpen(0);`],
  ['paint','modal',`const [x,y,z]=__ux.easel;crInteract({x,y,z},{cr:'easel'});if(CRP.screen==='pick')crPxStart(64,64);`],
  ['music','modal',`const [x,y,z]=__ux.deck;crInteract({x,y,z},{cr:'deck'});`],
];
/* the longest everyday toast (hudLayout re-places it every frame while it shows) */
const TOAST=`showToast('Compass tuned: Alien Village');`;
const summary=[];
const shotDir=d=>{fs.mkdirSync(d,{recursive:true});return d;};
const shoot=async(dir,i,name)=>{await sleep(60);return C.shot(path.join(dir,String(i).padStart(2,'0')+'_'+name+'.jpg'));};
const scaleName=s=>s==='auto'?'auto':Math.round(s*100);
const record=(res,sc,name,m)=>{
  const tag=`${res[0]}x${res[1]} ui=${scaleName(sc)} ${name}`;
  summary.push({res,scale:sc,view:name,...m});
  check(`${tag}: everything inside the window`,m.outside.length===0,m.outside);
  check(`${tag}: no horizontal overflow inside a panel`,m.overflow.length===0,m.overflow);
  check(`${tag}: nothing overlaps`,m.overlap.length===0,m.overlap);
  check(`${tag}: icon canvases at device resolution`,m.canv.length===0,m.canv.slice(0,4));
  if(m.font)check(`${tag}: smallest text >= ${MINFONT} px`,m.font.min>=MINFONT,m.font);
};
const MINFONT=+(A.minfont||10.5);

/* real key presses and mouse moves (trusted events: the browser's own focus navigation and button activation run) */
const KEYS={Tab:[9,'Tab'],ArrowDown:[40,'ArrowDown'],ArrowUp:[38,'ArrowUp'],ArrowRight:[39,'ArrowRight'],Enter:[13,'Enter','\r'],Escape:[27,'Escape']};
async function key(k,shift){const [vk,code,text]=KEYS[k];const base={key:k,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,modifiers:shift?8:0};
  await C.send('Input.dispatchKeyEvent',Object.assign({type:text?'keyDown':'rawKeyDown'},base,text?{text,unmodifiedText:text}:{}));
  await C.send('Input.dispatchKeyEvent',Object.assign({type:'keyUp'},base));await sleep(40);}
const focusId=()=>C.ev(`const a=document.activeElement;return a?a.id||a.textContent.trim().slice(0,20):'';`);
/* the title's behaviour, once: keyboard, hover / focus / pressed looks, reduced motion, no WebGL */
async function titleBehaviour(res){
  const dir=shotDir(path.join(OUT,`${res[0]}x${res[1]}_behaviour`));const tag=`${res[0]}x${res[1]} title`;
  await C.ev(`uiSetPref('auto');tmShow('main');if(document.activeElement)document.activeElement.blur();tbgDraw(40);`);
  const L=await C.ev(`return tmItems().map(e=>e.id);`);
  const nav=async(k,want)=>{for(let i=0;i<6;i++){await key(k);if(await focusId()===want)return i+1;}return 0;};
  await key('Tab');const f1=await focusId();
  check(`${tag}: Tab reaches the menu (the game no longer swallows Tab outside gameplay)`,f1===L[0],{f1,L});
  await key('ArrowDown');const f2=await focusId();check(`${tag}: ArrowDown moves to the next button`,f2===L[1],f2);
  check(`${tag}: ArrowDown walks on to Help & Controls`,await nav('ArrowDown','t_help')>0,await focusId());
  await shoot(dir,1,'focus_ring');
  await key('ArrowUp');const f5=await focusId();check(`${tag}: ArrowUp goes back to Load World`,f5==='t_go_load',f5);
  check(`${tag}: ArrowUp reaches Create New World`,await nav('ArrowUp','t_go_new')>0,await focusId());
  await key('Enter');const v1=await C.ev(`return {view:TM.view,f:document.activeElement&&document.activeElement.id};`);
  check(`${tag}: Enter opens Create New World and focuses the name field`,v1.view==='new'&&v1.f==='t_name',v1);
  await shoot(dir,2,'new_by_keyboard');
  await key('Escape');const v2=await C.ev(`return {view:TM.view,f:document.activeElement&&document.activeElement.id};`);
  check(`${tag}: Esc goes back to the main menu, focus on the button that opened the form`,v2.view==='main'&&v2.f==='t_go_new',v2);
  await key('Tab');await key('Tab');await key('Tab',true);const f6=await focusId();check(`${tag}: Shift+Tab goes back`,f6==='t_go_load'||f6==='t_go_new',f6);
  /* hover and pressed */
  const r=await C.ev(`const b=document.getElementById('t_go_load').getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};`);
  await C.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x,y:r.y});await sleep(120);
  const hv=await C.ev(`const b=document.getElementById('t_go_load');return {hover:b.matches(':hover'),bg:getComputedStyle(b).backgroundImage.slice(0,40)};`);
  check(`${tag}: hovering a button changes its look`,hv.hover&&/180, 189, 224|b4bde0/.test(hv.bg),hv);
  await shoot(dir,3,'hover');
  await C.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:5});
  /* Release 1.0: the patch-notes screen is retired; its title button stays hidden */
  check(`${tag}: no What's New button on the title`,await C.ev(`return getComputedStyle(document.getElementById('t_patch')).display==='none';`));
  /* reduced motion: the panorama still turns (a slow, gentle pan; Release 1.0) */
  await C.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const rm=await C.ev(`tbgStop();tbgStart();return {on:TBG.on,still:TBG.still,raf:TBG.raf};`);
  check(`${tag}: prefers-reduced-motion: the panorama keeps turning`,rm.on&&!rm.still,rm);
  await C.send('Emulation.setEmulatedMedia',{features:[]});
  /* no WebGL: the CSS sky */
  const nw=await C.ev(`tbgStop();const W=THREE.WebGLRenderer;THREE.WebGLRenderer=function(){throw new Error('no webgl (rig)');};tbgStart();
    const o={on:TBG.on,css:document.getElementById('title').classList.contains('tbg-css'),canvas:!!document.getElementById('tbgc')};THREE.WebGLRenderer=W;return o;`);
  check(`${tag}: without WebGL the title falls back to the CSS sky`,!nw.on&&nw.css&&!nw.canvas,nw);
  await shoot(dir,5,'no_webgl_fallback');
  const back=await C.ev(`tbgStart();tbgDraw(40);return {on:TBG.on,css:document.getElementById('title').classList.contains('tbg-css')};`);
  check(`${tag}: and the island comes back when WebGL does`,back.on&&!back.css,back);
  const t0=await C.ev(`tbgStop();const a=performance.now();tbgStart();return +(performance.now()-a).toFixed(1);`);
  check(`${tag}: building the island takes < 400 ms (${t0} ms)`,t0<400,t0);
}
async function run(res,scales,{title=true,game=true,behave=false}={}){
  await C.send('Emulation.setDeviceMetricsOverride',{width:res[0],height:res[1],deviceScaleFactor:DPR,mobile:false});
  await C.open(`http://127.0.0.1:${SRV}/${URL_PATH}?b=${Date.now()}`);
  await C.send('Emulation.setDeviceMetricsOverride',{width:res[0],height:res[1],deviceScaleFactor:DPR,mobile:false});
  await C.ev(HELP+`dispatchEvent(new Event('resize'));`);await sleep(150);
  const errs0=C.logs.length;
  if(behave)await titleBehaviour(res);
  if(title)for(const sc of scales){
    const dir=shotDir(path.join(OUT,`${res[0]}x${res[1]}_${scaleName(sc)}`));
    await C.ev(`uiSetPref(${JSON.stringify(sc)});tmShow('main');tbgDraw(40);`+TOAST);
    let m=await C.ev(`return __u.measure('title');`);record(res,sc,'title',m);await shoot(dir,1,'title');
    await C.ev(`tmShow('new');`+TOAST);m=await C.ev(`return __u.measure('title');`);record(res,sc,'title_new',m);await shoot(dir,2,'title_new');
    await C.ev(`tmShow('load');`+TOAST);m=await C.ev(`return __u.measure('title');`);record(res,sc,'title_load',m);await shoot(dir,3,'title_load');
    await C.ev(`tmShow('main');`);
  }
  if(game){
    await C.ev(SETUP_WORLD);
    const live=await C.ev(`return {bg:!!TBG.on,title:document.getElementById('title').style.display};`);
    check(`${res[0]}x${res[1]}: the title background stops when a world starts`,live.bg===false&&live.title==='none',live);
    for(const sc of scales){
      const dir=shotDir(path.join(OUT,`${res[0]}x${res[1]}_${scaleName(sc)}`));
      await C.ev(`uiSetPref(${JSON.stringify(sc)});`+closeAll);
      let i=4;
      for(const [name,kind,code] of VIEWS){
        await C.ev(closeAll+code+(kind==='modal'?TOAST+'__u.stp(1);':''));
        const m=await C.ev(`return __u.measure(${JSON.stringify(kind)});`);
        record(res,sc,name,m);await shoot(dir,i++,name);
      }
      await C.ev(closeAll);
    }
    if(behave){
      const dir=shotDir(path.join(OUT,`${res[0]}x${res[1]}_behaviour`)),tag=`${res[0]}x${res[1]} title`;
      await C.ev(`uiSetPref('auto');await quitToTitle();`);await sleep(300);
      const q=await C.ev(`tbgDraw(60);const c=document.getElementById('t_continue');return {bg:TBG.on,view:TM.view,cont:getComputedStyle(c).display!=='none'?c.textContent:'',load:document.getElementById('t_go_load').textContent};`);
      check(`${tag}: back on the title: the island runs again, main menu, Continue and Load World (no world count)`,q.bg&&q.view==='main'&&/uiqa/.test(q.cont)&&q.load==='Load World',q);
      await shoot(dir,6,'title_continue');
      const x=await C.ev(`tmShow('load');const b=[...document.querySelectorAll('#t_worlds .wrow')].find(r=>/uiqa/.test(r.textContent)).querySelector('button.danger');b.click();
        return {txt:b.textContent,armed:b.classList.contains('armed'),still:[...document.querySelectorAll('#t_worlds .wrow')].some(r=>/uiqa/.test(r.textContent))};`);
      check(`${tag}: deleting a saved world asks first (the X turns into Delete?, nothing deleted)`,x.armed&&x.txt==='Delete?'&&x.still,x);
      await shoot(dir,7,'delete_armed');
      await C.ev(`tmShow('main');`);
    }
  }
  const errs=C.logs.slice(errs0).filter(l=>/^(error|exception)/.test(l));
  check(`${res[0]}x${res[1]}: no console errors`,errs.length===0,errs.slice(0,4));
}

for(let i=0;i<RES.length;i++)await run(RES[i],SCALES,{behave:i===0&&!A['no-behaviour']});
if(PHONES)for(const res of [[390,844],[844,390]])await run(res,['auto'],{game:false});
/* put the origin back the way the player expects it */
await C.ev(`uiSetPref('auto');const k='vx_vox_settings';let s={};try{s=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){}s.tp='og';s.snd=0;s.ui='auto';localStorage.setItem(k,JSON.stringify(s));`);
await C.restoreOG();
C.close();
fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify({build:BUILD,dpr:DPR,checks,views:summary},null,1));
if(!A['no-sheets']){
  try{const o=execFileSync('python3',[path.join(REPO,'tools','qa','ui','ui_sheet.py'),OUT],{encoding:'utf8'});process.stdout.write(o);}
  catch(e){console.log('ui_qa: contact sheets skipped (python3 + Pillow, tools/requirements.txt)');}
}
console.log(`ui_qa: ${checks.length-fails} passed, ${fails} failed  (${rel(OUT)})`);
process.exit(fails?1:0);
