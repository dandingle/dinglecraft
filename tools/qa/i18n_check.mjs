// Muted browser localization check. Start chrome.sh on --port and serve.mjs on port+100 first.
import fs from 'node:fs';
import {args,connect,REPO} from './lib/cdp.mjs';
const A=args(),port=+(A.port||9403),C=await connect(port);
const checks=[];
function check(name,ok,info){checks.push({name,ok,info});console.log((ok?'ok ':'FAIL ')+name+(info===undefined?'':' '+JSON.stringify(info)));}
try{
  await C.open(`http://127.0.0.1:${port+100}/${A.build||'build/dinglecraft_v6.9.html'}`);
  const t=await C.ev(`DingleI18n.set('ja');await Promise.resolve();return {lang:document.documentElement.lang,new:$('t_go_new').textContent,label:$('t_lang').previousElementSibling.textContent,options:[...$('t_lang').options].map(o=>o.textContent),font:getComputedStyle($('t_go_new')).fontFamily,version:GAME_VERSION};`);
  check('Japanese title and unchanged version',t.lang==='ja'&&t.new==='新しいワールドを作成'&&t.version==='6.9',t);
  check('Language control entirely English',t.label==='Language'&&t.options.join('/')==='English/Japanese');
  check('M PLUS 1 interface font',t.font.includes('M PLUS 1'));
  await C.ev(`rpIntroClose();tmShow('new');`);await C.shot(REPO+'/out/qa/ja_new.jpg');
  const warning=await C.ev(`return $('t_warn').textContent;`);
  check('Entire world-storage warning translated',!warning.includes('Worlds are saved'),warning);
  const d=await C.ev(`const el=document.createElement('button');el.id='ja_test_dynamic';el.textContent='Inventory';el.title='Settings';document.body.appendChild(el);await new Promise(r=>setTimeout(r,0));return {text:el.textContent,title:el.title};`);
  check('Dynamically inserted text and tooltip',d.text==='インベントリ'&&d.title==='設定',d);
  const names=await C.ev(`return {boss:i18nText('MALGORATH, THE WORLD-EATER'),username:i18nText(PNAME),language:localStorage.getItem('dinglecraft.locale')};`);
  check('Original boss title, player name and saved locale',names.boss==='MALGORATH, THE WORLD-EATER'&&names.username==='QA'&&names.language==='ja',names);
  const back=await C.ev(`DingleI18n.set('en');return {text:$('ja_test_dynamic').textContent,title:$('ja_test_dynamic').title,new:$('t_go_new').textContent};`);
  check('English restored exactly',back.text==='Inventory'&&back.title==='Settings'&&back.new==='Create New World',back);
  await C.ev(`DingleI18n.set('ja');__vox.startNewWorld('Stone World','1337','c');__vox.GR.mobSpawn=false;openSet();i18nApply();`);
  await C.shot(REPO+'/out/qa/ja_settings.jpg');
  const w=await C.ev(`return {name:WORLD.name,settings:$('p_settings').textContent,lang:$('s_lang').value,options:[...$('s_lang').options].map(o=>o.textContent)};`);
  check('World state and settings language',w.name==='Stone World'&&w.lang==='ja'&&w.options.join('/')==='English/Japanese',w);
  const canvas=await C.ev(`const g=document.createElement('canvas').getContext('2d');g.font='bold 18px monospace';const before=g.font;const a=g.measureText('Inventory').width,b=g.measureText('インベントリ').width;return {same:Math.abs(a-b)<0.01,fontRestored:g.font===before};`);
  check('Canvas measures translated text and restores drawing state',canvas.same&&canvas.fontRestored,canvas);
  await C.ev(`closeSet(true);openModal('creative');i18nApply();`);await C.shot(REPO+'/out/qa/ja_inventory.jpg');
  await C.ev(`closeModal();renderPatch();i18nApply();`);
  const untranslated=await C.ev(`const w=document.createTreeWalker(document.body,4),a=new Set();while(w.nextNode()){const n=w.currentNode,p=n.parentElement;if(!p||p.closest(I18N_SKIP))continue;const old=I18N.originals.get(n),s=n.nodeValue.trim();if(old&&old.out===old.source&&/[A-Za-z]{3}/.test(s)&&!Object.prototype.hasOwnProperty.call(JA_LOCALE,s)&&!s.includes(PNAME))a.add(s);}return [...a].filter(s=>s.length<600);`);
  fs.writeFileSync(REPO+'/out/qa/ja-untranslated.json',JSON.stringify(untranslated,null,2));
  console.log('Remaining browser text for manual review: '+JSON.stringify(untranslated));
  check('No browser exceptions',!C.logs.some(s=>s.startsWith('exception')),C.logs.filter(s=>s.startsWith('exception')));
}finally{await C.restoreOG();C.close();}
fs.writeFileSync(REPO+'/out/qa/ja-checks.json',JSON.stringify(checks,null,2));
process.exitCode=checks.every(x=>x.ok)?0:1;
