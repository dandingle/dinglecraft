/* real3.js (WP0): like hr_boot, but with the real three r128 from assets/vendor/three.r128.min.js (paths.VENDOR_THREE),
   the same file the build inlines into the game (Release 1.0 bundles it: THIRD_PARTY.md). The t?_real.js suites run in
   the gate; available() is false only in a checkout without the file. Use:
     const real3=require('./real3.js');
     if(!real3.available()){console.log('SKIP');process.exit(0);}
     const V=real3({stubs:['A'], assets:'fake'});           // full game boot on real r128 (hr_boot options)
     const {THREE,loadModels}=real3.models();               // fallback seam: real THREE + the spliced cast only
     const HR=loadModels();                                 // runs hrLoadModels() from the built game.js in strict mode
   Full boot recipe (plan section 3.4): stubs.js first, then the stub WebGLRenderer extended with capabilities
   (isWebGL2, maxTextureSize 16384, aniso 16), extensions.has, getContext (MAX_ARRAY_TEXTURE_LAYERS 2048),
   compile, getPixelRatio, getDrawingBufferSize, info; global.THREE = real r128 + that renderer;
   document.createElementNS; an Image that never loads but whose decode() resolves; then game.js. */
'use strict';
const fs=require('fs');
const hb=require('./hr_boot.js');
const VENDOR=hb.P.VENDOR_THREE;
function available(){return fs.existsSync(VENDOR);}
function three(){if(!available())throw new Error('real3: missing '+VENDOR+' (assets/vendor/three.r128.min.js, bundled since Release 1.0)');
  const m={exports:{}};
  new Function('module','exports','define','self',fs.readFileSync(VENDOR,'utf8'))(m,m.exports,undefined,undefined);
  if(!m.exports.REVISION||m.exports.REVISION!=='128')throw new Error('real3: vendored three is r'+m.exports.REVISION+', expected r128');
  return m.exports;}
function domExtras(){
  if(!document.createElementNS)document.createElementNS=(ns,t)=>document.createElement(t);
  global.Image=class{constructor(){this.width=0;this.height=0;this.complete=false;this.onload=null;this.onerror=null;this._src='';}
    set src(v){this._src=v;}get src(){return this._src;}decode(){return Promise.resolve();}
    addEventListener(){}removeEventListener(){}};}
function real3(o){
  require(hb.P.STUBS);                       /* cached: hr_boot's own require of it is then a no-op */
  const T3=three(),StubR=THREE.WebGLRenderer;
  class R3 extends StubR{constructor(...a){super(...a);
    this.capabilities={isWebGL2:true,maxTextureSize:16384,getMaxAnisotropy:()=>16,precision:'highp'};
    this.extensions={has:()=>true,get:()=>({})};
    this.info={render:{calls:0,triangles:0,frame:0},memory:{geometries:0,textures:0},programs:[]};
    this.physicallyCorrectLights=false;this.outputEncoding=T3.LinearEncoding;this.toneMapping=T3.NoToneMapping;
    this.toneMappingExposure=1;this.autoClear=true;this.shadowMap={enabled:false,type:T3.PCFShadowMap,autoUpdate:true,needsUpdate:false};}
    getContext(){return {getParameter:()=>2048,MAX_ARRAY_TEXTURE_LAYERS:35071,drawingBufferWidth:800,drawingBufferHeight:600,
      readPixels(){},getError:()=>0,RGBA:6408,UNSIGNED_BYTE:5121};}
    compile(){}getPixelRatio(){return 1;}getDrawingBufferSize(v){return v.set(800,600);}getRenderTarget(){return null;}
    getClearColor(c){return c.setHex(0);}getClearAlpha(){return 1;}};
  global.THREE=Object.assign({},T3,{WebGLRenderer:R3});
  domExtras();
  return hb(o);}
/* the fallback seam: only the spliced cast, against real THREE */
function models(gameJs){
  const T3=three();require(hb.P.STUBS);domExtras();
  const body=extractModels(fs.readFileSync(gameJs||hb.BUILD+'game.js','utf8'));
  const win={THREE:T3,document,HR:{},devicePixelRatio:1,setTimeout,clearTimeout,performance,
    requestAnimationFrame:()=>0,Image:global.Image};
  const loadModels=()=>{new Function('window','THREE','document','"use strict";'+body+'\nreturn hrLoadModels;')(win,T3,document)();return win.HR;};
  return {THREE:T3,loadModels,win};}
/* `function hrLoadModels(){...}` as spliced by stage 2 (it ends right before the export branch) */
function extractModels(src){
  const a=src.indexOf('\nfunction hrLoadModels(){\n'),b=src.indexOf("\nif(typeof window==='undefined'||typeof __VOXTEST");
  if(a<0||b<a)throw new Error('real3: hrLoadModels() not found in the build');
  return src.slice(a+1,b);}
module.exports=real3;
Object.assign(real3,{available,three,models,extractModels,VENDOR});
