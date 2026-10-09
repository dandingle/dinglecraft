#!/usr/bin/env node
/* scan_history.mjs: the privacy scan over the whole git HISTORY, for before a push (`npm run scan:history`).
   npm run scan checks the files a commit would hold; this checks what a push would publish:

   - every commit: author and committer use a placeholder or noreply address and a +0000 zone (a local offset gives away
     where and when someone works); no signature headers; every message line through the text rules
   - every annotated tag: the tagger the same way
   - every ref name and every path ever committed: the text rules and the forbidden-file rules
   - every blob reachable from any ref (not just HEAD): the text rules (keys, emails, home and temp paths, the owner's
     private terms from the local untracked list) on text, the metadata rules on images (every path alike, including
     src/features/part47-50.js and the og_trace goldens)
   Prints `commit <short> <rule>`, `blob <short> <path>:<line> <rule>` or `path <path> <rule>`: never a value, never a line,
   never a zone or an address. Exit 1 on any finding.
   node tools/scan_history.mjs [--range <rev-range>] [--json]
   --range limits the commit, path and blob checks to what <rev-range> adds (the pre-push hook passes remote..local, so
   contributors' merged commits already on the remote are not re-judged); without it, everything reachable from any ref. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { textHits, fileRules, imageMeta, PRIVATE } from './scan_secrets.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const ARGV = process.argv.slice(2);
const JSON_OUT = ARGV.includes('--json');
const RANGE = ARGV.includes('--range') ? ARGV[ARGV.indexOf('--range') + 1] : null;
const git = (args, opts = {}) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const OKMAIL = /(?:^|@)(?:dinglecraft\.invalid|users\.noreply\.github\.com|noreply\.github\.com)$|^noreply@(?:github|anthropic)\.com$/i;

/* the people line of a commit or tag: "<who> Name <email> <epoch> <zone>"; checked here, never printed */
export function identProblems(line) {
  const m = /^(?:author|committer|tagger) .*<([^>]*)> (\d+) ([+-]\d{4})$/.exec(line);
  if (!m) return ['ident-unparsed'];
  const out = [];
  if (!OKMAIL.test(m[1])) out.push('ident-email');
  if (m[3] !== '+0000') out.push('ident-timezone');
  return out;
}

function main() {
  try { git(['rev-parse', '--git-dir']); } catch { console.error('scan_history: not a git repository'); process.exit(2); }
  const findings = [];
  const add = (kind, where, rule) => findings.push({ kind, where, rule });

  /* refs (the whole-history mode only) */
  const refs = RANGE ? [] : git(['for-each-ref', '--format=%(objecttype) %(objectname) %(refname)']).split('\n').filter(Boolean);
  for (const r of refs) { const [type, sha, name] = r.split(' ');
    for (const [rule] of textHits(name)) add('ref', name, rule);
    if (type === 'tag') { const raw = git(['cat-file', 'tag', sha]); const tl = raw.split('\n').find((l) => l.startsWith('tagger '));
      if (tl) for (const p of identProblems(tl)) add('tag', name, p);
      for (const l of raw.split('\n\n').slice(1).join('\n\n').split('\n')) for (const [rule] of textHits(l)) add('tag', name, 'message ' + rule); } }

  /* commits */
  const commits = git(['rev-list', ...(RANGE ? [RANGE] : ['--all'])]).split('\n').filter(Boolean);
  for (const c of commits) {
    const raw = git(['cat-file', 'commit', c]);
    const cut = raw.indexOf('\n\n'), head = raw.slice(0, cut < 0 ? raw.length : cut).split('\n'), msg = cut < 0 ? '' : raw.slice(cut + 2);
    /* an edit made on github.com (its committer is GitHub itself): the owner accepts its local time zone and GitHub's
       own web-flow signature (2026-10-09); its email must still be a noreply address */
    const web = head.some((l) => /^committer GitHub <noreply@github\.com> \d+ [+-]\d{4}$/.test(l));
    for (const l of head) {
      if (/^(author|committer) /.test(l)) for (const p of identProblems(l)) { if (web && p === 'ident-timezone') continue; add('commit', c.slice(0, 7), l.split(' ')[0] + ' ' + p); }
      if (/^(gpgsig|gpgsig-sha256|mergetag) /.test(l) && !web) add('commit', c.slice(0, 7), 'signature-header');
    }
    msg.split('\n').forEach((l) => { for (const [rule] of textHits(l)) add('commit', c.slice(0, 7), 'message ' + rule); });
  }

  /* every object reachable from any ref: paths and blobs */
  const objs = git(['rev-list', '--objects', ...(RANGE ? [RANGE] : ['--all'])]).split('\n').filter(Boolean).map((l) => { const i = l.indexOf(' '); return i < 0 ? [l, ''] : [l.slice(0, i), l.slice(i + 1)]; });
  const paths = new Set(), blobPaths = new Map();
  for (const [sha, p] of objs) if (p) { paths.add(p); if (!blobPaths.has(sha)) blobPaths.set(sha, new Set()); blobPaths.get(sha).add(p); }
  for (const p of paths) { for (const [rule] of textHits(p)) add('path', p, rule); for (const r of fileRules(p, 0)) add('path', p, r); }
  const shas = [...blobPaths.keys()];
  const check = spawnSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], { cwd: REPO, input: shas.join('\n') + '\n', encoding: 'utf8', maxBuffer: 1 << 28 });
  const blobs = check.stdout.split('\n').filter(Boolean).map((l) => l.split(' ')).filter(([, t]) => t === 'blob');
  let nText = 0, nBin = 0, bytes = 0;
  for (let i = 0; i < blobs.length; i += 200) {
    const batch = blobs.slice(i, i + 200);
    const r = spawnSync('git', ['cat-file', '--batch'], { cwd: REPO, input: batch.map(([s]) => s).join('\n') + '\n', maxBuffer: 1 << 30 });
    const buf = r.stdout; let p = 0;
    for (const [sha] of batch) {
      const nl = buf.indexOf(10, p); const [, , size] = buf.toString('latin1', p, nl).split(' '); const n = Number(size);
      const data = buf.subarray(nl + 1, nl + 1 + n); p = nl + 1 + n + 1; bytes += n;
      const where = [...blobPaths.get(sha)][0];
      for (const m of imageMeta(data)) add('blob', sha.slice(0, 10) + ' ' + where, m);
      if (data.subarray(0, 8192).includes(0)) { nBin++; continue; }
      nText++;
      data.toString('utf8').split('\n').forEach((l, k) => { for (const [rule] of textHits(l)) add('blob', sha.slice(0, 10) + ' ' + where + ':' + (k + 1), rule); });
    }
  }

  const uniq = [...new Map(findings.map((f) => [f.kind + '|' + f.where + '|' + f.rule, f])).values()];
  if (JSON_OUT) { console.log(JSON.stringify({ refs: refs.length, commits: commits.length, paths: paths.size, blobs: blobs.length, text: nText, binary: nBin, privateTerms: PRIVATE.count, findings: uniq }, null, 1)); process.exit(uniq.length ? 1 : 0); }
  console.log(`scan_history: ${refs.length} refs, ${commits.length} commits, ${paths.size} paths, ${blobs.length} blobs (${(bytes / 1e6).toFixed(1)} MB: text ${nText}, binary ${nBin})`);
  console.log(`  private terms: ${PRIVATE.count ? PRIVATE.count + ' (from ' + PRIVATE.sources.join(', ') + '; never printed)' : 'none (no local list; the generic rules still run)'}`);
  for (const f of uniq.slice(0, 200)) console.log(`FAIL  ${f.kind} ${f.where}  ${f.rule}`);
  if (uniq.length > 200) console.log(`  ... ${uniq.length - 200} more`);
  console.log(`scan_history: ${uniq.length ? uniq.length + ' finding(s): FAIL (fix, then rewrite the history before any push: docs/RELEASING.md)' : '0 findings: OK'}`);
  process.exit(uniq.length ? 1 : 0);
}

const isMain = (() => { try { return !!process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main();
