/* PART 45 - DINGLE CINEMA (three films, all of them enterable) */
B.CINEMA=95;B.SCREEN=96;
def(B.CINEMA,{name:'Cinema Kit',tiles:{top:'cine_t',side:'cine_s',bot:'cine_t'},hard:2,toolClass:'axe'});
def(B.SCREEN,{name:'Silver Screen',tiles:'screen',hard:2.5,toolClass:'pick',interact:'cine'});
tile('cine_t',(c,R)=>{fillN(c,R,'#26262e',.08);c.fillStyle='#e8c14d';c.fillRect(2,2,12,2);c.fillRect(2,12,12,2);});
tile('cine_s',(c,R)=>{fillN(c,R,'#26262e',.08);
  c.fillStyle='#e8c14d';c.fillRect(1,2,14,3);
  c.fillStyle='#8f1a1a';c.fillRect(3,7,10,7);c.fillStyle='#c2a86a';c.fillRect(7,9,2,5);});
tile('screen',(c,R)=>{fillN(c,R,'#0c0c12',.04);c.fillStyle='#e8e8f0';c.fillRect(1,1,14,11);
  c.fillStyle='#c8c8d8';c.fillRect(1,10,14,2);});
IT.POPCORN=280;
idef(IT.POPCORN,{name:'Popcorn',icon:'i_pcorn',food:4});
tile('i_pcorn',c=>{c.clearRect(0,0,16,16);c.fillStyle='#e83a3a';c.fillRect(4,7,8,7);
  c.fillStyle='#fff';c.fillRect(6,7,1,7);c.fillRect(9,7,1,7);
  c.fillStyle='#ffe98a';c.fillRect(4,3,2,3);c.fillRect(7,2,2,3);c.fillRect(10,3,2,3);c.fillRect(6,5,4,2);});
function stampCinema(x,y,z){
  forceChunksNear(x,z);
  for(let dx=-5;dx<=5;dx++)for(let dz=0;dz<=7;dz++)for(let dy=-1;dy<=4;dy++){
    const wx=x+dx,wy=y+dy,wz=z+dz;
    if(wy<1||wy>=WH)continue;
    let id2=-1;
    if(dy===-1)id2=B.SBRICK;
    else if(dy===4)id2=B.SBRICK;
    else if(Math.abs(dx)===5||dz===7)id2=B.SBRICK;
    else if(dz===0)id2=(Math.abs(dx)<=1&&dy<=1)?B.AIR:B.SBRICK;
    else id2=B.AIR;
    if(id2>=0)setBlock(wx,wy,wz,id2);
  }
  for(let dx=-3;dx<=3;dx++)for(let dy2=1;dy2<=3;dy2++)setBlock(x+dx,y+dy2,z+6,B.SCREEN);
  for(let dz=1;dz<=5;dz++)setBlock(x,y,z+dz,B.WOOL);
  for(const rz of [2,4])for(let dx=-3;dx<=3;dx++)if(dx!==0)setBlock(x+dx,y,z+rz,B.SBRICK);
  showToast('The DINGLE CINEMA assembles itself. Now showing: three films.');
  playS('jackpot');
}
let cineOpen=false,M8LAST='';
const M8A=['Absolutely, unless it explodes.','The dirt says yes.','Ask again after the next update.',
 'Malgorath says no, and he would know.','Signs point to lava.','Certain as bedrock.',
 'The Algorithm forbids it.','Mine deeper and reconsider.','Yes, but tell no pigs.',
 'Cloudy. Try the Aether.','No. And stop shaking me.','It is known to the snakes.',
 'Only on a Tuesday.','The prophecy is buffering...','Wholeheartedly maybe.',
 'Hazy. Craft more torches and ask again.','Without a doubt* (*some doubt)',
 'The stars defer to the moon on this one.','Better odds than a loot box.',
 'Do not count on it. Count your diamonds instead.'];
const CIN={mode:'menu',m:0,t:0,px:0,alive:true,flashT:0,drawn:false,rocks:[],res:'',_e:false,_sp:false};
const CINFILMS=[
  {t:'THE GOOD, THE PIG AND THE UGLY',sub:'a western'},
  {t:'ASTEROID ALLEY',sub:'a space epic'},
  {t:'GONE WITH THE DINGLE',sub:'a romance'},
];
function openCine(){
  cineOpen=true;
  CIN.mode='menu';CIN.t=0;
  document.exitPointerLock&&document.exitPointerLock();
  const el=$('cine');if(el)el.style.display='flex';
}
function closeCine(){
  cineOpen=false;
  const el=$('cine');if(el)el.style.display='none';
}
function cineSelect(i){
  CIN.m=i;CIN.mode='play';CIN.t=0;
}
function cineEnter(){
  if(CIN.mode!=='play')return;
  CIN.mode='inside';CIN.t=0;CIN.alive=true;CIN.drawn=false;CIN.res='';
  CIN.px=CIN.m===2?60:320;
  CIN.flashT=2+Math.random()*2.5;
  CIN.rocks=[];
  showToast('You step through the screen...');
}
function cineWin(){
  CIN.mode='end';CIN.res='win';
  givePlayer(IT.POPCORN,2);
  showToast('THE CROWD GOES WILD. +2 Popcorn.');
  playS('jackpot');
}
function cineLose(){
  CIN.mode='end';CIN.res='lose';
  playS('hurt');
}
function tickCine(dt){
  if(!cineOpen)return;
  dt=Math.min(dt,0.05);
  CIN.t+=dt;
  const eE=KEY.KeyE&&!CIN._e;CIN._e=!!KEY.KeyE;
  const spE=KEY.Space&&!CIN._sp;CIN._sp=!!KEY.Space;
  if(CIN.mode==='menu'){
    if(terrKey('Digit1'))cineSelect(0);
    if(terrKey('Digit2'))cineSelect(1);
    if(terrKey('Digit3'))cineSelect(2);
  }else if(CIN.mode==='play'){
    if(eE)cineEnter();
  }else if(CIN.mode==='inside'){
    if(CIN.m===0){
      CIN.flashT-=dt;
      if(CIN.flashT<=0&&CIN.flashT>-0.45){
        if(spE){CIN.drawn=true;cineWin();}
      }else if(CIN.flashT<=-0.45&&!CIN.drawn)cineLose();
      else if(spE&&CIN.flashT>0)cineLose();
    }else if(CIN.m===1){
      CIN.px+=((KEY.KeyD?1:0)-(KEY.KeyA?1:0))*220*dt;
      CIN.px=Math.max(30,Math.min(610,CIN.px));
      if(Math.random()<dt*2.2)CIN.rocks.push({x:30+Math.random()*580,y:-20,v:90+Math.random()*120});
      for(const r2 of CIN.rocks){
        r2.y+=r2.v*dt;
        if(r2.y>270&&r2.y<310&&Math.abs(r2.x-CIN.px)<26){cineLose();break;}
      }
      CIN.rocks=CIN.rocks.filter(r2=>r2.y<380);
      if(CIN.t>15&&CIN.mode==='inside')cineWin();
    }else{
      if(KEY.KeyW)CIN.px+=95*dt;
      if(CIN.px>=560)cineWin();
      else if(CIN.t>10&&CIN.mode==='inside')cineLose();
    }
  }else if(CIN.mode==='end'){
    if(spE||eE){CIN.mode='menu';CIN.t=0;}
  }
  renderCine();
}
function renderCine(){
  const cv=$('cinecv');
  if(!cv||typeof cv.getContext!=='function')return;
  const g=cv.getContext('2d');
  if(!g||typeof g.fillRect!=='function')return;
  g.fillStyle='#08080c';g.fillRect(0,0,640,360);
  g.textAlign='left';g.textBaseline='top';
  if(CIN.mode==='menu'){
    g.fillStyle='#e8c14d';g.font='bold 22px Georgia';
    g.fillText('DINGLE CINEMA',220,24);
    g.font='bold 12px monospace';
    for(let i=0;i<3;i++){
      g.fillStyle='#1a1a24';g.fillRect(40+i*200,80,170,200);
      g.fillStyle=['#c2883a','#20244a','#8f4a2a'][i];g.fillRect(50+i*200,90,150,120);
      g.fillStyle='#fff';
      const words=CINFILMS[i].t.split(' ');
      for(let w2=0;w2<words.length;w2++)g.fillText(words[w2],52+i*200,222+w2*14);
      g.fillStyle='#8a8a96';g.fillText('['+(i+1)+'] '+CINFILMS[i].sub,52+i*200,266);
    }
    g.fillStyle='#8a8a96';g.fillText('press 1 / 2 / 3 to roll film - Esc leaves the cinema',150,330);
    return;
  }
  const m=CIN.m;
  if(m===0){
    g.fillStyle='#e8a860';g.fillRect(0,0,640,260);
    g.fillStyle='#ffe98a';g.beginPath();g.arc(540,60,34,0,6.3);g.fill();
    g.fillStyle='#c2883a';g.fillRect(0,260,640,100);
    g.fillStyle='#2a6a2a';g.fillRect(80,200,14,60);g.fillRect(70,215,10,8);g.fillRect(94,225,10,8);
    const wob=Math.sin(CIN.t*6)*3;
    g.fillStyle='#f2a0b4';g.fillRect(CIN.mode==='inside'?250:200+Math.sin(CIN.t)*40,240+wob,36,24);
    g.fillStyle='#3f8a3f';g.fillRect(380,236,26,34);
    if(CIN.mode==='inside'){
      g.fillStyle='#d9822b';g.fillRect(250,214,16,26);g.fillStyle='#e8b88f';g.fillRect(252,204,12,10);
      if(CIN.flashT<=0&&CIN.flashT>-0.45){g.fillStyle='#fff';g.fillRect(0,0,640,360);g.fillStyle='#e83a3a';g.font='bold 42px Georgia';g.fillText('DRAW!',260,150);}
      else{g.fillStyle='#26262e';g.font='bold 14px monospace';g.fillText('wait for the flash... then SPACE',180,320);}
    }else{g.fillStyle='#fff';g.font='bold 14px monospace';g.fillText(CINFILMS[0].t,150,20);}
  }else if(m===1){
    for(let i=0;i<40;i++){
      const sx4=(i*97)%640,sy4=((i*61)+CIN.t*40)%360;
      g.fillStyle='#cdd3ff';g.fillRect(sx4,sy4,1,1);
    }
    if(CIN.mode==='inside'){
      g.fillStyle='#d8dce4';g.fillRect(CIN.px-16,290,32,14);g.fillRect(CIN.px-4,280,8,10);
      g.fillStyle='#ffab3d';g.fillRect(CIN.px-8,304,6,6);g.fillRect(CIN.px+2,304,6,6);
      g.fillStyle='#8a8f96';
      for(const r2 of CIN.rocks)g.fillRect(r2.x-10,r2.y-10,20,20);
      g.fillStyle='#8a8a96';g.font='bold 12px monospace';g.fillText('A/D to dodge - survive '+Math.max(0,15-CIN.t|0)+'s',220,340);
    }else{
      g.fillStyle='#d8dce4';g.fillRect(300+Math.sin(CIN.t)*80-16,150,32,14);
      g.fillStyle='#fff';g.font='bold 14px monospace';g.fillText(CINFILMS[1].t,180,20);
    }
  }else{
    g.fillStyle='#e86a3a';g.fillRect(0,0,640,240);
    g.fillStyle='#ffd23d';g.beginPath();g.arc(320,240-CIN.t*(CIN.mode==='inside'?14:4),46,0,6.3);g.fill();
    g.fillStyle='#20244a';g.fillRect(0,240,640,120);
    const meX=CIN.mode==='inside'?CIN.px:80+Math.sin(CIN.t*0.6)*20;
    g.fillStyle='#d9822b';g.fillRect(meX,206,16,30);g.fillStyle='#e8b88f';g.fillRect(meX+2,194,12,12);
    g.fillStyle='#f2c2d8';g.fillRect(580,206,16,30);g.fillStyle='#e8b88f';g.fillRect(582,194,12,12);
    if(CIN.mode==='inside'){g.fillStyle='#fff';g.font='bold 12px monospace';g.fillText('hold W - reach your love before the sun sets',170,330);}
    else{g.fillStyle='#fff';g.font='bold 14px monospace';g.fillText(CINFILMS[2].t,200,20);}
  }
  if(CIN.mode==='play'){
    g.fillStyle='rgba(10,10,16,0.75)';g.fillRect(150,300,340,28);
    g.fillStyle='#e8c14d';g.font='bold 13px monospace';g.fillText('press E to ENTER THE MOVIE',200,308);
  }
  if(CIN.mode==='end'){
    g.fillStyle='rgba(8,8,12,0.82)';g.fillRect(0,0,640,360);
    g.fillStyle=CIN.res==='win'?'#3fd06a':'#e83a3a';g.font='bold 34px Georgia';
    g.fillText(CIN.res==='win'?'FIN. (YOU WON)':'FIN. (BADLY)',170,140);
    g.fillStyle='#8a8a96';g.font='bold 12px monospace';g.fillText('Space for the lobby',250,200);
  }
}
{
  const cv=$('cinecv');
  if(cv&&cv.addEventListener){
    cv.addEventListener('pointerdown',ev=>{
      if(CIN.mode==='menu'){
        const r2=cv.getBoundingClientRect();
        const mx2=(ev.clientX-r2.left)*(640/Math.max(1,r2.width));
        const idx=Math.floor((mx2-40)/200);
        if(idx>=0&&idx<3)cineSelect(idx);
      }
      ev.preventDefault();
    });
  }
  const cc2=$('cineclose');if(cc2)cc2.onclick=()=>closeCine();
}

