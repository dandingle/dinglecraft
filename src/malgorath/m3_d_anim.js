/* ---- PART 57: m3_d_anim.js ---- */
/* ===================================================================== */
/* PART 57 m3 · file d: the animation (bible 5.3). update(dt,s) reads    */
/* MGA (s) only. Stances blend; arms and legs are two-bone IK (own       */
/* maths) to the targets M2 writes (s.armL/R {pose,t,x,y,z} world); the  */
/* head looks at s.lookX/Y/Z; jaw/split/tongue/eyes/tail/belly/strata/   */
/* light/hat/heads follow their fields. Nothing allocates per frame      */
/* except the first build of a belly item, a hat or a head stack.        */
/* Pose names (s.armL.pose / s.armR.pose): rest raise slam flat scoop    */
/* lift swat pluck drag grab snack drum clutch knuckle hold flinch reach */
/* Stances (s.stance): idle lean stalk rear knuckle stun kneel chest     */
/* headup slump dead. Tail (s.tail.pose): rest raise sweep (t, dir).     */
/* ===================================================================== */
var MG3ST={      /* py pelvis drop, p pelvis pitch, s0/s1 spine pitch, n neck pitch x3, ne neck stretch, h head pitch, hand */
  idle:   {py:0,   p:0.06,s0:0.06,s1:0.1, n:[0.05,0.0,0.0],   ne:1.0, h:0.0,  hand:[5.2,3.4,1.4]},
  lean:   {py:-0.3,p:0.12,s0:0.0, s1:0.3, n:[0.6,0.36,0.18],  ne:0.9, h:-1.01,hand:[6.5,8.2,9.0]},
  stalk:  {py:-1.6,p:0.75,s0:0.3, s1:0.2, n:[-0.5,-0.3,-0.2], ne:1.3, h:-0.3, hand:[4.4,0.5,5.6],walk:1},
  rear:   {py:0.3, p:-0.08,s0:-0.12,s1:-0.14,n:[-0.25,-0.15,0.0],ne:1.15,h:0.3,hand:[6.2,9.5,2.6]},
  knuckle:{py:-2.2,p:0.85,s0:0.4, s1:0.3, n:[-0.55,-0.35,-0.25],ne:1.45,h:-0.6,hand:[3.9,0.4,6.6]},
  stun:   {py:-2.6,p:0.7, s0:0.45,s1:0.35,n:[0.0,-0.2,-0.3],  ne:1.7, h:-0.6, hand:[6.2,0.4,4.2]},
  kneel:  {py:-2.4,p:0.36,s0:0.42,s1:0.36,n:[0.0,-0.1,-0.1],  ne:1.0, h:-0.3, hand:[1.6,8.4,3.6],kneel:1},
  chest:  {py:0,   p:0.08,s0:0.05,s1:0.12,n:[0.25,0.15,0.1],  ne:1.0, h:0.1,  hand:[11,13.1,3.2]},
  headup: {py:0,   p:0.04,s0:0.25,s1:0.25,n:[-0.2,-0.12,-0.06],ne:1.0,h:-0.21,hand:[11,13.1,3.2]},
  slump:  {py:-0.3,p:0.3, s0:0.4, s1:0.38,n:[0.1,0.0,-0.2],   ne:2.3, h:-0.6, hand:[10,12.6,6.5]},
  dead:   {py:-1.2,p:0.5, s0:0.55,s1:0.6, n:[0.5,0.4,0.3],    ne:1.8, h:0.5,  hand:[7,2,5]}};
var MG3NK=[[0,0.55,0.55],[0,0.45,0.6],[0,0.35,0.55]];    /* neck1, neck2, head offsets at rest (scaled by ne) */
function mg3AnimState(){return {t:0,st:Object.assign({},MG3ST.idle,{n:MG3ST.idle.n.slice(),hand:MG3ST.idle.hand.slice()}),stance:'idle',walk:0,px:null,pz:null,
  arm:{L:{pose:'rest',k:0,drv:0,h:[0,0,0],curl:0.35},R:{pose:'rest',k:0,drv:0,h:[0,0,0],curl:0.35}},blinkR:mg3Rng(31337),tail:{k:0,pose:'rest'},items:{},itemKey:'',hat:null,heads:-1,
  ecl:0,shake:0,lastS:null,tmp:{a:[0,0,0],b:[0,0,0],c:[0,0,0],m:new Array(9),m2:new Array(9),m3:new Array(9),m4:new Array(9),T:{m:[1,0,0,0,1,0,0,0,1],p:[0,0,0]},E:[0,0,0],v:[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]]}};}
var MG3DEF=null;
/* ---- two-bone IK */
function mg3V3(v,a,b,c){v[0]=a;v[1]=b;v[2]=c;return v;}
function mg3Ik(A,root,J0,J1,L1,L2,W,pole,flip){const t=A.tmp,V=t.v,Tp=mg3Fk(J0.parent,root,t.T);
  const S=mg3Mv(Tp.m,mg3V3(V[0],J0.position.x,J0.position.y,J0.position.z),t.a);S[0]+=Tp.p[0];S[1]+=Tp.p[1];S[2]+=Tp.p[2];
  const d=mg3V3(V[1],W[0]-S[0],W[1]-S[1],W[2]-S[2]);let L=Math.hypot(d[0],d[1],d[2])||1e-3;const dn=mg3V3(V[2],d[0]/L,d[1]/L,d[2]/L);L=mg3Cl(L,Math.abs(L1-L2)+0.08,L1+L2-0.02);
  const a=(L1*L1-L2*L2+L*L)/(2*L),h=Math.sqrt(Math.max(0,L1*L1-a*a));const pd=pole[0]*dn[0]+pole[1]*dn[1]+pole[2]*dn[2];
  let pn=mg3V3(V[3],pole[0]-dn[0]*pd,pole[1]-dn[1]*pd,pole[2]-dn[2]*pd);if(Math.hypot(pn[0],pn[1],pn[2])<1e-4){if(Math.abs(dn[1])<0.9)mg3V3(pn,0,1,0);else mg3V3(pn,0,0,1);}mg3Nz(pn);
  const E=mg3V3(V[4],S[0]+dn[0]*a+pn[0]*h,S[1]+dn[1]*a+pn[1]*h,S[2]+dn[2]*a+pn[2]*h),u=mg3V3(V[5],(E[0]-S[0])/L1,(E[1]-S[1])/L1,(E[2]-S[2])/L1);
  const f=mg3V3(V[6],(S[0]+dn[0]*L-E[0])/L2,(S[1]+dn[1]*L-E[1])/L2,(S[2]+dn[2]*L-E[2])/L2);
  let x=flip?mg3X(u,f,V[7]):mg3X(f,u,V[7]);if(Math.hypot(x[0],x[1],x[2])<1e-4)x=flip?mg3X(dn,pn,V[7]):mg3X(pn,dn,V[7]);mg3Nz(x);
  const y=mg3V3(V[8],-u[0],-u[1],-u[2]),z=mg3X(x,y,V[9]),Rr=t.m;Rr[0]=x[0];Rr[1]=y[0];Rr[2]=z[0];Rr[3]=x[1];Rr[4]=y[1];Rr[5]=z[1];Rr[6]=x[2];Rr[7]=y[2];Rr[8]=z[2];
  const Rl=mg3Mm(mg3Mt(Tp.m,t.m2),Rr,t.m3),e=mg3Eu(Rl,J0.rotation.order,t.E);J0.rotation.set(e[0],e[1],e[2]);
  const fJ=mg3Mv(mg3Mt(Rr,t.m2),f,t.b),be=Math.atan2(-fJ[2],-fJ[1]);J1.rotation.set(be,0,0);
  mg3Mm(Rr,mg3Me(be,0,0,'XYZ',t.m2),t.m3);return t.m3;}
/* point a child joint's -y at a root-frame direction F with its +z toward Bk, given its parent's root-frame rotation Rp */
function mg3Orient(A,J,Rp,F,Bk,lim){const t=A.tmp,V=t.v;const y=mg3Nz(mg3V3(V[10],-F[0],-F[1],-F[2]));const dz=Bk[0]*y[0]+Bk[1]*y[1]+Bk[2]*y[2];const z=mg3Nz(mg3V3(V[11],Bk[0]-y[0]*dz,Bk[1]-y[1]*dz,Bk[2]-y[2]*dz));
  const x=mg3X(y,z,V[7]),R=t.m;R[0]=x[0];R[1]=y[0];R[2]=z[0];R[3]=x[1];R[4]=y[1];R[5]=z[1];R[6]=x[2];R[7]=y[2];R[8]=z[2];
  const Rp2=t.m4;for(let i=0;i<9;i++)Rp2[i]=Rp[i];const Rl=mg3Mm(mg3Mt(Rp2,t.m2),R,t.m3),e=mg3Eu(Rl,J.rotation.order,t.E);if(lim){e[0]=mg3Cl(e[0],-lim,lim);e[1]=mg3Cl(e[1],-lim,lim);e[2]=mg3Cl(e[2],-lim,lim);}J.rotation.set(e[0],e[1],e[2]);}
function mg3Ease(x){x=mg3Cl(x,0,1);return x*x*(3-2*x);}
function mg3ToRoot(r,s,x,y,z,o){const sx=s?s.x:0,sy=s?s.y:0,sz=s?s.z:0,yaw=s?s.yaw:0,dx=x-sx,dz=z-sz,c=Math.cos(-yaw),sn=Math.sin(-yaw);o=o||[0,0,0];
  o[0]=dx*c+dz*sn;o[1]=y-sy;o[2]=-dx*sn+dz*c;return o;}
/* ---- the pose: everything a frame needs ---- */
function mg3Pose(r,dt,s){if(r.dead)return;const A=r.A,J=r.J||(r.J=r.joints),P=MG3P;if(!s){if(!MG3DEF)MG3DEF=mgAnimDefault();s=MG3DEF;}
  dt=Math.min(0.1,Math.max(0,dt||0));A.t+=dt;const T=A.t,st=A.st,tg=MG3ST[s.stance]||MG3ST.idle,k=1-Math.exp(-dt*(s.stance==='slump'||s.stance==='stun'?5:3.2));
  /* stance params blend toward the target stance */
  const reach=(s.stance==='slump'||s.stance==='stun'||s.stance==='dead')&&!!(s.lookX||s.lookZ);
  for(const key of reach?['py','p','s0','s1']:['py','p','s0','s1','ne','h'])st[key]+=(tg[key]-st[key])*(dt?k:1);for(let i=0;i<3;i++){if(!reach)st.n[i]+=(tg.n[i]-st.n[i])*(dt?k:1);st.hand[i]+=(tg.hand[i]-st.hand[i])*(dt?k:1);}
  const breathe=Math.sin(T*Math.PI*2*0.25),heart=(s.heart||60)/60,pulse=Math.pow(Math.max(0,Math.sin(T*Math.PI*2*heart)),8);
  const fl=(s.flinch||0)*0.12+(s.recoil||0)*0.2,hurtJ=(s.hurt||0)*0.04*Math.sin(T*60);
  J.pelvis.position.y=P.pelvis[1]+st.py;J.pelvis.rotation.set(st.p+fl*0.3,0,hurtJ);
  J.spine0.rotation.set(st.s0+breathe*0.015-fl*0.5,0,0);J.spine1.rotation.set(st.s1-breathe*0.02-fl*0.6,0,0);
  r.parts.chest.scale.set(1+breathe*0.02,1,1+breathe*0.035);
  /* the head REACHES in slump / stun / dead when s.lookX/Z is set */
  if(reach){const R=mg3ToRoot(r,s,s.lookX,s.lookY,s.lookZ,A.tmp.c),dx=R[0],dz=R[2],dl=Math.hypot(dx,dz)||1;
    const hs=s.stance==='slump'?[1.35,0.55]:[2.7,-0.6],Hd=[R[0]-dx/dl*hs[0],R[1]+hs[1],R[2]-dz/dl*hs[0]];
    const T1=mg3Fk(J.spine1,J.root,A.tmp.T),N0=mg3Mv(T1.m,P.neck0,A.tmp.a);N0[0]+=T1.p[0];N0[1]+=T1.p[1];N0[2]+=T1.p[2];
    const v=mg3Mv(mg3Mt(T1.m,A.tmp.m2),[Hd[0]-N0[0],Hd[1]-N0[1],Hd[2]-N0[2]],A.tmp.b),ft=Math.atan2(v[1],v[2]),len=Math.hypot(v[1],v[2]);
    /* closed loop: aim + stretch the neck chord at Hd (a few corrections per frame; the chord's angle is not the sum of the pitches) */
    if(A.rt==null){A.rt=0.67-ft;A.rn=len/2.17;}
    for(let it=0;it<4;it++){const tn=[A.rt*0.5,A.rt*0.3,A.rt*0.2],ne2=mg3Cl(A.rn,0.8,5.4);J.neck0.rotation.set(tn[0],0,0);J.neck1.rotation.set(tn[1],0,0);J.neck2.rotation.set(tn[2],0,0);
      J.neck1.position.set(0,MG3NK[0][1]*ne2,MG3NK[0][2]*ne2);J.neck2.position.set(0,MG3NK[1][1]*ne2,MG3NK[1][2]*ne2);J.head.position.set(0,MG3NK[2][1]*(0.7+0.3*ne2),MG3NK[2][2]*(0.7+0.3*ne2));
      const Hc=mg3Wp(J.head,[0,0,0],J.spine1,A.tmp.c),cy=Hc[1]-P.neck0[1],cz=Hc[2]-P.neck0[2],ca=Math.atan2(cy,cz),cl=Math.hypot(cy,cz);
      A.rt+=(ca-ft);A.rn*=mg3Cl(len/Math.max(0.5,cl),0.7,1.4);A.rn=mg3Cl(A.rn,0.8,5.4);}
    const nt=[A.rt*0.5,A.rt*0.3,A.rt*0.2],net=A.rn,kk=dt?k*1.6:1;for(let i=0;i<3;i++)st.n[i]+=(nt[i]-st.n[i])*Math.min(1,kk);st.ne+=(net-st.ne)*Math.min(1,kk);
    const ht=-(st.p+st.s0+st.s1+st.n[0]+st.n[1]+st.n[2])+0.05;st.h+=(ht-st.h)*Math.min(1,kk);}
  else A.rt=null;
  const ne=st.ne;J.neck1.position.set(0,MG3NK[0][1]*ne,MG3NK[0][2]*ne);J.neck2.position.set(0,MG3NK[1][1]*ne,MG3NK[1][2]*ne);J.head.position.set(0,MG3NK[2][1]*(0.7+0.3*ne),MG3NK[2][2]*(0.7+0.3*ne));
  J.neck0.rotation.set(st.n[0],0,0);J.neck1.rotation.set(st.n[1],0,0);J.neck2.rotation.set(st.n[2],0,0);
  /* the head looks at s.lookX/Y/Z (world) when set */
  let hy=0,hp=0;if(s.lookX||s.lookZ){const tp=mg3ToRoot(r,s,s.lookX,s.lookY,s.lookZ,A.tmp.c),T2=mg3Fk(J.neck2,J.root,A.tmp.T),q=[tp[0]-T2.p[0],tp[1]-T2.p[1],tp[2]-T2.p[2]],lq=mg3Mv(mg3Mt(T2.m,A.tmp.m2),q,A.tmp.b);
    hy=mg3Cl(Math.atan2(lq[0],lq[2]),-0.65,0.65);hp=mg3Cl(Math.atan2(-lq[1],Math.hypot(lq[0],lq[2])),-0.45,0.5);}
  const lk=(s.stance==='slump'||s.stance==='dead')?0.15:0.8;J.head.rotation.order='YXZ';J.head.rotation.set(st.h+(hp-st.h*0)*lk*0.5,hy*lk,0);
  /* legs: hoof targets in the root frame; a walk cycle from the distance travelled (no skating), kneel puts the left knee down */
  if(A.px===null){A.px=s.x||0;A.pz=s.z||0;}const mv=Math.hypot((s.x||0)-A.px,(s.z||0)-A.pz);A.px=s.x||0;A.pz=s.z||0;if(mv<3)A.walk+=mv/4.2*Math.PI*2;
  const wk=tg.walk?1:0,ph=A.walk;
  for(const sd of [1,-1]){const L=sd>0?'L':'R',phi=ph+(sd>0?0:Math.PI),sw=wk?Math.max(0,Math.sin(phi)):0;
    let hx=sd*2.15,hyv=0.05+sw*0.9,hz=0.35+(wk?Math.cos(phi)*1.05:0);
    if(tg.kneel&&sd>0){hyv=0.05;hz=-1.8;}
    const W=[hx,hyv+P.foot*0.92,hz-0.25],Re=mg3Ik(A,J.root,J['hip'+L],J['knee'+L],P.thigh,P.shin,W,[0,0.15,1],1);
    mg3Orient(A,J['hock'+L],Re,[0,-0.95,0.32],[0,0.3,1]);
    const hr=J['hip'+L].rotation;J['glute'+L].rotation.set(hr.x*0.5,hr.y*0.5,hr.z*0.5);}
  /* arms */
  for(const sd of [1,-1]){mg3Arm(r,A,s,sd,dt,st,tg,T);}
  /* jaw, split, tongue (chewing in the idles), the six eyes, the hand-eyes */
  const chew=(s.jaw<0.05&&(s.stance==='idle'||s.stance==='lean'||s.stance==='chest'||s.stance==='stalk'))?0.1*(0.5+0.5*Math.sin(T*2.6)):0;
  const jaw=mg3Cl((s.jaw||0)+chew,0,1),split=mg3Cl(s.split||0,0,1),op=jaw*0.62+split*0.6;
  J.mandL.rotation.set(op,split*0.6,0);J.mandR.rotation.set(op,-split*0.6,0);
  const tng=mg3Cl(s.tongue||0,0,1);J.tongue0.position.set(0,P.tongue0[1]-op*1.6,P.tongue0[2]+tng*2.4);J.tongue0.rotation.set(op*0.55-tng*0.25,0,0);
  for(let i=1;i<=P.tongueN;i++){const j=J['tongue'+i];j.rotation.set(tng*(0.18*Math.sin(T*7+i*0.9))+(1-tng)*0.04,tng*0.22*Math.sin(T*5.3+i*1.3),0);}
  mg3Eyes(r,A,s,dt,T);
  /* the tail: sway, raise (the cube rattles, glows), sweep (180 deg, low; s.tail.t 0..1, s.tail.dir +-1) */
  mg3Tail(r,A,s,T,dt);
  /* rebuild every bending skin (neck, tail, tongue, fingers, the mouth's floor and cheeks) */
  for(const sw of r.sweeps){if(sw.drool)sw.drool.dt=dt;if(sw.tick)sw.tick(false);else mg3SweepTick(sw,false);}
  mg3Look(r,A,s,dt,T,pulse);}
function mg3Arm(r,A,s,sd,dt,st,tg,T){const J=r.joints,P=MG3P,L=sd>0?'L':'R',a=s[sd>0?'armL':'armR']||{pose:'rest',t:0},S=A.arm[L];
  if(a.pose!==S.pose){S.pose=a.pose;S.k=0;S.drv=0;}S.k+=dt;if((a.t||0)>0)S.drv=1;const pr=S.drv?mg3Cl(a.t||0,0,1):mg3Cl(S.k/(({raise:1.0,slam:0.12,scoop:1.2,lift:2.0,swat:1.0,pluck:1.2,grab:1.6,snack:1.6,flinch:0.4,reach:0.8})[a.pose]||1),0,1);
  const has=(a.x||a.z)?1:0,tw=has?mg3ToRoot(r,s,a.x,a.y,a.z,A.tmp.c):null;
  const rest=[sd*st.hand[0],st.hand[1],st.hand[2]];
  if(tg.walk){const phi=A.walk+(sd>0?Math.PI:0),sw=Math.max(0,Math.sin(phi));rest[2]+=Math.cos(phi)*1.6;rest[1]+=sw*1.4;}
  rest[1]+=Math.sin(T*1.3+sd)*0.15;
  let W=rest.slice(),F=[sd*0.15,-1,0.35],Bk=[sd*0.55,0,0.85],curl=0.4,dig=0;const pose=a.pose||'rest';
  const out=tw?mg3Nz([tw[0]-sd*4.5,0,tw[2]-0.2]):[sd*0.7,0,0.7];
  if(pose==='raise'&&tw){const e=mg3Ease(pr);W=[mg3Lp(rest[0],tw[0]-out[0]*1.4,e),mg3Lp(rest[1],tw[1]+5.5,e),mg3Lp(rest[2],tw[2]-out[2]*1.4,e)];F=[out[0]*0.7,-0.7,out[2]*0.7];Bk=[0,1,0];curl=0.15;}
  else if((pose==='slam'||pose==='flat')&&tw){const e=pose==='slam'?Math.pow(pr,2):1;W=[tw[0]-out[0]*1.25,mg3Lp(tw[1]+5.5,tw[1]+0.75,e),tw[2]-out[2]*1.25];F=[out[0],-0.12,out[2]];Bk=[0,1,0];
    curl=pose==='flat'?0.18+0.14*Math.sin(T*5.5):0.05;dig=pose==='flat'?1:0;}
  else if(pose==='scoop'&&tw){W=[tw[0]-out[0]*1.2,tw[1]+1.1,tw[2]-out[2]*1.2];F=[out[0]*0.6,-0.8,out[2]*0.6];Bk=[-out[0],-0.3,-out[2]];curl=0.72;}
  else if((pose==='lift'||pose==='hold')&&tw){W=[tw[0]-sd*1.0,tw[1]-0.8,tw[2]];F=[0,0.1,1];Bk=[0,-1,0];curl=0.55;}
  else if(pose==='swat'){const c=tw||[0,9,8],gap=mg3Lp(3.2,0.5,mg3Ease((pr-0.6)/0.4));W=[c[0]+sd*gap,c[1],c[2]];F=[0,1,0];Bk=[sd,0,0];curl=0;}
  else if(pose==='pluck'&&tw){const e=mg3Ease(pr);W=[mg3Lp(rest[0],tw[0],e),mg3Lp(rest[1],tw[1]+1.2,e),mg3Lp(rest[2],tw[2],e)];F=[0,-1,0.1];Bk=[sd,0,0.3];curl=pr>0.7?0.95:0.15;}
  else if(pose==='drag'&&tw){W=[tw[0]-out[0]*2.2,tw[1]+2.4,tw[2]-out[2]*2.2];F=[out[0]*0.5,-0.85,out[2]*0.5];Bk=[out[0],0.4,out[2]];curl=0.45;}
  else if((pose==='grab'||pose==='snack')&&tw){const m=[0,13.4,7.2],e1=mg3Ease(pr*2),e2=mg3Ease(pr*2-1),P1=[mg3Lp(rest[0],tw[0],e1),mg3Lp(rest[1],tw[1]+0.9,e1),mg3Lp(rest[2],tw[2],e1)];
    W=[mg3Lp(P1[0],m[0]+sd*1.2,e2),mg3Lp(P1[1],m[1],e2),mg3Lp(P1[2],m[2],e2)];F=pr<0.5?[0,-1,0.2]:[0,0.2,1];Bk=pr<0.5?[sd,0,0.3]:[0,-1,0];curl=pr>0.4?0.9:0.2;}
  else if(pose==='drum'){W=tw?[tw[0]-out[0]*1.2,tw[1]+0.8,tw[2]-out[2]*1.2]:[sd*6.5,st.hand[1],st.hand[2]];F=[out[0],-0.2,out[2]];Bk=[0,1,0];curl=0.25;dig=2;}
  else if(pose==='clutch'){W=[sd*1.9,8.3+0.3*Math.sin(T*3),3.8];F=[-sd*0.8,-0.4,0.3];Bk=[0,0,1];curl=0.6;}
  else if(pose==='knuckle'&&tw){W=[tw[0],tw[1]+1.1,tw[2]];F=[0,-1,0.15];Bk=[sd*0.3,0,1];curl=1;}
  else if(pose==='flinch'){const e=Math.sin(pr*Math.PI);W=[rest[0]+sd*1.5*e,rest[1]+4*e,rest[2]-1.5*e];curl=0.1;}
  else if(pose==='reach'&&tw){const e=mg3Ease(pr);W=[mg3Lp(rest[0],tw[0],e),mg3Lp(rest[1],tw[1]+1.0,e),mg3Lp(rest[2],tw[2],e)];F=[out[0]*0.5,-0.7,out[2]*0.5];Bk=[0,1,0];curl=0.3;}
  else if(tg.walk||s.stance==='knuckle'||s.stance==='stun'){F=[0,-1,0.1];Bk=[sd*0.25,0,1];curl=0.95;}
  else if(s.stance==='chest'||s.stance==='headup'){F=[sd*0.45,-0.05,0.85];Bk=[0,1,0];curl=0.3;}
  else if(s.stance==='lean'){F=[sd*0.35,-0.1,0.9];Bk=[0,1,0];curl=0.2;dig=2;}
  /* smooth the wrist target (fast for strikes, slow for idles) */
  const fast=(pose==='slam'||pose==='swat'||pose==='flinch')?40:(pose==='rest'?4:9),kk=1-Math.exp(-dt*fast);
  if(!S.init){S.h[0]=W[0];S.h[1]=W[1];S.h[2]=W[2];S.init=1;}for(let i=0;i<3;i++)S.h[i]+=(W[i]-S.h[i])*(dt?kk:1);
  const Re=mg3Ik(A,J.root,J['shoulder'+L],J['elbow'+L],P.upper,P.fore,S.h,[sd*0.55,-0.25,-0.8],0);
  mg3Orient(A,J['wrist'+L],Re,F,Bk,1.0);
  const sr=J['shoulder'+L].rotation;J['delt'+L].rotation.set(sr.x*0.5,sr.y*0.5,sr.z*0.5);
  S.curl+=(curl-S.curl)*(dt?Math.min(1,dt*(fast>20?20:8)):1);
  for(let f=0;f<4;f++){const ch=J['f'+L+f],c=S.curl+(dig===2?0.22*Math.max(0,Math.sin(T*9+f*1.3)):0)+(dig===1?0.06*Math.sin(T*6+f):0);
    ch[0].rotation.set(c*1.0,0,sd*(f-1.5)*0.13*(1-c*0.7));ch[1].rotation.set(c*1.15,0,0);ch[2].rotation.set(c*0.9,0,0);}}
function mg3Eyes(r,A,s,dt,T){const tc=s.telCol?MG3C.TEL[s.telCol]:null,te=s.tel?Math.max(s.tel[4]||0,s.commit?1:0):0,vu=s.vuln?1:0;
  for(let i=0;i<r.eyes.length;i++){const e=r.eyes[i];if(e.next<=0)e.next=(e.big?6:2)+A.blinkR()*(e.big?6:4.5);e.next-=dt;
    if(e.next<=0)e.bl=0.14;e.bl=Math.max(0,e.bl-dt);let open=e.bl>0?0.08:1;
    /* the intro (bible 6, t 10): the four brow eyes open one after another, then the two big ones; each flares white */
    if(r.kind==='boss'&&typeof CUT!=='undefined'&&CUT.on&&CUT.script&&MGL.phase==='intro'&&CUT.script.end>8){const t=CUT.t,o=e.big?11.4+(i%2)*0.25:10+(i-2)*0.35;open=t<o?0.06:Math.min(1,(t-o)*6);e.fl=t>=o&&t<o+0.5?1-(t-o)*2:0;}
    e.m.scale.set(1,open,1);}
  const fl=r.eyes.reduce((m,e)=>Math.max(m,e.fl||0),0);const M=r.mats.eye;if(M.emissive&&M.emissive.setRGB){let c=[1,1,1];const te2=Math.max(te,fl);if(te2>0)c=[mg3Lp(1,(tc?tc[0]:1)*1.6,te2),mg3Lp(1,(tc?tc[1]:1)*1.6,te2),mg3Lp(1,(tc?tc[2]:1)*1.6,te2)];
    const d=vu?0.4:1;M.emissive.setRGB(c[0]*d,c[1]*d,c[2]*d);M.emissiveIntensity=(1+te*1.8+(s.hurt||0)*0.6)*d;}
  for(const sd of [1,-1]){const L=sd>0?'L':'R',o=mg3Cl(sd>0?(s.eyeL||0):(s.eyeR||0),0,1);
    r.joints['lidA'+L].rotation.x=-o*1.15;r.joints['lidB'+L].rotation.x=o*1.15;const hm=r.parts['handEye'+L];hm.scale.set(1,0.3+0.7*o,1);
    const m=r.mats.handEye;if(m.emissive&&m.emissive.setRGB&&sd>0){const g=Math.max(s.eyeL||0,s.eyeR||0)*(s.vuln?1:0.35);m.emissive.setRGB(g*1.0,g*0.7,g*0.18);m.emissiveIntensity=1+0.6*Math.sin(T*8)*g;}}}
function mg3Tail(r,A,s,T,dt){const ch=r.joints.tailCh,tl=s.tail||{pose:'rest',t:0},N=ch.length-1;
  if(tl.pose!==A.tail.pose){A.tail.pose=tl.pose;A.tail.k=0;}A.tail.k+=dt;
  const raise=tl.pose==='raise'?mg3Ease(tl.t>0?tl.t:A.tail.k/1.0):0,swp=tl.pose==='sweep'?mg3Cl(tl.t>0?tl.t:A.tail.k/0.5,0,1):-1,dir=tl.dir||1;
  const pp=r.A.st.p+r.A.st.s0*0.3;
  for(let i=0;i<N;i++){const base=i===0?-0.75-pp:(i<6?0.07:0.1),up=i===0?-0.15-pp:(i<6?-0.02:0.13);let rx=mg3Lp(base,up,raise),ry=0.1*Math.sin(T*0.8-i*0.45)*(1-raise*0.6);
    if(swp>=0){const ang=mg3Lp(-1.4,1.4,mg3Ease(swp))*dir;ry=ang/N*2.2+0.04*Math.sin(T*3-i);rx=i===0?-1.05-pp:(i<5?0.14:-0.01);}
    ch[i].rotation.set(rx,ry,0);}
  const cg=Math.max(s.cubeGlow||0,(s.tel&&s.tel[1])||0,raise*0.6),pc=r.parts.cubeGlow;pc.visible=cg>0.02;r.mats.cubeGlow.opacity=cg*0.75;
  const rat=raise>0.3&&swp<0?Math.sin(T*40)*0.06*raise:0;r.parts.cube.rotation.set(0.15+rat,0.4+rat,0.1);}
/* materials, light, belly, strata, hat and heads: the pictures that follow MGA */
function mg3Look(r,A,s,dt,T,pulse){const M=r.mats,rd=mg3Cl(s.round||1,1,3),C=MG3C['R'+rd],dead=mg3Cl(s.dead||0,0,1);
  const ci=(s.crack&&s.crack.i!=null?s.crack.i:1)*(0.75+0.4*pulse)*(rd===3?1.25:1)+(s.hurt||0)*1.2+dead*3;let cr=C[0],cg=C[1],cb=C[2];if(dead>0){cr=mg3Lp(cr,1,dead);cg=mg3Lp(cg,0.97,dead);cb=mg3Lp(cb,0.85,dead);}
  for(const key of ['hide','handL','handR','brow']){const m=M[key];if(!m||!m.emissive||!m.emissive.setRGB)continue;m.emissive.setRGB(cr,cg,cb);m.emissiveIntensity=ci*(key==='brow'?(rd===3?0.45:0.8):1);
    const u=m.userData&&m.userData.mgRim;if(u&&u.value.setRGB){const rim=(s.rim==null?0.4:s.rim)*(rd===3?1.25:1);u.value.setRGB(cr*rim,cg*rim,cb*rim);}}
  /* commit flash / claw channel: the attacking hand goes white-hot */
  const claws=s.tel?(s.tel[0]||0):0;for(const [key,arm] of [['handL',s.armL],['handR',s.armR]]){const m=M[key];if(!m||!m.emissive||m===M.hide)continue;const act=arm&&arm.pose&&arm.pose!=='rest';
    const w=Math.max(claws,(s.commit&&act)?1:0);if(w>0){m.emissive.setRGB(mg3Lp(cr,1,w),mg3Lp(cg,1,w),mg3Lp(cb,1,w));m.emissiveIntensity=ci+w*2.5;}}
  /* the light: one PointLight at its anchor (chest R1-R2, mouth in the ride, throat in R3 head-up, belly in the swallow) */
  const L=s.light||{at:'chest',i:1.6,col:0xff5a22},an=r.joints[{chest:'aChest',mouth:'aMouth',throat:'aThroat',belly:'aBelly'}[L.at]||'aChest'];
  if(r.light){const p=mg3Wp(an,[0,0,0],r.root,A.tmp.a);r.light.position.set(p[0],p[1],p[2]);r.light.intensity=(L.i==null?1.6:L.i)*(1-(s.hurt||0)*0.5);
    r.light.distance=L.d||(rd===3?40:30);if(r.light.color&&r.light.color.set)r.light.color.set(L.col==null?0xff5a22:L.col);}
  /* the sun in his throat + the god-ray cards (R3, head up) */
  const throat=L.at==='throat'&&rd===3&&dead<1,sw=throat?1:0;r.parts.sun.visible=sw>0||dead>0.2;r.parts.sun.scale.setScalar?r.parts.sun.scale.setScalar(2.2+pulse*0.4+dead*3):r.parts.sun.scale.set(2.2,2.2,2.2);
  M.ray.opacity=sw*(0.35+0.25*mg3Cl(s.jaw||0,0,1)+0.1*pulse)+dead*0.6;for(const rr of r.parts.rays)rr.visible=M.ray.opacity>0.01;
  /* the belly: crust plates lift (bellyache), the glow, what he ate floating inside */
  const bl=s.belly||{};const lift=mg3Cl(bl.lift||0,0,1),bul=bl.bulge||0;r.joints.belly.scale.set(1+bul*0.18,1+bul*0.14,1+bul*0.3);
  if(Math.abs((A.lift||0)-lift)>0.01){A.lift=lift;mg3CrustLift(r,lift);}
  const gl=mg3Cl(0.6+(bl.glow||0)*0.8+pulse*0.25+dead,0,2.5);if(M.glow.color&&M.glow.color.setRGB){const gc=rd===3?[1,0.92,0.7]:[1,0.5,0.15];M.glow.color.setRGB(gc[0]*gl*0.6,gc[1]*gl*0.6,gc[2]*gl*0.6);}
  if(M.crust.emissiveIntensity!=null)M.crust.emissiveIntensity=0.7+gl*0.5;
  mg3BellyItems(r,A,bl.items||[],T);
  /* the Strata: the oak burns in R3 (s.strata.tree), the cottage roof's window (s.strata.roof) */
  const sTr=s.strata||{};const burn=sTr.tree?1:0;for(let i=0;i<r.parts.flames.length;i++){const f=r.parts.flames[i];f.visible=!!burn;if(burn){const ph=T*6+i*1.7;f.position.set(Math.sin(ph)*1.1,Math.abs(Math.sin(ph*0.7))*1.2-0.5+i*0.3,Math.cos(ph*1.3)*1.1);f.scale.set(1.2+0.4*Math.sin(ph*2),1.8+0.6*Math.sin(ph*1.6),1);}}
  if(M.win.color&&M.win.color.setRGB){const w=mg3Cl(sTr.roof==null?1:sTr.roof,0,1)*(0.85+0.15*Math.sin(T*11)*Math.sin(T*3.1));M.win.color.setRGB(w,w*0.82,w*0.45);}
  /* Dan's hat and the pixel heads on the left horn (s.hat, s.heads) */
  /* the slot machine sparks now and then; the rail rattles round the horn when he roars (jaw and split wide) */
  if(r.kind==='boss'&&r.root.parent){A.slotT=(A.slotT||1.5)-dt;if(A.slotT<=0){A.slotT=0.8+A.blinkR()*2.2;const p=mg3Wp(r.joints.slot,[0,0.6,0.4],null,A.tmp.a);mg3Burst('spark',p[0],p[1],p[2],{n:5,spd:4,size:0.6});}
    const roar=mg3Cl(((s.jaw||0)-0.5)*2,0,1)*mg3Cl((s.split||0)*2,0,1);r.parts.rail.rotation.set(roar*0.05*Math.sin(T*47),roar*0.04*Math.sin(T*39),0);}
  /* the burst (bible 13): the hat flies off his horn in an arc onto Dan's head, the pixel heads pop off and bounce */
  const dying=typeof CUT!=='undefined'&&CUT.on&&MGL.phase==='death';
  if(dying&&A.hat&&!s.hat&&r.root.parent){const p=mg3Wp(r.joints.spike,[0,0,0],null,A.tmp.a);mg3Fly('hat',A.hat,p);}
  if(dying&&A.heads>0&&!(s.heads|0)&&r.root.parent){const p=mg3Wp(r.joints.spike,[0,0,0],null,A.tmp.a);for(let i=0;i<A.heads;i++)mg3Fly('head',i,p);}
  if((s.heads|0)!==A.heads)mg3Heads(r,A,s.heads|0);if((s.hat||null)!==A.hat)mg3Hat(r,A,s.hat||null);}
/* things that fly off him at the burst: the hat (an arc onto Dan's head over 1.3 s) and the heads (tossed, bouncing on the island) */
function mg3Fly(kind,id,p){let m=null;if(kind==='hat'&&typeof buildHat==='function'){m=buildHat(id);}
  else{const face=mg3DanFace();m=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),[mg3DanSkin(),mg3DanSkin(),mg3DanSkin(),mg3DanSkin(),face,mg3DanSkin()]);}
  if(!m)return;m.position.set(p[0],p[1],p[2]);if(typeof scene!=='undefined')scene.add(m);const R=MG3FX.R||(mg3PtInit()&&MG3FX.R);
  MG3FX.fly.push({m,kind,t:0,p0:[p[0],p[1],p[2]],v:[(R()-0.5)*8,7+R()*5,(R()-0.5)*8],floor:typeof mgF==='function'?mgF():p[1]-10});}
function mg3CrustLift(r,lift){const g=r.parts.crust.geometry,P=g.attributes.position,D=r.GP.crustD;if(!P||!P.array||!D)return;if(r.parts.crust.geometry===r.GP.crust){r.parts.crust.geometry=mg3Geo(D);}
  const a=r.parts.crust.geometry.attributes.position.array;for(let k=0;k<D.pos.length/3;k++){const pl=D.plate[k];const c=pl>=0?D.cs[pl]:[0,0];const o=pl>=0?lift*(0.35+0.2*((pl*7)%3)):0;
    a[k*3]=D.pos[k*3]+c[0]*o*0.25;a[k*3+1]=D.pos[k*3+1]+c[1]*o*0.25;a[k*3+2]=D.pos[k*3+2]+o;}r.parts.crust.geometry.attributes.position.needsUpdate=true;}
/* what he ate (bible 5.5): items [{k:'cow'|'bot'|'block'|'dan'|'tnt'|'sun'|'item', id, name}], at most 3, tumbling at real scale */
function mg3BellyItems(r,A,items,T){const key=items.slice(-3).map(i=>i&&(i.k+':'+(i.id||i.name||''))).join('|');const C=r.joints.contents;
  if(key!==A.itemKey){A.itemKey=key;while(C.children.length)C.remove(C.children[0]);
    items.slice(-3).forEach((it,n)=>{if(!it)return;const g=mg3ItemMesh(it);if(!g)return;g.position.set((n-1)*1.2,0.1*(n%2),0);C.add(g);});}
  for(let i=0;i<C.children.length;i++){const g=C.children[i];g.rotation.set(T*0.4+i,T*0.3+i*2,T*0.2);g.position.y=Math.sin(T*0.7+i*2)*0.25;}}
function mg3ItemMesh(it){try{
  if(it.k==='cow'||it.k==='mob'){const r=makeMobMesh(it.id||'cow');const g=r&&r.G;if(g){g.scale.set(0.8,0.8,0.8);const w=new THREE.Group();g.position.set(0,-0.6,0);w.add(g);return w;}}
  if(it.k==='block'||it.k==='tnt'){const id=it.k==='tnt'?B.TNT:(it.id||B.DIRT);const m=new THREE.Mesh(mkCubeGeo(id,1),typeof matOp!=='undefined'&&matOp?matOp:new THREE.MeshLambertMaterial());return m;}
  if(it.k==='sun'){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:mg3Soft(),color:0xfff0c0,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));s.scale.set(2.6,2.6,2.6);return s;}
  if(it.k==='dan'||it.k==='bot'){const g=new THREE.Group(),col=it.k==='dan'?[0xe8b88f,0xd9822b,0x34343a]:[0xcaa070,it.col||0x6a8a3a,0x3a3a40];
    const b=(w,h,d,c,x,y,z,rx)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));m.position.set(x,y,z);if(rx)m.rotation.x=rx;g.add(m);};
    b(0.5,0.5,0.5,col[0],0,0.55,0.25,0.6);b(0.5,0.7,0.3,col[1],0,0,0);b(0.2,0.6,0.22,col[1],0.35,0.1,0.25,-1.2);b(0.2,0.6,0.22,col[1],-0.35,0.1,0.25,-1.2);b(0.22,0.6,0.22,col[2],0.13,-0.35,0.3,-1.5);b(0.22,0.6,0.22,col[2],-0.13,-0.35,0.3,-1.5);return g;}
  if(it.k==='item'&&it.id&&typeof iconTex==='function'){const s=new THREE.Sprite(iconTex(it.id));s.scale.set(1,1,1);return s;}}catch(err){mgFail('m3 belly',err);}return null;}
function mg3Heads(r,A,n){A.heads=n;const sp=r.joints.spike;for(const c of sp.children.slice())if(c.userData.mgHead)sp.remove(c);
  const d=r.joints.spikeDir,face=mg3DanFace();for(let i=0;i<Math.min(5,n);i++){const m=new THREE.Mesh(r.GP.headCube,[0,0,0,0,face,0].map(f=>f?face:mg3DanSkin()));m.userData.mgHead=1;
    m.position.set(-d[0]*(0.35+i*0.55),-d[1]*(0.35+i*0.55),-d[2]*(0.35+i*0.55));m.rotation.set(0.3*i,0.7*i,0.2);sp.add(m);}}
function mg3Hat(r,A,h){A.hat=h;const sp=r.joints.spike;for(const c of sp.children.slice())if(c.userData.mgHat)sp.remove(c);
  if(!h||typeof buildHat!=='function')return;const g=buildHat(h);g.userData.mgHat=1;g.scale.set(1.6,1.6,1.6);g.position.set(0,0.15,0);g.rotation.z=-0.3;sp.add(g);}
function mg3DanSkin(){if(!MG3.geo.danSkin)MG3.geo.danSkin=new THREE.MeshLambertMaterial({color:0xe8b88f});return MG3.geo.danSkin;}
function mg3DanFace(){if(MG3.geo.danFace)return MG3.geo.danFace;const c=mg3Cv(8,8),g=c.getContext('2d');g.fillStyle='#e8b88f';g.fillRect(0,0,8,8);g.fillStyle='#5a3a22';g.fillRect(0,0,8,2);
  g.fillStyle='#ffffff';g.fillRect(1,3,2,1);g.fillRect(5,3,2,1);g.fillStyle='#2b2430';g.fillRect(2,3,1,1);g.fillRect(5,3,1,1);g.fillStyle='#a05a4a';g.fillRect(3,6,2,1);
  const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;MG3.geo.danFace=new THREE.MeshLambertMaterial({map:t});return MG3.geo.danFace;}
/* LOD (bible 5.8): L0 within 50 m; L1 50-140 m hides the mouth interior, the inner teeth and the drool; geometry swap only */
function mg3Lod(r,l){l=l?1:0;if(r.lodLevel===l)return;r.lodLevel=l;const P=r.parts;
  for(const k of ['palate','throat','mouthFloor','cheekL','cheekR','tongue','teethLL','teethLR'])if(P[k])P[k].visible=!l;
  if(!r.GP1&&l)r.GP1=mg3Parts(r.q*0.5);const G=l?r.GP1:r.GP;
  for(const [k,g] of [['pelvis','pelvis'],['belly','belly'],['chest','chest'],['skull','skull'],['horns','horns'],['teethU','teethU']])if(P[k])P[k].geometry=G[g];
  for(const s of ['L','R'])for(const [k,g] of [['delt','delt'],['upper','upper'],['fore','fore'],['palm','palm'],['thigh','thigh'],['shin','shin'],['foot','foot'],['glute','glute'],['mand','mand'+s]])if(P[k+s])P[k+s].geometry=G[g];}
/* hit-zone helpers for M2 (bible 5.9): world positions of the weak points and the coarse limb capsules (cosmetic swing-miss sparks) */
function mg3Zone(r,n){const Z={handeyeL:['handEyeL',[0,0,0.2]],handeyeR:['handEyeR',[0,0,0.2]],palmL:['wristL',[0,-1.2,0]],palmR:['wristR',[0,-1.2,0]],
  clawsL:['wristL',[0,-4.4,0]],clawsR:['wristR',[0,-4.4,0]],tongue:['tongueTip',[0,0,0]],eyes:['head',[0,1.0,2.6]],head:['head',[0,0.5,2]],snout:['head',[0,0.2,5.6]],
  chin:['head',[0,-1.4,4.8]],mouth:['head',[0,-0.6,3.6]],sun:['head',[0,-0.55,1.35]],throat:['head',[0,-0.5,0.7]],gut:['belly',[0,-0.2,1.6]],belly:['belly',[0,0,1.6]],
  chest:['spine1',[0,1,2.4]],cube:['cube',[0,0,0]],hoofL:['hoofL',[0,0,0]],hoofR:['hoofR',[0,0,0]],tailTip:['tailTip',[0,0,0]],spike:['spike',[0,0,0]]}[n];
  if(!Z)return null;const p=mg3Wp(r.joints[Z[0]],Z[1],null);return {x:p[0],y:p[1],z:p[2]};}
function mg3Caps(r,guard){const W=(j,v)=>mg3Wp(r.joints[j],v,null),out=[];
  for(const s of ['L','R']){out.push({a:W('shoulder'+s,[0,0,0]),b:W('elbow'+s,[0,0,0]),r:1.3},{a:W('elbow'+s,[0,0,0]),b:W('wrist'+s,[0,0,0]),r:1.0},{a:W('wrist'+s,[0,0,0]),b:W('wrist'+s,[0,-3.2,0]),r:1.2},
    {a:W('hip'+s,[0,0,0]),b:W('knee'+s,[0,0,0]),r:1.5},{a:W('knee'+s,[0,0,0]),b:W('hock'+s,[0,0,0]),r:0.9});}
  out.push(guard?{a:W('head',[0,0.9,-0.6]),b:W('head',[0,1.0,2.2]),r:1.4}:{a:W('head',[0,0.2,-0.6]),b:W('head',[0,0,5.2]),r:1.6},{a:W('pelvis',[0,0,0]),b:W('spine1',[0,3,0]),r:3.4},{a:W('tail0',[0,0,0]),b:W('tailTip',[0,0,0]),r:0.8});return out;}
