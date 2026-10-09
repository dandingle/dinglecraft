/* ---- PART 54: tA_assets.js ---- */
/* tA_assets.js (Package A): the embedded Hyperreal art (hrassets.js) -> images -> two DataTexture2DArray + an ATLAS²x1 LUT.
   hrassets.js holds only function declarations (hrAssets, hrAssetMeta), appended after game.js; node suites load it as globals.
   Layout (pack_assets.py): t:<tile>|c albedo RGB; t:<tile>|n three stacked grey planes (normal X / normal Y / roughness,
   width px, height 3px); t:<tile>|m (alpha, emissive mask, 0), only when the tile has either; e:<id>|b|n|r entity maps (C).
   Nothing here runs at load: no THREE constructors, no Image, no timers until prepare(). */
var TPA={meta:null,img:{},lut:null,lutData:null,loading:null,cv:null,cg:null,unknown:0,built:0,decode:null};
function tpAssetTable(){try{return typeof hrAssets==='function'?hrAssets():null;}catch(e){return null;}}
function tpAssetMeta(){if(TPA.meta)return TPA.meta;let m=null;
  try{m=typeof hrAssetMeta==='function'?hrAssetMeta():null;}catch(e){m=null;}
  if(!m||m.v!==1||!Array.isArray(m.tiles))m={v:1,profile:'none',tiles:[],ents:[]};
  return TPA.meta=m;}
function tpAssetURL(key){const T=tpAssetTable(),v=T&&T[key];return typeof v==='string'&&v.length?v:null;}
/* a blob: URL for an embedded asset (decodes in parallel, ~6x faster than data: URIs; no fetch). null if unavailable. */
function tpBlobURL(key){const u=tpAssetURL(key);
  if(!u||typeof Blob!=='function'||typeof URL==='undefined'||!URL.createObjectURL||typeof atob!=='function')return u;
  const i=u.indexOf(','),b=atob(u.slice(i+1)),a=new Uint8Array(b.length);for(let k=0;k<b.length;k++)a[k]=b.charCodeAt(k);
  return URL.createObjectURL(new Blob([a],{type:u.slice(5,u.indexOf(';'))}));}
/* cached Promise<HTMLImageElement|null>; C reuses it for e: keys. Resolves null (never rejects) for a missing key or a bad image. */
function tpImage(key){if(TPA.img[key])return TPA.img[key];
  const p=(typeof Image==='undefined'||!tpAssetURL(key))?Promise.resolve(null):new Promise(res=>{const im=new Image();let done=false;
    const fin=v=>{if(!done){done=true;res(v);}};
    const url=tpBlobURL(key);if(url&&url.startsWith('blob:'))(TPA.url||(TPA.url={}))[key]=url;
    im.onload=()=>fin(im);im.onerror=()=>fin(null);im.src=url;
    if(im.decode)im.decode().then(()=>fin(im),()=>{});});      /* a decode() rejection leaves it to onload/onerror */
  return TPA.img[key]=p;}
function tpImageFree(key){delete TPA.img[key];const u=TPA.url&&TPA.url[key];if(u){delete TPA.url[key];try{URL.revokeObjectURL(u);}catch(e){}}}
/* TEST SEAM: (key,w,h) -> Promise<RGBA bytes (w*h*4)|null>. Default: draw the decoded image into one reusable canvas. */
TPA.decode=async function(key,w,h){const im=await tpImage(key);if(!im)return null;
  let cv=TPA.cv;if(!cv)cv=TPA.cv=document.createElement('canvas');
  if(cv.width!==w)cv.width=w;if(cv.height!==h)cv.height=h;      /* resizing resets the context state, so set it every time */
  const g=TPA.cg||(TPA.cg=cv.getContext('2d',{willReadFrequently:true}));
  g.globalCompositeOperation='copy';g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(im,0,0,w,h);return g.getImageData(0,0,w,h).data;};
function tpArtTiles(){return tpAssetMeta().tiles.filter(t=>t.img);}
/* yield one task: a MessageChannel message is not clamped like setTimeout in hidden tabs (1 s+), and the page still renders */
function tpYield(){return new Promise(r=>{if(typeof MessageChannel==='function'){const ch=new MessageChannel();
  ch.port1.onmessage=()=>{ch.port1.close();r();};ch.port2.postMessage(0);}else setTimeout(r,0);});}
/* the pixel loop is split out so tests can check the packing without a canvas */
function tpPackLayer(alb,nr,o,S,c,n,m){for(let j=0,s=0,q=o;j<S;j++,s+=4,q+=4){
  if(c){alb[q]=c[s];alb[q+1]=c[s+1];alb[q+2]=c[s+2];}else{alb[q]=alb[q+1]=alb[q+2]=128;}
  alb[q+3]=m?m[s]:255;
  if(n){nr[q]=n[s];nr[q+1]=n[S*4+s];nr[q+2]=n[S*8+s];}else{nr[q]=nr[q+1]=128;nr[q+2]=217;}
  nr[q+3]=m?m[s+1]:0;}}
/* async: decode every art tile at px and build the two arrays (albedo+alpha; normal XY + roughness + emissive mask).
   Yields every 4 layers and reports progress(0..1). Returns {alb,nr,px,aniso,layers}. Never touches the scene. */
async function tpBuildArrays(px,aniso,progress){
  const L=tpArtTiles(),n=L.length,S=px*px;
  if(!n)throw new Error('world: no Hyperreal art in this build');
  const alb=new Uint8Array(S*4*n),nr=new Uint8Array(S*4*n);
  TPA.loading=0;
  const K=6;                                                  /* tiles decoded in parallel per batch (~18 images in flight) */
  try{for(let i0=0;i0<n;i0+=K){const batch=L.slice(i0,i0+K);
      const got=await Promise.all(batch.map(t=>{const b='t:'+t.n+'|';
        return Promise.all([TPA.decode(b+'c',px,px),TPA.decode(b+'n',px,px*3),t.mask?TPA.decode(b+'m',px,px):null]);}));
      batch.forEach((t,j)=>{const g=got[j],b='t:'+t.n+'|';tpPackLayer(alb,nr,(i0+j)*S*4,S,g[0],g[1],g[2]);
        tpImageFree(b+'c');tpImageFree(b+'n');tpImageFree(b+'m');});   /* tile images are single-use: free them */
      TPA.loading=Math.min(n,i0+K)/n;if(progress)try{progress(TPA.loading);}catch(e){}
      await tpYield();}}
  finally{TPA.loading=null;}
  const mk=d=>{const T=new THREE.DataTexture2DArray(d,px,px,n);
    T.format=THREE.RGBAFormat;T.type=THREE.UnsignedByteType;T.minFilter=THREE.LinearMipmapLinearFilter;T.magFilter=THREE.LinearFilter;
    T.generateMipmaps=true;T.wrapS=T.wrapT=THREE.RepeatWrapping;T.anisotropy=aniso;T.flipY=false;T.unpackAlignment=4;
    T.onUpdate=()=>{if(T.image)T.image.data=null;};          /* uploaded once: drop the CPU copy (context loss rebuilds) */
    T.needsUpdate=true;return T;};
  TPA.built++;
  return {alb:mk(alb),nr:mk(nr),px,aniso,layers:n};}
/* LUT row bits (G): 0-1 rotation (0 none, 1 top/bottom only, 2 all), 2 mirror, 3 scroll, 4 up-normal, 5 force opaque, 6 water */
function tpLutFlags(t){return (t.rot&3)|(t.mirror?4:0)|(t.scroll?8:0)|(t.up?16:0)|(t.opaque?32:0)|(t.water?64:0);}
/* ATLAS² rows (1024 at ATLAS 32) x RGBA by OG tile index (Tl, so atlas order never matters):
   R layer (255 = not in the pack: the shader samples the OG atlas texel), G flags, B emissive*255/8, A normal strength*255/2 */
function tpLutBytes(){const meta=tpAssetMeta(),d=new Uint8Array(ATLAS*ATLAS*4);
  for(let i=0;i<ATLAS*ATLAS;i++)d[i*4]=255;
  let layer=0,unknown=0;
  for(const t of meta.tiles){const L=t.img?layer++:255,i=Tl[t.n];
    if(i===undefined||i>=ATLAS*ATLAS){unknown++;continue;}
    d[i*4]=L;d[i*4+1]=tpLutFlags(t);
    d[i*4+2]=Math.round(Math.max(0,Math.min(8,+t.em||0))*255/8);d[i*4+3]=Math.round(Math.max(0,Math.min(2,t.ns===undefined?1:+t.ns))*255/2);}
  /* plants and torches are lit like the ground whatever the manifest says (covers every future cross tile) */
  for(const id in DEFS){const dd=DEFS[id];if(dd&&!dd.item&&dd._t&&(dd.cross||dd.wt)&&dd._t.side<ATLAS*ATLAS)d[dd._t.side*4+1]|=16;}
  TPA.unknown=unknown;
  if(unknown&&typeof console!=='undefined')console.log('[TP] '+unknown+' Hyperreal tile name(s) not in this atlas');
  return d;}
function tpBuildLut(){const d=tpLutBytes();TPA.lutData=d;
  const T=new THREE.DataTexture(d,ATLAS*ATLAS,1,THREE.RGBAFormat);T.type=THREE.UnsignedByteType;
  T.magFilter=T.minFilter=THREE.NearestFilter;T.generateMipmaps=false;T.flipY=false;T.needsUpdate=true;
  return TPA.lut=T;}
function tpLutRow(name){const i=Tl[name];if(i===undefined)return null;const d=TPA.lutData||tpLutBytes(),o=i*4;
  return {tile:i,layer:d[o]===255?-1:d[o],flags:d[o+1],rot:d[o+1]&3,mirror:!!(d[o+1]&4),scroll:!!(d[o+1]&8),up:!!(d[o+1]&16),
    opaque:!!(d[o+1]&32),water:!!(d[o+1]&64),em:d[o+2]*8/255,ns:d[o+3]*2/255};}
/* counts only (never list tile names in toasts/logs) */
function tpCoverage(){const meta=tpAssetMeta(),art=new Set(meta.tiles.filter(t=>t.img).map(t=>t.n));
  const used=new Set();for(const id in DEFS){const d=DEFS[id];if(!d||d.item||!d.tiles)continue;
    const t=d.tiles;for(const n of (typeof t==='string'?[t]:[t.top,t.side,t.bot]))used.add(n);}
  for(const n of ['bed_s','door_l','door_u'])if(Tl[n]!==undefined)used.add(n);   /* drawn by special meshers, not DEFS.tiles */
  let withArt=0;for(const n of used)if(art.has(n))withArt++;
  return {profile:meta.profile,blockPx:meta.blockPx||0,layers:art.size,ents:(meta.ents||[]).length,
    blockTiles:used.size,blockTilesWithArt:withArt,blockTilesOG:used.size-withArt,
    notInAtlas:meta.tiles.filter(t=>Tl[t.n]===undefined).length};}
