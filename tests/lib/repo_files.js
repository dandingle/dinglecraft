/* repo_files.js: the files a commit of this repo would contain, for the whole-repo scans (r_ipscan, r_privacy, r_other_ip).
   const R=require('../lib/repo_files.js');
   R.list()            -> sorted repo-relative paths ('/' separators) of every file under the repo, minus what .gitignore keeps out
                          (build/ dist/ out/ node_modules/ vendor/ scratch/ .git/ brain/data/ .art-ledger/ __pycache__/, *.gen.js,
                          *.pyc, *.log, *.tmp, *.swp, *.local.txt (the owner's private-terms list), *~, ._*, .DS_Store, Thumbs.db,
                          desktop.ini, .idea/ .vscode/) and minus every
                          .env / .env.* file except .env.example, which is never opened by anything here.
   R.isBinary(buf)     -> a NUL byte in the first 8 KB
   R.BIN_EXT           -> extensions read as binary without looking (images, audio, fonts, archives)
   R.PLAY_FILE         -> 'DINGLECRAFT.html': the newest released build, committed at the repo root so players can download it
                          (scripts/release.mjs copies it there)
   R.playCheck()       -> {present, md5, version, newest}: version is the shipped.json version whose md5 the play file carries,
                          counted only for a public build (game 6.4 or later: older builds held private paths), else null
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
const PLAY_FILE='DINGLECRAFT.html',FIRST_PUBLIC=[6,4];
const vnum=v=>String(v).split('.').map(Number),vcmp=(a,b)=>{const x=vnum(a),y=vnum(b);return x[0]-y[0]||x[1]-y[1];};
function playCheck(){const abs=path.join(P.REPO,PLAY_FILE);if(!fs.existsSync(abs))return {present:false,md5:null,version:null,newest:null};
  const md5=require('crypto').createHash('md5').update(fs.readFileSync(abs)).digest('hex');
  const sh=JSON.parse(fs.readFileSync(path.join(P.FIX,'shipped.json'),'utf8')).shipped||{},vs=Object.keys(sh).sort(vcmp);
  const version=vs.find(v=>vcmp(v,FIRST_PUBLIC.join('.'))>=0&&sh[v].md5===md5)||null;
  return {present:true,md5,version,newest:vs[vs.length-1]||null};}
module.exports={list,isBinary,BIN_EXT,PLAY_FILE,playCheck};
