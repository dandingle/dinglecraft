/* ---- PART 57: m3_a_core.js ---- */
/* ===================================================================== */
/* PART 57 m3 · the OG model + OG VFX (M3). File a: core.                */
/* Own maths (the node stubs have no Matrix4/Quaternion/curves and no    */
/* computeVertexNormals), seeded noise, the loft (bible 5.10: authored   */
/* non-circular sections swept along our own Catmull-Rom spine, normals  */
/* from the grid, object-space displacement), the chain sweep for the    */
/* parts that bend (neck, tail, tongue, fingers, drool: one seamless     */
/* skin over a joint chain, rebuilt in place every frame, no allocation),*/
/* and the seeded OG skin textures built in slices (bible 5.6).          */
/* Only stub-safe THREE classes. Nothing runs at load.                   */
/* ===================================================================== */
var MG3={v:1,built:0,tex:null,geo:{},rigs:[],jobs:[],frame:0,R:null,cfg:{TEX:1024,TEX_S:512,ROWS:32}};
/* ---- seeded random + hashed value noise (deterministic: never Math.random) ---- */
function mg3Rng(seed){let a=seed>>>0;return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mg3H3(x,y,z,s){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(z|0,1274126177)+Math.imul(s|0,1442695041))|0;
  h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function mg3N3(x,y,z,s){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi;
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf),H=mg3H3;
  const a=H(xi,yi,zi,s),b=H(xi+1,yi,zi,s),c=H(xi,yi+1,zi,s),d=H(xi+1,yi+1,zi,s),e=H(xi,yi,zi+1,s),f=H(xi+1,yi,zi+1,s),g=H(xi,yi+1,zi+1,s),h=H(xi+1,yi+1,zi+1,s);
  const x1=a+(b-a)*u,x2=c+(d-c)*u,x3=e+(f-e)*u,x4=g+(h-g)*u,y1=x1+(x2-x1)*v,y2=x3+(x4-x3)*v;return (y1+(y2-y1)*w)*2-1;}
function mg3Fbm(x,y,z,s,o){let a=0,k=1,n=0;for(let i=0;i<(o||3);i++){a+=mg3N3(x*k,y*k,z*k,s+i*17)/k;n+=1/k;k*=2.03;}return a/n;}
function mg3Sm(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
function mg3Cl(x,a,b){return x<a?a:(x>b?b:x);}
function mg3Lp(a,b,t){return a+(b-a)*t;}
/* ---- 3x3 rotations (row-major m[0..8]) matching THREE's Euler orders XYZ and YXZ ---- */
function mg3Me(ex,ey,ez,ord,m){m=m||new Array(9);const a=Math.cos(ex),b=Math.sin(ex),c=Math.cos(ey),d=Math.sin(ey),e=Math.cos(ez),f=Math.sin(ez);
  if(ord==='YXZ'){const ce=c*e,cf=c*f,de=d*e,df=d*f;m[0]=ce+df*b;m[1]=de*b-cf;m[2]=a*d;m[3]=a*f;m[4]=a*e;m[5]=-b;m[6]=cf*b-de;m[7]=df+ce*b;m[8]=a*c;}
  else{const ae=a*e,af=a*f,be=b*e,bf=b*f;m[0]=c*e;m[1]=-c*f;m[2]=d;m[3]=af+be*d;m[4]=ae-bf*d;m[5]=-b*c;m[6]=bf-ae*d;m[7]=be+af*d;m[8]=a*c;}return m;}
function mg3Eu(m,ord,out){out=out||[0,0,0];                                                /* matrix -> Euler (THREE's setFromRotationMatrix) */
  if(ord==='YXZ'){out[0]=Math.asin(-mg3Cl(m[5],-1,1));if(Math.abs(m[5])<0.9999999){out[1]=Math.atan2(m[2],m[8]);out[2]=Math.atan2(m[3],m[4]);}else{out[1]=Math.atan2(-m[6],m[0]);out[2]=0;}}
  else{out[1]=Math.asin(mg3Cl(m[2],-1,1));if(Math.abs(m[2])<0.9999999){out[0]=Math.atan2(-m[5],m[8]);out[2]=Math.atan2(-m[1],m[0]);}else{out[0]=Math.atan2(m[7],m[4]);out[2]=0;}}return out;}
function mg3Mm(a,b,o){o=o||new Array(9);for(let i=0;i<3;i++)for(let j=0;j<3;j++)o[i*3+j]=a[i*3]*b[j]+a[i*3+1]*b[3+j]+a[i*3+2]*b[6+j];return o;}
function mg3Mt(a,o){o=o||new Array(9);o[0]=a[0];o[1]=a[3];o[2]=a[6];o[3]=a[1];o[4]=a[4];o[5]=a[7];o[6]=a[2];o[7]=a[5];o[8]=a[8];return o;}
function mg3Mv(m,v,o){o=o||[0,0,0];const x=v[0],y=v[1],z=v[2];o[0]=m[0]*x+m[1]*y+m[2]*z;o[1]=m[3]*x+m[4]*y+m[5]*z;o[2]=m[6]*x+m[7]*y+m[8]*z;return o;}
function mg3Nz(v){const l=Math.hypot(v[0],v[1],v[2])||1;v[0]/=l;v[1]/=l;v[2]/=l;return v;}
function mg3X(a,b,o){o=o||[0,0,0];const x=a[1]*b[2]-a[2]*b[1],y=a[2]*b[0]-a[0]*b[2],z=a[0]*b[1]-a[1]*b[0];o[0]=x;o[1]=y;o[2]=z;return o;}
/* the world (or `stop`-relative) transform of an Object3D, by our own forward kinematics: {m (3x3), p} */
var MG3K={m:[1,0,0,0,1,0,0,0,1],t:new Array(9),r:new Array(9),v:[0,0,0]};
function mg3Fk(o,stop,out){out=out||{m:[1,0,0,0,1,0,0,0,1],p:[0,0,0]};const m=out.m,p=out.p;m[0]=m[4]=m[8]=1;m[1]=m[2]=m[3]=m[5]=m[6]=m[7]=0;p[0]=p[1]=p[2]=0;
  for(let q=o;q&&q!==stop;q=q.parent){const R=mg3Me(q.rotation.x,q.rotation.y,q.rotation.z,q.rotation.order,MG3K.r),s=q.scale;
    for(let i=0;i<3;i++){p[i]*=i===0?s.x:(i===1?s.y:s.z);}const np=mg3Mv(R,p,MG3K.v);p[0]=np[0]+q.position.x;p[1]=np[1]+q.position.y;p[2]=np[2]+q.position.z;
    const S=MG3K.t;for(let i=0;i<9;i++)S[i]=m[i];for(let i=0;i<3;i++){const k=i===0?s.x:(i===1?s.y:s.z);S[i*3]*=k;S[i*3+1]*=k;S[i*3+2]*=k;}mg3Mm(R,S,m);}
  return out;}
function mg3Wp(o,v,stop,out){const T=mg3Fk(o,stop);out=out||[0,0,0];mg3Mv(T.m,v||[0,0,0],out);out[0]+=T.p[0];out[1]+=T.p[1];out[2]+=T.p[2];return out;}
/* ---- uniform Catmull-Rom through control points (own maths: the stub's curve returns no points) ---- */
function mg3Cr(P,t,o){const n=P.length-1,f=mg3Cl(t,0,1)*n,i=Math.min(n-1,Math.floor(f)),u=f-i;
  const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(n,i+2)],u2=u*u,u3=u2*u;o=o||[0,0,0];
  for(let k=0;k<3;k++)o[k]=0.5*((2*p1[k])+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u3);return o;}
/* ---- geometry from flat arrays (BufferAttribute + an index attribute) ---- */
/* BufferAttribute (never Float32BufferAttribute: real THREE copies that array, so a skin rebuilt in place would never move) */
function mg3F32(a){return a instanceof Float32Array?a:new Float32Array(a);}
function mg3Geo(G){const g=new THREE.BufferGeometry(),BA=THREE.BufferAttribute;G.pos=mg3F32(G.pos);G.nrm=mg3F32(G.nrm);
  g.setAttribute('position',new BA(G.pos,3));g.setAttribute('normal',new BA(G.nrm,3));
  if(G.uv){G.uv=mg3F32(G.uv);g.setAttribute('uv',new BA(G.uv,2));}if(G.col){G.col=mg3F32(G.col);g.setAttribute('color',new BA(G.col,3));}
  if(G.rest){g.setAttribute('rest',new BA(mg3F32(G.rest),3));g.setAttribute('restN',new BA(mg3F32(G.restN),3));}
  const n=G.pos.length/3,I=n>65535?new Uint32Array(G.idx):new Uint16Array(G.idx);g.setIndex(new THREE.BufferAttribute(I,1));
  g.userData={tris:G.idx.length/3,verts:n};if(G.n!=null&&G.m!=null){g.userData.n=G.n;g.userData.m=G.m;}return g;}
/* grid normals: central differences around (wrapping) and along a (n+1) x (m+1) ring grid; the seam column copies column 0 */
function mg3GridN(pos,nrm,n,m,flip){const P=(i,j)=>((i*(m+1))+j)*3;const a=[0,0,0],b=[0,0,0],c=[0,0,0];
  for(let i=0;i<=n;i++)for(let j=0;j<m;j++){const jp=(j+1)%m,jm=(j+m-1)%m,ip=Math.min(n,i+1),im=Math.max(0,i-1);
    let k0=P(i,jp),k1=P(i,jm);a[0]=pos[k0]-pos[k1];a[1]=pos[k0+1]-pos[k1+1];a[2]=pos[k0+2]-pos[k1+2];
    k0=P(ip,j);k1=P(im,j);b[0]=pos[k0]-pos[k1];b[1]=pos[k0+1]-pos[k1+1];b[2]=pos[k0+2]-pos[k1+2];
    if(Math.hypot(b[0],b[1],b[2])<1e-6){const q=P(i===0?1:n-1,j),r=P(i,j);b[0]=(pos[r]-pos[q])*(i===0?-1:1);b[1]=(pos[r+1]-pos[q+1])*(i===0?-1:1);b[2]=(pos[r+2]-pos[q+2])*(i===0?-1:1);}
    mg3X(b,a,c);if(flip){c[0]=-c[0];c[1]=-c[1];c[2]=-c[2];}mg3Nz(c);const k=P(i,j);nrm[k]=c[0];nrm[k+1]=c[1];nrm[k+2]=c[2];}
  for(let i=0;i<=n;i++){const s=P(i,0),d=P(i,m);nrm[d]=nrm[s];nrm[d+1]=nrm[s+1];nrm[d+2]=nrm[s+2];}}
function mg3GridIdx(n,m,base,idx,flip){for(let i=0;i<n;i++)for(let j=0;j<m;j++){const a=base+i*(m+1)+j,b=a+1,c=a+m+1,d=c+1;
    if(flip)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d);}}
/* ---- THE LOFT (bible 5.10.1) */
function mg3Loft(o){const n=o.n,m=o.m,N=(n+1)*(m+1),pos=new Float32Array(N*3),nrm=new Float32Array(N*3),uv=new Float32Array(N*2),col=new Float32Array(N*3);
  const up=o.up||[0,0,1],C=[0,0,0],C2=[0,0,0],T=[0,0,0],S=[0,0,0],U=[0,0,0];let arc=0,prev=null,circ=0;
  const sArc=new Float32Array(n+1);
  for(let i=0;i<=n;i++){const t=i/n;mg3Cr(o.pts,t,C);if(prev)arc+=Math.hypot(C[0]-prev[0],C[1]-prev[1],C[2]-prev[2]);sArc[i]=arc;prev=[C[0],C[1],C[2]];}
  for(let i=0;i<=n;i++){const t=i/n;mg3Cr(o.pts,t,C);mg3Cr(o.pts,Math.min(1,t+0.002),C2);
    if(t>=0.998){mg3Cr(o.pts,t-0.002,C2);T[0]=C[0]-C2[0];T[1]=C[1]-C2[1];T[2]=C[2]-C2[2];}else{T[0]=C2[0]-C[0];T[1]=C2[1]-C[1];T[2]=C2[2]-C[2];}
    mg3Nz(T);mg3X(T,up,S);if(Math.hypot(S[0],S[1],S[2])<1e-4)mg3X(T,[1,0,0],S);mg3Nz(S);mg3X(S,T,U);mg3Nz(U);
    let ring=0,px=0,py=0;
    for(let j=0;j<=m;j++){const a=(j%m)/m*Math.PI*2,q=o.prof(t,a),k=(i*(m+1)+j)*3;
      pos[k]=C[0]+S[0]*q[0]+U[0]*q[1];pos[k+1]=C[1]+S[1]*q[0]+U[1]*q[1];pos[k+2]=C[2]+S[2]*q[0]+U[2]*q[1];
      if(j>0)ring+=Math.hypot(q[0]-px,q[1]-py);px=q[0];py=q[1];}
    circ=Math.max(circ,ring);}
  const us=o.uvs||4.0;
  for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){const k=i*(m+1)+j;uv[k*2]=(j/m)*Math.max(1,Math.round(circ/us));uv[k*2+1]=sArc[i]/us;}
  mg3GridN(pos,nrm,n,m,o.flip);
  if(o.disp){const s=o.dseed||7,f=o.dfq||0.7;for(let i=0;i<=n;i++){const mk=o.dmask?o.dmask(i/n):1;if(mk<=0)continue;
      for(let j=0;j<=m;j++){const k=(i*(m+1)+j)*3,x=pos[k],y=pos[k+1],z=pos[k+2];
        const d=(mg3Fbm(x*f,y*f,z*f,s,3)*0.75+mg3N3(x*f*4.1,y*f*4.1,z*f*4.1,s+5)*0.25)*o.disp*mk;
        pos[k]+=nrm[k]*d;pos[k+1]+=nrm[k+1]*d;pos[k+2]+=nrm[k+2]*d;}}
    for(let i=0;i<=n;i++){const s0=i*(m+1)*3,s1=s0+m*3;pos[s1]=pos[s0];pos[s1+1]=pos[s0+1];pos[s1+2]=pos[s0+2];}
    mg3GridN(pos,nrm,n,m,o.flip);}
  for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){const k=(i*(m+1)+j)*3;let c=[1,1,1];
    if(o.col)c=o.col(i/n,(j%m)/m*Math.PI*2,pos[k],pos[k+1],pos[k+2],nrm[k],nrm[k+1],nrm[k+2]);col[k]=c[0];col[k+1]=c[1];col[k+2]=c[2];}
  const idx=[];mg3GridIdx(n,m,0,idx,o.flip);
  return {pos,nrm,uv,col,idx,n,m};}
/* merge grids/meshes (each optionally moved by a 3x3 + offset) into one flat geometry description */
function mg3Join(list){let N=0,I=0;for(const L of list){N+=L.g.pos.length/3;I+=L.g.idx.length;}
  const pos=new Float32Array(N*3),nrm=new Float32Array(N*3),uv=new Float32Array(N*2),col=new Float32Array(N*3),idx=new Array(I);let v=0,ii=0;const t=[0,0,0];
  for(const L of list){const g=L.g,n=g.pos.length/3,M=L.m,p=L.p||[0,0,0];
    for(let k=0;k<n;k++){t[0]=g.pos[k*3];t[1]=g.pos[k*3+1];t[2]=g.pos[k*3+2];if(M)mg3Mv(M,t,t);pos[(v+k)*3]=t[0]+p[0];pos[(v+k)*3+1]=t[1]+p[1];pos[(v+k)*3+2]=t[2]+p[2];
      t[0]=g.nrm[k*3];t[1]=g.nrm[k*3+1];t[2]=g.nrm[k*3+2];if(M)mg3Mv(M,t,t);nrm[(v+k)*3]=t[0];nrm[(v+k)*3+1]=t[1];nrm[(v+k)*3+2]=t[2];
      if(g.uv){uv[(v+k)*2]=g.uv[k*2];uv[(v+k)*2+1]=g.uv[k*2+1];}
      const cc=L.c;col[(v+k)*3]=(g.col?g.col[k*3]:1)*(cc?cc[0]:1);col[(v+k)*3+1]=(g.col?g.col[k*3+1]:1)*(cc?cc[1]:1);col[(v+k)*3+2]=(g.col?g.col[k*3+2]:1)*(cc?cc[2]:1);}
    for(let k=0;k<g.idx.length;k++)idx[ii++]=g.idx[k]+v;v+=n;}
  return {pos,nrm,uv,col,idx};}
/* an ellipsoid grid (eyes, belly window, glow, leaf blobs): rx,ry,rz, n rings (pole to pole along +z), m around; opt bump(a,b)->r mult */
function mg3Ell(rx,ry,rz,n,m,bump,flip){const N=(n+1)*(m+1),pos=new Float32Array(N*3),nrm=new Float32Array(N*3),uv=new Float32Array(N*2),col=new Float32Array(N*3).fill(1);
  for(let i=0;i<=n;i++){const th=i/n*Math.PI,st=Math.sin(th),ct=Math.cos(th);
    for(let j=0;j<=m;j++){const a=(j%m)/m*Math.PI*2,b=bump?bump(i/n,a):1,k=(i*(m+1)+j)*3;
      pos[k]=Math.cos(a)*st*rx*b;pos[k+1]=Math.sin(a)*st*ry*b;pos[k+2]=-ct*rz*b;uv[(k/3)*2]=j/m;uv[(k/3)*2+1]=i/n;}}
  mg3GridN(pos,nrm,n,m,!flip);const idx=[];mg3GridIdx(n,m,0,idx,!flip);return {pos,nrm,uv,col,idx,n,m};}
/* the shared fang (bible 5.2: one geometry, each tooth with its own size, lean and chip by its transform): base at 0, tip +y */
function mg3Fang(seg,rows,curl){const n=rows||5,m=seg||6;return mg3Loft({pts:[[0,-0.25,0],[0,0.3,0.02],[0,0.7,0.08*(curl||1)],[0,1.0,0.2*(curl||1)]],n,m,up:[0,0,1],uvs:0.5,
  prof:(t,a)=>{const r=0.32*Math.pow(1-t,0.9)+0.012;return [Math.cos(a)*r,Math.sin(a)*r*0.72];},
  col:(t)=>{const k=mg3Sm(0.0,0.75,t);return [mg3Lp(0.62,1.0,k),mg3Lp(0.5,0.97,k),mg3Lp(0.32,0.88,k)];}});}
/* a box description with per-face shade (1 m cube scaled), used by the proxy and debris */
function mg3BoxG(w,h,d){const F=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],pos=[],nrm=[],uv=[],col=[],idx=[];
  for(const f of F){const u=f[0]?[0,1,0]:[1,0,0],v=mg3X(f,u,[0,0,0]),b=pos.length/3;
    for(const [su,sv] of [[-1,-1],[1,-1],[1,1],[-1,1]]){pos.push((f[0]+u[0]*su+v[0]*sv)*w/2,(f[1]+u[1]*su+v[1]*sv)*h/2,(f[2]+u[2]*su+v[2]*sv)*d/2);nrm.push(f[0],f[1],f[2]);uv.push((su+1)/2,(sv+1)/2);col.push(1,1,1);}
    idx.push(b,b+1,b+2,b,b+2,b+3);}
  /* winding: make every face counter-clockwise seen from outside */
  for(let q=0;q<idx.length;q+=3){const a=idx[q]*3,b=idx[q+1]*3,c=idx[q+2]*3,e1=[pos[b]-pos[a],pos[b+1]-pos[a+1],pos[b+2]-pos[a+2]],e2=[pos[c]-pos[a],pos[c+1]-pos[a+1],pos[c+2]-pos[a+2]],cr=mg3X(e1,e2);
    if(cr[0]*nrm[a]+cr[1]*nrm[a+1]+cr[2]*nrm[a+2]<0){const t=idx[q+1];idx[q+1]=idx[q+2];idx[q+2]=t;}}
  return {pos:new Float32Array(pos),nrm:new Float32Array(nrm),uv:new Float32Array(uv),col:new Float32Array(col),idx};}
/* atlas cubes (the 16 px world, bible 5.4) */
function mg3Cubes(list){const occ=new Set(list.filter(c=>(c.s||1)===1&&!c.ry).map(c=>c.x+','+c.y+','+c.z));
  const FS=[[1,0,0,0.8],[-1,0,0,0.8],[0,1,0,1],[0,-1,0,0.5],[0,0,1,0.65],[0,0,-1,0.65]],pos=[],nrm=[],uv=[],col=[],idx=[];
  for(const c of list){const d=DEFS[c.id],t=d&&d._t;if(!t)continue;const s=c.s||1,cy=Math.cos(c.ry||0),sy=Math.sin(c.ry||0);
    for(const f of FS){if(s===1&&!c.ry&&occ.has((c.x+f[0])+','+(c.y+f[1])+','+(c.z+f[2])))continue;
      const ti=f[1]>0?t.top:(f[1]<0?t.bot:t.side),U=tileUV(ti),fn=[f[0],f[1],f[2]],u=f[1]?[1,0,0]:(f[0]?[0,0,-f[0]]:[f[2],0,0]),v=mg3X(fn,u),b=pos.length/3;
      for(const [su,sv,uu,vv] of [[-1,-1,U[0],U[1]],[1,-1,U[2],U[1]],[1,1,U[2],U[3]],[-1,1,U[0],U[3]]]){
        const lx=(f[0]+u[0]*su+v[0]*sv)*s/2,ly=(f[1]+u[1]*su+v[1]*sv)*s/2,lz=(f[2]+u[2]*su+v[2]*sv)*s/2;
        pos.push(c.x+lx*cy+lz*sy,c.y+ly,c.z-lx*sy+lz*cy);nrm.push(f[0]*cy+f[2]*sy,f[1],-f[0]*sy+f[2]*cy);uv.push(uu,vv);const sh=f[3]*(c.sh||1);col.push(sh,sh,sh);}
      idx.push(b,b+1,b+2,b,b+2,b+3);}}
  return {pos:new Float32Array(pos),nrm:new Float32Array(nrm),uv:new Float32Array(uv),col:new Float32Array(col),idx};}
/* ---- THE CHAIN SWEEP */
function mg3Sweep(o){const J=o.joints,ns=J.length,n=o.n*(ns-1)+(o.tipN||0),m=o.m,N=(n+1)*(m+1);
  const G={pos:new Float32Array(N*3),nrm:new Float32Array(N*3),uv:new Float32Array(N*2),col:new Float32Array(N*3),rest:null,restN:null,idx:[]};
  const sw={o,n,m,G,F:[],tmp:{m:[1,0,0,0,1,0,0,0,1],p:[0,0,0]},S:[0,0,0],U:[0,0,0],T:[0,0,0],C:[0,0,0]};
  for(let k=0;k<ns;k++)sw.F.push({m:[1,0,0,0,1,0,0,0,1],p:[0,0,0]});
  mg3GridIdx(n,m,0,G.idx,o.flip);
  mg3SweepTick(sw,true);
  G.rest=new Float32Array(G.pos);G.restN=new Float32Array(G.nrm);
  const geo=mg3Geo(G);sw.geo=geo;sw.attr=geo.attributes.position;sw.nattr=geo.attributes.normal;return sw;}
function mg3SweepTick(sw,first){const o=sw.o,J=o.joints,ns=J.length,n=sw.n,m=sw.m,G=sw.G,dir=o.dir||[0,0,1],up=o.up||[0,1,0];
  for(let k=0;k<ns;k++){const T=mg3Fk(J[k],J[0].parent,sw.F[k]);}                         /* every joint in the chain root's parent frame */
  const pos=G.pos,C=sw.C,T=sw.T,S=sw.S,U=sw.U,tl=o.tipLen||0,tn=o.tipN||0;let ring=0;
  for(let i=0;i<=n;i++){let k,f;if(i<=o.n*(ns-1)){k=Math.min(ns-2,Math.floor(i/o.n));f=i/o.n-k;}else{k=ns-1;f=(i-o.n*(ns-1))/Math.max(1,tn);}
    const A=sw.F[k],Bf=sw.F[Math.min(ns-1,k+1)];
    if(k<ns-1){const P0=sw.F[Math.max(0,k-1)].p,P1=A.p,P2=Bf.p,P3=sw.F[Math.min(ns-1,k+2)].p,u=f,u2=u*u,u3=u2*u;
      for(let q=0;q<3;q++)C[q]=0.5*((2*P1[q])+(-P0[q]+P2[q])*u+(2*P0[q]-5*P1[q]+4*P2[q]-P3[q])*u2+(-P0[q]+3*P1[q]-3*P2[q]+P3[q])*u3);}
    else{for(let q=0;q<3;q++)C[q]=A.p[q]+(A.m[q*3]*dir[0]+A.m[q*3+1]*dir[1]+A.m[q*3+2]*dir[2])*tl*f;}
    const w=k<ns-1?f:0;                                                                   /* rings face along the curve (no folds); 'up' blends the joint frames */
    for(let q=0;q<3;q++){U[q]=mg3Lp(A.m[q*3]*up[0]+A.m[q*3+1]*up[1]+A.m[q*3+2]*up[2],Bf.m[q*3]*up[0]+Bf.m[q*3+1]*up[1]+Bf.m[q*3+2]*up[2],w);}
    if(k<ns-1){const P0=sw.F[Math.max(0,k-1)].p,P1=A.p,P2=Bf.p,P3=sw.F[Math.min(ns-1,k+2)].p,u=f,u2=u*u;
      for(let q=0;q<3;q++)T[q]=0.5*((-P0[q]+P2[q])+2*(2*P0[q]-5*P1[q]+4*P2[q]-P3[q])*u+3*(-P0[q]+3*P1[q]-3*P2[q]+P3[q])*u2);
      if(Math.hypot(T[0],T[1],T[2])<1e-5)for(let q=0;q<3;q++)T[q]=A.m[q*3]*dir[0]+A.m[q*3+1]*dir[1]+A.m[q*3+2]*dir[2];}
    else for(let q=0;q<3;q++)T[q]=A.m[q*3]*dir[0]+A.m[q*3+1]*dir[1]+A.m[q*3+2]*dir[2];
    mg3Nz(T);mg3X(T,U,S);mg3Nz(S);mg3X(S,T,U);
    const t=i/n;
    for(let j=0;j<=m;j++){const a=(j%m)/m*Math.PI*2,q=o.prof(t,a),kk=(i*(m+1)+j)*3;
      pos[kk]=C[0]+S[0]*q[0]+U[0]*q[1];pos[kk+1]=C[1]+S[1]*q[0]+U[1]*q[1];pos[kk+2]=C[2]+S[2]*q[0]+U[2]*q[1];}}
  mg3GridN(pos,G.nrm,n,m,o.flip);
  if(first){const us=o.uvs||1.5;let arc=0,px=0,py=0,pz=0;
    for(let i=0;i<=n;i++){let cx=0,cy=0,cz=0;for(let j=0;j<m;j++){const k=(i*(m+1)+j)*3;cx+=pos[k];cy+=pos[k+1];cz+=pos[k+2];}cx/=m;cy/=m;cz/=m;
      if(i>0)arc+=Math.hypot(cx-px,cy-py,cz-pz);px=cx;py=cy;pz=cz;
      for(let j=0;j<=m;j++){const k=i*(m+1)+j;G.uv[k*2]=j/m*(o.uround||2);G.uv[k*2+1]=arc/us;
        const c=o.col?o.col(i/n,(j%m)/m*Math.PI*2):[1,1,1];G.col[k*3]=c[0];G.col[k*3+1]=c[1];G.col[k*3+2]=c[2];}}}
  else if(sw.attr){sw.attr.needsUpdate=true;sw.nattr.needsUpdate=true;}}
/* the chain's mesh is parented to the chain root's PARENT (its vertices are written in that frame) */
/* ---- OG skin textures (bible 5.6): seeded, built in slices (MG3.cfg.ROWS rows of one map per call), never at load ---- */
function mg3Detach(o){if(o&&o.parent){o.parent.remove(o);o.parent=null;}}
function mg3Cv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function mg3TexInit(){if(MG3.tex)return MG3.tex;const S=MG3.cfg.TEX,s=MG3.cfg.TEX_S;
  const T={S,s,done:false,step:0,row:0,seed:(typeof SEED!=='undefined'?SEED|0:1337)^0x6d67,list:{}};
  const mk=(k,w)=>{const c=mg3Cv(w,w),g=c.getContext('2d');let id=g.getImageData?g.getImageData(0,0,w,w):null;if(!id||!id.data||id.data.length<w*w*4)id={data:new Uint8ClampedArray(w*w*4),width:w,height:w,fake:1};
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;T.list[k]={c,g,id,t,w};return T.list[k];};
  for(const k of ['hide','hideN','hideR','hideE','bone'])mk(k,S);for(const k of ['horn','flesh','crust','crustN'])mk(k,s);
  T.H=new Float32Array(S*S);T.E=new Float32Array(S*S);T.Hs=new Float32Array(s*s);
  /* Voronoi plate sites on a wrapping grid (tileable): G x G cells, one jittered site each */
  const Gd=24,R=mg3Rng(T.seed);T.Gd=Gd;T.site=new Float32Array(Gd*Gd*3);for(let i=0;i<Gd*Gd;i++){T.site[i*3]=R();T.site[i*3+1]=R();T.site[i*3+2]=R();}
  MG3.tex=T;return T;}
/* one slice of work; returns true when every map is done */
function mg3TexStep(rows){const T=mg3TexInit();if(T.done)return true;rows=rows||MG3.cfg.ROWS;const S=T.S,s=T.s;
  const st=['vor','hide','sobel','small','up'][T.step];
  if(st==='vor'){const Gd=T.Gd,site=T.site;rows=Math.max(2,rows>>3);
    for(let y=T.row;y<Math.min(S,T.row+rows);y++)for(let x=0;x<S;x++){const fx=x/S*Gd,fy=y/S*Gd,cx=Math.floor(fx),cy=Math.floor(fy);let d1=9,d2=9,id=0;
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const gx=(cx+ox+Gd)%Gd,gy=(cy+oy+Gd)%Gd,q=(gy*Gd+gx)*3,sx=cx+ox+site[q],sy=cy+oy+site[q+1],d=(fx-sx)*(fx-sx)+(fy-sy)*(fy-sy);
        if(d<d1){d2=d1;d1=d;id=q;}else if(d<d2)d2=d;}
      const e=Math.sqrt(d2)-Math.sqrt(d1),nz=mg3Fbm(x/S*48,y/S*48,0.5,T.seed,3),pore=mg3N3(x*0.9,y*0.9,3.3,T.seed+9);
      const crack=1-mg3Sm(0.0,0.06+0.03*nz,e),dome=Math.min(1,e*3.5);
      /* the glowing fissures: a sparse wide network (4 cells per tile), wobbly, fading in and out along their length */
      const g4=3,fx4=x/S*g4+mg3N3(x/S*9,y/S*9,2.2,T.seed+61)*0.35,fy4=y/S*g4+mg3N3(x/S*9,y/S*9,4.4,T.seed+61)*0.35,c4x=Math.floor(fx4),c4y=Math.floor(fy4);let e1=9,e2=9;
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const gx=(c4x+ox+g4)%g4,gy=(c4y+oy+g4)%g4,sx=c4x+ox+mg3H3(gx,gy,0,T.seed+71),sy=c4y+oy+mg3H3(gx,gy,1,T.seed+71),d=(fx4-sx)*(fx4-sx)+(fy4-sy)*(fy4-sy);
        if(d<e1){e2=e1;e1=d;}else if(d<e2)e2=d;}
      const fe=Math.sqrt(e2)-Math.sqrt(e1),fis=(1-mg3Sm(0.0,0.045+0.03*nz,fe))*mg3Sm(0.52,0.72,mg3N3(x/S*5,y/S*5,9.9,T.seed+81)*0.5+0.5);
      T.H[y*S+x]=dome*0.7+site[id+2]*0.15+nz*0.12-crack*0.45-fis*0.7-(pore>0.82?0.08:0);
      T.E[y*S+x]=Math.max(fis,crack*0.035);}
    T.row+=rows;if(T.row>=S){T.row=0;T.step++;}return false;}
  if(st==='hide'){const A=T.list.hide.id.data,Rg=T.list.hideR.id.data,E=T.list.hideE.id.data,Bn=T.list.bone.id.data;
    for(let y=T.row;y<Math.min(S,T.row+rows);y++)for(let x=0;x<S;x++){const i=y*S+x,h=T.H[i],e=T.E[i],o=i*4,v=mg3N3(x/S*12,y/S*12,1.1,T.seed+21);
      const b=mg3Cl(0.1+h*0.15+v*0.04,0.02,1);A[o]=mg3Cl((b*0.98+0.015)*255,0,255);A[o+1]=mg3Cl(b*0.92*255,0,255);A[o+2]=mg3Cl(b*0.94*255,0,255);A[o+3]=255;
      const bb=mg3Cl(0.66+h*0.24+v*0.07,0,1)*(1-mg3Cl(e*1.4,0,0.6));Bn[o]=mg3Cl(bb*0.96*255,0,255);Bn[o+1]=mg3Cl(bb*0.9*255,0,255);Bn[o+2]=mg3Cl(bb*0.78*255,0,255);Bn[o+3]=255;
      const r=mg3Cl(0.55+(1-h)*0.3+e*0.15,0,1)*255;Rg[o]=Rg[o+1]=Rg[o+2]=r;Rg[o+3]=255;
      const em=mg3Cl(e*1.6,0,1)*255;E[o]=E[o+1]=E[o+2]=em;E[o+3]=255;}
    T.row+=rows;if(T.row>=S){T.row=0;T.step++;}return false;}
  if(st==='sobel'){const N=T.list.hideN.id.data,H=T.H,k=2.6;
    for(let y=T.row;y<Math.min(S,T.row+rows);y++)for(let x=0;x<S;x++){const xm=(x+S-1)%S,xp=(x+1)%S,ym=(y+S-1)%S,yp=(y+1)%S;
      const dx=(H[y*S+xp]-H[y*S+xm])*k*2+(H[ym*S+xp]-H[ym*S+xm])*k+(H[yp*S+xp]-H[yp*S+xm])*k,dy=(H[yp*S+x]-H[ym*S+x])*k*2+(H[yp*S+xm]-H[ym*S+xm])*k+(H[yp*S+xp]-H[ym*S+xp])*k;
      const l=Math.hypot(dx,dy,1),o=(y*S+x)*4;N[o]=(-dx/l*0.5+0.5)*255;N[o+1]=(dy/l*0.5+0.5)*255;N[o+2]=(1/l*0.5+0.5)*255;N[o+3]=255;}
    T.row+=rows;if(T.row>=S){T.row=0;T.step++;}return false;}
  if(st==='small'){rows=Math.max(1,rows>>4);const Hd=T.list.horn.id.data,Fd=T.list.flesh.id.data,Cd=T.list.crust.id.data,Cn=T.list.crustN.id.data,sd=T.seed;
    for(let y=T.row;y<Math.min(s,T.row+rows*2);y++)for(let x=0;x<s;x++){const o=(y*s+x)*4,u=x/s,v=y/s;
      /* horn: ridged keratin bands along v, chipped */
      const band=0.5+0.5*Math.sin(v*Math.PI*2*18+mg3N3(u*6,v*6,0,sd+31)*2.2),gr=mg3Fbm(u*20,v*3,1,sd+33,3);
      const hb=mg3Cl(0.5+band*0.18+gr*0.14,0,1);Hd[o]=hb*255*0.92;Hd[o+1]=hb*255*0.84;Hd[o+2]=hb*255*0.7;Hd[o+3]=255;
      /* flesh: wet striated muscle, pale veins */
      const fib=0.5+0.5*Math.sin(u*Math.PI*2*30+mg3N3(u*8,v*8,2,sd+41)*3),vein=1-mg3Sm(0,0.04,Math.abs(mg3Fbm(u*5,v*5,3,sd+43,3)));
      Fd[o]=mg3Cl((0.26+fib*0.09+vein*0.2)*255,0,255);Fd[o+1]=mg3Cl((0.07+fib*0.035+vein*0.15)*255,0,255);Fd[o+2]=mg3Cl((0.075+fib*0.03+vein*0.14)*255,0,255);Fd[o+3]=255;
      /* crust: cooled-lava plates with amber cracks (alpha: cracks translucent) */
      const fx=u*7,fy=v*7,cx=Math.floor(fx),cy=Math.floor(fy);let d1=9,d2=9;
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const gx=(cx+ox+7)%7,gy=(cy+oy+7)%7,sx=cx+ox+mg3H3(gx,gy,0,sd+51),sy=cy+oy+mg3H3(gx,gy,1,sd+51),d=(fx-sx)*(fx-sx)+(fy-sy)*(fy-sy);
        if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
      const ce=Math.sqrt(d2)-Math.sqrt(d1),cr=1-mg3Sm(0.02,0.12,ce),pl=mg3Fbm(u*30,v*30,5,sd+53,2);
      Cd[o]=mg3Cl((0.16+pl*0.06)*(1-cr)*255+cr*255,0,255);Cd[o+1]=mg3Cl((0.1+pl*0.04)*(1-cr)*255+cr*150,0,255);Cd[o+2]=mg3Cl((0.09)*(1-cr)*255+cr*40,0,255);Cd[o+3]=mg3Cl(255-cr*170,0,255);
      T.Hs[y*s+x]=Math.min(1,ce*4)+pl*0.1;}
    for(let y=T.row;y<Math.min(s,T.row+rows*2);y++)for(let x=0;x<s;x++){const H=T.Hs,o=(y*s+x)*4,xm=(x+s-1)%s,xp=(x+1)%s,ym=(y+s-1)%s,yp=(y+1)%s;
      const dx=(H[y*s+xp]-H[y*s+xm])*3,dy=(H[yp*s+x]-H[ym*s+x])*3,l=Math.hypot(dx,dy,1);Cn[o]=(-dx/l*0.5+0.5)*255;Cn[o+1]=(dy/l*0.5+0.5)*255;Cn[o+2]=(1/l*0.5+0.5)*255;Cn[o+3]=255;}
    T.row+=rows*2;if(T.row>=s){T.row=0;T.step++;}return false;}
  if(st==='up'){for(const k in T.list){const L=T.list[k];if(L.g.putImageData&&!L.id.fake)L.g.putImageData(L.id,0,0);L.t.needsUpdate=true;}
    T.H=null;T.Hs=null;T.done=true;T.step++;MG3.built|=1;return true;}
  return true;}
function mg3TexAll(){let g=0;while(!mg3TexStep(256)&&g++<4000){}return MG3.tex;}
/* eye canvases (128^2): a molten iris with a vertical slit pupil; kind 'amber' | 'human' (hand eyes) | 'blood' */
function mg3EyeTex(kind){const key='eye_'+kind;if(MG3.geo[key])return MG3.geo[key];const c=mg3Cv(128,128),g=c.getContext('2d');
  const R=mg3Rng(kind.length*977+5);g.fillStyle=kind==='human'?'#cdb894':'#2a0802';g.fillRect(0,0,128,128);
  const iris=g.createRadialGradient?g.createRadialGradient(64,64,4,64,64,60):null;
  if(iris){if(kind==='human'){iris.addColorStop(0,'#3b2412');iris.addColorStop(0.45,'#8a5a2a');iris.addColorStop(0.75,'#3a2410');iris.addColorStop(1,'#e8dccb');}
    else{iris.addColorStop(0,'#fff6c0');iris.addColorStop(0.3,'#ffc23a');iris.addColorStop(0.7,'#ff6a10');iris.addColorStop(0.95,'#5a0e02');iris.addColorStop(1,'#2a0802');}
    g.fillStyle=iris;g.beginPath();g.arc(64,64,kind==='human'?50:60,0,Math.PI*2);g.fill();}
  if(kind==='human'){g.strokeStyle='rgba(150,30,20,0.7)';g.lineWidth=1.5;for(let i=0;i<14;i++){const a=R()*Math.PI*2;g.beginPath();g.moveTo(64+Math.cos(a)*62,64+Math.sin(a)*62);g.lineTo(64+Math.cos(a+0.2)*50,64+Math.sin(a+0.2)*50);g.stroke();}}
  g.strokeStyle=kind==='human'?'rgba(90,40,20,0.6)':'rgba(255,240,180,0.35)';g.lineWidth=1;
  for(let i=0;i<40;i++){const a=R()*Math.PI*2,r0=10+R()*10,r1=34+R()*24;g.beginPath();g.moveTo(64+Math.cos(a)*r0,64+Math.sin(a)*r0);g.lineTo(64+Math.cos(a)*r1,64+Math.sin(a)*r1);g.stroke();}
  g.fillStyle='#050101';g.beginPath();if(g.ellipse){if(kind==='human')g.ellipse(64,64,13,13,0,0,Math.PI*2);else g.ellipse(64,64,7,46,0,0,Math.PI*2);}g.fill();
  g.fillStyle='rgba(255,255,255,0.75)';g.beginPath();g.arc(52,46,6,0,Math.PI*2);g.fill();
  const t=new THREE.CanvasTexture(c);MG3.geo[key]=t;return t;}
/* a soft round sprite (additive glows, sparks, steam) */
function mg3Soft(){if(MG3.geo.soft)return MG3.geo.soft;const c=mg3Cv(64,64),g=c.getContext('2d');const gr=g.createRadialGradient?g.createRadialGradient(32,32,0,32,32,32):null;
  if(gr){gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.35,'rgba(255,255,255,0.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);}
  const t=new THREE.CanvasTexture(c);MG3.geo.soft=t;return t;}
