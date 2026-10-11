// List source-owned display text for Japanese translation review; never reads generated assets.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),lexer=require('../tests/lib/jsprose.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const order=dir=>fs.readFileSync(path.join(root,dir,'ORDER.txt'),'utf8').split('\n').filter(s=>s&&!s.startsWith('#'));
const decode=s=>s.replace(/&(?:nbsp|amp|lt|gt|quot|apos);|&#(?:x[\da-f]+|\d+);/gi,x=>{
  const e={ '&nbsp;':' ', '&amp;':'&', '&lt;':'<', '&gt;':'>', '&quot;':'"', '&apos;':"'"};
  return e[x]||String.fromCodePoint(x.startsWith('&#x')?parseInt(x.slice(3),16):parseInt(x.slice(2),10));
});
const normal=s=>decode(s).replace(/\s+/g,' ').trim();
const entries=new Map();
function add(s,file){
  s=normal(s);
  if(!/[A-Za-z]{2}/.test(s)||s.length<3)return;
  if(!/\s/.test(s)&&!/[A-Z]/.test(s)&&!['on','off','yes','no','buy','sell','empty','unknown','none','paused','ready','overworld','nether','aether'].includes(s))return;
  if(/^(?:#[\da-f]+|data:|https?:|rgba?\(|[\d.]+px|[\d.]+%|[\d.]+[sm] |[A-Za-z_]+\.[A-Za-z_]+$)/i.test(s))return;
  if(/(?:=>|font:|font-family:|uniform |varying |vec[234]\(|gl_Frag|gl_Position|return |function |<svg|<path|matrixWorld|BufferGeometry|colorSpace|sampler2D)/.test(s))return;
  if(/^[A-Za-z]+(?:[A-Z][a-z]+)+$/.test(s)&&!/[A-Z]{2}/.test(s))return;
  if(!entries.has(s))entries.set(s,new Set());entries.get(s).add(file);
}
function html(s,file){
  for(const m of s.matchAll(/\b(?:title|placeholder|aria-label|alt)=["']([^"']*)["']/g))add(m[1],file);
  for(const t of s.replace(/<!--[\s\S]*?-->/g,'').split(/<[^>]*>/))add(t,file);
}
for(const f of order('html').filter(f=>f.startsWith('dom/')||f==='01_body_open.html'))html(fs.readFileSync(path.join(root,'html',f),'utf8'),'html/'+f);
for(const f of order('src').filter(f=>!f.includes('i18n')&&!f.startsWith('locales/')&&!f.includes('/models/'))){
  const file='src/'+f,s=fs.readFileSync(path.join(root,file),'utf8');
  for(const t of lexer.strings(s)){
    let v;
    if(t.q==='`'){v=t.s.slice(1,t.s.endsWith('${')?-2:-1);if(/\\/.test(v))continue;}
    else {try{v=vm.runInNewContext(t.s,Object.create(null),{timeout:50});}catch{continue;}}
    if(typeof v!=='string')continue;
    if(/<(?:div|span|b|button|small|input|h[1-6]|p|label|option|select|br)\b/i.test(v))html(v,file);else add(v,file);
  }
}
const list=process.argv.includes('--snapshot')?JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--snapshot')+1],'utf8')):Array.from(entries,([en,files])=>({en,files:[...files]}));
fs.mkdirSync(path.join(root,'out'),{recursive:true});
fs.writeFileSync(path.join(root,'out/i18n-inventory.json'),JSON.stringify(list,null,2)+'\n');
console.log(`${list.length} distinct candidate strings; inventory: out/i18n-inventory.json`);
if(process.argv.includes('--list'))list.forEach((x,i)=>console.log(i+' '+JSON.stringify(x.en)));
export function displayCandidate(x){
  const s=x.en,f=x.files[0];
  if(x.files.some(f=>f.startsWith('html/')))return !s.startsWith('{{');
  if(/src\/ai_players\/a[1-8]|src\/purgatory\/p5_bots|src\/malgorath\/m[3-4]|src\/malgorath\/hr/.test(f))return false;
  if(!s.includes(' ')&&(/[a-z][A-Z]|^Key|^Digit|^tr_|^#|^\{|^([A-Z])\1+$|^[.Xo]+$/.test(s)||s.length>60))return false;
  if(/(?:[{};=]|^<|^\[HR|^\[TP|sans-serif|monospace|^mc-|^mcraft|^ttoggle|^use strict|^bold \d+px|^\d+px)/.test(s)&&!f.includes('patch_notes')&&!f.includes('guide'))return false;
  return true;
}
if(process.argv.includes('--review'))list.forEach((x,i)=>{if(displayCandidate(x))console.log(i+' '+JSON.stringify(x.en));});
if(process.argv.includes('--assemble')){
  const values=JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--assemble')+1],'utf8'));
  const bundle=Object.fromEntries(Object.entries(values).map(([i,ja])=>{if(!list[i])throw Error('Unknown index '+i);return [list[i].en,ja];}));
  if(process.argv.includes('--extras'))Object.assign(bundle,JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--extras')+1],'utf8')));
  fs.writeFileSync(path.join(root,'src/ui/i18n_ja.js'),'/* Editable Japanese bundle: English display text -> Japanese. See docs/LOCALIZATION.md. */\nconst JA_LOCALE='+JSON.stringify(bundle,null,2)+';\n');
  const missing=list.map((x,i)=>({i,...x})).filter(x=>displayCandidate(x)&&!bundle[x.en]);
  fs.writeFileSync(path.join(root,'out/i18n-missing.json'),JSON.stringify(missing,null,2)+'\n');
  console.log(`Japanese bundle: ${Object.keys(bundle).length} entries; remaining display candidates: ${missing.length}`);
}
