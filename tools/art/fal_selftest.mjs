#!/usr/bin/env node
/* Hermetic self-test for tools/art/fal.mjs's key and budget guards. Costs $0 and never touches the network:
   it imports the module's functions (main() never runs), replaces fetch with a thrower, and uses temp folders and fake
   keys only. It never reads the repo's .env or a real ledger.   node tools/art/fal_selftest.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

globalThis.fetch = () => { throw new Error('network is off in the fal self-test'); };
const FAKE = 'fake-fal-key-SENTINEL-0000';
const FAKE2 = 'fake-fal-key-SENTINEL-1111';
let passed = 0, failed = 0;
const ok = (name, cond, detail) => {
  if (cond) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail !== undefined ? '  -> ' + String(detail).split(FAKE).join('[k]').split(FAKE2).join('[k]').slice(0, 200) : '')); }
};

const F = await import('./fal.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-fal-selftest-'));
const repo = path.join(tmp, 'repo'); fs.mkdirSync(repo);
const other = path.join(tmp, 'other.env');
try {
  console.log('dotenv reader');
  fs.writeFileSync(other, '﻿# x\r\nOTHER=1\r\nexport FAL_KEY="' + FAKE + '"\r\n');
  ok('quotes, export, CRLF, BOM', F.readVarFromEnvFile(other, 'FAL_KEY') === FAKE);
  fs.writeFileSync(other, "FAL_KEY_OLD=zz\nFAL_KEY='" + FAKE + "' # note\n");
  ok('similar names ignored, trailing comment', F.readVarFromEnvFile(other, 'FAL_KEY') === FAKE);
  ok('missing file -> null', F.readVarFromEnvFile(path.join(tmp, 'nope'), 'FAL_KEY') === null);

  console.log('key order');
  fs.writeFileSync(path.join(repo, '.env'), 'FAL_KEY=' + FAKE2 + '\n');
  ok('environment wins', F.resolveKey({ FAL_KEY: FAKE, DINGLE_ENV_PATH: other }, repo).source === 'env');
  ok('then DINGLE_ENV_PATH', (() => { const r = F.resolveKey({ DINGLE_ENV_PATH: other }, repo); return r.source === 'DINGLE_ENV_PATH' && r.key === FAKE; })());
  ok('then the repo .env', (() => { const r = F.resolveKey({}, repo); return r.source === '.env' && r.key === FAKE2; })());
  ok('blank FAL_KEY in the environment falls through', F.resolveKey({ FAL_KEY: '  ' }, repo).source === '.env');
  fs.rmSync(path.join(repo, '.env'));
  let msg = '';
  try { F.resolveKey({ DINGLE_ENV_PATH: path.join(tmp, 'nope') }, repo); } catch (e) { msg = e.message; }
  ok('missing key -> error that names FAL_KEY', /FAL_KEY is missing/.test(msg), msg);
  ok('the error carries no key value', !msg.includes(FAKE) && !msg.includes(FAKE2));

  console.log('budget (fail closed)');
  const led = path.join(tmp, 'ledger'); fs.mkdirSync(led);
  ok('default ledger dir is <repo>/.art-ledger', F.ledgerDir({}, repo) === path.join(repo, '.art-ledger'));
  ok('FAL_LEDGER_DIR overrides it', F.ledgerDir({ FAL_LEDGER_DIR: led }, repo) === path.resolve(led));
  ok('no BUDGET file, no FAL_BUDGET_USD -> no budget', F.budget(led, {}) === null);
  let refused = ''; try { F.checkBudget(0.15, led, {}); } catch (e) { refused = e.message; }
  ok('no budget -> refuses to run', /^BUDGET: no budget/.test(refused), refused);
  ok('FAL_BUDGET_USD caps it', F.budget(led, { FAL_BUDGET_USD: '5' }) === 5);
  ok('a junk FAL_BUDGET_USD is no budget', F.budget(led, { FAL_BUDGET_USD: 'lots' }) === null);
  fs.writeFileSync(path.join(led, 'BUDGET'), '2.50\n');
  ok('BUDGET file wins over FAL_BUDGET_USD', F.budget(led, { FAL_BUDGET_USD: '99' }) === 2.5);
  fs.writeFileSync(path.join(led, 'costs.md'), '| time | service | item | est. cost | running total |\n|---|---|---|---|---|\n| t | a | x | $1.000 | $1.000 |\n| t | a | y | $1.200 | $2.200 |\n');
  ok('ledger total sums the cost column', Math.abs(F.spent(led) - 2.2) < 1e-9, F.spent(led));
  ok('a call that fits is allowed', F.checkBudget(0.3, led, {}).cap === 2.5);
  refused = ''; try { F.checkBudget(0.31, led, {}); } catch (e) { refused = e.message; }
  ok('a call past the cap is refused', /would pass the \$2.5 cap/.test(refused), refused);
  refused = ''; try { F.checkBudget(NaN, led, {}); } catch (e) { refused = e.message; }
  ok('a bad cost estimate is refused', /estCostUSD/.test(refused), refused);

  console.log('input');
  const png = path.join(tmp, 'x.png'); fs.writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const inl = F.inlineFiles({ image_url: png, image_urls: [png, 'https://example.invalid/a.png'], prompt: png });
  ok('local *_url paths become data URIs, other fields untouched', inl.image_url.startsWith('data:image/png;base64,') && inl.image_urls[0].startsWith('data:') && inl.image_urls[1].startsWith('https:') && inl.prompt === png);

  console.log('source hygiene');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const txt = fs.readFileSync(path.join(here, 'fal.mjs'), 'utf8');
  const banned = [['', 'Users', ''].join('/'), ['', 'home', ''].join('/'), ['', 'private', 'tmp'].join('/')];
  /* plus the owner's private terms, from the local untracked list if there is one (tools/lib/private_terms.cjs; none in CI) */
  let privRules = [];
  try { privRules = createRequire(import.meta.url)('../lib/private_terms.cjs').load().rules; } catch (e) { privRules = []; }
  ok('fal.mjs holds no absolute path or private term', banned.every((b) => !txt.includes(b)) && privRules.every(([, re]) => !re.test(txt)));
  ok('fal.mjs has no built-in budget fallback', !/return 25\b/.test(txt));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
