/* ---- PART 55: p4_bomber.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p4_bomber.js (P4): THE DEMOLITIONIST, "THE APRON" (bible 10.1). 200 HP, three phases:
   P1 WIRED: pop out of a hatch, run to a station, climb on its seat, a 1.2 s cackling wind-up, plunge: a spark crawls that
     station's cords at 12 blocks/s and blows every plate group it reaches. RED -> BLUE -> YELLOW -> WHITE unless a player
     stands on (or within 2 of) a network's plates. Self-demo on his first plunge: the frayed lead round his ankle blows his
     own seat. Counters: snip a cord, wire a seat (and hit him while he follows your wire back), punch a station while he
     stands on its plates, pie him. x0.25 braced on a plunger, x1 running, x1.5 dazed, x2 back turned.
   P2 STICKY: half the plunges, a sticky bundle every 4 s (pass it on with a hit or a bot's touch, bat it back, 20 on him).
   P3 THE BIG ONE: the long fuse at 3 blocks/s; cut it ahead of the spark (he splices, back turned); the Trap Release lever
     drops him through the floor and he is blown out of a hatch. Kill: he lights his own short fuse and goes up through the Grid.
   --------------------------------------------------------------------------------------------------------------------- */

var HN_H={bundles:[],armT:{},next:0,demoT:0,demoDone:false,pressCd:{},fuse:null,bomb:null,leverUsed:false,matSet:null};
function hnHReset(){HN_H.demoT=0;HN_H.demoE=null;HN_H.bundles=[];HN_H.armT={};HN_H.next=0;HN_H.pressCd={};HN_H.fuse=null;HN_H.leverUsed=false;HN.fuseSpark=null;hnWick(false);}
PREG.onReset.push(()=>{hnHReset();HN_H.demoDone=false;});PREG.onLoad.push(()=>{hnHReset();HN_H.demoDone=false;});PREG.onExit.push(hnHReset);

/* ---- small geometry helpers for the apron ---- */
function hnHex(c){return typeof c==='number'?c:parseInt(String(c).replace('#',''),16)||0xff0000;}
function hnHGround(x,z){for(let y=40;y>=30;y--){const id=getBlock(Math.floor(x),y,Math.floor(z));if(id&&DEFS[id]&&DEFS[id].solid!==false)return y+1;}return 35;}
function hnHSeatPos(s){return [s.c[0]+0.5,36,s.c[1]+0.5];}
function hnHHatchPos(h){return [h[0]+0.5,35,h[1]+0.5];}
function hnHOnSeat(e,s){return Math.abs(e.x-s.c[0]-0.5)<0.7&&Math.abs(e.z-s.c[1]-0.5)<0.7&&e.y>35.6;}
function hnHGroupCen(gk){const g=hnA().groups[gk];return [(g[0]+g[1])/2+0.5,35,(g[2]+g[3])/2+0.5];}
function hnHInGroup(x,z,gk,pad){const g=gk==='MAT'?[-1,1,-174,-172]:hnA().groups[gk];pad=pad||0;return x>=g[0]-pad&&x<=g[1]+1+pad&&z>=g[2]-pad&&z<=g[3]+1+pad;}
/* which station would the Demolitionist pick: a player on (or within 2 of) a network's plates, else the fixed order */
function hnHPick(){const A=hnA(),foes=[];if(P&&!P.dead&&P.mode!=='c')foes.push([P.x,P.z]);
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS)if(a.e&&!a.dead&&a.online&&a.dim===DIM)foes.push([a.e.x,a.e.z]);
  for(const s of A.st)for(const gk of s.groups)for(const f of foes)if(hnHInGroup(f[0],f[1],gk,2))return s.i;
  const i=HN_H.next%4;HN_H.next++;return A.order.indexOf(A.st[i].k)>=0?i:0;}

/* ---- the plates: a fed plate fires its whole group (6 s re-arm); a fed seat blows whoever sits on it ---- */
function hnHPlate(px,py,pz,spark){const A=hnA(),e=hnAlive('bomber'),owner=spark.owner||'the Demolitionist',bomberOwn=owner==='the Demolitionist';
  for(const s of A.st)if(px===s.c[0]&&pz===s.c[1]&&py===35){hnHSeatBlow(s,spark);return;}
  let gk=hnGroupOf(px,pz);if(!gk&&px>=-1&&px<=1&&pz>=-174&&pz<=-172)gk='MAT';if(!gk||py!==A.hy)return;
  if((HN_H.armT[gk]||-9)>MP.clock)return;HN_H.armT[gk]=MP.clock+6;
  const c=gk==='MAT'?[0.5,35,-172.5]:hnHGroupCen(gk);
  hnFx('glow',{dur:6},f=>{const g=gk==='MAT'?[-1,1,-174,-172]:A.groups[gk];f.m.position.set((g[0]+g[1])/2+0.5,35.03,(g[2]+g[3])/2+0.5);
    f.m.scale.set(g[1]-g[0]+1,0.06,g[3]-g[2]+1);});
  if(gk==='MAT'&&spark.tag==='demo'){hnHDemoBlast();return;}
  pBlast(c[0],35.3,c[2],2.5,6,owner,{vy:9,self:bomberOwn?e:null,how:'plates'});
  mwS('pg_plunger',c[0],35,c[2]);
  /* a player's plunge while the Demolitionist stands on that network's plates: 20 to him (and the blast to anyone else there) */
  if(!bomberOwn&&e&&!e.dead&&e.hf&&hnHInGroup(e.x,e.z,gk,0.6)&&e.y<36.5){const F=e.hf;hnWin(F,1.6,'station');hnHit(e,20,owner,'station');
    e.st='dazed';e.stT=0;e.dazeT=1.6;e.dazeMul=1;hnLog(F,'stationHit',{gk,owner});}}
function hnHSeatBlow(s,spark){const e=hnAlive('bomber'),owner=spark.owner||'the Demolitionist';
  const sp=hnHSeatPos(s);burstParticles(sp[0],sp[1],sp[2],B.TNT,24,1.2);mwS('pg_plunger',sp[0],sp[1],sp[2]);mpShake(0.5,0.4);
  if(e&&!e.dead&&hnHOnSeat(e,s)&&e.hf){const F=e.hf,demo=spark.tag==='demo';
    const by=demo?'the Demolitionist':(HN.wired[s.k]||'Dan');
    hnWin(F,4.2,demo?'demo':'seat');hnHit(e,20,by,'seat');
    e.st='air';e.kvy=Math.sqrt(2*GRAV*10);e.stT=0;e.after=demo?'untangle':'trace';e.traceS=s.i;e.hrS.blown=1;e.dazeNext=3;
    hnSay(demo?'HEE HEE HEE... HUH?':'WHAT? WHO WIRED MY SEAT?',2,'seat');
    if(!demo&&by==='Dan')MP.stats.splices=(MP.stats.splices|0)+1;
    hnLog(F,demo?'selfDemo':'seatBlast',{st:s.k,by});return;}
  pBlast(sp[0],sp[1]-0.3,sp[2],1.6,6,owner,{vy:6,how:'seat'});}

/* ---- the plunge: a spark from the station's root; the frayed lead throws sparks; the self-demo bridges the gap ---- */
function hnHPlunge(s,owner,demo){const A=hnA();
  const virt=demo?new Set([s.gap.join(',')]):null;
  hnSpark(s.root,12,owner,hnHPlate,{virt,tag:demo?'demo':''});
  /* the frayed end fizzes every plunge (a muted visual tell) */
  const g=s.gap;burstParticles(g[0]+0.5-s.sx*0.4,g[1]+0.2,g[2]+0.5,B.PG_CORD,6,0.6);mwS('pg_fizz',g[0],g[1],g[2]);
  const st=hnProp('bomber',s.k);if(st){st.press=0.35;}
  mwS('pg_plunger',s.c[0],36,s.c[1]);}
/* a station (or DO NOT PUSH) punched by a player or a bot */
function hnHStationHit(prop,dmg,by){if(DIM!=='puppet')return;const k=prop.kind;
  if((HN_H.pressCd[k]||-9)>MP.clock)return;HN_H.pressCd[k]=MP.clock+1.2;
  if(k==='dnp'){hnHDnp(prop,by);return;}
  const s=hnA().st.find(x=>x.k===k);if(!s)return;
  if(hnIsBot(by)&&!(MPF.fight&&MPF.fight.name==='bomber'&&!MPF.fight.over))return;
  hnHPlunge(s,by,false);if(MPF.fight)hnLog(MPF.fight,'playerPlunge',{k,by});}
/* DO NOT PUSH: Dan only. Without Wire Snips (or better) the first punch earns the Demolitionist's demo; a bot gets the boot */
function hnHHasSnips(){return P.inv.some(s=>s&&(s.id===IT.PG_SNIPS||s.id===IT.PG_RSNIPS||s.id===IT.PG_GAUNTLET))||!!(cursorStack&&cursorStack.id===IT.PG_SNIPS);}
function hnHDnp(prop,by){
  if(by!=='Dan'){const a=agByName(by);if(a&&a.e){const b=a.e,dx=b.x-prop.x,dz=b.z-prop.z,l=Math.hypot(dx,dz)||1;hnPush(b,dx/l*7,4,dz/l*7);
      mwS('pg_boot',b.x,b.y,b.z);hnPuff(prop.x,35.4,prop.z-1.2,0.5,0.5,0.4);if(typeof agEvent==='function')agEvent(a,'A boot flew out of the hatch behind DO NOT PUSH and hit you in the face',5);}
    return;}
  const F=MPF.fight;
  if(F&&F.name==='bomber'&&!F.over){hnHPlungeDnp(by);return;}
  if(MP.dead.bomber){hnHPlungeDnp(by);return;}
  if(HN_H.demoT>0)return;
  if(!hnHHasSnips()&&!HN_H.demoDone){hnHDemoStart();return;}
  hnFightStart('bomber');}
function hnHPlungeDnp(owner){const D=hnA().dnp;hnSpark(D.cord,12,owner,hnHPlate,{tag:''});mwS('pg_plunger',D.c[0],36,D.c[1]);}
/* the Demolitionist's demo for an under-geared Dan: he pops out behind the plunger, giggles, slams it himself, the spark crawls into the
   welcome mat under Dan and blows him into the air (never below 4 HP). "COME BACK WHEN YOU CAN CUT A WIRE!" */
function hnHDemoStart(){HN_H.demoDone=true;HN_H.demoT=6.5;const D=hnA().dnp;
  spawnMob('pgbomber',D.hatch[0]+0.5,33.5,D.hatch[1]+0.5);const e=entities[entities.length-1];
  e.demo=1;e.pinv=99;e.pkeep=1;e.st='demoPop';e.stT=0;e.yaw=Math.PI;e.hrS={};HN_H.demoE=e;hnLog(null,'demo',{});}
function hnHDemoBlast(){if(!P||P.dead)return;const A=hnA();
  if(hnHInGroup(P.x,P.z,'MAT',0.4)&&P.y<37){const dmg=Math.max(0,Math.min(6,Math.floor(P.hp-4)));
    if(dmg>0)purgHit(P,dmg,'the Demolitionist','plates',{force:1,kx:0,kz:-1});P.vy=Math.max(P.vy,11);P.fallD=0;}
  burstParticles(0.5,35.3,-172.5,B.TNT,20,1.1);mwS('pg_plunger',0.5,35,-172.5);mpShake(0.4,0.4);}

/* ---- the sticky bundle (P2) ---- */
function hnHLob(e,t){const tb=hnFoeBody(t),T=1.1,lx=(tb.vx||0)*T*0.7,lz=(tb.vz||0)*T*0.7;
  const tx=tb.x+lx,ty=(t===P?P.y:tb.y)+0.2,tz=tb.z+lz,fx=e.x,fy=e.y+1.6,fz=e.z,v=aimLob(fx,fy,fz,tx,ty,tz,T);
  puSpawn('bundle',fx,fy,fz,v[0],v[1],v[2],'the Demolitionist',{src:e,r:0.45,life:6});hnRing(tx,Math.floor(ty)-0.02,tz,1.1,T);
  e.hrS.throwT=1;mwS('pg_whoosh',fx,fy,fz);}
/* stick a bundle on a creature (or the floor): a pgbundle prop rides the host and the fuse burns */
function hnHStick(host,owner,x,y,z){const B0={host,owner,fuse:host?4:3,x,y,z,e:null,cd:0,beep:0};
  spawnMob('pgbundle',x,y,z);const p=entities[entities.length-1];p.kind='bundle';p.hnB=B0;p.pkeep=1;B0.e=p;
  p.relay=(d,by)=>{const h=B0.host;if(h&&h!==P&&!h.dead&&h.t==='mob'){const pb=HIT_BY,ph=HIT_HOW;HIT_BY=by;HIT_HOW=ph;try{hurtMob(h,d,0,0);}finally{HIT_BY=pb;HIT_HOW=ph;}}};
  HN_H.bundles.push(B0);if(host===P)hnWick(true);
  const e=hnAlive('bomber');if(host&&e&&host===e){e.st='panic';e.stT=0;e.hrS.panic=1;hnSay('NO NO NO NO HEE HEE NO',1.6,'panic');}
  return B0;}
function hnHBundleTick(dt){const e=hnAlive('bomber');
  for(const b of HN_H.bundles){if(b.dead)continue;b.fuse-=dt;b.cd-=dt;b.beep-=dt;
    const h=b.host;
    if(h&&(h===P?P.dead:(h.dead||(h.A&&(h.A.dead||!h.A.online))))){b.host=null;b.fuse=Math.min(b.fuse,3);}
    const pos=b.host?(b.host===P?[P.x,P.y+1.1,P.z]:[b.host.x,b.host.y+(b.host.h||1.6)*0.6,b.host.z]):[b.x,b.y,b.z];
    if(b.host){b.x=pos[0];b.y=pos[1];b.z=pos[2];}
    if(b.e&&!b.e.dead){b.e.x=pos[0];b.e.y=pos[1]-0.2;b.e.z=pos[2];}
    if(b.beep<=0){b.beep=Math.max(0.12,b.fuse*0.18);mwS('pg_fizz',pos[0],pos[1],pos[2]);}
    /* passing: the carrier's melee hit (Dan: read at the swing) or a bot carrier touching any other creature */
    if(b.host&&b.cd<=0&&b.host!==P&&b.host.bot){const t=hnHTouchFoe(b.host,0.95,true);if(t){hnHPass(b,t,b.host.A.name);}}
    if(b.host&&e&&b.host===e&&b.cd<=0){const t=hnHTouchFoe(e,1.05,false);if(t)hnHPass(b,t,'the Demolitionist');}
    if(b.fuse<=0)hnHBundleBlow(b);}
  if(HN_H.bundles.some(b=>b.dead))HN_H.bundles=HN_H.bundles.filter(b=>!b.dead);
  hnWick(HN_H.bundles.some(b=>b.host===P));}
function hnHTouchFoe(src,r,anyMob){const o=[];if(P&&!P.dead&&src!==P)o.push(P);
  for(const m of entities){if(m.dead||m.t!=='mob'||m===src)continue;const T=MOBT[m.mt];if(T&&T.prop)continue;if(!anyMob&&!m.bot)continue;o.push(m);}
  for(const t of o){const tx=t===P?P.x:t.x,tz=t===P?P.z:t.z,ty=t===P?P.y:t.y;if(Math.hypot(tx-src.x,tz-src.z)<r&&Math.abs(ty-src.y)<1.6)return t;}return null;}
function hnHPass(b,t,by){b.host=t;b.owner=by;b.cd=0.6;mwS('pg_honk',b.x,b.y,b.z);
  const e=hnAlive('bomber');if(e&&t===e){e.st='panic';e.stT=0;e.hrS.panic=1;}
  if(MPF.fight)hnLog(MPF.fight,'pass',{to:hnFoeName(t)||(t.mt||'?'),by});}
function hnHBundleBlow(b){b.dead=1;if(b.e&&!b.e.dead)removeEnt(b.e);const e=hnAlive('bomber'),h=b.host;
  burstParticles(b.x,b.y,b.z,B.TNT,22,1.1);mpShake(0.35,0.35);
  if(h&&e&&h===e){if(e.hf){const F=e.hf;hnWin(F,2.2,'bundle');hnHit(e,20,b.owner||'Dan',b.owner==='the Demolitionist'?'bundle-self':'bundle');}
    e.st='dazed';e.stT=0;e.dazeT=2;e.dazeMul=1.5;e.hrS.panic=0;hnSay('...hee.',1.2);if(e.hf)hnLog(e.hf,'bundleOnBomber',{by:b.owner});return;}
  if(h&&(h===P||h.bot)){purgHit(h,7,'the Demolitionist','bundle',{force:1,kx:0,kz:0});hnPush(h,0,10,0);if(h===P)hnWick(false);return;}
  if(h&&h.t==='mob'){purgHit(h,7,b.owner||'the Demolitionist','bundle',{force:1});return;}
  pBlast(b.x,b.y,b.z,2.5,5,'the Demolitionist',{self:e,how:'bundle'});}
/* Dan's melee swing passes a bundle stuck on him to whatever he hits (read on the swing frame) */
function hnHSwing(){if(!P||P.dead)return;const sw=P.swing>=0.99&&HN.swing<0.99;HN.swing=P.swing;if(!sw)return;
  const b=HN_H.bundles.find(x=>!x.dead&&x.host===P&&x.cd<=0);if(!b)return;
  const E=eyePos(),L=lookDir(),t=pickMob(E[0],E[1],E[2],L[0],L[1],L[2],3.4);
  if(t&&t.e&&!t.e.dead&&t.e.t==='mob'&&!(MOBT[t.e.mt]&&MOBT[t.e.mt].prop)){hnHPass(b,t.e,'Dan');if(b.host!==P)hnWick(false);}}
/* the first-person tell while a bundle burns on Dan's back: smoke curling at the top edge and a red wick tip */
var HN_WICK=null;
function hnWick(on){if(typeof document==='undefined'||!document.body)return;
  if(!HN_WICK){if(!on)return;try{HN_WICK=document.createElement('div');HN_WICK.id='hnwick';
    HN_WICK.style.cssText='position:fixed;left:0;right:0;top:0;height:16%;pointer-events:none;z-index:6;display:none;'+
      'background:linear-gradient(180deg,rgba(185,180,170,.62),rgba(150,145,140,.28) 55%,rgba(120,120,120,0));';
    /* the bundle strapped to your chest, seen from inside: the stick's top edge, the wick, its spark (it can't be missed) */
    HN_WICK.innerHTML='<div style="position:absolute;right:16%;top:7%;width:14px;height:78px;background:#4a3420;border:2px solid #241608;transform:rotate(18deg)">'+
      '<div style="position:absolute;top:-16px;left:-7px;width:26px;height:26px;border-radius:13px;background:#ff4a1a;box-shadow:0 0 22px 8px #ffb020"></div></div>'+
      '<div style="position:absolute;right:13%;top:13%;width:64px;height:120px;background:#b0201a;border:3px solid #5a0c08;transform:rotate(18deg)"></div>';
    document.body.appendChild(HN_WICK);}catch(err){HN_WICK=null;return;}}
  if(HN_WICK.style)HN_WICK.style.display=on?'block':'none';}
PREG.proj.bundle={r:0.45,life:6,
  mesh:()=>hnPoolGet('bundleM',()=>hnHBundleMesh()),
  hit:(p,t)=>{const T=t.t==='mob'?MOBT[t.mt]:null;if(T&&T.prop)return false;
    if(t===P&&p.owner==='Dan'&&!p.hitOwner)return false;
    hnHStick(t,p.owner==='the Demolitionist'?'the Demolitionist':p.owner,p.x,p.y,p.z);mwS('pg_splat',p.x,p.y,p.z);return true;},
  land:(p,bx,by,bz)=>{hnHStick(null,p.owner,p.x,by+1.2,p.z);return true;}};
function hnHBundleMesh(){const g=new THREE.Group(),red=hnMat(0xc0283a),felt=hnMat(0x6a5a3a),w=hnMat(0xf4f1e6),k=hnMat(0x101010);
  for(let i=-1;i<=1;i++)hnB(g,0.12,0.42,0.12,red,i*0.13,0,0);hnB(g,0.44,0.16,0.18,felt,0,0,0);
  hnB(g,0.1,0.1,0.06,w,-0.08,0.1,0.1);hnB(g,0.1,0.1,0.06,w,0.08,0.1,0.1);hnB(g,0.04,0.04,0.03,k,-0.07,0.11,0.14);hnB(g,0.04,0.04,0.03,k,0.1,0.09,0.14);
  hnB(g,0.03,0.18,0.03,hnMat(0x3a2a1a),0.02,0.29,0);return g;}

/* ---- the Big One and its fuse (P3) ---- */
function hnHFuseStart(from){const A=hnA();HN_H.fuse={i:from||0,acc:0,stop:false,gap:-1};HN.fuseSpark={cell:A.fuse[from||0]};mwS('pg_spark');}
function hnHFuseTick(dt,e){const A=hnA(),f=HN_H.fuse;if(!f||f.stop)return;f.acc+=dt*3;
  while(f.acc>=1){f.acc-=1;const n=f.i+1;
    if(n>=A.fuse.length){f.stop=true;f.done=true;HN.fuseSpark=null;hnHBigBoom(e);return;}
    const c=A.fuse[n];if(!hnIsCord(c[0],c[1],c[2])){f.stop=true;f.gap=n;HN.fuseSpark={cell:A.fuse[f.i]};hnHCutSeen(e,n);return;}
    f.i=n;HN.fuseSpark={cell:c};hnSparkVis(c);if(f.i%3===0)mwS('pg_spark',c[0],c[1],c[2]);}}
function hnHBigBoom(e){const A=hnA(),bx=A.bigone[0]+0.5,bz=A.bigone[1]+0.5;
  pBlast(bx,36.5,bz,12,16,'the Demolitionist',{vy:12,self:e,how:'bigone'});mpShake(1.0,0.8);if(typeof NUKE!=='undefined')NUKE.flash=Math.max(NUKE.flash,0.35);
  for(let k=0;k<6;k++)hnPuff(bx+(k%3-1)*2,37+k*0.6,bz+((k>>1)%2-0.5)*2,2.2,2.6,1.6);
  const bo=hnProp('bomber','bigone');if(bo)removeEnt(bo);
  if(e&&!e.dead){e.st='hidden';e.stT=0;e.after='again';e.hidT=2.2;}
  if(MPF.fight)hnLog(MPF.fight,'bigOneBlew',{});}
function hnHCutSeen(e,gapIdx){if(!e||e.dead||!e.hf)return;if(e.st==='bomb'||e.st==='climbBomb'){e.st='toCut';e.stT=0;e.cutIdx=gapIdx;hnSay('HEY! MY FUSE!',1.4,'cut');}}
function hnHBigOneSpawn(){const A=hnA();let bo=hnProp('bomber','bigone');if(bo&&!bo.dead)return bo;
  spawnMob('pgbigone',A.bigone[0]+0.5,35,A.bigone[1]+0.5);bo=entities[entities.length-1];Object.assign(bo,{kind:'bigone',hnArena:'bomber',pkeep:1,yaw:0,
    relay:(d,by)=>{}});HN.props.bomber.push(bo);return bo;}

/* ---- arena props and decorations ---- */
HN_PROPS.bomber=function(spawn){const A=hnA();
  for(const s of A.st){const e=spawn('pgstation',s.c[0]+0.5,36,s.c[1]+0.5,{kind:s.k,col:s.col});e.relay=(d,by)=>hnHStationHit(e,d,by);}
  const D=hnA().dnp,dn=spawn('pgstation',D.c[0]+0.5,36,D.c[1]+0.5,{kind:'dnp',col:'#d01818',big:1});dn.relay=(d,by)=>hnHStationHit(dn,d,by);
  const lv=spawn('pgcleat',A.lever[0]+0.5,36,A.lever[2]+0.5,{kind:'lever'});lv.relay=(d,by)=>hnHLever(lv,d,by);};
function hnHLever(lv,d,by){if(lv.pulled>0)return;if(!hnShears(by,2)){hnSay('It will not budge. It wants something that cuts.',1.6,'lever');return;}
  lv.pulled=1.2;mwS('pg_trapdoor',lv.x,lv.y,lv.z);const e=hnAlive('bomber');
  if(e&&e.hf&&!e.hf.over&&!e.hf.dying&&e.st==='bomb'&&!HN_H.leverUsed){HN_H.leverUsed=true;e.st='trapdoor';e.stT=0;e.trapBy=by;e.hrS.drop=1;
    hnLog(e.hf,'trapdoor',{by});}
  else{const d0=HN.deco.bomber;if(d0&&d0.parts.hatch6)d0.parts.hatch6.flip=1.0;}}
HN_DECO.bomber=function(d){const A=hnA(),g=d.g;
  const lid=hnMat(0x2a2422),rim=hnMat(0x6a5a4a),blk=hnBasic(0x000000);
  d.parts.hatches=[];
  A.hatches.forEach((h,i)=>{const p=new THREE.Group();p.position.set(h[0]+0.5,35.0,h[1]+0.5);g.add(p);
    hnB(p,1.3,0.06,1.3,rim,0,0.02,0);const pit=hnB(p,1.0,0.02,1.0,blk,0,0.03,0);const hinge=new THREE.Group();hinge.position.set(0,0.07,-0.5);p.add(hinge);
    const l=hnB(hinge,1.0,0.07,1.0,lid,0,0,0.5);d.parts.hatches.push({g:p,hinge,open:0,flip:0});if(i===6)d.parts.hatch6=d.parts.hatches[6];});
  /* station pennants and the plate-group pennants in the network colour */
  for(const s of A.st){const pole=hnB(g,0.06,1.6,0.06,hnMat(0x3a3a3a),s.c[0]+0.5+s.sx*1.2,36.8,s.c[1]+0.5+0.9);
    const fl=hnB(g,0.6,0.36,0.03,hnMat(hnHex(s.col)),s.c[0]+0.5+s.sx*1.2+0.3,37.4,s.c[1]+0.5+0.9);
    s.flag=fl;for(const gk of s.groups){const c=hnHGroupCen(gk),gg=A.groups[gk];
      hnB(g,0.04,0.7,0.04,hnMat(0x3a3a3a),gg[1]+1.1,35.35,gg[3]+1.1);hnB(g,0.32,0.2,0.02,fl.material,gg[1]+1.27,35.6,gg[3]+1.1);}}
  /* DO NOT PUSH: a painted plate on the plinth */
  const cv=hnCanvas(64,24,c=>{c.fillStyle='#f4e04a';c.fillRect(0,0,64,24);c.fillStyle='#101010';c.font='bold 10px monospace';c.fillText('DO NOT',14,10);c.fillText('PUSH',20,21);});
  const sign=new THREE.Mesh(hnUnit(),hnFaceMat(cv));sign.scale.set(0.9,0.34,0.04);sign.position.set(0.5,35.55,-175.98);g.add(sign);
  /* the Trap Release post: a small sign */
  const cv2=hnCanvas(64,24,c=>{c.fillStyle='#7a1414';c.fillRect(0,0,64,24);c.fillStyle='#fff';c.font='bold 9px monospace';c.fillText('TRAP',18,10);c.fillText('RELEASE',8,21);});
  const s2=new THREE.Mesh(hnUnit(),hnFaceMat(cv2));s2.scale.set(0.8,0.3,0.04);s2.position.set(-31.5,36.1,-160.48);g.add(s2);
  d.tick=(dt,dd)=>{for(const h of dd.parts.hatches){h.open=Math.max(0,h.open-dt*1.5);if(h.flip>0){h.flip=Math.max(0,h.flip-dt);}
      h.hinge.rotation.x=-Math.min(1.6,Math.max(h.open,h.flip>0?1.2:0)*1.6);}};};
function hnHOpenHatch(x,z,t){const d=HN.deco.bomber;if(!d)return;const A=hnA();let bi=0,bd=1e9;A.hatches.forEach((h,i)=>{const dd=Math.hypot(h[0]+0.5-x,h[1]+0.5-z);if(dd<bd){bd=dd;bi=i;}});
  d.parts.hatches[bi].open=Math.max(d.parts.hatches[bi].open,t||1);}

/* ---- prop meshes: plunger stations, DO NOT PUSH, the Trap Release lever / Lamp Cleat, the Big One, bundles ---- */
PREG.mesh.pgstation=function(G,mats){const box=hnMat(0x7a1c1c),steel=hnMat(0x9a9aa2),wood=hnMat(0x6b4a2a);
  hnB(G,0.6,0.42,0.5,box,0,0.21,0);hnB(G,0.5,0.06,0.4,steel,0,0.45,0);
  const h=new THREE.Group();h.position.y=0.45;G.add(h);hnB(h,0.07,0.6,0.07,steel,0,0.3,0);hnB(h,0.7,0.09,0.09,wood,0,0.62,0);
  const legs=[];legs.handle=h;return {G,legs,mats};};
PREG.mesh.pgcleat=function(G,mats){const wood=hnMat(0x7a5a32),iron=hnMat(0x3a3a40),rope=hnMat(0xd8c890);
  const lever=new THREE.Group();G.add(lever);hnB(lever,0.3,0.25,0.3,iron,0,0.12,0);const arm=new THREE.Group();arm.position.y=0.25;lever.add(arm);
  hnB(arm,0.06,0.55,0.06,iron,0,0.27,0);hnB(arm,0.16,0.16,0.16,hnMat(0xd02020),0,0.58,0);
  const cleat=new THREE.Group();G.add(cleat);hnB(cleat,0.5,0.1,0.14,wood,0,0.3,0);hnB(cleat,0.12,0.3,0.12,wood,0,0.15,0);hnB(cleat,0.08,0.5,0.08,rope,0.12,0.45,0);
  const legs=[];legs.lever=lever;legs.arm=arm;legs.cleat=cleat;return {G,legs,mats};};
PREG.mesh.pgbigone=function(G,mats){const blk=hnMat(0x141418),hi=hnMat(0x2a2a30),fz=hnMat(0x6a5a3a);
  hnB(G,2.4,2.4,2.4,blk,0,1.3,0);hnB(G,2.8,1.8,1.8,blk,0,1.3,0);hnB(G,1.8,1.8,2.8,blk,0,1.3,0);hnB(G,1.8,2.8,1.8,blk,0,1.3,0);
  hnB(G,0.5,0.4,0.5,hi,0,2.75,0);const fuse=hnB(G,0.1,0.6,0.1,fz,0.15,3.15,0);hnB(G,0.5,0.5,0.06,hnBasic(0xf4f1e6),-0.6,1.7,1.42);
  const legs=[];legs.fuse=fuse;return {G,legs,mats};};
PREG.mesh.pgbundle=function(G,mats){G.add(hnHBundleMesh());return {G,legs:[],mats};};
/* static prop brains: stay put (relays take every hit; no batting), animate the handle / lever */
PREG.brain.pgstation=function(e,dt){e.vx=e.vy=e.vz=0;if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);
  if(!e._dec){e._dec=1;if(e.big){e.mesh.scale.set(1.5,1.5,1.5);}else if(e.legs&&e.legs.handle&&e.col){const fl=hnB(e.legs.handle,0.3,0.18,0.02,hnMat(hnHex(e.col)),0.2,0.75,0);}}
  if(e.press>0){e.press=Math.max(0,e.press-dt);}const h=e.legs&&e.legs.handle;if(h)h.position.y=0.45-(e.press>0?0.3:0)+(e.wind||0)*0.15;}};
PREG.brain.pgcleat=function(e,dt){e.vx=e.vy=e.vz=0;if(!e.mesh)return;e.mesh.position.set(e.x,e.y,e.z);const L=e.legs||{};
  if(L.lever)L.lever.visible=e.kind==='lever';if(L.cleat)L.cleat.visible=e.kind!=='lever';
  if(e.pulled>0){e.pulled=Math.max(0,e.pulled-dt);}if(L.arm)L.arm.rotation.z=e.pulled>0||e.down?1.1:0;};
PREG.brain.pgbigone=function(e,dt){e.vx=e.vy=e.vz=0;if(!e.mesh)return;e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y+=e.roll?dt*2:0;
  if(e.legs&&e.legs.fuse)e.legs.fuse.scale.y=0.6+0.1*Math.sin(MP.clock*20);};
PREG.brain.pgbundle=function(e,dt){if(puBatMove(e,dt))return;e.vx=e.vy=e.vz=0;if(!e.hnB||e.hnB.dead){removeEnt(e);return;}
  if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y+=dt*3;}};

/* ---- the Demolitionist's OG body: a bomb-disposal suit: padded olive suit, a dome helmet with painted hazard stripes and a dark
   visor slit (his eyes peer out of it; the chin guard flaps when he giggles), a T-plunger in hand, a satchel of dynamite in P2.
   Authored at 1/1.5 (spawnMob scales bosses 1.5/1.4/1.5). ---- */
PREG.mesh.pgbomber=function(G,mats){const suit=new THREE.MeshLambertMaterial({color:0x5a6a2e}),pad=new THREE.MeshLambertMaterial({color:0x48562a}),
    pants=new THREE.MeshLambertMaterial({color:0x48562a}),shell=hnMat(0x6a7a3a),dk=hnMat(0x3e4a22),visor=hnMat(0x0e1216),red=hnMat(0xd42a2a),
    w=hnMat(0xf6f3ea),k=hnMat(0x0a0a0a),wood=hnMat(0x6b4a2a);
  mats.push(suit,pad,pants);
  const body=new THREE.Group();G.add(body);
  const lg=[];for(const s of [-1,1]){const l=new THREE.Group();l.position.set(s*0.12,0.42,0);body.add(l);hnB(l,0.16,0.42,0.17,pants,0,-0.21,0);hnB(l,0.18,0.09,0.24,k,0,-0.42,0.04);lg.push(l);}
  hnB(body,0.5,0.54,0.34,suit,0,0.68,0);hnB(body,0.4,0.36,0.04,pad,0,0.68,0.18);hnB(body,0.56,0.12,0.38,pad,0,0.9,0);   /* padded suit, chest plate, collar */
  const head=new THREE.Group();head.position.set(0,0.98,0);body.add(head);
  const helmet=new THREE.Group();head.add(helmet);
  hnB(helmet,0.44,0.4,0.42,shell,0,0.2,-0.01);hnB(helmet,0.34,0.08,0.32,shell,0,0.43,-0.02);                 /* the dome */
  const hz=hnCanvas(64,8,c=>{c.fillStyle='#f2c81e';c.fillRect(0,0,64,8);c.fillStyle='#141414';for(let y=0;y<8;y++)for(let x=0;x<64;x++)if(((x+y)>>2)%2===0)c.fillRect(x,y,1,1);});
  const hm=hnFaceMat(hz);mats.push(hm);const band=new THREE.Mesh(hnUnit(),hm);band.scale.set(0.45,0.06,0.43);band.position.set(0,0.395,-0.01);helmet.add(band);   /* hazard stripes */
  hnB(helmet,0.36,0.08,0.02,visor,0,0.21,0.205);hnB(helmet,0.42,0.12,0.04,dk,0,0.32,0.21);                    /* the visor slit, the brow plate */
  const jaw=new THREE.Group();jaw.position.set(0,0.02,-0.12);head.add(jaw);hnB(jaw,0.42,0.12,0.04,dk,0,0.07,0.33);   /* the chin guard */
  const eyes=hnEyes(head,0.08,0.075,0.21,0.22,w,k);
  const arms=[];for(const s of [-1,1]){const a=new THREE.Group();a.position.set(s*0.28,0.88,0);body.add(a);hnB(a,0.13,0.38,0.13,suit,0,-0.19,0);hnB(a,0.13,0.11,0.13,k,0,-0.4,0);arms.push(a);}
  const plunger=new THREE.Group();plunger.position.set(0,-0.42,0.06);arms[1].add(plunger);hnB(plunger,0.05,0.42,0.05,wood,0,0.12,0);hnB(plunger,0.28,0.06,0.06,wood,0,0.34,0);
  const satchel=new THREE.Group();satchel.position.set(-0.26,0.6,-0.12);body.add(satchel);hnB(satchel,0.16,0.22,0.2,hnMat(0x5a3a1a),0,0,0);
  for(let i=0;i<3;i++)hnB(satchel,0.04,0.2,0.04,red,-0.02,0.12,-0.06+i*0.06);satchel.visible=false;
  const legs=[];Object.assign(legs,{body,head,jaw,eyes,helmet,arms,plunger,satchel,lg});
  G.scale.set(1,1,1);return {G,legs,mats};};
function hnHAnim(e,dt,tx,ty,tz,lock){const L=e.legs,t=MP.clock;if(!e.mesh)return;
  e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;e.mesh.visible=e.st!=='hidden'&&e.st!=='underground';
  if(!e.pdisp&&e.mats){e.pdisp=1;e.pmats=e.mats.slice();}
  hnHHr(e,dt);if(!L||!L.head)return;
  if(L.helmet)L.helmet.rotation.z=Math.sin(t*23)*0.03;                      /* the helmet jitters with his giggle */
  const run=e.moving?Math.sin(t*16)*0.7:0;L.lg[0].rotation.x=run;L.lg[1].rotation.x=-run;
  let jaw=0.08+Math.abs(Math.sin(t*9))*0.12,arm=0,sh=0,bodyR=0,bob=0;
  switch(e.st){case 'windup':sh=Math.abs(Math.sin(t*14))*0.12;arm=-1.6;jaw=0.35;break;
    case 'plunge':arm=-0.4;jaw=0.5;break;case 'dazed':bodyR=Math.sin(t*5)*0.25;jaw=0.3;break;
    case 'trace':case 'snip':case 'splice':bodyR=1.15;break;case 'panic':arm=-2.6+Math.sin(t*20)*0.6;jaw=0.55;break;
    case 'bomb':case 'lightFuse':sh=Math.abs(Math.sin(t*10))*0.08;arm=e.st==='lightFuse'?-1.2:0;break;
    case 'air':bodyR=Math.sin(t*12)*0.6;arm=-2.4;jaw=0.6;break;case 'gloat':bob=Math.abs(Math.sin(t*8))*0.15;jaw=0.4;break;}
  L.body.position.y=sh+bob;L.body.rotation.x=bodyR;hnJaw(L.jaw,jaw);
  L.arms[1].rotation.x=arm;L.arms[0].rotation.x=e.st==='panic'?-2.6-Math.sin(t*20)*0.6:(e.st==='air'?-2.4:0);
  L.plunger.visible=e.st!=='panic';L.satchel.visible=!!(e.hf&&e.hf.phase>=2);
  hnLook(L.eyes,e,tx,ty,tz,lock,t);}
function hnHHr(e,dt){const s=e.hrS;if(s){s.plunge=e.st==='windup'?0.5:(e.st==='plunge'?1:0);s.seated=(e.st==='bomb'||e.st==='lightFuse')?1:0;s.splice=(e.st==='splice'||e.st==='snip'||e.st==='trace')?1:0;
    if(e.st!=='air')s.blown=0;if(e.st!=='panic')s.panic=0;if(e.st!=='trapdoor'&&e.st!=='underground')s.drop=0;if(s.throwT>0)s.throwT=Math.max(0,s.throwT-dt*2);}}

/* ---- damage multipliers (bible 10.1): braced x0.25, running x1, dazed x1.5 (melee), back turned x2 ---- */
HN_MULT.pgbomber=function(e,F,d,by,how){if(e.st==='hidden'||e.st==='underground'||e.st==='trapdoor')return -1;
  if(e.st==='windup'||e.st==='plunge'||e.st==='post')return d*0.25;
  if(e.st==='dazed')return how==='melee'?d*(e.dazeMul||1.5):d;
  if(e.st==='trace'||e.st==='snip'||e.st==='splice')return d*2;
  return d;};

/* ---- the fight hooks ---- */
HN_SPAWN.bomber=F=>{const D=hnA().dnp;return [D.hatch[0]+0.5,35,D.hatch[1]+0.5,Math.PI];};
HN_INIT.bomber=(F,e)=>{hnHReset();e.st='intro';e.stT=0;e.y=35;hnHOpenHatch(e.x,e.z,1.5);F.data.plunges=0;};
HN_CAM.bomber=(F,t)=>hnCamAt(F,t,[2.4,1.6,4.6]);
HN_GO.bomber=(F,e)=>{e.st='dive';e.stT=0;hnSay('HEE HEE HEE HEE!',1.6);};
HN_PHASE.bomber=(F,e,ph)=>{if(ph===2){hnSay('SHORTCUTS!',2);e.st='dive';e.stT=0;F.data.lobT=2;}
  if(ph===3){hnSay('...and now the BIG one.',2.2);e.st='dive';e.stT=0;e.after='rollBomb';HN_H.fuse=null;HN.fuseSpark=null;hnSparkClear();}};
HN_PHRESET.bomber=(F,e)=>{hnHReset();if(e&&!e.dead){e.st='gloat';e.stT=0;e.after=F.phase===3?'rollBomb':null;}const bo=hnProp('bomber','bigone');if(bo)removeEnt(bo);};
HN_GLOAT.bomber=(F,e)=>{hnSay('HEE HEE HEE HEE HEE!',2.6,'gloat');};
HN_HINT.bomber=F=>{const A=hnA();if(F.phase>=3)return {x:A.lever[0]+0.5,y:36.3,z:A.lever[2]+0.5,boss:'bomber',what:'lever'};
  const at=P.deathPos||[P.x,P.y,P.z];let best=A.st[0],bd=1e9;for(const s of A.st){const d=Math.hypot(s.c[0]-at[0],s.c[1]-at[2]);if(d<bd){bd=d;best=s;}}
  return {x:best.gap[0]+0.5,y:35.05,z:best.gap[2]+0.5,boss:'bomber',what:'gap',station:best.k};};
HN_END.bomber=(F,why)=>{hnHReset();const bo=hnProp('bomber','bigone');if(bo)removeEnt(bo);};
HN_DIE.bomber=(F,e)=>{e.st='dieClimb';e.stT=0;HN_H.fuse=null;HN.fuseSpark=null;for(const b of HN_H.bundles)b.dead=1;hnSay('...hee.',1.5);};

/* ---- the brain ---- */
function hnHMove(e,tx,tz,spd,dt){const dx=tx-e.x,dz=tz-e.z,d=Math.hypot(dx,dz);if(d<0.08){e.moving=false;return true;}
  const s=Math.min(d,spd*dt);e.x+=dx/d*s;e.z+=dz/d*s;e.yaw=Math.atan2(dx,dz);e.moving=true;
  const gy=hnHGround(e.x,e.z);e.y+=(gy-e.y)*Math.min(1,dt*14);return d-s<0.08;}
function hnHHide(e,x,z){e.x=x;e.z=z;e.y=33.4;e.st='hidden';e.moving=false;}
PREG.brain.pgbomber=function(e,dt,T){
  e.vx=e.vy=e.vz=0;
  if(e.demo){hnHDemoBrain(e,dt);return;}
  const F=e.hf;if(!F||F.over){if(!e.dead&&!F)removeEnt(e);return;}
  const A=hnA();e.stT+=dt;
  const foe=purgFoe(e,40);const fx=foe?(foe===P?P.x:foe.x):e.x,fy=foe?(foe===P?P.y+1.5:foe.y+1.5):e.y+1.5,fz=foe?(foe===P?P.z:foe.z):e.z+1;
  let lock=0;
  if(CUT.on&&CUT.script){hnHAnim(e,dt,fx,fy,fz,0);return;}
  if(F.intro){e.y=Math.min(35,e.y+dt*3);hnHAnim(e,dt,P.x,P.y+1.5,P.z,1);return;}
  /* contact: 2 and a shove if you hug him */
  if(e.st!=='hidden'&&e.st!=='air'&&!F.dying&&P&&!P.dead&&Math.hypot(P.x-e.x,P.z-e.z)<0.85&&Math.abs(P.y-e.y)<1.5&&(F.data.hugT||0)<=MP.clock){
    F.data.hugT=MP.clock+1;purgHit(P,2,'the Demolitionist','shove',{src:e});}
  if(F.dying){hnHDying(e,F,dt);hnHAnim(e,dt,fx,fy,fz,0);return;}
  if(e.pstagger>MP.clock&&e.st!=='hidden'&&e.st!=='air'){e.stT-=dt;hnHAnim(e,dt,fx,fy,fz,0);return;}       /* a Chop shockwave: staggered 1 s */
  if(F.gloat>0||F.wait){if(e.st!=='gloat'){e.st='gloat';e.stT=0;const h=hnHHatchPos(A.dnp.hatch);e.x=h[0]+1.2;e.z=h[2];e.y=35;e.yaw=Math.PI;}
    hnHAnim(e,dt,P.x,P.y+1.5,P.z,0.5);return;}
  if(e.st==='gloat'){e.st=F.phase===3?'rollBomb':'dive';e.after=null;e.stT=0;e.diveH=null;}
  /* P2: a sticky bundle every 4 s while he is up and not on a plunger */
  if(F.phase===2&&!hnBlind(e)){F.data.lobT=(F.data.lobT||4)-dt;
    if(F.data.lobT<=0&&(e.st==='run'||e.st==='post'||e.st==='pop')&&foe){F.data.lobT=4;hnHLob(e,foe);}}
  if(F.phase===3)hnHFuseTick(dt,e);
  const blind=hnBlind(e);
  /* a pie in the face: the next plunge goes to a random station (and a wind-up in progress switches to one) */
  if(blind&&!e._blindSeen){e._blindSeen=1;e.pieRand=1;if(e.st==='windup'){e.tgt=(MPF.tick*13+7)%4;hnLog(F,'pied',{});}}
  if(!blind)e._blindSeen=0;
  switch(e.st){
    case 'dive':{const h=e.diveH||hnHHatchPos(hnHNearHatch(e.x,e.z));if(hnHMove(e,h[0],h[2],4.6,dt)||e.stT>4){hnHOpenHatch(h[0],h[2],1);e.st='sink';e.stT=0;}break;}
    case 'sink':e.y-=dt*4;if(e.stT>0.4){hnHHide(e,e.x,e.z);e.hidT=F.phase===2?5:3+((MPF.tick*7)%3);e.stT=0;}break;
    case 'hidden':{if(e.stT<(e.hidT||3))break;
      if(e.after==='again'){e.after='rollBomb';hnSay('AGAIN!',1.6);}
      if(e.after==='rollBomb'){const h=hnHHatchPos(A.bigone);e.x=h[0];e.z=h[2]+1.6;e.y=35;e.st='rollBomb';e.stT=0;e.after=null;hnHOpenHatch(h[0],h[2],2);break;}
      if(F.phase===3){e.st='rollBomb';e.stT=0;break;}
      const si=(blind||e.pieRand)?((MPF.tick*13)%4):hnHPick();e.pieRand=0;e.tgt=si;const s=A.st[si],h=hnHHatchPos(s.hatch);
      e.x=h[0];e.z=h[2];e.y=33.6;e.st='pop';e.stT=0;hnHOpenHatch(h[0],h[2],1.2);mwS('pg_hiss',h[0],35,h[2]);break;}
    case 'pop':e.y=Math.min(35,e.y+dt*5);if(e.stT>0.45){e.st='run';e.stT=0;}break;
    case 'run':{const s=A.st[e.tgt|0],sp=hnHSeatPos(s);
      const edge=[s.c[0]+0.5-s.sx*1.6,35,s.c[1]+0.5];
      if(hnHMove(e,edge[0],edge[2],4.4,dt)||e.stT>6){e.st='climb';e.stT=0;}break;}
    case 'climb':{const s=A.st[e.tgt|0],sp=hnHSeatPos(s);const u=Math.min(1,e.stT/0.35);e.x+=(sp[0]-e.x)*Math.min(1,dt*10);e.z+=(sp[2]-e.z)*Math.min(1,dt*10);
      e.y=35+u+Math.sin(u*Math.PI)*0.4;if(u>=1){e.x=sp[0];e.z=sp[2];e.y=36;e.st='windup';e.stT=0;e.yaw=s.sx>0?-Math.PI/2:Math.PI/2;}break;}
    case 'windup':{lock=clamp(e.stT/0.6,0,1);const s=A.st[e.tgt|0],st=hnProp('bomber',s.k);if(st)st.wind=Math.abs(Math.sin(e.stT*12));
      if(e.stT>=1.2){if(st)st.wind=0;e.st='plunge';e.stT=0;const demo=!F.demo&&!e.pieRand;F.demo=F.demo||demo;F.data.plunges++;e.pieRand=0;
        hnHPlunge(s,'the Demolitionist',demo);hnLog(F,'plunge',{st:s.k,demo});}break;}
    case 'plunge':if(e.stT>0.25){e.st='post';e.stT=0;}break;
    case 'post':if(e.stT>(F.phase===2?1.2:0.7)){e.st='dive';e.stT=0;e.diveH=null;}break;
    case 'air':{e.kvy=(e.kvy||0)-GRAV*dt;e.y+=e.kvy*dt;const gy=hnHGround(e.x,e.z);
      if(e.y<=gy&&e.kvy<0){e.y=gy;e.kvy=0;e.st='dazed';e.stT=0;e.dazeMul=1.5;e.dazeT=e.dazeNext||3;e.dazeNext=0;mpShake(0.25,0.3);}
      break;}
    case 'dazed':if(e.stT>=(e.dazeT||e.stT0||1.6)){e.dazeT=0;
        if(e.after==='trace'){e.after=null;e.st='trace';e.stT=0;const s=A.st[e.traceS|0];e.trace=[s.lead[0],s.lead[1],s.gap];e.traceI=0;hnWin(F,4.6,'trace');}
        else if(e.after==='untangle'){e.after=null;e.st='untangle';e.stT=0;}
        else if(F.phase===3){e.st=hnProp('bomber','bigone')?'climbBomb':'rollBomb';e.stT=0;}
        else{e.st='dive';e.stT=0;e.diveH=null;}}break;
    case 'untangle':if(e.stT>1.4){hnSay('(giggles silently)',1.2);const s=A.st[e.traceS|0];burstParticles(s.gap[0]+0.5,35.3,s.gap[2]+0.5,B.PG_CORD,8,0.7);
        e.st=F.phase===3?'climbBomb':'dive';e.stT=0;e.diveH=null;}break;
    case 'trace':{const c=e.trace[Math.min(e.traceI,e.trace.length-1)];
      if(hnHMove(e,c[0]+0.5,c[2]+0.5,1.6,dt)){e.traceI++;if(e.traceI>=e.trace.length){e.st='snip';e.stT=0;}}
      break;}
    case 'snip':{if(e.stT>=3){const s=A.st[e.traceS|0],g=s.gap;if(getBlock(g[0],g[1],g[2])===B.PG_CORD){const pa=ACTOR;ACTOR=null;try{setBlock(g[0],g[1],g[2],B.AIR);}finally{ACTOR=pa;}}
        delete HN.wired[s.k];mwS('pg_fizz',g[0],g[1],g[2]);e.st='dive';e.stT=0;e.diveH=null;hnLog(F,'snipped',{st:s.k});}
      e.yaw=Math.atan2(P.x-e.x,P.z-e.z)+Math.PI;break;}
    case 'panic':{lock=1;const t=purgFoe(e,30);if(t){const tb=hnFoeBody(t);hnHMove(e,tb.x,tb.z,5.2,dt);}
      if(!HN_H.bundles.some(b=>!b.dead&&b.host===e)){e.st='dive';e.stT=0;e.diveH=null;}break;}
    /* ---- P3: the Big One ---- */
    case 'rollBomb':{const bo=hnHBigOneSpawn();const u=Math.min(1,e.stT/2.2);bo.y=31.5+u*3.5;bo.roll=u<1;
      if(e.stT>=2.2){bo.y=35;bo.roll=false;HN_H.leverUsed=false;const lv=hnProp('bomber','lever');if(lv){lv.down=0;}e.st='climbBomb';e.stT=0;}break;}
    case 'climbBomb':{const B1=A.bigone,h=[B1[0]+0.5,B1[1]+0.5+1.8];
      if(e.stT<0.05&&!hnProp('bomber','bigone')){e.st='rollBomb';e.stT=0;break;}
      if(hnHMove(e,h[0],h[1],4.6,dt)||e.stT>4){e.st='hop';e.stT=0;}break;}
    case 'hop':{const B1=A.bigone,u=Math.min(1,e.stT/0.5);e.x+=(B1[0]+0.5-e.x)*Math.min(1,dt*8);e.z+=(B1[1]+0.5-e.z)*Math.min(1,dt*8);e.y=35+u*3+Math.sin(u*Math.PI)*0.8;
      if(u>=1){e.y=38;e.x=B1[0]+0.5;e.z=B1[1]+0.5;e.st='bomb';e.stT=0;e.remT=12;
        if(!HN_H.fuse||HN_H.fuse.done){hnHFuseStart(0);hnSay('Lights... FUSE!',1.6);hnLog(F,'fuseLit',{});}else if(HN_H.fuse.stop&&HN_H.fuse.gap<0)HN_H.fuse.stop=false;}break;}
    case 'bomb':{e.y=38;e.yaw=Math.atan2(fx-e.x,fz-e.z);lock=0.5;e.remT=(e.remT||12)-dt;
      if(e.remT<=0){e.remT=12;const si=blind?((MPF.tick*13)%4):hnHPick();hnHPlunge(A.st[si],'the Demolitionist',false);e.hrS.throwT=1;hnSay('BANG!',0.8,'remote');}
      if(HN_H.fuse&&HN_H.fuse.stop&&HN_H.fuse.gap>=0){e.st='toCut';e.stT=0;e.cutIdx=HN_H.fuse.gap;}break;}
    case 'toCut':{const c=A.fuse[e.cutIdx];e.y=Math.max(35,e.y-dt*8);
      if(hnHMove(e,c[0]+0.5,c[2]+0.5+0.8,5.4,dt)||e.stT>9){e.st='splice';e.stT=0;hnWin(F,4.2,'splice');hnSay('tsk tsk tsk',1.2,'splice');}break;}
    case 'splice':{e.yaw=Math.atan2(P.x-e.x,P.z-e.z)+Math.PI;
      if(e.stT>=4){const c=A.fuse[e.cutIdx];if(getBlock(c[0],c[1],c[2])!==B.PG_CORD){const pa=ACTOR;ACTOR=null;try{setBlock(c[0],c[1],c[2],B.PG_CORD);}finally{ACTOR=pa;}}
        if(HN_H.fuse){HN_H.fuse.gap=-1;HN_H.fuse.stop=false;}hnLog(F,'spliced',{i:e.cutIdx});e.st='climbBomb';e.stT=0;}break;}
    case 'trapdoor':{const u=Math.min(1,e.stT/0.6);e.y=38-u*6;const bo=hnProp('bomber','bigone');if(bo)bo.y=35-u*6;
      hnHOpenHatch(A.bigone[0]+0.5,A.bigone[1]+0.5,2);HN_H.fuse=null;HN.fuseSpark=null;
      if(u>=1){if(bo)removeEnt(bo);e.st='underground';e.stT=0;hnSay('HEE HEE HEE HEE—',1);}break;}
    case 'underground':{e.y=31;if(e.stT>=1){mwS('pg_thump');mpShake(0.6,0.5);
        for(const h of A.hatches){hnPuff(h[0]+0.5,35.5,h[1]+0.5,0.9,1.4,2);hnHOpenHatch(h[0]+0.5,h[1]+0.5,1.6);}mwS('pg_hiss');
        const h=A.hatches[(MPF.tick*11)%A.hatches.length];e.x=h[0]+0.5;e.z=h[1]+0.5;e.y=35;
        hnWin(F,4.6,'trapdoor');hnHit(e,20,e.trapBy||'Dan','trapdoor');e.st='air';e.kvy=Math.sqrt(2*GRAV*10);e.after=null;e.hrS.blown=1;e.dazeNext=4;
        const lv=hnProp('bomber','lever');if(lv)lv.down=1;hnLog(F,'blownOut',{});}break;}
    default:e.st='dive';e.stT=0;}
  hnHAnim(e,dt,fx,fy,fz,lock);};
function hnHNearHatch(x,z){const A=hnA();let best=A.hatches[0],bd=1e9;for(const h of A.hatches){const d=Math.hypot(h[0]+0.5-x,h[1]+0.5-z);if(d<bd){bd=d;best=h;}}return best;}
/* the kill: he climbs onto the Big One, strikes a match, lights the short fuse himself and goes up through the Grid */
function hnHDying(e,F,dt){const A=hnA();
  switch(e.st){
    case 'dieClimb':{if(!hnProp('bomber','bigone')){const bo=hnHBigOneSpawn();bo.y=35;}const B1=A.bigone;
      if(hnHMove(e,B1[0]+0.5,B1[1]+0.5+1.8,4,dt)||e.stT>4){e.st='dieHop';e.stT=0;}break;}
    case 'dieHop':{const B1=A.bigone,u=Math.min(1,e.stT/0.5);e.x=B1[0]+0.5;e.z=B1[1]+0.5;e.y=35+u*3;if(u>=1){e.st='lightFuse';e.stT=0;hnSay('(strikes a match)',1.2);}break;}
    case 'lightFuse':{e.y=38;if(e.stT>=4){const bx=A.bigone[0]+0.5,bz=A.bigone[1]+0.5;
        pBlast(bx,36.5,bz,12,8,'the Demolitionist',{vy:10,self:e,how:'bigone'});mpShake(1,0.8);if(typeof NUKE!=='undefined')NUKE.flash=0.4;
        const bo=hnProp('bomber','bigone');if(bo)removeEnt(bo);e.st='launch';e.stT=0;mwS('pg_whoosh',bx,40,bz);hnSay('HEE HEE HEE HEEEEEeeee....',2.2);
        for(let k=0;k<5;k++)hnPuff(bx,37+k,bz,2,3,2);}break;}
    case 'launch':{e.y+=dt*(14+e.stT*20);if(e.y>78||e.stT>3){e.mesh.visible=false;
        if(typeof mwBeacon==='function')mwBeacon('band2',false);hnHStreak();hnFightWon(F);}break;}
    default:e.st='dieClimb';e.stT=0;}}
/* 4 s later, far upstage, a burning streak comes down on the Arch 2 line and the orange glow band blooms along it */
function hnHStreak(){const z=MPC.ARCH_Z[1];hnFx('puff',{dur:5.2},f=>{if(f.t<4){f.m.visible=false;return;}f.m.visible=true;const u=Math.min(1,(f.t-4)/1.1);
    f.m.position.set(0.5,78-u*18,z);f.m.scale.set(1.2,2.4,1.2);if(f.m.material)f.m.material.color&&f.m.material.color.setHex&&f.m.material.color.setHex(0xff7a1a);
    if(u>=1&&!f.band){f.band=1;if(typeof mwBeacon==='function')mwBeacon('band2',null);}});}
/* the demo brain (no fight): pop out behind DO NOT PUSH, look Dan over, giggle, slam it, cackle, dive */
function hnHDemoBrain(e,dt){e.stT+=dt;HN_H.demoT=Math.max(0,HN_H.demoT-dt);const D=hnA().dnp;
  const look=()=>{e.yaw=Math.atan2(P.x-e.x,P.z-e.z);};
  switch(e.st){case 'demoPop':e.y=Math.min(35,e.y+dt*4);look();hnHOpenHatch(e.x,e.z,1);if(e.stT>0.6){e.st='demoLook';e.stT=0;hnSay('Hmm? Hmmmm. HEE HEE HEE.',1.8);}break;
    case 'demoLook':look();if(e.stT>1.6){e.st='demoSlam';e.stT=0;}break;
    case 'demoSlam':if(e.stT<0.05){const dn=hnProp('bomber','dnp');if(dn)dn.press=0.5;hnSpark(D.cord,12,'the Demolitionist',hnHPlate,{tag:'demo'});mwS('pg_plunger',0.5,36,-175.5);}
      if(e.stT>1.2){e.st='demoCackle';e.stT=0;hnSay('COME BACK WHEN YOU CAN CUT A WIRE!',2.6);}break;
    case 'demoCackle':if(e.stT>1.4){e.st='demoSink';e.stT=0;hnHOpenHatch(e.x,e.z,1);}break;
    case 'demoSink':e.y-=dt*4;if(e.stT>0.5){removeEnt(e);HN_H.demoE=null;}break;}
  if(e.dead)return;hnHAnim(e,dt,P.x,P.y+1.5,P.z,e.st==='demoLook'?1:0.3);}

/* ---- summon check (Dan only: punching DO NOT PUSH) lives in the station relay; per-tick bundle work ---- */
PREG.tick.push(function hnHTick(dt){if(!P)return;if(HN_H.bundles.length)hnHBundleTick(dt);hnHSwing();
  if(HN_H.demoT>0&&(!HN_H.demoE||HN_H.demoE.dead))HN_H.demoT=0;});
/* remember who wired a seat (a Det Cord placed into a station's lead gap) */
PREG.onPlace.push(function hnHPlaced(x,y,z,id,who){if(id!==B.PG_CORD)return;for(const s of hnA().st){const g=s.gap;if(g[0]===x&&g[1]===y&&g[2]===z){HN.wired[s.k]=who;if(MPF.fight)hnLog(MPF.fight,'wired',{st:s.k,who});}}});
Object.assign(PGEX,{hnHPick,hnHPlunge,hnHStick,getHNH:()=>HN_H,hnHStationHit,hnHLever,hnHFuseStart});
