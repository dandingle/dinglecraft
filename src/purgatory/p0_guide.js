/* ---- PART 55: p0_guide.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p0_guide.js (P0): THE PROGRAMME (bible 12.1-12.2) and the results card (bible 11.4).
   PURG_PAGES is bible 12.2, recast with the Release 1.0 names (tests/fixtures/pages_fixture.json holds the same pages; p_static
   compares them field by field). Page unlocks and ticks are derived here by polling contract state (audit A17): nobody else writes MP.page
   or MP.ticks; event ticks arrive through mpTickOff(id) from the owners named in plan 3.6.
   --------------------------------------------------------------------------------------------------------------------- */
/* bible 12.2 with the Release 1.0 cast (== tests/fixtures/pages_fixture.json) */
const PURG_PAGES=Object.freeze([{"id":"1","title":"THE SHOW MUST GO ON: PURGATORY EDITION","unlock":"unlocked: start","printed":"Welcome, valued guest! Make yourself at home. There is no need to ever leave.","margin":"Your things are in a trunk by the door you came in. The only way out is to finish the show. Three headliners. When the last one goes limp, run for the EXIT. It's through the audience. It's locked until then. \u2014D.","ticks":[{"id":"read","label":"Read the Programme","tag":"main"}]},
{"id":"2","title":"FINDING YOUR WAY","unlock":"start","printed":"Our stage is raked for perfect sightlines! Guests are welcome to explore the stalls.","margin":"Stay out of the seats. Uphill is later. If you can see the painting, you're facing deeper in. If you can see cardboard, you're facing the way out. The lights above the curtain are where you're going. The curtains open when the star before them dies.","ticks":[{"id":"apron","label":"See the apron","tag":"main"},{"id":"beacon","label":"See the lights over the curtain","tag":"main"}]},
{"id":"3","title":"OUR SCENERY","unlock":"start","printed":"Every tree in our forest is a working performer! Stand in front of our scenery for the best photographs.","margin":"The sleeves are Felt. Punch them. The arm at the bottom: cut that and the whole head comes down. Don't think about whose arm. The mountains are cardboard. Never stand in front of one when you knock out its last brace.","ticks":[{"id":"sleeve","label":"Felt Sleeve","tag":"main"},{"id":"forearm","label":"Puppeteer Forearm","tag":"main"},{"id":"rod","label":"Puppet Rod","tag":"main"}]},
{"id":"4","title":"THE PROPS DEPARTMENT","unlock":"first Felt","printed":"Our props master loves to be thanked in person. Lean in close when he opens his lid!","margin":"The can by the Mark makes things. He throws the big things at you when you shut the lid. Duck. Everything he can make is in the book. ??? means you've never held what it needs. Read the line under it. Make another can. He'll move in. Take him with you.","ticks":[{"id":"floppy","label":"Floppy Pick","tag":"main"},{"id":"slapper","label":"Sock Slapper","tag":"main"},{"id":"duck","label":"Duck a volley","tag":"side"}]},
{"id":"5","title":"BELOW STAGE","unlock":"first Floppy Pick","printed":"Guests are welcome to dig for souvenirs anywhere below stage. Go as deep as you like!","margin":"Under the deck is foam. Googly eyes near the top. Coat hangers lower, thick in the kitchen drains. Sequins in the orange rot. At the very bottom, fingers. Don't dig the floor. The floor is someone.","ticks":[{"id":"foam","label":"Foam Chunk","tag":"main"},{"id":"larp","label":"LARP Pick","tag":"main"},{"id":"googly","label":"Googly Eyes","tag":"side"}]},
{"id":"6","title":"THE FLOOR IS HOLLOW","unlock":"first Blank seen","printed":"Our puppets love a cuddle! Walk right up.","margin":"If it's on an arm, it has a hole. It can't reach past the elbow. Stand there. Break the hole and it's nothing. Remember this later.","ticks":[{"id":"armhole","label":"Break an Arm Hole","tag":"main"}]},
{"id":"7","title":"LIGHTING","unlock":"first BLACKOUT warning","printed":"Please stand in the spotlight for the best view!","margin":"Three clicks means the lights are going. In the dark the spot finds whoever's out in the open, and everything comes to them. Get under something or stand by a lamp, or go below and dig. It's always dark down there anyway. The hands come up out of the trenches. They climb into the empty ones.","ticks":[{"id":"lamp","label":"Eyeball Lamp","tag":"main"},{"id":"blackout","label":"Survive a blackout","tag":"side"},{"id":"trunk","label":"Prop Trunk (sneak + right-click to sleep in it)","tag":"side"}]},
{"id":"8","title":"THE KITCHEN","unlock":"enter Plane 2","printed":"Visit our Cook! He loves a helper behind the counter.","margin":"No throats in here. Raw food comes out the back of your head. Drop it on a burner, or give it to the cook and stand back from the counter. Never go behind it. The pelican's fish comes back. Hit it with a bat. The drains have a ledge. Climb down.","ticks":[{"id":"smelt","label":"Smelt something","tag":"main"},{"id":"wire","label":"Armature Wire","tag":"main"},{"id":"bat","label":"Foam Bat","tag":"main"},{"id":"batfish","label":"Bat a fish","tag":"side"}]},
{"id":"9","title":"ACT I: THE DEMOLITIONIST","unlock":"first Wire Snips, or the apron trigger seen","printed":"Guests are welcome to press the big red button!","margin":"Don't push his plunger until you can cut a wire. Every bang comes down a wire. Follow it. Cut it. He goes round the same way every time. He never checks his own seat. Close the gap. Give him back anything he sticks on you. When he sits on the big one: the trapdoor. The lever by the WHITE plunger.","ticks":[{"id":"snips","label":"Wire Snips","tag":"main"},{"id":"cord","label":"Det Cord","tag":"main"},{"id":"bomber","label":"The Demolitionist","tag":"main"}],"shaky":"The plungers work for us too."},
{"id":"10","title":"THE PROP LAB","unlock":"Demolitionist dead","printed":"Our scientists are always looking for volunteers!","margin":"The copper in the coils makes a bench. The Lab Rat pays for everything. If he runs, carry him back. The big hairy one in the pink dunes is slow and never stops. His shoes are real. Aim low. The Drummer's under the floor. Follow the dust that jumps. Stand where the chain ends.","ticks":[{"id":"bench","label":"Lab Bench","tag":"main"},{"id":"sequin","label":"Sequin","tag":"main"},{"id":"shag","label":"Shag Fur","tag":"main"},{"id":"stiletto","label":"The Stiletto","tag":"side"}]},
{"id":"11","title":"ACT II: THE PIG","unlock":"enter Plane 3","printed":"The Pig adores her fans! Walk up the stairs and say hello. Guests in sequins get special attention.","margin":"Climb fast. Change lanes on the landings. Catch, don't dodge. Throw them back. When she pushes her gloves up, she's going to throw YOU. Keep a mitt up for the others. Up top she can't walk past a mirror: three looks and she's onto you, bring spares. Steal her light and she comes for you. When she poses, the big lamp hangs on one rope.","ticks":[{"id":"mitt","label":"Pig Mitt","tag":"main"},{"id":"mirror","label":"Vanity Mirror","tag":"main"},{"id":"bigpig","label":"The Pig","tag":"main"}]},
{"id":"12","title":"ACT III: THE MANAGEMENT","unlock":"Pig dead","printed":"The management loves visitors. Walk right up!","margin":"Don't. Keep moving on the sheet. Hold your weapon or the frogs take your pockets. Always carry something that cuts. Two staples pin the tongue. Flies make him look away. If he swallows you, punch the hand.","ticks":[{"id":"staple","label":"Staple Gun","tag":"main"},{"id":"bigfrog","label":"The Frog","tag":"main"},{"id":"fly","label":"Felt Fly","tag":"side"}],"shaky":"This is where I stopped writing."},
{"id":"12b","title":"","unlock":"glued shut; peels open when the Frog enters P3","printed":"(a full-page photograph of the swamp, ruined by the glue)","margin":"UNDER THE FLOOR.","ticks":[{"id":"elbow","label":"Hit the elbow","tag":"main"}],"marginNote":"scrawled across the photo in big shaking letters"},
{"id":"13","title":"CURTAIN CALL","unlock":"Frog dead","printed":"Please remain seated until the curtain has fully come down.","margin":"RUN. Downhill. Don't stop. Watch for the shadow. Don't get swept up.","ticks":[{"id":"escape","label":"Escape","tag":"main"}]}]);

/* PURG_LADDER: one table, four consumers (the Programme's What next?, P5's autopilot and purgItches, the speed-run pilot).
   Rows in bible section 13 / plan 9.1 order. id: the Programme tick id when page is set ('1'..'12','12b','13'), else an extra
   route step (page '', never a tick). done(st): st = mpLadderState() = {inv, seen, ticks, dead}. item: the id that proves the
   step; craft: [outId, kind] (inv = hands, pcan = Bin, plab = Lab Bench, ptrans = Transmogrifier); gather: [alias, n]
   (P5's AGP_GATHER aliases); where: a plain hint for the pilot and the bots. */
const PURG_LADDER=Object.freeze((()=>{const R=[];
  const T=(id,page,tag,o)=>{o=o||{};R.push(Object.freeze(Object.assign({id,page,tag},o,{done:o.done||(st=>!!st.ticks[id])})));};
  const has=id=>st=>!!((st.seen&&st.seen[id])||(st.inv&&st.inv.some(s=>s&&s.id===id)));
  const tk=(id,item)=>st=>!!(st.ticks[id]||has(item)(st));
  T('read','1','main',{where:'right-click the Programme'});
  T('apron','2','main',{where:'walk downhill to the apron in front of the House'});
  T('beacon','2','main',{where:'look at the lights over the far curtain'});
  T('sleeve','3','main',{item:B.PG_SLEEVE,gather:['felt',4],done:tk('sleeve',B.PG_SLEEVE),where:'punch Felt Sleeves on the trees'});
  T('forearm','3','main',{item:IT.PG_GREASE,gather:['forearm',1],done:tk('forearm',IT.PG_GREASE),where:'cut the Puppeteer Forearm at the bottom of a tree'});
  T('felt','','main',{item:IT.PG_FELT,craft:[IT.PG_FELT,'inv'],done:has(IT.PG_FELT)});
  T('rod','3','main',{item:IT.PG_ROD,craft:[IT.PG_ROD,'inv'],done:tk('rod',IT.PG_ROD)});
  T('floppy','4','main',{item:IT.PG_FLOPPY,craft:[IT.PG_FLOPPY,'pcan'],done:tk('floppy',IT.PG_FLOPPY),where:'the Bin by the Mark'});
  T('shears','','main',{item:IT.PG_PSHEARS,craft:[IT.PG_PSHEARS,'pcan'],done:has(IT.PG_PSHEARS)});
  T('slapper','4','main',{item:IT.PG_SLAPPER,craft:[IT.PG_SLAPPER,'pcan'],done:tk('slapper',IT.PG_SLAPPER)});
  T('duck','4','side',{where:'sneak while you close the can'});
  T('foam','5','main',{item:IT.PG_FOAMCHUNK,gather:['stone',6],done:tk('foam',IT.PG_FOAMCHUNK),where:'dig under the deck (the trenches)'});
  T('larp','5','main',{item:IT.PG_LARPPICK,craft:[IT.PG_LARPPICK,'pcan'],done:tk('larp',IT.PG_LARPPICK)});
  T('googly','5','side',{item:IT.PG_GOOGLIES,gather:['googly',2],done:tk('googly',IT.PG_GOOGLIES)});
  T('armhole','6','main',{where:'break the hole a Blank comes out of'});
  T('lamp','7','main',{item:B.PG_LAMP,craft:[B.PG_LAMP,'inv'],gather:['eyes',1],done:tk('lamp',B.PG_LAMP)});
  T('blackout','7','side',{where:'stay alive until the lights come back'});
  T('trunk','7','side',{item:B.PG_PTRUNK,craft:[B.PG_PTRUNK,'pcan'],where:'sneak + right-click a Prop Trunk'});
  T('bat','8','main',{item:IT.PG_BAT,craft:[IT.PG_BAT,'pcan'],done:tk('bat',IT.PG_BAT)});
  T('hotplate','','main',{item:B.PG_HOTPLATE,craft:[B.PG_HOTPLATE,'pcan'],done:has(B.PG_HOTPLATE),where:'Laminate from the Kitchen counters, a Burner Coil, Elbow Grease'});
  T('smelt','8','main',{where:'drop Raw Coat Hangers on a Burner, or load a Hot Plate'});
  T('wire','8','main',{item:IT.PG_WIRE,gather:['wire',3],done:tk('wire',IT.PG_WIRE),where:'Wire Ore in the sink drains; smelt the hangers'});
  T('batfish','8','side',{where:'hit a Homing Herring back with the Foam Bat'});
  T('snips','9','main',{item:IT.PG_SNIPS,craft:[IT.PG_SNIPS,'pcan'],done:tk('snips',IT.PG_SNIPS)});
  T('rapier','','main',{item:IT.PG_RAPIER,craft:[IT.PG_RAPIER,'pcan'],done:has(IT.PG_RAPIER)});
  T('cord','9','main',{item:B.PG_CORD,craft:[B.PG_CORD,'inv'],done:tk('cord',B.PG_CORD)});
  T('fpad','','side',{item:IT.PG_FPAD_C,craft:[IT.PG_FPAD_C,'pcan'],done:has(IT.PG_FPAD_C)});
  T('pie','','side',{item:IT.PG_PIE,craft:[IT.PG_PIE,'inv'],done:has(IT.PG_PIE)});
  T('bomber','9','main',{done:st=>!!st.dead.bomber,where:'the apron: push DO NOT PUSH'});
  T('bench','10','main',{item:B.PG_BENCH,craft:[B.PG_BENCH,'pcan'],gather:['copper',3],done:tk('bench',B.PG_BENCH)});
  T('sequin','10','main',{item:IT.PG_SEQUIN,gather:['sequins',3],done:tk('sequin',IT.PG_SEQUIN),where:'Sequin Ore in the orange rot'});
  T('shag','10','main',{item:IT.PG_SHAGFUR,done:tk('shag',IT.PG_SHAGFUR),where:'trip the Yeti by the shoes'});
  T('stiletto','10','side',{item:IT.PG_STILETTO,craft:[IT.PG_STILETTO,'plab'],done:tk('stiletto',IT.PG_STILETTO)});
  T('mitt','11','main',{item:IT.PG_MITT,craft:[IT.PG_MITT,'plab'],done:tk('mitt',IT.PG_MITT)});
  T('mirror','11','main',{item:IT.PG_VMIRROR,craft:[IT.PG_VMIRROR,'plab'],gather:['mirror',4],done:tk('mirror',IT.PG_VMIRROR)});
  T('bigpig','11','main',{done:st=>!!st.dead.bigpig,where:'the Grand Staircase: pull the rope'});
  T('staple','12','main',{item:IT.PG_STAPLER,craft:[IT.PG_STAPLER,'plab'],gather:['pins',6],done:tk('staple',IT.PG_STAPLER)});
  T('staples','','main',{item:IT.PG_STAPLES,craft:[IT.PG_STAPLES,'inv'],done:has(IT.PG_STAPLES)});
  T('fly','12','side',{item:IT.PG_FLY,craft:[IT.PG_FLY,'inv'],done:tk('fly',IT.PG_FLY)});
  T('bigfrog','12','main',{done:st=>!!st.dead.bigfrog,where:'the swamp clearing: step onto the outer ring'});
  T('elbow','12b','main',{where:'under the floor'});
  T('escape','13','main',{where:'the EXIT, through the audience'});
  return R;})());
function mpLadderState(a){return {inv:a?a.inv:(P?P.inv:[]),seen:a?{}:MP.seenIng,ticks:MP.ticks,dead:MP.dead};}
function mpPageIndex(id){for(let i=0;i<PURG_PAGES.length;i++)if(PURG_PAGES[i].id===id)return i;return -1;}
function mpPageOpen(i){return !!(MP.page&(1<<i));}
/* event ticks (owners in plan 3.6): duck/trunk/smelt P2, blackout P1, elbow P4, batfish/armhole/escape/read P0 */
function mpTickOff(id){if(!id||MP.ticks[id])return false;MP.ticks[id]=1;if(pguOn)pguRender();return true;}

/* ---- the poll (P0's tick, every 0.25 s inside purgatory; the beacon dwell counts every frame) ---- */
var mpGu={acc:0,beaconT:0,pg:0,hi:null,lastTitle:''};
const MP_SEEN_TICKS={sleeve:B.PG_SLEEVE,forearm:IT.PG_GREASE,rod:IT.PG_ROD,floppy:IT.PG_FLOPPY,slapper:IT.PG_SLAPPER,foam:IT.PG_FOAMCHUNK,
  larp:IT.PG_LARPPICK,googly:IT.PG_GOOGLIES,lamp:B.PG_LAMP,wire:IT.PG_WIRE,bat:IT.PG_BAT,snips:IT.PG_SNIPS,cord:B.PG_CORD,bench:B.PG_BENCH,
  sequin:IT.PG_SEQUIN,shag:IT.PG_SHAGFUR,stiletto:IT.PG_STILETTO,mitt:IT.PG_MITT,mirror:IT.PG_VMIRROR,staple:IT.PG_STAPLER,fly:IT.PG_FLY};
function mpLooksAt(x,y,z,deg){const E=eyePos(),L=lookDir(),dx=x-E[0],dy=y-E[1],dz=z-E[2],dl=Math.hypot(dx,dy,dz)||1;
  return (dx*L[0]+dy*L[1]+dz*L[2])/dl>=Math.cos(deg*Math.PI/180);}
function mpPageRules(){const S=MP.seenIng,D=MP.dead,A=MPC.APRON;let m=7;   /* pages 1-3 from entry */
  if(S[IT.PG_FELT])m|=1<<3;
  if(S[IT.PG_FLOPPY])m|=1<<4;
  for(const e of entities)if(e.t==='mob'&&!e.dead&&e.mt==='pgwhat'&&Math.hypot(e.x-P.x,e.z-P.z)<20&&mpLooksAt(e.x,e.y+1,e.z,40)){m|=1<<5;break;}
  const cue=typeof mwCue==='function'?mwCue():null;if(cue&&(cue.ph==='warn'||cue.ph==='blackout'))m|=1<<6;
  if((typeof mwBiomeAt==='function'&&mwBiomeAt(P.x,P.z)==='kitchen')||P.z>=-58)m|=1<<7;
  if(S[IT.PG_SNIPS]||(P.x>=A.x0&&P.x<=A.x1+1&&P.z>=A.z0&&P.z<=A.z1+1))m|=1<<8;
  if(D.bomber)m|=1<<9;
  if(P.z>=42)m|=1<<10;
  if(D.bigpig)m|=1<<11;
  const hs=typeof hnState==='function'?hnState():null;if(hs&&hs.name==='bigfrog'&&hs.phase===3)m|=1<<12;
  if(D.bigfrog)m|=1<<13;
  return m;}
function mpGuideTick(dt){if(DIM!=='puppet'||!P||P.dead)return;const G=mpGu;
  if(!MP.ticks.beacon){if(mpLooksAt(0.5,74,131.5,8))G.beaconT+=dt;else G.beaconT=0;if(G.beaconT>=1)mpTickOff('beacon');}
  G.acc+=dt;if(G.acc<0.25)return;G.acc=0;
  const before=MP.page,now=before|mpPageRules();
  if(now!==before){MP.page=now;if(before&&(now&~before&~7))showToast('The Programme: a page came unglued.');}
  const A=MPC.APRON,ax=clamp(P.x,A.x0,A.x1+1),az=clamp(P.z,A.z0,A.z1+1);
  {const da=Math.hypot(P.x-ax,P.z-az);if(!MP.ticks.apron&&da<=30&&(da<2||mpLooksAt(ax,P.y+P.eyeY,az,60)))mpTickOff('apron');}   /* within 30 m and in view */
  for(const k in MP_SEEN_TICKS)if(!MP.ticks[k]&&MP.seenIng[MP_SEEN_TICKS[k]])mpTickOff(k);
  for(const k of ['bomber','bigpig','bigfrog'])if(!MP.ticks[k]&&MP.dead[k])mpTickOff(k);
  if(pguOn&&now!==before)pguRender();}

/* ---- What next?: the first unlocked page with an unticked MAIN tick (side ticks never steer it) ---- */
function mpWhatNext(){for(let i=0;i<PURG_PAGES.length;i++){if(!mpPageOpen(i))continue;
    for(const t of PURG_PAGES[i].ticks)if(t.tag==='main'&&!MP.ticks[t.id])return {page:i,tick:t.id};}
  return null;}

/* ---- the panel (#pguide; the dialogue-panel pattern) ---- */
function mpEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function pguOpen(page){if(!P)return;
  if(MODAL.kind)closeModal(true);
  pguOn=true;mpTickOff('read');
  if(document.exitPointerLock)document.exitPointerLock();MB.l=MB.r=false;
  let i=typeof page==='number'?page:(typeof page==='string'?mpPageIndex(page):mpGu.pg);if(!(i>=0&&i<PURG_PAGES.length))i=0;
  mpGu.pg=i;mpGu.hi=null;const el=$('pguide');if(el)el.style.display='flex';const w=$('pguwin');if(w){w.style.width='min(700px,94vw)';w.style.maxWidth='94vw';}pguRender();
  if(typeof playS==='function')playS('click');}
function pguClose(silent){if(!pguOn)return;pguOn=false;const el=$('pguide');if(el)el.style.display='none';if(!silent)tryLock();}
function pguGo(d){mpGu.pg=clamp(mpGu.pg+d,0,PURG_PAGES.length-1);mpGu.hi=null;pguRender();}
function pguNext(){const w=mpWhatNext();if(w){mpGu.pg=w.page;mpGu.hi=w.tick;}else{mpGu.pg=PURG_PAGES.length-1;mpGu.hi=null;}pguRender();return w;}
function pguRender(){const i=mpGu.pg,pg=PURG_PAGES[i],open=mpPageOpen(i);
  const t=$('pgutitle'),b=$('pgubody'),c=$('pgucheck'),n=$('pgupage');
  const label=pg.id==='12b'?'Page 12b':'Page '+pg.id;
  if(n)n.textContent=' '+label+'  ('+(i+1)+' of '+PURG_PAGES.length+') ';
  if(!open){if(t)t.textContent=label;
    if(b)b.innerHTML='<div style="background:#d8c9a0;color:#5a4a2a;padding:28px 18px;font-family:Georgia,serif;text-align:center;'+
      'border:1px solid #8a7a50;box-shadow:inset -18px -18px 0 #efe3c0">This page is glued shut.<br><i>One corner is starting to peel.</i></div>';
    if(c)c.innerHTML='';mpGu.lastTitle=label;return;}
  if(t)t.textContent=pg.title?label+' · '+pg.title:label;
  const shake=Math.min(1,i/12),rot=(-0.6-1.6*shake).toFixed(2),ink=pg.id==='12b'?'#c0101a':'#b0141a';
  let h='<div style="background:#f3e6c4;color:#2a1d10;padding:12px 14px;font-family:Georgia,\'Times New Roman\',serif;font-size:15px;'+
    'line-height:1.45;border:1px solid #b9a77a;box-shadow:inset 0 0 22px rgba(120,90,30,.25)">'+
    '<div style="font-style:italic;margin-bottom:10px">'+mpEsc(pg.printed)+'</div>'+
    '<div style="color:'+ink+';font-family:\'Bradley Hand\',\'Segoe Print\',\'Comic Sans MS\',cursive;font-size:'+(pg.id==='12b'?'30px':'15px')+';'+
    'transform:rotate('+rot+'deg);letter-spacing:'+(0.2+shake*0.6).toFixed(2)+'px">'+(pg.marginNote?'<span style="font-size:11px;color:#7a5a3a">('+mpEsc(pg.marginNote)+')</span><br>':'')+
    mpEsc(pg.margin)+'</div>';
  if(pg.shaky)h+='<div style="color:'+ink+';font-family:\'Bradley Hand\',\'Segoe Print\',cursive;margin-top:8px;transform:rotate('+(+rot-1.2).toFixed(2)+'deg) skewX(-4deg)">'+mpEsc(pg.shaky)+'</div>';
  h+='</div>';if(b)b.innerHTML=h;
  let k='';for(const tk of pg.ticks){const done=!!MP.ticks[tk.id],hi=mpGu.hi===tk.id;
    k+='<span style="display:inline-block;margin:4px 10px 0 0;padding:1px 4px;'+(hi?'background:#ffe27a;color:#000;':'')+(tk.tag==='side'?'opacity:.75;':'')+'">'+
      (done?'☑':'☐')+' '+mpEsc(tk.label)+(tk.tag==='side'?' <small>(side)</small>':'')+'</span>';}
  if(c)c.innerHTML=k;mpGu.lastTitle=t?t.textContent:'';}
{ const on=(id,f)=>{const el=$(id);if(el)el.onclick=f;};
  on('pguprev',()=>pguGo(-1));on('pgunext',()=>pguGo(1));on('pgunextmain',()=>pguNext());on('pguclose',()=>pguClose());}

/* ---- the results card (#pres, bible 11.4) ---- */
function mpReview(n){n=Math.max(0,n|0);
  if(n===0)return ['No deaths.','I hated it.'];
  const w=n===1?'once':n===2?'twice':mpWords(n)+' times';
  if(n<=3)return ['He died '+w+'.','Do it again. Baa-ha-ha.'];
  if(n<=9)return ['He died '+w+'.','We counted. Baa-ha-ha.'];
  return [mpCap(mpWords(n))+' deaths.','Same time next week. Baa-ha-ha.'];}
function mpClock(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
var presLast=null;
function presOpen(st){st=st||mpResultsStats();presLast=st;presOn=true;MPF.results=true;
  if(document.exitPointerLock)document.exitPointerLock();MB.l=MB.r=false;
  const t=$('prestitle'),b=$('presbody'),r=$('presreview');
  if(t)t.innerHTML='<div style="font-size:26px;font-weight:bold;letter-spacing:2px;color:#ffe9a8">YOU ESCAPED PUPPET PURGATORY</div>';
  const rows=[['Time inside',mpClock(st.time)],['Deaths',st.deaths],['Times swallowed',st.swallowed],['Times thrown',st.thrown],['Pigs caught',st.pigs],
    ['Wires spliced into the Demolitionist’s seat',st.splices],['Tomatoes eaten',st.tomatoes],['Knuckles taken',st.knuckles]];
  for(const bt of st.bots||[])rows.push([bt.name+' deaths',bt.deaths]);
  if(b)b.innerHTML='<div style="display:grid;grid-template-columns:1fr auto;gap:4px 18px;margin:10px 2px;font-size:15px">'+
    rows.map(x=>'<div>'+mpEsc(x[0])+'</div><div style="text-align:right;font-weight:bold">'+mpEsc(String(x[1]))+'</div>').join('')+'</div>';
  {const w=$('preswin');if(w)w.style.width='min(460px,92vw)';}
  const rv=mpReview(st.deaths);
  if(r)r.innerHTML='<div style="margin:10px 0;font-family:Georgia,serif"><b>OLD GOAT:</b> '+mpEsc(rv[0])+'<br><b>OLDER GOAT:</b> '+mpEsc(rv[1])+'</div>';
  const el=$('pres');if(el)el.style.display='flex';
  if(typeof playS==='function')playS('jackpot');return rv;}
function presClose(silent){if(!presOn)return;presOn=false;MPF.results=false;const el=$('pres');if(el)el.style.display='none';if(!silent)tryLock();}
{ const ok=$('presok');if(ok)ok.onclick=()=>presClose();}
function mpUiReset(){pguOn=false;presOn=false;for(const id of ['pguide','pres','pfelt','psplat']){const el=$(id);if(el)el.style.display='none';}
  mpGu.pg=0;mpGu.hi=null;mpGu.beaconT=0;}
Object.assign(PGEX,{PURG_LADDER,PURG_PAGES,pguOpen,pguClose,pguRender,pguNext,pguGo,presOpen,presClose,mpReview,mpGuideTick,mpTickOff,
  mpWhatNext,mpPageIndex,mpLadderState,mpPageRules,getGu:()=>mpGu});
