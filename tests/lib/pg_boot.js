/* pg_boot.js (P0): boots the spliced game headless for the purgatory suites. hr_boot.js semantics plus purgatory helpers.
   const boot=require('./pg_boot.js');
   const V=boot({seed:null|n, clock:false, stubs:[], assets:null, models:null});   // one boot per process ($DC_BUILD/game.js)
   boot.ok(name,cond); boot.skip(name,why); boot.run(async()=>{...}); boot.done()  // prints "(k skipped)" then "N passed, M failed"
   const step=boot.stepper(500000);  step(n,ms) / await step.tick(n,ms)             // strictly increasing frameStep timestamps
   boot.stubbed('2')                  -> true while package 2 is on its stub (V.mpInfo().stubs)
   boot.world(V,name,seed,step)       -> a fresh survival world, snail off, mobs off, settled 160 frames
   boot.purge(V,r)                    -> kill every non-bot mob within r of Dan (deterministic kill loop)
   boot.settle(step,n)                -> n frames (default 25), for after every teleport / setDim
   boot.core(V)                       -> V.pgCore(): live internals the core __vox does not export (tests only)
   Rules (plan 8.4): stepper base >= 500000, settle after every teleport and setDim, GR.mobSpawn=false and purge before
   damage-sensitive phases, item totals not drop counts, P.mode='s' for damage, pitch positive is up. */
'use strict';
const hr=require('./hr_boot.js');
const SKIPS=[];
/* stub extension (root stubs.js is never edited): elements get firstChild, so the real openModal/redrawModal run headless
   (the inventory, crafting, chest and creative panels, and Dan's 54-slot Stage Trunk). Installed before game.js loads. */
function pgStubs(){require(hr.P.STUBS);if(document.__pg)return;document.__pg=1;
  const fc=(el,fb)=>{if(el&&typeof el==='object'&&!('firstChild' in el))Object.defineProperty(el,'firstChild',{get(){return (this.children&&this.children[0])||fb||null;},configurable:true});return el;};
  const ce=document.createElement.bind(document),ge=document.getElementById.bind(document);
  document.createElement=t=>fc(ce(t));
  document.getElementById=id=>{const el=ge(id);return el&&!('firstChild' in el)?fc(el,ce('canvas')):el;};}
function boot(o){pgStubs();return hr(o||{});}
function skip(name,why){SKIPS.push(name+(why?' ('+why+')':''));return false;}
function done(){if(SKIPS.length)console.log('  ('+SKIPS.length+' skipped: '+SKIPS.join('; ')+')');hr.done();}
function run(fn){Promise.resolve().then(fn).then(()=>done(),e=>{console.log('CRASH',e&&e.stack||e);process.exit(1);});}
function stubbed(d){const V=global.__vox;return !!(V&&V.mpInfo&&V.mpInfo().stubs.indexOf(String(d))>=0);}
function settle(step,n){return step(n==null?25:n);}
function world(V,name,seed,step){V.startNewWorld(name||'pgtest',String(seed||'1337'),'s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;
  if(step)step(160);return V.P;}
function purge(V,r){const P=V.P;let n=0;for(const e of V.entities)if(e.t==='mob'&&!e.dead&&!e.bot&&Math.hypot(e.x-P.x,e.z-P.z)<(r||64)){
    const T=V.MOBT[e.mt];if(T&&(T.prop||T.npc))continue;e.hurtT=0;e.pinv=0;e.pfloor=null;V.hurtMob(e,99999,0,0);n++;}return n;}
function core(V){return V.pgCore();}
module.exports=boot;
Object.assign(boot,{ok:hr.ok,skip,done,run,stepper:hr.stepper,capture:hr.capture,SEEDED:hr.SEEDED,ROOT:hr.ROOT,BUILD:hr.BUILD,
  counts:hr.counts,stubbed,settle,world,purge,core,P:hr.P,SRC:hr.SRC,FIX:hr.FIX,OUT:hr.OUT,readSrc:hr.readSrc});
