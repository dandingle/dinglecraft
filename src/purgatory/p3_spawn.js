/* ---- PART 55: p3_spawn.js ---- */
/* ===================================================================== */
/* PART 55 p3_spawn.js (P3, puppets): ambient spawning (mpAmbient), structure spawns from P1's deterministic sites, the      */
/* P3 tick, the Hands' entrances, Felt Dan's walk, the death heckles, registrations and exports (bible 9.4, 9.5, 3.6, 12.3)  */
/* ===================================================================== */
function pmPlayers(){const L=[];if(P&&!P.dead&&DIM==='puppet')L.push(P);
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS){const b=a.e;if(b&&!b.dead&&!a.dead&&a.online&&a.dim==='puppet')L.push(b);}return L;}
function pmNearestPlayer(x,z,r){let best=null,bd=r==null?1e9:r;for(const p of pmPlayers()){const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;best=p;}}return best;}
function pmHn(){if(PMS.hnO!=null)return PMS.hnO;try{return hnState();}catch(err){return null;}}
/* the top solid block: the real blocks where the chunk is loaded (edits, digs, a carved floor), P1's column function elsewhere */
function pmSurfY(x,z){const fx=Math.floor(x),fz=Math.floor(z);if(chunkAt(fx,fz))return surfaceTop(fx,fz);try{return mpSurf(fx,fz);}catch(err){return deckY(z);}}
function pmBiome(x,z){if(PMS.biomeO)return PMS.biomeO;try{return mwBiomeAt(x,z)||'woods';}catch(err){return 'woods';}}
function pmSpots(k){if(PMS.spotO&&PMS.spotO[k])return PMS.spotO[k];try{return mwSpots(k)||[];}catch(err){return [];}}
/* a standing spot on the surface at (x,z): two open cells over a solid one */
function pmSurfSpot(x,z){const s=pmSurfY(x,z);if(!solidAt(x,s,z)||solidAt(x,s+1,z)||solidAt(x,s+2,z))return null;return s+1;}
/* a standing spot in a cave near y (the Understage) */
function pmCaveSpot(x,y,z){const y0=Math.floor(y);for(let k=0;k<7;k++){for(const yy of [y0+k,y0-k]){if(yy<3)continue;if(!solidAt(x,yy,z)&&!solidAt(x,yy+1,z)&&solidAt(x,yy-1,z))return yy;}}return null;}
/* distance from (x,z) to an arena; no ambient spawns within 40 m of a live or unbeaten one */
function pmArenaDist(name,x,z){const A=MPC.ARENA[name];if(name==='bigfrog')return Math.max(0,Math.hypot(x-A.cx,z-A.cz)-A.r);
  const dx=Math.max(A.x0-x,0,x-A.x1),dz=Math.max(A.z0-z,0,z-A.z1);return Math.hypot(dx,dz);}
function pmNoSpawn(x,z){const M=MPC.MARK;if(Math.hypot(x-M[0],z-M[2])<16)return true;
  for(const b of MPC.BOOTH)if(Math.hypot(x-b[0],z-b[1])<16)return true;
  const hs=pmHn();for(const n of ['bomber','bigpig','bigfrog']){const live=hs&&hs.live&&hs.name===n;if((live||!MP.dead[n])&&pmArenaDist(n,x,z)<40)return true;}
  const H=MPC.HOUSE;if(x>=H.x0&&x<=H.x1&&z>=H.z0-30&&z<=H.z1)return true;                       /* the apron, the pit and the House are the show */
  return false;}
function pmSpawnAt(mt,x,y,z,props){spawnMob(mt,x,y,z);const e=entities[entities.length-1];if(!e.pi)pmInit(e);if(props)Object.assign(e,props);return e;}
function pmCount(f){let n=0;for(const e of entities)if(!e.dead&&e.t==='mob'&&f(e))n++;return n;}

/* ===================================================================== */
/* mpAmbient (P0-42): every 1.4 s, one ring point 14-36 m from mobAnchor(). Caps: hostile 8 (12 in BLACKOUT), passive 8.     */
/* ===================================================================== */
function mpAmbient(x,z,h,p){if(DIM!=='puppet'||!P||!GR.mobSpawn)return;
  const hs=pmHn();if(MP.strike||(hs&&(hs.inter||hs.strike)))return;
  if(pmNoSpawn(x,z))return;
  const blk=pmBlackout(),capH=blk?12:8,an=pmNearestPlayer(x,z)||P;
  if(!mobClearOfPlayers(x,z))return;
  /* the Understage: the Hands, always (4 per player below deck) */
  if(an&&an.y<pmSurfY(an.x,an.z)-6){if(h>=capH||pmHandsBelow(an)>=4)return;const y=pmCaveSpot(x,an.y,z);
    if(y!=null&&Math.abs(y-an.y)<8)pmSpawnAt('pghand',x+0.5,y,z+0.5,{ptgtHold:0});return;}
  const b=pmBiome(x,z),sy=pmSurfSpot(x,z);
  if(blk&&h<capH){                                                       /* BLACKOUT: the Hands climb out of trench mouths and drains */
    const src=b==='woods'?pmSpots('trenchMouth'):(b==='kitchen'?pmSpots('drainMouth'):[]);let m=null,md=34;
    for(const s of src){const d=Math.hypot(s[0]-x,s[2]-z);if(d<md){md=d;m=s;}}
    if(m){const yy=mpSafeY(m[0]+0.5,m[1],m[2]+0.5);if(Math.hypot(m[0]-an.x,m[2]-an.z)>10){pmSpawnAt('pghand',Math.floor(m[0])+0.5,yy,Math.floor(m[2])+0.5);return;}}
    if(sy!=null&&(b==='labs'||b==='palace'||b==='swamp'||b==='stair'||!src.length)&&((PMS.seq++)%2===0)){pmSpawnAt('pghand',x+0.5,sy,z+0.5);return;}}
  if(sy==null)return;
  const r=Math.random();
  if(b==='woods'){if(p<8&&r<0.2)pmSpawnAt('pghen',x+0.5,sy,z+0.5);}
  else if(b==='kitchen'){if(r<0.2&&h<capH&&pmSoupNear(x,sy,z))pmSpawnAt('pgpelican',x+0.5,sy,z+0.5);else if(p<8&&r<0.45)pmSpawnAt('pghen',x+0.5,sy,z+0.5);}
  else if(b==='labs'){if(h<capH-2&&pmCount(e=>e.mt==='pgrat'||e.mt==='pgrat2'||e.mt==='pgrat4')<=7){const g=++PMS.seq;
      for(let i=0;i<3;i++){const ox=(i-1)*0.9,oz=(i%2)*0.8;const y2=pmSurfSpot(x+Math.round(ox),z+Math.round(oz));pmSpawnAt('pgrat',x+0.5+ox,y2!=null?y2:sy,z+0.5+oz,{grp:g});}}}
  else if(b==='swamp'){if(r<0.15&&h<capH)pmSpawnAt('pgpelican',x+0.5,sy,z+0.5);
    else if(h<capH-2){const n=3+Math.floor(Math.random()*4);for(let i=0;i<n;i++){const a=i*2.4;pmSpawnAt('pgfrog',x+0.5+Math.sin(a)*1.2,sy+0.1,z+0.5+Math.cos(a)*1.2);}}}
  else if(b==='palace'&&blk){/* nothing extra: the Hands above */}}
function pmSoupNear(x,y,z){for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){const id=getBlock(x+dx,y-1,z+dz);if(id===B.PG_SOUP||id===B.PG_SCUM)return true;}return false;}

/* ===================================================================== */
/* the Hands' entrances (P1's flinch and skin twitch call this): claw out of the nearest open cell toward the target        */
/* ===================================================================== */
function pmSpawnHand(x,y,z,target){if(DIM!=='puppet')return null;const t=target||null;
  if(t&&(t===P||t.bot)&&pmHandsBelow(t)>=4)return null;
  let best=null,bd=1e9;const bx=Math.floor(x),by=Math.floor(y),bz=Math.floor(z);
  for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=3;dy++)for(let dz=-3;dz<=3;dz++){const cx=bx+dx,cy=by+dy,cz=bz+dz;if(cy<3)continue;
    if(solidAt(cx,cy,cz)||solidAt(cx,cy+1,cz)||!solidAt(cx,cy-1,cz))continue;
    let d=dx*dx+dy*dy+dz*dz;if(t)d+=Math.hypot(cx+0.5-t.x,cz+0.5-t.z)*0.3;if(d<bd){bd=d;best=[cx,cy,cz];}}
  if(!best)return null;
  burstParticles(best[0]+0.5,best[1]+0.4,best[2]+0.5,B.PG_FOAM,12,0.8);mwS('pg_foamtear',best[0]+0.5,best[1],best[2]+0.5);
  const e=pmSpawnAt('pghand',best[0]+0.5,best[1]+0.02,best[2]+0.5,{ptgt:t,ptgtHold:MP.clock+20});pmLog(e,'claw');return e;}

/* ===================================================================== */
/* structure spawns (every 30 frames) from P1's deterministic sites; never saved, respawn by the bible's timers             */
/* ===================================================================== */
function pmSt(k){let r=PMS.st.get(k);if(!r){r={e:null,dead:null,n:0,clr:null,far:false};PMS.st.set(k,r);}return r;}
function pmStLive(r){return r.e&&!r.e.dead?r.e:null;}
function pmStructDied(e){if(!e.pskey)return;const r=PMS.st.get(e.pskey);if(r&&r.e===e){r.e=null;r.dead=MP.clock;}
  if(e.mt==='pgyeti')PMS.yetiNext=MP.clock+360;}
function pmHeapGone(k){}                                                 /* heaps are recounted each structure tick */
function pmCellC(v){return Math.floor(v)+0.5;}
/* a tethered puppet on the Arm Hole block at (x,y,z) (tests and P1 sites); kind 'what'|'comic' */
function pmSpawnTether(kind,x,y,z,o){o=o||{};const mt=kind==='comic'?'pgcomic':'pgwhat',R=o.reach||(kind==='comic'?5:6);
  const e=pmSpawnAt(mt,x+0.5,y+2.0,z+0.5,{hole:{x,y,z,id:o.id||(x+','+y+','+z)},reach:R});if(o.key){e.pskey=o.key;pmSt(o.key).e=e;}return e;}
function pmStructTick(){if(DIM!=='puppet'||!P)return;const PL=pmPlayers();if(!PL.length)return;
  const near=(x,z,r)=>PL.some(p=>Math.hypot(p.x-x,p.z-z)<r);
  /* far-away structure puppets go (they come back when someone does); measured from their home when they have one, so Old Goat and
     Older Goat applauding at the EXIT doors are never culled and re-seated mid-applause */
  for(const e of entities){if(e.dead||e.t!=='mob'||!e.pskey)continue;const hx=e.phome?e.phome[0]:e.x,hz=e.phome?e.phome[1]:e.z;if(!near(hx,hz,e.pfarR||76)){e.pfar=1;const r=PMS.st.get(e.pskey);if(r&&r.e===e){r.e=null;}
      if(e.pheap!=null){const h=PMS.st.get('heap:'+e.pheap);if(h)h.far=true;}removeEnt(e);}}
  /* Arm Holes: a Blank (the Comic in the 3 nearest the Mark) per hole within 40 m; 3 min after a death while the hole stands */
  const seen=new Set();
  for(const p of PL){const c0x=Math.floor((p.x-40)/CH),c1x=Math.floor((p.x+40)/CH),c0z=Math.floor((p.z-40)/CH),c1z=Math.floor((p.z+40)/CH);
    for(let cx=c0x;cx<=c1x;cx++)for(let cz=c0z;cz<=c1z;cz++){let L=[];
      if(PMS.holesO)L=PMS.holesO.filter(h=>Math.floor(h.x/CH)===cx&&Math.floor(h.z/CH)===cz);else try{L=mwArmHoles(cx,cz)||[];}catch(err){}
      for(const h of L){const k='hole:'+h.id;if(seen.has(k))continue;seen.add(k);if(Math.hypot(h.x+0.5-p.x,h.z+0.5-p.z)>40)continue;
        const r=pmSt(k);if(pmStLive(r))continue;if(r.dead!=null&&MP.clock-r.dead<180)continue;
        if(!chunkAt(h.x,h.z)||getBlock(h.x,h.y,h.z)!==B.PG_ARMHOLE)continue;
        const e=pmSpawnTether(h.kind==='comic'?'comic':'what',h.x,h.y,h.z,{id:h.id,reach:h.reach});e.pskey=k;r.e=e;r.dead=null;}}}
  /* a tethered puppet whose hole is gone withdraws */
  for(const e of entities){if(e.dead||!e.hole||e.hole.virt||e.pwd!=null)continue;const H=e.hole;if(chunkAt(H.x,H.z)&&getBlock(H.x,H.y,H.z)!==B.PG_ARMHOLE)pmWithdraw(e,null);}
  /* Hollow heaps: 3-5 Hollows; respawn 4 min after a heap is cleared */
  for(const s of pmSpots('hollowHeap')){const hk=Math.floor(s[0])+','+Math.floor(s[2]),k='heap:'+hk,r=pmSt(k);
    const alive=pmCount(e=>e.pheap===hk);if(r.n>0&&alive===0){if(r.far)r.far=false;else r.clr=MP.clock;}r.n=alive;
    if(alive===0&&(r.clr==null||MP.clock-r.clr>=240)&&near(s[0],s[2],48)&&chunkAt(Math.floor(s[0]),Math.floor(s[2]))){
      const n=3+((Math.abs(Math.floor(s[0])*7+Math.floor(s[2])*13))%3);
      for(let i=0;i<n;i++){const a=i*2.1+0.4,x=Math.floor(s[0]+Math.sin(a)*1.3),z=Math.floor(s[2]+Math.cos(a)*1.3),y=pmSurfSpot(x,z);
        pmSpawnAt('pghollow',x+0.5,y!=null?y:s[1],z+0.5,{pheap:hk,pskey:'heapm:'+hk+':'+i});}
      r.n=n;r.clr=null;r.far=false;}}
  /* Band Rooms: the Drummer on his stake; respawns 5 min after death */
  const BR=pmSpots('band');for(let i=0;i*3+2<BR.length;i++){const st=BR[i*3],kit=BR[i*3+1],mo=BR[i*3+2],k='band:'+i,r=pmSt(k);
    if(pmStLive(r)||(r.dead!=null&&MP.clock-r.dead<300)||!near(st[0],st[2],40)||!chunkAt(Math.floor(st[0]),Math.floor(st[2])))continue;
    const S=[pmCellC(st[0]),st[1],pmCellC(st[2])],K=[pmCellC(kit[0]),kit[1],pmCellC(kit[2])],dx=S[0]-K[0],dz=S[2]-K[2],d=Math.hypot(dx,dz)||1;
    const seat=[K[0]+dx/d*1.1,K[1],K[2]+dz/d*1.1];
    r.e=pmSpawnAt('pgdrummer',seat[0],mpSafeY(seat[0],seat[1],seat[2]),seat[2],{stake:S,kit:K,seat,mouth:mo,room:i,pskey:k});r.dead=null;}
  /* the Cook and his coop */
  const CH0=pmSpots('chef');if(CH0.length&&near(CH0[0][0],CH0[0][2],48)){const r=pmSt('chef');
    if(!pmStLive(r)&&chunkAt(Math.floor(CH0[0][0]),Math.floor(CH0[0][2]))){const q=[pmCellC(CH0[0][0]),CH0[0][1],pmCellC(CH0[0][2])];q[1]=mpSafeY(q[0],q[1],q[2]);
      r.e=pmSpawnAt('pgcook',q[0],q[1],q[2],{post:q,pskey:'chef'});}}
  const CO=pmSpots('coop');if(CO.length&&near(CO[0][0],CO[0][2],48)){const r=pmSt('coop');const n=pmCount(e=>e.pcoop);
    if(n<4&&(r.next==null||MP.clock>=r.next)&&chunkAt(Math.floor(CO[0][0]),Math.floor(CO[0][2]))){r.next=MP.clock+(n===0&&r.first==null?0:60);r.first=1;
      for(let i=n;i<4;i++){const c=CO[i%CO.length],x=pmCellC(c[0])+(i%2?0.4:-0.4),z=pmCellC(c[2])+(i>1?0.4:-0.4);pmSpawnAt('pghen',x,mpSafeY(x,c[1],z),z,{pcoop:1});if(r.next>MP.clock)break;}}}
  /* Labs HQ: the Professor and the Lab Rat; Booth 3's the Lab Rat (invulnerable) */
  const BU=pmSpots('prof');if(BU.length&&near(BU[0][0],BU[0][2],48)){const r=pmSt('prof');if(!pmStLive(r)){const q=[pmCellC(BU[0][0]),BU[0][1],pmCellC(BU[0][2])];q[1]=mpSafeY(q[0],q[1],q[2]);
      r.e=pmSpawnAt('pgprof',q[0],q[1],q[2],{post:q,pskey:'prof'});}}
  const BK=pmSpots('bkr');for(let i=0;i<BK.length;i++){const s=BK[i];if(!near(s[0],s[2],48))continue;const k='bkr:'+i,r=pmSt(k);if(pmStLive(r))continue;
    const q=[pmCellC(s[0]),s[1],pmCellC(s[2])];q[1]=mpSafeY(q[0],q[1],q[2]);r.e=pmSpawnAt('pgratb',q[0],q[1],q[2],{post:q,pskey:k});}
  /* the Old Goats in their box */
  {const b=MPC.BOX_SW,r=pmSt('sw');if(near(b[0],b[2],120)&&!pmStLive(r)){const S=pmSWSeats();
      const a=pmSpawnAt('pgoldgoat',S[0][0],S[0][1],S[0][2],{seatAt:S[0].slice(0,3),yaw:S[0][3],pskey:'sw',pfix:1,pfarR:150,phome:[b[0],b[2]]});
      pmSpawnAt('pgoldergoat',S[1][0],S[1][1],S[1][2],{seatAt:S[1].slice(0,3),yaw:S[1][3],pskey:'sw2',pfix:1,pfarR:150,phome:[b[0],b[2]]});r.e=a;pmSt('sw2').e=entities[entities.length-1];
      if(MP.strike)pmSWApplaud(true);}}
  /* Chorus Pig pens: 4-6 each, back 2 min after the pen is emptied */
  const PE=pmSpots('pen');for(let i=0;i<PE.length;i++){const s=PE[i],k='pen:'+i,r=pmSt(k),alive=pmCount(e=>e.ppen===k);
    if(r.n>0&&alive===0)r.clr=MP.clock;r.n=alive;
    if(alive===0&&(r.clr==null||MP.clock-r.clr>=120)&&near(s[0],s[2],40)&&chunkAt(Math.floor(s[0]),Math.floor(s[2]))){const n=4+(i%3);
      for(let j=0;j<n;j++){const x=pmCellC(s[0])+((j%3)-1)*1.4,z=pmCellC(s[2])+(Math.floor(j/3)-0.5)*1.4;pmSpawnAt('pgpig',x,mpSafeY(x,s[1],z),z,{ppen:k});}r.n=n;r.clr=null;}}
  /* the Yeti: the Pork Palace and the wings; at most 2; 6 min after a death */
  const nsw=pmCount(e=>e.mt==='pgyeti');if(nsw<2&&MP.clock>=(PMS.yetiNext||0)){
    for(const p of PL){const b=pmBiome(p.x,p.z);if(b!=='palace'&&b!=='wings')continue;const a=MP.clock*1.7+nsw,d=26+((PMS.seq++)%9),x=Math.floor(p.x+Math.sin(a)*d),z=Math.floor(p.z+Math.cos(a)*d);
      const bb=pmBiome(x,z);if((bb==='palace'||bb==='wings')&&chunkAt(x,z)&&!pmNoSpawn(x,z)){const y=pmSurfSpot(x,z);if(y!=null){pmSpawnAt('pgyeti',x+0.5,y,z+0.5);PMS.yetiNext=MP.clock+25;break;}}}}
  /* Felt Dan: armed by the guest trunk; walks at every BLACKOUT from the nearest trench or drain until killed */
  pmFeltDanTick(PL);}
function pmFeltDanTick(PL){const hook=pmSpots('guestHook')[0];
  const walking=pmCount(e=>e.mt==='pgfeltdan')>0;
  if(hook){const show=MP.feltDan<2&&!walking&&P&&Math.hypot(P.x-hook[0],P.z-hook[2])<48;
    if(show&&!PMS.hang){const r=pmRig({kind:'pgfeltdan'});const G=r.G,pr=r.parts;if(pr.root){pr.root.rotation.x=0.18;if(pr.armL){pr.armL.rotation.x=0.25;pr.armR.rotation.x=0.25;}if(pr.head)pr.head.rotation.x=0.6;}
      G.position.set(pmCellC(hook[0]),hook[1]-1.9,pmCellC(hook[2]));pmAdd(G);PMS.hang={G,mats:r.mats};}
    else if(!show&&PMS.hang){pmDel(PMS.hang.G);for(const m of PMS.hang.mats)m.dispose&&m.dispose();PMS.hang=null;}
    if(PMS.hang)PMS.hang.G.rotation.y=Math.sin(MP.clock*0.7)*0.15;}
  if(MP.feltDan!==1||walking||!pmBlackout()||!P||P.dead||P.mode==='c')return;
  const src=pmSpots('trenchMouth').concat(pmSpots('drainMouth'));let m=null,md=1e9;
  for(const s of src){const d=Math.hypot(s[0]-P.x,s[2]-P.z);if(d>6&&d<md){md=d;m=s;}}
  let x,y,z;if(m&&md<80){x=pmCellC(m[0]);z=pmCellC(m[2]);y=mpSafeY(x,m[1],z);}
  else{const a=MP.clock;x=Math.floor(P.x+Math.sin(a)*18)+0.5;z=Math.floor(P.z+Math.cos(a)*18)+0.5;const yy=pmSurfSpot(Math.floor(x),Math.floor(z));if(yy==null)return;y=yy;}
  if(!chunkAt(Math.floor(x),Math.floor(z)))return;
  const e=pmSpawnAt('pgfeltdan',x,y,z,{pkeep:1});burstParticles(x,y+0.5,z,B.PG_FOAM,14,0.9);mwS('pg_foamtear',x,y,z);pmLog(e,'feltdan');}

/* ===================================================================== */
/* the P3 tick (PREG.tick, inside purgatory, paused during a purgatory CUT)                                                  */
/* ===================================================================== */
function pmTick(dt){if(PMS.flF!==frameCount)pmFlightStep(dt);
  pmWrapTick(dt);pmPrintsTick(dt);pmArmsTick(dt);pmSnipCheck();pmBooTick(dt);pmSayTick(dt);
  if(PMS.tomBuf.length)for(let i=PMS.tomBuf.length-1;i>=0;i--){const b=PMS.tomBuf[i];if(MP.clock>=b.t){PMS.tomBuf.splice(i,1);pmTomatoFromDark(b.to,b.opt);}}
  if(PMS.splatT>0){PMS.splatT-=dt;if(PMS.splatT<=0){const el=$('psplat');if(el&&el.style)el.style.display='none';}}
  for(let i=PMS.splats.length-1;i>=0;i--){const s=PMS.splats[i],t=s.target;if(t&&t.t==='mob'&&t.dead){if(s.G&&s.parent)s.parent.remove(s.G);PMS.splats.splice(i,1);}}
  for(const e of PMS.ownP){if(!e.dead)continue;PMS.ownP.delete(e);pmAnimalDrop(e);pmDareDrop(e);}
  /* deaths: the balcony heckles 1.2 s later (by then P4 has counted the death), bots too */
  for(let i=PMS.dq.length-1;i>=0;i--){const d=PMS.dq[i];if(MP.clock<d.t)continue;PMS.dq.splice(i,1);
    const n=d.hs&&MP.deaths?MP.deaths[d.hs]:0;
    if(d.who==='Dan'&&d.hs&&(n===2||n===4)&&MP.clock-(PMS.hintAt||-99)<3.5)continue;          /* P4 already called the hint pair */
    pmHeckle(pmDeathKind(d.by,d.how,n,d.blk),{who:d.who,death:1});}
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS){if(a.dim!=='puppet')continue;
    if(a.dead&&!PMS.botDead[a.name]){PMS.botDead[a.name]=1;const hs=pmHn();PMS.dq.push({who:a.name,by:a.lastHurtBy,how:a.lastHurtHow,blk:pmBlackout(),hs:hs&&hs.live?hs.name:null,t:MP.clock+1.2});}
    else if(!a.dead&&PMS.botDead[a.name])delete PMS.botDead[a.name];}
  /* an embarrassing fall (3+ damage) earns a tomato */
  if(P){if(LASTDMG!==PMS.lastLD){if(LASTDMG&&LASTDMG.how==='fall'&&PMS.lastHp-P.hp>=3&&!P.dead)pmHeckle('fall',{who:'Dan'});PMS.lastLD=LASTDMG;}PMS.lastHp=P.hp;}
  if((frameCount%6)===0)pmChefCounterTick();
  pmNewsTick(dt);
  if(++PMS.structT>=30){PMS.structT=0;pmStructTick();}}
/* scene bookkeeping: every prop P3 puts in the scene, so a reset/exit can take them all away */
function pmResetTransient(){for(const o of PMR.sp)try{scene.remove(o);}catch(err){}PMR.sp.clear();PMR.arms.length=0;
  if(PMS.hang){PMS.hang=null;}pmNewsAbort();pmWrapEl(false);if(PMS.wrap)PMS.wrap=null;
  for(const s of PMS.splats)if(s.G&&s.parent)try{s.parent.remove(s.G);}catch(err){}
  Object.assign(PMS,{flight:null,prints:[],printT:0,band:[{},{},{}],henKills:{},st:new Map(),splats:[],boo:null,sayQ:[],sayT:0,
    newsT:0,newsNext:0,structT:0,tomBuf:[],dq:[],botDead:{},ownP:new Set(),yetiNext:0,tomCool:{},splatT:0,lastLD:null,lastHp:P?P.hp:20});
  const el=$('psplat');if(el&&el.style)el.style.display='none';}
PMS.dq=[];PMS.botDead={};PMS.ownP=new Set();

/* ---- registrations (file order: P3's tick runs after P1's and P2's, before P4's) ---- */
PREG.tick.push(pmTick);
PREG.onBreak.push(function(x,y,z,id,who){if(id===B.PG_ARMHOLE){for(const e of entities){if(e.dead||!e.hole)continue;const H=e.hole;if(H.x===x&&H.y===y&&H.z===z)pmWithdraw(e,who);}}
  else if(id===B.PG_SEAT&&!MP.strike)pmBooBarrage(x+0.5,z+0.5);});
PREG.onClose.push(function(kind,be,bek){if(be&&be.pguest&&!MP.feltDan){MP.feltDan=1;pmLog({pid:0,mt:'pgfeltdan'},'armed');}});
PREG.onDeath.push(function(who){const hs=pmHn();const ld=(who==='Dan'||!who)?LASTDMG:{by:null,how:null};
  PMS.dq.push({who:who||'Dan',by:ld&&ld.by,how:ld&&ld.how,blk:pmBlackout(),hs:hs&&hs.live?hs.name:null,t:MP.clock+1.2});
  if((who||'Dan')==='Dan'&&PMS.wrap)pmWrapEnd(false);});
PREG.onRespawn.push(function(who){if((who||'Dan')==='Dan')pmHeckle('death',{who:'Dan',delay:1.6});});
PREG.onReset.push(pmResetTransient);PREG.onEnter.push(pmResetTransient);PREG.onLoad.push(pmResetTransient);PREG.onExit.push(pmResetTransient);

/* a P3 handler must never stop the frame: brains, mob uses, NPC hits and projectile callbacks are called by P0/the core without a
   try/catch, so each one P3 registered is wrapped (a failure is reported once through mpFail and the entity keeps its place) */
(function pmGuard(){const W=(f,k)=>function(a,b,c,d){try{return f.call(this,a,b,c,d);}catch(err){mpFail(k,err);if(a&&a.mesh&&a.x!=null)a.mesh.position.set(a.x,a.y,a.z);}};
  for(const k in PM_NAMES){if(PREG.brain[k])PREG.brain[k]=W(PREG.brain[k],'p3 brain '+k);if(PREG.mobUse[k])PREG.mobUse[k]=W(PREG.mobUse[k],'p3 use '+k);
    if(PREG.npcHit[k])PREG.npcHit[k]=W(PREG.npcHit[k],'p3 npcHit '+k);}
  for(const k of ['fish','tomato']){const K=PREG.proj[k];if(!K)continue;for(const f of ['mesh','free','hit','land'])if(K[f])K[f]=W(K[f],'p3 proj '+k+' '+f);}})();
Object.assign(PGEX,{pmRig,pmSpawnHand,pmNpcPose,pmNpcFind,pmNpcSpawn,pmHeckle,pmSplat,pmSplatClear,pmTomatoLob,pmBooBarrage,pmFireDare,
  pmBandState,pmSWApplaud,pmSpawnTether,pmChefTake,pmSWSeats,pmTipOver,pmWithdraw,pmResetTransient,pmStructTick,pmNewsStart,pmDeathKind,pmChefPrep,pmSpawnAt,pmTomatoFromDark,pmStealable,
  PM_NAMES,getPMS:()=>PMS,getPMR:()=>PMR,mpAmbient,pmMakeMesh:mt=>makeMobMesh(mt),pmLastDmg:()=>LASTDMG});
