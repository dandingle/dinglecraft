/* ----- touch controls ----- */
const TOUCH={f:0,s:0};
function setupTouch(){
  if(!('ontouchstart' in window))return;
  document.body.classList.add('touch');
  const joy=$('joy'),nub=$('joynub');
  let jid=null,jx=0,jy=0;
  joy.addEventListener('touchstart',e=>{
    const t=e.changedTouches[0];jid=t.identifier;
    const r=joy.getBoundingClientRect();jx=r.left+r.width/2;jy=r.top+r.height/2;
    e.preventDefault();
  },{passive:false});
  addEventListener('touchmove',e=>{
    for(const t of e.changedTouches){
      if(t.identifier===jid){
        const dx=clamp((t.clientX-jx)/45,-1,1),dy=clamp((t.clientY-jy)/45,-1,1);
        TOUCH.s=Math.abs(dx)>0.25?dx:0;
        TOUCH.f=Math.abs(dy)>0.25?-dy:0;
        nub.style.transform='translate('+dx*32+'px,'+dy*32+'px)';
      }else if(t.identifier===lid){
        P.yaw-=(t.clientX-lx)*0.006;
        P.pitch=clamp(P.pitch-(t.clientY-ly)*0.006,-1.55,1.55);
        if(Math.abs(t.clientX-lsx)+Math.abs(t.clientY-lsy)>14)lmoved=true;
        lx=t.clientX;ly=t.clientY;
      }
    }
  },{passive:true});
  const endJoy=e=>{
    for(const t of e.changedTouches)if(t.identifier===jid){
      jid=null;TOUCH.f=TOUCH.s=0;nub.style.transform='';
    }
  };
  addEventListener('touchend',endJoy);
  addEventListener('touchcancel',endJoy);
  /* look + tap-place + hold-mine on the canvas area */
  let lid=null,lx=0,ly=0,lsx=0,lsy=0,lt0=0,lmoved=false,holdTimer=null;
  $('gl').addEventListener('touchstart',e=>{
    if(!playing||paused||modalOpen()||P.dead)return;
    const t=e.changedTouches[0];
    if(lid!==null)return;
    lid=t.identifier;lx=lsx=t.clientX;ly=lsy=t.clientY;lt0=performance.now();lmoved=false;
    holdTimer=setTimeout(()=>{if(!lmoved&&lid!==null)MB.l=true;},260);
    e.preventDefault();
  },{passive:false});
  const endLook=e=>{
    for(const t of e.changedTouches)if(t.identifier===lid){
      clearTimeout(holdTimer);
      const dur=performance.now()-lt0;
      if(!lmoved&&dur<260&&!MB.l){MB.r=true;setTimeout(()=>MB.r=false,60);}
      MB.l=false;lid=null;
    }
  };
  addEventListener('touchend',endLook);
  addEventListener('touchcancel',endLook);
  const bindBtn=(id,down,up)=>{
    const el=$(id);
    el.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();down();},{passive:false});
    el.addEventListener('touchend',e=>{e.preventDefault();up&&up();},{passive:false});
  };
  let lastJump=0;
  bindBtn('btnjump',()=>{
    KEY.Space=true;
    if(P&&P.mode==='c'&&performance.now()-lastJump<300){P.flying=!P.flying;P.vy=0;}
    lastJump=performance.now();
  },()=>KEY.Space=false);
  bindBtn('btnsneak',()=>{KEY.ShiftLeft=!KEY.ShiftLeft;$('btnsneak').classList.toggle('on',KEY.ShiftLeft);});
  bindBtn('btninv',()=>{if(modalOpen())closeModal();else openModal(P.mode==='c'?'creative':'inv');});
  bindBtn('btndrop',()=>dropSel(false));
  bindBtn('btnpause',()=>{if(paused)resumeGame();else pauseGame();});
}

