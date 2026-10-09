/* ---- PART 57: m3_g_adds.js ---- */
/* ===================================================================== */
/* PART 57 m3 · file g: the bodies of his entities (plan 5.3 MGREG.mesh; */
/* bible 4.1, 11) and the figurine proxy (bible 5.8). Pillar 2: anything */
/* made of the world is 16 px (Morsels, Husks, Bloaters); anything made  */
/* of him is smooth (the eye). Each body carries G.userData.mg3a(dt,e),  */
/* an animator the M3 tick calls every frame (M2 may call it too).       */
/* ===================================================================== */
var MG3A={n:0,tex:{}};
function mg3PixTex(key,w,h,fn){if(MG3A.tex[key])return MG3A.tex[key];const c=mg3Cv(w,h),g=c.getContext('2d');g.imageSmoothingEnabled=false;fn(g,mg3Rng(key.length*7919+w));
  const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;MG3A.tex[key]=t;return t;}
/* charred 16 px skin: charcoal with ember cracks (the Husk wears Dan's skin, burnt) */
function mg3Char(base,face){return mg3PixTex('char_'+base+'_'+(face||''),16,16,(g,R)=>{const b=hexRGB(base);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=0.22+R()*0.12;g.fillStyle=rgbS(b[0]*k+12,b[1]*k+8,b[2]*k+6);g.fillRect(x,y,1,1);}
  g.fillStyle='#ff6a1a';let x=R()*16|0,y=0;for(let i=0;i<22;i++){g.fillRect(x,y,1,1);x=(x+(R()<0.5?-1:1)+16)%16;y+=R()<0.6?1:0;if(y>15){y=0;x=R()*16|0;}}
  g.fillStyle='#ffb040';for(let i=0;i<5;i++)g.fillRect(R()*16|0,R()*16|0,1,1);
  if(face==='dan'){g.fillStyle='#1a0e08';g.fillRect(0,0,16,4);g.fillStyle='#ff8a2a';g.fillRect(3,7,3,2);g.fillRect(10,7,3,2);g.fillStyle='#ffe08a';g.fillRect(4,7,1,1);g.fillRect(11,7,1,1);
    g.fillStyle='#0a0504';g.fillRect(5,12,6,2);g.fillStyle='#ff6a1a';g.fillRect(6,12,1,1);g.fillRect(9,13,1,1);}});}
function mg3Lam(c,map){return new THREE.MeshLambertMaterial(map?{map}:{color:c});}
function mg3Bx(w,h,d,mat,parent,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x||0,y||0,z||0);if(parent)parent.add(m);return m;}
/* the Morsel: a 1.2 m atlas cube of the world with a ragged mouth on its front face and four stubby block legs */
function mg3Morsel(G,mats,opts){const ids=[B.GRASS,B.DIRT,B.STONE,B.SAND,B.COAL_ORE,B.IRON_ORE,B.COBBLE],id=ids[(MG3A.n++)%ids.length],legs=[];
  const body=new THREE.Group();body.position.y=0.95;G.add(body);
  const cube=new THREE.Mesh(mkCubeGeo(id,1.2),typeof matOp!=='undefined'&&matOp?matOp:mg3Lam(0x6a8a3a));body.add(cube);
  const mouth=new THREE.Mesh(new THREE.PlaneGeometry(0.86,0.42),new THREE.MeshBasicMaterial({map:mg3PixTex('mmouth',16,8,(g,R)=>{g.clearRect(0,0,16,8);g.fillStyle='#160606';
    for(let x=0;x<16;x++){const t=1+(R()*2|0),b=6-(R()*2|0);g.fillRect(x,t,1,b-t);}g.fillStyle='#e8e0c8';for(let x=1;x<16;x+=3){g.fillRect(x,1,1,2);g.fillRect(x+1,5,1,2);}}),transparent:true,alphaTest:0.5}));
  mouth.position.set(0,-0.12,0.605);body.add(mouth);
  const lm=mg3Lam(0x5a4030);for(const [sx,sz,ph] of [[-1,-1,0],[1,-1,Math.PI],[-1,1,Math.PI],[1,1,0]]){const lg=new THREE.Group();lg.position.set(sx*0.36,0.4,sz*0.36);mg3Bx(0.28,0.4,0.28,lm,lg,0,-0.2,0);G.add(lg);legs.push({g:lg,ph,ax:'x',base:0,amp:0.7});}
  mats.push(lm);G.userData.mg3a=function(dt,e){const sp=Math.hypot(e.vx||0,e.vz||0);e.anim=(e.anim||0)+dt*(2+sp*3);body.position.y=0.95+Math.abs(Math.sin(e.anim))*0.12*Math.min(1,sp);
    mouth.scale.y=0.8+0.4*Math.abs(Math.sin(e.anim*1.7));for(const l of legs)l.g.rotation.x=Math.sin(e.anim+l.ph)*l.amp*Math.min(1,sp/2);if(e.mesh)e.mesh.rotation.y=e.yaw||0;};
  return {G,legs,mats};}
/* the Husk: Dan's player model, charred, ember-cracked; one melted armour piece; sometimes a store hat (bible 11) */
function mg3Husk(G,mats,opts){const n=MG3A.n++,R=mg3Rng(n*131+7),legs=[];const sk=mg3Lam(0,mg3Char('#e8b88f')),sh=mg3Lam(0,mg3Char('#d9822b')),pa=mg3Lam(0,mg3Char('#34343a')),fc=mg3Lam(0,mg3Char('#e8b88f','dan'));
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),[sk,sk,sk,sk,fc,sk]);head.position.y=1.62;G.add(head);
  mg3Bx(0.5,0.72,0.27,sh,G,0,1.0,0);
  const limb=(m,w,h,x,y)=>{const p=new THREE.Group();p.position.set(x,y,0);mg3Bx(w,h,w,m,p,0,-h/2,0);G.add(p);return p;};
  const aL=limb(sh,0.18,0.66,-0.34,1.32),aR=limb(sh,0.18,0.66,0.34,1.32),lL=limb(pa,0.21,0.66,-0.13,0.66),lR=limb(pa,0.21,0.66,0.13,0.66);
  aL.rotation.x=aR.rotation.x=-1.2;legs.push({g:lL,ph:0,ax:'x',base:0,amp:0.6},{g:lR,ph:Math.PI,ax:'x',base:0,amp:0.6});
  const melt=mg3Lam(0x8a8a90);const pick=n%4;if(pick===0)mg3Bx(0.56,0.32,0.56,melt,head,0,0.12,0);else if(pick===1)mg3Bx(0.56,0.5,0.33,melt,G,0,1.12,0);else if(pick===2)mg3Bx(0.25,0.4,0.27,melt,lL,0,-0.4,0);else mg3Bx(0.24,0.35,0.26,melt,aR,0,-0.2,0);
  for(let i=0;i<3;i++){const d=mg3Bx(0.05,0.12+R()*0.18,0.05,melt,G,(R()-0.5)*0.4,0.8+R()*0.3,0.14);d.userData.drip=1;}
  if(R()<0.3&&typeof buildHat==='function'){const h=buildHat(['tophat','crown','cone'][n%3]);head.add(h);}
  if(opts&&opts.archer){const bw=mg3Bx(0.06,0.9,0.06,mg3Lam(0x6a4a2a),aR,0,-0.7,0.15);bw.rotation.x=0.3;}
  for(const m of [sk,sh,pa,fc,melt])mats.push(m);
  G.userData.mg3a=function(dt,e){const sp=Math.hypot(e.vx||0,e.vz||0);e.anim=(e.anim||0)+dt*(3+sp*2.5);const a=Math.min(1,sp/2);lL.rotation.x=Math.sin(e.anim)*0.7*a;lR.rotation.x=-Math.sin(e.anim)*0.7*a;
    aL.rotation.x=-1.2+Math.sin(e.anim*0.5)*0.15+(e.atkT>0?-0.6:0);aR.rotation.x=-1.2-Math.sin(e.anim*0.5)*0.15+(e.mgBlock?-0.9:0);head.rotation.y=Math.sin(e.anim*0.3)*0.2;if(e.mesh)e.mesh.rotation.y=e.yaw||0;};
  return {G,legs,mats};}
/* the Bloater: the Nuke Keg body swollen x1.4, dripping bile, charred; strobes white-yellow on its fuse */
function mg3Bloat(G,mats,opts){const r=typeof mkCreepMesh==='function'?mkCreepMesh('creep'):null;if(!r)return null;const body=r.G;body.scale.set(1.4,1.15,1.4);G.add(body);
  const bile=new THREE.MeshBasicMaterial({color:0x9ad21a,transparent:true,opacity:0.85});const drips=[];
  for(let i=0;i<5;i++){const d=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.18,0.05),bile);d.position.set((i-2)*0.12,0.5+((i*37)%5)*0.1,0.25);G.add(d);drips.push(d);}
  for(const m of r.mats){if(m.color&&m.color.setRGB)m.color.setRGB(m.color.r*0.55+0.08,m.color.g*0.7+0.06,m.color.b*0.4);mats.push(m);}mats.push(bile);
  G.userData.mg3a=function(dt,e){e.anim=(e.anim||0)+dt;const sp=Math.hypot(e.vx||0,e.vz||0);body.rotation.z=Math.sin(e.anim*3)*0.12*Math.min(1,sp);
    const sw=1.4+0.06*Math.sin(e.anim*2.3)+(e.fuse>0?0.25*e.fuse:0);body.scale.set(sw,1.15+(e.fuse>0?0.15*e.fuse:0),sw);
    for(let i=0;i<drips.length;i++){const d=drips[i];d.position.y-=dt*0.4;if(d.position.y<0.15)d.position.y=0.7;}
    const st=e.fuse>0&&Math.sin(e.anim*30)>0;for(const m of r.mats)if(m.emissive&&m.emissive.setRGB)m.emissive.setRGB(st?0.9:0,st?0.85:0,st?0.5:0);
    for(const l of r.legs)l.g.rotation[l.ax||'x']=Math.sin(e.anim*5+l.ph)*l.amp*Math.min(1,sp/1.5);if(e.mesh)e.mesh.rotation.y=e.yaw||0;};
  return {G,legs:[],mats};}
/* the eye in the slit (bible 3.6, 4.1) */
function mg3EyeBody(G,mats,opts){const ball=new THREE.Mesh(mg3Geo(mg3PEye(0.36,1.2)),new THREE.MeshStandardMaterial({color:0x000000,emissive:new THREE.Color(1,1,1),emissiveMap:mg3EyeTex('amber'),emissiveIntensity:1.1,roughness:0.1}));
  const piv=new THREE.Group();piv.position.y=0.35;piv.add(ball);G.add(piv);
  const pup=new THREE.Mesh(mg3Geo(mg3Ell(0.06,0.27,0.03,6,10)),new THREE.MeshBasicMaterial({color:0x020000}));pup.position.z=0.33;piv.add(pup);
  const lidT=new THREE.Mesh(mg3Geo(mg3Ell(0.4,0.4,0.4,6,12)),new THREE.MeshStandardMaterial({color:0x2a1414,roughness:0.6}));lidT.scale.set(1,0.02,1);piv.add(lidT);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:mg3Soft(),color:0xff8a30,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.55}));glow.scale.set(2.2,2.2,2.2);glow.position.y=0.2;G.add(glow);
  const R=mg3Rng(606);let next=6+R()*5,bl=0;mats.push(ball.material);
  G.userData.mg3a=function(dt,e){if(typeof P==='undefined'||!P)return;const dx=P.x-e.x,dy=P.y+1.6-(e.y+0.35),dz=P.z-e.z,d=Math.hypot(dx,dy,dz);
    piv.rotation.order='YXZ';const ty=Math.atan2(dx,dz),tp=-Math.atan2(dy,Math.hypot(dx,dz));piv.rotation.y+=(ty-piv.rotation.y)*Math.min(1,dt*6);piv.rotation.x+=(mg3Cl(tp,-1.2,1.2)-piv.rotation.x)*Math.min(1,dt*6);
    pup.scale.x=e.mgPupil!=null?mg3Lp(1.6,0.35,e.mgPupil):mg3Lp(0.35,1.6,mg3Sm(4,24,d));next-=dt;if(next<=0){bl=0.18;next=6+R()*5;}bl=Math.max(0,bl-dt);lidT.scale.y=(bl>0||e.mgBlink)?1:0.02;
    const blood=e.mgBlood!=null?e.mgBlood:(e.poked!=null&&MGF.clock-e.poked<60?1:0),sq=e.mgShut!=null?e.mgShut:(e.poked!=null&&MGF.clock-e.poked<0.5);if(sq)lidT.scale.y=1;
    if(e.poked!=null&&e.poked!==G.userData.pk){G.userData.pk=e.poked;if(typeof mg3Event==='function')mg3Event('poke');}
    const m=ball.material;if(m.emissive&&m.emissive.setRGB)m.emissive.setRGB(1,blood?0.45:1,blood?0.4:1);glow.material.opacity=0.45+0.15*Math.sin(MGF.clock*2);if(e.mesh)e.mesh.rotation.y=0;};
  return {G,legs:[],mats};}
function mg3PartBody(G,mats,opts){return {G,legs:[],mats};}
/* ---- the figurine proxy (bible 5.8 */
function mg3Proxy(o){if(!MG3.geo.proxy)MG3.geo.proxy=mg3ProxyBake();const P=MG3.geo.proxy,root=new THREE.Group();root.name='malgorath_proxy';
  for(const p of P)root.add(new THREE.Mesh(p.g,p.m));const k=5/(P.h||19);root.scale.set(k,k,k);root.userData.mgProxy=1;
  return {root,light:null,kind:'proxy',skin:'og',joints:{root},parts:{},update:function(){},lod:function(){},dispose:function(){mg3Detach(root);}};}
function mg3ProxyBake(){const q=0.3,GP=mg3Parts(q),S=THREE.MeshStandardMaterial;
  const M={hide:new S({color:0x3a2624,vertexColors:true,roughness:0.8,emissive:new THREE.Color(0.6,0.16,0.04),emissiveIntensity:0.35}),horn:new S({color:0xbfae90,vertexColors:true,roughness:0.6}),
    enamel:new S({color:0xfff0d8,vertexColors:true,roughness:0.4}),eye:new THREE.MeshBasicMaterial({color:0xffb030}),glow:new THREE.MeshBasicMaterial({color:0xff7a20}),
    atlas:typeof matOp!=='undefined'&&matOp?matOp:new THREE.MeshLambertMaterial({vertexColors:true}),leaves:typeof matCut!=='undefined'&&matCut?matCut:new THREE.MeshLambertMaterial({vertexColors:true})};
  Object.assign(M,{handL:M.hide,handR:M.hide,brow:M.hide,flesh:M.hide,handEye:M.eye,crust:M.glow,win:M.glow,drool:M.hide,sun:new THREE.SpriteMaterial({color:0xffffff}),ray:new THREE.MeshBasicMaterial({color:0xffffff}),cubeGlow:new THREE.MeshBasicMaterial({color:0xffffff}),flame:new THREE.SpriteMaterial({color:0xffffff})});
  /* a skeleton-only rig at proxy detail: reuse the real builder with the proxy geometry set, then bake */
  const r=mg3RigQ(q,GP,M);mg3Pose(r,0,null);for(let i=0;i<4;i++)mg3Pose(r,0.25,null);
  const fam={hide:[],horn:[],enamel:[],eye:[],glow:[],atlas:[],leaves:[]},keyOf=m=>m===M.horn?'horn':(m===M.enamel?'enamel':(m===M.eye?'eye':(m===M.glow?'glow':(m===M.atlas?'atlas':(m===M.leaves?'leaves':'hide')))));
  r.root.traverse(n=>{if(!n.isMesh&&!(n.geometry&&n.material&&n.constructor===THREE.Mesh))return;if(n.visible===false||!n.geometry||!n.geometry.attributes||!n.geometry.attributes.position)return;
    const T=mg3Fk(n,null),g=n.geometry,a=g.attributes,ix=g.index?g.index.array:null;if(!ix)return;
    fam[keyOf(Array.isArray(n.material)?n.material[0]:n.material)].push({g:{pos:a.position.array,nrm:a.normal?a.normal.array:new Float32Array(a.position.array.length),uv:a.uv?a.uv.array:null,col:a.color?a.color.array:null,idx:Array.from(ix)},m:T.m,p:T.p});});
  const out=[];let y0=1e9,y1=-1e9;for(const k in fam){if(!fam[k].length)continue;const J=mg3Join(fam[k]);for(let i=1;i<J.pos.length;i+=3){y0=Math.min(y0,J.pos[i]);y1=Math.max(y1,J.pos[i]);}out.push({g:mg3Geo(J),m:M[k]});}out.h=y1-y0;mg3Dispose(r);return out;}
/* the rig builder at an arbitrary detail with given geometry and materials (the proxy bake): no sweeps for fingers/tongue/mouth */
function mg3RigQ(q,GP,M){const keep=MG3.rigs.length;const r=mg3Rig({kind:'effigy',skin:'og',_q:q,_GP:GP,_M:M});
  for(const k of ['palate','throat','mouthFloor','cheekL','cheekR','tongue','teethLL','teethLR','teethU','win','sun','glow','droolL','droolR','leaves','rail','handEyeL','handEyeR'])if(r.parts[k])r.parts[k].visible=false;
  for(const s of r.sweeps)if(s.o&&/finger/.test((s.mesh&&s.mesh.name)||''))s.mesh.visible=false;
  for(const rr of r.parts.rays)rr.visible=false;for(const f of r.parts.flames)f.visible=false;if(r.light){r.root.remove(r.light);r.light=null;}return r;}
