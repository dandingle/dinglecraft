/* m2_audio.js (M2, gate x1): THE OFFLINE AUDIO GATE for Malgorath (bible 18.1, plan 9.7). Nobody building this could hear it, so this
   suite renders the REAL score and SFX from the build ($DC_BUILD/game.js through mg_boot: mg2ScoreRender, mg2SfxRender) and measures:
     1 the bank: every SFX has a visual twin; every 'mg_' name any package plays is in the bank
     2 every SFX: finite, no DC, peak <= -1 dBFS, onset at t 0 (+-10 ms), duration in range, loud enough to hear (RMS >= -30 dBFS),
       its spectral-centroid band; every telegraph sound pairwise distinct; bit-identical renders
     3 the score per cue: RMS -20..-14 dBFS, peak <= -1 dBFS, tempo by onset autocorrelation within +-1 BPM, the pitch classes inside
       the cue's scale (+ the motif's D#), no clicks at bar joins or cue changes, the duck under the inhale (-6 dB)
     4 the band through the recording fake AudioContext (c2_fakeac): bars back to back on AC time, the cues follow the fight, Sound off
       creates nothing, the death: 1.5 s of silence (mix RMS < -60 dBFS for 1.4 s), ONE major chord (E major), nothing tonal after it
   The OfflineAudioContext parity render in the muted Chrome is the release's job (plan 9.7); this suite has no audio device at all. */
'use strict';
const boot=require('../lib/mg_boot.js'),{skip}=boot,ok=(n,c)=>{if(c&&process.env.M2_VERBOSE)console.log('ok   '+n);return boot.ok(n,c);};
const FA=require('../lib/c2_fakeac.js');
const D=require('../lib/c2_dsp.js');
const fs=require('fs'),path=require('path');
const V=boot({seed:20261009});
const HOLD=FA.install(44100);                       /* before the game's first audio(): the core AC is our recording fake */
const SR=44100,dB=x=>20*Math.log10(Math.max(1e-12,x));

function pad(x,N){if(x.length>=N)return x;const y=new Float32Array(N);y.set(x);return y;}
function pow2(n){let N=1;while(N<n)N<<=1;return N;}
/* spectral flatness over 80 Hz..8 kHz (noise ~0.2+, a tone ~0) */
function flat(x){const N=Math.min(65536,pow2(Math.max(4096,x.length))),m=D.spectrum(pad(x,N),0,N),bw=SR/N;let lg=0,ar=0,c=0;
  for(let i=1;i<m.length;i++){const f=i*bw;if(f<80||f>8000)continue;const p=m[i]*m[i]+1e-14;lg+=Math.log(p);ar+=p;c++;}return Math.exp(lg/c)/(ar/c);}
/* energy-weighted mean centroid over 2048-sample frames */
function cent(x){const xp=pad(x,4096),pk=D.peak(x);let cs=0,cw=0;for(let s=0;s+2048<=xp.length;s+=1024){const e=D.rms(xp,s,s+2048);if(e<pk*0.02)continue;cs+=D.centroid(xp,SR,s,2048)*e;cw+=e;}return cw?cs/cw:0;}
function share(x,lo,hi){const N=Math.min(65536,pow2(Math.max(4096,x.length)));return D.bandShare(pad(x,N),SR,0,N,lo,hi);}
/* spectral flux: mean positive change between 1024-sample frames, normalised */
function flux(x){const xp=pad(x,4096);let prev=null,s=0,c=0;for(let st=0;st+1024<=xp.length;st+=512){const m=D.spectrum(xp,st,1024);let t=0,f=0;for(let i=1;i<m.length;i++)t+=m[i];
    if(prev&&t>0){for(let i=1;i<m.length;i++){const d=m[i]/t-prev[i];if(d>0)f+=d;}s+=f;c++;}prev=Float64Array.from(m,v=>t>0?v/t:0);}return c?s/c:0;}
/* tempo: the autocorrelation of an onset-strength envelope (10 ms hops), best lag inside [lo,hi] seconds */
function lagOf(x,lo,hi){const hop=Math.round(SR*0.01),n=Math.floor(x.length/hop),e=new Float64Array(n);let prev=0;
  for(let k=0;k<n;k++){let s=0;for(let i=k*hop;i<(k+1)*hop;i++)s+=x[i]*x[i];const v=Math.sqrt(s/hop);e[k]=Math.max(0,v-prev);prev=v;}
  const ac=L=>{let s=0;for(let k=0;k+L<n;k++)s+=e[k]*e[k+L];return s/Math.max(1,n-L);};const a=Math.round(lo/0.01),b=Math.round(hi/0.01),A=[];let best=-1;
  for(let L=a;L<=b;L++){A[L]=ac(L);best=Math.max(best,A[L]);}
  let bl=a;for(let L=a+1;L<b;L++)if(A[L]>=0.9*best&&A[L]>=A[L-1]&&A[L]>=A[L+1]){bl=L;break;}     /* the shortest strong period, not a multiple */
  const y0=ac(bl-1),y1=ac(bl),y2=ac(bl+1),dn=y0-2*y1+y2;                                          /* parabolic refinement */
  return (bl+(dn<0?0.5*(y0-y2)/dn:0))*0.01;}
/* pitch classes of a pure tone stack (the chord): sharp, prominent, in-tune spectral peaks (35..700 Hz), weighted by energy */
function pitchClasses(x){const N=pow2(x.length),m=D.spectrum(pad(x,N),0,N),bw=SR/N;let mx=0;const i0=Math.ceil(35/bw),i1=Math.floor(700/bw);
  for(let i=i0;i<=i1;i++)mx=Math.max(mx,m[i]);const out={},W=Math.max(6,Math.round(6/bw));
  for(let i=i0+1;i<i1;i++){const v=m[i];if(v<mx*0.12||v<m[i-1]||v<m[i+1])continue;
    let s=0,c=0;for(let j=i-W;j<=i+W;j++){if(Math.abs(j-i)<3)continue;s+=m[j];c++;}if(v<4*s/c)continue;          /* prominence: a line, not a smear */
    const f=i*bw,mid=12*Math.log2(f/440)+69,dev=Math.abs(mid-Math.round(mid));if(dev>0.3)continue;                /* in tune */
    const pc=((Math.round(mid)%12)+12)%12;out[pc]=(out[pc]||0)+v*v;}
  return out;}
const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

boot.run(async()=>{
  if(boot.mgStubbed('2')){skip('the whole audio gate','M2 is on its stub');return;}
  const S=V.getMG2SFX(),names=Object.keys(S),R=n=>V.mg2SfxRender(n,SR);

  /* ===== 1. the bank ===== */
  {const noTw=names.filter(n=>!(typeof S[n].tw==='string'&&S[n].tw.length>=6));
    ok('every SFX in the bank has a visual twin (bible 18.3) ('+names.length+' sounds'+(noTw.length?'; missing: '+noTw.join(','):'')+')',names.length>=40&&noTw.length===0);
    const used=new Set();   /* split repo: the m0-m3 sources are src/malgorath/, the m4 ones src/malgorath/hr/ */
    for(const [dir,f] of [boot.SRC.mg,boot.SRC.mgHr].flatMap(d=>fs.readdirSync(d).filter(f=>/^m[0-9]_.*\.js$/.test(f)).map(f=>[d,f]))){const s=boot.readSrc(path.join(dir,f),{legacy:true});
      for(const m of s.matchAll(/(?:mg2S|playS|playSAt|mg2Sfx)\(\s*'(mg_[a-z0-9_]+)'/g))used.add(m[1]);}
    const miss=[...used].filter(n=>!S[n]);
    ok('every \'mg_\' sound any package plays exists in the bank ('+used.size+' used'+(miss.length?'; missing: '+miss.join(','):'')+')',used.size>=30&&miss.length===0);}

  /* ===== 2. every SFX ===== */
  const F={};
  {const bad=[];for(const n of names){if(!S[n].v.length)continue;const x=R(n),pk=D.peak(x);let on=-1;for(let i=0;i<x.length;i++)if(Math.abs(x[i])>pk*0.01){on=i;break;}
      const f={dur:x.length/SR,pk:dB(pk),on:on/SR*1000,rms:dB(D.rms(x)),dc:Math.abs(D.dc(x)),nan:x.some(v=>!isFinite(v)),cent:cent(x),flat:flat(x),lo:share(x,20,250),hi:share(x,3000,20000),flux:flux(x)};F[n]=f;
      const why=[];if(f.nan)why.push('NaN');if(f.dc>0.01)why.push('DC');if(f.pk>-1)why.push('peak '+f.pk.toFixed(1));if(f.on>10)why.push('onset '+f.on.toFixed(1)+' ms');
      if(!(f.dur>=0.05&&f.dur<=6.5))why.push('dur '+f.dur.toFixed(2));if(f.rms<-30)why.push('rms '+f.rms.toFixed(1));if(why.length)bad.push(n+' ('+why.join(', ')+')');}
    ok('every SFX: finite, |DC| < 0.01, peak <= -1 dBFS, onset at t 0 (+-10 ms), 0.05-6.5 s, RMS >= -30 dBFS (audible)'+(bad.length?': '+bad.join('; '):''),bad.length===0);
    ok('mg_silence is exactly that: no voices, every rendered sample 0',S.mg_silence&&S.mg_silence.v.length===0&&R('mg_silence').every(v=>v===0));
    /* the centroid bands: bodies and thuds low, mouths and hands mid, sparks, scrapes, hisses high */
    const BANDS={low:[0,450,'tick snore gulp slapup slap cough step lunge belly stomp swallow gag band fall roar chord'],
      mid:[450,2600,'poke erupt chew eyelid chomp spit clap stab2 crack rattle rimbite eat inhale lane pluck retch sun vacuum belch burst bury'],
      high:[2600,20000,'scrape snuff squat slurp fizzle skid drag']};
    const off=[],seen=new Set();for(const k in BANDS){const [lo,hi,l]=BANDS[k];for(const s of l.split(' ')){const n='mg_'+s,f=F[n];seen.add(n);if(!f){off.push(n+' missing');continue;}
      if(!(f.cent>=lo&&f.cent<hi))off.push(n+' '+f.cent.toFixed(0)+' Hz not '+k);}}
    const unb=names.filter(n=>S[n].v.length&&!seen.has(n));
    ok('every SFX sits in its spectral-centroid band (low < 450 Hz: thuds and bodies; mid: mouths, hands, bells; high > 2.6 kHz: sparks and hisses)'+(off.length||unb.length?': '+off.concat(unb.map(n=>n+' unbanded')).join('; '):''),off.length===0&&unb.length===0);
    ok('the sparks are bright and the thuds are dark (scrape/skid centroid > 8 kHz, stomp/step < 120 Hz)',F.mg_scrape.cent>8000&&F.mg_skid.cent>8000&&F.mg_stomp.cent<120&&F.mg_step.cent<120);
    /* every telegraph sound pairwise distinct: features (log centroid, flatness, low/high share, log duration, flux) */
    const TEL=['mg_tick','mg_slapup','mg_eyelid','mg_rattle','mg_stab2','mg_lunge','mg_squat','mg_stomp','mg_inhale','mg_lane','mg_drag','mg_clap','mg_gag','mg_band','mg_cough','mg_spit','mg_crack','mg_retch'];
    const fv=n=>{const f=F[n];return [Math.log2(Math.max(40,f.cent))/1.0,f.flat*4,f.lo*2,f.hi*2,Math.log2(f.dur)*0.8,f.flux*3];};
    let mn=1e9,pair='';for(let i=0;i<TEL.length;i++)for(let j=i+1;j<TEL.length;j++){const a=fv(TEL[i]),b=fv(TEL[j]);const d=Math.sqrt(a.reduce((s,v,k)=>s+(v-b[k])*(v-b[k]),0));if(d<mn){mn=d;pair=TEL[i]+'/'+TEL[j];}}
    ok('the '+TEL.length+' telegraph sounds are pairwise distinct (min feature distance '+mn.toFixed(2)+' >= 0.35, closest '+pair+')',mn>=0.35);
    const a=R('mg_slap'),b=R('mg_slap'),c=V.mg2SfxRender('mg_slap',48000);
    ok('renders are bit-identical (seeded noise, no Math.random) and follow the sample rate (48 kHz length x 48/44.1)',a.length===b.length&&a.every((v,i)=>v===b[i])&&Math.abs(c.length/a.length-48000/44100)<0.002);
    ok('the inhale is a riser (its last second louder than its first, after the intake click) and the chord rings 4 s',D.rms(R('mg_inhale'),Math.round(4.8*SR),Math.round(5.8*SR))>2*D.rms(R('mg_inhale'),Math.round(0.4*SR),Math.round(1.4*SR))&&F.mg_chord.dur>=4);}

  /* ===== 3. the score ===== */
  {const SC=(cue,bar,o)=>V.mg2ScoreRender(cue,bar,0x6d32,SR,o||{}),cat=(cue,n,o,v)=>{const xs=[];for(let b=0;b<n;b++)xs.push(SC(cue,v?v(b):b,o));const L=xs.reduce((s,x)=>s+x.length,0),y=new Float32Array(L);let k=0;for(const x of xs){y.set(x,k);k+=x.length;}return {y,xs};};
    const lv=[],ends=[];
    for(const [cue,o,nb] of [['asleep',{},4],['table',{},8],['table',{swell:true},2],['plate',{},2],['maw',{bpm:60},1],['maw',{bpm:100},1],['maw',{bpm:140},1],['heart',{bpm:140},1]]){
      for(let b=0;b<nb;b++){const x=SC(cue,b,o),r=dB(D.rms(x)),p=dB(D.peak(x));lv.push([cue+(o.bpm||'')+(o.swell?'s':'')+'#'+b,r,p]);
        ends.push([cue+'#'+b,Math.abs(x[0]),Math.abs(x[x.length-1]),Math.abs(x[1]-x[0])]);
        if(Math.abs(x.length-Math.round(V.mg2BarLen(cue,o)*SR))>0)lv.push([cue+' length',99,99]);}}
    const badL=lv.filter(q=>!(q[1]>=-20&&q[1]<=-14&&q[2]<=-1));
    ok('every cue and variant: RMS -20..-14 dBFS, peak <= -1 dBFS, exactly mg2BarLen long ('+lv.length+' bars'+(badL.length?'; off: '+badL.map(q=>q[0]+' '+q[1].toFixed(1)+'/'+q[2].toFixed(1)).join(', '):'')+')',badL.length===0);
    const badE=ends.filter(q=>q[1]>1e-3||q[2]>1e-3);
    ok('no clicks at bar joins or cue changes: every bar starts and ends at silence (|x| < 0.001 at both ends, 6 ms fades)'+(badE.length?': '+badE.map(q=>q[0]).join(','):''),badE.length===0);
    {const t=cat('table',8),lag=lagOf(t.y,3.0,5.0),bpm=4*60/lag;
      ok('The Table: 60 BPM by onset autocorrelation (bar lag '+lag.toFixed(3)+' s = '+bpm.toFixed(2)+' BPM in 4/4)',Math.abs(bpm-60)<=1);
      const p=cat('plate',8),lp=lagOf(p.y,0.4,0.9),bp=60/lp;
      ok('The Plate: 100 BPM by onset autocorrelation (beat lag '+lp.toFixed(3)+' s = '+bp.toFixed(2)+' BPM)',Math.abs(bp-100)<=1);
      const res=[];for(const bpm of [60,100,140]){const m=cat('maw',12,{bpm},()=>0),l=lagOf(m.y,0.3,1.3);res.push([bpm,60/l]);}
      ok('The Maw: the heartbeat runs at the asked tempo, 60 -> 140 BPM as his bar falls ('+res.map(q=>q[0]+'->'+q[1].toFixed(1)).join(', ')+')',res.every(q=>Math.abs(q[0]-q[1])<=1));
      const a=cat('asleep',4),la=lagOf(a.y,0.8,1.6);
      ok('Asleep: a double-thump heartbeat every 1.2 s ('+la.toFixed(3)+' s) over the E1 sub drone ('+D.peakHz(pad(a.xs[0],262144),SR,0,262144,30,60).toFixed(1)+' Hz)',Math.abs(la-1.2)<=0.02&&Math.abs(D.peakHz(pad(a.xs[0],262144),SR,0,262144,30,60)-41.2)<1);}
    {/* pitch: the spectral peak (0.37 s window) of every note of the melodic stem (o.stem: the bells and the bass ostinato without drums, drone or chewing) */
      const PHRY=[4,5,7,9,11,0,2],PDOM=[4,5,8,9,11,0,2],MOTIF=3;
      const notes=(cue,bar,dt,n,lo,hi)=>{const x=V.mg2ScoreRender(cue,bar,0x6d32,SR,{stem:true}),r=[];for(let i=0;i<n;i++){const f=D.peakHz(x,SR,Math.round((i*dt+0.01)*SR),16384,lo,hi);
          const mid=12*Math.log2(f/440)+69;r.push({f,pc:((Math.round(mid)%12)+12)%12,dev:Math.abs(mid-Math.round(mid))});}return r;};
      const tb=notes('table',0,0.9,4,90,400),p0=notes('plate',0,0.6,4,50,200),p1=notes('plate',1,0.6,4,50,200);
      const fmt=a=>a.map(q=>NAMES[q.pc]+'('+q.f.toFixed(1)+')').join(' '),inS=(a,sc)=>a.every(q=>q.dev<=0.2&&(sc.includes(q.pc)||q.pc===MOTIF));
      ok('the motif on The Table\'s low bells (bar 0 of 8) is E - D# - C - B, falling, in tune: '+fmt(tb),tb.map(q=>q.pc).join(',')==='4,3,0,11'&&tb.every((q,i)=>!i||q.f<tb[i-1].f)&&inS(tb,PHRY));
      ok('The Plate\'s bass ostinato is the motif in E phrygian dominant: '+fmt(p0)+' | '+fmt(p1),p0.map(q=>q.pc).join(',')==='4,4,3,0'&&p1.map(q=>q.pc).join(',')==='4,5,8,5'&&inS(p0.concat(p1),PDOM));
      const bare=V.mg2ScoreRender('table',1,0x6d32,SR,{stem:true});
      ok('...the bells ring only every 8th bar (bar 1\'s stem is silent)',D.peak(bare)===0);}
    {const u=SC('maw',0,{bpm:100}),d=SC('maw',0,{bpm:100,duck:true}),g=dB(D.rms(d))-dB(D.rms(u));
      ok('the duck under the inhale: the Maw drops 6 dB ('+g.toFixed(2)+' dB) and keeps its shape',Math.abs(g+6.02)<0.3&&u.every((v,i)=>Math.abs(v*0.5-d[i])<1e-6));
      const x0=SC('table',3),x1=SC('table',3),y=V.mg2ScoreRender('table',3,0x1234,SR,{});
      ok('score renders are bit-identical for one seed and differ for another (the private seeded PRNG)',x0.every((v,i)=>v===x1[i])&&y.some((v,i)=>v!==x0[i]));}}

  /* ===== 4. the band and the death through the recording fake AudioContext ===== */
  {const step=boot.stepper(1300000);
    if(typeof V.crMusSound!=='function'){skip('the band through the fake AC','no crMusSound setter in this build');return;}
    boot.world(V,'m2au','1337',step);boot.kit(V,'A');V.GR.god=true;V.crMusSound(false);V.crMusMusic(true);
    let fr=0;const mt=V.crMusTick?V.crMusTick:null;   /* the browser runs setInterval(musicTick,300) after mgBoot; headless we call it every 7 frames */
    const tick=n=>{for(let i=0;i<(n||1);i++){if(HOLD.ac)HOLD.ac.advance(0.04);step(1);if(mt&&(++fr%7)===0)mt()();}};
    boot.bite(V,step,{r:15});const n0=HOLD.ac?HOLD.ac.nodes.length:0;V.MGREG.fight.wake('poke');tick(60);
    ok('Sound off: a summon and 2.4 s of the fight create no audio node at all',(HOLD.ac?HOLD.ac.nodes.length:0)===n0);
    V.crMusSound(true);V.crMusMusic(true);V.mgSkipTo(1);
    const until=(f,max)=>{for(let i=0;i<(max||600);i++){if(f())return true;tick(1);}return !!f();};
    until(()=>!V.getCUT().on&&V.mgInfo().live,600);tick(90);
    const ac=HOLD.ac;if(!ac){skip('the band through the fake AC','the game never built an AudioContext');return;}
    /* the band's sources: buffers that are not one of the SFX (their length is a bar) */
    const bandG=()=>V.mg2BandState&&V.getMG2SND?V.getMG2SND().band.g:null;
    const srcs=()=>ac.nodes.filter(q=>q.kind==='src'&&q.buffer&&q.started);
    const bars=()=>srcs().filter(q=>q.out[0]&&q.out[0]===bandG());
    const tb=bars().filter(q=>Math.abs(q.buffer.length-4.0*SR)<2);
    const st=tb.map(q=>q.started[0]).sort((a,b)=>a-b),gaps=st.slice(1).map((t,i)=>t-st[i]);
    ok('Round I plays The Table: '+tb.length+' bars scheduled ahead on AC time, back to back (every gap exactly 4.000 s)',tb.length>=2&&gaps.every(g=>Math.abs(g-4.0)<1e-6)&&st[st.length-1]>ac.t);
    /* to Round III, the kill, the death */
    V.mgSkipTo(3);until(()=>!V.getCUT().on&&V.mgInfo().live&&V.getMGF().round===3,900);tick(30);
    const maw=bars().filter(q=>q.started[0]>ac.t-2&&q.buffer.length<1.2*SR);
    ok('Round III plays The Maw (a heartbeat bar per beat)',maw.length>=1);
    until(()=>V.MGREG.fight.inhaling(),600);tick(30);
    const sb=V.getMG2SND().band,duckKey=Object.keys(V.getMG2SND().cache).some(k=>/^mg_cue_maw_.*d@/.test(k));
    ok('the inhale ducks the band (a ducked Maw bar is rendered and scheduled)',duckKey&&!!sb.g);
    const inh=srcs().filter(q=>q.buffer&&Math.abs(q.buffer.length-V.mg2SfxRender('mg_inhale',SR).length)<2);
    ok('the inhale riser plays (one voice per inhale)',inh.length>=1);
    const G=()=>V.getMG2(),winOf=k=>{const w=G().win;return w&&w.kind===k?w:null;};
    until(()=>!!winOf('sun'),4000);
    const w=winOf('sun');if(!w){ok('the gag opened for the kill',false);return;}
    {const q=G().r3,ux=Math.cos(q.th),uz=Math.sin(q.th);boot.tp(V,q.sun.x+ux*2.2,V.mgF(),q.sun.z+uz*2.2);}tick(7);
    const e=boot.boss(V);e.hp=1;const tKill=ac.t,nBefore=ac.nodes.length;V.mgHitAs(w.part,13,'Dan','melee');tick(1);
    ok('the killing hit starts the death scene',G().scene&&G().scene.k==='death');
    const tK=ac.t;tick(Math.round(14.5/0.04));
    /* mixdown of everything started in the fake: buffer x gain chain (set/target events applied as steps) */
    const gainAt=(p,t)=>{if(!p.ev.length)return p.value;let v=1;for(const ev of p.ev){if(ev[0]==='cancel'||ev[0]==='hold')continue;if(ev[2]<=t)v=ev[1];}return v;};
    const mix=(t0,t1)=>{const n=Math.round((t1-t0)*SR),y=new Float64Array(n);
      for(const s of srcs()){const b=s.buffer,d=b.getChannelData?b.getChannelData(0):null;if(!d||s.loop)continue;const ts=s.started[0],te=s.stopped!=null?s.stopped:ts+b.duration;
        if(te<=t0||ts>=t1)continue;let g=s.out[0],chainG=[];while(g&&g.kind==='gain'){chainG.push(g);g=g.out[0];}
        for(let i=Math.max(0,Math.floor((t0-ts)*SR));i<d.length;i++){const t=ts+i/SR;if(t>=t1||t>=te)break;if(t<t0)continue;let a=d[i];for(const q of chainG)a*=gainAt(q.gain,t);y[Math.floor((t-t0)*SR)]+=a;}}
      return y;};
    const sil=mix(tK+0.02,tK+1.42),rs=dB(D.rms(sil));
    const later=ac.nodes.slice(nBefore).filter(q=>q.kind==='osc'||(q.kind==='src'&&q.started&&q.started[0]>=tK+0.02&&q.started[0]<tK+1.42));
    ok('the death silence: the mix from the killing hit stays below -60 dBFS for 1.4 s ('+(isFinite(rs)?rs.toFixed(1):'-inf')+' dBFS), and nothing new starts in it',rs<-60&&later.filter(q=>q.kind==='src').length===0);
    const chordLen=V.mg2SfxRender('mg_chord',SR).length,chords=srcs().filter(q=>q.started[0]>=tK&&Math.abs(q.buffer.length-chordLen)<2);
    ok('ONE major chord in the whole death ('+chords.length+'), after the silence',chords.length===1&&chords[0].started[0]>tK+1.5);
    {const x=V.mg2SfxRender('mg_chord',SR),pc=pitchClasses(x.subarray(0,Math.round(2*SR)));const k=Object.keys(pc).map(Number).sort((a,b)=>a-b);
      ok('...and it is E major: pitch classes '+k.map(i=>NAMES[i]).join(' ')+' (E, G#, B and nothing else)',k.join(',')===[4,8,11].join(','));}
    if(chords.length){const tc=chords[0].started[0],after=srcs().filter(q=>q.started[0]>tc+0.01&&q.started[0]<tK+14.5),ton=[];
      for(const s of after){const d=s.buffer.getChannelData(0),fl=flat(d);if(s.out[0]===bandG()||fl<0.01)ton.push((s.out[0]===bandG()?'band ':'')+fl.toFixed(3));}
      ok('nothing tonal after the chord: '+after.length+' later sounds, all noise (flatness >= 0.01), no band bar'+(ton.length?' (tonal: '+ton.join(',')+')':''),ton.length===0);}
    if(V.getWIN().open)V.mgCore().closeWin();V.GR.god=false;V.crMusSound(false);}
});
