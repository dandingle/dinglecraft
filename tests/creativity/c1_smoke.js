/* c1_smoke.js (C1, gate x2): the paintings package in behaviour (CREATIVITY_PLAN.md 7.4), headless on a real seed-1337 world.
   Booted with the texture-pack stubs A + B and fake art so a Hyperreal session can run at the end.
   1 inert · 2 the easel's chunk mesh (replaces the cross, 4 facings, board sized to the canvas, never a cube face shade) · 3 the size
   picker through the real right-click · 4 strokes through the stage's real pointer handlers (click, fast diagonal drag, brush sizes,
   right-click erase, fill 4-connected, picker + Alt+click, keyboard shortcuts) · 5 undo / redo (one step per stroke, depth 50) and
   clear · 6 persistence (Esc mid-stroke, close / reopen, save / load, an easel destroyed mid-stroke) · 7 the easel's live canvas ·
   8 New (confirm, and none on an empty canvas) · 9 Done (title, one painting, easel cleared) · 10 painting meshes on four facings and
   three sizes (Lambert, nearest CanvasTexture, position = crPaintGeom, face shade) · 11 lifecycle (take down, render distance,
   dimension change, reset, nothing built while nothing hangs) · 12 Hyperreal adopts the painting (filters stay nearest) and lets go. */
'use strict';
const boot=require('../lib/c_boot.js'),{ok,skip}=boot;
const V=boot({stubs:['A','B'],assets:'fake'});
const step=boot.stepper(600000);
const C=V.crCore(),B=V.B,CRC=V.CRC,CR=()=>V.getCR(),S=require('../lib/hr_boot.js').scene();   /* the game's main scene */
const P=new Proxy({},{get:(t,k)=>V.P[k],set:(t,k,v)=>{V.P[k]=v;return true;}});
const aim=(x,y,z)=>boot.aim(V,x,y,z),rclick=()=>boot.rclick(V,step),give=(id,s)=>boot.give(V,id,s);
const drops=id=>V.entities.filter(e=>e.t==='drop'&&!e.dead&&(id==null||e.st.id===id));
const cnt=id=>V.P.inv.reduce((n,s)=>n+(s&&s.id===id?s.count:0),0),has=id=>cnt(id)>0;
const tp=(x,z,y)=>{P.x=x;P.z=z;if(y!=null)P.y=y;P.vx=P.vy=P.vz=0;P.fallD=0;step(2);};
const pickAll=id=>{const x=P.x,y=P.y,z=P.z;let m=false;for(const e of drops(id)){tp(e.x,e.z,Math.floor(e.y));step(20);m=true;}if(m)tp(x,z,y);};
const emptyHand=()=>{let i=V.P.inv.findIndex((q,k)=>!q&&k<9);if(i<0){const e=V.P.inv.findIndex((q,k)=>!q&&k>8);i=0;if(e>0)V.P.inv[e]=V.P.inv[0];V.P.inv[0]=null;}P.sel=i;V.refreshHand();};
const select=id=>{let i=V.P.inv.findIndex(q=>q&&q.id===id);if(i<0)return false;if(i>8){const t=V.P.inv[8];V.P.inv[8]=V.P.inv[i];V.P.inv[i]=t;i=8;}P.sel=i;V.refreshHand();return true;};
const esc=()=>{V.crKey({code:'Escape',target:null});step(2);};
const key=(code,o)=>V.crKey(Object.assign({code,target:null,preventDefault(){}},o||{}));
const CRP=()=>V.getCRP(),E=()=>V.getCRP().el;
/* pointer events on the editor's stage, at pixel (x,y): clientX/Y from the art canvas's bounding rect (the stub's rect is 1280x720) */
const ev=(x,y,o)=>{const r=E().art.getBoundingClientRect(),p=CRP();return Object.assign({clientX:r.left+(x+0.5)/p.w*r.width,clientY:r.top+(y+0.5)/p.h*r.height,
  button:0,buttons:1,pointerId:7,pointerType:'mouse',altKey:false,preventDefault(){}},o||{});};
const down=(x,y,o)=>E().stage.onpointerdown(ev(x,y,o)),move=(x,y,o)=>E().stage.onpointermove(ev(x,y,Object.assign({buttons:1},o||{}))),
  up=(x,y,o)=>E().stage.onpointerup(ev(x,y,Object.assign({buttons:0},o||{})));
const click=(x,y,o)=>{down(x,y,o);up(x,y,o);},drag=(pts,o)=>{down(pts[0][0],pts[0][1],o);for(const p of pts.slice(1))move(p[0],p[1],o);const l=pts[pts.length-1];up(l[0],l[1],o);};
const px=(x,y)=>CRP().px[y*CRP().w+x];
const rec=()=>V.crRec(CRP().n),saved=()=>{const r=rec();return r?V.crArtDecode(r.d,r.w,r.h):null;};
const same=(a,b)=>!!a&&!!b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
const cells=id=>{const out=[];for(const [k,b] of V.blockEnts)if(b.t==='crpaint'&&b.id===id)out.push([k,b]);return out;};
const artIn=()=>{let n=0;S.traverse(o=>{if(o.name==='crArt')n++;});return n;};
const PM=()=>V.getCRPM();

boot.run(async()=>{
  if(boot.crStubbed('1')){skip('c1_smoke','C1 is on its stub');return;}
  let o=boot.studio(V,step);
  /* ===== 1. inert ===== */
  ok('a fresh world: no art meshes, nothing in the scene, the tick idle',PM().size===0&&artIn()===0&&!CR().CRF.live);

  /* ===== 2. the easel's chunk mesh ===== */
  give(B.CR_EASEL,0);aim(o.x+2.5,o.y-0.02,o.z+0.5);rclick();
  const ek=(o.x+2)+','+o.y+','+o.z,eb=V.blockEnts.get(ek),EB=()=>V.blockEnts.get(ek)||{};   /* applySave replaces block entities: EB() after a reload */
  ok('(an easel is placed through doUse, facing Dan: -x)',V.getBlock(o.x+2,o.y,o.z)===B.CR_EASEL&&eb&&eb.f===1);
  {const ch=V.chunks.get(Math.floor((o.x+2)/16)+','+Math.floor(o.z/16)),bufs=C.meshChunk(ch),lx=(o.x+2)-ch.cx*16,lz=o.z-ch.cz*16,b=bufs.cut;
    const inTile=(u,v,t)=>{const r=C.tileUV(C.Tl[t]);return u>=r[0]-1e-6&&u<=r[2]+1e-6&&v>=r[1]-1e-6&&v<=r[3]+1e-6;};
    let wood=0,cross=0,canvas=0;for(let i=0;i<b.vc;i++){const x=b.p[i*3],y=b.p[i*3+1],z=b.p[i*3+2];if(x<lx-0.01||x>lx+1.01||z<lz-0.01||z>lz+1.01||y<o.y-0.01||y>o.y+1.1)continue;
      const u=b.u[i*2],v=b.u[i*2+1];if(inTile(u,v,'cr_easel_t'))wood++;if(inTile(u,v,'cr_easel_s'))cross++;if(inTile(u,v,'cr_canvas'))canvas++;}
    ok('the chunk mesh draws a real easel (wood '+wood+', canvas '+canvas+' verts), not the flat cross',wood>=120&&canvas>=16&&cross===0);}
  const raw=(f,id)=>{const b={p:[],n:[],u:[],c:[],ix:[],vc:0};V.crEaselMesh({cut:b},0,0,0,V.DEFS[B.CR_EASEL],null,null,{t:'crease',f,id:id||0});return b;};
  {const shades=[1,0.8,0.65,0.55];let badC=0,vc=0,okF=0;
    for(let f=0;f<4;f++){const b=raw(f),n=CRC.FN[f];vc=b.vc;for(const c of b.c)if(shades.some(s=>Math.abs(c-s)<=0.004))badC++;
      const r=C.tileUV(C.Tl.cr_canvas);let sx=0,sz=0,k=0;
      for(let i=0;i<b.vc;i++){const u=b.u[i*2],v=b.u[i*2+1];if(u>=r[0]-1e-6&&u<=r[2]+1e-6&&v>=r[1]-1e-6&&v<=r[3]+1e-6&&b.n[i*3]===n[0]&&b.n[i*3+2]===n[1]){sx+=b.p[i*3];sz+=b.p[i*3+2];k++;}}
      const off=((sx/k-0.5)*n[0]+(sz/k-0.5)*n[1]);if(k===4&&Math.abs(off-(11.25/16-0.5))<1e-6)okF++;}
    ok('for all four facings the canvas board faces outward (front face 0.203 toward the facing)',okF===4);
    ok('the easel is 8 boxes ('+vc+' verts) and no vertex colour is a cube face shade (Hyperreal never rotates it)',vc===192&&badC===0);
    ok('every vertex stays inside the block column (except the clamp on a tall canvas)',(()=>{const b=raw(2);for(let i=0;i<b.vc;i++){const x=b.p[i*3],z=b.p[i*3+2];if(x<0||x>1||z<0||z>1)return false;}return true;})());}

  /* ===== 3. the size picker through the real right-click ===== */
  emptyHand();aim(o.x+2.5,o.y+0.5,o.z+0.5);rclick();
  ok('right-click on an empty easel opens Screen A: three size buttons',V.crOn()==='paint'&&CRP().screen==='pick'&&E().sizes.length===3);
  esc();ok('Esc closes it, nothing is allocated',!V.crOn()&&eb.id===0&&V.crInfo().works===0);
  rclick();E().sizes[0].onclick();
  const n1=CRP().n,id1=V.crItemId(n1);
  ok('clicking Square starts a 64x64 canvas on the easel and opens the editor',CRP().screen==='edit'&&n1>0&&eb.id===id1&&rec().w===64&&rec().h===64&&rec().st==='wip');
  ok('the editor fits 1280x720: zoom 9, stage 576 px, preview 64x64, grid on by default',CRP().z===9&&E().stage.style.width==='576px'&&E().prev.width===64&&/ on$/.test(E().grid.className));

  /* ===== 4. strokes through the real pointer handlers ===== */
  const u0=rec().u;CRP().col=5;click(5,5);
  ok('a click paints one pixel with the current colour, saved at once (one crSetData)',px(5,5)===5&&saved()[5*64+5]===5&&rec().u===u0+1);
  const u1=rec().u;drag([[0,10],[63,40]]);
  {let cols=0;for(let x=0;x<64;x++){let any=false;for(let y=10;y<=40;y++)if(px(x,y)===5)any=true;if(any)cols++;}
    let gaps=0;for(let x=1;x<64;x++){const ys=[],ys0=[];for(let y=0;y<64;y++){if(px(x,y)===5&&y>=10)ys.push(y);if(px(x-1,y)===5&&y>=10)ys0.push(y);}
      if(!ys.some(a=>ys0.some(b=>Math.abs(a-b)<=1)))gaps++;}
    ok('a fast diagonal drag (one move event across the canvas) leaves a continuous line: all 64 columns, no gaps',cols===64&&gaps===0);}
  ok('one stroke is one save (u '+u1+' -> '+rec().u+')',rec().u===u1+1&&same(saved(),CRP().px));
  E().sizes[2].onclick();CRP().col=8;click(20,52);
  ok('brush 3 stamps a 3x3 square centred on the pixel',[...Array(9)].every((_,i)=>px(19+i%3,51+((i/3)|0))===8)&&px(22,52)!==8&&px(18,52)!==8);
  E().sizes[1].onclick();click(30,52);
  ok('brush 2 stamps a 2x2 square (the pixel and down-right)',px(30,52)===8&&px(31,53)===8&&px(29,52)!==8&&px(30,51)!==8);
  E().sizes[0].onclick();
  click(5,5,{button:2,buttons:2});ok('right-click erases with the pencil selected',px(5,5)===0&&saved()[5*64+5]===0);
  drag([[0,10],[10,13]],{button:2,buttons:2});ok('a right-drag erases a line',px(0,10)===0&&px(10,13)===0);
  {const cc=CRP().col;CRP().col=6;click(20,30);const set=px(20,30)===6;click(20,30,{ctrlKey:true});ok('Ctrl+click erases too (a Mac trackpad right-click)',set&&px(20,30)===0);CRP().col=cc;}
  /* fill: a closed box of black, a diagonal-only neighbour that must NOT be reached */
  CRP().col=1;drag([[40,2],[50,2],[50,12],[40,12],[40,2]]);
  CRP().col=11;E().tools.fill.onclick();click(45,7);
  {let inside=0,leak=0;for(let y=0;y<64;y++)for(let x=0;x<64;x++){const v=px(x,y);if(x>40&&x<50&&y>2&&y<12){if(v===11)inside++;}else if(v===11)leak++;}
    ok('fill floods the inside of a closed outline (81 px) and nothing outside',inside===81&&leak===0&&saved()[7*64+45]===11);}
  CRP().col=1;E().tools.pencil.onclick();click(55,20);click(56,21);E().tools.fill.onclick();CRP().col=13;click(55,20);
  ok('fill is 4-connected: a pixel touching only diagonally stays',px(55,20)===13&&px(56,21)===1);
  const uF=CRP().undo.length;CRP().col=13;click(55,20);ok('a fill that changes nothing adds no undo step',CRP().undo.length===uF);
  E().tools.pick.onclick();click(45,7);ok('the picker takes the colour (Blue) and hands back the previous tool (Fill)',CRP().col===11&&CRP().tool==='fill');
  E().tools.pencil.onclick();click(56,21,{altKey:true});ok('Alt+click picks too, and the pencil stays the pencil',CRP().col===1&&CRP().tool==='pencil');
  ok('the colour bar and the selected swatch follow the colour',E().now.textContent==='Black'&&/ on$/.test(E().sw[0].className)&&!/ on$/.test(E().sw[1].className));
  key('KeyE');const tE=CRP().tool;key('KeyG');const tG=CRP().tool;key('KeyI');const tI=CRP().tool;key('KeyB');const tB=CRP().tool;
  key('BracketRight');key('BracketRight');key('BracketRight');const s3=CRP().size;key('BracketLeft');const s2=CRP().size;key('BracketLeft');key('BracketLeft');
  key('Digit3');const c3=CRP().col;key('Digit0');const c10=CRP().col;
  ok('keys: E eraser, G fill, I picker, B pencil, ] and [ size (1..3), 1-9 and 0 pick swatches 1-10',tE==='eraser'&&tG==='fill'&&tI==='pick'&&tB==='pencil'&&s3===3&&s2===2&&CRP().size===1&&c3===3&&c10===10);
  key('KeyE');key('Digit5');ok('choosing a colour while erasing goes back to the pencil',CRP().tool==='pencil'&&CRP().col===5);
  ok('E never opens the inventory and the editor keeps every key',V.crOn()==='paint'&&!C.MODAL.kind);

  /* ===== 5. undo / redo / clear ===== */
  const before=CRP().px.slice();CRP().col=9;click(1,60);const after=CRP().px.slice();
  key('KeyZ',{ctrlKey:true});ok('Ctrl+Z undoes the last stroke and saves it',same(CRP().px,before)&&same(saved(),before));
  key('KeyZ',{metaKey:true,shiftKey:true});ok('Cmd+Shift+Z redoes it',same(CRP().px,after)&&same(saved(),after));
  key('KeyZ',{ctrlKey:true});key('KeyY',{ctrlKey:true});ok('Ctrl+Y redoes too',same(CRP().px,after));
  key('KeyZ',{ctrlKey:true});click(2,60);ok('a new stroke clears the redo stack',CRP().redo.length===0&&E().redo.disabled===true);
  {const snaps=[];for(let i=0;i<55;i++){snaps.push(CRP().px.slice());CRP().col=1+i%24;click(i,62);}
    let undone=0;while(V.crPxUndo())undone++;
    ok('undo is 50 deep: 55 strokes, 50 undo steps, then the button greys out',undone===50&&same(CRP().px,snaps[5])&&E().undo.disabled===true&&same(saved(),snaps[5]));
    let redone=0;while(V.crPxRedo())redone++;ok('... and all 50 redo',redone===50&&CRP().px[54+62*64]===1+54%24);}
  const full=CRP().px.slice();E().clear.onclick();
  ok('Clear empties the canvas in one step (saved)',CRP().px.every(v=>v===0)&&saved().every(v=>v===0));
  E().undo.onclick();ok('... and Undo brings it all back',same(CRP().px,full)&&same(saved(),full));
  /* v6.2 review: the clicked button keeps keyboard focus, so Space / Enter would press it again (Clear wiped the canvas twice) */
  {const u0=CRP().undo.length,px0=CRP().px.slice();let pd=0;const pk=c=>V.crKey({code:c,target:E().clear,tagName:'BUTTON',preventDefault(){pd++;}});
    const r=[pk('Space'),pk('Enter'),pk('NumpadEnter')];
    ok('Space and Enter are swallowed by the paint editor (preventDefault, nothing happens): a focused button is never pressed again',
      r.every(Boolean)&&pd===3&&CRP().undo.length===u0&&same(CRP().px,px0));}
  const gOn=/ on$/.test(E().grid.className);E().grid.onclick();ok('the Grid button toggles the pixel grid',gOn&&!/ on$/.test(E().grid.className)&&CRP().grid===false);E().grid.onclick();

  /* ===== 6. persistence ===== */
  CRP().col=7;down(10,30);move(20,30);esc();
  ok('Esc in the middle of a stroke: the editor closes and the stroke so far is saved',!V.crOn()&&V.crArtDecode(V.crRec(n1).d,64,64)[30*64+20]===7);
  const art1=V.crArtDecode(V.crRec(n1).d,64,64);
  aim(o.x+2.5,o.y+0.5,o.z+0.5);rclick();
  ok('right-click again: the same canvas, every pixel, straight into the editor (no picker)',CRP().screen==='edit'&&CRP().n===n1&&same(CRP().px,art1));
  esc();{const s=JSON.parse(JSON.stringify(V.snapshot('c1-save')));V.applySave(s);V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;step(30);}
  aim(o.x+2.5,o.y+0.5,o.z+0.5);rclick();
  ok('after a save and reload the easel opens on the same pixels',V.crOn()==='paint'&&CRP().n===n1&&same(CRP().px,art1));
  {const ext=V.crArtEncode(new Uint8Array(4096).fill(3),64,64),u=V.crRec(n1).u;V.crSetData(n1,ext);esc();
    ok('closing the editor never re-saves its pixels over the work (only a stroke in flight is ever pending)',V.crRec(n1).d===ext&&V.crRec(n1).u===u+1);
    V.crSetData(n1,V.crArtEncode(art1,64,64));aim(o.x+2.5,o.y+0.5,o.z+0.5);rclick();}

  /* ===== 7. the easel's live canvas ===== */
  step(15);const em=PM().get(ek);
  ok('the easel shows the canvas: one art mesh in front of the board (Lambert, nearest)',!!em&&em.kind==='easel'&&em.mat.map===em.tex&&em.tex.magFilter===THREE.NearestFilter&&
    em.tex.minFilter===THREE.NearestFilter&&em.tex.generateMipmaps===false&&em.cv.width===64&&artIn()===1);
  {const n=CRC.FN[EB().f],off=(em.m.position.x-(o.x+2.5))*n[0]+(em.m.position.z-(o.z+0.5))*n[1];
    ok('... facing out from the board (offset '+off.toFixed(3)+'), rotated to the easel\'s facing',Math.abs(off-(11.25/16-0.5+0.005))<1e-6&&Math.abs(em.m.rotation.y-Math.atan2(n[0],n[1]))<1e-9);}
  CRP().col=2;click(33,33);step(1);const first=em.u===V.crRec(n1).u;click(34,33);step(1);const held=em.u!==V.crRec(n1).u;step(8);
  ok('strokes repaint the easel\'s canvas at most every 0.25 s (first at once, the next held back, then caught up)',first&&held&&em.u===V.crRec(n1).u&&em.tex.needsUpdate===true);

  /* ===== 8. New ===== */
  let asked=0;CR().CRF.askAuto=q=>{asked++;return {ok:false};};E().newb.onclick();
  ok('New asks first; "Keep painting" keeps everything',asked===1&&CRP().screen==='edit'&&V.crRec(n1)&&EB().id===id1);
  CR().CRF.askAuto=q=>{asked++;return {ok:true};};E().newb.onclick();
  ok('"Bin it": the canvas is gone (record, def), the easel is empty and the picker is back',asked===2&&!V.crRec(n1)&&!V.DEFS[id1]&&EB().id===0&&CRP().screen==='pick');
  E().sizes[1].onclick();const n2=CRP().n;
  ok('Wide starts a 128x64 canvas (zoom 7, stage 896 px)',rec().w===128&&rec().h===64&&CRP().z===7&&E().stage.style.width==='896px');
  asked=0;E().newb.onclick();ok('New on an untouched canvas does not ask',asked===0&&!V.crRec(n2)&&CRP().screen==='pick');
  E().sizes[2].onclick();ok('Tall starts a 64x128 canvas (zoom 4, stage 512 px high)',rec().w===64&&rec().h===128&&CRP().z===4&&E().stage.style.height==='512px');
  asked=0;E().newb.onclick();E().sizes[0].onclick();

  /* ===== 9. Done ===== */
  /* a recognisable picture: a sun, a hill and a house */
  const n3=CRP().n,id3=V.crItemId(n3);
  CRP().col=23;E().tools.fill.onclick();click(0,0);
  CRP().col=7;E().sizes[2].onclick();E().tools.pencil.onclick();for(let y=6;y<=14;y+=2)drag([[46,y],[56,y]]);
  CRP().col=8;E().sizes[0].onclick();drag([[0,44],[20,36],[40,40],[63,34]]);E().tools.fill.onclick();click(10,60);
  CRP().col=15;E().tools.pencil.onclick();E().sizes[2].onclick();for(let y=30;y<=46;y++)drag([[22,y],[34,y]]);
  CRP().col=5;E().sizes[0].onclick();for(let i=0;i<8;i++)drag([[21+i,29-i],[35-i,29-i]]);
  CRP().col=16;drag([[27,40],[27,46]]);drag([[28,40],[28,46]]);
  const painted=CRP().px.slice();
  let q=null;CR().CRF.askAuto=x=>{q=x;return {ok:true,value:'Sun & House'};};E().done.onclick();
  ok('Done asks for a title (prefilled Untitled) with the one-and-only warning',!!q&&q.input&&q.input.value==='Untitled'&&/one and only/.test(q.text)&&q.ok==='Finish');
  ok('... and makes ONE painting with that title (sanitised), closes the editor and clears the easel',!V.crOn()&&cnt(id3)===1&&V.crRec(n3).st==='done'&&
    V.DEFS[id3].name==='Painting: Sun House'&&EB().id===0&&same(V.crArtDecode(V.crRec(n3).d,64,64),painted));
  ok('the painting\'s icon is its thumbnail (ICONS has it)',!!C.ICONS[id3]);
  CR().CRF.askAuto=null;
  step(15);ok('the easel no longer shows a canvas mesh once it is empty',!PM().has(ek)&&artIn()===0);

  /* ===== 10. painting meshes: four facings, three sizes ===== */
  const hangAt=(id,px0,pz0,ax,ay,az)=>{tp(px0,pz0,o.y);if(!select(id))return false;aim(ax,ay,az);rclick();step(14);return cells(id).length>0;};
  const takeDown=id=>{const c=cells(id);if(!c.length)return false;const p=c[0][0].split(',').map(Number);emptyHand();aim(p[0]+0.5,p[1]+0.5,p[2]+0.5);boot.mine(V,step,16);
    return cells(id).length===0;};
  const meshOk=(id,w,h)=>{const c=cells(id),an=c.find(x=>x[1].i===0&&x[1].j===0);if(!an)return 'no anchor';const e=PM().get(an[0]);if(!e)return 'no mesh';
    const be=an[1],g=V.crPaintGeom(be),m=e.m,sh=be.f<2?0.8:0.65;
    if(e.kind!=='wall')return 'kind';if(!(m.material===e.mat&&e.mat.map===e.tex))return 'mat';
    if(e.mat.constructor!==THREE.MeshLambertMaterial||e.mat.isShaderMaterial||(e.mat.userData&&e.mat.userData.hr))return 'not lambert';
    if(e.tex.constructor!==THREE.CanvasTexture||e.tex.magFilter!==THREE.NearestFilter||e.tex.minFilter!==THREE.NearestFilter||e.tex.generateMipmaps!==false)return 'filter';
    if(Math.abs(m.position.x-g.x)>1e-9||Math.abs(m.position.y-g.y)>1e-9||Math.abs(m.position.z-g.z)>1e-9)return 'pos';
    if(Math.abs(m.rotation.y-Math.atan2(g.nx,g.nz))>1e-9)return 'rot';
    if(Math.abs(e.mat.color.r-sh)>1e-9)return 'shade '+e.mat.color.r;
    if(e.cv.width!==w||e.cv.height!==h)return 'canvas';
    const pa=e.geo.attributes.position.array;if(pa.length!==60)return 'quads';
    /* the front quad's local x runs along the viewer's right: the bottom-left corner lands on the wall's left edge */
    const th=m.rotation.y,lx=pa[0],ly=pa[1],wx=m.position.x+lx*Math.cos(th),wz=m.position.z-lx*Math.sin(th);
    const ex=g.x-g.rx*be.w/2,ez=g.z-g.rz*be.w/2;if(Math.abs(wx-ex)>1e-9||Math.abs(wz-ez)>1e-9||Math.abs(m.position.y+ly-(g.y-be.h/2))>1e-9)return 'corner';
    let inScene=false;S.traverse(x=>{if(x===m)inScene=true;});return inScene?'ok':'scene';};
  const faces=[['back wall (faces -x)',o.x+3.5,o.z+0.5,o.x+6.01,o.y+1.5,o.z+0.5],['front wall (faces +x)',o.x+0.5,o.z+0.5,o.x-1.01,o.y+1.5,o.z+0.5],
    ['side wall (faces +z)',o.x+2.5,o.z-2.5,o.x+2.5,o.y+1.5,o.z-5.01],['side wall (faces -z)',o.x+2.5,o.z+3.5,o.x+2.5,o.y+1.5,o.z+6.01]];
  for(const [nm,a,b,c,d,e] of faces){const hung=hangAt(id3,a,b,c,d,e),r=hung?meshOk(id3,64,64):'not hung';
    ok('hung on the '+nm+': one Lambert mesh with a nearest 64x64 texture at crPaintGeom, facing out, wall shade ('+r+')',r==='ok'&&PM().size===1&&artIn()===1);
    const m=PM().get(cells(id3).find(x=>x[1].i===0&&x[1].j===0)[0]);let disp=0;
    for(const x of [m.geo,m.mat,m.tex]){const f=x.dispose;x.dispose=function(){disp++;return f.apply(this,arguments);};}
    ok('  ... taken down: the mesh leaves the scene and its geometry, material and texture are disposed',takeDown(id3)&&(step(2),PM().size===0&&artIn()===0&&disp===3));
    pickAll(id3);}
  const wN=V.crNew('art',{w:128,h:64,d:V.crArtEncode(new Uint8Array(8192).map((_,i)=>1+(i%128>>4)),128,64)});V.crFinish(wN,'Wide','Dan');const wid=V.crItemId(wN);V.crGiveDan({id:wid,count:1});
  const tN=V.crNew('art',{w:64,h:128,d:V.crArtEncode(new Uint8Array(8192).map((_,i)=>1+((i/64|0)>>4)),64,128)});V.crFinish(tN,'Tall','Dan');const tid=V.crItemId(tN);V.crGiveDan({id:tid,count:1});
  hangAt(wid,o.x+3.5,o.z+0.5,o.x+6.01,o.y+1.5,o.z+0.5);const rw=meshOk(wid,128,64);
  ok('a 128x64 painting: 4x2 blocks, one mesh with a 128x64 texture ('+rw+')',rw==='ok'&&cells(wid).length===8);
  hangAt(tid,o.x+0.5,o.z+0.5,o.x-1.01,o.y+2.5,o.z+0.5);const rt=meshOk(tid,64,128);
  ok('a 64x128 painting: 2x4 blocks, one mesh with a 64x128 texture ('+rt+')',rt==='ok'&&cells(tid).length===8&&PM().size===2&&artIn()===2);
  {const e=PM().get(cells(wid).find(x=>x[1].i===0&&x[1].j===0)[0]),pa=e.geo.attributes.position.array;let xs=pa.filter((_,i)=>i%3===0),ys=pa.filter((_,i)=>i%3===1),zs=pa.filter((_,i)=>i%3===2);
    ok('the wide painting\'s plane is 4 x 2 blocks with 0.028-deep canvas edges back to the wall',Math.max(...xs)-Math.min(...xs)===4&&Math.max(...ys)-Math.min(...ys)===2&&Math.abs(Math.min(...zs)+0.028)<1e-9&&Math.max(...zs)===0);}

  /* ===== 11. lifecycle ===== */
  const R=V.getRD();V.GR.god=true;
  tp(o.x+0.5+(R+3)*16,o.z+0.5,o.y+40);step(20);
  ok('walk past render distance: the painting meshes go (the paintings stay hung)',PM().size===0&&artIn()===0&&cells(wid).length===8);
  tp(o.x+0.5,o.z+0.5,o.y);step(30);ok('come back: they are rebuilt',PM().size===2&&artIn()===2);
  const px0=P.x,py0=P.y,pz0=P.z;C.setDim('nether',px0,90,pz0);step(15);
  ok('to the Nether: no overworld painting meshes there',PM().size===0&&artIn()===0);
  C.setDim('over',px0,py0,pz0);step(30);ok('home again: both back',PM().size===2&&artIn()===2);
  takeDown(wid);takeDown(tid);step(3);pickAll(wid);pickAll(tid);
  ok('both taken down: no art mesh anywhere, both paintings back in the inventory',PM().size===0&&artIn()===0&&has(wid)&&has(tid));V.GR.god=false;
  /* an easel destroyed mid-stroke: the canvas drops with the stroke in it */
  {emptyHand();aim(o.x+2.5,o.y+0.5,o.z+0.5);rclick();E().sizes[0].onclick();const n=CRP().n,id=V.crItemId(n);CRP().col=4;down(3,3);move(9,3);
    V.setBlock(o.x+2,o.y,o.z,B.AIR);step(20);
    ok('the easel vanishes mid-stroke: the editor closes, the canvas comes out (once: on the floor or already picked up) WITH the stroke',
      !V.crOn()&&drops(id).length+cnt(id)===1&&V.crArtDecode(V.crRec(n).d,64,64)[3*64+9]===4);   /* drops fly with Math.random: Dan may catch it */
    pickAll(id);step(15);ok('... and its easel mesh is gone too',!PM().has(ek)&&artIn()===0);}
  hangAt(id3,o.x+3.5,o.z+0.5,o.x+6.01,o.y+1.5,o.z+0.5);step(5);
  ok('(a painting hangs again)',PM().size===1);

  /* ===== 12. Hyperreal adopts the painting, keeps it crisp, and lets go ===== */
  if(typeof V.setPack!=='function'){skip('Hyperreal adoption','DC_NO_TEX build');}
  else{const e=[...PM().values()][0],sh0=e.mat.color.r;
    if(THREE.NearestMipmapLinearFilter===undefined)THREE.NearestMipmapLinearFilter=1005;   /* r128's value; the node THREE stub lacks it */
    ok('OG: the painting casts no shadow (0.03 off the wall it striped itself with shadow acne), filters nearest, no mipmaps',e.m.castShadow===false&&
      e.tex.minFilter===THREE.NearestFilter&&e.tex.generateMipmaps===false);
    const on=await V.setPack('hr',{only:['world','light']});step(6);
    ok('setPack(hr, world + light) succeeds headless',on===true&&V.getTP().hr===true);
    const keyOf=m=>{try{return typeof m.customProgramCacheKey==='function'?String(m.customProgramCacheKey()):'';}catch(err){return '';}};
    ok('Hyperreal: a fresh matte MeshStandardMaterial (per-light shadows) with the sharp-bilinear sampling (crisp pixels at any zoom, one screen pixel of blend at their edges), adopted by Hyperreal (hrLin wraps it)',
      e.mat.constructor===THREE.MeshStandardMaterial&&e.mat.roughness===1&&e.mat.metalness===0&&e.mat.userData.hrLin===1&&typeof e.mat.onBeforeCompile==='function'&&/^hrlin\|crsharp1$/.test(keyOf(e.mat))&&
      e.mat.map===e.tex&&e.m.material===e.mat);
    {const sh={fragmentShader:'a\n#include <map_fragment>\nb'};V.crArtSharpObc(sh);const fs=sh.fragmentShader;
      ok('  ... the patch replaces <map_fragment> whole: four texelFetch taps decoded with sRGBToLinear (Hyperreal\'s map decode) and blended over one screen pixel, the mipmapped sample past 1:1',
        fs.indexOf('#include <map_fragment>')<0&&(fs.match(/texelFetch\(map/g)||[]).length===4&&(fs.match(/sRGBToLinear\(/g)||[]).length===5&&/fwidth\(crP\)/.test(fs)&&
        /diffuseColor\*=/.test(fs)&&/^a\n\{[\s\S]*\}\nb$/.test(fs));}
    ok('  ... and its texture is linear-mipmapped and anisotropic (minified paintings blend like the Hyperreal world instead of aliasing into moire)',
      e.tex.magFilter===THREE.LinearFilter&&e.tex.minFilter===THREE.LinearMipmapLinearFilter&&e.tex.generateMipmaps===true&&e.tex.anisotropy>=1);
    {e.m.castShadow=true;if(V.hrApplyShadows)try{V.hrApplyShadows();}catch(err){}step(2);
      ok('Hyperreal\'s shadow walk (or anything) turning the painting\'s castShadow on is undone by the next tick (no self-shadow stripes)',e.m.castShadow===false);}
    ok('with Hyperreal\'s world materials live the face shade is 1 (they divide it out of the walls too); OG was '+sh0,e.mat.color.r===1&&sh0===0.8);
    const id=[...PM().keys()][0];await V.setPack('og');step(4);
    ok('back to OG: a plain Lambert again (no onBeforeCompile, no cache key), the shade is the wall\'s again',!Object.prototype.hasOwnProperty.call(e.mat,'onBeforeCompile')&&
      !Object.prototype.hasOwnProperty.call(e.mat,'customProgramCacheKey')&&!(e.mat.userData&&e.mat.userData.hrLin)&&e.mat.color.r===0.8&&PM().get(id)===e&&e.m.material===e.mat);
    ok('  ... and the texture is unfiltered again (nearest, no mipmaps), no shadow cast',e.tex.minFilter===THREE.NearestFilter&&e.tex.magFilter===THREE.NearestFilter&&
      e.tex.generateMipmaps===false&&e.m.castShadow===false);}
  /* a new world inherits nothing */
  V.startNewWorld('c1new','7','s');V.GR.snail=false;V.GR.mobSpawn=false;step(30);
  ok('a new world: no art meshes, no editor, nothing tracked',PM().size===0&&artIn()===0&&!V.crOn()&&V.getCRPS().easel.size===0);
});
