// title_pano.mjs: render the title-screen panorama (6 cube faces, 90° each) from a world save, through the game's own
// renderer (the OG pack by default, or --pack hr), MUTED. Writes out/qa/pano/face_<i>.png (i: 0 front, 1 right, 2 back, 3 left, 4 up, 5 down,
// as yaw 0, -90°, 180°, 90° and pitch +-90° in the game camera's YXZ order).
//   tools/qa/chrome.sh 9420 ; node scripts/serve.mjs --port 9520 &
//   node tools/art/title_pano.mjs --port 9420 --save out/qa/pano/world.json --at 187.5,35,180.5 [--size 2048] [--pack og|hr] [--q 3] [--time 0.1245]
// Release 1.0 ships the OG pack (default textures), fullbright off, pretty shaders off.
// The save is read through the static server, so it must sit under the repo (out/ is gitignored). Then convert each face to
// assets/title/pano_<i>.webp (WebP quality 85, method 6, no metadata; e.g. Pillow: Image.open(png).save(webp,'WEBP',quality=85,method=6))
// and keep assets/title/pano.json's yaw0/pitch/spin_s; npm run build inlines them ({{TITLE_PANO_JSON}}).
import fs from 'fs';import path from 'path';
import {connect,args,REPO,defaultBuild,saveData} from '../qa/lib/cdp.mjs';
const A=args(),port=+(A.port||9420),size=+(A.size||2048),q=A.q!==undefined?+A.q:3,pack=A.pack||'og';
const at=(A.at||'187.5,35,180.5').split(',').map(Number),save=A.save||'out/qa/pano/world.json';
const out=path.join(REPO,'out','qa','pano');fs.mkdirSync(out,{recursive:true});
const C=await connect(port);
await C.open(`http://127.0.0.1:${port+100}/${A.build||defaultBuild()}`);
await C.send('Emulation.setDeviceMetricsOverride',{width:size,height:size,deviceScaleFactor:1,mobile:false});
const info=await C.ev(`
  const V=__vox,d=await (await fetch('/${save}')).json();
  dispatchEvent(new Event('resize'));applySave(d);WORLD.name='panorama-capture';playing=true;paused=false;
  for(const id of ['title','pause','death'])$(id).style.display='none';
  GR.mobSpawn=false;GR.snail=false;GR.dayCycle=false;GR.bots=false;
  ${A.time!==undefined?'timeOfDay='+(+A.time)+';':''}
  const P=V.P;P.mode='c';P.flying=true;P.x=${at[0]};P.y=${at[1]};P.z=${at[2]};P.vx=P.vy=P.vz=0;P.yaw=0;P.pitch=0;
  RD=Math.max(RD,12);
  let T=performance.now();const step=n=>{for(let i=0;i<n;i++){T+=40;P.x=${at[0]};P.y=${at[1]};P.z=${at[2]};P.vx=P.vy=P.vz=0;V.frameStep(T);}};
  V.forceChunksNear(${Math.floor(at[0])},${Math.floor(at[2])});step(30);
  fullbright=false;if(typeof setShaders==='function')setShaders(false);
  if('${pack}'==='hr'){await V.setPack('hr');await V.setQuality(${q});}else await V.setPack('og');
  for(let k=0;k<40;k++){step(25);await new Promise(r=>setTimeout(r,50));}
  window.__pano={step};
  return {pack:'${pack}',tp:V.getTP().live,fullbright,tod:timeOfDay,chunks:chunks.size};`);
console.log(JSON.stringify(info));
const FACES=[[0,0],[-Math.PI/2,0],[Math.PI,0],[Math.PI/2,0],[0,Math.PI/2],[0,-Math.PI/2]];
for(let i=0;i<6;i++){const [yaw,pitch]=FACES[i];
  const url=await C.ev(`
    const V=__vox;window.__pano.step(3);if(typeof handG!=='undefined'&&handG)handG.visible=false;
    FOVB=90;curFov=90;camera.fov=90;camera.aspect=1;camera.updateProjectionMatrix();
    camera.position.set(V.P.x,V.P.y+V.P.eyeY,V.P.z);camera.rotation.order='YXZ';camera.rotation.set(${pitch},${yaw},0);
    V.tpRenderOnce();V.tpRenderOnce();
    const gl=document.getElementById('gl'),c=document.createElement('canvas');c.width=${size};c.height=${size};
    c.getContext('2d').drawImage(gl,0,0,${size},${size});return c.toDataURL('image/png');`);
  saveData(path.join(out,'face_'+i+'.png'),url);console.log('face',i,'saved');}
await C.restoreOG();console.log('logs',JSON.stringify(C.logs.slice(-8)));C.close();process.exit(0);
