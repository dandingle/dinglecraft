/* ---- PART 57: m2_r1.js ---- */
/* ===================================================================== */
/* PART 57 m2 (M2): Round I, THE TABLE (bible 8). He leans out of the    */
/* Throat like a man over his dinner: the slap and the hand-eye, the     */
/* scoop and the ride and the tongue (until he learns), the crumb spray, */
/* the snack, waves 1a and 1b. His feet never move; he turns at 1.2 r/s. */
/* ===================================================================== */

/* ---- floor hazards that tick (the palm grind): {k,x,z,r,t,next,n,how,y0,y1} ---- */
function mg2Haz(dt){if(!MG2.haz)MG2.haz=[];for(const h of MG2.haz.slice()){h.t-=dt;h.next-=dt;
    if(h.next<=0){h.next+=h.dt||0.5;for(const t of mg2Players()){const p=mg2TPos(t);const d=Math.hypot(p.x-h.x,p.z-h.z);if(d<=h.r&&p.y>=h.y0&&p.y<=h.y1){mg2Hit(t,h.n,MG_K.PIERCE,h.how,{tick:1});MGT.events.push('haz:'+h.k+':'+d.toFixed(2));}}}
    if(h.t<=0)MG2.haz.splice(MG2.haz.indexOf(h),1);}}
function mg2Players(){const out=[];if(mg2Alive(P)&&!(P.mode==='c'))out.push(P);for(const a of mg2Bots())if(!mg2Eaten(a))out.push(a);return out;}

/* ---- the brain of Round I ---- */
function mg2R1Brain(e,dt){const F=mgF(),K=MG2K.R1;e.x=MGC.X;e.z=MGC.Z;e.y=F-8;
  MGA.stance='lean';MGA.light.at=MG2.ride?'mouth':'chest';
  const a=MG2.atk;
  let fx=P.x,fz=P.z;if(a&&a.fx!=null){fx=a.fx;fz=a.fz;}else if(MG2.win){fx=MG2.win.part.x;fz=MG2.win.part.z;}
  if(Math.hypot(fx-e.x,fz-e.z)>0.5)e.yaw=mg2Turn(e.yaw,mg2Yaw(fx-e.x,fz-e.z),1.2,dt);
  if(MG2.ride)mg2RideTick(e,dt);
  if(a){const f=MG2R1[a.k];if(f&&f.tick(a,e,dt))mg2End(a);return;}
  if(MG2.win||MG2.ride)return;
  if(MG2.gap>0){MG2.gap-=dt;return;}
  MG2.sel-=dt;
  if(mg2Docile())return;
  const sn=mg2R1Snack(e);if(sn)return;
  if(MG2.sel>0)return;
  const tg=mg2Pick();if(!tg)return;MG2.sel=mg2SelT(K);
  const tp=mg2TPos(tg),tr=Math.hypot(tp.x-MGC.X,tp.z-MGC.Z),onPlate=mgZone(tp.x,tp.y,tp.z)==='arena';
  const L=[];
  if(mg2CD('slapL')||mg2CD('slapR'))if(tr<=K.REACH+0.5)L.push(['slap',K.W.slap]);
  if(mg2CD('scoop')&&onPlate&&tr>=7.5&&tr<=24)L.push(['scoop',K.W.scoop]);
  if(mg2CD('crumbs')&&tr>K.CRUMB_MIN+4&&MG2.L.crumbN<K.RUBBLE_MAX)L.push(['crumbs',K.W.crumbs]);
  if(!L.length)return;
  let k=mg2Weighted(L);
  if(!MG2.L.demo1&&mg2CD('scoop')&&mg2R1PenAlive())k='scoop';                             /* the self-demo: his first scoop takes the Pen */
  mg2Token(tg);mg2Begin(MG2R1[k].start(e,tg));}

/* ---- the attacks: start(e,target) -> attack object; tick(a,e,dt) -> true when the token is free ---- */
var MG2R1={
  /* SLAP-DOWN: the hand rises, its shadow slides after the target, stops at T-0.95, the commit flash at T-0.35, slam at 1.6 */
  slap:{start:function(e,tg){const K=MG2K.R1,p=mg2TPos(tg),side=Math.sin(mg2Ang(Math.atan2(p.x-e.x,p.z-e.z)-e.yaw))>=0?'L':'R';
      let hand=mg2CD('slap'+side)?side:(side==='L'?'R':'L');
      const dbl=K.DSLAP&&mg2Low()&&mg2R()<0.5&&mg2CD('slapL')&&mg2CD('slapR');
      const a={k:'slap',t:0,tg,hand,x:p.x,z:p.z,tell:K.SLAP_TELL,locked:0,com:0,hit:0,dbl,n:0};mg2R1SlapClamp(a);
      a.h=mg2Tel('slap',{col:'white',shape:'disc',x:a.x,z:a.z,r:K.SLAP_R,y0:mgF()-1,y1:mgF()+4,impactT:mg2Now()+a.tell});
      if(dbl){a.b={hand:hand==='L'?'R':'L',x:p.x,z:p.z,locked:0,com:0,hit:0,tell:a.tell+1.0};a.b.h=mg2Tel('slap',{col:'white',shape:'disc',x:p.x,z:p.z,r:K.SLAP_R,y0:mgF()-1,y1:mgF()+4,impactT:mg2Now()+a.b.tell});}
      mg2SetCD('slap'+hand,K.SLAP_CD);if(dbl)mg2SetCD('slap'+a.b.hand,K.SLAP_CD+1);
      mg2S('mg_slapup',a.x,mgF()+4,a.z);a.fx=a.x;a.fz=a.z;return a;},
    tick:function(a,e,dt){a.t+=dt;const K=MG2K.R1;
      const s1=mg2R1SlapStep(a,a,dt,e);
      if(a.b){const b=a.b;b.t=a.t;if(!b.locked&&!a.hit){const p=mg2TPos(a.tg);mg2R1Slide(b,p,dt);mg2R1SlapClamp(b);}
        if(!b.locked&&a.hit){b.locked=1;mg2Lock(b.h);}                                     /* the second shadow locks at the first impact */
        mg2R1SlapStep(a,b,dt,e);
        if(b.hit&&a.t>=b.tell+K.EYE_DELAY&&!b.win){b.win=1;mg2R1HandEye(b);return true;}
        if(a.hit&&!a.win&&a.t>=a.tell+K.EYE_DELAY){a.win=1;mg2R1HandEye(a,0.6);}
        return false;}
      if(a.hit&&a.t>=a.tell+K.EYE_DELAY){mg2R1HandEye(a);return true;}
      return false;},
    free:function(a){mg2Free(a.h);if(a.b)mg2Free(a.b.h);}},
  /* SCOOP: the furrow runs along the arc, the RED band locks to the target's radius 0.6 s before the sweep, the hand sweeps 90 deg */
  scoop:{start:function(e,tg){const K=MG2K.R1,F=mgF();let p=mg2TPos(tg),demo=0;
      if(!MG2.L.demo1&&mg2R1PenAlive()){MG2.L.demo1=1;demo=1;p={x:MGC.X,y:F,z:MGC.Z-17};}
      const pr=mgPol(p.x,p.z),hand=mg2R()<0.5?'L':'R',dir=hand==='L'?1:-1;
      const a={k:'scoop',t:0,tg,demo,hand,dir,r:Math.max(9,Math.min(22,pr.r)),th:pr.th,locked:0,com:0,ph:'tell',caught:null,carry:[],fx:p.x,fz:p.z};
      a.h=mg2Tel('scoop',{col:'red',shape:'band',x:MGC.X,z:MGC.Z,r0:a.r-K.SCOOP_BAND,r:a.r+K.SCOOP_BAND,th:a.th,dth:Math.PI/4,y0:F-1,y1:F+K.SCOOP_H,impactT:mg2Now()+K.SCOOP_TELL});   /* the sweep's start: the band's near end is touched first */
      mg2SetCD('scoop',mg2Low()?K.SCOOP_CD_LOW:K.SCOOP_CD);MGA.stance='lean';
      const arm=hand==='L'?'armL':'armR';MGA[arm]={pose:'scoop',t:0,x:p.x,y:F,z:p.z};mg2S('mg_scrape',p.x,F,p.z);return a;},
    tick:function(a,e,dt){const K=MG2K.R1,F=mgF();a.t+=dt;const arm=a.hand==='L'?'armL':'armR';
      if(!a.locked&&!a.demo){const p=mg2TPos(a.tg);if(mg2Alive(a.tg)){const pr=mgPol(p.x,p.z);a.r=Math.max(9,Math.min(22,pr.r));a.th=a.th+mg2Ang(pr.th-a.th)*Math.min(1,dt*3);}
        a.h.set({r0:a.r-K.SCOOP_BAND,r:a.r+K.SCOOP_BAND,th:a.th});}
      if(!a.locked&&a.t+dt>K.SCOOP_TELL-K.SCOOP_LOCK){a.locked=1;mg2Lock(a.h);}
      if(!a.com&&a.t>=K.SCOOP_TELL-MG_K.COMMIT){a.com=1;mg2Commit(MGC.X+Math.cos(a.th)*a.r,F,MGC.Z+Math.sin(a.th)*a.r);}
      if(a.t<K.SCOOP_TELL){MGA[arm].t=a.t/K.SCOOP_TELL;return false;}
      /* the sweep: the hand travels from th - dir*45 to th + dir*45 in 1.2 s; it catches the first player in the band, stops on bedrock */
      const k=Math.min(1,(a.t-K.SCOOP_TELL)/K.SCOOP_SWEEP),a0=a.th-a.dir*Math.PI/4,ang=a0+a.dir*(Math.PI/2)*k,prev=a.ang==null?a0:a.ang;a.ang=ang;
      const hx=MGC.X+Math.cos(ang)*a.r,hz=MGC.Z+Math.sin(ang)*a.r;MGA[arm]={pose:'scoop',t:k,x:hx,y:F,z:hz};
      if(!a.hitMech){a.hitMech=1;mg2Impact();mg2Mech('scoop');}
      if(!a.caught&&!a.stop){
        for(let rr=a.r-K.SCOOP_BAND;rr<=a.r+K.SCOOP_BAND;rr+=0.9){const cx=Math.floor(MGC.X+Math.cos(ang)*rr),cz=Math.floor(MGC.Z+Math.sin(ang)*rr);
          for(let y=F;y<=F+1;y++){const id=getBlock(cx,y,cz);if(id===B.AIR)continue;
            if(id===B.BEDROCK){a.stop=1;mg2Burst('spark',cx+0.5,y+0.5,cz+0.5,{id:B.BEDROCK,n:10});mg2S('mg_crack',cx,y,cz);mg2Shake(0.25,0.3);break;}
            if(!mgProtect(cx,y,cz,B.AIR)||!a.demo)mg2EatCell(cx,y,cz,'scoop');}                /* any other cover is eaten and the hand carries on */
          if(a.stop)break;}
        if(!a.stop){for(const t of mg2Players()){const p=mg2TPos(t),pr=mgPol(p.x,p.z);
            if(Math.abs(pr.r-a.r)>K.SCOOP_BAND||p.y<F-1||p.y>F+K.SCOOP_H)continue;
            const d0=mg2Ang(pr.th-prev),d1=mg2Ang(pr.th-ang);if(!(d0*d1<=0&&Math.abs(d0)<0.8)&&Math.abs(d1)>0.12)continue;
            if(t!==P&&mg2Eaten(t))continue;a.caught=t;break;}
          for(const m of MG2.adds){if(m.dead)continue;const pr=mgPol(m.x,m.z);if(Math.abs(pr.r-a.r)<=K.SCOOP_BAND&&Math.abs(mg2Ang(pr.th-ang))<0.15)a.carry.push(m);}}
        if(a.caught||(a.demo&&Math.abs(mg2Ang(ang-a.th))<0.1)){mg2Free(a.h);a.h=null;mg2R1Lift(a,hx,hz);return true;}}
      if(a.stop){MGA[arm].pose='recoil';}
      if(k>=1||a.stop){MGA[arm]={pose:'rest',t:0};return true;}
      return false;},
    free:function(a){mg2Free(a.h);}},
  /* CRUMB SPRAY: cheeks bulge 1.0 s, then 7 crumbs in a 40 deg cone; every shadow is fixed at launch; each lands as a real block */
  crumbs:{start:function(e,tg){const K=MG2K.R1,p=mg2TPos(tg);mg2SetCD('crumbs',K.CRUMB_CD);
      const a={k:'crumbs',t:0,tg,x:p.x,z:p.z,list:[],fx:p.x,fz:p.z,n:MGF.round===2?MG2K.R2.CRUMB_N:K.CRUMB_N};MGA.jaw=0.2;mg2S('mg_chew',e.x,mgF()+5,e.z);return a;},
    tick:function(a,e,dt){const F=mgF();a.t+=dt;
      if(a.t<1.0){MGA.jaw=0.2+0.1*Math.sin(a.t*20);if(mg2Alive(a.tg)){const p=mg2TPos(a.tg);a.x=p.x;a.z=p.z;a.fx=p.x;a.fz=p.z;}return false;}
      if(!a.launched){a.launched=1;mg2Impact();mg2Mech('crumbs');const m=mg2Mouth(),base=Math.atan2(a.z-m.z,a.x-m.x),dist=Math.hypot(a.x-m.x,a.z-m.z);
        for(let i=0;i<a.n;i++){const ang=base+(i/(a.n-1)-0.5)*0.7+mg2Rng(-0.06,0.06),d=Math.max(4,Math.min(26,dist+mg2Rng(-3.5,3.5)));
          const lx=m.x+Math.cos(ang)*d,lz=m.z+Math.sin(ang)*d,fl=0.9+0.4*Math.min(1,d/22);
          const c={x0:m.x,y0:m.y,z0:m.z,x:lx,z:lz,t:0,fl,id:mg2R1CrumbId()};
          c.h=mg2Tel('crumb',{col:'white',shape:'disc',x:lx,z:lz,r:1.0,y0:F-0.5,y1:F+2.0,impactT:mg2Now()+fl});mg2Lock(c.h);
          a.list.push(c);}
        MGA.jaw=0.6;mg2S('mg_spit',m.x,m.y,m.z);}
      let live=0;
      for(const c of a.list){if(c.done)continue;c.t+=dt;const k=Math.min(1,c.t/c.fl);live++;
        if(!c.m&&typeof THREE!=='undefined'&&DEFS[c.id]&&DEFS[c.id]._t){c.m=new THREE.Mesh(mkCubeGeo(c.id,0.6),matOp);scene.add(c.m);}
        const x=c.x0+(c.x-c.x0)*k,z=c.z0+(c.z-c.z0)*k,y=c.y0+(F+0.3-c.y0)*k+5*k*(1-k);if(c.m){c.m.position.set(x,y,z);c.m.rotation.x+=dt*7;}
        if(k>=1){c.done=1;mg2Free(c.h);if(c.m&&c.m.parent)c.m.parent.remove(c.m);let hit=0;
          for(const t of mg2Players()){const p=mg2TPos(t);if(Math.hypot(p.x-c.x,p.z-c.z)<=1.0&&p.y>=F-0.5&&p.y<=F+2.0){hit=1;mg2Hit(t,MG2K.R1.CRUMB_DMG,MG_K.PIERCE,'crumb',{atk:1,kx:p.x-c.x,kz:p.z-c.z});}}
          const cx=Math.floor(c.x),cz=Math.floor(c.z),gy=mg2Floor(c.x,c.z);
          if(!hit&&gy>-99&&gy<=F&&getBlock(cx,gy,cz)===B.AIR&&MG2.L.crumbN<MG2K.R1.RUBBLE_MAX&&mg2RubbleOK(cx,gy,cz)){mg2PutCell(cx,gy,cz,c.id);MG2.L.crumbN++;}
          mg2Burst('dust',c.x,F+0.3,c.z,{id:c.id,n:5});mg2S('thud',c.x,F,c.z);}}
      return a.launched&&live===0;},
    free:function(a){for(const c of a.list){mg2Free(c.h);if(c.m&&c.m.parent)c.m.parent.remove(c.m);}}}
};
/* rubble lands scattered (never in a cluster) and never within 3 m of a player: cover to use, not a cage */
function mg2RubbleOK(x,y,z){for(const t of mg2Players()){const p=mg2TPos(t);if(Math.hypot(p.x-x-0.5,p.z-z-0.5)<3)return false;}
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){if(!dx&&!dz)continue;if(mg2Solid(x+dx,y,z+dz))return false;}return true;}
/* a weak point rides its joint (M3's rig zone) when the model is live, never more than 2.5 m from where the attack landed */
function mg2ZoneFollow(zn,x0,z0,y0){return function(e,w,dt){const b=mg2Boss(),r=b&&b.mgRig;if(!r||!r.zone)return;let p=null;try{p=r.zone(zn);}catch(err){}
    if(!p||!isFinite(p.x))return;if(Math.hypot(p.x-x0,p.z-z0)>2.5)return;e.x=p.x;e.z=p.z;e.y=Math.max(y0-0.6,Math.min(y0+0.6,p.y-e.h*0.5));};}
function mg2R1Slide(s,p,dt){const dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz),m=9*dt;if(d<=m){s.x=p.x;s.z=p.z;}else{s.x+=dx/d*m;s.z+=dz/d*m;}}
function mg2R1SlapClamp(s){const pr=mgPol(s.x,s.z),K=MG2K.R1,r=Math.max(7.5,Math.min(K.REACH,pr.r));s.x=MGC.X+Math.cos(pr.th)*r;s.z=MGC.Z+Math.sin(pr.th)*r;}
/* one hand's slap: slide, lock, flash, impact (shared by the single and the double slap) */
function mg2R1SlapStep(a,s,dt,e){const K=MG2K.R1,F=mgF(),arm=s.hand==='L'?'armL':'armR';
  if(s.hit)return true;
  if(!s.locked){if(s===a){const p=mg2TPos(a.tg);if(mg2Alive(a.tg))mg2R1Slide(s,p,dt);mg2R1SlapClamp(s);}s.h.set({x:s.x,z:s.z});}
  if(!s.locked&&a.t+dt>s.tell-MG_K.SLAP_LOCK){s.locked=1;mg2Lock(s.h);}                     /* the last frame before T - 0.95: never late */
  if(!s.com&&a.t>=s.tell-MG_K.COMMIT){s.com=1;mg2Commit(s.x,F+4,s.z);}
  MGA[arm]={pose:a.t<s.tell-0.12?'raise':'slam',t:a.t<s.tell-0.12?Math.min(1,a.t/(s.tell-0.12)):Math.min(1,(a.t-s.tell+0.12)/0.12),x:s.x,y:F,z:s.z};
  a.fx=s.x;a.fz=s.z;
  if(a.t<s.tell)return false;
  s.hit=1;mg2Impact();mg2Mech('slap');mg2Free(s.h);s.h=null;
  for(const t of mg2Players()){const p=mg2TPos(t),d=Math.hypot(p.x-s.x,p.z-s.z);if(d>K.SLAP_R||p.y<F-1||p.y>F+4)continue;
    const n=d<=K.SLAP_IN?K.SLAP_HI:K.SLAP_LO;mg2Hit(t,n,MG_K.PIERCE,'slap',{atk:1,kx:p.x-s.x,kz:p.z-s.z});
    if(d<=K.SLAP_IN&&mg2Alive(t))mg2Knock(t,s.x,s.z,3,{apex:1.2});}
  for(const m of MG2.adds)if(!m.dead&&Math.hypot(m.x-s.x,m.z-s.z)<=K.SLAP_R&&m.y<F+4)mg2AddDie(m,'squash');   /* he slaps his own leftovers flat */
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){if(dx*dx+dz*dz>K.SLAP_R*K.SLAP_R+0.5)continue;const cx=Math.floor(s.x)+dx,cz=Math.floor(s.z)+dz;
    for(let y=F;y<=F+4;y++){const id=getBlock(cx,y,cz);if(id!==B.AIR&&id!==B.BEDROCK)mg2EatCell(cx,y,cz,'slap');}}          /* the roof over you is no cover */
  if(!MG2.haz)MG2.haz=[];MG2.haz.push({k:'grind',src:s,x:s.x,z:s.z,r:1.5,t:K.EYE_DELAY+K.EYE_T,next:0.5,dt:K.GRIND_T,n:K.GRIND,how:'grind',y0:F-2,y1:F+0.6});
  mg2Burst('dust',s.x,F+0.2,s.z,{id:B.OBSIDIAN,n:14,pw:1.4});mg2Shake(0.32,0.35);mg2S('mg_slap',s.x,F,s.z);
  return true;}
/* the HAND-EYE window: the lid opens at +0.4 for 2.8 s on the back of the hand, 1.2 m up, GOLD, cap 30 */
function mg2R1HandEye(s,t){const K=MG2K.R1,F=mgF(),arm=s.hand==='L'?'armL':'armR';const eye=s.hand==='L'?'eyeL':'eyeR';
  MGA[arm]={pose:'flat',t:1,x:s.x,y:F,z:s.z};MGA[eye]=1;
  mg2OpenWin('handeye',{x:s.x,y:F+0.7,z:s.z,hw:0.6,h:1.0,t:t==null?K.EYE_T:t,cap:K.EYE_CAP,follow:mg2ZoneFollow('handeye'+s.hand,s.x,s.z,F+0.7),
    recoil:function(w){for(const q of mg2Players()){const p=mg2TPos(q);if(Math.hypot(p.x-s.x,p.z-s.z)<3.2)mg2Knock(q,s.x,s.z,4,{apex:0.8});}},
    end:function(why,w){MGA[eye]=0;MGA[arm]={pose:'rest',t:0};MG2.haz=MG2.haz.filter(h=>h.src!==s);}});}   /* the hand lifts: the palm stops chewing */

/* ---- the self-demo target and the Meal (the Pen at theta 270, r 17) ---- */
function mg2R1PenAlive(){const F=mgF(),x=Math.floor(MGC.X),z=Math.floor(MGC.Z-17);
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){const id=getBlock(x+dx,F+1,z+dz);if(id===B.LOG_O||id===B.PLANK_O)return true;}
  return mg2Cows(x+0.5,z+0.5,4).length>0;}
function mg2Cows(x,z,r){const out=[];for(const m of entities)if(m.t==='mob'&&!m.dead&&m.mt==='cow'&&Math.hypot(m.x-x,m.z-z)<=r&&Math.abs(m.y-mgF())<3)out.push(m);return out;}
function mg2R1CrumbId(){const pool=[B.DIRT,B.STONE,B.PLANK_O,B.COAL_ORE,B.IRON_ORE,B.COBBLE];
  if(!MG2.L.crumbDia&&MGF.round===1&&mg2R()<0.12){MG2.L.crumbDia=1;return B.DIA_ORE;}return pool[Math.floor(mg2R()*pool.length)]||B.DIRT;}

/* ---- the lift and the ride (bible 8.2): the slab rises 2.0 s to hang before his mouth, the fingers grind, the jaw splits, the
   tongue licks out for the last 1.2 s; stab it (or jump, or blink) or be chomped at 2.5 s ---- */
function mg2R1Lift(a,hx,hz){const K=MG2K.R1,F=mgF(),tg=a.caught;
  const cx=Math.floor(tg?mg2TPos(tg).x:hx),cz=Math.floor(tg?mg2TPos(tg).z:hz);
  const cells=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let y=F-3;y<=F+2;y++){const x=cx+dx,z=cz+dz,id=getBlock(x,y,z);
      if(id===B.AIR||id===B.BEDROCK||id===B.WATER)continue;if(Math.hypot(x+0.5-MGC.X,z+0.5-MGC.Z)>24.5)continue;cells.push([x,y,z,id]);}
  const top=cells.filter(c=>c[1]===F-1||c[1]>=F),mesh=mg2SlabMesh(top,cx,cz);
  for(const c of cells)mg2EatCell(c[0],c[1],c[2],'scoop');
  const cows=mg2Cows(cx+0.5,cz+0.5,3.8);for(const m of cows)removeEnt(m);
  for(const m of a.carry)if(!m.dead)removeEnt(m);
  const pr=mgPol(cx+0.5,cz+0.5),mr=11,mx=MGC.X+Math.cos(pr.th)*mr,mz=MGC.Z+Math.sin(pr.th)*mr;
  const R={t:0,ph:'lift',x0:cx+0.5,y0:F,z0:cz+0.5,x1:mx,y1:F+6,z1:mz,tg,demo:a.demo,mesh,cows:cows.length,adds:a.carry.length,
    mouth:{x:MGC.X+Math.cos(pr.th)*8.4,y:F+6.6,z:MGC.Z+Math.sin(pr.th)*8.4},tongue:!(MG2.L.tongue>=K.TONGUE_LEARN),hits:0,landed:0,grind:0.5,hand:a.hand,
    off:tg?{x:mg2TPos(tg).x-(cx+0.5),z:mg2TPos(tg).z-(cz+0.5)}:{x:0,z:0}};
  MG2.ride=R;MGA.stance='lean';
  if(tg===P){mg2HoldDan(P.x,F,P.z,{ease:0.6,look:R.mouth,rel:function(why){mg2RideRelease(why);}});mg2Mech('ride');}
  else if(tg){mg2Swallow(tg,'scoop');R.tg=null;}
  mg2S('mg_chew',hx,F,hz);mg2Shake(0.3,0.4);}
function mg2SlabMesh(cells,cx,cz){if(typeof THREE==='undefined')return null;const ch=mg2Fx('chunk');
  if(ch&&cells.length){try{const h=ch(cells.map(c=>({id:c[3],x:c[0],y:c[1],z:c[2]})));const o=[h.c[0]-(cx+0.5),h.c[1]-mgF(),h.c[2]-(cz+0.5)];
      return {mgChunk:h,position:{set:function(x,y,z){h.set(x+o[0],y+o[1],z+o[2]);}},parent:null,drop:h};}catch(err){mgFail('chunk',err);}}
  const G=new THREE.Group();
  try{for(const c of cells){if(!DEFS[c[3]]||!DEFS[c[3]]._t)continue;const m=new THREE.Mesh(mkCubeGeo(c[3],1),c[3]&&DEFS[c[3]].bucket==='cut'?matCut:matOp);
      m.position.set(c[0]-cx,c[1]-mgF()+0.5,c[2]-cz);G.add(m);}}catch(err){mgFail('slab',err);}
  G.position.set(cx+0.5,mgF(),cz+0.5);scene.add(G);return G;}
function mg2RideTick(e,dt){const R=MG2.ride,K=MG2K.R1,F=mgF();R.t+=dt;const arm=R.hand==='L'?'armL':'armR';
  let x,y,z;
  if(R.ph==='lift'){const k=Math.min(1,R.t/K.RIDE),s=k*k*(3-2*k);x=R.x0+(R.x1-R.x0)*s;y=R.y0+(R.y1-R.y0)*s;z=R.z0+(R.z1-R.z0)*s;
    if(R.tg===P){R.grind-=dt;if(R.grind<=0){R.grind+=K.GRIND_T;mg2Hit(P,K.GRIND,MG_K.PIERCE,'grind',{tick:1});}}
    if(k>=1){R.ph='mouth';R.t=0;}}
  else if(R.ph==='mouth'){x=R.x1;y=R.y1;z=R.z1;MGA.jaw=Math.min(1,R.t/0.6);MGA.split=MGA.jaw;
    const dur=R.tongue?K.MOUTH:K.NOTONGUE;
    if(R.tongue&&!R.tw&&R.t>=dur-K.TONGUE_OUT){R.tw=1;mg2R1Tongue(R);}
    if(R.tw&&MG2.win&&MG2.win.kind==='tongue'){const w=MG2.win,s=Math.sin(R.t*3.1);MGA.tongue=1;w.part.x=x+R.off.x*0.5+s*0.9;w.part.z=z+R.off.z*0.5;w.part.y=y;}
    if(!R.com&&R.t>=dur-MG_K.COMMIT){R.com=1;mg2Commit(x,y,z);}
    if(R.t>=dur){mg2RideChomp();return;}}
  else if(R.ph==='drop'){R.vy=(R.vy||0)-24*dt;R.yy=(R.yy==null?R.y1:R.yy)+R.vy*dt;x=R.x1;z=R.z1;y=R.yy;
    if(y<=F){mg2RideShatter();return;}}
  if(R.mesh)R.mesh.position.set(x,y,z);
  MGA[arm]={pose:R.ph==='drop'?'rest':'lift',t:1,x,y,z};
  if(R.tg===P&&MG2.holdDan&&MG2.holdDan.k==='hold')mg2MoveHold(x+R.off.x,y,z+R.off.z);}
function mg2R1Tongue(R){const K=MG2K.R1;
  mg2OpenWin('tongue',{x:R.x1,y:R.y1,z:R.z1,hw:0.6,h:1.2,t:K.TONGUE_OUT,cap:K.TONGUE_CAP,mult:MG_K.TONGUE,
    end:function(why,w){MGA.tongue=0;if(w.danHit)MG2.L.tongue++;if(why==='cap'||why==='hits')mg2RideDrop('tongue');},
    recoil:null});
  const w=MG2.win;w.hitsLeft=K.TONGUE_HITS;}
function mg2RideChomp(){const R=MG2.ride;if(!R)return;mg2CloseWin('ride');MGA.tongue=0;
  if(R.tg===P&&MG2.holdDan){MG2.holdDan=null;MG2.chompHow=MG2.L.tongue>=MG2K.R1.TONGUE_LEARN?'ride2':'ride';mg2Chomp(P,'chomp');}
  else{mg2S('mg_chomp');MGA.jaw=0;MGA.split=0;}
  if(R.cows)mg2Heal(R.cows*MG2K.R1.COW);if(R.adds)mg2Heal(R.adds*2);
  if(R.demo){const pf=mg2Fx('prop'),l=mg2Land(R.x1+mg2Rng(-3,3),R.z1+mg2Rng(-3,3),{});if(pf)try{pf('bone',l.x,mgF(),l.z,{});}catch(err){}mg2Burst('bone',R.x1,R.y1,R.z1,{id:B.STONE,n:6});mg2S('mg_spit');}
  if(R.cows)MG2.bellyCows=mg2Now()+6;
  mg2RideEnd();}
function mg2RideDrop(why){const R=MG2.ride;if(!R||R.ph==='drop')return;R.ph='drop';R.vy=0;R.yy=R.y1;MGA.tongue=0;MGA.jaw=0.3;mg2S('mg_retch');
  if(R.tg===P&&MG2.holdDan){MG2.holdDan=null;P.vy=0;}}
function mg2RideRelease(why){const R=MG2.ride;if(!R)return;R.tg=null;}
function mg2RideShatter(){const R=MG2.ride,F=mgF();if(!R)return;const cx=Math.floor(R.x1),cz=Math.floor(R.z1);
  for(let i=0;i<5;i++){const x=cx+Math.round(mg2Rng(-1.6,1.6)),z=cz+Math.round(mg2Rng(-1.6,1.6)),gy=mg2Floor(x+0.5,z+0.5);
    if(gy>-99&&getBlock(x,gy,z)===B.AIR)mg2PutCell(x,gy,z,mg2R()<0.5?B.COBBLE:B.DIRT);}
  mg2Burst('dust',R.x1,F+0.5,R.z1,{id:B.OBSIDIAN,n:16,pw:1.6});mg2Shake(0.3,0.3);mg2S('mg_slap',R.x1,F,R.z1);mg2RideEnd();}
function mg2RideEnd(){const R=MG2.ride;if(!R)return;if(R.mesh&&R.mesh.mgChunk){try{R.mesh.mgChunk.free();}catch(err){}}else if(R.mesh&&R.mesh.parent)R.mesh.parent.remove(R.mesh);MG2.ride=null;
  MGA.armL={pose:'rest',t:0};MGA.armR={pose:'rest',t:0};MGA.jaw=0;MGA.split=0;MG2.gap=Math.max(MG2.gap,mg2Gap());}

/* ---- SNACK (reactive): no Dan hit for 6 s and Dan beyond his hands or out of sight: he eats a cow, a bite of the Meal, or cover ---- */
function mg2R1Snack(e){const K=MG2K.R1;if(!mg2CD('snack'))return false;const now=mg2Now();
  if(now-Math.max(MG2.lastDanHit,MG2.startT)<K.SNACK)return false;
  const pr=mgPol(P.x,P.z);if(!(pr.r>K.REACH||P.dead||!mg2InPlay(P)))return false;
  mg2SetCD('snack',8);const F=mgF();let ate=0,x=MGC.X,z=MGC.Z;
  const cows=[];for(const m of entities)if(m.t==='mob'&&!m.dead&&m.mt==='cow'&&mgArena(m.x,m.y,m.z))cows.push(m);
  if(cows.length){const c=cows[0];x=c.x;z=c.z;removeEnt(c);mg2Heal(K.COW);ate=1;}
  else{let n=0;for(let i=0;i<60&&n<6;i++){const th=mg2R()*Math.PI*2,r=mg2Rng(8,22),cx=Math.floor(MGC.X+Math.cos(th)*r),cz=Math.floor(MGC.Z+Math.sin(th)*r);
      for(let y=F;y<=F+4;y++){const id=getBlock(cx,y,cz);if(id!==B.AIR&&id!==B.BEDROCK){mg2EatCell(cx,y,cz,'snack');n++;x=cx;z=cz;}}}
    ate=n>0;}
  if(ate){mg2Mech('snack');MGA.armR={pose:'grab',t:1,x,y:F,z};MG2.beat=Math.max(MG2.beat,1.6);mg2S('mg_chew',x,F,z);}
  return ate;}
