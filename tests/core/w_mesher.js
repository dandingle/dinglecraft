/* w_mesher.js (v6.10): the mesher builds the v6.9 mesh float for float (reference: tests/fixtures/mesher_ref_v6.9.js)
   on loaded, fuzzed and edited chunks, and the comparison can fail. */
'use strict';
const fs=require('fs'),vm=require('vm');
const P=require('../lib/paths.js');
let pass=0,fail=0;
const ok=(n,c)=>{if(c)pass++;else{fail++;console.log('FAIL '+n);}};

const game=fs.readFileSync(P.BUILD+'game.js','utf8')+'\n'+fs.readFileSync(P.FIX+'mesher_ref_v6.9.js','utf8')+
  '\n;global.__WM={meshChunk,meshChunk_ref,createChunk,chunks,ckey,DEFS,B,CH,WH};\n';
require(P.STUBS);
vm.runInThisContext('(function(){'+game+'\n})();',{filename:'game.js + mesher_ref_v6.9.js'});
const V=global.__vox,M=global.__WM;
let seed=20261010;Math.random=()=>((seed=(seed*1103515245+12345)>>>0)/4294967296);

function diff(a,b){
  const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();
  if(ka.join()!==kb.join())return 'buckets '+ka+' vs '+kb;
  for(const k of ka){const x=a[k],y=b[k];
    if(x.vc!==y.vc)return k+'.vc '+x.vc+' vs '+y.vc;
    for(const f of ['p','n','u','c','ix']){
      if(x[f].length!==y[f].length)return k+'.'+f+' length '+x[f].length+' vs '+y[f].length;
      for(let i=0;i<x[f].length;i++)if(!Object.is(x[f][i],y[f][i]))return k+'.'+f+'['+i+'] '+x[f][i]+' vs '+y[f][i];}}
  return null;
}
function compare(list,tag){
  let n=0,bad=0,quads=0,first=null;
  for(const c of list){const a=M.meshChunk(c),b=M.meshChunk_ref(c),e=diff(a,b);n++;
    for(const k in b)quads+=b[k].vc/4;
    if(e){bad++;if(!first)first='chunk '+c.cx+','+c.cz+': '+e;}}
  ok(tag+': '+n+' chunks, '+quads+' quads, identical'+(first?' (first difference: '+first+')':''),n>0&&quads>0&&bad===0);
}

V.startNewWorld('mesher','4242','s');V.GR.snail=false;V.GR.jsc=0;
for(let i=1;i<=160;i++)V.frameStep(i*40);
ok('a world boots with chunks loaded',M.chunks.size>50&&typeof M.meshChunk==='function'&&typeof M.meshChunk_ref==='function');

/* 1 */
compare([...M.chunks.values()],'1 loaded chunks');

/* 2 */
const ids=Object.keys(M.DEFS).map(Number).filter(i=>i>0&&i<256&&M.DEFS[i]&&M.DEFS[i]._t);
ok('fuzz covers every block id with tiles ('+ids.length+')',ids.length>100);
const fz=[];
[.05,.2,.45,.7,.9,.99].forEach((den,r)=>{const F=3000+r*10;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const c=M.createChunk(F+dx,F+dz);
    for(let i=0;i<c.bl.length;i++){const q=Math.random();
      c.bl[i]=q>den?M.B.AIR:(q<den*.3?M.B.STONE:(q<den*.4?M.B.WATER:ids[(Math.random()*ids.length)|0]));}
    fz.push(c);}});
compare(fz,'2 fuzzed chunks');

/* 3 */
const pcx=Math.floor(V.P.x/M.CH),pcz=Math.floor(V.P.z/M.CH);
for(let e=0;e<400;e++){
  const x=Math.floor(V.P.x)+((Math.random()*40)|0)-20,z=Math.floor(V.P.z)+((Math.random()*40)|0)-20,y=(Math.random()*M.WH)|0;
  V.setBlock(x,y,z,Math.random()<.5?M.B.AIR:ids[(Math.random()*ids.length)|0]);}
const near=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const c=M.chunks.get(M.ckey(pcx+dx,pcz+dz));if(c)near.push(c);}
compare(near,'3 chunks after 400 edits');

/* 4 */
{const c=near[0],a=M.meshChunk(c),b=M.meshChunk_ref(c);
 const k=['op','cut','wat'].find(k=>a[k].c.length>0);
 a[k].c[a[k].c.length>>1]+=1e-12;
 ok('4 the comparison catches one perturbed float',diff(a,b)!==null);}

/* timing: reported, not asserted */
const real=near.slice(0,9),med=fn=>{for(const c of real)fn(c);const t=[];
  for(let r=0;r<9;r++){const t0=process.hrtime.bigint();for(const c of real)fn(c);t.push(Number(process.hrtime.bigint()-t0)/1e6/real.length);}
  t.sort((p,q)=>p-q);return t[4];};
const tn=med(M.meshChunk),tr=med(M.meshChunk_ref);
console.log('  remesh median: '+tn.toFixed(2)+' ms/chunk now, '+tr.toFixed(2)+' ms/chunk v6.9 ('+(tr/tn).toFixed(1)+'x)');

console.log(pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
