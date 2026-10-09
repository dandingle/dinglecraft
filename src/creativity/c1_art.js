/* ---- PART 56: c1_art.js ---- */
/* PART 56 c1_art.js (C1, paintings): the palette, the art codec, item thumbnails and C1's tile painters.
   CREATIVITY_PLAN.md section 7. A painting is w x h palette indices (0 = empty, 1..24 = CR_PALETTE[i-1]); its saved payload
   (rec.d) is ONE string: 'B' + base64url of a bit stream (literal / run / copy tokens: up, two left, up-left, up-right) or 'P' + base64url of
   5-bit packed indices, whichever is shorter. 'P' bounds the worst case: any 128x64 image packs to <= 6,828 chars (cap 7,000).
   Decoding never throws: anything malformed decodes to an empty canvas. Pure functions, no randomness, no clock. */
const CR_PALETTE=['#000000','#ffffff','#9d9d9d','#4a4a4a','#e83b3b','#f57d4a','#fbd84a','#71c84a','#2f8a3e','#4ac7e8','#3b6fe8','#2a2f8a',
  '#a64ae8','#f07ac8','#8a5b2d','#5e3c1c','#f2c8a0','#c88a5a','#7a1f2a','#1f5a5a','#b8e8a0','#fff4c8','#a0c8ff','#5a2a6a'];  /* index 1..24; 0 = empty */
const CRP_NAMES=['Black','White','Light grey','Dark grey','Red','Orange','Yellow','Green','Dark green','Cyan','Blue','Navy',
  'Purple','Pink','Brown','Dark brown','Skin','Tan','Maroon','Teal','Mint','Cream','Sky','Plum'];
const CRP_CANVAS='#efe7d2';                         /* an empty pixel, as it shows on a hung painting (the cr_canvas tile colour) */
const CRP_B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
var CRP_B64R=null,CRP_RGB=null;
function crArtRGB(){if(CRP_RGB)return CRP_RGB;const o=[hexRGB(CRP_CANVAS)];for(const c of CR_PALETTE)o.push(hexRGB(c));
  CRP_RGB=o;return o;}                               /* [0] = canvas colour, [i] = palette i */
function crArtOkSize(w,h){return (w|0)===w&&(h|0)===h&&w>0&&h>0&&w<=256&&h<=256;}
/* ---- base64url (no padding) ---- */
function crArtB64(b){let s='';const n=b.length;
  for(let i=0;i<n;i+=3){const v=(b[i]<<16)|((i+1<n?b[i+1]:0)<<8)|(i+2<n?b[i+2]:0);
    s+=CRP_B64[(v>>18)&63]+CRP_B64[(v>>12)&63];if(i+1<n)s+=CRP_B64[(v>>6)&63];if(i+2<n)s+=CRP_B64[v&63];}
  return s;}
function crArtB64d(s){if(!CRP_B64R){CRP_B64R=new Int16Array(128).fill(-1);for(let i=0;i<64;i++)CRP_B64R[CRP_B64.charCodeAt(i)]=i;}
  const n=s.length;if(n%4===1)return null;const out=new Uint8Array((n*3)>>2);let o=0;
  for(let i=0;i<n;i+=4){let v=0,k=0;
    for(;k<4&&i+k<n;k++){const c=s.charCodeAt(i+k),d=c<128?CRP_B64R[c]:-1;if(d<0)return null;v=(v<<6)|d;}
    v<<=6*(4-k);
    out[o++]=(v>>16)&255;if(k>2)out[o++]=(v>>8)&255;if(k>3)out[o++]=v&255;}
  return o===out.length?out:out.slice(0,o);}
/* ---- bit stream ---- */
function crArtPut(w,v,n){for(let i=n-1;i>=0;i--){w.a=(w.a<<1)|((v>>>i)&1);if(++w.n===8){w.b.push(w.a);w.a=0;w.n=0;}}}
function crArtEG(w,v){const x=v+1,l=31-Math.clz32(x);crArtPut(w,0,l);crArtPut(w,x,l+1);}   /* exp-Golomb order 0 */
function crArtGet(r,n){let v=0;
  for(let k=0;k<n;k++){const bi=r.i>>3;if(bi>=r.b.length)throw new Error('crArt: short');v=(v<<1)|((r.b[bi]>>(7-(r.i&7)))&1);r.i++;}
  return v;}
function crArtEGr(r){let l=0;while(crArtGet(r,1)===0){if(++l>24)throw new Error('crArt: run');}return ((1<<l)|crArtGet(r,l))-1;}
/* ---- encode: indices -> payload string ---- */
/* 'B' tokens: 0+idx5 = one pixel; 10+idx5+EG(len-2) = a run of one colour; 11+mode3+EG(len-1) = copy len pixels from i+crArtOffs(w)[mode]
   (the row above; 2 left: period-2 patterns; up-left / up-right: slopes and dithers; 2 rows up: checkers across whole rows; up 2 left /
   up 2 right: shallow slopes; 4 left: period-4 patterns). Greedy: the token that saves the most bits. Frozen with v6.2 saves. */
function crArtOffs(w){return [-w,-2,-w-1,-w+1,-2*w,-w-2,-w+2,-4];}
function crArtEGn(v){return 2*(31-Math.clz32(v+1))+1;}            /* bits of EG(v) */
function crArtEncode(px,w,h){w=w|0;h=h|0;const n=w*h,q=new Uint8Array(n),O=crArtOffs(w);
  for(let i=0;i<n;i++){const v=px&&px[i];q[i]=v>=1&&v<=24?v|0:0;}
  const W={b:[],a:0,n:0};
  for(let i=0;i<n;){const c=q[i];let r=1;while(i+r<n&&q[i+r]===c)r++;
    let best=0,bl=1,bm=-1;                          /* bits saved over literals (6 per pixel): a literal saves 0 */
    if(r>=2){const s1=6*r-(7+crArtEGn(r-2));if(s1>best){best=s1;bl=r;bm=-2;}}
    for(let m=0;m<8;m++){const o=O[m];if(i+o<0||o>=0)continue;let k=0;while(i+k<n&&q[i+k]===q[i+k+o])k++;
      if(k<1)continue;const s2=6*k-(5+crArtEGn(k-1));if(s2>best){best=s2;bl=k;bm=m;}}
    if(bm>=0){crArtPut(W,3,2);crArtPut(W,bm,3);crArtEG(W,bl-1);i+=bl;}
    else if(bm===-2){crArtPut(W,2,2);crArtPut(W,c,5);crArtEG(W,bl-2);i+=bl;}
    else{crArtPut(W,0,1);crArtPut(W,c,5);i++;}}
  if(W.n)W.b.push(W.a<<(8-W.n));
  const pb=Math.ceil(n*5/8);
  if(W.b.length<=pb)return 'B'+crArtB64(W.b);
  const Q=new Uint8Array(pb);let bit=0;                /* 'P': 5 bits per pixel, most significant bit first */
  for(let i=0;i<n;i++)for(let s=4;s>=0;s--,bit++)if((q[i]>>s)&1)Q[bit>>3]|=128>>(bit&7);
  return 'P'+crArtB64(Q);}
/* ---- decode: payload -> Uint8Array(w*h); never throws, bad data is an empty canvas ---- */
function crArtDecode(d,w,h){if(!crArtOkSize(w,h))return new Uint8Array(0);const n=w*h,out=new Uint8Array(n);
  if(typeof d!=='string'||d.length<2)return out;
  try{const b=crArtB64d(d.slice(1));if(!b)return out;
    if(d[0]==='P'){if(b.length<Math.ceil(n*5/8))return out;let bit=0;
      for(let i=0;i<n;i++){let v=0;for(let s=0;s<5;s++,bit++)v=(v<<1)|((b[bit>>3]>>(7-(bit&7)))&1);if(v>24)return new Uint8Array(n);out[i]=v;}
      return out;}
    if(d[0]!=='B')return out;
    const r={b,i:0},O=crArtOffs(w);
    for(let i=0;i<n;){
      if(crArtGet(r,1)===0){const v=crArtGet(r,5);if(v>24)throw new Error('crArt: index');out[i++]=v;}
      else if(crArtGet(r,1)===0){const v=crArtGet(r,5),L=crArtEGr(r)+2;if(v>24||i+L>n)throw new Error('crArt: run');out.fill(v,i,i+L);i+=L;}
      else{const o=O[crArtGet(r,3)],L=crArtEGr(r)+1;if(i+o<0||i+L>n)throw new Error('crArt: copy');for(let k=0;k<L;k++,i++)out[i]=out[i+o];}}
    return out;}
  catch(e){return new Uint8Array(n);}}
function crArtBlank(w,h){return crArtEncode(new Uint8Array((w|0)*(h|0)),w,h);}
function crArtEmpty(px){for(let i=0;i<px.length;i++)if(px[i])return false;return true;}
/* ---- pixels -> RGBA (an ImageData-like {data}); empty = transparent (bg null) or a background rgb ---- */
function crArtFill(data,px,bg){const C=crArtRGB();
  for(let i=0,o=0;i<px.length;i++,o+=4){const v=px[i];
    if(v){const c=C[v];data[o]=c[0];data[o+1]=c[1];data[o+2]=c[2];data[o+3]=255;}
    else if(bg){data[o]=bg[0];data[o+1]=bg[1];data[o+2]=bg[2];data[o+3]=255;}
    else{data[o]=data[o+1]=data[o+2]=data[o+3]=0;}}}
/* draw the art 1:1 into a 2D context at (x,y), empty pixels as the canvas colour (bg true) or transparent */
function crArtDraw(g,px,w,h,x,y,bg){if(!g||typeof g.getImageData!=='function')return false;const im=g.getImageData(x|0,y|0,w,h);
  if(!im||!im.data||im.data.length<w*h*4)return false;crArtFill(im.data,px,bg?crArtRGB()[0]:null);g.putImageData(im,x|0,y|0);return true;}
/* ---- item thumbnail (CRREG.thumb.art): framed, box-averaged to fit, aspect kept; a work in progress is unframed + a pencil ---- */
const CRP_PENCIL=['.......kk.','......kppk','.....kgppk','....kyogk.','...kyyok..','..kyyok...','.ktyok....','.kttk.....','kkkk......'];
const CRP_PENC={k:'#2a2a2a',p:'#f08aa0',g:'#9a9a9a',y:'#f2c84a',o:'#c8901e',t:'#e8c89a'};
function crArtThumb(r,g,s){g.clearRect(0,0,s,s);const W=r.w|0,H=r.h|0;
  if(!crArtOkSize(W,H)){crThumbDef(r,g,s);return;}
  const done=r.st==='done',m=Math.round(s*0.06),fw=done?Math.max(2,Math.round(s/14)):1,box=s-2*m-2*fw-2;
  const sc=Math.min(box/W,box/H),tw=Math.max(1,Math.round(W*sc)),th=Math.max(1,Math.round(H*sc));
  const x0=Math.floor((s-tw)/2),y0=Math.floor((s-th)/2);
  if(done){g.fillStyle='#3e2810';g.fillRect(x0-fw-1,y0-fw-1,tw+2*fw+2,th+2*fw+2);g.fillStyle='#9a6a36';g.fillRect(x0-fw,y0-fw,tw+2*fw,th+2*fw);
    g.fillStyle='#6e4420';g.fillRect(x0-1,y0-1,tw+2,th+2);}
  else{g.fillStyle='#6a6458';g.fillRect(x0-1,y0-1,tw+2,th+2);}
  const px=crArtDecode(r.d,W,H),C=crArtRGB(),im=typeof g.getImageData==='function'?g.getImageData(x0,y0,tw,th):null;
  if(im&&im.data&&im.data.length>=tw*th*4){const D=im.data;
    const fx=W/tw,fy=H/th;                            /* area-weighted box filter: every source pixel counts by its overlap */
    for(let ty=0;ty<th;ty++){const ya=ty*fy,yb=ya+fy;
      for(let tx=0;tx<tw;tx++){const xa=tx*fx,xb=xa+fx;let R=0,G=0,Bb=0,k=0;
        for(let y=Math.floor(ya);y<yb&&y<H;y++){const wy=Math.min(yb,y+1)-Math.max(ya,y);if(wy<=0)continue;
          for(let x=Math.floor(xa);x<xb&&x<W;x++){const wx=Math.min(xb,x+1)-Math.max(xa,x);if(wx<=0)continue;const c=C[px[y*W+x]],q=wx*wy;
            R+=c[0]*q;G+=c[1]*q;Bb+=c[2]*q;k+=q;}}
        const o=(ty*tw+tx)*4;D[o]=Math.round(R/k);D[o+1]=Math.round(G/k);D[o+2]=Math.round(Bb/k);D[o+3]=255;}}
    g.putImageData(im,x0,y0);}
  if(!done){const z=Math.max(1,Math.round(s/48)),ox=s-10*z-1,oy=s-9*z-1;
    CRP_PENCIL.forEach((row,y)=>{for(let x=0;x<row.length;x++){const c=CRP_PENC[row[x]];if(c){g.fillStyle=c;g.fillRect(ox+x*z,oy+y*z,z,z);}}});}}
/* ---- tile painters (CRREG.tile, seeded by tile name in c0): the back of a stretched canvas, for the easel board ---- */
function crArtTileBack(c,R){fillN(c,R,'#d8cdb2',.04);c.fillStyle='#8a5b2d';c.fillRect(0,0,16,2);c.fillRect(0,14,16,2);c.fillRect(0,0,2,16);c.fillRect(14,0,2,16);
  c.fillRect(7,2,2,12);c.fillStyle='#6e4420';c.fillRect(0,15,16,1);c.fillRect(15,0,1,16);c.fillRect(7,2,1,12);}
CRREG.tile.cr_c1b=crArtTileBack;
CRREG.thumb.art=crArtThumb;
Object.assign(CREX,{CR_PALETTE,CRP_NAMES,crArtBlank,crArtEncode,crArtDecode,crArtThumb,crArtEmpty,crArtDraw});
