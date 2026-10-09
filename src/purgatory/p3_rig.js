/* ---- PART 55: p3_rig.js ---- */
/* ===================================================================== */
/* PART 55 p3_rig.js (P3, puppets): the shared OG puppet rig (bible 9.1, 15.4; plan 5.3)                                    */
/* ===================================================================== */
/* Load rules: nothing here runs at load except plain data. One unit-box geometry for every rig part, created lazily on the
   first purgatory mesh. Per-instance materials exist only for parts the hurt flash needs (e.mats); they are listed on
   G.userData.pmats so the first brain tick sets e.pdisp/e.pmats and P0's mpDispose (P0-59) frees them. Faces, eyes, flesh,
   cuffs, rods and props use shared cached materials. Rig coordinates: units are blocks, feet (or the puppet's base) at y 0,
   facing +z, the engine's convention. */
var PMR={geo:null,sm:{},fm:{},n:0,arms:[],skinM:null,armVis:24,armFar:32,sp:new Set()};
/* every object P3 puts straight into the scene goes through pmAdd/pmDel, so a reset or the exit can take them all away */
function pmAdd(o){scene.add(o);PMR.sp.add(o);return o;}
function pmDel(o){if(!o)return;scene.remove(o);PMR.sp.delete(o);}
function pmGeo(){if(!PMR.geo)PMR.geo=new THREE.BoxGeometry(1,1,1);return PMR.geo;}
function pmSM(col){return PMR.sm[col]||(PMR.sm[col]=new THREE.MeshLambertMaterial({color:col}));}
function pmMI(R,col){let m=R.own[col];if(!m){m=new THREE.MeshLambertMaterial({color:col});R.own[col]=m;R.pm.push(m);}return m;}
/* a 16 px face canvas (shared, cached by key). paint(g,e) draws with e(x,y,w,h,col) */
function pmFaceMat(key,paint){if(PMR.fm[key])return PMR.fm[key];
  const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  const e=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};try{paint(g,e);}catch(err){mpFail('face '+key,err);}
  const tx=new THREE.CanvasTexture(c);tx.magFilter=THREE.NearestFilter;tx.minFilter=THREE.NearestFilter;
  return (PMR.fm[key]=new THREE.MeshLambertMaterial({map:tx}));}
/* the skin of the arm that wears everything: pale, pores, dark hairs (deliberately less Puppet than the felt) */
function pmSkinM(){if(PMR.skinM)return PMR.skinM;
  const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  g.fillStyle='#e8b9a0';g.fillRect(0,0,16,16);
  for(let i=0;i<14;i++){g.fillStyle=i%3?'#d9a68c':'#f2c9b2';g.fillRect((i*7)%16,(i*11)%16,1,1);}
  g.fillStyle='#3a2a20';for(let i=0;i<6;i++){g.fillRect((i*5+2)%16,(i*9+1)%16,1,2);}
  g.fillStyle='#b8c4d8';g.fillRect(9,0,1,16);
  const tx=new THREE.CanvasTexture(c);tx.magFilter=THREE.NearestFilter;tx.minFilter=THREE.NearestFilter;
  return (PMR.skinM=new THREE.MeshLambertMaterial({map:tx,color:'#ffffff'}));}
/* a box part: unit geometry scaled; o.shared = shared material (no hurt flash); o.face = a face key for the +z side;
   o.mat = an explicit material; returns the mesh (never parent anything to a scaled mesh: use pmG pivots) */
function pmB(R,par,w,h,d,col,x,y,z,o){o=o||{};
  let mat=o.mat||(o.shared?pmSM(col):pmMI(R,col));
  if(o.face){const f=pmFaceMat(o.face,o.paint);mat=[mat,mat,mat,mat,f,mat];}
  const m=new THREE.Mesh(pmGeo(),mat);m.scale.set(w,h,d);m.position.set(x||0,y||0,z||0);
  if(o.rx)m.rotation.x=o.rx;if(o.ry)m.rotation.y=o.ry;if(o.rz)m.rotation.z=o.rz;
  par.add(m);return m;}
function pmG(par,x,y,z){const g=new THREE.Group();g.position.set(x||0,y||0,z||0);if(par)par.add(g);return g;}
/* orient a unit box (long axis z) from a to b, thickness t */
function pmSeg(m,ax,ay,az,bx,by,bz,t,t2){const dx=bx-ax,dy=by-ay,dz=bz-az,h=Math.hypot(dx,dz),l=Math.hypot(h,dy)||1e-4;
  m.position.set((ax+bx)/2,(ay+by)/2,(az+bz)/2);m.rotation.order='YXZ';m.rotation.y=Math.atan2(dx,dz);m.rotation.x=-Math.atan2(dy,h);
  m.rotation.z=0;m.scale.set(t,t2||t,l);}

/* ---- the puppet head: an upper box and a jaw hinged at the BACK of the mouth line; round glued-on eyes with sliding pupils ----
   o={w,h,d,col,jaw,mouth,y,face,paint,eyes:{s,gap,y,white,pupil,pw,ph,style:'pp'|'googly'|'slit'|'lid',crook}} */
function pmHead(R,par,o){const H=pmG(par,0,o.y||0,o.z||0),uh=o.h*(o.split||0.62),jh=o.h-uh;
  const up=pmB(R,H,o.w,uh,o.d,o.col,0,jh+uh/2,0,o.face?{face:o.face,paint:o.paint}:null);
  const hrf=o.hrFace?pmHrFace(R,up,o.hrFace):false;
  pmB(R,H,o.w*0.84,0.05,o.d*0.84,o.mouth||'#3a0d14',0,jh,0,{shared:1});
  const jp=pmG(H,0,jh,-o.d/2);
  const jaw=pmB(R,jp,o.w*(o.jw||0.96),jh,o.d*0.96,o.jaw||o.col,0,-jh/2,o.d*0.48);
  const eyes=[];const E=o.eyes;
  if(E&&E.style!=='none'){for(const s of [-1,1]){
      const g=pmG(H,s*E.gap,jh+uh*(E.y!=null?E.y:0.72),o.d/2+(E.style==='googly'||E.style==='slit'?0.01:E.s*0.25));
      if(E.style==='slit'){pmB(R,g,E.s,E.s*0.12,0.03,'#141414',0,0,0,{shared:1});eyes.push({g,p:null,s:E.s});continue;}
      const fl=E.style==='googly';
      pmB(R,g,E.s,E.s,fl?0.04:E.s,E.white||'#f4f1e6',0,0,0,{shared:1});
      const p=pmB(R,g,E.s*(E.pw||0.42),E.s*(E.ph||0.42),fl?0.03:E.s*0.12,E.pupil||'#111111',0,0,(fl?0.02:E.s*0.5)+0.006,{shared:1});
      let cx=0,cy=0;if(E.crook){cx=(((PMR.n*7+(s>0?3:0))%5)-2)*0.07*E.s;cy=(((PMR.n*3+(s>0?1:4))%5)-2)*0.07*E.s;p.position.x=cx;p.position.y=cy;}
      if(E.style==='lid')pmB(R,g,E.s*1.08,E.s*0.55,E.s*1.08,o.lid||o.col,0,E.s*0.25,0.01);
      eyes.push({g,p,s:E.s,cx,cy,crook:!!E.crook});}}
  if(hrf)for(const E of eyes)E.g.visible=false;                      /* the painted face has its own eyes */
  return {H,up,jaw:jp,eyes,uh,jh};}
/* in Hyperreal a head may wear a packed face texture (o.hrFace; only Felt Dan has one today): P7's hrPgFace gives the texture
   (null in OG or when that id is not packed), and it goes on the head's +z side */
function pmHrFace(R,mesh,id){if(typeof hrPgFace!=='function')return false;let tx=null;try{tx=hrPgFace(id);}catch(err){tx=null;}if(!tx)return false;
  const fm=new THREE.MeshLambertMaterial({map:tx});R.pm.push(fm);const m=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;mesh.material=[m,m,m,m,fm,m];return true;}
/* felt mitt with a thumb and a thin black rod dangling from the wrist */
function pmMitt(R,par,s,col,x,y,z,rod){const g=pmG(par,x,y,z);pmB(R,g,0.16,0.19,0.12,col,0,0,0);pmB(R,g,0.06,0.09,0.07,col,s*0.09,0.03,0.02);
  if(rod!==false)pmB(R,g,0.025,0.6,0.025,'#141414',0,-0.38,0,{shared:1});return g;}
/* a walking leg pivot (hip at y), swung by pmAnimLegs */
function pmLeg(R,par,w,h,col,x,y,z,ph,amp,foot){const g=pmG(par,x,y,z);pmB(R,g,w,h,w*1.05,col,0,-h/2,0);if(foot)pmB(R,g,w*1.1,0.1,w*1.6,foot,0,-h+0.05,w*0.25);
  R.legs.push({g,ph:ph||0,ax:'x',base:0,amp:amp==null?0.55:amp});return g;}
const PM_FELT=['#4ca82b','#d9822b','#3f6fb5','#7a4fa0'];

/* ---- per-type builders: (R,G,o) -> parts. G is the engine's group (mob root). ---- */
var PM_RIGS={};
/* the Blank family: a blank felt hand puppet; 30% get two crooked glued googly eyes */
function pmBlankRig(R,G,o,lying,poss){const n=PMR.n++;const col=o.col||PM_FELT[n%4],googly=o.googly!=null?o.googly:((n*37+11)%10)<3;
  const root=pmG(G,0,0,0),body=pmG(root,0,0,0);
  pmB(R,body,0.46,0.52,0.4,col,0,0.26,0);
  pmB(R,body,0.5,0.06,0.44,'#1a1a1a',0,0.02,0,{shared:1});                 /* the sleeve's black cuff at the arm */
  const hd=pmHead(R,body,{w:0.62,h:0.52,d:0.54,col,y:0.5,eyes:lying?(googly?{s:0.16,gap:0.13,style:'slit'}:null):
    (googly?{s:poss?0.24:0.18,gap:0.14,style:'googly',crook:1,pw:0.4,ph:0.4}:(poss?{s:0.2,gap:0.14,style:'pp'}:null))});
  const mL=pmMitt(R,body,-1,col,-0.32,0.42,0.06),mR=pmMitt(R,body,1,col,0.32,0.42,0.06);
  let lump=null;if(poss)lump=pmB(R,body,0.22,0.2,0.18,col,0.06,0.32,0.17);
  if(lying){root.rotation.z=Math.PI/2;root.position.set(0.5,0.25,0);G.rotation.y=(n%3-1)*0.5;}
  return {root,body,head:hd.H,jaw:hd.jaw,eyes:hd.eyes,mitts:[mL,mR],lump,googly,col,bob:1};}
PM_RIGS.pgwhat=(R,G,o)=>pmBlankRig(R,G,o,false,false);
PM_RIGS.pghollow=(R,G,o)=>pmBlankRig(R,G,o,true,false);
PM_RIGS.pgposs=(R,G,o)=>{const p=pmBlankRig(R,G,o,false,true);p.bob=0;   /* the Hand's four fingertips poke out under the sleeve and run */
  for(let i=0;i<4;i++)pmLeg(R,p.root,0.08,0.4,'#e8b9a0',-0.15+i*0.1,0.4,(i%2)*0.06,i*1.7,0.9);
  p.body.position.y=0.38;return p;};
/* the Hands: a pale palm on four fingertip legs, thumb raised like a head, a black cuff stub at the wrist */
function pmHandRig(R,G,o){const sk=new THREE.MeshLambertMaterial({map:pmSkinM().map});R.pm.push(sk);   /* own copy: the hurt flash */
  const root=pmG(G,0,0,0),palm=pmG(root,0,0.42,0);
  pmB(R,palm,0.46,0.15,0.5,'#e8b9a0',0,0,0,{mat:sk});
  for(let i=0;i<4;i++)pmB(R,palm,0.07,0.05,0.07,'#d29a80',-0.15+i*0.1,0.09,0.2,{shared:1});   /* knuckle bumps */
  pmB(R,palm,0.36,0.22,0.12,'#141414',0,0.02,-0.3,{shared:1});                                  /* cuff stub */
  const fingers=[];
  for(let i=0;i<4;i++){const x=-0.17+i*0.113,f=pmG(palm,x,0,0.22);const a=pmG(f,0,0,0);
    pmB(R,a,0.08,0.08,0.26,'#e8b9a0',0,0,0.13,{mat:sk});const b=pmG(a,0,0,0.26);
    pmB(R,b,0.075,0.32,0.075,'#e8b9a0',0,-0.16,0,{mat:sk});pmB(R,b,0.06,0.03,0.06,'#c9b49a',0,-0.33,0.02,{shared:1});
    a.rotation.x=0.35;b.rotation.x=-0.35;f.rotation.y=(i-1.5)*0.32;fingers.push({f,a,b,ph:i*1.7});}
  const th=pmG(palm,0.23,0.05,0.12);pmB(R,th,0.09,0.3,0.09,'#e8b9a0',0,0.15,0,{mat:sk});pmB(R,th,0.07,0.04,0.03,'#efe2d0',0,0.27,0.05,{shared:1});
  th.rotation.z=-0.25;
  pmB(R,palm,0.47,0.02,0.2,'#f2e0d0',0,-0.08,0.1,{shared:1});
  return {root,palm,fingers,thumb:th,hand:1};}
PM_RIGS.pghand=pmHandRig;
/* the arm (tethers, the Chef's yank, P5's drag-under): segments + knuckles + a black cuff; pose with pmArmPose */
PM_RIGS.arm=(R,G,o)=>{const n=o.segs||6,sk=pmSkinM(),segs=[];
  for(let i=0;i<n;i++)segs.push(pmB(R,G,0.3,0.3,1,'#e8b9a0',0,0,0,{mat:sk}));
  const watch=pmB(R,G,0.34,0.34,0.12,'#2a1a10',0,0,0,{shared:1});
  const kn=[];for(let i=0;i<3;i++)kn.push(pmB(R,G,0.1,0.09,0.1,'#d29a80',0,0,0,{shared:1}));
  const cuff=pmB(R,G,0.62,0.16,0.62,'#141414',0,0.08,0,{shared:1});
  const len=o.len||3;pmArmPose({segs,watch,kn,cuff},0,0,0,0.6,len,0.3,false);
  return {segs,watch,kn,cuff,arm:1};};
/* pose an arm chain from the cuff (a) to the hand end (b): a bezier with an elbow bend (rigid = straight, straining) */
function pmArmPose(A,ax,ay,az,bx,by,bz,rigid){const S=A.segs,n=S.length,dx=bx-ax,dz=bz-az,d=Math.hypot(dx,dz);
  const cx=rigid?(ax+bx)/2:ax+dx*0.15,cz=rigid?(az+bz)/2:az+dz*0.15,cy=rigid?(ay+by)/2:Math.max(ay,by)+0.35+d*0.22;
  let px=ax,py=ay,pz=az;
  for(let i=0;i<n;i++){const u=(i+1)/n,v=1-u,qx=v*v*ax+2*v*u*cx+u*u*bx,qy=v*v*ay+2*v*u*cy+u*u*by,qz=v*v*az+2*v*u*cz+u*u*bz;
    pmSeg(S[i],px,py,pz,qx,qy,qz,0.3-i*0.012);px=qx;py=qy;pz=qz;}
  if(A.watch&&n>1){const w=S[n-2];A.watch.position.copy(w.position);A.watch.rotation.order='YXZ';A.watch.rotation.copy(w.rotation);A.watch.scale.set(0.36,0.36,0.14);}
  if(A.kn)for(let i=0;i<A.kn.length;i++)A.kn[i].position.set(bx+(i-1)*0.1,by+0.12,bz);
  if(A.cuff)A.cuff.position.set(ax,ay+0.08,az);}
/* Felt Dan: Dan's own box rig in burlap, white stitches, two sewn-on button eyes, a fist twice the normal size */
PM_RIGS.pgfeltdan=(R,G,o)=>{const g='#a87e52',dk='#7a5a36';const root=pmG(G,0,0,0);
  pmLeg(R,root,0.24,0.72,dk,-0.13,0.72,0,0,0.6);pmLeg(R,root,0.24,0.72,dk,0.13,0.72,0,Math.PI,0.6);
  pmB(R,root,0.5,0.68,0.27,g,0,1.06,0,{face:'pgfd_body',paint:(c,e)=>{e(0,0,16,16,g);for(let i=0;i<16;i+=3)e(8,i,1,2,'#f4f4ea');e(3,4,2,2,dk);}});
  const aL=pmG(root,-0.36,1.36,0),aR=pmG(root,0.36,1.36,0);
  pmB(R,aL,0.2,0.66,0.22,g,0,-0.3,0);pmB(R,aR,0.2,0.6,0.22,g,0,-0.27,0);
  const fist=pmB(R,aR,0.44,0.44,0.44,'#b88c5e',0,-0.74,0.04);
  const hp=pmG(root,0,1.4,0);let faceMat=null;
  if(typeof hrPgFace==='function'){try{const tx=hrPgFace('pgface_feltdan');if(tx)faceMat=new THREE.MeshLambertMaterial({map:tx});}catch(err){}}
  const head=faceMat?pmB(R,hp,0.5,0.5,0.5,g,0,0.25,0,{}):pmB(R,hp,0.5,0.5,0.5,g,0,0.25,0,{face:'pgfd_face',paint:(c,e)=>{e(0,0,16,16,g);
    for(let i=1;i<15;i+=3){e(i,1,2,1,'#f4f4ea');e(i,14,2,1,'#f4f4ea');}e(4,11,8,1,'#4a3018');e(3,10,1,1,'#4a3018');e(12,10,1,1,'#4a3018');}});
  if(faceMat){const m=head.material;head.material=[m,m,m,m,faceMat,m];R.pm.push(faceMat);}
  const eyes=[];for(const s of [-1,1]){const eg=pmG(hp,s*0.12,0.3,0.26);pmB(R,eg,0.15,0.15,0.03,'#2a1e14',0,0,0,{shared:1});   /* button eyes */
    for(const [hx,hy] of [[-1,-1],[1,-1],[-1,1],[1,1]])pmB(R,eg,0.025,0.025,0.01,'#7a6448',hx*0.03,hy*0.03,0.018,{shared:1});eyes.push({g:eg,p:null,s:0.15});}
  return {root,head:hp,eyes,armL:aL,armR:aR,fist,jaw:null};};
/* the Comic: a basset hound hand puppet on an arm: tan fur, long drooping ears, jowls, heavy lids, a black nose, a microphone */
PM_RIGS.pgcomic=(R,G,o)=>{const col='#c89a5a',dk='#7a4a26',root=pmG(G,0,0,0),body=pmG(root,0,0,0);
  pmB(R,body,0.5,0.54,0.42,col,0,0.27,0);pmB(R,body,0.54,0.06,0.46,'#1a1a1a',0,0.02,0,{shared:1});
  pmB(R,body,0.3,0.26,0.03,'#e8d2a8',0,0.32,0.215);                                                  /* pale chest */
  const hd=pmHead(R,body,{w:0.6,h:0.5,d:0.56,col,jaw:'#b88a4e',jw:1.02,y:0.54,eyes:{s:0.15,gap:0.13,style:'lid',y:0.74},lid:'#a8743e'});
  pmB(R,hd.H,0.3,0.12,0.16,col,0,0.25,0.34);                                                         /* muzzle */
  pmB(R,hd.H,0.14,0.08,0.06,'#141414',0,0.29,0.43,{shared:1});                                       /* nose */
  for(const s of [-1,1]){pmB(R,hd.H,0.07,0.5,0.2,dk,s*0.33,0.2,-0.02);                                /* long drooping ears */
    pmB(R,hd.jaw,0.12,0.14,0.18,col,s*0.18,-0.07,0.5);}                                              /* jowls */
  const mL=pmMitt(R,body,-1,col,-0.34,0.42,0.06),mR=pmMitt(R,body,1,col,0.34,0.42,0.06);
  pmB(R,mR,0.04,0.2,0.04,'#2a2a2e',0,0.12,0.08,{shared:1});pmB(R,mR,0.08,0.08,0.08,'#8a8a92',0,0.24,0.08,{shared:1});   /* the mic */
  return {root,body,head:hd.H,jaw:hd.jaw,eyes:hd.eyes,mitts:[mL,mR],bob:1};};
/* the Rubber Hen: a yellow rubber chicken, long neck, red comb, beak wide open */
PM_RIGS.pghen=(R,G,o)=>{const y='#f2d23c',root=pmG(G,0,0,0);
  pmLeg(R,root,0.04,0.24,'#e0901e',-0.08,0.24,0,0,0.8);pmLeg(R,root,0.04,0.24,'#e0901e',0.08,0.24,0,Math.PI,0.8);
  pmB(R,root,0.38,0.3,0.5,y,0,0.38,-0.02);
  const wL=pmG(root,-0.2,0.44,0),wR=pmG(root,0.2,0.44,0);pmB(R,wL,0.04,0.2,0.3,'#e8c430',0,-0.08,0);pmB(R,wR,0.04,0.2,0.3,'#e8c430',0,-0.08,0);
  const nk=pmG(root,0,0.5,0.2);pmB(R,nk,0.11,0.36,0.11,y,0,0.18,0);
  const hp=pmG(nk,0,0.38,0.02);pmB(R,hp,0.16,0.16,0.2,y,0,0.06,0);pmB(R,hp,0.04,0.12,0.16,'#d42a1e',0,0.19,-0.01,{shared:1});
  const jp=pmG(hp,0,0.05,0.1);pmB(R,hp,0.08,0.04,0.14,'#f08a1e',0,0.08,0.16,{shared:1});pmB(R,jp,0.08,0.04,0.12,'#f08a1e',0,-0.02,0.06,{shared:1});jp.rotation.x=0.55;
  pmB(R,hp,0.17,0.03,0.03,'#111111',0,0.1,0.05,{shared:1});
  return {root,neck:nk,head:hp,jaw:jp,wings:[wL,wR],eyes:[]};};
/* the Pelican: a white water bird on orange legs, black wingtips, a huge orange beak with a pouch; a fish in one wing */
PM_RIGS.pgpelican=(R,G,o)=>{const wh='#f2f2ec',or='#e8902a',root=pmG(G,0,0,0);
  pmLeg(R,root,0.08,0.62,or,-0.12,0.62,0,0,0.55,or);pmLeg(R,root,0.08,0.62,or,0.12,0.62,0,Math.PI,0.55,or);
  pmB(R,root,0.56,0.6,0.5,wh,0,0.98,-0.02);pmB(R,root,0.3,0.12,0.2,'#d8d8d0',0,0.78,-0.32);
  const aL=pmG(root,-0.32,1.24,0),aR=pmG(root,0.32,1.24,0);pmB(R,aL,0.1,0.6,0.36,wh,0,-0.26,-0.04);pmB(R,aR,0.1,0.6,0.36,wh,0,-0.26,-0.04);
  pmB(R,aL,0.11,0.16,0.3,'#2a2a30',0,-0.6,-0.06,{shared:1});pmB(R,aR,0.11,0.16,0.3,'#2a2a30',0,-0.6,-0.06,{shared:1});
  const fish=pmG(aR,0,-0.68,0.1);pmB(R,fish,0.08,0.16,0.4,'#7a9ab0',0,0,0.18,{shared:1});pmB(R,fish,0.04,0.2,0.1,'#5a7a90',0,0,-0.06,{shared:1});
  pmB(R,root,0.18,0.22,0.18,wh,0,1.36,0.06);
  const hd=pmHead(R,root,{w:0.3,h:0.3,d:0.32,col:wh,jaw:'#ece4c4',y:1.44,split:0.62,eyes:{s:0.08,gap:0.1,style:'pp',y:0.7}});
  pmB(R,hd.H,0.12,0.06,0.48,or,0,0.145,0.38,{shared:1});pmB(R,hd.H,0.08,0.06,0.05,'#c86a14',0,0.12,0.62,{shared:1});   /* beak, hooked tip */
  pmB(R,hd.jaw,0.11,0.12,0.46,'#f2c060',0,-0.06,0.54,{shared:1});                                                    /* the pouch */
  return {root,head:hd.H,jaw:hd.jaw,eyes:hd.eyes,armL:aL,armR:aR,fish};};
/* the Drummer: a charcoal gorilla (brow ridge, grey muzzle and chest, long arms); the chain and stake are scene props (pmChain) */
PM_RIGS.pgdrummer=(R,G,o)=>{const c='#3a3a40',sk='#6a6460',dk='#26262a',root=pmG(G,0,0,0);
  pmLeg(R,root,0.26,0.5,c,-0.18,0.5,0,0,0.6,dk);pmLeg(R,root,0.26,0.5,c,0.18,0.5,0,Math.PI,0.6,dk);
  pmB(R,root,0.76,0.72,0.5,c,0,0.88,0);pmB(R,root,0.44,0.4,0.03,sk,0,0.92,0.26);pmB(R,root,0.84,0.22,0.52,c,0,1.2,-0.02);
  const aL=pmG(root,-0.48,1.22,0),aR=pmG(root,0.48,1.22,0);pmB(R,aL,0.24,0.86,0.26,c,0,-0.4,0);pmB(R,aR,0.24,0.86,0.26,c,0,-0.4,0);
  pmB(R,aL,0.22,0.14,0.24,dk,0,-0.86,0,{shared:1});pmB(R,aR,0.22,0.14,0.24,dk,0,-0.86,0,{shared:1});
  const sL=pmG(aL,0,-0.84,0.06),sR=pmG(aR,0,-0.84,0.06);pmB(R,sL,0.05,0.05,0.5,'#d8b878',0,0,0.22,{shared:1});pmB(R,sR,0.05,0.05,0.5,'#d8b878',0,0,0.22,{shared:1});
  const hd=pmHead(R,root,{w:0.5,h:0.5,d:0.46,col:c,jaw:'#55504c',y:1.3,eyes:{s:0.1,gap:0.1,style:'pp',y:0.6,pupil:'#1a0e08'}});
  pmB(R,hd.H,0.56,0.08,0.12,dk,0,0.47,0.24,{shared:1});                                              /* brow ridge */
  pmB(R,hd.H,0.34,0.14,0.12,sk,0,0.27,0.27);                                                         /* muzzle */
  pmB(R,hd.H,0.05,0.04,0.02,'#141414',-0.05,0.3,0.335,{shared:1});pmB(R,hd.H,0.05,0.04,0.02,'#141414',0.05,0.3,0.335,{shared:1});
  for(let i=0;i<4;i++)pmB(R,hd.jaw,0.06,0.07,0.04,'#f4f0e0',-0.12+i*0.08,-0.01,0.46,{shared:1});
  return {root,head:hd.H,jaw:hd.jaw,eyes:hd.eyes,armL:aL,armR:aR,sticks:[sL,sR]};};
/* the Lab Rat (clones and the bench Lab Rat): a white rat in a lab coat: a pointed pink-nosed snout, round pink ears, a long pink
   tail and whiskers (pr.hair: they singe, P3's pmSinge) */
function pmRatRig(R,G,o,sc){const root=pmG(G,0,0,0);root.scale.set(sc,sc,sc);const fur='#f0eee8',pk='#e8a0a8';
  pmLeg(R,root,0.16,0.7,'#d8d0c0',-0.09,0.7,0,0,0.6,pk);pmLeg(R,root,0.16,0.7,'#d8d0c0',0.09,0.7,0,Math.PI,0.6,pk);
  pmB(R,root,0.38,0.62,0.26,'#f4f4f0',0,1.0,0);pmB(R,root,0.4,0.3,0.27,'#f4f4f0',0,0.62,0);
  pmB(R,root,0.06,0.1,0.02,'#3a6aa8',0.1,1.12,0.135,{shared:1});                                       /* a pen in the pocket */
  pmB(R,root,0.04,0.04,0.6,pk,0,0.55,-0.38,{shared:1,rx:-0.5});                                         /* tail */
  const aL=pmG(root,-0.25,1.26,0),aR=pmG(root,0.25,1.26,0);pmB(R,aL,0.13,0.56,0.15,'#f4f4f0',0,-0.26,0);pmB(R,aR,0.13,0.56,0.15,'#f4f4f0',0,-0.26,0);
  pmB(R,aL,0.11,0.11,0.11,pk,0,-0.58,0,{shared:1});pmB(R,aR,0.11,0.11,0.11,pk,0,-0.58,0,{shared:1});
  const hp=pmG(root,0,1.32,0);
  pmB(R,hp,0.32,0.3,0.32,fur,0,0.16,0,{face:'pg_labrat',paint:(c,e)=>{e(0,0,16,16,fur);e(6,13,4,1,'#c8b0b0');}});
  pmB(R,hp,0.2,0.16,0.16,fur,0,0.1,0.22);pmB(R,hp,0.1,0.1,0.1,fur,0,0.08,0.34);                     /* the snout */
  pmB(R,hp,0.06,0.05,0.04,'#e87a8a',0,0.1,0.4,{shared:1});pmB(R,hp,0.05,0.04,0.02,'#fffef0',0,0.02,0.3,{shared:1});
  for(const s of [-1,1]){pmB(R,hp,0.14,0.14,0.03,fur,s*0.14,0.36,-0.02);pmB(R,hp,0.09,0.09,0.01,pk,s*0.14,0.36,0,{shared:1});}
  const hair=pmG(hp,0,0.1,0.33);for(const s of [-1,1])for(const j of [-1,1])pmB(R,hair,0.012,0.22,0.012,'#ffffff',s*0.15,j*0.02,0,{rz:s*(Math.PI/2+j*0.2)});
  const eyes=[];for(const s of [-1,1]){const g=pmG(hp,s*0.09,0.22,0.165);pmB(R,g,0.08,0.08,0.06,'#f4f1e6',0,0,0,{shared:1});
    const p=pmB(R,g,0.045,0.045,0.02,'#141414',0,0,0.035,{shared:1});eyes.push({g,p,s:0.08});}
  return {root,head:hp,hair,eyes,armL:aL,armR:aR,jaw:null,sc};}
PM_RIGS.pgrat=(R,G,o)=>pmRatRig(R,G,o,1);
PM_RIGS.pgrat2=(R,G,o)=>pmRatRig(R,G,o,0.5);
PM_RIGS.pgrat4=(R,G,o)=>pmRatRig(R,G,o,0.25);
PM_RIGS.pgratb=(R,G,o)=>pmRatRig(R,G,o,1);
/* the Yeti: a 2.6 m brute in white fur with a blue-grey face, and a pair of filthy white human sneakers */
PM_RIGS.pgyeti=(R,G,o)=>{const c='#eceae4',f='#7a8aa0',root=pmG(G,0,0,0);
  const sn=(x,ph)=>{const g=pmLeg(R,root,0.36,0.48,c,x,0.6,0,ph,0.45);pmB(R,g,0.34,0.18,0.56,'#e8e6dc',0,-0.52,0.08,{shared:1});
    pmB(R,g,0.3,0.05,0.2,'#8a8a80',0,-0.44,0.2,{shared:1});pmB(R,g,0.35,0.05,0.57,'#5a5248',0,-0.6,0.08,{shared:1});return g;};
  const lL=sn(-0.28,0),lR=sn(0.28,Math.PI);
  pmB(R,root,1.18,1.3,0.86,c,0,1.25,0);for(let i=0;i<7;i++)pmB(R,root,0.16,0.3,0.1,'#d4d2ca',-0.5+i*0.165,0.62,0.42);
  const aL=pmG(root,-0.72,1.8,0),aR=pmG(root,0.72,1.8,0);pmB(R,aL,0.3,1.0,0.34,c,0,-0.46,0);pmB(R,aR,0.3,1.0,0.34,c,0,-0.46,0);
  pmB(R,aL,0.28,0.24,0.3,'#6a7a90',0,-1.02,0);pmB(R,aR,0.28,0.24,0.3,'#6a7a90',0,-1.02,0);
  const hd=pmHead(R,root,{w:1.0,h:0.8,d:0.78,col:c,jaw:'#d8d6ce',y:1.86,eyes:{s:0.09,gap:0.2,style:'pp',y:0.62,pupil:'#0a0a0a'}});
  pmB(R,hd.H,0.72,0.34,0.04,f,0,0.52,0.39);                                                           /* the blue-grey face */
  pmB(R,hd.H,0.9,0.1,0.1,'#cfccc4',0,0.72,0.4,{shared:1});pmB(R,hd.H,0.2,0.12,0.1,'#4a5568',0,0.44,0.43,{shared:1});
  for(let i=0;i<6;i++){pmB(R,hd.jaw,0.1,0.12,0.06,'#f2eedc',-0.3+i*0.12,0.04,0.78,{shared:1});pmB(R,hd.H,0.1,0.1,0.06,'#f2eedc',-0.3+i*0.12,0.27,0.39,{shared:1});}
  return {root,head:hd.H,jaw:hd.jaw,eyes:hd.eyes,armL:aL,armR:aR,legL:lL,legR:lR};};
/* the Daredevil: a yellow crash-test dummy in a white stunt suit and a red helmet, quadrant targets on his head and chest;
   his cannon is a scene prop */
function pmQuadPaint(c,e){e(0,0,16,16,'#f2c81e');e(0,0,8,8,'#141414');e(8,8,8,8,'#141414');}
PM_RIGS.pgdare=(R,G,o)=>{const y='#f2c81e',su='#f4f4f0',rd='#d42a2a',root=pmG(G,0,0,0);
  const lL=pmLeg(R,root,0.2,0.66,su,-0.12,0.66,0,0,0.6,'#2a2a2e'),lR=pmLeg(R,root,0.2,0.66,su,0.12,0.66,0,Math.PI,0.6,'#2a2a2e');
  pmB(R,root,0.5,0.62,0.3,su,0,0.98,0);pmB(R,root,0.08,0.63,0.31,rd,0,0.98,0,{shared:1});
  pmB(R,root,0.14,0.14,0.02,y,0.13,1.12,0.16,{shared:1,face:'pg_dummy_q',paint:pmQuadPaint});
  const aL=pmG(root,-0.34,1.24,0),aR=pmG(root,0.34,1.24,0);pmB(R,aL,0.17,0.6,0.2,su,0,-0.27,0);pmB(R,aR,0.17,0.6,0.2,su,0,-0.27,0);
  pmB(R,aL,0.13,0.13,0.13,y,0,-0.62,0);pmB(R,aR,0.13,0.13,0.13,y,0,-0.62,0);
  const hd=pmHead(R,root,{w:0.44,h:0.44,d:0.44,col:y,jaw:'#e0b818',y:1.3,eyes:{s:0.13,gap:0.1,style:'pp',y:0.58}});
  for(const s of [-1,1])pmB(R,hd.H,0.14,0.14,0.02,y,s*0.225,0.2,0,{shared:1,face:'pg_dummy_q',paint:pmQuadPaint,ry:s*Math.PI/2});
  pmB(R,hd.H,0.5,0.16,0.5,rd,0,0.46,-0.01,{shared:1});pmB(R,hd.H,0.08,0.17,0.51,su,0,0.46,-0.01,{shared:1});    /* the helmet */
  pmB(R,hd.H,0.5,0.1,0.36,rd,0,0.35,-0.08,{shared:1});pmB(R,hd.H,0.46,0.04,0.1,rd,0,0.39,0.26,{shared:1});
  return {root,head:hd.H,jaw:hd.jaw,eyes:hd.eyes,armL:aL,armR:aR,legL:lL,legR:lR};};
/* Thieving Frog: a small green felt frog, two cube eyes, a pink tongue box */
PM_RIGS.pgfrog=(R,G,o)=>{const c='#3f9a3a',root=pmG(G,0,0,0);
  pmB(R,root,0.36,0.17,0.38,c,0,0.12,-0.02);pmB(R,root,0.1,0.1,0.22,c,-0.17,0.06,-0.1);pmB(R,root,0.1,0.1,0.22,c,0.17,0.06,-0.1);
  const hd=pmHead(R,root,{w:0.32,h:0.14,d:0.18,col:c,y:0.14,z:0.17,jaw:'#2f7a2a'});
  const eyes=[];for(const s of [-1,1]){const g=pmG(root,s*0.09,0.32,0.18);pmB(R,g,0.1,0.1,0.1,'#f4f1e6',0,0,0,{shared:1});
    const p=pmB(R,g,0.04,0.05,0.02,'#111111',0,0,0.05,{shared:1});eyes.push({g,p,s:0.1});}
  const tg=pmG(root,0,0.16,0.28);const tongue=pmB(R,tg,0.06,0.03,1,'#ef6a8a',0,0,0.5,{shared:1});tg.scale.set(1,1,0.01);tg.visible=false;
  return {root,head:hd.H,jaw:hd.jaw,eyes,tongueG:tg,tongue};};
/* Chorus Pig: pink, a tiny curl tail */
PM_RIGS.pgpig=(R,G,o)=>{const c='#f2a6c1',root=pmG(G,0,0,0);
  for(const sx of [-1,1])for(const sz of [-1,1]){const g=pmG(root,sx*0.2,0.3,sz*0.32);pmB(R,g,0.16,0.3,0.16,'#e893b0',0,-0.15,0);R.legs.push({g,ph:sx*sz>0?0:Math.PI,ax:'x',base:0,amp:0.6});}
  pmB(R,root,0.6,0.44,0.9,c,0,0.52,0);
  const hp=pmG(root,0,0.6,0.5);pmB(R,hp,0.44,0.4,0.36,c,0,0,0.04);pmB(R,hp,0.2,0.14,0.07,'#e07a9a',0,-0.04,0.24,{shared:1});
  pmB(R,hp,0.03,0.04,0.02,'#7a2a3a',-0.04,-0.04,0.28,{shared:1});pmB(R,hp,0.03,0.04,0.02,'#7a2a3a',0.04,-0.04,0.28,{shared:1});
  pmB(R,hp,0.1,0.12,0.04,'#e893b0',-0.17,0.22,0,{rz:0.4});pmB(R,hp,0.1,0.12,0.04,'#e893b0',0.17,0.22,0,{rz:-0.4});
  const eyes=[];for(const s of [-1,1]){const g=pmG(hp,s*0.11,0.08,0.22);pmB(R,g,0.08,0.08,0.04,'#f4f1e6',0,0,0,{shared:1});
    const p=pmB(R,g,0.035,0.035,0.02,'#111111',0,0,0.025,{shared:1});eyes.push({g,p,s:0.08});}
  pmB(R,root,0.05,0.05,0.12,'#e893b0',0,0.66,-0.48,{rx:0.6});pmB(R,root,0.05,0.12,0.05,'#e893b0',0.03,0.72,-0.53);
  return {root,head:hp,eyes,jaw:null};};
/* the Cook: a green crocodile in a white jacket, an apron and a short paper cap (a long toothy snout, eyes on top of his head),
   with REAL pale human hands */
PM_RIGS.pgcook=(R,G,o)=>{const sk=pmSkinM(),cr='#4a8a3a',cd='#2f6a2a',tw='#f6f2e0',root=pmG(G,0,0,0);
  pmLeg(R,root,0.23,0.74,'#d8d4cc',-0.12,0.74,0,0,0.55,'#2a2a2a');pmLeg(R,root,0.23,0.74,'#d8d4cc',0.12,0.74,0,Math.PI,0.55,'#2a2a2a');
  pmB(R,root,0.56,0.7,0.34,'#f6f6f2',0,1.09,0);pmB(R,root,0.5,0.5,0.02,'#eceae0',0,1.0,0.18,{shared:1});
  const aL=pmG(root,-0.38,1.38,0),aR=pmG(root,0.38,1.38,0);pmB(R,aL,0.19,0.6,0.22,'#f6f6f2',0,-0.27,0);pmB(R,aR,0.19,0.6,0.22,'#f6f6f2',0,-0.27,0);
  for(const a of [aL,aR]){pmB(R,a,0.16,0.14,0.18,'#e8b9a0',0,-0.64,0.02,{mat:sk});for(let i=0;i<4;i++)pmB(R,a,0.035,0.12,0.035,'#e8b9a0',-0.05+i*0.034,-0.76,0.07,{mat:sk});}
  const cleaver=pmG(aR,0,-0.68,0.08);pmB(R,cleaver,0.04,0.06,0.2,'#5a3a1e',0,0,0.08,{shared:1});pmB(R,cleaver,0.02,0.2,0.26,'#c8ccd4',0,0.07,0.28,{shared:1});
  const ladle=pmG(aL,0,-0.68,0.08);pmB(R,ladle,0.03,0.03,0.5,'#b8bcc4',0,0,0.24,{shared:1});pmB(R,ladle,0.16,0.08,0.16,'#b8bcc4',0,-0.03,0.5,{shared:1});ladle.visible=false;
  const hd=pmHead(R,root,{w:0.44,h:0.36,d:0.42,col:cr,jaw:cd,y:1.44,split:0.62,eyes:{s:0.11,gap:0.11,style:'pp',y:1.05,pupil:'#1a1a0a',white:'#e8e0a0'}});
  for(const s of [-1,1])pmB(R,hd.H,0.14,0.07,0.14,cr,s*0.11,0.36,0.17);                              /* the eye bumps */
  pmB(R,hd.H,0.3,0.12,0.4,cr,0,0.197,0.4);                                                          /* the long snout */
  for(let i=0;i<5;i++)for(const s of [-1,1])pmB(R,hd.H,0.03,0.05,0.03,tw,s*0.13,0.125,0.26+i*0.075,{shared:1});
  pmB(R,hd.H,0.05,0.03,0.04,'#1a2a14',-0.06,0.265,0.57,{shared:1});pmB(R,hd.H,0.05,0.03,0.04,'#1a2a14',0.06,0.265,0.57,{shared:1});
  pmB(R,hd.jaw,0.28,0.08,0.4,cd,0,-0.04,0.61);for(let i=0;i<4;i++)for(const s of [-1,1])pmB(R,hd.jaw,0.03,0.04,0.03,tw,s*0.12,0.01,0.47+i*0.08,{shared:1});
  pmB(R,hd.H,0.36,0.12,0.32,'#fbfbf8',0,0.42,-0.04,{shared:1});pmB(R,hd.H,0.37,0.03,0.33,'#dcd8cc',0,0.37,-0.04,{shared:1});   /* paper cap */
  return {root,head:hd.H,jaw:hd.jaw,eyes:hd.eyes,armL:aL,armR:aR,cleaver,ladle};};
/* the Professor: a brown owl in a lab coat: big round eyes behind round glasses, a small hooked beak, ear tufts */
PM_RIGS.pgprof=(R,G,o)=>{const ow='#8a6440',root=pmG(G,0,0,0);
  pmLeg(R,root,0.2,0.68,'#3a3a46',-0.11,0.68,0,0,0.5,'#1a1a1a');pmLeg(R,root,0.2,0.68,'#3a3a46',0.11,0.68,0,Math.PI,0.5,'#1a1a1a');
  pmB(R,root,0.5,0.66,0.3,'#f4f4f0',0,1.0,0);pmB(R,root,0.12,0.3,0.02,'#8a2a2a',0,1.1,0.16,{shared:1});
  const aL=pmG(root,-0.33,1.27,0),aR=pmG(root,0.33,1.27,0);pmB(R,aL,0.17,0.58,0.2,'#f4f4f0',0,-0.26,0);pmB(R,aR,0.17,0.58,0.2,'#f4f4f0',0,-0.26,0);
  pmB(R,aL,0.12,0.12,0.12,'#7a5434',0,-0.6,0,{shared:1});pmB(R,aR,0.12,0.12,0.12,'#7a5434',0,-0.6,0,{shared:1});
  const hd=pmHead(R,root,{w:0.56,h:0.52,d:0.5,col:ow,jaw:'#7a5634',y:1.34,split:0.7,eyes:{s:0.16,gap:0.13,style:'pp',y:0.55,pupil:'#141008',white:'#f2d070'}});
  pmB(R,hd.H,0.5,0.3,0.02,'#d2b48c',0,0.36,0.255);                                                   /* the facial disc */
  for(const s of [-1,1]){const x=s*0.13;pmB(R,hd.H,0.2,0.025,0.02,'#2a2a2a',x,0.456,0.38,{shared:1});pmB(R,hd.H,0.2,0.025,0.02,'#2a2a2a',x,0.256,0.38,{shared:1});
    pmB(R,hd.H,0.025,0.2,0.02,'#2a2a2a',x-0.1,0.356,0.38,{shared:1});pmB(R,hd.H,0.025,0.2,0.02,'#2a2a2a',x+0.1,0.356,0.38,{shared:1});
    pmB(R,hd.H,0.1,0.16,0.1,ow,s*0.22,0.58,0,{rz:-s*0.3});}                                           /* glasses, ear tufts */
  pmB(R,hd.H,0.06,0.025,0.02,'#2a2a2a',0,0.37,0.38,{shared:1});
  pmB(R,hd.H,0.08,0.12,0.08,'#e0a030',0,0.22,0.3,{shared:1});pmB(R,hd.H,0.06,0.05,0.05,'#c88a20',0,0.15,0.33,{shared:1});   /* beak */
  return {root,head:hd.H,jaw:hd.jaw,eyes:hd.eyes,armL:aL,armR:aR};};
/* the Old Goats: two old billy goats in suits in a box seat, grey (Old Goat) and white (Older Goat), with horns and beards. A
   tip-over pose swings the seat back */
function pmGoatRig(R,G,o,w){const root=pmG(G,0,0,0),seat=pmG(root,0,0,-0.2);
  pmB(R,seat,0.7,0.12,0.6,'#6a1420',0,0.5,0.1,{shared:1});pmB(R,seat,0.7,0.9,0.12,'#7a1828',0,0.95,-0.22,{shared:1});
  const body=pmG(seat,0,0.56,0);const suit=w?'#5a4a36':'#3a3e52';
  pmB(R,body,0.5,0.62,0.3,suit,0,0.31,-0.05);pmB(R,body,0.14,0.36,0.02,w?'#e8e0c8':'#f0f0f0',0,0.38,0.11,{shared:1});
  const lg=pmG(body,0,0.02,0.1);pmB(R,lg,0.4,0.18,0.52,suit,0,0,0.2);pmB(R,lg,0.4,0.42,0.16,suit,0,-0.26,0.44);pmB(R,lg,0.4,0.08,0.24,'#1a1a1a',0,-0.48,0.5,{shared:1});
  const aL=pmG(body,-0.32,0.56,0),aR=pmG(body,0.32,0.56,0);pmB(R,aL,0.16,0.5,0.18,suit,0,-0.22,0.06,{rx:-0.5});pmB(R,aR,0.16,0.5,0.18,suit,0,-0.22,0.06,{rx:-0.5});
  const fur=w?'#e8e4dc':'#a8a49c',dk=w?'#c8c2b6':'#7e7a72',hn='#7a6a4a';
  const hd=pmHead(R,body,{w:0.4,h:0.42,d:0.44,col:fur,jaw:dk,y:0.64,split:0.64,eyes:{s:0.09,gap:0.1,style:'pp',y:0.66,pw:0.7,ph:0.22,pupil:'#2a1a08',white:'#e8c860'}});
  pmB(R,hd.H,0.24,0.11,0.26,fur,0,0.21,0.32);pmB(R,hd.H,0.12,0.05,0.03,'#4a3a3a',0,0.24,0.46,{shared:1});  /* long muzzle and nose */
  pmB(R,hd.jaw,0.12,w?0.26:0.2,0.1,w?'#f6f4ee':'#6e6a64',0,w?-0.17:-0.15,0.5);                         /* the beard */
  for(const s of [-1,1]){pmB(R,hd.H,0.07,0.07,0.26,hn,s*0.12,0.47,-0.12,{shared:1,rx:1.15});pmB(R,hd.H,0.06,0.06,0.16,hn,s*0.12,0.37,-0.26,{shared:1,rx:2.7});
    pmB(R,hd.H,0.18,0.05,0.08,fur,s*0.27,0.3,0,{rz:s*0.6});}                                          /* swept-back horns, floppy ears */
  return {root,seat,body,legsG:lg,head:hd.H,jaw:hd.jaw,eyes:hd.eyes,armL:aL,armR:aR};}
PM_RIGS.pgoldgoat=(R,G,o)=>pmGoatRig(R,G,o,false);
PM_RIGS.pgoldergoat=(R,G,o)=>pmGoatRig(R,G,o,true);
/* the Weatherman: a green parrot in a suit, with a pointer and a weather chart; fully professional */
PM_RIGS.pgweather=(R,G,o)=>{const gr='#2fa04a',root=pmG(G,0,0,0);
  pmLeg(R,root,0.22,0.72,'#2a3248',-0.12,0.72,0,0,0.5,'#141414');pmLeg(R,root,0.22,0.72,'#2a3248',0.12,0.72,0,Math.PI,0.5,'#141414');
  pmB(R,root,0.54,0.66,0.3,'#3a4a6a',0,1.05,0);pmB(R,root,0.1,0.34,0.02,'#a02020',0,1.12,0.16,{shared:1});pmB(R,root,0.22,0.14,0.02,'#f0f0f0',0,1.32,0.16,{shared:1});
  const aL=pmG(root,-0.35,1.33,0),aR=pmG(root,0.35,1.33,0);pmB(R,aL,0.17,0.6,0.2,'#3a4a6a',0,-0.27,0);pmB(R,aR,0.17,0.6,0.2,'#3a4a6a',0,-0.27,0);
  pmB(R,aL,0.12,0.12,0.12,gr,0,-0.62,0,{shared:1});pmB(R,aR,0.12,0.12,0.12,gr,0,-0.62,0,{shared:1});
  const pap=pmG(aL,0.1,-0.62,0.18);pmB(R,pap,0.42,0.32,0.02,'#f2f0e6',0,0.12,0,{shared:1,face:'pg_wx_chart',paint:(c,e)=>{e(0,0,16,16,'#e8f0f8');e(1,1,14,14,'#a8c8e8');
    e(3,3,4,4,'#f2c81e');e(2,4,1,2,'#f2c81e');e(4,2,2,1,'#f2c81e');e(8,6,6,3,'#f4f4f4');e(7,7,8,2,'#f4f4f4');for(let i=0;i<4;i++)e(8+i*2,10+(i%2),1,3,'#3a6ad8');}});
  const ptr=pmG(aR,0,-0.62,0.06);pmB(R,ptr,0.03,0.03,0.6,'#2a2a2a',0,0,0.28,{shared:1});pmB(R,ptr,0.04,0.04,0.05,'#d42a2a',0,0,0.6,{shared:1});
  const hd=pmHead(R,root,{w:0.42,h:0.46,d:0.42,col:gr,jaw:'#3a3a3a',y:1.38,split:0.7,eyes:{s:0.09,gap:0.15,style:'pp',y:0.6}});
  pmB(R,hd.H,0.36,0.2,0.02,'#f4f4f0',0,0.3,0.215);                                                    /* white cheeks */
  pmB(R,hd.H,0.16,0.14,0.14,'#e8dcb8',0,0.215,0.27,{shared:1});pmB(R,hd.H,0.12,0.1,0.08,'#d8c8a0',0,0.13,0.33,{shared:1});   /* the hooked beak */
  for(let i=0;i<3;i++)pmB(R,hd.H,0.06,0.14+i*0.03,0.06,i%2?'#e8c020':'#d42a2a',-0.06+i*0.06,0.52+i*0.01,-0.04,{shared:1,rx:-0.4});
  return {root,head:hd.H,jaw:hd.jaw,eyes:hd.eyes,armL:aL,armR:aR,paper:pap};};

/* ---- the mesh registry hook (P0-32 calls PREG.mesh[mt](G,mats,mt)) ---- */
function pmRigInto(kind,G,mats,o){const R={pm:[],own:{},legs:[]};const f=PM_RIGS[kind]||PM_RIGS.pgwhat;
  let parts={};try{parts=f(R,G,o||{})||{};}catch(err){mpFail('rig '+kind,err);}
  parts.kind=kind;G.userData.pr=parts;G.userData.pmats=R.pm;for(const m of R.pm)mats.push(m);
  return {G,legs:R.legs,mats};}
function pmRig(spec){spec=spec||{};const G=new THREE.Group(),mats=[];const r=pmRigInto(spec.kind||'pgwhat',G,mats,spec);r.parts=G.userData.pr;return r;}

/* ---- props (shared materials; a few at a time; never in e.mats) ---- */
function pmProp(kind){const R={pm:[],own:{},legs:[]},G=new THREE.Group(),S={shared:1};
  if(kind==='cannon'){const piv=pmG(G,0,0.55,0);pmB(R,piv,0.5,0.5,1.5,'#3a3a40',0,0,0.3,S);pmB(R,piv,0.6,0.6,0.16,'#2a2a2e',0,0,1.04,S);pmB(R,piv,0.12,0.12,0.12,'#c83a1e',0,0.3,-0.4,S);
    for(const s of [-1,1])pmB(R,G,0.12,0.6,0.6,'#5a3a1e',s*0.33,0.3,0,S);G.userData.piv=piv;}
  else if(kind==='kit'){pmB(R,G,0.8,0.5,0.8,'#c8202a',0,0.25,0,S);pmB(R,G,0.82,0.04,0.82,'#f0ece0',0,0.51,0,S);
    pmB(R,G,0.5,0.3,0.5,'#c8202a',-0.7,0.65,0.1,S);pmB(R,G,0.5,0.3,0.5,'#c8202a',0.7,0.65,0.1,S);
    const cy=pmG(G,0.6,1.2,-0.4);pmB(R,cy,0.03,1.2,0.03,'#9a9aa0',0,-0.6,0,S);pmB(R,cy,0.7,0.03,0.7,'#d8b040',0,0,0,S);G.userData.cym=cy;}
  else if(kind==='stake'){pmB(R,G,0.14,0.8,0.14,'#6a6a72',0,0.4,0,S);pmB(R,G,0.24,0.08,0.24,'#4a4a52',0,0.8,0,S);}
  else if(kind==='desk'){pmB(R,G,1.6,0.8,0.7,'#6a4426',0,0.4,0,S);pmB(R,G,1.64,0.06,0.74,'#7a5430',0,0.83,0,S);
    pmB(R,G,0.6,0.5,0.03,'#2a3248',0,1.1,-0.33,{shared:1,face:'pg_wx_sign',paint:(c,e)=>{e(0,0,16,16,'#2a3248');e(1,5,14,6,'#d0d8e8');e(3,6,3,3,'#f2c81e');e(8,7,6,2,'#a8b0c0');e(9,6,4,1,'#a8b0c0');}});}
  else if(kind==='safe'){pmB(R,G,1.1,1.1,1.1,'#3a3e44',0,0.55,0,S);pmB(R,G,0.3,0.3,0.06,'#c8c8c8',0.2,0.6,0.56,S);pmB(R,G,0.06,0.3,0.06,'#a0a0a0',-0.35,0.55,0.56,S);}
  else if(kind==='piano'){pmB(R,G,1.6,1.3,0.7,'#141414',0,0.65,0,S);pmB(R,G,1.5,0.1,0.3,'#f4f0e6',0,0.8,0.48,S);for(let i=0;i<8;i++)pmB(R,G,0.06,0.06,0.18,'#141414',-0.6+i*0.17,0.86,0.5,S);}
  else if(kind==='sandbag'){pmB(R,G,0.8,0.7,0.6,'#b8a070',0,0.35,0,S);pmB(R,G,0.3,0.15,0.3,'#8a7450',0,0.75,0,S);}
  else if(kind==='tomato'){pmB(R,G,0.22,0.2,0.22,'#d42a1e',0,0,0,S);pmB(R,G,0.1,0.04,0.1,'#3a8a2a',0,0.11,0,S);}
  else if(kind==='fish'){pmB(R,G,0.08,0.16,0.42,'#7a9ab0',0,0,0,S);pmB(R,G,0.04,0.22,0.1,'#5a7a90',0,0,-0.24,S);}
  else if(kind==='splat'){pmB(R,G,0.7,0.03,0.7,'#c81a12',0,0,0,S);for(let i=0;i<4;i++){const a=i*1.6;pmB(R,G,0.16,0.03,0.16,'#d42a1e',Math.sin(a)*0.45,0,Math.cos(a)*0.45,S);}}
  else if(kind==='shadow'){const m=new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:0.55,depthWrite:false});
    const s=new THREE.Mesh(pmGeo(),m);s.scale.set(1,0.02,1);G.add(s);G.userData.sm=m;}
  else if(kind==='kitchenArm'){const a=pmRig({kind:'arm',segs:4,len:2.4});G.add(a.G);G.userData.arm=a.parts;}
  return G;}

/* ---- per-frame rig animation helpers (called from P3 brains; every one checks the parts exist: a Hyperreal body has none) ---- */
/* pupils: lock (track hard) or wander; target point in world space */
function pmEyes(e,pr,tx,ty,tz,lock,dt){if(!pr||!pr.eyes||!pr.eyes.length)return;
  const yw=e.yaw||0,cy=Math.cos(yw),sy=Math.sin(yw);let lx=0,ly=0;
  if(tx!=null){const dx=tx-e.x,dy=ty-(e.y+(e.h||1)*0.8),dz=tz-e.z,l=Math.hypot(dx,dy,dz)||1;lx=(dx*cy-dz*sy)/l;ly=dy/l;}
  else{const t=(MP.clock||0)+(e.seed||0);lx=Math.sin(t*0.7)*0.6;ly=Math.sin(t*0.43)*0.3;}
  const k=lock?1:0.55;
  for(const E of pr.eyes){if(!E.p)continue;const tgx=(E.crook&&!lock?E.cx:0)+clamp(lx,-1,1)*E.s*0.26*k,tgy=(E.crook&&!lock?E.cy:0)+clamp(ly,-1,1)*E.s*0.26*k;
    const r=Math.min(1,dt*(lock?18:6));E.p.position.x+=(tgx-E.p.position.x)*r;E.p.position.y+=(tgy-E.p.position.y)*r;
    const ps=lock?0.78:1;E.p.scale.x+=(E.s*0.42*ps-E.p.scale.x)*r;E.p.scale.y+=(E.s*0.42*ps-E.p.scale.y)*r;}}
/* jaw: open 0..1 */
function pmJaw(pr,open,dt){if(!pr||!pr.jaw)return;const t=-clamp(open,0,1.2)*0.75;pr.jaw.rotation.x+=(t-pr.jaw.rotation.x)*Math.min(1,dt*20);}
/* walking legs (our own wrappers; the generic brain never sees custom-brain mobs) */
function pmAnimLegs(e,dt,sp){if(!e.legs||!e.legs.length)return;e.anim=(e.anim||0)+dt*sp*3.2;const k=Math.min(1,sp);
  for(const L of e.legs){const sw=Math.sin(e.anim+L.ph)*L.amp*k;if(L.ax==='x')L.g.rotation.x=sw;else L.g.rotation.z=L.base+sw*0.6;}}

/* ---- tether arms in the scene (one per tethered puppet): visible cap 24, segments hidden past 32 m (the cuff stays) ---- */
function pmArmFor(e){if(e.parmG)return e.parmG;const r=pmRig({kind:'arm',segs:6});r.G.userData.parts=r.parts;pmAdd(r.G);e.parmG=r.G;PMR.arms.push(e);return r.G;}
function pmArmDrop(e){if(!e.parmG)return;pmDel(e.parmG);e.parmG=null;}
/* withdraw: the arm slides down its hole (with the puppet, if it is still on it) over dur seconds, then goes */
function pmArmsTick(dt){if(!PMR.arms.length)return;
  const L=[];for(let i=PMR.arms.length-1;i>=0;i--){const e=PMR.arms[i];
    if(e.pwd!=null){e.pwd-=dt;const G=e.parmG;if(G)G.position.y=-(1-Math.max(0,e.pwd)/0.7)*3.2;
      if(e.pwd<=0){pmArmDrop(e);PMR.arms.splice(i,1);if(e.pwdKill&&!e.dead){const f=e.pwdKill;e.pwdKill=null;f();}}continue;}
    if(e.dead){e.pwd=0.7;continue;}
    L.push(e);}
  if(!P)return;
  for(const e of L)e._ad=Math.hypot(e.x-P.x,e.z-P.z);
  L.sort((a,b)=>a._ad-b._ad);
  for(let i=0;i<L.length;i++){const e=L[i],G=e.parmG;if(!G)continue;G.visible=i<PMR.armVis&&!e.hrM;const far=e._ad>PMR.armFar,A=G.userData.parts;
    if(A)for(const s of A.segs)s.visible=!far;if(A&&A.watch)A.watch.visible=!far;}}

/* the OG rigs of every P3 type (P0-32 asks PREG.mesh first; P7's Hyperreal bodies come before it for the types it models) */
for(const k in PM_NAMES)PREG.mesh[k]=(G,mats,mt)=>pmRigInto(mt,G,mats);
