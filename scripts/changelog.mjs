#!/usr/bin/env node
// Regenerate CHANGELOG.md from the in-game patch notes:   npm run changelog
//   --check    exit 1 (and write nothing) when CHANGELOG.md is out of date; the gate runs this
//   --stdout   print the generated file instead of writing it
//
// Source of truth: PATCH_LOG in src/ui/p28_patch_notes.js, evaluated in a sandbox (scripts/lib/version.mjs readPatchLog).
// Only RELEASED versions are listed: an entry appears once its version is at or below the newest version recorded in
// tests/fixtures/shipped.json. So `npm run bump` and work-in-progress patch notes never make CHANGELOG.md stale;
// `npm run release` records the version and then runs this script, which adds the new entry.
// Release dates come from shipped.json where it has one (v5.9 onwards).
//
// Two hand-written blocks are kept as they are on every run (edit them freely, keep the marker lines):
//   <!-- manual --> ... <!-- /manual -->              the note at the top (Release 1.0 and the v6.3 repository split)
//   <!-- manual:older --> ... <!-- /manual:older -->  the summary of versions older than the in-game archive (v2.10)
// Everything else in CHANGELOG.md is generated: edit PATCH_LOG, not this file's output.
import fs from 'node:fs';
import path from 'node:path';
import { REPO, FIX } from './lib/paths.mjs';
import { readVersion, cmpVersion, readPatchLog } from './lib/version.mjs';

const OUT_FILE = path.join(REPO, 'CHANGELOG.md');
const args = new Set(process.argv.slice(2));
for (const a of args) if (!['--check', '--stdout'].includes(a)) { console.error('changelog: unknown option ' + a); process.exit(2); }

const DEFAULT_TOP = [
  '> **Release 1.0 (game versions 6.4 to 6.8).** The first public release, and the first one built in this repository. 6.4 was',
  '> the preview: Puppet Purgatory\'s new cast, the game\'s own names, models and textures in several other places (old worlds',
  '> load with the new names), a redesigned title screen and a UI Scale setting. 6.5 and 6.6 were cuts of the title panorama.',
  '> 6.7 completes it: game rules on Create New World, a per-world rules editor, Export World in the pause menu, new sliders,',
  '> your own name, menu music, offline play and a few rare finds. 6.8, the final cut, trims the horror. Each cut has its',
  '> own entry below.',
  '>',
  '> **The move into this repository (v6.3, 2026-10-08).** DINGLECRAFT moved out of its old "splice" build pipeline into this',
  '> repository: per-system source files in `src/` and `html/`, the Hyperreal art as individual WebP files in',
  '> `assets/packed/`, and a Node-only build (`npm run build`) and test gate (`npm run gate`). The build reproduced the shipped',
  '> `dinglecraft_v6.3.html` byte for byte (md5 `e0d781ad02350580f027d9452ba67e28`), so nothing about the game changed in',
  '> the move. See `docs/PARITY.md` for the proof.',
].join('\n');

const DEFAULT_OLDER = [
  '## Before v2.10',
  '',
  'The in-game archive starts at v2.10. The earlier releases, in short:',
  '',
  '- **v1.0 to v1.6:** the core sandbox, then weapons and guns, cars, doors, skateboards and tricks, disasters and the stock',
  '  market (the PC block), then aliens, villages, romance dialogues and the mob-catching jars.',
  '- **v1.7:** THE DINGLE CASINO (slots and blackjack) and profit and loss for every stock.',
  '- **v1.8:** roller coasters, generated theme parks, and disasters you can make permanent and pick yourself.',
  '- **v1.9:** egg-summoned mega-dungeons, mob spawners, XP, enchanting and the Warden. **v1.9.1:** beds, darker nights,',
  '  fullbright.',
  '- **v2.0:** flowing water, climbing out of water, the surf ollie, inventory sort, the death marker, armour, boats,',
  '  tameable rideable dragons, buried dungeons and spawner vaults, the DINGLE STORE (DingleBucks, hats, trails and joke',
  '  items), six superpowers, Dragon King roosts and the summonable Stone Titan.',
  '- **v2.1:** the first MALGORATH: a fixed arena at X 1000, Z 1000, a letterboxed cutscene, a three-phase fight and the',
  '  YOU WIN screen. (He was rebuilt from scratch in v6.3.)',
  '- **v2.2:** the structure compass. **v2.2.1:** render distance up to 32.',
  '- **v2.3:** spawn eggs for every mob, and the walking nukes (Nuke Kegs since Release 1.0). **v2.3.1:** the debug menu and per-world game rules.',
  '- **v2.4 to v2.9:** not recorded here.',
].join('\n');

/** Pull a hand-written block out of the existing file (null when it is missing). */
function manualBlock(text, name) {
  const open = name ? `<!-- manual:${name} -->` : '<!-- manual -->';
  const close = name ? `<!-- /manual:${name} -->` : '<!-- /manual -->';
  const a = text.indexOf(open);
  const b = a < 0 ? -1 : text.indexOf(close, a + open.length);
  if (a < 0 || b < 0) return null;
  return text.slice(a + open.length, b).replace(/^\n+|\n+$/g, '');
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
/** In-game patch lines are HTML (renderPatch uses innerHTML). Turn one into a safe single line of Markdown. */
function toMarkdown(html) {
  let s = String(html)
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<\s*(b|strong)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, '\u0001$2\u0001')
    .replace(/<\s*(i|em)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, '\u0002$2\u0002');
  s = s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return Object.prototype.hasOwnProperty.call(ENTITIES, e.toLowerCase()) ? ENTITIES[e.toLowerCase()] : m;
  });
  s = s.replace(/\s+/g, ' ').trim()
    .replace(/\\/g, '\\\\').replace(/\*/g, '\\*').replace(/`/g, '\\`')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(^|[^A-Za-z0-9])_|_(?=$|[^A-Za-z0-9])/g, (m) => m.replace('_', '\\_'))
    .replace(/^([#+-])(?=\s|$)/, '\\$1')
    .replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2');
  return s.replace(/\u0001/g, '**').replace(/\u0002/g, '*');
}

function generate(existing) {
  const ver = readVersion(REPO);
  const shipped = JSON.parse(fs.readFileSync(path.join(FIX, 'shipped.json'), 'utf8')).shipped || {};
  const versions = Object.keys(shipped).sort(cmpVersion);
  if (!versions.length) throw new Error('tests/fixtures/shipped.json lists no shipped version');
  const newest = versions[versions.length - 1];
  const log = readPatchLog(REPO, ver);
  const seen = new Set();
  const out = [];
  out.push('# DINGLECRAFT changelog', '');
  out.push('Every release\'s patch notes, newest first. This file is generated from',
    '`PATCH_LOG` in `src/ui/p28_patch_notes.js` by `npm run changelog`: change the patch notes there, never here.',
    'A version appears once `npm run release` has recorded it in `tests/fixtures/shipped.json`.', '');
  out.push('<!-- manual -->', manualBlock(existing, null) ?? DEFAULT_TOP, '<!-- /manual -->', '');
  out.push('<!-- generated from PATCH_LOG: do not edit below this line (up to the next manual block) -->', '');
  let listed = 0;
  for (const e of log) {
    if (!e || typeof e.v !== 'string' || !/^\d+\.\d+$/.test(e.v)) throw new Error('PATCH_LOG entry with a bad version: ' + JSON.stringify(e && e.v));
    if (seen.has(e.v)) throw new Error('PATCH_LOG lists v' + e.v + ' twice');
    seen.add(e.v);
    if (cmpVersion(e.v, newest) > 0) continue; // not released yet
    if (typeof e.title !== 'string' || !Array.isArray(e.lines)) throw new Error('PATCH_LOG v' + e.v + ': needs a title and lines');
    /* a labelled entry: "Label — Title", or just the title when it already starts with the label ("Release 1.0 (second cut)") */
    const head = !e.label ? `v${e.v} — ${toMarkdown(e.title)}` : e.title.startsWith(e.label) ? toMarkdown(e.title) : `${toMarkdown(e.label)} — ${toMarkdown(e.title)}`;
    out.push('## ' + head, '');
    const when = shipped[e.v] && shipped[e.v].date ? `released ${shipped[e.v].date}` : '';
    if (e.label) out.push(`*Game version ${e.v}${when ? ', ' + when : ''}.*`, '');
    else if (when) out.push(`*Released ${shipped[e.v].date}.*`, '');
    for (const l of e.lines) out.push('- ' + toMarkdown(l));
    out.push('');
    listed++;
  }
  if (!listed) throw new Error('no released PATCH_LOG entries found');
  out.push('<!-- manual:older -->', manualBlock(existing, 'older') ?? DEFAULT_OLDER, '<!-- /manual:older -->', '');
  return out.join('\n');
}

let existing = '';
try { existing = fs.readFileSync(OUT_FILE, 'utf8'); } catch { /* first run */ }
let text;
try { text = generate(existing); } catch (e) { console.error('changelog: ' + (e && e.message ? e.message : e)); process.exit(1); }

if (args.has('--stdout')) { process.stdout.write(text); process.exit(0); }
if (args.has('--check')) {
  if (existing === text) { console.log('changelog: CHANGELOG.md is up to date'); process.exit(0); }
  console.log('changelog: CHANGELOG.md is stale: run npm run changelog (FAIL)');
  process.exit(1);
}
if (existing === text) { console.log('changelog: CHANGELOG.md already up to date'); process.exit(0); }
const tmp = OUT_FILE + '.tmp';
fs.writeFileSync(tmp, text);
fs.renameSync(tmp, OUT_FILE);
console.log('changelog: wrote CHANGELOG.md');
