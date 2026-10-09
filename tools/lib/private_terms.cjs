/* private_terms.cjs: the owner's private words (folder names, company or client names) for the privacy scans, kept OUT of the
   public tree. The public rules (home and temp paths, emails, keys, the current user and host read at run time) need no
   list; this adds the words only the owner knows, from a local file that git never sees.

   Sources, all optional, all merged:
     tools/private_terms.local.txt     (gitignored; never committed, never listed by the scans)
     the file named by DC_PRIVATE_TERMS_FILE
     DC_PRIVATE_TERMS                  (entries separated by newlines or ';')
   Format: one entry per line ('#' starts a comment; in DC_PRIVATE_TERMS ';' also separates). A plain entry matches
   case-insensitively as a literal, a space in it also matching '%20', '\ ' or '_'. An entry starting with 're:' is a
   JavaScript regular expression (case-insensitive).

   const T = require('./private_terms.cjs');
   T.load()            -> { rules: [[name, RegExp]], count, sources: ['local list' | 'DC_PRIVATE_TERMS_FILE' | 'DC_PRIVATE_TERMS'] }
   T.compile(entries)  -> [[name, RegExp]] (names are 'private-term#<n>', the entry's position; never the entry itself)
   T.LOCAL_NAME        -> 'private_terms.local.txt'
   Nothing here ever prints an entry: callers report the rule name and a path:line only. */
'use strict';
const fs = require('fs');
const path = require('path');

const LOCAL_NAME = 'private_terms.local.txt';
const LOCAL = path.join(__dirname, '..', LOCAL_NAME);

function parse(text, sep) {
  /* comments go first (a ';' inside a comment is not a separator), then ';' splits only where the source allows it */
  const lines = String(text || '').split(/\r?\n/).map((s) => s.replace(/(^|\s)#.*$/, '').trim()).filter(Boolean);
  return sep ? lines.flatMap((l) => l.split(sep).map((x) => x.trim())).filter(Boolean) : lines;
}

function literal(s) {
  return s.split(' ').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(?: |%20|\\\\ |_)');
}

function compile(entries) {
  const out = [];
  entries.forEach((e, i) => {
    let re = null;
    try { re = e.startsWith('re:') ? new RegExp(e.slice(3), 'i') : new RegExp(literal(e), 'i'); } catch (err) { re = null; }
    if (re) out.push(['private-term#' + (i + 1), re]);
    else out.push(['private-term#' + (i + 1) + '-invalid', /(?!)/]);
  });
  return out;
}

function load() {
  const entries = [], sources = [];
  const add = (txt, why) => { const p = parse(txt); if (p.length) { entries.push(...p); sources.push(why); } };
  try { if (fs.existsSync(LOCAL)) add(fs.readFileSync(LOCAL, 'utf8'), 'local list'); } catch (e) { /* unreadable: no terms */ }
  const f = process.env.DC_PRIVATE_TERMS_FILE;
  try { if (f && fs.existsSync(f)) add(fs.readFileSync(f, 'utf8'), 'DC_PRIVATE_TERMS_FILE'); } catch (e) { /* ignore */ }
  if (process.env.DC_PRIVATE_TERMS) { const p = parse(process.env.DC_PRIVATE_TERMS, ';'); if (p.length) { entries.push(...p); sources.push('DC_PRIVATE_TERMS'); } }
  return { rules: compile(entries), count: entries.length, sources };
}

module.exports = { load, compile, parse, LOCAL_NAME };
