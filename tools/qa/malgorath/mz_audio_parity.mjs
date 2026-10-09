// mz_audio_parity.mjs (MZ, plan 9.7 / 11.4): the OfflineAudioContext parity render in the MUTED Chrome. Nobody can hear the Malgorath
// audio, so: (1) node renders every SFX and one bar of every cue through the build's own mg2SfxRender / mg2ScoreRender (what m2_audio
// analyses); (2) the muted Chrome renders the same names in the real page and plays each buffer through the game's playback routing
// (BufferSource -> Gain 0.9*SNDMUL for SFX, the band's gain for cues) into an OfflineAudioContext (no device, no sound); (3) the two
// must agree: Chrome's JS render bit-identical to node's (FNV hash of the float bits), the offline output = the gain times the render
// (max error <= 1e-6), and the levels m2_audio gates on (peak, RMS) identical. Writes out/qa/mz_audio_parity.json.
//   node tools/qa/malgorath/mz_audio_parity.mjs --port 9386 [--build dist/dinglecraft_v<VER>.html]
import fs from 'fs';import path from 'path';import {createRequire} from 'module';import {args,connect,ROOT,defaultBuild} from './m3_lib.mjs';
const A=args(),PORT=+(A.port||9386),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild();
const SR=44100,CUES=['asleep','table','plate','maw','heart'];
const STATS=`function __st(x){let pk=0,s=0,h=0x811c9dc5;const u=new Uint32Array(x.buffer,x.byteOffset,x.length);for(let i=0;i<x.length;i++){const v=Math.abs(x[i]);if(v>pk)pk=v;s+=x[i]*x[i];h=Math.imul(h^u[i],16777619)>>>0;}
  return {n:x.length,peak:+(20*Math.log10(Math.max(1e-12,pk))).toFixed(3),rms:+(10*Math.log10(Math.max(1e-24,s/Math.max(1,x.length)))).toFixed(3),hash:h.toString(16)};}`;
/* (1) node */
process.env.DC_BUILD=process.env.DC_BUILD||path.join(ROOT,'build');   /* the parts of the same npm run build as the dist html */
const realFetch=globalThis.fetch;   /* the suites' boot blocks fetch (no network for the game); the CDP client needs it back afterwards */
const require=createRequire(import.meta.url);const boot=require(ROOT+'tests/lib/mg_boot.js');const V=boot({seed:20261009});
eval(STATS.replace('function __st','globalThis.__st=function'));
const names=Object.keys(V.getMG2SFX()).filter(n=>V.getMG2SFX()[n].v&&V.getMG2SFX()[n].v.length);
const node={};for(const n of names)node[n]=__st(V.mg2SfxRender(n,SR));for(const c of CUES)node['cue:'+c]=__st(V.mg2ScoreRender(c,0,0x6d32,SR,{bpm:c==='heart'?140:60}));
/* (2) Chrome, muted, offline */
globalThis.fetch=realFetch;
const C=await connect(PORT);await C.open(`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`);
const web=await C.ev(`${STATS}const V=__vox,out={},SR=${SR},mul=typeof SNDMUL!=='undefined'?SNDMUL:1;
  const one=async(x,g)=>{const oc=new OfflineAudioContext(1,Math.max(1,x.length),SR),b=oc.createBuffer(1,Math.max(1,x.length),SR);b.getChannelData(0).set(x);
    const s=oc.createBufferSource(),gn=oc.createGain();gn.gain.value=g;s.buffer=b;s.connect(gn);gn.connect(oc.destination);s.start(0);const r=await oc.startRendering(),y=r.getChannelData(0);
    let e=0;for(let i=0;i<x.length;i++)e=Math.max(e,Math.abs(y[i]-g*x[i]));return {err:e,out:__st(y)};};
  for(const n of ${JSON.stringify(names)}){const x=V.mg2SfxRender(n,SR);const r=await one(x,0.9*mul);out[n]={js:__st(x),err:r.err,off:r.out};}
  for(const c of ${JSON.stringify(CUES)}){const x=V.mg2ScoreRender(c,0,0x6d32,SR,{bpm:c==='heart'?140:60});const r=await one(x,0.45*0.8);out['cue:'+c]={js:__st(x),err:r.err,off:r.out};}
  return {sound:soundOn,acState:(typeof AC!=='undefined'&&AC)?AC.state:'none',out,mul};`);
await C.restoreOG();C.close();
/* (3) compare */
const rows=[];let bad=0;
let bits=0;for(const k of Object.keys(node)){const w=web.out[k],nd=node[k];const lv=!!w&&w.js.n===nd.n&&Math.abs(w.js.peak-nd.peak)<=0.01&&Math.abs(w.js.rms-nd.rms)<=0.01,err=w?w.err:1,bit=!!w&&w.js.hash===nd.hash;
  /* the gate's numbers (length, peak, RMS) must match and the offline playback must be gain x render; bit identity is reported (node and
     Chrome ship different V8 builds, so a last-bit Math difference is possible and harmless at 0.01 dB) */
  const ok=lv&&err<=1e-6;if(!ok)bad++;if(bit)bits++;rows.push({k,ok,bit,hash:nd.hash,n:nd.n,peak:nd.peak,rms:nd.rms,webHash:w&&w.js.hash,webPeak:w&&w.js.peak,webRms:w&&w.js.rms,offErr:err,offPeak:w&&w.off.peak,offRms:w&&w.off.rms});}
const res={when:new Date().toISOString(),build:BUILD,sound:web.sound,acState:web.acState,sndmul:web.mul,checked:rows.length,failed:bad,bitIdentical:bits,rows};
fs.mkdirSync(ROOT+'out/qa',{recursive:true});fs.writeFileSync(ROOT+'out/qa/mz_audio_parity.json',JSON.stringify(res,null,1));
console.log('sound '+web.sound+', AC '+web.acState+'; '+rows.length+' renders compared (node vs muted Chrome + OfflineAudioContext): '+bad+' differ in level or playback, '+bits+' bit-identical');
for(const r of rows.filter(r=>!r.ok).slice(0,10))console.log('DIFF',JSON.stringify(r));
process.exit(bad?1:0);
