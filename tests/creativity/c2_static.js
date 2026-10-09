/* c2_static.js (C2, gate x1): music statics (the creativity plan section 8.6). The instrument table, the song format
   (good, edge and hostile payloads; the forgiving loader never throws and always yields a valid song), the note codec, the size cap of
   the largest everyday song, the render-length maths, the pitch maths and note names, the registrations (ui, thumb, tick, onReset,
   onDim, onJuke, onBE), the musicTick wrapper's place in the chain (PART 55 wraps it), the frozen interface exported, determinism
   hygiene of the C2 sources, and the item icons. */
'use strict';
const boot=require('../lib/c_boot.js'),{skip}=boot,ok=(n,c)=>{if(c&&process.env.C2_VERBOSE)console.log('ok   '+n);return boot.ok(n,c);};
const fs=require('fs');
const V=boot({});
boot.run(async()=>{
  if(boot.crStubbed('2')){skip('music statics','C2 is on its stub');return;}
  const I=V.CR_INST,S=V.CRS,G=fs.readFileSync(boot.BUILD+'game.js','utf8'),GD=boot.SRC.cr;
  /* ---- instruments ---- */
  ok('six instruments in UI order: Piano, Bass, Lead Synth, Pluck Guitar, Bells, Drum Kit',I.length===6&&I.map(x=>x.k).join()==='piano,bass,lead,pluck,bells,drums'&&
    I.map(x=>x.n).join()==='Piano,Bass,Lead Synth,Pluck Guitar,Bells,Drum Kit');
  ok('each has a distinct #rrggbb colour, a level 0..1, melodic flags (only the drum kit is not) and its own octave (bass -1, bells +1)',
    I.every(x=>/^#[0-9a-f]{6}$/.test(x.c)&&x.g>0&&x.g<=1)&&new Set(I.map(x=>x.c)).size===6&&I.filter(x=>!x.mel).map(x=>x.k).join()==='drums'&&
    I.find(x=>x.k==='bass').oct===-1&&I.find(x=>x.k==='bells').oct===1&&I.find(x=>x.k==='piano').oct===0);
  ok('limits: 16 steps a bar, 1-8 bars, 6 tracks, 15 melodic rows (C major, two octaves), 4 drums, 60-200 BPM, key +-6, octave +-2, volume 0-10, notes up to 16 steps',
    S.STEPS===16&&S.BARS===8&&S.TRACKS===6&&S.ROWS===15&&S.DROWS===4&&S.BPM0===60&&S.BPM1===200&&S.KEY===6&&S.OCT===2&&S.VOL===10&&S.LEN===16&&
    JSON.stringify(S.SCALE)==='[0,2,4,5,7,9,11,12,14,16,17,19,21,23,24]'&&S.DRUM.join()==='Kick,Snare,Hat,Clap');
  /* ---- the blank song ---- */
  const b=V.crSongBlank();
  ok('crSongBlank: valid, v1, 120 BPM, 2 bars, key 0, an empty piano and an empty drum kit at volume 8',V.crSongValid(b)&&b.v===1&&b.bpm===120&&b.bars===2&&b.key===0&&
    b.tr.length===2&&b.tr[0].i==='piano'&&b.tr[1].i==='drums'&&b.tr.every(t=>t.n===''&&t.vol===8&&t.o===0&&t.m===0));
  ok('crSongBlank returns a fresh object each time',V.crSongBlank()!==b&&V.crSongBlank().tr!==b.tr);
  /* ---- format: good, edge, hostile ---- */
  const T=(i,n,x)=>Object.assign({i,o:0,vol:8,m:0,n},x||{}),song=(tr,x)=>Object.assign({v:1,bpm:120,bars:2,key:0,tr},x||{});
  const good=[song([T('piano',[[0,0,1],[4,14,16],[20,7,12]])]),song([T('drums',[[0,0,1],[0,1,1],[0,2,1],[0,3,1]])]),
    song([T('bass',[[0,0,16],[16,0,16]])],{bars:2}),song([T('lead',[[127,3,1]])],{bars:8,bpm:60,key:-6}),song([],{bpm:200,bars:1,key:6}),
    song([T('bells',[[0,0,1]],{o:2,vol:0,m:1}),T('pluck',[[1,1,1]],{o:-2,vol:10})]),song(['piano','bass','lead','pluck','bells','drums'].map(i=>T(i,[])))];
  ok('good and edge payloads are valid (plan array notes, every limit at both ends, six tracks)',good.every(d=>V.crSongValid(d)));
  ok('... and so are their packed forms, which round-trip exactly',good.every(d=>{const p=V.crSongPack(V.crSongNorm(d));return V.crSongValid(p)&&p.tr.every(t=>typeof t.n==='string')&&
    JSON.stringify(V.crSongPack(V.crSongNorm(p)))===JSON.stringify(p);}));
  const hostile=[null,undefined,0,'song',[],{},{v:2,bpm:120,bars:1,tr:[]},song([],{bpm:59}),song([],{bpm:201}),song([],{bpm:NaN}),song([],{bpm:'120'}),song([],{bpm:120.5}),
    song([],{bars:0}),song([],{bars:9}),song([],{key:7}),song([],{key:-7}),song([T('tuba',[])]),song([T('piano',[],{o:3})]),song([T('piano',[],{vol:11})]),
    song([T('piano',[],{m:2})]),song(Array.from({length:7},()=>T('piano',[]))),song([T('piano',[[32,0,1]])]),song([T('piano',[[0,15,1]])]),
    song([T('piano',[[0,0,17]])]),song([T('piano',[[30,0,4]])]),song([T('piano',[[0,0,4],[2,0,1]])]),song([T('drums',[[0,4,1]])]),song([T('drums',[[0,1,2]])]),
    song([T('piano','AB')]),song([T('piano','A*A')]),song([T('piano','~~~')]),song([T('piano',[[0,0]])]),song([T('piano',[[-1,0,1]])]),
    song([T('piano',Array.from({length:2100},(_,k)=>[k%32,k%15,1]))]),{v:1,bpm:120,bars:1,x:[1,2,3]},{v:1},'y'.repeat(5900)];
  const hv=hostile.map(d=>{try{return V.crSongValid(d);}catch(e){return 'throw';}});
  ok('hostile payloads are all invalid ('+hostile.length+': wrong types, versions, out-of-range fields, unknown instruments, 7 tracks, notes off the grid, overlaps, '+
    'long drum hits, broken packing, oversize)'+(hv.some(x=>x!==false)?' (accepted: '+hv.map((x,i)=>x!==false?i:null).filter(x=>x!==null).join(',')+')':''),hv.every(x=>x===false));
  let normBad=0;const R=V.crCore().mulberry32(20261007);const junk=()=>{const pick=R();if(pick<0.15)return R()*1e6-5e5;if(pick<0.3)return 'x'.repeat((R()*9)|0);if(pick<0.4)return null;
    if(pick<0.5)return [junk(),junk(),junk()];if(pick<0.6)return {i:['piano','drums','bells','zz'][(R()*4)|0],o:junk(),vol:junk(),m:junk(),n:R()<0.5?'AAAB_x':[[junk(),junk(),junk()],[(R()*40)|0,(R()*16)|0,(R()*20)|0]]};
    return (R()*20-5)|0;};
  for(let k=0;k<400;k++){const d={v:junk(),bpm:junk(),bars:junk(),key:junk(),tr:R()<0.8?Array.from({length:(R()*9)|0},()=>R()<0.7?{i:['piano','bass','drums','x'][(R()*4)|0],o:junk(),vol:junk(),m:junk(),n:R()<0.5?[[junk(),junk(),junk()],[(R()*40)|0,(R()*16)|0,(R()*20)|0],[(R()*40)|0,(R()*16)|0,(R()*20)|0]]:'AAA'+String(junk())}:junk()):junk()};
    try{const m=V.crSongNorm(d);if(!V.crSongValid(V.crSongPack(m)))normBad++;}catch(e){normBad++;}}
  ok('the forgiving loader never throws and always yields a valid song (400 random junk payloads)',normBad===0);
  ok('the loader clamps instead of failing: bpm 999 -> 200, bars 0 -> 1, octave 9 -> 2, a 30-step note -> 16, overlapping notes trimmed',(()=>{
    const m=V.crSongNorm(song([T('piano',[[0,0,30],[4,0,2],[2,1,1]],{o:9})],{bpm:999,bars:0}));
    return m.bpm===200&&m.bars===1&&m.tr[0].o===2&&JSON.stringify(m.tr[0].n)==='[[0,0,4],[2,1,1],[4,0,2]]';})());
  /* ---- the note codec ---- */
  let codec=true;for(let k=0;k<200;k++){const n=[];const c=(R()*60)|0;for(let j=0;j<c;j++)n.push([(R()*128)|0,(R()*15)|0,1+((R()*16)|0)]);
    const p=V.crSongPackN(n),u=V.crSongUnpackN(p);if(p.length!==3*n.length||JSON.stringify(u)!==JSON.stringify(n)||!/^[A-Za-z0-9_-]*$/.test(p))codec=false;}
  ok('the note codec: 3 URL-safe characters per note, exact round trip (200 random note lists)',codec);
  ok('a broken note string unpacks to null (never garbage)',V.crSongUnpackN('AB')===null&&V.crSongUnpackN('A*A')===null&&V.crSongUnpackN('~~~')===null&&JSON.stringify(V.crSongUnpackN(''))==='[]');
  /* ---- size ---- */
  const busy=V.crSongPack(V.crSongNorm(song(['piano','bass','lead','pluck','bells','drums'].map((i,k)=>T(i,Array.from({length:128},(_,s)=>[s,i==='drums'?s%4:(s*7+k)%15,1]))),{bars:8})));
  const bl=JSON.stringify(busy).length;
  ok('the busiest everyday song (six tracks, eight bars, a note on every step = 768 notes) is '+bl+' chars, well inside the 6,000 cap',V.crSongValid(busy)&&bl<6000&&V.crSongCount(V.crSongNorm(busy))===768);
  const chords=V.crSongPack(V.crSongNorm(song(['piano','bass','lead','pluck','drums'].map(i=>T(i,Array.from({length:i==='drums'?256:384},(_,k)=>i==='drums'?[k>>1,k&1?2:0,1]:[k/3|0,(k%3)*4,1]))),{bars:8})));
  ok('even three-note chords on every step of four tracks plus a double drum line (1,792 notes) fit: '+JSON.stringify(chords).length+' chars',V.crSongCount(V.crSongNorm(chords))===1792&&JSON.stringify(chords).length<=6000&&V.crSongValid(chords));
  /* ---- render length maths ---- */
  ok('crSongLen: 1 bar at 120 BPM = 2 s, 8 bars at 60 = 32 s, 3 bars at 97 = 7.4227 s, junk = 1 bar at 120',Math.abs(V.crSongLen(song([],{bars:1}))-2)<1e-12&&
    Math.abs(V.crSongLen(song([],{bars:8,bpm:60}))-32)<1e-12&&Math.abs(V.crSongLen(song([],{bars:3,bpm:97}))-3*240/97)<1e-12&&V.crSongLen('junk')===2);
  const lens=[[120,1,44100],[97,3,48000],[200,8,22050]].every(([bpm,bars,sr])=>{const d=song([T('piano',[[0,0,1]])],{bpm,bars});return V.crSongRender(d,sr).length===Math.round(V.crSongLen(d)*sr);});
  ok('crSongRender returns exactly round(len x sr) samples, a Float32Array, at any sample rate (default 44,100)',lens&&V.crSongRender(b) instanceof Float32Array&&V.crSongRender(b).length===Math.round(4*44100));
  ok('junk payloads render silence of the right length and never throw',[null,'x',{v:1,bpm:120,bars:1,x:[1,2,3]},{v:1}].every(d=>{try{const x=V.crSongRender(d,8000);return x.length===16000&&x.every(v=>v===0);}catch(e){return false;}}));
  /* ---- pitch maths and names ---- */
  const f0=V.crSongFreq('piano',0,0,0);
  ok('pitch: piano row 0 = 261.626 Hz (C4), +1 row = D, row 7 = C5, Oct +1 doubles, key +12 would double, bass halves, bells double, drums have names',Math.abs(f0-261.6256)<0.001&&
    Math.abs(V.crSongFreq('piano',1,0,0)/f0-Math.pow(2,2/12))<1e-12&&Math.abs(V.crSongFreq('piano',7,0,0)/f0-2)<1e-12&&Math.abs(V.crSongFreq('piano',0,1,0)/f0-2)<1e-12&&
    Math.abs(V.crSongFreq('piano',0,0,6)/f0-Math.pow(2,0.5))<1e-12&&Math.abs(V.crSongFreq('bass',0,0,0)/f0-0.5)<1e-12&&Math.abs(V.crSongFreq('bells',0,0,0)/f0-2)<1e-12);
  ok('note names: piano C4 D4 E4 F4 G4 A4 B4 C5 ... C6, bass from C3, bells from C5, key +1 -> C#4, octave -2 -> C2, drums Kick Snare Hat Clap',
    [0,1,2,3,4,5,6,7,14].map(r=>V.crSongNoteName('piano',r,0,0)).join()==='C4,D4,E4,F4,G4,A4,B4,C5,C6'&&V.crSongNoteName('bass',0,0,0)==='C3'&&
    V.crSongNoteName('bells',0,0,0)==='C5'&&V.crSongNoteName('piano',0,0,1)==='C#4'&&V.crSongNoteName('piano',0,-2,0)==='C2'&&[0,1,2,3].map(r=>V.crSongNoteName('drums',r,0,0)).join()==='Kick,Snare,Hat,Clap');
  /* ---- registrations ---- */
  const RG=V.CRREG;
  ok('registered: ui.music (open/close/key), thumb.song, a tick for the jukeboxes and one for the editor, onReset, onDim, onJuke, onBE',RG.ui.music===V.crMusicUI&&
    ['open','close','key'].every(k=>typeof RG.ui.music[k]==='function')&&RG.thumb.song===V.crSongThumb&&RG.tick.includes(V.crJukeTick)&&RG.tick.length>=2&&
    RG.onReset.includes(V.crJukeReset)&&RG.onDim.length>=1&&RG.onJuke.length>=1&&RG.onBE.length>=1);
  const iw=G.indexOf('musicTick=function(){if(crDuckNow())return;crMus0();};'),i55=G.indexOf('const mwMusic0=musicTick;');
  ok('the musicTick wrapper is in PART 56 once, before PART 55\u2019s (which wraps it in turn); boot binds the final one',iw>0&&G.split('musicTick=function(){if(crDuckNow())return;crMus0();};').length===2&&
    (i55<0||iw<i55)&&G.indexOf('/* ---- PART 56: ')<iw&&iw<G.indexOf('/* ---- PART 55: p0_contract.js ---- */')&&G.indexOf('setInterval(musicTick,300)')>0);
  ok('the frozen interface is exported: CR_INST, crSongBlank, crSongValid, crSongLen, crSongRender, crSongThumb, crDuckNow, crMusicUI',
    ['CR_INST','crSongBlank','crSongValid','crSongLen','crSongRender','crSongThumb','crDuckNow','crMusicUI'].every(k=>V[k]!==undefined&&V.__crx[k]===V[k]));
  /* ---- source hygiene ---- */
  const files=fs.readdirSync(GD).filter(f=>/^c2_[A-Za-z0-9_]+\.js$/.test(f)),src=files.map(f=>boot.readSrc(GD+f,{legacy:true})).join('\n'),code=src.replace(/\/\*[\s\S]*?\*\//g,'');
  ok('C2 is '+files.join(', ')+' ('+Buffer.byteLength(src)+' B, under 120,000)',files.length>=3&&Buffer.byteLength(src)<120000);
  ok('no Math.random, Date.now or performance.now anywhere in C2 (the synth is seeded; the playhead uses the audio clock or the game clock)',!/Math\.random|Date\.now|performance\.now/.test(code));
  ok('C2 creates no AudioContext of its own: it only ever plays through the game\u2019s audio()',!/new\s*\(?\s*(window\.)?(webkit)?AudioContext/.test(code)&&/audio\(\)/.test(code));
  ok('C2 sources are ASCII (unicode as \\u escapes) and HTML-safe',/^[\x09\x0a\x20-\x7e]*$/.test(src)&&!/<\/script|<!--/i.test(src));
  /* ---- icons ---- */
  {const C=V.crCore(),a=V.crNew('song',{d:b}),z=V.crNew('song',{d:b});V.crFinish(z,'Icon Test','Dan');
    ok('the Demo Tape and the Music Disc get their own 48x48 icons from crSongThumb (cassette / record with a title colour)',!!C.ICONS[V.crItemId(a)]&&!!C.ICONS[V.crItemId(z)]&&
      C.ICONS[V.crItemId(a)].width===48&&V.DEFS[V.crItemId(z)].name==='Music Disc: Icon Test');
    let calls=0;const g=new Proxy({},{get:(t,k)=>k==='fillStyle'||k==='strokeStyle'||k==='lineWidth'?undefined:(()=>{calls++;})});
    V.crSongThumb({k:'song',st:'wip',t:''},g,48);const c1=calls;calls=0;V.crSongThumb({k:'song',st:'done',t:'Abc'},g,48);
    ok('the thumbnail painter draws both forms ('+c1+' and '+calls+' calls) without throwing',c1>10&&calls>10);
    V.crDiscard(a);}
});
