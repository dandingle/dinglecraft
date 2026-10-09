/* =====================================================================
   DINGLECRAFT — an original, fan-made voxel sandbox inspired by Minecraft;
   not affiliated with Mojang or Microsoft. No Mojang assets are used.
   Original code. Art is drawn in code or AI-generated for this project;
   a few third-party meshes are credited in THIRD_PARTY.md.
   ---------------------------------------------------------------------
   SAVE FORMAT v1 (keep loaders for this format in all future versions):
   { f:1, v:<game version>, name, seed, mode:'survival'|'creative',
     time:<0..1>, player:{x,y,z,yaw,pitch,hp,hunger,sel,spawn:[x,y,z],
     inv:[ {id,count,dur?} | null x36 ]},
     edits:{ "x,y,z": blockId, ... },          // diff vs. procedural gen
     be:{ "x,y,z": {t:'furnace'|'chest', ...} },
     ents:[ {t:<mobType|'drop'>, x,y,z, hp?, id?, count?, dur?} ] }
   ===================================================================== */
'use strict';

const GAME_VERSION = '6.9';
const RELEASE_LABEL = 'Release 1.0';   /* the public name of this game version (docs/RELEASING.md): GAME_VERSION stays the internal, monotonic number */
var HIT_HOW=null,EXPL_BY=null;  /* damage attribution (PART 53) */
var TP={id:'og',q:-1,qr:1,hr:false,busy:false,want:null,shadow:false,mods:[],live:[],og:null,ogR:null,ogF:null,ev:{},warm:null,devTexBase:null};  /* texture packs (PART 54) */
const SAVE_FORMAT  = 1;

const CH = 16;            // chunk size (x,z)
const WH = 80;            // world height
const SEA = 30;           // sea level
const DAY_LEN = 600;      // seconds per full day
const GRAV = 24;
const REACH = 5;

