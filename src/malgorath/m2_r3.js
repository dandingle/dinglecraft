/* ---- PART 57: m2_r3.js ---- */
/* ===================================================================== */
/* PART 57 m2 (M2): Round III, THE MAW (bible 10). He stands in the pit  */
/* to his chest with the sun inside him. The loop: INHALE (everything    */
/* slides toward his mouth: brace, hide behind cover, never fly) ->      */
/* SWALLOW (the belly, from above) -> HANDS (slap + drag, the hand-eye)  */
/* and every third swallow THE GAG (walk into his mouth and stab the     */
/* sun). Meanwhile THE CLOSING MOUTH eats the islands' edge 1 m at a     */
/* time; a gag with a Dan hit gives 3 m back; at r 15 THE LAST SUPPER.   */
/* ===================================================================== */
function mg2R3Mouth(){const e=mg2Boss();const yaw=e?e.yaw:0;return {x:MGC.X+Math.sin(yaw)*2.5,y:mgF()+0.5,z:MGC.Z+Math.cos(yaw)*2.5};}
/* mgCovered (bible 10.2): a ray from his mouth at the inhale pose (F+0.5, his axis) to the target's chest (y+1.0); only solid cells at
   y >= F count, so the island floor never covers anyone; a spire or a 1-high block on the line does */
function mg2Covered(t){const p=t.e?t.e:t,F=mgF(),x0=MGC.X,y0=F+0.5,z0=MGC.Z,x1=p.x,y1=p.y+1.0,z1=p.z,d=Math.hypot(x1-x0,y1-y0,z1-z0);
  for(let s=0.4;s<d-0.45;s+=0.25){const x=x0+(x1-x0)*s/d,y=y0+(y1-y0)*s/d,z=z0+(z1-z0)*s/d,cy=Math.floor(y);if(cy<F)continue;
    if(mg2Solid(Math.floor(x),cy,Math.floor(z)))return true;}
  return false;}
function mg2Inhaling(){const q=MG2.r3;return !!(MGF.live&&MGF.round===3&&q&&((q.ph==='inhale'&&q.t>=MG2K.R3.INHALE_TELL)||(q.ph==='supper'&&q.t>=MG2K.R3.SUPPER_WARN)));}
function mg2BlinkFail(){if(!mg2Inhaling())return false;mg2Mech('blinkFail');mg2S('mg_fizzle');const m=mg2R3Mouth();
  MG2.fly.push({x:P.x,y:P.y+1.2,z:P.z,tx:m.x,ty:m.y,tz:m.z,t:0,d:0.5,k:'in'});return true;}
function mg2GrapCut(){if(!mg2Inhaling())return false;mg2Mech('grapCut');mg2S('mg_skid');return true;}
function mg2R3Lit(kind){const q=MG2.r3;if(!q)return;if(MG2.L.lit>=MG2K.R2.LIT_LEARN){mg2R2Snuff(kind);return;}MG2.L.lit++;q.lit=1;mg2Mech('litSwallow');}

/* ---- the brain of Round III: the loop ---- */
function mg2R3Brain(e,dt){const F=mgF(),K=MG2K.R3;e.x=MGC.X;e.z=MGC.Z;e.y=F-13;
  if(!MG2.r3)MG2.r3={ph:'idle',t:0,n:0,lanesT:0,first:1};
  const q=MG2.r3;
  MGA.light.col=0xffe6a0;MGA.light.d=40;MGA.light.i=3.0;MGA.light.at=q.ph==='swallow'?'belly':'throat';MGL.eclipse=1;MGL.edge=MG2.edge;
  const tg=mg2Pick(MGC.X,MGC.Z);
  let fx=null,fz=null;if(q.ph==='gag'&&q.th!=null){fx=MGC.X+Math.cos(q.th)*10;fz=MGC.Z+Math.sin(q.th)*10;}else if(tg){const p=mg2TPos(tg);fx=p.x;fz=p.z;}
  if(fx!=null)e.yaw=mg2Turn(e.yaw,mg2Yaw(fx-e.x,fz-e.z),q.ph==='gag'?3:1.05,dt);
  if(q.ph==='supper'){mg2R3Supper(e,dt,q);return;}
  if(mg2Docile()&&q.ph==='idle'){MGA.stance='chest';return;}
  q.t+=dt;
  if(q.ph==='idle'){MGA.stance='chest';if(MG2.gap>0){MG2.gap-=dt;return;}if(q.t<MG_K.GRACE||(!tg&&!(P.mode==='c'&&mg2InPlay(P))))return;mg2R3Go('inhale');return;}
  if(q.ph==='inhale')return mg2R3Inhale(e,dt,q);
  if(q.ph==='swallow')return mg2R3Swallow(e,dt,q);
  if(q.ph==='hands')return mg2R3Hands(e,dt,q);
  if(q.ph==='gag')return mg2R3Gag(e,dt,q);}
function mg2R3Go(ph){const q=MG2.r3;if(!q)return;q.ph=ph;q.t=0;q.lanesT=0;q.chomped=0;q.lit=0;q.h=null;q.hands=null;
  if(ph==='inhale'){q.n++;q.dur=mg2Low()?MG2K.R3.INHALE_LOW:MG2K.R3.INHALE;mg2Mech('inhale');MGA.stance='headup';MGA.jaw=1;MGA.split=1;mg2S('mg_inhale');
    q.h=mg2Tel('inhale',mg2Vis({col:'violet',shape:'disc',x:MGC.X,z:MGC.Z,r:30}));mg2R3DemoBrace(1);}
  else if(ph==='swallow'){mg2R3SwallowStart(q);}
  else if(ph==='hands'){q.hands=[];mg2R3Hand(q,0);if(mg2Low())q.second=1.0;else q.second=null;}
  else if(ph==='gag'){mg2R3GagStart(q);}}
function mg2R3End(){const q=MG2.r3;if(!q)return;mg2Free(q.h);q.h=null;for(const l of (q.lanes||[]))mg2Free(l.h);q.lanes=[];MGA.jaw=0;MGA.split=0;}

/* ---- 1. INHALE: tell 1.0 s, then the pull ramps 2.5 -> 6 m/s (7 below 150) as a displacement applied after the player moves ---- */
function mg2R3Inhale(e,dt,q){const K=MG2K.R3,F=mgF();MGA.stance='headup';MGA.jaw=1;MGA.split=1;
  if(q.t<K.INHALE_TELL)return;
  const k=Math.min(1,(q.t-K.INHALE_TELL)/Math.max(0.1,q.dur-K.INHALE_TELL)),pull=K.PULL[0]+((mg2Low()?K.PULL_LOW:K.PULL[1])-K.PULL[0])*k;
  MG2.inh={pull};mg2R3Pull(pull,dt,false);if(MG2.r3!==q)return;mg2R3Lanes(dt,q);
  if(q.chomped||q.t>=q.dur){MG2.inh=null;mg2R3End();mg2R3Go('swallow');}}
function mg2R3Pull(v,dt,supper){const K=MG2K.R3,F=mgF(),m=mg2R3Mouth(),q=MG2.r3;
  const pullOne=(t,body,isP)=>{if(!body||body.dead)return;const dx=m.x-body.x,dz=m.z-body.z,d=Math.hypot(dx,dz)||1;let s=v;
    if(!supper){if(!body.onGround)s*=K.AIR;if(isP&&P.sneak)s*=K.SNEAK;if(mg2Covered(body))s*=K.COVER;}else if(!body.onGround)s*=K.AIR;
    moveBody(body,dx/d*s*dt,0,dz/d*s*dt,false);
    const r=Math.hypot(body.x-MGC.X,body.z-MGC.Z);
    if(r<12&&body.y<F-0.3){if(t===P){if(supper){mg2True(P,999,'supper');return;}MG2.chompHow='inhale';mg2Chomp(P,'chomp',{dir:Math.atan2(P.z-MGC.Z,P.x-MGC.X)+Math.PI});q.chomped=1;}
      else if(t&&t.name){mg2Swallow(t,'inhale');}}};
  if(mg2Alive(P)&&P.mode!=='c'&&!MG2.holdDan&&!MG2.throws.some(w=>w.t===P)){const z=mgZone(P.x,P.y,P.z);if(z==='arena'||z==='gut'||z==='void')pullOne(P,P,true);}
  for(const a of mg2Bots()){if(mg2Eaten(a))continue;const z=mgZone(a.e.x,a.e.y,a.e.z);if(z==='arena'||z==='gut'||z==='void')pullOne(a,a.e,false);}
  for(const a of MG2.adds){if(a.dead||a.lob)continue;const dx=m.x-a.x,dz=m.z-a.z,d=Math.hypot(dx,dz)||1;let s=(a.demo===2||(a.mt==='mghusk'&&!a.demo))?v*0.5:v;if(mg2Covered(a))s*=K.COVER;   /* Husks brace and slide */
    moveBody(a,dx/d*s*dt,0,dz/d*s*dt,false);}
  for(const o of entities){if(o.dead||(o.t!=='drop'&&o.t!=='tnt'&&o.t!=='nade'&&o.t!=='arrow'))continue;if(o.t==='drop'&&(o.mgNoBot||(DEFS[o.st.id]&&DEFS[o.st.id].crw)))continue;
    const dx=m.x-o.x,dz=m.z-o.z,d=Math.hypot(dx,dz);if(d>30||!mgIn(o.x,o.y,o.z))continue;
    if(d<3.5&&o.y<F+3){if(o.t==='tnt'||o.t==='nade'){removeEnt(o);mg2R3Lit('tnt');}else if(o.t==='drop'){removeEnt(o);}continue;}
    if(o.t==='arrow')continue;moveBody(o,dx/d*6*dt,0,dz/d*6*dt,false);}}
/* lanes: every 1.5 s a streak across an island 0.8 s ahead of a chunk that skims along it at F+1 (WHITE if it will cross a player) */
function mg2R3Lanes(dt,q){const K=MG2K.R3,F=mgF();q.lanes=q.lanes||[];q.lanesT-=dt;
  if(q.lanesT<=0){q.lanesT=K.LANE_T;const tg=mg2Pick(MGC.X,MGC.Z),tp=tg?mg2TPos(tg):null;
    const th=tp&&mg2R()<0.35?Math.atan2(tp.z-MGC.Z,tp.x-MGC.X)+mg2Rng(-0.12,0.12):mg2R()*Math.PI*2,r1=Math.max(12.5,MG2.edge-0.2),r0=12;
    const x=MGC.X+Math.cos(th)*r1,z=MGC.Z+Math.sin(th)*r1,ux=-Math.cos(th),uz=-Math.sin(th),yaw=Math.atan2(-ux,-uz),len=r1-r0;
    const L={x,z,ux,uz,len,t:0,hit:{},th};let white=false;for(const t of mg2Players()){const p=mg2TPos(t),rx=p.x-x,rz=p.z-z,al=rx*ux+rz*uz,sd=Math.abs(-rx*uz+rz*ux);if(al>=-0.5&&al<=len&&sd<=0.8)white=true;}
    L.h=mg2Tel('lane',{col:white?'white':'violet',shape:'line',x,z,yaw,len,w:1.2,y0:F-0.6,y1:F+1.0,impactT:mg2Now()+K.LANE_LEAD});mg2Lock(L.h);q.lanes.push(L);mg2S('mg_lane',x,F+1,z);}
  for(const L of q.lanes.slice()){L.t+=dt;if(L.t<K.LANE_LEAD)continue;const s=(L.t-K.LANE_LEAD)*22;
    for(const t of mg2Players()){const id=mg2TId(t);if(L.hit[id])continue;const p=mg2TPos(t),rx=p.x-L.x,rz=p.z-L.z,al=rx*L.ux+rz*L.uz,sd=Math.abs(-rx*L.uz+rz*L.ux);
      if(sd>0.9||al<0||al>s||p.y>F+1.0||p.y<F-0.6)continue;L.hit[id]=1;
      let blocked=false;for(let u=0;u<al;u+=0.5){const cx=Math.floor(L.x+L.ux*u),cz=Math.floor(L.z+L.uz*u);if(mg2Solid(cx,F,cz)||mg2Solid(cx,F+1,cz)){blocked=true;break;}}
      if(blocked)continue;mg2Hit(t,K.LANE_DMG,MG_K.PIERCE,'debris',{atk:1});if(mg2Alive(t))mg2Knock(t,MGC.X+(p.x-MGC.X)*2,MGC.Z+(p.z-MGC.Z)*2,1.5,{apex:0.6,rmin:13.0,rmax:Math.max(13.5,MG2.edge-0.8)});}
    if(s>=L.len){mg2Free(L.h);q.lanes.splice(q.lanes.indexOf(L),1);}}}

/* ---- 2. SWALLOW: the pull stops, a gulp, the light drops into his belly: BELLY (cap 25), seen over the inner edge ---- */
function mg2R3SwallowStart(q){const K=MG2K.R3,F=mgF(),e=mg2Boss();mg2Mech('swallow');mg2S('mg_swallow');MGA.stance='chest';MGA.belly.glow=1;
  const tg=mg2Pick(MGC.X,MGC.Z),tp=tg?mg2TPos(tg):P,th=Math.atan2(tp.z-MGC.Z,tp.x-MGC.X);
  MG2.gag+=1;if(q.lit&&!MG2.gagLit){MG2.gag+=1;MG2.gagLit=1;}
  mg2OpenWin('belly',{x:MGC.X+Math.cos(th)*3.5,y:F-5.5,z:MGC.Z+Math.sin(th)*3.5,hw:2.0,h:2.0,t:K.SWALLOW,cap:K.BELLY_CAP,
    recoil:function(){MGA.belly.lift=0;},end:function(){MGA.belly.glow=0;}});
  mg2R3DemoBrace(0);}
function mg2R3Swallow(e,dt,q){if(q.t>=MG2K.R3.SWALLOW||!MG2.win||MG2.win.kind!=='belly'){if(MG2.win&&MG2.win.kind==='belly')mg2CloseWin('time');mg2R3Go('hands');}}

/* ---- 3. HANDS: a slap onto an island (the shadow slides, locks at T-0.95), then the claws drag 6 m toward his mouth (jump the spark
   bar), then the hand rests with its eye open (cap 25). Below 150 the second hand follows 1.0 s behind. A bridge under it breaks. ---- */
function mg2R3Hand(q,i){const K=MG2K.R3,F=mgF(),tg=(q.first&&mg2R3DemoHusk())||mg2Pick(MGC.X,MGC.Z);if(!tg)return;const p=mg2TPos(tg);
  const H={i,tg,t:0,x:p.x,z:p.z,ph:'tell',locked:0,com:0,hit:{},hand:i?'R':'L'};mg2R3HandClamp(H);
  H.h=mg2Tel('slap',{col:'white',shape:'disc',x:H.x,z:H.z,r:2.5,y0:F-1,y1:F+4,impactT:mg2Now()+K.SLAP_TELL});
  if(tg===P||tg.name)mg2Token(tg);q.hands.push(H);mg2S('mg_slapup',H.x,F+4,H.z);}
function mg2R3HandClamp(H){const p=mgPol(H.x,H.z),r=Math.max(12.8,Math.min(Math.min(MG2K.R3.REACH,MG2.edge-0.4),p.r));
  const c=mg2R3Isle(p.th),m=Math.max(0,Math.PI/6-6.5/r),th=c+Math.max(-m,Math.min(m,mg2Ang(p.th-c)));   /* the hand lands on Dan's island, clear of the gaps */
  H.x=MGC.X+Math.cos(th)*r;H.z=MGC.Z+Math.sin(th)*r;}
function mg2R3Hands(e,dt,q){const K=MG2K.R3,F=mgF();MGA.stance='chest';
  if(q.second!=null&&q.t>=q.second){q.second=null;mg2R3Hand(q,1);}
  let busy=false;
  for(const H of q.hands){if(H.ph==='done')continue;busy=true;H.t+=dt;const arm=H.hand==='L'?'armL':'armR';
    if(H.ph==='tell'){if(!H.locked){if(mg2Alive(H.tg)||(H.tg&&H.tg.mt)){const p=mg2TPos(H.tg)||H.tg;mg2R1Slide(H,p,dt);mg2R3HandClamp(H);}H.h.set({x:H.x,z:H.z});}
      if(!H.locked&&H.t+dt>K.SLAP_TELL-MG_K.SLAP_LOCK){H.locked=1;const p=mgPol(H.x,H.z),c=mg2R3Isle(p.th),sg=mg2Ang(c-p.th)>=0?-1:1;   /* his palm lands a little toward the */
        H.x+=-Math.sin(p.th)*sg*0.6;H.z+=Math.cos(p.th)*sg*0.6;H.h.set({x:H.x,z:H.z});mg2Lock(H.h);}                                        /* gap side: the way out runs along the island */
      if(!H.com&&H.t>=K.SLAP_TELL-MG_K.COMMIT){H.com=1;mg2Commit(H.x,F+4,H.z);}
      MGA[arm]={pose:'raise',t:Math.min(1,H.t/K.SLAP_TELL),x:H.x,y:F+4*(H.t/K.SLAP_TELL),z:H.z};
      if(H.t<K.SLAP_TELL)continue;
      mg2Free(H.h);H.h=null;mg2Impact();mg2Mech('hands');mg2S('mg_slap',H.x,F,H.z);mg2Shake(0.35,0.35);
      for(const t of mg2Players()){const p=mg2TPos(t),d=Math.hypot(p.x-H.x,p.z-H.z);if(d>2.5||p.y<F-1||p.y>F+4)continue;mg2Hit(t,d<=1.5?14:6,MG_K.PIERCE,'slap',{atk:1,kx:p.x-H.x,kz:p.z-H.z});if(d<=1.5&&mg2Alive(t))mg2Knock(t,H.x,H.z,3,{apex:1});}
      for(const m of MG2.adds)if(!m.dead&&Math.hypot(m.x-H.x,m.z-H.z)<=2.5)mg2AddDie(m,'squash');
      mg2R3Bridge(H.x,H.z,2.5);mg2Burst('dust',H.x,F+0.2,H.z,{id:B.OBSIDIAN,n:12,pw:1.4});
      const pr=mgPol(H.x,H.z),r1=Math.max(12.8,pr.r-K.DRAG);H.dx=-Math.cos(pr.th);H.dz=-Math.sin(pr.th);H.len=pr.r-r1;H.x0=H.x;H.z0=H.z;H.ph='drag';H.t=0;
      const yaw=Math.atan2(-H.dx,-H.dz);
      H.v=H.len/K.DRAG_T;H.h=mg2Tel('drag',{col:'white',shape:'line',x:H.x,z:H.z,yaw,len:Math.max(0.6,Math.min(H.len+0.25,0.25+H.v*K.DRAG_LEAD)),w:3.5,y0:F-0.5,y1:F+0.8,front:1,impactT:mg2Now()+K.DRAG_HOLD+K.DRAG_LEAD});mg2Lock(H.h);
      mg2S('mg_drag',H.x,F,H.z);continue;}
    if(H.ph==='drag'){const s=Math.min(H.len,Math.max(0,H.t-K.DRAG_HOLD)/K.DRAG_T*H.len),bx=H.x0+H.dx*s,bz=H.z0+H.dz*s;   /* a beat of rest, then the drag */
      if(H.h){const a0=Math.max(0,s-0.6),a1=Math.min(H.len+0.25,s+0.25+H.v*K.DRAG_LEAD);H.h.set({x:H.x0+H.dx*a0,z:H.z0+H.dz*a0,len:Math.max(0.6,a1-a0),impactT:mg2Now()+K.DRAG_LEAD});}   /* the dust front runs 0.5 s ahead of the palm */MGA[arm]={pose:'drag',t:H.t/K.DRAG_T,x:bx,y:F,z:bz};
      for(const t of mg2Players()){const id=mg2TId(t);if(H.hit[id])continue;const p=mg2TPos(t),rx=p.x-H.x0,rz=p.z-H.z0,al=rx*H.dx+rz*H.dz,sd=Math.abs(-rx*H.dz+rz*H.dx);
        if(sd>1.75||al<0||al>s+0.25||al<s-0.6||p.y>F+0.8||p.y<F-0.5)continue;
        if(mg2R2SpireBetween(H.x0,H.z0,p.x,p.z))continue;
        H.hit[id]=1;mg2Hit(t,K.DRAG_DMG,MG_K.PIERCE,'drag',{atk:1});if(mg2Alive(t))mg2Knock(t,MGC.X+(p.x-MGC.X)*2,MGC.Z+(p.z-MGC.Z)*2,3,{apex:0.8,rmin:13.4});}
      mg2R3Bridge(bx,bz,1.75);
      if(H.t>=K.DRAG_T+K.DRAG_HOLD){mg2Free(H.h);H.h=null;H.ph='eye';H.t=0;H.x=bx;H.z=bz;const eye=H.hand==='L'?'eyeL':'eyeR';MGA[eye]=1;MGA[arm]={pose:'flat',t:1,x:bx,y:F,z:bz};
        mg2OpenWin('handeye',{x:bx,y:F+0.7,z:bz,hw:0.6,h:1.0,t:K.EYE_T,cap:K.EYE_CAP,follow:mg2ZoneFollow('handeye'+H.hand,bx,bz,F+0.7),
          recoil:function(){for(const t of mg2Players()){const p=mg2TPos(t);if(Math.hypot(p.x-bx,p.z-bz)<3.2)mg2Knock(t,bx,bz,4,{apex:0.8,rmin:12.6});}},
          end:function(){MGA[eye]=0;MGA[arm]={pose:'rest',t:0};H.ph='done';}});}
      continue;}
    if(H.ph==='eye'&&(!MG2.win||MG2.win.kind!=='handeye')){H.ph='done';}}
  if(!busy&&q.second==null||(q.t>K.HANDS+2.5)){for(const H of q.hands){mg2Free(H.h);}if(MG2.win&&MG2.win.kind==='handeye')return;q.first=0;
    if(MG2.gag>=K.GAG_N)mg2R3Go('gag');else{MG2.gap=mg2Gap();mg2R3Go('inhale');}}}
/* a slap or a drag across a bridge breaks it (the L3 bridges at 90, 210 and 330 degrees, r 17.5-18.5) */
function mg2R3Bridge(x,z,r){const F=mgF();for(let dx=-Math.ceil(r);dx<=Math.ceil(r);dx++)for(let dz=-Math.ceil(r);dz<=Math.ceil(r);dz++){
    if(dx*dx+dz*dz>r*r+0.5)continue;const cx=Math.floor(x)+dx,cz=Math.floor(z)+dz,p=mgPol(cx+0.5,cz+0.5);if(p.r<17.3||p.r>18.7)continue;
    const deg=((p.th*180/Math.PI)%360+360)%360;let gap=false;for(let k=0;k<6;k++){const g=30+60*k,dd=Math.abs(((deg-g)%360+540)%360-180)*Math.PI/180*p.r;if(dd<=2.0)gap=true;}
    if(!gap)continue;if(getBlock(cx,F-1,cz)!==B.AIR){for(let y=F-3;y<=F-1;y++)mg2EatCell(cx,y,cz,'bridge');mg2Mech('bridge');}}}

/* ---- THE GAG (bible 10.3): convulsions 1.5 s, his head slumps onto Dan's island with the jaw locked wide and the sun at the throat
   ring (cap 75, 4.0 s, 4.0 m inside); the mouth floor RED locks 1.0 s before the snap; capped: he coughs you out; a hit: edge +3 m ---- */
function mg2R3GagStart(q){const K=MG2K.R3,F=mgF(),tg=mg2Pick(MGC.X,MGC.Z),tp=tg?mg2TPos(tg):P;
  q.th=mg2R3Isle(Math.atan2(tp.z-MGC.Z,tp.x-MGC.X));                                        /* his head slumps onto Dan's island */q.gph='tell';MGA.stance='headup';mg2Mech('gag');mg2S('mg_gag');MGA.tel[2]=1;}
function mg2R3Gag(e,dt,q){const K=MG2K.R3,F=mgF();
  if(q.gph==='tell'){MGA.stance='headup';MGA.flinch=0.5+0.5*Math.sin(q.t*12);if(q.t<K.GAG_TELL)return;
    q.gph='open';q.t=0;MGA.stance='slump';MGA.jaw=1;MGA.split=1;
    const rf=Math.max(13.5,Math.min(18,MG2.edge-0.6)),sunR=Math.max(12.9,rf-K.SUN_IN),ux=Math.cos(q.th),uz=Math.sin(q.th);
    q.front={x:MGC.X+ux*rf,z:MGC.Z+uz*rf};q.sun={x:MGC.X+ux*sunR,z:MGC.Z+uz*sunR};q.rf=rf;
    MGA.lookX=q.sun.x;MGA.lookY=F+1.5;MGA.lookZ=q.sun.z;
    const yaw=Math.atan2(ux,uz);                                                             /* the floor drawing runs from the front teeth inward */
    q.h=mg2Tel('gagMouth',{col:'red',shape:'line',x:q.front.x,z:q.front.z,yaw,len:Math.max(1,rf-12.4),w:4,y0:F-0.6,y1:F+3,impactT:mg2Now()+K.GAG_T});
    q.hit=0;
    mg2OpenWin('sun',{x:q.sun.x,y:F+0.7,z:q.sun.z,hw:0.8,h:1.6,t:K.GAG_T+0.2,cap:K.SUN_CAP,
      recoil:function(){mg2S('mg_retch',q.sun.x,F+1,q.sun.z);for(const t of mg2Players()){if(!mg2R3InMouth(mg2TPos(t),q))continue;   /* coughed out onto the island */
          const l=mg2Land(q.front.x+ux*3,q.front.z+uz*3,{rmin:13,rmax:Math.max(13.5,MG2.edge-1.4),hole:1});mg2Throw(t,l.x,l.z,0.5,1.2,{noFall:1});}},
      end:function(why,w){q.hit=w.danHit;q.closed=why;}});
    mg2S('mg_sun',q.sun.x,F+1,q.sun.z);return;}
  if(q.gph==='open'){MGA.stance='slump';
    if(!q.locked&&q.t>=K.GAG_T-MG_K.CHOMP_LOCK){q.locked=1;mg2Lock(q.h);}
    if(!q.com&&q.t>=K.GAG_T-MG_K.COMMIT){q.com=1;mg2Commit(q.front.x,F+1,q.front.z);MGA.tel[4]=1;}
    if(q.closed==='cap'||q.t>=K.GAG_T){
      if(q.closed!=='cap'){mg2Impact();mg2S('mg_chomp',q.front.x,F+1,q.front.z);for(const t of mg2Players()){if(mg2R3InMouth(mg2TPos(t),q)){if(t===P){MG2.chompHow='gag';mg2Chomp(P,'chomp',{dir:q.th});}else mg2Swallow(t,'gag');}}}
      if(MG2.win&&MG2.win.kind==='sun')mg2CloseWin('time');
      if(q.hit)mg2R3Recede(MG2K.R3.RECEDE);
      mg2Free(q.h);q.h=null;MG2.gag=0;MG2.gagLit=0;MGA.tel[2]=0;MGA.tel[4]=0;MGA.jaw=0;MGA.split=0;q.locked=q.com=0;q.closed=null;
      MG2.gap=mg2Gap();mg2R3Go('inhale');}}}
function mg2R3InMouth(p,q){if(!p||!q.front)return false;const F=mgF(),ux=Math.cos(q.th),uz=Math.sin(q.th),rx=p.x-q.front.x,rz=p.z-q.front.z,al=-(rx*ux+rz*uz),sd=Math.abs(-rx*uz+rz*ux);
  return al>=-0.3&&al<=4.5&&sd<=2.0&&p.y>=F-0.6&&p.y<=F+3;}

/* ---- the round-level clock (tick): THE CLOSING MOUTH and THE LAST SUPPER (bible 10.4) ---- */
function mg2R3Tick(e,dt){const K=MG2K.R3,F=mgF();if(!MGF.live||MG2.scene||!MG2.r3)return;const q=MG2.r3;
  MGL.edge=MG2.edge;if(q.ph==='supper')return;
  if(MG2.edge<=K.EDGE_MIN+0.01){mg2R3SupperStart(q);return;}
  MG2.edgeT+=dt;const step=mg2Low()?K.STEP_LOW:K.STEP;
  if(!MG2.warn&&MG2.edgeT>=step-K.WARN){MG2.warn=mg2Tel('edge',{col:'violet',shape:'band',x:MGC.X,z:MGC.Z,r0:MG2.edge-1,r:MG2.edge+6,th:0,dth:Math.PI,y0:F-1,y1:F+3,impactT:mg2Now()+K.WARN});
    mg2Lock(MG2.warn);mg2S('mg_band');}
  if(MG2.edgeT>=step){MG2.edgeT=0;mg2Free(MG2.warn);MG2.warn=null;mg2R3EdgeStep();}}
function mg2R3EdgeStep(){const F=mgF(),r1=MG2.edge,r0=r1-1,cells=[];
  for(let x=Math.floor(MGC.X-r1-1);x<=Math.ceil(MGC.X+r1+1);x++)for(let z=Math.floor(MGC.Z-r1-1);z<=Math.ceil(MGC.Z+r1+1);z++){const r=Math.hypot(x+0.5-MGC.X,z+0.5-MGC.Z);
    if(r<r0||r>=r1+0.5)continue;for(let y=F-3;y<=F+4;y++){const id=getBlock(x,y,z);if(id===B.AIR||id===B.WATER)continue;
      if(id===B.BEDROCK&&y>=F-3&&!(r>=14&&r<=18&&mg2R3Spire(x,z)))continue;cells.push([x,y,z,id]);}}
  for(const c of cells)mg2EatCell(c[0],c[1],c[2],c[3]===B.BEDROCK?'topple':'edge');
  if(r0<=17.8)for(const s of MG2SPIRES){const sx=Math.floor(MGC.X+s[0]),sz=Math.floor(MGC.Z+s[1]);if(getBlock(sx,F+1,sz)!==B.BEDROCK)continue;   /* the spires topple in */
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let y=F;y<=F+4;y++)if(getBlock(sx+dx,y,sz+dz)===B.BEDROCK)mg2EatCell(sx+dx,y,sz+dz,'topple');mg2Mech('spireFalls');}
  MG2.edgeLog=MG2.edgeLog||[];MG2.edgeLog.push({r:r1,cells});MG2.edge=r0;mg2Mech('edge');mg2S('mg_fall');mg2Shake(0.25,0.4);
  mg2Burst('debris',MGC.X+Math.cos(mgPol(P.x,P.z).th)*r0,F,MGC.Z+Math.sin(mgPol(P.x,P.z).th)*r0,{id:B.OBSIDIAN,n:10,pw:1});}
function mg2R3Spire(x,z){for(const s of MG2SPIRES){if(Math.abs(x+0.5-MGC.X-s[0])<=1.6&&Math.abs(z+0.5-MGC.Z-s[1])<=1.6)return true;}return false;}
/* a gag with a Dan hit makes him cough up the floor: the edge re-forms by 3 m (what the closing mouth ate, put back) */
function mg2R3Recede(m){const log=MG2.edgeLog||[];let got=0;
  while(got<m&&log.length){const s=log.pop();for(const c of s.cells)if(getBlock(c[0],c[1],c[2])===B.AIR)mg2PutCell(c[0],c[1],c[2],c[3]);MG2.edge=s.r;got+=1;}
  if(got){mg2Mech('recede');mg2S('mg_retch');}MG2.edgeT=Math.min(MG2.edgeT,1);if(MG2.warn){mg2Free(MG2.warn);MG2.warn=null;}}
/* THE LAST SUPPER: at r 15 he lifts his head (THE PLATE IS EMPTY.), 8 s of warning, a 5 s inhale at 9 m/s nothing resists, then 999 */
function mg2R3SupperStart(q){if(q.ph==='supper')return;mg2CloseWin('supper');mg2R3End();for(const H of (q.hands||[]))mg2Free(H.h);
  q.ph='supper';q.t=0;mg2Mech('supper');mg2Say('THE PLATE IS EMPTY.',3.5);MGA.stance='headup';
  const F=mgF();q.h=mg2Tel('supper',{col:'violet',shape:'band',x:MGC.X,z:MGC.Z,r0:11,r:MG2.edge+6,th:0,dth:Math.PI,y0:F-20,y1:F+30,impactT:mg2Now()+MG2K.R3.SUPPER_WARN+MG2K.R3.SUPPER_T});mg2Lock(q.h);}
function mg2R3Supper(e,dt,q){const K=MG2K.R3,F=mgF();q.t+=dt;MGA.stance='headup';MGA.jaw=1;MGA.split=1;
  if(q.t<K.SUPPER_WARN)return;
  if(q.t<K.SUPPER_WARN+K.SUPPER_T){MG2.inh={pull:K.SUPPER_V};mg2R3Pull(K.SUPPER_V,dt,true);return;}
  MG2.inh=null;mg2Free(q.h);q.h=null;mg2S('mg_chomp');mg2Shake(0.8,0.6);
  for(const t of mg2Players()){const p=mg2TPos(t),z=mgZone(p.x,p.y,p.z);if(z!=='arena'&&z!=='gut'&&z!=='void')continue;if(t===P)mg2True(P,999,'supper');else mg2Swallow(t,'supper');}
  q.ph='idle';q.t=0;}

/* ---- the self-demo (bible 7.8 III): two of his Husks stand between Dan and his mouth at the first inhale; one stands and is eaten,
   the other braces (half the pull) and slides; the hand then slaps it flat ---- */
function mg2R3DemoBrace(on){for(const a of MG2.adds)if(!a.dead&&a.demo){if(on&&a.demo===1&&!MG2.demoB){MG2.demoB=1;a.demo=2;}}}
function mg2R3DemoHusk(){for(const a of MG2.adds)if(!a.dead&&a.demo===2)return a;return null;}

/* ---- the skilled pilot's tactic: brace far out (or behind a spire) in an inhale, keep off the inner edge in a swallow ---- */
/* the middle of the island at a bearing (islands centred on 0, 60 ... 300 degrees; the gaps are on 30 + 60k) */
function mg2R3Isle(th){const k=Math.round(th/(Math.PI/3));return k*(Math.PI/3);}
function mg2R3Hint(h,pr){const q=MG2.r3;if(!q)return;const F=mgF();pr={r:pr.r,th:mg2R3Isle(pr.th)};
  const near=mg2TelNear(P.x,P.z,1.3);
  if(q.ph==='inhale'||q.ph==='supper'){const sp=mg2R3CoverSpot(pr.th);let x,z;
    if(sp){x=sp.x;z=sp.z;}else{const r=Math.max(13,MG2.edge-(MG2.warn?2.4:1.6));x=MGC.X+Math.cos(pr.th)*r;z=MGC.Z+Math.sin(pr.th)*r;}
    h.stand={x,z,r:0.5};if(Math.hypot(P.x-x,P.z-z)<1.2)h.sneak=true;return;}                 /* run out, then brace */
  if(near){const e2=mgTelEscape(near,P.x,P.z),a0=Math.atan2(e2[1],e2[0]);
    for(const da of [0,0.6,-0.6,1.1,-1.1,1.6,-1.6,Math.PI]){const x=P.x+Math.cos(a0+da)*1.8,z=P.z+Math.sin(a0+da)*1.8,qq=mgPol(x,z);
      if(qq.r>MG2.edge-0.8||qq.r<13)continue;if(!mg2Stand(x,z)||mg2TelNear(x,z,0.6))continue;h.stand={x,z,r:0.35};return;}}
  const r=q.ph==='swallow'?Math.max(14.5,Math.min(19,MG2.edge-2.5)):Math.max(13.5,Math.min(17,MG2.edge-2.5));
  h.stand={x:MGC.X+Math.cos(pr.th)*r,z:MGC.Z+Math.sin(pr.th)*r,r:q.ph==='swallow'?0.5:1.6};}
function mg2R3CoverSpot(th){const F=mgF();let best=null,bd=1e9;
  for(const s of MG2SPIRES){const sx=MGC.X+s[0],sz=MGC.Z+s[1];if(getBlock(Math.floor(sx),F+1,Math.floor(sz))!==B.BEDROCK)continue;
    const st=Math.atan2(s[1],s[0]);if(Math.abs(mg2Ang(st-th))>0.45)continue;                 /* only a spire on Dan's own island */
    const x=sx+Math.cos(st)*2.6,z=sz+Math.sin(st)*2.6;if(Math.hypot(x-MGC.X,z-MGC.Z)>MG2.edge-0.8||!mg2Stand(x,z))continue;
    const d=Math.hypot(x-P.x,z-P.z);if(d<bd){bd=d;best={x,z};}}
  return best;}
MGEX.mgCovered=mg2Covered;MGEX.mg2Inhaling=mg2Inhaling;
