/* tA_static.js (Package A): statics for the Hyperreal world. No world is started.
   - the shader's tile index / local UV maths (float32) over all 1024 tileUV slots (ATLAS 32 since v6.1), against the game's own tileUV
   - LUT flag encoding round trip; hrHashJS against an independent BigInt reference; hrRotJS statistics
   - every manifest tile name exists in the atlas (count only)
   - the shader patch applies to r128's meshphysical / depth include lists; perturbNormal2Arb extraction
   - the built hrassets.js: ASCII, no <, WebP data URIs, size cap, coverage, the assembled packs vs their committed manifests
     (split repo: assets/packed/ + assets/pack-inputs/; the source art is not in git: set DC_ART_SRC to re-hash it with pack_assets --check) */
'use strict';
const boot=require('../lib/hr_boot.js'),{ok}=boot;
const fs=require('fs'),path=require('path'),cp=require('child_process');
const V=boot({stubs:['A'],assets:'built'});
const GDIR=boot.SRC.tex,ROOT=boot.ROOT,PI=boot.P.PACK_INPUTS,PK=boot.P.PACKED;
const f32=Math.fround;

boot.run(async()=>{
  /* ---- tile index + local UV, as the vertex shader computes them (float32) ---- */
  const G=fs.readFileSync(boot.BUILD+'game.js','utf8');
  ok('the game still builds tile UVs the way the shader assumes',
    G.includes('function tileUV(i){const tx=i%ATLAS,ty=(i/ATLAS)|0,e=.5/ATPX;\n  return[tx/ATLAS+e,1-(ty+1)/ATLAS+e,(tx+1)/ATLAS-e,1-ty/ATLAS-e];}')&&G.includes('const ATLAS=32, TPX=16, ATPX=ATLAS*TPX;'));
  const tileUV=i=>{const tx=i%32,ty=(i/32)|0,e=.5/512;return[tx/32+e,1-(ty+1)/32+e,(tx+1)/32-e,1-ty/32-e];};
  let badIdx=0,badL=0;
  for(let i=0;i<1024;i++){const U=tileUV(i);
    for(const [u,v,lx,ly] of [[U[0],U[1],0,0],[U[2],U[1],1,0],[U[2],U[3],1,1],[U[0],U[3],0,1]]){
      const uu=f32(u),vv=f32(v),Tx=Math.floor(f32(uu*32)),Ty=Math.floor(f32(vv*32));
      const ti=Math.min(31,Math.max(0,Tx))+(31-Math.min(31,Math.max(0,Ty)))*32;
      const Lx=f32(f32(f32(uu*32)-Tx-.03125)*f32(16/15)),Ly=f32(f32(f32(vv*32)-Ty-.03125)*f32(16/15));
      if(ti!==i)badIdx++;if(Math.abs(Lx-lx)>1e-4||Math.abs(Ly-ly)>1e-4)badL++;}}
  ok('tile index from uv is exact at every corner of all 1024 slots',badIdx===0);
  ok('local UV is 0 or 1 (within 1e-4) at every corner of all 1024 slots',badL===0);

  /* ---- LUT flags ---- */
  let rt=true;
  for(let b=0;b<128;b++){const t={rot:b&3,mirror:(b>>2)&1,scroll:(b>>3)&1,up:(b>>4)&1,opaque:(b>>5)&1,water:(b>>6)&1};
    if((b&3)===3)continue;
    const fl=(t.rot&3)|(t.mirror?4:0)|(t.scroll?8:0)|(t.up?16:0)|(t.opaque?32:0)|(t.water?64:0);
    if(fl!==b)rt=false;}
  ok('LUT flag bits round-trip (rot 0-1, mirror 2, scroll 3, up 4, opaque 5, water 6)',rt);
  const lut=V.tpLutBytes();
  ok('LUT is ATLAS*ATLAS = 1024 RGBA rows (4096 bytes)',lut.length===4096);
  ok('the HR vertex shader derives every atlas size from ATLAS (no stale 16./15. tile maths)',
    G.includes('vec2 hT=floor(uv*${ATLAS}.); int hI=int(clamp(hT.x,0.,${ATLAS-1}.)+(${ATLAS-1}.-clamp(hT.y,0.,${ATLAS-1}.))*${ATLAS}.);')&&
    G.includes('vec2 hL=(uv*${ATLAS}.-hT-.03125)*(16./15.);')&&!G.includes('floor(uv*16.)'));
  const meta=V.tpAssetMeta(),art=meta.tiles.filter(t=>t.img);
  const gt=V.tpLutRow('grass_top'),st=V.tpLutRow('stone'),gs=V.tpLutRow('grass_side');
  if(meta.profile!=='none'){
    ok('grass_top: an art layer, rotated on all faces, mirrored',gt.layer>=0&&gt.rot===2&&gt.mirror&&gt.ns>1.2);
    ok('grass_side: directional art, never rotated',gs.layer>=0&&gs.rot===0&&!gs.mirror);
    ok('stone: rotated (diorama rule)',st.rot===2);
    const lv=V.tpLutRow('lava'),wa=V.tpLutRow('water'),gl=V.tpLutRow('glowstone'),to=V.tpLutRow('torch');
    ok('lava: opaque, scrolling, emissive ~2.5 (luminance mask: dim crust, bright melt)',lv.opaque&&lv.scroll&&Math.abs(lv.em-2.5)<.05);
    ok('water: water shading + scroll',wa.water&&wa.scroll&&!wa.opaque);
    ok('glowstone and torch glow',gl.em>1.9&&to.em>3.9);
    ok('log_top rotates on top/bottom only; planks/brick/bark never rotate or mirror',V.tpLutRow('log_top').rot===1&&
      ['plank_o','plank_b','plank_s','brick','log_o','log_b','log_s','stonebrick','cobble'].every(n=>{const r=V.tpLutRow(n);return r.rot===0&&!r.mirror;}));
    const stub2=String(V.pgStubs||'').indexOf('2')>=0;   /* PZ: with P2 on its stub (DC_PG_STUB=2) the pg_* tiles have no atlas row */
    const rows=art.map((t,i)=>({i,r:V.tpLutRow(t.n),pg:/^pg_/.test(t.n)})).filter(q=>!(stub2&&q.pg&&!q.r));
    ok('art layers are 0..'+(art.length-1)+' in manifest order'+(stub2?' (pg_* skipped: P2 on its stub)':''),rows.every(q=>q.r&&q.r.layer===q.i));
  }
  const fl=V.tpLutRow('fl_corn'),tch=V.tpLutRow('tallgrass');
  ok('fallback-only plants: OG pixels (layer -1), lit like the ground',fl&&fl.layer===-1&&fl.up&&tch.up);
  const rail=V.tpLutRow('rail');
  ok('a tile with no Hyperreal entry stays OG: layer -1, no flags',rail&&rail.layer===-1&&rail.flags===0&&rail.em===0);

  /* ---- hash + rotation ---- */
  const ref=(x,y,z)=>{const M=2n**32n,u=v=>BigInt.asUintN(32,BigInt(v));
    let h=((u(x)*374761393n)%M)^((u(y)*2246822519n)%M)^((u(z)*668265263n)%M);h=((h^(h>>13n))*1274126177n)%M;h^=h>>16n;return Number(h);};
  let hashOK=true;
  for(let i=0;i<2000;i++){const x=((i*7919)%4001)-2000,y=(i*31)%128,z=((i*104729)%6007)-3000;
    if(V.hrHashJS(x,y,z)!==f32(ref(x,y,z))/4294967296)hashOK=false;}
  ok('hrHashJS matches a BigInt reference, negative coordinates included',hashOK);
  const cnt=[0,0,0,0];let mir=0,none=0,tbSide=0,det=true;
  for(let i=0;i<10000;i++){const x=(i%100)-50,z=((i/100)|0)-50,y=40+(i%7);
    const r=V.hrRotJS(x,y,z,0,2|4);cnt[r&3]++;if(r>3)mir++;if(r!==V.hrRotJS(x,y,z,0,2|4))det=false;
    if(V.hrRotJS(x,y,z,2,0)!==-1)none++;const s=V.hrRotJS(x,y,z,3,1);if(s!==0)tbSide++;}
  ok('hrRotJS is deterministic',det);
  ok('quarter turns are ~25% each over 10^4 blocks ('+cnt.map(c=>(c/100).toFixed(1)).join('/')+'%)',cnt.every(c=>c>2250&&c<2750));
  ok('mirroring is ~50% ('+(mir/100).toFixed(1)+'%)',mir>4500&&mir<5500);
  ok('rot none: no rotation',none===0);
  ok('rot tb: side faces stay upright',tbSide===0);

  /* ---- manifest names exist in the atlas ---- */
  const man=JSON.parse(fs.readFileSync(PI+'hr_tiles.json','utf8'));
  const artJ=JSON.parse(fs.readFileSync(PI+'tiles.json','utf8'));
  const names=[...new Set([...Object.keys(man.tiles),...Object.keys(artJ)].map(n=>man.aliases[n]||n))];
  const missing=names.filter(n=>V.tpLutRow(n)===null).length;
  ok('every manifest tile name ('+names.length+') exists in the atlas ('+missing+' missing)',missing===0);

  /* ---- shader patch vs r128's include lists (taken from the real r128 ShaderLib) ---- */
  const VI='common uv_pars_vertex displacementmap_pars_vertex color_pars_vertex fog_pars_vertex morphtarget_pars_vertex skinning_pars_vertex shadowmap_pars_vertex logdepthbuf_pars_vertex clipping_planes_pars_vertex uv_vertex color_vertex beginnormal_vertex morphnormal_vertex skinbase_vertex skinnormal_vertex defaultnormal_vertex begin_vertex morphtarget_vertex skinning_vertex displacementmap_vertex project_vertex logdepthbuf_vertex clipping_planes_vertex worldpos_vertex shadowmap_vertex fog_vertex';
  const FI='common packing dithering_pars_fragment color_pars_fragment uv_pars_fragment map_pars_fragment alphamap_pars_fragment aomap_pars_fragment lightmap_pars_fragment emissivemap_pars_fragment transmissionmap_pars_fragment bsdfs cube_uv_reflection_fragment envmap_common_pars_fragment envmap_physical_pars_fragment fog_pars_fragment lights_pars_begin lights_physical_pars_fragment shadowmap_pars_fragment bumpmap_pars_fragment normalmap_pars_fragment clearcoat_pars_fragment roughnessmap_pars_fragment metalnessmap_pars_fragment logdepthbuf_pars_fragment clipping_planes_pars_fragment clipping_planes_fragment logdepthbuf_fragment map_fragment color_fragment alphamap_fragment alphatest_fragment roughnessmap_fragment metalnessmap_fragment normal_fragment_begin normal_fragment_maps clearcoat_normal_fragment_begin clearcoat_normal_fragment_maps emissivemap_fragment transmissionmap_fragment lights_physical_fragment lights_fragment_begin lights_fragment_maps lights_fragment_end aomap_fragment tonemapping_fragment encodings_fragment fog_fragment premultiplied_alpha_fragment dithering_fragment';
  const DV='common uv_pars_vertex displacementmap_pars_vertex morphtarget_pars_vertex skinning_pars_vertex logdepthbuf_pars_vertex clipping_planes_pars_vertex uv_vertex skinbase_vertex beginnormal_vertex morphnormal_vertex skinnormal_vertex begin_vertex morphtarget_vertex skinning_vertex displacementmap_vertex project_vertex logdepthbuf_vertex clipping_planes_vertex';
  const DF='common packing uv_pars_fragment map_pars_fragment alphamap_pars_fragment logdepthbuf_pars_fragment clipping_planes_pars_fragment clipping_planes_fragment map_fragment alphamap_fragment alphatest_fragment logdepthbuf_fragment';
  const inc=s=>s.split(' ').map(n=>'#include <'+n+'>').join('\n');
  const sh={uniforms:{},vertexShader:'void main(){\n'+inc(VI)+'\n}',fragmentShader:'void main(){\n'+inc(FI)+'\n}'};
  let err='';try{V.hrWPatch(sh);}catch(e){err=e.message;}
  ok('hrWPatch applies to r128 meshphysical'+(err?' ('+err+')':''),!err);
  const fr=sh.fragmentShader,vr=sh.vertexShader;
  ok('patched: map/color/roughness/normal-maps/emissive includes replaced, aomap kept + AO block',
    !/#include <(map_fragment|color_fragment|roughnessmap_fragment|normal_fragment_maps|emissivemap_fragment)>/.test(fr)&&fr.includes('#include <aomap_fragment>\n')&&fr.includes('#ifdef HR_AO'));
  ok('patched: tone mapping and encodings untouched (B owns the renderer state)',fr.includes('#include <tonemapping_fragment>')&&fr.includes('#include <encodings_fragment>'));
  ok('patched: sampler arrays are highp, LUT fetched per vertex',fr.includes('uniform highp sampler2DArray hrAlb')&&vr.includes('texelFetch(hrLut'));
  ok('patched: opaque blocks remap the art roughness into [hrRoughLo,1] (WP-Z), other buckets keep it',
    /float roughnessFactor=roughness\*hrN\.b;\n#ifdef HR_AO\nroughnessFactor=mix\(hrRoughLo,1\.,roughnessFactor\);\n#endif/.test(fr)&&fr.includes('uniform float hrTime, hrNormalStr, hrRoughLo;'));
  ok('patched: hrPerturb is defined before use',fr.indexOf('vec3 hrPerturb(')>0&&fr.indexOf('vec3 hrPerturb(')<fr.indexOf('hrPerturb(-vViewPosition'));
  ok('uniforms are the shared HRW.U objects (null outside Hyperreal)',Object.keys(sh.uniforms).length===0||'hrLut' in sh.uniforms);
  const ds={uniforms:{},vertexShader:'void main(){\n'+inc(DV)+'\n}',fragmentShader:'void main(){\n'+inc(DF)+'\n}'};
  err='';try{V.hrWPatchDepth(ds);}catch(e){err=e.message;}
  ok('hrWPatchDepth applies to r128 depth'+(err?' ('+err+')':''),!err&&ds.vertexShader.indexOf('texelFetch(hrLut')>ds.vertexShader.indexOf('#include <uv_vertex>'));
  err='';try{V.hrWPatch({uniforms:{},vertexShader:'',fragmentShader:''});}catch(e){err=e.message;}
  ok('a missing anchor throws, naming it',/shader anchor missing: A\./.test(err));
  const P=V.hrWPerturbSrc();
  ok('perturbNormal2Arb extraction: renamed, UV passed in, both vUv.st replaced',/vec3 hrPerturb\([^)]*float faceDirection\s*,\s*vec2 hrStArg\s*\)/.test(P)&&!P.includes('vUv')&&(P.match(/hrStArg/g)||[]).length===3);
  /* no texture fetch or derivative inside a flag branch (flags are per triangle; a pixel quad can straddle two) */
  const src=boot.readSrc(GDIR+'tA_world.js',{legacy:true});
  const lits=(src.match(/const HRW_(MAP|NRM)=`[\s\S]*?`;/g)||[]).join('\n');
  const branchy=lits.split('\n').filter(l=>/^\s*(if|else)\b/.test(l)&&/texture\(|texture2D\(|dFd[xy]\(|hrPerturb\(/.test(l));
  ok('no texture()/derivative calls inside if/else in the fragment patch'+(branchy.length?' ('+branchy[0].trim()+')':''),lits.length>0&&branchy.length===0);

  /* ---- drops ---- */
  const B=V.B;
  ok('tpCubeDrop: stone/glass/leaves yes; torch, flowers, door, bed, rail, ramp no',
    V.tpCubeDrop(B.STONE)&&V.tpCubeDrop(B.GLASS)&&V.tpCubeDrop(B.LEAF_O)&&!V.tpCubeDrop(B.TORCH)&&!V.tpCubeDrop(B.FLOWER_R)&&
    !V.tpCubeDrop(B.BED)&&!V.tpCubeDrop(B.RAIL)&&!V.tpCubeDrop(V.IT.DOOR)&&!V.tpCubeDrop(V.IT.STICK||1000));

  /* ---- the built assets ---- */
  if(meta.profile==='none'){console.log('  note: hrassets.js is the empty stub (pack_assets.py not run): asset checks skipped');return;}
  const A=fs.readFileSync(boot.BUILD+'hrassets.js','latin1');
  const CAP={lite:16e6,std:45e6,ultra:90e6}[meta.profile];
  ok('hrassets.js ('+meta.profile+', '+(A.length/1e6).toFixed(1)+' MB) is within its cap',!!CAP&&A.length<=CAP);
  ok('hrassets.js is ASCII with no <',/^[\x00-\x7f]*$/.test(A)&&A.indexOf('<')<0);
  const T=global.hrAssets(),keys=Object.keys(T);
  let uri=true,magic=true;
  for(const k of keys){const v=T[k];if(!v.startsWith('data:image/webp;base64,')){uri=false;continue;}
    const b=Buffer.from(v.slice(23,23+24),'base64');if(b.toString('latin1',0,4)!=='RIFF'||b.toString('latin1',8,12)!=='WEBP')magic=false;}
  ok('every asset ('+keys.length+') is a WebP data URI',uri&&keys.length>0);
  ok('every asset decodes to RIFF/WEBP magic',magic);
  const known=new Set(names);
  ok('meta tiles are all manifest tiles',meta.tiles.every(t=>known.has(t.n)));
  const want=Object.keys(artJ).map(n=>man.aliases[n]||n);
  const noArt=want.filter(n=>!T['t:'+n+'|c']||!T['t:'+n+'|n']).length;
  ok('every final/tiles.json tile is embedded ('+want.length+' tiles, '+noArt+' missing)',noArt===0);
  ok('mask images exactly where meta says',art.every(t=>!!T['t:'+t.n+'|m']===!!t.mask));
  /* split repo: the source art is not in git. The packer's committed manifest records every entity id it found (coverage.entIds +
     entIdsNotReferenced) and which ones ship a roughness map (sources); with DC_ART_SRC set the real final_ent/ is listed instead. */
  const HM=JSON.parse(fs.readFileSync(PK+'hr/manifest.json','utf8')),mdir=boot.SRC.models,edir=boot.P.ART_SRC?boot.P.ART_SRC+'final_ent/':null;
  const ids=new Set(edir?fs.readdirSync(edir).filter(f=>f.endsWith('_basecolor.png')).map(f=>f.replace('_basecolor.png','')):[...HM.coverage.entIds,...HM.coverage.entIdsNotReferenced]);
  const lit=new Set();for(const f of fs.readdirSync(mdir))if(f.endsWith('.js'))for(const m of fs.readFileSync(mdir+f,'utf8').matchAll(/['"]([a-z][a-z0-9_]*)['"]/g))lit.add(m[1]);
  const refd=[...ids].filter(i=>lit.has(i)),noEnt=refd.filter(i=>!T['e:'+i+'|b']||!T['e:'+i+'|n']).length;
  ok('every entity texture the cast references is embedded ('+refd.length+' ids, '+noEnt+' missing)',noEnt===0);
  ok('entity roughness maps exactly for the 6 mat_* ids that ship one',keys.filter(k=>/^e:.*\|r$/.test(k)).length===[...ids].filter(i=>refd.includes(i)&&(edir?fs.existsSync(edir+i+'_roughness.png'):!!(HM.sources['e:'+i]&&HM.sources['e:'+i].roughness))).length);
  const cov=V.tpCoverage();
  ok('coverage: '+cov.blockTilesWithArt+'/'+cov.blockTiles+' block tiles have art (every art tile is used), '+cov.notInAtlas+' pack names not in the atlas',
    cov.notInAtlas===0&&cov.blockTilesWithArt===cov.layers);
  {/* split repo (v6.3): scripts/build.mjs assembles hr_assets.gen.js + mg_assets.gen.js from assets/packed/ into the build dir. The build's
     hrassets.js must be exactly those two in that order (or the hr pack alone in a build without PART 57), and each must hash to its
     committed manifest (the packer's own pin): this replaces "the build embeds the current gen.js files" + "pack_assets.py --check". */
    const crypto=require('crypto'),sha1=b=>crypto.createHash('sha1').update(b).digest('hex');
    const HB=boot.BUILD+'hr_assets.gen.js',MB=boot.BUILD+'mg_assets.gen.js',mgIn=A.indexOf('function hrMgAssets(')>0;
    const hrT=fs.existsSync(HB)?fs.readFileSync(HB,'latin1'):'',mgT=mgIn&&fs.existsSync(MB)?fs.readFileSync(MB,'latin1'):'';
    ok('the build embeds the assembled hr_assets.gen.js'+(mgT?' (+ the assembled mg_assets.gen.js, '+mgT.length+' B)':''),
      hrT.length>0&&hrT.length+mgT.length===A.length&&A.slice(0,hrT.length)===hrT&&A.slice(hrT.length)===mgT&&(!mgIn||mgT.length>0));
    const MM=JSON.parse(fs.readFileSync(PK+'mg/manifest.json','utf8'));
    ok('the embedded packs hash to their committed manifests (hr fileSha1'+(mgIn?' + mg sha1':'')+')',hrT.length>0&&
      sha1(Buffer.from(A.slice(0,hrT.length),'latin1'))===HM.fileSha1&&(!mgIn||sha1(Buffer.from(A.slice(hrT.length),'latin1'))===MM.sha1));
    if(boot.P.ART_SRC){let out='',code=0;
      try{out=cp.execFileSync('python3',[boot.P.TOOLS+'art/texpacks/pack_assets.py','--check','--profile',meta.profile==='ultra'?'ultra':'std'],{encoding:'utf8'});}catch(e){code=1;out=(e.stdout||'')+(e.stderr||'');}
      ok('pack_assets.py --check passes (DC_ART_SRC: sources unchanged since the pack)'+(code?': '+out.split('\n').filter(Boolean).slice(-2).join(' | '):''),code===0);}
    else boot.skip('pack_assets.py --check','the source art is not in the repo: set DC_ART_SRC to re-hash it');}
});
