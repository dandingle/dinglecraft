/* ----- sky: sun, moon, stars, clouds, fog, lights ----- */
let ambL=null,sunL=null,sunSpr=null,moonSpr=null,stars=null,cloudG=null,ugT=0;
function discSprite(col,glow){
  const c=document.createElement('canvas');c.width=c.height=32;
  const g=c.getContext('2d');
  g.fillStyle=col;g.fillRect(6,6,20,20);
  if(glow){g.globalAlpha=0.4;g.fillStyle=glow;g.fillRect(3,3,26,26);}
  const tx=new THREE.CanvasTexture(c);tx.magFilter=THREE.NearestFilter;
  const m=new THREE.SpriteMaterial({map:tx,transparent:true,fog:false,depthWrite:false});
  return new THREE.Sprite(m);
}
function setupSky(){
  ambL=new THREE.AmbientLight(0xffffff,0.7);scene.add(ambL);
  sunL=new THREE.DirectionalLight(0xffffff,0.7);scene.add(sunL);
  sunSpr=discSprite('#ffe87a','#ffd24d');sunSpr.scale.set(42,42,1);scene.add(sunSpr);
  moonSpr=discSprite('#e8ecf4','#aab4cc');moonSpr.scale.set(30,30,1);scene.add(moonSpr);
  const sg=new THREE.BufferGeometry(),sp=[];
  for(let i=0;i<420;i++){
    const a=Math.random()*Math.PI*2,b=Math.acos(Math.random()*2-1);
    sp.push(Math.sin(b)*Math.cos(a)*420,Math.abs(Math.cos(b))*420+10,Math.sin(b)*Math.sin(a)*420);
  }
  sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:1.5,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));
  scene.add(stars);
  cloudG=new THREE.Group();
  const cm=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:0.8});
  for(let i=0;i<22;i++){
    const w=10+Math.random()*16,d=8+Math.random()*12;
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,1.6,d),cm);
    m.position.set((Math.random()-0.5)*420,96+Math.random()*6,(Math.random()-0.5)*420);
    cloudG.add(m);
  }
  scene.add(cloudG);
  scene.fog=new THREE.Fog(0x87ceeb,10,100);
  scene.background=new THREE.Color(0x87ceeb);
}
const DAYC=[135,206,235],NIGHTC=[7,10,24],DUSKC=[255,140,80];
function updateSky(dt){
  if(TP.hr&&HRL.on&&hrSky(dt))return;
  if(DIM!=='over'){
    if(sunSpr)sunSpr.visible=(DIM==='aether');
    if(moonSpr)moonSpr.visible=false;
    if(stars)stars.material.opacity=0;
    if(cloudG)cloudG.visible=(DIM==='aether');
    if(DIM==='puppet')mpSky(dt);
    else if(DIM==='nether'){
      scene.background.setRGB(0.14,0.035,0.03);
      scene.fog.color.copy(scene.background);
      scene.fog.near=RD*CH*0.3;scene.fog.far=RD*CH*0.85;
      if(fullbright&&GR.fbOK){ambL.intensity=1.05;sunL.intensity=0.2;}
      else{ambL.intensity=0.52;
        ambL.color&&ambL.color.setRGB&&ambL.color.setRGB(1,0.74,0.6);
        sunL.intensity=0.1;}
    }else{
      scene.background.setRGB(0.6,0.78,0.96);
      scene.fog.color.copy(scene.background);
      scene.fog.near=RD*CH*0.5;scene.fog.far=RD*CH*1.05;
      ambL.intensity=(fullbright&&GR.fbOK)?1.05:0.88;
      ambL.color&&ambL.color.setRGB&&ambL.color.setRGB(0.95,0.97,1);
      sunL.intensity=0.5;
      const a2=timeOfDay*Math.PI*2-Math.PI*0.5;
      if(SHD.on){
        sunL.position.set(P.x+Math.cos(a2)*130,Math.max(P.y+Math.sin(a2)*130,P.y+24),P.z+40);
        if(sunL.target){sunL.target.position.set(P.x,P.y,P.z);
          sunL.target.updateMatrixWorld&&sunL.target.updateMatrixWorld();}
      }else sunL.position.set(Math.cos(a2)*100,Math.sin(a2)*100,35);
      if(sunSpr)sunSpr.position.set(camera.position.x+Math.cos(a2)*380,camera.position.y+Math.sin(a2)*380,camera.position.z+30);
      for(const c of cloudG.children){
        c.position.x+=dt*1.6;
        if(c.position.x-P.x>230)c.position.x-=460;
        if(P.x-c.position.x>230)c.position.x+=460;
        if(c.position.z-P.z>230)c.position.z-=460;
        if(P.z-c.position.z>230)c.position.z+=460;
      }
    }
    return;
  }
  if(sunSpr)sunSpr.visible=true;
  if(moonSpr)moonSpr.visible=true;
  if(cloudG)cloudG.visible=true;
  /* how underground is the camera? caves keep constant light, sun stays out */
  const ci=colInfo(Math.floor(P.x),Math.floor(P.z));
  const under=(P.y+1.4)<(ci.h-1.5)?1:0;
  ugT=lerp(ugT,under,1-Math.exp(-dt*2.5));
  const sh=Math.sin(timeOfDay*Math.PI*2);            /* 1 noon, -1 midnight */
  const df=clamp((sh+0.16)*2.4,0,1);                 /* day factor */
  const dusk=clamp(1-Math.abs(sh)*4,0,1)*0.85;
  let r=lerp(NIGHTC[0],DAYC[0],df),g=lerp(NIGHTC[1],DAYC[1],df),b=lerp(NIGHTC[2],DAYC[2],df);
  r=lerp(r,DUSKC[0],dusk);g=lerp(g,DUSKC[1],dusk);b=lerp(b,DUSKC[2],dusk);
  scene.background.setRGB(r/255,g/255,b/255);
  scene.fog.color.copy(scene.background);
  scene.fog.near=RD*CH*0.45;
  scene.fog.far=RD*CH*0.98;
  if(fullbright&&GR.fbOK){
    ambL.intensity=1.05;
    ambL.color&&ambL.color.setRGB&&ambL.color.setRGB(1,1,1);
    sunL.intensity=0.3;
  }else{
    const sAmb=lerp(0.46,0.72,df);
    ambL.intensity=lerp(sAmb,0.40,ugT);
    ambL.color&&ambL.color.setRGB&&ambL.color.setRGB(
      lerp(lerp(0.82,1,df),0.9,ugT),lerp(lerp(0.86,1,df),0.9,ugT),lerp(1,0.94,ugT));
    sunL.intensity=lerp(lerp(0.2,0.62,df),0.05,ugT);
  }
  const a=timeOfDay*Math.PI*2-Math.PI*0.5;
  const sx=Math.cos(a),sy=Math.sin(a);
  if(SHD.on){
    sunL.position.set(P.x+sx*130,Math.max(P.y+sy*130,P.y+24),P.z+40);
    if(sunL.target){sunL.target.position.set(P.x,P.y,P.z);
      sunL.target.updateMatrixWorld&&sunL.target.updateMatrixWorld();}
  }else sunL.position.set(sx*100,sy*100,35);
  sunSpr.position.set(camera.position.x+sx*380,camera.position.y+sy*380,camera.position.z+30);
  moonSpr.position.set(camera.position.x-sx*380,camera.position.y-sy*380,camera.position.z-30);
  stars.material.opacity=clamp(1-df*1.6,0,1)*0.9;
  stars.position.copy(camera.position);
  for(const c of cloudG.children){
    c.position.x+=dt*1.6;
    if(c.position.x-P.x>230)c.position.x-=460;
    if(P.x-c.position.x>230)c.position.x+=460;
    if(c.position.z-P.z>230)c.position.z-=460;
    if(P.z-c.position.z>230)c.position.z+=460;
  }
}
/* ----- torch point lights (pooled) ----- */
const TLIGHTS=[];
function setupTorchLights(){
  for(let i=0;i<6;i++){
    const l=new THREE.PointLight(0xffb066,0,13,2);
    scene.add(l);TLIGHTS.push(l);
  }
}
function updateTorchLights(){
  if(TP.hr&&HRL.on){hrTorches();return;}
  if(frameCount%15!==0)return;
  const near=[];
  for(const k of torches){
    const p=dimP(k);
    if(!p)continue;
    const dx=+p[0]+0.5-P.x,dy=+p[1]-P.y,dz=+p[2]+0.5-P.z;
    const d=dx*dx+dy*dy+dz*dz;
    if(d<900)near.push([d,+p[0],+p[1],+p[2]]);
  }
  if(DIM==='puppet')mpLightsNear(near);
  near.sort((q,w)=>q[0]-w[0]);
  for(let i=0;i<TLIGHTS.length;i++){
    if(i<near.length){
      TLIGHTS[i].position.set(near[i][1]+0.5,near[i][2]+0.6,near[i][3]+0.5);
      TLIGHTS[i].intensity=1.15;
    }else TLIGHTS[i].intensity=0;
  }
}
