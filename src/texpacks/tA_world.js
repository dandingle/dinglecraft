/* ---- PART 54: tA_world.js ---- */
/* tA_world.js (Package A): the Hyperreal world materials (r128 MeshStandardMaterial + onBeforeCompile).
   No remeshing and no new vertex attribute: tile index, local UV, per-block rotation and AO are all derived in the vertex
   shader from today's chunk geometry (uv = atlas tileUV, colour = face shade x AO, position, normal, modelMatrix).
   op: opaque blocks (+AO); cut: alpha-tested, double-sided (leaves, plants, glass, doors, beds, rails, ramps, torches);
   wat: water / ice / lava (transparent, no depth write). Fallback: a tile with no Hyperreal art (LUT layer 255) samples
   the OG atlas texel (sRGB -> linear) with a flat normal, lit by the Hyperreal lights.
   Texture sampling is never inside a branch: the flags are per triangle but a 2x2 pixel quad can straddle two triangles. */
/* WP-Z: opaque blocks remap the art's roughness from 0..1 to HRW_ROUGH_LO..1. The generated maps average 0.3-0.5 (wet-look
   rock and soil): fine under the diorama's single sun, crumpled foil under the game's close torch/lava lights. */
const HRW_ROUGH_LO=0.55;
var HRW={on:false,mat:null,cutDepth:null,cdKind:-1,U:null,dbg:false,key:'',cache:{},perturb:'',ctx:null,epoch:0};

const HRW_VP=`
uniform sampler2D hrLut;
flat varying vec4 vHrLut; varying vec2 vHrL;
#ifdef HR_AO
varying float vHrAO;
#endif
#ifdef HR_DEBUG_ROT
flat varying float vHrRot;
#endif
float hrHash(ivec3 c){ uvec3 u=uvec3(c);
  uint h=(u.x*374761393u)^(u.y*2246822519u)^(u.z*668265263u); h=(h^(h>>13u))*1274126177u; h^=h>>16u; return float(h)/4294967296.0; }
float hrShade(vec3 n){ return n.y>.5?1.:(n.y<-.5?.55:(abs(n.x)>.5?.8:.65)); }
void hrAxes(vec3 n,out vec3 U,out vec3 V){
  if(n.y>.5){U=vec3(0,0,1);V=vec3(1,0,0);}else if(n.y<-.5){U=vec3(1,0,0);V=vec3(0,0,1);}
  else if(n.x>.5){U=vec3(0,0,-1);V=vec3(0,1,0);}else if(n.x<-.5){U=vec3(0,0,1);V=vec3(0,1,0);}
  else if(n.z>.5){U=vec3(1,0,0);V=vec3(0,1,0);}else{U=vec3(-1,0,0);V=vec3(0,1,0);} }
`;
/* vertex body. uv: tileUV insets 1/(2*ATPX), so floor(uv*ATLAS) is the tile and L=(uv*ATLAS-T-1/32)*16/15 is 0..1 exactly at
   the corners whatever ATLAS is (the inset is .5/TPX = 1/32 in tile units; ATLAS 32 since v6.1, so the LUT has 1024 rows).
   hrShade/hrAxes mirror FACES (sh, u, v). The block centre needs a real cube face: chunk meshes only (drops,
   TNT, the hand are not on the 16-block grid), and in the cut bucket a vertex whose colour is not exactly its face shade
   belongs to a special shape (crosses .92, doors .88/.72/.6, beds/rails .95, ramps .95/.7/.8, wall torches .92). */
const HRW_VM=`
{ vec2 hT=floor(uv*${ATLAS}.); int hI=int(clamp(hT.x,0.,${ATLAS-1}.)+(${ATLAS-1}.-clamp(hT.y,0.,${ATLAS-1}.))*${ATLAS}.);
  vHrLut=texelFetch(hrLut,ivec2(hI,0),0);
  vec2 hL=(uv*${ATLAS}.-hT-.03125)*(16./15.);
#ifdef HR_AO
#ifdef USE_COLOR
  vHrAO=color.r/hrShade(normal);
#else
  vHrAO=1.;
#endif
#endif
  float hFl=floor(vHrLut.g*255.+.5),hRm=mod(hFl,4.),hMir=mod(floor(hFl/4.),2.),hRot=-1.;
  vec3 hMt=modelMatrix[3].xyz;
  bool hCh=hMt.y==0.&&fract(hMt.x/16.)==0.&&fract(hMt.z/16.)==0.;
#if defined(HR_CUT)&&defined(USE_COLOR)
  if(abs(color.r-hrShade(normal))>.004)hCh=false;
#endif
  if(hCh&&(hRm>.5||hMir>.5)){ vec3 hU,hV; hrAxes(normal,hU,hV);
    vec3 hC=position+(.5-hL.x)*hU+(.5-hL.y)*hV-normal*.5+hMt;
    float hH=hrHash(ivec3(floor(hC)));
    hRot=0.;
    if(hRm>1.5||(hRm>.5&&abs(normal.y)>.5))hRot=floor(hH*4.);
    if(hMir>.5&&fract(hH*7.)>.5)hRot+=4.; }
  vec2 hQ=hL-.5; float hR=max(hRot,0.); if(hR>3.5)hQ.x=-hQ.x; hR=mod(hR,4.);
  hQ=hR==1.?vec2(-hQ.y,hQ.x):(hR==2.?-hQ:(hR==3.?vec2(hQ.y,-hQ.x):hQ)); vHrL=hQ+.5;
#ifdef HR_DEBUG_ROT
  vHrRot=hRot;
#endif
}
`;
const HRW_FP=`
uniform highp sampler2DArray hrAlb; uniform highp sampler2DArray hrNR;
uniform float hrTime, hrNormalStr, hrRoughLo;
flat varying vec4 vHrLut; varying vec2 vHrL;
#ifdef HR_AO
varying float vHrAO;
#endif
#ifdef HR_DEBUG_ROT
flat varying float vHrRot;
#endif
`;
/* replaces <map_fragment>. Both texture paths are always sampled, then selected (no texture() in a branch). */
const HRW_MAP=`
float hrLay=floor(vHrLut.r*255.+.5),hrFl=floor(vHrLut.g*255.+.5);
bool hrHas=hrLay<254.5,hrWat=mod(floor(hrFl/64.),2.)>.5;
vec2 hrSt=vHrL;
if(mod(floor(hrFl/8.),2.)>.5)hrSt.y+=hrTime*(hrWat?.035:.012);
vec3 hrS=vec3(hrSt.x,1.-hrSt.y,min(hrLay,253.));
vec4 hrA=texture(hrAlb,hrS),hrN=texture(hrNR,hrS),hrO=sRGBToLinear(texture2D(map,vUv));
#ifdef HR_WATER
vec4 hrN2=texture(hrNR,vec3(hrSt.x*.71+hrTime*.021,1.-(hrSt.y*.71-hrTime*.017),hrS.z));
if(hrWat)hrN.rg=(hrN.rg+hrN2.rg)*.5;
#endif
#ifdef HR_CUT
{ vec2 hsz=vec2(textureSize(hrAlb,0).xy),hdx=dFdx(hrS.xy)*hsz,hdy=dFdy(hrS.xy)*hsz;     /* keep cutouts from thinning in the mips */
  hrA.a=clamp(hrA.a*(1.+max(.5*log2(max(max(dot(hdx,hdx),dot(hdy,hdy)),1e-8)),0.)*.25),0.,1.); }
#endif
hrA.rgb=sRGBToLinear(vec4(hrA.rgb,1.)).rgb;
if(!hrHas){hrA=hrO;hrN=vec4(.5,.5,.85,1.);}
diffuseColor*=hrA;
if(mod(floor(hrFl/32.),2.)>.5)diffuseColor.a=opacity;
#ifdef HR_DEBUG_ROT
if(vHrRot>-.5){ float hr4=mod(vHrRot,4.);
  vec3 ht=hr4<.5?vec3(1.,.18,.18):(hr4<1.5?vec3(.2,1.,.2):(hr4<2.5?vec3(.25,.4,1.):vec3(1.,.92,.15)));
  if(vHrRot>3.5&&fract((vHrL.x+vHrL.y)*3.)<.5)ht*=.25;
  diffuseColor.rgb=mix(diffuseColor.rgb,ht,.75); }
#endif
`;
/* replaces <normal_fragment_maps>: plants lit like the ground; art tiles get the rotated tangent-space normal */
const HRW_NRM=`
{ vec2 hxy=hrN.rg*2.-1.;
  vec3 hpn=hrPerturb(-vViewPosition,normal,vec3(hxy*hrNormalStr*vHrLut.a*2.,sqrt(max(0.,1.-dot(hxy,hxy)))),faceDirection,hrSt);
  if(mod(floor(hrFl/16.),2.)>.5)normal=normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz);
  else if(hrHas)normal=hpn; }
#ifdef HR_WATER
if(hrWat){ float hF=pow(1.-abs(dot(normalize(vViewPosition),normal)),5.); diffuseColor.a=mix(diffuseColor.a*.85,opacity,hF*.9); }
#endif
`;
const HRW_AO=`
#ifdef HR_AO
{ float a=mix(.25,1.,clamp((vHrAO-.45)/.55,0.,1.));
  reflectedLight.indirectDiffuse*=a; reflectedLight.indirectSpecular*=a; reflectedLight.directDiffuse*=mix(1.,a,.4); }
#endif
`;
/* hrPerturb: r128's perturbNormal2Arb, renamed, with the UV passed in (USE_NORMALMAP is not defined on these materials).
   The tangent frame comes from derivatives of the rotated UV, so no back-rotation is needed. */
function hrWPerturbSrc(fresh){if(HRW.perturb&&!fresh)return HRW.perturb;
  const s=THREE.ShaderChunk.normalmap_pars_fragment||'',i=s.indexOf('vec3 perturbNormal2Arb(');
  if(i<0)throw new Error('[HR] perturbNormal2Arb not found in this three.js');
  let d=0,j=s.indexOf('{',i);for(;j<s.length;j++){if(s[j]==='{')d++;else if(s[j]==='}'&&--d===0)break;}
  let f=s.slice(i,j+1).replace('perturbNormal2Arb(','hrPerturb(');
  const sig=f.indexOf(')');let call;
  if(/float\s+faceDirection/.test(f.slice(0,sig)))f=f.slice(0,sig)+', vec2 hrStArg'+f.slice(sig);
  else{f=f.slice(0,sig)+', float faceDirection, vec2 hrStArg'+f.slice(sig);}
  const n=(f.match(/vUv\.st/g)||[]).length;if(n!==2)throw new Error('[HR] perturbNormal2Arb: expected 2 vUv.st, found '+n);
  f=f.replace(/vUv\.st/g,'hrStArg');
  return HRW.perturb='\n'+f+'\n';}
function hrWPatch(sh){Object.assign(sh.uniforms,HRW.U);let v=sh.vertexShader,f=sh.fragmentShader;
  v=hrRep(v,'#include <common>','#include <common>\n'+HRW_VP,'A.v.common');
  v=hrRep(v,'#include <color_vertex>','#include <color_vertex>\n'+HRW_VM,'A.v.color');
  f=hrRep(f,'#include <common>','#include <common>\n'+HRW_FP+hrWPerturbSrc(),'A.f.common');
  f=hrRep(f,'#include <map_fragment>',HRW_MAP,'A.f.map');
  f=hrRep(f,'#include <color_fragment>','','A.f.color');
  f=hrRep(f,'#include <roughnessmap_fragment>','float roughnessFactor=roughness*hrN.b;\n#ifdef HR_AO\nroughnessFactor=mix(hrRoughLo,1.,roughnessFactor);\n#endif','A.f.rough');
  f=hrRep(f,'#include <normal_fragment_maps>',HRW_NRM,'A.f.nrm');
  f=hrRep(f,'#include <emissivemap_fragment>','totalEmissiveRadiance+=hrA.rgb*hrN.a*vHrLut.b*8.;','A.f.emi');
  f=hrRep(f,'#include <aomap_fragment>','#include <aomap_fragment>\n'+HRW_AO,'A.f.ao');
  sh.vertexShader=v;sh.fragmentShader=f;}
/* cutout shadow depth, High/Ultra: the Hyperreal alpha (rotated like the colour); layer 255 -> the OG atlas alpha */
function hrWPatchDepth(sh){Object.assign(sh.uniforms,HRW.U);let v=sh.vertexShader,f=sh.fragmentShader;
  v=hrRep(v,'#include <common>','#include <common>\n'+HRW_VP,'A.d.v.common');
  v=hrRep(v,'#include <uv_vertex>','#include <uv_vertex>\n'+HRW_VM,'A.d.v.uv');
  f=hrRep(f,'#include <common>','#include <common>\n'+HRW_FP,'A.d.f.common');
  f=hrRep(f,'#include <map_fragment>','{ float hrLay=floor(vHrLut.r*255.+.5); vec4 hrA=texture(hrAlb,vec3(vHrL.x,1.-vHrL.y,min(hrLay,253.)));\n'+
    '  vec4 hrO=texture2D(map,vUv); diffuseColor.a*=hrLay<254.5?hrA.a:hrO.a; }','A.d.f.map');
  sh.vertexShader=v;sh.fragmentShader=f;}
function hrWDepth(hr){
  const m=hrTag(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:atlasTex,alphaTest:0.5,side:THREE.DoubleSide}));
  if(hr){m.vertexColors=true;m.defines={HR_CUT:''};m.onBeforeCompile=hrWPatchDepth;m.customProgramCacheKey=()=>'hrwd1';}
  return m;}
function hrWMakeMats(){
  const base={map:atlasTex,vertexColors:true,roughness:1,metalness:0,flatShading:true};
  const M={op:new THREE.MeshStandardMaterial(Object.assign({},base)),
           cut:new THREE.MeshStandardMaterial(Object.assign({},base,{alphaTest:0.5,side:THREE.DoubleSide})),
           wat:new THREE.MeshStandardMaterial(Object.assign({},base,{transparent:true,opacity:1,depthWrite:false}))};
  const D={op:'HR_AO',cut:'HR_CUT',wat:'HR_WATER'};
  for(const k in M){const m=hrTag(M[k]);m.defines={[D[k]]:''};if(HRW.dbg)m.defines.HR_DEBUG_ROT='';
    m.onBeforeCompile=hrWPatch;m.customProgramCacheKey=()=>'hrw1|'+k+(HRW.dbg?'|rot':'');}
  return HRW.mat=M;}
/* swap the three chunk materials on every mesh that uses them (chunks, falling blocks, primed TNT, the held block under
   the camera, drop cubes) and the matOp/matCut/matWat globals that applyMesh reads. No chunk is remeshed. */
function hrWSwap(toHR){const og=TP.og,hr=HRW.mat;if(!og||!hr)return 0;
  const M=new Map(toHR?[[og.op,hr.op],[og.cut,hr.cut],[og.wat,hr.wat]]:[[hr.op,og.op],[hr.cut,og.cut],[hr.wat,og.wat]]);
  let n=0;const seen=new Set();
  const fix=o=>{if(!o||seen.has(o))return;seen.add(o);const m=o.material,to=m&&M.get(m);if(!to)return;o.material=to;n++;
    if(toHR&&to===hr.cut&&HRW.cutDepth)o.customDepthMaterial=HRW.cutDepth;
    else if(!toHR&&o.customDepthMaterial&&o.customDepthMaterial.userData&&o.customDepthMaterial.userData.hr)delete o.customDepthMaterial;};
  if(scene)scene.traverse(fix);
  for(const ch of chunks.values())if(ch.meshes)for(const m of ch.meshes)fix(m);
  const to=toHR?hr:og;matOp=to.op;matCut=to.cut;matWat=to.wat;
  return n;}
/* drops: Hyperreal block items are spinning mini cubes; OG gets its exact sprites back */
function hrWDrops(toHR){if(typeof entities==='undefined')return;
  for(const e of entities){if(e.t!=='drop'||e.dead||!e.mesh||!e.st)continue;
    if(toHR&&!e.mesh._hrCube&&!e.m3d&&tpCubeDrop(e.st.id)){const sp=e.mesh,
        m=new THREE.Mesh(mkCubeGeo(e.st.id,0.25),DEFS[e.st.id].bucket==='cut'?matCut:matOp);
      m._hrCube=1;m._hrSp=sp;m.position.copy(sp.position);m.rotation.y=(e.age||0)*1.5;
      scene.remove(sp);scene.add(m);e.mesh=m;e.m3d=1;}
    else if(!toHR&&e.mesh._hrCube){const m=e.mesh;let sp=m._hrSp;
      if(!sp){sp=new THREE.Sprite(iconTex(e.st.id));sp.scale.set(0.42,0.42,0.42);}
      sp.position.copy(m.position);scene.remove(m);scene.add(sp);e.mesh=sp;e.m3d=0;}}}
function hrWArrKey(q){const Q=HRQ[q]||HRQ[1],meta=tpAssetMeta();
  const px=Math.min(Q.tex||512,meta.blockPx||512),an=Math.max(1,Math.min(Q.aniso||1,tpCaps().aniso||1));
  return {px,an,key:px+'|'+an};}
function hrWDisposeArr(a){if(a){a.alb.dispose();a.nr.dispose();}}
/* keep the live arrays and the previous set (a failed tier change rolls back to it); dispose the rest */
function hrWPrune(){const keep=new Set([HRW.key,HRW.prevKey]);
  for(const k in HRW.cache)if(!keep.has(k)){hrWDisposeArr(HRW.cache[k]);delete HRW.cache[k];}}
function hrWWhy(){const c=tpCaps(),meta=tpAssetMeta(),L=meta.tiles.filter(t=>t.img).length;
  if(!c.webgl2||typeof THREE.DataTexture2DArray!=='function')return 'needs WebGL2';
  if(meta.profile==='none'||!L)return 'not in this build';
  if(c.maxLayers&&c.maxLayers<L)return 'too many layers for this GPU';
  return '';}
async function hrWPrepare(q,progress){const k=hrWArrKey(q);if(HRW.cache[k.key])return;
  const ep=HRW.epoch,a=await tpBuildArrays(k.px,k.an,progress);
  if(ep!==HRW.epoch){hrWDisposeArr(a);return;}                /* disabled meanwhile */
  HRW.cache[k.key]=a;}
function hrWEnable(q){const k=hrWArrKey(q),a=HRW.cache[k.key];if(!a)throw new Error('world: arrays not prepared');
  HRW.perturb='';hrWPerturbSrc();
  HRW.key=k.key;HRW.prevKey=null;
  HRW.U={hrLut:{value:tpBuildLut()},hrAlb:{value:a.alb},hrNR:{value:a.nr},hrTime:{value:0},hrNormalStr:{value:1},hrRoughLo:{value:HRW_ROUGH_LO}};
  hrWMakeMats();
  HRW.cdKind=(HRQ[q]&&HRQ[q].cutDepthHR)?1:0;HRW.cutDepth=hrWDepth(!!HRW.cdKind);
  hrWSwap(true);HRW.on=true;hrWDrops(true);
  const cv=renderer&&renderer.domElement;
  if(cv&&cv.addEventListener&&!HRW.ctx){HRW.ctx=()=>{if(HRW.on)hrWRestore();};cv.addEventListener('webglcontextrestored',HRW.ctx);}}
function hrWDisable(){HRW.epoch++;
  try{hrWDrops(false);}catch(e){console.warn('[TP] world drops',e);}
  if(HRW.mat)hrWSwap(false);
  HRW.on=false;
  if(HRW.mat)for(const k in HRW.mat)HRW.mat[k].dispose();
  if(HRW.cutDepth)HRW.cutDepth.dispose();
  for(const k in HRW.cache)hrWDisposeArr(HRW.cache[k]);
  if(TPA.lut)TPA.lut.dispose();
  HRW.cache={};HRW.mat=null;HRW.cutDepth=null;HRW.cdKind=-1;HRW.U=null;HRW.key='';HRW.prevKey=null;TPA.lut=null;
  const cv=renderer&&renderer.domElement;if(HRW.ctx&&cv&&cv.removeEventListener)cv.removeEventListener('webglcontextrestored',HRW.ctx);HRW.ctx=null;}
function hrWSetQuality(q,prev){const k=hrWArrKey(q),a=HRW.cache[k.key];
  if(a&&k.key!==HRW.key){HRW.prevKey=HRW.key;HRW.key=k.key;HRW.U.hrAlb.value=a.alb;HRW.U.hrNR.value=a.nr;hrWPrune();}
  const kind=(HRQ[q]&&HRQ[q].cutDepthHR)?1:0;
  if(kind!==HRW.cdKind){const old=HRW.cutDepth;HRW.cutDepth=hrWDepth(!!kind);HRW.cdKind=kind;
    scene.traverse(o=>{if(o.material===HRW.mat.cut)o.customDepthMaterial=HRW.cutDepth;});
    for(const ch of chunks.values())if(ch.meshes)for(const m of ch.meshes)if(m.material===HRW.mat.cut)m.customDepthMaterial=HRW.cutDepth;
    if(old)old.dispose();}}
/* WebGL context restored: the arrays' CPU copies were dropped after upload, so decode them again */
async function hrWRestore(){const k=HRW.key,ep=HRW.epoch,a0=HRW.cache[k];if(!a0)return;
  const a=await tpBuildArrays(a0.px,a0.aniso,null);
  if(ep!==HRW.epoch||HRW.key!==k){hrWDisposeArr(a);return;}
  HRW.cache[k]=a;HRW.U.hrAlb.value=a.alb;HRW.U.hrNR.value=a.nr;hrWDisposeArr(a0);
  if(TPA.lut)TPA.lut.needsUpdate=true;}
/* JS mirror of the shader's block rotation (same constants, float32 where the GPU rounds). Returns -1 when the face is
   not rotated, else 0..3 quarter turns (+4 = mirrored). face: 0 top, 1 bottom, 2..5 sides (FACES order). */
function hrHashJS(x,y,z){let h=(Math.imul(x|0,374761393)^Math.imul(y|0,-2048144777)^Math.imul(z|0,668265263))>>>0;
  h=Math.imul(h^(h>>>13),1274126177)>>>0;h=(h^(h>>>16))>>>0;return Math.fround(h)/4294967296;}
function hrRotJS(x,y,z,face,fl){const rm=fl&3,mir=(fl>>2)&1;if(!rm&&!mir)return -1;
  const h=hrHashJS(x,y,z);let r=0;if(rm===2||(rm===1&&face<2))r=Math.floor(h*4);
  if(mir){const f=Math.fround(h*7);if(f-Math.floor(f)>.5)r+=4;}return r;}
function tpDebugRot(on){HRW.dbg=!!on;
  if(HRW.mat)for(const k in HRW.mat){const m=HRW.mat[k];if(HRW.dbg)m.defines.HR_DEBUG_ROT='';else delete m.defines.HR_DEBUG_ROT;m.needsUpdate=true;}
  return HRW.dbg;}
