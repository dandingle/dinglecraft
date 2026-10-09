
/* ----- minds: memory, relationships, decisions ----- */
function agEvent(a,txt,imp,who){
  a.ev.push({t:AG_T,txt:(''+txt).slice(0,180),imp:imp||3,who:who||null});
  if(a.ev.length>40)a.ev.splice(0,a.ev.length-40);
  if((imp||0)>=7){a.mem.push({t:AG_T,txt:(''+txt).slice(0,160),imp});if(a.mem.length>24){a.mem.sort((p,q)=>q.imp-p.imp||q.t-p.t);a.mem.length=24;}}
}
function agThink(a,txt){a.thoughts.push({t:AG_T,txt:(''+txt).slice(0,240)});if(a.thoughts.length>30)a.thoughts.splice(0,a.thoughts.length-30);}
function agNeedTurn(a,why){if(!a.bs)a.bs={why:[]};a.bs.need=true;if(why&&!a.bs.why.includes(why))a.bs.why.push(why);if(a.bs.why.length>6)a.bs.why.shift();}
function agMindForce(a,why){if(!a.bs)a.bs={why:[]};a.bs.mindForce=why;agNeedTurn(a,why);}
function relMood(r){
  if(r.war)return 'AT WAR';
  if(r.ally)return 'ALLY';
  const v=r.aff+(r.trust-50)*0.5;
  if(r.host>=3)return 'enemy';
  if(v<-35)return 'hostile';if(v<-10)return 'wary';if(v<15)return 'neutral';if(v<45)return 'friendly';return 'close friend';
}
function relShift(a,who,daff,dtrust,dhost){
  const r=agRel(a,who);
  r.aff=clamp(r.aff+daff,-100,100);r.trust=clamp(r.trust+dtrust,0,100);
  if(dhost)r.host=clamp(r.host+dhost,0,5);
  if(r.host>=4&&!r.war&&!(r.truceT>AG_T)){
    /* honeybee never auto-declares: she gets upset and decides for herself */
    if(AG_DEF[a.name].short==='bee'){if(!r.upset){r.upset=true;agEvent(a,who+' keeps hurting you and your things. You are really upset with them',7,who);agNeedTurn(a,'upset with '+who);}}
    else{r.war=true;r.ally=false;agEvent(a,'You are now at war with '+who,8,who);agMindForce(a,'now at war with '+who);}
  }
  return r;
}
/* events from the world */
function agOnHit(a,by,dmg,how){
  const D=AG_DEF[a.name],r=agRel(a,by);
  r.hits++;
  const mult=D.short==='creep'?1.8:(D.short==='bee'?0.5:1.2);
  relShift(a,by,-6*mult,-5*mult,(r.hits%3===0&&!r.ally)?1:0);
  if(r.ally&&r.hits>3){r.ally=false;agEvent(a,by+' keeps hitting you even though you are allies',7,by);}
  agEvent(a,by+' hit you'+(how&&how!=='melee'?' ('+how+')':'')+' for '+Math.round(dmg)+' damage',4,by);
  agNeedTurn(a,'hit by '+by);
}
function agOnHitDan(a,dmg){
  if(P&&P.hp-dmg<=0)return;
}
function agOnKilled(a,killer,how){
  const D=AG_DEF[a.name];
  const r=agRel(a,killer);r.deaths++;
  relShift(a,killer,D.short==='bee'?-12:-30,-25,D.short==='bee'?1:2);
  agEvent(a,killer+' killed you'+(how==='tnt'?' with TNT':'')+(GR.keepInv?'':' and you dropped everything you were carrying'),9,killer);
  if(D.aggr<0.5){a.shyOf=a.shyOf||{};a.shyOf[killer]=AG_T+45;}
  const k=agByName(killer);
  if(k){const rk=agRel(k,a.name);rk.kills++;k.stats.k++;agEvent(k,'You killed '+a.name,7,a.name);agNeedTurn(k,'killed '+a.name);}
  for(const o of AGENTS)if(o!==a&&o!==k&&o.online&&!o.dead)agEvent(o,a.name+' was killed by '+killer,4,killer);
}
function agOnDanDeath(){
  const by=(AG_T-LASTDMG.t<4)?LASTDMG.by:null,how=(AG_T-LASTDMG.t<4)?LASTDMG.how:null;
  const msg=agDeathMsg('Dan',by,how,null);
  chatPush({k:'death',txt:msg});
  const k=agByName(by);
  if(k){const r=agRel(k,'Dan');r.kills++;k.stats.k++;agEvent(k,'You killed Dan'+(how==='tnt'?' with TNT':''),8,'Dan');agNeedTurn(k,'you killed Dan');}
  for(const o of AGENTS)if(o!==k&&o.online&&!o.dead)agEvent(o,msg,3,by);
}
function agOnGriefed(victim,actor,n,x,z){
  const v=agByName(victim);
  const act=agByName(actor);
  if(v&&actor!==victim){
    const D=AG_DEF[v.name],r=agRel(v,actor);r.grief+=n;
    const big=n>=8;
    const mult=D.short==='creep'?2.2:(D.short==='bee'?0.6:1.3);
    relShift(v,actor,-Math.min(40,n*1.5)*mult,-Math.min(30,n)*mult,big?(D.short==='bee'?1:2):1);
    agEvent(v,actor+' broke '+n+' of your blocks near '+Math.round(x)+','+Math.round(z),big?8:5,actor);
    agNeedTurn(v,actor+' griefed your stuff');
    if(big&&D.short!=='bee')agMindForce(v,actor+' griefed your base');
  }
  if(act&&victim!==actor){agEvent(act,'You broke '+n+' blocks of '+victim+"'s stuff",4,victim);}
  for(const o of AGENTS)if(o!==v&&o!==act&&o.online&&!o.dead&&o.e&&Math.hypot(o.x-x,o.z-z)<24)agEvent(o,'You saw '+actor+' breaking '+victim+"'s blocks",5,actor);
}
function agOnStolen(victim,thief,took){
  const v=agByName(victim);
  if(!v)return;
  const r=agRel(v,thief);r.stole++;
  relShift(v,thief,AG_DEF[v.name].short==='creep'?-35:-18,-20,2);
  agEvent(v,thief+' stole from your chest: '+took.slice(0,4).join(', '),8,thief);
  agNeedTurn(v,thief+' robbed you');
}
function agGiftNote(from,to,id,n){
  const t=agByName(to);
  if(t){const r=agRel(t,from);r.gifts++;relShift(t,from,6+Math.min(10,n),5,r.host>0?-1:0);
    agEvent(t,from+' gave you '+n+' '+DEFS[id].name,5,from);agNeedTurn(t,'got a gift from '+from);}
}
/* Dan handing items over: drops he throws near an agent count as gifts */
function agTryPickup(e){
  if(!AG_ACTIVE||e.age<0.6||crBotNo(e.st))return false;
  if(e.mgNoBot)return false;
  for(const a of AGENTS){
    const b=a.e;if(!b||a.dead)continue;
    if(e.giver===a.name&&AG_T-(e.giveT||0)<4)continue;
    if(e.pown&&e.pown!==a.name&&MP.clock<e.pownT)continue;   /* don't snatch back what you just handed over */
    const dx=b.x-e.x,dy=(b.y+0.6)-e.y,dz=b.z-e.z,ds=Math.hypot(dx,dy,dz);
    if(ds<1.8){const pull=9*(1/60)/Math.max(ds,0.3);e.x+=dx*pull;e.y+=dy*pull;e.z+=dz*pull;}
    if(ds<0.8){
      const st=e.st;const before=st.count;
      if(FLOWER_IDS.has(st.id)&&!a.flowers.includes(st.id))agFlowerFound(a,st.id);
      const left=agGive(a,st,'pickup');
      if(left<before){
        const got=before-left;st.count=left;
        if(e.thrower==='Dan'&&AG_T-(e.thrownT||0)<20)agGiftNote('Dan',a.name,st.id,got);
        agAutoEquip(a);playSAt('pop',b.x,b.y+1,b.z);
      }
      if(st.count<=0){removeEnt(e);return true;}
    }
  }
  return false;
}
/* hearing chat */
const PROP_RX=[
  ['team',/\b(team ?up|teaming|join (me|us|my team)|be (my )?(ally|allies|partners?|friends)|alliance|ally with|work together|build together|wanna team|squad up|partner)\b/i],
  ['truce',/\b(truce|peace|ceasefire|stop (fighting|attacking)|make up|sorry|forgive|call it even)\b/i],
  ['war',/\b(declare war|war on|at war|i('|’)?m coming for you|you('|’)?re dead|fight me|1v1|watch your back|i will (kill|destroy|grief) you)\b/i],
  ['trade',/\b(trade|swap|deal|buy|sell|give me|can i have|i('|’)?ll give you|pay you)\b/i],
];
function agAddressed(a,txt,to){
  if(to)return to.toLowerCase()===a.name.toLowerCase();
  const l=txt.toLowerCase();
  const D=AG_DEF[a.name];
  const keys=[a.name.toLowerCase(),D.short,a.name.toLowerCase().replace(/^xx_|_xx$/g,'').replace(/_/g,' ')];
  if(D.short==='creep')keys.push('creepah','lilcreepah','lil creep');
  if(D.short==='bee')keys.push('honeybee','honey','bee ');
  if(D.short==='brad')keys.push('bunkerbrad');
  return keys.some(k=>k&&l.includes(k));
}
function agHear(from,txt,to,whisper){
  if(!AG_ACTIVE)return;
  let responders=0;
  for(const a of AGENTS){
    if(!a.online||a.dead||a.name===from)continue;
    if(whisper&&to&&to.toLowerCase()!==a.name.toLowerCase())continue;
    const addr=agAddressed(a,txt,whisper?to:null);
    a.heard.push({t:AG_T,from,txt:(''+txt).slice(0,200),to:whisper?to:(addr?a.name:null),wh:!!whisper});
    if(a.heard.length>14)a.heard.splice(0,a.heard.length-14);
    if(addr){
      for(const [k,rx] of PROP_RX)if(rx.test(txt)){a.pend={type:k,from,txt,t:AG_T};break;}
      if(a.pend&&a.pend.type==='war'&&from){const r=agRel(a,from);if(/declare war|war on/i.test(txt)){r.war=true;r.ally=false;r.host=4;agEvent(a,from+' declared war on you',9,from);agMindForce(a,from+' declared war on you');}}
      if(from==='Dan'){agNeedTurn(a,'Dan'+(whisper?' whispered to you':' talked to you'));a.bs.chatFast=true;}
      else{
        /* bot-to-bot back-and-forth fizzles out like real chat: after two quick replies they stop pinging each other */
        a.cv=a.cv||{};const c=a.cv[from]||(a.cv[from]={n:0,t:-99});
        if(AG_T-c.t>90)c.n=0;
        if(c.n<2){c.n++;c.t=AG_T;agNeedTurn(a,from+(whisper?' whispered to you':' talked to you'));}
      }
    }else if(from==='Dan'&&responders<2&&Math.random()<AG_DEF[a.name].social*0.55){responders++;agNeedTurn(a,'Dan said something in chat');}
    else if(agByName(from)&&Math.random()<AG_DEF[a.name].social*0.15&&AG_T-(a.bs.lastAct||-99)>20){agNeedTurn(a,from+' said something');}
  }
}
/* the gut feeling about a proposal: code decides the anchor, the model decides the words */
function agGut(a,from,type){
  const D=AG_DEF[a.name],r=agRel(a,from);
  const why=[];
  let s=r.aff/100*0.9+(r.trust-50)/100*0.7;
  const bias={brad:{team:-0.45,truce:0.25,trade:-0.1,war:-0.3},creep:{team:0.15,truce:-0.15,trade:0.1,war:0.45},
    bee:{team:0.55,truce:0.7,trade:0.3,war:-0.8}}[D.short]||{};
  s+=bias[type]||0;
  if(r.war&&type!=='truce')s-=0.4;
  if(r.hits>2){s-=0.25;why.push(from+' has hit you '+r.hits+' times');}
  if(r.grief>0){s-=0.3;why.push(from+' griefed your stuff');}
  if(r.stole>0){s-=0.3;why.push(from+' stole from you');}
  if(r.deaths>0){s-=0.35;why.push(from+' has killed you '+r.deaths+'x');}
  if(r.gifts>0){s+=0.15*Math.min(3,r.gifts);why.push(from+' has given you gifts');}
  if(r.ally)s+=0.3;
  if(D.short==='brad')why.push('you trust nobody by default');
  if(D.short==='creep'&&type==='team')why.push('a team is only worth it if there is someone to raid');
  if(D.short==='bee')why.push('you want everyone to get along');
  if(r.trust<20)why.push('you barely trust '+from);
  s+=(Math.random()-0.5)*0.25;
  const b=s<-0.5?'STRONG NO':s<-0.15?'LEAN NO':s<0.15?'UNSURE':s<0.5?'LEAN YES':'STRONG YES';
  return b+' ('+why.slice(0,3).join('; ')+')';
}
/* opportunities the world is advertising right now */
function agItches(a){
  if(a.dim==='puppet')return purgItches(a);
  const out=[],D=AG_DEF[a.name],e=a.e;
  const t=timeOfDay%1;
  const toNight=t<0.5&&t>0.38?Math.round((0.5-t)*DAY_LEN):0;
  const night=!sunUp();
  const base=a.home?{x:a.home[0],z:a.home[2]}:(mainBase(a.name)||null);
  if(!base)out.push('You have no base/home yet.');
  if((toNight||night)&&D.paranoia>0.4)out.push(night?'It is NIGHT - mobs are out.':('Night falls in ~'+toNight+'s.')+(base?' Your base is '+Math.round(agDist(a,base.x,base.z))+'m away.':''));
  let mobs=0;for(const m of entities)if(m.t==='mob'&&!m.dead&&!m.bot&&m.hostile&&Math.hypot(m.x-e.x,m.z-e.z)<20)mobs++;
  if(mobs)out.push(mobs+' hostile mob'+(mobs>1?'s':'')+' within 20m.');
  /* survival: what a real player would be worrying about (nothing is free) */
  const pick=agToolLevel(a,'pick'),wood=agWoodUnits(a),tn=agTableNear(a)||agHas(a,B.CRAFT)>0;
  if(pick<0){const er=agCraftCheck(a,'Wooden Pickaxe');
    out.push(!er?'You have no pickaxe but you can craft a Wooden Pickaxe right now (craft puts a crafting table down for you if needed).':
      'You have no pickaxe, so you cannot mine stone or ore. A Wooden Pickaxe needs 3 planks + 2 sticks at a crafting table: you '+er+' - punch trees for logs (gather wood).');}
  else if(pick<1){const er=agCraftCheck(a,'Stone Pickaxe');
    out.push(!er?'You can craft a Stone Pickaxe right now - do it (stone tools are faster and last longer).':
      agHas(a,B.COBBLE)>=3?'You have the cobblestone for a Stone Pickaxe, but you '+er+' (gather wood).':
      'Your only pickaxe is wooden: gather stone (it gives cobblestone) and craft a Stone Pickaxe (3 cobblestone + 2 sticks).');}
  if(!tn&&!agKnownBlock(a,B.CRAFT,'myTable')&&pick<1&&wood>=4)out.push('No crafting table nearby: pickaxes, swords, furnaces and doors need one (4 planks).');
  const hg=a.hunger==null?20:a.hunger,hasFood=a.inv.some(s=>s&&DEFS[s.id].food);
  if(hg<16)out.push('Hunger '+hg+'/20: you only heal while it is 16 or more'+(hasFood?' - eat something (eat).':' and you have no food - hunt pigs, cows or sheep (cook the meat in a furnace for more).')+(hg<=3?' You are too hungry to sprint.':''));
  if((toNight||night)&&!base)out.push((night?'It is night':'Night falls in ~'+toNight+'s')+' and you have no shelter: dig into a hillside or build a quick 3x3 dirt hut (23 blocks from your inventory).');
  if(!a.home)out.push('You have no bed: if you die you respawn at world spawn with nothing (bed = 3 wool + 3 planks, wool from sheep; then sethome).');
  if(!hasFood&&hg>=16&&(a.hp<16||(night&&D.paranoia>0.5)))out.push('You have no food (hunt pigs or cows; smelt the raw meat to cook it).');
  const freeS=agFreeSlots(a);if(freeS<=4)out.push('Your inventory is nearly full ('+(a.inv.length-freeS)+'/'+a.inv.length+' slots) - store things in your chest (take gets them back) or use them.');
  if(a.outOf&&AG_T-a.outOf.t<180)out.push('You ran out of '+a.outOf.name+' during your last build - gather more before building again.');
  for(const s of agStructs()){
    if(s.owner===a.name)continue;
    const owner=s.owner;
    const op=owner==='Dan'?(P&&!P.dead?{x:P.x,z:P.z}:null):(agByName(owner)&&!agByName(owner).dead?{x:agByName(owner).x,z:agByName(owner).z}:null);
    const far=!op||Math.hypot(op.x-s.x,op.z-s.z)>60;
    const d=agDist(a,s.x,s.z);
    if(D.aggr>0.5&&far&&d<220)out.push(owner+"'s base ("+s.n+' blocks) is '+Math.round(d)+'m '+dir8(s.x-a.x,s.z-a.z)+' and '+owner+' is away from it.');
  }
  if(D.short==='brad'&&base){for(const o of [{n:'Dan',x:P?P.x:1e9,z:P?P.z:1e9}].concat(AGENTS.filter(q=>q!==a&&q.online&&!q.dead).map(q=>({n:q.name,x:q.x,z:q.z}))))
    if(Math.hypot(o.x-base.x,o.z-base.z)<28)out.push('INTRUDER: '+o.n+' is '+Math.round(Math.hypot(o.x-base.x,o.z-base.z))+'m from your base.');}
  if(D.short==='bee'&&e&&frameCount%2===0){
    const miss=[...FLOWER_IDS].filter(i=>!a.flowers.includes(i));
    if(miss.length){const c=agScanFor(a,miss,16,false);
      if(c)out.push('You can see a '+DEFS[c.id].name+' (new for your collection!) '+Math.round(Math.hypot(c.x-e.x,c.z-e.z))+'m '+dir8(c.x-e.x,c.z-e.z)+'.');
      else out.push('Your flower collection: '+a.flowers.length+'/'+FLOWER_IDS.size+'. Missing: '+miss.slice(0,5).map(i=>DEFS[i].name+' ('+FLOWER_HINT[i]+')').join(', '));}
  }
  for(const o of AGENTS){if(o===a)continue;const r=agRel(a,o.name);
    if(r.ally&&o.e&&!o.dead&&AG_T-o.lastHurtT<8&&o.lastHurtBy&&o.lastHurtBy!==a.name)out.push('Your ally '+o.name+' is being attacked by '+o.lastHurtBy+'!');}
  for(const who in a.rel){const r=a.rel[who];
    if((r.grief>0||r.stole>0||r.deaths>0)&&!r.ally&&D.short==='creep'&&r.host>=2)out.push('You still owe '+who+' payback.');}
  const hasSword=a.inv.some(s=>s&&DEFS[s.id].tool&&DEFS[s.id].tool.type==='sword');
  if(!hasSword&&D.aggr>0.5)out.push('You have no sword (wooden: 2 planks + 1 stick, stone: 2 cobblestone + 1 stick, iron: 2 ingots + 1 stick - at a crafting table).');
  if(D.short==='creep'&&agHas(a,B.TNT)===0)out.push('You have no TNT (TNT = 5 gunpowder + 4 sand; boomers drop gunpowder at night).');
  return out.slice(0,9);
}
function todStr(){const t=timeOfDay%1;
  if(t<0.02||t>0.98)return 'dawn';if(t<0.22)return 'morning';if(t<0.3)return 'midday';if(t<0.42)return 'afternoon';if(t<0.5)return 'dusk (night soon)';if(t<0.96)return 'NIGHT';return 'before dawn';}
function agDurStr(st){const d=DEFS[st.id],mx=d.tool?d.tool.dur:d.dur;return mx?' ('+(st.dur!=null?st.dur:mx)+'/'+mx+' durability)':'';}
function agInvStr(a){
  const m=new Map(),parts=[];
  for(const st of a.inv)if(st){const d=DEFS[st.id];
    if(d.tool||(d.dur&&stackMax(st.id)===1))parts.push(d.name+agDurStr(st));
    else m.set(st.id,(m.get(st.id)||0)+st.count);}
  for(const [id,n] of m)parts.unshift(DEFS[id].name+' x'+n);
  const ar=a.armor.filter(Boolean).map(st=>DEFS[st.id].name).join(', ');
  const used=a.inv.length-agFreeSlots(a);
  return (parts.length?parts.join(', '):'EMPTY - you carry nothing at all')+' ['+used+'/'+a.inv.length+' slots used]'+(ar?' | wearing: '+ar:'');
}
/* best tool level of a class: -1 none, 0 wood/gold, 1 stone, 2 iron, 3 diamond */
function agBestOfClass(a,cls){let best=null,bs=-1;
  for(const st of a.inv){if(!st)continue;const t=DEFS[st.id].tool;if(!t||t.type!==cls)continue;const sc=t.tier*100+t.mult;if(sc>bs){bs=sc;best=st;}}
  return best;}
function agToolLevel(a,cls){const t=agBestOfClass(a,cls);return t?DEFS[t.id].tool.tier:-1;}
function agWoodUnits(a){let n=agHas(a,IT.STICK)*0.5;for(const i of GROUPS.planks)n+=agHas(a,i);for(const i of GROUPS.logs)n+=agHas(a,i)*4;return n;}
/* dry-run a craft exactly as the craft skill would do it: '' if it works right now, else the shortfall */
function agCraftCheck(a,name,n){
  const id=agRecipeOut(name,a);if(id==null)return 'have no recipe for '+name;
  const r=agRecipeFor(id),big=agRecipeBig(r),nt=big&&!agTableNear(a)&&!agKnownBlock(a,B.CRAFT,'myTable');
  const sim=agCraftSim(a,id,n||1,{needTable:nt});
  return sim.err?agCraftShortfall(a,id,n||1,nt,sim.err):'';
}
function agToolsStr(a){
  const out=[];let any=false;
  for(const [cls,nm] of [['pick','pickaxe'],['axe','axe'],['shovel','shovel'],['sword','sword']]){
    const t=agBestOfClass(a,cls);if(t)any=true;out.push(nm+': '+(t?DEFS[t.id].name+agDurStr(t):'none'));}
  return any?out.join(' | '):'none - bare hands only (fine for wood, dirt, sand and gravel; stone and ores need a pickaxe)';
}
/* the useful things this agent could craft right now (auto planks/sticks/table included) */
function agCanCraftStr(a){
  if(a.dim==='puppet')return purgCanCraftStr(a);
  const tn=agTableNear(a),kt=!tn&&agKnownBlock(a,B.CRAFT,'myTable'),out=[];
  /* same judgement as the craft skill: a crafting table it can walk back to counts */
  const can=id=>{const r=agRecipeFor(id);if(!r)return null;const big=agRecipeBig(r);
    if(!big||tn)return agCraftSim(a,id,1,{}).err?null:'';
    if(kt&&!agCraftSim(a,id,1,{}).err)return ' (at your crafting table '+Math.round(agDist(a,kt.x+0.5,kt.z+0.5))+'m away)';
    return agCraftSim(a,id,1,{needTable:true}).err?null:' (needs crafting table)';};
  let lg=0;for(const i of GROUPS.logs)lg+=agHas(a,i);
  if(lg)out.push('Planks x'+lg*4+' (from your '+lg+' log'+(lg>1?'s':'')+')');
  if(agHas(a,IT.STICK)<2&&agWoodUnits(a)>=2)out.push('Sticks');
  for(let t=0;t<4;t++){const cur=agToolLevel(a,TOOLCLASS[t]);
    for(const m of [3,2,1,0]){if(m<=cur)break;const id=toolId(m,t),mk=can(id);if(mk!=null){out.push(DEFS[id].name+mk);break;}}}
  const fn=!!agFindNear(a,B.FURNACE,5);
  for(const k in SMELT){const id=+k;if(id===B.COBBLE||GROUPS.logs.includes(id))continue;
    const h=agHas(a,id);if(!h||agFuelSecs(a,id)<SMELT_TIME)continue;
    out.push(DEFS[SMELT[k]].name+' x'+h+' (smelt your '+DEFS[id].name+')'+(fn?'':' (needs furnace)'));}
  for(const id of [B.CRAFT,B.FURNACE,B.TORCH,B.BED,IT.BUCKET,B.CHEST,IT.DOOR,B.TNT,IT.BOW,B.WOOL]){
    if(id===B.CRAFT&&(tn||kt||agHas(a,B.CRAFT)))continue;
    if((id===B.FURNACE||id===B.CHEST||id===IT.BUCKET)&&agHas(a,id))continue;
    const mk=can(id);if(mk!=null)out.push(DEFS[id].name+mk);}
  let arm=0;
  for(const m of [2,0])for(let sl=0;sl<4&&arm<2;sl++){const cur=a.armor[sl];
    if(cur&&ARM_M[DEFS[cur.id].armor.m].pts>=ARM_M[m].pts)continue;
    const id=armorId(m,sl),mk=can(id);if(mk!=null){out.push(DEFS[id].name+mk);arm++;}}
  return out.length?out.slice(0,12).join(', '):'nothing yet - punch a tree (gather wood): 1 log = 4 planks';
}
function agWhoStr(a){
  const e=a.e,out=[];
  const list=[];
  if(P&&!P.dead&&DIM===a.dim)list.push({n:'Dan',x:P.x,y:P.y,z:P.z,hp:P.hp,held:heldStack(),mode:P.mode});
  for(const o of AGENTS)if(o!==a&&o.online)list.push({n:o.name,x:o.x,y:o.y,z:o.z,hp:o.hp,held:o.inv[o.sel],dead:o.dead});
  for(const p of list){
    const r=agRel(a,p.n),d=Math.hypot(p.x-e.x,p.z-e.z);
    let s=p.n+': ';
    if(p.dead)s+='dead (respawning)';
    else s+=Math.round(d)+'m '+dir8(p.x-e.x,p.z-e.z)+(Math.abs(p.y-e.y)>3?(p.y>e.y?' (above you)':' (below you)'):'')+
      (d<40?', hp '+Math.round(p.hp)+'/20'+(p.held?', holding '+DEFS[p.held.id].name:''):'')+
      (p.n==='Dan'&&p.mode==='c'?', in creative mode':'');
    s+=' | you feel: '+relMood(r)+' (trust '+Math.round(r.trust)+', like '+Math.round(r.aff)+')';
    const notes=[];
    if(r.hits)notes.push('hit you '+r.hits+'x');if(r.deaths)notes.push('killed you '+r.deaths+'x');if(r.kills)notes.push('you killed them '+r.kills+'x');
    if(r.grief)notes.push('broke '+r.grief+' of your blocks');if(r.stole)notes.push('robbed you');if(r.gifts)notes.push('gave you gifts '+r.gifts+'x');
    if(r.truceT>AG_T)notes.push('truce active');
    if(notes.length)s+=' ['+notes.join(', ')+']';
    out.push(s);
  }
  return out.join('\n');
}
function agNearStr(a){
  if(a.dim==='puppet')return purgNearStr(a);
  const e=a.e,cnt={},parts=[];
  for(const m of entities){if(m.t!=='mob'||m.dead||m.bot)continue;const d=Math.hypot(m.x-e.x,m.z-e.z);if(d>24)continue;
    const n=mobNameOf(m.mt)+(m.hostile?' (hostile)':'');cnt[n]=cnt[n]||{n:0,d:99,dx:0,dz:0};cnt[n].n++;if(d<cnt[n].d){cnt[n].d=d;cnt[n].dx=m.x-e.x;cnt[n].dz=m.z-e.z;}}
  for(const k in cnt)parts.push(cnt[k].n+'x '+k+' nearest '+Math.round(cnt[k].d)+'m '+dir8(cnt[k].dx,cnt[k].dz));
  let drops=0;for(const d of entities)if(d.t==='drop'&&!d.dead&&Math.hypot(d.x-e.x,d.z-e.z)<10)drops++;
  if(drops)parts.push(drops+' dropped item(s) on the ground nearby');
  const ci=colInfo(Math.floor(e.x),Math.floor(e.z));
  const feat=[];
  const tr=agScanFor(a,[B.LOG_O,B.LOG_B,B.LOG_S],10,true,null,true)||agScanFor(a,[B.LOG_O,B.LOG_B,B.LOG_S],32,true,-4,true);
  if(tr)feat.push('trees '+Math.round(Math.hypot(tr.x-e.x,tr.z-e.z))+'m '+dir8(tr.x-e.x,tr.z-e.z));else feat.push('no trees within 32m');
  const wa=agScanFor(a,[B.WATER],12,true);if(wa)feat.push('water '+Math.round(Math.hypot(wa.x-e.x,wa.z-e.z))+'m '+dir8(wa.x-e.x,wa.z-e.z));
  const lv=agScanFor(a,[B.LAVA],10,true);if(lv)feat.push('LAVA '+Math.round(Math.hypot(lv.x-e.x,lv.z-e.z))+'m '+dir8(lv.x-e.x,lv.z-e.z));
  const ore=agScanFor(a,[B.IRON_ORE,B.COAL_ORE,B.GOLD_ORE,B.DIA_ORE],8,true);if(ore)feat.push(DEFS[ore.id].name+' visible '+Math.round(Math.hypot(ore.x-e.x,ore.z-e.z))+'m');
  let ch=0;for(const [k,be] of blockEnts){if(be.t!=='chest'||keyDim(k)!==DIM)continue;const p=keyCore(k).split(',');if(Math.hypot(+p[0]-e.x,+p[2]-e.z)<20)ch++;}
  if(ch)feat.push(ch+' chest(s) within 20m');
  return 'Biome: '+BIOME_NAME[ci.b]+'. '+(feat.length?'Terrain: '+feat.join(', ')+'. ':'')+(parts.length?'Around you: '+parts.join('; ')+'.':'No mobs near.');
}
function agPlacesStr(a){
  const out=[];
  for(const s of agStructs().slice(0,8)){
    const d=agDist(a,s.x,s.z);
    out.push(s.name+' ('+s.n+' blocks) at '+s.x+','+s.z+': '+Math.round(d)+'m '+dir8(s.x-a.x,s.z-a.z));
  }
  if(a.home)out.push('Your bed/home at '+Math.round(a.home[0])+','+Math.round(a.home[2]));
  const ld=a.lastDeath;
  if(ld&&ld.items&&AG_T-ld.t<300)out.push('Your dropped stuff (you died '+agAgo(ld.t)+' ago; it vanishes 5 minutes after) at '+ld.x+','+ld.z+': '+Math.round(agDist(a,ld.x,ld.z))+'m '+dir8(ld.x-a.x,ld.z-a.z));
  if(a.dim==='puppet'){out.push(purgPlacesStr(a));return out.join('\n');}
  const w=worldSpawn();out.push('World spawn at '+Math.round(w[0])+','+Math.round(w[2])+': '+Math.round(agDist(a,w[0],w[2]))+'m');
  return out.join('\n');
}
function agObs(a,why){
  const e=a.e;
  const L=[];
  L.push('[WHY YOU ARE DECIDING NOW] '+(why&&why.length?why.join('; '):'checking in'));
  L.push('[TIME] Day '+(Math.floor(timeOfDay)+1)+', '+todStr()+'.');
  if(a.dim==='puppet')L.push(purgObs(a));
  L.push('[YOU] '+a.name+' | HP '+Math.round(a.hp)+'/20 | Hunger '+(a.hunger==null?20:a.hunger)+'/20 | at '+Math.round(e.x)+','+Math.round(e.y)+','+Math.round(e.z)+
    ' | mood '+(a.mood>70?'great':a.mood>45?'ok':a.mood>25?'annoyed':'furious'));
  L.push('[INVENTORY] '+agInvStr(a));
  L.push('[TOOLS] '+agToolsStr(a));
  L.push('[CAN CRAFT NOW] '+agCanCraftStr(a));
  if(AG_DEF[a.name].short==='bee')L.push('[FLOWER COLLECTION] '+(a.flowers.length?a.flowers.map(i=>DEFS[i].name).join(', '):'none yet')+' ('+a.flowers.length+'/'+FLOWER_IDS.size+')');
  if(a.proj){const p=a.proj;L.push('[YOUR CURRENT PROJECT] "'+p.title+'" ('+p.kind+') - '+p.why+'\n  steps: '+p.steps.map((s,i)=>(i===p.step?'>> ':'   ')+(i+1)+'. '+s).join('\n  ')+
    '\n  started '+Math.round((AG_T-p.t0)/60)+' min ago.');}
  else L.push('[YOUR CURRENT PROJECT] none - pick something to do.');
  const cur=a.sk?a.sk.k+(a.sk.a.target?' '+a.sk.a.target:'')+(a.sk.a.note?' ("'+(''+a.sk.a.note).slice(0,60)+'")':'')+' - running for '+Math.round(a.sk.t)+'s':(a.rx?a.rx.k+' (reflex)':'nothing');
  L.push('[DOING RIGHT NOW] '+cur+(a.q.length?' | queued: '+a.q.map(s=>s.k).join(', '):''));
  if(a.bjob)L.push('[BUILD JOB] '+a.bjob.goal.slice(0,90)+' - '+a.bjob.placed+' placed, '+a.bjob.removed+' removed, '+a.bjob.ops.length+' left in this batch');
  L.push('[PLAYERS ON THE SERVER]\n'+agWhoStr(a));
  L.push('[NEARBY] '+agNearStr(a));
  L.push('[PLACES YOU KNOW]\n'+agPlacesStr(a));
  const ev=a.ev.filter(v=>!/^\(note to self\)/.test(v.txt)).slice(-8).reverse().map(v=>'  '+agAgo(v.t)+' ago: '+v.txt);
  if(ev.length)L.push('[RECENT EVENTS] (newest first)\n'+ev.join('\n'));
  if(a.selfNotes&&a.selfNotes.length)L.push('[YOUR NOTES TO SELF] (newest last)\n'+a.selfNotes.map(n=>'  '+agAgo(n.t)+' ago: '+n.txt).join('\n'));
  const memU=[...new Set(a.mem.filter(m=>!/^You died \(/.test(m.txt)).slice(-8).map(m=>m.txt))];
  if(memU.length)L.push('[THINGS YOU WILL NEVER FORGET]\n'+memU.map(t=>'  - '+t).join('\n'));
  const ch=CHAT.filter(m=>(m.k==='chat'&&!(m.to&&m.k==='whisper'))||m.k==='death'||m.k==='sys').slice(-8);
  const heard=a.heard.slice(-10).map(h=>h.self?'  '+agAgo(h.t)+' ago <you>'+(h.to?(h.wh?' (whispered to '+h.to+')':' (to '+h.to+')'):'')+' '+h.txt:
    '  '+agAgo(h.t)+' ago <'+h.from+'>'+(h.wh?' (whispered to you)':h.to?' (to you)':'')+' '+h.txt);
  for(const m of a.typing)heard.push('  now <you> (still typing)'+(m.to?' (to '+m.to+')':'')+' '+m.t);
  if(heard.length)L.push('[CHAT] (oldest first; <you> = your own lines - never repeat or rephrase them)\n'+heard.join('\n'));
  const sysl=ch.filter(m=>m.k!=='chat').slice(-4).map(m=>'  * '+m.txt);
  if(sysl.length)L.push('[SERVER MESSAGES]\n'+sysl.join('\n'));
  if(a.pend&&AG_T-a.pend.t<120)L.push('[GUT FEELING about '+a.pend.from+"'s "+a.pend.type+' request] '+agGut(a,a.pend.from,a.pend.type)+'. You can go against your gut if you have a reason.');
  const it=agItches(a);
  if(it.length)L.push('[OPPORTUNITIES / PRESSURES] (options, not orders)\n'+it.map(s=>'  - '+s).join('\n'));
  if(a.notes.length)L.push('[NOTES]\n'+a.notes.slice(-5).map(s=>'  - '+s).join('\n'));
  if(a.projHist.length)L.push('[PROJECTS YOU HAVE DONE] '+a.projHist.slice(-6).map(p=>p.title+' ('+p.kind+', '+p.out+')').join('; '));
  return L.join('\n');
}
function agAgo(t){const s=Math.max(0,Math.round(AG_T-t));return s<90?s+'s':Math.round(s/60)+'m';}

/* ----- the brain link: local server holds the key, page only sends JSON ----- */
const BRAIN={ok:false,url:'http://127.0.0.1:8644',tok:null,mock:null,lat:0,err:'',needPair:false,
  lastHealth:-99,calls:0,spent:0,fails:0,off:false,ver:null};
function brainInit(){
  try{
    if(typeof window!=='undefined'&&window.__DINGLE_BRAIN){BRAIN.url=window.__DINGLE_BRAIN.url||'';BRAIN.tok=window.__DINGLE_BRAIN.token;}
    else if(typeof localStorage!=='undefined'){const t=localStorage.getItem('vx_brainTok');if(t)BRAIN.tok=t;}
  }catch(e){}
}
function brainFetch(path,opt,ms){
  if(typeof fetch!=='function')return Promise.reject(new Error('no fetch'));
  const ac=typeof AbortController!=='undefined'?new AbortController():null;
  const tm=setTimeout(()=>{try{ac&&ac.abort();}catch(e){}},ms||20000);
  return fetch(BRAIN.url+path,Object.assign({signal:ac?ac.signal:undefined},opt||{})).finally(()=>clearTimeout(tm));
}
async function brainHealth(){
  if(BRAIN.mock){BRAIN.ok=!BRAIN.off;return;}
  if(BRAIN.healthBusy)return;
  BRAIN.healthBusy=true;
  try{
    const r=await brainFetch('/health',{headers:BRAIN.tok?{'X-Dingle-Token':BRAIN.tok}:{}},3000);
    const j=await r.json();
    BRAIN.ver=j.version||null;BRAIN.found=!!j.ok;
    const was=BRAIN.ok;
    BRAIN.needPair=!!j.ok&&!j.authed;
    BRAIN.ok=!!j.ok&&!!j.authed&&!!j.key&&!BRAIN.off;
    BRAIN.noKey=!!j.ok&&!j.key;
    BRAIN.err=j.key?'':'the server has no ANTHROPIC_API_KEY';
    BRAIN.back=5;
    if(BRAIN.ok&&!was){sysMsg('[AI] Brain server connected - the players are thinking for themselves.');BRAIN.fails=0;BRAIN.told=true;}
    if(BRAIN.needPair&&!BRAIN.toldPair){BRAIN.toldPair=true;
      sysMsg('[AI] Brain server found! Type /pair <code> (the code is shown in the server window) to connect.');}
  }catch(e){
    if(BRAIN.ok){sysMsg('[AI] Lost the brain server - players are on autopilot until it is back.');BRAIN.told=true;}
    /* gone: whatever it said before (needs /pair, no key) no longer applies */
    if(BRAIN.needPair){BRAIN.needPair=false;BRAIN.toldPair=false;}
    BRAIN.noKey=false;
    BRAIN.ok=false;BRAIN.found=false;BRAIN.back=Math.min(60,(BRAIN.back||5)*1.7);
  }finally{BRAIN.healthBusy=false;BRAIN.checked=true;agBrainNotice();}
}
/* "they aren't replying": say so, once, clearly - the players can't chat without the brain */
function agOnlineNames(){const L=AGENTS.filter(a=>a.online).map(a=>a.name);return L.length>1?L.slice(0,-1).join(', ')+' and '+L[L.length-1]:L.join('');}
function agBrainNotice(){
  if(BRAIN.ok||BRAIN.mock||BRAIN.off||BRAIN.told||!AG_ACTIVE||!AGENTS.some(a=>a.online))return;
  if(BRAIN.needPair)return;                 /* the /pair line already explains it */
  if(AG_T-(BRAIN.joinT||0)<2.5)return;      /* let the "joined the game" lines come first */
  BRAIN.told=true;BRAIN.nudgeT=AG_T;
  if(BRAIN.found&&BRAIN.noKey)sysMsg('[AI] The brain server is running but '+BRAIN.err+', so '+agOnlineNames()+' are on autopilot and can\u2019t chat. Add the key to the server\u2019s .env and restart it.');
  else sysMsg('[AI] The AI brain isn\u2019t running, so '+agOnlineNames()+' are on autopilot and can\u2019t chat. Double-click "Start AI Brain.command" in the game folder (or run npm run brain:launch) - it opens the game for you.');
}
/* Dan talks while nobody can answer: a short reminder, at most every 45 s */
function agBrainNudge(){
  if(BRAIN.ok||BRAIN.mock||!AG_ACTIVE||!AGENTS.some(a=>a.online))return false;
  if(BRAIN.nudgeT!=null&&AG_T-BRAIN.nudgeT<45)return false;
  BRAIN.nudgeT=AG_T;
  sysMsg(BRAIN.off?'[AI] (AI brains are switched off - the players are on autopilot and can\u2019t chat. /brain on reconnects.)':
    BRAIN.needPair?'[AI] (The players can\u2019t chat until you /pair with the brain server - the code is in its window.)':
    BRAIN.found&&BRAIN.noKey?'[AI] (The brain server is running but has no ANTHROPIC_API_KEY - add it to the server\u2019s .env and restart it. Until then the players are on autopilot and can\u2019t chat.)':
    '[AI] (The AI brain isn\u2019t running - the players are on autopilot and can\u2019t chat. Double-click "Start AI Brain.command".)');
  return true;
}
async function brainCall(lane,a,payload){
  const ep=AG_EPOCH;
  if(BRAIN.mock){
    try{const o=await Promise.resolve(BRAIN.mock(lane,a.name,payload));
      if(ep!==AG_EPOCH)return {ok:false,stale:true};return o?{ok:true,out:o}:{ok:false};}catch(e){return {ok:false};}
  }
  if(!BRAIN.ok)return {ok:false};
  const t0=performance.now();
  BRAIN.calls++;
  try{
    const r=await brainFetch('/turn',{method:'POST',headers:{'Content-Type':'application/json','X-Dingle-Token':BRAIN.tok},
      body:JSON.stringify({lane,bot:a.name,payload:PNAME!=='Dan'?Object.assign({},payload,{player:PNAME}):payload})},lane==='act'?30000:60000);
    let j=await r.json();
    if(j&&j.out&&PNAME!=='Dan')j=Object.assign({},j,{out:pnBack(j.out)});   /* the player's chosen name -> the internal 'Dan' */
    const ms=performance.now()-t0;
    BRAIN.lat=BRAIN.lat?BRAIN.lat*0.7+ms*0.3:ms;
    if(typeof j.spent==='number')BRAIN.spent=j.spent;
    if(r.status===401||r.status===403){BRAIN.ok=false;BRAIN.tok=null;BRAIN.needPair=true;BRAIN.toldPair=false;}
    if(!j.ok){BRAIN.err=j.error||'error';BRAIN.fails++;if(j.paused)sysMsg('[AI] '+(j.error||'Brain paused'));}
    else BRAIN.fails=0;
    if(ep!==AG_EPOCH)return {ok:false,stale:true};
    return j;
  }catch(e){
    BRAIN.fails++;BRAIN.err='no reply';
    if(BRAIN.fails>=4){BRAIN.ok=false;}
    return {ok:false};
  }
}
async function brainPair(code){
  try{
    const r=await brainFetch('/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:(''+code).trim()})},5000);
    const j=await r.json();
    if(j.ok&&j.token){BRAIN.tok=j.token;try{localStorage.setItem('vx_brainTok',j.token);}catch(e){}
      sysMsg('[AI] Paired with the brain server.');BRAIN.needPair=false;brainHealth();}
    else sysMsg('[AI] Pairing failed: '+(j.error||'wrong code'));
  }catch(e){sysMsg('[AI] Could not reach the brain server on '+BRAIN.url);}
}

/* ----- scheduling: when each agent thinks ----- */
const AG_LONG=new Set(['build','grief','goto','explore','gather','hunt','follow','guard','hide','steal','store','take','smelt']);
const AG_URGENT=/^Dan |hit by|died|respawned|declared war|idle|finished|failed|griefed|stole|new project|joined|retry|war/;
function agMindTick(a,dt){
  if(!a.bs)a.bs={why:['you just joined the server'],need:true};
  const bs=a.bs;
  if(!a.e||a.dead)return;
  /* first seconds of a session: wait for the brain's answer instead of starting an autopilot house */
  if(!BRAIN.ok&&!BRAIN.mock&&!BRAIN.off&&!BRAIN.checked){a.ctl.mx=a.ctl.mz=0;return;}
  if(!BRAIN.ok&&!BRAIN.mock){offTick(a,dt);return;}
  if(!a.proj&&!bs.mindFly&&AG_T-(bs.lastMind||-99)>25)agMindRequest(a,'you have no project');
  else if(bs.mindForce&&!bs.mindFly&&AG_T-(bs.lastMind||-99)>(/war|killed by/.test(bs.mindForce)?45:120)){agMindRequest(a,bs.mindForce);bs.mindForce=null;}
  if(!bs.nextHeart)bs.nextHeart=AG_T+6+Math.random()*6;
  if(AG_T>bs.nextHeart){bs.nextHeart=AG_T+(a.sk&&AG_LONG.has(a.sk.k)?60:35)+Math.random()*20;agNeedTurn(a,'regular check-in');}
  if(!a.sk&&!a.q.length&&!a.rx&&!bs.actFly){bs.idleT=(bs.idleT||0)+dt;if(bs.idleT>1.2)agNeedTurn(a,'idle - nothing queued');}else bs.idleT=0;
  const gap=bs.chatFast?0.6:bs.why.some(w=>AG_URGENT.test(w))?2:bs.why.some(w=>/talked to you|whispered|after a /.test(w))?5:15;
  if(bs.need&&!bs.actFly&&AG_T-(bs.lastAct||-99)>gap)agActRequest(a);
}
const AG_LANES_OUT={};
function agActRequest(a){
  const bs=a.bs;
  bs.need=false;bs.actFly=true;bs.lastAct=AG_T;bs.chatFast=false;
  const why=bs.why.slice();bs.why=[];
  const obs=agObs(a,why);
  const pend=a.pend;
  brainCall('act',a,{obs,skills:AG_SKILLS,...(a.dim==='puppet'?{guide:purgGuide(a)}:{})}).then(res=>{
    bs.actFly=false;
    if(!res||!res.ok||!res.out){if(!res||!res.stale){bs.failN=(bs.failN||0)+1;if(bs.failN<3)agNeedTurn(a,'retry');}return;}
    bs.failN=0;
    if(!a.online||a.dead)return;
    agApplyAct(a,res.out,pend);
    /* whatever piled up while we waited that the new plan already answers */
    if(a.sk||a.q.length){bs.why=bs.why.filter(w=>!/^idle|regular check-in|^after a /.test(w));if(!bs.why.length)bs.need=false;}
  });
}
function agMindRequest(a,why){
  const bs=a.bs;
  bs.mindFly=true;bs.lastMind=AG_T;
  const obs=agObs(a,[why]);
  brainCall('mind',a,{obs,why,...(a.dim==='puppet'?{guide:purgGuide(a)}:{})}).then(res=>{
    bs.mindFly=false;
    if(!res||!res.ok||!res.out||!a.online)return;
    agApplyMind(a,res.out);
  });
}
function agApplyMind(a,o){
  const p=o.project||o;
  if(!p||!p.title)return;
  if(a.proj&&a.proj.title!==p.title)a.projHist.push({title:a.proj.title,kind:a.proj.kind,out:'switched'});
  a.proj={title:(''+p.title).slice(0,70),kind:(''+(p.kind||'misc')).slice(0,20),why:(''+(p.why||'')).slice(0,200),
    steps:(p.steps||[]).slice(0,7).map(s=>(''+s).slice(0,140)),step:0,where:p.where||null,t0:AG_T};
  if(!a.proj.steps.length)a.proj.steps=['do it'];
  if(a.projHist.length>12)a.projHist.splice(0,a.projHist.length-12);
  agThink(a,'[new project] '+a.proj.title+' - '+a.proj.why);
  if(o.announce&&(''+o.announce).trim())agSay(a,o.announce,null,false,false);
  agNeedTurn(a,'you just decided on a new project: '+a.proj.title);
}
function agApplyAct(a,o,pend){
  if(o.thought)agThink(a,o.thought);
  const acts=Array.isArray(o.actions)?o.actions.slice(0,4):[];
  const said=Array.isArray(o.say)?o.say.slice(0,2):[];
  let addressed=pend&&AG_T-pend.t<120;
  for(const r of (Array.isArray(o.relations)?o.relations.slice(0,3):[]))agRelApply(a,r);
  if(o.project==='step_done'&&a.proj){a.proj.step++;if(a.proj.step>=a.proj.steps.length)o.project='done';}
  if(o.project==='done'&&a.proj){a.projHist.push({title:a.proj.title,kind:a.proj.kind,out:'done'});agEvent(a,'You finished your project "'+a.proj.title+'"',6);a.proj=null;a.mood=Math.min(100,a.mood+10);}
  else if(o.project==='abandon'&&a.proj&&(AG_T-a.proj.t0>240||a.bs.mindForce)){a.projHist.push({title:a.proj.title,kind:a.proj.kind,out:'abandoned'});a.proj=null;}
  if(o.remember&&(''+o.remember).trim()){
    /* notes to self: keep the latest few, never let them crowd out real memories */
    a.selfNotes=(a.selfNotes||[]).concat([{t:AG_T,txt:(''+o.remember).slice(0,200)}]).slice(-4);
    agEvent(a,'(note to self) '+o.remember,4);
  }
  const valid=[];
  for(const x of acts){
    const k=(''+(x.skill||'')).toLowerCase();
    if(!SK[k])continue;
    valid.push({k,a:{target:x.target!=null?''+x.target:null,item:x.item!=null?''+x.item:null,count:x.count!=null?+x.count:null,note:x.note!=null?''+x.note:null}});
  }
  if(valid.length){
    const v0=valid[0];
    const bj=a.bjob;
    const same=a.sk&&a.sk.k===v0.k&&(a.sk.a.target||'').toLowerCase()===(v0.a.target||'').toLowerCase()&&
      ((v0.k!=='build'&&v0.k!=='grief')||!bj||!(bj.done||bj.wantDone));
    if(same){a.q=valid.slice(1).map(v=>({...v,t:0,st:{}}));}
    else{
      if(a.sk&&(a.sk.k==='build'||a.sk.k==='grief')&&a.bjob)a.bjob=null;
      a.sk=null;a.path=null;a.pf=null;
      a.q=valid.map(v=>({...v,t:0,st:{}}));
    }
  }
  for(const s of said){
    const to=s.to&&(''+s.to).toLowerCase()!=='everyone'?''+s.to:null;
    agSay(a,s.text||'',to,!!s.whisper&&!!to,!!addressed||!!to);
  }
  if(addressed&&(acts.length||said.length))a.pend=null;
  a.notes=[];
}
function agRelApply(a,r){
  if(!r||!r.player)return;
  const who=(''+r.player).toLowerCase()==='dan'?'Dan':(agByName(r.player)||{}).name;
  if(!who||who===a.name)return;
  const c=(''+(r.change||'')).toLowerCase(),rr=agRel(a,who);
  if(c==='warmer')relShift(a,who,6,4,rr.host>0?-1:0);
  else if(c==='colder')relShift(a,who,-8,-5,0);
  else if(c==='ally'){if(!rr.war||rr.truceT>AG_T){rr.ally=true;rr.war=false;rr.host=0;relShift(a,who,15,10,0);agEvent(a,'You teamed up with '+who,8,who);
    const o=agByName(who);if(o){const ro=agRel(o,a.name);if(ro.ally)agEvent(o,a.name+' is now your ally',6,a.name);}}}
  else if(c==='enemy'){rr.ally=false;relShift(a,who,-20,-15,1);}
  else if(c==='war'){rr.war=true;rr.ally=false;rr.host=Math.max(rr.host,4);agEvent(a,'You declared war on '+who,8,who);agMindForce(a,'at war with '+who);
    const o=agByName(who);if(o){agEvent(o,a.name+' declared war on you',8,a.name);agNeedTurn(o,a.name+' declared war');}}
  else if(c==='truce'){rr.war=false;rr.host=Math.min(rr.host,1);rr.truceT=AG_T+600;agEvent(a,'You agreed a truce with '+who,7,who);}
  else if(c==='break_alliance'||c==='betray'){rr.ally=false;agEvent(a,'You broke your alliance with '+who,8,who);}
  if(r.why)agThink(a,'[feelings] '+who+': '+c+' - '+(''+r.why).slice(0,100));
}
/* ----- talking: typing delay, casing, typos ----- */
const ASSIST_RX=/\b(certainly|i'd be happy to|as an ai|let me know if|feel free to|happy to help|how can i (help|assist)|is there anything else)\b/ig;
function agStyle(a,txt){
  const D=AG_DEF[a.name];
  let t=(''+txt).replace(ASSIST_RX,'').replace(/\s+/g,' ').trim();
  if(!t)return '';
  if(D.short==='creep'){t=t.toLowerCase().replace(/[.,!;:]+(\s|$)/g,'$1').replace(/\?{2,}/g,'?');}
  if(D.short==='brad'){t=t.replace(/^[A-Z](?![A-Z])/,c=>c.toLowerCase());}
  if(t.length>130)t=t.slice(0,127).replace(/\s\S*$/,'')+'...';
  if(Math.random()<D.typo&&t.length>6){const i=1+((Math.random()*(t.length-2))|0);
    if(/[a-z]/i.test(t[i])&&/[a-z]/i.test(t[i+1]||''))t=t.slice(0,i)+t[i+1]+t[i]+t.slice(i+2);}
  return t;
}
function agWords(t){return new Set((''+t).toLowerCase().replace(/[^a-z0-9' ]+/g,' ').split(' ').filter(x=>x.length>1));}
function agSim(A,B){if(!A.size||!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return n/Math.min(A.size,B.size)*(Math.min(A.size,B.size)>=3?1:0.6);}
function agSay(a,txt,to,whisper,reply){
  const t=agStyle(a,txt);
  if(!t)return;
  /* no parroting: drop lines too close to something this player said in the last 5 minutes */
  const w=agWords(t);
  a.said=(a.said||[]).filter(x=>AG_T-x.t<300);
  if(a.said.some(x=>agSim(w,x.w)>=0.45))return;
  const toDan=to&&to.toLowerCase()==='dan';
  if(!toDan){
    if(!reply){a.lastFree=a.lastFree||-99;if(AG_T-a.lastFree<25)return;a.lastFree=AG_T;}
    else{a.lastRep=a.lastRep||-99;if(AG_T-a.lastRep<8)return;a.lastRep=AG_T;}
  }
  a.said.push({t:AG_T,w});if(a.said.length>10)a.said.shift();
  const D=AG_DEF[a.name];
  const delay=0.6+Math.random()*1.1+Math.min(7,t.length/D.cps);
  a.typing.push({t,to,whisper,due:AG_T+delay});
}
function agTypingTick(a,dt){
  a.typingT=0;
  if(!a.typing.length)return;
  const m=a.typing[0];
  if(AG_T>=m.due){a.typing.shift();
    if(m.whisper&&m.to){
      if(m.to.toLowerCase()==='dan'){chatPush({k:'whisper',from:a.name,txt:m.t,to:'Dan'});_lastWhisperFrom=a.name;}
      agHear(a.name,m.t,m.to,true);
    }else chatLine(a.name,m.t,m.to,false);
    agThink(a,'[said'+(m.to?' to '+m.to:'')+'] '+m.t);
    a.heard.push({t:AG_T,from:a.name,self:true,txt:m.t,to:m.to,wh:!!m.whisper});if(a.heard.length>14)a.heard.splice(0,a.heard.length-14);
  }else a.typingT=m.due-AG_T;
  if(a.typingT>0&&a.e&&!a.rx){const p=a.heard.length?agTargetPos(a,a.heard[a.heard.length-1].from):null;if(p)a.look={x:p.x,y:p.y+1.5,z:p.z,t:AG_T+0.3};}
}

/* ----- autopilot when there is no brain ----- */
function offTick(a,dt){
  const bs=a.bs,D=AG_DEF[a.name];
  /* talked to while the brain is away: no words (they can't chat without it), just a look and a wave */
  if(bs.need&&bs.why.some(w=>/talked|whispered/.test(w))&&AG_T-(bs.lastOffSay||-99)>6){
    bs.lastOffSay=AG_T;
    const h=a.heard.slice().reverse().find(x=>!x.self&&(x.to===a.name||x.wh));
    const p=h?agTargetPos(a,h.from):null;
    if(p&&a.e&&!a.rx)a.look={x:p.x,y:p.y+1.5,z:p.z,t:AG_T+1.8};
    a.swing=1;
  }
  bs.need=false;bs.why=[];
  if(a.sk||a.q.length||a.rx)return;
  bs.offT=(bs.offT||0)-dt;
  if(bs.offT>0){a.ctl.mx=a.ctl.mz=0;return;}
  bs.offT=1+Math.random()*2;
  const q=offPlan(a);
  if(q&&q.length)a.q=q.map(x=>({k:x[0],a:x[1]||{},t:0,st:{}}));
}
/* the autopilot plays the same survival game: wood -> wooden pickaxe -> stone -> stone tools ->
   a shelter from what it carries -> then its own personality */
function offPlan(a){
  if(a.dim==='puppet')return purgOffPlan(a);
  const D=AG_DEF[a.name],sh=D.short,night=!sunUp(),r=Math.random();
  const hasBase=!!(a.home||mainBase(a.name));
  const pick=agToolLevel(a,'pick'),cob=agHas(a,B.COBBLE);
  const f=a.offFail&&AG_T-a.offFail.t<60?a.offFail:null;a.offFail=null;
  const hg=a.hunger==null?20:a.hunger,food=a.inv.some(s=>s&&DEFS[s.id].food);
  if(f&&/no food around/.test(f.why))a.noFoodT=AG_T;
  if(f){
    a.offFails=(a.offFails||0)+1;
    /* a craft that was short of something: go and get exactly that (never craft-fail-explore forever) */
    const ml=f.why.match(/need (\d+) more logs?\b/);
    if(ml){a.offFails=0;return [['gather',{item:'wood',count:Math.min(16,+ml[1]+1)}]];}
    const mc=f.why.match(/need (\d+) more Cobblestone\b/);
    if(mc&&pick>=0){a.offFails=0;return [['gather',{item:'stone',count:Math.min(32,+mc[1]+2)}]];}
    /* nothing of that around (or stuck): move on to new land - keep one heading for a while, like a player */
    if(/mobs kept chasing/.test(f.why)&&(a.home||mainBase(a.name))){a.offFails=0;return [['hide',{secs:30}]];}
    if(/nearby|around|could not|no path|stuck|took too long|no way|chasing/.test(f.why)||a.offFails>2){a.offFails=0;
      if(a.offDir==null||(a.offDirN=(a.offDirN||0)+1)>3){a.offDir=Math.random()*6.283;a.offDirN=0;}
      const dist=40+Math.random()*40;
      return [['explore',{target:Math.round(a.x+Math.sin(a.offDir)*dist)+','+Math.round(a.z+Math.cos(a.offDir)*dist)}]];}
  }else a.offFails=0;
  /* Dan's hunger rules apply: eat when hungry, hunt when there is nothing to eat */
  if(food&&(hg<=14||(a.hp<14&&hg<20)))return [['eat']];
  if(!food&&hg<=13&&(!night||hg<=6)&&!(AG_T-(a.noFoodT||-99)<60))return [['hunt',{target:'food',count:2}]];
  /* a quick craft at a table right here is worth it even at night (it takes a second, not a walk) */
  if(night&&pick<1&&cob>=3&&agTableNear(a)&&!agCraftCheck(a,'Stone Pickaxe'))return [['craft',{item:'Stone Pickaxe'}]];
  if(night&&hasBase&&sh!=='creep')return [['hide',{secs:30}]];
  /* died with stuff on you: go back for it while it is still there - in daylight, and not into the mob that killed you */
  const ld=a.lastDeath;
  if(ld&&ld.items&&!ld.went&&!night&&AG_T-ld.t<240&&agDist(a,ld.x,ld.z)<120&&
     !entities.some(m=>m.t==='mob'&&!m.dead&&!m.bot&&m.hostile&&Math.hypot(m.x-ld.x,m.z-ld.z)<12)){
    ld.went=true;return [['goto',{target:ld.x+','+ld.z,r:1}],['wait',{count:2}]];}
  if(night&&sh==='creep'&&agToolLevel(a,'sword')>=0&&r<0.5)return [['hunt',{target:'boomer',count:1}]];
  /* night (or nearly) and nowhere to sleep: a quick 3x3 hut from whatever you carry beats more tools */
  const tod=timeOfDay%1,dark=night||(tod>0.4&&tod<0.5);
  if(dark&&!hasBase&&pick>=0){
    const mats=bjWallMats(a,null).tot,need=bjShelterCost(AG_SHELTERS[2]);
    if(mats>=need)return [['build',{target:'here',note:'emergency hut for the night'}]];
    return [['gather',{item:'dirt',count:Math.min(64,need-mats+2)}]];
  }
  if(pick<0)return offCraft(a,'Wooden Pickaxe');
  if(pick<1){
    if(cob<3)return [['gather',{item:'stone',count:6}]];
    return offCraft(a,'Stone Pickaxe');
  }
  if(sh!=='bee'&&agToolLevel(a,'sword')<1)return cob>=2?offCraft(a,'Stone Sword'):[['gather',{item:'stone',count:4}]];
  if(!hasBase){
    const mats=bjWallMats(a,null).tot,need=bjShelterCost(AG_SHELTERS[sh==='creep'?2:1]);
    if(mats<need){
      let lg=0;for(const i of GROUPS.logs)lg+=agHas(a,i);
      if(sh==='bee'&&lg>=2)return [['craft',{item:'planks',count:lg*4}]];
      return [['gather',{item:sh==='bee'?'wood':sh==='creep'?'dirt':'stone',count:Math.min(64,sh==='bee'?Math.ceil((need-mats)/4)+1:need-mats+2)}]];
    }
    return [['build',{target:'here',note:sh==='brad'?'bunker':sh==='bee'?'cottage':'dirt hut'}]];
  }
  if(!a.home&&agHas(a,B.BED)>0)return [['goto',{target:'home'}],['sethome']];
  if(!a.home&&sh!=='bee'&&r<0.25){const w=agHas(a,B.WOOL);
    return w>=3?offCraft(a,'Bed'):[['hunt',{target:'wool',count:3-w}]];}
  if(sh==='brad'){
    if(!sunUp())return [['hide',{secs:30}]];
    return [[r<0.6?'wander':'guard',{target:'home',r:12,secs:30}]];
  }
  if(sh==='creep'){
    const tg=agStructs().find(q=>q.owner!==a.name);
    if(tg&&r<0.25&&GR.botGrief)return [['grief',{target:tg.owner}]];
    if(r<0.55)return [['explore',{dist:60}]];
    return [['wander',{r:14}]];
  }
  if(r<0.45)return [['gather',{item:'flowers',count:3}]];
  if(r<0.7&&P&&!P.dead&&agDist(a,P.x,P.z)<60)return [['follow',{target:'Dan',secs:20}]];
  return [['wander',{r:12}]];
}
/* craft it if the dry run says it works; otherwise go and get what is missing (wood, then cobblestone) */
function offCraft(a,item,n){
  const er=agCraftCheck(a,item,n);
  if(!er)return [['craft',{item,count:n||1}]];
  const ml=er.match(/need (\d+) more logs?\b/);
  if(ml)return [['gather',{item:'wood',count:Math.min(16,+ml[1]+1)}]];
  const mc=er.match(/need (\d+) more Cobblestone\b/);
  if(mc&&agToolLevel(a,'pick')>=0)return [['gather',{item:'stone',count:Math.min(32,+mc[1]+2)}]];
  if(/more Wool/.test(er))return [['hunt',{target:'wool',count:3}]];
  return [['gather',{item:'wood',count:3}]];
}

/* ----- the per-frame driver ----- */
const SK_MAX={store:60,take:60,goto:120,follow:120,explore:200,wander:40,wait:65,emote:5,lookat:5,gather:300,hunt:120,build:900,grief:400,
  tnt:90,steal:90,give:60,eat:15,sethome:15,craft:60,smelt:720,fill:90,equip:2,attack:60,flee:12,guard:200,hide:120};
function agSkillTick(a,dt){
  /* one-frame controls: whatever runs this frame sets them again (a stale jump made bots hop while mining) */
  a.ctl.jump=false;a.ctl.up=false;a.ctl.sneak=false;a.ctl.sprint=false;
  if(a.rx){
    const s=a.rx;s.t+=dt;
    let r;try{r=SK[s.k]?SK[s.k](a,dt,s):'done';}catch(err){r='fail:'+(err&&err.message||'error');}
    if(r!=='run'||s.t>(SK_MAX[s.k]||30)){a.rx=null;a.path=null;a.pf=null;
      /* the interrupted skill walks on with a fresh plan (an empty move state, never null) */
      if(a.sk){const ss=a.sk.st;ss.planned=false;if(ss.mv)ss.mv={};if(ss.amv)ss.amv={};if(ss.mv2)ss.mv2={};
        if(s.k==='flee')ss.flees=(ss.flees||0)+1;}
      if(a.bjob&&a.bjob.ops[0])a.bjob.ops[0].mv={};
      if(typeof r==='string'&&r.startsWith('fail'))a.notes.push('Reflex '+s.k+' failed: '+r.slice(5));
      if(!a.sk&&!a.q.length)agNeedTurn(a,'after a '+s.k);}
    return;
  }
  /* you broke a chest or furnace: pick up what spilled out before carrying on (a player would) */
  if(a.spill){const sp=a.spill,e=a.e;let dr=null;
    if(AG_T-sp.t<6&&e){let bd=7;for(const d of entities){if(d.t!=='drop'||d.dead)continue;
      const dd=Math.hypot(d.x-e.x,d.z-e.z);if(dd<bd&&Math.hypot(d.x-sp.x,d.z-sp.z)<5&&Math.abs(d.y-e.y)<3&&agRoomFor(a,d.st.id)){bd=dd;dr=d;}}}
    if(dr){const dd=Math.hypot(dr.x-e.x,dr.z-e.z);if(dd>0.3)agSteer(a,dr.x,dr.z,dd>1?1:0.4);else a.ctl.mx=a.ctl.mz=0;
      if(e.wall&&e.onGround)a.ctl.jump=true;a.look={x:dr.x,y:dr.y,z:dr.z,t:AG_T+0.3};return;}
    a.spill=null;a.path=null;a.pf=null;
    if(a.sk){a.sk.st.planned=false;if(a.sk.st.mv)a.sk.st.mv={};}if(a.bjob&&a.bjob.ops[0])a.bjob.ops[0].mv={};}
  if(!a.sk&&a.q.length){a.sk=a.q.shift();a.sk.t=0;a.sk.st=a.sk.st||{};a.path=null;a.pf=null;}
  if(!a.sk){a.ctl.mx=a.ctl.mz=0;a.ctl.jump=false;a.ctl.sneak=false;return;}
  const s=a.sk;s.t+=dt;
  let r;
  /* chased off by mobs again and again: stop going back into it, the mind should pick something else */
  if((s.st.flees||0)>=4&&s.k!=='hide'&&s.k!=='flee')r='fail:mobs kept chasing you away from it - fight them, hide, or go somewhere safer';
  else try{r=SK[s.k](a,dt,s);}catch(err){r='fail:'+(err&&err.message||'error');}
  if(r==='run'&&s.t>(SK_MAX[s.k]||90))r=(s.k==='follow'||s.k==='guard'||s.k==='wait'||s.k==='hide')?'done':'fail:took too long';
  if(r==='run')return;
  const label=s.k+(s.a.target?' '+s.a.target:'')+(s.a.item?' '+s.a.item:'');
  a.sk=null;a.path=null;a.pf=null;a.ctl.mx=a.ctl.mz=0;a.ctl.sneak=false;
  if(s.k==='build'||s.k==='grief')a.bjob=null;
  if(typeof r==='string'&&r.startsWith('fail')){
    a.notes.push('Your action "'+label+'" failed: '+r.slice(5));if(a.notes.length>8)a.notes.shift();
    if(!BRAIN.ok)a.offFail={k:s.k,why:r.slice(5),t:AG_T};
    a.q=[];agNeedTurn(a,'your last action failed');
  }else if(!a.q.length)agNeedTurn(a,'finished: '+label);
}
let _brainHT=0;
function tickBots(dt){
  if(!AG_ACTIVE)return;
  AG_T+=dt;
  NAV_BUDGET=1200;
  tickTickets(dt);
  _brainHT-=dt;
  if(_brainHT<=0){_brainHT=BRAIN.ok?12:(BRAIN.back||5);brainHealth();}
  for(const a of AGENTS){
    if(!a.online)continue;
    if(a.dim!==DIM){agDropBody(a);continue;}
    if(a.dead){a.deadT-=dt;if(a.deadT<=0)agRespawn(a);continue;}
    if(!a.e||a.e.dead){a.e=null;if(chunkAt(Math.floor(a.x),Math.floor(a.z))){
      const fx=Math.floor(a.x),fz=Math.floor(a.z);
      if(boxCollides(a.x,a.y,a.z,0.3,1.8)){a.y=surfaceTop(fx,fz)+1.02;}
      agSpawnBody(a);}else continue;}
    if(!chunkAt(Math.floor(a.e.x),Math.floor(a.e.z)))continue;
    agTypingTick(a,dt);
    agRegen(a,dt);
    if(GR.freezeMobs){a.ctl.mx=a.ctl.mz=0;continue;}
    agReflexes(a,dt);
    agSkillTick(a,dt);
    agMindTick(a,dt);
  }
  if(frameCount%30===0)flushGrief();
  if(frameCount%120===0)for(const a of AGENTS){
    if(a.mood<60)a.mood+=0.5;else if(a.mood>60)a.mood-=0.25;
    for(const w in a.rel){const r=a.rel[w];const fg=AG_DEF[a.name].forgive;
      if(r.aff<0)r.aff=Math.min(0,r.aff+fg*0.4);if(r.host>0&&!r.war&&Math.random()<fg*0.02)r.host--;}
  }
}

/* ----- joining, leaving, saving ----- */
/* no starter kits: a new player on a new world has nothing, exactly like Dan */
function agJoinAll(quiet){
  if(!P)return;
  const w=worldSpawn();
  let n=0;
  for(const name of AG_ORDER){
    let a=agByName(name);
    if(!a){const sp=agFindSpot(w[0],w[2],10,45);a=agNew(name,sp[0],sp[1],sp[2]);AGENTS.push(a);
      a.notes.push('You just joined this world with an EMPTY inventory, like everyone else: punch trees for wood first.');}
    if(!a.online||!quiet){a.online=true;
      const nm=name;setTimeout(()=>{if(AG_ACTIVE&&agByName(nm)&&agByName(nm).online)sysMsg(nm+' joined the game');},300+n*900);n++;}
    a.bs=null;
  }
  AG_ACTIVE=true;BRAIN.joinT=AG_T;
  if(DIM==='puppet')purgJoinIn();
  ownSeedFromEdits();
  brainInit();
  if(P&&DIM!=='puppet'&&!P.inv.some(s=>s&&s.id===IT.PCOMPASS)&&!P._gotPC){P._gotPC=true;invAddTo(P.inv,{id:IT.PCOMPASS,count:1});redrawHotbar();}
}
function agLeaveAll(){
  for(const a of AGENTS){if(a.online){sysMsg(a.name+' left the game');a.online=false;}agDropBody(a);a.typing=[];}
  AG_ACTIVE=false;
}
function agSnapshot(){
  if(!AGENTS.length)return null;
  const own={};
  for(const [k,o] of BOWN){const p=k.split(',');let pf='',cx,cz;
    if(k[1]===';'){pf=k.slice(0,2);p[0]=p[0].slice(2);}
    cx=Math.floor(+p[0]/CH);cz=Math.floor(+p[2]/CH);
    const ck=pf+cx+','+cz;own[ck]=(own[ck]||'')+(+p[0]-cx*CH)+','+p[1]+','+(+p[2]-cz*CH)+','+o+';';}
  const sv=st=>st?{id:st.id,count:st.count,...(st.dur!=null?{dur:st.dur}:{}),...(st.ench?{ench:st.ench}:{}),...(st.mob?{mob:st.mob}:{})}:0;
  return {v:1,t:Math.round(AG_T),seeded:OWN_SEEDED?1:0,own,
    list:AGENTS.map(a=>({name:a.name,dim:a.dim,x:+a.x.toFixed(2),y:+a.y.toFixed(2),z:+a.z.toFixed(2),yaw:+(a.yaw||0).toFixed(2),
      hp:a.hp,inv:a.inv.map(sv),armor:a.armor.map(sv),sel:a.sel,spawn:a.spawn,home:a.home,dead:a.dead?1:0,
      rel:a.rel,mem:a.mem,ev:a.ev.slice(-20),proj:a.proj,projHist:a.projHist.slice(-10),flowers:a.flowers,
      thoughts:a.thoughts.slice(-10),stats:a.stats,mood:a.mood,base:a.base,notes2:a.selfNotes||[],
      hunger:a.hunger,exh:+(a.exh||0).toFixed(2),myTable:a.myTable||null,myFurnace:a.myFurnace||null,lastDeath:a.lastDeath||null}))};
}
function agReset(){
  for(const a of AGENTS)agDropBody(a);
  AGENTS.length=0;BOWN.clear();OWNC.clear();TICKETS.clear();TICKET_Q.length=0;DEFER.length=0;GRIEFQ.clear();
  AG_ACTIVE=false;AG_EPOCH++;CHAT.length=0;_chatDirty=true;OWN_SEEDED=false;_wspawn=null;_structCache=null;AG_T=0;
  FSHARE.clear();
  /* a new world gets the brain-offline explanation again (AG_T restarts, so the 45 s limiter must too) */
  BRAIN.told=false;BRAIN.nudgeT=null;BRAIN.toldPair=false;
}
function agRestore(d){
  const b=d&&d.bots;
  if(b&&Array.isArray(b.list)){
    AG_T=+b.t||0;OWN_SEEDED=!!b.seeded;
    for(const ck in (b.own||{})){
      let pf='',core=ck;if(ck[1]===';'){pf=ck.slice(0,2);core=ck.slice(2);}
      const c=core.split(','),cx=+c[0],cz=+c[1];
      for(const ent of b.own[ck].split(';')){if(!ent)continue;const q=ent.split(',');
        const x=cx*CH+ +q[0],y=+q[1],z=cz*CH+ +q[2],o=+q[3];
        BOWN.set(pf+x+','+y+','+z,o);
        const savedDim=DIM;DIM=keyDim(pf+'0,0');ownCellAdd(x,y,z,o,1);DIM=savedDim;}
    }
    const ld=st=>st?{id:st.id,count:st.count,...(st.dur!=null?{dur:st.dur}:{}),...(st.ench?{ench:st.ench}:{}),...(st.mob?{mob:st.mob}:{})}:null;
    for(const s of b.list){
      if(!AG_DEF[s.name])continue;
      const a=agNew(s.name,s.x,s.y,s.z);
      a.dim=(typeof mpDimAlias==='function'?mpDimAlias(s.dim):s.dim)||'over';a.yaw=s.yaw||0;a.hp=s.hp!=null?s.hp:20;
      a.inv=(s.inv||[]).slice(0,36).map(ld);while(a.inv.length<36)a.inv.push(null);
      a.armor=(s.armor||[]).slice(0,4).map(ld);while(a.armor.length<4)a.armor.push(null);
      a.sel=s.sel|0;a.spawn=s.spawn||[s.x,s.y,s.z];a.home=s.home||null;a.dead=!!s.dead;if(a.dead)a.deadT=2;
      a.rel=s.rel||{};a.mem=(s.mem||[]).filter(m=>!/^\(note to self\)|^You died \(/.test(m.txt));a.selfNotes=s.notes2||[];a.ev=s.ev||[];a.proj=s.proj||null;a.projHist=s.projHist||[];
      a.flowers=(s.flowers||[]).filter(i=>FLOWER_IDS.has(i));a.thoughts=s.thoughts||[];
      a.stats=Object.assign({k:0,d:0,placed:0,broke:0},s.stats||{});a.mood=s.mood!=null?s.mood:60;a.base=s.base||null;
      a.hunger=s.hunger!=null?clamp(+s.hunger,0,20):20;a.exh=+s.exh||0;a.myTable=s.myTable||null;a.myFurnace=s.myFurnace||null;
      a.lastDeath=s.lastDeath&&s.lastDeath.t!=null?Object.assign({},s.lastDeath,{t:Math.min(+s.lastDeath.t,AG_T)}):null;
      a.online=false;
      if(a.proj)a.proj.t0=AG_T-60;
      AGENTS.push(a);
    }
  }
  if(GR.bots&&P){if(AGENTS.length)agJoinAll(false);else agJoinAll(false);}
}

/* ----- chests: Dan raiding an agent's chest is theft; agents stash their loot ----- */
let _chestWatch=null;
function agChestOpen(bek){
  if(!BOWN.has(bek))return;
  const owner=OWN_NAMES[BOWN.get(bek)];
  if(owner==='Dan')return;
  const be=blockEnts.get(bek);if(!be||be.t!=='chest')return;
  const cnt={};for(const st of be.inv)if(st)cnt[st.id]=(cnt[st.id]||0)+st.count;
  _chestWatch={bek,owner,cnt};
}
function agChestClose(){
  if(!_chestWatch)return;
  const w=_chestWatch;_chestWatch=null;
  const be=blockEnts.get(w.bek),now={};
  if(be&&be.inv)for(const st of be.inv)if(st)now[st.id]=(now[st.id]||0)+st.count;
  const took=[];
  for(const id in w.cnt){const d=w.cnt[id]-(now[id]||0);if(d>0)took.push(d+' '+DEFS[id].name);}
  if(took.length)agOnStolen(w.owner,'Dan',took);
}
SK.store=(a,dt,s)=>{
  const only=s.a.item&&!/^(all|everything|stuff|valuables|loot|my stuff)$/i.test((''+s.a.item).trim())?''+s.a.item:null;
  if(!s.st.c){
    let best=null,bd=1e9;
    for(const [k,o] of BOWN){if(OWN_NAMES[o]!==a.name||keyDim(k)!==DIM)continue;
      const p=keyCore(k).split(',').map(Number);if(getBlock(p[0],p[1],p[2])!==B.CHEST)continue;
      const d=Math.hypot(p[0]-a.x,p[2]-a.z);if(d<bd&&d<120){bd=d;best={x:p[0],y:p[1],z:p[2]};}}
    if(!best){
      if(agHas(a,B.CHEST)<1){const er=agCraft(a,'Chest',1);if(er)return 'fail:you have no chest and cannot make one (8 planks at a crafting table): '+er;}
      const e=a.e;
      for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){const x=Math.floor(e.x)+dx,y=Math.floor(e.y),z=Math.floor(e.z)+dz;
        if(getBlock(x,y,z)===B.AIR&&solidAt(x,y-1,z)&&agPlaceBlock(a,x,y,z,B.CHEST)===''){best={x,y,z};break;}}
      if(!best)best=agPlaceNear(a,B.CHEST);
      if(!best)return 'fail:nowhere to put a chest';
    }
    s.st.c=best;
  }
  const c=s.st.c;
  const ap=agApproach(a,dt,s.st,c.x,c.y,c.z,{what:'your chest'});
  if(ap!=='ok')return ap;
  a.ctl.mx=a.ctl.mz=0;a.look={x:c.x+0.5,y:c.y+0.5,z:c.z+0.5,t:AG_T+0.5};
  if((s.st.wt=(s.st.wt||0)+dt)<1)return 'run';
  if(getBlock(c.x,c.y,c.z)!==B.CHEST)return 'fail:your chest is gone';
  const be=ensureBE(c.x,c.y,c.z,'chest');
  const held=a.inv[a.sel],keepSel=held&&(DEFS[held.id].tool||DEFS[held.id].bow||DEFS[held.id].gun)?held:null;
  let moved=0;
  /* keep what you need to keep playing: tools, weapons, buckets, torches, fuel, some food, sticks,
     one stack of logs and of planks, and one stack of building blocks (take gets the rest back later) */
  const scaf=agScaffoldBlock(a);const kept={};
  for(let i=0;i<a.inv.length;i++){const st=a.inv[i];if(!st||st===keepSel)continue;
    const d=DEFS[st.id];
    if(only){if(!agNameIs(st.id,only))continue;}
    else{
      if(d.armor||d.tool||d.bow||d.gun||st.id===IT.BUCKET||st.id===IT.BUCKET_W||st.id===IT.BUCKET_L||st.id===B.TORCH||st.id===IT.COAL||st.id===IT.STICK)continue;
      const grp=d.food?'food':GROUPS.logs.includes(st.id)?'logs':GROUPS.planks.includes(st.id)?'planks':st.id===scaf?'scaf':null;
      if(grp&&!kept[grp]){kept[grp]=true;continue;}
    }
    const n0=st.count,left=beAddChest(be,st),mv=n0-left;moved+=mv;
    if(mv>0)agLed(a,'used',st.id,mv);
    if(left<=0)a.inv[i]=null;else st.count=left;}
  if(MODAL.bek===bkey(c.x,c.y,c.z))redrawModal();
  if(!moved)return only?'fail:you have no '+only+' to store':'done';
  agEvent(a,'You stashed '+moved+' items in your chest at '+c.x+','+c.z+' (take gets them back)',3);
  return 'done';
};
/* take things back out of your OWN chest (what you stored is still yours) */
SK.take=(a,dt,s)=>{
  const st=s.st;
  const all=!s.a.item||/^(all|everything|stuff|anything|my stuff|items|valuables)$/i.test((''+s.a.item).trim());
  const match=q=>!!q&&(all||agNameIs(q.id,s.a.item));
  if(!st.c){
    let best=null,bd=1e9;
    for(const [k,o] of BOWN){if(OWN_NAMES[o]!==a.name||keyDim(k)!==DIM)continue;
      const be=blockEnts.get(k);if(!be||be.t!=='chest'||!be.inv.some(match))continue;
      const p=keyCore(k).split(',').map(Number);if(getBlock(p[0],p[1],p[2])!==B.CHEST)continue;
      const d=Math.hypot(p[0]-a.x,p[2]-a.z);if(d<bd&&d<160){bd=d;best={x:p[0],y:p[1],z:p[2]};}}
    if(!best)return 'fail:none of your chests nearby has '+(all?'anything in it':s.a.item+' in it');
    st.c=best;
  }
  const c=st.c;
  const ap=agApproach(a,dt,st,c.x,c.y,c.z,{what:'your chest'});
  if(ap!=='ok')return ap;
  a.ctl.mx=a.ctl.mz=0;a.look={x:c.x+0.5,y:c.y+0.5,z:c.z+0.5,t:AG_T+0.5};
  if((st.wt=(st.wt||0)+dt)<1)return 'run';
  const be=blockEnts.get(bkey(c.x,c.y,c.z));
  if(!be||be.t!=='chest'||getBlock(c.x,c.y,c.z)!==B.CHEST)return 'fail:your chest is gone';
  let want=all?Infinity:clamp(+s.a.count||64,1,2304);const took=[];let full=false;
  for(let i=0;i<be.inv.length&&want>0;i++){const it=be.inv[i];if(!match(it))continue;
    const mv=Math.min(it.count,want),piece={id:it.id,count:mv};
    if(it.dur!=null)piece.dur=it.dur;if(it.ench)piece.ench={...it.ench};if(it.mob)piece.mob=it.mob;
    const left=agGive(a,piece,'container'),got=mv-left;
    if(got>0){took.push(got+' '+DEFS[it.id].name);it.count-=got;want-=got;if(it.count<=0)be.inv[i]=null;}
    if(left>0){full=true;break;}}
  if(MODAL.bek===bkey(c.x,c.y,c.z))redrawModal();
  if(!took.length)return full?'fail:your inventory is full':'fail:nothing like that in your chest';
  agEvent(a,'You took '+took.slice(0,5).join(', ')+' out of your chest'+(full?' (your inventory is full)':''),3);
  agAutoEquip(a);
  return 'done';
};
function beAddChest(be,st){
  const tmp={id:st.id,count:st.count};if(st.dur!=null)tmp.dur=st.dur;if(st.ench)tmp.ench=st.ench;
  return invAddTo(be.inv,tmp);
}
