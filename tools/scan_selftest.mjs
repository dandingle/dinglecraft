#!/usr/bin/env node
/* Self-test for tools/scan_secrets.mjs: every rule fires on a synthetic sample, the usual false positives stay quiet, and
   the scanner's output never contains a matched value. Every fake value is assembled at runtime from fragments, so this
   file itself holds nothing key-shaped. Writes only to out/scan_selftest/ (gitignored) and removes it.
   node tools/scan_selftest.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { textHits, fileRules, imageMeta, compileTerms } from './scan_secrets.mjs';
import { identProblems } from './scan_history.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const j = (...p) => p.join('');
const rep = (c, n) => c.repeat(n);
let passed = 0, failed = 0;
const ok = (name, cond, detail) => { if (cond) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); } };
const NONE = [];                                          // no private terms: the generic rules alone
const rules = (line) => textHits(line, NONE).map(([r]) => r);

console.log('key-shaped values fire');
const samples = {
  'anthropic-key': j('x = "', 'sk-', 'ant-', 'api03-', rep('A', 40), '"'),
  'openai-key': j('k ', 'sk-', 'proj-', rep('b', 40)),
  'fal-key': j('FAL ', rep('a', 8), '-', rep('b', 4), '-', rep('c', 4), '-', rep('d', 4), '-', rep('e', 12), ':', rep('f', 32)),
  'elevenlabs-key': j('v ', 'sk', '_', rep('0a', 21)),
  'aws-access-key': j('id ', 'AK', 'IA', rep('Q', 16)),
  'github-token': j('t ', 'gh', 'p_', rep('Z', 36)),
  'google-api-key': j('g ', 'AI', 'za', rep('x', 35)),
  'slack-token': j('s ', 'xo', 'xb-', rep('1', 12)),
  'jwt': j('Bearer ', 'ey', 'J', rep('a', 12), '.', 'ey', 'J', rep('b', 12), '.', rep('c', 12)),
  'private-key': j('-----', 'BEGIN RSA ', 'PRIVATE KEY', '-----'),
  'secret-assignment': j('pass', 'word: "', 'hunter2', 'hunter2', '"'),
};
for (const [rule, line] of Object.entries(samples)) ok(rule, rules(line).includes(rule), rules(line).join(','));

console.log('privacy rules fire');
const priv = {
  'home-path-mac': j('see /', 'Users', '/someone/Documents/x'),
  'home-path-linux': j('cd /', 'home', '/someone/x'),
  'temp-path': j('/', 'private', '/tmp/abc'),
  'home-path-windows': j('C:', '\\', 'Users', '\\', 'someone'),
  'email': j('mail ', 'someone', '@', 'gmail', '.com'),
};
for (const [rule, line] of Object.entries(priv)) ok(rule, rules(line).includes(rule), rules(line).join(','));

console.log('private terms (a throwaway term made up at run time; the real list is local and never in git)');
const tok = 'zq' + Math.random().toString(36).slice(2, 8);
const T = compileTerms([tok + '-vault', 'Acme ' + tok, 're:' + tok + '\\d{3}']);
const th = (line) => textHits(line, T).map(([r]) => r);
ok('a literal term fires, case-insensitively', th('see the ' + tok.toUpperCase() + '-VAULT folder').includes('private-term#1'));
ok('a term with a space also fires as %20, "\\ " and _', ['Acme ', 'Acme%20', 'Acme\\ ', 'acme_'].every((p) => th('x/' + p + tok + '/y').includes('private-term#2')));
ok('a re: term fires as a regular expression', th('id ' + tok + '123').includes('private-term#3') && !th('id ' + tok + 'abc').includes('private-term#3'));
ok('rule names never carry the term', T.every(([n]) => !n.includes(tok)));
ok('a term split into string pieces still fires (the pieces joined with "" or "-")', [
  "x = '" + tok.slice(0, 3) + "' + '" + tok.slice(3) + "-vault';", "['" + tok + "', 'vault'].join('-')", 'j("' + tok + '", "-va", "ult")', "j('Acme', ' " + tok + "')"]
  .every((l, i) => th(l).includes(i === 3 ? 'private-term#2' : 'private-term#1')));
ok('without a list nothing extra fires', rules('see the ' + tok + '-vault folder').length === 0);
ok('a bad re: entry is reported, not thrown', compileTerms(['re:(']).length === 1 && /invalid/.test(compileTerms(['re:('])[0][0]));

console.log('false positives stay quiet');
const quiet = [
  'ANTHROPIC_API_KEY=', 'FAL_KEY=', "import Anthropic from '@anthropic-ai/sdk';", '"node_modules/@anthropic-ai/sdk": {',
  j('icon', '@', '2x.png'), j('Co-Authored-By: Claude <', 'noreply', '@', 'anthropic.com>'), j('user.email ', 'noreply', '@', 'dinglecraft.invalid'),
  j('a ', 'dev', '@', 'example.com'), "const SENTINEL = 'sk-test-SENTINEL-123';", "token:'${tokens.page}'",
  "fs.writeFileSync(f, 'ANTHROPIC_API_KEY=' + SENTINEL + '\\n');", j('path /', 'Users', '/...'), 'see the /Users/ rule',
  "const KEY_VAR = 'ANTHROPIC_API_KEY';", 'password: ""',
];
for (const l of quiet) ok('quiet: ' + l.slice(0, 50), rules(l).length === 0, rules(l).join(','));

console.log('forbidden files');
const fr = (p, size = 10) => fileRules(p, size);
ok('.env is forbidden', fr('.env').includes('env-file'));
ok('.env.local is forbidden', fr('brain/.env.local').includes('env-file'));
ok('.env.example is allowed', fr('.env.example').length === 0);
ok('brain data', fr('brain/data/spend.jsonl').includes('brain-data') && fr('x/tokens.json').includes('brain-data'));
ok('node_modules', fr('brain/node_modules/x/index.js').includes('node-modules'));
ok('generated asset scripts', fr('out/hr_assets.gen.js').includes('generated-assets'));
ok('source images (the logo excepted)', fr('assets/x.png').includes('source-image') && fr('assets/logo.png').length === 0 && fr('a/b.jpg').includes('source-image'));
ok('shipped html', fr('dinglecraft_v6.3.html').includes('shipped-html'));
ok('key files', fr('deploy.pem').includes('key-file') && fr('.npmrc').includes('key-file') && fr('id_rsa').includes('key-file') && fr('x/credentials.json').includes('key-file'));
ok('*.env and .envrc are forbidden too', fr('secrets.env').includes('env-file') && fr('tools/.envrc').includes('env-file'));
ok('the art spend ledger (costs.md, BUDGET) is forbidden', fr('tools/art/costs.md').includes('spend-ledger') && fr('x/BUDGET').includes('spend-ledger'));
ok('the private-terms list is forbidden', fr('tools/private_terms.local.txt').includes('private-terms-list'));
ok('files over 50 MB', fr('assets/packed/x.webp', 51 * 1024 * 1024).includes('big-file'));
ok('a webp payload is fine', fr('assets/packed/hr/t/x.c.webp', 40000).length === 0);

console.log('image metadata');
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]); };
const png = (types) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', Buffer.alloc(13)), ...types.map((t) => chunk(t, Buffer.alloc(6))), chunk('IEND', Buffer.alloc(0))]);
const wchunk = (type, n) => { const h = Buffer.alloc(8); h.write(type, 0, 'latin1'); h.writeUInt32LE(n, 4); return Buffer.concat([h, Buffer.alloc(n + (n & 1))]); };
const webp = (types) => { const body = Buffer.concat(types.map((t) => wchunk(t, 10))); const h = Buffer.alloc(12); h.write('RIFF', 0, 'latin1'); h.writeUInt32LE(body.length + 4, 4); h.write('WEBP', 8, 'latin1'); return Buffer.concat([h, body]); };
ok('png eXIf + tEXt reported by type', JSON.stringify(imageMeta(png(['eXIf', 'tEXt']))) === JSON.stringify(['png-chunk:eXIf', 'png-chunk:tEXt']));
ok('clean png is quiet', imageMeta(png(['IDAT'])).length === 0);
ok('webp EXIF/XMP reported', imageMeta(webp(['VP8X', 'VP8 ', 'EXIF', 'XMP '])).join(',') === 'webp-chunk:EXIF,webp-chunk:XMP');
ok('plain webp is quiet', imageMeta(webp(['VP8 '])).length === 0 && imageMeta(webp(['VP8X', 'ALPH', 'VP8L'])).length === 0);
ok('png iCCP (an ICC profile can carry a name) reported', imageMeta(png(['iCCP', 'IDAT'])).includes('png-chunk:iCCP'));
const jseg = (m, n = 4) => { const b = Buffer.alloc(2 + 2 + n); b[0] = 0xff; b[1] = m; b.writeUInt16BE(2 + n, 2); return b; };
const jpeg = (ms) => Buffer.concat([Buffer.from([0xff, 0xd8]), ...ms.map((m) => jseg(m)), Buffer.from([0xff, 0xda, 0, 2])]);
ok('jpeg APP1/APP2/APP13/COM reported, APP0 quiet', JSON.stringify(imageMeta(jpeg([0xe0, 0xe1, 0xe2, 0xed, 0xfe]))) === JSON.stringify(['jpeg-app1', 'jpeg-app2', 'jpeg-app13', 'jpeg-comment']) && imageMeta(jpeg([0xe0])).length === 0);
const gif = (ext) => Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.from([1, 0, 1, 0, 0, 0, 0]), ext, Buffer.from([0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 0, 0]), Buffer.from([0x3b])]);
ok('gif comment extension reported, a plain gif quiet', imageMeta(gif(Buffer.from([0x21, 0xfe, 2, 0x41, 0x42, 0]))).includes('gif-comment') && imageMeta(gif(Buffer.alloc(0))).length === 0);

console.log('history: commit identities (tools/scan_history.mjs)');
const who = (mail, zone) => j('author Dan Dingle <', mail, '> 1791502394 ', zone);
ok('the placeholder in UTC is clean', identProblems(who(j('noreply', '@', 'dinglecraft.invalid'), '+0000')).length === 0);
ok('a local zone is a finding (ident-timezone)', identProblems(who(j('noreply', '@', 'dinglecraft.invalid'), '+0100')).join() === 'ident-timezone' && identProblems(who(j('noreply', '@', 'dinglecraft.invalid'), '-0500')).includes('ident-timezone'));
ok('a personal address is a finding (ident-email)', identProblems(who(j('someone', '@', 'gmail', '.com'), '+0000')).join() === 'ident-email');
ok('GitHub and Anthropic noreply addresses are fine', identProblems(who(j('12345+x', '@', 'users.noreply.github.com'), '+0000')).length === 0 && identProblems(j('committer GitHub <', 'noreply', '@', 'github.com> 1 +0000')).length === 0);

console.log('end to end: values never printed');
const dir = path.join(REPO, 'out', 'scan_selftest');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
try {
  const bad = path.join(dir, 'leaky.txt');
  fs.writeFileSync(bad, ['fine line', samples['anthropic-key'], priv.email, samples['secret-assignment'], 'in the ' + tok + '-vault folder'].join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'list.txt'), 'out/scan_selftest/leaky.txt\n');
  const env = { ...process.env, DC_PRIVATE_TERMS: tok + '-vault' };
  const r = spawnSync(process.execPath, [path.join(HERE, 'scan_secrets.mjs'), '--files', path.join(dir, 'list.txt')], { encoding: 'utf8', env });
  const outText = r.stdout + r.stderr;
  ok('exit 1 on findings', r.status === 1, 'exit ' + r.status);
  ok('reports path:line and the rule', /out\/scan_selftest\/leaky\.txt:2\s+anthropic-key/.test(outText) && /leaky\.txt:3\s+email/.test(outText) && /leaky\.txt:4\s+secret-assignment/.test(outText), outText.split('\n').filter((l) => /FAIL/.test(l)).length + ' FAIL lines');
  ok('a private term from DC_PRIVATE_TERMS fires by rule name (path:line private-term#n)', /leaky\.txt:5\s+private-term#\d+/.test(outText));
  ok('never prints a value or a private term', ![samples['anthropic-key'].slice(5, 30), 'gmail', 'hunter2', tok].some((v) => outText.includes(v)));
} finally { fs.rmSync(dir, { recursive: true, force: true }); }

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
