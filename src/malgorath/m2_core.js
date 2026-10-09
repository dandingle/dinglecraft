/* ---- PART 57: m2_core.js ---- */
/* ===================================================================== */
/* PART 57 m2 (M2): THE FIGHT. m2_core: state, knobs, the scheduler, the */
/* damage gate, his hits on players, windows and weak points, the round  */
/* lifecycle (idle / live / scene / dead), dormancy, retries, bots.      */
/* Spec: MALGORATH_BIBLE.md 6-18 + Appendix A-C; build plan 5.2 / 8.2.   */
/* m2_r1/r2/r3 carry each round's attacks, m2_adds the leftovers,        */
/* m2_scenes the cutscenes and the death, m2_hud the bar, m2_audio the   */
/* band and SFX, m2_loot the payout and the Jaw.                         */
/* ===================================================================== */
/* Rules (m_static): top-level names start MG2/mg2; no Math.random, clocks or THREE constructors at top level; PART 54 names never
   appear here. Randomness is MG2.rng (mulberry32 seeded from SEED and the attempt), the clock is MGF.clock (advanced by tickMalg). */

/* ---- knob VALUES (frozen names in m0; Appendix B) + M2's own tables ---- */
Object.assign(MG_K,{HIDE_BUDGET:15,PIERCE:0.4,CHOMP:10,GAP:[0.30,0.60],GAP_LOW:[0.15,0.35]});
var MG2K={
  R1:{REACH:22,SEL:[2.0,2.6],SEL_LOW:[1.6,2.2],SLAP_TELL:1.6,SLAP_CD:3.0,SLAP_R:2.5,SLAP_IN:1.5,SLAP_HI:14,SLAP_LO:6,GRIND:3,GRIND_T:0.5,
    EYE_DELAY:0.4,EYE_T:2.8,EYE_CAP:30,DSLAP:1,SCOOP_TELL:1.4,SCOOP_LOCK:1.0,SCOOP_SWEEP:1.2,SCOOP_BAND:2.0,SCOOP_H:1.6,SCOOP_CD:14,SCOOP_CD_LOW:11,
    RIDE:2.0,MOUTH:2.5,TONGUE_OUT:1.2,TONGUE_HITS:3,TONGUE_CAP:45,TONGUE_LEARN:2,NOTONGUE:1.2,CRUMB_N:7,CRUMB_DMG:6,CRUMB_CD:8,CRUMB_MIN:10,
    RUBBLE_MAX:40,SNACK:6,COW:8,MORSEL:10,BLOCK:2,W:{slap:4,scoop:2,crumbs:2}},
  R2:{WALK:3.5,KEEP:[11,14],TURN:1.2,SEL:[1.8,2.4],SEL_LOW:[1.4,2.0],LUNGE_TELL:1.6,LUNGE_SET:0.3,LUNGE_V:22,LUNGE_MAX:18,LUNGE_SIDE:8,LUNGE_CD:4,
    RECOVER:1.5,REC_CAP:30,CHAIN:0.4,CRACK_T:4,CRACK_CAP:50,CRACK_LEARN:2,BELLY:{tnt:[5,35],bloat:[5,50],nuke:[8,75]},BELLY_CD:20,LIT_LEARN:2,
    DINGLE_T:10,DINGLE_CAP:100,SQUAT_R:4,SQUAT_T:1.5,SQUAT_TELL:1.4,SQUAT_HIT:4.5,SQUAT_DMG:12,SQUAT_CD:6,STOMP_TRIG:1.5,STOMP_TELL:1.0,STOMP_HI:12,
    STOMP_LO:7,STOMP_V:10,STOMP_R:8,STOMP_CD:5,STOMP_HOLES:3,TAIL_TRIG:1.2,TAIL_TELL:1.0,TAIL_SWEEP:0.5,TAIL_DMG:10,TAIL_CD:6,TAIL_R:9,RIM_TELL:1.2,RIM_MAX:8,
    CRUMB_N:5,CRUMB_MIN:14,W:{lunge:4,crumbs:2}},
  R3:{REACH:22,INHALE:6,INHALE_LOW:7,INHALE_TELL:1.0,PULL:[2.5,6],PULL_LOW:7,AIR:1.6,SNEAK:0.5,COVER:0.25,LANE_T:1.5,LANE_LEAD:0.9,LANE_DMG:5,
    SWALLOW:2,BELLY_CAP:25,HANDS:5,SLAP_TELL:1.6,DRAG:6,DRAG_T:0.8,DRAG_HOLD:0.15,DRAG_LEAD:0.5,DRAG_DMG:6,EYE_T:2.0,EYE_CAP:25,GAG_N:3,GAG_TELL:1.5,GAG_T:4.0,SUN_IN:4.0,SUN_CAP:75,
    EDGE0:24,EDGE_MIN:15,STEP:10,STEP_LOW:7.5,WARN:3,RECEDE:3,SUPPER_WARN:8,SUPPER_T:5,SUPPER_V:9},
  ADDS:{CAP:8,MORSEL:{hp:12,v:4.2,bite:3},HUSK:{hp:30,v:4.3,swing:4,cd:3.0,wind:0.6,arrow:3,arrowT:2.6,build:2,buildT:4.5},BLOAT:{hp:16,v:2.4,fuse:1.5,r:3,dmg:9}},
  WAVES:{'1a':{r:1,at:200,m:4,h:2,a:0,b:0},'1b':{r:1,at:100,m:6,h:2,a:1,b:0},'2a':{r:2,at:200,m:0,h:2,a:0,b:3},'2b':{r:2,at:100,m:0,h:1,a:1,b:3},
    '3a':{r:3,at:301,m:0,h:2,a:0,b:0},'3b':{r:3,at:200,m:3,h:3,a:0,b:0},'3c':{r:3,at:100,m:4,h:2,a:1,b:0}}};

/* ---- the transient fight (never saved; rebuilt from MALG.round) ---- */
function mg2Fresh(){return {v:1,st:'none',atk:null,win:null,sel:2,gap:0,gate:{},hide:0,imp:{},grace:{},cd:{},rng:null,L:mg2Learn(),
  parts:[],tels:[],haz:[],addQ:[],throws:[],holds:[],eaten:[],adds:[],waves:{},away:0,awayT:0,scene:null,reform:0,beat:0,atkN:0,tokD:0,tokB:0,dmg8:[],
  air:0,perch:0,gut:{},daze:0,deathAt:null,deathCounted:0,belchT:-1,gloat:null,attDmg:0,startT:0,heal:0,edge:24,edgeT:0,warn:null,gag:0,
  gagLit:0,dingle:0,bellyCD:0,lastDanHit:-99,snackT:0,eatQ:[],fly:[],vis:{},spent:0,lastR:0,heads:[],stuck:0,lastWho:null,hudChunk:0,wake:0}};
function mg2Learn(){return {tongue:0,lit:0,cracks:{},spireDone:{},demo1:0,demo2:0,demo2b:0,demo3:0,crumbDia:0,crumbN:0,rim:0,botSnack:0,dingle:0,bunker:0};}
var MG2=mg2Fresh();

/* ---- small helpers ---- */
function mg2R(){if(!MG2.rng)MG2.rng=mulberry32(((SEED|0)^0x6d32a7^Math.imul((MGF.att|0)+1,0x9E3779B1))>>>0);return MG2.rng();}
function mg2Rng(a,b){return a+(b-a)*mg2R();}
function mg2Low(){const b=MGF.boss;return !!(b&&!b.dead&&b.hp<150);}
function mg2Ang(a){return ((a%(Math.PI*2))+Math.PI*3)%(Math.PI*2)-Math.PI;}                 /* wrap to -PI..PI */
function mg2Yaw(dx,dz){return Math.atan2(dx,dz);}                                          /* the mob convention: facing (sin, cos) */
function mg2Turn(cur,want,rate,dt){const d=mg2Ang(want-cur),m=rate*dt;return cur+(Math.abs(d)<=m?d:Math.sign(d)*m);}
function mg2Now(){return MGF.clock;}
function mg2Tel(kind,o){const h=mgDraw(kind,o);MG2.tels.push(h);return h;}                 /* every drawing goes through mgDraw (D10) */
function mg2Free(h){if(!h)return;const i=MG2.tels.indexOf(h);if(i>=0)MG2.tels.splice(i,1);try{h.free();}catch(err){mgFail('tel',err);}}
function mg2FreeAll(){for(const h of MG2.tels.splice(0))try{h.free();}catch(err){}}
function mg2Vis(o){return Object.assign({y0:-999,y1:-998},o);}                              /* a drawing that is a picture only (no hit volume) */
function mg2S(n,x,y,z){try{if(typeof x==='number')playSAt(n,x,y,z);else playS(n);}catch(err){}}
function mg2Say(t,dur){try{cutSay('MALGORATH',t,dur||2.6);}catch(err){}}
function mg2Shake(m,d){try{nukeShake(m,d);}catch(err){}}
var MG2BK={geyser:'debris',splat:'bile',boom:'flash',bone:'debris',tooth:'spark'};                    /* M3's burst kinds */
function mg2Burst(kind,x,y,z,o){o=o||{};const fx=MGREG.fx;if(fx&&fx.burst&&!fx.stub)try{fx.burst(MG2BK[kind]||kind,x,y,z,o);if(kind==='boom')fx.burst('debris',x,y,z,o);return;}catch(err){mgFail('burst',err);}
  burstParticles(x,y,z,o.id||B.STONE,o.n||6,o.pw||0.8);}
function mg2Fx(name){const fx=MGREG.fx;return fx&&!fx.stub&&typeof fx[name]==='function'?fx[name]:null;}
function mg2W(){return MGREG.world||{};}
function mg2Solid(x,y,z){const id=getBlock(x,y,z);return id!==B.AIR&&id!==B.WATER&&id!==B.LAVA&&DEFS[id]&&DEFS[id].solid!==false;}
function mg2Floor(x,z){const F=mgF(),cx=Math.floor(x),cz=Math.floor(z);for(let y=F;y>=F-3;y--)if(mg2Solid(cx,y-1,cz))return y;return -99;}   /* standing surface near F, or -99 */
function mg2Stand(x,z){const cx=Math.floor(x),cz=Math.floor(z),F=mgF();
  return mg2Solid(cx,F-1,cz)&&!mg2Solid(cx,F,cz)&&!mg2Solid(cx,F+1,cz);}
function mg2Mech(n){mgMech(n);}

/* ---- the players he can see: Dan and the bots inside the arena (or the gut) ---- */
function mg2Bots(){const out=[];if(typeof AGENTS==='undefined'||!AG_ACTIVE)return out;
  for(const a of AGENTS){const e=a.e;if(!e||e.dead||a.dead||!a.online||a.dim!=='over')continue;out.push(a);}return out;}
function mg2TId(t){return t===P?'Dan':(t&&t.name)||'?';}
function mg2TPos(t){return t===P?P:(t.e||t);}
function mg2Alive(t){if(t===P)return !!P&&!P.dead;return !!t&&!t.dead&&t.online&&!!t.e&&!t.e.dead;}
function mg2InPlay(t){const p=mg2TPos(t);if(!p||!mg2Alive(t))return false;const z=mgZone(p.x,p.y,p.z);return z==='arena'||z==='gut';}
function mg2Eaten(t){return MG2.eaten.some(q=>q.a===t);}
function mg2Targetable(t){if(!mg2InPlay(t)||mg2Eaten(t))return false;if(t===P&&(P.mode==='c'))return false;
  const g=MG2.grace[mg2TId(t)];if(g!=null&&g>mg2Now())return false;return true;}
function mg2Who(){const by=HIT_BY;if(by==='Dan')return {k:'dan',id:'Dan',x:P.x,y:P.y,z:P.z,t:P};
  if(by&&typeof agByName==='function'){const a=agByName(by);if(a&&a.e&&!a.dead)return {k:'bot',id:a.name,x:a.e.x,y:a.e.y,z:a.e.z,t:a};}
  return null;}
/* the target score (bible 7.4): (Dan ? 1.4 : 1) x (damage dealt in the last 8 s + 10) / (distance + 4); Dan gets >= 70% of the tokens */
function mg2Dealt(id){const now=mg2Now();let s=0;for(const h of MG2.dmg8)if(h[1]===id&&now-h[0]<8)s+=h[2];return s;}
function mg2Pick(ox,oz){ox=ox==null?(MGF.boss?MGF.boss.x:MGC.X):ox;oz=oz==null?(MGF.boss?MGF.boss.z:MGC.Z):oz;
  const c=[];if(mg2Targetable(P))c.push(P);for(const a of mg2Bots())if(mg2Targetable(a))c.push(a);
  if(!c.length)return null;const danIn=c.indexOf(P)>=0;
  if(danIn&&c.length>1){const tot=MG2.tokD+MG2.tokB;if(tot>0&&MG2.tokD/tot<MG_K.DAN_TOKENS)return P;}
  let best=null,bs=-1;for(const t of c){const p=mg2TPos(t),d=Math.hypot(p.x-ox,p.z-oz),s=(t===P?1.4:1)*(mg2Dealt(mg2TId(t))+10)/(d+4);if(s>bs){bs=s;best=t;}}
  return best;}
function mg2Token(t){if(t===P)MG2.tokD++;else MG2.tokB++;MGT.tokens[mg2TId(t)]=(MGT.tokens[mg2TId(t)]||0)+1;}

/* ---- damage to players (bible 7.1): pierce through the engine's absorb, ticks, the spacing rule, attribution ---- */
function mg2Armor(t){if(t===P)return Math.min(0.8,armorPts()*0.04);return Math.min(0.8,(typeof agArmorPts==='function'?agArmorPts(t):0)*0.04);}
function mg2Hit(t,n,p,how,opt){opt=opt||{};if(!t||!mg2Alive(t))return 0;
  if(CUT.on&&CUT.script)return 0;                                                          /* his scenes: players are invulnerable */
  if(t!==P&&mg2Eaten(t))return 0;
  const id=mg2TId(t),now=mg2Now();
  if(opt.atk){const g=MG2.grace[id];if(g!=null&&g>now)return 0;                            /* grace after entering a round, a respawn, a pluck */
    const li=MG2.imp[id];if(li&&(now-li.t<0.5||(li.big&&now-li.t<0.8)))return 0;}          /* spacing between his impacts on one target */
  const A=mg2Armor(t),pp=p==null?MG_K.PIERCE:p,eff=n*(1-A*(1-pp)),pre=A<1?eff/(1-A):eff;
  let lost=0;
  const force=opt.tick||opt.atk;                                                           /* his impacts and ticks always land; adds respect i-frames */
  if(t===P){if(P.mode==='c')return 0;LASTDMG={by:'Malgorath',how:'mg:'+(how||'hit'),t:AG_T};const h0=P.hp,s=P.hurtT;if(force)P.hurtT=0;
    if(opt.kx!=null)damagePlayer(pre,opt.kx,opt.kz);else damagePlayer(pre);
    if(opt.tick&&!P.dead)P.hurtT=s;lost=h0-P.hp;}
  else{const e=t.e,h0=t.hp,s=e.hurtT;if(force)e.hurtT=0;try{agHurt(t,pre,'Malgorath',opt.kx,opt.kz,'mg:'+(how||'hit'));}catch(err){mgFail('agHurt',err);}
    if(opt.tick&&t.e)t.e.hurtT=s;lost=h0-(t.hp||0);}
  if(opt.atk&&!opt.tick)MG2.imp[id]={t:now,big:n>=12};
  if(lost>0){MGT.events.push('hit:'+id+':'+how+':'+lost.toFixed(1));if(MGT.events.length>64)MGT.events.shift();}
  return lost;}
/* the chomp: 10 true damage (no absorb, no chew, ignores i-frames), the POV beat, then the spit 12-16 m onto a solid cell, 1.0 s
   of i-frames and no fall damage. Bots are never chomped: they are swallowed (bible 7.5, 17.1) */
function mg2Chomp(t,how,o){o=o||{};if(!t||!mg2Alive(t))return 0;
  if(t!==P){mg2Swallow(t,o.why||'chomp');return 0;}
  if((CUT.on&&CUT.script)||P.mode==='c')return 0;
  MGT.chomps++;mg2Mech('chomp');MG2.chompHow=how||'chomp';
  let lost=0;
  if(P.mode!=='c'&&!GR.god){LASTDMG={by:'Malgorath',how:'mg:chomp',t:AG_T};P.hurtT=0;const h0=P.hp;P.hp-=MG_K.CHOMP;hurtFlash=0.5;playS('hurt');
    if(P.hp<=0){P.hp=0;die();}drawStats();lost=h0-P.hp;}
  MGA.jaw=0;MGA.split=0;MG2.pov=0.35;mg2S('mg_chomp');mg2Shake(0.6,0.4);{const f=mg2Fx('chomp');if(f)try{f(0.35);}catch(err){}}
  if(!P.dead){const m=mg2Mouth(),dir=o.dir!=null?o.dir:Math.atan2(P.z-MGC.Z,P.x-MGC.X);
    MG2.spit={t:0.35,x:m.x,y:m.y,z:m.z,dir};MG2.holdDan={k:'pov',x:m.x,y:m.y,z:m.z};}
  return lost;}
/* the landing for throws and spits: walk from the wanted point back toward a solid standing cell on the plate (never the void,
   never the Throat); fall back to M1's safeCell */
function mg2Land(x,z,o){o=o||{};const F=mgF(),rmin=o.rmin==null?(MGF.round===3?12.6:8):o.rmin,rmax=o.rmax==null?(MGF.round===3?MG2.edge-0.6:23):o.rmax;
  const p=mgPol(x,z);let r=Math.max(rmin,Math.min(rmax,p.r));
  for(let i=0;i<40;i++){const dr=(i>>1)*0.5*(i%2?1:-1),th=p.th+((i>>3)*0.12)*(i%2?-1:1),rr=Math.max(rmin,Math.min(rmax,r+dr)),
      cx=MGC.X+Math.cos(th)*rr,cz=MGC.Z+Math.sin(th)*rr;
    if(mg2Stand(cx,cz)&&!mg2HoleNear(cx,cz,o.hole||0))return {x:Math.floor(cx)+0.5,y:F,z:Math.floor(cz)+0.5};}
  const W=mg2W();if(W.safeCell){try{const s=W.safeCell(x,z,{minR:6,hole:2.5});if(s)return s;}catch(err){mgFail('safeCell',err);}}
  return {x:MGC.X-14,y:F,z:MGC.Z};}
function mg2HoleNear(x,z,r){if(!r)return false;const F=mgF();for(let dx=-r;dx<=r;dx+=1)for(let dz=-r;dz<=r;dz+=1){if(dx*dx+dz*dz>r*r)continue;
    const cx=Math.floor(x+dx),cz=Math.floor(z+dz),pr=Math.hypot(cx+0.5-MGC.X,cz+0.5-MGC.Z);if(pr>24)continue;if(!mg2Solid(cx,F-1,cz)&&!mg2Solid(cx,F-2,cz))return true;}
  return false;}
/* a scripted throw (bible 7.1 mgKnock): a kinematic arc carried from the brain after updatePlayer; o.noFall: the landing is free */
function mg2Throw(t,x1,z1,dur,apex,o){o=o||{};if(!t||!mg2Alive(t))return;const p=mg2TPos(t);
  MG2.throws=MG2.throws.filter(q=>q.t!==t);
  MG2.throws.push({t,x0:p.x,y0:p.y,z0:p.z,x1,z1,y1:o.y1==null?mgF():o.y1,dur:Math.max(0.15,dur),apex:apex||1,k:0,noFall:!!o.noFall});}
function mg2Knock(t,ox,oz,dist,o){o=o||{};const p=mg2TPos(t);let dx=p.x-ox,dz=p.z-oz;const l=Math.hypot(dx,dz);if(l<1e-3){dx=p.x-MGC.X;dz=p.z-MGC.Z;}
  const L=Math.hypot(dx,dz)||1,want={x:p.x+dx/L*dist,z:p.z+dz/L*dist},land=o.free?want:mg2Land(want.x,want.z,{rmin:o.rmin,rmax:o.rmax});
  mg2Throw(t,land.x,land.z,o.dur||Math.max(0.25,Math.min(0.4,dist*0.06)),o.apex||Math.min(2.2,0.5+dist*0.12),o);return land;}
function mg2StepThrows(dt){for(const q of MG2.throws.slice()){const p=mg2TPos(q.t);if(!p||!mg2Alive(q.t)){MG2.throws.splice(MG2.throws.indexOf(q),1);continue;}
    q.k=Math.min(1,q.k+dt/q.dur);const k=q.k,x=q.x0+(q.x1-q.x0)*k,z=q.z0+(q.z1-q.z0)*k,y=q.y0+(q.y1-q.y0)*k+4*q.apex*k*(1-k);
    p.x=x;p.y=y;p.z=z;p.vx=0;p.vz=0;p.vy=0;if(q.t===P){P.fallD=0;P.onGround=false;}
    if(k>=1){p.y=q.y1+0.02;p.vy=-2;MG2.throws.splice(MG2.throws.indexOf(q),1);if(q.t===P&&q.noFall)P.fallD=0;}}}
function mg2Grace(t,s){MG2.grace[mg2TId(t)]=mg2Now()+(s==null?MG_K.GRACE:s);}

/* ---- windows (bible 7.2/7.9, Appendix A): a weak point opens, every source's damage counts toward its cap, it closes at the cap ---- */
function mg2OpenWin(kind,o){mg2CloseWin('replace');const capB=o.cap*(o.bot?MG_K.BOT_WIN:1);
  const part=mgPart(kind,{x:o.x,y:o.y,z:o.z,hw:o.hw,h:o.h,mgWin:1});part.hp=1e9;
  const w={kind,part,t:o.t,t0:o.t,cap:capB,dmg:0,steal:0,bot:!!o.bot,mult:o.mult||1,recoil:o.recoil||null,end:o.end||null,danHit:0,follow:o.follow||null,
    h:mg2Tel(kind,mg2Vis({col:'gold',shape:'disc',x:o.x,z:o.z,r:Math.max(0.6,o.hw),y0:-999,y1:-998}))};
  MG2.win=w;MGT.win={kind,open:1,cap:capB,dmg:0,capped:0};MGA.vuln=1;mg2Mech(kind);mg2S('mg_eyelid',o.x,o.y,o.z);return w;}
function mg2CloseWin(why){const w=MG2.win;if(!w)return;MG2.win=null;
  if(w.part&&!w.part.dead)removeEnt(w.part);mg2Free(w.h);MGA.vuln=0;MGT.win.open=0;MGT.win.capped=why==='cap'?1:0;
  if(why==='cap'){MG2.hudChunk=1;mg2Mech('cap');}
  if(w.end)try{w.end(why,w);}catch(err){mgFail('winEnd',err);}
  if(why==='cap'||why==='time'){MG2.sel=Math.min(MG2.sel,why==='cap'?0.4:0.8);if(why==='cap'&&w.recoil)try{w.recoil(w);}catch(err){mgFail('recoil',err);}}}

/* ---- the gate (bible 7.2): every hit on him or a part of him, always handled here (m0 returns -1 for the boss and parts) ---- */
function mg2PreHurt(e,dmg,kx,kz){
  const T=MOBT[e.mt];
  if(T.mg==='add')return mg2AddPreHurt(e,dmg,kx,kz);
  const boss=MGF.boss;
  if(!boss||boss.dead||DEMON.dead||e.mt==='mgeye')return -1;
  if(!MGF.live||MG2.scene||(CUT.on&&CUT.script)){mg2Clang(e);return -1;}                   /* 1. dormant, docile, a scene, dead */
  const w=mg2Who();if(!w)return -1;                                                        /* 2. only Dan's or a bot's damage counts */
  if(!mgArena(w.x,w.y,w.z))return -1;                                                      /* 3. outside is outside */
  const now=mg2Now(),last=MG2.gate[w.id];if(last!=null&&now-last<MG_K.GATE)return -1;     /* 4. one instance per attacker per 0.25 s */
  MG2.gate[w.id]=now;
  const how=HIT_HOW||'melee',boom=how==='tnt'||how==='boom'||how==='nade'||how==='nuke';
  const win=MG2.win,weak=e.mt==='mgpart'&&!!win&&win.part===e;
  let d=Math.max(0,+dmg||0);
  if(e.mt==='mgpart'&&!weak)return -1;                                                     /* a part whose window already closed */
  if(weak){d*=win.mult;if(how==='laser')d*=MG_K.LASER_WEAK;else if(boom)d*=MG_K.BOOM_WEAK;if(w.k==='bot')d*=MG_K.BOT;}
  else if(e===boss){const crea=w.k==='dan'&&P.mode==='c';                                  /* creative previews: the hide takes it all */
    if(crea){}else if(w.k!=='dan'||how!=='melee')d=0;                                      /* 5. the hide: Dan's blade only, x0.1, 15 a round */
    else d=Math.max(0,Math.min(d*MG_K.HIDE,MG_K.HIDE_BUDGET-MG2.hide));}
  else return -1;
  d=Math.min(MG_K.CAP_HIT,d);                                                              /* 6. per-instance cap */
  if(weak)d=Math.max(0,Math.min(d,win.cap-win.dmg));                                       /* 7. the window cap (clipped, never discarded) */
  if(GR.instaKill&&w.k==='dan')d=boss.hp>1?boss.hp-1:1;                                    /* 9. debug: to the floor, the next hit ends it */
  const floor=w.k==='bot'?Math.min(boss.hp,MG_K.BOT_FLOOR):1,before=boss.hp;
  boss.hp=Math.max(floor,before-d);const dealt=before-boss.hp;                             /* 8. never below 1 in a round (30 for bots) */
  if(e===boss&&w.k==='dan'&&how==='melee')MG2.hide+=dealt;
  if(weak){win.dmg+=d;MGT.win.dmg=win.dmg;if(w.k==='dan'){win.danHit=1;MG2.attDmg+=dealt;}}
  if(dealt>0){MG2.dmg8.push([now,w.id,dealt]);if(MG2.dmg8.length>80)MG2.dmg8.shift();if(w.k==='dan')MG2.lastDanHit=now;}
  MGT.hits.push([now,w.k,weak?(win.kind):'hide',+dealt.toFixed(2),how]);if(MGT.hits.length>300)MGT.hits.shift();
  if(weak){MGA.hurt=1;MGA.flinch=1;MGL.flash=1;if(dealt>0&&w.k==='dan'&&how==='melee')e._mgStealT=now;mg2Burst('blood',e.x,e.y+e.h*0.5,e.z,{id:B.LAVA,n:6});mg2S('hit',e.x,e.y,e.z);}
  else{mg2Burst('spark',(w.x+e.x)/2,Math.min(e.y+e.h,w.y+1.2),(w.z+e.z)/2,{id:B.STONE,n:4});MGA.recoil=Math.max(MGA.recoil,0.3);mg2S('thud',e.x,w.y+1,e.z);}
  if(weak&&win.dmg>=win.cap-1e-6&&MG2.win===win)mg2CloseWin('cap');
  else if(weak&&win.hitsLeft!=null&&w.k==='dan'){win.hitsLeft--;if(win.hitsLeft<=0&&MG2.win===win)mg2CloseWin('hits');}
  if(w.k==='dan'&&boss.hp<=1&&!MG2.ending){                                                /* the end hit: Dan's, on a weak point */
    const ok=GR.instaKill||P.mode==='c'||(weak&&(MGF.round<3||win.kind==='sun'));
    if(ok){MG2.ending=1;mg2RoundEnd();}}
  return -1;}
function mg2Clang(e){MGA.recoil=Math.max(MGA.recoil,0.2);if(e&&HIT_BY==='Dan')mg2S('thud',e.x,P.y+1,e.z);}
function mg2Steal(e,amt){const w=MG2.win;if(!w||w.part!==e||e._mgStealT!==mg2Now())return 0;  /* weak points only, <= 3 a window */
  const g=Math.max(0,Math.min(amt,MG_K.STEAL_CAP-w.steal));w.steal+=g;return g;}

/* ---- the round lifecycle ---- */
function mg2Start(r){const D=MALG.deaths[(r||1)-1]|0,R=MG_K.RUBBER;let f=1;for(const k in R)if(D>=+k)f=Math.min(f,R[k]);return Math.round(MG_K.BAR*f);}
function mg2Boss(){if(MGF.boss&&!MGF.boss.dead)return MGF.boss;MGF.boss=null;return null;}
function mg2EnsureBoss(r){let e=mg2Boss();if(!e){e=mgSpawnBoss(r||MALG.round);e.hp=mg2Start(r||MALG.round);e.mgBar=1;mg2PlaceIdle(e,r||MALG.round);}e.mgBar=1;return e;}
function mg2PlaceIdle(e,r){const F=mgF();e.yaw=e.yaw||0;
  if(r===2){const th=0;e.x=MGC.X+Math.cos(th)*16;e.z=MGC.Z+Math.sin(th)*16;e.y=F;e.yaw=mg2Yaw(-Math.cos(th),-Math.sin(th));}
  else{e.x=MGC.X;e.z=MGC.Z;e.y=r===3?F-13:F-8;}}
function mg2Wake(cause){if(DEMON.dead||MG2.scene)return false;if(MGF.live&&cause!=='skip')return false;
  cause=cause||'plate';const first=!MALG.met;MALG.met=1;MGF.why=cause;
  try{mg2Bus('wake',cause);}catch(err){}
  if(cause==='skip'){mg2StartRound(MALG.round,'skip');return true;}
  if(first){mg2Intro(cause);return true;}
  mg2StartRound(MALG.round,cause);return true;}
/* the door-shut beat and the round start (bible 8.0): the door goes, the table is cleared, 2.0 s of grace */
function mg2StartRound(r,cause){r=Math.max(1,Math.min(3,r|0||1));const W=mg2W();
  MGF.live=1;MGF.round=r;MGF.att=(MGF.att|0)+1;MGF.attT=0;MGF.phase='round';MG2.rng=null;MG2.startT=mg2Now();MG2.attDmg=0;MG2.ending=0;
  MG2.L=mg2Learn();MG2.hide=0;MG2.atk=null;MG2.win=null;MG2.sel=MG_K.GRACE;MG2.gap=0;MG2.cd={};MG2.waves={};MG2.tokD=0;MG2.tokB=0;
  MG2.gag=0;MG2.gagLit=0;MG2.bellyCD=0;MG2.edge=MG2K.R3.EDGE0;MG2.edgeT=0;MG2.warn=null;MG2.away=0;MG2.supper=null;MG2.reform=0;
  MG2.r3=null;MG2.inh=null;MG2.edgeLog=[];MG2.demoB=0;MG2.r2hold={};MGA.stanceLock=0;MGL.edge=MG2.edge;
  const e=mg2EnsureBoss(r);e.hp=mg2Start(r);e.round=r;mg2PlaceIdle(e,r);
  if(cause!=='skip'&&cause!=='scene'){if(W.door)try{W.door(false);}catch(err){mgFail('door',err);}}
  else if(W.door)try{W.door(false);}catch(err){}
  if(W.clearTable)try{W.clearTable();}catch(err){mgFail('clearTable',err);}
  mg2Grace(P);for(const a of mg2Bots())mg2Grace(a);
  MGL.live=1;MGL.round=r;MGL.phase='round';MGA.round=r;
  if(cause!=='skip'&&cause!=='scene'){mg2S('mg_roar');mg2Shake(0.35,0.6);MG2.beat=1.2;}
  if(r===3){MG2.edge=MG2K.R3.EDGE0;mg2Wave('3a');}
  mgEmit('onRound',r,'start');mg2Bus('round',r);return true;}
function mg2Dormant(why){if(!MGF.live&&!MG2.scene&&!mg2Boss())return;why=why||'away';
  if(MG2.scene&&why!=='dim'&&why!=='far')return;                                           /* a scene finishes first */
  MGF.live=0;MGF.phase='idle';MGF.why=why;mg2Clear();
  const e=mg2Boss();
  if(why==='dim'||why==='far'){mgPurge(false);MGF.boss=null;}else{mgPurge(true);if(e){e.hp=mg2Start(MALG.round);mg2PlaceIdle(e,MALG.round);}}
  MGL.live=0;MGL.phase='idle';
  const W=mg2W();if(W.reset)try{W.reset(MALG.round,{why,instant:why==='death'||why==='skip'});}catch(err){mgFail('reset',err);}
  if(W.door)try{W.door(true);}catch(err){}
  if(why!=='death'&&why!=='skip'&&why!=='far'&&why!=='dim'){mg2Burst('dust',MGC.X,mgF()+1,MGC.Z,{id:B.STONE,n:20,pw:2});mg2S('mg_bury');}
  mg2Bus('dormant',why);}
function mg2Clear(){mg2CloseWin('reset');if(MG2.atk&&MG2.atk.free)try{MG2.atk.free(MG2.atk);}catch(err){}MG2.atk=null;mg2FreeAll();
  MG2.r3=null;MG2.inh=null;MG2.swat=null;
  MG2.throws.length=0;MG2.holds.length=0;MG2.haz.length=0;MG2.addQ.length=0;if(MG2.ride)mg2RideEnd();MG2.pluck=null;MG2.spit=null;MG2.holdDan=null;MG2.ride=null;MG2.pov=0;
  for(const q of MG2.eaten.splice(0))mg2Belch(q,1);
  for(const a of MG2.adds.splice(0))if(!a.dead)removeEnt(a);MG2.parts.length=0;MG2.warn=null;MGT.atk=null;MGT.hint=null;
  {const f=mg2Fx('props');if(f)try{f();}catch(err){}}
  MGA.tel=[0,0,0,0,0];MGA.commit=0;MGA.vuln=0;MGA.jaw=0;MGA.split=0;MGA.tongue=0;MGA.armL={pose:'rest',t:0};MGA.armR={pose:'rest',t:0};}
function mg2RoundEnd(){const e=mg2Boss();if(!e)return;const r=MGF.round||MALG.round,preview=P.mode==='c'||!!GR.instaKill;
  mg2CloseWin('end');if(MG2.atk&&MG2.atk.free)try{MG2.atk.free(MG2.atk);}catch(err){}MG2.atk=null;mg2FreeAll();
  for(const a of MG2.adds.splice(0))if(!a.dead){mg2Burst('ash',a.x,a.y+0.8,a.z,{id:B.STONE,n:6});removeEnt(a);}
  MALG.deaths[r-1]=0;MG2.hide=0;mg2Bus('roundEnd',r);
  if(r<3){MALG.round=r+1;e.hp=mg2Start(r+1);mg2Trans(r,preview);return;}
  mg2Death(e,preview);}
function mg2Bus(ev,a){try{if(typeof mg2BotEvent==='function')mg2BotEvent(ev,a);}catch(err){mgFail('bots',err);}}

/* ---- Dan's death in a live round (bible 15.2): the vacuum, the hat, the heads, the reset, the Bone Pile, the gloat and the belch ---- */
function mg2OnDie(){if(DIM!=='over'||DEMON.dead)return false;
  const near=Math.hypot(P.x-MGC.X,P.z-MGC.Z)<MGC.R_GRADE,live=MGF.live&&!MG2.scene;
  if(!live||!near)return false;
  const r=MGF.round||MALG.round,now=mg2Now(),att=now-MG2.startT;
  const counts=(att>=MG_K.DEATH_MIN_T||MG2.attDmg>=MG_K.DEATH_MIN_DMG)&&att>=MG_K.DEATH_GRACE;
  if(counts)MALG.deaths[r-1]=(MALG.deaths[r-1]|0)+1;
  MG2.deathAt={x:P.x,y:P.y,z:P.z,r,how:(LASTDMG&&LASTDMG.how)||'',chompHow:MG2.chompHow||'',counted:counts?MALG.deaths[r-1]:0,att};
  MALG.heads=Math.min(MG_K.HEADS,(MALG.heads|0)+1);
  if(P.cos&&P.cos.hat){MALG.hat=P.cos.hat;P.cos.hat=null;}
  let took=false;
  if(!GR.keepInv){const g=[];for(let i=0;i<36;i++){const st=P.inv[i];if(st){g.push([i,JSON.parse(JSON.stringify(st))]);P.inv[i]=null;}}
    if(g.length){MALG.gut=(MALG.gut||[]).concat(g);took=true;mg2Vacuum(g.length);}}
  mg2Dormant('death');
  for(const a of mg2Bots()){const p=a.e;if(p&&mgIn(p.x,p.y,p.z))mg2BotToPile(a);}
  mg2Bus('danDeath',r);
  return took;}
function mg2OnRespawn(){const d=MG2.deathAt;MG2.deathAt=null;if(!d||DEMON.dead)return;
  const b=mgBonePile();P.x=b.x;P.y=b.y;P.z=b.z;P.yaw=b.yaw||0;P.pitch=0;P.vx=P.vy=P.vz=0;P.fallD=0;
  MG2.belchT=MG_K.BELCH;MG2.gloat={t:MG_K.GLOAT,d};mg2S('mg_chew');}
function mg2Vacuum(n){const m=mg2Mouth();for(let i=0;i<Math.min(8,n);i++)MG2.fly.push({x:P.x,y:P.y+1,z:P.z,tx:m.x,ty:m.y,tz:m.z,t:0,d:0.9+i*0.08,k:'in'});mg2S('mg_vacuum');}
function mg2Belch(q,instant){if(q&&q.a){mg2BotOut(q.a,instant);return;}}
function mg2DoBelch(){const g=MALG.gut;MALG.gut=null;if(!g||!g.length)return;let spill=0;
  for(const [i,st] of g){if(i>=0&&i<36&&!P.inv[i])P.inv[i]=st;else{const left=invAddTo(P.inv,st);if(left>0){spawnDrop(P.x,P.y+0.6,P.z,{...st,count:left},0,2,0);spill++;}}}
  try{redrawHotbar();refreshHand();}catch(err){}
  const m=mg2Mouth();for(let i=0;i<Math.min(8,g.length);i++)MG2.fly.push({x:m.x,y:m.y,z:m.z,tx:P.x,ty:P.y+1,tz:P.z,t:0,d:1.0+i*0.06,k:'out'});
  mg2S('mg_belch');}
function mg2Gloat(d){if(!d||d.counted<2)return;const how=(d.how||'').replace(/^mg:/,''),ch=d.chompHow||'';let s='AGAIN.';
  const L={slap:'FOOD STANDS STILL.',grind:'YOU LET ME HOLD YOU.',crumb:'I SPAT. YOU CAUGHT IT.',swat:'LITTLE THINGS DO NOT FLY HERE.',stomp:'YOU STAYED ON THE FLOOR.',
    squat:'UNDER ME IS STILL MY PLATE.',tail:'I HAVE A TAIL.',drag:'EVERYTHING SLIDES TO ME.',debris:'EVEN THE WALLS COME TO ME.',boom:'MY LEFTOVERS BURST.',
    husk:'THEY WERE ARCHITECTS TOO.',supper:'CLEAN PLATE.',bile:'NOTHING FALLS OFF MY PLATE.'};
  if(how==='chomp'){s={ride:'MY TONGUE WAS RIGHT THERE.',ride2:'STILL RIDING.',lunge:'YOU STOOD IN MY DROOL.',rim:'THE EDGE IS MY MOUTH.',inhale:'NOTHING HID YOU.',
      gag:'YOU STAYED IN MY MOUTH.',fall:'NOTHING FALLS OFF MY PLATE.'}[ch]||'AGAIN.';}
  else if(L[how])s=L[how];
  mg2Say(s,2.8);}

/* ---- abandonment and away-regen (bible 15.4) ---- */
function mg2Away(dt){const e=mg2Boss();if(!e)return;
  const out=!P.dead&&mgZone(P.x,P.y,P.z)!=='arena'&&mgZone(P.x,P.y,P.z)!=='gut';
  if(out&&!MG2.ride&&!MG2.pluck){MG2.away+=dt;const top=mg2Start(MGF.round);
    if(e.hp<top){e.hp=Math.min(top,e.hp+MG_K.AWAY_REGEN*dt);MG2.heal+=dt;MGA.tongue=Math.max(MGA.tongue,0.5);}
    if(MG2.away>=MG_K.ABANDON)mg2Dormant('away');}
  else MG2.away=0;}

/* ---- the fight's tick (from tickMalg, within 220 m of C) ---- */
function mg2Tick(dt){
  MGT.clock=MGF.clock;
  if(DEMON.dead){if(MG2.scene){mg2SceneTick(dt);return;}const e=mg2Boss();if(e)removeEnt(e);MGF.boss=null;MGF.live=0;mg2Hud(dt);return;}
  if(MG2.reform>0)MG2.reform-=dt;
  if(MG2.scene){mg2SceneTick(dt);mg2Hud(dt);mg2Fly(dt);return;}
  const inArena=!P.dead&&mgArena(P.x,P.y,P.z),band=!!MGF.band,near=MGF.d<MGC.R_SPAWN;
  if(MG2.belchT>=0&&!P.dead){MG2.belchT-=dt;if(MG2.belchT<0){mg2DoBelch();}}
  else if(MALG.gut&&!P.dead&&MG2.belchT<0&&!MGF.live)mg2DoBelch();                         /* a reload with things in his gut */
  if(MG2.gloat){MG2.gloat.t-=dt;MGA.stance=MGF.round===3?'chest':MGA.stance;if(!MG2.gloat.said&&MG2.gloat.t<MG_K.GLOAT-0.9){MG2.gloat.said=1;mg2Gloat(MG2.gloat.d);}
    if(MG2.gloat.t<=0)MG2.gloat=null;}
  if(P.cos&&MALG.hat&&P.cos.hat===MALG.hat)P.cos.hat=null;                                  /* he is wearing it: the store will not equip it */
  if(!MGF.live){
    if(MALG.met&&band&&near&&MG2.reform<=0)mg2EnsureBoss(MALG.round);
    else if(!near||!band){const e=mg2Boss();if(e&&MGF.d>MGC.R_GRADE){removeEnt(e);MGF.boss=null;}}
    if(inArena&&band&&MG2.reform<=0&&!(CUT.on&&CUT.script)&&!MG2.gloat){
      if(MALG.met)mg2Wake('plate');else if(mg2W().stub)mg2Wake('plate');}
    mg2Hud(dt);mg2Fly(dt);mg2BotTick(dt);return;}
  const e=mg2EnsureBoss(MGF.round);
  MGF.attT+=dt;if(MG2.beat>0)MG2.beat=Math.max(0,MG2.beat-dt);
  mg2Away(dt);if(!MGF.live){mg2Hud(dt);return;}
  if(MGF.d>MGC.R_GRADE){mg2Dormant('far');return;}
  mg2Waves(e);mg2AddsTick(dt);mg2Eat(dt);
  if(MGF.round===3)mg2R3Tick(e,dt);
  mg2BotTick(dt);mg2Hud(dt);mg2Fly(dt);mg2Hint();}
/* his wave triggers by HP (bible 11) */
function mg2Waves(e){const r=MGF.round;for(const k in MG2K.WAVES){const w=MG2K.WAVES[k];if(w.r!==r||MG2.waves[k])continue;if(e.hp<=w.at)mg2Wave(k);}}

/* ---- the brain (from updateEntities, right after updatePlayer): the boss, his parts and his adds ---- */
function mg2Brain(e,dt,T){
  if(e.mt==='mgpart')return mg2PartBrain(e,dt);
  if(MOBT[e.mt].mg==='add')return mg2AddBrain(e,dt,T);
  if(!e.mgBoss){if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);return;}
  mg2BossBrain(e,dt);}
function mg2PartBrain(e,dt){const w=MG2.win;
  if(!w||w.part!==e){removeEnt(e);return;}
  if(w.follow)try{w.follow(e,w,dt);}catch(err){mgFail('follow',err);}
  if(w.h)w.h.set({x:e.x,z:e.z});
  if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);}
function mg2Docile(){return !MGF.live||!!MG2.scene||(CUT.on&&CUT.script)||!!GR.freezeMobs||!!MG2.gloat||MG2.beat>0;}
function mg2BossBrain(e,dt){
  const F=mgF(),r=MGF.live?MGF.round:MALG.round;
  MG2.vis.t=(MG2.vis.t||0)+dt;
  if(MG2.pov>0){MG2.pov-=dt;}
  mg2StepThrows(dt);mg2StepHolds(dt);mg2Swat(e,dt);mg2Pluck(e,dt);mg2Daze(dt);mg2GutRules(dt);mg2Haz(dt);
  if(MG2.win&&MG2.win.t!=null&&!MG2.scene){MG2.win.t-=dt;MGT.win.open=1;if(MG2.win.t<=0)mg2CloseWin('time');}
  if(MGF.live&&!MG2.scene){
    MGA.light.at='chest';MGA.light.i=r===2?2.0:1.6;MGA.light.col=0xff5a22;
    if(r===1)mg2R1Brain(e,dt);else if(r===2)mg2R2Brain(e,dt);else mg2R3Brain(e,dt);}
  else if(!MG2.scene)mg2IdleBrain(e,dt,r);
  else mg2SceneBrain(e,dt);
  mg2Box(e,r);mg2Anim(e,dt,r);}
/* the hide box (bible 5.9): written every frame; it collapses while any weak point is open */
function mg2Box(e,r){const F=mgF();
  if(MG2.win||MG2.scene){e.hw=0;e.h=0;return;}
  if(r===1){e.hw=2.5;e.h=13;e.y=F-8;}else if(r===2){e.hw=2.0;e.h=9;}else{e.hw=2.5;e.h=15;e.y=F-13;}}
function mg2IdleBrain(e,dt,r){const F=mgF();MGA.stance=r===1?'lean':(r===2?'stalk':'chest');
  if(r!==2){e.x=MGC.X;e.z=MGC.Z;e.y=r===3?F-13:F-8;}
  const tx=P.x-e.x,tz=P.z-e.z;if(Math.hypot(tx,tz)>0.5)e.yaw=mg2Turn(e.yaw,mg2Yaw(tx,tz),0.8,dt);}
/* the shared rig state (bible 5.3): one writer (M2), two skins */
function mg2Anim(e,dt,r){const A=MGA;A.round=r;A.x=e.x;A.y=e.y;A.z=e.z;A.yaw=e.yaw;
  A.heart=r===3?60+80*(1-Math.max(0,Math.min(1,e.hp/300))):(r===2?72:60);A.breathe=(A.breathe+dt*0.25)%1;
  A.hurt=Math.max(0,A.hurt-dt*4);A.flinch=Math.max(0,A.flinch-dt*3);A.recoil=Math.max(0,A.recoil-dt*2.5);A.commit=Math.max(0,A.commit-dt*3);
  A.crack.hue=r-1;A.crack.i=MG2.scene&&MG2.scene.k==='death'?A.crack.i:(0.55+0.25*Math.sin(MG2.vis.t*A.heart/60*Math.PI*2));
  A.rim=1;A.hat=MALG.hat;A.heads=MALG.heads|0;A.strata.tree=r===3?1:0;
  if(A.stance!=='stun'&&A.stance!=='slump'&&A.stance!=='dead'){const lt=MG2.lookT;A.lookX=lt?lt.x:P.x;A.lookY=lt?lt.y:P.y+1.5;A.lookZ=lt?lt.z:P.z;}
  const items=(MG2.bellyLit&&MG2.bellyLit>mg2Now())?[{k:'tnt'}]:[];for(const q of MG2.eaten)items.push({k:'bot',id:q.a.name});if(MALG.offer)items.push({k:'item',id:MALG.offer.id});
  if((MALG.deaths[(r||1)-1]|0)>=4)items.push({k:'dan'});if(MG2.bellyCows>mg2Now())items.push({k:'cow'});if(r===3&&MG2.r3&&MG2.r3.ph==='swallow')items.push({k:'sun'});A.belly.items=items.slice(-3);
  MGL.heart=A.heart;MGL.pulse=0.5+0.5*Math.sin(MG2.vis.t*A.heart/60*Math.PI*2);MGL.flash=Math.max(0,MGL.flash-dt*4);MGL.light=A.light;
  MGL.live=MGF.live?1:0;MGL.round=r;MGL.w=Math.max(0,Math.min(1,(MGC.R_GRADE-MGF.d)/100));
  const rig=e.mgRig;if(rig&&rig.update)try{rig.update(dt,A);}catch(err){mgFail('rig',err);}
  if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw;}}

/* ---- the scheduler's shared pieces (bible 7.4): the selector clock, the breathing gap, the attack slot ---- */
function mg2Gap(){const g=mg2Low()?MG_K.GAP_LOW:MG_K.GAP;return mg2Rng(g[0],g[1]);}
function mg2SelT(K){const s=mg2Low()?K.SEL_LOW:K.SEL;return mg2Rng(s[0],s[1]);}
function mg2Busy(){return !!MG2.atk||!!MG2.win;}
function mg2Begin(a){MG2.lastAtkT=mg2Now();if(!a.free){const T=(typeof MG2R2!=='undefined'&&MG2R2[a.k])||(typeof MG2R1!=='undefined'&&MG2R1[a.k]);if(T&&T.free)a.free=T.free;}   /* every drawing is freed with its attack */
  MG2.atk=a;MG2.atkN++;MGT.atk=a.k;return a;}
function mg2End(a){if(MG2.atk===a){MG2.atk=null;MGT.atk=null;}if(a&&a.free)try{a.free(a);}catch(err){}MG2.gap=Math.max(MG2.gap,mg2Gap());}
function mg2Lock(h){if(h&&!h.t.locked){h.lock();MGT.lock=mg2Now();}}
function mg2Commit(x,y,z){MGA.commit=1;mg2S('mg_tick',x,y,z);}
function mg2Impact(){MGT.impact=mg2Now();}
function mg2CD(k){return (MG2.cd[k]||0)<=mg2Now();}
function mg2SetCD(k,s){MG2.cd[k]=mg2Now()+s;}
function mg2Weighted(list){let tot=0;for(const q of list)tot+=q[1];let x=mg2R()*tot;for(const q of list){x-=q[1];if(x<=0)return q[0];}return list.length?list[list.length-1][0]:null;}

/* ---- the mouth (for the chomp, the spit, the vacuum) ---- */
function mg2Mouth(){const e=mg2Boss(),F=mgF(),r=MGF.round||MALG.round;
  if(!e)return {x:MGC.X,y:F+4,z:MGC.Z};const s=Math.sin(e.yaw),c=Math.cos(e.yaw);
  if(MG2.ride&&MG2.ride.mouth)return MG2.ride.mouth;
  if(r===1)return {x:e.x+s*6,y:F+5,z:e.z+c*6};
  if(r===2)return {x:e.x+s*5,y:F+8.5,z:e.z+c*5};
  return {x:e.x+s*2.5,y:F+0.5,z:e.z+c*2.5};}

/* ---- holds: the scoop ride, the pluck, the chomp POV; displacements applied after updatePlayer ---- */
function mg2StepHolds(dt){const hd=MG2.holdDan;
  if(MG2.spit){MG2.spit.t-=dt;if(hd&&hd.k==='pov'){P.x=hd.x;P.y=hd.y;P.z=hd.z;P.vx=P.vy=P.vz=0;P.fallD=0;}
    if(MG2.spit.t<=0){const s=MG2.spit;MG2.spit=null;MG2.holdDan=null;if(!P.dead){
        const d=12+mg2R()*4,want={x:MGC.X+Math.cos(s.dir)*Math.min(20,Math.max(13,Math.hypot(s.x-MGC.X,s.z-MGC.Z)+d*0.5)),z:MGC.Z+Math.sin(s.dir)*Math.min(20,Math.max(13,Math.hypot(s.x-MGC.X,s.z-MGC.Z)+d*0.5))};
        const land=mg2Land(want.x,want.z,{hole:1});P.x=s.x;P.y=s.y;P.z=s.z;mg2Throw(P,land.x,land.z,0.7,2.2,{noFall:1});P.hurtT=Math.max(P.hurtT,1.0);
        mg2S('mg_spit');mg2Grace(P,1.0);}}}
  else if(hd&&hd.k==='hold'){if(P.dead){MG2.holdDan=null;return;}
    if(Math.hypot(P.x-hd.px,P.z-hd.pz)>2.5){MG2.holdDan=null;if(hd.rel)hd.rel('blink');return;}  /* a blink got him out */
    if(KEY.Space&&!hd.sp0&&hd.canJump){MG2.holdDan=null;P.vy=4;if(hd.rel)hd.rel('jump');return;}
    hd.sp0=!!KEY.Space;P.x=hd.x;P.y=hd.y;P.z=hd.z;hd.px=P.x;hd.pz=P.z;P.vx=P.vy=P.vz=0;P.fallD=0;P.onGround=true;
    if(hd.ease>0){hd.ease-=dt;const k=Math.min(1,dt/Math.max(0.05,hd.ease+dt));const m=hd.look;if(m){const dx=m.x-P.x,dy=m.y-(P.y+P.eyeY),dz=m.z-P.z;
        P.yaw=P.yaw+mg2Ang(Math.atan2(-dx,-dz)-P.yaw)*k;P.pitch=P.pitch+(Math.atan2(dy,Math.hypot(dx,dz))-P.pitch)*k;}}}}
function mg2HoldDan(x,y,z,o){o=o||{};MG2.holdDan={k:'hold',x,y,z,px:x,pz:z,ease:o.ease||0,look:o.look||null,rel:o.rel||null,canJump:o.jump!==false,sp0:!!KEY.Space};}
function mg2MoveHold(x,y,z){const h=MG2.holdDan;if(h&&h.k==='hold'){h.x=x;h.y=y;h.z=z;}}
/* the daze after a pluck slam: x0.6 speed, no sprint (bible 7.10) */
function mg2Daze(dt){if(MG2.daze>0){MG2.daze-=dt;if(!P.dead){P.vx*=0.6;P.vz*=0.6;}}}

/* ---- the gut (bible 7.1, 7.10): the bile burns, the fall is soft, and he plucks whoever lands there ---- */
function mg2GutRules(dt){if(!MGF.live||MG2.scene)return;const F=mgF(),GF=mgGF();
  const check=(t)=>{const p=mg2TPos(t);if(!p||!mg2Alive(t)||mg2Eaten(t))return;const id=mg2TId(t),z=mgZone(p.x,p.y,p.z);
    const g=MG2.gut[id]||(MG2.gut[id]={t:0,bile:0});
    const pr=Math.hypot(p.x-MGC.X,p.z-MGC.Z),hole=(MGF.round===3?12:7);
    const pit=z==='arena'&&((p.y<F-1.5&&p.onGround&&pr<MGC.R_ARENA)||(pr<hole&&p.y<F+1.5));   /* a pit in his plate, or the hole he is standing in, counts as his gut */
    if(z!=='gut'&&!pit){g.t=0;return;}
    if(t===P&&P.fallD>7.0)P.fallD=7.0;                                                    /* landing in the gut costs at most 4 before armour */
    if(p.onGround||p.y<GF+0.6)g.t+=dt;
    if(p.y<GF+0.6&&Math.hypot(p.x-MGC.X,p.z-MGC.Z)>6.5){g.bile+=dt;if(g.bile>=MG_K.BILE_T){g.bile=0;if(t===P&&P.mode!=='c'&&!GR.god){mg2True(P,MG_K.BILE,'bile');}}}
    if(g.t>=MG_K.PLUCK&&!MG2.pluck&&!(MG2.holdDan&&MG2.holdDan.k==='hold'))mg2StartPluck(t);};
  check(P);for(const a of mg2Bots())check(a);}
function mg2True(t,n,how){if(t!==P||P.dead||P.mode==='c'||GR.god||(CUT.on&&CUT.script))return 0;LASTDMG={by:'Malgorath',how:'mg:'+how,t:AG_T};
  const s=P.hurtT;P.hurtT=0;P.hp-=n;hurtFlash=Math.max(hurtFlash,0.25);if(P.hp<=0){P.hp=0;die();}else P.hurtT=s;drawStats();return n;}

/* ---- the swat (bible 7.6): flying, hovering and perching over his plate are answered with a clap ---- */
function mg2Swat(e,dt){if(MG2.swat){mg2SwatTick(dt);return;}if(!MGF.live||MG2.scene)return;const F=mgF();
  if(MG2.swatT>0){MG2.swatT-=dt;}
  const q=P;if(P.dead||P.mode==='c'||MG2.holdDan||MG2.throws.length||MG2.pluck){MG2.air=0;MG2.perch=0;return;}
  const pr=Math.hypot(P.x-MGC.X,P.z-MGC.Z),over=pr<=MGC.R_ARENA&&P.y>=F-0.5;
  if(!over){MG2.air=0;MG2.perch=0;return;}
  const high=P.y-F,falling=P.vy<-6;
  if(!P.onGround&&high>1.0&&!falling)MG2.air+=dt;else MG2.air=0;
  if(high>2.5&&!falling)MG2.perch+=dt;else MG2.perch=0;
  if((MG2.air>1.0||MG2.perch>1.2)&&(MG2.swatT||0)<=0)mg2StartSwat(e,P);}
function mg2StartSwat(e,t){const F=mgF(),p=mg2TPos(t);mg2Mech('swat');
  const h=mg2Tel('swat',{col:'violet',shape:'box',x:p.x,z:p.z,w:1.5,r:1.5,y0:F+1.0,y1:F+40,impactT:mg2Now()+1.0});
  MG2.swat={t:0,tg:t,h,x:p.x,z:p.z,locked:0};MGA.armL={pose:'swat',t:0,x:p.x-2,y:p.y+1,z:p.z};MGA.armR={pose:'swat',t:0,x:p.x+2,y:p.y+1,z:p.z};mg2S('mg_clap',p.x,p.y,p.z);}
function mg2SwatTick(dt){const s=MG2.swat;if(!s)return;const F=mgF(),p=mg2TPos(s.tg);s.t+=dt;
  if(!s.locked){s.x=p.x;s.z=p.z;s.h.set({x:s.x,z:s.z});}
  MGA.armL.t=MGA.armR.t=Math.min(1,s.t);
  if(!s.locked&&s.t>=1.0-MG_K.COMMIT){s.locked=1;mg2Lock(s.h);mg2Commit(s.x,p.y,s.z);}
  if(s.t>=1.0){mg2Impact();mg2Free(s.h);MG2.swat=null;MG2.swatT=1.5;MG2.air=0;MG2.perch=0;mg2Shake(0.5,0.4);
    const feet=p.y-Math.max(F,mg2GroundUnder(p.x,p.y,p.z));
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let y=F;y<=Math.min(F+24,Math.floor(p.y)+1);y++){const cx=Math.floor(s.x)+dx,cz=Math.floor(s.z)+dz;
      if(getBlock(cx,y,cz)!==B.AIR&&!mgProtect(cx,y,cz,B.AIR))mg2EatCell(cx,y,cz,'clap');}   /* his hands crush what was built up there */
    if(Math.abs(p.x-s.x)<=1.5&&Math.abs(p.z-s.z)<=1.5&&feet>1.0&&p.y>=F+1.0){mg2Hit(s.tg,12,MG_K.PIERCE,'swat',{atk:1});if(mg2Alive(s.tg)){p.vy=-20;}}
    else mg2Burst('dust',s.x,F+0.2,s.z,{id:B.OBSIDIAN,n:8});
    MGA.armL={pose:'rest',t:0};MGA.armR={pose:'rest',t:0};}}
function mg2GroundUnder(x,y,z){const cx=Math.floor(x),cz=Math.floor(z);for(let yy=Math.floor(y);yy>y-40&&yy>0;yy--)if(mg2Solid(cx,yy-1,cz))return yy;return -99;}

/* ---- the pluck (bible 7.10): nothing falls off his plate ---- */
function mg2StartPluck(t){const p=mg2TPos(t),F=mgF();mg2Mech('pluck');
  const h=mg2Tel('pluck',mg2Vis({col:'violet',shape:'disc',x:p.x,z:p.z,r:2.2}));
  MG2.pluck={t:0,tg:t,h,ph:'reach'};MGA.armR={pose:'pluck',t:0,x:p.x,y:p.y,z:p.z};mg2S('mg_pluck',p.x,p.y,p.z);}
function mg2Pluck(e,dt){const q=MG2.pluck;if(!q)return;const p=mg2TPos(q.tg),F=mgF(),r=MGF.round||1;
  if(!mg2Alive(q.tg)){mg2Free(q.h);MG2.pluck=null;return;}
  q.t+=dt;
  if(q.ph==='reach'){q.h.set({x:p.x,z:p.z});MGA.armR.x=p.x;MGA.armR.z=p.z;MGA.armR.t=Math.min(1,q.t/0.6);
    if(q.t>=0.6){q.ph='lift';q.t=0;q.x0=p.x;q.y0=p.y;q.z0=p.z;mg2Free(q.h);}return;}
  if(q.ph==='lift'){const k=Math.min(1,q.t/1.0),m=mg2Mouth();
    const tx=r===3?m.x:q.x0,ty=r===3?m.y:F+6,tz=r===3?m.z:q.z0,x=q.x0+(tx-q.x0)*k,y=q.y0+(ty-q.y0)*k,z=q.z0+(tz-q.z0)*k;
    if(q.tg===P){P.x=x;P.y=y;P.z=z;P.vx=P.vy=P.vz=0;P.fallD=0;}else{q.tg.e.x=x;q.tg.e.y=y;q.tg.e.z=z;q.tg.e.vy=0;}
    MGA.armR.x=x;MGA.armR.y=y;MGA.armR.z=z;
    if(k>=1){MG2.pluck=null;MGA.armR={pose:'rest',t:0};
      if(r===3){if(q.tg===P){MG2.chompHow='fall';mg2Chomp(P,'fall');}else mg2Swallow(q.tg,'pluck');return;}
      const land=mg2PluckLand(p);
      if(q.tg===P){mg2True(P,MG_K.PLUCK_DMG,'bile');MG2.daze=MG_K.DAZE;mg2Grace(P,1.5);}else mg2Grace(q.tg,1.5);
      mg2Throw(q.tg,land.x,land.z,0.45,1.0,{noFall:1});mg2S('mg_slap',land.x,F,land.z);mg2Shake(0.3,0.3);}}}
function mg2PluckLand(p){const e=mg2Boss(),ex=e?e.x:MGC.X,ez=e?e.z:MGC.Z;
  for(let i=0;i<24;i++){const th=Math.atan2(p.z-MGC.Z,p.x-MGC.X)+(i>>1)*0.35*(i%2?1:-1),rr=MGF.round===3?16:15;
    const x=MGC.X+Math.cos(th)*rr,z=MGC.Z+Math.sin(th)*rr;if(Math.hypot(x-ex,z-ez)<6)continue;
    if(mg2Stand(x,z)&&!mg2HoleNear(x,z,3))return {x:Math.floor(x)+0.5,y:mgF(),z:Math.floor(z)+0.5};}
  return mg2Land(p.x,p.z,{hole:2});}

/* ---- what he eats (bible 7.5): cells he bites go through M1 (world.eat) or his own write; + HP for food ---- */
function mg2EatCell(x,y,z,how){const W=mg2W(),id=getBlock(x,y,z);if(id===B.AIR||(id===B.BEDROCK&&how!=='topple'))return false;
  if(W.eat)try{W.eat(x,y,z,how);return true;}catch(err){mgFail('eat',err);}
  mgWrite(x,y,z,B.AIR);return true;}
function mg2PutCell(x,y,z,id){const W=mg2W();if(W.put)try{W.put(x,y,z,id);return true;}catch(err){mgFail('put',err);}mgWrite(x,y,z,id);return true;}
function mg2Heal(n){const e=mg2Boss();if(!e||n<=0)return;const top=MG_K.BAR;e.hp=Math.min(top,e.hp+n);MG2.heal+=n;}
function mg2Eat(dt){}
function mg2Fly(dt){for(const f of MG2.fly.slice()){f.t+=dt;if(!f.m&&typeof THREE!=='undefined'){f.m=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3),new THREE.MeshBasicMaterial({color:f.k==='in'?0xffd090:0xc0ff90}));scene.add(f.m);}
    const k=Math.min(1,f.t/f.d),x=f.x+(f.tx-f.x)*k,z=f.z+(f.tz-f.z)*k,y=f.y+(f.ty-f.y)*k+3*k*(1-k);if(f.m)f.m.position.set(x,y,z);
    if(k>=1){if(f.m&&f.m.parent)f.m.parent.remove(f.m);MG2.fly.splice(MG2.fly.indexOf(f),1);}}}

/* ---- skipping to a round (debug rows, suites): round r live now, no intro ---- */
function mg2SkipTo(r,o){if(DEMON.dead)return false;r=Math.max(1,Math.min(3,r|0||1));
  if(MG2.scene)mg2SceneAbort();
  MALG.met=1;MALG.round=r;if(MGF.live||mg2Boss())mg2Dormant('skip');MG2.reform=0;
  const W=mg2W();if(W.layout)try{W.layout(['','L1','L2','L3'][r]);}catch(err){mgFail('layout',err);}
  return mg2Wake('skip');}

/* ---- the harness's hints (MGT.hint): the skilled pilot's tactic from what is on screen ---- */
function mg2Hint(){const r=MGF.round,h={};
  if(!MGF.live||P.dead||MG2.scene){MGT.hint=null;return;}
  if(MG2.win&&!(r===3&&MG2.win.kind==='belly')){MGT.hint=null;return;}                   /* a melee window: go and hit it (the belly is a bow window) */
  const pr=mgPol(P.x,P.z);
  const near=mg2TelNear(P.x,P.z,1.3);
  if(near&&r!==3){const e=mgTelEscape(near,P.x,P.z),a0=Math.atan2(e[1],e[0]);                                   /* clear of the drawing, with a margin, on his plate */
    for(const da of [0,0.6,-0.6,1.1,-1.1,1.6,-1.6,2.2,-2.2,Math.PI]){const x=P.x+Math.cos(a0+da)*1.8,z=P.z+Math.sin(a0+da)*1.8,q=mgPol(x,z);
      if(q.r>21.5||q.r<(r===1?8.5:6))continue;if(!mg2Stand(x,z)||mg2TelNear(x,z,0.6))continue;MGT.hint={stand:{x,z,r:0.35}};return;}}
  if(r===1){const st=mg2SafeStand(pr.th,[15.5,13.0,18.0,10.5,20.0]);if(st)h.stand={x:st.x,z:st.z,r:st.near?1.6:1.0};}
  else if(r===2&&typeof mg2R2Hint==='function')mg2R2Hint(h,pr);
  else if(r===3&&typeof mg2R3Hint==='function')mg2R3Hint(h,pr);
  MGT.hint=h;}
/* the nearest damaging drawing whose hit area, grown by m metres, holds (x,z) */
function mg2TelNear(x,z,m){let best=null;for(const t of MGT.tel){if(t.col==='gold'||t.y0===-999)continue;
    const g=Object.assign({},t,{y0:null,r:(t.r||0)+m,w:t.shape==='line'?(t.w||1)+2*m:(t.w!=null?t.w+m:t.w),r0:t.r0!=null?Math.max(0,t.r0-m):t.r0,dth:t.dth!=null?t.dth+m/Math.max(4,t.r||4):t.dth,len:t.len!=null?t.len+m:t.len});
    if(t.shape==='line'){const ux=-Math.sin(t.yaw||0),uz=-Math.cos(t.yaw||0);g.x=t.x-ux*m;g.z=t.z-uz*m;g.len=(t.len||0)+2*m;}
    if(mgTelHit(g,x,0,z)&&(!best||(t.impactT||1e9)<(best.impactT||1e9)))best=t;}return best;}
/* a standing point near Dan's bearing outside every damaging drawing on screen (the pilot never walks back into a locked zone) */
function mg2DangerAt(x,z,y){y=y==null?mgF():y;for(const t of MGT.tel){if(t.col==='gold'||t.y0===-999)continue;if(mgTelHit(t,x,y,z))return t;}
  for(const h of MG2.haz)if(Math.hypot(x-h.x,z-h.z)<=h.r+0.6)return h;return null;}
function mg2SafeStand(th,radii){const busy=MGT.tel.some(t=>t.col!=='gold'&&t.y0!==-999)||MG2.haz.length>0;
  for(const da of [0,0.35,-0.35,0.7,-0.7,1.1,-1.1])for(const rr of radii){const a=th+da,x=MGC.X+Math.cos(a)*rr,z=MGC.Z+Math.sin(a)*rr;
    if(!mg2Stand(x,z)||!mg2PathOK(P.x,P.z,x,z))continue;if(busy&&mg2DangerAt(x,z))continue;return {x,z,near:!busy&&da===0&&rr===radii[0]};}
  return null;}
/* a straight walk from (x0,z0) to (x1,z1) stays on solid plate (the pilot never jumps a hole) */
function mg2PathOK(x0,z0,x1,z1){const d=Math.hypot(x1-x0,z1-z0);for(let s=0.5;s<d;s+=0.5){const x=x0+(x1-x0)*s/d,z=z0+(z1-z0)*s/d;if(!mg2Stand(x,z))return false;}return true;}
/* ---- the fight API (plan 5.2) ---- */
/* a new world or a loaded save inherits nothing of the last fight (m0's mgReset / mgLoad emit these) */
function mg2ResetAll(){try{if(MG2.scene)mg2SceneAbort();mg2Clear();}catch(err){}for(const f of MG2.fly)if(f.m&&f.m.parent)f.m.parent.remove(f.m);
  MG2=mg2Fresh();if(typeof mg2HudHide==='function')mg2HudHide();if(typeof MG2SND!=='undefined')MG2SND.band.cue='';}
MGREG.onReset.push(mg2ResetAll);MGREG.onLoad.push(mg2ResetAll);
/* M1 calls fed() when he eats a placed block (+2, bible 3.7 rule 2) */
function mg2Fed(kind,hp,x,y,z){if(!MGF.live||MG2.scene)return;mg2Heal(hp||0);mg2Mech('fed_'+kind);}
/* the death lines (bible 17.1), for Dan and the bots, keyed by LASTDMG.how 'mg:<how>' */
var MG2DEATH={slap:'was slapped flat by Malgorath',swat:'was swatted by Malgorath',tail:"was thrown by Malgorath's tail",squat:'was squashed under Malgorath',
  stomp:'was stomped flat by Malgorath',drag:'was dragged by Malgorath',fall:"fell into Malgorath's gut",bile:'was digested by Malgorath',boom:'was blown up by a Bloater',
  chomp:'was chomped by Malgorath',side:"was knocked aside by Malgorath's jaw",grind:'was ground up in the hand of Malgorath',crumb:'was spat on by Malgorath',
  debris:'was hit by the leftovers of Malgorath',supper:'was the last supper of Malgorath',husk:'was killed by a Husk',morsel:'was bitten by a Morsel',hit:'was eaten by Malgorath'};
function mg2DeathMsg(name,by,how){const s=MG2DEATH[how];return s?name+' '+s:null;}
MGREG.fight={tick:mg2Tick,fed:mg2Fed,wake:mg2Wake,dormant:mg2Dormant,brain:mg2Brain,preHurt:mg2PreHurt,onKill:function(e){mg2AddKilled(e);},
  onDie:mg2OnDie,onRespawn:mg2OnRespawn,steal:mg2Steal,deathMsg:mg2DeathMsg,
  botShield:function(a,by,how){return mg2BotShield(a,by,how);},botKeep:function(a){return mg2BotKeep(a);},botSpawn:function(a){return mg2BotSpawn(a);},
  blinkFail:function(){return mg2BlinkFail();},grapCut:function(){return mg2GrapCut();},swingMiss:function(e,d,hit){mg2SwingMiss(e,d,hit);},
  hit:mg2Hit,chomp:mg2Chomp,skipTo:mg2SkipTo,inhaling:function(){return mg2Inhaling();},
  get mechList(){const stub=!!(MGREG.world&&MGREG.world.stub);
    return {1:['slap','handeye','scoop','wave1a','wave1b'],2:stub?['lunge','recovery','wave2a','wave2b']:['lunge','recovery','crack','wave2a','wave2b'],
      3:['inhale','swallow','hands','gag','sun','wave3a']};},
  timeBound:{1:220,2:200,3:220}};
/* the fight suite's seam (test/m2_fight.js): start attack k on target t now, exactly as the selector would; refused while he is busy, in a
   scene or off a live round (R3 runs its own loop) */
function mg2Force(k,t){const e=mg2Boss();t=t||P;if(!e||!MGF.live||MG2.scene||mg2Busy()||MGF.round===3)return false;
  const T=(MGF.round===2&&MG2R2[k])||(MGF.round===1&&MG2R1[k])||(k==='crumbs'&&MG2R1.crumbs);if(!T||!T.start)return false;
  mg2Token(t);mg2Begin(T.start(e,t));return true;}
MGEX.mg2Force=mg2Force;MGEX.mg2Knock=mg2Knock;MGEX.getMG2=()=>MG2;MGEX.getMG2K=()=>MG2K;MGEX.mg2Wake=mg2Wake;MGEX.mg2Dormant=mg2Dormant;MGEX.mg2Hit=mg2Hit;MGEX.mg2Chomp=mg2Chomp;MGEX.mg2Land=mg2Land;
