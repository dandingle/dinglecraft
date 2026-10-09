
/* ----- new flowers (honeybee_mc collects them; each biome grows its own) ----- */
B.TULIP_R=140;B.TULIP_O=141;B.CORNFLOWER=142;B.ALLIUM=143;B.LILY=144;B.SNOWDROP=145;B.MARIGOLD=146;B.EDELWEISS=147;B.SEALAV=148;
const NEW_FLOWERS=[
  [B.TULIP_R,'Red Tulip','fl_tulr','plains'],[B.TULIP_O,'Orange Tulip','fl_tulo','plains'],
  [B.CORNFLOWER,'Cornflower','fl_corn','plains and forests'],[B.ALLIUM,'Allium','fl_all','forests'],
  [B.LILY,'Lily of the Valley','fl_lily','birch forests'],[B.SNOWDROP,'Snowdrop','fl_snow','snowy tundra'],
  [B.MARIGOLD,'Desert Marigold','fl_mari','deserts'],[B.EDELWEISS,'Edelweiss','fl_edel','high mountains'],
  [B.SEALAV,'Sea Lavender','fl_slav','beaches'],
];
for(const [id,n,t] of NEW_FLOWERS)def(id,{name:n,tiles:t,hard:0,solid:false,opq:false,bucket:'cut',cross:true,replace:true});
const FLOWER_IDS=new Set([B.FLOWER_R,B.FLOWER_Y].concat(NEW_FLOWERS.map(f=>f[0])));
const FLOWER_HINT={[B.FLOWER_R]:'plains',[B.FLOWER_Y]:'plains'};
for(const f of NEW_FLOWERS)FLOWER_HINT[f[0]]=f[3];
tile('fl_tulr',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#3f7a26';c.fillRect(7,8,1,8);c.fillRect(8,11,2,1);
  c.fillStyle='#d8343a';c.fillRect(6,4,4,4);c.fillRect(5,3,1,3);c.fillRect(10,3,1,3);c.fillRect(7,2,2,1);px(c,7,5,'#f06a6a');});
tile('fl_tulo',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#3f7a26';c.fillRect(7,8,1,8);c.fillRect(5,12,2,1);
  c.fillStyle='#f0832e';c.fillRect(6,4,4,4);c.fillRect(5,3,1,3);c.fillRect(10,3,1,3);c.fillRect(7,2,2,1);px(c,8,5,'#ffb46a');});
tile('fl_corn',(c,R)=>flower(c,R,'#3c6fe0'));
tile('fl_all',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#3f7a26';c.fillRect(7,7,1,9);
  c.fillStyle='#a45ad8';for(const [x,y] of [[6,3],[8,3],[5,4],[7,4],[9,4],[6,5],[8,5],[7,2],[7,6]])c.fillRect(x,y,1,1);px(c,7,4,'#d6a6f2');});
tile('fl_lily',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#3f7a26';c.fillRect(7,6,1,10);c.fillRect(8,5,2,1);c.fillRect(5,9,2,4);
  c.fillStyle='#f6f6ee';c.fillRect(9,6,2,2);c.fillRect(10,9,2,2);c.fillRect(9,12,2,2);});
tile('fl_snow',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#4a8a3a';c.fillRect(7,8,1,8);c.fillRect(8,7,1,1);
  c.fillStyle='#eef6ff';c.fillRect(8,8,3,3);c.fillStyle='#bcd8f5';c.fillRect(9,11,1,1);});
tile('fl_mari',(c,R)=>flower(c,R,'#f2b21c'));
tile('fl_edel',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#6c8a5a';c.fillRect(7,8,1,8);
  c.fillStyle='#f4f2e8';for(const [x,y] of [[7,3],[5,5],[9,5],[6,7],[8,7],[4,5],[10,5],[7,2]])c.fillRect(x,y,1,1);
  c.fillStyle='#e6d36a';c.fillRect(6,4,3,3);});
tile('fl_slav',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#4f7a46';c.fillRect(7,6,1,10);c.fillRect(5,9,2,1);c.fillRect(9,8,2,1);
  c.fillStyle='#9f8ce8';for(const [x,y] of [[6,3],[7,2],[8,3],[5,5],[9,5],[7,4],[4,7],[10,7],[11,6],[3,6]])c.fillRect(x,y,1,1);});
/* which new flower (if any) grows on this column */
function bioFlower(b,top,h,wx,wz){
  const r=h2(wx,wz,SEED+7171);
  if(top===B.GRASS){
    if(r>=0.012)return 0;
    const k=h2(wx,wz,SEED+7272);
    if(b===BIOME.PLAINS)return k<0.4?B.TULIP_R:k<0.8?B.TULIP_O:B.CORNFLOWER;
    if(b===BIOME.FOREST)return k<0.6?B.ALLIUM:B.CORNFLOWER;
    if(b===BIOME.BIRCH)return B.LILY;
    return 0;
  }
  if(top===B.SNOWGRASS)return r<0.008?(h>=58?B.EDELWEISS:B.SNOWDROP):0;
  if(top===B.SAND&&b===BIOME.DESERT)return r<0.003?B.MARIGOLD:0;
  if(top===B.SAND&&b===BIOME.BEACH)return r<0.012?B.SEALAV:0;
  return 0;
}
function agFlowerFound(a,id){
  if(!FLOWER_IDS.has(id)||a.flowers.includes(id))return;
  a.flowers.push(id);
  agEvent(a,'You found a '+DEFS[id].name+' - new for your collection! ('+a.flowers.length+'/'+FLOWER_IDS.size+')',AG_DEF[a.name].short==='bee'?7:3);
  if(AG_DEF[a.name].short==='bee')agNeedTurn(a,'new flower: '+DEFS[id].name);
}

/* ----- the Player Compass ----- */
IT.PCOMPASS=284;
idef(IT.PCOMPASS,{name:'Player Compass',icon:'i_pcmp',stack:1});
tile('i_pcmp',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#c9a227';c.beginPath();c.arc(8,8,7,0,7);c.fill();
  c.fillStyle='#262230';c.beginPath();c.arc(8,8,5.4,0,7);c.fill();
  c.fillStyle='#5ad1ff';c.beginPath();c.moveTo(8,3);c.lineTo(10,9);c.lineTo(8,8);c.closePath();c.fill();
  c.fillStyle='#f3f3f8';c.beginPath();c.moveTo(8,13);c.lineTo(6,8);c.lineTo(8,9);c.closePath();c.fill();
  c.fillStyle='#ffd84d';c.fillRect(7,7,2,2);});
R([' I ','IGI',' I '],{I:IT.IRON,G:IT.GOLD},IT.PCOMPASS,1);
function pcmpTargets(){return AGENTS.filter(a=>a.online).map(a=>a.name);}
function pcmpCycle(dir){
  dir=dir<0?-1:1;
  const L=pcmpTargets();
  if(!L.length){showToast('No other players online');P.pcmpT=null;return;}
  let i=L.indexOf(P.pcmpT);
  i=i<0?(dir>0?0:L.length-1):(i+dir+L.length)%L.length;
  P.pcmpT=L[i];
  showToast('Tracking: '+P.pcmpT);
  playS('click');
}
let _pcLast='';
function tickPCompass(dt){
  const el=$('pcmphud');
  if(!el)return;
  const st=P&&!P.dead?heldStack():null;
  const held=st&&st.id===IT.PCOMPASS&&!CUT.on;
  if(!held){if(_pcLast!==''){_pcLast='';el.style.display='none';}return;}
  const L=pcmpTargets();
  if(P.pcmpT&&!L.includes(P.pcmpT))P.pcmpT=null;
  if(!P.pcmpT&&L.length)P.pcmpT=L[0];
  let txt,ang=null,spin=false;
  const a=agByName(P.pcmpT);
  if(!a)txt='No other players online';
  else if(a.dead)txt=a.name+' — respawning';
  else if(a.dim!==DIM){txt=a.name+' ('+(a.dim==='over'?'Overworld':a.dim==='nether'?'Nether':a.dim==='puppet'?'Puppet Purgatory':'Aether')+')';spin=true;}
  else{
    const dx=a.x-P.x,dz=a.z-P.z,d=Math.hypot(dx,dz),dy=Math.round(a.y-P.y);
    txt=d<8?a.name+' — HERE':a.name+'  '+Math.round(d)+'m '+dir8(dx,dz)+(Math.abs(dy)>=3?(dy>0?' ↑':' ↓')+Math.abs(dy):'');
    if(d>=8)ang=Math.atan2(-dx,-dz);
  }
  if(txt!==_pcLast){_pcLast=txt;el.style.display='flex';const t=$('pcmptext');if(t)t.textContent=txt;}
  const nd=$('pcmpneedle');
  if(!nd)return;
  if(ang!==null){let rel=ang-P.yaw;rel=((rel+Math.PI*3)%(Math.PI*2))-Math.PI;
    nd.style.transform='rotate('+(-rel*180/Math.PI).toFixed(1)+'deg)';nd.textContent='⬆';}
  else if(spin){nd.style.transform='rotate('+((performance.now()/3)%360).toFixed(0)+'deg)';nd.textContent='⬆';}
  else{nd.style.transform='';nd.textContent=a?'★':'?';}
}

/* ----- chat box, commands, Tab list ----- */
function renderChat(force){
  const box=$('chatlog');if(!box)return;
  const now=performance.now();
  if(!force&&!_chatDirty&&frameCount%20!==0)return;
  _chatDirty=false;
  const lines=CHAT.slice(chatOpen?-22:-10).filter(m=>chatOpen||now-m.t<14000);
  box.innerHTML='';
  for(const m of lines){
    const d=document.createElement('div');
    d.className='cl cl-'+m.k;
    if(m.k==='chat')d.textContent='<'+pnShow(m.from)+'> '+pnText(m.txt);
    else if(m.k==='whisper')d.textContent=m.from==='Dan'?'You whisper to '+m.to+': '+pnText(m.txt):m.from+' whispers to you: '+pnText(m.txt);
    else d.textContent=pnText(m.txt);
    if(!chatOpen){const age=(now-m.t)/1000;if(age>11)d.style.opacity=Math.max(0,1-(age-11)/3).toFixed(2);}
    box.appendChild(d);
  }
}
function openChat(pre){
  if(chatOpen||!playing||paused||!P||P.dead||modalOpen())return;
  chatOpen=true;
  const inp=$('chatin');
  if(inp){inp.style.display='block';inp.value=pre||'';setTimeout(()=>{try{inp.focus();}catch(e){}},0);}
  const bx=$('chatbox');if(bx)bx.classList.add('open');
  try{document.exitPointerLock&&document.exitPointerLock();}catch(e){}
  for(const k in KEY)KEY[k]=false;MB.l=MB.r=false;
  renderChat(true);
}
function closeChat(){
  if(!chatOpen)return;
  chatOpen=false;
  const inp=$('chatin');if(inp){inp.style.display='none';try{inp.blur();}catch(e){}}
  const bx=$('chatbox');if(bx)bx.classList.remove('open');
  renderChat(true);
  setTimeout(()=>{try{tryLock();}catch(e){}},30);
}
function chatKey(e){
  if(chatOpen){
    if(e.code==='Enter'||e.code==='NumpadEnter'){e.preventDefault();const inp=$('chatin');const v=inp?inp.value:'';closeChat();chatSubmit(v);}
    else if(e.code==='Escape'){e.preventDefault();closeChat();}
    return true;
  }
  if(!playing||paused||!P||P.dead||modalOpen())return false;
  if(e.code==='KeyT'||e.code==='Enter'){e.preventDefault();openChat('');return true;}
  if(e.code==='Slash'){e.preventDefault();openChat('/');return true;}
  return false;
}
function chatSubmit(raw){
  const t=(''+(raw||'')).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,200);
  if(!t)return;
  if(t[0]!=='/'){chatLine('Dan',t,null,false);agBrainNudge();return;}
  const parts=t.slice(1).split(/\s+/);const cmd=(parts.shift()||'').toLowerCase();
  if(cmd==='msg'||cmd==='w'||cmd==='tell'||cmd==='whisper'){
    const to=parts.shift();const msg=parts.join(' ');
    const a=agByName(to);
    if(!a||!msg){sysMsg('Usage: /msg <player> <message>');return;}
    if(!a.online){sysMsg(a.name+' is not online');return;}
    chatPush({k:'whisper',from:'Dan',to:a.name,txt:msg});
    agHear('Dan',msg,a.name,true);agBrainNudge();return;
  }
  if(cmd==='r'){const a=agByName(_lastWhisperFrom);if(!a){sysMsg('Nobody has whispered to you');return;}
    const msg=parts.join(' ');if(!msg)return;chatPush({k:'whisper',from:'Dan',to:a.name,txt:msg});agHear('Dan',msg,a.name,true);agBrainNudge();return;}
  if(cmd==='pair'){if(!parts[0]){sysMsg('Usage: /pair <code from the brain server window>');return;}brainPair(parts[0]);return;}
  if(cmd==='brain'){
    const s=(parts[0]||'status').toLowerCase();
    if(s==='off'){BRAIN.off=true;BRAIN.ok=false;AG_EPOCH++;for(const a of AGENTS){if(a.bs){a.bs.actFly=false;a.bs.mindFly=false;}if(a.bjob)a.bjob.inflight=false;}sysMsg('[AI] Brains off - players on autopilot.');return;}
    if(s==='on'){BRAIN.off=false;BRAIN.back=5;brainHealth();sysMsg('[AI] Brains on (connecting...)');return;}
    sysMsg('[AI] '+(BRAIN.ok?'connected':BRAIN.off?'switched off':BRAIN.needPair?'needs /pair':'not connected')+
      ' | server '+BRAIN.url+' | calls '+BRAIN.calls+' | spent this session $'+(+BRAIN.spent||0).toFixed(3)+
      ' | avg reply '+Math.round(BRAIN.lat)+'ms'+(BRAIN.err?' | last error: '+BRAIN.err:''));
    if(!BRAIN.ok&&!BRAIN.mock)sysMsg(BRAIN.off?'[AI] The players are on autopilot and can\u2019t chat. /brain on reconnects.':
      BRAIN.needPair?'[AI] The players are on autopilot until you /pair <code> (the code is in the brain server window).':
      BRAIN.found&&BRAIN.noKey?'[AI] The brain server is running but has no ANTHROPIC_API_KEY: add it to the server\u2019s .env file and restart the server. Until then the players are on autopilot and can\u2019t chat.':
      '[AI] The players are on autopilot and can\u2019t chat. Double-click "Start AI Brain.command" in the game folder (or run npm run brain:launch) - it opens the game for you.');
    return;
  }
  if(cmd==='bots'||cmd==='players'){
    const s=(parts[0]||'').toLowerCase();
    if(s==='join'||s==='on'){if(!GR.bots){GR.bots=true;agJoinAll(false);}else sysMsg('They are already here');return;}
    if(s==='leave'||s==='off'){if(GR.bots){GR.bots=false;agLeaveAll();}return;}
    if(!AGENTS.length){sysMsg('No AI players in this world. Type /bots join to invite them.');return;}
    for(const a of AGENTS)sysMsg(a.name+': '+(!a.online?'offline':a.dead?'dead':'hp '+Math.round(a.hp)+', '+Math.round(agDist(a,P.x,P.z))+'m away')+(a.proj?' - working on "'+a.proj.title+'"':''));return;
  }
  if(cmd==='think'||cmd==='mind'||cmd==='thoughts'){
    const a=agByName(parts[0]);
    if(!a){sysMsg('Usage: /think <player>');return;}
    sysMsg('['+a.name+'] project: '+(a.proj?a.proj.title+' (step '+(a.proj.step+1)+'/'+a.proj.steps.length+': '+a.proj.steps[Math.min(a.proj.step,a.proj.steps.length-1)]+')':'none'));
    sysMsg('['+a.name+'] feels about you: '+relMood(agRel(a,'Dan'))+' (trust '+Math.round(agRel(a,'Dan').trust)+')');
    for(const t2 of a.thoughts.slice(-3))sysMsg('['+a.name+'] '+t2.txt);
    return;
  }
  if(cmd==='help'||cmd==='?'){
    sysMsg('Chat: T or Enter to talk, / for commands. Everyone on the server sees normal chat.');
    sysMsg('/msg <player> <text> (or /w) whisper | /r <text> reply | /think <player> read their mind');
    sysMsg('/bots [join|leave] AI players | /brain [status|on|off] the AI link | /pair <code> connect to the brain server');
    sysMsg('The AI players start with nothing and play by your survival rules: they chop, mine, craft, smelt and build only with what they gathered.');
    return;
  }
  sysMsg('Unknown command. Type /help');
}
let _tabLast='';
function renderTab(){
  const el=$('tablist');if(!el)return;
  const show=tabHeld&&playing&&!chatOpen&&!modalOpen();
  if(!show){if(_tabLast!==''){_tabLast='';el.style.display='none';}return;}
  const rows=[[PNAME,P.mode==='c'?'creative':Math.round(P.hp)+'❤','',0]];
  for(const a of AGENTS){if(!a.online)continue;
    rows.push([a.name,a.dead?'dead':Math.round(a.hp)+'❤',!BRAIN.ok?'autopilot':a.typing.length?'typing…':'▂▄▆█',a.dim!==DIM?(a.dim==='over'?'Overworld':a.dim==='puppet'?'Puppet Purgatory':a.dim):'']);}
  const s=JSON.stringify(rows);
  if(s===_tabLast)return;
  _tabLast=s;el.style.display='block';el.innerHTML='';
  const h=document.createElement('div');h.className='tabh';h.textContent='DINGLECRAFT — '+rows.length+' online';el.appendChild(h);
  for(const r of rows){const d=document.createElement('div');d.className='tabr';
    d.textContent=r[0].padEnd(18,' ')+'  '+(''+r[1]).padStart(9,' ')+'  '+(''+r[2]).padStart(9,' ')+(r[3]?'  '+r[3]:'');el.appendChild(d);}
}
function agDebugStr(){
  if(!AG_ACTIVE)return '';
  let s='\n— AI players ('+(BRAIN.ok?'brain online, $'+(+BRAIN.spent||0).toFixed(2):'autopilot')+') —';
  for(const a of AGENTS){if(!a.online)continue;
    const sk=a.rx?a.rx.k+'!':a.sk?a.sk.k+(a.sk.a.target?' '+a.sk.a.target:''):'idle';
    const th=a.thoughts.length?a.thoughts[a.thoughts.length-1].txt:'';
    s+='\n'+a.name+' hp'+Math.round(a.hp)+' | '+(a.proj?a.proj.title.slice(0,26)+' '+(a.proj.step+1)+'/'+a.proj.steps.length:'no project')+' | '+sk+
      '\n   '+th.slice(0,92);}
  return s;
}
/* "AI players: autopilot" badge: always visible while the minds are offline */
let _aiBadge=null;
function aiBadgeText(){
  if(!AG_ACTIVE||BRAIN.ok||!AGENTS.some(a=>a.online))return '';
  if(BRAIN.off)return 'AI players: autopilot - brains switched off (/brain on)';
  if(BRAIN.needPair)return 'AI players: autopilot - type /pair <code> to connect the brain';
  if(BRAIN.found&&BRAIN.noKey)return 'AI players: autopilot - the brain server has no API key';
  if(!BRAIN.checked)return 'AI players: looking for the brain...';
  return 'AI players: autopilot - brain not running';
}
function tickAiBadge(){
  const t=aiBadgeText();
  if(t===_aiBadge)return;
  const el=$('aibadge');if(!el)return;
  _aiBadge=t;el.textContent=t;el.style.display=t?'block':'none';
}
/* tick the HUD bits every frame (even while paused, so Tab/chat stay live) */
function tickAgHud(dt){
  if(!playing)return;
  renderChat(false);
  renderTab();
  tickAiBadge();
}
bpalInit();vgInit();

