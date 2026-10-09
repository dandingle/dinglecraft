/* pilot.js (P0): the speed-run pilot's honest primitives and its honesty ledger (the purgatory build plan section 9.1).
   const pilot=require('./pilot.js')(V,step);   // V = __vox, step = pg_boot stepper
   Primitives (each drives real input through frameStep; no teleport unless allowJump() says the route was validated):
     pilot.frame(n)            n frames with the ledger and the displacement check running
     pilot.walkTo(x,z,o)       steer with KEY.KeyW / Space / sprint and yaw; o.tol (m), o.max (s); returns true on arrival
     pilot.lookAt(x,y,z)       yaw/pitch (pitch positive is up)
     pilot.mine(x,y,z,o)       aim and hold MB.l until the real doMine breaks it (o.max s); returns true if the block is gone
     pilot.use(o)              one right-click edge (MB.r one frame down)
     pilot.select(id)          put a stack of id in the hand (hotbar first, else swaps from the backpack)
     pilot.craft(outId,kind)   inv: hands; pcan/plab/ptrans: aim at the nearest such station within reach + use, then piCraftSeam
     pilot.eat(id)             hold right-click with the food until hunger rises
     pilot.space(n)            Space held n frames (skips cutscenes; jumps)
     pilot.allowJump(why)      the next frame may move Dan anywhere (setDim, respawn, a validated --fast jump)
   Ledger: every frame P.inv is diffed. Each increase must be explained in the same frame by a vanished drop within 2.5 m
   (pickup), a pilot craft or furnace take (pilot.expect), or a new MPF.giveLog entry (Programme, boss loot, trunk takes,
   souvenirs). Anything else is a "free item" and fails the run. Decreases are always allowed (crafts, eating, placing, wear,
   Charges, ammo, customs). Displacement: a horizontal move > 0.35 m in one frame fails unless allowJump() was called, Dan
   was hurt this frame or last (knockback), or a purgatory cutscene is running. */
'use strict';
module.exports=function pilot(V,step){
  const P=()=>V.P,B=V.B,IT=V.IT;
  const S={frames:0,fails:[],log:[],expect:[],allow:0,lastPos:null,lastInv:null,lastGive:0,lastDrops:null,crafted:0,mined:0,walked:0};
  const invMap=inv=>{const m={};for(const s of inv)if(s)m[s.id]=(m[s.id]||0)+s.count;return m;};
  /* drops near Dan with the count they carried this frame (the engine's pickup empties e.st.count before removing the entity) */
  const dropsNear=()=>{const p=P(),o=[];for(const e of V.entities)if(e.t==='drop'&&!e.dead&&Math.hypot(e.x-p.x,e.y-(p.y+0.9),e.z-p.z)<3.2)o.push({e,id:e.st.id,n:e.st.count});return o;};
  function check(){const p=P();if(!p)return;
    const inv=invMap(p.inv),gl=V.getMPF().giveLog;if(gl.length<S.lastGive)S.lastGive=0;const newGive=gl.slice(S.lastGive);S.lastGive=gl.length;
    if(S.lastInv){const gone=(S.lastDrops||[]).filter(q=>q.e.dead||q.e.st.count<q.n).map(q=>({id:q.id,n:q.n-(q.e.dead?0:q.e.st.count)}));
      for(const id in inv){const inc=inv[id]-(S.lastInv[id]||0);if(inc<=0)continue;
        let left=inc;
        for(const g of newGive)if(String(g.id)===id&&left>0){left-=g.n;}
        for(const g of gone)if(String(g.id)===id&&left>0)left-=g.n;
        for(let i=S.expect.length-1;i>=0&&left>0;i--){const x=S.expect[i];if(String(x.id)===id){left-=x.n;S.expect.splice(i,1);}}
        if(left>0)S.fails.push('free item: '+(V.DEFS[id]?V.DEFS[id].name:id)+' x'+left+' at frame '+S.frames);}}
    S.lastInv=inv;S.lastDrops=dropsNear();S.expect=S.expect.filter(x=>S.frames-x.f<3);
    const pos=[p.x,p.z];
    if(S.lastPos&&!S.allow){const d=Math.hypot(pos[0]-S.lastPos[0],pos[1]-S.lastPos[1]);
      const cut=V.mpInfo().cut,hurt=p.hurtT>0.3;
      if(d>0.35&&!cut&&!hurt&&!p.dead)S.fails.push('jump of '+d.toFixed(2)+' m at frame '+S.frames+' (not a knockback or a throw)');}
    if(S.allow>0)S.allow--;S.lastPos=pos;}
  /* S.pre (optional, set by the caller): runs before every frame of every primitive, e.g. to announce a scripted move the game is about to make */
  function frame(n){for(let i=0;i<(n||1);i++){if(S.pre)S.pre();step(1);S.frames++;check();}}
  function allowJump(why,n){S.allow=Math.max(S.allow,n||2);S.log.push('jump: '+(why||'?')+' @'+S.frames);}
  function lookAt(x,y,z){const p=P(),dx=x-p.x,dy=y-(p.y+p.eyeY),dz=z-p.z;p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(dy,Math.hypot(dx,dz));}
  function walkTo(x,z,o){o=o||{};const tol=o.tol||1.2,max=(o.max||120)/0.04;const K=V.KEY;let stuck=0,last=null;
    for(let i=0;i<max;i++){const p=P();const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
      if(d<tol){K.KeyW=false;K.Space=false;V.P.sprint=false;return true;}
      p.yaw=Math.atan2(-dx,-dz);p.pitch=0;K.KeyW=true;p.sprint=d>6&&!o.walk;
      const moved=last?Math.hypot(p.x-last[0],p.z-last[1]):1;last=[p.x,p.z];stuck=moved<0.02?stuck+1:0;
      K.Space=stuck>3||(p.inWater&&!o.noSwim);
      frame(1);S.walked+=moved>0.5?0:moved;}
    V.KEY.KeyW=false;V.KEY.Space=false;return false;}
  /* a bot standing in the line of the swing would take the hit (and hit back): wait for it to move */
  /* a bot between the eye and the block takes the swing (and retaliates); one BEHIND the block does not (the ray stops at the block) */
  const botInRay=(x,y,z)=>{try{const C=V.pgCore(),E=C.eyePos(),L=C.lookDir(),dB=x==null?3.4:Math.min(3.4,Math.hypot(x+0.5-E[0],y+0.5-E[1],z+0.5-E[2])-0.45),m=V.pickMob(E[0],E[1],E[2],L[0],L[1],L[2],Math.max(0.05,dB));return !!(m&&m.e&&m.e.bot);}catch(e){return false;}};
  function mine(x,y,z,o){o=o||{};const max=(o.max||20)/0.04,id0=V.getBlock(x,y,z);if(!id0)return true;
    for(let i=0;i<max;i++){lookAt(x+0.5,y+0.5,z+0.5);if(botInRay(x,y,z)){V.MB.l=false;frame(1);continue;}V.MB.l=true;frame(1);if(V.getBlock(x,y,z)!==id0){V.MB.l=false;frame(2);S.mined++;return true;}}
    V.MB.l=false;frame(1);return false;}
  function use(){V.MB.r=true;frame(1);V.MB.r=false;frame(2);}
  function space(n){V.KEY.Space=true;frame(n||2);V.KEY.Space=false;frame(1);}
  function select(id){const p=P();let i=p.inv.findIndex(s=>s&&s.id===id);if(i<0)return false;
    if(i>8){const j=p.inv.slice(0,9).findIndex(s=>!s);const k=j>=0?j:p.sel;const t=p.inv[k];p.inv[k]=p.inv[i];p.inv[i]=t;i=k;}
    p.sel=i;V.refreshHand();frame(1);return true;}
  function emptyHand(){const p=P();const j=p.inv.slice(0,9).findIndex(s=>!s);if(j<0)return false;p.sel=j;V.refreshHand();frame(1);return true;}
  function expect(id,n){S.expect.push({id,n,f:S.frames});}
  function craft(outId,kind){if(typeof V.piCraftSeam!=='function')return false;
    if(kind&&kind!=='inv'){const want={pcan:B.PG_CAN,plab:B.PG_BENCH,ptrans:-1}[kind];const p=P();let best=null;
      if(want>0)for(let dx=-5;dx<=5;dx++)for(let dy=-2;dy<=3;dy++)for(let dz=-5;dz<=5;dz++){const x=Math.floor(p.x)+dx,y=Math.floor(p.y)+dy,z=Math.floor(p.z)+dz;
        if(V.getBlock(x,y,z)===want){const d=Math.hypot(dx,dy,dz);if(!best||d<best.d)best={x,y,z,d};}}
      if(want>0&&!best)return false;if(best){emptyHand();lookAt(best.x+0.5,best.y+0.5,best.z+0.5);}}
    const before=invMap(P().inv)[outId]||0;const r=V.piCraftSeam(outId,kind||'inv');
    const after=invMap(P().inv)[outId]||0;if(after>before)expect(outId,after-before);frame(1);if(r)S.crafted++;return !!r;}
  /* eat: look up first (a right-click on a block in reach would use the block instead of the food), hold until hunger rises */
  function eat(id){if(!select(id))return false;const h0=P().hunger,pt=P().pitch;P().pitch=1.35;for(let i=0;i<60&&P().hunger<=h0;i++){V.MB.r=true;frame(1);}V.MB.r=false;P().pitch=pt;frame(1);return P().hunger>h0;}
  function result(){return {frames:S.frames,seconds:+(S.frames*0.04).toFixed(2),fails:S.fails.slice(),log:S.log.slice(),crafted:S.crafted,mined:S.mined};}
  return {S,frame,allowJump,lookAt,walkTo,mine,use,space,select,emptyHand,craft,eat,expect,result};};
