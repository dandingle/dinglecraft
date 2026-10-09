/* ----- input ----- */
let lockWanted=false;
/* pointer lock with graceful drag-look fallback (sandboxed iframes etc.) */
let usePLock=true,plockTold=false,plockWorked=false,relockT=null,curHidden=null;
function plockFail(){
  if(document.pointerLockElement===$('gl'))return;
  if(plockWorked)return; /* lock works here; this was a transient refusal (Esc cooldown) */
  usePLock=false;
  if(!plockTold&&!('ontouchstart' in window)){
    plockTold=true;
    showToast('Pointer lock unavailable here — just move the mouse over the game to look');
  }
}
function lockAttempt(n){
  if(document.pointerLockElement===$('gl'))return;
  if(!playing||paused||modalOpen()||(P&&P.dead))return;
  try{
    const r=$('gl').requestPointerLock();
    if(r&&typeof r.catch==='function')r.catch(()=>{});
  }catch(e){}
  clearTimeout(relockT);
  relockT=setTimeout(()=>{
    if(document.pointerLockElement===$('gl'))return;
    if(!playing||paused||modalOpen()||(P&&P.dead))return;
    if(n>=5){plockFail();return;}
    lockAttempt(n+1);
  },450);
}
function tryLock(){
  if(!usePLock)return;
  if(!$('gl').requestPointerLock){usePLock=false;return;}
  if(!playing||paused||modalOpen()||(P&&P.dead))return;
  lockWanted=true;
  lockAttempt(0);
}
function setupInput(){
  document.addEventListener('pointerdown',kickAudio,true);
  document.addEventListener('touchstart',kickAudio,true);
  addEventListener('keydown',e=>{
    if(chatKey(e))return;
    if(crOn&&crKey(e))return;
    if(e.code==='Tab'){tabHeld=true;if(playing&&!paused&&!modalOpen())e.preventDefault();}   /* menus keep Tab for keyboard focus */
    if(e.repeat)return;
    kickAudio();
    KEY[e.code]=true;
    if(e.code==='KeyH'&&playing&&P&&P.ride)playS('honk');
    if(e.code==='KeyW'){
      const tn=performance.now();
      if(tn-DBLW.t<280)DBLW.on=true;
      DBLW.t=tn;
    }
    if(e.code==='KeyX'&&KEY.BracketLeft&&playing&&P&&!P.dead){toggleXray();}
    if(e.code==='KeyF'&&playing&&!paused&&P&&!P.dead&&!modalOpen()){
      camMode=(camMode+1)%3;
    }
    if(!playing)return;
    if(e.code.startsWith('Digit')){
      const n=+e.code.slice(5);
      if(n>=1&&n<=9&&!modalOpen()){P.sel=n-1;redrawHotbar();}
    }
    if(e.code==='KeyE'){
      e.preventDefault();
      if(modalOpen())closeModal();
      else if(!paused&&!P.dead)openModal(P.mode==='c'?'creative':'inv');
    }
    if(e.code==='KeyQ'&&!modalOpen()&&!paused)dropSel(KEY.ControlLeft);
    if(e.code==='F3'){e.preventDefault();debugOn=!debugOn;}
    if(e.code==='KeyR'&&MODAL.kind==='inv')sortInv();
    if(e.code==='KeyP'&&playing&&!P.dead&&!paused){if(powOpen)closePow();else if(!modalOpen())openPow();}
    if(e.code==='Escape'){
      if(helpOpen){showToast('There is no escape from Controls. Read. Learn. Click Close.');}
      else if(terrOpen)closeTerr();
      else if(cineOpen)closeCine();
      else if(presOn)presClose();
      else if(pguOn)pguClose();
      else if(patchOpen)closePatch();
      else if(dbgmOpen)closeDbgm();
      else if(setOpen)closeSet();
      else if(cmpOpen)closeCmp();
      else if(winOpen)closeWin();
      else if(CUT.on)endCut();
      else if(storeOpen)closeStore();
      else if(powOpen)closePow();
      else if(enchOpen)closeEnch();
      else if(dselOpen)closeDSel();
      else if(casOpen)closeCas();
      else if(dlgOpen)closeDlg();
      else if(pcOpen)closePC();
      else if(modalOpen())closeModal();
      else if(playing&&!P.dead){if(paused)resumeGame();else pauseGame();}
    }
    if(['Space','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ControlLeft'].includes(e.code)||(e.code==='Tab'&&!paused&&!modalOpen()))e.preventDefault();
  });
  addEventListener('keyup',e=>{KEY[e.code]=false;if(e.code==='KeyW')DBLW.on=false;if(e.code==='Tab')tabHeld=false;});
  addEventListener('blur',()=>{for(const k in KEY)KEY[k]=false;MB.l=MB.r=false;tabHeld=false;});
  const gl=$('gl');
  gl.addEventListener('pointerdown',e=>{
    if(!playing||paused||P.dead||modalOpen())return;
    if(e.pointerType==='touch')return;
    if(usePLock&&document.pointerLockElement!==gl){tryLock();return;}
    if(e.button===0)MB.l=true;
    if(e.button===2)MB.r=true;
  });
  gl.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    if(document.pointerLockElement===gl)return; /* locked look handled by mousemove below */
    if(!playing||paused||!P||P.dead||modalOpen())return;
    /* hover-look while unlocked: covers the Esc relock gap and no-lock sandboxes */
    const m=mouseFilter(e.movementX||0,e.movementY||0);
    if(m)look(m[0],m[1],0.0045);
  });
  addEventListener('pointerup',e=>{
    if(e.pointerType==='touch')return;
    if(e.button===0)MB.l=false;
    if(e.button===2)MB.r=false;
  });
  addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('mousemove',e=>{
    if(document.pointerLockElement===$('gl')&&P&&!modalOpen()){
      const m=mouseFilter(e.movementX||0,e.movementY||0);
      if(m)look(m[0],m[1],0.0024);
    }
  });
  document.addEventListener('pointerlockchange',()=>{
    if(document.pointerLockElement===$('gl')){
      plockWorked=true;clearTimeout(relockT);MF.lockT=performance.now();MF.prev=0;return;
    }
    MB.l=MB.r=false;
    if(playing&&!modalOpen()&&!P.dead&&lockWanted&&!paused)pauseGame();
  });
  addEventListener('pointermove',e=>{
    if(cursorStack){
      const cc=$('cursor');
      cc.style.left=e.clientX+'px';cc.style.top=e.clientY+'px';
    }
  });
  addEventListener('wheel',e=>{
    if(!playing||modalOpen()||paused)return;
    P.sel=(P.sel+(e.deltaY>0?1:-1)+9)%9;
    redrawHotbar();
  },{passive:true});
  setupTouch();
}

