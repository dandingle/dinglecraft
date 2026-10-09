/* ===================================================================== */
/* PART 13 — alien villages, dialogue, romance & ragebait  (v1.6)        */
/* ===================================================================== */
/* ----- blocks & items ----- */
B.ALIENM=65;B.ALIENL=66;
def(B.ALIENM,{name:'Alien Alloy',tiles:'alienm',hard:3.5,toolClass:'pick',tier:1});
def(B.ALIENL,{name:'Alien Lamp',tiles:'alienl',hard:0.5,light:true});
tile('alienm',c=>{c.fillStyle='#3d4a5c';c.fillRect(0,0,16,16);
  c.fillStyle='#4c5d73';c.fillRect(1,1,14,6);c.fillRect(1,9,14,6);
  c.fillStyle='#2a3340';c.fillRect(0,7,16,2);c.fillRect(7,0,2,16);
  c.fillStyle='#8f7bd8';c.fillRect(2,2,1,1);c.fillRect(13,2,1,1);c.fillRect(2,13,1,1);c.fillRect(13,13,1,1);
  c.fillStyle='#6ad7c8';c.fillRect(4,11,3,1);c.fillRect(10,4,3,1);});
tile('alienl',c=>{c.fillStyle='#2a3340';c.fillRect(0,0,16,16);
  c.fillStyle='#49f2a1';c.fillRect(3,3,10,10);
  c.fillStyle='#a8ffd9';c.fillRect(5,5,6,6);
  c.fillStyle='#e8fff4';c.fillRect(6,6,3,3);
  c.fillStyle='#1c2430';c.fillRect(0,0,3,1);c.fillRect(13,0,3,1);c.fillRect(0,15,3,1);c.fillRect(13,15,3,1);});
IT.VEGG=220;
idef(IT.VEGG,{name:'Village Egg',icon:'i_vegg',stack:4});
tile('i_vegg',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#bfe6c8';c.fillRect(5,3,6,10);c.fillRect(4,5,8,7);c.fillRect(6,2,4,1);
  c.fillStyle='#7ec850';c.fillRect(5,6,2,2);c.fillRect(9,9,2,2);c.fillRect(8,4,1,1);
  c.fillStyle='#49f2a1';c.fillRect(7,0,2,2);
  c.fillStyle='#3d4a5c';c.fillRect(4,12,8,2);});
R(['III','I I','III'],{I:IT.IRON},IT.VEGG,1);

/* ----- deterministic village placement ----- */
const VGRID=112;
const VSEEN=new Set();
const VLAY=new Map();
const VPEND=[];
let VB=null;
function vCell(gx,gz){
  if(h2(gx*7+13,gz*7-5,SEED+4242)>0.52)return null;
  const ox=24+Math.floor(h2(gx,gz,SEED+4343)*(VGRID-48));
  const oz=24+Math.floor(h2(gx,gz,SEED+4444)*(VGRID-48));
  const cx=gx*VGRID+ox,cz=gz*VGRID+oz;
  const ci=colInfo(cx,cz);
  if(ci.h<SEA+2||ci.h>WH-16||ci.b===BIOME.OCEAN)return null;
  if(mgNoStruct(cx,cz))return null;
  return {id:gx+','+gz,cx,cz,gy:ci.h};
}
function layoutAt(cx,cz,gy){
  const bl=new Map(),sp=[];
  const put=(x,y,z,id)=>{if(y>0&&y<WH)bl.set(x+','+y+','+z,id);};
  /* flatten a disc, clear the air above */
  for(let dx=-14;dx<=14;dx++)for(let dz=-14;dz<=14;dz++){
    const d=Math.hypot(dx,dz);
    if(d>14)continue;
    const x=cx+dx,z=cz+dz;
    for(let y=gy-3;y<=gy-1;y++)put(x,y,z,B.DIRT);
    put(x,gy,z,d>12.5?B.GRASS:B.GRASS);
    for(let y=gy+1;y<=gy+10;y++)put(x,y,z,B.AIR);
  }
  /* landed saucer at the centre */
  for(const [sx,sz] of [[-3,-3],[3,-3],[-3,3],[3,3]])
    for(let y=gy+1;y<=gy+2;y++)put(cx+sx,y,cz+sz,B.ALIENM);
  for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++){
    const d=Math.hypot(dx,dz);
    if(d<=4.6)put(cx+dx,gy+3,cz+dz,d<0.8?B.ALIENL:B.ALIENM);
    if(d<=3.1)put(cx+dx,gy+4,cz+dz,B.ALIENM);
    if(d<=1.6)put(cx+dx,gy+5,cz+dz,B.ALIENM);
  }
  put(cx,gy+6,cz,B.ALIENL);
  sp.push([cx+0.5,gy+1,cz-5.5],[cx-5.5,gy+1,cz+0.5]);
  /* four dome huts with doorways facing the saucer */
  for(const a of [0.79,2.36,3.93,5.5]){
    const hx=cx+Math.round(Math.sin(a)*10),hz=cz+Math.round(Math.cos(a)*10);
    const dxc=Math.sign(cx-hx)||0,dzc=Math.sign(cz-hz)||0;
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
      put(hx+dx,gy,hz+dz,B.ALIENM);                         /* floor */
      const ring=Math.abs(dx)===2||Math.abs(dz)===2;
      for(let y=gy+1;y<=gy+3;y++){
        if(ring)put(hx+dx,y,hz+dz,B.ALIENM);
        else put(hx+dx,y,hz+dz,B.AIR);
      }
      put(hx+dx,gy+4,hz+dz,B.ALIENM);                       /* roof */
      if(Math.abs(dx)<=1&&Math.abs(dz)<=1)put(hx+dx,gy+5,hz+dz,B.ALIENM);
    }
    put(hx,gy+4,hz,B.ALIENL);                               /* ceiling lamp */
    /* doorway */
    const doorx=hx+(dxc!==0?dxc*2:0),doorz=hz+(dxc!==0?0:dzc*2);
    put(doorx,gy+1,doorz,B.AIR);put(doorx,gy+2,doorz,B.AIR);
    /* metal path to the saucer */
    let px=hx+dxc*3,pz=hz+dzc*3;
    for(let i=0;i<5;i++){put(px,gy,pz,B.ALIENM);px+=dxc;pz+=dzc;}
    sp.push([hx+0.5,gy+1,hz+0.5]);
  }
  return {bl,sp};
}
function villageLayout(v){
  let lay=VLAY.get(v.id);
  if(!lay){lay=layoutAt(v.cx,v.cz,v.gy);VLAY.set(v.id,lay);}
  return lay;
}
function stampVillages(blocks,x0,z0){
  const g0x=Math.floor((x0-32)/VGRID),g1x=Math.floor((x0+CH+32)/VGRID);
  const g0z=Math.floor((z0-32)/VGRID),g1z=Math.floor((z0+CH+32)/VGRID);
  for(let gx=g0x;gx<=g1x;gx++)for(let gz=g0z;gz<=g1z;gz++){
    const v=vCell(gx,gz);
    if(!v)continue;
    if(v.cx+15<x0||v.cx-15>=x0+CH||v.cz+15<z0||v.cz-15>=z0+CH)continue;
    const lay=villageLayout(v);
    for(const [k,id] of lay.bl){
      const p=k.split(',');
      const wx=+p[0],y=+p[1],wz=+p[2];
      if(wx<x0||wx>=x0+CH||wz<z0||wz>=z0+CH)continue;
      blocks[bidx(wx-x0,y,wz-z0)]=id;
      if(id===B.ALIENL)torches.add(bkey(wx,y,wz));
    }
    if(v.cx>=x0&&v.cx<x0+CH&&v.cz>=z0&&v.cz<z0+CH&&!VSEEN.has(v.id))
      VPEND.push(v);
  }
}
function spawnVillagers(lay,hx,hz){
  let n=0;
  for(const s of lay.sp){
    if(n>=5)break;
    spawnMob('alien',s[0],s[1]+0.05,s[2]);
    const a=entities[entities.length-1];
    a.hx=hx;a.hz=hz;
    n++;
  }
}
function processVillages(dt){
  while(VPEND.length){
    const v=VPEND.pop();
    if(VSEEN.has(v.id))continue;
    VSEEN.add(v.id);
    spawnVillagers(villageLayout(v),v.cx,v.cz);
  }
  if(VB){
    VB.t+=dt;
    const want=Math.min(VB.list.length,Math.floor(VB.t/2.2*VB.list.length));
    while(VB.idx<want){
      const c=VB.list[VB.idx++];
      setBlock(c[0],c[1],c[2],c[3]);
      if(Math.random()<0.02)burstParticles(c[0]+0.5,c[1]+0.8,c[2]+0.5,B.ALIENM,3,0.6);
    }
    if(VB.idx>=VB.list.length){
      spawnVillagers(VB.lay,VB.cx,VB.cz);
      showToast('The aliens have moved in!');
      playS('warble');
      VB=null;
    }
  }
}
function startVillageBuild(cx,cz){
  const gy=heightAt(cx,cz);
  const lay=layoutAt(cx,cz,gy);
  const list=[];
  for(const [k,id] of lay.bl){
    const p=k.split(',');
    list.push([+p[0],+p[1],+p[2],id]);
  }
  list.sort((a,b)=>a[1]-b[1]);
  VB={list,idx:0,t:0,lay,cx,cz};
  showToast('A saucer descends from the stars...');
  playS('warble');playS('rumble');
}

/* ----- alien minds ----- */
const ANAME1=['Zor','Ble','Xan','Quee','Mor','Vex','Plo','Gri','Nya','Thr'];
const ANAME2=['p','x','blat','zik','thra','goo','mph','lek','dro','bix'];
function alienName(){
  return ANAME1[(Math.random()*ANAME1.length)|0]+ANAME2[(Math.random()*ANAME2.length)|0];
}
function alienAggro(e){
  e.mood='h';e.calmT=0;
  for(const m of entities){
    if(m.t==='mob'&&m.mt==='alien'&&!m.dead&&Math.hypot(m.x-e.x,m.z-e.z)<12){
      m.mood='h';m.calmT=0;
    }
  }
  if(dlgOpen&&DLGE&&DLGE.mood==='h')closeDlg();
}
function alienBrain(e,dt,pd,pdx,pdz){
  if(dlgOpen&&DLGE===e){
    e.mode='idle';e.tT=Math.max(e.tT,0.4);
    const want=Math.atan2(pdx,pdz);
    e.yaw+=(((want-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI)*Math.min(1,dt*6);
    return;
  }
  if(e.mood==='h'){
    e.calmT+=dt;
    if(e.calmT>45||P.dead){e.mood='c';e.calmT=0;e.insults=0;}
  }else{
    if(e.mode==='wander'&&e.hx!=null){
      const hd=Math.hypot(e.hx-e.x,e.hz-e.z);
      if(hd>9)e.dir=Math.atan2(e.hx-e.x,e.hz-e.z);
    }
    if(e.rom===2&&pd<4&&Math.random()<dt*0.6)
      burstParticles(e.x,e.y+2.0,e.z,B.FLOWER_R,1,0.25);
  }
}

/* ----- dialogue engine ----- */
let dlgOpen=false,DLGE=null,DLGN='root',LASTOPTS=[];
function relWord(e){
  if(e.rom===2)return 'partner \u2665';
  if(e.rel>=70)return 'smitten';
  if(e.rel>=40)return 'close friend';
  if(e.rel>=15)return 'friend';
  if(e.rel<=-20)return 'grudging';
  return 'stranger';
}
function bumpRel(e,n){
  e.rel=clamp(e.rel+n,-100,100);
  if(n>0)burstParticles(e.x,e.y+2.0,e.z,B.FLOWER_R,2,0.3);
}
function ragebait(e){
  e.insults++;bumpRel(e,-18);
  burstParticles(e.x,e.y+2.0,e.z,B.TORCH,4,0.4);
  playS('growl');
  if(e.insults>=3||e.rel<=-40){
    closeDlg();
    alienAggro(e);
    showToast(e.name+' is FURIOUS! The village turns on you!');
    return true;
  }
  return false;
}
function dlgNode(e,id){
  const held=heldStack();
  const giftable=held&&(held.id===IT.DIAMOND||held.id===IT.GOLD);
  switch(id){
    case 'root':{
      const opts=[
        {t:'Just saying hi',next:'chat1'},
        {t:'Tell me about this place',next:'lore1'}];
      if(e.rom===2)opts.push({t:"How's my favourite alien?",next:'sweet',
        act:()=>bumpRel(e,2)});
      else if(e.rel>=70)opts.push({t:'Will you be my partner?',next:'propose'});
      else opts.push({t:'Flirt',next:e.rel>=25?'flirtOk':'flirtNo'});
      if(giftable)opts.push({t:'Offer your '+DEFS[held.id].name,next:'gifted',
        act:()=>{const g=held.id===IT.DIAMOND?25:12;
          held.count--;if(held.count<=0)P.inv[P.sel]=null;redrawHotbar();
          bumpRel(e,g);playS('cash');}});
      opts.push({t:'Say something rude...',next:'insMenu'});
      opts.push({t:'Leave'});
      let hello;
      if(e.rom===2)hello='"My favourite earthling returns! The hive-heart glows."';
      else if(e.rel>=40)hello='"'+'Greetings, friend-of-the-pod! Zorp be upon you."';
      else if(e.rel>=15)hello='"Oh! The friendly biped. Hello hello."';
      else if(e.rel<=-20)hello='"...You again. My antennae itch when you are near."';
      else hello='"Greetings, earth-thing. We come in peace. Mostly."';
      return {text:hello,opts};
    }
    case 'chat1':return {text:'"The weather on this rock is delightful. On Dingl-7 it rains '+
      'screaming gravel. Here it only occasionally rains fire. Progress!"',
      opts:[{t:'What do you even eat?',next:'chat2'},
        {t:'Nice antennae, by the way',next:'chatEnd',act:()=>bumpRel(e,3)},
        {t:'Leave'}]};
    case 'chat2':return {text:'"Mostly gravel. Sometimes clay. Your \u2018diamonds\u2019 are '+
      'considered a delicacy, but the exchange rate is criminal."',
      opts:[{t:'Relatable',next:'chatEnd',act:()=>bumpRel(e,2)},{t:'Leave'}]};
    case 'chatEnd':return {text:'"You are less terrible than the average biped. I have logged '+
      'this in the hive-ledger."',opts:[{t:'Back',next:'root'},{t:'Leave'}]};
    case 'lore1':return {text:'"Our probe-ship, the Dingle Probe, ran out of snacks four '+
      'parsecs out. We landed here to forage and... well. The saucer no longer goes up."',
      opts:[{t:'What keeps you busy?',next:'lore2'},{t:'Leave'}]};
    case 'lore2':return {text:'"We monitor your primitive stock exchange. DIRTCO amuses us. '+
      'We also fear the spinning wind-furies \u2014 if you ever see one, run, earth-thing."',
      opts:[{t:'Any way to get your ship flying?',next:'lore3'},{t:'Leave'}]};
    case 'lore3':return {text:'"The captain says we need eleven billion diamonds. The captain '+
      'also licks the lamp. We are not optimistic. But this village is home now."',
      opts:[{t:'Back',next:'root',act:()=>bumpRel(e,2)},{t:'Leave'}]};
    case 'flirtNo':return {text:'"E-earth-thing! We barely know each other! My chromatophores '+
      'are flashing. This is embarrassing for us both."',
      opts:[{t:'Fair enough \u2014 friends first',next:'root',act:()=>bumpRel(e,4)},
        {t:"You're missing out",next:'root',act:()=>bumpRel(e,-5)}]};
    case 'flirtOk':return {text:'"You think my third eyelid is pretty?? Nobody has EVER... '+
      '*antennae droop bashfully*"',
      opts:[{t:'Hold their tentacle',next:'flirtEnd',act:()=>bumpRel(e,8)},
        {t:'Wink and leave',act:()=>bumpRel(e,5)}]};
    case 'flirtEnd':return {text:'"Your hand has so few suckers. It is... charming. Visit me '+
      'again, biped."',opts:[{t:'Back',next:'root'},{t:'Leave'}]};
    case 'propose':return {text:'"Partners?? Like in the old songs of Dingl-7?? *the antennae '+
      'glow like tiny stars* YES. A thousand times yes, earth-thing!"',
      opts:[{t:'Seal it with a tentacle-shake',next:'proposed',
        act:()=>{e.rom=2;bumpRel(e,15);
          const left=invAddTo(P.inv,{id:IT.DIAMOND,count:1});
          if(left>0)spawnDrop(e.x,e.y+1.5,e.z,{id:IT.DIAMOND,count:left},0,2,0);
          redrawHotbar();playS('cash');
          showToast('You are now partners with '+e.name+'!');}},
      {t:'Actually \u2014 not yet',next:'root',act:()=>bumpRel(e,-10)}]};
    case 'proposed':return {text:'"I gifted you my favourite snack-gem. Do not eat it all at '+
      'once. Or do. Love is chaos."',opts:[{t:'\u2665',next:'root'},{t:'Leave'}]};
    case 'sweet':return {text:'"Every rotation with you is my favourite rotation. Also Blee '+
      'owes me three gravel. Life is good."',
      opts:[{t:'Back',next:'root'},{t:'Leave'}]};
    case 'gifted':return {text:'"FOR ME?? *crunch crunch* Exquisite vintage. You are a biped '+
      'of taste and culture."',opts:[{t:'Back',next:'root'},{t:'Leave'}]};
    case 'insMenu':return {text:'They blink all five eyes at you, sensing trouble.',
      opts:[
        {t:'"Your saucer looks like a bin lid"',next:'insR',act:()=>ragebait(e)},
        {t:'"Dingl-7 sounds like a budget planet"',next:'insR',act:()=>ragebait(e)},
        {t:'"Nice antennae. Shame about the face"',next:'insR',act:()=>ragebait(e)},
        {t:'Never mind',next:'root'}]};
    case 'insR':{
      const txt=e.insults>=2?
        '"ONE more word, earth-thing, and the whole pod hears of it. Choose. Carefully."':
        '"...The bin lid remark has been logged. My antennae are vibrating with displeasure."';
      return {text:txt,opts:[
        {t:'Keep going',next:'insR',act:()=>ragebait(e)},
        {t:'Sorry, sorry \u2014 too far',next:'root',act:()=>bumpRel(e,3)},
        {t:'Leave'}]};
    }
  }
  return {text:'"...zzkt..."',opts:[{t:'Leave'}]};
}
function renderDlg(){
  if(!DLGE)return;
  const node=dlgNode(DLGE,DLGN);
  LASTOPTS=node.opts;
  const nm=$('dlgname'),tx=$('dlgtext'),op=$('dlgopts'),rl=$('dlgrel');
  if(nm)nm.textContent=DLGE.name+' the alien';
  if(rl)rl.textContent=relWord(DLGE)+(DLGE.rel>0?'  +'+Math.round(DLGE.rel):DLGE.rel<0?'  '+Math.round(DLGE.rel):'');
  if(tx)tx.textContent=node.text;
  if(op){
    op.innerHTML='';
    node.opts.forEach((o,i)=>{
      const b=document.createElement('button');
      b.className='mc-btn';b.textContent=o.t;
      b.onclick=()=>dlgPick(i);
      op.appendChild(b);
    });
  }
}
function dlgPick(i){
  const o=LASTOPTS[i];
  if(!o)return;
  if(o.act){
    const raged=o.act();
    if(!dlgOpen)return;
    if(raged===true)return;
  }
  if(o.next){DLGN=o.next;renderDlg();}
  else closeDlg();
}
function openDlg(e){
  DLGE=e;DLGN='root';dlgOpen=true;LASTOPTS=[];
  const el=$('dlg');if(el)el.style.display='flex';
  document.exitPointerLock&&document.exitPointerLock();
  MB.l=MB.r=false;
  renderDlg();
  playS('warble');
}
function closeDlg(){
  if(!dlgOpen)return;
  dlgOpen=false;DLGE=null;
  const el=$('dlg');if(el)el.style.display='none';
  tryLock();
}
/* extra sounds */
const _playS6=playS;
playS=function(n){
  if(!soundOn)return;
  try{
    switch(n){
      case 'warble':tone(520,760,0.09,'sine',0.22);tone(760,520,0.09,'sine',0.18);return;
      case 'growl': tone(120,70,0.22,'sawtooth',0.3);noiseS(0.15,0.18,400,150);return;
      default:_playS6(n);
    }
  }catch(e){}
};


