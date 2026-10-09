/* ---- PART 57: m2_hud.js ---- */
/* ===================================================================== */
/* PART 57 m2 (M2): his HUD (bible 7.3, 7.7). #mgbar: a smooth 600 px    */
/* ember-to-white-hot bar under MALGORATH, THE WORLD-EATER, three round  */
/* pips, a scalloped bitten notch that chews along it as he loses health */
/* (and grows back when he heals), a bite-shaped chunk breaking off at   */
/* every capped window, a grey glass glaze while shielded. No numbers.   */
/* #mgin: "you're in it" (the zone's colour on the screen rim while Dan  */
/* stands in a locked drawing). #mgedge: an ember pulse on the edge that */
/* faces an attack winding up on him out of view.                       */
/* ===================================================================== */
var MG2HUD={shown:0,key:'',chunk:0,chunkX:0,inA:0,edge:'',edgeA:0,t:0,dbg:{}};
function mg2HudEl(id){try{return document.getElementById(id);}catch(err){return null;}}
/* mg2Hud runs only near the arena, so a new world, a load or Save & Quit mid-fight hides the bar and the rims here */
function mg2HudHide(){const H=MG2HUD;H.shown=-1;H.key='';H.inA=0;H.edgeA=0;
  const bar=mg2HudEl('mgbar');if(bar&&bar.style)bar.style.display='none';
  for(const id of ['mgin','mgedge']){const el=mg2HudEl(id);if(el&&el.style)el.style.opacity='0';}}
function mg2Hud(dt){const H=MG2HUD;H.t+=dt;const e=mg2Boss();
  const want=!!e&&!DEMON.dead&&MGF.d<MGC.R_BAR&&!P.dead&&(MGF.live||MALG.met)&&!(MG2.scene&&MG2.scene.k==='death');
  const bar=mg2HudEl('mgbar');
  if(want!==!!H.shown){H.shown=want?1:0;if(bar&&bar.style)bar.style.display=want?'block':'none';}
  if(want){if(e)e.mgBar=1;
    const hp=Math.max(0,Math.min(MG_K.BAR,e.hp)),sh=hp<=1||!!MG2.scene||!MGF.live;
    if(MG2.hudChunk){MG2.hudChunk=0;H.chunk=0.7;H.chunkX=hp/MG_K.BAR;}
    if(H.chunk>0)H.chunk=Math.max(0,H.chunk-dt);
    const key=Math.round(hp*2)+'|'+(MGF.round||MALG.round)+'|'+(sh?1:0)+'|'+(H.chunk>0?Math.round(H.chunk*30):0)+'|'+(MGF.live?1:0);
    if(key!==H.key){H.key=key;mg2HudDraw(hp,sh);}}
  mg2HudRims(dt);}
function mg2HudDraw(hp,sh){const H=MG2HUD,c=mg2HudEl('mgbarc');if(!c||typeof c.getContext!=='function')return;const g=uiCv(c,600,26,uiK(1),0);if(!g)return;   /* device-resolution bar (UI scale, p06e) */
  const W=600,Hh=26,f=hp/MG_K.BAR,x1=Math.round(6+(W-12)*f),r=MGF.round||MALG.round;
  g.clearRect(0,0,W,Hh);
  g.fillStyle='rgba(12,4,4,0.82)';g.fillRect(0,4,W,18);
  g.strokeStyle='rgba(255,170,110,0.55)';g.lineWidth=1;g.strokeRect(0.5,4.5,W-1,17);
  if(x1>6){const gr=g.createLinearGradient(6,0,W-6,0);gr.addColorStop(0,'#5a0c06');gr.addColorStop(0.45,'#d0300c');gr.addColorStop(0.8,'#ff9a3a');gr.addColorStop(1,'#fff2c8');
    g.fillStyle=gr;g.fillRect(6,7,Math.max(0,x1-6),12);
    g.fillStyle='rgba(255,255,255,0.18)';g.fillRect(6,7,Math.max(0,x1-6),3);
    /* the bitten notch: three tooth-scallops chewed out of the bar's end */
    g.fillStyle='rgba(12,4,4,1)';for(let i=0;i<3;i++){g.beginPath();g.arc(x1+1,9+i*4.2,2.6,0,Math.PI*2);g.fill();}}
  if(H.chunk>0){const k=1-H.chunk/0.7,cx=6+(W-12)*H.chunkX;g.fillStyle='rgba(255,140,60,'+(1-k).toFixed(2)+')';g.beginPath();g.arc(cx+8+k*14,13+k*22,4,0,Math.PI*2);g.fill();}
  for(let i=0;i<3;i++){const px=W/2-24+i*24,on=i>=r-1;g.beginPath();g.moveTo(px,0);g.lineTo(px+4,3);g.lineTo(px,6);g.lineTo(px-4,3);g.closePath();
    g.fillStyle=on?'#ffb060':'rgba(80,40,30,0.8)';g.fill();}
  if(sh){g.fillStyle='rgba(190,200,210,0.35)';g.fillRect(6,7,W-12,12);g.fillStyle='rgba(255,255,255,0.25)';for(let x=10;x<W-10;x+=26)g.fillRect(x,7,6,12);}}
/* "you're in it" and the edge vignette: read straight from the telegraph channel (the same drawings Dan sees) */
function mg2HudRims(dt){const H=MG2HUD,inn=mg2HudEl('mgin'),edg=mg2HudEl('mgedge');let col=null,a=0,side='',ea=0;
  if(MGF.live&&!P.dead&&MGT.tel.length){const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
    for(const t of MGT.tel){if(t.col==='gold')continue;const inside=mgTelHit(t,P.x,P.y,P.z);
      if(inside&&t.locked&&(t.col==='white'||t.col==='red')){col=t.col==='red'||col==='red'?'red':'white';a=1;}
      if(inside||t.tgt==='Dan'){const sx=t.srcX!=null?t.srcX:t.x,sz=t.srcZ!=null?t.srcZ:t.z,dx=sx-P.x,dz=sz-P.z,dl=Math.hypot(dx,dz);if(dl<1.5)continue;
        const ang=Math.atan2(fx*dz-fz*dx,fx*dx+fz*dz);if(Math.abs(ang)>0.9){ea=1;side=Math.abs(ang)>2.4?'bottom':(ang>0?'right':'left');}}}}
  H.inA=a?Math.min(1,H.inA+dt*8):Math.max(0,H.inA-dt*4);H.edgeA=ea?Math.min(1,H.edgeA+dt*6):Math.max(0,H.edgeA-dt*3);if(side)H.edge=side;
  const pulse=0.75+0.25*Math.sin(H.t*14);
  if(inn&&inn.style){const o=(H.inA*pulse).toFixed(2);if(inn.style.opacity!==o)inn.style.opacity=o;
    const c=col==='red'?'rgba(255,40,30,0.75)':'rgba(255,255,255,0.6)';if(col&&inn._c!==c){inn._c=c;inn.style.boxShadow='inset 0 0 110px 34px '+c;}}
  if(edg&&edg.style){const o=(H.edgeA*(0.6+0.4*Math.sin(H.t*9))).toFixed(2);if(edg.style.opacity!==o)edg.style.opacity=o;
    if(H.edge&&edg._s!==H.edge){edg._s=H.edge;const m={left:'inset 90px 0 70px -40px',right:'inset -90px 0 70px -40px',bottom:'inset 0 -90px 70px -40px',top:'inset 0 90px 70px -40px'}[H.edge];
      edg.style.boxShadow=m+' rgba(255,90,26,0.85)';}}}
/* a swing at the giant that hits no box still sparks (bible 5.9): a coarse test against his head, hands and axis */
function mg2SwingMiss(e,d,hit){const b=mg2Boss();if(!b||!MGF.live)return;const now=mg2Now();if(now-(MG2HUD.sw||-9)<0.32)return;
  const pts=[mg2Mouth()];for(const k of ['armL','armR']){const a=MGA[k];if(a&&a.x!=null&&a.pose!=='rest')pts.push({x:a.x,y:a.y+0.6,z:a.z});}
  const r=MGF.round||1,F=mgF();
  for(let s=0.4;s<=3.2;s+=0.4){const x=e[0]+d[0]*s,y=e[1]+d[1]*s,z=e[2]+d[2]*s;if(hit&&s>hit.t)break;
    let near=pts.some(p=>Math.hypot(p.x-x,p.y-y,p.z-z)<1.6);
    if(!near&&r===2&&Math.hypot(x-b.x,z-b.z)<3.2&&y<F+12)near=true;
    if(near){MG2HUD.sw=now;mg2Burst('spark',x,y,z,{id:B.STONE,n:4});mg2S('thud',x,y,z);MGA.recoil=Math.max(MGA.recoil,0.15);return;}}}
