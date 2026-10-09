/* stubs_B.js (Package B): extends the root THREE stub for the tB_* suites only (plan B10). Only ADDS what is missing,
   or swaps a stub class for a subclass that adds fields; root stubs.js is never edited. Loaded by hr_boot before game.js,
   so the game's own lights, sprites, materials and renderer are built from these classes. Also:
   - the renderer reports WebGL2 + float render targets, so tpCaps() lets the 'light' module run and Auto = Medium (post path);
   - render-target, render() and setRenderTarget() bookkeeping (stubsB.rts live set, stubsB.log) for the pass-graph tests. */
'use strict';
const T=global.THREE;
const stubsB={rts:new Set(),made:0,log:null,renders:0};
/* ---- constants ---- */
const K={HalfFloatType:1016,FloatType:1015,UnsignedIntType:1014,UnsignedByteType:1009,RGBAFormat:1023,DepthFormat:1026,
  ACESFilmicToneMapping:4,NoToneMapping:0,LinearEncoding:3000,PCFSoftShadowMap:2,PCFShadowMap:1};
for(const k in K)if(T[k]===undefined)T[k]=K[k];
/* ---- Color / Vector3 / Object3D ---- */
const C=T.Color.prototype;
C.setHex=C.setHex||function(h){return this.set(h);};
C.getHex=C.getHex||function(){const f=v=>Math.max(0,Math.min(255,Math.round(v*255)));return (f(this.r)<<16)|(f(this.g)<<8)|f(this.b);};
C.setScalar=C.setScalar||function(s){this.r=this.g=this.b=s;return this;};
C.multiplyScalar=C.multiplyScalar||function(s){this.r*=s;this.g*=s;this.b*=s;return this;};
C.lerpColors=C.lerpColors||function(a,b,t){this.r=a.r+(b.r-a.r)*t;this.g=a.g+(b.g-a.g)*t;this.b=a.b+(b.b-a.b)*t;return this;};
C.convertSRGBToLinear=C.convertSRGBToLinear||function(){const f=c=>c<0.04045?c*0.0773993808:Math.pow(c*0.9478672986+0.0521327014,2.4);
  this.r=f(this.r);this.g=f(this.g);this.b=f(this.b);return this;};
C.isColor=true;
const V=T.Vector3.prototype;
V.addScaledVector=V.addScaledVector||function(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;};
V.crossVectors=V.crossVectors||function(a,b){const x=a.y*b.z-a.z*b.y,y=a.z*b.x-a.x*b.z,z=a.x*b.y-a.y*b.x;this.x=x;this.y=y;this.z=z;return this;};
V.dot=V.dot||function(v){return this.x*v.x+this.y*v.y+this.z*v.z;};
V.lengthSq=V.lengthSq||function(){return this.x*this.x+this.y*this.y+this.z*this.z;};
V.distanceTo=V.distanceTo||function(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);};
const V2=T.Vector2.prototype;V2.copy=V2.copy||function(v){this.x=v.x;this.y=v.y;return this;};
const O=T.Object3D.prototype;
O.getWorldPosition=O.getWorldPosition||function(v){let x=0,y=0,z=0;for(let o=this;o;o=o.parent){x+=o.position.x;y+=o.position.y;z+=o.position.z;}return v.set(x,y,z);};
O.updateWorldMatrix=O.updateWorldMatrix||function(){};
{const rm=O.remove;O.remove=function(...cs){for(const c of cs){rm.call(this,c);if(c&&c.parent===this)c.parent=null;}return this;};}   /* as three does */
T.Mesh.prototype.isMesh=true;
T.Sprite.prototype.isSprite=true;
T.Points.prototype.isPoints=true;
/* ---- Matrix4 (for camera matrices used as uniforms) ---- */
if(!T.Matrix4)T.Matrix4=class{constructor(){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}copy(m){this.elements=m.elements.slice();return this;}
  invert(){return this;}multiplyMatrices(){return this;}identity(){return this;}};
/* ---- cameras ---- */
{const PC=T.PerspectiveCamera;T.PerspectiveCamera=class extends PC{constructor(...a){super(...a);this.isCamera=true;
  this.projectionMatrix=new T.Matrix4();this.projectionMatrixInverse=new T.Matrix4();this.matrixWorld=new T.Matrix4();this.matrixWorldInverse=new T.Matrix4();}};}
/* ---- materials: ShaderMaterial gets its own class (the root stub shares one Mat class for every material) ---- */
{const Mat=T.MeshLambertMaterial;
  if(!Mat.prototype.onBeforeCompile)Mat.prototype.onBeforeCompile=function(){};          /* r128 Material.prototype default */
  T.ShaderMaterial=class extends Mat{constructor(o){super(o);this.isShaderMaterial=true;this.uniforms=(o&&o.uniforms)||{};this.defines=(o&&o.defines)||{};}};
  T.RawShaderMaterial=class extends T.ShaderMaterial{constructor(o){super(o);this.isRawShaderMaterial=true;}};}
/* ---- lights: one stub Light class becomes four typed subclasses with real shadow objects ---- */
{const L0=T.PointLight;
  const shadow=()=>({mapSize:{width:512,height:512,set(w,h){this.width=w;this.height=h;return this;}},
    camera:{left:-5,right:5,top:5,bottom:-5,near:0.5,far:500,updateProjectionMatrix(){}},bias:0,normalBias:0,radius:1,map:null});
  if(!L0.prototype.dispose)L0.prototype.dispose=function(){};
  T.AmbientLight=class extends L0{constructor(...a){super(...a);this.isLight=true;this.isAmbientLight=true;}};
  T.DirectionalLight=class extends L0{constructor(...a){super(...a);this.isLight=true;this.isDirectionalLight=true;this.shadow=shadow();this.position.set(0,1,0);}};
  T.PointLight=class extends L0{constructor(c,i,d,decay){super(c,i,d);this.isLight=true;this.isPointLight=true;this.decay=decay===undefined?1:decay;this.shadow=shadow();}};
  T.HemisphereLight=class extends L0{constructor(s,g,i){super(s,i);this.isLight=true;this.isHemisphereLight=true;this.groundColor=new T.Color(g!==undefined?g:0);this.position.set(0,1,0);}};}
/* ---- textures and render targets ---- */
if(!T.DepthTexture)T.DepthTexture=class{constructor(w,h){this.image={width:w,height:h};this.isDepthTexture=true;this.type=K.UnsignedIntType;this.disposed=false;}dispose(){this.disposed=true;}};
{const RT0=T.WebGLRenderTarget;
  T.WebGLRenderTarget=class extends RT0{constructor(w,h,o){super(w,h);this.options=o||{};this.texture={isTexture:true,generateMipmaps:true,type:(o&&o.type)||K.UnsignedByteType};
      this.depthTexture=null;this.disposed=false;stubsB.rts.add(this);stubsB.made++;}
    dispose(){this.disposed=true;stubsB.rts.delete(this);}};}
/* ---- renderer ---- */
{const R0=T.WebGLRenderer;
  T.WebGLRenderer=class extends R0{constructor(...a){super(...a);
    this.capabilities={isWebGL2:true,maxTextureSize:16384,getMaxAnisotropy:()=>16,precision:'highp'};
    this.extensions={has:()=>true,get:()=>({})};
    this.info={render:{calls:0,triangles:0,frame:0},memory:{geometries:0,textures:0},programs:[],autoReset:true,resets:0,reset(){this.resets++;this.render.calls=0;}};
    this.physicallyCorrectLights=false;this.toneMapping=K.NoToneMapping;this.toneMappingExposure=1;this.autoClear=true;
    this.shadowMap={enabled:false,type:K.PCFShadowMap,autoUpdate:true,needsUpdate:false};
    this._pr=1;this._w=1280;this._h=720;this._rt=null;this._cc=0;this._ca=1;}
    setPixelRatio(p){this._pr=p;}getPixelRatio(){return this._pr;}
    setSize(w,h){this._w=w;this._h=h;}
    getDrawingBufferSize(v){return v.set(Math.floor(this._w*this._pr),Math.floor(this._h*this._pr));}
    setRenderTarget(t){this._rt=t||null;}getRenderTarget(){return this._rt;}
    setClearColor(c,a){this._cc=typeof c==='number'?c:(c&&c.getHex?c.getHex():0);if(a!==undefined)this._ca=a;}
    getClearColor(c){return c.setHex(this._cc);}getClearAlpha(){return this._ca;}
    getContext(){return {getParameter:()=>2048,MAX_ARRAY_TEXTURE_LAYERS:35071,drawingBufferWidth:this._w,drawingBufferHeight:this._h,
      readPixels(){},getError:()=>0,RGBA:6408,UNSIGNED_BYTE:5121};}
    compile(){this.compiles=(this.compiles||0)+1;}
    render(s,c){stubsB.renders++;this.info.render.calls++;if(stubsB.log)stubsB.log.push(this._rt);}};}
/* ---- shader chunks with the tokens hrLin replaces ---- */
T.ShaderChunk=T.ShaderChunk||{
  map_fragment:'#ifdef USE_MAP\n\tvec4 texelColor = texture2D( map, vUv );\n\ttexelColor = mapTexelToLinear( texelColor );\n\tdiffuseColor *= texelColor;\n#endif',
  lights_lambert_vertex:['vIndirectFront = vec3( 0.0 );','#if NUM_POINT_LIGHTS > 0','\tfor ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {','\t\tdirectLightColor_Diffuse = PI * directLight.color;','\t\tvLightFront += saturate( dotNL ) * directLightColor_Diffuse;','\t\t#ifdef DOUBLE_SIDED','\t\t\tvLightBack += saturate( -dotNL ) * directLightColor_Diffuse;','\t\t#endif','\t}','#endif','#if NUM_SPOT_LIGHTS > 0','\t\tdirectLightColor_Diffuse = PI * directLight.color;','\t\tvLightFront += saturate( dotNL ) * directLightColor_Diffuse;','\t\t\tvLightBack += saturate( -dotNL ) * directLightColor_Diffuse;','#endif','#if NUM_DIR_LIGHTS > 0','\t#pragma unroll_loop_start','\tfor ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {','\t\tdirectLightColor_Diffuse = PI * directLight.color;','\t\tvLightFront += saturate( dotNL ) * directLightColor_Diffuse;','\t\t#ifdef DOUBLE_SIDED','\t\t\tvLightBack += saturate( -dotNL ) * directLightColor_Diffuse;','\t\t#endif','\t}','\t#pragma unroll_loop_end','#endif'].join('\n'),
  emissivemap_fragment:'#ifdef USE_EMISSIVEMAP\n\tvec4 emissiveColor = texture2D( emissiveMap, vUv );\n\temissiveColor.rgb = emissiveMapTexelToLinear( emissiveColor ).rgb;\n\ttotalEmissiveRadiance *= emissiveColor.rgb;\n#endif'};
/* ---- capture window resize handlers (the root stub drops them) so the suite can fire the game's own handler ---- */
stubsB.resize=[];
global.addEventListener=(t,f)=>{if(t==='resize'&&typeof f==='function')stubsB.resize.push(f);};
global.stubsB=stubsB;
module.exports={stubsB};
