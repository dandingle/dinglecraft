/* tB_real.js (Package B): checks against the real three r128 (plan B10), from assets/vendor/three.r128.min.js (bundled
   since Release 1.0; the gate skips this suite only in a checkout without it). It needs no game boot: tB_post.js and
   tB_light.js are evaluated standalone against the real THREE with the few contract symbols they touch stubbed. */
'use strict';
const fs=require('fs'),path=require('path');
const real3=require('../lib/real3.js'),boot=require('../lib/hr_boot.js'),{ok}=boot;
if(!real3.available()){console.log('SKIP tB_real: '+path.relative(boot.ROOT,real3.VENDOR)+' is not vendored');console.log('0 passed, 0 failed');process.exit(0);}
const T3=real3.three(),C=T3.ShaderChunk,L=T3.ShaderLib,GD=boot.SRC.tex;
boot.run(async()=>{
  ok('three is r128',T3.REVISION==='128');
  /* hrLin tokens exist in the real shader sources */
  for(const k of ['basic','lambert','phong','standard','sprite','points'])
    ok('ShaderLib.'+k+' has the diffuse token',L[k].fragmentShader.includes('vec4 diffuseColor = vec4( diffuse, opacity );'));
  for(const k of ['lambert','phong','standard'])
    ok('ShaderLib.'+k+' has the emissive + map + emissive-map tokens',['vec3 totalEmissiveRadiance = emissive;','#include <map_fragment>','#include <emissivemap_fragment>'].every(t=>L[k].fragmentShader.includes(t)));
  ok('map_fragment decodes with mapTexelToLinear',C.map_fragment.includes('mapTexelToLinear'));
  ok('emissivemap_fragment decodes with emissiveMapTexelToLinear',C.emissivemap_fragment.includes('emissiveMapTexelToLinear'));
  ok('tonemapping_fragment and encodings_fragment exist (the dome includes them)',!!C.tonemapping_fragment&&!!C.encodings_fragment);
  ok('lights_lambert_vertex scales direct light by PI three times (the quirk hrLin removes)',(C.lights_lambert_vertex.match(/PI \* directLight\.color/g)||[]).length===3&&
    L.lambert.vertexShader.includes('#include <lights_lambert_vertex>'));
  ok('physically correct hemisphere light skips the PI factor',/#ifndef PHYSICALLY_CORRECT_LIGHTS[\s\S]{0,40}irradiance \*= PI/.test(C.lights_pars_begin));
  /* tB_post.js standalone */
  const post=boot.readSrc(GD+'tB_post.js',{legacy:true}),light=boot.readSrc(GD+'tB_light.js',{legacy:true});
  const M=new Function('THREE','TPEX','HRL','TP','tpQ','hrTag','camera','renderer',
    post+'\nreturn {hrLin,hrFXEnable,hrFXRT,HRFX,src:{vs:HRFX_VS,ao:HRFX_AO,blur:HRFX_BLUR,pre:HRFX_PRE,down:HRFX_DOWN,up:HRFX_UP,comp:HRFX_COMP,fxaa:HRFX_FXAA}};')(
    T3,{},{on:false},{},()=>({}),m=>{m.userData=m.userData||{};m.userData.hr=1;return m;},null,null);
  M.HRFX.post=false;M.hrFXEnable({});
  ok('hrFXEnable builds both linear chunks and the PI-free Lambert chunk from r128',!!M.HRFX.lamVert&&!/PI \* directLight/.test(M.HRFX.lamVert)&&!!M.HRFX.mapFrag&&!!M.HRFX.emiFrag&&M.HRFX.mapFrag.includes('sRGBToLinear')&&M.HRFX.emiFrag.includes('sRGBToLinear'));
  for(const k of ['basic','lambert','phong','standard','sprite','points']){const sh={fragmentShader:L[k].fragmentShader};M.hrLin(sh);const f=sh.fragmentShader;
    ok('hrLin on ShaderLib.'+k,f.includes('pow( diffuse, vec3( 2.2 ) )')&&!f.includes('#include <map_fragment>')&&(!L[k].fragmentShader.includes('vec3 totalEmissiveRadiance = emissive;')||f.includes('pow( emissive, vec3( 2.2 ) )')));}
  {const sh={fragmentShader:L.lambert.fragmentShader,vertexShader:L.lambert.vertexShader};M.hrLin(sh);
    ok('hrLin on the Lambert vertex shader',!sh.vertexShader.includes('#include <lights_lambert_vertex>')&&!/PI \* directLight/.test(sh.vertexShader)&&
      (sh.vertexShader.match(/vHrDirF \+=/g)||[]).length===1);
    ok('hrLin on the Lambert fragment shader: mask on the sun only',sh.fragmentShader.includes('hrDirL * ( 1.0 - getShadowMask() )')&&!sh.fragmentShader.includes('* getShadowMask();'));}
  const lt=new Function('THREE','TPEX','tpTierFields','tpRegister','tpOn',light+'\nreturn {dome:HRL_DOME_FS,vs:HRL_DOME_VS};')(T3,{},()=>{},()=>{},()=>{});
  const all=Object.assign({},M.src,{dome:lt.dome,domevs:lt.vs});
  ok('no texture( calls in any pass or dome shader (WebGL1 path)',Object.values(all).every(s=>!/\btexture\s*\(/.test(s)));
  /* render targets as B builds them */
  const rt=M.hrFXRT(64,32,true,true);
  ok('sceneRT: half float, linear filtering, no mipmaps, depth texture of UnsignedIntType',rt.texture.type===T3.HalfFloatType&&rt.texture.minFilter===T3.LinearFilter&&
    rt.texture.generateMipmaps===false&&rt.depthBuffer===true&&rt.depthTexture&&rt.depthTexture.isDepthTexture&&rt.depthTexture.type===T3.UnsignedIntType);
  rt.dispose();
});
