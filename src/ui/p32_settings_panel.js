/* PART 32 — settings panel (RD, sound, music, fullbright, shaders, export, debug; Release 1.0: UI scale, p06e) */
let setOpen=false;
function syncSetUI(){
  const t=(id,txt)=>{const b=$(id);if(b)b.textContent=txt;};
  t('p_sound','Sound: '+(soundOn?'On':'Off'));
  t('p_music','World Music: '+(musicOn?'On':'Off'));
  t('p_bright','Fullbright: '+(fullbright?'On':'Off'));
  t('s_shaders','✨ Shaders: '+(SHD.on?'On':'Off'));
  t('s_lock','Mouse Capture: '+(usePLock?'On':'Off'));
  tpSyncUI();
  uiSyncSetUI();
  const rv=$('p_rdv');if(rv)rv.textContent=RD;
  const rr=$('p_rd');if(rr)rr.value=RD;
  const fv=$('s_fov');if(fv)fv.value=FOVB;const fl=$('s_fovv');if(fl)fl.textContent=FOVB;
  const sl=(id,v)=>{const r=$(id);if(r)r.value=v;const l=$(id+'v');if(l)l.textContent=v;};
  const pn=$('s_pname');if(pn&&document.activeElement!==pn)pn.value=PNAME;
  sl('s_sens',Math.round(MSENS*100));sl('s_sfx',Math.round(SFXVOL*100));sl('s_mus',Math.round(MUSVOL*100));
  if(typeof grApplyUI==='function')grApplyUI();
}
function openSet(){setOpen=true;syncSetUI();const el=$('settings');if(el)el.style.display='flex';}
function closeSet(noBack){setOpen=false;const el=$('settings');if(el)el.style.display='none';if(!noBack)restorePause();}
{
  const b=$('p_settings');if(b)b.onclick=()=>{hidePause();openSet();playS('click');};
  const c=$('s_close');if(c)c.onclick=()=>{closeSet();};
  const fv=$('s_fov');if(fv&&fv.addEventListener)fv.addEventListener('input',e=>{FOVB=clamp(+e.target.value|0,50,110);const l=$('s_fovv');if(l)l.textContent=FOVB;saveSettings();});
  const slide=(id,f)=>{const r=$(id);if(r&&r.addEventListener)r.addEventListener('input',e=>{const v=+e.target.value;f(v);const l=$(id+'v');if(l)l.textContent=v;saveSettings();});};
  {const pn=$('s_pname');if(pn&&pn.addEventListener)pn.addEventListener('change',()=>{if(!pnSet(pn.value)){if(pnClean(pn.value))showToast('Pick another name: 2 or more letters, and not an AI player\u2019s name');pn.value=PNAME;}});}
  slide('s_sens',v=>{MSENS=clamp(v/100,0.1,3);});
  slide('s_sfx',v=>{SFXVOL=clamp(v/100,0,1);acVol();});
  slide('s_mus',v=>{MUSVOL=clamp(v/100,0,1);acVol();});
  const sh=$('s_shaders');if(sh)sh.onclick=()=>{setShaders(!SHD.on);syncSetUI();saveSettings();playS('click');
    showToast(SHD.on?'✨ Fancy mode engaged':'Back to honest pixels');};
  const lk=$('s_lock');if(lk)lk.onclick=()=>{setLock(!usePLock);syncSetUI();saveSettings();playS('click');
    showToast(usePLock?'Mouse captured while playing (the browser will show its ESC note)':'Free-range mouse: no capture, no browser banner');};
}

