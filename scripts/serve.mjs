#!/usr/bin/env node
// Zero-dependency static server for the repo (npm run serve). Binds 127.0.0.1 only.
//   node scripts/serve.mjs [--port N] [--root DIR]
// Default port 8643 (the AI-player brain allows this game origin). Every response is Cache-Control: no-store, so Chrome
// never serves a stale build. Refuses dot-paths (.env, .git, ...), brain/data, node_modules and anything outside the root.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from './lib/paths.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const PORT = +opt('--port', process.env.PORT || 8643);
const ROOT = fs.realpathSync(path.resolve(opt('--root', REPO)));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon',
  '.wasm': 'application/wasm', '.map': 'application/json',
};

function refused(segs) {
  if (segs.some((s) => s.startsWith('.') || s === 'node_modules')) return true;
  for (let i = 0; i + 1 < segs.length; i++) if (segs[i] === 'brain' && segs[i + 1] === 'data') return true;
  return false;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const server = http.createServer((req, res) => {
  const send = (code, body, type = 'text/plain; charset=utf-8') => {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'method not allowed');
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return send(400, 'bad request'); }
  if (pathname.includes('\0') || pathname.includes('\\')) return send(400, 'bad request');
  const segs = pathname.split('/').filter(Boolean);
  if (segs.includes('..') || refused(segs)) return send(403, 'forbidden');
  let file = path.join(ROOT, ...segs);
  let real;
  try { real = fs.realpathSync(file); } catch { return send(404, 'not found'); }
  if (real !== ROOT && !real.startsWith(ROOT + path.sep)) return send(403, 'forbidden');
  if (refused(path.relative(ROOT, real).split(path.sep).filter(Boolean))) return send(403, 'forbidden');
  let st = fs.statSync(real);
  if (st.isDirectory()) {
    const idx = path.join(real, 'index.html');
    if (fs.existsSync(idx)) { real = idx; st = fs.statSync(real); }
    else {
      if (!pathname.endsWith('/')) { res.writeHead(301, { Location: pathname + '/', 'Cache-Control': 'no-store' }); return res.end(); }
      const items = fs.readdirSync(real, { withFileTypes: true }).filter((d) => !d.name.startsWith('.') && d.name !== 'node_modules')
        .map((d) => d.name + (d.isDirectory() ? '/' : '')).sort();
      return send(200, `<!doctype html><meta charset="utf-8"><title>${esc(pathname)}</title><h1>${esc(pathname)}</h1><ul>`
        + items.map((n) => `<li><a href="${esc(encodeURIComponent(n.replace(/\/$/, '')) + (n.endsWith('/') ? '/' : ''))}">${esc(n)}</a></li>`).join('')
        + '</ul>', 'text/html; charset=utf-8');
    }
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(real).toLowerCase()] || 'application/octet-stream',
    'Content-Length': st.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(real).pipe(res);
});

server.on('error', (e) => { console.error('serve: ' + (e.code === 'EADDRINUSE' ? `port ${PORT} is in use (try --port N)` : e.message)); process.exit(1); });
server.listen(PORT, '127.0.0.1', () => {
  const dist = path.join(ROOT, 'dist');
  const builds = fs.existsSync(dist) ? fs.readdirSync(dist).filter((f) => /^dinglecraft_v\d+\.\d+\.html$/.test(f)).sort() : [];
  console.log(`serving the repo on http://127.0.0.1:${PORT}/ (Cache-Control: no-store; Ctrl+C stops)`);
  if (builds.length) console.log(`play: http://127.0.0.1:${PORT}/dist/${builds[builds.length - 1]}`);
  else console.log('no build in dist/ yet: run npm run build');
});
