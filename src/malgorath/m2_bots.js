/* ---- PART 57: m2_bots.js ---- */
/* ===================================================================== */
/* PART 57 m2 (M2): the AI players in the Bite (bible 17). Present,      */
/* alive, in character; never able to break Dan's game: they never       */
/* summon, never hit the hide (the PART 53 reflex skips mgNoBot), deal   */
/* x0.5 to open weak points through their own gate slot, never take him  */
/* below 30, are swallowed (never chomped) and belched back, keep their  */
/* kit and wake at the Bone Pile while a round is live, and get at most  */
/* 30% of his attacks while Dan is in the arena.                         */
/* ===================================================================== */
function mg2Swallow(a,why){if(!a||!a.e||mg2Eaten(a))return;const e=a.e;
  const q={a,t:mg2Rng(15,25),why,heal:0};MG2.eaten.push(q);
  if(!MG2.L.botSnack){MG2.L.botSnack=1;q.heal=1;mg2Heal(8);}
  if(e.mesh)e.mesh.visible=false;mg2S('mg_gulp');mg2Mech('botEaten');
  try{agEvent(a,'MALGORATH ATE YOU. You are curled up inside his belly (it is warm). He will spit you out soon.',9);}catch(err){}
  mg2BotLine(a,'eaten');}
function mg2BotOut(a,instant){const i=MG2.eaten.findIndex(q=>q.a===a);if(i<0)return;MG2.eaten.splice(i,1);const e=a.e;if(!e)return;
  const s=mg2Land(MGC.X+mg2Rng(-16,16),MGC.Z+mg2Rng(-16,16),{});e.x=s.x;e.y=s.y+0.3;e.z=s.z;e.vx=e.vy=e.vz=0;a.x=e.x;a.y=e.y;a.z=e.z;
  if(e.mesh){e.mesh.visible=true;e.mesh.position.set(e.x,e.y,e.z);}a.spawnProt=AG_T+3;mg2Grace(a,3);
  if(!instant){mg2S('mg_belch',e.x,e.y,e.z);mg2Burst('splat',e.x,e.y+0.5,e.z,{id:B.NETHROCK,n:8});}
  mg2BotLine(a,'out');}
/* Dan died or the round reset: bots inside are spat onto the Bone Pile (no damage), protected 3 s (bible 15.3) */
function mg2BotToPile(a){const e=a.e;if(!e)return;const b=mgBonePile();e.x=b.x+mg2Rng(-1.5,1.5);e.y=b.y+0.4;e.z=b.z+mg2Rng(-1.5,1.5);e.vx=e.vy=e.vz=0;
  a.x=e.x;a.y=e.y;a.z=e.z;a.spawnProt=AG_T+3;if(e.mesh)e.mesh.visible=true;}
function mg2BotShield(a,by,how){if(mg2Eaten(a))return true;if(CUT.on&&CUT.script&&how&&String(how).slice(0,3)==='mg:')return true;return false;}
function mg2BotKeep(a){const e=a.e||a;return !!(e&&(MGF.live||MG2.scene)&&mgSite(e.x,e.y,e.z));}
function mg2BotSpawn(a){if(!(MGF.live||MG2.scene)||DEMON.dead)return null;const ld=a.lastDeath;
  if(!ld||Math.hypot(ld.x-MGC.X,ld.z-MGC.Z)>MGC.R_GRADE)return null;const b=mgBonePile();return [b.x+mg2Rng(-1.5,1.5),b.y+0.2,b.z+mg2Rng(-1.5,1.5)];}
function mg2BotTick(dt){
  for(const q of MG2.eaten.slice()){const a=q.a,e=a.e;if(!e||a.dead||!a.online){MG2.eaten.splice(MG2.eaten.indexOf(q),1);continue;}
    const b=mg2Boss();if(b){e.x=b.x;e.y=Math.max(mgGF()+1,b.y+8);e.z=b.z;}e.vx=e.vy=e.vz=0;if(e.mesh)e.mesh.visible=false;
    q.t-=dt;if(q.t<=0||!MGF.live)mg2BotOut(a);}}
/* brain notes for the minds (agEvent; chat stays throttled to these beats) */
function mg2BotEvent(ev,arg){if(typeof AGENTS==='undefined'||!AG_ACTIVE)return;const near=a=>a.e&&a.dim==='over'&&Math.hypot(a.e.x-MGC.X,a.e.z-MGC.Z)<MGC.R_GRADE;
  const note=(txt,imp,all)=>{for(const a of AGENTS){if(!a.online||a.dead)continue;if(!all&&!near(a))continue;try{agEvent(a,txt,imp);}catch(err){}}};
  if(ev==='wake'&&arg!=='skip')note('Dan woke MALGORATH at X 1000, Z 1000: a colossal demon in a bitten hole in the sea. He eats everything, including you. Stay near Dan.',8,1);
  else if(ev==='round'&&arg===2)note('Malgorath climbed out of his hole onto the plate. He lunges jaw-first: stand behind the bedrock spires.',7);
  else if(ev==='round'&&arg===3)note('Malgorath ATE THE SUN. It is dark. He breathes everything in: crouch behind cover when he inhales.',7);
  else if(ev==='danDeath')note('Malgorath killed Dan and took his things. Dan is back at the Bone Pile at the stair head.',7);
  else if(ev==='kill')note('MALGORATH IS DEAD. Dan killed him. The sun came back out of him.',9,1);}
/* a very small persona layer: one line per beat, rare (bible 17.2-17.4); a line repeats at most once per round */
var MG2BOT_LINES={BunkerBrad:{eaten:["I've been inside him. Don't recommend it."],out:['Bunker\'s gone. Bunker was the point.'],sun:['He ate the sun. I had a plan for most things.'],
    heads:["That's your fourth head on his horn. I'm writing them down."],r2:['Bedrock, Dan. Nothing eats bedrock. It\'s the bottom of everything.']},
  xx_lilcreepah_xx:{eaten:['he ate my bed i had a bed there'],out:['bro is eating the MAP'],hat:["he's wearing dan's hat lmaooo"],heads:["he's got your HEAD on a stick"],kill:['malgorath diff']},
  honeybee_mc:{eaten:["i'm okay!! it's warm in there"],out:["he's not evil he's just HUNGRY"],sun:['he ATE the SUN'],kill:['...he was hungry the whole time.']}};
function mg2BotLine(a,k){if(!a||!a.name||typeof agSay!=='function')return;const L=MG2BOT_LINES[a.name];if(!L||!L[k])return;
  const key=a.name+':'+k+':'+(MGF.round||0);MG2.said=MG2.said||{};if(MG2.said[key])return;if(MGF.att>1&&mg2R()>0.35)return;MG2.said[key]=1;
  try{agSay(a,L[k][0]);}catch(err){}}
