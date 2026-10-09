/* jsprose.js: the "prose" view of a JavaScript source, for the name scans (tests/repo/r_ipscan.js, r_other_ip.js).
   const J=require('../lib/jsprose.js');
   J.prose(src)        -> {text, ok, err}: a string as long as src, where every character that is not inside a string or
                          template literal containing a space is replaced by a space (newlines kept, so offsets and line
                          numbers stay valid). Comments, identifiers, regex literals and key-like strings ('pg_cook') are blanked.
                          ok=false (err = the reason) when the tokenizer gave up; text is then the whole source (conservative).
   J.strings(src)      -> [{s, start, end, q}] every string literal and template chunk (the raw source text, quotes included)
   A small lexer (comments, '...', "...", `...${...}...`, regex literals by the usual "what came before" rule). It never
   evaluates anything. Used on the build's game.js and on repo .js/.mjs files. */
'use strict';
const KW_BEFORE_RE=new Set(['return','typeof','case','do','else','in','of','new','delete','void','throw','instanceof','yield','await']);
const isIdStart=c=>/[A-Za-z_$\u00c0-\uffff]/.test(c);
const isIdPart=c=>/[A-Za-z0-9_$\u00c0-\uffff]/.test(c);
const WS=/[ \t\n\r\f\v\u00a0\ufeff\u2028\u2029]/;

function lex(src){
  const out=[];                                 /* string-ish tokens only: {s,start,end,q} */
  const n=src.length;let i=0;
  const tplStack=[];let brace=0;
  const parenBefore=[];                          /* the significant token before each '(' */
  let last=null;                                 /* last significant token {t,s,open?} */
  const sig=(t,s,extra)=>{last=Object.assign({t,s},extra||{});return last;};
  function regexAllowed(){
    if(!last)return true;const s=last.s,t=last.t;
    if(t==='num'||t==='str'||t==='re')return false;
    if(t==='tpl')return s.endsWith('${');
    if(t==='id')return KW_BEFORE_RE.has(s);
    if(s===')'){const b=last.open;return !!(b&&b.t==='id'&&(b.s==='if'||b.s==='while'||b.s==='for'||b.s==='with'));}
    if(s===']'||s==='}'||s==='++'||s==='--')return false;
    return true;}
  function template(){                           /* i at '`' or at the '}' closing a ${ */
    let j=i+1;
    while(j<n){const c=src[j];
      if(c==='\\'){j+=2;continue;}
      if(c==='`'){j++;out.push({s:src.slice(i,j),start:i,end:j,q:'`'});sig('tpl',src.slice(i,j));i=j;return 'close';}
      if(c==='$'&&src[j+1]==='{'){j+=2;out.push({s:src.slice(i,j),start:i,end:j,q:'`'});sig('tpl',src.slice(i,j));i=j;return 'open';}
      j++;}
    throw new Error('unterminated template at '+i);}
  if(src.startsWith('#!')){const j=src.indexOf('\n');i=j<0?n:j;}
  while(i<n){const c=src[i];
    if(WS.test(c)){i++;continue;}
    if(c==='/'&&src[i+1]==='/'){const j=src.indexOf('\n',i);i=j<0?n:j;continue;}
    if(c==='/'&&src[i+1]==='*'){const j=src.indexOf('*/',i+2);if(j<0)throw new Error('unterminated comment at '+i);i=j+2;continue;}
    if(c==='\''||c==='"'){let j=i+1;
      while(j<n&&src[j]!==c){if(src[j]==='\\')j++;else if(src[j]==='\n')throw new Error('newline in string at '+i);j++;}
      if(j>=n)throw new Error('unterminated string at '+i);
      out.push({s:src.slice(i,j+1),start:i,end:j+1,q:c});sig('str',src.slice(i,j+1));i=j+1;continue;}
    if(c==='`'){if(template()==='open')tplStack.push(brace);continue;}
    if(c==='}'&&tplStack.length&&tplStack[tplStack.length-1]===brace){tplStack.pop();if(template()==='open')tplStack.push(brace);continue;}
    if(c==='/'&&regexAllowed()){let j=i+1,cls=false;
      while(j<n){const d=src[j];if(d==='\\'){j+=2;continue;}if(d==='\n')throw new Error('newline in regex at '+i);
        if(cls){if(d===']')cls=false;}else if(d==='[')cls=true;else if(d==='/')break;j++;}
      j++;while(j<n&&/[a-z]/i.test(src[j]))j++;sig('re',src.slice(i,j));i=j;continue;}
    if(isIdStart(c)){let j=i+1;while(j<n&&isIdPart(src[j]))j++;sig('id',src.slice(i,j));i=j;continue;}
    if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(src[i+1]||''))){let j=i+1;
      while(j<n&&/[0-9a-fA-FxXoObBn_.eE]/.test(src[j])){if((src[j]==='e'||src[j]==='E')&&(src[j+1]==='+'||src[j+1]==='-')&&!/^0[xX]/.test(src.slice(i,j)))j++;j++;}
      sig('num',src.slice(i,j));i=j;continue;}
    let p=null;
    for(const q of ['>>>=','...','===','!==','**=','<<=','>>=','>>>','&&=','||=','??='])if(src.startsWith(q,i)){p=q;break;}
    if(!p)for(const q of ['=>','==','!=','<=','>=','&&','||','??','?.','++','--','+=','-=','*=','/=','%=','&=','|=','^=','<<','>>','**'])if(src.startsWith(q,i)){p=q;break;}
    if(!p)p=c;
    if(p==='{')brace++;if(p==='}')brace--;
    if(p==='('){parenBefore.push(last);sig('p',p);}
    else if(p===')'){sig('p',p,{open:parenBefore.pop()});}
    else sig('p',p);
    i+=p.length;}
  return out;}

function strings(src){return lex(src);}
function prose(src){
  let toks;
  try{toks=lex(src);}catch(e){return {text:src,ok:false,err:e.message};}
  const a=src.replace(/[^\n]/g,' ').split('');
  for(const t of toks){const body=t.s.slice(1,t.s.endsWith('${')?-2:-1);if(!/ /.test(body))continue;
    for(let k=t.start;k<t.end;k++)a[k]=src[k];}
  return {text:a.join(''),ok:true};}
module.exports={prose,strings};
