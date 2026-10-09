/* ---- PART 57 HR: m4_f_fx.js ---- */
/* ===================================================================== */
/* PART 57 HR · m4_f_fx.js (M4): Hyperreal VFX of the Bite: the air.      */
/* ===================================================================== */
/* While the round-aware grade is up (HR_MG.wOut > 0), a field of soft motes hangs around Dan's eye inside the Bite: ash flakes
   drifting down in the approach (Ash), sparks rising off the Throat in round I (Ember), dark blood-ash in round II (Blood), gold dust
   streaming up toward his throat under the Eclipse. One Points object (no light, hr-tagged material, no shadow), built on first use
   near him, recycled in place (no allocation per frame), hidden when the grade is idle, freed far away, on reset and on OG. */
var HR_MG_AIR={p:null,g:null,a:null,m:null,n:0,vel:null,seed:0x51f1,k:'',vis:0};
const HR_MG_AIRK={ash:{col:hrMgRaw(0xa89a96),size:0.10,vy:-0.45,sw:0.35,op:0.55},ember:{col:hrMgRaw(0xffa050),size:0.07,vy:1.1,sw:0.5,op:0.95},
  blood:{col:hrMgRaw(0x9a2418),size:0.09,vy:-0.3,sw:0.35,op:0.6},eclipse:{col:hrMgRaw(0xffe0a0),size:0.07,vy:1.7,sw:0.6,op:0.95}};
const HR_MG_AIR_R=18;   /* half-size of the box around Dan's eye (m) */
function hrMgAirRnd(){let s=HR_MG_AIR.seed=(HR_MG_AIR.seed+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;}
function hrMgAirBuild(){const Q=hrMgQ(),n=[120,240,360,480][Math.max(0,Math.min(3,Q.q))];if(typeof THREE.Points!=='function')return false;
  const pos=new Float32Array(n*3),vel=new Float32Array(n),ex=P.x,ey=P.y+1.6,ez=P.z,R=HR_MG_AIR_R;
  for(let i=0;i<n;i++){pos[i*3]=ex+(hrMgAirRnd()*2-1)*R;pos[i*3+1]=ey+(hrMgAirRnd()*2-1)*R;pos[i*3+2]=ez+(hrMgAirRnd()*2-1)*R;vel[i]=0.6+hrMgAirRnd()*0.8;}
  const g=new THREE.BufferGeometry(),a=new THREE.Float32BufferAttribute(pos,3);g.setAttribute('position',a);
  const m=hrTag(new THREE.PointsMaterial({size:0.08,map:hrMgDot(),transparent:true,depthWrite:false,opacity:0,color:0xffffff,sizeAttenuation:true}));
  const p=new THREE.Points(g,m);p.name='mg_air';p.frustumCulled=false;p.userData.hr=1;p.renderOrder=4;scene.add(p);
  Object.assign(HR_MG_AIR,{p,g,a,m,n,vel});return true;}
function hrMgAirFree(){const A=HR_MG_AIR;if(!A.p)return;if(A.p.parent)A.p.parent.remove(A.p);if(A.g.dispose)A.g.dispose();if(A.m.dispose)A.m.dispose();
  A.p=A.g=A.a=A.m=A.vel=null;A.n=0;A.k='';}
function hrMgAirTick(dt){const A=HR_MG_AIR;
  if(!hrMgLive()||!(HR_MG.wOut>0.02)||DIM!=='over'||!P){if(A.p&&A.p.visible)A.p.visible=false;return;}
  if(!A.p&&!hrMgAirBuild())return;
  const k=HR_MG.ecl>0.5?'eclipse':(HR_MG_AIRK[HR_MG.pre]?HR_MG.pre:'ash'),K=HR_MG_AIRK[k];
  if(k!==A.k){A.k=k;A.m.size=K.size;A.m.color.setRGB(K.col[0],K.col[1],K.col[2]);}
  A.m.opacity=K.op*hrMgCl(HR_MG.wOut,0,1);A.p.visible=true;
  const pos=A.a.array,n=A.n,R=HR_MG_AIR_R,D=R*2,ex=P.x,ey=P.y+1.6,ez=P.z,t=(HR_MG.ph=(HR_MG.ph||0)+dt);
  /* under the Eclipse the dust streams in toward his throat (the Bite's axis) as it rises */
  const pull=k==='eclipse'?0.35:0;
  for(let i=0;i<n;i++){const j=i*3,v=A.vel[i];let x=pos[j],y=pos[j+1],z=pos[j+2];
    y+=K.vy*v*dt;x+=Math.sin(t*0.6+i*1.7)*K.sw*dt;z+=Math.cos(t*0.5+i*2.3)*K.sw*dt;
    if(pull){const dx=MGC.X-x,dz=MGC.Z-z,l=Math.hypot(dx,dz)||1;x+=dx/l*pull*v*dt;z+=dz/l*pull*v*dt;}
    if(x<ex-R)x+=D;else if(x>ex+R)x-=D;if(y<ey-R)y+=D;else if(y>ey+R)y-=D;if(z<ez-R)z+=D;else if(z>ez+R)z-=D;
    pos[j]=x;pos[j+1]=y;pos[j+2]=z;}
  A.a.needsUpdate=true;}
MGREG.tick.push(function(dt){try{hrMgAirTick(dt);}catch(err){hrMgAirFree();hrMgFail('air',err);}});
MGREG.onFar.push(hrMgAirFree);
MGREG.onReset.push(hrMgAirFree);
tpOn('pack',function(id){if(id!=='hr')hrMgAirFree();});
MGEX.hrMgAir=()=>({on:!!HR_MG_AIR.p,vis:!!(HR_MG_AIR.p&&HR_MG_AIR.p.visible),n:HR_MG_AIR.n,k:HR_MG_AIR.k,op:HR_MG_AIR.m?HR_MG_AIR.m.opacity:0});
/* ---- the set dressing in Hyperreal (bible 3.6: the bile, the iris teeth, the eye in the slit ... "4K in both packs"): M3 builds
   the meshes; any mesh under a top-level scene group named mg* that carries userData.mgRole ('bile' 'enamel' 'eye' 'hide' 'horn'
   'flesh' 'crust' 'drool') wears M4's shared Hyperreal material for that role while the cast is live and gets its own material back
   on OG (stashed in userData.mgOgMat). Checked twice a second; nothing per frame. The boss rig (userData.mgRig) is skipped. ---- */
var HR_MG_DR={mats:null,t:0,n:0};
function hrMgDressMats(){if(!HR_MG_DR.mats){HR_MG_DR.mats=hrMgMats();for(const m of HR_MG_DR.mats.list)m.userData.mgDress=1;}return HR_MG_DR.mats.set;}
function hrMgDressSkin(live){let n=0;const set=live?hrMgDressMats():null;
  for(const g of scene.children){if(!g||!g.name||g.name.slice(0,2)!=='mg'||g.userData.mgRig||g.userData.mgHr||g===HR_MG_AIR.p)continue;
    g.traverse(o=>{const ro=o.userData&&o.userData.mgRole;if(!ro||!o.material||o.userData.mgRig)return;
      if(live){const m=set[ro];if(m&&o.material!==m){if(!o.userData.mgOgMat)o.userData.mgOgMat=o.material;o.material=m;o.userData.hr=1;n++;}}
      else if(o.userData.mgOgMat){o.material=o.userData.mgOgMat;o.userData.mgOgMat=null;o.userData.hr=0;n++;}});}
  HR_MG_DR.n+=n;return n;}
/* M3's particle pools are ShaderMaterials (mgFxAlpha smoke/steam/dust, mgFxAdd sparks/embers): Hyperreal's legacy adoption skips
   ShaderMaterials, so their sRGB-authored colours land in the linear HDR target as-is and read as white blobs. In Hyperreal M4 appends
   an sRGB -> linear step to their fragment output (own program cache key) and takes it off again on OG. */
/* unlit smoke and dust do not see the grade: in Hyperreal their (normal-blended) colour follows the scene's light level (uMgFxK: dim
   under the Eclipse, warm under Ember/Blood); additive sparks keep their glow */
var HR_MG_FXK={value:1};
function hrMgShaderLin(m,on){if(!m||!m.isShaderMaterial&&m.type!=='ShaderMaterial')return 0;const u=m.userData||(m.userData={});
  if(on){if(u.mgHrLin)return 0;const own=Object.prototype.hasOwnProperty.call(m,'onBeforeCompile')?m.onBeforeCompile:null,
      hk=Object.prototype.hasOwnProperty.call(m,'customProgramCacheKey')?m.customProgramCacheKey:null,add=m.blending===THREE.AdditiveBlending;
    u.mgHrLin={own,hk};
    m.onBeforeCompile=function(sh,r){if(own)own.call(this,sh,r);sh.uniforms.uMgFxK=HR_MG_FXK;const f=sh.fragmentShader,i=f.lastIndexOf('}');
      if(i>0)sh.fragmentShader='uniform float uMgFxK;\n'+f.slice(0,i)+'\n\tgl_FragColor.rgb=pow(max(gl_FragColor.rgb,vec3(0.0)),vec3(2.2))'+(add?'':'*uMgFxK')+';\n'+f.slice(i);};
    m.customProgramCacheKey=function(){return 'mghrlin2|'+(add?'a|':'n|')+(hk?hk.call(m):(m.fragmentShader||'').length+'|'+(m.vertexShader||'').length);};m.needsUpdate=true;return 1;}
  if(!u.mgHrLin)return 0;const o=u.mgHrLin;u.mgHrLin=null;
  if(o.own)m.onBeforeCompile=o.own;else delete m.onBeforeCompile;if(o.hk)m.customProgramCacheKey=o.hk;else delete m.customProgramCacheKey;m.needsUpdate=true;return 1;}
function hrMgFxLin(on){let n=0;for(const g of scene.children){if(!g||!g.name||!/^mg(Fx|Dress)/.test(g.name))continue;
    g.traverse(o=>{if(o.material&&!Array.isArray(o.material))n+=hrMgShaderLin(o.material,on);});}return n;}
function hrMgDressTick(dt){const live=hrMgLive();if(!live&&!HR_MG_DR.mats)return;   /* OG: nothing at all (og_trace malg) */
  {const w=hrMgCl(HR_MG.wOut||0,0,1),e=hrMgCl(HR_MG.ecl||0,0,1),k=(HR_MG.pre==='ash'?0.85:0.6)*(1-e)+0.22*e;HR_MG_FXK.value=1+(k-1)*w;}
  HR_MG_DR.t+=dt;if(HR_MG_DR.t<0.5)return;HR_MG_DR.t=0;hrMgDressSkin(live);hrMgFxLin(live);
  const M=HR_MG_DR.mats;if(M){const r=MGL.round||1,C=HR_MG_CRACK[hrMgCl(r,1,3)];const b=M.set.bile;if(b){b.emissiveIntensity=HR_MG_ROLE.bile.ei*(DEMON.dead?0.15:1);}
    for(const k of ['hide','brow'])if(M.set[k])M.set[k].emissive.setRGB(C[0],C[1],C[2]);}}
function hrMgDressFree(){hrMgDressSkin(false);hrMgFxLin(false);if(HR_MG_DR.mats){hrMgMatsFree(HR_MG_DR.mats);HR_MG_DR.mats=null;}}
MGREG.tick.push(function(dt){try{hrMgDressTick(dt);}catch(err){hrMgFail('dress',err);}});
MGREG.onFar.push(hrMgDressFree);
tpOn('pack',function(id){try{if(id!=='hr')hrMgDressFree();else hrMgDressSkin(hrMgLive());}catch(err){hrMgFail('dress pack',err);}});
MGEX.hrMgDress=()=>({n:HR_MG_DR.n,mats:!!HR_MG_DR.mats});
