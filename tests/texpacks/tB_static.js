/* tB_static.js (Package B): statics, no world started (plan B10). Palette continuity, the sun/moon crossfade, the CPU ACES
   copy against an independent reference, shadow texel snapping, the pass/dome shader sources, hrLin token replacement,
   the hook text in the build, and the tier table. */
'use strict';
const boot=require('../lib/hr_boot.js'),{ok}=boot;
const fs=require('fs');
const V=boot({stubs:['B']});

boot.run(async()=>{
  const tp=V.getTP();
  ok('the light module is registered (order 20, required)',tp.mods.includes('light'));
  ok('no contract misuse at load',tp.errs.length===0||(console.log('  errs: '+tp.errs.join(' | ')),false));
  for(const k of ['getHRL','hrPalette','tpLightCount','hrToneJS','hrSnapC','hrLState','hrFXSrc','hrLin','hrLamChunks'])ok('__vox exports '+k,typeof V[k]==='function'&&V[k]===V.__tpx[k]);
  const st=V.hrLState();
  ok('OG at load: the module is off and nothing is allocated',st.HRL.on===false&&st.HRL.hemi===null&&st.HRL.dome===null&&st.HRFX.sceneRT===null&&st.HRL.pool.length===0);

  /* ---- tier table (plan B9) ---- */
  const Q=V.HRQ,want={pr:[1,1.25,1.5,2],post:[0,1,1,1],shadow:[0,1024,2048,4096],ext:[0,40,64,80],shEvery:[0,2,1,1],
    torches:[4,6,8,12],torchShadow:[0,0,0,1],bloom:[0,3,5,5],ssao:[0,0,8,16],haze:[0,1,1,1],fxaa:[0,1,1,1],grain:[0,0,.012,.012]};
  ok('B tier fields match the plan',Object.keys(want).every(k=>want[k].every((v,i)=>Q[i][k]===v)));

  /* ---- palette (plan B5) ---- */
  const N=20000,f=['keyI','hemiI','exp','sunW','moonW'];let worst={},prev=null;
  const lum=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
  for(let i=0;i<=N;i++){const p=V.hrPalette(i/N);
    const cur={keyI:p.keyI,hemiI:p.hemiI,exp:p.exp,sunW:p.sunW,moonW:p.moonW,keyL:lum(p.key)*p.keyI,zen:lum(p.zen),hor:lum(p.hor),sky:lum(p.sky)*p.hemiI};
    if(prev)for(const k in cur){const d=Math.abs(cur[k]-prev[k]);if(!(d<=(worst[k]||0)))worst[k]=d;}prev=cur;}
  ok('the palette is continuous over a full day: no step above 0.02 per 1/20000 day (keyI, hemi, exposure, colours x intensity)',Object.values(worst).every(d=>d<0.02)||(console.log('  worst step: '+JSON.stringify(worst)),false));
  const at=e=>V.hrPalette(Math.asin(Math.max(-1,Math.min(1,e)))/(2*Math.PI)+(e<0?1:0));
  const sw=at(-.03);
  ok('sun and moon weights cross near 0 where the key light swaps (e = -0.03)',sw.sunW<.02&&sw.moonW<.02&&sw.keyI<.05);
  ok('full sun above e = 0.10, full moon below e = -0.16',at(.12).sunW===1&&at(.12).moonW===0&&at(-.17).moonW===1&&at(-.17).sunW===0);
  const noon=V.hrPalette(.25),mid=V.hrPalette(.75),pre=at(.18);
  ok('noon matches the table (sun 4.6, hemi 1.0, exposure 1.0)',Math.abs(noon.keyI-4.6)<1e-9&&Math.abs(noon.hemiI-1)<1e-9&&noon.exp===1);
  ok('e = .18 is the approved preview rig (0xffc98a / 4.5, hemi 0.85, exposure 1.05)',Math.abs(pre.keyI-4.5)<1e-6&&Math.abs(pre.hemiI-.85)<1e-6&&Math.abs(pre.exp-1.05)<1e-6&&
    Math.abs(pre.key[0]-1)<1e-6&&Math.abs(pre.key[1]-0xc9/255)<1e-6&&Math.abs(pre.key[2]-0x8a/255)<1e-6);
  ok('midnight is the moon (0x9fb4ff / 0.5, hemi 0.15, exposure 1.45)',Math.abs(mid.keyI-.5)<1e-9&&Math.abs(mid.key[2]-1)<1e-9&&Math.abs(mid.key[0]-0x9f/255)<1e-9&&
    Math.abs(mid.hemiI-.15)<1e-9&&Math.abs(mid.exp-1.45)<1e-9);
  const s2l=c=>c<0.04045?c*0.0773993808:Math.pow(c*0.9478672986+0.0521327014,2.4);
  ok('sky colours are sRGB -> linear (noon zenith 0x3d6fa8)',Math.abs(noon.zen[0]-s2l(0x3d/255))<1e-9&&Math.abs(noon.zen[2]-s2l(0xa8/255))<1e-9);

  /* ---- hrToneJS against an independent copy of three's ACESFilmicToneMapping (column-major mat3, /0.6) + LinearTosRGB ---- */
  const col=(m,v)=>[m[0][0]*v[0]+m[1][0]*v[1]+m[2][0]*v[2],m[0][1]*v[0]+m[1][1]*v[1]+m[2][1]*v[2],m[0][2]*v[0]+m[1][2]*v[1]+m[2][2]*v[2]];
  const IN=[[0.59719,0.07600,0.02840],[0.35458,0.90834,0.13383],[0.04823,0.01566,0.83777]],OUT=[[1.60475,-0.10208,-0.00327],[-0.53108,1.10813,-0.07276],[-0.07367,-0.00605,1.07602]];
  const rrt=v=>(v*(v+0.0245786)-0.000090537)/(v*(0.983729*v+0.4329510)+0.238081);
  const ref=(c,x)=>{let v=col(IN,c.map(q=>q*x/0.6));v=v.map(rrt);v=col(OUT,v).map(q=>Math.min(1,Math.max(0,q)));
    return v.map(q=>q<=0.0031308?q*12.92:1.055*Math.pow(q,1/2.4)-0.055);};
  const o=new THREE.Color();
  V.hrToneJS({r:1,g:1,b:1},1,o);
  ok('hrToneJS(white, 1) = 0.8877 (three ACES + sRGB)',Math.abs(o.r-0.8877)<5e-4&&Math.abs(o.g-o.r)<1e-4&&Math.abs(o.b-o.r)<2e-4);
  let maxd=0;for(const [c,x] of [[[1,1,1],1],[[.5,.2,.1],1.3],[[.02,.3,.9],.7],[[3,2,1],1.45],[[0,0,0],1]]){V.hrToneJS({r:c[0],g:c[1],b:c[2]},x,o);const r=ref(c,x);
    maxd=Math.max(maxd,Math.abs(o.r-r[0]),Math.abs(o.g-r[1]),Math.abs(o.b-r[2]));}
  ok('hrToneJS matches the reference on 5 colours/exposures (max diff '+maxd.toExponential(1)+')',maxd<1e-9);

  /* ---- shadow texel snapping ---- */
  let snapOK=true,idem=true,small=true;const out=[0,0,0],out2=[0,0,0];
  for(let i=0;i<500;i++){const th=i*0.0137+0.2,dir=[Math.cos(th),Math.sin(th),.28],l=Math.hypot(...dir);dir[0]/=l;dir[1]/=l;dir[2]/=l;
    const c=[(i*37.31)%512-256,30+(i%40),(i*91.7)%512-256],S=[40,64,80][i%3],size=[1024,2048,4096][i%3],tx=2*S/size;
    V.hrSnapC(c[0],c[1],c[2],dir[0],dir[1],dir[2],S,size,out);V.hrSnapC(out[0],out[1],out[2],dir[0],dir[1],dir[2],S,size,out2);
    let X=[dir[2],0,-dir[0]];const xl=Math.hypot(X[0],X[2]);X=[X[0]/xl,0,X[2]/xl];
    const Y=[dir[1]*X[2]-dir[2]*X[1],dir[2]*X[0]-dir[0]*X[2],dir[0]*X[1]-dir[1]*X[0]];
    const u=out[0]*X[0]+out[2]*X[2],v=out[0]*Y[0]+out[1]*Y[1]+out[2]*Y[2];
    if(Math.abs(u/tx-Math.round(u/tx))>1e-6||Math.abs(v/tx-Math.round(v/tx))>1e-6)snapOK=false;
    if(Math.hypot(out2[0]-out[0],out2[1]-out[1],out2[2]-out[2])>1e-9)idem=false;
    const dz=(out[0]-c[0])*dir[0]+(out[1]-c[1])*dir[1]+(out[2]-c[2])*dir[2];
    if(Math.hypot(out[0]-c[0],out[1]-c[1],out[2]-c[2])>tx*.7072||Math.abs(dz)>1e-9)small=false;}
  ok('hrSnapC puts the shadow centre on whole shadow texels (light-space X and Y)',snapOK);
  ok('hrSnapC is idempotent',idem);
  ok('hrSnapC moves less than one texel diagonal and never along the light',small);

  /* ---- shader sources ---- */
  const src=V.hrFXSrc();
  const passes=['vs','ao','blur','pre','down','up','comp','fxaa','dome'];
  ok('pass and dome shaders sample with texture2D only (no texture( on the WebGL1 path)',passes.every(k=>!/\btexture\s*\(/.test(src[k])));
  ok('the composite carries three\'s ACES matrices and /0.6',src.comp.includes('vec3(0.59719,0.07600,0.02840)')&&src.comp.includes('vec3(1.60475,-0.10208,-0.00327)')&&src.comp.includes('c/0.6'));
  ok('the composite does AO, haze, bloom, ACES, sRGB, vignette and grain',['uUseAO','uUseHaze','uUseBloom','hrACES','hrSRGB','uVig','uGrain'].every(t=>src.comp.includes(t)));
  ok('FXAA uses the classic reduce (sum/32, min 1/128) and an 8 px span',src.fxaa.includes('*.03125')&&src.fxaa.includes('1./128.')&&src.fxaa.includes('vec2(8.)'));
  ok('SSAO: sample count is a define, sky depth gets 1, Alchemy term',src.ao.includes('HR_N')&&src.ao.includes('.99999')&&src.ao.includes('-.02*(-p.z)'));
  ok('the dome ends with three\'s tone mapping and encoding',src.dome.includes('#include <tonemapping_fragment>')&&src.dome.includes('#include <encodings_fragment>'));
  /* hrLin: every r128 token (stub chunks carry the real chunk text) */
  st.HRFX.mapFrag=THREE.ShaderChunk.map_fragment.replace('mapTexelToLinear','sRGBToLinear');
  st.HRFX.emiFrag=THREE.ShaderChunk.emissivemap_fragment.replace('emissiveMapTexelToLinear','sRGBToLinear');
  const sh={fragmentShader:'uniform vec3 diffuse;\nvoid main(){\n\tvec4 diffuseColor = vec4( diffuse, opacity );\n\tvec3 totalEmissiveRadiance = emissive;\n\t#include <map_fragment>\n\t#include <emissivemap_fragment>\n}'};
  V.hrLin(sh);
  ok('hrLin linearises diffuse, emissive, map and emissive map',sh.fragmentShader.includes('pow( diffuse, vec3( 2.2 ) )')&&sh.fragmentShader.includes('pow( emissive, vec3( 2.2 ) )')&&
    !sh.fragmentShader.includes('#include <map_fragment>')&&!sh.fragmentShader.includes('#include <emissivemap_fragment>')&&
    (sh.fragmentShader.match(/sRGBToLinear/g)||[]).length===2&&!/TexelToLinear/.test(sh.fragmentShader));
  const lc=V.hrLamChunks(THREE.ShaderChunk.lights_lambert_vertex);st.HRFX.lamVert=lc.v;st.HRFX.lamFrag=lc.f;
  const LAMF='\treflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();';
  const lsh={fragmentShader:'void main(){\n'+LAMF+'\n}',vertexShader:'void main(){\n#include <lights_lambert_vertex>\n}'};V.hrLin(lsh);
  const lv=lsh.vertexShader,dirAt=lv.indexOf('#if NUM_DIR_LIGHTS > 0');
  ok('hrLin makes Lambert\'s per-vertex lighting physical: flag defined in the vertex shader, direct-light PI dropped',!lv.includes('#include <lights_lambert_vertex>')&&
    !/PI \* directLight/.test(lv)&&(lv.match(/directLightColor_Diffuse = directLight\.color;/g)||[]).length===3&&
    lv.startsWith('#ifndef PHYSICALLY_CORRECT_LIGHTS\n#define PHYSICALLY_CORRECT_LIGHTS\n#endif\nvarying vec3 vHrDirF;\nvarying vec3 vHrDirB;\n'));
  ok('Lambert: only the directional term feeds vHrDirF/B (zeroed first), point and spot lights do not',(lv.match(/vHrDirF \+=/g)||[]).length===1&&(lv.match(/vHrDirB \+=/g)||[]).length===1&&
    lv.indexOf('vHrDirF +=')>dirAt&&lv.indexOf('vHrDirB +=')>dirAt&&dirAt>0&&lv.indexOf('vHrDirF = vec3( 0.0 );')>=0&&lv.indexOf('vHrDirF = vec3( 0.0 );')<lv.indexOf('#if NUM_POINT_LIGHTS'));
  ok('Lambert: the shadow mask applies to the sun only (torch/lava/glowstone light survives in shadow)',lsh.fragmentShader.startsWith('varying vec3 vHrDirF;\nvarying vec3 vHrDirB;\n')&&
    !lsh.fragmentShader.includes('* getShadowMask();')&&lsh.fragmentShader.includes('reflectedLight.directDiffuse - hrDirL * ( 1.0 - getShadowMask() )'));
  ok('a Lambert chunk without the expected directional block keeps r128\'s mask (no half patch)',V.hrLamChunks('directLightColor_Diffuse = PI * directLight.color;').f===null);
  const nsh={fragmentShader:'void main(){}',vertexShader:'void main(){}'};V.hrLin(nsh);
  ok('hrLin leaves non-Lambert shaders alone',nsh.vertexShader==='void main(){}'&&nsh.fragmentShader==='void main(){}');
  st.HRFX.mapFrag=st.HRFX.emiFrag=st.HRFX.lamVert=st.HRFX.lamFrag=null;

  /* ---- hooks in the build: guarded by TP.hr&&HRL.on, OG branch intact ---- */
  const G=fs.readFileSync(boot.BUILD+'game.js','utf8');
  const hooks=[['function updateSky(dt){\n  if(TP.hr&&HRL.on&&hrSky(dt))return;\n  if(DIM!==\'over\'){','B1 updateSky'],
    ['function updateTorchLights(){\n  if(TP.hr&&HRL.on){hrTorches();return;}\n  if(frameCount%15!==0)return;','B2 updateTorchLights'],
    ['    if(TP.hr&&HRL.on)hrRender();\n    else if(SHD.on&&SHD.rt){\n      renderer.setRenderTarget(SHD.rt);renderer.render(scene,camera);\n      renderer.setRenderTarget(null);renderer.render(SHD.scn,SHD.cam);\n    }else renderer.render(scene,camera);','B3 render'],
    ['    if(TP.hr&&HRL.on)hrResize();\n    if(SHD.rt){SHD.rt.setSize(window.innerWidth,window.innerHeight);','B4 resize'],
    ['  if(TP.hr&&HRL.on){if(o&&o.traverse)hrShadowify(o);return;}\n  if(!SHD.on||!o||!o.traverse)return;\n  o.traverse(q=>{if(q.isMesh&&!q.isSprite){q.castShadow=true;q.receiveShadow=true;}});','B5 shadowify'],
    ['function applyShadows(on){\n  if(TP.hr&&HRL.on){hrApplyShadows();return;}\n  if(typeof renderer===\'undefined\'||!renderer||!renderer.shadowMap)return;','B6 applyShadows'],
    ["    $('waterov').style.opacity=P.eyeWater?(TP.hr&&HRL.on?0.12:0.35):0;",'B7 water overlay']];
  for(const [h,n] of hooks)ok(n+' hook is in the build exactly once, OG branch intact',G.split(h).length===2);
  const core=G.slice(0,G.indexOf('/* ---- PART 54: t0_contract.js ---- */'));
  ok('exactly 7 B hooks in the core, all guarded by TP.hr&&HRL.on',(core.match(/TP\.hr&&HRL\.on/g)||[]).length===7&&!/hrSky\(|hrTorches\(|hrRender\(|hrResize\(|hrShadowify\(|hrApplyShadows\(/.test(core.replace(/if\(TP\.hr&&HRL\.on(&&hrSky\(dt\))?\)?\{?(hrTorches\(\)|hrRender\(\)|hrResize\(\)|hrApplyShadows\(\)|if\(o&&o\.traverse\)hrShadowify\(o\))?/g,'')));
  /* ---- B sources: no clocks or randomness, no THREE constructors outside functions ---- */
  const dir=boot.SRC.tex;
  for(const f of ['tB_light.js','tB_post.js']){const s=boot.readSrc(dir+f,{legacy:true}).replace(/\/\*[\s\S]*?\*\//g,'');
    ok(f+': no Math.random / Date.now / performance.now / fetch',!/Math\.random|Date\.now|performance\.now|\bfetch\s*\(/.test(s));
    const top=s.split('\n').filter(l=>/^(const|let|var)\s/.test(l)&&/new\s+THREE\./.test(l));
    ok(f+': no THREE constructor at top level',top.length===0);}
});
