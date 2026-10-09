/* ---- PART 57: m2_loot.js ---- */
/* ===================================================================== */
/* PART 57 m2 (M2): loot and Malgorath's Jaw (bible 14). The kill pays   */
/* itself (never through killMob): the key items at the killing hit (so  */
/* a quit mid-scene loses nothing that matters), the spill from his      */
/* mouth at t 10 of the burst. The Jaw bites 3x3x3 chunks out of the     */
/* world (19 cells, no corners) straight into the inventory.             */
/* ===================================================================== */
var MG2LOOT={diamond:16,crystal:8,scale:8,xp:300,slot:3};
/* at the killing hit: Malgorath's Jaw (first kill per world), the Demon Horns, Dan's hat back */
function mg2PayKeys(){if(!MALG.jaw){MALG.jaw=1;const left=invAddTo(P.inv,{id:MGC.JAW,count:1});if(left)spawnDrop(P.x,P.y+0.8,P.z,{id:MGC.JAW,count:1},0,2,0);}
  if(P.own&&!P.own.includes('hat_horns'))P.own.push('hat_horns');
  if(MALG.hat&&P.cos){P.cos.hat=MALG.hat;MALG.hat=null;}
  try{redrawHotbar();refreshHand();}catch(err){}}
/* the spill: 16 diamonds, 8 crystals, 8 dragon scales, 300 XP, the slot machine's 3 diamonds; bots never take it */
function mg2PaySpill(){if(MG2.paid===MALG.kills)return;MG2.paid=MALG.kills;const L=MG2LOOT;
  const s=mg2Land(P.x+(MGC.X-P.x)*0.15,P.z+(MGC.Z-P.z)*0.15,{rmin:12.6,rmax:23});
  const drop=(id,n)=>{let left=n;while(left>0){const c=Math.min(left,stackMax(id));left-=c;spawnDrop(s.x,s.y+1.2,s.z,{id,count:c},mg2Rng(-2.5,2.5),mg2Rng(4,7),mg2Rng(-2.5,2.5));
    const d=entities[entities.length-1];if(d&&d.t==='drop')d.mgNoBot=1;}};
  drop(IT.DIAMOND,L.diamond+L.slot);drop(IT.CRYSTAL,L.crystal);drop(IT.DSCALE,L.scale);spawnXP(s.x,s.y+1,s.z,L.xp);
  mg2Burst('geyser',s.x,s.y+0.5,s.z,{id:B.DIA_ORE,n:16,pw:2});mg2S('thud',s.x,s.y,s.z);}   /* nothing musical after the chord */

/* ---- Malgorath's Jaw (item 365): melee 10 (the def), and the right-click bite ---- */
function mg2JawOK(x,y,z,id){if(id===B.AIR||id===B.BEDROCK||id===B.WATER||id===B.LAVA||id===B.PORTAL_N||id===B.PORTAL_A||id===B.SPAWNER_Z||id===B.SPAWNER_S)return false;
  const d=DEFS[id];if(!d||d.hard<0||d.interact||d.cr||d.pg||d.be)return false;
  if(typeof blockEnts!=='undefined'&&blockEnts.has(x+','+y+','+z))return false;
  if(MGP_ON&&mgProtected(x,y,z,'jaw'))return false;return true;}
function mg2JawUse(st,hit,dt){if(DIM==='puppet'||P.useT>0)return false;
  const e=eyePos(),l=lookDir();
  const m=pickMob(e[0],e[1],e[2],l[0],l[1],l[2],3.0);
  if(m&&(!hit||m.t<hit.t)){const t=m.e;HIT_BY='Dan';HIT_HOW='melee';try{t.hurtT=0;hurtMob(t,12,t.x-P.x,t.z-P.z);}finally{HIT_BY=null;HIT_HOW=null;}
    if(!t.dead&&!MOBT[t.mt].boss&&!(MOBT[t.mt].mg)){const dx=P.x-t.x,dz=P.z-t.z,dl=Math.hypot(dx,dz)||1;moveBody(t,dx/dl*2,0,dz/dl*2,false);}
    mg2JawFx();P.useT=1.0;P.swing=1;damageHeld(1);return true;}
  if(!hit)return false;const cx=Math.floor(e[0]+l[0]*2.5),cy=Math.floor(e[1]+l[1]*2.5),cz=Math.floor(e[2]+l[2]*2.5);   /* centred 2.5 m along the look */
  let n=0;const got=[];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)===3)continue;
    const x=cx+dx,y=cy+dy,z=cz+dz,id=getBlock(x,y,z);if(!mg2JawOK(x,y,z,id))continue;
    const dr=blockDrop(id);setBlock(x,y,z,B.AIR);if(getBlock(x,y,z)!==B.AIR)continue;n++;if(dr)got.push(dr);}
  if(!n)return false;
  for(const dr of got){const left=invAddTo(P.inv,{id:dr.id,count:dr.count});if(left>0)spawnDrop(P.x,P.y+0.6,P.z,{id:dr.id,count:left},0,1.5,0);}
  try{redrawHotbar();}catch(err){}
  burstParticles(cx+0.5,cy+0.5,cz+0.5,got.length?got[0].id:B.STONE,10,0.9);mg2JawFx();P.useT=1.0;P.swing=1;damageHeld(1);return true;}
function mg2JawFx(){mg2S('mg_chomp');MG2.jawFx=0.25;}
DEFS[MGC.JAW].mgUse=mg2JawUse;
