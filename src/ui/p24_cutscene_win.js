/* ===================================================================== */
/* PART 24 — MALGORATH, THE WORLD-EATER  (2.1)                           */
/* A final boss rendered like he wandered in from a different engine.    */
/* ===================================================================== */
const DEMON_X=1000,DEMON_Z=1000;
const DEMON={ay:0,cutSeen:false,dead:false,toasted:false};
function demonAY(){
  if(!DEMON.ay)DEMON.ay=Math.max(colInfo(DEMON_X,DEMON_Z).h,SEA+2);
  return DEMON.ay;
}
MOBT.demon={hp:300,hw:2.5,h:14,spd:3.5,dmg:14,boss:true,hostile:true,xp:0,kbRes:1,pnc:1,mg:'boss',
  body:'#3d1014',legc:'#1a1416'};
/* v6.3: the v2.1 boss (skin, mesh, brain, arena, watcher) was replaced by PART 57 (src/malgorath/). 300 is ONE round's bar. */
/* ----- cutscene: bars, lines, a camera that finally moves ----- */
const CUT={on:false,t:0,line:-1};
const CUT_LINES=[
  {at:1.0, n:'MALGORATH',t:'...So. Another little architect crawls into my arena.'},
  {at:4.8, n:'MALGORATH',t:'I am MALGORATH, THE WORLD-EATER. Ten thousand realms of dirt and dreams sit in my belly.'},
  {at:9.4, n:'MALGORATH',t:'Your dragons kneel to you. Your titans crumble. Your... hats... amuse me.'},
  {at:13.4,n:'MALGORATH',t:'But here, at the edge of the map, your save file ends.'},
  {at:16.6,n:'MALGORATH',t:'COME. SHOW ME WHAT YOU BUILT.'},
];
const CUT_END=19.4;
function startCut(){
  CUT.on=true;CUT.t=0;CUT.line=-1;
  const el=$('cut');
  if(el)el.style.display='block';
  const b=$('cutbars');
  if(b)b.style.display='';
  const sk=$('cutskip');
  if(sk)sk.style.display='';
  setCutLine('','');
  playS('rumble');
}
function setCutLine(n,t){
  const nm=$('cutname'),tx=$('cuttext');
  if(nm)nm.textContent=n;
  if(tx)tx.textContent=t;
}
let _cutSayT=0;
function cutSay(n,t,dur){
  const el=$('cut');
  if(el&&!CUT.on){el.style.display='block';
    const b=$('cutbars');if(b)b.style.display='none';
    const sk=$('cutskip');if(sk)sk.style.display='none';}
  setCutLine(n,t);
  _cutSayT=dur||2.5;
}
function updateCut(dt){
  if(_cutSayT>0&&!CUT.on){
    _cutSayT-=dt;
    if(_cutSayT<=0){
      const el=$('cut');
      if(el)el.style.display='none';
      const b=$('cutbars');
      if(b)b.style.display='';
      const sk=$('cutskip');
      if(sk)sk.style.display='';
    }
  }
  if(!CUT.on)return;
  CUT.t+=dt;
  let li=-1;const CL=CUT.script?CUT.script.lines:CUT_LINES;
  for(let i=0;i<CL.length;i++)if(CUT.t>=CL[i].at)li=i;
  if(li!==CUT.line){
    CUT.line=li;
    if(li>=0)setCutLine(CL[li].n,CL[li].t);
  }
  const skip=(KEY.Space||MB.l)&&CUT.t>0.8;
  if(!skip)CUT._sk=false;
  if((skip&&!CUT._sk)||CUT.t>=(CUT.script?CUT.script.end:CUT_END)){CUT._sk=true;endCut();}
}
function endCut(){
  if(!CUT.on)return;
  CUT.on=false;
  if(CUT.script){const s=CUT.script;CUT.script=null;const el=$('cut');if(el)el.style.display='none';if(s.onEnd)s.onEnd();return;}
  DEMON.cutSeen=true;
  const el=$('cut');
  if(el)el.style.display='none';
  for(const e of entities)if(e.t==='mob'&&e.mt==='demon'&&!e.dead)e.cut=false;
  playS('boom');
  showToast('MALGORATH descends. Good luck.');
}
function cutCam(){
  if(CUT.script&&CUT.script.cam){CUT.script.cam(CUT.t);return;}
  const ay=demonAY(),dx2=DEMON_X+0.5,dz2=DEMON_Z+0.5;
  const t=CUT.t;
  let px,py,pz,ty=ay+3.6;
  if(t<15.5){
    const ang=2.2+t*0.22;
    const r=11-Math.min(4.5,t*0.36);
    px=dx2+Math.sin(ang)*r;pz=dz2+Math.cos(ang)*r;
    py=ay+1.1+Math.min(3.4,t*0.3);
  }else{
    const ddx=dx2-P.x,ddz=dz2-P.z,dl=Math.hypot(ddx,ddz)||1;
    px=P.x-ddx/dl*2.6;pz=P.z-ddz/dl*2.6;py=P.y+2.1;
    ty=ay+4.2;
  }
  camera.position.set(px,py,pz);
  const vx=dx2-px,vy=ty-py,vz=dz2-pz;
  const vl=Math.hypot(vx,vy,vz)||1;
  camera.rotation.y=Math.atan2(-vx,-vz);
  camera.rotation.x=Math.asin(clamp(vy/vl,-1,1));
}
/* ----- YOU WIN ----- */
let winOpen=false;
const WIN={open:false,pend:0};
function tickWin(dt){
  if(WIN.pend>0){
    WIN.pend-=dt;
    if(WIN.pend<=0)openWin();
  }
}
function openWin(){
  WIN.open=true;winOpen=true;
  const el=$('win');
  if(el)el.style.display='flex';
  if(typeof document.exitPointerLock==='function')document.exitPointerLock();
  playS('jackpot');
}
function closeWin(){
  WIN.open=false;winOpen=false;
  const el=$('win');
  if(el)el.style.display='none';
}
function winHome(){
  closeWin();
  P.x=P.spawn[0];P.y=P.spawn[1];P.z=P.spawn[2];
  P.vx=P.vy=P.vz=0;
  P.hp=20;P.hunger=20;P.air=10;
  drawStats();
  showToast('Home. The world is finally, fully yours.');
}
{
  const wh=$('winhome');
  if(wh)wh.onclick=()=>{winHome();};
  const ws=$('winstay');
  if(ws)ws.onclick=()=>{closeWin();};
}


