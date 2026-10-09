
/* ----- building by direct placement ----- */
/* The model sees a text map of the site (one slice per height, local
   coordinates) and replies with the exact blocks to place/remove. The body
   then walks, pillars and places them one at a time like a player would. */
const BPAL=[];          /* [name,id] the model may use */
const BPAL_ID=new Map();/* lower-case name -> id */
function bpalInit(){
  const add=(n,id)=>{if(id===undefined||id===null)return;BPAL.push([n,id]);BPAL_ID.set(n.toLowerCase(),id);};
  add('Dirt',B.DIRT);add('Grass Block',B.GRASS);add('Cobblestone',B.COBBLE);add('Stone',B.STONE);
  add('Oak Planks',B.PLANK_O);add('Birch Planks',B.PLANK_B);add('Spruce Planks',B.PLANK_S);
  add('Oak Log',B.LOG_O);add('Birch Log',B.LOG_B);add('Spruce Log',B.LOG_S);
  add('Glass',B.GLASS);add('Wool',B.WOOL);add('Bricks',B.BRICK);add('Stone Bricks',B.STONEBRICK);
  add('Sand',B.SAND);add('Sandstone',B.SANDSTONE);add('Gravel',B.GRAVEL);add('Oak Leaves',B.LEAF_O);
  add('Clay',B.CLAY);add('Ice',B.ICE);add('Torch',B.TORCH);add('Wood Door',IT.DOOR);
  add('Crafting Table',B.CRAFT);add('Chest',B.CHEST);add('Furnace',B.FURNACE);add('Bed',B.BED);
  add('Ramp east',B.RAMP);add('Ramp west',B.RAMP+1);add('Ramp south',B.RAMP+2);add('Ramp north',B.RAMP+3);
  add('Water',B.WATER);add('Lava',B.LAVA);add('TNT',B.TNT);add('Obsidian',B.OBSIDIAN);add('Glowstone',B.GLOWSTONE);
  for(const id of FLOWER_IDS)add(DEFS[id].name,id);
  for(const [n,id] of [['Planks',B.PLANK_O],['Log',B.LOG_O],['Wood',B.PLANK_O],['Door',IT.DOOR],['Leaves',B.LEAF_O],
    ['Cobble',B.COBBLE],['Brick',B.BRICK],['Stone Brick',B.STONEBRICK],['Ramp',B.RAMP]])if(!BPAL_ID.has(n.toLowerCase()))BPAL_ID.set(n.toLowerCase(),id);
}
function bpalId(n){
  if(n==null)return null;
  const l=(''+n).toLowerCase().replace(/\s*\(.*$/,'').replace(/\s+x\d+$/,'').trim();
  if(BPAL_ID.has(l))return BPAL_ID.get(l);
  const l2=l.replace(/s$/,'');if(BPAL_ID.has(l2))return BPAL_ID.get(l2);
  for(const k in DEFS){const d=DEFS[k];if(!d.item&&!d.hide&&d.hard>=0&&d.name.toLowerCase()===l)return +k;}
  for(const [k,id] of BPAL_ID)if(l.includes(k))return id;
  return null;
}
/* the name the build model uses for a block */
function agBlockName(id){
  if(id===IT.BUCKET_W)return 'Water Bucket';if(id===IT.BUCKET_L)return 'Lava Bucket';
  for(const [n,i] of BPAL)if(i===id)return n;
  return DEFS[id]?DEFS[id].name:'?';
}
/* blocks a build can put down (not items, not hidden variants) */
function agPlaceable(id){const d=DEFS[id];return !!d&&!d.item&&!d.hide&&!d.cr&&d.hard>=0&&id!==B.WATER&&id!==B.LAVA;}
/* "Planks"/"Log"/"Leaves" mean whichever kind you actually carry */
function agVariant(a,id){
  if(id==null||agHas(a,id)>0)return id;
  for(const g of [GROUPS.planks,GROUPS.logs,[B.LEAF_O,B.LEAF_B,B.LEAF_S]])if(g.includes(id)){
    let best=id,bn=0;for(const i of g){const h=agHas(a,i);if(h>bn){bn=h;best=i;}}return best;}
  return id;
}
/* placements still queued in a job, per inventory item */
function agPending(j){const m={};if(j)for(const op of j.ops)if(op.k==='pl'){const k=agPlaceItem(op.id);m[k]=(m[k]||0)+1;}return m;}
/* YOUR BLOCKS: only what the agent actually carries, with counts (queued placements already taken off) */
function agPalette(a,j){
  const pend=agPending(j),out=[],seen=new Set();
  for(const st of a.inv){
    if(!st||seen.has(st.id))continue;seen.add(st.id);
    const id=st.id,n=Math.max(0,agHas(a,id)-(pend[id]||0));
    if(id===IT.BUCKET_W){out.push('Water (bucket, unlimited)');continue;}
    if(!n)continue;
    if(id===IT.BUCKET_L){out.push('Lava x'+n+' (one block per Lava Bucket)');continue;}
    if(id===IT.DOOR){out.push('Wood Door x'+n);continue;}
    if(id===B.RAMP){out.push('Ramp east/west/south/north x'+n+' (shared)');continue;}
    if(!agPlaceable(id))continue;
    out.push(agBlockName(id)+' x'+n);
  }
  if(!out.length)out.push('NOTHING - you carry no blocks at all (you can only remove blocks; finish with done and go gather some)');
  return out;
}
/* view glyphs: UPPER = placed by a player, lower = natural terrain */
const VG={};
function vgInit(){
  const s=(id,ch)=>{if(id!==undefined)VG[id]=ch;};
  s(B.DIRT,'D');s(B.GRASS,'G');s(B.STONE,'S');s(B.COBBLE,'C');s(B.PLANK_O,'P');s(B.PLANK_B,'B');s(B.PLANK_S,'Q');
  s(B.LOG_O,'L');s(B.LOG_B,'J');s(B.LOG_S,'K');s(B.GLASS,'Y');s(B.WOOL,'W');s(B.BRICK,'R');s(B.STONEBRICK,'T');
  s(B.SAND,'A');s(B.SANDSTONE,'E');s(B.LEAF_O,'F');s(B.LEAF_B,'F');s(B.LEAF_S,'F');s(B.SNOWGRASS,'X');
  s(B.ICE,'I');s(B.CLAY,'U');s(B.OBSIDIAN,'Z');s(B.CHEST,'H');s(B.FURNACE,'N');s(B.CRAFT,'M');
  for(const o of [B.COAL_ORE,B.IRON_ORE,B.GOLD_ORE,B.DIA_ORE])s(o,'O');
}
const VG_SYM={};
function vgChar(id,owned){
  if(id===B.AIR||id===-1)return '.';
  if(id===B.WATER)return '~';if(id===B.LAVA)return '%';if(id===B.BEDROCK)return '#';
  if(id===B.GRAVEL)return '=';if(id===B.BED)return '8';if(id===B.TNT)return '!';
  if(isTorch(id))return '*';if(DEFS[id]&&DEFS[id].door)return '|';
  if(id>=B.RAMP&&id<B.RAMP+4)return '><v^'[id-B.RAMP];
  if(FLOWER_IDS.has(id)){const i=[...FLOWER_IDS].indexOf(id);return '1234567890'[i%10];}
  if(id===B.TALLGRASS||id===B.CACTUS)return owned?'?':',';
  const g=VG[id];
  if(g)return owned?g:g.toLowerCase();
  VG_SYM[id]=1;return '?';
}
function vgName(ch){
  const m={'.':'air','~':'water','%':'lava','#':'bedrock','=':'Gravel','8':'Bed','!':'TNT','*':'Torch','|':'Wood Door (2 tall)',
    '>':'Ramp east (rises toward +x)','<':'Ramp west (rises toward -x)','v':'Ramp south (rises toward +z)','^':'Ramp north (rises toward -z)',',':'tall grass/cactus','?':'other block'};
  if(m[ch])return m[ch];
  if(/[0-9]/.test(ch)){const ids=[...FLOWER_IDS];const id=ids['1234567890'.indexOf(ch)];return id!==undefined?DEFS[id].name:'flower';}
  const up=ch.toUpperCase();
  for(const k in VG)if(VG[k]===up)return DEFS[k].name.replace(/ Ore$/,' ore').replace(/^(Coal|Iron|Gold|Diamond) ore$/,'ore');
  return '?';
}
function bjWorld(j,lx,ly,lz){return [j.cx+lx,j.gy+ly,j.cz+lz];}
function bjLocal(j,x,y,z){return [x-j.cx,y-j.gy,z-j.cz];}
function bjCell(j,ov,lx,ly,lz){
  const [x,y,z]=bjWorld(j,lx,ly,lz);
  const k=lx+','+ly+','+lz;
  if(ov&&ov.has(k)){const v=ov.get(k);return {id:v,own:true};}
  const id=nb(x,y,z);
  return {id,own:BOWN.has(bkey(x,y,z))};
}
/* render the site map the model reads */
function bjView(j,ov){
  let x0=99,x1=-99,z0=99,z1=-99,ytop=-99;
  for(let lx=-12;lx<=11;lx++)for(let lz=-12;lz<=11;lz++){
    for(let ly=-3;ly<=30;ly++){
      const c=bjCell(j,ov,lx,ly,lz);
      if(c.own&&c.id!==B.AIR){x0=Math.min(x0,lx);x1=Math.max(x1,lx);z0=Math.min(z0,lz);z1=Math.max(z1,lz);ytop=Math.max(ytop,ly);}
    }
  }
  const pad=j.mode==='grief'?1:2,minR=j.mode==='grief'?3:5;
  x0=clamp(Math.min(x0===99?0:x0-pad,-minR),-12,11);x1=clamp(Math.max(x1===-99?0:x1+pad,minR),-12,11);
  z0=clamp(Math.min(z0===99?0:z0-pad,-minR),-12,11);z1=clamp(Math.max(z1===-99?0:z1+pad,minR),-12,11);
  let gmin=99,gmax=-99;
  for(let lx=x0;lx<=x1;lx++)for(let lz=z0;lz<=z1;lz++){
    const [x,,z]=bjWorld(j,lx,0,lz);
    let s=-99;for(let y=Math.min(WH-1,j.gy+30);y>=Math.max(1,j.gy-8);y--){const id=nb(x,y,z);
      if(id!==B.AIR&&id!==-1&&DEFS[id]&&DEFS[id].solid!==false&&!BOWN.has(bkey(x,y,z))){s=y-j.gy;break;}}
    if(s>-99){gmin=Math.min(gmin,s);gmax=Math.max(gmax,s);}
  }
  if(gmin===99){gmin=0;gmax=0;}
  const yb=Math.max(-6,Math.min(gmin-1,-1)),yt=Math.min(30,Math.max(ytop+1,gmax+1,2));
  const out=[];
  const cols=[];for(let lx=x0;lx<=x1;lx++)cols.push(lx);
  const hdr=(f)=>'     '+cols.map(f).join('');
  out.push('MAP: this map shows columns x='+x0+' (leftmost) to x='+x1+' (rightmost) - NOT always -12..11. The 3 header rows above each layer spell out every column\'s x (sign, tens, units). Rows are z. North (-z) is up, east (+x) is right.');
  const head=[hdr(x=>x<0?'-':'+'),hdr(x=>Math.floor(Math.abs(x)/10)),hdr(x=>Math.abs(x)%10)];
  const used=new Set();
  let airRun=null;
  const flushAir=()=>{if(airRun){out.push(airRun[0]===airRun[1]?'y='+airRun[0]+': all air':'y='+airRun[1]+'..'+airRun[0]+': all air');airRun=null;}};
  for(let ly=yt;ly>=yb;ly--){
    const rows=[];let allAir=true,allSolidNat=true;
    for(let lz=z0;lz<=z1;lz++){
      let r='';
      for(const lx of cols){const c=bjCell(j,ov,lx,ly,lz);const ch=vgChar(c.id,c.own);r+=ch;
        if(ch!=='.')allAir=false;
        if(!(ch!=='.'&&ch===ch.toLowerCase()&&ch!=='~'&&ch!==','&&!/[0-9*|!8=%<>v^]/.test(ch)))allSolidNat=false;
        used.add(ch);}
      rows.push('z='+(lz<0?'':'+')+lz+(Math.abs(lz)<10?' ':'')+' '+r);
    }
    if(allAir){if(!airRun)airRun=[ly,ly];else airRun[1]=ly;continue;}
    flushAir();
    if(allSolidNat&&ly<Math.min(0,gmin)){out.push('y='+ly+': all natural ground');continue;}
    out.push('y='+ly+(ly===0?' (ground level at the site centre)':'')+'   [columns x='+x0+'..'+x1+']');
    out.push(...head);out.push(...rows);
  }
  flushAir();
  used.delete('.');
  const leg=[...used].sort().map(ch=>ch+'='+vgName(ch));
  out.push('LEGEND (UPPERCASE = placed by a player, lowercase = natural terrain): .=air '+leg.join(', '));
  /* exact coordinates of player-placed blocks: the reliable anchor when reading the grid is fiddly */
  const runs=[];
  for(let ly=yt;ly>=yb;ly--)for(let lz=z0;lz<=z1;lz++){let st=null;
    for(let lx=x0;lx<=x1+1;lx++){const c=lx<=x1?bjCell(j,ov,lx,ly,lz):null;const id=c&&c.own&&c.id!==B.AIR?c.id:null;
      if(st&&(id!==st.id)){runs.push('y='+ly+' z='+lz+': '+(DEFS[st.id]?DEFS[st.id].name:'?')+' x='+(st.x===lx-1?st.x:st.x+'..'+(lx-1)));st=null;}
      if(id&&!st)st={id,x:lx};}}
  if(runs.length)out.push('EXACT PLAYER-PLACED BLOCKS ON THIS SITE ('+runs.length+' runs):\n'+runs.slice(0,70).join('\n')+(runs.length>70?'\n(+'+(runs.length-70)+' more runs)':''));
  return out.join('\n');
}
/* check a batch against the rules before the body tries it */
function bjValidate(a,j,res){
  const ops=[],rej=[];
  const ov=new Map();
  const at=(lx,ly,lz)=>{const k=lx+','+ly+','+lz;if(ov.has(k))return ov.get(k);const [x,y,z]=bjWorld(j,lx,ly,lz);return nb(x,y,z);};
  const inb=(p)=>p&&Number.isFinite(+p.x)&&Number.isFinite(+p.y)&&Number.isFinite(+p.z)&&p.x>=-12&&p.x<=11&&p.z>=-12&&p.z<=11&&p.y>=-8&&p.y<=34;
  const pend=agPending(j),used={};
  for(const r of (res.remove||[]).slice(0,80)){
    const p={x:Math.round(r.x),y:Math.round(r.y),z:Math.round(r.z)};
    if(!inb(p)){rej.push('remove '+p.x+','+p.y+','+p.z+': outside the site');continue;}
    const id=at(p.x,p.y,p.z);
    if(id===B.AIR||id===-1){rej.push('remove '+p.x+','+p.y+','+p.z+': already air');continue;}
    if(DEFS[id].hard<0||DEFS[id].cr){rej.push('remove '+p.x+','+p.y+','+p.z+': '+DEFS[id].name+' cannot be broken');continue;}
    /* other people's blocks only come down in a grief job (and only while griefing is allowed) */
    if(!ov.has(p.x+','+p.y+','+p.z)){const [wx,wy,wz]=bjWorld(j,p.x,p.y,p.z);
      if(nTheirs(a,wx,wy,wz)&&(j.mode!=='grief'||!GR.botGrief)){const o=OWN_NAMES[BOWN.get(bkey(wx,wy,wz))];
        rej.push('remove '+p.x+','+p.y+','+p.z+': that is '+o+'\'s '+DEFS[id].name+(j.mode==='grief'?' and griefing is switched off':' - only a grief job breaks other people\'s blocks'));continue;}}
    ov.set(p.x+','+p.y+','+p.z,B.AIR);ops.push({k:'rm',lx:p.x,ly:p.y,lz:p.z});
  }
  for(const r of (res.place||[]).slice(0,70)){
    const p={x:Math.round(r.x),y:Math.round(r.y),z:Math.round(r.z)};
    const nm=r.block||r.b;
    if(!inb(p)){rej.push('place '+nm+' at '+p.x+','+p.y+','+p.z+': outside the site');continue;}
    const id=agVariant(a,bpalId(nm));
    if(id==null){rej.push('place '+nm+': not a block you can use');continue;}
    const cur=at(p.x,p.y,p.z);
    const liquid=id===B.WATER||id===B.LAVA;
    if(!(cur===B.AIR||(DEFS[cur]&&DEFS[cur].replace)||cur===B.WATER)){rej.push('place '+nm+' at '+p.x+','+p.y+','+p.z+': occupied by '+(DEFS[cur]?DEFS[cur].name:'?'));continue;}
    let sup=false;
    for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
      const n=at(p.x+dx,p.y+dy,p.z+dz);
      if(n!==B.AIR&&n!==B.WATER&&n!==B.LAVA&&n!==-1&&DEFS[n]&&!DEFS[n].replace&&!isTorch(n)){sup=true;break;}}
    if(!sup){rej.push('place '+nm+' at '+p.x+','+p.y+','+p.z+': floating, nothing next to it to place against');continue;}
    if(id===IT.DOOR){const dn=at(p.x,p.y-1,p.z),up=at(p.x,p.y+1,p.z);
      if(!(DEFS[dn]&&DEFS[dn].solid!==false)||!(up===B.AIR||DEFS[up]&&DEFS[up].replace)){rej.push('Wood Door at '+p.x+','+p.y+','+p.z+': needs a solid block below and a free block above');continue;}
      ov.set(p.x+','+(p.y+1)+','+p.z,doorId(0,1,0));}
    if(id===B.TORCH&&!(DEFS[at(p.x,p.y-1,p.z)]&&DEFS[at(p.x,p.y-1,p.z)].solid!==false)){
      let w=false;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=at(p.x+dx,p.y,p.z+dz);if(DEFS[n]&&DEFS[n].solid!==false){w=true;break;}}
      if(!w){rej.push('Torch at '+p.x+','+p.y+','+p.z+': needs a floor or wall');continue;}}
    /* every block costs one real item: budget the whole batch against what is carried */
    const key=agPlaceItem(id);
    const have=id===B.WATER?(agHas(a,IT.BUCKET_W)>0?Infinity:0):Math.max(0,agHas(a,key)-(pend[key]||0));
    if((used[key]||0)>=have){rej.push('place '+nm+' at '+p.x+','+p.y+','+p.z+': you only have '+have+' '+agBlockName(key));
      if(id===IT.DOOR)ov.delete(p.x+','+(p.y+1)+','+p.z);continue;}
    used[key]=(used[key]||0)+1;
    ov.set(p.x+','+p.y+','+p.z,id===IT.DOOR?doorId(0,0,0):id);
    ops.push({k:'pl',lx:p.x,ly:p.y,lz:p.z,id,liquid});
  }
  for(const r of (res.ignite||[]).slice(0,6)){
    const p={x:Math.round(r.x),y:Math.round(r.y),z:Math.round(r.z)};
    if(!inb(p))continue;
    if(at(p.x,p.y,p.z)!==B.TNT){rej.push('ignite '+p.x+','+p.y+','+p.z+': no TNT there');continue;}
    ops.push({k:'ig',lx:p.x,ly:p.y,lz:p.z});
  }
  return {ops,rej,ov};
}
/* a BuildJob for agent a; mode 'build' | 'grief' */
/* ground under a site: the highest solid block that isn't part of a tree */
function bjGroundY(x,z){
  x=Math.floor(x);z=Math.floor(z);
  if(!chunkAt(x,z))return DIM==='puppet'?mpSurf(x,z):colInfo(x,z).h;
  for(let y=WH-1;y>0;y--){const id=getBlock(x,y,z);
    if(id===B.AIR||!DEFS[id]||DEFS[id].solid===false||isLeafId(id)||isLogId(id))continue;
    return y;}
  return 0;
}
function bjOpName(op){return op.k==='pl'?'place '+(op.id===IT.DOOR?'Door':DEFS[op.id]?DEFS[op.id].name:'?'):op.k==='rm'?'remove':'ignite';}
/* is the top of this column water? and a nearby mostly-dry spot for 'build here' in the sea */
function bjWet(x,z){if(!chunkAt(x,z))return colInfo(x,z).h<SEA;for(let y=WH-1;y>0;y--){const id=getBlock(x,y,z);if(id===B.AIR)continue;return id===B.WATER||id===B.ICE;}return true;}
function bjWetFrac(x,z){let w=0,n=0;for(let dx=-3;dx<=3;dx+=2)for(let dz=-3;dz<=3;dz+=2){n++;if(bjWet(Math.floor(x+dx),Math.floor(z+dz)))w++;}return w/n;}
function bjDrySpot(x,z){
  if(bjWetFrac(x,z)<=0.25)return null;
  for(let r=3;r<=27;r+=3)for(let k=0;k<12;k++){const an=k/12*Math.PI*2,cx=x+Math.sin(an)*r,cz=z+Math.cos(an)*r;
    if(chunkAt(Math.floor(cx),Math.floor(cz))&&bjWetFrac(cx,cz)<=0.15)return {x:cx,z:cz};}
  return null;
}
function bjRej(j,m){j.rej.push(m);(j.rejLog=j.rejLog||[]).push(m);if(j.rejLog.length>80)j.rejLog.shift();}
function bjNew(a,mode,goal,cx,cz,target){
  const gy=bjGroundY(cx,cz);
  return {mode,goal:(goal||'').slice(0,300),cx:Math.floor(cx),cz:Math.floor(cz),gy,target:target||null,
    ops:[],turn:0,thoughts:[],rej:[],inflight:false,done:false,placed:0,removed:0,want:false,
    maxTurns:mode==='grief'?8:14,t0:AG_T,nav:{},idle:0,batch:0,offline:false};
}
function bjOverlay(j){
  const ov=new Map();
  for(const op of j.ops){const k=op.lx+','+op.ly+','+op.lz;
    if(op.k==='rm')ov.set(k,B.AIR);else if(op.k==='pl')ov.set(k,op.id===IT.DOOR?doorId(0,0,0):op.id);}
  return ov;
}
function bjRequest(a,j){
  if(j.inflight||j.done)return;
  if(j.turn>=j.maxTurns){j.done=true;return;}
  j.inflight=true;j.turn++;
  const view=bjView(j,bjOverlay(j));
  const payload={goal:j.goal,mode:j.mode,turn:j.turn,maxTurns:j.maxTurns,view,
    palette:agPalette(a,j),rejected:j.rej.filter(r=>!/already air/.test(r)).concat(j.rej.filter(r=>/already air/.test(r))).slice(0,24),notes:j.thoughts.slice(-6),
    target:j.target,pending:j.ops.length,
    site:'site centre is world '+j.cx+','+j.gy+','+j.cz+' (local 0,0,0); local x,z run -12..11 and y -6..30'};
  const rejSent=j.rej;j.rej=[];
  brainCall('build',a,payload).then(res=>{
    j.inflight=false;
    /* the brain was just busy: not a failure, ask again shortly */
    if(res&&!res.ok&&/busy|rate limited/.test(res.error||'')){j.turn--;j.rej=rejSent.concat(j.rej);j.retryT=AG_T+3+Math.random()*3;return;}
    if(!res||!res.ok||!res.out){j.fail=(j.fail||0)+1;if(j.fail>=3){j.offline=true;bjOffline(a,j);}return;}
    if(a.bjob!==j)return;
    const o=res.out;
    if(o.thought){j.thoughts.push(o.thought);agThink(a,'[build] '+o.thought);}
    const v=bjValidate(a,j,o);
    for(const m of v.rej)bjRej(j,m);
    for(const op of v.ops)j.ops.push(op);
    j.batch=j.ops.length;
    /* after the first "done", allow at most two fix-up turns for rejected blocks */
    if(o.done)j.saidDone=(j.saidDone||0)+1;
    if(o.done&&!v.ops.length&&(!v.rej.length||j.saidDone>2))j.done=true;
    else if(o.done&&(!v.rej.length||j.saidDone>2))j.wantDone=true;
  });
}
/* offline fallback builds so agents still do things without a brain - only from what they carry */
const AG_WALL_PREF={
  brad:[B.COBBLE,B.STONE,B.STONEBRICK,B.BRICK,B.NBRICK,B.SANDSTONE,B.DIRT,B.NETHROCK,B.PLANK_O,B.PLANK_S,B.PLANK_B,B.LOG_O,B.LOG_S,B.LOG_B],
  bee:[B.PLANK_B,B.PLANK_O,B.PLANK_S,B.LOG_B,B.LOG_O,B.LOG_S,B.BRICK,B.STONEBRICK,B.COBBLE,B.SANDSTONE,B.STONE,B.DIRT,B.NETHROCK],
  creep:[B.DIRT,B.COBBLE,B.NETHROCK,B.STONE,B.PLANK_O,B.PLANK_B,B.PLANK_S,B.SANDSTONE,B.LOG_O,B.LOG_B,B.LOG_S,B.STONEBRICK,B.BRICK]};
const AG_SHELTERS=[{r:2,h:3},{r:2,h:2},{r:1,h:2}];   /* 5x5x3 house, 5x5x2 hut, 3x3x2 emergency dirt hut */
function bjShelterCost(t){const sd=2*t.r+1,ring=sd*sd-(sd-2)*(sd-2);return ring*t.h-2+sd*sd;}
/* what an autopilot shelter may be built from - minus what the next tools need (a player keeps 3 cobblestone
   for the stone pickaxe and a log for its sticks/planks rather than walling them in) */
function bjWallMats(a,j){
  const pend=agPending(j),m=[];let tot=0;
  const keep={};
  if(agToolLevel(a,'pick')<1){keep[B.COBBLE]=3;
    let lg=0;for(const i of GROUPS.logs)lg+=agHas(a,i);
    if(lg)for(const i of GROUPS.logs){if(agHas(a,i)){keep[i]=1;break;}}
    else for(const i of GROUPS.planks){if(agHas(a,i)){keep[i]=Math.min(agHas(a,i),2);break;}}}
  for(const id of AG_WALL_PREF[AG_DEF[a.name].short]||AG_WALL_PREF.creep){const n=Math.max(0,agHas(a,id)-(pend[id]||0)-(keep[id]||0));if(n){m.push([id,n]);tot+=n;}}
  return {m,tot};
}
/* the biggest simple shelter the agent's own blocks can pay for (null = not even a dirt hut) */
function bjShelterOps(a,j){
  const {m,tot}=bjWallMats(a,j);
  const t=AG_SHELTERS.find(q=>bjShelterCost(q)<=tot);
  if(!t)return {need:bjShelterCost(AG_SHELTERS[AG_SHELTERS.length-1]),have:tot};
  const sh=AG_DEF[a.name].short,R=t.r,ops=[];
  let mi=0;
  const take=()=>{while(mi<m.length&&m[mi][1]<=0)mi++;if(mi>=m.length)return null;m[mi][1]--;return m[mi][0];};
  let glass=sh==='brad'?0:Math.min(4,agHas(a,B.GLASS));
  for(let ly=1;ly<=t.h;ly++)for(let lx=-R;lx<=R;lx++)for(let lz=-R;lz<=R;lz++){
    if(Math.abs(lx)!==R&&Math.abs(lz)!==R)continue;
    if(lx===0&&lz===R&&ly<=2)continue;                      /* the doorway */
    let id=null;
    if(glass>0&&R>=2&&ly===2&&(lx===0||lz===0)){id=B.GLASS;glass--;}
    else id=take();
    if(id==null)break;
    ops.push({k:'pl',lx,ly,lz,id});
  }
  const roof=[];for(let lx=-R;lx<=R;lx++)for(let lz=-R;lz<=R;lz++)roof.push([lx,lz]);
  roof.sort((p,q)=>Math.max(Math.abs(q[0]),Math.abs(q[1]))-Math.max(Math.abs(p[0]),Math.abs(p[1])));
  for(const [lx,lz] of roof){const id=take();if(id==null)break;ops.push({k:'pl',lx,ly:t.h+1,lz,id});}
  if(agHas(a,IT.DOOR)>0)ops.push({k:'pl',lx:0,ly:1,lz:R,id:IT.DOOR});
  if(R>=2&&agHas(a,B.TORCH)>0)ops.push({k:'pl',lx:-1,ly:1,lz:-1,id:B.TORCH});
  if(sh==='bee'){const fl=[];for(const st of a.inv)if(st&&FLOWER_IDS.has(st.id))for(let i=0;i<st.count;i++)fl.push(st.id);
    for(const [lx,lz] of [[-R-1,R+1],[R+1,R+1],[-R-1,-R-1],[R+1,-R-1],[-1,R+1],[1,R+1]]){const f=fl.shift();if(f==null)break;ops.push({k:'pl',lx,ly:1,lz,id:f});}}
  return {ops,t};
}
function bjOffline(a,j){
  let ops=[];
  if(j.mode==='grief'){
    const cand=[];
    for(let lx=-10;lx<=10;lx++)for(let lz=-10;lz<=10;lz++)for(let ly=-1;ly<=12;ly++){
      const [x,y,z]=bjWorld(j,lx,ly,lz);if(BOWN.has(bkey(x,y,z))&&OWN_NAMES[BOWN.get(bkey(x,y,z))]!==a.name)cand.push([lx,ly,lz]);}
    cand.sort(()=>Math.random()-0.5);
    for(const c of cand.slice(0,24))ops.push({k:'rm',lx:c[0],ly:c[1],lz:c[2]});
  }else{
    const sh=bjShelterOps(a,j);
    if(sh.ops){ops=sh.ops;j.goal=(j.goal||'shelter')+' ('+(2*sh.t.r+1)+'x'+(2*sh.t.r+1)+' shelter from what you carry)';}
    else{j.failMsg='not enough blocks for even a tiny 3x3 hut (need '+sh.need+', you have '+sh.have+') - gather dirt, cobblestone or wood first';
      agEvent(a,'You wanted to build but you only have '+sh.have+' building blocks - gather more first',4);}
  }
  j.ops=ops;j.batch=ops.length;j.done=true;j.turn=j.maxTurns;
}
/* run the job for a frame */
function bjTick(a,dt,j){
  const e=a.e;
  if(!j.offline&&!j.done&&!j.inflight&&!(j.retryT>AG_T)&&(j.ops.length===0||j.ops.length<=Math.max(2,Math.floor(j.batch*0.3)))){
    if(!BRAIN.ok){j.offline=true;bjOffline(a,j);}
    else if(j.wantDone){if(j.ops.length===0)j.done=true;}
    else bjRequest(a,j);
  }
  if(!j.ops.length){
    a.ctl.mx=a.ctl.mz=0;
    if(j.done)return j.failMsg&&!j.placed?'fail:'+j.failMsg:'done';
    a.look={x:j.cx+0.5,y:j.gy+2,z:j.cz+0.5,t:AG_T+0.5};
    j.idle+=dt;if(j.idle>60)return 'fail:the plan never came';
    return 'run';
  }
  j.idle=0;
  const op=j.ops[0];
  const [x,y,z]=bjWorld(j,op.lx,op.ly,op.lz);
  if(!chunkAt(x,z)){j.ops.shift();return 'run';}
  const cur=getBlock(x,y,z);
  if(op.k==='pl'){
    const want=op.id===IT.DOOR?null:op.id;
    if(want!=null&&cur===want){j.ops.shift();return 'run';}
    if(op.id===IT.DOOR&&DEFS[cur]&&DEFS[cur].door){j.ops.shift();return 'run';}
  }else if(op.k==='rm'){
    if(cur===B.AIR||(cur===B.WATER&&!op.water)){j.ops.shift();j.removed++;return 'run';}
  }else if(op.k==='ig'){
    if(cur!==B.TNT){j.ops.shift();return 'run';}
  }
  const inCell=op.k==='pl'&&!op.liquid&&DEFS[op.id]&&DEFS[op.id].solid!==false&&
    Math.abs(x+0.5-e.x)<0.85&&Math.abs(z+0.5-e.z)<0.85&&y>=Math.floor(e.y)-0&&y<=Math.floor(e.y+1.75);
  if(inCell){
    /* standing where the block goes: step out of the way first */
    let vx=e.x-(x+0.5),vz=e.z-(z+0.5);const l=Math.hypot(vx,vz);
    if(l<0.05){const ang=(op.lx*7+op.lz*13)%6.28;vx=Math.sin(ang);vz=Math.cos(ang);}else{vx/=l;vz/=l;}
    a.ctl.mx=vx;a.ctl.mz=vz;a.ctl.spd=1;a.ctl.sneak=false;
    if(e.wall&&e.onGround)a.ctl.jump=true;
    op.away=(op.away||0)+dt;
    if(op.away>3){j.ops.shift();bjRej(j,bjOpName(op)+' at '+op.lx+','+op.ly+','+op.lz+': you were standing in the way');}
    return 'run';
  }
  if(op.k==='rm'&&nTheirs(a,x,y,z)&&(j.mode!=='grief'||!GR.botGrief)){
    j.ops.shift();bjRej(j,'remove '+op.lx+','+op.ly+','+op.lz+': that is '+OWN_NAMES[BOWN.get(bkey(x,y,z))]+'\'s block - only a grief job breaks other people\'s blocks');return 'run';}
  const canDo=op.k==='pl'?agCanPlaceAt(a,x,y,z):agCanTouch(a,x,y,z);
  if(!canDo){
    if(!op.mv)op.mv={};
    const near=agReach(a,x,y,z);
    /* walk to a spot it can actually be seen from (not just near it) */
    if(op.vant===undefined)op.vant=agVantage(a,x,y,z,op.k==='pl'?'place':'touch');
    const v=op.vant;
    const r=v?agMoveTo(a,dt,op.mv,v.x+0.5,v.z+0.5,0.3,v.y):agMoveTo(a,dt,op.mv,x+0.5,z+0.5,Math.max(0.6,2.2-(op.tries||0)*0.6),y-1);
    if(r==='done'&&!(op.k==='pl'?agCanPlaceAt(a,x,y,z):agCanTouch(a,x,y,z))){op.tries=(op.tries||0)+1;op.mv={};op.vant=undefined;
      if(op.tries>3){j.ops.shift();bjRej(j,bjOpName(op)+' at '+op.lx+','+op.ly+','+op.lz+': '+(near?'out of sight from everywhere you could stand (something is in the way - remove it first, or build up to it)':'could not get within reach'));}}
    if(r.startsWith('fail')){
      if(v&&!op.vfail){op.vfail=1;op.vant=null;op.mv={};return 'run';}   /* that spot was unreachable: try plain "near it" once */
      j.ops.shift();bjRej(j,bjOpName(op)+' at '+op.lx+','+op.ly+','+op.lz+': could not get there ('+r.slice(5)+')');op.mv={};}
    return 'run';
  }
  a.ctl.mx=a.ctl.mz=0;
  a.look={x:x+0.5,y:y+0.5,z:z+0.5,t:AG_T+0.4};
  if(op.k==='rm'){if(agBreaking(a,dt,x,y,z)){j.ops.shift();j.removed++;}return 'run';}
  if(op.k==='ig'){
    setBlock(x,y,z,B.AIR);primeTNT(x,y,z,1.7,a.name);playSAt('fuse',x,y,z);
    j.ops.shift();a.swing=1;
    agEvent(a,'You lit TNT at '+x+','+y+','+z,4);
    a.rx={k:'flee',a:{fromX:x,fromZ:z,dist:9},st:{},t:0};
    return 'run';
  }
  a.placeT=(a.placeT||0)+dt;
  const tempo=AG_DEF[a.name].tempo;
  if(a.placeT<1/tempo)return 'run';
  a.placeT=-Math.random()*0.15;
  const r=agPlaceBlock(a,x,y,z,op.id===IT.DOOR?IT.DOOR:op.id);
  if(r===''){j.ops.shift();j.placed++;return 'run';}
  if(r==='none in inventory'){
    /* out of this material: every queued block of it is off, and the agent knows why */
    const key=agPlaceItem(op.id),nm=agBlockName(key===IT.BUCKET_L?IT.BUCKET_L:key);
    /* autopilot shelters: carry on with another wall block you still have (a player would) */
    const prefs=AG_WALL_PREF[AG_DEF[a.name].short]||AG_WALL_PREF.creep;
    if(j.offline&&j.mode==='build'&&prefs.includes(key)){
      const pend=agPending(j);
      const sub=prefs.find(id=>id!==key&&agHas(a,id)-(pend[id]||0)>0);
      if(sub!=null){for(const o of j.ops)if(o.k==='pl'&&o.id===key)o.id=sub;return 'run';}
    }
    const gone=j.ops.filter(o=>o.k==='pl'&&agPlaceItem(o.id)===key);
    j.ops=j.ops.filter(o=>!(o.k==='pl'&&agPlaceItem(o.id)===key));
    for(const o of gone)bjRej(j,bjOpName(o)+' at '+o.lx+','+o.ly+','+o.lz+': you ran out of '+nm);
    j.outOf=j.outOf||{};
    if(!j.outOf[key]){j.outOf[key]=1;agEvent(a,'You ran out of '+nm+' while building - gather more',5);a.outOf={name:nm,t:AG_T};}
    return 'run';
  }
  if(r.includes(a.name+' is standing')){a.ctl.mx=e.x-(x+0.5);a.ctl.mz=e.z-(z+0.5);const l=Math.hypot(a.ctl.mx,a.ctl.mz)||1;a.ctl.mx/=l;a.ctl.mz/=l;a.ctl.spd=1;return 'run';}
  if(/standing there|in the way/.test(r)&&!(op.wait>6)){op.wait=(op.wait||0)+1;a.placeT=-0.6;j.ops.push(j.ops.shift());return 'run';}
  if(r.startsWith('floating')&&!(op.defer>2)){op.defer=(op.defer||0)+1;j.ops.push(j.ops.shift());return 'run';}
  j.ops.shift();
  bjRej(j,bjOpName(op)+' at '+op.lx+','+op.ly+','+op.lz+': '+r);
  return 'run';
}
function bjCleanup(a,dt,s){
  const sc=a.scaff||[];
  const e=a.e;
  for(let i=sc.length-1;i>=0;i--){
    const [x,y,z,id]=sc[i];
    if(getBlock(x,y,z)!==(id==null?B.DIRT:id)){sc.splice(i,1);continue;}
    if(Math.floor(e.x)===x&&Math.floor(e.z)===z&&Math.floor(e.y)-1===y){
      if(agBreaking(a,dt,x,y,z))sc.splice(i,1);
      return 'run';
    }
  }
  a.scaff=[];
  return 'done';
}
SK.build=(a,dt,s)=>{
  if(!s.st.j){
    let p=agResolve(a,s.a.target||'here');
    if(!p)p={x:a.x,z:a.z};
    if((!s.a.target||(''+s.a.target).toLowerCase()==='here')&&a.e){
      const fy=a.e.yaw;p={x:a.x-Math.sin(fy)*7,z:a.z-Math.cos(fy)*7};
    }
    if(!s.a.target||(''+s.a.target).toLowerCase()==='here'){const dry=bjDrySpot(p.x,p.z);if(dry)p=dry;
      /* swimming in open sea: "here" would be the sea floor, every block out of reach - say so instead of trying for minutes */
      else if(bjWetFrac(p.x,p.z)>0.5&&bjGroundY(p.x,p.z)<SEA-3)return 'fail:you are out on deep water - no dry land nearby to build on (get to land first)';}
    s.st.j=bjNew(a,'build',s.a.note||s.a.item||'build something',p.x,p.z,null);
    a.bjob=s.st.j;
    if(!a.base)a.base={x:Math.floor(p.x),z:Math.floor(p.z)};
  }
  const j=s.st.j;
  if(s.st.clean)return bjCleanup(a,dt,s);
  const r=bjTick(a,dt,j);
  if(r==='done'){
    agEvent(a,'Finished building ('+j.goal.slice(0,80)+'): '+j.placed+' blocks placed, '+j.removed+' removed',4);
    a.bjob=null;s.st.clean=true;return 'run';
  }
  if(r.startsWith('fail'))a.bjob=null;
  return r;
};
SK.grief=(a,dt,s)=>{
  if(!GR.botGrief)return 'fail:griefing is switched off on this server';
  if(!s.st.j){
    const who=s.a.target;
    let base=null,p=null;
    const o=(''+(who||'')).toLowerCase();
    const name=o==='dan'?'Dan':(agByName(o)||{}).name;
    if(name)base=mainBase(name);
    if(base)p={x:base.x,z:base.z};else p=agResolve(a,who);
    if(!p)return 'fail:cannot find anything of '+(who||'theirs')+' to grief';
    s.st.j=bjNew(a,'grief',s.a.note||'grief it',p.x,p.z,name||who);
    a.bjob=s.st.j;
  }
  const j=s.st.j;
  const r=bjTick(a,dt,j);
  if(r==='done'){agEvent(a,'You griefed '+(j.target||'that build')+': '+j.removed+' blocks broken, '+j.placed+' placed',6,j.target);a.bjob=null;}
  if(r.startsWith('fail'))a.bjob=null;
  return r;
};
SK.tnt=(a,dt,s)=>{
  /* lit (maybe its last one): run for it - checked before "no TNT left", or lighting your last stick fails and you stand there */
  if(s.st.lit){a.rx={k:'flee',a:{fromX:s.st.lit[0],fromZ:s.st.lit[2],dist:10},st:{},t:0};return 'done';}
  if(!GR.botGrief)return 'fail:griefing is switched off on this server';
  if(agHas(a,B.TNT)<1)return 'fail:you have no TNT';
  if(!s.st.p){
    const o=(''+(s.a.target||'')).toLowerCase();
    const name=o==='dan'?'Dan':(agByName(o)||{}).name;
    const base=name?mainBase(name):null;
    const p=base?{x:base.x,z:base.z}:agResolve(a,s.a.target);
    if(!p)return 'fail:cannot find '+(s.a.target||'a target');
    s.st.p=p;s.st.mv={};s.st.who=name;
  }
  const p=s.st.p;
  const e=a.e;
  /* close enough = within 4.5 m, or the walker's "as close as it gets" (kept on the move state: a reflex that
     drags the bot away resets it, so it never lights up wherever the fight left it) */
  const mv=s.st.mv||(s.st.mv={});
  if(!mv.arr&&Math.hypot(p.x-e.x,p.z-e.z)>4.5){const r=agMoveTo(a,dt,mv,p.x,p.z,3.5,null);
    if(r!=='done')return r.startsWith('fail')?r:'run';
    mv.arr=true;}
  const tx=Math.floor(e.x-Math.sin(e.yaw)*1.6),tz=Math.floor(e.z-Math.cos(e.yaw)*1.6);
  let ty=Math.floor(e.y);
  for(let k=0;k<3&&(getBlock(tx,ty,tz)!==B.AIR);k++)ty++;
  const r=agPlaceBlock(a,tx,ty,tz,B.TNT);
  if(r!==''){s.st.tries=(s.st.tries||0)+1;e.yaw+=1.3;if(s.st.tries>6)return 'fail:'+r;return 'run';}
  setBlock(tx,ty,tz,B.AIR);primeTNT(tx,ty,tz,1.9,a.name);playSAt('fuse',tx,ty,tz);
  s.st.lit=[tx,ty,tz];
  agEvent(a,'You lit TNT next to '+(s.st.who?s.st.who+"'s base":'the target'),5,s.st.who);
  return 'run';
};
/* steal: open someone's chest and empty the good stuff */
SK.steal=(a,dt,s)=>{
  if(!GR.botGrief)return 'fail:stealing is switched off on this server';
  if(!s.st.chest){
    const o=(''+(s.a.target||'')).toLowerCase();
    const name=o==='dan'?'Dan':(agByName(o)||{}).name;
    let best=null,bd=1e9;
    for(const [k,be] of blockEnts){
      if(be.t!=='chest'||keyDim(k)!==DIM)continue;
      const p=keyCore(k).split(',').map(Number);
      const own=BOWN.has(k)?OWN_NAMES[BOWN.get(k)]:null;
      if(own===a.name)continue;
      if(name&&own!==name)continue;
      if(!be.inv.some(st=>st))continue;
      const d=Math.hypot(p[0]-a.x,p[2]-a.z);
      if(d<bd&&d<160){bd=d;best={x:p[0],y:p[1],z:p[2],own};}
    }
    if(!best)return 'fail:no chest of '+(s.a.target||'anyone')+' with anything in it nearby';
    s.st.chest=best;s.st.mv={};
  }
  const c=s.st.chest;
  const ap=agApproach(a,dt,s.st,c.x,c.y,c.z,{what:'the chest',grief:true});
  if(ap!=='ok')return ap;
  a.ctl.mx=a.ctl.mz=0;a.look={x:c.x+0.5,y:c.y+0.5,z:c.z+0.5,t:AG_T+0.5};
  if((s.st.wt=(s.st.wt||0)+dt)<1.2)return 'run';
  const be=blockEnts.get(bkey(c.x,c.y,c.z));
  if(!be||be.t!=='chest')return 'fail:the chest is gone';
  const took=[];
  /* the good stuff first, junk blocks only if there is still room */
  const order=[];for(let i=0;i<be.inv.length;i++)if(be.inv[i]&&(DIM!=='puppet'||purgStealable(be.inv[i])))order.push(i);
  order.sort((p,q)=>(AG_JUNK.includes(be.inv[p].id)?1:0)-(AG_JUNK.includes(be.inv[q].id)?1:0));
  for(const i of order){const st=be.inv[i];
    const left=agGive(a,st,'steal');if(st.count-left>0)took.push((st.count-left)+' '+DEFS[st.id].name);
    if(left>0)be.inv[i].count=left;else be.inv[i]=null;}
  if(MODAL.bek===bkey(c.x,c.y,c.z))redrawModal();
  if(!took.length)return 'fail:nothing worth taking';
  agEvent(a,'You stole from '+(c.own?c.own+"'s":'a')+' chest: '+took.slice(0,5).join(', '),5,c.own);
  if(c.own)agOnStolen(c.own,a.name,took);
  agAutoEquip(a);
  return 'done';
};
