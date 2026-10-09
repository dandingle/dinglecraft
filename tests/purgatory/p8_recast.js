/* p8_recast.js (Release 1.0, TESTS lane, gate x1): the purgatory recast holds, by name, by shape and by colour.
   Display pins (the Release 1.0 name contract): PM_NAMES, HN_NAMES, purgMtName, the boss bars (BN), the intro
   titles (HN_TITLE), the place names (purgBiomeN), the Headliner Trunks, the renamed items and blocks, the Programme / speaker /
   kill-toast lines; names unique where the death messages need them to be. OG rigs: every PREG.mesh[mt] builds without a failure;
   the Frog has no collar, banjo, headset or clipboard; the Pig no wig, gown, gloves or pearls (by handle and by colour); the
   Demolitionist wears a helmet and has no hair; no pig wears a fishbowl and the Hero Hog no space suit; the supporting cast lost
   their signature costume colours; Felt Dan is no longer frog-green; the Bin tile has no eyes. Hyperreal: the real models (built in
   a child process on a permissive stub THREE, tests/lib/hr_models_child.js) carry the new names and none of the old, build in
   every variant the game asks for, follow the same part rules, still read every purgatory s field the v6.3 brains
   wrote (tests/fixtures/recast_contract.json; the adapter's generic fields excepted) and accept them without throwing. The save half of the recast is p8_saves.js (the lead's).
   Old names appear here only ROT13 (the IP scan reads tests too). Frames: none needed (static and builder checks). */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
const fs=require('fs'),cp=require('child_process'),path=require('path');
const B=require('../lib/ipban.js');
const r13=B.r13;
const V=boot({});
const G=fs.readFileSync(boot.BUILD+'game.js','utf8');
const lit=(re)=>{const m=G.match(re);if(!m)return null;try{return (new Function('return '+m[1]))();}catch(e){return null;}};
const fnSrc=(name)=>{const a=G.indexOf('\nfunction '+name+'(');if(a<0)return null;const b=G.indexOf('\nfunction ',a+1);return G.slice(a+1,b<0?G.length:b);};

/* the Release 1.0 name contract */
const NAMES={pgbomber:'the Demolitionist',pgbigpig:'the Pig',pgbigfrog:'the Frog',pghog:'the Hero Hog',pgcomic:'the Comic',pgdare:'the Daredevil',
  pgdrummer:'the Drummer',pgyeti:'the Yeti',pgcook:'the Cook',pgprof:'the Professor',pgratb:'the Lab Rat',pgrat:'Lab Rat Clone',pgrat2:'Lab Rat Clone',
  pgrat4:'Lab Rat Clone',pgoldgoat:'Old Goat',pgoldergoat:'Older Goat',pgweather:'the Weatherman',pgpelican:'the Pelican',pghen:'Rubber Hen',pgwhat:'Blank'};
const KEEP={pghollow:'Hollow',pgposs:'Possessed Hollow',pghand:'The Hands',pgfeltdan:'Felt Dan',pgfrog:'Thieving Frog',pgpig:'Chorus Pig',
  pgpiglet:'Fallen Piglet',pgtoss:'Chorus Pig',pgspot:'Followspot'};
/* v6.3 model and mob names, ROT13: none may exist any more */
const OLD_MODELS=['ct_unel','ct_cvttl','ct_xrezvg','ct_sbmmvr','ct_tbamb','ct_navzny','ct_fjrrghzf','ct_ornxre','ct_purs','ct_jungabg','perrcre','ivyyntre'].map(r13);
const OLD_MT=['ctunel','ctcvttl','ctxrezvg','ctsbmmvr','cttbamb','ctnavzny','ctfjrrg','ctpurs','ctohafra','ctornxre','ctornxre2','ctornxre4','ctoxe',
  'ctfgngyre','ctjnyqbes','ctarjf','ctyrj','ctyvax'].map(r13);
const NEW_MODELS=['pg_bomber','pg_bigpig','pg_bigfrog','pg_comic','pg_daredevil','pg_drummer','pg_yeti','pg_labrat','pg_cook','pg_blank','pg_pig','pg_frog','pg_arm','boomer'];

boot.run(async()=>{
  ok('the build is there (build/game.js)',G.length>1e6);
  /* ===================== display pins ===================== */
  const PM=V.PM_NAMES||{},HN=V.getHN()||{};
  const bad=(tab,exp)=>Object.entries(exp).filter(([k,v])=>k in tab&&tab[k]!==v).map(([k])=>k);
  { const b=bad(PM,NAMES),miss=['pgcomic','pgdare','pgdrummer','pgyeti','pgcook','pgprof','pgratb','pgrat','pgoldgoat','pgoldergoat','pgweather','pgpelican','pghen','pgwhat'].filter(k=>!(k in PM));
    ok('PM_NAMES follows the name contract (the Comic, the Daredevil ... Rubber Hen, Blank)'+(b.length||miss.length?' (wrong: '+b.concat(miss).join(' ')+')':''),!b.length&&!miss.length);
    ok('PM_NAMES keeps the unchanged names (Hollow, Possessed Hollow, The Hands, Felt Dan, Thieving Frog, Chorus Pig)',bad(PM,KEEP).length===0&&['pghollow','pgposs','pghand','pgfeltdan','pgfrog','pgpig'].every(k=>k in PM)); }
  { const b=bad(HN,NAMES),miss=['pgbomber','pgbigpig','pgbigfrog','pghog'].filter(k=>!(k in HN));
    ok('HN_NAMES: the Demolitionist, the Pig, the Frog, the Hero Hog'+(b.length||miss.length?' (wrong: '+b.concat(miss).join(' ')+')':''),!b.length&&!miss.length);
    ok('HN_NAMES keeps Fallen Piglet, Chorus Pig and Followspot',bad(HN,KEEP).length===0); }
  { const src=fnSrc('purgMtName');let f=null;try{f=src&&(new Function(src+';return purgMtName;'))();}catch(e){f=null;}
    const b=f?Object.keys(NAMES).filter(k=>!(f(k)===NAMES[k]||(k==='pghen'&&f(k)==='Hen'))):['(not found)'];
    ok('purgMtName (the bots\' names for mobs) follows the name contract'+(b.length?' (wrong: '+b.join(' ')+')':''),!!f&&!b.length);
    ok('purgMtName: the bots\' reflex target is the lower-cased name of the Pig (the pig)',!!f&&f('pgbigpig').toLowerCase()==='the pig'&&/'the pig'/.test(fnSrc('purgReflex')||G)); }
  { const all={};for(const [k,v] of [...Object.entries(PM),...Object.entries(HN)])(all[v]=all[v]||new Set()).add(k);
    const dup=Object.entries(all).filter(([n,s])=>s.size>1&&!(n==='Lab Rat Clone'&&[...s].every(k=>/^pgrat[24]?$/.test(k)))&&!(n==='Chorus Pig'&&[...s].every(k=>k==='pgpig'||k==='pgtoss'))).map(([n])=>n);
    ok('display names are unique across PM_NAMES and HN_NAMES (only the rat clones and the chorus pigs share one; death messages key on them)'+(dup.length?' ('+dup.length+' shared)':''),dup.length===0); }
  { const BN=lit(/const BN=(\{[^;]*\});/);
    ok('boss bars: THE DEMOLITIONIST, THE PIG, THE FROG, MALGORATH, THE WORLD-EATER (the rest unchanged)',!!BN&&BN.pgbomber==='THE DEMOLITIONIST'&&BN.pgbigpig==='THE PIG'&&
      BN.pgbigfrog==='THE FROG'&&BN.demon==='MALGORATH, THE WORLD-EATER'&&BN.boss==='DUNGEON WARDEN'&&BN.dking==='THE DRAGON KING'&&BN.titan==='STONE TITAN'); }
  { const T=lit(/var HN_TITLE=(\{[^;]*\});/);
    ok('intro titles: LADIES AND GENTLEMEN... THE DEMOLITIONIST. / ...THE PIG. / AND NOW... THE MANAGEMENT.',!!T&&T.bomber==='LADIES AND GENTLEMEN... THE DEMOLITIONIST.'&&
      T.bigpig==='LADIES AND GENTLEMEN... THE PIG.'&&T.bigfrog==='AND NOW... THE MANAGEMENT.'); }
  { const N=lit(/var purgBiomeN=(\{[\s\S]*?\});/);
    ok('places: the Felt Forest, the Kitchen, the Prop Lab, the Back Swamp; the Pork Palace and the Grand Staircase stay',!!N&&N.woods==='the Felt Forest'&&N.kitchen==='the Kitchen'&&
      N.labs==='the Prop Lab'&&N.swamp==='the Back Swamp'&&N.palace==='the Pork Palace'&&N.stair==='the Grand Staircase'); }
  { const TR=V.getHNTRUNK()||{};
    ok('the Headliner Trunks: The Demolitionist\'s Trunk, The Pig\'s Trunk',!!TR.bomber&&TR.bomber.name==='The Demolitionist\'s Trunk'&&!!TR.bigpig&&TR.bigpig.name==='The Pig\'s Trunk'); }
  { const D=V.DEFS,I=V.IT,BB=V.B,nm=id=>id!=null&&D[id]?D[id].name:null;
    const want=[[BB.PG_FLEECE,'Puppet Fleece'],[BB.PG_CAN,'The Bin'],[I.PG_CHOPGLOVE,'Slam Gloves'],[I.PG_FUSE,'Lit Fuse'],[I.PG_FLATBREAD,'Flatbread'],
      [I.PG_MEATBALL,'Mystery Meatball'],[I.PG_FISH,'Homing Herring'],[I.PG_SV_PLUNGER,'Detonator Plunger'],[I.PG_SV_GLOVE,'Pig-Hurling Glove'],
      [I.PG_SV_FROG,'Frog Puppet (Empty)'],[I.PG_PLASTICEYE,'Plastic Eye'],[BB.PG_LAMP,'Eyeball Lamp'],[I.PG_LAMINATE,'Laminate Chip']];
    const b=want.filter(([id,n])=>nm(id)!==n).map(([,n])=>n);
    ok('items and blocks: Puppet Fleece, The Bin, Slam Gloves ... Laminate Chip (ids unchanged: Slam Gloves 335, Frog Puppet 364)'+(b.length?' (wrong: '+b.join(', ')+')':''),!b.length&&I.PG_CHOPGLOVE===335&&I.PG_SV_FROG===364); }
  { const need=['THE SHOW MUST GO ON: PURGATORY EDITION','YOU ESCAPED PUPPET PURGATORY','THE PROP LAB','ACT I: THE DEMOLITIONIST','ACT II: THE PIG','ACT III: THE MANAGEMENT',
      'Panic Meter','Baa-ha-ha','THE PROFESSOR',
      'The Demolitionist went up through the Grid. The Plunger and his Fuse are yours.','The Pig rolled all the way down. Her gloves, pearls and boa are yours.'];
    const lack=need.filter(s=>!G.includes(s));
    ok('the Programme, the meter, the speakers and the kill toasts say the new names (plan 3.1-3.5)'+(lack.length?' (missing '+lack.length+': '+lack.slice(0,3).join(' | ')+')':''),!lack.length);
    ok('the speakers: THE DAREDEVIL "Nailed it!", THE WEATHERMAN "Here is the weather.", the balcony OLD GOAT "Bravo!" / OLDER GOAT "Encore!"',
      /mpSay\('THE DAREDEVIL','Nailed it!'[,)]/.test(G)&&/mpSay\('THE WEATHERMAN','Here is the weather\.'[,)]/.test(G)&&/\['OLD GOAT','Bravo!'\]/.test(G)&&/\['OLDER GOAT','Encore!'\]/.test(G)); }
  { const mt=OLD_MT.filter(k=>V.MOBT[k]||PM[k]||HN[k]||(V.PREG&&V.PREG.mesh[k]));
    ok('no mob type keeps an old name (MOBT, PM_NAMES, HN_NAMES, PREG.mesh)'+(mt.length?' ('+mt.length+')':''),!mt.length); }

  /* ===================== OG rigs ===================== */
  const PREG=V.PREG,T=global.THREE;
  /* the stub Color keeps a '#rrggbb' string or a hex int in r as given; real floats come from the feature stubs' setHex */
  const hex=c=>!c?-1:typeof c.r==='string'?(/^#[0-9a-f]{6}$/i.test(c.r)?parseInt(c.r.slice(1),16):-1):c.r>1?c.r|0:((Math.round(c.r*255)<<16)|(Math.round(c.g*255)<<8)|Math.round(c.b*255));
  const colours=g=>{const s=new Set();(function w(o){const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)if(m&&m.color)s.add(hex(m.color));
    for(const ch of o.children||[])w(ch);})(g);return s;};
  const built={},fails=[];
  { const warn=console.warn;let cur=null;console.warn=(...a)=>{const m=String(a[0]||'');if(/^\[PG\] /.test(m))fails.push(cur+': '+m.slice(5,80));else warn.apply(console,a);};
    try{for(const k of Object.keys(PREG.mesh)){cur=k;const g=new T.Group(),mats=[];let r=null;
      try{r=PREG.mesh[k](g,mats,k);}catch(e){fails.push(k+': '+String(e.message).slice(0,60));}
      let n=0;(function w(o){n++;for(const ch of o.children||[])w(ch);})(g);
      if(r&&n<2)fails.push(k+': empty');built[k]={g,r,parts:Object.assign({},r&&r.legs?Object.fromEntries(Object.keys(r.legs).filter(x=>isNaN(+x)).map(x=>[x,1])):{},g.userData.pr||{}),cols:colours(g)};}}
    finally{console.warn=warn;} }
  ok('every OG purgatory rig builds (PREG.mesh, '+Object.keys(built).length+' types, no rig failure)'+(fails.length?' ('+fails.slice(0,4).join('; ')+')':''),!fails.length&&Object.keys(built).length>=40);
  const has=(k,re)=>!!built[k]&&Object.keys(built[k].parts).some(p=>re.test(p));
  const col=(k,list)=>!!built[k]&&list.some(c=>built[k].cols.has(c));
  ok('the Frog (OG): no collar, banjo, headset or clipboard',!!built.pgbigfrog&&!has('pgbigfrog',/^(collar|banjo|headset|clipboard)/i));
  ok('the Pig (OG): no wig, gown, gloves or pearls, by part and by colour',!!built.pgbigpig&&!has('pgbigpig',/^(wig|gown|glove|pearl|glint)/i)&&!col('pgbigpig',[0xf2d26a,0xb98ad6,0x7a3a9a,0xfaf6ee]));
  ok('the Demolitionist (OG): a helmet, no hair',has('pgbomber',/^helmet$/)&&!has('pgbomber',/^hair/i));
  ok('no thrown or fallen piglet wears a fishbowl helmet (OG)',['pgtoss','pgpiglet'].every(k=>!!built[k]&&!has(k,/^bowl/i)&&!col(k,[0xcfe8ff])));
  ok('the Hero Hog (OG): no space suit, no bowl helmet',!!built.pghog&&!col('pghog',[0xcfe8ff,0xe8e8ee]));
  /* the v6.3 costume colours of the supporting cast, per rig (they must not come back) */
  const SIG={pgcomic:[0xe05a8a],pgdare:[0x6a3fa0,0x5a78c8],pgdrummer:[0xc8401e,0xe0612a],pgyeti:[0x6b4a2b],pgcook:[0x6a4426,0xeab494],pgprof:[0x8fbf4a],
    pgrat:[0xe8742a,0xf2c9a0],pgrat2:[0xe8742a,0xf2c9a0],pgrat4:[0xe8742a,0xf2c9a0],pgratb:[0xe8742a,0xf2c9a0],pgoldgoat:[0xecc8b4],pgoldergoat:[0xecc8b4],
    pgweather:[0xf0c8a0],pgpelican:[0xf0d7c0],pgfeltdan:[0x4ca82b,0x2f7a1a,0x5cbf36]};
  const still=Object.entries(SIG).filter(([k,c])=>!built[k]||col(k,c)).map(([k])=>k);
  ok('the supporting cast lost their signature costume colours (hound, dummy, gorilla, yeti, croc, owl, rats, goats, parrot, pelican; Felt Dan in burlap)'+
    (still.length?' (still: '+still.join(' ')+')':''),!still.length);
  { const a=G.indexOf('var PM_RIGS={}'),b=G.indexOf('\nfunction pmRigInto(');
    ok('no OG rig paints the old polka-dot tie',a>0&&b>a&&!/pg_comic_tie|polka/i.test(G.slice(a,b))); }
  { const a=G.indexOf("tile('pg_can_s'"),b=a>=0?G.indexOf("tile('",a+5):-1,seg=a>=0?G.slice(a,b>a?b:a+700):'';
    ok('the Bin side tile (OG) has no eyes under the lid',a>=0&&!/#f4e86a/i.test(seg)&&!/angry eyes/i.test(seg)); }

  /* ===================== Hyperreal models (real sources, child process) ===================== */
  const X=V.hrPg||{},PMOB=X.HR_PMOB||{},PV=X.HR_PMOB_V||{};
  const variants={};for(const [mt,v] of Object.entries(PV)){const m=PMOB[mt];if(m)(variants[m]=variants[m]||[]).includes(v)||variants[m].push(v);}
  let RC=null;try{RC=JSON.parse(fs.readFileSync(boot.FIX+'recast_contract.json','utf8'));}catch(e){RC=null;}
  ok('tests/fixtures/recast_contract.json (the v6.3 s fields per model) parses',!!RC&&!!RC.fields&&Object.keys(RC.fields).length>=14);
  const arg=JSON.stringify({variants,fields:RC?RC.fields:{}});
  const res=cp.spawnSync(process.execPath,[path.join(__dirname,'..','lib','hr_models_child.js'),arg],{encoding:'utf8',timeout:120000,env:process.env});
  let H=null;try{H=JSON.parse(String(res.stdout||'').trim().split('\n').pop());}catch(e){H=null;}
  ok('the Hyperreal model harness ran (every model source loaded in build order)'+(H&&H.fatal?' ('+H.fatal.split('\n')[0]+')':''),!!H&&!H.fatal&&H.load.every(x=>x[1]===1)&&H.load.length>=25);
  if(!H||H.fatal){skip('Hyperreal model checks','the harness did not run');return;}
  const M=H.models;
  const missNew=NEW_MODELS.filter(n=>!M[n]),oldLeft=OLD_MODELS.filter(n=>M[n]);
  ok('HR.MODELS carries the Release 1.0 cast names and none of the v6.3 ones'+(missNew.length||oldLeft.length?' (missing '+missNew.join(' ')+'; '+oldLeft.length+' old)':''),!missNew.length&&!oldLeft.length);
  ok('every purgatory model the game maps is a registered model (HR_PMOB values)',Object.values(PMOB).every(n=>!!M[n]));
  const nb=Object.entries(M).filter(([,r])=>!r.build).map(([n,r])=>n+(r.err?' ('+r.err.slice(0,50)+')':''));
  ok('every Hyperreal model builds ('+Object.keys(M).length+' models)'+(nb.length?' (fails: '+nb.slice(0,4).join('; ')+')':''),!nb.length);
  const vb=[];for(const [n,r] of Object.entries(M))for(const [v,q] of Object.entries(r.variants||{}))if(!q.build||q.update===false)vb.push(n+':'+v+(q.err?' ('+q.err.slice(0,40)+')':''));
  ok('every variant the game asks for builds and animates (HR_PMOB_V: '+Object.values(variants).reduce((a,b)=>a+b.length,0)+' variants)'+(vb.length?' (fails: '+vb.slice(0,4).join('; ')+')':''),!vb.length);
  const nu=Object.entries(M).filter(([n,r])=>r.build&&!r.update).map(([n,r])=>n+(r.uerr?' ('+r.uerr.slice(0,50)+')':''));
  ok('every Hyperreal model accepts the v6.3 s contract in update() (each field at 0, 0.5, 1)'+(nu.length?' (throws: '+nu.slice(0,4).join('; ')+')':''),!nu.length);
  const hh=(n,re)=>!!M[n]&&(M[n].handles.some(h=>re.test(h))||Object.values(M[n].variants||{}).some(q=>q.handles.some(h=>re.test(h))));
  ok('the Frog (HR): no collar, banjo, headset or clipboard part',!!M.pg_bigfrog&&!hh('pg_bigfrog',/^(collar|banjo|headset|clipboard)/i));
  ok('the Pig (HR): no wig, gown, glove or pearls part',!!M.pg_bigpig&&!hh('pg_bigpig',/^(wig|gown|glove|pearl)/i));
  ok('the Demolitionist (HR): a helmet, no hair',!!M.pg_bomber&&M.pg_bomber.handles.includes('helmet')&&!hh('pg_bomber',/^hair/i));
  ok('no Hyperreal pig variant wears a bowl helmet (toss, piglet, chorus, hog)',!!M.pg_pig&&!hh('pg_pig',/^bowl/i));
  if(RC){const lost=[];for(const [n,fl] of Object.entries(RC.fields)){if(!M[n])continue;const f=path.join(boot.SRC.models,n+'.js');if(!fs.existsSync(f)){lost.push(n+' (file)');continue;}
      const s=fs.readFileSync(f,'utf8'),ex=[...((RC.exempt&&RC.exempt[n])||[]),...(RC.generic||[])];
      for(const x of fl)if(!ex.includes(x)&&!new RegExp('\\bs\\.'+x+'\\b').test(s))lost.push(n+'.'+x);}
    ok('every rebuilt model still reads the s fields the v6.3 brains write (plan 4: keep every s field)'+(lost.length?' (dropped: '+lost.slice(0,6).join(' ')+')':''),!lost.length);}
});
