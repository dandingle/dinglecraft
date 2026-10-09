/* ------------------------------ block ids --------------------------- */
const B = {AIR:0,GRASS:1,DIRT:2,STONE:3,COBBLE:4,PLANK_O:5,PLANK_B:6,PLANK_S:7,
  SAND:8,GRAVEL:9,LOG_O:10,LOG_B:11,LOG_S:12,LEAF_O:13,LEAF_B:14,LEAF_S:15,
  GLASS:16,COAL_ORE:17,IRON_ORE:18,GOLD_ORE:19,DIA_ORE:20,BEDROCK:21,WATER:22,
  SANDSTONE:23,SNOWGRASS:24,CACTUS:25,WOOL:26,BRICK:27,STONEBRICK:28,CRAFT:29,
  FURNACE:30,CHEST:31,TNT:32,TORCH:33,TALLGRASS:34,FLOWER_R:35,FLOWER_Y:36,
  CLAY:37,ICE:38};
const IT = {STICK:100,COAL:101,IRON:102,GOLD:103,DIAMOND:104,CLAYBALL:105,
  BRICKIT:106,GUNPOWDER:107,STRING:108,ARROW:109,APPLE:110,PORK:111,PORK_C:112,
  BEEF:113,STEAK:114,FLESH:115,BOW:116};
const toolId=(mat,type)=>120+mat*4+type;   // mat 0..4, type 0:pick 1:axe 2:shovel 3:sword

/* tile indices are assigned when the atlas is painted (part 2). The defs
   below reference symbolic tile names which are resolved at atlas build. */
const DEFS = {}; // id -> def
function def(id,o){DEFS[id]=Object.assign({name:'?',solid:true,opq:true,bucket:'op',
  hard:1,toolClass:null,tier:0,req:false,drop:undefined,stack:64,cullSame:false},o);}

def(B.AIR,{name:'Air',solid:false,opq:false,hard:-1});
def(B.GRASS,{name:'Grass Block',tiles:{top:'grass_top',side:'grass_side',bot:'dirt'},hard:0.6,toolClass:'shovel',drop:B.DIRT});
def(B.DIRT,{name:'Dirt',tiles:'dirt',hard:0.5,toolClass:'shovel'});
def(B.STONE,{name:'Stone',tiles:'stone',hard:1.5,toolClass:'pick',req:true,drop:B.COBBLE});
def(B.COBBLE,{name:'Cobblestone',tiles:'cobble',hard:2,toolClass:'pick',req:true});
def(B.PLANK_O,{name:'Oak Planks',tiles:'plank_o',hard:2,toolClass:'axe'});
def(B.PLANK_B,{name:'Birch Planks',tiles:'plank_b',hard:2,toolClass:'axe'});
def(B.PLANK_S,{name:'Spruce Planks',tiles:'plank_s',hard:2,toolClass:'axe'});
def(B.SAND,{name:'Sand',tiles:'sand',hard:0.5,toolClass:'shovel',gravity:true});
def(B.GRAVEL,{name:'Gravel',tiles:'gravel',hard:0.6,toolClass:'shovel',gravity:true});
def(B.LOG_O,{name:'Oak Log',tiles:{top:'log_top',side:'log_o',bot:'log_top'},hard:2,toolClass:'axe'});
def(B.LOG_B,{name:'Birch Log',tiles:{top:'log_top',side:'log_b',bot:'log_top'},hard:2,toolClass:'axe'});
def(B.LOG_S,{name:'Spruce Log',tiles:{top:'log_top',side:'log_s',bot:'log_top'},hard:2,toolClass:'axe'});
def(B.LEAF_O,{name:'Oak Leaves',tiles:'leaf_o',hard:0.2,opq:false,bucket:'cut',cullSame:true,drop:null});
def(B.LEAF_B,{name:'Birch Leaves',tiles:'leaf_b',hard:0.2,opq:false,bucket:'cut',cullSame:true,drop:null});
def(B.LEAF_S,{name:'Spruce Leaves',tiles:'leaf_s',hard:0.2,opq:false,bucket:'cut',cullSame:true,drop:null});
def(B.GLASS,{name:'Glass',tiles:'glass',hard:0.3,opq:false,bucket:'cut',cullSame:true,drop:null});
def(B.COAL_ORE,{name:'Coal Ore',tiles:'ore_coal',hard:3,toolClass:'pick',req:true,drop:IT.COAL});
def(B.IRON_ORE,{name:'Iron Ore',tiles:'ore_iron',hard:3,toolClass:'pick',req:true,tier:1});
def(B.GOLD_ORE,{name:'Gold Ore',tiles:'ore_gold',hard:3,toolClass:'pick',req:true,tier:2});
def(B.DIA_ORE,{name:'Diamond Ore',tiles:'ore_dia',hard:3,toolClass:'pick',req:true,tier:2,drop:IT.DIAMOND});
def(B.BEDROCK,{name:'Bedrock',tiles:'bedrock',hard:-1});
def(B.WATER,{name:'Water',tiles:'water',solid:false,opq:false,bucket:'wat',cullSame:true,hard:-1});
def(B.SANDSTONE,{name:'Sandstone',tiles:{top:'sandstone_t',side:'sandstone',bot:'sandstone_t'},hard:0.8,toolClass:'pick',req:true});
def(B.SNOWGRASS,{name:'Snowy Grass',tiles:{top:'snow',side:'snow_side',bot:'dirt'},hard:0.6,toolClass:'shovel',drop:B.DIRT});
def(B.CACTUS,{name:'Cactus',tiles:{top:'cactus_t',side:'cactus',bot:'cactus_t'},hard:0.4,hurts:true});
def(B.WOOL,{name:'Wool',tiles:'wool',hard:0.8});
def(B.BRICK,{name:'Bricks',tiles:'brick',hard:2,toolClass:'pick',req:true});
def(B.STONEBRICK,{name:'Stone Bricks',tiles:'stonebrick',hard:1.5,toolClass:'pick',req:true});
def(B.CRAFT,{name:'Crafting Table',tiles:{top:'craft_t',side:'craft_s',bot:'plank_o'},hard:2.5,toolClass:'axe',interact:'craft'});
def(B.FURNACE,{name:'Furnace',tiles:{top:'furn_t',side:'furn_f',bot:'furn_t'},hard:3.5,toolClass:'pick',req:true,interact:'furnace'});
def(B.CHEST,{name:'Chest',tiles:{top:'chest_t',side:'chest_f',bot:'chest_t'},hard:2.5,toolClass:'axe',interact:'chest'});
def(B.TNT,{name:'TNT',tiles:{top:'tnt_t',side:'tnt_s',bot:'tnt_t'},hard:0.1,interact:'tnt'});
def(B.TORCH,{name:'Torch',tiles:'torch',hard:0,solid:false,opq:false,bucket:'cut',cross:true,light:true});
def(B.TALLGRASS,{name:'Tall Grass',tiles:'tallgrass',hard:0,solid:false,opq:false,bucket:'cut',cross:true,drop:null,replace:true});
def(B.FLOWER_R,{name:'Rose',tiles:'flower_r',hard:0,solid:false,opq:false,bucket:'cut',cross:true,replace:true});
def(B.FLOWER_Y,{name:'Dandelion',tiles:'flower_y',hard:0,solid:false,opq:false,bucket:'cut',cross:true,replace:true});
def(B.CLAY,{name:'Clay',tiles:'clay',hard:0.6,toolClass:'shovel',drop:{id:IT.CLAYBALL,count:4}});
def(B.ICE,{name:'Ice',tiles:'ice',hard:0.5,opq:false,bucket:'wat',cullSame:true,toolClass:'pick',drop:null,slippery:true});

/* ------------------------------ items ------------------------------- */
function idef(id,o){DEFS[id]=Object.assign({item:true,name:'?',stack:64},o);}
idef(IT.STICK,{name:'Stick',icon:'i_stick'});
idef(IT.COAL,{name:'Coal',icon:'i_coal'});
idef(IT.IRON,{name:'Iron Ingot',icon:'i_iron'});
idef(IT.GOLD,{name:'Gold Ingot',icon:'i_gold'});
idef(IT.DIAMOND,{name:'Diamond',icon:'i_dia'});
idef(IT.CLAYBALL,{name:'Clay Ball',icon:'i_clay'});
idef(IT.BRICKIT,{name:'Brick',icon:'i_brick'});
idef(IT.GUNPOWDER,{name:'Gunpowder',icon:'i_gun'});
idef(IT.STRING,{name:'String',icon:'i_string'});
idef(IT.ARROW,{name:'Arrow',icon:'i_arrow'});
idef(IT.APPLE,{name:'Apple',icon:'i_apple',food:4});
idef(IT.PORK,{name:'Raw Porkchop',icon:'i_pork',food:3});
idef(IT.PORK_C,{name:'Cooked Porkchop',icon:'i_porkc',food:8});
idef(IT.BEEF,{name:'Raw Beef',icon:'i_beef',food:3});
idef(IT.STEAK,{name:'Steak',icon:'i_steak',food:8});
idef(IT.FLESH,{name:'Rotten Flesh',icon:'i_flesh',food:4});
idef(IT.BOW,{name:'Bow',icon:'i_bow',stack:1,bow:true,dur:120});

const TOOLMAT=[
  {n:'Wooden', mult:2, tier:0, dur:60,  col:'#9a6b39'},
  {n:'Stone',  mult:4, tier:1, dur:132, col:'#8a8a8a'},
  {n:'Iron',   mult:6, tier:2, dur:251, col:'#d8d8d8'},
  {n:'Diamond',mult:11,tier:3, dur:780, col:'#46e2cf'},
  {n:'Golden', mult:12,tier:0, dur:33,  col:'#ffe34d'}];
const TOOLTYPE=['Pickaxe','Axe','Shovel','Sword'];
const TOOLCLASS=['pick','axe','shovel','sword'];
const SWORD_DMG=[4,5,6,7,4], TOOL_DMG=[2,3,4,5,2];
for(let m=0;m<5;m++)for(let t=0;t<4;t++){
  idef(toolId(m,t),{name:TOOLMAT[m].n+' '+TOOLTYPE[t],icon:'tool_'+m+'_'+t,stack:1,
    tool:{type:TOOLCLASS[t],tier:TOOLMAT[m].tier,mult:TOOLMAT[m].mult,
      dur:TOOLMAT[m].dur,dmg:t===3?SWORD_DMG[m]:TOOL_DMG[m]}});
}

