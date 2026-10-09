/* boss_scripts.js (P4): the scripted counter-plays per headliner, shared by test/p4_boss.js and the speed-run pilot
   (qa/speedrun.js). require('./boss_scripts.js')[name](V,pilot,opts) plays the fight with honest input only (movement keys,
   look, mouse buttons, hotbar selection, eating, the respawn button) and returns true once MP.dead[name] is set.
   The scripts read game state to decide (like a player watching the screen) but never write it.
   opts: {maxS: game-seconds budget (default 600), log: fn(msg), noWalkIn: true when the caller already stands in the arena,
          escape: fn() (the Frog only, PZ) a caller-supplied climb out of the Bog Hollow; returns true if it moved Dan}.
   Scripted moves of Dan's body (a headliner's grab, throw, reel or swallow, a respawn) are announced to the pilot's ledger
   through pilot.allowJump, exactly like a knockback. */
'use strict';
function ctl(V,pilot,opts){
  const P=()=>V.P,B=V.B,IT=V.IT,K=V.KEY,M=V.MB,o=opts||{};const MP=()=>V.getMP();
  const C={frames:0,deaths:0,log:o.log||(()=>{})};
  C.tick=function(n){for(let i=0;i<(n||1);i++){const H=V.getHNS(),p=P();
      const f=V.getMPF().fight,K=V.getHNK&&V.getHNK(),pe=f&&!f.over&&f.e;
      const risky=(H&&H.danK)||(K&&(K.swal||(K.tg&&(K.tg.st==='reel'||K.tg.st==='drag'))))||(pe&&['smooch','lift','hurl','charge','lunge'].includes(pe.st))||(H&&H.strike&&H.strike.hand);
      if(p.dead||risky||V.mpInfo().cut||(p.hurtT>0.2))pilot.allowJump('scripted move',2);
      /* a Hand wrapped over the face (the screen is the inside of a puppet): three separate attack presses peel it off */
      if(V.entities.some(m=>!m.dead&&m.mt==='pghand'&&m.pwrap)){M.l=(C.frames&1)===0;M.r=false;}
      pilot.frame(1);C.frames++;C.respawn();}};
  C.release=function(){K.KeyW=K.KeyS=K.KeyA=K.KeyD=false;K.ControlLeft=false;K.Space=false;K.ShiftLeft=false;M.l=false;M.r=false;};
  C.respawn=function(){const p=P();if(!p.dead)return;C.release();C.deaths++;for(let i=0;i<12;i++){pilot.allowJump('dead',2);pilot.frame(1);}
    pilot.allowJump('respawn',40);V.respawn();for(let i=0;i<30;i++){pilot.allowJump('respawn',2);pilot.frame(1);}
    /* the Lost Property can throws the kit back: stand on the Mark until it stops, then pick up whatever landed short */
    for(let i=0;i<250;i++){const p=P();if(p.dead)break;const drops=V.entities.filter(e=>!e.dead&&e.t==='drop'&&Math.hypot(e.x-p.x,e.z-p.z)<9&&Math.abs(e.y-p.y)<4);
      const flying=drops.some(e=>e.pvol);if(!flying&&!drops.length&&i>25)break;
      if(!flying&&drops.length){const d=drops.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];C.steer(d.x,d.z,true);}else C.release();
      pilot.allowJump('respawn',2);pilot.frame(1);C.frames++;}
    C.release();C.log('respawned');};
  C.has=id=>V.invCount(P().inv,id)>0;
  C.sel=function(ids){for(const id of [].concat(ids))if(C.has(id)){if(V.heldStack()&&V.heldStack().id===id)return id;pilot.select(id);return id;}return null;};
  C.weapon=()=>C.sel([IT.PG_GAUNTLET,IT.PG_STILETTO,IT.PG_CHOPGLOVE,IT.PG_RAPIER,IT.PG_BAT,IT.PG_SLAPPER])||(pilot.emptyHand(),null);
  C.look=function(x,y,z){const p=P(),dx=x-p.x,dy=y-(p.y+p.eyeY),dz=z-p.z;p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(dy,Math.hypot(dx,dz));};
  /* one frame of steering toward (x,z); returns the remaining distance */
  C.steer=function(x,z,walk){const p=P(),dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);M.l=false;M.r=false;
    if(d<0.35){K.KeyW=false;K.ControlLeft=false;return d;}p.yaw=Math.atan2(-dx,-dz);K.KeyW=true;K.ControlLeft=!walk&&d>3;
    C._st=(C._lp&&Math.hypot(p.x-C._lp[0],p.z-C._lp[1])<0.01)?(C._st||0)+1:0;C._lp=[p.x,p.z];K.Space=C._st>3&&p.onGround;return d;};
  C.goTo=function(x,z,tol,maxS,walk){const n=Math.round((maxS||30)/0.04);for(let i=0;i<n;i++){if(C.steer(x,z,walk)<(tol||0.8)){C.release();return true;}C.tick();if(P().dead)return false;}C.release();return false;};
  /* melee: aim at the entity's middle and hold the button while it is in reach */
  C.hit=function(e,yOff){const p=P();if(!e||e.dead)return false;const ty=e.y+(yOff!=null?yOff:(e.h||1)*0.55);C.look(e.x,ty,e.z);
    const d=Math.hypot(e.x-p.x,ty-(p.y+p.eyeY),e.z-p.z);M.l=d<3.0;return d<3.0;};
  C.eat=function(){const p=P();if(p.hunger>=17||p.dead)return false;const f=[IT.PG_GLAZED,IT.PG_ROAST,IT.PG_FLATBREAD,IT.PG_GRILLED,IT.PG_MEATBALL,IT.PG_TOMATO,IT.PG_STUFF].find(id=>C.has(id));
    if(!f)return false;C.release();const r=pilot.eat(f);return r;};
  C.break=function(x,y,z,tool){const p=P();if(tool)C.sel(tool);for(let i=0;i<60;i++){if(V.getBlock(x,y,z)!==B.PG_CORD&&!(V.getBlock(x,y,z)&&i===0))break;
      if(V.getBlock(x,y,z)===0)break;C.look(x+0.5,y+0.2,z+0.5);M.l=true;C.tick();}M.l=false;C.tick();return V.getBlock(x,y,z)===0;};
  C.place=function(x,y,z,id){/* aim at the top face of the block below and right-click once */const p=P();if(!C.sel(id))return false;
    C.look(x+0.5,y-0.02,z+0.5);M.r=true;C.tick();M.r=false;C.tick(2);return V.getBlock(x,y,z)===id;};
  C.clock=()=>MP().clock;
  /* put on every armour piece we carry (right-click with it in hand equips it) */
  C.wear=function(){for(const s of P().inv.slice()){if(!s||!V.DEFS[s.id].armor)continue;const sl=V.DEFS[s.id].armor.s;if(P().armor[sl])continue;pilot.select(s.id);M.r=true;C.tick();M.r=false;C.tick(2);}};
  /* the Foam Bat: swing at any of these projectiles inside 3.2 m in front of us (looking at `at`) */
  C.incoming=function(kinds,r){const p=P();return V.entities.some(q=>!q.dead&&q.t==='pproj'&&kinds.indexOf(q.kind)>=0&&q.owner!=='Dan'&&Math.hypot(q.x-p.x,q.y-(p.y+1.2),q.z-p.z)<(r||3));};
  C.bat=function(kinds,at){if(!C.sel(IT.PG_BAT))return false;const p=P();if(at)C.look(at[0],at[1],at[2]);const L=[-Math.sin(p.yaw),0,-Math.cos(p.yaw)];
    for(const q of V.entities){if(q.dead||q.t!=='pproj'||kinds.indexOf(q.kind)<0||q.owner==='Dan')continue;const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,q.y-(p.y+1.4),dz);
      if(d<3.0&&(dx*L[0]+dz*L[2])/Math.max(0.1,Math.hypot(dx,dz))>0.8){p.pitch=Math.atan2(q.y-(p.y+p.eyeY),Math.hypot(dx,dz));M.l=!C._bl;C._bl=M.l;return true;}}
    M.l=false;C._bl=false;return false;};
  return C;}

/* ===================================================================== THE DEMOLITIONIST */
function bomber(V,pilot,opts){opts=opts||{};const C=ctl(V,pilot,opts),A=V.hnA(),IT=V.IT,B=V.B,P=()=>V.P,MP=()=>V.getMP();const t0=C.clock(),maxS=opts.maxS||600;
  const F=()=>V.getMPF().fight,E=()=>{const f=F();return f&&!f.over?f.e:null;};
  const dnp=A.dnp;
  /* walk to DO NOT PUSH (from the downstage side, off the welcome mat) and punch it with Snips on us */
  if(!opts.noWalkIn&&!C.goTo(dnp.c[0]+0.5,dnp.c[1]-1.3,0.6,90))return false;
  for(let k=0;k<120&&!F();k++){const st=V.hnProp('bomber','dnp');if(st){C.weapon();C.hit(st,0.6);}C.tick();}
  C.release();if(!F())return false;
  for(let k=0;k<200&&V.mpInfo().cut;k++){V.KEY.Space=k%4<2;C.tick();}V.KEY.Space=false;
  /* the plan: wire every seat (one Det Cord in each frayed lead's gap), stand off the plates next to a riser and hit him in
     the seat-blast and back-turned windows; pass bundles back by hitting him; in P3 cut the fuse near its start and hit him
     while he splices; pull the Trap Release lever when he sits on the bomb */
  const wire=s=>{if(V.getBlock(s.gap[0],s.gap[1],s.gap[2])===B.PG_CORD)return true;if(!C.has(B.PG_CORD))return false;
    const sx=s.gap[0]+0.5+s.sx*0.0,sz=s.gap[2]+0.5-1.6;C.goTo(sx,sz,0.6,25);return C.place(s.gap[0],s.gap[1],s.gap[2],B.PG_CORD);};
  let mode='wire',wi=0;
  while(C.clock()-t0<maxS){const f=F(),e=E();if(MP().dead.bomber)break;if(!f){C.tick();if(!F()&&!MP().dead.bomber){/* the fight reset: summon again */
        if(!C.goTo(dnp.c[0]+0.5,dnp.c[1]-1.3,0.6,60))continue;const st=V.hnProp('bomber','dnp');if(st){C.weapon();for(let k=0;k<40&&!F();k++){C.hit(st,0.6);C.tick();}}C.release();
        for(let k=0;k<200&&V.mpInfo().cut;k++){V.KEY.Space=k%4<2;C.tick();}V.KEY.Space=false;}continue;}
    if(!e){C.tick();continue;}
    if(P().hp<9&&C.eat())continue;
    if(f.dying){/* he lights his own short fuse: get 13 m away from the bomb */const bx=A.bigone[0]+0.5,bz=A.bigone[1]+0.5;
      const d=Math.hypot(P().x-bx,P().z-bz);if(d<14)C.steer(bx+(P().x-bx)/Math.max(0.1,d)*16,bz-16);else C.release();C.tick();continue;}
    const H=V.getHNH(),bundle=H.bundles.find(b=>!b.dead&&b.host===V.P);
    if(bundle){/* a bundle on our back: run to the Demolitionist and hit him with it */C.weapon();const d=Math.hypot(e.x-P().x,e.z-P().z);
      if(e.mesh&&e.mesh.visible&&d<18){if(d>2.2)C.steer(e.x,e.z);else{C.release();C.hit(e);}}else C.steer(P().x,P().z+3);C.tick();continue;}
    if(f.phase<3){
      /* keep every seat wired; then wait beside the riser of the station he is heading for */
      if(mode==='wire'){const s=A.st[wi%4];wire(s);wi++;if(wi>=4)mode='fight';C.tick();continue;}
      const tgt=e.tgt!=null?A.st[e.tgt|0]:A.st[0];
      if(!['windup','plunge','post','dazed','trace','snip','air','untangle','climb','run'].includes(e.st)){
        /* re-wire anything he snipped while we wait */
        const un=A.st.find(s=>V.getBlock(s.gap[0],s.gap[1],s.gap[2])!==B.PG_CORD);if(un&&C.has(B.PG_CORD)){wire(un);continue;}}
      const sx=tgt.c[0]+0.5+tgt.sx*2.6,sz=tgt.c[1]+0.5;                 /* outboard of the riser: no plates there */
      const near=Math.hypot(e.x-P().x,e.z-P().z);
      if((e.st==='dazed'||e.st==='trace'||e.st==='snip'||e.st==='untangle')&&near<6){C.weapon();if(near>2.0)C.steer(e.x,e.z);else{C.release();C.hit(e);}}
      else{C.release();V.MB.l=false;C.steer(sx,sz,true);}
      C.tick();continue;}
    /* P3: the Big One */
    const fuse=H.fuse;
    if(e.st==='splice'||e.st==='dazed'){C.weapon();const d=Math.hypot(e.x-P().x,e.z-P().z);if(d>2.0)C.steer(e.x,e.z);else{C.release();C.hit(e);}C.tick();continue;}
    if(fuse&&!fuse.stop&&!fuse.done&&fuse.i<A.fuse.length-8&&(e.st==='bomb')){const ci=Math.min(A.fuse.length-2,fuse.i+5),c=A.fuse[ci];
      const d=Math.hypot(c[0]+0.5-P().x,c[2]+0.5-P().z);if(d>2.4){C.steer(c[0]+0.5,c[2]+0.5+1.4);C.tick();continue;}
      C.release();C.break(c[0],c[1],c[2],[IT.PG_RSNIPS,IT.PG_SNIPS]);continue;}
    if(e.st==='bomb'&&(!fuse||fuse.done||fuse.i>=A.fuse.length-8)){/* the trapdoor */const lv=A.lever;const d=Math.hypot(lv[0]+0.5-P().x,lv[2]+0.5-P().z);
      if(d>2.2){C.steer(lv[0]+1.6,lv[2]-0.6);C.tick();continue;}const L=V.hnProp('bomber','lever');C.release();C.sel([IT.PG_RSNIPS,IT.PG_SNIPS]);if(L)C.hit(L,0.5);C.tick();continue;}
    C.release();const st=A.fuse[Math.min(A.fuse.length-1,6)];C.steer(st[0]+0.5,st[2]+0.5+1.6,true);C.tick();}
  C.release();C.tick(5);return !!MP().dead.bomber;}

/* ===================================================================== THE PIG */
function bigpig(V,pilot,opts){opts=opts||{};const C=ctl(V,pilot,opts),A=V.hnA(),IT=V.IT,P=()=>V.P,MP=()=>V.getMP();const t0=C.clock(),maxS=opts.maxS||600;
  const F=()=>V.getMPF().fight,E=()=>{const f=F();return f&&!f.over?f.e:null;};
  const start=()=>{if(!C.goTo(0.5,A.rope-1.4,0.5,90))return false;for(let k=0;k<40&&!F();k++){C.steer(0.5,A.rope+1.6,true);C.tick();}C.release();
    for(let k=0;k<200&&V.mpInfo().cut;k++){V.KEY.Space=k%4<2;C.tick();}V.KEY.Space=false;return !!F();};
  if(!start())return false;let worn=0;
  while(C.clock()-t0<maxS){const f=F(),e=E();if(MP().dead.bigpig)break;if(!f){C.tick();if(!MP().dead.bigpig)start();continue;}if(!e){C.tick();continue;}
    if(P().hp<9&&C.eat())continue;
    if(f.dying){C.release();C.steer(14,P().z,true);C.tick();continue;}
    const onPlat=V.hnPOnPlat(P().x,P().y,P().z);
    if(f.phase===1||!onPlat){/* climb the middle lane with the Foam Bat up: every pig that reaches us goes straight back up at her */
      if(!worn){worn=1;C.wear();}
      {const p=P();if(p.y<48.5&&p.z>A.stairZ0+8){const sx=(p.x>=0.5?1:-1)*11.5;   /* on the floor beside or behind the stair mass */
          if(Math.abs(p.x-0.5)<10.6)C.steer(sx,p.z);else C.steer(sx,A.stairZ0-2);C.tick();continue;}
        if(p.y<48.5&&Math.abs(p.x-(A.laneX[1]+0.5))>2.5){C.steer(A.laneX[1]+0.5,Math.min(p.z,A.stairZ0-1));C.tick();continue;}}   /* then to the foot of the middle lane */
      const lx=A.laneX[1]+0.5;C.steer(lx,128);const p=P(),ft=V.hnTreadTop(Math.floor(p.x),Math.floor(p.z+1.2));V.KEY.Space=p.onGround&&ft>=Math.floor(p.y);
      if(C.bat(['pig','hog','porkbomb','link'],[e.x,e.y+1.4,e.z]))V.KEY.ControlLeft=false;
      const lk=V.entities.find(m=>!m.dead&&m.mt==='pghog'&&Math.hypot(m.x-p.x,m.z-p.z)<2.6);if(lk){C.weapon();C.hit(lk);}
      C.tick();continue;}
    const d=Math.hypot(e.x-P().x,e.z-P().z);
    /* her charge, her Diva Toss lunge and her pose stop dead in front of a raised mirror */
    if(['chargeTell','tossTell','lunge','charge'].includes(e.st)&&d<8.5&&V.invCount(P().inv,IT.PG_VMIRROR)>0){C.release();C.sel(IT.PG_VMIRROR);C.look(e.x,e.y+1.4,e.z);V.MB.r=true;C.tick();continue;}
    V.MB.r=false;
    /* her CHOP line (0.9 s tell, 1.4 m wide): step sideways out of it, to whichever side stays on the platform */
    if(e.st==='chopTell'&&d<9){C.release();const p=P();p.yaw=Math.atan2(-(e.x-p.x),-(e.z-p.z));const rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw);
      if(V.hnPOnPlat(p.x+rx*2.5,64.1,p.z+rz*2.5))V.KEY.KeyD=true;else V.KEY.KeyA=true;C.tick();continue;}
    /* a fastball at us: Foam Bat it straight back at her */
    if(C.incoming(['pig','hog','porkbomb','link'],3.2)&&C.bat(['pig','hog','porkbomb','link'],[e.x,e.y+1.4,e.z])){C.tick();continue;}
    if(e.st==='smooch'||e.st==='lift'){V.MB.l=!V.MB.l;C.tick();continue;}                       /* four attack presses escape the lift */
    if(e.st==='admire'||e.st==='preen'||e.st==='chorusChop'||e.st==='lampStun'){C.weapon();if(d>2.0)C.steer(e.x,e.z);else{C.release();C.hit(e);}C.tick();continue;}
    if(e.st==='pose'){/* the Lamp Cleat on the right gantry pillar */const cl=V.hnProp('bigpig','cleat');if(cl){const cd=Math.hypot(cl.x-P().x,cl.z-P().z);
        if(cd>2.4){C.steer(7.2,136.5);C.tick();continue;}C.release();C.sel([IT.PG_RSNIPS,IT.PG_SNIPS,IT.PG_PSHEARS,IT.PG_CLIPPERS]);C.hit(cl,0.3);C.tick();continue;}}
    const L=V.getHNP().line;
    if(L&&!L.fallen&&L.tell<=0){/* hit the end pig of the kickline: dominoes */const end=L.pigs[0]&&!L.pigs[0].dead?L.pigs[0]:L.pigs[7];
      if(end){const ed=Math.hypot(end.x-P().x,end.z-P().z);C.weapon();if(ed>2.2)C.steer(end.x-1.6,end.z);else{C.release();C.hit(end,0.3);}C.tick();continue;}}
    /* otherwise keep a respectful 6 m off her (out of Chop range) with a mirror ready */
    C.release();V.MB.l=false;const ax=e.x+(P().x-e.x)/Math.max(0.1,d)*6,az=e.z+(P().z-e.z)/Math.max(0.1,d)*6;
    if(V.hnPOnPlat(ax,64.1,az))C.steer(ax,az,true);C.tick();}
  C.release();C.tick(5);return !!MP().dead.bigpig;}

/* ===================================================================== THE FROG */
function bigfrog(V,pilot,opts){opts=opts||{};const C=ctl(V,pilot,opts),A=V.hnA(),IT=V.IT,B=V.B,P=()=>V.P,MP=()=>V.getMP();const t0=C.clock(),maxS=opts.maxS||720;
  const F=()=>V.getMPF().fight,E=()=>{const f=F();return f&&!f.over?f.e:null;};
  const outer=A.pads.filter(p=>p.ring===20).sort((a,b)=>Math.hypot(a.x-0.5,a.z-190)-Math.hypot(b.x-0.5,b.z-190))[0];
  const start=()=>{if(!C.goTo(outer.x,outer.z,0.4,90))return false;for(let k=0;k<30&&!F();k++)C.tick();for(let k=0;k<200&&V.mpInfo().cut;k++){V.KEY.Space=k%4<2;C.tick();}V.KEY.Space=false;return !!F();};
  if(!start())return false;C.wear();
  const inner=A.pads.filter(p=>p.ring===8);let home=inner.slice().sort((a,b)=>Math.hypot(a.x-P().x,a.z-P().z)-Math.hypot(b.x-P().x,b.z-P().z))[0],nTongue=0,strafe=0,lastAim=null;
  while(C.clock()-t0<maxS){const f=F(),e=E();if(MP().dead.bigfrog||MP().strike)break;if(!f){C.tick();if(!MP().dead.bigfrog)start();continue;}if(!e){C.tick();continue;}
    if(P().hp<10&&C.eat())continue;
    const K=V.getHNK(),T=K.tg;
    if(K.swal){/* inside: walk up to the fingers and punch them */const fs=V.getHNS().props.bigfrog.filter(p=>!p.dead&&p.kind==='finger');const fg=fs[(C.frames>>3)%Math.max(1,fs.length)];
      if(fg){const d=Math.hypot(fg.x-P().x,fg.z-P().z);if(d>2.3){C.steer(fg.x,fg.z-1.4);}else{C.release();C.weapon();C.hit(fg,0.7);}}C.tick();continue;}
    if(f.dying){C.release();C.tick();continue;}
    if(f.phase>=3){/* drop into the hollow (tear the sheet under us with Shears) and hit the elbow */const el=K.elbowE;
      if(P().y>A.ky+0.5){const x=Math.floor(P().x),z=Math.floor(P().z);
        if(V.getBlock(x,A.ky,z)===B.PG_SHEET&&C.sel([IT.PG_RSNIPS,IT.PG_SNIPS,IT.PG_PSHEARS,IT.PG_CLIPPERS])){C.release();C.look(x+0.5,A.ky+0.5,z+0.5);V.MB.l=true;C.tick();continue;}
        const tx=el?el.x:6,tz=el?el.z:224;C.steer(tx+(tx>0?2:-2),tz,true);C.tick();continue;}
      if(el&&!el.dead){const d=Math.hypot(el.x-P().x,el.z-P().z);
        if(d>2.2){/* around the log island (a solid column r 3.2 at the centre) */const cx=A.kc[0]+0.5,cz=A.kc[1]+0.5,px=P().x,pz=P().z,vx=el.x-px,vz=el.z-pz,l2=vx*vx+vz*vz||1;
          const u=Math.max(0,Math.min(1,((cx-px)*vx+(cz-pz)*vz)/l2)),qx=px+vx*u,qz=pz+vz*u;
          if(Math.hypot(qx-cx,qz-cz)<5&&Math.hypot(px-cx,pz-cz)>4.5){const ax=px-cx,az=pz-cz,al=Math.hypot(ax,az)||1,side=(ax*vz-az*vx)>0?1:-1;
            const wx=cx+(ax/al)*6.2+(-az/al)*side*5,wz=cz+(az/al)*6.2+(ax/al)*side*5;C.steer(wx,wz);}else C.steer(el.x,el.z);}
        else{C.release();C.weapon();C.hit(el,0.6);}}else C.release();C.tick();continue;}
    if(T&&T.st==='reel'&&T.target===V.P){/* reeled: ride it in (the hand inside is the plan) */C.release();C.tick();continue;}
    if(P().y<A.ky-0.2&&P().y>A.kfloor&&opts.escape&&!(f.phase>=3)&&opts.escape()){C.tick();continue;}   /* PZ: the caller's path-finder climbs out (the speed-run's nav) */
    if(P().y<A.ky-0.2&&P().y>A.kfloor){/* fell into the Bog Hollow (a Daredevil tear, a sag): climb out by the nearest step stair */
      let best=null,bd=1e9;for(const sp of A.spokes){const c=sp[0],d=Math.hypot(c[0]+0.5-P().x,c[2]+0.5-P().z);if(d<bd){bd=d;best=sp;}}
      /* up the steps, then sideways off the top step onto the sheet (straight on is the rim and the Swamp's own sheet beyond) */
      const top=best[best.length-1],ux=A.kc[0]+0.5-(top[0]+0.5),uz=A.kc[1]+0.5-(top[2]+0.5),ul=Math.hypot(ux,uz)||1;
      const tgt=bd>1.2?best[0]:top,out=[top[0]+0.5-uz/ul*1.4,top[2]+0.5+ux/ul*1.4];   /* sideways off the top step onto the sheet */
      const onTop=P().y>=top[1]+0.9&&Math.hypot(top[0]+0.5-P().x,top[2]+0.5-P().z)<1.2;
      if(onTop){C.steer(out[0],out[1]);V.KEY.Space=P().onGround;}else if(bd>1.2&&P().y<A.kfloor+1.5)C.steer(tgt[0]+0.5,tgt[2]+0.5);
      else{const nx=best.find(c=>c[1]+1>P().y+0.4)||top;C.steer(nx[0]+0.5,nx[2]+0.5,true);V.KEY.Space=P().onGround;}C.tick();continue;}   /* step by step */
    if(T&&(T.st==='stuck'||T.st==='pinned')&&T.prop){/* the stuck tongue next to us: x3 */const d=Math.hypot(T.prop.x-P().x,T.prop.z-P().z);
      if(d<6){if(d>2.2)C.steer(T.prop.x,T.prop.z);else{C.release();C.weapon();C.hit(T.prop,0.1);}C.tick();continue;}}
    if(e.st==='trip'||e.st==='strain'||e.st==='stun'){const d=Math.hypot(e.x-P().x,e.z-P().z);if(d>2.2)C.steer(e.x,e.z);else{C.release();C.weapon();C.hit(e);}C.tick();continue;}
    /* stand on an inner-ring pad facing him; on every other aim line strafe so the tongue sticks beside us; otherwise let it take us in */
    if(T&&T.st==='aim'&&T!==lastAim){lastAim=T;nTongue++;strafe=(nTongue%2===0)?0.7:0;}
    if(strafe>0){strafe-=0.04;C.release();const p=P();p.yaw=Math.atan2(-(e.x-p.x),-(e.z-p.z));V.KEY.KeyA=true;V.KEY.ControlLeft=true;C.tick();continue;}
    const d=Math.hypot(home.x-P().x,home.z-P().z);if(d>0.5)C.steer(home.x,home.z,d<3);else{C.release();C.look(e.x,e.y+1.2,e.z);}
    C.tick();}
  C.release();C.tick(5);return !!MP().dead.bigfrog;}

module.exports={bomber,bigpig,bigfrog,ctl};
