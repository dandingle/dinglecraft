/* ---- PART 57 HR: m4_b_grade.js ---- */
/* ===================================================================== */
/* PART 57 HR · m4_b_grade.js (M4): the round-aware Hyperreal grade       */
/* (bible 19.2). Hook HR1 calls hrMgGrade(dt,snap) inside hrSky's         */
/* overworld branch; HR3 multiplies the dome's sun disc by hrMgSun().     */
/* ===================================================================== */
/* Presets (key/sky/gnd are RAW light colours, fog/hor/zen are sRGB -> linear, as hrSky keeps them; near/far in metres; exp is the
   target exposure; bloom/haze multiply; amb is the ambient floor; dark kills stars and moon; keyM scales the key light).
   ASH approach + asleep · EMBER round I (furnace bounce up out of the Throat) · BLOOD round II · ECLIPSE round III (the sun is
   eaten: his one light, mirrored, is the key; the floor never drops below the island-top luminance target) · DAWN the death
   (an over-exposed flash, then golden hour easing back to the true time of day).
   Weight: 0 beyond MGC.R_GRADE (140 m), 1 inside 40 m (it was 40 -> 25 in v6.2). The preset eases (1.5/s, Eclipse/Dawn follow
   MGL directly). After his death the grade fades out over 4 s and then returns {w:0}: the v6.2 ash grade never comes back over a
   cleared Bite. Returns null only beyond 140 m or before boot: v6.2 character for character there. */
const HR_MG_PRE={
  ash:    {keyM:.72,key:hrMgRaw(0xffe2cc),sky:hrMgRaw(0x8a7c7a),gnd:hrMgRaw(0x4a3a34),hemi:1.05,fog:hrMgLin(0x6e605c),hor:hrMgLin(0x857672),zen:hrMgLin(0x4a4252),
           near:16,far:110,exp:1.12,bloom:1.4,haze:1.6,amb:.12,dark:0},   /* overcast ash light (kf_lip), brighter than the bible's #3a2a26 */
  ember:  {keyM:.5, key:hrMgRaw(0xff9a62),sky:hrMgRaw(0x6a2a18),gnd:hrMgRaw(0xff5a1a),hemi:1.3,fog:hrMgLin(0x6a2c18),hor:hrMgLin(0xc0561e),zen:hrMgLin(0x8a3a18),
           near:14,far:90,exp:1.12,bloom:1.6,haze:1.5,amb:.16,dark:.3},
  blood:  {keyM:.4, key:hrMgRaw(0xff7262),sky:hrMgRaw(0x5a1818),gnd:hrMgRaw(0xd01a12),hemi:1.2,fog:hrMgLin(0x5a1a14),hor:hrMgLin(0xa82a1c),zen:hrMgLin(0x6a1a12),
           near:12,far:90,exp:1.12,bloom:1.8,haze:2.0,amb:.16,dark:.45},
  eclipse:{keyM:.05,key:hrMgRaw(0xffe6a0),sky:hrMgRaw(0x4a3050),gnd:hrMgRaw(0xc8d048),hemi:1.1,fog:hrMgLin(0x0a0408),hor:hrMgLin(0x2a0a20),zen:hrMgLin(0x050208),
           near:8,far:55,exp:1.0,bloom:2.4,haze:1.2,amb:.4,dark:1},
  dawn:   {keyM:1.15,key:hrMgRaw(0xffc890),sky:hrMgRaw(0xffd2a8),gnd:hrMgRaw(0x8a5a3a),hemi:1.15,fog:hrMgLin(0xd8a070),hor:hrMgLin(0xf2bc84),zen:hrMgLin(0x6a8ac0),
           near:30,far:170,exp:1.3,bloom:1.5,haze:1.2,amb:.12,dark:0}};
const HR_MG_GF=['keyM','hemi','near','far','exp','bloom','haze','amb','dark'],HR_MG_GC=['key','sky','gnd','fog','hor','zen'];
function hrMgGNew(){const g={w:0};for(const k of HR_MG_GF)g[k]=0;for(const k of HR_MG_GC)g[k]=[0,0,0];return g;}
function hrMgGCopy(o,a){for(const k of HR_MG_GF)o[k]=a[k];for(const k of HR_MG_GC){o[k][0]=a[k][0];o[k][1]=a[k][1];o[k][2]=a[k][2];}return o;}
function hrMgGMix(o,a,b,t){for(const k of HR_MG_GF)o[k]=a[k]+(b[k]-a[k])*t;
  for(const k of HR_MG_GC){const x=a[k],y=b[k],z=o[k];z[0]=x[0]+(y[0]-x[0])*t;z[1]=x[1]+(y[1]-x[1])*t;z[2]=x[2]+(y[2]-x[2])*t;}return o;}
/* which preset the published look asks for (MGL is written by M2; with M2 on its stub, round III live means the Eclipse) */
function hrMgPreset(){
  if(DEMON.dead&&!(MGL.dawn>0))return 'none';
  if(!MGL.live&&!(MGL.dawn>0))return 'ash';
  return MGL.round>=3?'blood':(MGL.round===2?'blood':'ember');}   /* round III's Eclipse is blended on top by its own weight */
function hrMgEclW(){const m2=!!(MGREG.fight&&!MGREG.fight.stub);   /* the real fight publishes MGL.eclipse / MGL.dark */
  if(DEMON.dead&&!(MGL.dawn>0))return 0;
  if(m2)return hrMgCl(Math.max(+MGL.eclipse||0,+MGL.dark||0),0,1);
  return MGL.live&&MGL.round>=3?1:0;}
var HR_MG_T=null;   /* scratch: the target preset (eased toward), built on first use */
function hrMgGrade(dt,snap){
  if(typeof P==='undefined'||!P||typeof DIM==='undefined'||DIM!=='over')return null;
  const d=Math.hypot(P.x-MGC.X,P.z-MGC.Z);HR_MG.dist=d;
  if(d>MGC.R_GRADE){HR_MG.wOut=0;HR_MG.ecl=0;HR_MG.snapNext=true;return null;}
  if(!HR_MG.g){HR_MG.g=hrMgGNew();HR_MG_T=hrMgGNew();HR_MG.out=hrMgGNew();}
  dt=dt||0;const G=HR_MG.g,T=HR_MG_T,O=HR_MG.out,pre=hrMgPreset(),sn=snap||HR_MG.snapNext;HR_MG.snapNext=false;
  /* target: the round preset, the Eclipse on top of it by its weight, the Dawn on top of everything by MGL.dawn */
  hrMgGCopy(T,HR_MG_PRE[pre==='none'?'ash':pre]);
  const ecl=hrMgEclW();if(ecl>0)hrMgGMix(T,T,HR_MG_PRE.eclipse,ecl);
  const dawn=hrMgCl(+MGL.dawn||0,0,1);if(dawn>0)hrMgGMix(T,T,HR_MG_PRE.dawn,dawn);
  HR_MG.pre=pre;HR_MG.ecl=ecl;
  const k=sn?1:1-Math.exp(-1.5*dt);hrMgGMix(G,G,T,k);
  if(ecl>0.98||sn)hrMgGMix(G,G,T,ecl>0.98?Math.max(k,0.35):1);   /* the eaten sun is not eased away: the scene owns that shot */
  /* presence: fades out over ~4 s after his death (and the Dawn) */
  const want=pre==='none'?0:1;HR_MG.gw=sn?want:HR_MG.gw+(want-HR_MG.gw)*(1-Math.exp(-dt/1.3));
  const wd=hrMgCl((MGC.R_GRADE-d)/(MGC.R_GRADE-40),0,1),w=wd*wd*(3-2*wd)*HR_MG.gw;HR_MG.wOut=w;
  hrMgGCopy(O,G);O.w=w;
  /* keyM is applied unweighted by the hook (keyI*=g.keyM): weight it here. dark gates the moon at .5 (unweighted): weight it too */
  O.keyM=1+(G.keyM-1)*w;O.dark=G.dark*w;
  /* the burst over-exposes for ~0.4 s (MGL.dawn 1 -> .85), then golden hour; a weak-point hit (MGL.flash) is a small bloom pulse only */
  const fl=hrMgCl(+MGL.flash||0,0,1),bu=hrMgCl((dawn-0.85)/0.15,0,1);
  if(fl>0||bu>0){O.exp=G.exp*(1+0.12*fl+2.2*bu);O.bloom=G.bloom*(1+0.3*fl+1.5*bu);}
  return O;}
/* the sun disc: eaten under the Eclipse (1 = unchanged, exactly, whenever the grade is idle) */
function hrMgSun(){if(!(HR_MG.wOut>0)||!(HR_MG.ecl>0))return 1;return 1-hrMgCl(HR_MG.ecl*Math.min(1,HR_MG.wOut*1.6),0,1);}
