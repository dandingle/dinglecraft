#!/usr/bin/env node
/* Minimal fal.ai queue client for the art pipeline. PAID: every run spends real money on YOUR fal account.
   Usage: node tools/art/fal.mjs <endpoint> <input.json|-> <outdir> <label> <estCostUSD>

   - The key (bring your own), first match wins: the FAL_KEY environment variable, then the dotenv file named by
     DINGLE_ENV_PATH, then the repo's own .env (gitignored; copy .env.example). The value is never printed: a missing key is
     reported by its NAME, and every message is scrubbed of it.
   - Budget (fail closed): the ledger folder is FAL_LEDGER_DIR (default .art-ledger/ in the repo, gitignored). It holds
     costs.md (one line per call: est. cost, running total) and BUDGET (a USD number). With no BUDGET file, FAL_BUDGET_USD is
     the cap; with neither, the client REFUSES to run. It also refuses when the ledger total + this call would pass the cap.
   - Local file paths in input fields named *_url / *_urls are sent as data URIs.
   - Every output image is downloaded to <outdir>/<label>_<field>_<n>.<ext>; the full JSON goes to <outdir>/<label>.json.
   The art drivers (tools/art/**) shell out to this file; it is the only place that reads FAL_KEY. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');
export const KEY_VAR = 'FAL_KEY';

/* ------------------------------------------------------------------ the key -- */

/** Read ONE variable from a dotenv file (BOM, CRLF, comments, `export NAME=`, quotes; last definition wins). */
export function readVarFromEnvFile(file, name) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch { return null; }
  if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
  let found = null;
  for (const raw of txt.split(/\r?\n|\r/)) {
    let line = raw.trim();
    if (!line || line[0] === '#') continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq < 1 || line.slice(0, eq).trim() !== name) continue;
    let v = line.slice(eq + 1).trim();
    const q = v[0];
    if (q === '"' || q === "'") { const end = v.indexOf(q, 1); v = end > 0 ? v.slice(1, end) : v.slice(1); }
    else { const h = v.search(/\s#/); if (h >= 0) v = v.slice(0, h); }
    v = v.trim();
    found = v || null;
  }
  return found;
}

/** { key, source } with source 'env' | 'DINGLE_ENV_PATH' | '.env', or throws an Error that names the variable only. */
export function resolveKey(env = process.env, repo = REPO) {
  const ok = (k) => (k && !/\s/.test(k) ? k : null);
  const e = ok((env[KEY_VAR] || '').trim());
  if (e) return { key: e, source: 'env' };
  if (env.DINGLE_ENV_PATH) { const f = ok(readVarFromEnvFile(env.DINGLE_ENV_PATH, KEY_VAR)); if (f) return { key: f, source: 'DINGLE_ENV_PATH' }; }
  const r = ok(readVarFromEnvFile(path.join(repo, '.env'), KEY_VAR));
  if (r) return { key: r, source: '.env' };
  throw new Error(`${KEY_VAR} is missing: export it, or put it in the repo's .env (copy .env.example) or in the file DINGLE_ENV_PATH names`);
}

/* ------------------------------------------------------------- the ledger -- */

export function ledgerDir(env = process.env, repo = REPO) { return path.resolve(env.FAL_LEDGER_DIR || path.join(repo, '.art-ledger')); }

export function spent(dir) {
  try {
    let s = 0;
    for (const l of fs.readFileSync(path.join(dir, 'costs.md'), 'utf8').split('\n')) { const m = l.match(/^\|[^|]*\|[^|]*\|[^|]*\|\s*\$([0-9.]+)\s*\|/); if (m) s += +m[1]; }
    return s;
  } catch { return 0; }
}

/** The cap in USD, or null (= refuse): <dir>/BUDGET, else FAL_BUDGET_USD. There is no default. */
export function budget(dir, env = process.env) {
  const num = (s) => { const v = Number(String(s).trim()); return String(s).trim() !== '' && Number.isFinite(v) && v >= 0 ? v : null; };
  try { const v = num(fs.readFileSync(path.join(dir, 'BUDGET'), 'utf8')); if (v != null) return v; } catch { /* fall through */ }
  return env.FAL_BUDGET_USD != null ? num(env.FAL_BUDGET_USD) : null;
}

/** Throws (message names the guard, never a key) unless the call fits the budget. Returns { have, cap }. */
export function checkBudget(cost, dir, env = process.env) {
  if (!(cost >= 0)) throw new Error('estCostUSD must be a number >= 0');
  const cap = budget(dir, env);
  if (cap == null) throw new Error('BUDGET: no budget set - put a USD number in ' + path.basename(dir) + '/BUDGET (FAL_LEDGER_DIR) or set FAL_BUDGET_USD; not running');
  const have = spent(dir);
  if (have + cost > cap + 1e-9) throw new Error(`BUDGET: ${have.toFixed(2)} spent + ${cost.toFixed(2)} would pass the $${cap} cap - not running`);
  return { have, cap };
}

/* ------------------------------------------------------------------ input -- */

function toDataUri(p) {
  const ext = path.extname(p).slice(1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
  return `data:${mime};base64,` + fs.readFileSync(p).toString('base64');
}
export function inlineFiles(v, k) {
  if (Array.isArray(v)) return v.map((x) => inlineFiles(x, k));
  if (v && typeof v === 'object') { const o = {}; for (const kk in v) o[kk] = inlineFiles(v[kk], kk); return o; }
  if (typeof v === 'string' && /(_url|_urls)$/.test(k || '') && !/^(https?:|data:)/.test(v) && fs.existsSync(v)) return toDataUri(v);
  return v;
}

/* ------------------------------------------------------------------- main -- */

let KEY = null;
const scrub = (s) => { let t = String(s); if (KEY) t = t.split(KEY).join('[redacted]'); return t; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [endpoint, inputArg, outdir, label, est] = process.argv.slice(2);
  if (!endpoint || !inputArg || !outdir || !label || est == null) { console.error('usage: node tools/art/fal.mjs <endpoint> <input.json|-> <outdir> <label> <estCostUSD>'); process.exit(2); }
  const dir = ledgerDir();
  const cost = +est;
  let have;
  try { ({ have } = checkBudget(cost, dir)); } catch (e) { console.error(e.message); process.exit(3); }
  try { KEY = resolveKey().key; } catch (e) { console.error(e.message); process.exit(2); }
  const raw = inputArg === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(inputArg, 'utf8');
  const input = inlineFiles(JSON.parse(raw));
  fs.mkdirSync(outdir, { recursive: true });
  const H = { 'Authorization': `Key ${KEY}`, 'Content-Type': 'application/json' };
  const sub = await fetch(`https://queue.fal.run/${endpoint}`, { method: 'POST', headers: H, body: JSON.stringify(input) });
  const sj = await sub.json().catch(() => ({}));
  if (!sub.ok) { console.error('submit failed', sub.status, scrub(JSON.stringify(sj).slice(0, 600))); process.exit(1); }
  const t0 = Date.now();
  let st = {};
  for (;;) {
    await sleep(1500);
    const r = await fetch(sj.status_url, { headers: H });
    st = await r.json().catch(() => ({}));
    if (st.status === 'COMPLETED') break;
    if (st.status === 'FAILED' || st.status === 'ERROR' || Date.now() - t0 > 600000) { console.error('job failed', scrub(JSON.stringify(st).slice(0, 600))); process.exit(1); }
  }
  const rr = await fetch(sj.response_url, { headers: H });
  const res = await rr.json();
  if (!rr.ok || res.detail) { console.error('result error', rr.status, scrub(JSON.stringify(res).slice(0, 800))); process.exit(1); }
  fs.writeFileSync(path.join(outdir, label + '.json'), JSON.stringify(res, null, 1));
  const urls = [];
  const walk = (v, k) => {
    if (Array.isArray(v)) v.forEach((x) => walk(x, k));
    else if (v && typeof v === 'object') { if (typeof v.url === 'string' && /^https?:/.test(v.url)) urls.push({ url: v.url, name: k || 'img' }); else for (const kk in v) walk(v[kk], kk); }
  };
  walk(res, 'img');
  const saved = [];
  let n = 0;
  for (const u of urls) {
    const r = await fetch(u.url); const b = Buffer.from(await r.arrayBuffer());
    const ext = (u.url.match(/\.(png|jpe?g|webp)(\?|$)/i) || [, 'png'])[1].toLowerCase();
    const f = path.join(outdir, `${label}_${u.name}_${n++}.${ext}`);
    fs.writeFileSync(f, b); saved.push(f);
  }
  const total = have + cost;
  const ledger = path.join(dir, 'costs.md');
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ledger)) fs.writeFileSync(ledger, '# Art generation spend (fal)\n\n| time | service | item | est. cost | running total |\n|---|---|---|---|---|\n');
  fs.appendFileSync(ledger, `| ${new Date().toISOString().slice(0, 19)} | ${endpoint} | ${label} | $${cost.toFixed(3)} | $${total.toFixed(3)} |\n`);
  console.log(JSON.stringify({ ok: true, secs: Math.round((Date.now() - t0) / 1000), saved, spent: +total.toFixed(3) }));
}

function isMain() { try { return !!process.argv[1] && pathToFileURL(fs.realpathSync(process.argv[1])).href === import.meta.url; } catch { return false; } }
if (isMain()) main().catch((e) => { console.error('error', scrub(e && e.message || e)); process.exit(1); });
