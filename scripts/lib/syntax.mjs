// node --check with short reporting: file:line, the error message and (unless hidden) the quoted source line, each capped
// at 300 characters. hrassets.js never has its source quoted (its lines are megabytes of base64).
import { spawn } from 'node:child_process';
import path from 'node:path';

/**
 * Turn node --check stderr into a one-to-three-line message.
 *   name        what to call the file in the message
 *   hideSource  never quote source (used for hrassets.js, whose lines are megabytes long)
 */
export function describeCheckError(stderr, name, hideSource = false) {
  const lineM = /:(\d+)\s*\n/.exec(stderr);
  const line = lineM ? +lineM[1] : null;
  const msg = (stderr.split('\n').find((l) => /^\w*Error\b/.test(l)) || 'SyntaxError').slice(0, 300);
  if (line === null) return `${name}: ${msg} (location not reported)`;
  if (hideSource) return `${name}:${line}: ${msg}`;
  return `${name}:${line}: ${msg}\n${stderr.split('\n').slice(1, 3).map((l) => l.slice(0, 300)).join('\n')}`;
}

/** Run node --check on file. Resolves null when the syntax is valid, else a short message. */
export function nodeCheck(file, { name = path.basename(file), hideSource = false } = {}) {
  return new Promise((resolve) => {
    const ch = spawn(process.execPath, ['--check', file], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    ch.stderr.on('data', (d) => { if (err.length < 1e6) err += d; });
    ch.on('close', (code) => resolve(code === 0 ? null : describeCheckError(err, name, hideSource)));
  });
}
