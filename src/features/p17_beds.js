/* ===================================================================== */
/* PART 17 — beds & better nights  (v1.9.1)                              */
/* ===================================================================== */
B.BED=77;
def(B.BED,{name:'Bed',tiles:'bed_t',hard:0.8,solid:true,opq:false,bucket:'cut',
  bed:true,interact:'bed'});
tile('bed_t',c=>{c.fillStyle='#b02525';c.fillRect(0,0,16,16);
  c.fillStyle='#d04040';c.fillRect(0,1,16,2);c.fillRect(0,7,16,1);
  c.fillStyle='#f2f2f2';c.fillRect(1,10,14,5);
  c.fillStyle='#d9d9d9';c.fillRect(1,10,14,1);
  c.fillStyle='#8a1d1d';c.fillRect(0,0,16,1);});
tile('bed_s',c=>{c.fillStyle='#6b4a2c';c.fillRect(0,0,16,16);
  c.fillStyle='#b02525';c.fillRect(0,0,16,5);
  c.fillStyle='#8a1d1d';c.fillRect(0,5,16,1);
  c.fillStyle='#553a22';c.fillRect(0,12,16,4);
  c.fillStyle='#7d5634';c.fillRect(1,7,2,5);c.fillRect(13,7,2,5);});
R(['WWW','PPP'],{W:B.WOOL,P:'planks'},B.BED,1);

function addBed(b,x,y,z){
  const H=0.58;
  const T=tileUV(Tl.bed_t),S=tileUV(Tl.bed_s);
  const Q=(p0,p1,p2,p3,U,vScale)=>{
    const s=b.vc;
    const v1=U[1]+(U[3]-U[1])*(vScale||1);
    b.p.push(...p0,...p1,...p2,...p3);
    b.u.push(U[0],U[1], U[2],U[1], U[2],v1, U[0],v1);
    for(let i=0;i<4;i++){b.n.push(0,1,0);b.c.push(.95,.95,.95);}
    b.ix.push(s,s+1,s+2,s,s+2,s+3);
    b.vc+=4;
  };
  Q([x,y+H,z],[x+1,y+H,z],[x+1,y+H,z+1],[x,y+H,z+1],T,1);            /* top */
  Q([x,y+H,z],[x+1,y+H,z],[x+1,y,z],[x,y,z],S,H);                    /* -z side */
  Q([x+1,y+H,z+1],[x,y+H,z+1],[x,y,z+1],[x+1,y,z+1],S,H);            /* +z side */
  Q([x,y+H,z+1],[x,y+H,z],[x,y,z],[x,y,z+1],S,H);                    /* -x side */
  Q([x+1,y+H,z],[x+1,y+H,z+1],[x+1,y,z+1],[x+1,y,z],S,H);            /* +x side */
}
function doSleep(x,y,z){
  P.spawn=[x+0.5,y+1.3,z+0.5];
  if(!sunUp()){
    timeOfDay=Math.ceil(timeOfDay)+0.05;
    showToast('You sleep through the night. Respawn point set.');
    playS('sleep');
    if(P.hp<20){P.hp=Math.min(20,P.hp+2);drawStats();}
  }else{
    showToast('Respawn point set. You can only sleep at night.');
    playS('blip');
  }
}
const _playS10=playS;
playS=function(n){
  if(!soundOn)return;
  try{
    if(n==='sleep'){tone(420,210,0.5,'sine',0.14);tone(630,315,0.5,'sine',0.1);return;}
    _playS10(n);
  }catch(e){}
};


