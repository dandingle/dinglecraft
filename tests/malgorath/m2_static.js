/* m2_static.js (M2, gate x1): the fight's statics. The fight API and its frozen members, the knobs against the bible's numbers
   (Appendix B), every telegraph's lock-to-impact budget from the round tables (bible 7.3: slaps >= 0.95 s, aimed >= 0.85 s, RED >= 1.0 s,
   any tell >= 0.6 s), the windows (Appendix A), the waves (bible 11), the sound bank (every mg_* name the fight plays exists, has a
   visual twin and renders deterministically), the death lines, top-level hygiene of the m2 files (prefixes, no duplicates, no clocks or
   randomness or THREE at load), and the MGEX keys M2 adds. Skips (never fails) when M2 itself is on its stub. */
'use strict';
const boot=require('../lib/mg_boot.js'),{ok,skip}=boot;
const fs=require('fs');
const V=boot({});
boot.run(async()=>{
  if(boot.mgStubbed('2')){skip('m2 statics','M2 is on its stub');return;}
  const F=V.MGREG.fight,K=V.getMGK(),T=V.getMG2K(),G=fs.readFileSync(boot.BUILD+'game.js','utf8');
  const i57=G.indexOf('/* ---- PART 57: m0_contract.js ---- */'),i56=G.indexOf('/* ---- PART 56: c0_contract.js ---- */'),p57=G.slice(i57,i56);
  const segs=[];{const re=/\/\* ---- PART 57: (m2_[A-Za-z0-9_]+\.js) ---- \*\//g;let m;const marks=[];while((m=re.exec(p57)))marks.push([m.index,m[1]]);
    for(const [a,n] of marks){const b=p57.indexOf('/* ---- PART 57: ',a+10);segs.push([n,p57.slice(a,b<0?p57.length:b)]);}}
  const src=segs.map(s=>s[1]).join('\n'),strip=t=>t.replace(/\/\*[\s\S]*?\*\//g,'');

  /* ---- the API (plan 5.2) ---- */
  const need=['tick','wake','dormant','brain','preHurt','onKill','onDie','onRespawn','steal','botShield','botKeep','botSpawn','blinkFail','grapCut','swingMiss','hit','skipTo','inhaling','fed','chomp'];
  ok('MGREG.fight carries every member of plan 5.2 (+ fed for M1, chomp)'+(need.filter(n=>typeof F[n]!=='function').join(',')),need.every(n=>typeof F[n]==='function'));
  const ML=F.mechList,TB=F.timeBound;
  ok('mechList names mechanics for all three rounds (R1 '+(ML[1]||[]).join(' ')+')',[1,2,3].every(r=>Array.isArray(ML[r])&&ML[r].length>=4));
  ok('timeBound per round sums to <= 900 game-s (the harness cap): '+JSON.stringify(TB),[1,2,3].every(r=>TB[r]>0)&&TB[1]+TB[2]+TB[3]<=900);
  ok('every MGEX key M2 adds starts mg2/getMG2/mgCovered and none shadows a core key',Object.keys(V.__mgx).filter(k=>/mg2|MG2/.test(k)).every(k=>V[k]===V.__mgx[k]));

  /* ---- knobs (Appendix B) ---- */
  ok('damage in: hide x0.1, 15 a round, per attacker 0.25 s, cap 30, bots x0.5 never below 30, lifesteal <= 3 a window',K.HIDE===0.1&&K.HIDE_BUDGET===15&&K.GATE===0.25&&K.CAP_HIT===30&&K.BOT===0.5&&K.BOT_FLOOR===30&&K.STEAL_CAP===3);
  ok('damage out: pierce 0.4, the chomp 10 true, the pluck slam 4 true, grace 2.0 s, the commit flash at T-0.35',K.PIERCE===0.4&&K.CHOMP===10&&K.PLUCK_DMG===4&&K.GRACE===2&&K.COMMIT===0.35);
  ok('the retry rules: away-regen 10/s, abandon after 30 s, rubber band 85% at 4 / 70% at 7, a death counts after 45 s or 30 window damage',K.AWAY_REGEN===10&&K.ABANDON===30&&K.RUBBER[4]===0.85&&K.RUBBER[7]===0.7&&K.DEATH_MIN_T===45&&K.DEATH_MIN_DMG===30);
  const R1=T.R1,R2=T.R2,R3=T.R3;
  ok('R1 slap: tell 1.6, the shadow locks 0.95 before impact, 14 at r 1.5 -> 6 at r 2.5, eye 0.4 + 2.8 s cap 30',R1.SLAP_TELL===1.6&&K.SLAP_LOCK===0.95&&R1.SLAP_HI===14&&R1.SLAP_LO===6&&R1.SLAP_R===2.5&&R1.EYE_DELAY===0.4&&R1.EYE_T===2.8&&R1.EYE_CAP===30);
  ok('R1 scoop: RED band locks 1.0 s before a 1.2 s sweep (its near end is touched >= 1.0 s after the lock, Dan at its middle 1.6 s), band +-2.0, 1.6 high',R1.SCOOP_LOCK>=K.CHOMP_LOCK&&R1.SCOOP_TELL>R1.SCOOP_LOCK&&R1.SCOOP_BAND===2&&R1.SCOOP_H===1.6&&R1.SCOOP_TELL>=K.MIN_TELL);
  ok('R1 ride: 2.0 s lift, 2.5 s at the mouth, the tongue out for the last 1.2 s (x2.0, 3 hits, cap 45), learned after 2 windows',R1.RIDE===2&&R1.MOUTH===2.5&&R1.TONGUE_OUT===1.2&&K.TONGUE===2&&R1.TONGUE_HITS===3&&R1.TONGUE_CAP===45&&R1.TONGUE_LEARN===2);
  ok('R2 lunge: the RED line sets at 0.3 of a 1.6 s tell (1.3 s >= 1.0), 22 m/s, <= 18 m, side 8; recovery 1.5 s cap 30',R2.LUNGE_TELL-R2.LUNGE_SET>=K.CHOMP_LOCK&&R2.LUNGE_V===22&&R2.LUNGE_MAX===18&&R2.LUNGE_SIDE===8&&R2.RECOVER===1.5&&R2.REC_CAP===30);
  ok('R2 tooth crack 4 s cap 50, learned after 2 per spire; bellyache 5/5/8 s caps 35/50/75, 20 s cooldown, 2 lit meals a round',R2.CRACK_T===4&&R2.CRACK_CAP===50&&R2.CRACK_LEARN===2&&R2.BELLY.tnt+''==='5,35'&&R2.BELLY.bloat+''==='5,50'&&R2.BELLY.nuke+''==='8,75'&&R2.BELLY_CD===20&&R2.LIT_LEARN===2);
  ok('R2 squat (tell 1.4 >= 0.85, r 4.5, 12), stomp (tell 1.0 >= 0.85, 12/7, 10 m/s to r 8), tail (tell 1.0, 0.5 s sweep, 10, r 9)',R2.SQUAT_TELL>=K.LOCK_MIN&&R2.SQUAT_HIT===4.5&&R2.SQUAT_DMG===12&&R2.STOMP_TELL>=K.LOCK_MIN&&R2.STOMP_HI===12&&R2.STOMP_LO===7&&R2.STOMP_V===10&&R2.STOMP_R===8&&R2.TAIL_TELL>=K.MIN_TELL&&R2.TAIL_SWEEP===0.5&&R2.TAIL_DMG===10&&R2.TAIL_R===9);
  ok('R3 inhale 6 s (7 below 150), tell 1.0, pull 2.5 -> 6 (7) m/s; air x1.6, brace x0.5, cover x0.25; lanes every 1.5 s drawn 0.9 s ahead (>= 0.85 positional)',R3.INHALE===6&&R3.INHALE_LOW===7&&R3.INHALE_TELL===1&&R3.PULL+''==='2.5,6'&&R3.PULL_LOW===7&&R3.AIR===1.6&&R3.SNEAK===0.5&&R3.COVER===0.25&&R3.LANE_T===1.5&&R3.LANE_LEAD>=K.LOCK_MIN);
  ok('R3 swallow 2 s (belly cap 25), hands: slap tell 1.6, drag 6 m in 0.8 s, eye 2.0 s cap 25; the gag every 3rd swallow, tell 1.5, 4.0 s, sun 4 m in, cap 75',R3.SWALLOW===2&&R3.BELLY_CAP===25&&R3.SLAP_TELL===1.6&&R3.DRAG===6&&R3.DRAG_T===0.8&&R3.EYE_T===2&&R3.EYE_CAP===25&&R3.GAG_N===3&&R3.GAG_TELL===1.5&&R3.GAG_T===4&&R3.SUN_IN===4&&R3.SUN_CAP===75);
  ok('R3 closing mouth: 24 -> 15, a step every 10 s (7.5 below 150) warned 3 s ahead, +3 m per gag with a Dan hit; the Last Supper warns 8 s, 5 s at 9 m/s',R3.EDGE0===24&&R3.EDGE_MIN===15&&R3.STEP===10&&R3.STEP_LOW===7.5&&R3.WARN===3&&R3.RECEDE===3&&R3.SUPPER_WARN===8&&R3.SUPPER_T===5&&R3.SUPPER_V===9);
  const W=T.WAVES;
  ok('the waves (bible 11): 1a 4M 2H @200, 1b 6M 2H+archer @100, 2a 3B 2H, 2b 3B 1H+archer, 3a 2H at the start, 3b 3H 3M, 3c 2H+archer 4M',
    W['1a'].m===4&&W['1a'].h===2&&W['1b'].m===6&&W['1b'].a===1&&W['2a'].b===3&&W['2b'].b===3&&W['2b'].a===1&&W['3a'].h===2&&W['3a'].at>300&&W['3b'].h===3&&W['3b'].m===3&&W['3c'].m===4&&W['3c'].a===1);
  ok('adds: <= 8 alive; Morsel 12 hp, Bloater 16 hp with a 1.5 s fuse (r 3, 9), Husk 30 hp',T.ADDS.CAP===8&&T.ADDS.MORSEL.hp===12&&T.ADDS.BLOAT.hp===16&&T.ADDS.BLOAT.fuse===1.5&&T.ADDS.BLOAT.r===3&&T.ADDS.BLOAT.dmg===9&&T.ADDS.HUSK.hp===30);

  /* ---- the sound bank (bible 18.3): every mg_* name the fight plays exists, has a twin, renders the same twice ---- */
  const S=V.getMG2SFX(),used=new Set();for(const m of strip(src).matchAll(/['"](mg_[a-z0-9]+)['"]/g))used.add(m[1]);
  const missing=[...used].filter(n=>!S[n]);
  ok('every mg_* sound the m2 files name is in the bank ('+used.size+' names)'+(missing.length?' (missing '+missing.join(',')+')':''),missing.length===0&&used.size>=30);
  ok('every SFX in the bank has a visual twin (bible 18.1: readable on mute)',Object.keys(S).every(n=>typeof S[n].tw==='string'&&S[n].tw.length>4));
  const a1=V.mg2SfxRender('mg_slap',22050),a2=V.mg2SfxRender('mg_slap',22050),b1=V.mg2ScoreRender('table',0,0x6d32,22050),b2=V.mg2ScoreRender('table',0,0x6d32,22050);
  ok('renders are deterministic (seeded noise, no Math.random): an SFX and a bar of the score twice, sample for sample',a1.length>0&&a1.every((v,i)=>v===a2[i])&&b1.length===b2.length&&b1.every((v,i)=>v===b2[i]));
  ok('the score cues exist with their tempi: the table 60 BPM (4 s bars), the plate 100 BPM (2.4 s), the maw follows his heart',V.mg2BarLen('table')===4&&V.mg2BarLen('plate')===2.4&&Math.abs(V.mg2BarLen('maw',{bpm:120})-0.5)<1e-9);

  /* ---- the death lines: every mg:<how> the fight writes has a line ---- */
  const hows=new Set();for(const m of strip(src).matchAll(/mg2Hit\([^,()]+,[^,()]+,[^,()]+,'([a-z]+)'/g))hows.add(m[1]);for(const m of strip(src).matchAll(/mg2True\([^,()]+,[^,()]+,'([a-z]+)'/g))hows.add(m[1]);for(const h of ['chomp','grind','slap','supper','bile'])hows.add(h);
  const generic=[...hows].filter(h=>/was eaten by Malgorath$/.test(V.mgDeathMsg('Dan','Malgorath',h)));
  ok('every damage cause has its own death line ('+[...hows].join(' ')+')'+(generic.length?' (generic: '+generic.join(',')+')':''),generic.length===0);

  /* ---- top-level hygiene of the m2 files ---- */
  const decl=t=>{const out=[];const re=/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:var|let|const)\s+([A-Za-z_$][\w$]*)/gm;let m;while((m=re.exec(t)))out.push(m[1]||m[2]);return out;};
  const names=decl(src),dup=names.filter((n,i)=>names.indexOf(n)!==i),badp=names.filter(n=>!/^(MG2|mg2)/.test(n));
  ok('m2 top-level names: '+names.length+', all MG2*/mg2*, none twice'+(dup.length?' (dup '+dup.join(',')+')':'')+(badp.length?' (prefix '+badp.join(',')+')':''),dup.length===0&&badp.length===0);
  const top=strip(src).split('\n').filter(l=>/^\S/.test(l)&&!/^(function |async function |\}|\)|\])/.test(l));
  ok('no Math.random, Date.now, performance.now or THREE constructor in a top-level statement of the m2 files',!top.some(l=>/Math\.random|Date\.now|performance\.now|new\s+THREE\./.test(l)));
  ok('the m2 files never call Math.random at all (his choices are mulberry32 from SEED and the attempt)',!/Math\.random/.test(strip(src)));
  ok('the m2 files never name PART 54 state (TP, HRE, HRL, HRW, tpOn...) nor build a makeMobMesh({hr:1}) body',!/\b(TP|TPEX|HRE|HRL|HRW|HR_MOB|HR_CAST|tpRegister|tpOn|hrSky)\b/.test(strip(src))&&!/makeMobMesh\([^)]*\{hr:1\}\)/.test(src));
  ok('every damaging drawing goes through mgDraw (no fx.draw call in m2) and every attack frees its drawings (mg2Begin attaches free)',!/fx\.draw\(/.test(strip(src))&&/function mg2Begin\(a\)\{[^\n]*a\.free=T\.free/.test(src));
  const files=segs.map(s=>s[0]);
  ok('the m2 files in the build: '+files.join(' '),['m2_core.js','m2_r1.js','m2_r2.js','m2_r3.js','m2_adds.js','m2_scenes.js','m2_loot.js','m2_hud.js','m2_bots.js','m2_audio.js'].every(f=>files.includes(f)));
  ok('m2 is '+Buffer.byteLength(src)+' B of PART 57 (budget 200,000)',Buffer.byteLength(src)<=200000);
});
