/* ---- PART 56: c2_juke.js ---- */
/* PART 56 c2 (C2, music): playback (Creativity Update plan, section 8.5).
   Sound only ever goes through the game's audio() (null while Settings -> Sound is off: then nothing is created at all) into
   AudioBufferSourceNodes of crSongRender's samples. Jukeboxes are declarative: every tick the playing jukeboxes in the current
   dimension within CRC.JUKE_R (32 m), nearest 4, get a looping voice started at (CRF.clock - be.s) mod length, gain (1-d/32)^1.4 * 0.7
   (the playSAt curve), pan = sin(bearing) * 0.8, and a dead-man fade: if ticks stop (pause, hidden tab, a frozen frame) the music
   fades out on its own 0.3 s later. Everything else is stopped and disconnected. crDuckNow() is true while a jukebox is audible or
   the editor preview plays; the musicTick wrapper below then skips the game's own background notes (they resume by themselves).
   Jukeboxes and the editor obey Sound (the master switch), not Music (the background-music toggle). */
var CRM={buf:new Map(),voices:new Map(),fx:new Map(),ntex:null,duck:false,acTest:null,made:0,stopped:0,prev:null,aud:null,last:null};
/* the context to play through: null when sound is off; tests may supply a recording fake (it still obeys soundOn) */
function crMusAC(){if(!soundOn)return null;if(CRM.acTest)return CRM.acTest;try{return audio();}catch(e){return null;}}
function crMusSR(ac){const s=ac&&ac.sampleRate;return s>=8000&&s<=192000?s:44100;}
/* samples -> AudioBuffer (the node stub's buffers are tiny: then the data simply is not copied) */
function crMusMakeBuf(ac,data,sr){const b=ac.createBuffer(1,Math.max(1,data.length),sr);
  try{if(typeof b.copyToChannel==='function')b.copyToChannel(data,0);else{const ch=b.getChannelData(0);if(ch&&ch.length===data.length)ch.set(data);}}catch(e){}
  return b;}
/* a finished work's buffer, cached per (work, edit count, sample rate); 6 kept */
function crMusBufKey(ac,n,rec){return n+':'+(rec.u|0)+':'+crMusSR(ac);}
function crMusWorkBuf(ac,n,rec){const sr=crMusSR(ac),key=crMusBufKey(ac,n,rec);let e=CRM.buf.get(key);
  if(e){CRM.buf.delete(key);CRM.buf.set(key,e);return e;}
  const data=crSongRender(rec.d,sr);e={b:crMusMakeBuf(ac,data,sr),len:data.length/sr,key};CRM.buf.set(key,e);
  while(CRM.buf.size>6)CRM.buf.delete(CRM.buf.keys().next().value);return e;}
/* AudioParam helpers that work with the real API and the node stub alike */
function crMusSet(prm,v,now,tc){if(!prm)return;try{
  if(typeof prm.cancelAndHoldAtTime==='function')prm.cancelAndHoldAtTime(now);else if(typeof prm.cancelScheduledValues==='function')prm.cancelScheduledValues(now);
  if(typeof prm.setTargetAtTime==='function')prm.setTargetAtTime(v,now,tc);else prm.value=v;}catch(e){}}
function crMusDeadman(prm,now){if(prm&&typeof prm.setTargetAtTime==='function')try{prm.setTargetAtTime(0,now+0.3,0.08);}catch(e){}}
/* a looping (or one-shot) voice: source -> gain (starts silent) -> panner (if any) -> destination */
function crMusVoice(ac,buf,offset,loop,pan){const src=ac.createBufferSource();src.buffer=buf;src.loop=!!loop;
  const g=ac.createGain();try{g.gain.value=0;}catch(e){}let p=null;
  if(typeof ac.createStereoPanner==='function'){p=ac.createStereoPanner();try{p.pan.value=pan||0;}catch(e){}}
  const out=typeof musDest==='function'?musDest(ac):ac.destination;   /* discs are music: the Music volume slider */
  src.connect(g);if(p){g.connect(p);p.connect(out);}else g.connect(out);
  const now=ac.currentTime||0;try{src.start(now,Math.max(0,offset||0));}catch(e){try{src.start();}catch(e2){}}
  CRM.made++;return {ac,src,g,p,t0:now-(offset||0),gain:0,pan:pan||0};}
function crMusKill(v){if(!v||v.dead)return;v.dead=true;CRM.stopped++;const ac=v.ac;let now=0;try{now=ac.currentTime||0;}catch(e){}
  try{const gp=v.g.gain;if(typeof gp.cancelScheduledValues==='function')gp.cancelScheduledValues(now);if(typeof gp.setTargetAtTime==='function')gp.setTargetAtTime(0,now,0.02);else gp.value=0;}catch(e){}
  const off=()=>{for(const x of [v.src,v.g,v.p])if(x&&typeof x.disconnect==='function')try{x.disconnect();}catch(e){}};
  try{v.src.onended=off;v.src.stop(now+0.12);}catch(e){off();}}
/* ---- jukeboxes ---- */
function crJukeStop(k){const v=CRM.voices.get(k);if(v){CRM.voices.delete(k);crMusKill(v);}}
function crJukeStopAll(){for(const k of [...CRM.voices.keys()])crJukeStop(k);}
/* the audible set: playing jukeboxes (finished discs) in this dimension, chunk loaded, within JUKE_R; nearest first */
function crJukeNear(){const out=[];if(!P)return out;const ex=P.x,ey=P.y+(P.eyeY||1.62),ez=P.z;
  for(const [k,be] of CRBE){if(be.t!=='crjuke'||!be.id||keyDim(k)!==DIM)continue;const n=crWorkN(be.id),rec=n?CRW[n]:null;
    if(!rec||rec.k!=='song'||rec.st!=='done')continue;
    const p=keyCore(k).split(','),x=+p[0]+0.5,y=+p[1]+0.5,z=+p[2]+0.5;if(!chunkAt(Math.floor(x),Math.floor(z)))continue;
    const d=Math.hypot(x-ex,y-ey,z-ez);if(d<CRC.JUKE_R)out.push({k,be,n,rec,d,x,y,z});}
  out.sort((a,b)=>a.d-b.d||(a.k<b.k?-1:1));return out.slice(0,4);}
function crJukeGain(d){return d>=CRC.JUKE_R?0:Math.pow(1-d/CRC.JUKE_R,1.4)*0.7;}
function crJukePan(x,z){if(!P)return 0;const dx=x-P.x,dz=z-P.z,h=Math.hypot(dx,dz);if(h<1e-6)return 0;
  const rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);return Math.max(-0.8,Math.min(0.8,(dx*rx+dz*rz)/h*0.8));}   /* right = (cos yaw, -sin yaw) */
/* a playing jukebox shows a little note floating up out of it (Sound on or off): one reused sprite per jukebox within 24 m,
   tinted by the disc's title, nearest-filtered pixel art; created only while a jukebox plays, disposed when it stops */
function crJukeNoteTex(){if(CRM.ntex)return CRM.ntex;const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d');
  const D=(x,y,w,h)=>g.fillRect(x,y,w,h);g.fillStyle='#1b1b1f';D(9,1,5,4);D(8,1,3,12);D(3,9,7,6);D(13,4,2,3);
  g.fillStyle='#ffffff';D(9,2,1,10);D(10,2,3,2);D(13,4,1,2);D(4,10,5,4);D(10,4,1,1);
  const t=new THREE.CanvasTexture(c);try{t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;}catch(e){}CRM.ntex=t;return t;}
function crJukeFxDel(k){const f=CRM.fx.get(k);if(!f)return;CRM.fx.delete(k);try{if(scene)scene.remove(f.sp);if(f.m.dispose)f.m.dispose();}catch(e){}}
function crJukeFxClear(){for(const k of [...CRM.fx.keys()])crJukeFxDel(k);}
function crJukeFx(dt){if(typeof THREE==='undefined'||!scene||typeof THREE.Sprite!=='function'||!P)return;const seen=new Set();
  for(const [k,be] of CRBE){if(be.t!=='crjuke'||!be.id||keyDim(k)!==DIM)continue;const n=crWorkN(be.id),rec=n?CRW[n]:null;if(!rec||rec.st!=='done')continue;
    const p=keyCore(k).split(','),x=+p[0]+0.5,y=+p[1],z=+p[2]+0.5;if(Math.hypot(x-P.x,z-P.z)>24||!chunkAt(Math.floor(x),Math.floor(z)))continue;
    seen.add(k);let f=CRM.fx.get(k);
    if(!f||f.id!==be.id){if(f)crJukeFxDel(k);const m=new THREE.SpriteMaterial({map:crJukeNoteTex(),transparent:true,depthWrite:false,fog:false});
      try{if(m.color&&m.color.setHSL)m.color.setHSL((crHash(rec.t||'?')%360)/360,0.75,0.66);}catch(e){}
      const sp=new THREE.Sprite(m);if(sp.scale&&sp.scale.set)sp.scale.set(0.5,0.5,0.5);scene.add(sp);f={sp,m,id:be.id,t:(crHash(k)%100)/100*1.4};CRM.fx.set(k,f);}
    f.t=(f.t+dt)%1.4;const a=f.t/1.4;if(f.sp.position&&f.sp.position.set)f.sp.position.set(x+Math.sin(a*6.283)*0.14,y+1.15+a*0.9,z);
    f.m.opacity=a<0.15?a/0.15:Math.max(0,1-(a-0.15)/0.85);}
  for(const k of [...CRM.fx.keys()])if(!seen.has(k))crJukeFxDel(k);}
function crJukeTick(dt){crJukeFx(dt);const ac=crMusAC();
  if(!ac){if(CRM.voices.size)crJukeStopAll();CRM.duck=!!(CRM.prev&&CRM.prev.on&&CRM.prev.v);return;}
  const near=crJukeNear(),want=new Map(near.map(c=>[c.k,c]));
  for(const [k,v] of CRM.voices){const c=want.get(k);if(!c||c.be.id!==v.id)crJukeStop(k);}
  let loud=0,rendered=0;const now=ac.currentTime||0;
  for(const c of near){let v=CRM.voices.get(c.k);
    /* a render is synchronous (15-150 ms for a dense 32 s song): at most ONE uncached song per tick, nearest first (the rest start on
       the next ticks), and a voice that would start below 1% gain, at the very edge of the range, waits until it is louder (v6.2 review) */
    if(!v&&crJukeGain(c.d)<0.01)continue;
    if(!v&&!CRM.buf.has(crMusBufKey(ac,c.n,c.rec))&&rendered++>0)continue;
    if(!v){let e=null;try{e=crMusWorkBuf(ac,c.n,c.rec);}catch(err){crFail('juke render',err);continue;}
      const off=e.len>0?(((CRF.clock-(c.be.s||0))%e.len)+e.len)%e.len:0;
      try{v=crMusVoice(ac,e.b,off,true,crJukePan(c.x,c.z));}catch(err){crFail('juke voice',err);continue;}v.id=c.be.id;v.len=e.len;CRM.voices.set(c.k,v);}
    v.gain=crJukeGain(c.d);v.pan=crJukePan(c.x,c.z);v.d=c.d;
    crMusSet(v.g.gain,v.gain,now,0.05);crMusDeadman(v.g.gain,now);if(v.p)crMusSet(v.p.pan,v.pan,now,0.05);
    if(v.gain>loud)loud=v.gain;}
  CRM.duck=loud>0.05||!!(CRM.prev&&CRM.prev.on&&CRM.prev.v);}
function crJukeReset(){crJukeStopAll();crJukeFxClear();CRM.buf.clear();CRM.duck=false;if(CRM.ntex){try{CRM.ntex.dispose();}catch(e){}CRM.ntex=null;}}
function crDuckNow(){return CRM.duck;}
CRREG.tick.push(crJukeTick);CRREG.onReset.push(crJukeReset);
CRREG.onDim.push(()=>{crJukeStopAll();crJukeFxClear();CRM.duck=!!(CRM.prev&&CRM.prev.on&&CRM.prev.v);});
CRREG.onJuke.push((k,be,op)=>{if(op==='stop')crJukeStop(k);});
CRREG.onBE.push((k,be,op)=>{if(op==='del'&&CRM.voices.has(k))crJukeStop(k);});
/* ducking: the core's generative background music skips its notes while a jukebox is audible (it has no master gain to lower).
   boot() binds setInterval(musicTick,300) after every PART has loaded, and PART 55 (loading after us) wraps this wrapper in turn. */
var crMus0=musicTick;
musicTick=function(){if(crDuckNow())return;crMus0();};
/* ---- the item icon: a cassette for a Demo Tape, a record with a label colour from its title for a Music Disc ---- */
function crSongThumb(r,g,s){g.clearRect(0,0,s,s);const u=s/48,R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x*u,y*u,w*u,h*u);};
  if(r.st!=='done'){R(4,11,40,27,'#2b2b31');R(5,12,38,25,'#45454f');R(8,14,32,9,'#efe4c4');R(10,16,18,2,'#b9533f');R(10,19,24,1,'#8a8070');
    R(13,25,22,8,'#1b1b1f');for(const cx of [17,31]){g.fillStyle='#d8d8d8';g.beginPath();g.arc(cx*u,29*u,3.2*u,0,7);g.fill();R(cx-1,28,2,2,'#1b1b1f');}
    R(20,34,8,3,'#2b2b31');return;}
  const h=crHash(r.t||'?'),hue=h%360,c=s/2;
  g.fillStyle='#111114';g.beginPath();g.arc(c,c,s*0.45,0,7);g.fill();
  g.strokeStyle='#2c2c33';g.lineWidth=Math.max(1,u);for(const rr of [0.38,0.31,0.25]){g.beginPath();g.arc(c,c,s*rr,0,7);g.stroke();}
  g.strokeStyle='rgba(255,255,255,.22)';g.beginPath();g.arc(c,c,s*0.36,3.6,4.6);g.stroke();
  g.fillStyle='hsl('+hue+',65%,52%)';g.beginPath();g.arc(c,c,s*0.17,0,7);g.fill();
  g.fillStyle='hsl('+((hue+40)%360)+',70%,78%)';g.fillRect(c-s*0.09,c-s*0.07,s*0.18,s*0.035);
  g.fillStyle='#000';g.beginPath();g.arc(c,c,s*0.035,0,7);g.fill();}
CRREG.thumb.song=crSongThumb;
