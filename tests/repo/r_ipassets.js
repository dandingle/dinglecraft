// r_ipassets: the Release 1.0 image clean-up holds. node tests/repo/r_ipassets.js
// tests/fixtures/ip_denylist.json (written by the HR lane from the untouched v6.3 pack) lists every packed WebP of an id Release 1.0
// removed (the likeness faces, the costume textures, the creeper and villager faces), the two renamed ids and the recoloured /
// painted-out ones. The renamed creeper core (boomer_core) was repainted from scratch, so its v6.3 maps are in removed[] too. Checks: no removed or renamed-away id is packed (manifest, files, the build's hrassets.js keys) or named in any
// code or data file; no packed or embedded WebP has a removed image's sha1/sha256 (the old art cannot come back under a new name);
// the new ids (face_boomer, boomer_core, pgface_blank) are packed; every recoloured id is still packed with its listed maps new; the
// pack matches the models (every packed entity id is quoted by a model, every texture a model asks for is packed or a known
// fallback); the pack headers name no legacy path. Ids that spell an old character are ROT13 in the fixture and in this file.
// Prints check names only; last line "N passed, M failed".
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const P = require('../lib/paths.js');
const R = require('../lib/repo_files.js');
const B = require('../lib/ipban.js');

let pass = 0, fail = 0;
function ok(n, c) { if (c) pass++; else { fail++; console.log('FAIL ' + n); } return !!c; }
const h1 = (b) => crypto.createHash('sha1').update(b).digest('hex'), h256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const r13 = B.r13;
const show = (a) => a.slice(0, 8).join(' ') + (a.length > 8 ? ' ... (' + a.length + ')' : '');
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };

const DL = readJ(P.FIX + 'ip_denylist.json');
ok('tests/fixtures/ip_denylist.json parses (removed, renamed, changed, removedIds13)', !!DL && Array.isArray(DL.removed) && Array.isArray(DL.renamed) &&
  Array.isArray(DL.changed) && Array.isArray(DL.removedIds13));
if (!DL) { console.log(pass + ' passed, ' + fail + ' failed'); process.exit(1); }
const REMOVED = [...new Set(DL.removedIds13.map(r13))];
const FROM = [...new Set(DL.renamed.map((x) => r13(x.from13)))], TO = [...new Set(DL.renamed.map((x) => x.to))];
const GONE = [...REMOVED, ...FROM];
/* the ids that must go (ROT13, like the denylist) */
const PLAN = ['snpr_ct_xrezvg', 'snpr_ct_cvttl', 'snpr_ct_uneel', 'ctsnpr_navzny', 'ctsnpr_sbmmvr', 'ctsnpr_tbamb', 'ctsnpr_purs', 'ctsnpr_fjrrghzf',
  'ctsnpr_ornxre', 'ctsnpr_ohafra', 'ctsnpr_yrj', 'ctsnpr_arjf', 'ctsnpr_fgngyre', 'ctsnpr_jnyqbes', 'ctsnpr_sebt', 'ctzng_jvt', 'ctzng_tbja',
  'ctrag_tybir', 'ctzng_jvyqunve', 'ctrag_objy', 'snpr_perrcre', 'snpr_ivyyntre', 'urnq_ivyyntre_fvqr'].map(r13);
const lackPlan = PLAN.filter((i) => !REMOVED.includes(i));
ok('the denylist covers every id the plan removes (' + PLAN.length + ' ids; it holds ' + REMOVED.length + ')' + (lackPlan.length ? ' (missing ' + lackPlan.length + ')' : ''), lackPlan.length === 0);
ok('every removed id has its v6.3 maps listed with sha1 and sha256', REMOVED.every((i) => DL.removed.some((x) => r13(x.id13) === i)) &&
  DL.removed.every((x) => /^[0-9a-f]{40}$/.test(x.sha1) && /^[0-9a-f]{64}$/.test(x.sha256)));
ok('renamed: the creeper core and the blank face move to boomer_core and pgface_blank', FROM.length === 2 && ['boomer_core', 'pgface_blank'].every((t) => TO.includes(t)));
const CHG = ['e:tee_dan', 'e:jog_dan', 'e:tee_zombie', 'e:jog_zombie', 'e:pgface_feltdan', 'e:fist_pg', 't:pg_can_s'];   /* pg_can_t is the lid top: it never had eyes */
ok('changed: Dan and zombie clothes, Felt Dan, the felt fist and the Bin side tile are listed', CHG.every((k) => DL.changed.some((x) => x.kind + ':' + x.id === k)));

/* ---- the pack ---- */
const MAN = readJ(P.PACKED + 'hr/manifest.json') || {};
const ent = (MAN.coverage && MAN.coverage.entIds) || [], keys = Object.keys(MAN.keys || {}), srcs = Object.keys(MAN.sources || {});
const webps = R.list().filter((f) => f.startsWith('assets/packed/') && f.endsWith('.webp'));
const hashes = new Map(webps.map((f) => { const b = fs.readFileSync(path.join(P.REPO, f)); return [f, { s1: h1(b), s2: h256(b) }]; }));
ok('the Hyperreal pack is there (manifest, ' + webps.length + ' WebP files)', ent.length > 50 && webps.length > 400);
const idOfKey = (k) => k.replace(/^[a-z]:/, '').replace(/\|[a-z]+$/, ''), idOfFile = (f) => path.basename(f).replace(/\.[a-z]+\.webp$/, '');
const packedGone = GONE.filter((i) => ent.includes(i) || keys.some((k) => idOfKey(k) === i) || srcs.some((k) => idOfKey(k) === i) || webps.some((f) => idOfFile(f) === i));
ok('no removed or renamed-away id is packed (manifest entIds, keys, sources, files)' + (packedGone.length ? ' (' + packedGone.length + ' still packed)' : ''), packedGone.length === 0);
const bad1 = new Set(DL.removed.map((x) => x.sha1)), bad2 = new Set(DL.removed.map((x) => x.sha256));
const back = [...hashes].filter(([, h]) => bad1.has(h.s1) || bad2.has(h.s2)).map(([f]) => f);
ok('no packed WebP is a removed image under any name (sha1 / sha256 denylist, ' + bad1.size + ' images)' + (back.length ? ' (' + back.length + ' match)' : ''), back.length === 0 && bad1.size >= 48);
{ const core = DL.renamed.filter((x) => x.to === 'boomer_core');
  const listed = core.length === 2 && core.every((x) => bad1.has(x.sha1) && bad2.has(x.sha256));
  const fresh = ['b', 'n'].every((m) => { const h = hashes.get('assets/packed/hr/e/boomer_core.' + m + '.webp'); return !!h && !core.some((x) => x.sha1 === h.s1); });
  ok('the old creeper core is denylisted (both v6.3 maps in removed[]) and boomer_core is a repaint, not the old sac', listed && fresh); }

/* ---- the shipped build's hrassets.js: keys and embedded payloads ---- */
const HA = fs.existsSync(P.BUILD + 'hrassets.js') ? fs.readFileSync(P.BUILD + 'hrassets.js', 'utf8') : '';
ok('the build carries hrassets.js', HA.length > 1e6);
{ const bk = [...HA.matchAll(/"([a-z]:[A-Za-z0-9_\-]+)(?:\|[a-z]+)?":"data:image\/webp;base64,/g)].map((m) => idOfKey(m[1]));
  const inB = GONE.filter((i) => bk.includes(i));
  ok('no removed or renamed-away id is embedded in the build (hrassets.js keys, ' + bk.length + ' payloads)' + (inB.length ? ' (' + inB.length + ' are)' : ''), bk.length > 400 && inB.length === 0);
  let n = 0, m = 0; for (const x of HA.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)) { n++; const b = Buffer.from(x[1], 'base64'); if (bad1.has(h1(b)) || bad2.has(h256(b))) m++; }
  ok('no image embedded in the build is a removed image (' + n + ' payloads hashed, ' + m + ' match)', n > 400 && m === 0); }

/* ---- the new ids, the recolours ---- */
const lackNew = ['face_boomer', ...TO].filter((i) => !ent.includes(i));
ok('the new ids are packed: face_boomer (re-cut), boomer_core, pgface_blank' + (lackNew.length ? ' (missing: ' + lackNew.join(' ') + ')' : ''), lackNew.length === 0);
{ const stale = [], gone = [];
  for (const x of DL.changed) {
    const f = 'assets/packed/hr/' + x.kind + '/' + x.id + '.' + x.map + '.webp', h = hashes.get(f);
    if (!h) { gone.push(x.kind + ':' + x.id + '|' + x.map); continue; }
    /* every listed map must change (the fixture lists a normal map only where the relief was repainted: a pure recolour keeps its normal) */
    if (h.s1 === x.sha1) stale.push(x.kind + ':' + x.id + '|' + x.map); }
  ok('every recoloured or painted-out id is still packed' + (gone.length ? ' (missing: ' + show(gone) + ')' : ''), gone.length === 0);
  ok('...and every listed map is new (colour maps; the normal maps where the relief was repainted)' + (stale.length ? ' (unchanged: ' + show(stale) + ')' : ''), stale.length === 0); }

/* ---- the models match the pack ---- */
const MD = P.SRC.models;
const mfiles = fs.readdirSync(MD).filter((f) => f.endsWith('.js'));
const quoted = new Set(), asked = new Set();
for (const f of mfiles) { const s = fs.readFileSync(MD + f, 'utf8');
  for (const m of s.matchAll(/['"]([a-z][a-z0-9_]*)['"]/g)) quoted.add(m[1]);
  for (const m of s.matchAll(/(?:HR\.mat|hmat|texUrl|texURL)\(\s*['"]([a-z][a-z0-9_]*)['"]/g)) asked.add(m[1]); }
const deadPacked = ent.filter((i) => !quoted.has(i));
ok('every packed entity texture is quoted by a model (a removed literal drops out of the pack at the next repack)' + (deadPacked.length ? ' (not quoted: ' + show(deadPacked) + ')' : ''), deadPacked.length === 0);
const noTex = ((MAN.coverage && MAN.coverage.modelIdsWithoutTexture) || []);
const unknown = [...asked].filter((i) => !ent.includes(i) && !noTex.includes(i));
ok('every texture a model asks for (HR.mat / hmat / texURL) is packed or a known painted/flat fallback' + (unknown.length ? ' (' + show(unknown) + ')' : ''), unknown.length === 0);

/* ---- nothing names a removed id any more (code and data; the docs may tell the story) ---- */
{ const re = new RegExp('(?<![A-Za-z0-9_])(?:' + GONE.join('|') + ')(?![A-Za-z0-9_])'), where = [];
  for (const f of R.list()) {
    if (!/^(?:src|tools|assets|html|brain|tests|scripts)\//.test(f) || R.BIN_EXT.test(f) || f === 'tests/fixtures/ip_denylist.json') continue;
    const t = B.mask(fs.readFileSync(path.join(P.REPO, f), 'utf8'));
    if (re.test(t)) where.push(f); }
  const G = fs.existsSync(P.BUILD + 'game.js') ? fs.readFileSync(P.BUILD + 'game.js', 'utf8') : '';
  ok('no code or data file names a removed or renamed-away texture id' + (where.length ? ' (' + show(where) + ')' : ''), where.length === 0);
  ok('the build game.js names none either (hrFace options, model literals)', G.length > 0 && !re.test(B.mask(G))); }

/* ---- the pack headers ---- */
{ const heads = ['assets/packed/hr/header.txt', 'assets/packed/mg/header.txt'].map((f) => fs.existsSync(P.REPO + f) ? fs.readFileSync(P.REPO + f, 'utf8') : '');
  const l0 = HA.slice(0, HA.indexOf('\n'));
  ok('the pack headers (and the build) name no legacy dev/ path for the packers', heads.every((h) => h.length && !/\bdev\//.test(h)) && !/\bdev\//.test(l0)); }

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
