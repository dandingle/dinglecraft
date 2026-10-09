/* ---- PART 57: m3_b_parts.js ---- */
/* ===================================================================== */
/* PART 57 m3 · file b: the sculpted parts (bible 5.2, 5.4, 5.5, 5.10,   */
/* 5.11). Every part is a loft of authored non-circular sections in its  */
/* own joint frame (feet at 0, facing +z, +x = his left), with buried    */
/* roots, swollen caps and object-space displacement. Geometry is built  */
/* once per detail level and shared by every rig (boss, Effigy).         */
/* Section helpers: x lateral, y the section's up (see mg3Loft).         */
/* ===================================================================== */
/* a superellipse section with separate top/bottom half-heights and lateral half-widths (left/right), exponent e (2 = ellipse) */
function mg3Se(a,wl,wr,ht,hb,e){const c=Math.cos(a),s=Math.sin(a),p=2/(e||2),cx=Math.sign(c)*Math.pow(Math.abs(c),p),sy=Math.sign(s)*Math.pow(Math.abs(s),p);
  return [cx*(c>=0?wr:wl),sy*(s>=0?ht:hb)];}
function mg3Bump(a,a0,w){let d=Math.abs(((a-a0)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI);return Math.exp(-(d*d)/(w*w));}
/* cap/root shaping along t: 0 at a buried root keeps full radius; ends swell to 1.15 then close (bible 5.10.2) */
function mg3Ball(t,t1){if(t<=t1)return 1;const u=Math.min(1,(t-t1)/(1-t1));return Math.sqrt(Math.max(0,1-u*u))*1.03;}
function mg3Cap(t,t0,t1){if(t>t1){const u=(t-t1)/(1-t1);return (1+0.08*Math.sin(Math.min(1,u*1.6)*Math.PI*0.5))*Math.sqrt(Math.max(0,1-Math.pow(Math.max(0,u*1.25-0.25),2)));}
  if(t<t0){const u=t/t0;return 0.82+0.18*u;}return 1;}
/* macro variation by vertex colour (bible 5.6): sooty back, paler throat/belly, bone keel; n = normal in the part frame */
function mg3Tone(ny,nz,pale){const back=mg3Sm(0.1,-0.8,nz),under=mg3Sm(0.0,-0.9,ny);const k=1-back*0.28+under*0.12;
  const p=pale||0;return [k*(1+p*1.25),k*(1+p*1.15),k*(1+p*0.95)];}
var MG3P={                                                                                    /* rest skeleton (metres) */
  pelvis:[0,7.2,0],spine0:[0,1.7,0.1],spine1:[0,2.5,-0.3],shoulder:[4.35,2.35,0.05],hip:[1.95,-0.4,-0.1],
  neck0:[0,2.55,0.95],neckS:0.8,head:[0,0.2,0.75],hingeL:[1.42,-0.78,0.45],upper:7,fore:7,palm:1.4,thigh:4.0,shin:3.7,foot:1.0,
  tail0:[0,-0.45,-2.0],tailN:16,tailL:11,tongue0:[0,-1.0,0.7],tongueN:5,tongueL:4.4,finger:[1.05,0.9,0.72],claw:1.2,
  eyeBig:[1.18,0.55,2.75],eyeBrow:[[0.62,1.22,3.05],[1.0,1.42,2.6]]};
/* a muscle bump along t (centre c, half-width w) */
function mg3Mu(t,c,w){const d=(t-c)/w;return d>-1&&d<1?Math.cos(d*Math.PI*0.5):0;}
function mg3PPelvis(q){return mg3Loft({pts:[[0,-1.2,0],[0,0.2,0.05],[0,1.4,0.1],[0,2.6,0.05]],n:Math.round(14*q),m:Math.round(36*q),up:[0,0,1],disp:0.18,dseed:11,
  prof:(t,a)=>{const w=mg3Lp(2.25,2.75,Math.sin(t*Math.PI*0.8)),d=mg3Lp(1.65,1.95,t),glute=mg3Bump(a,-Math.PI/2,0.9)*0.55*mg3Sm(0.65,0.15,t),abs=mg3Bump(a,Math.PI/2,0.7)*0.18*mg3Sm(0.3,0.9,t);
    const r=mg3Se(a,w,w,d+abs,d+glute,2.3);const c=t<0.12?mg3Lp(0.75,1,t/0.12):1;return [r[0]*c,r[1]*c];},
  col:(t,a,x,y,z,nx,ny,nz)=>mg3Tone(ny,nz,0)});}
function mg3PBelly(q){return mg3Loft({pts:[[0,-1.3,0],[0,0.2,0.1],[0,1.8,0.05],[0,3.4,-0.05]],n:Math.round(16*q),m:Math.round(40*q),up:[0,0,1],disp:0.16,dseed:13,
  prof:(t,a)=>{const w=mg3Lp(2.35,3.05,mg3Sm(0.15,1,t)),front=mg3Lp(1.95,2.15,Math.sin(t*Math.PI)),back=1.85+0.25*t;
    const abs=Math.max(0,Math.sin(t*Math.PI*3.5))*0.12*mg3Bump(a,Math.PI/2,0.45),obl=(mg3Bump(a,Math.PI*0.15,0.5)+mg3Bump(a,Math.PI*0.85,0.5))*0.16*mg3Sm(0.5,0.1,t);
    const ribs=0.07*Math.max(0,Math.sin(t*Math.PI*7))*mg3Sm(0.4,0.9,t)*(mg3Bump(a,0.1,0.6)+mg3Bump(a,Math.PI-0.1,0.6));
    return mg3Se(a,w+ribs+obl,w+ribs+obl,front+abs,back,2.2);},
  col:(t,a,x,y,z,nx,ny,nz)=>mg3Tone(ny,nz,0.12*mg3Sm(0,0.8,nz))});}
function mg3PChest(q){return mg3Loft({pts:[[0,-1.9,0.05],[0,0.2,0.2],[0,1.9,0.0],[0,3.2,-0.35],[0,4.1,-0.65]],n:Math.round(20*q),m:Math.round(44*q),up:[0,0,1],disp:0.2,dseed:17,
  prof:(t,a)=>{const w=t<0.55?mg3Lp(3.25,3.9,mg3Sm(0,0.55,t)):mg3Lp(3.9,4.35,mg3Sm(0.55,0.8,t))*mg3Cap(t,0.05,0.86);
    const front=mg3Lp(2.3,2.55,Math.sin(Math.min(1,t*1.4)*Math.PI*0.7))*(t>0.75?mg3Lp(1,0.5,(t-0.75)/0.25):1),back=mg3Lp(2.35,2.85,mg3Sm(0.3,0.8,t))*(t>0.8?mg3Lp(1,0.6,(t-0.8)/0.2):1);
    const keel=mg3Bump(a,Math.PI/2,0.3)*0.25*mg3Sm(0.05,0.4,t)*mg3Sm(0.85,0.55,t),pec=(mg3Bump(a,Math.PI*0.3,0.45)+mg3Bump(a,Math.PI*0.7,0.45))*0.42*mg3Sm(0.25,0.55,t)*mg3Sm(0.88,0.62,t);
    const lat=(mg3Bump(a,-Math.PI*0.12,0.5)+mg3Bump(a,-Math.PI*0.88,0.5))*0.45*mg3Sm(0.15,0.6,t),hump=mg3Bump(a,-Math.PI/2,0.9)*0.5*mg3Sm(0.45,0.8,t);
    const trap=(mg3Bump(a,Math.PI*0.08,0.35)+mg3Bump(a,Math.PI*0.92,0.35))*0.35*mg3Sm(0.7,0.9,t);
    const r=mg3Se(a,w+lat,w+lat,front+keel+pec,back+hump+trap,2.4);const c=t>0.97?0.6:1;return [r[0]*c,r[1]*c];},
  col:(t,a,x,y,z,nx,ny,nz)=>mg3Tone(ny,nz,0.12*mg3Sm(0.3,0.9,nz)*mg3Sm(0.7,0.2,t))});}
function mg3PDeltoid(q){return mg3Ell(1.55,1.45,1.8,Math.round(14*q),Math.round(22*q),(t,a)=>1+0.1*Math.sin(a*3+t*5)*Math.sin(t*Math.PI)-0.12*mg3Bump(a,Math.PI,0.6));}
function mg3PUpper(q){return mg3Loft({pts:[[0,1.0,0],[0,-1.5,0.1],[0,-4.4,0.1],[0,-7.0,0],[0,-8.2,0]],n:Math.round(20*q),m:Math.round(28*q),up:[0,0,1],disp:0.15,dseed:23,dmask:t=>mg3Sm(0,0.15,t)*mg3Sm(1,0.85,t),
  prof:(t,a)=>{const bi=mg3Bump(a,Math.PI/2,0.8)*0.5*mg3Mu(t,0.45,0.42),tri=mg3Bump(a,-Math.PI/2,0.9)*0.55*mg3Mu(t,0.32,0.4),br=mg3Bump(a,0,0.6)*0.2*mg3Mu(t,0.75,0.25);
    const tp=8/9.2,tt=Math.min(1,t/tp),k=mg3Ball(t,tp),w=mg3Lp(1.55,1.18,tt)*k,d=mg3Lp(1.45,1.15,tt)*k;return mg3Se(a,w,w+br*k*(1-mg3Sm(0.8,1,tt)),d+bi*k*(1-mg3Sm(0.8,1,tt)),d+tri*k*(1-mg3Sm(0.75,1,tt)),2.15);},
  col:(t,a,x,y,z,nx,ny,nz)=>mg3Tone(ny,nz,0)});}
function mg3PFore(q){return mg3Loft({pts:[[0,0.3,0],[0,-1.8,0.05],[0,-4.6,0.02],[0,-7.0,0],[0,-7.85,0]],n:Math.round(20*q),m:Math.round(26*q),up:[0,0,1],disp:0.14,dseed:29,dmask:t=>mg3Sm(0,0.18,t)*mg3Sm(1,0.85,t),
  prof:(t,a)=>{const tp=7.3/8.15,tt=Math.min(1,t/tp),k=mg3Ball(t,tp),gr=mg3Sm(0.0,0.3,tt),w=(tt<0.3?mg3Lp(0.85,1.45,gr):mg3Lp(1.45,0.92,mg3Sm(0.3,1,tt)))*k,d=(tt<0.3?mg3Lp(0.75,1.12,gr):mg3Lp(1.12,0.72,mg3Sm(0.3,1,tt)))*k;
    const ulna=mg3Bump(a,Math.PI/2,0.28)*0.25*mg3Sm(0.1,0.3,tt)*mg3Sm(0.95,0.7,tt),flex=mg3Bump(a,-Math.PI*0.6,0.7)*0.45*mg3Mu(tt,0.3,0.28),ext=mg3Bump(a,Math.PI*0.25,0.6)*0.3*mg3Mu(tt,0.28,0.24);
    return mg3Se(a,w+flex*0.4,w+ext*0.4,d+ulna+ext,d+flex,2.3);},
  col:(t,a,x,y,z,nx,ny,nz)=>{const c=mg3Tone(ny,nz,0);const u=mg3Bump(a,Math.PI/2,0.22)*0.35;return [c[0]+u,c[1]+u*0.9,c[2]+u*0.8];}});}
/* the palm: wide and thick, back of the hand toward +z (the hand-eye side), bone-grey knuckles at the far end */
function mg3PPalm(q){return mg3Loft({pts:[[0,0.05,0],[0,-0.5,0.05],[0,-1.05,0.05],[0,-1.6,0]],n:Math.round(12*q),m:Math.round(28*q),up:[0,0,1],disp:0.06,dseed:31,
  prof:(t,a)=>{const k=mg3Cap(t,0.0,0.8),gr=mg3Sm(0,0.55,t),w=mg3Lp(0.5,1.55,gr)*k,back=mg3Lp(0.42,0.9,gr)*k,palm=mg3Lp(0.36,0.48,gr)*k;
    const kn=mg3Sm(0.7,0.9,t)*0.18*Math.pow(Math.abs(Math.cos(a*2+0.4)),6)*mg3Bump(a,Math.PI/2,1.0);return mg3Se(a,w,w,back+kn,palm,2.6);},
  col:(t,a,x,y,z,nx,ny,nz)=>{const c=mg3Tone(0,nz>0?0.5:-0.2,0);const kn=mg3Sm(0.65,0.95,t)*0.9*mg3Sm(-0.2,0.6,nz);return [c[0]+kn,c[1]+kn*0.95,c[2]+kn*0.88];}});}
function mg3PThigh(q){return mg3Loft({pts:[[0,1.0,0],[0,-1.2,0.15],[0,-2.8,0.1],[0,-4.0,0],[0,-5.05,0]],n:Math.round(18*q),m:Math.round(30*q),up:[0,0,1],disp:0.17,dseed:37,dmask:t=>mg3Sm(0,0.15,t)*mg3Sm(1,0.85,t),
  prof:(t,a)=>{const tp=5/6.05,tt=Math.min(1,t/tp),k=mg3Ball(t,tp),w=mg3Lp(2.0,1.02,mg3Sm(0,1,tt))*k,front=mg3Lp(2.3,1.05,tt)*k,back=mg3Lp(2.0,1.0,tt)*k;
    const quad=mg3Bump(a,Math.PI/2,0.7)*0.45*mg3Mu(tt,0.4,0.45),ham=mg3Bump(a,-Math.PI/2,0.8)*0.35*mg3Mu(tt,0.35,0.4),vl=mg3Bump(a,Math.PI*0.2,0.5)*0.3*mg3Mu(tt,0.68,0.22);
    return mg3Se(a,w,w+vl,front+quad,back+ham,2.3);},
  col:(t,a,x,y,z,nx,ny,nz)=>mg3Tone(ny,nz,0)});}
function mg3PShin(q){return mg3Loft({pts:[[0,0.3,0],[0,-1.2,-0.05],[0,-2.7,0],[0,-3.7,0],[0,-4.35,0]],n:Math.round(16*q),m:Math.round(24*q),up:[0,0,1],disp:0.1,dseed:41,dmask:t=>mg3Sm(0,0.15,t)*mg3Sm(1,0.85,t),
  prof:(t,a)=>{const tp=4/4.65,tt=Math.min(1,t/tp),k=mg3Ball(t,tp),gr=mg3Sm(0.0,0.25,tt),w=(tt<0.25?mg3Lp(0.7,1.05,gr):mg3Lp(1.05,0.64,mg3Sm(0.25,1,tt)))*k,d=(tt<0.25?mg3Lp(0.72,1.2,gr):mg3Lp(1.2,0.64,mg3Sm(0.25,1,tt)))*k;
    const calf=mg3Bump(a,-Math.PI/2,0.8)*0.55*mg3Mu(tt,0.32,0.32),tib=mg3Bump(a,Math.PI/2,0.28)*0.14*(1-mg3Sm(0.85,1,tt));return mg3Se(a,w,w,d+tib,d+calf,2.2);},
  col:(t,a,x,y,z,nx,ny,nz)=>mg3Tone(ny,nz,0)});}
/* the foot: a short pastern into a closed cloven hoof (two keratin toes split at the front by a notch in the section) */
function mg3PFoot(q){return mg3Loft({pts:[[0,0.2,0],[0,-0.25,0.12],[0,-0.65,0.4],[0,-0.98,0.62]],n:Math.round(12*q),m:Math.round(24*q),up:[0,0,1],disp:0.04,dseed:43,
  prof:(t,a)=>{const w=mg3Lp(0.45,0.95,mg3Sm(0.2,1,t)),d=mg3Lp(0.45,1.05,mg3Sm(0.2,1,t)),cleft=mg3Bump(a,Math.PI/2,0.18)*0.48*mg3Sm(0.5,0.95,t);
    const k=t>0.88?Math.sqrt(Math.max(0,1-Math.pow((t-0.88)/0.12,2))):1;return mg3Se(a,w*k,w*k,(d-cleft)*k,d*0.7*k,2.6);},
  col:(t)=>{const h=mg3Sm(0.42,0.6,t);return [mg3Lp(1,0.42,h),mg3Lp(1,0.36,h),mg3Lp(1,0.3,h)];}});}
/* THE SKULL (bible 5.2) */
function mg3PSkull(q){const E=MG3P.eyeBig,EB=MG3P.eyeBrow;
  const g=mg3Loft({pts:[[0,0.25,-1.5],[0,0.55,0.4],[0,0.5,2.4],[0,0.15,4.4],[0,-0.1,6.0]],n:Math.round(36*q),m:Math.round(40*q),up:[0,1,0],disp:0.06,dseed:47,
  prof:(t,a)=>{const z=mg3Lp(-1.5,6.0,t);
    const w=z<1.4?mg3Lp(1.35,1.75,mg3Sm(-1.5,0.4,z)):(z<2.9?mg3Lp(1.75,1.35,mg3Sm(1.4,2.9,z)):mg3Lp(1.35,0.42,mg3Sm(2.9,6.0,z)));
    let top=z<1.0?mg3Lp(0.95,1.65,mg3Sm(-1.5,0.6,z)):mg3Lp(1.65,0.42,mg3Sm(1.0,6.0,z));
    const brow=mg3Mu(z,2.45,0.55);top+=brow*0.32;
    const bot=z<1.0?mg3Lp(0.9,1.0,mg3Sm(-1.5,1,z)):mg3Lp(1.0,0.42,mg3Sm(1.0,6.0,z));
    const keel=mg3Bump(a,Math.PI/2,0.2)*(0.24+0.08*Math.sin(t*Math.PI*11))*mg3Sm(0.0,1.2,z)*mg3Sm(6.1,5.3,z);
    const shelf=(mg3Bump(a,Math.PI*0.18,0.32)+mg3Bump(a,Math.PI*0.82,0.32))*brow*0.65;
    const cheek=(mg3Bump(a,-Math.PI*0.06,0.42)+mg3Bump(a,-Math.PI*0.94,0.42))*0.48*mg3Mu(z,1.3,1.1);
    const hollow=-(mg3Bump(a,-Math.PI*0.2,0.3)+mg3Bump(a,-Math.PI*0.8,0.3))*0.22*mg3Mu(z,3.4,0.8);
    const ridge=(mg3Bump(a,Math.PI*0.36,0.12)+mg3Bump(a,Math.PI*0.64,0.12))*0.18*mg3Mu(z,0.0,1.6);
    return mg3Se(a,w+cheek+hollow+shelf*0.5,w+cheek+hollow+shelf*0.5,top+keel+shelf+ridge,bot,2.5);},
  col:(t,a,x,y,z,nx,ny,nz)=>{const back=mg3Sm(1.0,-1.0,z),k=mg3Bump(a,Math.PI/2,0.45)*0.18;return [1+k-back*0.55,1+k-back*0.6,1+k-back*0.62];}});
  /* carve the six eye sockets and the nostril slits (negative displacement on the lofted keel, bible 5.10.3) */
  const P=g.pos,Nn=g.nrm;const holes=[[E[0],E[1],E[2],0.72,0.62],[-E[0],E[1],E[2],0.72,0.62]];
  for(const b of EB){holes.push([b[0],b[1],b[2],0.34,0.3],[-b[0],b[1],b[2],0.34,0.3]);}
  holes.push([0.3,0.42,5.55,0.2,0.28],[-0.3,0.42,5.55,0.2,0.28]);
  for(let k=0;k<P.length;k+=3){let d=0;for(const h of holes){const dd=Math.hypot(P[k]-h[0],P[k+1]-h[1],(P[k+2]-h[2])*0.8);if(dd<h[3])d=Math.max(d,h[4]*Math.cos(dd/h[3]*Math.PI*0.5));}
    if(d){P[k]-=Nn[k]*d;P[k+1]-=Nn[k+1]*d;P[k+2]-=Nn[k+2]*d;const f=1-mg3Cl(d*2.2,0,0.85);g.col[k]*=f*0.4;g.col[k+1]*=f*0.25;g.col[k+2]*=f*0.2;}}
  for(let i=0;i<=g.n;i++){const s0=i*(g.m+1)*3,s1=s0+g.m*3;P[s1]=P[s0];P[s1+1]=P[s0+1];P[s1+2]=P[s0+2];}
  mg3GridN(P,Nn,g.n,g.m);return g;}
/* the palate (flesh): the roof of the mouth set with 7 transverse ridges, seen from below (normals down) */
function mg3PPalate(q){const nz=Math.round(26*q),nx=Math.round(14*q),pos=[],nrm=[],uv=[],col=[],idx=[];
  for(let i=0;i<=nz;i++){const t=i/nz,z=mg3Lp(0.45,5.4,t),hw=mg3Lp(1.55,0.45,mg3Sm(0.1,1,t));
    for(let j=0;j<=nx;j++){const u=j/nx*2-1,x=u*hw,ridge=Math.pow(Math.max(0,Math.sin(t*Math.PI*7.5)),3)*0.09*(1-u*u),dome=(1-u*u)*0.32*mg3Sm(1,0.2,t);
      pos.push(x,-0.62+dome+ridge-(1-mg3Sm(0,0.08,t))*0.25,z);nrm.push(0,-1,0);uv.push(u,t*3);const c=0.75+ridge*2;col.push(c,c*0.8,c*0.8);}}
  for(let i=0;i<nz;i++)for(let j=0;j<nx;j++){const a=i*(nx+1)+j,b=a+1,c=a+nx+1,d=c+1;idx.push(a,b,c,b,d,c);}
  const G={pos:new Float32Array(pos),nrm:new Float32Array(nrm),uv:new Float32Array(uv),col:new Float32Array(col),idx};
  mg3GridNFlat(G,nz,nx,true);return G;}
function mg3GridNFlat(G,n,m,down){const P=G.pos,N=G.nrm,a=[0,0,0],b=[0,0,0],c=[0,0,0];
  for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){const k=(i*(m+1)+j)*3,ip=Math.min(n,i+1),im=Math.max(0,i-1),jp=Math.min(m,j+1),jm=Math.max(0,j-1);
    const k1=(ip*(m+1)+j)*3,k2=(im*(m+1)+j)*3,k3=(i*(m+1)+jp)*3,k4=(i*(m+1)+jm)*3;
    a[0]=P[k1]-P[k2];a[1]=P[k1+1]-P[k2+1];a[2]=P[k1+2]-P[k2+2];b[0]=P[k3]-P[k4];b[1]=P[k3+1]-P[k4+1];b[2]=P[k3+2]-P[k4+2];
    mg3X(a,b,c);if(down&&c[1]>0){c[0]=-c[0];c[1]=-c[1];c[2]=-c[2];}mg3Nz(c);N[k]=c[0];N[k+1]=c[1];N[k+2]=c[2];}}
/* the throat: a tunnel from the back of the mouth (z 0.6) narrowing 2 m -> 1 m back and down into the neck; seen from inside */
function mg3PThroat(q){return mg3Loft({pts:[[0,-0.55,0.9],[0,-0.62,0.1],[0,-0.95,-0.9],[0,-1.4,-1.9]],n:Math.round(10*q),m:Math.round(20*q),up:[0,1,0],flip:true,
  prof:(t,a)=>{const r=mg3Lp(1.05,0.5,mg3Sm(0,1,t));const rib=1+0.06*Math.sin(t*Math.PI*6);return [Math.cos(a)*r*rib*1.15,Math.sin(a)*r*rib*0.85];},
  col:(t)=>{const k=mg3Lp(1,0.35,t);return [k,k*0.6,k*0.55];}});}
/* a mandible (bony bar from the hinge to the chin), in its own frame (hinge at 0); side s = +1 left, -1 right */
function mg3PMand(q,s){return mg3Loft({pts:[[0,0.05,-0.4],[-s*0.12,-0.12,1.4],[-s*0.5,-0.4,3.6],[-s*1.0,-0.55,5.3]],n:Math.round(22*q),m:Math.round(18*q),up:[0,1,0],disp:0.04,dseed:53+s,
  prof:(t,a)=>{const h=mg3Lp(0.78,0.42,mg3Sm(0,1,t))*(t<0.12?mg3Lp(0.7,1,t/0.12):1),w=mg3Lp(0.5,0.34,t)*(t>0.9?Math.sqrt(Math.max(0,1-Math.pow((t-0.9)/0.1,2)))*0.9+0.1:1);
    const cor=mg3Bump(a,Math.PI/2,0.5)*0.6*mg3Sm(0.0,0.08,t)*mg3Sm(0.3,0.12,t);return mg3Se(a,w,w,h*0.62+cor,h,2.6);},
  col:(t,a,x,y,z,nx,ny,nz)=>{const b=mg3Sm(0.0,0.4,t);return [mg3Lp(0.6,1,b),mg3Lp(0.55,1,b),mg3Lp(0.52,1,b)];}});}
/* the horn (bible 5.2) */
function mg3PHorn(q,s){const base=[s*1.05,1.1,0.5],pts=[],R0=2.0,PH=1.72*Math.PI;
  for(let i=0;i<=16;i++){const f=i/16,ph=f*PH,R=R0*(1-0.38*f),th=Math.PI/2+ph;
    pts.push([base[0]+s*(0.15+2.55*mg3Sm(0,1,f)+0.35*Math.sin(f*Math.PI)),base[1]-R0*0.85+Math.sin(th)*R+0.15*f,base[2]-0.5+Math.cos(th)*R*(-1)+0.35*f]);}
  const g=mg3Loft({pts,n:Math.round(80*q),m:Math.round(16*q),up:[s,0,0],uvs:0.8,
    prof:(t,a)=>{const r=mg3Lp(1.05,0.16,Math.pow(t,0.8))*(1+0.075*Math.pow(Math.abs(Math.sin(t*Math.PI*40)),3))*(t>0.97?mg3Lp(1,0.3,(t-0.97)/0.03):1);
      const tri=1+0.2*Math.cos(a*3);return [Math.cos(a)*r*tri,Math.sin(a)*r*tri*0.88];},
    col:(t)=>{const k=mg3Lp(0.85,1.3,t);return [k,k*0.94,k*0.86];}});
  const tip=pts[pts.length-1],pre=pts[pts.length-2];return {g,tip,dir:mg3Nz([tip[0]-pre[0],tip[1]-pre[1],tip[2]-pre[2]]),pts};}
/* tooth rows */
function mg3TeethUpper(q){const F=mg3Fang(q>=1?6:4,q>=1?5:3),out=[],R=mg3Rng(901);
  const rows=[[16,0,1.0],[12,0.32,0.75],[8,0.62,0.55]];
  for(const [cnt,inset,sc] of rows){if(q<1&&inset>0.5)continue;
    for(let i=0;i<cnt;i++){const f=(i+0.5)/cnt,side=f<0.5?-1:1,ff=Math.abs(f-0.5)*2;          /* ff 0 front centre -> 1 back */
      const z=mg3Lp(5.5,0.95,ff)-inset*0.9,hw=mg3Lp(0.42,1.5,mg3Sm(0,0.85,ff))-inset*0.55,x=side*hw;
      const size=sc*mg3Lp(0.85,0.55,ff)*(0.8+R()*0.4)*(ff<0.25&&inset===0?1.45:1),chip=R()<0.15?0.7:1;
      const rake=inset>0?-0.6:-0.1,lean=side*0.08*(R()-0.3);
      const M=mg3Mm(mg3Me(Math.PI+rake,0,lean,'XYZ'),[size,0,0,0,size*chip*1.2,0,0,0,size]);
      out.push({g:F,m:M,p:[x,-0.6+inset*0.05,z]});}}
  return mg3Join(out);}
function mg3TeethLower(q,s){const F=mg3Fang(q>=1?6:4,q>=1?5:3),out=[],R=mg3Rng(911+s);
  const rows=[[8,0,1.0],[6,0.3,0.75],[4,0.58,0.55]];
  for(const [cnt,inset,sc] of rows){if(q<1&&inset>0.5)continue;
    for(let i=0;i<cnt;i++){const f=(i+0.5)/cnt,z=mg3Lp(5.1,0.6,f)-inset*0.8,x=-s*mg3Lp(1.0,0.05,mg3Sm(0,1,1-f))*(z/5.1)+s*inset*0.3;
      const size=sc*mg3Lp(0.9,0.6,f)*(0.8+R()*0.4)*(f<0.2&&inset===0?1.35:1),chip=R()<0.15?0.7:1,rake=inset>0?0.6:0.12;
      const M=mg3Mm(mg3Me(rake,0,s*0.1*(R()-0.4),'XYZ'),[size,0,0,0,size*chip*1.15,0,0,0,size]);
      out.push({g:F,m:M,p:[x*0.85-s*0.1,0.32,z]});}}
  return mg3Join(out);}
/* an eye: sphere with a planar front projection of the iris canvas */
function mg3PEye(r,q){const g=mg3Ell(r,r,r*0.9,Math.round(12*q)+4,Math.round(16*q)+4);for(let k=0;k<g.pos.length/3;k++){g.uv[k*2]=0.5+g.pos[k*3]/(2*r)*0.92;g.uv[k*2+1]=0.5+g.pos[k*3+1]/(2*r)*0.92;}return g;}
/* the belly window crust: the front of an ellipsoid split into 8 plates with glowing gaps between them (bible 5.5) */
function mg3PCrust(q){const g=mg3Ell(2.25,1.75,1.35,Math.round(22*q),Math.round(30*q));const P=g.pos,cs=[];const R=mg3Rng(77);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+R()*0.3,r=i<1?0:0.62;cs.push([Math.cos(a)*r*2.25,Math.sin(a)*r*1.75]);}
  cs[0]=[0,0];const keep=[],plate=new Int8Array(P.length/3);
  for(let k=0;k<P.length/3;k++){const x=P[k*3],y=P[k*3+1];let d1=9,d2=9,id=0;for(let c=0;c<8;c++){const d=Math.hypot(x-cs[c][0],y-cs[c][1]);if(d<d1){d2=d1;d1=d;id=c;}else if(d<d2)d2=d;}
    plate[k]=(d2-d1<0.16||P[k*3+2]<-0.2)?-1:id;}
  const idx=[];for(let t=0;t<g.idx.length;t+=3){const a=g.idx[t],b=g.idx[t+1],c=g.idx[t+2];if(plate[a]>=0&&plate[a]===plate[b]&&plate[b]===plate[c])idx.push(a,b,c);}
  g.idx=idx;g.plate=plate;g.cs=cs;return g;}
/* THE STRATA (bible 5.4) */
function mg3StrataSpec(){if(MG3.geo.strataSpec)return MG3.geo.strataSpec;const R=mg3Rng(4242),out=[],leaves=[],B_=B;let dia=0;
  const H=(x,z)=>{const peak=Math.exp(-((x-2.2)*(x-2.2))/2.4-((z+1.0)*(z+1.0))/2.6)*3.9,peak2=Math.exp(-((x+2.5)*(x+2.5))/2.0-((z+1.5)*(z+1.5))/2.4)*2.9,
    ridge=Math.exp(-(x*x)/6-((z+2.0)*(z+2.0))/1.5)*2.3;return 2.8+Math.max(peak*1.3,peak2*1.2,ridge*1.15)+mg3N3(x*0.9+3,z*0.9,0,4243)*1.5;};
  const top={};for(let x=-5;x<=5;x++)for(let z=-4;z<=1;z++)top[x+','+z]=Math.round(H(x,z)-(Math.abs(x)===5?1:0)-(z===1?1.2:0));
  for(let it=0;it<2;it++)for(const k in top){const [x,z]=k.split(',').map(Number);let mx=0;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]])mx=Math.max(mx,top[(x+a)+','+(z+b)]||0);top[k]=Math.min(top[k],mx+1);}   /* no spires */
  for(let x=-5;x<=5;x++)for(let z=-4;z<=1;z++){if(Math.abs(x)>=4&&z>=0)continue;if(z>=0&&Math.abs(x)<=2)continue;if(Math.abs(x)===5&&(z<-3))continue;   /* keep the neck clear */
    const tp=top[x+','+z],base=Math.round(1.9+Math.abs(x)*0.1-(z<-2?0.4:0)),nb=Math.max(top[(x+1)+','+z]||0,top[(x-1)+','+z]||0,top[x+','+(z+1)]||0,top[x+','+(z-1)]||0);
    for(let y=base;y<=tp;y++){let id=B_.STONE;const exp=y>nb;                                                   /* cliffs show stone, ledges grass */
      if(y===tp)id=(R()<0.82?B_.GRASS:B_.DIRT);else if(y>=tp-1&&!exp)id=B_.DIRT;else{const r=R();id=r<0.12?B_.COAL_ORE:(r<0.2?B_.IRON_ORE:(r<0.34?B_.COBBLE:(r<0.4?B_.DIRT:B_.STONE)));
        if(!dia&&x===1&&z===-2&&y===tp-2){id=B_.DIA_ORE;dia=1;}}
      out.push({id,x:x,y:y,z:z});}}
  /* the small oak on the summit (log + two leaf blobs) */
  let sx=2,sz=-1;for(let x=1;x<=4;x++)for(let z=-3;z<=0;z++)if((top[x+','+z]||0)>(top[sx+','+sz]||0)){sx=x;sz=z;}
  const st=top[sx+','+sz]+1;out.push({id:B_.LOG_O,x:sx,y:st,z:sz,tree:1});out.push({id:B_.LOG_O,x:sx,y:st+1,z:sz,tree:1});
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){leaves.push({id:B_.LEAF_O,x:sx+dx,y:st+2,z:sz+dz,tree:1});leaves.push({id:B_.LEAF_O,x:sx+dx,y:st+3,z:sz+dz,tree:1});}
  for(const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]])leaves.push({id:B_.LEAF_O,x:sx+dx,y:st+2,z:sz+dz,tree:1});
  for(const [dx,dz] of [[1,1],[-1,-1],[1,-1]])leaves.push({id:B_.LEAF_O,x:sx+dx,y:st+1,z:sz+dz,tree:1});leaves.push({id:B_.LEAF_O,x:sx,y:st+4,z:sz,tree:1});
  /* the cottage roof between the shoulder blades (planks + a brick ridge; its lit window is a separate quad) */
  for(let dx=-1;dx<=1;dx++){out.push({id:B_.PLANK_O,x:dx-0.5,y:3.5,z:-3.55,roof:1});out.push({id:B_.PLANK_O,x:dx-0.5,y:4.5,z:-3.55,roof:1});}
  out.push({id:B_.BRICK,x:-1,y:5.5,z:-3.55,roof:1});out.push({id:B_.BRICK,x:0,y:5.5,z:-3.55,roof:1});
  /* the slot machine (the real casino block), half-swallowed into the right trapezius, cracked */
  const cas=(typeof B_.CASINO==='number'?B_.CASINO:67);out.push({id:cas,x:-3.45,y:2.6,z:0.55,s:1.5,ry:0.5,slot:1});
  MG3.geo.strataSpec={cubes:out,leaves,oak:[sx,st,sz],win:[-0.5,4.5,-4.07],slot:[-3.45,2.6,0.55]};return MG3.geo.strataSpec;}
