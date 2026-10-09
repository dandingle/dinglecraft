/* ---- PART 57 HR: m4_c_rig.js ---- */
/* ===================================================================== */
/* PART 57 HR · m4_c_rig.js (M4): MGREG.rig.hr on M3's skeleton (one      */
/* skeleton, two skins: plan D11), the per-frame skin drive (round hue,   */
/* heartbeat, rim, the gold window, hurt, the death glow), embers, the    */
/* pack swap both ways, install + prewarm, and the per-frame watcher.     */
/* ===================================================================== */
/* The boss's Hyperreal body lives in e.mesh / e.mgRig with e.mgSkin='hr' (never e.hrM, so hrEntDisable never rebuilds him through
   makeMobMesh). Its one PointLight (userData.mgLight, from mg3Rig) is NOT hr-tagged: Hyperreal hides it before its first frame and
   the single foreign-light mirror carries it (hook HR2 copies its distance). Its meshes own their shadow flags (userData.hr). */
const HR_MG_CRACK={1:hrMgRaw(0xff5a1a),2:hrMgRaw(0xd0101a),3:hrMgRaw(0xffe6a0)};     /* bible 5.6: ember, blood, white-gold */
const HR_MG_RIMC={1:hrMgRaw(0xff6a22),2:hrMgRaw(0xc81414),3:hrMgRaw(0xfff0c0)};
const HR_MG_GOLD=hrMgRaw(0xffc040);
const HR_MG_LGAIN={1:2.4,2:2.6,3:5.5};   /* his light under physically correct lights (x16 by the mirror): the Eclipse key */
/* build one Hyperreal rig: M3's builder with the M4 material set (o.mats) and x2 tessellation at High+, then the HR dressing */
function hrMgBuild(o){o=o||{};const kind=o.kind||'boss';
  if(typeof mg3Rig!=='function'||typeof THREE==='undefined')return null;
  const Q=hrMgQ(),M=hrMgMats();let r=null;
  try{r=mg3Rig(Object.assign({},o,{kind,skin:'hr',mats:M.set,tess:Q.tess}));}catch(err){hrMgFail('mg3Rig',err);r=null;}
  if(!r||!r.root){hrMgMatsFree(M);return null;}
  HR_MG.builds++;
  const st={kind,t:0,ph:0,seed:(HR_MG.builds*7919)|0,em:null,m3used:0,swapped:0};
  r.hrMats=M;r.hrM4=st;r.skin='hr';
  try{hrMgDress(r,M,kind,Q);}catch(err){hrMgFail('dress',err);}
  if(kind!=='proxy')try{hrMgEmbers(r,Q);}catch(err){hrMgFail('embers',err);}
  if(Q.lod&&typeof r.lod==='function')try{r.lod(1);}catch(err){}
  const up=r.update,dis=r.dispose;
  r.update=function(dt,s){if(typeof up==='function')try{up.call(r,dt,s);}catch(err){if(!st.err){st.err=1;hrMgFail('m3 update',err);}}
    try{hrMgDrive(r,dt||0,s||MGA);}catch(err){if(!st.err2){st.err2=1;hrMgFail('drive',err);}}};
  r.dispose=function(){if(st.gone)return;st.gone=1;HR_MG.frees++;hrMgEmbersFree(r);hrMgBellyFree(st);
    /* the world's block materials (the Strata, the tail cube, the leaves) are shared: never let a rig dispose them, whichever pack
       is live when it goes (after an HR -> OG switch the global matOp is OG again, the rig still holds the Hyperreal one) */
    if(r.mats)for(const k in r.mats){const m=r.mats[k];if(m&&hrMgWorldMat(m))r.mats[k]=null;}
    if(typeof dis==='function')try{dis.call(r);}catch(err){hrMgFail('m3 dispose',err);}
    if(r.root&&r.root.parent)r.root.parent.remove(r.root);hrMgMatsFree(M);};
  r.root.userData.mgRig=r;r.root.userData.mgHr=1;
  return r;}
function hrMgWorldMat(m){if(!m)return false;if(m===matOp||m===matCut||m===matWat)return true;
  if(typeof TP!=='undefined'&&TP.og&&(m===TP.og.op||m===TP.og.cut||m===TP.og.wat))return true;
  if(typeof HRW!=='undefined'&&HRW&&HRW.mat&&(m===HRW.mat.op||m===HRW.mat.cut||m===HRW.mat.wat))return true;return false;}
/* the dressing: M3's meshes get our materials (or, if a builder ignored o.mats, a role by material kind), atlas-textured meshes
   (the Strata, the tail cube) get the live block material (Hyperreal's texture-array material after A's swap: the 4K world on the
   4K demon), every mesh owns its shadow flags (he casts the arena's biggest real shadow at Medium and above) */
function hrMgDress(r,M,kind,Q){const mine=new Set(M.list),vcol=new Map();let used=0;hrMgRestify(r.root);
  r.root.traverse(o=>{if(!o.material)return;for(const m of [].concat(o.material))if(mine.has(m))used++;});
  r.hrM4.m3used=used;
  const cast=kind!=='proxy'&&Q.shadow;
  r.root.traverse(o=>{
    if(o.isLight||(typeof THREE.PointLight==='function'&&o instanceof THREE.PointLight&&!o.geometry))return;   /* the one light stays foreign */
    if(!o.material||!o.geometry)return;
    const arr=Array.isArray(o.material);let ms=[].concat(o.material),ch=false;
    ms=ms.map(m=>{if(!m)return m;
      if(typeof atlasTex!=='undefined'&&atlasTex&&m.map===atlasTex&&matOp){ch=true;return matOp;}
      if(/drool/i.test(o.name||'')&&!mine.has(m)){ch=true;return M.set.drool;}
      if(!used&&!mine.has(m)&&!m.isMeshBasicMaterial&&m.type!=='MeshBasicMaterial'&&!m.isPointsMaterial&&!m.isSpriteMaterial){ch=true;
        return (o.name&&/horn|claw|hoof|keel/i.test(o.name))?M.set.horn:((o.name&&/tooth|teeth|fang/i.test(o.name))?M.set.enamel:
          ((o.name&&/eye/i.test(o.name))?M.set.eye:M.set.hide));}
      return m;});
    if(ch)o.material=arr?ms:ms[0];
    o.userData.hr=1;for(const m of ms)if(mine.has(m)){const a=o.geometry.attributes,vc=!!(a&&a.color);vcol.set(m,(vcol.has(m)?vcol.get(m):true)&&vc);}
    const tr=ms.some(m=>m&&m.transparent&&m!==M.set.crust);
    o.castShadow=!!cast&&!tr&&!o.userData.noShadow;o.receiveShadow=!tr;o.userData.cs=o.castShadow;});
  /* M3's macro variation (sooty back, pale belly, bone knuckles) rides vertex colours: kept on a role only when every mesh wearing
     it has a colour attribute (a mesh without one would read black) */
  for(const [m,v] of vcol)if(v&&!m.vertexColors&&!(HR_MG_ROLE[m.userData.mgRole]||{}).uv){m.vertexColors=true;m.needsUpdate=true;}}
/* per frame, after M3's update: the skin reads MGA (the shared rig state M2 writes) and MGL; nothing allocates.
   Who animates emissive: if M3's rig says r.mgEmissive (its update animates emissive/emissiveIntensity on o.mats: the round hue, the
   heartbeat, the telegraph channels), M4 leaves those two fields alone, so OG and Hyperreal tell the same story; otherwise (a
   builder that does not, the stub) M4 animates them here. Either way M4 owns the Hyperreal-only uniforms: the fresnel rim per
   round, the death light spreading over the hide (uMgGrow), the belly's translucent gaps, the emissive gain (uMgEmK, dark after
   the burst) and his light's Hyperreal gain. */
const HR_MG_SKIN=['hide','brow','handL','handR'];
const HR_MG_EMK={hide:0.75,brow:0.7,handL:0.75,handR:0.75,crust:0.65,eye:1.0};   /* Hyperreal scale on M3's OG-tuned emissive (bloom does the rest) */
function hrMgDrive(r,dt,s){const M=r.hrMats.set,st=r.hrM4;st.t+=dt;
  if((st.rf=(st.rf||0)+1)%90===0)hrMgRestify(r.root);   /* meshes M3 adds later (lazily built parts) get their rest copy too */
  const round=hrMgCl((s.round|0)||MGL.round||1,1,3),bpm=hrMgCl(+s.heart||(60+20*(round-1)),30,220);
  st.ph=(st.ph+dt*bpm/60*Math.PI*2)%(Math.PI*2);
  /* the death (M2: MGA.dead = scene seconds / 8): light cracks spread over the hide 0.3 -> 1.5 s, THE BURST at 1.5 s blazes him
     white, the sun leaves him (1.5 -> 3.2 s the blaze drains to embers), the burial 4.5 -> 8 s takes the last of the glow */
  const sm=(a,b,x)=>{const t=hrMgCl((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const beat=Math.pow(0.5+0.5*Math.sin(st.ph),3),dead=hrMgCl(+s.dead||0,0,1),post=sm(0.19,0.4,dead),grow=sm(0.0375,0.1875,dead)*(1-0.75*post);
  const after=sm(0.56,1.0,dead),hurt=hrMgCl(+s.hurt||0,0,1),vuln=s.vuln?1:0,ci=s.crack&&+s.crack.i>0?+s.crack.i:1;
  const C=HR_MG_CRACK[round],R=HR_MG_RIMC[round],G=HR_MG_GOLD,own=!r.mgEmissive,kk=(a,b,t)=>a+(b-a)*t;
  const ei=(0.55+0.65*beat)*(1+0.7*hurt)*ci*(1+3.2*grow),gain=(1-after)*(1-0.6*post);
  for(const role of HR_MG_SKIN){const m=M[role];if(!m)continue;const B=HR_MG_ROLE[role],U=m.userData.mgU;
    if(own){const gv=vuln*0.35*(0.6+0.4*beat);
      m.emissive.setRGB(kk(kk(C[0],G[0],gv),1,grow),kk(kk(C[1],G[1],gv),1,grow*0.85),kk(kk(C[2],G[2],gv),0.92,grow*0.7));m.emissiveIntensity=B.ei*ei*(m.userData.mgEk||1);}
    if(U){U.uMgGrow.value=grow;U.uMgEmK.value=gain*(own?1:HR_MG_EMK[role]*(round===3?0.62:1));   /* R3's white-gold cracks, tamed for HDR */
      const rs=B.rim*(0.12+0.3*hrMgCl(+s.rim||0,0,1))*(0.75+0.25*beat)*gain*(round===3?0.7:1);U.uMgRim.value.setRGB(R[0]*rs,R[1]*rs,R[2]*rs);}}
  /* belly crust: the window glows with what is inside it; the crust plates go white at the edges in the death */
  {const m=M.crust;if(m){const b=s.belly||{},bg=hrMgCl(+b.glow||0,0,1),U=m.userData.mgU;
    if(own){m.emissive.setRGB(kk(C[0],1,grow),kk(C[1]*0.9+0.1,1,grow),kk(C[2]*0.6,0.9,grow));
      m.emissiveIntensity=HR_MG_ROLE.crust.ei*(0.6+0.5*beat+1.2*bg)*(1+2.5*grow)*(m.userData.mgEk||1);}
    if(U){U.uMgGrow.value=grow;U.uMgGap.value=kk(0.35,0.12,bg);U.uMgEmK.value=gain*(own?1:HR_MG_EMK.crust);}}}
  /* the six eyes: brighter on his eye telegraph and his commit flash */
  {const m=M.eye;if(m){if(own){const tel=s.tel&&s.tel[4]?+s.tel[4]:0;m.emissiveIntensity=HR_MG_ROLE.eye.ei*(0.8+0.3*beat+2*tel+1.5*(s.commit?1:0));}
    if(m.userData.mgU)m.userData.mgU.uMgEmK.value=gain;}}
  /* wet flesh: a faint heat in the mouth, gone with him */
  {const m=M.flesh;if(m){if(own)m.emissiveIntensity=HR_MG_ROLE.flesh.ei*(0.7+0.5*beat)*(1+2*grow);if(m.userData.mgU)m.userData.mgU.uMgEmK.value=gain;}}
  for(const role of ['bile','drool','horn','enamel']){const m=M[role];if(m&&m.userData.mgU)m.userData.mgU.uMgEmK.value=gain;}
  /* his one light (mirrored x16): R3's white-gold throat light is the Eclipse key */
  if(r.light&&s.light){const L=s.light;if(L.col!=null&&r.light.color&&r.light.color.set)r.light.color.set(L.col);
    r.light.intensity=Math.max(0,+L.i||0)*HR_MG_LGAIN[round]*(1+0.15*beat)*gain;}
  hrMgEmbersStep(r,dt,round,grow,after);
  const BC=r.joints&&r.joints.contents;if(BC&&!hrMgSameKids(BC,st.kids))hrMgBelly(r,BC,(s.belly&&s.belly.items)||[]);}
/* the belly window in Hyperreal (bible 5.7): what he ate floats inside as the REAL cast model (a cow is the cow). M3 rebuilds the
   contents when the item list changes; each time, M4 swaps M3's OG mob bodies for the cast's (makeMobMesh(mt,{hr:1})), keeps M3's
   wrapper transform (M3 keeps tumbling the children), and frees the previous cast bodies. Blocks, the sun and the 16 px Dan stay. */
function hrMgSameKids(C,k){if(!k||k.length!==C.children.length)return false;for(let i=0;i<k.length;i++)if(k[i]!==C.children[i])return false;return true;}
function hrMgBellyFree(st){if(st.bellyH){for(const H of st.bellyH)if(typeof hrFree==='function')try{hrFree(H);}catch(err){}st.bellyH=null;}}
function hrMgBelly(r,C,list){const st=r.hrM4;hrMgBellyFree(st);st.bellyH=[];
  if(hrMgLive()&&typeof makeMobMesh==='function'){const items=list.slice(-3).filter(Boolean);
    for(let i=0;i<C.children.length;i++){const it=items[i],old=C.children[i];if(!it||(it.k!=='cow'&&it.k!=='mob'))continue;
      let R=null;try{R=makeMobMesh(it.id||'cow',{hr:1});}catch(err){R=null;}if(!R||!R.hrM||!R.G)continue;
      const w=new THREE.Group();R.G.scale.set(0.8,0.8,0.8);R.G.position.set(0,-0.6,0);w.add(R.G);w.position.copy(old.position);w.rotation.copy(old.rotation);
      C.children[i]=w;w.parent=C;old.parent=null;st.bellyH.push(R.hrM);try{R.hrM.hr.update(0,0,R.hrM.s);}catch(err){}
      w.traverse(o=>{if(o.material&&o.geometry){o.castShadow=false;o.userData.hr=1;}});}}
  st.kids=C.children.slice();}
/* ---- embers: smooth additive motes rising off his cracks (HR VFX; pillar 2: never block particles). One Points per rig,
   object-space, seeded, recycled; at most 240 (by tier). ---- */
function hrMgDot(){if(HR_MG.dot!==undefined)return HR_MG.dot;HR_MG.dot=null;
  try{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');
    if(!g||typeof g.createRadialGradient!=='function')return null;const gr=g.createRadialGradient(16,16,0,16,16,16);
    gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.35,'rgba(255,255,255,0.55)');gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr;g.fillRect(0,0,32,32);HR_MG.dot=new THREE.CanvasTexture(c);}catch(err){HR_MG.dot=null;}
  return HR_MG.dot;}
function hrMgEmbers(r,Q){if(typeof THREE.Points!=='function')return;const n=Q.embers|0;if(!n)return;
  const pos=new Float32Array(n*3),vel=new Float32Array(n),st=r.hrM4;let s=st.seed|1;
  const rnd=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
  for(let i=0;i<n;i++){pos[i*3]=(rnd()-0.5)*9;pos[i*3+1]=3+rnd()*16;pos[i*3+2]=(rnd()-0.5)*6;vel[i]=0.5+rnd()*1.1;}
  const g=new THREE.BufferGeometry(),a=new THREE.Float32BufferAttribute(pos,3);g.setAttribute('position',a);
  const m=hrTag(new THREE.PointsMaterial({size:0.28,map:hrMgDot(),transparent:true,depthWrite:false,opacity:0.85,
    blending:THREE.AdditiveBlending,color:0xff7a2a,sizeAttenuation:true}));
  const p=new THREE.Points(g,m);p.name='mg_embers';p.frustumCulled=false;p.userData.hr=1;p.renderOrder=3;
  r.root.add(p);st.em={p,g,a,m,pos,vel,n,rnd};}
function hrMgEmbersStep(r,dt,round,grow,after){const E=r.hrM4.em;if(!E)return;
  const pos=E.a.array||E.pos,n=E.n,up=dt*(round===3?1.6:1.0)*(1+2*grow),sw=Math.sin(r.hrM4.t*0.7);
  for(let i=0;i<n;i++){const j=i*3;pos[j+1]+=E.vel[i]*up;pos[j]+=sw*0.012*E.vel[i];
    if(pos[j+1]>21){pos[j]=(E.rnd()-0.5)*9;pos[j+1]=3+E.rnd()*4;pos[j+2]=(E.rnd()-0.5)*6;}}
  E.a.needsUpdate=true;
  const C=HR_MG_CRACK[round];if(E.m.color&&E.m.color.setRGB)E.m.color.setRGB(C[0]+(1-C[0])*grow,C[1]*0.8+(1-C[1]*0.8)*grow,C[2]*0.6+grow*0.5);
  E.m.opacity=0.85*(1-after);E.p.visible=after<1;}
function hrMgEmbersFree(r){const E=r.hrM4&&r.hrM4.em;if(!E)return;r.hrM4.em=null;if(E.p.parent)E.p.parent.remove(E.p);
  if(E.g&&E.g.dispose)E.g.dispose();if(E.m&&E.m.dispose)E.m.dispose();}
/* ---- MGREG.rig.hr (mgSpawnBoss asks it whenever MGREG.hrOn()): the prewarmed spare when there is one ---- */
function hrMgRigHr(o){o=o||{};const kind=o.kind||'boss';
  if(!hrMgLive())return hrMgOgRig(o);
  if(!HR_MG.inst)hrMgInstall();
  if(kind==='boss'&&HR_MG.spare&&HR_MG.spare.hrQ===hrMgQ().q){const r=HR_MG.spare;HR_MG.spare=null;
    if(r.root.parent)r.root.parent.remove(r.root);r.root.position.set(0,0,0);r.root.visible=true;return r;}
  const r=hrMgBuild(o);if(r){r.hrQ=hrMgQ().q;return r;}
  HR_MG.backoff=3;                                         /* the OG skin keeps him on screen; no retry storm */
  return hrMgOgRig(o);}
function hrMgOgRig(o){const f=MGREG.rig.og;if(typeof f!=='function')return null;const r=f(Object.assign({},o,{skin:'og'}));if(r&&!r.skin)r.skin='og';return r;}
/* ---- the swap: the live boss changes skin with the pack (plan 5.4). The new rig takes the old one's transform, the old one is
   disposed; M2 reads e.mgRig every frame, so the fight never notices. ---- */
function hrMgSkinOf(e){return (e.mgRig&&e.mgRig.skin)||e.mgSkin||'og';}
function hrMgSwapBoss(want){const e=MGF.boss;if(!e||e.dead||!e.mesh||!e.mgBoss)return false;if(hrMgSkinOf(e)===want)return false;
  const f=want==='hr'?hrMgRigHr:MGREG.rig.og;if(typeof f!=='function')return false;
  let r=null;try{r=f({kind:'boss',skin:want,round:e.round||MALG.round||1});}catch(err){hrMgFail('swap '+want,err);r=null;}
  if(!r||!r.root||(r.skin||want)!==want){if(r&&r.dispose&&r!==e.mgRig)try{r.dispose();}catch(err){}HR_MG.backoff=3;return false;}
  const G0=e.mesh,old=e.mgRig;
  r.root.position.copy(G0.position);r.root.rotation.copy(G0.rotation);r.root.scale.copy(G0.scale);r.root.visible=G0.visible;
  if(G0.parent)G0.parent.remove(G0);scene.add(r.root);
  e.mesh=r.root;e.mgRig=r;e.mgSkin=want;
  if(want==='og'&&typeof shadowify==='function')shadowify(r.root);
  try{if(r.update)r.update(0,MGA);}catch(err){}
  if(old&&old!==r&&old.dispose)try{old.dispose();}catch(err){hrMgFail('swap dispose',err);}
  else if(G0.parent)G0.parent.remove(G0);
  HR_MG.swaps++;
  if(want==='hr'&&typeof TP!=='undefined'&&TP.warm)try{TP.warm(r.root);}catch(err){}
  return true;}
/* ---- install (once, near the Bite with the cast live): the model file, the art, the procedural fallback ---- */
function hrMgInstall(){if(!hrMgLive())return false;if(HR_MG.inst)return !!HR_MG.ok;HR_MG.inst=1;
  try{const H=typeof window!=='undefined'?window.HR:null;
    if(H&&H.MODELS&&!H.MODELS.malgorath&&typeof hrLoadMModels==='function')hrLoadMModels();
    hrMgAssetTable();for(const r of HR_MG_ROLES){const id=HR_MG_ROLE[r].id;if(id&&hrMgHasArt(id))for(const m of ['b','n','r','m'])hrMgTex(id,m);}
    for(const id of ['mg_char','face_husk'])if(hrMgHasArt(id))for(const m of ['b','n','r','m'])hrMgTex(id,m);
    hrMgProc();HR_MG.ok=1;HR_MG.texOK=0;hrMgTexReady().then(()=>{HR_MG.texOK=1;},()=>{HR_MG.texOK=1;});}
  catch(err){HR_MG.ok=0;hrMgFail('install',err);}
  return !!HR_MG.ok;}
/* ---- prewarm (bible 5.8): within 70 m, in the height band, not live: build the spare and compile its programs behind one warm
   render, spread over frames; the spare is what mgSpawnBoss gets, so the intro never hitches ---- */
function hrMgPrewarm(dt){if(HR_MG.spare||MGF.live||HR_MG.backoff>0)return;
  if(MGF.boss&&!MGF.boss.dead&&hrMgSkinOf(MGF.boss)==='hr')return;   /* he is already here in Hyperreal: no second 160k-triangle copy */
  if(!(MGF.d<MGC.R_PREWARM)||!MGF.band||DEMON.dead)return;
  if(!hrMgInstall())return;
  HR_MG.warmT+=dt;
  if(!HR_MG.texOK&&HR_MG.warmT<2.5)return;                 /* the decoded art first (2.5 s at most) */
  const r=hrMgBuild({kind:'boss',round:MALG.round||1});if(!r){HR_MG.backoff=10;return;}
  r.hrQ=hrMgQ().q;r.root.position.set(MGC.X,mgGF()-40,MGC.Z);
  try{if(typeof TP!=='undefined'&&TP.warm)TP.warm(r.root);}catch(err){hrMgFail('warm',err);}
  if(r.root.parent)r.root.parent.remove(r.root);
  HR_MG.spare=r;HR_MG.warm=1;HR_MG.warmN++;}
function hrMgFreeSpare(){const r=HR_MG.spare;HR_MG.spare=null;if(r&&r.dispose)try{r.dispose();}catch(err){}}
/* ---- the watcher (MGREG.tick: only within 220 m of the Bite, overworld group) ---- */
function hrMgTick(dt){if(typeof TP==='undefined')return;hrMgM3Sync();
  if(HR_MG.backoff>0)HR_MG.backoff=Math.max(0,HR_MG.backoff-dt);
  const live=hrMgLive(),e=MGF.boss;
  if(e&&!e.dead&&e.mgBoss&&e.mesh){const want=live?'hr':'og';
    if(hrMgSkinOf(e)!==want&&(want==='og'||HR_MG.backoff<=0))hrMgSwapBoss(want);}
  if(live)try{hrMgPrewarm(dt);}catch(err){HR_MG.backoff=10;hrMgFail('prewarm',err);}
  else if(HR_MG.spare)hrMgFreeSpare();
  if(typeof hrMgAddsTick==='function')hrMgAddsTick(dt,live);}
function hrMgPack(id){try{
    if(id==='hr'&&hrMgLive()){hrMgSwapBoss('hr');if(typeof hrMgAddsSwap==='function')hrMgAddsSwap(true);}
    else{hrMgFreeSpare();hrMgSwapBoss('og');if(typeof hrMgAddsSwap==='function')hrMgAddsSwap(false);}}
  catch(err){hrMgFail('pack',err);}}
function hrMgQuality(){if(HR_MG.spare&&HR_MG.spare.hrQ!==hrMgQ().q)hrMgFreeSpare();}

MGREG.rig.hr=hrMgRigHr;
MGREG.hrOn=hrMgLive;
MGREG.tick.push(hrMgTick);
MGREG.onFar.push(hrMgFreeSpare);
tpOn('pack',hrMgPack);
tpOn('quality',hrMgQuality);
