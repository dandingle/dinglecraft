/* ---- PART 55: p2_tiles.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p2_tiles.js (P2): the 63 OG purgatory tiles, slots 222-284 (the PART 55 build plan 2.3; design notes 15.1-15.2).
   The ONLY tile() calls in PART 55, at top level, in exactly the pinned order (slot = 222 + position). The look is a 1997
   licensed Puppets PC game done cheaply and with total confidence: 70s TV saturation dulled by grime, felt = flat noise and a
   stitched line, fleece/shag = streaky strokes, foam = mustard with pores, ores read as OBJECTS (googly discs, coat hangers,
   sequins, fingertips), painted flats are deliberately bad gouache, skin looks wrong next to the felt, and the cross-sections
   (felt ring, pink flesh, white bone dot) are the "you break puppet flesh" moment. Painters get (c,R): c is translated and
   clipped to the 16x16 cell, R is mulberry32 seeded by the slot (so the noise never drifts while the order holds).
   --------------------------------------------------------------------------------------------------------------------- */
/* ---- painter helpers (P2's pi* names) ---- */
function piTDisc(c,cx,cy,r,col){c.fillStyle=col;for(let y=-Math.ceil(r);y<=Math.ceil(r);y++)for(let x=-Math.ceil(r);x<=Math.ceil(r);x++)
  if(x*x+y*y<=r*r+0.3){const X=Math.round(cx+x),Y=Math.round(cy+y);if(X>=0&&X<16&&Y>=0&&Y<16)c.fillRect(X,Y,1,1);}}
function piTFelt(c,R,base,v){fillN(c,R,base,v==null?0.08:v);   /* felt: flat noise plus a few lint fibres */
  for(let i=0;i<10;i++)px(c,(R()*16)|0,(R()*16)|0,shade(base,0.18+R()*0.1));}
function piTStitchV(c,x,col){for(let y=0;y<16;y+=3){px(c,x,y,col);px(c,x,y+1,col);}}            /* a dashed running stitch */
function piTStitchH(c,y,col){for(let x=1;x<16;x+=3){px(c,x,y,col);px(c,x+1,y,col);}}
function piTZigzag(c,x0,col){for(let y=0;y<16;y++){const o=(y>>1)%2?1:0;px(c,x0+o,y,col);}}    /* zig-zag seam */
function piTStreaks(c,R,base,v,n,len){fillF(c,base);                                             /* long-pile streaky strokes */
  for(let i=0;i<(n||70);i++){const x=(R()*16)|0,y=(R()*16)|0,l=(len||3)+((R()*2)|0);c.fillStyle=shade(base,(R()*2-1)*v);c.fillRect(x,y,1,l);}}
function piTFoam(c,R,base,pores){fillN(c,R,base,0.07);                                           /* open-cell foam: 6-8 pore clusters */
  const n=pores==null?7:pores;for(let i=0;i<n;i++){const x=1+((R()*13)|0),y=1+((R()*13)|0);const dk=shade(base,-0.45);
    px(c,x,y,dk);if(R()<0.6)px(c,x+1,y,dk);if(R()<0.4)px(c,x,y+1,shade(base,-0.3));px(c,x,y-1,shade(base,0.12));}}
function piTRot(c,R){piTFoam(c,R,'#a9541e',8);                                                   /* rotten foam: crumbly darker edges */
  for(let i=0;i<16;i++){if(R()<0.55)px(c,i,0,'#6e3410');if(R()<0.55)px(c,i,15,'#6e3410');if(R()<0.55)px(c,0,i,'#7a3a14');if(R()<0.55)px(c,15,i,'#7a3a14');}
  for(let i=0;i<5;i++)px(c,(R()*16)|0,(R()*16)|0,'#5a2a0c');}
function piTPlanks(c,R,base,seam){fillN(c,R,base,0.06);c.fillStyle=seam;                          /* deck planks, seams every 4 rows */
  for(let y=3;y<16;y+=4)c.fillRect(0,y,16,1);for(let r=0;r<4;r++){const x=(R()*16)|0;c.fillRect(x,r*4,1,3);}
  for(let i=0;i<6;i++)px(c,(R()*16)|0,(R()*16)|0,shade(base,0.25));}
function piTVelvet(c,R,base,fringe){for(let x=0;x<16;x++){const f=Math.sin((x+R()*0.6)*0.9)*0.22;     /* vertical fold gradient */
  for(let y=0;y<16;y++){c.fillStyle=shade(base,f+(R()*2-1)*0.04);c.fillRect(x,y,1,1);}}
  if(fringe){for(let x=0;x<16;x++){px(c,x,14,x%2?'#c9a43a':'#a8862c');px(c,x,15,x%2?'#8a6a1c':'#c9a43a');}}}
function piTSkin(c,R,base,hairs){fillN(c,R,base,0.04);                                            /* skin: pores, curly hairs, one vein */
  for(let i=0;i<14;i++)px(c,(R()*16)|0,(R()*16)|0,shade(base,-0.13));
  let vx=2+((R()*4)|0);for(let y=0;y<16;y++){if(R()<0.35)vx+=R()<0.5?-1:1;vx=Math.max(1,Math.min(14,vx));px(c,vx,y,'rgba(110,130,190,0.35)');}
  for(let i=0;i<hairs;i++){let x=(R()*13)|0,y=(R()*12)|0;const k=3+((R()*3)|0);
    for(let j=0;j<k;j++){px(c,x,y,'#2e1c12');x+=R()<0.5?1:0;y+=1;if(j===1)x+=1;}}}
function piTCross(c,R,ring,ringDk){fillN(c,R,ring,0.06);                                          /* the cross-section: outer material, flesh, bone */
  piTDisc(c,7.5,7.5,6.3,ringDk);piTDisc(c,7.5,7.5,5.4,'#c24d55');
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const d=Math.hypot(x-7.5,y-7.5);if(d<5.2){
    const m=R();c.fillStyle=m<0.18?'#e8a08a':m<0.5?'#d4606a':shade('#c95560',(R()*2-1)*0.08);c.fillRect(x,y,1,1);}}
  for(let i=0;i<3;i++){const a=R()*6.28;px(c,Math.round(7.5+Math.cos(a)*3.5),Math.round(7.5+Math.sin(a)*3.5),'#f0c8a8');}  /* fat marbling */
  piTDisc(c,7.5,7.5,1.7,'#a89a88');piTDisc(c,7.5,7.5,1.2,'#f4efe0');px(c,7,7,'#ffffff');}         /* the bone */
function piTCard(c,R,base){fillN(c,R,base,0.05);c.fillStyle=shade(base,-0.22);for(let y=1;y<16;y+=2)c.fillRect(0,y,16,1);}
function piTGouache(c,R,base,cols,n){fillF(c,base);for(let i=0;i<(n||22);i++){                    /* bad gouache: fat 2 px strokes */
  const col=cols[(R()*cols.length)|0],x=(R()*15)|0,y=(R()*15)|0,l=2+((R()*4)|0),h=R()<0.5;
  c.fillStyle=col;if(h)c.fillRect(x,y,l,2);else c.fillRect(x,y,2,l);}}
function piTOreBase(c,R,rot){if(rot)piTRot(c,R);else piTFoam(c,R,'#d8b649',5);}
function piTGoogly(c,cx,cy,R){piTDisc(c,cx,cy,1.6,'#2a2a2a');piTDisc(c,cx,cy,1.25,'#f4f4f0');       /* a googly eye, pupil anywhere */
  const a=R()*6.28;px(c,Math.round(cx+Math.cos(a)*0.8),Math.round(cy+Math.sin(a)*0.8),'#0a0a0a');}
function piTTape(c,x,y,w,h){c.fillStyle='#9aa0a6';c.fillRect(x,y,w,h);c.fillStyle='#c4c8cc';c.fillRect(x,y,w,1);c.fillStyle='#6e7276';for(let i=x;i<x+w;i+=3)c.fillRect(i,y+h-1,1,1);}
function piTEnamel(c,R){fillN(c,R,'#18161a',0.15);for(let i=0;i<4;i++)px(c,(R()*16)|0,(R()*16)|0,'#3a3640');}

/* ---- the 63 tiles, pinned order (slots 222..284) ---- */
/* 222 */ tile('pg_deck',(c,R)=>{piTPlanks(c,R,'#1a1716','#2a2522');                  /* a scuffed fluorescent spike-tape corner */
  c.fillStyle='#a8a428';c.fillRect(1,13,3,1);c.fillRect(1,13,1,2);px(c,3,13,'#7a7820');});
/* 223 */ tile('pg_skin',(c,R)=>piTSkin(c,R,'#e8b9a0',3));
/* 224 */ tile('pg_mblack',(c,R)=>{fillN(c,R,'#0d0b0c',0.25);c.fillStyle='#1c181a';for(let x=2;x<16;x+=5){c.fillRect(x,0,1,16);}
  c.fillStyle='#050404';for(let x=4;x<16;x+=5)c.fillRect(x,0,1,16);});
/* 225 */ tile('pg_velvet_s',(c,R)=>piTVelvet(c,R,'#8e1424',true));
/* 226 */ tile('pg_velvet_t',(c,R)=>piTVelvet(c,R,'#8e1424',false));
/* 227 */ tile('pg_traveler',(c,R)=>{piTVelvet(c,R,'#4a1030',false);                   /* a faded stencil rectangle, unreadable */
  c.fillStyle='rgba(200,170,120,0.18)';c.fillRect(3,6,10,4);c.fillStyle='rgba(30,0,10,0.35)';for(let x=4;x<12;x+=2)c.fillRect(x,7,1,2);});
/* 228 */ tile('pg_seat_s',(c,R)=>{fillN(c,R,'#120a0c',0.2);                           /* the audience: every head the same */
  c.fillStyle='#7a1020';c.fillRect(1,9,14,7);c.fillStyle='#9a1a2c';c.fillRect(1,9,14,1);for(let x=3;x<14;x+=4)px(c,x,12,'#5a0a16');
  piTDisc(c,7.5,5,4.3,'#c9a85a');piTDisc(c,7.5,4.7,3.9,'#f2d27a');px(c,6,4,'#fff0b0');
  px(c,6,5,'#111');px(c,9,5,'#111');});                                                  /* two dot eyes. no mouth */
/* 229 */ tile('pg_seat_t',(c,R)=>{fillN(c,R,'#7a1020',0.08);c.fillStyle='#5a0a16';c.fillRect(0,7,16,1);c.fillRect(0,0,16,1);
  for(let i=0;i<6;i++)px(c,(R()*16)|0,(R()*16)|0,'#a02a3a');});
/* 230 */ tile('pg_shag_t',(c,R)=>{piTStreaks(c,R,'#5e7a2a',0.22,90,3);for(let i=0;i<7;i++)px(c,(R()*16)|0,(R()*16)|0,'#d9822b');
  for(let i=0;i<3;i++)px(c,(R()*16)|0,(R()*16)|0,'#e8d8a0');});                          /* crumbs */
/* 231 */ tile('pg_shag_s',(c,R)=>{piTPlanks(c,R,'#1a1716','#2a2522');                 /* fuzzy fringe over black deck */
  for(let x=0;x<16;x++){const d=4+((R()*4)|0);for(let y=0;y<d;y++)px(c,x,y,shade('#5e7a2a',(R()*2-1)*0.2));if(R()<0.2)px(c,x,1,'#d9822b');}});
/* 232 */ tile('pg_sleeve_s',(c,R)=>{piTFelt(c,R,'#4ca82b');piTZigzag(c,7,'#f2f6ee');});
/* 233 */ tile('pg_sleeve_x',(c,R)=>{piTCross(c,R,'#4ca82b','#2e7a18');piTStitchH(c,0,'rgba(240,250,236,0.7)');});
/* 234 */ tile('pg_forearm_s',(c,R)=>{piTSkin(c,R,'#e8b9a0',5);                         /* a cheap brown wristwatch strap */
  c.fillStyle='#5a3a1e';c.fillRect(0,7,16,3);c.fillStyle='#7a5230';c.fillRect(0,7,16,1);c.fillStyle='#3a2410';for(let x=1;x<16;x+=3)px(c,x,9,'#3a2410');
  c.fillStyle='#c9a43a';c.fillRect(11,7,2,3);px(c,11,8,'#8a6a1c');});
/* 235 */ tile('pg_forearm_x',(c,R)=>{piTCross(c,R,'#e8b9a0','#c9927a');for(let i=0;i<4;i++)px(c,(R()*16)|0,R()<0.5?0:15,'#2e1c12');});
/* 236 */ tile('pg_fleece',(c,R)=>{piTStreaks(c,R,'#f2a6c1',0.2,80,3);                  /* matted pink fleece, ragged holes at the edge */
  for(let i=0;i<8;i++)px(c,(R()*16)|0,(R()*16)|0,'#ffd6e4');
  for(let i=0;i<9;i++){const e=(R()*4)|0,k=(R()*16)|0;const x=e===0?0:e===1?15:k,y=e===2?0:e===3?15:k;c.clearRect(x,y,1,1);if(R()<0.5)c.clearRect(Math.min(15,x+1),y,1,1);}
  c.clearRect(4+((R()*7)|0),5+((R()*6)|0),1,1);});
/* 237 */ tile('pg_eye',(c,R)=>{piTStreaks(c,R,'#f2a6c1',0.2,40,3);                     /* a canopy eye: a plastic ball face */
  piTDisc(c,7.5,7.5,7.2,'#cdbf86');piTDisc(c,7.5,7.5,6.4,'#f2eee0');
  const ox=Math.round((R()*2-1)*2.2),oy=Math.round((R()*2-1)*2.2);piTDisc(c,7.5+ox,7.5+oy,2.6,'#0c0c0c');px(c,6+ox,6+oy,'#ffffff');
  for(let i=0;i<3;i++)px(c,((R()*4)|0)+3+i,12+((R()*2)|0),'rgba(170,40,40,0.55)');});      /* a bloodshot vein */
/* 238 */ tile('pg_stuffing',(c,R)=>{fillN(c,R,'#ecebe6',0.04);                         /* lumpy polyester fibre */
  for(let i=0;i<7;i++){const x=(R()*14)|0,y=(R()*14)|0;c.fillStyle='rgba(150,148,140,0.35)';c.fillRect(x,y+2,3,1);c.fillRect(x+3,y,1,2);}
  for(let i=0;i<14;i++){const x=(R()*15)|0,y=(R()*16)|0;c.fillStyle='#fbfaf6';c.fillRect(x,y,2,1);}});
/* 239 */ tile('pg_armhole_t',(c,R)=>{piTPlanks(c,R,'#1a1716','#2a2522');                /* a ragged hole in a performer's sleeve cuff */
  piTDisc(c,7.5,7.5,6.2,'#141214');piTDisc(c,7.5,7.5,5.2,'#242026');
  for(let i=0;i<18;i++){const a=R()*6.28,r=4.8+R()*0.8;px(c,Math.round(7.5+Math.cos(a)*r),Math.round(7.5+Math.sin(a)*r),'#3a343c');}
  piTDisc(c,7.5,7.5,4.0,'#050304');for(let i=0;i<10;i++){const a=R()*6.28;px(c,Math.round(7.5+Math.cos(a)*4.3),Math.round(7.5+Math.sin(a)*4.3),'#050304');}
  px(c,8,8,'#3a2a24');px(c,9,8,'#2a1e1a');});                                            /* something pale, deep down */
/* 240 */ tile('pg_psky',(c,R)=>{piTGouache(c,R,'#8fc0e8',['#a8d0f0','#7ab0e0','#ffffff','#e8f4ff'],24);
  c.fillStyle='#ffffff';c.fillRect(2,3,7,2);c.fillRect(4,2,4,1);c.fillRect(1,5,9,1);c.fillStyle='#d8e8f4';c.fillRect(2,6,8,1);});
/* 241 */ tile('pg_phill',(c,R)=>{piTGouache(c,R,'#4e8a34',['#3a6e26','#6aa040','#7a5a2a','#5e9a3a'],26);
  c.fillStyle='#8fc0e8';c.fillRect(0,0,16,3);c.fillStyle='#4e8a34';for(let x=0;x<16;x++)c.fillRect(x,3-((x>4&&x<11)?2:0),1,2);
  piTDisc(c,11,7,2.2,'#2e6a1e');c.fillStyle='#6a4a22';c.fillRect(11,9,1,4);});            /* the lollipop tree */
/* 242 */ tile('pg_backing',(c,R)=>{piTCard(c,R,'#a87a48');c.fillStyle='rgba(10,8,6,0.55)';c.fillRect(3,4,6,3);c.fillRect(5,7,3,2);
  px(c,10,5,'rgba(10,8,6,0.4)');piTTape(c,11,0,3,16);});
/* 243 */ tile('pg_brace',(c,R)=>{fillN(c,R,'#9a6e40',0.05);for(let i=-16;i<16;i+=3){c.fillStyle='#7a5430';for(let k=0;k<16;k++){const x=i+k;if(x>=0&&x<16)c.fillRect(x,k,1,1);}}
  piTTape(c,0,6,16,3);});
/* 244 */ tile('pg_foam',(c,R)=>piTFoam(c,R,'#d8b649',8));
/* 245 */ tile('pg_rot',(c,R)=>piTRot(c,R));
/* 246 */ tile('pg_ore_googly',(c,R)=>{piTOreBase(c,R,false);const S=[[4,4],[11,5],[6,11],[12,12]];
  for(let i=0;i<S.length;i++)if(i<3||R()<0.6)piTGoogly(c,S[i][0]+((R()*2)|0),S[i][1]+((R()*2)|0),R);});
/* 247 */ tile('pg_ore_wire',(c,R)=>{piTOreBase(c,R,false);c.fillStyle='#8e9296';         /* tangled coat hangers, one hook */
  let x=1,y=10;for(let i=0;i<14;i++){c.fillRect(x,y,1,1);x+=1;y+=R()<0.5?-1:1;y=Math.max(2,Math.min(14,y));}
  x=3;y=3;for(let i=0;i<10;i++){c.fillRect(x,y,1,1);y+=1;x+=R()<0.4?1:0;}
  c.fillStyle='#c4c8cc';c.fillRect(10,2,3,1);c.fillRect(12,3,1,2);c.fillRect(11,5,1,1);c.fillRect(10,4,1,1);c.fillStyle='#5e6266';c.fillRect(11,6,1,4);});
/* 248 */ tile('pg_ore_sequin',(c,R)=>{piTOreBase(c,R,true);for(let i=0;i<7;i++){const x=1+((R()*13)|0),y=1+((R()*13)|0),g=R()<0.55;
  c.fillStyle=g?'#e8c23a':'#f27ab0';c.fillRect(x,y,2,2);px(c,x,y,'#fffbe0');px(c,x+1,y+1,g?'#9a7a14':'#a84a78');}});
/* 249 */ tile('pg_ore_knuckle',(c,R)=>{piTOreBase(c,R,true);                           /* three fingertips, nails and all */
  for(const [x,y] of [[2,6],[7,3],[11,8]]){c.fillStyle='#c99a84';c.fillRect(x,y,3,5);c.fillStyle='#e8b9a0';c.fillRect(x,y+1,3,4);px(c,x,y,'#c99a84');px(c,x+2,y,'#c99a84');
    c.fillStyle='#d8c8b0';c.fillRect(x,y+1,3,2);px(c,x+1,y+1,'#4a3424');px(c,x,y+2,'#6a5038');c.fillStyle='#b88a74';c.fillRect(x,y+4,3,1);}});
/* 250 */ tile('pg_counter_t',(c,R)=>{fillN(c,R,'#7d8c3a',0.05);for(let i=0;i<30;i++)px(c,(R()*16)|0,(R()*16)|0,R()<0.5?'#5e6a24':'#a8b45a');
  px(c,(R()*16)|0,(R()*16)|0,'#e8e0c0');});
/* 251 */ tile('pg_counter_s',(c,R)=>{fillN(c,R,'#7a5a30',0.06);c.fillStyle='#7d8c3a';c.fillRect(0,0,16,2);c.fillStyle='#5e6a24';c.fillRect(0,2,16,1);
  c.fillStyle='#5a3e1e';c.fillRect(2,4,12,10);c.fillStyle='#8a6a3a';c.fillRect(3,5,10,8);c.fillStyle='#6a4a26';for(let y=6;y<12;y+=2)c.fillRect(3,y,10,1);
  c.fillStyle='#d8dce0';c.fillRect(11,7,1,4);px(c,11,7,'#ffffff');});                  /* chrome handle */
/* 252 */ tile('pg_counter_b',(c,R)=>{fillN(c,R,'#b89a6a',0.08);for(let i=0;i<26;i++)px(c,(R()*16)|0,(R()*16)|0,R()<0.5?'#8a6a40':'#d8c090');});
/* 253 */ tile('pg_burner_t',(c,R)=>{piTEnamel(c,R);                                     /* a glowing spiral coil */
  for(let t=0;t<34;t++){const a=t*0.62,r=1+t*0.17;const x=Math.round(7.5+Math.cos(a)*r),y=Math.round(7.5+Math.sin(a)*r);
    if(x>=0&&x<16&&y>=0&&y<16){px(c,x,y,t%5===0?'#ffe08a':'#ff7a1a');}}px(c,7,7,'#ffd36a');});
/* 254 */ tile('pg_burner_s',(c,R)=>{piTEnamel(c,R);c.fillStyle='#2a2830';c.fillRect(0,0,16,2);piTDisc(c,8,9,2.5,'#c8c8cc');piTDisc(c,8,9,1.4,'#6a6a70');px(c,8,7,'#ff3a1a');
  px(c,2,13,'#5a5862');px(c,13,4,'#5a5862');});
/* 255 */ tile('pg_soup',(c,R)=>{for(let y=0;y<16;y++)for(let x=0;x<16;x++){c.fillStyle=rgbS(92+R()*18,82+R()*14,40+R()*10,0.9);c.fillRect(x,y,1,1);}
  piTDisc(c,4,10,1.6,'rgba(230,120,30,0.95)');px(c,4,10,'rgba(255,190,90,0.95)');          /* a carrot coin */
  piTDisc(c,11,5,1.6,'rgba(240,236,220,0.95)');px(c,11,5,'#111');px(c,13,11,'rgba(255,255,230,0.9)');px(c,6,3,'rgba(255,255,230,0.7)');});
/* 256 */ tile('pg_dough',(c,R)=>{fillN(c,R,'#efe3c4',0.03);for(let i=0;i<5;i++)px(c,(R()*16)|0,(R()*16)|0,'#fffaf0');
  for(const [x,y] of [[4,5],[10,10]]){piTDisc(c,x,y,1.6,'#d8c8a0');px(c,x,y,'#c4b088');px(c,x-1,y-1,'#fffaf0');}});
/* 257 */ tile('pg_lino',(c,R)=>{fillN(c,R,'#bfe3d0',0.03);c.fillStyle='#8aa498';c.fillRect(0,7,16,1);c.fillRect(7,0,1,16);c.fillRect(0,15,16,1);c.fillRect(15,0,1,16);
  piTDisc(c,11,11,2,'rgba(40,30,20,0.45)');px(c,12,10,'rgba(20,10,5,0.5)');});            /* one scorch mark */
/* 258 */ tile('pg_tesla_t',(c,R)=>{fillN(c,R,'#6a6e74',0.05);piTDisc(c,7.5,7.5,5.5,'#9aa0a8');piTDisc(c,7.5,7.5,4.5,'#d8dce4');px(c,5,5,'#ffffff');px(c,6,5,'#ffffff');
  px(c,5,6,'#f0f4ff');});
/* 259 */ tile('pg_tesla_s',(c,R)=>{fillN(c,R,'#6a6e74',0.05);for(let y=1;y<14;y+=2){c.fillStyle=y%4===1?'#c87a3a':'#a85a22';c.fillRect(3,y,10,1);}
  c.fillStyle='#4a4e54';c.fillRect(2,14,12,2);c.fillStyle='#e8a060';c.fillRect(3,1,1,13);});
/* 260 */ tile('pg_satin',(c,R)=>{fillN(c,R,'#f7c4d8',0.03);for(let i=0;i<16;i++){px(c,i,(15-i)|0,'#ffffff');if(i<15)px(c,i+1,15-i,'#ffe8f0');}
  c.fillStyle='rgba(200,120,150,0.35)';c.fillRect(0,4,7,1);c.fillRect(9,12,7,1);});
/* 261 */ tile('pg_mirror',(c,R)=>{fillF(c,'#3a2a14');for(let y=2;y<14;y++){c.fillStyle=rgbS(150+y*6,160+y*5,175+y*4);c.fillRect(2,y,12,1);}
  c.fillStyle='rgba(255,255,255,0.6)';c.fillRect(4,3,1,4);c.fillRect(5,3,1,2);
  for(let i=1;i<16;i+=3){px(c,i,0,'#ffd36a');px(c,i,15,'#ffd36a');px(c,0,i,'#ffd36a');px(c,15,i,'#ffd36a');}});
/* 262 */ tile('pg_sheet',(c,R)=>{fillN(c,R,'#5e6b2e',0.06);for(let y=0;y<16;y+=2)for(let x=(y>>1)%2;x<16;x+=2)px(c,x,y,'#66743a');
  c.fillStyle='rgba(30,36,10,0.35)';for(let a=0;a<6.28;a+=0.35)c.fillRect(Math.round(7.5+Math.cos(a)*4.5),Math.round(7.5+Math.sin(a)*4.5),1,1);});
/* 263 */ tile('pg_swamp',(c,R)=>{piTFelt(c,R,'#3e4a1e',0.1);for(let i=0;i<5;i++){const x=(R()*16)|0,y=(R()*12)|0;c.fillStyle='rgba(180,200,140,0.55)';c.fillRect(x,y,1,2+((R()*3)|0));
  px(c,x,y+4,'rgba(220,240,180,0.7)');}});
/* 264 */ tile('pg_scum',(c,R)=>{for(let y=0;y<16;y++)for(let x=0;x<16;x++){c.fillStyle=rgbS(60+R()*20,96+R()*20,40+R()*10,0.86);c.fillRect(x,y,1,1);}
  for(let i=0;i<8;i++){const x=(R()*15)|0,y=(R()*16)|0;c.fillStyle='rgba(200,220,150,0.8)';c.fillRect(x,y,2,1);}});     /* felt lint */
/* 265 */ tile('pg_pins_t',(c,R)=>{fillN(c,R,'#c4282a',0.08);c.fillStyle='#2e7a18';c.fillRect(6,6,4,4);c.fillRect(5,7,6,2);px(c,7,5,'#4ca82b');
  for(let i=0;i<10;i++){const a=i*0.628,x=Math.round(7.5+Math.cos(a)*5.5),y=Math.round(7.5+Math.sin(a)*5.5);px(c,x,y,'#e8ecf0');px(c,Math.round(7.5+Math.cos(a)*4.5),Math.round(7.5+Math.sin(a)*4.5),'#9aa0a8');}});
/* 266 */ tile('pg_pins_s',(c,R)=>{fillN(c,R,'#c4282a',0.08);c.fillStyle='#8a1418';for(let x=3;x<16;x+=5)c.fillRect(x,0,1,16);
  for(let i=0;i<9;i++){const x=1+((R()*14)|0),y=1+((R()*13)|0);px(c,x,y,'#f0f4f8');px(c,x,y+1,'#9aa0a8');}});
/* 267 */ tile('pg_cord',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#b81818';c.fillRect(7,0,2,16);c.fillStyle='#e83a3a';c.fillRect(7,0,1,16);   /* runs along v */
  c.fillStyle='#f4f0e8';c.fillRect(6,6,4,3);c.fillStyle='#c8c0b0';c.fillRect(6,8,4,1);});
/* 268 */ tile('pg_plate',(c,R)=>{fillN(c,R,'#3a3e44',0.07);c.fillStyle='#24272c';c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);c.fillRect(0,0,1,16);c.fillRect(15,0,1,16);
  for(const [x,y] of [[2,2],[13,2],[2,13],[13,13]])px(c,x,y,'#8a9098');piTDisc(c,7.5,7.5,3,'#6a0a0a');piTDisc(c,7.5,7.5,2.3,'#d81a1a');px(c,6,6,'#ff8a8a');});
/* 269 */ tile('pg_can_t',(c,R)=>{fillN(c,R,'#8a9096',0.06);for(let r=2;r<8;r+=2){c.fillStyle='rgba(60,64,70,0.5)';for(let a=0;a<6.28;a+=0.2)px(c,Math.round(7.5+Math.cos(a)*r),Math.round(7.5+Math.sin(a)*r),'rgba(60,64,70,0.5)');}
  c.fillStyle='#5a5e64';c.fillRect(4,7,8,2);c.fillStyle='#b0b6bc';c.fillRect(4,7,8,1);});    /* lid handle */
/* 270 */ tile('pg_can_s',(c,R)=>{fillN(c,R,'#8a9096',0.07);c.fillStyle='#6a7076';for(let x=1;x<16;x+=3)c.fillRect(x,4,1,12);
  c.fillStyle='#0a0a0a';c.fillRect(0,2,16,2);c.fillStyle='#b0b6bc';c.fillRect(0,1,16,1);                 /* the dark gap under the lid */
  c.fillStyle='#5a5e64';c.fillRect(9,9,3,3);px(c,10,10,'#4a4e54');});                                  /* a dent */
/* 271 */ tile('pg_hotplate_t',(c,R)=>{fillN(c,R,'#7d8c3a',0.05);piTDisc(c,7.5,7.5,5.5,'#1a181c');
  for(let t=0;t<26;t++){const a=t*0.7,r=1+t*0.16;px(c,Math.round(7.5+Math.cos(a)*r),Math.round(7.5+Math.sin(a)*r),t%4?'#a8401a':'#e86a2a');}});
/* 272 */ tile('pg_hotplate_s',(c,R)=>{fillN(c,R,'#7d8c3a',0.05);c.fillStyle='#5e6a24';c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);
  piTDisc(c,5,9,2.3,'#e8e4d8');px(c,5,8,'#1a1a1a');px(c,5,7,'#1a1a1a');c.fillStyle='#2a2a2a';c.fillRect(9,8,5,2);px(c,13,8,'#ff3a1a');});
/* 273 */ tile('pg_bench_t',(c,R)=>{fillN(c,R,'#9aa0a8',0.05);c.fillStyle='#b8bec6';c.fillRect(0,0,16,1);
  piTDisc(c,10,7,2.6,'rgba(220,240,230,0.9)');piTDisc(c,10,7,1.8,'#5ad85a');px(c,9,6,'#e8ffe8');px(c,4,4,'#d84a8a');px(c,4,5,'#d84a8a');});
/* 274 */ tile('pg_bench_s',(c,R)=>{fillN(c,R,'#8a9098',0.05);c.fillStyle='#b8bec6';c.fillRect(0,0,16,2);
  c.fillStyle='#d81a1a';c.fillRect(0,12,16,2);c.fillStyle='#f4e030';for(let x=0;x<16;x+=4)c.fillRect(x,12,2,2);              /* the DANGER stripe */
  c.fillStyle='rgba(210,240,230,0.9)';c.fillRect(3,4,3,6);c.fillRect(10,6,3,4);c.fillStyle='#5ad85a';c.fillRect(3,7,3,3);c.fillStyle='#f27ab0';c.fillRect(10,8,3,2);
  px(c,4,5,'#a8f0a8');px(c,11,6,'#ffc8e0');px(c,4,3,'#e8ffe8');});                       /* bubbling flasks */
/* 275 */ tile('pg_ptrunk_t',(c,R)=>{fillN(c,R,'#6a4424',0.08);for(let y=2;y<16;y+=4){c.fillStyle='#4a2c14';c.fillRect(0,y,16,1);}
  c.fillStyle='#c9a43a';c.fillRect(0,0,3,3);c.fillRect(13,0,3,3);c.fillRect(0,13,3,3);c.fillRect(13,13,3,3);});
/* 276 */ tile('pg_ptrunk_s',(c,R)=>{fillN(c,R,'#6a4424',0.08);c.fillStyle='#3a2210';c.fillRect(0,4,16,1);
  c.fillStyle='#c9a43a';c.fillRect(0,0,2,2);c.fillRect(14,0,2,2);c.fillRect(0,14,2,2);c.fillRect(14,14,2,2);c.fillRect(7,4,2,3);
  c.fillStyle='rgba(235,225,200,0.75)';for(let x=2;x<14;x+=3){c.fillRect(x,9,2,3);px(c,x+2,10,'rgba(235,225,200,0.75)');}});   /* stencilled PROPS (badly) */
/* 277 */ tile('pg_lamp',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#141214';c.fillRect(7,8,2,8);      /* a plastic ball eye on a rod */
  piTDisc(c,7.5,5,3.6,'#cdbf86');piTDisc(c,7.5,5,3.1,'#fbf8ee');piTDisc(c,8.5,5,1.3,'#0a0a0a');px(c,6,3,'#ffffff');});
/* 278 */ tile('pg_lily_t',(c,R)=>{fillN(c,R,'#1e2a16',0.1);piTDisc(c,7.5,7.5,6.6,'#3f8a2a');piTDisc(c,7.5,7.5,5.8,'#4ca82b');
  c.fillStyle='#1e2a16';for(let k=0;k<7;k++)c.fillRect(8+k,7-((k*0.4)|0),1,2);                      /* the notch */
  for(let i=0;i<6;i++)px(c,3+((R()*9)|0),3+((R()*9)|0),'#6ac04a');});
/* 279 */ tile('pg_lily_s',(c,R)=>{fillN(c,R,'#141c10',0.1);c.fillStyle='#4ca82b';c.fillRect(0,0,16,2);c.fillStyle='#2e6a1e';c.fillRect(0,2,16,1);});
/* 280 */ tile('pg_cattail',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='#5aa032';c.fillRect(7,6,1,10);c.fillRect(6,12,1,1);c.fillRect(8,10,1,1);
  c.fillStyle='#6a4022';c.fillRect(6,2,3,5);c.fillStyle='#8a5a32';c.fillRect(6,2,1,4);px(c,7,1,'#5aa032');});   /* a felt pom-pom on a pipe cleaner */
/* 281 */ tile('pg_door_s',(c,R)=>{fillN(c,R,'#2e7a3a',0.05);c.fillStyle='#1e5a28';c.fillRect(0,0,1,16);c.fillRect(15,0,1,16);c.fillRect(2,2,12,1);c.fillRect(2,13,12,1);
  c.fillStyle='#e8c23a';const S=[[7,3],[8,3],[6,5],[7,4],[8,4],[9,5],[5,5],[10,5],[7,5],[8,5],[6,6],[9,6],[7,6],[8,6],[6,7],[9,7]];for(const [x,y] of S)c.fillRect(x,y,1,1);
  piTDisc(c,12,10,1,'#c9a43a');px(c,12,10,'#fff0b0');});                                 /* a gold star, a brass knob */
/* 282 */ tile('pg_door_t',(c,R)=>{fillN(c,R,'#3a2a1a',0.08);c.fillStyle='#2a1c10';c.fillRect(0,7,16,2);});
/* 283 */ tile('pg_strunk_t',(c,R)=>{fillN(c,R,'#2a3a5a',0.07);c.fillStyle='#5a3a1e';c.fillRect(4,0,2,16);c.fillRect(10,0,2,16);
  c.fillStyle='#c9a43a';c.fillRect(4,7,2,2);c.fillRect(10,7,2,2);c.fillStyle='#b8bec6';c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);});
/* 284 */ tile('pg_strunk_s',(c,R)=>{fillN(c,R,'#2a3a5a',0.07);c.fillStyle='#b8bec6';c.fillRect(0,0,16,1);c.fillRect(0,15,16,1);c.fillRect(0,0,1,16);c.fillRect(15,0,1,16);
  c.fillStyle='#e8dcc0';c.fillRect(5,4,7,8);c.fillStyle='#b8a888';c.fillRect(5,4,7,1);px(c,6,3,'#5a3a1e');px(c,7,2,'#5a3a1e');              /* the big luggage tag */
  c.fillStyle='#3a2a1a';c.fillRect(6,6,5,1);c.fillRect(6,8,4,1);c.fillRect(6,10,5,1);});
