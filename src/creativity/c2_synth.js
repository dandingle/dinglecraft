/* ---- PART 56: c2_synth.js ---- */
/* PART 56 c2 (C2, music): the synth (Creativity Update plan, section 8.4).
   crSongRender(d,sr) renders a song to a mono Float32Array of exactly round(crSongLen(d)*sr) samples: pure JS, deterministic (all
   noise comes from mulberry32 seeded by the instrument, row and octave, never Math.random), the same samples in node and in the
   browser. Notes that ring past the end of the loop wrap around to its start, so a looping AudioBufferSource joins seamlessly.
   Each distinct note (instrument, row, octave, key, held length) is synthesised once per render and mixed at every step it plays,
   like a drum machine's samples. Instruments: piano (8 decaying partials, the low ones on two slightly detuned strings, a hammer), bass (filtered saw + sine), lead synth
   (square with vibrato through a low-pass), pluck guitar (Karplus-Strong), bells (2-op FM, ratio 3.5) and a drum kit (kick, snare,
   hat, clap). The mix is DC-free (the mean of a loop is its DC) and passes a soft limiter (linear below 0.6, never reaching 1). */
const CRS_TWO_PI=Math.PI*2;
function crSynSeed(k,row,o){return (crHash(k)^Math.imul(row+1,0x9E3779B1)^Math.imul(o+7,0x85EBCA77))>>>0;}
/* RBJ biquad coefficients [b0,b1,b2,a1,a2] for 'lp' | 'hp' | 'bp' (constant 0 dB peak) and an in-place filter */
function crSynBQ(type,f0,Q,sr){const w=CRS_TWO_PI*Math.min(f0,sr*0.45)/sr,cs=Math.cos(w),al=Math.sin(w)/(2*Q),a0=1+al;let b0,b1,b2;
  if(type==='lp'){b0=(1-cs)/2;b1=1-cs;b2=b0;}else if(type==='hp'){b0=(1+cs)/2;b1=-(1+cs);b2=b0;}else{b0=al;b1=0;b2=-al;}
  return [b0/a0,b1/a0,b2/a0,-2*cs/a0,(1-al)/a0];}
function crSynFilt(x,c){let x1=0,x2=0,y1=0,y2=0;const b0=c[0],b1=c[1],b2=c[2],a1=c[3],a2=c[4];
  for(let i=0;i<x.length;i++){const x0=x[i],y0=b0*x0+b1*x1+b2*x2-a1*y1-a2*y2;x2=x1;x1=x0;y2=y1;y1=y0;x[i]=y0;}return x;}
function crSynNoise(n,R){const a=new Float32Array(n);for(let i=0;i<n;i++)a[i]=R()*2-1;return a;}
function crSynBlep(t,dt){if(t<dt){t/=dt;return t+t-t*t-1;}if(t>1-dt){t=(t-1)/dt;return t*t+t+t+1;}return 0;}
/* a short fade-in and fade-out so no note starts or stops on a step (fade-in only when the voice has no attack of its own) */
function crSynEdges(a,sr,fin){const fo=Math.min(a.length,Math.round(sr*0.006));for(let i=0;i<fo;i++)a[a.length-1-i]*=i/fo;
  if(fin){const n=Math.min(a.length,Math.round(sr*fin));for(let i=0;i<n;i++)a[i]*=i/n;}return a;}
/* ---- melodic voices: (f Hz, hold seconds, sample rate, seeded rng) -> Float32Array ---- */
function crSynPiano(f,hold,sr,R){
  const dec=Math.max(0.45,Math.min(2.2,1.3*Math.pow(261.6/f,0.4))),rel=0.085,h=Math.min(hold,3.4),n=Math.ceil((h+rel*5.5)*sr),out=new Float32Array(n);
  const br=Math.min(1,523/f);                     /* partials ~1/k^0.9, the upper ones dying fastest: a bright strike, a mellow ring */
  for(let k=1;k<=8;k++){const fk=k*f*Math.sqrt(1+0.00025*k*k);if(fk>sr*0.42)break;
    const ak=Math.pow(k,-0.9)*Math.pow(br,(k-1)*0.35),tau=dec/(1+0.9*(k-1));
    for(const [fq,am] of k<=3?[[fk,0.62],[fk*1.0009,0.38]]:[[fk,1]]){const w=CRS_TWO_PI*fq/sr,c2=2*Math.cos(w),d=Math.exp(-1/(tau*sr));
      let s1=0,s2=-Math.sin(w),e=ak*am;for(let i=0;i<n;i++){const v=c2*s1-s2;s2=s1;s1=v;out[i]+=v*e;e*=d;}}}
  const hn=Math.min(n,Math.round(sr*0.03)),hm=crSynFilt(crSynNoise(hn,R),crSynBQ('lp',2200,0.7,sr));
  for(let i=0;i<hn;i++)out[i]+=hm[i]*0.22*Math.exp(-i/(sr*0.005));                  /* the hammer */
  const at=Math.round(sr*0.005),hi=Math.round(h*sr),rd=Math.exp(-1/(rel*sr));let r=1;
  for(let i=0;i<n;i++){if(i<at)out[i]*=0.5-0.5*Math.cos(Math.PI*i/at);if(i>=hi){out[i]*=r;r*=rd;}out[i]*=0.3;}
  return crSynEdges(out,sr,0);}
function crSynBass(f,hold,sr,R){
  const rel=0.07,n=Math.ceil((hold+rel*5)*sr),out=new Float32Array(n),dt=f/sr,hi=Math.round(hold*sr),at=Math.round(sr*0.004);
  const w=CRS_TWO_PI*f/sr,c2=2*Math.cos(w);let s1=0,s2=-Math.sin(w),p=0,lp=0,lp2=0,a=0,r=1;const rd=Math.exp(-1/(rel*sr));
  for(let i=0;i<n;i++){const t=i/sr;
    if((i&31)===0)a=1-Math.exp(-CRS_TWO_PI*(380+1300*Math.exp(-t/0.05))/sr);
    p+=dt;if(p>=1)p-=1;const saw=2*p-1-crSynBlep(p,dt);lp+=a*(saw-lp);lp2+=a*(lp-lp2);
    const v=c2*s1-s2;s2=s1;s1=v;
    let env=i<at?i/at:0.72+0.28*Math.exp(-(t-0.004)/0.12);if(i>=hi){env*=r;r*=rd;}
    out[i]=(lp2*0.9+v*0.62)*env*0.68;}
  return crSynEdges(out,sr,0);}
function crSynLead(f,hold,sr,R){
  const rel=0.09,n=Math.ceil((hold+rel*5)*sr),out=new Float32Array(n),hi=Math.round(hold*sr),at=Math.round(sr*0.012);
  const a=1-Math.exp(-CRS_TWO_PI*3000/sr),rd=Math.exp(-1/(rel*sr)),vw=CRS_TWO_PI*5/sr;let p=0,l1=0,l2=0,r=1;
  for(let i=0;i<n;i++){const t=i/sr,va=t<0.15?0:Math.min(1,(t-0.15)/0.2),dt=f*(1+0.0055*va*Math.sin(vw*i))/sr;
    p+=dt;if(p>=1)p-=1;let q=p+0.5;if(q>=1)q-=1;const sq=(p<0.5?1:-1)+crSynBlep(p,dt)-crSynBlep(q,dt);
    l1+=a*(sq-l1);l2+=a*(l1-l2);
    let env=i<at?i/at:0.8+0.2*Math.exp(-(t-0.012)/0.06);if(i>=hi){env*=r;r*=rd;}
    out[i]=l2*env*0.5;}
  return crSynEdges(out,sr,0);}
/* first-order allpass coefficient whose phase delay AT w (rad/sample) is d samples (bisection: exact for high notes too, where the
   textbook (1-d)/(1+d) drifts); with the averager's 0.5 the loop is exactly sr/f samples long, so the pluck is in tune everywhere */
function crSynAllpass(d,w){const pd=C=>-(Math.atan2(-Math.sin(w),C+Math.cos(w))-Math.atan2(-C*Math.sin(w),1+C*Math.cos(w)))/w;
  let lo=-0.999,hi=0.999;for(let i=0;i<48;i++){const m=(lo+hi)/2;if(pd(m)>d)lo=m;else hi=m;}return (lo+hi)/2;}
function crSynPluck(f,hold,sr,R){
  /* the loss filter (1-rho)+rho/z and the loop gain fb give a ring time that shortens with pitch (tau, seconds); high notes use a
     lighter filter instead of dying in a few periods. The loop is L samples + the filter's and the allpass's phase delays = sr/f. */
  const D=sr/f,w=CRS_TWO_PI*f/sr,tau=Math.max(0.08,Math.min(2.5,1.1*Math.pow(261.6/f,0.6))),lam=-1/(f*tau),la=Math.log(Math.cos(w/2));
  let rho=0.5,fb=1;if(la<lam){const q=Math.min(0.25,-lam/(1-Math.cos(w)));rho=(1-Math.sqrt(1-4*q))/2;}else fb=Math.exp(lam-la);
  const pl=-Math.atan2(-rho*Math.sin(w),1-rho+rho*Math.cos(w))/w;let L=Math.floor(D-pl-0.1);if(L<1)L=1;const C=crSynAllpass(D-pl-L,w);
  const ring=Math.min(Math.max(hold,0.4),2.4),n=Math.ceil((ring+0.12)*sr),out=new Float32Array(n),ri=Math.round(ring*sr);
  const buf=new Float32Array(L);for(let i=0;i<L;i++)buf[i]=R()*2-1;
  if(L>8)for(let pass=0;pass<2;pass++){let pv=buf[L-1];for(let i=0;i<L;i++){const c=buf[i];buf[i]=0.5*(c+pv);pv=c;}}       /* a softer pick */
  let mean=0;for(let i=0;i<L;i++)mean+=buf[i];mean/=L;for(let i=0;i<L;i++)buf[i]-=mean;
  let idx=0,prev=0,apx=0,apy=0;const r0=1-rho;
  for(let i=0;i<n;i++){const y=buf[idx];out[i]=y*0.78;const g=i<ri?fb:fb*0.62,avg=g*(r0*y+rho*prev);prev=y;
    const ap=C*avg+apx-C*apy;apx=avg;apy=ap;buf[idx]=ap;if(++idx>=L)idx=0;}
  return crSynEdges(out,sr,0.0015);}
function crSynBells(f,hold,sr,R){
  const n=Math.ceil(Math.max(1.8,Math.min(hold,4)+0.5)*sr),out=new Float32Array(n),wc=CRS_TWO_PI*f/sr,wm=wc*3.5,at=Math.round(sr*0.002),
    im=5.75*Math.min(1,1400/f),di=Math.exp(-1/(0.16*sr)),de=Math.exp(-1/(0.55*sr));let pc=0,pm=0,ix=im,e=1;
  for(let i=0;i<n;i++){out[i]=Math.sin(pc+(0.25+ix)*Math.sin(pm))*e*(i<at?i/at:1)*0.6;pc+=wc;pm+=wm;if(pc>CRS_TWO_PI){pc-=CRS_TWO_PI;}if(pm>CRS_TWO_PI)pm-=CRS_TWO_PI;ix*=di;e*=de;}
  return crSynEdges(out,sr,0);}
/* ---- the drum kit: row 0 kick, 1 snare, 2 hat, 3 clap; q tunes the kit (2^(octave/2)) ---- */
/* the kick: a pitch sweep down to ~58 Hz, a second harmonic for body (100-350 Hz: the part laptop speakers can play) and a short
   1-3 kHz click; below Oct 0 it follows the kit only half way (q^0.5), so a low kit still has a kick you can hear (v6.2 review) */
function crSynKick(q,sr,R){const kq=q<1?Math.sqrt(q):q,n=Math.ceil(0.5*sr),out=new Float32Array(n),f1=170*kq,f0=58*kq,
    ck=crSynFilt(crSynNoise(Math.round(sr*0.012),R),crSynBQ('bp',2200,0.8,sr));
  let ph=0;for(let i=0;i<n;i++){const t=i/sr;ph+=CRS_TWO_PI*(f0+(f1-f0)*Math.exp(-t/0.035))/sr;
    out[i]=Math.sin(ph)*Math.exp(-t/0.16)*0.56+Math.sin(2*ph)*Math.exp(-t/0.07)*0.17;
    if(i<ck.length)out[i]+=ck[i]*0.55*Math.exp(-t/0.003);}
  return crSynEdges(out,sr,0.0008);}
function crSynSnare(q,sr,R){const n=Math.ceil(0.32*sr),nz=crSynFilt(crSynNoise(n,R),crSynBQ('bp',1800*q,0.75,sr)),out=new Float32Array(n);
  const w1=CRS_TWO_PI*190*q/sr,w2=CRS_TWO_PI*330*q/sr;
  for(let i=0;i<n;i++){const t=i/sr;out[i]=nz[i]*0.62*Math.exp(-t/0.075)+(Math.sin(w1*i)*0.24+Math.sin(w2*i)*0.1)*Math.exp(-t/0.045);}
  return crSynEdges(out,sr,0.0008);}
function crSynHat(q,sr,R){const n=Math.ceil(0.14*sr),out=crSynFilt(crSynFilt(crSynNoise(n,R),crSynBQ('hp',7000*Math.min(q,1.6),0.7,sr)),crSynBQ('hp',7000*Math.min(q,1.6),0.7,sr));
  for(let i=0;i<n;i++)out[i]*=Math.exp(-i/(sr*0.018))*0.36;
  return crSynEdges(out,sr,0.0005);}
function crSynClap(q,sr,R){const n=Math.ceil(0.34*sr),out=crSynFilt(crSynNoise(n,R),crSynBQ('bp',1200*q,1.1,sr));
  for(let i=0;i<n;i++){const t=i/sr;let e=0;
    for(let b=0;b<3;b++){const tb=t-b*0.012;if(tb>=0&&tb<0.010)e=Math.max(e,Math.exp(-tb/0.0035));}
    if(t>=0.024)e=Math.max(e,0.6*Math.exp(-(t-0.024)/0.05));            /* the third clap rings out as the tail */
    out[i]*=e*1.15;}
  return crSynEdges(out,sr,0.0005);}
/* one note of one instrument, unscaled (the instrument's own level is CR_INST[].g, applied by the mixer) */
function crSynNote(k,row,len,o,key,sr,stepS){const R=mulberry32(crSynSeed(k,row,o+(key|0)*5));
  if(k==='drums'){const q=Math.pow(2,(o|0)/2);return row===0?crSynKick(q,sr,R):row===1?crSynSnare(q,sr,R):row===2?crSynHat(q,sr,R):crSynClap(q,sr,R);}
  const f=crSongFreq(k,row,o,key),hold=len*stepS;
  return k==='bass'?crSynBass(f,hold,sr,R):k==='lead'?crSynLead(f,hold,sr,R):k==='pluck'?crSynPluck(f,hold,sr,R):k==='bells'?crSynBells(f,hold,sr,R):crSynPiano(f,hold,sr,R);}
/* the limiter: linear below 0.6, then a tanh knee that approaches (never reaches) 1 */
function crSynLimit(x){const a=x<0?-x:x;if(a<=0.6)return x;const y=0.6+0.4*Math.tanh((a-0.6)/0.4);return x<0?-y:y;}
/* add buf*g into out at i0; wrap: past N it continues from the start (the loop), else it is cut at out.length */
function crSynAdd(out,N,buf,i0,g,wrap){const L=buf.length;let j=0;const e=Math.min(L,(wrap?N:out.length)-i0);
  for(;j<e;j++)out[i0+j]+=buf[j]*g;
  if(wrap){let k=0;for(;j<L;j++){out[k]+=buf[j]*g;if(++k>=N)k=0;}}}
/* the mixer. o.once: no wrap; the buffer is longer than the loop by the longest tail (the editor's play-once preview).
   o.only: render only track index o.only (the editor's audition of a track) */
function crSynMix(m,sr,o){o=o||{};const stepS=crSongStep(m.bpm),N=Math.max(1,Math.round(m.bars*CRS.STEPS*stepS*sr));
  const cache=new Map(),parts=[];let extra=0;
  m.tr.forEach((t,ti)=>{if(t.m||!t.vol||(o.only!=null&&o.only!==ti))return;const I=crSongInst(t.i);if(!I)return;
    for(const q of t.n){const kk=t.i+'|'+q[1]+'|'+t.o+'|'+(I.mel?m.key+'|'+q[2]:'');let b=cache.get(kk);
      if(!b){b=crSynNote(t.i,q[1],q[2],t.o,I.mel?m.key:0,sr,stepS);cache.set(kk,b);}
      const i0=Math.min(N-1,Math.round(q[0]*stepS*sr));parts.push([b,i0,I.g*t.vol/CRS.VOL]);extra=Math.max(extra,i0+b.length-N);}});
  const out=new Float32Array(o.once?N+Math.max(0,extra):N);
  for(const [b,i0,g] of parts)crSynAdd(out,N,b,i0,g,!o.once);
  let mean=0,pk=0;for(let i=0;i<out.length;i++)mean+=out[i];mean/=out.length;
  for(let i=0;i<out.length;i++){out[i]-=mean;const a=out[i]<0?-out[i]:out[i];if(a>pk)pk=a;}
  let g=1;if(pk>0.9){const H=new Uint32Array(512);for(let i=0;i<out.length;i++){const a=out[i]<0?-out[i]:out[i];H[Math.min(511,(a/pk*512)|0)]++;}
    let c=0,b=511;const lim=out.length*0.0015;while(b>0&&(c+=H[b])<lim)b--;const p=(b+1)/512*pk;if(p>0.9)g=0.9/p;}  /* a busy mix is mastered down */
  if(o.stat){o.stat.pk=pk;o.stat.g=g;}
  for(let i=0;i<out.length;i++)out[i]=crSynLimit(out[i]*g);
  return out;}
/* the frozen interface: any payload -> exactly round(crSongLen(d)*sr) samples (sr defaults to 44,100) */
function crSongRender(d,sr){return crSynMix(crSongNorm(d),sr>0?sr:44100,null);}
