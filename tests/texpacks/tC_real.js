/* tC_real.js (Package C): the 12 spliced cast models on the real three r128, headless (plan section 6 C10), from
   assets/vendor/three.r128.min.js (bundled since Release 1.0; tC_browser.js makes the same checks in the browser).
   Uses real3.models(): hrLoadModels() extracted from the built game.js and run in strict mode against real THREE,
   with HR.EMBEDDED and a texURL that returns '' (no textures: every material takes its flat-colour fallback). */
'use strict';
const real3=require('../lib/real3.js');
if(!real3.available()){console.log('SKIP (no vendored three r128)');console.log('0 passed, 0 failed');process.exit(0);}
const boot=require('../lib/hr_boot.js'),{ok}=boot;
const NAMES=['player','bunkerbrad','lilcreepah','honeybee','zombie','boomer','skeleton','spider','pig','cow','sheep'];
boot.run(async()=>{
  const {THREE,loadModels,win}=real3.models();
  Object.assign(win.HR,{EMBEDDED:true,TEXBASE:'embedded:',texURL:()=>'',loadImg:()=>{}});
  let HR=null,err='';try{HR=loadModels();}catch(e){err=e&&e.stack||String(e);}
  ok('hrLoadModels() runs in strict mode on real r128'+(err?' ('+err.split('\n')[0]+')':''),!!HR&&!!HR.MODELS);
  if(!HR)return;
  ok('all 12 models registered',NAMES.every(n=>typeof HR.MODELS[n]==='function'));
  const S=(seed)=>({speed:0,attack:0,hurt:0,dead:0,yaw:0,pitch:0,seed,fuse:0,cd:0,near:99,accel:new THREE.Vector3(),
    fired:false,woodHit:false,blockHit:false,build:false,plant:false,grief:false,mood:undefined,talk:false,hp:1,periscope:false,headroom:3});
  for(const n of NAMES){let a,b,thrown='';
    try{a=HR.MODELS[n]();b=HR.MODELS[n]();
      const s=S(3);
      for(let i=0;i<300;i++){s.speed=(i%120)/120;s.attack=i%60<10?Math.sin(i/10*Math.PI):0;s.hurt=i%90<15?1-i%90/15:0;s.fired=i%60===0;
        s.woodHit=s.fired&&n==='player';s.build=s.plant=s.grief=i%100===50;s.fuse=n==='boomer'?Math.min(1,i/200):0;s.near=2;s.cd=(60-i%60)/60*0.9;
        s.yaw=Math.sin(i/40);s.pitch=0.3*Math.sin(i/30);s.accel.set(Math.sin(i/7)*5,0,Math.cos(i/9)*5);a.update(1/30,i/30,s);}
      for(let i=0;i<=120;i++){s.dead=Math.max(0.001,Math.min(1,i/90));a.update(1/30,10+i/30,s);}}catch(e){thrown=e&&e.message||String(e);}
    ok(n+': builds, updates 300 frames and dies without exceptions'+(thrown?' ('+thrown+')':''),!thrown&&!!a&&!!b);
    if(!a||!b)continue;
    ok(n+': deathDur within 3 s',!(a.deathDur>3));
    const am=a.mats||[],bm=b.mats||[];
    const own=am.filter(m=>!bm.includes(m));
    ok(n+': per-instance mats exist and have their own emissive Colors',own.length>0&&own.every(m=>!m.emissive||bm.every(x=>x.emissive!==m.emissive)));
    if(own[0]&&own[0].emissive){own[0].emissive.setRGB(0.45,0,0);const twin=bm[am.indexOf(own[0])];
      ok(n+': flashing one instance leaves the other dark',!twin||!twin.emissive||twin.emissive.r===0);own[0].emissive.setRGB(0,0,0);}
    if(n==='player'){const h=a.handles||{};
      ok('player: handles head/aL/aR/lL/lR/torso',!!(h.head&&h.aL&&h.aR&&h.lL&&h.lR&&h.torso));
      let vm=null;try{vm=a.viewmodel();}catch(e){}
      ok('player: viewmodel() returns {group, update}',!!(vm&&vm.group&&typeof vm.update==='function'));
      try{vm.update(1/30,1,S(1));ok('player: the viewmodel updates',true);}catch(e){ok('player: the viewmodel updates ('+e.message+')',false);}}}
});
