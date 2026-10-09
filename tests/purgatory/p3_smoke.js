/* p3_smoke.js (P3, gate x2): the puppets (the purgatory build plan section 5.3, the audit's additions, bible 9 and 12.3).
   Every type spawns through spawnMob with its OG rig, telegraphs (the pupils lock before every hit), hurts Dan and a bot with
   the right attribution, dies with only purgatory drops and no figurine; tethers and Arm Holes; the Hands (possession in
   BLACKOUT only, the face wrap); the Comic; the Pelican's fish; the Drummer's chain and the snips; the Lab Rat splits and Tesla pops; the Yeti's
   sneakers, follow and rope; the Daredevil; the frogs; Chorus Pigs and mirrors; the Cook; the Weatherman; the Old Goats (heckles,
   splats, the knock-over); ambient caps; structure spawns from P1's sites (through test seams when P1 is on its stub);
   Felt Dan; the hen rule; the BOO; rig memory. GR.mobSpawn=false except in the spawning blocks. One boot per process. */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
global.fetch=async()=>{throw new Error('no network in tests');};
const warns=[];{const ow=console.warn;console.warn=(...a)=>{const s=a.map(String).join(' ');if(s.indexOf('[PG]')>=0)warns.push(s);else ow(...a);};}
/* rig memory counters (installed before boot: the game news these through the global THREE) */
const CNT={geo:0,mat:0,disp:0,from:1e9};
const V=boot({});
{const G0=THREE.BoxGeometry;THREE.BoxGeometry=class extends G0{constructor(...a){super(...a);CNT.geo++;}};
  const M0=THREE.MeshLambertMaterial;THREE.MeshLambertMaterial=class extends M0{constructor(...a){super(...a);this._pmN=++CNT.mat;}dispose(){if(this._pmN>CNT.from&&!this._pmD){this._pmD=1;CNT.disp++;}}};}
const step=boot.stepper(500000),C=V.pgCore(),B=V.B,IT=V.IT,MPC=V.MPC;
const MP=()=>V.getMP(),MPF=()=>V.getMPF(),PS=()=>V.getPMS();
const stubs=V.mpInfo().stubs,stub=d=>stubs.indexOf(d)>=0;
const live=mt=>V.entities.filter(e=>e.t==='mob'&&!e.dead&&e.mt===mt);
const drops=()=>V.entities.filter(e=>e.t==='drop'&&!e.dead);
const invTotal=id=>V.P.inv.reduce((a,s)=>a+(s&&s.id===id?s.count:0),0);
const have=(id,near,r)=>invTotal(id)+dropTotal(id,near,r);
const dropTotal=(id,near,r)=>drops().filter(d=>d.st.id===id&&(!near||Math.hypot(d.x-near.x,d.z-near.z)<(r||6))).reduce((a,d)=>a+d.st.count,0);
const log=()=>PS().log;
function wipe(){for(const e of V.entities){if(e.dead)continue;if((e.t==='mob'&&!e.bot&&/^pg/.test(e.mt))||e.t==='drop'||e.t==='pproj'||e.t==='xp')C.removeEnt(e);}step(1);}
function tp(x,z,y){const P=V.P;V.forceChunksNear(x,z);P.x=x+0.5;P.z=z+0.5;P.y=y!=null?y:V.mpSafeY(x+0.5,(Math.abs(x-SITE.x)<=28&&Math.abs(z-SITE.z)<=28?Y0:V.surfaceTop(x,z))+3,z+0.5);P.vx=P.vy=P.vz=0;P.fallD=0;step(25);}
function heal(){const P=V.P;if(P.dead){V.respawn();step(2);}P.hp=20;P.hunger=20;P.hurtT=0;P.mode='s';}
function at(mt,dx,dz,props){const P=V.P,x=P.x+dx,z=P.z+dz;return V.pmSpawnAt(mt,x,V.mpSafeY(x,P.y+3,z),z,props);}
function aim(x,y,z){const P=V.P,dx=x-P.x,dy=y-(P.y+P.eyeY),dz=z-P.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));}
function click(){V.MB.l=true;step(1);V.MB.l=false;step(1);}
function hold(id,n,extra){const P=V.P;P.inv[P.sel]=id?{id,count:n||1,...(extra||{})}:null;}
/* the lock->hit rule over the P3 log: every hit by `mt` came at least `min` s after a lock by the same entity */
function telegraphed(mt,min){const L=log();let hits=0,bad=0;
  for(let i=0;i<L.length;i++){const h=L[i];if(h.mt!==mt||h.k!=='hit')continue;hits++;
    let lk=null;for(let j=i-1;j>=0;j--){if(L[j].id===h.id&&L[j].k==='lock'){lk=L[j];break;}if(L[j].id===h.id&&L[j].k==='hit')break;}
    if(!lk||h.t-lk.t<min-1e-6)bad++;}
  return {hits,bad};}
function runUntil(f,max){for(let i=0;i<(max||400);i++){step(1);if(f())return i+1;}return 0;}
const SITE={x:44,z:-100};          /* the Woods, 40+ m from the Mark and the Demolitionist's apron */
const Y0=V.deckY(SITE.z),FY=()=>Y0; /* the arena's floor block y */
const NOSITES={hollowHeap:[],band:[],chef:[],coop:[],prof:[],bkr:[],pen:[],guestHook:[],trenchMouth:[],drainMouth:[],palaceSpot:[]};
function carve(cx,cz,r,y0){V.forceChunksNear(cx,cz);V.forceChunksNear(cx-r,cz-r);V.forceChunksNear(cx+r,cz+r);V.forceChunksNear(cx-r,cz+r);V.forceChunksNear(cx+r,cz-r);step(3);
  for(let x=cx-r;x<=cx+r;x++)for(let z=cz-r;z<=cz+r;z++){for(let y=y0-3;y<=y0;y++)if(V.getBlock(x,y,z)!==B.PG_DECK)V.setBlock(x,y,z,B.PG_DECK);
    for(let y=y0+1;y<=y0+20;y++)if(V.getBlock(x,y,z)!==B.AIR)V.setBlock(x,y,z,B.AIR);}step(3);}
const ALL=['pgwhat','pghollow','pghand','pgposs','pgfeltdan','pgcomic','pghen','pgpelican','pgdrummer','pgrat','pgrat2','pgrat4',
  'pgyeti','pgdare','pgfrog','pgpig','pgcook','pgprof','pgratb','pgoldgoat','pgoldergoat','pgweather'];

boot.run(async()=>{
  boot.world(V,'p3a','1337',step);
  V.setBrainMock&&V.setBrainMock((lane)=>{if(lane==='mind')return {project:{title:'x',kind:'BUILD',why:'t',steps:['wait']},announce:''};
    if(lane==='act')return {thought:'t',say:[],actions:[{skill:'wait',count:3}],relations:[],project:'continue'};return null;});
  V.mpDoorHere();step(2);V.mpEnterNow();step(30);V.GR.mobSpawn=false;
  ok('inside purgatory',V.mpInfo().dim==='puppet');
  PS().logOn=true;PS().cueO='show';PS().holesO=[];PS().spotO=Object.assign({},NOSITES);
  /* the test arena: P1's real Woods (trees, rostra, trenches) or the stub deck, flattened into one deck at Y0 */
  carve(SITE.x,SITE.z,28,Y0);

  /* ===== 1. registrations, MOBT rows, names, rigs ===== */
  {const bad=ALL.filter(mt=>!V.MOBT[mt]||!V.MOBT[mt].pmob||!V.PREG.brain[mt]||!V.PREG.mesh[mt]||!V.PM_NAMES[mt]);
    ok('all 22 P3 types have a MOBT row (pmob), a brain, an OG rig and a name'+(bad.length?' ('+bad.join(',')+')':''),bad.length===0);
    const npc=['pgcook','pgprof','pgratb','pgoldgoat','pgoldergoat','pgweather'].every(mt=>V.MOBT[mt].npc&&V.MOBT[mt].pnc);
    const st=['pgwhat','pgcomic','pgdrummer','pghollow'].every(mt=>V.MOBT[mt].struct&&V.MOBT[mt].pnc);
    const notpnc=['pghand','pgposs','pgfeltdan','pghen','pgpelican','pgrat','pgyeti','pgdare','pgfrog','pgpig'].every(mt=>!V.MOBT[mt].pnc);
    ok('NPCs are npc+pnc, tethered/structure mobs struct+pnc, the rest count in the caps',npc&&st&&notpnc);
    ok('Lab Rat Clone sizes have their own hitboxes (half, quarter)',Math.abs(V.MOBT.pgrat2.h-V.MOBT.pgrat.h/2)<0.05&&Math.abs(V.MOBT.pgrat4.h-V.MOBT.pgrat.h/4)<0.05&&V.MOBT.pgrat2.hp===9&&V.MOBT.pgrat4.hp===4.5);
    let okm=0;for(const mt of ALL){const r=V.pmMakeMesh(mt);if(r&&r.G&&Array.isArray(r.legs)&&Array.isArray(r.mats)&&r.G.children.length&&r.G.userData.pr)okm++;}
    ok('makeMobMesh(mt) builds {G,legs,mats} with the rig parts for every type ('+okm+'/22)',okm===22);
    const r=V.pmRig({kind:'arm',len:3});ok('pmRig({kind:"arm"}) gives P5 the pale arm (segments, cuff)',r.parts&&r.parts.segs.length>=5&&!!r.parts.cuff);
    const w=V.pmMakeMesh('pgwhat');ok('a puppet head has a jaw hinged at the back and the face rig',!!w.G.userData.pr.jaw&&w.G.userData.pr.jaw.position.z<0);}

  /* ===== 2. every type spawns through spawnMob in purgatory and dies with only purgatory drops, no figurine ===== */
  tp(SITE.x,SITE.z);wipe();
  {let spawned=0,parts=0,bad=[],fig=0,nonpg=0;const P=V.P;
    for(let i=0;i<ALL.length;i++){const mt=ALL[i];let e;
      if(mt==='pgwhat'||mt==='pgcomic'){const x=Math.floor(P.x)+((i%6)-3)*4,z=Math.floor(P.z)+12;V.setBlock(x,FY(z),z,B.PG_ARMHOLE);e=V.pmSpawnTether(mt==='pgcomic'?'comic':'what',x,FY(z),z);}
      else e=at(mt,((i%6)-3)*4,12+Math.floor(i/6)*4);
      if(e&&!e.dead&&e.t==='mob'&&e.mt===mt){spawned++;}else bad.push(mt);}
    step(3);
    for(const mt of ALL){const e=live(mt)[0];if(e&&e.pr&&e.mesh.userData.pr===e.pr)parts++;}
    ok('all 22 types spawn through spawnMob ('+spawned+')',spawned===22);
    ok('the brain picked up the rig parts (e.pr) on the first frame ('+parts+')',parts>=20);
    const before=drops().length;V.P.mode='c';
    for(const e of V.entities.slice()){if(e.dead||e.t!=='mob'||!/^pg/.test(e.mt)||V.MOBT[e.mt].npc)continue;V.purgHit(e,9999,'Dan','test',{force:1});}
    step(40);
    for(const d of drops()){if(d.st.id===IT.FIGURINE)fig++;else if(!(V.DEFS[d.st.id]&&V.DEFS[d.st.id].pg))nonpg++;}
    ok('every regular type died to Dan: drops are purgatory items only ('+drops().length+' drops, '+nonpg+' not purgatory)',drops().length>before&&nonpg===0);
    ok('no figurine and no ghost roll in purgatory',fig===0);
    ok('NPCs never die (the Cook, the Professor, the bench Lab Rat, Old Goat, Older Goat, the Weatherman)',['pgcook','pgprof','pgratb','pgoldgoat','pgoldergoat','pgweather'].every(mt=>live(mt).length>0));
    ok('the killer owns the extra loot for 60 s (Puppet Rod from a Blank)',drops().some(d=>d.st.id===IT.PG_ROD&&d.pown==='Dan'));
    V.P.mode='s';}
  wipe();

  /* ===== 3. telegraphs and attribution: the pupils lock first; LASTDMG names the puppet ===== */
  {heal();const P=V.P;tp(SITE.x,SITE.z);wipe();PS().log.length=0;
    const x=Math.floor(P.x)+2,z=Math.floor(P.z)+2;V.setBlock(x,FY(z),z,B.PG_ARMHOLE);const w=V.pmSpawnTether('what',x,FY(z),z);
    let saw=false,lockFirst=false;for(let i=0;i<120;i++){step(1);if(w.plock>0)saw=true;if(P.hp<20){lockFirst=saw;break;}}
    ok('a Blank locks its pupils before it bites (plock > 0 before Dan loses HP)',lockFirst);
    {const ld=V.pmLastDmg();ok('...and LASTDMG says Blank, pg:blank ('+(ld&&ld.by)+'/'+(ld&&ld.how)+')',!!ld&&ld.by==='Blank'&&ld.how==='pg:blank');}
    const t=telegraphed('pgwhat',0.55);ok('every Blank hit came >= 0.55 s after its lock ('+t.hits+' hits)',t.hits>0&&t.bad===0);
    wipe();}
  for(const [mt,min,setup] of [['pgposs',0.55,()=>{PS().cueO='blackout';}],['pgfeltdan',1.0,()=>{PS().cueO='blackout';}],['pgpelican',0.55,null],
      ['pgdrummer',0.55,null],['pgyeti',0.95,null],['pgdare',1.45,null],['pghand',0.45,()=>{PS().cueO='blackout';}],['pgfrog',0.45,null],['pgrat',0.45,null]]){
    heal();tp(SITE.x,SITE.z);wipe();PS().log.length=0;if(setup)setup();const P=V.P;let e;
    if(mt==='pgdrummer'){e=at(mt,3,4);e.stake=[e.x,e.y,e.z-3];e.kit=[e.x,e.y,e.z+1];e.seat=[e.x,e.y,e.z];}
    else if(mt==='pgfrog'){e=at(mt,2.5,2.5);hold(IT.PG_FELT,12);}
    else if(mt==='pgrat'){e=at(mt,1.5,1.5);e.grp=777;PS()['bkg777']=V.getMP().clock+60;}
    else if(mt==='pgpelican'){e=at(mt,0,8);}
    else if(mt==='pgdare'){e=at(mt,0,9);}
    else e=at(mt,1.5,2);
    runUntil(()=>log().some(l=>l.mt===mt&&l.k==='hit'),mt==='pgdare'?260:200);
    step(3);const tg=telegraphed(mt,min);
    ok(V.PM_NAMES[mt]+': every attack comes >= '+min+' s after its lock ('+tg.hits+' hits)',tg.hits>0&&tg.bad===0);
    PS().cueO='show';if(mt==='pgfrog')hold(null);}
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const e=at('pgposs',1.2,1.2);PS().cueO='blackout';
    runUntil(()=>P.hp<20,200);const ld=V.pmLastDmg();
    ok('a Possessed Hollow hit is attributed: LASTDMG {by:"Possessed Hollow", how:"pg:possessed"}',P.hp<20&&ld&&ld.by==='Possessed Hollow'&&ld.how==='pg:possessed');
    PS().cueO='show';wipe();}

  /* ===== 4. a bot is hit with the right attribution (Dan out of reach in creative) ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;V.GR.bots=true;V.agJoinAll(true);step(60);const a=V.agByName('BunkerBrad');
    if(a){a.dim='puppet';a.x=P.x+3;a.y=P.y;a.z=P.z+3;a.spawnProt=0;step(30);if(a.e){a.e.x=P.x+3;a.e.y=P.y;a.e.z=P.z+3;a.e.vx=a.e.vz=0;}a.spawnProt=0;step(3);}
    if(!a||!a.e){skip('bot attribution','no bot body inside');}
    else{P.mode='c';const relDan=JSON.stringify(a.rel&&a.rel.Dan);a.hp=20;a.lastHurtBy=null;
      const x=Math.floor(a.e.x)+2,z=Math.floor(a.e.z);V.setBlock(x,FY(z),z,B.PG_ARMHOLE);V.pmSpawnTether('what',x,FY(z),z);
      runUntil(()=>a.lastHurtBy!=null,200);
      ok('a Blank bites BunkerBrad: lastHurtBy "Blank", how "pg:blank" ('+a.lastHurtBy+'/'+a.lastHurtHow+')',a.lastHurtBy==='Blank'&&a.lastHurtHow==='pg:blank');
      ok('...and the hit is never Dan\'s (a.rel.Dan unchanged)',JSON.stringify(a.rel&&a.rel.Dan)===relDan);
      wipe();
      const fd=at('pgfeltdan',-2,2);PS().cueO='blackout';P.mode='s';const bx=P.x+3,bz=P.z+3;P.x+=40;step(30);a.hp=20;a.lastHurtBy=null;a.spawnProt=0;
      const pin=n=>{for(let i=0;i<n;i++){if(a.e){a.e.x=bx;a.e.z=bz;a.e.vx=a.e.vz=0;}a.spawnProt=0;step(1);}};   /* hold the bot still (its own autopilot would follow Dan) */
      pin(60);ok('Felt Dan ignores bots until one hits it',a.lastHurtBy!=='Felt Dan');
      V.purgHit(fd,1,'BunkerBrad','melee',{force:1});fd.atkT=0;for(let q=0;q<8&&a.lastHurtBy!=='Felt Dan';q++)pin(40);
      ok('...then it goes for that bot ('+a.lastHurtBy+')',a.lastHurtBy==='Felt Dan');
      PS().cueO='show';P.x-=40;step(10);wipe();}
    V.GR.bots=false;V.agLeaveAll();step(10);}

  /* ===== 5. tethers: reach, strain, the flinch lunge, the Arm Hole kill ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const x=Math.floor(P.x),z=Math.floor(P.z)+10,y=FY(z);V.setBlock(x,y,z,B.PG_ARMHOLE);
    const w=V.pmSpawnTether('what',x,y,z);let maxR=0,strained=false;
    for(let i=0;i<100;i++){step(1);maxR=Math.max(maxR,Math.hypot(w.x-(x+0.5),w.z-(z+0.5)));if(w.strain)strained=true;}
    ok('a Blank never gets further than its arm (6 m) from its hole ('+maxR.toFixed(2)+' m)',maxR<=6.75);
    ok('out of reach it strains (arm rigid, jaw flapping)',strained);
    ok('its arm is in the scene (a chain of skin segments to the cuff)',!!w.parmG&&w.parmG.userData.parts.segs.length===6);
    MPF().flinch=0.6;step(1);ok('the Puppeteer flinches: it lunges once at nothing',w.lungeT>0);MPF().flinch=0;step(10);
    V.setBlock(x,y,z,B.AIR);V.PREG.onBreak.forEach(f=>f(x,y,z,B.PG_ARMHOLE,'Dan'));
    ok('breaking the Arm Hole withdraws the arm (the puppet goes down with it)',w.pwd!=null);
    const wx={x:w.x,z:w.z};step(30);ok('...and the puppet dies empty, dropping its loot',w.dead&&dropTotal(IT.PG_FLEECE,wx,3)>=1);
    step(30);ok('the arm leaves the scene',!w.parmG);
    wipe();}

  /* ===== 6. the Hands: possession only in BLACKOUT, collapse at SHOW; the face wrap ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;P.mode='c';
    const h=at('pghollow',6,6);const hand=at('pghand',8,8);step(40);
    ok('in SHOW a surface Hand goes back down a hole',hand.dead&&!h.dead&&live('pgposs').length===0);
    PS().cueO='blackout';const hand2=at('pghand',8,8);runUntil(()=>live('pgposs').length>0,250);
    ok('in BLACKOUT a Hand walks into a Hollow within 16 m: a Possessed Hollow',live('pgposs').length===1&&h.dead&&hand2.dead);
    const ps=live('pgposs')[0];PS().cueO='show';step(3);
    ok('SHOW returns: the Possessed Hollow collapses where it stands, leaving its loot',ps.dead&&dropTotal(IT.PG_GREASE,ps,4)>=1&&dropTotal(IT.PG_FLEECE,ps,4)>=2);
    wipe();P.mode='s';heal();PS().cueO='blackout';
    const hw=at('pghand',2.5,0);runUntil(()=>!!PS().wrap,200);
    ok('a Hand crouches, leaps and wraps Dan\'s face',!!PS().wrap&&PS().wrap.e===hw);
    ok('...the felt overlay shows',!!PS().wrapEl&&PS().wrapEl.style.display==='block');
    const hp0=P.hp;step(52);ok('...1 damage a second while it holds on ('+hp0+'->'+P.hp+')',P.hp<=hp0-1&&P.hp>=hp0-3);
    click();step(3);click();step(3);ok('two attack presses: still on',!!PS().wrap);click();step(3);
    ok('three attack presses pull it off; the overlay clears',!PS().wrap&&PS().wrapEl.style.display==='none');
    hw.atkT=0;hw.x=P.x+2;hw.z=P.z;runUntil(()=>!!PS().wrap,200);
    const a=V.agByName('BunkerBrad');V.purgHit(hw,2,a?a.name:'BunkerBrad','melee',{force:1});step(2);
    ok('an ally\'s hit pulls it off too',!PS().wrap);
    PS().cueO='show';wipe();
    /* Performer's Sneakers squeak: in BLACKOUT a Hand out of reach follows the footprints toward Dan */
    {heal();P.mode='s';P.armor[3]={id:IT.PG_SNEAKERS,count:1};const x0=P.x,z0=P.z;for(let i=0;i<40;i++){P.x=x0;P.z=z0+i*0.5;P.vx=P.vz=0;step(1);}
      PS().cueO='blackout';const hf=V.pmSpawnAt('pghand',x0,V.mpSafeY(x0,P.y+2,z0),z0,{});const d0=Math.hypot(hf.x-P.x,hf.z-P.z);step(60);
      ok('in BLACKOUT a Hand follows the Sneakers\' footprints ('+d0.toFixed(1)+' m -> '+Math.hypot(hf.x-P.x,hf.z-P.z).toFixed(1)+' m, '+PS().prints.length+' prints)',PS().prints.length>=4&&Math.hypot(hf.x-P.x,hf.z-P.z)<d0-6);
      P.armor[3]=null;PS().cueO='show';wipe();}
    /* Hands are capped at 4 per player below deck; P1's flinch calls pmSpawnHand */
    const ux=Math.floor(P.x),uz=Math.floor(P.z),uy=FY(uz)-9;
    for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)for(let dy=0;dy<3;dy++)V.setBlock(ux+dx,uy+dy,uz+dz,B.AIR);
    P.x=ux+0.5;P.z=uz+0.5;P.y=uy;P.vx=P.vy=P.vz=0;step(5);let n=0;
    for(let i=0;i<7;i++){const e=V.pmSpawnHand(ux+3,uy,uz+3,P);if(e)n++;}
    ok('pmSpawnHand honours 4 Hands per player below deck ('+n+')',n===4);
    wipe();tp(SITE.x,SITE.z);}

  /* ===== 7. the Comic: the wrist, the routine, the stillness, the barrage; the quiet box ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const x=Math.floor(P.x)+2,z=Math.floor(P.z)+2,y=FY(z);V.setBlock(x,y,z,B.PG_ARMHOLE);
    const f=V.pmSpawnTether('comic',x,y,z);P.hunger=10;const tom0=invTotal(IT.PG_TOMATO);runUntil(()=>!!f.grab,150);
    ok('the Comic grabs the wrist of anyone in his reach',!!f.grab&&f.grab.who===P);
    P.x+=4;step(1);const d=Math.hypot(P.x-(f.x+Math.sin(f.yaw)*0.5),P.z-(f.z+Math.cos(f.yaw)*0.5));
    ok('...and holds Dan at arm\'s length (he cannot walk away: '+d.toFixed(2)+' m)',d<=1.6);
    const hp0=P.hp;let rim=false;runUntil(()=>{if(f.grab&&f.grab.rim)rim=true;return f.grab&&f.grab.bar;},200);
    ok('the whole routine (5 s), a rimshot, a beat of stillness, then the barrage',rim&&f.grab&&f.grab.bar);
    step(60);const tomN=have(IT.PG_TOMATO,f,8)-tom0;ok('3-5 Heckle Tomatoes land on both of them (Dan took damage, they land as food) [hp '+hp0+'->'+P.hp+', tomatoes '+tomN+']',P.hp<hp0&&tomN>=2);
    ok('...then he lets go and waits 90 s',!f.grab&&f.cd>MP().clock+80);
    f.cd=0;MP().quiet=MP().clock+180;heal();P.hunger=10;runUntil(()=>!!f.grab,150);const tm0=have(IT.PG_TOMATO,f,8);
    runUntil(()=>!f.grab,300);step(40);ok('with the box knocked quiet nothing lands and he lets go in the silence',have(IT.PG_TOMATO,f,8)===tm0&&P.hp===20);
    MP().quiet=0;wipe();}

  /* ===== 8. the Pelican: the fish comes back and hits the Pelican; a batted fish knocks him over ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const L=at('pgpelican',0,8);L.thrT=0.2;
    runUntil(()=>(L.fishes||[]).length>0,200);const fish=(L.fishes||[])[0];
    ok('the Pelican throws a Homing Herring (telegraphed)',!!fish&&telegraphed('pgpelican',0.55).bad===0);
    P.x+=12;P.z-=4;const hp0=L.hp;runUntil(()=>L.hp<hp0,200);
    ok('the return misses Dan, so it hits the Pelican (6, staggered)',L.hp===hp0-6&&L.stag>0);
    P.x-=12;P.z+=4;step(20);heal();L.stag=0;L.hp=20;L.hurtT=0;
    const f2=V.puSpawn('fish',P.x,P.y+1.4,P.z,0,0,0,'Dan',{batted:1,straight:40,g:0});const dx=L.x-P.x,dz=L.z-P.z,dd=Math.hypot(dx,dz);
    f2.vx=dx/dd*18;f2.vz=dz/dd*18;f2.vy=((L.y+1)-(P.y+1.4))/dd*18;runUntil(()=>L.hp<20,60);
    ok('Foam-Bat the fish and it flies into the Pelican: 6 and knocked over',L.hp===14&&L.down>0);
    wipe();}

  /* ===== 9. the Drummer: the chain snaps him off his feet; Wire Snips on the stake: berserk, then asleep ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const sx=P.x,sz=P.z+12,sy=V.mpSafeY(sx,P.y+2,sz);
    const A=V.pmSpawnAt('pgdrummer',sx,sy,sz+1,{stake:[sx,sy,sz],kit:[sx,sy,sz+2],seat:[sx,sy,sz+1],room:0});
    step(10);ok('the Drummer drums at his kit (the beat flag pulses for P1\'s lamps)',runUntil(()=>V.pmBandState(0).beat,40)>0);
    P.z=sz-9.5;P.x=sx;step(1);let yanked=false;runUntil(()=>{if(A.st==='yanked')yanked=true;return yanked;},200);
    ok('a player at chain + 2: he drops the sticks, charges, and the chain yanks him off his feet',yanked&&A.stun>1.0);
    const h0=A.hp;A.hurtT=0;V.purgHit(A,4,'Dan','melee',{force:1});ok('...stunned 1.5 s, x1.5 damage ('+(h0-A.hp)+')',h0-A.hp===6);
    let maxD=0;for(let i=0;i<80;i++){step(1);maxD=Math.max(maxD,Math.hypot(A.x-sx,A.z-sz));}ok('the chain is 8 m ('+maxD.toFixed(2)+')',maxD<=8.25);
    hold(IT.PG_SNIPS,1);P.x=sx+1.4;P.z=sz-1.4;step(1);aim(sx,sy+0.6,sz);click();
    ok('Wire Snips on his stake: berserk 30 s',A.free>25);
    for(let i=0;i<760;i++){step(1);if(A.st==='sleep')break;}ok('...then he falls asleep where he stands (20 s)',A.st==='sleep');
    const h1=A.hp;A.hurtT=0;V.purgHit(A,4,'Dan','melee',{force:1});ok('...x2 damage asleep ('+(h1-A.hp)+')',h1-A.hp===8);
    hold(null);wipe();}

  /* ===== 10. Lab Rat Clones: hit one and it splits into the right hitboxes; Tesla arcs pop them ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;P.mode='c';const b=at('pgrat',3,3,{grp:901});step(2);
    V.purgHit(b,3,'Dan','melee',{force:1});step(1);const h=live('pgrat2');
    ok('a hit Lab Rat splits into two half-size Lab Rats (9 HP, own hitbox)',b.dead&&h.length===2&&h.every(e=>e.hp===9&&e.h===V.MOBT.pgrat2.h));
    V.purgHit(h[0],3,'Dan','melee',{force:1});step(1);const q=live('pgrat4');
    ok('...and again into quarter-size ones (4.5 HP)',q.length===2&&q.every(e=>e.hp===4.5));
    ok('hurting one makes the group swarm (angry)',V.getPMS()['bkg901']>MP().clock);
    P.mode='s';heal();const c=q[0];P.x=c.x+1.2;P.z=c.z;P.y=c.y;step(1);const hp0=P.hp;P.hurtT=0;
    V.purgHit(c,3,'Tesla Coil','tesla',{force:1});step(1);
    ok('a Lab Rat Clone touching a Tesla arc pops (2, r 2, damage only)',c.dead&&P.hp<hp0&&P.hp>=hp0-2);
    wipe();}

  /* ===== 11. the Yeti: never stops following; trip on the sneakers (x3), 30% above; the rope; gives up at 64 m ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const s=at('pgyeti',0,6);step(5);
    ok('the Yeti sees you and follows (exempt from far-despawn while following)',s.fol===P&&s.pkeep===1);
    P.mode='c';s.atkT=99;P.x=s.x;P.z=s.z-2.2;P.y=s.y;step(1);P.x=s.x;P.z=s.z-2.2;aim(s.x,s.y+0.3,s.z-s.hw);hold(IT.PG_RAPIER,1);P.atkT=0;const h0=s.hp;
    V.MB.l=true;step(1);V.MB.l=false;step(1);
    ok('a hit on the sneakers (lower 0.4 m) trips him: face-plant, stunned 3 s',s.trip>2.5&&h0-s.hp>0);
    const h1=s.hp;P.atkT=0;s.hurtT=0;aim(s.x,s.y+1.8,s.z);V.MB.l=true;step(1);V.MB.l=false;step(1);
    const dmg=V.DEFS[IT.PG_RAPIER].tool.dmg;ok('...hits while he is down do x3 ('+(h1-s.hp)+' of '+dmg+')',Math.abs((h1-s.hp)-3*dmg)<0.01);
    s.trip=0;step(2);const h2=s.hp;P.atkT=0;s.hurtT=0;aim(s.x,s.y+1.8,s.z);V.MB.l=true;step(1);V.MB.l=false;step(1);
    ok('...upper-body hits do 30% ('+(h2-s.hp).toFixed(2)+')',Math.abs((h2-s.hp)-0.3*dmg)<0.01);
    P.mode='s';hold(null);PS().hnO={name:'bigpig',live:true,phase:1};carve(-13,57,6,V.deckY(57));tp(-13,50,V.deckY(57)+1.05);s.x=-13.5;s.z=55.5;s.y=V.deckY(57)+1.02;s.vx=s.vz=0;let sat=false;for(let i=0;i<400;i++){step(1);if(s.sit){sat=true;break;}}
    ok('during the Pig\'s fight he goes to the velvet rope and sits down to watch',sat);
    PS().hnO=null;s.fol=P;s.sit=0;step(2);P.x+=70;step(3);ok('he gives up at 64 m',!s.fol&&!s.pkeep);P.x-=70;step(5);wipe();tp(SITE.x,SITE.z);}

  /* ===== 12. the Daredevil: misses go head-first into the floor (stuck 3 s, x2) ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const g=at('pgdare',0,10);P.mode='c';
    g.st='fly';g.flyT=0;g.flyHit=0;g.ptgt=null;g.vx=0;g.vy=6;g.vz=3;step(1);runUntil(()=>g.st==='stuck',120);
    ok('the Daredevil misses: stuck upside down, legs kicking ("Nailed it!")',g.st==='stuck'&&g.stuck>2);
    const h0=g.hp;g.hurtT=0;V.purgHit(g,4,'Dan','melee',{force:1});ok('...x2 damage while stuck ('+(h0-g.hp)+')',h0-g.hp===8);
    P.mode='s';wipe();}

  /* ===== 13. Thieving Frogs: materials, food and ammo only; dropped on death and on save ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;
    hold(IT.PG_FLOPPY,1,{dur:48});const f1=at('pgfrog',2,2);runUntil(()=>log().some(l=>l.mt==='pgfrog'&&l.k==='hit'),200);step(5);
    ok('a frog\'s tongue never takes a tool',P.inv[P.sel]&&P.inv[P.sel].id===IT.PG_FLOPPY&&!f1.carry);
    hold(IT.PG_FELT,9);f1.atkT=0;runUntil(()=>!!f1.carry,200);
    ok('it snatches a material from the selected slot and hops away with it',!!f1.carry&&f1.carry.id===IT.PG_FELT&&!P.inv[P.sel]);
    const snap=V.snapshot('p3a');ok('a save skips the frog but writes its stolen stack as a drop',(snap.ents||[]).some(o=>o.t==='drop'&&o.id===IT.PG_FELT&&o.count===9)&&!(snap.ents||[]).some(o=>o.t==='pgfrog'));
    const fx={x:f1.x,z:f1.z};V.purgHit(f1,99,'Dan','melee',{force:1});step(20);
    ok('killed, it drops your stack (owned by Dan) (Felt '+have(IT.PG_FELT,fx,8)+')',have(IT.PG_FELT,fx,8)>=9&&drops().filter(d=>d.st.id===IT.PG_FELT).every(d=>d.pown==='Dan'));
    ok('pmStealable: food and ammo yes, armour and the Programme no',V.pmStealable({id:IT.PG_TOMATO,count:1})&&V.pmStealable({id:IT.PG_STAPLES,count:3})&&!V.pmStealable({id:IT.PG_FPAD_H,count:1})&&!V.pmStealable({id:IT.PG_PROGRAMME,count:1}));
    hold(null);wipe();}

  /* ===== 14. Chorus Pigs stop dead at a mirror; a pig walks into a drifting followspot ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const p=at('pgpig',0,8);p.yaw=0;p.tT=99;p.wander=false;step(2);const bx=Math.floor(p.x),bz=Math.floor(p.z)+2,by=Math.floor(p.y);
    V.setBlock(bx,by,bz,B.PG_MIRROR);V.setBlock(bx,by+1,bz,B.PG_MIRROR);p.yaw=0;p.mode='idle';p.tT=99;p.wander=false;step(12);
    ok('a Chorus Pig facing a Dressing Mirror within 3 stops dead and admires itself',p.admire===1&&Math.hypot(p.vx,p.vz)<0.2);
    V.setBlock(bx,by,bz,B.AIR);V.setBlock(bx,by+1,bz,B.AIR);p.pmir=0;step(8);
    PS().spotO=Object.assign({},NOSITES,{palaceSpot:[[p.x+3,p.y,p.z+0.5]]});runUntil(()=>p.posing,200);
    ok('pink things go to the light: it walks into a followspot within 6 m and poses',p.posing===1);
    PS().spotO=Object.assign({},NOSITES);wipe();}

  /* ===== 15. the Cook: cleaver, THE GRAB and the ladle, the chase on the mesa, the counter, x2 dishes ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const X=Math.floor(P.x),Z=Math.floor(P.z)+6,Y=FY(Z);
    for(let dx=-6;dx<=6;dx++)for(let dz=-6;dz<=8;dz++){for(let y=Y+1;y<=Y+5;y++)V.setBlock(X+dx,y,Z+dz,B.AIR);V.setBlock(X+dx,Y,Z+dz,B.PG_COUNTER);}
    const counter=[];for(let dx=-2;dx<=2;dx++){V.setBlock(X+dx,Y+1,Z,B.PG_COUNTER);counter.push([X+dx,Y+1,Z]);}
    const pot=[];for(let dx=-1;dx<=1;dx++)for(let dz=4;dz<=6;dz++){V.setBlock(X+dx+4,Y,Z+dz,B.PG_SOUP);pot.push([X+dx+4,Y,Z+dz]);}
    const mesa=[];for(let dx=-6;dx<=6;dx++)for(let dz=-6;dz<=8;dz++)mesa.push([X+dx,Y+1,Z+dz]);
    const k=V.pmChefPrep({post:[X+0.5,Y+1,Z+2.5],counter,pot,mesa,hut:{x0:X-3,x1:X+3,y0:Y+1,y1:Y+4,z0:Z,z1:Z+5}});
    const ch=V.pmSpawnAt('pgcook',X+0.5,Y+1,Z+2.5,{post:[X+0.5,Y+1,Z+2.5],k});step(5);
    heal();P.hunger=10;PS().log.length=0;P.x=X+0.5;P.z=Z-1.2;P.y=Y+1;runUntil(()=>P.hp<20,120);
    ok('stand in front of the counter: cleaver raised 0.5 s, then 3',P.hp===17&&telegraphed('pgcook',0.45).bad===0&&telegraphed('pgcook',0.45).hits>0);
    heal();P.x=X+1.5;P.z=Z+3.5;P.y=Y+1;P.vx=P.vz=0;let lobbed=false;for(let i=0;i<80;i++){step(1);if(PS().flight){lobbed=true;break;}}
    ok('stand behind the counter for 1.5 s: THE GRAB lobs you at the stock pot',lobbed);
    P.x=X+4.5;P.z=Z+5.5;P.y=Y+0.05;P.vx=P.vy=P.vz=0;PS().flight=null;P.hunger=10;const hp0=P.hp;let slapped=false;
    for(let i=0;i<140;i++){step(1);P.vx=P.vz=0;if(PS().flight){slapped=true;break;}}
    ok('1 a second in the soup, and after 4 s the ladle slaps you out ("Out!")',slapped&&P.hp<=hp0-3);
    runUntil(()=>!PS().flight,80);ok('...onto the counter front',Math.hypot(P.x-k.front[0],P.z-k.front[2])<2.5);
    heal();P.x=X+0.5;P.z=Z-3.5;P.y=Y+1;step(10);const ro0=invTotal(IT.PG_ROAST);
    V.pmChefTake(ch,{id:IT.PG_LIVECHICK,count:1},P,'chase');const hen=live('pghen')[0];let off=0,cOff=0;
    for(let i=0;i<260&&!ch.yank;i++){step(1);if(hen&&!hen.dead&&!k.mset.has(Math.floor(hen.x)+','+Math.floor(hen.z)))off++;if(!k.mset.has(Math.floor(ch.x)+','+Math.floor(ch.z)))cOff++;}
    ok('a Live Chicken bolts across the mesa top and never off its edge',!!hen&&off===0);
    ok('he vaults the counter and chases it, clamped to his mesa',cOff===0);
    ok('...until a pale arm yanks him back behind the counter',!!ch.yank||ch.chase==null);
    runUntil(()=>!ch.yank&&!ch.cook.length,300);step(40);
    ok('...and he comes back up with the roast x3, arcing at Dan',have(IT.PG_ROAST,P,6)-ro0===3);
    wipe();const ch2=V.pmSpawnAt('pgcook',X+0.5,Y+1,Z+2.5,{post:[X+0.5,Y+1,Z+2.5],k});step(3);
    const ro1=have(IT.PG_ROAST,P,8);V.spawnDrop(X+0.5,Y+2.2,Z+0.5,{id:IT.PG_RCHICK,count:1},0,0,0);runUntil(()=>have(IT.PG_ROAST,P,8)-ro1>=2,320);
    ok('a Rubber Chicken dropped on his counter is seized and comes back as Roast Rubber Chicken x2',have(IT.PG_ROAST,P,8)-ro1===2);
    hold(IT.PG_RCHICK,1);V.PREG.mobUse.pgcook(ch2);ok('right-click the Cook holding an ingredient: he takes one',!P.inv[P.sel]&&ch2.cook.length===1);
    wipe();}

  /* ===== 16. the Weatherman: loot on the desk, a shadow, something from the Grid, 10 to anyone at the desk ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const okS=V.pmNewsStart(P);const N=PS().news;
    ok('the Weatherman sets up 20-35 m away with his desk',okS&&!!N&&Math.hypot(N.S[0]-P.x,N.S[2]-P.z)>=19&&Math.hypot(N.S[0]-P.x,N.S[2]-P.z)<=36);
    if(N){step(10);ok('loot on his desk: papers (Felt x4), a paperweight (Sequin x1), a mug (Stuffing x3)',dropTotal(IT.PG_FELT,{x:N.D[0],z:N.D[2]},3)===4&&dropTotal(IT.PG_SEQUIN,{x:N.D[0],z:N.D[2]},3)===1&&dropTotal(IT.PG_STUFF,{x:N.D[0],z:N.D[2]},3)===3);
      P.x=N.D[0]+0.6;P.z=N.D[2];P.y=N.S[1];heal();for(const d of drops())C.removeEnt(d);step(1);
      runUntil(()=>N.ph==='flat',220);ok('at 6 s something drops from the Grid and flattens him',N.ph==='flat'&&N.e.pose&&N.e.pose.k==='flattened');
      ok('anyone within 1.5 m of the desk takes 10',P.hp===10);
      step(5);const lootN=drops().reduce((a,d)=>a+d.st.count,0);ok('the drop is loot too ('+N.kind+': '+lootN+')',lootN>=3);
      runUntil(()=>!PS().news,200);ok('he peels himself off and limps away; the desk goes',!PS().news);}
    wipe();}

  /* ===== 17. the Old Goats: heckle per killer, the tomato after a death, splats, the knock-over ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;P.hurtT=0;PS().sayQ.length=0;
    V.purgHit(P,99,'the Yeti','yeti',{force:1});step(40);const L=log().filter(l=>l.k.indexOf('heckle:')===0).map(l=>l.k);
    ok('Dan\'s death gets the pair matched to the killer ('+L.slice(-1)+')',L[L.length-1]==='heckle:yeti');
    step(60);
    V.respawn&&V.respawn();step(5);runUntil(()=>log().some(l=>l.k==='tomato:death'),80);
    ok('...and after he respawns a Heckle Tomato falls out of the dark onto him',log().some(l=>l.k==='tomato:death'));
    step(60);ok('...it lands as food (owned by Dan)',drops().some(d=>d.st.id===IT.PG_TOMATO&&d.pown==='Dan')||invTotal(IT.PG_TOMATO)>0);
    ok('the death kinds follow the bible table',V.pmDeathKind('the Demolitionist','pg:plates',1)==='bomber_plate'&&V.pmDeathKind('the Demolitionist','pg:plates',2)==='bomber_hint'
      &&V.pmDeathKind('the Demolitionist','pg:bigone',1)==='bigone'&&V.pmDeathKind('the Pig','pg:pig',1)==='bigpig_pig'&&V.pmDeathKind('the Pig','pg:toss',3)==='toss'
      &&V.pmDeathKind('the Pig','pg:charge',4)==='bigpig_charge_hint'&&V.pmDeathKind('the Frog','pg:tongue',1)==='tongue'&&V.pmDeathKind('the Frog','pg:swallow',2)==='swallow_hint'
      &&V.pmDeathKind('the Frog','pg:slam',1)==='arm'&&V.pmDeathKind('The Hands','pg:hand',1)==='hands'&&V.pmDeathKind('Felt Dan','pg:feltdan',1)==='feltdan'
      &&V.pmDeathKind('the Cook','pg:cleaver',1)==='chef'&&V.pmDeathKind(null,'pg:flat',1)==='flat'&&V.pmDeathKind('the Drummer','pg:drummer',1)==='animal'
      &&V.pmDeathKind('Zombie','mob',1)==='other');
    const sw=live('pgoldgoat')[0]||V.pmSpawnAt('pgoldgoat',P.x+5,P.y,P.z+5,{pfix:1});const wd=live('pgoldergoat')[0]||V.pmSpawnAt('pgoldergoat',P.x+6,P.y,P.z+5,{pfix:1});
    step(2);const splatE=at('pghollow',2,2);const id1=V.pmSplat(splatE),id2=V.pmSplat({x:Math.floor(P.x)+3,y:FY(P.z)+0,z:Math.floor(P.z)});step(50);
    const S=PS().splats;ok('pmSplat: a tomato out of the dark splats onto the counter target (an entity and a block cell)',S.length===2&&S.every(s=>!!s.G));
    V.pmSplatClear();ok('pmSplatClear() clears every splat (P4 calls it on a reset or kill)',PS().splats.length===0);
    /* the knock-over: a batted tomato, a Charge blast, a thrown pig: any hit tips one over and quiets the box 180 s */
    const t=V.puSpawn('tomato',sw.x,sw.y+3,sw.z,0,-4,0,'Dan',{batted:1,straight:40,g:0,food:true});step(20);
    ok('a Foam-Batted Heckle Tomato tips Old Goat over backwards, legs in the air',sw.pose&&sw.pose.k==='tip');
    ok('...and silences the box for 3 minutes',MP().quiet>MP().clock+170&&V.pmHeckle('other',{})===false);
    ok('an NPC hit reaches PREG.npcHit and takes no damage',sw.hp===999);
    MP().quiet=0;step(220);V.pBlast(wd.x,wd.y+1,wd.z,2.5,10,'Dan',{charge:1,how:'charge'});step(2);
    ok('a Charge blown on the rail tips Older Goat too',wd.pose&&wd.pose.k==='tip'&&MP().quiet>MP().clock+170);
    MP().quiet=0;step(220);V.purgHit(sw,18,'Dan','pig',{force:1});step(2);ok('...and so does a thrown pig',sw.pose&&sw.pose.k==='tip');
    MP().quiet=0;PS().tomCool={};
    ok('embarrassments lob a tomato (a Bin volley that hits 3+ times: P2 calls pmHeckle("bin"))',V.pmHeckle('bin',{who:'Dan',hits:3})===true);
    {tp(SITE.x,SITE.z);V.pmStructTick();step(2);const st=live('pgoldgoat').find(e=>e.seatAt);if(st){V.pmHeckle('applaud',{who:'Dan'});V.pmNpcPose(st,'nod',6);step(3);
      ok('the Strike\'s doors: pmHeckle("applaud") stands them up at the EXIT, applauding (a nod keeps it)',st.pose&&st.pose.k==='applaud'&&Math.abs(st.z-(MPC.EXIT.z+2.5))<0.5);
      V.pmStructTick();ok('...and applauding 200 m from Dan at the doors, the struct sweep keeps them (culled by distance from the box)',V.entities.includes(st)&&!st.dead);
      V.pmSWApplaud(false);step(2);ok('...and pmSWApplaud(false) seats them again ('+(st.pose&&st.pose.k)+', z '+st.z.toFixed(1)+')',!(st.pose&&st.pose.k==='applaud')&&Math.abs(st.z-MPC.BOX_SW[2])<0.5);}
      else skip('applaud','no seated Old Goat');
      ok('an unknown heckle kind stays silent',V.pmHeckle('no-such-kind',{})===false);}
    PS().tomCool={};ok('P4\'s 2nd/4th-death hint pair resolves (pmHeckle("hint",{boss,phase}))',V.pmHeckle('hint',{boss:'bigpig',phase:3,deaths:2})===true&&log().some(l=>l.k==='heckle:pose_hint'));
    wipe();}

  /* ===== 18. the BOO barrage: 5 s, 3 a second from seats within 30 m, 2 each, each lands as food ===== */
  {heal();const P=V.P;tp(0,-250);wipe();PS().log.length=0;P.hunger=10;const bt0=invTotal(IT.PG_TOMATO);const n0=V.entities.filter(e=>e.t==='pproj'&&e.kind==='tomato').length;let spawned=0;
    const ids=new Set();PS().boo=null;ok('pmBooBarrage starts once (idempotent while it runs)',V.pmBooBarrage(P.x,P.z)===true&&V.pmBooBarrage(P.x,P.z)===false);
    for(let i=0;i<140;i++){step(1);for(const e of V.entities)if(e.t==='pproj'&&e.kind==='tomato'&&!ids.has(e)){ids.add(e);spawned++;}}
    ok('15 tomatoes over 5 s ('+spawned+')',spawned>=14&&spawned<=16);
    ok('they hurt (2 each, i-frames apply) and land as Heckle Tomatoes',P.hp<20&&have(IT.PG_TOMATO,P,40)-bt0>=5);
    wipe();tp(SITE.x,SITE.z);}

  /* ===== 19. ambient spawning: caps 8 / 12 / 8, exclusion zones, never an overworld mob ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;P.mode='c';V.GR.mobSpawn=true;
    const H=()=>V.entities.filter(e=>e.t==='mob'&&!e.dead&&!e.bot&&e.hostile&&!V.MOBT[e.mt].pnc).length;
    const Pa=()=>V.entities.filter(e=>e.t==='mob'&&!e.dead&&!e.bot&&!e.hostile&&!V.MOBT[e.mt].pnc).length;
    let maxH=0,maxP=0;PS().biomeO='swamp';for(let i=0;i<1400;i++){step(1);maxH=Math.max(maxH,H());maxP=Math.max(maxP,Pa());}
    ok('SHOW: hostile cap 8 (frogs and the Pelican in the swamp, max '+maxH+')',maxH>=4&&maxH<=8+5);
    PS().biomeO='woods';PS().cueO='blackout';let mb=0;for(let i=0;i<1600;i++){step(1);mb=Math.max(mb,H());}
    ok('BLACKOUT: the Hands come up and the cap rises to 12 (max '+mb+')',mb>8&&mb<=12+5);
    const nearL=V.entities.filter(e=>e.t==='mob'&&!e.dead&&!e.bot&&/^pg/.test(e.mt)&&!V.MOBT[e.mt].npc&&Math.hypot(e.x-MPC.MARK[0],e.z-MPC.MARK[2])<16);
    const owL=V.entities.filter(e=>e.t==='mob'&&!e.dead&&!e.bot&&!V.MOBT[e.mt].pmob);
    ok('never an overworld mob in purgatory; none spawned within 16 m of the Mark'+(nearL.length||owL.length?' ('+nearL.concat(owL).map(e=>e.mt+'@'+e.x.toFixed(0)+','+e.z.toFixed(0)).join(' ')+')':''),owL.length===0&&nearL.length===0);
    PS().cueO='show';PS().biomeO='woods';wipe();let mp=0;for(let i=0;i<1600;i++){step(1);mp=Math.max(mp,Pa());}
    ok('passive cap 8 (hens in the Woods, max '+mp+')',mp>=1&&mp<=8);
    PS().biomeO='labs';wipe();for(let i=0;i<700;i++)step(1);const bk=V.entities.filter(e=>!e.dead&&/^pgrat/.test(e.mt)).length;
    ok('Labs: Lab Rat Clones in groups of 3 ('+bk+')',bk>=3&&bk%1===0&&bk<=10);
    PS().biomeO=null;wipe();PS().hnO={name:null,inter:true};for(let i=0;i<300;i++)step(1);
    ok('no ambient spawns during Intermission',V.entities.filter(e=>e.t==='mob'&&!e.dead&&!e.bot&&/^pg/.test(e.mt)&&!V.MOBT[e.mt].pnc).length===0);
    PS().hnO=null;V.GR.mobSpawn=false;P.mode='s';wipe();}

  /* ===== 20. structure spawns from P1's sites (seams while P1 is on its stub): Arm Holes, heaps, Band Rooms, posts ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const hx=Math.floor(P.x)+6,hz=Math.floor(P.z)+6,hy=FY(hz);V.setBlock(hx,hy,hz,B.PG_ARMHOLE);
    PS().holesO=[{id:'h1',x:hx,y:hy,z:hz,kind:'what',reach:6},{id:'h2',x:hx+8,y:FY(hz),z:hz,kind:'comic',reach:5}];V.setBlock(hx+8,FY(hz),hz,B.PG_ARMHOLE);
    const heap=[Math.floor(P.x)-8,FY(P.z)+1,Math.floor(P.z)+4];PS().spotO=Object.assign({},NOSITES,{hollowHeap:[heap]});
    V.pmStructTick();step(2);
    ok('a Blank per Arm Hole within 40 m; the Comic on his kind of hole',live('pgwhat').length===1&&live('pgcomic').length===1);
    const hol=live('pghollow');ok('a Hollow heap of 3-5',hol.length>=3&&hol.length<=5);
    const w=live('pgwhat')[0];V.purgHit(w,99,'Dan','melee',{force:1});step(30);V.pmStructTick();step(1);
    ok('a dead Blank does not come back at once (3 minutes while the hole stands)',live('pgwhat').length===0);
    for(let i=0;i<5;i++){MP().clock+=40;V.pmStructTick();}ok('...but does after 3 minutes',live('pgwhat').length===1);
    for(const h of live('pghollow'))V.purgHit(h,99,'Dan','melee',{force:1});step(5);V.pmStructTick();MP().clock+=60;V.pmStructTick();
    ok('a cleared heap stays clear for 4 minutes',live('pghollow').length===0);MP().clock+=200;V.pmStructTick();
    ok('...then it is back',live('pghollow').length>=3);
    PS().holesO=[];PS().spotO=Object.assign({},NOSITES);P.x+=200;step(2);V.pmStructTick();step(2);
    ok('structure puppets 76 m from everyone go away (and are not counted as dead)',live('pghollow').length===0&&live('pgcomic').length===0);
    P.x-=200;step(2);wipe();
    const sw=V.pmSWSeats();ok('the Old Goats sit in the box at MPC.BOX_SW facing the apron',Math.abs(sw[0][0]-MPC.BOX_SW[0])<1.5&&Math.abs(sw[1][2]-MPC.BOX_SW[2])<0.01);}

  /* ===== 21. Felt Dan: armed by the guest trunk; walks at BLACKOUT; collapses at SHOW; killed once per run ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;MP().feltDan=0;
    V.PREG.onClose.forEach(f=>f('chest',{t:'chest',inv:[],pguest:1},'x'));ok('opening the Last Guest trunk arms Felt Dan',MP().feltDan===1);
    V.pmStructTick();ok('nothing walks in SHOW',live('pgfeltdan').length===0);
    PS().cueO='blackout';V.pmStructTick();step(2);const fd=live('pgfeltdan')[0];ok('at the next BLACKOUT Felt Dan comes up out of the dark',!!fd);
    PS().cueO='show';step(50);ok('SHOW returns: he collapses (and is not killed)',fd&&fd.dead&&MP().feltDan===1);
    PS().cueO='blackout';V.pmStructTick();step(2);const fd2=live('pgfeltdan')[0];ok('...and walks again at the next BLACKOUT',!!fd2);
    P.mode='c';V.purgHit(fd2,99,'Dan','melee',{force:1});step(20);
    const bat=drops().find(d=>d.st.id===IT.PG_BAT);
    ok('killed: MP.feltDan=2 and he drops the other half-kit (Foam Bat at 40%, 8 Eyeball Lamps, 2 Custard Pies)',MP().feltDan===2&&!!bat&&bat.st.dur===Math.round(V.DEFS[IT.PG_BAT].tool.dur*0.4)
      &&dropTotal(B.PG_LAMP,fd2,6)===8&&dropTotal(IT.PG_PIE,fd2,6)===2);
    V.pmStructTick();step(2);ok('never again this run',live('pgfeltdan').length===0);
    PS().cueO='show';P.mode='s';wipe();}

  /* ===== 22. the hen rule; rubber hens; the Live Chicken ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const h=at('pghen',1.5,1.5);step(2);hold(null);V.PREG.mobUse.pghen(h);step(1);
    ok('right-click a hen bare-handed: a Live Chicken (through mpGive), the hen is gone',P.inv.some(s=>s&&s.id===IT.PG_LIVECHICK)&&h.dead&&MPF().giveLog.some(g=>g.id===IT.PG_LIVECHICK));
    for(let i=0;i<36;i++)if(P.inv[i]&&P.inv[i].id===IT.PG_LIVECHICK)P.inv[i]=null;
    for(let i=0;i<3;i++){const e=at('pghen',2+i,3);V.purgHit(e,99,'Dan','melee',{force:1});step(5);}
    ok('three hens: no Daredevil yet',live('pgdare').length===0);
    const e4=at('pghen',2,4);V.purgHit(e4,99,'Dan','melee',{force:1});step(2);const g=live('pgdare')[0];
    ok('a fourth within 3 minutes: the Daredevil is fired in from the nearest wing',!!g&&g.st==='fly'&&Math.abs(g.x)>60);
    wipe();for(let i=0;i<3;i++){const e=at('pghen',2+i,3);V.purgHit(e,99,'Dan','melee',{force:1});step(5);}
    ok('...once per 4 kills',live('pgdare').length===0);wipe();}
  /* ===== 22b. P2's Pig Mitt holds a hen still and throws it ballistic; a Custard Pie blinds a puppet 4 s ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;const h=at('pghen',2,2);step(3);h.pheld='Dan';h.x=P.x+0.7;h.z=P.z;h.y=P.y+0.75;const hx=h.x;step(10);
    ok('a hen held in the Pig Mitt does not walk off (P2 moves it)',Math.abs(h.x-hx)<1e-6&&h.hrS.held===1);
    h.pheld=null;h.vx=12;h.vy=4;h.vz=0;h.pthrown={by:'Dan',t:MP().clock};step(8);const flown=h.x-hx;runUntil(()=>!h.pthrown,80);
    ok('thrown, it flies ballistic and lands ('+flown.toFixed(1)+' m in 0.3 s)',flown>2.5&&!h.pthrown);
    wipe();const x=Math.floor(P.x)+2,z=Math.floor(P.z)+1;V.setBlock(x,FY(z),z,B.PG_ARMHOLE);const w=V.pmSpawnTether('what',x,FY(z),z);w.pblind=MP().clock+3;
    let locked=false;for(let i=0;i<60;i++){step(1);if(w.plock>0)locked=true;}ok('a pied Blank (e.pblind) cannot find anyone for its 4 s',!locked);
    w.pblind=0;runUntil(()=>w.plock>0,80);ok('...then it bites again',w.plock>0);wipe();}

  /* ===== 23. 30% of Blanks wear crooked googly eyes (and drop them); NPC poses and finders ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;let g=0;const n=40;
    const mine=[];for(let i=0;i<n;i++){const x=Math.floor(P.x)+(i%8)*3-12,z=Math.floor(P.z)+10+Math.floor(i/8)*3;V.setBlock(x,FY(z),z,B.PG_ARMHOLE);mine.push(V.pmSpawnTether('what',x,FY(z),z));step(0);}
    step(32);for(const e of mine)if(e.googly)g++;ok('30% of Blanks have glued googly eyes ('+g+'/'+n+')',g===12);
    {const vis=V.getPMR().arms.filter(e=>!e.dead&&e.parmG&&e.parmG.visible).length;ok('at most 24 tether arms are drawn ('+vis+' of '+n+')',vis===24);}
    const ge=mine.find(e=>e.googly);P.mode='c';V.purgHit(ge,99,'Dan','melee',{force:1});step(20);
    ok('...and those drop Googly Eyes',dropTotal(IT.PG_GOOGLIES,ge,4)>=1);P.mode='s';wipe();
    const b=V.pmNpcSpawn('bkr',P.x+3,P.y,P.z+3,{from:[P.x+10,P.y,P.z+10]});ok('pmNpcSpawn walks a bench Lab Rat in from where it was',!!b&&b.pose&&b.pose.k==='walkin');
    runUntil(()=>!b.pose,300);ok('...to his post',Math.hypot(b.x-(P.x+3),b.z-(P.z+3))<1.2);
    ok('pmNpcFind finds him by kind',V.pmNpcFind('bkr',[P.x,P.y,P.z])===b);
    V.pmNpcPose(b,'zap');ok('the zap demo singes his hair (a build-up that stays)',b.singe===1);
    V.pmNpcPose(b,'stapled',6);step(10);ok('stapled: pinned for 6 s',b.pose&&b.pose.k==='stapled');
    V.pmNpcPose(b,'flattened',1.5);step(40);ok('poses end on their own',!b.pose);
    {const px=Math.floor(P.x)-6,pz=Math.floor(P.z)+2,fy=Math.floor(P.y)+3;for(let x=px-1;x<=px+1;x++)for(let z=pz-1;z<=pz+1;z++)V.setBlock(x,fy,z,B.PG_DECK);step(1);
      const b2=V.pmNpcSpawn('bkr',px+0.5,fy+1,pz+0.5,{from:[px-7.5,P.y,pz+0.5]});runUntil(()=>!b2.pose,400);
      ok('...a walk-in that ends up under a raised post (a placed bench on a floor above him) pops up onto it ('+b2.y.toFixed(1)+')',Math.abs(b2.y-(fy+1))<0.6&&Math.hypot(b2.x-px-0.5,b2.z-pz-0.5)<1.2);
      C.removeEnt(b2);for(let x=px-1;x<=px+1;x++)for(let z=pz-1;z<=pz+1;z++)V.setBlock(x,fy,z,B.AIR);step(1);}
    const bu=V.pmNpcSpawn('prof',P.x+5,P.y,P.z+3,{});step(2);V.PREG.mobUse.pgprof(bu);step(1);
    ok('right-click the Professor: he reads a hint and the Gauntlet recipe',PS().sayQ.some(s=>/Gauntlet/.test(s.t))&&live('pgprof').length===1);
    wipe();}

  /* ===== 24. rig memory: 100 spawn/kill cycles grow no geometries and dispose every per-instance material ===== */
  {heal();tp(SITE.x,SITE.z);wipe();const P=V.P;P.mode='c';
    for(let i=0;i<8;i++){const e=at(['pgrat4','pghen','pgpig','pgfrog'][i%4],3,3);step(1);C.removeEnt(e);step(1);}   /* warm the shared caches */
    const g0=CNT.geo,m0=CNT.mat,d0=CNT.disp;CNT.from=CNT.mat;
    const mine=[];for(let i=0;i<100;i++){const e=at(['pgrat4','pghen','pgpig','pgfrog'][i%4],3,3);mine.push(e);step(1);C.removeEnt(e);step(1);}
    const mats=mine.reduce((a,e)=>a+(e.mesh&&e.mesh.userData.pmats?e.mesh.userData.pmats.length:0),0),dd=mine.reduce((a,e)=>a+((e.mesh&&e.mesh.userData.pmats||[]).filter(m=>m._pmD).length),0);
    wipe();step(5);
    ok('100 spawn/kill cycles: no new geometries ('+(CNT.geo-g0)+')',CNT.geo-g0===0);
    ok('...every per-instance material of those 100 puppets disposed ('+mats+' made, '+dd+' disposed)',mats>0&&dd===mats);
    ok('...and no entities left over',V.entities.filter(e=>!e.dead&&e.t==='mob'&&/^pg/.test(e.mt)&&!V.MOBT[e.mt].npc).length===0);
    P.mode='s';}

  /* ===== 25. the exit takes every P3 prop out of the scene ===== */
  {const P=V.P;tp(SITE.x,SITE.z);wipe();const x=Math.floor(P.x)+3,z=Math.floor(P.z)+3;V.setBlock(x,FY(z),z,B.PG_ARMHOLE);V.pmSpawnTether('what',x,FY(z),z);
    const A=at('pgdrummer',4,8);A.stake=[A.x,A.y,A.z-2];step(5);ok('props are tracked (arm, chain, kit)',V.getPMR().sp.size>=3);
    V.mpExitNow({abandon:true});step(20);ok('after the exit no P3 prop is left in the overworld scene',V.getPMR().sp.size===0&&V.mpInfo().dim==='over');}

  ok('no [PG] warning from any P3 path'+(warns.length?' ('+warns.slice(0,3).join(' | ')+')':''),warns.length===0);
});
