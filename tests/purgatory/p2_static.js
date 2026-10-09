/* p2_static.js (P2, gate x1): statics for things you hold and make (the purgatory build plan section 5.2; bible 4-8).
   PRECIPES (41, keys, hints, sets, every recipe made by calcCraft, an overworld grid makes nothing, RECIPES untouched), the 63 tile
   slots, the 46 block defs and the 78 item defs against the bible tables (tools, armour, food, drops), SMELT/FUELS rows, ARM_M
   rows, icons and held models build, PI_DEMO covers every lab output, hooks P2 present. No world is started. */
'use strict';
const boot=require('../lib/pg_boot.js'),{ok,skip}=boot;
const V=boot({});
const C=V.pgCore(),C2=V.p2Core();
boot.run(async()=>{
  const D=V.DEFS,B=V.B,IT=V.IT,PR=V.getPRECIPES();
  if(boot.stubbed('2')){skip('every P2 static','P2 is on its stub');return;}
  /* ---- PRECIPES ---- */
  ok('PRECIPES has the 41 recipes of bible 7.4',PR.length===41);
  const rids=PR.map(r=>r.rid),want=['H1','H2','H3','H4','H5','H6','H7','H8','H9','H10','C1','C2','C3','C4','C5','C6','C7','C8','C9','C11','C12','C13','C14','C15','C16','C17','C18','C19','C20',
    'L1','L2','L3','L4','L5','L6','L7','L8','L9','L10','L11','T1'];
  ok('recipe ids are exactly H1-H10, C1-C20 (C10 moved to the hands), L1-L11, T1',JSON.stringify(rids)===JSON.stringify(want));
  const ingIds=r=>r.s?r.s.slice():Object.values(r.k);
  const bad=[];for(const r of PR){for(const id of [r.o,...ingIds(r),r.key]){const d=D[id];if(!d||!(d.tiles||typeof d.ipaint==='function'))bad.push(r.rid+':'+id);}}
  ok('every PRECIPES output, ingredient and key exists in DEFS with tiles or ipaint'+(bad.length?' ('+bad.slice(0,5).join(' ')+')':''),bad.length===0);
  ok('every recipe has a key and a one-line hint',PR.every(r=>r.key&&typeof r.hint==='string'&&r.hint.length>4&&r.hint.indexOf('\n')<0));
  ok('every recipe has a station tag (hand, can, lab, trans) and the counts are 10/19/11/1',
    ['hand','can','lab','trans'].map(s=>PR.filter(r=>r.st===s).length).join()==='10,19,11,1');
  ok('no overworld id in PRECIPES (every output and ingredient is pg:1)',PR.every(r=>[r.o,...ingIds(r)].every(id=>D[id].pg===1)));
  ok('RECIPES still holds 98 recipes (+ '+(V.CR_RECIPE_N|0)+' v6.2 creativity recipes) and no purgatory id',V.RECIPES.length===98+(V.CR_RECIPE_N|0)&&V.RECIPES.every(r=>![r.o,...(r.s||[]),...Object.values(r.k||{})].some(x=>typeof x==='number'&&D[x]&&D[x].pg)));
  ok('patterns are trimmed to their bounding box and use spaces for empty',PR.filter(r=>r.p).every(r=>{const w=r.p[0].length;
    return r.p.every(row=>row.length===w&&!/\./.test(row))&&r.p.some(row=>row[0]!==' ')&&r.p.some(row=>row[w-1]!==' ')&&r.p[0].trim()&&r.p[r.p.length-1].trim();}));
  /* calcCraft makes each purgatory recipe from its own grid, plain and placed in every legal offset */
  const grid=(r,w,ox,oy)=>{const g=Array(w*w).fill(null);if(r.s){r.s.forEach((id,i)=>{g[i]={id,count:1};});return g;}
    for(let y=0;y<r.p.length;y++)for(let x=0;x<r.p[y].length;x++){const ch=r.p[y][x];if(ch!==' ')g[(y+oy)*w+(x+ox)]={id:r.k[ch],count:1};}return g;};
  const miss=[];for(const r of PR){const w=r.st==='hand'&&(!r.p||(r.p.length<=2&&r.p[0].length<=2))?2:3;
    const offs=r.s?[[0,0]]:[[0,0],[w-r.p[0].length,w-r.p.length]];
    for(const [ox,oy] of offs){const out=V.calcCraft(grid(r,w,ox,oy),w,PR);if(!out||out.id!==r.o||out.count!==r.n)miss.push(r.rid+'@'+ox+','+oy);}
    if(r.st==='hand'){const out=V.calcCraft(grid(r,3,0,0),3,PR);if(!out||out.id!==r.o)miss.push(r.rid+'@3x3');}}
  ok('calcCraft(grid,w,PRECIPES) makes every purgatory recipe (hand recipes in 2x2 and 3x3)'+(miss.length?' ('+miss.join(' ')+')':''),miss.length===0);
  {const g=[{id:B.LOG_O,count:1},null,null,null];ok('an overworld grid makes nothing with PRECIPES',V.calcCraft(g,2,PR)===null);
   const g2=Array(9).fill(null);g2[0]=g2[1]=g2[2]={id:B.PLANK_O,count:1};g2[4]=g2[7]={id:IT.STICK,count:1};ok('...and an overworld pickaxe grid makes nothing with PRECIPES',V.calcCraft(g2,3,PR)===null);
   const r0=PR.find(r=>r.rid==='C1');ok('a purgatory grid makes nothing with RECIPES (2-arg calcCraft unchanged)',V.calcCraft(grid(r0,3,0,0),3)===null);}
  {const seen=new Map();let clash=[];for(const r of PR){if(!r.p)continue;const k=JSON.stringify([r.p,Object.keys(r.k).sort().map(c=>[c,r.k[c]])]);if(seen.has(k))clash.push(r.rid);seen.set(k,1);}
   ok('no two recipes share a pattern',clash.length===0);}
  {const sets=k=>V.piRecipeSetAll(k).map(r=>r.st);const uniq=a=>[...new Set(a)].sort().join();
   ok('station sets: inv = hand; pcan = hand+can; plab = hand+can+lab; ptrans = trans',uniq(sets('inv'))==='hand'&&uniq(sets('pcan'))==='can,hand'&&
     uniq(sets('plab'))==='can,hand,lab'&&uniq(sets('ptrans'))==='trans');
   ok('outside purgatory piRecipeSet returns RECIPES',V.piRecipeSet('pcan')===V.RECIPES&&V.piRecipeSet('inv')===V.RECIPES);}
  ok('the Charge recipe (H9) is boss-locked; H10 makes the Bin block, shown as "Empty Can"',PR.find(r=>r.rid==='H9').lock===1&&
    PR.find(r=>r.rid==='H10').o===B.PG_CAN&&PR.find(r=>r.rid==='H10').label==='Empty Can');
  ok('every hand recipe fits the 2x2 inventory grid',PR.filter(r=>r.st==='hand').every(r=>r.s?r.s.length<=4:(r.p.length<=2&&r.p[0].length<=2)));
  ok('PI_DEMO covers every lab output (each lab craft is demonstrated on the Lab Rat)',PR.filter(r=>r.st==='lab').every(r=>V.PI_DEMO[r.o]));

  /* ---- the 63 tiles at slots 222-284 (plan 2.3) ---- */
  const TILES=['pg_deck','pg_skin','pg_mblack','pg_velvet_s','pg_velvet_t','pg_traveler','pg_seat_s','pg_seat_t','pg_shag_t','pg_shag_s','pg_sleeve_s','pg_sleeve_x',
    'pg_forearm_s','pg_forearm_x','pg_fleece','pg_eye','pg_stuffing','pg_armhole_t','pg_psky','pg_phill','pg_backing','pg_brace','pg_foam','pg_rot','pg_ore_googly',
    'pg_ore_wire','pg_ore_sequin','pg_ore_knuckle','pg_counter_t','pg_counter_s','pg_counter_b','pg_burner_t','pg_burner_s','pg_soup','pg_dough','pg_lino','pg_tesla_t',
    'pg_tesla_s','pg_satin','pg_mirror','pg_sheet','pg_swamp','pg_scum','pg_pins_t','pg_pins_s','pg_cord','pg_plate','pg_can_t','pg_can_s','pg_hotplate_t',
    'pg_hotplate_s','pg_bench_t','pg_bench_s','pg_ptrunk_t','pg_ptrunk_s','pg_lamp','pg_lily_t','pg_lily_s','pg_cattail','pg_door_s','pg_door_t','pg_strunk_t','pg_strunk_s'];
  ok('63 pinned tiles',TILES.length===63);
  const wrong=TILES.filter((n,i)=>C.Tl[n]!==222+i);
  ok('every purgatory tile sits at its pinned slot 222+i'+(wrong.length?' ('+wrong.slice(0,4).join(',')+')':''),wrong.length===0);
  /* v6.2 (lead, CREATIVITY_PLAN.md 3.5): PART 56 registers its tiles at boot, after every top-level tile() (so 222-284 never move) */
  const crT=V.CR_TILES?V.CR_TILES.length:0;
  ok('_tn is 285 after PART 55 (+ '+crT+' v6.2 tiles registered at boot) and fits the 1024-slot atlas',C.tn===285+crT&&C.tn<=C.ATLAS*C.ATLAS);
  ok('no pg_stub tile survives with the real P2',Object.keys(C.Tl).every(n=>!/^pg_stub/.test(n)));
  const used=new Set();for(const id in D){const d=D[id];if(!d.pg||d.item||!d.tiles)continue;const t=d.tiles;for(const n of typeof t==='string'?[t]:[t.top,t.side,t.bot])used.add(n);}
  ok('every purgatory tile is used by a purgatory block ('+used.size+')',TILES.every(n=>used.has(n)));

  /* ---- blocks (bible 4) ---- */
  const BT=[[149,'Stage Deck',1.2,'pick',0,false,149],[150,'The Puppeteer',-1,null,0,false],[151,'Masking Black',-1,null,0,false],[152,'Velvet Curtain',-1,null,0,false],
    [153,'Traveler',-1,null,0,false],[154,'Audience Seat',1.0,null,0,false,286],[155,'Shag Carpet',0.6,'shovel',0,false,149],[156,'Felt Sleeve',2.0,'axe',0,false,156],
    [157,'Puppeteer Forearm',1.5,'axe',0,false,291,2],[158,'Puppet Fleece',0.3,'axe',0,false],[159,'Canopy Eye',0.3,null,0,false,289],[160,'Stuffing Drift',0.4,'shovel',0,false,290,2],
    [161,'Arm Hole',1.0,'pick',0,false,287,2],[162,'Painted Sky',1.0,'axe',0,false,292],[163,'Painted Hill',1.0,'axe',0,false,292],[164,'Flat Backing',0.8,'axe',0,false,292,2],
    [165,'Cardboard Brace',0.3,null,0,false,292],[166,'Foam Rubber',1.5,'pick',0,true,293],[167,'Rotten Foam',3.0,'pick',1,true,294,2],[168,'Googly Ore',2.5,'pick',0,true],
    [169,'Wire Ore',3.0,'pick',1,true,296],[170,'Sequin Ore',4.0,'pick',2,true],[171,'Knuckle Ore',5.0,'pick',3,true,300],[172,'Countertop',2.0,'pick',0,true,301],
    [173,'Burner',2.5,'pick',1,true,302],[174,'Mystery Soup'],[175,'Dough',0.6,'shovel',0,false,355,2],[176,'Lab Linoleum',1.0,'pick',0,false,176],[177,'Tesla Coil',3.0,'pick',2,true,304,2],
    [178,'Satin Dune',0.8,'shovel',0,false,305],[179,'Dressing Mirror',1.5,'pick',1,true,303,2],[180,'Taut Felt Sheet',0.4,'axe',0,false,null],[181,'Swamp Felt',1.0,'shovel',0,false,181],
    [182,'Pond Scum'],[183,'Pincushion',3.0,'pick',2,true],[184,'Det Cord',0.4,'axe',2,true,184],[185,'Charge Plate',-1,null,0,false],[186,'The Bin',2.0,'pick',0,false,186],
    [187,'Hot Plate',2.0,'pick',0,false,187],[188,'Lab Bench',2.0,'pick',1,false,188],[189,'Prop Trunk',1.5,'axe',0,false,189],[99,'Eyeball Lamp',0,null,0,false,99],
    [117,'Lily Pad',0.5,'axe',0,false,286],[118,'Cattail',0,null,0,false,287],[119,'Stage Door',-1,null,0,false],[247,'Stage Trunk',-1,null,0,false]];
  const bb=[];for(const r of BT){const d=D[r[0]];if(!d||d.item||d.name!==r[1]||d.pg!==1){bb.push(r[0]+':def');continue;}if(r.length<3)continue;
    if(d.hard!==r[2])bb.push(r[0]+':hard');if((d.toolClass||null)!==r[3])bb.push(r[0]+':tool');if((d.tier||0)!==r[4])bb.push(r[0]+':tier');if(!!d.req!==r[5])bb.push(r[0]+':req');
    if(r.length>6&&!d.pdrop){const dr=V.blockDrop(r[0]);if(r[6]===null?dr!==null:!(dr&&dr.id===r[6]&&dr.count===(r[7]||1)))bb.push(r[0]+':drop');}}
  ok('46 block defs match bible 4 (name, hard, tool, tier, req, drop)'+(bb.length?' ('+bb.slice(0,6).join(' ')+')':''),bb.length===0&&BT.length===46);
  ok('the liquids: soup and scum are non-solid, wat bucket, wade multipliers 0.45 / 0.5, no drop',[174,182].every(id=>D[id].solid===false&&D[id].bucket==='wat'&&D[id].drop===null)&&
    D[174].pliquid===0.45&&D[182].pliquid===0.5&&D[174].interact==='psoup');
  ok('flags: hurts (Burner, Pincushion), slippery (Satin Dune), cut bucket (Fleece, Canopy Eye, Det Cord, Lamp, Cattail), cross (Lamp, Cattail)',
    D[173].hurts&&D[183].hurts&&D[178].slippery&&[158,159,184,99,118].every(id=>D[id].bucket==='cut')&&D[99].cross&&D[118].cross&&D[118].replace);
  ok('stations and interact kinds: pcan, furnace, plab, chest, pdoor, pstash; Det Cord pcord',D[186].interact==='pcan'&&D[187].interact==='furnace'&&D[188].interact==='plab'&&
    D[189].interact==='chest'&&D[119].interact==='pdoor'&&D[247].interact==='pstash'&&D[184].pcord===1);
  ok('pblast exactly on the bible\'s blast-mineable blocks',[149,160,162,163,164,165,166,167,168,169,170,171,172,176,178,181].every(id=>D[id].pblast===1)&&
    [150,151,152,153,173,177,179,185,186,187,188,189,247,119].every(id=>!D[id].pblast));
  ok('pore on the four ores, ptree on the two tree blocks',[168,169,170,171].every(id=>D[id].pore===1)&&[156,157].every(id=>D[id].ptree===1));
  ok('Stuffing Drift is soft, Dough bounces, Swamp Felt slows to 0.85',D[160].psoft===1&&D[175].pbounce===1&&D[181].pslow===0.85);
  {const rr=(id,st)=>{const o=[];for(let i=0;i<200;i++){const r=D[id].pdrop(st,'Dan');o.push(r?r.count:0);}return o;};
   const g=rr(168,null),s=rr(170,null),p=rr(183,null);
   ok('random drops: Googly 1-3, Sequin 1-2, Steel Pins 3-6',Math.min(...g)===1&&Math.max(...g)===3&&Math.min(...s)===1&&Math.max(...s)===2&&Math.min(...p)===3&&Math.max(...p)===6&&
     D[168].pdrop(null).id===IT.PG_GOOGLIES&&D[170].pdrop(null).id===IT.PG_SEQUIN&&D[183].pdrop(null).id===IT.PG_PINS);
   const f=rr(158,null),fs=rr(158,{id:IT.PG_PSHEARS,count:1});const f40=f.filter(x=>x>0).length/f.length;
   ok('Puppet Fleece: Shears give Fleece every time, anything else Stuffing about 40% of the time',fs.every(x=>x===1)&&D[158].pdrop({id:IT.PG_PSHEARS,count:1}).id===IT.PG_FLEECE&&f40>0.25&&f40<0.55);}
  ok('every block carries a bot tool hint',BT.every(r=>typeof D[r[0]].hint==='string'&&D[r[0]].hint.length>3));
  ok('Det Cord and the Eyeball Lamp need a floor (pplace)',typeof D[184].pplace==='function'&&typeof D[99].pplace==='function');

  /* ---- items (bible 5, 8) ---- */
  const TOOLS=[[310,'Floppy Pick','pick',0,2,48,2],[311,'Pinking Shears','axe',0,2,48,1],[312,'Felt Scoop','shovel',0,2,48,1],[313,'Sock Slapper','sword',0,1,48,3],
    [314,'LARP Pick','pick',1,4,110,3],[315,'Foam Clippers','axe',1,4,110,2],[316,'LARP Spade','shovel',1,4,110,2],[317,'Foam Bat','sword',1,1,110,3],
    [318,'Hanger Pick','pick',2,6,260,4],[319,'Wire Snips','axe',2,6,260,3],[320,'Hanger Scoop','shovel',2,6,260,3],[321,'Coat Hanger Rapier','sword',2,1,260,5],
    [322,'Disco Pick','pick',3,9,600,5],[323,'Rhinestone Snips','axe',3,9,600,4],[324,'Glitter Scoop','shovel',3,9,600,4],[325,'The Stiletto','sword',3,1,600,7],
    [326,"The Puppeteer's Gauntlet",'pick',3,9,1500,9],[335,'Slam Gloves','sword',3,1,400,6]];
  const tb=TOOLS.filter(([id,n,ty,ti,mu,du,dm])=>{const d=D[id],t=d&&d.tool;return !(d&&d.name===n&&d.stack===1&&t&&t.type===ty&&t.tier===ti&&t.mult===mu&&t.dur===du&&t.dmg===dm);}).map(r=>r[0]);
  ok('18 tools and weapons match bible 5.2 (the Gauntlet mines like a Disco Pick: engine type pick)'+(tb.length?' ('+tb.join(',')+')':''),tb.length===0);
  ok('the Foam Bat bats (bat:1); the Gauntlet is x3 against flesh (pflesh 3)',D[317].bat===1&&D[326].pflesh===3);
  const ARM=[[340,4,0],[341,4,1],[342,4,2],[343,4,3],[344,5,0],[345,5,1],[346,5,2],[347,5,3],[348,6,0],[349,7,3],[350,8,0]];
  ok('11 armour pieces with explicit ids and armor:{m,s} (never armorId(4,s))',ARM.every(([id,m,s])=>D[id]&&D[id].armor&&D[id].armor.m===m&&D[id].armor.s===s&&D[id].stack===1)&&V.armorId(4,0)===246&&D[246].name!=='Foam Padding Helmet');
  const AM=C.ARM_M;
  ok('ARM_M rows m 4-8: Foam Padding 1.75/120, Sequin Gown 3.75/300, Stunt 3/250, Performer 1/200, Fright 2/200',AM.length===9&&
    [[4,1.75,120],[5,3.75,300],[6,3,250],[7,1,200],[8,2,200]].every(([m,p,d])=>AM[m].pts===p&&AM[m].dur===d&&typeof AM[m].it==='function'&&D[AM[m].it()]));
  const FOOD=[[290,1],[351,3],[352,2,1],[354,8],[355,1,1],[356,5],[357,4],[358,2,1],[359,9],[360,1,1],[361,6],[330,5]];
  ok('food values are the EFFECTIVE values of bible 8, raw:1 on the four raw foods',FOOD.every(([id,f,raw])=>D[id].food===f&&!!D[id].raw===!!raw)&&!D[353].food&&D[353].stack===1);
  ok('stack sizes: Felt Fly 16, Custard Pie 16, Charge 16, Staples 64, durable gear stack 1 with dur (Mitt 40, Mirror 20, Staple Gun 300)',
    D[329].stack===16&&D[330].stack===16&&D[331].stack===16&&D[334].stack===64&&D[327].dur===40&&D[328].dur===20&&D[333].dur===300&&[327,328,332,333,336,337,338].every(id=>D[id].stack===1));
  const pgI=Object.keys(D).map(Number).filter(id=>D[id].item&&id>=285&&id<=364);
  ok('78 items 285-364 (minus 309, 339), the 75 purgatory ones pg:1, the 3 souvenirs not',pgI.length===78&&pgI.filter(id=>D[id].pg).length===75&&[362,363,364].every(id=>!D[id].pg));
  {const bad2=[];const cv=document.createElement('canvas');cv.width=cv.height=16;const g=cv.getContext('2d');
   for(const id of pgI){try{D[id].ipaint(g,C2.mulberry32(id));}catch(e){bad2.push(id);}}
   ok('every item icon painter runs'+(bad2.length?' ('+bad2.join(',')+')':''),bad2.length===0);}
  const GK=pgI.filter(id=>D[id].gadget);
  ok('gear with a held model has gadget pg_*: all 18 tools/weapons, the gear, the souvenirs ('+GK.length+')',GK.length>=30&&GK.every(id=>/^pg_/.test(D[id].gadget))&&TOOLS.every(r=>D[r[0]].gadget));
  {const bad3=[];for(const id of GK){try{const g=new THREE.Group();V.piGadgetMesh(D[id].gadget,g,()=>{});if(!g.children.length)bad3.push(id);}catch(e){bad3.push(id+':'+e.message);}}
   ok('every held model builds (bespoke box models, shared geometry)'+(bad3.length?' ('+bad3.slice(0,4).join(',')+')':''),bad3.length===0);}
  ok('verbs: the Programme, Mitt, Mirror, Fly, Pie, Charge, Plunger, Staple Gun, Slam Gloves, Fuse, Live Chicken and the souvenirs have puse',
    [285,327,328,329,330,331,332,333,335,337,353,362,363,364].every(id=>typeof D[id].puse==='function')&&D[327].puseHold&&D[328].puseHold&&D[335].puseHold&&D[330].puseHold);
  ok('names use ASCII apostrophes',pgI.concat([99,117,118,119,247]).every(id=>!/[‘’]/.test(D[id].name)));

  /* ---- smelting (bible 7.5) ---- */
  const S=V.SMELT,F=V.FUELS;
  ok('SMELT: hanger->wire, foam dust->foam chunk, rubber chicken->roast, dough ball->flatbread, ham->glazed, fish->grilled',
    S[296]===297&&S[294]===293&&S[352]===354&&S[355]===356&&S[358]===359&&S[360]===361);
  ok('FUELS: Elbow Grease 80 s (8 items), Cardboard 15, Felt 10, Stuffing 10',F[291]===80&&F[292]===15&&F[286]===10&&F[290]===10);
  ok('MOBT props P2 owns: pgcharge, pgfly, pgtrans (pmob, prop, pnc, hp 999, legc) with meshes and brains',['pgcharge','pgfly','pgtrans'].every(k=>{const T=V.MOBT[k];
    return T&&T.pmob===1&&T.prop===1&&T.pnc===1&&T.hp===999&&T.legc&&V.PREG.mesh[k]&&V.PREG.brain[k];}));
  ok('P2 registers pcan, plab, ptrans, psoup interact kinds, the Prop Trunk sneak-climb and the fly/pie/staple/charge/boot projectiles',
    ['pcan','plab','ptrans','psoup'].every(k=>typeof V.PREG.interact[k]==='function')&&typeof V.PREG.sneakUse[B.PG_PTRUNK]==='function'&&
    ['fly','pie','staple','charge','boot'].every(k=>V.PREG.proj[k]&&typeof V.PREG.proj[k].mesh==='function'));
  ok('the Eyeball Lamp is a torch (hook P2-01) and nothing else purgatory is',C2.isTorch(B.PG_LAMP)&&!C2.isTorch(B.PG_EYE)&&C2.isTorch(V.B.TORCH));
});
