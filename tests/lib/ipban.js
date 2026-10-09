/* ipban.js: the encoded banned-names list (tests/fixtures/ip_banned.json) and a scanner for it.
   The list names third-party characters, places and catchphrases that must never appear. It is stored ROT13 so the repo passes its own scan:
   every letter a-z/A-Z is rotated by 13, except a letter right after a backslash (a regex escape such as \b stays \b).
   const B=require('../lib/ipban.js');
   B.r13(s)                      -> encode or decode (ROT13 is its own inverse)
   B.load()                      -> {terms:[{k, tier:'all'|'prose', re:RegExp(gi u), sample, src}], doc}
   B.scan(text, terms)           -> [{k, at}] every match of every term in text (one entry per match)
   B.mask(text)                  -> text with data: URIs and base64 runs (60+ chars) blanked to spaces, same length
   B.lineAt(text, at)            -> 1-based line number of offset at
   B.lines(text)                 -> at => 1-based line number (precomputed; use it for many lookups in one big file)
   B.any(terms)                  -> one combined RegExp (gu i) for a quick "is there any hit at all" test
   Tiers: 'all' terms are matched on every byte of a file; 'prose' terms only on prose (string literals with a space in JS, all
   text elsewhere), so the worldgen variable that happens to spell one of them is not flagged. Never print the decoded list
   from a suite: r_ipscan --decode is the only place it is shown (for Dan, on purpose). */
'use strict';
const fs=require('fs');
const P=require('./paths.js');
const FILE=P.FIX+'ip_banned.json';
function r13(s){let o='';for(let i=0;i<s.length;i++){const c=s[i];
  if(c==='\\'&&i+1<s.length){o+=c+s[i+1];i++;continue;}
  const x=c.charCodeAt(0);
  if(x>=65&&x<=90)o+=String.fromCharCode((x-65+13)%26+65);else if(x>=97&&x<=122)o+=String.fromCharCode((x-97+13)%26+97);else o+=c;}
  return o;}
let CACHE=null;
function load(){if(CACHE)return CACHE;const J=JSON.parse(fs.readFileSync(FILE,'utf8'));
  const terms=(J.terms||[]).map(t=>({k:t.k,tier:t.tier,src:r13(t.re),re:new RegExp(r13(t.re),'giu'),sample:r13(t.sample||'')}));
  return CACHE={terms,doc:J._doc,encoding:J.encoding};}
function scan(text,terms){const hits=[];for(const t of terms){t.re.lastIndex=0;let m;
  while((m=t.re.exec(text))){hits.push({k:t.k,at:m.index});if(m[0].length===0)t.re.lastIndex++;}}
  return hits;}
const B64=/data:[a-z0-9.+\/-]+;base64,[A-Za-z0-9+\/=]*|[A-Za-z0-9+\/]{60,}={0,2}/g;
function mask(text){return text.replace(B64,m=>' '.repeat(m.length));}
function lineAt(text,at){let n=1,i=-1;while((i=text.indexOf('\n',i+1))>=0&&i<at)n++;return n;}
function lines(text){const nl=[];for(let i=text.indexOf('\n');i>=0;i=text.indexOf('\n',i+1))nl.push(i);
  return at=>{let lo=0,hi=nl.length;while(lo<hi){const m=(lo+hi)>>1;if(nl[m]<at)lo=m+1;else hi=m;}return lo+1;};}
function any(terms){return new RegExp(terms.map(t=>'(?:'+t.src+')').join('|'),'iu');}
module.exports={r13,load,scan,mask,lineAt,lines,any,FILE};
