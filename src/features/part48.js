/* PART 48 - JUMPSCARES (all art and audio original, drawn/synthesized in-engine) */
const SCARE={t:0,kind:-1};
function drawScareGnome(g,w,h){
  g.fillStyle='#0a0a10';g.fillRect(0,0,w,h);
  const cx=w/2,s=w/260;
  g.fillStyle='#e8b88f';g.fillRect(cx-60*s,h*0.34,120*s,110*s); /* face */
  g.fillStyle='#f2c8a8';g.fillRect(cx-72*s,h*0.42,16*s,40*s);g.fillRect(cx+56*s,h*0.42,16*s,40*s); /* ears */
  g.fillStyle='#d42a1a';g.beginPath();
  g.moveTo(cx-84*s,h*0.36);g.lineTo(cx+84*s,h*0.36);g.lineTo(cx+10*s,h*0.06);g.closePath();g.fill(); /* hat */
  g.fillStyle='#fff';g.fillRect(cx-44*s,h*0.44,30*s,26*s);g.fillRect(cx+14*s,h*0.44,30*s,26*s); /* eyes */
  g.fillStyle='#2a1d12';g.fillRect(cx-34*s,h*0.475,12*s,14*s);g.fillRect(cx+24*s,h*0.475,12*s,14*s);
  g.fillStyle='#e89a70';g.fillRect(cx-10*s,h*0.52,20*s,18*s); /* nose */
  g.fillStyle='#e8e8ea';g.beginPath(); /* beard */
  g.moveTo(cx-64*s,h*0.58);g.lineTo(cx+64*s,h*0.58);g.lineTo(cx+30*s,h*0.9);g.lineTo(cx-30*s,h*0.9);g.closePath();g.fill();
  g.fillStyle='#8a4a3a';g.fillRect(cx-16*s,h*0.6,32*s,10*s); /* mouth */
  g.fillStyle='#fff';g.font='bold '+Math.round(26*s)+'px monospace';g.textAlign='center';
  g.fillText("HELLO ME OL' CHUM!",cx,h*0.97,w*0.92); /* maxWidth: the caption fits the canvas */
}
function drawScareMascot(g,w,h){
  g.fillStyle='#050508';g.fillRect(0,0,w,h);
  const cx=w/2,s=w/260;
  g.fillStyle='#5a6152';g.fillRect(cx-80*s,h*0.2,160*s,150*s); /* matted head */
  g.fillStyle='#4a5044';g.fillRect(cx-104*s,h*0.12,44*s,44*s);g.fillRect(cx+60*s,h*0.12,44*s,44*s); /* ears */
  g.fillStyle='#3a4036';g.fillRect(cx-94*s,h*0.145,24*s,24*s);g.fillRect(cx+70*s,h*0.145,24*s,24*s);
  g.fillStyle='#f2f2f2';g.beginPath();g.arc(cx-36*s,h*0.34,26*s,0,6.3);g.fill();
  g.beginPath();g.arc(cx+36*s,h*0.34,26*s,0,6.3);g.fill(); /* staring eyes */
  g.fillStyle='#111';g.beginPath();g.arc(cx-32*s,h*0.35,5*s,0,6.3);g.fill();
  g.beginPath();g.arc(cx+40*s,h*0.35,5*s,0,6.3);g.fill(); /* tiny wrong pupils */
  g.fillStyle='#3a4036';g.fillRect(cx-20*s,h*0.42,40*s,26*s); /* snout */
  g.fillStyle='#1a1d18';g.fillRect(cx-56*s,h*0.52,112*s,50*s); /* jaw open */
  g.fillStyle='#e8e8e0';
  for(let i=0;i<6;i++){g.fillRect(cx-50*s+i*18*s,h*0.52,12*s,14*s);g.fillRect(cx-50*s+i*18*s,h*0.615,12*s,12*s);}
  g.fillStyle='#7a8272';for(let i=0;i<4;i++)g.fillRect(cx-70*s+i*40*s,h*0.24,3*s,16*s); /* stitches */
  g.fillStyle='#c8c8d0';g.font='bold '+Math.round(20*s)+'px monospace';g.textAlign='center';
  g.fillText('THE MASCOT REMEMBERS YOU',cx,h*0.95,w*0.92);
}
function triggerScare(kind){
  SCARE.t=1;SCARE.kind=kind;
  if(soundOn)playS(kind===0?'honk':(kind===1?'boomx':'scream')); /* v6.8: always the in-engine synth (no file loading) */
  if(kind===1){SCARE.t=0.25;return;} /* boom is sound-only */
  const el=$('scare');
  if(el)el.style.display='flex';
  const cv=$('scarecv');
  if(cv&&typeof cv.getContext==='function'){
    const g=cv.getContext('2d');
    if(g&&typeof g.fillRect==='function'){
      if(kind===0)drawScareGnome(g,cv.width||520,cv.height||520);
      else drawScareMascot(g,cv.width||520,cv.height||520);
    }
  }
}
function tickScare(dt){
  if(SCARE.t>0){
    SCARE.t-=dt;
    if(SCARE.t<=0){
      SCARE.t=0;SCARE.kind=-1;
      const el=$('scare');
      if(el)el.style.display='none';
    }
  }
  if(!playing||paused||!P||P.dead)return;
  if(Math.random()<(GR.jsc||0)/100)triggerScare((Math.random()*3)|0);
}

