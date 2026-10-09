/* ---- PART 56: c2_song.js ---- */
/* PART 56 c2 (C2, music): the song format (Creativity Update plan, section 8.3).
   A song is the work's payload (rec.d, plain JSON, <= CRC.MAX_D.song chars), saved through crSetData:
     {v:1, bpm:60..200, bars:1..8, key:-6..6, tr:[{i:inst, o:-2..2, vol:0..10, m:0|1, n:notes}, ... up to 6]}
   notes: a string of 3 base64url characters per note (15 bits: step | row<<7 | (len-1)<<11), sorted by step then row. It holds exactly
   the plan's [[step,row,len],...] triples, three times smaller, so the 6,000-char cap fits ~1,900 notes instead of ~600; the array
   form is accepted on load too. step 0..bars*16-1, row 0..14 (two octaves of C major, bottom up) or 0..3 for the drum kit (kick,
   snare, hat, clap), len 1..16 steps (drums: always 1), step+len <= bars*16, and notes in one row of a track never overlap.
   Nothing here touches the world, the clock or Math.random: the format and the maths are pure. */
const CR_INST=[
  {k:'piano',n:'Piano',c:'#4f8fd8',oct:0,mel:1,g:0.7},
  {k:'bass',n:'Bass',c:'#9a62d6',oct:-1,mel:1,g:0.8},
  {k:'lead',n:'Lead Synth',c:'#e0533f',oct:0,mel:1,g:0.5},
  {k:'pluck',n:'Pluck Guitar',c:'#e8912e',oct:0,mel:1,g:0.75},
  {k:'bells',n:'Bells',c:'#d9b526',oct:1,mel:1,g:0.32},          /* v6.2 review: 0.55 was ~7 dB (A-weighted) over the piano */
  {k:'drums',n:'Drum Kit',c:'#3fae5a',oct:0,mel:0,g:0.85}];
/* constants: steps per bar, limits, the scale (semitones above C of each melodic row, bottom up), drum rows, names */
const CRS=Object.freeze({STEPS:16,BARS:8,TRACKS:6,ROWS:15,DROWS:4,BPM0:60,BPM1:200,KEY:6,OCT:2,VOL:10,LEN:16,C4:261.6255653005986,
  SCALE:Object.freeze([0,2,4,5,7,9,11,12,14,16,17,19,21,23,24]),DRUM:Object.freeze(['Kick','Snare','Hat','Clap']),
  NOTE:Object.freeze(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']),
  B64:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'});
var CRS_IX=(()=>{const o=Object.create(null);CR_INST.forEach((x,i)=>{o[x.k]=i;});return o;})();
function crSongInst(k){const i=CRS_IX[k];return i===undefined?null:CR_INST[i];}
function crSongRows(k){const I=crSongInst(k);return I&&!I.mel?CRS.DROWS:CRS.ROWS;}
/* the payload of a new song: 120 BPM, 2 bars, an empty piano and an empty drum kit */
function crSongBlank(){return {v:1,bpm:120,bars:2,key:0,tr:[crSongTrack('piano'),crSongTrack('drums')]};}
function crSongTrack(i){return {i,o:0,vol:8,m:0,n:''};}
function crSongStep(bpm){return 60/bpm/4;}                       /* seconds per step (a 16th note) */
function crSongLen(d){const m=crSongNorm(d);return m.bars*CRS.STEPS*crSongStep(m.bpm);}
/* pitch of a melodic row: C4 * 2^((scale[row] + 12*(octave + the instrument's own octave) + key)/12) */
function crSongSemi(k,row,o,key){const I=crSongInst(k)||CR_INST[0];return CRS.SCALE[row]+12*((o|0)+I.oct)+(key|0);}
function crSongFreq(k,row,o,key){return CRS.C4*Math.pow(2,crSongSemi(k,row,o,key)/12);}
function crSongNoteName(k,row,o,key){const I=crSongInst(k);if(!I||!I.mel)return CRS.DRUM[row]||'?';
  const s=crSongSemi(k,row,o,key)+48;return CRS.NOTE[((s%12)+12)%12]+Math.floor(s/12);}
/* ---- note codec ---- */
function crSongPackN(n){const A=CRS.B64;let s='';for(const q of n){const v=q[0]|(q[1]<<7)|((q[2]-1)<<11);s+=A[(v>>12)&63]+A[(v>>6)&63]+A[v&63];}return s;}
function crSongUnpackN(s){const out=[];if(typeof s!=='string')return out;const A=CRS.B64;
  for(let i=0;i+2<s.length;i+=3){const a=A.indexOf(s[i]),b=A.indexOf(s[i+1]),c=A.indexOf(s[i+2]);if(a<0||b<0||c<0||a>7)return null;
    const v=(a<<12)|(b<<6)|c;out.push([v&127,(v>>7)&15,((v>>11)&15)+1]);}
  return s.length%3?null:out;}
const crSongInt=(v,a,b,dflt)=>typeof v==='number'&&isFinite(v)&&Math.round(v)===v&&v>=a&&v<=b?v:dflt;
/* the strict check: true for any payload the editor can produce (packed or the plan's array notes), false for anything else */
function crSongValid(d){try{
  if(!d||typeof d!=='object'||Array.isArray(d)||d.v!==1)return false;
  if(crSongInt(d.bpm,CRS.BPM0,CRS.BPM1,null)===null||crSongInt(d.bars,1,CRS.BARS,null)===null)return false;
  if(d.key!==undefined&&crSongInt(d.key,-CRS.KEY,CRS.KEY,null)===null)return false;
  if(!Array.isArray(d.tr)||d.tr.length>CRS.TRACKS)return false;
  const S=d.bars*CRS.STEPS;
  for(const t of d.tr){if(!t||typeof t!=='object'||!crSongInst(t.i))return false;
    if(crSongInt(t.o,-CRS.OCT,CRS.OCT,null)===null||crSongInt(t.vol,0,CRS.VOL,null)===null||(t.m!==0&&t.m!==1))return false;
    const n=Array.isArray(t.n)?t.n:crSongUnpackN(t.n);if(!n)return false;
    const R=crSongRows(t.i),mel=crSongInst(t.i).mel,end={};
    for(const q of n){if(!Array.isArray(q)||q.length!==3)return false;const s=crSongInt(q[0],0,S-1,null),r=crSongInt(q[1],0,R-1,null),l=crSongInt(q[2],1,CRS.LEN,null);
      if(s===null||r===null||l===null||s+l>S||(!mel&&l!==1))return false;
      if(end[r]!==undefined&&s<end[r])return false;end[r]=s+l;}            /* sorted by step within a row, never overlapping */
  }
  return JSON.stringify(d).length<=(typeof CRC!=='undefined'?CRC.MAX_D.song:6000);}catch(e){return false;}}
/* the forgiving loader: ANY value -> a valid song model (notes as [step,row,len] arrays). Out-of-range fields clamp or fall back,
   bad notes are dropped, overlaps are trimmed. crSongRender and the editor only ever see its output. */
function crSongNorm(d){const m={v:1,bpm:120,bars:1,key:0,tr:[]};
  if(!d||typeof d!=='object'||Array.isArray(d))return m;
  const cl=(v,a,b,df)=>typeof v==='number'&&isFinite(v)?Math.max(a,Math.min(b,Math.round(v))):df;
  m.bpm=cl(d.bpm,CRS.BPM0,CRS.BPM1,120);m.bars=cl(d.bars,1,CRS.BARS,1);m.key=cl(d.key,-CRS.KEY,CRS.KEY,0);
  const S=m.bars*CRS.STEPS;
  if(Array.isArray(d.tr))for(const t of d.tr.slice(0,CRS.TRACKS)){if(!t||typeof t!=='object'||!crSongInst(t.i))continue;
    const I=crSongInst(t.i),R=crSongRows(t.i),raw=Array.isArray(t.n)?t.n:(crSongUnpackN(t.n)||[]),n=[];
    for(const q of raw){if(!Array.isArray(q))continue;const s=Math.round(+q[0]),r=Math.round(+q[1]);let l=I.mel?Math.round(+q[2]):1;
      if(!(s>=0&&s<S&&r>=0&&r<R))continue;if(!(l>=1))l=1;l=Math.min(l,CRS.LEN,S-s);n.push([s,r,l]);}
    n.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const last={},keep=[];for(const q of n){const p=last[q[1]];                /* an overlap trims the earlier note (same start: the later one wins) */
      if(p){if(q[0]===p[0])keep.splice(keep.indexOf(p),1);else if(q[0]<p[0]+p[2])p[2]=q[0]-p[0];}keep.push(q);last[q[1]]=q;}
    m.tr.push({i:t.i,o:cl(t.o,-CRS.OCT,CRS.OCT,0),vol:cl(t.vol,0,CRS.VOL,8),m:t.m?1:0,n:keep});}
  return m;}
/* model -> payload (packed notes); payload -> model is crSongNorm */
function crSongPack(m){return {v:1,bpm:m.bpm,bars:m.bars,key:m.key,tr:m.tr.map(t=>({i:t.i,o:t.o,vol:t.vol,m:t.m,n:crSongPackN(t.n)}))};}
function crSongCount(m){let c=0;for(const t of m.tr)c+=t.n.length;return c;}
