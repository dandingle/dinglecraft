/* ---- PART 54: tA_core.js ---- */
/* tA_core.js (Package A): module 'world' (order 10, required), A's tier fields, the Settings UI, tpCubeDrop, exports.
   Settings -> Texture pack: OG | Hyperreal, Hyperreal quality: Auto/Low/Medium/High/Ultra. Persisted as tp/tq in
   vox_settings (client settings, never per-world, never in snapshot()). */
tpTierFields({tex:[256,512,512,1024],aniso:[4,8,16,16],cutDepthHR:[0,0,1,1]});
tpRegister({name:'world',order:10,required:true,
  supported:()=>hrWWhy()==='',why:()=>hrWWhy(),
  prepare:(q,progress)=>hrWPrepare(q,progress),
  enable:q=>hrWEnable(q),
  disable:()=>hrWDisable(),
  setQuality:(q,prev)=>hrWSetQuality(q,prev),
  frame:dt=>{if(HRW.U)HRW.U.hrTime.value=(HRW.U.hrTime.value+dt)%1000;}});
/* Hyperreal block items: real cubes, not cross/door/bed/rail/ramp/wall-torch shapes */
function tpCubeDrop(id){const d=DEFS[id];
  return !!(d&&!d.item&&d._t&&!d.cross&&!d.wt&&!d.door&&!d.bed&&!d.rail&&!d.railup&&!d.ramp);}
/* progress from setPack/setQuality: the info line, plus a toast at the start and every quarter */
function tpProgress(f){TPA.loading=f;const el=$('s_tpinfo');if(el)el.textContent='Loading Hyperreal… '+Math.round(f*100)+'%';
  const s=Math.floor(f*4);if(s!==tpProgress.s){tpProgress.s=s;if(f<1&&typeof showToast==='function')showToast('Loading Hyperreal… '+Math.round(f*100)+'%');}}
tpProgress.s=-1;
function tpSyncUI(){try{
  const sp=$('s_pack'),sq=$('s_q'),row=$('s_qrow'),info=$('s_tpinfo'),sh=$('s_shaders');
  const want=(TP.busy&&TP.want)?TP.want[0]:TP.id,why=hrWWhy();
  if(sp){sp.value=want;const o=sp.options&&sp.options[1];
    if(o){o.disabled=!!why;o.textContent=why?'Hyperreal ('+why+')':'Hyperreal (cursed PBR)';}}
  if(sq)sq.value=String(TP.q);
  const hrUI=TP.hr||want==='hr';
  if(row&&row.style)row.style.display=hrUI?'':'none';
  if(sh&&sh.style&&(TP.hr||sh.style.display==='none'))sh.style.display=TP.hr?'none':'';   /* OG never touches it */
  if(info)info.textContent=TPA.loading!==null?'Loading Hyperreal… '+Math.round(TPA.loading*100)+'%'
    :(TP.hr&&TP.q<0?'Auto → '+tpQ().n:'');
}catch(e){}}
/* settings wiring (PART 32 pattern: top-level $() lookups and handlers only) */
{
  const sp=$('s_pack');if(sp)sp.onchange=async()=>{const v=sp.value==='hr'?'hr':'og';tpProgress.s=-1;
    const ok=await setPack(v,{progress:tpProgress});
    syncSetUI();saveSettings();playS('click');
    if(ok&&TP.id===v)showToast(v==='hr'?'Welcome to the uncanny valley':'Back to honest pixels');};
  const sq=$('s_q');if(sq)sq.onchange=async()=>{tpProgress.s=-1;await setQuality(+sq.value,{progress:tpProgress});
    syncSetUI();saveSettings();playS('click');};
}
/* exports (tA_assets/tA_world load after this file: their vars are read lazily) */
Object.assign(TPEX,{getTPA:()=>TPA,tpAssetURL,tpAssetMeta,tpImage,tpCoverage,tpLutRow,tpLutBytes,tpPackLayer,hrRotJS,hrHashJS,tpDebugRot,
  tpCubeDrop,tpSyncUI,hrWWhy,tpWorldMats:()=>HRW.mat,
  getHRW:()=>({on:HRW.on,key:HRW.key,cache:Object.keys(HRW.cache),cd:HRW.cdKind,dbg:HRW.dbg,
    layers:HRW.cache[HRW.key]?HRW.cache[HRW.key].layers:0,lut:!!TPA.lut,built:TPA.built}),
  /* test seams */
  tpMats:()=>({cur:{op:matOp,cut:matCut,wat:matWat},og:TP.og,hr:HRW.mat,cutDepth:HRW.cutDepth,U:HRW.U}),
  hrWPatch,hrWPatchDepth,hrWPerturbSrc});
