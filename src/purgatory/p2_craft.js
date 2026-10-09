/* ---- PART 55: p2_craft.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   PART 55 · p2_craft.js (P2: things you hold and make): PRECIPES (41) and the recipe sets, the purgatory recipe book (open by
   default, ??? silhouettes, the hint line always under them), the three station kinds (Bin, Lab Bench, Transmogrifier),
   the Bin volley and Lost Property's thrower, the Empty Can move-in, the Lab Rat's demos and the Panic Meter, Burner smelting and
   the station lights, the loot trunks, the Prop Trunk sneak-climb, MP.seenIng / MP.unlock bookkeeping.
   Bible 7 (all of it), 3.12, 3.6 (Last Guest trunk); plan 5.2; hooks P2-02..13 call into here.
   Top level: declarations, the PRECIPES table (ids only, no DEFS reads: p2_items.js loads after this file) and registrations.
   --------------------------------------------------------------------------------------------------------------------- */
/* transient P2 state (never saved; MP fields P2 writes: seenIng unlock squeak spawns.trunk stats.pigs stats.tomatoes) */
var piS={took:0,bites:[],benches:{},vols:[],demo:null,demoQ:[],bolt:null,benchBlock:0,trans:null,transCD:0,movein:{},canQ:{},burn:new Map(),pops:[],seenT:0,lightT:0,
  scanned:new WeakSet(),trunkT:0,raise:null,held:null,hy:{c:0,cd:0,glint:false},prevAtk:0,prevSwing:0,bends:0,bendT:0,mineT:0,prints:[],printAcc:0,
  lastPos:null,flyGlide:false,slide:false,launched:false,dark:0,mitt:null,pupils:[],stuckDan:{},svGlove:0,svFrog:0,fuseCD:0,plungeCD:0,
  hpTake:null,lastPrint:null,fx:[],stats:{volleyHits:0,volleys:0,ducks:0,demos:0,trans:0,unhand:0,deflect:0,sprays:0,slurps:0}};

/* ---- PRECIPES (bible 7.4). Patterns are trimmed to their bounding box (calcCraft compares bboxes) and use ' ' for empty (X6).
   Fields: p|s, k, o, n, st ('hand'|'can'|'lab'|'trans'), key (the item that reveals it: MP.seenIng), hint, rid, lock (needs
   MP.unlock[o]: the Charge, after the Demolitionist). Never pushed into RECIPES (98, overworld only). ---- */
var PRECIPES=[];
function pRec(rid,pat,key,out,n,st,rk,hint,o){PRECIPES.push(Object.assign({rid,p:pat,k:key,o:out,n:n||1,st,key:rk,hint},o||{}));}
function pRecS(rid,ins,out,n,st,rk,hint,o){PRECIPES.push(Object.assign({rid,s:ins,o:out,n:n||1,st,key:rk,hint},o||{}));}
{ const F=IT.PG_FELT,Rd=IT.PG_ROD,E=IT.PG_PLASTICEYE,X=IT.PG_FOAMCHUNK,W=IT.PG_WIRE,S=IT.PG_SEQUIN,Q=IT.PG_SEQCLOTH,D=IT.PG_DRUMSTICK,C=IT.PG_CARD,
    Pf=IT.PG_LAMINATE,Bc=IT.PG_COIL,G=IT.PG_GREASE,K=IT.PG_COPPER,M=IT.PG_SHARD,L=B.PG_LAMP,H=IT.PG_SHAGFUR,T=IT.PG_SATIN,N=IT.PG_PINS,HG=IT.PG_HANGER;
  /* hands (2x2, also at every station) */
  pRecS('H1',[B.PG_SLEEVE],F,4,'hand',B.PG_SLEEVE,'The trees are wearing it.');
  pRec('H2',['F','F'],{F},Rd,4,'hand',F,'Every tool needs a handle. Roll up some felt.');
  pRec('H3',['E','R'],{E,R:Rd},L,4,'hand',E,'Eyes see in the dark. Put one on a stick.');
  pRecS('H4',[F,IT.PG_GOOGLIES],IT.PG_FLY,4,'hand',IT.PG_GOOGLIES,'Felt, and something that looks around.');
  pRecS('H5',[S,IT.PG_FLEECE,IT.PG_FLEECE],Q,2,'hand',S,'Sew sequins onto fleece.');
  pRecS('H6',[N,N],IT.PG_STAPLES,16,'hand',N,'Two pins, bent.');
  pRecS('H7',[IT.PG_DOUGHBALL,IT.PG_DOUGHBALL,IT.PG_DOUGHBALL,IT.PG_STUFF],IT.PG_PIE,3,'hand',IT.PG_DOUGHBALL,'Dough, with something soft inside.');
  pRecS('H8',[W,G],B.PG_CORD,8,'hand',W,'Greased wire carries a spark.');
  pRecS('H9',[IT.PG_FOAMDUST,B.PG_CORD,G],IT.PG_CHARGE,2,'hand',B.PG_CORD,'Learned from the Explosive Man.',{lock:1});
  pRec('H10',['XX','XX'],{X},B.PG_CAN,1,'hand',X,'A can. Someone will move in. Take him with you.',{label:'Empty Can'});
  /* the Bin (3x3) */
  pRec('C1',['FFF',' R ',' R '],{F,R:Rd},IT.PG_FLOPPY,1,'can',F,'Felt on a stick. It will bend. It will work.');
  pRec('C2',['FF','FR',' R'],{F,R:Rd},IT.PG_PSHEARS,1,'can',F,'Something to cut felt with.');
  pRec('C3',['F','R','R'],{F,R:Rd},IT.PG_FSCOOP,1,'can',F,'For the soft stuff.');
  pRec('C4',['F','F','R'],{F,R:Rd},IT.PG_SLAPPER,1,'can',F,'A sock on a rod. Hit things with it.');
  pRec('C5',['CCC','C C','CCC'],{C},B.PG_PTRUNK,1,'can',C,'The scenery is cardboard. Build a box. Sleep in it.');
  pRec('C6',['XXX',' R ',' R '],{X,R:Rd},IT.PG_LARPPICK,1,'can',X,'Foam is under the deck. Make it into a pick.');
  pRec('C7',['XX','XR',' R'],{X,R:Rd},IT.PG_CLIPPERS,1,'can',X,'Foam shears.');
  pRec('C8',['X','R','R'],{X,R:Rd},IT.PG_LARPSPADE,1,'can',X,'Foam scoop.');
  pRec('C9',['X','X','R'],{X,R:Rd},IT.PG_BAT,1,'can',X,'Send things back where they came from.');
  pRec('C11',['PPP','PBP','PGP'],{P:Pf,B:Bc,G},B.PG_HOTPLATE,1,'can',Pf,'Countertop, a coil, and grease to burn.');
  pRec('C12',['XXX','X X'],{X},IT.PG_FPAD_H,1,'can',X,'Foam you can wear.');
  pRec('C13',['X X','XXX','XXX'],{X},IT.PG_FPAD_C,1,'can',X,'Foam you can wear.');
  pRec('C14',['XXX','X X','X X'],{X},IT.PG_FPAD_L,1,'can',X,'Foam you can wear.');
  pRec('C15',['X X','X X'],{X},IT.PG_FPAD_B,1,'can',X,'Foam you can wear.');
  pRec('C16',['WWW',' R ',' R '],{W,R:Rd},IT.PG_HPICK,1,'can',HG,'Coat hangers come out of the drains. Melt them straight.');
  pRec('C17',['W W',' R ','R R'],{W,R:Rd},IT.PG_SNIPS,1,'can',HG,'Every bang comes down a wire. Cut it.');
  pRec('C18',['W','R','R'],{W,R:Rd},IT.PG_HSCOOP,1,'can',HG,'Wire scoop.');
  pRec('C19',[' W ','W W','WWW'],{W},IT.PG_RAPIER,1,'can',HG,'It is a coat hanger. It is also a sword.');
  pRec('C20',['KKK','WWW','P P'],{K,W,P:Pf},B.PG_BENCH,1,'can',K,'Needs copper from the coils behind the purple curtain.');
  /* the Lab Bench (3x3) */
  pRec('L1',['SSS',' D ',' R '],{S,D,R:Rd},IT.PG_DISCO,1,'lab',S,'Sequins sleep in the rot. The Drummer has the sticks.');
  pRec('L2',['S S',' R ','R R'],{S,R:Rd},IT.PG_RSNIPS,1,'lab',S,'Sequin snips.');
  pRec('L3',['S','R','R'],{S,R:Rd},IT.PG_GSCOOP,1,'lab',S,'Sequin scoop.');
  pRec('L4',['  S',' S ','D  '],{S,D},IT.PG_STILETTO,1,'lab',S,'A heel on a drumstick. Hit them on the way down.');
  pRec('L5',['QQQ','Q Q'],{Q},IT.PG_GOWN_H,1,'lab',Q,'Diva fabric you can wear. She will notice.');
  pRec('L6',['Q Q','QQQ','QQQ'],{Q},IT.PG_GOWN_C,1,'lab',Q,'Diva fabric you can wear. She will notice.');
  pRec('L7',['QQQ','Q Q','Q Q'],{Q},IT.PG_GOWN_L,1,'lab',Q,'Diva fabric you can wear. She will notice.');
  pRec('L8',['Q Q','Q Q'],{Q},IT.PG_GOWN_B,1,'lab',Q,'Diva fabric you can wear. She will notice.');
  pRec('L9',['HS','HT'],{H,S,T},IT.PG_MITT,1,'lab',H,"The big one's fur, a sequin, something slippery. Catch, don't dodge.");
  pRec('L10',['MSM','MLM',' R '],{M,S,L,R:Rd},IT.PG_VMIRROR,1,'lab',M,'Mirror glass, a sequin and a bulb. She cannot walk past one.');
  pRec('L11',['NNN','KW ',' R '],{N,K,W,R:Rd},IT.PG_STAPLER,1,'lab',N,'Pins from the swamp, copper, wire. Pin it down.');
  /* the Transmogrifier (shapeless) */
  pRecS('T1',[IT.PG_KNUCKLE,IT.PG_KNUCKLE,IT.PG_KNUCKLE,IT.PG_KNUCKLE,IT.PG_FUSE,IT.PG_PEARLS,IT.PG_STILETTO],IT.PG_GAUNTLET,1,'trans',IT.PG_KNUCKLE,
    'The floor at the bottom is someone. Take his knuckles. Bring two headliners\' things.');
}
const PI_SETS={inv:['hand'],craft:['hand'],pcan:['hand','can'],plab:['hand','can','lab'],ptrans:['trans']};
/* the stack:1 things the bin keeps and hurls (tools, weapons, armour, stations, gear) */
function piBig(id){const d=DEFS[id];if(!d)return false;if(d.tool||d.armor)return true;
  if(id===B.PG_CAN||id===B.PG_HOTPLATE||id===B.PG_BENCH||id===B.PG_PTRUNK)return true;return !!(d.item&&d.stack===1);}
function piUnlocked(r){return !r.lock||!!(MP.unlock&&MP.unlock[r.o]);}
/* every recipe a kind shows (the book: locked ones as ???) */
function piRecipeSetAll(kind){const S=PI_SETS[kind];if(!S)return [];return PRECIPES.filter(r=>S.indexOf(r.st)>=0);}
/* the craftable set for a modal kind, fixed at open (hook P2-05). Outside purgatory, or for a non-crafting kind: RECIPES. */
function piRecipeSet(kind){if(DIM!=='puppet'||!PI_SETS[kind])return RECIPES;
  const key=kind+'|'+(MP.unlock&&MP.unlock[IT.PG_CHARGE]?1:0);
  if(!piRecipeSet.c)piRecipeSet.c={};if(piRecipeSet.c[key]&&piRecipeSet.c[key].n===PRECIPES.length)return piRecipeSet.c[key].a;
  const a=piRecipeSetAll(kind).filter(piUnlocked);piRecipeSet.c[key]={a,n:PRECIPES.length};return a;}
function piRevealed(r){return piUnlocked(r)&&!!(MP.seenIng&&MP.seenIng[r.key]);}
function piHas(inv,id){return invCount(inv,id);}

/* ---- the purgatory recipe book (hook P2-11): open by default, every row of the station's sets, ??? until the key item has been
   held inside (or the boss flag is set), the hint line ALWAYS under it. Clicking a revealed row runs the engine's tryFill. ---- */
function piBuildRecipeList(body,gw,list){
  const all=piRecipeSetAll(MODAL.kind),rl=document.createElement('div');rl.id='rlist';rl.style.display='block';
  if(rl.style){rl.style.maxHeight='34vh';rl.style.overflowY='auto';}
  for(const r of all){
    if(r.p&&(r.p.length>gw||r.p[0].length>gw))continue;
    if(r.s&&r.s.length>gw*gw)continue;
    const rev=piRevealed(r),row=document.createElement('div');row.className='rrow';
    const oc=document.createElement('canvas');oc.width=oc.height=32;const g=oc.getContext('2d');
    g.drawImage(getIcon(r.o),0,0,32,32);
    if(!rev){g.globalCompositeOperation='source-atop';g.fillStyle='#1a1216';g.fillRect(0,0,32,32);g.globalCompositeOperation='source-over';}
    row.appendChild(oc);
    const col=document.createElement('div');if(col.style){col.style.display='flex';col.style.flexDirection='column';col.style.marginLeft='6px';}
    const l1=document.createElement('div');if(l1.style){l1.style.display='flex';l1.style.alignItems='center';}col.appendChild(l1);
    const nm=document.createElement('span');
    nm.textContent=rev?((r.label||DEFS[r.o].name)+(r.n>1?' x'+r.n:'')+'  ← '):'???';
    l1.appendChild(nm);
    if(rev){for(const [id,n] of recipeIngs(r)){const wrap=document.createElement('span');wrap.className='ring';
        const ic=document.createElement('canvas');ic.width=ic.height=24;ic.getContext('2d').drawImage(getIcon(id),0,0,24,24);
        ic.title=DEFS[id].name+' x'+n;wrap.appendChild(ic);
        if(n>1){const ct=document.createElement('b');ct.className='rct';ct.textContent='×'+n;wrap.appendChild(ct);}
        l1.appendChild(wrap);}}
    const hn=document.createElement('div');hn.className='rhint';hn.textContent=r.hint;
    if(hn.style){hn.style.fontSize='11px';hn.style.color=rev?'#5a4a34':'#7a2a1a';hn.style.fontStyle='italic';hn.style.lineHeight='13px';}
    col.appendChild(hn);row.appendChild(col);
    row.onclick=()=>{if(!piRevealed(r)){showToast('You have never held what it needs.');return;}tryFill(r);redrawModal();};
    rl.appendChild(row);}
  body.appendChild(rl);
  piTitle();}
/* the modal title carries the station's state: the bin's queue, the Panic Meter, the Transmogrifier's cooldown */
function piTitle(){const t=typeof $==='function'?$('mtitle'):null;if(!t||!MODAL.kind)return;
  const base={pcan:'The Bin',plab:'Lab Bench',ptrans:'Transmogrifier',inv:'Inventory'}[MODAL.kind];if(!base)return;
  let s=base;
  if(MODAL.kind==='pcan'){const q=piCanQ(MODAL.bek);if(q.length)s+='  (the lid is rattling: '+q.length+' in the can)';}
  if(MODAL.kind==='plab'){const m=Math.max(0,Math.min(12,Math.round(MP.squeak||0)));s+='  · Panic Meter '+'■'.repeat(m)+'□'.repeat(12-m);
    if(piS.bolt)s+='  (the Lab Rat has bolted)';}
  if(MODAL.kind==='ptrans'&&piS.transCD>MP.clock)s+='  (no Lab Rat: '+Math.ceil(piS.transCD-MP.clock)+' s)';
  t.textContent=s;}

/* ---- taking a result (hook P2-12): the bin keeps the big things, the Lab Rat demos lab crafts, the Transmogrifier runs.
   Returns true when P2 handled the take (the engine's default then does nothing). ---- */
function piFindRecipe(grid,w,list){const r0=calcCraft(grid,w,list);if(!r0)return null;
  for(const r of list){if(r.o!==r0.id||r.n!==r0.count)continue;if(calcCraft(grid,w,[r]))return r;}return null;}
function piTake(r,shift,s){if(DIM!=='puppet'||!MODAL.grid)return false;
  const kind=MODAL.kind,rec=piFindRecipe(MODAL.grid,MODAL.gw,MODAL.rset);if(!rec)return false;
  if(kind==='ptrans')return piTransRun(rec);
  if(kind==='plab'&&rec.st==='lab')return piLabTake(rec);
  if(kind==='pcan'&&piBig(rec.o)){
    const q=piCanQ(MODAL.bek,true);let n=0;
    for(let i=0;i<(shift?64:1);i++){const out=calcCraft(MODAL.grid,MODAL.gw,MODAL.rset);if(!out||out.id!==rec.o)break;
      takeCraft(MODAL.grid);q.push(out);n++;}
    if(n){piS.took++;playS('place');mwS('pg_lid');piTitle();redrawModal();}
    return true;}
  return false;}
/* the can's queue lives in its block entity ({t:'pcan',q:[stacks]}), so a save with the lid rattling keeps it */
function piCanQ(bek,make){if(!bek)return piS.canQ.__none||(piS.canQ.__none=[]);let be=blockEnts.get(bek);
  if(!be||be.t!=='pcan'){if(!make)return [];be={t:'pcan',q:[]};blockEnts.set(bek,be);}
  if(!Array.isArray(be.q))be.q=[];piS.canQ[bek]=be.q;return be.q;}
/* the bin volley on close (bible 7.1): the queue, plus a fresh Programme when Dan has none */
PREG.onClose.push(function piOnClose(kind,be,bek){
  if(kind==='pcan'){const q=piCanQ(bek);const L=q.splice(0,q.length);
    if(mpNeedProgramme())L.push({id:IT.PG_PROGRAMME,count:1});
    const be2=bek&&blockEnts.get(bek);if(be2&&be2.t==='pcan'&&!be2.q.length)blockEnts.delete(bek);delete piS.canQ[bek];
    if(L.length){const p=bek?dimP(bek):null;const can=p?[+p[0],+p[1],+p[2]]:[Math.floor(P.x),Math.floor(P.y),Math.floor(P.z)];
      pcanVolley(L,can,'Dan',{rate:0.3,bin:1});}}
  if(kind==='furnace'&&piS.hpTake){piS.hpTake=null;}});

/* ---- the thrower (Bin volley and Lost Property): one stack every opts.rate s, a real drop flying at the head, 1 damage for
   the big things (never below 1 HP), a small knockback, owned by `who` for 60 s. Sneaking at the start = duck: they sail over
   and land behind. who may be 'Dan' or a bot name (bots get their own volleys). ---- */
function pcanVolley(stacks,canPos,who,opts){opts=opts||{};const L=(stacks||[]).filter(s=>s&&s.count>0);if(!L.length)return null;
  if(DIM!=='puppet'){for(const s of L){if(who==='Dan'&&P){if(invAddTo(P.inv,s)>0)mpDrop(P.x,P.y+1,P.z,s,'Dan');}}if(P)redrawHotbar();return null;}
  const tgt=piVolleyTarget(who);const duck=!!(tgt&&tgt.sneak);
  const v={who,q:L.slice(),can:canPos||[Math.floor(P.x),Math.floor(P.y),Math.floor(P.z)],rate:opts.rate||0.3,t:0,duck,hits:0,thrown:0,bin:!!opts.bin,lp:!opts.bin};
  piS.vols.push(v);piS.stats.volleys++;
  if(duck&&who==='Dan'){mpTickOff('duck');piS.stats.ducks++;}
  mwS('pg_lid',v.can[0]+0.5,v.can[1]+1,v.can[2]+0.5);
  return v;}
function piVolleyTarget(who){if(who==='Dan')return P&&!P.dead?{x:P.x,y:P.y,z:P.z,h:1.6,sneak:P.sneak,yaw:P.yaw,e:P}:null;
  const a=typeof agByName==='function'?agByName(who):null;const b=a&&a.e;if(!b||b.dead||a.dim!==DIM)return null;return {x:b.x,y:b.y,z:b.z,h:1.5,sneak:false,yaw:b.yaw||0,e:b,a};}
function piVolleyTick(dt){
  for(let i=piS.vols.length-1;i>=0;i--){const v=piS.vols[i];v.t-=dt;if(v.t>0)continue;
    const st=v.q.shift();if(!st){if(v.bin&&v.hits>=3&&typeof pmHeckle==='function')try{pmHeckle('volley',{who:v.who,hits:v.hits});}catch(e){}
      piS.vols.splice(i,1);continue;}
    v.t=v.rate;const T=piVolleyTarget(v.who);
    if(!T){if(v.who==='Dan'&&P){if(invAddTo(P.inv,st)>0)mpDrop(P.x,P.y+1,P.z,st,'Dan');redrawHotbar();}else mpDrop(v.can[0]+0.5,v.can[1]+1.2,v.can[2]+0.5,st,v.who,0,3,0);continue;}
    const ox=v.can[0]+0.5,oy=v.can[1]+1.15,oz=v.can[2]+0.5;
    let tx=T.x,ty=T.y+T.h,tz=T.z;
    if(v.duck){const bx=Math.sin(T.yaw),bz=Math.cos(T.yaw);tx+=bx*3;tz+=bz*3;ty=T.y+2.2;}   /* over his head, landing behind him */
    const d=Math.hypot(tx-ox,tz-oz),Tf=Math.max(0.3,Math.min(0.9,d/13));
    /* a drop falls at GRAV*0.7 and its horizontal speed decays e^-0.6t in the air (updateDrop): aim for arrival at Tf */
    const hk=0.6/(1-Math.exp(-0.6*Tf)),vel=[(tx-ox)*hk,(ty-oy)/Tf+0.5*GRAV*0.7*Tf,(tz-oz)*hk];
    const e=mpDrop(ox,oy,oz,st,v.who,vel[0],vel[1],vel[2]);
    if(e){e.pvol={who:v.who,dmg:(v.lp?(DEFS[st.id]&&(DEFS[st.id].tool||DEFS[st.id].armor)?1:0):(piBig(st.id)?1:0)),duck:v.duck,v,t:0};}
    v.thrown++;mwS(v.lp?'pg_thunk':'pg_lid',ox,oy,oz);burstParticles(ox,oy,oz,B.PG_STUFFING,3,0.5);}
  /* a flying volley stack hitting the head: 1 damage for the big things (never below 1 HP), knockback, then it drops at the feet */
  for(const e of entities){const pv=e.pvol;if(!pv||e.dead||e.t!=='drop')continue;pv.t+=dt;if(pv.t>1.6||pv.duck){if(pv.t>1.6)e.pvol=null;continue;}
    const T=piVolleyTarget(pv.who);if(!T)continue;
    if(Math.abs(e.x-T.x)<0.7&&Math.abs(e.z-T.z)<0.7&&e.y>T.y+0.6&&e.y<T.y+2.2){
      e.pvol=null;e.vx*=0.15;e.vz*=0.15;e.vy=Math.min(e.vy,1);pv.v.hits++;piS.stats.volleyHits++;
      if(pv.dmg>0){const hp=T.e===P?P.hp:(T.a?T.a.hp:20);
        if(hp>1)purgHit(T.e===P?P:T.e,Math.min(pv.dmg,hp-1),'the Bin','bin',{force:1,kx:T.x-pv.v.can[0]-0.5,kz:T.z-pv.v.can[2]-0.5});}
      if(T.e===P)mwS('pg_thunk',e.x,e.y,e.z);}}}
function piVolleyBusy(){return piS.vols.length>0||entities.some(e=>e.pvol&&!e.dead)||!!piS.demo||piS.demoQ.length>0||!!(piS.trans&&!piS.trans.done);}
/* a boot out of the lid at a bot (or anyone): no damage, a real 1 m knockback (bible 7.1, 2.3) */
function piCanBoot(target,canPos){if(!target||!canPos)return null;const ox=canPos[0]+0.5,oy=canPos[1]+1.2,oz=canPos[2]+0.5;
  const tx=target.x,ty=target.y+1.4,tz=target.z,T=0.35;mwS('pg_lid',ox,oy,oz);
  return puSpawn('boot',ox,oy,oz,(tx-ox)/T,(ty-oy)/T+0.5*GRAV*T*0.4,(tz-oz)/T,'the Bin',{g:0.4,src:null,hitOwner:1,tgt:target});}

/* ---- the Empty Can (H10) moves in after 5 s; world cans are home from the start ---- */
PREG.onPlace.push(function piOnPlace(x,y,z,id,who){
  if(id===B.PG_CAN){piS.movein[bkey(x,y,z)]={t:MP.clock+5,x,y,z,anim:0};}
  if(id===B.PG_BENCH&&who==='Dan')piS.benches[bkey(x,y,z)]={e:piRatWalkIn(x,y,z),deadT:0,t0:MP.clock,here:0};
  if(id===B.PG_BURNER)mpLight(x,y,z,true);});
PREG.onBreak.push(function piOnBreak(x,y,z,id,who){const k=bkey(x,y,z);
  if(id===B.PG_CAN){delete piS.movein[k];const q=piS.canQ[k];if(q&&q.length){for(const s of q)mpDrop(x+0.5,y+0.6,z+0.5,s,who==='Dan'?'Dan':who,0,3,0);q.length=0;}
    if(blockEnts.has(k)&&blockEnts.get(k).t==='pcan')blockEnts.delete(k);}
  if(id===B.PG_BURNER||id===B.PG_HOTPLATE)mpLight(x,y,z,false);});
/* has the bin moved into the can at (x,y,z)? (P5 waits for it; world cans are always ready) */
function piCanReady(x,y,z){const m=piS.movein[bkey(x,y,z)];return !(m&&MP.clock<m.t)&&getBlock(x,y,z)===B.PG_CAN;}
PREG.interact.pcan=function piOpenCan(hit,hd){const k=bkey(hit.x,hit.y,hit.z),m=piS.movein[k];
  if(m&&MP.clock<m.t){showToast('Nobody home yet. Give him a moment.');return;}
  openModal('pcan',k);};
PREG.interact.plab=function piOpenLab(hit,hd){openModal('plab',bkey(hit.x,hit.y,hit.z));};
PREG.interact.ptrans=function piOpenTrans(hit,hd){openModal('ptrans',null);};
PREG.interact.psoup=function piSoupUse(hit,hd){if(heldStack())return;piSlurp(hit);};

/* ---- the Lab Bench: the Lab Rat demos every lab craft on himself (bible 7.2) ---- */
const PI_DEMO={[IT.PG_DISCO]:'zap',[IT.PG_RSNIPS]:'zap',[IT.PG_GSCOOP]:'zap',[IT.PG_GOWN_H]:'zap',[IT.PG_GOWN_C]:'zap',[IT.PG_GOWN_L]:'zap',[IT.PG_GOWN_B]:'zap',
  [IT.PG_STAPLER]:'stapled',[IT.PG_MITT]:'catch',[IT.PG_STILETTO]:'slip',[IT.PG_VMIRROR]:'admire'};
function piBenchAt(bek){const p=bek?dimP(bek):null;return p?[+p[0],+p[1],+p[2]]:null;}
function piRatNear(pos,r){if(!pos||typeof pmNpcFind!=='function')return null;let e=null;try{e=pmNpcFind('bkr',pos);}catch(err){return null;}
  return e&&!e.dead&&Math.hypot(e.x-pos[0]-0.5,e.z-pos[2]-0.5)<=(r||8)?e:null;}
function piLabTake(rec){
  if(piS.bolt){showToast('The Lab Rat has bolted. The bench will not work without him.');return true;}
  if(piS.benchBlock>MP.clock){showToast('The Lab Rat is still stapled to the wall.');return true;}
  const out=calcCraft(MODAL.grid,MODAL.gw,MODAL.rset);if(!out)return true;takeCraft(MODAL.grid);
  const pos=piBenchAt(MODAL.bek)||[Math.floor(P.x),Math.floor(P.y),Math.floor(P.z)];piS.lastBench=pos;
  piS.demoQ.push({out,pose:PI_DEMO[out.id]||'zap',pos,t:0,hurt:false});piS.took++;
  MP.squeak=(MP.squeak||0)+(out.id===IT.PG_STAPLER?3:1);
  playS('place');redrawModal();piTitle();return true;}
function piDemoTick(dt){
  if(!piS.demo&&piS.demoQ.length){piS.demo=piS.demoQ.shift();const d=piS.demo;d.bk=piRatNear(d.pos);d.bun=null;
    try{if(typeof pmNpcFind==='function')d.bun=pmNpcFind('prof',d.pos);}catch(e){}
    /* the Pig Mitt: the first time the Lab Rat raises it late and is flattened; every time after he catches it and at 4 s it bites */
    if(d.pose==='catch'){piS.mittDemos=(piS.mittDemos||0)+1;if(piS.mittDemos===1)d.pose='flattened';else d.bite=1;}
    if(d.bk&&typeof pmNpcPose==='function')try{pmNpcPose(d.bk,d.pose,d.pose==='stapled'?6:(d.bite?4.2:2.2));}catch(e){}
    if(d.bun&&typeof pmNpcPose==='function')try{pmNpcPose(d.bun,'nod',2);}catch(e){}
    /* the Vanity Mirror: a Chorus Pig wanders in from the Palace, sees itself and stops dead, admiring */
    if(d.pose==='admire'&&MOBT.pgpig&&d.bk){const a=Math.atan2(P.x-d.pos[0],P.z-d.pos[2]),sx=d.pos[0]+0.5+Math.sin(a+1.2)*7,sz=d.pos[2]+0.5+Math.cos(a+1.2)*7;
      spawnMob('pgpig',sx,mpSafeY(sx,d.pos[1]+1,sz),sz);const pg=entities[entities.length-1];pg.post=[d.pos[0]+1.5,d.pos[1]+1,d.pos[2]+1.5];d.pig=pg;
      if(typeof pmNpcPose==='function')try{pmNpcPose(pg,'walkin',3);}catch(e){}}
    mwS('pg_alarm',d.pos[0]+0.5,d.pos[1]+1,d.pos[2]+0.5);piS.stats.demos++;}
  const d=piS.demo;if(!d)return;d.t+=dt;
  const bx=d.bk?d.bk.x:d.pos[0]+0.5,by=d.bk?d.bk.y:d.pos[1]+1,bz=d.bk?d.bk.z:d.pos[2]+0.5;
  if(frameCount%5===0)burstParticles(bx,by+1.2,bz,d.pose==='zap'?B.PG_TESLA:B.PG_LINO,2,0.6);
  if(d.bk&&!d.hurt&&P&&!P.dead&&Math.hypot(P.x-bx,P.z-bz)<2&&Math.abs(P.y-by)<2.5){d.hurt=true;purgHit(P,2,'the Lab Rat','demo',{force:1,src:{x:bx,z:bz}});}
  if(d.pig&&!d.pigPose&&d.t>=1.6&&typeof pmNpcPose==='function'){d.pigPose=1;try{pmNpcPose(d.pig,'admire',4);}catch(e){}}
  if(d.t>=2){piS.demo=null;mpGive(d.out,'craft');showToast(DEFS[d.out.id].name+': tested on the Lab Rat. He is fine.');
    if(d.pose==='stapled')piS.benchBlock=MP.clock+6;
    if(d.bite&&d.bk)piS.bites.push({e:d.bk,t:MP.clock+2});}}
/* the Lab Rat's delayed mitt bite, and the Lab Rat of a bench Dan placed walking back in 30 s after he dies */
function piRatTick(){for(let i=piS.bites.length-1;i>=0;i--){const b=piS.bites[i];if(MP.clock<b.t)continue;piS.bites.splice(i,1);
    if(b.e&&!b.e.dead&&typeof pmNpcPose==='function')try{pmNpcPose(b.e,'bitten',1.5);}catch(e){}}
  if((MPF.tick%25)!==0)return;
  for(const k in piS.benches){const B0=piS.benches[k],p=dimP(k);if(!p){continue;}const x=+p[0],y=+p[1],z=+p[2];
    if(getBlock(x,y,z)!==B.PG_BENCH){if(chunkAt(x,z))delete piS.benches[k];continue;}
    if(B0.e&&!B0.e.dead){B0.deadT=0;const e=B0.e,q=e.post;                  /* he arrives within 5 s: a Lab Rat stuck on the way is put at his post */
      if(q&&!B0.here){if(Math.hypot(e.x-q[0],e.z-q[2])<1.6)B0.here=1;else if(MP.clock-(B0.t0||0)>6){e.x=q[0];e.z=q[2];e.y=mpSafeY(q[0],q[1],q[2]);e.vx=e.vy=e.vz=0;
        if(e.mesh)e.mesh.position.set(e.x,e.y,e.z);burstParticles(e.x,e.y+1,e.z,B.PG_STUFFING,6,0.5);B0.here=1;}}continue;}
    if(!B0.deadT)B0.deadT=MP.clock;
    if(MP.clock-B0.deadT>=30&&Math.hypot(P.x-x,P.z-z)<64){B0.e=piRatWalkIn(x,y,z);B0.deadT=0;B0.t0=MP.clock;B0.here=0;}}}
/* the Panic Meter: decays 1 per 8 s; at 12 the Lab Rat bolts (40 s, or carry him back) */
function piSqueakTick(dt){if(MP.squeak>0)MP.squeak=Math.max(0,MP.squeak-dt/8);
  if(!piS.bolt&&MP.squeak>=12){const at=piS.lastBench||[Math.floor(P.x),Math.floor(P.y),Math.floor(P.z)],bk=piRatNear(at,12);
    piS.bolt={until:MP.clock+40,e:bk,t0:MP.clock};MP.squeak=0;mwS('pg_alarm',P.x,P.y,P.z);
    if(bk&&typeof pmNpcPose==='function')try{pmNpcPose(bk,'bolt',40);}catch(e){}
    showToast('The Lab Rat has bolted!');}
  const b=piS.bolt;if(!b)return;
  /* P3's bench Lab Rat runs the panicked loop and the carry back (touch or right-click him, bring him to his post); the bench
     works again when his bolt pose ends (carried back), or after 40 s */
  const e=b.e,still=e&&!e.dead&&e.pose&&(e.pose.k==='bolt'||e.pose==='bolt');
  if((e&&!e.dead&&MP.clock-b.t0>0.5&&!still)||MP.clock>=b.until){piS.bolt=null;showToast('The Lab Rat is back at the bench.');}}
/* what the Professor cheerfully reads out when right-clicked (P3's NPC calls this): the first ??? lab recipe's hint, then the Gauntlet */
function piProfHint(){const lab=PRECIPES.filter(r=>r.st==='lab'),q=lab.find(r=>!piRevealed(r)),T=PRECIPES.find(r=>r.st==='trans');
  return (q?'Ah! The bench can make something you have not seen yet: "'+q.hint+'" ':'You have seen everything the bench can make! ')+
    'And the Transmogrifier: four Puppeteer Knuckles, the Lit Fuse, the Pearl Necklace and The Stiletto. '+(T?'"'+T.hint+'"':'');}
function piNearBlock(id,r){if(!P)return null;const px=Math.floor(P.x),py=Math.floor(P.y),pz=Math.floor(P.z);
  for(let dx=-r;dx<=r;dx++)for(let dy=-2;dy<=2;dy++)for(let dz=-r;dz<=r;dz++)if(getBlock(px+dx,py+dy,pz+dz)===id)return [px+dx,py+dy,pz+dz];return null;}
/* a placed bench gets its own the Lab Rat, walking in from 12 m (the NPC, its mesh and idle brain are P3's pgbkr) */
function piRatWalkIn(x,y,z){if(!MOBT.pgratb)return null;const a=Math.atan2(P.x-x,P.z-z)+Math.PI;
  const sx=x+0.5+Math.sin(a)*12,sz=z+0.5+Math.cos(a)*12,sy=mpSafeY(sx,y+1,sz),post=[x+1.5,y+1,z+0.5];let e=null;
  if(typeof pmNpcSpawn==='function'){try{e=pmNpcSpawn('bkr',post[0],post[1],post[2],{post,from:[sx,sy,sz],killable:true});}catch(err){e=null;}}
  else{spawnMob('pgratb',sx,sy,sz);e=entities[entities.length-1];e.post=post;if(typeof pmNpcPose==='function')try{pmNpcPose(e,'walkin',5);}catch(err){}}
  if(e)e.pbench=[x,y,z];return e;}

/* ---- the Transmogrifier (bible 7.3): a prop entity at Labs HQ; the Lab Rat steps in, 3 s of lightning, the hand comes out of him,
   the Gauntlet drops out of the chute still warm; no Lab Rat for 30 s ---- */
MOBT.pgtrans={hp:999,hw:1.2,h:2.6,spd:0,body:'#9aa0a8',legc:'#3a3e44',pmob:1,prop:1,pnc:1};
function piTransRun(rec){
  if(piS.transCD>MP.clock){mpSay('The Professor','The rat is fine. The rat is always fine.',3);return true;}
  if(piS.trans&&!piS.trans.done)return true;
  const out=calcCraft(MODAL.grid,MODAL.gw,MODAL.rset);if(!out)return true;takeCraft(MODAL.grid);
  const te=piTransEnt();const pos=te?[te.x,te.y,te.z]:[P.x,P.y,P.z];
  piS.trans={t:0,out,pos,e:te,done:false};piS.transCD=MP.clock+33;piS.stats.trans++;piS.took++;
  try{const bun=typeof pmNpcFind==='function'?pmNpcFind('prof',[pos[0],pos[1],pos[2]]):null;if(bun&&Math.hypot(bun.x-pos[0],bun.z-pos[2])<12&&typeof pmNpcPose==='function')pmNpcPose(bun,'nod',3);}catch(e){}
  const bk=piRatNear([Math.floor(pos[0]),Math.floor(pos[1]),Math.floor(pos[2])]);piS.trans.bk=bk;
  if(bk&&typeof pmNpcPose==='function')try{pmNpcPose(bk,'walkin',1);}catch(e){}
  closeModal(true);mwS('pg_alarm',pos[0],pos[1]+1,pos[2]);return true;}
function piTransTick(dt){const T=piS.trans;if(!T||T.done)return;T.t+=dt;const e=T.e;
  if(e&&e.mesh&&e.pparts){const fl=T.t<3&&((T.t*14)|0)%2===0;for(const m of e.pparts.glow)m.material&&m.material.emissive&&m.material.emissive.setRGB(fl?0.9:0.05,fl?0.9:0.1,fl?1:0.15);
    if(e.pparts.lever)e.pparts.lever.rotation.x=T.t<0.6?-T.t*1.6:-0.96;}
  if(T.t<3&&frameCount%3===0)burstParticles(T.pos[0],T.pos[1]+1.6,T.pos[2],B.PG_TESLA,3,0.8);
  if(T.bk&&T.t>=0.8&&!T.inside){T.inside=true;T.bk.x=T.pos[0];T.bk.z=T.pos[2];if(T.bk.mesh)T.bk.mesh.position.set(T.bk.x,T.bk.y,T.bk.z);}
  if(T.t>=3){T.done=true;const cx=T.pos[0]+1.4,cz=T.pos[2]-1.0;
    mpDrop(cx,T.pos[1]+0.8,cz,T.out,'Dan',0.5,2.5,-1.5);burstParticles(cx,T.pos[1]+0.8,cz,B.PG_SKIN,8,0.6);
    if(T.bk&&typeof pmNpcPose==='function')try{pmNpcPose(T.bk,'limp',30);}catch(err){}
    mpSay('The Professor','Oh, splendid! Rat, you can let go of the... ah. Well.',3.5);}}
function piTransEnt(){for(const e of entities)if(!e.dead&&e.mt==='pgtrans')return e;return null;}
PREG.mesh.pgtrans=function piTransMesh(G,mats){const R=piRig(),glow=[];
  const add=(w,h,d,col,x,y,z,em)=>{const m=R.box(w,h,d,col,em);m.position.set(x,y,z);G.add(m);if(em)glow.push(m);return m;};
  add(2.2,0.2,2.2,'#3a3e44',0,0.1,0);add(2.2,0.2,2.2,'#3a3e44',0,2.5,0);
  for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]])add(0.12,2.3,0.12,'#9aa0a8',x,1.3,z);
  for(const g of [add(2.0,2.2,0.04,'#bfe3f0',0,1.3,1.02,true),add(0.04,2.2,2.0,'#bfe3f0',-1.02,1.3,0,true),add(0.04,2.2,2.0,'#bfe3f0',1.02,1.3,0,true)])
    if(g.material){g.material.transparent=true;g.material.opacity=0.38;g.material.depthWrite=false;}
  add(0.9,1.0,0.6,'#5e6a7a',1.7,0.5,-0.6);add(0.7,0.3,0.4,'#2a2e34',1.7,1.05,-0.6);add(0.1,0.1,0.1,'#d81a1a',1.55,1.15,-0.42,true);
  add(0.5,0.4,0.5,'#6a6e74',1.4,0.5,-1.0);                       /* the chute */
  const lever=new THREE.Group();lever.position.set(1.95,1.0,-0.2);const lb=R.box(0.08,0.7,0.08,'#141214');lb.position.y=0.35;lever.add(lb);
  const lk=R.box(0.18,0.18,0.18,'#d81a1a');lk.position.y=0.72;lever.add(lk);G.add(lever);
  G.userData.pparts={glow,lever};return {G,legs:[],mats};};
PREG.brain.pgtrans=function piTransBrain(e,dt){if(!e.pparts&&e.mesh&&e.mesh.userData)e.pparts=e.mesh.userData.pparts;
  e.vx=e.vy=e.vz=0;if(e.mesh){e.mesh.position.set(e.x,e.y,e.z);e.mesh.rotation.y=e.yaw||0;}};
PREG.mobUse.pgtrans=function piTransUse(e){PREG.interact.ptrans(null,null);};
/* P1's structure posts, with a test seam (piS.spots[kind]) so the suites can place a post without P1's world */
function piSpots(kind){if(piS.spots&&piS.spots[kind])return piS.spots[kind];if(typeof mwSpots!=='function')return [];try{return mwSpots(kind)||[];}catch(e){return [];}}
function piTransSpawnTick(){const L=piSpots('trans'),s=L&&L[0];if(!s)return;
  if(!chunkAt(Math.floor(s[0]),Math.floor(s[2])))return;
  for(const e of entities)if(!e.dead&&e.mt==='pgtrans')return;
  if(Math.hypot(P.x-s[0],P.z-s[2])>96)return;
  spawnMob('pgtrans',s[0]+0.5,s[1],s[2]+0.5);const e=entities[entities.length-1];e.yaw=0;e.pkeep=1;}

/* ---- Burners (bible 7.5): drops resting on a coil sizzle (no pickup), one item every 4 s becomes its smelted form and pops 1.5 m
   toward the nearest player, owned by whoever dropped it. Non-smeltables pop off unchanged. Standing on it hurts (engine hurts). ---- */
function piNearestPlayer(x,z){let best=null,bd=1e9;if(P&&!P.dead){bd=Math.hypot(P.x-x,P.z-z);best={x:P.x,z:P.z,who:'Dan'};}
  if(typeof AG_ACTIVE!=='undefined'&&AG_ACTIVE)for(const a of AGENTS){const b=a.e;if(!b||b.dead||a.dim!==DIM)continue;const d=Math.hypot(b.x-x,b.z-z);if(d<bd){bd=d;best={x:b.x,z:b.z,who:a.name};}}
  return best;}
function piBurnerTick(dt){
  for(const e of entities){if(e.dead||e.t!=='drop'||e.ppop!=null)continue;   /* PZ: a pop is done; landing on the next coil of a 2x2 must not sizzle it again */
    const bx=Math.floor(e.x),by=Math.floor(e.y-0.08),bz=Math.floor(e.z);let on=e.onGround&&getBlock(bx,by,bz)===B.PG_BURNER;
    if(!on&&e.psz){const q=e.psz;on=bx===q.bx&&bz===q.bz&&e.y>q.by+0.8&&e.y<q.by+2.6&&getBlock(q.bx,q.by,q.bz)===B.PG_BURNER;}   /* mid-hop it is still sizzling */
    if(!on){if(e.psz){e.psz=null;}continue;}
    if(!e.psz)e.psz={t:0,owner:e.ppopOwner||e.thrower||(e.pown!=='Burner'?e.pown:null)||null,bx,by,bz};
    const s=e.psz;s.t+=dt;e.age=0.1;e.pown='Burner';e.pownT=MP.clock+0.5;   /* sizzling: nobody can pick it up */
    if(frameCount%6===0){burstParticles(e.x,e.y+0.15,e.z,B.PG_BURNER,1,0.3);if(Math.random()<0.25)e.vy=2.2;}
    if(s.t>=4){s.t=0;const out=SMELT[e.st.id],n=piNearestPlayer(e.x,e.z);
      const dx=n?n.x-e.x:0,dz=n?n.z-e.z:1,dl=Math.hypot(dx,dz)||1,v=1.5/0.55;
      const pop={id:out!==undefined?out:e.st.id,count:1};const ow=s.owner||null;
      if(out===undefined){pop.count=e.st.count;e.st.count=0;if(e.st.dur!=null)pop.dur=e.st.dur;}else e.st.count--;
      const d=mpDrop(bx+0.5,by+1.3,bz+0.5,pop,ow,dx/dl*v,4.5,dz/dl*v);
      if(d){d.ppop=ow||'?';d.ppopOwner=ow;if(!ow){d.pown=null;}piS.pops.push(d);}
      if(typeof playSAt==='function')playSAt('sizzle',e.x,e.y,e.z);
      if(e.st.count<=0)removeEnt(e);}}
  /* "smelt" tick: Dan picks up a Burner pop he owns (it vanishes within reach) */
  for(let i=piS.pops.length-1;i>=0;i--){const d=piS.pops[i];
    if(d.dead){if(d.ppop==='Dan'&&P&&Math.hypot(d.x-P.x,d.z-P.z)<2.6)mpTickOff('smelt');piS.pops.splice(i,1);}
    else if(d.age>60)piS.pops.splice(i,1);}}
/* Hot Plate: a furnace block entity; lit plates join MP_LIGHTS; taking a smelted item from one ticks "smelt" */
function piHotPlateTick(){
  if(MODAL.kind==='furnace'&&MODAL.be&&MODAL.bek){const p=dimP(MODAL.bek);
    if(p&&getBlock(+p[0],+p[1],+p[2])===B.PG_HOTPLATE){const c=MODAL.be.out?MODAL.be.out.count:0,id=MODAL.be.out?MODAL.be.out.id:0;
      const prev=piS.hpTake;if(prev&&prev.bek===MODAL.bek&&c<prev.c&&prev.id)mpTickOff('smelt');piS.hpTake={bek:MODAL.bek,c,id:id||(prev&&prev.id)};}}
  piS.lightT-=1;if(piS.lightT>0)return;piS.lightT=12;
  for(const [k,be] of blockEnts){if(k[0]!=='m'||k[1]!==';'||!be||be.t!=='furnace')continue;const p=dimP(k);if(!p)continue;
    const x=+p[0],y=+p[1],z=+p[2];if(!chunkAt(x,z)||getBlock(x,y,z)!==B.PG_HOTPLATE)continue;mpLight(x,y,z,be.burn>0);}}
/* register Burners in MP_LIGHTS as their chunks load (a few chunks per frame, each chunk scanned once) */
function piLightScan(){let n=0;for(const ch of chunks.values()){if(piS.scanned.has(ch))continue;piS.scanned.add(ch);const bl=ch.bl;if(!bl)continue;
    for(let i=0;i<bl.length;i++)if(bl[i]===B.PG_BURNER){const lx=(i/(WH*CH))|0,rem=i-lx*WH*CH;const y=(rem/CH)|0,lz=rem-y*CH;
      const x=ch.cx*CH+lx,z=ch.cz*CH+lz;if(getBlock(x,y,z)===B.PG_BURNER)mpLight(x,y,z,true);}
    if(++n>=3)break;}}

/* ---- loot trunks (bible 3.12, 3.6): wing trunks get random purgatory loot once; the Last Guest's trunk gets half a starter kit,
   refilled once per world entry, and carries pguest:1 (P3 arms Felt Dan from its PREG.onClose). Filled lazily within 8 m. ---- */
function piTrunkTick(){piS.trunkT-=1;if(piS.trunkT>0)return;piS.trunkT=20;
  const fill=(s,guest)=>{if(!s)return;const x=s[0],y=s[1],z=s[2];if(Math.hypot(P.x-x-0.5,P.z-z-0.5)>8||!chunkAt(x,z)||getBlock(x,y,z)!==B.PG_PTRUNK)return;
    const k=bkey(x,y,z);let be=blockEnts.get(k);const stamp=MP.stats.t0;
    if(!guest){if(be)return;be={t:'chest',inv:Array(27).fill(null),ploot:1};blockEnts.set(k,be);
      const L=[{id:IT.PG_FELT,count:3+((Math.random()*5)|0)},{id:IT.PG_FOAMCHUNK,count:2+((Math.random()*4)|0)},{id:IT.PG_SEQUIN,count:1+((Math.random()*3)|0)},
        {id:IT.PG_PIE,count:1},{id:IT.PG_FLY,count:4}];for(const s2 of L)if(Math.random()<0.8)invAddTo(be.inv,s2);return;}
    if(!be){be={t:'chest',inv:Array(27).fill(null)};blockEnts.set(k,be);}
    if(be.t!=='chest')return;be.pguest=1;if(be.pentry===stamp)return;be.pentry=stamp;
    const kit=[{id:IT.PG_LARPPICK,count:1,dur:44},{id:IT.PG_ROD,count:6},{id:IT.PG_ROAST,count:4},{id:IT.PG_PIE,count:1}];
    for(const s2 of kit){const have=invCount(be.inv,s2.id);if(have>=s2.count)continue;invAddTo(be.inv,Object.assign({},s2,{count:s2.count-have}));}};
  for(const s of piSpots('wingTrunk'))fill(s,false);for(const s of piSpots('guestTrunk'))fill(s,true);}
/* sneak + right-click a Prop Trunk: climb in (2 s of dark with the lid shut); it becomes your trunk spawn point */
PREG.sneakUse[B.PG_PTRUNK]=function piClimbIn(hit){MP.spawns.trunk=[hit.x,hit.y,hit.z];mpTickOff('trunk');piS.dark=2;piDark(true);
  mwS('pg_lid',hit.x+0.5,hit.y+1,hit.z+0.5);showToast('You climb in and pull the lid shut. This is where you wake up now.');};
function piDark(on){if(typeof document==='undefined'||!document.body)return;let el=document.getElementById('pidark');
  if(!el||!el.style){if(!on)return;el=document.createElement('div');el.id='pidark';if(!el.style)return;
    el.style.cssText='position:fixed;inset:0;background:#000;pointer-events:none;z-index:8;display:none;transition:opacity .3s';
    if(document.body.appendChild)document.body.appendChild(el);}
  el.style.display=on?'block':'none';}

/* ---- the per-frame P2 tick (inside purgatory; registration order puts it after P0 and P1) ---- */
/* MP.seenIng: every id Dan holds inside (reveals ??? recipes); MP.unlock: the Charge recipe once the Demolitionist is dead */
function piSeenPass(){const S=MP.seenIng;for(const s of P.inv)if(s&&!S[s.id])S[s.id]=1;for(const a of P.armor)if(a&&!S[a.id])S[a.id]=1;
  if(cursorStack&&!S[cursorStack.id])S[cursorStack.id]=1;if(MP.dead.bomber&&!MP.unlock[IT.PG_CHARGE])MP.unlock[IT.PG_CHARGE]=1;}
PREG.tick.push(function piTick(dt){if(!P)return;
  piS.seenT-=dt;if(piS.seenT<=0){piS.seenT=0.25;piSeenPass();
    for(const k in piS.movein){const m=piS.movein[k];if(MP.clock>=m.t&&!m.anim){m.anim=1;piCanMoveIn(m);}if(MP.clock>m.t+3)delete piS.movein[k];}}
  piVolleyTick(dt);piDemoTick(dt);piRatTick();piSqueakTick(dt);piTransTick(dt);piBurnerTick(dt);piHotPlateTick();piLightScan();piTrunkTick();
  if((MPF.tick%30)===0)piTransSpawnTick();
  if(piS.dark>0){piS.dark-=dt;if(piS.dark<=0)piDark(false);}
  piFxTick(dt);piGearTick(dt);});
/* the move-in: the lid lifts, two eyes look round, the lid slams */
function piCanMoveIn(m){mwS('pg_lid',m.x+0.5,m.y+1,m.z+0.5);burstParticles(m.x+0.5,m.y+1.1,m.z+0.5,B.PG_CAN,6,0.5);
  if(typeof THREE==='undefined'||!scene)return;const R=piRig(),g=new THREE.Group();
  const lid=R.box(0.9,0.08,0.9,'#9aa0a8');lid.position.y=0.04;g.add(lid);
  for(const x of [-0.18,0.18]){const ey=R.box(0.12,0.1,0.06,'#f4e86a',true);ey.position.set(x,-0.07,0.42);g.add(ey);}
  g.position.set(m.x+0.5,m.y+1.0,m.z+0.5);scene.add(g);
  piS.fx.push({mesh:g,age:0,life:1.4,upd:(e,dt)=>{const a=e.age;
    g.position.y=m.y+1.0+(a<0.4?a*0.8:(a<1.1?0.32:Math.max(0,0.32-(a-1.1)*2)));g.rotation.y=a<1.1?Math.sin(a*6)*0.5:0;
    if(a>=1.1&&!e.slam){e.slam=1;mwS('pg_lid',m.x+0.5,m.y+1,m.z+0.5);}}});}
/* P2's own short-lived effect meshes (never entities: they are not saved and need no engine update branch) */
function piFxTick(dt){for(let i=piS.fx.length-1;i>=0;i--){const f=piS.fx[i];f.age+=dt;try{f.upd(f,dt);}catch(e){}if(f.age>=f.life){if(f.mesh&&scene)scene.remove(f.mesh);piS.fx.splice(i,1);}}}
function piFxClear(){for(const f of piS.fx)if(f.mesh&&scene)scene.remove(f.mesh);piS.fx.length=0;}
PREG.onExit.push(function piOnExit(){piS.vols.length=0;piS.demo=null;piS.demoQ.length=0;piS.trans=null;piS.bolt=null;piS.raise=null;piS.held=null;
  piS.dark=0;piDark(false);piMittShow(false);piPupilsHide();piPrintsClear();piFxClear();});
PREG.onReset.push(function piOnReset(){piS.vols.length=0;piS.demo=null;piS.demoQ.length=0;piS.trans=null;piS.bolt=null;piS.transCD=0;piS.benchBlock=0;
  piS.movein={};piS.canQ={};piS.raise=null;piS.benches={};piS.bites.length=0;piS.mittDemos=0;piS.held=null;piS.pops.length=0;piS.scanned=new WeakSet();piS.dark=0;piS.stuckDan={};
  if(piRecipeSet.c)piRecipeSet.c={};piPrintsClear();piFxClear();});
PREG.onLoad.push(function piOnLoad(){piS.scanned=new WeakSet();if(piRecipeSet.c)piRecipeSet.c={};piS.canQ={};
  for(const [k,be] of blockEnts)if(be&&be.t==='pcan'&&Array.isArray(be.q))piS.canQ[k]=be.q;});
PREG.onDeath.push(function piOnDeath(who){if(who==='Dan'){piS.raise=null;piS.held=null;piS.hy.c=0;}});

/* ---- the test / pilot seam: exactly the UI path (open the station, tryFill, take the result, close) ---- */
function piCraftSeam(outId,kind){if(DIM!=='puppet'||!P)return false;kind=kind||'inv';
  let bek=null;
  if(kind==='pcan'||kind==='plab'){const want=kind==='pcan'?B.PG_CAN:B.PG_BENCH,at=piNearBlock(want,5);if(!at)return false;bek=bkey(at[0],at[1],at[2]);
    const m=piS.movein[bek];if(m&&MP.clock<m.t)return false;}
  if(kind==='ptrans'){const te=piTransEnt();if(!te||Math.hypot(te.x-P.x,te.z-P.z)>6)return false;}
  /* the station's modal state exactly as openModal + hook P2-05 set it for a crafting kind, without building DOM (so the seam also
     runs under the root stubs: og_trace's purgatory session calls it), then the UI's own tryFill, takeResult and closeModal */
  closeModal(true);piSeenPass();
  const gw=kind==='inv'?2:3;MODAL.kind=kind;MODAL.slots=[];MODAL.gw=gw;MODAL.grid=Array(gw*gw).fill(null);MODAL.be=null;MODAL.bek=bek;
  MODAL.rset=piRecipeSet(kind);
  try{const r=(MODAL.rset||[]).find(q=>q.o===outId);if(!r||!piRevealed(r))return false;
    tryFill(r);const res=calcCraft(MODAL.grid,MODAL.gw,MODAL.rset);if(!res||res.id!==outId)return false;
    const slot={kind:'result',get:()=>calcCraft(MODAL.grid,gw,MODAL.rset),set:()=>{}};
    const tot=()=>(MODAL.grid||[]).reduce((n,s)=>n+(s?s.count:0),0),n0=tot(),t0=piS.took;takeResult(slot,false);
    return piS.took>t0||(!!MODAL.grid&&tot()<n0);}
  finally{if(MODAL.kind)closeModal(true);}}
Object.assign(PGEX,{piCanReady,piProfHint,piCraftSeam,piRecipeSet,piRecipeSetAll,piRevealed,piVolleyBusy,pcanVolley,piCanBoot,piTake,piS:()=>piS,PI_DEMO,piBig,piHas});
/* live internals the P2 suites read (tests only; read at call time) */
PGEX.p2Core=()=>({isTorch,mulberry32,torches,MINE,tryFill,takeResult,redrawHotbar,dropSel,handG:()=>handG,MP_LIGHTS,ICONS,getIcon,primeTNT,
  BOWN:typeof BOWN!=='undefined'?BOWN:null,ownIdx:typeof ownIdx==='function'?ownIdx:null,chunks,piSpots,drawStats,updateTorchLights,TLIGHTS});
