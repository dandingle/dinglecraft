/* c0_smoke.js (lead, gate x2): the Build S0 contract in behaviour (the creativity plan sections 4, 5, 9.2).
   build identity (DC_NO_CREA = the shipped v6.1, byte for byte), an inert world, recipes, the easel / record player / jukebox
   lifecycles through the real doUse and doMine, hanging paintings of all three sizes on walls of all four facings, taking them
   down (one drop, same data), and the METADATA AUDIT: a painting and a disc survive every inventory path (no merge, split, chest,
   furnace slot, sort, Q drop + no despawn, pickup, death + respawn, keepInventory, creative palette, save/load + GC, ENT_STASH across
   a dimension change, Puppet Purgatory's strip / trunk / save inside / customs / trunk return, bots refusing them), orphan recovery
   (explosion, missing cell, missing wall, a chest on a stale entity, an editor bound to a destroyed easel), caps and titles, reset. */
'use strict';
const boot=require('../lib/c_boot.js'),{ok,skip}=boot;
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const V=boot({});
const step=boot.stepper(600000);
const C=V.crCore(),B=V.B,IT=V.IT,CRC=V.CRC,CR=()=>V.getCR();
const md5=b=>crypto.createHash('md5').update(b).digest('hex');
const aim=(x,y,z)=>boot.aim(V,x,y,z),rclick=()=>boot.rclick(V,step),give=(id,s)=>boot.give(V,id,s);
const drops=id=>V.entities.filter(e=>e.t==='drop'&&!e.dead&&(id==null||e.st.id===id));
const has=id=>V.P.inv.some(s=>s&&s.id===id);
const cnt=id=>V.P.inv.reduce((n,s)=>n+(s&&s.id===id?s.count:0),0);
const tp=(x,z,y)=>{const P=V.P;P.x=x;P.z=z;if(y!=null)P.y=y;P.vx=P.vy=P.vz=0;P.fallD=0;step(2);};
const pickAll=id=>{const P0=V.P,x=P0.x,y=P0.y,z=P0.z;let moved=false;for(const e of drops(id)){tp(e.x,e.z,Math.floor(e.y));step(20);moved=true;}if(moved)tp(x,z,y);};
const emptyHand=()=>{const P0=V.P;let i=P0.inv.findIndex((q,k)=>!q&&k<9);if(i<0){const e=P0.inv.findIndex((q,k)=>!q&&k>8);i=0;if(e>0)P0.inv[e]=P0.inv[0];P0.inv[0]=null;}P0.sel=i;V.refreshHand();};
const select=id=>{const P0=V.P;let i=P0.inv.findIndex(q=>q&&q.id===id);if(i<0)return false;if(i>8){const t=P0.inv[8];P0.inv[8]=P0.inv[i];P0.inv[i]=t;i=8;}
  P0.sel=i;V.refreshHand();return true;};   /* swaps into the hotbar: never overwrites a stack */
const recJ=n=>JSON.stringify(CR().CRW[n]);
const esc=()=>{V.crKey({code:'Escape',target:null});step(2);};
const TRACE=[];let artId=0;
const sec=(name,fn)=>{TRACE.push(name+':'+(artId?(V.P.inv.some(s=>s&&s.id===artId)?1:0)+'/'+V.entities.filter(e=>e.t==='drop'&&!e.dead&&e.st.id===artId).length:'-'));try{fn();}catch(e){ok(name+' ran without throwing ('+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ').slice(0,300)+')',false);}};
let toasts=[];

boot.run(async()=>{
  /* ===== 0. build identity: RETIRED at the split (1 check: DC_NO_CREA=1 re-spliced the shipped v6.1). The frozen-version rule
     (tests/fixtures/shipped.json, tests/repo/r_build.js) proves the v6.3 build byte for byte instead. ===== */

  /* ===== 1. an inert world ===== */
  let o=boot.studio(V,step);const P=new Proxy({},{get:(t,k)=>V.P[k],set:(t,k,v)=>{V.P[k]=v;return true;}});   /* applySave/startNewWorld replace P */
  sec('inert',()=>{const d=V.snapshot('cr1');
    ok('a fresh world saves no cr key (v6.1 shape) and the registry is empty',!('cr' in d)&&V.crInfo().works===0&&CR().CRBE.size===0);
    const c0=CR().CRF.clock;step(20);ok('processCrea is a no-op while nothing creative exists (clock still, not live)',CR().CRF.clock===c0&&!CR().CRF.live);});

  /* ===== 2. recipes ===== */
  sec('recipes',()=>{V.openModal('craft');const M=C.MODAL;
    const g=(p,k)=>{const a=Array(9).fill(null);p.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch!==' ')a[y*3+x]={id:k[ch],count:1};}));return a;};
    const e=V.calcCraft(g([' S ','SWS','S S'],{S:IT.STICK,W:B.WOOL}),3,M.rset),r=V.calcCraft(g(['SIS','PPP'],{S:IT.STICK,I:IT.IRON,P:B.PLANK_B}),3,M.rset),
      j=V.calcCraft(g(['PPP','PDP','PPP'],{P:B.PLANK_S,D:IT.DIAMOND}),3,M.rset);
    ok('at a crafting table: sticks + wool = Easel, sticks + iron + planks = Record Player, planks + diamond = Jukebox (any planks)',M.rset===V.RECIPES&&e&&e.id===B.CR_EASEL&&r&&r.id===B.CR_DECK&&j&&j.id===B.CR_JUKE);
    V.closeModal(true);});

  /* ===== 3. the easel through the real doUse ===== */
  let art=0;
  sec('easel',()=>{give(B.CR_EASEL,0);aim(o.x+2.5,o.y-0.02,o.z+0.5);rclick();
    const k=(o.x+2)+','+o.y+','+o.z,be=V.blockEnts.get(k);
    ok('right-click places an Easel with its block entity, facing Dan (-x), and uses the item up (survival)',V.getBlock(o.x+2,o.y,o.z)===B.CR_EASEL&&be&&be.t==='crease'&&be.f===1&&be.id===0&&!P.inv[0]);
    aim(o.x+2.5,o.y+0.5,o.z+0.5);rclick();
    ok('right-click on it opens the painting editor (a modal: input, pointer lock, chat all wait)',V.crOn()==='paint'&&V.modalOpen()&&CR().CRF.ctx&&CR().CRF.ctx.bek===k);
    V.crKey({code:'KeyE',target:null});ok('E does not open the inventory over the editor (the editor gets every key)',V.crOn()==='paint'&&!C.MODAL.kind);
    esc();ok('Esc closes it',!V.crOn()&&!V.modalOpen());
    rclick();const ctx=CR().CRF.ctx;art=V.crStartWork(ctx,{w:64,h:64,d:'abc'});artId=V.crItemId(art);
    ok('starting a canvas allocates work n and loads it on the easel (be.id = 10000+n)',art>0&&be.id===artId&&V.crRec(art).st==='wip'&&V.crRec(art).w===64);
    ok('the unfinished work has a synthetic def: stack 1, hidden from the palette, never a block',V.DEFS[artId].name==='Unfinished Canvas (64×64)'&&V.DEFS[artId].stack===1&&V.DEFS[artId].hide&&V.DEFS[artId].item&&C.ICONS[artId]);
    ok('a loaded easel refuses a second start; edits save (crSetData)',V.crStartWork(ctx,{w:64,h:64,d:''})===0&&V.crSetData(art,'abcd')&&V.crRec(art).u===1);
    esc();step(5);aim(o.x+2.5,o.y+0.5,o.z+0.5);rclick();
    ok('leave and come back: the easel still holds the same work and its pixels',V.crOn()==='paint'&&CR().CRF.ctx.be.id===artId&&V.crRec(art).d==='abcd');
    const st=V.crEndWork(CR().CRF.ctx,'  Sun<set>  ');esc();
    ok('Done: the work is finished with a clean title, given to Dan once, and the easel is clear',st&&st.id===artId&&V.crRec(art).st==='done'&&V.crRec(art).t==='Sunset'&&
      cnt(artId)===1&&be.id===0&&V.DEFS[artId].name==='Painting: Sunset');
    ok('a finished work is immutable',V.crSetData(art,'zzz')===false&&V.crRec(art).d==='abcd');});

  /* ===== 4. hanging: four facings, three sizes, refusals ===== */
  const cells=id=>{const out=[];for(const [k,b] of V.blockEnts)if(b.t==='crpaint'&&b.id===id)out.push([k,b]);return out;};
  const hangAt=(id,px,pz,ax,ay,az)=>{tp(px,pz,o.y);if(!select(id))return false;aim(ax,ay,az);rclick();return cells(id).length>0;};
  const takeDown=id=>{const c=cells(id);if(!c.length)return false;const p=c[0][0].split(',').map(Number);emptyHand();
    aim(p[0]+0.5,p[1]+0.5,p[2]+0.5);boot.mine(V,step,16);return cells(id).length===0;};
  sec('hanging',()=>{const faces=[['back wall (faces -x)',o.x+3.5,o.z+0.5,o.x+6.01,o.y+1.5,o.z+0.5,[-1,0]],['front wall (faces +x)',o.x+0.5,o.z+0.5,o.x-1.01,o.y+1.5,o.z+0.5,[1,0]],
      ['side wall (faces +z)',o.x+2.5,o.z-2.5,o.x+2.5,o.y+1.5,o.z-5.01,[0,1]],['side wall (faces -z)',o.x+2.5,o.z+3.5,o.x+2.5,o.y+1.5,o.z+6.01,[0,-1]]];
    for(const [nm,px,pz,ax,ay,az,n] of faces){const hung=hangAt(artId,px,pz,ax,ay,az),c=cells(artId);
      const b0=c.length?c.find(x=>x[1].i===0&&x[1].j===0):null,g=b0?V.crPaintGeom(b0[1]):null;
      ok('hang on the '+nm+': 2x2 cells in front of the wall, one anchor, the item used up',hung&&c.length===4&&c.every(x=>x[1].a===c[0][1].a&&x[1].w===2&&x[1].h===2)&&
        new Set(c.map(x=>x[1].i+','+x[1].j)).size===4&&g&&g.nx===n[0]&&g.nz===n[1]&&!has(artId)&&c.every(x=>{const p=x[0].split(',').map(Number);return V.getBlock(p[0],p[1],p[2])===B.CR_PAINT&&V.getBlock(p[0]-n[0],p[1],p[2]-n[1])===B.STONE;}));
      const before=recJ(art);ok('take it down by hand (survival): every cell goes at once',takeDown(artId));
      ok('  ... and exactly one drop of the same work comes out, data untouched',drops(artId).length===1&&drops(artId)[0].st.count===1&&recJ(art)===before);
      pickAll(artId);ok('  ... which Dan picks up (same id, count 1)',cnt(artId)===1&&drops(artId).length===0);}
    /* the other sizes */
    const wide=V.crNew('art',{w:128,h:64,d:'w'}),tall=V.crNew('art',{w:64,h:128,d:'t'});V.crFinish(wide,'Wide','Dan');V.crFinish(tall,'Tall','Dan');
    const wid=V.crItemId(wide),tid=V.crItemId(tall);V.crGiveDan({id:wid,count:1});V.crGiveDan({id:tid,count:1});
    hangAt(wid,o.x+3.5,o.z+0.5,o.x+6.01,o.y+1.5,o.z+0.5);const cw=cells(wid);
    ok('a 128x64 painting hangs 4 wide x 2 high, centred on the clicked cell (z-1..z+2)',cw.length===8&&cw.every(x=>x[1].w===4&&x[1].h===2)&&
      [...new Set(cw.map(x=>+x[0].split(',')[2]))].sort((a,b)=>a-b).join()===[o.z-1,o.z,o.z+1,o.z+2].join());
    takeDown(wid);pickAll(wid);
    hangAt(tid,o.x+3.5,o.z+0.5,o.x+6.01,o.y+2.5,o.z+0.5);const ct=cells(tid);
    ok('a 64x128 painting hangs 2 wide x 4 high (y-1..y+2 around the clicked cell)',ct.length===8&&ct.every(x=>x[1].w===2&&x[1].h===4)&&
      [...new Set(ct.map(x=>+x[0].split(',')[1]))].sort((a,b)=>a-b).join()===[o.y+1,o.y+2,o.y+3,o.y+4].join());
    takeDown(tid);pickAll(tid);ok('both come back to the inventory',has(wid)&&has(tid));
    /* refusals keep the item */
    tp(o.x+2.5,o.z-2.5,o.y);select(artId);
    aim(o.x+3.5,o.y-0.02,o.z-2.5);rclick();
    ok('right-click on the floor: "Paintings go on walls." and the painting stays in hand',/walls/.test(CR().CRF.toast)&&has(artId));
    for(let z=o.z+2;z<=o.z+5;z++)for(let y=o.y+1;y<=o.y+4;y++)if(!(z===o.z+3&&y===o.y+2))V.setBlock(o.x+5,y,z,B.STONE);
    hangAt(tid,o.x+3.5,o.z+3.5,o.x+6.01,o.y+2.5,o.z+3.5);
    ok('no room for 2x4 there: a "Not enough flat wall" toast and the painting is kept',/Not enough flat wall/.test(CR().CRF.toast)&&has(tid)&&cells(tid).length===0);
    for(let z=o.z+2;z<=o.z+5;z++)for(let y=o.y+1;y<=o.y+4;y++)V.setBlock(o.x+5,y,z,B.AIR);
    /* creative: still 1/1 */
    P.mode='c';hangAt(artId,o.x+3.5,o.z+0.5,o.x+6.01,o.y+1.5,o.z+0.5);
    ok('in creative a painting is used up too (works are never infinite)',cells(artId).length===4&&!has(artId));
    const c=cells(artId)[0][0].split(',').map(Number);aim(c[0]+0.5,c[1]+0.5,c[2]+0.5);V.MB.l=true;step(2);V.MB.l=false;step(3);
    ok('and breaking it in creative still gives it back (one drop)',cells(artId).length===0&&drops(artId).length===1);
    pickAll(artId);P.mode='s';});

  /* ===== 5. a disc through the record player ===== */
  let disc=0,discId=0;
  sec('record player',()=>{tp(o.x+0.5,o.z+0.5,o.y);give(B.CR_DECK,1);aim(o.x+2.5,o.y-0.02,o.z+2.5);rclick();
    ok('a Record Player goes down with its block entity',V.getBlock(o.x+2,o.y,o.z+2)===B.CR_DECK&&V.blockEnts.get((o.x+2)+','+o.y+','+(o.z+2)).t==='crdeck');
    emptyHand();aim(o.x+2.5,o.y+0.5,o.z+2.5);rclick();
    ok('right-click opens the music editor',V.crOn()==='music');
    const ctx=CR().CRF.ctx;disc=V.crStartWork(ctx,{d:{v:1,bpm:120,x:[1,2,3]}});discId=V.crItemId(disc);
    ok('a song in progress is a Demo Tape',V.DEFS[discId].name==='Demo Tape'&&V.crRec(disc).k==='song');
    V.crEndWork(ctx,'Loop One');esc();
    ok('Done makes ONE music disc for Dan and clears the record player',cnt(discId)===1&&V.DEFS[discId].name==='Music Disc: Loop One'&&ctx.be.id===0);});

  /* ===== 6. THE METADATA AUDIT: a painting and a disc through every inventory path ===== */
  const both=()=>cnt(artId)===1&&cnt(discId)===1;
  const keep=()=>recJ(art)+recJ(disc);let K='';
  sec('audit',()=>{K=keep();
    ok('works are stack:1: a second copy never merges into the slot',V.stackMax(artId)===1&&V.stackMax(discId)===1);
    /* split (right-click a 1-stack) and put back */
    V.openModal('inv');const sl=C.MODAL.slots.filter(s=>s.home==='inv');P.inv.forEach((s,i)=>{if(s&&s.id===artId&&i!==9){P.inv[9]=s;P.inv[i]=null;}});
    const s9=sl.find(s=>s.idx===9),s10=sl.find(s=>s.idx===10);if(P.inv[10]){P.inv[11]=P.inv[11]||P.inv[10];P.inv[10]=null;}
    C.slotClick(s9,true,false);const cur=C.getCursor();C.slotClick(s10,false,false);
    ok('right-click split of a 1-stack picks up the whole work (same id), and it puts down again',cur&&cur.id===artId&&cur.count===1&&!P.inv[9]&&P.inv[10]&&P.inv[10].id===artId&&!C.getCursor());
    C.sortInv();ok('sorting keeps both works',both());V.closeModal(true);
    /* a chest, through save and load */
    V.setBlock(o.x+1,o.y,o.z-3,B.CHEST);const kc=(o.x+1)+','+o.y+','+(o.z-3);V.ensureBE(o.x+1,o.y,o.z-3,'chest');V.openModal('chest',kc);
    for(const s of C.MODAL.slots.filter(s=>s.home==='inv'))if(s.get()&&(s.get().id===artId||s.get().id===discId))C.quickMove(s);
    const cb=V.blockEnts.get(kc);ok('shift-click moves both works into a chest',cb.inv.filter(s=>s&&(s.id===artId||s.id===discId)).length===2&&!has(artId)&&!has(discId));
    V.closeModal(true);const sv=JSON.parse(JSON.stringify(V.snapshot('cr-chest')));
    ok('the save carries the registry (cr) and the chest holds the ids',sv.cr&&sv.cr.w[art]&&sv.cr.w[disc]&&JSON.stringify(sv.be[kc]).includes('"id":'+artId));
    V.applySave(sv);V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;step(30);
    ok('after a reload the registry is identical and the defs exist before anything uses them',keep()===K&&V.DEFS[artId]&&V.DEFS[discId]&&C.ICONS[artId]&&C.ICONS[discId]);
    const cb2=V.blockEnts.get(kc);V.openModal('chest',kc);for(const s of C.MODAL.slots.filter(s=>s.home==='be'))if(s.get()&&(s.get().id===artId||s.get().id===discId))C.quickMove(s);V.closeModal(true);
    ok('... and both come back out of the chest',both()&&cb2.inv.every(s=>!s||(s.id!==artId&&s.id!==discId)));
    /* a furnace slot (beAdd) */
    V.setBlock(o.x+1,o.y,o.z-4,B.FURNACE);const kf=(o.x+1)+','+o.y+','+(o.z-4);V.ensureBE(o.x+1,o.y,o.z-4,'furnace');V.openModal('furnace',kf);
    const fin=C.MODAL.slots.filter(s=>s.home==='be')[0],ds=P.inv.findIndex(s=>s&&s.id===discId);C.setCursor(P.inv[ds]);P.inv[ds]=null;C.slotClick(fin,false,false);
    const fb=V.blockEnts.get(kf),inF=JSON.stringify([fb.in,fb.fuel]).includes('"id":'+discId);C.slotClick(fin,false,false);const back=C.getCursor();
    V.closeModal(true);ok('a furnace slot holds the disc and gives back the same one',inF&&back&&back.id===discId&&cnt(discId)===1);
    /* Q drop, no despawn, pickup */
    select(artId);
    aim(o.x+4,o.y+1,o.z+0.5);C.dropSel(false);step(3);const qd=drops(artId)[0];
    ok('Q drops the painting as an item entity with the same id',!!qd&&!has(artId));
    V.spawnDrop(P.x+1,P.y+1,P.z+1,{id:B.DIRT,count:1},0,0,0);const dd=V.entities[V.entities.length-1];
    qd.age=400;dd.age=400;step(3);ok('a work on the ground never despawns (a dirt drop of the same age does)',!qd.dead&&V.entities.includes(qd)&&(dd.dead||!V.entities.includes(dd)));
    pickAll(artId);ok('walking over it picks it up',both());
    /* death, respawn, keepInventory */
    V.GR.keepInv=false;P.mode='s';C.die();ok('death drops both works on the floor (data intact)',drops(artId).length===1&&drops(discId).length===1&&!has(artId)&&keep()===K);
    V.respawn();step(5);pickAll(artId);pickAll(discId);ok('after respawn Dan picks both up again',both());
    V.GR.keepInv=true;C.die();V.respawn();step(3);ok('with keepInventory they never leave the inventory',both());V.GR.keepInv=false;
    /* the creative palette */
    P.mode='c';V.openModal('creative');const pal=C.MODAL.slots.filter(s=>s.kind==='palette').map(s=>s.get()&&s.get().id);V.closeModal(true);P.mode='s';
    ok('the creative palette offers Easel, Record Player and Jukebox, never the painting cell or any work',[213,214,215].every(i=>pal.includes(i))&&!pal.includes(216)&&pal.every(i=>!(i>CRC.ID0)));
    ok('every path kept the registry byte-identical',keep()===K);});

  /* ===== 7. GC at load: unreferenced works go, anything referenced anywhere stays ===== */
  sec('gc',()=>{const orphan=V.crNew('art',{w:64,h:64,d:'o'});V.crFinish(orphan,'Nobody','Dan');
    const onFloor=V.crNew('song',{d:{v:1}});V.crFinish(onFloor,'Floor','Dan');V.spawnDrop(P.x+2,P.y+1,P.z,{id:V.crItemId(onFloor),count:1},0,0,0);
    const s=JSON.parse(JSON.stringify(V.snapshot('cr-gc')));V.applySave(s);V.GR.mobSpawn=false;step(20);
    ok('a work referenced nowhere in the save is dropped at load (GC '+CR().CRF.gc+')',!V.crRec(orphan)&&!V.DEFS[V.crItemId(orphan)]&&CR().CRF.gc===1);
    ok('a work that only exists as a drop on the ground is kept, and its drop is back',!!V.crRec(onFloor)&&drops(V.crItemId(onFloor)).length===1);
    ok('serials never repeat after GC (next > every saved n)',CR().CRN>onFloor);
    for(const e of drops(V.crItemId(onFloor)))C.removeEnt(e);});

  /* ===== 8. ENT_STASH: a work left on the ground in another dimension ===== */
  sec('stash',()=>{select(discId);C.dropSel(false);step(2);
    const px=P.x,py=P.y,pz=P.z;V.setDim('nether',px,90,pz);step(10);
    ok('going to the Nether stashes the disc drop (ENT_STASH.over)',(C.ENT_STASH.over||[]).some(e=>e.t==='drop'&&e.st.id===discId));
    const s=V.snapshot('cr-stash');ok('a save from the Nether keeps it (stash) and keeps its record',JSON.stringify(s.stash||{}).includes('"id":'+discId)&&s.cr.w[disc]);
    V.setDim('over',px,py,pz);step(25);pickAll(discId);ok('back home the drop is there and Dan picks it up',cnt(discId)===1);});

  /* ===== 9. Puppet Purgatory: strip, trunk, save inside, customs, trunk return ===== */
  sec('purgatory',()=>{if(typeof V.mpEnterNow!=='function'){skip('purgatory','PART 55 absent');return;}
    K=keep();V.mpDoorHere();step(5);V.mpEnterNow();step(30);const MP=V.getMP(),tk=MP.trunks.Dan,tb=tk&&V.blockEnts.get(tk);
    ok('entering purgatory moves both works into Dan\'s Stage Trunk with their ids',V.getDim()==='puppet'&&tb&&tb.t==='stash'&&tb.inv.some(s=>s&&s.id===artId)&&tb.inv.some(s=>s&&s.id===discId)&&!has(artId)&&!has(discId));
    if(!V.mpInfo().stubs.includes('2')){V.openModal('craft');const rs=C.MODAL.rset;V.closeModal(true);
      ok('inside purgatory the crafting set holds no creativity recipe',rs!==V.RECIPES&&rs.every(r=>![B.CR_EASEL,B.CR_DECK,B.CR_JUKE].includes(r.o)));}
    else skip('purgatory recipe set','P2 on its stub');
    const s=JSON.parse(JSON.stringify(V.snapshot('cr-purg')));V.applySave(s);V.GR.mobSpawn=false;step(30);
    const tb2=V.blockEnts.get(V.getMP().trunks.Dan);
    ok('save and reload inside: the trunk still holds both works and the registry is intact',V.getDim()==='puppet'&&tb2&&tb2.inv.some(q=>q&&q.id===artId)&&tb2.inv.some(q=>q&&q.id===discId)&&keep()===K);
    V.mpExitNow({abandon:true});step(10);try{const b=document.getElementById('presok');if(b&&b.onclick)b.onclick();}catch(e){}
    const tk2=V.getMP().trunks.Dan,p=tk2.split(',').map(Number);V.PREG.interact.pstash({x:p[0],y:p[1],z:p[2]},V.DEFS[B.PG_STRUNK]);
    for(const q of C.MODAL.slots.filter(q=>q.home==='be'))if(q.get())C.quickMove(q);V.closeModal(true);step(3);
    ok('customs leaves them alone and the trunk gives both back (same ids, same data)',V.getDim()==='over'&&both()&&keep()===K);});

  /* ===== 10. AI players never take, break or place creativity things ===== */
  sec('bots',()=>{V.setBrainMock(null);Object.assign(V.BRAIN,{mock:null,ok:false,off:true});if(!V.AGENTS.length||!V.AGENTS[0].e)V.agJoinAll(false);step(10);const a=V.AGENTS[0];if(!a){skip('bots','no agents');return;}
    const inv0=JSON.stringify(a.inv),led=JSON.stringify(a.led||null);
    ok('agGive refuses a work (returns the count, inventory and ledger untouched)',V.agGive(a,{id:artId,count:1},'pickup')===1&&JSON.stringify(a.inv)===inv0&&JSON.stringify(a.led||null)===led);
    V.spawnDrop(P.x+3,P.y+1,P.z,{id:B.DIRT,count:1},0,0,0);const dd=V.entities[V.entities.length-1];dd.age=1;
    const ad=(()=>{V.spawnDrop(P.x+3,P.y+1,P.z,{id:artId,count:1},0,0,0);return V.entities[V.entities.length-1];})();ad.age=1;
    const wasA=global.__vox.getAG().active;
    ok('agTryPickup leaves a work drop alone',V.agTryPickup(ad)===false&&!ad.dead);
    C.removeEnt(ad);C.removeEnt(dd);
    give(B.CR_JUKE,2);tp(o.x+0.5,o.z+0.5,o.y);aim(o.x+3.5,o.y-0.02,o.z-2.5);rclick();
    ok('agBreakBlock refuses an easel, a record player and a jukebox (the blocks stay)',[[o.x+2,o.y,o.z],[o.x+2,o.y,o.z+2],[o.x+3,o.y,o.z-3]].every(c=>V.agBreakBlock(a,c[0],c[1],c[2])===false&&V.getBlock(c[0],c[1],c[2])!==B.AIR));
    ok('bots never pick a creativity block as building material or a dig target',[213,214,215,216].every(i=>!C.agPlaceable(i))&&C.agBreaking(a,1/60,o.x+2,o.y,o.z)===false);
    V.agLeaveAll();step(5);});

  /* ===== 11. blocks that hold a work: break, load, refuse ===== */
  sec('holders',()=>{tp(o.x+0.5,o.z+0.5,o.y);const ek=(o.x+2)+','+o.y+','+o.z,eb=V.blockEnts.get(ek);
    aim(o.x+2.5,o.y+0.5,o.z+0.5);emptyHand();rclick();const w=V.crStartWork(CR().CRF.ctx,{w:128,h:64,d:'wip'});const wid=V.crItemId(w);esc();
    const easels0=drops(B.CR_EASEL).length;aim(o.x+2.5,o.y+0.5,o.z+0.5);boot.mine(V,step,40);
    ok('breaking an easel with a canvas on it (survival): the Unfinished Canvas AND the easel drop',V.getBlock(o.x+2,o.y,o.z)===B.AIR&&drops(wid).length===1&&drops(B.CR_EASEL).length===easels0+1&&!V.blockEnts.get(ek));
    pickAll(wid);pickAll(B.CR_EASEL);give(B.CR_EASEL,0);aim(o.x+2.5,o.y-0.02,o.z+0.5);rclick();
    select(wid);aim(o.x+2.5,o.y+0.5,o.z+0.5);rclick();
    const eb2=V.blockEnts.get(ek);ok('right-click an empty easel holding the canvas: it goes back on and the editor opens',eb2&&eb2.id===wid&&V.crOn()==='paint'&&!has(wid));esc();
    select(artId);rclick();
    ok('a finished painting is refused by an easel ("Hang it on a wall"), the painting stays in hand',/wall/.test(CR().CRF.toast)&&has(artId)&&eb2.id===wid&&!V.crOn());
    P.mode='c';emptyHand();V.MB.l=true;step(2);V.MB.l=false;step(3);P.mode='s';
    ok('breaking it in creative: the canvas still drops (no easel)',drops(wid).length===1&&V.getBlock(o.x+2,o.y,o.z)===B.AIR);pickAll(wid);
    /* the record player with a demo tape */
    aim(o.x+2.5,o.y+0.5,o.z+2.5);rclick();const t=V.crStartWork(CR().CRF.ctx,{d:{v:1}}),tid=V.crItemId(t);esc();boot.mine(V,step,75);
    ok('breaking a record player with a song on it drops the Demo Tape',drops(tid).length===1);pickAll(tid);});

  /* ===== 12. the jukebox ===== */
  sec('jukebox',()=>{const jx=o.x+3,jz=o.z-3,jk=jx+','+o.y+','+jz;tp(o.x+1.5,o.z-1.5,o.y);
    if(V.getBlock(jx,o.y,jz)!==B.CR_JUKE){give(B.CR_JUKE,2);aim(jx+0.5,o.y-0.02,jz+0.5);rclick();}
    const ev=[];V.CRREG.onJuke.push((k,b,op)=>ev.push(op));emptyHand();aim(jx+0.5,o.y+0.5,jz+0.5);rclick();
    ok('an empty jukebox right-clicked with nothing explains itself',/music disc/.test(CR().CRF.toast)&&!V.blockEnts.get(jk).id);
    const tape=P.inv.find(q=>q&&V.crRecOf&&V.crRecOf(q)&&V.crRecOf(q).k==='song'&&V.crRecOf(q).st==='wip');
    if(tape){select(tape.id);rclick();ok('a Demo Tape is refused ("finish it at a record player")',/record player/.test(CR().CRF.toast)&&has(tape.id));}
    select(discId);rclick();const jb=V.blockEnts.get(jk);
    ok('right-click with the disc: it goes in and plays (be.id, start clock, a play event)',jb.id===discId&&!has(discId)&&ev.includes('play')&&/Now playing/.test(CR().CRF.toast));
    ok('a playing jukebox keeps processCrea live (clock runs)',(()=>{const c=CR().CRF.clock;step(5);return CR().CRF.clock>c;})());
    rclick();ok('right-click again ejects the SAME disc into the inventory',jb.id===0&&cnt(discId)===1&&ev.includes('stop'));
    P.mode='c';select(discId);rclick();ok('creative inserts use the disc up as well',jb.id===discId&&!has(discId));P.mode='s';
    boot.mine(V,step,75);ok('breaking a playing jukebox drops the disc (and the jukebox)',drops(discId).length===1&&!V.blockEnts.get(jk));pickAll(discId);
    V.CRREG.onJuke.pop();});

  /* ===== 13. orphans: whatever destroys the block, the work comes out (the 0.5 s sweep) ===== */
  sec('orphans',()=>{tp(o.x+0.5,o.z+0.5,o.y);give(B.CR_EASEL,0);aim(o.x+2.5,o.y-0.02,o.z+0.5);rclick();emptyHand();aim(o.x+2.5,o.y+0.5,o.z+0.5);rclick();
    const w=V.crStartWork(CR().CRF.ctx,{w:64,h:64,d:'boom'}),wid=V.crItemId(w);
    ok('(an editor is open on the easel)',V.crOn()==='paint');
    V.setBlock(o.x+2,o.y,o.z,B.AIR);step(20);
    ok('the block vanishing under an open editor closes it and the canvas comes out',!V.crOn()&&drops(wid).length===1&&!V.blockEnts.get((o.x+2)+','+o.y+','+o.z));pickAll(wid);
    give(B.CR_EASEL,0);aim(o.x+2.5,o.y-0.02,o.z+0.5);rclick();select(wid);
    aim(o.x+2.5,o.y+0.5,o.z+0.5);rclick();esc();tp(o.x-0.5,o.z-4.5,o.y);
    C.explode0(o.x+2.5,o.y+0.5,o.z+0.5,1.5,false);step(20);
    ok('a TNT blast takes the easel, and the canvas still comes out',V.getBlock(o.x+2,o.y,o.z)!==B.CR_EASEL&&drops(wid).length===1);pickAll(wid);
    /* paintings: a missing cell, a missing wall */
    o=boot.studio(V,step,{dx:40,keep:1});const ai=P.inv.findIndex(q=>q&&q.id===artId);
    if(ai<0){const where=[];for(const [k,b] of V.blockEnts)if(JSON.stringify(b).includes('"id":'+artId))where.push(b.t+'@'+k);
      ok('the painting travelled with Dan to the new studio (drops '+drops(artId).map(e=>e.x.toFixed(1)+','+e.y.toFixed(1)+','+e.z.toFixed(1)).join(';')+' bes '+where.join(';')+' cursor '+JSON.stringify(C.getCursor())+' rec '+!!V.crRec(art)+' trace '+TRACE.join(' ')+' bots '+V.AGENTS.map(a=>a.inv.filter(Boolean).map(q=>q.id).join('.')).join('|')+' dead '+V.P.dead+')',false);return;}
    hangAt(artId,o.x+3.5,o.z+0.5,o.x+6.01,o.y+1.5,o.z+0.5);let c=cells(artId);const p=c[1][0].split(',').map(Number);
    V.setBlock(p[0],p[1],p[2],B.AIR);step(20);ok('one cell destroyed by anything: the whole painting comes down, one drop',cells(artId).length===0&&drops(artId).length===1);pickAll(artId);
    hangAt(artId,o.x+3.5,o.z+0.5,o.x+6.01,o.y+1.5,o.z+0.5);c=cells(artId);const q=c[0][0].split(',').map(Number);V.setBlock(q[0]+1,q[1],q[2],B.AIR);step(20);
    ok('the wall behind it removed: it falls off, one drop',cells(artId).length===0&&drops(artId).length===1);pickAll(artId);
    /* a painting whose wall lies in the next chunk, at the moment that chunk is not loaded: it must wait, not fall */
    {const X=(Math.floor(P.x/16)+1)*16,Z=Math.floor(P.z),Y=o.y;V.forceChunksNear(X,Z);step(10);
      for(let z=Z-2;z<=Z+3;z++){for(let y=Y-1;y<=Y+4;y++){V.setBlock(X,y,z,B.STONE);for(let x=X-4;x<X;x++)V.setBlock(x,y,z,y===Y-1?B.STONE:B.AIR);}}
      hangAt(artId,X-3.5,Z+0.5,X+0.01,Y+1.5,Z+0.5);const c=cells(artId);const ok1=c.length===4&&c.every(q=>+q[0].split(',')[0]===X-1);
      const ck=Math.floor(X/16)+','+Math.floor(Z/16),ch=V.chunks.get(ck);V.chunks.delete(ck);V.crSweep();const stay=cells(artId).length===4&&drops(artId).length===0;
      V.chunks.set(ck,ch);V.crSweep();
      ok('a painting whose wall chunk is unloaded stays hung (the sweep waits for every cell and wall)',ok1&&stay&&cells(artId).length===4);
      takeDown(artId);pickAll(artId);}
    /* a vanilla chest placed on a stale entity before the sweep */
    give(B.CR_DECK,1);aim(o.x+2.5,o.y-0.02,o.z+2.5);rclick();emptyHand();aim(o.x+2.5,o.y+0.5,o.z+2.5);rclick();
    const t=V.crStartWork(CR().CRF.ctx,{d:{v:2}}),tid=V.crItemId(t);esc();
    V.setBlock(o.x+2,o.y,o.z+2,B.CHEST);const be=V.ensureBE(o.x+2,o.y,o.z+2,'chest');
    ok('a chest on top of a stale record-player entity: the tape comes out at once and the chest is a real chest',be.t==='chest'&&be.inv.length===27&&drops(tid).length===1);pickAll(tid);});

  /* ===== 14. caps and titles ===== */
  sec('caps',()=>{ok('titles: control chars and <>&"\\` stripped, spaces collapsed, 24 chars max',V.crTitle(' a\u0001b<c>d&e"f  g ')==='abcdef g'&&V.crTitle('x'.repeat(40)).length===24);
    ok('only the three canvas sizes exist',V.crNew('art',{w:32,h:32})===0&&V.crNew('pic',{})===0);
    const n=V.crNew('song',{d:{v:1}});ok('a payload over the cap is refused, the old data kept',V.crSetData(n,'x'.repeat(CRC.MAX_D.song+1))===false&&JSON.stringify(V.crRec(n).d)==='{"v":1}');
    const big='y'.repeat(5900),made=[];let m;while((m=V.crNew('song',{d:big})))made.push(m);
    ok('the registry byte cap stops new works ('+made.length+' made, '+V.crBytes()+' B <= 600,000) with a toast',made.length>=90&&V.crBytes()<=CRC.MAX_BYTES&&/gallery is full/.test(CR().CRF.toast));
    for(const k of made)V.crDiscard(k);V.crDiscard(n);
    const few=[];for(let i=0;i<CRC.MAX_WORKS+2;i++){const k=V.crNew('art',{w:64,h:64,d:''});if(!k)break;few.push(k);}
    ok('the work-count cap ('+CRC.MAX_WORKS+') stops new works',V.crInfo().works===CRC.MAX_WORKS&&/gallery is full/.test(CR().CRF.toast));
    for(const k of few)V.crDiscard(k);});

  /* ===== 15. live bots: griefing on, three bots loose for 400 frames in a fresh studio around an easel, a record player, a hung
     painting, a playing jukebox and a work on the floor. Nothing may crash, no bot may end up holding a work, everything stays. ===== */
  sec('live bots',()=>{const a=V.AGENTS[0];V.setBrainMock(null);Object.assign(V.BRAIN,{mock:null,ok:false,off:true});
    const o2=boot.studio(V,step,{dx:-70,keep:1});V.GR.botGrief=true;
    give(B.CR_EASEL,0);aim(o2.x+2.5,o2.y-0.02,o2.z+0.5);rclick();give(B.CR_DECK,1);aim(o2.x+2.5,o2.y-0.02,o2.z+2.5);rclick();
    give(B.CR_JUKE,2);aim(o2.x+3.5,o2.y-0.02,o2.z-2.5);rclick();
    const pw=V.crNew('art',{w:64,h:64,d:'p'});V.crFinish(pw,'Bot Bait','Dan');const pid=V.crItemId(pw);V.crGiveDan({id:pid,count:1});
    const sw=V.crNew('song',{d:{v:1}});V.crFinish(sw,'Bot Tune','Dan');const sid=V.crItemId(sw);V.crGiveDan({id:sid,count:1});
    select(sid);aim(o2.x+3.5,o2.y+0.5,o2.z-2.5);rclick();
    const hang=(()=>{tp(o2.x+3.5,o2.z+0.5,o2.y);select(pid);aim(o2.x+6.01,o2.y+1.5,o2.z+0.5);rclick();return cells(pid).length;})();tp(o2.x+0.5,o2.z+0.5,o2.y);
    const fw=V.crNew('art',{w:64,h:64,d:'f'});V.crFinish(fw,'Floor Piece','Dan');const fid=V.crItemId(fw);V.spawnDrop(o2.x+1.5,o2.y+0.5,o2.z-1.5,{id:fid,count:1},0,0,0);
    if(!V.AGENTS.length||!V.AGENTS[0].e)V.agJoinAll(false);step(5);
    for(const b of V.AGENTS)if(b.e){b.e.x=o2.x+1.5+V.AGENTS.indexOf(b);b.e.z=o2.z-1.5;b.e.y=o2.y;}
    let crash=null;try{step(400);}catch(e){crash=e;}
    const botWorks=V.AGENTS.some(b=>b.inv.some(q=>q&&q.id>CRC.ID0));
    ok('three bots loose for 400 frames (griefing on): no crash, no bot holds a work'+(crash?' ('+String(crash.message).slice(0,80)+')':''),!crash&&!botWorks&&hang===4);
    const jb=V.blockEnts.get((o2.x+3)+','+o2.y+','+(o2.z-3));
    ok('  ... the easel, record player, jukebox (still playing), the hung painting and the floor work are all still there',
      V.getBlock(o2.x+2,o2.y,o2.z)===B.CR_EASEL&&V.getBlock(o2.x+2,o2.y,o2.z+2)===B.CR_DECK&&jb&&jb.id===sid&&cells(pid).length===4&&drops(fid).length===1);
    V.GR.botGrief=false;V.agLeaveAll();step(5);});

  /* ===== 15b. fix lead (v6.2 review): works far from Dan, the Big Dingle, a world re-saved by v6.1 ===== */
  const mkArt=t=>{const n=V.crNew('art',{w:64,h:64,d:'f'});V.crFinish(n,t,'Dan');return V.crItemId(n);};
  const mkDisc=t=>{const n=V.crNew('song',{d:{v:1}});V.crFinish(n,t,'Dan');return V.crItemId(n);};
  const ckOf=(x,z)=>Math.floor(x/16)+','+Math.floor(z/16),loaded=(x,z)=>V.chunks.has(ckOf(x,z));
  const purge=()=>{for(const e of V.entities)if(e.t==='mob'&&!e.dead&&!e.bot&&Math.hypot(e.x-V.P.x,e.z-V.P.z)<80){e.hurtT=0;V.hurtMob(e,99999,0,0);}};
  /* a work lying on the ground at x,z (Dan walks there, leaves it 6 blocks away to settle, comes back): its resting y */
  const lay=(id,x,z)=>{V.forceChunksNear(x,z);step(25);const y=V.surfaceTop(x,z)+1;tp(x-6.5,z+0.5,V.surfaceTop(x-7,z)+1);purge();
    V.spawnDrop(x+0.5,y+0.3,z+0.5,{id,count:1},0,0,0);step(40);const e=drops(id)[0];return e?e.y:-1;};
  sec('far drops',()=>{V.GR.god=false;V.GR.keepInv=false;V.GR.mobSpawn=false;P.mode='s';const R=V.getRD(),far=(R+4)*16;
    tp(o.x+0.5,o.z+0.5,o.y);const hx=Math.floor(P.x),hz=Math.floor(P.z),hy=P.y;
    /* 1. save + load with a work on the ground far away: its chunk is not loaded for a while after the load */
    const fid=mkArt('Far Away'),fx=hx+far,fz=hz,y0=lay(fid,fx,fz);tp(hx+0.5,hz+0.5,hy);step(200);
    const s=JSON.parse(JSON.stringify(V.snapshot('cr-far')));V.applySave(s);V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;step(80);
    const e1=drops(fid)[0],gone=!loaded(fx,fz);
    ok('a work on the ground '+far+' blocks away keeps its height across a save and load while its chunk is unloaded (y '+y0.toFixed(2)+' -> '+(e1?e1.y.toFixed(2):'none')+')',
      y0>1&&gone&&!!e1&&Math.abs(e1.y-y0)<0.05);
    tp(fx+0.5,fz+0.5,y0+1);step(30);pickAll(fid);ok('  ... and Dan walks there and picks it up',cnt(fid)===1);
    /* 2. a stashed drop far from where Dan comes back (ENT_STASH across a dimension change) */
    const sid=mkArt('Stashed'),sx=hx-far,y1=lay(sid,sx,hz);tp(hx+0.5,hz+0.5,hy);step(200);
    V.setDim('nether',hx+0.5,90,hz+0.5);step(10);V.setDim('over',hx+0.5,hy,hz+0.5);step(80);
    const e2=drops(sid)[0];
    ok('a work left on the ground far from Dan survives a trip to the Nether and back (stashed, restored, still at y '+(e2?e2.y.toFixed(2):'none')+', was '+y1.toFixed(2)+')',
      !loaded(sx,hz)&&!!e2&&Math.abs(e2.y-y1)<0.05);
    pickAll(sid);ok('  ... picked up',cnt(sid)===1);
    /* 3. Dan dies far from spawn carrying a painting and a disc, respawns, waits, walks back */
    const sp=V.P.spawn,dx=Math.floor(sp[0])+Math.max(250,far),dz=Math.floor(sp[2]);V.forceChunksNear(dx,dz);step(25);tp(dx+0.5,dz+0.5,V.surfaceTop(dx,dz)+1);step(20);purge();
    const pid=mkArt('Last Will'),did=mkDisc('Swan Song');V.crGiveDan({id:pid,count:1});V.crGiveDan({id:did,count:1});step(2);
    /* v6.3 (MZ) rig repair: the death scatter is random (Math.random is unseeded here) and this spot is a 1-block ledge, so a drop can still be
       falling at frame 30 (probe: the disc at y 28.14, vy -4.3 on frame 28, landing on frame 29; the gate's failure read 28.6 mid-fall). Record
       where they came to REST (at least 30 frames as before, then until both are still for 5 frames, at most 150); the assertion is unchanged */
    C.die();step(30);{let still=0,last='';for(let f=0;f<120&&still<5;f++){const q=[pid,did].map(i=>{const e=drops(i)[0];return e?e.y.toFixed(3)+':'+(e.vy||0).toFixed(3):'-';}).join('|');
      still=(q===last&&!/:-?[1-9]|:-?0\.[0-9]*[1-9]/.test(q))?still+1:0;last=q;step(1);}}
    const at=[pid,did].map(i=>{const e=drops(i)[0];return e?e.y:-1;});V.respawn();step(300);
    const after=[pid,did].map(i=>{const e=drops(i)[0];return e?e.y:-1;});
    ok('Dan dies '+Math.max(250,far)+' blocks from spawn with a painting and a disc, respawns and waits 12 s: both still lie where he fell (y '+at.map(v=>v.toFixed(1)).join(',')+' -> '+after.map(v=>v.toFixed(1)).join(',')+')',
      !loaded(dx,dz)&&at.every(v=>v>1)&&after.every((v,i)=>Math.abs(v-at[i])<0.05));
    tp(dx+0.5,dz+0.5,at[0]+1);step(30);pickAll(pid);pickAll(did);
    ok('  ... he walks back and gets both',cnt(pid)===1&&cnt(did)===1);
    tp(o.x+0.5,o.z+0.5,o.y);step(30);});

  sec('big dingle',()=>{V.GR.god=true;const o3=boot.studio(V,step,{dx:400,keep:1});
    const cellsOf=id=>{const r=[];for(const [k,b] of V.blockEnts)if(b.t==='crpaint'&&b.id===id)r.push(k);return r;};
    give(B.CR_EASEL,0);aim(o3.x+2.5,o3.y-0.02,o3.z+0.5);rclick();
    const ek3=(o3.x+2)+','+o3.y+','+o3.z,cn=V.crStartWork(V.crCtx('paint',o3.x+2,o3.y,o3.z,V.blockEnts.get(ek3)),{w:64,h:64,d:'c'}),cid=V.crItemId(cn);   /* no editor: stub-proof */
    give(B.CR_JUKE,2);aim(o3.x+3.5,o3.y-0.02,o3.z-2.5);rclick();const did=mkDisc('Boom Box');V.crGiveDan({id:did,count:1});select(did);
    aim(o3.x+3.5,o3.y+0.5,o3.z-2.5);rclick();
    const pid=mkArt('Ground Zero');V.crGiveDan({id:pid,count:1});tp(o3.x+3.5,o3.z+0.5,o3.y);select(pid);aim(o3.x+6.01,o3.y+1.5,o3.z+0.5);rclick();
    const fid=mkArt('Floor Piece');V.spawnDrop(o3.x+1.5,o3.y+0.5,o3.z-1.5,{id:fid,count:1},0,0,0);step(10);
    const eb=V.blockEnts.get((o3.x+2)+','+o3.y+','+o3.z),jb=V.blockEnts.get((o3.x+3)+','+o3.y+','+(o3.z-3));
    const set=!!eb&&eb.id===cid&&!!jb&&jb.id===did&&cellsOf(pid).length===4&&drops(fid).length===1;
    tp(o3.x+0.5-30,o3.z+0.5,o3.y+25);P.mode='c';P.flying=true;step(5);       /* Dan watches from 30 m up the road (god mode) */
    V.megaNuke(o3.x+2.5,o3.y+0.5,o3.z+0.5);step(90);
    const ids=[cid,did,pid,fid],one=ids.map(i=>drops(i).length+cnt(i)),beLeft=ids.filter(i=>[...V.blockEnts.values()].some(b=>b&&b.id===i)||[...CR().CRBE.values()].some(b=>b&&b.id===i));
    ok('the Big Dingle (megaNuke) vaporises the easel, the jukebox, the wall and the floor, and every work comes out once: canvas, disc, painting, floor work ('+one.join(',')+')',
      set&&one.every(v=>v===1)&&beLeft.length===0&&ids.every(i=>!!V.crRec(V.crWorkN(i))));
    const s=JSON.parse(JSON.stringify(V.snapshot('cr-nuke')));V.applySave(s);V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;step(30);
    ok('  ... and they survive a save and load (none collected as garbage, gc '+CR().CRF.gc+')',ids.every(i=>!!V.crRec(V.crWorkN(i))&&drops(i).length+cnt(i)===1));
    for(const i of ids)pickAll(i);ok('  ... and Dan collects all four from the crater',ids.every(i=>cnt(i)===1));
    P.mode='s';P.flying=false;V.GR.god=false;o=boot.studio(V,step,{dx:-400,keep:1});});

  sec('downgraded save',()=>{tp(o.x+0.5,o.z+0.5,o.y);
    const an=V.crNew('art',{w:64,h:64,d:'q'});V.crFinish(an,'Old Friend','Dan');const aid=V.crItemId(an);V.crGiveDan({id:aid,count:1});
    const did=mkDisc('Old Tune'),dn=V.crWorkN(did);V.crGiveDan({id:did,count:1});
    const wn=V.crNew('art',{w:64,h:64,d:'w'}),wid=V.crItemId(wn);V.spawnDrop(o.x+3.5,o.y+0.5,o.z+0.5,{id:wid,count:1},0,0,0);step(5);
    const s=JSON.parse(JSON.stringify(V.snapshot('cr-v61')));delete s.cr;           /* what v6.1's autosave writes back: no cr key, every id kept */
    const top=Math.max(an,dn,wn);let err=null;try{V.applySave(s);V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;step(20);}catch(e){err=e;}
    ok('a v6.2 world re-saved by v6.1 (no registry, work ids everywhere) loads and plays without throwing'+(err?' ('+String(err.message).slice(0,80)+')':''),!err);
    const L=[aid,did,wid].map(i=>V.DEFS[i]);
    ok('every orphaned work id gets a placeholder def ("Lost Work", stack 1, hidden, crw) and no record; the serial moves past them',
      L.every(d=>d&&d.item&&d.stack===1&&d.hide&&d.crw&&/^Lost Work/.test(d.name))&&[an,dn,wn].every(n=>!V.crRec(n))&&CR().CRN>top);
    let e2=null;try{select(aid);V.refreshHand();C.getIcon(aid);C.getIcon(did);C.getIcon(wid);V.openModal('inv');step(2);V.closeModal(true);step(2);}catch(e){e2=e;}
    ok('the inventory opens, every icon draws and a Lost Work in hand renders (no undefined def anywhere)'+(e2?' ('+String(e2.message).slice(0,80)+')':''),!e2);
    tp(o.x+3.5,o.z+0.5,o.y);select(aid);aim(o.x+6.01,o.y+1.5,o.z+0.5);rclick();
    ok('a Lost Work cannot be hung (it has no picture) and stays in the hand',cnt(aid)===1&&![...V.blockEnts.values()].some(b=>b&&b.t==='crpaint'&&b.id===aid));
    const nn=V.crNew('art',{w:64,h:64,d:'z'});V.crGiveDan({id:V.crItemId(nn),count:1});
    ok('the next new work takes a fresh id past every orphan (never a forged copy of a lost one)',nn>top&&!!V.crRec(nn)&&V.DEFS[V.crItemId(nn)].name!==L[0].name);
    const s2=JSON.parse(JSON.stringify(V.snapshot('cr-v61b'))),j2=JSON.stringify(s2);
    ok('saved again: the Lost Work stacks are kept (nothing deleted), the registry holds only the new work',j2.includes('"id":'+aid)&&j2.includes('"id":'+did)&&!!s2.cr&&Object.keys(s2.cr.w).join()===String(nn));
    V.applySave(s2);V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;step(10);
    ok('  ... and that save loads again with the same placeholders',[aid,did,wid].every(i=>V.DEFS[i]&&/^Lost Work/.test(V.DEFS[i].name))&&!!V.crRec(nn));
    {const i=V.P.inv.findIndex(q=>q&&q.id===V.crItemId(nn));if(i>=0)V.P.inv[i]=null;V.crDiscard(nn);V.refreshHand();}});

  /* ===== 16. a new world inherits nothing ===== */
  sec('reset',()=>{const ids=boot.works(V).map(w=>w.id).concat(V.getCRLOST?[...V.getCRLOST()].map(n=>V.crItemId(n)):[]);V.startNewWorld('crnew','42','s');V.GR.snail=false;V.GR.mobSpawn=false;step(40);
    ok('a new world: empty registry, no work defs (placeholders included) or icons, no block entities, nothing live',V.crInfo().works===0&&ids.every(i=>!V.DEFS[i]&&!C.ICONS[i])&&CR().CRBE.size===0&&!CR().CRF.live&&!V.crOn()&&(!V.getCRLOST||V.getCRLOST().size===0));});
});
