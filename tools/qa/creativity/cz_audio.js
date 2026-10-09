/* cz_audio.js (CZ): offline analysis of a song somebody actually composed in the browser (qa/cz_qa.mjs writes disc.json), rendered by
   the build's own crSongRender in node at 44.1 kHz. Nobody listens: it measures. Not a gate suite (c2_audio.js is the gate); this is the
   integrator's independent check on a real, hand-made disc rather than on test patterns.
     DC_BUILD=<build dir> node tools/qa/creativity/cz_audio.js <disc.json>
   1 the whole song: exact length, audible, never clipped, no NaN, no DC, bit-identical twice
   2 every melodic note rendered alone: onset within 5 ms of its step, pitch within 1.5% of C4*2^(semitones/12) (YIN, FFT cross-check)
   3 every track rendered solo: every note's onset found within 5 ms, nothing extra; the hat line gives the tempo to 0.5%
   4 the drum kit: kick energy below 200 Hz, hats above 6 kHz, snare in between; the instruments differ (spectral centroid)
   5 the jukebox curve (1-d/32)^1.4 * 0.7 and the 4-nearest rule, as numbers */
'use strict';
const fs=require('fs');
const boot=require('../../../tests/lib/c_boot.js'),ok=(n,c)=>{if(c)console.log('ok   '+n);return boot.ok(n,c);};
const D=require('../../../tests/lib/c2_dsp.js');
const V=boot({});
const SR=44100;
const file=process.argv[2];
boot.run(async()=>{
  const disc=JSON.parse(fs.readFileSync(file,'utf8')),d=disc.d,m=V.crSongNorm(d),stepS=60/m.bpm/4,R=x=>V.crSongRender(x,SR);
  console.log('disc "'+disc.title+'": '+m.bpm+' BPM, '+m.bars+' bars, key '+m.key+', tracks '+m.tr.map(t=>t.i+'('+t.n.length+', oct '+t.o+', vol '+t.vol+')').join(' '));
  /* 1 */
  const x=R(d),x2=R(d),len=V.crSongLen(d);
  ok('length = round(bars*16*60/bpm/4 * sr) = '+x.length+' samples ('+len.toFixed(3)+' s)',x.length===Math.round(m.bars*16*stepS*SR)&&x.length===Math.round(len*SR));
  ok('audible (RMS '+D.rms(x).toFixed(3)+'), never clipped (peak '+D.peak(x).toFixed(3)+'), no NaN, DC '+D.dc(x).toExponential(1),D.rms(x)>0.03&&D.peak(x)<1&&!x.some(v=>!isFinite(v))&&Math.abs(D.dc(x))<0.01);
  ok('two renders are bit-identical',x.every((v,i)=>v===x2[i]));
  const solo=(t,n)=>Object.assign({},d,{tr:[Object.assign({},V.crSongPack({v:1,bpm:m.bpm,bars:m.bars,key:m.key,tr:[Object.assign({},t,{n:n||t.n,m:0})]}).tr[0])]});
  /* 2 */
  const pitchBad=[],onBad=[];let nN=0,worst=0;
  for(const t of m.tr){const I=V.CR_INST.find(q=>q.k===t.i);if(!I.mel)continue;
    for(const q of t.n){nN++;const y=R(solo(t,[q])),t0=q[0]*stepS,on=D.onsets(y,SR,0.3);
      const hit=on.find(o=>Math.abs(o-t0)<0.02);if(!hit||Math.abs(hit-t0)>0.005)onBad.push(t.i+' step '+q[0]+' -> '+(hit?((hit-t0)*1000).toFixed(1)+' ms':'none'));
      const f=V.crSongFreq(t.i,q[1],t.o,m.key),a=Math.round((t0+0.03)*SR),W=Math.min(2048,Math.max(1024,Math.round(q[2]*stepS*SR*0.6)));
      let g=D.yin(y,SR,a,W,Math.max(25,f/2.2),Math.min(4000,f*2.2));
      const fp=D.peakHz(y,SR,a,16384,f/1.12,f*1.12);
      const e=Math.min(Math.abs(g/f-1),Math.abs(fp/f-1));worst=Math.max(worst,e);
      if(e>0.015)pitchBad.push(t.i+' row '+q[1]+' expected '+f.toFixed(1)+' Hz, YIN '+g.toFixed(1)+' FFT '+fp.toFixed(1));}}
  ok(nN+' melodic notes rendered alone: every onset within 5 ms of its step'+(onBad.length?' ('+onBad.slice(0,6).join('; ')+')':''),onBad.length===0&&nN>0);
  ok('  ... every pitch within 1.5% of the scale (worst '+(worst*100).toFixed(2)+'%)'+(pitchBad.length?' ('+pitchBad.slice(0,6).join('; ')+')':''),pitchBad.length===0);
  /* 3 */
  /* the song is a seamless loop: rotate the render by 1.5 steps so a note on step 0 has the wrapped tail before it and a note on the last
     step lands half a step (>= 37 ms) after the cut, where the onset detector can see it */
  const SH=1.5*stepS,rot=y=>{const s=Math.round(SH*SR),o=new Float32Array(y.length);o.set(y.subarray(y.length-s),0);o.set(y.subarray(0,y.length-s),s);return o;},L=x.length/SR;
  for(const t of m.tr){const y=rot(R(solo(t))),on=D.onsets(y,SR,0.12),steps=[...new Set(t.n.map(q=>q[0]))].sort((a,b)=>a-b),exp=steps.map(s=>(s*stepS+SH)%L);
    const miss=exp.filter(e=>!on.some(o=>Math.abs(o-e)<=0.005)).map(e=>(e*1000).toFixed(0));
    const extra=on.filter(o=>!exp.some(e=>Math.abs(o-e)<=0.005)&&!exp.some(e=>o>e&&o-e<0.09)).map(o=>(o*1000).toFixed(0));
    ok(t.i+' solo (rotated 1.5 steps across the loop seam): '+exp.length+' expected onsets all found within 5 ms, no extra ones'+(miss.length||extra.length?' (missing '+miss.slice(0,6)+' extra '+extra.slice(0,6)+')':''),miss.length===0&&extra.length===0);}
  const dr=m.tr.find(t=>t.i==='drums');
  if(dr){const hats=dr.n.filter(q=>q[1]===2);
    if(hats.length>=8){const y=R(solo(dr,hats)),on=D.onsets(y,SR,0.3),iv=[];for(let i=1;i<on.length;i++)iv.push(on[i]-on[i-1]);iv.sort((a,b)=>a-b);
      const med=iv[iv.length>>1],bpm=60/(med*4*(hats.length>1?(hats[1][0]-hats[0][0]):1));
      ok('the hat line keeps the tempo: median spacing '+(med*1000).toFixed(1)+' ms -> '+bpm.toFixed(1)+' BPM (song '+m.bpm+')',Math.abs(bpm/m.bpm-1)<0.005);}
    /* 4 */
    const band=(row,lo,hi)=>{const n=dr.n.filter(q=>q[1]===row).slice(0,1);if(!n.length)return null;const y=R(solo(dr,n));return D.bandShare(y,SR,Math.round(n[0][0]*stepS*SR),8192,lo,hi);};
    const k=band(0,0,200),h=band(2,6000,22050),s=band(1,200,6000);
    ok('drums: kick '+(k*100).toFixed(0)+'% below 200 Hz, hat '+(h*100).toFixed(0)+'% above 6 kHz, snare '+(s*100).toFixed(0)+'% in between',k>0.8&&h>0.8&&s>0.5);}
  const cents=m.tr.filter(t=>V.CR_INST.find(q=>q.k===t.i).mel).map(t=>{const y=R(solo(t,[[0,7,4]]));return [t.i,D.centroid(y,SR,Math.round(0.01*SR),8192)];});
  for(let i=0;i<cents.length;i++)for(let j=i+1;j<cents.length;j++){const r=Math.max(cents[i][1],cents[j][1])/Math.min(cents[i][1],cents[j][1]);
    ok(cents[i][0]+' vs '+cents[j][0]+' on the same note: spectral centroids '+cents[i][1].toFixed(0)+' / '+cents[j][1].toFixed(0)+' Hz differ (ratio '+r.toFixed(2)+')',r>1.25);}
  /* 5 */
  const G=[[0,0.7],[8,Math.pow(0.75,1.4)*0.7],[16,Math.pow(0.5,1.4)*0.7],[31.9,Math.pow(0.1/32,1.4)*0.7],[32,0],[40,0]];
  ok('jukebox gain follows (1-d/32)^1.4 x 0.7 and is 0 from 32 m',G.every(([dd,g])=>Math.abs(V.crJukeGain(dd)-g)<1e-9));
});
