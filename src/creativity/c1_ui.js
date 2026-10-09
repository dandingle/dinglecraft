/* ---- PART 56: c1_ui.js ---- */
/* PART 56 c1_ui.js (C1, paintings): the easel editor, rendered into #crpaintwin (CREATIVITY_PLAN.md 7.2).
   Screen A (an empty easel): pick a size, 64x64 / 128x64 / 64x128. Screen B: the pixel editor. Left: Pencil (B), Eraser (E),
   Fill (G), Picker (I), brush 1/2/3 ([ ]), Undo (Ctrl/Cmd+Z), Redo (Ctrl+Y, Ctrl+Shift+Z), Clear. Centre: the canvas at the largest
   integer zoom that fits, a checker under empty pixels, optional pixel grid. Right: a 1:1 preview (as it will hang), the current
   colour, 24 swatches (keys 1-9, 0 pick the first ten). Left click paints with the tool, right click erases (any tool), Alt+click
   picks a colour. One stroke (pointer down to up) is one undo step (50 deep, memory only); every stroke end is saved through
   crSetData, so Esc, walking away, death or a reload never lose more than the stroke in flight. Done (crAsk, a title) gives the one
   and only painting and clears the easel; New (crAsk) bins the canvas and goes back to Screen A.
   Every handler is an on<event> property on an element this file created (the node suites drive them through the stub DOM). */
var CRP={ctx:null,n:0,w:0,h:0,px:null,undo:[],redo:[],stroke:null,z:8,el:null,img:null,vw:0,vh:0,screen:'',
  tool:'pencil',prev:'pencil',size:1,col:1,grid:null,hover:null};
const CRP_UNDO=50;
const CRP_TOOLS=[['pencil','Pencil','B'],['eraser','Eraser','E'],['fill','Fill','G'],['pick','Picker','I']];
const CRP_ICONS={
  pencil:['.........kk.','........kppk','.......kgppk','......kyogk.','.....kyyok..','....kyyok...','...kyyok....','..kyyok.....',
    '.ktyok......','.kttk.......','kkkk........','............'],
  eraser:['............','......kkk...','.....kpppk..','....kppppk..','...kppppk...','..kwkppk....','.kwwwkk.....','kwwwwk......',
    '.kwwk.......','..kk........','.....kkkkkk.','............'],
  fill:['....kk......','...k..k.....','..k....k....','.kkkkkkkk...','.kwwwwwwkb..','.kwwwwwwkbb.','.kwwwwwwk.b.','..kwwwwk..b.',
    '..kwwwwk....','...kkkk.....','............','............'],
  pick:['.........kk.','........kggk','.......kgggk','......kkggk.','.....kwkk...','....kwwk....','...kwwk.....','..kwwk......',
    '.kbbk.......','.kbk........','k...........','............']};
const CRP_ICOL={k:'#262626',p:'#f08aa0',g:'#9a9a9a',y:'#f2c84a',o:'#c8901e',t:'#e8c89a',w:'#f4f4f4',b:'#3b6fe8'};
const CRP_SIZES=[[64,64,'Square','2\u00d72 blocks'],[128,64,'Wide','4\u00d72 blocks'],[64,128,'Tall','2\u00d74 blocks']];
const CRP_CSS=[
  '#crpaintwin{padding:10px 12px 8px;max-width:97%}',
  '.crp-top{display:flex;align-items:center;gap:6px;margin:0 0 8px}',
  ".crp-title{font:bold 17px 'Courier New',monospace;color:#3f3f3f;margin-right:auto;white-space:nowrap}",
  '.crp-title small{font-size:13px;color:#5f5f5f;margin-left:8px}',
  '.crp-top .mc-btn{margin:0}',
  '.mc-btn.crp-done{background:linear-gradient(#6fae4a,#3f7a2a);border-color:#c8f0b0 #1f3d14 #1f3d14 #c8f0b0}',
  '.crp-body{display:flex;gap:10px;align-items:flex-start}',
  '.crp-col{display:flex;flex-direction:column;gap:4px;flex:none}',
  '.crp-tools{width:104px}',
  '.crp-tools .crtool{justify-content:flex-start;gap:6px;padding:0 6px}',
  '.crp-tools .crtool canvas{width:24px;height:24px;flex:none}',
  '.crp-key{color:#e8e8e8;font-size:11px;margin-left:auto;opacity:.8}',
  '.crp-row{display:flex;gap:4px}',
  '.crp-row .crtool{flex:1;min-width:0;padding:0;justify-content:center}',
  '.crp-tools .crp-wide{justify-content:center}',
  '.crp-dot{background:#262626;box-shadow:0 0 0 1px #e8e8e8}',
  ".crp-lab{font:bold 12px 'Courier New',monospace;color:#3f3f3f;margin:4px 0 0}",
  '.crp-stage{position:relative;flex:none;border:2px solid;border-color:#555 #fff #fff #555;cursor:crosshair;touch-action:none;box-sizing:content-box;background-color:#f7f7f7;zoom:calc(1 / var(--uiz,1))}',
  '.crp-stage canvas{position:absolute;left:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges}',
  '.crp-gridc{pointer-events:none}',
  '.crp-cur{position:absolute;pointer-events:none;border:1px solid #fff;box-shadow:0 0 0 1px #000,inset 0 0 0 1px #000;display:none}',
  '.crp-side{width:160px}',
  '.crp-prev{display:block;border:2px solid;border-color:#555 #fff #fff #555;image-rendering:pixelated;image-rendering:crisp-edges;background:#efe7d2;box-sizing:content-box}',
  ".crp-now{height:30px;border:2px solid #2f2f2f;display:flex;align-items:center;justify-content:center;font:bold 12px 'Courier New',monospace;color:#fff;text-shadow:1px 1px 0 #000,-1px -1px 0 #000}",
  '.crp-pal{display:grid;grid-template-columns:repeat(4,37px);gap:4px}',
  '.crp-sw{width:37px;height:30px;padding:0;margin:0;border:2px solid;border-color:#e0e0e0 #2f2f2f #2f2f2f #e0e0e0;cursor:pointer}',
  '.crp-sw.on{outline:3px solid #fff;outline-offset:-6px;box-shadow:0 0 0 2px #1a1a1a}',
  ".crp-hint{font:12px 'Courier New',monospace;color:#4f4f4f;margin-top:6px}",
  '.crp-pick{display:flex;gap:14px;justify-content:center;margin:8px 0 12px}',
  ".crp-size{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;width:176px;height:200px;padding:12px 8px 10px;margin:0;font:bold 15px 'Courier New',monospace;color:#fff;text-shadow:2px 2px 0 #3f3f3f;cursor:pointer;background:linear-gradient(#a8a8a8,#7d7d7d);border:2px solid;border-color:#e0e0e0 #2f2f2f #2f2f2f #e0e0e0}",
  '.crp-size:hover{background:linear-gradient(#b8c8a8,#7d9d6d)}',
  '.crp-size small{font-size:12px;color:#ececec;text-shadow:1px 1px 0 #3f3f3f}',
  '.crp-shape{background:#efe7d2;border:3px solid #6e4420;box-shadow:2px 2px 0 rgba(0,0,0,.35);margin:auto 0 4px}',
  ".crp-note{font:14px 'Courier New',monospace;color:#3f3f3f;text-align:center;margin:0 0 10px;line-height:1.45}"].join('\n');
function crPxCSS(){crCSS('crp-css',CRP_CSS);}
function crPxEl(tag,cls,parent,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;if(parent)parent.appendChild(e);return e;}
function crPxWipe(win){if(!win)return;win.textContent='';if(Array.isArray(win.children))win.children.length=0;}
function crPxIcon(parent,name){const c=crPxEl('canvas','',parent);c.width=c.height=12;const g=c.getContext('2d'),I=CRP_ICONS[name];
  if(g&&I)I.forEach((row,y)=>{for(let x=0;x<row.length;x++){const col=CRP_ICOL[row[x]];if(col){g.fillStyle=col;g.fillRect(x,y,1,1);}}});return c;}
/* the largest integer zoom (2..12) that fits the window: 97vw x 95vh less the columns (104 + 160), gaps, padding, top bar, hint.
   Release 1.0: those columns grow with the UI scale (uiZ, p06e); the stage itself is un-zoomed (.crp-stage), so its zoom is whole
   CSS pixels per art pixel at any UI scale */
function crPxZoom(w,h){const vw=typeof innerWidth==='number'&&innerWidth>0?innerWidth:1280,vh=typeof innerHeight==='number'&&innerHeight>0?innerHeight:720;
  const u=typeof uiZ==='function'?uiZ():1,aw=vw*0.97-(24+8+104+160+20+4)*u,ah=vh*0.95-(20+8+44+24+4)*u;
  return Math.max(2,Math.min(12,Math.floor(Math.min(aw/w,ah/h))));}

/* ===== Screen A: a fresh canvas ===== */
function crPxPicker(){const win=$('crpaintwin');crPxWipe(win);CRP.screen='pick';CRP.n=0;CRP.px=null;CRP.stroke=null;CRP.img=null;
  const E={win,sizes:[]};CRP.el=E;
  const top=crPxEl('div','crp-top',win);crPxEl('div','crp-title',top,'New canvas');
  E.close=crPxEl('button','mc-btn small',top,'Close');E.close.title='Esc';E.close.onclick=()=>crUIClose();
  const row=crPxEl('div','crp-pick',win);
  for(const [w,h,name,blocks] of CRP_SIZES){const b=crPxEl('button','crp-size',row);
    const sh=crPxEl('div','crp-shape',b);sh.style.width=(w*0.9|0)+'px';sh.style.height=(h*0.9|0)+'px';
    crPxEl('span','',b,name+' '+w+'\u00d7'+h);crPxEl('small','',b,blocks+' on a wall');
    b.onclick=()=>crPxStart(w,h);b.title=name+': '+w+'\u00d7'+h+' pixels, hangs '+blocks;E.sizes.push(b);}
  crPxEl('div','crp-note',win,'Pick a size. You can leave whenever you like: the easel keeps your work.');}
function crPxStart(w,h){const ctx=CRP.ctx;if(!ctx||CRP.screen!=='pick')return 0;
  const n=crStartWork(ctx,{w,h,d:crArtBlank(w,h)});if(n)crPxEdit();return n;}

/* ===== Screen B: the editor ===== */
function crPxEdit(){const ctx=CRP.ctx,n=ctx&&ctx.be?crWorkN(ctx.be.id):0,r=crRec(n);
  if(!r||r.k!=='art'||r.st!=='wip'){crPxPicker();return;}
  CRP.screen='edit';CRP.n=n;CRP.w=r.w;CRP.h=r.h;CRP.px=crArtDecode(r.d,r.w,r.h);CRP.undo=[];CRP.redo=[];CRP.stroke=null;CRP.img=null;CRP.hover=null;
  if(CRP.tool==='pick')CRP.tool=CRP.prev||'pencil';
  const win=$('crpaintwin');crPxWipe(win);const E={win,tools:{},sizes:[],sw:[]};CRP.el=E;
  /* top bar */
  const top=crPxEl('div','crp-top',win),tt=crPxEl('div','crp-title',top,'Painting');crPxEl('small','',tt,r.w+'\u00d7'+r.h+' \u00b7 '+(r.w/CRC.PXB)+'\u00d7'+(r.h/CRC.PXB)+' blocks');
  E.grid=crPxEl('button','crtool',top,'Grid');E.grid.title='Pixel grid lines';E.grid.onclick=()=>crPxGrid();
  E.newb=crPxEl('button','mc-btn small',top,'New');E.newb.title='Bin this canvas and start a new one';E.newb.onclick=()=>crPxNew();
  E.close=crPxEl('button','mc-btn small',top,'Close');E.close.title='Esc. Your work stays on the easel.';E.close.onclick=()=>crUIClose();
  E.done=crPxEl('button','mc-btn small crp-done',top,'Done');E.done.title='Finish: you get the painting';E.done.onclick=()=>crPxDone();
  const body=crPxEl('div','crp-body',win);
  /* left: tools */
  const L=crPxEl('div','crp-col crp-tools',body);
  for(const [k,name,key] of CRP_TOOLS){const b=crPxEl('button','crtool',L);crPxIcon(b,k);crPxEl('span','',b,name);crPxEl('span','crp-key',b,key);
    b.title=name+' ('+key+')'+(k==='eraser'?'. Right-click erases with any tool.':k==='pick'?'. Or Alt+click.':k==='fill'?'. Fills the touching area of one colour.':'');
    b.onclick=()=>crPxTool(k);E.tools[k]=b;}
  crPxEl('div','crp-lab',L,'Brush');
  const sr=crPxEl('div','crp-row',L);
  for(let s=1;s<=3;s++){const b=crPxEl('button','crtool',sr);const d=crPxEl('div','crp-dot',b);d.style.width=d.style.height=(s*4)+'px';
    b.title='Brush '+s+'\u00d7'+s+' ([ and ])';b.onclick=()=>crPxSize(s);E.sizes.push(b);}
  crPxEl('div','crp-lab',L,'Oops');
  const ur=crPxEl('div','crp-row',L);
  E.undo=crPxEl('button','crtool',ur,'Undo');E.undo.title='Undo (Ctrl/Cmd+Z)';E.undo.onclick=()=>crPxUndo();
  E.redo=crPxEl('button','crtool',ur,'Redo');E.redo.title='Redo (Ctrl+Y or Ctrl+Shift+Z)';E.redo.onclick=()=>crPxRedo();
  E.clear=crPxEl('button','crtool crp-wide',L,'Clear');E.clear.title='Empty the whole canvas (Undo brings it back)';E.clear.onclick=()=>crPxClear();
  /* centre: the canvas */
  const S=crPxEl('div','crp-stage',body);E.stage=S;
  E.art=crPxEl('canvas','',S);E.art.width=r.w;E.art.height=r.h;E.g=E.art.getContext('2d');
  E.gridc=crPxEl('canvas','crp-gridc',S);E.cur=crPxEl('div','crp-cur',S);
  S.onpointerdown=e=>crPxDown(e);S.onpointermove=e=>crPxMove(e);S.onpointerup=e=>crPxUp(e);S.onpointercancel=e=>crPxUp(e);
  S.onlostpointercapture=e=>crPxUp(e);S.onpointerleave=()=>{CRP.hover=null;crPxCursor();};
  S.oncontextmenu=e=>{if(e&&e.preventDefault)e.preventDefault();return false;};S.ondragstart=e=>{if(e&&e.preventDefault)e.preventDefault();return false;};
  /* right: preview, colour, palette */
  const R=crPxEl('div','crp-col crp-side',body);
  crPxEl('div','crp-lab',R,'Preview');E.prev=crPxEl('canvas','crp-prev',R);E.prev.width=r.w;E.prev.height=r.h;E.pg=E.prev.getContext('2d');
  E.prev.title='How it will look on a wall';
  crPxEl('div','crp-lab',R,'Colour');E.now=crPxEl('div','crp-now',R);
  const pal=crPxEl('div','crp-pal',R);
  CR_PALETTE.forEach((c,i)=>{const b=crPxEl('button','crp-sw',pal);b.style.background=c;b.title=CRP_NAMES[i]+(i<10?' ('+((i+1)%10)+')':'');
    b.onclick=()=>crPxColour(i+1);E.sw.push(b);});
  crPxEl('div','crp-hint',win,'Left-click paints. Right-click erases. Alt+click picks a colour. Every stroke is saved as you go.');
  crPxLayout();crPxRender();crPxSync();}
function crPxLayout(){const E=CRP.el;if(!E||CRP.screen!=='edit')return;const w=CRP.w,h=CRP.h,z=crPxZoom(w,h);CRP.z=z;
  CRP.vw=typeof innerWidth==='number'?innerWidth:0;CRP.vh=typeof innerHeight==='number'?innerHeight:0;CRP.uz=typeof uiZ==='function'?uiZ():1;
  const W=w*z+'px',H=h*z+'px';E.stage.style.width=W;E.stage.style.height=H;E.art.style.width=W;E.art.style.height=H;
  E.gridc.width=w*z;E.gridc.height=h*z;E.gridc.style.width=W;E.gridc.style.height=H;
  E.stage.style.backgroundImage='linear-gradient(45deg,#dcdcdc 25%,transparent 25%,transparent 75%,#dcdcdc 75%),linear-gradient(45deg,#dcdcdc 25%,transparent 25%,transparent 75%,#dcdcdc 75%)';
  E.stage.style.backgroundSize=(2*z)+'px '+(2*z)+'px';E.stage.style.backgroundPosition='0 0,'+z+'px '+z+'px';
  const ps=Math.min(1,156/w,156/h);E.prev.style.width=Math.round(w*ps)+'px';E.prev.style.height=Math.round(h*ps)+'px';
  crPxGridDraw();crPxCursor();}
function crPxGridOn(){return CRP.grid===null?CRP.z>=6:CRP.grid;}
function crPxGridDraw(){const E=CRP.el;if(!E||!E.gridc)return;const g=E.gridc.getContext('2d');if(!g)return;const z=CRP.z,w=CRP.w,h=CRP.h;
  g.clearRect(0,0,w*z,h*z);if(!crPxGridOn())return;
  for(let x=1;x<w;x++){g.fillStyle=x%8?'rgba(0,0,0,.13)':'rgba(0,0,0,.32)';g.fillRect(x*z,0,1,h*z);}
  for(let y=1;y<h;y++){g.fillStyle=y%8?'rgba(0,0,0,.13)':'rgba(0,0,0,.32)';g.fillRect(0,y*z,w*z,1);}}
/* draw the pixels (empty = transparent over the checker) and the 1:1 preview (empty = the canvas colour, as it will hang) */
function crPxRender(){const E=CRP.el;if(!E||!E.g||!CRP.px)return;
  if(!CRP.img&&typeof E.g.getImageData==='function')CRP.img=E.g.getImageData(0,0,CRP.w,CRP.h);
  if(CRP.img&&CRP.img.data&&CRP.img.data.length>=CRP.w*CRP.h*4){crArtFill(CRP.img.data,CRP.px,null);E.g.putImageData(CRP.img,0,0);}
  if(E.pg){E.pg.fillStyle=CRP_CANVAS;E.pg.fillRect(0,0,CRP.w,CRP.h);E.pg.drawImage(E.art,0,0);}}
function crPxCursor(){const E=CRP.el;if(!E||!E.cur)return;const h=CRP.hover;
  if(!h||CRP.tool==='fill'||CRP.tool==='pick'){E.cur.style.display='none';return;}
  const s=CRP.size,o=(s-1)>>1,z=CRP.z;E.cur.style.display='block';E.cur.style.left=((h[0]-o)*z)+'px';E.cur.style.top=((h[1]-o)*z)+'px';
  E.cur.style.width=E.cur.style.height=(s*z)+'px';}
/* buttons and swatches reflect the state */
function crPxSync(){const E=CRP.el;if(!E||CRP.screen!=='edit')return;
  for(const k in E.tools)E.tools[k].className='crtool'+(CRP.tool===k?' on':'');
  E.sizes.forEach((b,i)=>{b.className='crtool'+(CRP.size===i+1?' on':'');});
  E.sw.forEach((b,i)=>{b.className='crp-sw'+(CRP.col===i+1?' on':'');});
  E.grid.className='crtool'+(crPxGridOn()?' on':'');
  E.undo.disabled=!CRP.undo.length;E.redo.disabled=!CRP.redo.length;
  const c=CR_PALETTE[CRP.col-1],er=CRP.tool==='eraser';
  E.now.style.background=er?'repeating-conic-gradient(#dcdcdc 0 25%,#f7f7f7 0 50%) 0 0/12px 12px':c;
  E.now.textContent=er?'Eraser':CRP_NAMES[CRP.col-1];
  crPxCursor();}
function crPxTool(t){if(!CRP_TOOLS.some(x=>x[0]===t))return;if(t==='pick'&&CRP.tool!=='pick')CRP.prev=CRP.tool;CRP.tool=t;crPxSync();}
function crPxSize(s){CRP.size=Math.max(1,Math.min(3,s|0));crPxSync();}
function crPxColour(i){if(!(i>=1&&i<=CR_PALETTE.length))return;CRP.col=i;if(CRP.tool==='eraser')CRP.tool='pencil';else if(CRP.tool==='pick')CRP.tool=CRP.prev||'pencil';crPxSync();}
function crPxGrid(){CRP.grid=!crPxGridOn();crPxGridDraw();crPxSync();}

/* ===== painting ===== */
function crPxIn(x,y){return x>=0&&y>=0&&x<CRP.w&&y<CRP.h;}
function crPxXY(e){const E=CRP.el,r=E&&E.art&&E.art.getBoundingClientRect?E.art.getBoundingClientRect():null;if(!r)return null;
  const rw=r.width||1,rh=r.height||1;return [Math.floor((e.clientX-r.left)/rw*CRP.w),Math.floor((e.clientY-r.top)/rh*CRP.h)];}
function crPxStamp(x,y,c){const s=CRP.size,o=(s-1)>>1;let ch=false;
  for(let j=0;j<s;j++)for(let i=0;i<s;i++){const X=x-o+i,Y=y-o+j;if(crPxIn(X,Y)){const k=Y*CRP.w+X;if(CRP.px[k]!==c){CRP.px[k]=c;ch=true;}}}return ch;}
function crPxLine(x0,y0,x1,y1,c){const W=CRP.w,H=CRP.h,cl=(v,m)=>Math.max(-m,Math.min(2*m,v));x0=cl(x0,W);x1=cl(x1,W);y0=cl(y0,H);y1=cl(y1,H);
  const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let err=dx+dy,ch=false;
  for(let n=0;n<4096;n++){if(crPxStamp(x0,y0,c))ch=true;if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}
  return ch;}
function crPxFlood(x,y,c){if(!crPxIn(x,y))return false;const W=CRP.w,H=CRP.h,px=CRP.px,s=y*W+x,t=px[s];if(t===c)return false;
  const st=[s];px[s]=c;
  while(st.length){const k=st.pop(),X=k%W,Y=(k/W)|0;
    if(X>0&&px[k-1]===t){px[k-1]=c;st.push(k-1);}if(X<W-1&&px[k+1]===t){px[k+1]=c;st.push(k+1);}
    if(Y>0&&px[k-W]===t){px[k-W]=c;st.push(k-W);}if(Y<H-1&&px[k+W]===t){px[k+W]=c;st.push(k+W);}}
  return true;}
function crPxPickAt(x,y){if(!crPxIn(x,y))return false;const v=CRP.px[y*CRP.w+x];if(v)CRP.col=v;
  if(CRP.tool==='pick')CRP.tool=CRP.prev||'pencil';else if(v&&CRP.tool==='eraser')CRP.tool='pencil';crPxSync();return !!v;}
/* save the canvas into the work (one crSetData) right after each step (stroke, fill, clear, undo, redo), so nothing else is ever
   pending; false when c0 refuses it (gallery full): the caller rolls the step back */
function crPxCommit(){if(!CRP.n||!CRP.px)return true;const r=crRec(CRP.n);if(!r||r.st!=='wip')return false;
  const d=crArtEncode(CRP.px,CRP.w,CRP.h);if(r.d===d)return true;return crSetData(CRP.n,d);}
function crPxStep(snap){CRP.undo.push(snap);if(CRP.undo.length>CRP_UNDO)CRP.undo.shift();CRP.redo.length=0;
  if(!crPxCommit()){CRP.px=CRP.undo.pop();crPxRender();crPxSync();return false;}
  crPxRender();crPxSync();return true;}
function crPxDown(e){if(CRP.screen!=='edit'||!CRP.px)return;const b=e.button|0;if(b!==0&&b!==2)return;
  if(e.preventDefault)e.preventDefault();
  if(CRP.stroke)crPxEnd();
  const p=crPxXY(e);if(!p||!crPxIn(p[0],p[1]))return;CRP.hover=p;
  if(b===0&&(e.altKey||CRP.tool==='pick')){crPxPickAt(p[0],p[1]);return;}
  const erase=b===2||(b===0&&e.ctrlKey)||CRP.tool==='eraser',     /* Ctrl+click is a right-click on a Mac trackpad */c=erase?0:CRP.col,snap=CRP.px.slice();
  if(CRP.tool==='fill'){if(crPxFlood(p[0],p[1],c))crPxStep(snap);return;}
  CRP.stroke={c,snap,last:p,ch:crPxStamp(p[0],p[1],c),id:e.pointerId};
  try{if(e.pointerId!=null&&CRP.el.stage.setPointerCapture)CRP.el.stage.setPointerCapture(e.pointerId);}catch(err){}
  crPxRender();crPxCursor();}
function crPxMove(e){if(CRP.screen!=='edit')return;const p=crPxXY(e);if(!p)return;
  CRP.hover=crPxIn(p[0],p[1])?p:null;const s=CRP.stroke;
  if(s){if(e.buttons===0&&e.pointerType!=='touch'){crPxEnd();crPxCursor();return;}       /* the button came up outside the page */
    if(crPxLine(s.last[0],s.last[1],p[0],p[1],s.c))s.ch=true;s.last=p;crPxRender();}
  crPxCursor();}
function crPxUp(e){if(CRP.stroke){if(e&&e.preventDefault)e.preventDefault();crPxEnd();}}
function crPxEnd(){const s=CRP.stroke;if(!s)return false;CRP.stroke=null;if(!s.ch)return false;return crPxStep(s.snap);}
function crPxUndo(){if(CRP.screen!=='edit'||!CRP.undo.length)return false;crPxEnd();const cur=CRP.px;CRP.px=CRP.undo.pop();
  if(!crPxCommit()){CRP.undo.push(CRP.px);CRP.px=cur;return false;}CRP.redo.push(cur);crPxRender();crPxSync();return true;}
function crPxRedo(){if(CRP.screen!=='edit'||!CRP.redo.length)return false;crPxEnd();const cur=CRP.px;CRP.px=CRP.redo.pop();
  if(!crPxCommit()){CRP.redo.push(CRP.px);CRP.px=cur;return false;}CRP.undo.push(cur);if(CRP.undo.length>CRP_UNDO)CRP.undo.shift();crPxRender();crPxSync();return true;}
function crPxClear(){if(CRP.screen!=='edit')return false;crPxEnd();if(crArtEmpty(CRP.px))return false;const snap=CRP.px.slice();CRP.px.fill(0);return crPxStep(snap);}
function crPxNew(){if(CRP.screen!=='edit')return;crPxEnd();const ctx=CRP.ctx;
  const go=()=>{if(CRP.ctx!==ctx||CRP.screen!=='edit')return;if(crDropWork(ctx)){CRP.n=0;crPxPicker();}};
  if(crArtEmpty(CRP.px)){go();return;}
  crAsk({title:'Start over?',text:'This canvas goes in the bin and you pick a new size. Undo cannot bring it back.',ok:'Bin it',no:'Keep painting',onOk:go});}
function crPxDone(){if(CRP.screen!=='edit')return;crPxEnd();const ctx=CRP.ctx;
  crAsk({title:'Finish this painting?',text:'You get the one and only copy and the easel is cleared.',input:{value:'Untitled',max:CRC.TITLE,ph:'Title'},
    ok:'Finish',no:'Keep painting',onOk:t=>{if(CRP.ctx!==ctx||CRP.screen!=='edit')return;
      if(crEndWork(ctx,crTitle(t)||'Untitled')){CRP.n=0;CRP.screen='';crUIClose();}}});
  crPxFocusAsk();}
/* crAsk focuses its field before its overlay is shown (a hidden field cannot take focus): focus it again once it is visible */
function crPxFocusAsk(){const i=$('craskin');if(!CRF.ask||!i||typeof i.focus!=='function')return;try{i.focus();if(i.select)i.select();}catch(e){}}
/* keys (c0's crKey sends every key here while the editor is open, except typing in the title field). Esc: c0 closes us. */
function crPxKey(e,esc){if(esc||CRP.screen!=='edit')return false;const c=e.code||'',mod=e.ctrlKey||e.metaKey;let hit=true;
  if(mod&&c==='KeyZ'){if(e.shiftKey)crPxRedo();else crPxUndo();}
  else if(mod&&c==='KeyY')crPxRedo();
  else if(mod)hit=false;
  else if(c==='KeyB')crPxTool('pencil');else if(c==='KeyE')crPxTool('eraser');else if(c==='KeyG')crPxTool('fill');else if(c==='KeyI')crPxTool('pick');
  else if(c==='BracketLeft')crPxSize(CRP.size-1);else if(c==='BracketRight')crPxSize(CRP.size+1);
  else if(/^Digit[0-9]$/.test(c)){const d=+c.slice(5);crPxColour(d===0?10:d);}
  else if(c==='Space'||c==='Enter'||c==='NumpadEnter'){}  /* swallowed: the last-clicked button keeps focus, and these would press it again */
  else hit=false;
  if(hit&&e.preventDefault)e.preventDefault();return hit;}
function crPxTick(dt){if(crOn!=='paint'||CRP.screen!=='edit')return;
  if(typeof innerWidth==='number'&&(innerWidth!==CRP.vw||innerHeight!==CRP.vh||(typeof uiZ==='function'&&uiZ()!==CRP.uz)))crPxLayout();}
var crPaintUI={
  open(ctx){crPxCSS();CRP.ctx=ctx||null;CRP.stroke=null;const r=crCtxRec(ctx);
    if(r&&r.k==='art'&&r.st==='wip')crPxEdit();else crPxPicker();},
  close(force){if(CRP.stroke)crPxEnd();     /* every finished step is already saved: only a stroke in flight is pending */
    crPxWipe($('crpaintwin'));CRP.ctx=null;CRP.n=0;CRP.px=null;CRP.el=null;CRP.img=null;CRP.screen='';CRP.undo=[];CRP.redo=[];CRP.hover=null;},
  key(e,esc){return crPxKey(e,esc);}};
CRREG.ui.paint=crPaintUI;
CRREG.tick.push(crPxTick);
Object.assign(CREX,{crPaintUI,getCRP:()=>CRP,crPxStart,crPxTool,crPxSize,crPxColour,crPxUndo,crPxRedo,crPxClear,crPxNew,crPxDone,crPxGrid,crPxZoom,crPxKey});
