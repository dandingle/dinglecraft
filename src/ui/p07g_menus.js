/* ----- menu wiring ----- */
/* Release 1.0: Create New World's game rules -> GR (the world saves them; the debug menu can still change them) */
function grFromCreate(){
  const on=id=>{const e=$(id);return !!(e&&e.checked);};
  if(!$('tr_keepInv'))return;
  GR.keepInv=on('tr_keepInv');GR.mobGrief=on('tr_mobGrief');GR.mobSpawn=!on('tr_peaceful');GR.fireTick=on('tr_fireTick');
  GR.snail=on('tr_snail');GR.ghosts=on('tr_ghosts');GR.fbOK=on('tr_fbOK');GR.store=on('tr_store');GR.powers=on('tr_powers');GR.cheats=on('tr_cheats');
  if(!GR.snail&&typeof SNL!=='undefined'&&SNL){removeEnt(SNL);SNL=null;}
  grApplyUI();
}
function wireMenus(){
  $('t_new').onclick=()=>{const bots=!!($('t_bots')&&$('t_bots').checked);
    startNewWorld($('t_name').value,$('t_seed').value,$('t_mode').value,bots);grFromCreate();};
  $('t_import').onclick=()=>$('fileIn').click();
  $('fileIn').addEventListener('change',e=>{
    if(e.target.files[0])importWorldFile(e.target.files[0]);
    e.target.value='';
  });
  $('t_help').onclick=()=>openHelp();
  $('h_close').onclick=()=>closeHelp();
  $('p_resume').onclick=resumeGame;
  $('p_mode').onclick=()=>{
    P.mode=P.mode==='c'?'s':'c';
    if(P.mode==='s')P.flying=false;
    $('p_mode').textContent='Mode: '+(P.mode==='c'?'Creative':'Survival');
    drawStats();
  };
  $('p_rd').addEventListener('input',e=>{
    RD=clamp(+e.target.value,2,32);
    $('p_rdv').textContent=RD;
    saveSettings();
    if(RD>=16&&!window._rdWarned){window._rdWarned=true;showToast('Big render distances take a while to fill in (and eat GPUs).');}
  });
  $('p_sound').onclick=()=>{
    soundOn=!soundOn;if(!soundOn&&typeof tmusStop==='function')tmusStop();
    $('p_sound').textContent='Sound: '+(soundOn?'On':'Off');
    saveSettings();
  };
  $('p_bright').onclick=()=>{
    if(!GR.fbOK)return;
    fullbright=!fullbright;
    $('p_bright').textContent='Fullbright: '+(fullbright?'On':'Off');
    showToast(fullbright?'Night vision engaged':'Back to natural light');
    saveSettings();
  };
  $('p_music').onclick=()=>{
    musicOn=!musicOn;
    $('p_music').textContent='World Music: '+(musicOn?'On':'Off');   /* the in-world tunes; the menu music and discs follow the Music volume slider */
    saveSettings();
  };
  $('p_save').onclick=()=>saveToStorage(WORLD.name,false);
  $('p_export').onclick=exportWorld;
  $('p_quit').onclick=quitToTitle;
  $('p_help').onclick=()=>{hidePause();openHelp();};
  $('d_respawn').onclick=()=>{respawn();$('death').style.display='none';tryLock();};
  $('d_title').onclick=quitToTitle;
  uiBoot();   /* the UI scale (p06e) */
  tmBoot();   /* the title menu: views, keyboard, background (p07g_title) */
}
