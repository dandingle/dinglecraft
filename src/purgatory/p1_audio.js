/* ---- PART 55: p1_audio.js ---- */
/* ===================================================================== */
/* PART 55 . p1 audio (P1): every purgatory SFX and the house band (plan 2.5, bible 18). All original: no borrowed themes, no songs. */
/* ===================================================================== */
/* The builder cannot hear any of this (QA browsers are muted by Dan's rule). Every sound has a visual tell elsewhere; Dan reviews them
   with Debug -> Purgatory: SFX sampler. SFX are new 'pg_*' cases in the playS wrapper chain (synthesised from oscillators and the core
   noise buffer, scaled by SNDMUL so playSAt's 30 m falloff applies); music is a musicTick branch for DIM==='puppet', scheduled ahead
   with AC.currentTime offsets (musicTick is a coarse 300 ms interval). Music randomness is a private seeded PRNG: never Math.random.
   Nodes are connected one call at a time (the headless AudioContext stub's connect() returns nothing). */
const MW_SFX=['pg_squeak','pg_honk','pg_boing','pg_slide','pg_rimshot','pg_laugh','pg_applause','pg_gasp','pg_boo','pg_clicks','pg_bells',
  'pg_spark','pg_fizz','pg_plunger','pg_trapdoor','pg_thump','pg_hiss','pg_cleaver','pg_ladle','pg_chatter','pg_alarm','pg_thwip','pg_gulp',
  'pg_strum','pg_sandbag','pg_swish','pg_lid','pg_boot','pg_thunk','pg_whump','pg_creak','pg_rip','pg_smooch','pg_whoosh','pg_splat',
  'pg_tipover','pg_flinch','pg_foamtear','pg_bristle','pg_bootthud','pg_bite','pg_drum'];
const MW_MUSIC=['show','blackout','intermission','bomber','bigpig','bigfrog','strike'];
/* mwS(name,x,y,z): a purgatory sound on the frame of its visual event; positional (30 m falloff) when a position is given */
function mwS(name,x,y,z){if(typeof x==='number'&&typeof z==='number'&&typeof playSAt==='function')playSAt(name,x,y==null?P&&P.y:y,z);else playS(name);}
const mwPlayS0=playS;
playS=function(n){if(typeof n==='string'&&n.charCodeAt(0)===112&&n.charCodeAt(1)===103&&n.charCodeAt(2)===95){
    if(!soundOn)return;try{mwSfx(n);}catch(e){}return;}
  return mwPlayS0(n);};
var MWA_N={osc:0,src:0};                              /* node counters (tests: mwS is silent when soundOn is false) */
function mwT(a,t,f0,f1,dur,type,vol,att){const o=a.createOscillator(),g=a.createGain();MWA_N.osc++;
  o.type=type||'sine';o.frequency.setValueAtTime(Math.max(20,f0),t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  const v=Math.max(0.0002,vol);
  if(att){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+att);}else g.gain.setValueAtTime(v,t);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+0.03);return o;}
function mwN(a,t,dur,vol,f0,f1,ft,att,q){if(!noiseBuf)return null;const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();MWA_N.src++;
  s.buffer=noiseBuf;s.loop=true;f.type=ft||'lowpass';f.frequency.setValueAtTime(Math.max(40,f0),t);
  if(f1&&f1!==f0)f.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+dur);if(q&&f.Q)f.Q.value=q;
  const v=Math.max(0.0002,vol);
  if(att){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+att);}else g.gain.setValueAtTime(v,t);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f);f.connect(g);g.connect(a.destination);s.start(t);s.stop(t+dur+0.03);return s;}
/* the SFX bank (bible 18). m = SNDMUL at call time (playSAt's distance falloff), every voice scheduled from t */
function mwSfx(n){const a=audio();if(!a)return;const t=a.currentTime+0.005,m=SNDMUL;
  const T=(dt,f0,f1,dur,type,vol,att)=>mwT(a,t+dt,f0,f1,dur,type,vol*m,att),Nz=(dt,dur,vol,f0,f1,ft,att,q)=>mwN(a,t+dt,dur,vol*m,f0,f1,ft,att,q);
  const R=mulberry32((Math.floor(t*997)^n.length*7919)>>>0);
  switch(n){
    case 'pg_squeak':T(0,900,1650,0.07,'square',0.11);T(0.07,1650,1050,0.08,'square',0.09);break;          /* felt/rubber squeak */
    case 'pg_honk':T(0,392,380,0.2,'square',0.2);T(0,311,300,0.2,'square',0.16);T(0.02,784,760,0.12,'sawtooth',0.05);break;   /* bicycle-horn honk */
    case 'pg_boing':T(0,140,620,0.32,'sine',0.3);T(0,95,310,0.26,'triangle',0.14);T(0.18,520,180,0.2,'sine',0.08);break;     /* Dough boing */
    case 'pg_slide':T(0,1900,320,0.95,'sine',0.2);T(0,1910,330,0.95,'sine',0.05);break;                       /* slide whistle down */
    case 'pg_rimshot':T(0,190,120,0.13,'sine',0.35);Nz(0,0.08,0.18,1800,900,'bandpass');T(0.2,150,95,0.14,'sine',0.35);Nz(0.2,0.08,0.18,1500,800,'bandpass');
      Nz(0.42,0.55,0.22,7000,5000,'highpass');break;                                                          /* ba-dum-tss */
    case 'pg_laugh':for(let i=0;i<8;i++){const d=i*0.15+R()*0.04,v=0.22*(1-i/10);Nz(d,0.12,v,900+R()*500,600,'bandpass',0.02,2);
        T(d,210+R()*60,170+R()*40,0.11,'sawtooth',v*0.25,0.01);}break;                                        /* the laugh track */
    case 'pg_applause':Nz(0,2.6,0.12,2500,1800,'highpass',0.25);for(let i=0;i<46;i++)Nz(R()*2.4,0.03,0.14+R()*0.1,2200+R()*3500,null,'highpass');break;
    case 'pg_gasp':Nz(0,0.65,0.28,500,2800,'bandpass',0.4,1.5);T(0,240,320,0.5,'sawtooth',0.03,0.3);break;     /* audience gasp (inhale) */
    case 'pg_boo':for(const f of [138,150,163,174])T(R()*0.08,f,f*0.72,1.3,'sawtooth',0.06,0.15);Nz(0,1.3,0.1,500,250,'lowpass',0.2);break;
    case 'pg_clicks':for(let i=0;i<3;i++){T(i*0.36,1900,1300,0.035,'square',0.3);Nz(i*0.36,0.03,0.25,4000,null,'highpass');}break;   /* three lighting-board clicks */
    case 'pg_bells':for(let i=0;i<3;i++){const d=i*0.62;T(d,880,876,1.6,'sine',0.2);T(d,2112,2105,1.1,'sine',0.08);T(d,3430,3420,0.7,'sine',0.04);}break;
    case 'pg_spark':for(let i=0;i<9;i++)Nz(i*0.045+R()*0.02,0.025,0.16,3500+R()*3000,null,'highpass');break;  /* travelling spark crackle */
    case 'pg_fizz':Nz(0,0.55,0.12,5200,3600,'highpass');for(let i=0;i<5;i++)Nz(R()*0.5,0.02,0.1,7000,null,'highpass');break;
    case 'pg_plunger':Nz(0,0.16,0.4,420,90,'lowpass');T(0,95,45,0.22,'sine',0.4);T(0.12,330,240,0.12,'sine',0.12);T(0.24,300,215,0.12,'sine',0.09);T(0.36,280,200,0.12,'sine',0.06);break;
    case 'pg_trapdoor':T(0,210,80,0.09,'square',0.3);Nz(0,0.12,0.3,900,200,'lowpass');T(0.1,70,32,0.5,'sine',0.4);break;
    case 'pg_thump':T(0,62,34,0.55,'sine',0.45);Nz(0,0.35,0.22,220,80,'lowpass');break;                      /* muffled underground thump */
    case 'pg_hiss':Nz(0,1.25,0.16,2600,1500,'highpass',0.05);break;
    case 'pg_cleaver':Nz(0,0.24,0.22,400,2600,'bandpass',0.02,3);T(0.2,2300,2250,0.25,'sine',0.08);break;
    case 'pg_ladle':for(const f of [620,1430,2210,3050])T(0,f,f*0.99,0.65,'sine',0.11);Nz(0,0.05,0.2,3000,null,'highpass');break;
    case 'pg_chatter':{let d=0;for(let i=0;i<6;i++){const f=170+R()*170,du=0.06+R()*0.05;T(d,f,f*(0.8+R()*0.4),du,i%2?'square':'sawtooth',0.1);
        Nz(d,du,0.05,700+R()*900,null,'bandpass',0,4);d+=du+0.03;}T(d+0.05,160,105,0.24,'square',0.14);break;}   /* the Cook's chatter */
    case 'pg_alarm':T(0,1520,1560,0.08,'sine',0.16);T(0.11,1720,1780,0.09,'sine',0.16);break;                   /* the Lab Rat */
    case 'pg_thwip':T(0,280,2300,0.12,'sine',0.22);Nz(0,0.1,0.12,1200,5000,'bandpass');break;                  /* tongue THWIP */
    case 'pg_gulp':T(0,190,68,0.26,'sine',0.35);T(0.2,420,260,0.08,'sine',0.08);break;
    case 'pg_strum':{const fs=[196,246.9,293.7,392];for(let i=0;i<4;i++)T(i*0.022,fs[i],fs[i]*0.995,0.55,'triangle',0.13);break;}   /* a plucked chord */
    case 'pg_sandbag':Nz(0,0.28,0.4,320,90,'lowpass');T(0,72,40,0.3,'sine',0.35);break;
    case 'pg_swish':Nz(0,0.85,0.18,600,3200,'bandpass',0.25,1.5);Nz(0.4,0.45,0.1,3000,800,'bandpass');break;    /* curtain swish */
    case 'pg_lid':for(const f of [520,1180,1910])T(0,f,f*0.97,0.5,'square',0.06);Nz(0,0.12,0.3,2500,800,'bandpass');T(0,140,90,0.12,'sine',0.25);break;   /* Bin lid */
    case 'pg_boot':T(0,180,60,0.11,'square',0.26);Nz(0,0.08,0.3,1100,300,'lowpass');break;
    case 'pg_thunk':T(0,145,88,0.09,'square',0.22);Nz(0,0.06,0.2,700,250,'lowpass');break;                    /* Lost Property */
    case 'pg_whump':Nz(0,0.45,0.42,420,110,'lowpass');T(0,82,44,0.42,'sine',0.38);break;                       /* a flat topples */
    case 'pg_creak':for(let i=0;i<10;i++)T(i*0.05+R()*0.01,72+i*3,68+i*3,0.04,'square',0.09);T(0,95,118,0.5,'sawtooth',0.03,0.1);break;   /* felt sheet sags */
    case 'pg_rip':Nz(0,0.36,0.3,800,3200,'bandpass',0.02,2);for(let i=0;i<6;i++)Nz(i*0.05,0.02,0.15,2500+i*300,null,'highpass');break;   /* sheet tears */
    case 'pg_smooch':T(0,900,1700,0.08,'sine',0.18);Nz(0.07,0.03,0.2,2000,null,'bandpass');break;
    case 'pg_whoosh':Nz(0,0.32,0.22,700,2700,'highpass',0.08);break;
    case 'pg_splat':Nz(0,0.2,0.4,1300,190,'lowpass');T(0,210,85,0.18,'sine',0.25);break;                       /* tomato splat */
    case 'pg_tipover':for(let i=0;i<8;i++)T(i*0.06,310-i*16,300-i*16,0.05,'square',0.07);Nz(0.52,0.18,0.35,500,150,'lowpass');T(0.52,90,50,0.2,'sine',0.25);break;
    case 'pg_flinch':T(0,46,37,1.3,'sawtooth',0.22,0.08);T(0,69,56,1.1,'sawtooth',0.1,0.1);Nz(0,1.2,0.22,180,60,'lowpass',0.1);
      for(let i=0;i<6;i++)T(0.1+i*0.16,58,52,0.12,'square',0.06);break;                                       /* a deep creak of muscle through the floor */
    case 'pg_foamtear':for(let i=0;i<7;i++)Nz(i*0.06+R()*0.03,0.07,0.2,1600-i*120,500,'bandpass',0,1.5);break;
    case 'pg_bristle':Nz(0,1.05,0.16,1900,1300,'highpass',0.3);Nz(0.2,0.7,0.08,4000,2500,'bandpass');break;
    case 'pg_bootthud':T(0,56,30,0.65,'sine',0.55);Nz(0,0.3,0.4,260,70,'lowpass');break;
    case 'pg_bite':T(0,420,120,0.06,'square',0.3);Nz(0,0.04,0.3,3500,null,'highpass');break;                   /* frog bite snap */
    case 'pg_drum':T(0,90,45,0.18,'sine',0.35);Nz(0.11,0.09,0.2,1800,900,'bandpass');Nz(0.11,0.05,0.12,6000,null,'highpass');break;
  }}

/* ---- the house band (musicTick branch). State from mwMusicState(): strike > headliner > intermission > blackout > show ---- */
var MWM={st:null,t:0,step:0,rng:null,prev:null,cut:0,ev:[],t0:0,lastPh:0,detune:0};
function mwMusicState(){if(MP.strike||(typeof MWR!=='undefined'&&MWR.work))return 'strike';
  const hs=typeof hnState==='function'?hnState():null;
  if(hs&&hs.live&&hs.name)return hs.name;if(hs&&hs.inter)return 'intermission';
  const c=typeof mwCue==='function'?mwCue():null;if(c&&c.ph==='blackout')return 'blackout';
  return 'show';}
function mwMusicPreview(state,dur){if(!soundOn||MW_MUSIC.indexOf(state)<0)return false;const a=audio();if(!a)return false;
  MWM.prev={state,until:a.currentTime+(dur||5.5)};MWM.st=null;mwMusicTick();return true;}
function mwMusicCue(ev){if(!AC)return;MWM.ev.push(ev);}                    /* P4 seam: 'crash' (plate blast), 'cut' (trapdoor), 'snap' (the Flail), 'countin' */
const mwMusic0=musicTick;
musicTick=function(){if(DIM==='puppet'||MWM.prev){mwMusicTick();return;}mwMusic0();};
const MW_SPB={show:0.2273,blackout:0.5,intermission:0.2143,bomber:0.2,bigpig:0.4286,bigfrog:0.4167,strike:0.1705};   /* seconds per 8th step */
function mwMusicTick(){
  if(!playing||paused||!soundOn)return;const a=AC;if(!a)return;
  if(MWM.prev&&a.currentTime>MWM.prev.until){MWM.prev=null;MWM.st=null;if(DIM!=='puppet')return;}
  if(!musicOn&&!MWM.prev)return;
  const st=MWM.prev?MWM.prev.state:mwMusicState(),now=a.currentTime;
  if(st!==MWM.st){MWM.st=st;MWM.t=now+0.06;MWM.step=0;MWM.t0=now;MWM.rng=mulberry32((SEED^0x3a3e^st.length*131)>>>0);MWM.ev.length=0;MWM.detune=0;}
  if(MWM.t<now-0.25)MWM.t=now+0.03;
  const hs=typeof hnState==='function'?hnState():null,ph=hs&&hs.live?(hs.phase||1):1;
  while(MWM.ev.length){const e=MWM.ev.shift();mwMusicEvent(a,e,now+0.02);}
  let spb=MW_SPB[st]||0.25;
  if(st==='strike'){const T=MP.strike&&MP.strike.t0!=null?MP.clock-MP.strike.t0:now-MWM.t0;spb=60/(176+Math.min(30,Math.max(0,T)*0.15))/2;}
  if(st==='bomber'&&ph>=3)spb=0.17;
  if(st==='bigpig'&&ph>=3)spb=0.234;
  while(MWM.t<now+0.5){if(now>=MWM.cut)mwBandStep(a,st,MWM.step,MWM.t,ph,spb);MWM.t+=spb;MWM.step++;}}
function mwMusicEvent(a,e,t){const m=0.9;
  if(e==='crash')mwN(a,t,1.1,0.12*m,6500,4000,'highpass');
  else if(e==='cut'){MWM.cut=t+3;}
  else if(e==='snap'){mwT(a,t,1200,140,0.35,'triangle',0.08);MWM.cut=t+1.1;}
  else if(e==='countin'){for(let i=0;i<4;i++)mwT(a,t+i*0.47,1500,1400,0.04,'square',0.06);}}
/* one 8th-note step of the band. F major vaudeville vamp: I I IV I V IV I V. Voices are quiet (music sits under the SFX). */
const MW_F=[87.31,98,110,116.54,130.81,146.83,164.81];       /* F2 major scale degrees 0..6 */
function mwDeg(d,oct){const o=Math.floor(d/7),k=((d%7)+7)%7;return MW_F[k]*Math.pow(2,o+(oct||0));}
function mwBandStep(a,st,s,t,ph,spb){const r=MWM.rng,sl=st==='show'?(r()-0.5)*0.03:0,T=t+Math.max(0,sl);
  const tt=(dt,f0,f1,dur,type,vol,att)=>mwT(a,T+dt,f0,f1,dur,type,vol,att),nz=(dt,dur,vol,f0,f1,ft,att)=>mwN(a,T+dt,dur,vol,f0,f1,ft,att);
  if(st==='show'||st==='intermission'){
    if(st==='intermission'&&s>=64)return;                    /* the vamp, properly, once */
    const bar=(s>>3)&7,b=s&7,CH_=[0,0,3,0,4,3,0,4][bar],br=st==='intermission'?1:0;
    if(b===0)tt(0,mwDeg(CH_),mwDeg(CH_)*0.99,spb*1.6,'square',0.045);
    if(b===4)tt(0,mwDeg(CH_+4),mwDeg(CH_+4)*0.99,spb*1.6,'square',0.04);
    if(b===2||b===6)for(const d of [0,2,4]){const f=mwDeg(CH_+d,2);tt(0,f*1.004,f*1.004,0.12,'sawtooth',0.012);tt(0,f*0.996,f*0.996,0.12,'sawtooth',0.012);}
    if(b%2===1)nz(0,0.04,0.012,7000,null,'highpass');
    const PENT=[0,1,2,4,5];
    if(r()<(br?0.8:0.6)){MWM.lead=((MWM.lead||7)+(r()<0.5?-1:1)*(r()<0.8?1:2));if(MWM.lead<0)MWM.lead=2;if(MWM.lead>14)MWM.lead=12;
      const k=MWM.lead,deg=PENT[k%5]+7*Math.floor(k/5);let f=mwDeg(deg,2+br);if(!br&&r()<1/32)f*=1.0595;   /* one wrong note in 32 */
      tt(0,f,f,spb*0.9,'triangle',0.032,0.01);}
    return;}
  if(st==='blackout'){                                       /* the band stops; a bowed drone, the board ticking, a 60 bpm heartbeat */
    if(s%8===0)tt(0,55,54,4.4,'sawtooth',0.028,1.4);
    if(s%8===0)tt(0,82.4,81.5,4.4,'sawtooth',0.016,1.6);
    if(s%2===0){tt(0,1800,1700,0.02,'square',0.012);tt(0,62,40,0.14,'sine',0.07);tt(0.18,58,38,0.12,'sine',0.045);}
    return;}
  if(st==='bomber'){                                          /* snare roll + tuba oom-pah, 150 bpm; the roll speeds up in P3 */
    const b=s&7,bar=(s>>3)&3,root=[0,0,4,3][bar];
    if(b===0)tt(0,mwDeg(root-7),mwDeg(root-7),spb*1.5,'square',0.05);
    if(b===4)tt(0,mwDeg(root-3),mwDeg(root-3),spb*1.5,'square',0.045);
    const k=(b%8)/8,v=0.02+0.03*k;nz(0,0.05,v,3200,1800,'bandpass');nz(spb*0.5,0.05,v,3200,1800,'bandpass');
    if(ph>=3)nz(spb*0.25,0.04,v,3400,2000,'bandpass');
    if(s%32===0)nz(0,1.0,0.07,6500,4200,'highpass');
    return;}
  if(st==='bigpig'){
    if(ph<3){if(s%8===0){const C=[[5,9,12,16],[3,7,10,14],[0,4,7,11],[2,5,9,12]][(s>>3)&3];
        for(const d of C){const f=110*Math.pow(2,d/12);tt(0,f*1.003,f*1.003,spb*8.4,'sawtooth',0.01,1.2);tt(0,f*0.997,f*0.997,spb*8.4,'sawtooth',0.01,1.4);}}
      return;}
    const b=s&1,beat=s>>1;                                    /* P3: four-on-the-floor glam, 128 bpm */
    if(b===0)tt(0,110,45,0.18,'sine',0.08);
    if(b===0&&beat%2===1)nz(0,0.12,0.06,2000,900,'bandpass');
    tt(0,beat%4<2?55:65.4,beat%4<2?55:65.4,0.2,'sawtooth',0.03);
    return;}
  if(st==='bigfrog'){                                         /* a lonely plucked tune, 72 bpm; P2 click track; P3 detunes downward */
    if(ph>=3)MWM.detune=Math.min(1,MWM.detune+0.004);
    const pat=[196,246.9,293.7,246.9,392,293.7,246.9,293.7],f=pat[s&7]*Math.pow(2,-MWM.detune/12);
    if(r()<0.85)tt(0,f,f*0.996,0.32,'triangle',0.05);
    if(ph===2&&s%2===0)tt(0,2200,2100,0.02,'square',0.02);
    return;}
  if(st==='strike'){                                         /* a frantic galop, 176 bpm and rising; the boots on the downbeats */
    const b=s&7,bar=(s>>3)&3,root=[0,4,0,3][bar];
    tt(0,mwDeg(root+(b%2?4:0)-7),mwDeg(root+(b%2?4:0)-7),spb*0.8,'square',0.04);
    if(b===0||b===4)tt(0,52,30,0.4,'sine',0.08);
    if(bar%2===1){const f=mwDeg(root+b,3);tt(0,f,f,spb*0.7,'sine',0.03);tt(spb*0.5,f*1.12,f*1.12,spb*0.5,'sine',0.025);}
    nz(spb*0.5,0.03,0.015,6000,null,'highpass');
    return;}}
