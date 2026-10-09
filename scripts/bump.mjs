#!/usr/bin/env node
// Start a new version: npm run bump -- <maj.min> "<title>" --label "<public name>"
//   e.g. npm run bump -- 6.9 "The Something Update" --label "Release 1.1"
//   or   npm run bump -- 6.9 "Release 1.0 (fixes)" --label "Release 1.0"    (a later cut of the newest release)
// GAME_VERSION is the internal, monotonic number (saves, migrations, the dist file name, the brain); RELEASE_LABEL is the
// public name players and readers see (docs/RELEASING.md, "Versions and release labels"). Every edit happens at once with the
// rep() discipline: each anchor must match exactly once, else NOTHING is written.
//   src/core/p01a_prologue.js   const GAME_VERSION = '<old>';  const RELEASE_LABEL = '<old label>';   -> new values
//   html/dom/title.html         id="t_ver" ...><old label><                                       -> <new label>
//   html/dom/panels_b.html      id="winsmall">DINGLECRAFT <old label>.                             -> <new label>
//   src/ui/p28_patch_notes.js   top entry {v:GAME_VERSION,label:RELEASE_LABEL,...  -> {v:'<old>',label:'<old label>',...
//                               and a new top entry {v:GAME_VERSION,label:RELEASE_LABEL,title:'<title>',lines:['TODO patch notes']}
//                               (release refuses TODO)
//   package.json                "version": "<old>.0"                                              -> "<new>.0"
// Refuses a version <= the current one or <= any shipped version, a label from an older release (a label may only continue the
// current one: scripts/lib/version.mjs labelProblem), and a title or label that breaks the patch-note rules (no apostrophe,
// '<' or backslash).
import fs from 'node:fs';
import path from 'node:path';
import { REPO, FIX } from './lib/paths.mjs';
import { readVersion, readLabel, readPatchLog, cmpVersion, VERSION_FILE, PATCH_FILE, LABEL_OK, labelProblem } from './lib/version.mjs';

const argv = process.argv.slice(2);
const die = (m) => { console.error('bump: ' + m); process.exit(1); };
const li = argv.indexOf('--label');
const LABEL = li >= 0 ? argv[li + 1] : undefined;
const pos = argv.filter((a, i) => i !== li && i !== li + 1);
const [NEW, TITLE] = pos;
if (!NEW || !TITLE || pos.length !== 2 || li < 0) die('usage: npm run bump -- <maj.min> "<title>" --label "<public name, e.g. Release 1.1>"');
if (!/^\d+\.\d+$/.test(NEW)) die(`version must be two-part maj.min (got ${JSON.stringify(NEW)})`);
if (/['<\\\n\r]/.test(TITLE) || !TITLE.trim()) die("title must be one line with no apostrophe, '<' or backslash (patch-note rules)");
if (!LABEL || !LABEL_OK.test(LABEL)) die('label must be one short line of letters, digits, spaces, dots or dashes (e.g. "Release 1.1")');
const OLD = readVersion(REPO);
const OLD_LABEL = readLabel(REPO);
if (cmpVersion(NEW, OLD) <= 0) die(`refusing ${NEW}: it must be above the current version ${OLD}`);
const shipped = JSON.parse(fs.readFileSync(path.join(FIX, 'shipped.json'), 'utf8')).shipped || {};
for (const v of Object.keys(shipped)) if (cmpVersion(NEW, v) <= 0) die(`refusing ${NEW}: v${v} is shipped`);
/* the current label may continue (a later cut); any other label already in PATCH_LOG or shipped.json is an older release's */
const used = new Set([...readPatchLog(REPO).map((e) => e.label).filter(Boolean), ...Object.values(shipped).map((s) => s.label).filter(Boolean)]);
if (LABEL !== OLD_LABEL && used.has(LABEL)) die(`refusing label ${JSON.stringify(LABEL)}: an older release used it (a label never comes back)`);
{ const lp = LABEL === OLD_LABEL ? labelProblem(LABEL, shipped, OLD_LABEL) : null; if (lp) die('refusing: ' + lp); }

const files = {};
const get = (f) => (files[f] ??= fs.readFileSync(path.join(REPO, f), 'utf8'));
function rep(f, oldS, newS) {
  const s = get(f);
  const n = s.split(oldS).length - 1;
  if (n !== 1) die(`${f}: anchor ${JSON.stringify(oldS.slice(0, 70))} found ${n} times (want 1); nothing was written`);
  files[f] = s.replace(oldS, () => newS);
}
function repRe(f, re, make) {
  const s = get(f);
  const m = [...s.matchAll(new RegExp(re.source, 'g'))];
  if (m.length !== 1) die(`${f}: ${re} found ${m.length} times (want 1); nothing was written`);
  files[f] = s.slice(0, m[0].index) + make(m[0]) + s.slice(m[0].index + m[0][0].length);
}
rep(VERSION_FILE, `const GAME_VERSION = '${OLD}';`, `const GAME_VERSION = '${NEW}';`);
rep(VERSION_FILE, `const RELEASE_LABEL = '${OLD_LABEL}';`, `const RELEASE_LABEL = '${LABEL}';`);
repRe('html/dom/title.html', /(id="t_ver"[^>]*>)([^<]*)(<)/, (m) => { if (m[2] !== OLD_LABEL) die('html/dom/title.html: #t_ver says ' + JSON.stringify(m[2])); return m[1] + LABEL + m[3]; });
rep('html/dom/panels_b.html', `>DINGLECRAFT ${OLD_LABEL}. `, `>DINGLECRAFT ${LABEL}. `);
rep(PATCH_FILE, '\n {v:GAME_VERSION,label:RELEASE_LABEL,title:\'', `\n {v:'${OLD}',label:'${OLD_LABEL}',title:'`);
rep(PATCH_FILE, 'const PATCH_LOG=[\n', `const PATCH_LOG=[\n {v:GAME_VERSION,label:RELEASE_LABEL,title:'${TITLE}',lines:[\n    'TODO patch notes',\n  ]},\n`);
rep('package.json', `"version": "${OLD}.0"`, `"version": "${NEW}.0"`);

for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(REPO, f), s);
console.log(`bumped v${OLD} (${OLD_LABEL}) -> v${NEW} (${LABEL}) "${TITLE}" in ${Object.keys(files).length} files: ${Object.keys(files).join(', ')}`);
console.log('next: write the patch notes (replace the TODO line in ' + PATCH_FILE + '), add a help row + blurb in html/dom/help.html, then npm run build');
