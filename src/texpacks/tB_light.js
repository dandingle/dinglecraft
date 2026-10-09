/* ---- PART 54: tB_light.js ---- */
/* ===================================================================== */
/* PART 54 · tB_light.js: Package B, Hyperreal light (module 'light')    */
/* ===================================================================== */
/* INTEGRATION_PLAN.md section 5 (B1-B5, B8, B9): physically correct lights on the approved preview numbers, a texel-
   snapped sun/moon shadow that follows the player, hemisphere + ambient floor, a pooled torch/lava/glowstone point-light
   set with flicker, a mirror for foreign point lights (Malgorath's core), an HDR sky dome with a sun disc, the day/night
   palette with eased exposure, and the Nether / Aether / underwater / in-lava / fullbright / X-ray / Malgorath-arena
   presets. The post chain, legacy-material adoption and the shadow rules live in tB_post.js.
   OG safety: every core hook (hooks_B.py) is guarded by TP.hr&&HRL.on, so OG, and Hyperreal sessions without this module
   (opt.only), run the original code. Nothing here allocates a THREE object or reads a clock or Math.random at top level;
   the per-frame paths allocate nothing. Light counts, light castShadow and renderer program flags change only in
   enable / disable / setQuality (each recompiles every lit program in r128). */
tpTierFields({pr:[1,1.25,1.5,2],post:[0,1,1,1],shadow:[0,1024,2048,4096],ext:[0,40,64,80],shEvery:[0,2,1,1],
  torches:[4,6,8,12],torchShadow:[0,0,0,1],bloom:[0,3,5,5],ssao:[0,0,8,16],haze:[0,1,1,1],fxaa:[0,1,1,1],grain:[0,0,.012,.012]});
/* ---- colour helpers (pure maths: light colours are raw hex, sky and fog colours are sRGB -> linear) ---- */
function hrLs2l(c){return c<0.04045?c*0.0773993808:Math.pow(c*0.9478672986+0.0521327014,2.4);}   /* == THREE.Color.convertSRGBToLinear */
function hrLraw(h){return [(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];}
function hrLlin(h){const c=hrLraw(h);return [hrLs2l(c[0]),hrLs2l(c[1]),hrLs2l(c[2])];}
function hrLmix(o,a,b,t){o[0]=a[0]+(b[0]-a[0])*t;o[1]=a[1]+(b[1]-a[1])*t;o[2]=a[2]+(b[2]-a[2])*t;return o;}
function hrLcp(o,a){o[0]=a[0];o[1]=a[1];o[2]=a[2];return o;}
function hrLsm(a,b,x){const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);}   /* GLSL smoothstep (works with a>b) */
function hrLcl(x,a,b){return x<a?a:(x>b?b:x);}
/* the day/night palette (plan B5), keyed on e = sin(2*pi*tod): 1 noon, -1 midnight. Rows run from high sun to deep night.
   [e, sun colour (raw), sun cd, hemi sky (raw), hemi ground (raw), hemi I, zenith (lin), horizon = fog (lin), exposure] */
const HRL_PAL=[
  [ .55,hrLraw(0xfff1dc),4.6,hrLraw(0x9cc4ff),hrLraw(0x6b5a45),1.00,hrLlin(0x3d6fa8),hrLlin(0xa9bccb),1.00],
  [ .18,hrLraw(0xffc98a),4.5,hrLraw(0x9cc4ff),hrLraw(0x5a4630),0.85,hrLlin(0x3d6fa8),hrLlin(0xf2c48d),1.05],   /* the approved preview rig */
  [ .02,hrLraw(0xff8a4a),1.7,hrLraw(0x6f7fae),hrLraw(0x3a2e24),0.55,hrLlin(0x2c3f6e),hrLlin(0xf4a35c),1.15],
  [-.08,hrLraw(0xff8a4a),1.0,hrLraw(0x34406e),hrLraw(0x1a1612),0.30,hrLlin(0x141d3a),hrLlin(0x3d3352),1.30],   /* sun weight is 0 here */
  [-.25,hrLraw(0xff8a4a),0.0,hrLraw(0x1a2440),hrLraw(0x0b0a0a),0.15,hrLlin(0x03050c),hrLlin(0x0a0f1f),1.45]];
const HRL_MOON=hrLraw(0x9fb4ff),HRL_MOONI=0.5;
const HRL_K={white:[1,1,1],amb:[.85,.9,1],
  nSky:hrLraw(0x4a140c),nGnd:hrLraw(0xff5a1e),nAmb:[1,.7,.6],nFog:hrLlin(0x3a0e08),
  aKey:hrLraw(0xfff6e8),aSky:hrLraw(0xcfe8ff),aGnd:hrLraw(0xf0f4ff),aZen:hrLlin(0x5a9fe8),aHor:hrLlin(0x99c7f5),   /* Aether sky: see hrSky */
  mKey:hrLraw(0xff8a5a),mSky:hrLraw(0x3a2420),mGnd:hrLraw(0xff5a22),mFog:hrLlin(0x24140f),
  fbGnd:hrLraw(0xd8d8d8),wFog:hrLlin(0x0b3b4f),lFog:hrLlin(0xff6a1a)};
/* torch / lava / glowstone point lights: base cd, colour, range, flicker (sine, noise) amplitudes */
const HRL_SRC=[{base:26,col:0xff9a45,dist:14,a:.3,b:.2},{base:18,col:0xff6a1a,dist:12,a:.12,b:.1},{base:20,col:0xffd27a,dist:12,a:0,b:.05},
  /* v6.1 purgatory (P7): 3 Burner coil / lit Hot Plate, 4 Tesla Coil (cold, crackling), 5 booth lamp (MP_LIGHTS) */
  {base:15,col:0xff7a2e,dist:10,a:.06,b:.08},{base:20,col:0xa8b8ff,dist:12,a:.15,b:.9},{base:18,col:0xffd36a,dist:12,a:0,b:.03}];
/* ---- v6.1 Puppet Purgatory: the 'theatre' preset (bible 16.1; P7). Sub-presets follow P1's cues (mwCue) and P4's fights
   (hnState().light). Key/hemi/ambient colours raw, fog and haze sRGB -> linear; fogN/fogF are fractions of RD*CH; dir is the
   key direction (toward the light; null = the paper moon over the Frog's clearing). Light count never changes: intensities only. */
const HRL_MUP={
  show:    {key:hrLraw(0xffd8b0),keyI:4.6,dir:[.18,1,.32],sky:hrLraw(0xffc890),gnd:hrLraw(0x6a1f4e),hemiI:.75,amb:hrLraw(0xffe2b0),ambI:.05,
            fog:hrLlin(0x2a1626),haze:hrLlin(0x3a2030),exp:1.4,fogN:.35,fogF:.9,bloom:1.35,hazeDen:.007,hazeMax:.55,ao:1,follow:0},
  blackout:{key:hrLraw(0x7f9cff),keyI:.32,dir:[1,.55,.25],sky:hrLraw(0x18223c),gnd:hrLraw(0x050409),hemiI:.07,amb:hrLraw(0x8090ff),ambI:.015,
            fog:hrLlin(0x07060a),haze:hrLlin(0x0a0c16),exp:1.55,fogN:.25,fogF:.7,bloom:1.7,hazeDen:.006,hazeMax:.4,ao:1,follow:1},
  bomber:   {key:hrLraw(0xffa24e),keyI:3.6,dir:[-.2,1,.4],sky:hrLraw(0x9a5422),gnd:hrLraw(0x2a1308),hemiI:.65,amb:hrLraw(0xffc890),ambI:.05,
            fog:hrLlin(0x3a2412),haze:hrLlin(0x5a3a1c),exp:1.4,fogN:.25,fogF:.75,bloom:1.45,hazeDen:.016,hazeMax:.65,ao:1,follow:0},
  bigpig:   {key:hrLraw(0xffb3d4),keyI:4,dir:[0,.8,-.6],sky:hrLraw(0xff8cc4),gnd:hrLraw(0x40102c),hemiI:.8,amb:hrLraw(0xffd0e8),ambI:.06,
            fog:hrLlin(0x3a1430),haze:hrLlin(0x5a2048),exp:1.35,fogN:.35,fogF:.9,bloom:1.7,hazeDen:.007,hazeMax:.45,ao:1,follow:0},
  bigfrog:  {key:hrLraw(0xb4c8ff),keyI:2.4,dir:null,sky:hrLraw(0x1e3a2c),gnd:hrLraw(0x081208),hemiI:.4,amb:hrLraw(0x90ffb0),ambI:.03,
            fog:hrLlin(0x101a2a),haze:hrLlin(0x1a3a22),exp:1.6,fogN:.3,fogF:.85,bloom:1.3,hazeDen:.014,hazeMax:.6,ao:1,follow:0},
  work:    {key:hrLraw(0xf2f6ff),keyI:1.4,dir:[0,1,.05],sky:hrLraw(0xeef2f4),gnd:hrLraw(0xb4b4aa),hemiI:1.7,amb:hrLraw(0xffffff),ambI:.22,
            fog:hrLlin(0xd8d8d0),haze:hrLlin(0xd8d8d0),exp:1,fogN:.6,fogF:1.25,bloom:.35,hazeDen:.002,hazeMax:.15,ao:.6,follow:0}};
const HRL_MUP_MOON=[0,74,215],HRL_MUP_FS=110,HRL_MUP_F=['keyI','hemiI','ambI','exp','fogN','fogF','bloom','hazeDen','hazeMax','ao','follow'];               /* the Frog's paper moon; the followspot's cd (on the mirror light) */
var HRL_MS={k:'',force:null,snap:true,key:[1,1,1],sky:[1,1,1],gnd:[0,0,0],amb:[1,1,1],fog:[0,0,0],haze:[0,0,0],dir:[0,1,0],tdir:[0,1,0],
  keyI:0,hemiI:0,ambI:0,exp:1,fogN:.35,fogF:.9,bloom:1,hazeDen:.009,hazeMax:.5,ao:1,follow:0,dimN:0,ft:null};   /* ft: test seam (followspot target) */
function hrPalE(e,o){o=o||HRL.pal;const R=HRL_PAL,n=R.length;let i=0,t=0;
  if(e>=R[0][0]){i=0;t=0;}else if(e<=R[n-1][0]){i=n-2;t=1;}else{while(e<R[i+1][0])i++;t=(R[i][0]-e)/(R[i][0]-R[i+1][0]);}
  const a=R[i],b=R[i+1];
  hrLmix(o.sun,a[1],b[1],t);o.sunI=a[2]+(b[2]-a[2])*t;hrLmix(o.sky,a[3],b[3],t);hrLmix(o.gnd,a[4],b[4],t);o.hemiI=a[5]+(b[5]-a[5])*t;
  hrLmix(o.zen,a[6],b[6],t);hrLmix(o.hor,a[7],b[7],t);o.exp=a[8]+(b[8]-a[8])*t;
  o.e=e;o.sunW=hrLsm(-.04,.10,e);o.moonW=hrLsm(-.02,-.16,e);
  o.keyI=o.sunW*o.sunI+o.moonW*HRL_MOONI;              /* about 0 where the key swaps from sun to moon (e = -.03) */
  hrLcp(o.key,e>-.03?o.sun:HRL_MOON);return o;}
function hrPalNew(){return {e:0,sun:[0,0,0],sunI:0,sky:[0,0,0],gnd:[0,0,0],hemiI:0,zen:[0,0,0],hor:[0,0,0],exp:1,sunW:0,moonW:0,keyI:0,key:[0,0,0]};}
/* the CPU copy of ACES (three's ACESFilmicToneMapping, /0.6 included) + sRGB: fog colour on the Low path, where r128
   applies fog after tone mapping and encoding. c: {r,g,b} linear, x: exposure, o: THREE.Color (setRGB) */
function hrToneJS(c,x,o){let r=c.r*x/.6,g=c.g*x/.6,b=c.b*x/.6;const f=v=>(v*(v+.0245786)-.000090537)/(v*(.983729*v+.432951)+.238081);
  const R=f(.59719*r+.35458*g+.04823*b),G=f(.076*r+.90834*g+.01566*b),B_=f(.0284*r+.13383*g+.83777*b);
  const s=v=>(v=Math.min(1,Math.max(0,v)),v<=.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055);
  return o.setRGB(s(1.60475*R-.53108*G-.07367*B_),s(-.10208*R+1.10813*G-.00605*B_),s(-.00327*R-.07276*G+1.07602*B_));}
/* texel snapping of the shadow centre (pure: testable without THREE). The shadow camera looks along -dir with up +Y, so its
   axes are X = normalize(UP x dir), Y = dir x X; snapping C.X and C.Y to whole texels keeps the shadow grid fixed in the world. */
function hrSnapC(cx,cy,cz,dx,dy,dz,S,size,out){let Xx=dz,Xz=-dx,l=Math.sqrt(Xx*Xx+Xz*Xz);if(l<1e-6){Xx=1;Xz=0;l=1;}Xx/=l;Xz/=l;
  const Yx=dy*Xz,Yy=dz*Xx-dx*Xz,Yz=-dy*Xx,tx=2*S/size,u=cx*Xx+cz*Xz,v=cx*Yx+cy*Yy+cz*Yz;
  const du=Math.round(u/tx)*tx-u,dv=Math.round(v/tx)*tx-v;
  out[0]=cx+Xx*du+Yx*dv;out[1]=cy+Yy*dv;out[2]=cz+Xz*du+Yz*dv;return out;}
function hrLdir(o,c,s){const l=Math.sqrt(c*c+s*s+.0784);o[0]=c/l;o[1]=s/l;o[2]=.28/l;return o;}
function hrNoise(x,i){const k=Math.floor(x),f=x-k,h=n=>{const s=Math.sin(n*127.1+i*311.7)*43758.5453;return s-Math.floor(s);};
  return (h(k)+(h(k+1)-h(k))*f*f*(3-2*f))*2-1;}
/* module state. Vectors, colours and lights are created in enable(), never here. */
var HRL={on:false,q:1,t:0,exp:1,keyI:0,e:0,dim:'',ug:0,wA:0,skyOK:false,shForce:false,addedTarget:false,floatNote:false,
  keyDir:[0,1,0],sunDir:[0,1,0],moonDir:[0,-1,0],aetherDir:[0,0,0],C:[0,0,0],pal:hrPalNew(),
  K:[1,1,1],HS:[1,1,1],HG:[0,0,0],AM:[1,1,1],F:[0,0,0],Z:[0,0,0],H:[0,0,0],GD:[0,0,0],SC:[0,0,0],tc:{r:0,g:0,b:0},
  snap:null,hemi:null,pool:[],slots:[],mirror:null,mirrorI:0,foreign:null,ogL:null,dome:null,domeU:null,v3:null,v3b:null,
  em:new Map(),cand:[],gathered:false};
hrLdir(HRL.aetherDir,.5,.95);                              /* the Aether keeps a fixed high sun (OG's Aether sky is static) */
/* ---- the sky dome (fog:false, renderOrder -10, follows the camera; ends with three's tone mapping + encoding so the Low
   path gets ACES + sRGB from the renderer and the post path stays linear) ---- */
const HRL_DOME_VS='varying vec3 vDir;\nvoid main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const HRL_DOME_FS=['uniform vec3 uZen,uHor,uGnd,uSunDir,uSunCol;uniform float uSunSize,uFlat;varying vec3 vDir;',
  'void main(){vec3 d=normalize(vDir);float y=d.y;',
  ' vec3 col=y>=0.?mix(uHor,uZen,pow(max(y,0.),.55)):mix(uHor,uGnd,clamp(-y*4.,0.,1.));',
  ' col=mix(col,uHor,uFlat);float mu=max(dot(d,uSunDir),0.);',
  ' col+=uSunCol*(pow(mu,12.)*.25+pow(mu,400.)*1.5+smoothstep(uSunSize,uSunSize+.0015,mu)*20.);',
  ' gl_FragColor=vec4(col,1.);',
  ' #include <tonemapping_fragment>',
  ' #include <encodings_fragment>',
  '}'].join('\n');
/* ---- snapshot / restore of every OG object this module touches ---- */
const hrLv=v=>[v.x,v.y,v.z],hrLc=c=>[c.r,c.g,c.b];
function hrLSnap(){const S={},sh=sunL.shadow||null;
  S.sun={cs:sunL.castShadow,i:sunL.intensity,c:hrLc(sunL.color),p:hrLv(sunL.position),
    sh:sh?{w:sh.mapSize.width,h:sh.mapSize.height,b:sh.bias,nb:sh.normalBias,
      cam:sh.camera?[sh.camera.left,sh.camera.right,sh.camera.top,sh.camera.bottom,sh.camera.near,sh.camera.far]:null}:null,
    tp:sunL.target?hrLv(sunL.target.position):null};
  S.amb={i:ambL.intensity,c:ambL.color?hrLc(ambL.color):null};
  S.tl=TLIGHTS.map(l=>({v:l.visible,i:l.intensity,p:hrLv(l.position)}));
  S.spr={sv:sunSpr?sunSpr.visible:null,mv:moonSpr?moonSpr.visible:null,mp:moonSpr?hrLv(moonSpr.position):null};
  S.stars=stars?{c:hrLc(stars.material.color),o:stars.material.opacity,p:hrLv(stars.position)}:null;
  const cm=cloudG&&cloudG.children[0]&&cloudG.children[0].material;
  S.cloud=cm?{m:cm,c:hrLc(cm.color)}:null;S.cloudV=cloudG?cloudG.visible:null;
  S.fog=scene.fog?{c:hrLc(scene.fog.color),n:scene.fog.near,f:scene.fog.far}:null;
  S.bg=(scene.background&&scene.background.r!==undefined)?hrLc(scene.background):null;
  S.info=renderer.info?renderer.info.autoReset:undefined;
  return S;}
function hrLRestore(S){const sv=(v,a)=>v.set(a[0],a[1],a[2]),sc=(c,a)=>c.setRGB(a[0],a[1],a[2]);
  sunL.castShadow=S.sun.cs;sunL.intensity=S.sun.i;sc(sunL.color,S.sun.c);sv(sunL.position,S.sun.p);
  const sh=sunL.shadow;
  if(sh&&S.sun.sh){sh.mapSize.width=S.sun.sh.w;sh.mapSize.height=S.sun.sh.h;sh.bias=S.sun.sh.b;sh.normalBias=S.sun.sh.nb;
    const c=sh.camera,a=S.sun.sh.cam;if(c&&a){c.left=a[0];c.right=a[1];c.top=a[2];c.bottom=a[3];c.near=a[4];c.far=a[5];
      if(c.updateProjectionMatrix)c.updateProjectionMatrix();}}
  if(sunL.target&&S.sun.tp){sv(sunL.target.position,S.sun.tp);if(sunL.target.updateMatrixWorld)sunL.target.updateMatrixWorld();}
  ambL.intensity=S.amb.i;if(ambL.color&&S.amb.c)sc(ambL.color,S.amb.c);
  TLIGHTS.forEach((l,i)=>{const t=S.tl[i];if(!t)return;l.visible=t.v;l.intensity=t.i;sv(l.position,t.p);});
  if(sunSpr&&S.spr.sv!==null)sunSpr.visible=S.spr.sv;
  if(moonSpr&&S.spr.mv!==null){moonSpr.visible=S.spr.mv;sv(moonSpr.position,S.spr.mp);}
  if(stars&&S.stars){sc(stars.material.color,S.stars.c);stars.material.opacity=S.stars.o;sv(stars.position,S.stars.p);}
  if(S.cloud)sc(S.cloud.m.color,S.cloud.c);if(cloudG&&S.cloudV!==null)cloudG.visible=S.cloudV;
  if(scene.fog&&S.fog){sc(scene.fog.color,S.fog.c);scene.fog.near=S.fog.n;scene.fog.far=S.fog.f;}
  if(S.bg&&scene.background&&scene.background.setRGB)sc(scene.background,S.bg);
  if(renderer.info&&S.info!==undefined)renderer.info.autoReset=S.info;}
/* ---- point-light pool ---- */
function hrLPoolFree(){for(const l of HRL.pool){if(l.parent)l.parent.remove(l);if(l.shadow&&l.shadow.map){l.shadow.map.dispose();l.shadow.map=null;}if(l.dispose)l.dispose();}
  HRL.pool.length=0;HRL.slots.length=0;HRL.gathered=false;}
function hrLPoolBuild(n,shadow){hrLPoolFree();
  for(let i=0;i<n;i++){const l=hrTag(new THREE.PointLight(0xff9a45,0,14,2));l.name='hrPool'+i;
    if(i===0&&shadow&&l.shadow){l.castShadow=true;l.shadow.mapSize.width=l.shadow.mapSize.height=512;l.shadow.bias=-0.004;
      if(l.shadow.camera){l.shadow.camera.near=0.1;l.shadow.camera.far=14;}}
    scene.add(l);HRL.pool.push(l);HRL.slots.push(null);}}
function hrLPixelRatio(Q){const R=renderer,pr=Math.min(Q.pr||1,window.devicePixelRatio||1);
  if(R.setPixelRatio&&(!R.getPixelRatio||R.getPixelRatio()!==pr)){R.setPixelRatio(pr);R.setSize(window.innerWidth,window.innerHeight);}}
function hrNeedsUpdate(o){const m=o.material;if(!m)return;if(Array.isArray(m)){for(const x of m)if(x)x.needsUpdate=true;}else m.needsUpdate=true;}
/* ---- lifecycle ---- */
function hrLSupported(){return tpCaps().webgl2;}
function hrLEnable(q){
  if(!renderer||!scene||!sunL||!ambL)throw new Error('light: the game has not booted');
  const Q=HRQ[q],R=renderer;HRL.q=q;HRL.on=true;
  HRL.snap=hrLSnap();HRL.ogL=new Set(TLIGHTS);HRL.foreign=new Set();HRL.v3=new THREE.Vector3();HRL.v3b=new THREE.Vector3();
  HRL.em.clear();HRL.cand.length=0;HRL.mirrorI=0;HRL.skyOK=false;HRL.shForce=true;HRL.dim='';
  /* renderer: linear HDR lighting, sRGB out; ACES by the renderer on Low, by the composite pass on Medium and up */
  HRFX.floatOK=tpCaps().floatRT&&typeof THREE.DepthTexture==='function'&&THREE.HalfFloatType!==undefined;
  HRFX.post=!!(Q.post&&HRFX.floatOK);
  if(Q.post&&!HRFX.floatOK&&!HRL.floatNote){HRL.floatNote=true;tpNote('Hyperreal: no float render targets here, using the Low look');}
  R.physicallyCorrectLights=true;R.outputEncoding=THREE.sRGBEncoding;
  R.toneMapping=HRFX.post?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;R.toneMappingExposure=1;
  if(R.info&&R.info.autoReset!==undefined)R.info.autoReset=false;        /* hrRender resets once per frame: info covers every pass */
  hrLPixelRatio(Q);
  /* lights: hemisphere, the pool, the mirror; OG's torch pool is hidden (the light count only changes here) */
  HRL.hemi=hrTag(new THREE.HemisphereLight(0x9cc4ff,0x5a4630,0.85));HRL.hemi.name='hrHemi';scene.add(HRL.hemi);
  hrLPoolBuild(Q.torches|0,Q.torchShadow);
  HRL.mirror=hrTag(new THREE.PointLight(0xff5a22,0,24,2));HRL.mirror.name='hrMirror';scene.add(HRL.mirror);
  for(const l of TLIGHTS)l.visible=false;
  if(sunL.target&&!sunL.target.parent){scene.add(sunL.target);HRL.addedTarget=true;}
  /* the sky dome replaces the sun sprite; the moon sprite stays (moved to the moon direction) */
  const U={uZen:{value:new THREE.Color(0,0,0)},uHor:{value:new THREE.Color(0,0,0)},uGnd:{value:new THREE.Color(0,0,0)},
    uSunDir:{value:new THREE.Vector3(0,1,0)},uSunCol:{value:new THREE.Color(0,0,0)},uSunSize:{value:.9983},uFlat:{value:0}};
  const dm=hrTag(new THREE.ShaderMaterial({uniforms:U,vertexShader:HRL_DOME_VS,fragmentShader:HRL_DOME_FS,side:THREE.BackSide,depthWrite:false,fog:false}));
  dm.customProgramCacheKey=()=>'hrdome1';
  const dome=hrTag(new THREE.Mesh(new THREE.SphereGeometry(900,32,16),dm));
  dome.name='hrDome';dome.renderOrder=-10;dome.frustumCulled=false;dome.castShadow=false;dome.receiveShadow=false;
  scene.add(dome);HRL.dome=dome;HRL.domeU=U;
  if(sunSpr)sunSpr.visible=false;
  if(stars&&stars.material.color.setScalar)stars.material.color.setScalar(1.6);   /* so they survive ACES */
  hrFXEnable(Q);
  TP.shadow=Q.shadow>0;hrApplyShadows();
  TP.warm=hrWarm;
  if(playing&&P&&camera)hrSky(0,true);
  scene.traverse(hrNeedsUpdate);}
function hrLDisable(){                                     /* tolerates a partial enable() */
  HRL.on=false;
  try{hrAdoptRestore();}catch(e){console.warn('[TP] light: adopt restore',e);}
  if(HRL.foreign){for(const l of HRL.foreign)l.visible=true;HRL.foreign=null;}
  if(HRL.hemi){scene.remove(HRL.hemi);if(HRL.hemi.dispose)HRL.hemi.dispose();HRL.hemi=null;}
  hrLPoolFree();
  if(HRL.mirror){scene.remove(HRL.mirror);if(HRL.mirror.dispose)HRL.mirror.dispose();HRL.mirror=null;}
  if(HRL.dome){scene.remove(HRL.dome);HRL.dome.geometry.dispose();HRL.dome.material.dispose();HRL.dome=null;HRL.domeU=null;}
  try{hrFXDisable();}catch(e){console.warn('[TP] light: post teardown',e);}
  if(sunL&&sunL.shadow&&sunL.shadow.map){sunL.shadow.map.dispose();sunL.shadow.map=null;}
  if(HRL.addedTarget&&sunL&&sunL.target&&sunL.target.parent)sunL.target.parent.remove(sunL.target);HRL.addedTarget=false;
  if(HRL.snap){hrLRestore(HRL.snap);HRL.snap=null;}
  HRL.em.clear();HRL.cand.length=0;HRL.ogL=null;HRL.skyOK=false;HRL.t=HRL.t%1000;}
function hrLQuality(q,prev){const Q=HRQ[q],Q0=HRQ[prev]||Q,R=renderer;HRL.q=q;
  hrLPixelRatio(Q);
  const post=!!(Q.post&&HRFX.floatOK);
  if(post!==HRFX.post){HRFX.post=post;R.toneMapping=post?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;scene.traverse(hrNeedsUpdate);}
  hrFXFree();if(HRFX.post)hrFXBuild(Q);
  if(Q.shadow!==Q0.shadow&&sunL.shadow&&sunL.shadow.map){sunL.shadow.map.dispose();sunL.shadow.map=null;}
  const ps=!!(HRL.pool[0]&&HRL.pool[0].castShadow);
  if((Q.torches|0)!==HRL.pool.length||!!Q.torchShadow!==ps)hrLPoolBuild(Q.torches|0,Q.torchShadow);   /* an allowed recompile */
  TP.shadow=Q.shadow>0;hrApplyShadows();
  if(playing&&P&&camera)hrSky(0,true);}
tpRegister({name:'light',order:20,required:true,supported:hrLSupported,why:()=>'needs WebGL2',
  async prepare(){},enable:hrLEnable,disable:hrLDisable,setQuality:hrLQuality});
/* ---- per frame: palette + presets (hook B1, the updateSky slot: B is the single writer of fog, background, ambL, sunL) ---- */
function hrSky(dt,snap){
  if(!HRL.on||!P||!camera||!scene||!scene.fog)return false;
  dt=dt||0;HRL.t+=dt;HRL.skyOK=true;
  const Q=tpQ();
  let dimNew=false;
  if(HRL.dim!==DIM){HRL.dim=DIM;HRL.em.clear();for(let i=0;i<HRL.slots.length;i++)HRL.slots[i]=null;HRL.gathered=false;dimNew=true;HRL_MS.snap=true;}
  const over=DIM==='over',neth=DIM==='nether',aeth=DIM==='aether',theatre=DIM==='puppet';
  if(over){const ci=colInfo(Math.floor(P.x),Math.floor(P.z));const under=(P.y+1.4)<(ci.h-1.5)?1:0;ugT=lerp(ugT,under,1-Math.exp(-dt*2.5));}
  const ug=over&&!fullbright?ugT:0;HRL.ug=ug;
  const th=timeOfDay*Math.PI*2,c=Math.cos(th),s=Math.sin(th);
  hrLdir(HRL.sunDir,c,s);hrLdir(HRL.moonDir,-c,-s);
  const p=hrPalE(s),K=HRL.K,HS=HRL.HS,HG=HRL.HG,AM=HRL.AM,F=HRL.F,Z=HRL.Z,H=HRL.H,SC=HRL.SC,W=HRL_K;
  let keyI,hemiI,ambI,exp,fogN,fogF,flat=0,bloomM=1,hazeDen=.0045,hazeFall=.015,hazeBase=SEA,hazeMax=.75,hazeOn=Q.haze?1:0,aoM=1,
    starsO=0,cloudV=over||aeth,moonV=false,sunV=1,dusk=0,D=HRL.sunDir,wA=0;
  if(neth){
    /* the plan's values. Measured in the browser with A's netherrack: mean frame ~2x OG's brightness (with OG fallback
       pixels in a B-only build it reads ~3x darker than OG: judge the Nether on the full build only) */
    keyI=0;hrLcp(K,W.white);hrLcp(HS,W.nSky);hrLcp(HG,W.nGnd);hemiI=1.1;hrLcp(AM,W.nAmb);ambI=.12;
    hrLcp(F,W.nFog);hrLcp(H,F);hrLcp(Z,F);flat=1;exp=1.25;bloomM=1.4;hazeDen=.012;hazeFall=0;sunV=0;
    fogN=RD*CH*0.3;fogF=RD*CH*0.85;
  }else if(aeth){
    /* plan: hemi 1.9, exposure .95, horizon 0xdcefff, zenith 0x6fb2ee. With A's blocks that measured as a white-out (islands
       and sky on the ACES shoulder, fog to near-white): OG's own Aether sky blue as horizon/fog/void, a deeper zenith,
       hemi 1.2, exposure .85 and haze capped at .35 keep the plan's colours and the white bounce from below, with contrast */
    hrLcp(K,W.aKey);keyI=5.3;D=HRL.aetherDir;hrLcp(HS,W.aSky);hrLcp(HG,W.aGnd);hemiI=1.2;hrLcp(AM,W.white);ambI=.06;
    hrLcp(Z,W.aZen);hrLcp(H,W.aHor);hrLcp(F,H);exp=.85;hazeBase=P.y-8;hazeMax=.35;
    fogN=RD*CH*0.5;fogF=RD*CH*1.05;
  }else if(theatre){
    /* v6.1 Puppet Purgatory (P7): a lit stage under the Grid, never the overworld day cycle (colInfo is meaningless here) */
    const m=hrMupSky(dt,snap);hrLcp(K,m.key);keyI=m.keyI;D=m.dir;hrLcp(HS,m.sky);hrLcp(HG,m.gnd);hemiI=m.hemiI;hrLcp(AM,m.amb);ambI=m.ambI;
    hrLcp(F,m.fog);hrLcp(H,F);hrLcp(Z,F);flat=1;exp=m.exp;bloomM=m.bloom;hazeDen=m.hazeDen;hazeFall=0;hazeBase=P.y-6;hazeMax=m.hazeMax;
    aoM=m.ao;sunV=0;cloudV=false;fogN=RD*CH*m.fogN;fogF=RD*CH*m.fogF;
  }else{
    hrLcp(K,p.key);keyI=p.keyI*(Q.shadow?1:lerp(1,.05,ug));D=s>-.03?HRL.sunDir:HRL.moonDir;
    hrLcp(HS,p.sky);hrLcp(HG,p.gnd);hemiI=p.hemiI*lerp(1,.05,ug);hrLcp(AM,W.amb);ambI=lerp(.06,.12,ug);
    hrLcp(Z,p.zen);hrLcp(H,p.hor);const fu=lerp(1,.06,ug);F[0]=H[0]*fu;F[1]=H[1]*fu;F[2]=H[2]*fu;   /* caves fog to dark, not to sky */
    exp=Math.min(2.2,p.exp*lerp(1,1.5,ug));fogN=RD*CH*0.45;fogF=RD*CH*0.98;
    const df=hrLcl((s+.16)*2.4,0,1);starsO=hrLcl(1-df*1.6,0,1)*.9*(1-ug);moonV=true;dusk=hrLcl(1-Math.abs(s)*4,0,1)*.85;
    /* Malgorath arena grade (plan Q4 default): ash fog, red rim, extra bloom inside ~40 blocks of (1000.5, 1000.5) */
    const _mg=hrMgGrade(dt,snap);
    wA=_mg?_mg.w:hrLcl((40-Math.hypot(P.x-(DEMON_X+.5),P.z-(DEMON_Z+.5)))/15,0,1);
    if(_mg&&wA>0){const g=_mg;keyI*=g.keyM;hrLmix(K,K,g.key,wA);hrLmix(HS,HS,g.sky,wA);hrLmix(HG,HG,g.gnd,wA);hemiI=lerp(hemiI,g.hemi,wA);
      hrLmix(F,F,g.fog,wA);hrLmix(H,H,g.hor,wA);hrLmix(Z,Z,g.zen,wA);fogF=lerp(fogF,g.far,wA);fogN=lerp(fogN,g.near,wA);
      exp=lerp(exp,g.exp,wA);bloomM*=1+(g.bloom-1)*wA;hazeDen*=1+(g.haze-1)*wA;ambI=Math.max(ambI,g.amb*wA);starsO*=1-g.dark*wA;moonV=moonV&&g.dark<.5;}
    else if(wA>0){keyI*=1-.6*wA;hrLmix(K,K,W.mKey,wA);hrLmix(HS,HS,W.mSky,wA);hrLmix(HG,HG,W.mGnd,wA);hemiI=lerp(hemiI,1.1,wA);
      hrLmix(F,F,W.mFog,wA);hrLmix(H,H,W.mFog,wA*.6);fogF=lerp(fogF,70,wA);fogN=lerp(fogN,12,wA);
      exp*=1-.15*wA;bloomM*=1+.6*wA;hazeDen*=1+wA;}
  }
  HRL.wA=wA;
  if(fullbright){hrLcp(HS,W.white);hrLcp(HG,W.fbGnd);hemiI=2.7;hrLcp(AM,W.white);ambI=.8;exp=1;aoM=.5;}
  if(P.inLava){hrLcp(F,W.lFog);fogN=0;fogF=1.5;flat=1;hrLcp(H,F);hrLcp(Z,F);hazeOn=0;starsO=0;moonV=false;sunV=0;}
  else if(P.eyeWater){hrLcp(F,W.wFog);fogN=0.5;fogF=18;flat=1;hrLcp(H,F);hrLcp(Z,F);exp=1.1;hazeOn=0;starsO=0;moonV=false;sunV=0;}
  if(XR.on){hazeOn=0;aoM=0;}
  /* write: key, hemisphere, ambient floor */
  sunL.color.setRGB(K[0],K[1],K[2]);sunL.intensity=keyI;HRL.keyI=keyI;hrLcp(HRL.keyDir,D);
  HRL.hemi.color.setRGB(HS[0],HS[1],HS[2]);if(HRL.hemi.groundColor)HRL.hemi.groundColor.setRGB(HG[0],HG[1],HG[2]);HRL.hemi.intensity=hemiI;
  if(ambL.color&&ambL.color.setRGB)ambL.color.setRGB(AM[0],AM[1],AM[2]);ambL.intensity=ambI;
  /* exposure, eased (1.5/s) */
  if(snap)HRL.exp=exp;else HRL.exp+=(exp-HRL.exp)*(1-Math.exp(-1.5*dt));
  /* fog + background: linear on the post path, display space on Low (fog is applied after tone mapping + encoding) */
  if(HRFX.post)scene.fog.color.setRGB(F[0],F[1],F[2]);
  else{const t=HRL.tc;t.r=F[0];t.g=F[1];t.b=F[2];hrToneJS(t,HRL.exp,scene.fog.color);}
  scene.fog.near=fogN;scene.fog.far=fogF;
  if(scene.background&&scene.background.copy)scene.background.copy(scene.fog.color);
  /* sun colour (linear) for the dome disc and the haze glow */
  const sw=neth?0:(aeth?1:p.sunW)*sunV*(1-.6*wA)*hrMgSun();
  SC[0]=hrLs2l(K[0])*sw;SC[1]=hrLs2l(K[1])*sw;SC[2]=hrLs2l(K[2])*sw;
  const sd=aeth?HRL.aetherDir:HRL.sunDir;
  if(HRL.domeU){const U=HRL.domeU,gk=aeth?1:.35;U.uZen.value.setRGB(Z[0],Z[1],Z[2]);U.uHor.value.setRGB(H[0],H[1],H[2]);   /* the Aether's void is sky */
    U.uGnd.value.setRGB(H[0]*gk,H[1]*gk,H[2]*gk);U.uSunCol.value.setRGB(SC[0],SC[1],SC[2]);U.uSunDir.value.set(sd[0],sd[1],sd[2]);U.uFlat.value=flat;}
  /* stars, moon, clouds (clouds drift exactly like OG's) */
  if(stars)stars.material.opacity=starsO;
  if(sunSpr)sunSpr.visible=false;
  if(moonSpr)moonSpr.visible=moonV;
  if(cloudG){cloudG.visible=cloudV;
    const cm=cloudG.children[0]&&cloudG.children[0].material;if(cm&&cm.color)cm.color.setRGB(lerp(1,K[0],dusk),lerp(1,K[1],dusk),lerp(1,K[2],dusk));
    if(cloudV)for(const cl of cloudG.children){cl.position.x+=dt*1.6;
      if(cl.position.x-P.x>230)cl.position.x-=460;if(P.x-cl.position.x>230)cl.position.x+=460;
      if(cl.position.z-P.z>230)cl.position.z-=460;if(P.z-cl.position.z>230)cl.position.z+=460;}}
  /* post settings for this frame */
  const X=HRFX.cfg;X.exp=HRL.exp;X.bloom=.08*bloomM;X.aoStr=.7*aoM;X.aoOn=aoM>0?1:0;X.hazeOn=hazeOn;X.hazeDen=hazeDen;X.hazeBase=hazeBase;X.hazeFall=hazeFall;X.hazeMax=hazeMax;
  hrLcp(X.sunDir,sd);hrLcp(X.sunCol,SC);hrLcp(X.hazeCol,F);
  if(theatre&&!P.inLava&&!P.eyeWater)hrLcp(X.hazeCol,HRL_MS.haze);    /* the Frog's green haze, the Demolitionist's smoke */
  if(Q.shadow&&keyI>1e-3)hrPlaceSun(D);
  if(dimNew&&typeof hrPgDim==='function'){HRL_MS.dimN++;hrPgDim(DIM);}   /* package C: prewarm a purgatory entered without mpArrive (a load) */
  return true;}
/* ---- v6.1 the theatre sub-preset: Strike/work > a live headliner's light > BLACKOUT > warn (SHOW with a flickering key) > SHOW ---- */
function hrMupKey(){let k='show';
  try{const hn=typeof hnState==='function'?hnState():null,cue=typeof mwCue==='function'?mwCue():null;
    if((typeof MP!=='undefined'&&MP&&MP.strike)||(cue&&cue.ph==='work')||(hn&&(hn.strike||hn.light==='work')))k='work';
    else if(hn&&hn.light&&HRL_MUP[hn.light])k=hn.light;
    else if(cue&&cue.ph==='blackout')k='blackout';
    else if(cue&&cue.ph==='warn')k='warn';}catch(err){}
  return HRL_MS.force||k;}
/* eased toward the sub-preset: lights cut instantly into BLACKOUT, come back up over ~1.5 s, cross-fade elsewhere */
function hrMupSky(dt,snap){const S=HRL_MS,k=hrMupKey(),T=HRL_MUP[k==='warn'?'show':k]||HRL_MUP.show;
  if(T.dir)hrLcp(S.tdir,T.dir);
  else{const dx=HRL_MUP_MOON[0]-P.x,dy=HRL_MUP_MOON[1]-P.y,dz=HRL_MUP_MOON[2]-P.z;S.tdir[0]=dx;S.tdir[1]=Math.max(dy,.35*Math.hypot(dx,dz));S.tdir[2]=dz;}
  {const l=Math.hypot(S.tdir[0],S.tdir[1],S.tdir[2])||1;S.tdir[0]/=l;S.tdir[1]/=l;S.tdir[2]/=l;}
  const cut=k==='blackout'&&S.k!=='blackout'&&S.k!=='';
  const t=(snap||S.snap||cut)?1:1-Math.exp(-(S.k==='blackout'?1.4:2.2)*(dt||0));
  S.k=k;S.snap=false;
  hrLmix(S.key,S.key,T.key,t);hrLmix(S.sky,S.sky,T.sky,t);hrLmix(S.gnd,S.gnd,T.gnd,t);hrLmix(S.amb,S.amb,T.amb,t);
  hrLmix(S.fog,S.fog,T.fog,t);hrLmix(S.haze,S.haze,T.haze,t);hrLmix(S.dir,S.dir,S.tdir,t);
  {const l=Math.hypot(S.dir[0],S.dir[1],S.dir[2])||1;S.dir[0]/=l;S.dir[1]/=l;S.dir[2]/=l;}
  for(let i=0;i<HRL_MUP_F.length;i++){const f=HRL_MUP_F[i];S[f]+=(T[f]-S[f])*t;}
  if(k==='warn'){const n=hrNoise(HRL.t*11,7);S.keyI=T.keyI*(n>.35?.25:(n<-.5?.6:1));}   /* the board ticking: the Grid stutters */
  return S;}
/* sun/moon placement: shadow box centred 0.4 * extent ahead of the player, snapped to whole shadow texels */
function hrPlaceSun(D){const q=tpQ(),S=q.ext||64,cp=Math.cos(P.pitch);
  let cx=P.x-cp*Math.sin(P.yaw)*S*.4,cy=P.y,cz=P.z-cp*Math.cos(P.yaw)*S*.4;
  if(q.shadow){const o=hrSnapC(cx,cy,cz,D[0],D[1],D[2],S,q.shadow,HRL.C);cx=o[0];cy=o[1];cz=o[2];}
  if(sunL.target){sunL.target.position.set(cx,cy,cz);if(sunL.target.updateMatrixWorld)sunL.target.updateMatrixWorld();}
  sunL.position.set(cx+D[0]*200,cy+D[1]*200,cz+D[2]*200);}
/* ---- per frame: torch / lava / glowstone pool (hook B2, the updateTorchLights slot) ---- */
function hrTorches(){if(!HRL.on||!P)return;
  if(!HRL.gathered||frameCount%15===0)hrTorchGather();
  const t=HRL.t,ex=P.x,ey=P.y+1.6,ez=P.z,L=HRL.pool;
  for(let i=0;i<L.length;i++){const l=L[i],c=HRL.slots[i];if(!c){l.intensity=0;continue;}
    const dx=c.x-ex,dy=c.y-ey,dz=c.z-ez,d=Math.sqrt(dx*dx+dy*dy+dz*dz),k=HRL_SRC[c.kind];
    l.intensity=c.base*hrLcl((32-d)/8,0,1)*(1+k.a*Math.sin(t*9+i*2.1)+k.b*hrNoise(t*7,i));}}
/* lava (with air above) and glowstone clusters per chunk, 4x4x4 cells; rescanned when the chunk's meshes change */
function hrEmScan(ch){const bl=ch.bl,LV=B.LAVA,GL=B.GLOWSTONE,AIR=B.AIR,acc=new Map();
  const mu=DIM==='puppet'&&B.PG_BURNER!==undefined,BU=mu?B.PG_BURNER:-1,TE=mu?B.PG_TESLA:-1;   /* v6.1: purgatory emitters (P7) */
  for(let lx=0;lx<CH;lx++)for(let y=0;y<WH;y++){const b0=(lx*WH+y)*CH;
    for(let lz=0;lz<CH;lz++){const id=bl[b0+lz];if(id!==LV&&id!==GL&&id!==BU&&id!==TE)continue;
      if(id===LV&&(y+1>=WH||bl[b0+CH+lz]!==AIR))continue;
      const kind=id===LV?1:(id===GL?2:(id===BU?3:4)),key=(((kind*4+(lx>>2))*20+(y>>2))*4+(lz>>2));let a=acc.get(key);
      if(!a){a=[0,0,0,0,kind,y,y];acc.set(key,a);}a[0]+=lx;a[1]+=y;a[2]+=lz;a[3]++;if(y<a[5])a[5]=y;if(y>a[6])a[6]=y;}}
  const cells=[],x0=ch.cx*CH,z0=ch.cz*CH,pf=ch.cx+','+ch.cz+':';
  for(const [key,a] of acc){const n=a[3],k=a[4];
    /* lava: the light hangs up to 2 blocks over the cell's top surface (WP-Z: at +0.3 it painted white hot-spots on the
       melt and blew out the rim), lower only when the air above the cell centre runs out */
    let ly=k>=3?a[6]+1.25:a[5]-.2;if(k===1){const cx=Math.min(CH-1,Math.max(0,Math.round(a[0]/n))),cz=Math.min(CH-1,Math.max(0,Math.round(a[2]/n)));
      let air=0;for(let y=a[6]+1;y<WH&&air<3&&bl[(cx*WH+y)*CH+cz]===AIR;y++)air++;
      ly=a[6]+1+Math.max(.6,Math.min(2,air-.4));}
    cells.push({k:'e'+pf+key,kind:k,n,x:x0+a[0]/n+.5,y:ly,z:z0+a[2]/n+.5,
      base:HRL_SRC[k].base*(k===1?Math.min(1.6,.5+.12*n):Math.min(1.4,.6+.1*n))});}
  return cells;}
function hrTorchGather(){HRL.gathered=true;
  const ex=P.x,ey=P.y+1.6,ez=P.z,L=HRL.cand;L.length=0;
  for(const k of torches){const p=dimP(k);if(!p)continue;const x=+p[0]+.5,y=+p[1]+.8,z=+p[2]+.5,dx=x-ex,dy=y-ey,dz=z-ez,d2=dx*dx+dy*dy+dz*dz;
    if(d2<1024)L.push({k,kind:0,x,y,z,d2,base:HRL_SRC[0].base});}
  if(DIM==='puppet'&&typeof MP_LIGHTS!=='undefined')for(const k of MP_LIGHTS){const p=dimP(k);if(!p)continue;   /* v6.1 (P7) */
    const bx=+p[0],by=+p[1],bz=+p[2],id=getBlock(bx,by,bz);if(id===B.PG_BURNER)continue;      /* the chunk scan has the Burners */
    const kind=id===B.PG_HOTPLATE?3:5,x=bx+.5,y=by+(kind===3?1.15:.6),z=bz+.5,dx=x-ex,dy=y-ey,dz=z-ez,d2=dx*dx+dy*dy+dz*dz;
    if(d2<1024)L.push({k:'m'+k,kind,x,y,z,d2,base:HRL_SRC[kind].base});}
  const pcx=Math.floor(ex/CH),pcz=Math.floor(ez/CH);
  for(const [k,en] of HRL.em)if(chunks.get(k)!==en.ch)HRL.em.delete(k);           /* unloaded or replaced chunks */
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const k=ckey(pcx+dx,pcz+dz),ch=chunks.get(k);if(!ch||!ch.meshes)continue;
    let en=HRL.em.get(k);if(!en||en.ch!==ch||en.meshes!==ch.meshes){en={ch,meshes:ch.meshes,cells:hrEmScan(ch)};HRL.em.set(k,en);}
    for(const c of en.cells){const ddx=c.x-ex,ddy=c.y-ey,ddz=c.z-ez;c.d2=ddx*ddx+ddy*ddy+ddz*ddz;if(c.d2<1024)L.push(c);}}
  L.sort((a,b)=>a.d2-b.d2);
  const n=HRL.pool.length,top=L.length>n?L.slice(0,n):L.slice(),keep=new Set(top.map(c=>c.k)),S=HRL.slots;
  for(let i=0;i<n;i++)if(S[i]&&!keep.has(S[i].k))S[i]=null;                     /* stable slots: lights do not hop */
  const have=new Map();for(let i=0;i<n;i++)if(S[i])have.set(S[i].k,i);
  for(const c of top){const i=have.get(c.k);if(i!==undefined){S[i]=c;continue;}const f=S.indexOf(null);if(f>=0){S[f]=c;have.set(c.k,f);}}
  if(n&&HRL.pool[0].castShadow&&top.length&&S[0]!==top[0]){const j=S.indexOf(top[0]);S[j]=S[0];S[0]=top[0];}   /* Ultra: nearest casts */
  for(let i=0;i<n;i++){const c=S[i],l=HRL.pool[i];if(!c)continue;const k=HRL_SRC[c.kind];
    l.position.set(c.x,c.y,c.z);l.color.setHex(k.col);l.distance=k.dist;}}
tpOn('mesh',ch=>{if(HRL.on&&ch)HRL.em.delete(ckey(ch.cx,ch.cz));});        /* A's re-mesh event (A3); identity checks cover B-only builds */
/* ---- per render: sky objects follow the camera; the foreign-light mirror ---- */
function hrSkyFollow(){const v=HRL.v3;camera.getWorldPosition(v);
  if(HRL.dome)HRL.dome.position.copy(v);
  if(stars)stars.position.copy(v);
  if(moonSpr){const m=HRL.moonDir;moonSpr.position.set(v.x+m[0]*380,v.y+m[1]*380,v.z+m[2]*380);}}
function hrInScene(o){for(let p=o.parent;p;p=p.parent){if(p===scene)return true;if(!p.visible)return false;}return false;}   /* ancestors only: B hid the light itself */
function hrMirrorTick(){const m=HRL.mirror;if(!m||!HRL.foreign)return;
  if(DIM==='puppet'&&HRL_MS.follow>.01&&hrMupFollow(m))return;     /* v6.1: the followspot is the brightest thing in the world */
  let best=null,bd=1e18;const v=HRL.v3b,c=HRL.v3;camera.getWorldPosition(c);
  for(const o of HRL.foreign){if(!hrInScene(o))continue;o.getWorldPosition(v);const dx=v.x-c.x,dy=v.y-c.y,dz=v.z-c.z,d2=dx*dx+dy*dy+dz*dz;
    if(d2<bd){bd=d2;best=o;m.position.copy(v);}}
  if(!best){m.intensity=0;HRL.mirrorI=0;return;}
  m.color.copy(best.color);m.intensity=Math.max(0,best.intensity)*16;HRL.mirrorI=m.intensity;
  m.distance=best.userData&&best.userData.mgLight?best.distance:24;}   /* legacy -> physical gain (tuned by eye) */
function hrMupFollow(m){let f=HRL_MS.ft;if(!f)try{f=typeof mwFollowTarget==='function'?mwFollowTarget():null;}catch(err){f=null;}
  if(!f)return false;m.position.set(f.x,f.y+4.2,f.z);m.color.setHex(0xfff1d6);m.intensity=HRL_MUP_FS*HRL_MS.follow;HRL.mirrorI=m.intensity;return true;}
/* ---- QA exports (plan B8) ---- */
function hrLightCount(){const n={amb:0,dir:0,hemi:0,point:0,shadows:0,total:0,key:''};if(!scene)return n;
  const walk=o=>{if(!o.visible)return;if(o.isLight){n.total++;if(o.isAmbientLight)n.amb++;else if(o.isDirectionalLight)n.dir++;
    else if(o.isHemisphereLight)n.hemi++;else if(o.isPointLight)n.point++;if(o.castShadow&&(o.isDirectionalLight||o.isPointLight||o.isSpotLight))n.shadows++;}
    for(const ch of o.children)walk(ch);};
  walk(scene);n.key='a'+n.amb+' d'+n.dir+' h'+n.hemi+' p'+n.point+' s'+n.shadows;return n;}
Object.assign(TPEX,{
  getHRL:()=>({on:HRL.on,exp:HRL.exp,keyI:HRL.keyI,keyDir:HRL.keyDir.slice(),dim:HRL.dim,pool:HRL.pool.length,
    poolLit:HRL.pool.filter(l=>l.intensity>0).length,adopted:HRFX.adopted.size,post:!!HRFX.sceneRT,foreign:HRL.foreign?HRL.foreign.size:0,
    mirrorI:HRL.mirrorI,hemiI:HRL.hemi?HRL.hemi.intensity:0,amb:ambL?ambL.intensity:0,ug:HRL.ug,wA:HRL.wA,
    fog:scene&&scene.fog?{n:scene.fog.near,f:scene.fog.far,c:[scene.fog.color.r,scene.fog.color.g,scene.fog.color.b]}:null,
    cand:HRL.cand.length,emCells:[...HRL.em.values()].reduce((a,e)=>a+e.cells.length,0),cfg:Object.assign({},HRFX.cfg),
    rts:hrFXCount(),dome:!!HRL.dome,theatre:HRL_MS.k,follow:HRL_MS.follow}),
  hrMupForce:k=>{HRL_MS.force=k&&HRL_MUP[k==='warn'?'show':k]?k:null;HRL_MS.snap=true;return HRL_MS.force;},   /* v6.1 test seam */
  hrMupFollowT:f=>{HRL_MS.ft=f||null;},hrMupLights:()=>typeof MP_LIGHTS!=='undefined'?MP_LIGHTS:null,
  hrMupState:()=>({k:HRL_MS.k,keyI:HRL_MS.keyI,hemiI:HRL_MS.hemiI,exp:HRL_MS.exp,follow:HRL_MS.follow,dir:HRL_MS.dir.slice(),dimN:HRL_MS.dimN,
    fog:HRL_MS.fog.slice(),key:HRL_MS.key.slice(),T:HRL_MUP}),
  hrPalette:tod=>{const o=hrPalE(Math.sin(tod*Math.PI*2),hrPalNew());return JSON.parse(JSON.stringify(o));},
  tpLightCount:hrLightCount,hrToneJS,hrSnapC,
  hrLState:()=>({sunL,ambL,TLIGHTS,sunSpr,moonSpr,stars,cloudG,HRL,HRFX})});   /* test seam: the objects B snapshots */
