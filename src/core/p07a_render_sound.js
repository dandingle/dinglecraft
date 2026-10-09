/* ===================================================================== */
/* PART 7 — sky, sound, hand, save system, menus, boot, main loop        */
/* ===================================================================== */
let scene=null,camera=null,renderer=null,matOp=null,matCut=null,matWat=null;
let timeOfDay=0.3;
function sunUp(){return Math.sin(timeOfDay*Math.PI*2)>0.02;}

/* ----- procedural sound (WebAudio) ----- */
let AC=null,noiseBuf=null;
let SFXVOL=1,MUSVOL=0.7;   /* Release 1.0: the Sound and Music volume sliders (Settings) */
/* every sound goes through a bus: AC.destination is shadowed by the SFX bus, music connects to musDest(a) */
function acBus(a){
  try{const real=a.destination,sfx=a.createGain(),mus=a.createGain();sfx.connect(real);mus.connect(real);
    sfx.gain.value=SFXVOL;mus.gain.value=MUSVOL;a.__real=real;a.__sfx=sfx;a.__mus=mus;
    Object.defineProperty(a,'destination',{configurable:true,get(){return sfx;}});}catch(e){}
}
function musDest(a){return (a&&a.__mus)||(a&&a.destination);}
function acVol(){try{if(AC&&AC.__sfx){AC.__sfx.gain.value=SFXVOL;AC.__mus.gain.value=MUSVOL;}}catch(e){}}
function audio(){
  if(!soundOn)return null;
  try{
    if(!AC){
      AC=new (window.AudioContext||window.webkitAudioContext)();
      acBus(AC);
      noiseBuf=AC.createBuffer(1,AC.sampleRate*0.6|0,AC.sampleRate);
      const d=noiseBuf.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    }
    if(AC.state==='suspended')AC.resume();
    return AC;
  }catch(e){return null;}
}
function tone(f0,f1,dur,type,vol){
  const a=audio();if(!a)return;
  const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;
  o.type=type;o.frequency.setValueAtTime(f0,t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  g.gain.setValueAtTime(vol*SNDMUL,t);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g).connect(a.destination);
  o.start(t);o.stop(t+dur+0.02);
}
function noiseS(dur,vol,fq0,fq1,hp){
  const a=audio();if(!a)return;
  const s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter(),t=a.currentTime;
  s.buffer=noiseBuf;s.loop=true;
  f.type=hp?'highpass':'lowpass';
  f.frequency.setValueAtTime(fq0,t);
  f.frequency.exponentialRampToValueAtTime(Math.max(40,fq1||fq0),t+dur);
  g.gain.setValueAtTime(vol*SNDMUL,t);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  s.connect(f).connect(g).connect(a.destination);
  s.start(t);s.stop(t+dur+0.02);
}
function playS(n){
  if(!soundOn)return;
  try{
    switch(n){
      case 'dig':   noiseS(0.09,0.20,900,300);break;
      case 'place': noiseS(0.05,0.16,1200,500);tone(300,260,0.05,'square',0.06);break;
      case 'pop':   tone(520,940,0.08,'sine',0.22);break;
      case 'laser': tone(1600,220,0.18,'sawtooth',0.2);tone(3200,700,0.12,'square',0.07);break;
      case 'boing': tone(160,760,0.24,'sine',0.32);tone(90,340,0.18,'triangle',0.14);break;
      case 'squeak': tone(950,1500,0.11,'square',0.12);break;
      case 'honk':  tone(310,290,0.16,'square',0.32);tone(233,214,0.2,'square',0.3);tone(466,430,0.12,'square',0.18);break;
      case 'boomx': tone(72,22,1.0,'sine',0.6);noiseS(0.22,0.5,180,60);break;
      case 'scream':tone(1750,320,1.2,'sawtooth',0.5);tone(2600,540,0.9,'square',0.3);noiseS(0.7,0.45,2200,500,1);break;
      case 'whisper':noiseS(0.9,0.1,900,300,1);break;
      case 'knock': tone(150,95,0.08,'square',0.45);break;
      case 'hurt':  tone(230,110,0.2,'sawtooth',0.22);break;
      case 'hit':   noiseS(0.07,0.2,1400,500);tone(190,120,0.06,'square',0.1);break;
      case 'eat':   noiseS(0.05,0.13,700+Math.random()*400,300);break;
      case 'burp':  tone(150,70,0.28,'square',0.16);break;
      case 'bow':   tone(380,900,0.13,'sine',0.14);noiseS(0.08,0.1,2500,900,true);break;
      case 'fuse':  noiseS(0.5,0.12,3000,2500,true);break;
      case 'boom':  noiseS(0.8,0.55,420,70);tone(70,38,0.55,'sine',0.4);break;
      case 'break2':tone(520,90,0.22,'square',0.2);break;
      case 'thud':  noiseS(0.07,0.22,320,140);break;
    }
  }catch(e){}
}
let stepAcc=0;
function playSStep(){
  if(!soundOn)return;
  try{noiseS(0.05,0.09,500+Math.random()*350,250);}catch(e){}
}

