/* ------------------------------ crafting ---------------------------- */
const GROUPS={planks:[B.PLANK_O,B.PLANK_B,B.PLANK_S],logs:[B.LOG_O,B.LOG_B,B.LOG_S]};
const RECIPES=[];
function R(pat,key,out,n){RECIPES.push({p:pat,k:key,o:out,n:n||1});}
function RS(ins,out,n){RECIPES.push({s:ins,o:out,n:n||1});}
RS([B.LOG_O],B.PLANK_O,4); RS([B.LOG_B],B.PLANK_B,4); RS([B.LOG_S],B.PLANK_S,4);
R(['P','P'],{P:'planks'},IT.STICK,4);
R(['PP','PP'],{P:'planks'},B.CRAFT,1);
R(['CCC','C C','CCC'],{C:B.COBBLE},B.FURNACE,1);
R(['PPP','P P','PPP'],{P:'planks'},B.CHEST,1);
R(['C','S'],{C:IT.COAL,S:IT.STICK},B.TORCH,4);
R(['GSG','SGS','GSG'],{G:IT.GUNPOWDER,S:B.SAND},B.TNT,1);
R([' #X','# X',' #X'],{'#':IT.STICK,X:IT.STRING},IT.BOW,1);
RS([B.GRAVEL,IT.STICK],IT.ARROW,4);
R(['XX','XX'],{X:IT.STRING},B.WOOL,1);
R(['dd','dd'],{d:B.SAND},B.SANDSTONE,1);
R(['bb','bb'],{b:IT.BRICKIT},B.BRICK,1);
R(['tt','tt'],{t:B.STONE},B.STONEBRICK,4);
const TOOL_MATS=['planks',B.COBBLE,IT.IRON,IT.DIAMOND,IT.GOLD];
for(let m=0;m<5;m++){const M=TOOL_MATS[m];
  R(['MMM',' S ',' S '],{M:M,S:IT.STICK},toolId(m,0),1);
  R(['MM','MS',' S'],{M:M,S:IT.STICK},toolId(m,1),1);
  R(['M','S','S'],{M:M,S:IT.STICK},toolId(m,2),1);
  R(['M','M','S'],{M:M,S:IT.STICK},toolId(m,3),1);
}
const SMELT={[B.IRON_ORE]:IT.IRON,[B.GOLD_ORE]:IT.GOLD,[B.SAND]:B.GLASS,
  [B.COBBLE]:B.STONE,[IT.CLAYBALL]:IT.BRICKIT,[IT.PORK]:IT.PORK_C,
  [IT.BEEF]:IT.STEAK,[B.LOG_O]:IT.COAL,[B.LOG_B]:IT.COAL,[B.LOG_S]:IT.COAL};
const FUELS={[IT.COAL]:80,[B.PLANK_O]:15,[B.PLANK_B]:15,[B.PLANK_S]:15,
  [B.LOG_O]:15,[B.LOG_B]:15,[B.LOG_S]:15,[IT.STICK]:5,[B.CRAFT]:15,[B.CHEST]:15,
  [toolId(0,0)]:10,[toolId(0,1)]:10,[toolId(0,2)]:10,[toolId(0,3)]:10};
const SMELT_TIME=10;

function ingMatch(req,id){
  if(req==null)return id===0;
  if(typeof req==='string')return GROUPS[req].includes(id);
  return req===id;
}
/* grid: array of stacks (len w*w), w = 2 or 3. Returns {id,count,dur?} or null */
function calcCraft(grid,w,list){
  const RL=list||RECIPES;
  const ids=grid.map(s=>s?s.id:0);
  // shapeless
  const present=ids.filter(i=>i!==0);
  outer: for(const r of RL){
    if(!r.s)continue;
    if(r.s.length!==present.length)continue;
    const pool=present.slice();
    for(const req of r.s){
      let found=-1;
      for(let i=0;i<pool.length;i++)if(ingMatch(req,pool[i])){found=i;break;}
      if(found<0)continue outer;
      pool.splice(found,1);
    }
    return mkResult(r);
  }
  // shaped: bounding box of nonzero cells
  let minx=9,maxx=-1,miny=9,maxy=-1;
  for(let y=0;y<w;y++)for(let x=0;x<w;x++)if(ids[y*w+x]){
    if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;}
  if(maxx<0)return null;
  const gw=maxx-minx+1,gh=maxy-miny+1;
  for(const r of RL){
    if(!r.p)continue;
    const ph=r.p.length,pw=r.p[0].length;
    if(pw!==gw||ph!==gh||pw>w||ph>w)continue;
    for(const mirror of [false,true]){
      let ok=true;
      for(let y=0;y<ph&&ok;y++)for(let x=0;x<pw&&ok;x++){
        const ch=r.p[y][mirror?pw-1-x:x];
        const req=ch===' '?null:r.k[ch];
        if(!ingMatch(req,ids[(miny+y)*w+(minx+x)]))ok=false;
      }
      if(ok)return mkResult(r);
    }
  }
  return null;
}
function mkResult(r){
  const d=DEFS[r.o],res={id:r.o,count:r.n};
  if(d.tool)res.dur=d.tool.dur; else if(d.dur)res.dur=d.dur;
  return res;
}
function takeCraft(grid){
  for(let i=0;i<grid.length;i++)if(grid[i]){
    grid[i].count--; if(grid[i].count<=0)grid[i]=null;
  }
}

/* ------------------------------ inventory --------------------------- */
function stackMax(id){return DEFS[id].stack||64;}
/* add stack to array; returns leftover count (mutates st.count) */
function invAddTo(arr,st){
  if(!st||st.count<=0)return 0;
  const max=stackMax(st.id);
  if(max>1&&st.dur==null){
    for(let i=0;i<arr.length&&st.count>0;i++){
      const s=arr[i];
      if(s&&s.id===st.id&&s.dur==null&&s.count<max){
        const mv=Math.min(max-s.count,st.count);s.count+=mv;st.count-=mv;
      }
    }
  }
  for(let i=0;i<arr.length&&st.count>0;i++){
    if(!arr[i]){const mv=Math.min(max,st.count);
      arr[i]={id:st.id,count:mv};if(st.dur!=null)arr[i].dur=st.dur;if(st.ench)arr[i].ench={...st.ench};
      if(st.mob)arr[i].mob=st.mob;st.count-=mv;}
  }
  return st.count;
}
function invCount(arr,id){let n=0;for(const s of arr)if(s&&s.id===id)n+=s.count;return n;}
function invConsume(arr,id,n){
  for(let i=0;i<arr.length&&n>0;i++){const s=arr[i];
    if(s&&s.id===id){const mv=Math.min(s.count,n);s.count-=mv;n-=mv;
      if(s.count<=0)arr[i]=null;}}
  return n===0;
}

/* break time in seconds for block id with held stack (or null) */
function breakTime(id,held){
  const d=DEFS[id]; if(!d||d.hard<0)return Infinity;
  if(d.hard===0)return 0.001;
  const t=held&&DEFS[held.id]&&DEFS[held.id].tool;
  let mult=1, can=!d.req;
  if(t&&d.toolClass&&t.type===d.toolClass){mult=t.mult;can=t.tier>=(d.tier||0);}
  if(held&&held.ench&&held.ench.eff&&t&&d.toolClass&&t.type===d.toolClass)
    mult*=1+held.ench.eff*0.4;
  return can? d.hard*1.5/mult : d.hard*5;
}
function canHarvest(id,held){
  const d=DEFS[id]; if(!d.req)return true;
  const t=held&&DEFS[held.id]&&DEFS[held.id].tool;
  return !!(t&&t.type===d.toolClass&&t.tier>=(d.tier||0));
}
function blockDrop(id){
  const d=DEFS[id];
  if(d.drop===null)return null;
  if(d.drop===undefined)return {id:id,count:1};
  if(typeof d.drop==='number')return {id:d.drop,count:1};
  return {id:d.drop.id,count:d.drop.count};
}

