/* ===================================================================== */
/* PART 27 — DEBUG MENU, GAMERULES & SETTINGS MEMORY  (2.3.1)            */
/* ===================================================================== */
function GR_DEF(){return {keepInv:false,god:false,mobGrief:true,mobSpawn:true,
  dayCycle:true,fireTick:true,fallDmg:true,snail:true,jsc:0,instaKill:false,freezeMobs:false,ghosts:true,bots:false,botPvP:true,botGrief:true,botPurg:true,fbOK:true,store:true,powers:true,cheats:true};}
const GR=GR_DEF();
let dbgmOpen=false;
const GR_LABELS=[
  ['god',     'God Mode (survival)',       'No damage from anything. Walk through lava judging it.'],
  ['keepInv', 'Keep Inventory',            'Death stops costing you your stuff.'],
  ['mobGrief','Mob Griefing',              'Boomers and nukes break blocks. Off = drama, no craters.'],
  ['mobSpawn','Natural Mob Spawning',      'Ambient mobs and wild dragons. Spawners ignore this.'],
  ['dayCycle','Daylight Cycle',            'Off pauses the sun where it stands.'],
  ['fireTick','Fire Tick',                 'Off freezes fire: no spreading, no burning out.'],
  ['fallDmg', 'Fall Damage',               'Gravity\u2019s opinion of your ankles.'],
  ['snail',   'The Eternal Snail',         'The slow pursuer. Off makes him vanish and stay gone.'],
  ['instaKill','Instant Kill',              'Any hit you land kills a mob outright \u2014 guns, blades, tools, all of it.'],
  ['freezeMobs','Freeze All Mobs',          'Every mob stops where it stands \u2014 no moving, no attacking \u2014 until you turn this off.'],
  ['ghosts',  'Guilt Ghosts',              'Slain mobs sometimes return to guilt-trip you. Off keeps them away for good.'],
  ['bots',    'AI Players',                'BunkerBrad, xx_lilcreepah_xx and honeybee_mc live in this world. Off makes them log out.'],
  ['botPvP',  'AI Player PvP',             'The AI players can fight you and each other.'],
  ['botGrief','AI Player Griefing',        'The AI players can break, blow up and raid anyone\u2019s stuff.'],
  ['botPurg', 'AI Players Follow Into Purgatory','The AI players are dragged in with you, and out again. Off leaves them frozen at the door.'],
  ['fbOK',    'Fullbright Toggle',         'Off removes the Fullbright button from Settings and turns it off.'],
  ['store',   'Dingle Store',              'Off closes the shop and removes it from the pause menu.'],
  ['powers',  'Superpowers',               'Off disables the P menu and its button.'],
  ['cheats',  'Cheats',                    'Off removes this debug menu. Right-click the world in Load World to bring it back.'],
];
/* Release 1.0: game rules that shape the menus (set on Create New World, saved with the world) */
function grApplyUI(){
  const show=(id,on)=>{const b=$(id);if(b&&b.style)b.style.display=on?'':'none';};
  show('p_store',GR.store);show('p_pow',GR.powers);show('p_debug',GR.cheats);show('p_bright',GR.fbOK);
  if(!GR.cheats&&dbgmOpen)closeDbgm();
}
function grToggle(k){
  if(!(k in GR))return false;
  GR[k]=!GR[k];
  if(k==='snail'&&!GR.snail&&SNL){removeEnt(SNL);SNL=null;} /* banish the one currently after you */
  if(k==='ghosts'&&!GR.ghosts)for(const e of entities)if(e.t==='ghost'&&!e.dead)removeEnt(e);
  if(k==='bots'){if(GR.bots)agJoinAll(false);else agLeaveAll();}
  if(k==='fbOK'||k==='store'||k==='powers'||k==='cheats')grApplyUI();
  playS('click');
  renderDbgm();
  return GR[k];
}
function openDbgm(){
  if(!GR.cheats)return;   /* the Cheats game rule */
  dbgmOpen=true;
  const el=$('dbgm');
  if(el)el.style.display='flex';
  renderDbgm();
}
function closeDbgm(){
  dbgmOpen=false;
  const el=$('dbgm');
  if(el)el.style.display='none';
  if(paused&&playing)openSet();  /* debug menu lives inside Settings */
}
function fmtTime(t){
  const f=((t%1)+1)%1;
  const mins=Math.floor(f*24*60);
  const hh=String(Math.floor(mins/60)).padStart(2,'0');
  const mm=String(mins%60).padStart(2,'0');
  return hh+':'+mm;
}
function renderDbgm(){
  const list=$('grlist');
  if(list){
    let h='';
    for(const [k,n,desc] of GR_LABELS){
      h+='<div class="sitem'+(GR[k]?' eq':'')+'"><div class="sname">'+n+'</div>'+
         '<div class="sdesc">'+desc+'</div>'+
         '<button class="sbuy" data-k="'+k+'">'+(GR[k]?'ON':'OFF')+'</button></div>';
    }
    list.innerHTML=h;
    if(typeof list.querySelectorAll==='function'){
      for(const b of list.querySelectorAll('.sbuy'))
        b.onclick=()=>grToggle(b.getAttribute('data-k'));
    }
  }
  const js=$('p_jsc');
  if(js)js.value=GR.jsc;
  const jsv=$('p_jscv');
  if(jsv)jsv.textContent=GR.jsc+'%';
  const sp=$('p_spd');
  if(sp)sp.value=GAMESPD;
  const spv=$('p_spdv');
  if(spv)spv.textContent=(+GAMESPD.toFixed(2))+'x';
  const sl=$('p_time');
  if(sl)sl.value=Math.round((((timeOfDay%1)+1)%1)*1000);
  const tv=$('p_timev');
  if(tv)tv.textContent=fmtTime(timeOfDay)+(GR.dayCycle?'':' (paused)');
}
{
  const db=$('p_debug');
  if(db)db.onclick=()=>{closeSet(true);openDbgm();};
  const dc=$('dbgmclose');
  if(dc)dc.onclick=()=>{closeDbgm();};
  const dx2=$('dbg_xray');
  if(dx2)dx2.onclick=()=>{toggleXray();};
  const js2=$('p_jsc');
  if(js2&&js2.addEventListener)js2.addEventListener('input',e2=>{
    GR.jsc=Math.max(0,Math.min(100,+e2.target.value));
    const v2=$('p_jscv');if(v2)v2.textContent=GR.jsc+'%';
  });
  const sp2=$('p_spd');
  if(sp2&&sp2.addEventListener)sp2.addEventListener('input',e2=>{
    GAMESPD=Math.max(0.1,Math.min(1,+e2.target.value));
    const v2=$('p_spdv');if(v2)v2.textContent=(+GAMESPD.toFixed(2))+'x';
  });
  const sl=$('p_time');
  if(sl)sl.addEventListener&&sl.addEventListener('input',e=>{
    timeOfDay=Math.floor(timeOfDay)+(+e.target.value)/1000;
    const tv=$('p_timev');
    if(tv)tv.textContent=fmtTime(timeOfDay)+(GR.dayCycle?'':' (paused)');
  });
}
/* ----- the player's name (Release 1.0): asked on first launch, 2-16 characters. Internally the player is still 'Dan'
   (saves, AI-player relations, ownership); every name shown on screen or sent to the AI players goes through
   pnShow/pnText, and replies are mapped back with pnBack. A name the mapping would confuse is refused (pnValid): one
   letter, an AI player's name or nickname, or a common short word ('grab a pick' must not become 'grab Dan pick').
   pnText maps 'Dan' in any case (the creep's lowercase 'dan' too) and never touches the credit 'Dan Dingle'. ----- */
let PNAME='Dan',PNAME_SET=false;
const PN_NO=new Set(['a','i','an','and','all','are','as','at','be','but','by','do','for','go','he','her','here','him','his','if','in','is','it',
  'its','me','my','no','not','of','ok','on','one','or','she','so','that','the','them','there','they','this','to','up','us','we','who','yes','you',
  'everyone','someone','nobody','brad','bunkerbrad','creep','creepah','lilcreepah','lil creep','xx_lilcreepah_xx','bee','honey','honeybee','honeybee_mc']);
function pnClean(s){return (''+(s||'')).replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,16);}
function pnValid(n){return typeof n==='string'&&n.length>=2&&!PN_NO.has(n.toLowerCase());}
function pnShow(who){return who==='Dan'?PNAME:who;}
function pnText(t){return PNAME==='Dan'||typeof t!=='string'?t:t.replace(/\bdan\b(?! dingle\b)/gi,m=>m==='dan'?PNAME.toLowerCase():m==='DAN'?PNAME.toUpperCase():PNAME);}
function pnRe(){return new RegExp('(^|[^\\w])'+PNAME.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\w])','gi');}
function pnBack(v){if(PNAME==='Dan')return v;const re=pnRe();const f=x=>typeof x==='string'?x.replace(re,(m,pre)=>pre+'Dan'):Array.isArray(x)?x.map(f):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,y])=>[k,f(y)])):x;return f(v);}
function pnSet(s){const n=pnClean(s);if(!pnValid(n))return false;PNAME=n;PNAME_SET=true;saveSettings();return true;}
/* ----- client settings that survive the tab ----- */
function setRD(n,skipSave){
  RD=clamp(n|0,2,32);
  const s=$('p_rd'),v=$('p_rdv');
  if(s)s.value=RD;
  if(v)v.textContent=RD;
  if(!skipSave)saveSettings();
}
function saveSettings(){
  try{storage.set('vox_settings',JSON.stringify({rd:RD,snd:soundOn?1:0,mus:musicOn?1:0,fb:fullbright?1:0,sh:SHD.on?1:0,plk:usePLock?1:0,tp:TP.id,tq:TP.q,ui:UIS.pref,fov:FOVB,ms:MSENS,sv:SFXVOL,mv:MUSVOL,pn:PNAME_SET?PNAME:undefined}));}catch(err){}
}
async function loadSettings(){
  try{
    const r=await storage.get('vox_settings');
    const s=JSON.parse(r.value);
    if(s&&s.rd)setRD(s.rd,true);
    if(s){
      if(s.snd!==undefined)soundOn=!!s.snd;
      if(s.mus!==undefined)musicOn=!!s.mus;
      if(s.fb!==undefined)fullbright=!!s.fb;
      if(s.sh!==undefined)setShaders(!!s.sh);
      if(s.plk!==undefined)setLock(!!s.plk);
      if(s.tq!==undefined)TP.q=s.tq|0;
      if(s.tp&&s.tp!==TP.id)setPack(s.tp,{quiet:true});
      if(s.fov)FOVB=clamp(s.fov|0,50,110);
      if(s.ms)MSENS=clamp(+s.ms,0.1,3);
      if(s.pn&&pnValid(pnClean(s.pn))){PNAME=pnClean(s.pn);PNAME_SET=true;}
      if(s.sv!==undefined)SFXVOL=clamp(+s.sv,0,1);
      if(s.mv!==undefined)MUSVOL=clamp(+s.mv,0,1);
      acVol();
      uiSetPref(s.ui===undefined?'auto':s.ui,true);   /* UI scale (p06e); settings saved before Release 1.0 have none: Auto */
      if(!soundOn&&typeof tmusStop==='function')tmusStop();                        /* Sound: Off silences the menu music */
      if(PNAME_SET&&typeof TM!=='undefined'&&TM.view==='name')tmShow('main');     /* a returning player is never asked again */
    }
    if(typeof syncSetUI==='function')syncSetUI();
  }catch(err){}
}
const SETTINGS_P=loadSettings();   /* the title (tmBoot) waits for it: the name prompt and the menu music need the saved settings */

