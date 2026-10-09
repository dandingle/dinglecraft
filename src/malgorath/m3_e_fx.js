/* ---- PART 57: m3_e_fx.js ---- */
/* ===================================================================== */
/* PART 57 m3 · file e: OG VFX (plan 5.3 MGREG.fx; bible 7.3, 5.6, 5.11).*/
/* mg3Draw renders the telegraph channel (mgDraw): pooled shader quads   */
/* on the floor, <= 24 live, smooth and 4K in both packs: disc ring band */
/* line crescent box in WHITE RED VIOLET GOLD; the drawing stops moving  */
/* at the lock; the commit flash at T-0.35; the lead front; "you're in   */
/* it" (a wide faint ring r+1.5). Particles are two Points systems       */
/* (additive + alpha, one draw call each). Void decals, cube rain and    */
/* rigid world chunks (slabs) are merged dynamic geometry.               */
/* ===================================================================== */
var MG3FX={pool:[],parts:null,decals:null,rain:null,chunks:[],pov:null,props:[],fly:[],R:null,t:0};
var MG3TEL_VS='varying vec2 vW;\nvoid main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}';
var MG3TEL_FS=['uniform vec3 uCol;uniform float uShape,uKind,uLock,uFlash,uFront,uTime,uIn,uAlpha,uYaw;uniform vec4 uP,uQ;uniform vec2 uC;varying vec2 vW;',
 'float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
 'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}',
 'void main(){vec2 c=uP.xy;float r=uP.z,r0=uP.w,sd=1e3,along=0.0;vec2 d=vW-c;',
 ' if(uShape<0.5){sd=length(d)-r;along=length(d);}',
 ' else if(uShape<1.5){float l=length(d);sd=max(l-r,r0-l);along=l;}',
 ' else if(uShape<2.5){vec2 q=vW-uC;float rp=length(q),a=atan(q.y,q.x),da=abs(mod(a-uQ.x+3.14159265,6.2831853)-3.14159265);sd=max(max(rp-r,r0-rp),(da-uQ.y)*max(rp,1.0));along=rp;}',
 ' else if(uShape<3.5){vec2 u=vec2(-sin(uYaw),-cos(uYaw)),v=vec2(-u.y,u.x);float a=dot(d,u),b=dot(d,v);sd=max(max(-a,a-uQ.z),abs(b)-uQ.w*0.5);along=a;}',
 ' else if(uShape<4.5){sd=max(length(d)-r,r0-length(vW-uC));along=length(d);}',
 ' else {sd=max(abs(d.x),abs(d.y))-r;along=length(d);}',
 ' float n=vn(vW*2.3+uTime*0.6)*0.6+vn(vW*7.1-uTime*1.3)*0.4;',
 ' float fill=smoothstep(0.12,-0.12,sd),edge=exp(-abs(sd)*(uLock>0.5?6.0:3.2));',
 ' float inr=uIn*exp(-abs(sd-1.5)*3.5)*0.5;',
 ' float fr=uFront>=0.0?exp(-abs(along-uFront)*7.0)*fill*1.4:0.0;',
 ' vec3 col=uCol;float a;',
 ' if(uKind>0.5&&uKind<1.5){',
 '   float rim=exp(-abs(sd+0.15)*5.0)*(0.55+0.45*n);a=fill*(0.42+0.28*uLock)+rim*0.6+uFlash*fill*0.3;col=mix(vec3(0.02,0.0,0.0),vec3(1.0),clamp(rim*1.4+uFlash*0.6,0.0,1.0));',
 ' }else if(uKind>1.5){float p=0.5+0.5*sin(uTime*7.0);a=fill*(0.35+0.25*p)+edge*0.8;col=uCol*(1.2+0.6*p);',
 ' }else{a=fill*(uAlpha*(0.55+0.45*n))+edge*(0.55+0.4*uLock)+uFlash*fill*0.6;col=mix(uCol,vec3(1.0),uFlash*0.55+fr*0.6);}',
 ' a+=inr+fr;a=clamp(a,0.0,1.0);if(a<0.004)discard;gl_FragColor=vec4(col*(1.0+fr),a);}'].join('\n');
var MG3COL={white:[1,0.97,0.9],red:[1,0.08,0.03],violet:[0.62,0.25,1],gold:[1,0.76,0.18]};
function mg3TelSlot(){let s=MG3FX.pool.find(q=>!q.live);if(s)return s;if(MG3FX.pool.length>=24){s=MG3FX.pool[0];s.free();return s;}
  const U={uCol:{value:new THREE.Vector3(1,1,1)},uShape:{value:0},uKind:{value:0},uLock:{value:0},uFlash:{value:0},uFront:{value:-1},uTime:{value:0},uIn:{value:0},uAlpha:{value:0.25},uYaw:{value:0},
    uP:{value:{x:0,y:0,z:1,w:0}},uQ:{value:{x:0,y:0,z:0,w:0}},uC:{value:new THREE.Vector2(MGC.X,MGC.Z)}};
  if(typeof THREE.Vector4==='function'){U.uP.value=new THREE.Vector4(0,0,1,0);U.uQ.value=new THREE.Vector4(0,0,0,0);}
  const mat=new THREE.ShaderMaterial({uniforms:U,vertexShader:MG3TEL_VS,fragmentShader:MG3TEL_FS,transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const pos=new Float32Array(12),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,2,1,0,3,2]),1));
  const mesh=new THREE.Mesh(geo,mat);mesh.frustumCulled=false;mesh.renderOrder=3;mesh.name='mgTel';
  s={mesh,mat,U,geo,pos:geo.attributes.position,live:0,t:null,free:function(){s.live=0;s.t=null;s.mesh.visible=false;mg3Detach(s.mesh);}};
  MG3FX.pool.push(s);return s;}
/* the renderer behind mgDraw (plan 4.6): returns {set(t), free()} */
function mg3Draw(kind,t){const s=mg3TelSlot();s.live=1;s.t=t;s.kind=kind;if(!s.mesh.parent&&typeof scene!=='undefined'&&scene)scene.add(s.mesh);s.mesh.visible=true;
  const h={set:function(p){if(s.t!==p&&p)s.t=p;mg3TelSet(s);},free:function(){if(s.t===t||!s.live)s.free();}};h.set(t);return h;}
function mg3TelSet(s){const t=s.t;if(!t)return;const U=s.U,c=MG3COL[t.col]||MG3COL.white,sh={disc:0,ring:1,band:2,line:3,crescent:4,box:5}[t.shape];
  U.uCol.value.set?U.uCol.value.set(c[0],c[1],c[2]):Object.assign(U.uCol.value,{x:c[0],y:c[1],z:c[2]});U.uShape.value=sh==null?0:sh;
  U.uKind.value=t.col==='gold'?2:(/slap|shadow|stomp|hoof|swat|pluck/.test(s.kind||'')&&t.col!=='red'?1:0);U.uLock.value=t.locked?1:0;U.uYaw.value=t.yaw||0;
  const P=U.uP.value,Q=U.uQ.value;P.x=t.x;P.y=t.z;P.z=t.r||1;P.w=t.r0||0;Q.x=t.th||0;Q.y=t.dth==null?Math.PI:t.dth;Q.z=t.len||0;Q.w=t.w||(t.r||1);
  /* the quad: the shape's bounds + 2 m for the "you're in it" ring */
  let x0,x1,z0,z1;const m=2.2;
  if(sh===2||sh===4&&false){x0=MGC.X-t.r-m;x1=MGC.X+t.r+m;z0=MGC.Z-t.r-m;z1=MGC.Z+t.r+m;}
  else if(sh===3){const ux=-Math.sin(t.yaw||0),uz=-Math.cos(t.yaw||0),w=(t.w||1)/2+m,L=t.len||0;x0=Math.min(t.x,t.x+ux*L)-w;x1=Math.max(t.x,t.x+ux*L)+w;z0=Math.min(t.z,t.z+uz*L)-w;z1=Math.max(t.z,t.z+uz*L)+w;}
  else{const R=(t.r||1)+m;x0=t.x-R;x1=t.x+R;z0=t.z-R;z1=t.z+R;}
  const y=(t.fy!=null?t.fy:(typeof mgF==='function'?mgF():64))+0.04,a=s.pos.array;
  a[0]=x0;a[1]=y;a[2]=z0;a[3]=x1;a[4]=y;a[5]=z0;a[6]=x1;a[7]=y;a[8]=z1;a[9]=x0;a[10]=y;a[11]=z1;s.pos.needsUpdate=true;}
function mg3TelTick(dt){const now=MGF.clock,K=MG_K.COMMIT||0.35;
  for(const s of MG3FX.pool){if(!s.live||!s.t)continue;const t=s.t,U=s.U;U.uTime.value+=dt;
    const T=t.impactT||0,fl=T>0&&now>=T-K&&now<=T+0.12?1:0;U.uFlash.value=fl;U.uLock.value=t.locked?1:0;
    const age=now-(t.t0||now),span=Math.max(0.3,(T||now+1)-(t.t0||now));U.uAlpha.value=0.25+0.45*mg3Cl(age/span,0,1);
    U.uFront.value=t.front?+t.front:-1;
    U.uIn.value=(t.locked&&typeof P!=='undefined'&&P&&!P.dead&&mgTelHit(t,P.x,P.y,P.z))?1:0;}}
/* ---- particles: two Points systems (additive glows; alpha dust/smoke/steam/ash), CPU simulated, one draw call each ---- */
var MG3PT_VS='attribute float size;attribute float alpha;attribute vec3 tint;varying float vA;varying vec3 vC;\nvoid main(){vA=alpha;vC=tint;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*(420.0/max(0.5,-mv.z));gl_Position=projectionMatrix*mv;}';
var MG3PT_FS='uniform sampler2D map;varying float vA;varying vec3 vC;\nvoid main(){vec4 t=texture2D(map,gl_PointCoord);float a=t.a*vA;if(a<0.003)discard;gl_FragColor=vec4(vC*t.rgb,a);}';
function mg3PtSys(n,add){const pos=new Float32Array(n*3),size=new Float32Array(n),alpha=new Float32Array(n),tint=new Float32Array(n*3),geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('size',new THREE.BufferAttribute(size,1));
  geo.setAttribute('alpha',new THREE.BufferAttribute(alpha,1));geo.setAttribute('tint',new THREE.BufferAttribute(tint,3));
  const mat=new THREE.ShaderMaterial({uniforms:{map:{value:mg3Soft()}},vertexShader:MG3PT_VS,fragmentShader:MG3PT_FS,transparent:true,depthWrite:false,fog:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending});
  const pts=new THREE.Points(geo,mat);pts.frustumCulled=false;pts.renderOrder=4;pts.name=add?'mgFxAdd':'mgFxAlpha';
  const P=[];for(let i=0;i<n;i++)P.push({l:0,L:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,g:0,dr:0,s0:0,s1:0,a0:0,c:[1,1,1]});
  return {pts,geo,P,n,i:0,live:0};}
function mg3PtInit(){if(MG3FX.parts)return MG3FX.parts;MG3FX.R=mg3Rng(0xf00d);MG3FX.parts={add:mg3PtSys(640,1),alp:mg3PtSys(480,0)};return MG3FX.parts;}
var MG3BURST={spark:{add:1,n:14,spd:9,g:18,l:[0.25,0.5],s:[0.5,0.1],a:1,c:[1,0.95,0.8],dr:1},ember:{add:1,n:10,spd:2.5,g:-1.2,l:[1.2,2.4],s:[0.45,0.15],a:0.9,c:[1,0.45,0.1],dr:0.6},
  blood:{add:1,n:16,spd:7,g:12,l:[0.35,0.7],s:[0.9,0.3],a:1,c:[1,0.42,0.08],dr:1.2},gold:{add:1,n:12,spd:3,g:-0.5,l:[0.8,1.6],s:[0.6,0.2],a:1,c:[1,0.8,0.25],dr:0.8},
  white:{add:1,n:10,spd:4,g:0,l:[0.4,0.8],s:[1.2,0.3],a:1,c:[1,1,1],dr:1},violet:{add:1,n:10,spd:3,g:0,l:[0.6,1.0],s:[0.8,0.2],a:0.9,c:[0.65,0.3,1],dr:0.6},
  flash:{add:1,n:1,spd:0,g:0,l:[0.35,0.35],s:[18,30],a:1,c:[1,0.95,0.85],dr:0},sun:{add:1,n:1,spd:0,g:0,l:[0.6,0.6],s:[10,4],a:1,c:[1,0.92,0.7],dr:0},
  dust:{add:0,n:10,spd:2.2,g:-0.3,l:[1.0,2.0],s:[1.2,3.8],a:0.45,c:[0.45,0.4,0.38],dr:1.6},steam:{add:0,n:8,spd:1.5,g:-2.2,l:[1.5,3.0],s:[1.5,4.5],a:0.35,c:[0.92,0.92,0.95],dr:0.8},
  smoke:{add:0,n:10,spd:1.8,g:-1.4,l:[1.4,2.6],s:[1.0,3.5],a:0.6,c:[0.06,0.05,0.05],dr:1.0},ash:{add:0,n:8,spd:0.6,g:0.8,l:[3,5],s:[0.18,0.12],a:0.7,c:[0.55,0.52,0.5],dr:0.3},
  bile:{add:1,n:8,spd:2,g:6,l:[0.5,1.0],s:[0.6,0.2],a:0.8,c:[0.6,0.85,0.15],dr:0.6},drool:{add:0,n:8,spd:3,g:14,l:[0.5,0.9],s:[0.35,0.2],a:0.8,c:[0.85,0.75,0.4],dr:0.4}};
/* fx.burst(kind,x,y,z,o): o {n, spd, dir:[x,y,z], cone, r (spawn radius), col, size, id (debris: real block particles)} */
function mg3Burst(kind,x,y,z,o){o=o||{};if(kind==='debris'){if(typeof burstParticles==='function')burstParticles(x,y,z,o.id||B.STONE,o.n||8,o.pw||0.8);return;}
  const D=MG3BURST[kind]||MG3BURST.spark,S=mg3PtInit()[D.add?'add':'alp'],R=MG3FX.R,n=Math.min(64,o.n||D.n),spd=o.spd==null?D.spd:o.spd,c=o.col||D.c,rr=o.r||0;
  for(let i=0;i<n;i++){const p=S.P[S.i];S.i=(S.i+1)%S.n;let dx=R()*2-1,dy=R()*2-1,dz=R()*2-1;const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;
    if(o.dir){const k=o.cone==null?0.45:o.cone;dx=o.dir[0]+dx*k;dy=o.dir[1]+dy*k;dz=o.dir[2]+dz*k;}
    const v=spd*(0.4+R()*0.8);p.x=x+(R()*2-1)*rr;p.y=y+(R()*2-1)*rr*0.5;p.z=z+(R()*2-1)*rr;p.vx=dx*v;p.vy=dy*v+(o.dir?0:spd*0.35);p.vz=dz*v;
    p.L=p.l=mg3Lp(D.l[0],D.l[1],R());p.g=D.g;p.dr=D.dr;const sz=o.size||1;p.s0=D.s[0]*sz;p.s1=D.s[1]*sz;p.a0=D.a;p.c=c;}}
function mg3PtTick(dt){const PS=MG3FX.parts;if(!PS)return;for(const k of ['add','alp']){const S=PS[k],pos=S.geo.attributes.position.array,sz=S.geo.attributes.size.array,al=S.geo.attributes.alpha.array,ti=S.geo.attributes.tint.array;let live=0;
    for(let i=0;i<S.n;i++){const p=S.P[i];if(p.l<=0){if(sz[i]!==0){sz[i]=0;al[i]=0;}continue;}live++;p.l-=dt;const f=1-p.l/p.L,dd=Math.exp(-p.dr*dt);
      p.vx*=dd;p.vy=p.vy*dd-p.g*dt;p.vz*=dd;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;sz[i]=mg3Lp(p.s0,p.s1,f);al[i]=p.a0*(f<0.1?f*10:1)*(1-f*f);ti[i*3]=p.c[0];ti[i*3+1]=p.c[1];ti[i*3+2]=p.c[2];}
    S.live=live;for(const a of ['position','size','alpha','tint'])S.geo.attributes[a].needsUpdate=true;
    if(live&&!S.pts.parent&&typeof scene!=='undefined')scene.add(S.pts);S.pts.visible=live>0;}}
/* ---- cube rain (bible 10.4, 13): up to 512 tumbling atlas cubes in ONE dynamic mesh: the closing edge's cells, the geyser, rubble ---- */
function mg3RainInit(){if(MG3FX.rain)return MG3FX.rain;const N=512,pos=new Float32Array(N*24*3),nrm=new Float32Array(N*24*3),uv=new Float32Array(N*24*2),col=new Float32Array(N*24*3),idx=new Uint32Array(N*36);
  for(let i=0;i<N;i++)for(let f=0;f<6;f++){const b=i*24+f*4,q=i*36+f*6;idx[q]=b;idx[q+1]=b+1;idx[q+2]=b+2;idx[q+3]=b;idx[q+4]=b+2;idx[q+5]=b+3;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nrm,3));
  geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setIndex(new THREE.BufferAttribute(idx,1));
  const mesh=new THREE.Mesh(geo,typeof matOp!=='undefined'&&matOp?matOp:new THREE.MeshLambertMaterial({vertexColors:true}));mesh.frustumCulled=false;mesh.name='mgRain';
  const C=[];for(let i=0;i<N;i++)C.push({l:0,id:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,rx:0,ry:0,wx:0,wy:0,s:1,floor:-1e3});
  MG3FX.rain={mesh,geo,C,N,i:0,F:[[1,0,0,0.8],[-1,0,0,0.8],[0,1,0,1],[0,-1,0,0.5],[0,0,1,0.65],[0,0,-1,0.65]]};return MG3FX.rain;}
/* fx.cubes(list): [{id,x,y,z,vx,vy,vz,s,life,floor}] */
function mg3Cubes2(list){const R=mg3RainInit(),RN=MG3FX.R||mg3PtInit()&&MG3FX.R;for(const q of list){const c=R.C[R.i];const slot=R.i;R.i=(R.i+1)%R.N;
    Object.assign(c,{l:q.life||4,id:q.id||B.DIRT,x:q.x,y:q.y,z:q.z,vx:q.vx||0,vy:q.vy||0,vz:q.vz||0,rx:RN()*6,ry:RN()*6,wx:(RN()-0.5)*8,wy:(RN()-0.5)*8,s:q.s||1,floor:q.floor==null?-1e3:q.floor});
    const d=DEFS[c.id],t=d&&d._t;const uv=R.geo.attributes.uv.array,co=R.geo.attributes.color.array;
    for(let f=0;f<6;f++){const ti=t?(f===2?t.top:(f===3?t.bot:t.side)):0,U=tileUV(ti),sh=R.F[f][3];
      const b=(slot*24+f*4);uv[b*2]=U[0];uv[b*2+1]=U[1];uv[b*2+2]=U[2];uv[b*2+3]=U[1];uv[b*2+4]=U[2];uv[b*2+5]=U[3];uv[b*2+6]=U[0];uv[b*2+7]=U[3];
      for(let v=0;v<4;v++){co[(b+v)*3]=sh;co[(b+v)*3+1]=sh;co[(b+v)*3+2]=sh;}}
    R.geo.attributes.uv.needsUpdate=true;R.geo.attributes.color.needsUpdate=true;}
  if(!R.mesh.parent&&typeof scene!=='undefined')scene.add(R.mesh);}
function mg3RainTick(dt){const R=MG3FX.rain;if(!R)return;const pos=R.geo.attributes.position.array,nrm=R.geo.attributes.normal.array;let live=0;const M=[0,0,0,0,0,0,0,0,0],v=[0,0,0],w=[0,0,0];
  for(let i=0;i<R.N;i++){const c=R.C[i],b=i*24*3;if(c.l<=0){if(pos[b]!==0||pos[b+1]!==0){pos.fill(0,b,b+72);}continue;}live++;c.l-=dt;c.vy-=22*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;c.rx+=c.wx*dt;c.ry+=c.wy*dt;
    if(c.y<c.floor+c.s*0.5){c.y=c.floor+c.s*0.5;c.vy*=-0.25;c.vx*=0.6;c.vz*=0.6;c.wx*=0.5;c.wy*=0.5;}
    const s=c.s*Math.min(1,c.l*2.5);mg3Me(c.rx,c.ry,0,'XYZ',M);
    for(let f=0;f<6;f++){const F=R.F[f],u=F[1]?[1,0,0]:(F[0]?[0,0,-F[0]]:[F[2],0,0]),vv=mg3X(F,u);
      mg3Mv(M,F,w);for(let k=0;k<4;k++){const su=k===0||k===3?-1:1,sv=k<2?-1:1;v[0]=(F[0]+u[0]*su+vv[0]*sv)*s/2;v[1]=(F[1]+u[1]*su+vv[1]*sv)*s/2;v[2]=(F[2]+u[2]*su+vv[2]*sv)*s/2;
        mg3Mv(M,v,v);const o=b+(f*4+k)*3;pos[o]=c.x+v[0];pos[o+1]=c.y+v[1];pos[o+2]=c.z+v[2];nrm[o]=w[0];nrm[o+1]=w[1];nrm[o+2]=w[2];}}}
  R.geo.attributes.position.needsUpdate=true;R.geo.attributes.normal.needsUpdate=true;R.mesh.visible=live>0;}
/* ---- rigid world chunks (the scoop's slab, the Meal's plinths, the cracker) */
function mg3Chunk(cells){let cx=0,cy=0,cz=0;for(const c of cells){cx+=c.x+0.5;cy+=c.y+0.5;cz+=c.z+0.5;}const n=Math.max(1,cells.length);cx/=n;cy/=n;cz/=n;
  const g=mg3Geo(mg3Cubes(cells.map(c=>({id:c.id,x:c.x+0.5-cx,y:c.y+0.5-cy,z:c.z+0.5-cz}))));
  const mesh=new THREE.Mesh(g,typeof matOp!=='undefined'&&matOp?matOp:new THREE.MeshLambertMaterial({vertexColors:true}));mesh.name='mgChunk';mesh.position.set(cx,cy,cz);if(typeof scene!=='undefined')scene.add(mesh);
  const h={mesh,c:[cx,cy,cz],cells,v:null,set:function(x,y,z,yaw,pitch,roll){mesh.position.set(x,y,z);mesh.rotation.set(pitch||0,yaw||0,roll||0);},
    free:function(){mg3Detach(mesh);g.dispose&&g.dispose();const i=MG3FX.chunks.indexOf(h);if(i>=0)MG3FX.chunks.splice(i,1);},
    drop:function(vx,vy,vz,floor){h.v=[vx||0,vy||0,vz||0];h.floor=floor==null?-1e3:floor;h.l=4;}};MG3FX.chunks.push(h);return h;}
function mg3ChunkTick(dt){for(const h of MG3FX.chunks.slice()){if(!h.v)continue;h.v[1]-=22*dt;const p=h.mesh.position;p.x+=h.v[0]*dt;p.y+=h.v[1]*dt;p.z+=h.v[2]*dt;h.mesh.rotation.x+=dt*0.8;h.l-=dt;
    if(p.y<h.floor){if(MG3FX.R)mg3Burst('dust',p.x,h.floor+0.5,p.z,{n:16,r:2.5});const cs=h.cells.slice(0,48).map(c=>({id:c.id,x:p.x+(c.x+0.5-h.c[0]),y:h.floor+1,z:p.z+(c.z+0.5-h.c[2]),vx:(MG3FX.R()-0.5)*6,vy:3+MG3FX.R()*5,vz:(MG3FX.R()-0.5)*6,s:0.7,floor:h.floor,life:2.5}));mg3Cubes2(cs);h.free();}
    else if(h.l<=0)h.free();}}
/* ---- void decals (bible 3.6): a black box over each eaten cell until its chunk remeshes, 32 pooled in one mesh ---- */
function mg3DecalInit(){if(MG3FX.decals)return MG3FX.decals;const N=32,B0=mg3BoxG(1.04,1.04,1.04),nv=B0.pos.length/3,ni=B0.idx.length,pos=new Float32Array(N*nv*3),idx=new Uint16Array(N*ni);
  for(let i=0;i<N;i++)for(let k=0;k<ni;k++)idx[i*ni+k]=B0.idx[k]+i*nv;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setIndex(new THREE.BufferAttribute(idx,1));
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x060204}));mesh.frustumCulled=false;mesh.name='mgVoid';
  MG3FX.decals={mesh,geo,B0,nv,N,D:Array.from({length:N},()=>({l:0,x:0,y:0,z:0})),i:0};return MG3FX.decals;}
function mg3Decal(x,y,z,kind){const D=mg3DecalInit(),d=D.D[D.i];D.i=(D.i+1)%D.N;d.l=2.0;d.x=Math.floor(x);d.y=Math.floor(y);d.z=Math.floor(z);d.dirty=1;
  if(!D.mesh.parent&&typeof scene!=='undefined')scene.add(D.mesh);}
function mg3DecalTick(dt){const D=MG3FX.decals;if(!D)return;const a=D.geo.attributes.position.array;let live=0;
  for(let i=0;i<D.N;i++){const d=D.D[i];if(d.l>0){d.l-=dt;const ch=typeof chunkAt==='function'?chunkAt(d.x,d.z):null;if(ch&&!ch.dirty&&d.l<1.85)d.l=0;}
    const on=d.l>0;if(on)live++;for(let k=0;k<D.nv;k++){const o=(i*D.nv+k)*3;if(on){a[o]=D.B0.pos[k*3]+d.x+0.5;a[o+1]=D.B0.pos[k*3+1]+d.y+0.5;a[o+2]=D.B0.pos[k*3+2]+d.z+0.5;}else{a[o]=a[o+1]=a[o+2]=0;}}}
  D.geo.attributes.position.needsUpdate=true;D.mesh.visible=live>0;}
/* ---- the chomp from inside (bible 5.11) */
function mg3PovInit(){if(MG3FX.pov)return MG3FX.pov;const F=mg3Fang(6,4),mk=(s)=>{const out=[];for(let i=0;i<11;i++){const u=(i-5)/5,sz=0.16*(1-Math.abs(u)*0.35)*(i%2?0.8:1);
      out.push({g:F,m:mg3Mm(mg3Me(s>0?Math.PI:0,0,u*0.15*s,'XYZ'),[sz,0,0,0,sz*1.5,0,0,0,sz]),p:[u*0.95,0,-Math.abs(u)*0.25]});}return mg3Geo(mg3Join(out));};
  const mat=new THREE.MeshBasicMaterial({color:0xffe8c0,vertexColors:true,depthTest:false,depthWrite:false,transparent:true});
  const up=new THREE.Mesh(mk(1),mat),lo=new THREE.Mesh(mk(-1),mat),dim=new THREE.Mesh(new THREE.PlaneGeometry(4,3),new THREE.MeshBasicMaterial({color:0x2a0600,transparent:true,opacity:0,depthTest:false,depthWrite:false}));
  for(const m of [up,lo,dim]){m.frustumCulled=false;m.renderOrder=20;m.visible=false;}
  MG3FX.pov={up,lo,dim,t:0,d:0.35};return MG3FX.pov;}
function mg3Chomp(dur){const V=mg3PovInit();V.t=dur||0.35;V.d=V.t;if(typeof scene!=='undefined')for(const m of [V.up,V.lo,V.dim])if(!m.parent)scene.add(m);if(typeof nukeShake==='function')nukeShake(0.6,0.4);}
function mg3PovTick(dt){const V=MG3FX.pov;if(!V)return;const on=V.t>0&&typeof camera!=='undefined'&&camera;for(const m of [V.up,V.lo,V.dim])m.visible=!!on;if(!on)return;V.t-=dt;
  const f=1-Math.max(0,V.t)/V.d,close=mg3Ease(f*1.8),c=camera,ry=c.rotation.y,rx=c.rotation.x;
  const fw=[-Math.sin(ry)*Math.cos(rx),Math.sin(rx),-Math.cos(ry)*Math.cos(rx)],upv=[Math.sin(ry)*Math.sin(rx),Math.cos(rx),Math.cos(ry)*Math.sin(rx)];
  const place=(m,d,off)=>{m.position.set(c.position.x+fw[0]*d+upv[0]*off,c.position.y+fw[1]*d+upv[1]*off,c.position.z+fw[2]*d+upv[2]*off);m.rotation.order='YXZ';m.rotation.set(rx,ry,0);};
  place(V.up,0.9,mg3Lp(1.1,0.16,close));place(V.lo,0.9,mg3Lp(-1.1,-0.16,close));place(V.dim,0.6,0);V.dim.material.opacity=0.85*Math.min(1,f*2.5)*(V.t<0.08?V.t/0.08:1);}
/* ---- props that stay until the reset: the tooth stuck in the plate, the bone that pinged off it, the jaw-print on a spire ---- */
function mg3Prop(kind,x,y,z,o){o=o||{};let m=null;
  if(kind==='tooth'){const g=MG3.geo.toothBig||(MG3.geo.toothBig=mg3Geo(mg3Fang(8,6,1.4)));m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xfff0d8,vertexColors:true,roughness:0.3}));m.scale.set(1.6,2.2,1.6);m.rotation.set(Math.PI*0.92,o.yaw||0,0.12);m.position.set(x,y+2.0,z);}
  else if(kind==='bone'){const g=MG3.geo.bone||(MG3.geo.bone=mg3Geo(mg3Loft({pts:[[0,0,-0.9],[0,0.05,0],[0,0,0.9]],n:8,m:8,up:[0,1,0],prof:(t,a)=>{const r=0.14+0.18*Math.pow(Math.abs(t*2-1),6);return [Math.cos(a)*r,Math.sin(a)*r];},col:()=>[1,0.96,0.85]})));
    m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:0xf2e8d0,vertexColors:true}));m.position.set(x,y+0.2,z);m.rotation.set(0,o.yaw||0,Math.PI/2*0);}
  else if(kind==='jaw'){m=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.6),new THREE.MeshBasicMaterial({color:0x140806,transparent:true,opacity:0.8,depthWrite:false}));m.position.set(x,y,z);m.rotation.set(0,o.yaw||0,0);}
  if(!m)return null;m.name='mgProp_'+kind;if(typeof scene!=='undefined')scene.add(m);MG3FX.props.push({m,kind,v:o.v||null});return m;}
function mg3PropsClear(){for(const p of MG3FX.props)mg3Detach(p.m);MG3FX.props.length=0;}
function mg3FlyTick(dt){for(const f of MG3FX.fly.slice()){f.t+=dt;const m=f.m;
    if(f.kind==='hat'&&typeof P!=='undefined'&&P){const k=Math.min(1,f.t/1.3),e=k*k*(3-2*k),tx=P.x,ty=P.y+P.eyeY+0.35,tz=P.z;
      m.position.set(mg3Lp(f.p0[0],tx,e),mg3Lp(f.p0[1],ty,e)+Math.sin(k*Math.PI)*6,mg3Lp(f.p0[2],tz,e));m.rotation.y+=dt*9;if(k>=1){mg3Detach(m);MG3FX.fly.splice(MG3FX.fly.indexOf(f),1);}}
    else{f.v[1]-=22*dt;m.position.x+=f.v[0]*dt;m.position.y+=f.v[1]*dt;m.position.z+=f.v[2]*dt;m.rotation.x+=dt*5;m.rotation.z+=dt*3;
      if(m.position.y<f.floor+0.25){m.position.y=f.floor+0.25;f.v[1]=Math.abs(f.v[1])*0.45;f.v[0]*=0.7;f.v[2]*=0.7;}if(f.t>6){mg3Detach(m);MG3FX.fly.splice(MG3FX.fly.indexOf(f),1);}}}}
function mg3FxTick(dt){MG3FX.t+=dt;mg3TelTick(dt);mg3PtTick(dt);mg3RainTick(dt);mg3ChunkTick(dt);mg3DecalTick(dt);mg3PovTick(dt);mg3FlyTick(dt);}
function mg3FxClear(){for(const s of MG3FX.pool)s.free();if(MG3FX.parts)for(const k of ['add','alp']){for(const p of MG3FX.parts[k].P)p.l=0;}
  if(MG3FX.rain)for(const c of MG3FX.rain.C)c.l=0;for(const h of MG3FX.chunks.slice())h.free();if(MG3FX.decals)for(const d of MG3FX.decals.D)d.l=0;if(MG3FX.pov)MG3FX.pov.t=0;mg3PropsClear();for(const f of MG3FX.fly)mg3Detach(f.m);MG3FX.fly.length=0;
  mg3PtTick(0);mg3RainTick(0);mg3DecalTick(0);mg3PovTick(0);}
