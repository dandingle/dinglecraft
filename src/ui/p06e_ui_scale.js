/* ===================================================================== */
/* PART 6e — UI SCALE (Release 1.0)                                      */
/* Settings -> UI scale: Auto, 100%, 125%, 150%, 200%. Saved in          */
/* vox_settings as `ui` ('auto' or a number); a missing `ui` is Auto.    */
/* The scale is CSS zoom through two custom properties on :root:         */
/*   --uiz  every overlay (title, menus, modals, editors, cutscene text) */
/*   --uih  the HUD widgets (hotbar, hearts, chat, boss bars, toasts...) */
/* Auto reads the window (its 16:9-equivalent height) and the device     */
/* pixel ratio. The applied scale is capped so the largest fixed panel   */
/* (the inventory) and the HUD row always fit the window: panels never   */
/* overflow, long ones scroll inside. Canvases inside zoomed boxes get a */
/* device-resolution backing store (uiCv) so pixel icons stay            */
/* nearest-neighbour crisp and the text drawn on them stays sharp.       */
/* In node (the test stubs) nothing is live: the applied scale stays     */
/* 100% unless a test asks for one with uiApply({w,h,dpr}).              */
/* ===================================================================== */
const UI_STEPS=[1,1.25,1.5,2];
/* base sizes at 100% (CSS px, measured in Chrome): the inventory panel; the hotbar row with its corner badges; the HUD height that
   keeps three chat lines between the bottom stack (132) and the top band (180) */
const UI_BASE={modalW:572,modalH:556,hudW:510,hudSide:128,hudH:440};
const UIS={pref:'auto',want:1,eff:1,hud:1,dpr:1,w:1280,h:720,live:false,booted:false,mq:null};
function uiLive(){
  try{return typeof process==='undefined'&&typeof __VOXTEST==='undefined'&&typeof document!=='undefined'&&typeof document.querySelector==='function';}
  catch(e){return false;}
}
/* Auto: 1 below a 600 px tall (16:9-equivalent) window, then 1.25 / 1.5 / 2 / 2.5 / 3. On a fractional-DPR screen it moves to a
   nearby scale whose device size is a whole number of pixels, so pixel art stays even. */
function uiAutoScale(w,h,dpr){
  w=+w>0?+w:1280;h=+h>0?+h:720;dpr=+dpr>0?+dpr:1;
  const eh=Math.min(h,w*0.5625);
  let s=eh<600?1:eh<900?1.25:eh<1200?1.5:eh<1560?2:eh<1980?2.5:3;
  if(dpr>1&&dpr<3&&Math.abs(dpr-Math.round(dpr))>0.01){
    const c=Math.round(s*dpr)/dpr;
    if(Math.abs(c-s)<=s*0.12)s=Math.round(c*100)/100;
  }
  return s;
}
function uiPrefNorm(v){
  if(v==='auto'||v===undefined||v===null||v==='')return 'auto';
  const n=+v;return UI_STEPS.includes(n)?n:'auto';
}
/* the largest scale (0.05 steps, never below 100%) at which the inventory fits the window, and the HUD row fits beside its badges */
function uiCaps(w,h){
  const m=Math.min((w-16)/UI_BASE.modalW,(h-16)/UI_BASE.modalH);
  const hu=Math.min((w/2-10)/(UI_BASE.hudW/2+UI_BASE.hudSide),h/UI_BASE.hudH);
  return {modal:Math.max(1,Math.floor(m*20+1e-9)/20),hud:Math.max(1,Math.floor(hu*20+1e-9)/20)};
}
function uiCompute(pref,w,h,dpr){
  pref=uiPrefNorm(pref);
  const want=pref==='auto'?uiAutoScale(w,h,dpr):pref,c=uiCaps(w,h);
  return {pref,want,eff:Math.min(want,c.modal),hud:Math.min(want,c.hud),cap:c};
}
function uiSetVar(k,v){
  try{const st=document.documentElement&&document.documentElement.style;if(!st)return;
    if(typeof st.setProperty==='function')st.setProperty(k,String(v));else st[k]=String(v);}catch(e){}
}
/* apply the preference to the window (or to env {w,h,dpr} in a test); re-render the zoomed canvases when the scale changed */
function uiApply(env){
  const w=env&&env.w>0?env.w:(typeof innerWidth==='number'&&innerWidth>0?innerWidth:1280);
  const h=env&&env.h>0?env.h:(typeof innerHeight==='number'&&innerHeight>0?innerHeight:720);
  const dpr=env&&env.dpr>0?env.dpr:(typeof devicePixelRatio==='number'&&devicePixelRatio>0?devicePixelRatio:1);
  const r=uiCompute(UIS.pref,w,h,dpr),on=UIS.live||!!env;
  const eff=on?r.eff:1,hud=on?r.hud:1,changed=eff!==UIS.eff||hud!==UIS.hud||dpr!==UIS.dpr;
  UIS.w=w;UIS.h=h;UIS.dpr=dpr;UIS.want=r.want;UIS.eff=eff;UIS.hud=hud;
  uiSetVar('--uiz',eff);uiSetVar('--uih',hud);
  if(changed)uiRefresh();
  uiSyncSetUI();
  return {pref:UIS.pref,want:r.want,eff,hud};
}
function uiSetPref(v,skipSave){
  UIS.pref=uiPrefNorm(v);
  const r=uiApply();
  if(!skipSave&&typeof saveSettings==='function')saveSettings();
  return r;
}
/* the zoom of the overlays (layout code that measures the window in CSS px divides by this) */
function uiZ(){return UIS.eff;}
/* device pixels per CSS px of a canvas inside a zoomed box (1 in node) */
function uiK(hud){return UIS.live?(hud?UIS.hud:UIS.eff)*UIS.dpr:1;}
/* a canvas drawn in logical px (lw x lh): device-resolution backing store and a matching transform. cssMul>0 also sets its CSS size
   (lw*cssMul px); 0 leaves the CSS size alone. Returns the 2d context. Inert in node. */
function uiCv(cv,lw,lh,k,cssMul){
  const g=cv&&typeof cv.getContext==='function'?cv.getContext('2d'):null;
  if(!g||!UIS.live)return g;
  const m=cssMul===undefined?1:cssMul,key=k+'|'+m+'|'+lw+'x'+lh;
  if(cv._uik===key)return g;
  const bw=Math.max(1,Math.round(lw*k)),bh=Math.max(1,Math.round(lh*k));
  if(cv.width!==bw)cv.width=bw;
  if(cv.height!==bh)cv.height=bh;
  if(m>0&&cv.style){cv.style.width=(lw*m)+'px';cv.style.height=(lh*m)+'px';}
  g.setTransform(bw/lw,0,0,bh/lh,0,0);g.imageSmoothingEnabled=false;
  cv._uik=key;
  return g;
}
/* redraw everything that holds a scale-dependent canvas */
function uiRefresh(){
  try{
    if(typeof P!=='undefined'&&P){if(typeof redrawHotbar==='function'&&HOTCV.length)redrawHotbar();drawStats();}
    if(typeof MODAL!=='undefined'&&MODAL.kind)redrawModal();
    if(typeof MG2HUD!=='undefined')MG2HUD.key='';
    if(typeof crUIRescale==='function')crUIRescale();
  }catch(e){}
}
/* Settings -> UI scale buttons (data-ui) and the info line */
function uiSyncSetUI(){
  try{
    const box=$('s_ui');if(!box)return;
    if(typeof box.querySelectorAll==='function')for(const b of box.querySelectorAll('[data-ui]')){
      const on=String(uiPrefNorm(b.getAttribute('data-ui')))===String(UIS.pref);
      b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');
    }
    const info=$('s_uiinfo');if(!info)return;
    const pc=v=>Math.round(v*100)+'%';
    info.textContent=UIS.pref==='auto'?'Auto picks '+pc(UIS.want)+(UIS.eff<UIS.want?' (this window fits '+pc(UIS.eff)+')':'')
      :(UIS.eff<UIS.want?'This window fits '+pc(UIS.eff):'');
  }catch(e){}
}
/* boot (from wireMenus): live in a real browser only; re-applied on resize and when the window moves to another screen (DPR) */
function uiBoot(){
  if(UIS.booted)return;
  UIS.booted=true;UIS.live=uiLive();
  /* test seams (tests/ui/u_scale.js): __vox exists by now (src/boot/export_boot.js builds it, then calls boot()) */
  try{if(typeof window!=='undefined'&&window.__vox)Object.assign(window.__vox,{UI_STEPS,UI_BASE,getUIS:()=>UIS,uiAutoScale,uiPrefNorm,uiCaps,
    uiCompute,uiApply,uiSetPref,uiZ,uiK,uiLive,tmShow,tmMode,getTM:()=>TM,getTBG:()=>({on:TBG.on,still:TBG.still}),hlSpot,hudLayout,getHL:()=>HL,showToast});}catch(e){}
  const box=$('s_ui');
  if(box&&typeof box.querySelectorAll==='function')for(const b of box.querySelectorAll('[data-ui]'))
    b.onclick=()=>{uiSetPref(b.getAttribute('data-ui'));if(typeof playS==='function')playS('click');};
  uiApply();
  if(!UIS.live)return;
  addEventListener('resize',()=>uiApply());
  const watch=()=>{try{if(UIS.mq&&UIS.mq.removeEventListener)UIS.mq.removeEventListener('change',UIS.onmq);
    UIS.mq=matchMedia('(resolution: '+(devicePixelRatio||1)+'dppx)');UIS.onmq=()=>{uiApply();watch();};
    if(UIS.mq.addEventListener)UIS.mq.addEventListener('change',UIS.onmq);}catch(e){}};
  watch();
}
/* ---------- HUD layout (Release 1.0): nothing overlaps at any scale ----------
   hudLayout() runs every frame in a real browser (from frame(), and from showToast); in node it does nothing. It only ever
   moves a widget that is in the way, and puts everything back the moment it is not:
   1 a toast never lands on an open menu's content: over any open overlay it goes just above the menu's boxes, below them, or
     into the wider side gap (narrowed to fit); over a menu that fills the window it sits on the top edge, over the panel's
     header strip (it never moves the menu: a panel that jumped while the player clicks it loses the click, and the lowest
     row of the record player's piano roll used to fall off the bottom); with no overlay open the toast keeps its CSS place
     unless F3 or the player list is in the way;
   2 F3 (#debug) owns the top-left corner: a boss bar, toast or player list in its way moves into the lane to its right
     (narrowed to fit), and the F3 box stops above the chat (the chat gives up its oldest lines first) and the bottom HUD;
   3 the player list (held Tab) has priority: a toast, compass readout or chat it would cover is hidden while it is up.
   Lengths on a zoomed widget are in its own zoomed px, so real px are divided by UIS.hud (--uih). */
const HL={dirty:false,hid:[],push:null,pushT:0};
/* shown and laid out; a toast counts from the moment showToast sets it (its fade-in starts at opacity 0) */
function hlVis(e){
  if(!e)return false;
  const cs=getComputedStyle(e);
  if(cs.display==='none'||cs.visibility==='hidden'||(e.id==='toast'?String(e.style.opacity)!=='1':+cs.opacity===0))return false;
  const r=e.getBoundingClientRect();return r.width>0&&r.height>0;
}
function hlHit(a,b,m){m=m||0;return a.left<b.right+m&&b.left<a.right+m&&a.top<b.bottom+m&&b.top<a.bottom+m;}
/* where a w x h box goes beside obstacle rects in a W x H window, margin m: just above them, below them, or in a side gap (the
   right one unless the left is wider; narrowed to it: maxW). Returns {x: centre, y: top, maxW: 0 = keep, where}, or null when
   there is no room anywhere. Pure. */
function hlSpot(w,h,obs,W,H,m){
  if(!obs||!obs.length)return {x:W/2,y:m,maxW:0,where:'free'};
  let L=Infinity,T=Infinity,R=-Infinity,B=-Infinity;
  for(const o of obs){L=Math.min(L,o.left);T=Math.min(T,o.top);R=Math.max(R,o.right);B=Math.max(B,o.bottom);}
  if(T-2*m>=h)return {x:W/2,y:T-m-h,maxW:0,where:'above'};
  if(H-B-2*m>=h)return {x:W/2,y:B+m,maxW:0,where:'below'};
  const gl=L-2*m,gr=W-R-2*m,rt=gr>=gl-1,g=rt?gr:gl;   /* the right side by preference: the coordinates sit top-left */
  if(g>=Math.min(w,120))return {x:rt?(R+W)/2:L/2,y:Math.max(m,T),maxW:g<w?g:0,where:rt?'right':'left'};
  return null;
}
/* the boxes of every open overlay: its direct children (the panel; the death screen's title and message too); the title's views
   (its key-hint footer spans the window: only its text counts) */
function hlObstacles(){
  const out=[];
  for(const o of document.querySelectorAll('.ovl')){
    if(!hlVis(o))continue;
    const kids=o.id==='title'?['thead','tmain','tnew','tload','tfoot'].map($):[...o.children];
    for(const c of kids){
      if(!c||c.tagName==='CANVAS'||!hlVis(c))continue;
      if(c.id==='tfoot'){const g=document.createRange();g.selectNodeContents(c);out.push(g.getBoundingClientRect());}
      else out.push(c.getBoundingClientRect());
    }
  }
  return out;
}
function hlUnpush(){if(HL.push)for(const id of HL.push.ids){const o=$(id);if(o)o.style.paddingTop='';}HL.push=null;}
/* centre a top widget in the lane right of the F3 box when it is in F3's way. A moved widget is sized to its content
   (width:max-content, capped by max-width), or the room left of the window edge would wrap it; #mgbar has its own width */
function hlLane(e,f3,W,k){
  if(!hlVis(e))return;
  const r=e.getBoundingClientRect();
  if(!hlHit(r,f3,4))return;
  const L=f3.right+8,R=W-8;
  if(R-L<40)return;
  if(e.id!=='mgbar')e.style.width='max-content';
  if(r.width>R-L)e.style.maxWidth=((R-L)/k)+'px';
  e.style.left=((L+R)/2/k)+'px';
}
/* the F3 box stops above the chat's newest line (the chat drops its oldest lines first) and above the bottom HUD in its column */
function hlF3(dbg,H,k){
  const d=dbg.getBoundingClientRect();
  let lim=H-8;
  for(const id of ['stats','hotbar','handname','cmphud','pcmphud','xp','armor','trick','dis','nuket']){
    const e=$(id);if(!hlVis(e)||(id==='handname'&&!e.textContent))continue;
    const r=e.getBoundingClientRect();
    if(r.left<d.right&&d.left<r.right&&r.top>d.top+24)lim=Math.min(lim,r.top-8);
  }
  const cb=$('chatbox'),log=$('chatlog');
  let c=null,lg=null;
  if(hlVis(cb)&&log){
    c=cb.getBoundingClientRect();
    if(c.left<d.right&&d.left<c.right){
      lg=log.getBoundingClientRect();
      const last=log.lastElementChild,lineH=last?Math.min(last.getBoundingClientRect().height,lg.height):0;
      lim=Math.min(lim,c.bottom-(c.height-lg.height)-lineH-8);
    }else c=null;
  }
  let fb=d.bottom;
  if(d.bottom>lim){const h=Math.max(24,lim-d.top);dbg.style.maxHeight=(h/k)+'px';fb=d.top+h;}
  if(c&&lg&&c.top<fb+8)log.style.maxHeight=(Math.max(0,lg.height-(fb+8-c.top))/k)+'px';
  return {left:d.left,top:d.top,right:d.right,bottom:fb};
}
function hudLayout(){
  if(!UIS.live)return;
  const tst=$('toast'),dbg=$('debug'),tab=$('tablist');
  const f3on=!!(playing&&debugOn&&dbg&&dbg.style.display!=='none');
  const tabon=!!(playing&&tab&&tab.style.display==='block');
  const toaston=!!(tst&&String(tst.style.opacity)==='1');
  if(!f3on&&!tabon&&!toaston&&!HL.dirty&&!HL.push)return;
  /* back to the CSS places (a fading toast keeps where it is) */
  for(const id of ['boss','mgbar','tablist']){const e=$(id);if(e){e.style.left='';e.style.maxWidth='';e.style.width='';}}
  if(dbg)dbg.style.maxHeight='';
  const log=$('chatlog');if(log)log.style.maxHeight='';
  for(const id of HL.hid){const e=$(id);if(e)e.style.visibility='';}
  HL.hid=[];
  const W=innerWidth,H=innerHeight,k=UIS.hud||1;
  let f3=null;
  if(f3on){f3=hlF3(dbg,H,k);for(const id of ['boss','mgbar','tablist'])hlLane($(id),f3,W,k);}
  /* a pushed menu stays pushed while the same toast is on screen (fading out included) and the menu is open */
  if(HL.push){
    const fading=+getComputedStyle(tst).opacity>0.02;
    if(!(toaston||fading)||(toaston&&tst.textContent!==HL.push.txt)||!HL.push.ids.some(id=>hlVis($(id))))hlUnpush();
  }
  if(toaston&&!HL.push){
    const s=tst.style;s.top='';s.left='';s.maxWidth='';s.width='';
    const obs=hlObstacles();
    if(obs.length){
      let r=tst.getBoundingClientRect();
      const sp=hlSpot(r.width,r.height,obs,W,H,8);
      if(!sp)tst.classList.add('up');   /* no room anywhere (the title, or a menu that fills the window): the top edge, over its header */
      else{
        tst.classList.remove('up');
        s.width='max-content';if(sp.maxW)s.maxWidth=(sp.maxW/k)+'px';
        s.left=(sp.x/k)+'px';
        let y=sp.y;
        if(sp.where==='left'||sp.where==='right'){r=tst.getBoundingClientRect();y=Math.max(8,Math.min(y,H-8-r.height));}
        s.top=(y/k)+'px';
      }
    }else{
      tst.classList.toggle('up',!playing);   /* no menu open (the chat is not one): its CSS place */
      if(f3)hlLane(tst,f3,W,k);
    }
  }
  if(HL.push&&!HL.pushT)HL.pushT=setTimeout(()=>{HL.pushT=0;hudLayout();},3200);   /* the title has no frame loop to undo a push */
  if(tabon&&hlVis(tab)){
    const t=tab.getBoundingClientRect();
    for(const id of ['toast','cmphud','pcmphud','chatbox']){
      const e=$(id);if(!hlVis(e))continue;
      if(hlHit(e.getBoundingClientRect(),t,2)){e.style.visibility='hidden';HL.hid.push(id);}
    }
  }
  HL.dirty=f3on||tabon||toaston||!!HL.push;
}
