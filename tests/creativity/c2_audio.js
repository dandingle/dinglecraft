/* c2_audio.js (C2, gate x1): THE OFFLINE AUDIO GATE (the creativity plan section 8.6). Nobody can hear the music, so
   this suite renders it with the REAL crSongRender from the build ($DC_BUILD/game.js via c_boot) at 44,100 Hz and measures the signal:
     1 not silent, never clipped, no NaN, no DC         4 the six instruments are measurably different (and the four drums)
     2 every note where the grid puts it (+-5 ms), the  5 volume (-6 dB at 5/10), vol 0 / mute = silence, tracks sum
       tempo exact at 60/120/200 BPM, the loop seam     6 bit-identical renders, render time for a 32 s song
     3 every pitch in tune (+-1.5%): every row, octave   7 the jukebox through a recording fake AudioContext: falloff (1-d/32)^1.4,
       shift and key transpose, bass an octave down       panning, dead-man fade, 4 nearest, other dimension, sound off, eject,
                                                          break, ducking (musicTick skips its notes), the exact samples played
   Every browser test elsewhere stays muted; this suite has no audio device at all. */
'use strict';
const boot=require('../lib/c_boot.js'),{skip}=boot,ok=(n,c)=>{if(c&&process.env.C2_VERBOSE)console.log('ok   '+n);return boot.ok(n,c);};   /* C2_VERBOSE=1 lists passes */
const FA=require('../lib/c2_fakeac.js');
const D=require('../lib/c2_dsp.js');
const V=boot({});
const HOLD=FA.install(44100);                       /* after the stubs load, before the game's first audio(): the core AC is our recording fake */
const SR=44100;
boot.run(async()=>{
  if(boot.crStubbed('2')){skip('the whole audio gate','C2 is on its stub');return;}
  const R=(d,sr)=>V.crSongRender(d,sr||SR),song=(tr,o)=>Object.assign({v:1,bpm:120,bars:1,key:0,tr},o||{});
  const T=(i,n,x)=>Object.assign({i,o:0,vol:10,m:0,n},x||{});
  const MEL=['piano','bass','lead','pluck','bells'],ALL=[...MEL,'drums'];
  const stepS=bpm=>60/bpm/4;

  /* ===== 1. not silent, not clipped ===== */
  {const bad=[];for(const i of ALL){const n=[];for(let s=0;s<16;s++)n.push(i==='drums'?[s,s%4,1]:[s,(s*5)%15,1]);
      const x=R(song([T(i,n,{vol:8})]));const r=D.rms(x),p=D.peak(x),dc=D.dc(x),nan=x.some(v=>!isFinite(v));
      if(!(r>0.02&&p<=1&&Math.abs(dc)<0.01&&!nan))bad.push(i+' rms '+r.toFixed(3)+' peak '+p.toFixed(3)+' dc '+dc.toExponential(1)+(nan?' NaN':''));}
    ok('one note per step on every instrument: RMS > 0.02, peak <= 1, |DC| < 0.01, no NaN'+(bad.length?' ('+bad.join('; ')+')':''),bad.length===0);
    for(let r=0;r<4;r++){const x=R(song([T('drums',[[0,r,1],[4,r,1],[8,r,1],[12,r,1]])]));if(!(D.rms(x)>0.01))bad.push('drum row '+r);}
    ok('each drum on its own is audible (RMS > 0.01)'+(bad.length?' ('+bad.join(',')+')':''),bad.length===0);
    const dense=song(ALL.map((i,k)=>T(i,Array.from({length:128},(_,s)=>i==='drums'?[s,[0,2,1,2][s%4],1]:[s,(s*3+k)%15,1]),{vol:10})),{bars:8,bpm:200});
    const xd=R(dense);ok('a dense six-track, eight-bar song at full volume stays under 1.0 (soft limiter), no NaN, no DC',D.peak(xd)<1&&!xd.some(v=>!isFinite(v))&&Math.abs(D.dc(xd))<0.01);
    ok('a blank song is exactly silent',D.peak(R(V.crSongBlank()))===0);}

  /* ===== 2. timing ===== */
  {const match=(det,exp,tol)=>{const miss=[],extra=[];for(const e of exp){if(!det.some(t=>Math.abs(t-e)<=tol))miss.push((e*1000).toFixed(1));}
      for(const t of det){if(!exp.some(e=>Math.abs(t-e)<=tol)&&!exp.some(e=>t>e&&t-e<0.09))extra.push((t*1000).toFixed(1));}return {miss,extra};};
    const res=[];
    for(const i of ALL){const n=[];for(let s=1;s<32;s+=(i==='drums'?2:4))n.push(i==='drums'?[s,(s>>1)%4,1]:[s,[0,4,7,2,9,5,11,3][(s/4|0)%8],1]);
      const d=song([T(i,n,{vol:8})],{bars:2}),x=R(d),det=D.onsets(x,SR,0.3),exp=n.map(q=>q[0]*stepS(120));
      const {miss,extra}=match(det,exp,0.005);res.push([i,miss,extra]);}
    const bad=res.filter(r=>r[1].length||r[2].length);
    ok('every note starts where the grid puts it (+-5 ms) on all six instruments, and nothing else starts'+(bad.length?' ('+bad.map(r=>r[0]+' missed '+r[1].slice(0,4)+' extra '+r[2].slice(0,4)).join('; ')+')':''),bad.length===0);
    /* dense patterns (a note every step, tails overlapping): each note's own contribution (the song minus that note) starts on time */
    const late=[];for(const i of ALL){const n=[];for(let s=0;s<16;s++)n.push(i==='drums'?[s,s%4,1]:[s,(s*4)%15,1]);const full=R(song([T(i,n,{vol:6})],{bars:2}));
      for(const k of [0,5,10,15]){const d=R(song([T(i,n.filter((_,j)=>j!==k),{vol:6})],{bars:2})),te=Math.round(n[k][0]*stepS(120)*SR);let pk=0;
        for(let j=te;j<Math.min(full.length,te+Math.round(SR*0.2));j++)pk=Math.max(pk,Math.abs(full[j]-d[j]));let pre=0;
        for(let j=Math.max(0,te-Math.round(SR*0.05));j<te-Math.round(SR*0.005);j++)pre=Math.max(pre,Math.abs(full[j]-d[j]));
        let t=te-Math.round(SR*0.005);while(t<te+Math.round(SR*0.02)&&Math.abs(full[t]-d[t])<0.1*pk)t++;
        if(!(pk>0&&(k===0||pre<0.01*pk)&&t<=te+Math.round(SR*0.005)&&t>=te-Math.round(SR*0.005)))late.push(i+' step '+n[k][0]+' ('+((t-te)/SR*1000).toFixed(1)+' ms)');}}
    ok('dense patterns (a note on every step): each note\u2019s own sound starts within 5 ms of its step and is silent before it'+(late.length?' ('+late.join('; ')+')':''),late.length===0);
    const tempo=[];for(const bpm of [60,120,200]){const n=[];for(let s=1;s<32;s+=2)n.push([s,1,1]);const x=R(song([T('drums',n)],{bpm,bars:2})),o=D.onsets(x,SR,0.1);
      const iv=o.slice(1).map((t,k)=>t-o[k]).sort((a,b)=>a-b),med=iv[iv.length>>1],want=2*stepS(bpm);tempo.push([bpm,o.length,med,want]);}
    ok('the tempo is exact at 60, 120 and 200 BPM (16 snares, median spacing within 1%)'+tempo.map(t=>' ['+t[0]+': '+t[1]+' onsets, '+(t[2]*1000).toFixed(1)+' vs '+(t[3]*1000).toFixed(1)+' ms]').join(''),
      tempo.every(t=>t[1]===16&&Math.abs(t[2]/t[3]-1)<0.01));
    const lens=[];for(const [bpm,bars,sr] of [[120,1,44100],[97,3,44100],[200,8,48000],[60,8,44100],[133,5,22050]]){const d=song([],{bpm,bars}),x=R(d,sr);
      lens.push(x.length===Math.round(V.crSongLen(d)*sr)&&Math.abs(V.crSongLen(d)-bars*4*60/bpm)<1e-9);}
    ok('crSongLen = bars x 4 beats x 60/bpm, and the buffer is exactly round(len x sr) samples (5 tempos, 3 sample rates)',lens.every(Boolean));
    /* the loop seam: notes ringing past the end continue at the start, so a looping buffer has no click there */
    const seamOf=d=>{const xs=R(d),N=xs.length,w=Math.round(SR*0.01);let md=0;for(let i=N-w;i<N-1;i++)md=Math.max(md,Math.abs(xs[i+1]-xs[i]));
      for(let i=0;i<w;i++)md=Math.max(md,Math.abs(xs[i+1]-xs[i]));return {md,jump:Math.abs(xs[0]-xs[N-1]),tail:D.rms(xs,0,Math.round(SR*0.05))};};
    const sa=seamOf(song([T('bells',[[14,0,2]],{o:-2}),T('piano',[[15,0,1]]),T('bass',[[12,2,4]])],{bars:1}));
    ok('a one-bar loop joins without a click: notes ringing past the end continue at the start (tail RMS '+sa.tail.toFixed(3)+'), every sample step in the last and first 10 ms < 0.1 (max '+sa.md.toFixed(4)+', seam '+sa.jump.toFixed(4)+')',
      sa.md<0.1&&sa.jump<0.1&&sa.tail>0.01);
    const sb=seamOf(song([T('bells',[[14,4,2]]),T('lead',[[13,9,3]])],{bars:1}));
    ok('bright notes across the seam too: the seam step ('+sb.jump.toFixed(4)+') is no bigger than the signal\u2019s own steps around it ('+sb.md.toFixed(4)+')',sb.jump<=sb.md+1e-6&&sb.tail>0.01);}

  /* ===== 3. pitch ===== */
  {const bad=[];let n=0,worst=0;
    const check=(i,row,o,key)=>{const d=song([T(i,[[0,row,16]],{o})],{key}),x=R(d),f=V.crSongFreq(i,row,o,key),st=Math.round(SR*(i==='bells'?0.9:0.3));
      const pf=D.peakHz(x,SR,st,f<110?65536:16384,f*0.6,f*1.5),yf=f<3000?D.yin(x,SR,st,2048,25,8000):f;n++;
      const e=Math.max(Math.abs(pf/f-1),Math.abs(yf/f-1));worst=Math.max(worst,e);if(e>0.015)bad.push(i+' row '+row+' oct '+o+' key '+key+': '+f.toFixed(1)+' Hz, fft '+pf.toFixed(1)+', yin '+yf.toFixed(1));};
    for(const i of MEL){for(let row=0;row<15;row++)check(i,row,0,0);for(const o of [-2,-1,1,2])for(const row of [0,7,14])check(i,row,o,0);for(const key of [-6,-1,1,6])for(const row of [0,9])check(i,row,0,key);}
    ok('every pitch is in tune: '+n+' sustained notes (5 instruments x 15 rows, every octave shift, key -6..+6), FFT peak and YIN within 1.5% (worst '+(worst*100).toFixed(2)+'%)'+(bad.length?' ('+bad.slice(0,4).join('; ')+')':''),bad.length===0);
    const f=V.crSongFreq('piano',0,0,0);
    ok('row 0 of the piano is middle C (261.63 Hz), row 7 C5, row 14 C6; the bass reads an octave lower, the bells an octave higher; a key step is a semitone',
      Math.abs(f-261.6256)<0.01&&Math.abs(V.crSongFreq('piano',7,0,0)/f-2)<1e-9&&Math.abs(V.crSongFreq('piano',14,0,0)/f-4)<1e-9&&
      Math.abs(V.crSongFreq('bass',0,0,0)/f-0.5)<1e-9&&Math.abs(V.crSongFreq('bells',0,0,0)/f-2)<1e-9&&Math.abs(V.crSongFreq('lead',0,0,1)/f-Math.pow(2,1/12))<1e-9);
    const xb=R(song([T('bass',[[0,0,16]])])),fb=D.yin(xb,SR,Math.round(SR*0.3),2048,25,8000);
    ok('the bass really sounds an octave below the piano on the same row (YIN '+fb.toFixed(1)+' Hz)',Math.abs(fb/130.81-1)<0.015);}

  /* ===== 4. the instruments are distinct ===== */
  {const F={};for(const i of MEL){const x=R(song([T(i,[[0,0,8]])],{bars:2})),f=V.crSongFreq(i,0,0,0),s0=Math.round(SR*0.05);
      F[i]={cent:D.centroid(x,SR,s0,8192),harm:D.harmRatio(x,SR,s0,16384,f),att:D.attackMs(x,SR),dec:D.decayMs(x,SR,20),
        sus:D.rms(x,Math.round(SR*0.6),Math.round(SR*0.7))/Math.max(1e-9,D.rms(x,0,Math.round(SR*0.1)))};}
    const ratio=(a,b)=>Math.max(a,b)/Math.max(1e-9,Math.min(a,b)),pairs=[],same=[];
    for(let a=0;a<MEL.length;a++)for(let b=a+1;b<MEL.length;b++){const A=F[MEL[a]],Bf=F[MEL[b]];
      const why=[];if(ratio(A.cent,Bf.cent)>1.25)why.push('centroid x'+ratio(A.cent,Bf.cent).toFixed(2));if(ratio(A.harm,Bf.harm)>1.5)why.push('harmonics x'+ratio(A.harm,Bf.harm).toFixed(2));
      if(ratio(A.sus,Bf.sus)>1.5)why.push('sustain x'+ratio(A.sus,Bf.sus).toFixed(2));if(ratio(A.dec,Bf.dec)>1.5)why.push('decay x'+ratio(A.dec,Bf.dec).toFixed(2));
      if(ratio(A.att,Bf.att)>1.5&&Math.abs(A.att-Bf.att)>3)why.push('attack x'+ratio(A.att,Bf.att).toFixed(2));
      pairs.push(MEL[a]+'/'+MEL[b]+': '+why.join(', '));if(!why.length)same.push(MEL[a]+'/'+MEL[b]);}
    ok('all 10 pairs of melodic instruments differ clearly in spectrum or envelope (centroid x1.25, harmonics, sustain, decay or attack x1.5)'+(same.length?' (too alike: '+same.join(', ')+')':''),same.length===0);
    console.log('  features: '+MEL.map(i=>i+' {cent '+F[i].cent.toFixed(0)+' Hz, harm '+F[i].harm.toFixed(2)+', att '+F[i].att+' ms, dec '+F[i].dec+' ms, sus '+F[i].sus.toFixed(2)+'}').join(' '));
    const dr=[0,1,2,3].map(r=>{const x=R(song([T('drums',[[2,r,1]])])),s=Math.round(2*stepS(120)*SR),seg=x.slice(s,s+Math.round(SR*0.3));
      const e=D.env(seg,SR,3);let pk=0;for(let k=0;k<45;k++)pk=Math.max(pk,e[k]);let bursts=0,low=true;   /* a burst = a rise from < 25% of the peak to > 50% */
      for(let k=0;k<45;k++){if(low&&e[k]>0.5*pk){bursts++;low=false;}else if(!low&&e[k]<0.25*pk)low=true;}
      return {low:D.bandShare(seg,SR,0,8192,20,200),high:D.bandShare(seg,SR,0,8192,6000,22050),cent:D.centroid(seg,SR,0,8192),bursts};});
    ok('drums: the kick lives below 200 Hz ('+(dr[0].low*100).toFixed(0)+'%), the hat above 6 kHz ('+(dr[2].high*100).toFixed(0)+'%), snare and clap in between (centroids '+dr[1].cent.toFixed(0)+' / '+dr[3].cent.toFixed(0)+' Hz)',
      dr[0].low>0.6&&dr[2].high>0.6&&[dr[1],dr[3]].every(q=>q.cent>500&&q.cent<6000&&q.low<0.5&&q.high<0.5));
    ok('drums: the clap is three quick bursts, the snare one hit ('+dr[3].bursts+' / '+dr[1].bursts+')',dr[3].bursts===3&&dr[1].bursts===1);}

  /* ===== 5. volume, mute, mixing ===== */
  {const A=[[0,0,4],[4,4,4],[8,7,4]],x10=R(song([T('piano',A,{vol:10})])),x5=R(song([T('piano',A,{vol:5})])),db=20*Math.log10(D.rms(x5)/D.rms(x10));
    ok('volume 5 is -6 dB of volume 10 (+-1 dB): '+db.toFixed(2)+' dB',Math.abs(db+6)<1);
    ok('volume 0 and mute are silence',D.peak(R(song([T('piano',A,{vol:0})])))===0&&D.peak(R(song([T('lead',A,{m:1})])))===0);
    const a=R(song([T('piano',A,{vol:6})])),b=R(song([T('drums',[[0,0,1],[8,1,1]],{vol:6})])),ab=R(song([T('piano',A,{vol:6}),T('drums',[[0,0,1],[8,1,1]],{vol:6})]));
    let err=0;for(let i=0;i<ab.length;i++)err=Math.max(err,Math.abs(ab[i]-(a[i]+b[i])));
    ok('two tracks mix by summing (max error '+err.toExponential(1)+')',err<1e-4);
    const o2=R(song([T('lead',[[0,0,4]],{o:1})])),f2=D.yin(o2,SR,Math.round(SR*0.1),2048,25,8000);
    ok('Oct +1 doubles the pitch ('+f2.toFixed(1)+' Hz)',Math.abs(f2/523.25-1)<0.015);}

  /* ===== 6. determinism and speed ===== */
  {const d=song(ALL.map((i,k)=>T(i,Array.from({length:64},(_,s)=>i==='drums'?[s*2,s%4,1]:[s*2,(s*5+k)%15,2]),{vol:8})),{bars:8,bpm:60});
    const a=R(d),b=R(d);let same=a.length===b.length;for(let i=0;same&&i<a.length;i++)if(a[i]!==b[i])same=false;
    ok('two renders of the same song are bit-identical (seeded noise, no Math.random)',same);
    const ts=[];for(let k=0;k<3;k++){const t0=process.hrtime.bigint();R(d);ts.push(Number(process.hrtime.bigint()-t0)/1e6);}ts.sort((p,q)=>p-q);
    ok('a 32 s, six-track song renders in '+ts[1].toFixed(0)+' ms (< 200 ms, '+a.length+' samples)',ts[1]<200&&a.length===Math.round(32*SR));
    let calls=0;const mr=Math.random;Math.random=function(){calls++;return mr();};try{R(d);V.crSynNote('pluck',3,2,0,0,SR,0.125);}finally{Math.random=mr;}
    ok('rendering never calls Math.random',calls===0);}

  /* ===== 7b. balance (fix lead, v6.2 review): the bells were ~7 dB (A-weighted) over the piano and a busy bells part mastered the whole
     song down 5 dB; the kick was nearly all sub-bass (inaudible on laptop speakers, gone at Drum Kit Oct -2) ===== */
  {const scale=[];for(let k=0;k<8;k++)scale.push([k*2,k,2]);const lv={};
    for(const i of MEL)lv[i]=D.aRms(R(song([T(i,scale,{vol:8})])),SR);const rel=i=>20*Math.log10(lv[i]/lv.piano);
    ok('the same 8-note scale at volume 8: every melodic instrument within -7..+3 dB of the piano, A-weighted ('+MEL.map(i=>i+' '+rel(i).toFixed(1)).join(', ')+')',
      MEL.every(i=>rel(i)>=-7&&rel(i)<=3));
    const st={},n16=[];for(let s=0;s<16;s++)n16.push([s,4,1]);V.crSynMix(V.crSongNorm(song([T('bells',n16,{vol:8})])),SR,{stat:st});
    ok('a bells note on every step at the default volume is not mastered down (master gain '+st.g.toFixed(3)+')',st.g===1);
    const pad=a=>{const p=new Float32Array(16384+a.length);p.set(a,16384);return p;},band=(x,lo,hi)=>{const m=D.spectrum(x,0,65536);let e=0;
      for(let k=1;k<m.length;k++){const f=k*SR/65536;if(f>=lo&&f<hi)e+=m[k]*m[k];}return e;};
    const kick=o=>pad(V.crSynNote('drums',0,1,o,0,SR,0.125)),snare=pad(V.crSynNote('drums',1,1,0,0,SR,0.125)),sn=band(snare,0,SR/2);
    const k0=kick(0),up=10*Math.log10(band(k0,150,SR/2)/sn),aw=o=>20*Math.log10(D.aRms(kick(o),SR)/D.aRms(snare,SR));
    ok('the kick has body a laptop can play: its energy above 150 Hz within 6 dB of the snare ('+up.toFixed(1)+' dB), and A-weighted it is within 8 dB of the snare at Oct 0 ('+aw(0).toFixed(1)+') and 12 dB at Oct -2 ('+aw(-2).toFixed(1)+')',
      up>-6&&aw(0)>-8&&aw(-2)>-12);
    ok('... and it is still a kick: most of its energy below 200 Hz ('+(100*band(k0,0,200)/band(k0,0,SR/2)).toFixed(0)+'%)',band(k0,0,200)/band(k0,0,SR/2)>0.8);}

  /* ===== 7. the jukebox through a recording fake AudioContext ===== */
  {const step=boot.stepper(600000),o=boot.studio(V,step,{name:'craudio'});const P=()=>V.P;
    V.crMusSound(true);V.crMusMusic(false);
    const tick=n=>{for(let i=0;i<(n||1);i++){if(HOLD.ac)HOLD.ac.advance(0.04);step(1);}};
    /* a finished disc with a real song, a jukebox, insert through the real doUse */
    const sd=song([T('piano',[[0,0,4],[4,4,4],[8,7,4],[12,4,4]]),T('drums',[[0,0,1],[4,1,1],[8,0,1],[12,1,1]])],{bars:1,bpm:120});
    const n=V.crNew('song',{d:sd});V.crFinish(n,'Gate Tune','Dan');const id=V.crItemId(n);V.crGiveDan({id,count:1});
    boot.give(V,V.B.CR_JUKE,2);const jx=o.x+3,jz=o.z,jy=o.y;boot.aim(V,jx+0.5,jy-0.02,jz+0.5);boot.rclick(V,step);
    const sel=i=>{const p=P();let s=p.inv.findIndex(q=>q&&q.id===i);if(s>8){const t=p.inv[8];p.inv[8]=p.inv[s];p.inv[s]=t;s=8;}p.sel=s;V.refreshHand();};
    sel(id);boot.aim(V,jx+0.5,jy+0.5,jz+0.5);boot.rclick(V,step);tick(3);
    const ac=HOLD.ac;ok('the game\u2019s own audio() built the recording fake (core AC) and the disc went in',!!ac&&HOLD.made===1&&V.crBE(jx+','+jy+','+jz).id===id);
    if(!ac){skip('jukebox checks','no fake AC');return;}
    let v=FA.live(ac,true);const src=v[0];
    ok('one looping voice plays the jukebox',v.length===1&&src.loop===true);
    const want=R(sd,44100);let eq=!!(src&&src.buffer&&src.buffer.length===want.length);if(eq){const ch=src.buffer.getChannelData(0);for(let i=0;i<want.length;i++)if(ch[i]!==want[i]){eq=false;break;}}
    ok('the buffer it plays is exactly crSongRender(song, 44100): the samples this suite analysed are the samples Dan hears',eq);
    const at=(d,face)=>{const p=P();p.x=jx+0.5-d;p.z=jz+0.5;p.y=jy;p.vx=p.vy=p.vz=0;p.yaw=face==null?Math.PI/2*-1:face;p.pitch=0;tick(2);};
    /* face +x (yaw -pi/2: forward = (-sin yaw, -cos yaw) = (1,0)) with the jukebox straight ahead */
    const gains=[];for(const d of [3,8,16,24,30]){at(d);const c=FA.chain(FA.live(ac,true)[0]),e=FA.lastTarget(c.g.gain),dd=Math.hypot(d,(P().y+P().eyeY)-(jy+0.5)),exp=Math.pow(1-dd/32,1.4)*0.7;
      gains.push([d,e?e[1]:-1,exp]);}
    ok('gain follows (1-d/32)^1.4 x 0.7 with distance'+gains.map(g=>' ['+g[0]+' m: '+g[1].toFixed(4)+' vs '+g[2].toFixed(4)+']').join(''),gains.every(g=>Math.abs(g[1]-g[2])<1e-6));
    {const c=FA.chain(FA.live(ac,true)[0]),ev=c.g.gain.ev,last=ev.slice(-3);
      ok('every tick holds the gain, glides to it (tc 0.05) and schedules the dead-man fade to 0 at now+0.3',last[0][0]==='hold'&&last[1][0]==='tgt'&&last[1][3]===0.05&&
        last[2][0]==='tgt'&&last[2][1]===0&&Math.abs(last[2][2]-(ac.t+0.3))<1e-9&&last[2][3]===0.08);}
    at(8,0);const pr=FA.lastTarget(FA.chain(FA.live(ac,true)[0]).p.pan);   /* facing -z: the jukebox (+x) is to Dan's right */
    at(8,Math.PI);const pl=FA.lastTarget(FA.chain(FA.live(ac,true)[0]).p.pan);
    at(8);const pc=FA.lastTarget(FA.chain(FA.live(ac,true)[0]).p.pan);
    ok('panning: right of Dan > 0 ('+pr[1].toFixed(2)+'), left < 0 ('+pl[1].toFixed(2)+'), ahead ~0 ('+pc[1].toFixed(2)+'), |pan| <= 0.8',pr[1]>0.7&&pl[1]<-0.7&&Math.abs(pc[1])<0.05&&Math.abs(pr[1])<=0.8+1e-9);
    ok('within range the jukebox ducks the background music (crDuckNow)',V.crDuckNow()===true);
    /* ducking really silences musicTick: the core's generative music schedules no oscillator while ducked */
    V.crMusMusic(true);const oscs=()=>ac.log.filter(l=>l[0]==='create'&&l[1]==='osc').length;let o0=oscs();for(let k=0;k<40;k++)V.crMusTick()();const ducked=oscs()-o0;
    at(40);tick(4);ok('past 32 m: the voice is stopped and disconnected, nothing ducks',FA.live(ac,true).length===0&&src.stopped!=null&&src.disc===true&&V.crDuckNow()===false);
    o0=oscs();for(let k=0;k<40;k++)V.crMusTick()();const free=oscs()-o0;V.crMusMusic(false);
    ok('musicTick plays no notes while a jukebox is audible ('+ducked+') and resumes on its own out of range ('+free+' oscillators)',ducked===0&&free>=4);
    at(5);v=FA.live(ac,true);const src2=v[0],off=src2&&src2.started?src2.started[1]:-1,be=V.crBE(jx+','+jy+','+jz),len=want.length/44100;
    const circ=(a,b)=>{const d=Math.abs(a-b)%len;return Math.min(d,len-d);},ck=V.getCR().CRF.clock,dOff=Math.min(circ(off,ck-be.s),circ(off,ck-0.04-be.s));
    ok('back in range a new voice starts where the song is now: offset '+off.toFixed(3)+' s = (clock - start) mod '+len.toFixed(2)+' s (off by '+dOff.toFixed(4)+')',v.length===1&&dOff<1e-6&&off>=0&&off<len);
    /* the dead-man: stop ticking, and the last thing scheduled is a fade to silence */
    {const c=FA.chain(src2),e=c.g.gain.ev[c.g.gain.ev.length-1];ok('if the frames stop, the music fades out by itself (last event: target 0 at +0.3 s)',e[0]==='tgt'&&e[1]===0);}
    /* other dimension */
    const px=P().x,py=P().y,pz=P().z;V.setDim('nether',px,90,pz);tick(25);
    ok('in the Nether the overworld jukebox is silent (voice stopped, no duck)',FA.live(ac,true).length===0&&V.crDuckNow()===false);
    V.setDim('over',px,py,pz);tick(30);at(5);ok('back home it plays again',FA.live(ac,true).length===1);
    /* sound off: everything stops and nothing new is made */
    V.crMusSound(false);tick(3);const nlog=ac.log.length;tick(10);
    ok('Settings -> Sound off: the voice stops and no audio node is created while it is off',FA.live(ac,true).length===0&&ac.log.filter((l,i)=>i>=nlog&&l[0]==='create').length===0);
    V.crMusSound(true);tick(3);ok('Sound on again: it plays again',FA.live(ac,true).length===1);
    /* four nearest of five */
    const more=[];for(let k=0;k<4;k++){const m2=V.crNew('song',{d:song([T('bells',[[0,k,2]])])});V.crFinish(m2,'Five '+k,'Dan');const i2=V.crItemId(m2);V.crGiveDan({id:i2,count:1});more.push(i2);}
    at(1.5);const spots=[[o.x+1,o.z-4],[o.x+3,o.z-4],[o.x+1,o.z+4],[o.x+4,o.z+4]];
    spots.forEach(([x,z],k)=>{boot.give(V,V.B.CR_JUKE,2);boot.aim(V,x+0.5,jy-0.02,z+0.5);boot.rclick(V,step);sel(more[k]);boot.aim(V,x+0.5,jy+0.5,z+0.5);boot.rclick(V,step);});
    const p=P();p.x=jx+0.5-3;p.z=jz+0.5;tick(3);const near=V.crJukeNear();
    ok('five playing jukeboxes in range: only the 4 nearest get a voice',V.getCR().CRBE.size>=5&&[...V.getCR().CRBE.values()].filter(b=>b.t==='crjuke'&&b.id).length===5&&near.length===4&&FA.live(ac,true).length===4);
    /* eject and break stop the voice at once */
    const VO=V.crMusInfo().CRM.voices,jk=jx+','+jy+','+jz,vj=VO.get(jk);
    {const p=P();let s=p.inv.findIndex((q,i)=>!q&&i<9);if(s<0)s=0;p.sel=s;V.refreshHand();}       /* an empty hand, nothing overwritten */
    boot.aim(V,jx+0.5,jy+0.5,jz+0.5);V.MB.r=true;step(1);V.MB.r=false;
    ok('ejecting a disc stops its voice in that very frame, and the same disc comes back',!!vj&&vj.src.stopped!=null&&!VO.has(jk)&&V.P.inv.some(q=>q&&q.id===id));step(2);
    const [bx,bz]=spots[0],bk=bx+','+jy+','+bz,vb=VO.get(bk);
    boot.aim(V,bx+0.5,jy+0.5,bz+0.5);V.P.mode='c';V.MB.l=true;step(2);V.MB.l=false;step(2);V.P.mode='s';
    const tot=V.entities.filter(e=>e.t==='drop'&&!e.dead&&e.st.id===more[0]).length+V.P.inv.filter(q=>q&&q.id===more[0]).length;
    ok('breaking a playing jukebox stops its voice and drops its disc (exactly one, on the floor or picked up)',!!vb&&vb.src.stopped!=null&&!VO.has(bk)&&!V.crBE(bk)&&tot===1);
    /* fix lead, v6.2 review: a song renders synchronously (up to ~150 ms dense), so at most ONE uncached song renders per tick, nearest
       first, and a voice that would start below 1% gain (the edge of the range) waits */
    {const playing=()=>[...V.getCR().CRBE.values()].filter(b=>b.t==='crjuke'&&b.id).length;const pl=playing();const p=P();p.x=jx+0.5-3;p.z=jz+0.5;
      V.crJukeReset();const seen=[];for(let k=0;k<pl+1;k++){tick(1);seen.push(FA.live(ac,true).length);}
      ok('cold cache, '+pl+' playing jukeboxes in range: voices start one render per tick ('+seen.join(',')+')',pl>=2&&seen.slice(0,pl).every((v,k)=>v===k+1)&&seen[pl]===pl);
      p.mode='c';p.flying=true;const far=V.crJukeNear().map(c=>c.d);
      const go=(x,z)=>{p.x=x;p.z=z;p.y=jy;p.vx=p.vy=p.vz=0;V.crJukeReset();tick(6);return FA.live(ac,true).length;};
      const ka=spots[1],kb=spots[2];
      const n31=go(o.x+3.5-31,o.z+0.5),d1=Math.hypot(ka[0]+0.5-p.x,(jy+0.5)-(p.y+p.eyeY),ka[1]+0.5-p.z),db2=Math.hypot(kb[0]+0.5-p.x,(jy+0.5)-(p.y+p.eyeY),kb[1]+0.5-p.z);
      const n29=go(o.x+3.5-29,o.z+0.5);p.mode='s';p.flying=false;
      ok('a jukebox at the very edge (gain '+V.crJukeGain(d1).toFixed(4)+' < 0.01) starts no voice while one a little closer (gain '+V.crJukeGain(db2).toFixed(4)+') does ('+n31+'); 2 m closer both play ('+n29+')',
        V.crJukeGain(d1)<0.01&&V.crJukeGain(db2)>=0.01&&n31===1&&n29>=2);}
    V.startNewWorld('craudio2','7','s');tick(5);ok('a new world: every voice is stopped',FA.live(ac,true).length===0&&V.crDuckNow()===false);}
});
