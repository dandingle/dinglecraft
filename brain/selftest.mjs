/* DINGLECRAFT brain self-test. Costs $0: every call goes to a FAKE upstream on
   127.0.0.1. Run from the repo root:  npm run test:brain  (= node brain/selftest.mjs)
   Hermetic: temp dirs only, fake keys only; it never reads the repo .env and drops any
   ANTHROPIC_* variables it inherited from the shell before the brain is imported. */

import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { costOf } from './prompts.mjs';

const SENTINEL = 'sk-test-SENTINEL-123';
const ENV_SENTINEL = 'sk-test-ENVSENTINEL-456';
const HERE = path.dirname(fileURLToPath(import.meta.url));
/* never let a real key from the shell into this process (names only, values untouched) */
for (const n of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL']) delete process.env[n];

/* ---------------------------------------------------------- tiny harness -- */
let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail !== undefined ? '  -> ' + String(detail).replaceAll(SENTINEL, '[sentinel]').replaceAll(ENV_SENTINEL, '[sentinel]').slice(0, 300) : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------- fake Anthropic -- */
/* rejectBeta: answer 400 to every request that carries the fallback beta header */
const fake = { queue: [], hits: 0, requests: [], delay: 0, rejectBeta: false };
const FAKE_USAGE = { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 };

const OUT = {
  act: { thought: 'someone is near my moat', say: [{ text: 'who is that', to: null, whisper: false }], actions: [{ skill: 'goto', target: 'home', item: null, count: null, note: null }], relations: [], project: 'continue', remember: null },
  mind: { options_considered: ['dig a moat', 'build a sky base'], project: { title: 'Fort Never Again', kind: 'FORTIFY', why: 'they are coming', steps: ['gather 20 stone', 'build a 7x7 bunker'], where: 'at home' }, announce: '' },
  build: { thought: 'walls first', place: [{ x: 0, y: 1, z: 0, block: 'Cobblestone' }], remove: [], ignite: [], done: false },
};

function laneOf(body) {
  const req = body?.output_config?.format?.schema?.required || [];
  if (req.includes('options_considered')) return 'mind';
  if (req.includes('place')) return 'build';
  return 'act';
}

function errBody(type, message) { return JSON.stringify({ type: 'error', error: { type, message } }); }

const upstream = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    fake.hits++;
    let body = null;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { body = null; }
    fake.requests.push({ url: req.url, beta: req.headers['anthropic-beta'] || null, keyOk: req.headers['x-api-key'] === SENTINEL, auth: req.headers.authorization || null, body });
    const hasBeta = String(req.headers['anthropic-beta'] || '').includes('server-side-fallback');
    const mode = fake.rejectBeta && hasBeta ? '400beta' : (fake.queue.length ? fake.queue.shift() : 'ok');
    const lane = laneOf(body);
    const send = (status, text) => {
      if (res.destroyed) return;
      res.writeHead(status, { 'Content-Type': 'application/json', 'request-id': 'req_fake_' + fake.hits });
      res.end(text);
    };
    const msg = (text, stop = 'end_turn', model = body?.model || 'claude-sonnet-5-5', usage = FAKE_USAGE) => JSON.stringify({
      id: 'msg_fake_' + fake.hits, type: 'message', role: 'assistant', model,
      content: [{ type: 'text', text }], stop_reason: stop, stop_sequence: null, usage,
    });
    setTimeout(() => {
      switch (mode) {
        /* a cheaper fallback model served the turn after the requested model declined */
        case 'fallbackServed': return send(200, msg(JSON.stringify(OUT[lane]), 'end_turn', 'claude-sonnet-5-5', {
          ...FAKE_USAGE,
          iterations: [
            { type: 'message', model: body?.model, input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 },
            { type: 'fallback_message', model: 'claude-sonnet-5-5', ...FAKE_USAGE },
          ],
        }));
        case 'unknownModel': return send(200, msg(JSON.stringify(OUT[lane]), 'end_turn', 'claude-mystery-9'));
        case 'opusAnswer': return send(200, msg(JSON.stringify(OUT[lane]), 'end_turn', 'claude-opus-5-5'));
        case '529': return send(529, errBody('overloaded_error', 'Overloaded'));
        case '500': return send(500, errBody('api_error', 'Internal server error'));
        case '400': return send(400, errBody('invalid_request_error', 'messages.0.content: something is wrong with the request'));
        case '400beta': return send(400, errBody('invalid_request_error', 'Unexpected value(s) `server-side-fallback-2026-07-01` for the `anthropic-beta` header. Please consult our documentation at docs.anthropic.com or try again without the header.'));
        case '401': return send(401, errBody('authentication_error', 'invalid x-api-key'));
        case 'spend429': return send(429, errBody('rate_limit_error', 'This request would exceed your enforced_spend_limit for this workspace.'));
        case 'credit400': return send(400, errBody('invalid_request_error', 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.'));
        case 'refusal': return send(200, JSON.stringify({ id: 'msg_r', type: 'message', role: 'assistant', model: body?.model, content: [], stop_reason: 'refusal', stop_details: { category: 'general_harms', explanation: null }, usage: { input_tokens: 100, output_tokens: 0, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 } }));
        case 'maxtokens': return send(200, msg('{"thought":"i was going to', 'max_tokens'));
        case 'garbage': return send(200, msg('not json at all'));
        default: return send(200, msg(JSON.stringify(OUT[lane])));
      }
    }, fake.delay);
  });
});

/* ------------------------------------------------------------ http client -- */
const allResponses = [];
function hreq(port, { method = 'GET', path: p = '/', headers = {}, body = null, host, abortAfter } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const h = { Host: host === undefined ? `127.0.0.1:${port}` : host, ...headers };
    if (host === null) delete h.Host;
    let data = null;
    if (body != null) {
      data = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
      h['Content-Type'] = h['Content-Type'] || 'application/json';
      h['Content-Length'] = data.length;
    }
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: h, agent: false, setHost: host !== null }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        allResponses.push(JSON.stringify(res.headers) + '\n' + text);
        let json = null;
        try { json = JSON.parse(text); } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, text, json, ms: Date.now() - t0 });
      });
    });
    r.on('error', (e) => resolve({ status: 0, error: e.message, headers: {}, text: '', json: null, ms: Date.now() - t0 }));
    if (abortAfter) setTimeout(() => r.destroy(), abortAfter);
    if (data) r.write(data);
    r.end();
  });
}

function rawSocket(port, payload) {
  return new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1', () => s.end(payload));
    let got = '';
    s.on('data', (d) => { got += d.toString(); });
    s.on('close', () => { allResponses.push(got); resolve(got); });
    s.on('error', () => resolve(got));
    setTimeout(() => { s.destroy(); resolve(got); }, 2000);
  });
}

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    out = e.isDirectory() ? out.concat(walk(p)) : out.concat([p]);
  }
  return out;
}

/* -------------------------------------------------------------- the test -- */
async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dingle-brain-selftest-'));
  const gameDir = path.join(tmp, 'game');
  const dataDir = path.join(tmp, 'data');
  const envPath = path.join(tmp, 'test.env');
  const stopPath = path.join(tmp, 'STOP');
  fs.mkdirSync(gameDir);
  fs.writeFileSync(path.join(gameDir, 'dinglecraft_v5.8.html'), '<!DOCTYPE html><html><head><title>V58</title></head><body>MARK_V5_8</body></html>');
  fs.writeFileSync(path.join(gameDir, 'dinglecraft_v5.9.html'), '<!DOCTYPE html><html lang="en"><head>\n<meta charset="utf-8"><title>V59</title></head><body>MARK_V5_9</body></html>');
  fs.writeFileSync(path.join(gameDir, 'dinglecraft_v5.10.html'), '<!DOCTYPE html><html><HEAD data-x="1"><title>V510</title></HEAD><body><header>h</header>MARK_V5_10</body></html>');
  fs.writeFileSync(path.join(gameDir, 'dinglecraft_v4.12.html'), 'MARK_V4_12 no head tag here');
  fs.writeFileSync(path.join(gameDir, 'dinglecraft_v4.13.html'), '<!DOCTYPE html><!-- old layout: <head> went here --><html><head><title>V413</title></head><body>MARK_V4_13</body></html>');
  fs.writeFileSync(path.join(gameDir, 'dinglecraft_v4.14.html'), 'MARK_V4_14<!-- unclosed comment <head> forever');
  fs.writeFileSync(path.join(gameDir, 'secret.txt'), 'SECRET_FILE');
  fs.writeFileSync(path.join(gameDir, '.env'), 'ANTHROPIC_API_KEY=' + SENTINEL + '\n');
  fs.writeFileSync(envPath, '﻿# test env\r\nOTHER_KEY=nope\r\nexport OTHER_KEY_A="aaa"\r\nANTHROPIC_API_KEY="' + SENTINEL + '"\r\nOTHER_KEY_B=bbb\r\n');

  await new Promise((r) => upstream.listen(0, '127.0.0.1', r));
  const upPort = upstream.address().port;

  process.env.NODE_ENV = 'test';
  process.env.DINGLE_UPSTREAM = `http://127.0.0.1:${upPort}`;
  process.env.DINGLE_TEST_KEY = SENTINEL;
  process.env.DINGLE_ENV_PATH = envPath;
  process.env.DINGLE_GAME_DIR = gameDir;
  process.env.DINGLE_DATA_DIR = dataDir;
  delete process.env.DINGLE_BRAIN_PORT;

  const { startServer, readKeyFromEnvFile, BRAIN_DEFAULTS } = await import('./dingle-brain.mjs');

  console.log('env loader');
  check('reads ANTHROPIC_API_KEY (quotes, CRLF, BOM, other vars)', readKeyFromEnvFile(envPath) === SENTINEL);
  const e2 = path.join(tmp, 'e2.env');
  fs.writeFileSync(e2, "FOO=1\nexport ANTHROPIC_API_KEY='abc-123' # comment\n");
  check('single quotes + export + trailing comment', readKeyFromEnvFile(e2) === 'abc-123');
  fs.writeFileSync(e2, 'FOO=1\nANTHROPIC_API_KEY_OLD=zzz\nANTHROPIC_API_KEY=plain-val\r\n');
  check('unquoted value, similar names ignored', readKeyFromEnvFile(e2) === 'plain-val');
  fs.writeFileSync(e2, 'FOO=1\nBAR=2\n');
  check('missing variable -> null', readKeyFromEnvFile(e2) === null);
  check('missing file -> null', readKeyFromEnvFile(path.join(tmp, 'nope.env')) === null);

  const logs = [];
  let B = await startServer({ port: 0, log: (s) => logs.push(s), stopPath, pairDelayMs: 150 });
  const P = () => B.port;
  const pairCodeLogged = logs.some((l) => /Pairing code for file:\/\/ pages: [0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/.test(l));

  console.log('startup');
  check('banner shows pairing code line', pairCodeLogged);
  check('banner names the key variable, test mode', logs.some((l) => l.includes('ANTHROPIC_API_KEY found')));
  check('test mode upstream is the fake', B.state().testMode && B.state().upstream === `http://127.0.0.1:${upPort}`);

  console.log('host / origin / cors');
  let r = await hreq(P(), { path: '/health' });
  check('/health ok', r.status === 200 && r.json && r.json.ok === true && r.json.version === '1.0' && r.json.key === true && r.json.authed === false && r.json.paused === false, r.text);
  r = await hreq(P(), { path: '/health', host: `evil.example:${P()}` });
  check('wrong Host -> 403', r.status === 403, r.status);
  r = await hreq(P(), { path: '/', host: `127.0.0.1:${P() + 1}` });
  check('wrong Host port -> 403', r.status === 403, r.status);
  r = await hreq(P(), { path: '/health', host: null });
  check('missing Host -> 403/400', r.status === 403 || r.status === 400, r.status);
  r = await hreq(P(), { path: '/health', headers: { Origin: 'https://evil.example' } });
  check('bad Origin -> 403', r.status === 403, r.status);
  r = await hreq(P(), { method: 'POST', path: '/turn', headers: { Origin: 'http://localhost:9999' }, body: { lane: 'act', bot: 'BunkerBrad', payload: {} } });
  check('bad Origin on /turn -> 403', r.status === 403, r.status);
  r = await hreq(P(), { path: '/health', headers: { Origin: 'null' } });
  check('Origin null allowed + echoed', r.status === 200 && r.headers['access-control-allow-origin'] === 'null', JSON.stringify(r.headers));
  r = await hreq(P(), { path: '/health', headers: { Origin: 'http://localhost:8643' } });
  check('Origin localhost:8643 allowed', r.status === 200 && r.headers['access-control-allow-origin'] === 'http://localhost:8643');
  r = await hreq(P(), { method: 'OPTIONS', path: '/turn', headers: { Origin: 'null', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-dingle-token' } });
  check('preflight -> 204 with allow headers', r.status === 204 && /X-Dingle-Token/i.test(r.headers['access-control-allow-headers'] || '') && /POST/.test(r.headers['access-control-allow-methods'] || '') && r.headers['access-control-allow-origin'] === 'null', JSON.stringify(r.headers));
  r = await hreq(P(), { method: 'OPTIONS', path: '/turn', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
  check('preflight from bad origin -> 403', r.status === 403);
  r = await hreq(P(), { method: 'OPTIONS', path: '/turn', headers: { Origin: 'null', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Private-Network': 'true' } });
  check('PNA preflight from Origin null -> no Allow-Private-Network', r.status === 204 && !('access-control-allow-private-network' in r.headers), JSON.stringify(r.headers));
  r = await hreq(P(), { method: 'OPTIONS', path: '/turn', headers: { Origin: 'http://localhost:8643', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Private-Network': 'true' } });
  check('PNA preflight from localhost:8643 -> Allow-Private-Network', r.status === 204 && r.headers['access-control-allow-private-network'] === 'true', JSON.stringify(r.headers));

  console.log('serving the game');
  r = await hreq(P(), { path: '/' });
  const tokFile = JSON.parse(fs.readFileSync(path.join(dataDir, 'tokens.json'), 'utf8'));
  const m = /window\.__DINGLE_BRAIN=\{url:'',token:'([0-9a-f]{64})'\};/.exec(r.text);
  const PAGE = m ? m[1] : '';
  check('GET / serves newest (v5.10 > v5.9)', r.status === 200 && r.text.includes('MARK_V5_10'), r.text.slice(0, 120));
  check('token injected right after <head ...>', r.text.includes(`<HEAD data-x="1"><script>window.__DINGLE_BRAIN={url:'',token:'${PAGE}'};</script><title>`));
  check('page token matches tokens.json', !!PAGE && PAGE === tokFile.page && Array.isArray(tokFile.paired));
  check('text/html + no-store', /text\/html/.test(r.headers['content-type'] || '') && r.headers['cache-control'] === 'no-store');
  r = await hreq(P(), { path: '/dinglecraft_v5.9.html' });
  check('GET /dinglecraft_v5.9.html serves that file with token', r.status === 200 && r.text.includes('MARK_V5_9') && r.text.includes('<html lang="en"><head><script>window.__DINGLE_BRAIN='));
  r = await hreq(P(), { path: '/dinglecraft_v4.12.html' });
  check('no <head> -> injected at start', r.status === 200 && r.text.startsWith('<script>window.__DINGLE_BRAIN=') && r.text.includes('MARK_V4_12'));
  r = await hreq(P(), { path: '/?x=1' });
  check('GET /?query still serves game', r.status === 200 && r.text.includes('MARK_V5_10'));
  r = await hreq(P(), { path: '/', headers: { Origin: `http://127.0.0.1:${P()}` } });
  check('same-origin page request ok, no CORS header on HTML', r.status === 200 && !('access-control-allow-origin' in r.headers), JSON.stringify(r.headers));
  r = await hreq(P(), { path: '/dinglecraft_v4.13.html' });
  check('<head> inside an earlier comment is skipped', r.status === 200 && r.text.includes('<!-- old layout: <head> went here --><html><head><script>window.__DINGLE_BRAIN=') && r.text.includes('MARK_V4_13'), r.text.slice(0, 160));
  r = await hreq(P(), { path: '/dinglecraft_v4.14.html' });
  check('<head> inside an unclosed comment -> injected at start', r.status === 200 && r.text.startsWith('<script>window.__DINGLE_BRAIN='), r.text.slice(0, 120));

  console.log('game HTML is not readable by other sites (page-token theft)');
  const noTok = (x) => !x.text.includes(PAGE) && !/__DINGLE_BRAIN/.test(x.text) && !('access-control-allow-origin' in x.headers);
  r = await hreq(P(), { path: '/', headers: { Origin: 'null' } });
  check('GET / with Origin null -> 403, no token, no ACAO', r.status === 403 && noTok(r), `${r.status} ${JSON.stringify(r.headers)}`);
  r = await hreq(P(), { path: '/dinglecraft_v5.9.html', headers: { Origin: 'null' } });
  check('GET /dinglecraft_v5.9.html with Origin null -> 403, no token', r.status === 403 && noTok(r), r.status);
  r = await hreq(P(), { path: '/', headers: { Origin: 'http://localhost:8643' } });
  check('GET / with Origin localhost:8643 -> 403 (API-only origin)', r.status === 403 && noTok(r), r.status);
  r = await hreq(P(), { path: '/', headers: { Origin: 'https://evil.example' } });
  check('GET / with evil Origin -> 403', r.status === 403 && noTok(r), r.status);
  for (const sfs of ['cross-site', 'same-site', 'bogus']) {
    r = await hreq(P(), { path: '/', headers: { 'Sec-Fetch-Site': sfs, 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' } });
    check(`GET / navigated from another site (Sec-Fetch-Site: ${sfs}) -> 403, no token`, r.status === 403 && noTok(r), r.status);
  }
  r = await hreq(P(), { path: '/dinglecraft_v5.9.html', headers: { 'Sec-Fetch-Site': 'cross-site' } });
  check('version file from another site -> 403', r.status === 403 && noTok(r), r.status);
  r = await hreq(P(), { path: '/', headers: { 'Sec-Fetch-Site': 'none', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' } });
  check('GET / typed in address bar (Sec-Fetch-Site: none) -> 200 with token', r.status === 200 && r.text.includes(PAGE));
  r = await hreq(P(), { path: '/', headers: { 'Sec-Fetch-Site': 'same-origin', Origin: `http://localhost:${P()}`, Host: `localhost:${P()}` }, host: `localhost:${P()}` });
  check('GET / reload on localhost:<port> (same-origin) -> 200', r.status === 200 && r.text.includes(PAGE), r.status);
  r = await hreq(P(), { method: 'POST', path: '/', headers: { Origin: 'null' } });
  check('POST / from Origin null -> 405, no ACAO', r.status === 405 && !('access-control-allow-origin' in r.headers));
  r = await hreq(P(), { path: '/dinglecraft_v9.9.html' });
  check('missing version -> 404', r.status === 404);
  const bad = ['/../.env', '/%2e%2e/', '/%2e%2e/.env', '/%2E%2E/%2E%2E/etc/passwd', '/.env', '/brain/prompts.mjs', '/prompts.mjs', '/dingle-brain.mjs',
    '/secret.txt', '/data/tokens.json', '/brain/data/tokens.json', '//dinglecraft_v5.9.html', '/./dinglecraft_v5.9.html', '/dinglecraft_v5.9.html/',
    '/dinglecraft_v5.9.html%00', '/..%2fbrain%2fprompts.mjs', '/dinglecraft_v5.9.htm', '/DINGLECRAFT_V5.9.HTML', '/game.js', '/favicon.ico', '/x/../dinglecraft_v5.9.html'];
  for (const b of bad) {
    r = await hreq(P(), { path: b });
    check('GET ' + b + ' -> 404', r.status === 404 && !r.text.includes('MARK_') && !r.text.includes('SECRET_FILE'), r.status);
  }
  /* Release 1.0: the brain serves no local media (the third-party audio route was removed; the game uses in-engine sounds) */
  for (const mp of ['/media/0', '/media/1', '/media/2']) {
    r = await hreq(P(), { path: mp, headers: { 'Sec-Fetch-Site': 'same-origin' } });
    check('GET ' + mp + ' (same-origin) -> 404', r.status === 404, r.status);
  }
  {
    const src = fs.readFileSync(path.join(HERE, 'dingle-brain.mjs'), 'utf8');
    check('dingle-brain.mjs has no /media route and never reads file:// paths out of the game html', !/serveMedia|mediaList|MEDIA_RE|SCARE_SND|\/media\//.test(src) && !/matchAll\(\/'file:/.test(src));
  }
  r = await hreq(P(), { method: 'POST', path: '/' });
  check('POST / -> 405', r.status === 405);
  r = await hreq(P(), { path: '/turn' });
  check('GET /turn -> 405', r.status === 405);

  console.log('/turn auth + validation');
  const T = (body, tok = PAGE, extraHeaders = {}) => hreq(P(), { method: 'POST', path: '/turn', headers: tok ? { 'X-Dingle-Token': tok, ...extraHeaders } : extraHeaders, body });
  const turnAct = { lane: 'act', bot: 'BunkerBrad', payload: { obs: 'You see Dan near your moat.' } };
  r = await T(turnAct, null);
  check('/turn without token -> 401 not paired', r.status === 401 && r.json && r.json.ok === false && r.json.error === 'not paired', r.text);
  r = await T(turnAct, 'f'.repeat(64));
  check('/turn with wrong token -> 401', r.status === 401);
  check('no upstream call yet', fake.hits === 0, fake.hits);
  r = await T({ lane: 'chat', bot: 'BunkerBrad', payload: {} });
  check('bad lane -> 400', r.status === 400 && r.json.error === 'bad lane');
  r = await T({ lane: 'act', bot: 'Dan', payload: {} });
  check('bad bot -> 400', r.status === 400 && r.json.error === 'bad bot');
  r = await T({ lane: 'act', bot: '__proto__', payload: {} });
  check('bot __proto__ -> 400', r.status === 400);
  r = await T('{not json');
  check('bad json -> 400', r.status === 400);
  r = await T('[1,2]');
  check('array body -> 400', r.status === 400);
  r = await T({ lane: 'act', bot: 'BunkerBrad', payload: [1] });
  check('array payload -> 400', r.status === 400);
  r = await T({ lane: 'act', bot: 'BunkerBrad', payload: { obs: 'x'.repeat(70 * 1024) } });
  check('body > 64 KB -> 413', r.status === 413, r.status);
  check('still no upstream call', fake.hits === 0, fake.hits);

  console.log('/turn happy paths');
  r = await T(turnAct);
  check('act with page token -> ok', r.status === 200 && r.json && r.json.ok === true, r.text);
  check('act out matches', r.json && r.json.out && r.json.out.thought === OUT.act.thought && r.json.out.say[0].text === 'who is that' && r.json.out.actions[0].skill === 'goto');
  check('reply has ms, spent, usage', r.json && typeof r.json.ms === 'number' && r.json.spent > 0 && r.json.usage && r.json.usage.in === 100 && r.json.usage.out === 50 && r.json.usage.cache_read === 900, r.text);
  const q0 = fake.requests[0];
  check('upstream got the test key', q0 && q0.keyOk === true && !q0.auth);
  check('beta header + fallbacks:"default" sent', q0 && q0.beta && q0.beta.includes('server-side-fallback-2026-07-01') && q0.body.fallbacks === 'default' && !('betas' in q0.body), q0 && q0.beta);
  check('request built by prompts.mjs', q0 && q0.body.model === 'claude-sonnet-5-5' && Array.isArray(q0.body.system) && q0.body.messages[0].content.includes('You see Dan near your moat.') && q0.body.output_config && q0.body.thinking && q0.body.thinking.type === 'between_tools');
  r = await T({ lane: 'mind', bot: 'honeybee_mc', payload: { why: 'you just joined', obs: 'flowers' } });
  check('mind lane ok', r.json && r.json.ok === true && r.json.out.project.title === 'Fort Never Again' && fake.requests.at(-1).body.model === 'claude-opus-5-5', r.text);
  r = await T({ lane: 'build', bot: 'xx_lilcreepah_xx', payload: { goal: 'dirt tower', turn: 1, palette: ['Dirt'] } });
  check('build lane ok', r.json && r.json.ok === true && Array.isArray(r.json.out.place) && r.json.out.place.length === 1, r.text);
  r = await T({ lane: 'act', bot: 'honeybee_mc' });
  check('missing payload treated as {}', r.json && r.json.ok === true, r.text);
  r = await hreq(P(), { method: 'POST', path: '/turn', headers: { 'X-Dingle-Token': PAGE, Origin: 'null' }, body: turnAct });
  check('/turn from Origin null with token ok + ACAO', r.json && r.json.ok === true && r.headers['access-control-allow-origin'] === 'null');

  console.log('retries + errors');
  let h0 = fake.hits;
  fake.queue.push('529');
  r = await T(turnAct);
  check('one 529 -> retried and ok', r.json && r.json.ok === true && fake.hits - h0 === 2, `hits ${fake.hits - h0} ${r.text}`);
  h0 = fake.hits;
  fake.queue.push('500', '500');
  r = await T(turnAct);
  check('two 5xx -> only one retry, then error', r.json && r.json.ok === false && fake.hits - h0 === 2 && r.status >= 500, `hits ${fake.hits - h0} ${r.text}`);
  h0 = fake.hits;
  fake.queue.push('400');
  r = await T(turnAct);
  check('400 -> not retried', r.json && r.json.ok === false && fake.hits - h0 === 1 && /400/.test(r.json.error), `hits ${fake.hits - h0} ${r.text}`);
  check('fallbacks still on after unrelated 400', B.state().fallbacks === true);
  h0 = fake.hits;
  fake.queue.push('401');
  r = await T(turnAct);
  check('401 -> key rejected', r.json && r.json.ok === false && r.json.error === 'ANTHROPIC_API_KEY rejected (401)' && fake.hits - h0 === 1 && r.status !== 401 && r.status !== 403, `${r.status} ${r.text}`);
  r = await hreq(P(), { path: '/health' });
  check('/health key:false after 401', r.json && r.json.key === false, r.text);
  r = await T(turnAct);
  r = await hreq(P(), { path: '/health' });
  check('/health key:true again after a success', r.json && r.json.key === true);
  fake.queue.push('refusal');
  r = await T(turnAct);
  check('refusal -> ok:false refusal', r.json && r.json.ok === false && r.json.error === 'refusal', r.text);
  fake.queue.push('maxtokens');
  r = await T(turnAct);
  check('max_tokens + broken JSON -> truncated', r.json && r.json.ok === false && r.json.error === 'truncated', r.text);
  fake.queue.push('garbage');
  r = await T(turnAct);
  check('non-JSON output -> bad output', r.json && r.json.ok === false && r.json.error === 'bad output', r.text);

  console.log('spend limit');
  h0 = fake.hits;
  fake.queue.push('spend429');
  r = await T(turnAct);
  check('spend-limit 429 -> paused, no retry', r.json && r.json.ok === false && r.json.paused === true && /spend limit/.test(r.json.error) && fake.hits - h0 === 1, `hits ${fake.hits - h0} ${r.text}`);
  r = await hreq(P(), { path: '/health' });
  check('/health paused:true', r.json && r.json.paused === true);
  r = await T(turnAct);
  check('next success ok', r.json && r.json.ok === true);
  r = await hreq(P(), { path: '/health' });
  check('/health paused cleared after success', r.json && r.json.paused === false);
  h0 = fake.hits;
  fake.queue.push('credit400');
  r = await T({ lane: 'act', bot: 'xx_lilcreepah_xx', payload: { obs: 'x' } });
  check('credit-balance 400 -> paused, no retry, no fallback retry', r.json && r.json.paused === true && fake.hits - h0 === 1 && B.state().fallbacks === true, `hits ${fake.hits - h0} ${r.text}`);
  r = await T({ lane: 'act', bot: 'xx_lilcreepah_xx', payload: { obs: 'x' } });
  check('cleared again', r.json && r.json.ok === true && B.state().paused === false);

  console.log('busy');
  fake.delay = 400;
  const [a1, a2, a3] = await Promise.all([
    T({ lane: 'build', bot: 'BunkerBrad', payload: { goal: 'bunker' } }),
    (async () => { await sleep(80); return T({ lane: 'build', bot: 'BunkerBrad', payload: { goal: 'bunker' } }); })(),
    (async () => { await sleep(80); return T({ lane: 'mind', bot: 'BunkerBrad', payload: {} }); })(),
  ]);
  fake.delay = 0;
  check('first of two same bot+lane ok', a1.json && a1.json.ok === true, a1.text);
  check('second same bot+lane -> 429 busy', a2.status === 429 && a2.json && a2.json.error === 'busy', a2.text);
  check('other lane same bot runs in parallel', a3.json && a3.json.ok === true, a3.text);

  console.log('STOP file');
  fs.writeFileSync(stopPath, '');
  h0 = fake.hits;
  r = await T(turnAct);
  check('STOP -> 503', r.status === 503 && r.json && r.json.error === 'stopped (brain/STOP exists)' && fake.hits === h0, r.text);
  fs.unlinkSync(stopPath);
  r = await T(turnAct);
  check('STOP removed -> ok again', r.json && r.json.ok === true);

  console.log('pairing');
  const code1 = B.getPairCode();
  const wrongCode = (c, i = 0) => { const w = ('ZZZZZ-ZZZZ' + 'XYZW'[i % 4]).slice(0, 11); return w === c ? 'YYYYY-YYYYY' : w; };
  check('pairing code is 10 base32 chars (XXXXX-XXXXX)', /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/.test(code1), code1.length);
  r = await hreq(P(), { method: 'POST', path: '/pair', headers: { Origin: 'null' }, body: { code: wrongCode(code1) } });
  check('wrong code rejected', r.json && r.json.ok === false && r.json.error === 'wrong code', r.text);
  check('wrong code answer is delayed', r.ms >= 140, r.ms);
  check('one wrong attempt does not rotate', B.getPairCode() === code1);
  r = await hreq(P(), { method: 'POST', path: '/pair', headers: { Origin: 'null' }, body: { code: '123456' } });
  check('old-style 6-digit code rejected', r.json && r.json.ok === false);
  /* Dan may type it lower-case, without the dash, with spaces */
  r = await hreq(P(), { method: 'POST', path: '/pair', headers: { Origin: 'null' }, body: { code: '  ' + code1.replace('-', ' ').toLowerCase() + ' ' } });
  const PAIRED = r.json && r.json.token;
  check('right code (any case, no dash) -> token', r.json && r.json.ok === true && /^[0-9a-f]{64}$/.test(PAIRED || ''), r.text);
  check('code rotated after use', B.getPairCode() !== code1);
  check('rotated code printed', logs.some((l) => l.includes('pairing code for file:// pages: ' + B.getPairCode())));
  r = await hreq(P(), { method: 'POST', path: '/pair', body: { code: code1 } });
  check('used code no longer works', r.json && r.json.ok === false);
  r = await T(turnAct, PAIRED, { Origin: 'null' });
  check('paired token works on /turn', r.json && r.json.ok === true, r.text);
  r = await hreq(P(), { path: '/health', headers: { 'X-Dingle-Token': PAIRED, Origin: 'null' } });
  check('/health authed:true with paired token', r.json && r.json.authed === true);
  check('paired token persisted', JSON.parse(fs.readFileSync(path.join(dataDir, 'tokens.json'), 'utf8')).paired.includes(PAIRED));
  const code2 = B.getPairCode();
  /* the 'used code' attempt above was miss 1 for code2; 3 more = 4 */
  for (let i = 0; i < 3; i++) await hreq(P(), { method: 'POST', path: '/pair', body: { code: wrongCode(code2, i) } });
  check('4 wrong attempts do not rotate yet', B.getPairCode() === code2);
  await hreq(P(), { method: 'POST', path: '/pair', body: { code: wrongCode(code2, 4) } });
  check('5th wrong attempt rotates the code', B.getPairCode() !== code2);
  /* a hostile page hammering /pair must not lock Dan out (no global lockout any more) */
  const flood = await Promise.all(Array.from({ length: 30 }, (_, i) => hreq(P(), { method: 'POST', path: '/pair', headers: { Origin: 'null' }, body: { code: wrongCode('', i) } })));
  check('flood of 30 wrong codes all rejected', flood.every((x) => x.json && x.json.ok === false && x.json.error === 'wrong code'), flood.map((x) => x.status).join(','));
  r = await hreq(P(), { method: 'POST', path: '/pair', headers: { Origin: 'null' }, body: { code: B.getPairCode() } });
  const PAIRED2 = r.json && r.json.token;
  check('current code still pairs right after the flood', r.json && r.json.ok === true && /^[0-9a-f]{64}$/.test(PAIRED2 || ''), r.text);
  r = await hreq(P(), { method: 'POST', path: '/pair', body: '{bad' });
  check('/pair bad json -> 400', r.status === 400);

  console.log('fallback opt-out');
  h0 = fake.hits;
  const reqIdx = fake.requests.length;
  fake.queue.push('400beta');
  r = await T(turnAct);
  const retryReq = fake.requests[reqIdx + 1];
  check('400 about the beta -> retried once without it, ok', r.json && r.json.ok === true && fake.hits - h0 === 2, `hits ${fake.hits - h0} ${r.text}`);
  check('retry had no beta header and no fallbacks field', retryReq && !(retryReq.beta || '').includes('server-side-fallback') && !('fallbacks' in retryReq.body) && retryReq.url === '/v1/messages', retryReq && retryReq.url);
  r = await T(turnAct);
  const after = fake.requests.at(-1);
  check('fallbacks stay off for the session', r.json && r.json.ok === true && !('fallbacks' in after.body) && B.state().fallbacks === false);

  console.log('ledger files');
  const spendLines = fs.readFileSync(path.join(dataDir, 'spend.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const s0 = spendLines[0];
  check('spend.jsonl lines have ts,lane,bot,model,ms,usage,cost', s0 && s0.ts && s0.lane === 'act' && s0.bot === 'BunkerBrad' && s0.model === 'claude-sonnet-5-5' && typeof s0.ms === 'number' && s0.usage && s0.usage.cache_read_input_tokens === 900 && 'cache_creation_input_tokens' in s0.usage && s0.cost > 0, JSON.stringify(s0));
  const turnLines = fs.readFileSync(path.join(dataDir, 'turns.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  check('turns.jsonl has full exchange', turnLines.length >= 10 && turnLines[0].user.includes('You see Dan near your moat.') && turnLines[0].out && turnLines[0].usage, turnLines.length);
  r = await hreq(P(), { path: '/health' });
  const sum = spendLines.reduce((a, b) => a + b.cost, 0);
  check('/health spent matches ledger', r.json && Math.abs(r.json.spent - sum) < 1e-5 && r.json.calls > 0, `${r.json && r.json.spent} vs ${sum}`);

  console.log('robustness');
  const garbage = await rawSocket(P(), 'THIS IS NOT HTTP\r\n\r\n');
  check('garbage on the socket -> 400, no crash', /400/.test(garbage) || garbage === '');
  r = await hreq(P(), { method: 'POST', path: '/turn', headers: { 'X-Dingle-Token': PAGE, 'Content-Type': 'application/json' }, body: '' });
  check('empty body -> 400', r.status === 400);
  r = await hreq(P(), { path: '/health' });
  check('still alive', r.status === 200);

  /* restart on the same data dir: tokens persist */
  console.log('restart');
  await B.close();
  const logs2 = [];
  B = await startServer({ port: 0, log: (s) => logs2.push(s), stopPath });
  r = await hreq(P(), { path: '/health', headers: { 'X-Dingle-Token': PAIRED } });
  check('paired token survives restart', r.json && r.json.authed === true);
  r = await hreq(P(), { path: '/' });
  check('page token survives restart', r.text.includes(PAGE));
  await B.close();

  /* rate limits + loop detector + turns rotation on a fresh instance */
  console.log('rate limits / loop detector / rotation');
  const logs3 = [];
  const dataDir3 = path.join(tmp, 'data3');
  const B3 = await startServer({ port: 0, log: (s) => logs3.push(s), stopPath, dataDir: dataDir3, turnsMaxBytes: 3000 });
  const page3 = /token:'([0-9a-f]{64})'/.exec((await hreq(B3.port, { path: '/' })).text)[1];
  let okN = 0, last = null;
  for (let i = 0; i < 21; i++) {
    last = await hreq(B3.port, { method: 'POST', path: '/turn', headers: { 'X-Dingle-Token': page3 }, body: { lane: 'act', bot: 'honeybee_mc', payload: { obs: 'o' + i } } });
    if (last.json && last.json.ok) okN++;
  }
  check('20 calls/min per bot allowed', okN === 20, okN);
  check('21st -> 429 rate limited', last.status === 429 && last.json && last.json.error === 'rate limited', last.text);
  r = await hreq(B3.port, { method: 'POST', path: '/turn', headers: { 'X-Dingle-Token': page3 }, body: { lane: 'act', bot: 'BunkerBrad', payload: {} } });
  check('other bot unaffected', r.json && r.json.ok === true);
  check('loop detector warned', logs3.some((l) => /same act thought 6 times/.test(l)));
  check('turns.jsonl rotated past the size cap', fs.existsSync(path.join(dataDir3, 'turns.1.jsonl')));
  r = await hreq(B3.port, { method: 'POST', path: '/pair', body: { code: 'WRONG-WRONG' } });
  check('default wrong-code delay is ~1 s', r.json && r.json.ok === false && r.ms >= 900, r.ms);
  await B3.close();

  /* a payload that prompts.mjs cannot build must not use up the rate limit */
  const logs8 = [];
  const B8 = await startServer({ port: 0, log: (s) => logs8.push(s), stopPath, dataDir: path.join(tmp, 'data8'), limits: { perBot: 2 } });
  const page8 = /token:'([0-9a-f]{64})'/.exec((await hreq(B8.port, { path: '/' })).text)[1];
  h0 = fake.hits;
  const badBuild = [];
  for (let i = 0; i < 3; i++) badBuild.push(await hreq(B8.port, { method: 'POST', path: '/turn', headers: { 'X-Dingle-Token': page8 }, body: { lane: 'act', bot: 'BunkerBrad', payload: { obs: { toString: 1 } } } }));
  check('unbuildable payload -> 400 bad payload, no upstream call', badBuild.every((x) => x.status === 400 && x.json && x.json.error === 'bad payload') && fake.hits === h0, badBuild.map((x) => x.status + ' ' + x.text).join(' | '));
  const good8 = [];
  for (let i = 0; i < 3; i++) good8.push(await hreq(B8.port, { method: 'POST', path: '/turn', headers: { 'X-Dingle-Token': page8 }, body: { lane: 'act', bot: 'BunkerBrad', payload: { obs: 'o' + i } } }));
  check('rejected payloads did not count: 2 of 2 allowed, 3rd rate limited', good8[0].json?.ok === true && good8[1].json?.ok === true && good8[2].status === 429 && good8[2].json?.error === 'rate limited', good8.map((x) => x.status).join(','));
  await B8.close();

  const logs4 = [];
  const B4 = await startServer({ port: 0, log: (s) => logs4.push(s), stopPath, dataDir: path.join(tmp, 'data4'), limits: { global: 3 } });
  const page4 = /token:'([0-9a-f]{64})'/.exec((await hreq(B4.port, { path: '/' })).text)[1];
  const bots = ['BunkerBrad', 'xx_lilcreepah_xx', 'honeybee_mc', 'BunkerBrad'];
  const res4 = [];
  for (const b of bots) res4.push(await hreq(B4.port, { method: 'POST', path: '/turn', headers: { 'X-Dingle-Token': page4 }, body: { lane: 'mind', bot: b, payload: {} } }));
  check('global sliding window enforced', res4.slice(0, 3).every((x) => x.json && x.json.ok) && res4[3].status === 429 && res4[3].json.error === 'rate limited');
  await B4.close();

  /* fallback opt-out race: several turns in flight when the API refuses the beta */
  console.log('fallback race / cost estimate / cancelled turns');
  const logs7 = [];
  const dataDir7 = path.join(tmp, 'data7');
  const B7 = await startServer({ port: 0, log: (s) => logs7.push(s), stopPath, dataDir: dataDir7 });
  const page7 = /token:'([0-9a-f]{64})'/.exec((await hreq(B7.port, { path: '/' })).text)[1];
  const T7 = (body, extra = {}) => hreq(B7.port, { method: 'POST', path: '/turn', headers: { 'X-Dingle-Token': page7 }, body, ...extra });
  fake.rejectBeta = true; fake.delay = 250;
  h0 = fake.hits;
  const reqIdx7 = fake.requests.length;
  const race = await Promise.all(['BunkerBrad', 'xx_lilcreepah_xx', 'honeybee_mc'].map((b) => T7({ lane: 'act', bot: b, payload: { obs: 'race' } })));
  fake.rejectBeta = false; fake.delay = 0;
  const raceReqs = fake.requests.slice(reqIdx7);
  check('3 concurrent turns all refused the beta -> all retried without it and ok', race.every((x) => x.json && x.json.ok === true) && fake.hits - h0 === 6, `hits ${fake.hits - h0} ${race.map((x) => x.text).join(' | ')}`);
  check('exactly 3 beta requests and 3 plain retries', raceReqs.filter((q) => (q.beta || '').includes('server-side-fallback')).length === 3 && raceReqs.filter((q) => !(q.beta || '').includes('server-side-fallback') && !('fallbacks' in (q.body || {}))).length === 3);
  check('fallbacks off afterwards, opt-out logged once', B7.state().fallbacks === false && logs7.filter((l) => /refused the server-side fallback/.test(l)).length === 1);

  const spend7 = () => fs.readFileSync(path.join(dataDir7, 'spend.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const opusTop = costOf('claude-opus-5-5', FAKE_USAGE), sonnetTop = costOf('claude-sonnet-5-5', FAKE_USAGE);
  fake.queue.push('fallbackServed');
  r = await T7({ lane: 'mind', bot: 'honeybee_mc', payload: {} });
  let sl = spend7().at(-1);
  const declined = costOf('claude-opus-5-5', { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 });
  check('fallback-served turn: ok, ledger marks fallback + requested model', r.json && r.json.ok === true && sl.fallback === true && sl.model === 'claude-sonnet-5-5' && sl.requested_model === 'claude-opus-5-5', JSON.stringify(sl));
  check('fallback-served turn priced with every iteration (not the cheap model only)', near(sl.cost, Math.round((declined + sonnetTop) * 1e6) / 1e6) && sl.cost > opusTop, `${sl.cost} vs ${declined + sonnetTop}`);
  fake.queue.push('unknownModel');
  r = await T7({ lane: 'mind', bot: 'BunkerBrad', payload: {} });
  sl = spend7().at(-1);
  check('unknown answering model on an Opus turn priced at Opus rate', r.json && r.json.ok === true && near(sl.cost, Math.round(opusTop * 1e6) / 1e6) && sl.requested_model === 'claude-opus-5-5', JSON.stringify(sl));
  fake.queue.push('opusAnswer');
  r = await T7({ lane: 'act', bot: 'BunkerBrad', payload: { obs: 'x' } });
  sl = spend7().at(-1);
  check('Sonnet turn answered by Opus priced at Opus rate', r.json && r.json.ok === true && near(sl.cost, Math.round(opusTop * 1e6) / 1e6) && !sl.fallback, JSON.stringify(sl));
  r = await T7({ lane: 'act', bot: 'xx_lilcreepah_xx', payload: { obs: 'x' } });
  sl = spend7().at(-1);
  check('normal turn priced at its own rate, no fallback fields', near(sl.cost, Math.round(sonnetTop * 1e6) / 1e6) && !('fallback' in sl) && !('requested_model' in sl), JSON.stringify(sl));

  /* the game gives up on a turn: the API call is cancelled and logged as possible spend */
  fake.delay = 1200;
  r = await T7({ lane: 'build', bot: 'BunkerBrad', payload: { goal: 'x' } }, { abortAfter: 200 });
  await sleep(400);
  fake.delay = 0;
  check('cancelled turn logs "possible unrecorded spend"', logs7.some((l) => /cancelled - possible unrecorded spend/.test(l)), logs7.slice(-3).join(' / '));
  sl = spend7().at(-1);
  check('cancelled turn noted in spend.jsonl with cost 0', sl.cancelled === true && sl.cost === 0 && sl.lane === 'build' && /unrecorded/.test(sl.note), JSON.stringify(sl));
  r = await T7({ lane: 'build', bot: 'BunkerBrad', payload: { goal: 'x' } });
  check('slot freed after cancel', r.json && r.json.ok === true, r.text);
  r = await hreq(B7.port, { path: '/health' });
  const sum7 = spend7().reduce((a, b) => a + b.cost, 0);
  check('B7 /health spent matches its ledger', r.json && Math.abs(r.json.spent - sum7) < 1e-5, `${r.json && r.json.spent} vs ${sum7}`);
  await sleep(1000); // let the fake finish the abandoned request
  await B7.close();

  /* no key -> server runs, /health key:false, /turn 503 */
  console.log('missing key');
  delete process.env.DINGLE_TEST_KEY;
  const logs5 = [];
  const B5 = await startServer({ port: 0, log: (s) => logs5.push(s), stopPath, dataDir: path.join(tmp, 'data5') });
  r = await hreq(B5.port, { path: '/health' });
  check('no key -> /health key:false', r.json && r.json.ok === true && r.json.key === false);
  const page5 = /token:'([0-9a-f]{64})'/.exec((await hreq(B5.port, { path: '/' })).text)[1];
  h0 = fake.hits;
  r = await hreq(B5.port, { method: 'POST', path: '/turn', headers: { 'X-Dingle-Token': page5 }, body: turnAct });
  check('no key -> 503 ANTHROPIC_API_KEY missing', r.status === 503 && r.json.error === 'ANTHROPIC_API_KEY missing' && fake.hits === h0, r.text);
  check('banner says missing by name', logs5.some((l) => l.includes('ANTHROPIC_API_KEY missing')));
  await B5.close();
  process.env.DINGLE_TEST_KEY = SENTINEL;

  /* outside NODE_ENV=test, DINGLE_UPSTREAM and ANTHROPIC_BASE_URL are ignored (no request is made) */
  console.log('base URL lock');
  process.env.NODE_ENV = 'production';
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${upPort}`;
  const logs6 = [];
  const B6 = await startServer({ port: 0, log: (s) => logs6.push(s), stopPath, dataDir: path.join(tmp, 'data6'), envPath });
  check('non-test mode: upstream locked to api.anthropic.com', B6.state().testMode === false && B6.state().upstream === 'https://api.anthropic.com', B6.state().upstream);
  await B6.close();
  delete process.env.ANTHROPIC_BASE_URL;
  process.env.NODE_ENV = 'test';

  /* repo layout: every default is repo-relative, nothing absolute is baked into the source */
  console.log('repo defaults');
  const REPO = path.resolve(HERE, '..');
  check('default env path is <repo>/.env', BRAIN_DEFAULTS.envPath === path.join(REPO, '.env'), BRAIN_DEFAULTS.envPath);
  check('default game dir is <repo>/dist', BRAIN_DEFAULTS.gameDir === path.join(REPO, 'dist'), BRAIN_DEFAULTS.gameDir);
  check('default data dir is brain/data', BRAIN_DEFAULTS.dataDir === path.join(HERE, 'data'), BRAIN_DEFAULTS.dataDir);
  const banned = [['', 'Users', ''].join('/'), ['', 'home', ''].join('/'), ['', 'private', 'tmp'].join('/')];
  /* plus the owner's private terms, from the local untracked list if there is one (tools/lib/private_terms.cjs; none in CI) */
  let privRules = [];
  try { privRules = createRequire(import.meta.url)('../tools/lib/private_terms.cjs').load().rules; } catch (e) { privRules = []; }
  const srcFiles = fs.readdirSync(HERE).filter((n) => /\.mjs$/.test(n));
  const hits = srcFiles.flatMap((n) => { const t = fs.readFileSync(path.join(HERE, n), 'utf8'); return banned.filter((b) => t.includes(b)).map((b) => n + ':' + banned.indexOf(b)).concat(privRules.filter(([, re]) => re.test(t)).map(([r]) => n + ':' + r)); });
  check('no absolute path literal or private term in brain/*.mjs', srcFiles.length >= 3 && hits.length === 0, hits.join(' '));
  const savedGD = process.env.DINGLE_GAME_DIR;
  delete process.env.DINGLE_GAME_DIR;
  const logs9 = [];
  const B9 = await startServer({ port: 0, log: (s) => logs9.push(s), stopPath, dataDir: path.join(tmp, 'data9') });
  check('DINGLE_GAME_DIR unset -> serves <repo>/dist', B9.state().gameDir === BRAIN_DEFAULTS.gameDir, B9.state().gameDir);
  await B9.close();
  process.env.DINGLE_GAME_DIR = savedGD;
  const B9b = await startServer({ port: 0, log: (s) => logs9.push(s), stopPath, dataDir: path.join(tmp, 'data9') });
  check('DINGLE_GAME_DIR still overrides the default', B9b.state().gameDir === path.resolve(gameDir), B9b.state().gameDir);
  await B9b.close();

  /* key sources: test mode reads neither a file nor the shell; real mode = file first, then the environment */
  console.log('key sources');
  const savedEP = process.env.DINGLE_ENV_PATH;
  delete process.env.DINGLE_TEST_KEY;
  delete process.env.DINGLE_ENV_PATH;
  process.env.ANTHROPIC_API_KEY = ENV_SENTINEL;
  const logs10 = [];
  const B10 = await startServer({ port: 0, log: (s) => logs10.push(s), stopPath, dataDir: path.join(tmp, 'data10') });
  r = await hreq(B10.port, { path: '/health' });
  check('test mode ignores the shell ANTHROPIC_API_KEY', r.json && r.json.key === false && B10.state().keySource === null, r.text);
  check('test mode never looks at the repo .env (no env path at all)', B10.state().envPath === null, String(B10.state().envPath));
  await B10.close();
  const logs11 = [];
  const B11 = await startServer({ port: 0, log: (s) => logs11.push(s), stopPath, dataDir: path.join(tmp, 'data11'), envPath });
  r = await hreq(B11.port, { path: '/health' });
  check('test mode ignores an explicit .env file too', r.json && r.json.key === false && B11.state().keySource === null, r.text);
  await B11.close();
  process.env.NODE_ENV = 'production';
  const logs12 = [];
  const B12 = await startServer({ port: 0, log: (s) => logs12.push(s), stopPath, dataDir: path.join(tmp, 'data12'), envPath });
  check('real mode: the .env file wins over the environment', B12.state().keySource === 'file' && logs12.some((l) => l.includes('ANTHROPIC_API_KEY found (from the .env file)')), B12.state().keySource);
  await B12.close();
  const noKeyEnv = path.join(tmp, 'nokey.env');
  fs.writeFileSync(noKeyEnv, 'OTHER_KEY=nope\n');
  const logs13 = [];
  const B13 = await startServer({ port: 0, log: (s) => logs13.push(s), stopPath, dataDir: path.join(tmp, 'data13'), envPath: noKeyEnv });
  check('real mode: falls back to the environment when the file has no key', B13.state().keySource === 'env' && logs13.some((l) => l.includes('ANTHROPIC_API_KEY found (from the environment)')), B13.state().keySource);
  check('real mode: upstream still locked to api.anthropic.com', B13.state().upstream === 'https://api.anthropic.com', B13.state().upstream);
  await B13.close();
  delete process.env.ANTHROPIC_API_KEY;
  const logs14 = [];
  const B14 = await startServer({ port: 0, log: (s) => logs14.push(s), stopPath, dataDir: path.join(tmp, 'data14'), envPath: noKeyEnv });
  check('real mode: neither -> missing, banner names the variable and both options', B14.state().keySource === null && logs14.some((l) => l.includes('ANTHROPIC_API_KEY missing') && l.includes('.env.example') && l.includes('export')), logs14.find((l) => l.includes('API key')));
  await B14.close();
  process.env.NODE_ENV = 'test';
  process.env.DINGLE_TEST_KEY = SENTINEL;
  process.env.DINGLE_ENV_PATH = savedEP;
  const keyLogs = [...logs9, ...logs10, ...logs11, ...logs12, ...logs13, ...logs14].join('\n');
  check('key-source instances: neither fake key in any log line', keyLogs.length > 0 && !keyLogs.includes(SENTINEL) && !keyLogs.includes(ENV_SENTINEL));

  /* the sentinel key must never leak */
  console.log('secret hygiene');
  const logSets = { logs, logs2, logs3, logs4, logs5, logs6, logs7, logs8, logs9, logs10, logs11, logs12, logs13, logs14 };
  check('every server instance log was captured', Object.values(logSets).every((l) => l.length > 0), Object.entries(logSets).map(([k, v]) => k + ':' + v.length).join(' '));
  const allLogs = Object.values(logSets).flat().join('\n');
  check('B6 (real-mode instance, reads the temp .env with the sentinel) log captured and clean', logs6.length > 0 && !logs6.join('\n').includes(SENTINEL) && logs6.some((l) => l.includes('ANTHROPIC_API_KEY found')));
  check('sentinel not in any HTTP response', allResponses.length > 50 && !allResponses.some((t) => t.includes(SENTINEL)), allResponses.length);
  check('sentinel not in server log output', !allLogs.includes(SENTINEL) && !allLogs.includes(ENV_SENTINEL));
  const dataFiles = [dataDir, dataDir3, path.join(tmp, 'data4'), path.join(tmp, 'data5'), path.join(tmp, 'data6'), dataDir7, path.join(tmp, 'data8'),
    ...[9, 10, 11, 12, 13, 14].map((n) => path.join(tmp, 'data' + n))].flatMap((d) => (fs.existsSync(d) ? walk(d) : []));
  check('sentinel not in any data file', dataFiles.length > 0 && !dataFiles.some((f) => { const t = fs.readFileSync(f, 'utf8'); return t.includes(SENTINEL) || t.includes(ENV_SENTINEL); }), dataFiles.length);
  const toks = [PAGE, PAIRED, PAIRED2, page3, page4, page7, page8];
  check('all test tokens captured', toks.every((t) => /^[0-9a-f]{64}$/.test(t || '')));
  check('tokens not in server log output', !toks.some((t) => allLogs.includes(t)));
  const ledgers = dataFiles.filter((f) => /\.jsonl$/.test(f));
  check('tokens not in spend/turns ledgers', ledgers.length > 0 && !ledgers.some((f) => { const t = fs.readFileSync(f, 'utf8'); return toks.some((k) => t.includes(k)); }));

  await new Promise((r2) => { upstream.close(() => r2()); upstream.closeAllConnections(); });
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
}

main().catch((e) => { failed++; console.log('  FAIL selftest crashed: ' + String(e && e.stack).replaceAll(SENTINEL, '[sentinel]')); }).finally(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
