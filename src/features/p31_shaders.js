/* PART 31 — pretty shaders (toggleable post-processing) */
const SHD={on:false,rt:null,scn:null,cam:null,mat:null};
function initShaders(){
  if(SHD.rt||typeof renderer==='undefined'||!renderer)return;
  const w=window.innerWidth,h=window.innerHeight;
  SHD.rt=new THREE.WebGLRenderTarget(w,h);
  SHD.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  SHD.scn=new THREE.Scene();
  SHD.mat=new THREE.ShaderMaterial({
    uniforms:{tD:{value:SHD.rt.texture},uR:{value:new THREE.Vector2(w,h)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:
      'varying vec2 vUv;uniform sampler2D tD;uniform vec2 uR;\n'+
      'void main(){\n'+
      ' vec2 uv=vUv;vec2 cc=uv-0.5;float r2=dot(cc,cc);\n'+
      ' vec3 col=texture2D(tD,uv).rgb;\n'+
      ' vec2 px=1.7/uR;vec3 blur=vec3(0.);\n'+
      ' blur+=texture2D(tD,uv+vec2(px.x,px.y)).rgb;blur+=texture2D(tD,uv-vec2(px.x,px.y)).rgb;\n'+
      ' blur+=texture2D(tD,uv+vec2(px.x,-px.y)).rgb;blur+=texture2D(tD,uv-vec2(px.x,-px.y)).rgb;\n'+
      ' col+=max(blur*0.25-0.72,0.)*0.8;\n'+
      ' float l=dot(col,vec3(0.299,0.587,0.114));\n'+
      ' col=mix(vec3(l),col,1.14);\n'+
      ' col=(col-0.5)*1.05+0.505;\n'+
      ' col*=vec3(1.04,1.005,0.96);\n'+
      ' col*=1.0-r2*0.32;\n'+
      ' gl_FragColor=vec4(col,1.0);}'
  });
  SHD.scn.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),SHD.mat));
}
function setShaders(on){SHD.on=!!on;if(SHD.on)initShaders();applyShadows(SHD.on);}
function setLock(v){
  usePLock=!!v;
  if(!usePLock)document.exitPointerLock&&document.exitPointerLock();
}

