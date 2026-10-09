/* ===================================================================== */
/* PART 2: TEXTURE ATLAS, ICONS                                          */
/* ===================================================================== */
const ATLAS=32, TPX=16, ATPX=ATLAS*TPX;
const Tl={}, TILE_FNS=[]; let _tn=0;
function tile(n,f){Tl[n]=_tn++;TILE_FNS.push([n,f]);}
function hexRGB(h){const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255];}
function rgbS(r,g,b,a){return a===undefined?'rgb('+(r|0)+','+(g|0)+','+(b|0)+')':'rgba('+(r|0)+','+(g|0)+','+(b|0)+','+a+')';}
function shade(h,f){const x=hexRGB(h);return rgbS(Math.min(255,x[0]*(1+f)),Math.min(255,x[1]*(1+f)),Math.min(255,x[2]*(1+f)));}
function px(c,x,y,col){c.fillStyle=col;c.fillRect(x,y,1,1);}
function fillN(c,R,base,v){for(let y=0;y<16;y++)for(let x=0;x<16;x++){c.fillStyle=shade(base,(R()*2-1)*v);c.fillRect(x,y,1,1);}}
function fillF(c,col){c.fillStyle=col;c.fillRect(0,0,16,16);}

/* ----- terrain tiles ----- */
tile('dirt',(c,R)=>fillN(c,R,'#866043',.13));
tile('grass_top',(c,R)=>fillN(c,R,'#72ab3d',.11));
tile('grass_side',(c,R)=>{fillN(c,R,'#866043',.13);
  for(let x=0;x<16;x++){const d=2+((R()*3)|0);for(let y=0;y<d;y++)px(c,x,y,shade('#72ab3d',(R()*2-1)*.12));}});
tile('stone',(c,R)=>{fillN(c,R,'#828282',.07);
  for(let i=0;i<5;i++){const x=(R()*16)|0,y=(R()*16)|0;for(let j=0;j<3;j++)px(c,(x+j)&15,y,shade('#6e6e6e',(R()-.5)*.2));}});
tile('cobble',(c,R)=>{fillF(c,'#4d4d4d');
  for(let i=0;i<12;i++){const x=(R()*14)|0,y=(R()*14)|0,w=2+((R()*3)|0),h=2+((R()*3)|0);
    c.fillStyle=shade('#8a8a8a',(R()*2-1)*.18);c.fillRect(x,y,w,h);}});
function planks(c,R,base){fillN(c,R,base,.06);
  c.fillStyle=shade(base,-.45);
  for(let y=3;y<16;y+=4)c.fillRect(0,y,16,1);
  for(let y=0;y<16;y+=4){const x=(((y/4)%2)?3:11)+((R()*2)|0);c.fillRect(x,y,1,3);}}
tile('plank_o',(c,R)=>planks(c,R,'#a8824f'));
tile('plank_b',(c,R)=>planks(c,R,'#d7c990'));
tile('plank_s',(c,R)=>planks(c,R,'#73512f'));
tile('sand',(c,R)=>fillN(c,R,'#decfa0',.07));
tile('gravel',(c,R)=>{fillN(c,R,'#8b8580',.10);
  for(let i=0;i<26;i++)px(c,(R()*16)|0,(R()*16)|0,shade(R()<.5?'#6e6259':'#a39a92',(R()*2-1)*.15));});
tile('log_top',(c,R)=>{fillN(c,R,'#6e5631',.06);
  const cols=['#3f2d17','#c2a36a','#5b4523','#a8854c'];
  for(let r=7;r>=1;r-=2){c.strokeStyle=cols[((7-r)/2)%4];c.strokeRect(8-r+.5,8-r+.5,2*r-1,2*r-1);}
  px(c,7,7,'#3f2d17');px(c,8,8,'#3f2d17');});
function bark(c,R,base,dk){fillN(c,R,base,.08);c.fillStyle=dk;
  for(let i=0;i<6;i++){c.fillRect((R()*16)|0,(R()*12)|0,1,3+((R()*5)|0));}}
tile('log_o',(c,R)=>bark(c,R,'#6b5430','#473418'));
tile('log_b',(c,R)=>{fillN(c,R,'#d9d6c8',.05);c.fillStyle='#2e2e28';
  for(let i=0;i<7;i++)c.fillRect((R()*14)|0,(R()*15)|0,2+((R()*2)|0),1);});
tile('log_s',(c,R)=>bark(c,R,'#4a3621','#2e2012'));
function leaf(c,R,a,b){fillF(c,a);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const r=R();
    if(r<.16)c.clearRect(x,y,1,1);else if(r<.5)px(c,x,y,shade(b,(R()-.5)*.2));}}
tile('leaf_o',(c,R)=>leaf(c,R,'#3e7a25','#4f9430'));
tile('leaf_b',(c,R)=>leaf(c,R,'#5f9a3f','#74b450'));
tile('leaf_s',(c,R)=>leaf(c,R,'#2e5d3a','#3a7048'));
tile('glass',(c,R)=>{c.clearRect(0,0,16,16);
  c.fillStyle='rgba(220,240,248,0.92)';
  c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);c.fillRect(0,0,1,16);c.fillRect(15,0,1,16);
  c.fillStyle='rgba(255,255,255,0.85)';
  for(let i=0;i<4;i++)c.fillRect(11-i,2+i,1,1);
  for(let i=0;i<3;i++)c.fillRect(6-i,7+i,1,1);});
function ore(c,R,col){fillN(c,R,'#828282',.07);
  for(let i=0;i<5;i++){const x=1+((R()*12)|0),y=1+((R()*12)|0);
    c.fillStyle=col;c.fillRect(x,y,2,1);c.fillRect(x,y+1,1,1);
    c.fillStyle=shade(col,-.3);c.fillRect(x+1,y+1,1,1);}}
tile('ore_coal',(c,R)=>ore(c,R,'#2c2c2c'));
tile('ore_iron',(c,R)=>ore(c,R,'#dcb39a'));
tile('ore_gold',(c,R)=>ore(c,R,'#fce14b'));
tile('ore_dia',(c,R)=>ore(c,R,'#52e0df'));
tile('bedrock',(c,R)=>{fillN(c,R,'#565656',.3);
  for(let i=0;i<10;i++){c.fillStyle=R()<.5?'#222':'#777';
    c.fillRect((R()*13)|0,(R()*13)|0,2+((R()*3)|0),2+((R()*3)|0));}});
tile('water',(c,R)=>{c.clearRect(0,0,16,16);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const v=(R()*2-1)*.08;
    c.fillStyle=rgbS(40*(1+v),96*(1+v),215*(1+v),.78);c.fillRect(x,y,1,1);}});
tile('sandstone_t',(c,R)=>fillN(c,R,'#d9cd96',.05));
tile('sandstone',(c,R)=>{fillN(c,R,'#d9cd96',.05);c.fillStyle='#b3a572';
  c.fillRect(0,4,16,1);c.fillRect(0,9,16,1);c.fillRect(0,13,16,1);
  for(let i=0;i<8;i++)px(c,(R()*16)|0,5+((R()*4)|0),'#bfb077');});
tile('snow',(c,R)=>fillN(c,R,'#f4fbfc',.03));
tile('snow_side',(c,R)=>{fillN(c,R,'#866043',.13);
  for(let x=0;x<16;x++){const d=3+((R()*2)|0);for(let y=0;y<d;y++)px(c,x,y,shade('#f4fbfc',(R()-.5)*.05));}});
tile('cactus',(c,R)=>{fillN(c,R,'#5f8f38',.08);c.fillStyle='#3e6322';
  for(let x=2;x<16;x+=4)c.fillRect(x,0,1,16);
  for(let i=0;i<6;i++)px(c,(R()*16)|0,(R()*16)|0,'#e8efcf');});
tile('cactus_t',(c,R)=>{fillN(c,R,'#6fa040',.06);c.strokeStyle='#3e6322';c.strokeRect(1.5,1.5,13,13);});
tile('wool',(c,R)=>{fillN(c,R,'#e8e8e8',.05);c.fillStyle='#d2d2d2';
  for(let y=0;y<16;y+=2)for(let x=(y/2)%2;x<16;x+=2)c.fillRect(x,y,1,1);});
tile('brick',(c,R)=>{fillN(c,R,'#9b5243',.08);c.fillStyle='#c8c0b4';
  for(let y=3;y<16;y+=4)c.fillRect(0,y,16,1);
  for(let r=0;r<4;r++){const off=r%2?2:8;c.fillRect(off,r*4,1,3);c.fillRect((off+8)%16,r*4,1,3);}});
tile('stonebrick',(c,R)=>{fillN(c,R,'#8a8a8a',.05);c.fillStyle='#585858';
  c.fillRect(0,7,16,1);c.fillRect(0,15,16,1);
  c.fillRect(7,0,1,7);c.fillRect(3,8,1,7);c.fillRect(11,8,1,7);
  c.fillStyle='#a5a5a5';c.fillRect(0,0,16,1);c.fillRect(0,8,16,1);});
tile('craft_t',(c,R)=>{planks(c,R,'#a8824f');
  c.fillStyle='#5d4426';
  c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);c.fillRect(0,0,1,16);c.fillRect(15,0,1,16);
  c.fillRect(4,4,8,1);c.fillRect(4,11,8,1);c.fillRect(4,4,1,8);c.fillRect(11,4,1,8);
  c.fillRect(7,4,1,8);c.fillRect(4,7,8,1);});
tile('craft_s',(c,R)=>{planks(c,R,'#a8824f');
  c.fillStyle='#7d5d33';c.fillRect(2,2,12,6);
  c.fillStyle='#4a3017';
  c.fillRect(2,2,12,1);c.fillRect(2,7,12,1);c.fillRect(2,2,1,6);c.fillRect(13,2,1,6);
  c.fillRect(7,3,2,4);});
tile('furn_t',(c,R)=>fillN(c,R,'#7a7a7a',.06));
tile('furn_f',(c,R)=>{fillN(c,R,'#7a7a7a',.06);
  c.fillStyle='#969696';c.fillRect(2,2,12,4);
  c.fillStyle='#1c1c1c';c.fillRect(4,9,8,5);
  c.fillStyle='#3a3a3a';c.fillRect(5,9,1,5);c.fillRect(8,9,1,5);c.fillRect(11,9,1,5);});
tile('chest_t',(c,R)=>{planks(c,R,'#9a7034');c.fillStyle='#5a3d18';
  c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);c.fillRect(0,0,1,16);c.fillRect(15,0,1,16);});
tile('chest_f',(c,R)=>{planks(c,R,'#9a7034');c.fillStyle='#5a3d18';
  c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);c.fillRect(0,0,1,16);c.fillRect(15,0,1,16);
  c.fillStyle='#3a3a3a';c.fillRect(1,6,14,1);
  c.fillStyle='#8f8f8f';c.fillRect(7,5,2,4);c.fillStyle='#4a4a4a';c.fillRect(7,7,2,1);});
tile('tnt_s',(c,R)=>{fillN(c,R,'#c33b2c',.08);
  c.fillStyle='#e8e3d6';c.fillRect(0,5,16,5);
  c.fillStyle='#1a1a1a';
  c.fillRect(2,6,3,1);c.fillRect(3,6,1,3);
  c.fillRect(12,6,3,1);c.fillRect(13,6,1,3);
  c.fillRect(7,6,1,3);c.fillRect(9,6,1,3);px(c,8,7,'#1a1a1a');});
tile('tnt_t',(c,R)=>{fillN(c,R,'#c33b2c',.08);
  c.strokeStyle='#7d2418';c.strokeRect(1.5,1.5,13,13);
  c.fillStyle='#e8e3d6';c.fillRect(6,6,4,4);
  c.fillStyle='#1a1a1a';c.fillRect(7,7,2,2);});
tile('torch',(c,R)=>{c.clearRect(0,0,16,16);
  c.fillStyle='#7a5b30';c.fillRect(7,6,2,8);
  c.fillStyle='#5d431f';c.fillRect(8,6,1,8);
  c.fillStyle='#ffdc5e';c.fillRect(7,4,2,2);
  px(c,7,4,'#fff6b8');});
tile('tallgrass',(c,R)=>{c.clearRect(0,0,16,16);
  for(let i=0;i<9;i++){const x=1+((R()*14)|0),h=5+((R()*9)|0);
    c.fillStyle=shade('#5d9434',(R()-.5)*.3);c.fillRect(x,16-h,1,h);}});
function flower(c,R,col){c.clearRect(0,0,16,16);
  c.fillStyle='#3f7a26';c.fillRect(7,8,1,8);c.fillRect(5,11,2,1);c.fillRect(6,10,1,1);
  c.fillStyle=col;c.fillRect(6,4,3,3);px(c,7,3,col);px(c,5,5,col);px(c,9,5,col);px(c,7,7,col);
  px(c,7,5,shade(col,.45));}
tile('flower_r',(c,R)=>flower(c,R,'#d23b32'));
tile('flower_y',(c,R)=>flower(c,R,'#f0d432'));
tile('clay',(c,R)=>fillN(c,R,'#9aa4b0',.06));
tile('ice',(c,R)=>{c.clearRect(0,0,16,16);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const v=(R()*2-1)*.05;
    c.fillStyle=rgbS(165*(1+v),205*(1+v),245*(1+v),.85);c.fillRect(x,y,1,1);}
  c.fillStyle='rgba(255,255,255,0.5)';c.fillRect(3,3,1,4);c.fillRect(4,7,1,3);c.fillRect(10,5,1,5);});

/* ----- item icon tiles ----- */
tile('i_stick',c=>{c.clearRect(0,0,16,16);c.fillStyle='#7a5b30';
  for(let i=0;i<8;i++)c.fillRect(4+i,12-i,2,1);});
function blobI(c,a,b){c.clearRect(0,0,16,16);c.fillStyle=a;
  c.fillRect(4,5,8,7);c.fillRect(5,4,6,9);c.fillRect(3,6,10,5);
  c.fillStyle=b;c.fillRect(5,5,3,2);}
tile('i_coal',c=>blobI(c,'#2b2b2b','#4a4a4a'));
function ingot(c,col){c.clearRect(0,0,16,16);
  c.fillStyle=shade(col,.25);for(let i=0;i<3;i++)c.fillRect(5+i,8-i,7,1);
  c.fillStyle=col;c.fillRect(4,9,8,4);
  c.fillStyle=shade(col,-.35);c.fillRect(4,12,8,1);}
tile('i_iron',c=>ingot(c,'#d8d8d8'));
tile('i_gold',c=>ingot(c,'#f5cf3a'));
tile('i_dia',c=>{c.clearRect(0,0,16,16);
  for(let i=0;i<5;i++){c.fillStyle=i<2?'#bdfdfb':'#3ee6e2';c.fillRect(7-i,3+i,2+2*i,1);}
  for(let i=0;i<5;i++){c.fillStyle='#2cc0c0';c.fillRect(3+i,8+i,10-2*i,1);}});
tile('i_clay',c=>blobI(c,'#9aa4b0','#bcc5cf'));
tile('i_brick',c=>{c.clearRect(0,0,16,16);c.fillStyle='#9b5243';c.fillRect(4,6,8,5);
  c.fillStyle='#b56a59';c.fillRect(4,6,8,1);c.fillStyle='#6d352a';c.fillRect(4,10,8,1);});
tile('i_gun',c=>{c.clearRect(0,0,16,16);c.fillStyle='#8a8a8a';
  c.fillRect(4,10,8,3);c.fillRect(6,8,4,2);c.fillRect(7,7,2,1);
  c.fillStyle='#5d5d5d';px(c,5,11,'#5d5d5d');px(c,8,9,'#5d5d5d');px(c,10,11,'#5d5d5d');});
tile('i_string',c=>{c.clearRect(0,0,16,16);c.fillStyle='#e8e8e8';
  for(let i=0;i<12;i++){const y=8+Math.round(2.4*Math.sin(i*.7));c.fillRect(2+i,y,1,2);}});
tile('i_arrow',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#7a5b30';for(let i=0;i<7;i++)c.fillRect(3+i,12-i,1,1);
  c.fillStyle='#bdbdbd';c.fillRect(11,3,2,2);px(c,10,5,'#bdbdbd');px(c,13,2,'#e8e8e8');
  c.fillStyle='#dcdcdc';c.fillRect(2,13,2,1);c.fillRect(2,11,1,2);px(c,4,13,'#dcdcdc');});
tile('i_apple',c=>{c.clearRect(0,0,16,16);c.fillStyle='#d2312b';
  c.fillRect(5,6,6,6);c.fillRect(4,7,8,4);c.fillRect(6,5,4,8);
  c.fillStyle='#5d3a18';c.fillRect(8,3,1,3);c.fillStyle='#4f8f2d';c.fillRect(9,3,2,1);
  c.fillStyle='#f08a80';c.fillRect(6,6,1,2);});
function meat(c,a,b){c.clearRect(0,0,16,16);c.fillStyle=a;
  c.fillRect(4,5,9,7);c.fillRect(3,6,11,5);c.fillRect(5,4,7,9);
  c.fillStyle=b;c.fillRect(5,6,4,3);px(c,10,9,b);}
tile('i_pork',c=>meat(c,'#f0a0a8','#f8d4ce'));
tile('i_porkc',c=>meat(c,'#b97a4a','#e0aa78'));
tile('i_beef',c=>meat(c,'#a8413a','#d28a80'));
tile('i_steak',c=>meat(c,'#7a4a2c','#a8744c'));
tile('i_flesh',c=>meat(c,'#8a6a4a','#5d7a3a'));
tile('i_bow',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#ddd';c.fillRect(8,2,1,11);
  c.fillStyle='#7a5b30';
  const P=[[9,2],[10,2],[11,3],[12,4],[12,5],[13,6],[13,7],[13,8],[12,9],[12,10],[11,11],[10,12],[9,12]];
  for(const p of P){c.fillRect(p[0],p[1],1,1);c.fillRect(p[0],p[1]+1,1,1);}});

/* ----- tool icons ----- */
function diag2(c,x0,y0,n,col){c.fillStyle=col;
  for(let i=0;i<n;i++){c.fillRect(x0+i,y0-i,1,1);c.fillRect(x0+i+1,y0-i,1,1);}}
function drawTool(c,m,t){
  c.clearRect(0,0,16,16);
  const col=TOOLMAT[m].col,dk=shade(col,-.35),hc='#7a5b30';
  if(t===0){ // pickaxe
    diag2(c,3,12,8,hc);
    const P=[[3,7],[3,6],[4,5],[5,4],[6,3],[7,3],[8,2],[9,2],[10,3],[11,3],[12,4],[13,5],[13,6],[13,7]];
    for(const p of P){c.fillStyle=col;c.fillRect(p[0],p[1],1,1);c.fillStyle=dk;c.fillRect(p[0],p[1]+1,1,1);}
  }else if(t===1){ // axe
    diag2(c,3,13,8,hc);
    c.fillStyle=col;c.fillRect(7,2,5,3);c.fillRect(6,4,5,3);
    c.fillStyle=dk;c.fillRect(6,6,4,1);c.fillRect(11,2,1,3);
  }else if(t===2){ // shovel
    diag2(c,3,13,7,hc);
    c.fillStyle=col;c.fillRect(9,2,5,4);c.fillRect(10,1,3,6);
    c.fillStyle=dk;c.fillRect(10,6,3,1);c.fillRect(13,2,1,4);
  }else{ // sword
    diag2(c,2,13,2,hc);
    c.fillStyle='#54390f';c.fillRect(3,10,2,2);c.fillRect(4,11,2,2);
    diag2(c,5,10,8,col);
    c.fillStyle=shade(col,.4);for(let i=0;i<8;i++)c.fillRect(6+i,10-i,1,1);
    px(c,13,2,col);
  }
}
for(let m=0;m<5;m++)for(let t=0;t<4;t++){
  (function(mm,tt){tile('tool_'+mm+'_'+tt,c=>drawTool(c,mm,tt));})(m,t);
}

/* ----- atlas build + per-block tile resolution ----- */
let atlasCanvas=null, atlasTex=null;
const AVGCOL={};
function buildAtlas(){
  crTiles();
  atlasCanvas=document.createElement('canvas');
  atlasCanvas.width=ATPX;atlasCanvas.height=ATPX;
  const g=atlasCanvas.getContext('2d');
  g.imageSmoothingEnabled=false;
  for(const tf of TILE_FNS){const i=Tl[tf[0]];
    g.save();g.translate((i%ATLAS)*TPX,((i/ATLAS)|0)*TPX);
    g.beginPath();g.rect(0,0,16,16);g.clip();
    tf[1](g,mulberry32(((i*2654435761)^0x9e3779b9)>>>0));
    g.restore();}
  const data=g.getImageData(0,0,ATPX,ATPX).data;
  for(const idS in DEFS){const id=+idS,d=DEFS[id];
    if(d.item||!d.tiles)continue;
    const t=d.tiles;
    d._t=(typeof t==='string')?{top:Tl[t],side:Tl[t],bot:Tl[t]}
      :{top:Tl[t.top],side:Tl[t.side],bot:Tl[t.bot]};
    const ti=d._t.side,tx=(ti%ATLAS)*16,ty=((ti/ATLAS)|0)*16;
    let r=0,gg=0,b=0,n=0;
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){
      const o=((ty+y)*ATPX+(tx+x))*4;
      if(data[o+3]>40){r+=data[o];gg+=data[o+1];b+=data[o+2];n++;}}
    AVGCOL[id]=n?[r/n|0,gg/n|0,b/n|0]:[128,128,128];
  }
  atlasTex=new THREE.CanvasTexture(atlasCanvas);
  atlasTex.magFilter=THREE.NearestFilter;
  atlasTex.minFilter=THREE.NearestFilter;
  atlasTex.generateMipmaps=false;
}
function tileUV(i){const tx=i%ATLAS,ty=(i/ATLAS)|0,e=.5/ATPX;
  return[tx/ATLAS+e,1-(ty+1)/ATLAS+e,(tx+1)/ATLAS-e,1-ty/ATLAS-e];}

/* ----- inventory icons (isometric block render / flat item) ----- */
const ICONS={};
let _ftC=null,_ftG=null;
function drawIso(g,id,s){
  if(!_ftC){_ftC=document.createElement('canvas');_ftC.width=_ftC.height=16;
    _ftG=_ftC.getContext('2d');_ftG.imageSmoothingEnabled=false;}
  const d=DEFS[id],S=s*.47,k=S/16,cx=s/2,y0=s*.03;
  function face(ti,dark,a,b,c2,d2,e,f){
    _ftG.clearRect(0,0,16,16);
    _ftG.globalCompositeOperation='source-over';
    _ftG.drawImage(atlasCanvas,(ti%ATLAS)*16,((ti/ATLAS)|0)*16,16,16,0,0,16,16);
    if(dark>0){_ftG.globalCompositeOperation='source-atop';
      _ftG.fillStyle='rgba(0,5,25,'+dark+')';_ftG.fillRect(0,0,16,16);
      _ftG.globalCompositeOperation='source-over';}
    g.setTransform(a,b,c2,d2,e,f);g.drawImage(_ftC,0,0,16,16,0,0,16,16);
    g.setTransform(1,0,0,1,0,0);
  }
  const lx=cx-S*.866,ly=y0+S*.5;
  face(d._t.top, 0,   k*.866, k*.5, -k*.866, k*.5, cx, y0);
  face(d._t.side,.25, k*.866, k*.5,  0,      k,    lx, ly);
  face(d._t.side,.45, k*.866,-k*.5,  0,      k,    cx, y0+S);
}
function getIcon(id){
  if(ICONS[id])return ICONS[id];
  const cv=document.createElement('canvas');cv.width=cv.height=48;
  const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  const d=DEFS[id];
  if(d.ipaint){const c16=document.createElement('canvas');c16.width=c16.height=16;d.ipaint(c16.getContext('2d'),mulberry32(((id*2654435761)^0x5bd1e995)>>>0));g.drawImage(c16,0,0,16,16,4,4,40,40);}
  else if(d.item){const ti=Tl[d.icon];
    g.drawImage(atlasCanvas,(ti%ATLAS)*16,((ti/ATLAS)|0)*16,16,16,4,4,40,40);}
  else if(d.cross){const ti=d._t.side;
    g.drawImage(atlasCanvas,(ti%ATLAS)*16,((ti/ATLAS)|0)*16,16,16,4,4,40,40);}
  else drawIso(g,id,48);
  ICONS[id]=cv;return cv;
}
function drawStackIn(g,st,x,y,sz){
  if(!st)return;
  g.imageSmoothingEnabled=false;
  if(st.id===IT.SUBBTN){
    /* drawn at slot resolution so SUBSCRIBE is actually readable */
    g.fillStyle='#7a0000';g.fillRect(x+sz*0.04,y+sz*0.32,sz*0.92,sz*0.42);
    g.fillStyle='#cc0000';g.fillRect(x+sz*0.02,y+sz*0.28,sz*0.92,sz*0.42);
    g.fillStyle='#ff2a2a';g.fillRect(x+sz*0.02,y+sz*0.28,sz*0.92,sz*0.09);
    g.fillStyle='#fff';g.font='bold '+Math.max(6,Math.round(sz*0.17))+'px sans-serif';
    g.textAlign='center';g.textBaseline='middle';
    g.fillText('SUBSCRIBE',x+sz*0.48,y+sz*0.50,sz*0.88);
  }else g.drawImage(getIcon(st.id),x,y,sz,sz);
  if(st.mob&&MOBT[st.mob.t]){
    g.fillStyle='#15151a';g.fillRect(x+sz*0.55,y+sz*0.07,sz*0.36,sz*0.36);
    g.fillStyle=MOBT[st.mob.t].body;g.fillRect(x+sz*0.60,y+sz*0.12,sz*0.26,sz*0.26);
  }
  const d=DEFS[st.id];
  const maxDur=d.tool?d.tool.dur:(d.dur||0);
  if(maxDur&&st.dur!==undefined&&st.dur<maxDur){
    const f=Math.max(0,st.dur/maxDur);
    g.fillStyle='#222';g.fillRect(x+sz*.1,y+sz*.86,sz*.8,Math.max(2,sz*.06));
    g.fillStyle='hsl('+(f*120|0)+',85%,50%)';
    g.fillRect(x+sz*.1,y+sz*.86,sz*.8*f,Math.max(2,sz*.06));
  }
  if(st.count>1){
    g.font='bold '+Math.round(sz*.42)+'px monospace';
    g.textAlign='right';g.textBaseline='alphabetic';
    g.fillStyle='#2a2a2a';g.fillText(st.count,x+sz-1,y+sz-1);
    g.fillStyle='#fff';g.fillText(st.count,x+sz-2,y+sz-2);
  }
}

