/* ---- PART 57: m3_f_dress.js ---- */
/* ===================================================================== */
/* PART 57 m3 · file f: set dressing (bible 3.6), the scenes' pictures   */
/* (bible 6, 12, 13), the cutscene cameras and the OG value script       */
/* (bible 19.1). Everything is driven by state M1/M2 already publish     */
/* (MGL.phase / CUT.t for the scenes, MGL.eclipse / MGL.dawn for the sun,*/
/* MGL.edge, MALG.round, the M1 layout), so no package has to call M3.   */
/* Set dressing lives in one scene group 'mgDress' (meshes tagged        */
/* userData.mgRole for M4's HR re-skin). Built within 220 m only.        */
/* ===================================================================== */
var MG3D={G:null,live:0,R:null,ring:null,iris:null,bile:null,falls:null,curt:null,edge:null,plume:null,sun:null,brazier:null,props:null,
  ph:'',pt:0,peelT:20,ashT:0,steamT:0,geyser:0,snapped:0,fang:[],sk:{w:0,E:0,fog:[0,0,0],bg:[0,0,0],far:0,near:0,amb:0,on:0}};
function mg3Grade(){return {r:MALG.round||1,met:!!MALG.met,dead:!!DEMON.dead,live:!!MGL.live,ph:MGL.phase||'',E:MGL.eclipse||0,dawn:MGL.dawn||0,
  L:(MGREG.world&&MGREG.world.L)?MGREG.world.L():(DEMON.dead?'Ldead':(MALG.met?'L'+(MALG.round||1):'L0'))};}
function mg3DMat(o){const m=new THREE.MeshBasicMaterial(o);m.userData=m.userData||{};m.userData.mg3own=1;return m;}
function mg3DAdd(m,role){if(role){m.userData=m.userData||{};m.userData.mgRole=role;}MG3D.G.add(m);return m;}
/* ---- build (once per approach) ---- */
function mg3DressBuild(){if(MG3D.G)return;MG3D.R=mg3Rng(0xd2e55);MG3D.G=new THREE.Group();MG3D.G.name='mgDress';if(typeof scene!=='undefined'&&scene)scene.add(MG3D.G);
  try{mg3RingBuild();}catch(err){mgFail('m3 ring',err);}
  try{mg3PlumeBuild();}catch(err){mgFail('m3 plume',err);}
  MG3D.live=1;}
/* everything heavier than the ring and the plume needs the height band (bible 2) */
function mg3DressBuild2(){if(!MG3D.G||MG3D.b2)return;MG3D.b2=1;
  try{mg3IrisBuild();}catch(err){mgFail('m3 iris',err);}
  try{mg3BileBuild();}catch(err){mgFail('m3 bile',err);}
  try{mg3FallsBuild();}catch(err){mgFail('m3 falls',err);}
  try{mg3CurtBuild();}catch(err){mgFail('m3 curtains',err);}
  try{mg3SunBuild();}catch(err){mgFail('m3 sun',err);}
  try{mg3BoneProps();}catch(err){mgFail('m3 bone pile',err);}
  try{mg3FossilBuild();}catch(err){mgFail('m3 fossils',err);}}
function mg3DressClear(){if(!MG3D.G)return;mg3Detach(MG3D.G);
  MG3D.G.traverse(n=>{if(n.geometry&&n.geometry.dispose&&!n.userData.shared)n.geometry.dispose();const m=n.material;if(m&&m.userData&&m.userData.mg3own&&m.dispose)m.dispose();});
  MG3D.G=null;MG3D.live=0;MG3D.b2=0;MG3D.plume=null;MG3D.ring=MG3D.iris=MG3D.bile=MG3D.falls=MG3D.curt=MG3D.edge=MG3D.plume=MG3D.sun=MG3D.brazier=MG3D.props=null;MG3D.fang.length=0;
  if(typeof sunSpr!=='undefined'&&sunSpr)sunSpr.visible=true;if(typeof moonSpr!=='undefined'&&moonSpr)moonSpr.visible=true;}
/* ---- the leftovers ring (bible 2): three tiers of chunks of other worlds turning as a slow funnel; one peels off every ~20 s ---- */
var MG3TROPHY=[[[0,0,0,'GRASS'],[1,0,0,'DIRT'],[0,-1,0,'DIRT']],[[0,0,0,'LOG_O'],[0,1,0,'LOG_O'],[0,2,0,'LEAF_O'],[1,2,0,'LEAF_O'],[-1,2,0,'LEAF_O'],[0,3,0,'LEAF_O']],[[0,0,0,'CHEST']],
  [[0,0,0,'COBBLE'],[1,0,0,'COBBLE'],[0,1,0,'COBBLE']],[[0,0,0,'WOOL'],[1,0,0,'WOOL'],[1.4,0.4,0,'WOOL',0.6]],[[0,0,0,'CRAFT'],[0,-1,0,'PLANK_O']],[[0,0,0,'FURNACE']],
  [[0,0,0,'SANDSTONE'],[0,1,0,'SANDSTONE'],[1,0,0,'SAND']],[[0,0,0,'BRICK'],[1,0,0,'BRICK'],[0,1,0,'GLASS']],[[0,0,0,'TNT']],[[0,0,0,'STONEBRICK'],[0,0,1,'STONE'],[1,1,0,'IRON_ORE']]];
function mg3RingChunk(R,k){const T=MG3TROPHY[Math.floor(R()*MG3TROPHY.length)],out=[],leaves=[];for(const c of T){const id=B[c[3]];if(id==null)continue;(c[3]==='LEAF_O'?leaves:out).push({id,x:c[0],y:c[1],z:c[2],s:c[4]||1});}return {out,leaves};}
function mg3RingBuild(){const R=mg3Rng(0x11e7),G=mgG(),am=mg3DMat({}),tiers=[];am.dispose&&0;
  const atlas=new THREE.MeshLambertMaterial({map:typeof atlasTex!=='undefined'?atlasTex:null,vertexColors:true,fog:false}),cut=new THREE.MeshLambertMaterial({map:typeof atlasTex!=='undefined'?atlasTex:null,vertexColors:true,fog:false,alphaTest:0.5,side:THREE.DoubleSide});
  for(const m of [atlas,cut]){m.userData={mg3own:1};}
  for(let t=0;t<3;t++){const g=new THREE.Group();g.name='mgRing'+t;const ch=[];
    for(let k=0;k<8;k++){const a=k/8*Math.PI*2+R()*0.3,c=mg3RingChunk(R,k),rr=22+8*t+(R()-0.5)*3,yy=(R()-0.5)*3,ry=R()*6;
      ch.push({a,r:rr,y:yy,ry,c,on:1,rot:[R()*6,R()*6]});}
    const tier={g,ch,t,mesh:null,leaf:null,y0:G+14+8*t,r0:22+8*t,per:[60,90,120][t]};mg3RingMesh(tier,atlas,cut);g.position.set(MGC.X,tier.y0,MGC.Z);mg3DAdd(g);tiers.push(tier);}
  MG3D.ring={tiers,atlas,cut,ang:[0,0,0],k:1,yk:0,fall:0};}
function mg3RingMesh(T,atlas,cut){const list=[],lv=[];for(const c of T.ch){if(!c.on)continue;const ca=Math.cos(c.a),sa=Math.sin(c.a),cy=Math.cos(c.ry),sy=Math.sin(c.ry);
    for(const q of c.c.out)list.push({id:q.id,x:ca*c.r+q.x*cy+q.z*sy,y:c.y+q.y,z:sa*c.r-q.x*sy+q.z*cy,s:q.s,ry:c.ry});for(const q of c.c.leaves)lv.push({id:q.id,x:ca*c.r+q.x*cy+q.z*sy,y:c.y+q.y,z:sa*c.r-q.x*sy+q.z*cy,s:1,ry:c.ry});}
  for(const k of ['mesh','leaf']){const m=T[k];if(m){T.g.remove(m);m.geometry.dispose&&m.geometry.dispose();}}
  T.mesh=new THREE.Mesh(mg3Geo(mg3Cubes(list)),atlas);T.mesh.frustumCulled=false;T.g.add(T.mesh);
  if(lv.length){T.leaf=new THREE.Mesh(mg3Geo(mg3Cubes(lv)),cut);T.leaf.frustumCulled=false;T.g.add(T.leaf);}else T.leaf=null;}
function mg3RingTick(dt,S){const R=MG3D.ring;if(!R)return;const G=mgG(),F=mgF();
  const show=!S.dead||S.ph==='death';for(const T of R.tiers)T.g.visible=show;if(!show)return;
  /* R3 (or the sun being eaten): drops and tightens into a fast funnel; the death scene: it falls and buries him */
  const fun=Math.max(S.E,S.r===3&&S.met&&!S.dead?1:0);R.k+=(fun-R.k)*Math.min(1,dt*0.6);const f=mg3Cl(R.k,0,1);
  let fall=0;if(S.ph==='death'&&CUT.on){const t=CUT.t;fall=mg3Cl((t-4.5)/3.5,0,1);}
  for(const T of R.tiers){const per=T.per/(1+2.5*f);R.ang[T.t]+=dt/per*Math.PI*2;T.g.rotation.y=-R.ang[T.t];
    const y=mg3Lp(T.y0,G+6+5*T.t,f),sc=mg3Lp(1,(14+5*T.t)/T.r0,f);T.g.scale.set(sc,1,sc);
    T.g.position.y=fall>0?mg3Lp(y,mgGF()+2+T.t,fall*fall):y;if(fall>0){T.g.scale.set(sc*(1-fall*0.6),1,sc*(1-fall*0.6));}}
  /* a bottom-tier chunk peels off every ~20 s (seeded), arcs into the Throat (real cubes, tumbling), and its slot refills later */
  if(!S.dead&&MGF.band){R.peel=(R.peel==null?MG3D.peelT:R.peel)-dt;if(R.peel<=0){R.peel=16+MG3D.R()*8;const T=R.tiers[0],live=T.ch.filter(c=>c.on);
    if(live.length>4){const c=live[Math.floor(MG3D.R()*live.length)];c.on=0;c.back=18;mg3RingMesh(T,R.atlas,R.cut);
      const a=c.a-R.ang[0],wx=MGC.X+Math.cos(a)*c.r*T.g.scale.x,wz=MGC.Z+Math.sin(a)*c.r*T.g.scale.z,wy=T.g.position.y+c.y,tt=1.6;
      mg3Cubes2(c.c.out.concat(c.c.leaves).map(q=>({id:q.id,x:wx+q.x,y:wy+q.y,z:wz+q.z,vx:(MGC.X-wx)/tt,vy:(F-4-wy)/tt+11*tt*0.5+2,vz:(MGC.Z-wz)/tt,life:3.2,s:q.s||1})));}}
    for(const c of R.tiers[0].ch)if(!c.on&&(c.back-=dt)<=0){c.on=1;mg3RingMesh(R.tiers[0],R.atlas,R.cut);}}}
/* ---- the iris (bible 3.6): 12 fangs rooted at r 7 leaning in over the Throat; clack, peel (intro), 4 snap (climb), splay (R3) ---- */
function mg3IrisBuild(){const g=MG3.geo.irisFang||(MG3.geo.irisFang=mg3Geo(mg3Fang(8,6,1.2)));const mat=new THREE.MeshStandardMaterial({color:0xf2e6cc,vertexColors:true,roughness:0.35});mat.userData={mg3own:1};
  const F=mgF(),it=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2+Math.PI/12,piv=new THREE.Group();piv.position.set(MGC.X+Math.cos(a)*7.2,F-0.7,MGC.Z+Math.sin(a)*7.2);piv.rotation.order='YXZ';piv.rotation.y=-a-Math.PI/2;
    const m=new THREE.Mesh(g,mat);m.userData.shared=1;m.userData.mgRole='enamel';const s=2.5*(0.9+0.2*((i*7)%5)/4);m.scale.set(s,s,s);piv.add(m);mg3DAdd(piv);it.push({piv,m,a,open:0,clack:0,gone:0,fly:null});}
  MG3D.iris={it,mat};}
function mg3IrisTick(dt,S){const I=MG3D.iris;if(!I)return;const F=mgF();let base=0,peel=-1;
  if(S.L==='L0')base=0;else if(S.L==='L3'||S.L==='Ldead')base=1.6;else base=1;
  if(S.ph==='intro'&&CUT.on){const full=CUT.script&&CUT.script.end>8,t0=full?1.5:0.0;peel=CUT.t-t0;base=0;}
  const snap=(S.L==='L2'||S.L==='L3'||S.L==='Ldead')||(S.ph==='climb'&&CUT.on&&CUT.t>0.15);
  for(let i=0;i<I.it.length;i++){const q=I.it[i];let want=base;if(peel>=0)want=mg3Ease((peel-i*0.12)/0.5);
    q.open+=(want-q.open)*Math.min(1,dt*(peel>=0?14:2.5));q.clack=Math.max(0,q.clack-dt*4);
    const lean=mg3Lp(-1.15,0.35,mg3Cl(q.open,0,1))+(q.open>1?(q.open-1)*0.6:0)-q.clack*0.35;q.piv.rotation.x=lean;
    const gone=snap&&(i%3===1);if(gone&&!q.gone){q.gone=1;if(S.ph==='climb'){q.fly={x:q.piv.position.x,y:q.piv.position.y+1,z:q.piv.position.z,vx:-Math.cos(q.a)*3,vy:6,vz:-Math.sin(q.a)*3,t:0};}else q.piv.visible=false;}
    if(!gone&&q.gone){q.gone=0;q.fly=null;q.piv.visible=true;q.piv.position.set(MGC.X+Math.cos(q.a)*7.2,F-0.7,MGC.Z+Math.sin(q.a)*7.2);}
    if(q.fly){const f=q.fly;f.t+=dt;f.vy-=22*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;q.piv.position.set(f.x,f.y,f.z);q.piv.rotation.z+=dt*6;if(f.y<mgGF()-1){q.fly=null;q.piv.visible=false;}}}}
/* ---- the bile (bible 3.6): one animated surface over the gut floor + an additive glow rising off it; a dark crust after his death ---- */
function mg3BileTex(){if(MG3.geo.bileT)return MG3.geo.bileT;const c=mg3Cv(256,256),g=c.getContext('2d'),R=mg3Rng(4141);g.fillStyle='#8aa818';g.fillRect(0,0,256,256);
  for(let i=0;i<900;i++){const x=R()*256,y=R()*256,r=1+R()*7;g.fillStyle='rgba('+(150+R()*90|0)+','+(190+R()*60|0)+','+(20+R()*50|0)+','+(0.15+R()*0.3).toFixed(2)+')';g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
  g.strokeStyle='rgba(240,255,150,0.35)';for(let i=0;i<60;i++){const x=R()*256,y=R()*256,r=2+R()*9;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;MG3.geo.bileT=t;return t;}
function mg3GlowTex(){if(MG3.geo.glowT)return MG3.geo.glowT;const c=mg3Cv(16,128),g=c.getContext('2d');const gr=g.createLinearGradient?g.createLinearGradient(0,128,0,0):null;
  if(gr){gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.3,'rgba(255,255,255,0.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,16,128);}
  MG3.geo.glowT=new THREE.CanvasTexture(c);return MG3.geo.glowT;}
function mg3BileBuild(){const GF=mgGF(),N=96,pos=[],uv=[],idx=[],nrm=[];
  for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,ro=mgRw(a)-0.15,ri=5.5;for(const r of [ri,ro]){const x=Math.cos(a)*r,z=Math.sin(a)*r;pos.push(MGC.X+x,GF+0.06,MGC.Z+z);uv.push(x/7,z/7);nrm.push(0,1,0);}}
  for(let i=0;i<N;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  const geo=mg3Geo({pos:new Float32Array(pos),nrm:new Float32Array(nrm),uv:new Float32Array(uv),idx});const mat=mg3DMat({map:mg3BileTex(),color:0xb8e040});
  const m=mg3DAdd(new THREE.Mesh(geo,mat),'bile');m.frustumCulled=false;m.renderOrder=1;
  /* the glow off the bile: an open additive cylinder hugging the gut wall, bright at the floor, gone 8 m up */
  const gp=[],gu=[],gi=[],gn=[];for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,r=mgRw(a)-0.6;for(const h of [0,8]){gp.push(MGC.X+Math.cos(a)*r,GF+h,MGC.Z+Math.sin(a)*r);gu.push(i/N*8,h/8);gn.push(-Math.cos(a),0,-Math.sin(a));}}
  for(let i=0;i<N;i++){const a=i*2;gi.push(a,a+2,a+1,a+1,a+2,a+3);}
  const gm=mg3DMat({map:mg3GlowTex(),color:0x7a9a10,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
  const glow=mg3DAdd(new THREE.Mesh(mg3Geo({pos:new Float32Array(gp),nrm:new Float32Array(gn),uv:new Float32Array(gu),idx:gi}),gm));glow.frustumCulled=false;
  MG3D.bile={m,mat,glow,gm,t:0};}
function mg3BileTick(dt,S){const B_=MG3D.bile;if(!B_)return;B_.t+=dt;const tx=B_.mat.map;if(tx&&tx.offset){tx.offset.x=Math.sin(B_.t*0.05)*0.3;tx.offset.y=B_.t*0.012;}
  const dead=S.dead&&S.ph!=='death',p=0.85+0.15*Math.sin(B_.t*1.3);
  if(B_.mat.color&&B_.mat.color.setRGB){if(dead)B_.mat.color.setRGB(0.16,0.15,0.09);else B_.mat.color.setRGB(0.72*p,0.88*p,0.25*p);}
  B_.glow.visible=!dead;if(B_.gm.color&&B_.gm.color.setRGB){const g=S.r===3&&!dead?[0.14,0.13,0.04]:[0.12,0.16,0.02];B_.gm.color.setRGB(g[0]*p,g[1]*p,g[2]*p);}
  if(!dead&&MGF.d<70&&MGF.band&&MG3D.R()<dt*3){const a=MG3D.R()*Math.PI*2,r=7+MG3D.R()*28;mg3Burst('bile',MGC.X+Math.cos(a)*r,mgGF()+0.2,MGC.Z+Math.sin(a)*r,{n:4,spd:2.2});}}
/* ---- the sea falls (ocean seeds, never cut): 11 sheets down the seabed wall into a steam band at F-6, and the far steam plume ---- */
function mg3WaterTex(){if(MG3.geo.waterT)return MG3.geo.waterT;const c=mg3Cv(64,256),g=c.getContext('2d'),R=mg3Rng(777);g.fillStyle='rgba(120,170,220,0.55)';g.fillRect(0,0,64,256);
  for(let i=0;i<120;i++){const x=R()*64,w=1+R()*3,l=20+R()*80,y=R()*256;g.fillStyle='rgba(235,245,255,'+(0.25+R()*0.5).toFixed(2)+')';g.fillRect(x,y,w,l);g.fillRect(x,y-256,w,l);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;MG3.geo.waterT=t;return t;}
function mg3Ocean(a){const r=mgRw(a)+3.5,x=Math.floor(MGC.X+Math.cos(a)*r),z=Math.floor(MGC.Z+Math.sin(a)*r);try{return colInfo(x,z).h<SEA;}catch(err){return false;}}
function mg3FallsBuild(){const G=mgG(),F=mgF(),tex=mg3WaterTex(),mat=mg3DMat({map:tex,transparent:true,opacity:0.8,depthWrite:false,side:THREE.DoubleSide});const sheets=[];
  for(let k=0;k<11;k++){const th=(2*k+1)*Math.PI/11;if(!mg3Ocean(th))continue;const w=3.2+((k*5)%3)*0.8,rw=mgRw(th)-0.35,N=6,M=10,pos=[],uv=[],idx=[],nrm=[];
    for(let i=0;i<=M;i++){const v=i/M,y=mg3Lp(G-0.6,F-6,v),bulge=Math.sin(v*Math.PI)*0.6+v*0.9;for(let j=0;j<=N;j++){const a=th+(j/N-0.5)*w/rw,r=rw-bulge;pos.push(MGC.X+Math.cos(a)*r,y,MGC.Z+Math.sin(a)*r);uv.push(j/N,v*(G-F+6)/6);nrm.push(-Math.cos(a),0,-Math.sin(a));}}
    for(let i=0;i<M;i++)for(let j=0;j<N;j++){const a=i*(N+1)+j;idx.push(a,a+N+1,a+1,a+1,a+N+1,a+N+2);}
    const m=mg3DAdd(new THREE.Mesh(mg3Geo({pos:new Float32Array(pos),nrm:new Float32Array(nrm),uv:new Float32Array(uv),idx}),mat),'water');m.frustumCulled=false;sheets.push({m,th});}
  MG3D.falls={sheets,mat,tex};}
/* the steam band under the falls and the far plume over the hole: soft billboards in one Points, fog:false (ocean seeds) */
function mg3PlumeBuild(){let wet=0;for(let k=0;k<11;k++)if(mg3Ocean((2*k+1)*Math.PI/11))wet++;if(!wet)return;const N=90,ps=mg3PtSys(N,0);ps.pts.name='mgPlume';ps.pts.material.fog=false;mg3DAdd(ps.pts);
  for(let i=0;i<N;i++){const p=ps.P[i];mg3PlumeSeed(p,i<60?0:1,true);}MG3D.plume=ps;}
function mg3PlumeSeed(p,kind,init){const R=MG3D.R,F=mgF(),G=mgG();p.kind=kind;
  if(kind===0){const k=Math.floor(R()*11),th=(2*k+1)*Math.PI/11+(R()-0.5)*0.12,r=mgRw(th)-1.5-R()*2;p.x=MGC.X+Math.cos(th)*r;p.z=MGC.Z+Math.sin(th)*r;p.y=F-6+(R()-0.5)*2;
    p.vx=-Math.cos(th)*0.3;p.vz=-Math.sin(th)*0.3;p.vy=0.4+R()*0.4;p.L=p.l=3+R()*3;p.s0=3;p.s1=7;p.a0=0.35;p.c=[0.95,0.95,0.97];}
  else{const a=R()*Math.PI*2,r=R()*18;p.x=MGC.X+Math.cos(a)*r;p.z=MGC.Z+Math.sin(a)*r;p.y=F-4+(init?R()*50:0);p.vx=0.4;p.vz=0.2;p.vy=2+R()*1.5;p.L=p.l=22+R()*10;p.s0=10;p.s1=26;p.a0=0.22;p.c=[0.9,0.9,0.92];}
  p.g=0;p.dr=0;if(init)p.l=p.L*R();}
function mg3FallsTick(dt,S){const Fa=MG3D.falls;if(!Fa)return;if(Fa.tex&&Fa.tex.offset)Fa.tex.offset.y+=dt*0.9;
  if(Fa.mat.color&&Fa.mat.color.setRGB){if(S.r===3&&S.met&&!S.dead)Fa.mat.color.setRGB(1,0.85,0.5);else Fa.mat.color.setRGB(1,1,1);}
}
function mg3PlumeTick(dt){const ps=MG3D.plume;if(!ps)return;const near=MGF.band&&MGF.d<160;
  for(let i=0;i<ps.n;i++){const p=ps.P[i];if(p.kind===0&&!near){p.l=0;continue;}if(p.l<=0){mg3PlumeSeed(p,p.kind,false);}}
  const pos=ps.geo.attributes.position.array,sz=ps.geo.attributes.size.array,al=ps.geo.attributes.alpha.array,ti=ps.geo.attributes.tint.array;
  for(let i=0;i<ps.n;i++){const p=ps.P[i];if(p.l<=0){sz[i]=0;al[i]=0;continue;}p.l-=dt;const f=1-p.l/p.L;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;sz[i]=mg3Lp(p.s0,p.s1,f);al[i]=p.a0*Math.sin(Math.min(1,f)*Math.PI);ti[i*3]=p.c[0];ti[i*3+1]=p.c[1];ti[i*3+2]=p.c[2];}
  for(const a of ['position','size','alpha','tint'])ps.geo.attributes[a].needsUpdate=true;}
/* ---- R3: the six gold curtains up through the gaps, and the ember band on the live edge ---- */
function mg3CurtTex(){if(MG3.geo.curtT)return MG3.geo.curtT;const c=mg3Cv(32,128),g=c.getContext('2d');
  for(let x=0;x<32;x++){const h=Math.pow(Math.sin((x+0.5)/32*Math.PI),2.2);for(let y=0;y<128;y++){const v=h*Math.pow(1-y/128,1.5)*(0.75+0.25*Math.sin(y*0.4+x));g.fillStyle='rgba(255,255,255,'+mg3Cl(v,0,1).toFixed(3)+')';g.fillRect(x,127-y,1,1);}}
  const t=new THREE.CanvasTexture(c);MG3.geo.curtT=t;return t;}
/* the gold curtains (R3): pillars of light up through the six gaps, 3 beams per gap, each a quad turned to face the camera */
function mg3CurtBuild(){const GF=mgGF(),F=mgF(),R=mg3Rng(3131),beams=[];
  for(let k=0;k<6;k++){const th=Math.PI/6+k*Math.PI/3;for(let j=0;j<3;j++){const r=13+j*4+(R()-0.5)*1.5,a=th+(R()-0.5)*0.03;beams.push({x:MGC.X+Math.cos(a)*r,z:MGC.Z+Math.sin(a)*r,w:0.9+R()*0.9,y0:GF+1,y1:F+9+R()*6,ph:R()*6});}}
  const N=beams.length,pos=new Float32Array(N*12),uv=[],idx=[],nrm=new Float32Array(N*12);for(let i=0;i<N;i++){uv.push(0,0,1,0,1,1,0,1);const b=i*4;idx.push(b,b+1,b+2,b,b+2,b+3);}
  const geo=mg3Geo({pos,nrm,uv:new Float32Array(uv),idx}),mat=mg3DMat({map:mg3CurtTex(),color:0xffd070,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
  const mesh=mg3DAdd(new THREE.Mesh(geo,mat));mesh.frustumCulled=false;mesh.renderOrder=5;
  const NE=128,ep=new Float32Array((NE+1)*2*3),eu=[],ei=[],en=[];for(let i=0;i<=NE;i++){eu.push(i/NE*24,0,i/NE*24,1);en.push(0,1,0,0,1,0);}for(let i=0;i<NE;i++){const a=i*2;ei.push(a,a+1,a+2,a+1,a+3,a+2);}
  const egeo=mg3Geo({pos:ep,nrm:new Float32Array(en),uv:new Float32Array(eu),idx:ei}),emat=mg3DMat({map:mg3Soft(),color:0xff6a1a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
  const edge=mg3DAdd(new THREE.Mesh(egeo,emat));edge.frustumCulled=false;edge.renderOrder=4;MG3D.curt={list:[mesh],mesh,beams,geo,mat,edge,emat,egeo,er:-1,t:0};}
function mg3CurtTick(dt,S){const C=MG3D.curt;if(!C)return;C.t+=dt;const on=(S.r===3&&S.met&&!S.dead)?Math.max(S.E,S.ph==='light'?0:1):(S.ph==='light'?S.E:0);
  const o=mg3Cl(on,0,1)*(0.8+0.12*Math.sin(C.t*2.1));C.mat.opacity=o;C.mesh.visible=o>0.01;
  if(C.mesh.visible&&typeof camera!=='undefined'&&camera){const cp=camera.position,a=C.geo.attributes.position.array;
    for(let i=0;i<C.beams.length;i++){const b=C.beams[i],dx=cp.x-b.x,dz=cp.z-b.z,l=Math.hypot(dx,dz)||1,sx=-dz/l,sz=dx/l,w=b.w*(0.85+0.15*Math.sin(C.t*3+b.ph))*0.5,o3=i*12;
      a[o3]=b.x-sx*w;a[o3+1]=b.y0;a[o3+2]=b.z-sz*w;a[o3+3]=b.x+sx*w;a[o3+4]=b.y0;a[o3+5]=b.z+sz*w;a[o3+6]=b.x+sx*w;a[o3+7]=b.y1;a[o3+8]=b.z+sz*w;a[o3+9]=b.x-sx*w;a[o3+10]=b.y1;a[o3+11]=b.z-sz*w;}
    C.geo.attributes.position.needsUpdate=true;}
  /* the live edge: an ember band at MGL.edge (the outer edge of the islands being digested) */
  const er=(S.r===3&&MGL.edge&&!S.dead)?MGL.edge:0;C.edge.visible=er>0;if(er>0){C.emat.opacity=0.55+0.25*Math.sin(C.t*5);
    if(Math.abs(er-C.er)>0.01){C.er=er;const F=mgF(),a=C.egeo.attributes.position.array;for(let i=0;i<=128;i++){const t=i/128*Math.PI*2;for(let k=0;k<2;k++){const r=er-(k?1.3:0),o3=(i*2+k)*3;a[o3]=MGC.X+Math.cos(t)*r;a[o3+1]=F+0.04;a[o3+2]=MGC.Z+Math.sin(t)*r;}}C.egeo.attributes.position.needsUpdate=true;}}}
/* ---- the sun (bible 12.2, 13) */
function mg3SunBuild(){const m=new THREE.SpriteMaterial({map:mg3Soft(),color:0xfff4c8,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});m.userData={mg3own:1};
  const disc=new THREE.Sprite(m);disc.visible=false;disc.renderOrder=6;disc.name='mgSun';mg3DAdd(disc);
  const core=new THREE.Sprite(new THREE.SpriteMaterial({map:mg3Soft(),color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));core.material.userData={mg3own:1};core.visible=false;mg3DAdd(core);
  MG3D.sun={disc,core,E:0,from:null,last:0,trail:0};}
function mg3SunTick(dt,S){const U=MG3D.sun;if(!U||typeof camera==='undefined'||!camera)return;const E=mg3Cl(S.E,0,1),c=camera.position,night=typeof sunUp==='function'&&!sunUp();
  const a=timeOfDay*Math.PI*2-Math.PI*0.5,sx=Math.cos(a)*(night?-1:1),sy=Math.sin(a)*(night?-1:1),sky=[c.x+sx*380,c.y+sy*380,c.z+(night?-30:30)];
  const b=MGF.boss,rig=b&&b.mgRig,mz=rig&&rig.zone?rig.zone('throat'):null,M=mz?[mz.x,mz.y,mz.z]:[MGC.X,mgF()+1,MGC.Z];
  const moving=E>0.001&&E<0.999,dying=S.ph==='death';U.disc.visible=moving||(dying&&E>0.001&&E<0.999);U.core.visible=U.disc.visible;
  if(U.disc.visible){const e=mg3Ease(E),arc=Math.sin(e*Math.PI)*(dying?0:40);const x=mg3Lp(sky[0],M[0],e),y=mg3Lp(sky[1],M[1],e)+arc,z=mg3Lp(sky[2],M[2],e);
    U.disc.position.set(x,y,z);U.core.position.set(x,y,z);const d=Math.hypot(x-c.x,y-c.y,z-c.z),ang=night?30/380:42/380,sc=Math.max(2.4,d*ang*mg3Lp(1,0.5,e));
    U.disc.scale.set(sc*1.6,sc*1.6,1);U.core.scale.set(sc*0.7,sc*0.7,1);if(U.disc.material.color&&U.disc.material.color.set)U.disc.material.color.set(night?0xdfe6ff:0xfff0c0);
    if(dying&&MG3D.R()<0.8)mg3Burst('sun',x,y,z,{n:1,size:0.5});
    /* at night the stars stream in after the moon */
    if(night&&!dying&&MG3D.R()<dt*30){const th=MG3D.R()*Math.PI*2,ph=0.3+MG3D.R()*1.0,R0=160,p0=[c.x+Math.cos(th)*Math.cos(ph)*R0,c.y+Math.sin(ph)*R0,c.z+Math.sin(th)*Math.cos(ph)*R0];
      mg3Burst('white',p0[0],p0[1],p0[2],{n:1,dir:mg3Nz([M[0]-p0[0],M[1]-p0[1],M[2]-p0[2]]),cone:0.02,spd:120,size:0.6});}}}
/* ---- the Bone Pile: the brazier flame (lit only while a fight is open) and the earlier architects' leftovers ---- */
function mg3TopAt(x,z,y0){for(let y=y0;y>y0-12;y--){try{if(getBlock(x,y,z)!==B.AIR)return y+1;}catch(err){return y0;}}return y0-11;}
function mg3BoneProps(){const b=mgBonePile(),G=mgG(),bx=Math.floor(MGC.X-41),bz=Math.floor(MGC.Z+2);
  const fl=new THREE.Sprite(new THREE.SpriteMaterial({map:mg3Soft(),color:0xffa040,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));fl.material.userData={mg3own:1};fl.visible=false;mg3DAdd(fl);
  MG3D.brazier={fl,x:bx+0.5,z:bz+0.5,y:null,t:0};
  const P_=[],mk=(g,x,z,ry,rx)=>{g.position.set(x,0,z);g.rotation.set(rx||0,ry||0,0);mg3DAdd(g);P_.push(g);return g;},iron=new THREE.MeshLambertMaterial({color:0x6a5a4a});iron.userData={mg3own:1};
  for(let i=0;i<3;i++){const h=new THREE.Group();const c=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.34,0.62),iron);c.position.y=0.17;h.add(c);const v=new THREE.Mesh(new THREE.BoxGeometry(0.66,0.1,0.2),iron);v.position.set(0,0.28,0.3);h.add(v);mk(h,MGC.X-43+i*1.3,MGC.Z-1.6+i*0.9,i*1.3,0.4*(i-1));}
  const sw=new THREE.Group(),bl=new THREE.MeshLambertMaterial({color:0x9a9aa0});bl.userData={mg3own:1};const s1=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.06,1.0),bl);s1.position.set(0,0.05,0.2);sw.add(s1);const s2=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.08,0.08),iron);s2.position.set(0,0.05,-0.35);sw.add(s2);mk(sw,MGC.X-40.6,MGC.Z-2.2,0.7);
  if(typeof buildHat==='function'){const t=buildHat('tophat');mk(t,MGC.X-42.4,MGC.Z+1.4,0.4,0.5);const k=buildHat('crown');mk(k,MGC.X-39.4,MGC.Z+0.8,-0.6,-0.3);}
  MG3D.props=P_;}
function mg3BoneTick(dt,S){const Z=MG3D.brazier;if(!Z)return;if(Z.y==null&&MGF.d<70){Z.y=mg3TopAt(Math.floor(Z.x),Math.floor(Z.z),mgG()+6);
    for(const p of MG3D.props){p.position.y=mg3TopAt(Math.floor(p.position.x),Math.floor(p.position.z),mgG()+6)-0.05;}}
  const lit=Z.y!=null&&!S.dead&&(S.live||S.met);Z.fl.visible=lit;if(lit){Z.t+=dt;const f=1+0.18*Math.sin(Z.t*17)+0.1*Math.sin(Z.t*31);Z.fl.position.set(Z.x,Z.y+0.7,Z.z);Z.fl.scale.set(1.3*f,1.9*f,1);
    if(MG3D.R()<dt*6)mg3Burst('ember',Z.x,Z.y+0.6,Z.z,{n:1,spd:1.2});}}
/* the fossils of the burial (Ldead): the left horn and the bedrock-cube tail stick out of the mound, weathered grey */
function mg3FossilBuild(){const F=mgF(),GP=mg3Parts(0.5),bone=new THREE.MeshLambertMaterial({color:0x8a857a,vertexColors:true});bone.userData={mg3own:1};const g=new THREE.Group();g.name='mgFossil';
  const h=new THREE.Mesh(GP.horns,bone);h.userData.shared=1;h.position.set(MGC.X+1.5,F-6.2,MGC.Z-1.0);h.rotation.set(-0.5,0.8,0.35);h.scale.set(1.2,1.2,1.2);g.add(h);
  const c=new THREE.Mesh(GP.cube,typeof matOp!=='undefined'&&matOp?matOp:bone);c.userData.shared=1;c.position.set(MGC.X-5.5,F-7.2,MGC.Z+3.5);c.rotation.set(0.4,0.6,0.2);g.add(c);
  const tl=new THREE.Mesh(mg3Geo(mg3Loft({pts:[[0,-1.5,0],[0,0,0.2],[0,0.8,0.8]],n:8,m:10,up:[0,0,1],prof:(t,a)=>{const r=mg3Lp(0.6,0.95,t);return [Math.cos(a)*r,Math.sin(a)*r];},col:()=>[0.75,0.72,0.66]})),bone);
  tl.position.set(MGC.X-5.5,F-8.6,MGC.Z+3.5);tl.rotation.set(0.4,0.6,0.2);g.add(tl);g.visible=false;mg3DAdd(g);MG3D.fossil=g;}
/* ---- per-frame: dressing + the scene pictures (driven by MGL.phase + CUT.t) ---- */
function mg3DressTick(dt){if(DIM!=='over')return;if(!MG3D.G)mg3DressBuild();if(!MG3D.G)return;const S=mg3Grade();
  mg3RingTick(dt,S);
  const near=MGF.d<160&&MGF.band;
  if(MG3D.iris){for(const q of MG3D.iris.it)q.piv.visible=near&&(!q.gone||!!q.fly);if(near)mg3IrisTick(dt,S);}
  if(MG3D.bile){MG3D.bile.m.visible=near;MG3D.bile.glow.visible=near&&MG3D.bile.glow.visible;if(near)mg3BileTick(dt,S);}
  if(MGF.band&&!MG3D.b2)mg3DressBuild2();mg3PlumeTick(dt);
  if(MG3D.falls){for(const s of MG3D.falls.sheets)s.m.visible=MGF.d<200;mg3FallsTick(dt,S);}
  if(MG3D.curt){if(near)mg3CurtTick(dt,S);else{MG3D.curt.mesh.visible=false;MG3D.curt.edge.visible=false;}}
  mg3SunTick(dt,S);mg3BoneTick(dt,S);if(MG3D.fossil)MG3D.fossil.visible=near&&S.L==='Ldead'&&S.ph!=='death';
  /* the approach (bible 2): ash flakes inside 140 m; the throat's steam and embers in R1 */
  if(MGF.d<140&&!S.dead&&typeof camera!=='undefined'&&camera){MG3D.ashT+=dt*mg3Sm(140,60,MGF.d)*18;while(MG3D.ashT>1){MG3D.ashT-=1;const R=MG3D.R,c=camera.position;mg3Burst('ash',c.x+(R()-0.5)*36,c.y+8+R()*6,c.z+(R()-0.5)*36,{n:1});}}
  if(near&&S.met&&!S.dead&&S.r===1){MG3D.steamT+=dt*6;while(MG3D.steamT>1){MG3D.steamT-=1;const R=MG3D.R,a=R()*Math.PI*2,r=R()*5;mg3Burst(R()<0.35?'ember':'steam',MGC.X+Math.cos(a)*r,mgF()-3,MGC.Z+Math.sin(a)*r,{n:1,dir:[0,1,0],cone:0.25,spd:R()<0.35?5:3});}}
  mg3ScenePics(dt,S);}
function mg3ScenePics(dt,S){const ph=CUT.on&&CUT.script?S.ph:'';if(ph!==MG3D.ph){MG3D.ph=ph;MG3D.pt=-1;MG3D.geyser=0;}const t=CUT.on?CUT.t:0,lt=MG3D.pt;MG3D.pt=t;if(!ph)return;
  const cross=x=>lt<x&&t>=x,b=MGF.boss,rig=b&&b.mgRig,F=mgF(),full=CUT.script&&CUT.script.end>(ph==='intro'?8:(ph==='light'?6:(ph==='climb'?4:0)));
  const Z=n=>{const z=rig&&rig.zone?rig.zone(n):null;return z?[z.x,z.y,z.z]:[MGC.X,F+2,MGC.Z];};
  if(ph==='intro'){const t0=full?1.5:0.05;if(t>t0&&t<t0+2.2&&MG3D.R()<0.7){const R=MG3D.R,a=R()*Math.PI*2,r=R()*5;mg3Burst(R()<0.5?'steam':'ember',MGC.X+Math.cos(a)*r,F-1,MGC.Z+Math.sin(a)*r,{n:2,dir:[0,1,0],cone:0.2,spd:9});}
    if(cross(full?3.5:0.9)){const p=Z('palmL');mg3Burst('dust',p[0],F+0.3,p[2],{n:24,r:2.5,spd:4});}
    if(full&&t>13&&t<14.5&&MG3D.R()<0.5){const m=Z('mouth');mg3Burst('ember',m[0],m[1],m[2],{n:2,spd:2});}}
  if(ph==='climb'){if(cross(full?1.0:0.4)){for(let i=0;i<48;i++){const a=i/48*Math.PI*2;mg3Burst('dust',MGC.X+Math.cos(a)*16,F+0.4,MGC.Z+Math.sin(a)*16,{n:2,r:3,spd:6});}}}
  if(ph==='light'){const tc=full?3.5:1.2;if(t>tc&&t<tc+1.2){const k=(t-tc)/1.2;for(let j=0;j<6;j++){const th=Math.PI/6+j*Math.PI/3,r=12+k*12;if(MG3D.R()<0.6)mg3Burst('spark',MGC.X+Math.cos(th)*r,F+0.2,MGC.Z+Math.sin(th)*r,{n:3,spd:6});}}
    if(cross(full?0.6:0.2)){const cs=[];for(let i=0;i<40;i++){const R=MG3D.R,a=R()*Math.PI*2,r=R()*11;cs.push({id:[B.OBSIDIAN||B.STONE,B.COBBLE,B.DIRT][i%3],x:MGC.X+Math.cos(a)*r,y:F+3+R()*4,z:MGC.Z+Math.sin(a)*r,vx:(R()-0.5)*3,vy:R()*3,vz:(R()-0.5)*3,s:0.6+R()*0.4,life:3.5});}mg3Cubes2(cs);}}
  if(ph==='death'){if(cross(0.3)){}
    if(t>=1.6&&t<4.5&&MG3D.geyser<150){const m=Z('mouth'),R=MG3D.R,ids=[B.GRASS,B.DIRT,B.STONE,B.LOG_O,B.PLANK_O,B.COBBLE,B.SAND,B.COAL_ORE,B.IRON_ORE,B.WOOL,B.BRICK,B.GLASS],cs=[];
      const n=Math.min(150-MG3D.geyser,Math.ceil(dt*60));for(let i=0;i<n;i++){const a=R()*Math.PI*2,s=4+R()*10;cs.push({id:ids[Math.floor(R()*ids.length)],x:m[0],y:m[1],z:m[2],vx:Math.cos(a)*s*0.5,vy:12+R()*12,vz:Math.sin(a)*s*0.5,s:0.5+R()*0.6,life:4,floor:mgGF()});}
      MG3D.geyser+=n;mg3Cubes2(cs);if(MG3D.R()<0.5)mg3Burst('smoke',m[0],m[1],m[2],{n:2,spd:3});}
    if(cross(1.5)){const m=Z('mouth');mg3Burst('flash',m[0],m[1],m[2],{});mg3Burst('gold',m[0],m[1],m[2],{n:40,spd:12});}
    if(t>8&&t<9&&MG3D.R()<0.6){const R=MG3D.R,a=R()*Math.PI*2,r=R()*10;mg3Burst('dust',MGC.X+Math.cos(a)*r,mgGF()+4,MGC.Z+Math.sin(a)*r,{n:3,r:2,spd:2});}}}
/* one-shot pictures M1/M2 may fire (all optional): 'poke' (the iris clacks), 'dust'(x,y,z,r), 'chomp' */
function mg3Event(n,o){o=o||{};if(n==='poke'&&MG3D.iris){for(const q of MG3D.iris.it)q.clack=1;}
  else if(n==='dust'){for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=o.r||3;mg3Burst('dust',o.x+Math.cos(a)*r,o.y||mgF()+0.3,o.z+Math.sin(a)*r,{n:1,spd:3});}}
  else if(n==='chomp')mg3Chomp(o.dur);}
function mg3Dress(st){}
function mg3Scene(n,t,o){}
/* ---- THE CUTSCENE CAMERAS (bible 6, 12, 13) */
var MG3CAM={
  intro:[[0,'dan'],[1.5,'low',[-14,1.5,-6],[0,3,0]],[3.5,'crane',[-12,5,9],'palmL'],[5.5,'tilt',[-18,2,10],'head'],[8,'belly'],[10,'behind'],[13,'mouth'],[15,'dan']],
  introS:[[0,'dan'],[0.3,'low',[-14,1.5,-6],[0,4,0]],[1.4,'mouth'],[3.6,'dan']],
  climb:[[0,'medium'],[1,'low',[-16,1.2,4],[8,1,0]],[2.2,'tilt',[-10,1.5,14],'horns'],[3,'wide'],[4.6,'mouth'],[5.4,'wide'],[6,'dan']],
  climbS:[[0,'wide'],[1.2,'mouth'],[2.4,'wide'],[3,'dan']],
  light:[[0,'medium'],[2,'island',[-20,2,6],[0,-4,0]],[3.5,'low',[-18,1,-10],[0,0,0]],[5,'up'],[5.5,'wide2'],[9.6,'dan']],
  lightS:[[0,'medium'],[1.2,'up'],[1.8,'wide2'],[3.8,'dan']],
  death:[[0,'face'],[1.5,'wide2'],[4.5,'wide3'],[8,'wide4'],[10,'dan2']]};
function mg3CamKey(k,r,F){const W=n=>{const z=r&&r.zone?r.zone(n):null;return z?[z.x,z.y,z.z]:[MGC.X,F+6,MGC.Z];},D=[P.x,P.y+P.eyeY,P.z],C=[MGC.X,F,MGC.Z];
  const toDan=()=>{const dx=P.x-MGC.X,dz=P.z-MGC.Z,l=Math.hypot(dx,dz)||1;return [dx/l,dz/l];};const u=toDan(),side=[-u[1],u[0]];
  if(k[1]==='dan'){const h=W('head');return {p:D,l:[h[0],h[1],h[2]]};}
  if(k[1]==='dan2'||k[1]==='behind'){const h=W('head'),dx=D[0]-h[0],dz=D[2]-h[2],dl=Math.hypot(dx,dz)||1,dd=Math.max(dl+(k[1]==='dan2'?6:4),k[1]==='dan2'?16:12);
    return {p:[h[0]+dx/dl*dd,Math.max(D[1]+2.2,h[1]-1),h[2]+dz/dl*dd],l:k[1]==='dan2'?[MGC.X,F+2,MGC.Z]:[h[0],h[1],h[2]]};}
  if(Array.isArray(k[2])){const o=k[2];const p=[C[0]+u[0]*(-o[0])+side[0]*o[2],F+o[1],C[2]+u[1]*(-o[0])+side[1]*o[2]];let l;
    if(typeof k[3]==='string')l=W(k[3]);else{const q=k[3];l=[C[0]+u[0]*q[0]+side[0]*q[2],F+q[1],C[2]+u[1]*q[0]+side[1]*q[2]];}return {p,l};}
  const h=W('head'),m=W('mouth'),b=W('belly'),ch=W('chest');
  /* MZ: framed from Dan's side of the subject; when Dan is right at it (inside the gag mouth at the kill) that side is undefined and the
     face shot ended up behind his head in the Strata, so then the shot comes from the way his face points */
  const fr=(t,d,up,sd)=>{let dx=D[0]-t[0],dz=D[2]-t[2],l=Math.hypot(dx,dz);const bb=MGF.boss;if(l<6&&bb){dx=Math.sin(bb.yaw||0);dz=Math.cos(bb.yaw||0);l=1;}l=l||1;
    return [t[0]+dx/l*d+(-dz/l)*(sd||0),t[1]+(up||0),t[2]+dz/l*d+(dx/l)*(sd||0)];};
  switch(k[1]){case 'belly':return {p:fr(b,13,2.5,5),l:b};case 'face':return {p:fr(h,11,1.5,4),l:h};case 'mouth':return {p:fr(m,8,0.8,2.2),l:m};
    case 'mouthC':return {p:fr(m,4.5,0.3,0.6),l:W('throat')};case 'medium':return {p:fr(ch,18,2,6),l:ch};case 'wide':return {p:fr(C,32,9,-10),l:[ch[0],ch[1]-2,ch[2]]};
    case 'horns':return {p:fr(h,10,-6,5),l:[h[0],h[1]+2,h[2]]};case 'up':return {p:fr(m,4.5,-2.5,1.2),l:[m[0],m[1]+30,m[2]]};   /* MZ: 7 m out put the camera inside the plate past r 12 (a black frame) */
    case 'wide2':return {p:fr(C,26,3,-8),l:[h[0],h[1]+6,h[2]]};case 'wide3':return {p:fr(C,30,14,8),l:[MGC.X,F-4,MGC.Z]};case 'wide4':return {p:fr(C,22,9,-12),l:[MGC.X,F-8,MGC.Z]};case 'gut':return {p:fr(C,20,4,0),l:[MGC.X,mgGF()+2,MGC.Z]};}
  return {p:D,l:h};}
/* each key is a SHOT held until the next one (a hard cut, never a dolly through his body), with a slow push-in a */
function mg3Cam(k,full){const L=MG3CAM[(full===false&&MG3CAM[k+'S'])?k+'S':k];if(!L)return null;const cur={p:[0,0,0],l:[0,0,0]},from={p:null};
  return function(t){if(typeof camera==='undefined'||!camera)return;const b=MGF.boss,r=b&&b.mgRig,F=mgF();let i=0;while(i<L.length-1&&L[i+1][0]<=t)i++;const a=L[i],nx=L[Math.min(L.length-1,i+1)];
    const K=mg3CamKey(a,r,F),dur=Math.max(0.3,(nx===a?1:nx[0]-a[0])),u=mg3Cl((t-a[0])/dur,0,1),push=0.1*mg3Ease(u);
    for(let q=0;q<3;q++){cur.l[q]=K.l[q];cur.p[q]=mg3Lp(K.p[q],K.l[q],push);}
    if(i===L.length-1&&L.length>1){const Pk=mg3CamKey(L[L.length-2],r,F),e=mg3Ease(mg3Cl((t-a[0])/0.6,0,1));for(let q=0;q<3;q++){cur.p[q]=mg3Lp(mg3Lp(Pk.p[q],Pk.l[q],0.1),K.p[q],e);cur.l[q]=mg3Lp(Pk.l[q],K.l[q],e);}}
    if(a[1]!=='dan')mg3CamClear(cur.p,cur.l,F);
    if(!from.p)from.p=[camera.position.x,camera.position.y,camera.position.z];if(t<0.5){const e=mg3Ease(t/0.5);for(let q=0;q<3;q++)cur.p[q]=mg3Lp(from.p[q],cur.p[q],e);}
    const hx=mg3N3(t*0.4,0.5,0,77)*0.2,hy=mg3N3(t*0.4,1.5,0,78)*0.14;camera.position.set(cur.p[0]+hx,cur.p[1]+hy,cur.p[2]);
    const vx=cur.l[0]-cur.p[0],vy=cur.l[1]-cur.p[1],vz=cur.l[2]-cur.p[2],vl=Math.hypot(vx,vy,vz)||1;camera.rotation.y=Math.atan2(-vx,-vz);camera.rotation.x=Math.asin(mg3Cl(vy/vl,-1,1));camera.rotation.z=0;};}
/* MZ: never frame a shot through the world. A spire, a cottage wall or a lip block on the first part of the line from the camera to its
   subject pulls the camera forward past it (a spring arm), so a scripted shot never stares into a stone block (QA: THE LIGHT's island
   shot held a spire for 1.3 s). The subject end of the line is never touched (gut shots look through the plate on purpose); Dan's own
   eye ('dan') is never moved. Only cells at or above the plate's top (y >= F) occlude: the floor never does (shots that look down into
   the hole cross it on purpose; counting it pulled THE LIGHT's island shot under the plate). Cutscenes only: <= 64 getBlock samples a frame. */
function mg3CamClear(p,l,F){const dx=l[0]-p[0],dy=l[1]-p[1],dz=l[2]-p[2],d=Math.hypot(dx,dy,dz);if(d<2.5)return;
  const n=Math.min(d*0.55,16),ux=dx/d,uy=dy/d,uz=dz/d,fy=Math.floor(F);let last=-1;
  for(let s=0;s<=n;s+=0.25){const y=Math.floor(p[1]+uy*s);if(y<fy)continue;let sol=false;try{const id=getBlock(Math.floor(p[0]+ux*s),y,Math.floor(p[2]+uz*s));sol=id!==B.AIR&&!!DEFS[id]&&DEFS[id].solid!==false;}catch(err){sol=false;}if(sol)last=s;}
  if(last<0)return;const k=Math.min(last+0.7,d-2);p[0]+=ux*k;p[1]+=uy*k;p[2]+=uz*k;}
/* ---- THE OG VALUE SCRIPT (bible 19.1) */
var MG3SKY={R1:[0x6a/255,0x2c/255,0x18/255],R2:[0x5a/255,0x1a/255,0x14/255],R3:[0x12/255,0x08/255,0x08/255],ASH:[0x4a/255,0x3a/255,0x40/255],ASHBG:[0x6a/255,0x5a/255,0x64/255],R3BG:[0x0a/255,0x04/255,0x08/255]};
MG3.isHR=function(){return !!(MGREG.hrOn&&MGREG.hrOn());};
function mg3Sky(dt){const K=MG3D.sk;if(DIM!=='over'){if(MG3D.G||MG3T.live)mg3Far();K.on=0;return;}
  if(!MGF.near||MG3.isHR()||typeof scene==='undefined'||!scene||!scene.fog){K.w=0;K.on=0;return;}
  const S=mg3Grade(),wd=mg3Sm(MGC.R_GRADE,40,MGF.d),r=S.dead?0:(S.live||S.met?S.r:0),E=S.dead?0:mg3Cl(Math.max(S.E,r===3&&S.ph!=='light'&&S.ph!=='death'?1:0),0,1);
  const tw=S.dead&&S.ph!=='death'?0:wd;K.w+=(tw-K.w)*Math.min(1,dt*0.9);K.E+=(E-K.E)*Math.min(1,dt*(S.ph==='light'||S.ph==='death'?6:1.2));if(K.w<0.002&&K.E<0.002)return;
  const w=K.w,e=K.E,base=r===1?MG3SKY.R1:(r===2||r===3?MG3SKY.R2:MG3SKY.ASH);
  const fc=scene.fog.color,bg=scene.background;let tr=mg3Lp(fc.r,base[0],w*(r?0.85:0.6)),tg=mg3Lp(fc.g,base[1],w*(r?0.85:0.6)),tb=mg3Lp(fc.b,base[2],w*(r?0.85:0.6));
  tr=mg3Lp(tr,MG3SKY.R3[0],e*w);tg=mg3Lp(tg,MG3SKY.R3[1],e*w);tb=mg3Lp(tb,MG3SKY.R3[2],e*w);fc.setRGB(tr,tg,tb);
  const bb=r?base:MG3SKY.ASHBG;bg.setRGB(mg3Lp(mg3Lp(bg.r,bb[0],w*0.55),MG3SKY.R3BG[0],e*w),mg3Lp(mg3Lp(bg.g,bb[1],w*0.55),MG3SKY.R3BG[1],e*w),mg3Lp(mg3Lp(bg.b,bb[2],w*0.55),MG3SKY.R3BG[2],e*w));
  const far=r?mg3Lp(scene.fog.far,90,w):scene.fog.far*(1-0.25*w);scene.fog.far=mg3Lp(far,55,e*w);scene.fog.near=mg3Lp(Math.min(scene.fog.near,scene.fog.far*0.4),8,e*w);
  if(typeof ambL!=='undefined'&&ambL){if(r)ambL.intensity=Math.max(ambL.intensity,mg3Lp(ambL.intensity,0.5,w));ambL.intensity=mg3Lp(ambL.intensity,0.45,e*w);}
  if(typeof sunL!=='undefined'&&sunL)sunL.intensity*=mg3Lp(1,0.05,e*w);
  const eat=e*w>0.02;if(typeof sunSpr!=='undefined'&&sunSpr&&eat&&(typeof sunUp!=='function'||sunUp()))sunSpr.visible=false;if(typeof moonSpr!=='undefined'&&moonSpr&&eat&&typeof sunUp==='function'&&!sunUp())moonSpr.visible=false;
  if(typeof stars!=='undefined'&&stars&&stars.material)stars.material.opacity*=(1-e*w);K.on=1;}
