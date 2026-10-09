/* ---- PART 57: m2_scenes.js ---- */
/* ===================================================================== */
/* PART 57 m2 (M2): his scenes (bible 6, 12, 13). Each is a CUT.script   */
/* (mgCut): Dan invulnerable, bots protected, adds frozen. The world     */
/* beats fire by scene time from mg2SceneTick; a skip runs every         */
/* remaining beat at once (the world jumps to the end state, never past  */
/* it). Full versions play once per world (MALG.seen), short after.      */
/*   intro  (15 s / 4 s)  the iris peels, a hand takes the door, he      */
/*                        hauls up chewing, the jaw splits               */
/*   climb  (6 s / 3 s)   THE CLIMB-OUT: onto the plate, the reveal, the */
/*                        Meal torn out (L1 -> L2)                       */
/*   light  (10 s / 4 s)  THE LIGHT: the centre torn out, into the pit,  */
/*                        HE EATS THE SUN (L2 -> L3)                     */
/*   death  (14 s)        THE BURST, then the world eats him back        */
/* ===================================================================== */
function mg2Cut(k,o){const s=Object.assign({k,t:0,beats:o.beats||[],end:o.end,shots:o.shots||[],fired:{},noSkip:!!o.noSkip,done:o.done||null},o);
  MG2.scene=s;MGF.phase=k;MGL.phase=k;
  for(const t of mg2Players())if(t!==P)mg2Grace(t,s.end+1);
  /* MZ: M3's rig-framed shot lists (hard cuts, never a dolly through his body) drive the camera; M2's eased shots are the fallback */
  let f3=null;if(MGREG.fx&&typeof MGREG.fx.cam==='function')try{f3=MGREG.fx.cam(k,o.full!==false);}catch(err){mgFail('cam:'+k,err);f3=null;}
  /* MZ: the first-person hand rides the camera; in his scenes the camera is not Dan's eye, so the hand (OG held item, the Hyperreal fist)
     hides while the scene runs (applyCamMode puts it back on the first ordinary frame) */
  const hide=function(){if(typeof handG!=='undefined'&&handG)handG.visible=false;};
  mgCut({lines:o.lines||[],end:o.end,cam:f3?function(t){hide();try{f3(t);}catch(err){f3=null;mgFail('cam:'+k,err);mg2Cam(s,t);}}:function(t){hide();mg2Cam(s,t);},onEnd:function(){mg2SceneDone(s);}});
  mg2Bus('scene',k);return s;}
function mg2SceneTick(dt){const s=MG2.scene;if(!s)return;
  s.t=(CUT.on&&CUT.script)?CUT.t:s.t+dt;
  if(s.noSkip&&CUT.on)CUT._sk=true;                                                         /* the first burst cannot be skipped */
  for(let i=0;i<s.beats.length;i++){const b=s.beats[i];if(!s.fired[i]&&s.t>=b[0]){s.fired[i]=1;try{b[1](s,false);}catch(err){mgFail('beat:'+s.k,err);}}}
  if(s.tick)try{s.tick(s,dt);}catch(err){mgFail('scene:'+s.k,err);}
  if(!CUT.on&&MG2.scene===s)mg2SceneDone(s);}
function mg2SceneDone(s){if(MG2.scene!==s)return;
  for(let i=0;i<s.beats.length;i++){const b=s.beats[i];if(!s.fired[i]){s.fired[i]=1;try{b[1](s,true);}catch(err){mgFail('beat:'+s.k,err);}}}
  MG2.scene=null;MGL.phase=MGF.live?'round':'idle';
  {const W=mg2W();if(W.finish)try{W.finish();}catch(err){mgFail('finish',err);}}
  if(CUT.on&&CUT.script)try{endCut();}catch(err){}
  if(s.done)try{s.done(s);}catch(err){mgFail('done:'+s.k,err);}}
function mg2SceneAbort(){const s=MG2.scene;if(!s)return;MG2.scene=null;s.done=null;if(CUT.on&&CUT.script){CUT.script.onEnd=null;try{endCut();}catch(err){}}}
/* the scene camera: shots [{t, p:[x,y,z], l:[x,y,z]}] relative to the plate centre at F; eased between keys */
function mg2Cam(s,t){if(!camera)return;const sh=s.shots;if(!sh.length)return;const F=mgF();let a=sh[0],b=sh[0];
  for(let i=0;i<sh.length;i++){if(sh[i].t<=t){a=sh[i];b=sh[Math.min(sh.length-1,i+1)];}}
  const k=b===a?0:Math.max(0,Math.min(1,(t-a.t)/Math.max(0.01,b.t-a.t))),e=k*k*(3-2*k);
  const P0=typeof a.p==='function'?a.p():a.p,P1=typeof b.p==='function'?b.p():b.p,L0=typeof a.l==='function'?a.l():a.l,L1=typeof b.l==='function'?b.l():b.l;
  const px=MGC.X+P0[0]+(P1[0]-P0[0])*e,py=F+P0[1]+(P1[1]-P0[1])*e,pz=MGC.Z+P0[2]+(P1[2]-P0[2])*e;
  const lx=MGC.X+L0[0]+(L1[0]-L0[0])*e,ly=F+L0[1]+(L1[1]-L0[1])*e,lz=MGC.Z+L0[2]+(L1[2]-L0[2])*e;
  camera.position.set(px,py,pz);const vx=lx-px,vy=ly-py,vz=lz-pz,vl=Math.hypot(vx,vy,vz)||1;
  camera.rotation.y=Math.atan2(-vx,-vz);camera.rotation.x=Math.asin(Math.max(-1,Math.min(1,vy/vl)));camera.rotation.z=0;}
function mg2DanRel(dy){return function(){return [P.x-MGC.X,P.y-mgF()+(dy||1.62),P.z-MGC.Z];};}
function mg2BossRel(dy){return function(){const e=mg2Boss();return e?[e.x-MGC.X,(e.y-mgF())+(dy||0),e.z-MGC.Z]:[0,dy||0,0];};}
function mg2SceneBrain(e,dt){const s=MG2.scene;if(s&&s.pose)try{s.pose(s,e,dt);}catch(err){mgFail('pose:'+s.k,err);}
  MGA.commit=0;MGA.vuln=0;}
function mg2SafeEveryone(){const F=mgF(),W=mg2W();
  for(const t of mg2Players()){const p=mg2TPos(t),z=mgZone(p.x,p.y,p.z);if(z!=='arena'&&z!=='gut'&&z!=='void')continue;
    if(z==='arena'&&mg2Stand(p.x,p.z)&&p.y>=F-0.6)continue;
    const s=mg2Land(p.x,p.z,{rmin:MALG.round===3?12.8:9,rmax:MALG.round===3?22.5:22.5});p.x=s.x;p.y=s.y+0.05;p.z=s.z;p.vx=p.vy=p.vz=0;if(t===P)P.fallD=0;}
  if(typeof NUKE!=='undefined')NUKE.flash=Math.max(NUKE.flash,0.5);}
function mg2HealAll(){if(P&&!P.dead){P.hp=20;drawStats();}for(const a of mg2Bots())a.hp=20;}

/* ---- the intro (bible 6) ---- */
function mg2Intro(cause){const full=!(MALG.seen&1),F=mgF();MALG.seen|=1;MGF.live=0;
  const e=mg2EnsureBoss(1);e.x=MGC.X;e.z=MGC.Z;e.y=F-16;MG2.rise=0;
  const l1={poke:'...You touched my eye.',offer:'You fed me.',egg:'...Something fell in.'}[cause]||'...You touched my eye.';
  const l2=MALG.oldKill?'You killed my VESSEL once. I have been chewing on that.':'I am MALGORATH. I have eaten ten thousand worlds, and every one of them had an architect in it.';
  const W=mg2W(),cap=function(){if(W.capOpen)try{W.capOpen();}catch(err){mgFail('capOpen',err);}},door=function(){if(W.door)try{W.door(false);}catch(err){mgFail('door',err);}};
  const pose=function(s,e2,dt){e2.x=MGC.X;e2.z=MGC.Z;e2.y=F-16+8*Math.max(0,Math.min(1,MG2.rise));MGA.stance='lean';const tx=P.x-e2.x,tz=P.z-e2.z;e2.yaw=mg2Turn(e2.yaw,mg2Yaw(tx,tz),2,dt);};
  const done=function(){MG2.rise=1;mg2StartRound(1,'scene');mg2S('mg_roar');};
  if(cause==='poke')mg2S('mg_poke');mg2S('mg_erupt');
  if(full)mg2Cut('intro',{end:15,full:true,lines:[{at:8,n:'MALGORATH',t:l1},{at:10,n:'MALGORATH',t:l2},{at:13,n:'MALGORATH',t:'I eat them last.'}],pose,done,
    beats:[[0,function(){mg2Shake(0.5,0.6);mg2S('mg_gulp');}],[1.5,function(s,sk){cap();if(!sk){mg2Burst('steam',MGC.X,F+1,MGC.Z,{id:B.LAVA,n:20,pw:2});mg2S('mg_erupt');}}],
      [3.5,function(s,sk){door();if(!sk){mg2Shake(0.4,0.4);mg2S('mg_slap');}}],[5.5,function(){MG2.riseOn=1;}],[8,function(){MGA.belly.glow=1;mg2S('mg_swallow');}],
      [13,function(){MGA.jaw=1;MGA.split=1;}],[14.9,function(){MG2.rise=1;}]],
    tick:function(s,dt){if(MG2.riseOn)MG2.rise=Math.min(1,MG2.rise+dt/2.5);if(s.t>13)MGA.split=Math.min(1,MGA.split+dt*2);},
    shots:[{t:0,p:mg2DanRel(),l:[0,0,0]},{t:1.5,p:[-12,1.2,-6],l:[0,0,0]},{t:3.5,p:[-14,6,-10],l:[0,1,0]},{t:5.5,p:[-12,3,-12],l:[0,6,0]},
      {t:8,p:[-7,4,-7],l:[0,3,0]},{t:10,p:function(){return [P.x-MGC.X-2,P.y-F+2.5,P.z-MGC.Z-2];},l:[0,7,0]},{t:13,p:[-6,6,-5],l:[0,6.5,0]},{t:15,p:mg2DanRel(),l:[0,6,0]}]});
  else mg2Cut('intro',{end:4,full:false,lines:[],pose,done,
    beats:[[0,function(s,sk){cap();mg2Shake(0.45,0.5);}],[0.8,function(s,sk){door();mg2S('mg_slap');}],[1.0,function(){MG2.riseOn=1;}],[3.0,function(){mg2S('mg_roar');MG2.rise=1;}]],
    tick:function(s,dt){if(MG2.riseOn)MG2.rise=Math.min(1,MG2.rise+dt/1.6);},
    shots:[{t:0,p:mg2DanRel(),l:[0,0,0]},{t:1,p:[-13,3,-8],l:[0,2,0]},{t:3,p:[-11,4,-9],l:[0,6,0]},{t:4,p:mg2DanRel(),l:[0,5,0]}]});}

/* ---- the transitions (bible 12): adds melt, Dan healed, the checkpoint advances, unsafe players moved at the last frame ---- */
function mg2Trans(r,preview){const F=mgF(),W=mg2W();mg2HealAll();MGF.live=1;
  const lay=function(n){if(W.layout)try{W.layout(n);}catch(err){mgFail('layout',err);}};
  if(r===1){const full=!(MALG.seen&2);MALG.seen|=2;
    const done=function(){mg2SafeEveryone();mg2StartRound(2,'scene');};
    const pose=function(s,e,dt){const k=Math.max(0,Math.min(1,(s.t-(full?1.0:0.4))/1.0));const th=0,x1=MGC.X+Math.cos(th)*16,z1=MGC.Z+Math.sin(th)*16;
      e.x=MGC.X+(x1-MGC.X)*k;e.z=MGC.Z+(z1-MGC.Z)*k;e.y=(F-8)+8*k+3*k*(1-k)*4;e.yaw=mg2Turn(e.yaw,mg2Yaw(P.x-e.x,P.z-e.z),2,dt);
      MGA.stance=s.t>(full?5.4:2.4)?'stalk':(s.t>(full?2.2:1.2)?'rear':'lean');};
    mg2Cut('climb',{end:full?6:3,full,lines:full?[{at:4.8,n:'MALGORATH',t:'ENOUGH TASTING.'}]:[],pose,done,
      beats:[[0,function(s,sk){if(!sk){mg2Shake(0.4,0.4);mg2S('mg_slap');}MGA.strata.roof=0;}],[full?1.0:0.4,function(s,sk){lay('L2');if(!sk){mg2Burst('dust',MGC.X,F+0.8,MGC.Z,{id:B.OBSIDIAN,n:30,pw:3});mg2Shake(0.6,0.6);mg2S('mg_stomp');}}],
        [full?2.2:1.2,function(s,sk){if(!sk)mg2S('mg_roar');}],[full?3.0:1.6,function(s,sk){if(!sk){mg2S('mg_chew');mg2Shake(0.3,0.5);}}],[full?5.4:2.6,function(){MGA.strata.roof=1;}]],
      shots:full?[{t:0,p:[-14,4,-6],l:[0,4,0]},{t:1,p:[-18,1.5,-4],l:[10,2,0]},{t:2.2,p:[-6,2,-6],l:[16,14,0]},{t:3,p:[-20,10,-14],l:[4,0,0]},{t:4.8,p:[4,9,-5],l:[16,10,0]},{t:5.4,p:[-16,6,-8],l:[14,4,0]},{t:6,p:mg2DanRel(),l:[16,6,0]}]
        :[{t:0,p:[-14,4,-6],l:[0,4,0]},{t:1.2,p:[-8,3,-8],l:[16,10,0]},{t:3,p:mg2DanRel(),l:[16,6,0]}]});
    return;}
  const full=!(MALG.seen&4);MALG.seen|=4;
  const done=function(){mg2SafeEveryone();MGL.eclipse=1;mg2StartRound(3,'scene');};
  const pose=function(s,e,dt){const k=Math.max(0,Math.min(1,(s.t-(full?2.0:0.8))/1.2));e.x=e.x+(MGC.X-e.x)*Math.min(1,dt*3*(k>0?1:0));e.z=e.z+(MGC.Z-e.z)*Math.min(1,dt*3*(k>0?1:0));
    e.y=k<=0?F:(F-13)+ (k<0.5?(13-26*k):0);MGA.stance=k>=1?(s.t>(full?5.0:2.0)?'headup':'chest'):(k>0?'kneel':'rear');
    if(s.t>(full?5.5:2.0))MGL.eclipse=Math.min(1,(s.t-(full?5.5:2.0))/(full?4.0:1.8));};
  mg2Cut('light',{end:full?10:4,full,lines:full?[{at:5,n:'MALGORATH',t:'I SAVED THE LIGHT FOR LAST.'}]:[],pose,done,
    beats:[[0,function(s,sk){if(!sk){mg2S('mg_crack');mg2Shake(0.4,0.5);}}],[full?2.0:0.8,function(s,sk){if(!sk){mg2Shake(0.6,0.6);mg2S('mg_stomp');}}],
      [full?3.5:1.4,function(s,sk){lay('L3');if(!sk)mg2S('mg_crack');}],[full?5.5:2.0,function(s,sk){if(!sk)mg2S('mg_sun');}],
      [full?9.4:3.8,function(){MGL.eclipse=1;MGA.strata.tree=1;mg2Bus('sun',1);}]],
    shots:full?[{t:0,p:[-16,5,-10],l:[0,2,0]},{t:2,p:[-20,2,8],l:[0,0,0]},{t:3.5,p:[-22,1.2,-2],l:[0,0,0]},{t:5,p:[-3,-2,-6],l:[0,20,0]},{t:5.5,p:[-24,3,-14],l:[0,10,0]},{t:9.5,p:[-20,2,-12],l:[0,1,0]},{t:10,p:mg2DanRel(),l:[0,0.5,0]}]
      :[{t:0,p:[-16,5,-10],l:[0,2,0]},{t:2,p:[-18,3,-12],l:[0,10,0]},{t:4,p:mg2DanRel(),l:[0,0.5,0]}]});}

/* ---- the death (bible 13): the burst, everything comes back out, the world buries him; preview kills re-form at Round I ---- */
function mg2Death(e,preview){const F=mgF(),full=!(MALG.seen&8)&&!preview,W=mg2W();
  MGF.live=0;mg2Clear();MGL.live=0;
  if(!preview){DEMON.dead=true;MALG.dead=1;MALG.kills=(MALG.kills|0)+1;MALG.round=3;MALG.deaths=[0,0,0];mg2PayKeys();}
  if(full)MALG.seen|=8;
  const lay=function(n){if(W.layout)try{W.layout(n);}catch(err){mgFail('layout',err);}};
  const pose=function(s,e2,dt){MGA.stance=s.t<1.5?'slump':'dead';MGA.crack.i=Math.min(1,Math.max(0,(s.t-0.3)/1.2));MGA.dead=Math.min(1,s.t/8);
    if(s.t>4.5)e2.y=(F-13)-Math.min(6,(s.t-4.5)*1.6);};
  const done=function(){const b=mg2Boss();if(b)removeEnt(b);MGF.boss=null;MGL.eclipse=0;MGL.dawn=0;
    if(preview){MALG.round=1;MG2.reform=4;MGF.phase='idle';if(W.reset)try{W.reset(1,{why:'preview',instant:1});}catch(err){mgFail('reset',err);}if(W.door)try{W.door(true);}catch(err){}
      mg2Say('He sinks back into the dark.',2.4);mg2Bus('preview',1);return;}
    mg2PaySpill();if(typeof WIN!=='undefined')WIN.pend=1.5;mg2Bus('kill',1);};
  mg2Cut('death',{end:14,full,noSkip:full,lines:[{at:6,n:'MALGORATH',t:'I have eaten ten thousand w—'},{at:6.9,n:'',t:''}],pose,done,
    beats:[[0,function(){MG2.silence=1.5;mg2S('mg_silence');}],
      [1.5,function(s,sk){if(!sk){NUKE.flash=1;mg2Shake(1.0,1.2);mg2S('mg_burst');}MGL.dawn=1;mg2Bus('burst',1);}],
      [1.6,function(s,sk){mg2Geyser(preview,sk);}],
      [4.5,function(s,sk){if(!preview)lay('Ldead');if(!sk)mg2S('mg_bury');}],
      [8.0,function(s,sk){if(!sk)mg2S('mg_chord');}],
      [10.0,function(s,sk){if(!preview&&!sk)mg2PaySpill();}]],
    tick:function(s,dt){if(s.t>1.5){MGL.eclipse=Math.max(0,1-(s.t-1.5)/1.0);MGL.dawn=Math.max(0,1-(s.t-1.5)/3.0);}},
    shots:[{t:0,p:mg2DanRel(),l:mg2BossRel(1)},{t:1.5,p:function(){return [P.x-MGC.X,P.y-F+2.2,P.z-MGC.Z];},l:[0,20,0]},{t:4.5,p:[-18,6,-14],l:[0,-4,0]},{t:8,p:[-16,4,-12],l:[0,-6,0]},
      {t:10,p:mg2DanRel(2),l:[0,-2,0]},{t:14,p:mg2DanRel(),l:[0,-2,0]}]});}
/* everything he ate comes back out (bible 13 t 1.6-4.5) */
function mg2Geyser(preview,sk){const F=mgF();
  for(const q of MG2.eaten.slice())mg2BotOut(q.a,1);
  for(const a of MG2.adds.splice(0))if(!a.dead){mg2Burst('ash',a.x,a.y+0.6,a.z,{id:B.STONE,n:5});removeEnt(a);}
  if(MALG.hat){if(!preview&&P&&P.cos){P.cos.hat=MALG.hat;}MALG.hat=null;}
  MALG.heads=0;
  if(!preview&&MALG.offer){spawnDrop(P.x,P.y+1.2,P.z,MALG.offer,0,4,0);MALG.offer=null;}
  if(!preview){const n=Math.floor(mg2Rng(2,4));for(let i=0;i<n;i++){const s=mg2Land(P.x+mg2Rng(-5,5),P.z+mg2Rng(-5,5),{});try{spawnMob('cow',s.x,s.y+0.5,s.z);}catch(err){}}}
  if(!sk){mg2Burst('geyser',MGC.X,F+1,MGC.Z,{id:B.DIRT,n:30,pw:3});}}
