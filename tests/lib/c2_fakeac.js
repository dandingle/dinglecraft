/* c2_fakeac.js (C2): a recording fake AudioContext for the node suites. Nothing is ever heard: every node and every AudioParam call is
   logged so a suite can check what the game WOULD play (voices, buffers, offsets, gain automation, panning, stops).
   const FA=require('./c2_fakeac.js');const ac=FA.make();  ac.t (currentTime; ac.advance(dt) moves it and fires onended), ac.log [[op,...]], ac.nodes
   (every node has .context = its fake, non-enumerable, as a browser AudioNode does)
   FA.install() makes it the AudioContext the game's audio() will construct (call before the game's first audio() call) and returns
   the instance holder {ac} (filled at construction). */
'use strict';
function param(ac,node,name,v){const p={value:v,ev:[],
  setValueAtTime(x,t){p.ev.push(['set',x,t]);p.value=x;ac.log.push(['param',node.id,name,'set',x,t]);return p;},
  linearRampToValueAtTime(x,t){p.ev.push(['lin',x,t]);ac.log.push(['param',node.id,name,'lin',x,t]);return p;},
  exponentialRampToValueAtTime(x,t){p.ev.push(['exp',x,t]);ac.log.push(['param',node.id,name,'exp',x,t]);return p;},
  setTargetAtTime(x,t,c){p.ev.push(['tgt',x,t,c]);ac.log.push(['param',node.id,name,'tgt',x,t,c]);return p;},
  cancelScheduledValues(t){p.ev.push(['cancel',t]);ac.log.push(['param',node.id,name,'cancel',t]);return p;},
  cancelAndHoldAtTime(t){p.ev.push(['hold',t]);ac.log.push(['param',node.id,name,'hold',t]);return p;}};
  return p;}
function make(sr){const ac={t:0,sampleRate:sr||44100,state:'running',log:[],nodes:[],destination:{id:'dest'},
  get currentTime(){return ac.t;},resume(){ac.state='running';return Promise.resolve();},suspend(){ac.state='suspended';return Promise.resolve();},
  /* time passes: sources whose stop time has come end, and their onended fires (as in a browser) */
  advance(dt){ac.t+=dt;for(const n of ac.nodes)if(n.kind==='src'&&n.stopped!=null&&!n.ended&&n.stopped<=ac.t){n.ended=true;if(typeof n.onended==='function')n.onended();}}};
  let nid=0;const node=(kind,extra)=>{const n=Object.assign({id:kind+(++nid),kind,out:[],dead:false,
    connect(d){n.out.push(d);ac.log.push(['connect',n.id,d&&d.id]);return d;},disconnect(){n.out=[];n.disc=true;ac.log.push(['disconnect',n.id]);}},extra||{});
    Object.defineProperty(n,'context',{value:ac,enumerable:false});   /* node.context, as in a browser (the menu music's fade reads it) */
    ac.nodes.push(n);return n;};
  ac.createBuffer=(ch,len,rate)=>{const data=[];for(let i=0;i<ch;i++)data.push(new Float32Array(len));const b={numberOfChannels:ch,length:len,sampleRate:rate,duration:len/rate,
    getChannelData:i=>data[i],copyToChannel:(src,i)=>{data[i].set(src.subarray?src.subarray(0,len):src);}};ac.log.push(['buffer',len,rate]);return b;};
  ac.createBufferSource=()=>{const n=node('src',{buffer:null,loop:false,onended:null,started:null,stopped:null,playbackRate:null,
    start(w,o){n.started=[w||0,o||0];ac.log.push(['start',n.id,w||0,o||0]);},stop(w){n.stopped=w==null?ac.t:w;ac.log.push(['stop',n.id,n.stopped]);}});
    n.playbackRate=param(ac,n,'rate',1);ac.log.push(['create','src',n.id]);return n;};
  ac.createGain=()=>{const n=node('gain');n.gain=param(ac,n,'gain',1);ac.log.push(['create','gain',n.id]);return n;};
  ac.createStereoPanner=()=>{const n=node('pan');n.pan=param(ac,n,'pan',0);ac.log.push(['create','pan',n.id]);return n;};
  ac.createOscillator=()=>{const n=node('osc',{type:'sine',start(w){ac.log.push(['start',n.id,w||0,0]);},stop(w){ac.log.push(['stop',n.id,w]);}});
    n.frequency=param(ac,n,'freq',440);ac.log.push(['create','osc',n.id]);return n;};
  ac.createBiquadFilter=()=>{const n=node('bq',{type:'lowpass'});n.frequency=param(ac,n,'freq',350);n.Q=param(ac,n,'Q',1);ac.log.push(['create','bq',n.id]);return n;};
  return ac;}
/* the game's audio() does `new (window.AudioContext||window.webkitAudioContext)()` once: hand it our fake */
function install(sr){const h={ac:null,made:0};function F(){h.made++;h.ac=make(sr);return h.ac;}
  global.AudioContext=F;global.webkitAudioContext=F;if(global.window&&global.window!==global){global.window.AudioContext=F;global.window.webkitAudioContext=F;}return h;}
/* the voices (looping or not) still alive in a fake: sources started and not stopped */
function live(ac,loopOnly){return ac.nodes.filter(n=>n.kind==='src'&&n.started&&n.stopped==null&&(!loopOnly||n.loop));}
/* the gain node a source feeds, and the panner after it */
function chain(src){const g=src.out[0]||null,p=g&&g.out[0]&&g.out[0].kind==='pan'?g.out[0]:null;return {g,p};}
/* the last target scheduled on a param at or before time t that is not the dead-man fade */
function lastTarget(prm){for(let i=prm.ev.length-1;i>=0;i--){const e=prm.ev[i];if(e[0]==='tgt'&&!(e[1]===0&&e[3]===0.08))return e;}return null;}
module.exports={make,install,live,chain,lastTarget};
