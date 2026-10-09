/* DINGLECRAFT headless smoke harness — boots the real game in node.
   Stubs: DOM, canvas 2d, THREE, storage. Rebuilt after a sandbox reset;
   the game code is untouched — only this harness is fresh. */
'use strict';

/* ---- canvas + 2d context ---- */
function mkCtx(){
  const t={
    canvas:null,
    fillStyle:'#000',strokeStyle:'#000',lineWidth:1,lineCap:'butt',
    shadowBlur:0,shadowColor:'#000',globalAlpha:1,font:'10px x',
    textAlign:'left',textBaseline:'top',imageSmoothingEnabled:false,
    fillRect(){},clearRect(){},strokeRect(){},
    beginPath(){},closePath(){},moveTo(){},lineTo(){},arc(){},ellipse(){},
    fill(){},stroke(){},rect(){},
    bezierCurveTo(){},quadraticCurveTo(){},
    drawImage(){},putImageData(){},
    save(){},restore(){},translate(){},rotate(){},scale(){},
    fillText(){},strokeText(){},
    measureText:()=>({width:8}),
    createLinearGradient:()=>({addColorStop(){}}),
    createRadialGradient:()=>({addColorStop(){}}),
    createPattern:()=>({}),
    getImageData:(x,y,w,h)=>({width:w,height:h,data:new Uint8ClampedArray(Math.max(4,w*h*4))}),
    setLineDash(){},
  };
  return new Proxy(t,{
    get:(o,k)=>k in o?o[k]:(typeof k==='string'?()=>{}:undefined),
    set:(o,k,v)=>{o[k]=v;return true;},
  });
}
function mkCanvas(){
  const cv={width:16,height:16,style:mkStyle(),className:'',
    parentNode:{className:'',style:mkStyle()},
    addEventListener(){},removeEventListener(){},
    getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720}),
    requestPointerLock(){},
    toDataURL:()=>'data:,',
    getContext:()=>ctx};
  const ctx=mkCtx();ctx.canvas=cv;
  return cv;
}
function mkStyle(){
  return new Proxy({},{get:(o,k)=>k in o?o[k]:'',set:(o,k,v)=>{o[k]=v;return true;}});
}
function mkEl(tag){
  const el={tagName:(tag||'div').toUpperCase(),style:mkStyle(),
    children:[],textContent:'',innerHTML:'',value:'',
    className:'',id:'',disabled:false,checked:false,
    classList:{add(){},remove(){},toggle(){},contains:()=>false},
    appendChild(c){el.children.push(c);if(c&&typeof c==='object')c.parentNode=el;return c;},
    removeChild(){},remove(){},
    addEventListener(){},removeEventListener(){},
    setAttribute(){},getAttribute:()=>null,
    focus(){},blur(){},click(){},
    getBoundingClientRect:()=>({left:0,top:0,width:100,height:20}),
    querySelectorAll:()=>[],querySelector:()=>null,
  };
  return el;
}
const els={};
global.document={
  createElement:t=>t==='canvas'?mkCanvas():mkEl(t),
  createTextNode:()=>({}),
  getElementById:id=>els[id]||(els[id]=(['gl','stats','ring'].includes(id)?mkCanvas():mkEl('div'))),
  addEventListener(){},removeEventListener(){},
  exitPointerLock(){},
  pointerLockElement:null,
  hidden:false,
  body:{classList:{add(){},remove(){}},appendChild(){},style:mkStyle()},
  documentElement:{style:mkStyle()},
};
global.window=global;
global.innerWidth=1280;global.innerHeight=720;
global.devicePixelRatio=1;
global.addEventListener=()=>{};
global.removeEventListener=()=>{};
global.requestAnimationFrame=()=>0;
global.cancelAnimationFrame=()=>{};
global.performance=global.performance||{now:()=>Date.now()};
try{Object.defineProperty(global,'navigator',{value:{userAgent:'node',maxTouchPoints:0,vibrate(){}},configurable:true});}catch(e){}
global.localStorage={_m:new Map(),getItem(k){return this._m.has(k)?this._m.get(k):null;},
  setItem(k,v){this._m.set(k,String(v));},removeItem(k){this._m.delete(k);},clear(){this._m.clear();}};
global.AudioContext=function(){return {createOscillator:()=>({connect(){},start(){},stop(){},frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}},type:''}),
  createGain:()=>({connect(){},gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}}}),
  createBuffer:()=>({getChannelData:()=>new Float32Array(1024)}),
  createBufferSource:()=>({connect(){},start(){},stop(){},buffer:null,playbackRate:{value:1}}),
  createBiquadFilter:()=>({connect(){},frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},Q:{value:0},type:''}),
  destination:{},currentTime:0,state:'running',resume(){return Promise.resolve();}};};
global.webkitAudioContext=global.AudioContext;

/* ---- storage (artifact-style promise API) ---- */
const _store=new Map();
global.storage={
  async set(key,value){_store.set(key,String(value));return {key,value};},
  async get(key){if(!_store.has(key))throw new Error('not found: '+key);return {key,value:_store.get(key)};},
  async delete(key){const had=_store.delete(key);if(!had)throw new Error('not found');return {key,deleted:true};},
  async list(prefix){return {keys:[..._store.keys()].filter(k=>!prefix||k.startsWith(prefix))};},
};

/* ---- THREE stub ---- */
class Color{
  constructor(r,g,b){this.set(r,g,b);}
  set(r,g,b){if(typeof r==='number'&&g===undefined){this.r=((r>>16)&255)/255;this.g=((r>>8)&255)/255;this.b=(r&255)/255;}
    else{this.r=r||0;this.g=g||0;this.b=b||0;}return this;}
  setRGB(r,g,b){this.r=r;this.g=g;this.b=b;return this;}
  setHSL(){return this;}
  copy(c){this.r=c.r;this.g=c.g;this.b=c.b;return this;}
  clone(){return new Color().copy(this);}
  lerp(c,a){this.r+=(c.r-this.r)*a;this.g+=(c.g-this.g)*a;this.b+=(c.b-this.b)*a;return this;}
  getHSL(o){o=o||{};o.h=0;o.s=0;o.l=0.5;return o;}
  offsetHSL(){return this;}
}
class Vec3{
  constructor(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  clone(){return new Vec3(this.x,this.y,this.z);}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
  setScalar(s){this.x=s;this.y=s;this.z=s;return this;}
  normalize(){const l=Math.hypot(this.x,this.y,this.z)||1;return this.multiplyScalar(1/l);}
  length(){return Math.hypot(this.x,this.y,this.z);}
}
class Euler extends Vec3{constructor(){super();this.order='XYZ';}}
class Obj3D{
  constructor(){this.position=new Vec3();this.rotation=new Euler();this.scale=new Vec3(1,1,1);
    this.children=[];this.visible=true;this.name='';this.userData={};this.parent=null;
    this.castShadow=false;this.receiveShadow=false;this.renderOrder=0;this.frustumCulled=true;}
  add(...cs){for(const c of cs){this.children.push(c);c.parent=this;}return this;}
  remove(c){const i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);return this;}
  getObjectByName(n){if(this.name===n)return this;
    for(const c of this.children){const r=c.getObjectByName&&c.getObjectByName(n);if(r)return r;}return undefined;}
  lookAt(){}
  traverse(fn){fn(this);for(const c of this.children)c.traverse&&c.traverse(fn);}
  updateMatrixWorld(){}
}
class Geo{constructor(){this.attributes={};this.parameters={};this.index=null;
    this.groups=[];this.boundingSphere=null;}
  setAttribute(n,a){this.attributes[n]=a;return this;}
  setIndex(i){this.index=i;return this;}
  addGroup(s,c,m){this.groups.push({start:s,count:c,materialIndex:m});return this;}
  clearGroups(){this.groups.length=0;}
  computeBoundingSphere(){}
  dispose(){}
  translate(){return this;}rotateX(){return this;}rotateY(){return this;}rotateZ(){return this;}
  computeVertexNormals(){}}
class Mat{constructor(o){o=o||{};this.color=o.color instanceof Color?o.color:new Color(o.color!==undefined?o.color:0xffffff);
    this.emissive=o.emissive instanceof Color?o.emissive:new Color(0,0,0);
    Object.assign(this,{transparent:false,opacity:1,side:0,map:null,emissiveMap:null,
      emissiveIntensity:1,roughness:1,metalness:0,fog:true,depthWrite:true,
      sizeAttenuation:true,size:1},o);
    if(!(this.color instanceof Color))this.color=new Color(this.color);
    if(!(this.emissive instanceof Color))this.emissive=new Color(0,0,0);}
  dispose(){}
  clone(){return new Mat(this);}}
class Mesh extends Obj3D{constructor(g,m){super();this.geometry=g||new Geo();this.material=m||new Mat();}}
class Light extends Obj3D{constructor(c,i,d){super();this.color=new Color(c!==undefined?c:0xffffff);this.intensity=i!==undefined?i:1;this.distance=d||0;
  this.target=new Obj3D();this.shadow={mapSize:{width:0,height:0},camera:{}};}}
global.THREE={
  Color, Vector3:Vec3, Euler,
  Vector2:class{constructor(x,y){this.x=x||0;this.y=y||0;}set(x,y){this.x=x;this.y=y;return this;}},
  Object3D:Obj3D, Group:class extends Obj3D{}, Scene:class extends Obj3D{constructor(){super();this.background=new Color();this.fog=null;}},
  Mesh, Sprite:class extends Obj3D{constructor(m){super();this.material=m||new Mat();}},
  Points:class extends Obj3D{constructor(g,m){super();this.geometry=g;this.material=m||new Mat();}},
  PerspectiveCamera:class extends Obj3D{constructor(fov,asp,n,f){super();this.fov=fov;this.aspect=asp;this.near=n;this.far=f;}
    updateProjectionMatrix(){}},
  OrthographicCamera:class extends Obj3D{constructor(){super();}updateProjectionMatrix(){}},
  WebGLRenderTarget:class{constructor(w,h){this.width=w;this.height=h;this.texture={};}setSize(w,h){this.width=w;this.height=h;}dispose(){}},
  AmbientLight:Light, DirectionalLight:Light, PointLight:Light, HemisphereLight:Light,
  WebGLRenderer:class{constructor(){this.domElement=mkCanvas();this.shadowMap={enabled:false,type:0};
    this.outputEncoding=0;this.info={render:{triangles:0,calls:0}};}
    setSize(){}setPixelRatio(){}setClearColor(){}render(){}dispose(){}setRenderTarget(){}},
  Fog:class{constructor(c,n,f){this.color=new Color(c);this.near=n;this.far=f;}},
  BufferGeometry:Geo, BoxGeometry:Geo, PlaneGeometry:Geo,
  SphereGeometry:Geo, CylinderGeometry:Geo, ConeGeometry:Geo, IcosahedronGeometry:Geo,
  TorusGeometry:Geo, RingGeometry:Geo, ShapeGeometry:Geo, TubeGeometry:Geo,
  BufferAttribute:class{constructor(a,n){this.array=a;this.itemSize=n;}},
  Float32BufferAttribute:class{constructor(a,n){this.array=a;this.itemSize=n;}},
  MeshLambertMaterial:Mat, MeshBasicMaterial:Mat, MeshStandardMaterial:Mat, ShaderMaterial:Mat,
  MeshPhongMaterial:Mat, SpriteMaterial:Mat, PointsMaterial:Mat, LineBasicMaterial:Mat,
  CanvasTexture:class{constructor(cv){this.image=cv;this.magFilter=0;this.minFilter=0;this.needsUpdate=false;}dispose(){}},
  Texture:class{constructor(){this.needsUpdate=false;}dispose(){}},
  Shape:class{moveTo(){return this;}lineTo(){return this;}bezierCurveTo(){return this;}
    quadraticCurveTo(){return this;}closePath(){return this;}},
  CatmullRomCurve3:class{constructor(){}getPoints(){return [];}getPoint(){return new Vec3();}},
  NearestFilter:1, LinearFilter:2, DoubleSide:2, FrontSide:0, BackSide:1,
  sRGBEncoding:0, RepeatWrapping:0,
};


module.exports={};
