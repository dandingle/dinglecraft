/* og_trace.js (WP0): proves PART 54 is inert while the OG pack is active.
   Split repo (v6.3): the compiled-out reference builds no longer exist (every hook is folded into src/), so the reference run is a
   GOLDEN digest generated once from the legacy DC_NO_TEX splice at the split (tests/fixtures/og_trace/<session>.json; never print it;
   re-blessed since only for intended OG changes, each with its reason recorded in the fixture: docs/TESTING.md):
   node tests/texpacks/og_trace.js --golden tests/fixtures/og_trace/<session>.json [texGameJs]
     the build under test (default: $DC_BUILD/game.js, else <repo>/build/game.js) runs the fixture's session in ONE child and every
     digest must equal the golden. The session comes from the fixture (over | purg | crea | malg), not from the environment.
   node tests/texpacks/og_trace.js --bless tests/fixtures/og_trace/<session>.json --reason "<why>" [texGameJs]
     rewrites a golden from the build under test (records blessedFrom + reason). ONLY when a change is MEANT to alter OG behaviour,
     or when tests/core/stubs.js or this file's instrumentation changes. Never bless to make a red run green.
   node tests/texpacks/og_trace.js <ogOnlyGameJs> [texGameJs]   (legacy two-build mode, kept for ad-hoc comparisons)
     <ogOnlyGameJs>  any reference game.js (the legacy gate used a DC_NO_TEX=1 splice)
     [texGameJs]     the build under test (default: $DC_BUILD/game.js, else <repo>/build/game.js)
   Each build runs the same scripted 600-frame session in its own child process: seeded Math.random, a fake
   performance.now/Date.now that tick per call, no timers, no awaits. Every 40 frames a digest is taken and
   the two runs must match exactly. The digest covers the player, entities, chunk meshes per bucket (material
   class + identity), every light, fog/background, the scene graph, renderer flags and renderer call counts,
   the hand, THREE constructor counts per class and the number of Math.random/clock calls (so any extra
   random/clock call or THREE allocation by PART 54 in OG shows up). Version, patch notes and __vox keys
   are not part of the digest.
   v6.1 (P0, the purgatory build plan section 8.5): three sessions, chosen by the environment.
     (default)          overworld: DC_NO_TEX build (v5.9 + PART 55) vs the full build: PART 54 inert in OG, purgatory in both
     OGT_REF=nopurg     parity: DC_NO_TEX DC_NO_PURG (exact v5.9) vs DC_NO_TEX (v5.9 + PART 55): the overworld is identical
                        with purgatory compiled in (the door is never stamped: no pointer lock, no compass tuning)
     OGT_SESSION=purg   purg: DC_NO_TEX vs full, a scripted trip through purgatory (door, ritual through the real doUse,
                        cutscene skipped by Space, the Mark, a placed block, ... exit): Hyperreal does nothing to OG inside.
                        Steps whose package is still on its stub (V.pgStubs) are skipped, identically in both builds.
   v6.2 (lead, the creativity plan section 9.3): two more modes; the reference builds now name PART 56 too.
     OGT_REF=nocrea     parity: DC_NO_TEX DC_NO_CREA (v5.9 + PART 55) vs DC_NO_TEX (v5.9 + PART 55 + PART 56): the overworld is
                        identical with the Creativity Update compiled in (the overworld script never touches a creativity block)
     OGT_SESSION=crea   crea: DC_NO_TEX vs full, a scripted creativity session (an easel placed and opened through the real doUse,
                        a painting finished, hung on a wall, taken down; a record player, a disc, a jukebox played and ejected,
                        a save round trip): Hyperreal does nothing to OG with creativity content in the world. Steps that need
                        a creativity package still on its stub (V.crInfo().stubs) use the stub's values, identically in both builds.
   The parity (nopurg) test build is DC_NO_TEX DC_NO_CREA, so that session keeps meaning "exact v5.9 vs v5.9 + PART 55".
   v6.3 (lead, the Malgorath plan section 9.4): two more modes; the nocrea test build is DC_NO_TEX DC_NO_MALG.
     OGT_REF=nomalg     parity: DC_NO_TEX DC_NO_MALG (v5.9 + PART 55 + PART 56) vs DC_NO_TEX (+ PART 57): the overworld is identical
                        with the Malgorath Update compiled in (the overworld script never goes within 220 m of the Bite)
     OGT_SESSION=malg   malg: DC_NO_TEX vs full, a scripted visit to the Bite (the chunks stamped, a round woken through mgSkipTo,
                        his attacks on Dan, Dan's attributed hits on him, Dan's death and respawn, a save round trip mid-fight, a walk
                        out to dormancy): Hyperreal does nothing to OG with Malgorath live. Same PART 57 in both builds. */
'use strict';
const path=require('path'),fs=require('fs'),cp=require('child_process');
const P=require('../lib/paths.js'),ROOT=P.REPO;
const MARK='@@OGTRACE ';
/* golden mode (split repo): the session's environment for the child, and a version compare for "at least the reference's version" */
const SESS={over:{},purg:{OGT_SESSION:'purg'},crea:{OGT_SESSION:'crea'},malg:{OGT_SESSION:'malg'}};
const verGE=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);return x[0]>y[0]||(x[0]===y[0]&&x[1]>=y[1]);};
let MODE=process.env.OGT_SESSION==='purg'?'purg':process.env.OGT_SESSION==='crea'?'crea':process.env.OGT_SESSION==='malg'?'malg':
  (process.env.OGT_REF==='nopurg'?'parity':process.env.OGT_REF==='nocrea'?'nocrea':process.env.OGT_REF==='nomalg'?'nomalg':'over');

if(process.argv[2]==='--child'){child(process.argv[3]);}
else parent();

/* golden mode (split repo): A is the fixture's digest, never printed; the session comes from the fixture */
function runChild(f,env){return new Promise(res=>{
    const p=cp.spawn(process.execPath,[__filename,'--child',path.resolve(f)],{stdio:['ignore','pipe','pipe'],env:env||process.env});
    let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
    p.on('close',code=>{const line=out.split('\n').find(l=>l.startsWith(MARK));
      res({code,data:line?JSON.parse(line.slice(MARK.length)):null,tail:(out+err).split('\n').filter(Boolean).slice(-8).join('\n')});});});}
function parent(){
  const gi=process.argv.indexOf('--golden'),bi=process.argv.indexOf('--bless'),gf=gi>0?process.argv[gi+1]:bi>0?process.argv[bi+1]:null;
  const rest=process.argv.slice(2).filter((a,i,L)=>!['--golden','--bless','--reason'].includes(a)&&!['--golden','--bless','--reason'].includes(L[i-1]));
  let GOLD=null,childEnv=process.env;
  if(gf){const f=path.resolve(gf);
    if(bi>0){const ri=process.argv.indexOf('--reason'),why=ri>0?String(process.argv[ri+1]||'').trim():'';
      if(!why){console.log('og_trace --bless needs --reason "<why the OG behaviour is meant to change>"');process.exit(2);}
      const sess=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')).session:path.basename(f,'.json');
      if(!SESS[sess]){console.log('og_trace --bless: unknown session '+sess);process.exit(2);}
      const tex=path.resolve(rest[0]||P.BUILD+'game.js'),env=Object.assign({},process.env,{OGT_SESSION:'',OGT_REF:''},SESS[sess]);
      runChild(tex,env).then(R=>{if(R.code!==0||!R.data){console.log('og_trace --bless: the run did not complete\n'+R.tail);process.exit(1);}
        const g={session:sess,generatedFrom:null,blessedFrom:'v'+R.data.ver+' game.js md5 '+require('crypto').createHash('md5').update(fs.readFileSync(tex)).digest('hex'),
          reason:why,blessedAt:new Date().toISOString().slice(0,10),data:R.data};
        fs.writeFileSync(f,JSON.stringify(g)+'\n');console.log('blessed '+P.rel(f)+' ('+R.data.digests.length+' digests, session '+sess+')');process.exit(0);});
      return;}
    if(!fs.existsSync(f)){console.log('og_trace: golden fixture missing: '+P.rel(f));console.log('0 passed, 1 failed');process.exit(1);}
    GOLD=JSON.parse(fs.readFileSync(f,'utf8'));
    if(!SESS[GOLD.session]){console.log('og_trace: unknown session in '+P.rel(f));console.log('0 passed, 1 failed');process.exit(1);}
    MODE=GOLD.session;childEnv=Object.assign({},process.env,{OGT_SESSION:'',OGT_REF:''},SESS[GOLD.session]);}
  const og=GOLD?null:rest[0];
  const tex=(GOLD?rest[0]:rest[1])||(P.BUILD+'game.js');
  if(!GOLD&&(!og||!fs.existsSync(og))){console.log('usage: node og_trace.js --golden <fixture.json> [texGameJs]  |  node og_trace.js <ogOnlyGameJs> [texGameJs]');console.log('0 passed, 1 failed');process.exit(1);}
  let pass=0,fail=0;const ok=(n,c)=>{if(c)pass++;else{fail++;console.log('FAIL '+n);}return c;};
  const runs=GOLD?[Promise.resolve({code:0,data:GOLD.data||null,tail:'golden fixture has no data'}),runChild(tex,childEnv)]:[og,tex].map(f=>runChild(f));
  Promise.all(runs).then(([A,Bx])=>{
    if(!ok(GOLD?'reference (golden '+GOLD.session+' digest'+(GOLD.blessedFrom?', blessed':'')+') loaded':'reference (OG-only) run completed',A.code===0&&A.data))console.log(A.tail);
    if(!ok('texture-pack build run completed',Bx.code===0&&Bx.data))console.log(Bx.tail);
    if(!A.data||!Bx.data){console.log(pass+' passed, '+fail+' failed');process.exit(1);}
    if(MODE==='parity'){
      ok('reference build is exact v5.9 (no PART 54, no PART 55, no PART 56)',A.data.ver==='5.9'&&!A.data.hasTP&&!A.data.purg&&!A.data.crea);
      ok('build under test is v5.9 + PART 55 (no PART 54, no PART 56)',Bx.data.ver==='5.9'&&!Bx.data.hasTP&&Bx.data.purg&&!Bx.data.crea);}
    else if(MODE==='nocrea'){
      ok('reference build is v5.9 + PART 55 (no PART 54, no PART 56)',A.data.ver==='5.9'&&!A.data.hasTP&&A.data.purg&&!A.data.crea&&!A.data.malg);
      ok('build under test is v5.9 + PART 55 + PART 56 (no PART 54, no PART 57)',Bx.data.ver==='5.9'&&!Bx.data.hasTP&&Bx.data.purg&&Bx.data.crea&&!Bx.data.malg);}
    else if(MODE==='nomalg'){
      ok('reference build is v5.9 + PART 55 + PART 56 (no PART 54, no PART 57)',A.data.ver==='5.9'&&!A.data.hasTP&&A.data.purg&&A.data.crea&&!A.data.malg);
      ok('build under test is v5.9 + PART 55 + PART 56 + PART 57 (no PART 54)',Bx.data.ver==='5.9'&&!Bx.data.hasTP&&Bx.data.purg&&Bx.data.crea&&Bx.data.malg);}
    else{
      /* golden: a legacy-generated fixture is the DC_NO_TEX reference (v5.9 + PARTs 55-57, no PART 54); a blessed one is whatever build
         it was blessed from (its metadata is recorded in the fixture). The build under test must be at least the version the reference
         names (v6.3 at the split): later versions keep passing as long as their OG session is digest-identical. */
      ok(GOLD&&GOLD.blessedFrom?'reference is a blessed digest ('+GOLD.blessedFrom+': '+GOLD.reason+')':'reference build is v5.9 + PART 55'+(A.data.crea?' + PART 56':'')+(A.data.malg?' + PART 57':'')+' without PART 54',
        GOLD&&GOLD.blessedFrom?A.data.purg&&(MODE!=='crea'||A.data.crea)&&(MODE!=='malg'||A.data.malg):A.data.ver==='5.9'&&!A.data.hasTP&&A.data.purg&&
        (MODE!=='crea'||A.data.crea)&&(MODE!=='malg'||A.data.malg));
      ok('build under test has PART 54 and PART 55'+(A.data.crea?' and PART 56':'')+(A.data.malg?' and PART 57':'')+' ('+Bx.data.ver+')',
        Bx.data.hasTP&&Bx.data.purg&&Bx.data.crea===A.data.crea&&Bx.data.malg===A.data.malg&&(GOLD?verGE(Bx.data.ver,A.data.malg?'6.3':A.data.crea?'6.2':'6.1'):Bx.data.ver===(A.data.malg?'6.3':A.data.crea?'6.2':'6.1')));}
    ok('build under test stayed on OG for the whole session',Bx.data.tpTrail.every(t=>t==='og/false/0'));
    ok('both runs took '+A.data.digests.length+' digests',A.data.digests.length===15&&Bx.data.digests.length===A.data.digests.length);
    /* the script must really do what it says (a vacuous session would prove nothing) */
    const D=A.data.digests,at=f=>D.find(d=>d.frame===f)||{},mob=(d,mt)=>(d.ents||[]).filter(e=>e[0]==='mob'&&e[1]===mt);
    const sane=MODE==='purg'?purgSane(A.data,at):MODE==='crea'?creaSane(A.data,at):MODE==='malg'?malgSane(A.data,at):{
      'walked':at(200).P&&(at(200).P[0]!==at(160).P[0]||at(200).P[2]!==at(160).P[2]),
      'mined a block (world + inventory changed)':JSON.stringify(at(240).blk)!==JSON.stringify(at(200).blk)&&at(240).inv!==at(280).inv,
      'held and placed a block':at(280).hand&&at(280).hand.kind>0&&JSON.stringify(at(280).blk)!==JSON.stringify(at(240).blk),
      'spawned a zombie and damaged it':mob(at(320),'zombie').some(e=>e[5]<20),
      'killed the pig':mob(at(320),'pig').some(e=>e[6]),
      'night fell':at(360).misc&&at(360).misc.light.amb<at(320).misc.light.amb,
      'entered water':at(400).P&&at(400).P[10]===true,
      'X-ray on, then off':at(440).misc&&at(440).misc.xr.on===true&&at(480).misc.xr.on===false,
      'Shaders on, then off':at(520).misc&&at(520).misc.shd.on===true&&at(560).misc.shd.on===false,
      'third person with an empty hand':at(560).hand&&at(560).hand.kind===-1&&JSON.stringify(at(560).cam)!==JSON.stringify(at(600).cam)};
    for(const k in sane)ok('session: '+k,!!sane[k]);
    let firstBad=-1;
    for(let i=0;i<A.data.digests.length;i++){
      const a=JSON.stringify(A.data.digests[i]),b=JSON.stringify(Bx.data.digests[i]);
      if(!ok('digest '+(i+1)+' (frame '+A.data.digests[i].frame+') identical',a===b)&&firstBad<0)firstBad=i;}
    if(firstBad>=0){const L=[];diff(A.data.digests[firstBad],Bx.data.digests[firstBad],'',L);
      console.log('  first divergence at digest '+(firstBad+1)+':');for(const l of L.slice(0,12))console.log('   '+l);}
    console.log(pass+' passed, '+fail+' failed');process.exit(fail?1:0);});
}
/* the Malgorath session's "it really happened" checks (v6.3; generic: they hold for the stubs and the real packages) */
function malgSane(R,at){const mg=f=>at(f).mg||{},n=R.notes||[];
  return {
    'stood on the plate of the Bite (chunks stamped, Dan inside the arena)':n.includes('plate'),
    'woke him into a live round (the boss entity exists)':mg(200).live===1&&mg(200).boss===true,
    'Dan landed attributed hits on him (his HP fell)':n.includes('hit'),
    'Dan died in the round and respawned':n.includes('died')&&n.includes('respawn'),
    'a save round trip mid-fight restored no boss entity from the save (one or none, never two)':n.includes('reload')&&(mg(480).ents|0)<=8,
    'walked out: the fight went dormant':mg(600).live===0};}
/* the creativity session's "it really happened" checks (v6.2) */
function creaSane(R,at){const cr=f=>at(f).cr||{},n=R.notes||[];
  return {
    'placed an easel through the real doUse':n.includes('easel'),
    'opened it (an editor was open)':n.includes('ui'),
    'finished a painting (one done work in the registry)':(cr(200).works|0)>=1&&(cr(200).wip|0)===0,
    'hung it on a wall (4 painting cells)':n.includes('hung')&&(cr(240).be|0)>=5,
    'took it down (the cells are gone, the work came back)':n.includes('down'),
    'made a disc and played it in a jukebox':n.includes('play'),
    'ejected the disc back to the inventory':n.includes('eject'),
    'a save round trip kept both works':n.includes('reload')&&(cr(560).works|0)===2};}
/* the purgatory session's "it really happened" checks (only steps whose package is real are required) */
function purgSane(R,at){const pg=f=>at(f).pg||{},st=R.stubs||'';
  const o={
    'stamped a Stage Door':!!(pg(200).door),
    'entered through the ritual (purgatory, inside, cutscene over)':pg(280).dim==='puppet'&&pg(280).inside===true&&!pg(280).cut,
    'stood on the Mark with the Programme in slot 1':at(280).P&&Math.abs(at(280).P[2]+135.5)<3&&/^285x1/.test(at(280).inv||''),
    'placed a block inside':JSON.stringify(at(400).blk)!==JSON.stringify(at(360).blk),
    'left purgatory with the trunk standing in the overworld':pg(600).dim==='over'&&pg(600).inside===false&&!!pg(600).trunk};
  if(st.indexOf('3')<0)o['spawned a Blank and damaged it']=(R.notes||[]).includes('blank');
  if(st.indexOf('4')<0)o['skipped to the Demolitionist']=(R.notes||[]).includes('bomber');
  if(st.indexOf('2')<0)o['punched a Felt Sleeve and crafted a Floppy Pick at the can']=(R.notes||[]).includes('craft');
  return o;}
function diff(a,b,p,L){
  if(JSON.stringify(a)===JSON.stringify(b))return;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],p+'.'+k,L);return;}
  const s=v=>{const t=JSON.stringify(v);return t===undefined?'undefined':(t.length>90?t.slice(0,90)+'...':t);};
  L.push(p+': og='+s(a)+'  tex='+s(b));
}

function child(gameJs){
  require(P.STUBS);
  /* ---- determinism + call counters ---- */
  const CNT={rnd:0,pnow:0,dnow:0};
  let a=1337;
  Math.random=()=>{CNT.rnd++;a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  let clk=0;global.performance.now=()=>{CNT.pnow++;return (clk+=0.5);};
  let dclk=1759700000000;Date.now=()=>{CNT.dnow++;return (dclk+=1);};
  const noTimer=()=>0;global.setInterval=noTimer;global.setTimeout=noTimer;global.setImmediate=noTimer;
  global.fetch=async()=>{throw new Error('no network in og_trace');};
  /* ---- THREE instrumentation: named subclasses that count constructions; materials get identities ---- */
  const CTORS={},SCENES=[],LIGHTS=[],RENDS=[],RCALLS={};let TID=0;
  for(const k of Object.keys(THREE)){const C=THREE[k];
    if(typeof C!=='function'||!/^class\b/.test(Function.prototype.toString.call(C)))continue;
    const W={[k]:class extends C{constructor(...args){super(...args);CTORS[k]=(CTORS[k]||0)+1;
      if(/Material$/.test(k))this.__tid=++TID;
      if(k==='Scene')SCENES.push(this);
      if(/Light$/.test(k))LIGHTS.push(this);
      if(k==='WebGLRenderer')RENDS.push(this);}}}[k];
    THREE[k]=W;}
  const RP=THREE.WebGLRenderer.prototype;
  for(let p=Object.getPrototypeOf(RP);p&&p!==Object.prototype;p=Object.getPrototypeOf(p))
    for(const m of Object.getOwnPropertyNames(p)){if(m==='constructor'||typeof p[m]!=='function'||RP.hasOwnProperty(m))continue;
      const f=p[m];RP[m]=function(...args){RCALLS[m]=(RCALLS[m]||0)+1;return f.apply(this,args);};}
  require(gameJs);
  const V=global.__vox;const {B}=V;
  if(typeof V.getCRFD==='function')V.getCRFD().off=true;   /* Release 1.0: rare found works off in traced sessions (like mobSpawn); goldens predate them */
  const el=id=>document.getElementById(id);
  const col=c=>c&&c.r!==undefined?[c.r,c.g,c.b]:null;
  const out={ver:V.GAME_VERSION,hasTP:typeof V.getTP==='function',purg:typeof V.mpInfo==='function',crea:typeof V.crInfo==='function',malg:typeof V.mgInfo==='function',digests:[],tpTrail:[],
    stubs:typeof V.mpInfo==='function'?V.mpInfo().stubs:'',crStubs:typeof V.crInfo==='function'?V.crInfo().stubs:'',notes:[]};
  const digest=frame=>{
    const P=V.P,S=SCENES[0],R=RENDS[0];
    const d={frame};
    d.P=P?[P.x,P.y,P.z,P.yaw,P.pitch,P.hp,P.vx,P.vy,P.vz,!!P.onGround,!!P.eyeWater,!!P.dead,P.mode,P.sel]:null;
    d.ents=V.entities.map(e=>[e.t,e.mt||'',e.x,e.y,e.z,e.hp===undefined?null:e.hp,!!e.dead]);
    let nch=0;const bk={};
    for(const ch of V.chunks.values()){if(!ch.meshes)continue;nch++;
      for(const m of ch.meshes){const b=bk['r'+m.renderOrder]||(bk['r'+m.renderOrder]={n:0,mats:{},cast:0,recv:0});b.n++;
        const mn=m.material.constructor.name+'#'+(m.material.__tid||0);b.mats[mn]=(b.mats[mn]||0)+1;
        if(m.castShadow)b.cast++;if(m.receiveShadow)b.recv++;}}
    d.chunks={n:nch,bk};
    d.lights=LIGHTS.map(l=>[l.constructor.name,l.intensity,col(l.color),!!l.visible,!!l.castShadow,!!l.parent,l.position.x,l.position.y,l.position.z]);
    d.fog=S&&S.fog?[S.fog.near,S.fog.far,col(S.fog.color)]:null;
    d.bg=S&&S.background&&S.background.r!==undefined?col(S.background):String(S&&S.background);
    const sg={};let nodes=0,vis=0,cast=0,recv=0;
    if(S)S.traverse(o=>{nodes++;if(o.visible)vis++;if(o.castShadow)cast++;if(o.receiveShadow)recv++;const n=o.constructor.name;sg[n]=(sg[n]||0)+1;});
    d.scene={nodes,vis,cast,recv,sg};
    d.R=R?[R.shadowMap.enabled,R.shadowMap.type,R.shadowMap.autoUpdate,R.outputEncoding,R.toneMapping,R.toneMappingExposure,R.physicallyCorrectLights,R.autoClear]:null;
    d.Rcalls={...RCALLS};d.ctors={...CTORS};d.calls={...CNT};
    d.hand=V.getHand();
    d.inv=P?P.inv.map(s=>s?s.id+'x'+s.count:0).join(','):null;
    /* the scripted area's blocks (spawn 178,33,178 -> walk -> mine/place -> water pool around ~172,30,171) */
    let bh=2166136261>>>0,nb=0;const BX=MODE==='purg'?[-8,8,30,45,-144,-128]:MODE==='malg'?[972,1000,18,34,990,1010]:[164,186,20,42,160,186];
    if(P)for(let x=BX[0];x<=BX[1];x++)for(let y=BX[2];y<=BX[3];y++)for(let z=BX[4];z<=BX[5];z++){const b=V.getBlock(x,y,z);if(b)nb++;bh=Math.imul(bh^(b&255),16777619)>>>0;}
    d.blk=[bh,nb];
    if(MODE==='purg'){const i=V.mpInfo(),t=i.trunks&&i.trunks.Dan;d.pg={dim:i.dim,inside:i.inside,door:i.door,cut:i.cut,clock:i.clock,page:i.page,
      trunk:t&&i.dim==='over'?V.getBlock(...t.split(',').map(Number))===V.B.PG_STRUNK:false};}
    if(MODE==='crea'){const i=V.crInfo();d.cr={works:i.works,wip:i.wip,be:i.be,ui:i.ui,clock:i.clock,bytes:i.bytes};}
    if(MODE==='malg'){const i=V.mgInfo();d.mg={live:i.live,round:i.round,met:i.met,dead:i.dead,near:i.near,band:i.band,prot:i.prot,boss:i.boss,hp:i.hp,phase:i.phase,ents:i.ents};}
    let cam=null;if(S)S.traverse(o=>{if(!cam&&(o.isPerspectiveCamera||o.constructor.name==='PerspectiveCamera'))cam=o;});
    d.cam=cam?[cam.position.x,cam.position.y,cam.position.z,cam.rotation.x,cam.rotation.y,cam.rotation.z,cam.fov,cam.near,cam.far]:null;
    d.misc={t:V.getTime(),dim:V.getDim(),light:V.getLight(),ug:V.getUG(),xr:V.getXR(),shd:V.getSHD(),shadow:V.getShadow(),paused:V.getPaused(),arm:V.getArmTool()};
    d.dom={waterov:el('waterov').style.opacity,vignette:el('vignette').style.opacity};
    out.digests.push(d);
    if(out.hasTP){const t=V.getTP();out.tpTrail.push(t.id+'/'+t.hr+'/'+t.live.length);}
  };
  /* ---- the scripted session: 600 frames, 40 ms apart, fully synchronous ---- */
  let T=40,mobs={};
  const ACT=MODE==='purg'?purgAct(V,out):MODE==='crea'?creaAct(V,out):MODE==='malg'?malgAct(V,out):{
    0:()=>{V.startNewWorld('ogtrace','1337','s');V.GR.snail=false;V.GR.jsc=0;},
    160:()=>{V.P.yaw=0.7;V.P.pitch=0;V.KEY.KeyW=true;},                                   /* walk */
    200:()=>{V.KEY.KeyD=true;},
    220:()=>{V.KEY.KeyW=false;V.KEY.KeyD=false;V.P.pitch=-1.45;V.P.sel=0;V.P.inv[0]=null;V.MB.l=true;},   /* mine (bare hand, looking down) */
    262:()=>{V.MB.l=false;V.P.inv[1]={id:B.STONE,count:8};V.P.sel=1;V.refreshHand();},        /* hold a block */
    266:()=>{V.P.pitch=-0.9;V.MB.r=true;},                                                   /* place */
    270:()=>{V.MB.r=false;},
    280:()=>{const P=V.P;mobs.z=V.spawnMob('zombie',P.x+4,P.y+1,P.z+1);mobs.p=V.spawnMob('pig',P.x-3,P.y+1,P.z+2);},
    300:()=>{const z=V.entities.find(e=>e.mt==='zombie'&&!e.dead);if(z){z.hurtT=0;V.hurtMob(z,3,0.5,0);}},   /* damage */
    320:()=>{const p=V.entities.find(e=>e.mt==='pig'&&!e.dead);if(p){p.hurtT=0;V.hurtMob(p,999,0,0);}},    /* kill */
    340:()=>{V.GR.dayCycle=false;V.setTime(0.8);},                                            /* night */
    380:()=>{const P=V.P,x=Math.floor(P.x),y=Math.floor(P.y),z=Math.floor(P.z);                 /* water */
      for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=-1;dy<=3;dy++){const edge=Math.abs(dx)===2||Math.abs(dz)===2||dy===-1;
        V.setBlock(x+dx,y+dy,z+dz,edge?B.STONE:(dy<=2?B.WATER:B.AIR));}
      P.x=x+0.5;P.z=z+0.5;P.y=y;P.vx=P.vy=P.vz=0;},
    440:()=>{V.toggleXray();},
    480:()=>{V.toggleXray();},
    500:()=>{V.setShaders(true);},
    530:()=>{V.setCam(1);V.P.inv[1]=null;V.refreshHand();},                                   /* third person, empty hand */
    560:()=>{V.setShaders(false);V.setTime(0.3);},
    590:()=>{V.setCam(0);},
  };
  for(let f=0;f<=600;f++){
    if(ACT[f])ACT[f]();
    if(ACT.each)ACT.each(f);
    if(f>0&&f%40===0)digest(f);
    V.frameStep(T);T+=40;
  }
  process.stdout.write(MARK+JSON.stringify(out)+'\n',()=>process.exit(0));
}
/* the Malgorath session (600 frames, v6.3): the same PART 57 in both builds; only PART 54 and the PART 57 HR block differ. Generic seams
   (mgSkipTo, mgHitAs, mgInfo) so it holds for the scaffold's stubs and for the real packages alike. */
function malgAct(V,out){const P=()=>V.P;const boss=()=>V.entities.find(e=>!e.dead&&e.mt==='demon'&&e.mgBoss);let hp0=0;
  const tp=(x,y,z)=>{const p=P();p.x=x;p.y=y;p.z=z;p.vx=p.vy=p.vz=0;p.fallD=0;};
  return {
    0:()=>{V.startNewWorld('ogtrace','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;},
    150:()=>{const F=V.mgF();V.forceChunksNear(986,1000);V.forceChunksNear(1000,1000);tp(986.5,F,1000.5);P().yaw=-Math.PI/2;P().pitch=0;},
    160:()=>{const p=P();if(V.mgArena(p.x,p.y,p.z))out.notes.push('plate');V.mgSkipTo(1);},
    260:()=>{const b=boss();if(b){hp0=b.hp;}},
    262:()=>{const b=boss();if(b&&V.mgHitAs(b,9,'Dan','melee')>0)out.notes.push('hit');},
    300:()=>{const b=boss();if(b)V.mgHitAs(b,9,'Dan','melee');},
    340:()=>{V.GR.dayCycle=false;V.setTime(0.8);},
    360:()=>{const p=P();if(!p.dead){p.hurtT=0;p.hp=1;V.mgHit(p,6,0.4,'slap');}if(V.P.dead)out.notes.push('died');},
    380:()=>{if(V.P.dead){V.respawn();out.notes.push('respawn');}},
    420:()=>{const F=V.mgF();V.forceChunksNear(986,1000);tp(986.5,F,1000.5);},
    430:()=>{V.mgSkipTo(1);},
    470:()=>{const s=V.snapshot('ogtrace');V.applySave(JSON.parse(JSON.stringify(s)));out.notes.push('reload');},
    500:()=>{const F=V.mgF();V.forceChunksNear(986,1000);tp(986.5,F,1000.5);},
    520:()=>{const p=P();tp(p.x-240,70,p.z);V.forceChunksNear(p.x,p.z);V.GR.god=true;},
    560:()=>{V.setTime(0.3);},
  };}
/* the creativity session (600 frames, v6.2). Everything goes through the real doUse/doMine paths except the editors' own
   strokes: the work is started and finished through the c0 editor API (crStartWork/crEndWork), with C1/C2's codecs when they are
   real and the stubs' values otherwise (identical in both builds). */
function creaAct(V,out){const B=V.B,P=()=>V.P;let o=null,deckN=0;
  const aim=(x,y,z)=>{const p=P(),dx=x-p.x,dy=y-(p.y+p.eyeY),dz=z-p.z;p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(dy,Math.hypot(dx,dz));};
  const hold=id=>{const p=P();if(!id)return;let i=p.inv.findIndex(s=>s&&s.id===id);if(i<0){i=p.inv.findIndex(s=>!s);p.inv[i]={id,count:1};}
    if(i>=9){const t=p.inv[8];p.inv[8]=p.inv[i];p.inv[i]=t;i=8;}p.sel=i;V.refreshHand();};
  const work=k=>{const p=P();const s=p.inv.find(q=>q&&V.crWorkN(q.id)&&V.crRec(V.crWorkN(q.id)).k===k);return s?s.id:0;};
  const A={
    0:()=>{V.startNewWorld('ogtrace','1337','s');V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;},
    150:()=>{const p=P(),x=Math.floor(p.x),y=Math.floor(p.y),z=Math.floor(p.z);o={x,y,z};          /* a little studio: floor, back wall */
      for(let dx=-1;dx<=5;dx++)for(let dz=-4;dz<=4;dz++){V.setBlock(x+dx,y-1,z+dz,B.STONE);for(let dy=0;dy<=4;dy++)V.setBlock(x+dx,y+dy,z+dz,dx===5?B.STONE:B.AIR);}
      p.x=x+0.5;p.z=z+0.5;p.y=y;p.vx=p.vy=p.vz=0;p.fallD=0;},
    160:()=>{hold(B.CR_EASEL);aim(o.x+2.5,o.y-0.02,o.z+0.5);V.MB.r=true;},                      /* place an easel on the floor */
    162:()=>{V.MB.r=false;if(V.getBlock(o.x+2,o.y,o.z)===B.CR_EASEL)out.notes.push('easel');},
    170:()=>{P().inv[P().sel]=null;V.refreshHand();aim(o.x+2.5,o.y+0.5,o.z+0.5);V.MB.r=true;},  /* open it (empty hand) */
    172:()=>{V.MB.r=false;const c=V.getCR().CRF.ctx;if(V.crOn()&&c){out.notes.push('ui');
        const art=typeof V.crArtEncode==='function'?V.crArtEncode(new Uint8Array(64*64).map((_,i)=>(i*7)%25),64,64):'';
        V.crStartWork(c,{w:64,h:64,d:art});V.crEndWork(c,'Trace');V.crUIClose();}},
    200:()=>{hold(work('art'));aim(o.x+5,o.y+1.5,o.z+0.5);V.MB.r=true;},                      /* hang it on the back wall */
    202:()=>{V.MB.r=false;if(V.getBlock(o.x+4,o.y+1,o.z)===B.CR_PAINT)out.notes.push('hung');},
    250:()=>{const p=P();p.inv[p.sel]=null;V.refreshHand();aim(o.x+4.5,o.y+1.5,o.z+0.5);V.MB.l=true;},  /* take it down by hand */
    268:()=>{V.MB.l=false;},
    270:()=>{const p=P();p.x=o.x+3.5;p.z=o.z+0.5;p.vx=p.vz=0;},
    290:()=>{if(work('art')&&V.getBlock(o.x+4,o.y+1,o.z)!==B.CR_PAINT)out.notes.push('down');
      hold(B.CR_DECK);aim(o.x+2.5,o.y-0.02,o.z+2.5);V.MB.r=true;},                            /* a record player */
    292:()=>{V.MB.r=false;},
    300:()=>{const p=P();p.inv[p.sel]=null;V.refreshHand();aim(o.x+2.5,o.y+0.5,o.z+2.5);V.MB.r=true;},
    302:()=>{V.MB.r=false;const c=V.getCR().CRF.ctx;if(V.crOn()&&c){const song=typeof V.crSongBlank==='function'?V.crSongBlank():{v:1};
        deckN=V.crStartWork(c,{d:song});V.crEndWork(c,'Trace Song');V.crUIClose();}},
    320:()=>{hold(B.CR_JUKE);aim(o.x+2.5,o.y-0.02,o.z-1.5);V.MB.r=true;},                      /* a jukebox */
    322:()=>{V.MB.r=false;},
    330:()=>{hold(work('song'));aim(o.x+2.5,o.y+0.5,o.z-1.5);V.MB.r=true;},                    /* play the disc */
    332:()=>{V.MB.r=false;const b=V.crBE((o.x+2)+','+o.y+','+(o.z-2));if(b&&b.id&&V.crWorkN(b.id)===deckN)out.notes.push('play');},
    340:()=>{V.GR.dayCycle=false;V.setTime(0.8);},
    400:()=>{const p=P();p.inv[p.sel]=null;V.refreshHand();aim(o.x+2.5,o.y+0.5,o.z-1.5);V.MB.r=true;},  /* eject */
    402:()=>{V.MB.r=false;if(work('song'))out.notes.push('eject');},
    480:()=>{const s=V.snapshot('ogtrace');V.applySave(JSON.parse(JSON.stringify(s)));},             /* save round trip */
    520:()=>{if(V.crInfo().works===2&&work('song')&&work('art'))out.notes.push('reload');hold(work('art'));V.setCam(1);},
    560:()=>{V.setTime(0.3);},
    590:()=>{V.setCam(0);},
  };
  return A;}
/* the purgatory session (600 frames). Each step that needs a package still on its stub is skipped (both builds carry the same
   PART 55 and the same stubs, so skipping is symmetric and the digests still compare). */
function purgAct(V,out){const B=V.B,IT=V.IT,st=V.mpInfo().stubs,P=()=>V.P;
  const aim=(x,y,z)=>{const p=P(),dx=x-p.x,dy=y-(p.y+p.eyeY),dz=z-p.z;p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(dy,Math.hypot(dx,dz));};
  let door=null;
  const A={
    0:()=>{V.startNewWorld('ogtrace','1337','s');V.GR.snail=false;V.GR.jsc=0;},
    160:()=>{door=V.mpDoorHere();},                                                        /* the Debug seam: a door 7 m ahead */
    166:()=>{const p=P(),d=door;p.x=d.x+0.5+d.f[0]*3;p.z=d.z+0.5+d.f[1]*3;p.y=d.y+0.05;p.vx=p.vy=p.vz=0;p.sel=0;p.inv[0]=null;V.refreshHand();},
    176:()=>{aim(door.x+0.5,door.y+1.0,door.z+0.5);V.MB.r=true;},                         /* empty hand: the frog looks up */
    178:()=>{V.MB.r=false;},
    184:()=>{aim(door.x+0.5,door.y+1.0,door.z+0.5);V.MB.r=true;},                         /* again within 5 s: the bite */
    186:()=>{V.MB.r=false;},
    214:()=>{V.KEY.Space=true;},                                                            /* skip the cutscene */
    216:()=>{V.KEY.Space=false;},
    290:()=>{if(st.indexOf('2')>=0)return;const p=P(),x=Math.floor(p.x)+2,z=Math.floor(p.z);   /* a Felt Sleeve, punched bare-handed */
      V.setBlock(x,Math.floor(p.y),z,B.PG_SLEEVE);p.sel=8;p.inv[8]=null;aim(x+0.5,Math.floor(p.y)+0.5,z+0.5);V.MB.l=true;},
    372:()=>{V.MB.l=false;if(st.indexOf('2')>=0)return;const p=P();p.inv[2]={id:IT.PG_FELT,count:3};p.inv[3]={id:IT.PG_ROD,count:2};
      const ok=typeof V.piCraftSeam==='function'&&V.piCraftSeam(IT.PG_FLOPPY,'pcan');if(ok)out.notes.push('craft');},
    380:()=>{const p=P();p.inv[1]={id:B.PG_DECK,count:8};p.sel=1;V.refreshHand();p.yaw=Math.PI;p.pitch=-0.9;V.MB.r=true;},  /* place a Stage Deck */
    384:()=>{V.MB.r=false;},
    400:()=>{if(st.indexOf('3')>=0)return;const p=P();V.spawnMob('pgwhat',p.x+3,p.y+0.5,p.z+2);},
    410:()=>{if(st.indexOf('3')>=0)return;const e=V.entities.find(m=>m.mt==='pgwhat'&&!m.dead);if(e){e.hurtT=0;V.hurtMob(e,3,0.5,0);out.notes.push('blank');}},
    420:()=>{if(st.indexOf('3')>=0)return;const e=V.entities.find(m=>m.mt==='pgwhat'&&!m.dead);if(e){e.hurtT=0;V.hurtMob(e,999,0,0);}},
    440:()=>{if(st.indexOf('4')>=0)return;if(V.mpSkip(1))out.notes.push('bomber');},          /* one the Demolitionist plunge cycle runs 440-555 */
    560:()=>{V.mpExitNow({abandon:true});},
  };
  return A;}
