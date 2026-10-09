/* PART 35 — DEEP DIRT 2D v2 (a 2D mining experience, now with content) */
/* Original procedural pixel art throughout. Save lives in the rig's block entity.
   v2 saves carry w/h + tools; v1 saves (160x96) still load. */
B.TERM=79;
def(B.TERM,{name:'Gaming Rig',tiles:{top:'term_t',side:'term_f',bot:'term_t'},hard:2,toolClass:'axe',interact:'terr'});
tile('term_t',c=>{fillF(c,'#3a3a44');c.fillStyle='#26262e';c.fillRect(2,2,12,12);});
tile('term_f',c=>{fillF(c,'#3a3a44');
  c.fillStyle='#10121c';c.fillRect(2,2,12,9);
  c.fillStyle='#3fd06a';c.fillRect(3,3,7,1);c.fillRect(3,5,5,1);c.fillRect(3,7,9,1);
  c.fillStyle='#8a8a96';c.fillRect(4,12,8,2);});
let terrOpen=false;
let helpOpen=false;
function openHelp(){helpOpen=true;const el=$('help');if(el)el.style.display='flex';}
function closeHelp(){helpOpen=false;const el=$('help');if(el)el.style.display='none';restorePause();}
/* tiles: 0 air 1 dirt 2 grass 3 stone 4 ore 5 bedrock 6 torch 7 wood 8 leaves 9 planks 10 brick 11 flower 12 tuft */
const TSOLID=[false,true,true,true,true,true,false,true,false,true,true,false,false];
const TBAR=[1,3,7,9,10,6];
const TG={bek:null,w:220,h:110,t:null,hs:null,px:110,py:20,vx:0,vy:0,onG:false,coy:0,fallV:0,dir:1,anim:0,
  sel:1,binv:{1:0,3:0,6:8,7:0,9:0,10:0},ore:0,pick:0,sword:0,won:false,hp:10,tm:0.3,sx:110,sy:20,
  slimes:[],bats:[],items:[],parts:[],craft:false,
  mx:320,my:200,md:false,place:false,mAcc:0,mTx:-1,mTy:-1,hurtT:0,saveT:0,_dk:{},_kc:false,_rg:0};
const TCRAFTS=[
  {k:'planks', n:'4 PLANKS',    need:{7:1},        give:{9:4}},
  {k:'torch',  n:'2 TORCHES',   need:{9:2},        give:{6:2}},
  {k:'brick',  n:'2 BRICK',     need:{3:4},        give:{10:2}},
  {k:'spick',  n:'STONE PICK',  need:{3:10,7:3},   tool:'pick',lvl:1},
  {k:'gpick',  n:'GOLD PICK',   need:{ore:8,9:5},  tool:'pick',lvl:2},
  {k:'gsword', n:'GOLD SWORD',  need:{ore:6,9:4},  tool:'sword',lvl:1},
  {k:'trophy', n:'GOLDEN DINGLE',need:{ore:15},    win:true},
];
function tIdx(x,y){return y*TG.w+x;}
function tAt(x,y){return (x<0||y<0||x>=TG.w||y>=TG.h)?5:TG.t[tIdx(x,y)];}
function tSolid(x,y){return !!TSOLID[tAt(x,y)];}
function terrHasNeed(nd){
  for(const k in nd){
    if(k==='ore'){if(TG.ore<nd[k])return false;}
    else if((TG.binv[k]||0)<nd[k])return false;
  }
  return true;
}
function terrCraft(k){
  const c=TCRAFTS.find(x=>x.k===k);
  if(!c||!terrHasNeed(c.need))return false;
  if(c.k==='spick'&&TG.pick>=1)return false;
  if(c.k==='gpick'&&TG.pick>=2)return false;
  if(c.k==='gsword'&&TG.sword>=1)return false;
  if(c.k==='trophy'&&TG.won)return false;
  for(const kk in c.need){
    if(kk==='ore')TG.ore-=c.need[kk];
    else TG.binv[kk]-=c.need[kk];
  }
  if(c.give)for(const kk in c.give)TG.binv[kk]=(TG.binv[kk]||0)+c.give[kk];
  if(c.tool==='pick')TG.pick=c.lvl;
  if(c.tool==='sword')TG.sword=c.lvl;
  if(c.win){TG.won=true;
    for(let i=0;i<40;i++)TG.parts.push({x:TG.px,y:TG.py-1,vx:(Math.random()-0.5)*14,vy:-4-Math.random()*8,t:1.6,col:Math.random()<0.5?'#ffd23d':'#ffe98a'});
  }
  playS('place');
  return true;
}
function terrGen(seed){
  const R=mulberry32(seed>>>0);
  TG.w=220;TG.h=110;
  TG.t=new Uint8Array(TG.w*TG.h);TG.hs=new Int16Array(TG.w);
  let hh=46;
  for(let x=0;x<TG.w;x++){
    hh+=(R()*2-1)+Math.sin(x*0.07)*0.45;
    hh=Math.max(30,Math.min(66,hh));
    TG.hs[x]=hh|0;
    for(let y=hh|0;y<TG.h;y++){
      let v=y===(hh|0)?2:(y<hh+6?1:3);
      if(v===3&&R()<0.035)v=4;
      TG.t[tIdx(x,y)]=v;
    }
  }
  for(let c2=0;c2<55;c2++){
    let cx=R()*TG.w,cy=(TG.hs[cx|0]||46)+10+R()*(TG.h-(TG.hs[cx|0]||46)-18);
    for(let s2=0;s2<55;s2++){
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        const tx=(cx|0)+dx,ty=(cy|0)+dy;
        if(tx>0&&ty>2&&tx<TG.w-1&&ty<TG.h-2)TG.t[tIdx(tx,ty)]=0;
      }
      cx+=R()*2-1;cy+=R()*2-0.85;
    }
  }
  /* trees + surface decoration */
  let nx2=6+R()*8;
  for(let x=4;x<TG.w-4;x++){
    const gy=TG.hs[x];
    if(TG.t[tIdx(x,gy)]!==2)continue;
    if(x>nx2){
      nx2=x+8+R()*10;
      const th=4+(R()*3|0);
      for(let ty=1;ty<=th;ty++)TG.t[tIdx(x,gy-ty)]=7;
      for(let lx=-2;lx<=2;lx++)for(let ly=0;ly<3;ly++){
        const ax=x+lx,ay=gy-th-ly;
        if(Math.abs(lx)===2&&ly===2)continue;
        if(ax>0&&ay>0&&ax<TG.w&&TG.t[tIdx(ax,ay)]===0)TG.t[tIdx(ax,ay)]=8;
      }
    }else if(R()<0.16)TG.t[tIdx(x,gy-1)]=R()<0.3?11:12;
  }
  for(let x=0;x<TG.w;x++){TG.t[tIdx(x,TG.h-1)]=5;TG.t[tIdx(x,TG.h-2)]=5;}
  TG.px=TG.sx=TG.w/2;TG.py=TG.sy=TG.hs[TG.w/2|0]-2;
  TG.vx=TG.vy=0;TG.binv={1:0,3:0,6:8,7:0,9:0,10:0};TG.ore=0;
  TG.pick=0;TG.sword=0;TG.won=false;TG.hp=10;TG.tm=0.3;
  TG.slimes=[];TG.bats=[];TG.items=[];TG.parts=[];
}
function terrRLE(){
  const out=[];
  let run=1;
  for(let i=1;i<=TG.t.length;i++){
    if(i<TG.t.length&&TG.t[i]===TG.t[i-1]&&run<255)run++;
    else{out.push(TG.t[i-1],run);run=1;}
  }
  return new Uint8Array(out);
}
function terrUnRLE(bytes,len){
  const t=new Uint8Array(len);
  let o=0;
  for(let i=0;i<bytes.length&&o<len;i+=2)
    for(let r2=0;r2<bytes[i+1]&&o<len;r2++)t[o++]=bytes[i];
  return t;
}
function b64enc(bytes){
  const A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let s2='';
  for(let i=0;i<bytes.length;i+=3){
    const b=(bytes[i]<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);
    s2+=A[b>>18&63]+A[b>>12&63]+(i+1<bytes.length?A[b>>6&63]:'=')+(i+2<bytes.length?A[b&63]:'=');
  }
  return s2;
}
function saveTerr(){
  if(!TG.bek||!TG.t)return;
  const be=blockEnts.get(TG.bek);
  if(!be)return;
  be.terr={v:2,w:TG.w,h:TG.h,d:b64enc(terrRLE()),px:+TG.px.toFixed(2),py:+TG.py.toFixed(2),
    hp:TG.hp,tm:+TG.tm.toFixed(3),sel:TG.sel,binv:{...TG.binv},ore:TG.ore,sx:TG.sx,sy:TG.sy,
    pick:TG.pick,sword:TG.sword,won:TG.won?1:0};
}
function openTerr(bek){
  const be=blockEnts.get(bek);
  if(!be)return;
  TG.bek=bek;
  if(be.terr&&(be.terr.v===1||be.terr.v===2)){
    const sv=be.terr;
    TG.w=sv.w||160;TG.h=sv.h||96;          /* v1 saves were 160x96 */
    TG.t=terrUnRLE(b64bytes(sv.d),TG.w*TG.h);
    TG.hs=new Int16Array(TG.w);
    for(let x=0;x<TG.w;x++){let y=0;while(y<TG.h&&!TSOLID[TG.t[tIdx(x,y)]])y++;TG.hs[x]=y;}
    TG.px=sv.px;TG.py=sv.py;TG.hp=sv.hp;TG.tm=sv.tm;TG.sel=sv.sel||1;
    TG.binv={1:0,3:0,6:0,7:0,9:0,10:0,...sv.binv};TG.ore=sv.ore||0;TG.sx=sv.sx;TG.sy=sv.sy;
    TG.pick=sv.pick||0;TG.sword=sv.sword||0;TG.won=!!sv.won;
    TG.vx=TG.vy=0;TG.slimes=[];TG.bats=[];TG.items=[];TG.parts=[];
  }else terrGen(hashSeed(bek+'::dirtaria')^SEED);
  terrOpen=true;TG.saveT=0;TG.craft=false;
  document.exitPointerLock&&document.exitPointerLock();
  const el=$('terr');if(el)el.style.display='flex';
}
function closeTerr(){
  if(!terrOpen)return;
  saveTerr();
  terrOpen=false;
  const el=$('terr');if(el)el.style.display='none';
}
function terrHurt(n){
  if(TG.hurtT>0)return;
  TG.hp-=n;TG.hurtT=1;playS('hurt');
  for(let i=0;i<6;i++)TG.parts.push({x:TG.px,y:TG.py,vx:(Math.random()-0.5)*8,vy:-3-Math.random()*4,t:0.5,col:'#ff5a5a'});
  if(TG.hp<=0){TG.hp=10;TG.px=TG.sx;TG.py=TG.sy;TG.vx=TG.vy=0;TG.slimes=[];TG.bats=[];}
}
function terrBurst(x,y,col,n2){
  for(let i=0;i<n2;i++)TG.parts.push({x:x+0.5,y:y+0.5,vx:(Math.random()-0.5)*9,vy:-2-Math.random()*5,t:0.45,col});
}
const TCOL={1:'#7a5a38',2:'#57a63c',3:'#7b7d84',4:'#e8c14d',5:'#1c1c22',6:'#ffab3d',7:'#6a4a26',8:'#3f8a34',9:'#a8783e',10:'#8a8f96',11:'#e85a9a',12:'#4c9a3e'};
function terrKey(code){const k=KEY[code]&&!TG._dk[code];TG._dk[code]=!!KEY[code];return k;}
function tickTerr(dt){
  if(!terrOpen||!TG.t)return;
  dt=Math.min(dt,0.05);
  TG.tm=(TG.tm+dt/260)%1;
  TG.hurtT=Math.max(0,TG.hurtT-dt);
  TG.saveT+=dt;if(TG.saveT>10){TG.saveT=0;saveTerr();}
  TG.anim+=dt;
  /* hotbar + craft panel keys */
  for(let i=0;i<TBAR.length;i++)if(terrKey('Digit'+(i+1)))TG.sel=TBAR[i];
  if(terrKey('KeyC'))TG.craft=!TG.craft;
  /* movement */
  const mv=(KEY.KeyD?1:0)-(KEY.KeyA?1:0);
  if(mv)TG.dir=mv;
  TG.vx=lerp(TG.vx,mv*11.5,1-Math.exp(-dt*14));
  TG.coy=TG.onG?0.09:Math.max(0,TG.coy-dt);
  if(KEY.Space&&TG.coy>0){TG.vy=-15;TG.coy=0;TG.onG=false;}
  TG.vy=Math.min(TG.vy+34*dt,26);
  if(TG.vy>0)TG.fallV=Math.max(TG.fallV,TG.vy);
  const step=(dx,dy)=>{
    let nx=TG.px+dx,ny=TG.py+dy;
    const hw=0.38,hh2=0.9;
    if(dx!==0){
      const ex=nx+(dx>0?hw:-hw);
      if(tSolid(ex|0,(TG.py-hh2+0.1)|0)||tSolid(ex|0,(TG.py)|0)||tSolid(ex|0,(TG.py+hh2-0.1)|0)){nx=TG.px;TG.vx=0;}
    }
    TG.px=nx;
    if(dy!==0){
      const ey=ny+(dy>0?hh2:-hh2);
      if(tSolid((TG.px-0.3)|0,ey|0)||tSolid((TG.px+0.3)|0,ey|0)){
        if(dy>0){
          if(!TG.onG&&TG.fallV>19)terrHurt(Math.min(4,((TG.fallV-19)*0.4)|0)+1);
          TG.onG=true;TG.fallV=0;
        }
        TG.vy=0;ny=TG.py;
      }else if(dy>0)TG.onG=false;
      TG.py=ny;
    }
  };
  step(TG.vx*dt,0);step(0,TG.vy*dt);
  if(TG.py>TG.h)TG.py=TG.h-6;
  /* camera + cursor */
  const camX=Math.max(0,Math.min(TG.w-80,TG.px-40)),camY=Math.max(0,Math.min(TG.h-50,TG.py-25));
  const cx2=camX+TG.mx/8,cy2=camY+TG.my/8;
  TG.mTx=cx2|0;TG.mTy=cy2|0;
  const reach=Math.hypot(cx2-TG.px,cy2-TG.py)<6.2;
  /* mine / fight */
  if(TG.md&&reach&&!TG.craft){
    let hit=null;
    for(const sl of TG.slimes)if(Math.hypot(sl.x-cx2,sl.y-cy2)<1.4){hit=sl;break;}
    if(!hit)for(const bt of TG.bats)if(Math.hypot(bt.x-cx2,bt.y-cy2)<1.2){hit=bt;break;}
    if(hit){
      if(hit.hT<=0){
        const dmg2=2+TG.sword*2;
        hit.hp-=dmg2;hit.hT=0.35;hit.vx=(hit.x<TG.px?-6:6);hit.vy=-5;playS('hit');
        if(hit.hp<=0){
          terrBurst(hit.x,hit.y,hit.bat?'#6a5a7a':'#3fae4a',8);
          if(hit.bat)TG.bats.splice(TG.bats.indexOf(hit),1);
          else{
            TG.slimes.splice(TG.slimes.indexOf(hit),1);
            const r3=Math.random();
            if(r3<0.3)TG.items.push({x:hit.x,y:hit.y,vy:-3,k:'heart',t:30});
            else if(r3<0.85)TG.items.push({x:hit.x,y:hit.y,vy:-3,k:'ore',t:30});
          }
        }
      }
      TG.mAcc=0;
    }else{
      const tv=tAt(TG.mTx,TG.mTy);
      if(tv&&tv!==5){
        TG.mAcc+=dt;
        const base={1:0.3,2:0.32,3:0.72,4:0.8,6:0.05,7:0.5,8:0.05,9:0.35,10:0.8,11:0.05,12:0.05}[tv]||0.4;
        const need=base/(1+TG.pick*0.85);
        if(TG.mAcc>=need){
          TG.mAcc=0;
          TG.t[tIdx(TG.mTx,TG.mTy)]=0;
          terrBurst(TG.mTx,TG.mTy,TCOL[tv],6);
          if(tv===4)TG.ore++;
          else if(tv===2)TG.binv[1]=(TG.binv[1]||0)+1;
          else if(tv===8||tv===11||tv===12){/* decoration crumbles */}
          else TG.binv[tv]=(TG.binv[tv]||0)+1;
          if(TG.mTy<(TG.hs[TG.mTx]||0)){/* opened sky */}
          playS('dig');
        }
      }else TG.mAcc=0;
    }
  }else TG.mAcc=0;
  /* place */
  if(TG.place){
    TG.place=false;
    if(!TG.craft){
      const overlaps=Math.abs(TG.mTx+0.5-TG.px)<0.9&&Math.abs(TG.mTy+0.5-TG.py)<1.4;
      if(reach&&!overlaps&&tAt(TG.mTx,TG.mTy)===0&&(TG.binv[TG.sel]||0)>0){
        TG.t[tIdx(TG.mTx,TG.mTy)]=TG.sel;
        TG.binv[TG.sel]--;
        terrBurst(TG.mTx,TG.mTy,TCOL[TG.sel],3);
        playS('place');
      }
    }
  }
  /* slimes */
  const night=TG.tm>0.62||TG.tm<0.08;
  if(night&&TG.slimes.length<5&&Math.random()<dt*0.45){
    const sx2=Math.max(2,Math.min(TG.w-3,TG.px+(Math.random()<0.5?-1:1)*(14+Math.random()*18)));
    let sy2=0;while(sy2<TG.h-3&&!tSolid(sx2|0,sy2+1))sy2++;
    TG.slimes.push({x:sx2,y:sy2,vx:0,vy:0,hp:3,hT:0,b:Math.random()*2});
  }
  if(!night&&TG.slimes.length&&Math.random()<dt*0.5)TG.slimes.pop();
  for(const sl of TG.slimes){
    sl.hT=Math.max(0,sl.hT-dt);sl.b+=dt;
    sl.vy=Math.min(sl.vy+30*dt,24);
    if(tSolid(sl.x|0,(sl.y+0.55)|0)){
      sl.vy=0;
      if(sl.b>1.05){sl.b=0;sl.vy=-9.5;sl.vx=(TG.px>sl.x?1:-1)*(3+Math.random()*2.5);}
      else sl.vx*=0.8;
    }
    const nx3=sl.x+sl.vx*dt;
    if(!tSolid((nx3+(sl.vx>0?0.45:-0.45))|0,sl.y|0))sl.x=nx3;else sl.vx=0;
    sl.y+=sl.vy*dt;
    if(tSolid(sl.x|0,(sl.y+0.5)|0))sl.y=((sl.y+0.5)|0)-0.5;
    if(Math.hypot(sl.x-TG.px,sl.y-TG.py)<1.1)terrHurt(1);
  }
  /* bats in the deep */
  const depth=TG.py-(TG.hs[TG.px|0]||0);
  if(depth>10&&TG.bats.length<2&&Math.random()<dt*0.25){
    TG.bats.push({x:TG.px+(Math.random()<0.5?-8:8),y:TG.py-2,vx:0,vy:0,hp:1,hT:0,ph:Math.random()*6,bat:true});
  }
  for(const bt of TG.bats){
    bt.hT=Math.max(0,bt.hT-dt);bt.ph+=dt*7;
    bt.vx=lerp(bt.vx,(TG.px-bt.x)*0.8,1-Math.exp(-dt*2));
    bt.vy=lerp(bt.vy,(TG.py-1-bt.y)*0.8+Math.sin(bt.ph)*3,1-Math.exp(-dt*2));
    const bx2=bt.x+bt.vx*dt,by2=bt.y+bt.vy*dt;
    if(!tSolid(bx2|0,bt.y|0))bt.x=bx2;
    if(!tSolid(bt.x|0,by2|0))bt.y=by2;
    if(Math.hypot(bt.x-TG.px,bt.y-TG.py)<1)terrHurt(1);
  }
  if(depth<4&&TG.bats.length&&Math.random()<dt)TG.bats.pop();
  /* pickups */
  for(let i=TG.items.length-1;i>=0;i--){
    const it=TG.items[i];
    it.t-=dt;
    it.vy=Math.min(it.vy+22*dt,18);
    if(tSolid(it.x|0,(it.y+0.4)|0))it.vy=0;else it.y+=it.vy*dt;
    const dd=Math.hypot(it.x-TG.px,it.y-TG.py);
    if(dd<2.2){it.x=lerp(it.x,TG.px,0.25);it.y=lerp(it.y,TG.py,0.25);}
    if(dd<0.8){
      if(it.k==='heart')TG.hp=Math.min(10,TG.hp+2);
      else TG.ore++;
      playS('pop');
      TG.items.splice(i,1);
    }else if(it.t<=0)TG.items.splice(i,1);
  }
  /* particles */
  for(let i=TG.parts.length-1;i>=0;i--){
    const p3=TG.parts[i];
    p3.t-=dt;p3.vy+=20*dt;p3.x+=p3.vx*dt;p3.y+=p3.vy*dt;
    if(p3.t<=0)TG.parts.splice(i,1);
  }
  /* day regen */
  if(!night&&TG.hp<10){TG._rg+=dt;if(TG._rg>5){TG._rg=0;TG.hp++;}}
  renderTerr(camX,camY);
}
function renderTerr(camX,camY){
  const cv=$('terrcv');
  if(!cv||typeof cv.getContext!=='function')return;
  const g=cv.getContext('2d');
  if(!g||typeof g.fillRect!=='function')return;
  const day=TG.tm>0.12&&TG.tm<0.58;
  const dusk=Math.min(Math.abs(TG.tm-0.12),Math.abs(TG.tm-0.58))<0.05;
  /* sky gradient */
  const top=day?(dusk?'#c86a4a':'#5aa8e8'):(dusk?'#3a2a4a':'#060818');
  const bot=day?(dusk?'#f0b070':'#a8dcff'):(dusk?'#6a3a52':'#141a3a');
  try{
    const gr=g.createLinearGradient(0,0,0,400);
    gr.addColorStop(0,top);gr.addColorStop(1,bot);
    g.fillStyle=gr;
  }catch(e2){g.fillStyle=top;}
  g.fillRect(0,0,640,400);
  /* stars */
  if(!day){
    g.fillStyle='#cdd3ff';
    for(let i=0;i<44;i++){
      const sx4=((i*97+((i*i)%31)*53)%640),sy4=((i*61)%180);
      g.fillRect(sx4,sy4,(i%7===0)?2:1,(i%7===0)?2:1);
    }
  }
  /* sun / moon */
  const ca=TG.tm*Math.PI*2-Math.PI*0.5;
  g.fillStyle=day?'#ffe98a':'#e8e8f4';
  g.beginPath();g.arc(320+Math.cos(ca)*270,340-Math.abs(Math.sin(ca))*300,15,0,6.3);g.fill();
  /* parallax hills */
  g.fillStyle=day?'rgba(70,120,80,0.45)':'rgba(20,26,50,0.6)';
  g.beginPath();g.moveTo(0,400);
  for(let x=0;x<=640;x+=16)g.lineTo(x,240-Math.sin((x+camX*3)*0.012)*26-Math.sin((x+camX*3)*0.031)*12);
  g.lineTo(640,400);g.closePath();g.fill();
  g.fillStyle=day?'rgba(52,96,62,0.55)':'rgba(14,18,38,0.7)';
  g.beginPath();g.moveTo(0,400);
  for(let x=0;x<=640;x+=16)g.lineTo(x,282-Math.sin((x+camX*5)*0.017)*20);
  g.lineTo(640,400);g.closePath();g.fill();
  /* clouds */
  g.fillStyle=day?'rgba(255,255,255,0.75)':'rgba(180,190,220,0.25)';
  for(let i=0;i<3;i++){
    const cx3=((TG.anim*6+i*230-camX*2)%760)-60,cy3=42+i*34;
    g.fillRect(cx3,cy3,64,10);g.fillRect(cx3+10,cy3-7,40,8);g.fillRect(cx3+18,cy3+9,34,7);
  }
  /* torch list */
  const torches=[];
  for(let y=camY|0;y<Math.min(TG.h,(camY|0)+51);y++)
    for(let x=camX|0;x<Math.min(TG.w,(camX|0)+81);x++)
      if(TG.t[tIdx(x,y)]===6)torches.push([x,y]);
  /* tiles */
  for(let y=camY|0;y<Math.min(TG.h,(camY|0)+51);y++){
    for(let x=camX|0;x<Math.min(TG.w,(camX|0)+81);x++){
      const v=TG.t[tIdx(x,y)];
      if(!v)continue;
      const sx3=(x-camX)*8,sy3=(y-camY)*8;
      const hsh=((x*73856093)^(y*19349663))>>>0;
      const shade=1+(((hsh>>4)&7)-3.5)*0.016;
      g.fillStyle=TCOL[v];
      g.fillRect(sx3,sy3,8,8);
      if(shade<1){g.fillStyle='rgba(0,0,0,'+((1-shade)*3).toFixed(2)+')';g.fillRect(sx3,sy3,8,8);}
      else if(shade>1){g.fillStyle='rgba(255,255,255,'+((shade-1)*2.4).toFixed(2)+')';g.fillRect(sx3,sy3,8,8);}
      if(TSOLID[v]&&!TSOLID[tAt(x,y-1)]){g.fillStyle='rgba(255,255,255,0.16)';g.fillRect(sx3,sy3,8,2);}
      if(TSOLID[v]&&!TSOLID[tAt(x,y+1)]){g.fillStyle='rgba(0,0,0,0.2)';g.fillRect(sx3,sy3+6,8,2);}
      if(v===2){g.fillStyle='#6cc44c';g.fillRect(sx3,sy3,8,3);
        g.fillStyle='#7ed45c';g.fillRect(sx3+((hsh>>2)&3),sy3,2,4);}
      if(v===4){g.fillStyle='#e8c14d';
        g.fillRect(sx3+1,sy3+2,2,2);g.fillRect(sx3+5,sy3+4,2,2);g.fillRect(sx3+3,sy3+6,2,1);}
      if(v===6){g.fillStyle='#8a6a3a';g.fillRect(sx3+3,sy3+2,2,6);
        g.fillStyle='#ffd23d';g.fillRect(sx3+2,sy3,4,3);
        g.fillStyle='#fff2a0';g.fillRect(sx3+3,sy3,2,1);}
      if(v===7){g.fillStyle='rgba(0,0,0,0.22)';g.fillRect(sx3+2,sy3,1,8);g.fillRect(sx3+5,sy3,1,8);}
      if(v===8){g.fillStyle='#4f9a40';g.fillRect(sx3+((hsh>>3)&3),sy3+((hsh>>5)&3),3,3);}
      if(v===9){g.fillStyle='rgba(0,0,0,0.18)';g.fillRect(sx3,sy3+3,8,1);g.fillRect(sx3+4,sy3,1,3);g.fillRect(sx3+2,sy3+4,1,4);}
      if(v===10){g.fillStyle='rgba(0,0,0,0.2)';g.fillRect(sx3,sy3+3,8,1);g.fillRect(sx3,sy3+7,8,1);g.fillRect(sx3+3,sy3,1,3);g.fillRect(sx3+6,sy3+4,1,3);}
      if(v===11){g.fillStyle='#3c7a30';g.fillRect(sx3+3,sy3+4,2,4);g.fillStyle='#ffd23d';g.fillRect(sx3+3,sy3+1,2,2);}
      if(v===12){g.fillStyle='#5cae4c';g.fillRect(sx3+1,sy3+3,1,5);g.fillRect(sx3+4,sy3+2,1,6);g.fillRect(sx3+6,sy3+4,1,4);}
      const dep=y-(TG.hs[x]||0);
      if(dep>4){
        let dk=Math.min(0.93,(dep-4)*0.085+(day?0:0.25));
        for(const tc of torches){
          const dd=Math.hypot(tc[0]-x,tc[1]-y);
          if(dd<7.5)dk=Math.min(dk,Math.max(0,dd/7.5-0.18));
        }
        if(dk>0.02){g.fillStyle='rgba(4,4,10,'+dk.toFixed(2)+')';g.fillRect(sx3,sy3,8,8);}
      }else if(!day){
        g.fillStyle='rgba(8,8,20,0.35)';g.fillRect(sx3,sy3,8,8);
      }
    }
  }
  /* torch glow */
  for(const tc of torches){
    const gx3=(tc[0]-camX)*8+4,gy3=(tc[1]-camY)*8+2;
    try{
      const rg=g.createRadialGradient(gx3,gy3,2,gx3,gy3,40);
      rg.addColorStop(0,'rgba(255,190,90,0.28)');rg.addColorStop(1,'rgba(255,190,90,0)');
      g.fillStyle=rg;g.fillRect(gx3-40,gy3-40,80,80);
    }catch(e3){}
  }
  /* crack overlay on mining target */
  if(TG.mAcc>0.02){
    const tv=tAt(TG.mTx,TG.mTy);
    const base={1:0.3,2:0.32,3:0.72,4:0.8,7:0.5,9:0.35,10:0.8}[tv]||0.4;
    const f2=Math.min(1,TG.mAcc/(base/(1+TG.pick*0.85)));
    const sx3=(TG.mTx-camX)*8,sy3=(TG.mTy-camY)*8;
    g.fillStyle='rgba(0,0,0,0.55)';
    if(f2>0.2)g.fillRect(sx3+3,sy3+1,1,4);
    if(f2>0.45){g.fillRect(sx3+1,sy3+4,3,1);g.fillRect(sx3+5,sy3+3,2,1);}
    if(f2>0.7){g.fillRect(sx3+2,sy3+6,4,1);g.fillRect(sx3+6,sy3+5,1,3);}
  }
  /* pickups */
  for(const it of TG.items){
    const ix=(it.x-camX)*8,iy=(it.y-camY)*8;
    if(it.k==='heart'){g.fillStyle='#ff5a5a';g.fillRect(ix-2,iy-2,2,2);g.fillRect(ix+1,iy-2,2,2);g.fillRect(ix-2,iy,5,2);g.fillRect(ix-1,iy+2,3,1);}
    else{g.fillStyle='#e8c14d';g.fillRect(ix-2,iy-2,4,4);g.fillStyle='#fff2a0';g.fillRect(ix-1,iy-1,1,1);}
  }
  /* slimes (squash & stretch) */
  for(const sl of TG.slimes){
    const sx3=(sl.x-camX)*8,sy3=(sl.y-camY)*8;
    const air=Math.abs(sl.vy)>1;
    const w2=air?8:11,h2=air?9:6;
    g.fillStyle=sl.hT>0?'#c8f0c8':'rgba(63,174,74,0.92)';
    g.fillRect(sx3-w2/2,sy3-h2+3,w2,h2);
    g.fillStyle='rgba(255,255,255,0.35)';g.fillRect(sx3-w2/2+1,sy3-h2+4,2,2);
    g.fillStyle='#1a3a1e';g.fillRect(sx3-2,sy3-1,2,2);g.fillRect(sx3+2,sy3-1,2,2);
  }
  /* bats */
  for(const bt of TG.bats){
    const bx3=(bt.x-camX)*8,by3=(bt.y-camY)*8;
    const fl=Math.sin(bt.ph)>0;
    g.fillStyle=bt.hT>0?'#c8b8d8':'#5a4a6a';
    g.fillRect(bx3-2,by3-2,4,4);
    g.fillRect(bx3-6,fl?by3-4:by3-1,4,2);g.fillRect(bx3+2,fl?by3-4:by3-1,4,2);
    g.fillStyle='#ffd23d';g.fillRect(bx3-1,by3-1,1,1);g.fillRect(bx3+1,by3-1,1,1);
  }
  /* player (walk anim, facing, mining arm) */
  const px3=(TG.px-camX)*8,py3=(TG.py-camY)*8;
  const walk=Math.abs(TG.vx)>1?Math.sin(TG.anim*11)*2:0;
  g.fillStyle=TG.hurtT>0.7?'#ff9a9a':'#e8b88f';
  g.fillRect(px3-2,py3-8,5,4);
  g.fillStyle='#2b2430';g.fillRect(TG.dir>0?px3+1:px3-2,py3-7,1,1);
  g.fillStyle='#d9822b';g.fillRect(px3-3,py3-4,7,6);
  g.fillStyle='#34343a';
  g.fillRect(px3-3,py3+2,3,5+walk);g.fillRect(px3+1,py3+2,3,5-walk);
  if(TG.md&&!TG.craft){
    g.strokeStyle='#e8b88f';g.lineWidth=2;
    g.beginPath();g.moveTo(px3,py3-2);
    g.lineTo(px3+(TG.mTx+0.5-TG.px)*3,py3-2+(TG.mTy+0.5-TG.py)*3);g.stroke();
  }
  /* particles */
  for(const p3 of TG.parts){
    g.fillStyle=p3.col;
    g.fillRect((p3.x-camX)*8-1,(p3.y-camY)*8-1,2,2);
  }
  /* cursor */
  g.fillStyle='rgba(255,255,255,0.35)';
  g.fillRect((TG.mTx-camX)*8,(TG.mTy-camY)*8,8,1);g.fillRect((TG.mTx-camX)*8,(TG.mTy-camY)*8+7,8,1);
  g.fillRect((TG.mTx-camX)*8,(TG.mTy-camY)*8,1,8);g.fillRect((TG.mTx-camX)*8+7,(TG.mTy-camY)*8,1,8);
  /* ---- HUD ---- */
  g.fillStyle='rgba(10,10,16,0.62)';g.fillRect(0,0,640,24);
  g.fillStyle='#ff5a5a';
  for(let i=0;i<Math.ceil(TG.hp/2);i++)g.fillRect(8+i*13,7,9,9);
  g.fillStyle='#3a3a44';
  for(let i=Math.ceil(TG.hp/2);i<5;i++)g.fillRect(8+i*13,7,9,9);
  /* hotbar with swatches */
  let hx=86;
  g.font='bold 10px monospace';g.textAlign='left';g.textBaseline='top';
  for(let i=0;i<TBAR.length;i++){
    const k=TBAR[i],selq=k===TG.sel;
    g.fillStyle=selq?'rgba(255,227,77,0.25)':'rgba(255,255,255,0.06)';
    g.fillRect(hx-2,3,52,18);
    if(selq){g.fillStyle='#ffe34d';g.fillRect(hx-2,3,52,1);g.fillRect(hx-2,20,52,1);}
    g.fillStyle=TCOL[k];g.fillRect(hx,7,10,10);
    g.fillStyle='#fff';g.fillText(String(TG.binv[k]||0),hx+13,8);
    hx+=56;
  }
  g.fillStyle='#e8c14d';g.fillText('ORE '+TG.ore,hx+2,8);
  /* tool badges */
  g.fillStyle=['#9a6b39','#8a8a8a','#ffe34d'][TG.pick];g.fillText('⛏'+TG.pick,hx+62,8);
  g.fillStyle=TG.sword?'#ffe34d':'#5a5a64';g.fillText('⚔'+TG.sword,hx+92,8);
  if(TG.won){g.fillStyle='#ffd23d';g.fillText('👑',hx+120,7);}
  /* craft button */
  g.fillStyle=TG.craft?'#ffe34d':'#9a9aa6';
  g.fillText('[C]RAFT',566,8);
  /* craft panel */
  if(TG.craft){
    g.fillStyle='rgba(10,10,18,0.88)';g.fillRect(430,30,204,TCRAFTS.length*32+14);
    g.fillStyle='#ffe34d';g.fillText('CRAFTING',442,38);
    for(let i=0;i<TCRAFTS.length;i++){
      const c4=TCRAFTS[i],can=terrHasNeed(c4.need)&&
        !(c4.k==='spick'&&TG.pick>=1)&&!(c4.k==='gpick'&&TG.pick>=2)&&
        !(c4.k==='gsword'&&TG.sword>=1)&&!(c4.k==='trophy'&&TG.won);
      g.fillStyle=can?'rgba(255,227,77,0.14)':'rgba(255,255,255,0.04)';
      g.fillRect(438,50+i*32,188,26);
      g.fillStyle=can?'#fff':'#6a6a74';
      g.fillText(c4.n,444,54+i*32);
      g.fillStyle='#9a9aa6';
      let needs='';
      for(const kk in c4.need)needs+=(needs?' ':'')+c4.need[kk]+'x'+(kk==='ore'?'ORE':({1:'DIRT',3:'STONE',7:'WOOD',9:'PLANK',10:'BRICK'}[kk]||kk));
      g.fillText(needs,444,64+i*32);
    }
  }
  g.fillStyle='#8a8a96';g.font='bold 9px monospace';
  g.fillText('[WASD/SPACE] move  [LMB] mine/fight  [RMB] build  [1-6] select  [C] craft  [ESC] save+quit',8,388);
  g.fillStyle='#fff';g.font='bold 11px monospace';g.fillText('DEEP DIRT 2D',548,375);
}
{
  const cv=$('terrcv');
  if(cv&&cv.addEventListener){
    const pos=ev=>{const r=cv.getBoundingClientRect();
      TG.mx=(ev.clientX-r.left)*(640/Math.max(1,r.width));
      TG.my=(ev.clientY-r.top)*(400/Math.max(1,r.height));};
    cv.addEventListener('pointermove',pos);
    cv.addEventListener('pointerdown',ev=>{
      pos(ev);
      /* craft panel clicks */
      if(TG.craft&&TG.mx>=438&&TG.mx<=626&&TG.my>=50&&TG.my<50+TCRAFTS.length*32){
        const idx=((TG.my-50)/32)|0;
        if(idx>=0&&idx<TCRAFTS.length)terrCraft(TCRAFTS[idx].k);
        ev.preventDefault();return;
      }
      if(TG.mx>=560&&TG.my<=24){TG.craft=!TG.craft;ev.preventDefault();return;}
      if(ev.button===2)TG.place=true;else TG.md=true;
      ev.preventDefault();
    });
    addEventListener('pointerup',()=>{TG.md=false;});
    cv.addEventListener('contextmenu',ev=>ev.preventDefault());
  }
  const tc=$('terrclose');if(tc)tc.onclick=()=>closeTerr();
}

