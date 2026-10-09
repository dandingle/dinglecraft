/* p8_saves.js (Release 1.0 lead, gate x1): old worlds keep loading after the Release 1.0 recast, both ways.
   v6.1-v6.3 saves keyed some fields by the old purgatory cast names; Release 1.0 (game v6.4) renamed them. This suite builds a
   real v6.4 save inside purgatory, turns it into the old shape and loads it (old -> new), then saves and loads the result again
   (new -> new), and checks that nothing old is ever written back. Covered: save.dim, MP.dead / deaths / ticks / life.souvenirs,
   the meter, MP.pm3, a Headliner Trunk entity (hn + name), a bot saved inside, the stock symbols (holdings, cost basis, market).
   The old names never appear in this file in plain text: they are ROT13 (the IP scan reads tests too). */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
const V=boot({});
const step=boot.stepper(560000),C=V.pgCore();
const MP=()=>V.getMP();
/* ROT13 for a-z and A-Z (the game's MP_R13 does a-z only) */
const r13=s=>s.replace(/[a-zA-Z]/g,c=>{const b=c<='Z'?65:97;return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b);});
const OLD={dim:r13('zhccrg'),meter:r13('zrrc'),pm3:r13('tbamb'),hn:{bomber:r13('uneel'),bigpig:r13('cvttl'),bigfrog:r13('xrezvg')},
  trunk:{bomber:r13("Penml Uneel'f Gehax"),bigpig:r13("Zvff Cvttl'f Gehax")},
  stox:{DIRTCO:r13('NNCY'),PORKBL:r13('ZFSG'),LAVAINC:r13('AIQN'),DIAMND:r13('GFYN'),BOOMCO:r13('NZMA'),WOOLLY:r13('TBBT'),TORCHY:r13('ZRGN'),CACTUS:r13('ASYK')}};
const renameKeys=(o,map)=>{if(!o)return o;const r={};for(const k of Object.keys(o))r[map[k]||k]=o[k];return r;};
const legacyWords=[OLD.dim,OLD.meter,OLD.pm3,...Object.values(OLD.hn)];
/* an old KEY, dimension or symbol anywhere in a save (display names are TEXT's: the trunk name is checked against HN_TRUNK instead) */
const writesLegacy=d=>{const j=JSON.stringify(d);return legacyWords.some(w=>j.includes('"'+w+'"'))||Object.values(OLD.stox).some(t=>j.includes('"'+t+'"'));};

boot.run(async()=>{
  /* ===== 0. the helpers on their own ===== */
  ok('mpDimAlias: the old purgatory key reads as puppet, every other dimension is untouched',V.mpDimAlias(OLD.dim)==='puppet'&&
    ['over','nether','aether','puppet'].every(d=>V.mpDimAlias(d)===d)&&V.mpDimAlias(undefined)===undefined);
  {const legacy={dead:{[OLD.hn.bomber]:1,[OLD.hn.bigpig]:0},deaths:{[OLD.hn.bigfrog]:4},ticks:{[OLD.hn.bigpig]:1,read:1},life:{escapes:2,souvenirs:{[OLD.hn.bomber]:1}},
      [OLD.meter]:6,pm3:{[OLD.pm3]:1},clock:12};
    const copy=JSON.stringify(legacy),m=V.mpLegacyKeys(legacy);
    ok('mpLegacyKeys renames every old key (dead, deaths, ticks, souvenirs, the meter, pm3)',m.dead.bomber===1&&m.dead.bigpig===0&&m.deaths.bigfrog===4&&
      m.ticks.bigpig===1&&m.ticks.read===1&&m.life.souvenirs.bomber===1&&m.life.escapes===2&&m.squeak===6&&m.pm3.dare===1&&m.clock===12);
    ok('...leaves no old key behind',!writesLegacy(m));
    ok('...and never changes the object it was given',JSON.stringify(legacy)===copy);
    ok('...is idempotent on a new-shape MP',JSON.stringify(V.mpLegacyKeys(m))===JSON.stringify(m));
    const both=V.mpLegacyKeys({dead:{[OLD.hn.bomber]:0,bomber:1},[OLD.meter]:2,squeak:9});
    ok('...when old and new keys are both present the new one wins',both.dead.bomber===1&&both.squeak===9&&!writesLegacy(both));
    ok('...passes null and non-objects through',V.mpLegacyKeys(null)===null&&V.mpLegacyKeys(undefined)===undefined);}
  {const S=V.STOX,m=V.stoxMigrate({[OLD.stox.DIRTCO]:2,[OLD.stox.CACTUS]:0.5,DIAMND:7});
    ok('STOX: eight made-up symbols, every one 6+ letters (no real US ticker can collide)',S.length===8&&S.every(s=>/^[A-Z]{6,}$/.test(s))&&new Set(S).size===8);
    ok('stoxMigrate: old symbols move to the same slot share for share, new ones stay',m.DIRTCO===2&&m.CACTUS===0.5&&m.DIAMND===7&&Object.keys(m).length===3);
    ok('stoxMigrate: every old symbol maps onto a current STOX symbol',Object.entries(OLD.stox).every(([n,o])=>S.includes(n)&&V.stoxMigrate({[o]:1})[n]===1));}

  /* ===== 1. a real save inside purgatory, with every renamed field set ===== */
  if(boot.stubbed('0')||boot.stubbed('4')){skip('save round trips','P0 or P4 on its stub');return;}
  boot.world(V,'pg8','1337',step);
  V.mpEnterNow();step(60);
  ok('inside purgatory: the dimension key is puppet',V.getDim()==='puppet'&&MP().inside===true);
  const M=MP();M.dead.bomber=1;M.dead.bigpig=1;M.deaths.bomber=2;M.deaths.bigfrog=3;M.ticks.bomber=1;M.ticks.bigpig=1;M.life.souvenirs.bigfrog=1;M.squeak=7;M.pm3={dare:1};
  const P=V.P,tk=C.bkey(Math.floor(P.x)+3,Math.floor(P.y),Math.floor(P.z)+3);
  V.blockEnts.set(tk,{t:'stash',inv:Array(54).fill(null),who:'Dan',name:V.getHNTRUNK().bomber.name,hn:'bomber'});
  V.blockEnts.get(tk).inv[0]={id:V.IT.PG_FUSE,count:1};
  P.stox.sh={DIRTCO:3.5,CACTUS:1.25};P.stox.cb={DIRTCO:120.5,CACTUS:40};
  const newSave=JSON.parse(JSON.stringify(V.snapshot('pg8')));
  ok('the new save: dim puppet, the new keys, no old key anywhere',newSave.dim==='puppet'&&newSave.mp.dead.bomber===1&&newSave.mp.squeak===7&&
    newSave.mp.pm3.dare===1&&newSave.be[tk]&&newSave.be[tk].hn==='bomber'&&newSave.player.stox.sh.DIRTCO===3.5&&!writesLegacy(newSave));
  ok('the market saves every current symbol',V.STOX.every(s=>typeof newSave.market.p[s]==='number'&&typeof newSave.market.mu[s]==='number'));

  /* ===== 2. old -> new: the same world in the v6.1-v6.3 shape ===== */
  const L=JSON.parse(JSON.stringify(newSave));
  L.v='6.3';L.dim=OLD.dim;
  for(const k of ['dead','deaths','ticks'])L.mp[k]=renameKeys(L.mp[k],OLD.hn);
  L.mp.life.souvenirs=renameKeys(L.mp.life.souvenirs,OLD.hn);
  L.mp[OLD.meter]=L.mp.squeak;delete L.mp.squeak;L.mp.pm3={[OLD.pm3]:1};
  L.be[tk].hn=OLD.hn.bomber;L.be[tk].name=OLD.trunk.bomber;
  const tk2=C.bkey(Math.floor(P.x)-3,Math.floor(P.y),Math.floor(P.z)-3);
  L.be[tk2]={t:'stash',inv:Array(54).fill(null),who:'Dan',name:OLD.trunk.bigpig+' (renamed by hand)',hn:OLD.hn.bigpig};
  L.player.stox.sh=renameKeys(L.player.stox.sh,OLD.stox);L.player.stox.cb=renameKeys(L.player.stox.cb,OLD.stox);
  L.market.p=renameKeys(L.market.p,OLD.stox);L.market.mu=renameKeys(L.market.mu,OLD.stox);
  L.gr=Object.assign({},L.gr,{bots:false});
  L.bots={v:1,t:5,seeded:0,own:{},list:[{name:'BunkerBrad',dim:OLD.dim,x:P.x+2,y:P.y,z:P.z+2,yaw:0,hp:20,inv:[],armor:[],sel:0,spawn:[0,40,0],home:null,dead:0,
    rel:{},mem:[],ev:[],proj:null,projHist:[],flowers:[],thoughts:[],stats:{},mood:60,base:null,notes2:[],hunger:20,exh:0}]};
  ok('the crafted save really is old-shaped',writesLegacy(L)&&L.dim!=='puppet'&&!('squeak' in L.mp));
  V.applySave(L);
  ok('old save: market prices and drifts land on the new symbols (checked before any frame runs)',V.STOX.every(s=>V.getMKT().p[s]===newSave.market.p[s]&&V.getMKT().mu[s]===newSave.market.mu[s]));
  V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;step(30);
  ok('old save: the old purgatory key loads as puppet, Dan is inside',V.getDim()==='puppet'&&MP().inside===true);
  {const m=MP();
    ok('old save: kills and deaths carried under the new keys',m.dead.bomber===1&&m.dead.bigpig===1&&!m.dead.bigfrog&&m.deaths.bomber===2&&m.deaths.bigfrog===3&&
      Object.values(OLD.hn).every(o=>!(o in m.dead)&&!(o in m.deaths)));
    ok('old save: Programme ticks and souvenirs carried',m.ticks.bomber===1&&m.ticks.bigpig===1&&m.life.souvenirs.bigfrog===1&&
      Object.values(OLD.hn).every(o=>!(o in m.ticks)&&!(o in m.life.souvenirs)));
    ok('old save: the meter (it decays 1 per 8 s) and the once-only stunt drop flag carried',m.squeak>6&&m.squeak<=7&&!(OLD.meter in m)&&m.pm3&&m.pm3.dare===1&&!(OLD.pm3 in m.pm3));}
  {const be=V.blockEnts.get(tk),be2=V.blockEnts.get(tk2),T=V.getHNTRUNK();
    ok('old save: the Headliner Trunk gets the new hn and the current name, its contents kept',!!be&&be.hn==='bomber'&&be.name===T.bomber.name&&
      be.inv[0]&&be.inv[0].id===V.IT.PG_FUSE);
    ok('old save: any stored trunk name is replaced by the current one',!!be2&&be2.hn==='bigpig'&&be2.name===T.bigpig.name);}
  ok('old save: holdings and cost basis converted share for share',V.P.stox.sh.DIRTCO===3.5&&V.P.stox.sh.CACTUS===1.25&&V.P.stox.cb.DIRTCO===120.5&&
    Object.values(OLD.stox).every(o=>!(o in V.P.stox.sh)&&!(o in V.P.stox.cb)));
  {const a=V.AGENTS.find(x=>x.name==='BunkerBrad');ok('old save: a bot saved inside comes back inside (dim puppet)',!!a&&a.dim==='puppet');}
  const again=JSON.parse(JSON.stringify(V.snapshot('pg8')));
  ok('saving the loaded old world writes no old key, name or symbol',!writesLegacy(again)&&again.dim==='puppet'&&again.mp.dead.bomber===1&&again.be[tk].hn==='bomber');
  {const b=(again.bots&&again.bots.list||[]).find(x=>x.name==='BunkerBrad');ok('...and the bot is saved with dim puppet',!!b&&b.dim==='puppet');}

  /* ===== 3. new -> new: the converted world round-trips unchanged ===== */
  V.applySave(again);
  const third=JSON.parse(JSON.stringify(V.snapshot('pg8')));    /* no frame in between: the clock, the meter and the market do not move */
  V.GR.snail=false;V.GR.jsc=0;V.GR.mobSpawn=false;step(30);
  ok('new save round trip: dim, MP, the trunk, holdings and market are identical',third.dim===again.dim&&JSON.stringify(third.mp)===JSON.stringify(again.mp)&&
    JSON.stringify(third.be[tk])===JSON.stringify(again.be[tk])&&JSON.stringify(third.player.stox)===JSON.stringify(again.player.stox)&&
    JSON.stringify(third.market)===JSON.stringify(again.market));
  ok('the trunk sweep finds nothing left to migrate',V.hnTrunkMigrate()===0);

  /* ===== 4. an old OVERWORLD save (never went in): loads in the overworld, stocks converted ===== */
  {const O=JSON.parse(JSON.stringify(newSave));O.dim='over';delete O.mp;delete O.stash;delete O.bots;O.v='6.3';
    O.player.stox.sh=renameKeys({DIRTCO:2},OLD.stox);O.market.p=renameKeys(O.market.p,OLD.stox);O.market.mu=renameKeys(O.market.mu,OLD.stox);
    for(const k of Object.keys(O.be||{}))if(O.be[k]&&O.be[k].t==='stash')delete O.be[k];
    V.applySave(O);
    ok('old overworld save: loads in the overworld with the stocks converted',V.getDim()==='over'&&MP().inside===false&&V.P.stox.sh.DIRTCO===2&&
      V.STOX.every(s=>V.getMKT().p[s]===newSave.market.p[s]));
    step(30);ok('...and keeps running',V.getDim()==='over'&&!V.P.dead);}
});
