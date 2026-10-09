/* ---- PART 55: p3_npcs.js ---- */
/* ===================================================================== */
/* PART 55 p3_npcs.js (P3, puppets): NPCs, the Old Goats, tomatoes and splats, the BOO barrage, the Cook,       */
/* the Professor and the bench Rats, the Weatherman (bible 7.2, 7.6, 9.3, 9.5, 12.3; plan 5.3)                                  */
/* ===================================================================== */
Object.assign(MOBT,{
  pgcook:   {hp:999,hw:0.32,h:2.2, spd:1.6,dmg:0,xp:0,pmob:1,npc:1,pnc:1,body:'#f6f6f2',legc:'#d8d4cc'},
  pgprof: {hp:999,hw:0.3, h:1.85,spd:1.0,dmg:0,xp:0,pmob:1,npc:1,pnc:1,body:'#f4f4f0',legc:'#3a3a46'},
  pgratb:    {hp:18, hw:0.26,h:1.75,spd:1.4,dmg:0,xp:0,pmob:1,npc:1,pnc:1,body:'#f4f4f0',legc:'#d8d0c0'},
  pgoldgoat:{hp:999,hw:0.36,h:1.4, spd:0,  dmg:0,xp:0,pmob:1,npc:1,pnc:1,body:'#3a3e52',legc:'#3a3e52'},
  pgoldergoat:{hp:999,hw:0.36,h:1.4, spd:0,  dmg:0,xp:0,pmob:1,npc:1,pnc:1,body:'#5a4a36',legc:'#5a4a36'},
  pgweather:   {hp:999,hw:0.3, h:2.0, spd:1.0,dmg:0,xp:0,pmob:1,npc:1,pnc:1,body:'#3a4a6a',legc:'#2a3248'}});
var PM_NPCK={bkr:'pgratb',prof:'pgprof',chef:'pgcook',oldgoat:'pgoldgoat',oldergoat:'pgoldergoat',news:'pgweather'};

/* ===================================================================== */
/* poses (P2 drives the bench demos through pmNpcPose; any P3 entity can hold one)                                          */
/* ===================================================================== */
var PM_POSE_DUR={zap:1.2,stapled:6,flattened:1.5,catch:1.2,bitten:1.6,slip:1.6,admire:3,limp:30,walkin:null,bolt:40,nod:1.2,tip:8,applaud:30};
var PM_POSE_FREEZE={zap:1,stapled:1,flattened:1,catch:1,bitten:1,slip:1,admire:1,limp:1,nod:0,tip:1,applaud:1};
function pmNpcPose(e,pose,dur){if(!e||e.dead||!pose)return false;if(!e.pi)pmInit(e);
  if(e.pose&&e.pose.k==='applaud'&&pose==='nod')return true;          /* already on their feet at the doors */
  if(e.pose)pmPoseEnd(e);e.pose={k:pose,t:0,dur:dur!=null?dur:PM_POSE_DUR[pose]};
  if(pose==='zap'){e.singe=(e.singe||0)+1;pmSinge(e);mwS('pg_spark',e.x,e.y+1.6,e.z);}
  if(pose==='stapled'||pose==='bitten'||pose==='bolt')mwS('pg_alarm',e.x,e.y,e.z);
  if(pose==='flattened')mwS('pg_thump',e.x,e.y,e.z);
  if(pose==='bolt'){e.boltT=0;e.carried=false;}
  pmLog(e,'pose:'+pose);return true;}
function pmPoseEnd(e){const p=e.pose;e.pose=null;const pr=e.pr;if(!pr||!pr.root)return;
  pr.root.position.set(0,0,0);pr.root.rotation.set(0,0,0);const s=pr.sc||1;pr.root.scale.set(s,s,s);
  if(pr.armL)pr.armL.rotation.set(0,0,0);if(pr.armR)pr.armR.rotation.set(0,0,0);if(pr.head)pr.head.rotation.set(0,0,0);
  if(p&&p.k==='bolt')e.carried=false;}
/* the Lab Rat's hair singes a little more with every zap (a visible build-up that stays) */
function pmSinge(e){const h=e.pr&&e.pr.hair;if(!h)return;const k=Math.max(0.25,1-e.singe*0.15);
  for(const c of h.children){c.scale.y=Math.max(0.04,c.scale.y*0.86);const m=c.material;if(m&&m.color&&m.color.setRGB)m.color.setRGB(0.91*k,0.45*k,0.16*k);}}
/* returns true when the pose took the whole frame (the brain returns) */
function pmPoseTick(e,dt){const p=e.pose;p.t+=dt;if(p.dur!=null&&p.t>=p.dur){pmPoseEnd(e);return false;}
  const pr=e.pr,R=pr&&pr.root;
  if(p.k==='walkin'){const q=pmPostOf(e);if(!q){pmPoseEnd(e);return false;}const dx=q[0]-e.x,dz=q[2]-e.z,d=Math.hypot(dx,dz);
    const dy=Math.abs(q[1]-e.y);if(d<0.6&&dy<1.5){pmPoseEnd(e);return false;}
    /* "walks in within 5 s": a trench, a mesa or soup in the way never strands him: past 5 s (or 1.5 s without progress) he scurries
       the rest of the way out of sight and pops up at his post; so does arriving under or over it (a raised floor, a pit) */
    if(p.bd==null||d<p.bd-0.25){p.bd=d;p.bt=p.t;}
    if(p.t>5||(p.t-p.bt>1.5&&p.t>1)||d<0.6){e.x=q[0];e.z=q[2];e.y=mpSafeY(q[0],q[1]+0.5,q[2]);e.vx=e.vy=e.vz=0;burstParticles(e.x,e.y+0.4,e.z,B.PG_LINO,8,0.6);
      mwS('pg_alarm',e.x,e.y,e.z);pmLog(e,'walkin-pop');pmPoseEnd(e);pmPost(e,dt,{});return true;}
    pmWalk(e,dt,dx/d,dz/d,2.6);pmTurn(e,dx,dz,dt,8);pmPost(e,dt,{});return true;}
  if(p.k==='bolt'||p.k==='tip')return false;                       /* the bench Lab Rat's / the balcony's own brains run these */
  if(!PM_POSE_FREEZE[p.k]&&p.k!=='nod')return false;
  const u=p.t;
  if(R){if(p.k==='zap'){R.position.x=Math.sin(u*90)*0.04;if(pr.armL){pr.armL.rotation.z=-1.3;pr.armR.rotation.z=1.3;}}
    else if(p.k==='stapled'){R.position.set(0,0.35,-0.3);if(pr.armL){pr.armL.rotation.x=-2.8;pr.armR.rotation.x=-2.8;}}
    else if(p.k==='flattened'){const s=pr.sc||1;R.scale.set(1.35*s,0.12*s,1.35*s);}
    else if(p.k==='catch'){if(pr.armL){pr.armL.rotation.x=-1.6;pr.armR.rotation.x=-1.6;}}
    else if(p.k==='bitten'){R.position.y=Math.abs(Math.sin(u*14))*0.35;if(pr.armL){pr.armL.rotation.x=-2+Math.sin(u*25);pr.armR.rotation.x=-2-Math.sin(u*25);}}
    else if(p.k==='slip'){const k=u<0.25?u/0.25:(p.dur-u<0.4?(p.dur-u)/0.4:1);R.rotation.x=-1.45*k;}
    else if(p.k==='limp'){R.rotation.x=0.35;if(pr.armL){pr.armL.rotation.x=0.2;pr.armR.rotation.x=0.2;}if(pr.head)pr.head.rotation.x=0.7;}
    else if(p.k==='nod'){if(pr.head)pr.head.rotation.x=Math.sin(u*9)*0.3;}
    else if(p.k==='applaud'){if(pr.armL){pr.armL.rotation.x=-1.3;pr.armR.rotation.x=-1.3;pr.armL.rotation.z=-0.5+Math.abs(Math.sin(u*14))*0.5;pr.armR.rotation.z=0.5-Math.abs(Math.sin(u*14))*0.5;}}}
  if(p.k==='nod')return false;
  e.vx*=0.5;e.vz*=0.5;e.vy-=GRAV*dt;if(!e.pfix)moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);
  pmPost(e,dt,{jaw:p.k==='stapled'||p.k==='bitten'?0.5+0.5*Math.abs(Math.sin(u*16)):0.1,legs:false,noBob:1,
    hr:{pinned:p.k==='stapled'?1:0,empty:p.k==='limp'?1:0,burn:p.k==='zap'?1:0,zap:p.k==='zap'?1:0,panic:0,admire:p.k==='admire'?1:0}});
  return true;}
/* where an NPC stands: e.post, else beside the bench P2 gave it (e.pbench), on the side it came from */
function pmPostOf(e){if(e.post)return e.post;const b=e.pbench;if(!b)return null;const cx=b[0]+0.5,cz=b[2]+0.5;let dx=e.x-cx,dz=e.z-cz;const d=Math.hypot(dx,dz)||1;
  if(Math.abs(dx)>Math.abs(dz)){dx=Math.sign(dx);dz=0;}else{dz=Math.sign(dz)||1;dx=0;}e.post=[cx+dx*1.2,b[1],cz+dz*1.2];return e.post;}
function pmNpcFind(kind,near){const mt=PM_NPCK[kind]||kind;let best=null,bd=1e9;
  const nx=near?(Array.isArray(near)?near[0]:near.x):null,nz=near?(Array.isArray(near)?near[2]:near.z):null;
  for(const e of entities){if(e.dead||e.t!=='mob'||e.mt!==mt)continue;if(nx==null)return e;const d=Math.hypot(e.x-nx,e.z-nz);if(d<bd){bd=d;best=e;}}
  return best;}
/* spawn an NPC (P2: bench Rats): opt={post,from,killable,fix} */
function pmNpcSpawn(kind,x,y,z,opt){opt=opt||{};const mt=PM_NPCK[kind]||kind;if(!MOBT[mt])return null;
  const f=opt.from;spawnMob(mt,f?f[0]:x,f?f[1]:y,f?f[2]:z);const e=entities[entities.length-1];if(!e.pi)pmInit(e);
  e.post=opt.post||[x,y,z];if(opt.killable){e.pkill=1;e.hp=MOBT[mt].hp;}if(opt.fix)e.pfix=1;if(opt.yaw!=null)e.yaw=opt.yaw;
  if(f)pmNpcPose(e,'walkin');return e;}

/* ===================================================================== */
/* tomatoes: the balcony's, the Comic's barrage, the BOO, and the hint splat                                                    */
/* ===================================================================== */
PREG.proj.tomato={mesh:e=>pmPoolGet('tomato'),free:m=>pmPoolPut('tomato',m),r:0.36,life:6,
  hit:(f,t)=>{if(f.splat){pmSplatAttach(f);return true;}
    if(t.t==='mob'&&!t.bot){if(!f.batted)return false;
      if(t.mt==='pgoldgoat'||t.mt==='pgoldergoat'){pmTipOver(t,f.owner||'Dan');return true;}
      purgHit(t,1,f.owner||'Dan','tomato',{kx:f.vx,kz:f.vz});pmTomatoDrop(f,null);return true;}
    if(f.batted)return false;
    if(f.dmg>0)purgHit(t,f.dmg,f.owner||'the Old Goats','tomato',{kx:f.vx,kz:f.vz});
    if(t===P)pmScreenSplat();burstParticles(f.x,f.y,f.z,B.PG_PINS,6,0.5);mwS('pg_splat',f.x,f.y,f.z);
    pmTomatoDrop(f,t);return true;},
  land:(f)=>{if(f.splat){pmSplatAttach(f);return true;}burstParticles(f.x,f.y,f.z,B.PG_PINS,5,0.4);mwS('pg_splat',f.x,f.y,f.z);pmTomatoDrop(f,null);return true;}};
function pmTomatoDrop(f,t){if(f.food===false||f.dropped)return;f.dropped=1;
  const own=t===P?'Dan':(t&&t.A?t.A.name:(f.forWho||null));mpDrop(f.x-(f.vx||0)*0.03,f.y+0.2,f.z-(f.vz||0)*0.03,{id:IT.PG_TOMATO,count:1},own,0,1.5,0);}
function pmPos(to){if(!to)return null;if(Array.isArray(to))return to;return [to.x,to.y+(to===P?1.0:(to.h||1)*0.6),to.z];}
/* lob a Heckle Tomato from (x,y,z) to `to` (P, a body/mob or [x,y,z]); opt={dmg,food,owner,T,splat} */
function pmTomatoLob(x,y,z,to,opt){opt=opt||{};const q=pmPos(to);if(!q)return null;const d=Math.hypot(q[0]-x,q[2]-z);
  const T=opt.T||clamp(d/16,0.7,1.8),v=aimLob(x,y,z,q[0],q[1],q[2],T);
  const f=puSpawn('tomato',x,y,z,v[0],v[1],v[2],opt.owner||'the Old Goats',{dmg:opt.dmg||0,food:opt.food!==false,splat:opt.splat||null,
    forWho:to===P?'Dan':(to&&to.A?to.A.name:null),life:T+3});
  return f;}
/* out of the dark above the target (the balcony's lob; the Comic's barrage); delay in seconds of MP.clock */
function pmTomatoFromDark(to,opt){opt=opt||{};if(opt.delay>0){PMS.tomBuf.push({t:MP.clock+opt.delay,to,opt:Object.assign({},opt,{delay:0})});return null;}
  const q=pmPos(to);if(!q)return null;const a=(PMS.seq++)*1.7;
  return pmTomatoLob(q[0]+Math.sin(a)*3,q[1]+13,q[2]+Math.cos(a)*3,to,Object.assign({T:1.15},opt));}
function pmScreenSplat(){const el=$('psplat');if(!el||!el.style)return;
  if(!el._pm){el._pm=1;el.style.background='radial-gradient(circle at 6% 12%,rgba(200,26,18,.85) 0,rgba(200,26,18,.85) 6%,rgba(0,0,0,0) 14%),'+
    'radial-gradient(circle at 94% 80%,rgba(212,42,30,.8) 0,rgba(212,42,30,.8) 5%,rgba(0,0,0,0) 12%),radial-gradient(circle at 12% 88%,rgba(190,20,14,.7) 0,rgba(0,0,0,0) 9%)';}
  el.style.display='block';PMS.splatT=1.0;}
/* the hint splat: a tomato out of the dark onto the counter target; the red decal stays until cleared or the target dies */
function pmSplat(target){if(!target||DIM!=='puppet')return -1;const id=++PMS.seq;const q=pmPos(target);if(!q)return -1;
  const f=pmTomatoLob(q[0]-5,q[1]+14,q[2]-6,target,{T:1.2,food:false,splat:{target,id}});
  PMS.splats.push({id,target,G:null,f});pmLog({pid:0,mt:'splat'},'splat');return id;}
function pmSplatAttach(f){const S=f.splat,rec=PMS.splats.find(s=>s.id===S.id);if(!rec||rec.G)return;const t=S.target,G=pmProp('splat');
  if(t&&t.t==='mob'&&t.mesh&&!t.dead){G.scale.set(0.6,1,0.6);G.position.set(0,(t.h||1)+0.03,0);t.mesh.add(G);rec.parent=t.mesh;}
  else{const q=Array.isArray(t)?{x:t[0],y:t[1],z:t[2]}:t;G.position.set(Math.floor(q.x)+0.5,Math.floor(q.y)+1.03,Math.floor(q.z)+0.5);pmAdd(G);rec.parent=scene;}
  rec.G=G;mwS('pg_splat',f.x,f.y,f.z);}
function pmSplatClear(id){for(let i=PMS.splats.length-1;i>=0;i--){const s=PMS.splats[i];if(id!=null&&s.id!==id)continue;
    if(s.G&&s.parent){if(s.parent===scene)pmDel(s.G);else s.parent.remove(s.G);}if(s.f&&!s.f.dead)puRemove(s.f);PMS.splats.splice(i,1);}}
/* the BOO: 5 s of 3 Heckle Tomatoes a second from seats within 30 m, 2 damage each, each landing as food */
function pmBooBarrage(x,z){if(DIM!=='puppet')return false;if(PMS.boo&&PMS.boo.t>0)return false;PMS.boo={t:5,x,z,acc:0,n:0};mwS('pg_boo',x,deckY(z)+2,z);pmLog({pid:0,mt:'boo'},'boo');return true;}
function pmBooTick(dt){const b=PMS.boo;if(!b||b.t<=0)return;b.t-=dt;b.acc+=dt;const H=MPC.HOUSE;
  while(b.acc>=1/3&&b.t>-0.01){b.acc-=1/3;b.n++;let tg=null,td=40;
    const cand=[P].concat(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE?AGENTS.filter(a=>a.e&&!a.dead&&a.online&&a.dim==='puppet').map(a=>a.e):[]);
    for(const c of cand){if(!c||c.dead||(c===P&&P.dead))continue;const d=Math.hypot(c.x-b.x,c.z-b.z);if(d<td){td=d;tg=c;}}
    const a=b.n*2.39,r=6+(b.n*7)%24,sx=clamp(Math.floor(b.x+Math.sin(a)*r),H.x0,H.x1),sz=clamp(Math.floor(b.z+Math.cos(a)*r),H.z0,H.z1);
    const sy=pmSurfY(sx,sz)+1.2;
    pmTomatoLob(sx+0.5,sy,sz+0.5,tg||[b.x,deckY(b.z)+1,b.z],{dmg:2,owner:'The House'});}
  if(b.t<=0)PMS.boo=null;}

/* ===================================================================== */
/* the Old Goats: hints with a body                                                                                    */
/* ===================================================================== */
var PM_HECK={
  bomber_plate:['He stood on the lit wire.','Cut it. Baa-ha-ha.'], bomber_hint:['The Demolitionist never checks his own seat.','One wire. Close the gap.'],
  bundle:['He held onto it.','Hit somebody. Anybody.'], bigone:['He let it burn all the way down.','Pull the lever. Baa-ha-ha.'],
  bigpig_pig:['He dodged the pig.','CATCH the pig.'], bigpig_charge_hint:['She stops for every mirror.','He didn\'t bring one.'],
  toss:['She threw him.','Hold a mirror up. Baa-ha-ha.'], chop:['She slammed him.','Five steps back. Baa-ha-ha.'],
  pose_hint:['She posed and he watched.','Drop the lamp.'], tongue:['The frog ate him.','Bring scissors.'],
  swallow_hint:['Two staples.','TWO!'], arm:['He\'s hitting the frog.','Hit the elbow.'],
  hands:['He stood in the light.','Get under something.'], feltdan:['He lost to himself.','Baa-ha-ha.'],
  chef:['He went behind the counter.','Never behind the counter.'], flat:['He knocked out the last brace.','Stand behind it next time.'],
  yeti:['He hit the face.','Hit the shoes.'], animal:['He walked right up to him.','The chain ends. Stand there.'],
  other:['He died.','Baa-ha-ha.']};
var PM_EMBARRASS={fall:1,volley:1,bin:1,swallowed:1,thrown:1,chopped:1,flattened:1,boo:1,death:1};
/* P4's 2nd/4th-death hint (pmHeckle('hint',{boss,phase,deaths,target})): the pair that names the fix for that phase */
var PM_HINT={bomber:['bomber_hint','bomber_hint','bigone'],bigpig:['bigpig_pig','bigpig_charge_hint','pose_hint'],bigfrog:['swallow_hint','swallow_hint','arm']};
/* which heckle a death gets: by the hit's how-keyword, then by the killer's name; 2nd/4th deaths to a headliner get the hint pair.
   A killer is recognised by its display name (HN_NAMES for headliners, PM_NAMES for the rest), never by a literal name, so
   renaming the cast never needs this function changed. */
function pmIsHn(b,mt){const n=(typeof HN_NAMES!=='undefined'&&HN_NAMES&&HN_NAMES[mt])||(typeof PM_NAMES!=='undefined'&&PM_NAMES&&PM_NAMES[mt]);
  return !!n&&!!b&&b.indexOf(String(n).toLowerCase())>=0;}
function pmDeathKind(by,how,n,blk){const h=(how||'').replace(/^pg:/,'').toLowerCase(),b=(by||'').toLowerCase(),hint=n===2||n===4;
  const has=(...k)=>k.some(w=>h.indexOf(w)>=0);
  if(h==='broom'||h==='wall'||h==='strike')return 'other';
  if(pmIsHn(b,'pgbomber')){if(has('bundle'))return 'bundle';if(has('bigone','big one','big'))return 'bigone';return hint?'bomber_hint':'bomber_plate';}
  if(pmIsHn(b,'pgbigpig')){if(has('toss','throw'))return 'toss';if(has('chop','chopglove','karate','slap'))return 'chop';
    if(has('pose','lamp'))return hint?'pose_hint':'other';if(has('charge'))return hint?'bigpig_charge_hint':'other';if(has('kick'))return 'other';return 'bigpig_pig';}
  if(pmIsHn(b,'pgbigfrog')){if(has('arm','elbow','sweep','slam','drag','bump'))return 'arm';if(has('swallow','finger','inside'))return hint?'swallow_hint':'tongue';
    if(has('strum','sandbag','traveler','flail'))return 'other';return 'tongue';}
  if(has('flat','topple'))return 'flat';
  if(b==='the hands'||b==='possessed hollow'||has('hand','possessed'))return 'hands';
  if(b==='felt dan'||has('feltdan'))return 'feltdan';if(pmIsHn(b,'pgcook')||has('chef','cleaver','stew','grab','ladle'))return 'chef';
  if(pmIsHn(b,'pgyeti')||has('yeti'))return 'yeti';if(pmIsHn(b,'pgdrummer')||has('animal','drummer'))return 'animal';
  if(blk&&b&&PM_NAMES.pghand&&Object.values(PM_NAMES).some(nm=>nm.toLowerCase()===b))return 'hands';
  return 'other';}
function pmForName(line,name){if(!name||name==='Dan')return line;
  return line.replace(/^He's /,name+' is ').replace(/^He /,name+' ').replace(/\bhim\b/,name);}
/* pmHeckle(kind,opts): opts={who:'Dan'|botName, n} -> the balcony speaks (death kinds) or lobs a tomato (embarrassments) */
function pmHeckle(kind,opts){opts=opts||{};if(DIM!=='puppet')return false;
  if(kind==='applaud'){pmSWApplaud(true);return true;}               /* the Strike's doors (P4): they stand and applaud, quiet or not */
  if(MP.quiet>MP.clock)return false;const who=opts.who||'Dan';
  if(kind==='hint'){const H=PM_HINT[opts.boss]||PM_HINT.bomber;kind=H[clamp((opts.phase|0)-1,0,2)];
    if(MP.clock-(PMS.deathSaidAt||-99)<3.5)return false;PMS.hintAt=MP.clock;}
  if(PM_EMBARRASS[kind]){const t=who==='Dan'?P:((agByName(who)||{}).e||null);if(!t||(t===P&&P.dead))return false;
    if(PMS.tomCool&&PMS.tomCool[who]>MP.clock)return false;(PMS.tomCool||(PMS.tomCool={}))[who]=MP.clock+2.5;
    pmTomatoFromDark(t,{dmg:0,food:true,delay:opts.delay||0.3});pmLog({pid:0,mt:'balcony'},'tomato:'+kind);return true;}
  if(!PM_HECK[kind])return false;const L=PM_HECK[kind];pmSayPair(pmForName(L[0],who),pmForName(L[1],who));pmLog({pid:0,mt:'balcony'},'heckle:'+kind);
  if(opts.death)PMS.deathSaidAt=MP.clock;return true;}
function pmHeckleSoon(kind,who){pmHeckle(kind,{who:who||'Dan',delay:0.9});}
function pmSayPair(a,b){PMS.sayQ.push({n:'OLD GOAT',t:a,d:2.3,mt:'pgoldgoat'},{n:'OLDER GOAT',t:b,d:2.6,mt:'pgoldergoat',laugh:1});}
function pmSayTick(dt){if(PMS.sayT>0){PMS.sayT-=dt;return;}if(!PMS.sayQ.length||CUT.on)return;const s=PMS.sayQ.shift();
  if(MP.quiet>MP.clock){PMS.sayQ.length=0;return;}
  mpSay(s.n,s.t,s.d);PMS.sayT=s.d;try{chatPush({k:'chat',from:'[BALCONY] '+mpCap(s.n.toLowerCase()),txt:s.t});}catch(err){}
  const e=pmNpcFind(s.mt,null);if(e)e.talkT=s.d*0.85;if(s.laugh)mwS('pg_laugh',P?P.x:0,P?P.y:0,P?P.z:0);}
/* knocked over backwards in his seat, legs in the air; the box goes quiet for 3 minutes */
function pmTipOver(e,by){if(!e||e.dead)return;if(e.pose&&e.pose.k==='tip'&&e.pose.t<6)return;
  pmNpcPose(e,'tip',8);MP.quiet=MP.clock+180;PMS.sayQ.length=0;mwS('pg_tipover',e.x,e.y,e.z);burstParticles(e.x,e.y+1,e.z,B.PG_VELVET,8,0.6);pmLog(e,'tip');}
PREG.npcHit.pgoldgoat=(e,dmg,by)=>pmTipOver(e,by);
PREG.npcHit.pgoldergoat=(e,dmg,by)=>pmTipOver(e,by);
function pmSWBrain(e,dt,T){e.pfix=1;if(e.seatAt){e.x=e.seatAt[0];e.y=e.seatAt[1];e.z=e.seatAt[2];}e.vx=e.vy=e.vz=0;
  if(pmPre(e,dt))return;const pr=e.pr;
  let look=null;if(P)look=[P.x,P.y+1.4,P.z];
  if(e.pose&&e.pose.k==='tip'){const u=e.pose.t,k=u<0.3?u/0.3:(e.pose.dur-u<1?(e.pose.dur-u):1);if(pr&&pr.seat){pr.seat.rotation.x=-1.45*k;}
    if(pr&&pr.legsG)pr.legsG.rotation.x=-0.6*k;pmPost(e,dt,{look:null,jaw:k<1?0.6*Math.abs(Math.sin(u*10)):0,legs:false,noBob:1});return;}
  if(pr&&pr.seat)pr.seat.rotation.x=0;
  const talk=e.talkT>0;if(talk)e.talkT-=dt;
  if(look){const dx=look[0]-e.x,dz=look[2]-e.z;if(pr&&pr.head){const want=clamp(((Math.atan2(dx,dz)-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI,-0.9,0.9);pr.head.rotation.y+=(want-pr.head.rotation.y)*Math.min(1,dt*3);}}
  pmPost(e,dt,{look,jaw:talk?0.2+0.6*Math.abs(Math.sin(MP.clock*11)):0,legs:false,noBob:1});}
PREG.brain.pgoldgoat=pmSWBrain;PREG.brain.pgoldergoat=pmSWBrain;
/* their seats in the box (MPC.BOX_SW), facing the apron */
function pmSWSeats(){const b=MPC.BOX_SW,yw=Math.atan2(0-b[0],-175-b[2]);return [[b[0]-0.9,b[1],b[2],yw],[b[0]+0.9,b[1],b[2],yw]];}
/* the Strike: both stand at the EXIT doors and applaud (P4 calls pmSWApplaud(true) when the bell goes) */
function pmSWApplaud(on){for(const e of entities){if(e.dead||e.t!=='mob'||(e.mt!=='pgoldgoat'&&e.mt!=='pgoldergoat'))continue;const mt=e.mt;
  if(on){const E=MPC.EXIT,s=mt==='pgoldgoat'?-1:1;e.seatAt=[E.x0-1.5+(s>0?E.x1-E.x0+3:0),E.y0,E.z+2.5];e.yaw=0;pmNpcPose(e,'applaud',60);}
  else{const S=pmSWSeats()[mt==='pgoldgoat'?0:1];e.seatAt=[S[0],S[1],S[2]];e.yaw=S[3];if(e.pose&&e.pose.k==='applaud')pmPoseEnd(e);}}}

/* ===================================================================== */
/* the Cook: cooking with no UI (bible 7.6)                                                                          */
/* ===================================================================== */
var PM_COOK={};PM_COOK[IT.PG_RCHICK]=[IT.PG_ROAST,2,1];PM_COOK[IT.PG_STUFF]=[IT.PG_MEATBALL,2,4];PM_COOK[IT.PG_DOUGHBALL]=[IT.PG_FLATBREAD,2,1];
PM_COOK[IT.PG_HAM]=[IT.PG_GLAZED,2,1];PM_COOK[IT.PG_FISH]=[IT.PG_GRILLED,2,1];PM_COOK[IT.PG_LIVECHICK]=[IT.PG_ROAST,3,1];
/* the kitchen layout: from P1's spots, or opt.k (tests) */
function pmChefLayout(e){if(e.k)return e.k;const g=n=>pmSpots(n);
  const k={post:e.post||[e.x,e.y,e.z],counter:g('counter'),pot:g('stockpot'),mesa:g('mesaTop'),hut:null};try{k.hut=mwKitchenHut();}catch(err){}
  return (e.k=pmChefPrep(k));}
function pmChefPrep(k){k.cset=new Set((k.counter||[]).map(c=>Math.floor(c[0])+','+Math.floor(c[2])));k.mset=new Set((k.mesa||[]).map(c=>Math.floor(c[0])+','+Math.floor(c[2])));
  const C=k.counter||[];let cx=0,cz=0;for(const c of C){cx+=c[0]+0.5;cz+=c[2]+0.5;}if(C.length){cx/=C.length;cz/=C.length;}else{cx=k.post[0];cz=k.post[2]+1.5;}
  k.cc=[cx,C.length?C[0][1]:k.post[1],cz];const dx=cx-k.post[0],dz=cz-k.post[2],d=Math.hypot(dx,dz)||1;k.out=[dx/d,dz/d];   /* from the cook out across the counter */
  k.front=[cx+k.out[0]*1.6,k.cc[1]+1.05,cz+k.out[1]*1.6];return k;}
function pmChefSide(k,x,z){return (x-k.cc[0])*k.out[0]+(z-k.cc[2])*k.out[1];}        /* >0 customer side, <0 his kitchen */
/* the cleaver arc: 1.6 m in front of the counter line, along the counter (slack widens it for the swing itself) */
function pmCleaverZone(k,t,slack){const s=pmChefSide(k,t.x,t.z),lat=Math.abs((t.x-k.cc[0])*k.out[1]-(t.z-k.cc[2])*k.out[0]),half=Math.max(1.5,((k.counter||[]).length)*0.5+0.5);
  return s>0.2&&s<1.6+(slack||0)+0.3&&lat<half+(slack||0)&&Math.abs(t.y-k.cc[1])<2.5;}
function pmInHut(k,x,y,z){const h=k.hut;if(!h)return Math.hypot(x-k.post[0],z-k.post[2])<4.5;return x>=h.x0&&x<=h.x1+1&&z>=h.z0&&z<=h.z1+1&&(h.y0==null||(y>=h.y0-1&&y<=(h.y1||h.y0+4)+1));}
function pmInPot(k,x,y,z){const p=k.pot;if(!p||!p.length)return false;const fx=Math.floor(x),fz=Math.floor(z);   /* p[0] is the inside step: the way out */
  for(let i=p.length>1?1:0;i<p.length;i++){const c=p[i];if(c[0]===fx&&c[2]===fz&&y>c[1]-0.6&&y<c[1]+1.2)return true;}return false;}
function pmPlayersNear(x,z,r){const out=[];if(P&&!P.dead&&P.mode!=='c'&&Math.hypot(P.x-x,P.z-z)<r)out.push(P);
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS){const b=a.e;if(b&&!b.dead&&!a.dead&&a.online&&a.dim===DIM&&Math.hypot(b.x-x,b.z-z)<r)out.push(b);}return out;}
function pmArcDrop(x,y,z,to,st,owner,T){const q=pmPos(to)||[x,y,z];T=T||1.0;const a=(PMS.seq++)*2.1,ox=Math.sin(a)*0.9,oz=Math.cos(a)*0.9;
  const dx=q[0]+ox-x,dz=q[2]+oz-z,dy=(q[1]-0.6)-y,fac=(1-Math.exp(-0.6*T))/0.6;
  return mpDrop(x,y,z,st,owner,dx/fac,(dy+0.35*GRAV*T*T)/T,dz/fac);}
PREG.brain.pgcook=function(e,dt,T){if(pmPre(e,dt))return;const k=pmChefLayout(e),pr=e.pr,post=k.post;let mx=0,mz=0,spd=2.2,look=null,lock=false,jaw=0.05;
  if(!e.cook)e.cook=[];e.cleCD=Math.max(0,(e.cleCD||0)-dt);
  if(pr&&pr.ladle)pr.ladle.visible=!!e.ladleT;if(e.ladleT>0)e.ladleT=Math.max(0,e.ladleT-dt);
  /* the pale arm yanking him back behind the counter */
  if(e.yank){const Y=e.yank;Y.t+=dt;const u=clamp(Y.t/0.6,0,1);e.x=Y.x0+(post[0]-Y.x0)*u;e.z=Y.z0+(post[2]-Y.z0)*u;e.y=Y.y0+(post[1]-Y.y0)*u+Math.sin(u*Math.PI)*1.2;
    if(Y.arm){const A=Y.arm.userData.arm;Y.arm.position.set(k.cc[0],k.cc[1]+0.5-u*0.3,k.cc[2]);if(A)pmArmPose(A,0,0,0,(e.x-k.cc[0])*0.6,1.6,(e.z-k.cc[2])*0.6,false);}
    if(Y.t>=0.9){if(Y.arm)pmDel(Y.arm);e.yank=null;e.x=post[0];e.z=post[2];e.y=post[1];if(Y.then)e.cook.push(Y.then);}
    pmPost(e,dt,{jaw:0.8,legs:false,hr:{yank:1}});return;}
  /* the live-chicken chase: he vaults the counter and chases it across the mesa for up to 8 s, cleaver swinging */
  if(e.chase){const C=e.chase,h=C.hen;C.t+=dt;
    if(!h||h.dead||C.t>8||Math.hypot(h.x-e.x,h.z-e.z)<0.9){if(h&&!h.dead){h.pnodrop=1;removeEnt(h);}
      e.chase=null;e.yank={t:0,x0:e.x,y0:e.y,z0:e.z,arm:pmProp('kitchenArm'),then:{id:IT.PG_LIVECHICK,n:1,to:C.to,out:[IT.PG_ROAST,3]}};pmAdd(e.yank.arm);
      mwS('pg_chatter',e.x,e.y,e.z);pmLog(e,'yank');pmPost(e,dt,{});return;}
    const dx=h.x-e.x,dz=h.z-e.z,d=Math.hypot(dx,dz)||1;mx=dx/d;mz=dz/d;spd=4.6;look=[h.x,h.y,h.z];jaw=0.5+0.5*Math.abs(Math.sin(MP.clock*12));
    if(k.mset.size&&!k.mset.has(Math.floor(e.x+mx*0.8)+','+Math.floor(e.z+mz*0.8))&&!k.cset.has(Math.floor(e.x+mx*0.8)+','+Math.floor(e.z+mz*0.8)))mx=mz=0;
    if(pr&&pr.armR)pr.armR.rotation.x=-1.6+Math.sin(MP.clock*16)*1.2;
    for(const t of pmPlayersNear(e.x,e.z,1.4))pmChefCut(e,t,4,'cleaver');
    for(const m of entities)if(m!==e&&m!==h&&!m.dead&&m.t==='mob'&&!m.bot&&MOBT[m.mt]&&!MOBT[m.mt].npc&&!MOBT[m.mt].prop&&Math.hypot(m.x-e.x,m.z-e.z)<1.3)pmChefCut(e,m,4,'cleaver');
    pmWalk(e,dt,mx,mz,spd,{hopV:8.6});pmTurn(e,mx,mz,dt,10);pmPost(e,dt,{look,jaw,hr:{chop:1,vault:C.t<0.5?1:0,stir:0,yank:0,talk:1,tool:0}});return;}
  /* THE GRAB: anyone behind the counter for 1.5 s goes into the stock pot */
  const behind=pmPlayersNear(post[0],post[2],5).filter(t=>pmInHut(k,t.x,t.y,t.z)&&pmChefSide(k,t.x,t.z)<0.2&&!pmInPot(k,t.x,t.y,t.z));
  for(const t of behind){t.pchefT=(t.pchefT||0)+dt;if(t.pchefT>=1.5){t.pchefT=0;pmChefGrab(e,k,t);}}
  if(!behind.length)for(const t of pmPlayersNear(post[0],post[2],8))t.pchefT=0;
  /* the stock pot: 1 a second in the soup; after 4 s the ladle slaps you out onto the counter */
  for(const t of pmPlayersNear(k.cc[0],k.cc[2],9)){if(pmInPot(k,t.x,t.y,t.z)){t.ppotT=(t.ppotT||0)+dt;t.ppotA=(t.ppotA||0)+dt;
      if(t.ppotA>=1){t.ppotA-=1;purgHit(t,1,'the Cook','stew',{});}
      if(t.ppotT>=4){t.ppotT=0;t.ppotA=0;e.ladleT=0.8;mwS('pg_ladle',t.x,t.y,t.z);mpSay('THE COOK','Out!',1.4);
        const f=k.front,v=aimLob(t.x,t.y,t.z,f[0],f[1],f[2],0.8);pmThrow(t,v[0],v[1],v[2],'the Cook','ladle',{max:1.6,to:f});pmLog(e,'ladle');}}
    else{t.ppotT=0;t.ppotA=0;}}
  /* the cleaver arc in front of the counter */
  if(e.cle>0){e.cle-=dt;lock=true;if(pr&&pr.armR)pr.armR.rotation.x=-2.6;
    if(e.cle<=0){e.cle=0;e.cleCD=1.8;if(pr&&pr.armR)pr.armR.rotation.x=0.6;mwS('pg_cleaver',e.x,e.y,e.z);
      for(const t of pmPlayersNear(k.cc[0],k.cc[2],4.5))if(pmCleaverZone(k,t,0.4))pmStrike(e,t,3,'cleaver');}}
  else if(!pmDocile()&&e.cleCD<=0&&!e.cook.length){const tg=pmPlayersNear(k.cc[0],k.cc[2],4.5).find(t=>pmCleaverZone(k,t));
    if(tg){e.cle=0.5;e.plockD=0.5;pmTele(e,0.5,tg);look=[tg.x,tg.y+1.4,tg.z];e.cleAt=[tg.x,tg.z];}}
  if(e.cle>0&&e.cleAt){const lx=e.cleAt[0]-k.out[0]*1.6,lz=e.cleAt[1]-k.out[1]*1.6;mx=lx-e.x;mz=lz-e.z;const d=Math.hypot(mx,mz);if(d>0.3){mx/=d;mz/=d;spd=4;}else mx=mz=0;}
  /* cooking: a 3-5 s performance, then the dish arcs over the counter at whoever tossed it */
  if(e.cook.length){const c=e.cook[0];c.t=(c.t||0)+dt;jaw=0.4+0.6*Math.abs(Math.sin(MP.clock*13));if(pr&&pr.armL){pr.armL.rotation.x=-1.2+Math.sin(MP.clock*15)*0.8;pr.armR.rotation.x=-1.2-Math.sin(MP.clock*15)*0.8;}
    if(((frameCount+e.pid)%15)===0)mwS('pg_chatter',e.x,e.y,e.z);
    if(c.t>=(c.dur||(c.dur=3+((e.pid+PMS.seq)%3)))){e.cook.shift();pmChefServe(e,k,c);if(pr&&pr.armL){pr.armL.rotation.x=0;pr.armR.rotation.x=0;}}}
  else if(Math.hypot(e.x-post[0],e.z-post[2])>0.5){const dx=post[0]-e.x,dz=post[2]-e.z,d=Math.hypot(dx,dz);mx=dx/d;mz=dz/d;}
  pmWalk(e,dt,mx,mz,spd);
  if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,10);else if(mx||mz)pmTurn(e,mx,mz,dt,8);else pmTurn(e,k.out[0],k.out[1],dt,4);
  pmPost(e,dt,{look,lock,jaw,hr:{chop:e.cle>0?1:0,stir:e.cook.length?1:0,vault:0,yank:0,talk:jaw>0.3?1:0,tool:e.ladleT>0?1:0}});};
function pmChefCut(e,t,dmg,how){const k='pcut'+(t===P?'Dan':(t.A?t.A.name:t.pid||''));if((e[k]||0)>MP.clock)return;e[k]=MP.clock+0.7;pmStrike(e,t,dmg,how);}
function pmChefGrab(e,k,t){const p=k.pot&&k.pot.length?k.pot[Math.min(k.pot.length-1,4)]:null;if(!p)return;
  const v=aimLob(t.x,t.y,t.z,p[0]+0.5,p[1]+0.2,p[2]+0.5,0.9);pmThrow(t,v[0],v[1],v[2],'the Cook','grab',{max:1.8,to:[p[0]+0.5,p[1],p[2]+0.5]});
  mpSay('THE COOK','Gotcha!',1.6);mwS('pg_chatter',e.x,e.y,e.z);pmLog(e,'grab');if(t===P)pmHeckleSoon('thrown');}
/* an ingredient reaches him: queue it (stack-sized); a Live Chicken bolts 70% of the time; anything else goes back over the counter */
function pmChefTake(e,st,to,force){const k=pmChefLayout(e),R=PM_COOK[st.id];
  if(!R){pmArcDrop(k.cc[0],k.cc[1]+1.4,k.cc[2],to||k.front,st,to===P?'Dan':null,0.9);mwS('pg_chatter',e.x,e.y,e.z);return false;}
  if(st.id===IT.PG_LIVECHICK){for(let i=0;i<st.count;i++){if(!e.chase&&force!=='cook'&&(force==='chase'||Math.random()<0.7))pmChefChase(e,k,k.cc,to);else e.cook.push({id:st.id,n:1,to,out:[R[0],R[1]]});}return true;}
  const n=Math.floor(st.count/R[2]),left=st.count-n*R[2];
  if(n>0)e.cook.push({id:st.id,n,to,out:[R[0],R[1]*n]});
  if(left>0)pmArcDrop(k.cc[0],k.cc[1]+1.4,k.cc[2],to||k.front,{id:st.id,count:left},to===P?'Dan':null,0.9);
  return n>0;}
function pmChefServe(e,k,c){const own=c.to===P?'Dan':(c.to&&c.to.A?c.to.A.name:null);const n=c.out[1];
  for(let i=0;i<n;i++)pmArcDrop(k.cc[0],k.cc[1]+1.5,k.cc[2],c.to||k.front,{id:c.out[0],count:1},own,0.95+i*0.04);
  mpSay('THE COOK','Order up!',1.4);pmLog(e,'serve');}
function pmChefChase(e,k,from,to,hen){let h=hen;if(!h){spawnMob('pghen',from[0]+0.5,from[1]+1.1,from[2]+0.5);h=entities[entities.length-1];}if(!h.pi)pmInit(h);
  h.runner={chef:e,t:8,cells:new Set([...k.mset,...k.cset])};h.pkeep=1;
  e.chase={hen:h,t:0,to};e.y+=0.6;e.vy=7;mpSay('THE COOK','Get back here, dinner!',1.4);pmLog(e,'chase');}
/* drops resting on his counter are seized; a Live Chicken dropped anywhere on his mesa within 20 m starts the chase */
function pmChefCounterTick(){for(const e of entities){if(e.dead||e.mt!=='pgcook')continue;const k=pmChefLayout(e);if(!k.cset.size&&!k.mset.size)continue;
    for(const d of entities){if(d.dead||d.t!=='drop'||d.pchef||!d.st)continue;if(Math.abs(d.x-e.x)>22||Math.abs(d.z-e.z)>22)continue;
      const key=Math.floor(d.x)+','+Math.floor(d.z);
      if(k.cset.has(key)&&d.onGround){d.pchef=1;const st=d.st;removeEnt(d);let to=null,bd=12;for(const t of pmPlayersNear(k.cc[0],k.cc[2],12)){const dd=Math.hypot(t.x-k.cc[0],t.z-k.cc[2]);if(dd<bd){bd=dd;to=t;}}
        pmChefTake(e,st,to);pmLog(e,'seize');continue;}
      if(d.st.id===IT.PG_LIVECHICK&&k.mset.has(key)&&!e.chase&&Math.hypot(d.x-e.x,d.z-e.z)<20&&d.age>0.3){d.pchef=1;removeEnt(d);
        let to=null,bd=24;for(const t of pmPlayersNear(d.x,d.z,24)){const dd=Math.hypot(t.x-d.x,t.z-d.z);if(dd<bd){bd=dd;to=t;}}pmChefChase(e,k,[d.x-0.5,d.y-1,d.z-0.5],to);}}
    /* P2 throws a Live Chicken as a live hen (e.plive): once it lands on his mesa within 20 m, he goes after it */
    if(!e.chase&&!e.yank&&k.mset.size)for(const h of entities){if(h.dead||h.mt!=='pghen'||!h.plive||h.runner||h.pthrown||h.pheld)continue;
      if(Math.hypot(h.x-e.x,h.z-e.z)>=20||!k.mset.has(Math.floor(h.x)+','+Math.floor(h.z)))continue;h.plive=0;
      let to=null,bd=24;for(const t of pmPlayersNear(h.x,h.z,24)){const dd=Math.hypot(t.x-h.x,t.z-h.z);if(dd<bd){bd=dd;to=t;}}pmChefChase(e,k,null,to,h);break;}}}
PREG.mobUse.pgcook=function(e){const st=heldStack();if(!st){mpSay('THE COOK','Hm?',1.2);return;}
  const R=PM_COOK[st.id];if(!R){mpSay('THE COOK','No.',1.2);return;}
  const take=st.id===IT.PG_STUFF?Math.min(st.count,4*Math.floor(st.count/4)||0):1;if(take<=0){mpSay('THE COOK','More stuffing!',1.4);return;}
  st.count-=take;if(st.count<=0)P.inv[P.sel]=null;redrawHotbar();pmChefTake(e,{id:st.id,count:take},P);};

/* ===================================================================== */
/* the Professor and the bench Rats                                                                                           */
/* ===================================================================== */
PREG.brain.pgprof=function(e,dt,T){if(pmPre(e,dt))return;const pr=e.pr;let look=null;
  if(P&&Math.hypot(P.x-e.x,P.z-e.z)<7)look=[P.x,P.y+1.5,P.z];
  const b=pmNpcFind('bkr',e);if(b&&b.pose&&b.pose.k!=='walkin'&&b.pose.k!=='limp'&&Math.hypot(b.x-e.x,b.z-e.z)<8){if(pr&&pr.head)pr.head.rotation.x=Math.sin(MP.clock*8)*0.25;look=[b.x,b.y+1.4,b.z];}
  else if(pr&&pr.head)pr.head.rotation.x*=0.9;
  let mx=0,mz=0;const q=e.post;if(q&&Math.hypot(q[0]-e.x,q[2]-e.z)>0.6){const dx=q[0]-e.x,dz=q[2]-e.z,d=Math.hypot(dx,dz);mx=dx/d;mz=dz/d;}
  pmWalk(e,dt,mx,mz,1.8);if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,4);
  if(e.talkT>0)e.talkT-=dt;pmPost(e,dt,{look,jaw:e.talkT>0?0.2+0.5*Math.abs(Math.sin(MP.clock*10)):0});};
/* right-click the Professor: he cheerfully reads out the first ??? lab recipe's hint, and the Gauntlet recipe */
PREG.mobUse.pgprof=function(e){let rs=[];try{rs=typeof PRECIPES!=='undefined'?PRECIPES:[];}catch(err){}
  const seen=k=>!!(MP.seenIng&&(MP.seenIng[k]||MP.seenIng[String(k)]));
  const r=rs.find(q=>(q.st||q.set||q.station)==='lab'&&q.key!=null&&!seen(q.key));
  const a=r?('The Lab Rat hasn\'t cracked this one: '+(r.hint||'...')):'Everything on the bench is labelled, Rat. Splendid.';
  const b='And the Gauntlet: four Puppeteer Knuckles, the Lit Fuse, the Pearl Necklace and The Stiletto, in the Transmogrifier.';
  mpSay('THE PROFESSOR',a,4);PMS.sayQ.push({n:'THE PROFESSOR',t:b,d:4.5,mt:'pgprof'});PMS.sayT=Math.max(PMS.sayT||0,4);e.talkT=4;try{chatPush({k:'chat',from:'the Professor',txt:a});}catch(err){}
  pmLog(e,'hint');};
/* a bench Lab Rat: idles at his bench; P2 poses him; bolts in a panicked loop until carried back (touch or right-click) */
PREG.brain.pgratb=function(e,dt,T){const bolt=e.pose&&e.pose.k==='bolt';if(!bolt&&pmPre(e,dt))return;if(bolt)pmPre(e,dt);
  const pr=e.pr,q=pmPostOf(e)||(e.post=[e.x,e.y,e.z]);let mx=0,mz=0,spd=2.0,look=null,jaw=0;
  if(e.pose&&e.pose.k==='bolt'){e.boltT+=dt;
    if(e.carried){if(!P||P.dead){e.carried=false;}else{const sx=Math.cos(P.yaw)*0.55,sz=-Math.sin(P.yaw)*0.55;e.x=P.x+sx;e.z=P.z+sz;e.y=P.y+0.5;e.vx=e.vy=e.vz=0;e.yaw=P.yaw+Math.PI/2;
        if(pr&&pr.root)pr.root.rotation.z=1.2;if(Math.hypot(P.x-q[0],P.z-q[2])<2.6){e.carried=false;pmPoseEnd(e);e.x=q[0];e.z=q[2];e.y=q[1];pmLog(e,'returned');}
        pmPost(e,dt,{jaw:0,legs:false,noBob:1});return;}}
    else{const a=e.boltT*1.4+e.seed,tx=q[0]+Math.sin(a)*5,tz=q[2]+Math.cos(a)*5,dx=tx-e.x,dz=tz-e.z,d=Math.hypot(dx,dz)||1;mx=dx/d;mz=dz/d;spd=5;jaw=0.5+0.5*Math.abs(Math.sin(MP.clock*18));
      if(pr&&pr.armL){pr.armL.rotation.x=-2.9;pr.armR.rotation.x=-2.9;}
      if(typeof piS==='undefined'&&P&&!P.dead&&Math.hypot(P.x-e.x,P.z-e.z)<0.9&&Math.abs(P.y-e.y)<1.5){e.carried=true;mwS('pg_alarm',e.x,e.y,e.z);pmLog(e,'carried');}   /* P2 carries him when it is real */
      if(((frameCount+e.pid)%20)===0)mwS('pg_alarm',e.x,e.y,e.z);}}
  else{if(pr&&pr.root)pr.root.rotation.z=0;if(Math.hypot(q[0]-e.x,q[2]-e.z)>0.5){const dx=q[0]-e.x,dz=q[2]-e.z,d=Math.hypot(dx,dz);mx=dx/d;mz=dz/d;}
    if(P&&Math.hypot(P.x-e.x,P.z-e.z)<6)look=[P.x,P.y+1.5,P.z];}
  pmWalk(e,dt,mx,mz,spd);if(mx||mz)pmTurn(e,mx,mz,dt,8);else if(look)pmTurn(e,look[0]-e.x,look[2]-e.z,dt,3);
  pmPost(e,dt,{look,jaw});};
PREG.mobUse.pgratb=function(e){if(e.pose&&e.pose.k==='bolt'&&P){e.x=P.x+Math.cos(P.yaw)*0.6;e.z=P.z-Math.sin(P.yaw)*0.6;e.y=P.y;mwS('pg_alarm',e.x,e.y,e.z);pmLog(e,'grabbed');}else{mwS('pg_alarm',e.x,e.y,e.z);if(e.pr)pmNpcPose(e,'nod',0.8);}};
/* a killable bench Lab Rat (away from HQ and Booth 3) takes damage through the NPC path */
PREG.npcHit.pgratb=(e,dmg,by)=>{if(!e.pkill||e.dead||e.hurtT>0.25||!(dmg>0))return;e.hp-=dmg;e.hurtT=0.5;for(const m of e.mats)m.emissive&&m.emissive.setRGB(0.45,0,0);
  mwS('pg_alarm',e.x,e.y,e.z);if(e.hp<=0)killMob(e);};

/* ===================================================================== */
/* the Weatherman (bible 9.5): every 5-7 minutes of SHOW, a desk 20-35 m from a player; loot on the desk; something drops      */
/* ===================================================================== */
PREG.brain.pgweather=function(e,dt,T){if(pmPre(e,dt))return;const N=e.pnews;
  if(!N){pmPost(e,dt,{});return;}
  if(N.ph==='limp'){const dx=e.x-N.desk[0],dz=e.z-N.desk[2],d=Math.hypot(dx,dz)||1;pmWalk(e,dt,dx/d,dz/d,1.3);pmTurn(e,dx,dz,dt,6);N.lt=(N.lt||0)+dt;
    if(e.pr&&e.pr.root)e.pr.root.rotation.z=Math.sin(MP.clock*6)*0.15;if(N.lt>9)removeEnt(e);pmPost(e,dt,{});return;}
  e.vx=e.vz=0;e.vy-=GRAV*dt;moveBody(e,0,e.vy*dt,0,false);
  pmPost(e,dt,{look:P?[P.x,P.y+1.5,P.z]:null,jaw:N.ph==='read'?0.15+0.5*Math.abs(Math.sin(MP.clock*9)):0,legs:false});};
function pmNewsSite(t){for(let i=0;i<14;i++){const a=(PMS.seq++)*2.4+i,r=20+((i*7)%16),x=Math.floor(t.x+Math.sin(a)*r),z=Math.floor(t.z+Math.cos(a)*r);
    if(x<MPC.WALK.x0+3||x>MPC.WALK.x1-3||z<MPC.WALK.z0+3||z>MPC.WALK.z1-3)continue;if(!chunkAt(x,z))continue;
    if(mpInArena(null,x,0,z)||mpProtected(x,0,z))continue;const s=pmSurfY(x,z);
    if(!solidAt(x,s,z)||solidAt(x,s+1,z)||solidAt(x,s+2,z)||solidAt(x+1,s+1,z)||solidAt(x-1,s+1,z))continue;if(!skyOpen(x,s+1,z))continue;
    return [x+0.5,s+1,z+0.5];}return null;}
function pmNewsStart(t){if(PMS.news||DIM!=='puppet')return false;const S=pmNewsSite(t||P);if(!S)return false;
  const yw=Math.atan2(t.x-S[0],t.z-S[2]),fx=Math.sin(yw),fz=Math.cos(yw);
  const desk=pmProp('desk');desk.position.set(S[0]+fx*0.9,S[1],S[2]+fz*0.9);desk.rotation.y=yw;pmAdd(desk);
  spawnMob('pgweather',S[0],S[1],S[2]);const e=entities[entities.length-1];if(!e.pi)pmInit(e);e.yaw=yw;
  const sh=pmProp('shadow');sh.position.set(S[0],S[1]+0.03,S[2]);sh.scale.set(0.2,1,0.2);pmAdd(sh);
  const D=[S[0]+fx*0.9,S[1]+0.95,S[2]+fz*0.9];
  const loot=[{id:IT.PG_FELT,count:4},{id:IT.PG_SEQUIN,count:1},{id:IT.PG_STUFF,count:3}];for(let i=0;i<3;i++)mpDrop(D[0]+(i-1)*0.45,D[1],D[2],loot[i],null,0,0.5,0);
  const r=Math.random(),kind=r<0.6?'safe':(r<0.85?'piano':'sandbag');
  PMS.news={e,desk,sh,S,D,t:0,ph:'read',kind,obj:null};e.pnews={ph:'read',desk:D};mpSay('THE WEATHERMAN','Here is the weather.',2);pmLog(e,'news');return true;}
function pmNewsLoot(kind,z,x){let b='woods';try{b=mwBiomeAt(x,z);}catch(err){}if(!b||b==='woods'){b=z<-58?'woods':(z<42?'kitchen':(z<152?'p3':'swamp'));}
  if(kind==='piano')return [{id:IT.PG_WIRE,count:4},{id:IT.PG_FELT,count:6}];if(kind==='sandbag')return [{id:IT.PG_STUFF,count:8}];
  if(b==='kitchen')return [{id:IT.PG_HANGER,count:4}];if(b==='labs'||b==='palace'||b==='stair'||b==='p3')return [{id:IT.PG_SEQUIN,count:3}];
  if(b==='swamp')return [{id:IT.PG_PINS,count:4}];return [{id:IT.PG_FOAMCHUNK,count:6},{id:IT.PG_GOOGLIES,count:3}];}
function pmNewsTick(dt){const N=PMS.news;
  if(!N){if(pmCue()==='show'&&!MP.strike){PMS.newsT=(PMS.newsT||0)+dt;if(!PMS.newsNext)PMS.newsNext=300+Math.random()*120;
      if(PMS.newsT>=PMS.newsNext){const L=[P].concat(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE?AGENTS.filter(a=>a.e&&!a.dead&&a.online&&a.dim==='puppet').map(a=>a.e):[]).filter(t=>t&&!(t===P&&P.dead));
        const t=L[Math.floor(Math.random()*L.length)];if(t&&pmNewsStart(t)){PMS.newsT=0;PMS.newsNext=300+Math.random()*120;}else PMS.newsT=PMS.newsNext-20;}}
    return;}
  N.t+=dt;const e=N.e;
  if(N.ph==='read'){const k=Math.min(1,N.t/6);N.sh.scale.set(0.2+k*1.4,1,0.2+k*1.4);if(N.sh.userData.sm)N.sh.userData.sm.opacity=0.25+0.45*k;
    if(N.t>=6){N.ph='drop';N.obj=pmProp(N.kind);N.oy=N.S[1]+18;N.obj.position.set(N.D[0],N.oy,N.D[2]);N.ov=0;pmAdd(N.obj);mwS('pg_whoosh',N.D[0],N.D[1],N.D[2]);}}
  else if(N.ph==='drop'){N.ov+=GRAV*1.6*dt;N.oy-=N.ov*dt;const fl=N.S[1];
    if(N.oy<=fl){N.oy=fl;N.ph='flat';N.ft=0;N.obj.position.y=fl;mwS('pg_thump',N.D[0],N.D[1],N.D[2]);mpShake(0.4,0.3);
      if(e&&!e.dead){pmNpcPose(e,'flattened',1.5);e.pnews.ph='flat';}
      for(const t of pmPlayersNear(N.D[0],N.D[2],1.9)){if(Math.abs(t.y-N.S[1])<2.5){purgHit(t,10,'the Weatherman',N.kind,{force:1});if(t===P)pmHeckleSoon('flattened');else if(t.A)pmHeckleSoon('flattened',t.A.name);}}
      for(const st of pmNewsLoot(N.kind,N.D[2],N.D[0]))mpDrop(N.D[0],N.D[1]+0.3,N.D[2],st,null,0,3,0);
      burstParticles(N.D[0],N.D[1]+0.5,N.D[2],B.PG_DECK,14,1);}
    else N.obj.position.y=N.oy;}
  else if(N.ph==='flat'){N.ft+=dt;if(N.ft>=1.5&&e&&!e.dead&&e.pnews.ph==='flat'){e.pnews.ph='limp';}
    if(N.ft>=4){pmDel(N.desk);pmDel(N.obj);pmDel(N.sh);if(N.sh.userData.sm&&N.sh.userData.sm.dispose)N.sh.userData.sm.dispose();PMS.news=null;}}}
function pmNewsAbort(){const N=PMS.news;if(!N)return;try{pmDel(N.desk);if(N.obj)pmDel(N.obj);pmDel(N.sh);}catch(err){}if(N.e&&!N.e.dead)removeEnt(N.e);PMS.news=null;}
