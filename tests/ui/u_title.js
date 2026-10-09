/* u_title.js (Release 1.0, game 6.7, lane UI, gate x1): the 6.7 title and settings features, headless (the creativity boot, a
   recording fake AudioContext: nothing is ever heard). Covers what the 6.7 audits found untested:
   1 the saved settings are a promise the title waits for (SETTINGS_P): the first-launch name prompt and the boot music start only
     after loadSettings, and loadSettings closes a name prompt for a returning player and stops the menu music for Sound: Off
   2 the player's name: pnValid (2+ letters, not an AI player or a common short word), pnSet, the pn round trip, pnText in any case
     (the creep's lowercase "dan" too) but never the credit "Dan Dingle", pnBack
   3 the menu music: Sound: Off or Music volume 0 never creates an AudioContext; one looping source on the music bus with a fade in;
     a second start keeps one voice; the buses follow the sliders; tmusStop fades and stops
   4 the World Music switch label, the Help rows for 6.7, the toast never pushing a full-window menu
   5 the per-world rules editor (tgrOpen / tgrSave), the pickup redraw, Malgorath's bar hidden on a new world and on Save & Quit */
'use strict';
const boot=require('../lib/c_boot.js'),{ok,skip}=boot;
const FA=require('../lib/c2_fakeac.js');
const fs=require('fs');
const P_=require('../lib/paths.js');
const V=boot({});
const HOLD=FA.install(44100);                       /* after the stubs load, before the game's first audio() */
const step=boot.stepper(600000);
const doc=global.document,el=id=>doc.getElementById(id);
const HH=fs.readFileSync(boot.BUILD+'head.html','utf8');
const read=async()=>{try{return JSON.parse((await global.storage.get('vox_settings')).value);}catch(e){return null;}};
const write=async(o)=>global.storage.set('vox_settings',JSON.stringify(o));
const flush=()=>new Promise(r=>setImmediate(r));

boot.run(async()=>{
  ok('the 6.7 seams are on __vox',['tmusStart','tmusStop','getTMUS','setVols','getVols','getAC','pnBack','pnText','pnSet','pnValid','pnClean','getPName','setPName',
    'getPNSet','setPNSet','getSettingsP','tgrOpen','tgrSave','getTGR','syncSetUI','mg2HudHide','loadSettings','saveSettings','tmShow','getTM','quitToTitle','spawnDrop']
    .every(k=>typeof V[k]==='function'));

  /* ===== 1. the title waits for the saved settings ===== */
  const SP=V.getSettingsP();
  ok('loadSettings is kept as a promise (SETTINGS_P) for the title to wait on',!!SP&&typeof SP.then==='function');
  await SP;
  {const T=P_.readSrc('ui/p07g_title.js'),a=T.indexOf('function tmBoot('),b=T.indexOf('function',a+20)>0?T.indexOf('\n}\n',a):-1,tb=a>=0&&b>a?T.slice(a,b):'';
    ok('tmBoot: the name prompt and the boot music run only after SETTINGS_P (ready), and so does the first-gesture kick',!!tb&&/SETTINGS_P\.then\(ready,ready\)/.test(tb)&&
      /const ready=\(\)=>\{TM\.ready=true;/.test(tb)&&/if\(!PNAME_SET&&TM\.view==='main'\)tmShow\('name'\)/.test(tb)&&/const kick=\(\)=>\{if\(TM\.ready&&tmTitleUp\(\)\)tmusStart\(\);\}/.test(tb)&&
      !/\n  if\(!PNAME_SET\)tmShow\('name'\);/.test(tb)&&!/\n  if\(up\)tmusStart\(\);/.test(tb));}
  {const S=P_.readSrc('ui/p27_debug_gamerules_settings.js');
    ok('loadSettings stops the menu music for Sound: Off and closes the name prompt once a name is restored',
      /if\(!soundOn&&typeof tmusStop==='function'\)tmusStop\(\);/.test(S)&&/if\(PNAME_SET&&typeof TM!=='undefined'&&TM\.view==='name'\)tmShow\('main'\);/.test(S)&&/const SETTINGS_P=loadSettings\(\);/.test(S));}

  /* ===== 2. the player's name ===== */
  V.setPName('Dan');V.setPNSet(false);
  ok('pnValid refuses one letter, the AI players and their nicknames, common short words; takes ordinary names',
    !V.pnValid('a')&&!V.pnValid('I')&&!V.pnValid('')&&!V.pnValid('bee')&&!V.pnValid('BunkerBrad')&&!V.pnValid('xx_lilcreepah_xx')&&!V.pnValid('Creep')&&
    !V.pnValid('the')&&!V.pnValid('you')&&V.pnValid('Bob')&&V.pnValid('Al')&&V.pnValid('Dan')&&V.pnValid('Big Steve'));
  ok('pnSet("a") is refused and the name stays',V.pnSet('a')===false&&V.getPName()==='Dan'&&V.getPNSet()===false);
  ok('pnSet("  <Bob>  ") cleans to Bob and sets PNAME_SET',V.pnSet('  <Bob>  ')===true&&V.getPName()==='Bob'&&V.getPNSet()===true);
  await flush();
  {const s=await read();ok('vox_settings.pn is saved (Bob)',!!s&&s.pn==='Bob');}
  ok('pnText maps Dan in any case (Dan, dan, DAN) and leaves look-alikes alone',V.pnText('hello Dan')==='hello Bob'&&V.pnText('hello dan nice name')==='hello bob nice name'&&
    V.pnText('DAN!')==='BOB!'&&V.pnText('Danger at the Dangle')==='Danger at the Dangle');
  ok('pnText never touches the credit on Dan’s found works ("Dan Dingle")',V.pnText('“my art” by Dan Dingle (64×128)')==='“my art” by Dan Dingle (64×128)'&&
    V.pnText('“mine” by Dan (64×64)')==='“mine” by Bob (64×64)');
  {const r0=Math.random;Math.random=()=>0.99;   /* no typo */
    const t=V.pnText(V.agStyle({name:'xx_lilcreepah_xx'},V.pnBack('hello Bob, nice name')));Math.random=r0;
    ok('the creep’s lowercase styling shows the chosen name, not "dan" (got "'+t+'")',t==='hello bob nice name');}
  ok('pnBack maps the chosen name back to the internal Dan, whole words, any case',JSON.stringify(V.pnBack({out:['hi Bob','bob, come here','Bobby stays']}))===JSON.stringify({out:['hi Dan','Dan, come here','Bobby stays']}));
  {const s=await read();await write(Object.assign({},s,{pn:'a'}));V.setPName('Dan');V.setPNSet(false);await V.loadSettings();
    ok('a saved name the mapping would confuse ("a") is not restored: the prompt asks again',V.getPName()==='Dan'&&V.getPNSet()===false);
    await write(Object.assign({},s,{pn:'Bob'}));V.tmShow('name');const was=V.getTM().view;await V.loadSettings();
    ok('loadSettings restores pn and closes an open name prompt (a returning player is never asked again)',was==='name'&&V.getPName()==='Bob'&&V.getPNSet()===true&&V.getTM().view==='main');}

  /* ===== 3. the menu music ===== */
  if(V.getAC())skip('Sound: Off creates no AudioContext','an AudioContext already exists in this process');
  else{
    V.setSound(false);V.setVols(1,0.7);V.tmusStart();
    ok('Sound: Off: the menu music never creates an AudioContext',V.getAC()===null&&!V.getTMUS().src);
    V.setSound(true);V.setVols(1,0);V.tmusStart();
    ok('Music volume 0: no AudioContext either',V.getAC()===null&&!V.getTMUS().src);
  }
  V.setSound(true);V.setVols(1,0.7);V.tmusStart();
  const ac=HOLD.ac,M=V.getTMUS();
  ok('Sound on: one looping source (the disc BATEHOVEN IS HALOUS, rendered once) through a gain onto the music bus',!!ac&&V.getAC()===ac&&!!M.src&&M.src.loop===true&&
    !!M.src.buffer&&M.src.buffer.length>ac.sampleRate&&M.src.out[0]===M.g&&!!ac.__mus&&M.g.out[0]===ac.__mus);
  ok('it fades in (0.0001 -> 0.275 over 1.2 s: half the old 0.55) and starts just after now',!!M.g&&JSON.stringify(M.g.gain.ev.slice(0,2))===JSON.stringify([['set',0.0001,0],['lin',0.275,1.2]])&&
    !!M.src.started&&Math.abs(M.src.started[0]-0.05)<1e-9);
  V.tmusStart();
  ok('a second start keeps one voice',FA.live(ac,true).length===1&&V.getTMUS().src===M.src);
  V.setVols(0.3,0.2);
  ok('the sliders drive the buses (SFX 0.3, music 0.2)',ac.__sfx.gain.value===0.3&&ac.__mus.gain.value===0.2&&V.getVols().sfx===0.3&&V.getVols().mus===0.2);
  V.setVols(1,0.7);
  {const src=M.src,g=M.g,s=await read();await write(Object.assign({},s,{snd:0}));await V.loadSettings();
    ok('loading Sound: Off stops the menu music: a 0.6 s fade, the source stopped at +0.7 s',!V.getTMUS().src&&src.stopped!=null&&Math.abs(src.stopped-(ac.t+0.7))<1e-9&&
      g.gain.ev.some(e=>e[0]==='lin'&&e[1]===0.0001));
    await write(Object.assign({},s,{snd:1}));await V.loadSettings();V.setSound(true);}

  /* ===== 4. labels, Help, the toast ===== */
  V.syncSetUI();
  ok('the Music switch is labelled World Music (the menu music and records follow the Music volume slider)',/^World Music: (On|Off)$/.test(el('p_music').textContent)&&
    /id="p_music"[^>]*>World Music: Off</.test(HH));
  ok('Controls (the old Help & Controls) is controls only: the F8 replay row, no AI players, Game rules, Export World, Settings or What’s New blurbs',
    /<h2>Controls<\/h2>/.test(HH)&&/<b>Save a replay<\/b> F8 saves the last 30 seconds/.test(HH)&&!/<b>AI players<\/b>/.test(HH)&&!/<b>Game rules:<\/b>/.test(HH)&&!/<b>Export World<\/b>/.test(HH)&&!/<b>What’s New:<\/b>/.test(HH));
  {const a=HH.indexOf('<section id="tcred"'),cr=a>=0?HH.slice(a,HH.indexOf('</section>',a)):'';
   ok('Credits is its own title view (CC-BY credits, three.js, a Back button) and the help screen has no Credits row',!!cr&&/Roman Miller/.test(cr)&&/three\.js r128 \(MIT\)/.test(cr)&&/id="t_back_cred"/.test(cr)&&!/<b>Credits:<\/b>/.test(HH));}
  ok('the main menu: Create New World, Load World (no count), Controls, r/DanDingle, Credits, all wired',/id="t_go_load" class="mc-btn">Load World</.test(HH)&&
    HH.indexOf('id="t_go_new"')<HH.indexOf('id="t_go_load"')&&HH.indexOf('id="t_go_load"')<HH.indexOf('id="t_help"')&&HH.indexOf('id="t_help"')<HH.indexOf('id="t_reddit"')&&HH.indexOf('id="t_reddit"')<HH.indexOf('id="t_credits"')&&
    ['t_credits','t_back_cred','t_reddit'].every(id=>typeof el(id).onclick==='function'));
  {const U=P_.readSrc('ui/p06e_ui_scale.js'),a=U.indexOf('function hudLayout('),hl=a>=0?U.slice(a):'';
    ok('hudLayout never pushes a menu down for a toast (it sits on the top edge over a full-window menu)',!!hl&&!/paddingTop=\(\(r\.height/.test(hl)&&!/HL\.push=\{/.test(hl)&&/if\(!sp\)tst\.classList\.add\('up'\)/.test(hl));}

  /* ===== 5. the rules editor, the pickup, Malgorath's bar ===== */
  await global.storage.set('vxw:u_title_rules',JSON.stringify({v:1,name:'u_title_rules',gr:{god:false,keepInv:true,mobGrief:true,cheats:false},marker:'kept'}));
  await V.tgrOpen('u_title_rules');
  ok('right-click rules: tgrOpen reads the saved world and opens the rules view',V.getTGR().name==='u_title_rules'&&!!V.getTGR().save&&V.getTM().view==='gr');
  el('tgr_list').querySelectorAll=()=>[{getAttribute:()=>'god',checked:true},{getAttribute:()=>'keepInv',checked:false}];
  await V.tgrSave();
  {let d=null;try{d=JSON.parse((await global.storage.get('vxw:u_title_rules')).value);}catch(e){d=null;}
    ok('tgrSave writes the toggles into the save (God on, Keep Inventory off), keeps the rest, and goes back to the list',!!d&&d.gr.god===true&&d.gr.keepInv===false&&
      d.gr.mobGrief===true&&d.marker==='kept'&&V.getTM().view==='load'&&!V.getTGR().save);}

  V.startNewWorld('u_title','4242','s');V.GR.mobSpawn=false;V.GR.snail=false;step(160);
  {const P=V.P;for(let i=0;i<36;i++)P.inv[i]=null;P.sel=0;el('handname').textContent='';
    V.spawnDrop(P.x,P.y+0.3,P.z,{id:V.B.DIRT,count:3},0,0,0);
    let got=false;for(let i=0;i<80&&!got;i++){step(1);got=!!P.inv[0];}
    ok('picking something up redraws the hotbar at once (the selected slot names it: "'+el('handname').textContent+'")',got&&P.inv[0].id===V.B.DIRT&&/dirt/i.test(el('handname').textContent));}
  el('mgbar').style.display='block';V.startNewWorld('u_title2','4243','s');step(5);
  ok('Malgorath’s bar is hidden when a new world starts',el('mgbar').style.display==='none');
  el('mgbar').style.display='block';await V.quitToTitle();
  ok('...and on Save & Quit (it never follows Dan back to the title or into another world)',el('mgbar').style.display==='none');
});
