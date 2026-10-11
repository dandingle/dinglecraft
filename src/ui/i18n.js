/* Presentation-only localization: engine ids, saves and user-authored text stay in their original form. */
const I18N={locale:'en',bundles:{ja:JA_LOCALE},originals:new WeakMap(),attributes:new WeakMap(),cache:new Map(),observer:null,
  t(s){return i18nText(s);}};
const I18N_ATTRS=['title','placeholder','aria-label','alt'];
const I18N_SKIP='script,style,textarea,[contenteditable], [data-i18n-skip],.wrow>span,#tgr_world';
const I18N_KEYS=Object.keys(JA_LOCALE).sort((a,b)=>b.length-a.length);
const I18N_RX=new RegExp(I18N_KEYS.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
function i18nRaw(s){
  if(I18N.locale!=='ja'||typeof s!=='string')return s;
  const key=s.replace(/\s+/g,' ').trim();
  if(Object.prototype.hasOwnProperty.call(JA_LOCALE,key))return s.replace(/\S[\s\S]*\S|\S/,()=>JA_LOCALE[key]);
  if(I18N.cache.has(s))return I18N.cache.get(s);
  const out=s.replace(I18N_RX,(match,offset,whole)=>{
    // Never turn a word inside a username, file path or command into translated prose.
    if(/[A-Za-z0-9_]/.test(match[0])&&offset&&/[A-Za-z0-9_/.]/.test(whole[offset-1]))return match;
    if(/[A-Za-z0-9_]/.test(match[match.length-1])&&/[A-Za-z0-9_/.]/.test(whole[offset+match.length]||''))return match;
    return JA_LOCALE[match];
  });
  if(I18N.cache.size>=4096)I18N.cache.clear();I18N.cache.set(s,out);return out;
}
function i18nText(s){
  if(I18N.locale!=='ja'||typeof s!=='string')return s;
  const names=[];
  if(typeof PNAME==='string'&&PNAME)names.push(PNAME);
  if(typeof WORLD==='object'&&WORLD&&WORLD.name)names.push(WORLD.name);
  if(typeof AGENTS!=='undefined')for(const a of AGENTS)if(a.name)names.push(a.name);
  if(typeof CRW!=='undefined')for(const r of Object.values(CRW)){
    if(r.t||r.title)names.push(r.t||r.title);if(r.by)names.push(r.by);
  }
  // A short world/name such as "World" must not split a known help paragraph into fragments.
  if(names.includes(s.trim()))return s;
  if(Object.prototype.hasOwnProperty.call(JA_LOCALE,s.replace(/\s+/g,' ').trim()))return i18nRaw(s);
  const reserved=[...new Set(names)].filter(n=>n&&s.includes(n)).sort((a,b)=>b.length-a.length);
  if(!reserved.length)return i18nRaw(s);
  const rx=new RegExp(reserved.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  let out='',last=0;for(const m of s.matchAll(rx)){
    if(/[\p{L}\p{N}_]/u.test(m[0][0])&&/[\p{L}\p{N}_]/u.test(s[m.index-1]||''))continue;
    if(/[\p{L}\p{N}_]/u.test(m[0].slice(-1))&&/[\p{L}\p{N}_]/u.test(s[m.index+m[0].length]||''))continue;
    out+=i18nRaw(s.slice(last,m.index))+m[0];last=m.index+m[0].length;
  }
  return out+i18nRaw(s.slice(last));
}
function i18nNode(n){
  const p=n.parentElement;if(!p||p.closest(I18N_SKIP))return;
  const value=n.nodeValue,old=I18N.originals.get(n);
  const source=old&&value===old.out?old.source:value;
  const out=p.id==='t_continue'?source.replace(/^Continue —/,()=>i18nRaw('Continue —')):i18nText(source);
  if(out!==value)n.nodeValue=out;I18N.originals.set(n,{source,out});
}
function i18nAttrs(el){
  if(el.closest(I18N_SKIP))return;
  const originals=I18N.attributes.get(el)||{};
  for(const attr of I18N_ATTRS){if(!el.hasAttribute(attr))continue;
    const value=el.getAttribute(attr),old=originals[attr],source=old&&value===old.out?old.source:value,out=i18nText(source);
    if(out!==value)el.setAttribute(attr,out);originals[attr]={source,out};
  }I18N.attributes.set(el,originals);
}
function i18nTree(root){
  if(root.nodeType===3){i18nNode(root);return;}
  if(root.nodeType!==1||root.closest(I18N_SKIP))return;
  i18nAttrs(root);for(const el of root.querySelectorAll('[title],[placeholder],[aria-label],[alt]'))i18nAttrs(el);
  const walker=document.createTreeWalker(root,4);while(walker.nextNode())i18nNode(walker.currentNode);
}
function i18nApply(){
  if(typeof document==='undefined'||!document.body||typeof document.createTreeWalker!=='function')return;
  if(I18N.observer)I18N.observer.disconnect();
  document.documentElement.lang=I18N.locale;
  i18nTree(document.body);
  for(const id of ['s_lang','t_lang']){const el=document.getElementById(id);if(el){el.value=I18N.locale;el.onchange=()=>i18nSet(el.value);}}
  if(I18N.observer)I18N.observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:I18N_ATTRS});
}
function i18nSet(locale){
  I18N.locale=locale==='ja'?'ja':'en';I18N.cache.clear();
  try{localStorage.setItem('dinglecraft.locale',I18N.locale);}catch(e){}
  i18nApply();
  // Redraw the menus/held-name immediately; canvas text follows on its next normal frame.
  if(typeof syncSetUI==='function')syncSetUI();
  if(typeof redrawHotbar==='function'&&typeof playing!=='undefined'&&playing)redrawHotbar();
  i18nApply();
}
function i18nCanvas(){
  if(typeof CanvasRenderingContext2D==='undefined')return;
  const proto=CanvasRenderingContext2D.prototype;
  for(const name of ['fillText','strokeText','measureText']){
    const original=proto[name];if(typeof original!=='function')continue;
    proto[name]=function(text,...args){
      const font=this.font;
      if(!font.includes('M PLUS 1'))this.font=font.replace(/(\d+(?:\.\d+)?px(?:\s*\/\s*[\d.]+)?).*/, '$1 "M PLUS 1", sans-serif');
      try{return original.call(this,i18nText(typeof text==='string'?text:String(text)),...args);}finally{this.font=font;}
    };
  }
}
function i18nBoot(){
  if(typeof document.createTreeWalker!=='function')return;
  if(typeof MutationObserver!=='undefined')I18N.observer=new MutationObserver(records=>{
    I18N.observer.disconnect();
    const roots=new Set();for(const r of records){if(r.type==='childList')for(const n of r.addedNodes)roots.add(n);else roots.add(r.target);}
    for(const root of roots)if(root.isConnected)i18nTree(root);
    I18N.observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:I18N_ATTRS});
  });
  i18nCanvas();i18nApply();
  if(document.fonts)document.fonts.ready.then(()=>{if(typeof redrawHotbar==='function'&&typeof playing!=='undefined'&&playing)redrawHotbar();});
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
  try{I18N.locale=localStorage.getItem('dinglecraft.locale')==='ja'?'ja':'en';}catch(e){}
  window.DingleI18n=I18N;window.DingleI18n.set=i18nSet;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',i18nBoot,{once:true});else i18nBoot();
}
