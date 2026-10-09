/* u_scale.js (Release 1.0, lane UI, gate x1): the UI scale (src/ui/p06e_ui_scale.js) and the title menu (src/ui/p07g_title.js).
   Headless (the creativity boot: real openModal, no network). Node is never "live": the applied scale stays 100% unless a check
   asks for one with uiApply({w,h,dpr}), the title background never starts, and nothing here touches a clock or Math.random.
   1 Auto at 1280x720 / 1920x1080 / 2560x1440 and other windows and DPRs (bigger than the old 100% at the three sizes)
   2 the caps: the inventory always fits the window, the HUD row fits beside its badges, never below 100%
   3 the Settings values (Auto, 100, 125, 150, 200) in the markup and in UI_STEPS; uiPrefNorm
   4 vox_settings: ui saved through saveSettings and read back by loadSettings, the other fields kept, an old vox_settings without ui
     (and a bad ui) means Auto
   5 the CSS variables (--uiz overlays, --uih HUD) applied, and layout code that reads the scale (the easel's zoom) follows it
   6 the title: #t_ver says RELEASE_LABEL, every id the code uses is there once, the views, the mode buttons drive #t_mode, Create
     World starts a world in that mode, the background stays off in node
   7 the HUD layout (hudLayout, p06e): the toast spot beside a menu (hlSpot: above, below, a side gap narrowed to fit, or none), and
     hudLayout is wired into showToast and the frame loop but does nothing in node (the browser rig tools/qa/ui/ui_qa.mjs measures it) */
'use strict';
const boot=require('../lib/c_boot.js'),{ok}=boot;
const fs=require('fs');
const V=boot({});
const step=boot.stepper(600000);
const HH=fs.readFileSync(boot.BUILD+'head.html','utf8');
const doc=global.document;
const el=id=>doc.getElementById(id);
const near=(a,b)=>Math.abs(a-b)<1e-9;

boot.run(async()=>{
  ok('the UI scale seams are on __vox',['uiAutoScale','uiCompute','uiCaps','uiApply','uiSetPref','uiPrefNorm','getUIS','tmShow','tmMode','getTBG']
    .every(k=>typeof V[k]==='function')&&Array.isArray(V.UI_STEPS));
  const U=V.getUIS();
  ok('node is not live: the applied scale is 100% (overlays and HUD)',V.uiLive()===false&&U.live===false&&U.eff===1&&U.hud===1&&V.uiZ()===1&&V.uiK()===1&&V.uiK(1)===1);

  /* ===== 1. Auto ===== */
  const A=V.uiAutoScale;
  ok('Auto: 1280x720 -> 125%, 1920x1080 -> 150%, 2560x1440 -> 200% (DPR 1)',A(1280,720,1)===1.25&&A(1920,1080,1)===1.5&&A(2560,1440,1)===2);
  ok('Auto is clearly bigger than the old fixed UI at all three sizes',[[1280,720],[1920,1080],[2560,1440]].every(([w,h])=>A(w,h,1)>=1.25));
  ok('Auto at DPR 2 (a Retina window of the same CSS size) picks the same comfortable size',A(1280,720,2)===1.25&&A(1920,1080,2)===1.5&&A(2560,1440,2)===2&&A(1440,900,2)===1.25);
  ok('Auto at a fractional DPR snaps to a whole number of device pixels (1280x720 @1.5 -> 133%, 2 device px per CSS px)',
    near(A(1280,720,1.5),1.33)&&Math.abs(A(1280,720,1.5)*1.5-2)<0.01);
  ok('Auto: small windows and phones stay at 100%',A(1024,576,1)===1&&A(800,600,1)===1&&A(390,844,3)===1&&A(844,390,3)===1);
  ok('Auto: a 4K window gets 300%, an ultrawide 3440x1440 the 1440p size (200%)',A(3840,2160,1)===3&&A(3440,1440,1)===2);
  ok('Auto: bad input falls back to 1280x720 at DPR 1',A(0,0,0)===1.25&&A(NaN,undefined,null)===1.25);

  /* ===== 2. caps ===== */
  const Cp=V.uiCompute,B=V.UI_BASE;
  {const r=Cp('auto',1280,720,1);ok('1280x720 Auto: 125% applied, the inventory fits (height '+Math.round(r.eff*B.modalH)+' <= 704)',r.eff===1.25&&r.eff*B.modalH<=704&&r.hud===1.25);}
  {const r=Cp(2,1280,720,1);ok('1280x720 at 200%: capped so the inventory still fits ('+r.eff+'), never below 100%, HUD cap '+r.hud,r.want===2&&r.eff<2&&r.eff>=1&&r.eff*B.modalH<=704&&r.eff*B.modalW<=1264&&r.hud>=r.eff&&r.hud<2);}
  {const r=Cp(2,1920,1080,1);ok('1920x1080 at 200%: '+r.eff+' (fits), HUD '+r.hud,r.eff>=1.9&&r.eff*B.modalH<=1064&&r.hud>=1.9);}
  {const r=Cp(2,2560,1440,1);ok('2560x1440 at 200%: the full 200%',r.eff===2&&r.hud===2);}
  {const r=Cp(1.5,800,500,1);ok('a window smaller than the 100% inventory: 100%, not less (panels scroll inside)',r.eff===1&&r.hud===1);}
  ok('every cap is a 0.05 step',[[1280,720],[1366,768],[1600,900],[1920,1080],[1000,1000]].every(([w,h])=>{const c=V.uiCaps(w,h);return near(Math.round(c.modal*20)/20,c.modal)&&near(Math.round(c.hud*20)/20,c.hud);}));
  ok('the HUD row fits beside the corner badges at every applied HUD scale',[[1280,720],[1366,768],[1920,1080],[2560,1440]].every(([w,h])=>
    V.UI_STEPS.concat(['auto']).every(p=>{const r=Cp(p,w,h,1);return r.hud*(B.hudW/2+B.hudSide)<=w/2-10+1e-6||r.hud===1;})));

  /* ===== 3. the menu values ===== */
  ok('UI_STEPS is 100 / 125 / 150 / 200 %',JSON.stringify(V.UI_STEPS)===JSON.stringify([1,1.25,1.5,2]));
  {const m=/<div id="s_ui"[^>]*>([\s\S]*?)<\/div>/.exec(HH),btn=m?[...m[1].matchAll(/data-ui="([^"]+)">([^<]+)</g)].map(x=>x[1]+'='+x[2]):[];
    ok('Settings: the UI scale row has Auto, 100%, 125%, 150%, 200% (data-ui auto 1 1.25 1.5 2)',btn.join(',')==='auto=Auto,1=100%,1.25=125%,1.5=150%,2=200%');
    ok('Settings: the UI scale row and its info line are there once',HH.split('id="s_ui"').length===2&&HH.split('id="s_uiinfo"').length===2);}
  const N=V.uiPrefNorm;
  ok('uiPrefNorm: auto / numbers / strings kept, anything else is Auto',N('auto')==='auto'&&N(1.5)===1.5&&N('1.25')===1.25&&N(2)===2&&N(1)===1&&
    N(undefined)==='auto'&&N(null)==='auto'&&N('')==='auto'&&N(3)==='auto'&&N(0.5)==='auto'&&N('big')==='auto');

  /* ===== 4. vox_settings ===== */
  const read=async()=>{try{return JSON.parse((await global.storage.get('vox_settings')).value);}catch(e){return null;}};
  V.uiSetPref(1.5);await new Promise(r=>setImmediate(r));
  {const s=await read();ok('uiSetPref saves: vox_settings.ui is 1.5',s&&s.ui===1.5);
    ok('...and every older field is still saved (rd snd mus fb sh plk tp tq)',s&&['rd','snd','mus','fb','sh','plk','tp','tq'].every(k=>k in s));}
  V.uiSetPref('auto',true);
  ok('uiSetPref(..., skipSave) changes the preference without saving',V.getUIS().pref==='auto'&&(await read()).ui===1.5);
  await V.loadSettings();
  ok('loadSettings reads ui back (1.5)',V.getUIS().pref===1.5);
  V.uiSetPref(2);await V.loadSettings();ok('a 200% preference round-trips',V.getUIS().pref===2);
  {const s=await read();delete s.ui;await global.storage.set('vox_settings',JSON.stringify(s));await V.loadSettings();
    ok('an old vox_settings without ui means Auto',V.getUIS().pref==='auto');
    s.ui=7;await global.storage.set('vox_settings',JSON.stringify(s));await V.loadSettings();
    ok('a bad ui value means Auto',V.getUIS().pref==='auto');}
  V.uiSetPref('auto');
  ok('node stays at 100% whatever the preference (nothing is live)',V.getUIS().eff===1&&V.getUIS().hud===1);

  /* ===== 5. CSS variables and the layout that reads the scale ===== */
  const st=doc.documentElement.style,cv=k=>String(typeof st.getPropertyValue==='function'?st.getPropertyValue(k):st[k]);
  ok('boot applied --uiz 1 and --uih 1',cv('--uiz')==='1'&&cv('--uih')==='1');
  const z9=V.crPxZoom(64,64);
  {const r=V.uiApply({w:1920,h:1080,dpr:1});ok('uiApply({1920x1080}) at Auto: 150% applied to overlays and HUD (--uiz 1.5, --uih 1.5)',r.eff===1.5&&r.hud===1.5&&cv('--uiz')==='1.5'&&cv('--uih')==='1.5'&&V.uiZ()===1.5);}
  {const r=V.uiApply({w:1280,h:720,dpr:1});ok('uiApply({1280x720}) at Auto: 125%',r.eff===1.25&&cv('--uiz')==='1.25'&&cv('--uih')==='1.25');
    ok('the easel editor makes room for its bigger toolbars (64x64 zoom '+z9+' at 100%, '+V.crPxZoom(64,64)+' at 125%)',z9===9&&V.crPxZoom(64,64)===8);}
  V.getUIS().pref=2;
  {const r=V.uiApply({w:1280,h:720,dpr:1});ok('uiApply at 200% in a 1280x720 window: overlays '+r.eff+', HUD '+r.hud+' (both capped, HUD >= overlays)',r.want===2&&r.eff<2&&r.hud<2&&r.hud>=r.eff&&cv('--uiz')===String(r.eff));}
  V.getUIS().pref='auto';
  {const r=V.uiApply();ok('uiApply() with no window override goes back to 100% in node',r.eff===1&&r.hud===1&&cv('--uiz')==='1'&&V.crPxZoom(64,64)===9);}

  /* ===== 6. the title ===== */
  ok('#t_ver says RELEASE_LABEL ('+V.RELEASE_LABEL+')',(/id="t_ver"[^>]*>([^<]*)</.exec(HH)||[])[1]===V.RELEASE_LABEL&&typeof V.RELEASE_LABEL==='string'&&!/v\d/.test(V.RELEASE_LABEL));
  const IDS=['title','tlogo','t_ver','t_name','t_seed','t_mode','t_bots','t_continue','t_new','t_worlds','t_import','t_help','t_patch',
    't_go_new','t_go_load','t_back_new','t_back_load','t_mode_s','t_mode_c','tbgc','tmain','tnew','tload'];
  {const bad=IDS.filter(id=>HH.split('id="'+id+'"').length!==2);ok('every title id is in head.html exactly once'+(bad.length?' (not: '+bad.join(' ')+')':''),bad.length===0);}
  {const logo=fs.readFileSync(boot.P.ASSETS+'logo.png').toString('base64');
    ok("the title logo is Dan's logo.png, embedded once, unchanged",HH.split('data:image/png;base64,'+logo+'"').length===2&&!HH.includes('{{LOGO_PNG_BASE64}}'));}
  V.tmShow('new');
  ok('tmShow(new): the Create New World view shows, the main menu hides',el('tnew').hidden===false&&el('tmain').hidden===true&&el('tload').hidden===true&&V.getTM().view==='new');
  V.tmShow('load');ok('tmShow(load): Saved Worlds',el('tload').hidden===false&&el('tnew').hidden===true&&V.getTM().view==='load');
  V.tmShow('nope');ok('an unknown view falls back to the main menu',el('tmain').hidden===false&&el('tnew').hidden===true&&el('tload').hidden===true&&V.getTM().view==='main');
  ok('the view buttons are wired',['t_go_new','t_go_load','t_back_new','t_back_load','t_mode_s','t_mode_c'].every(id=>typeof el(id).onclick==='function'));
  el('t_go_new').onclick();ok('Create New World (main menu) opens the form',V.getTM().view==='new');
  el('t_mode_c').onclick();ok('the Creative button sets #t_mode to c',el('t_mode').value==='c');
  el('t_mode_s').onclick();ok('the Survival button sets it back to s',el('t_mode').value==='s');
  V.tmMode('c');el('t_name').value='uscale';el('t_seed').value='4242';el('t_bots').checked=false;
  el('t_new').onclick();step(60);
  ok('Create World starts a world from the form (name, creative mode, no bots)',V.playing===true&&V.P&&V.P.mode==='c'&&!V.getAG().active);
  ok('the title background never starts in node',V.getTBG().on===false);

  /* ===== 7. the HUD layout ===== */
  const S=V.hlSpot,box=(l,t,r,b)=>({left:l,top:t,right:r,bottom:b}),W0=1280,H0=720;
  ok('hlSpot and hudLayout are on __vox',typeof S==='function'&&typeof V.hudLayout==='function'&&typeof V.getHL==='function');
  {const p=S(350,42,[box(427,65,853,655)],W0,H0,8);ok('a toast over the pause menu goes just above it, centred (y '+(p&&p.y)+')',!!p&&p.where==='above'&&p.y===65-8-42&&p.x===640&&p.maxW===0);}
  {const p=S(350,42,[box(297,24,983,600)],W0,H0,8);ok('no room above: below the menu',!!p&&p.where==='below'&&p.y===608);}
  {const p=S(350,42,[box(297,24,983,696)],W0,H0,8);ok('a menu as tall as the window: the right-hand gap, narrowed to it ('+(p&&p.maxW)+' px), level with its top',
    !!p&&p.where==='right'&&p.maxW===1280-983-16&&p.y===24&&Math.abs(p.x-(983+1280)/2)<1e-9);}
  {const p=S(200,42,[box(500,10,1100,710)],W0,H0,8);ok('the wider side wins (left here), and a toast that fits keeps its width',!!p&&p.where==='left'&&p.maxW===0&&p.x===250);}
  ok('a menu that fills the window: no spot (hudLayout then puts the toast on the top edge, over the header; the menu never moves)',S(350,42,[box(19,19,1261,701)],W0,H0,8)===null);
  {const p=S(350,42,[box(0,0,10,10),box(1270,710,1280,720)],W0,H0,8);ok('the obstacles count as one box (their union)',p===null||p.where!=='above');}
  ok('nothing open: the free spot',S(350,42,[],W0,H0,8).where==='free');
  {V.showToast('u_scale toast');V.hudLayout();const hl=V.getHL();
    ok('hudLayout does nothing in node (no push, nothing hidden, the toast keeps its CSS place)',!hl.push&&hl.hid.length===0&&!hl.dirty);}
  {const src=fs.readFileSync(boot.P.SRC.ui+'p06a_hud.js','utf8'),loop=fs.readFileSync(boot.P.SRC.core+'p07h_boot_loop.js','utf8');
    ok('showToast and the frame loop call hudLayout',/function showToast\(t\)\{[^}]*hudLayout\(\);/.test(src)&&/tickAgHud\(dt\);\n\s*hudLayout\(\);/.test(loop));}
});
