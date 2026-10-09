/* replay.js (game 6.9): REPLAYS. The game keeps the last 30 seconds of play ready to save: F8 writes an MP4 of the world view
   (paintings, everything on screen in the world) with the sound you hear (effects, world music, records, jukeboxes).
   WebCodecs encodes as you play (one 2D blit per captured frame, 30 fps, up to 720p, a key frame every second); rpMux packs
   the file (a minimal MP4: ftyp, mdat, moov; H.264 + AAC). The clock only runs while you play (not paused, not on the
   title), so a clip never has a frozen gap. On by default; Settings > Replays and the first-launch intro (rpIntro) turn it
   off. Saved under storage key 'vox_replay' ({on, intro}). Browsers without WebCodecs H.264 (older Firefox) say so.
   The sound is tapped on the audio thread (an AudioWorklet, ScriptProcessor as the fallback) and laid down gaplessly by
   sample index, re-anchored to the replay clock only after a pause or a >150 ms drift (no clicks between blocks).
   F2 saves a PNG screenshot of the world view (any time in a world, replays on or off). */
const RP={on:true,intro:false,loaded:false,wantIntro:false,ok:null,why:'',busy:false,saving:false,enc:null,w:0,h:0,cv:null,g:null,
  ch:[],desc:null,T:0,last:0,cap:-1,n:0,wp:false,aud:null,pcm:[],sr:0,drop:0,aS:0,aNext:-1,spF:0,shot:false,onShot:null};
const RP_LEN=30,RP_FPS=30,RP_URL='https://www.reddit.com/r/DanDingle/';

function rpU8(d){return d instanceof ArrayBuffer?new Uint8Array(d.slice(0)):new Uint8Array(d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength));}
async function rpProbe(w,h){
  if(typeof VideoEncoder==='undefined'||typeof VideoFrame==='undefined')return null;
  for(const codec of ['avc1.4d0028','avc1.42e028','avc1.640028','avc1.42001f']){
    const cfg={codec,width:w,height:h,bitrate:5e6,framerate:RP_FPS,avc:{format:'avc'},latencyMode:'realtime'};
    try{const r=await VideoEncoder.isConfigSupported(cfg);if(r&&r.supported)return cfg;}catch(e){}
  }
  return null;
}
function rpStart(){
  if(RP.enc||RP.busy||RP.ok===false||typeof renderer==='undefined')return;
  const c=renderer.domElement;if(!c||!c.width||!c.height)return;
  let h=Math.min(720,c.height)&~1,w=Math.round(h*c.width/c.height/2)*2;
  if(w>1920){w=1920;h=Math.round(w*c.height/c.width/2)*2;}
  RP.busy=true;
  rpProbe(w,h).then(cfg=>{
    RP.busy=false;
    if(!cfg){RP.ok=false;RP.why='This browser cannot record video (Chrome or Edge can)';rpSync();return;}
    RP.ok=true;RP.w=w;RP.h=h;RP.ch=[];RP.desc=null;RP.n=0;RP.cap=-1;RP.pcm=[];
    RP.cv=document.createElement('canvas');RP.cv.width=w;RP.cv.height=h;RP.g=RP.cv.getContext('2d',{alpha:false});
    RP.enc=new VideoEncoder({output:rpOut,error:e=>{RP.why='the video encoder stopped ('+((e&&e.message)||e)+')';rpStop();}});
    RP.enc.configure(cfg);
  }).catch(()=>{RP.busy=false;RP.ok=false;RP.why='Replays are not available in this browser';rpSync();});
}
function rpStop(){
  try{if(RP.enc&&RP.enc.state!=='closed')RP.enc.close();}catch(e){}
  RP.enc=null;RP.ch=[];RP.desc=null;RP.pcm=[];
}
function rpOut(chunk,meta){
  if(meta&&meta.decoderConfig&&meta.decoderConfig.description)RP.desc=rpU8(meta.decoderConfig.description);
  const b=new Uint8Array(chunk.byteLength);chunk.copyTo(b);
  RP.ch.push({t:chunk.timestamp,key:chunk.type==='key',b});
  /* keep RP_LEN seconds, starting on a key frame */
  const ch=RP.ch,cut=ch[ch.length-1].t-RP_LEN*1e6;let k=-1;
  for(let i=0;i<ch.length&&ch[i].t<=cut;i++)if(ch[i].key)k=i;
  if(k>0)ch.splice(0,k);
}
/* the sound tap: everything the game plays goes through AC's two buses (p07a acBus), after the volume sliders */
const RP_WORKLET="class T extends AudioWorkletProcessor{constructor(){super();this.l=new Float32Array(4096);this.r=new Float32Array(4096);this.n=0;this.f=0;}"+
  "process(i){const a=i[0],L=a&&a[0],R=a&&(a[1]||a[0]),k=L?L.length:128;if(this.n===0)this.f=currentFrame;"+
  "for(let j=0;j<k;j++){this.l[this.n+j]=L?L[j]:0;this.r[this.n+j]=R?R[j]:0;}this.n+=k;"+
  "if(this.n>=4096){this.port.postMessage({f:this.f,l:this.l,r:this.r},[this.l.buffer,this.r.buffer]);"+
  "this.l=new Float32Array(4096);this.r=new Float32Array(4096);this.n=0;}return true;}}registerProcessor('rp-tap',T);";
/* key: a gapless block counter; c0: the block's start on the AudioContext clock (s). A block that arrives late (the main
   thread stuttered) is still placed by when it was heard, not when it arrived: the replay clock now (extrapolated from the
   last frame) minus how long ago the block began on the audio clock. Consecutive blocks are laid end to end. */
function rpPcm(key,c0,L,R){
  if(!RP.on||!RP.enc||!RP.last||!playing||paused||document.visibilityState==='hidden'){RP.aNext=-1;return;}
  const sr=RP.sr,len=L.length,recNow=RP.T+Math.max(0,performance.now()-RP.last),ago=(AC.currentTime-c0)*1000;
  const want=Math.round((recNow-ago)*sr/1000);
  const tol=RP.aud&&RP.aud.port?0.06:0.25;                            /* the ScriptProcessor fallback's clock is coarser */
  const s=(key===RP.aNext&&Math.abs(RP.aS-want)<tol*sr)?RP.aS:want;    /* gapless; re-anchor only after a pause or real drift */
  RP.pcm.push({s,L,R});RP.aS=s+len;RP.aNext=key+len;
  const cut=Math.round(((RP.ch.length?RP.ch[0].t:RP.T*1000-RP_LEN*1e6)-2e6)*sr/1e6);
  while(RP.pcm.length&&RP.pcm[0].s+RP.pcm[0].L.length<cut)RP.pcm.shift();
}
function rpAudioTap(){
  if(RP.aud!==null||typeof AC==='undefined'||!AC||!AC.__sfx||!AC.__mus)return;
  RP.aud='pending';RP.sr=AC.sampleRate;
  const out=()=>{const z=AC.createGain();z.gain.value=0;z.connect(AC.__real||AC.destination);return z;};
  const fallback=()=>{
    if(!AC.createScriptProcessor){RP.aud=false;return;}
    try{const sp=AC.createScriptProcessor(4096,2,2);AC.__sfx.connect(sp);AC.__mus.connect(sp);sp.connect(out());
      sp.onaudioprocess=e=>{const ib=e.inputBuffer,f=RP.spF;RP.spF+=ib.length;
        rpPcm(f,e.playbackTime-2*ib.duration,new Float32Array(ib.getChannelData(0)),new Float32Array(ib.getChannelData(ib.numberOfChannels>1?1:0)));};
      RP.aud=sp;}catch(e){RP.aud=false;}
  };
  if(AC.audioWorklet&&typeof AudioWorkletNode!=='undefined'){
    /* a data: URL first: a page opened from disk (file://, origin null) may not load a worklet from a blob: URL */
    const data='data:application/javascript;charset=utf-8,'+encodeURIComponent(RP_WORKLET);
    const blob=()=>{const u=URL.createObjectURL(new Blob([RP_WORKLET],{type:'application/javascript'}));
      return AC.audioWorklet.addModule(u).finally(()=>{try{URL.revokeObjectURL(u);}catch(e){}});};
    AC.audioWorklet.addModule(data).catch(blob).then(()=>{
      const n=new AudioWorkletNode(AC,'rp-tap',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
      AC.__sfx.connect(n);AC.__mus.connect(n);n.connect(out());
      n.port.onmessage=e=>{const d=e.data;rpPcm(d.f,d.f/RP.sr,d.l,d.r);};
      RP.aud=n;
    }).catch(()=>fallback());
  }else fallback();
}
function rpStamp(){const d=new Date(),p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'_'+p(d.getHours())+'-'+p(d.getMinutes())+'-'+p(d.getSeconds());}
function rpDownload(blob,name){const url=URL.createObjectURL(blob),l=document.createElement('a');
  l.href=url;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
/* F2: a PNG of the world view, grabbed right after a render (the same moment replays use) */
function rpShotNow(){
  RP.shot=false;
  try{const c=renderer.domElement,k=document.createElement('canvas');k.width=c.width;k.height=c.height;k.getContext('2d').drawImage(c,0,0);
    k.toBlob(b=>{if(!b){showToast('📸 Could not take the screenshot');return;}
      if(RP.onShot){RP.onShot(b);return;}
      const name='DINGLECRAFT_'+rpStamp()+'.png';rpDownload(b,name);showToast('📸 Screenshot saved: '+name);},'image/png');
  }catch(e){showToast('📸 Could not take the screenshot');}
}
/* called once per rendered frame, right after the render (p07h), while the drawing buffer still holds the picture */
function recFrame(){
  if(RP.shot&&playing)rpShotNow();
  if(playing!==RP.wp){RP.wp=playing;if(playing)rpStop();}          /* a new world session starts a fresh buffer */
  /* idle costs nothing (no clock read): og_trace counts performance.now() calls */
  if(RP.ok===false||typeof VideoEncoder==='undefined'||!RP.loaded||!RP.on||!playing||paused||document.visibilityState==='hidden'){RP.last=0;return;}
  const now=performance.now(),dt=RP.last?Math.min(1000,Math.max(0,now-RP.last)):0;RP.last=now;
  rpAudioTap();
  RP.T+=dt;
  if(!RP.enc){rpStart();return;}
  const c=renderer.domElement;
  if(Math.abs(c.width/c.height-RP.w/RP.h)>0.02){rpStop();return;}  /* the window changed shape: restart at the new size */
  const slot=Math.floor(RP.T*RP_FPS/1000);                            /* frames sit on an exact 30 fps grid (editors like CFR) */
  if(slot<=RP.cap)return;
  if(RP.enc.encodeQueueSize>6){RP.drop++;return;}                    /* a slow machine skips frames instead of falling behind */
  RP.cap=slot;
  try{
    RP.g.drawImage(c,0,0,RP.w,RP.h);
    const vf=new VideoFrame(RP.cv,{timestamp:Math.round(slot*1e6/RP_FPS),duration:Math.round(1e6/RP_FPS)});
    RP.enc.encode(vf,{keyFrame:RP.n%RP_FPS===0});vf.close();RP.n++;
  }catch(e){}
}
async function rpAudio(t0,t1){
  if(!RP.sr||!RP.pcm.length||typeof AudioEncoder==='undefined'||typeof AudioData==='undefined')return null;
  const sr=RP.sr,N=Math.max(1,Math.round((t1-t0)/1e6*sr)),L=new Float32Array(N),R=new Float32Array(N),S0=Math.round(t0*sr/1e6);
  for(const p of RP.pcm){let o=p.s-S0;for(let i=0;i<p.L.length;i++,o++){if(o<0)continue;if(o>=N)break;L[o]=p.L[i];R[o]=p.R[i];}}
  const cfg={codec:'mp4a.40.2',sampleRate:sr,numberOfChannels:2,bitrate:128000};
  try{const s=await AudioEncoder.isConfigSupported(cfg);if(!s||!s.supported)return null;}catch(e){return null;}
  const out=[];let asc=null,bad=null;
  const enc=new AudioEncoder({output:(c,m)=>{if(!asc&&m&&m.decoderConfig&&m.decoderConfig.description)asc=rpU8(m.decoderConfig.description);
    const b=new Uint8Array(c.byteLength);c.copyTo(b);out.push({b,dur:c.duration});},error:e=>{bad=e;}});
  enc.configure(cfg);
  for(let i=0;i<N;i+=4096){const n=Math.min(4096,N-i),d=new Float32Array(n*2);d.set(L.subarray(i,i+n),0);d.set(R.subarray(i,i+n),n);
    const a=new AudioData({format:'f32-planar',sampleRate:sr,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(i/sr*1e6),data:d});enc.encode(a);a.close();}
  await enc.flush();try{enc.close();}catch(e){}
  if(bad||!out.length)return null;
  if(!asc){const fi=[96000,88200,64000,48000,44100,32000,24000,22050,16000,12000,11025,8000,7350].indexOf(sr);if(fi<0)return null;
    asc=new Uint8Array([(2<<3)|(fi>>1),((fi&1)<<7)|(2<<3)]);}
  return {sr,asc,chunks:out};
}
/* a minimal MP4: ftyp, mdat (video samples, then audio), moov (one H.264 track, one AAC track) */
function rpMux(o){
  const ch=s=>[...s].map(c=>c.charCodeAt(0)),u32=v=>[v>>>24&255,v>>>16&255,v>>>8&255,v&255],u16=v=>[v>>8&255,v&255];
  const A=x=>x instanceof Uint8Array?x:Uint8Array.from(x);
  const cat=a=>{let n=0;for(const x of a)n+=x.length;const r=new Uint8Array(n);let p=0;for(const x of a){r.set(x,p);p+=x.length;}return r;};
  const box=(t,...p)=>{const b=cat(p.map(A));return cat([A([...u32(b.length+8),...ch(t)]),b]);};
  const full=(t,v,f,...p)=>box(t,[v,f>>16&255,f>>8&255,f&255],...p);
  const MAT=[0x00010000,0,0,0,0x00010000,0,0,0,0x40000000].flatMap(u32);
  const stts=d=>{const r=[];for(const x of d){if(r.length&&r[r.length-1][1]===x)r[r.length-1][0]++;else r.push([1,x]);}
    return full('stts',0,0,u32(r.length),r.flatMap(([n,x])=>[...u32(n),...u32(x)]));};
  const stsz=s=>full('stsz',0,0,u32(0),u32(s.length),s.flatMap(u32)),stco=f=>full('stco',0,0,u32(f.length),f.flatMap(u32));
  const stsc=()=>full('stsc',0,0,u32(1),u32(1),u32(1),u32(1)),dinf=()=>box('dinf',full('dref',0,0,u32(1),full('url ',0,1)));
  const hdlr=(t,n)=>full('hdlr',0,0,u32(0),ch(t),u32(0),u32(0),u32(0),ch(n),[0]);
  const mdhd=(ts,d)=>full('mdhd',0,0,u32(0),u32(0),u32(ts),u32(d),u16(0x55c4),u16(0));
  const tkhd=(id,d,vol,w,h)=>full('tkhd',0,3,u32(0),u32(0),u32(id),u32(0),u32(d),u32(0),u32(0),u16(0),u16(0),u16(vol),u16(0),MAT,u32(w*65536),u32(h*65536));
  const V=o.v,VT=90000,vt=V.map(s=>Math.round(s.t*VT/1e6)),vend=Math.round(o.vEnd*VT/1e6);
  const vd=vt.map((t,i)=>Math.max(1,(i+1<vt.length?vt[i+1]:vend)-t)),vdur=vd.reduce((a,b)=>a+b,0),vms=Math.round(vdur*1000/VT);
  const Au=o.a,ad=Au?Au.chunks.map(c=>c.dur?Math.round(c.dur*Au.sr/1e6):1024):[],adur=ad.reduce((a,b)=>a+b,0),ams=Au?Math.round(adur*1000/Au.sr):0;
  const ftyp=box('ftyp',ch('isom'),u32(0x200),ch('isom'),ch('iso2'),ch('avc1'),ch('mp41'));
  const vsz=V.map(s=>s.b.length),asz=Au?Au.chunks.map(c=>c.b.length):[],vo=[],ao=[];
  let off=ftyp.length+8;for(const n of vsz){vo.push(off);off+=n;}for(const n of asz){ao.push(off);off+=n;}
  const mdat=box('mdat',cat(V.map(s=>s.b).concat(Au?Au.chunks.map(c=>c.b):[])));
  const avc1=box('avc1',[0,0,0,0,0,0,0,1],u16(0),u16(0),u32(0),u32(0),u32(0),u16(o.w),u16(o.h),u32(0x00480000),u32(0x00480000),u32(0),u16(1),
    new Uint8Array(32),u16(0x18),u16(0xffff),box('avcC',o.desc));
  const keys=[];V.forEach((s,i)=>{if(s.key)keys.push(i+1);});
  const vtrak=box('trak',tkhd(1,vms,0,o.w,o.h),box('mdia',mdhd(VT,vdur),hdlr('vide','VideoHandler'),box('minf',full('vmhd',0,1,u16(0),u16(0),u16(0),u16(0)),dinf(),
    box('stbl',full('stsd',0,0,u32(1),avc1),stts(vd),full('stss',0,0,u32(keys.length),keys.flatMap(u32)),stsc(),stsz(vsz),stco(vo)))));
  let atrak=null;
  if(Au){
    const desc=(tag,p)=>[tag,0x80,0x80,0x80,p.length,...p];
    const dsi=desc(5,[...Au.asc]),dcd=desc(4,[0x40,0x15,0,0,0,...u32(128000),...u32(128000),...dsi]),es=desc(3,[0,2,0,...dcd,...desc(6,[2])]);
    const mp4a=box('mp4a',[0,0,0,0,0,0,0,1],u32(0),u32(0),u16(2),u16(16),u16(0),u16(0),u32(Au.sr*65536),full('esds',0,0,es));
    atrak=box('trak',tkhd(2,ams,0x0100,0,0),box('mdia',mdhd(Au.sr,adur),hdlr('soun','SoundHandler'),box('minf',full('smhd',0,0,u16(0),u16(0)),dinf(),
      box('stbl',full('stsd',0,0,u32(1),mp4a),stts(ad),stsc(),stsz(asz),stco(ao)))));
  }
  const mvhd=full('mvhd',0,0,u32(0),u32(0),u32(1000),u32(Math.max(vms,ams)),u32(0x00010000),u16(0x0100),u16(0),u32(0),u32(0),MAT,new Uint8Array(24),u32(atrak?3:2));
  return cat([ftyp,mdat,box('moov',mvhd,vtrak,...(atrak?[atrak]:[]))]);
}
/* F8: save the last RP_LEN seconds. rpSave(true) returns the bytes instead of downloading them (QA) */
async function rpSave(bytesOnly){
  if(RP.saving)return null;
  if(!RP.on){showToast('🎬 Replays are off: turn them on in Settings');return null;}
  if(RP.ok===false){showToast('🎬 '+(RP.why||'Replays are not available in this browser'));return null;}
  if(!RP.enc||!RP.ch.length||!RP.desc){showToast('🎬 Nothing recorded yet: play for a moment first');return null;}
  RP.saving=true;let mp4=null;
  try{
    await RP.enc.flush();
    const ch=RP.ch.slice(),t0=ch[0].t,t1=ch[ch.length-1].t+Math.round(1e6/RP_FPS);
    const a=await rpAudio(t0,t1);
    mp4=rpMux({w:RP.w,h:RP.h,desc:RP.desc,v:ch.map(c=>({b:c.b,key:c.key,t:c.t-t0})),vEnd:t1-t0,a});
    if(!bytesOnly){
      const name='DINGLECRAFT_replay_'+rpStamp()+'.mp4';rpDownload(new Blob([mp4],{type:'video/mp4'}),name);
      showToast('🎬 Saved the last '+Math.round((t1-t0)/1e6)+' s'+(a?'':' (no sound)')+'. Share it on r/DanDingle!');
    }
  }catch(e){showToast('🎬 Could not save the replay ('+((e&&e.message)||e)+')');mp4=null;}
  RP.saving=false;
  return mp4;
}
function rpStore(){try{storage.set('vox_replay',JSON.stringify({on:RP.on?1:0,intro:RP.intro?1:0}));}catch(e){}}
function rpSync(){
  const b=$('s_replay');if(b){b.textContent='🎬 Replays: '+(RP.on?'On':'Off')+(RP.ok===false?' (unavailable)':'');
    b.title=RP.ok===false?(RP.why||'Not available in this browser'):'Keeps the last 30 seconds of play ready: press F8 to save it as an MP4';}
  const k=$('rp_chk');if(k)k.checked=RP.on;
}
function rpSetOn(v){RP.on=!!v;if(!RP.on)rpStop();rpStore();rpSync();}
/* the one-time intro: after the first-launch name, or once on the title for a returning player (p07g_title) */
function rpIntro(){
  if(!RP.loaded){RP.wantIntro=true;return;}
  if(RP.intro)return;
  const el=$('rpintro');if(!el)return;
  RP.intro=true;rpStore();rpSync();
  if(typeof VideoEncoder==='undefined'){const n=$('rp_note');if(n)n.textContent='Replays need Chrome or Edge. You can still share your best moments on r/DanDingle!';}
  el.style.display='flex';
  const ok=$('rp_ok');if(ok&&ok.focus)setTimeout(()=>{try{ok.focus();}catch(e){}},0);
}
function rpIntroClose(){const el=$('rpintro');if(el)el.style.display='none';}
(async()=>{
  try{const r=await storage.get('vox_replay');const s=r&&r.value?JSON.parse(r.value):null;if(s){RP.on=s.on!==0;RP.intro=!!s.intro;}}catch(e){}
  RP.loaded=true;rpSync();if(RP.wantIntro)rpIntro();
})();
{
  const on=(id,f)=>{const b=$(id);if(b)b.onclick=f;};
  on('s_replay',()=>{rpSetOn(!RP.on);playS('click');showToast(RP.on?'🎬 Replays on: F8 saves the last 30 seconds':'🎬 Replays off');});
  {const k=$('rp_chk');if(k&&k.addEventListener)k.addEventListener('change',()=>{rpSetOn(k.checked);playS('click');});}
  on('rp_reddit',()=>{try{window.open(RP_URL,'_blank','noopener');}catch(e){}playS('click');});
  on('rp_ok',()=>{rpIntroClose();playS('click');});
  if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('keydown',e=>{
    const el=$('rpintro');
    if(el&&el.style.display==='flex'&&(e.key==='Escape'||e.key==='Enter')){e.preventDefault();e.stopImmediatePropagation();rpIntroClose();return;}
    if(e.code==='F8'){e.preventDefault();if(!e.repeat)rpSave();}
    else if(e.code==='F2'){e.preventDefault();if(e.repeat)return;if(!playing)showToast('📸 Screenshots work once you are in a world');else RP.shot=true;}
  },true);
}
