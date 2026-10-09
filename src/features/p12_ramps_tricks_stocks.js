/* ===================================================================== */
/* PART 12 — ramps, trick score, surf sounds, the stock exchange (v1.5)  */
/* ===================================================================== */
/* ----- wooden ramps ----- */
B.RAMP=60;
for(let di=0;di<4;di++){
  def(B.RAMP+di,{name:'Wooden Ramp',tiles:'plank_o',hard:2,cls:'axe',
    solid:false,opq:false,bucket:'cut',ramp:DOORD[di],drop:B.RAMP,hide:di>0});
}
R(['P  ','PP ','PPP'],{P:'planks'},B.RAMP,4);
function addRamp(b,x,y,z,d){
  const U=tileUV(Tl.plank_o),u0=U[0],v0=U[1],u1=U[2],v1=U[3];
  const nx=d.ramp[0],nz=d.ramp[1],tx=-nz,tz=nx;
  const cx=x+0.5,cz=z+0.5;
  const lo=[cx-nx*0.5,cz-nz*0.5],hi=[cx+nx*0.5,cz+nz*0.5];
  const V=(px,py,pz,u,v,sh)=>{b.p.push(px,py,pz);b.n.push(0,1,0);b.u.push(u,v);b.c.push(sh,sh,sh);};
  const Q=()=>{const s=b.vc;b.ix.push(s,s+1,s+2,s,s+2,s+3);b.vc+=4;};
  /* slope */
  V(lo[0]-tx*0.5,y,  lo[1]-tz*0.5,u0,v1,0.95);
  V(lo[0]+tx*0.5,y,  lo[1]+tz*0.5,u1,v1,0.95);
  V(hi[0]+tx*0.5,y+1,hi[1]+tz*0.5,u1,v0,0.95);
  V(hi[0]-tx*0.5,y+1,hi[1]-tz*0.5,u0,v0,0.95);Q();
  /* back wall (high side) */
  V(hi[0]-tx*0.5,y,  hi[1]-tz*0.5,u0,v1,0.7);
  V(hi[0]+tx*0.5,y,  hi[1]+tz*0.5,u1,v1,0.7);
  V(hi[0]+tx*0.5,y+1,hi[1]+tz*0.5,u1,v0,0.7);
  V(hi[0]-tx*0.5,y+1,hi[1]-tz*0.5,u0,v0,0.7);Q();
  /* triangular sides (4th vertex repeats -> degenerate half) */
  for(const sg of[1,-1]){
    const sx=tx*sg*0.5,sz=tz*sg*0.5;
    V(lo[0]+sx,y,  lo[1]+sz,u0,v1,0.8);
    V(hi[0]+sx,y,  hi[1]+sz,u1,v1,0.8);
    V(hi[0]+sx,y+1,hi[1]+sz,u1,v0,0.8);
    V(hi[0]+sx,y+1,hi[1]+sz,u1,v0,0.8);Q();
  }
}
function rampInfo(ex,ey,ez){
  for(const oy of[0,-1]){
    const cx=Math.floor(ex),cy=Math.floor(ey+0.02)+oy,cz=Math.floor(ez);
    if(cy<0||cy>=WH)continue;
    const dd=DEFS[getBlock(cx,cy,cz)];
    if(dd&&dd.ramp){
      const r=dd.ramp;
      const t=r[0]!==0?(r[0]>0?ex-cx:cx+1-ex):(r[1]>0?ez-cz:cz+1-ez);
      return {rf:cy+clamp(t,0,1),dx:r[0],dz:r[1]};
    }
  }
  return null;
}
function rampSnap(e,glue,launchK){
  const ri=rampInfo(e.x,e.y,e.z);
  if(ri){
    if(e.y<ri.rf||(glue&&e.vy<=0&&e.y<ri.rf+0.3)){
      e.y=ri.rf;
      if(e.vy<0)e.vy=0;
      e.onGround=true;
    }
    e._ramp=ri;
  }else if(e._ramp){
    const d=e._ramp;
    const along=e.vx*d.dx+e.vz*d.dz;
    if(along>2&&e.vy<=0.5)e.vy=Math.min(12,along*(launchK||0.8));
    e._ramp=null;
  }
}

/* ----- trick score ----- */
let gunLArm=true;
const TRICK={on:false,v:0,total:0,fT:0,fTxt:'',fCol:''};
function trickBump(e,n){
  if(!P||P.ride!==e)return;
  if(!TRICK.on){TRICK.on=true;TRICK.v=0;}
  TRICK.v+=n;
}
function trickBail(){
  if(TRICK.on){TRICK.fT=1.4;TRICK.fTxt='LOST '+Math.round(TRICK.v);TRICK.fCol='#ff5d5d';}
  TRICK.on=false;TRICK.v=0;
}
function trickTick(e,dt,ridden,surf,justLanded,wasG){
  if(!ridden)return; /* parked boards never touch the combo */
  const airborne=!e.onGround&&!surf;
  if(airborne&&TRICK.on)TRICK.v+=dt*16;
  const ds=e.spin-(e._lspin||0);
  if(ds>0&&airborne)trickBump(e,ds*42);
  e._lspin=airborne?e.spin:0;
  if(e.grind&&!TRICK.on)trickBump(e,1);
  if((justLanded||(surf&&!e._wasSurf&&TRICK.on))&&TRICK.on&&!e.grind){
    TRICK.total+=TRICK.v;
    TRICK.fT=1.4;TRICK.fTxt='+'+Math.round(TRICK.v);TRICK.fCol='#7dff7a';
    TRICK.on=false;TRICK.v=0;
  }
  e._wasSurf=surf;
}
function trickFrame(dt){
  if(TRICK.on&&(!P||P.dead||!P.ride||P.ride.t!=='skate'))trickBail();
  const el=$('trick');
  if(!el)return;
  if(TRICK.on){
    el.style.display='block';el.style.color='#ffd24a';
    el.textContent='TRICK '+Math.round(TRICK.v)+(TRICK.total?('  \u00b7  total '+Math.round(TRICK.total)):'');
  }else if(TRICK.fT>0){
    TRICK.fT-=dt;
    el.style.display='block';el.style.color=TRICK.fCol;
    el.textContent=TRICK.fTxt+(TRICK.total?('  \u00b7  total '+Math.round(TRICK.total)):'');
  }else el.style.display='none';
}

/* ----- the DINGLE exchange ----- */
B.PC=64;
def(B.PC,{name:'Computer',tiles:{top:'pc_t',side:'pc_s',bot:'pc_t'},hard:2.5,toolClass:'pick',interact:'pc'});
tile('pc_t',c=>{c.fillStyle='#3b3b42';c.fillRect(0,0,16,16);
  c.fillStyle='#2a2a30';c.fillRect(1,1,14,14);
  c.fillStyle='#55555e';c.fillRect(2,7,12,2);});
tile('pc_s',c=>{c.fillStyle='#3b3b42';c.fillRect(0,0,16,16);
  c.fillStyle='#101418';c.fillRect(2,2,12,9);
  c.fillStyle='#27e07d';c.fillRect(3,8,2,2);c.fillRect(5,6,2,4);c.fillRect(7,7,2,3);c.fillRect(9,4,2,6);c.fillRect(11,5,2,5);
  c.fillStyle='#ff5d5d';c.fillRect(11,3,2,2);
  c.fillStyle='#55555e';c.fillRect(4,12,8,2);c.fillRect(6,14,4,1);});
R(['III','IGI','IDI'],{I:IT.IRON,G:B.GLASS,D:IT.DIAMOND},B.PC,1);

const STOX=['DIRTCO','PORKBL','LAVAINC','DIAMND','BOOMCO','WOOLLY','TORCHY','CACTUS'];
/* saves before Release 1.0 used real-company symbols: the same slot, share for share (applySave, the market and every holding) */
const STOX_OLD=Object.freeze({AAPL:'DIRTCO',MSFT:'PORKBL',NVDA:'LAVAINC',TSLA:'DIAMND',AMZN:'BOOMCO',GOOG:'WOOLLY',META:'TORCHY',NFLX:'CACTUS'});
function stoxMigrate(o){const r={};for(const k in (o||{})){const n=STOX_OLD[k]||k;if(r[n]==null||!STOX_OLD[k])r[n]=o[k];}return r;}
const MKT={t:0,acc:0,p:{},mu:{},h:{}};
function gauss(){
  let u=0,v=0;
  while(u===0)u=Math.random();
  while(v===0)v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(6.28318*v);
}
function initMarket(){
  MKT.t=0;MKT.acc=0;
  for(const s of STOX){
    MKT.p[s]=40+Math.random()*260;
    MKT.mu[s]=(Math.random()-0.5)*0.0018;
    MKT.h[s]=[MKT.p[s]];
  }
}
initMarket();
function updateStocks(dt){
  MKT.acc+=dt;
  let moved=false;
  while(MKT.acc>=0.5){
    MKT.acc-=0.5;MKT.t+=0.5;moved=true;
    for(const s of STOX){
      if(Math.random()<0.012)MKT.mu[s]=(Math.random()-0.5)*0.0022;
      MKT.p[s]=Math.max(0.5,MKT.p[s]*Math.exp(MKT.mu[s]+gauss()*0.011));
      const h=MKT.h[s];h.push(MKT.p[s]);if(h.length>64)h.shift();
    }
  }
  if(moved&&pcOpen)renderPC();
}
let pcOpen=false,pcRows=null;
function pcVal(){
  let v=P.stox.bal;
  for(const s of STOX)v+=(P.stox.sh[s]||0)*MKT.p[s];
  return v;
}
function pcDeposit(n){
  const have=invCount(P.inv,IT.DIAMOND);
  n=Math.min(n,have);
  if(n<1){showToast('No diamonds in your inventory');return;}
  invConsume(P.inv,IT.DIAMOND,n);
  P.stox.bal+=n;
  redrawHotbar();playS('cash');renderMoney();
}
function pcWithdraw(){
  const w=Math.floor(P.stox.bal);
  if(w<1){showToast('Need at least 1.00\u25c6 to withdraw');return;}
  P.stox.bal-=w;
  const left=invAddTo(P.inv,{id:IT.DIAMOND,count:w});
  if(left>0)spawnDrop(P.x,P.y+1,P.z,{id:IT.DIAMOND,count:left},0,2,0);
  redrawHotbar();playS('cash');renderMoney();
}
function pcBuy(sym,amt){
  amt=Math.min(amt,P.stox.bal);
  if(amt<=0.0001){showToast('Deposit diamonds first');return;}
  P.stox.bal-=amt;
  P.stox.sh[sym]=(P.stox.sh[sym]||0)+amt/MKT.p[sym];
  P.stox.cb[sym]=(P.stox.cb[sym]||0)+amt;
  playS('blip');renderPC();
}
function pcSell(sym,amt){ /* amt in diamonds-worth; Infinity = all */
  const sh=P.stox.sh[sym]||0;
  if(sh<=1e-9){showToast('You own no '+sym);return;}
  let shares=amt===Infinity?sh:Math.min(sh,amt/MKT.p[sym]);
  const frac=shares/sh;
  P.stox.sh[sym]=sh-shares;
  P.stox.cb[sym]=(P.stox.cb[sym]||0)*(1-frac);
  if(P.stox.sh[sym]<1e-9){P.stox.sh[sym]=0;P.stox.cb[sym]=0;}
  P.stox.bal+=shares*MKT.p[sym];
  playS('cash');renderPC();
}
function buildPC(){
  const list=$('pclist');
  if(!list||pcRows)return;
  pcRows={};
  for(const s of STOX){
    const row=document.createElement('div');row.className='prow';
    const nm=document.createElement('b');nm.textContent=s;row.appendChild(nm);
    const pp=document.createElement('span');pp.className='pp';row.appendChild(pp);
    const ch=document.createElement('span');ch.className='pch';row.appendChild(ch);
    const cv=document.createElement('canvas');cv.width=116;cv.height=30;cv.className='pcv';row.appendChild(cv);
    const own=document.createElement('span');own.className='pown';row.appendChild(own);
    const ppl=document.createElement('span');ppl.className='ppl';row.appendChild(ppl);
    const mk=(t,fn)=>{const b=document.createElement('button');b.className='mc-btn tiny';b.textContent=t;b.onclick=fn;row.appendChild(b);};
    mk('Buy 1\u25c6',()=>pcBuy(s,1));
    mk('Buy 5\u25c6',()=>pcBuy(s,5));
    mk('Sell 1\u25c6',()=>pcSell(s,1));
    mk('Sell all',()=>pcSell(s,Infinity));
    list.appendChild(row);
    pcRows[s]={pp,ch,cv,own,ppl,last:MKT.p[s]};
  }
  $('pcx').onclick=closePC;
  $('pcdep1').onclick=()=>pcDeposit(1);
  $('pcdepa').onclick=()=>pcDeposit(9999);
  $('pcwd').onclick=pcWithdraw;
}
function renderPC(){
  if(!pcOpen||!pcRows)return;
  $('pcbal').textContent='Balance '+P.stox.bal.toFixed(2)+'\u25c6  \u00b7  Portfolio '+pcVal().toFixed(2)+'\u25c6';
  {
    let tv=0,tc=0;
    for(const s of STOX){const sh=P.stox.sh[s]||0;if(sh>1e-9){tv+=sh*MKT.p[s];tc+=P.stox.cb[s]||0;}}
    const el=$('pcpl');
    if(el){
      if(tc>1e-9){
        const pl=tv-tc;
        el.textContent='Your P/L '+(pl>=0?'+':'')+pl.toFixed(2)+'\u25c6 ('+(pl>=0?'+':'')+((tv/tc-1)*100).toFixed(1)+'%)';
        el.style.color=pl>=0?'#157a1e':'#b02525';
      }else el.textContent='';
    }
  }
  $('pcdia').textContent=invCount(P.inv,IT.DIAMOND);
  for(const s of STOX){
    const r=pcRows[s],h=MKT.h[s],p=MKT.p[s];
    r.pp.textContent=p.toFixed(2)+'\u25c6';
    const base=h[0]||p;
    const pct=(p/base-1)*100;
    r.ch.textContent=(pct>=0?'+':'')+pct.toFixed(1)+'%';
    r.ch.style.color=pct>=0?'#157a1e':'#b02525';
    const dirUp=p>=r.last;r.last=p;
    r.pp.style.color=dirUp?'#157a1e':'#b02525';
    const sh=P.stox.sh[s]||0;
    r.own.textContent=sh>1e-9?(sh*p).toFixed(2)+'\u25c6 held':'';
    const pl=pcPL(s);
    if(pl){
      r.ppl.textContent=(pl.pl>=0?'\u25b2 +':'\u25bc ')+pl.pl.toFixed(2)+'\u25c6 ('+(pl.pl>=0?'+':'')+pl.pct.toFixed(1)+'%)';
      r.ppl.style.color=pl.pl>=0?'#157a1e':'#b02525';
    }else r.ppl.textContent='';
    const g=r.cv.getContext('2d');
    if(g){
      const W=r.cv.width,H=r.cv.height;
      g.clearRect(0,0,W,H);
      let mn=Infinity,mx=-Infinity;
      for(const v of h){if(v<mn)mn=v;if(v>mx)mx=v;}
      if(mx-mn<0.001)mx=mn+0.001;
      g.strokeStyle=h[h.length-1]>=h[0]?'#27e07d':'#ff5d5d';
      g.lineWidth=1.5;g.beginPath();
      for(let i=0;i<h.length;i++){
        const x=i/(Math.max(h.length-1,1))*(W-4)+2;
        const y=(H-3)-((h[i]-mn)/(mx-mn))*(H-7);
        i?g.lineTo(x,y):g.moveTo(x,y);
      }
      g.stroke();
    }
  }
}
function openPC(){
  if(pcOpen)return;
  pcOpen=true;
  buildPC();
  $('pc').style.display='flex';
  document.exitPointerLock&&document.exitPointerLock();
  MB.l=MB.r=false;
  renderPC();
  playS('blip');
}
function closePC(){
  if(!pcOpen)return;
  pcOpen=false;
  $('pc').style.display='none';
  tryLock();
}
/* extra sounds */
const _playS5=playS;
playS=function(n){
  if(!soundOn)return;
  try{
    switch(n){
      case 'surfs':noiseS(0.16,0.1,900,350);return;
      case 'cash': tone(880,660,0.06,'square',0.22);tone(1320,990,0.06,'square',0.18);return;
      case 'blip': tone(660,720,0.05,'square',0.2);return;
      default:_playS5(n);
    }
  }catch(e){}
};


