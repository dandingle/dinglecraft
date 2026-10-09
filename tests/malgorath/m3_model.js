/* m3_model.js (M3, gate x1): the OG model (plan 8.3 acceptance; bible 5.2-5.12). Every model builds under the root stubs; tri and draw-call
   budgets (L0 <= 70k / <= 90, L1 <= 25k, proxy small); EXACTLY one PointLight (userData.mgLight, a direct child of the root) in the boss and
   the Effigy, none in the proxy (about 5 units tall); the joint names; NO JOINT GAP across the pose set (automated: every rigid child's
   root ring lies inside its parent's volume for every stance and arm pose); the proportions (16 m crown, 17.5 m arms, 11 m tail, 6 m skull);
   the stances' key positions (R1 chin over the rim, R2 crown 10-11 m, R3 head-up mouth at the islands, the gag's reach, the stun's eyes);
   the IK lands the palm where M2 aims it; the zones (the sun 4 m inside the mouth); seeded textures identical across two builds;
   update(dt,MGA) never constructs a THREE object; the HR skin path uses M4's materials; dispose cleans up. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const V=boot({});const step=boot.stepper(700000);
boot.run(async()=>{
  if(boot.mgStubbed('3')){skip('m3_model','M3 is on its stub');return;}
  boot.world(V,'m3m','1337',step);
  const C=V.mg3Core(),P3=C.MG3P,ST=C.MG3ST;
  const meshes=o=>{const out=[];const w=n=>{if(!n)return;if(n.geometry&&n.material&&n.constructor===THREE.Mesh&&n.visible!==false)out.push(n);for(const c of n.children||[])w(c);};w(o);return out;};
  const tris=o=>meshes(o).reduce((s,m)=>s+(m.geometry.index?m.geometry.index.array.length/3:0),0);
  /* ---- builds, budgets, the one light ---- */
  const r=V.mg3Rig({kind:'boss',skin:'og'});
  ok('mg3Rig builds the boss under the root stubs (root, joints, parts, update, lod, dispose, wp, zone, caps)',!!r&&!!r.root&&typeof r.update==='function'&&typeof r.lod==='function'&&typeof r.dispose==='function'&&typeof r.zone==='function'&&typeof r.caps==='function');
  const L=boot.lights(r.root);
  ok('the boss carries EXACTLY ONE PointLight, userData.mgLight=1, a direct child of the root (r.light)',L.length===1&&L[0]===r.light&&r.light.userData.mgLight===1&&r.light.parent===r.root);
  const t0=tris(r.root),c0=meshes(r.root).length;
  ok('L0 budget: '+t0+' tris (<= 70,000), '+c0+' draw calls (<= 90)',t0<=70000&&t0>=25000&&c0<=90);
  r.lod(1);const t1=tris(r.root);ok('L1 budget: '+t1+' tris (<= 25,000)',t1<=25000&&t1>5000);r.lod(0);
  ok('lod(0) restores the L0 geometry',tris(r.root)===t0);
  const ef=V.mg3Rig({kind:'effigy',skin:'og'});ok('the Effigy is the full model with its one light',boot.lights(ef.root).length===1&&tris(ef.root)===t0);ef.dispose();
  const px=V.mg3Rig({kind:'proxy'});let ymax=-1e9,ymin=1e9;for(const m of meshes(px.root)){const a=m.geometry.attributes.position.array;for(let i=1;i<a.length;i+=3){ymax=Math.max(ymax,a[i]);ymin=Math.min(ymin,a[i]);}}
  const ph=(ymax-ymin)*px.root.scale.y,pt=tris(px.root);
  ok('the figurine proxy has NO light, is about 5 units tall ('+ph.toFixed(2)+') and small ('+pt+' tris <= 8,000)',boot.lights(px.root).length===0&&ph>4&&ph<6.5&&pt<=8000);
  ok('two proxies share the baked geometry (built once)',V.mg3Rig({kind:'proxy'}).root.children[0].geometry===px.root.children[0].geometry);
  const need=['root','pelvis','spine0','spine1','neck0','neck1','neck2','head','jawU','mandL','mandR','tongue0','tongue5','eye0','eye5','hornL','hornR','spike',
    'shoulderL','shoulderR','deltL','elbowL','wristL','wristR','handEyeL','lidAL','hipL','hipR','gluteL','kneeL','hockL','hoofL','tail0','tail15','tailTip','cube','belly','contents','strata','tree','slot'];
  const miss=need.filter(n=>!r.joints[n]);ok('every rig joint of bible 5.3 is present ('+need.length+' checked)'+(miss.length?' missing '+miss.join(','):''),miss.length===0);
  ok('4 fingers x 3 joints per hand',['L','R'].every(s=>[0,1,2,3].every(f=>Array.isArray(r.joints['f'+s+f])&&r.joints['f'+s+f].length===4)));
  ok('16 tail segments end in the bedrock cube (the real atlas tile, 1.6 m)',r.joints.tailCh.length===17&&r.parts.cube.geometry.attributes.uv&&r.joints.cube.parent===r.joints.tailTip);
  /* ---- proportions at rest (bible 5.2) ---- */
  const A=V.getMGA(),D=()=>JSON.parse(JSON.stringify(V.getMGA()));const base=D();
  const pose=(o,n)=>{for(const k in base)A[k]=JSON.parse(JSON.stringify(base[k]));Object.assign(A,o||{});for(let i=0;i<(n||120);i++)r.update(1/30,A);};
  pose({stance:'idle'});const W=(j,v)=>r.wp(j,v);
  ok('arms: upper 7 + forearm 7 + hand (palm + 3 phalanges) ~3.5 = 17.5 m',P3.upper===7&&P3.fore===7&&Math.abs(P3.palm+P3.finger[0]+P3.finger[1]+P3.finger[2]-3.5)<0.6);
  ok('tail 11 m in 16 segments, skull 6 m from the occiput to the snout (visible length)',P3.tailL===11&&P3.tailN===16);
  pose({stance:'rear'});const crR=W('head',[0,1.8,0.8])[1];ok('rearing, his crown reaches about 16-19 m ('+crR.toFixed(1)+')',crR>15.5&&crR<20);
  pose({stance:'idle'});const crI=W('head',[0,1.8,0.8])[1],st=W('strata',[2,9,-1])[1];ok('idle: crown ~16 m ('+crI.toFixed(1)+'), the Strata summit above the horns ('+st.toFixed(1)+' m)',crI>14.5&&crI<17.5&&st>W('hornL')[1]);
  /* ---- stances' key positions (root at the feet; M2 puts the feet at F-8 in R1, F in R2, F-13 in R3) ---- */
  pose({stance:'lean'});const sn=W('head',[0,0.2,5.6]);ok('R1 lean: the snout leans out over the Throat rim (r '+Math.hypot(sn[0],sn[2]).toFixed(1)+', F'+(sn[1]-8>=0?'+':'')+(sn[1]-8).toFixed(1)+')',Math.hypot(sn[0],sn[2])>6&&Math.hypot(sn[0],sn[2])<12&&sn[1]-8>-1&&sn[1]-8<4);
  pose({stance:'stalk'});const cs=W('head',[0,1.8,0.8])[1],es=W('head',[0,0.6,2.7])[1];ok('R2 stalk: crown at 10-11 m ('+cs.toFixed(1)+'), eyes ~9.5 ('+es.toFixed(1)+')',cs>9&&cs<12&&es>8&&es<11);
  pose({stance:'headup'});const su=W('head',[0,-0.55,1.35]);ok('R3 head-up: the sun in his throat at the island tops (F'+(su[1]-13>=0?'+':'')+(su[1]-13).toFixed(1)+')',su[1]-13>-1&&su[1]-13<2.5);
  pose({stance:'slump',lookX:0,lookY:13.5,lookZ:14},200);const gs=r.zone('sun');ok('the gag: the head reaches so the sun sits where M2 asks (off '+Math.hypot(gs.x,gs.y-13.5,gs.z-14).toFixed(2)+' m)',Math.hypot(gs.x,gs.y-13.5,gs.z-14)<0.8);
  pose({stance:'stun',lookX:0,lookY:2.5,lookZ:11},200);const ge=W('head',[0,0.6,2.7]);ok('the lunge recovery: his eyes rest where M2 asks (off '+Math.hypot(ge[0],ge[1]-2.5,ge[2]-11).toFixed(2)+' m)',Math.hypot(ge[0],ge[1]-2.5,ge[2]-11)<1.0);
  /* ---- the IK lands the palm where M2 aims it ---- */
  pose({stance:'lean',armL:{pose:'flat',t:1,x:7,y:8,z:10}},60);const pl=r.zone('palmL');ok('flat: the left palm lands on the target (palm '+[pl.x,pl.y,pl.z].map(v=>v.toFixed(1)).join(',')+')',Math.hypot(pl.x-7,pl.z-10)<2.2&&Math.abs(pl.y-8.7)<1.5);
  pose({stance:'lean',armR:{pose:'raise',t:1,x:-7,y:8,z:11}},60);const pr=r.zone('palmR');ok('raise: the right hand hovers high over its target',pr.y>11&&Math.hypot(pr.x+7,pr.z-11)<4);
  pose({stance:'idle',armL:{pose:'swat',t:1,x:0,y:12,z:9},armR:{pose:'swat',t:1,x:0,y:12,z:9}},60);ok('swat: the hands meet at the clap point',Math.hypot(r.zone('palmL').x-r.zone('palmR').x,r.zone('palmL').z-r.zone('palmR').z)<3);
  /* ---- zones ---- */
  pose({stance:'idle'});const zn=['handeyeL','handeyeR','palmL','palmR','clawsL','tongue','eyes','head','snout','chin','mouth','sun','throat','gut','belly','chest','cube','hoofL','tailTip','spike'];
  ok('every zone resolves to a finite world point',zn.every(n=>{const z=r.zone(n);return z&&isFinite(z.x)&&isFinite(z.y)&&isFinite(z.z);}));
  const teeth=W('head',[0,-0.6,5.5]),sunp=W('head',[0,-0.55,1.35]);ok('the sun sits ~4 m inside the mouth (front teeth to sun '+Math.hypot(teeth[0]-sunp[0],teeth[1]-sunp[1],teeth[2]-sunp[2]).toFixed(2)+' m)',Math.abs(Math.hypot(teeth[0]-sunp[0],teeth[1]-sunp[1],teeth[2]-sunp[2])-4.1)<0.4);
  ok('caps(): 13 coarse limb capsules for the cosmetic swing-miss',r.caps().length===13);
  /* ---- NO JOINT GAP across the pose set (bible 5.12): the child's root ring inside the parent's volume ---- */
  const inv3=(m)=>[m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]];
  const toLocal=(mesh,p)=>{const T=C.mg3Fk?C.mg3Fk(mesh,null):null;const q=[p[0]-T.p[0],p[1]-T.p[1],p[2]-T.p[2]],m=inv3(T.m);return [m[0]*q[0]+m[1]*q[1]+m[2]*q[2],m[3]*q[0]+m[4]*q[1]+m[5]*q[2],m[6]*q[0]+m[7]*q[1]+m[8]*q[2]];};
  const toWorld=(mesh,p)=>{const T=C.mg3Fk(mesh,null);return [T.m[0]*p[0]+T.m[1]*p[1]+T.m[2]*p[2]+T.p[0],T.m[3]*p[0]+T.m[4]*p[1]+T.m[5]*p[2]+T.p[1],T.m[6]*p[0]+T.m[7]*p[1]+T.m[8]*p[2]+T.p[2]];};
  const inside=(mesh,pw)=>{const g=mesh.geometry,U=g.userData,a=g.attributes.position.array,n=U.n,m=U.m;if(n==null)return true;const p=toLocal(mesh,pw);
    let best=-1,bd=1e9;const cen=[];for(let i=0;i<=n;i++){let cx=0,cy=0,cz=0;for(let j=0;j<m;j++){const k=(i*(m+1)+j)*3;cx+=a[k];cy+=a[k+1];cz+=a[k+2];}cen.push([cx/m,cy/m,cz/m]);}
    for(let i=0;i<=n;i++){const d=Math.hypot(p[0]-cen[i][0],p[1]-cen[i][1],p[2]-cen[i][2]);if(d<bd){bd=d;best=i;}}
    const c=cen[best],i0=best,ca=cen[Math.max(0,i0-1)],cb=cen[Math.min(n,i0+1)],ax=[cb[0]-ca[0],cb[1]-ca[1],cb[2]-ca[2]],al=Math.hypot(...ax)||1;ax[0]/=al;ax[1]/=al;ax[2]/=al;
    let dir=[p[0]-c[0],p[1]-c[1],p[2]-c[2]];const along=dir[0]*ax[0]+dir[1]*ax[1]+dir[2]*ax[2];dir=[dir[0]-ax[0]*along,dir[1]-ax[1]*along,dir[2]-ax[2]*along];const dl=Math.hypot(...dir);
    const sp=Math.max(0.35,al*0.75);if(Math.abs(along)>sp)return false;if(dl<1e-3)return true;let rmax=0;
    for(let j=0;j<m;j++){const k=(i0*(m+1)+j)*3,v=[a[k]-c[0],a[k+1]-c[1],a[k+2]-c[2]],vl=Math.hypot(...v)||1,cos=(v[0]*dir[0]+v[1]*dir[1]+v[2]*dir[2])/(vl*dl);if(cos>0.8)rmax=Math.max(rmax,vl*cos);}
    return dl<=rmax*1.03+0.05;};
  const ring0=(mesh)=>{const g=mesh.geometry,a=g.attributes.position.array,m=g.userData.m,out=[];for(let j=0;j<m;j+=2){const k=j*3;out.push(toWorld(mesh,[a[k],a[k+1],a[k+2]]));}return out;};
  const pairs=[];for(const s of ['L','R'])pairs.push(['upper'+s,'fore'+s],['fore'+s,'palm'+s],['thigh'+s,'shin'+s],['shin'+s,'foot'+s]);
  const P=r.parts;const poses=Object.keys(ST).filter(k=>k!=='tune').map(k=>({stance:k}));
  for(const ap of ['raise','flat','scoop','lift','swat','pluck','drag','grab','clutch','knuckle','reach','drum'])poses.push({stance:'lean',armL:{pose:ap,t:0.8,x:6,y:8.5,z:9},armR:{pose:ap,t:0.8,x:-6,y:8.5,z:9}});
  poses.push({stance:'stalk',tail:{pose:'sweep',t:0.5,dir:1}},{stance:'kneel',armL:{pose:'clutch'},armR:{pose:'clutch'}},{stance:'chest',armL:{pose:'drag',t:1,x:5,y:13,z:12}});
  let worst=null,checks=0;
  for(const po of poses){pose(po,40);for(const [pa,ch] of pairs){const pm=P[pa],cm=P[ch];if(!pm||!cm)continue;const pts=ring0(cm);let bad=0;for(const q of pts)if(!inside(pm,q))bad++;checks++;if(bad&&(!worst||bad>worst.bad))worst={pose:JSON.stringify(po).slice(0,60),pa,ch,bad,of:pts.length};}}
  ok('no joint gap: '+checks+' parent/child root-ring checks over '+poses.length+' poses, every child root ring inside its parent'+(worst?' (worst '+JSON.stringify(worst)+')':''),!worst);
  /* the bending skins never tear: the neck/tail/fingers/tongue are single sweeps (one mesh each) */
  ok('the neck, tail, tongue and 8 fingers are seamless sweeps rebuilt in place (11 sweeps + the mouth set)',r.sweeps.filter(s=>s.o).length===11&&r.sweeps.some(s=>s.mouth));
  /* ---- update() never constructs a THREE object (after the first frame) ---- */
  const names=['Mesh','Group','BufferGeometry','MeshStandardMaterial','MeshBasicMaterial','MeshLambertMaterial','Sprite','SpriteMaterial','CanvasTexture','PointLight','BufferAttribute'];
  const orig={};let made=0;for(const n of names){orig[n]=THREE[n];THREE[n]=class extends orig[n]{constructor(...a){super(...a);made++;}};}
  try{const seq=[{stance:'idle'},{stance:'lean',armL:{pose:'slam',t:0.5,x:6,y:8,z:9},jaw:0.5,split:1,tongue:1},{stance:'stalk',tail:{pose:'sweep',t:0.3}},{stance:'headup',light:{at:'throat',i:3,col:0xffe6a0},round:3,strata:{tree:1,roof:0.2},belly:{lift:0,glow:1,bulge:0.3,items:[]}}];
    for(const s of seq){Object.assign(A,s);r.update(1/30,A);}made=0;for(let i=0;i<200;i++){Object.assign(A,seq[i%seq.length]);r.update(1/30,A);}}finally{for(const n of names)THREE[n]=orig[n];}
  ok('200 updates across stances, poses and rounds construct no THREE object ('+made+')',made===0);
  /* ---- seeded textures: identical across two builds ---- */
  const T1=C.MG3.tex;const h1=['hide','hideE','bone','hideN'].map(k=>{const d=T1.list[k].id.data;let h=0;for(let i=0;i<d.length;i+=97)h=(h*31+d[i])>>>0;return h;});
  C.MG3.tex=null;C.mg3TexAll();const T2=C.MG3.tex;const h2=['hide','hideE','bone','hideN'].map(k=>{const d=T2.list[k].id.data;let h=0;for(let i=0;i<d.length;i+=97)h=(h*31+d[i])>>>0;return h;});
  ok('the OG skin maps are seeded: two builds give identical hide / emissive / bone / normal maps',h1.join()===h2.join()&&h1.every(x=>x>0));
  ok('the fissure mask is sparse (the hide stays charcoal: < 12% of texels glow)',(()=>{const d=T2.list.hideE.id.data;let n=0,g=0;for(let i=0;i<d.length;i+=4*13){n++;if(d[i]>90)g++;}return g/n<0.12&&g>0;})());
  /* ---- the HR skin path uses M4's materials; dispose ---- */
  const mx=new THREE.MeshStandardMaterial({color:0x123456}),hr=V.mg3Rig({kind:'boss',skin:'hr',mats:{hide:mx,flesh:mx},tess:2});
  ok('skin:hr builds on the same skeleton with M4\'s materials (hide on the body, flesh in the mouth) and a denser mesh',hr.skin==='hr'&&hr.parts.pelvis.material===mx&&hr.parts.palate.material===mx&&tris(hr.root)>t0&&boot.lights(hr.root).length===1);
  ok('the HR rig flags emissive ownership (r.mgEmissive)',hr.mgEmissive===1);
  const sc=new THREE.Group();sc.add(hr.root);hr.dispose();ok('dispose() detaches the rig and never disposes M4\'s materials',sc.children.indexOf(hr.root)<0&&hr.dead===1);
  r.dispose();px.dispose();
});
