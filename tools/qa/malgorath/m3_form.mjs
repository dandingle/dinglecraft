// m3_form.mjs (M3): THE FORM GATE sheets (bible 5.12), MUTED. The OG model rendered in an isolated studio scene with the game's own
// renderer (never the world): (1) the silhouette sheet, pure black on white, orthographic: front, side, back, three-quarter, the R1 lean,
// the R2 stalk, the R3 chest pose, the R3 head-up, the gag (+ mg_ref beside it); (2) the lit sheet (OG materials, his one light); (3) the
// interior frames (from the gag's stab point at the sun, from the ride's slab at the jaw, the chomp POV) and the R2 framing frame (Dan's
// eye at 12 m, level pitch, during the stalk). Writes JPEGs + sheets into --out.
//   node tools/qa/malgorath/m3_form.mjs --port 9384 [--build dist/dinglecraft_v<VER>.html] [--out dir] [--only lit|sil|int]
import fs from 'fs';import path from 'path';import {execFileSync} from 'child_process';import {args,connect,ROOT,saveData,defaultBuild} from './m3_lib.mjs';
const A=args(),PORT=+(A.port||9384),SRV=+(A.server||PORT+100),BUILD=A.build||defaultBuild();
const OUT=path.resolve(A.out||ROOT+'out/qa/m3_form_'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19));fs.mkdirSync(OUT,{recursive:true});
const C=await connect(PORT);await C.open(`http://127.0.0.1:${SRV}/${BUILD}?b=${Date.now()}`);
const STUDIO=`if(!window.__m3s){const V=__vox;V.startNewWorld('m3form','1337','c');V.GR.mobSpawn=false;V.GR.dayCycle=false;V.setTime(0.3);for(let i=0;i<40;i++)V.frameStep(800000+i*40);
  const S=new THREE.Scene();S.background=new THREE.Color(1,1,1);const amb=new THREE.AmbientLight(0xffffff,0.5),key=new THREE.DirectionalLight(0xfff2e0,0.85),rim=new THREE.DirectionalLight(0x8090ff,0.35);
  key.position.set(-30,45,40);rim.position.set(30,20,-40);S.add(amb,key,rim,key.target,rim.target);
  const r=V.mg3Rig({kind:'boss',skin:'og'});S.add(r.root);const A=mgAnimDefault();
  const W=1280,H=720,ortho=new THREE.OrthographicCamera(-1,1,1,-1,0.1,600),persp=new THREE.PerspectiveCamera(60,W/H,0.05,800);persp.rotation.order='YXZ';
  const black=new THREE.MeshBasicMaterial({color:0x000000});
  const fx=[r.parts.glow,r.parts.sun,...r.parts.rays,...r.parts.flames];
  window.__m3s={V,S,r,A,ortho,persp,black,fx,amb,key,rim,
    pose(p){Object.assign(A,mgAnimDefault(),p.s||{});for(let i=0;i<90;i++){if(p.f)p.f(A,i);r.update(1/30,A);}},
    ortho2(cx,cy,cz,dx,dy,dz,h){const w=h*W/H;ortho.left=-w/2;ortho.right=w/2;ortho.top=h/2;ortho.bottom=-h/2;ortho.position.set(cx+dx*120,cy+dy*120,cz+dz*120);ortho.lookAt(cx,cy,cz);ortho.updateProjectionMatrix();return ortho;},
    shoot(cam,sil,bg){S.overrideMaterial=sil?black:null;for(const f of fx)f.visible=sil?false:f.visible;S.background=new THREE.Color(bg==null?(sil?0xffffff:0x2a2628):bg);
      renderer.setRenderTarget(null);renderer.render(S,cam);return renderer.domElement.toDataURL('image/jpeg',0.86);}};}`;
await C.ev(STUDIO);
const POSES={
  idle:{s:{stance:'idle'}},
  lean:{s:{stance:'lean',round:1}},
  stalk:{s:{stance:'stalk',round:2},f:(A,i)=>{}},
  chest:{s:{stance:'chest',round:3}},
  headup:{s:{stance:'headup',round:3,jaw:0.6,split:0.3,light:{at:'throat',i:3,col:0xffe6a0}}},
  gag:{s:{stance:'slump',round:3,jaw:1,split:1,lookX:0,lookY:12.95,lookZ:13.5,light:{at:'throat',i:3,col:0xffe6a0}}},
  slap:{s:{stance:'lean',round:1,armL:{pose:'flat',t:1,x:7,y:8,z:10},eyeL:1,vuln:1}},
  raise:{s:{stance:'lean',round:1,armR:{pose:'raise',t:1,x:-7,y:8,z:11}}},
  scoop:{s:{stance:'lean',round:1,armL:{pose:'lift',t:1,x:0,y:14.5,z:9},jaw:0.8,split:1,tongue:1}},
  rear:{s:{stance:'rear',round:2,jaw:0.7,split:0.5}},
  stun:{s:{stance:'stun',round:2,lookX:-1.5,lookY:0.2,lookZ:9}},
  kneel:{s:{stance:'kneel',round:2,armL:{pose:'clutch'},armR:{pose:'clutch'},belly:{lift:1,glow:1,bulge:0.6,items:[]}}},
  swat:{s:{stance:'idle',round:1,armL:{pose:'swat',t:0.95,x:0,y:14,z:9},armR:{pose:'swat',t:0.95,x:0,y:14,z:9}}},
  tail:{s:{stance:'stalk',round:2,tail:{pose:'sweep',t:0.5,dir:1}}},
};
const VIEWS={front:[0,0,1],side:[1,0,0],back:[0,0,-1],tq:[0.7,0.1,0.7],tqb:[-0.7,0.15,-0.7]};
const only=A.only||'';const frames=[];
async function ortho(name,pose,view,sil,h,cy){const v=VIEWS[view];const d=await C.ev(`const M=__m3s;M.pose(${JSON.stringify({s:POSES[pose].s})});return M.shoot(M.ortho2(0,${cy||9},0,${v[0]},${v[1]},${v[2]},${h||25}),${sil?1:0});`);
  const f=saveData(OUT+'/'+(sil?'sil':'lit')+'/'+name+'.jpg',d);frames.push(f);return f;}
fs.mkdirSync(OUT+'/sil',{recursive:true});fs.mkdirSync(OUT+'/lit',{recursive:true});fs.mkdirSync(OUT+'/int',{recursive:true});
const list=[['01_front','idle','front'],['02_side','idle','side'],['03_back','idle','back'],['04_threequarter','idle','tq'],['05_tq_back','idle','tqb'],
  ['06_r1_lean_side','lean','side'],['07_r1_lean_tq','lean','tq'],['08_r2_stalk_side','stalk','side'],['09_r2_stalk_tq','stalk','tq'],['10_r3_chest_front','chest','front'],
  ['11_r3_headup_side','headup','side'],['12_gag_side','gag','side'],['13_gag_tq','gag','tq'],['14_slap_tq','slap','tq'],['15_raise_front','raise','front'],
  ['16_ride_lift_side','scoop','side'],['17_rear_front','rear','front'],['18_stun_side','stun','side'],['19_kneel_tq','kneel','tq'],['20_swat_front','swat','front'],
  ['21_tail_top','tail','tq']];
const pick=A.shots?A.shots.split(','):null,use=list.filter(([n])=>!pick||pick.some(k=>n.startsWith(k)));
if(!only||only==='sil')for(const [n,p,v] of use)await ortho(n,p,v,1);
if(!only||only==='lit')for(const [n,p,v] of use)await ortho(n,p,v,0);
/* interior frames + the R2 framing frame (perspective, from the rig's own joints) */
if(!only||only==='int'){const shotP=async(name,pose,code)=>{const d=await C.ev(`const M=__m3s;M.pose(${JSON.stringify({s:POSES[pose].s})});const r=M.r,cam=M.persp;${code};return M.shoot(cam,0,0x1a1012);`);frames.push(saveData(OUT+'/int/'+name+'.jpg',d));};
  await shotP('int1_gag_stab_point_at_sun','gag',`const m=r.wp('head',[0,-0.3,4.6]),s=r.wp('head',[0,-0.55,0.8]);cam.position.set(m[0],m[1],m[2]);cam.lookAt(s[0],s[1],s[2]);`);
  await shotP('int2_ride_slab_at_jaw','scoop',`const h=r.wp('head',[0,-2.2,9.5]),j=r.wp('head',[0,-0.6,2.5]);cam.position.set(h[0],h[1],h[2]);cam.lookAt(j[0],j[1],j[2]);`);
  await shotP('int3_intro_close_mouth','headup',`const h=r.wp('head',[1.2,0.8,11]),j=r.wp('head',[0,-0.6,3]);cam.position.set(h[0],h[1],h[2]);cam.lookAt(j[0],j[1],j[2]);`);
  await shotP('int4_r2_framing_12m','stalk',`cam.fov=75;cam.updateProjectionMatrix();cam.position.set(0,1.62,12+r.wp('head',[0,0,2.6])[2]);cam.rotation.set(0,0,0);`);
  await C.ev('__m3s.persp.fov=60;__m3s.persp.updateProjectionMatrix();');
  await shotP('int5_lip_view','lean',`cam.position.set(-6,26,34);cam.lookAt(0,9,4);`);
  await shotP('int6_hand_eye_close','slap',`const e=r.wp('handEyeL',[0,0,0]);cam.position.set(e[0]-3,e[1]+3,e[2]-1);cam.lookAt(e[0],e[1],e[2]);`);}
const logs=C.logs.filter(l=>!/WebGL|GPU stall|favicon/.test(l));
fs.writeFileSync(OUT+'/summary.json',JSON.stringify({frames:frames.map(f=>path.relative(OUT,f)),logs},null,1));
for(const sub of ['sil','lit','int'])if(fs.readdirSync(OUT+'/'+sub).length){const extra=sub==='sil'&&fs.existsSync(path.join(process.env.DC_MG_ART_SRC||'.missing','ref','mg_ref.jpg'))?['--extra',path.join(process.env.DC_MG_ART_SRC||'.missing','ref','mg_ref.jpg')]:[];
  execFileSync('python3',[ROOT+'tools/qa/malgorath/m3_sheet.py',OUT+'/'+sub,OUT+'/sheet_'+sub+'.jpg',...extra],{stdio:'inherit'});}
await C.restoreOG();console.log(JSON.stringify({out:OUT,frames:frames.length,logs:logs.slice(0,8)}));C.close();process.exit(0);
