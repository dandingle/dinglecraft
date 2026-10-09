/* ---- PART 56: c2_ui.js ---- */
/* PART 56 c2 (C2, music): the record player's editor. The Creativity Update plan, section 8.2 ("a kid could use it").
   One panel in #crmusicwin, everything visible at 1280x720: a transport bar (Play/Stop, Loop, Tempo, Bars, Key, Copy bar, Clear,
   Undo/Redo), up to six tracks on the left (instrument, octave, volume, mute, remove), and the step grid of the selected track:
   16 steps per bar, two bars per page, 15 rows of two C-major octaves (every note fits) or the four drums. Click a square to add a
   note (you hear it), drag right to hold it longer, click a note or right-click to delete it; on drums, drag to paint hits.
   Every finished gesture is one undo step and is saved at once (crSetData): Esc or walking away loses nothing. An empty record player
   shows a blank song and only makes a Demo Tape when you first change something. Done asks for a title and presses the one disc. */
var CRMU={ctx:null,m:null,sel:0,page:0,selBar:0,loop:true,undo:[],redo:[],el:{},drag:null,pick:-1,lay:null,slide:null,aud:null,msg:''};
function crMusEl(tag,cls,txt,par,title){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;
  if(title)e.title=title;if(par&&par.appendChild)par.appendChild(e);return e;}
function crMusBtn(txt,cls,par,title,fn){const b=crMusEl('button','crtool'+(cls?' '+cls:''),txt,par,title);b.tabIndex=-1;
  b.onclick=e=>{if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopPropagation)e.stopPropagation();if(b.disabled)return;
    try{fn(e);}catch(err){crFail('music ui',err);}};return b;}
function crMusSlider(min,max,par,title,onIn){const s=crMusEl('input','crmrange',null,par,title);s.type='range';s.min=String(min);s.max=String(max);s.step='1';s.tabIndex=-1;
  s.oninput=()=>{try{if(!CRMU.slide)CRMU.slide=JSON.stringify(crSongPack(CRMU.m));onIn(+s.value);crMusRefresh(true);}catch(err){crFail('music ui',err);}};
  s.onchange=()=>{try{onIn(+s.value);const b=CRMU.slide;CRMU.slide=null;if(b)crMusCommit(b);if(s.blur)s.blur();}catch(err){crFail('music ui',err);}};
  s.onpointerup=()=>{try{setTimeout(()=>{try{if(s.blur)s.blur();}catch(e){}},0);}catch(e){}};   /* Space must reach the editor again */
  return s;}
const CRM_CSS='#crmusicwin{width:min(1180px,97%);box-sizing:border-box;padding:8px 12px}'+
  '#crmusicwin .crmtop{display:flex;align-items:center;gap:8px;margin:0 0 6px}#crmusicwin h2{margin:0;font-size:17px}'+
  '#crmusicwin .crmsub{font:12px "Courier New",monospace;color:#4f4f4f;flex:1}'+
  '#crmusicwin .crmbar{display:flex;align-items:center;flex-wrap:wrap;gap:5px;padding:5px 6px;margin:0 0 6px;background:#b4b4b4;border:2px solid;border-color:#8b8b8b #fff #fff #8b8b8b}'+
  '#crmusicwin .crmsep{width:2px;align-self:stretch;background:#8b8b8b;margin:0 3px}'+
  '#crmusicwin .crmbar .crtool,#crmusicwin .crmtop .crtool{height:32px;min-width:32px;padding:0 8px}'+
  '#crmusicwin .crmval{display:inline-block;min-width:34px;text-align:center;font:bold 14px "Courier New",monospace;color:#2f2f2f}'+
  '#crmusicwin .crmplay{min-width:96px;font-size:15px}#crmusicwin .crmdone{background:linear-gradient(#6fae4a,#3f7a2a);border-color:#c8f0b0 #1f3d14 #1f3d14 #c8f0b0}'+
  '#crmusicwin .crmstat{font:bold 12px "Courier New",monospace;color:#9a2f20;margin-left:4px}'+
  '#crmusicwin .crmrange{width:100px;accent-color:#5b8f3a;cursor:pointer}'+
  '#crmusicwin .crmmain{display:flex;gap:10px;align-items:flex-start}'+
  '#crmusicwin .crmtracks{width:250px;flex:none;display:flex;flex-direction:column;gap:5px}'+
  '#crmusicwin .crmtr{position:relative;padding:4px 5px 4px 9px;background:#d4d4d4;border:2px solid #8b8b8b;cursor:pointer}'+
  '#crmusicwin .crmtr.sel{background:#f2f2f2;border-color:#2f2f2f;box-shadow:inset 0 0 0 1px #fff}'+
  '#crmusicwin .crmtr .crmchip{position:absolute;left:0;top:0;bottom:0;width:6px}'+
  '#crmusicwin .crmrow{display:flex;align-items:center;gap:4px;margin:1px 0}'+
  '#crmusicwin .crmrow .crtool{min-width:28px;height:28px;padding:0 6px;font-size:13px}'+
  '#crmusicwin .crminst{flex:1;justify-content:flex-start!important;text-align:left}'+
  '#crmusicwin .crmtr .crmrange{width:62px}#crmusicwin .crmlab{font:bold 11px "Courier New",monospace;color:#3f3f3f}'+
  '#crmusicwin .crmpick{position:absolute;left:8px;top:34px;z-index:3;display:flex;flex-direction:column;gap:3px;padding:5px;background:#c6c6c6;border:3px solid;border-color:#fff #555 #555 #fff;box-shadow:0 6px 18px rgba(0,0,0,.45)}'+
  '#crmusicwin .crmpick .crtool{justify-content:flex-start;min-width:170px;height:32px}'+
  '#crmusicwin .crmpick .crtool i{display:inline-block;width:12px;height:12px;margin-right:8px;border:1px solid #222}'+
  '#crmusicwin .crmgridw{flex:1;min-width:0}'+
  '#crmusicwin .crmpages{display:flex;align-items:center;gap:4px;margin:0 0 4px}'+
  '#crmusicwin .crmpages .crtool{min-width:30px;height:28px;padding:0 6px;font-size:13px}'+
  '#crmusicwin .crmpages .crtool.cur{background:linear-gradient(#e6e6e6,#bdbdbd);color:#2f2f2f;text-shadow:none}'+
  '#crmusicwin .crmpages .crtool.selb{outline:2px solid #2f6fd0;outline-offset:-2px}'+
  '#crmusicwin .crmpages .crtool.ph{box-shadow:inset 0 -4px 0 #ffd84a}'+
  '#crmusicwin canvas.crmgrid{display:block;cursor:pointer;image-rendering:pixelated;border:2px solid;border-color:#555 #fff #fff #555;touch-action:none}'+
  '#crmusicwin .crmhint{font:12px "Courier New",monospace;color:#4f4f4f;margin:6px 0 0}';
/* ---- layout: sized from the window so nothing scrolls at 1280x720 (a pixel cell >= 16 px, else one bar per page).
   Release 1.0: in the UI scale's CSS px (the window divided by uiZ, p06e) ---- */
function crMusLayout(){const u=typeof uiZ==='function'?uiZ():1,iw=(typeof innerWidth==='number'?innerWidth:1280)/u,ih=(typeof innerHeight==='number'?innerHeight:720)/u;
  const W=Math.min(1180,iw*0.97)-28,gw0=Math.max(300,W-250-14),labW=44;
  const sp=(gw0-labW)/32>=16?32:16,cw=Math.max(12,Math.floor((gw0-labW)/sp)),rh=Math.max(14,Math.min(31,Math.floor((ih*0.95-215)/15)));
  return {labW,sp,cw,gw:labW+sp*cw,gh:rh*15};}
/* ---- open / close ---- */
function crMusOpen(ctx){crCSS('crm-css',CRM_CSS);crMusStop();CRMU.ctx=ctx;const r=crCtxRec(ctx);
  CRMU.m=r&&r.k==='song'?crSongNorm(r.d):crSongNorm(crSongBlank());
  CRMU.sel=0;CRMU.page=0;CRMU.selBar=0;CRMU.undo=[];CRMU.redo=[];CRMU.drag=null;CRMU.pick=-1;CRMU.slide=null;CRMU.msg='';
  CRMU.lay=crMusLayout();crMusBuild();crMusRefresh();}
function crMusClose(force){crMusStop();crMusAudStop();CRMU.drag=null;CRMU.pick=-1;CRMU.slide=null;CRMU.ctx=null;
  const w=$('crmusicwin');if(w)w.textContent='';CRMU.el={};}
function crMusKey(e,esc){
  if(esc){if(CRMU.pick>=0){CRMU.pick=-1;crMusRefresh();return true;}return false;}
  const c=e.code,mod=e.ctrlKey||e.metaKey;
  if(c==='Space'){if(e.preventDefault)e.preventDefault();crMusToggle();}
  else if(mod&&c==='KeyZ'){if(e.preventDefault)e.preventDefault();if(e.shiftKey)crMusRedo();else crMusUndo();}
  else if(mod&&c==='KeyY'){if(e.preventDefault)e.preventDefault();crMusRedo();}
  else if(c==='ArrowLeft'||c==='ArrowRight'){crMusPage(CRMU.page+(c==='ArrowLeft'?-1:1));}
  return true;}
var crMusicUI={open:crMusOpen,close:crMusClose,key:crMusKey};
CRREG.ui.music=crMusicUI;
/* ---- the DOM (built fresh on every open; handlers are plain on* properties, so the node suites drive the real ones) ---- */
function crMusBuild(){const w=$('crmusicwin');if(!w)return;w.textContent='';const E=CRMU.el={};
  const top=crMusEl('div','crmtop',null,w);crMusEl('h2',null,'Record Player',top);E.sub=crMusEl('span','crmsub','',top);
  E.nw=crMusBtn('New','',top,'Start a blank song',crMusNew);crMusBtn('Close','',top,'Close (Esc). Everything is kept.',()=>crUIClose());
  E.done=crMusBtn('Done \u2713','crmdone',top,'Press the one and only disc',crMusDone);
  const bar=crMusEl('div','crmbar',null,w);
  E.play=crMusBtn('\u25b6 Play','crmplay',bar,'Play / stop (Space)',crMusToggle);
  E.loop=crMusBtn('Loop','',bar,'Loop the song',()=>{CRMU.loop=!CRMU.loop;if(CRM.prev&&CRM.prev.on)crMusRestart();crMusRefresh();});
  crMusEl('span','crmsep',null,bar);crMusEl('span','crlab','Tempo',bar);
  E.tempo=crMusSlider(CRS.BPM0,CRS.BPM1,bar,'Beats per minute',v=>{CRMU.m.bpm=v;});E.bpm=crMusEl('span','crmval','',bar);
  crMusEl('span','crmsep',null,bar);crMusEl('span','crlab','Bars',bar);
  E.barsM=crMusBtn('\u2212','',bar,'One bar less',()=>crMusBars(-1));E.bars=crMusEl('span','crmval','',bar);E.barsP=crMusBtn('+','',bar,'One bar more',()=>crMusBars(1));
  crMusEl('span','crmsep',null,bar);crMusEl('span','crlab','Key',bar);
  E.keyM=crMusBtn('\u2212','',bar,'Everything a semitone lower',()=>crMusEdit(m=>{m.key=Math.max(-CRS.KEY,m.key-1);}));E.key=crMusEl('span','crmval','',bar);
  E.keyP=crMusBtn('+','',bar,'Everything a semitone higher',()=>crMusEdit(m=>{m.key=Math.min(CRS.KEY,m.key+1);}));
  crMusEl('span','crmsep',null,bar);
  E.copy=crMusBtn('Copy bar','',bar,'Copy the selected bar onto the next one (all tracks)',crMusCopyBar);
  E.clear=crMusBtn('Clear','',bar,'Remove every note from the selected track',crMusClearTrack);
  crMusEl('span','crmsep',null,bar);
  E.undo=crMusBtn('\u21b6','',bar,'Undo (Ctrl+Z)',crMusUndo);E.redo=crMusBtn('\u21b7','',bar,'Redo (Ctrl+Y)',crMusRedo);
  E.stat=crMusEl('span','crmstat','',bar);
  const main=crMusEl('div','crmmain',null,w);E.tracks=crMusEl('div','crmtracks',null,main);
  const gw=crMusEl('div','crmgridw',null,main);E.pages=crMusEl('div','crmpages',null,gw);
  const L=CRMU.lay,cv=crMusEl('canvas','crmgrid',null,gw),dpr=Math.min(2,typeof devicePixelRatio==='number'&&devicePixelRatio>0?devicePixelRatio:1)*(typeof uiZ==='function'?uiZ():1);
  cv.width=Math.round(L.gw*dpr);cv.height=Math.round(L.gh*dpr);cv.style.width=L.gw+'px';cv.style.height=L.gh+'px';CRMU.dpr=dpr;E.grid=cv;
  cv.onpointerdown=e=>crMusDown(e);cv.onpointermove=e=>crMusMove(e);cv.onpointerup=e=>crMusUp(e);cv.onpointercancel=e=>crMusUp(e);
  cv.oncontextmenu=e=>{if(e&&e.preventDefault)e.preventDefault();return false;};
  E.hint=crMusEl('div','crmhint','',w);}
/* the track list and the bar strip are rebuilt on every refresh (a handful of elements) */
function crMusTracks(){const E=CRMU.el,box=E.tracks;if(!box)return;box.textContent='';E.tr=[];const m=CRMU.m;
  m.tr.forEach((t,i)=>{const I=crSongInst(t.i),row=crMusEl('div','crmtr'+(i===CRMU.sel?' sel':''),null,box),o={row};
    row.onclick=()=>{if(CRMU.sel!==i){CRMU.sel=i;CRMU.pick=-1;crMusRefresh();}};
    const chip=crMusEl('span','crmchip',null,row);chip.style.background=I.c;
    const r1=crMusEl('div','crmrow',null,row);
    o.inst=crMusBtn(I.n+' \u25be','crminst',r1,'Choose the instrument',()=>{CRMU.sel=i;CRMU.pick=CRMU.pick===i?-1:i;crMusRefresh();});
    o.del=crMusBtn('\u00d7','',r1,'Remove this track',()=>{CRMU.sel=i;crMusRemoveTrack(i);});o.del.disabled=m.tr.length<=1;
    const r2=crMusEl('div','crmrow',null,row);crMusEl('span','crmlab','Oct',r2);
    o.octM=crMusBtn('\u2212','',r2,'An octave lower',()=>{CRMU.sel=i;crMusEdit(mm=>{mm.tr[i].o=Math.max(-CRS.OCT,mm.tr[i].o-1);});});
    o.oct=crMusEl('span','crmval',(t.o>0?'+':'')+t.o,r2);o.oct.style.minWidth='22px';
    o.octP=crMusBtn('+','',r2,'An octave higher',()=>{CRMU.sel=i;crMusEdit(mm=>{mm.tr[i].o=Math.min(CRS.OCT,mm.tr[i].o+1);});});
    crMusEl('span','crmlab','Vol',r2);o.vol=crMusSlider(0,CRS.VOL,r2,'Volume',v=>{CRMU.sel=i;CRMU.m.tr[i].vol=v;});o.vol.value=String(t.vol);
    o.mute=crMusBtn('M',t.m?'on':'',r2,t.m?'Muted (click to hear it)':'Mute',()=>{CRMU.sel=i;crMusEdit(mm=>{mm.tr[i].m=mm.tr[i].m?0:1;});});
    if(CRMU.pick===i){const pk=crMusEl('div','crmpick',null,row);o.pick=[];
      CR_INST.forEach(J=>{const b=crMusBtn(J.n,J.k===t.i?'on':'',pk,null,()=>crMusSetInst(i,J.k));const sw=crMusEl('i',null,null,null);sw.style.background=J.c;
        if(b.insertBefore&&b.firstChild)try{b.insertBefore(sw,b.firstChild);}catch(e){}o.pick.push(b);});}
    E.tr.push(o);});
  E.add=crMusBtn('+ Track','',box,'Add a track (up to six)',crMusAddTrack);E.add.disabled=m.tr.length>=CRS.TRACKS;}
function crMusPages(){const E=CRMU.el,box=E.pages;if(!box)return;box.textContent='';const L=CRMU.lay,m=CRMU.m,np=crMusNPages();E.bar=[];
  E.prev=crMusBtn('\u25c0','',box,'Earlier bars (Left arrow)',()=>crMusPage(CRMU.page-1));E.prev.disabled=CRMU.page<=0;
  for(let b=0;b<m.bars;b++)E.bar.push(crMusBtn(String(b+1),'',box,'Bar '+(b+1),()=>{CRMU.selBar=b;crMusPage(Math.floor(b*CRS.STEPS/L.sp));}));
  E.next=crMusBtn('\u25b6','',box,'Later bars (Right arrow)',()=>crMusPage(CRMU.page+1));E.next.disabled=CRMU.page>=np-1;crMusPagesMark();}
/* the bar strip's highlights (shown page, selected bar, the bar the playhead is in), set in place: no rebuild under the pointer */
function crMusPagesMark(){const E=CRMU.el;if(!E.bar)return;const L=CRMU.lay,ph=crMusPlayStep(),pb=ph<0?-1:Math.floor(ph/CRS.STEPS);
  E.bar.forEach((el,b)=>{el.className='crtool'+(Math.floor(b*CRS.STEPS/L.sp)===CRMU.page?' cur':'')+(b===CRMU.selBar?' selb':'')+(b===pb?' ph':'');});}
function crMusNPages(){return Math.max(1,Math.ceil(CRMU.m.bars*CRS.STEPS/CRMU.lay.sp));}
function crMusPage(p){const np=crMusNPages();p=Math.max(0,Math.min(np-1,p|0));if(p===CRMU.page)return;CRMU.page=p;
  const sp=CRMU.lay.sp,b0=Math.floor(p*sp/CRS.STEPS),b1=Math.floor(((p+1)*sp-1)/CRS.STEPS);if(CRMU.selBar<b0||CRMU.selBar>b1)CRMU.selBar=b0;crMusRefresh();}
/* labels, buttons, the grid; light=true while a slider moves (no list rebuild) */
function crMusRefresh(light){const E=CRMU.el,m=CRMU.m;if(!m||!E.play)return;
  if(CRMU.sel>=m.tr.length)CRMU.sel=m.tr.length-1;if(CRMU.page>=crMusNPages())CRMU.page=crMusNPages()-1;if(CRMU.selBar>=m.bars)CRMU.selBar=m.bars-1;
  const has=!!crCtxRec(CRMU.ctx),nn=crSongCount(m),on=!!(CRM.prev&&CRM.prev.on);
  E.sub.textContent=(has?'Demo Tape':'New song (saved from your first note)')+' \u00b7 '+nn+' note'+(nn===1?'':'s')+' \u00b7 '+crSongLen(crSongPack(m)).toFixed(1)+' s';
  E.play.textContent=on?'\u25a0 Stop':'\u25b6 Play';E.play.className='crtool crmplay'+(on?' on':'');E.loop.className='crtool'+(CRMU.loop?' on':'');
  E.tempo.value=String(m.bpm);E.bpm.textContent=String(m.bpm);E.bars.textContent=String(m.bars);
  E.barsM.disabled=m.bars<=1;E.barsP.disabled=m.bars>=CRS.BARS;
  E.key.textContent=CRS.NOTE[((m.key%12)+12)%12]+(m.key?' ('+(m.key>0?'+':'')+m.key+')':'');E.keyM.disabled=m.key<=-CRS.KEY;E.keyP.disabled=m.key>=CRS.KEY;
  E.copy.textContent='Copy bar '+(CRMU.selBar+1)+'\u2192'+(CRMU.selBar+2);E.copy.disabled=CRMU.selBar+1>=CRS.BARS;
  E.clear.disabled=!m.tr[CRMU.sel]||!m.tr[CRMU.sel].n.length;E.undo.disabled=!CRMU.undo.length;E.redo.disabled=!CRMU.redo.length;
  E.done.disabled=!nn;E.nw.disabled=!nn&&!has;E.stat.textContent=CRMU.msg;
  const mel=!!(m.tr[CRMU.sel]&&crSongInst(m.tr[CRMU.sel].i).mel);
  E.hint.textContent=(mel?'Click a square to add a note (you hear it). Drag right to hold it longer. Click a note or right-click to delete.':
    'Click a square to add a hit, or drag across squares to add a row of them. Click a hit or right-click to delete.')+' Space plays. Ctrl+Z undoes.';
  if(!light){crMusTracks();crMusPages();}
  else if(E.tr)E.tr.forEach((o,i)=>{if(m.tr[i])o.vol.value=String(m.tr[i].vol);});
  crMusDraw();}
/* ---- the grid ---- */
function crMusDraw(){const cv=CRMU.el.grid,L=CRMU.lay,m=CRMU.m;if(!cv||!L||!m||typeof cv.getContext!=='function')return;
  const g=cv.getContext('2d');if(!g)return;const t=m.tr[CRMU.sel];if(!t)return;const I=crSongInst(t.i),rows=crSongRows(t.i),rh=L.gh/rows,p0=CRMU.page*L.sp,S=m.bars*CRS.STEPS;
  if(g.setTransform)g.setTransform(CRMU.dpr||1,0,0,CRMU.dpr||1,0,0);
  g.fillStyle='#bdbdbd';g.fillRect(0,0,L.gw,L.gh);
  for(let r=0;r<rows;r++){const y=(rows-1-r)*rh,cr=I.mel&&r%7===0;
    g.fillStyle=cr?'#a9bccd':'#b3b3b3';g.fillRect(0,y,L.labW,rh);
    g.fillStyle=cr?'#1f2f45':'#333';g.font=(cr?'bold ':'')+Math.min(13,Math.max(9,Math.floor(rh*0.48)))+"px 'Courier New',monospace";
    g.textAlign='center';g.textBaseline='middle';g.fillText(I.mel?crSongNoteName(t.i,r,t.o,m.key):CRS.DRUM[r],L.labW/2,y+rh/2+0.5);
    for(let k=0;k<L.sp;k++){const s=p0+k,x=L.labW+k*L.cw;
      g.fillStyle=s>=S?'#8e8e8e':(cr?(((s>>2)&1)?'#c4d2de':'#d0dce6'):(((s>>2)&1)?'#cdcdcd':'#dadada'));g.fillRect(x,y,L.cw,rh);}}
  for(let k=0;k<=L.sp;k++){const s=p0+k,x=L.labW+k*L.cw;g.fillStyle=s%CRS.STEPS===0?'#3a3a3a':s%4===0?'#8a8a8a':'#b4b4b4';
    const wd=s%CRS.STEPS===0?2:1;g.fillRect(Math.round(x-wd/2),0,wd,L.gh);}
  for(let r=1;r<rows;r++){g.fillStyle='#b8b8b8';g.fillRect(L.labW,Math.round(r*rh),L.gw-L.labW,1);}
  g.fillStyle='#3a3a3a';g.fillRect(L.labW-1,0,1,L.gh);
  for(const q of t.n){const a=Math.max(q[0],p0),b=Math.min(q[0]+q[2],p0+L.sp);if(b<=a)continue;
    const x=L.labW+(a-p0)*L.cw+1.5,y=(rows-1-q[1])*rh+1.5,wd=(b-a)*L.cw-3,ht=rh-3;
    g.fillStyle=t.m?'#8f8f8f':I.c;g.fillRect(x,y,wd,ht);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x,y,wd,Math.max(2,ht*0.18));
    g.fillStyle='rgba(0,0,0,.45)';g.fillRect(x,y+ht-2,wd,2);if(q[0]>=p0)g.fillRect(x,y,2,ht);
    if(q[2]>1&&q[0]+q[2]<=p0+L.sp){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x+wd-4,y+ht*0.3,2,ht*0.4);}}
  if(!crSongCount(m)){g.fillStyle='rgba(40,40,40,.55)';g.font="bold 15px 'Courier New',monospace";g.textAlign='center';g.textBaseline='middle';
    g.fillText('Click any square to add a note.',L.labW+(L.gw-L.labW)/2,L.gh/2);}
  const ph=crMusPlayStep();if(ph>=p0&&ph<p0+L.sp){const x=L.labW+(ph-p0)*L.cw;g.fillStyle='rgba(255,236,120,.38)';g.fillRect(x,0,L.cw,L.gh);
    g.fillStyle='#fff6c0';g.fillRect(x,0,2,L.gh);}}
/* pointer -> cell. loose: clamp the step into the song (resizing past the page edge) */
function crMusHit(e,loose){const L=CRMU.lay,cv=CRMU.el.grid,m=CRMU.m;if(!cv||!L||!m)return null;const t=m.tr[CRMU.sel];if(!t)return null;
  const rc=typeof cv.getBoundingClientRect==='function'?cv.getBoundingClientRect():{left:0,top:0};
  const u=typeof uiZ==='function'?uiZ():1,x=((e.clientX||0)-rc.left)/u,y=((e.clientY||0)-rc.top)/u,rows=crSongRows(t.i),rh=L.gh/rows,S=m.bars*CRS.STEPS,p0=CRMU.page*L.sp;
  let step=p0+Math.floor((x-L.labW)/L.cw),row=rows-1-Math.floor(y/rh);
  if(loose){step=Math.max(0,Math.min(S-1,step));row=Math.max(0,Math.min(rows-1,row));return {step,row};}
  if(x<L.labW||step<p0||step>=p0+L.sp||step>=S||row<0||row>=rows)return null;return {step,row};}
/* client coordinates of the centre of a cell on the current page (the suites and the QA rig click with these) */
function crMusCellXY(step,row){const L=CRMU.lay,cv=CRMU.el.grid,t=CRMU.m.tr[CRMU.sel],rows=crSongRows(t.i),rh=L.gh/rows;
  const rc=cv&&typeof cv.getBoundingClientRect==='function'?cv.getBoundingClientRect():{left:0,top:0};
  const u=typeof uiZ==='function'?uiZ():1;
  return {x:rc.left+(L.labW+(step-CRMU.page*L.sp+0.5)*L.cw)*u,y:rc.top+(rows-1-row+0.5)*rh*u};}
function crMusNoteAt(t,s,r){for(const q of t.n)if(q[1]===r&&q[0]<=s&&s<q[0]+q[2])return q;return null;}
function crMusMaxLen(t,q){let e=Math.min(q[0]+CRS.LEN,CRMU.m.bars*CRS.STEPS);for(const p of t.n)if(p!==q&&p[1]===q[1]&&p[0]>q[0])e=Math.min(e,p[0]);return Math.max(1,e-q[0]);}
function crMusSort(t){t.n.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);}
function crMusDown(e){if(!CRMU.m)return;CRMU.pick=-1;const t=CRMU.m.tr[CRMU.sel];if(!t)return;const h=crMusHit(e);if(!h)return;
  if(e.preventDefault)e.preventDefault();try{if(CRMU.el.grid.setPointerCapture&&e.pointerId!=null)CRMU.el.grid.setPointerCapture(e.pointerId);}catch(err){}
  const I=crSongInst(t.i),q=crMusNoteAt(t,h.step,h.row),d=CRMU.drag={before:JSON.stringify(crSongPack(CRMU.m)),mode:'',q:null,s0:h.step,last:h.step+','+h.row};
  if(e.button===2||(e.button===0&&e.ctrlKey)){d.mode='erase';if(q)t.n.splice(t.n.indexOf(q),1);}   /* right-click, or a Mac's Ctrl+click */
  else if(!I.mel){if(q){d.mode='erase';t.n.splice(t.n.indexOf(q),1);}else{d.mode='paint';t.n.push([h.step,h.row,1]);crMusSort(t);crMusAudition(t,h.row,1);}}
  else if(q){d.mode='tap';d.q=q;}
  else{const n=[h.step,h.row,1];t.n.push(n);crMusSort(t);d.mode='size';d.q=n;crMusAudition(t,h.row,1);}
  crMusDraw();}
function crMusMove(e){const d=CRMU.drag;if(!d||!CRMU.m)return;const t=CRMU.m.tr[CRMU.sel];if(!t)return;
  if(d.mode==='tap'||d.mode==='size'){const h=crMusHit(e,true);if(!h)return;if(d.mode==='tap'){if(h.step===d.s0)return;d.mode='size';}
    const q=d.q,l=Math.max(1,Math.min(crMusMaxLen(t,q),h.step-q[0]+1));if(l!==q[2]){q[2]=l;crMusDraw();}return;}
  const h=crMusHit(e);if(!h)return;const k=h.step+','+h.row;if(k===d.last)return;d.last=k;const q=crMusNoteAt(t,h.step,h.row);
  if(d.mode==='erase'&&q){t.n.splice(t.n.indexOf(q),1);crMusDraw();}
  else if(d.mode==='paint'&&!q){t.n.push([h.step,h.row,1]);crMusSort(t);crMusDraw();}}
function crMusUp(e){const d=CRMU.drag;if(!d)return;CRMU.drag=null;const t=CRMU.m&&CRMU.m.tr[CRMU.sel];
  if(t&&d.mode==='tap'&&d.q){const i=t.n.indexOf(d.q);if(i>=0)t.n.splice(i,1);}
  crMusCommit(d.before);}
/* ---- edits: one undo step each, saved at once; a refused save (size cap) puts the song back ---- */
function crMusSave(pk){const ctx=CRMU.ctx;if(!ctx||!ctx.be)return false;const n=crWorkN(ctx.be.id);
  if(!n)return crStartWork(ctx,{d:pk})>0;                 /* the first change makes the Demo Tape */
  return crSetData(n,pk);}
function crMusCommit(before){const pk=crSongPack(CRMU.m),now=JSON.stringify(pk);
  if(now===before){crMusRefresh();return false;}
  if(!crMusSave(pk)){CRMU.m=crSongNorm(JSON.parse(before));crMusRefresh();return false;}
  CRMU.m=crSongNorm(pk);CRMU.undo.push(before);if(CRMU.undo.length>50)CRMU.undo.shift();CRMU.redo.length=0;crMusChanged();return true;}
function crMusEdit(fn){if(!CRMU.m)return false;const before=JSON.stringify(crSongPack(CRMU.m));CRMU.pick=-1;fn(CRMU.m);return crMusCommit(before);}
function crMusChanged(){CRMU.msg='';if(CRM.prev&&CRM.prev.on)CRM.prev.pend=0.15;crMusRefresh();}
function crMusUndo(){if(!CRMU.undo.length)return;const cur=JSON.stringify(crSongPack(CRMU.m)),b=CRMU.undo.pop();
  if(!crMusSave(JSON.parse(b))){CRMU.undo.push(b);return;}CRMU.m=crSongNorm(JSON.parse(b));CRMU.redo.push(cur);crMusChanged();}
function crMusRedo(){if(!CRMU.redo.length)return;const cur=JSON.stringify(crSongPack(CRMU.m)),b=CRMU.redo.pop();
  if(!crMusSave(JSON.parse(b))){CRMU.redo.push(b);return;}CRMU.m=crSongNorm(JSON.parse(b));CRMU.undo.push(cur);crMusChanged();}
function crMusBars(dv){const m=CRMU.m,nb=Math.max(1,Math.min(CRS.BARS,m.bars+dv));if(nb===m.bars)return;
  const lost=dv<0&&m.tr.some(t=>t.n.some(q=>q[0]+q[2]>nb*CRS.STEPS));
  const go=()=>crMusEdit(mm=>{mm.bars=nb;for(const t of mm.tr)t.n=t.n.filter(q=>q[0]<nb*CRS.STEPS).map(q=>[q[0],q[1],Math.min(q[2],nb*CRS.STEPS-q[0])]);});
  if(lost)crAsk({title:'Remove bar '+m.bars+'?',text:'Its notes go with it. (Undo brings them back.)',ok:'Remove it',no:'Keep it',onOk:go});else go();}
function crMusCopyBar(){const b=CRMU.selBar,nb=b+1;if(nb>=CRS.BARS)return;
  crMusEdit(m=>{if(nb>=m.bars)m.bars=nb+1;const a=b*CRS.STEPS,z=nb*CRS.STEPS;
    for(const t of m.tr){const src=t.n.filter(q=>q[0]>=a&&q[0]<z);
      t.n=t.n.filter(q=>q[0]<z||q[0]>=z+CRS.STEPS).map(q=>q[0]<z&&q[0]+q[2]>z?[q[0],q[1],z-q[0]]:q);
      for(const q of src)t.n.push([q[0]+CRS.STEPS,q[1],Math.min(q[2],z+CRS.STEPS-(q[0]+CRS.STEPS))]);crMusSort(t);}});
  CRMU.selBar=nb;crMusPage(Math.floor(nb*CRS.STEPS/CRMU.lay.sp));crMusRefresh();}
function crMusClearTrack(){const t=CRMU.m.tr[CRMU.sel];if(!t||!t.n.length)return;const i=CRMU.sel;
  crAsk({title:'Clear the '+crSongInst(t.i).n+' track?',text:'Every note on it goes. (Undo brings them back.)',ok:'Clear it',no:'Keep it',
    onOk:()=>crMusEdit(m=>{if(m.tr[i])m.tr[i].n=[];})});}
function crMusAddTrack(){if(CRMU.m.tr.length>=CRS.TRACKS)return;const used=new Set(CRMU.m.tr.map(t=>t.i)),k=(CR_INST.find(J=>!used.has(J.k))||CR_INST[0]).k;
  if(crMusEdit(m=>{m.tr.push(crSongTrack(k));}))CRMU.sel=CRMU.m.tr.length-1;crMusRefresh();}
function crMusRemoveTrack(i){const m=CRMU.m;if(m.tr.length<=1||!m.tr[i])return;const go=()=>{crMusEdit(mm=>{mm.tr.splice(i,1);});CRMU.sel=Math.max(0,Math.min(CRMU.sel,CRMU.m.tr.length-1));crMusRefresh();};
  if(m.tr[i].n.length)crAsk({title:'Remove the '+crSongInst(m.tr[i].i).n+' track?',text:'Its notes go with it. (Undo brings them back.)',ok:'Remove it',no:'Keep it',onOk:go});else go();}
/* melodic <-> melodic keeps the notes; to or from the drum kit the rows mean different things, so the notes are cleared (asked first) */
function crMusSetInst(i,k){const t=CRMU.m.tr[i];CRMU.pick=-1;if(!t||t.i===k){crMusRefresh();return;}
  const cross=!!crSongInst(t.i).mel!==!!crSongInst(k).mel,go=()=>crMusEdit(m=>{const x=m.tr[i];x.i=k;if(cross)x.n=[];});
  if(cross&&t.n.length)crAsk({title:'Switch to '+crSongInst(k).n+'?',text:(crSongInst(k).mel?'Drums':'Drums have their own rows, so')+' this track\u2019s notes are cleared. (Undo brings them back.)',ok:'Switch',no:'Keep it',onOk:go});
  else go();}
function crMusNew(){const go=()=>{crMusStop();if(crCtxRec(CRMU.ctx))crDropWork(CRMU.ctx);CRMU.m=crSongNorm(crSongBlank());CRMU.undo=[];CRMU.redo=[];CRMU.sel=0;CRMU.page=0;CRMU.selBar=0;crMusRefresh();};
  crAsk({title:'Start a new song?',text:'This one is thrown away for good.',ok:'New song',no:'Keep this one',onOk:go});}
/* crAsk with a title field: focus and select it once the dialog is visible, so typing replaces "Untitled Song" straight away */
function crMusAsk(o){crAsk(o);if(!o.input||CRF.askAuto)return;const i=$('craskin');try{if(i&&i.focus){i.focus();if(i.select)i.select();}}catch(e){}}
function crMusDone(){if(!crSongCount(CRMU.m)){crToast('Add a note first. A silent disc is bold, but no.');return;}
  crMusAsk({title:'Press the disc?',text:'You get the one and only copy and the record player is cleared.',input:{value:'Untitled Song',max:CRC.TITLE,ph:'Song title'},
    ok:'Press it',no:'Keep working',onOk:v=>{crMusStop();const ctx=CRMU.ctx;if(!crCtxRec(ctx)&&!crMusSave(crSongPack(CRMU.m)))return;if(crEndWork(ctx,v))crUIClose();}});}
/* ---- the preview: the editor's own song, not positional; the playhead runs silently when Sound is off ---- */
function crMusLenS(){return CRMU.m.bars*CRS.STEPS*crSongStep(CRMU.m.bpm);}
function crMusPosS(){const pv=CRM.prev;if(!pv||!pv.on)return -1;let t;
  if(pv.v&&pv.v.ac.state!=='suspended'){try{t=(pv.v.ac.currentTime||0)-pv.t0;}catch(e){t=0;}}else t=CRF.clock-pv.c0;  /* suspended: the game clock */
  return pv.loop?((t%pv.len)+pv.len)%pv.len:t;}
function crMusPlayStep(){const s=crMusPosS();if(s<0||!CRMU.m)return -1;return Math.min(CRMU.m.bars*CRS.STEPS-1,Math.floor(s/crSongStep(CRMU.m.bpm)));}
function crMusToggle(){if(CRM.prev&&CRM.prev.on)crMusStop();else crMusPlay();}
function crMusPlay(){if(!CRMU.m)return;CRM.prev={on:true,loop:CRMU.loop,v:null,len:crMusLenS(),t0:0,c0:CRF.clock,pend:0};crMusVoiceAt(0);crMusRefresh();}
function crMusVoiceAt(off){const pv=CRM.prev;if(pv.v){crMusKill(pv.v);pv.v=null;}pv.len=crMusLenS();pv.loop=CRMU.loop;const ac=crMusAC();
  CRMU.msg=ac?'':'Sound is off (Settings)';
  pv.c0=CRF.clock-off;if(!ac){pv.bpm=CRMU.m.bpm;return;}
  try{const sr=crMusSR(ac),data=crSynMix(CRMU.m,sr,{once:!pv.loop});pv.v=crMusVoice(ac,crMusMakeBuf(ac,data,sr),off,pv.loop,0);pv.t0=(ac.currentTime||0)-off;
    crMusSet(pv.v.g.gain,0.85,ac.currentTime||0,0.012);crMusDeadman(pv.v.g.gain,ac.currentTime||0);}catch(e){crFail('music preview',e);pv.v=null;pv.c0=CRF.clock-off;}
  pv.bpm=CRMU.m.bpm;}
/* after an edit (debounced): start again at the same musical position (a tempo change keeps the step, not the second) */
function crMusRestart(){const pv=CRM.prev;if(!pv||!pv.on)return;const st=crMusPosS()/crSongStep(pv.bpm||CRMU.m.bpm),len=crMusLenS();
  let off=st*crSongStep(CRMU.m.bpm);if(!(off>=0))off=0;if(pv.loop||CRMU.loop)off%=len;else if(off>=len){crMusStop();return;}crMusVoiceAt(off);}
function crMusStop(){const pv=CRM.prev;if(pv){if(pv.v)crMusKill(pv.v);pv.v=null;pv.on=false;}CRM.prev=null;CRMU.msg='';CRMU.lastSt=-1;if(CRMU.el.play)crMusRefresh();}
/* a click on the grid plays that one note once (when sound is on) */
function crMusAudition(t,row,len){const ac=crMusAC();if(!ac||t.m)return;crMusAudStop();
  try{const sr=crMusSR(ac),I=crSongInst(t.i),b=crSynNote(t.i,row,len,t.o,I.mel?CRMU.m.key:0,sr,Math.max(0.12,crSongStep(CRMU.m.bpm))),g=I.g*Math.max(0.35,t.vol/CRS.VOL);
    for(let i=0;i<b.length;i++)b[i]=crSynLimit(b[i]*g);const v=crMusVoice(ac,crMusMakeBuf(ac,b,sr),0,false,0);try{v.g.gain.value=0.85;}catch(e){}CRMU.aud=v;}catch(e){crFail('audition',e);}}
function crMusAudStop(){if(CRMU.aud){crMusKill(CRMU.aud);CRMU.aud=null;}}
/* follow the playhead: when it runs off the page on screen, that page turns with it (also back to the first page on the loop).
   Only from the page it was on, so a page you turned to yourself stays put until the playhead gets there; never mid-drag or
   mid-slide, and nothing is rebuilt (just the grid and the bar strip), so a click in progress is never lost (v6.2 review) */
function crMusFollow(st){const L=CRMU.lay,E=CRMU.el;if(!L||!L.sp||!CRMU.m||st<0||CRMU.lastSt==null||CRMU.lastSt<0||CRMU.drag||CRMU.slide)return false;
  const pg=Math.floor(st/L.sp);if(pg===CRMU.page||Math.floor(CRMU.lastSt/L.sp)!==CRMU.page||pg>=crMusNPages())return false;
  CRMU.page=pg;if(E.prev)E.prev.disabled=pg<=0;if(E.next)E.next.disabled=pg>=crMusNPages()-1;return true;}
/* the editor's frame: the playhead, the debounced re-render, the preview's dead-man fade */
function crMusTickUI(dt){const pv=CRM.prev;
  if(crOn!=='music'||!CRMU.m){if(pv)crMusStop();return;}
  if(!pv||!pv.on)return;
  if(pv.pend>0&&(pv.pend-=dt)<=0){pv.pend=0;crMusRestart();}
  if(!CRM.prev)return;
  if(pv.v){const ac=pv.v.ac,now=ac.currentTime||0;crMusSet(pv.v.g.gain,0.85,now,0.012);crMusDeadman(pv.v.g.gain,now);}
  else if(!pv.loop&&crMusAC())CRMU.msg='';
  if(!pv.loop&&crMusPosS()>=pv.len){crMusStop();return;}
  const st=crMusPlayStep();if(st!==CRMU.lastSt){crMusFollow(st);CRMU.lastSt=st;crMusPagesMark();crMusDraw();}}
CRREG.tick.push(crMusTickUI);
/* the UI scale changed (p06e uiRefresh): lay out whichever editor is open again */
function crUIRescale(){
  if(crOn==='paint'&&CRP.el&&CRP.screen==='edit'){crPxLayout();crPxRender();}
  if(crOn==='music'&&CRMU.ctx&&CRMU.m){CRMU.lay=crMusLayout();crMusBuild();crMusRefresh();}
}
Object.assign(CREX,{CR_INST,CRS,crSongBlank,crSongValid,crSongLen,crSongRender,crSongThumb,crDuckNow,crMusicUI,crSongNorm,crSongPack,crSongFreq,
  crSongNoteName,crSongInst,crSongRows,crSongPackN,crSongUnpackN,crSongCount,crSynMix,crSynNote,crJukeTick,crJukeReset,crJukeNear,crJukeGain,crJukePan,
  crMusCellXY,crMusFollow,crMusInfo:()=>({CRM,CRMU}),crMusSetAC:ac=>{CRM.acTest=ac||null;},crMusTick:()=>musicTick,
  crMusSound:v=>{if(v!==undefined)soundOn=!!v;return soundOn;},crMusMusic:v=>{if(v!==undefined)musicOn=!!v;return musicOn;}});

