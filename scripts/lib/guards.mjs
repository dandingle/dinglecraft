// Section size guards (scripts/guards.json), ported from the legacy release gate's node one-liners.
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from './paths.mjs';

export function loadGuards(repo = REPO) {
  return JSON.parse(fs.readFileSync(path.join(repo, 'scripts', 'guards.json'), 'utf8'));
}

/** Measure one section in a game.js string: bytes, or -1 when a required section is missing/misplaced. */
export function measureSection(s, g) {
  const a = s.indexOf(g.from), b = s.indexOf(g.to);
  if (g.mode === 'optional') return a < 0 ? 0 : Buffer.byteLength(s.slice(a, b < 0 ? s.length : b));
  if (a < 0 || b < a) return -1;
  if (g.lastIndexOf && s.lastIndexOf(g.lastIndexOf, b) < a) return -1;
  return Buffer.byteLength(s.slice(a, b));
}

/** Run every section guard. Returns [{ name, bytes, cap, ok, msg }]. */
export function runSectionGuards(gameText, guards = loadGuards()) {
  return guards.sections.map((g) => {
    const bytes = measureSection(gameText, g);
    const ok = bytes >= 0 && bytes <= g.cap;
    const msg = ok ? `${g.name}: ${bytes} B (cap ${g.cap})`
      : bytes < 0 ? `${g.name} missing or misplaced${g.note ? ' (' + g.note + ')' : ''}`
      : `${g.name} too big: ${bytes} > ${g.cap}`;
    return { name: g.name, bytes, cap: g.cap, ok, msg };
  });
}
