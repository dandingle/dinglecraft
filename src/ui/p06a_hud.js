/* ===================================================================== */
/* PART 6 — HUD, input, modals, menus                                    */
/* ===================================================================== */
let playing=false,paused=false,soundOn=true,debugOn=false,fullbright=false;
const $=id=>document.getElementById(id);

/* ----- HUD: hotbar ----- */
const HOTCV=[];
function buildHotbar(){
  const hb=$('hotbar');hb.innerHTML='';
  for(let i=0;i<9;i++){
    const d=document.createElement('div');d.className='hslot';
    const c=document.createElement('canvas');c.width=c.height=48;
    d.appendChild(c);hb.appendChild(d);
    HOTCV.push(c);
    d.addEventListener('pointerdown',ev=>{ev.stopPropagation();P.sel=i;redrawHotbar();});
  }
}
function redrawHotbar(){
  if(!P)return;
  for(let i=0;i<9;i++){
    const g=uiCv(HOTCV[i],48,48,uiK(1));   /* 48 logical px, device-resolution backing (p06e) */
    g.clearRect(0,0,48,48);
    if(P.inv[i])drawStackIn(g,P.inv[i],0,0,48);
    HOTCV[i].parentNode.className='hslot'+(i===P.sel?' hsel':'');
  }
  const st=P.inv[P.sel];
  setHandName(st?(stackName(st)+(st.ench?'  \u2726 '+enchName(st):'')):'');
  if(typeof refreshHand==='function')refreshHand();
}
let handT=null;
function setHandName(t){
  const el=$('handname');
  el.textContent=t;el.style.opacity=t?1:0;
  clearTimeout(handT);
  if(t)handT=setTimeout(()=>el.style.opacity=0,1800);
}
let toastT=null;
function showToast(t){
  t=typeof pnText==='function'?pnText(t):t;
  const el=$('toast');el.textContent=t;el.style.opacity=1;
  if(el.classList)el.classList.toggle('up',!playing||modalOpen());   /* over a menu or the title: pinned to the top edge */
  hudLayout();   /* in a browser: placed clear of any open menu (p06e) */
  clearTimeout(toastT);toastT=setTimeout(()=>el.style.opacity=0,2600);
}

/* ----- HUD: stats (hearts / hunger / bubbles) -----
   Hearts sit over the hotbar's left half and hunger over its right half (STATS_W = the hotbar's width). Every pattern pixel is a
   whole number of device pixels (q), so the hearts stay crisp at any UI scale. */
const STATS_W=510,STATS_H=36;
const PIX={
 heart:['.XX.XX.','XXXXXXX','XXXXXXX','.XXXXX.','..XXX..','...X...'],
 meat: ['..XXXX.','.XXXXXX','.XXXXXX','..XXXX.','...XX.o','......o'],
 bub:  ['..XXX..','.X...X.','.X...X.','.X...X.','..XXX..','.......']};
/* one pattern at cell size q device px; columns c0..c1-1 only (a half heart / half drumstick is the left four columns) */
function drawPat(g,pat,x,y,col,col2,q,c0,c1){
  q=q||2;
  for(let r=0;r<pat.length;r++)for(let c=c0||0;c<(c1===undefined?pat[r].length:c1);c++){
    const ch=pat[r][c];
    if(ch==='.')continue;
    g.fillStyle=ch==='o'?(col2||col):col;
    g.fillRect(x+c*q,y+r*q,q,q);
  }
}
function drawStats(){
  if(!P)return;
  const cv=$('stats');
  if(!cv||typeof cv.getContext!=='function')return;
  const k=uiK(1);
  if(UIS.live&&cv._uik!==k){
    cv.width=Math.round(STATS_W*k);cv.height=Math.round(STATS_H*k);
    cv.style.width=STATS_W+'px';cv.style.height=STATS_H+'px';cv._uik=k;
  }
  const g=cv.getContext('2d'),W=cv.width,H=cv.height;
  g.clearRect(0,0,W,H);
  if(P.mode==='c')return;
  const q=Math.max(1,Math.round(2*k)),pitch=Math.round(8.5*q),m=Math.round(k),y=H-6*q-m;
  for(let i=0;i<10;i++){
    const x=m+i*pitch,v=P.hp-i*2;
    drawPat(g,PIX.heart,x,y,'#3a0d0d',null,q);
    if(v>=2)drawPat(g,PIX.heart,x,y,'#e23b3b',null,q);
    else if(v===1)drawPat(g,PIX.heart,x,y,'#e23b3b',null,q,0,4);
  }
  for(let i=0;i<10;i++){
    const x=W-7*q-m-i*pitch,v=P.hunger-i*2;
    drawPat(g,PIX.meat,x,y,'#3a2410',null,q);
    if(v>=2)drawPat(g,PIX.meat,x,y,'#c77b35','#e8dcc8',q);
    else if(v===1)drawPat(g,PIX.meat,x,y,'#c77b35','#e8dcc8',q,0,4);
  }
  if(P.air<10){
    for(let i=0;i<P.air;i++)drawPat(g,PIX.bub,W-7*q-m-i*pitch,y-7*q,'#bfe3ff',null,q);
  }
}

/* break progress ring + crosshair handled in frame */
function drawRing(){
  const cv=$('ring'),g=uiCv(cv,40,40,uiK(1));
  g.clearRect(0,0,40,40);
  if(!MINE.active||MINE.need<=0)return;
  const p=clamp(MINE.prog/MINE.need,0,1);
  g.strokeStyle='rgba(0,0,0,0.5)';g.lineWidth=6;
  g.beginPath();g.arc(20,20,13,0,Math.PI*2);g.stroke();
  g.strokeStyle='#fff';g.lineWidth=4;
  g.beginPath();g.arc(20,20,13,-Math.PI/2,-Math.PI/2+p*Math.PI*2);g.stroke();
}
let fpsA=0,fpsN=0,fpsShow=0;
let _coordsLast='';
function updateCoords(){
  const el=$('coords');
  if(!el)return;
  if(debugOn){el.style.display='none';_coordsLast='';return;}
  let s='X '+Math.floor(P.x)+'  Y '+Math.floor(P.y)+'  Z '+Math.floor(P.z);
  if(P.deathPos){
    const dx=P.deathPos[0]-P.x,dz=P.deathPos[2]-P.z;
    const dist=Math.round(Math.hypot(dx,dz));
    if(dist<5)P.deathPos=null;
    else{
      const dirs=['N','NE','E','SE','S','SW','W','NW'];
      const ang=(Math.atan2(dx,-dz)/Math.PI*180+360)%360;
      s+='\n\u2020 '+dist+'m '+dirs[Math.round(ang/45)%8];
    }
  }
  if(s!==_coordsLast){
    _coordsLast=s;
    el.style.display='block';
    el.textContent=s;
  }
}
function drawDebug(dt){
  fpsA+=dt;fpsN++;
  if(fpsA>0.5){fpsShow=Math.round(fpsN/fpsA);fpsA=0;fpsN=0;}
  updateCoords();
  if(!debugOn){$('debug').style.display='none';return;}
  $('debug').style.display='block';
  const bi=colInfo(Math.floor(P.x),Math.floor(P.z));
  $('debug').textContent=
    'DINGLECRAFT '+RELEASE_LABEL+'  '+fpsShow+' fps\n'+
    'XYZ: '+P.x.toFixed(1)+' / '+P.y.toFixed(1)+' / '+P.z.toFixed(1)+'\n'+
    'Biome: '+BIOME_NAME[bi.b]+'  Seed: '+SEED+'\n'+
    'Chunks: '+chunks.size+'  Entities: '+entities.length+'\n'+
    'Time: '+(timeOfDay%1).toFixed(2)+'  Mode: '+(P.mode==='c'?'Creative':'Survival')+agDebugStr();
}

