/* ===================================================================== */
/* PART 25 — THE STRUCTURE COMPASS  (2.2)                                */
/* ===================================================================== */
IT.COMPASS=226;
idef(IT.COMPASS,{name:'Structure Compass',icon:'i_cmp',stack:1});
tile('i_cmp',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#8a8a92';c.beginPath();c.arc(8,8,7,0,7);c.fill();
  c.fillStyle='#2b2b30';c.beginPath();c.arc(8,8,5.4,0,7);c.fill();
  c.fillStyle='#e8e8ee';c.fillRect(7,2,2,2);
  c.fillStyle='#e23b3b';c.beginPath();c.moveTo(8,3);c.lineTo(10,9);c.lineTo(8,8);c.closePath();c.fill();
  c.fillStyle='#f3f3f8';c.beginPath();c.moveTo(8,13);c.lineTo(6,8);c.lineTo(8,9);c.closePath();c.fill();
  c.fillStyle='#ffd84d';c.fillRect(7,7,2,2);});
R([' I ','IDI',' I '],{I:IT.IRON,D:IT.DIAMOND},IT.COMPASS,1);

let cmpOpen=false;
const CMP={x:0,z:0,d:0,ok:false,scanT:0,shown:false};
const CMP_DEFS=[
  {k:'village',n:'Alien Village',   grid:112, cell:(gx,gz)=>vCell(gx,gz)},
  {k:'park',   n:'Theme Park',      grid:176, cell:(gx,gz)=>pCell(gx,gz)},
  {k:'wd',     n:'Buried Dungeon',  grid:224, cell:(gx,gz)=>wdCell(gx,gz)},
  {k:'ls',     n:'Spawner Vault',   grid:96,  cell:(gx,gz)=>lsCell(gx,gz)},
  {k:'roost',  n:'Dragon Roost',    grid:320, cell:(gx,gz)=>rstCell(gx,gz)},
  {k:'demon',  n:"Malgorath's Bite"},
];
function cmpDef(k){return CMP_DEFS.find(c=>c.k===k);}
function cmpFind(k){
  const def=cmpDef(k);
  if(!def)return null;
  if(k==='pdoor')return mpCmpDoor();
  if(k==='demon'){
    const d=Math.hypot(DEMON_X+0.5-P.x,DEMON_Z+0.5-P.z);
    return {x:DEMON_X+0.5,z:DEMON_Z+0.5,d,ok:true};
  }
  const g0x=Math.floor(P.x/def.grid),g0z=Math.floor(P.z/def.grid);
  let best=null;
  for(let gx=g0x-6;gx<=g0x+6;gx++)for(let gz=g0z-6;gz<=g0z+6;gz++){
    const c=def.cell(gx,gz);
    if(!c)continue;
    const d=Math.hypot(c.cx+0.5-P.x,c.cz+0.5-P.z);
    if(!best||d<best.d)best={x:c.cx+0.5,z:c.cz+0.5,d,ok:true};
  }
  return best||{x:0,z:0,d:0,ok:false};
}
function cmpDir(dx,dz){
  const dirs=['N','NE','E','SE','S','SW','W','NW'];
  const ang=(Math.atan2(dx,-dz)/Math.PI*180+360)%360;
  return dirs[Math.round(ang/45)%8];
}
function cmpSelect(k){
  P.cmpT=k;
  CMP.scanT=0;
  if(k==='pdoor')mpCmpTuned();
  closeCmp();
  const def=cmpDef(k);
  if(def)showToast('Compass tuned: '+def.n);
  playS('click');
}
function openCmp(){
  cmpOpen=true;
  const el=$('cmp');
  if(el)el.style.display='flex';
  renderCmp();
}
function closeCmp(){
  cmpOpen=false;
  const el=$('cmp');
  if(el)el.style.display='none';
}
function renderCmp(){
  const list=$('cmplist');
  if(!list)return;
  let h='';
  for(const def of CMP_DEFS){
    const r=cmpFind(def.k);
    const where=r&&r.ok?(Math.round(r.d)+'m '+cmpDir(r.x-P.x,r.z-P.z)):'none within ~2km';
    const sel=P.cmpT===def.k;
    h+='<div class="sitem'+(sel?' eq':'')+'"><div class="sname">'+def.n+'</div>'+
       '<div class="sdesc">nearest: '+where+'</div>'+
       '<button class="sbuy" data-k="'+def.k+'">'+(sel?'TUNED':'TUNE')+'</button></div>';
  }
  h+='<div class="sitem"><div class="sname">No target</div><div class="sdesc">The needle sleeps.</div>'+
     '<button class="sbuy" data-k="">CLEAR</button></div>';
  list.innerHTML=h;
  if(typeof list.querySelectorAll==='function'){
    for(const b of list.querySelectorAll('.sbuy'))
      b.onclick=()=>{const k=b.getAttribute('data-k');if(k)cmpSelect(k);else{P.cmpT=null;closeCmp();showToast('Compass cleared.');}};
  }
}
{
  const cc=$('cmpclose');
  if(cc)cc.onclick=()=>{closeCmp();};
}
let _cmpLast='';
function tickCompass(dt){
  const el=$('cmphud');
  const st=P&&!P.dead?heldStack():null;
  const held=st&&st.id===IT.COMPASS&&P.cmpT&&!CUT.on;
  CMP.shown=!!held;
  if(!el)return;
  if(!held){
    if(_cmpLast!==''){_cmpLast='';el.style.display='none';}
    return;
  }
  CMP.scanT-=dt;
  if(CMP.scanT<=0){
    CMP.scanT=0.8;
    const r=cmpFind(P.cmpT);
    if(r){CMP.x=r.x;CMP.z=r.z;CMP.d=r.d;CMP.ok=r.ok;}
  }
  const def=cmpDef(P.cmpT);
  let txt;
  if(!CMP.ok)txt=(def?def.n:'?')+' \u2014 none within ~2km';
  else if(CMP.d<16)txt=(def?def.n:'?')+' \u2014 HERE';
  else txt=(def?def.n:'?')+'  '+Math.round(CMP.d)+'m '+cmpDir(CMP.x-P.x,CMP.z-P.z);
  if(txt!==_cmpLast){
    _cmpLast=txt;
    el.style.display='flex';
    const t=$('cmptext');
    if(t)t.textContent=txt;
  }
  const nd=$('cmpneedle');
  if(nd&&CMP.ok&&CMP.d>=16){
    const want=Math.atan2(-(CMP.x-P.x),-(CMP.z-P.z));
    let rel=want-P.yaw;
    rel=((rel+Math.PI*3)%(Math.PI*2))-Math.PI;
    nd.style.transform='rotate('+(-rel*180/Math.PI).toFixed(1)+'deg)';
    nd.textContent='\u2b06';
  }else if(nd)nd.textContent=CMP.ok?'\u2605':'?';
}


