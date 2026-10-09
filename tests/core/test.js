/* DINGLECRAFT logic seed suite — static facts about the loaded game.
   NOTE: the shipped build does not export DEFS/calcCraft; restoring those
   exports (one-line rep on the __vox object) is infra task #1 in CLAUDE.md,
   after which recipe tests can return here. */
'use strict';
require('./stubs.js');
require('./game.js');
const V=global.__vox;
const {B,IT,MOBT}=V;
let pass=0,fail=0;
const ok=(n,c)=>{if(c)pass++;else{fail++;console.log('FAIL '+n);}};

ok('core blocks present',B.GRASS===1&&B.STONE===3&&B.WATER===22&&B.BEDROCK===21&&B.SBRICK===73&&B.TCORE===78);
ok('spawners + bed + ench ids',B.SPAWNER_Z===74&&B.SPAWNER_S===75&&B.ENCH===76&&B.BED===77);
ok('item ledger landmarks',IT.DSCALE===224&&IT.CRYSTAL===225&&IT.COMPASS===226&&IT.BOAT===223&&IT.CART===221&&IT.DEGG===222);
ok('tool id math',V.toolId(3,3)===135&&V.toolId(0,0)===120);
ok('armor id math',V.armorId(0,0)===230&&V.armorId(3,3)===245);
ok('gun range untouched by eggs',V.EGG_BASE===250);
const eggs=V.EGG_MOBS();
ok('fifteen spawn eggs',Array.isArray(eggs)&&eggs.length===15&&eggs.includes('demon')&&eggs.includes('creep')&&eggs.includes('nuker'));
ok('mob roster',!!(MOBT.pig&&MOBT.zombie&&MOBT.boomer&&MOBT.alien&&MOBT.dragon&&MOBT.boss&&MOBT.dking&&MOBT.titan&&MOBT.demon));
ok('nuke creepers flagged',MOBT.creep&&MOBT.creep.nuke&&MOBT.creep.boom&&MOBT.nuker&&MOBT.nuker.nuke&&MOBT.creep.hw<MOBT.nuker.hw);
ok('bosses are bosses',MOBT.demon.boss&&MOBT.demon.hp===300&&MOBT.dking.fly&&MOBT.titan.hp===120);
ok('dragons fly and drop scales',MOBT.dragon.fly&&MOBT.dragon.drop&&MOBT.dragon.drop.id===IT.DSCALE);
ok('gamerule defaults',V.GR.mobGrief===true&&V.GR.god===false&&V.GR.keepInv===false&&V.GR.dayCycle===true);
ok('powers table',V.POW.length===6&&V.POW.some(p=>p.k==='fly'&&p.cost===8));

/* ---- v1.x core: crafting / smelting / inventory / drops / tool-gating ----
   Re-enabled by infra task #1 (DEFS/calcCraft/blockDrop/inv* restored to __vox). */
const {DEFS}=V;
const stk=id=>({id,count:1});
const cc=(g,w)=>V.calcCraft(g,w);

// crafting: shapeless log -> 4 planks, and shaped recipes
{const r=cc([stk(B.LOG_O),null,null,null],2);
 ok('shapeless: 1 log -> 4 planks',!!r&&r.id===B.PLANK_O&&r.count===4);}
{const r=cc([stk(B.PLANK_O),null,stk(B.PLANK_O),null],2);
 ok('shaped: 2 planks -> 4 sticks',!!r&&r.id===IT.STICK&&r.count===4);}
{const r=cc([stk(B.PLANK_O),stk(B.PLANK_O),stk(B.PLANK_O),stk(B.PLANK_O)],2);
 ok('shaped: 2x2 planks -> crafting table',!!r&&r.id===B.CRAFT&&r.count===1);}
{const g=[stk(B.PLANK_O),stk(B.PLANK_O),stk(B.PLANK_O),null,stk(IT.STICK),null,null,stk(IT.STICK),null];
 const r=cc(g,3);
 ok('shaped: wooden pickaxe with durability',!!r&&r.id===V.toolId(0,0)&&r.count===1&&r.dur===60);}
{const c=stk(B.COBBLE);const g=[c,c,c,c,null,c,c,c,c].map(s=>s?stk(B.COBBLE):null);
 const r=cc(g,3);
 ok('shaped: 8 cobble ring -> furnace',!!r&&r.id===B.FURNACE);}

// smelting + fuel tables
ok('smelt table maps ore/sand/beef',V.SMELT[B.IRON_ORE]===IT.IRON&&V.SMELT[B.SAND]===B.GLASS&&V.SMELT[IT.BEEF]===IT.STEAK);
ok('fuel table values',V.FUELS[IT.COAL]===80&&V.FUELS[B.PLANK_O]===15&&V.FUELS[IT.STICK]===5);

// block defs + tool gating + break time
ok('stone def: pick-required tier0',DEFS[B.STONE].hard===1.5&&DEFS[B.STONE].toolClass==='pick'&&DEFS[B.STONE].req===true);
ok('canHarvest stone needs a pick',V.canHarvest(B.STONE,null)===false&&V.canHarvest(B.STONE,stk(V.toolId(0,0)))===true);
ok('canHarvest diamond ore needs iron+',V.canHarvest(B.DIA_ORE,stk(V.toolId(0,0)))===false&&V.canHarvest(B.DIA_ORE,stk(V.toolId(2,0)))===true);
ok('breakTime: bedrock unbreakable, right tool faster',V.breakTime(B.BEDROCK,null)===Infinity&&V.breakTime(B.STONE,stk(V.toolId(0,0)))<V.breakTime(B.STONE,null));

// block drops
{const d=id=>V.blockDrop(id);
 ok('drop: stone->cobble, dirt->self',d(B.STONE).id===B.COBBLE&&d(B.DIRT).id===B.DIRT);
 ok('drop: leaves->nothing',d(B.LEAF_O)===null);
 ok('drop: clay->4 clay balls, coal ore->coal',d(B.CLAY).id===IT.CLAYBALL&&d(B.CLAY).count===4&&d(B.COAL_ORE).id===IT.COAL);}

// inventory: stacking, counting, consuming, craft-consume
ok('stackMax: blocks 64, tools 1',V.stackMax(B.STONE)===64&&V.stackMax(V.toolId(0,0))===1);
{const arr=new Array(4).fill(null);
 const left=V.invAddTo(arr,{id:B.STONE,count:70});
 ok('invAddTo stacks with no leftover across slots',left===0&&V.invCount(arr,B.STONE)===70);
 ok('invConsume removes across stacks and reports success',V.invConsume(arr,B.STONE,50)===true&&V.invCount(arr,B.STONE)===20);
 ok('invConsume reports failure when short',V.invConsume(arr,B.STONE,999)===false);}
{const g=[{id:B.PLANK_O,count:1},{id:B.PLANK_O,count:2},null,null];V.takeCraft(g);
 ok('takeCraft decrements each cell and nulls empties',g[0]===null&&g[1].count===1);}

/* ---- v2.4: patch notes ---- */
{const pn=V.PATCH_NOTES;
 ok('patch notes are present and well-formed',!!pn&&typeof pn.v==='string'&&pn.v.length>0&&typeof pn.title==='string'&&Array.isArray(pn.lines)&&pn.lines.length>=1&&pn.lines.every(l=>typeof l==='string'&&l.trim().length>0));
 ok('patch notes version cannot drift from the build',pn.v===V.GAME_VERSION);}

/* ---- v2.5: 3D tool models ---- */
{const T=V.TOOL3D;
 ok('four tool models embedded',!!T&&!!T.pick&&!!T.axe&&!!T.shovel&&!!T.sword);
 let good=true;
 for(const k of ['pick','axe','shovel','sword']){
   const d=T[k],nv=d.p.length/3;
   if(d.p.length%3!==0||d.h.length!==nv||d.c.length!==nv||d.i.length%3!==0)good=false;
   for(let i=0;i<d.i.length;i++)if(d.i[i]>=nv){good=false;break;}
   let heads=0;for(const x of d.h)heads+=x;
   if(!(heads>0&&heads<nv))good=false;
 }
 ok('model data well-formed: indices in range, head+handle verts both present',good);
 const tp=V.toolIdParts;
 ok('toolIdParts covers exactly the tool id range',
   tp(120).m===0&&tp(120).t===0&&tp(135).m===3&&tp(135).t===3&&tp(139).m===4&&tp(139).t===3&&tp(119)===null&&tp(140)===null&&tp(IT.DIAMOND)===null);}

/* ---- v2.6: 3D weapons (packed), gun id math ---- */
{const W=V.WPN3D;
 ok('five weapon models embedded',!!W&&!!W.pistol&&!!W.shotgun&&!!W.smg&&!!W.sniper&&!!W.bow);
 let good=true;
 for(const k of ['pistol','shotgun','smg','sniper','bow','skate']){
   const d=W[k];
   const p=V.b64bytes(d.p),iv=V.b64bytes(d.i),vv=V.b64bytes(d.v);
   if(p.length!==d.n*3)good=false;
   if(vv.length!==d.n)good=false;
   if(iv.length%2!==0||(iv.length/2)%3!==0)good=false;
   const I=new Uint16Array(iv.buffer);
   for(let x=0;x<I.length;x++)if(I[x]>=d.n){good=false;break;}
   for(let x=0;x<vv.length;x++)if(vv[x]>=d.pal.length){good=false;break;}
 }
 ok('packed weapon data decodes consistently (b64, indices, palette)',good);
 ok('gun metal tints by tier, the bow keeps its own colours',W.pistol.pal.some(e=>e[1]===1)&&W.bow.pal.every(e=>e[1]===0));
 const gp=V.gunIdParts;
 ok('gunIdParts covers exactly the 12 gun ids',
   gp(200).m===0&&gp(200).t===0&&gp(211).m===2&&gp(211).t===3&&gp(199)===null&&gp(212)===null&&gp(V.toolId(0,0))===null);}

/* ---- v2.7: subscribe button, sub enchants, skate model ---- */
{ok('the Subscribe Button exists at id 227',IT.SUBBTN===227&&!!V.DEFS[227]&&V.DEFS[227].subbtn===true&&V.DEFS[227].dur===64&&V.DEFS[227].stack===1);
 const bk=id=>({id,count:1});
 const g=[bk(IT.BRICKIT),bk(IT.BRICKIT),bk(IT.BRICKIT),bk(IT.BRICKIT),bk(B.WOOL),bk(IT.BRICKIT),bk(IT.BRICKIT),bk(IT.BRICKIT),bk(IT.BRICKIT)];
 const r=V.calcCraft(g,3);
 ok('the Subscribe Button cannot be crafted (store exclusive)',!r||r.id!==IT.SUBBTN);
 ok('the DINGLE STORE sells it instead',V.STORE_CAT.some(c=>c.key==='joke_subbtn'&&c.price===1287&&c.once===false));
 ok('sub enchants defined',(()=>{const E=V.rollOffers({id:IT.SUBBTN});
   return E.length>0&&E.every(k=>['viral','srec','unb'].includes(k));})());
 ok('guns still refuse enchantment',V.rollOffers({id:200}).length===0);}

/* ---- v2.9: armor slot rules + DIRTARIA statics ---- */
{const aa=V.armorAccepts;
 ok('armor slots accept only their own piece',
   aa(0,{id:V.armorId(0,0)})===true&&aa(0,{id:V.armorId(3,0)})===true&&
   aa(0,{id:V.armorId(0,1)})===false&&aa(2,{id:V.armorId(1,2)})===true&&
   aa(3,{id:V.armorId(2,0)})===false&&aa(1,{id:B.STONE})===false&&aa(2,null)===true);
 ok('the Gaming Rig block exists at id 79',B.TERM===79&&V.DEFS[79]&&V.DEFS[79].interact==='terr'&&V.DEFS[79].tiles&&V.DEFS[79].toolClass==='axe');
 ok('DIRTARIA is in the store',V.STORE_CAT.some(c=>c.key==='joke_terr'&&c.price===5999));}

/* ---- v2.10: DIRTARIA v2 statics ---- */
{ok('DIRTARIA crafting table is well-formed',Array.isArray(V.TCRAFTS)&&V.TCRAFTS.length>=7&&
   ['planks','torch','brick','spick','gpick','gsword','trophy'].every(k=>V.TCRAFTS.some(c=>c.k===k)));
 const tr=V.TCRAFTS.find(c=>c.k==='trophy');
 ok('the GOLDEN DINGLE demands exactly 15 ore',tr&&tr.need.ore===15&&tr.win===true);}

/* ---- v2.11: patch archive + QoL statics ---- */
{ok('patch notes are an archive now',Array.isArray(V.PATCH_LOG)&&V.PATCH_LOG.length>=2&&V.PATCH_NOTES===V.PATCH_LOG[0]);
 ok('the archive keeps history',V.PATCH_LOG.some(e=>e.v==='2.10')&&V.PATCH_LOG[0].v===V.GAME_VERSION);}

/* ---- v3.0: dimensions + gadgets statics ---- */
{ok('dimension blocks landed on the ledger',B.NETHROCK===80&&B.GLOWSTONE===82&&B.OBSIDIAN===84&&B.PORTAL_N===85&&B.CLOUDSTONE===86&&B.PORTAL_A===90);
 ok('obsidian demands a diamond pick',V.DEFS[B.OBSIDIAN].tier===3&&V.DEFS[B.OBSIDIAN].req===true);
 const bkt=V.calcCraft([{id:IT.IRON,count:1},null,{id:IT.IRON,count:1},null,{id:IT.IRON,count:1},null,null,null,null].map((s,i)=>[0,2,4].includes(i)?{id:IT.IRON,count:1}:null),3);
 ok('three iron make a bucket',(()=>{const g=[{id:IT.IRON,count:1},null,{id:IT.IRON,count:1},{id:IT.IRON,count:1},null,null,null,null,null];
   const g2=[{id:IT.IRON,count:1},null,{id:IT.IRON,count:1},null,{id:IT.IRON,count:1},null,null,null,null];
   const r=V.calcCraft(g2,3);return !!r&&r.id===IT.BUCKET;})());
 ok('all ten gadgets exist',V.GADGET_IDS.length===10&&V.GADGET_IDS.every(id=>V.DEFS[id]&&V.DEFS[id].gadget&&V.DEFS[id].stack===1));
 ok('boss loot rolls real gadgets',(()=>{for(let i=0;i<25;i++)if(!V.GADGET_IDS.includes(V.randGadget()))return false;return true;})());
 ok('seven gadget models came from the internet',['gd_dj','gd_jet','gd_grap','gd_glide','gd_mag','gd_tramp','gd_pig'].every(k=>!!V.WPN3D[k]));
 ok('new bosses are registered',MOBT.infernis&&MOBT.infernis.boss&&MOBT.valkyra&&MOBT.valkyra.fly&&MOBT.imp&&MOBT.cherub&&MOBT.hellhog);}

/* ---- v3.3: placeable trampolines ---- */
{ok('the trampoline block exists at id 91',B.TRAMP===91&&V.DEFS[91]&&V.DEFS[91].toolClass==='axe'&&V.DEFS[91].tiles.top==='tramp_t');
 const g=[{id:IT.STRING,count:1},{id:IT.STRING,count:1},{id:IT.STRING,count:1},
          {id:B.PLANK_O,count:1},{id:B.PLANK_O,count:1},{id:B.PLANK_O,count:1},null,null,null];
 const r=V.calcCraft(g,3);
 ok('string over planks crafts a trampoline',!!r&&r.id===B.TRAMP);}

/* ---- v3.5: the grab bag ---- */
{ok('grab-bag blocks are on the ledger',B.SHELF===92&&B.JAR===93&&B.LAWN===94&&B.CINEMA===95&&B.SCREEN===96&&
   V.DEFS[B.SHELF].interact==='disp'&&V.DEFS[B.JAR].interact==='disp'&&V.DEFS[B.SCREEN].interact==='cine');
 ok('grab-bag items are on the ledger',IT.ROD===275&&IT.ROD_R===276&&IT.FISH===277&&IT.FISH_C===278&&
   IT.FIGURINE===279&&IT.POPCORN===280&&IT.M8BALL===281&&V.DEFS[IT.M8BALL].gadget==='m8');
 ok('fish cook into cooked fish',V.SMELT[IT.FISH]===IT.FISH_C);
 ok('rod recipe works',(()=>{
   const g=[null,{id:IT.STICK,count:1},null,
            {id:IT.STRING,count:1},{id:IT.STICK,count:1},null,
            {id:IT.STRING,count:1},null,null];
   const r=V.calcCraft(g,3);
   return !!r&&r.id===IT.ROD;})());
 ok('cursed rod conversion works',(()=>{const r=V.calcCraft([{id:IT.ROD,count:1},{id:IT.GUNPOWDER,count:1},null,null],2);
   return !!r&&r.id===IT.ROD_R;})());
 ok('snakes and blocklings joined the roster',!!MOBT.snake&&!!MOBT.blockling);
 ok('living blocks fire at roughly 1-in-500',(()=>{
   let n=0;for(let i=0;i<20000;i++)if(V.blockAliveRoll(i*7,(i*13)%80,i*31))n++;
   return n>10&&n<90;})());}

console.log(pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
