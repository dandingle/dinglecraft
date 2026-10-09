// GAME_VERSION, RELEASE_LABEL and the places they are written (docs/RELEASING.md, "Versions and release labels").
// GAME_VERSION is the internal, monotonic two-part number ('maj.min'): saves, migrations, version comparisons, the dist file
// name and the brain (it only serves dinglecraft_vX.Y.html) use it. RELEASE_LABEL is the public name of that game version
// ('Release 1.0'): everything a player or reader sees (title screen, win screen, patch-notes heading, README, CHANGELOG).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { REPO } from './paths.mjs';

export const VERSION_FILE = 'src/core/p01a_prologue.js';
export const PATCH_FILE = 'src/ui/p28_patch_notes.js';
export const VERSION_RE = /^const GAME_VERSION = '(\d+\.\d+)';$/m;
export const LABEL_RE = /^const RELEASE_LABEL = '([^'\\<>\n]+)';(?: .*)?$/m;
/** A label is one short line: letters, digits, spaces, dots and dashes (it is written into html and a JS string). */
export const LABEL_OK = /^[A-Za-z0-9][A-Za-z0-9 .\-]{0,38}[A-Za-z0-9]$/;

/** Every GAME_VERSION site: file, a regex with one capture (must match exactly once), and how to write a new value. */
export const SITES = [
  { file: VERSION_FILE, re: /^const GAME_VERSION = '(\d+\.\d+)';$/gm, make: (v) => `const GAME_VERSION = '${v}';` },
];
/** Every RELEASE_LABEL site (the public name). The html sites are matched by element id, so the markup around them may change. */
export const LABEL_SITES = [
  { file: VERSION_FILE, re: /^const RELEASE_LABEL = '([^'\\<>\n]+)';/gm },
  { file: 'html/dom/title.html', re: /id="t_ver"[^>]*>([^<]*)</g },
  { file: 'html/dom/panels_b.html', re: /id="winsmall"[^>]*>DINGLECRAFT ([A-Za-z0-9 .\-]+?)\. /g },
];

export function readVersion(repo = REPO) {
  const m = VERSION_RE.exec(fs.readFileSync(path.join(repo, VERSION_FILE), 'utf8'));
  if (!m) throw new Error(VERSION_FILE + ': no "const GAME_VERSION = \'X.Y\';" line');
  return m[1];
}

export function readLabel(repo = REPO) {
  const m = LABEL_RE.exec(fs.readFileSync(path.join(repo, VERSION_FILE), 'utf8'));
  if (!m) throw new Error(VERSION_FILE + ': no "const RELEASE_LABEL = \'...\';" line');
  return m[1];
}

/** Compare 'a.b' versions numerically: <0, 0, >0. */
export function cmpVersion(a, b) {
  const [x1, y1] = a.split('.').map(Number), [x2, y2] = b.split('.').map(Number);
  return x1 - x2 || y1 - y2;
}

/** Read every site. Returns [{ file, kind: 'version'|'label', values: [...] }] (a healthy site has exactly one value). */
export function readSites(repo = REPO) {
  const txt = (f) => fs.readFileSync(path.join(repo, f), 'utf8');
  const out = SITES.map((s) => ({ file: s.file, kind: 'version', values: [...txt(s.file).matchAll(s.re)].map((m) => m[1]) }));
  for (const s of LABEL_SITES) out.push({ file: s.file, kind: 'label', values: [...txt(s.file).matchAll(s.re)].map((m) => m[1]) });
  const pkg = JSON.parse(txt('package.json'));
  const pm = /^(\d+\.\d+)\.0$/.exec(pkg.version || '');
  out.push({ file: 'package.json', kind: 'version', values: pm ? [pm[1]] : [] });
  const pt = txt(PATCH_FILE);
  out.push({ file: PATCH_FILE + ' (top PATCH_LOG entry)', kind: 'top', values: /^const PATCH_LOG=\[\n \{v:GAME_VERSION,label:RELEASE_LABEL,title:'/m.test(pt) ? ['top'] : [] });
  return out;
}

/** Problems with the version and label sites (names only). */
export function checkSites(repo = REPO) {
  const v = readVersion(repo);
  let label = null;
  const problems = [];
  try { label = readLabel(repo); } catch (e) { problems.push(e.message); }
  if (label !== null && !LABEL_OK.test(label)) problems.push(`RELEASE_LABEL ${JSON.stringify(label)} is not one short line of letters, digits, spaces, dots or dashes`);
  for (const s of readSites(repo)) {
    if (s.values.length !== 1) { problems.push(`${s.file}: ${s.kind === 'top' ? 'top entry {v:GAME_VERSION,label:RELEASE_LABEL,title:...}' : s.kind} found ${s.values.length} times (want 1)`); continue; }
    if (s.kind === 'version' && s.values[0] !== v) problems.push(`${s.file}: says ${s.values[0]}, GAME_VERSION is ${v}`);
    if (s.kind === 'label' && label !== null && s.values[0] !== label) problems.push(`${s.file}: says ${JSON.stringify(s.values[0])}, RELEASE_LABEL is ${JSON.stringify(label)}`);
  }
  return { version: v, label, problems };
}

/** Evaluate PATCH_LOG (the array literal in src/ui/p28_patch_notes.js) in a sandbox. Returns the entries. */
export function readPatchLog(repo = REPO, gameVersion = readVersion(repo), releaseLabel) {
  if (releaseLabel === undefined) { try { releaseLabel = readLabel(repo); } catch { releaseLabel = null; } }
  const s = fs.readFileSync(path.join(repo, PATCH_FILE), 'utf8');
  const a = s.indexOf('const PATCH_LOG=[');
  const b = a < 0 ? -1 : s.indexOf('\n];\n', a);
  if (a < 0 || b < 0) throw new Error(PATCH_FILE + ': PATCH_LOG array not found');
  return vm.runInNewContext('(' + s.slice(a + 'const PATCH_LOG='.length, b + 2) + ')', { GAME_VERSION: gameVersion, RELEASE_LABEL: releaseLabel }, { timeout: 1000 });
}

/** The public name of a patch-log entry: its label when it has one, else "v<version>". */
export const entryName = (e) => (e && e.label ? e.label : 'v' + e.v);

/** The label rule (docs/RELEASING.md, "Versions and release labels"): consecutive game versions may share one label (a
 *  release's later cuts: Release 1.0 is game 6.5 to 6.8), but a label never comes back once a newer label has shipped.
 *  current: the label the version being released or bumped from carries (null for a release check).
 *  Returns null when the label is allowed, else the reason. */
export function labelProblem(label, shipped, current = null) {
  const vs = Object.keys(shipped || {}).filter((v) => shipped[v] && shipped[v].label).sort(cmpVersion);
  const newest = vs.length ? shipped[vs[vs.length - 1]].label : null;
  const usedBy = vs.filter((v) => shipped[v].label === label);
  if (!usedBy.length) return null;
  if (label === newest && (current === null || current === label)) return null;
  return 'label ' + JSON.stringify(label) + ' belongs to shipped v' + usedBy.join(', v') + (newest ? ' and a newer label (' + JSON.stringify(newest) + ') has shipped since' : '') + ': a label never comes back';
}
