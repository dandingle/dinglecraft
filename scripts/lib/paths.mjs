// Repo-relative paths for the build scripts. Nothing here reaches outside the repo.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SRC = path.join(REPO, 'src');
export const HTML = path.join(REPO, 'html');
export const ASSETS = path.join(REPO, 'assets');
export const FIX = path.join(REPO, 'tests', 'fixtures');

/** Repo-relative POSIX path for messages (never an absolute path in output). */
export function rel(p) {
  const r = path.relative(REPO, p);
  return r && !r.startsWith('..') && !path.isAbsolute(r) ? r.split(path.sep).join('/') : path.basename(p);
}
