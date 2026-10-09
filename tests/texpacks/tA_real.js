/* tA_real.js (Package A): the world shader patch against the REAL three r128 sources (assets/vendor/three.r128.min.js, the
   file the build inlines since Release 1.0). The browser checks cover the rest (shader compile on real r128, GPU-vs-JS
   rotation readback). Kept deliberately small: the game is booted on the stubs (hr_boot + stubs_A), and only the shader
   strings come from the real three. The minified r128 inlines GL enums as numbers (TEXTURE_2D_ARRAY = 35866). */
'use strict';
const real3=require('../lib/real3.js');
if(!real3.available()){console.log('SKIP tA_real (no vendored three r128)');console.log('0 passed, 0 failed');process.exit(0);}
const boot=require('../lib/hr_boot.js'),{ok}=boot,fs=require('fs');
const T3=real3.three();
const V=boot({stubs:['A'],assets:'fake'});
boot.run(async()=>{
  ok('real three is r128 with DataTexture2DArray',T3.REVISION==='128'&&typeof T3.DataTexture2DArray==='function');
  for(const lib of ['standard','physical']){const L=T3.ShaderLib[lib],sh={uniforms:{},vertexShader:L.vertexShader,fragmentShader:L.fragmentShader};
    let err='';try{V.hrWPatch(sh);}catch(e){err=e.message;}
    ok('hrWPatch applies to the real ShaderLib.'+lib+(err?' ('+err+')':''),!err);}
  const D=T3.ShaderLib.depth,ds={uniforms:{},vertexShader:D.vertexShader,fragmentShader:D.fragmentShader};
  let err='';try{V.hrWPatchDepth(ds);}catch(e){err=e.message;}
  ok('hrWPatchDepth applies to the real ShaderLib.depth'+(err?' ('+err+')':''),!err);
  const stub=THREE.ShaderChunk;THREE.ShaderChunk=T3.ShaderChunk;
  let P='';try{P=V.hrWPerturbSrc(true);}catch(e){err=e.message;}finally{THREE.ShaderChunk=stub;V.hrWPerturbSrc(true);}
  ok('perturbNormal2Arb extracts from the real normalmap_pars_fragment',/vec3 hrPerturb\(/.test(P)&&!P.includes('vUv')&&/faceDirection/.test(P));
  const src=fs.readFileSync(real3.VENDOR,'utf8');
  ok('r128 uploads 2D-array textures and generates their mipmaps (TEXTURE_2D_ARRAY 35866 + generateMipmap)',(src.includes('TEXTURE_2D_ARRAY')||/\b35866\b/.test(src))&&src.includes('generateMipmap'));
  ok('r128 binds sampler2DArray uniforms (SAMPLER_2D_ARRAY 36289 / setValueT2DArray1)',src.includes('setValueT2DArray1')||/\b36289\b/.test(src));
});
