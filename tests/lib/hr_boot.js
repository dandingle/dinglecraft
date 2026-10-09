/* hr_boot.js (WP0): boots the spliced game headless for the texture-pack suites.
   const boot=require('./hr_boot.js');
   const V=boot({stubs:['A'], assets:null|'fake'|'built', models:null|'fake', seed:null|n, clock:false, real:false});
   boot.ok(name,cond); ... boot.done();          // prints "N passed, M failed" and exits (the game's setInterval keeps node alive)
   boot.run(async()=>{...});                      // wraps a suite: CRASH line + exit 1 on any throw
   boot.renderer(), boot.scene()                  // the game's renderer and main scene (captured at construction)
   await boot.capture('[TP] ',async()=>{...})     // console.log lines with that prefix while fn runs (e.g. tpNote)
   const step=boot.stepper(500000); step(n,ms);   // frameStep with strictly increasing timestamps (default 40 ms)
   Order: tests/core/stubs.js -> tests/lib/stubs_X.js (each) -> fake/built assets -> fake models -> game.js -> afterBoot(V) hooks.
   Any required stub/fake module may export afterBoot(V) to install seams once the game exists (e.g. TPA.decode).
   The build under test is $DC_BUILD/game.js (+ hrassets.js) when set, else <repo>/build/ (tests/lib/paths.js).
   boot.skip(name,why) records a skipped check ("(k skipped: ...)" before the last line). boot.P is tests/lib/paths.js; boot.SRC,
   boot.FIX, boot.OUT and boot.readSrc come from it. Never edit tests/core/stubs.js / test.js / smoke.js / botsmoke.js. */
'use strict';
const path=require('path'),fs=require('fs');
const P=require('./paths.js');
const ROOT=P.REPO,BUILD=P.BUILD;   /* the repo root and the build under test, both ending in '/' */
let pass=0,fail=0,booted=false;const SKIPS=[];
const CAP={WebGLRenderer:[],Scene:[]};
const SEEDED=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
function boot(o){o=o||{};
  if(o.real)return require('./real3.js')(Object.assign({},o,{real:false}));   /* real r128 (needs the vendored file) */
  if(booted)throw new Error('hr_boot: one boot per process (run each suite as its own node process)');
  booted=true;
  require(P.STUBS);
  if(o.seed!==undefined&&o.seed!==null)Math.random=SEEDED(o.seed|0);
  if(o.clock){let c=0;global.performance.now=()=>(c+=0.5);}
  const after=[];
  const use=m=>{if(m&&typeof m.afterBoot==='function')after.push(m.afterBoot);};
  for(const s of o.stubs||[]){const f=__dirname+'/stubs_'+s+'.js';
    if(!fs.existsSync(f))throw new Error('hr_boot: missing '+path.relative(ROOT,f));use(require(f));}
  if(o.assets==='fake')use(require(__dirname+'/fake_assets.js'));
  else if(o.assets==='built'){const m=require(BUILD+'hrassets.js');global.hrAssets=m.hrAssets;global.hrAssetMeta=m.hrAssetMeta;}
  else if(o.assets)throw new Error('hr_boot: assets must be null, "fake" or "built"');
  if(o.models==='fake')use(require(__dirname+'/fake_models.js'));
  else if(o.models)throw new Error('hr_boot: models must be null or "fake"');
  /* capture the game's renderer and scenes (subclass the current constructors, after every stubs_X ran) */
  for(const k of ['WebGLRenderer','Scene']){const C=THREE[k];
    THREE[k]={[k]:class extends C{constructor(...a){super(...a);CAP[k].push(this);}}}[k];}
  require(BUILD+'game.js');
  const V=global.__vox;
  if(!V)throw new Error('hr_boot: game.js did not export __vox');
  for(const f of after)f(V);
  return V;}
function ok(n,c){if(c)pass++;else{fail++;console.log('FAIL '+n);}return !!c;}
function skip(name,why){SKIPS.push(name+(why?' ('+why+')':''));return false;}
function done(){if(SKIPS.length)console.log('  ('+SKIPS.length+' skipped: '+SKIPS.join('; ')+')');console.log(pass+' passed, '+fail+' failed');process.exit(fail?1:0);}
function run(fn){Promise.resolve().then(fn).then(()=>done(),e=>{console.log('CRASH',e&&e.stack||e);process.exit(1);});}
function stepper(t0){let T=t0||500000;const V=()=>global.__vox;
  const step=(n,ms)=>{for(let i=0;i<(n||1);i++){T+=ms||40;V().frameStep(T);}return T;};
  step.now=()=>T;
  step.tick=async(n,ms)=>{for(let i=0;i<(n||1);i++){T+=ms||40;V().frameStep(T);if(i%10===9)await new Promise(r=>setImmediate(r));}return T;};
  return step;}
/* console.log lines starting with prefix, captured while fn runs (e.g. count '[TP] ' notes) */
async function capture(prefix,fn){const L=[],o=console.log;console.log=(...a)=>{const s=a.map(String).join(' ');if(s.startsWith(prefix))L.push(s);else o(...a);};
  try{await fn();}finally{console.log=o;}return L;}
module.exports=boot;
Object.assign(boot,{ok,skip,done,run,stepper,capture,SEEDED,ROOT,BUILD,P,SRC:P.SRC,FIX:P.FIX,OUT:P.OUT,readSrc:P.readSrc,counts:()=>({pass,fail}),
  renderer:()=>CAP.WebGLRenderer[0],         /* the game's renderer (stub instance) */
  scene:()=>CAP.Scene[0]});                   /* the game's main scene (first Scene built in boot()) */
