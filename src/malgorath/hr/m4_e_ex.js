/* ---- PART 57 HR: m4_e_ex.js ---- */
/* ===================================================================== */
/* PART 57 HR · m4_e_ex.js (M4): exports (MGEX, so __vox) and QA info.    */
/* ===================================================================== */
function hrMgInfo(){const e=MGF.boss,r=e&&e.mgRig;
  return {live:hrMgLive(),inst:HR_MG.inst,ok:HR_MG.ok,texOK:HR_MG.texOK||0,tex:HR_MG.texN,art:Object.keys(hrMgAssetTable()).length,
    proc:!!HR_MG.proc,spare:!!HR_MG.spare,warmN:HR_MG.warmN,builds:HR_MG.builds,swaps:HR_MG.swaps,frees:HR_MG.frees,fails:HR_MG.fails,
    skin:e&&!e.dead?hrMgSkinOf(e):'',m3used:r&&r.hrM4?r.hrM4.m3used:0,adds:HR_MG.addN2||0,
    grade:{pre:HR_MG.pre,w:HR_MG.wOut,ecl:HR_MG.ecl,gw:HR_MG.gw,d:HR_MG.dist,sun:hrMgSun()},
    model:!!(typeof window!=='undefined'&&window.HR&&window.HR.MODELS&&window.HR.MODELS.malgorath)};}
MGEX.getHRMG=hrMgInfo;
MGEX.hrMgX={HR_MG,HR_MG_PRE,HR_MG_ROLE,HR_MG_ROLES,HR_MG_ADD,HR_MG_CRACK,HR_MG_LGAIN,hrMgLive,hrMgQ,hrMgBuild,hrMgMats,hrMgMat,hrMgMatsFree,
  hrMgPatch,hrMgGrade,hrMgSun,hrMgPreset,hrMgEclW,hrMgRigHr,hrMgSwapBoss,hrMgSkinOf,hrMgInstall,hrMgPrewarm,hrMgFreeSpare,hrMgTick,
  hrMgPack,hrMgAddsSwap,hrMgAddsTick,hrMgAddStep,hrMgAddFree,hrMgTex,hrMgHasArt,hrMgAssetTable,hrMgProc,hrMgDrive,
  src:{vsH:HR_MG_VS_H,vsB:HR_MG_VS_B,fsH:HR_MG_FS_H,fsS:HR_MG_FS_START,fsMap:HR_MG_FS_MAP,fsR:HR_MG_FS_ROUGH,fsN:HR_MG_FS_NRM+HR_MG_FS_NAN,fsE:HR_MG_FS_EM,fsEnd:HR_MG_FS_END}};
