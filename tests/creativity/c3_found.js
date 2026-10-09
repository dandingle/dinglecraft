/* c3_found.js (found works, gate x1): Dan's own paintings and discs as VERY rare loot (src/creativity/c3_found.js).
   The data (8 works copied byte for byte from Dan's world, md5-pinned; the blank 'Untitled' left out), the roll (a pure hash of the
   world seed and the chest cell: 1 in 40, even picks, no Math.random, so the loot stream is unchanged), the real lootFill hook (a hit,
   a miss, a forced find of every work), minting through the registry (fresh 1/1 works by Dan Dingle, equal to the source), a found
   painting taken out of its chest, hung and taken down, a found disc played in a jukebox (its note sprite; rendered offline, never
   heard), bots refusing them, the caps (works, bytes to the byte, a full chest: skipped, no toast), a save round trip, and Puppet
   Purgatory (never there). */
'use strict';
const boot=require('../lib/c_boot.js'),{skip}=boot,ok=(n,c)=>{if(c&&process.env.C3_VERBOSE)console.log('ok   '+n);return boot.ok(n,c);};
const crypto=require('crypto');
const V=boot({seed:56});if(typeof V.getCRFD==='function')V.getCRFD().off=false;   /* c_boot turns finds off for every other suite */
const step=boot.stepper(600000);
const md5=s=>crypto.createHash('md5').update(s).digest('hex');
/* [title, kind, w, h, md5 of JSON.stringify(payload)] in CR_FOUND order: Dan's registry works 1-7 and 10, taken from his save */
const PINS=[['my art','art',64,128,'4e34917f1b3ae01718cf0d31d2d395bc'],['me','art',64,64,'d4c87d991d2b4020c6a2ba145805567a'],
  ['seems to be a person','art',64,64,'437fbff54c918db2666196f6eefee623'],['dandingle.store','art',128,64,'044b956727e9737986051ea241627a95'],
  ['S','art',64,128,'e65dd5b9fa35701f9e2f66161cdb030a'],['BATEHOVEN IS HALOUS','song',0,0,'748dd89c0a29fc5891026b6b64e7af2d'],
  ['MALGORATH IM COMING FOR','song',0,0,'dd84badb60fa27fc780a8b67e50867a4'],['Mona McLarthy','art',64,128,'4fd93ec4b222fba432225d756dba93f0']];

boot.run(async()=>{
  const F=V.CR_FOUND,CRC=V.CRC,B=V.B,C=V.crCore(),CR=()=>V.getCR(),FD=()=>V.getCRFD(),LC=V.crFoundCore().lootChest;
  const R0=Math.random;
  const drawsOf=f=>{let n=0;Math.random=function(){n++;return R0.apply(this,arguments);};try{f();}finally{Math.random=R0;}return n;};
  const workIds=be=>be?be.inv.filter(s=>s&&V.crWorkN(s.id)).map(s=>s.id):[];
  const recOf=id=>V.crRec(V.crWorkN(id));
  const has=id=>V.P.inv.some(s=>s&&s.id===id);
  const cnt=id=>V.P.inv.reduce((n,s)=>n+(s&&s.id===id?s.count:0),0);
  const drops=id=>V.entities.filter(e=>e.t==='drop'&&!e.dead&&e.st.id===id);
  const tp=(x,z,y)=>{const P=V.P;P.x=x;P.z=z;if(y!=null)P.y=y;P.vx=P.vy=P.vz=0;P.fallD=0;step(2);};
  const aim=(x,y,z)=>boot.aim(V,x,y,z),rclick=()=>boot.rclick(V,step);
  const select=id=>{const P=V.P;let i=P.inv.findIndex(q=>q&&q.id===id);if(i<0)return false;if(i>8){const t=P.inv[8];P.inv[8]=P.inv[i];P.inv[i]=t;i=8;}
    P.sel=i;V.refreshHand();return true;};
  const emptyHand=()=>{const P=V.P;let i=P.inv.findIndex((q,k)=>!q&&k<9);if(i<0){const e=P.inv.findIndex((q,k)=>!q&&k>8);i=0;if(e>0)P.inv[e]=P.inv[0];P.inv[0]=null;}
    P.sel=i;V.refreshHand();};
  const pickAll=id=>{const P=V.P,x=P.x,y=P.y,z=P.z;let moved=false;for(const e of drops(id)){tp(e.x,e.z,Math.floor(e.y));step(20);moved=true;}if(moved)tp(x,z,y);};
  const takeOut=(key,id)=>{V.openModal('chest',key);for(const s of C.MODAL.slots.filter(s=>s.home==='be'))if(s.get()&&s.get().id===id)C.quickMove(s);V.closeModal(true);return cnt(id)===1;};
  const forced=(x,y,z,pick)=>{FD().force=1;FD().pick=pick==null?-1:pick;try{LC(x,y,z,false);}finally{FD().force=0;FD().pick=-1;}return V.blockEnts.get(x+','+y+','+z);};

  /* ===== 1. the data: Dan's works, byte for byte ===== */
  ok('CR_FOUND holds Dan\'s 8 works in registry order (1-7, 10): 6 paintings and 2 discs; the blank Untitled is left out',
    Array.isArray(F)&&F.length===8&&F.map(f=>f.t).join('|')===PINS.map(p=>p[0]).join('|')&&F.filter(f=>f.k==='art').length===6&&!F.some(f=>/^Untitled/.test(f.t)));
  const badPin=F.map((f,i)=>{const p=PINS[i];return f.k===p[1]&&(f.k!=='art'||(f.w===p[2]&&f.h===p[3]))&&md5(JSON.stringify(f.d))===p[4]?null:f.t;}).filter(Boolean);
  ok('every payload is byte-identical to Dan\'s save (md5 pins), with its kind and size'+(badPin.length?' ('+badPin.join(', ')+')':''),badPin.length===0);
  const badData=F.filter(f=>{if(f.k==='art'){const px=V.crArtDecode(f.d,f.w,f.h);return !CRC.SIZES.some(s=>s[0]===f.w&&s[1]===f.h)||px.length!==f.w*f.h||V.crArtEmpty(px)||f.d===V.crArtBlank(f.w,f.h);}
    return !V.crSongValid(JSON.parse(JSON.stringify(f.d)));}).concat(F.filter(f=>JSON.stringify(f.d).length>CRC.MAX_D[f.k]||V.crTitle(f.t)!==f.t)).map(f=>f.t);
  ok('paintings decode to real pixels at a legal size, discs are valid songs, every payload and title fits the registry caps'+(badData.length?' ('+badData.join(', ')+')':''),badData.length===0);
  ok('the source data is frozen all the way down, the credit is Dan Dingle and the rate is 1 chest in 40',Object.isFrozen(F)&&F.every(f=>Object.isFrozen(f)&&
    (typeof f.d==='string'||(Object.isFrozen(f.d)&&Object.isFrozen(f.d.tr)&&f.d.tr.every(t=>Object.isFrozen(t)))))&&V.CRFC.BY==='Dan Dingle'&&V.CRFC.RATE===40);
  {const p16=boot.readSrc('features/p16_xp_enchanting_dungeon.js'),a=p16.indexOf('function lootFill('),b=p16.indexOf('\nfunction ',a+1),lf=a>=0&&b>a?p16.slice(a,b):'';
   ok('lootFill calls crFoundRoll(be,x,y,z) once, as its last statement (after the gun roll, which may overwrite any slot)',
     p16.split('crFoundRoll(').length===2&&/\n  crFoundRoll\(be,x,y,z\);[^\n]*\n\}$/.test(lf));
   const ord=boot.readSrc('ORDER.txt').split('\n').map(s=>s.trim()).filter(s=>s&&s[0]!=='#'),i=ord.indexOf('creativity/c3_found.js');
   ok('src/ORDER.txt lists creativity/c3_found.js once, right after the last creativity file (before PART 55)',
     i>0&&ord.lastIndexOf('creativity/c3_found.js')===i&&ord[i-1]==='creativity/c2_ui.js'&&ord[i+1]==='purgatory/p0_contract.js');}

  /* ===== 2. the roll: a pure hash of the seed and the chest cell ===== */
  {const cells=[];for(let i=0;i<4000;i++)cells.push([100+(i%40),40,-60+Math.floor(i/40)]);
   const sig=()=>cells.map(c=>{const r=V.crFoundOdds(c[0],c[1],c[2]);return r.hit?String(r.pick):'.';}).join('');
   const world=sd=>{V.startNewWorld('crf'+sd,sd,'s');V.GR.mobSpawn=false;step(2);return sig();};
   const a1=world('1111'),b=world('2222'),a2=world('1111');
   ok('the same world seed always rolls the same chests the same way; another seed rolls differently',a1===a2&&a1!==b&&/\d/.test(a1)&&/\d/.test(b));}
  const o=boot.studio(V,step,{name:'crfound',seed:'5656'});
  {let hits=0;const N=40000,pk=new Array(F.length).fill(0);
   const d=drawsOf(()=>{for(let i=0;i<N;i++){const r=V.crFoundOdds(o.x-100+(i%200),o.y+(i%7),o.z-100+Math.floor(i/200));if(r.hit){hits++;pk[r.pick]++;}}});
   ok('the roll is a pure hash: '+N+' chest cells rolled, Math.random drawn '+d+' times',d===0);
   ok('about 1 chest in 40 hits ('+hits+'/'+N+' = '+(hits/N*100).toFixed(2)+'%, expected 2.50%)',hits/N>0.021&&hits/N<0.029);
   ok('every found work turns up, about evenly ('+pk.join(',')+')',pk.every(c=>c>hits/F.length*0.6&&c<hits/F.length*1.4));
   ok('the same chest cell in the same world always rolls the same way',(()=>{for(let i=0;i<2000;i++){const x=o.x+(i%40),z=o.z+Math.floor(i/40),a=V.crFoundOdds(x,o.y+2,z),b=V.crFoundOdds(x,o.y+2,z);
     if(a.u!==b.u||a.hit!==b.hit||a.pick!==b.pick)return false;}return true;})());}

  /* ===== 3. the real lootFill hook: a miss, a hit, and the loot RNG stream ===== */
  const scan=want=>{for(let dz=-20;dz<=20;dz++)for(let dx=-20;dx<=20;dx++){const x=o.x+dx,y=o.y+10,z=o.z+dz;if(!C.chunkAt(x,z))continue;
    const r=V.crFoundOdds(x,y,z);if(r.hit===want)return [x,y,z,r];}return null;};
  const HC=scan(true),MC=scan(false);let natural=0;
  if(!HC||!MC)ok('found a hitting and a missing chest cell near the studio',false);
  else{const w0=V.crInfo().works,f0=FD().finds;   /* world generation may already have found one: count from here */
    const dMiss=drawsOf(()=>LC(MC[0],MC[1],MC[2],false)),bm=V.blockEnts.get(MC.slice(0,3).join(','));
    ok('a loot chest on a missing cell: normal loot, no work, the registry untouched',V.getBlock(MC[0],MC[1],MC[2])===B.CHEST&&bm&&bm.inv.some(Boolean)&&workIds(bm).length===0&&V.crInfo().works===w0);
    const dHit=drawsOf(()=>LC(HC[0],HC[1],HC[2],false)),bh=V.blockEnts.get(HC.slice(0,3).join(',')),ih=workIds(bh),rh=ih.length===1?recOf(ih[0]):null;
    natural=ih[0]||0;
    ok('a loot chest on a hitting cell gets exactly ONE found work, the one its hash picks ('+F[HC[3].pick].t+'), next to its normal loot',
      ih.length===1&&!!rh&&rh.t===F[HC[3].pick].t&&V.crInfo().works===w0+1&&bh.inv.filter(Boolean).length>1&&FD().last&&FD().last.id===ih[0]&&FD().finds===f0+1);
    ok('the loot RNG stream is unchanged: a plain chest draws exactly 16 Math.random on a miss and on a find ('+dMiss+', '+dHit+')',dMiss===16&&dHit===16);}

  /* ===== 4. a forced find of every work: minted fresh through the registry, equal to the source ===== */
  const FOUND=[];
  for(let i=0;i<F.length;i++){const x=o.x-1+i,y=o.y+12,z=o.z+9,n0=CR().CRN,be=forced(x,y,z,i),ids=workIds(be);
    FOUND.push({i,key:x+','+y+','+z,id:ids[0]||0,n:ids.length===1?V.crWorkN(ids[0]):0,n0});}
  const badMint=FOUND.filter(q=>{const f=F[q.i],r=V.crRec(q.n),d=V.DEFS[q.id];
    return !(q.n===q.n0&&r&&r.k===f.k&&r.st==='done'&&r.t===f.t&&r.by==='Dan Dingle'&&(f.k!=='art'||(r.w===f.w&&r.h===f.h))&&
      JSON.stringify(r.d)===JSON.stringify(f.d)&&md5(JSON.stringify(r.d))===PINS[q.i][4]&&(f.k==='art'||(r.d!==f.d&&!Object.isFrozen(r.d))));}).map(q=>F[q.i].t);
  ok('a forced roll on each chest mints that work as a fresh finished registry work (the next serial), by Dan Dingle, data equal to the source'+
    (badMint.length?' ('+badMint.join(', ')+')':''),badMint.length===0);
  const badDef=FOUND.filter(q=>{const f=F[q.i],d=V.DEFS[q.id];return !(d&&d.item&&d.stack===1&&d.hide&&d.crw===q.n&&d.crst==='done'&&
    d.name===(f.k==='art'?'Painting: ':'Music Disc: ')+f.t&&C.ICONS[q.id]&&V.stackMax(q.id)===1&&V.crBotNo({id:q.id,count:1}));}).map(q=>F[q.i].t);
  ok('each is a normal work item: "Painting: <title>" or "Music Disc: <title>", stack 1, hidden from the palette, an icon, never for bots'+
    (badDef.length?' ('+badDef.join(', ')+')':''),badDef.length===0);
  ok('every find is its own 1/1 work (8 distinct ids in the dynamic band) and the forced rolls are used up',new Set(FOUND.map(q=>q.id)).size===8&&
    FOUND.every(q=>q.id===CRC.ID0+q.n)&&FD().force===0&&FD().pick===-1);
  {const be=forced(o.x+8,o.y+12,o.z+9,0),ids=workIds(be),r2=ids.length===1?recOf(ids[0]):null,r1=V.crRec(FOUND[0].n);
   ok('finding the same work twice gives two separate 1/1 works with equal data (never a duplicated stack)',ids.length===1&&ids[0]!==FOUND[0].id&&!!r2&&!!r1&&
     JSON.stringify(r2)===JSON.stringify(r1));}

  /* ===== 5. a found painting hangs like any painting ===== */
  const cellsOf=id=>{const out=[];for(const [k,b] of V.blockEnts)if(b.t==='crpaint'&&b.id===id)out.push([k,b]);return out;};
  for(const i of [0,3]){const q=FOUND[i],f=F[i],W=f.w/CRC.PXB,H=f.h/CRC.PXB;
    ok('"'+f.t+'" comes out of its chest through the chest screen (shift-click)',takeOut(q.key,q.id)&&workIds(V.blockEnts.get(q.key)).length===0);
    tp(o.x+3.5,o.z+0.5,o.y);select(q.id);aim(o.x+6.01,o.y+(H>2?2.5:1.5),o.z+0.5);rclick();step(15);
    const c=cellsOf(q.id),an=c.find(x=>x[1].i===0&&x[1].j===0),pm=an?V.getCRPM().get(an[0]):null;
    ok('  ... hangs on a wall like a player painting: '+W+'x'+H+' cells, one anchor, used up, its art mesh at '+f.w+'x'+f.h+' px',
      c.length===W*H&&c.every(x=>x[1].w===W&&x[1].h===H&&x[1].a===c[0][1].a)&&!has(q.id)&&!!pm&&!!pm.cv&&pm.cv.width===f.w&&pm.cv.height===f.h);
    const before=JSON.stringify(recOf(q.id));emptyHand();const p=c.length?c[0][0].split(',').map(Number):[0,0,0];aim(p[0]+0.5,p[1]+0.5,p[2]+0.5);boot.mine(V,step,16);
    ok('  ... and taken down: every cell goes, ONE drop of the same work, data untouched',cellsOf(q.id).length===0&&drops(q.id).length+cnt(q.id)===1&&JSON.stringify(recOf(q.id))===before);
    pickAll(q.id);}

  /* ===== 6. a found disc plays like any disc ===== */
  {if(typeof V.crMusSound==='function')V.crMusSound(false);
   const q=FOUND[5],f=F[5],jx=o.x+3,jy=o.y,jz=o.z-3,jk=jx+','+jy+','+jz;tp(o.x+0.5,o.z+0.5,o.y);
   ok('"'+f.t+'" comes out of its chest',takeOut(q.key,q.id));
   boot.give(V,B.CR_JUKE,2);aim(jx+0.5,jy-0.02,jz+0.5);rclick();select(q.id);aim(jx+0.5,jy+0.5,jz+0.5);rclick();step(4);
   const jb=V.blockEnts.get(jk),fx=V.crMusInfo().CRM.fx.get(jk);
   ok('  ... plays in a jukebox through the real right-click: the disc goes in, "Now playing", the floating note shows it',!!jb&&jb.t==='crjuke'&&jb.id===q.id&&
     !has(q.id)&&/Now playing: .BATEHOVEN IS HALOUS/.test(CR().CRF.toast)&&!!fx&&fx.id===q.id);
   const r=recOf(q.id),sr=8000,a=V.crSongRender(r.d,sr),b=V.crSongRender(JSON.parse(JSON.stringify(f.d)),sr);let e=0,same=a.length===b.length;
   for(let i=0;i<a.length;i++){e+=a[i]*a[i];if(same&&a[i]!==b[i])same=false;}const rms=Math.sqrt(e/Math.max(1,a.length));
   ok('  ... and it is the real song: rendered offline it is '+V.crSongLen(r.d).toFixed(2)+' s of sound (rms '+rms.toFixed(3)+'), sample for sample the source',
     a.length===Math.round(V.crSongLen(r.d)*sr)&&rms>0.005&&same);
   emptyHand();aim(jx+0.5,jy+0.5,jz+0.5);rclick();step(2);
   ok('  ... eject: the same disc is back in the inventory and the jukebox is empty',has(q.id)&&V.blockEnts.get(jk).id===0);}

  /* ===== 7. bots never hold one ===== */
  {const a={inv:Array(36).fill(null)},st={id:FOUND[1].id,count:1};
   ok('agGive refuses a found work (count back, inventory untouched): a bot can never steal one from a chest',V.agGive(a,st,'steal')===1&&a.inv.every(s=>!s));}

  /* ===== 8. the caps: skipped silently, never a toast from a chest ===== */
  {const fill=[];while(Object.keys(CR().CRW).length<CRC.MAX_WORKS){const n=V.crNew('song',{d:null});if(!n)break;fill.push(n);}
   const t0=CR().CRF.toast,w=V.crInfo().works,be=forced(o.x-1,o.y+14,o.z+9,1);
   ok('the registry is full ('+CRC.MAX_WORKS+' works): the find is skipped, no work, no toast, the chest keeps its normal loot',
     Object.keys(CR().CRW).length===CRC.MAX_WORKS&&!!be&&be.inv.some(Boolean)&&workIds(be).length===0&&V.crInfo().works===w&&CR().CRF.toast===t0);
   for(const n of fill)V.crDiscard(n);}
  {const need=f=>{const r={k:f.k,st:'done',t:V.crTitle(f.t),by:'Dan Dingle',d:f.d,u:0};if(f.k==='art'){r.w=f.w;r.h=f.h;}return JSON.stringify(r).length+8;};
   const base=JSON.stringify({k:'art',st:'wip',t:'',by:'',d:'',u:0,w:64,h:64}).length+8,fill=[];
   let T=CRC.MAX_BYTES-V.crBytes()-need(F[2]),guard=0;
   while(T>0&&guard++<400){let c=Math.min(T,base+6990);if(T-c>0&&T-c<base)c=T-base;const n=V.crNew('art',{w:64,h:64,d:'x'.repeat(c-base)});if(!n)break;fill.push(n);T-=c;}
   const room=CRC.MAX_BYTES-V.crBytes(),t0=CR().CRF.toast;
   const b1=forced(o.x,o.y+14,o.z+9,3),b2=forced(o.x+1,o.y+14,o.z+9,2),full=V.crBytes(),b3=forced(o.x+2,o.y+14,o.z+9,2);
   ok('bytes, to the byte: with room for exactly "'+F[2].t+'" ('+room+' B left) the bigger "'+F[3].t+'" is skipped, "'+F[2].t+
     '" fits and fills the registry to '+CRC.MAX_BYTES+' B, then nothing more fits; never a toast',room===need(F[2])&&workIds(b1).length===0&&workIds(b2).length===1&&
     full===CRC.MAX_BYTES&&workIds(b3).length===0&&CR().CRF.toast===t0);
   for(const n of fill)V.crDiscard(n);}
  {const w=V.crInfo().works;FD().off=true;FD().force=1;const be=(()=>{try{LC(o.x+4,o.y+14,o.z+9,false);}finally{FD().off=false;}return V.blockEnts.get((o.x+4)+','+(o.y+14)+','+(o.z+9));})(),left=FD().force;FD().force=0;
   ok('the rigs\' off switch: no chest rolls at all, even forced (the roll is not consumed)',!!be&&be.inv.some(Boolean)&&workIds(be).length===0&&V.crInfo().works===w&&left===1);}
  {const x=o.x+3,y=o.y+14,z=o.z+9;V.setBlock(x,y,z,B.CHEST);const be=V.ensureBE(x,y,z,'chest');for(let i=0;i<be.inv.length;i++)be.inv[i]={id:B.DIRT,count:1};
   const w=V.crInfo().works;FD().force=1;const r=V.crFoundRoll(be,x,y,z);FD().force=0;
   ok('a chest with no empty slot: nothing minted, nothing overwritten',r===null&&V.crInfo().works===w&&be.inv.every(s=>s&&s.id===B.DIRT));}

  /* ===== 9. a save round trip ===== */
  {const before={};for(const k in CR().CRW)before[k]=JSON.stringify(CR().CRW[k]);
   const chests=FOUND.filter(q=>![0,3,5].includes(q.i));
   const sv=JSON.parse(JSON.stringify(V.snapshot('crfound')));
   ok('the save carries every found work in cr.w and the chests hold their ids',!!sv.cr&&FOUND.every(q=>!!sv.cr.w[q.n])&&
     chests.every(q=>JSON.stringify(sv.be[q.key]||null).includes('"id":'+q.id))&&(!natural||!!sv.cr.w[V.crWorkN(natural)]));
   V.applySave(sv);V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;step(30);
   const lost=Object.keys(before).filter(k=>JSON.stringify(CR().CRW[k])!==before[k]);
   ok('after a reload every found work is identical and none was collected (the chests and Dan reference them all)'+(lost.length?' (changed: '+lost.join(',')+')':''),
     lost.length===0&&CR().CRF.gc===0);
   ok('  ... the chests still hold them, Dan still has the paintings and the disc, every def and icon is back',
     chests.every(q=>workIds(V.blockEnts.get(q.key)).includes(q.id))&&[0,3,5].every(i=>cnt(FOUND[i].id)===1)&&
     FOUND.every(q=>V.DEFS[q.id]&&V.DEFS[q.id].name===(F[q.i].k==='art'?'Painting: ':'Music Disc: ')+F[q.i].t&&C.ICONS[q.id]));}

  /* ===== 10. never inside Puppet Purgatory ===== */
  if(typeof V.mpEnterNow!=='function')skip('purgatory','PART 55 absent');
  else{V.mpDoorHere();step(5);V.mpEnterNow();step(30);
    const P=V.P,x=Math.floor(P.x)+2,y=Math.floor(P.y)+3,z=Math.floor(P.z),w=V.crInfo().works;
    FD().force=1;FD().pick=0;const r=V.crFoundRoll({inv:Array(27).fill(null)},x,y,z);LC(x,y,z,false);const be=V.blockEnts.get(C.bkey(x,y,z)),left=FD().force;
    FD().force=0;FD().pick=-1;
    ok('inside Puppet Purgatory a loot chest never gets a found work, even forced (the roll is not even consumed)',V.getDim()==='puppet'&&r===null&&!!be&&
      workIds(be).length===0&&V.crInfo().works===w&&left===1);}
});
