/* ----- modal / inventory system ----- */
const MODAL={kind:null,slots:[],grid:null,gw:0,be:null,bek:null};
let cursorStack=null;
function modalOpen(){return !!MODAL.kind||crOn||pcOpen||dlgOpen||casOpen||dselOpen||enchOpen||storeOpen||powOpen||winOpen||cmpOpen||dbgmOpen||patchOpen||setOpen||terrOpen||helpOpen||cineOpen||chatOpen||pguOn||presOn;}

function slotDiv(cls){
  const d=document.createElement('div');d.className='slot'+(cls?' '+cls:'');
  const c=document.createElement('canvas');c.width=c.height=48;
  d.appendChild(c);
  return d;
}
function mkSlot(parent,getf,setf,kind){
  const d=slotDiv(kind==='result'?'rslot':'');
  const s={get:getf,set:setf,kind:kind||'n',el:d,cv:d.firstChild};
  d.addEventListener('pointerdown',ev=>{
    ev.preventDefault();ev.stopPropagation();
    slotClick(s,ev.button===2,ev.shiftKey);
    redrawModal();
  });
  d.addEventListener('contextmenu',ev=>ev.preventDefault());
  parent.appendChild(d);
  MODAL.slots.push(s);
  return s;
}
function sameStack(a,b){return a&&b&&a.id===b.id&&a.dur==null&&b.dur==null;}
function takeResult(s,shift){
  const r=s.get();
  if(!r)return;
  if(MODAL.grid&&MODAL.rset!==RECIPES&&piTake(r,shift,s)){redrawHotbar();return;}
  if(MODAL.grid){
    if(shift){
      for(let i=0;i<64;i++){
        const out=calcCraft(MODAL.grid,MODAL.gw,MODAL.rset);
        if(!out)break;
        takeCraft(MODAL.grid);
        if(invAddTo(P.inv,out)>0){spawnDrop(P.x,P.y+1,P.z,out,0,2,0);break;}
      }
    }else{
      if(!cursorStack){cursorStack=r;takeCraft(MODAL.grid);}
      else if(sameStack(cursorStack,r)&&cursorStack.count+r.count<=stackMax(r.id)){
        cursorStack.count+=r.count;takeCraft(MODAL.grid);
      }
    }
    playS('place');
  }else{ /* furnace output */
    if(shift){if(invAddTo(P.inv,r)===0)s.set(null);else s.set(r.count>0?r:null);}
    else if(!cursorStack){cursorStack=r;s.set(null);}
    else if(sameStack(cursorStack,r)){
      const mv=Math.min(stackMax(r.id)-cursorStack.count,r.count);
      cursorStack.count+=mv;r.count-=mv;s.set(r.count>0?r:null);
    }
  }
  redrawHotbar();
}
function quickMove(s){
  const st=s.get();
  if(!st)return;
  let dest=null;
  if(s.home==='inv'){
    if(MODAL.kind==='chest')dest=MODAL.be.inv;
    else if(MODAL.kind==='furnace'){
      if(FUELS[st.id]!=null){const left=beAdd(MODAL.be,'fuel',st);s.set(left>0?st:null);redrawHotbar();return;}
      const left=beAdd(MODAL.be,'in',st);s.set(left>0?st:null);redrawHotbar();return;
    }
    else{ /* move hotbar <-> backpack */
      const arr=P.inv;
      const tgt=s.idx<9?arr.slice(9):arr.slice(0,9);
      const left=invAddTo(tgt,st);
      if(s.idx<9)for(let i=0;i<27;i++)arr[9+i]=tgt[i];
      else for(let i=0;i<9;i++)arr[i]=tgt[i];
      s.set(left>0?st:null);redrawHotbar();return;
    }
  }else dest=P.inv;
  if(dest){
    const left=invAddTo(dest,st);
    s.set(left>0?st:null);
  }
  redrawHotbar();
}
function beAdd(be,f,st){
  const cur=be[f];
  if(!cur){be[f]={id:st.id,count:st.count,dur:st.dur};st.count=0;return 0;}
  if(sameStack(cur,st)){
    const mv=Math.min(stackMax(st.id)-cur.count,st.count);
    cur.count+=mv;st.count-=mv;
  }
  return st.count;
}
function slotClick(s,right,shift){
  if(s.kind==='result'){takeResult(s,shift);return;}
  if(s.kind==='palette'){
    const st=s.get();
    if(shift){invAddTo(P.inv,{id:st.id,count:stackMax(st.id)});redrawHotbar();return;}
    if(!cursorStack)cursorStack={id:st.id,count:right?1:1};
    else if(cursorStack.id===st.id&&cursorStack.count<stackMax(st.id))cursorStack.count++;
    else cursorStack=null;
    return;
  }
  if(s.kind==='trash'){cursorStack=null;return;}
  if(s.kind==='armor'){
    const cur=s.get();
    if(cursorStack){
      if(!armorAccepts(s.armSlot,cursorStack)){showToast('That does not go on your '+['head','chest','legs','feet'][s.armSlot]+'.');return;}
      if(cursorStack.count>1){showToast('One piece at a time.');return;}
      s.set(cursorStack);cursorStack=cur||null;
    }else{
      if(!cur)return;
      s.set(null);cursorStack=cur;
    }
    playS('place');updateArmorHud();
    return;
  }
  const st=s.get();
  if(shift&&st&&!cursorStack){quickMove(s);return;}
  if(!right){
    if(cursorStack&&st&&sameStack(cursorStack,st)){
      const mv=Math.min(stackMax(st.id)-st.count,cursorStack.count);
      st.count+=mv;cursorStack.count-=mv;
      if(cursorStack.count<=0)cursorStack=null;
      s.set(st);
    }else{
      s.set(cursorStack);
      cursorStack=st||null;
    }
  }else{
    if(!cursorStack&&st){
      const take=Math.ceil(st.count/2);
      cursorStack={id:st.id,count:take,dur:st.dur};
      st.count-=take;
      s.set(st.count>0?st:null);
    }else if(cursorStack){
      if(!st){s.set({id:cursorStack.id,count:1,dur:cursorStack.dur});cursorStack.count--;}
      else if(sameStack(cursorStack,st)&&st.count<stackMax(st.id)){st.count++;cursorStack.count--;s.set(st);}
      if(cursorStack&&cursorStack.count<=0)cursorStack=null;
    }
  }
  redrawHotbar();
}
function redrawModal(){
  for(const s of MODAL.slots){
    const g=uiCv(s.cv,48,48,uiK());   /* 48 logical px, device-resolution backing (p06e) */
    g.clearRect(0,0,48,48);
    const st=s.get();
    if(st)drawStackIn(g,st,0,0,48);
  }
  const cc=$('cursor');
  if(cursorStack){
    cc.style.display='block';
    const g=uiCv(cc.firstChild,48,48,uiK(),UIS.live?UIS.eff:1);   /* #cursor is not zoomed: its canvas grows with the UI scale */
    g.clearRect(0,0,48,48);
    drawStackIn(g,cursorStack,0,0,48);
  }else cc.style.display='none';
  if(MODAL.kind==='furnace'&&MODAL.be){
    const be=MODAL.be;
    $('flame').style.height=(be.burnMax>0?be.burn/be.burnMax*100:0)+'%';
    $('cookbar').style.width=clamp(be.cook/SMELT_TIME*100,0,100)+'%';
  }
}
function gridRow(parent,n){
  const d=document.createElement('div');d.className='grow';
  parent.appendChild(d);return d;
}
function addInvSlots(parent){
  const lab=document.createElement('div');lab.className='mlabel';lab.textContent='Inventory';
  parent.appendChild(lab);
  let row;
  for(let i=9;i<36;i++){
    if((i-9)%9===0)row=gridRow(parent);
    const idx=i;
    const s=mkSlot(row,()=>P.inv[idx],v=>P.inv[idx]=v);
    s.home='inv';s.idx=idx;
  }
  const hr=gridRow(parent);hr.style.marginTop='8px';
  for(let i=0;i<9;i++){
    const idx=i;
    const s=mkSlot(hr,()=>P.inv[idx],v=>P.inv[idx]=v);
    s.home='inv';s.idx=idx;
  }
}
function arrowEl(){const a=document.createElement('div');a.className='marrow';a.textContent='\u2192';return a;}
function openModal(kind,bek){
  closeModal(true);
  MODAL.kind=kind;MODAL.slots=[];MODAL.grid=null;MODAL.gw=0;MODAL.be=null;MODAL.bek=bek||null;
  MODAL.rset=DIM==='puppet'?piRecipeSet(kind):RECIPES;
  if(AG_ACTIVE&&kind==='chest'&&bek)agChestOpen(bek);
  document.exitPointerLock&&document.exitPointerLock();
  const M=$('modal'),body=$('mbody');
  body.innerHTML='';
  $('mtitle').textContent={inv:'Inventory',craft:'Crafting Table',furnace:'Furnace',chest:'Chest',creative:'Creative',pcan:'The Bin',plab:'Lab Bench',ptrans:'Transmogrifier'}[kind];
  if(kind==='inv'||kind==='craft'||kind==='pcan'||kind==='plab'||kind==='ptrans'){
    const gw=kind==='inv'?2:3;
    MODAL.gw=gw;MODAL.grid=Array(gw*gw).fill(null);
    const top=document.createElement('div');top.className='mcraft';
    const gwrap=document.createElement('div');
    for(let r=0;r<gw;r++){
      const row=gridRow(gwrap);
      for(let c=0;c<gw;c++){
        const idx=r*gw+c;
        const s=mkSlot(row,()=>MODAL.grid[idx],v=>MODAL.grid[idx]=v);
        s.home='grid';
      }
    }
    top.appendChild(gwrap);
    top.appendChild(arrowEl());
    mkSlot(top,()=>calcCraft(MODAL.grid,gw,MODAL.rset),()=>{},'result');
    body.appendChild(top);
    if(kind==='craft'||MODAL.rset!==RECIPES){
      const rb=document.createElement('button');rb.className='mc-btn small';rb.textContent='Recipes';
      rb.onclick=()=>{const rl=$('rlist');rl.style.display=rl.style.display==='none'?'block':'none';};
      top.appendChild(rb);
      buildRecipeList(body,gw,MODAL.rset);
    }
    if(kind==='inv'){
      const lab=document.createElement('div');lab.className='mlabel';
      lab.textContent='Armor \u26e8 (helmet / chest / legs / boots):';
      body.appendChild(lab);
      const arow=gridRow(body);
      for(let as=0;as<4;as++){
        const sl=mkSlot(arow,
          ((i)=>()=>P.armor[i]?{id:P.armor[i].id,count:1,...(P.armor[i].dur!=null?{dur:P.armor[i].dur}:{})}:null)(as),
          ((i)=>v=>{P.armor[i]=v?{id:v.id,...(v.dur!=null?{dur:v.dur}:{})}:null;
            updateArmorHud();if(plModel)syncArmorModel(plModel);})(as),
          'armor');
        sl.armSlot=as;sl.home='armor';
      }
    }
    addInvSlots(body);
  }else if(kind==='furnace'){
    MODAL.be=blockEnts.get(bek);
    const be=MODAL.be;
    const top=document.createElement('div');top.className='mcraft mfurn';
    const col=document.createElement('div');col.className='fcol';
    mkSlot(col,()=>be.in,v=>be.in=v).home='be';
    const fl=document.createElement('div');fl.className='flamebox';
    fl.innerHTML='<div id="flame"></div>';
    col.appendChild(fl);
    mkSlot(col,()=>be.fuel,v=>be.fuel=v).home='be';
    top.appendChild(col);
    const ar=document.createElement('div');ar.className='cookbox';ar.innerHTML='<div id="cookbar"></div>';
    top.appendChild(ar);
    mkSlot(top,()=>be.out,v=>be.out=v,'result').home='be';
    body.appendChild(top);
    addInvSlots(body);
  }else if(kind==='chest'){
    MODAL.be=blockEnts.get(bek);
    const be=MODAL.be;
    let row;
    for(let i=0;i<be.inv.length;i++){
      if(i%9===0)row=gridRow(body);
      const idx=i;
      const s=mkSlot(row,()=>be.inv[idx],v=>be.inv[idx]=v);
      s.home='be';
    }
    addInvSlots(body);
  }else if(kind==='creative'){
    const pal=document.createElement('div');pal.className='palette';
    const ids=Object.keys(DEFS).map(Number).filter(id=>id!==B.AIR&&id!==B.BEDROCK&&!DEFS[id].hide&&(!DEFS[id].pg)===(DIM!=='puppet'));
    for(const id of ids){
      const s=mkSlot(pal,()=>({id,count:1}),()=>{},'palette');
      s.el.classList.add('pslot');
    }
    body.appendChild(pal);
    const tr=document.createElement('div');tr.className='mlabel';tr.textContent='Trash \u2193  (click with item to delete)';
    body.appendChild(tr);
    const trow=gridRow(body);
    mkSlot(trow,()=>null,()=>{},'trash').el.classList.add('tslot');
    addInvSlots(body);
  }
  M.style.display='flex';
  redrawModal();
}
function closeModal(skipLock){
  if(!MODAL.kind)return;
  if(AG_ACTIVE&&MODAL.kind==='chest')agChestClose();
  if(MODAL.grid){
    for(const st of MODAL.grid)if(st){
      if(invAddTo(P.inv,st)>0)spawnDrop(P.x,P.y+1,P.z,st,0,2,0);
    }
  }
  if(cursorStack){
    if(invAddTo(P.inv,cursorStack)>0)spawnDrop(P.x,P.y+1,P.z,cursorStack,0,2,0);
    cursorStack=null;
  }
  if(DIM==='puppet'||(MODAL.be&&MODAL.be.t==='stash'))mpOnModalClose(MODAL.kind,MODAL.be,MODAL.bek);
  MODAL.kind=null;MODAL.slots=[];MODAL.grid=null;MODAL.be=null;
  $('modal').style.display='none';
  redrawHotbar();
  if(!skipLock)tryLock();
}
/* recipe book */
function recipeIngs(r){
  const m=new Map();
  if(r.s){for(const i of r.s)m.set(i,(m.get(i)||0)+1);}
  else{
    for(const row of r.p)for(const ch of row){
      if(ch===' ')continue;
      let k=r.k[ch];
      if(typeof k==='string')k=GROUPS[k][0];
      m.set(k,(m.get(k)||0)+1);
    }
  }
  return m;
}
function buildRecipeList(body,gw,list){
  if(list&&list!==RECIPES)return piBuildRecipeList(body,gw,list);
  const rl=document.createElement('div');rl.id='rlist';rl.style.display='none';
  for(const r of RECIPES){
    if(r.p&&(r.p.length>gw||r.p[0].length>gw))continue;
    const row=document.createElement('div');row.className='rrow';
    const oc=document.createElement('canvas');oc.width=oc.height=32;
    const g=uiCv(oc,32,32,uiK());
    g.drawImage(getIcon(r.o),0,0,32,32);
    row.appendChild(oc);
    const nm=document.createElement('span');
    nm.textContent=DEFS[r.o].name+(r.n>1?' x'+r.n:'')+'  \u2190 ';
    row.appendChild(nm);
    for(const [id,n] of recipeIngs(r)){
      const wrap=document.createElement('span');wrap.className='ring';
      const ic=document.createElement('canvas');ic.width=ic.height=24;
      uiCv(ic,24,24,uiK()).drawImage(getIcon(id),0,0,24,24);
      ic.title=DEFS[id].name+' x'+n;
      wrap.appendChild(ic);
      if(n>1){const ct=document.createElement('b');ct.className='rct';ct.textContent='\u00d7'+n;wrap.appendChild(ct);}
      row.appendChild(wrap);
    }
    row.onclick=()=>{tryFill(r);redrawModal();};
    rl.appendChild(row);
  }
  body.appendChild(rl);
}
function tryFill(r){
  if(!MODAL.grid)return;
  const gw=MODAL.gw;
  /* return current grid */
  for(let i=0;i<MODAL.grid.length;i++){
    const st=MODAL.grid[i];
    if(st){if(invAddTo(P.inv,st)>0)spawnDrop(P.x,P.y+1,P.z,st,0,2,0);MODAL.grid[i]=null;}
  }
  /* gather cells */
  const cells=[];
  if(r.s){r.s.forEach((id,i)=>cells.push({pos:i,opts:[id]}));}
  else{
    for(let rr=0;rr<r.p.length;rr++)for(let cc=0;cc<r.p[rr].length;cc++){
      const ch=r.p[rr][cc];
      if(ch===' ')continue;
      let k=r.k[ch];
      cells.push({pos:rr*gw+cc,opts:typeof k==='string'?GROUPS[k]:[k],g:typeof k==='string'?k:null});
    }
  }
  const used=new Map(),missing=new Map(),picks=[];
  for(const c of cells){
    let got=null;
    for(const o of c.opts){
      if(invCount(P.inv,o)-(used.get(o)||0)>0){got=o;break;}
    }
    if(got==null){
      const lbl=c.g?('any '+c.g):DEFS[c.opts[0]].name;
      missing.set(lbl,(missing.get(lbl)||0)+1);
      continue;
    }
    used.set(got,(used.get(got)||0)+1);
    picks.push({pos:c.pos,id:got});
  }
  if(missing.size){
    const parts=[];
    for(const [nm,ct] of missing)parts.push(ct+'\u00d7 '+nm);
    showToast('Missing: '+parts.join(', '));
    return;
  }
  for(const [id,n] of used)invConsume(P.inv,id,n);
  for(const p of picks)MODAL.grid[p.pos]={id:p.id,count:1};
  redrawHotbar();
}
/* pause / death */
function hidePause(){const p=$('pause');if(p)p.style.display='none';}
function restorePause(){if(paused&&playing&&!P.dead){const p=$('pause');if(p)p.style.display='flex';}}
function pauseGame(){
  if(!playing||P.dead)return;
  paused=true;closeModal(true);
  document.exitPointerLock&&document.exitPointerLock();
  $('p_mode').textContent='Mode: '+(P.mode==='c'?'Creative':'Survival');
  $('p_sound').textContent='Sound: '+(soundOn?'On':'Off');
  $('p_music').textContent='World Music: '+(musicOn?'On':'Off');
  $('p_rd').value=RD;$('p_rdv').textContent=RD;
  if(typeof grApplyUI==='function')grApplyUI();
  $('pause').style.display='flex';
}
function resumeGame(){
  paused=false;$('pause').style.display='none';
  tryLock();
}
function showDeath(){
  document.exitPointerLock&&document.exitPointerLock();
  $('death').style.display='flex';
}

