/* repo_files.js: the files a commit of this repo would contain, for the whole-repo scans (r_ipscan, r_privacy, r_other_ip).
   const R=require('../lib/repo_files.js');
   R.list()            -> sorted repo-relative paths ('/' separators) of every file under the repo, minus what .gitignore keeps out
                          (build/ dist/ out/ node_modules/ vendor/ scratch/ .git/ brain/data/ .art-ledger/ __pycache__/, *.gen.js,
                          *.pyc, *.log, *.tmp, *.swp, *.local.txt (the owner's private-terms list), *~, ._*, .DS_Store, Thumbs.db,
                          desktop.ini, .idea/ .vscode/) and minus every
                          .env / .env.* file except .env.example, which is never opened by anything here.
   R.isBinary(buf)     -> a NUL byte in the first 8 KB
   R.BIN_EXT           -> extensions read as binary without looking (images, audio, fonts, archives)
   The walk never follows symlinks and never reads a file; callers decide what to open. */
'use strict';
const fs=require('fs'),path=require('path');
const P=require('./paths.js');
const SKIP_TOP=new Set(['build','dist','out','vendor','scratch']);
const SKIP_ANY=new Set(['node_modules','.git','__pycache__','.art-ledger','.idea','.vscode']);
const SKIP_FILE=/^(?:\.DS_Store|Thumbs\.db|desktop\.ini|\._.*|.*\.(?:gen\.js|pyc|log|tmp|swp|local\.txt)|.*~)$/;
const ENV=/^\.env(?:\..+)?$/;
const BIN_EXT=/\.(?:webp|png|jpe?g|gif|bmp|ico|tiff?|psd|exr|wav|mp3|ogg|oga|flac|m4a|aac|opus|webm|mp4|mov|glb|gltf\.bin|bin|woff2?|ttf|otf|zip|gz|tgz|7z|pdf)$/i;
function list(){const out=[];const root=P.REPO.replace(/\/$/,'');
  (function walk(dir,rel){
    for(const d of fs.readdirSync(dir,{withFileTypes:true})){
      const r=rel?rel+'/'+d.name:d.name;
      if(d.isSymbolicLink())continue;
      if(d.isDirectory()){
        if(SKIP_ANY.has(d.name)||(!rel&&SKIP_TOP.has(d.name))||r==='brain/data')continue;
        walk(path.join(dir,d.name),r);continue;}
      if(!d.isFile())continue;
      if(ENV.test(d.name)&&d.name!=='.env.example')continue;
      if(SKIP_FILE.test(d.name))continue;
      out.push(r);}
  })(root,'');
  return out.sort();}
function isBinary(buf){return buf.subarray(0,8192).includes(0);}
module.exports={list,isBinary,BIN_EXT};
