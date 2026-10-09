// r_other_ip: the other third-party IP fixes of Release 1.0, on the build. node tests/repo/r_other_ip.js
// The creeper is the Nuke Keg (no creeper face painter, keg egg names, "Boomer" everywhere a player reads a mob name); made-up stock
// symbols only (the real tickers live on solely in the save-migration table STOX_OLD); Fortune Orb, Critter Jar, DEEP DIRT 2D,
// ASTEROID ALLEY, Skyhoney, "the World-Eater"; the Hyperreal villager is gone; Dan's outfit is no longer the classic cyan/indigo;
// no local media path or /media route; the CC-BY meshes are credited in THIRD_PARTY.md and in the help screen, the snail mesh
// is re-modelled and never credited (v6.8 cut the other two secret-content meshes, 'watcher' and 'reaper', with those events). "UI strings" are string literals that contain a space or start with a
// capital letter (key-like strings such as 'creeper' bot-input aliases stay legal), the help/shell HTML and the patch notes.
// Boots the build once (hr_boot) for the tables. Prints check names only; last line "N passed, M failed".
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const boot = require('../lib/hr_boot.js');
const P = require('../lib/paths.js');
const J = require('../lib/jsprose.js');
const B = require('../lib/ipban.js');
const { ok } = boot;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const r13 = B.r13;

/* ---- the build (all of game.js) ---- */
const G = fs.existsSync(P.BUILD + 'game.js') ? fs.readFileSync(P.BUILD + 'game.js', 'utf8') : '';
const HEAD = fs.existsSync(P.BUILD + 'head.html') ? fs.readFileSync(P.BUILD + 'head.html', 'utf8') : '';
const readRepo = (rel) => fs.existsSync(P.REPO + rel) ? fs.readFileSync(P.REPO + rel, 'utf8') : '';
const PROMPTS = readRepo('brain/prompts.mjs'), BRAIN = readRepo('brain/dingle-brain.mjs'), TP = readRepo('THIRD_PARTY.md');
/* every string literal of a JS text, unquoted (template chunks included) */
const lits = (src) => { try { return J.strings(src).map((t) => t.s.slice(1, t.s.endsWith('${') ? -2 : -1)); } catch (e) { return null; } };
const GL = lits(B.mask(G)) || [], PL = lits(PROMPTS) || [];
const ui = (s) => / /.test(s) || /^[A-Z]/.test(s);
const HEADTXT = HEAD.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script>[\s\S]*?<\/script>/gi, ' ')   /* the inlined third-party three.js (assets/vendor) */.replace(/data:[^"')\s]+/g, ' ');

const V = boot({});
boot.run(async () => {
  ok('the build is there (build/game.js and head.html)', G.length > 0 && HEAD.length > 0);
  ok('the string lexer reads the build game.js and brain/prompts.mjs', GL.length > 1000 && PL.length > 10);
  const PATCH = (V.PATCH_LOG || []).map((e) => [e.title || '', ...(e.lines || [])].join('\n')).join('\n');
  /* where a UI string can live: game.js string literals that look like text, brain prompts, the help and shell html, the patch notes */
  const uiHits = (re) => { const out = [];
    for (const s of GL) if (ui(s) && re.test(s)) out.push('game.js'); for (const s of PL) if (ui(s) && re.test(s)) out.push('prompts.mjs');
    if (re.test(HEADTXT)) out.push('head.html'); if (re.test(PATCH)) out.push('PATCH_LOG');
    const c = {}; for (const w of out) c[w] = (c[w] || 0) + 1; return Object.entries(c).map(([w, n]) => w + ' x' + n).join(', '); };

  /* ===== A1/A4: the creeper is the Nuke Keg ===== */
  { let triple = 0; for (let i = G.indexOf('fillRect(6,8,4,4)'); i >= 0; i = G.indexOf('fillRect(6,8,4,4)', i + 1)) {
      const w = G.slice(Math.max(0, i - 400), i + 400); if (w.includes('fillRect(2,4,4,4)') && w.includes('fillRect(10,4,4,4)')) triple++; }
    ok('no face painter draws the classic creeper face (the eye, eye and nose rects together)', triple === 0); }
  const eggs = Object.keys(V.DEFS).map(Number).filter((i) => V.DEFS[i] && V.DEFS[i].egg);
  const eggName = (mt) => { const i = eggs.find((k) => V.DEFS[k].egg === mt); return i == null ? null : V.DEFS[i].name; };
  ok('the nuke eggs are "Nuke Keg" and "Armed Nuke Keg" (MOBT.creep / nuker keep their ids)', eggName('creep') === 'Nuke Keg Spawn Egg' && eggName('nuker') === 'Armed Nuke Keg Spawn Egg' && !!V.MOBT.creep && !!V.MOBT.nuker);
  { const MN = V.pgCore ? V.pgCore().MOB_NAME : null;
    ok('MOB_NAME.boomer is "Boomer" (bot chat, death messages)', !!MN && MN.boomer === 'Boomer'); }
  { const h = uiHits(/\bcreepers?\b/i);
    ok('no UI string, help row, bot prompt or patch note says creeper (the bot INPUT alias keys may)' + (h ? ' (' + h + ')' : ''), !h); }

  /* ===== F1: made-up stocks only ===== */
  ok('STOX: eight made-up symbols, each 6+ capital letters, unique', Array.isArray(V.STOX) && V.STOX.length === 8 && V.STOX.every((s) => /^[A-Z]{6,}$/.test(s)) && new Set(V.STOX).size === 8);
  { const OLD = ['NNCY', 'ZFSG', 'AIQN', 'GFYN', 'NZMA', 'TBBT', 'ZRGN', 'ASYK'].map(r13);     /* the v6.3 tickers (real companies), ROT13 here */
    const re = new RegExp('\\b(?:' + OLD.join('|') + ')\\b');
    const lines = G.split('\n'); let mig = 0, other = [];
    lines.forEach((l, i) => { if (!re.test(l)) return; if (/^const STOX_OLD=/.test(l)) mig++; else other.push(i + 1); });
    ok('the real tickers survive only in the save-migration table STOX_OLD (one line), nowhere else in the build, prompts or patch notes' +
      (other.length ? ' (game.js lines ' + other.slice(0, 5).join(' ') + ')' : ''), mig === 1 && other.length === 0 && !re.test(HEAD) && !re.test(PROMPTS) && !re.test(PATCH)); }

  /* ===== F2, B1, C1, E1, A8, F3, C2: the renamed things ===== */
  { const d = V.DEFS[V.IT.M8BALL];
    ok('the Fortune Orb: id 281, gadget m8, named "Fortune Orb"', V.IT.M8BALL === 281 && !!d && d.gadget === 'm8' && d.name === 'Fortune Orb'); }
  { const a = V.DEFS[V.IT.BALL], b = V.DEFS[V.IT.BALLF];
    ok('the Critter Jar: ids 195/196 keep ball:true and are named "Critter Jar..."', V.IT.BALL === 195 && V.IT.BALLF === 196 && !!a && !!b && a.ball && b.ball &&
      /^Critter Jar/.test(a.name) && /^Critter Jar/.test(b.name)); }
  const GONE = [['DIRTARIA', /dirtaria/i], ['DINGLE WARS', /dingle wars|a new dirt\b/i], ['the 8-ball', /magic ?8|\b8-?ball\b/i], ['Ambrosium', /ambrosium/i],
    ['"legally distinct"', /legally distinct/i], ['"the classic mod"', /classic mod/i], ['Formica', /formica/i], ['Ping-Pong', /ping-?pong/i],
    ['the capture ball', /capture ball|pok[eé] ?ball/i], ['"Eater of Worlds"', /eater of worlds/i]];
  for (const [n, re] of GONE) { const h = uiHits(re); ok('no ' + n + ' in UI strings, help, prompts or patch notes' + (h ? ' (' + h + ')' : ''), !h); }
  ok('DEEP DIRT 2D is on the Gaming Rig and in the help', GL.some((s) => s.includes('DEEP DIRT 2D')) && HEADTXT.includes('DEEP DIRT 2D'));
  ok('the cinema shows ASTEROID ALLEY', GL.some((s) => s.includes('ASTEROID ALLEY')));
  ok('the PART 1 header no longer claims all art is procedural; it says inspired by Minecraft, not affiliated', !/procedurally generated art/i.test(G) && /not affiliated with Mojang/i.test(G));

  /* ===== A5: no Hyperreal villager; A2: the boomer model ===== */
  { const E = V.hrEnt || {};
    ok('HR_MOB: aliens are unmapped (OG alien in Hyperreal), no villager; boomers use the boomer model', !!E.HR_MOB && !('alien' in E.HR_MOB) && !Object.values(E.HR_MOB).includes('villager') && E.HR_MOB.boomer === 'boomer');
    ok('HR_CAST names no creeper and no villager model', Array.isArray(E.HR_CAST) && !E.HR_CAST.includes('creeper') && !E.HR_CAST.includes('villager') && E.HR_CAST.includes('boomer')); }

  /* ===== A6: Dan's outfit ===== */
  { const old = /(?:0x|#)(?:3aa0d8|3a4a8a)\b/i, n = (G.match(new RegExp(old.source, 'gi')) || []).length + (HEAD.match(new RegExp(old.source, 'gi')) || []).length;
    ok('the classic cyan/indigo outfit colours are gone from the build (' + n + ' left)', n === 0);
    ok('Dan wears the new outfit (orange 0xd9822b, charcoal 0x34343a) in the OG player model', /0xd9822b/i.test(G) && /0x34343a/i.test(G)); }

  /* ===== section 7: local media paths and the /media route ===== */
  { const url = /file:\/\/\/?[A-Za-z~%]/g, home = /\/Us(?:ers)\/[A-Za-z0-9]/g;
    const out = (G.match(url) || []).length + (G.match(home) || []).length + (HEAD.match(url) || []).length + (HEAD.match(home) || []).length;
    ok('no file:// URL and no home-folder path in the build', out === 0);
    ok('the brain has no media route (no serveMedia, mediaList or /media/ path in brain/dingle-brain.mjs)', BRAIN.length > 1000 && !/serveMedia|mediaList|\/media\//.test(BRAIN)); }

  /* ===== section 8: the meshes and their credits ===== */
  { const i = G.indexOf('const WPN3D='), line = i >= 0 ? G.slice(i, G.indexOf('\n', i)) : '';
    let W = null; try { W = (new Function('return ' + line.slice('const WPN3D='.length).replace(/;\s*$/, '')))(); } catch (e) { W = null; }
    const ks = W ? Object.keys(W) : [];
    ok('WPN3D keeps its 14 keys in order (the frozen test.js pins 13 of them; v6.8 removed watcher and reaper)', ks.length === 14 &&
      ['pistol', 'shotgun', 'smg', 'sniper', 'bow', 'skate', 'gd_dj', 'gd_jet', 'gd_grap', 'gd_glide', 'gd_mag', 'gd_tramp', 'gd_pig', 'snail'].every((k, j) => ks[j] === k));
    /* sha256 of p|i of the v6.3 entries #14-#16 (snail, watcher, reaper: the meshes the horror features used): #14 is re-modelled,
       #15 and #16 were cut in v6.8; none of the three v6.3 geometries may ship again */
    const V63 = ['b679e313bf452a53a9b1729ca445b90d442c273fe7fb24ee61d9e5c057b1e7d3', 'c94313f46f9390e846a57f0576d615f307f71f196c69e7540a8d10a806810e78',
      '10d13b8013465d979690f6e30be561b62cd9c5dc30c6b18777cf2de767832f56'];
    const all = ks.map((k) => W[k] ? sha(W[k].p + '|' + W[k].i) : '');
    ok('WPN3D #14 (snail) is re-modelled and no entry ships a v6.3 #14-#16 geometry (' + V63.filter((h) => all.includes(h)).length + ' left)', !!all[13] && all[13] !== V63[0] && V63.every((h) => !all.includes(h)));
    ok('...and the re-model keeps the packing (n, p, i, v, pal); watcher and reaper are gone', !!ks[13] && ['n', 'p', 'i', 'v', 'pal'].every((f) => f in W[ks[13]]) && !ks.includes('watcher') && !ks.includes('reaper'));
    const CCBY = { skate: '7Dfn4VtTCWY', gd_dj: '7HbqG8RwRcA', gd_jet: '8VafbXInymc', gd_grap: 'fjAwIosTQHy', gd_glide: '4WmEAyjrvW5', gd_mag: 'dD2RIIea6WR', gd_tramp: '44njxNdC0gt' };
    const lack = Object.entries(CCBY).filter(([k, id]) => ks.includes(k) && !(TP.includes('`' + k + '`') && TP.includes('poly.pizza/m/' + id))).map(([k]) => k);
    ok('THIRD_PARTY.md credits every CC-BY 3.0 mesh still shipped (key, poly.pizza link)' + (lack.length ? ' (missing: ' + lack.join(' ') + ')' : ''), TP.length > 0 && lack.length === 0);
    ok('THIRD_PARTY.md gives the CC-BY 3.0 licence link, the modification note, Roman Miller for the Jetpack and Poly by Google for the rest',
      /creativecommons\.org\/licenses\/by\/3\.0/.test(TP) && /converted/i.test(TP) && /Roman Miller/.test(TP) && /Poly by Google/.test(TP));
    const secret = ['snail', 'watcher', 'reaper'];
    ok('THIRD_PARTY.md does not list the re-modelled snail mesh or the cut watcher and reaper meshes (by key)', TP.length > 0 && ks[13] === 'snail' && secret.every((k) => !new RegExp('\\b' + k + '\\b').test(TP)));
    ok('THIRD_PARTY.md credits three.js (MIT)', /three\.js/i.test(TP) && /\bMIT\b/.test(TP));
    ok('the help screen credits the Jetpack to Roman Miller', /Roman Miller/.test(HEADTXT)); }
});
