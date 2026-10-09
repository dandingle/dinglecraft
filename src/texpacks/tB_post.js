/* ---- PART 54: tB_post.js ---- */
/* ===================================================================== */
/* PART 54 · tB_post.js: Package B, render path, post chain, adoption    */
/* ===================================================================== */
/* INTEGRATION_PLAN.md B6/B7. hrRender (hook B3) draws a Hyperreal frame:
     Low:          scene -> screen, the renderer does ACES (exposure eased per frame) + sRGB.
     Medium and up: scene -> half-float sceneRT (+ depth texture) -> SSAO (half res, Alchemy) + 4x4 depth-aware blur
                    -> bloom (Karis prefilter, box down, tent up) -> composite (AO, height haze, bloom, ACES, sRGB, vignette,
                    grain) -> ldrRT -> FXAA -> screen.
   Hand-written passes (no EffectComposer in the core build). Every pass is a hrTag'd ShaderMaterial (never adopted) that
   samples with texture2D only. Legacy (non-Hyperreal) materials are adopted reversibly through onBeforeCompile (hrLin:
   sRGB colour inputs -> linear, and Lambert's per-vertex PI dropped); restoring walks HRFX.adopted, so cached off-scene
   materials come back too. */
var HRFX={post:false,floatOK:false,adopted:new Set(),seen:null,shSeen:null,mapFrag:null,emiFrag:null,lamVert:null,lamFrag:null,
  sceneRT:null,aoRT:null,aoRT2:null,down:[],up:[],ldrRT:null,M:null,scn:null,cam:null,quad:null,v2:null,w:0,h:0,L:0,N:0,fx:false,
  cfg:{exp:1,bloom:.08,aoStr:.7,aoOn:1,hazeOn:1,hazeDen:.0045,hazeStart:8,hazeBase:30,hazeFall:.015,hazeMax:.75,hazeSun:.6,
    sunDir:[0,1,0],sunCol:[0,0,0],hazeCol:[0,0,0]}};
/* ---- pass shaders (GLSL ES 1.0 style: three adds the WebGL2 prefix) ---- */
const HRFX_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const HRFX_AO=['varying vec2 vUv;uniform sampler2D tDepth;uniform mat4 uProj,uInvProj;uniform float uRad;',
  'vec3 hrVP(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=uInvProj*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}',
  'void main(){float d0=texture2D(tDepth,vUv).x;if(d0>=.99999){gl_FragColor=vec4(1.);return;}',
  ' vec3 p=hrVP(vUv);vec3 n=normalize(cross(dFdx(p),dFdy(p)));vec2 fc=floor(gl_FragCoord.xy);',
  ' float rot=(mod(fc.x,4.)*4.+mod(fc.y,4.))*.3926991;float occ=0.;',      /* 4x4 interleaved rotation: the blur removes it */
  ' for(int i=0;i<HR_N;i++){float fi=float(i);float a=fi*2.3999632+rot,r=uRad*(fi+.5)/float(HR_N);',
  '  vec4 c=uProj*vec4(p+vec3(cos(a),sin(a),0.)*r,1.);vec3 v=hrVP(c.xy/c.w*.5+.5)-p;',
  '  occ+=max(dot(v,n)-.02*(-p.z),0.)/(dot(v,v)+.01);}',
  ' float ao=clamp(1.-1.2*occ/float(HR_N),0.,1.);gl_FragColor=vec4(ao,ao,ao,1.);}'].join('\n');
const HRFX_BLUR=['varying vec2 vUv;uniform sampler2D tAO,tDepth;uniform vec2 uTexel;uniform mat4 uInvProj;',
  'float hrVZ(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=uInvProj*vec4(0.,0.,d*2.-1.,1.);return p.z/p.w;}',
  'void main(){float z0=hrVZ(vUv),s=0.,w=0.;',
  ' for(int x=0;x<4;x++)for(int y=0;y<4;y++){vec2 o=(vec2(float(x),float(y))-1.5)*uTexel;',
  '  float k=max(0.,1.-abs(hrVZ(vUv+o)-z0)/(.3+.03*abs(z0)));s+=texture2D(tAO,vUv+o).r*k;w+=k;}',
  ' float a=w>0.?s/w:1.;gl_FragColor=vec4(a,a,a,1.);}'].join('\n');
const HRFX_PRE=['varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 uTexel;uniform float uExp,uThr,uKnee;',
  'vec3 hrT(vec2 o,inout float ws){vec3 c=texture2D(tSrc,vUv+o*uTexel).rgb*uExp;float w=1./(1.+dot(c,vec3(.2126,.7152,.0722)));ws+=w;return c*w;}',
  'void main(){float ws=0.;vec3 c=hrT(vec2(-1.,-1.),ws)+hrT(vec2(1.,-1.),ws)+hrT(vec2(-1.,1.),ws)+hrT(vec2(1.,1.),ws);c/=ws;',   /* Karis average */
  ' float br=max(c.r,max(c.g,c.b));float rq=clamp(br-uThr+uKnee,0.,2.*uKnee);rq=rq*rq/(4.*uKnee+1e-4);',
  ' c*=max(rq,br-uThr)/max(br,1e-4);gl_FragColor=vec4(c,1.);}'].join('\n');
const HRFX_DOWN=['varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 uTexel;',
  'void main(){vec3 c=texture2D(tSrc,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(tSrc,vUv+uTexel*vec2(1.,-1.)).rgb',
  ' +texture2D(tSrc,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(tSrc,vUv+uTexel*vec2(1.,1.)).rgb;gl_FragColor=vec4(c*.25,1.);}'].join('\n');
const HRFX_UP=['varying vec2 vUv;uniform sampler2D tLow,tHigh;uniform vec2 uTexel;',
  'void main(){vec2 t=uTexel;vec3 s=texture2D(tLow,vUv).rgb*4.;',
  ' s+=(texture2D(tLow,vUv+vec2(t.x,0.)).rgb+texture2D(tLow,vUv-vec2(t.x,0.)).rgb+texture2D(tLow,vUv+vec2(0.,t.y)).rgb+texture2D(tLow,vUv-vec2(0.,t.y)).rgb)*2.;',
  ' s+=texture2D(tLow,vUv+t).rgb+texture2D(tLow,vUv-t).rgb+texture2D(tLow,vUv+vec2(t.x,-t.y)).rgb+texture2D(tLow,vUv+vec2(-t.x,t.y)).rgb;',
  ' gl_FragColor=vec4(texture2D(tHigh,vUv).rgb+s/16.,1.);}'].join('\n');                  /* up[i] = down[i] + tent9(up[i+1]) */
/* the composite (plan B6, load-bearing): the ACES matrices match three's ACESFilmicToneMapping, /0.6 included */
const HRFX_COMP=['varying vec2 vUv;uniform sampler2D tScene,tDepth,tAO,tBloom;uniform mat4 uInvProj,uCamWorld;',
  'uniform vec3 uSunDir,uSunCol,uHazeCol;uniform float uExp,uBloom,uAOStr,uHazeDen,uHazeStart,uHazeBase,uHazeFall,uHazeMax,uHazeSun,uVig,uGrain,uTime,uUseAO,uUseBloom,uUseHaze;',
  'vec3 hrRRT(vec3 v){vec3 a=v*(v+0.0245786)-0.000090537;vec3 b=v*(0.983729*v+0.4329510)+0.238081;return a/b;}',
  'vec3 hrACES(vec3 c){const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));',
  ' const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));',
  ' return clamp(O*hrRRT(I*(c/0.6)),0.,1.);}',
  'vec3 hrSRGB(vec3 c){return mix(pow(c,vec3(0.41666))*1.055-0.055,c*12.92,vec3(lessThanEqual(c,vec3(0.0031308))));}',
  'void main(){vec3 col=texture2D(tScene,vUv).rgb;float d=texture2D(tDepth,vUv).x;float lum=dot(col,vec3(.2126,.7152,.0722));',
  ' if(uUseAO>.5)col*=mix(1.,texture2D(tAO,vUv).r,uAOStr*(1.-smoothstep(.8,2.5,lum)));',            /* spare emissives */
  ' if(uUseHaze>.5&&d<.99999){vec4 v4=uInvProj*vec4(vUv*2.-1.,d*2.-1.,1.);vec3 vp=v4.xyz/v4.w;',
  '  vec3 wd=normalize((uCamWorld*vec4(vp,0.)).xyz);float wy=(uCamWorld*vec4(vp,1.)).y;',
  '  float h=(1.-exp(-max(length(vp)-uHazeStart,0.)*uHazeDen))*exp(-max(wy-uHazeBase,0.)*uHazeFall);',
  '  col=mix(col,uHazeCol+uSunCol*pow(max(dot(wd,uSunDir),0.),8.)*uHazeSun,clamp(h,0.,uHazeMax));}',
  ' if(uUseBloom>.5)col+=texture2D(tBloom,vUv).rgb*uBloom;',
  ' col=hrSRGB(hrACES(col*uExp));vec2 cc=vUv-.5;col*=1.-dot(cc,cc)*uVig;',
  ' col+=(fract(sin(dot(vUv*1e3+uTime,vec2(12.9898,78.233)))*43758.5453)-.5)*uGrain;gl_FragColor=vec4(col,1.);}'].join('\n');
const HRFX_FXAA=['varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 uTexel;',          /* classic 5-tap FXAA, span +-8 px */
  'void main(){vec3 L=vec3(.299,.587,.114);',
  ' vec3 nw=texture2D(tSrc,vUv+vec2(-1.,-1.)*uTexel).rgb,ne=texture2D(tSrc,vUv+vec2(1.,-1.)*uTexel).rgb;',
  ' vec3 sw=texture2D(tSrc,vUv+vec2(-1.,1.)*uTexel).rgb,se=texture2D(tSrc,vUv+vec2(1.,1.)*uTexel).rgb,m=texture2D(tSrc,vUv).rgb;',
  ' float a=dot(nw,L),b=dot(ne,L),c=dot(sw,L),e=dot(se,L),lm=dot(m,L);',
  ' float lo=min(lm,min(min(a,b),min(c,e))),hi=max(lm,max(max(a,b),max(c,e)));',
  ' vec2 dir=vec2(-((a+b)-(c+e)),(a+c)-(b+e));float red=max((a+b+c+e)*.03125,1./128.);',
  ' dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+red),vec2(-8.),vec2(8.))*uTexel;',
  ' vec3 A=.5*(texture2D(tSrc,vUv+dir*(1./3.-.5)).rgb+texture2D(tSrc,vUv+dir*(2./3.-.5)).rgb);',
  ' vec3 Bc=A*.5+.25*(texture2D(tSrc,vUv-dir*.5).rgb+texture2D(tSrc,vUv+dir*.5).rgb);float lb=dot(Bc,L);',
  ' gl_FragColor=vec4((lb<lo||lb>hi)?A:Bc,1.);}'].join('\n');
/* ---- legacy material adoption (plan B7) ---- */
function hrLin(sh){let f=sh.fragmentShader;
  f=f.replace('vec4 diffuseColor = vec4( diffuse, opacity );',()=>'vec4 diffuseColor = vec4( pow( diffuse, vec3( 2.2 ) ), opacity );');
  if(HRFX.mapFrag)f=f.replace('#include <map_fragment>',()=>HRFX.mapFrag);          /* map_fragment with mapTexelToLinear -> sRGBToLinear */
  f=f.replace('vec3 totalEmissiveRadiance = emissive;',()=>'vec3 totalEmissiveRadiance = pow( emissive, vec3( 2.2 ) );');
  if(HRFX.emiFrag)f=f.replace('#include <emissivemap_fragment>',()=>HRFX.emiFrag);  /* emissiveMapTexelToLinear -> sRGBToLinear */
  sh.fragmentShader=f;
  /* r128 MeshLambertMaterial lights per VERTEX, and (1) r128 puts PHYSICALLY_CORRECT_LIGHTS in the fragment prefix only, so the
     vertex code multiplies ambient + hemisphere by PI and uses the legacy point-light falloff; (2) lights_lambert_vertex scales
     every direct light by PI unconditionally. Define the flag in the vertex shader and drop the PI: Lambert then matches
     Standard/Phong diffuse under physical lights (measured in the browser: grey Lambert == grey Standard). */
  /* (3) Lambert multiplies the SUM of all per-vertex lights by the fragment's shadow mask, so the sun's shadow (every cave, and a
     stale map in the Nether) would also wipe out torch, lava and glowstone light. The patched chunk keeps the directional
     part in its own varying and the mask is applied to that part only. */
  if(HRFX.lamVert&&sh.vertexShader&&sh.vertexShader.indexOf('#include <lights_lambert_vertex>')>=0){
    sh.vertexShader='#ifndef PHYSICALLY_CORRECT_LIGHTS\n#define PHYSICALLY_CORRECT_LIGHTS\n#endif\nvarying vec3 vHrDirF;\nvarying vec3 vHrDirB;\n'+
      sh.vertexShader.replace('#include <lights_lambert_vertex>',()=>HRFX.lamVert);
    if(HRFX.lamFrag&&sh.fragmentShader.indexOf(HRFX_LAMF)>=0)
      sh.fragmentShader='varying vec3 vHrDirF;\nvarying vec3 vHrDirB;\n'+sh.fragmentShader.replace(HRFX_LAMF,()=>HRFX.lamFrag);}}
const HRFX_LAMF='reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();';
const HRFX_LAMF2=['#ifdef DOUBLE_SIDED','\tvec3 hrDirL = ( gl_FrontFacing ) ? vHrDirF : vHrDirB;','#else','\tvec3 hrDirL = vHrDirF;','#endif',
  '\treflectedLight.directDiffuse = ( reflectedLight.directDiffuse - hrDirL * ( 1.0 - getShadowMask() ) ) * BRDF_Diffuse_Lambert( diffuseColor.rgb );'].join('\n');
/* the PI-free Lambert chunk with the directional term also kept in vHrDirF/B (null pieces leave r128's code as it is) */
function hrLamChunks(lv){if(!lv||lv.indexOf('PI * directLight.color')<0)return {v:null,f:null};
  lv=lv.split('PI * directLight.color').join('directLight.color');
  const a=lv.indexOf('#if NUM_DIR_LIGHTS > 0'),b=a<0?-1:lv.indexOf('#pragma unroll_loop_end',a);
  const F='vLightFront += saturate( dotNL ) * directLightColor_Diffuse;',Bk='vLightBack += saturate( -dotNL ) * directLightColor_Diffuse;';
  if(a<0||b<0)return {v:lv,f:null};
  let blk=lv.slice(a,b);if(blk.indexOf(F)<0||blk.indexOf(Bk)<0)return {v:lv,f:null};
  blk=blk.replace(F,()=>F+'\n\t\tvHrDirF += saturate( dotNL ) * directLightColor_Diffuse;').replace(Bk,()=>Bk+'\n\t\t\tvHrDirB += saturate( -dotNL ) * directLightColor_Diffuse;');
  return {v:'vHrDirF = vec3( 0.0 );\nvHrDirB = vec3( 0.0 );\n'+lv.slice(0,a)+blk+lv.slice(b),f:HRFX_LAMF2};}
const hrOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
/* v6.1: the purgatory additive dimmer (alpha x HRFX_ADD after fog: AdditiveBlending is SRC_ALPHA, ONE) */
const HRFX_ADD=0.22;
function hrLinAdd(sh){const f=sh.fragmentShader,k='#include <fog_fragment>',i=f.lastIndexOf(k);
  sh.fragmentShader=i>=0?f.slice(0,i+k.length)+'\n\tgl_FragColor.a *= '+HRFX_ADD.toFixed(2)+';'+f.slice(i+k.length):f.replace(/\}\s*$/,'\tgl_FragColor.a *= '+HRFX_ADD.toFixed(2)+';\n}');}
function hrLinAddObc(sh){hrLin(sh);hrLinAdd(sh);}
function hrAdoptMat(m){HRFX.seen.add(m);
  if(m.isShaderMaterial||m.isRawShaderMaterial||m.isMeshDepthMaterial||m.isMeshDistanceMaterial||(m.userData&&m.userData.hr))return;
  const own=hrOwn(m,'onBeforeCompile')&&typeof m.onBeforeCompile==='function',key=hrOwn(m,'customProgramCacheKey');
  /* v6.1 (P7): additive overlays built inside purgatory (followspot and Palace cones, beacons, glows) add their light into the HDR
     target and blew out to opaque white fans: their alpha is scaled for Hyperreal (restored with everything else on the way out) */
  const add=m.blending===THREE.AdditiveBlending&&DIM==='puppet';
  m._hrObc={own,f:own?m.onBeforeCompile:null,key,kf:key?m.customProgramCacheKey:null};
  if(own){const f=m.onBeforeCompile,k0=m._hrObc.kf;m.onBeforeCompile=function(sh,r){f.call(this,sh,r);hrLin(sh);if(add)hrLinAdd(sh);};
    m.customProgramCacheKey=()=>'hrlin|'+(add?'add|':'')+(k0?k0.call(m):f.toString());}       /* wrappers would otherwise share one key */
  else m.onBeforeCompile=add?hrLinAddObc:hrLin;            /* r128's default key is onBeforeCompile.toString(): OG programs stay cached */
  if(!m.userData)m.userData={};m.userData.hrLin=1;m.needsUpdate=true;HRFX.adopted.add(m);}
function hrAdoptVisit(o){
  if(o.isMesh&&!HRFX.shSeen.has(o)){HRFX.shSeen.add(o);if(TP.shadow)hrShNew(o);}   /* meshes born mid-session get B's rule once */
  if(o.isLight){if(o.isPointLight&&o.visible&&!(o.userData&&o.userData.hr)&&!(HRL.ogL&&HRL.ogL.has(o))&&!HRL.foreign.has(o)){
      o.visible=false;HRL.foreign.add(o);}return;}         /* hidden before its first Hyperreal frame: the light count never changes */
  const m=o.material;if(!m)return;const S=HRFX.seen;
  if(Array.isArray(m)){for(let i=0;i<m.length;i++)if(m[i]&&!S.has(m[i]))hrAdoptMat(m[i]);}
  else if(!S.has(m))hrAdoptMat(m);}
function hrAdoptScene(){if(!HRL.on||!scene)return;if(!HRFX.seen)HRFX.seen=new WeakSet();if(!HRFX.shSeen)HRFX.shSeen=new WeakSet();if(!HRL.foreign)HRL.foreign=new Set();scene.traverse(hrAdoptVisit);}
function hrAdoptRestore(){for(const m of HRFX.adopted){const o=m._hrObc;
    if(o&&o.own)m.onBeforeCompile=o.f;else delete m.onBeforeCompile;
    if(o&&o.key)m.customProgramCacheKey=o.kf;else if(o&&o.own)delete m.customProgramCacheKey;
    delete m._hrObc;if(m.userData)delete m.userData.hrLin;m.needsUpdate=true;}
  HRFX.adopted.clear();HRFX.seen=null;HRFX.shSeen=null;}
/* ---- shadow rules (hooks B5 shadowify, B6 applyShadows). Hyperreal models (userData.hr) own their flags. ---- */
function hrIsWat(m){return !!m&&(m===matWat||(TP.og&&m===TP.og.wat)||(typeof HRW!=='undefined'&&HRW&&HRW.mat&&m===HRW.mat.wat));}
function hrIsSolid(m){return !!m&&(m===matOp||m===matCut||(TP.og&&(m===TP.og.op||m===TP.og.cut))||
  (typeof HRW!=='undefined'&&HRW&&HRW.mat&&(m===HRW.mat.op||m===HRW.mat.cut)));}
function hrTransp(m){return !!m&&!hrIsSolid(m)&&(m._xo!==undefined?m._xo.t:m.transparent);}   /* X-ray ghosting is not transparency */
function hrShRule(o,on,ctx){if(!o.isMesh||o.isSprite||(o.userData&&o.userData.hr))return;
  if(ctx){o.castShadow=false;o.receiveShadow=false;return;}                 /* the hand and the clouds: neither */
  const m=o.material;let see=false;
  if(Array.isArray(m)){for(const x of m)if(hrIsWat(x)||hrTransp(x))see=true;}else see=hrIsWat(m)||hrTransp(m);
  o.castShadow=on&&!see;o.receiveShadow=on;}                                /* water and transparent: receive only */
function hrShWalk(o,on,ctx){if(o===handG||o===cloudG)ctx=1;hrShRule(o,on,ctx);if(HRFX.shSeen&&o.isMesh)HRFX.shSeen.add(o);
  const c=o.children;if(c)for(let i=0;i<c.length;i++)hrShWalk(c[i],on,ctx);}
function hrShNew(o){let ctx=0;for(let p=o.parent;p;p=p.parent)if(p===handG||p===cloudG){ctx=1;break;}hrShRule(o,true,ctx);}
function hrShadowify(o){if(!HRL.on||!TP.shadow||!o)return;let ctx=0;for(let p=o.parent;p;p=p.parent)if(p===handG||p===cloudG){ctx=1;break;}
  hrShWalk(o,true,ctx);}
function hrApplyShadows(){const R=renderer;if(!HRL.on||!R||!R.shadowMap)return;const Q=tpQ(),on=Q.shadow>0;
  const was=R.shadowMap.enabled;R.shadowMap.enabled=on;R.shadowMap.type=THREE.PCFSoftShadowMap!==undefined?THREE.PCFSoftShadowMap:2;R.shadowMap.autoUpdate=false;
  if(sunL){sunL.castShadow=on;const sh=sunL.shadow;
    if(on&&sh){if(sh.mapSize.width!==Q.shadow||sh.mapSize.height!==Q.shadow){if(sh.map){sh.map.dispose();sh.map=null;}sh.mapSize.width=sh.mapSize.height=Q.shadow;}
      const c=sh.camera,S=Q.ext||64;if(c){c.left=-S;c.right=S;c.top=S;c.bottom=-S;c.near=1;c.far=420;if(c.updateProjectionMatrix)c.updateProjectionMatrix();}
      sh.bias=-0.0003;sh.normalBias=0.02;}}
  if(scene){hrShWalk(scene,on,0);if(was!==on)scene.traverse(hrNeedsUpdate);}
  HRL.shForce=true;}
/* ---- render targets and passes ---- */
function hrFXRT(w,h,half,depth){const o={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,depthBuffer:!!depth,stencilBuffer:false};
  if(half)o.type=THREE.HalfFloatType;const rt=new THREE.WebGLRenderTarget(w,h,o);if(rt.texture)rt.texture.generateMipmaps=false;
  if(depth){rt.depthTexture=new THREE.DepthTexture(w,h);rt.depthTexture.type=THREE.UnsignedIntType;}
  return rt;}
function hrFXMat(fs,uni,defs,key){const m=hrTag(new THREE.ShaderMaterial({uniforms:uni,vertexShader:HRFX_VS,fragmentShader:fs,defines:defs||{},
  depthTest:false,depthWrite:false,toneMapped:false,extensions:{derivatives:true}}));m.customProgramCacheKey=()=>key;return m;}
const hrU=v=>({value:v});
function hrFXBuild(Q){const X=HRFX,R=renderer;if(!X.v2)X.v2=new THREE.Vector2();R.getDrawingBufferSize(X.v2);
  const w=Math.max(1,X.v2.x|0),h=Math.max(1,X.v2.y|0);X.w=w;X.h=h;X.L=Q.bloom|0;X.N=Q.ssao|0;X.fx=!!Q.fxaa;
  if(!X.scn){X.scn=new THREE.Scene();X.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);X.geo=new THREE.PlaneGeometry(2,2);}
  X.sceneRT=hrFXRT(w,h,true,true);
  const hw=Math.max(1,w>>1),hh=Math.max(1,h>>1),M={};
  if(X.N){X.aoRT=hrFXRT(hw,hh,false);X.aoRT2=hrFXRT(hw,hh,false);
    M.ao=hrFXMat(HRFX_AO,{tDepth:hrU(X.sceneRT.depthTexture),uProj:hrU(camera.projectionMatrix),uInvProj:hrU(camera.projectionMatrixInverse),uRad:hrU(.7)},{HR_N:X.N},'hrfx-ao'+X.N);
    M.blur=hrFXMat(HRFX_BLUR,{tAO:hrU(X.aoRT.texture),tDepth:hrU(X.sceneRT.depthTexture),uTexel:hrU(new THREE.Vector2(1/hw,1/hh)),uInvProj:hrU(camera.projectionMatrixInverse)},null,'hrfx-blur');}
  M.down=[];M.up=[];
  for(let i=0;i<X.L;i++){const s=2<<i,rw=Math.max(1,Math.floor(w/s)),rh=Math.max(1,Math.floor(h/s));X.down.push(hrFXRT(rw,rh,true));
    const src=i?X.down[i-1]:X.sceneRT,sw=i?X.down[i-1].width:w,shh=i?X.down[i-1].height:h;
    M.down.push(i?hrFXMat(HRFX_DOWN,{tSrc:hrU(src.texture),uTexel:hrU(new THREE.Vector2(1/sw,1/shh))},null,'hrfx-down')
                :hrFXMat(HRFX_PRE,{tSrc:hrU(src.texture),uTexel:hrU(new THREE.Vector2(1/sw,1/shh)),uExp:hrU(1),uThr:hrU(1),uKnee:hrU(.5)},null,'hrfx-pre'));}
  for(let i=X.L-2;i>=0;i--){const d=X.down[i];X.up[i]=hrFXRT(d.width,d.height,true);}
  for(let i=0;i<X.L-1;i++){const lo=i===X.L-2?X.down[i+1]:X.up[i+1];
    M.up[i]=hrFXMat(HRFX_UP,{tLow:hrU(lo.texture),tHigh:hrU(X.down[i].texture),uTexel:hrU(new THREE.Vector2(1/lo.width,1/lo.height))},null,'hrfx-up');}
  const bl=X.L>1?X.up[0]:(X.L?X.down[0]:null);
  M.comp=hrFXMat(HRFX_COMP,{tScene:hrU(X.sceneRT.texture),tDepth:hrU(X.sceneRT.depthTexture),tAO:hrU(X.aoRT2?X.aoRT2.texture:null),tBloom:hrU(bl?bl.texture:null),
    uInvProj:hrU(camera.projectionMatrixInverse),uCamWorld:hrU(camera.matrixWorld),uSunDir:hrU(new THREE.Vector3(0,1,0)),uSunCol:hrU(new THREE.Color(0,0,0)),
    uHazeCol:hrU(new THREE.Color(0,0,0)),uExp:hrU(1),uBloom:hrU(.08),uAOStr:hrU(.7),uHazeDen:hrU(.0045),uHazeStart:hrU(8),uHazeBase:hrU(30),
    uHazeFall:hrU(.015),uHazeMax:hrU(.75),uHazeSun:hrU(.6),uVig:hrU(.25),uGrain:hrU(Q.grain||0),uTime:hrU(0),uUseAO:hrU(0),uUseBloom:hrU(0),uUseHaze:hrU(0)},null,'hrfx-comp');
  if(X.fx){X.ldrRT=hrFXRT(w,h,false);M.fxaa=hrFXMat(HRFX_FXAA,{tSrc:hrU(X.ldrRT.texture),uTexel:hrU(new THREE.Vector2(1/w,1/h))},null,'hrfx-fxaa');}
  if(!X.quad){X.quad=new THREE.Mesh(X.geo,M.comp);X.quad.frustumCulled=false;X.scn.add(X.quad);}
  X.M=M;}
function hrFXFree(){const X=HRFX,d=rt=>{if(!rt)return;if(rt.depthTexture&&rt.depthTexture.dispose)rt.depthTexture.dispose();rt.dispose();};
  d(X.sceneRT);d(X.aoRT);d(X.aoRT2);d(X.ldrRT);for(const r of X.down)d(r);for(const r of X.up)d(r);
  X.sceneRT=X.aoRT=X.aoRT2=X.ldrRT=null;X.down.length=0;X.up.length=0;
  if(X.M){for(const k in X.M){const v=X.M[k];for(const m of [].concat(v))if(m&&m.dispose)m.dispose();}X.M=null;}}
function hrFXCount(){const X=HRFX;return (X.sceneRT?1:0)+(X.aoRT?1:0)+(X.aoRT2?1:0)+(X.ldrRT?1:0)+X.down.length+X.up.filter(Boolean).length;}
function hrFXEnable(Q){const C=THREE.ShaderChunk||{};
  HRFX.mapFrag=(C.map_fragment&&C.map_fragment.indexOf('mapTexelToLinear')>=0)?C.map_fragment.replace('mapTexelToLinear','sRGBToLinear'):null;
  HRFX.emiFrag=(C.emissivemap_fragment&&C.emissivemap_fragment.indexOf('emissiveMapTexelToLinear')>=0)?C.emissivemap_fragment.replace('emissiveMapTexelToLinear','sRGBToLinear'):null;
  const lc=hrLamChunks(C.lights_lambert_vertex);HRFX.lamVert=lc.v;HRFX.lamFrag=lc.f;
  HRFX.seen=new WeakSet();HRFX.shSeen=new WeakSet();HRFX.adopted.clear();
  if(HRFX.post)hrFXBuild(Q);}
function hrFXDisable(){hrFXFree();const X=HRFX;
  if(X.quad){X.scn.remove(X.quad);X.quad=null;}if(X.geo){X.geo.dispose();X.geo=null;}X.scn=null;X.cam=null;X.post=false;}
function hrFXPass(m,target){const X=HRFX;X.quad.material=m;renderer.setRenderTarget(target);renderer.render(X.scn,X.cam);}
/* ---- the frame (hook B3; also tpRenderOnce). Without this module live it draws exactly what OG draws. ---- */
function hrRender(){const R=renderer;
  if(!HRL.on){if(SHD.on&&SHD.rt){R.setRenderTarget(SHD.rt);R.render(scene,camera);R.setRenderTarget(null);R.render(SHD.scn,SHD.cam);}else R.render(scene,camera);return;}
  if(R.info&&R.info.autoReset===false&&R.info.reset)R.info.reset();
  if(!HRL.skyOK&&playing&&P)hrSky(0,true);
  hrAdoptScene();hrSkyFollow();hrMirrorTick();
  const Q=tpQ(),S=R.shadowMap;
  if(S){S.autoUpdate=false;S.needsUpdate=!!(S.enabled&&!XR.on&&(HRL.shForce||frameCount%(Q.shEvery||1)===0)&&
    ((HRL.keyI>1e-3&&DIM!=='nether')||Q.torchShadow));HRL.shForce=false;}
  if(!HRFX.post||!HRFX.sceneRT){R.toneMappingExposure=HRL.exp;R.setRenderTarget(null);R.render(scene,camera);return;}
  const X=HRFX,M=X.M,c=X.cfg;
  R.setRenderTarget(X.sceneRT);R.render(scene,camera);
  const ao=!!(M.ao&&c.aoOn),bl=!!(X.L&&c.bloom>0);
  if(ao){hrFXPass(M.ao,X.aoRT);hrFXPass(M.blur,X.aoRT2);}
  if(bl){M.down[0].uniforms.uExp.value=c.exp;for(let i=0;i<X.L;i++)hrFXPass(M.down[i],X.down[i]);
    for(let i=X.L-2;i>=0;i--)hrFXPass(M.up[i],X.up[i]);}
  const u=M.comp.uniforms;u.uExp.value=c.exp;u.uBloom.value=c.bloom;u.uAOStr.value=c.aoStr;u.uUseAO.value=ao?1:0;u.uUseBloom.value=bl?1:0;
  u.uUseHaze.value=(Q.haze&&c.hazeOn)?1:0;u.uHazeDen.value=c.hazeDen;u.uHazeStart.value=c.hazeStart;u.uHazeBase.value=c.hazeBase;
  u.uHazeFall.value=c.hazeFall;u.uHazeMax.value=c.hazeMax;u.uHazeSun.value=c.hazeSun;u.uGrain.value=Q.grain||0;u.uTime.value=HRL.t%100;
  u.uSunDir.value.set(c.sunDir[0],c.sunDir[1],c.sunDir[2]);u.uSunCol.value.setRGB(c.sunCol[0],c.sunCol[1],c.sunCol[2]);
  u.uHazeCol.value.setRGB(c.hazeCol[0],c.hazeCol[1],c.hazeCol[2]);
  hrFXPass(M.comp,X.fx?X.ldrRT:null);
  if(X.fx)hrFXPass(M.fxaa,null);}
/* resize (hook B4, after OG's renderer.setSize): DPR changes re-apply the tier's pixel-ratio cap; targets rebuild */
function hrResize(){if(!HRL.on||!renderer)return;const Q=tpQ();hrLPixelRatio(Q);
  if(HRFX.post){hrFXFree();hrFXBuild(Q);}}
/* TP.warm (contract, after enable and tier changes; C's prewarm group): compile with the right render target bound
   (r128 bakes the target's encoding into the program key), then draw one full frame to upload every texture. */
function hrWarm(root){if(!HRL.on||!renderer||!scene||!camera||!playing||!P)return;
  let added=false;if(root&&root!==scene&&!root.parent){scene.add(root);added=true;}
  try{hrAdoptScene();renderer.setRenderTarget(HRFX.post?HRFX.sceneRT:null);
    if(renderer.compile)renderer.compile(scene,camera);renderer.setRenderTarget(null);HRL.shForce=true;hrRender();}
  finally{if(added)scene.remove(root);}}
Object.assign(TPEX,{hrLamChunks,hrFXSrc:()=>({vs:HRFX_VS,ao:HRFX_AO,blur:HRFX_BLUR,pre:HRFX_PRE,down:HRFX_DOWN,up:HRFX_UP,comp:HRFX_COMP,fxaa:HRFX_FXAA,dome:HRL_DOME_FS}),hrLin});
