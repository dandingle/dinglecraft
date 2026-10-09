/* route.js (PZ): the speed-run pilot's route through Puppet Purgatory, shared by qa/speedrun.js (node, headless) and
   qa/play_session.mjs (a real muted headless Chrome). const R=require('./route.js')(V,pilot,{nav,BS,log,flag,MODE,VERB});
   R.ROUTE = [[legId, fn]] in PURG_LADDER order plus the route's own steps; each fn plays with honest input only (qa/pilot.js
   primitives and qa/nav.js) and returns true | false | 'pending'. R.begin(name)/R.end() bracket a leg (frame budget, commentary).
   Read qa/speedrun.js's header for what the legs do. Nothing here writes game state except through the player's own input. */
'use strict';
(function(root){
function makeRoute(V,pilot,o){
const B=V.B,IT=V.IT,MPC=V.MPC,MP=()=>V.getMP(),D=V.DEFS;const log=o.log,flag=o.flag||(()=>false),MODE=o.MODE||'fast',VERB=!!o.VERB,nav=o.nav,BS=o.BS||null,ENV=o.env||{};
const ST={deaths:0,eats:0,fights:0};
const LEG_BUDGET={bomber:900,bigpig:900,bigfrog:1300,escape:600};   /* game seconds before a leg is abandoned (a stuck script never hangs the run) */
const frame0=pilot.frame;let budgetEnd=Infinity,lastHp=20;const DMG={};
let nFails=0;pilot.S.pre=()=>{if(pilot.S.fails.length>nFails){nFails=pilot.S.fails.length;const p=V.P,K=V.getPMS&&V.getPMS();   /* the ledger's context, logged once per failure */
    log('LEDGER: '+pilot.S.fails[nFails-1]+' | hurtT '+(+p.hurtT).toFixed(2)+' flight '+!!(K&&K.flight)+' fight '+!!V.getMPF().fight+' cut '+V.mpInfo().cut+' near '+
      V.entities.filter(e=>(e.t==='mob'||e.bot)&&!e.dead&&Math.hypot(e.x-p.x,e.z-p.z)<3).map(e=>e.mt||'bot').join(',')+' P '+p.x.toFixed(1)+','+p.y.toFixed(1)+','+p.z.toFixed(1)+
      ' v '+[p.vx,p.vy,p.vz].map(v=>(+v).toFixed(1)).join(',')+' onG '+p.onGround+' keys '+['KeyW','Space','ControlLeft'].filter(k=>V.KEY[k]).join('+')+' under '+V.getBlock(Math.floor(p.x),Math.floor(p.y)-1,Math.floor(p.z))+' feet '+V.getBlock(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z)));}
  if(scripted())pilot.allowJump('scripted move',2);};
pilot.frame=function(n){for(let i=0;i<(n||1);i++){if(pilot.S.frames>budgetEnd)throw new Error('leg budget exceeded');frame0(1);if(fightLog&&VERB)fightLog();
    if(pilot.S.fails.length>(ST.nf||0)){ST.nf=pilot.S.fails.length;const f=V.getMPF().fight,K=V.getHNK&&V.getHNK(),H=V.getHNS&&V.getHNS();
      log('LEDGER: '+pilot.S.fails[ST.nf-1]+' | fight '+(f?f.name+' ph '+f.phase+(f.over?' over':'')+(f.dying?' dying':''):'none')+' st '+(f&&f.e&&f.e.st)+' strike '+!!MP().strike+' cut '+V.mpInfo().cut+' danK '+JSON.stringify(H&&H.danK&&{k:H.danK.k,by:H.danK.by})+' P '+V.P.x.toFixed(1)+','+V.P.y.toFixed(1)+','+V.P.z.toFixed(1));}
    const p=V.P;if(p&&p.hp<lastHp-0.01){const L=V.getLASTDMG(),k=(L&&L.how||'?')+' by '+(L&&L.by||'?');DMG[k]=(DMG[k]||0)+(lastHp-p.hp);if(VERB&&lastHp-p.hp>=2)log('  hurt '+(lastHp-p.hp).toFixed(1)+' '+k);}if(p)lastHp=p.hp;}};
/* ---------------------------------------------------------------- helpers ---------------------------------------------------- */
const have=id=>V.invCount(V.P.inv,id);
const invStr=()=>{const m={};for(const s of V.P.inv)if(s)m[D[s.id]?D[s.id].name:s.id]=(m[D[s.id]?D[s.id].name:s.id]||0)+s.count;return Object.entries(m).map(([k,v])=>k+' '+v).join(', ')+' | hp '+V.P.hp+' hunger '+V.P.hunger;};
const name=id=>D[id]?D[id].name:String(id);
const dist2=(x,z)=>Math.hypot(V.P.x-x,V.P.z-z);
/* the fight helper from P4's boss scripts: respawn (waits out the Lost Property volley), melee, steering */
const CT=BS?BS.ctl(V,pilot,{log}):null;
const FOODS=()=>[IT.PG_GLAZED,IT.PG_ROAST,IT.PG_GRILLED,IT.PG_FLATBREAD,IT.PG_MEATBALL,IT.PG_TOMATO,IT.PG_STUFF];
function threat(r){const p=V.P;let best=null,bd=r||2.9;
  for(const e of V.entities){if(e.t!=='mob'||e.dead||e.bot)continue;const T=V.MOBT[e.mt];if(!T||!T.hostile||T.prop||T.npc||T.pboss||e.pwd!=null)continue;
    if(e.hole||T.struct)continue;                     /* a tethered puppet cannot be beaten, only its Arm Hole broken: walk away instead */
    const d=Math.hypot(e.x-p.x,e.y+(e.h||1)*0.55-(p.y+p.eyeY),e.z-p.z);if(d<bd){bd=d;best=e;}}return best;}
function weapon(){for(const id of [IT.PG_GAUNTLET,IT.PG_STILETTO,IT.PG_CHOPGLOVE,IT.PG_RAPIER,IT.PG_BAT,IT.PG_SLAPPER,IT.PG_LARPPICK,IT.PG_FLOPPY])if(have(id)){
    const h=V.heldStack();if(!h||h.id!==id)pilot.select(id);return id;}pilot.emptyHand();return null;}
let busy=false;
/* a running commentary of a headliner fight (every 20 s of MP.clock): phase, his HP and state, Dan's HP and kit */
let fightLog=null;function watchFight(n){const t0=MP().clock;let last=-99;fightLog=()=>{const c=MP().clock-t0;if(c-last<20)return;last=c;const f=V.getMPF().fight,e=f&&f.e;
  const K=n==='bigfrog'&&V.getHNK?V.getHNK():null;
  log('  ['+n+'] t '+c.toFixed(0)+' ph '+(f&&f.phase)+' hp '+(e?(+e.hp).toFixed(0):'-')+' st '+(e&&e.st)+' Dan hp '+V.P.hp.toFixed(1)+' at '+V.P.x.toFixed(0)+','+V.P.y.toFixed(0)+','+V.P.z.toFixed(0)+' held '+(V.heldStack()?name(V.heldStack().id):'-')+' armour '+V.P.armor.filter(Boolean).length
    +(K?' | tg '+(K.tg?K.tg.st+(K.tg.target===V.P?'@Dan':K.tg.prop?'@prop':'@?'):'-')+' regrow '+(+K.regrow||0).toFixed(1)+' dark '+(+K.dark||0).toFixed(1)+' tongueT '+(+K.tongueT||0).toFixed(1)+' swal '+!!K.swal:''));};}
/* out of the Frog's Bog Hollow by the nearest climb-out (planned, not guessed); used by the Frog script while it is in phase 1-2 */
function hollowOut(){const A=V.hnA();const p=nav.plan((x,y,z)=>y>=A.ky+1&&Math.hypot(x+0.5-A.kc[0]-0.5,z+0.5-A.kc[1]-0.5)<22,{max:40000});
  if(!p||p.length<2)return false;const r=nav.follow(p,{maxS:12});return r==='ok'||V.P.y>=A.ky+0.8;}
/* the game moving Dan's body (a throw, a grab, a reel, the Strike Hand, a cutscene, a knockback): the ledger's allowed jumps */
function scripted(){const p=V.P;if(!p)return false;const H=V.getHNS&&V.getHNS(),S=V.getPMS&&V.getPMS();
  const f=V.getMPF().fight;
  if(V.AGENTS&&V.AGENTS.some(a=>a.online&&a.e&&!a.dead&&Math.hypot(a.e.x-p.x,a.e.z-p.z)<1.1&&Math.abs(a.e.y-p.y)<2))return true;   /* a bot's body shoves ours */
  if(V.entities.some(e=>!e.dead&&e.grab&&e.grab.who===p))return true;      /* the Comic has our wrist and does his act at us */
  {const f=V.getBlock(Math.floor(p.x),Math.floor(p.y+0.05),Math.floor(p.z));if(f&&D[f]&&D[f].solid!==false)return true;}   /* half inside a rake step: the engine pushes the body out */
  return (p.hurtT>0.2)||!!(H&&H.strike&&H.strike.hand)||V.mpInfo().cut||!!(S&&S.flight)||!!(f&&!f.over)||!!MP().strike;}   /* the Strike: walls shove, the Hand carries, the broom sweeps you back */   /* a live headliner fight: his pushes, reels and curtains move Dan */
function guard(){if(busy)return false;const p=V.P;if(scripted())pilot.allowJump('scripted move',2);busy=true;try{
  if(MP().strike){const H=V.getHNS(),S=H&&H.strike,hd=S&&S.hand;     /* the Strike Hand's shadow is on us: sprint sideways out of it */
    if(hd&&hd.hst==='shadow'&&hd.at&&Math.hypot(p.x-hd.at[0],p.z-hd.at[2])<4.2){const sx=p.x>hd.at[0]?1:-1;p.yaw=Math.atan2(-sx,0);V.KEY.KeyW=true;V.KEY.ControlLeft=true;V.KEY.Space=false;pilot.frame(1);return true;}}
  if(p.dead){nav.release();ST.deaths++;log('died ('+(V.getLASTDMG()&&V.getLASTDMG().how)+') at '+p.x.toFixed(0)+','+p.z.toFixed(0));if(CT)CT.respawn();else{pilot.allowJump('respawn',40);V.respawn();pilot.frame(30);}return true;}
  if(p.hunger<=13&&!V.getMPF().fight&&pilot.S.frames>(ST.noEat||0)){const f=FOODS().find(id=>have(id)&&(id!==IT.PG_STUFF||p.hunger<=9));
    if(f){nav.release();if(pilot.eat(f))ST.eats++;else ST.noEat=pilot.S.frames+750;return true;}}
  const m=threat(2.9);if(m&&!V.mpInfo().cut&&CT&&CT.hit(m)){nav.release();ST.fights++;if(ST.fights<=6||ST.fights%50===0)log('scuffle #'+ST.fights+' with '+m.mt+' hp '+(+m.hp).toFixed(1)+' at '+m.x.toFixed(0)+','+m.y.toFixed(0)+','+m.z.toFixed(0));weapon();for(let i=0;i<60&&!m.dead&&!p.dead;i++){if(!CT.hit(m))break;pilot.frame(1);}V.MB.l=false;pilot.frame(1);return true;}
  return false;}finally{busy=false;}}
nav.setTick(guard);
/* danger zones for the planner: tethered hostiles (hole + reach), roaming hostiles (3 m), hurting blocks are in nav already */
let DZ=[],HUT=null;
nav.setCost(()=>{DZ=[];const p=V.P;if(HUT===null)HUT=(V.mwKitchenHut&&V.mwKitchenHut())||false;for(const e of V.entities){if(e.t!=='mob'||e.dead||e.bot)continue;const T=V.MOBT[e.mt];if(!T||!T.hostile||T.prop||T.npc||T.pboss)continue;
    if(Math.hypot(e.x-p.x,e.z-p.z)>90)continue;if(e.hole)DZ.push([e.hole.x+0.5,e.hole.z+0.5,(e.reach||6)+1.3]);else DZ.push([e.x,e.z,3]);}},
  (x,y,z)=>{let c=0;for(const d of DZ)if(Math.hypot(x+0.5-d[0],z+0.5-d[1])<d[2])c+=6;
    if(HUT&&x>=HUT.x0&&x<=HUT.x1+1&&z>=HUT.z0&&z<=HUT.z1+1&&y>=HUT.y0-1&&y<=HUT.y1+1)c+=12;      /* behind the Cook's counter: into the stock pot */
    return c;});
/* stations */
function stationBlock(kind){const want=kind==='pcan'?B.PG_CAN:B.PG_BENCH;const p=V.P;
  const fixed=kind==='pcan'?[V.MPC.HUB_CAN].concat(V.mwSpots('boothCan').filter((c,i)=>MP().spawns['b'+(i+1)])):V.mwSpots('labsBench').concat(MP().spawns.b3?[[V.MPC.BOOTH[2][0]-2,0,0]]:[]);
  const near=nav.findBlocks([want],24,{y0:Math.floor(p.y)-8,y1:Math.floor(p.y)+8});const c=[];for(const b of near)c.push([b.x,b.y,b.z]);
  for(const f of fixed)if(V.getBlock(f[0],f[1],f[2])===want)c.push(f.slice());
  c.sort((a,b)=>dist2(a[0]+0.5,a[2]+0.5)-dist2(b[0]+0.5,b[2]+0.5));return c[0]||null;}
function recipe(out){return V.getPRECIPES().find(r=>r.o===out)||null;}
function ingr(r){const m=new Map();if(r.s)for(const i of r.s)m.set(i,(m.get(i)||0)+1);else for(const row of r.p)for(const ch of row){if(ch===' '||ch==='.')continue;const id=r.k[ch];m.set(id,(m.get(id)||0)+1);}return m;}
function canCraft(out,times){const r=recipe(out);if(!r)return false;for(const [id,c] of ingr(r))if(have(id)<c*(times||1))return false;return true;}
/* craft `times` x out at its station (walking there), then wait out the Bin volley / the Lab Rat's demo and pick everything up */
/* hand-recipe ingredients (Puppet Rods from Felt, Felt from Sleeves) are made on the spot when short */
function prep(out,times,depth){const r=recipe(out);if(!r||(depth||0)>2)return;for(const [id,c] of ingr(r)){const need=c*times-have(id);if(need<=0)continue;
    const h=recipe(id);if(!h||h.st!=='hand')continue;const k=Math.ceil(need/(h.n||1));prep(id,k,(depth||0)+1);for(let i=0;i<k&&canCraft(id);i++)pilot.craft(id,'inv');}}
function craft(out,times,o){o=o||{};const r=recipe(out);if(!r){log('no recipe for '+name(out));return false;}times=times||1;prep(out,times);
  const kind=r.st==='can'?'pcan':r.st==='lab'?'plab':r.st==='trans'?'ptrans':'inv';const before=have(out);
  if(kind==='pcan'||kind==='plab'){const s=o.at||stationBlock(kind);if(!s){log('no '+kind+' station near');return false;}
    if(!nav.go(nav.reachGoal(s[0],s[1],s[2],3.6),{maxS:180})){log('could not reach the '+kind+' at '+s.join(',')+' from '+V.P.x.toFixed(1)+','+V.P.y.toFixed(1)+','+V.P.z.toFixed(1));return false;}
    if(V.P.inv.filter(Boolean).length>=31)junk(true,[s[0]+0.5,s[2]+0.5]);}       /* room for the result: spoil thrown away from the station */
  if(kind==='ptrans'){const t=V.mwSpots('trans')[0];if(!nav.go({near:[t[0]+0.5,t[1],t[2]+0.5],r:4,ry:3},{maxS:180}))return false;}
  for(let k=0;k<times;k++){if(!canCraft(out)){log('missing ingredients for '+name(out));break;}
    if(!pilot.craft(out,kind)){log('craft failed: '+name(out)+' ('+kind+')');break;}
    if(V.pgCore().MODAL.kind)log('modal still open after crafting '+name(out)+': '+V.pgCore().MODAL.kind);
    if(kind!=='inv'){for(let i=0;i<220&&V.piVolleyBusy();i++)pilot.frame(1);pilot.frame(4);nav.collect([out],8,{maxS:6});}}
  pilot.frame(2);if(have(out)<=before)log('craft of '+name(out)+' produced nothing ('+kind+(r?'':' no recipe')+')');return have(out)>before;}
/* trees: the nearest standing tree; break its Puppeteer Forearm and the whole head comes down as one drop per item type */
function treeSites(cx,cz,r){const out=[];for(let x=cx-r;x<=cx+r;x+=16)for(let z=cz-r;z<=cz+r;z+=16){const a=Math.floor(x/16),b=Math.floor(z/16);
    for(const t of V.mwTreeSites(a,b))if(!out.some(q=>q.id===t.id))out.push(t);}return out;}
function fellTree(){const p=V.P;const ts=treeSites(Math.floor(p.x),Math.floor(p.z),48).filter(t=>!t.felled&&V.getBlock(t.x,t.y0+1,t.z)===B.PG_FOREARM)
    .sort((a,b)=>dist2(a.x+0.5,a.z+0.5)-dist2(b.x+0.5,b.z+0.5));
  for(const t of ts.slice(0,3)){log('tree '+t.id);if(!nav.reachMine(t.x,t.y0+1,t.z,{collect:false,r:3.8}))continue;pilot.frame(20);
    nav.collect(null,9,{maxS:12,near:[t.x+0.5,t.y0+2,t.z+0.5]});return true;}
  return false;}
/* a block we may mine without digging ourselves into a pit: a free side (or bottom) face, or a free top face no deeper than one
   below our feet (o.deep allows floors, for the Sequin dig) */
function exposedOK(b,o){const S=id=>nav.solid(id)||nav.fluid(id),G=V.getBlock;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(!S(G(b.x+dx,b.y,b.z+dz)))return true;if(!S(G(b.x,b.y-1,b.z)))return true;
  return !S(G(b.x,b.y+1,b.z))&&(o.deep||b.y>=Math.floor(V.P.y)-1);}
/* mining: the nearest exposed blocks of these ids we can harvest, until have(dropId)>=n */
function mineFor(ids,dropId,n,o){o=o||{};const t0=pilot.S.frames,maxF=Math.round((o.maxS||300)/0.04);let fails=0;const bad=new Set();
  while(have(dropId)<n&&pilot.S.frames-t0<maxF&&fails<8){const p=V.P;
    const c=nav.findBlocks(ids,o.r||24,{cx:o.cx,cz:o.cz,y0:o.y0!=null?o.y0:Math.floor(p.y)-12,y1:o.y1!=null?o.y1:Math.floor(p.y)+6,yw:o.yw,load:o.load})
      .filter(b=>!bad.has(b.x+','+b.y+','+b.z)&&exposedOK(b,o)&&nav.canHarvest(b.id)&&(!o.ok||o.ok(b))).slice(0,6);
    if(!c.length){log('nothing exposed to mine for '+name(dropId));return have(dropId)>=n;}
    const b=c[0];const h0=have(dropId);if(!nav.reachMine(b.x,b.y,b.z,{maxS:60})){if(VERB)log('  mine '+name(b.id)+' at '+b.x+','+b.y+','+b.z+' failed from '+V.P.x.toFixed(1)+','+V.P.y.toFixed(1)+','+V.P.z.toFixed(1));bad.add(b.x+','+b.y+','+b.z);fails++;continue;}
    fails=0;if(VERB&&have(dropId)===h0)log('  mined '+name(b.id)+' at '+b.x+','+b.y+','+b.z+' but no '+name(dropId)+' picked up');junk();}
  return have(dropId)>=n;}
/* dig a staircase down to y (1x2 cut, one step per block), standing on solid ground each step; returns true at depth */
function stairDown(y,dir){const p=V.P;let [dx,dz]=dir||[1,0],turns=0;let x=Math.floor(p.x),z=Math.floor(p.z),cy=Math.floor(p.y+0.05);
  for(let guard=0;cy>y&&guard<80;guard++){const nx=x+dx,nz=z+dz;
    for(const yy of [cy+1,cy,cy-1]){const id=V.getBlock(nx,yy,nz);if(nav.solid(id)||nav.fluid(id)){if(!(D[id].hard>=0)){log('stairDown: hit '+name(id));return false;}const t=nav.tool(id);
        if(!pilot.mine(nx,yy,nz,{max:20})){log('stairDown: could not mine '+name(id)+' at '+nx+','+yy+','+nz+' with '+(t?name(t):'a bare hand'));return false;}}}
    if(!nav.solid(V.getBlock(nx,cy-2,nz))){/* a seam cave under the next step: drop in if its floor is within 4, else turn */
      let fy=null;for(let yy=cy-3;yy>=cy-6;yy--)if(nav.solid(V.getBlock(nx,yy,nz))){fy=yy+1;break;}
      if(fy==null||fy<y-1){const t=dx;dx=-dz;dz=t;turns++;if(turns>3)return Math.floor(V.P.y)<=y+4;continue;}
      nav.go([nx,fy,nz],{maxS:10,tries:2,dig:false});x=Math.floor(V.P.x);z=Math.floor(V.P.z);cy=Math.floor(V.P.y+0.05);turns=0;pilot.frame(2);continue;}
    turns=0;nav.go([nx,cy-1,nz],{maxS:10,tries:2,dig:false});x=nx;z=nz;cy=Math.floor(V.P.y+0.05);pilot.frame(2);}
  return cy<=y;}
/* dig a staircase up toward (tx,tz) until Dan stands at the deck (or y): head room, the next step's body, a block under it if
   the floor is missing (Stage Deck or Felt Sleeve from the inventory), then jump onto it */
function stairUp(tx,tz,y){let fails=0;const bad=new Set();const surf=(x,z)=>z>=-160?V.deckY(z)+1:Math.min(60,V.mpSurf(x,z))+1;
  for(let guard=0;guard<90;guard++){const p=V.P,x=Math.floor(p.x),z=Math.floor(p.z),cy=Math.floor(p.y+0.05);
    if(cy>=(y!=null?y:surf(x,z)))return true;
    let dx=Math.sign(Math.round(tx-p.x)),dz=Math.sign(Math.round(tz-p.z));if(Math.abs(tx-p.x)>Math.abs(tz-p.z))dz=0;else dx=0;if(!dx&&!dz)dx=1;
    /* prefer a side with a step in it (a wall to cut stairs into); in the middle of a cave, walk to its wall first */
    const sides=[[dx,dz],[-dz,dx],[dz,-dx],[-dx,-dz]],hasStep=s=>nav.solid(V.getBlock(x+s[0],cy,z+s[1]))&&D[V.getBlock(x+s[0],cy,z+s[1])].hard>=0;
    const st=sides.find(q=>hasStep(q)&&!bad.has(q+''));if(st){dx=st[0];dz=st[1];}else if(bad.size)return false;
    else{const w=nav.plan((cx2,cy2,cz2)=>cy2===cy&&[[1,0],[-1,0],[0,1],[0,-1]].some(s=>nav.solid(V.getBlock(cx2+s[0],cy2,cz2+s[1]))&&D[V.getBlock(cx2+s[0],cy2,cz2+s[1])].hard>=0&&!nav.solid(V.getBlock(cx2+s[0],cy2+1,cz2+s[1]))),{max:3000});
      if(w&&w.length>1){nav.follow(w,{maxS:15});continue;}}
    const nx=x+dx,nz=z+dz;
    for(const [bx,by,bz] of [[x,cy+2,z],[nx,cy+1,nz],[nx,cy+2,nz]]){const id=V.getBlock(bx,by,bz);if(nav.solid(id)||nav.fluid(id)){if(!(D[id].hard>=0)){log('stairUp: '+name(id)+' in the way');return false;}const t=nav.tool(id);if(!pilot.mine(bx,by,bz,{max:20})){log('stairUp: could not mine '+name(id)+' at '+bx+','+by+','+bz+' with '+(t?name(t):'a bare hand')+', trying another side');bad.add([dx,dz]+'');break;}}}
    if(bad.has([dx,dz]+''))continue;
    if(!nav.solid(V.getBlock(nx,cy,nz))){const blk=[B.PG_DECK,B.PG_SLEEVE,B.PG_FOAM].find(id=>have(id));if(!blk){log('stairUp: nothing to step on');return false;}
      if(nav.solid(V.getBlock(nx,cy-1,nz))){pilot.select(blk);pilot.lookAt(nx+0.5,cy-0.02,nz+0.5);V.MB.r=true;pilot.frame(1);V.MB.r=false;pilot.frame(2);}
      if(!nav.solid(V.getBlock(nx,cy,nz))){/* a cave ahead: pillar up where we stand instead (jump, look down, place under our feet) */
        if(!pillarUp(blk)){log('stairUp: could not place a step at '+nx+','+cy+','+nz);return false;}continue;}}
    for(let i=0;i<30;i++){const q=V.P;q.yaw=Math.atan2(-(nx+0.5-q.x),-(nz+0.5-q.z));q.pitch=0;V.KEY.KeyW=true;V.KEY.Space=q.onGround&&Math.floor(q.y+0.05)<cy+1;pilot.frame(1);
      if(Math.floor(q.x)===nx&&Math.floor(q.z)===nz&&Math.floor(q.y+0.05)===cy+1&&q.onGround)break;}
    V.KEY.KeyW=false;V.KEY.Space=false;pilot.frame(2);
    if(Math.floor(V.P.y+0.05)<=cy){fails=(fails||0)+1;if(fails>3){log('stairUp: stuck at '+Math.floor(V.P.x)+','+Math.floor(V.P.y)+','+Math.floor(V.P.z));return false;}}else fails=0;}
  log('stairUp: gave up at y '+Math.floor(V.P.y));return false;}
/* one block up in place: head room, jump, look straight down and place the block under our feet at the top of the jump */
function pillarUp(blk){const p=V.P,x=Math.floor(p.x),z=Math.floor(p.z),cy=Math.floor(p.y+0.05);
  for(const yy of [cy+2,cy+3]){const id=V.getBlock(x,yy,z);if(nav.solid(id)){if(!(D[id].hard>=0))return false;nav.tool(id);if(!pilot.mine(x,yy,z,{max:20}))return false;}}
  for(let i=0;i<25&&Math.hypot(p.x-x-0.5,p.z-z-0.5)>0.12;i++){p.yaw=Math.atan2(-(x+0.5-p.x),-(z+0.5-p.z));V.KEY.KeyW=true;V.KEY.ShiftLeft=true;pilot.frame(1);}
  V.KEY.KeyW=false;V.KEY.ShiftLeft=false;pilot.frame(2);                     /* centred in the cell: the body is 0.6 wide */
  pilot.select(blk);V.KEY.Space=true;pilot.frame(1);V.KEY.Space=false;
  for(let i=0;i<20;i++){p.pitch=-1.55;if(p.y>cy+1.05&&V.getBlock(x,cy,z)===0){V.MB.r=true;pilot.frame(1);V.MB.r=false;}else pilot.frame(1);if(nav.solid(V.getBlock(x,cy,z))&&p.onGround)break;}
  pilot.frame(3);return nav.solid(V.getBlock(x,cy,z))&&Math.floor(V.P.y+0.05)>=cy+1;}
/* back to the surface: walk if there is a way, else dig a staircase up toward (tx,tz) */
function surfY(){const p=V.P;return Math.floor(p.z)>=-160?V.deckY(Math.floor(p.z))+1:V.mpSurf(Math.floor(p.x),Math.floor(p.z))+1;}
function climbOut(tx,tz){if(V.P.y>=surfY()-1.5)return true;nav.goXZ(tx,tz,{r:3,maxS:60,tries:2});if(V.P.y>=surfY()-1.5)return true;
  log('climbing out by a dug staircase from y '+Math.floor(V.P.y));return stairUp(tx,tz);}
/* a horizontal 1x2 tunnel of length n in dir, harvesting any `ids` exposed on the way */
function tunnelFor(ids,dropId,n,len,dir){let [dx,dz]=dir;let x=Math.floor(V.P.x),z=Math.floor(V.P.z);const y=Math.floor(V.P.y+0.05);
  for(let i=0;i<len&&have(dropId)<n;i++){const nx=x+dx,nz=z+dz;
    for(const yy of [y+1,y]){const id=V.getBlock(nx,yy,nz);if(nav.solid(id)){if(!(D[id].hard>=0))return have(dropId)>=n;nav.tool(id);if(!pilot.mine(nx,yy,nz,{max:20}))return have(dropId)>=n;}}
    if(!nav.solid(V.getBlock(nx,y-1,nz))){const id=V.getBlock(nx,y-1,nz);/* bridge nothing: stop */return have(dropId)>=n;}
    nav.go([nx,y,nz],{maxS:6,tries:1,dig:false});x=nx;z=nz;
    mineFor(ids,dropId,n,{r:4,y0:y-2,y1:y+3,maxS:30});nav.collect(null,4,{maxS:3});}
  return have(dropId)>=n;}
/* smelting on Burners: drop the raw items one at a time on up to 4 coils, wait, pick up the pops */
function smelt(raw,out,want){const t0=pilot.S.frames;let guard=0;
  while(have(raw)>0&&have(out)<want&&guard++<6){const p=V.P;
    const bs=nav.findBlocks([B.PG_BURNER],60,{y0:Math.floor(p.y)-14,y1:Math.floor(p.y)+14}).filter(b=>!nav.solid(V.getBlock(b.x,b.y+1,b.z)));
    if(!bs.length){log('no Burner near');return false;}
    const b0=bs[0];if(!nav.go({near:[b0.x+0.5,b0.y+1,b0.z+0.5],r:2.6,ry:2,ok:(x,y,z)=>!(x===b0.x&&z===b0.z)},{maxS:180}))return false;
    const coils=bs.filter(b=>Math.hypot(b.x+0.5-V.P.x,b.z+0.5-V.P.z)<3.6&&Math.abs(b.y+1-V.P.y)<2.5).slice(0,4);
    const per=Math.ceil(Math.min(have(raw),want-have(out)+1)/coils.length);
    for(const c of coils){for(let k=0;k<per&&have(raw)>0;k++){pilot.select(raw);pilot.lookAt(c.x+0.5,c.y+1.05,c.z+0.5);
        const p2=V.P,dd=Math.hypot(c.x+0.5-p2.x,c.z+0.5-p2.z);p2.pitch=Math.atan2(c.y+1.1-(p2.y+p2.eyeY),dd)+Math.min(0.5,dd*0.12);V.p2Core().dropSel(false);pilot.frame(6);}}
    /* wait while it sizzles, picking up the pops that land near us */
    for(let i=0;i<(per*4+3)/0.04&&have(out)<want;i++){pilot.frame(1);if(i%25===0)nav.collect([out],5,{maxS:1.5});}
    nav.collect([out,raw],6,{maxS:6});}
  return have(out)>=want;}
/* place a block from the inventory on the floor next to Dan: aim at the top face of a floor block and right-click once */
function placeNear(id,o){o=o||{};const p=V.P,x0=Math.floor(p.x),z0=Math.floor(p.z),y=Math.floor(p.y+0.05);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1],[2,0],[0,2],[-2,0],[0,-2]]){const x=x0+dx,z=z0+dz;
    if(!nav.solid(V.getBlock(x,y-1,z))||nav.solid(V.getBlock(x,y,z))||nav.fluid(V.getBlock(x,y,z))||nav.solid(V.getBlock(x,y+1,z)))continue;
    if(!pilot.select(id))return null;pilot.lookAt(x+0.5,y+0.01,z+0.5);V.MB.r=true;pilot.frame(1);V.MB.r=false;pilot.frame(2);
    if(V.getBlock(x,y,z)===id)return [x,y,z];}
  return null;}
/* the furnace UI, exactly as a player uses it: right-click the block, shift-click stacks across, Esc */
function openStation(b){pilot.emptyHand();pilot.lookAt(b[0]+0.5,b[1]+0.5,b[2]+0.5);pilot.use();return V.pgCore().MODAL.kind;}
function hpLoad(b,raw,fuel){if(!nav.go(nav.reachGoal(b[0],b[1],b[2],3.6),{maxS:120}))return false;if(openStation(b)!=='furnace')return false;
  const C=V.pgCore(),M=C.MODAL;const sl=id=>M.slots.find(s=>s.home==='inv'&&s.get&&s.get()&&s.get().id===id);
  if(M.be.out){const rs=M.slots.find(q=>q.kind==='result');pilot.expect(M.be.out.id,M.be.out.count);C.slotClick(rs,false,true);pilot.frame(1);}   /* take what is done first */
  let s=sl(raw);if(s&&(!M.be.in||M.be.in.id===raw))C.slotClick(s,false,true);pilot.frame(1);const need=M.be.in?M.be.in.count:0;
  for(let k=0;k<4&&(!M.be.fuel||M.be.fuel.count<need);k++){s=sl(fuel);if(!s)break;C.slotClick(s,false,true);pilot.frame(1);}
  const be=M.be,ok=!!(be&&be.in&&be.in.id===raw);V.closeModal(true);pilot.frame(2);log('hot plate loaded: '+(ok?be.in.count+' '+name(raw)+', fuel '+(be.fuel?be.fuel.count:0):'nothing'));return ok;}
function hpTake(b,out){if(!nav.go(nav.reachGoal(b[0],b[1],b[2],3.6),{maxS:150}))return false;if(openStation(b)!=='furnace')return false;
  const C=V.pgCore(),M=C.MODAL;pilot.frame(2);const be=M.be;const n=be&&be.out?be.out.count:0;
  if(n){const rs=M.slots.find(s=>s.kind==='result');pilot.expect(be.out.id,n);C.slotClick(rs,false,true);}pilot.frame(2);V.closeModal(true);pilot.frame(2);return n;}
function hpLeft(b){const be=V.blockEnts.get(V.pgCore().bkey(b[0],b[1],b[2]));return be&&be.in&&(be.fuel||be.burn>0)?be.in.count:0;}
let HP=null,LAB=null;
/* walk up to an arch whose headliner is dead until it opens (P1: within 60 m, a 4 s burn or slide), then into its booth */
function openArch(n){const z=V.MPC.ARCH_Z[n-1],k='a'+n;if(!MP().open[k]){nav.goXZ(0,z-14,{r:3,maxS:300});for(let i=0;i<400&&!MP().open[k];i++)pilot.frame(1);}
  if(!MP().open[k]){log('arch '+n+' did not open');return false;}pilot.frame(20);return goBooth(n-1);}
/* inventory housekeeping (an expert drops the spoil): whole stacks of digging junk beyond what the route still needs, thrown
   ahead and up so they land out of the 2 m magnet; runs when the backpack is nearly full */
/* what the rest of the route still needs: NEED (never dropped below) from the crafts still ahead; KEEP (carry at most) = the cap */
function NEED(){const D2=MP().dead,n={};const add=(id,c)=>{n[id]=(n[id]||0)+c;};
  if(!have(B.PG_BENCH)&&!D2.bigpig&&!LAB){add(IT.PG_COPPER,3);add(IT.PG_WIRE,3);add(IT.PG_LAMINATE,2);}
  if(!have(IT.PG_MITT)&&!D2.bigpig){add(IT.PG_SHAGFUR,2);add(IT.PG_SEQUIN,1);add(IT.PG_SATIN,1);}
  const vm=Math.max(0,2-have(IT.PG_VMIRROR));if(vm&&!D2.bigpig){add(IT.PG_SHARD,4*vm);add(IT.PG_SEQUIN,vm);add(B.PG_LAMP,vm);add(IT.PG_ROD,vm);}
  if(!have(IT.PG_STAPLER)&&!D2.bigfrog){add(IT.PG_PINS,3);add(IT.PG_COPPER,1);add(IT.PG_WIRE,1);add(IT.PG_ROD,1);}
  if(!have(IT.PG_STAPLES)&&!D2.bigfrog)add(IT.PG_PINS,2);
  if(!have(IT.PG_FLY)&&!D2.bigfrog){add(IT.PG_FELT,1);add(IT.PG_GOOGLIES,1);}
  add(IT.PG_FOAMCHUNK,8);add(IT.PG_ROD,4);add(B.PG_DECK,8);add(IT.PG_STUFF,8);add(IT.PG_TOMATO,4);
  return n;}
function KEEP(){const D2=MP().dead,N=NEED();
  const K={[IT.PG_FOAMCHUNK]:24,[IT.PG_FOAMDUST]:4,[B.PG_DECK]:24,[B.PG_LINO]:0,[B.PG_SLEEVE]:4,[IT.PG_FLEECE]:0,[IT.PG_STUFF]:40,[IT.PG_CARD]:0,
    [B.PG_SWAMP]:0,[B.PG_SATIN]:0,[B.PG_COUNTER]:0,[B.PG_MIRROR]:0,[B.PG_PINS]:0,[B.PG_TESLA]:0,[IT.PG_HANGER]:0,[IT.PG_TOMATO]:24,
    [IT.PG_SATIN]:0,[IT.PG_SHAGFUR]:0,[IT.PG_SHARD]:0,[IT.PG_SEQUIN]:0,[IT.PG_COPPER]:0,[IT.PG_PINS]:0,[IT.PG_LAMINATE]:0,[IT.PG_DOUGHBALL]:have(IT.PG_PIE)?0:3,
    [B.PG_CORD]:D2.bomber?0:16,[IT.PG_FLOPPY]:have(IT.PG_LARPPICK)?0:1,[IT.PG_FSCOOP]:0,[IT.PG_SLAPPER]:have(IT.PG_RAPIER)?0:1,[IT.PG_PSHEARS]:have(IT.PG_SNIPS)?0:1,
    [IT.PG_BAT]:D2.bigpig?0:1,[IT.PG_MITT]:D2.bigpig?0:1,[IT.PG_VMIRROR]:D2.bigpig?0:3,[IT.PG_PLASTICEYE]:0,[IT.PG_GOOGLIES]:0,[IT.PG_LARPPICK]:3};
  if(!flag('gauntlet')){K[IT.PG_PEARLS]=0;K[IT.PG_FUSE]=0;K[IT.PG_KNUCKLE]=0;}
  for(const k in N)K[k]=Math.max(K[k]||0,N[k]*2);
  return K;}
function junk(force,away){const p=V.P,dropped=[];const used=p.inv.filter(Boolean).length;if(!force&&used<30)return 0;let n=0;const K=KEEP(),NN=NEED();
  if(p.y<(Math.floor(p.z)>=-160?V.deckY(Math.floor(p.z)):30)-2&&!force)return 0;     /* never underground: it would bounce straight back */
  for(const k in K){const id=+k;for(let g=0;g<8;g++){const tot=have(id);if(tot<=K[k])break;
      const idx=p.inv.map((s,i)=>s&&s.id===id?i:-1).filter(i=>i>=0).sort((a,b)=>p.inv[a].count-p.inv[b].count)[0];if(idx==null)break;
      if(tot-p.inv[idx].count<(NN[k]||0))break;pilot.select(id);const s=V.heldStack();if(!s||s.id!==id)break;
      dropped.push(name(id)+' '+s.count);const yw=p.yaw,pt=p.pitch;p.yaw=away==='ahead'?yw:away?Math.atan2(-(p.x-away[0]),-(p.z-away[1]))+Math.PI:yw+Math.PI;p.pitch=away==='ahead'?0.05:0.42;V.p2Core().dropSel(true);pilot.frame(1);p.pitch=pt;p.yaw=yw;n++;}}
  if(n)log('dropped '+n+' stacks of spoil ('+used+' slots used): '+dropped.join(', '));return n;}
/* the Sequin dig: a staircase down to y, then a straight 1x2 tunnel, taking every exposed ore on the way, then back up */
function digFor(id,dropId,n,o){o=o||{};const t0=pilot.S.frames,maxF=Math.round((o.maxS||400)/0.04);junk(true,[V.P.x+10,V.P.z]);const top=nav.startCell();
  if(!stairDown(o.y||9,[1,0]))log('stairDown stopped at y '+Math.floor(V.P.y));const bottom=nav.startCell();
  mineFor([id],dropId,n,{r:6,y0:3,y1:Math.floor(V.P.y)+4,maxS:60});
  const dirs=[[0,1],[-1,0],[0,-1],[1,0]];let di=0;
  while(have(dropId)<n&&pilot.S.frames-t0<maxF&&di<8){tunnelFor([id],dropId,n,20,dirs[di%4]);di++;}
  /* the spoil stays down here: thrown on along the tunnel, then we walk back the other way */
  {const p=V.P,t=dirs[(di+3)%4];p.yaw=Math.atan2(-t[0],-t[1]);junk(true,'ahead');}
  log('dug '+have(dropId)+' '+name(dropId)+'; back up');nav.go(bottom,{maxS:60,tries:3});if(!nav.go(top,{maxS:90,tries:3}))climbOut(top[0],top[2]);
  {const b=V.mwSpots('boothSpawn')[1];junk(true,[b[0],b[2]]);}           /* the stair spoil too, thrown away from Booth 2 (where we go next) */
  return have(dropId)>=n;}
/* the Yeti follows you in the Palace: hit him in the shoes (he trips for 3 s and takes x3), keep 2.5 m off when he locks on */
function huntYeti(){const t0=pilot.S.frames;climbOut(30,52);junk(true);const S=()=>V.entities.filter(e=>!e.dead&&e.mt==='pgyeti').sort((a,b)=>dist2(a.x,a.z)-dist2(b.x,b.z))[0];
  if(!S()){const pen=V.mwSpots('pen').sort((a,b)=>dist2(a[0],a[2])-dist2(b[0],b[2]))[0];if(pen)nav.go({near:[pen[0]+0.5,pen[1],pen[2]+0.5],r:6,ry:4},{maxS:120});}
  for(let i=0;i<4500&&!S();i++)pilot.frame(1);
  let e=S();if(!e){log('no Yeti came');return false;}log('the Yeti at '+e.x.toFixed(0)+','+e.z.toFixed(0));
  const K=V.KEY,M=V.MB;let trips=0,wasTrip=false,lastHp=1e9,hpF=0,unst=0,uN=0;
  for(let i=0;i<6000&&have(IT.PG_SHAGFUR)<2;i++){const p=V.P;
    if(p.dead){K.KeyW=K.KeyS=K.KeyA=K.KeyD=false;unst=0;M.l=false;ST.deaths++;log('died to the Yeti');CT.respawn();continue;}
    if(!e.dead&&Math.hypot(e.x-p.x,e.z-p.z)>12){K.KeyW=K.KeyS=false;M.l=false;nav.go({near:[e.x,e.y,e.z],r:5,ry:4},{maxS:12,tries:1});continue;}
    if(e.dead){log('the Yeti gone: dead '+!!e.dead+' hp '+(+e.hp).toFixed(0)+' d '+Math.hypot(e.x-p.x,e.z-p.z).toFixed(0)+' drops near: '+V.entities.filter(q=>q.t==='drop'&&!q.dead&&Math.hypot(q.x-e.x,q.z-e.z)<12).map(q=>name(q.st.id)+'x'+q.st.count+'@'+q.x.toFixed(0)+','+q.y.toFixed(0)+','+q.z.toFixed(0)).join(' '));
      const fur=V.entities.find(q=>q.t==='drop'&&!q.dead&&q.st.id===IT.PG_SHAGFUR);if(fur)nav.go({near:[fur.x,Math.floor(fur.y),fur.z],r:1.5,ry:3},{maxS:90});
      nav.collect([IT.PG_SHAGFUR,IT.PG_SNEAKERS],14,{maxS:10,near:[e.x,e.y,e.z]});if(have(IT.PG_SHAGFUR)>=2)break;const n=S();if(!n){for(let k=0;k<250&&!S();k++)pilot.frame(1);if(!S())break;}e=S();continue;}
    {const n=S();if(n&&n!==e&&dist2(n.x,n.z)<dist2(e.x,e.z)-1&&!(e.trip>0))e=n;}     /* there can be two: always face the nearer one */
    const d=Math.hypot(e.x-p.x,e.z-p.z),tr=e.trip>0;if(tr&&!wasTrip)trips++;wasTrip=tr;weapon();
    p.yaw=Math.atan2(-(e.x-p.x),-(e.z-p.z));const ty=e.y+(tr?0.35:0.12);p.pitch=Math.atan2(ty-(p.y+p.eyeY),Math.max(0.3,d));
    const reach=d<3.4;
    /* watchdog (found in the browser session): a ledge or step between Dan's eye and his shoes eats every swing (the ray mines the
       block) and neither side lands a hit; after 4 s with no damage, aim at the body and close in / strafe for 1.6 s */
    if(e!==ST.swE){ST.swE=e;lastHp=+e.hp;hpF=i;}
    if(+e.hp<lastHp-0.01||tr){lastHp=+e.hp;hpF=i;}
    if(!unst&&M.l&&reach&&!tr&&i-hpF>100){unst=40;uN++;log('  yeti: no damage for 4 s at d '+d.toFixed(1)+', repositioning ('+uN+')');}
    if(unst>0){unst--;p.pitch=Math.atan2(e.y+1.0-(p.y+p.eyeY),Math.max(0.3,d));K.KeyS=false;K.KeyW=d>1.9;K.KeyA=d<=1.9&&uN%2===1;K.KeyD=d<=1.9&&uN%2===0;M.l=reach;
      pilot.frame(1);if(!unst){K.KeyA=K.KeyD=false;hpF=i;}continue;}
    const stuck=K.KeyW&&ST.lastSP&&Math.hypot(p.x-ST.lastSP[0],p.z-ST.lastSP[1])<0.01;ST.lastSP=[p.x,p.z];K.Space=!!stuck&&p.onGround;
    if(e.plock>0&&!tr){K.KeyW=false;K.KeyS=d<3.0;M.l=reach;}                       /* the 1 s lock-on: step out of his arms (he grabs inside 2.6 m) */
    else if(tr){K.KeyS=false;K.KeyW=d>2.2;M.l=reach;}                              /* flat on his face: x3 */
    else{K.KeyS=false;K.KeyW=d>2.8;M.l=reach;}                                     /* the shoes, from just outside his reach */
    if(p.hunger<=8&&!tr&&d>6){K.KeyW=K.KeyS=false;M.l=false;guard();}
    pilot.frame(1);if(VERB&&i%(+ENV.SWD||100)===0)log('  yeti ml '+M.l+' reach '+reach+' atkT '+p.atkT.toFixed(2)+' held '+(V.heldStack()&&V.heldStack().id)+' d '+d.toFixed(1)+' hp '+(+e.hp).toFixed(0)+' trip '+(e.trip||0).toFixed(1)+' lock '+(e.plock||0).toFixed(1)+' Dan hp '+p.hp);}
  K.KeyW=K.KeyS=K.KeyA=K.KeyD=false;M.l=false;pilot.frame(10);nav.collect([IT.PG_SHAGFUR,IT.PG_SNEAKERS],8,{maxS:8});log('the Yeti tripped '+trips+'x');return have(IT.PG_SHAGFUR)>=2;}
/* THE STRIKE: downhill through every arch gap, down through the apron and the pit, up the House aisle to the EXIT doors */
function escape(){const t0=pilot.S.frames;let lastT=-99;fightLog=()=>{const c=MP().clock;if(c-lastT<10)return;lastT=c;const H=V.getHNS(),S=H&&H.strike;
    log('  [strike] ph '+(S&&S.ph)+' broom z '+(S?(+S.z).toFixed(0):'-')+' Dan '+V.P.x.toFixed(0)+','+V.P.y.toFixed(0)+','+V.P.z.toFixed(0)+' hp '+V.P.hp.toFixed(0)+' cp '+(MP().strike&&MP().strike.cp)+' tries '+(MP().strike&&MP().strike.tries)+' hand '+!!(S&&S.hand));};for(let i=0;i<300&&MP().strike&&V.mpInfo().cut;i++){V.KEY.Space=i%4<2;pilot.frame(1);}V.KEY.Space=false;
  /* downhill through the arch gaps (the Traveler GO walls leave one 3-wide gap, its beacon shows where), round the Grand Staircase,
     across the Kitchen, down the Woods aisle, the apron, the pit stairs, up the House aisle. Replan whenever the walls, the Hand or the
     broom move us; never plan while airborne; when the Hand's shadow lands on us, sprint sideways out of it (it aims 1.2 s ahead) */
  const gapX=i=>{const H=V.getHNS(),S=H&&H.strike,W=S&&S.walls[i];return W?W.gx:0.5;};
  const WPS=()=>[[gapX(0),149],[15,104],[15,70],[gapX(1),39],[0.5,-10],[gapX(2),-61],[0.5,-105],[0.5,-152],[0.5,-172],[0.5,-189],[0.5,-200],[0.5,-210],[0.5,-232],[0.5,-254],[0.5,-276]];
  const next=z=>WPS().find(w=>w[1]<z-2.5)||null;
  const t1=pilot.S.frames;let boxed=0;
  while(V.getDim()==='puppet'&&MP().strike&&pilot.S.frames-t1<Math.round(420/0.04)){const p=V.P;
    if(p.dead){CT.respawn();continue;}
    const H=V.getHNS(),S=H&&H.strike,hd=S&&S.hand;
    if(hd&&hd.hst==='shadow'&&hd.at&&Math.hypot(p.x-hd.at[0],p.z-hd.at[2])<4.5){/* dodge: sideways, away from the slam point and toward the middle */
      const sx=p.x>hd.at[0]?1:-1;p.yaw=Math.atan2(-sx,0);V.KEY.KeyW=true;V.KEY.ControlLeft=true;V.KEY.Space=false;pilot.frame(1);continue;}
    if(!p.onGround){nav.release();pilot.frame(1);continue;}
    const w=next(p.z);if(!w)break;
    const z0=p.z,x0=p.x;const ok=nav.goXZ(w[0],w[1],{r:1.8,ry:14,maxS:12,tries:1});if(VERB&&Math.abs(V.P.x-x0)>8)log('  strike leg to '+w.map(v=>v.toFixed(0))+' '+ok+' moved x '+x0.toFixed(0)+'->'+V.P.x.toFixed(0)+' z '+z0.toFixed(0)+'->'+V.P.z.toFixed(0));if(Math.abs(V.P.z-z0)<0.5)pilot.frame(4);
    /* boxed in (found in the browser session: a pit or pocket the walk planner cannot leave, so every try ends at the same cell and the
       broom wins): after two goes that did not move us, climb out toward the next gap and tunnel if we must */
    if(!ok&&Math.hypot(V.P.x-x0,V.P.z-z0)<1.5&&V.P.onGround){if(++boxed>=2){boxed=0;log('  strike: boxed in at '+Math.floor(V.P.x)+','+Math.floor(V.P.y)+','+Math.floor(V.P.z)+': cutting out toward '+w.map(v=>v.toFixed(0)));
      stairUp(w[0],w[1]);nav.go({near:[w[0],V.P.y,w[1]],r:3,ry:8},{maxS:10,tries:6,dig:true});}}else boxed=0;}
  for(let t=0;t<10&&V.getDim()==='puppet';t++){const E=V.MPC.EXIT;if(!V.P.onGround){pilot.frame(1);t--;continue;}
    nav.go({near:[0,58,E.z+1.5],r:2.2,ry:2},{maxS:40,tries:2});
    for(let i=0;i<40&&V.getDim()==='puppet';i++){V.KEY.KeyW=true;V.P.yaw=0;pilot.frame(1);}V.KEY.KeyW=false;}
  pilot.frame(20);if(V.presOn())V.presClose(true);return V.getDim()==='over'&&!!MP().ticks.escape||V.getDim()==='over';}
function goBooth(i){const b=V.mwSpots('boothSpawn')[i];return nav.go({near:[b[0]+0.5,b[1],b[2]+0.5],r:2.2,ry:2},{maxS:300});}
function ladderRow(id){return V.PURG_LADDER.find(r=>r.id===id);}
function ticked(id){const r=ladderRow(id);return !!(r&&r.done(V.mpLadderState()));}
/* put on every armour piece we carry: look up (a right-click on a station in reach would open it), right-click with each */
function wear(){const p=V.P;for(const s of p.inv.slice()){if(!s||!D[s.id]||!D[s.id].armor)continue;const sl=D[s.id].armor.s;if(p.armor[sl])continue;
    pilot.select(s.id);const pt=p.pitch;p.pitch=1.35;V.MB.r=true;pilot.frame(1);V.MB.r=false;pilot.frame(2);p.pitch=pt;}
  if(V.pgCore().MODAL.kind){log('closing a stray '+V.pgCore().MODAL.kind+' panel');V.closeModal(true);pilot.frame(1);}}

/* ---------------------------------------------------------------- the route ------------------------------------------------- */
const ROUTE=[
  ['read',()=>{if(!pilot.select(IT.PG_PROGRAMME))return false;pilot.use();V.pguClose(true);return !!MP().ticks.read;}],
  ['apron',()=>{const A=MPC.APRON;pilot.lookAt(0.5,V.P.y+1.6,(A.z0+A.z1)/2);pilot.frame(12);return !!MP().ticks.apron;}],
  ['beacon',()=>{pilot.lookAt(0.5,74,131.5);pilot.frame(30);return !!MP().ticks.beacon;}],
  ['sleeve',()=>{for(let k=0;k<3&&(have(B.PG_SLEEVE)<12||have(IT.PG_GREASE)<4);k++)if(!fellTree())break;return have(B.PG_SLEEVE)>=4;}],
  ['forearm',()=>have(IT.PG_GREASE)>0||ticked('forearm')],
  ['felt',()=>{craft(IT.PG_FELT,Math.min(have(B.PG_SLEEVE),8));return have(IT.PG_FELT)>=12;}],
  ['rod',()=>{craft(IT.PG_ROD,5);return have(IT.PG_ROD)>=8;}],
  ['floppy',()=>craft(IT.PG_FLOPPY)],
  ['shears',()=>craft(IT.PG_PSHEARS)],
  ['slapper',()=>craft(IT.PG_SLAPPER)],
  ['foam',()=>mineFor([B.PG_FOAM],IT.PG_FOAMCHUNK,6,{r:30})],
  ['larp',()=>{if(!craft(IT.PG_LARPPICK))return false;mineFor([B.PG_FOAM],IT.PG_FOAMCHUNK,32,{r:30,maxS:240});return true;}],
  ['armhole',()=>{const p=V.P;let hs=[];for(let x=-96;x<=96;x+=16)for(let z=-160;z<=-48;z+=16)for(const a of V.mwArmHoles(Math.floor(x/16),Math.floor(z/16)))hs.push(a);
    hs=hs.filter(a=>V.getBlock(a.x,a.y,a.z)===B.PG_ARMHOLE).sort((a,b)=>dist2(a.x,a.z)-dist2(b.x,b.z));
    for(const a of hs.slice(0,3)){log('arm hole '+a.id+' ('+a.kind+')');if(nav.reachMine(a.x,a.y,a.z,{r:4})&&MP().ticks.armhole)return true;}return !!MP().ticks.armhole;}],
  ['lamp',()=>{if(!have(IT.PG_PLASTICEYE))fellTree();craft(B.PG_LAMP,Math.min(2,have(IT.PG_PLASTICEYE)));return have(B.PG_LAMP)>0;}],
  ['bat',()=>craft(IT.PG_BAT)],
  /* the Kitchen: Booth 1 unlocks on the way in */
  ['hotplate',()=>{if(!goBooth(0))return false;
    /* Laminate from the mesa walls; never a sink drain's ledge (the only way back up) or the Cook's counter */
    const okC=b=>!V.MPC.DRAINS.some(d=>Math.hypot(b.x+0.5-d[0]-0.5,b.z+0.5-d[1]-0.5)<6)&&!(HUT&&b.x>=HUT.x0-3&&b.x<=HUT.x1+4&&b.z>=HUT.z0-3&&b.z<=HUT.z1+4);
    if(HUT===null)HUT=(V.mwKitchenHut&&V.mwKitchenHut())||false;
    if(!mineFor([B.PG_COUNTER],IT.PG_LAMINATE,9,{r:40,y0:34,y1:60,maxS:240,ok:okC}))return false;
    if(!have(IT.PG_COIL)){const bs=nav.findBlocks([B.PG_BURNER],80,{y0:30,y1:62,load:true}).filter(b=>nav.exposed(b));
      for(const b of bs.slice(0,6)){let pl=!!nav.plan(nav.reachGoal(b.x,b.y,b.z,4.2),{max:60000});
        if(!pl){/* a Burner up on a mesa top: walk to the foot of the mesa and cut a staircase up its side (no Dough bounce in the pilot) */
          if(nav.go({near:[b.x+0.5,b.y-8,b.z+0.5],r:7,ry:10},{maxS:120,tries:3})&&stairUp(b.x,b.z,b.y+1))pl=!!nav.plan(nav.reachGoal(b.x,b.y,b.z,4.2),{max:30000});}
        if(!pl&&!V.MPC.DRAINS.some(d=>Math.hypot(b.x-d[0],b.z-d[1])<10)){/* still cut off (found in the browser session: the step path up had been
           mined away): walk to the closest cell, tunnel toward the Burner, then cut stairs up to it. Never near a drain (its ledge is the way out) */
          nav.go({near:[b.x+0.5,b.y+1,b.z+0.5],r:3,ry:6},{maxS:120,tries:14,dig:true});
          pl=!!nav.plan(nav.reachGoal(b.x,b.y,b.z,4.2),{max:30000});
          if(!pl&&V.P.y<b.y-1&&stairUp(b.x,b.z,b.y+1))pl=!!nav.plan(nav.reachGoal(b.x,b.y,b.z,4.2),{max:30000});}
        /* mine it from right beside it: the magnet takes the coil before it can land on the next coil (and before a bot can) */
        const r=pl&&(nav.reachMine(b.x,b.y,b.z,{maxS:60,r:2.3})||nav.reachMine(b.x,b.y,b.z,{maxS:90}));
        /* the coil usually lands on the next Burner and sizzles for 4 s before it pops off: wait for it */
        if(r)nav.go({near:[b.x+0.5,b.y+1,b.z+0.5],r:1.7,ry:2,ok:(x,y,z)=>V.getBlock(x,y-1,z)!==B.PG_BURNER},{maxS:8,tries:2});   /* be the nearest player when it pops */
        for(let i=0;r&&i<220&&!have(IT.PG_COIL);i++){pilot.frame(1);if(i%20===19)nav.collect([IT.PG_COIL],8,{maxS:1.5});}
        if(r&&!have(IT.PG_COIL)){/* the pop threw it up onto a step out of the magnet's reach (found in the browser session): stand under it, pillar up */
          const c=V.entities.find(q=>q.t==='drop'&&!q.dead&&q.st.id===IT.PG_COIL&&Math.hypot(q.x-V.P.x,q.z-V.P.z)<6&&q.y>V.P.y+1.2),blk=[B.PG_DECK,B.PG_SLEEVE,B.PG_FOAM].find(id=>have(id));
          if(c&&blk){log('coil up a step at y '+c.y.toFixed(1)+': pillar up');nav.go({near:[c.x,V.P.y,c.z],r:1.3,ry:1},{maxS:6,tries:2});
            for(let k=0;k<3&&!c.dead&&c.y>V.P.y+1.2;k++)if(!pillarUp(blk))break;for(let i=0;i<40&&!c.dead;i++)pilot.frame(1);nav.collect([IT.PG_COIL],8,{maxS:3});}}
        log('burner '+b.x+','+b.y+','+b.z+' plan '+pl+' mined '+r+' coil '+have(IT.PG_COIL));if(have(IT.PG_COIL))break;}
      if(!have(IT.PG_COIL))return false;}
    return craft(B.PG_HOTPLATE);}],
  /* Wire Ore lines the sink drains: down the ledge, mine the walls */
  ['wire',()=>{const dm=V.mwSpots('drainMouth'),dr=V.MPC.DRAINS;const order=dr.map((d,i)=>i).sort((a,b)=>dist2(dr[a][0],dr[a][1])-dist2(dr[b][0],dr[b][1]));
    for(const k of order){if(have(IT.PG_HANGER)>=19)break;const [cx,cz]=dr[k];log('drain '+k+' at '+cx+','+cz);
      if(!nav.go({near:[dm[k][0]+0.5,dm[k][1],dm[k][2]+0.5],r:3,ry:3},{maxS:200}))continue;
      mineFor([B.PG_WIREORE],IT.PG_HANGER,21,{cx,cz,r:7,y0:12,y1:44,yw:0.6,maxS:420});
      /* hangers that fell down the shaft: sweep the Stuffing floor */
      if(V.entities.some(e=>e.t==='drop'&&!e.dead&&e.st.id===IT.PG_HANGER&&Math.hypot(e.x-cx-0.5,e.z-cz-0.5)<5)){nav.go({near:[cx+0.5,16,cz+0.5],r:1.5,ry:2},{maxS:40});nav.collect([IT.PG_HANGER],7,{maxS:12,dy:30});}
      /* back up the ledge to the mouth (a wire pocket can be a dead end: then dig a staircase) */
      if(!nav.go({near:[dm[k][0]+0.5,dm[k][1],dm[k][2]+0.5],r:2.5,ry:2},{maxS:90,tries:4}))climbOut(dm[k][0],dm[k][2]);}
    return have(IT.PG_HANGER)>=16;}],
  /* the Hot Plate cooks while we work: load it here, fetch Dough, come back */
  ['hpload',()=>{climbOut(V.P.x,V.P.z+4);goBooth(0);HP=placeNear(B.PG_HOTPLATE);if(!HP){log('could not place the Hot Plate');return false;}return hpLoad(HP,IT.PG_HANGER,IT.PG_STUFF);}],
  ['dough',()=>{const t=nav.findBlocks([B.PG_DOUGH],120,{y0:30,y1:62,load:true}).filter(b=>nav.exposed(b));
    for(const b of t.slice(0,12)){if(have(IT.PG_DOUGHBALL)>=12)break;nav.reachMine(b.x,b.y,b.z,{maxS:90});}return true;}],
  ['smelt',()=>{if(!HP)return false;nav.go(nav.reachGoal(HP[0],HP[1],HP[2],3.4),{maxS:150});
    const be=V.blockEnts.get(V.pgCore().bkey(HP[0],HP[1],HP[2]));const lim=Math.max(5000,(be&&be.in?be.in.count:0)*260+500);
    for(let i=0;i<lim&&be&&be.in&&(be.fuel||be.burn>0);i++)pilot.frame(1);
    const n=hpTake(HP,IT.PG_WIRE);log('took '+n+' wire'+(be&&be.in?' ('+be.in.count+' still in, fuel '+(be.fuel?be.fuel.count:0)+')':''));pilot.frame(4);
    return !!MP().ticks.smelt&&have(IT.PG_WIRE)>=3;}],
  ['snips',()=>craft(IT.PG_SNIPS)],
  ['rapier',()=>craft(IT.PG_RAPIER)],
  ['hpick',()=>craft(IT.PG_HPICK)],
  ['cord',()=>{craft(B.PG_CORD,2);return have(B.PG_CORD)>=8;}],
  ['fpad',()=>{for(const id of [IT.PG_FPAD_C,IT.PG_FPAD_L,IT.PG_FPAD_H,IT.PG_FPAD_B])if(canCraft(id))craft(id);wear();return true;}],
  ['pie',()=>{if(have(IT.PG_DOUGHBALL)>=3&&have(IT.PG_STUFF)>=1)craft(IT.PG_PIE);
    /* the rest of the Dough goes in the Hot Plate: Cook Flatbread for the long fights, picked up on the way to Arch 2 */
    if(HP&&have(IT.PG_DOUGHBALL)>0)hpLoad(HP,IT.PG_DOUGHBALL,IT.PG_STUFF);return true;}],
  ['bomber',()=>{if(!BS||!BS.bomber)return 'pending';const A=V.hnA(),c=A.dnp.c;wear();
    const at=nav.go({near:[c[0]+0.5,V.MPC.UMARK.bomber[1],c[1]-1.3],r:1.4,ry:3},{maxS:300});
    log('at DO NOT PUSH: '+at+' P '+V.P.x.toFixed(1)+','+V.P.y.toFixed(1)+','+V.P.z.toFixed(1)+' button '+c[0]+','+c[1]+' prop '+!!V.hnProp('bomber','dnp'));if(!at)return false;
    {const H=V.getHNH&&V.getHNH();log('pre-summon: demoT '+(H&&H.demoT)+' demoDone '+(H&&H.demoDone)+' snips '+have(IT.PG_SNIPS)+' cut '+V.mpInfo().cut+' modal '+V.pgCore().MODAL.kind+' pgu '+V.pguOn());}
    const r=(watchFight('bomber'),BS.bomber(V,pilot,{mode:MODE,log}));const f=V.getMPF().fight;log('bomber script -> '+r+' fight '+(f?f.name+' ph '+f.phase+(f.over?' over':''):'none')+' dead '+MP().dead.bomber);
    return r===true&&!!MP().dead.bomber;}],
  /* Plane 3: the purple traveler burns open as we walk up to it; Booth 2 */
  ['arch2',()=>{if(HP&&V.blockEnts.get(V.pgCore().bkey(HP[0],HP[1],HP[2]))){const n=hpTake(HP,IT.PG_FLATBREAD);log('took '+n+' Flatbread');}return openArch(2);}],
  ['bench',()=>{if(!mineFor([B.PG_TESLA],IT.PG_COPPER,4,{r:44,y0:38,y1:52,maxS:300}))return false;goBooth(1);return craft(B.PG_BENCH);}],
  ['satin',()=>mineFor([B.PG_SATIN],IT.PG_SATIN,2,{r:40,y0:36,y1:56,maxS:120})],
  ['shard',()=>mineFor([B.PG_MIRROR],IT.PG_SHARD,8,{r:50,y0:38,y1:58,maxS:200})],
  ['sequin',()=>{goBooth(1);if(have(IT.PG_FOAMCHUNK)<6)mineFor([B.PG_FOAM],IT.PG_FOAMCHUNK,8,{r:20,maxS:60});craft(IT.PG_LARPPICK,2);log('LARP picks: '+have(IT.PG_LARPPICK));return digFor(B.PG_SEQORE,IT.PG_SEQUIN,6,{y:9,maxS:420});}],
  ['shag',()=>huntYeti()],
  ['labbench',()=>{goBooth(1);const b=placeNear(B.PG_BENCH);if(!b)return false;LAB=b;pilot.frame(40);return true;}],
  ['mitt',()=>craft(IT.PG_MITT,1,{at:LAB})],
  ['mirror',()=>{craft(IT.PG_VMIRROR,Math.min(2,Math.floor(have(IT.PG_SHARD)/4)),{at:LAB});return have(IT.PG_VMIRROR)>0;}],
  ['bigpig',()=>{if(!BS||!BS.bigpig)return 'pending';const A=V.hnA();wear();if(V.getMP().dead.bigpig)return true;
    if(!nav.go({near:[0.5,V.deckY(A.rope-3)+1,A.rope-3],r:2.5,ry:8},{maxS:300}))return false;
    const r=(watchFight('bigpig'),BS.bigpig(V,pilot,{mode:MODE,log}));log('bigpig script -> '+r+' dead '+MP().dead.bigpig);return r===true&&!!MP().dead.bigpig;}],
  /* Plane 4: the green traveler slides open; Booth 3 has its own Lab Bench and the Lab Rat */
  ['arch3',()=>openArch(3)],
  ['pins',()=>mineFor([B.PG_PINS],IT.PG_PINS,7,{r:70,y0:30,y1:62,maxS:300,load:true})],
  ['staple',()=>{goBooth(2);return craft(IT.PG_STAPLER,1);}],
  ['staples',()=>{craft(IT.PG_STAPLES,Math.min(2,Math.floor(have(IT.PG_PINS)/2)));return have(IT.PG_STAPLES)>0;}],
  ['fly',()=>{craft(IT.PG_FLY,Math.min(3,have(IT.PG_GOOGLIES),have(IT.PG_FELT)));return true;}],
  ['bigfrog',()=>{if(!BS||!BS.bigfrog)return 'pending';wear();const A=V.hnA();
    const u=V.mpUmarkPos('bigfrog');                                            /* the Understudy Mark at the clearing's edge, as P4's harness starts */
    if(!nav.go({near:[u[0]+0.5,u[1],u[2]+0.5],r:1.2,ry:3},{maxS:300})){log('could not reach the Frog Understudy Mark '+u.join(','));return false;}
    {const hs=()=>V.hnState&&V.hnState();let w=0;for(;w<2600&&hs()&&hs().inter;w++)pilot.frame(1);if(w)log('waited '+(w*0.04).toFixed(0)+' s of Intermission');}   /* no headliner starts during Intermission */
    const r=(watchFight('bigfrog'),BS.bigfrog(V,pilot,{mode:MODE,log,escape:hollowOut,maxS:1000}));log('bigfrog script -> '+r+' dead '+MP().dead.bigfrog+' strike '+!!MP().strike);return r===true&&!!MP().dead.bigfrog;}],
  ['elbow',()=>!!MP().ticks.elbow],
  ['escape',()=>escape()],
];

function begin(name){budgetEnd=pilot.S.frames+Math.round((LEG_BUDGET[name]||480)/0.04);
  /* stranded below the deck with nowhere to walk (a pit we dug, a pocket we fell into): dig back up before the leg starts */
  const surfAt=(x,z)=>z>=-160?V.deckY(z)+1:Math.min(60,V.mpSurf(x,z))+1;
  if(V.getDim()==='puppet'&&!MP().strike&&V.P.y<surfY()-1.5){   /* 2 deep is already a trap (jump 1.25): found in the browser session */
    const reach=nav.plan((x,y,z)=>y>=surfAt(x,z)-1,{max:20000});if(!reach){log('stranded at y '+Math.floor(V.P.y)+': climbing out');stairUp(V.P.x+4,V.P.z);}}}
function end(){budgetEnd=Infinity;fightLog=null;nav.release();}
return {ROUTE,ST,DMG,LEG_BUDGET,begin,end,invStr,have,name,junk,wear,scripted,CT};}
if(typeof module!=='undefined'&&module.exports)module.exports=makeRoute;else root.makeRoute=makeRoute;
})(typeof window!=='undefined'?window:globalThis);
