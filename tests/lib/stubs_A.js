/* stubs_A.js (Package A): only ADDS what the world module needs on top of the root stubs.js (never edit stubs.js).
   A WebGL2-capable renderer (capabilities, extensions, getContext with MAX_ARRAY_TEXTURE_LAYERS), texture-array /
   data-texture / depth-material stand-ins, and r128's normalmap_pars_fragment perturbNormal2Arb (for the extractor). */
'use strict';
const T=global.THREE;
class DataTex{constructor(data,w,h,d){this.image={data,width:w,height:h,depth:d};this.needsUpdate=false;this.disposed=0;}
  dispose(){this.disposed++;}}
T.DataTexture2DArray=T.DataTexture2DArray||class DataTexture2DArray extends DataTex{};
T.DataTexture=T.DataTexture||class DataTexture extends DataTex{constructor(d,w,h){super(d,w,h,1);}};
for(const [k,v] of Object.entries({RGBAFormat:1023,UnsignedByteType:1009,LinearMipmapLinearFilter:1008,RGBADepthPacking:3201,
  ClampToEdgeWrapping:1001,LinearEncoding:3000}))if(T[k]===undefined)T[k]=v;
T.MeshDepthMaterial=T.MeshDepthMaterial||class MeshDepthMaterial extends T.MeshLambertMaterial{};
if(!T.ShaderChunk)T.ShaderChunk={};
if(!T.ShaderChunk.normalmap_pars_fragment)T.ShaderChunk.normalmap_pars_fragment=[
  '#ifdef USE_NORMALMAP','\tuniform sampler2D normalMap;','\tuniform vec2 normalScale;','#endif',
  '#if defined( TANGENTSPACE_NORMALMAP ) || defined ( USE_CLEARCOAT_NORMALMAP )',
  '\tvec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {',
  '\t\tvec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );',
  '\t\tvec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );',
  '\t\tvec2 st0 = dFdx( vUv.st );','\t\tvec2 st1 = dFdy( vUv.st );','\t\tvec3 N = surf_norm;',
  '\t\tvec3 q1perp = cross( q1, N );','\t\tvec3 q0perp = cross( N, q0 );',
  '\t\tvec3 T = q1perp * st0.x + q0perp * st1.x;','\t\tvec3 B = q1perp * st0.y + q0perp * st1.y;',
  '\t\tfloat det = max( dot( T, T ), dot( B, B ) );','\t\tfloat scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );',
  '\t\treturn normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );','\t}','#endif'].join('\n');
const Base=T.WebGLRenderer;
T.WebGLRenderer=class WebGLRenderer extends Base{constructor(...a){super(...a);
  if(!this.capabilities)this.capabilities={isWebGL2:true,maxTextureSize:16384,getMaxAnisotropy:()=>16,precision:'highp'};
  if(!this.extensions)this.extensions={has:()=>true,get:()=>({})};
  if(this.toneMappingExposure===undefined)this.toneMappingExposure=1;
  if(this.autoClear===undefined)this.autoClear=true;}
  getContext(){return {getParameter:p=>p===35071?2048:0,MAX_ARRAY_TEXTURE_LAYERS:35071,getError:()=>0};}
  getPixelRatio(){return 1;}compile(){}};
module.exports={};
