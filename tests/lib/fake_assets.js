/* fake_assets.js (Package A): a tiny stand-in for the generated hrassets.js, for headless suites.
   Three art tiles (grass_top rotated + mirrored, leaf_o with an alpha mask, lava emissive/opaque/scrolling) and one
   fallback-only tile (fl_corn, up). afterBoot replaces TPA.decode with patterned buffers, so the array packing can be
   checked byte by byte: albedo = (10+layer, 20, 30), normal planes = (100, 150, 200), mask = (77, 33). */
'use strict';
const tile=(n,o)=>Object.assign({n,rot:0,mirror:0,ns:1.3,rough:1,em:0,up:0,scroll:0,water:0,opaque:0,img:1,mask:0},o);
const META={v:1,profile:'fake',blockPx:64,nLayout:'stack3',gen:'fake_assets',ents:['face_dan'],bytes:0,tiles:[
  tile('fl_corn',{up:1,img:0}),
  tile('grass_top',{rot:2,mirror:1}),
  tile('lava',{em:3,scroll:1,opaque:1,mask:1}),
  tile('leaf_o',{rot:2,mirror:1,mask:1})]};
const W='data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
const T={};for(const t of META.tiles)if(t.img){T['t:'+t.n+'|c']=W;T['t:'+t.n+'|n']=W;if(t.mask)T['t:'+t.n+'|m']=W;}
T['e:face_dan|b']=W;T['e:face_dan|n']=W;
global.hrAssetMeta=()=>JSON.parse(JSON.stringify(META));
global.hrAssets=()=>T;
const calls=[];
function afterBoot(V){const order=META.tiles.filter(t=>t.img).map(t=>t.n);
  V.getTPA().decode=async(key,w,h)=>{calls.push([key,w,h]);
    const d=new Uint8ClampedArray(w*h*4),m=/^t:(\w+)\|(\w)$/.exec(key),L=m?order.indexOf(m[1]):-1,S=w*w;
    for(let i=0;i<w*h;i++){const o=i*4;
      if(m&&m[2]==='c'){d[o]=10+L;d[o+1]=20;d[o+2]=30;}
      else if(m&&m[2]==='n'){d[o]=i<S?100:(i<2*S?150:200);d[o+1]=d[o];d[o+2]=d[o];}
      else if(m&&m[2]==='m'){d[o]=77;d[o+1]=33;}
      d[o+3]=255;}
    return d;};}
module.exports={afterBoot,META,calls};
