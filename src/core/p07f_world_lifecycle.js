/* ----- world lifecycle ----- */
function hashSeed(str){
  str=(str||'').trim();
  if(!str)return (Math.random()*2147483647)|0;
  if(/^-?\d+$/.test(str))return parseInt(str,10)|0;
  let h=2166136261;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return h|0;
}
function findSpawn(){
  for(let r=0;r<40;r++){
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      const x=Math.round(Math.sin(a)*r*9),z=Math.round(Math.cos(a)*r*9);
      const ci=colInfo(x,z);
      if(ci.h>=SEA+1&&ci.b!==0)return [x+0.5,ci.h+2,z+0.5];
    }
  }
  return [0.5,Math.max(colInfo(0,0).h,SEA)+2,0.5];
}
function startNewWorld(name,seedStr,mode,bots){
  resetWorld();
  SEED=hashSeed(seedStr);
  timeOfDay=0.3;
  P=newPlayer(findSpawn());
  P.mode=mode==='c'?'c':'s';
  WORLD.name=(name||'world').trim()||'world';
  enterGame();
  if(bots){GR.bots=true;agJoinAll(false);}
}
function enterGame(){
  playing=true;paused=false;
  if(WORLD.name&&storageOK())setLastWorld(WORLD.name);
  $('title').style.display='none';
  $('death').style.display='none';
  $('pause').style.display='none';
  handKind=null;
  redrawHotbar();drawStats();
  tryLock();
}
async function quitToTitle(){
  endDisaster(true);
  if(P&&P.dead)respawn();
  await saveToStorage(WORLD.name,true);
  playing=false;paused=false;
  closeModal(true);
  document.exitPointerLock&&document.exitPointerLock();
  $('pause').style.display='none';
  $('death').style.display='none';
  if(typeof mg2HudHide==='function')mg2HudHide();   /* Malgorath's bar never follows Dan back to the title */
  $('title').style.display='flex';
  refreshWorldList();
}
async function refreshWorldList(){
  const box=$('t_worlds');
  box.innerHTML='';
  const ws=await listWorlds();
  const last=await getLastWorld();
  const cb=$('t_continue');
  if(cb){
    if(last&&ws&&ws.includes(last)){
      cb.style.display='';
      cb.textContent='Continue — '+last;
      cb.onclick=()=>loadWorldByName(last);
    }else cb.style.display='none';
  }
  if(ws===null){
    box.innerHTML='<div class="mlabel">In-app saving is unavailable here.<br>Use Export / Import World instead — your file works across versions.</div>';
    return;
  }
  if(!ws.length){box.innerHTML='<div class="mlabel">No saved worlds yet.</div>';return;}
  for(const n of ws){
    const row=document.createElement('div');row.className='wrow';
    const sp=document.createElement('span');sp.textContent=n;row.appendChild(sp);
    const lb=document.createElement('button');lb.className='mc-btn small';lb.textContent='Load';
    lb.onclick=()=>loadWorldByName(n);row.appendChild(lb);
    const db=document.createElement('button');db.className='mc-btn small danger';db.textContent='X';
    db.onclick=async()=>{try{await window.storage.delete('vxw:'+n);}catch(e){}refreshWorldList();};
    row.appendChild(db);
    box.appendChild(row);
  }
}
