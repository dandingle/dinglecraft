/* c2_dsp.js (C2): signal-analysis helpers for c2_audio.js (the offline audio gate). Pure node, no dependencies, no audio device.
   fft(re,im)                       in-place radix-2 FFT (length a power of two)
   spectrum(x,start,N)              Hann-windowed magnitude spectrum (N/2 bins) of x[start..start+N)
   peakHz(x,sr,start,N,lo,hi)       the strongest bin in [lo,hi] Hz, refined by parabolic interpolation on log magnitude
   yin(x,sr,start,W,fmin,fmax)      YIN fundamental estimate (cumulative-mean-normalised difference, threshold 0.12)
   centroid(x,sr,start,N)           spectral centroid in Hz
   bandShare(x,sr,start,N,lo,hi)    fraction of spectral energy between lo and hi Hz
   harmRatio(x,sr,start,N,f)        energy at harmonics 2..6 over the energy at the fundamental (+-3% windows)
   env(x,sr,ms)                     RMS envelope, one value per millisecond over a centred window of `ms`
   onsets(x,sr)                     onset times in seconds (envelope rise, refined to 15% of the rise)
   rms(x,a,b), peak(x), dc(x)       level helpers
   attackMs(x,sr), decayMs(x,sr,db) time to the envelope peak, and from it down to -db dB
   aRms(x,sr)                       A-weighted RMS (IEC 61672 curve, 0 dB at 1 kHz) from Hann frames of 8192, hop 4096: loudness closer
                                    to the ear than plain RMS (fix lead, v6.2 review: the bells balance) */
'use strict';
function fft(re,im){const n=re.length;
  for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}}
  for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a),h=len>>1;
    for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<h;k++){const p=i+k,q=p+h,tr=re[q]*cr-im[q]*ci,ti=re[q]*ci+im[q]*cr;
      re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr;}}}}
function spectrum(x,start,N){const re=new Float64Array(N),im=new Float64Array(N);
  for(let i=0;i<N;i++){const v=start+i<x.length?x[start+i]:0;re[i]=v*(0.5-0.5*Math.cos(2*Math.PI*i/(N-1)));}
  fft(re,im);const m=new Float64Array(N>>1);for(let i=0;i<m.length;i++)m[i]=Math.hypot(re[i],im[i]);return m;}
function peakHz(x,sr,start,N,lo,hi){const m=spectrum(x,start,N),bw=sr/N;let b0=Math.max(1,Math.floor(lo/bw)),b1=Math.min(m.length-2,Math.ceil(hi/bw)),bi=b0;
  for(let b=b0;b<=b1;b++)if(m[b]>m[bi])bi=b;
  const L=v=>Math.log(v+1e-12),a=L(m[bi-1]),b=L(m[bi]),c=L(m[bi+1]),d=a-2*b+c,off=d!==0?0.5*(a-c)/d:0;
  return (bi+Math.max(-0.5,Math.min(0.5,off)))*bw;}
function yin(x,sr,start,W,fmin,fmax){const tmax=Math.min(Math.floor(sr/fmin),x.length-start-W-1),tmin=Math.max(2,Math.floor(sr/fmax));if(tmax<=tmin)return 0;
  const d=new Float64Array(tmax+1);for(let t=1;t<=tmax;t++){let s=0;for(let j=0;j<W;j++){const v=x[start+j]-x[start+j+t];s+=v*v;}d[t]=s;}
  const c=new Float64Array(tmax+1);c[0]=1;let run=0;for(let t=1;t<=tmax;t++){run+=d[t];c[t]=run>0?d[t]*t/run:1;}
  let t=tmin;for(;t<=tmax;t++)if(c[t]<0.12){while(t+1<=tmax&&c[t+1]<c[t])t++;break;}
  if(t>tmax){let bi=tmin;for(let k=tmin;k<=tmax;k++)if(c[k]<c[bi])bi=k;t=bi;}
  const a=c[t-1],b=c[t],e=t+1<=tmax?c[t+1]:b,dd=a-2*b+e,off=dd!==0?0.5*(a-e)/dd:0;
  return sr/(t+Math.max(-0.5,Math.min(0.5,off)));}
function centroid(x,sr,start,N){const m=spectrum(x,start,N),bw=sr/N;let s=0,w=0;for(let i=1;i<m.length;i++){const p=m[i]*m[i];s+=p*i*bw;w+=p;}return w>0?s/w:0;}
function bandShare(x,sr,start,N,lo,hi){const m=spectrum(x,start,N),bw=sr/N;let a=0,t=0;for(let i=1;i<m.length;i++){const p=m[i]*m[i];t+=p;if(i*bw>=lo&&i*bw<=hi)a+=p;}return t>0?a/t:0;}
function harmRatio(x,sr,start,N,f){const m=spectrum(x,start,N),bw=sr/N;
  const band=h=>{let s=0;for(let i=Math.max(1,Math.floor(h*f*0.97/bw));i<=Math.min(m.length-1,Math.ceil(h*f*1.03/bw));i++)s+=m[i]*m[i];return s;};
  let u=0;for(let h=2;h<=6;h++)u+=band(h);const f0=band(1);return f0>0?u/f0:Infinity;}
function env(x,sr,ms){const h=Math.max(1,Math.round(sr*(ms||5)/2000)),n=Math.floor(x.length*1000/sr),e=new Float64Array(n);   /* sample k = k ms exactly */
  const c=new Float64Array(x.length+1);for(let i=0;i<x.length;i++)c[i+1]=c[i]+x[i]*x[i];
  for(let k=0;k<n;k++){const m=Math.round(k*sr/1000),a=Math.max(0,m-h),b=Math.min(x.length,m+h);e[k]=Math.sqrt((c[b]-c[a])/Math.max(1,b-a));}return e;}
/* max-abs envelope, one value per millisecond over a centred window of `ms` (flat for any pitch above 1000/ms Hz) */
function maxenv(x,sr,ms){const h=Math.max(1,Math.round(sr*ms/2000)),n=Math.floor(x.length*1000/sr),e=new Float64Array(n);
  for(let k=0;k<n;k++){const m=Math.round(k*sr/1000);let p=0;for(let i=Math.max(0,m-h),b=Math.min(x.length,m+h);i<b;i++){const a=x[i]<0?-x[i]:x[i];if(a>p)p=a;}e[k]=p;}return e;}
/* onsets: a 24 ms max-abs envelope (no ripple from waveforms down to ~45 Hz) rises by more than `rel` of the biggest rise over 12 ms,
   at a local maximum within +-20 ms; the time is then refined on a 2 ms envelope to the first millisecond that is 15% of the way from
   the level just before (its maximum over the 10 ms before) to the peak just after (its maximum over the next 40 ms). Seconds. */
function onsets(x,sr,rel){rel=rel||0.12;const ec=maxenv(x,sr,24),ef=maxenv(x,sr,2),n=ec.length,r=new Float64Array(n);let mx=0;
  for(let k=12;k<n;k++){r[k]=Math.max(0,ec[k]-ec[k-12]);if(r[k]>mx)mx=r[k];}
  const out=[];for(let k=12;k<n;k++){if(r[k]<mx*rel)continue;let lm=true;for(let j=Math.max(12,k-20);j<=Math.min(n-1,k+20);j++)if(r[j]>r[k]||(r[j]===r[k]&&j<k)){lm=false;break;}
    if(!lm)continue;let lo=k-12;while(lo>0&&r[lo-1]>0&&lo>k-24)lo--;                                /* where this rise began */
    let base=0,pk=0;for(let j=Math.max(0,lo-10);j<=lo;j++)base=Math.max(base,ef[j]);for(let j=lo;j<=Math.min(n-1,lo+40);j++)pk=Math.max(pk,ef[j]);
    const th=base+0.15*(pk-base);let t=lo;while(t<lo+40&&t<n-1&&ef[t]<th)t++;out.push(t/1000);}
  return out;}
function rms(x,a,b){a=a||0;b=b==null?x.length:b;let s=0;for(let i=a;i<b;i++)s+=x[i]*x[i];return Math.sqrt(s/Math.max(1,b-a));}
function peak(x){let p=0;for(let i=0;i<x.length;i++){const a=Math.abs(x[i]);if(a>p)p=a;}return p;}
function dc(x){let s=0;for(let i=0;i<x.length;i++)s+=x[i];return s/x.length;}
function attackMs(x,sr){const e=env(x,sr,3);let bi=0;for(let k=0;k<Math.min(e.length,400);k++)if(e[k]>e[bi])bi=k;return bi;}
function decayMs(x,sr,db){const e=env(x,sr,10);let bi=0;for(let k=0;k<e.length;k++)if(e[k]>e[bi])bi=k;const th=e[bi]*Math.pow(10,-(db||20)/20);
  let k=bi;while(k<e.length&&e[k]>th)k++;return k-bi;}
function aW(f){const f2=f*f;return 1.2589*(12194*12194*f2*f2)/((f2+20.6*20.6)*Math.sqrt((f2+107.7*107.7)*(f2+737.9*737.9))*(f2+12194*12194));}
function aRms(x,sr){const N=8192;let s=0,c=0;const p=x.length<N?Float32Array.from({length:N},(_,i)=>i<x.length?x[i]:0):x;
  for(let st=0;st+N<=p.length;st+=N/2){const m=spectrum(p,st,N);for(let i=1;i<m.length;i++){const w=aW(i*sr/N);s+=(m[i]*w)*(m[i]*w);}c++;}
  return Math.sqrt(s/Math.max(1,c));}
module.exports={fft,spectrum,peakHz,yin,centroid,bandShare,harmRatio,env,maxenv,onsets,rms,peak,dc,attackMs,decayMs,aRms};
