/* ---- PART 56: c1_mesh.js ---- */
/* PART 56 c1_mesh.js (C1, paintings): the easel's chunk mesh, the painting cells' chunk mesh (nothing: the art is its own mesh),
   and the art meshes: one THREE.Mesh per hung painting (its anchor cell) and one per easel holding a canvas, in the current
   dimension, chunk loaded, within render distance. Each is a MeshLambertMaterial with a nearest-filtered CanvasTexture of the
   decoded pixels (empty pixels = the canvas colour), shaded like the wall face it hangs on (0.8 on x walls, 0.65 on z walls; 1 when
   Hyperreal's world materials are live, which divide the face shade out). Hyperreal adopts these materials by itself.
   Declarative: the set is derived from CRBE (rescanned every 0.5 s or when a block entity / work changes), created lazily and
   disposed on 'del', dimension change and world reset. Nothing here runs while nothing creative exists (processCrea gates the tick). */
var CRPM=new Map();                                 /* BE key -> {m,geo,mat,tex,cv,g,be,id,u,t,f,kind} */
var CRPS={scanT:0,dirty:true,easel:new Map()};      /* easel BE key -> the work id its chunk mesh was built for */
/* ---- the easel (CRREG.mesh.easel): A-frame of three legs, a top bar, a brace, a ledge and a canvas board sized to its work ---- */
/* local units: a across (0 = viewer's left), d depth (0 = back, 1 = front, toward the viewer = the BE's facing), y up. 1/16 steps */
function crEaselBoard(be){const r=be&&be.id?crRec(crWorkN(be.id)):null,w=r&&r.k==='art'?r.w:64,h=r&&r.k==='art'?r.h:64,u=1/16;
  if(w>h)return [2*u,14*u,6*u,12*u];
  if(h>w)return [5.5*u,10.5*u,6*u,16*u];
  return [3.5*u,12.5*u,6*u,15*u];}
const CRP_BOARD_D=[10.5/16,11.25/16];               /* the board's depth span; the art sits just in front of its front face */
function crEaselShade(nx,ny,nz){return ny>0.5?0.92:ny<-0.5?0.5:Math.abs(nx)>0.5?0.74:0.6;}   /* never a cube face shade (1/.8/.65/.55) */
function crEaselBox(b,lx,y,lz,f,a0,a1,y0,y1,d0,d1,T){const n=CRC.FN[f],r=crRight(f);
  const W=(a,yy,d)=>[lx+0.5+(a-0.5)*r[0]+(d-0.5)*n[0],y+yy,lz+0.5+(a-0.5)*r[1]+(d-0.5)*n[1]];
  const cl=v=>v<0?0:v>1?1:v;
  const F=[[T.front,[n[0],0,n[1]],[[a0,y0,d1],[a1,y0,d1],[a1,y1,d1],[a0,y1,d1]],(a,yy,d)=>[a,yy]],
    [T.back,[-n[0],0,-n[1]],[[a1,y0,d0],[a0,y0,d0],[a0,y1,d0],[a1,y1,d0]],(a,yy,d)=>[1-a,yy]],
    [T.side,[r[0],0,r[1]],[[a1,y0,d1],[a1,y0,d0],[a1,y1,d0],[a1,y1,d1]],(a,yy,d)=>[1-d,yy]],
    [T.side,[-r[0],0,-r[1]],[[a0,y0,d0],[a0,y0,d1],[a0,y1,d1],[a0,y1,d0]],(a,yy,d)=>[d,yy]],
    [T.top,[0,1,0],[[a0,y1,d1],[a1,y1,d1],[a1,y1,d0],[a0,y1,d0]],(a,yy,d)=>[a,d]],
    [T.top,[0,-1,0],[[a0,y0,d0],[a1,y0,d0],[a1,y0,d1],[a0,y0,d1]],(a,yy,d)=>[a,d]]];
  for(const [ti,nn,Q,st] of F){const uv=tileUV(ti),c=crEaselShade(nn[0],nn[1],nn[2]),s=b.vc;
    for(const q of Q){const p=W(q[0],q[1],q[2]),t=st(q[0],q[1],q[2]);
      b.p.push(p[0],p[1],p[2]);b.n.push(nn[0],nn[1],nn[2]);b.u.push(uv[0]+(uv[2]-uv[0])*cl(t[0]),uv[1]+(uv[3]-uv[1])*cl(t[1]));b.c.push(c,c,c);}
    b.ix.push(s,s+1,s+2,s,s+2,s+3);b.vc+=4;}}
function crEaselMesh(bufs,lx,y,lz,d,gb,ch,be){const b=bufs.cut,f=be&&be.t==='crease'&&be.f>=0&&be.f<4?be.f:0,u=1/16;
  const wood=Tl.cr_easel_t,cv=Tl.cr_canvas,back=Tl.cr_c1b,WD={front:wood,back:wood,side:wood,top:wood};
  crEaselBox(b,lx,y,lz,f,3*u,4.5*u,0,15*u,9*u,10.5*u,WD);              /* front legs */
  crEaselBox(b,lx,y,lz,f,11.5*u,13*u,0,15*u,9*u,10.5*u,WD);
  crEaselBox(b,lx,y,lz,f,7.25*u,8.75*u,0,13.5*u,1*u,2.5*u,WD);         /* back leg */
  crEaselBox(b,lx,y,lz,f,7.25*u,8.75*u,7.5*u,8.5*u,2.5*u,9*u,WD);      /* brace */
  crEaselBox(b,lx,y,lz,f,4.5*u,11.5*u,13.5*u,14.75*u,9*u,10.5*u,WD);   /* top bar */
  crEaselBox(b,lx,y,lz,f,2*u,14*u,5*u,6*u,9*u,13*u,WD);                /* ledge */
  const B4=crEaselBoard(be);
  crEaselBox(b,lx,y,lz,f,B4[0],B4[1],B4[2],B4[3],CRP_BOARD_D[0],CRP_BOARD_D[1],{front:cv,back,side:cv,top:cv});
  crEaselBox(b,lx,y,lz,f,7*u,9*u,B4[3],B4[3]+u,10*u,12*u,WD);          /* the clamp on top of the canvas */
  return true;}
/* ---- painting cells (CRREG.mesh.paint): nothing in the chunk mesh; the art mesh is the painting ---- */
function crPaintMesh(bufs,lx,y,lz,d,gb,ch,be){return !!(be&&crWorkN(be.id));}   /* a cell whose work has no record (a downgraded save): c0's blank canvas */
/* ---- art meshes ---- */
function crArtHR(){return typeof TP!=='undefined'&&!!TP&&!!TP.hr&&Array.isArray(TP.live)&&TP.live.some(m=>m&&m.name==='world');}
function crPaintShade(f){return crArtHR()?1:(f<2?0.8:0.65);}
/* texture filtering (fix lead, v6.2 review). OG: nearest, no mipmaps, like its world (unchanged). Hyperreal, whose world is
   mipmapped, anisotropic and smooth: nearest magnification put pixels of uneven width on screen at every non-integer scale (a 1-pixel
   checker turned into plaid from ~10 blocks) and aliased into moire once minified (32 px per block, twice the world's density).
   So under Hyperreal (WebGL2) a painting samples "sharp bilinear": the four nearest pixels are fetched, decoded to linear (the sRGB
   decode Hyperreal applies to every map) and blended only across a pixel edge, over ONE screen pixel: crisp at any zoom, no pixels of
   uneven width, no darkening from filtering in gamma space. Once a pixel is smaller than a screen pixel it hands over to the linear
   mipmaps + anisotropy. This replaces <map_fragment> whole (Hyperreal's own replacement of it then finds nothing to do).
   Without WebGL2: nearest magnification + nearest-mipmap-linear. All three canvas sizes are powers of two. */
const CRP_SHARP=['{ vec2 crTs=vec2(textureSize(map,0)),crP=vUv*crTs-0.5,crI=floor(crP),crW=max(fwidth(crP),vec2(1e-4));',
  '  vec2 crF=clamp((crP-crI-0.5)/crW+0.5,0.0,1.0);ivec2 crM=ivec2(crTs)-1,crA=clamp(ivec2(crI),ivec2(0),crM),crB=clamp(ivec2(crI)+1,ivec2(0),crM);',
  '  vec4 crS=mix(mix(sRGBToLinear(texelFetch(map,crA,0)),sRGBToLinear(texelFetch(map,ivec2(crB.x,crA.y),0)),crF.x),',
  '    mix(sRGBToLinear(texelFetch(map,ivec2(crA.x,crB.y),0)),sRGBToLinear(texelFetch(map,crB,0)),crF.x),crF.y);',
  '  diffuseColor*=mix(crS,sRGBToLinear(texture(map,vUv)),smoothstep(0.75,1.25,max(crW.x,crW.y))); }'].join('\n');
function crArtSharpObc(sh){sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>',()=>CRP_SHARP);}
function crArtSharpKey(){return 'crsharp1';}
function crArtSharpOK(){try{return typeof renderer!=='undefined'&&!!renderer&&!!renderer.capabilities&&!!renderer.capabilities.isWebGL2&&
  THREE.LinearMipmapLinearFilter!==undefined;}catch(e){return false;}}
function crArtFilt(t,hr){const sharp=hr&&crArtSharpOK(),mm=sharp||(hr&&THREE.NearestMipmapLinearFilter!==undefined);
  t.magFilter=sharp?THREE.LinearFilter:THREE.NearestFilter;
  t.minFilter=sharp?THREE.LinearMipmapLinearFilter:mm?THREE.NearestMipmapLinearFilter:THREE.NearestFilter;t.generateMipmaps=mm;
  let an=1;if(mm)try{const Q=typeof tpQ==='function'?tpQ():null,cap=typeof renderer!=='undefined'&&renderer&&renderer.capabilities&&renderer.capabilities.getMaxAnisotropy?renderer.capabilities.getMaxAnisotropy():1;
    an=Math.max(1,Math.min((Q&&Q.aniso)||1,cap||1));}catch(e){an=1;}
  t.anisotropy=an;t.needsUpdate=true;}
/* the art material: a plain Lambert in OG (unchanged). Under Hyperreal a matte MeshStandardMaterial (roughness 1, metalness 0, the
   world's own BRDF) with the sharp-bilinear sampling: r128's Lambert multiplies ALL its direct light by the product of every shadow
   map, so at Ultra (the nearest torch / lava light casts a cube shadow) a painting went ambient-only whenever that light was occluded,
   even in full sun; Standard applies each light's shadow to that light alone (v6.2 review, measured: Ultra 0.79 -> 1.21 of the white
   wool next to it, the same as every other quality). A pack switch swaps in a NEW material: Hyperreal adopts unseen materials by
   itself, wrapping our onBeforeCompile, so the order of the switch never matters. */
function crArtMat(tex,sh,hr){const o={map:tex,color:new THREE.Color(sh,sh,sh),side:THREE.DoubleSide};
  if(!hr||typeof THREE.MeshStandardMaterial!=='function')return new THREE.MeshLambertMaterial(o);
  const m=new THREE.MeshStandardMaterial(Object.assign(o,{roughness:1,metalness:0}));
  if(crArtSharpOK()){m.onBeforeCompile=crArtSharpObc;m.customProgramCacheKey=crArtSharpKey;}return m;}
/* a quad list in local space (the art plane is z = 0, normal +z, centred) -> BufferGeometry */
function crPaintQuads(Q){const p=[],n=[],uv=[],ix=[];let v=0;
  for(const q of Q){for(let i=0;i<4;i++){p.push(q.p[i][0],q.p[i][1],q.p[i][2]);n.push(q.n[0],q.n[1],q.n[2]);uv.push(q.uv[i][0],q.uv[i][1]);}
    ix.push(v,v+1,v+2,v,v+2,v+3);v+=4;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);
  if(typeof g.computeBoundingSphere==='function')g.computeBoundingSphere();return g;}
/* the hung painting: the art plane + four thin edges back to the wall (a stretched canvas: the sides show the edge pixels) */
function crPaintGeo(w,h,W,H,depth){const x=w/2,y=h/2,D=depth||0,u0=0.5/W,u1=1-0.5/W,v0=0.5/H,v1=1-0.5/H;
  const Q=[{n:[0,0,1],p:[[-x,-y,0],[x,-y,0],[x,y,0],[-x,y,0]],uv:[[0,0],[1,0],[1,1],[0,1]]}];
  if(D>0)Q.push({n:[0,1,0],p:[[-x,y,0],[x,y,0],[x,y,-D],[-x,y,-D]],uv:[[0,v1],[1,v1],[1,v1],[0,v1]]},
    {n:[0,-1,0],p:[[-x,-y,-D],[x,-y,-D],[x,-y,0],[-x,-y,0]],uv:[[0,v0],[1,v0],[1,v0],[0,v0]]},
    {n:[-1,0,0],p:[[-x,-y,-D],[-x,-y,0],[-x,y,0],[-x,y,-D]],uv:[[u0,0],[u0,0],[u0,1],[u0,1]]},
    {n:[1,0,0],p:[[x,-y,0],[x,-y,-D],[x,y,-D],[x,y,0]],uv:[[u1,0],[u1,0],[u1,1],[u1,1]]});
  return crPaintQuads(Q);}
/* where a mesh goes: {x,y,z,nx,nz,f,w,h} for a wall painting (crPaintGeom) or an easel's board front */
function crArtPlace(k,be){if(be.t==='crpaint'){const g=crPaintGeom(be);return {x:g.x,y:g.y,z:g.z,nx:g.nx,nz:g.nz,f:be.f,w:be.w,h:be.h,D:0.028};}
  const p=keyCore(k).split(',').map(Number),f=be.f>=0&&be.f<4?be.f:0,n=CRC.FN[f],r=crRight(f),B4=crEaselBoard(be),ac=(B4[0]+B4[1])/2,dz=CRP_BOARD_D[1]+0.005;
  return {x:p[0]+0.5+(ac-0.5)*r[0]+(dz-0.5)*n[0],y:p[1]+(B4[2]+B4[3])/2,z:p[2]+0.5+(ac-0.5)*r[1]+(dz-0.5)*n[1],nx:n[0],nz:n[1],f,w:B4[1]-B4[0],h:B4[3]-B4[2],D:0};}
function crArtPaintTex(e,r){const px=crArtDecode(r.d,r.w,r.h);crArtDraw(e.g,px,r.w,r.h,0,0,true);e.tex.needsUpdate=true;e.u=r.u;e.t=CRF.clock;}
function crArtMake(k,be){if(typeof scene==='undefined'||!scene)return null;const r=crRec(crWorkN(be.id));if(!r||r.k!=='art'||!crArtOkSize(r.w,r.h))return null;
  const pl=crArtPlace(k,be),cv=document.createElement('canvas');cv.width=r.w;cv.height=r.h;
  const tex=new THREE.CanvasTexture(cv),hr=crArtHR();crArtFilt(tex,hr);
  const sh=crPaintShade(pl.f),mat=crArtMat(tex,sh,hr);
  const geo=crPaintGeo(pl.w,pl.h,r.w,r.h,pl.D),m=new THREE.Mesh(geo,mat);
  m.position.set(pl.x,pl.y,pl.z);m.rotation.y=Math.atan2(pl.nx,pl.nz);m.name='crArt';m.userData.crk=k;
  const e={m,geo,mat,tex,cv,g:cv.getContext('2d'),be,id:be.id,u:-1,t:0,f:pl.f,sh,hr,kind:be.t==='crpaint'?'wall':'easel'};
  crArtPaintTex(e,r);scene.add(m);if(typeof shadowify==='function')try{shadowify(m);}catch(err){}
  m.castShadow=false;     /* 0.03 off the wall it needs no shadow, and casting one onto itself striped it (shadow acne); it still receives */
  CRPM.set(k,e);return e;}
function crArtDrop(k){const e=CRPM.get(k);if(!e)return;CRPM.delete(k);
  try{if(e.m.parent)e.m.parent.remove(e.m);else if(typeof scene!=='undefined'&&scene)scene.remove(e.m);}catch(err){}
  try{e.geo.dispose();e.mat.dispose();e.tex.dispose();}catch(err){}}
function crArtDropAll(){for(const k of [...CRPM.keys()])crArtDrop(k);}
function crArtScan(){const want=new Map(),R=(RD+1)*CH,R2=R*R;
  for(const [k,be] of CRBE){if(keyDim(k)!==DIM||blockEnts.get(k)!==be)continue;
    const p=keyCore(k).split(',').map(Number);
    if(be.t==='crease'){const id=be.id||0;if((CRPS.easel.get(k)||0)!==id){CRPS.easel.set(k,id);const ch=chunkAt(p[0],p[2]);if(ch)ch.dirty=true;}}
    if(!(be.t==='crease'||(be.t==='crpaint'&&be.i===0&&be.j===0))||!crWorkN(be.id))continue;
    if(!chunkAt(p[0],p[2]))continue;
    const dx=p[0]+0.5-P.x,dz=p[2]+0.5-P.z;if(dx*dx+dz*dz>R2)continue;
    want.set(k,be);}
  for(const k of CRPS.easel.keys())if(!CRBE.has(k))CRPS.easel.delete(k);
  for(const [k,e] of [...CRPM])if(want.get(k)!==e.be||e.be.id!==e.id)crArtDrop(k);
  for(const [k,be] of want)if(!CRPM.has(k))crArtMake(k,be);}
function crArtTick(dt){if(!P)return;
  if((CRPS.scanT-=dt)<=0||CRPS.dirty){CRPS.scanT=0.5;CRPS.dirty=false;crArtScan();}
  const hr=crArtHR();
  for(const e of CRPM.values()){const sh=hr?1:(e.f<2?0.8:0.65);if(sh!==e.sh){e.sh=sh;e.mat.color.setRGB(sh,sh,sh);}
    if(e.m.castShadow)e.m.castShadow=false;           /* applyShadows / Hyperreal's shadow walk set every mesh: never this one */
    if(e.hr!==hr){e.hr=hr;crArtFilt(e.tex,hr);const old=e.mat;e.mat=crArtMat(e.tex,sh,hr);e.m.material=e.mat;e.sh=sh;try{old.dispose();}catch(err){}}
    if(e.kind==='easel'){const r=crRec(crWorkN(e.id));if(r&&r.u!==e.u&&CRF.clock-e.t>=0.25)crArtPaintTex(e,r);}}}
function crArtReset(){crArtDropAll();CRPS.easel.clear();CRPS.dirty=true;CRPS.scanT=0;}
CRREG.mesh.easel=crEaselMesh;CRREG.mesh.paint=crPaintMesh;
CRREG.tick.push(crArtTick);
CRREG.onReset.push(crArtReset);
CRREG.onDim.push(()=>{crArtDropAll();CRPS.dirty=true;});
CRREG.onLoad.push(()=>{CRPS.dirty=true;});
CRREG.onBE.push((k,be,op)=>{CRPS.dirty=true;if(op==='del')crArtDrop(k);});
CRREG.onWork.push((n,r,op)=>{if(op!=='edit')CRPS.dirty=true;});
Object.assign(CREX,{crEaselMesh,crPaintMesh,crArtTick,crArtReset,crEaselBoard,crPaintShade,crArtScan,crArtHR,crArtFilt,crArtMat,crArtSharpObc,crArtSharpOK,CRP_SHARP,getCRPM:()=>CRPM,getCRPS:()=>CRPS});
