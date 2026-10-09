/* ---- PART 57: m3_c_rig.js ---- */
/* ===================================================================== */
/* PART 57 m3 · file c: mg3Rig (plan 5.3; bible 5.3). One skeleton, two */
/* skins: M4 calls mg3Rig({kind,skin:'hr',mats,tess:2}). kind 'boss' and */
/* 'effigy' carry EXACTLY ONE PointLight (userData.mgLight=1, a direct   */
/* child of the root, moved between the chest, mouth, throat and belly); */
/* 'proxy' (figurines) carries none. update(dt,s) reads MGA only (s).    */
/* ===================================================================== */
var MG3C={R1:[1,0.353,0.102],R2:[0.816,0.063,0.102],R3:[1,0.902,0.627],
  TEL:{white:[1,1,1],red:[1,0.12,0.06],violet:[0.7,0.3,1],gold:[1,0.78,0.25]}};
function mg3Rim(m,key){m.userData=m.userData||{};const u=m.userData.mgRim={value:new THREE.Color(0,0,0)};
  m.onBeforeCompile=function(sh){sh.uniforms.uMgRim=u;sh.fragmentShader='uniform vec3 uMgRim;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',
    '#include <emissivemap_fragment>\n totalEmissiveRadiance+=uMgRim*pow(1.0-clamp(dot(normalize(normal),normalize(vViewPosition)),0.0,1.0),2.6);');};
  m.customProgramCacheKey=function(){return 'mg3rim_'+(key||'');};return m;}
function mg3Mats(o){const T=mg3TexAll(),L=T.list,ext=(o&&o.skin==='hr'&&o.mats)||{},S=THREE.MeshStandardMaterial;
  const hide=()=>mg3Rim(new S({color:0xffffff,vertexColors:true,map:L.hide.t,normalMap:L.hideN.t,roughnessMap:L.hideR.t,emissive:new THREE.Color(1,0.35,0.1),emissiveMap:L.hideE.t,
    emissiveIntensity:1.0,roughness:0.9,metalness:0.04,normalScale:new THREE.Vector2(0.85,0.85)}),'hide');
  const M={
    hide:ext.hide||hide(),handL:ext.handL||ext.hide||hide(),handR:ext.handR||ext.hide||hide(),
    brow:ext.brow||(ext.hide?ext.hide:mg3Rim(new S({color:0xffffff,vertexColors:true,map:L.bone.t,normalMap:L.hideN.t,roughnessMap:L.hideR.t,emissive:new THREE.Color(1,0.35,0.1),emissiveMap:L.hideE.t,emissiveIntensity:0.9,roughness:0.7,metalness:0.02,normalScale:new THREE.Vector2(0.8,0.8)}),'bone')),
    horn:ext.horn||new S({color:0xd8c8a8,vertexColors:true,map:L.horn.t,roughness:0.55,metalness:0.05}),
    flesh:ext.flesh||new S({color:0xd8c4c4,vertexColors:true,map:L.flesh.t,roughness:0.38,metalness:0.0,emissive:new THREE.Color(0.22,0.03,0.02),emissiveIntensity:0.25,side:THREE.DoubleSide}),
    enamel:ext.enamel||new S({color:0xfff2dc,vertexColors:true,roughness:0.28,metalness:0.02}),
    eye:ext.eye||new S({color:0x000000,emissive:new THREE.Color(1,1,1),emissiveMap:mg3EyeTex('amber'),emissiveIntensity:1.0,roughness:0.15}),
    handEye:ext.handEye||new S({color:0xffffff,map:mg3EyeTex('human'),emissive:new THREE.Color(0,0,0),roughness:0.2}),
    crust:ext.crust||new S({color:0xffffff,map:L.crust.t,normalMap:L.crustN.t,emissive:new THREE.Color(1,0.45,0.1),emissiveMap:L.crust.t,emissiveIntensity:0.9,roughness:0.75}),
    glow:new THREE.MeshBasicMaterial({color:0xff8a2a,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending,depthWrite:false}),
    atlas:ext.strata||(typeof matOp!=='undefined'&&matOp?matOp:new THREE.MeshLambertMaterial({vertexColors:true})),
    leaves:ext.leaves||(typeof matCut!=='undefined'&&matCut?matCut:new THREE.MeshLambertMaterial({vertexColors:true})),
    win:new THREE.MeshBasicMaterial({color:0xffd27a}),
    sun:new THREE.MeshBasicMaterial({color:0xfff2c0,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),
    ray:new THREE.MeshBasicMaterial({color:0xffe6a0,map:mg3RayTex(),transparent:true,opacity:0.0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),
    drool:ext.drool||ext.flesh||new S({color:0xe8d6a8,roughness:0.08,metalness:0.0,transparent:true,opacity:0.78,emissive:new THREE.Color(0.25,0.12,0.02)}),
    cubeGlow:new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}),
    flame:new THREE.SpriteMaterial({map:mg3Soft(),color:0xff8a20,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false})};
  if(!M.brow)M.brow=M.hide;for(const k in M){const m=M[k];if(m&&!(ext[k]&&ext[k]===m)&&m!==(typeof matOp!=='undefined'?matOp:0)&&m!==(typeof matCut!=='undefined'?matCut:0)){m.userData=m.userData||{};m.userData.mg3own=1;}}return M;}
function mg3RayTex(){if(MG3.geo.rayT)return MG3.geo.rayT;const c=mg3Cv(32,128),g=c.getContext('2d');const gr=g.createLinearGradient?g.createLinearGradient(0,0,0,128):null;
  if(gr){gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.25,'rgba(255,240,200,0.5)');gr.addColorStop(1,'rgba(255,220,160,0)');g.fillStyle=gr;g.fillRect(0,0,32,128);
    const hz=g.createLinearGradient(0,0,32,0);hz.addColorStop(0,'rgba(0,0,0,1)');hz.addColorStop(0.5,'rgba(0,0,0,0)');hz.addColorStop(1,'rgba(0,0,0,1)');g.globalCompositeOperation='destination-out';g.fillStyle=hz;g.fillRect(0,0,32,128);}
  MG3.geo.rayT=new THREE.CanvasTexture(c);return MG3.geo.rayT;}
/* the shared static part geometry for a detail level (built once; the boss is rebuilt on every spawn, the geometry is not) */
function mg3Parts(q){const k='p'+q;if(MG3.geo[k])return MG3.geo[k];const G={},g=mg3Geo;
  G.pelvis=g(mg3PPelvis(q));G.belly=g(mg3PBelly(q));G.chest=g(mg3PChest(q));G.delt=g(mg3PDeltoid(q));G.upper=g(mg3PUpper(q));G.fore=g(mg3PFore(q));
  G.palm=g(mg3PPalm(q));G.thigh=g(mg3PThigh(q));G.glute=g(mg3Ell(1.55,1.4,1.6,Math.round(12*q),Math.round(18*q)));G.shin=g(mg3PShin(q));G.foot=g(mg3PFoot(q));
  G.skull=g(mg3PSkull(q));G.palate=g(mg3PPalate(q));G.throat=g(mg3PThroat(q));G.mandL=g(mg3PMand(q,1));G.mandR=g(mg3PMand(q,-1));
  const hl=mg3PHorn(q,1),hr=mg3PHorn(q,-1);G.horns=g(mg3Join([{g:hl.g},{g:hr.g}]));G.hornL=hl;G.hornR=hr;
  G.teethU=g(mg3TeethUpper(q));G.teethLL=g(mg3TeethLower(q,1));G.teethLR=g(mg3TeethLower(q,-1));
  G.eyeBig=g(mg3PEye(0.42,q));G.eyeBrow=g(mg3PEye(0.19,q));G.handEye=g(mg3PEye(0.5,q));
  const lid=mg3Ell(0.62,0.62,0.4,Math.round(8*q)+2,Math.round(14*q)+2,(t,a)=>1);for(let i=0;i<lid.pos.length;i+=3)if(lid.pos[i+1]<0)lid.pos[i+1]*=0.05;G.lid=g(lid);
  const cr=mg3PCrust(q);G.crustD=cr;G.crust=g(cr);G.glow=g(mg3Ell(2.05,1.6,1.15,Math.round(12*q),Math.round(18*q)));
  const S=mg3StrataSpec();G.strata=g(mg3Cubes(S.cubes));G.leaves=g(mg3Cubes(S.leaves));
  G.cube=g(mg3Cubes([{id:B.BEDROCK,x:0,y:0,z:0,s:1.6}]));G.cubeGlow=g(mg3BoxG(1.72,1.72,1.72));
  G.rail=g(mg3RailStrip(hr.pts));
  G.headCube=g(mg3BoxG(0.5,0.5,0.5));
  MG3.geo[k]=G;return G;}
/* a minecart rail bent round the right horn (the real rail tile, atlas UVs) */
function mg3RailStrip(pts){const id=(typeof B.RAIL==='number'?B.RAIL:68),d=DEFS[id];const U=d&&d._t?tileUV(d._t.top):[0,0,1,1];const pos=[],nrm=[],uv=[],col=[],idx=[];const N=10;
  for(let i=0;i<=N;i++){const t=0.2+i/N*0.32,p=mg3Cr(pts,t),p2=mg3Cr(pts,t+0.01),T=mg3Nz([p2[0]-p[0],p2[1]-p[1],p2[2]-p[2]]),side=mg3Nz(mg3X(T,[0,1,0])),up=mg3X(side,T);
    const r=mg3Lp(0.88,0.12,Math.pow(t,0.85))*1.18+0.08,tw=i*0.55;const ox=up[0]*Math.cos(tw)+side[0]*Math.sin(tw),oy=up[1]*Math.cos(tw)+side[1]*Math.sin(tw),oz=up[2]*Math.cos(tw)+side[2]*Math.sin(tw);
    for(const s of [-1,1]){const w=0.45;pos.push(p[0]+ox*r+T[0]*s*w,p[1]+oy*r+T[1]*s*w,p[2]+oz*r+T[2]*s*w);nrm.push(ox,oy,oz);uv.push(s<0?U[0]:U[2],mg3Lp(U[1],U[3],(i%2)));col.push(0.9,0.9,0.9);}}
  for(let i=0;i<N;i++){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3,a,a+1,a+2,a+1,a+3,a+2);}
  return {pos:new Float32Array(pos),nrm:new Float32Array(nrm),uv:new Float32Array(uv),col:new Float32Array(col),idx};}
function mg3Grp(name,p,parent,ord){const g=new THREE.Group();g.name=name;if(p)g.position.set(p[0],p[1],p[2]);if(ord)g.rotation.order=ord;if(parent)parent.add(g);return g;}
function mg3Mesh(geo,mat,parent,name){const m=new THREE.Mesh(geo,mat);m.name=name||'';if(parent)parent.add(m);return m;}
/* ---- THE RIG ---- */
function mg3Rig(o){o=o||{};const kind=o.kind||'boss';if(kind==='proxy')return mg3Proxy(o);
  const q=o._q||(o.tess===2?1.4:1),GP=o._GP||mg3Parts(q),M=o._M||mg3Mats(o),P=MG3P,J={},parts={},sweeps=[];
  const root=mg3Grp('malgorath_'+kind,null,null);J.root=root;
  const pelvis=J.pelvis=mg3Grp('pelvis',P.pelvis,root),spine0=J.spine0=mg3Grp('spine0',P.spine0,pelvis),spine1=J.spine1=mg3Grp('spine1',P.spine1,spine0);
  parts.pelvis=mg3Mesh(GP.pelvis,M.hide,pelvis,'pelvis');parts.belly=mg3Mesh(GP.belly,M.hide,spine0,'belly');parts.chest=mg3Mesh(GP.chest,M.hide,spine1,'chest');
  /* legs: hip -> knee -> hock -> hoof, glute half-angle groups */
  for(const s of [1,-1]){const L=s>0?'L':'R';
    const hip=J['hip'+L]=mg3Grp('hip'+L,[s*P.hip[0],P.hip[1],P.hip[2]],pelvis),gl=J['glute'+L]=mg3Grp('glute'+L,[s*P.hip[0],P.hip[1],P.hip[2]],pelvis);
    parts['glute'+L]=mg3Mesh(GP.glute,M.hide,gl,'glute'+L);parts['glute'+L].position.set(s*0.35,0.25,-0.55);
    parts['thigh'+L]=mg3Mesh(GP.thigh,M.hide,hip,'thigh'+L);
    const knee=J['knee'+L]=mg3Grp('knee'+L,[0,-P.thigh,0],hip);parts['shin'+L]=mg3Mesh(GP.shin,M.hide,knee,'shin'+L);
    const hock=J['hock'+L]=mg3Grp('hock'+L,[0,-P.shin,0],knee);parts['foot'+L]=mg3Mesh(GP.foot,M.hide,hock,'foot'+L);
    J['hoof'+L]=mg3Grp('hoof'+L,[0,-P.foot,0.55],hock);}
  /* arms: shoulder (+ deltoid half group) -> elbow -> wrist -> 4 fingers x 3; the lidded hand-eye on the back of the hand */
  for(const s of [1,-1]){const L=s>0?'L':'R',hm=s>0?M.handL:M.handR;
    const sh=J['shoulder'+L]=mg3Grp('shoulder'+L,[s*P.shoulder[0],P.shoulder[1],P.shoulder[2]],spine1),dl=J['delt'+L]=mg3Grp('delt'+L,[s*P.shoulder[0],P.shoulder[1],P.shoulder[2]],spine1);
    parts['delt'+L]=mg3Mesh(GP.delt,M.hide,dl,'delt'+L);parts['delt'+L].position.set(s*0.35,-0.35,-0.1);
    parts['upper'+L]=mg3Mesh(GP.upper,M.hide,sh,'upper'+L);
    const el=J['elbow'+L]=mg3Grp('elbow'+L,[0,-P.upper,0],sh);parts['fore'+L]=mg3Mesh(GP.fore,M.hide,el,'fore'+L);
    const wr=J['wrist'+L]=mg3Grp('wrist'+L,[0,-P.fore,0],el);parts['palm'+L]=mg3Mesh(GP.palm,hm,wr,'palm'+L);
    const ey=J['handEye'+L]=mg3Grp('handEye'+L,[0,-0.75,0.72],wr);parts['handEye'+L]=mg3Mesh(GP.handEye,M.handEye,ey,'handEye'+L);parts['handEye'+L].rotation.x=-0.2;
    const l1=mg3Mesh(GP.lid,hm,ey,'lidA'+L),l2=mg3Mesh(GP.lid,hm,ey,'lidB'+L);l2.rotation.z=Math.PI;J['lidA'+L]=l1;J['lidB'+L]=l2;
    for(let f=0;f<4;f++){const fx=[-1.17,-0.39,0.39,1.17][f]*s,ch=[];let par=wr,pp=[fx,-P.palm,0.12];
      for(let k=0;k<3;k++){const j=mg3Grp('f'+L+f+k,pp,par);ch.push(j);par=j;pp=[0,-P.finger[k],0];}
      J['f'+L+f]=ch;const tipJ=mg3Grp('f'+L+f+'t',[0,-P.finger[2],0],ch[2]);ch.push(tipJ);
      const sw=mg3Sweep({joints:[ch[0],ch[1],ch[2],tipJ],dir:[0,-1,0],up:[0,0,1],n:4,m:Math.round(10*q),tipLen:P.claw,tipN:4,uvs:0.6,uround:1,
        prof:(t,a)=>{const cl=t>0.75;const r=cl?mg3Lp(0.25,0.015,Math.pow((t-0.75)/0.25,0.8)):mg3Lp(0.4,0.27,t/0.75)*(1+0.14*Math.pow(Math.abs(Math.sin(t/0.75*Math.PI*1.5)),4));
          const hook=cl?-0.12*Math.pow((t-0.75)/0.25,2):0;return [Math.cos(a)*r*1.05,Math.sin(a)*r*0.9+hook];},
        col:(t)=>{const cl=mg3Sm(0.7,0.8,t),kn=mg3Bump(t*Math.PI*2,Math.PI*0.66,0.3)*0.3;return [mg3Lp(1+kn,0.32,cl),mg3Lp(1+kn,0.28,cl),mg3Lp(1+kn,0.25,cl)];}});
      sw.mesh=mg3Mesh(sw.geo,hm,wr,'finger'+L+f);sw.mesh.frustumCulled=false;sweeps.push(sw);}}
  /* the neck: three overlapping segments under one skin, into the head */
  const n0=J.neck0=mg3Grp('neck0',P.neck0,spine1),n1=J.neck1=mg3Grp('neck1',[0,0.18,P.neckS],n0),n2=J.neck2=mg3Grp('neck2',[0,0.1,P.neckS],n1);
  const head=J.head=mg3Grp('head',P.head,n2);J.jawU=head;
  {const sw=mg3Sweep({joints:[n0,n1,n2,head],dir:[0,0,1],up:[0,1,0],n:Math.round(6*q),m:Math.round(26*q),uvs:4,uround:3,
     prof:(t,a)=>{const r=mg3Lp(2.4,1.6,t),dew=mg3Bump(a,-Math.PI/2,0.9)*0.4*mg3Sm(0.3,0.9,t),nape=mg3Bump(a,Math.PI/2,0.6)*0.35,cord=(mg3Bump(a,-Math.PI*0.25,0.25)+mg3Bump(a,-Math.PI*0.75,0.25))*0.2;return mg3Se(a,r*1.05+cord,r*1.05+cord,r*0.95+nape,r*0.92+dew,2.2);},
     col:(t,a)=>{const u=mg3Bump(a,-Math.PI/2,0.8);return [1-0.0+u*0.22,1+u*0.18,1+u*0.12];}});
   sw.mesh=mg3Mesh(sw.geo,M.hide,spine1,'neck');sw.mesh.frustumCulled=false;sweeps.push(sw);}
  parts.skull=mg3Mesh(GP.skull,M.brow,head,'skull');parts.palate=mg3Mesh(GP.palate,M.flesh,head,'palate');parts.throat=mg3Mesh(GP.throat,M.flesh,head,'throat');
  parts.horns=mg3Mesh(GP.horns,M.horn,head,'horns');parts.rail=mg3Mesh(GP.rail,M.atlas,head,'rail');parts.teethU=mg3Mesh(GP.teethU,M.enamel,head,'teethU');
  J.hornL=mg3Grp('hornL',GP.hornL.tip,head);J.hornR=mg3Grp('hornR',GP.hornR.tip,head);
  const sp=J.spike=mg3Grp('spike',[0,0,0],J.hornL);{const d=GP.hornL.dir;sp.rotation.set(Math.atan2(-d[1],Math.hypot(d[0],d[2]))*0+0,0,0);}J.spikeDir=GP.hornL.dir;
  for(const s of [1,-1]){const L=s>0?'L':'R';const md=J['mand'+L]=mg3Grp('mand'+L,[s*P.hingeL[0],P.hingeL[1],P.hingeL[2]],head,'YXZ');
    parts['mand'+L]=mg3Mesh(s>0?GP.mandL:GP.mandR,M.brow,md,'mand'+L);parts['teethL'+L]=mg3Mesh(s>0?GP.teethLL:GP.teethLR,M.enamel,md,'teethL'+L);}
  /* the six eyes (two big molten eyes under the brow shelf, four brow eyes that blink out of sync) */
  const eyes=[];const ep=[[P.eyeBig[0],P.eyeBig[1],P.eyeBig[2],1],[-P.eyeBig[0],P.eyeBig[1],P.eyeBig[2],1]];for(const b of P.eyeBrow){ep.push([b[0],b[1],b[2],0],[-b[0],b[1],b[2],0]);}
  for(let i=0;i<6;i++){const e=ep[i],g=mg3Grp('eye'+i,[e[0],e[1],e[2]-(e[3]?0.12:0.04)],head);g.rotation.y=Math.sign(e[0])*(e[3]?0.42:0.25);g.rotation.x=e[3]?0.12:-0.1;
    const m=mg3Mesh(e[3]?GP.eyeBig:GP.eyeBrow,M.eye,g,'eye'+i);eyes.push({g,m,big:!!e[3],next:0,bl:0});J['eye'+i]=g;}
  /* the mouth set (bible 5.11): palate + throat (static), the floor and the two cheek walls (rebuilt every frame from the jaw), the tongue */
  const mouth=mg3MouthSet(J,M,q,head);sweeps.push(...mouth.sweeps);Object.assign(parts,mouth.parts);
  {const dr=mg3DroolBuild(J,M,head);sweeps.push(dr.sweep);parts.droolL=dr.parts[0];parts.droolR=dr.parts[1];}
  {const t0=J.tongue0=mg3Grp('tongue0',P.tongue0,head),ch=[t0];let par=t0;for(let k=1;k<=P.tongueN;k++){const j=mg3Grp('tongue'+k,[0,0,P.tongueL/P.tongueN],par);ch.push(j);par=j;J['tongue'+k]=j;}
   const sw=mg3Sweep({joints:ch,dir:[0,0,1],up:[0,1,0],n:3,m:Math.round(14*q),uvs:0.8,uround:2,tipLen:0.25,tipN:2,
     prof:(t,a)=>{const w=mg3Lp(0.85,0.42,t)*(t>0.9?mg3Lp(1,0.5,(t-0.9)/0.1):1),h=mg3Lp(0.42,0.22,t)*(t>0.9?mg3Lp(1,0.5,(t-0.9)/0.1):1),gro=mg3Bump(a,Math.PI/2,0.25)*0.06;return mg3Se(a,w,w,h-gro,h*0.8,2.4);},
     col:(t,a)=>{const k=0.9+0.25*Math.sin(t*20);return [k,k*0.85,k*0.85];}});
   sw.mesh=mg3Mesh(sw.geo,M.flesh,head,'tongue');sw.mesh.frustumCulled=false;sweeps.push(sw);J.tongueTip=mg3Grp('tongueTip',[0,0.15,0.2],ch[ch.length-1]);}
  /* the throat's light core and the god-ray cards (R3: the sun he swallowed) */
  {const tg=J.throatC=mg3Grp('throatC',[0,-0.5,0.75],head);const sun=new THREE.Sprite(M.sun);sun.material.map=mg3Soft();sun.scale.set(2.2,2.2,2.2);sun.visible=false;tg.add(sun);parts.sun=sun;
   const rays=[];const rg=mg3Geo(mg3RayCard());for(let i=0;i<5;i++){const rr=mg3Mesh(rg,M.ray,tg,'ray'+i);rr.rotation.set(-0.15+0.3*((i%3)-1)*0.6,(i-2)*0.28,0);rr.visible=false;rays.push(rr);}parts.rays=rays;}
  /* the tail: 16 segments under one skin, vertebral spikes as section modulation, the bedrock cube grown into its end */
  {const t0=J.tail0=mg3Grp('tail0',P.tail0,pelvis),ch=[t0];let par=t0;const sl=P.tailL/P.tailN;
   for(let k=1;k<P.tailN;k++){const j=mg3Grp('tail'+k,[0,0,-sl],par);ch.push(j);par=j;J['tail'+k]=j;}
   const tip=J.tailTip=mg3Grp('tailTip',[0,0,-sl],par);ch.push(tip);J.tailCh=ch;
   const sw=mg3Sweep({joints:ch,dir:[0,0,-1],up:[0,1,0],n:Math.round(3*q),m:Math.round(14*q),uvs:3,uround:2,
     prof:(t,a)=>{const r=mg3Lp(1.15,0.32,Math.pow(t,0.8))+mg3Sm(0.9,1,t)*0.55;const seg=(t*P.tailN)%1,spike=mg3Bump(a,Math.PI/2,0.16)*Math.pow(Math.max(0,1-Math.abs(seg-0.4)*2.4),2)*mg3Lp(0.75,0.25,t)*(t<0.95?1:0);
       return mg3Se(a,r,r,r*0.92+spike,r*0.85,2.2);},
     col:(t,a)=>{const sp=mg3Bump(a,Math.PI/2,0.18);return [1+sp*0.9,1+sp*0.8,1+sp*0.65];}});
   sw.mesh=mg3Mesh(sw.geo,M.hide,pelvis,'tail');sw.mesh.frustumCulled=false;sweeps.push(sw);
   const cube=J.cube=mg3Grp('cube',[0,0,-0.95],tip);parts.cube=mg3Mesh(GP.cube,M.atlas,cube,'cube');parts.cube.rotation.set(0.15,0.4,0.1);
   parts.cubeGlow=mg3Mesh(GP.cubeGlow,M.cubeGlow,cube,'cubeGlow');parts.cubeGlow.rotation.copy(parts.cube.rotation);parts.cubeGlow.visible=false;}
  /* the belly window: crust plates over a glow, what he ate floating inside (bible 5.5) */
  {const b=J.belly=mg3Grp('belly',[0,-0.15,2.45],spine0);parts.glow=mg3Mesh(GP.glow,M.glow,b,'glow');parts.crust=mg3Mesh(GP.crust,M.crust,b,'crust');
   J.contents=mg3Grp('contents',[0,0,0.1],b);parts.crustGeo=GP.crust;}
  /* the Strata: real atlas cubes on the shoulders and spine (spine1 frame), the oak, the cottage roof's lit window, the slot machine */
  {const st=J.strata=mg3Grp('strata',[0,-0.25,-0.35],spine1);st.rotation.x=-0.28;parts.strata=mg3Mesh(GP.strata,M.atlas,st,'strata');parts.leaves=mg3Mesh(GP.leaves,M.leaves,st,'leaves');
   const S=mg3StrataSpec();const w=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.6),M.win);w.position.set(S.win[0],S.win[1],S.win[2]);w.rotation.y=Math.PI;st.add(w);parts.win=w;
   J.tree=mg3Grp('tree',[S.oak[0],S.oak[1]+3.5,S.oak[2]],st);const fl=[];for(let i=0;i<5;i++){const f=new THREE.Sprite(M.flame);f.visible=false;f.scale.set(1.2,1.6,1);J.tree.add(f);fl.push(f);}parts.flames=fl;
   J.slot=mg3Grp('slot',S.slot,st);}
  /* the light (one PointLight, a direct child of the root; userData.mgLight for the HR mirror) and its anchors */
  let light=null;
  if(kind!=='proxy'){light=new THREE.PointLight(0xff5a22,1.6,30);light.userData.mgLight=1;light.name='mgLight';root.add(light);}
  J.aChest=mg3Grp('aChest',[0,0.4,4.4],spine1);J.aMouth=mg3Grp('aMouth',[0,-0.6,3.4],head);J.aThroat=mg3Grp('aThroat',[0,-0.5,1.0],head);J.aBelly=mg3Grp('aBelly',[0,0,0.3],J.belly);
  const r={root,light,kind,skin:o.skin==='hr'?'hr':'og',joints:J,parts,mats:M,sweeps,eyes,q,lodLevel:0,GP,
    A:mg3AnimState(),update:function(dt,s){mg3Pose(r,dt,s);},lod:function(l){mg3Lod(r,l);},dispose:function(){mg3Dispose(r);},
    wp:function(name,v,out){const j=J[name];return j?mg3Wp(j,v||[0,0,0],null,out):null;},zone:function(n){return mg3Zone(r,n);},caps:function(g){return mg3Caps(r,g);}};
  r.mgEmissive=1;root.userData.mg3=r;MG3.rigs.push(r);if(MG3.rigs.length>8)MG3.rigs.shift();MG3.built|=2;
  mg3Pose(r,0,null);return r;}
function mg3RayCard(){const pos=[],nrm=[],uv=[],col=[],idx=[];for(const rot of [0,Math.PI/2]){const b=pos.length/3,c=Math.cos(rot),s=Math.sin(rot);
    for(const [u,v] of [[-1,0],[1,0],[1,1],[-1,1]]){const w=mg3Lp(0.5,2.4,v),x=u*w*c,y=u*w*s;pos.push(x,y,v*14);nrm.push(-s,c,0);uv.push((u+1)/2,1-v);col.push(1,1,1);}
    idx.push(b,b+1,b+2,b,b+2,b+3);}return {pos:new Float32Array(pos),nrm:new Float32Array(nrm),uv:new Float32Array(uv),col:new Float32Array(col),idx};}
/* the mouth's moving flesh */
function mg3MouthSet(J,M,q,head){const NZ=Math.round(12*q),NX=Math.round(8*q),NC=Math.round(6*q);
  const mk=(nr,nc,mat,name)=>{const N=(nr+1)*(nc+1),G={pos:new Float32Array(N*3),nrm:new Float32Array(N*3),uv:new Float32Array(N*2),col:new Float32Array(N*3).fill(0.8),idx:[]};
    for(let i=0;i<=nr;i++)for(let j=0;j<=nc;j++){const k=i*(nc+1)+j;G.uv[k*2]=j/nc;G.uv[k*2+1]=i/nr*3;}
    for(let i=0;i<nr;i++)for(let j=0;j<nc;j++){const a=i*(nc+1)+j,b=a+1,c=a+nc+1,d=c+1;G.idx.push(a,c,b,b,c,d);}
    G.rest=new Float32Array(N*3);G.restN=new Float32Array(N*3);const geo=mg3Geo(G);const mesh=mg3Mesh(geo,mat,head,name);mesh.frustumCulled=false;
    return {G,geo,mesh,nr,nc,attr:geo.attributes.position,nattr:geo.attributes.normal};};
  const floor=mk(NZ,NX,M.flesh,'mouthFloor'),cheekL=mk(NC,4,M.flesh,'cheekL'),cheekR=mk(NC,4,M.flesh,'cheekR');
  for(let i=0;i<=NZ;i++)for(let j=0;j<=NX;j++){const k=(i*(NX+1)+j)*3,d=0.45+0.4*Math.abs(j/NX*2-1);floor.G.col[k]=d;floor.G.col[k+1]=d*0.9;floor.G.col[k+2]=d*0.9;}
  for(const X of [cheekL,cheekR])for(let k=0;k<X.G.col.length;k+=3){X.G.col[k]=0.6;X.G.col[k+1]=0.5;X.G.col[k+2]=0.5;}
  const T={o:{},tick:null,floor,cheekL,cheekR,tmp:[0,0,0],a:[0,0,0],b:[0,0,0]};
  T.tick=function(first){const mL=J.mandL,mR=J.mandR,v=T.tmp,pa=T.a,pb=T.b;const loc=(md,x,y,z,o)=>{const R=mg3Me(md.rotation.x,md.rotation.y,md.rotation.z,md.rotation.order,MG3K.r);mg3Mv(R,[x,y,z],o);o[0]+=md.position.x;o[1]+=md.position.y;o[2]+=md.position.z;return o;};
    /* the floor: rows from the throat (z 0.6) to the chin; columns from the left mandible's inner edge to the right's, sagging */
    const F=floor.G;for(let i=0;i<=NZ;i++){const t=i/NZ;
      loc(mL,mg3Lp(-0.12,-0.95,t)*0.85,mg3Lp(0.05,-0.2,t),mg3Lp(0.2,4.5,t),pa);loc(mR,-mg3Lp(-0.12,-0.95,t)*0.85,mg3Lp(0.05,-0.2,t),mg3Lp(0.2,4.5,t),pb);
      const sp=Math.hypot(pa[0]-pb[0],pa[2]-pb[2]);for(let j=0;j<=NX;j++){const u=j/NX,k=(i*(NX+1)+j)*3,sag=Math.sin(u*Math.PI)*(mg3Lp(0.35,0.12,t)+Math.max(0,sp-1.4)*0.45*Math.sin(t*Math.PI));
        F.pos[k]=mg3Lp(pa[0],pb[0],u);F.pos[k+1]=mg3Lp(pa[1],pb[1],u)-sag;F.pos[k+2]=mg3Lp(pa[2],pb[2],u);}}
    mg3GridNFlat(F,NZ,NX,false);for(let k=1;k<F.nrm.length;k+=3)if(F.nrm[k]<0){F.nrm[k-1]*=-1;F.nrm[k]*=-1;F.nrm[k+1]*=-1;}
    /* the cheek walls: from the upper jaw's lateral edge to the mandible's outer top edge, from the hinge to the corner of the mouth */
    for(const [md,C,s] of [[mL,cheekL.G,1],[mR,cheekR.G,-1]]){for(let i=0;i<=NC;i++){const t=i/NC,z=mg3Lp(0.45,2.6,t);
        const ux=s*mg3Lp(1.62,1.35,t),uy=-0.55,uz=z;loc(md,s*0.15,0.35,mg3Lp(0.0,2.1,t),pb);
        for(let j=0;j<=4;j++){const u=j/4,k=(i*5+j)*3,bul=Math.sin(u*Math.PI)*0.25*s;C.pos[k]=mg3Lp(ux,pb[0],u)+bul;C.pos[k+1]=mg3Lp(uy,pb[1],u);C.pos[k+2]=mg3Lp(uz,pb[2],u);}}
      mg3GridNFlat(C,NC,4,false);}
    if(first){for(const X of [floor,cheekL,cheekR]){X.G.rest.set(X.G.pos);X.G.restN.set(X.G.nrm);}}
    else for(const X of [floor,cheekL,cheekR]){X.attr.needsUpdate=true;X.nattr.needsUpdate=true;}};
  const sweep={geo:floor.geo,mouth:T,tick:T.tick};T.tick(true);
  return {sweeps:[sweep],parts:{mouthFloor:floor.mesh,cheekL:cheekL.mesh,cheekR:cheekR.mesh}};}
/* the drool strands (bible 5.2, both packs) */
function mg3DroolBuild(J,M,head){const N=10,m=6,list=[];
  for(const sd of [1,-1]){const NV=(N+1)*(m+1),G={pos:new Float32Array(NV*3),nrm:new Float32Array(NV*3),uv:new Float32Array(NV*2),col:new Float32Array(NV*3).fill(1),idx:[]};
    for(let i=0;i<=N;i++)for(let j=0;j<=m;j++){const k=i*(m+1)+j;G.uv[k*2]=j/m;G.uv[k*2+1]=i/N;}mg3GridIdx(N,m,0,G.idx,false);
    G.rest=new Float32Array(NV*3);G.restN=new Float32Array(NV*3);const geo=mg3Geo(G),mesh=mg3Mesh(geo,M.drool,head,'drool'+(sd>0?'L':'R'));mesh.frustumCulled=false;
    list.push({sd,G,geo,mesh,N,m,snap:0,t:sd*1.7,pos:geo.attributes.position,nrm:geo.attributes.normal});}
  const T={list,a:[0,0,0],b:[0,0,0],c:[0,0,0],first:1};
  const tick=function(first,dt){dt=dt||0.016;for(const S of T.list){const md=S.sd>0?J.mandL:J.mandR;
      T.a[0]=S.sd*0.62;T.a[1]=-0.72;T.a[2]=3.7;const R=mg3Me(md.rotation.x,md.rotation.y,md.rotation.z,md.rotation.order,MG3K.r);mg3Mv(R,[-S.sd*0.25,0.28,3.1],T.b);
      T.b[0]+=md.position.x;T.b[1]+=md.position.y;T.b[2]+=md.position.z;const d=Math.hypot(T.b[0]-T.a[0],T.b[1]-T.a[1],T.b[2]-T.a[2]);S.t+=dt;
      if(d>3.3&&S.snap<=0)S.snap=1.2;if(S.snap>0){S.snap-=dt;S.mesh.visible=false;if(!first)continue;}else S.mesh.visible=true;
      const sag=0.35+0.9*mg3Cl(1-d/3.3,0,1),sway=0.18*Math.sin(S.t*2.3),thin=mg3Cl(1.25-d/3.3,0.35,1),P=S.G.pos;
      for(let i=0;i<=S.N;i++){const u=i/S.N,su=Math.sin(u*Math.PI),cx=mg3Lp(T.a[0],T.b[0],u)+sway*su,cy=mg3Lp(T.a[1],T.b[1],u)-sag*su,cz=mg3Lp(T.a[2],T.b[2],u)+sway*0.4*su;
        const r=(0.05+0.07*(1-su))*thin;for(let j=0;j<=S.m;j++){const an=(j%S.m)/S.m*Math.PI*2,k=(i*(S.m+1)+j)*3;P[k]=cx+Math.cos(an)*r;P[k+1]=cy;P[k+2]=cz+Math.sin(an)*r;
          S.G.nrm[k]=Math.cos(an);S.G.nrm[k+1]=0;S.G.nrm[k+2]=Math.sin(an);}}
      if(first){S.G.rest.set(P);S.G.restN.set(S.G.nrm);}else{S.pos.needsUpdate=true;S.nrm.needsUpdate=true;}}};
  tick(true);return {sweep:{geo:list[0].geo,drool:T,tick:function(first){tick(first,T.dt);}},parts:list.map(s=>s.mesh)};}
function mg3Dispose(r){mg3Detach(r.root);
  for(const sw of r.sweeps){if(sw.geo&&sw.geo.dispose)sw.geo.dispose();}
  for(const k in r.mats){const m=r.mats[k];if(m&&m.dispose&&m.userData&&m.userData.mg3own)m.dispose();}
  const i=MG3.rigs.indexOf(r);if(i>=0)MG3.rigs.splice(i,1);r.dead=1;}
