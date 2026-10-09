/* PART 43 - FIGURINES & DISPLAYS */
let FIG_CHANCE=0.05;
IT.FIGURINE=279;
idef(IT.FIGURINE,{name:'Mob Figurine',icon:'i_fig',stack:1});
tile('i_fig',c=>{c.clearRect(0,0,16,16);
  c.fillStyle='#c2a86a';c.fillRect(3,12,10,2);c.fillRect(5,10,6,2);
  c.fillStyle='#8a8f96';c.fillRect(6,4,4,6);c.fillRect(5,2,6,3);});
B.SHELF=92;B.JAR=93;
def(B.SHELF,{name:'Display Shelf',tiles:{top:'shelf_t',side:'shelf_s',bot:'shelf_t'},hard:1.4,toolClass:'axe',interact:'disp'});
def(B.JAR,{name:'Display Jar',tiles:'jar',hard:0.3,opq:false,bucket:'cut',cullSame:true,interact:'disp'});
tile('shelf_t',(c,R)=>{fillN(c,R,'#9a6b39',.1);c.fillStyle='#7a4b23';c.fillRect(0,7,16,2);});
tile('shelf_s',(c,R)=>{fillN(c,R,'#8a5b2d',.1);c.fillStyle='#6a4218';c.fillRect(0,2,16,2);c.fillRect(0,12,16,2);
  c.fillStyle='#c2a86a';c.fillRect(2,5,12,6);});
tile('jar',(c,R)=>{c.clearRect(0,0,16,16);c.fillStyle='rgba(190,220,235,0.55)';c.fillRect(2,3,12,12);
  c.fillStyle='#8a8f96';c.fillRect(4,1,8,2);c.fillStyle='rgba(255,255,255,0.5)';c.fillRect(3,4,2,9);});
R(['PPP','P P','PPP'],{P:'planks'},B.SHELF,1);
R(['GPG','G G','GGG'],{G:B.GLASS,P:'planks'},B.JAR,2);
const DISPM=new Map();
function dispUse(x,y,z){
  const be=ensureBE(x,y,z,'disp');
  const st=heldStack();
  if(be.fig){
    const back={id:IT.FIGURINE,count:1,mob:be.fig};
    if(invAddTo(P.inv,back)>0)spawnDrop(x+0.5,y+1,z+0.5,back,0,1,0);
    be.fig=null;
    redrawHotbar();playS('pop');
    showToast('Figurine retrieved.');
  }else if(st&&st.id===IT.FIGURINE){
    be.fig=st.mob||{t:'pig'};
    P.inv[P.sel]=null;
    redrawHotbar();playS('place');
    showToast((MOBT[be.fig.t]?MOBT[be.fig.t].hp+'hp of ':'')+be.fig.t+' figurine displayed. Museum quality.');
  }else showToast('Holds one mob figurine (5% drop from any kill).');
  dispRefresh(x,y,z);
}
function dispRefresh(x,y,z){
  const k=bkey(x,y,z);
  const cur=DISPM.get(k);
  if(cur){scene.remove(cur);DISPM.delete(k);}
  const be=blockEnts.get(k);
  const bid=getBlock(x,y,z);
  if(!be||be.t!=='disp'||!be.fig||(bid!==B.SHELF&&bid!==B.JAR))return;
  if(!MOBT[be.fig.t])return;
  MGF_FIG=be.fig.t==='demon'?1:0;
  const {G}=makeMobMesh(be.fig.t);
  const s=bid===B.JAR?0.2:0.3;
  G.scale.set(s,s,s);
  G.position.set(x+0.5,y+(bid===B.JAR?0.1:1.0),z+0.5);
  scene.add(G);
  DISPM.set(k,G);
}
function tickDisp(dt){
  if(frameCount%45!==0)return;
  for(const [k,be] of blockEnts){
    if(be.t!=='disp')continue;
    const p2=dimP(k);
    if(!p2)continue;
    const x=+p2[0],y=+p2[1],z=+p2[2];
    const near=Math.hypot(x-P.x,z-P.z)<48;
    const has=DISPM.has(k);
    if(near&&be.fig&&!has&&chunkAt(x,z))dispRefresh(x,y,z);
    else if((!near||!be.fig)&&has)dispRefresh(x,y,z);
  }
  for(const [k,g] of DISPM)g.rotation.y+=0.35;
}

