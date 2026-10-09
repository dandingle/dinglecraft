/* PART 36 — X-RAY (debug) */
/* Makes the world ghost-transparent except diamond ore, which is re-drawn solid.
   Debug menu button, or [ + X in-game. Not persisted — cheats reset on reload. */
const XR={on:false,g:null,mat:null,geo:null,t:0};
function xrayApply(){
  for(const m of [matOp,matCut,matWat]){
    if(!m)continue;
    if(XR.on){
      if(m._xo===undefined)m._xo={t:m.transparent,o:m.opacity,d:m.depthWrite};
      m.transparent=true;m.opacity=(m===matWat)?0.04:0.08;m.depthWrite=false;
    }else if(m._xo!==undefined){
      m.transparent=m._xo.t;m.opacity=m._xo.o;m.depthWrite=m._xo.d;
      delete m._xo;
    }
    m.needsUpdate=true;
  }
}
function xrayClear(){
  if(XR.g)while(XR.g.children.length)XR.g.remove(XR.g.children[0]);
}
function xrayRefresh(){
  if(!XR.on||!scene)return;
  if(!XR.g){XR.g=new THREE.Group();scene.add(XR.g);}
  xrayClear();
  if(!XR.mat)XR.mat=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true});
  if(!XR.geo)XR.geo=mkCubeGeo(B.DIA_ORE,1.02);
  const pcx=Math.floor(P.x/CH),pcz=Math.floor(P.z/CH);
  let n=0;
  for(let dcx=-4;dcx<=4;dcx++)for(let dcz=-4;dcz<=4;dcz++){
    const ch=chunks.get(ckey(pcx+dcx,pcz+dcz));
    if(!ch)continue;
    const bl=ch.bl,x0=(pcx+dcx)*CH,z0=(pcz+dcz)*CH;
    for(let i=0;i<bl.length;i++){
      if(bl[i]!==B.DIA_ORE)continue;
      const lz=i%CH,y=((i-lz)/CH)%WH,lx=(i/(CH*WH))|0;
      const m=new THREE.Mesh(XR.geo,XR.mat);
      m.position.set(x0+lx+0.5,y+0.5,z0+lz+0.5);
      XR.g.add(m);
      if(++n>=400)return;   /* draw-call cap; nobody needs more than 400 diamonds */
    }
  }
}
function toggleXray(){
  XR.on=!XR.on;XR.t=0;
  xrayApply();
  if(XR.on)xrayRefresh();else xrayClear();
  const b=$('dbg_xray');if(b)b.textContent='X-Ray: '+(XR.on?'On':'Off');
}
function tickXray(dt){
  if(!XR.on)return;
  XR.t+=dt;
  if(XR.t>1){XR.t=0;xrayRefresh();}
}

