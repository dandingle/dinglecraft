/* c1_static.js (C1, gate x1): the paintings package's static truths (CREATIVITY_PLAN.md 7.4).
   The palette; the art codec (round trips on flat / random / worst-case / structured images in all three sizes, the 7,000-char cap,
   determinism, frozen golden payloads so old saves keep decoding, hostile input never throws and decodes to an empty canvas, index
   clamping); thumbnails (framed vs work-in-progress, aspect kept, box-averaged colours) against a recording 2D context; the
   registrations and the CREX interface; C1's source hygiene (no randomness or clock anywhere, owner prefixes, no stub marker). */
'use strict';
const boot=require('../lib/c_boot.js'),{ok,skip}=boot;
const fs=require('fs');
const V=boot({});
boot.run(async()=>{
  if(boot.crStubbed('1')){skip('c1_static','C1 is on its stub');return;}
  const CRC=V.CRC,REG=V.CRREG,enc=V.crArtEncode,dec=V.crArtDecode;
  /* ---- palette ---- */
  const P=V.CR_PALETTE;
  ok('the palette has 24 colours, all #rrggbb, all distinct, with 24 names',Array.isArray(P)&&P.length===24&&P.every(c=>/^#[0-9a-f]{6}$/.test(c))&&
    new Set(P).size===24&&Array.isArray(V.CRP_NAMES)&&V.CRP_NAMES.length===24&&new Set(V.CRP_NAMES).size===24);
  const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
  let minD=1e9;for(let i=0;i<24;i++)for(let j=i+1;j<24;j++)minD=Math.min(minD,dist(rgb(P[i]),rgb(P[j])));
  ok('every pair of swatches is clearly different (min RGB distance '+minD.toFixed(0)+' >= 40)',minD>=40);
  ok('the palette has black and white and the canvas colour is not a swatch (empty stays readable)',P[0]==='#000000'&&P[1]==='#ffffff'&&!P.includes('#efe7d2'));

  /* ---- the codec ---- */
  const R=(s=>()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;})(424242);
  const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
  const imgs={};
  for(const [w,h] of CRC.SIZES){const n=w*h,k=w+'x'+h;
    imgs[k]={blank:new Uint8Array(n),flat:new Uint8Array(n).fill(5),noise:new Uint8Array(n).map(()=>1+Math.floor(R()*24)),
      noise0:new Uint8Array(n).map(()=>Math.floor(R()*25)),
      stripes:new Uint8Array(n).map((_,i)=>1+((i%w)>>3)%24),
      scene:new Uint8Array(n).map((_,i)=>{const x=i%w,y=(i/w)|0;return y<h*0.6?(Math.hypot(x-w*0.7,y-h*0.25)<h*0.12?7:23):(y<h*0.62?9:((x+y)%7?8:9));}),
      dither:new Uint8Array(n).map((_,i)=>((i%w)+((i/w)|0))%2?11:23)};}
  const bad=[],lens={};
  for(const k in imgs)for(const nm in imgs[k]){const [w,h]=k.split('x').map(Number),px=imgs[k][nm],d=enc(px,w,h),back=dec(d,w,h);
    lens[k+' '+nm]=d.length;if(typeof d!=='string'||!same(px,back)||d.length>CRC.MAX_D.art)bad.push(k+' '+nm+' ('+d.length+')');}
  ok('every test image in all three sizes round-trips exactly and stays <= 7,000 chars'+(bad.length?' ('+bad.join(', ')+')':''),bad.length===0);
  ok('worst case: 128x64 noise packs to '+lens['128x64 noise']+' chars (<= 6,828: the 5-bit form)',lens['128x64 noise']<=6828&&lens['64x128 noise']<=6828);
  ok('flat canvases are tiny (blank 64x64 '+lens['64x64 blank']+', flat 128x64 '+lens['128x64 flat']+' chars)',lens['64x64 blank']<=12&&lens['128x64 flat']<=12&&lens['64x128 blank']<=12);
  ok('a structured scene compresses (64x64 '+lens['64x64 scene']+', 128x64 '+lens['128x64 scene']+' chars, well under the 5-bit size)',lens['64x64 scene']<1200&&lens['128x64 scene']<2400);
  ok('dithers compress through the diagonal and period-2 copies (64x64 checker '+lens['64x64 dither']+', 128x64 checker '+lens['128x64 dither']+' chars)',lens['64x64 dither']<40&&lens['128x64 dither']<40);
  ok('stripes and a scene with a dithered field stay small (64x128 stripes '+lens['64x128 stripes']+', 64x128 scene '+lens['64x128 scene']+')',lens['64x128 stripes']<300&&lens['64x128 scene']<2500);
  ok('the encoder picks the shorter form: B for structure, P for noise',enc(imgs['64x64'].scene,64,64)[0]==='B'&&enc(imgs['128x64'].noise,128,64)[0]==='P');
  ok('payloads are base64url text (B/P + [A-Za-z0-9_-]) and deterministic',Object.keys(imgs).every(k=>{const [w,h]=k.split('x').map(Number);
    return Object.values(imgs[k]).every(px=>{const a=enc(px,w,h);return /^[BP][A-Za-z0-9_-]*$/.test(a)&&a===enc(px.slice(),w,h)&&a===enc(Array.from(px),w,h);});}));
  /* golden payloads: frozen forever (old saves must keep decoding exactly) */
  const g1=new Uint8Array(64*64);for(let i=0;i<64;i++){g1[i*64+i]=5;g1[i*64+63-i]=11;}for(let i=0;i<64;i++)g1[32*64+i]=1;
  const G1=enc(g1,64,64);
  const g2=new Uint8Array(128*64).map((_,i)=>(i*7)%25);const G2=enc(g2,128,64);
  ok('golden: an X with a bar, 64x64 ("'+G1.slice(0,24)+'...", '+G1.length+' chars) decodes back exactly',same(dec(G1,64,64),g1)&&G1[0]==='B');
  const GOLD1='BFgA9LA0D3agdA72TQO9m0DnYjQN9itA12M0DPY7QMdhDQL9hLQLdhTQK9hbQKdhjQJ9hrQJdhzQI9h7QIdgg0H9gi0Hdgk0G9gm0Gdgo0F9gq0Fdgs0E9gu0Edgw0P2DLQ3YNNC9g20J2DjR9g60XYPNPYIIIP-B4uBFgA629A82XQOtn0DjYnQNti9A02N0DLY_QMNhHQLthPQLNhXQKthfQKNhnQJthvQJNh3QIth_QINgh0Htgj0HNgl0Gtgn0GNgp0Ftgr0FNgt0Etgv0ENgx0O2DPQzYNdCtg30I2DnRtg70TYPdMA';
  ok('golden: the v6.2 B payload of that picture is frozen (encoder and decoder both)',G1===GOLD1&&same(dec(GOLD1,64,64),g1));
  const g3=new Uint8Array(64*128).map((_,i)=>((i*2654435761)>>>27)%25),G3=enc(g3,64,128),md5=b=>require('crypto').createHash('md5').update(b).digest('hex');
  ok('golden: a 64x128 noise image packs to the frozen P payload (6,828 chars, md5 0673acb7)',G3[0]==='P'&&G3.length===6828&&md5(G3)==='0673acb7689666e7c60c633bba282946'&&same(dec(G3,64,128),g3));
  ok('golden: the og_trace image (i*7)%25 at 128x64 round-trips ('+G2.length+' chars)',same(dec(G2,128,64),g2)&&G2.length<=CRC.MAX_D.art);
  ok('the og_trace crea image (64x64) encodes under the cap',enc(new Uint8Array(64*64).map((_,i)=>(i*7)%25),64,64).length<=CRC.MAX_D.art);
  /* hostile input */
  const hostile=['',null,undefined,123,{},[],'X','B','P','Babc!','P'+'A'.repeat(10),'B'+'_'.repeat(400),'P'+'_'.repeat(6000),'B////','Z'+G1.slice(1),
    G1.slice(0,G1.length>>1),'B'+'A'.repeat(4000),'\u0000\u0001','B￿￿'];
  let thrown=0,nonEmpty=0;for(const d of hostile){try{const a=dec(d,64,64);if(!(a instanceof Uint8Array)||a.length!==4096||a.some(v=>v>24))nonEmpty++;}catch(e){thrown++;}}
  ok('hostile payloads never throw and always give 4096 valid indices ('+thrown+' threw, '+nonEmpty+' bad)',thrown===0&&nonEmpty===0);
  ok('a truncated payload, a run past the end, a copy on row 0 and an index > 24 all decode to an empty canvas',
    dec(G1.slice(0,G1.length>>1),64,64).every(v=>v===0)&&dec('B'+'_'.repeat(400),64,64).every(v=>v===0)&&dec('P'+'_'.repeat(6000),64,64).every(v=>v===0)&&
    dec('B'+Buffer.from([0xC0,0,0,0]).toString('base64url'),64,64).every(v=>v===0));
  ok('bad sizes decode to an empty array, never throw',dec(G1,0,64).length===0&&dec(G1,-1,4).length===0&&dec(G1,1.5,2).length===0);
  ok('the encoder clamps junk indices (25, 255, -1, NaN) to empty',same(dec(enc([25,255,-1,NaN,3,24].concat(Array(64*64-6).fill(0)),64,64),64,64).slice(0,6),[0,0,0,0,3,24]));
  ok('crArtBlank is an empty canvas for each size',CRC.SIZES.every(([w,h])=>{const a=dec(V.crArtBlank(w,h),w,h);return a.length===w*h&&a.every(v=>v===0);}));

  /* ---- thumbnails against a recording 2D context ---- */
  const rec=()=>{const L={fill:[],put:[],imgs:[]};const g={fillStyle:'',clearRect(){},fillRect(x,y,w,h){L.fill.push([g.fillStyle,x,y,w,h]);},
    getImageData(x,y,w,h){const im={x,y,width:w,height:h,data:new Uint8ClampedArray(w*h*4)};L.imgs.push(im);return im;},putImageData(im,x,y){L.put.push([im,x,y]);},
    beginPath(){},arc(){},fill(){}};return {g,L};};
  const thumb=(w,h,st,px)=>{const t=rec();V.crArtThumb({k:'art',st,w,h,d:enc(px||new Uint8Array(w*h).fill(5),w,h),t:'T'},t.g,48);return t.L;};
  const sq=thumb(64,64,'done'),wd=thumb(128,64,'done'),tl=thumb(64,128,'done'),wip=thumb(64,64,'wip');
  const dims=L=>L.put.length===1?[L.put[0][0].width,L.put[0][0].height]:null;
  ok('thumbnails keep the aspect: square '+dims(sq)+', wide '+dims(wd)+', tall '+dims(tl)+' (inside 48x48)',dims(sq)&&dims(sq)[0]===dims(sq)[1]&&dims(wd)[0]===2*dims(wd)[1]&&
    dims(tl)[1]===2*dims(tl)[0]&&dims(wd)[0]<=44&&dims(tl)[1]<=44&&dims(sq)[0]>=30);
  const red=sq.put[0][0].data;ok('a flat red painting thumbnails to flat red (box average)',red[0]===0xe8&&red[1]===0x3b&&red[2]===0x3b&&red[3]===255&&red[red.length-4]===0xe8);
  const mixed=thumb(64,64,'done',new Uint8Array(4096).map((_,i)=>((i%64)+((i/64)|0))%2?1:2)).put[0][0].data;
  ok('a black/white checker averages to grey, not to black or white (no nearest aliasing)',mixed[0]>40&&mixed[0]<215);
  const empty=thumb(64,64,'done',new Uint8Array(4096)).put[0][0].data;ok('empty pixels show the canvas colour in the icon',empty[0]===0xef&&empty[1]===0xe7&&empty[2]===0xd2);
  ok('a finished painting gets a wooden frame, a work in progress a pencil and no frame',sq.fill.some(f=>f[0]==='#9a6a36')&&!wip.fill.some(f=>f[0]==='#9a6a36')&&
    wip.fill.some(f=>f[0]==='#f2c84a')&&!sq.fill.some(f=>f[0]==='#f2c84a'));
  ok('a thumbnail never throws on a broken record (falls back to the default icon)',(()=>{try{const t=rec();V.crArtThumb({k:'art',st:'done',w:0,h:0,d:null},t.g,48);
    V.crArtThumb({k:'art',st:'wip',w:64,h:64,d:'garbage'},t.g,48);return true;}catch(e){return false;}})());

  /* ---- registrations and the interface ---- */
  ok('C1 registers the editor, the art thumbnail, both meshers, its tile painter, a tick and a reset',REG.ui.paint===V.crPaintUI&&REG.thumb.art===V.crArtThumb&&
    REG.mesh.easel===V.crEaselMesh&&REG.mesh.paint===V.crPaintMesh&&typeof REG.tile.cr_c1b==='function'&&REG.tick.includes(V.crArtTick)&&REG.onReset.includes(V.crArtReset));
  ok('the interface reaches __vox (CR_PALETTE, crArtBlank, crArtEncode, crArtDecode, crArtThumb, crPaintUI, crEaselMesh, crPaintMesh, crArtTick, crArtReset)',
    ['CR_PALETTE','crArtBlank','crArtEncode','crArtDecode','crArtThumb','crPaintUI','crEaselMesh','crPaintMesh','crArtTick','crArtReset'].every(k=>V[k]!==undefined&&V.__crx[k]===V[k]));
  ok('crPaintUI has open, close and key',['open','close','key'].every(k=>typeof V.crPaintUI[k]==='function'));
  ok('the board grows with the canvas aspect: square, wide (2:1), tall (1:2)',(()=>{const b=(w,h)=>{const n=V.crNew('art',{w,h,d:''});const r=V.crEaselBoard({id:V.crItemId(n)});V.crDiscard(n);return [r[1]-r[0],r[3]-r[2]];};
    const s=b(64,64),w=b(128,64),t=b(64,128),e=V.crEaselBoard({id:0});return Math.abs(s[0]-s[1])<1e-9&&Math.abs(w[0]-2*w[1])<1e-9&&Math.abs(t[1]-2*t[0])<1e-9&&e[0]===V.crEaselBoard(null)[0];})());
  ok('the editor zoom at 1280x720: 64x64 at 9, 128x64 at 7, 64x128 at 4 (all fit, nothing scrolls)',V.crPxZoom(64,64)===9&&V.crPxZoom(128,64)===7&&V.crPxZoom(64,128)===4);
  /* ---- source hygiene ---- */
  const GD=boot.SRC.cr,files=fs.readdirSync(GD).filter(f=>/^c1_[A-Za-z0-9_]+\.js$/.test(f)),src=files.map(f=>boot.readSrc(GD+f,{legacy:true})).join('\n');
  const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
  ok('C1 files ('+files.join(', ')+') use no Math.random, Date.now, performance.now or fetch anywhere',files.length>=3&&!/Math\.random|Date\.now|performance\.now|\bfetch\s*\(/.test(code));
  const decl=[];code.replace(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:var|let|const)\s+([A-Za-z_$][\w$]*)/gm,(m,a,b)=>{decl.push(a||b);return m;});
  const foreign=decl.filter(n=>!/^(CR_PALETTE$|crArt|crEasel|crPx|CRP|crPaint)/.test(n)||['crPaintCells','crPaintGeom','crPaintFits','crPaintSupported','crPaintLoaded'].includes(n));
  ok('every C1 top-level name ('+decl.length+') uses C1\'s prefixes (CR_PALETTE, crArt*, crPaint*, crEasel*, crPx*, CRP*)'+(foreign.length?' ('+foreign.join(',')+')':''),foreign.length===0);
  ok('C1 files are ASCII, never touch crStubs and never name TPEX/HRE/HRL/HRW',!/[^\x00-\x7f]/.test(src)&&!/crStubs/.test(src)&&!/\b(TPEX|HRE|HRL|HRW|tpRegister)\b/.test(code));
});
