/* stubs_C.js (Package C): extends the root THREE stub for the cast suites only (never edit root stubs.js).
   Adds only what is missing: Object3D.layers, Frustum/Matrix4/Sphere, Texture.image, Geo.boundingSphere,
   an isMesh flag on Mesh (C-only processes: t0_smoke sets its own) and Quaternion for fake models. */
'use strict';
const T=global.THREE;
const O=T.Object3D.prototype;
if(!Object.getOwnPropertyDescriptor(O,'layers'))Object.defineProperty(O,'layers',{configurable:true,
  get(){if(!this._layers)this._layers={mask:1,set(n){this.mask=1<<n;},enable(n){this.mask|=1<<n;},disable(n){this.mask&=~(1<<n);},test(l){return (this.mask&l.mask)!==0;}};return this._layers;}});
if(!T.Mesh.prototype.isMesh)T.Mesh.prototype.isMesh=true;
T.Frustum=T.Frustum||class{setFromProjectionMatrix(){return this;}intersectsSphere(){return true;}};
T.Matrix4=T.Matrix4||class{multiplyMatrices(){return this;}};
T.Sphere=T.Sphere||class{constructor(){this.center=new T.Vector3();this.radius=0;}};
T.Quaternion=T.Quaternion||class{constructor(){this.x=0;this.y=0;this.z=0;this.w=1;}};
const G=T.BufferGeometry.prototype;
const cbs=G.computeBoundingSphere;
G.computeBoundingSphere=function(){if(cbs)cbs.call(this);if(!this.boundingSphere)this.boundingSphere={radius:this._r!==undefined?this._r:0.3};};
/* Texture: image slot + encoding/anisotropy fields the cast's texture loader writes */
const Tex=T.Texture;
T.Texture=class extends Tex{constructor(img){super();this.image=img;this.encoding=0;this.anisotropy=1;}};
module.exports={};
