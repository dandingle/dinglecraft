// Repo-relative paths for the QA rigs. Nothing here reaches outside the repo.
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
export const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..','..');
/** GAME_VERSION as written in src/core/p01a_prologue.js */
export function gameVersion(){return /^const GAME_VERSION = '(\d+\.\d+)';$/m.exec(fs.readFileSync(path.join(REPO,'src','core','p01a_prologue.js'),'utf8'))[1];}
/** the default --build: the dist html of the current version, as a path under the static server root (= the repo) */
export function defaultBuild(){return 'dist/dinglecraft_v'+gameVersion()+'.html';}
/** a fresh output folder under out/qa/ (gitignored) */
export function outDir(name){const d=path.join(REPO,'out','qa',name+'_'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19));fs.mkdirSync(d,{recursive:true});return d;}
