/* paths.js: every path the suites use, computed from this file's place in the repo (or from the environment).
   Nothing here reaches outside the repo unless an environment variable points there on purpose (DC_ART_SRC, DC_MG_ART_SRC).
   Every directory constant ends with '/', so both path.join(DIR, f) and DIR + f work (the legacy suites concatenate).
     REPO          the repo root
     BUILD         the build under test: $DC_BUILD, else <repo>/build/ (scripts/build.mjs writes game.js, head.html, hrassets.js,
                   hr_assets.gen.js, mg_assets.gen.js, tail.html, build.json there)
     DIST          $DC_DIST, else <repo>/dist/ (the playable dinglecraft_v<VER>.html)
     STUBS         tests/core/stubs.js (the frozen headless DOM/canvas/THREE/storage stubs)
     CORE          tests/core/ (the frozen quartet: stubs.js test.js smoke.js botsmoke.js; never edit them)
     FIX           tests/fixtures/
     OUT           $DC_OUT_DIR, else <repo>/out/ (gitignored; the ONLY place suites write)
     SRC           the game sources by package (see below)
     ASSETS        assets/ ; PACKED assets/packed/ ; PACK_INPUTS assets/pack-inputs/
     TOOLS         tools/ ; SCRIPTS scripts/
     ART_SRC       $DC_ART_SRC (a folder holding the Hyperreal source art: final/ and final_ent/) or null
     MG_ART_SRC    $DC_MG_ART_SRC (the Malgorath source art folder) or null
     VENDOR_THREE  vendor/three/three.r128.min.js (not vendored: the real-three suites skip themselves)
   readSrc(rel, {legacy:true}) reads src/<rel>; with legacy it returns the text the pre-split package file had: the first line
   is dropped when it is the build's "/* ---- PART NN: <name> ---- *\/" marker, and one trailing join blank line is dropped. */
'use strict';
const path=require('path'),fs=require('fs');
const D=p=>path.resolve(p)+'/';
const REPO=D(path.join(__dirname,'..','..'));
const env=k=>process.env[k]&&String(process.env[k]).trim()?String(process.env[k]).trim():null;
const BUILD=D(env('DC_BUILD')||path.join(REPO,'build'));
const DIST=D(env('DC_DIST')||path.join(REPO,'dist'));
const OUT=D(env('DC_OUT_DIR')||path.join(REPO,'out'));
const S=REPO+'src/';
const SRC={root:S,core:S+'core/',world:S+'world/',ent:S+'entities/',ui:S+'ui/',feat:S+'features/',ai:S+'ai_players/',
  mg:S+'malgorath/',mgHr:S+'malgorath/hr/',mgModels:S+'malgorath/hr/models/',mgLoaders:S+'malgorath/hr/loaders/',
  cr:S+'creativity/',pg:S+'purgatory/',tex:S+'texpacks/',models:S+'texpacks/models/',texLoaders:S+'texpacks/loaders/',boot:S+'boot/'};
const MARKER=/^\/\* ---- PART \d+(?: HR)?: [A-Za-z0-9_.]+ ---- \*\/\n/;
function readSrc(rel,o){const f=path.isAbsolute(rel)?rel:path.join(S,rel);let t=fs.readFileSync(f,'utf8');
  if(o&&o.legacy){const m=t.match(MARKER);if(m)t=t.slice(m[0].length);if(t.endsWith('\n\n'))t=t.slice(0,-1);}
  return t;}
/* a directory under OUT (created on demand): where a suite may write */
function outDir(sub){const d=sub?path.join(OUT,sub):OUT;fs.mkdirSync(d,{recursive:true});return D(d);}
module.exports={REPO,BUILD,DIST,OUT,outDir,STUBS:REPO+'tests/core/stubs.js',CORE:REPO+'tests/core/',FIX:REPO+'tests/fixtures/',
  SRC,readSrc,MARKER,ASSETS:REPO+'assets/',PACKED:REPO+'assets/packed/',PACK_INPUTS:REPO+'assets/pack-inputs/',
  TOOLS:REPO+'tools/',SCRIPTS:REPO+'scripts/',
  ART_SRC:env('DC_ART_SRC')?D(env('DC_ART_SRC')):null,MG_ART_SRC:env('DC_MG_ART_SRC')?D(env('DC_MG_ART_SRC')):null,
  VENDOR_THREE:REPO+'assets/vendor/three.r128.min.js',
  rel:p=>{const r=path.relative(REPO,p);return r&&!r.startsWith('..')&&!path.isAbsolute(r)?r.split(path.sep).join('/'):path.basename(p);}};
