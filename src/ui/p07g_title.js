/* ===================================================================== */
/* PART 7g2 — THE TITLE MENU (Release 1.0)                               */
/* Three views inside #title: the main menu (#tmain), Create New World   */
/* (#tnew) and Saved Worlds (#tload). Keyboard: Tab / Shift+Tab, the     */
/* arrow keys move between buttons, Enter / Space press, Esc goes back.  */
/* The background (#tbgc) is a panorama of a real world (#tpano, six    */
/* pre-rendered faces) turning slowly, in its OWN WebGL renderer: it never */
/* touches the player's world, the game renderer, saves, or anything the */
/* og_trace suite digests. It runs only in a real browser (never under   */
/* the node stubs), frees its GPU memory the moment a world starts,      */
/* always turns (a slow, gentle pan), and without WebGL the CSS sky      */
/* behind it stays.                                                      */
/* ===================================================================== */
const TM={view:'main',booted:false,live:false,disarm:null,ready:false};
function tmEls(){return {main:$('tmain'),new:$('tnew'),load:$('tload'),gr:$('tgr'),name:$('tname')};}
function tmVisible(el){return !!el&&!el.hidden&&(typeof el.getClientRects!=='function'||el.getClientRects().length>0);}
/* the focusable controls of the active view, in order */
function tmItems(){
  const v=tmEls()[TM.view];
  if(!v||typeof v.querySelectorAll!=='function')return [];
  return [...v.querySelectorAll('button,input,select,[tabindex="0"]')].filter(e=>!e.disabled&&e.type!=='hidden'&&tmVisible(e));
}
function tmFocus(el){try{if(el&&el.focus)el.focus();}catch(e){}}
function tmShow(view,focusId){
  const E=tmEls();if(!E[view])view='main';
  const from=TM.view;TM.view=view;
  for(const k in E)if(E[k])E[k].hidden=k!==view;
  const T=$('title');if(T&&T.classList)T.classList.toggle('tsub',view!=='main');
  if(!TM.live)return;
  if(view==='new'){const n=$('t_name');tmFocus(n);try{n.select();}catch(e){}}
  else if(view==='load')tmFocus(tmItems()[0]);
  else if(view==='name')tmFocus($('t_pname'));
  else if(view==='gr')tmFocus(tmItems()[0]);
  else tmFocus($(focusId||(from==='new'?'t_go_new':from==='load'?'t_go_load':'')));
}
/* Survival / Creative: two buttons in front of the (hidden) #t_mode select that startNewWorld reads */
function tmMode(m){
  m=m==='c'?'c':'s';const sel=$('t_mode');if(sel)sel.value=m;
  const ch=$('tr_cheats');if(ch&&!(ch.dataset&&ch.dataset.touched))ch.checked=m==='c';   /* Cheats follow the mode until you touch them */
  for(const k of ['s','c']){const b=$('t_mode_'+k);if(!b)continue;
    if(b.classList)b.classList.toggle('on',k===m);if(b.setAttribute)b.setAttribute('aria-pressed',k===m?'true':'false');}
}
function tmTitleUp(){const T=$('title');return !!T&&T.style.display!=='none'&&!playing;}
function tmKey(e){
  if(!tmTitleUp()||e.defaultPrevented)return;
  const k=e.key,a=document.activeElement;
  if(k==='Escape'){
    if(typeof patchOpen!=='undefined'&&patchOpen){e.preventDefault();closePatch();tmFocus($('t_patch'));return;}
    if(typeof helpOpen!=='undefined'&&helpOpen)return;   /* Help & Controls has no escape (a feature since 2.11) */
    if(TM.view==='name')return;                              /* the first-launch name has to be answered */
    if(TM.view!=='main'){e.preventDefault();tmShow(TM.view==='gr'?'load':'main');}
    return;
  }
  if((typeof helpOpen!=='undefined'&&helpOpen)||(typeof patchOpen!=='undefined'&&patchOpen))return;
  if(k==='Enter'&&a&&(a.id==='t_name'||a.id==='t_seed')){e.preventDefault();const b=$('t_new');if(b)b.click();return;}
  if(k==='Enter'&&a&&a.id==='t_pname'){e.preventDefault();const b=$('t_pname_ok');if(b)b.click();return;}
  if(k==='Enter'&&a&&a.id==='t_bots'){e.preventDefault();a.click();return;}
  const vert=k==='ArrowDown'||k==='ArrowUp',hor=k==='ArrowLeft'||k==='ArrowRight';
  if(!vert&&!hor)return;
  const L=tmItems();if(!L.length)return;
  const i=L.indexOf(a);
  if(i<0){e.preventDefault();tmFocus(L[0]);return;}
  const text=a.tagName==='INPUT'&&a.type!=='checkbox';
  if(hor){
    if(text)return;                                         /* the caret keeps Left/Right */
    const row=a.parentNode;if(!row||!row.classList||!(row.classList.contains('trow')||row.classList.contains('tseg')))return;
    const sib=[...row.children].filter(x=>L.includes(x)),j=sib.indexOf(a)+(k==='ArrowRight'?1:-1);
    if(j>=0&&j<sib.length){e.preventDefault();tmFocus(sib[j]);}
    return;
  }
  e.preventDefault();
  /* Up/Down skip the other buttons of the same row */
  const row=a.parentNode&&a.parentNode.classList&&(a.parentNode.classList.contains('trow')||a.parentNode.classList.contains('tseg'))?a.parentNode:null;
  const d=k==='ArrowDown'?1:-1;let j=i;
  do{j=(j+d+L.length)%L.length;}while(row&&L[j].parentNode===row&&j!==i);
  tmFocus(L[j]);
}
/* ----- per-world game rules (Release 1.0): right-click a saved world ----- */
const TGR={name:null,save:null};
async function tgrOpen(name){
  try{
    const r=await window.storage.get('vxw:'+name);if(!r)throw 0;
    const d=JSON.parse(r.value),g=Object.assign(GR_DEF(),d.gr||{});TGR.name=name;TGR.save=d;
    const w=$('tgr_world');if(w)w.textContent=name;
    const box=$('tgr_list');box.innerHTML='';
    for(const [k,n,desc] of GR_LABELS){if(typeof g[k]!=='boolean')continue;
      const lab=document.createElement('label');lab.className='ttoggle tsm';
      const inp=document.createElement('input');inp.type='checkbox';inp.checked=!!g[k];inp.setAttribute('data-k',k);
      const sp=document.createElement('span');sp.className='tlab';sp.textContent=n;
      const sm=document.createElement('small');sm.textContent=desc;sp.appendChild(sm);
      lab.appendChild(inp);lab.appendChild(sp);box.appendChild(lab);}
    tmShow('gr');
  }catch(e){showToast('Could not read "'+name+'"');}
}
async function tgrSave(){
  if(!TGR.save)return tmShow('load');
  const g=Object.assign(GR_DEF(),TGR.save.gr||{});
  for(const inp of $('tgr_list').querySelectorAll('input[data-k]'))g[inp.getAttribute('data-k')]=!!inp.checked;
  TGR.save.gr=g;
  try{await window.storage.set('vxw:'+TGR.name,JSON.stringify(TGR.save));showToast('Game rules saved for "'+TGR.name+'"');}
  catch(e){showToast('Could not save the game rules');}
  TGR.save=null;tmShow('load');
}
/* deleting a saved world takes two clicks (the X turns into "Delete?" for three seconds) */
function tmWorldClick(e){
  const b=e.target&&e.target.closest?e.target.closest('button.danger'):null;
  if(!b)return;
  if(b.classList.contains('armed'))return;
  e.preventDefault();e.stopPropagation();
  for(const o of $('t_worlds').querySelectorAll('button.armed')){o.classList.remove('armed');o.textContent='X';}
  b.classList.add('armed');b.textContent='Delete?';b.title='Click again to delete this world for good';
  clearTimeout(TM.disarm);TM.disarm=setTimeout(()=>{if(b.classList.contains('armed')){b.classList.remove('armed');b.textContent='X';}},3000);
}
/* "Load World (3)" */
function tmCount(){
  const box=$('t_worlds'),b=$('t_go_load');if(!box||!b||typeof box.querySelectorAll!=='function')return;
  const n=box.querySelectorAll('.wrow').length;b.textContent='Load World'+(n?' ('+n+')':'');
}
function tmBoot(){
  if(TM.booted)return;
  TM.booted=true;TM.live=uiLive();
  const on=(id,f)=>{const b=$(id);if(b)b.onclick=f;};
  on('t_go_new',()=>{tmShow('new');playS('click');});
  on('t_go_load',()=>{tmShow('load');playS('click');});
  on('t_back_new',()=>{tmShow('main');playS('click');});
  on('t_back_load',()=>{tmShow('main');playS('click');});
  on('t_mode_s',()=>{tmMode('s');playS('click');});
  on('t_mode_c',()=>{tmMode('c');playS('click');});
  {const ch=$('tr_cheats');if(ch&&ch.addEventListener)ch.addEventListener('change',()=>{if(ch.dataset)ch.dataset.touched='1';});}
  tmMode(($('t_mode')||{}).value==='c'?'c':'s');
  on('tgr_back',()=>{tmShow('load');playS('click');});
  on('tgr_save',()=>{tgrSave();playS('click');});
  on('t_pname_ok',()=>{const i=$('t_pname');if(pnSet(i&&i.value)){tmShow('main');playS('click');}
    else if(i){if(pnClean(i.value))showToast('Pick another name: 2 or more letters, and not an AI player\u2019s name');i.focus();}});
  tmShow('main');
  if(!TM.live)return;
  /* the saved settings arrive asynchronously (loadSettings, p27). The first-launch name prompt and the menu music wait for
     them, so a returning player is not asked for a name again, and Sound: Off or Music volume 0 never creates an AudioContext. */
  const ready=()=>{TM.ready=true;if(!tmTitleUp())return;
    if(!PNAME_SET&&TM.view==='main')tmShow('name');            /* first launch: ask for a name (any text) before anything else */
    tmusStart();};
  /* right-click a saved world (or the Load World button) to edit its game rules */
  {const gl=$('t_go_load');if(gl&&gl.addEventListener)gl.addEventListener('contextmenu',e=>{e.preventDefault();tmShow('load');});}
  document.addEventListener('keydown',tmKey);
  const W=$('t_worlds');
  if(W){W.addEventListener('click',tmWorldClick,true);try{new MutationObserver(tmCount).observe(W,{childList:true});}catch(e){}
    W.addEventListener('contextmenu',e=>{const row=e.target&&e.target.closest?e.target.closest('.wrow'):null;if(!row)return;e.preventDefault();const sp=row.querySelector('span');if(sp)tgrOpen(sp.textContent);});}
  const T=$('title');let up=tmTitleUp();
  try{new MutationObserver(()=>{const now=tmTitleUp();if(now===up)return;up=now;
    if(now){tmShow('main');tbgStart();tmusStart();}else{try{if(T.contains(document.activeElement))document.activeElement.blur();}catch(e){}tbgStop();tmusStop();}
  }).observe(T,{attributes:true,attributeFilter:['style']});}catch(e){}
  if(up)tbgStart();
  /* browsers only start sound after a click or key press: the first one on the title starts the menu music */
  const kick=()=>{if(TM.ready&&tmTitleUp())tmusStart();};
  document.addEventListener('pointerdown',kick,true);document.addEventListener('keydown',kick,true);
  if(typeof SETTINGS_P!=='undefined'&&SETTINGS_P&&typeof SETTINGS_P.then==='function')SETTINGS_P.then(ready,ready);else ready();
}

/* ===================================================================== */
/* The title background (Release 1.0): a panorama of a real world, turning slowly on the spot like a classic menu. */
/* Six 90-degree faces were rendered once in the OG pack (tools/art/title_pano.mjs) and are inlined by the build */
/* as #tpano. Its own renderer and scene: it never touches the player's world, the game renderer or saves.        */
/* ===================================================================== */
const TBG={on:false,r:null,sc:null,cam:null,cv:null,raf:0,t:0,last:0,res:1,still:false,n:0,acc:0,phase:0,free:[],yaw0:0,pitch:0,spin:150,rs:null};
function tbgPano(){const el=$('tpano');if(!el)return null;try{const P=JSON.parse(el.textContent);return P&&P.faces&&P.faces.length===6?P:null;}catch(e){return null;}}
/* [yaw, pitch] of each captured face, in the game camera's YXZ order: front, right, back, left, up, down */
const TBG_FACES=[[0,0],[-Math.PI/2,0],[Math.PI,0],[Math.PI/2,0],[0,Math.PI/2],[0,-Math.PI/2]];
function tbgBuild(){
  const P=tbgPano();if(!P)throw new Error('no panorama');
  const sc=new THREE.Scene();sc.background=new THREE.Color(0x7fa6d8);
  const geo=new THREE.PlaneGeometry(2,2);TBG.free.push(geo);
  TBG_FACES.forEach(([yaw,pitch],i)=>{
    const img=new Image(),tex=new THREE.Texture(img);
    tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.anisotropy=8;
    tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;TBG.free.push(tex);
    img.onload=()=>{tex.needsUpdate=true;if(TBG.on&&(TBG.still||!TBG.raf))tbgDraw(TBG.t);};
    img.src=P.faces[i];
    const m=new THREE.MeshBasicMaterial({map:tex,depthTest:false,depthWrite:false,fog:false,toneMapped:false});TBG.free.push(m);
    const mesh=new THREE.Mesh(geo,m);mesh.position.set(0,0,-1);
    const g=new THREE.Group();g.rotation.order='YXZ';g.rotation.set(pitch,yaw,0);g.add(mesh);sc.add(g);
  });
  TBG.sc=sc;TBG.cam=new THREE.PerspectiveCamera(70,1,0.05,10);TBG.cam.rotation.order='YXZ';
  TBG.yaw0=+P.yaw0||0;TBG.pitch=+P.pitch||0;TBG.spin=+P.spin||150;
}
function tbgResize(){
  if(!TBG.on)return;
  const pr=Math.min(typeof devicePixelRatio==='number'&&devicePixelRatio>0?devicePixelRatio:1,2)*TBG.res;
  TBG.r.setPixelRatio(pr);TBG.r.setSize(innerWidth,innerHeight,false);
  TBG.cam.aspect=innerWidth/Math.max(1,innerHeight);
  /* tall (portrait) windows widen the view so the world still reads */
  TBG.cam.fov=TBG.cam.aspect<1?Math.min(90,70/Math.max(0.6,TBG.cam.aspect)):70;
  TBG.cam.updateProjectionMatrix();
  if(TBG.still||!TBG.raf)tbgDraw(TBG.t);
}
/* the view starts on the painted house and turns right, one full turn every TBG.spin seconds, with a faint nod */
function tbgDraw(t){
  if(!TBG.on)return;
  const c=TBG.cam;
  c.position.set(0,0,0);
  c.rotation.set(TBG.pitch+Math.sin(t*0.11)*0.025,TBG.yaw0-t*(Math.PI*2/TBG.spin),0);
  TBG.r.render(TBG.sc,c);
}
/* ===================================================================== */
/* The main-menu music (Release 1.0): Dan's own disc, BATEHOVEN IS HALOUS, played by the creativity synth  */
/* (crSongRender) and looped. Title screen only; it fades out the moment a world starts. Music volume.     */
/* ===================================================================== */
const TMUS_SONG={v:1,bpm:129,bars:1,key:0,tr:[{i:'piano',o:0,vol:8,m:0,n:'AQAAUEAQFAOGAIHAKKAKL'},{i:'drums',o:0,vol:8,m:0,n:'AGAAECAGEAGIAEKACLAGM'},{i:'bass',o:0,vol:8,m:0,n:'BiABmEBqIBiM'},{i:'lead',o:0,vol:8,m:0,n:'AYAAWBAUCAQDASGAWHAYIAWJAUKAMLASO'}]};
const TMUS={src:null,g:null,buf:null};
function tmusStart(){
  if(TMUS.src||!soundOn||MUSVOL<=0||typeof crSongRender!=='function'||!tmTitleUp())return;
  const a=audio();if(!a)return;
  try{
    if(!TMUS.buf){const x=crSongRender(TMUS_SONG,a.sampleRate),b=a.createBuffer(1,x.length,a.sampleRate);b.getChannelData(0).set(x);TMUS.buf=b;}
    const src=a.createBufferSource(),g=a.createGain(),t=a.currentTime;
    src.buffer=TMUS.buf;src.loop=true;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.55,t+1.2);
    src.connect(g);g.connect(musDest(a));src.start(t+0.05);TMUS.src=src;TMUS.g=g;
  }catch(e){TMUS.src=null;TMUS.g=null;}
}
function tmusStop(){
  const src=TMUS.src,g=TMUS.g;TMUS.src=null;TMUS.g=null;if(!src)return;
  try{const t=src.context.currentTime;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(0.0001,t+0.6);src.stop(t+0.7);}catch(e){}
}
function tbgLoop(ts){
  if(!TBG.on){TBG.raf=0;return;}
  TBG.raf=requestAnimationFrame(tbgLoop);
  const dt=TBG.last?Math.min(0.1,Math.max(0,(ts-TBG.last)/1000)):1/60;TBG.last=ts;
  /* (Release 1.0: the old slow-machine fallback is gone. Six textured quads cost nothing, and it mistook the page's
     start-up stutter for a slow machine, dropping to half resolution and then a still frame.) */
  TBG.t+=dt;
  tbgDraw(TBG.t);
}
function tbgStart(){
  if(TBG.on||!uiLive()||!tmTitleUp())return;          /* only behind a visible title, never while a world runs */
  const T=$('title');if(!T)return;
  if(typeof THREE==='undefined'||!tbgPano()){T.classList.add('tbg-css');return;}
  /* a fresh canvas every time: a released context cannot be reused */
  const cv=document.createElement('canvas');cv.id='tbgc';cv.setAttribute('aria-hidden','true');
  const old=$('tbgc');if(old)old.replaceWith(cv);else T.insertBefore(cv,T.firstChild);
  let r=null;
  try{r=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'low-power'});}catch(e){r=null;}
  if(!r){cv.remove();T.classList.add('tbg-css');return;}
  TBG.r=r;TBG.cv=cv;TBG.on=true;TBG.free=[];TBG.t=0;TBG.last=0;TBG.n=0;TBG.acc=0;TBG.phase=0;TBG.res=1;TBG.still=false;   /* always turns: a slow, gentle pan */
  try{tbgBuild();}catch(e){tbgStop();T.classList.add('tbg-css');return;}
  T.classList.remove('tbg-css');T.classList.add('tbg-live');
  TBG.rs=()=>tbgResize();addEventListener('resize',TBG.rs);
  tbgResize();
  tbgDraw(0);                                   /* the first frame now (QA drivers freeze requestAnimationFrame) */
  if(!TBG.still)TBG.raf=requestAnimationFrame(tbgLoop);
}
function tbgStop(){
  if(!TBG.on)return;
  TBG.on=false;
  if(TBG.raf)cancelAnimationFrame(TBG.raf);TBG.raf=0;
  if(TBG.rs)removeEventListener('resize',TBG.rs);TBG.rs=null;
  for(const o of TBG.free){try{o.dispose();}catch(e){}}
  TBG.free=[];TBG.sc=null;TBG.cam=null;
  try{TBG.r.dispose();TBG.r.forceContextLoss();}catch(e){}
  TBG.r=null;
  const T=$('title');if(T)T.classList.remove('tbg-live');
}
