/* photo_rig.js (WP0): browser-only showcase contact sheet (5 x 6 tiles) for OG / Hyperreal review.
   Load it into the running game page (same origin as the repo root (node scripts/serve.mjs)), then call it:
     (0,eval)(await (await fetch('/tools/qa/texpacks/photo_rig.js')).text());
     const r=await photoRig({tods:[0.25], label:'OG'});          // r = {shots:[...], url, w, h, skipped:[...]}
   Options: start (default true: new creative world, seed 1337), sites (names, default all), tods (times of day,
   every site is shot once per tod), settle (frames per pose, default 90), tw/th (tile size, 384x216),
   show (default true: full-window overlay of the sheet; click it to close), label (default: the pack name).
   Sites: plains, forest, beach, desert, snow, mountain, village, cave (a dug room with torches), lava (a dug pool),
   arena (Malgorath, seen from ~30 m so the fight never starts), mobs (egg lineup, frozen), nether, aether.
   Frames are driven with __vox.frameStep (works while the pane is hidden); every tile is rendered with
   __vox.tpRenderOnce() and copied from the GL canvas in the same task. The sheet stays in window.__photoSheet.
   Run it once on OG and once per Hyperreal tier, ideally after a fresh page load each time (it builds and
   travels: it changes the world it runs in). */
(function(){
'use strict';
const ALL=['plains','forest','beach','desert','snow','mountain','village','cave','lava','arena','mobs','nether','aether'];
const BIOME={OCEAN:0,BEACH:1,PLAINS:2,FOREST:3,BIRCH:4,DESERT:5,SNOWY:6,MOUNTAIN:7};
window.photoRig=async function(o){
  o=Object.assign({start:true,sites:ALL,tods:[0.25],settle:90,tw:384,th:216,show:true,label:null},o||{});
  const V=window.__vox;if(!V)throw new Error('photoRig: no __vox (is this the game page?)');
  const {B}=V,gl=document.getElementById('gl');
  let T=Math.max(performance.now(),1e6)+1e5;
  const step=n=>{for(let i=0;i<n;i++){T+=40;V.frameStep(T);}};
  const yawTo=(dx,dz)=>Math.atan2(-dx,-dz);
  const pitchTo=(dy,d)=>Math.atan2(dy,Math.max(0.01,d));
  if(o.start){V.startNewWorld('photorig','1337','c');step(20);}
  const P0=V.P;if(!P0)throw new Error('photoRig: no world running');
  V.GR.dayCycle=false;V.GR.mobSpawn=false;V.GR.snail=false;V.GR.jsc=0;
  const sp={x:Math.floor(P0.x),z:Math.floor(P0.z)};
  const label=o.label||(V.getTP?(V.getTP().hr?'Hyperreal '+V.tpQ().n:'OG'):'OG');
  const cols=5,rows=6,sheet=document.createElement('canvas');sheet.width=cols*o.tw;sheet.height=rows*o.th;
  const g=sheet.getContext('2d');g.fillStyle='#111';g.fillRect(0,0,sheet.width,sheet.height);
  const shots=[],skipped=[];
  const pose=(x,y,z,yaw,pitch)=>{const P=V.P;P.mode='c';P.flying=true;P.x=x;P.y=y;P.z=z;P.yaw=yaw;P.pitch=pitch;P.vx=P.vy=P.vz=0;P.fallD=0;P.hp=20;};
  const settle=(x,y,z,yaw,pitch,n)=>{for(let i=0;i<(n||o.settle);i++){pose(x,y,z,yaw,pitch);step(1);}};
  const shoot=(name,x,y,z,yaw,pitch)=>{
    if(!V.getDim||V.getDim()==='over')V.forceChunksNear(x,z);
    settle(x,y,z,yaw,pitch);
    for(const tod of o.tods){
      if(shots.length>=cols*rows){skipped.push(name+'@'+tod+' (sheet full)');continue;}
      V.setTime(tod);settle(x,y,z,yaw,pitch,6);
      V.tpRenderOnce();
      const i=shots.length,cx=(i%cols)*o.tw,cy=Math.floor(i/cols)*o.th;
      g.drawImage(gl,0,0,gl.width,gl.height,cx,cy,o.tw,o.th);
      g.fillStyle='rgba(0,0,0,.55)';g.fillRect(cx,cy+o.th-20,o.tw,20);
      g.fillStyle='#fff';g.font='13px monospace';g.fillText(name+'  tod '+tod+'  ['+label+']',cx+6,cy+o.th-6);
      shots.push({name,tod,x:+x.toFixed(1),y:+y.toFixed(1),z:+z.toFixed(1)});}};
  /* biome finder: nearest column of a biome on a ring scan around spawn (terrain maths only, no chunks) */
  const findBiome=(want,minH)=>{for(let r=16;r<=1400;r+=24){const n=Math.max(8,Math.round(r/6));
    for(let k=0;k<n;k++){const a=k/n*6.2832,x=Math.round(sp.x+Math.sin(a)*r),z=Math.round(sp.z+Math.cos(a)*r);
      const c=V.colInfo(x,z);if(c.b===want&&(minH===undefined||c.h>=minH)){
        let ok=true;for(const [dx,dz] of [[8,0],[-8,0],[0,8],[0,-8]])if(V.colInfo(x+dx,z+dz).b!==want)ok=false;
        if(ok)return {x,z,h:c.h};}}}return null;};
  const overview=(name,s,dist,up)=>{const yaw=0.6,x=s.x+Math.sin(yaw)*dist,z=s.z+Math.cos(yaw)*dist,y=Math.max(s.h,30)+up;
    shoot(name,x,y,z,yawTo(s.x-x,s.z-z),pitchTo(s.h+2-y,dist));};
  /* the view direction with the most free air in front (for the dimension arrival points) */
  /* getBlock() reads a missing chunk as AIR, so a ray stops at the edge of the generated area */
  const loaded=(x,z)=>typeof ckey!=='function'||V.chunks.has(ckey(Math.floor(x/16),Math.floor(z/16)));
  const openYaw=(x,y,z)=>{let best=0,bd=-1;for(let k=0;k<16;k++){const a=k/16*6.2832,dx=-Math.sin(a),dz=-Math.cos(a);let d=0;
    for(;d<48;d+=0.5){const px=x+dx*d,pz=z+dz*d;if(!loaded(px,pz)||V.getBlock(Math.floor(px),Math.floor(y),Math.floor(pz))!==B.AIR)break;}if(d>bd){bd=d;best=a;}}return {a:best,d:bd};};
  /* arrival point of a dimension. wide=false: face the most open direction from the arrival spot (the Aether: open sky
     everywhere would defeat any sightline search). wide=true (the Nether: arrival caves are cramped and the OG fog is
     dense): search a +-32 block grid at several heights for the air spot (feet and head clear) with the longest
     sightline at eye height, and look along it. */
  const airAt=(x,y,z)=>loaded(x,z)&&V.getBlock(Math.floor(x),Math.floor(y),Math.floor(z))===B.AIR&&V.getBlock(Math.floor(x),Math.floor(y)+1,Math.floor(z))===B.AIR;
  const arrival=(name,pitch,wide)=>{const P=V.P,o0=openYaw(P.x,P.y+1.6,P.z),k0=Math.min(4,o0.d/3);   /* step a little into the open, off the portal */
    let best={x:P.x-Math.sin(o0.a)*k0,y:P.y+1.6,z:P.z-Math.cos(o0.a)*k0,a:o0.a,d:0};
    if(wide){for(const dx of [-24,0,24])for(const dz of [-24,0,24])V.forceChunksNear(P.x+dx,P.z+dz);   /* generate +-40 blocks first */
      best.d=-1;
      for(let gx=-32;gx<=32;gx+=8)for(let gz=-32;gz<=32;gz+=8)for(let y=Math.max(4,Math.floor(P.y)-12);y<=Math.min(74,Math.floor(P.y)+30);y+=3){
        const x=P.x+gx,z=P.z+gz;if(!airAt(x,y,z))continue;const o2=openYaw(x,y+1.62,z);if(o2.d>best.d)best={x,y,z,a:o2.a,d:o2.d};}}
    shoot(name,best.x,best.y,best.z,best.a,pitch);};
  const want=new Set(o.sites);
  const site={
    plains:()=>{const s=findBiome(BIOME.PLAINS);if(!s)return false;overview('plains',s,14,6);},
    forest:()=>{const s=findBiome(BIOME.FOREST);if(!s)return false;overview('forest',s,10,5);},
    beach:()=>{const s=findBiome(BIOME.BEACH);if(!s)return false;overview('beach+water',s,12,5);},
    desert:()=>{const s=findBiome(BIOME.DESERT);if(!s)return false;overview('desert',s,14,6);},
    snow:()=>{const s=findBiome(BIOME.SNOWY);if(!s)return false;overview('snow',s,14,6);},
    mountain:()=>{const s=findBiome(BIOME.MOUNTAIN);if(!s)return false;overview('mountain',s,30,4);},
    village:()=>{pose(sp.x+.5,80,sp.z+.5,0,0);const v=V.cmpFind('village');if(!v||!v.ok)return false;
      const h=V.colInfo(Math.floor(v.x),Math.floor(v.z)).h;overview('village',{x:v.x,z:v.z,h},18,9);},
    cave:()=>{const x0=sp.x+24,z0=sp.z+24,y0=14;pose(x0,90,z0,0,0);V.forceChunksNear(x0,z0);step(4);
      for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++)for(let dy=-1;dy<=5;dy++){
        const wall=Math.abs(dx)===5||Math.abs(dz)===5||dy===-1||dy===5;V.setBlock(x0+dx,y0+dy,z0+dz,wall?B.STONE:B.AIR);}
      for(const [dx,dz] of [[-3,-3],[3,-3],[-3,3],[3,3],[0,-4]])V.setBlock(x0+dx,y0,z0+dz,B.TORCH);
      V.setBlock(x0+1,y0,z0+1,B.COAL_ORE!==undefined?B.COAL_ORE:B.STONE);
      shoot('cave+torches',x0+.5,y0+2.2,z0+4.2,yawTo(0,-1),-0.28);},
    lava:()=>{const s=findBiome(BIOME.PLAINS)||{x:sp.x,z:sp.z};const x0=s.x+6,z0=s.z+6;pose(x0,90,z0,0,0);V.forceChunksNear(x0,z0);step(4);
      const h=V.surfaceTop(x0,z0);
      for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){for(let dy=1;dy<=4;dy++)V.setBlock(x0+dx,h+dy,z0+dz,B.AIR);
        const rim=Math.abs(dx)===3||Math.abs(dz)===3;V.setBlock(x0+dx,h,z0+dz,rim?B.STONE:B.LAVA);V.setBlock(x0+dx,h-1,z0+dz,B.STONE);}
      shoot('lava pool',x0+.5,h+5,z0+9.5,yawTo(0,-9),pitchTo(-5,9));},
    arena:()=>{const cx=1000.5,cz=1000.5,ay=V.demonAY(),x=cx-22,z=cz-22,y=ay+14;
      shoot('Malgorath arena',x,y,z,yawTo(cx-x,cz-z),pitchTo(ay+2-y,31));},
    mobs:()=>{const s=findBiome(BIOME.PLAINS)||{x:sp.x,z:sp.z};const x0=s.x,z0=s.z;pose(x0,90,z0,0,0);V.forceChunksNear(x0,z0);step(8);
      V.GR.freezeMobs=true;const L=['zombie','skel','boomer','spider','pig','cow','sheep','alien'],h=V.surfaceTop(x0,z0);
      for(let dx=-9;dx<=9;dx++)for(let dz=-3;dz<=9;dz++){V.setBlock(x0+dx,h,z0+dz,B.GRASS);for(let dy=1;dy<=5;dy++)V.setBlock(x0+dx,h+dy,z0+dz,B.AIR);}
      L.forEach((mt,i)=>{const x=x0-7+i*2;V.spawnMob(mt,x+.5,h+1,z0+.5);
        const e=V.entities[V.entities.length-1];if(e&&e.mt===mt)e.yaw=0;});
      shoot('mob lineup',x0+.5,h+2.6,z0+7.5,yawTo(0,-7),pitchTo(-1.6,7));},
    nether:()=>{V.travelNether();step(30);arrival('nether',-0.12,true);},
    aether:()=>{V.travelAether();step(30);arrival('aether',-0.2);},
  };
  for(const name of ALL){if(!want.has(name))continue;
    try{if(site[name]()===false)skipped.push(name+' (not found)');}catch(e){skipped.push(name+' ('+(e&&e.message||e)+')');console.warn('[photoRig]',name,e);}
    if((name==='nether'||name==='aether')&&V.getDim()!=='over')V.setDim('over',sp.x+.5,90,sp.z+.5);}
  V.GR.freezeMobs=false;
  const url=sheet.toDataURL('image/png');window.__photoSheet=url;window.__photoCanvas=sheet;window.__photoTile=[o.tw,o.th,cols];
  if(o.show){let ov=document.getElementById('photoRigOv');if(ov)ov.remove();ov=document.createElement('div');ov.id='photoRigOv';
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer';
    const im=new Image();im.src=url;im.style.cssText='max-width:100%;max-height:100%;image-rendering:auto';ov.appendChild(im);
    ov.onclick=()=>ov.remove();document.body.appendChild(ov);}
  return {shots,skipped,w:sheet.width,h:sheet.height,url:url.length+' chars in window.__photoSheet',label};
};
/* photoRig.view(i): one tile of the last sheet, full window (click to close); photoRig.view() = the whole sheet */
window.photoRig.view=function(i){const S=window.__photoCanvas;if(!S)return 'no sheet yet';const [tw,th,cols]=window.__photoTile;
  let ov=document.getElementById('photoRigOv');if(ov)ov.remove();ov=document.createElement('div');ov.id='photoRigOv';
  ov.style.cssText='position:fixed;inset:0;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer';
  const c=document.createElement('canvas');
  if(i===undefined){c.width=S.width;c.height=S.height;c.getContext('2d').drawImage(S,0,0);}
  else{c.width=tw;c.height=th;c.getContext('2d').drawImage(S,(i%cols)*tw,Math.floor(i/cols)*th,tw,th,0,0,tw,th);}
  c.style.cssText='width:100%;height:100%;object-fit:contain';ov.appendChild(c);ov.onclick=()=>ov.remove();document.body.appendChild(ov);return 'showing '+(i===undefined?'sheet':'tile '+i);};
})();
