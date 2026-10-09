/* tB_browser.js (Package B): browser-only QA for the 'light' module, on the page's own three r128.
   Load it into the running game page (same origin as the repo root (node scripts/serve.mjs)):
     (0,eval)(await (await fetch('/tools/qa/texpacks/tB_browser.js')).text());
     bqa.real()                       // the tB_real.js checks against the page's r128 (ShaderLib tokens, hrLin, pass sources, targets)
     await bqa.start()                // new creative seed-1337 world, day cycle and spawning off
     await bqa.perf({frames:120})     // per tier: ms per frame (CPU + GPU, gl.finish), draw calls, triangles, programs, memory
     await bqa.mem(5)                 // switch Low/High/Ultra/Medium n times: renderer.info.memory + programs before/after
     bqa.probe([[.5,.5],...])         // rendered pixel values at viewport fractions (y from the top)
   Frames are driven with __vox.frameStep (works while the Browser pane is hidden). Timing uses gl.finish, so it measures
   whole frames (game CPU + render) at the current canvas size, not vsync-limited rAF frames; compare tiers, not absolute fps. */
(function(){
'use strict';
const V=()=>window.__vox;
let T=Math.max(performance.now(),1e6)+3e5;
const step=n=>{for(let i=0;i<(n||1);i++){T+=40;V().frameStep(T);}};
const gl=()=>renderer.getContext();
window.bqa={step,
  real(){const T3=THREE,C=T3.ShaderChunk,L=T3.ShaderLib,res=[];const ok=(n,c)=>res.push((c?'ok   ':'FAIL ')+n);
    for(const k of ['basic','lambert','phong','standard','sprite','points'])ok('diffuse token '+k,L[k].fragmentShader.includes('vec4 diffuseColor = vec4( diffuse, opacity );'));
    for(const k of ['lambert','phong','standard'])ok('emissive/map tokens '+k,['vec3 totalEmissiveRadiance = emissive;','#include <map_fragment>','#include <emissivemap_fragment>'].every(t=>L[k].fragmentShader.includes(t)));
    ok('mapTexelToLinear / emissiveMapTexelToLinear',C.map_fragment.includes('mapTexelToLinear')&&C.emissivemap_fragment.includes('emissiveMapTexelToLinear'));
    ok('Lambert PI quirk present (3x)',(C.lights_lambert_vertex.match(/PI \* directLight\.color/g)||[]).length===3);
    ok('hemisphere: no PI in physical mode',/#ifndef PHYSICALLY_CORRECT_LIGHTS[\s\S]{0,40}irradiance \*= PI/.test(C.lights_pars_begin));
    const X=V().hrLState().HRFX,keep=[X.mapFrag,X.emiFrag,X.lamVert,X.lamFrag];      /* never hrFXEnable here: it resets a live session */
    X.mapFrag=C.map_fragment.replace('mapTexelToLinear','sRGBToLinear');X.emiFrag=C.emissivemap_fragment.replace('emissiveMapTexelToLinear','sRGBToLinear');
    const lc=V().hrLamChunks(C.lights_lambert_vertex);X.lamVert=lc.v;X.lamFrag=lc.f;ok('Lambert chunks built from r128 (directional split found)',!!lc.v&&!!lc.f);
    for(const k of ['basic','lambert','phong','standard','sprite','points']){const sh={fragmentShader:L[k].fragmentShader,vertexShader:L[k].vertexShader};V().hrLin(sh);
      ok('hrLin '+k,sh.fragmentShader.includes('pow( diffuse, vec3( 2.2 ) )')&&!sh.fragmentShader.includes('#include <map_fragment>')&&!/PI \* directLight/.test(sh.vertexShader)&&
        (k!=='lambert'||(sh.fragmentShader.includes('hrDirL * ( 1.0 - getShadowMask() )')&&(sh.vertexShader.match(/vHrDirF \+=/g)||[]).length===1))&&
        (!L[k].fragmentShader.includes('vec3 totalEmissiveRadiance = emissive;')||sh.fragmentShader.includes('pow( emissive, vec3( 2.2 ) )')));}
    X.mapFrag=keep[0];X.emiFrag=keep[1];X.lamVert=keep[2];X.lamFrag=keep[3];
    ok('no texture( in pass/dome shaders',Object.values(V().hrFXSrc()).every(s=>!/\btexture\s*\(/.test(s)));
    const rt=hrFXRT(64,32,true,true);ok('sceneRT half float + UnsignedInt depth texture',rt.texture.type===T3.HalfFloatType&&rt.depthTexture.type===T3.UnsignedIntType&&rt.texture.generateMipmaps===false);rt.dispose();
    return res;},
  async start(o){o=Object.assign({seed:'1337',tod:0.3},o||{});const v=V();v.startNewWorld('bqa',o.seed,'c');step(5);
    v.GR.mobSpawn=false;v.GR.dayCycle=false;v.GR.snail=false;v.GR.jsc=0;v.forceChunksNear(v.P.x,v.P.z);step(150);v.setTime(o.tod);step(10);return [v.P.x|0,v.P.y|0,v.P.z|0];},
  probe(pts){const g=gl();tpRenderOnce();const w=g.drawingBufferWidth,h=g.drawingBufferHeight,b=new Uint8Array(4);
    return (pts||[[.5,.5]]).map(([fx,fy])=>{g.readPixels(Math.floor(w*fx),Math.floor(h*(1-fy)),1,1,g.RGBA,g.UNSIGNED_BYTE,b);return [b[0],b[1],b[2]];});},
  async perf(o){o=Object.assign({frames:120,tiers:[0,1,2,3],og:true},o||{});const v=V(),g=gl(),out=[];
    const run=label=>{step(20);g.finish();const t=[];let calls=0,tris=0;
      for(let i=0;i<o.frames;i++){const a=performance.now();step(1);g.finish();t.push(performance.now()-a);calls+=renderer.info.render.calls;tris+=renderer.info.render.triangles;}
      t.sort((p,q)=>p-q);out.push({tier:label,avg:+(t.reduce((p,q)=>p+q,0)/t.length).toFixed(2),p95:+t[Math.floor(t.length*.95)].toFixed(2),
        calls:Math.round(calls/o.frames),tris:Math.round(tris/o.frames),programs:renderer.info.programs.length,geos:renderer.info.memory.geometries,texs:renderer.info.memory.textures,
        px:g.drawingBufferWidth+'x'+g.drawingBufferHeight});};
    if(o.og){if(v.getTP().hr)await v.setPack('og');run('OG');}
    const only=v.getTP().mods.includes('world')?undefined:{only:['light']};
    if(!v.getTP().hr)await v.setPack('hr',only);
    for(const q of o.tiers){await v.setQuality(q);run(v.tpQ().n);}
    await v.setQuality(-1);return out;},
  async mem(n){const v=V(),I=renderer.info;if(!v.getTP().hr)await v.setPack('hr',v.getTP().mods.includes('world')?undefined:{only:['light']});
    step(5);const a={geos:I.memory.geometries,texs:I.memory.textures,programs:I.programs.length,rts:v.getHRL().rts};
    for(let i=0;i<(n||5);i++){for(const q of [0,2,3,1]){await v.setQuality(q);step(3);}}
    await v.setQuality(-1);step(5);const b={geos:I.memory.geometries,texs:I.memory.textures,programs:I.programs.length,rts:v.getHRL().rts};
    return {before:a,after:b,stable:a.geos===b.geos&&a.texs===b.texs&&a.rts===b.rts};}
};
})();
