/* ---- PART 57: m2_audio.js ---- */
/* ===================================================================== */
/* PART 57 m2 (M2): his band and his sounds (bible 18). NOBODY BUILDING  */
/* THIS COULD HEAR IT: every sound is rendered by a pure-JS function     */
/* (mg2SfxRender, mg2ScoreRender: seeded noise, our own oscillators and  */
/* biquads, no Math.random) so tests/malgorath/m2_audio.js analyses      */
/* exactly the samples a browser plays, and Dan can audition everything  */
/* with Debug -> "Malgorath: sounds". With Sound off nothing audio is    */
/* created; the score obeys Music. One motif: E - D# - C - B, falling.   */
/* ===================================================================== */
var MG2SND={cache:{},voices:[],inh:null,band:{cue:'',t:0,bar:0,g:null,until:0,prev:null,sil:0},n:0,live:0,samp:{on:false,i:0,tm:null,list:[]}};
/* the SFX bank: name -> {v: voices, d: seconds, tw: its visual twin (bible 18.3)}. A voice is ['t',t0,f0,f1,dur,wave,vol,att] (a tone
   gliding f0 -> f1, exponential decay) or ['n',t0,dur,vol,f0,f1,filter,att,q] (seeded noise through a swept biquad) */
var MG2SFX={
  mg_tick:{tw:'the commit flash',v:[['t',0,2600,1900,0.035,'square',0.3],['t',0,95,45,0.14,'sine',0.7]]},
  mg_snore:{tw:'warm puffs out of the slit',lv:0.04,v:[['n',0,2.5,0.55,80,200,'lp',1.2,0.7],['t',0,55,48,2.4,'sine',0.25,1.0]]},
  mg_poke:{tw:'the eye squeezing shut, the plate jolt',v:[['n',0,0.18,0.6,1400,300,'bp',0.01,2],['t',0.05,110,70,0.6,'sawtooth',0.25,0.08]]},
  mg_gulp:{tw:'a bulge down his throat',v:[['t',0,200,55,0.5,'sine',0.8],['n',0,0.55,0.35,300,120,'lp',0.1]]},
  mg_erupt:{tw:'the iris peeling open',v:[['n',0,1.6,0.6,160,60,'lp',0.05],['n',0.1,0.5,0.4,900,300,'bp',0.01,1.5],['t',0.3,1500,1300,0.05,'square',0.2],['t',0.42,1700,1500,0.05,'square',0.18],['t',0.54,1400,1250,0.05,'square',0.16]]},
  mg_slapup:{tw:'the hand rising and its shadow',v:[['t',0,70,140,1.2,'sawtooth',0.18,0.9],['n',0,1.2,0.12,300,900,'bp',0.9,3]]},
  mg_slap:{tw:'the dust ring under the hand',v:[['t',0,90,40,0.6,'sine',0.9],['n',0,0.5,0.6,500,90,'lp'],['n',0.02,0.25,0.35,1800,700,'bp',0,1.2]]},
  mg_chew:{tw:'the jaw working; the palm and finger grind; the lick while he heals',v:[['n',0,0.07,0.5,900,500,'bp',0,4],['n',0.21,0.06,0.45,700,400,'bp',0,4],['n',0.38,0.08,0.5,1100,600,'bp',0,4],['n',0.62,0.06,0.4,500,400,'bp',0,4]]},
  mg_eyelid:{tw:'a hand-eye opening',v:[['n',0,0.05,0.5,2400,900,'bp',0,3],['t',0,600,900,0.06,'sine',0.25]]},
  mg_scrape:{tw:'the spark furrow',v:[['n',0,1.2,0.45,1500,4000,'hp',0.05]]},
  mg_chomp:{tw:'the jaw snapping shut; the tooth rows in the POV',v:[['n',0,0.04,0.8,3000,1500,'hp'],['n',0.06,0.04,0.8,2600,1300,'hp'],['t',0.04,70,35,0.5,'sine',0.9]]},
  mg_spit:{tw:'cheeks bulging, crumbs flying',v:[['n',0,0.3,0.6,1800,400,'bp',0.01,1],['t',0.25,180,120,0.08,'square',0.2],['t',0.4,160,110,0.08,'square',0.18]]},
  mg_cough:{tw:'the wave crawling out of the Throat',v:[['n',0,0.35,0.7,260,90,'lp',0.03],['n',0.45,0.4,0.7,240,80,'lp',0.03],['t',0,85,60,0.8,'sawtooth',0.15]]},
  mg_clap:{tw:'the fly-swat hands',v:[['n',0,0.7,0.35,400,2500,'bp',0.06,1.5],['n',0.7,0.12,0.9,3000,800,'bp',0,0.8],['t',0.7,120,60,0.3,'sine',0.6]]},
  mg_step:{tw:'footfall dust and shake',v:[['t',0,65,35,0.4,'sine',0.85],['n',0,0.25,0.4,220,80,'lp']]},
  mg_stab2:{tw:'the drool line splashing',v:[['t',0,164.8,164.8,0.25,'sawtooth',0.32,0.01],['t',0,174.6,174.6,0.25,'sawtooth',0.32,0.01],['t',0,82.4,82.4,0.25,'sawtooth',0.2,0.01]]},
  mg_lunge:{tw:'the lunge and its trench',v:[['t',0,72,60,1.0,'sawtooth',0.35,0.05],['t',0,88,74,1.0,'sawtooth',0.3,0.05],['n',0,0.9,0.5,600,200,'lp',0.1]]},
  mg_crack:{tw:'the tooth flying',v:[['n',0,0.05,0.9,4000,2000,'hp'],['t',0,2100,2090,1.2,'sine',0.45]]},
  mg_belly:{tw:'the belly bulge, the smoke',v:[['n',0,0.6,0.9,120,60,'lp',0.02],['t',0.5,140,70,0.45,'square',0.25]]},
  mg_snuff:{tw:'the learned lit meal burped out in black smoke',v:[['n',0,0.5,0.35,2500,1200,'hp',0.05],['t',0.45,150,80,0.25,'square',0.2],['n',0.7,0.05,0.5,3000,1500,'bp',0,2]]},
  mg_stomp:{tw:'the crack ring and the dust wave',v:[['t',0,60,30,0.9,'sine',1.0],['n',0,0.6,0.6,400,70,'lp'],['n',0.1,0.6,0.3,300,1800,'bp',0.1,1]]},
  mg_squat:{tw:'the floor cracking round his hooves',v:[['t',0,75,40,0.5,'sine',0.8],['n',0.05,0.8,0.35,1200,3000,'hp',0.05]]},
  mg_rattle:{tw:'the cube glowing, the dust line, the sweep',v:[['n',0,0.9,0.4,2000,1500,'bp',0.02,6],['n',0.9,0.4,0.5,500,2500,'bp',0.05,1]]},
  mg_rimbite:{tw:'the crescent going',v:[['n',0,0.15,0.8,1200,500,'bp',0,1.5],['n',0.1,1.0,0.4,600,150,'lp',0.05]]},
  mg_eat:{tw:'a placed block flying into his mouth (and the table clearing)',v:[['n',0,0.3,0.4,600,2400,'bp',0.2,2],['n',0.3,0.08,0.6,900,500,'bp',0,4]]},
  mg_slurp:{tw:'liquid vanishing in a steam puff',v:[['t',0,300,900,0.35,'sine',0.35,0.05],['n',0.2,0.6,0.3,4000,2500,'hp',0.1]]},
  mg_fizzle:{tw:'a blink failing (the pearl\'s light streaming into his mouth); a torch fizzling',v:[['n',0,0.4,0.4,6000,1200,'bp',0.35,2],['t',0,1800,600,0.4,'sine',0.15,0.3]]},
  mg_skid:{tw:'a grapple hook skidding off his plate in sparks; a rope sucked in',v:[['n',0,0.3,0.5,3500,5000,'hp'],['t',0,2600,1900,0.25,'square',0.12]]},
  mg_inhale:{tw:'the violet streaks (a riser that cuts dead at the swallow)',v:[['n',0,0.3,0.3,700,300,'bp',0.005,1],['n',0,6.0,0.6,200,2000,'bp',-1,2],['t',0,82.4,329.6,6.0,'sawtooth',0.12,-1],['t',0,83.3,333.2,6.0,'sawtooth',0.12,-1]]},
  mg_lane:{tw:'the lane streak',v:[['t',0,700,1600,0.8,'sine',0.3,0.5],['n',0,0.8,0.15,1500,3000,'bp',0.5,4]]},
  mg_swallow:{tw:'the bulge, the belly flaring',v:[['t',0,300,40,1.0,'sine',0.85]]},
  mg_drag:{tw:'the palm dragging, the spark bar',v:[['n',0,0.8,0.5,300,500,'bp',0.05,1],['n',0,0.8,0.3,3000,5000,'hp',0.05]]},
  mg_pluck:{tw:'the hand reaching into the gut',v:[['n',0,0.15,0.6,800,300,'bp',0,2],['t',0.2,60,90,0.6,'sawtooth',0.2,0.2]]},
  mg_gag:{tw:'the convulsions, the light beams',v:[['t',0,90,80,0.2,'square',0.3],['t',0.3,85,75,0.2,'square',0.3],['t',0.6,80,70,0.25,'square',0.3],['t',0,600,1400,1.5,'sine',0.12,1.2]]},
  mg_retch:{tw:'the cough-out at a window\'s cap',v:[['n',0,0.5,0.8,350,120,'lp',0.05],['n',0.5,0.3,0.6,900,300,'bp',0.02,1.5],['t',0,95,55,0.7,'sawtooth',0.2]]},
  mg_band:{tw:'the violet band on the closing edge',lv:0.06,v:[['n',0,2.8,0.5,90,180,'lp',0.12],['t',0,45,42,2.8,'sawtooth',0.1,0.12]]},
  mg_fall:{tw:'the edge falling',v:[['n',0,1.4,0.7,700,120,'lp',0.02],['t',0.1,90,40,1.0,'sine',0.5]]},
  mg_sun:{tw:'the sun sliding into his mouth',v:[['t',0,1318.5,329.6,4,'sine',0.12,0.2],['t',0,1661.2,415.3,4,'sine',0.1,0.2],['t',0,1975.5,493.9,4,'sine',0.1,0.2],['t',0,2637,659.3,4,'sine',0.06,0.2],['t',0,3322.4,830.6,4,'sine',0.05,0.2],['t',0,3951.1,987.8,4,'sine',0.05,0.2]]},
  mg_roar:{tw:'eruptions, transitions, the door shutting',v:[['t',0,61,58,1.6,'sawtooth',0.35,0.1],['t',0,90,86,1.6,'sawtooth',0.3,0.1],['t',0,93,89,1.6,'sawtooth',0.3,0.1],['n',0,1.6,0.5,300,120,'lp',0.1]],trem:8},
  mg_vacuum:{tw:'Dan\'s drops streaming in',v:[['n',0,1.2,0.5,300,3000,'bp',0.8,2]]},
  mg_belch:{tw:'Dan\'s things arcing back',v:[['t',0,140,70,0.6,'square',0.3,0.03],['n',0.55,0.15,0.6,1500,400,'bp',0,1]],trem:22},
  mg_burst:{tw:'the burst',v:[['n',0,2.5,1.0,4000,200,'lp',0],['t',0.1,220,210,1.4,'sawtooth',0.25],['t',0.5,196,186,1.4,'sawtooth',0.25],['t',0.9,175,166,1.4,'sawtooth',0.25],['t',1.3,165,156,1.6,'sawtooth',0.25]]},
  mg_bury:{tw:'the leftovers falling on him',lv:0.06,v:[['n',0,3.5,0.6,500,90,'lp',0.4],['n',0.2,0.1,0.5,800,300,'bp',0,2],['n',0.9,0.1,0.5,700,300,'bp',0,2],['n',1.6,0.1,0.5,900,300,'bp',0,2],['n',2.4,0.1,0.4,600,300,'bp',0,2]]},
  mg_silence:{tw:'his freeze at the killing hit',v:[]},
  mg_chord:{tw:'the sun going back up (the only major chord)',v:[['t',0,164.8,164.8,4,'sine',0.25,0.02],['t',0,207.7,207.7,4,'sine',0.22,0.02],['t',0,246.9,246.9,4,'sine',0.22,0.02],['t',0,329.6,329.6,4,'sine',0.2,0.02],['t',0,659.3,659.3,3,'triangle',0.08,0.01],['t',0,830.6,830.6,3,'triangle',0.07,0.01],['t',0,987.8,987.8,3,'triangle',0.07,0.01]]}
};
var MG2CUES=['asleep','table','plate','maw','heart'];

/* ---- the pure-JS synth (shared by the SFX and the score) ---- */
function mg2BQ(type,f0,Q,sr){const w=2*Math.PI*Math.min(f0,sr*0.45)/sr,cs=Math.cos(w),al=Math.sin(w)/(2*(Q||0.707)),a0=1+al;let b0,b1,b2;
  if(type==='lp'){b0=(1-cs)/2;b1=1-cs;b2=b0;}else if(type==='hp'){b0=(1+cs)/2;b1=-(1+cs);b2=b0;}else{b0=al;b1=0;b2=-al;}
  return [b0/a0,b1/a0,b2/a0,-2*cs/a0,(1-al)/a0];}
function mg2Osc(type,p){if(type==='sine')return Math.sin(2*Math.PI*p);if(type==='square')return p<0.5?0.6:-0.6;if(type==='triangle')return 4*Math.abs(p-0.5)-1;return 2*p-1;}
function mg2Env(i,n,att,sr){const t=i/sr,fo=Math.min(1,(n-i)/(sr*0.004));if(att<0)return Math.pow(i/n,1.5)*fo;   /* att < 0: a swell that cuts dead */
  const a=att>0?Math.min(1,t/att):1,d=Math.pow(0.001,i/n);return a*d*fo;}
function mg2SynT(out,sr,t0,f0,f1,dur,type,vol,att){const s0=Math.round(t0*sr),n=Math.round(dur*sr);let p=0;
  for(let i=0;i<n&&s0+i<out.length;i++){const k=i/n,f=f0*Math.pow(f1/f0,k);p+=f/sr;p-=Math.floor(p);out[s0+i]+=mg2Osc(type,p)*vol*mg2Env(i,n,att||0.004,sr);}}
function mg2SynN(out,sr,t0,dur,vol,f0,f1,ft,att,q,R){const s0=Math.round(t0*sr),n=Math.round(dur*sr);let x1=0,x2=0,y1=0,y2=0,c=null;
  for(let i=0;i<n&&s0+i<out.length;i++){if((i&31)===0){const k=i/n;c=mg2BQ(ft||'lp',Math.max(40,f0*Math.pow((f1||f0)/f0,k)),q||0.9,sr);}
    const x0=R()*2-1,y0=c[0]*x0+c[1]*x1+c[2]*x2-c[3]*y1-c[4]*y2;x2=x1;x1=x0;y2=y1;y1=y0;out[s0+i]+=y0*vol*(ft==='bp'?2.2:1)*mg2Env(i,n,att||0.004,sr);}}
function mg2Hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
/* peak <= pk; a quiet recipe is raised until its RMS reaches rmsT (or its peak reaches pk), a loud one is never lowered below pk */
function mg2Norm(x,pk,rmsT){let m=0,s=0;for(let i=0;i<x.length;i++){m=Math.max(m,Math.abs(x[i]));s+=x[i]*x[i];}if(!(m>0))return x;const r=Math.sqrt(s/x.length);
  const g=Math.min(pk/m,Math.max(1,(rmsT||0)/r));if(g!==1)for(let i=0;i<x.length;i++)x[i]*=g;return x;}
/* one SFX: deterministic samples (the same in node and the browser), peak <= -1.4 dBFS, onset at t 0 */
function mg2SfxRender(name,sr){const S=MG2SFX[name];sr=sr||44100;if(!S)return new Float32Array(0);
  let d=0.05;for(const v of S.v)d=Math.max(d,v[0]==='t'?v[1]+v[4]:v[1]+v[2]);
  const out=new Float32Array(Math.ceil((d+0.02)*sr)),R=mulberry32(mg2Hash(name));
  for(const v of S.v){if(v[0]==='t')mg2SynT(out,sr,v[1],v[2],v[3],v[4],v[5],v[6],v[7]);else mg2SynN(out,sr,v[1],v[2],v[3],v[4],v[5],v[6],v[7],v[8],R);}
  if(S.trem)for(let i=0;i<out.length;i++)out[i]*=0.6+0.4*Math.sin(2*Math.PI*S.trem*i/sr);
  return mg2Norm(out,0.85,S.lv==null?0.1:S.lv);}

/* ---- the score (bible 18.2): one bar of a cue as samples. Tempo, key and voices per cue; bar index picks the variant ---- */
var MG2KEY={E1:41.2,B1:61.74,C2:65.41,Ds2:77.78,E2:82.41,F2:87.31,G2:98.0,Gs2:103.83,A2:110,B2:123.47,C3:130.81,D3:146.83,E3:164.81};
function mg2BarLen(cue,o){if(cue==='table')return 4.0;if(cue==='plate')return 2.4;if(cue==='maw'||cue==='heart')return 60/Math.max(40,Math.min(160,(o&&o.bpm)||60));return 4.8;}
/* o.stem (the audio gate only): the melodic voices alone, so their pitches can be tracked under the drums */
function mg2ScoreRender(cue,bar,seed,sr,o){sr=sr||44100;o=o||{};const L=mg2BarLen(cue,o),out=new Float32Array(Math.round(L*sr)),R=mulberry32(((seed>>>0)^Math.imul(bar+1,0x9E3779B1)^mg2Hash(cue))>>>0),K=MG2KEY;
  const kick=(t,f0,f1,v)=>{mg2SynT(out,sr,t,f0,f1,0.45,'sine',v);mg2SynN(out,sr,t,0.06,v*0.4,1200,300,'bp',0.002,1,R);};
  if(cue==='asleep'){mg2SynT(out,sr,0,K.E1,K.E1,L,'sine',0.35,0.6);mg2SynT(out,sr,0,K.E1*2.005,K.E1*2,L,'triangle',0.06,1.0);   /* the sub drone */
    for(let t=0.2;t<L;t+=1.2){mg2SynT(out,sr,t,60,32,0.14,'sine',0.5);mg2SynT(out,sr,t+0.22,55,30,0.12,'sine',0.35);}        /* the double-thump heart */
    mg2SynN(out,sr,0,L,0.2,180,140,'lp',1.2,0.8,R);                                                                       /* low wind */
    if(bar%2===0)for(const [f,ff] of [[K.E2*2,700],[K.B2,1100],[K.E3,700]]){mg2SynT(out,sr,0.3,f,f*1.003,L-0.4,'sawtooth',0.012,1.6);}   /* the choir ah */
    if(bar%4===3)mg2SynN(out,sr,1.5,0.4,0.25,500,250,'bp',0.01,3,R);                                                       /* a crunch from below */
  }else if(cue==='table'){const b=1.0;                                                                                     /* 60 BPM, E phrygian, 4/4 */
    if(!o.stem){kick(0,80,40,0.7);kick(2.5*b,80,40,0.55);                                                                  /* taiko on 1 and the and-of-3 */
    for(let k=0;k<3;k++)mg2SynN(out,sr,k*4/3,0.07,0.22,500+R()*400,300,'bp',0.002,3,R);for(let k=0;k<2;k++)mg2SynN(out,sr,0.6+k*2,0.06,0.18,800,500,'bp',0.002,4,R);   /* chewing 3 against 2 */
    mg2SynT(out,sr,0,K.E1,K.E1,L,'sine',0.18,0.3);}
    if(bar%8===0){const M=[K.E3,K.E3*0.9439,K.C3,K.B2];for(let i=0;i<4;i++){mg2SynT(out,sr,i*0.9,M[i],M[i],1.2,'sine',0.16,0.005);mg2SynT(out,sr,i*0.9,M[i]*2.76,M[i]*2.76,0.6,'sine',0.04,0.005);}}   /* the swallow motif on bells */
    if(o.swell&&!o.stem)for(const f of [K.E2,K.B2,K.E3])mg2SynT(out,sr,L-1.2,f,f,1.15,'sawtooth',0.02,0.9);
  }else if(cue==='plate'){const b=0.6;                                                                                     /* 100 BPM, E phrygian dominant */
    if(!o.stem){kick(0,120,40,0.75);kick(2*b,120,40,0.6);mg2SynT(out,sr,b,140,90,0.25,'sine',0.3);mg2SynT(out,sr,3*b,120,80,0.25,'sine',0.3);}   /* war drum, low toms */
    const O=[K.E2,K.E2,K.Ds2,K.C2],Bb=[K.E2,K.F2,K.Gs2,K.F2];const line=bar%2?Bb:O;
    for(let i=0;i<4;i++)mg2SynT(out,sr,i*b,line[i],line[i],b*0.9,'sawtooth',0.13,0.01);                                  /* the motif ostinato */
    if(!o.stem){mg2SynN(out,sr,b*1.5,0.04,0.08,6000,5000,'hp',0.001,1,R);mg2SynN(out,sr,b*3.5,0.04,0.08,6000,5000,'hp',0.001,1,R);}
  }else if(cue==='maw'||cue==='heart'){mg2SynT(out,sr,0,60,30,0.12,'sine',0.85);mg2SynT(out,sr,Math.min(L*0.35,0.24),55,28,0.1,'sine',0.55);   /* the heartbeat (the sun inside him) */
    if(cue==='maw')mg2SynT(out,sr,0,K.E1,K.E1,L,'sine',0.1,0.05);}
  /* bar joins: 6 ms fades so a bar never clicks into the next */
  const fd=Math.round(sr*0.006);for(let i=0;i<fd&&i<out.length;i++){out[i]*=i/fd;out[out.length-1-i]*=i/fd;}
  mg2Level(out,0.126,0.84);                                                                  /* RMS -18 dBFS, peak <= -1.5 dBFS (soft knee) */
  if(o.duck)for(let i=0;i<out.length;i++)out[i]*=0.5;                                        /* the duck under the inhale: -6 dB, after the leveller */
  return out;}
function mg2Level(x,rmsT,pk){let s=0;for(let i=0;i<x.length;i++)s+=x[i]*x[i];const r=Math.sqrt(s/Math.max(1,x.length));if(r<=0)return x;const g=rmsT/r;
  for(let i=0;i<x.length;i++){let v=x[i]*g;const a=Math.abs(v);if(a>0.6)v=Math.sign(v)*(0.6+(pk-0.6)*Math.tanh((a-0.6)/(pk-0.6)));x[i]=v;}return x;}

/* ---- playback: buffers made from the renders, through his own gain; nothing at all when Sound is off ---- */
function mg2Buf(a,key,mk){const sr=a.sampleRate||44100,k=key+'@'+sr;let d=MG2SND.cache[k];if(!d){d=mk(sr);MG2SND.cache[k]=d;}
  const b=a.createBuffer(1,Math.max(1,d.length),sr),ch=b.getChannelData(0);const n=Math.min(d.length,ch.length);for(let i=0;i<n;i++)ch[i]=d[i];return b;}
function mg2Sfx(n){if(!soundOn||!MG2SFX[n])return;const a=audio();if(!a)return;MG2SND.n++;
  if(MG2SND.band.sil>a.currentTime&&n!=='mg_silence')return;                                  /* the death's 1.5 s of total silence */
  if(n==='mg_silence'){MG2SND.band.sil=a.currentTime+1.5;mg2BandMute(a,1.5);                /* and every voice of his still ringing stops */
    for(const q of MG2SND.voices.splice(0)){if(q.end<=a.currentTime)continue;try{q.g.gain.setTargetAtTime(0,a.currentTime,0.006);q.src.stop(a.currentTime+0.05);}catch(err){}}
    MG2SND.inh=null;return;}
  if((n==='mg_swallow'||n==='mg_chomp')&&MG2SND.inh){const q=MG2SND.inh;MG2SND.inh=null;try{q.g.gain.setTargetAtTime(0,a.currentTime,0.008);q.src.stop(a.currentTime+0.06);}catch(err){}}   /* the riser cuts dead */
  try{const src=a.createBufferSource(),g=a.createGain();src.buffer=mg2Buf(a,n,sr=>mg2SfxRender(n,sr));g.gain.value=0.9*SNDMUL;src.connect(g);g.connect(a.destination);src.start(a.currentTime+0.005);
    if(n==='mg_inhale')MG2SND.inh={src,g};const now=a.currentTime;MG2SND.voices=MG2SND.voices.filter(q=>q.end>now);MG2SND.voices.push({src,g,end:now+0.01+src.buffer.duration});}catch(err){}}
{const mg2PlayS0=playS;playS=function(n){if(typeof n==='string'&&n.charCodeAt(0)===109&&n.charCodeAt(1)===103&&n.charCodeAt(2)===95){if(!soundOn)return;try{mg2Sfx(n);}catch(e){}return;}
  return mg2PlayS0(n);};}

/* ---- the band: a musicTick wrapper installed by mgBoot outside every PART's wrapper (MGREG.music) ---- */
function mg2BandState(){if(DIM!=='over'||!P||(DEMON.dead&&!(MG2.scene&&MG2.scene.k==='death')))return null;
  const d=Math.hypot(P.x-MGC.X,P.z-MGC.Z);if(d>MGC.R_GRADE)return null;
  const sc=MG2.scene;if(sc&&sc.k==='death')return {cue:'',g:0};
  if(MGF.live||sc){const r=sc?(sc.k==='climb'?2:(sc.k==='light'?3:1)):MGF.round;
    if(r===3){const q=MG2.r3,b=mg2Boss(),hp=b?b.hp:300;if(q&&q.ph==='supper')return {cue:'heart',g:0.9,bpm:140};
      return {cue:'maw',g:0.8,bpm:60+80*(1-Math.max(0,Math.min(1,hp/300))),duck:mg2Inhaling()};}
    return {cue:r===2?'plate':'table',g:0.8,swell:!!(MG2.atk&&(MG2.atk.k==='slap'||MG2.atk.k==='scoop'))};}
  return {cue:'asleep',g:Math.max(0.15,1-d/MGC.R_GRADE)};}
function mg2BandMute(a,s){const B=MG2SND.band;if(!B.g)return;try{B.g.gain.setValueAtTime(0,a.currentTime);B.g.gain.setValueAtTime(B.lvl||0.5,a.currentTime+s);}catch(err){}}
function mg2BandTick(prev){const st=mg2BandState(),B=MG2SND.band;
  if(!st){if(B.cue){B.cue='';}return prev();}
  if(!playing||paused||!soundOn||!musicOn||!AC)return;
  const a=AC,now=a.currentTime;if(!st.cue){B.cue='';return;}
  if(!B.g){try{B.g=a.createGain();B.g.connect(typeof musDest==='function'?musDest(a):a.destination);}catch(err){return;}}
  B.lvl=0.45*st.g;try{B.g.gain.setTargetAtTime?B.g.gain.setTargetAtTime(B.lvl,now,0.3):(B.g.gain.value=B.lvl);}catch(err){}
  if(st.cue!==B.cue){B.cue=st.cue;B.t=Math.max(now+0.05,Math.min(B.t||0,now+0.6));B.bar=0;}
  if(B.t<now-0.25)B.t=now+0.03;
  let guard=0;while(B.t<now+0.9&&guard++<8){const o={bpm:Math.round((st.bpm||60)/4)*4,duck:!!st.duck,swell:!!st.swell},L=mg2BarLen(st.cue,o),v=st.cue==='table'?B.bar%8:(st.cue==='plate'?B.bar%2:(st.cue==='asleep'?B.bar%4:0));
    const key='mg_cue_'+st.cue+'_'+v+'_'+o.bpm+(o.duck?'d':'')+(o.swell?'s':'');
    if(B.sil<B.t){try{const src=a.createBufferSource();src.buffer=mg2Buf(a,key,sr=>mg2ScoreRender(st.cue,v,0x6d32,sr,o));src.connect(B.g);src.start(B.t);MG2SND.live++;}catch(err){}}
    B.t+=L;B.bar++;}}
MGREG.music=function(prev){return function(){return mg2BandTick(function(){return prev.apply(this,arguments);});};};

/* ---- Debug -> "Malgorath: sounds" (never cut): plays every SFX and every cue so Dan can audition what nobody here could hear ---- */
function mg2Sampler(stop){const S=MG2SND.samp;if(S.tm){clearTimeout(S.tm);S.tm=null;}
  if(stop||S.on){S.on=false;showToast('Malgorath sampler stopped.');return 0;}
  if(!soundOn){showToast('Turn Sound on first (Settings) - the sampler plays every Malgorath sound.');return 0;}
  S.list=Object.keys(MG2SFX).filter(n=>MG2SFX[n].v.length).map(n=>({k:'sfx',n})).concat(['asleep','table','plate','maw'].map(n=>({k:'cue',n})));S.i=0;S.on=true;
  const step=()=>{if(!S.on)return;if(S.i>=S.list.length){S.on=false;showToast('Malgorath sampler: done ('+S.list.length+').');return;}
    const c=S.list[S.i++];showToast((c.k==='sfx'?'SFX ':'MUSIC ')+S.i+'/'+S.list.length+': '+c.n+(c.k==='sfx'?' ('+MG2SFX[c.n].tw+')':''));
    const a=audio();if(a){try{if(c.k==='sfx')mg2Sfx(c.n);else{for(let b=0;b<2;b++){const L=mg2BarLen(c.n,{bpm:70}),src=a.createBufferSource();
        src.buffer=mg2Buf(a,'mg_samp_'+c.n+b,sr=>mg2ScoreRender(c.n,b*8,0x6d32,sr,{bpm:70}));src.connect(a.destination);src.start(a.currentTime+0.05+b*L);}}}catch(err){mgFail('sampler',err);}}
    S.tm=setTimeout(step,c.k==='sfx'?1800:(c.n==='maw'?2400:8600));};
  step();return S.list.length;}
MGREG.onBoot.push(function mg2DebugRows(){const box=typeof document!=='undefined'&&document.getElementById?document.getElementById('dbg_pg'):null;
  if(!box||typeof box.appendChild!=='function'||typeof document.createElement!=='function')return;
  const add=(id,label,f)=>{if(document.getElementById(id)&&document.getElementById(id).onclick)return;const b=document.createElement('button');b.id=id;b.className='mc-btn small';b.textContent=label;b.onclick=f;box.appendChild(b);};
  const near=()=>{if(DIM!=='over'||Math.hypot(P.x-MGC.X,P.z-MGC.Z)>MGC.R_SPAWN){showToast('Only at Malgorath\'s Bite (X 1000, Z 1000).');return false;}return true;};
  add('dbg_mgsfx','Malgorath: sounds',()=>{if(typeof mpDbgDone==='function')mpDbgDone();mg2Sampler();});
  for(const r of [1,2,3])add('dbg_mgr'+r,'Malgorath: R'+r,()=>{if(!near())return;if(typeof mpDbgDone==='function')mpDbgDone();if(DEMON.dead){showToast('He is dead in this world.');return;}mgSkipTo(r);});
  add('dbg_mgreset','Malgorath: reset',()=>{if(!near())return;if(typeof mpDbgDone==='function')mpDbgDone();mg2Dormant('skip');});});
MGEX.mg2SfxRender=mg2SfxRender;MGEX.mg2ScoreRender=mg2ScoreRender;MGEX.mg2BarLen=mg2BarLen;MGEX.getMG2SFX=()=>MG2SFX;MGEX.mg2Sampler=mg2Sampler;MGEX.mg2BandState=mg2BandState;MGEX.getMG2SND=()=>MG2SND;
