/* ---- PART 55: p2_items.js ---- */
/* ---------------------------------------------------------------------------------------------------------------------
   p2_items.js (P2): the 46 purgatory blocks and the 78 purgatory items (bible 4-5, 8; plan 2.1-2.2, 5.2).
   Every def carries pg:1 (the two overworld stage pieces too, so the creative palette and customs can tell them apart);
   the three souvenirs (362-364) do not: they live in the overworld. Blocks: tiles from p2_tiles.js, purgatory tool classes
   reuse the engine strings (pick = Pick, axe = Shears, shovel = Scoop) with purgatory tiers 0-3, per-block drop rules in
   pdrop (random drops: Googly 1-3, Sequin 1-2, Steel Pins 3-6, Fleece 40% Stuffing / 100% Fleece with Shears), placement
   rules in pplace, a bot-facing tool hint in hint, pore/ptree flags for the bots' gather scan. Items: every icon is an
   off-atlas ipaint painter (hook P2-19), gear with a held model has gadget:'pg_<key>' (hook P2-20 -> piGadgetMesh in
   p2_gear.js), verbs in puse/puseHold (hook P0-22), raw foods carry raw:1 and their EFFECTIVE food value (bible 8).
   --------------------------------------------------------------------------------------------------------------------- */
/* ---- blocks (bible 4; ids from p0_contract.js) ---- */
{ const D=(id,o)=>def(id,Object.assign({pg:1},o));
  const T3=(t,s,b)=>({top:t,side:s,bot:b||t});
  const rnd=(id,a,b)=>()=>({id,count:a+Math.floor(Math.random()*(b-a+1))});
  const H={pick0:'needs nothing special; a Pick is faster',pickReq0:'needs any Pick (a Floppy Pick will do)',pickReq1:'needs a Foam-tier Pick or better (LARP Pick)',
    pickReq2:'needs a Wire-tier Pick or better (Hanger Pick)',pickReq3:'needs a Sequin-tier Pick (Disco Pick) or a Charge',shears:'cut it with Shears (bare hands work, slowly)',
    scoop:'dig it with a Scoop (bare hands work)',any:'breaks with anything',never:'cannot be broken'};
  D(B.PG_DECK,{name:'Stage Deck',tiles:'pg_deck',hard:1.2,toolClass:'pick',pblast:1,hint:H.pick0});
  D(B.PG_SKIN,{name:'The Puppeteer',tiles:'pg_skin',hard:-1,hint:H.never});
  D(B.PG_MBLACK,{name:'Masking Black',tiles:'pg_mblack',hard:-1,hint:H.never});
  D(B.PG_VELVET,{name:'Velvet Curtain',tiles:T3('pg_velvet_t','pg_velvet_s'),hard:-1,hint:H.never});
  D(B.PG_TRAVELER,{name:'Traveler',tiles:'pg_traveler',hard:-1,hint:H.never});
  D(B.PG_SEAT,{name:'Audience Seat',tiles:T3('pg_seat_t','pg_seat_s','pg_deck'),hard:1.0,drop:{id:IT.PG_FELT,count:1},hint:H.any});
  D(B.PG_SHAG,{name:'Shag Carpet',tiles:T3('pg_shag_t','pg_shag_s','pg_deck'),hard:0.6,toolClass:'shovel',drop:B.PG_DECK,hint:H.scoop});
  D(B.PG_SLEEVE,{name:'Felt Sleeve',tiles:T3('pg_sleeve_x','pg_sleeve_s'),hard:2.0,toolClass:'axe',ptree:1,hint:H.shears});
  D(B.PG_FOREARM,{name:'Puppeteer Forearm',tiles:T3('pg_forearm_x','pg_forearm_s'),hard:1.5,toolClass:'axe',drop:{id:IT.PG_GREASE,count:2},ptree:1,hint:H.shears});
  D(B.PG_FLEECE,{name:'Puppet Fleece',tiles:'pg_fleece',hard:0.3,toolClass:'axe',opq:false,bucket:'cut',cullSame:true,drop:IT.PG_STUFF,
    pdrop:(st)=>{const t=st&&DEFS[st.id]&&DEFS[st.id].tool;if(t&&t.type==='axe')return {id:IT.PG_FLEECE,count:1};return Math.random()<0.4?{id:IT.PG_STUFF,count:1}:null;},
    hint:'Shears give Fleece; anything else gives Stuffing sometimes'});
  D(B.PG_EYE,{name:'Canopy Eye',tiles:T3('pg_fleece','pg_eye'),hard:0.3,opq:false,bucket:'cut',drop:IT.PG_PLASTICEYE,hint:H.any});
  D(B.PG_STUFFING,{name:'Stuffing Drift',tiles:'pg_stuffing',hard:0.4,toolClass:'shovel',drop:{id:IT.PG_STUFF,count:2},pblast:1,psoft:1,hint:H.scoop});
  D(B.PG_ARMHOLE,{name:'Arm Hole',tiles:T3('pg_armhole_t','pg_deck'),hard:1.0,toolClass:'pick',drop:{id:IT.PG_ROD,count:2},hint:H.pick0});
  D(B.PG_PSKY,{name:'Painted Sky',tiles:'pg_psky',hard:1.0,toolClass:'axe',drop:IT.PG_CARD,pblast:1,hint:H.shears});
  D(B.PG_PHILL,{name:'Painted Hill',tiles:'pg_phill',hard:1.0,toolClass:'axe',drop:IT.PG_CARD,pblast:1,hint:H.shears});
  D(B.PG_BACKING,{name:'Flat Backing',tiles:'pg_backing',hard:0.8,toolClass:'axe',drop:{id:IT.PG_CARD,count:2},pblast:1,hint:H.shears});
  D(B.PG_BRACE,{name:'Cardboard Brace',tiles:'pg_brace',hard:0.3,drop:IT.PG_CARD,pblast:1,hint:H.any});
  D(B.PG_FOAM,{name:'Foam Rubber',tiles:'pg_foam',hard:1.5,toolClass:'pick',req:true,drop:IT.PG_FOAMCHUNK,pblast:1,hint:H.pickReq0});
  D(B.PG_ROT,{name:'Rotten Foam',tiles:'pg_rot',hard:3.0,toolClass:'pick',req:true,tier:1,drop:{id:IT.PG_FOAMDUST,count:2},pblast:1,hint:H.pickReq1});
  D(B.PG_GOOGLY,{name:'Googly Ore',tiles:'pg_ore_googly',hard:2.5,toolClass:'pick',req:true,drop:IT.PG_GOOGLIES,pdrop:rnd(IT.PG_GOOGLIES,1,3),pblast:1,pore:1,hint:H.pickReq0});
  D(B.PG_WIREORE,{name:'Wire Ore',tiles:'pg_ore_wire',hard:3.0,toolClass:'pick',req:true,tier:1,drop:IT.PG_HANGER,pblast:1,pore:1,hint:H.pickReq1});
  D(B.PG_SEQORE,{name:'Sequin Ore',tiles:'pg_ore_sequin',hard:4.0,toolClass:'pick',req:true,tier:2,drop:IT.PG_SEQUIN,pdrop:rnd(IT.PG_SEQUIN,1,2),pblast:1,pore:1,hint:H.pickReq2});
  D(B.PG_KNUCKLE,{name:'Knuckle Ore',tiles:'pg_ore_knuckle',hard:5.0,toolClass:'pick',req:true,tier:3,drop:IT.PG_KNUCKLE,pblast:1,pore:1,hint:H.pickReq3});
  D(B.PG_COUNTER,{name:'Countertop',tiles:T3('pg_counter_t','pg_counter_s','pg_counter_b'),hard:2.0,toolClass:'pick',req:true,drop:IT.PG_LAMINATE,pblast:1,hint:H.pickReq0});
  D(B.PG_BURNER,{name:'Burner',tiles:T3('pg_burner_t','pg_burner_s'),hard:2.5,toolClass:'pick',req:true,tier:1,drop:IT.PG_COIL,hurts:true,light:true,hint:H.pickReq1});
  D(B.PG_SOUP,{name:'Mystery Soup',tiles:'pg_soup',solid:false,opq:false,bucket:'wat',cullSame:true,hard:0,drop:null,replace:true,interact:'psoup',pliquid:0.45,hint:'a liquid: wade through it'});
  D(B.PG_DOUGH,{name:'Dough',tiles:'pg_dough',hard:0.6,toolClass:'shovel',drop:{id:IT.PG_DOUGHBALL,count:2},pbounce:1,hint:H.scoop});
  D(B.PG_LINO,{name:'Lab Linoleum',tiles:'pg_lino',hard:1.0,toolClass:'pick',pblast:1,hint:H.pick0});
  D(B.PG_TESLA,{name:'Tesla Coil',tiles:T3('pg_tesla_t','pg_tesla_s'),hard:3.0,toolClass:'pick',req:true,tier:2,drop:{id:IT.PG_COPPER,count:2},hint:H.pickReq2});
  D(B.PG_SATIN,{name:'Satin Dune',tiles:'pg_satin',hard:0.8,toolClass:'shovel',drop:IT.PG_SATIN,slippery:true,pblast:1,hint:H.scoop});
  D(B.PG_MIRROR,{name:'Dressing Mirror',tiles:'pg_mirror',hard:1.5,toolClass:'pick',req:true,tier:1,drop:{id:IT.PG_SHARD,count:2},hint:H.pickReq1});
  D(B.PG_SHEET,{name:'Taut Felt Sheet',tiles:'pg_sheet',hard:0.4,toolClass:'axe',drop:null,hint:'Shears tear it; it drops nothing'});
  D(B.PG_SWAMP,{name:'Swamp Felt',tiles:'pg_swamp',hard:1.0,toolClass:'shovel',pblast:1,pslow:0.85,hint:H.scoop});
  D(B.PG_SCUM,{name:'Pond Scum',tiles:'pg_scum',solid:false,opq:false,bucket:'wat',cullSame:true,hard:0,drop:null,replace:true,pliquid:0.5,hint:'a liquid: wade through it'});
  D(B.PG_PINS,{name:'Pincushion',tiles:T3('pg_pins_t','pg_pins_s'),hard:3.0,toolClass:'pick',req:true,tier:2,drop:{id:IT.PG_PINS,count:3},pdrop:rnd(IT.PG_PINS,3,6),hurts:true,hint:H.pickReq2});
  D(B.PG_CORD,{name:'Det Cord',tiles:'pg_cord',hard:0.4,toolClass:'axe',req:true,tier:2,solid:false,opq:false,bucket:'cut',pcord:1,
    ipaint:(c,R)=>{c.clearRect(0,0,16,16);for(let t=0;t<44;t++){const a=t*0.42,r=1.5+t*0.13,x=Math.round(8+Math.cos(a)*r),y=Math.round(8+Math.sin(a)*r*0.8);
      if(x>=0&&x<16&&y>=0&&y<16)px(c,x,y,t%9<2?'#f4f0e8':(t%2?'#b81818':'#e83a3a'));}},
    pplace:(x,y,z)=>{const b=getBlock(x,y-1,z);return !!(b&&DEFS[b]&&DEFS[b].solid!==false);},hint:'cut it with Wire Snips to keep it'});
  D(B.PG_PLATE,{name:'Charge Plate',tiles:'pg_plate',hard:-1,hint:H.never});
  D(B.PG_CAN,{name:'The Bin',tiles:T3('pg_can_t','pg_can_s'),hard:2.0,toolClass:'pick',interact:'pcan',hint:H.pick0});
  D(B.PG_HOTPLATE,{name:'Hot Plate',tiles:T3('pg_hotplate_t','pg_hotplate_s'),hard:2.0,toolClass:'pick',interact:'furnace',hint:H.pick0});
  D(B.PG_BENCH,{name:'Lab Bench',tiles:T3('pg_bench_t','pg_bench_s'),hard:2.0,toolClass:'pick',tier:1,interact:'plab',hint:'a Foam-tier Pick or bare hands'});
  D(B.PG_PTRUNK,{name:'Prop Trunk',tiles:T3('pg_ptrunk_t','pg_ptrunk_s'),hard:1.5,toolClass:'axe',interact:'chest',hint:H.shears});
  D(B.PG_LAMP,{name:'Eyeball Lamp',tiles:'pg_lamp',hard:0,solid:false,opq:false,bucket:'cut',cross:true,light:true,
    pplace:(x,y,z)=>{const b=getBlock(x,y-1,z);return !!(b&&DEFS[b]&&DEFS[b].solid!==false);},hint:H.any});
  D(B.PG_LILY,{name:'Lily Pad',tiles:T3('pg_lily_t','pg_lily_s'),hard:0.5,toolClass:'axe',drop:IT.PG_FELT,hint:H.shears});
  D(B.PG_CATTAIL,{name:'Cattail',tiles:'pg_cattail',hard:0,solid:false,opq:false,bucket:'cut',cross:true,replace:true,drop:IT.PG_ROD,hint:H.any});
  D(B.PG_DOOR,{name:'Stage Door',tiles:T3('pg_door_t','pg_door_s'),hard:-1,interact:'pdoor',hint:H.never});
  D(B.PG_STRUNK,{name:'Stage Trunk',tiles:T3('pg_strunk_t','pg_strunk_s'),hard:-1,interact:'pstash',hint:H.never});
}

/* ---- item icons (16 px, (c,R) like tile(); P2's piI* painters) ---- */
function piIClr(c){c.clearRect(0,0,16,16);}
function piIRod(c,x0,y0,n,col){c.fillStyle=col||'#141214';for(let i=0;i<n;i++)c.fillRect(x0+i,y0-i,1,1);}      /* a 1 px diagonal handle */
function piIRod2(c,x0,y0,n,col){c.fillStyle=col;for(let i=0;i<n;i++){c.fillRect(x0+i,y0-i,1,1);c.fillRect(x0+i+1,y0-i,1,1);}}
function piIBlob(c,a,b,x,y,w,h){c.fillStyle=a;c.fillRect(x+1,y,w-2,h);c.fillRect(x,y+1,w,h-2);c.fillStyle=b;c.fillRect(x+1,y+1,Math.max(1,(w/3)|0),1);}
function piIPick(c,head,dk,handle,bend){piIRod2(c,3,13,8,handle);                                   /* a pick head; bend droops one end */
  const P=[[3,6],[4,5],[5,4],[6,3],[7,3],[8,2],[9,2],[10,3],[11,3],[12,4],[13,5]];if(!bend)P.push([13,6],[3,7]);else P.push([14,6],[14,7],[13,8]);
  for(const p of P){c.fillStyle=head;c.fillRect(p[0],p[1],1,1);c.fillStyle=dk;c.fillRect(p[0],p[1]+1,1,1);}}
function piIShears(c,a,b,zig){c.fillStyle=a;for(let i=0;i<8;i++){c.fillRect(7+i,8-i,1,2);c.fillRect(7+i,8+((i>>1)%2&&zig?1:0)-i+3,1,1);}
  c.fillStyle=b;c.fillRect(2,10,4,2);c.fillRect(3,12,2,3);c.fillRect(5,12,3,2);c.fillRect(7,13,2,2);}
function piIScoop(c,head,dk,handle){piIRod2(c,3,13,7,handle);c.fillStyle=head;c.fillRect(9,2,5,4);c.fillRect(10,1,3,6);c.fillStyle=dk;c.fillRect(10,6,3,1);c.fillRect(13,2,1,4);}
function piISword(c,blade,hi,handle){piIRod2(c,2,13,2,handle);c.fillStyle='#3a2a14';c.fillRect(3,10,2,2);c.fillRect(4,11,2,2);
  piIRod2(c,5,10,8,blade);c.fillStyle=hi;for(let i=0;i<8;i++)c.fillRect(6+i,10-i,1,1);}
function piISeq(c,R,n){for(let i=0;i<n;i++){const x=(R()*15)|0,y=(R()*15)|0;px(c,x,y,R()<0.5?'#ffe86a':'#ffb8e0');}}
function piIArmor(c,s,col,dk){c.fillStyle=col;                                                       /* the engine's armour silhouettes, recoloured */
  if(s===0){c.fillRect(3,3,10,6);c.fillRect(3,9,3,3);c.fillRect(10,9,3,3);}
  else if(s===1){c.fillRect(5,2,6,3);c.fillRect(2,4,12,7);c.fillRect(2,4,3,9);c.fillRect(11,4,3,9);}
  else if(s===2){c.fillRect(3,2,10,4);c.fillRect(3,6,4,8);c.fillRect(9,6,4,8);}
  else{c.fillRect(3,8,4,6);c.fillRect(9,8,4,6);c.fillRect(2,12,5,2);c.fillRect(9,12,5,2);}
  c.fillStyle=dk;c.fillRect(4,4,2,1);}
function piIMeat(c,a,b,bone){c.fillStyle=a;c.fillRect(3,5,9,7);c.fillRect(2,6,11,5);c.fillRect(4,4,7,9);c.fillStyle=b;c.fillRect(4,6,4,2);
  if(bone){c.fillStyle='#f4efe0';c.fillRect(12,8,3,2);c.fillRect(14,7,1,4);}}
function piIChicken(c,body,dk,eye){c.fillStyle=body;c.fillRect(3,7,8,5);c.fillRect(2,8,10,3);c.fillRect(10,3,2,6);c.fillRect(11,2,3,2);
  c.fillStyle='#e85a1a';c.fillRect(14,3,2,1);px(c,14,4,'#e85a1a');c.fillStyle='#d81a1a';c.fillRect(11,1,2,1);
  c.fillStyle=dk;c.fillRect(4,11,6,1);c.fillRect(5,12,1,3);c.fillRect(8,12,1,3);if(eye)px(c,12,2,'#111');}
function piIFish(c,a,b,grill){c.fillStyle=a;c.fillRect(3,6,8,4);c.fillRect(2,7,10,2);c.fillRect(11,5,1,6);c.fillRect(12,4,2,2);c.fillRect(12,10,2,2);
  px(c,4,7,'#111');c.fillStyle=b;c.fillRect(4,9,6,1);if(grill){c.fillStyle='#3a2210';for(let x=5;x<11;x+=2)c.fillRect(x,6,1,4);}}

/* ---- items (bible 5; plan 2.2). I(id, name, painter, extra) ---- */
{ const I=(id,name,ip,o)=>idef(id,Object.assign({pg:1,name,ipaint:ip},o||{}));
  const TL=(type,tier,mult,dur,dmg)=>({type,tier,mult,dur,dmg});
  /* materials 285-308 */
  I(IT.PG_PROGRAMME,'The Programme',(c,R)=>{piIClr(c);c.fillStyle='#f4ecd0';c.fillRect(3,1,10,14);c.fillStyle='#c8b890';c.fillRect(3,14,10,1);c.fillRect(12,1,1,14);
    c.fillStyle='#c41a1a';const S=[[8,2],[7,3],[8,3],[9,3],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[6,5],[7,5],[8,5],[9,5],[10,5],[7,6],[9,6],[6,7],[10,7]];for(const [x,y] of S)c.fillRect(x-0.5|0,y,1,1);
    c.fillStyle='#4a3a2a';for(let y=9;y<14;y+=2)c.fillRect(5,y,6,1);c.fillStyle='#b81818';c.fillRect(9,11,3,1);},
    {stack:1,puse:(st,hit,dt,rEdge)=>{if(!rEdge)return false;pguOpen();return true;}});
  I(IT.PG_FELT,'Felt',(c,R)=>{piIClr(c);fillN(c,R,'#4ca82b',0.08);c.clearRect(0,0,16,2);c.clearRect(0,14,16,2);c.clearRect(0,0,2,16);c.clearRect(14,0,2,16);
    c.fillStyle='#f2f6ee';for(let i=3;i<13;i+=2){c.fillRect(i,3,1,1);c.fillRect(i,12,1,1);c.fillRect(3,i,1,1);c.fillRect(12,i,1,1);}});
  I(IT.PG_ROD,'Puppet Rod',(c,R)=>{piIClr(c);piIRod(c,2,14,12,'#141214');piIRod(c,3,14,11,'#3a3640');c.fillStyle='#4ca82b';c.fillRect(10,3,3,3);px(c,13,4,'#2e7a18');});
  I(IT.PG_FLEECE,'Fleece',(c,R)=>{piIClr(c);for(let i=0;i<46;i++){const x=3+((R()*10)|0),y=4+((R()*9)|0);px(c,x,y,shade('#f2a6c1',(R()*2-1)*0.2));}
    for(let i=0;i<6;i++)px(c,4+((R()*8)|0),3+((R()*3)|0),'#ffd6e4');});
  I(IT.PG_PLASTICEYE,'Plastic Eye',(c,R)=>{piIClr(c);piTDisc(c,7.5,7.5,5.5,'#cdbf86');piTDisc(c,7.5,7.5,4.8,'#fbf8ee');piTDisc(c,9,8,2,'#0a0a0a');px(c,6,5,'#ffffff');},{pround:1});
  I(IT.PG_STUFF,'Stuffing',(c,R)=>{piIClr(c);piIBlob(c,'#ecebe6','#ffffff',3,4,10,8);for(let i=0;i<8;i++)px(c,4+((R()*8)|0),5+((R()*6)|0),'#c8c6be');}, {food:1,puse:piFoodUse,puseHold:true});
  I(IT.PG_GREASE,'Elbow Grease',(c,R)=>{piIClr(c);piTDisc(c,7.5,8,5.5,'#9aa0a8');piTDisc(c,7.5,8,4.5,'#c88a2a');piTDisc(c,8,8,2.5,'#e8a83a');
    c.fillStyle='rgba(120,60,10,0.6)';for(let a=0;a<6;a+=0.9)px(c,Math.round(8+Math.cos(a)*1.6),Math.round(8+Math.sin(a)*1.6),'rgba(120,60,10,0.6)');px(c,6,6,'#fff0c0');});
  I(IT.PG_CARD,'Cardboard',(c,R)=>{piIClr(c);c.fillStyle='#a87a48';c.fillRect(2,3,12,10);c.fillStyle='#7a5430';for(let y=4;y<13;y+=2)c.fillRect(2,y,12,1);c.fillStyle='#c89a68';c.fillRect(2,3,12,1);});
  I(IT.PG_FOAMCHUNK,'Foam Chunk',(c,R)=>{piIClr(c);c.fillStyle='#e8c85a';c.fillRect(4,3,9,3);c.fillStyle='#d8b649';c.fillRect(3,5,9,8);c.fillStyle='#b8962a';c.fillRect(12,4,1,8);
    for(let i=0;i<5;i++)px(c,4+((R()*7)|0),6+((R()*6)|0),'#8a6a20');});
  I(IT.PG_FOAMDUST,'Foam Dust',(c,R)=>{piIClr(c);for(let i=0;i<22;i++){const x=3+((R()*10)|0),y=8+((R()*6)|0);px(c,x,y,R()<0.5?'#a9541e':'#d8823a');}});
  I(IT.PG_GOOGLIES,'Googly Eyes',(c,R)=>{piIClr(c);piTGoogly(c,5,8,R);piTDisc(c,5,8,3,'#2a2a2a');piTDisc(c,5,8,2.5,'#f4f4f0');px(c,6,9,'#0a0a0a');px(c,5,9,'#0a0a0a');
    piTDisc(c,11,7,3,'#2a2a2a');piTDisc(c,11,7,2.5,'#f4f4f0');px(c,10,6,'#0a0a0a');px(c,11,6,'#0a0a0a');},{pround:1});
  I(IT.PG_HANGER,'Raw Coat Hanger',(c,R)=>{piIClr(c);c.fillStyle='#8e9296';c.fillRect(7,2,2,1);c.fillRect(9,3,1,2);c.fillRect(8,5,1,1);c.fillRect(7,6,1,2);
    for(let i=0;i<6;i++){c.fillRect(7-i,8+((i/2)|0),1,1);c.fillRect(8+i,8+((i/2)|0)+(i===4?1:0),1,1);}c.fillRect(2,11,12,1);px(c,10,10,'#5e6266');});
  I(IT.PG_WIRE,'Armature Wire',(c,R)=>{piIClr(c);for(let k=0;k<4;k++){piTDisc(c,8,8,5.5-k*1.2,k%2?'#8e9296':'#d8dce0');}piTDisc(c,8,8,1.2,'#00000000');c.clearRect(7,7,2,2);c.fillStyle='#d8dce0';c.fillRect(13,7,2,1);});
  I(IT.PG_SEQUIN,'Sequin',(c,R)=>{piIClr(c);piTDisc(c,7.5,7.5,5,'#c9a43a');piTDisc(c,7.5,7.5,4.2,'#f2d24a');c.clearRect(7,7,2,2);px(c,5,5,'#fffbe0');px(c,6,4,'#fffbe0');});
  I(IT.PG_SEQCLOTH,'Sequin Cloth',(c,R)=>{piIClr(c);c.fillStyle='#f2a6c1';c.fillRect(2,3,12,10);c.fillStyle='#d886a6';c.fillRect(2,12,12,1);for(let i=0;i<14;i++){const x=3+((R()*10)|0),y=4+((R()*8)|0);c.fillStyle=R()<0.6?'#f2d24a':'#e8e8f0';c.fillRect(x,y,1,1);}});
  I(IT.PG_KNUCKLE,'Puppeteer Knuckle',(c,R)=>{piIClr(c);c.fillStyle='#c99a84';c.fillRect(5,3,6,11);c.fillStyle='#e8b9a0';c.fillRect(6,3,4,11);c.fillRect(5,5,6,8);
    c.fillStyle='#d8c8b0';c.fillRect(6,3,4,3);c.fillStyle='#3a2818';c.fillRect(6,3,4,1);px(c,9,4,'#5a4030');c.fillStyle='#b88a74';c.fillRect(5,9,6,1);c.fillStyle='#c4404a';c.fillRect(5,13,6,1);});
  I(IT.PG_LAMINATE,'Laminate Chip',(c,R)=>{piIClr(c);c.fillStyle='#7d8c3a';for(let y=0;y<9;y++)c.fillRect(3+((y/2)|0),4+y,11-y,1);for(let i=0;i<6;i++)px(c,5+((R()*6)|0),5+((R()*5)|0),'#a8b45a');});
  I(IT.PG_COIL,'Burner Coil',(c,R)=>{piIClr(c);for(let t=0;t<30;t++){const a=t*0.62,r=1+t*0.17;px(c,Math.round(7.5+Math.cos(a)*r),Math.round(7.5+Math.sin(a)*r),t%4?'#ff7a1a':'#ffd36a');}});
  I(IT.PG_SHARD,'Mirror Shard',(c,R)=>{piIClr(c);for(let y=0;y<11;y++){c.fillStyle=rgbS(170+y*7,180+y*6,195+y*5);c.fillRect(4+((y*0.4)|0),3+y,Math.max(1,10-y),1);}px(c,6,4,'#ffffff');px(c,7,5,'#ffffff');});
  I(IT.PG_COPPER,'Copper Winding',(c,R)=>{piIClr(c);c.fillStyle='#6a6e74';c.fillRect(7,2,2,12);for(let y=3;y<13;y+=2){c.fillStyle=y%4===1?'#e8904a':'#b86a2a';c.fillRect(4,y,8,1);}});
  I(IT.PG_SATIN,'Satin',(c,R)=>{piIClr(c);c.fillStyle='#f7c4d8';c.fillRect(2,5,12,7);c.fillStyle='#e8a6c0';c.fillRect(2,8,12,1);c.fillStyle='#ffffff';c.fillRect(3,6,6,1);c.fillStyle='#d88aa8';c.fillRect(2,11,12,1);});
  I(IT.PG_PINS,'Steel Pins',(c,R)=>{piIClr(c);for(let k=0;k<3;k++){c.fillStyle='#c8ccd4';for(let i=0;i<9;i++)c.fillRect(3+k*3+((i*0.3)|0),4+i,1,1);piTDisc(c,3.5+k*3,3,1.3,['#d81a1a','#2a6ad8','#f2d24a'][k]);}});
  I(IT.PG_SHAGFUR,'Shag Fur',(c,R)=>{piIClr(c);for(let i=0;i<30;i++){const x=3+((R()*10)|0),y=3+((R()*8)|0);c.fillStyle=shade('#6a4422',(R()*2-1)*0.25);c.fillRect(x,y,1,2+((R()*3)|0));}});
  I(IT.PG_DRUMSTICK,'Drumstick',(c,R)=>{piIClr(c);piIRod2(c,3,13,9,'#d8b07a');c.fillStyle='#b8905a';for(let i=0;i<9;i++)c.fillRect(4+i,13-i,1,1);piTDisc(c,13,3,1.4,'#e8c890');});
  /* tools and weapons 310-326 + 335 (bible 5.2). The Gauntlet "mines like a Disco Pick", so its engine type is 'pick'. */
  I(IT.PG_FLOPPY,'Floppy Pick',(c,R)=>{piIClr(c);piIPick(c,'#4ca82b','#2e7a18','#141214',true);},{stack:1,tool:TL('pick',0,2,48,2),gadget:'pg_floppy'});
  I(IT.PG_PSHEARS,'Pinking Shears',(c,R)=>{piIClr(c);piIShears(c,'#c8ccd4','#e8822b',true);},{stack:1,tool:TL('axe',0,2,48,1),gadget:'pg_pshears'});
  I(IT.PG_FSCOOP,'Felt Scoop',(c,R)=>{piIClr(c);piIScoop(c,'#4ca82b','#2e7a18','#141214');},{stack:1,tool:TL('shovel',0,2,48,1),gadget:'pg_fscoop'});
  I(IT.PG_SLAPPER,'Sock Slapper',(c,R)=>{piIClr(c);piIRod2(c,2,14,5,'#141214');c.fillStyle='#e8e8ee';c.fillRect(6,2,6,9);c.fillStyle='#d81a1a';c.fillRect(6,4,6,1);c.fillRect(6,7,6,1);
    c.fillStyle='#c41a3a';c.fillRect(11,6,3,3);px(c,8,3,'#111');px(c,10,3,'#111');},{stack:1,tool:TL('sword',0,1,48,3),gadget:'pg_slapper'});
  I(IT.PG_LARPPICK,'LARP Pick',(c,R)=>{piIClr(c);piIPick(c,'#d8b649','#a8862a','#141214');c.fillStyle='#9aa0a6';c.fillRect(7,2,2,3);},{stack:1,tool:TL('pick',1,4,110,3),gadget:'pg_larppick'});
  I(IT.PG_CLIPPERS,'Foam Clippers',(c,R)=>{piIClr(c);piIShears(c,'#d8b649','#9aa0a6');},{stack:1,tool:TL('axe',1,4,110,2),gadget:'pg_clippers'});
  I(IT.PG_LARPSPADE,'LARP Spade',(c,R)=>{piIClr(c);piIScoop(c,'#d8b649','#a8862a','#141214');},{stack:1,tool:TL('shovel',1,4,110,2),gadget:'pg_larpspade'});
  I(IT.PG_BAT,'Foam Bat',(c,R)=>{piIClr(c);c.fillStyle='#9aa0a6';for(let i=0;i<4;i++)c.fillRect(2+i,13-i,2,1);c.fillStyle='#d8b649';for(let i=0;i<8;i++)c.fillRect(5+i,10-i,3,3);
    c.fillStyle='#a8862a';for(let i=0;i<8;i++)c.fillRect(6+i,12-i,1,1);},{stack:1,tool:TL('sword',1,1,110,3),bat:1,gadget:'pg_bat'});
  I(IT.PG_HPICK,'Hanger Pick',(c,R)=>{piIClr(c);piIPick(c,'#a8acb2','#5e6266','#141214');px(c,8,1,'#c8ccd4');},{stack:1,tool:TL('pick',2,6,260,4),gadget:'pg_hpick'});
  I(IT.PG_SNIPS,'Wire Snips',(c,R)=>{piIClr(c);piIShears(c,'#a8acb2','#d81a1a');},{stack:1,tool:TL('axe',2,6,260,3),gadget:'pg_snips'});
  I(IT.PG_HSCOOP,'Hanger Scoop',(c,R)=>{piIClr(c);piIScoop(c,'#a8acb2','#5e6266','#141214');},{stack:1,tool:TL('shovel',2,6,260,3),gadget:'pg_hscoop'});
  I(IT.PG_RAPIER,'Coat Hanger Rapier',(c,R)=>{piIClr(c);piISword(c,'#a8acb2','#e8ecf0','#141214');c.fillStyle='#8e9296';c.fillRect(2,8,4,1);c.fillRect(2,7,1,1);px(c,3,6,'#8e9296');},
    {stack:1,tool:TL('sword',2,1,260,5),gadget:'pg_rapier'});
  I(IT.PG_DISCO,'Disco Pick',(c,R)=>{piIClr(c);piIPick(c,'#f2d24a','#d886a6','#d8b07a');piISeq(c,R,4);},{stack:1,tool:TL('pick',3,9,600,5),gadget:'pg_disco'});
  I(IT.PG_RSNIPS,'Rhinestone Snips',(c,R)=>{piIClr(c);piIShears(c,'#e8ecf8','#f27ab0');px(c,10,4,'#ffffff');px(c,12,6,'#bfefff');},{stack:1,tool:TL('axe',3,9,600,4),gadget:'pg_rsnips'});
  I(IT.PG_GSCOOP,'Glitter Scoop',(c,R)=>{piIClr(c);piIScoop(c,'#f27ab0','#c84a88','#d8b07a');piISeq(c,R,3);},{stack:1,tool:TL('shovel',3,9,600,4),gadget:'pg_gscoop'});
  I(IT.PG_STILETTO,'The Stiletto',(c,R)=>{piIClr(c);piIRod2(c,2,14,5,'#d8b07a');c.fillStyle='#b01a6a';c.fillRect(7,8,7,3);c.fillRect(12,5,2,4);c.fillRect(6,9,2,1);
    c.fillStyle='#d83a8a';c.fillRect(7,8,6,1);c.fillStyle='#111';c.fillRect(13,10,1,4);px(c,9,7,'#f2d24a');},{stack:1,tool:TL('sword',3,1,600,7),gadget:'pg_stiletto'});
  I(IT.PG_GAUNTLET,"The Puppeteer's Gauntlet",(c,R)=>{piIClr(c);c.fillStyle='#c99a84';c.fillRect(4,6,8,8);c.fillStyle='#e8b9a0';c.fillRect(5,6,6,7);
    for(let k=0;k<4;k++){c.fillStyle='#e8b9a0';c.fillRect(4+k*2,2+(k%2),2,5);c.fillStyle='#4a3424';px(c,4+k*2,2+(k%2),'#4a3424');}c.fillStyle='#e8b9a0';c.fillRect(11,8,3,2);
    c.fillStyle='#f4f0f8';for(let x=4;x<12;x+=2)c.fillRect(x,12,1,1);c.fillStyle='#141214';c.fillRect(4,13,8,2);},{stack:1,tool:TL('pick',3,9,1500,9),gadget:'pg_gauntlet',pflesh:3});
  I(IT.PG_CHOPGLOVE,'Slam Gloves',(c,R)=>{piIClr(c);c.fillStyle='#a8322a';c.fillRect(3,3,4,11);c.fillRect(9,3,4,11);c.fillStyle='#c8564a';c.fillRect(3,3,4,2);c.fillRect(9,3,4,2);
    c.fillStyle='#ffffff';px(c,11,4,'#ffffff');px(c,12,5,'#ffffff');},{stack:1,tool:TL('sword',3,1,400,6),gadget:'pg_chopglove',puse:piUseChopGlove,puseHold:true});
  /* gear and boss loot 327-338 (bible 5.3) */
  I(IT.PG_MITT,'Pig Mitt',(c,R)=>{piIClr(c);c.fillStyle='#f2a6c1';c.fillRect(3,4,9,10);c.fillRect(11,6,3,4);c.fillStyle='#d886a6';c.fillRect(3,12,9,2);piISeq(c,R,7);
    c.fillStyle='#8a5a32';c.fillRect(3,13,9,1);},{stack:1,dur:40,gadget:'pg_mitt',puse:piUseMitt,puseHold:true});
  I(IT.PG_VMIRROR,'Vanity Mirror',(c,R)=>{piIClr(c);piTDisc(c,8,6,5.2,'#ffd36a');piTDisc(c,8,6,4.2,'#c8d4e4');px(c,6,4,'#ffffff');px(c,6,5,'#ffffff');
    c.fillStyle='#f27ab0';c.fillRect(7,11,2,4);for(let a=0;a<6.28;a+=0.9)px(c,Math.round(8+Math.cos(a)*5),Math.round(6+Math.sin(a)*5),'#fff6b0');},
    {stack:1,dur:20,gadget:'pg_vmirror',puse:piUseMirror,puseHold:true});
  I(IT.PG_FLY,'Felt Fly',(c,R)=>{piIClr(c);c.fillStyle='rgba(220,240,255,0.8)';c.fillRect(3,3,4,4);c.fillRect(9,3,4,4);c.fillStyle='#2e7a18';c.fillRect(5,7,6,5);
    c.fillStyle='#4ca82b';c.fillRect(6,7,4,4);piTDisc(c,6,6,1.5,'#f4f4f0');piTDisc(c,10,6,1.5,'#f4f4f0');px(c,6,7,'#111');px(c,10,5,'#111');},
    {stack:16,gadget:'pg_fly',puse:piUseFly});
  I(IT.PG_PIE,'Custard Pie',(c,R)=>{piIClr(c);c.fillStyle='#b8bec6';c.fillRect(2,9,12,3);c.fillStyle='#d8a858';c.fillRect(3,8,10,2);c.fillStyle='#fff8d8';c.fillRect(3,5,10,4);c.fillRect(5,4,6,1);
    px(c,7,3,'#fffdf0');px(c,9,4,'#ffffff');},{stack:16,food:5,gadget:'pg_pie',puse:piUsePie,puseHold:true});
  I(IT.PG_CHARGE,'Charge',(c,R)=>{piIClr(c);c.fillStyle='#c41a1a';c.fillRect(4,5,8,8);c.fillStyle='#e83a3a';c.fillRect(4,5,8,1);c.fillStyle='#4ca82b';c.fillRect(4,9,8,2);
    c.fillStyle='#b81818';c.fillRect(8,2,1,3);px(c,9,2,'#ffd36a');piTDisc(c,6,7,1,'#f4f4f0');px(c,6,7,'#111');},{stack:16,gadget:'pg_charge',puse:piUseCharge});
  I(IT.PG_PLUNGER,'The Plunger',(c,R)=>{piIClr(c);c.fillStyle='#6a4424';c.fillRect(3,9,10,6);c.fillStyle='#8a5a32';c.fillRect(3,9,10,1);c.fillStyle='#c41a1a';c.fillRect(5,11,6,1);
    c.fillStyle='#8e9296';c.fillRect(7,3,2,6);c.fillStyle='#141214';c.fillRect(4,2,8,2);},{stack:1,gadget:'pg_plunger',puse:piUsePlunger});
  I(IT.PG_STAPLER,'Staple Gun',(c,R)=>{piIClr(c);c.fillStyle='#5e6a7a';c.fillRect(2,5,12,4);c.fillStyle='#8a96a6';c.fillRect(2,5,12,1);c.fillStyle='#2a2e34';c.fillRect(9,9,4,5);
    c.fillStyle='#d81a1a';c.fillRect(3,9,5,2);px(c,2,8,'#e8ecf0');},{stack:1,dur:300,gadget:'pg_stapler',puse:piUseStapler,puseHold:true});
  I(IT.PG_STAPLES,'Staples',(c,R)=>{piIClr(c);c.fillStyle='#c8ccd4';c.fillRect(2,6,12,4);c.fillStyle='#8e9296';for(let x=3;x<14;x+=2)c.fillRect(x,6,1,4);c.fillStyle='#e8ecf0';c.fillRect(2,6,12,1);});
  I(IT.PG_PEARLS,'Pearl Necklace',(c,R)=>{piIClr(c);for(let a=0;a<6.28;a+=0.5)piTDisc(c,8+Math.cos(a)*5,7+Math.sin(a)*4.5,0.9,'#f4f0f8');piTDisc(c,8,12.5,1.3,'#ffffff');},{stack:1,gadget:'pg_pearls'});
  I(IT.PG_FUSE,'Lit Fuse',(c,R)=>{piIClr(c);c.fillStyle='#3a2a1a';for(let i=0;i<10;i++)c.fillRect(3+i,12-((Math.sin(i*0.9)*3+i*0.5)|0),1,2);
    px(c,13,4,'#ffd36a');px(c,13,3,'#ff7a1a');c.fillStyle='rgba(120,120,120,0.6)';c.fillRect(12,1,2,1);c.fillRect(13,0,2,1);},{stack:1,gadget:'pg_fuse',puse:piUseFuse});
  I(IT.PG_BOA,"Diva's Boa",(c,R)=>{piIClr(c);for(let i=0;i<40;i++){const t=i/40,x=2+t*12,y=8+Math.sin(t*9)*4;px(c,Math.round(x+(R()*2-1)),Math.round(y+(R()*2-1)),R()<0.5?'#f27ab0':'#ffb8d8');}},
    {stack:1,gadget:'pg_boa'});
  /* armour 340-350 (bible 5.4): explicit ids with armor:{m,s}; ARM_M rows m 4..8 */
  ARM_M.push({n:'Foam Padding',pts:1.75,dur:120,it:()=>IT.PG_FOAMCHUNK,col:'#d8b649'},{n:'Sequin Gown',pts:3.75,dur:300,it:()=>IT.PG_SEQCLOTH,col:'#c8a0e0'},
    {n:'Stunt',pts:3,dur:250,it:()=>IT.PG_FELT,col:'#c0283a'},{n:'Performer',pts:1,dur:200,it:()=>IT.PG_FELT,col:'#e8e8ee'},{n:'Fright',pts:2,dur:200,it:()=>IT.PG_FELT,col:'#1a1418'});
  const A=(id,name,m,s,ip)=>I(id,name,ip,{stack:1,armor:{m,s}});
  for(const [id,n,s] of [[IT.PG_FPAD_H,'Foam Padding Helmet',0],[IT.PG_FPAD_C,'Foam Padding Chest',1],[IT.PG_FPAD_L,'Foam Padding Legs',2],[IT.PG_FPAD_B,'Foam Padding Boots',3]])
    A(id,n,4,s,(c,R)=>{piIClr(c);piIArmor(c,s,'#d8b649','#8a6a20');for(let i=0;i<5;i++)px(c,4+((R()*8)|0),4+((R()*8)|0),'#a8862a');c.fillStyle='#9aa0a6';c.fillRect(6,s===3?9:5,4,1);});
  for(const [id,n,s] of [[IT.PG_GOWN_H,'Sequin Gown Tiara',0],[IT.PG_GOWN_C,'Sequin Gown Bodice',1],[IT.PG_GOWN_L,'Sequin Gown Skirt',2],[IT.PG_GOWN_B,'Sequin Gown Heels',3]])
    A(id,n,5,s,(c,R)=>{piIClr(c);if(s===0){c.fillStyle='#f2d24a';c.fillRect(3,9,10,2);for(const x of [3,6,8,10,12])c.fillRect(x,5+(x===8?-2:0),1,4+(x===8?2:0));px(c,8,3,'#f27ab0');}
      else if(s===3){c.fillStyle='#b05ad0';c.fillRect(2,9,5,3);c.fillRect(9,9,5,3);c.fillStyle='#111';c.fillRect(6,12,1,3);c.fillRect(13,12,1,3);}
      else piIArmor(c,s,'#c8a0e0','#8a5aa8');piISeq(c,R,6);});
  A(IT.PG_STUNT,'Stunt Helmet',6,0,(c,R)=>{piIClr(c);piTDisc(c,8,8,5.6,'#c0283a');c.fillStyle='#f4f4f0';c.fillRect(2,8,13,2);c.fillRect(7,2,2,12);c.clearRect(2,11,13,5);
    c.fillStyle='#111';c.fillRect(4,10,9,1);px(c,8,5,'#f2d24a');});
  A(IT.PG_SNEAKERS,"Performer's Sneakers",7,3,(c,R)=>{piIClr(c);c.fillStyle='#e8e4d8';c.fillRect(1,8,6,4);c.fillRect(9,8,6,4);c.fillRect(4,6,3,2);c.fillRect(12,6,3,2);
    c.fillStyle='#8a7a5a';c.fillRect(1,12,6,1);c.fillRect(9,12,6,1);for(let i=0;i<5;i++)px(c,1+((R()*14)|0),8+((R()*4)|0),'#6a5a3a');px(c,5,7,'#3a6ad8');px(c,13,7,'#3a6ad8');});
  A(IT.PG_WIG,'Fright Wig',8,0,(c,R)=>{piIClr(c);for(let i=0;i<60;i++){const a=R()*6.28,r=2+R()*5;px(c,Math.round(8+Math.cos(a)*r),Math.round(8+Math.sin(a)*r*0.8),R()<0.7?'#1a1418':'#3a3038');}
    c.clearRect(5,9,6,5);});
  /* food 351-361 (bible 8: EFFECTIVE values; raw:1 sprays out of the back of your head) */
  const F=(id,name,food,raw,ip,o)=>I(id,name,ip,Object.assign({food,puse:piFoodUse,puseHold:true},raw?{raw:1}:{},o||{}));
  F(IT.PG_TOMATO,'Heckle Tomato',3,0,(c,R)=>{piIClr(c);piTDisc(c,8,9,5,'#c41a1a');piTDisc(c,8,9,4,'#e8302a');c.fillStyle='#8a0a0a';c.fillRect(4,11,8,2);px(c,6,7,'#ff8a7a');
    c.fillStyle='#2e7a18';c.fillRect(7,3,3,2);px(c,8,2,'#2e7a18');});
  F(IT.PG_RCHICK,'Rubber Chicken',2,1,(c,R)=>{piIClr(c);piIChicken(c,'#f2d24a','#c8a82a',true);});
  I(IT.PG_LIVECHICK,'Live Chicken',(c,R)=>{piIClr(c);piIChicken(c,'#f6e070','#c8a82a',true);c.fillStyle='#f6e070';c.fillRect(2,4,3,3);c.fillRect(6,3,3,3);
    c.fillStyle='#ffffff';px(c,1,3,'#ffffff');px(c,5,2,'#ffffff');},{stack:1,puse:piUseLiveChicken});
  F(IT.PG_ROAST,'Roast Rubber Chicken',8,0,(c,R)=>{piIClr(c);piIChicken(c,'#b8682a','#7a3a10',false);px(c,5,8,'#e8a060');});
  F(IT.PG_DOUGHBALL,'Dough Ball',1,1,(c,R)=>{piIClr(c);piTDisc(c,8,9,4.5,'#d8c8a0');piTDisc(c,8,8.5,4,'#efe3c4');px(c,6,6,'#fffaf0');px(c,9,9,'#c4b088');});
  F(IT.PG_FLATBREAD,'Flatbread',5,0,(c,R)=>{piIClr(c);piTDisc(c,8,8,6,'#c8944a');piTDisc(c,8,8,5,'#e0b468');for(let i=0;i<8;i++)px(c,4+((R()*8)|0),4+((R()*8)|0),'#8a5a22');});
  F(IT.PG_MEATBALL,'Mystery Meatball',4,0,(c,R)=>{piIClr(c);piTDisc(c,8,9,4.5,'#5a3418');piTDisc(c,8,8.5,4,'#7a4a24');for(let i=0;i<6;i++)px(c,5+((R()*6)|0),6+((R()*5)|0),'#4a2810');px(c,6,6,'#a87a4a');},{pround:1});
  F(IT.PG_HAM,'Ham Hock',2,1,(c,R)=>{piIClr(c);piIMeat(c,'#f0a0a8','#f8d4ce',true);});
  F(IT.PG_GLAZED,'Glazed Ham',9,0,(c,R)=>{piIClr(c);piIMeat(c,'#b8582a','#e8a060',true);px(c,5,5,'#ffe0a0');px(c,9,6,'#ffe0a0');});
  F(IT.PG_FISH,'Homing Herring',1,1,(c,R)=>{piIClr(c);piIFish(c,'#7a9ab8','#5a7a98',false);});
  F(IT.PG_GRILLED,'Grilled Fish',6,0,(c,R)=>{piIClr(c);piIFish(c,'#b87a3a','#8a5420',true);});
  /* souvenirs 362-364: overworld items, created only at customs (no pg). Their verbs run in the overworld only (p2_gear.js). */
  const SV=(id,name,ip,o)=>idef(id,Object.assign({name,ipaint:ip,stack:1},o||{}));
  SV(IT.PG_SV_PLUNGER,'Detonator Plunger',(c,R)=>{piIClr(c);c.fillStyle='#6a4424';c.fillRect(3,9,10,6);c.fillStyle='#c9a43a';c.fillRect(3,9,10,1);c.fillRect(3,14,10,1);
    c.fillStyle='#8e9296';c.fillRect(7,3,2,6);c.fillStyle='#141214';c.fillRect(4,2,8,2);px(c,12,4,'#ffd36a');},{gadget:'pg_svplunger',puse:piUseSvPlunger});
  SV(IT.PG_SV_GLOVE,'Pig-Hurling Glove',(c,R)=>{piIClr(c);c.fillStyle='#7a5232';c.fillRect(5,2,6,12);c.fillRect(3,8,3,3);c.fillStyle='#9a6e48';c.fillRect(5,2,6,2);
    c.fillStyle='#d8c8a8';c.fillRect(5,13,6,1);},{gadget:'pg_svglove',puse:piUseSvGlove});
  SV(IT.PG_SV_FROG,'Frog Puppet (Empty)',(c,R)=>{piIClr(c);c.fillStyle='#4ca82b';c.fillRect(3,6,10,5);c.fillRect(5,11,6,4);c.fillStyle='#2e7a18';c.fillRect(3,9,10,1);
    piTDisc(c,5.5,5,2,'#e6c84a');piTDisc(c,10.5,5,2,'#e6c84a');c.fillStyle='#111';c.fillRect(5,4,2,2);c.fillRect(10,4,2,2);},{gadget:'pg_svfrog',puse:piUseSvFrog});
}
/* ---- smelting and fuel (bible 7.5): shared engine tables; purgatory ids never exist outside ---- */
SMELT[IT.PG_HANGER]=IT.PG_WIRE;SMELT[IT.PG_FOAMDUST]=IT.PG_FOAMCHUNK;SMELT[IT.PG_RCHICK]=IT.PG_ROAST;
SMELT[IT.PG_DOUGHBALL]=IT.PG_FLATBREAD;SMELT[IT.PG_HAM]=IT.PG_GLAZED;SMELT[IT.PG_FISH]=IT.PG_GRILLED;
FUELS[IT.PG_GREASE]=80;FUELS[IT.PG_CARD]=15;FUELS[IT.PG_FELT]=10;FUELS[IT.PG_STUFF]=10;
