/* tC_browser.js (Package C): browser QA for the Hyperreal cast on real three r128 (the checks tC_real.js would make
   headless if r128 were vendored, plus a 5x6 contact sheet). Load into the running game page, then:
     (0,eval)(await (await fetch('/tools/qa/texpacks/tC_browser.js')).text());
     const r=await castQA();                 // {pass, fail, fails:[...], info:{...}, shots:[labels]}
     castQA.view(i)                          // one tile full-window; window.__castSheet is the sheet canvas
   Options: {start:true (new creative world, seed 1337), only:null (setPack only-list; default the full pack, falling
   back to only:['ents'] when the full pack refuses), show:true (overlay, click to close), settle:30, tod:0.27}.
   Frames are driven with __vox.frameStep (works while the pane is hidden). Each tile is rendered with tpRenderOnce()
   from a placed camera (the next frame puts the game camera back) and copied from the GL canvas in the same task.
   It builds a floating grass stage and leaves the world changed. */
(function(){
'use strict';
window.castQA=async function(o){
  o=Object.assign({start:true,only:null,show:true,settle:30,tw:384,th:216,tod:0.27},o||{});
  const V=window.__vox,X=V.hrEnt,HRE=X.HRE;let T=Math.max(performance.now(),1e6)+2e5;
  const step=n=>{for(let i=0;i<(n||1);i++){T+=33;V.frameStep(T);}};
  const res={pass:0,fail:0,fails:[],info:{},shots:[]};
  const cols=5,rows=6,sheet=document.createElement('canvas');sheet.width=cols*o.tw;sheet.height=rows*o.th;
  const g=sheet.getContext('2d');g.fillStyle='#111';g.fillRect(0,0,sheet.width,sheet.height);
  const ok=(n,c)=>{if(c)res.pass++;else{res.fail++;res.fails.push(n);}return !!c;};
  const warns=[];const ow=console.warn;console.warn=function(...a){const s=a.map(x=>x&&x.stack?x.stack:String(x)).join(' ');if(/\[HR\]|\[TP\]/.test(s))warns.push(s.slice(0,300));return ow.apply(console,a);};
  try{
  if(o.start){V.startNewWorld('castqa','1337','c');step(30);}
  V.GR.dayCycle=false;V.GR.mobSpawn=false;V.GR.snail=false;V.GR.jsc=0;V.setTime(o.tod);
  /* stage: a floating 34x16 grass floor with 7 blocks of air above */
  const P0=V.P,SX=Math.floor(P0.x)-17,SZ=Math.floor(P0.z)-34,SY=48;
  for(let x=SX;x<SX+34;x++)for(let z=SZ;z<SZ+16;z++){V.setBlock(x,SY,z,V.B.GRASS);for(let y=SY+1;y<SY+8;y++)V.setBlock(x,y,z,V.B.AIR);}
  const cx=SX+17,cz=SZ+8,fy=SY+1;
  const pose=(x,y,z,yaw,pitch)=>{const P=V.P;P.mode='c';P.flying=true;P.x=x;P.y=y;P.z=z;P.yaw=yaw;P.pitch=pitch;P.vx=P.vy=P.vz=0;P.fallD=0;P.hp=20;};
  const park=()=>pose(cx,fy+0.05,SZ+15,0,-0.1);              /* Dan stands at the front edge, out of shot */
  park();V.forceChunksNear(cx,cz);step(60);
  /* pack */
  let on=await V.setPack('hr',o.only?{only:o.only}:{});
  if(!on&&!o.only)on=await V.setPack('hr',{only:['ents']});
  const tp=V.getTP();res.info.pack=tp.live.join('+');res.info.tier=V.tpQ().n;
  ok('Hyperreal is live with the cast',on&&tp.live.includes('ents'));
  const h=V.getHRE();res.info.hre={installed:h.installed,broken:h.broken,models:h.models.length,textures:h.textures,emb:h.emb};
  ok('all '+X.HR_CAST.length+' cast models installed (Release 1.0: no villager model; aliens stay OG)',h.installed&&!h.broken&&h.models.length>=X.HR_CAST.length&&!X.HR_CAST.includes('villager'));
  ok('entity textures embedded and shared ('+h.textures+' textures)',h.emb&&h.textures>=100);
  const gl=document.getElementById('gl');
  /* camera placement for a tile: at (x,y,z) looking at (tx,ty,tz); the fist is hidden */
  const camAt=(x,y,z,tx,ty,tz)=>()=>{camera.position.set(x,y,z);camera.lookAt(tx,ty,tz);camera.updateMatrixWorld();handG.visible=false;};
  const front=(e,dist,ang,hgt,face)=>{const f=e.yaw+(face||0)+(ang||0),px=e.x+Math.sin(f)*dist,pz=e.z+Math.cos(f)*dist;
    return camAt(px,e.y+(hgt===undefined?1.3:hgt),pz,e.x,e.y+Math.min(1.1,e.h*0.55),e.z);};
  const tile=(label,cam)=>{const i=res.shots.length;if(i>=cols*rows)return;const hv=handG.visible;
    if(cam)cam();V.tpRenderOnce();handG.visible=hv;
    const x=(i%cols)*o.tw,y=Math.floor(i/cols)*o.th;g.drawImage(gl,0,0,gl.width,gl.height,x,y,o.tw,o.th);
    g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x,y,o.tw,16);g.fillStyle='#fff';g.font='11px monospace';g.fillText((i+1)+' '+label,x+4,y+12);
    res.shots.push(label);};
  const spawnAt=(mt,x,z,yaw)=>{V.spawnMob(mt,x,fy+0.05,z);const e=V.entities[V.entities.length-1];e.mode='idle';e.tT=999;e.yaw=yaw||0;return e;};
  /* 1-8: the mobs (spaced along the stage, facing Dan); since Release 1.0 the alien has no Hyperreal model and renders OG */
  const types=['zombie','skel','boomer','spider','pig','cow','sheep'],mobs={};
  types.forEach((mt,i)=>{mobs[mt]=spawnAt(mt,SX+3.5+i*3.8,cz-2,0);});mobs.alien=spawnAt('alien',SX+3.5+7*3.8,cz-2,0);
  ok('the alien renders OG in Hyperreal (no HR model, OG legs)',!mobs.alien.hrM);
  ok('every planned mob type spawned Hyperreal with flash mats that are its own (not shared, no authored emissive)',
    types.every(mt=>{const e=mobs[mt];return !!e.hrM&&e.legs.length===0&&e.mats.length>0&&e.mats.every(m=>!HRE.shared.has(m)&&m.emissive.r+m.emissive.g+m.emissive.b===0);}));
  step(o.settle);
  for(const mt of types){const e=mobs[mt];tile(mt+(e.hrM?'':' (OG!)'),front(e,mt==='cow'?4.6:mt==='spider'?3.4:3.0,0.45,mt==='cow'?1.9:1.35));}
  tile('alien (OG in Hyperreal)'+(mobs.alien.hrM?' HR!':''),front(mobs.alien,3.0,0.45,1.35));
  /* real-r128 checks (tC_real equivalents) */
  const pigA=mobs.pig,pigB=spawnAt('pig',pigA.x+1.6,pigA.z+0.4,0.4);step(3);
  ok('per-instance flash materials are distinct objects with distinct emissive Colors',pigA.mats.every(m=>!pigB.mats.includes(m)&&pigB.mats.every(n=>n.emissive!==m.emissive)));
  pigA.hurtT=0;V.GR.freezeMobs=true;V.hurtMob(pigA,0.001,1,0);
  ok('hurting one pig does not flash the other',pigA.mats.every(m=>m.emissive.r>0.4)&&pigB.mats.every(m=>m.emissive.r===0));
  tile('hurt flash: left pig only',camAt(pigA.x+0.8,pigA.y+1.4,pigA.z+3.6,pigA.x+0.8,pigA.y+0.5,pigA.z));
  V.GR.freezeMobs=false;
  const H=pigB.hrM,sharedObjs=[],ownObjs=[];
  for(const me of H.meshes){for(const x of [me.geometry].concat(me.material))(HRE.shared.has(x)?sharedObjs:ownObjs).push(x);}
  ok('a pig instance has both module caches and its own objects',sharedObjs.length>0&&ownObjs.length>0);
  const disposed=new Set();for(const x of new Set(sharedObjs.concat(ownObjs))){const d=x.dispose.bind(x);x.dispose=()=>{disposed.add(x);d();};}
  V.hurtMob(pigB,999,1,0);step(1);
  ok('killMob leaves a corpse',V.hrCorpseCount()>=1&&pigB.dead);
  for(let i=0;i<160&&HRE.corpses.some(c=>c.H===H);i++)step(1);
  ok('the corpse ends and hrFree disposes only the instance\'s own objects',[...new Set(ownObjs)].every(x=>disposed.has(x))&&sharedObjs.every(x=>!disposed.has(x)));
  /* 10-13: a death in four frames (zombie) */
  const z=mobs.zombie;V.hurtMob(z,999,1,0);const zc=HRE.corpses[HRE.corpses.length-1];
  for(const t of [0.3,1.0,2.4,3.5]){while(zc&&zc.age<t&&HRE.corpses.includes(zc))step(1);
    tile('zombie death t='+t,camAt(zc.x+2.6,zc.y+1.5,zc.z+2.6,zc.x,zc.y+0.4,zc.z));}
  ok('the zombie corpse played s.dead to 1',zc&&zc.H.s.dead>=1);
  /* 14: the boomer (a walking powder keg) fuse, forced through s.fuse (creative never lights it) */
  const cr=mobs.boomer;V.GR.freezeMobs=true;const cs=cr.hrM.s;
  for(let i=0;i<45;i++){cs.fuse=Math.min(1,i/36);cs.near=2;cr.hrM.hr.update(1/30,HRE.t+i/30,cs);}
  tile('boomer fuse 1.0 (doors open)',front(cr,3.4,0.45,1.5));
  for(let i=0;i<20;i++){cs.fuse=Math.max(0,1-i/10);cr.hrM.hr.update(1/30,HRE.t+2+i/30,cs);}
  V.GR.freezeMobs=false;
  /* 15: skeleton mid-shot (fired) */
  const sk=mobs.skel,ss=sk.hrM.s;V.GR.freezeMobs=true;ss.fired=true;ss.near=6;
  for(let i=0;i<24;i++){sk.hrM.hr.update(1/30,HRE.t+3+i/30,ss);ss.fired=false;}
  tile('skeleton: rib shot',front(sk,3.0,0.6,1.4));
  V.GR.freezeMobs=false;
  /* 17-19: the AI players */
  V.setBrainMock(null);V.BRAIN.ok=false;V.BRAIN.off=true;V.GR.bots=true;V.agJoinAll(true);
  for(let i=0;i<60&&!V.AGENTS.every(a=>a.e);i++)step(1);
  V.GR.freezeMobs=true;
  const place=()=>V.AGENTS.forEach((a,i)=>{if(!a.e)return;a.x=a.e.x=SX+9+i*5;a.y=a.e.y=fy+0.05;a.z=a.e.z=cz+3;a.e.vx=a.e.vz=0;a.yaw=a.e.yaw=Math.PI*0.9;});
  for(let i=0;i<o.settle;i++){place();step(1);}
  ok('three AI players with Hyperreal bodies',V.AGENTS.length===3&&V.AGENTS.every(a=>a.e&&a.e.hrM&&a.e.M.hr&&a.e.M.tag.position.y===2.62));
  for(const a of V.AGENTS){if(!a.e)continue;tile(a.name+(a.e.hrM?'':' (OG!)'),front(a.e,3.2,0.35,1.7,Math.PI));}
  /* 20-21: Dan in third person (back, pickaxe) and front view (hat + armour) */
  const P=V.P;P.cos=P.cos||{};P.cos.hat='tophat';P.armor=[{id:V.armorId(2,0)},{id:V.armorId(2,1)},null,null];
  P.inv[P.sel]={id:V.toolId(3,0),count:1};V.refreshHand();
  pose(cx,fy+0.05,cz+2,0.5,-0.2);V.setCam(1);step(o.settle);tile('Dan, third person (pickaxe)');
  const M=X.pl();
  ok('the player model is Hyperreal with OG-frame anchors',!!(M&&M.hr&&M.head&&M.aL&&M.aR&&M.lL&&M.lR&&M.helmA&&M.chestA));
  ok('hat on the head anchor, armour on head/torso anchors, tool on the arm anchor',!!(M.head.getObjectByName('hat')&&M._arm&&M._arm[0][0].parent===M.helmA&&M._arm[1][0].parent===M.chestA&&M._tool&&M._tool.parent===M.aR&&M._toolId===V.toolId(3,0)));
  V.setCam(2);pose(cx,fy+0.05,cz+2,0.5,0);step(o.settle);tile('Dan, front view (hat, helmet, chestplate)');
  P.inv[P.sel]=null;P.cos.hat=null;P.armor=[null,null,null,null];V.refreshHand();V.setCam(0);
  /* 22-24: the first-person fist: rest, jab, block in hand */
  ok('the viewmodel exists only for the empty hand',V.getHand().n===1&&X.hand().children[0]===M.hrM.vm.group);
  pose(cx,fy+0.05,cz+5,0,-0.15);P.swing=0;step(o.settle);tile('first person: the fist');
  P.swing=1;step(3);tile('first person: jab');
  P.inv[P.sel]={id:V.B.STONE,count:1};V.refreshHand();step(3);
  ok('a block in hand replaces the fist (OG cube in the hand)',V.getHand().n===1&&X.hand().children[0]!==M.hrM.vm.group);
  tile('first person: block in hand');
  P.inv[P.sel]=null;V.refreshHand();step(2);
  /* 25-26: wide day and night */
  park();step(4);tile('wide: the cast on stage',camAt(cx,fy+4.5,SZ+24,cx,fy+0.8,cz));
  V.setTime(0.75);step(4);tile('wide: night',camAt(cx,fy+4.5,SZ+24,cx,fy+0.8,cz));
  /* 27-28: torch-lit at night (B's torch pool lights the cast) */
  for(const e of [mobs.skel,mobs.alien])for(const dx of [-1,1])V.setBlock(Math.floor(e.x)+dx,fy,Math.floor(e.z)+1,V.B.TORCH);
  step(20);tile('night, torch-lit: skeleton',front(mobs.skel,2.8,0.5,1.4));tile('night, torch-lit: alien (OG)',front(mobs.alien,2.8,0.5,1.5));
  V.setTime(o.tod);
  V.GR.freezeMobs=false;
  /* 29-30: a survival hit: the zombie's club lands on the damage frame (s.fired) */
  {park();step(2);const P=V.P;P.mode='s';P.flying=false;P.hp=20;P.hurtT=0;
    V.spawnMob('zombie',P.x+2.6,fy+0.05,P.z-0.4);const zz=V.entities[V.entities.length-1];zz.mode='chase';
    let hitF=-1;
    for(let i=0;i<200&&hitF<0;i++){const hp=P.hp;step(1);
      if(P.hp<hp){hitF=i;tile('zombie strike: the damage frame',camAt(zz.x+(P.x-zz.x)*0.5+2.2,fy+1.6,zz.z+(P.z-zz.z)*0.5+2.2,(zz.x+P.x)/2,fy+1.0,(zz.z+P.z)/2));}}
    ok('a survival zombie hits Dan (strike tile captured)',hitF>=0);
    for(let i=0;i<10;i++)step(1);tile('zombie: after the strike',camAt(zz.x+(P.x-zz.x)*0.5+2.2,fy+1.6,zz.z+(P.z-zz.z)*0.5+2.2,(zz.x+P.x)/2,fy+1.0,(zz.z+P.z)/2));
    P.mode='c';P.hp=20;V.hurtMob(zz,999,1,0);step(2);}
  /* every model: 300 frames of everything, then a full death (strict mode, no exceptions) */
  const all=[];for(const n of X.HR_CAST){const b=X.hrBuild(n);if(!b){ok('build '+n,false);continue;}all.push(b);}
  const threw=[];
  for(const b of all){const s=b.s;try{for(let i=0;i<300;i++){s.speed=(i%120)/120;s.attack=i%60<10?Math.sin(i/10*Math.PI):0;s.hurt=i%90<15?1-i%90/15:0;
      s.fired=i%60===0;s.woodHit=s.fired&&b.name==='player';s.build=s.plant=s.grief=i%100===50;s.fuse=b.name==='boomer'?Math.min(1,i/200):0;
      s.near=2;s.cd=(60-i%60)/60*0.9;s.mood=i>150?'happy':undefined;s.talk=i%80<20;s.periscope=true;s.headroom=i>200?1:3;
      s.yaw=Math.sin(i/40);s.pitch=0.3*Math.sin(i/30);s.accel.set(Math.sin(i/7)*5,0,Math.cos(i/9)*5);b.hr.update(1/30,i/30,s);}
    for(let i=0;i<=120;i++){s.dead=Math.max(0.001,Math.min(1,i/90));b.hr.update(1/30,10+i/30,s);}}catch(err){threw.push(b.name+': '+(err&&err.message));}}
  ok('all '+all.length+' cast models update 300 frames and die without exceptions'+(threw.length?' ('+threw.join('; ')+')':''),threw.length===0);
  ok('death durations are within 3 s',all.every(b=>!(b.hr.deathDur>3)));
  ok('the player keeps head/aL/aR/lL/lR and a viewmodel',(()=>{const p=all.find(b=>b.name==='player');const hh=p&&p.hr.handles;return !!(hh&&hh.head&&hh.aL&&hh.aR&&hh.lL&&hh.lR&&p.hr.viewmodel);})());
  for(const b of all)X.hrFree(b);
  ok('no [HR]/[TP] warnings during the run'+(warns.length?' ('+warns.slice(0,3).join(' | ')+')':''),warns.length===0);
  res.info.calls=renderer.info.render.calls;res.info.memory=Object.assign({},renderer.info.memory);res.info.programs=renderer.info.programs?renderer.info.programs.length:null;
  }finally{console.warn=ow;V.GR.freezeMobs=false;}
  window.__castSheet=sheet;
  if(o.show)castQA.showSheet(sheet);
  return res;};
castQA.showSheet=function(cv){let d=document.getElementById('castqa');if(d)d.remove();d=document.createElement('div');d.id='castqa';
  d.style.cssText='position:fixed;inset:0;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer';
  const im=new Image();im.src=cv.toDataURL('image/jpeg',0.9);im.style.cssText='max-width:100%;max-height:100%';d.appendChild(im);
  d.onclick=()=>d.remove();document.body.appendChild(d);};
castQA.view=function(i){const s=window.__castSheet;if(!s)return;const tw=s.width/5,th=s.height/6,c=document.createElement('canvas');
  c.width=tw;c.height=th;c.getContext('2d').drawImage(s,(i%5)*tw,Math.floor(i/5)*th,tw,th,0,0,tw,th);castQA.showSheet(c);return c;};
})();
