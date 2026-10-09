/* DINGLECRAFT AI BRAIN - local server that holds the Anthropic key.
   The game page only ever sends JSON observations here; this process builds the
   Claude request (prompts.mjs), calls the API, and hands back the parsed JSON.

   Run:  npm run brain                (from the repo root; or double-click "Start AI Brain.command")
   Open: http://127.0.0.1:8644/
   It serves the newest dist/dinglecraft_v<maj>.<min>.html (run `npm run build` first).

   The key (bring your own; see .env.example and brain/README.md), first match wins:
     1. the dotenv file named by DINGLE_ENV_PATH, else the repo's own .env (gitignored);
     2. the ANTHROPIC_API_KEY environment variable of the shell that started the brain.
   Test mode (NODE_ENV=test + DINGLE_UPSTREAM, used by selftest.mjs) reads neither: it uses
   DINGLE_TEST_KEY and a fake local upstream.

   Security model
   - Listens on 127.0.0.1 only. Host header must be 127.0.0.1:<port> or localhost:<port>
     (blocks DNS rebinding). Unknown Origins get 403.
   - Every spending endpoint needs X-Dingle-Token: the page token (injected into the
     game HTML this server serves) or a token issued by /pair (for file:// pages).
   - The game HTML (it carries the page token) is never sent with CORS headers, and
     only to top-level loads that did not come from another site (Sec-Fetch-Site).
   - The key is read inside this process only (the .env file, else the environment). It is
     never logged, returned, or written anywhere. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { buildRequest, costOf, clampOut, PERSONAS, PRICES } from './prompts.mjs';

const VERSION = '1.0';
const BRAIN_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(BRAIN_DIR, '..');
/* repo-relative defaults: no absolute path is ever written into the source */
const DEFAULT_ENV_PATH = path.resolve(REPO_DIR, '.env');
const DEFAULT_GAME_DIR = path.resolve(REPO_DIR, 'dist');
const DEFAULT_DATA_DIR = path.join(BRAIN_DIR, 'data');
export const BRAIN_DEFAULTS = Object.freeze({ envPath: DEFAULT_ENV_PATH, gameDir: DEFAULT_GAME_DIR, dataDir: DEFAULT_DATA_DIR });
const DEFAULT_PORT = 8644;
const GAME_PORT = 8643;
const KEY_VAR = 'ANTHROPIC_API_KEY';
const REAL_API = 'https://api.anthropic.com';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

const LANES = new Set(['act', 'build', 'mind']);
const BOTS = new Set(['BunkerBrad', 'xx_lilcreepah_xx', 'honeybee_mc']);
const BODY_CAP = 64 * 1024;
const VERSION_RE = /^dinglecraft_v(\d+)\.(\d+)\.html$/;
const HEX64 = /^[0-9a-f]{64}$/;
/* total time budget per /turn (both attempts), kept under the game's own fetch timeout
   (30 s for act, 60 s for build/mind) so we never pay for answers nobody waits for */
const LANE_DEADLINE_MS = { act: 28000, mind: 58000, build: 58000 };
const SILENT_LOGGER = { error() {}, warn() {}, info() {}, debug() {} };

for (const b of BOTS) if (!PERSONAS[b]) throw new Error('prompts.mjs has no persona for ' + b);

/* ------------------------------------------------------------------ env -- */

/* Read ONLY ANTHROPIC_API_KEY from a dotenv file. Handles CRLF, BOM, comments,
   `export NAME=...`, single/double quotes. Returns the value or null. */
export function readKeyFromEnvFile(file) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch { return null; }
  if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
  let found = null;
  for (const raw of txt.split(/\r?\n|\r/)) {
    let line = raw.trim();
    if (!line || line[0] === '#') continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    if (line.slice(0, eq).trim() !== KEY_VAR) continue;
    let v = line.slice(eq + 1).trim();
    const q = v[0];
    if (q === '"' || q === "'") {
      const end = v.indexOf(q, 1);
      v = end > 0 ? v.slice(1, end) : v.slice(1);
    } else {
      const hash = v.search(/\s#/);
      if (hash >= 0) v = v.slice(0, hash);
    }
    v = v.trim();
    found = v || null; // last definition wins, like dotenv
  }
  return found;
}

/* ---------------------------------------------------------------- utils -- */

const randHex = (bytes) => crypto.randomBytes(bytes).toString('hex');
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const round6 = (n) => Math.round(n * 1e6) / 1e6;
const hhmmss = () => new Date().toTimeString().slice(0, 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function safeEqual(a, b) {
  return crypto.timingSafeEqual(sha(a), sha(b));
}

/* Pairing codes: 10 Crockford base32 characters (~50 bits), shown as XXXXX-XXXXX.
   Long enough that guessing from a hostile page is hopeless even with rotation. */
const PAIR_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PAIR_LEN = 10;
function newPairCode(prev) {
  let c;
  do {
    c = '';
    for (let i = 0; i < PAIR_LEN; i++) c += PAIR_ALPHABET[crypto.randomInt(0, PAIR_ALPHABET.length)];
  } while (c === prev);
  return c;
}
const fmtPairCode = (c) => c.slice(0, 5) + '-' + c.slice(5);
/* forgiving input: any case, spaces/hyphens ignored, I/L read as 1 and O as 0 */
function normPairCode(s) {
  return String(s == null ? '' : s).slice(0, 64).toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
}

function isTestMode() {
  return process.env.NODE_ENV === 'test' && !!process.env.DINGLE_UPSTREAM;
}

/* --------------------------------------------------------------- server -- */

export async function startServer(opts = {}) {
  const testMode = isTestMode();
  const log0 = typeof opts.log === 'function' ? opts.log : (s) => console.log(s);
  const gameDir = path.resolve(opts.gameDir || process.env.DINGLE_GAME_DIR || DEFAULT_GAME_DIR);
  const dataDir = path.resolve(opts.dataDir || process.env.DINGLE_DATA_DIR || DEFAULT_DATA_DIR);
  const stopPath = path.resolve(opts.stopPath || path.join(BRAIN_DIR, 'STOP'));
  /* in test mode we never fall back to the real .env */
  const envPath = opts.envPath || process.env.DINGLE_ENV_PATH || (testMode ? null : DEFAULT_ENV_PATH);
  const wantPort = opts.port != null ? Number(opts.port) : Number(process.env.DINGLE_BRAIN_PORT || DEFAULT_PORT);
  const limits = { perBot: 20, global: 60, ...(opts.limits || {}) };
  const turnsMaxBytes = opts.turnsMaxBytes || 20 * 1024 * 1024;
  const pairDelayMs = opts.pairDelayMs != null ? Math.max(0, Number(opts.pairDelayMs) || 0) : 1000;

  /* --- upstream / key --- */
  let upstreamURL = REAL_API;
  if (testMode) {
    const u = String(process.env.DINGLE_UPSTREAM);
    if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(u)) {
      throw new Error('DINGLE_UPSTREAM must be a local http://127.0.0.1:<port> URL in test mode');
    }
    upstreamURL = u.replace(/\/$/, '');
  }

  let apiKey = null;
  let client = null;
  let keyBad = false;
  let lastKeyCheck = 0;

  function makeClient(key) {
    return new Anthropic({
      apiKey: key,
      authToken: null,          // never pick up ANTHROPIC_AUTH_TOKEN from the shell
      baseURL: upstreamURL,     // always explicit: ANTHROPIC_BASE_URL from the shell is ignored
      maxRetries: 0,            // we do our own single retry
      timeout: 60000,
      logLevel: 'off',
      logger: SILENT_LOGGER,
    });
  }

  /* where the current key came from: 'test' | 'file' | 'env' | null (a name, never the value) */
  let keySource = null;
  const okKey = (k) => (k && !/\s/.test(k) ? k : null);
  function loadKey() {
    if (testMode) return { key: okKey(process.env.DINGLE_TEST_KEY || null), source: 'test' };
    const fromFile = okKey(envPath ? readKeyFromEnvFile(envPath) : null);
    if (fromFile) return { key: fromFile, source: 'file' };
    const fromEnv = okKey(process.env[KEY_VAR] || null);
    if (fromEnv) return { key: fromEnv, source: 'env' };
    return { key: null, source: null };
  }
  const sourceText = (s) => (s === 'test' ? 'test mode, fake upstream' : s === 'file' ? 'from the .env file' : s === 'env' ? 'from the environment' : 'missing');

  function setKey(k, source) {
    apiKey = k;
    keySource = k ? source : null;
    client = k ? makeClient(k) : null;
    keyBad = false;
  }
  { const l = loadKey(); setKey(l.key, l.source); }

  /* re-read the .env (and the environment) when the key is missing or was rejected, so Dan
     can fix it without restarting (throttled; real mode only) */
  function refreshKeyIfNeeded() {
    if (testMode || (client && !keyBad)) return;
    const now = Date.now();
    if (now - lastKeyCheck < 5000) return;
    lastKeyCheck = now;
    const l = loadKey();
    if (l.key && l.key !== apiKey) { setKey(l.key, l.source); out(`[brain] ${KEY_VAR} (re)loaded ${sourceText(l.source)}`); }
  }

  /* --- redaction: nothing secret ever reaches the terminal or a file --- */
  function scrub(s) {
    let t = String(s);
    if (apiKey) t = t.split(apiKey).join('[redacted]');
    for (const tok of [tokens.page, ...tokens.paired]) if (tok) t = t.split(tok).join('[redacted]');
    return t.replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, '[redacted]');
  }
  function out(s) { try { log0(scrub(s)); } catch { /* logging must never crash the server */ } }

  /* --- data dir + tokens --- */
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const tokPath = path.join(dataDir, 'tokens.json');
  const spendPath = path.join(dataDir, 'spend.jsonl');
  const turnsPath = path.join(dataDir, 'turns.jsonl');

  let tokens = { page: '', paired: [] };
  let tokHashes = [];
  function saveTokens() {
    const tmp = tokPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(tokens, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, tokPath);
    tokHashes = [tokens.page, ...tokens.paired].map(sha);
  }
  (function loadTokens() {
    let t = null;
    try { t = JSON.parse(fs.readFileSync(tokPath, 'utf8')); } catch { t = null; }
    const paired = t && Array.isArray(t.paired) ? t.paired.filter((x) => typeof x === 'string' && HEX64.test(x)) : [];
    const page = t && typeof t.page === 'string' && HEX64.test(t.page) ? t.page : randHex(32);
    tokens = { page, paired: paired.slice(-50) };
    saveTokens();
  })();

  function isAuthed(req) {
    const h = req.headers['x-dingle-token'];
    if (typeof h !== 'string' || !h || h.length > 200) return false;
    const hh = sha(h);
    let ok = false;
    for (const th of tokHashes) if (crypto.timingSafeEqual(hh, th)) ok = true; // no early exit
    return ok;
  }

  /* --- session state --- */
  const S = {
    spent: 0, calls: 0, paused: false, fallbacks: true,
    inflight: new Set(), botCalls: new Map(), globalCalls: [],
    loop: new Map(),
    pairCode: newPairCode(), pairWrong: 0,
  };

  function rotatePairCode(why) {
    S.pairCode = newPairCode(S.pairCode);
    S.pairWrong = 0;
    out(`[pair] ${why} - new pairing code for file:// pages: ${fmtPairCode(S.pairCode)}`);
  }

  /* --- files --- */
  function appendLine(file, obj) {
    try { fs.appendFileSync(file, scrub(JSON.stringify(obj)) + '\n'); } catch (e) { out('[brain] could not write ' + path.basename(file) + ': ' + e.code); }
  }
  function appendTurn(obj) {
    try {
      const st = fs.statSync(turnsPath, { throwIfNoEntry: false });
      if (st && st.size > turnsMaxBytes) fs.renameSync(turnsPath, turnsPath.replace(/\.jsonl$/, '.1.jsonl'));
    } catch { /* ignore */ }
    appendLine(turnsPath, obj);
  }

  /* --- HTML serving --- */
  function listVersions() {
    let names = [];
    try { names = fs.readdirSync(gameDir); } catch { return []; }
    const v = [];
    for (const n of names) {
      const m = VERSION_RE.exec(n);
      if (!m) continue;
      try { if (!fs.lstatSync(path.join(gameDir, n)).isFile()) continue; } catch { continue; }
      v.push({ name: n, major: Number(m[1]), minor: Number(m[2]) });
    }
    return v.sort((a, b) => a.major - b.major || a.minor - b.minor);
  }
  function injectToken(html) {
    const snippet = `<script>window.__DINGLE_BRAIN={url:'',token:'${tokens.page}'};</script>`;
    /* first real <head> tag, skipping anything inside <!-- comments --> (an unclosed
       comment runs to the end of the file, so nothing after it counts) */
    const re = /<!--[\s\S]*?(?:-->|$)|<head(?:\s[^>]*)?>/gi;
    let m;
    while ((m = re.exec(html))) {
      if (m[0].startsWith('<!--')) continue;
      const at = m.index + m[0].length;
      return html.slice(0, at) + snippet + html.slice(at);
    }
    return snippet + html;
  }
  /* The game HTML carries the page token, so it is never sent with CORS headers and
     only to top-level loads that did not come from another site. */
  function serveGame(res, name) {
    const versions = listVersions();
    const pick = name ? versions.find((v) => v.name === name) : versions[versions.length - 1];
    if (!pick) return sendJSON(res, 404, { ok: false, error: name ? 'not found' : 'no dinglecraft_v*.html in the game folder' });
    let html;
    try { html = fs.readFileSync(path.join(gameDir, pick.name), 'utf8'); } catch { return sendJSON(res, 404, { ok: false, error: 'not found' }); }
    const body = Buffer.from(injectToken(html), 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Vary': 'Origin, Sec-Fetch-Site',
    });
    res.end(body);
  }

  /* --- responses --- */
  function sendJSON(res, status, obj, cors = {}, extra = {}) {
    if (res.headersSent || res.writableEnded) return;
    const body = Buffer.from(JSON.stringify(obj), 'utf8');
    res.writeHead(status, {
      ...cors, ...extra,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const cl = Number(req.headers['content-length']);
      if (Number.isFinite(cl) && cl > BODY_CAP) { req.resume(); return reject(Object.assign(new Error('too large'), { http: 413 })); }
      const chunks = [];
      let size = 0, done = false;
      req.on('data', (c) => {
        if (done) return;
        size += c.length;
        if (size > BODY_CAP) { done = true; chunks.length = 0; reject(Object.assign(new Error('too large'), { http: 413 })); return; }
        chunks.push(c);
      });
      req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(chunks).toString('utf8')); } });
      req.on('error', (e) => { if (!done) { done = true; reject(e); } });
    });
  }
  async function readJSON(req, res, cors) {
    let raw;
    try { raw = await readBody(req); } catch (e) {
      if (e.http === 413) sendJSON(res, 413, { ok: false, error: 'body too large (64 KB max)' }, cors, { Connection: 'close' });
      else sendJSON(res, 400, { ok: false, error: 'bad body' }, cors);
      return undefined;
    }
    try {
      const j = JSON.parse(raw);
      if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('not an object');
      return j;
    } catch {
      sendJSON(res, 400, { ok: false, error: 'bad json' }, cors);
      return undefined;
    }
  }

  /* --- rate limiting (runaway protection, not a budget) --- */
  function rateOk(bot) {
    const now = Date.now(), cut = now - 60000;
    S.globalCalls = S.globalCalls.filter((t) => t > cut);
    const b = (S.botCalls.get(bot) || []).filter((t) => t > cut);
    S.botCalls.set(bot, b);
    if (b.length >= limits.perBot || S.globalCalls.length >= limits.global) return false;
    b.push(now); S.globalCalls.push(now);
    return true;
  }

  /* --- cost estimate: errs high, never low ---
     A server-side fallback can answer with a different model than we asked for, and
     costOf() prices unknown models at Sonnet rates. So price the call at whichever of
     the requested / answering model is dearer, and if usage.iterations is present,
     also sum each iteration at its own model and keep the larger total. */
  function priceAt(model, usage) {
    try { return Number(costOf(model, usage)) || 0; } catch { return 0; }
  }
  function estimateCost(requested, answered, usage, iters) {
    const top = Math.max(priceAt(requested, usage), priceAt(answered, usage));
    let sum = 0;
    for (const it of iters) {
      const t = {
        input_tokens: Number(it.input_tokens) || 0,
        output_tokens: Number(it.output_tokens) || 0,
        cache_read_input_tokens: Number(it.cache_read_input_tokens) || 0,
        cache_creation_input_tokens: Number(it.cache_creation_input_tokens) || 0,
      };
      sum += typeof it.model === 'string' && it.model
        ? Math.max(priceAt(it.model, t), it.model in PRICES ? 0 : priceAt(requested, t))
        : Math.max(priceAt(requested, t), priceAt(answered, t));
    }
    return Math.max(top, sum);
  }

  /* --- upstream call with our own retry policy --- */
  function classify(e) {
    const status = typeof e?.status === 'number' ? e.status : null;
    const inner = e?.error?.error || e?.error || {};
    const type = String(e?.type || inner?.type || '');
    const msg = String(inner?.message || e?.message || '');
    const hay = (type + ' ' + msg).toLowerCase();
    let kind;
    if (hay.includes('enforced_spend_limit') || hay.includes('credit balance') || type === 'billing_error' || status === 402) kind = 'spend';
    else if (e instanceof Anthropic.APIUserAbortError) kind = 'aborted';
    else if (status === 401 || status === 403) kind = 'auth';
    else if (status === 400) kind = 'bad_request';
    else if (status === 429 || status === 529 || (status && status >= 500)) kind = 'transient';
    else if (e instanceof Anthropic.APIConnectionError) kind = 'transient'; // network error / timeout
    else if (status) kind = 'other';
    else kind = 'internal';
    /* a timed-out or cancelled request may still have been billed upstream */
    const unrecorded = kind === 'aborted' || e instanceof Anthropic.APIConnectionTimeoutError;
    return { kind, status, type, unrecorded, msg: scrub(msg).replace(/\s+/g, ' ').slice(0, 240) };
  }

  async function callUpstream(req, lane, signal) {
    const deadline = Date.now() + LANE_DEADLINE_MS[lane];
    let retried = false, fallbackRetried = false;
    for (;;) {
      const timeout = Math.max(1000, deadline - Date.now());
      /* remember what THIS attempt sent: concurrent calls may flip S.fallbacks meanwhile */
      const sentFb = S.fallbacks;
      try {
        if (sentFb) {
          return await client.beta.messages.create({ ...req, betas: [FALLBACK_BETA], fallbacks: 'default' }, { timeout, signal });
        }
        return await client.messages.create(req, { timeout, signal });
      } catch (e) {
        const c = classify(e);
        if (c.kind === 'bad_request' && sentFb && !fallbackRetried && /fallback|beta|unknown parameter|extra inputs/i.test(c.msg)) {
          fallbackRetried = true;
          if (S.fallbacks) {
            S.fallbacks = false;
            out('[brain] API refused the server-side fallback option - continuing without it for this session');
          }
          continue;
        }
        if (c.kind === 'transient' && !retried && deadline - Date.now() > 4000 && !signal.aborted) {
          retried = true;
          await sleep(800 + Math.random() * 800);
          continue;
        }
        throw Object.assign(new Error('upstream'), { c });
      }
    }
  }

  /* --- /turn --- */
  async function handleTurn(req, res, cors) {
    if (!isAuthed(req)) return sendJSON(res, 401, { ok: false, error: 'not paired' }, cors);
    const j = await readJSON(req, res, cors);
    if (j === undefined) return;
    const { lane, bot } = j;
    if (typeof lane !== 'string' || !LANES.has(lane)) return sendJSON(res, 400, { ok: false, error: 'bad lane' }, cors);
    if (typeof bot !== 'string' || !BOTS.has(bot)) return sendJSON(res, 400, { ok: false, error: 'bad bot' }, cors);
    const payload = j.payload == null ? {} : j.payload;
    if (typeof payload !== 'object' || Array.isArray(payload)) return sendJSON(res, 400, { ok: false, error: 'bad payload' }, cors);
    if (fs.existsSync(stopPath)) return sendJSON(res, 503, { ok: false, error: 'stopped (brain/STOP exists)' }, cors);
    refreshKeyIfNeeded();
    if (!client) return sendJSON(res, 503, { ok: false, error: `${KEY_VAR} missing` }, cors);

    /* build first, so a payload that prompts.mjs rejects never counts against the limits */
    let request;
    try { request = buildRequest(lane, bot, payload); } catch { return sendJSON(res, 400, { ok: false, error: 'bad payload' }, cors); }
    if (!request || typeof request !== 'object' || !Array.isArray(request.messages)) return sendJSON(res, 400, { ok: false, error: 'bad payload' }, cors);

    const slot = bot + '|' + lane;
    if (S.inflight.has(slot)) return sendJSON(res, 429, { ok: false, error: 'busy' }, cors);
    if (!rateOk(bot)) return sendJSON(res, 429, { ok: false, error: 'rate limited' }, cors);

    S.inflight.add(slot);
    S.calls++;
    const ac = new AbortController();
    const onClose = () => { if (!res.writableFinished) ac.abort(); };
    res.on('close', onClose);
    const t0 = Date.now();
    const tag = `${hhmmss()} ${bot.padEnd(16)} ${lane.padEnd(5)}`;
    try {
      let resp;
      try {
        resp = await callUpstream(request, lane, ac.signal);
      } catch (e) {
        const ms = Date.now() - t0;
        const c = (e && e.c) || { kind: 'internal', status: null, msg: scrub(e && e.message ? e.message : String(e)).slice(0, 240) };
        let status = 502, body;
        if (c.kind === 'spend') {
          S.paused = true; status = 402;
          body = { ok: false, paused: true, error: 'Anthropic spend limit / credit reached - top up in the Console' };
        } else if (c.kind === 'auth') {
          keyBad = true;
          body = { ok: false, error: `${KEY_VAR} rejected (${c.status})` };
        } else if (c.kind === 'aborted') {
          body = { ok: false, error: 'cancelled (the game stopped waiting)' };
        } else if (c.kind === 'transient') {
          body = { ok: false, error: c.status ? `Anthropic API busy/unavailable (${c.status})` : 'could not reach the Anthropic API (network/timeout)' };
          status = 503;
        } else if (c.status) {
          body = { ok: false, error: `Anthropic API error ${c.status}: ${c.msg}` };
        } else {
          body = { ok: false, error: 'internal error' };
          status = 500;
        }
        body.ms = ms; body.spent = round6(S.spent);
        out(`${tag} ${String(ms).padStart(6)}ms  FAIL  ${body.error}${c.kind === 'internal' && c.msg ? ' (' + c.msg + ')' : ''}`);
        if (c.unrecorded) {
          /* the API may bill a request we stopped waiting for; we never see its usage */
          out(`${tag} cancelled - possible unrecorded spend (not in the session total)`);
          appendLine(spendPath, { ts: new Date().toISOString(), lane, bot, model: request.model, ms, cancelled: true, cost: 0, note: 'possible unrecorded spend' });
        }
        return sendJSON(res, status, body, cors);
      }

      const ms = Date.now() - t0;
      const u = resp.usage || {};
      const usage = {
        input_tokens: u.input_tokens || 0,
        output_tokens: u.output_tokens || 0,
        cache_read_input_tokens: u.cache_read_input_tokens || 0,
        cache_creation_input_tokens: u.cache_creation_input_tokens || 0,
      };
      const model = typeof resp.model === 'string' && resp.model ? resp.model : request.model;
      const iters = Array.isArray(u.iterations) ? u.iterations.filter((i) => i && typeof i === 'object') : [];
      const fallback = iters.some((i) => i.type === 'fallback_message');
      const cost = estimateCost(request.model, model, usage, iters);
      S.spent += cost;
      S.paused = false;
      keyBad = false;
      appendLine(spendPath, {
        ts: new Date().toISOString(), lane, bot, model, ms, usage, cost: round6(cost),
        ...(model !== request.model ? { requested_model: request.model } : {}),
        ...(fallback ? { fallback: true } : {}),
      });

      const text = (Array.isArray(resp.content) ? resp.content : [])
        .filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('');
      let parsed = null, error = null;
      if (resp.stop_reason === 'refusal') error = 'refusal';
      else {
        let obj;
        try { obj = JSON.parse(text); } catch { error = resp.stop_reason === 'max_tokens' ? 'truncated' : 'bad output'; }
        if (!error) {
          try { parsed = clampOut(lane, obj); } catch { parsed = null; }
          if (!parsed) error = 'bad output';
        }
      }

      const userText = request.messages && request.messages[0] ? request.messages[0].content : '';
      appendTurn({
        ts: new Date().toISOString(), lane, bot, model, ms, stop_reason: resp.stop_reason || null,
        user: userText, out: parsed, raw: parsed ? undefined : text.slice(0, 4000), error, usage, cost: round6(cost),
      });

      const short = { in: usage.input_tokens, out: usage.output_tokens, cache_read: usage.cache_read_input_tokens };
      let extra = '';
      if (!error && lane === 'act') {
        const say = parsed.say && parsed.say[0] ? ` say:"${String(parsed.say[0].text).replace(/\s+/g, ' ').slice(0, 60)}"` : '';
        const act = parsed.actions && parsed.actions[0] ? ` do:${String(parsed.actions[0].skill).slice(0, 20)}` : '';
        extra = say + act;
        const th = String(parsed.thought || '');
        const L = S.loop.get(bot);
        const n = L && L.t === th ? L.n + 1 : 1;
        S.loop.set(bot, { t: th, n });
        if (n >= 6 && n % 6 === 0) out(`[warn] ${bot} has had the exact same act thought ${n} times in a row - possible loop: "${th.slice(0, 80)}"`);
      } else if (!error && lane === 'mind') {
        extra = ` project:"${String(parsed.project.title).slice(0, 50)}"`;
      } else if (!error && lane === 'build') {
        extra = ` place:${parsed.place.length} remove:${parsed.remove.length}${parsed.done ? ' done' : ''}`;
      }
      out(`${tag} ${String(ms).padStart(6)}ms  $${cost.toFixed(4)}  cache ${usage.cache_read_input_tokens}${error ? '  FAIL ' + error : extra}`);

      if (error) return sendJSON(res, 200, { ok: false, error, ms, spent: round6(S.spent), usage: short }, cors);
      return sendJSON(res, 200, { ok: true, out: parsed, ms, spent: round6(S.spent), usage: short }, cors);
    } finally {
      S.inflight.delete(slot);
      res.off('close', onClose);
    }
  }

  /* --- /pair --- */
  async function handlePair(req, res, cors) {
    const j = await readJSON(req, res, cors);
    if (j === undefined) return;
    /* no global lockout (a hostile page could use it to block Dan from pairing);
       the code is too long to guess, wrong answers are slowed down, and the code
       rotates after 5 misses */
    const code = normPairCode(j.code);
    if (code.length === PAIR_LEN && safeEqual(code, S.pairCode)) {
      const token = randHex(32);
      tokens.paired.push(token);
      if (tokens.paired.length > 50) tokens.paired = tokens.paired.slice(-50);
      saveTokens();
      out(`[pair] a file:// page paired successfully`);
      rotatePairCode('code used');
      return sendJSON(res, 200, { ok: true, token }, cors);
    }
    S.pairWrong++;
    out(`[pair] wrong pairing code (${S.pairWrong}/5)`);
    if (S.pairWrong >= 5) rotatePairCode('5 wrong attempts');
    if (pairDelayMs) await sleep(pairDelayMs);
    return sendJSON(res, 401, { ok: false, error: 'wrong code' }, cors);
  }

  /* --- router --- */
  let port = wantPort;
  let allowedHosts = new Set();
  let allowedOrigins = new Set();
  let selfOrigins = new Set();
  function setPort(p) {
    port = p;
    allowedHosts = new Set([`127.0.0.1:${p}`, `localhost:${p}`]);
    selfOrigins = new Set([`http://localhost:${p}`, `http://127.0.0.1:${p}`]);
    allowedOrigins = new Set(['null', `http://localhost:${GAME_PORT}`, `http://127.0.0.1:${GAME_PORT}`, ...selfOrigins]);
  }

  async function handle(req, res) {
    const host = String(req.headers.host || '').toLowerCase();
    if (!allowedHosts.has(host)) return sendJSON(res, 403, { ok: false, error: 'forbidden host' });
    const origin = req.headers.origin;
    const cors = {};
    if (origin !== undefined) {
      if (!allowedOrigins.has(origin)) return sendJSON(res, 403, { ok: false, error: 'forbidden origin' });
      cors['Access-Control-Allow-Origin'] = origin;
      cors['Vary'] = 'Origin';
    }
    const raw = typeof req.url === 'string' ? req.url : '';
    const q = raw.indexOf('?');
    const p = q >= 0 ? raw.slice(0, q) : raw; // raw path: no decoding, no normalising
    const m = req.method;

    if (m === 'OPTIONS') {
      if (p !== '/health' && p !== '/pair' && p !== '/turn') return sendJSON(res, 404, { ok: false, error: 'not found' }, cors);
      const h = {
        ...cors,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Dingle-Token',
        'Access-Control-Max-Age': '600',
        'Content-Length': '0',
      };
      /* only our own localhost origins get the Private Network Access opt-in; an opaque
         'null' origin (sandboxed iframe on a public site, data: page) does not */
      if (origin !== undefined && origin !== 'null' && req.headers['access-control-request-private-network'] === 'true') h['Access-Control-Allow-Private-Network'] = 'true';
      res.writeHead(204, h);
      return res.end();
    }
    const isRoot = p === '/';
    if (isRoot || (VERSION_RE.test(p.slice(1)) && p.lastIndexOf('/') === 0)) {
      if (m !== 'GET') return sendJSON(res, 405, { ok: false, error: 'method not allowed' }, {}, { Allow: 'GET' });
      /* the HTML contains the page token: no CORS, and only for loads that did not come
         from another site (typed URL / bookmark / launcher = 'none', reload = 'same-origin') */
      if (origin !== undefined && !selfOrigins.has(origin)) return sendJSON(res, 403, { ok: false, error: 'forbidden origin' });
      const sfs = req.headers['sec-fetch-site'];
      if (sfs !== undefined && sfs !== 'none' && sfs !== 'same-origin') {
        return sendJSON(res, 403, { ok: false, error: `open the game by typing http://127.0.0.1:${port}/ in the address bar` });
      }
      return serveGame(res, isRoot ? null : p.slice(1));
    }
    if (p === '/health') {
      if (m !== 'GET') return sendJSON(res, 405, { ok: false, error: 'method not allowed' }, cors, { Allow: 'GET' });
      refreshKeyIfNeeded();
      return sendJSON(res, 200, {
        ok: true, version: VERSION, key: !!client && !keyBad, authed: isAuthed(req),
        spent: round6(S.spent), calls: S.calls, paused: S.paused,
      }, cors);
    }
    if (p === '/pair') {
      if (m !== 'POST') return sendJSON(res, 405, { ok: false, error: 'method not allowed' }, cors, { Allow: 'POST' });
      return handlePair(req, res, cors);
    }
    if (p === '/turn') {
      if (m !== 'POST') return sendJSON(res, 405, { ok: false, error: 'method not allowed' }, cors, { Allow: 'POST' });
      return handleTurn(req, res, cors);
    }
    return sendJSON(res, 404, { ok: false, error: 'not found' }, cors);
  }

  const server = http.createServer((req, res) => {
    Promise.resolve().then(() => handle(req, res)).catch((e) => {
      out('[brain] internal error: ' + (e && e.message ? e.message : String(e)));
      try { sendJSON(res, 500, { ok: false, error: 'internal error' }); } catch { /* ignore */ }
    });
  });
  server.on('clientError', (err, socket) => {
    try { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); else socket.destroy(); } catch { /* ignore */ }
  });
  server.requestTimeout = 120000;
  server.headersTimeout = 20000;

  await new Promise((resolve, reject) => {
    const onErr = (e) => { server.off('listening', onOk); reject(e); };
    const onOk = () => { server.off('error', onErr); resolve(); };
    server.once('error', onErr);
    server.once('listening', onOk);
    server.listen(wantPort, '127.0.0.1');
  });
  server.on('error', (e) => out('[brain] server error: ' + e.message));
  setPort(server.address().port);

  /* --- banner --- */
  const keyLine = client
    ? `${KEY_VAR} found (${sourceText(keySource)})`
    : `${KEY_VAR} missing - add it to ${envPath || '(no .env path)'} (copy .env.example to .env), or export it before starting (the brain re-checks automatically)`;
  out('');
  out('  ==================================================');
  out(`   DINGLECRAFT AI BRAIN v${VERSION}`);
  out(`   Open the game:  http://127.0.0.1:${port}/`);
  out(`   Pairing code for file:// pages: ${fmtPairCode(S.pairCode)}`);
  out(`     (only needed if you open the .html file directly: type /pair ${fmtPairCode(S.pairCode)} in game chat)`);
  out(`   API key: ${keyLine}`);
  out(`   Emergency stop: create a file named STOP in ${path.dirname(stopPath)}`);
  out('   Ctrl+C stops the brain.');
  out('  ==================================================');
  out('');

  let closed = false;
  return {
    server,
    port,
    getPairCode: () => fmtPairCode(S.pairCode),
    state: () => ({ spent: round6(S.spent), calls: S.calls, paused: S.paused, fallbacks: S.fallbacks, keyBad, testMode, upstream: client ? client.baseURL : upstreamURL, keySource, gameDir, dataDir, envPath }),
    close() {
      if (closed) return Promise.resolve();
      closed = true;
      return new Promise((resolve) => {
        server.close(() => resolve());
        try { server.closeAllConnections(); } catch { /* ignore */ }
      });
    },
  };
}

/* ------------------------------------------------------------------ main -- */

function isMain() {
  try { return !!process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (isMain()) {
  process.on('uncaughtException', (e) => console.log('[brain] internal error (still running): ' + String(e && e.message).replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, '[redacted]')));
  process.on('unhandledRejection', (e) => console.log('[brain] internal error (still running): ' + String(e && e.message).replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, '[redacted]')));
  startServer().then((h) => {
    let stopping = false;
    const stop = () => {
      if (stopping) process.exit(0);
      stopping = true;
      console.log('\n[brain] stopping... bye!');
      h.close().then(() => process.exit(0));
      setTimeout(() => process.exit(0), 1500).unref();
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  }).catch((e) => {
    if (e && e.code === 'EADDRINUSE') {
      console.log(`[brain] Port ${process.env.DINGLE_BRAIN_PORT || DEFAULT_PORT} is already in use - is the brain already running in another window?`);
    } else {
      console.log('[brain] could not start: ' + String(e && e.message).replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, '[redacted]'));
    }
    process.exit(1);
  });
}
