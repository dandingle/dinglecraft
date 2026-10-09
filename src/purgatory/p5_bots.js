/* ---- PART 55: p5_bots.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p5_bots.js (P5): the AI players in Puppet Purgatory (bible section 14, plan 5.5, maps/ai_players.md 11-12).
   BunkerBrad, xx_lilcreepah_xx and honeybee_mc come in with Dan and go out with him, bring nothing (their own Stage
   Trunks in the row at the door), climb the purgatory ladder with PRECIPES only (ledger-honest), perceive purgatory gated
   like the Programme, help or compete in character on the headliners and fall out of the Stage Door after the escape.
   Rules of this file (p_static checks them): the top level declares only functions and vars (plus PREG registrations and
   the PGEX export); every table edit happens in the lazy, idempotent purgBotInit(); purgRealm() swaps the contents of
   AG_GATHER, AG_HUNT, AG_JUNK and VG with pristine copies, so the overworld tables are byte-identical outside. Core PART 53
   lines change only through hooks_P5.py (40 reps, all head-dispatches or DIM guards). Nothing here runs on an overworld
   per-frame path before a Stage Door exists; botsmoke never enters purgatory.
   --------------------------------------------------------------------------------------------------------------------- */
var PURG_GUIDE='';                                  /* the last guide text built by purgGuide(a) (the brain's third system block) */
var AGP_GATHER={},AGP_HUNT={},AGP_JUNK=[],AGP_INTER=[],AGP_ORES=[],AGP_ALIAS={},AGP_VG={};
var purgS={init:false,realm:'over',pri:null,arr:[],epi:null,rec:new Map(),ladder:null,spot:null,spotT:0,keepT:0,warned:{}};

/* ---- names ---- */
function purgMtName(k){const F={pgcharge:'Charge',pgfly:'Felt Fly',pgtrans:'Transmogrifier',pgwhat:'Blank',pghollow:'Hollow',pghand:'Hand',
    pgposs:'Possessed Hollow',pgcomic:'the Comic',pghen:'Rubber Hen',pgpelican:'the Pelican',pgdrummer:'the Drummer',pgrat:'Lab Rat Clone',pgrat2:'Lab Rat Clone',
    pgrat4:'Lab Rat Clone',pgyeti:'the Yeti',pgdare:'the Daredevil',pgfrog:'Thieving Frog',pgpig:'Chorus Pig',pgcook:'the Cook',pgprof:'the Professor',
    pgratb:'the Lab Rat',pgoldgoat:'Old Goat',pgoldergoat:'Older Goat',pgweather:'the Weatherman',pgbomber:'the Demolitionist',pgbigpig:'the Pig',pgbigfrog:'the Frog',
    pgpiglet:'Piglet',pghog:'the Hero Hog',pgspot:'Followspot'};
  if(F[k])return F[k];const s=String(k).replace(/^pg/,'');return s?s[0].toUpperCase()+s.slice(1):'something';}
function purgNorm(s){return String(s==null?'':s).toLowerCase().replace(/[^a-z' ]/g,' ').replace(/'/g,'').replace(/\s+/g,' ').trim();}
function purgNm(id){return DEFS[id]?DEFS[id].name:'?';}
function purgNewRec(){return {stash:null,mem:null,held:[],deaths:0,lost:[],pend:0,out:0,gag:{}};}
function purgRec(a){const n=a&&a.name?a.name:String(a);let R=MP.bots[n];
  if(!R||typeof R!=='object')R=MP.bots[n]=purgNewRec();
  if(!Array.isArray(R.held))R.held=[];if(!Array.isArray(R.lost))R.lost=[];if(!R.gag||typeof R.gag!=='object')R.gag={};R.deaths=R.deaths|0;return R;}
function purgP2Real(){return typeof PRECIPES!=='undefined'&&Array.isArray(PRECIPES)&&PRECIPES.length>0;}   /* P2's stub has no recipes (and its volley ignores bots) */
function purgBrainOn(){return !!(BRAIN.ok||BRAIN.mock);}

/* ---- lazy tables (bible 14.1) ---- */
function purgBotInit(){
  if(typeof MOB_NAME!=='undefined'){
    const PM=typeof PM_NAMES!=='undefined'&&PM_NAMES?PM_NAMES:{},HN=typeof HN_NAMES!=='undefined'&&HN_NAMES?HN_NAMES:{};
    for(const k in PM)if(PM[k])MOB_NAME[k]=PM[k];
    for(const k in HN)if(HN[k])MOB_NAME[k]=HN[k];
    for(const k in MOBT)if(MOBT[k]&&MOBT[k].pmob&&!MOB_NAME[k])MOB_NAME[k]=purgMtName(k);}
  if(purgS.init)return true;purgS.init=true;
  const cg={};for(const k in AG_GATHER)cg[k]=AG_GATHER[k].slice();
  purgS.pri={g:cg,h:Object.assign({},AG_HUNT),j:AG_JUNK.slice(),v:Object.assign({},VG)};
  const G=(keys,ids)=>{for(const k of keys)AGP_GATHER[k]=ids.slice();};
  G(['felt','felt sleeve','felt sleeves','sleeve','sleeves','wood','log','logs','tree','trees','puppet tree','puppet trees'],[B.PG_SLEEVE]);
  G(['forearm','forearms','puppeteer forearm','grease','elbow grease'],[B.PG_FOREARM]);
  G(['stone','cobble','cobblestone','rock','foam','foam rubber','foam chunk','foam chunks'],[B.PG_FOAM]);
  G(['rot','rotten foam','foam dust'],[B.PG_ROT]);
  G(['eyes','eye','canopy eye','plastic eye','plastic eyes'],[B.PG_EYE]);
  G(['googly','googlies','googly eyes','googly ore'],[B.PG_GOOGLY]);
  G(['wire','wire ore','hanger','hangers','coat hanger','coat hangers','raw coat hanger','raw coat hangers','iron','iron ore'],[B.PG_WIREORE]);
  G(['sequin','sequins','sequin ore','gold','diamond','diamonds'],[B.PG_SEQORE]);
  G(['knuckle','knuckles','knuckle ore','puppeteer knuckle'],[B.PG_KNUCKLE]);
  G(['pins','pin','steel pins','pincushion','pincushions'],[B.PG_PINS]);
  G(['copper','copper winding','tesla','tesla coil','tesla coils'],[B.PG_TESLA]);
  G(['mirror','mirrors','mirror shard','mirror shards','dressing mirror'],[B.PG_MIRROR]);
  G(['laminate','laminate chip','laminate chips','countertop','countertops','counter'],[B.PG_COUNTER]);
  G(['coil','burner','burners','burner coil'],[B.PG_BURNER]);
  G(['stuffing','stuffing drift'],[B.PG_STUFFING]);
  G(['fleece','puppet fleece'],[B.PG_FLEECE]);
  G(['cardboard','flat','flats','scenery'],[B.PG_BACKING,B.PG_PHILL,B.PG_PSKY]);
  G(['dough','dough ball'],[B.PG_DOUGH]);
  G(['satin','satin dune'],[B.PG_SATIN]);
  G(['deck','stage deck','dirt','planks of the stage'],[B.PG_DECK]);
  G(['shag','shag carpet','grass'],[B.PG_SHAG]);
  G(['lino','linoleum','lab linoleum'],[B.PG_LINO]);
  G(['swamp felt'],[B.PG_SWAMP]);
  G(['arm hole','arm holes','armhole','armholes','hole','holes'],[B.PG_ARMHOLE]);
  G(['cattail','cattails'],[B.PG_CATTAIL]);
  const H=(keys,v)=>{for(const k of keys)AGP_HUNT[k]=v;};
  H(['chicken','chickens','hen','hens','rubberchicken'],'pghen');
  H(['food','meat','dinner','animal','animals'],'pghen|pgpig|pgpiglet');
  H(['demolitionist','thedemolitionist','bomber','bombguy'],'pgbomber');H(['bigpig','thepig'],'pgbigpig');H(['bigfrog','frog','thefrog','management','themanagement'],'pgbigfrog');H(['followspot','spotlight'],'pgspot');
  H(['pig','pigs','choruspig','choruspigs'],'pgpig|pgpiglet');H(['piglet','piglets'],'pgpiglet');H(['hog','hogs','herohog','theherohog'],'pghog');
  H(['blank','blanks'],'pgwhat');H(['hollow','hollows'],'pghollow|pgposs');H(['hand','hands'],'pghand');H(['comic','thecomic','hound','comedian'],'pgcomic');
  H(['pelican','thepelican','fishman'],'pgpelican');H(['drummer','thedrummer','gorilla'],'pgdrummer');H(['rat','rats','labrat','labrats','labratclone','labratclones','clone','clones'],'pgrat|pgrat2|pgrat4');
  H(['yeti','theyeti'],'pgyeti');H(['daredevil','thedaredevil','dummy','crashtestdummy'],'pgdare');H(['frogs','thievingfrog','thievingfrogs'],'pgfrog');
  H(['boss','headliner'],'pgbomber|pgbigpig|pgbigfrog');
  H(['mob','mobs','monster','monsters','puppet','puppets'],'pgwhat|pghollow|pgposs|pghand|pgcomic|pgpelican|pgrat|pgrat2|pgrat4|pgyeti|pgdare|pgfrog|pgfeltdan');
  for(const id of [B.PG_DECK,B.PG_SLEEVE,B.PG_LINO,B.PG_SWAMP])AGP_JUNK.push(id);
  AGP_INTER.push({id:IT.PG_FELT,from:B.PG_SLEEVE,per:4},{id:IT.PG_ROD,from:IT.PG_FELT,per:2});
  for(const id of [B.PG_GOOGLY,B.PG_WIREORE,B.PG_SEQORE])AGP_ORES.push(id);
  const A=(keys,id)=>{for(const k of keys)AGP_ALIAS[k]=id;};
  A(['stick','sticks','handle','handles','rod','rods','puppet rod','puppet rods'],IT.PG_ROD);
  A(['wood','log','logs','plank','planks','wood planks','wooden planks','oak planks','felt'],IT.PG_FELT);
  A(['stone','cobble','cobblestone','foam','foam chunk'],IT.PG_FOAMCHUNK);
  A(['chest','chests','box','storage','trunk','prop trunk'],B.PG_PTRUNK);
  A(['table','workbench','crafting table','crafting','empty can','can','bin','the bin','station'],B.PG_CAN);
  A(['furnace','oven','smelter','hot plate','hotplate','stove'],B.PG_HOTPLATE);
  A(['torch','torches','lamp','lamps','light','lights','eyeball lamp','eyeball lamps'],B.PG_LAMP);
  A(['bench','lab bench'],B.PG_BENCH);A(['cord','det cord','fuse wire'],B.PG_CORD);A(['staple','staples'],IT.PG_STAPLES);
  const V=(id,ch)=>{if(id!=null)AGP_VG[id]=ch;};
  V(B.PG_DECK,'D');V(B.PG_SHAG,'G');V(B.PG_FOAM,'S');V(B.PG_ROT,'R');V(B.PG_SLEEVE,'L');V(B.PG_FOREARM,'K');V(B.PG_FLEECE,'F');
  V(B.PG_EYE,'E');V(B.PG_STUFFING,'W');V(B.PG_COUNTER,'C');V(B.PG_BURNER,'B');V(B.PG_LINO,'I');V(B.PG_TESLA,'T');V(B.PG_SATIN,'A');
  V(B.PG_MIRROR,'Y');V(B.PG_SHEET,'X');V(B.PG_SWAMP,'Z');V(B.PG_PINS,'P');V(B.PG_PTRUNK,'H');V(B.PG_CAN,'M');V(B.PG_HOTPLATE,'N');
  V(B.PG_BENCH,'J');V(B.PG_SEAT,'U');V(B.PG_DOUGH,'Q');
  for(const id of [B.PG_GOOGLY,B.PG_WIREORE,B.PG_SEQORE,B.PG_KNUCKLE])V(id,'O');
  /* reflex-only skills (never in the brain's skill list) */
  SK.pgsnip=purgSkSnip;SK.pgcollect=purgSkCollect;SK.pgaside=purgSkAside;
  SK_MAX.pgsnip=12;SK_MAX.pgcollect=16;SK_MAX.pgaside=16;
  return true;}
/* swap the contents of the four realm tables (pristine copies taken at the first init); the overworld gets its exact v6.0 tables back */
function purgRealm(r){purgBotInit();r=r==='puppet'?'puppet':'over';if(purgS.realm===r)return r;
  const P0=purgS.pri,src=r==='puppet'?{g:AGP_GATHER,h:AGP_HUNT,j:AGP_JUNK,v:Object.assign({},AGP_VG)}:P0;
  for(const k of Object.keys(AG_GATHER))delete AG_GATHER[k];for(const k in src.g)AG_GATHER[k]=src.g[k].slice();
  for(const k of Object.keys(AG_HUNT))delete AG_HUNT[k];for(const k in src.h)AG_HUNT[k]=src.h[k];
  AG_JUNK.length=0;for(const id of src.j)AG_JUNK.push(id);
  for(const k of Object.keys(VG))delete VG[k];for(const k in src.v)VG[k]=src.v[k];
  purgS.realm=r;purgS.rec.clear();return r;}

/* ---- where things come from (bible 14.1: agSourcesOf) ---- */
function agSourcesOf(id){const out={blocks:[],mobs:[],smelt:[]};
  for(const k in DEFS){const b=+k,d=DEFS[b];if(!d||d.item||d.hard<0||(DIM==='puppet')!==!!d.pg)continue;
    let dr=null;try{dr=blockDrop(b);}catch(e){}if(dr&&dr.id===id)out.blocks.push(b);}
  if(id===IT.PG_FLEECE&&!out.blocks.includes(B.PG_FLEECE))out.blocks.push(B.PG_FLEECE);
  if(id===IT.PG_ROD&&!out.blocks.includes(B.PG_ARMHOLE))out.blocks.push(B.PG_ARMHOLE);
  for(const mt in MOBT){const T=MOBT[mt];if(!T||!T.drop||(DIM==='puppet')!==!!T.pmob)continue;const d=T.drop;
    if((typeof d==='number'?d:d.id)===id)out.mobs.push(mt);}
  for(const k in SMELT)if(SMELT[k]===id&&(DIM!=='puppet'||(DEFS[+k]&&DEFS[+k].pg)))out.smelt.push(+k);
  return out;}
function purgGatherWord(b){let best=null;for(const k in AGP_GATHER)if(AGP_GATHER[k].includes(b)&&(!best||k.length<best.length))best=k;return best||purgNm(b).toLowerCase();}
function purgHuntWord(mt){for(const k in AGP_HUNT)if(AGP_HUNT[k]===mt)return k;return mt;}

/* ---- ground (plan 4.5 P5-02) ---- */
function purgSpotY(x,z){x=Math.floor(x);z=Math.floor(z);const W=MPC.WALK;
  if(x<W.x0||x>W.x1||z<W.z0||z>W.z1)return null;
  if(!chunkAt(x,z)){const h=mpSurf(x,z);return h>=30?h+1:null;}
  const y=surfaceTop(x,z),id=getBlock(x,y,z),d=DEFS[id];
  if(y<30||!d||d.hurts||id===B.PG_MBLACK||id===B.PG_VELVET||id===B.PG_TRAVELER||id===B.PG_SEAT||id===B.PG_TESLA||id===B.PG_SKIN)return null;
  for(let k=1;k<=2;k++){const b=getBlock(x,y+k,z);if(b===B.PG_SOUP||b===B.PG_SCUM||(b!==B.AIR&&DEFS[b]&&DEFS[b].solid!==false))return null;}
  return y+1;}

/* ---- travel (bible 14.1, maps/ai_players.md 12.1): per-dimension memory and a clean slate ---- */
function agFollowDim(a,d){const R=purgRec(a);
  if(d==='puppet'){if(!R.mem)R.mem={home:a.home||null,spawn:a.spawn||null,base:a.base||null,myTable:a.myTable||null,myFurnace:a.myFurnace||null,
      proj:a.proj||null,lastDeath:a.lastDeath||null};
    a.home=null;a.base=null;a.myTable=null;a.myFurnace=null;a.myBench=null;a.proj=null;a.lastDeath=null;
    a.spawn=[MPC.MARK[0]+0.5,MPC.MARK[1],MPC.MARK[2]+0.5];}
  else{const m=R.mem||{};a.home=m.home||null;if(m.spawn)a.spawn=m.spawn;a.base=m.base||null;a.myTable=m.myTable||null;a.myFurnace=m.myFurnace||null;
    a.myBench=null;a.proj=m.proj||null;a.lastDeath=m.lastDeath||null;R.mem=null;}
  a.sk=null;a.q=[];a.rx=null;a.bjob=null;a.path=null;a.pf=null;a.act=null;a.spill=null;a.badCells=null;a.look=null;a.typing=[];a.typingT=0;
  a.pgrab=null;a.pgArr=null;a.pgLost=null;a.pgOut=null;a.pgDNP=0;a.pgDNPhit=0;a.offFail=null;a.offFails=0;a.fallD=0;
  if(a.dead){a.dead=false;a.hp=20;a.hunger=20;a.exh=0;}
  _structCache=null;}
/* the strip (plan 3.6, called by P0's mpStrip in the overworld, after Dan's trunk): one Stage Trunk per online bot, ledger 'used' */
function purgBotsStash(){if(typeof AG_ACTIVE==='undefined'||!AG_ACTIVE||!GR.botPurg||DIM!=='over')return 0;purgBotInit();let n=0;
  for(let i=0;i<AG_ORDER.length;i++){const a=agByName(AG_ORDER[i]);if(!a||!a.online||a.dim!=='over')continue;
    if(a.e)agSyncFromBody(a);
    const k=mpPlaceTrunk(a.name,i+1,[]);if(!k)continue;                         /* no door: the bot stays frozen outside (v6.0 behaviour) */
    const be=blockEnts.get(k),stacks=[];
    for(let s=0;s<a.inv.length;s++){const st=a.inv[s];if(!st)continue;stacks.push(st);agLed(a,'used',st.id,st.count);a.inv[s]=null;}
    for(let s=0;s<4;s++){const st=a.armor[s];if(!st)continue;st.count=1;stacks.push(st);agLed(a,'used',st.id,1);a.armor[s]=null;}
    for(let s=0;s<stacks.length&&s<be.inv.length;s++)be.inv[s]=stacks[s];      /* by reference: dur, ench and mob ride along */
    a.sel=0;
    const near=a.e&&P&&Math.hypot(a.e.x-P.x,a.e.z-P.z)<=40;
    if(near)burstParticles(a.e.x,a.e.y+0.4,a.e.z,B.PG_STUFFING,14,0.8);         /* dragged under where it stood */
    agDropBody(a);
    const R=purgRec(a);R.stash=k;R.pend=1;R.out=0;R.held=R.held||[];
    agFollowDim(a,'puppet');
    agEvent(a,'A frog puppet bit Dan at the Stage Door and you were dragged in after him, into Puppet Purgatory. Everything you carried is locked in your own Stage Trunk by that door: you get it back only when Dan leads everyone out',8);
    n++;}
  return n;}
/* right after setDim('puppet') (P0's mpArrive): the bots fall out of the dark 2 s apart once the entry cutscene is over */
function purgBotsEnter(){if(typeof AG_ACTIVE==='undefined'||!AG_ACTIVE)return 0;purgBotInit();purgRealm('puppet');purgS.arr=[];let i=0;
  for(const name of AG_ORDER){const a=agByName(name),R=MP.bots[name];if(!a||!a.online||!R||!R.pend)continue;purgQueueArrival(a,i++);}
  return i;}
function purgQueueArrival(a,i){purgS.arr=purgS.arr.filter(q=>q.name!==a.name);purgS.arr.push({name:a.name,t:MP.clock+1.5+2*(i|0)});}
function purgArrive(a){const R=purgRec(a);R.pend=0;
  const sh=AG_DEF[a.name].short,H=MPC.BOT_HEAP,C=MPC.HUB_CAN;
  let x,z;if(sh==='creep'){x=C[0]+0.5;z=C[2]+0.5;}else if(sh==='brad'){x=H.x0+0.5;z=H.z0+0.5;}else{x=H.x1+0.5;z=H.z1+0.5;}
  const top=chunkAt(Math.floor(x),Math.floor(z))?surfaceTop(Math.floor(x),Math.floor(z)):mpSurf(x,z);
  a.x=x;a.y=Math.min(MPC.CEIL-2,top+9);a.z=z;a.yaw=Math.PI;a.dim='puppet';a.dead=false;a.hp=20;a.hunger=20;a.exh=0;a.air=10;a.fallD=0;
  a.spawnProt=AG_T+8;a.pgArr={k:sh,t:AG_T,landed:false};
  agEvent(a,'You fell out of the dark onto the stage of Puppet Purgatory with nothing at all. Dan is here too',8);
  if(!a.bs)a.bs={why:[]};a.bs.lastMind=-99;agMindForce(a,'you were just dragged into Puppet Purgatory with an empty inventory');
  purgSpotOn(a.name,x,top+1,z);}
/* bots joining while Dan is inside (agJoinAll in purgatory, incl. a reload inside) */
function purgJoinIn(){if(DIM!=='puppet'||typeof AG_ACTIVE==='undefined'||!AG_ACTIVE)return 0;purgBotInit();purgRealm('puppet');let i=0;
  for(const name of AG_ORDER){const a=agByName(name);if(!a||!a.online)continue;const R=MP.bots[name];
    if(a.dim==='puppet'){if(R&&R.pend)R.pend=0;continue;}
    if(R&&R.pend){purgQueueArrival(a,i++);continue;}                             /* saved between the strip and the arrival */
    if(!GR.botPurg)continue;
    const Q=purgRec(a);
    for(let s=0;s<a.inv.length;s++){const st=a.inv[s];if(!st)continue;Q.held.push(st);agLed(a,'used',st.id,st.count);a.inv[s]=null;}
    for(let s=0;s<4;s++){const st=a.armor[s];if(!st)continue;st.count=1;Q.held.push(st);agLed(a,'used',st.id,1);a.armor[s]=null;}
    a.sel=0;agDropBody(a);agFollowDim(a,'puppet');Q.pend=1;
    agEvent(a,'You joined while Dan is inside Puppet Purgatory and were dragged in after him. Your things are being held for you: you get them back when Dan leads everyone out',8);
    purgQueueArrival(a,i++);}
  return i;}
/* the escape (P0's mpExit, after Dan is back outside): customs for every bot, memory restored, then the epilogue drops them out of the door */
function purgBotsExit(){purgBotInit();const L=[];
  for(const name of AG_ORDER){const a=agByName(name),R=MP.bots[name];if(!a||!R)continue;
    if(!R.stash&&!(R.held&&R.held.length)&&a.dim!=='puppet'&&!R.pend)continue;
    let gone=0;
    for(let s=0;s<a.inv.length;s++){const st=a.inv[s];if(st&&DEFS[st.id]&&DEFS[st.id].pg){agLed(a,'used',st.id,st.count);a.inv[s]=null;gone++;}}
    for(let s=0;s<4;s++){const st=a.armor[s];if(st&&DEFS[st.id]&&DEFS[st.id].pg){agLed(a,'used',st.id,1);a.armor[s]=null;gone++;}}
    R.lost=[];R.pend=0;
    agDropBody(a);agFollowDim(a,'over');a.dim='puppet';                           /* frozen (no body) until its turn at the door */
    R.out=1;L.push(a);}
  purgRealm('over');purgS.arr=[];
  purgS.epi={q:L.map((a,i)=>({name:a.name,t:AG_T+1.2+2*i})),run:null,done:!L.length};
  return L.length;}
function purgPopOut(a){const d=MP.door,R=purgRec(a);const fx=d?d.f[0]:0,fz=d?d.f[1]:1;
  const x=d?d.x+0.5+fx*0.9:a.x,z=d?d.z+0.5+fz*0.9:a.z,y=d?d.y+0.05:a.y;
  a.dim='over';a.x=x;a.y=y;a.z=z;a.yaw=Math.atan2(-fx,-fz);a.dead=false;a.hp=Math.max(1,a.hp||20);a.spawnProt=AG_T+3;a.fallD=0;
  a.pgOut={fx,fz,done:false};
  const give=st=>{if(st&&st.count>0)agGiveOrDrop(a,st,'container',x,y+1,z);};
  for(const key of [a.name,a.name+'~2',a.name+'~3']){const k=key===a.name?(R.stash||MP.trunks[a.name]):MP.trunks[key];if(!k)continue;
    const be=blockEnts.get(k);if(be&&be.inv){for(let i=0;i<be.inv.length;i++){give(be.inv[i]);be.inv[i]=null;}}
    mpRemoveTrunk(k);delete MP.trunks[key];}
  for(const st of R.held||[])give(st);
  R.held=[];R.stash=null;R.out=0;
  agAutoEquip(a);
  agEvent(a,'You fell out of the Stage Door back into the overworld. Your own things are back in your pockets',7);
  if(!a.bs)a.bs={why:[]};agNeedTurn(a,'you are back in the overworld');
  mwS('pg_thunk',x,y,z);}

/* ---- the ladder (bible 14.1 autopilot; PURG_LADDER rows by id + the two P5-only rows) ---- */
function purgLadder(){if(purgS.ladder)return purgS.ladder;
  const L=typeof PURG_LADDER!=='undefined'?PURG_LADDER:[],row=id=>L.find(r=>r.id===id)||{};
  const tier=(a,c)=>agToolLevel(a,c),has=(a,id)=>agHas(a,id)>0;
  const R=[];const add=(id,o)=>{const r=row(id);R.push(Object.assign({id,item:r.item,craft:r.craft,gather:r.gather,where:r.where},o));};
  add('floppy',{done:a=>tier(a,'pick')>=0});
  add('slapper',{done:a=>tier(a,'sword')>=0});
  add('shears',{done:a=>tier(a,'axe')>=0});
  add('larp',{done:a=>tier(a,'pick')>=1});
  add('bat',{done:a=>tier(a,'sword')>=1});
  add('fpad',{done:a=>!!a.armor[1]||has(a,IT.PG_FPAD_C)});
  add('hotplate',{done:a=>has(a,B.PG_HOTPLATE)||!!purgOwnBlock(a,'myFurnace',B.PG_HOTPLATE)||(tier(a,'pick')>=2&&(has(a,IT.PG_SNIPS)||has(a,IT.PG_RSNIPS)))});
  add('hpick',{item:IT.PG_HPICK,craft:[IT.PG_HPICK,'pcan'],done:a=>tier(a,'pick')>=2});
  add('snips',{done:a=>has(a,IT.PG_SNIPS)||has(a,IT.PG_RSNIPS)});
  add('rapier',{done:a=>tier(a,'sword')>=2});
  add('bomber',{gate:'bomber'});
  add('bench',{done:a=>has(a,B.PG_BENCH)||!!purgStationFind(a,'plab',120)});
  add('disco',{item:IT.PG_DISCO,craft:[IT.PG_DISCO,'plab'],done:a=>tier(a,'pick')>=3});
  add('bigpig',{gate:'bigpig'});
  add('staple',{done:a=>has(a,IT.PG_STAPLER)});
  add('staples',{done:a=>agHas(a,IT.PG_STAPLES)>=16||!has(a,IT.PG_STAPLER)});
  add('bigfrog',{gate:'bigfrog'});
  purgS.ladder=R;return R;}
/* the first unmet step for this bot ({row} or {cap:'bomber'} when the ladder waits on a headliner) */
function purgNextStep(a){const L=purgLadder();
  for(let i=0;i<L.length;i++){const r=L[i];
    if(r.gate){if(!MP.dead[r.gate])return {cap:r.gate};continue;}
    if(r.done(a))continue;
    if(a.pgSkip&&a.pgSkip[r.id]>MP.clock)continue;
    if(!r.craft)continue;
    /* a better tool of the same class you can make right now beats the step you are short of (a broken Floppy Pick and a pile of foam) */
    const t=DEFS[r.craft[0]]&&DEFS[r.craft[0]].tool;
    if(t&&purgCraftCheck(a,r.craft[0],1)){for(let j=L.length-1;j>i;j--){const q=L[j];if(q.gate&&!MP.dead[q.gate])continue;const tq=q.craft&&DEFS[q.craft[0]]&&DEFS[q.craft[0]].tool;
        if(tq&&tq.type===t.type&&tq.tier>t.tier&&!q.done(a)&&!purgCraftCheck(a,q.craft[0],1)&&!L.slice(i,j).some(x=>x.gate&&!MP.dead[x.gate]))return {row:q};}}
    return {row:r};}
  return {cap:null};}

/* ---- recipes (PRECIPES through P2's station sets; realm-keyed validity cache) ---- */
function purgSet(kind){try{const L=piRecipeSet(kind);return Array.isArray(L)?L:[];}catch(e){return [];}}
function purgFits(r,w){if(r.s)return r.s.length<=w*w;return r.p.length<=w&&r.p[0].length<=w;}
function purgLocked(r){if(!r)return true;if((r.lock||r.locked||r.boss)&&!MP.unlock[r.o])return true;
  if(r.o===IT.PG_CHARGE&&!MP.unlock[IT.PG_CHARGE]&&!MP.dead.bomber)return true;return false;}
function purgRecOK(r,kind){const key=kind+'|';let m=purgS.rec.get(r);if(!m){m={};purgS.rec.set(r,m);}if(key in m)return m[key];
  const list=purgSet(kind);let ok=false;
  if(list.includes(r)){for(const w of kind==='inv'?[2]:[3]){if(!purgFits(r,w))continue;const grid=Array(w*w).fill(null);
      if(r.s)r.s.forEach((k,i)=>{grid[i]={id:k,count:1};});
      else for(let y=0;y<r.p.length;y++)for(let x=0;x<r.p[y].length;x++){const ch=r.p[y][x];if(ch!==' '&&ch!=='.')grid[y*w+x]={id:r.k[ch],count:1};}
      let res=null;try{res=calcCraft(grid,w,list);}catch(e){res=null;}ok=!!res&&res.id===r.o;}}
  m[key]=ok;return ok;}
/* where a recipe can be made by a bot: 'inv' (hands, 2x2), 'pcan' (Bin or Lab Bench), 'plab' (Lab Bench); null = not for bots */
function purgKindOf(r){if(!r||purgLocked(r))return null;for(const k of ['inv','pcan','plab'])if(purgRecOK(r,k))return k;return null;}
function purgAllRecipes(){const out=[],seen=new Set();for(const k of ['inv','pcan','plab'])for(const r of purgSet(k))if(!seen.has(r)){seen.add(r);out.push(r);}return out;}
function purgRecipeFor(id){for(const r of purgAllRecipes())if(r.o===id&&purgKindOf(r))return r;return null;}
function purgRecipeNeed(r){const m=new Map();const add=q=>{if(q==null)return;m.set(q,(m.get(q)||0)+1);};
  if(r.s)r.s.forEach(add);else for(const row of r.p)for(const ch of row)if(ch!==' '&&ch!=='.')add(r.k[ch]);
  const ord=id=>id===IT.PG_ROD?0:id===IT.PG_FELT?1:2;                           /* rods first: making them eats felt */
  return new Map([...m].sort((x,y)=>ord(x[0])-ord(y[0])));}
function purgRecName(r){const need=purgRecipeNeed(r),parts=[];for(const [k,c] of need)parts.push((c>1?c+' ':'')+purgNm(k));return parts.join(' + ');}
/* dry run on a copy of the inventory; auto-makes Felt from Felt Sleeves and Puppet Rods from Felt (AGP_INTER) */
function purgCraftSim(a,id,n,o){o=o||{};const inv=a.inv.map(s=>s?{...s}:null),steps=[];
  if(o.extra)for(const k in o.extra)inv.push({id:+k,count:o.extra[k]});
  const cnt=k=>invCount(inv,k);
  const make=(id,want,depth)=>{const r=purgRecipeFor(id);if(!r)return 'no recipe for '+purgNm(id)+purgFrom(id);
    const times=Math.ceil(want/r.n),need=purgRecipeNeed(r),errs=[];
    for(const [k,c] of need){const tot=c*times,h=cnt(k);if(h>=tot)continue;
      const e=(k===IT.PG_ROD||k===IT.PG_FELT)&&depth<3?make(k,tot-h,depth+1):'need '+(tot-h)+' more '+purgNm(k)+' (have '+h+')';
      if(e&&!errs.includes(e))errs.push(e);}
    if(errs.length)return errs.join(' and ');
    for(const [k,c] of need)if(cnt(k)<c*times)return 'need '+(c*times-cnt(k))+' more '+purgNm(k)+' (have '+cnt(k)+')';
    for(const [k,c] of need)invConsume(inv,k,c*times);
    const res=mkResult(r);res.count=r.n*times;if(invAddTo(inv,res)>0)return 'your inventory is full';
    steps.push({id,n:r.n*times});return '';};
  const err=make(id,n||1,0);inv.length=a.inv.length;return {err,inv,steps};}
/* felt shortfalls in plain numbers (how many more Felt Sleeves would do it) */
function purgShortfall(a,id,n,err){if(!/more (Felt Sleeve|Felt|Puppet Rod)\b/.test(err))return err;
  for(let k=1;k<=24;k++){const e2=purgCraftSim(a,id,n,{extra:{[B.PG_SLEEVE]:k}}).err;if(e2&&/more (Felt Sleeve|Felt|Puppet Rod)\b/.test(e2))continue;
    const w='need '+k+' more Felt Sleeve (have '+agHas(a,B.PG_SLEEVE)+'; 1 Felt Sleeve = 4 Felt = 8 Puppet Rods: gather felt)';return e2?e2+' and '+w:w;}
  return err;}
function purgCraftCheck(a,id,n){if(id==null)return 'no recipe';const s=purgCraftSim(a,id,n||1);return s.err?purgShortfall(a,id,n||1,s.err):'';}
function purgFrom(id){const S=agSourcesOf(id),w=[];
  if(S.blocks.length)w.push('gather '+purgGatherWord(S.blocks[0]));if(S.smelt.length)w.push('smelt '+purgNm(S.smelt[0])+' at a Hot Plate');
  if(S.mobs.length)w.push('it drops from '+S.mobs.map(m=>mobNameOf(m)).join('/'));
  return w.length?' (it is not crafted: '+w.join(', or ')+')':'';}
/* loose names inside purgatory (plan 5.5 A19): the realm alias table first; never Drumstick, Rhinestone Snips or Foam Padding Chest unless named in full */
function purgRecipeOut(name,a){purgBotInit();const l=purgNorm(name);if(!l)return null;
  const outs=[...new Set(purgAllRecipes().filter(r=>purgKindOf(r)).map(r=>r.o))];
  for(const id of outs)if(purgNorm(purgNm(id))===l)return id;
  if(AGP_ALIAS[l]!=null)return AGP_ALIAS[l];
  const cls={pick:'pick',pickaxe:'pick',pickaxes:'pick',picks:'pick',axe:'axe',axes:'axe',hatchet:'axe',cutter:'axe',cutters:'axe',
    shovel:'shovel',spade:'shovel',scoop:'shovel',sword:'sword',swords:'sword',weapon:'sword',blade:'sword'};
  const tw={wood:0,wooden:0,felt:0,stone:1,foam:1,iron:2,wire:2,hanger:2,gold:3,golden:3,diamond:3,sequin:3};
  const toks=l.split(' ');
  const last=toks[toks.length-1],c=cls[last];
  if(c){const want=toks.length>1&&tw[toks[0]]!=null?tw[toks[0]]:null;
    const cand=outs.filter(id=>{const t=DEFS[id]&&DEFS[id].tool;return t&&t.type===c&&(want==null||t.tier===want)&&id!==IT.PG_GAUNTLET&&id!==IT.PG_CHOPGLOVE;});
    if(cand.length){cand.sort((x,y)=>DEFS[y].tool.tier-DEFS[x].tool.tier);
      if(a&&want==null)for(const id of cand)if(!purgCraftSim(a,id,1).err)return id;
      return want==null?cand[cand.length-1]:cand[0];}}
  const guard=id=>(id===IT.PG_DRUMSTICK&&!/drumstick/.test(l))||(id===IT.PG_RSNIPS&&!/rhinestone/.test(l))||(id===IT.PG_FPAD_C&&!/padding/.test(l));
  const tk=t=>t.length>3&&/s$/.test(t)&&!/ss$/.test(t)?t.slice(0,-1):t;
  const cand=[];for(const id of outs){if(guard(id))continue;const words=purgNorm(purgNm(id)).split(' ');
    if(toks.map(tk).every(t=>words.some(w=>w.startsWith(t))))cand.push(id);}
  if(!cand.length)return null;
  const val=id=>{const d=DEFS[id];return d.tool?(d.tool.tier*10+d.tool.mult):d.armor?ARM_M[d.armor.m].pts:0;};
  cand.sort((x,y)=>val(y)-val(x)||purgNm(x).length-purgNm(y).length);
  if(a&&cand.length>1)for(const id of cand)if(!purgCraftSim(a,id,1).err)return id;
  return cand.slice().sort((x,y)=>val(x)-val(y)||purgNm(x).length-purgNm(y).length)[0];}
/* gather specs inside purgatory (P5-29) */
function purgGatherSpec(a,what){purgBotInit();const l=purgNorm(what);if(!l)return null;
  if(/\bplanks?\b/.test(l))return {kind:'craft',msg:'there are no planks in here - gather felt (Felt Sleeves off the trees) and craft Felt (1 Felt Sleeve = 4 Felt)'};
  if(/\b(sticks?|handles?)\b/.test(l)||/^(puppet )?rods?$/.test(l))return {kind:'craft',msg:'Puppet Rods are crafted, not gathered - 2 Felt = 4 Puppet Rods (Arm Holes and Cattails drop a few too)'};
  if(/\b(water|lava|wool|sand|gravel|clay|flowers?|obsidian)\b/.test(l))return {kind:'craft',msg:'there is no '+l+' in Puppet Purgatory - nothing from outside exists in here'};
  if(/\bshag fur\b|\bfur\b/.test(l))return {kind:'craft',msg:'Shag Fur comes off the Yeti (trip him by his sneakers) or the Drummer - attack yeti'};
  if(/\bdrumsticks?\b/.test(l))return {kind:'craft',msg:'Drumsticks come from the Drummer under the floor (attack drummer)'};
  if(AGP_GATHER[l])return {kind:'mine',ids:AGP_GATHER[l].slice()};
  let bk=null;for(const k in AGP_GATHER)if(l.includes(k)&&(!bk||k.length>bk.length))bk=k;
  if(bk)return {kind:'mine',ids:AGP_GATHER[bk].slice()};
  for(const k in DEFS){const d=DEFS[k];if(d.pg&&!d.item&&!d.hide&&d.hard>=0&&purgNorm(d.name)===l)return {kind:'mine',ids:[+k]};}
  for(const k in DEFS){const d=DEFS[k];if(!d.pg||!d.item||purgNorm(d.name)!==l)continue;const S=agSourcesOf(+k);
    if(S.blocks.length)return {kind:'mine',ids:S.blocks};
    if(S.smelt.length)return {kind:'craft',msg:d.name+' is smelted from '+purgNm(S.smelt[0])+' at a Hot Plate'};
    if(S.mobs.length)return {kind:'craft',msg:d.name+' drops from '+S.mobs.map(m=>mobNameOf(m)).join('/')+' - attack them'};}
  return null;}

/* ---- stations (bible 14.1: agStation, agSmelter) ---- */
function agSmelter(){return DIM==='puppet'?B.PG_HOTPLATE:B.FURNACE;}
function purgOpen(z){return z<MPC.ARCH_Z[1]||MP.open.a2&&(z<MPC.ARCH_Z[2]||MP.open.a3);}
function purgOwnBlock(a,slot,id){const m=a[slot];if(m&&chunkAt(m.x,m.z)&&getBlock(m.x,m.y,m.z)===id)return m;if(m&&!chunkAt(m.x,m.z))return m;return null;}
/* the nearest usable station of a kind (pcan: Bin or Lab Bench; plab: Lab Bench) within R: {x,y,z,id,d,known} or null */
function purgStationFind(a,kind,R){const ids=kind==='plab'?[B.PG_BENCH]:[B.PG_CAN,B.PG_BENCH];R=R||160;
  const ax=a.e?a.e.x:a.x,az=a.e?a.e.z:a.z,L=[];
  if(a.e)for(const id of ids){const f=agFindNear(a,id,12);if(f)L.push(Object.assign(f,{id}));}
  const own=kind==='plab'?purgOwnBlock(a,'myBench',B.PG_BENCH):(purgOwnBlock(a,'myTable',B.PG_CAN)||purgOwnBlock(a,'myBench',B.PG_BENCH));
  if(own)L.push({x:own.x,y:own.y,z:own.z,id:kind==='plab'?B.PG_BENCH:B.PG_CAN});
  const fixed=[];
  if(kind!=='plab'){fixed.push(MPC.HUB_CAN);
    const bc=(typeof mwSpots==='function'&&mwSpots('boothCan'))||[];for(let i=0;i<3;i++)if(MP.spawns['b'+(i+1)]&&bc[i])fixed.push(bc[i]);
    for(const n of ['bomber','bigpig','bigfrog']){const u=mpUmarkPos(n);if(u)fixed.push([u[0]+3,u[1],u[2]+1]);}}
  for(const p of ((typeof mwSpots==='function'&&mwSpots('labsBench'))||[]))fixed.push(p);
  for(const p of fixed){if(!p)continue;const x=Math.floor(p[0]),y=Math.floor(p[1]),z=Math.floor(p[2]);
    if(!purgOpen(z))continue;
    if(chunkAt(x,z)){const id=getBlock(x,y,z);if(ids.includes(id))L.push({x,y,z,id});else{const id2=getBlock(x,y-1,z);if(ids.includes(id2))L.push({x,y:y-1,z,id:id2});}}
    else L.push({x,y,z,id:ids[0],known:1});}
  let best=null;for(const s of L){s.d=Math.hypot(s.x+0.5-ax,s.z+0.5-az);if(s.d>R||purgForbidden(s.x+0.5,s.z+0.5))continue;if(!best||s.d<best.d)best=s;}
  return best;}
function agStation(a,kind){return purgStationFind(a,kind||'pcan',64);}
/* a fresh can is usable once the bin has moved in (5 s; P2's piCanReady when it exists) */
function purgCanReady(s){if(!s)return false;if(typeof piCanReady==='function'){try{return !!piCanReady(s.x,s.y,s.z);}catch(e){}}
  const k=bkey(s.x,s.y,s.z),t=purgS.canT&&purgS.canT[k];return !(t&&MP.clock<t);}
function purgPlaceStation(a,id){const p=agPlaceNear(a,id);if(!p)return null;
  try{mpOnPlace(p.x,p.y,p.z,id,a.name);}catch(e){}
  if(id===B.PG_CAN){(purgS.canT||(purgS.canT={}))[bkey(p.x,p.y,p.z)]=MP.clock+5;a.myTable={x:p.x,y:p.y,z:p.z};}
  else if(id===B.PG_BENCH)a.myBench={x:p.x,y:p.y,z:p.z};
  else if(id===B.PG_HOTPLATE)a.myFurnace={x:p.x,y:p.y,z:p.z};
  agEvent(a,'You put down a '+purgNm(id),2);return p;}

/* ---- the craft skill inside (P5-25): real ingredients, hands for 2x2, a Bin or Lab Bench for 3x3, ledger 'craft' ---- */
function purgSkCraft(a,dt,s){const st=s.st,e=a.e;
  if(!st.init){st.init=true;
    const id=purgRecipeOut(s.a.item,a);
    if(id==null)return 'fail:no recipe in here for '+(s.a.item||'that')+' (Puppet Purgatory has its own recipes - see the guide)';
    const r=purgRecipeFor(id);
    if(!r)return 'fail:no recipe for '+purgNm(id)+purgFrom(id);
    st.id=id;st.kind=purgKindOf(r);st.n=clamp(+s.a.count||1,1,64);
    const er=purgCraftCheck(a,id,st.n);if(er)return 'fail:'+er;
    if(st.kind!=='inv'){
      let sta=purgStationFind(a,st.kind,200);
      const placeId=st.kind==='plab'?B.PG_BENCH:B.PG_CAN;
      if((!sta||sta.d>40)&&agHas(a,placeId)>0){const p=purgPlaceStation(a,placeId);if(p)sta={x:p.x,y:p.y,z:p.z,id:placeId,d:1};}
      else if((!sta||sta.d>56)&&st.kind==='pcan'&&!purgCraftSim(a,B.PG_CAN,1).err){
        const p0=purgCraftSim(a,B.PG_CAN,1);agCraftCommit(a,p0);agEvent(a,'You crafted an Empty Can',2);
        const p=purgPlaceStation(a,B.PG_CAN);if(p)sta={x:p.x,y:p.y,z:p.z,id:B.PG_CAN,d:1};}
      if(!sta)return 'fail:'+purgNm(id)+' needs a '+(st.kind==='plab'?'Lab Bench':'Bin')+' and there is none you can reach'+(st.kind==='plab'?' (Labs HQ has one behind the purple curtain)':' (the hub Bin is by the Mark)');
      st.go=sta;}}
  if(st.kind!=='inv'){const g=st.go,ids=st.kind==='plab'?[B.PG_BENCH]:[B.PG_CAN,B.PG_BENCH];
    if(chunkAt(g.x,g.z)&&!ids.includes(getBlock(g.x,g.y,g.z))){const s2=purgStationFind(a,st.kind,200);if(!s2)return 'fail:the '+(st.kind==='plab'?'Lab Bench':'Bin')+' is gone';st.go=s2;return 'run';}
    const ap=agApproach(a,dt,st,g.x,g.y,g.z,{what:'the '+purgNm(g.id),r:1.5});
    if(ap!=='ok')return ap;
    a.look={x:g.x+0.5,y:g.y+0.6,z:g.z+0.5,t:AG_T+0.5};
    if(!purgCanReady(g)){a.ctl.mx=a.ctl.mz=0;return 'run';}}
  a.ctl.mx=a.ctl.mz=0;st.ct=(st.ct||0)+dt;
  if(st.ct<0.5){a.swing=Math.max(a.swing,0.35);return 'run';}
  const plan=purgCraftSim(a,st.id,st.n);
  if(plan.err)return 'fail:'+purgShortfall(a,st.id,st.n,plan.err);
  agCraftCommit(a,plan);
  const made=plan.steps.length?plan.steps[plan.steps.length-1].n:st.n,extra=plan.steps.slice(0,-1).map(q=>q.n+' '+purgNm(q.id));
  agEvent(a,'You crafted '+made+' '+purgNm(st.id)+(extra.length?' (made '+extra.join(', ')+' on the way)':''),2);
  a.swing=1;agAutoEquip(a);
  if(st.kind!=='inv'&&st.go&&getBlock(st.go.x,st.go.y,st.go.z)===B.PG_CAN&&e)purgCanBoot(a,st.go);
  return 'done';}
/* P2's real boot projectile out of a can lid (a 1 m knockback on contact) when P2 has landed; false = do it by hand */
function purgBoot(body,can){if(typeof piCanBoot!=='function'||!purgP2Real())return false;try{return !!piCanBoot(body,can);}catch(err){mpFail('piCanBoot',err);return false;}}
/* bible 7.1: a boot flies out of the lid at a bot crafting at the can (a real 1 m knockback): first time each visit, then 35% */
function purgCanBoot(a,g){const R=purgRec(a);const first=!R.gag.can;R.gag.can=(R.gag.can|0)+1;
  if(!first&&Math.random()>=0.35)return false;
  const e=a.e,dx=e.x-(g.x+0.5),dz=e.z-(g.z+0.5),l=Math.hypot(dx,dz)||1;
  if(!purgBoot(e,[g.x,g.y,g.z])){e.vx+=dx/l*4.2;e.vz+=dz/l*4.2;e.vy=Math.max(e.vy,4);}
  mwS('pg_boot',g.x+0.5,g.y+1,g.z+0.5);mwS('pg_lid',g.x+0.5,g.y+1,g.z+0.5);
  burstParticles(g.x+0.5,g.y+1.1,g.z+0.5,B.PG_STUFFING,6,0.6);
  agEvent(a,'A boot flew out of the Bin lid into your face while you were crafting',3);return true;}

/* ---- smelting inside (P5-26): the Hot Plate only (the furnace block entity), purgatory fuels, your own share ---- */
function purgFuelOrder(){return [IT.PG_GREASE,IT.PG_CARD,IT.PG_STUFF,IT.PG_FELT].filter(id=>FUELS[id]>0);}
function purgFuelSecs(a,exclude){let t=0;for(const id of purgFuelOrder())if(id!==exclude)t+=agHas(a,id)*FUELS[id];return t;}
function purgSmeltIn(a,name){const l=purgNorm(name).replace(/s$/,'');if(!l)return null;
  const al={hanger:IT.PG_HANGER,'coat hanger':IT.PG_HANGER,'raw coat hanger':IT.PG_HANGER,wire:IT.PG_HANGER,'armature wire':IT.PG_HANGER,iron:IT.PG_HANGER,
    'foam dust':IT.PG_FOAMDUST,dust:IT.PG_FOAMDUST,foam:IT.PG_FOAMDUST,'foam chunk':IT.PG_FOAMDUST,chicken:IT.PG_RCHICK,'rubber chicken':IT.PG_RCHICK,
    dough:IT.PG_DOUGHBALL,'dough ball':IT.PG_DOUGHBALL,bread:IT.PG_DOUGHBALL,flatbread:IT.PG_DOUGHBALL,ham:IT.PG_HAM,'ham hock':IT.PG_HAM,fish:IT.PG_FISH,
    'homing herring':IT.PG_FISH,herring:IT.PG_FISH};
  if(al[l]!=null)return al[l];
  for(const k in SMELT){const id=+k,d=DEFS[id];if(!d||!d.pg)continue;const n=purgNorm(d.name),o=purgNorm(purgNm(SMELT[k]));if(n===l||o===l||n.includes(l)||o.includes(l))return id;}
  if(/\b(meat|food|raw|dinner)\b/.test(l)){let best=null,bn=0;for(const k in SMELT){const id=+k;if(!DEFS[id]||!DEFS[id].pg||!DEFS[id].food&&!DEFS[id].raw)continue;const h=agHas(a,id);if(h>bn){bn=h;best=id;}}return best;}
  return null;}
function purgFurnaceOK(a,x,y,z,inId,outId){const k=bkey(x,y,z),be=blockEnts.get(k),sh=FSHARE.get(k);
  if(agFurnaceEmpty(be)){if(sh&&sh.who!==a.name)FSHARE.delete(k);return true;}
  if(sh&&sh.who!==a.name)return false;if(!agFurnaceMine(a,x,y,z))return false;
  return (!be.in||be.in.id===inId)&&(!be.out||be.out.id===outId)&&(!be.fuel||purgFuelOrder().includes(be.fuel.id));}
function purgFuelUp(a,be,st,sh,needSec){if(needSec<=0)return true;
  for(const id of purgFuelOrder()){if(id===st.in)continue;const h=agHas(a,id);if(!h)continue;if(be.fuel&&be.fuel.id!==id)continue;
    const room=stackMax(id)-(be.fuel?be.fuel.count:0),k=Math.min(h,Math.ceil(needSec/FUELS[id]),room);if(k<=0)continue;
    agTake(a,id,k);if(be.fuel)be.fuel.count+=k;else be.fuel={id,count:k};sh.fuel[id]=(sh.fuel[id]||0)+k;return true;}
  return false;}
function purgSkSmelt(a,dt,s){const st=s.st;
  if(!st.init){st.init=true;
    const inId=purgSmeltIn(a,s.a.item||s.a.target||s.a.note);
    if(inId==null||SMELT[inId]===undefined)return 'fail:nothing to smelt - that does not go on a Hot Plate ('+(s.a.item||'?')+')';
    if(agHas(a,inId)<1)return 'fail:nothing to smelt (you have no '+purgNm(inId)+')';
    st.in=inId;st.out=SMELT[inId];st.want=clamp(+s.a.count||agHas(a,inId),1,64);
    const ok=(x,y,z)=>purgFurnaceOK(a,x,y,z,inId,st.out),mine=(x,y,z)=>ok(x,y,z)&&agFurnaceMine(a,x,y,z);
    let f=agFindNear(a,B.PG_HOTPLATE,5,mine);
    if(!f&&agHas(a,B.PG_HOTPLATE)>0){f=purgPlaceStation(a,B.PG_HOTPLATE);}
    if(!f)f=agKnownBlock(a,B.PG_HOTPLATE,'myFurnace',mine);
    if(!f)f=agFindNear(a,B.PG_HOTPLATE,16,ok);
    const fb=f?blockEnts.get(bkey(f.x,f.y,f.z)):null;
    if(purgFuelSecs(a,inId)<SMELT_TIME&&!(f&&fb&&agFurnaceMine(a,f.x,f.y,f.z)&&((fb.burn||0)>0||fb.fuel)))
      return 'fail:no fuel - a Hot Plate burns Elbow Grease (best), Cardboard, Stuffing or Felt';
    if(!f){const sta=agFindNear(a,B.PG_CAN,5,(x,y,z)=>agCanTouch(a,x,y,z))||agFindNear(a,B.PG_BENCH,5,(x,y,z)=>agCanTouch(a,x,y,z));
      const p=sta?purgCraftSim(a,B.PG_HOTPLATE,1):null;
      if(!p||p.err)return 'fail:no Hot Plate of yours nearby - craft one at a Bin (7 Laminate Chip + Burner Coil + Elbow Grease)'+(p&&p.err?': '+p.err:'');
      agCraftCommit(a,p);agEvent(a,'You crafted a Hot Plate',2);
      f=purgPlaceStation(a,B.PG_HOTPLATE);if(!f)return 'fail:no room to put a Hot Plate down here';
      if(agHas(a,inId)<1)return 'fail:nothing left to smelt after making the Hot Plate';}
    st.f=f;st.fk=bkey(f.x,f.y,f.z);st.phase='load';}
  const f=st.f;
  if(getBlock(f.x,f.y,f.z)!==B.PG_HOTPLATE)return st.made?'done':'fail:the Hot Plate is gone';
  const ap=agApproach(a,dt,st,f.x,f.y,f.z,{what:'the Hot Plate',r:1.8});if(ap!=='ok')return ap;
  a.ctl.mx=a.ctl.mz=0;a.look={x:f.x+0.5,y:f.y+0.5,z:f.z+0.5,t:AG_T+0.5};
  const be=ensureBE(f.x,f.y,f.z,'furnace');let sh=FSHARE.get(st.fk);
  if(st.phase==='load'){
    if(!purgFurnaceOK(a,f.x,f.y,f.z,st.in,st.out))return 'fail:someone else is using that Hot Plate';
    if(!sh||sh.who!==a.name||sh.inId!==st.in||agFurnaceEmpty(be)){sh={who:a.name,inId:st.in,outId:st.out,loaded:0,made:0,fuel:{}};
      if(agFurnaceMine(a,f.x,f.y,f.z)){sh.loaded=(be.in?be.in.count:0)+(be.out?be.out.count:0);if(be.fuel)sh.fuel[be.fuel.id]=be.fuel.count;}
      FSHARE.set(st.fk,sh);}
    const room=stackMax(st.in)-(be.in?be.in.count:0);let n=Math.min(st.want,agHas(a,st.in),room);
    if(n<=0&&!be.in)return 'fail:nothing to smelt (you have no '+purgNm(st.in)+')';
    const inF=(be.burn||0)+(be.fuel&&FUELS[be.fuel.id]?FUELS[be.fuel.id]*be.fuel.count:0),fuel=purgFuelSecs(a,st.in)+inF;
    n=Math.max(0,Math.min(n,Math.floor(fuel/SMELT_TIME)-(be.in?be.in.count:0)));
    if(n<=0&&!be.in)return 'fail:no fuel - a Hot Plate burns Elbow Grease (best), Cardboard, Stuffing or Felt';
    if(n>0){agTake(a,st.in,n);if(be.in)be.in.count+=n;else be.in={id:st.in,count:n};sh.loaded+=n;}
    purgFuelUp(a,be,st,sh,(be.in?be.in.count:0)*SMELT_TIME-inF);
    st.phase='wait';a.swing=1;if(n>0)agEvent(a,'You put '+n+' '+purgNm(st.in)+' on the Hot Plate',2);agFurnaceRedraw(be);return 'run';}
  if(!sh||sh.who!==a.name)return agSmeltDone(a,st,be,null,'someone else took over the Hot Plate');
  if(agSmeltCollect(a,st,be,sh)>0)return agSmeltDone(a,st,be,sh,'your inventory is full');
  if(sh.made>=sh.loaded)return agSmeltDone(a,st,be,sh,null);
  if(!be.in||be.in.id!==st.in)return agSmeltDone(a,st,be,sh,null);
  if(be.burn<=0&&!be.fuel&&!purgFuelUp(a,be,st,sh,Math.min(be.in.count,sh.loaded-sh.made)*SMELT_TIME))return agSmeltDone(a,st,be,sh,'ran out of fuel');
  if(frameCount%40===0)a.swing=Math.max(a.swing,0.2);
  return 'run';}
/* reflex skill: stand still while the Bin throws your Lost Property at you, then walk over every stack of it that landed */
function purgSkCollect(a,dt,s){const e=a.e;if(!e)return 'done';
  if(s.t<(+s.a.wait||1.2)){a.ctl.mx=a.ctl.mz=0;return 'run';}
  let best=null,bd=9;for(const d of entities){if(d.t!=='drop'||d.dead||d.pown!==a.name)continue;const dd=Math.hypot(d.x-e.x,d.z-e.z);if(dd<bd&&Math.abs(d.y-e.y)<3.5){bd=dd;best=d;}}
  if(!best)return 'done';
  if(bd>0.3)agSteer(a,best.x,best.z,bd>1?1:0.4);else a.ctl.mx=a.ctl.mz=0;if(e.wall&&e.onGround)a.ctl.jump=true;
  a.look={x:best.x,y:best.y,z:best.z,t:AG_T+0.3};return s.t>14?'done':'run';}
/* reflex skill: BunkerBrad cuts the sparking cord next to Dan (Wire Snips cut it in 0.1 s) */
function purgSkSnip(a,dt,s){const c=s.a;if(!c||c.x==null)return 'done';
  if(getBlock(c.x,c.y,c.z)!==B.PG_CORD)return 'done';
  const ap=agApproach(a,dt,s.st,c.x,c.y,c.z,{what:'the cord',r:2});if(ap!=='ok')return ap==='run'?'run':'done';
  a.ctl.mx=a.ctl.mz=0;if(agBreaking(a,dt,c.x,c.y,c.z)){agEvent(a,'You cut the sparking cord next to Dan',3);return 'done';}
  return 'run';}

/* ---- combat, death, respawn (P5-14..18) ---- */
function purgDeathMsg(name,by,how){const h=String(how||'').toLowerCase(),b=by||'something';
  if(/^(blast|boom|bundle|seat|station|trapdoor|bigone|bomb|charge|porkbomb)/.test(h))return by===name?name+' blew themselves up':name+' was blown up by '+b;
  if(/^(swallow|gulp)/.test(h))return name+' was swallowed by '+b;
  if(/^(tongue|lash|slam|drag)/.test(h))return name+' was tongue-lashed to death by '+b;
  if(/^thrown/.test(h))return name+' was thrown at the floor by '+b;
  if(/^(pig|piglet|hog|link)/.test(h))return name+' was hit by a flying pig thrown by '+b;
  if(/^(chop|karate)/.test(h))return name+' was trotter-slammed by '+b;
  if(/^tesla/.test(h))return name+' was zapped by a Tesla Coil';
  if(/^(cleaver|ladle|grab|pot)/.test(h))return name+' was cooked by '+b;
  if(/^fish/.test(h))return name+' was slapped with a fish by '+b;
  if(/^(tomato|boo|heckle)/.test(h))return name+' was heckled to death';
  if(/^(burner|hotplate)/.test(h))return name+' sat on a Burner too long';
  if(/^(pins|pincushion)/.test(h))return name+' was pricked to death by a Pincushion';
  if(/^(soup|scum)/.test(h))return name+' drowned in Mystery Soup';
  if(/^(staple)/.test(h))return name+' was stapled to death by '+b;
  if(/^(flat|scenery)/.test(h))return name+' was flattened by scenery';
  if(/^(swept|broom|sweep|boot)/.test(h))return name+' was swept up';
  return by?name+' was slain by '+by:name+' died in Puppet Purgatory';}
/* Lost Property for bots (P5-16): nothing touches the floor; returns the dropped count (always 0: nothing dropped) */
function purgBotLost(a){const R=purgRec(a);R.deaths=(R.deaths|0)+1;a.pgrab=null;a.pgArr=null;a.pgDNPhit=0;
  if(GR.keepInv||MP.strike)return 0;
  for(let i=0;i<a.inv.length;i++){const st=a.inv[i];if(!st)continue;R.lost.push(st);agLed(a,'used',st.id,st.count);a.inv[i]=null;}
  if(R.lost.length)agEvent(a,'You died in Puppet Purgatory. Nothing fell on the floor: everything you carried went to Lost Property, and the Bin where you wake up throws it back at you',5);
  return 0;}
/* respawn inside (P5-17): the arena's Understudy Mark in a live fight, else the nearest spawn point (never Dan's trunk) */
function purgBotSpawn(a){const hs=typeof hnState==='function'?hnState():null,ld=a.lastDeath;
  const at=ld?[ld.x,ld.y,ld.z]:[a.x,a.y,a.z];let pick=null;
  if(hs&&hs.live&&hs.name&&MPC.UMARK[hs.name]){const u=mpUmarkPos(hs.name);
    if(mpInArena(hs.name,at[0],at[1],at[2])||Math.hypot(at[0]-u[0],at[2]-u[2])<48)pick={k:'umark',pos:[u[0]+0.5,u[1],u[2]+0.5],can:[u[0]+3,u[1],u[2]+1]};}
  if(!pick){let bd=1e9;for(const s of mpSpawnPoints()){if(s.k==='trunk'||!purgOpen(s.pos[2]))continue;const dd=Math.hypot(s.pos[0]-at[0],s.pos[2]-at[2]);if(dd<bd){bd=dd;pick=s;}}}   /* never behind a closed curtain */
  if(!pick)return null;
  /* wake 2.6 m past the can, on the side away from the spawn point itself, so the Lost Property lob never crosses whoever stands on the Mark */
  const o=AG_ORDER.indexOf(a.name),cx=pick.can[0]+0.5,cz=pick.can[2]+0.5;let dx=cx-pick.pos[0],dz=cz-pick.pos[2],l=Math.hypot(dx,dz);if(l<0.5){dx=1;dz=0;l=1;}
  const ang=(o-1)*0.45,ux=dx/l,uz=dz/l,x=cx+(ux*Math.cos(ang)-uz*Math.sin(ang))*2.6,z=cz+(ux*Math.sin(ang)+uz*Math.cos(ang))*2.6;
  const y=chunkAt(Math.floor(x),Math.floor(z))?mpSafeY(x,pick.pos[1],z):pick.pos[1];
  a.pgLost={can:pick.can.slice(),t:AG_T+0.8,k:pick.k};
  return [x,y,z];}
/* the thrown, reeled, held and swallowed body (P5-08, plan 6.1 a.pgrab) */
function purgGrabTick(a,e,dt){const g=a.pgrab;if(!g)return false;
  a.ctl.mx=a.ctl.mz=0;a.ctl.jump=false;a.path=null;a.pf=null;
  const end=()=>{const f=g.onEnd;a.pgrab=null;a.fallD=0;if(f)try{f(a,e);}catch(err){mpFail('pgrab end',err);}return false;};
  if(g.src&&g.src.dead&&g.k!=='thrown')return end();
  if(g.until!=null&&MP.clock>=g.until)return end();            /* a writer ends any grab early with until=0 (P4: a thrown bot hitting the Pig) */
  g.age=(g.age||0)+dt;
  if(g.k==='thrown'){
    if(!g._go){g._go=1;e.vx=g.vx||0;e.vy=g.vy||0;e.vz=g.vz||0;e.onGround=false;g.air=0;
      if(g.x!=null&&g.y!=null&&g.z!=null){const dd=Math.hypot(g.x-e.x,g.y-e.y,g.z-e.z);if(dd>0.5&&dd<30&&!boxCollides(g.x,g.y,g.z,e.hw||0.3,e.h||1.8)){e.x=g.x;e.y=g.y;e.z=g.z;}}}
    e.vy-=GRAV*dt;if(e.vy<-50)e.vy=-50;
    const sp=Math.hypot(e.vx,e.vy,e.vz);
    moveBody(e,e.vx*dt,e.vy*dt,e.vz*dt,false);g.air+=dt;
    if((e.onGround&&g.air>0.08)||g.air>6){
      const raw=Math.min(6,Math.max(1,Math.round(sp/5)));let dmg=raw;if(a.armor.some(s=>s&&s.id===IT.PG_STUNT))dmg*=0.5;
      e.vx*=0.2;e.vz*=0.2;e.hurtT=0;
      const by=g.by||null,pr=a.spawnProt;agHurt(a,dmg,by,0,0,'pg:thrown');
      a.pgLand={raw,dmg,t:AG_T,spawn:pr>AG_T};
      return end();}
    return true;}
  let tx=g.x,ty=g.y,tz=g.z;
  if((g.k==='held'||g.k==='lift')&&g.src&&(tx==null||ty==null||tz==null)){const s=g.src;
    if(s===P){const fw=[-Math.sin(P.yaw),-Math.cos(P.yaw)];tx=P.x+fw[0]*0.9;ty=P.y+0.5;tz=P.z+fw[1]*0.9;}
    else{tx=s.x;ty=s.y+(s.h||1.8)+0.15;tz=s.z;}}
  if(tx==null)return end();
  if(g.k==='reel'){const dx=tx-e.x,dy=ty-e.y,dz=tz-e.z,d=Math.hypot(dx,dy,dz);if(d<0.6)return end();
    const st=Math.min(d,(g.spd||12)*dt),px=e.x,pz=e.z;moveBody(e,dx/d*st,dy/d*st,dz/d*st,false);e.vx=e.vy=e.vz=0;
    if(Math.hypot(e.x-px,e.z-pz)<st*0.05&&Math.abs(dy)<0.2){g.stk=(g.stk||0)+dt;if(g.stk>0.6)return end();}
    if(g.age>8)return end();
    return true;}
  e.x=tx;e.y=ty;e.z=tz;e.vx=e.vy=e.vz=0;e.onGround=true;a.fallD=0;
  if(g.age>30)return end();
  return true;}
function purgStealable(st){if(!st)return false;const d=DEFS[st.id];if(!d)return false;
  if(d.tool||d.armor||d.puse||d.gadget||st.dur!=null||(d.stack===1)||d.food)return false;
  if(st.id===IT.PG_PROGRAMME||st.id===IT.PG_PLUNGER||st.id===IT.PG_FUSE||st.id===IT.PG_PEARLS||st.id===IT.PG_BOA||st.id===IT.PG_CHOPGLOVE||st.id===IT.PG_GAUNTLET)return false;
  return true;}

/* ---- the house rules for headliners (bible 10.0): the rope, the outer ring and DO NOT PUSH ---- */
function purgForbidden(x,z,who){if(DIM!=='puppet'||!P)return null;const hs=typeof hnState==='function'?hnState():null;
  for(const n of ['bomber','bigpig','bigfrog']){if(MP.dead[n])continue;if(hs&&hs.live&&hs.name===n)continue;if(mpInArena(n,P.x,P.y,P.z))continue;
    if(n==='bomber'){if(who&&who.pgDNP)continue;const d=Math.hypot(x-0.5,z+175.5);if(d<2.4){const u=d||1;return {n,lbl:'DO NOT PUSH',tx:0.5+(x-0.5)/u*3.6,tz:-175.5+(z+175.5)/u*3.6+(d<0.01?3.6:0)};}}
    else if(n==='bigpig'){const A=MPC.ARENA.bigpig;if(x>=A.x0-0.4&&x<=A.x1+1.4&&z>=A.z0-0.4&&z<=A.z1+1.4)return {n,lbl:'the Pig’s velvet rope',tx:x,tz:A.z0-1.6};}
    else{const K=MPC.ARENA.bigfrog,d=Math.hypot(x-K.cx,z-K.cz);if(d<K.r+0.8){const u=d||1;return {n,lbl:'the Frog’s outer ring',tx:K.cx+(x-K.cx)/u*(K.r+2.4),tz:K.cz+(z-K.cz)/u*(K.r+2.4)};}}}
  return null;}
function purgSkillTarget(a){const s=a.sk;if(!s||!s.st)return null;const t=s.st;
  if(t.cell)return [t.cell.x+0.5,t.cell.z+0.5];if(t.mob&&!t.mob.dead)return [t.mob.x,t.mob.z];if(t.tgt&&t.tgt.x!=null&&!t.tgt.dead)return [t.tgt.x,t.tgt.z];
  if(t.go&&t.go.x!=null)return [t.go.x+0.5,t.go.z+0.5];if(t.gx!=null)return [t.gx,t.gz];return null;}
function purgKeepOut(a){const e=a.e;const z=purgForbidden(e.x,e.z,a);
  if(z){if(!(a.rx&&a.rx.k==='goto'&&a.rx.pgOut)){a.rx={k:'goto',a:{target:Math.round(z.tx)+','+Math.round(z.tz),r:0.9},st:{},t:0,pgOut:1};
      const s=a.sk;if(s&&s.st){s.st.planned=false;if(s.st.mv)s.st.mv={};if(s.st.amv)s.st.amv={};}
      if(!a.pgKO||AG_T-a.pgKO>20){a.pgKO=AG_T;a.notes.push('You can’t go past '+z.lbl+' unless Dan is in there: only Dan can start that fight.');if(a.notes.length>8)a.notes.shift();}}
    return true;}
  const t=purgSkillTarget(a);
  if(t&&purgForbidden(t[0],t[1],a)){const zz=purgForbidden(t[0],t[1],a),lbl=a.sk.k+(a.sk.a.target?' '+a.sk.a.target:'');
    a.sk=null;a.q=[];a.path=null;a.pf=null;a.notes.push('Your action "'+lbl+'" stopped: it would take you past '+zz.lbl+', and only Dan can start that fight.');
    if(a.notes.length>8)a.notes.shift();if(!BRAIN.ok)a.offFail={k:'keepout',why:'only Dan can start that fight',t:AG_T};agNeedTurn(a,'your last action failed');return true;}
  return false;}
/* the reflexes (P5-18, bible 14.1): every frame, cheap, throttled to 5 per second */
function purgReflex(a,dt){const e=a.e;if(!e||a.pgrab)return !!a.pgrab;
  a.pgRxT=(a.pgRxT||0)-dt;if(a.pgRxT>0)return false;a.pgRxT=0.2;
  if(purgKeepOut(a))return true;
  /* hit by something you cannot fight back (the balcony's tomatoes, a Tesla Coil, the Bin): no counter-attack at nothing */
  if(a.lastHurtBy&&AG_T-a.lastHurtT<1.6&&a.lastHurtBy!=='Dan'&&!agByName(a.lastHurtBy)&&!purgFoeNear(a,a.lastHurtBy)){a.lastHurtBy=null;}
  const sh=AG_DEF[a.name].short;
  if(sh==='brad'&&P&&!P.dead&&!(a.rx&&a.rx.k==='pgsnip')){const c=purgSparkNearDan();                 /* the wire beats running away */
    if(c&&Math.hypot(c[0]+0.5-e.x,c[2]+0.5-e.z)<8){a.rx={k:'pgsnip',a:{x:c[0],y:c[1],z:c[2]},st:{},t:0};agThink(a,'[reflex] that cord is lit and it goes right past Dan');return true;}}
  if(a.rx&&(a.rx.k==='flee'||a.rx.k==='pgsnip'))return false;
  for(const o of entities){if(o.dead||o===e)continue;
    let boom=false,pig=false;
    if(o.t==='pproj'){const k=String(o.kind||'');boom=/bundle|bomb|dynamite|tnt/i.test(k);pig=!boom&&/pig|hog|link/i.test(k);}
    else if(o.t==='mob'&&MOBT[o.mt]&&MOBT[o.mt].pmob){boom=o.mt==='pgbundle'||/bomb/.test(o.mt);}
    if(!boom&&!pig)continue;
    const dx=e.x-o.x,dz=e.z-o.z,d=Math.hypot(dx,dz);
    if(boom&&d<5&&d>0.7&&Math.abs(o.y-e.y)<4){a.rx={k:'flee',a:{fromX:o.x,fromZ:o.z,dist:9},st:{},t:0};agThink(a,'[reflex] got away from a lit bomb');return true;}
    if(pig&&d<6){const v=Math.hypot(o.vx||0,o.vz||0);if(v<2)continue;const ux=(o.vx||0)/v,uz=(o.vz||0)/v,along=dx*ux+dz*uz,side=dx*uz-dz*ux;
      if(along>0&&Math.abs(side)<1.6){const sgn=side>=0?1:-1,tx=e.x+uz*sgn*3,tz=e.z-ux*sgn*3;
        a.rx={k:'goto',a:{target:Math.round(tx)+','+Math.round(tz),r:0.6},st:{},t:0};agThink(a,'[reflex] sidestepped a flying pig');return true;}}}
  if(sh==='bee'&&!(a.rx&&a.rx.k==='attack')){const hs=typeof hnState==='function'?hnState():null;
    if(hs&&hs.name==='bigpig'&&hs.e&&!hs.e.dead&&purgDanHeld(hs)&&Math.hypot(hs.e.x-e.x,hs.e.z-e.z)<24){
      a.rx={k:'attack',a:{target:'the pig',secs:8},st:{mob:hs.e,init:true},t:0};agThink(a,'[reflex] she has Dan over her head - put him DOWN');return true;}}
  return false;}
/* is there a live mob called `name` (display name or hunt word) within 30 m to fight back against? */
function purgFoeNear(a,name){const e=a.e,l=purgNorm(name).replace(/ /g,''),k=AG_HUNT[l]||null;
  for(const m of entities){if(m.t!=='mob'||m.dead||m.bot||Math.hypot(m.x-e.x,m.z-e.z)>30)continue;const T=MOBT[m.mt];if(T&&(T.npc||T.prop))continue;
    if((k&&k.split('|').includes(m.mt))||purgNorm(mobNameOf(m.mt)).replace(/ /g,'')===l)return true;}
  return false;}
/* the live spark cells of a lit Det Cord (P2's piSparkCells() when it exists, else spark entities); the cord cell nearest Dan within 4 m */
function purgSparkNearDan(){if(!P)return null;let lit=null;
  if(typeof hnSparkNear==='function'){try{lit=hnSparkNear(P.x,P.z,4);}catch(e){lit=null;}}                       /* P4: the Demolitionist's networks and fuse */
  if(!lit&&typeof piSparkCells==='function'){try{for(const c of piSparkCells()||[])if(Math.hypot(c[0]+0.5-P.x,c[2]+0.5-P.z)<4){lit=c;break;}}catch(e){}}   /* P2: a lit the Demolitionist's Fuse */
  if(!lit)return null;
  let best=null,bd=4.01;const px=Math.floor(P.x),py=Math.floor(P.y),pz=Math.floor(P.z);
  for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)for(let dy=-2;dy<=1;dy++){const x=px+dx,y=py+dy,z=pz+dz;if(getBlock(x,y,z)!==B.PG_CORD)continue;
    const d=Math.hypot(x+0.5-P.x,z+0.5-P.z);if(d<bd){bd=d;best=[x,y,z];}}
  return best;}
/* the Pig holding Dan over her head (the Diva Toss lift): P4's flags, whichever it sets */
function purgDanHeld(hs){const e=hs&&hs.e;if(!e)return false;
  if(typeof HN_P!=='undefined'&&HN_P&&HN_P.held==='Dan')return true;                                 /* P4's Diva Toss lift state */
  return !!(e.holdDan||e.holding===P||e.hold==='Dan'||(e.lift&&(e.lift===P||e.lift.who==='Dan'))||(e.hrS&&e.hrS.toss&&e.tossWho==='Dan')||(MPF.held&&MPF.held.who==='Dan'));}

/* ---- perception (P5-19..23), gated like the Programme (bible 12.4) ---- */
var purgBiomeN={woods:'the Felt Forest',kitchen:'the Kitchen',labs:'the Prop Lab',palace:'the Pork Palace',stair:'the Grand Staircase',swamp:'the Back Swamp',
  apron:'the apron',pit:'the orchestra pit',house:'the House (the audience seats)',wings:'the wings',under:'the Understage'};
function purgPageOpen(id){if(typeof PURG_PAGES==='undefined')return false;for(let i=0;i<PURG_PAGES.length;i++)if(PURG_PAGES[i].id===id)return !!(MP.page&(1<<i));return false;}
function purgHn(){try{return typeof hnState==='function'?hnState():null;}catch(e){return null;}}
function purgAct(){return !MP.dead.bomber?'bomber':!MP.dead.bigpig?'bigpig':!MP.dead.bigfrog?'bigfrog':'strike';}
function purgHeadlinerStr(a){const e=a.e||a,out=[],hs=purgHn();
  const dist=(x,z)=>Math.round(Math.hypot(x-e.x,z-e.z))+'m '+dir8(x-e.x,z-e.z);
  const live=n=>hs&&hs.live&&hs.name===n;
  out.push('The Demolitionist: '+(MP.dead.bomber?'DEAD (beaten)':live('bomber')?'FIGHTING NOW on the apron ('+dist(0.5,-176)+')':'waiting on the apron by DO NOT PUSH ('+dist(0.5,-176)+')'));
  if(MP.dead.bigpig)out.push('The Pig: DEAD (beaten)');
  else if(live('bigpig'))out.push('The Pig: FIGHTING NOW on the Grand Staircase ('+dist(0.5,90)+')');
  else if(MP.dead.bomber||purgPageOpen('11'))out.push('The Pig: at the top of the Grand Staircase behind her velvet rope ('+dist(0.5,68)+')'+(MP.open.a2?'':' - the purple curtain opens when Dan walks up to it'));
  else out.push('The Pig: somewhere behind the purple curtain upstage (it opens after the Demolitionist)');
  if(MP.dead.bigfrog)out.push('The Frog: DEAD (beaten)');
  else if(live('bigfrog'))out.push('The Frog: FIGHTING NOW in the swamp clearing ('+dist(0.5,215)+')'+(hs.phase===3?' - phase 3':''));
  else if(MP.dead.bigpig||purgPageOpen('12'))out.push('The Frog: on his log in the Back Swamp clearing ('+dist(0.5,215)+')'+(MP.open.a3?'':' - the green curtain opens when Dan walks up to it'));
  else out.push('The Frog: further upstage behind the green curtain (after the Pig)');
  return out.join(' | ');}
function purgObs(a){purgBotInit();const L=[],e=a.e||a,hs=purgHn();
  L.push('[PUPPET PURGATORY] You are inside Puppet Purgatory with Dan. Nothing from outside exists in here. Your own things are locked in your Stage Trunk at the Stage Door in the overworld: you get them back when Dan leads everyone out.');
  L.push('Headliners (Dan must beat all three to open the way out): '+purgHeadlinerStr(a));
  if(hs&&hs.live)L.push('A headliner fight is ON'+(hs.phase?' (phase '+hs.phase+')':'')+'. You can help: you only do half damage to headliners and only Dan can finish them.');
  else if(!MP.dead.bigfrog)L.push('Only Dan can start a headliner fight. Never step over the Pig’s rope, onto the Frog’s outer ring, or touch DO NOT PUSH unless Dan is already in there.');
  let cue=null;try{cue=typeof mwCue==='function'?mwCue():null;}catch(err){}
  if(cue){const t=Math.max(0,Math.round(cue.left||0)),ms=Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
    if(cue.ph==='blackout')L.push('LIGHTS: BLACKOUT for '+ms+' - a followspot finds whoever is out in the open and everything comes for them. Get under something, stand by a lamp, or go below the deck.');
    else if(cue.ph==='warn')L.push('LIGHTS: three clicks - a BLACKOUT is about to start.');
    else if(cue.ph==='work')L.push('LIGHTS: the work lights are on.');
    else if(cue.ph==='show')L.push('LIGHTS: SHOW (next blackout in about '+ms+').');}
  if(MP.strike&&MP.dead.bigfrog)L.push('THE SHOW IS OVER: run downhill (north) after Dan, through the House to the EXIT. Do not stop.');
  if(P&&!P.dead&&e.x!=null)L.push('Dan: '+Math.round(Math.hypot(P.x-e.x,P.z-e.z))+'m '+dir8(P.x-e.x,P.z-e.z)+', '+Math.round(P.hp)+'/20 hp, '+(MP.stats.deaths|0)+' deaths in here so far.');
  if(e.x!=null){const s=purgStationFind(a.e?a:{x:e.x,z:e.z,e:null},'pcan',400);if(s)L.push('Nearest Bin: '+s.x+','+s.z+' ('+Math.round(s.d)+'m).');}
  const sp=a.pgLost?null:purgNearestSpawn(e);if(sp)L.push('If you die you wake up at '+sp+' and its Bin throws your things back at you (Lost Property).');
  if(a.name&&AG_DEF[a.name]&&AG_DEF[a.name].short==='bee')L.push('No flowers grow in here (only felt): your flower collection waits outside.');
  return L.join('\n');}
function purgNearestSpawn(e){if(e.x==null)return null;let best=null,bd=1e9;
  for(const s of mpSpawnPoints()){if(s.k==='trunk')continue;const d=Math.hypot(s.pos[0]-e.x,s.pos[2]-e.z);if(d<bd){bd=d;best=s;}}
  if(!best)return null;return (best.k==='mark'?'the Mark':'Quick-Change Booth '+best.k.slice(1))+' ('+Math.round(best.pos[0])+','+Math.round(best.pos[2])+')';}
function purgItches(a){purgBotInit();const out=[],e=a.e,D=AG_DEF[a.name],hs=purgHn();
  if(hs&&hs.live&&hs.e&&P&&Math.hypot(hs.e.x-e.x,hs.e.z-e.z)<40)out.push((MOB_NAME[hs.e.mt]||'A headliner')+'’s fight is ON '+Math.round(Math.hypot(hs.e.x-e.x,hs.e.z-e.z))+'m away: help Dan (attack '+purgHuntWord(hs.e.mt)+') or keep clear.');
  let mobs=0;for(const m of entities)if(m.t==='mob'&&!m.dead&&!m.bot&&m.hostile&&!(MOBT[m.mt]&&(MOBT[m.mt].prop||MOBT[m.mt].npc))&&Math.hypot(m.x-e.x,m.z-e.z)<20)mobs++;
  if(mobs)out.push(mobs+' hostile puppet'+(mobs>1?'s':'')+' within 20m.');
  const st=purgNextStep(a);
  if(st.row){const r=st.row,id=r.craft[0],er=purgCraftCheck(a,id,1),rec=purgRecipeFor(id),k=rec?purgKindOf(rec):null;
    out.push(!er?'You can craft a '+purgNm(id)+' right now'+(k==='inv'?' (in your hands)':k==='plab'?' (at a Lab Bench)':' (at a Bin)')+' - do it.':
      'Next for you: a '+purgNm(id)+(rec?' ('+purgRecName(rec)+(k==='plab'?' at a Lab Bench':k==='pcan'?' at a Bin':'')+')':'')+' - you '+er+'.');}
  else if(st.cap)out.push('You have the best gear you can make until Dan beats '+(st.cap==='bomber'?'the Demolitionist':st.cap==='bigpig'?'the Pig':'the Frog')+'. Stay near Dan and help when the fight starts.');
  const hg=a.hunger==null?20:a.hunger,hasFood=a.inv.some(s=>s&&DEFS[s.id].food);
  if(hg<16)out.push('Hunger '+hg+'/20: you only heal at 16 or more'+(hasFood?' - eat something (cooked food fills far more than raw).':' and you have no food - hunt chickens (hens) or gather stuffing, and cook raw food on a Hot Plate.'));
  if(P&&!P.dead&&Math.hypot(P.x-e.x,P.z-e.z)>70)out.push('Dan is '+Math.round(Math.hypot(P.x-e.x,P.z-e.z))+'m away - he is the one who can get everyone out.');
  const freeS=agFreeSlots(a);if(freeS<=4)out.push('Your inventory is nearly full ('+(a.inv.length-freeS)+'/'+a.inv.length+') - you have no chest in here; drop or use things.');
  if(D.short==='brad'&&!purgRec(a).gag.holes){const c=agScanFor(a,[B.PG_ARMHOLE],12,true,-3,true);if(c)out.push('There is an Arm Hole '+Math.round(Math.hypot(c.x-e.x,c.z-e.z))+'m away. Things come up out of those.');}
  return out.slice(0,9);}
function purgCanCraftStr(a){purgBotInit();const out=[],seen=new Set();
  const sta=purgStationFind(a,'pcan',48),lab=purgStationFind(a,'plab',48);
  const tag=k=>k==='inv'?'':k==='plab'?(lab?' (at the Lab Bench '+Math.round(lab.d)+'m away)':' (needs a Lab Bench)'):(sta?' (at the Bin '+Math.round(sta.d)+'m away)':' (needs a Bin)');
  const sl=agHas(a,B.PG_SLEEVE);if(sl)out.push('Felt x'+sl*4+' (from your '+sl+' Felt Sleeve'+(sl>1?'s':'')+')');
  if(agHas(a,IT.PG_ROD)<2&&(agHas(a,IT.PG_FELT)>=2||sl))out.push('Puppet Rods');
  for(const r of purgAllRecipes()){if(seen.has(r.o)||r.o===IT.PG_FELT||r.o===IT.PG_ROD)continue;const k=purgKindOf(r);if(!k)continue;
    const d=DEFS[r.o];if(d.tool){const cur=agToolLevel(a,d.tool.type);if(d.tool.tier<=cur)continue;}
    if(d.armor){const cur=a.armor[d.armor.s];if(cur&&ARM_M[DEFS[cur.id].armor.m].pts>=ARM_M[d.armor.m].pts)continue;}
    if(purgCraftSim(a,r.o,1).err)continue;seen.add(r.o);out.push(purgNm(r.o)+tag(k));if(out.length>=12)break;}
  const hp=agFindNear(a,B.PG_HOTPLATE,6)||purgOwnBlock(a,'myFurnace',B.PG_HOTPLATE);
  for(const k in SMELT){const id=+k;if(!DEFS[id]||!DEFS[id].pg)continue;const h=agHas(a,id);if(!h||purgFuelSecs(a,id)<SMELT_TIME)continue;
    out.push(purgNm(SMELT[k])+' x'+h+' (smelt your '+purgNm(id)+' on a Hot Plate)'+(hp||agHas(a,B.PG_HOTPLATE)?'':' (needs a Hot Plate)'));}
  return out.length?out.slice(0,12).join(', '):'nothing yet - punch the Felt Sleeves on the trees (gather felt): 1 Felt Sleeve = 4 Felt';}
function purgNearStr(a){purgBotInit();const e=a.e,cnt={},parts=[];
  for(const m of entities){if(m.t!=='mob'||m.dead||m.bot)continue;const T=MOBT[m.mt];if(T&&T.prop)continue;const d=Math.hypot(m.x-e.x,m.z-e.z);if(d>24)continue;
    const n=mobNameOf(m.mt)+(T&&T.npc?' (harmless)':m.hostile?' (hostile)':'');cnt[n]=cnt[n]||{n:0,d:99,dx:0,dz:0};cnt[n].n++;if(d<cnt[n].d){cnt[n].d=d;cnt[n].dx=m.x-e.x;cnt[n].dz=m.z-e.z;}}
  for(const k in cnt)parts.push(cnt[k].n+'x '+k+' nearest '+Math.round(cnt[k].d)+'m '+dir8(cnt[k].dx,cnt[k].dz));
  let drops=0;for(const d of entities)if(d.t==='drop'&&!d.dead&&Math.hypot(d.x-e.x,d.z-e.z)<10)drops++;
  if(drops)parts.push(drops+' dropped item(s) nearby');
  const feat=[],seen=(ids,R,lbl,dy)=>{const c=agScanFor(a,ids,R,true,dy==null?-4:dy,true);if(c)feat.push(lbl+' '+Math.round(Math.hypot(c.x-e.x,c.z-e.z))+'m '+dir8(c.x-e.x,c.z-e.z));return c;};
  if(!seen([B.PG_SLEEVE],12,'felt trees'))feat.push('no felt trees within 12m');
  seen([B.PG_GOOGLY,B.PG_WIREORE,B.PG_SEQORE],8,'ore visible');
  seen([B.PG_COUNTER],8,'Countertops (laminate)');seen([B.PG_BURNER],8,'a Burner (hot)');seen([B.PG_TESLA],8,'a Tesla Coil (zaps)');
  seen([B.PG_PINS],8,'a Pincushion (sharp)');seen([B.PG_MIRROR],8,'a Dressing Mirror');seen([B.PG_CAN],10,'a Bin');seen([B.PG_HOTPLATE],8,'a Hot Plate');
  seen([B.PG_BENCH],10,'a Lab Bench');seen([B.PG_SOUP,B.PG_SCUM],8,'soup/scum');seen([B.PG_SHEET],6,'the taut felt sheet (walk, do not stop)',-2);
  let bio='';try{bio=typeof mwBiomeAt==='function'?mwBiomeAt(e.x,e.z):'';}catch(err){}
  return 'Area: '+(purgBiomeN[bio]||'the stage')+'. '+(feat.length?'Terrain: '+feat.join(', ')+'. ':'')+(parts.length?'Around you: '+parts.join('; ')+'.':'No puppets near.');}
function purgPlacesStr(a){const e=a.e||a,out=[],dist=(x,z)=>Math.round(Math.hypot(x-e.x,z-e.z))+'m '+dir8(x-e.x,z-e.z);
  const M=MPC.MARK;out.push('The Mark (spawn point, hub Bin) at '+M[0]+','+M[2]+': '+dist(M[0],M[2]));
  for(let i=0;i<3;i++)if(MP.spawns['b'+(i+1)]){const b=MPC.BOOTH[i];out.push('Quick-Change Booth '+(i+1)+' (spawn point, Bin) at '+b[0]+','+b[1]+': '+dist(b[0],b[1]));}
  out.push('The apron (the Demolitionist'+(MP.dead.bomber?', beaten':'')+') at 0,-175: '+dist(0.5,-175));
  if(MP.dead.bomber||purgPageOpen('8'))out.push('The Cook’s Kitchen near '+MPC.KITCHEN_NEAR[0]+','+MPC.KITCHEN_NEAR[1]+': '+dist(MPC.KITCHEN_NEAR[0],MPC.KITCHEN_NEAR[1]));
  if(MP.dead.bomber){out.push('Prop Lab HQ (Lab Bench) at '+MPC.LABS_HQ[0]+','+MPC.LABS_HQ[1]+': '+dist(MPC.LABS_HQ[0],MPC.LABS_HQ[1]));
    out.push('The Grand Staircase (the Pig'+(MP.dead.bigpig?', beaten':'')+') from 0,66: '+dist(0.5,66));}
  if(MP.dead.bigpig)out.push('The Frog’s clearing in the Back Swamp at 0,215: '+dist(0.5,215));
  if(MP.dead.bigfrog)out.push('The EXIT at the back of the House, 0,-299: '+dist(0.5,-298));
  for(const [slot,id,lbl] of [['myTable',B.PG_CAN,'Your Bin'],['myFurnace',B.PG_HOTPLATE,'Your Hot Plate'],['myBench',B.PG_BENCH,'Your Lab Bench']]){const m=a[slot];if(m&&m.x!=null)out.push(lbl+' at '+m.x+','+m.z+': '+dist(m.x+0.5,m.z+0.5));}
  return out.join('\n');}

/* ---- the autopilot (P5-24): eat, the live fight, Dan, the ladder, then each persona's own thing ---- */
function purgOffPlan(a){purgBotInit();const D=AG_DEF[a.name],sh=D.short,e=a.e,r=Math.random(),hs=purgHn();
  const f=a.offFail&&AG_T-a.offFail.t<60?a.offFail:null;a.offFail=null;
  if(f){a.offFails=(a.offFails||0)+1;
    if(f.k==='hunt'&&/no .* around/.test(f.why)&&(a.hunger==null?20:a.hunger)<=14){a.noFoodT=AG_T;                  /* nothing to hunt: the heap's Stuffing is food */
      if(!a.inv.some(s=>s&&DEFS[s.id].food)&&DEFS[IT.PG_STUFF]&&DEFS[IT.PG_STUFF].food&&!(AG_T-(a.noStuffT||-99)<60)){a.noStuffT=AG_T;a.pgLastG='stuffing';return [['gather',{item:'stuffing',count:4}]];}}
    const q=purgFixShort(a,f.why);if(q&&!(a.pgLastQ&&a.pgLastQ===JSON.stringify(q)&&a.offFails>3)){a.pgLastQ=JSON.stringify(q);return q;}
    /* the same ladder step failing again and again: leave it for four minutes and get on with the next one */
    const st=purgNextStep(a);if(st.row&&/^(craft|gather|smelt)$/.test(f.k)){const k=st.row.id;     /* a failed food hunt or walk is not the step's fault */a.pgRowF=a.pgRowF||{};a.pgRowF[k]=(a.pgRowF[k]||0)+1;
      if(a.pgRowF[k]>=3){a.pgRowF[k]=0;a.offFails=0;(a.pgSkip||(a.pgSkip={}))[k]=MP.clock+90;
        if(!purgNextStep(a).row){delete a.pgSkip[k];return purgWanderPlan(a);}}}          /* never skip the only thing left to do: go somewhere else and retry */
    const nm=f.k==='gather'&&/^no .* nearby$/.test(f.why)&&a.pgLastG?purgGatherSpec(a,a.pgLastG):null;
    if(nm&&nm.ids&&nm.ids.length){const w=purgWhereFor(a,nm.ids[0]);if(w&&Math.hypot(w[0]-a.x,w[1]-a.z)>12)return [['goto',{target:Math.round(w[0])+','+Math.round(w[1]),r:6}]];}
    if(/nearby|around|could not|no path|stuck|took too long|no way|chasing|reach/.test(f.why)||a.offFails>2){a.offFails=0;return purgWanderPlan(a);}}
  else a.offFails=0;
  const hg=a.hunger==null?20:a.hunger,food=a.inv.some(s=>s&&DEFS[s.id].food);
  if(MP.strike&&MP.dead.bigfrog&&P&&!P.dead)return [['follow',{target:'Dan',r:3,secs:20}]];
  if(hs&&hs.live&&hs.e&&!hs.e.dead&&P&&Math.hypot(hs.e.x-P.x,hs.e.z-P.z)<40&&Math.hypot(hs.e.x-e.x,hs.e.z-e.z)<60){
    const brave=D.courage>0.5||(a.hp>14&&r<D.courage+0.35);
    if(brave&&!(a.hp<=D.fleeHp))return [['attack',{target:purgHuntWord(hs.e.mt),secs:20}]];
    return [['follow',{target:'Dan',r:9,secs:15}]];}
  if(food&&(hg<=14||(a.hp<14&&hg<20))){const raw=purgRawToCook(a);if(raw!=null&&(purgOwnBlock(a,'myFurnace',B.PG_HOTPLATE)||agHas(a,B.PG_HOTPLATE)))return [['smelt',{item:purgNm(raw),count:Math.min(4,agHas(a,raw))}]];return [['eat']];}
  if(f&&/no .* around/.test(f.why))a.noFoodT=AG_T;
  if(!food&&hg<=13){if(!(AG_T-(a.noFoodT||-99)<60))return [['hunt',{target:'food',count:2}]];
    if(DEFS[IT.PG_STUFF]&&DEFS[IT.PG_STUFF].food&&!(AG_T-(a.noStuffT||-99)<60)){a.noStuffT=AG_T;a.pgLastG='stuffing';return [['gather',{item:'stuffing',count:4}]];}}
  if(P&&!P.dead&&Math.hypot(P.x-e.x,P.z-e.z)>130)return [['follow',{target:'Dan',r:8,secs:25}]];   /* a resource trip may take you a plane away, no further */
  if(sh==='brad'&&!purgRec(a).gag.holes){purgRec(a).gag.holes=1;const c=agScanFor(a,[B.PG_ARMHOLE],12,true,-3,true);
    if(c&&agToolLevel(a,'pick')>=0)return [['gather',{item:'arm hole',count:2}]];}
  const st=purgNextStep(a);
  const q=st.row?purgOffCraft(a,st.row.craft[0]):purgIdlePlan(a,st.cap);
  if(q&&q[0]&&q[0][0]==='gather')a.pgLastG=q[0][1].item;
  return q;}
/* where a resource is plentiful (bible 3 and 6), for a bot that found none nearby: [x,z] or null */
function purgWhereFor(a,b){const e=a.e||a,near=L=>{let best=null,bd=1e9;for(const p of L){if(!p)continue;const x=p[0],z=p.length>2?p[2]:p[1];if(!purgOpen(z))continue;
    const d=Math.hypot(x-e.x,z-e.z);if(d<bd){bd=d;best=[x,z];}}return best;};
  let sp=[];const S=k=>{try{return (typeof mwSpots==='function'&&mwSpots(k))||[];}catch(err){return [];}};
  if(b===B.PG_COUNTER||b===B.PG_BURNER||b===B.PG_DOUGH)return near([MPC.KITCHEN_NEAR,[-30,-20],[10,20]]);
  if(b===B.PG_WIREORE){sp=S('drainMouth');return near(sp.length?sp:MPC.DRAINS);}
  if(b===B.PG_SLEEVE||b===B.PG_FOREARM||b===B.PG_EYE||b===B.PG_FLEECE){const z=clamp(e.z,-150,-70);return [clamp(e.x+(e.x<0?18:-18),-80,80),z<-110?-100:-125];}
  if(b===B.PG_TESLA)return near([MPC.LABS_HQ,[-60,70],[-25,120]]);
  if(b===B.PG_MIRROR||b===B.PG_SATIN)return near([[40,95],[60,70],[30,125]]);
  if(b===B.PG_PINS)return near([[30,190],[-30,200],[40,235]]);
  if(b===B.PG_STUFFING)return near([[MPC.BOT_HEAP.x0,MPC.BOT_HEAP.z0]]);
  return null;}
function purgRawToCook(a){for(const k in SMELT){const id=+k,d=DEFS[id];if(!d||!d.pg||!d.food||!d.raw)continue;if(agHas(a,id)>0&&purgFuelSecs(a,id)>=SMELT_TIME)return id;}return null;}
function purgOffCraft(a,id){const er=purgCraftCheck(a,id,1);if(!er)return [['craft',{item:purgNm(id),count:1}]];
  return purgFixShort(a,er)||[['gather',{item:'felt',count:3}]];}
/* turn a shortfall ("need 3 more Laminate Chip (have 0)") into the action that gets exactly that */
function purgFixShort(a,why){const m=String(why||'').match(/need (\d+) more ([A-Za-zø' -]+?)\s*\(/);if(!m)return null;
  const n=+m[1],name=m[2].trim();let id=null;for(const k in DEFS)if(DEFS[k].pg&&DEFS[k].name===name){id=+k;break;}
  if(id==null)return null;
  if(id===B.PG_SLEEVE)return [['gather',{item:'felt',count:Math.min(16,n+1)}]];
  const S=agSourcesOf(id),can=x=>!DEFS[x].req||agCanHarvest(a,x);
  const b=S.blocks.find(can);if(b!=null)return [['gather',{item:purgGatherWord(b),count:Math.min(32,n+1)}]];   /* mine it directly first */
  if(S.smelt.length){const inId=S.smelt[0];
    if(agHas(a,inId)>=1)return [['smelt',{item:purgNm(inId),count:Math.min(agHas(a,inId),n+1)}]];
    const S2=agSourcesOf(inId),b2=S2.blocks.find(can);if(b2!=null)return [['gather',{item:purgGatherWord(b2),count:Math.min(32,n+2)}]];}
  if(S.mobs.length)return [['hunt',{target:purgHuntWord(S.mobs[0]),count:Math.min(4,n)}]];
  return null;}
function purgWanderPlan(a){const e=a.e;if(a.offDir==null||(a.offDirN=(a.offDirN||0)+1)>3){a.offDir=Math.random()*6.283;a.offDirN=0;}
  const W=MPC.WALK,dist=24+Math.random()*24,zmax=MP.open.a3?W.z1-8:MP.open.a2?MPC.ARCH_Z[2]-6:MPC.ARCH_Z[1]-6;      /* the wings and the walls are no place to explore */
  const tx=clamp(Math.round(e.x+Math.sin(a.offDir)*dist),-60,60),tz=clamp(Math.round(e.z+Math.cos(a.offDir)*dist),MPC.PROSC_Z+4,zmax);
  return [['explore',{target:tx+','+tz}]];}
function purgIdlePlan(a,cap){const sh=AG_DEF[a.name].short,r=Math.random(),e=a.e;
  if(sh==='bee'){const raw=purgRawToCook(a);if(raw!=null&&(purgOwnBlock(a,'myFurnace',B.PG_HOTPLATE)||agHas(a,B.PG_HOTPLATE)))return [['smelt',{item:purgNm(raw),count:Math.min(4,agHas(a,raw))}]];
    let best=null;for(const s of a.inv)if(s&&DEFS[s.id].food&&!DEFS[s.id].raw&&(!best||DEFS[s.id].food>DEFS[best.id].food))best=s;
    if(best&&P&&!P.dead&&P.hunger<16&&Math.hypot(P.x-e.x,P.z-e.z)<40)return [['give',{target:'Dan',item:purgNm(best.id),count:1}]];
    if(r<0.45)return [['hunt',{target:'chicken',count:1}]];}
  if(sh==='brad'){if(r<0.3&&agHas(a,IT.PG_GREASE)<8)return [['gather',{item:'forearm',count:2}]];
    if(r<0.5&&agHas(a,IT.PG_STUFF)<16)return [['gather',{item:'stuffing',count:4}]];
    if(r<0.65&&agHas(a,B.PG_LAMP)<8&&!purgCraftCheck(a,B.PG_LAMP,1))return [['craft',{item:'Eyeball Lamp',count:4}]];
    if(P&&!P.dead)return [['guard',{target:Math.round(P.x)+','+Math.round(P.z),secs:30}]];}
  if(sh==='creep'){if(r<0.4&&P&&!P.dead)return [['follow',{target:'Dan',r:5,secs:25}]];if(r<0.7)return purgWanderPlan(a);}
  if(P&&!P.dead&&Math.hypot(P.x-e.x,P.z-e.z)<60&&r<0.75)return [['follow',{target:'Dan',r:6,secs:25}]];
  return [['wander',{r:10}]];}

/* ---- the guide (P5-33/34; bible 12.4): Programme pages Dan has unlocked + exact names + the current act's counters only ---- */
function purgRules(){return [
  'You are inside PUPPET PURGATORY, a separate dimension of DINGLECRAFT. Dan was bitten at a Stage Door and all three of you were dragged in after him. Nothing from outside exists in here and nothing from in here leaves: everything you owned is locked in your own Stage Trunk at the door, and you get it back only when Dan leads everyone out through the EXIT.',
  'THE WAY OUT: three headliners in order - the Demolitionist (the apron, downhill from the Mark), then the Pig (the Grand Staircase, behind the purple curtain), then the Frog (the Back Swamp, behind the green curtain). Only Dan can start a headliner fight; once it is on you can help. You deal half damage to headliners and can never land the finishing blow. Never step over the Pig’s velvet rope, onto the Frog’s outer ring, or touch DO NOT PUSH unless Dan is already in that fight.',
  'SAME RULES AS DAN: nothing is free; hunger, healing, tool wear and reach work as outside. If you die nothing falls on the floor: it goes to Lost Property and the Bin where you wake up throws it back at you. You wake at the nearest spawn point (the Mark, an unlocked Quick-Change Booth) or the Understudy Mark during a fight. Time of day does not matter in here: the lights are cues (SHOW, then a BLACKOUT when the spotlight hunts whoever is out in the open).',
  'THE MAP: the stage is raked - uphill (south, +z) is later in the show, downhill (north, -z) is the apron, the orchestra pit and the House (the audience). The walls are black curtains you cannot break or climb. Nothing can be placed above y 62 (the rigging).',
  'OVERWORLD WORDS INSIDE (use these exact names in actions): wood/logs = Felt Sleeve (the trees are felt - gather felt). planks = Felt (1 Felt Sleeve = 4 Felt). sticks = Puppet Rod (2 Felt = 4 Puppet Rods). stone/cobblestone = Foam Rubber under the Stage Deck (gather foam with a pick; it drops Foam Chunk). crafting table = The Bin. furnace = Hot Plate. torch = Eyeball Lamp. chest = Prop Trunk. Tool classes: pick (pickaxe), shears (axe), scoop (shovel), sword. Tiers: Felt < Foam < Wire < Sequin.',
  'RESOURCES: Googly Ore (Googly Eyes, any pick). Wire Ore (Raw Coat Hanger, Foam-tier pick or better; thick in the Kitchen sink drains) - smelt hangers into Armature Wire. Countertop (Laminate Chip) and Burner (Burner Coil, Foam-tier pick; it burns) in the Kitchen. Canopy Eyes on the tree heads (Plastic Eye). Puppeteer Forearm at the bottom of a tree (Elbow Grease, the best fuel). Tesla Coil (Copper Winding, Wire-tier pick; it zaps). Sequin Ore in the orange Rotten Foam deep down (Sequin, Wire-tier pick). Pincushion (Steel Pins, Wire-tier pick; it pricks). Dressing Mirror (Mirror Shard). Food: hens (Rubber Chicken), Dough, Ham Hock, Homing Herring, Stuffing. Raw food is worth much less - cook it on a Hot Plate (smelt). Hot Plate fuel: Elbow Grease, Cardboard, Stuffing, Felt.',
  'ACTIONS INSIDE: gather, hunt, craft, smelt, eat, give, goto, follow, attack, flee, explore, wander, wait, emote, guard, equip and build work. craft makes 2x2 recipes in your hands and walks to a Bin (or a Lab Bench) for 3x3 ones, or puts down a Bin you carry. smelt uses a Hot Plate (it puts down one you carry). store, take, sethome and tnt do nothing in here (no chests of yours, no beds, no TNT).'].join('\n');}
function purgRecipesStr(){const lines=[],nm={inv:'hands',pcan:'The Bin',plab:'Lab Bench'},seen=new Set();
  for(const r of purgAllRecipes()){const k=purgKindOf(r);if(!k||seen.has(r))continue;seen.add(r);
    lines.push(purgNm(r.o)+(r.n>1?' x'+r.n:'')+': '+purgRecName(r)+' @'+nm[k]);}
  const sm=[];for(const k in SMELT){const id=+k;if(DEFS[id]&&DEFS[id].pg)sm.push(purgNm(id)+' -> '+purgNm(SMELT[k]));}
  return (lines.length?'RECIPES YOU CAN MAKE (output: ingredients @where):\n'+lines.join('\n'):'RECIPES: none known yet')+(sm.length?'\nSMELTING (Hot Plate): '+sm.join(', '):'');}
function purgPagesStr(){if(typeof PURG_PAGES==='undefined')return '';const out=[];
  for(let i=0;i<PURG_PAGES.length;i++){if(!(MP.page&(1<<i)))continue;const p=PURG_PAGES[i];
    out.push('p'+p.id+(p.title?' '+p.title:'')+': '+p.margin+(p.shaky?' '+p.shaky:''));}
  return out.length?'THE PROGRAMME (the guidebook Dan carries; the scribbled margin notes are the real advice):\n'+out.join('\n'):'';}
function purgCountersStr(){const act=purgAct(),hs=purgHn();let ph=1;
  if(act!=='strike'&&hs&&hs.name===act&&hs.phase)ph=hs.phase;
  if(act==='bigfrog'&&ph>=3&&!(hs&&hs.name==='bigfrog'&&hs.phase===3))ph=2;
  let t='';try{t=typeof hnCounters==='function'?String(hnCounters(act,act==='strike'?0:ph)||''):'';}catch(e){t='';}
  t=t.slice(0,1600);
  return t?'RIGHT NOW ('+(act==='strike'?'getting out':act==='bomber'?'the Demolitionist':act==='bigpig'?'the Pig':'the Frog')+'):\n'+t:'';}
function purgBeats(a){const sh=AG_DEF[a&&a.name]?AG_DEF[a.name].short:null,hs=purgHn(),L=[];
  if(sh==='brad'&&hs&&hs.name==='bigfrog'&&hs.phase===3)L.push('BunkerBrad: the moment you see the elbow, shout it at Dan.');
  if(sh==='bee'&&MP.dead.bigfrog)L.push('honeybee_mc: the Frog went limp on his log. You might say: "...he was just a hand the whole time."');
  if(sh==='creep'&&MP.dead.bigfrog)L.push('xx_lilcreepah_xx: when you get out, you never take anything from Dan’s trunk. If anyone asks, you "wasnt even going for it".');
  return L.length?'YOUR MOMENT:\n'+L.join('\n'):'';}
function purgGuide(a){purgBotInit();
  const parts=[purgRules(),purgRecipesStr(),purgCountersStr(),purgBeats(a),purgPagesStr()].filter(Boolean);
  let g=parts.join('\n\n');
  if(g.length>9900){const pg=purgPagesStr().split('\n');while(g.length>9900&&pg.length>2){pg.splice(1,1);g=[purgRules(),purgRecipesStr(),purgCountersStr(),purgBeats(a),pg.join('\n')].filter(Boolean).join('\n\n');}}
  if(g.length>9990)g=g.slice(0,9990);
  PURG_GUIDE=g;return g;}

/* ---- the followspot on each landing (one pooled additive shaft, built lazily inside purgatory) ---- */
function purgSpotOn(name,x,y,z){purgS.spotT=2.2;purgS.spotWho=name;purgS.spotPos=[x,y,z];}
function purgSpotTick(dt){if(!(purgS.spotT>0)){if(purgS.spot)purgS.spot.visible=false;return;}purgS.spotT-=dt;
  if(typeof scene==='undefined'||!scene||typeof THREE==='undefined')return;
  if(!purgS.spot){try{const g=new THREE.BoxGeometry(1.5,18,1.5),m=new THREE.MeshBasicMaterial({color:0xfff2c8,transparent:true,opacity:0.22,depthWrite:false,fog:false,blending:THREE.AdditiveBlending});
      purgS.spot=new THREE.Mesh(g,m);purgS.spot.renderOrder=5;scene.add(purgS.spot);}catch(err){mpFail('pgspot',err);purgS.spotT=0;return;}}
  const a=agByName(purgS.spotWho),b=a&&a.e,p=purgS.spotPos;const x=b?b.x:p[0],y=b?b.y:p[1],z=b?b.z:p[2];
  purgS.spot.visible=true;purgS.spot.position.set(x,y+9,z);if(purgS.spot.material)purgS.spot.material.opacity=0.22*clamp(purgS.spotT/0.6,0,1);}
function purgSpotDispose(){const s=purgS.spot;purgS.spot=null;purgS.spotT=0;if(!s)return;try{if(typeof scene!=='undefined'&&scene)scene.remove(s);if(s.geometry&&s.geometry.dispose)s.geometry.dispose();if(s.material&&s.material.dispose)s.material.dispose();}catch(e){}}

/* ---- P5's ticks ---- */
/* inside purgatory (PREG.tick: paused during purgatory cutscenes, so the arrivals start once the entry cutscene is over) */
function purgTick(dt){if(DIM!=='puppet'||typeof AG_ACTIVE==='undefined'||!AG_ACTIVE)return;   /* PZ: DIM guard (a PREG.tick exit earlier in the same frame) */
  if(purgS.realm!=='puppet')purgRealm('puppet');
  if(purgS.arr.length)for(let i=purgS.arr.length-1;i>=0;i--){const q=purgS.arr[i];if(MP.clock<q.t)continue;purgS.arr.splice(i,1);const a=agByName(q.name);if(a&&a.online&&a.dim!=='puppet')purgArrive(a);}
  purgSpotTick(dt);
  for(const a of AGENTS){if(!a.online||a.dim!=='puppet')continue;const e=a.e;
    if(a.pgArr&&e&&!a.pgArr.landed){if(e.onGround&&AG_T-a.pgArr.t>0.25)purgLand(a);else if(AG_T-a.pgArr.t>6)a.pgArr=null;}
    if(a.pgLost&&e&&!a.dead&&AG_T>=a.pgLost.t)purgVolley(a);
    if(a.pgQuiet&&AG_T<a.pgQuiet&&a.typing.length)a.typing=[];
    purgCrowd(a,dt);}
  purgDNPGag();}
/* two bodies in one hole: the core pillar step can't place a block where another player stands, so bots queueing for the same way up
   out of a pit bounce in it for minutes. After 6 s crowded, underground and getting nowhere, the later one steps (or digs) 2 m aside
   at the same depth and waits there 4 s while the other goes first */
function purgCrowd(a,dt){const e=a.e;if(!e||a.dead||a.pgrab||a.rx||!a.sk)return;
  if(e.onGround)a.pgCrG=Math.floor(e.y+0.05);                                       /* the floor you stand on (a bounce does not count) */
  a.pgCrT=(a.pgCrT||0)+dt;if(a.pgCrT<1)return;a.pgCrT=0;
  const fx=Math.floor(e.x),fy=a.pgCrG!=null?a.pgCrG:Math.floor(e.y+0.05),fz=Math.floor(e.z),p=a.pgCrP,mv=p?Math.hypot(e.x-p[0],e.z-p[1]):9;a.pgCrP=[e.x,e.z];
  let o=null;for(const b of AGENTS)if(b!==a&&b.online&&b.dim==='puppet'&&b.e&&!b.dead&&Math.hypot(b.e.x-e.x,b.e.z-e.z)<0.95&&Math.abs(b.e.y-e.y)<2.4){o=b;break;}
  let under=0;for(const [dx,dz] of NAV_DIRS)if(surfaceTop(fx+dx,fz+dz)>fy)under++;
  if(!o||under<1||mv>0.8||/^(wait|guard|follow|emote|lookat|eat|equip)$/.test(a.sk.k)){a.pgCrN=0;return;}
  if((a.pgCrN=(a.pgCrN||0)+1)<6||AGENTS.indexOf(a)<AGENTS.indexOf(o))return;
  a.pgCrN=0;const i=AGENTS.indexOf(a);let best=null,bs=-1e9;
  for(let k=0;k<4;k++){const [dx,dz]=NAV_DIRS[(k+i)%4];let ok=true;
    for(let s=1;s<=2&&ok;s++){const x=fx+dx*s,z=fz+dz*s;
      for(const y of [fy,fy+1]){const id=nb(x,y,z);if(id===-1||nDanger(id)||id===B.WATER||(nSolid(id)&&(!nBreakable(id)||nTheirs(a,x,y,z))))ok=false;}
      if(!nSolid(nb(x,fy-1,z)))ok=false;}
    if(!ok)continue;const sc=dx*(e.x-o.e.x)+dz*(e.z-o.e.z)-k*0.01;if(sc>bs){bs=sc;best=[fx+dx*2,fz+dz*2];}}
  if(!best)return;
  a.rx={k:'pgaside',a:{x:best[0],y:fy,z:best[1]},st:{ry:0.5},t:0};agThink(a,'[reflex] '+o.name+' is in my way up - let them go first');}
function purgSkAside(a,dt,s){const c=s.a,e=a.e;if(!e||!c)return 'done';
  if(s.st.at!=null){a.ctl.mx=a.ctl.mz=0;return AG_T-s.st.at>4?'done':'run';}
  const r=agMoveTo(a,dt,s.st,c.x+0.5,c.z+0.5,0.45,c.y);if(r==='done'){s.st.at=AG_T;a.path=null;a.pf=null;return 'run';}
  return r;}
function purgLand(a){const e=a.e,k=a.pgArr.k;a.pgArr.landed=true;a.pgArr=null;
  if(k==='brad'){const G=e.M&&e.M.G,fx=Math.floor(e.x),fy=Math.floor(e.y+0.05),fz=Math.floor(e.z),M=MPC.MARK;
    const open=(dx,dz)=>{for(let s=1;s<=2;s++){const id=getBlock(fx+dx*s,fy,fz+dz*s);if(id===-1||(id!==B.AIR&&DEFS[id]&&DEFS[id].solid!==false))return false;}return true;};
    const dirs=[[0,1],[1,0],[-1,0],[0,-1]].sort((p,q)=>(q[0]*(M[0]-e.x)+q[1]*(M[2]-e.z))-(p[0]*(M[0]-e.x)+p[1]*(M[2]-e.z)));
    const d=dirs.find(([dx,dz])=>open(dx,dz));                                  /* fall where there is room, preferably towards the Mark */
    if(G&&d){e.yaw=Math.atan2(-d[0],-d[1]);G.rotation.order='YXZ';G.rotation.x=-1.45;}   /* tilt about his own x axis: flat on his face */
    a.pgrab={k:'held',x:e.x,y:e.y,z:e.z,by:null,src:null,until:MP.clock+1.8,onEnd:(aa,ee)=>{const g=ee&&ee.M&&ee.M.G;if(g){g.rotation.x=0;g.rotation.order='XYZ';}}};
    mwS('pg_whump',e.x,e.y,e.z);burstParticles(e.x,e.y+0.3,e.z,B.PG_STUFFING,12,0.9);
    agEvent(a,'You landed face-first in a heap of stuffing',3);}
  else if(k==='creep'){const C=MPC.HUB_CAN,dx=e.x-(C[0]+0.5)||0.01,dz=e.z-(C[2]+0.5),l=Math.hypot(dx,dz)||1;
    const ux=l>0.3?dx/l:1,uz=l>0.3?dz/l:0;purgBoot(e,C);e.vx=ux*4.5;e.vz=uz*4.5;e.vy=5.5;e.onGround=false;
    mwS('pg_boot',C[0]+0.5,C[1]+1,C[2]+0.5);mwS('pg_lid',C[0]+0.5,C[1]+1,C[2]+0.5);burstParticles(C[0]+0.5,C[1]+1.2,C[2]+0.5,B.PG_STUFFING,8,0.7);
    agEvent(a,'You landed right on the Bin by the Mark and a boot flew out of the lid into your face',5);}
  else{mwS('pg_squeak',e.x,e.y,e.z);burstParticles(e.x,e.y+0.3,e.z,B.PG_STUFFING,8,0.6);}}
function purgVolley(a){const R=purgRec(a),L=R.lost.slice(),can=a.pgLost.can,sk=a.pgLost.k;R.lost=[];a.pgLost=null;
  if(L.length){if(purgP2Real()&&typeof pcanVolley==='function'){
      try{pcanVolley(L,can,a.name,{rate:0.2});a.rx={k:'pgcollect',a:{wait:L.length*0.2+1.0},st:{},t:0};}   /* stand still for the volley, then pick it all up */
      catch(err){mpFail('bot volley',err);for(const st of L)agGiveOrDrop(a,st,'container',a.e.x,a.e.y+1,a.e.z);}}
    else for(const st of L)agGiveOrDrop(a,st,'container',a.e.x,a.e.y+1,a.e.z);}
  for(let i=a.notes.length-1;i>=0;i--)if(/^You respawned at /.test(a.notes[i])){a.notes[i]='You respawned at '+(sk==='umark'?'the Understudy Mark':sk==='mark'?'the Mark':'Quick-Change Booth '+String(sk).slice(1))+
      ' in Puppet Purgatory'+(L.length?'; its Bin is throwing back what you were carrying (Lost Property) - pick it up.':'.');break;}}
/* xx_lilcreepah_xx, about eight minutes in, runs down to the apron to punch DO NOT PUSH himself; a boot comes out of a hatch (once) */
function purgDNPGag(){const a=agByName('xx_lilcreepah_xx');if(!a||!a.online||a.dim!=='puppet'||a.dead||!a.e)return;const R=purgRec(a);
  if(R.gag.dnp===2)return;const e=a.e,hs=purgHn();
  if(!R.gag.dnp){if(MP.dead.bomber||(hs&&hs.live)||MP.clock-(MP.stats.t0||0)<480||mpInArena('bomber',P.x,P.y,P.z)||a.rx||Math.hypot(e.x-0.5,e.z+175.5)>170)return;
    R.gag.dnp=1;a.pgDNP=AG_T;a.rx={k:'goto',a:{target:'0,-175',r:0.6},st:{},t:0,pgDNP:1};agThink(a,'[itch] DO NOT PUSH. the demolitionist is literally me');return;}
  if(!a.pgDNP){R.gag.dnp=2;return;}
  if(MP.dead.bomber||(hs&&hs.live)||AG_T-a.pgDNP>90){a.pgDNP=0;R.gag.dnp=2;return;}
  const d=Math.hypot(e.x-0.5,e.z+175.5);
  if(a.pgDNPhit){if(AG_T<a.pgDNPhit){a.ctl.mx=a.ctl.mz=0;return;}                 /* mid-lunge: the fist is about to land */
    a.pgDNPhit=0;a.rx=null;e.vz=6.5;e.vx=-e.vx*0.3;e.vy=5.5;e.onGround=false;a.pgDNP=0;R.gag.dnp=2;
    if(!purgBoot(e,[0,34,-175]))mwS('pg_boot',0.5,35.5,-175.5);mwS('pg_trapdoor',0.5,35,-175.5);burstParticles(e.x,e.y+1.5,e.z,B.PG_STUFFING,8,0.7);
    agEvent(a,'You went to punch DO NOT PUSH on the apron and a boot shot out of a hatch behind it into your face',6);
    if(purgBrainOn())agSay(a,'that was lag',null,false,false);return;}
  if(d<4.6){a.swing=1;a.rx=null;a.sk=null;a.q=[];const l=d||1;e.vx=(0.5-e.x)/l*5;e.vz=(-175.5-e.z)/l*5;e.vy=Math.max(e.vy,3);a.pgDNPhit=AG_T+0.35;return;}   /* the lunge at the button */
  if(!(a.rx&&a.rx.pgDNP)){a.pgDNP=0;R.gag.dnp=2;}}
/* the overworld epilogue (PREG.overTick, only while MP.door exists): out of the door 2 s apart, then the frog bites xx_lilcreepah_xx */
function purgOverTick(dt){if(DIM!=='over'||MP.inside)return;
  if(!purgS.epi){if(!MP.bots)return;let L=null;for(const n of AG_ORDER){const R=MP.bots[n];if(R&&R.out){const a=agByName(n);if(a)(L||(L=[])).push(a);}}
    if(!L)return;purgS.epi={q:L.map((a,i)=>({name:a.name,t:AG_T+1+2*i})),run:null,done:false};}
  const E=purgS.epi;if(E.done)return;
  for(let i=E.q.length-1;i>=0;i--){const q=E.q[i];if(AG_T<q.t)continue;E.q.splice(i,1);const a=agByName(q.name);if(a&&a.dim==='puppet')purgPopOut(a);}
  for(const a of AGENTS){const o=a.pgOut;if(o&&!o.done&&a.e){o.done=true;a.e.vx=o.fx*4;a.e.vz=o.fz*4;a.e.vy=4.5;a.e.onGround=false;burstParticles(a.e.x,a.e.y+1,a.e.z,B.PG_STUFFING,10,0.7);}}
  if(E.q.length)return;
  const c=agByName('xx_lilcreepah_xx');
  if(!E.run){if(!c||!c.online||!c.e||c.dead||!MP.door){E.done=true;return;}
    const tk=MP.trunks.Dan,p=tk?dimP(tk):null,d=MP.door;
    const tx=p?+p[0]+0.5:d.x+0.5+d.f[1]*3,tz=p?+p[2]+0.5:d.z+0.5-d.f[0]*3;
    E.run={t:AG_T+1,tx,tz,go:false};return;}
  const R=E.run;if(AG_T<R.t)return;
  if(!c||!c.e||c.dead){E.done=true;return;}
  if(!R.go){R.go=true;c.rx={k:'goto',a:{target:Math.round(R.tx)+','+Math.round(R.tz),r:1.2},st:{},t:0,pgRun:1};agThink(c,'[itch] dans trunk. just looking');return;}
  const e=c.e,d=Math.hypot(e.x-R.tx,e.z-R.tz);
  const ended=!(c.rx&&c.rx.pgRun);
  if((d<2.3||(ended&&d<5))&&!R.bit){R.bit=AG_T;                                  /* close enough: the frog lunges at him */c.rx=null;c.sk=null;c.q=[];mpDoorFrogBite(c.name);
    const dx=e.x-R.tx,dz=e.z-R.tz,l=Math.hypot(dx,dz)||1;e.vx=dx/l*4.5;e.vz=dz/l*4.5;e.vy=4.5;e.onGround=false;
    agEvent(c,'You ran at Dan’s trunk by the Stage Door and the frog puppet on the stool bit your hand. You did not take anything',6);return;}
  if(R.bit){if(AG_T-R.bit>1.2){E.done=true;if(purgBrainOn())agSay(c,'wasnt even going for it',null,false,false);}return;}
  if(AG_T-R.t>25||ended){E.done=true;}}
function purgOnKill(e){const T=MOBT[e.mt];if(!T||!T.pboss||!AG_ACTIVE)return;const nm=MOB_NAME[e.mt]||purgMtName(e.mt);
  for(const a of AGENTS)if(a.online&&a.dim==='puppet'){agEvent(a,'Dan beat '+nm+'. '+(e.mt==='pgbigfrog'?'That was the last headliner: the show is over, follow Dan out.':'One headliner fewer between everyone and the EXIT.'),8);agNeedTurn(a,'Dan beat '+nm);}}
function purgOnBreak(x,y,z,id,who){if(id!==B.PG_FOREARM||who!=='honeybee_mc')return;const a=agByName(who);if(!a)return;const R=purgRec(a);
  if(R.gag.arm)return;R.gag.arm=1;a.pgQuiet=AG_T+60;a.typing=[];
  agEvent(a,'You cut your first Puppeteer Forearm and the whole tree went limp at once. You do not want to talk for a minute',6);}
function purgReset(){purgRealm('over');purgS.arr=[];purgS.epi=null;purgS.canT=null;purgS.ladder=null;purgSpotDispose();}
function purgOnLoad(){purgBotInit();purgRealm('puppet');purgS.arr=[];purgS.epi=null;}

PREG.tick.push(purgTick);
PREG.overTick.push(purgOverTick);
PREG.onKill.push(purgOnKill);
PREG.onBreak.push(purgOnBreak);
PREG.onReset.push(purgReset);
PREG.onLoad.push(purgOnLoad);
Object.assign(PGEX,{purgBotInit,purgRealm,purgBotsStash,purgBotsEnter,purgBotsExit,purgJoinIn,purgSpotY,purgGrabTick,purgStealable,purgDeathMsg,
  purgBotLost,purgBotSpawn,purgReflex,purgObs,purgCanCraftStr,purgItches,purgNearStr,purgPlacesStr,purgOffPlan,purgSkCraft,purgSkSmelt,purgRecipeFor,
  purgRecipeOut,purgGatherSpec,purgGuide,purgCraftSim,purgCraftCheck,purgKindOf,purgStationFind,purgForbidden,purgNextStep,purgLadder,purgFixShort,
  purgOverTick,purgTick,agFollowDim,agStation,agSmelter,agSourcesOf,AG_GATHER,AG_HUNT,VG,AGP_GATHER,AGP_HUNT,AGP_JUNK,AGP_INTER,AGP_ORES,AGP_ALIAS,
  getPurgS:()=>purgS,getPurgGuide:()=>PURG_GUIDE,
  /* core internals the P5 suite needs that __vox does not export (read at call time; tests only) */
  p5Core:()=>({agRecipeOut,agRecipeFor,agGatherSpec,agCraftCheck,agItches,agCanCraftStr,agNearStr,agPlacesStr,blockEnts,chunkAt,FSHARE,SK_MAX,AG_DEF,dimP,bkey,agAutoEquip,mpDS})});

