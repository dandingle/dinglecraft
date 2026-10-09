// ORDER files: one repo-relative path per line, '#' comments and blank lines ignored.
// src/ORDER.txt lists every src/**/*.js exactly once; html/ORDER.txt lists every html/**/*.{html,css} except tail.html.
import fs from 'node:fs';
import path from 'node:path';

export function readOrder(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '' && !l.startsWith('#'));
}

/** All files under dir (POSIX paths relative to dir) whose extension is in exts. Dot-entries are skipped. */
export function listFiles(dir, exts) {
  const out = [];
  (function walk(rel) {
    for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      if (d.name.startsWith('.')) continue;
      const r = rel ? rel + '/' + d.name : d.name;
      if (d.isDirectory()) walk(r);
      else if (exts.includes(path.extname(d.name))) out.push(r);
    }
  })('');
  return out.sort();
}

/** Problems with an ORDER list: bad lines, missing files, duplicates, orphans. Returns [] when valid. */
export function validateOrder(dir, entries, exts, ignore = []) {
  const problems = [];
  const seen = new Set();
  for (const e of entries) {
    if (e !== e.trim() || e.includes('\\') || e.startsWith('/') || e.split('/').includes('..')) problems.push('bad ORDER line: ' + JSON.stringify(e));
    else if (!exts.includes(path.extname(e))) problems.push('wrong extension in ORDER: ' + e);
    else if (!fs.existsSync(path.join(dir, e))) problems.push('missing file listed in ORDER: ' + e);
    if (seen.has(e)) problems.push('duplicate ORDER entry: ' + e);
    seen.add(e);
  }
  for (const f of listFiles(dir, exts)) if (!seen.has(f) && !ignore.includes(f)) problems.push('orphan (not in ORDER): ' + f);
  return problems;
}

// Package files must start with their splice-era marker naming themselves (docs/BUILD.md, "marker lint").
const MARKER_DIRS = { 'malgorath/hr': '57 HR', malgorath: '57', creativity: '56', purgatory: '55', texpacks: '54' };

/** Marker lint over the src ORDER entries. Returns problems (file names only). */
export function markerLint(srcDir, entries) {
  const problems = [];
  let checked = 0;
  for (const e of entries) {
    const dir = path.posix.dirname(e), base = path.posix.basename(e);
    const nn = MARKER_DIRS[dir];
    if (!nn || !/^[mcpt][0-9A-C]/.test(base)) continue;
    const want = '/* ---- PART ' + nn + ': ' + base + ' ---- */\n';
    const fd = fs.openSync(path.join(srcDir, e), 'r');
    const buf = Buffer.alloc(Buffer.byteLength(want));
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    if (n !== buf.length || buf.toString('utf8') !== want) problems.push('marker lint: src/' + e + ' must start with its own "/* ---- PART ' + nn + ': ' + base + ' ---- */" line');
    checked++;
  }
  return { problems, checked };
}
