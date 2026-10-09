
/* ----- combat, death and respawn ----- */
const MOB_NAME={zombie:'Zombie',skel:'Skeleton',boomer:'Boomer',spider:'Spider',alien:'Alien',
  dragon:'Dragon',dking:'Dragon King',titan:'Stone Titan',demon:'Malgorath',imp:'Imp',hellhog:'Hellhog',
  cherub:'Cherub',warden:'Warden',valkyra:'Valkyra',infernis:'Infernis',creep:'Nuke Keg',nuker:'Armed Nuke Keg',snake:'Snake',blockling:'Blockling'};
function mobNameOf(mt){return MOB_NAME[mt]||(mt?mt[0].toUpperCase()+mt.slice(1):'something');}
function agHurt(a,dmg,by,kx,kz,how){
  if(!a||a.dead||!a.online)return;
  if(a.dim==='puppet'&&CUT.on&&CUT.script)return;
  if(MGP_ON&&mgBotShield(a,by,how))return;
  const e=a.e;
  if(a.spawnProt>AG_T&&how!=='void')return;
  /* Dan's damagePlayer: 0.6 s of invulnerability after any hit (only the void and starving get through) */
  if(e&&e.hurtT>0&&how!=='void'&&how!=='starve')return;
  if(GR.instaKill&&by==='Dan'&&dmg>0)dmg=999;
  /* armour: Dan's armorAbsorb exactly - up to 80% off, and every hit chews a random worn piece */
  const pts=agArmorPts(a);
  if(pts>0&&dmg>0){
    dmg=dmg*(1-Math.min(0.8,pts*0.04));
    const worn=[];for(let i=0;i<4;i++)if(a.armor[i])worn.push(i);
    if(worn.length){const i=worn[(Math.random()*worn.length)|0],pc=a.armor[i],d=DEFS[pc.id],mx=ARM_M[d.armor.m].dur;
      pc.dur=(pc.dur==null?mx:pc.dur)-1;
      if(pc.dur<=0){a.armor[i]=null;agLed(a,'used',pc.id,1);agEvent(a,'Your '+d.name+' shattered',5);
        a.notes.push('Your '+d.name+' shattered - make a new one');if(a.notes.length>8)a.notes.shift();
        if(e)playSAt('break2',e.x,e.y+1.2,e.z);}}
  }
  dmg=Math.max(0,Math.round(dmg*10)/10);
  if(dmg<=0)return;
  a.hp=Math.max(0,a.hp-dmg);
  if(e){
    e.hurtT=0.6;
    for(const m of e.mats)m.emissive&&m.emissive.setRGB(0.45,0,0);
    if(kx!==undefined&&(kx||kz)){const l=Math.hypot(kx,kz)||1;e.vx+=kx/l*5;e.vz+=kz/l*5;e.vy=Math.max(e.vy,4);}
    playSAt('hurt',e.x,e.y+1,e.z);
  }
  if(by){a.lastHurtBy=by;a.lastHurtT=AG_T;a.lastHurtHow=how;}
  if(by&&by!==a.name&&(by==='Dan'||agByName(by)))agOnHit(a,by,dmg,how);
  if(a.typingT>0&&by&&Math.random()<0.85)a.typingT=0;
  if(a.hp<=0)agDie(a,by,how);
}
function agDeathMsg(name,by,how,recentBy){
  if(how==='fall')return recentBy?name+' was doomed to fall by '+recentBy:name+' fell from a high place';
  if(how==='lava')return recentBy?name+' tried to swim in lava to escape '+recentBy:name+' tried to swim in lava';
  if(how==='drown')return name+' drowned';
  if(how==='void')return name+' fell out of the world';
  if(how==='cactus')return name+' was pricked to death';
  if(how==='tnt'||how==='boom'){if(by===name)return name+' blew themselves up';return name+' was blown up by '+(by||'something');}
  if(how&&how.slice(0,3)==='pg:')return purgDeathMsg(name,by,how.slice(3));
  if(how&&how.slice(0,3)==='mg:')return mgDeathMsg(name,by,how.slice(3));
  if(how==='arrow')return name+' was shot by '+(by||'an arrow');
  if(by)return name+' was slain by '+by;
  return name+' died';
}
function agDie(a,by,how){
  if(a.dead)return;
  a.dead=true;a.deadT=4;a.hp=0;
  const e=a.e,x=e?e.x:a.x,y=e?e.y:a.y,z=e?e.z:a.z;
  const recent=(AG_T-a.lastHurtT<6&&a.lastHurtBy&&a.lastHurtBy!==by)?a.lastHurtBy:null;
  const killer=by||recent;
  /* Dan's death rules: the inventory drops (unless keepInventory is on); worn armour stays on, as it does for him */
  let dropped=0;
  if(a.dim==='puppet')dropped=purgBotLost(a);
  else if(MGP_ON&&mgBotKeep(a)){}
  else if(!GR.keepInv)for(let i=0;i<a.inv.length;i++){const st=a.inv[i];if(!st)continue;dropped+=st.count;
    spawnDrop(x,y+1,z,st,(Math.random()-0.5)*4,Math.random()*3+2,(Math.random()-0.5)*4);a.inv[i]=null;agLed(a,'used',st.id,st.count);}
  a.lastDeath={x:Math.round(x),y:Math.round(y),z:Math.round(z),t:AG_T,items:dropped};
  if(a.e&&a.e.hrM&&hrCorpse(a.e,B.WOOL))a.e=null;
  else{burstParticles(x,y+0.9,z,B.WOOL,10,0.6);agDropBody(a);}
  a.bjob=null;a.sk=null;a.q=[];a.rx=null;a.path=null;a.pf=null;a.typing=[];a.typingT=0;
  a.stats.d++;
  chatPush({k:'death',txt:agDeathMsg(a.name,by,how,how==='fall'||how==='lava'?recent:null)});
  const isPl=k=>k&&(k==='Dan'||agByName(k));
  if(isPl(killer)&&killer!==a.name){
    agOnKilled(a,killer,how);
    if(dropped)agEvent(a,'Your dropped stuff is at '+a.lastDeath.x+','+a.lastDeath.z+' (it vanishes after 5 minutes)',5);
  }else agEvent(a,'You died ('+agDeathMsg('you',by,how,recent).replace(/^you /,'')+')'+(dropped?' and dropped your stuff at '+a.lastDeath.x+','+a.lastDeath.z+' (it vanishes after 5 minutes)':''),5);
  /* a rethink of the whole plan only for deaths that matter: a player, or dying over and over */
  a.deathTs=(a.deathTs||[]).filter(t=>AG_T-t<300).concat([AG_T]);
  if((isPl(killer)&&killer!==a.name)||a.deathTs.length>=3)agMindForce(a,isPl(killer)&&killer!==a.name?'you were just killed by '+killer:'you keep dying ('+a.deathTs.length+' times in 5 minutes)');
  else agNeedTurn(a,'you just died');
}
function agRespawn(a){
  let sp=MGP_ON?mgBotSpawn(a):null;
  if(a.home&&!sp){const hx=Math.floor(a.home[0]),hz=Math.floor(a.home[2]);
    for(let dy=-2;dy<=1;dy++){if(getBlock(hx,Math.floor(a.home[1])+dy-1,hz)===B.BED||
      [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>getBlock(hx+dx,Math.floor(a.home[1])+dy-1,hz+dz)===B.BED)){sp=a.home;break;}}
    if(!sp&&chunkAt(hx,hz)){a.home=null;agEvent(a,'Your bed was missing, so you woke up back at spawn',6);}
    else if(!sp&&!chunkAt(hx,hz))sp=a.home;
  }
  if(!sp&&a.dim==='puppet')sp=purgBotSpawn(a);
  if(!sp){const w=worldSpawn();sp=agFindSpot(w[0],w[2],2,12);}
  a.x=sp[0];a.y=sp[1];a.z=sp[2];
  a.dead=false;a.hp=20;a.hunger=20;a.exh=0;a.starveT=0;a.air=10;a.fallD=0;a.lastHurtBy=null;a.spawnProt=AG_T+3;
  agAutoEquip(a);
  const ld=a.lastDeath;
  if(ld&&ld.items){const dd=Math.round(agDist(a,ld.x,ld.z));
    a.notes.push('You respawned at '+Math.round(a.x)+','+Math.round(a.z)+(sp===a.home?' (your bed)':' (world spawn - you have no bed)')+
      ' with an EMPTY inventory. Your stuff is lying where you died, at '+ld.x+','+ld.z+' ('+dd+'m '+dir8(ld.x-a.x,ld.z-a.z)+
      ' from here) - it vanishes 5 minutes after you died. Go back for it (goto '+ld.x+','+ld.z+') or start again: wood, tools, then blocks.');}
  else a.notes.push('You respawned at '+Math.round(a.x)+','+Math.round(a.z)+(sp===a.home?' (your bed)':' (world spawn - you have no bed)')+
    (GR.keepInv?' and kept your stuff (keepInventory is on).':'.'));
  agNeedTurn(a,'respawned');
}
/* Dan's hunger and healing, number for number: 4 exhaustion = 1 hunger; heal 1 HP every 1.2 s only while
   hunger is 16+ (each HP costs 1 exhaustion); at 0 hunger you starve down to half a heart */
function agRegen(a,dt){
  if(a.dead)return;
  if(a.hunger==null)a.hunger=20;
  while((a.exh||0)>=4){a.exh-=4;if(a.hunger>0)a.hunger--;}
  if(a.hunger>=16&&a.hp<20){
    a.regenT+=dt;
    if(a.regenT>=1.2){a.regenT=0;a.hp=Math.min(20,a.hp+1);a.exh=(a.exh||0)+1;}
  }else a.regenT=0;
  if(a.hunger<=0){
    a.starveT=(a.starveT||0)+dt;
    if(a.starveT>=4){a.starveT=0;if(a.hp>1)agHurt(a,1,null,0,0,'starve');}
  }else a.starveT=0;
}
/* who hostile mobs go for: the nearest player, Dan or an agent */
function mobBotTarget(e,T,pd){
  if(!AG_ACTIVE)return null;
  const range=T.boss?26:(T.nuke?22:16);
  const pOK=P&&!P.dead&&(P.mode!=='c'||T.nuke);
  let best=null,bd=range;
  for(const a of AGENTS){
    const b=a.e;if(!b||b.dead||a.dead||!a.online||a.dim!==DIM)continue;
    const d=Math.hypot(b.x-e.x,b.z-e.z);
    if(d<bd){bd=d;best=b;}
  }
  if(!best)return null;
  if(pOK&&pd<=bd)return null;
  return best;
}
function mobHitBot(b,e,T,dmg,dx,dz){
  agHurt(b.A,dmg,mobNameOf(e.mt),dx,dz,'mob');
}
/* fight a target until it dies or gets away (shared by attack/hunt/guard) */
function agFight(a,dt,st,tgt,isDan){
  const e=a.e,D=AG_DEF[a.name];
  let tx,ty,tz,alive,tb=null;
  if(isDan){if(!P||P.dead)return 'done';tx=P.x;ty=P.y;tz=P.z;}
  else{if(!tgt||tgt.dead)return 'done';tx=tgt.x;ty=tgt.y;tz=tgt.z;tb=tgt;}
  const dx=tx-e.x,dz=tz-e.z,d=Math.hypot(dx,dz);
  if(d>48)return 'fail';
  a.look={x:tx,y:ty+1.4,z:tz,t:AG_T+0.3,urgent:true};
  if(d>4.5){
    if(!st.mv||Math.hypot(tx-(st.mv.gx||0),tz-(st.mv.gz||0))>2.5)st.mv={gx:tx,gz:tz};
    const r=agMoveTo(a,dt,st.mv,tx,tz,2,null);
    a.ctl.sprint=d>7;
    if(r==='done'&&Math.hypot(tx-st.mv.gx,tz-st.mv.gz)>0.3)st.mv={gx:tx,gz:tz};   /* reached where it WAS (it has moved since, by less than 2.5 m): go to where it is now */
    if(r.startsWith('fail'))return 'fail';
    return 'run';
  }
  /* close range: strafe a little, jump now and then for crits */
  st.strafe=st.strafe||((Math.random()<0.5)?1:-1);
  if(Math.random()<dt*0.6)st.strafe=-st.strafe;
  const fx=dx/(d||1),fz=dz/(d||1);
  const want=d>2.4?1:(d<1.4?-0.6:0.15);
  a.ctl.mx=fx*want+(-fz)*st.strafe*0.45;a.ctl.mz=fz*want+fx*st.strafe*0.45;
  const l=Math.hypot(a.ctl.mx,a.ctl.mz)||1;a.ctl.mx/=l;a.ctl.mz/=l;a.ctl.spd=1;a.ctl.sprint=d>2.6;
  if(e.wall&&e.onGround)a.ctl.jump=true;
  if(D.aggr>0.5&&Math.random()<dt*0.9&&e.onGround)a.ctl.jump=true;
  a.atkCd=(a.atkCd||0)-dt;
  /* fight with the best weapon you carry, not whatever pickaxe you were digging with */
  if(!st.armed){st.armed=true;agAutoEquip(a);}
  const facing=Math.abs(((Math.atan2(-dx,-dz)-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI)<0.6;
  if(d<3.1&&Math.abs(ty-e.y)<2.2&&a.atkCd<=0&&facing){
    a.atkCd=0.6+Math.random()*0.25;a.swing=1;
    const miss=Math.random()<(0.4-D.aggr*0.28);
    if(miss)return 'run';
    const st0=a.inv[a.sel],tl=st0&&DEFS[st0.id]&&DEFS[st0.id].tool;
    let dmg=tl?tl.dmg:1;                                  /* Dan's melee: no critical hits, Sharpness adds 1.2 a level */
    if(st0&&st0.ench&&st0.ench.sharp)dmg+=st0.ench.sharp*1.2;
    if(tl)agToolWear(a,st0,tl.type==='sword'?1:2);   /* swords wear 1 per hit, other tools 2 (Dan's rule) */
    if(isDan){LASTDMG={by:a.name,how:'melee',t:AG_T};damagePlayer(dmg,dx,dz);agOnHitDan(a,dmg);}
    else if(tb.bot)agHurt(tb.A,dmg,a.name,dx,dz,'melee');
    else{HIT_BY=a.name;hurtMob(tb,dmg,dx,dz);HIT_BY=null;}
  }
  return 'run';
}
SK.attack=(a,dt,s)=>{
  const t=(''+(s.a.target||'')).trim();
  const lt=t.toLowerCase();
  if(!s.st.init){
    s.st.init=true;
    if(lt==='dan'||lt==='player'){s.st.dan=true;if(!GR.botPvP)return 'fail:PvP is off on this server';}
    else{const o=agByName(t);
      if(o&&o!==a){if(!GR.botPvP)return 'fail:PvP is off';s.st.ag=o;}
      else{const k=AG_HUNT[lt.replace(/[^a-z]/g,'')]||lt;
        let bd=30,best=null;for(const m of entities)if(m.t==='mob'&&!m.dead&&!m.bot&&k.split('|').includes(m.mt)){const d=Math.hypot(m.x-a.x,m.z-a.z);if(d<bd){bd=d;best=m;}}
        if(!best)return 'fail:cannot find '+(t||'a target');s.st.mob=best;}}
  }
  if(s.st.ag&&(s.st.ag.dead||!s.st.ag.e))return s.st.ag.dead?'done':'fail:'+s.st.ag.name+' is not around';
  const r=agFight(a,dt,s.st,s.st.dan?null:(s.st.ag?s.st.ag.e:s.st.mob),!!s.st.dan);
  if(r==='done')return 'done';
  if(r==='fail')return 'fail:'+(t||'they')+' got away';
  return s.t>(+s.a.secs||45)?'done':'run';
};
SK.flee=(a,dt,s)=>{
  const e=a.e;
  if(!s.st.gx){
    let fx=s.a.fromX,fz=s.a.fromZ;
    if(fx==null){const p=agTargetPos(a,s.a.target)||(a.lastHurtBy&&agTargetPos(a,a.lastHurtBy));
      if(p){fx=p.x;fz=p.z;}else{fx=e.x+Math.sin(e.yaw)*3;fz=e.z+Math.cos(e.yaw)*3;}}
    const home=(AG_DEF[a.name].paranoia>0.5&&(a.home||mainBase(a.name)))?agResolve(a,'home'):null;
    if(home&&Math.hypot(home.x-fx,home.z-fz)>Math.hypot(e.x-fx,e.z-fz)){s.st.gx=home.x;s.st.gz=home.z;}
    else{let vx=e.x-fx,vz=e.z-fz;const l=Math.hypot(vx,vz)||1;const dist=+s.a.dist||22;
      s.st.gx=e.x+vx/l*dist;s.st.gz=e.z+vz/l*dist;}
  }
  const r=agMoveTo(a,dt,s.st,s.st.gx,s.st.gz,2,null);
  a.ctl.sprint=true;
  if(r==='done'||s.t>9)return 'done';
  return r.startsWith('fail')?'done':'run';
};
SK.guard=(a,dt,s)=>{
  if(!s.st.c){s.st.c=agResolve(a,s.a.target||'here')||{x:a.x,z:a.z};}
  const c=s.st.c;
  if(s.st.foe){const r=agFight(a,dt,s.st,s.st.foe==='Dan'?null:s.st.foe,s.st.foe==='Dan');
    if(r!=='run'){s.st.foe=null;s.st.mv=null;}return s.t>(+s.a.secs||90)?'done':'run';}
  if(frameCount%15===0){
    for(const m of entities)if(m.t==='mob'&&!m.dead&&!m.bot&&m.hostile&&!m.mgNoBot&&Math.hypot(m.x-c.x,m.z-c.z)<12){s.st.foe=m;break;}
    if(!s.st.foe&&P&&!P.dead&&agRel(a,'Dan').war&&Math.hypot(P.x-c.x,P.z-c.z)<12)s.st.foe='Dan';
    if(!s.st.foe)for(const o of AGENTS)if(o!==a&&o.e&&!o.dead&&agRel(a,o.name).war&&Math.hypot(o.x-c.x,o.z-c.z)<12){s.st.foe=o.e;break;}
  }
  if(agDist(a,c.x,c.z)>7){if(!s.st.mv2)s.st.mv2={};agMoveTo(a,dt,s.st.mv2,c.x,c.z,4,null);}
  else{a.ctl.mx=a.ctl.mz=0;s.st.mv2=null;if(!s.st.lt||AG_T>s.st.lt){s.st.lt=AG_T+2+Math.random()*3;
    const ang=Math.random()*6.28;a.look={x:a.x+Math.sin(ang)*8,y:a.y+1.5,z:a.z+Math.cos(ang)*8,t:s.st.lt};}}
  return s.t>(+s.a.secs||90)?'done':'run';
};
SK.hide=(a,dt,s)=>{
  const h=agResolve(a,'home');
  if(!h)return 'fail:you have no base to hide in';
  if(!s.st.there){const r=agMoveTo(a,dt,s.st,h.x,h.z,1.5,null);a.ctl.sprint=true;
    if(r==='done')s.st.there=AG_T;else return r.startsWith('fail')?r:'run';}
  a.ctl.mx=a.ctl.mz=0;
  if(!s.st.lt||AG_T>s.st.lt){s.st.lt=AG_T+1+Math.random()*2;const ang=Math.random()*6.28;
    a.look={x:a.x+Math.sin(ang)*6,y:a.y+1.5,z:a.z+Math.cos(ang)*6,t:s.st.lt};}
  return AG_T-s.st.there>(+s.a.secs||25)?'done':'run';
};
/* reflexes: fast, code-only reactions that interrupt whatever they're doing */
function agReflexes(a,dt){
  if(a.dead||!a.e)return;
  if(a.dim==='puppet'&&purgReflex(a,dt))return;
  a.rxT=(a.rxT||0)-dt;
  if(a.rxT>0)return;
  a.rxT=0.25;
  const D=AG_DEF[a.name],e=a.e;
  if(a.rx&&a.rx.k==='flee')return;
  const recent=AG_T-a.lastHurtT<1.6?a.lastHurtBy:null;
  if(a.hp<=D.fleeHp&&recent&&recent!==a.name){
    if(!(a.rx&&a.rx.k==='flee')&&Math.random()<0.9){a.rx={k:'flee',a:{target:recent},st:{},t:0};agThink(a,'[reflex] too hurt - running from '+recent);return;}
  }
  if(recent&&!(a.rx&&a.rx.k==='attack')){
    const isP=recent==='Dan'||!!agByName(recent);
    const src=recent==='Dan'?P:(agByName(recent)||{}).e;
    if(isP&&src&&Math.hypot(src.x-e.x,src.z-e.z)>40){
      /* sniped from range: no point charging blindly, let the mind decide */
      if(a.farHit!==a.lastHurtT){a.farHit=a.lastHurtT;agNeedTurn(a,'hit by '+recent+' from '+Math.round(Math.hypot(src.x-e.x,src.z-e.z))+'m away');}
      return;
    }
    let fight=false;
    if(isP){
      const r=agRel(a,recent);
      fight=D.aggr>0.5||(D.aggr>0.2&&a.hp>12&&Math.random()<0.5)||(r.war&&D.aggr>0.15);
      if(D.short==='bee'&&r.hits<3)fight=false;
      /* brad only fights when cornered at home or clearly winning; otherwise he bolts */
      if(D.short==='brad'){const nearHome=a.home&&Math.hypot(a.home[0]-e.x,a.home[2]-e.z)<10;fight=nearHome?a.hp>6:(a.hp>16&&r.war&&Math.random()<0.4);}
      if(a.shyOf&&a.shyOf[recent]>AG_T)fight=false;
      if(r.ally&&r.hits<3)fight=false;
      if(!GR.botPvP)fight=false;
    }else fight=D.courage>0.25||a.hp>14;
    if(fight){a.rx={k:'attack',a:{target:recent,secs:20},st:{},t:0};agThink(a,'[reflex] fighting back against '+recent);}
    else if(!isP||D.short!=='bee'){a.rx={k:'flee',a:{target:recent},st:{},t:0};}
    else agNeedTurn(a,'hit by '+recent);
    return;
  }
  if(!a.rx&&frameCount%8===0){
    for(const m of entities){
      if(m.t!=='mob'||m.dead||m.bot||!m.hostile||m.mgNoBot)continue;
      const d=Math.hypot(m.x-e.x,m.z-e.z);
      if(d<7&&Math.abs(m.y-e.y)<4){
        if(D.courage>0.5||(D.courage>0.15&&a.hp>14&&m.mt!=='boomer'))a.rx={k:'attack',a:{target:mobNameOf(m.mt).toLowerCase(),secs:15},st:{mob:m,init:true},t:0};
        else a.rx={k:'flee',a:{fromX:m.x,fromZ:m.z,dist:16},st:{},t:0};
        break;
      }
    }
  }
}
