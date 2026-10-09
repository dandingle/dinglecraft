/* ---- PART 57 HR: m4_a_core.js ---- */
/* ===================================================================== */
/* PART 57 HR · m4_a_core.js (M4): MALGORATH IN HYPERREAL, the core.      */
/* The HR block loads after PART 54 (its names are live here) and before  */
/* hrLoadModels(). Nothing here runs in OG: every entry point starts from */
/* MGREG.hrOn() (the cast is live), the HR1-HR3 hooks (hrSky, only while  */
/* the light module is on) or a 'pack' event. No THREE constructor, clock */
/* or random at top level; nothing allocates per frame.                   */
/* Spec: MALGORATH_PLAN.md 5.4 / 8.4, bible 5.7, 5.8, 19.2, 20.          */
/* ===================================================================== */
/* Files: m4_a_core (state, art, the material set and its object-space triplanar patch), m4_b_grade (the round-aware grade:
   Ash / Ember / Blood / Eclipse / Dawn, hrMgGrade, hrMgSun), m4_c_rig (MGREG.rig.hr on M3's skeleton, the per-frame skin drive,
   the death glow, embers, the pack swap, install + prewarm), m4_d_adds (MGREG.mesh_hr: Husk, Bloater, Morsel, the eye),
   hrLoadMModels() = src/malgorath/hr/models/mg_malgorath.js (the rig.js contract: HR.MODELS.malgorath).
   Art: tools/art/malgorath/pack_mg.py -> assets/packed/mg/ -> build/mg_assets.gen.js (function hrMgAssets(): {'m:<id>|b|n|r|m': dataURI}),
   appended to hrassets.js by the build. Every map has a flat-colour (and a procedural crack-mask) fallback, so the skin builds and
   reads before or without the art. */
var HR_MG={v:1,inst:0,ok:0,A:null,tex:{},texN:0,proc:null,spare:null,warm:0,warmT:0,warmN:0,builds:0,swaps:0,frees:0,fails:0,
  rigs:[],adds:[],ph:0,stamp:-1,
  /* grade state (m4_b_grade) */
  g:null,gw:0,wOut:0,ecl:0,pre:'',dist:1e9,snapNext:true};
function hrMgFail(where,err){HR_MG.fails++;try{mgFail('hr:'+where,err);}catch(e){}}
/* the Hyperreal cast is live (the boss, his adds and the eye get Hyperreal bodies). Core text never names HRE/TP: it asks this. */
function hrMgLive(){return typeof TP!=='undefined'&&!!TP.hr&&typeof HRE!=='undefined'&&HRE.on&&HRE.installed&&!HRE.broken&&
  typeof HRL!=='undefined'&&HRL.on;}
function hrMgQ(){const q=typeof TP!=='undefined'?(TP.qr|0):1;return {q,shadow:q>=1,tess:q>=2?2:1,lod:q<=0?1:0,embers:[60,120,180,240][Math.max(0,Math.min(3,q))]};}
/* colour helpers (own copies: the grade must not depend on tB_light's private helpers) */
function hrMgRaw(h){return [(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];}
function hrMgS2L(c){return c<0.04045?c*0.0773993808:Math.pow(c*0.9478672986+0.0521327014,2.4);}
function hrMgLin(h){const c=hrMgRaw(h);return [hrMgS2L(c[0]),hrMgS2L(c[1]),hrMgS2L(c[2])];}
function hrMgCl(x,a,b){return x<a?a:(x>b?b:x);}
/* Hyperreal materials are linear (physically correct lights, no colour management in r128): authored hex colours are sRGB */
function hrMgSetLin(c,h){const v=hrMgLin(h);if(c&&c.setRGB)c.setRGB(v[0],v[1],v[2]);return c;}

/* ---- the art: embedded fal maps (pack_mg.py), decoded once, one THREE.Texture per key, shared by every instance ---- */
function hrMgAssetTable(){if(HR_MG.A)return HR_MG.A;
  try{HR_MG.A=typeof hrMgAssets==='function'?(hrMgAssets()||{}):{};}catch(err){HR_MG.A={};hrMgFail('assets',err);}
  return HR_MG.A;}
function hrMgHasArt(id){const A=hrMgAssetTable();return !!A['m:'+id+'|b'];}
/* map: 'b' basecolor (sRGB), 'n' normal, 'r' roughness, 'm' emissive crack mask (all linear except b) */
function hrMgTex(id,map){const k=id+'|'+map;if(k in HR_MG.tex)return HR_MG.tex[k];
  const u=hrMgAssetTable()['m:'+k];if(!u){HR_MG.tex[k]=null;return null;}
  const t=new THREE.Texture();t.wrapS=t.wrapT=THREE.RepeatWrapping;if(map==='b'&&THREE.sRGBEncoding!==undefined)t.encoding=THREE.sRGBEncoding;
  t.anisotropy=typeof HRE!=='undefined'&&HRE.aniso?HRE.aniso:4;t.name='mg:'+k;HR_MG.tex[k]=t;HR_MG.texN++;
  if(typeof Image!=='undefined'){const im=new Image();let done=false;
    const ok=()=>{if(done)return;done=true;if(im.naturalWidth||im.width){t.image=im;t.needsUpdate=true;}};
    t.userData={p:new Promise(res=>{im.onload=()=>{ok();res(1);};im.onerror=()=>{done=true;res(0);};})};
    im.src=u;if(im.decode)im.decode().then(ok,()=>{});}
  return t;}
function hrMgTexReady(){const ps=[];for(const k in HR_MG.tex){const t=HR_MG.tex[k];if(t&&t.userData&&t.userData.p&&!t.image)ps.push(t.userData.p);}
  return ps.length?Promise.all(ps):Promise.resolve();}

/* ---- the procedural fallback: seeded, tileable Voronoi plates + crack mask (the hide reads as plates split by glowing cracks
   before any fal map exists). Built once, on install, in a 256 px canvas pair; never at load. ---- */
function hrMgProc(){if(HR_MG.proc!==null)return HR_MG.proc;HR_MG.proc=false;
  try{if(typeof document==='undefined')return false;
    const N=256,G=8,cv=document.createElement('canvas'),cm=document.createElement('canvas');cv.width=cv.height=cm.width=cm.height=N;
    const c=cv.getContext('2d'),d=cm.getContext('2d');if(!c||!d||typeof c.getImageData!=='function')return false;
    const ia=c.getImageData(0,0,N,N),im=d.getImageData(0,0,N,N);if(!ia||!ia.data||!im||!im.data||ia.data.length<N*N*4)return false;
    let s=0x6d61;const rnd=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
    const px=[],py=[],pv=[];for(let j=0;j<G;j++)for(let i=0;i<G;i++){px.push((i+0.15+0.7*rnd())/G);py.push((j+0.15+0.7*rnd())/G);pv.push(rnd());}
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const u=(x+0.5)/N,v=(y+0.5)/N,ci=Math.floor(u*G),cj=Math.floor(v*G);let f1=9,f2=9,id=0;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ii=(ci+di+G)%G,jj=(cj+dj+G)%G,k=jj*G+ii;
        const qx=px[k]+(ci+di<0?-1:(ci+di>=G?1:0)),qy=py[k]+(cj+dj<0?-1:(cj+dj>=G?1:0)),dd=Math.hypot(u-qx,v-qy);
        if(dd<f1){f2=f1;f1=dd;id=k;}else if(dd<f2)f2=dd;}
      const e=(f2-f1)*G,crack=1-hrMgCl(e/0.09,0,1),pore=0.5+0.5*Math.sin(x*1.7+y*2.3)*Math.sin(x*0.9-y*1.3);
      const shade=hrMgCl(0.72+0.38*pv[id]-0.22*hrMgCl(f1*G*1.4,0,1)*0.6-0.55*crack+0.04*pore,0,1),o=(y*N+x)*4,g=Math.round(shade*255);
      ia.data[o]=g;ia.data[o+1]=Math.round(g*0.94);ia.data[o+2]=Math.round(g*0.9);ia.data[o+3]=255;
      const m=Math.round(Math.pow(crack,1.6)*255);im.data[o]=im.data[o+1]=im.data[o+2]=m;im.data[o+3]=255;}
    c.putImageData(ia,0,0);d.putImageData(im,0,0);
    const ta=new THREE.CanvasTexture(cv),tm=new THREE.CanvasTexture(cm);
    for(const t of [ta,tm]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;}
    if(THREE.sRGBEncoding!==undefined)ta.encoding=THREE.sRGBEncoding;
    HR_MG.proc={alb:ta,mask:tm};}
  catch(err){HR_MG.proc=false;hrMgFail('proc',err);}
  return HR_MG.proc;}

/* ---- the material set (bible 5.7). One set per rig instance (the death glow, the hurt flash and the round hue never leak into
   the spare or another instance); textures are shared. Roles are the frozen o.mats keys M3 reads (hide, flesh, horn, brow, enamel,
   eye, crust, bile) plus drool. sc = triplanar tiles per metre in object space (bible 5.7 texel density). ---- */
const HR_MG_ROLE={
  hide:  {id:'mg_hide',  col:0x2f2522,r:.74,m:0,  ns:1.5,sc:1/1.5,em:0xff5a1a,ei:1.7,rim:1,  proc:1,mask:1},
  brow:  {id:'mg_brow',  col:0x7a6c5a,r:.6, m:0,  ns:1.4,sc:1/0.6,em:0xff6a20,ei:1.3,rim:.8, proc:1,mask:1},
  flesh: {id:'mg_flesh', col:0x6e1e18,r:.24,m:0,  ns:1.1,sc:1/0.5,em:0x2a0402,ei:.5, rim:0},
  horn:  {id:'mg_horn',  col:0x2e2622,r:.42,m:.04,ns:1.3,sc:1/0.4,em:0,       ei:0,  rim:.45},
  enamel:{id:'mg_enamel',col:0xdccfb4,r:.2, m:0,  ns:.8, sc:1/0.3,em:0,       ei:0,  rim:.15},
  eye:   {id:'mg_eye',   col:0xffa830,r:.06,m:0,  ns:0,  sc:1,    em:0xff8a10,ei:1.4,rim:0,  eye:1},
  crust: {id:'mg_crust', col:0x261a14,r:.84,m:0,  ns:1.6,sc:1/0.5,em:0xff7a20,ei:2.6,rim:0,  proc:1,mask:1,gap:1},
  bile:  {id:'mg_bile',  col:0x7a8c18,r:.16,m:0,  ns:.6, sc:1/1.0,em:0x8aa010,ei:1.1,rim:0},
  drool: {id:'',         col:0x5a1610,r:.05,m:0,  ns:0,  sc:1,    em:0x1a0200,ei:.4, rim:0,  wet:1},
  /* the hands wear the hide (own instances, so a hand can flash alone); the hand eyes are the cast's eye_human (bible 5.7), UV-mapped */
  handL: {id:'mg_hide',  col:0x2f2522,r:.74,m:0,  ns:1.5,sc:1/0.6,em:0xff5a1a,ei:1.7,rim:1,  proc:1,mask:1,as:'hide'},
  handR: {id:'mg_hide',  col:0x2f2522,r:.74,m:0,  ns:1.5,sc:1/0.6,em:0xff5a1a,ei:1.7,rim:1,  proc:1,mask:1,as:'hide'},
  handEye:{id:'',        col:0xf0e8e0,r:.12,m:0,  ns:0,  sc:1,    em:0,       ei:0,  rim:0,  uv:1,cast:'eye_human'}};
const HR_MG_ROLES=['hide','brow','flesh','horn','enamel','eye','crust','bile','drool','handL','handR','handEye'];
/* the patch: object-space triplanar map / normal / roughness / emissive-mask, a fresnel rim, the death glow (uMgGrow), the crust's
   translucent gaps and the eye's normal projection. Projection uses the object-space position + normal VARYINGS only (never
   worldPosition): every mesh is static inside its joint group, so the texture rides the body and never swims. */
/* mgRest/mgRestN: the rest-pose object-space position + normal, copied once at dress time (hrMgRestify). M3's chain-swept skins
   (neck, tail, tongue, fingers, drool) rewrite their positions every frame: projecting from the rest copy keeps the texture glued
   to them too. A mesh without the copy reads the WebGL default (0,0,0) and falls back to position/normal. */
const HR_MG_VS_H='#include <common>\nvarying vec3 vMgP;\nvarying vec3 vMgN;\nattribute vec3 mgRest;\nattribute vec3 mgRestN;';
const HR_MG_VS_B='#include <begin_vertex>\n\t{bool mgOk=dot(mgRestN,mgRestN)>0.25;vMgP=mgOk?mgRest:position;vMgN=mgOk?mgRestN:normal;}';
const HR_MG_FS_H=['#include <common>','varying vec3 vMgP;','varying vec3 vMgN;','uniform mat3 normalMatrix;',
  'uniform float uMgScale;','uniform vec3 uMgRim;','uniform float uMgGrow;','uniform float uMgGap;','uniform float uMgEye;','uniform float uMgEmK;','uniform float uMgUV;','uniform float uMgEmRGB;',
  'vec3 mgW(vec3 n){vec3 w=pow(abs(n),vec3(4.0));return w/(w.x+w.y+w.z+1e-5);}',
  'vec4 mgTri(sampler2D t,vec3 p,vec3 w){return texture2D(t,p.zy)*w.x+texture2D(t,p.xz)*w.y+texture2D(t,p.xy)*w.z;}',
  'vec2 mgEyeUV(){vec3 n=vMgN;float l=dot(n,n);n=l>1e-10?n*inversesqrt(l):vec3(0.0,0.0,1.0);return n.xy*0.5+0.5;}'].join('\n');
/* uMgUV 1: the mesh's own UVs (the no-art fallback wears M3's seeded, tileable OG maps exactly as M3 lays them out);
   uMgUV 0: object-space triplanar (the fal art); uMgEye 1: projected by the object-space normal (a sphere looking down +z) */
const HR_MG_FS_START='#include <clipping_planes_fragment>\n\tvec3 mgN0=vMgN;float mgL=dot(mgN0,mgN0);vec3 mgNN=mgL>1e-10?mgN0*inversesqrt(mgL):vec3(0.0,1.0,0.0);\n\tvec3 mgw=mgW(mgNN);\n\tvec3 mgp=vMgP*uMgScale;\n\tfloat mgM=0.0;';
/* NaN guard: a degenerate vertex normal (or a zero UV derivative in three's tangent-space path) yields one NaN pixel; under the
   Hyperreal bloom a single NaN spreads into black screen-space blocks. Sanitised after the normal maps and at the very end (WebGL2). */
const HR_MG_FS_NAN='\n#if __VERSION__ >= 300\n\tif(any(isnan(normal))||dot(normal,normal)<1e-8)normal=geometryNormal;\n\tif(any(isnan(normal))||dot(normal,normal)<1e-8)normal=vec3(0.0,0.0,1.0);\n#endif';
const HR_MG_FS_END='#include <dithering_fragment>\n#if __VERSION__ >= 300\n\tif(any(isnan(gl_FragColor))||any(isinf(gl_FragColor)))gl_FragColor=vec4(0.0,0.0,0.0,1.0);\n#endif';
const HR_MG_FS_MAP=['#ifdef USE_MAP',
  '\tvec4 texelColor=uMgUV>0.5?texture2D(map,vUv):(uMgEye>0.5?texture2D(map,mgEyeUV()):mgTri(map,mgp,mgw));',
  '\ttexelColor=mapTexelToLinear(texelColor);','\tdiffuseColor*=texelColor;','#endif'].join('\n');
const HR_MG_FS_ROUGH=['float roughnessFactor=roughness;','#ifdef USE_ROUGHNESSMAP',
  '\tvec4 texelRoughness=uMgUV>0.5?texture2D(roughnessMap,vUv):(uMgEye>0.5?texture2D(roughnessMap,mgEyeUV()):mgTri(roughnessMap,mgp,mgw));',
  '\troughnessFactor*=texelRoughness.g;','#endif'].join('\n');
/* whiteout-blended triplanar normal (object space), added to the interpolated normal through the object's normalMatrix (works for
   the chain-swept skins too: the blend comes from the rest copy, the base normal from the live one). UV mode: three's own chunk. */
const HR_MG_FS_NRM=['if(uMgUV>0.5){','#include <normal_fragment_maps>','}else{','#ifdef USE_NORMALMAP',
  '\t{vec3 mgN=mgNN;',
  '\tvec3 tx=texture2D(normalMap,mgp.zy).xyz*2.0-1.0;vec3 ty=texture2D(normalMap,mgp.xz).xyz*2.0-1.0;vec3 tz=texture2D(normalMap,mgp.xy).xyz*2.0-1.0;',
  '\ttx.xy*=normalScale;ty.xy*=normalScale;tz.xy*=normalScale;',
  '\ttx=vec3(tx.xy+mgN.zy,abs(tx.z)*mgN.x);ty=vec3(ty.xy+mgN.xz,abs(ty.z)*mgN.y);tz=vec3(tz.xy+mgN.xy,abs(tz.z)*mgN.z);',
  '\tvec3 mgO=normalize(tx.zyx*mgw.x+ty.xzy*mgw.y+tz.xyz*mgw.z);',
  '\tnormal=normalize(normal+normalMatrix*(mgO-mgN));',
  '\t#ifdef DOUBLE_SIDED','\tnormal*=(float(gl_FrontFacing)*2.0-1.0);','\t#endif','\t}','#endif','}'].join('\n');
const HR_MG_FS_EM=['#ifdef USE_EMISSIVEMAP',
  '\tvec4 mgEt=uMgUV>0.5?texture2D(emissiveMap,vUv):(uMgEye>0.5?texture2D(emissiveMap,mgEyeUV()):mgTri(emissiveMap,mgp,mgw));',
  '\tmgM=uMgEmRGB>0.5?max(mgEt.r,max(mgEt.g,mgEt.b)):mgEt.r;',
  '\tmgM=max(mgM,smoothstep(1.0-uMgGrow,1.0-uMgGrow*0.6+0.02,mgM*0.6+0.4*uMgGrow));',
  '\ttotalEmissiveRadiance*=uMgEmRGB>0.5?emissiveMapTexelToLinear(mgEt).rgb*(1.0+2.0*uMgGrow):vec3(mgM);',
  '\tdiffuseColor.a*=mix(1.0,uMgGap,clamp(mgM*1.6,0.0,1.0));',
  '#endif',
  '\ttotalEmissiveRadiance*=uMgEmK;',
  '\t{float mgF=1.0-clamp(dot(normalize(normal),normalize(vViewPosition)),0.0,1.0);totalEmissiveRadiance+=uMgRim*(mgF*mgF*mgF);}'].join('\n');
function hrMgPatch(sh){const U=this.userData&&this.userData.mgU;if(U)for(const k in U)sh.uniforms[k]=U[k];
  let v=sh.vertexShader,f=sh.fragmentShader;
  v=hrRep(v,'#include <common>',HR_MG_VS_H,'mg vs common');v=hrRep(v,'#include <begin_vertex>',HR_MG_VS_B,'mg vs begin');
  f=hrRep(f,'#include <common>',HR_MG_FS_H,'mg fs common');
  f=hrRep(f,'#include <clipping_planes_fragment>',HR_MG_FS_START,'mg fs start');
  f=hrRep(f,'#include <map_fragment>',HR_MG_FS_MAP,'mg fs map');
  f=hrRep(f,'#include <roughnessmap_fragment>',HR_MG_FS_ROUGH,'mg fs rough');
  f=hrRep(f,'#include <normal_fragment_maps>',HR_MG_FS_NRM+HR_MG_FS_NAN,'mg fs normal');
  f=hrRep(f,'#include <emissivemap_fragment>',HR_MG_FS_EM,'mg fs emissive');
  if(f.indexOf('#include <dithering_fragment>')>=0)f=hrRep(f,'#include <dithering_fragment>',HR_MG_FS_END,'mg fs end');
  sh.vertexShader=v;sh.fragmentShader=f;}
function hrMgPatchKey(){const u=this.userData||{};return 'mghr7|'+(u.mgAs||u.mgRole||'')+(this.vertexColors?'|vc':'');}
/* the rest copy (see HR_MG_VS_H): once per geometry, before the first update (the rig is still at rest) */
function hrMgRestify(root){let n=0;root.traverse(o=>{const g=o.geometry,a=g&&g.attributes;if(!a||!a.position||a.mgRest||!a.position.array)return;
    if(a.rest&&a.restN){g.setAttribute('mgRest',a.rest);g.setAttribute('mgRestN',a.restN);n++;return;}   /* M3's own rest pose (deforming skins) */
    if(!a.normal||!a.normal.array)return;
    g.setAttribute('mgRest',new THREE.Float32BufferAttribute(new Float32Array(a.position.array),3));
    g.setAttribute('mgRestN',new THREE.Float32BufferAttribute(new Float32Array(a.normal.array),3));n++;});
  return n;}
/* the no-art fallback: M3's seeded, tileable OG maps (bible 5.6), worn on the mesh's own UVs and lit by Hyperreal. Data maps (normal,
   roughness, crack mask) are M3's own texture objects; albedo maps get an sRGB twin on the same canvas (Hyperreal decodes albedo
   from sRGB; OG must keep reading M3's original), refreshed whenever M3's slicer updates the original (hrMgM3Sync, per tick). */
function hrMgSrgb(t){if(!t)return null;let r=HR_MG.m3s&&HR_MG.m3s.find(q=>q[0]===t);if(r)return r[1];
  const c=t.image;if(!c)return null;const m=new THREE.CanvasTexture(c);m.wrapS=m.wrapT=THREE.RepeatWrapping;if(THREE.sRGBEncoding!==undefined)m.encoding=THREE.sRGBEncoding;
  m.anisotropy=8;(HR_MG.m3s||(HR_MG.m3s=[])).push([t,m,t.version|0]);return m;}
function hrMgM3Sync(){const L=HR_MG.m3s;if(!L)return;for(const q of L){const v=q[0].version|0;if(v!==q[2]){q[2]=v;q[1].needsUpdate=true;}}}
function hrMgM3(role){let T=null;try{T=typeof mg3TexInit==='function'?mg3TexInit():null;}catch(err){T=null;}const L=T&&T.list;if(!L||!L.hide||!L.hide.t)return null;
  const R=HR_MG_ROLE[role]||{},as=R.as||role;
  /* the hide maps are tileable (a wrapping 24-cell Voronoi): worn TRIPLANAR at a 16 m creature's scale (plates ~27 cm on the body,
     ~15 cm on the hands and skull) instead of on the UVs, where the plates shrink to a few centimetres and read as a glowing net */
  const hs=role==='hide'?1/6.5:1/3.6;
  /* no roughness map here: M3's makes the plate domes shiny (0.55), which under Hyperreal's physical sun turns charred hide into
     tan glossy tiles; the hide stays matte leather (0.92) with a gentler normal */
  if(as==='hide')return {b:hrMgSrgb(L.hide.t),n:L.hideN&&L.hideN.t,m:L.hideE&&L.hideE.t,rough:0.92,ns:1.0,col:0x6e5a56,tri:hs,ek:0.45};   /* charcoal-oxblood */
  if(as==='brow')return {b:hrMgSrgb(L.hide.t),n:L.hideN&&L.hideN.t,m:L.hideE&&L.hideE.t,rough:0.85,ns:1.0,col:0xe8dcc8,tri:hs,ek:0.4};    /* bone-pale skull plates */
  if(as==='horn')return L.horn?{b:hrMgSrgb(L.horn.t),col:0xd8c8a8,rough:0.5}:null;
  if(as==='flesh')return L.flesh?{b:hrMgSrgb(L.flesh.t),rough:0.28}:null;
  if(as==='crust')return L.crust?{b:hrMgSrgb(L.crust.t),n:L.crustN&&L.crustN.t,m:L.crust.t,rough:0.75,col:0x6a5a50,ek:0.3}:null;
  if(as==='eye'){let e=null;try{e=typeof mg3EyeTex==='function'?mg3EyeTex('amber'):null;}catch(err){e=null;}return e?{m:e,col:0x1a0c04,rough:0.12}:null;}
  return null;}
/* one material for a role. art: the fal maps when packed, else the procedural plates (hide/brow/crust), else flat colour */
function hrMgMat(role){const R=HR_MG_ROLE[role]||HR_MG_ROLE.hide;
  if(R.uv){const m=hrTag(new THREE.MeshStandardMaterial({color:R.col,roughness:R.r,metalness:R.m}));hrMgSetLin(m.color,R.col);m.name='mg_'+role;m.userData.mgRole=role;
    const u=R.cast&&typeof hrEntTexURL==='function'?hrEntTexURL(R.cast,'_basecolor.png'):'';if(u&&typeof hrEntLoadTex==='function'){m.map=hrEntLoadTex(u,true);m.color.setRGB(1,1,1);}
    m.emissive=new THREE.Color(0,0,0);m.emissiveIntensity=0;return m;}
  const art=R.id&&hrMgHasArt(R.id),m3=art?null:hrMgM3(role),pr=!art&&!m3&&R.proc?hrMgProc():null;
  const m=hrTag(new THREE.MeshStandardMaterial({color:R.col,roughness:R.r,metalness:R.m,transparent:!!(R.gap||R.wet),opacity:R.wet?0.86:1,
    side:R.wet?THREE.DoubleSide:THREE.FrontSide}));hrMgSetLin(m.color,R.col);
  m.name='mg_'+role;let uv=0;
  if(art){m.map=hrMgTex(R.id,'b');m.color.setRGB(1,1,1);const n=hrMgTex(R.id,'n'),r=hrMgTex(R.id,'r'),k=hrMgTex(R.id,'m');
    if(n&&R.ns){m.normalMap=n;m.normalScale=new THREE.Vector2(R.ns,R.ns);}if(r)m.roughnessMap=r;if(k&&R.mask)m.emissiveMap=k;
    /* MZ: the eye glows in its own colours (uMgEmRGB): with the fal art its emissive map is the coloured iris itself (the black surround
       stays dark); the grey luminance mask made all six eyes glow white like pressure gauges in QA */
    else if(R.eye)m.emissiveMap=m.map;}
  else if(m3){uv=m3.tri?0:1;if(m3.b){m.map=m3.b;hrMgSetLin(m.color,m3.col!=null?m3.col:0xffffff);}if(m3.n){const ns=m3.ns||1.4;m.normalMap=m3.n;m.normalScale=new THREE.Vector2(ns,ns);}
    if(m3.r)m.roughnessMap=m3.r;if(m3.m)m.emissiveMap=m3.m;if(m3.rough!=null)m.roughness=m3.rough;}
  else if(pr){m.map=pr.alb;m.emissiveMap=pr.mask;}
  if(R.em){m.emissive=hrMgSetLin(new THREE.Color(R.em),R.em);m.emissiveIntensity=R.ei;}else{m.emissive=new THREE.Color(0,0,0);m.emissiveIntensity=0;}
  if(R.gap)m.depthWrite=true;
  m.userData.mgRole=role;if(R.as)m.userData.mgAs=R.as;
  m.userData.mgEk=m3&&m3.ek?m3.ek:1;                       /* the emissive gain of this map set (M3's crack mask is denser than the fal one) */
  m.userData.mgU={uMgScale:{value:m3&&m3.tri?m3.tri:R.sc},uMgRim:{value:new THREE.Color(0,0,0)},uMgGrow:{value:0},uMgGap:{value:R.gap?0.35:1},uMgEye:{value:R.eye&&!uv?1:0},uMgEmK:{value:1},uMgUV:{value:uv},uMgEmRGB:{value:R.eye?1:0}};   /* the eyes glow in their own colours (an iris, not a mask) */
  m.userData.mgSrc=art?'art':(m3?'m3':(pr?'proc':'flat'));
  m.onBeforeCompile=hrMgPatch;m.customProgramCacheKey=hrMgPatchKey;
  return m;}
/* the per-instance set: {set:{role:material}, list, U (per-role uniforms), base (per-role emissive intensity)} */
function hrMgMats(){const set={},list=[];for(const r of HR_MG_ROLES){const m=hrMgMat(r);set[r]=m;list.push(m);}
  return {set,list,disposed:false};}
function hrMgMatsFree(M){if(!M||M.disposed)return;M.disposed=true;for(const m of M.list)if(m&&m.dispose)m.dispose();}   /* textures are shared */
