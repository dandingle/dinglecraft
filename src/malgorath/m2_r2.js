/* ---- PART 57: m2_r2.js ---- */
/* ===================================================================== */
/* PART 57 m2 (M2): Round II, THE PLATE (bible 9). He stalks the plate,  */
/* hunched and knuckle-walking (crown at 10-11 m, 3.5 m/s, 11-14 m from  */
/* his target, never inside r 9 or over a scar), lunging jaw-first down  */
/* a line of RED drool and eating a trench. Bedrock breaks his teeth (he */
/* learns: two cracks per spire), anything lit gives him a bellyache (he */
/* learns: two per round), hugging his legs gets the squat, standing     */
/* before him the stomp, behind him the tail.                            */
/* ===================================================================== */
var MG2SPIRES=[[11,11],[-11,11],[-11,-11],[11,-11]];                       /* relative to C (bible 3.4) */
var MG2SCARS=[[15.6,9.0],[-15.6,9.0],[0,-17]];                             /* the Meal's plinths: scars in L2 */
function mg2R2Spires(){const F=mgF(),out=[];for(const s of MG2SPIRES){const x=Math.floor(MGC.X+s[0]),z=Math.floor(MGC.Z+s[1]);
    if(getBlock(x,F+1,z)===B.BEDROCK)out.push({x:x+0.5,z:z+0.5,k:s[0]+','+s[1]});}return out;}
/* where his centre may stand: on the plate between r 9 and 22, never over a scar or a hole */
function mg2R2Legal(x,z){const p=mgPol(x,z);if(p.r<9||p.r>22)return false;for(const s of MG2SCARS)if(Math.hypot(x-MGC.X-s[0],z-MGC.Z-s[1])<5.5)return false;
  for(const s of mg2R2Spires())if(Math.hypot(x-s.x,z-s.z)<3.2)return false;return true;}
function mg2R2Clamp(x,z,fx,fz){if(mg2R2Legal(x,z))return {x,z};const p=mgPol(x,z);
  for(let i=1;i<=24;i++){const r=Math.max(9.5,Math.min(21.5,p.r)),th=p.th+(i>>1)*0.13*(i%2?1:-1),cx=MGC.X+Math.cos(th)*r,cz=MGC.Z+Math.sin(th)*r;if(mg2R2Legal(cx,cz))return {x:cx,z:cz};}
  return {x:fx,z:fz};}
function mg2R2Fwd(e){return [Math.sin(e.yaw),Math.cos(e.yaw)];}
function mg2R2Head(e){const f=mg2R2Fwd(e);return {x:e.x+f[0]*5,z:e.z+f[1]*5};}

/* ---- the brain of Round II ---- */
function mg2R2Brain(e,dt){const F=mgF(),K=MG2K.R2;e.y=F;
  const a=MG2.atk;MGA.light.at='chest';MGA.light.i=2.0;
  if(!a&&!MG2.win&&!MGA.stanceLock)MGA.stance='stalk';
  if(a){const f=MG2R2[a.k]||MG2R1[a.k];if(f&&f.tick(a,e,dt))mg2End(a);mg2R2Step(e,dt,0);return;}
  if(MG2.win){mg2R2Step(e,dt,0);return;}
  const tg=mg2Pick(e.x,e.z);
  mg2R2Walk(e,dt,tg);
  if(MG2.gap>0){MG2.gap-=dt;return;}
  MG2.sel-=dt;
  if(mg2Docile()||!tg)return;
  const tp=mg2TPos(tg),dx=tp.x-e.x,dz=tp.z-e.z,d=Math.hypot(dx,dz),rel=Math.abs(mg2Ang(Math.atan2(dx,dz)-e.yaw));
  /* reactive moves pre-empt the selector: the squat (hugging), the stomp (before him), the tail (behind him) */
  const id=mg2TId(tg),hold=MG2.r2hold||(MG2.r2hold={});const h=hold[id]||(hold[id]={sq:0,st:0,tl:0});
  h.sq=d<K.SQUAT_R?h.sq+dt:0;h.st=(d<6&&rel<1.9)?h.st+dt:0;h.tl=(d<K.TAIL_R&&rel>Math.PI/2)?h.tl+dt:0;
  let k=null;
  if(h.sq>=K.SQUAT_T&&mg2CD('squat'))k='squat';
  else if(h.tl>=K.TAIL_TRIG&&mg2CD('tail'))k='tail';
  else if(h.st>=K.STOMP_TRIG&&mg2CD('stomp')&&d>2.5)k='stomp';
  if(!k){if(MG2.sel>0)return;MG2.sel=mg2SelT(K);
    const L=[],idle=mg2Now()-(MG2.lastAtkT||0)>6;                                            /* he never stands about: a stalled stalk spits */
    if(mg2CD('lunge')&&d>=6&&d<=K.LUNGE_MAX&&mg2R2LungeOK(e,tg))L.push(['lunge',K.W.lunge]);
    if(mg2CD('crumbs')&&(d>K.CRUMB_MIN||(idle&&d>6))&&MG2.L.crumbN<MG2K.R1.RUBBLE_MAX)L.push(['crumbs',K.W.crumbs]);
    if(!L.length)return;k=mg2Weighted(L);}
  h.sq=h.st=h.tl=0;mg2Token(tg);
  mg2Begin(k==='crumbs'?MG2R1.crumbs.start(e,tg):MG2R2[k].start(e,tg));}
/* the stalk: keep 11-14 m from the target, round the Throat and the scars, feet on the plate; footfalls shake */
function mg2R2Walk(e,dt,tg){const K=MG2K.R2;
  if(!tg){mg2R2Step(e,dt,0);return;}
  const p=mg2TPos(tg),dx=e.x-p.x,dz=e.z-p.z,d=Math.hypot(dx,dz)||1;
  e.yaw=mg2Turn(e.yaw,mg2Yaw(p.x-e.x,p.z-e.z),K.TURN,dt);
  let want=null;
  if(d>K.KEEP[1])want={x:p.x+dx/d*12.5,z:p.z+dz/d*12.5};else if(d<K.KEEP[0])want={x:p.x+dx/d*12.5,z:p.z+dz/d*12.5};
  if(want&&d<K.KEEP[0]&&!mg2R2Legal(want.x,want.z)){const a0=Math.atan2(dz,dx);let best=null,bd=1e9;   /* backing off into the Throat or the wall: the nearest legal spot at 12.5 m */
    for(let i=1;i<=16;i++){const a=a0+(i>>1)*0.39*(i%2?1:-1),x=p.x+Math.cos(a)*12.5,z=p.z+Math.sin(a)*12.5;if(!mg2R2Legal(x,z))continue;const c=Math.hypot(x-e.x,z-e.z);if(c<bd){bd=c;best={x,z};}}
    if(best)want=best;}
  if(!mg2R2LungeOK(e,tg)){const keep=MG2.r2to;                                             /* a spire he has learned is in the way: he walks round it */
    if(keep&&mg2Now()-keep.t<4&&Math.hypot(keep.x-e.x,keep.z-e.z)>0.6)want=keep;              /* and keeps to the way he chose (no dithering) */
    else{const a0=Math.atan2(dz,dx);let best=null,bd=1e9;
      for(let i=1;i<=16;i++){const a=a0+(i>>1)*0.33*(i%2?1:-1),x=p.x+Math.cos(a)*12.5,z=p.z+Math.sin(a)*12.5;if(!mg2R2Legal(x,z))continue;
        const fake={x,z,yaw:mg2Yaw(p.x-x,p.z-z)},L=mg2R2Line(fake,p.x,p.z),hit=mg2R2Bedrock(L);if(hit&&(MG2.L.cracks[mg2R2SpireOf(hit.x,hit.z)]||0)>=K.CRACK_LEARN)continue;
        const c=Math.hypot(x-e.x,z-e.z);if(c<bd){bd=c;best={x,z,t:mg2Now()};}}
      MG2.r2to=best;if(best)want=best;}}
  else MG2.r2to=null;
  if(want){const pb=mgPol(e.x,e.z),pw=mgPol(want.x,want.z),da=mg2Ang(pw.th-pb.th);           /* round the Throat, never through it */
    if(Math.abs(da)>0.55&&(pw.r<12||pb.r<12||Math.abs(da)>1.2)){const a=pb.th+Math.sign(da)*0.5,r=Math.max(13,Math.min(20,pb.r));want={x:MGC.X+Math.cos(a)*r,z:MGC.Z+Math.sin(a)*r};}}
  if(want&&!(MG2.beat>0)){const w=mg2R2Clamp(want.x,want.z,e.x,e.z),mx=w.x-e.x,mz=w.z-e.z,ml=Math.hypot(mx,mz);
    if(ml>0.3){const s=Math.min(ml,K.WALK*dt),nx=e.x+mx/ml*s,nz=e.z+mz/ml*s;if(mg2R2Legal(nx,nz)){e.x=nx;e.z=nz;}else{const c=mg2R2Clamp(nx,nz,e.x,e.z);e.x=c.x;e.z=c.z;}mg2R2Step(e,dt,1);return;}}
  mg2R2Step(e,dt,0);}
function mg2R2Step(e,dt,moving){if(!moving){MG2.stepT=0.45;return;}MG2.stepT=(MG2.stepT||0.45)-dt;
  if(MG2.stepT<=0){MG2.stepT=0.9;const F=mgF(),d=Math.hypot(P.x-e.x,P.z-e.z);mg2Burst('dust',e.x,F+0.2,e.z,{id:B.OBSIDIAN,n:5,pw:1});
    if(d<30)mg2Shake(Math.max(0.03,0.22*(1-d/30)),0.25);mg2S('mg_step',e.x,F,e.z);}}
/* a lunge line never runs into a spire he has learned (he walks round it instead) */
function mg2R2Line(e,tx,tz,extra){const h=mg2R2Head(e),dx=tx-h.x,dz=tz-h.z,d=Math.hypot(dx,dz)||1,ux=dx/d,uz=dz/d,len=Math.min(MG2K.R2.LUNGE_MAX,d+(extra||3));
  return {x:h.x,z:h.z,ux,uz,len,yaw:Math.atan2(-ux,-uz)};}
function mg2R2Bedrock(L){const F=mgF();for(let s=0.5;s<=L.len;s+=0.5){const x=Math.floor(L.x+L.ux*s),z=Math.floor(L.z+L.uz*s);
    for(let y=F;y<=F+2;y++)if(getBlock(x,y,z)===B.BEDROCK)return {s,x,z};}return null;}
function mg2R2SpireOf(x,z){let best=null,bd=3.2;for(const s of MG2SPIRES){const d=Math.hypot(x+0.5-MGC.X-s[0],z+0.5-MGC.Z-s[1]);if(d<bd){bd=d;best=s[0]+','+s[1];}}return best||(x+','+z);}
function mg2R2LungeOK(e,tg){const p=mg2TPos(tg),L=mg2R2Line(e,p.x,p.z),hit=mg2R2Bedrock(L);if(!hit)return true;
  const h=mg2R2Head(e);if(hit.s>Math.hypot(p.x-h.x,p.z-h.z)+0.3)return true;                /* bedrock beyond the target only shortens the line */
  const k=mg2R2SpireOf(hit.x,hit.z);return (MG2.L.cracks[k]||0)<MG2K.R2.CRACK_LEARN;}

var MG2R2={
  /* LUNGE BITE: he drops onto his knuckles, a RED drool line splashes to the target (+0.3 s of their motion) and sets at 0.3 s,
     then at 1.6 s he lunges jaw-first along it at 22 m/s: CHOMP on the line, 8 in the side band, a trench eaten behind him */
  lunge:{start:function(e,tg,chain){const K=MG2K.R2,F=mgF();const a={k:'lunge',t:0,tg,set:0,com:0,ph:'tell',hit:{},chain:!!chain,tell:chain?(K.LUNGE_SET+1.3):K.LUNGE_TELL};
      mg2SetCD('lunge',K.LUNGE_CD);MGA.stance='knuckle';MGA.jaw=0.35;mg2S('mg_stab2',e.x,F+8,e.z);return a;},
    tick:function(a,e,dt){const K=MG2K.R2,F=mgF();a.t+=dt;
      if(!a.set){const p=mg2TPos(a.tg);if(mg2Alive(a.tg))e.yaw=mg2Turn(e.yaw,mg2Yaw(p.x-e.x,p.z-e.z),3,dt);
        if(a.t>=K.LUNGE_SET||!mg2Alive(a.tg)){a.set=1;const vx=p.vx||0,vz=p.vz||0,tx=p.x+vx*0.3,tz=p.z+vz*0.3;
          const L=mg2R2Line(e,tx,tz,a.chain?6:3);a.L=L;let br=mg2R2Bedrock(L);
          if(br&&br.s>Math.hypot(tx-L.x,tz-L.z)+0.3){L.len=Math.max(1,br.s-0.7);br=null;}       /* a spire behind the target ends the line */
          a.stopS=br?br.s:null;a.spire=br?mg2R2SpireOf(br.x,br.z):null;
          const shown=br?Math.max(0.5,br.s-0.4):L.len;                                      /* the drool ends at the bedrock */
          a.h=mg2Tel('lunge',{col:'red',shape:'line',x:L.x,z:L.z,yaw:L.yaw,len:shown,w:3,y0:F-1,y1:F+3,impactT:mg2Now()+(a.tell-a.t)});
          a.hs=mg2Tel('lungeSide',{col:'white',shape:'line',x:L.x,z:L.z,yaw:L.yaw,len:shown,w:7,y0:F-1,y1:F+3,impactT:mg2Now()+(a.tell-a.t)});
          mg2Lock(a.h);mg2Lock(a.hs);a.fx=L.x+L.ux*L.len;a.fz=L.z+L.uz*L.len;mg2S('mg_stab2',L.x,F,L.z);}
        return false;}
      if(!a.com&&a.t>=a.tell-MG_K.COMMIT){a.com=1;mg2Commit(a.L.x,F+3,a.L.z);}
      if(a.ph==='tell'){mg2R2Eat(a,e,dt);if(a.t<a.tell)return false;a.ph='go';a.s=0;mg2Impact();mg2Mech('lunge');mg2S('mg_lunge',e.x,F+5,e.z);mg2Shake(0.35,0.4);}
      if(a.ph==='go'){const L=a.L,end=a.stopS!=null?a.stopS:L.len;const s0=a.s;a.s=Math.min(end,a.s+K.LUNGE_V*dt);
        const hx=L.x+L.ux*a.s,hz=L.z+L.uz*a.s;const c=mg2R2Clamp(hx-L.ux*5,hz-L.uz*5,e.x,e.z);e.x=c.x;e.z=c.z;
        MGA.stance='knuckle';MGA.jaw=1;MGA.split=0.6;
        for(let s=s0;s<=a.s;s+=0.5)mg2R2Trench(L,s);                                        /* he eats a trench behind his jaw */
        for(const t of mg2Players()){const id=mg2TId(t);if(a.hit[id])continue;const p=mg2TPos(t),rx=p.x-L.x,rz=p.z-L.z,al=rx*L.ux+rz*L.uz,sd=Math.abs(-rx*L.uz+rz*L.ux);
          if(al<0||al>a.s+0.4||al>end+0.6||p.y<F-1||p.y>F+3)continue;
          if(sd<=1.5){a.hit[id]=1;if(t===P){MG2.chompHow='lunge';mg2Chomp(P,'chomp',{dir:Math.atan2(p.z-MGC.Z,p.x-MGC.X)});}else mg2Swallow(t,'lunge');}
          else if(sd<=3.5){a.hit[id]=1;mg2Hit(t,K.LUNGE_SIDE,MG_K.PIERCE,'side',{atk:1,kx:p.x-(L.x+L.ux*al),kz:p.z-(L.z+L.uz*al)});}}
        for(const m of MG2.adds){if(m.dead)continue;const rx=m.x-L.x,rz=m.z-L.z,al=rx*L.ux+rz*L.uz,sd=Math.abs(-rx*L.uz+rz*L.ux);if(al>=0&&al<=a.s&&sd<=1.8)mg2R2Swallow(m);}
        mg2R2Lit(a,L,a.s);if(MG2.atk!==a)return true;                                  /* he swallowed something lit: the bellyache took over */
        if(a.s>=end){mg2Free(a.h);mg2Free(a.hs);a.h=a.hs=null;
          if(a.stopS!=null){mg2R2Crack(e,a);return true;}
          mg2R2Recover(e,a);return true;}
        return false;}
      return false;},
    free:function(a){mg2Free(a.h);mg2Free(a.hs);}},
  /* SQUAT (anti-hug): the pelvis drops, the floor round his hooves cracks WHITE (fixed at the tell's start), 12 + a shove to r 6 */
  squat:{start:function(e,tg){const K=MG2K.R2,F=mgF();mg2SetCD('squat',K.SQUAT_CD);
      const a={k:'squat',t:0,com:0,x:e.x,z:e.z,fx:e.x,fz:e.z};a.h=mg2Tel('squat',{col:'white',shape:'disc',x:e.x,z:e.z,r:K.SQUAT_HIT,y0:F-1,y1:F+3,impactT:mg2Now()+K.SQUAT_TELL});
      mg2Lock(a.h);MGA.stance='kneel';mg2S('mg_squat',e.x,F,e.z);return a;},
    tick:function(a,e,dt){const K=MG2K.R2,F=mgF();a.t+=dt;MGA.stance='kneel';
      if(!a.com&&a.t>=K.SQUAT_TELL-MG_K.COMMIT){a.com=1;mg2Commit(a.x,F+4,a.z);}
      if(a.t<K.SQUAT_TELL)return false;mg2Free(a.h);a.h=null;mg2Impact();mg2Mech('squat');mg2Shake(0.4,0.4);mg2S('mg_stomp',a.x,F,a.z);
      for(const t of mg2Players()){const p=mg2TPos(t),d=Math.hypot(p.x-a.x,p.z-a.z);if(d>K.SQUAT_HIT||p.y<F-1||p.y>F+3)continue;
        mg2Hit(t,K.SQUAT_DMG,MG_K.PIERCE,'squat',{atk:1});if(mg2Alive(t))mg2Knock(t,a.x,a.z,Math.max(1,6-d),{apex:1});}
      for(const m of MG2.adds)if(!m.dead&&Math.hypot(m.x-a.x,m.z-a.z)<=K.SQUAT_HIT)mg2AddDie(m,'squash');
      mg2Burst('dust',a.x,F+0.2,a.z,{id:B.OBSIDIAN,n:16,pw:1.6});return true;},
    free:function(a){mg2Free(a.h);}},
  /* STOMP: he rears to 16 m and lifts a hoof (its shadow fixed at the tell's start); the hoof falls, the 3x3 under it into the gut,
     a ring of cracks splits outward 0.35 s ahead of the shockwave (out to r 8 at 10 m/s): jump when the cracks reach your feet */
  stomp:{start:function(e,tg){const K=MG2K.R2,F=mgF(),f=mg2R2Fwd(e),p=mg2TPos(tg);mg2SetCD('stomp',K.STOMP_CD);
      const hx=e.x+f[0]*2.5,hz=e.z+f[1]*2.5,a={k:'stomp',t:0,com:0,x:hx,z:hz,ph:'tell',fx:hx,fz:hz,hit:{}};
      a.h=mg2Tel('stomp',{col:'white',shape:'disc',x:hx,z:hz,r:2,y0:F-1,y1:F+4,impactT:mg2Now()+K.STOMP_TELL});mg2Lock(a.h);
      MGA.stance='rear';MGA.stanceLock=1;mg2S('mg_slapup',hx,F+8,hz);return a;},
    tick:function(a,e,dt){const K=MG2K.R2,F=mgF();a.t+=dt;MGA.stance='rear';
      if(!a.com&&a.t>=K.STOMP_TELL-MG_K.COMMIT){a.com=1;mg2Commit(a.x,F+6,a.z);}
      if(a.ph==='tell'){if(a.t<K.STOMP_TELL)return false;a.ph='wave';a.t0=a.t;mg2Free(a.h);a.h=null;mg2Impact();mg2Mech('stomp');mg2Shake(0.55,0.5);mg2S('mg_stomp',a.x,F,a.z);
        for(const t of mg2Players()){const p=mg2TPos(t),d=Math.hypot(p.x-a.x,p.z-a.z);if(d<=2&&p.y>=F-1&&p.y<=F+4){a.hit[mg2TId(t)]=1;mg2Hit(t,K.STOMP_HI,MG_K.PIERCE,'stomp',{atk:1});}}
        for(const m of MG2.adds)if(!m.dead&&Math.hypot(m.x-a.x,m.z-a.z)<=2.5)mg2AddDie(m,'squash');
        if((MG2.L.holes|0)<MG2K.R2.STOMP_HOLES&&(MG2.L.holes=(MG2.L.holes|0)+1))for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let y=F-3;y<=F-1;y++){   /* the first 3 stomps a round break through */const cx=Math.floor(a.x)+dx,cz=Math.floor(a.z)+dz;if(getBlock(cx,y,cz)!==B.BEDROCK&&Math.hypot(cx+0.5-MGC.X,cz+0.5-MGC.Z)<=24.5)mg2EatCell(cx,y,cz,'stomp');}
        a.ring=mg2Tel('stompRing',{col:'white',shape:'ring',x:a.x,z:a.z,r:2,r0:0,y0:F-0.5,y1:F+0.6,front:1,impactT:mg2Now()+MG_K.LEAD});mg2Lock(a.ring);   /* the crack front starts at the hoof */
        mg2Burst('dust',a.x,F+0.3,a.z,{id:B.OBSIDIAN,n:18,pw:2});return false;}
      const w=(a.t-a.t0-MG_K.LEAD)*K.STOMP_V+2,cr=(a.t-a.t0)*K.STOMP_V+2;                   /* the shockwave radius trails the crack front by 0.35 s */
      if(a.ring)a.ring.set({r:Math.min(K.STOMP_R+0.5,cr),r0:Math.max(0,w-0.5),impactT:mg2Now()+MG_K.LEAD});
      for(const t of mg2Players()){const id=mg2TId(t);if(a.hit[id])continue;const p=mg2TPos(t),d=Math.hypot(p.x-a.x,p.z-a.z);
        if(w>=d&&w-0.6<=d&&d<=K.STOMP_R&&p.y>=F-0.2&&p.y<=F+0.6){   /* a ground wave: a jump clears it */a.hit[id]=1;mg2Hit(t,K.STOMP_LO,MG_K.PIERCE,'stomp',{atk:1});if(mg2Alive(t))mg2Knock(t,a.x,a.z,2.5,{apex:1.2});}}
      if(w>K.STOMP_R){mg2Free(a.ring);a.ring=null;MGA.stanceLock=0;return true;}
      return false;},
    free:function(a){mg2Free(a.h);mg2Free(a.ring);MGA.stanceLock=0;}},
  /* TAIL SWEEP: the tail rises and the bedrock cube glows and rattles; a scraped dust line races 0.35 s ahead of the cube round his
     rear 180 degrees in 0.5 s (r 2-9, low): jump when the dust reaches your feet; caught = 10 and a 6 m throw toward the edge */
  tail:{start:function(e,tg){const K=MG2K.R2,F=mgF(),p=mg2TPos(tg);mg2SetCD('tail',K.TAIL_CD);
      const back=e.yaw+Math.PI,side=mg2Ang(Math.atan2(p.x-e.x,p.z-e.z)-back)>=0?-1:1;      /* sweep toward the target's side */
      const a={k:'tail',t:0,com:0,x:e.x,z:e.z,a0:back-side*Math.PI/2,dir:side,hit:{},ph:'tell'};MGA.tail={pose:'raise',t:0,dir:side};MGA.cubeGlow=1;mg2S('mg_rattle',e.x,F+2,e.z);
      a.h=mg2Tel('tail',{col:'white',shape:'line',x:e.x,z:e.z,yaw:0,len:K.TAIL_R,w:2.2,y0:F-0.5,y1:F+0.9,front:1,impactT:mg2Now()+K.TAIL_TELL,src:1});
      a.h.set({srcX:e.x,srcZ:e.z});return a;},
    tick:function(a,e,dt){const K=MG2K.R2,F=mgF();a.t+=dt;MGA.tail.t=Math.min(1,a.t/K.TAIL_TELL);
      const lead=MG_K.LEAD,sw=K.TAIL_SWEEP,tc=a.t-K.TAIL_TELL,td=tc+lead;                     /* the cube's and the dust line's progress */
      const ang=k=>a.a0+a.dir*Math.PI*Math.max(0,Math.min(1,k/sw));
      const da=ang(td),ux=Math.sin(da),uz=Math.cos(da);a.h.set({x:a.x,z:a.z,yaw:Math.atan2(-ux,-uz)});
      if(!a.lk&&td>=0){a.lk=1;mg2Lock(a.h);}
      if(!a.com&&a.t>=K.TAIL_TELL-MG_K.COMMIT){a.com=1;mg2Commit(a.x,F+1,a.z);}
      if(tc<0)return false;
      if(!a.go){a.go=1;mg2Impact();mg2Mech('tail');mg2S('mg_rattle',a.x,F,a.z);MGA.tail={pose:'sweep',t:0,dir:a.dir};}
      const c0=ang(a.pc==null?0:a.pc),c1=ang(tc);a.pc=tc;MGA.tail.t=Math.min(1,tc/sw);
      for(const t of mg2Players()){const id=mg2TId(t);if(a.hit[id])continue;const p=mg2TPos(t),d=Math.hypot(p.x-a.x,p.z-a.z);if(d<2||d>K.TAIL_R||p.y<F-0.2||p.y>F+0.9)continue;
        const pa=Math.atan2(p.x-a.x,p.z-a.z),q0=mg2Ang(pa-c0),q1=mg2Ang(pa-c1);if(!(q0*q1<=0&&Math.abs(q0-q1)<Math.PI))continue;
        if(mg2R2SpireBetween(a.x,a.z,p.x,p.z))continue;                                     /* a spire stops the cube */
        a.hit[id]=1;mg2Hit(t,K.TAIL_DMG,MG_K.PIERCE,'tail',{atk:1});
        if(mg2Alive(t)){const q=mgPol(p.x,p.z),tx=MGC.X+Math.cos(q.th)*Math.min(23,q.r+4),tz=MGC.Z+Math.sin(q.th)*Math.min(23,q.r+4);
          const dx=tx-a.x,dz=tz-a.z,l=Math.hypot(dx,dz)||1;mg2Knock(t,p.x-dx/l,p.z-dz/l,6,{apex:1.3,rmax:23.5});}}
      if(tc>=sw){mg2Free(a.h);a.h=null;MGA.tail={pose:'rest',t:0};MGA.cubeGlow=0;return true;}
      return false;},
    free:function(a){mg2Free(a.h);MGA.cubeGlow=0;}}
};
function mg2R2SpireBetween(x0,z0,x1,z1){const F=mgF(),d=Math.hypot(x1-x0,z1-z0);for(let s=0.5;s<d;s+=0.5){const x=Math.floor(x0+(x1-x0)*s/d),z=Math.floor(z0+(z1-z0)*s/d);
    if(getBlock(x,F,z)===B.BEDROCK)return true;}return false;}
/* the trench (rev: scorch only): his jaw eats everything standing on the plate along the path (placed blocks, rubble, what is left
   of the Meal) and leaves a drool scar; the plate itself is not holed (1-deep channels trapped every walker; departure noted in status) */
function mg2R2Trench(L,s){const F=mgF();for(let w=-1;w<=1;w++){const x=Math.floor(L.x+L.ux*s-L.uz*w),z=Math.floor(L.z+L.uz*s+L.ux*w);
    if(Math.hypot(x+0.5-MGC.X,z+0.5-MGC.Z)>24.5)continue;
    for(let y=F+2;y>=F;y--){const id=getBlock(x,y,z);if(id!==B.AIR&&id!==B.BEDROCK)mg2EatCell(x,y,z,'lunge');}}
  if(MGREG.fx&&MGREG.fx.decal&&(Math.round(s*2)%3===0))try{MGREG.fx.decal(L.x+L.ux*s,F+0.02,L.z+L.uz*s,'drool');}catch(err){}}
/* anything his line swallows during the tell (a grenade into his open jaw) */
function mg2R2Eat(a,e,dt){if(!a.L)return;const m=mg2R2Head(e),F=mgF();
  for(const q of entities){if(q.dead||q.t!=='nade')continue;if(Math.hypot(q.x-m.x,q.z-m.z)<2.6&&q.y>F&&q.y<F+9){removeEnt(q);mg2R2Belly('tnt',q.owner&&q.owner!=='Dan');}}}
/* lit things on the line: primed TNT, a Bloater, a Nuke Keg -> the bellyache (bible 9.2), learned after two a round */
function mg2R2Lit(a,L,s){const F=mgF();
  for(const q of entities){if(q.dead)continue;const rx=q.x-L.x,rz=q.z-L.z,al=rx*L.ux+rz*L.uz,sd=Math.abs(-rx*L.uz+rz*L.ux);if(al<0||al>s||sd>2.2)continue;
    if(q.t==='tnt'||q.t==='nade'){removeEnt(q);mg2R2Belly('tnt',q.owner&&q.owner!=='Dan');}
    else if(q.t==='mob'&&!q.mgBoss&&MOBT[q.mt]&&MOBT[q.mt].nuke){removeEnt(q);mg2R2Belly('nuke',false);}}}
function mg2R2Swallow(m){if(m.dead)return;if(m.mt==='mgbloat'){mg2AddDie(m,'eaten');mg2R2Belly('bloat',false,!!m.demo);return;}
  mg2AddEaten(m,m.mt==='mgmorsel'?MG2K.R1.MORSEL:5);}
/* the bellyache: you see it lit in the belly window for 1.0 s, a muffled boom, he drops to one knee, the crust lifts: GUT window */
function mg2R2Belly(kind,byBot,demo){const K=MG2K.R2,now=mg2Now(),e=mg2Boss();if(!e)return;
  if(!demo&&MG2.L.lit>=K.LIT_LEARN){mg2R2Snuff(kind);return;}
  if(!demo)MG2.L.lit++;
  if(MG2.bellyCD>now&&!demo){mg2Burst('smoke',e.x,mgF()+9,e.z,{id:B.STONE,n:8});mg2S('mg_snuff',e.x,mgF()+8,e.z);return;}
  MG2.bellyCD=now+K.BELLY_CD;const T=K.BELLY[kind]||K.BELLY.tnt;
  MG2.bellyLit=now+1.2;MGA.belly.glow=1;
  if(MG2.atk&&MG2.atk.free)try{MG2.atk.free(MG2.atk);}catch(err){}MG2.atk=null;
  mg2Begin({k:'belly',t:0,kind,cap:T[1],dur:T[0],bot:!!byBot,
    tick:null});MG2.atk.k='belly';mg2Mech('belly');mg2S('mg_gulp',e.x,mgF()+8,e.z);}
function mg2R2Snuff(kind){const e=mg2Boss();if(!e)return;const m=mg2R2Head(e),F=mgF();mg2Mech('snuff');mg2S('mg_snuff',m.x,F+3,m.z);
  mg2Burst('smoke',m.x,F+3,m.z,{id:B.STONE,n:12,pw:1.2});
  if(kind==='tnt'){spawnDrop(m.x,F+3,m.z,{id:B.TNT,count:1},mg2Rng(-2,2),3,mg2Rng(-2,2));}}
MG2R2.belly={tick:function(a,e,dt){const F=mgF(),f=mg2R2Fwd(e);a.t+=dt;MGA.stance='kneel';
    if(a.t<1.0){MGA.belly.bulge=a.t;return false;}
    if(!a.boom){a.boom=1;mg2S('mg_belly',e.x,F+7,e.z);mg2Shake(0.4,0.6);mg2Burst('smoke',e.x,F+10,e.z,{id:B.STONE,n:14,pw:1.4});MGA.belly.lift=1;
      mg2OpenWin('gut',{x:e.x+f[0]*1.6,y:F+2.2,z:e.z+f[1]*1.6,hw:1.5,h:2.4,t:a.dur,cap:a.cap,bot:a.bot,
        end:function(why){MGA.belly.lift=0;MGA.belly.bulge=0;MGA.belly.glow=0;MGA.stance='stalk';},
        recoil:function(){mg2S('mg_retch',e.x,F+6,e.z);}});
      return true;}
    return false;},start:null};

/* the lunge ends: RECOVERY (head on the floor at the trench's end, eyes GOLD 1.5 s, cap 30); below 150 he chains 40% of them */
function mg2R2Recover(e,a){const K=MG2K.R2,F=mgF(),L=a.L,hx=L.x+L.ux*L.len,hz=L.z+L.uz*L.len;MGA.stance='stun';MGA.lookX=hx;MGA.lookY=F+2.5;MGA.lookZ=hz;
  const chain=mg2Low()&&mg2R()<K.CHAIN;
  mg2OpenWin('recovery',{x:hx,y:F+1.7,z:hz,hw:1.2,h:1.6,t:chain?0.3:K.RECOVER,cap:K.REC_CAP,follow:mg2ZoneFollow('eyes',hx,hz,F+1.7),
    recoil:function(){MGA.stance='rear';},
    end:function(why){MGA.stance='stalk';
      if(chain&&why==='time'&&MGF.live){const tg=mg2Pick(e.x,e.z);if(tg&&!MG2.atk){const p=mg2TPos(tg);if(Math.hypot(p.x-e.x,p.z-e.z)>=2){mg2Token(tg);mg2Begin(MG2R2.lunge.start(e,tg,1));mg2Mech('chain');}}}}});}
/* TOOTH CRACK: jaw-first into bedrock: a tooth flies, STUNNED 4 s, eyes GOLD, cap 50; two cracks per spire and he learns it */
function mg2R2Crack(e,a){const K=MG2K.R2,F=mgF(),L=a.L,s0=Math.max(0.5,a.stopS-0.6),k=a.spire;
  /* his head drops BESIDE the spire (the side nearer his target), reachable from behind it */
  const sp=mg2R2Spires().find(q=>q.k===k),px=-L.uz,pz=L.ux,tp=mg2TPos(a.tg)||P,side=((tp.x-(L.x+L.ux*s0))*px+(tp.z-(L.z+L.uz*s0))*pz)>=0?1:-1;
  let hx=L.x+L.ux*s0,hz=L.z+L.uz*s0;
  if(sp){const at=sg=>({x:sp.x+px*sg*4.0+L.ux*1.0,z:sp.z+pz*sg*4.0+L.uz*1.0});let q=at(side);       /* clear of the spire's corner from behind it */
    if(!mg2Stand(q.x,q.z)||mgPol(q.x,q.z).r>23)q=at(-side);hx=q.x;hz=q.z;}
  MG2.L.cracks[k]=(MG2.L.cracks[k]||0)+1;const learned=MG2.L.cracks[k]>=K.CRACK_LEARN;
  mg2Mech('crack');mg2S('mg_crack',hx,F+2,hz);mg2Shake(0.5,0.5);mg2Burst('tooth',hx,F+2,hz,{id:B.STONE,n:10,pw:1.6});
  {const pf=mg2Fx('prop'),l=mg2Land(hx+mg2Rng(-3,3),hz+mg2Rng(-3,3),{});if(pf)try{pf('tooth',l.x,F,l.z,{});if(learned)pf('jaw',L.x+L.ux*a.stopS,F+1,L.z+L.uz*a.stopS,{});}catch(err){}}
  MGA.stance='stun';MGA.lookX=hx;MGA.lookY=F+1.5;MGA.lookZ=hz;MGA.recoil=1;
  mg2OpenWin('crack',{x:hx,y:F+1.2,z:hz,hw:1.3,h:2.0,t:K.CRACK_T,cap:K.CRACK_CAP,follow:mg2ZoneFollow('eyes',hx,hz,F+1.2),
    recoil:function(){MGA.stance='rear';mg2S('mg_roar',e.x,F+10,e.z);},
    end:function(why){MGA.stance=learned?'rear':'stalk';if(learned){MG2.beat=1.2;mg2Mech('learnSpire');mg2S('mg_roar',e.x,F+10,e.z);}}});}

/* ---- the skilled pilot's tactic (MGT.hint): stand so a spire he has not learned is between you and his jaw ---- */
function mg2R2Hint(h,pr){const e=mg2Boss();if(!e)return;const F=mgF();
  let best=null,bd=1e9;
  for(const s of mg2R2Spires()){if((MG2.L.cracks[s.k]||0)>=MG2K.R2.CRACK_LEARN)continue;const dx=s.x-e.x,dz=s.z-e.z,d=Math.hypot(dx,dz)||1;
    const x=s.x+dx/d*3.0,z=s.z+dz/d*3.0,q=mgPol(x,z);if(q.r>22||q.r<8.5||!mg2Stand(x,z)||!mg2PathOK(P.x,P.z,x,z)||Math.hypot(x-e.x,z-e.z)<7.5)continue;   /* far enough that he lunges, not stomps */
    const cost=Math.hypot(x-P.x,z-P.z);if(cost<bd){bd=cost;best={x,z};}}
  if(best){h.stand={x:best.x,z:best.z,r:0.6};return;}
  for(let k=0;k<13;k++){const th=pr.th+(k>>1)*0.35*(k%2?1:-1),st=mg2SafeStand(th,[15.5,13.0,18.0,10.5,20.0]);   /* else out of his reach: 8 m+ from him */
    if(st&&Math.hypot(st.x-e.x,st.z-e.z)>=8){h.stand={x:st.x,z:st.z,r:1.4};return;}}}
