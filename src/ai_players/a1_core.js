
/* ===================================================================== */
/* PART 53 — AI PLAYERS: three free-willed players share your world (5.9) */
/* ===================================================================== */
/* Bodies are mobs (t:'mob', mt:'bot') so every weapon in the game already
   hits them; their real state lives in AGENTS (saved with the world). The
   minds run on Claude through a local server (brain/dingle-brain.mjs) that
   holds the API key — the page never sees a key. Without that server they
   play on a simple built-in autopilot. */
const AG_ORDER=['BunkerBrad','xx_lilcreepah_xx','honeybee_mc'];
const AG_DEF={
  BunkerBrad:{short:'brad',skin:0xd2a07a,shirt:0x56633a,pants:0x4b3a28,shoe:0x2a2a20,hat:'helmet',
    cps:5.4,typo:0.04,tempo:2.3,fleeHp:11,aggr:0.25,courage:0.2,social:0.25,forgive:0.15,paranoia:0.95,
    aff0:-10,trust0:8},
  xx_lilcreepah_xx:{short:'creep',skin:0xe8b88f,shirt:0x4fa84a,pants:0x2c3a2c,shoe:0x1e1e1e,hat:'hood',
    cps:8.4,typo:0.1,tempo:3.0,fleeHp:4,aggr:0.9,courage:0.85,social:0.75,forgive:0.5,paranoia:0.1,
    aff0:5,trust0:25},
  honeybee_mc:{short:'bee',skin:0xf2c9a6,shirt:0xf2c12e,pants:0x3d3550,shoe:0x5a3a2a,hat:'antennae',
    cps:6.6,typo:0.03,tempo:2.5,fleeHp:9,aggr:0.04,courage:0.3,social:0.95,forgive:0.95,paranoia:0.05,
    aff0:25,trust0:55},
};
const AGENTS=[];
var AG_T=0;                 /* agent clock, game seconds */
var AG_ACTIVE=false;        /* GR.bots on and the roster is in this world */
var HIT_BY=null;            /* who the next hurtMob() is from */
var ACTOR=null;             /* who is changing blocks right now */
var LASTDMG={by:null,how:null,t:-99};
var SNDMUL=1;
var AG_EPOCH=1;             /* bumps on reset/load so late brain replies are dropped */
MOBT.bot={hp:20,hw:0.3,h:1.8,spd:1,body:'#d9822b',legc:'#34343a'};

function agByName(n){if(!n)return null;const l=(''+n).toLowerCase();
  for(const a of AGENTS)if(a.name.toLowerCase()===l)return a;
  for(const a of AGENTS)if(AG_DEF[a.name].short===l||a.name.toLowerCase().startsWith(l))return a;
  return null;}
function agNew(name,x,y,z){
  return {name,dim:'over',x,y,z,yaw:Math.random()*6.28,pitch:0,hp:20,air:10,
    inv:Array(36).fill(null),armor:[null,null,null,null],sel:0,spawn:[x,y,z],home:null,
    dead:false,deadT:0,online:true,rel:{},mem:[],ev:[],proj:null,projHist:[],flowers:[],
    thoughts:[],stats:{k:0,d:0,placed:0,broke:0},mood:60,base:null,
    e:null,q:[],sk:null,rx:null,pf:null,typing:[],heard:[],notes:[],bs:null,
    ctl:{mx:0,mz:0,spd:0,jump:false,sneak:false},look:null,swing:0,stuckT:0,lastHurtT:-99,
    lastHurtBy:null,regenT:0,airT:0,fallD:0,lavaAcc:0,act:null,
    hunger:20,exh:0,starveT:0,lastDeath:null,     /* Dan's hunger rules: heal only when fed, moving makes you hungry */
    led:{got:{},used:{},src:{}}};   /* item ledger (session only): every gain has a source, nothing appears for free */
}
function agRel(a,who){
  let r=a.rel[who];
  if(!r){const D=AG_DEF[a.name];
    r=a.rel[who]={aff:D.aff0,trust:D.trust0,host:0,ally:false,war:false,truceT:0,
      hits:0,kills:0,deaths:0,grief:0,gifts:0,stole:0};}
  return r;
}
function agDist(a,x,z){return Math.hypot(a.x-x,a.z-z);}
function dir8(dx,dz){const dirs=['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(((Math.atan2(dx,-dz)/Math.PI*180+360)%360)/45)%8];}
function agHas(a,id){return invCount(a.inv,id);}
/* every item an agent owns comes through here, tagged with where it came from */
function agLed(a,k,id,n,src){
  const L=a.led||(a.led={got:{},used:{},src:{}});
  L[k][id]=(L[k][id]||0)+n;
  if(k==='got'){const s=src||'other';L.src[s]=(L.src[s]||0)+n;}
}
function agGive(a,st,src){
  if(!st||st.count<=0)return 0;
  if(crBotNo(st))return st.count;
  if(mgBotNo(st))return st.count;
  const c=st.count,left=invAddTo(a.inv,{...st}),n=c-left;
  if(n>0)agLed(a,'got',st.id,n,src);
  return left;
}
/* give, and whatever doesn't fit lands on the ground (like a full inventory does for Dan) */
function agGiveOrDrop(a,st,src,x,y,z){
  const left=agGive(a,st,src);
  if(left>0){spawnDrop(x,y,z,{...st,count:left},(Math.random()-0.5)*1.5,2.2,(Math.random()-0.5)*1.5);a.fullT=AG_T;}
  return left;
}
function agConsume(a,id,n){
  const m=Math.min(invCount(a.inv,id),n);
  if(m>0){invConsume(a.inv,id,m);agLed(a,'used',id,m);}
  return m===n;
}
/* take real stacks out of the inventory (durability and enchantments ride along) */
function agTake(a,id,n){
  const out=[];
  for(let i=0;i<a.inv.length&&n>0;i++){const s=a.inv[i];if(!s||s.id!==id)continue;
    const mv=Math.min(s.count,n),piece={id:s.id,count:mv};
    if(s.dur!=null)piece.dur=s.dur;if(s.ench)piece.ench={...s.ench};
    out.push(piece);s.count-=mv;n-=mv;if(s.count<=0)a.inv[i]=null;agLed(a,'used',id,mv);}
  return out;
}
/* room for at least one more of id? */
function agRoomFor(a,id){
  const mx=stackMax(id);
  for(const s of a.inv){if(!s)return true;if(s.id===id&&s.dur==null&&s.count<mx)return true;}
  return false;
}
function agFreeSlots(a){let n=0;for(const s of a.inv)if(!s)n++;return n;}
function agOnlineInDim(){return AGENTS.filter(a=>a.online&&a.dim===DIM);}
/* does an item stack match a loose name ("iron", "iron ingots", "cobble")? */
function agNameIs(id,name){
  if(name==null||!DEFS[id])return false;
  const n=DEFS[id].name.toLowerCase(),l=(''+name).toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim().replace(/s$/,'');
  if(!l)return false;
  return n===l||n.replace(/s$/,'')===l||n.includes(l)||(l==='cobble'&&id===B.COBBLE);
}
function agSees(a,x,y,z){
  const e=a.e;if(!e)return false;
  const ex=e.x,ey=e.y+1.62,ez=e.z;
  const dx=x-ex,dy=y-ey,dz=z-ez,ds=Math.hypot(dx,dy,dz);
  if(ds<0.5)return true;
  const hit=raycastB(ex,ey,ez,dx/ds,dy/ds,dz/ds,ds-0.3);
  return !hit;
}
function danSees(x,y,z){
  if(!P||P.dead)return false;
  const ep=eyePos(),dx=x-ep[0],dy=y-ep[1],dz=z-ep[2],ds=Math.hypot(dx,dy,dz);
  if(ds>RD*16)return false;
  const l=lookDir();
  if((dx*l[0]+dy*l[1]+dz*l[2])/(ds||1)<0.35)return false;
  return !raycastB(ep[0],ep[1],ep[2],dx/ds,dy/ds,dz/ds,Math.max(0,ds-0.6));
}

/* ----- bodies ----- */
function agHumanoid(D){
  const G=new THREE.Group(),mats=[];
  const mat=c=>{const m=new THREE.MeshLambertMaterial({color:c});mats.push(m);return m;};
  const skin=mat(D.skin),shirt=mat(D.shirt),pants=mat(D.pants),shoe=mat(D.shoe);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),skin);head.position.y=1.62;G.add(head);
  const eyeM=mat(0x22202a);
  for(const sx of[-1,1]){const e2=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.08,0.02),eyeM);
    e2.position.set(sx*0.11,0.04,-0.26);head.add(e2);}
  if(D.hat==='helmet'){const hm=mat(0x3d4a26);
    const h=new THREE.Mesh(new THREE.BoxGeometry(0.58,0.2,0.58),hm);h.position.y=0.22;head.add(h);
    const br=new THREE.Mesh(new THREE.BoxGeometry(0.66,0.05,0.66),hm);br.position.y=0.12;head.add(br);}
  else if(D.hat==='hood'){const hm=mat(0x2f7a2c);
    const h=new THREE.Mesh(new THREE.BoxGeometry(0.56,0.56,0.3),hm);h.position.set(0,0.03,0.14);head.add(h);
    const t=new THREE.Mesh(new THREE.BoxGeometry(0.56,0.1,0.56),hm);t.position.y=0.28;head.add(t);
    const f=mat(0x1b1b1b);for(const p of[[-0.1,0.02],[0.1,0.02]]){
      const q=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.09,0.02),f);q.position.set(p[0],p[1]+0.27,-0.29);head.add(q);}
    const tw=mat(0xf2f2ea);for(let i=0;i<5;i++){         /* a white zig-zag of teeth under the eyes */
      const q=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.04,0.02),tw);q.position.set(-0.12+i*0.06,(i%2?-0.12:-0.08)+0.27,-0.29);head.add(q);}}
  else if(D.hat==='antennae'){const am=mat(0x222222),tip=mat(0xffd23a);
    for(const sx of[-1,1]){const s=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.3,0.04),am);
      s.position.set(sx*0.13,0.38,0);s.rotation.z=-sx*0.25;head.add(s);
      const t=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.09,0.09),tip);t.position.set(sx*0.17,0.54,0);head.add(t);}}
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.72,0.27),shirt);body.position.y=1.0;G.add(body);
  if(D.hat==='antennae'){const st=mat(0x2b2b2b);
    for(const y of[0.82,1.06]){const s=new THREE.Mesh(new THREE.BoxGeometry(0.51,0.09,0.28),st);s.position.y=y;G.add(s);}}
  const limb=(m,w,h)=>{const piv=new THREE.Group();const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),m);
    me.position.y=-h/2;piv.add(me);G.add(piv);return piv;};
  const aL=limb(shirt,0.18,0.66),aR=limb(shirt,0.18,0.66);
  aL.position.set(-0.34,1.32,0);aR.position.set(0.34,1.32,0);
  const lL=limb(pants,0.21,0.66),lR=limb(pants,0.21,0.66);
  lL.position.set(-0.13,0.66,0);lR.position.set(0.13,0.66,0);
  for(const sx of[-1,1]){const s=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.1,0.26),shoe);
    s.position.set(sx*0.13,0.05,-0.02);G.add(s);}
  return {G,head,aL,aR,lL,lR,mats};
}
function agTag(name){
  const c=document.createElement('canvas');c.width=320;c.height=56;
  const g=c.getContext('2d');
  g.font='bold 30px monospace';
  const w=Math.min(316,(g.measureText(name).width||name.length*18)+20);
  g.fillStyle='rgba(0,0,0,0.42)';g.fillRect((320-w)/2,6,w,44);
  g.fillStyle='#ffffff';g.textAlign='center';g.textBaseline='middle';g.fillText(name,160,29);
  const tx=new THREE.CanvasTexture(c);
  const m=new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false});
  const s=new THREE.Sprite(m);s.scale.set(2.2,0.385,1);s.position.y=2.28;s.renderOrder=20;
  return s;
}
function agSpawnBody(a){
  const D=AG_DEF[a.name];
  const M=(HRE.on&&hrBotBody(a))||agHumanoid(D);
  M.tag=agTag(a.name);M.G.add(M.tag);
  if(M.hr)M.tag.position.y=2.62;else shadowify(M.G);
  scene.add(M.G);
  const e={t:'mob',mob:true,bot:true,mt:'bot',A:a,name:a.name,hp:a.hp,hw:0.3,h:1.8,hostile:false,
    x:a.x,y:a.y,z:a.z,vx:0,vy:0,vz:0,onGround:false,yaw:a.yaw,pitch:0,
    mode:'bot',tT:0,dir:0,atkT:0,hurtT:0,burnAcc:0,fuse:0,mesh:M.G,legs:[],mats:M.mats,M,hrM:M.hrM||null,anim:0};
  entities.push(e);a.e=e;
  return e;
}
function agDropBody(a){if(a.e){removeEnt(a.e);a.e=null;}}
function agSyncFromBody(a){const e=a.e;if(!e)return;a.x=e.x;a.y=e.y;a.z=e.z;a.yaw=e.yaw;e.hp=a.hp;}

/* positional sound: quieter with distance, silent past 30 blocks */
function playSAt(n,x,y,z){
  if(!P)return;
  const d=Math.hypot(x-P.x,y-P.y,z-P.z);
  if(d>30)return;
  SNDMUL=Math.pow(1-d/30,1.4);
  try{playS(n);}finally{SNDMUL=1;}
}

/* ----- chat log (server chat) ----- */
const CHAT=[];   /* {t,txt,k:'chat'|'sys'|'whisper'|'death'|'me',from,to} */
var chatOpen=false,tabHeld=false;
let _chatDirty=true,_lastWhisperFrom=null;
function chatPush(m){
  m.t=performance.now();m.gt=AG_T;CHAT.push(m);
  if(CHAT.length>120)CHAT.splice(0,CHAT.length-120);
  _chatDirty=true;
}
function sysMsg(txt){chatPush({k:'sys',txt});}
function chatLine(from,txt,to,whisper){
  chatPush({k:whisper?'whisper':'chat',from,txt,to:to||null});
  agHear(from,txt,to||null,!!whisper);
}
