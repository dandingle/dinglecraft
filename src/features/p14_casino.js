/* ===================================================================== */
/* PART 14 — P/L helpers + THE DINGLE CASINO  (v1.7)                     */
/* ===================================================================== */
function pcPL(sym){
  const sh=P.stox.sh[sym]||0;
  if(sh<=1e-9)return null;
  const val=sh*MKT.p[sym];
  const cb=(P.stox.cb&&P.stox.cb[sym])||val;
  return {pl:val-cb,pct:cb>1e-9?(val/cb-1)*100:0};
}
function renderMoney(){
  if(pcOpen)renderPC();
  if(casOpen)renderCas();
}

/* ----- the casino block ----- */
B.CASINO=67;
def(B.CASINO,{name:'Casino',tiles:{top:'cas_t',side:'cas_s',bot:'cas_t'},hard:2.5,toolClass:'pick',interact:'cas'});
tile('cas_t',c=>{c.fillStyle='#7d2f2f';c.fillRect(0,0,16,16);
  c.fillStyle='#b05050';c.fillRect(1,1,14,14);
  c.fillStyle='#ffe34d';c.fillRect(7,7,2,2);});
tile('cas_s',c=>{c.fillStyle='#7d2f2f';c.fillRect(0,0,16,16);
  c.fillStyle='#1a1d22';c.fillRect(2,3,12,7);
  c.fillStyle='#fff';c.fillRect(3,4,3,5);c.fillRect(7,4,3,5);c.fillRect(11,4,2,5);
  c.fillStyle='#b02525';c.fillRect(4,6,1,1);c.fillRect(8,6,1,1);
  c.fillStyle='#46e2cf';c.fillRect(11,6,2,1);
  c.fillStyle='#ffe34d';
  c.fillRect(1,1,1,1);c.fillRect(4,1,1,1);c.fillRect(7,1,1,1);c.fillRect(10,1,1,1);c.fillRect(13,1,1,1);
  c.fillRect(1,14,1,1);c.fillRect(4,14,1,1);c.fillRect(7,14,1,1);c.fillRect(10,14,1,1);c.fillRect(13,14,1,1);
  c.fillStyle='#3b3b42';c.fillRect(3,11,10,3);});
R(['GGG','GDG','GGG'],{G:IT.GOLD,D:IT.DIAMOND},B.CASINO,1);

/* ----- casino state ----- */
let casOpen=false,casTab='slots';
const SLOTSYM=['7','\u25c6','\ud83d\udc7d','\ud83d\udef8','\ud83c\udf52','\u2b50'];
let SLOTLAST={r:['?','?','?'],win:0,bet:0,msg:'Pull the lever!'};
const CASBJ={phase:'idle',ph:[],dh:[],bet:0,msg:'Place a bet.'};
function bjReset(){CASBJ.phase='idle';CASBJ.ph=[];CASBJ.dh=[];CASBJ.bet=0;CASBJ.msg='Place a bet.';}

/* slots: outcome resolved instantly, reels are showbiz */
function slotPay(r,bet){
  const [a,b,c]=r;
  if(a===b&&b===c){
    const mult={'7':30,'\u25c6':15,'\ud83d\udc7d':10,'\ud83d\udef8':8,'\ud83c\udf52':6,'\u2b50':5}[a]||5;
    return bet*mult;
  }
  const sevens=r.filter(x=>x==='7').length;
  if(sevens===2)return bet*2.5;
  if(a===b||b===c||a===c)return bet;
  return 0;
}
function casSpin(bet){
  if(CASBJ.phase==='play'){showToast('Finish the blackjack hand first!');return null;}
  bet=Math.min(bet,P.stox.bal);
  if(bet<0.5){showToast('Deposit diamonds first \u2014 minimum bet 0.5\u25c6');return null;}
  P.stox.bal-=bet;
  const r=[0,0,0].map(()=>SLOTSYM[(Math.random()*SLOTSYM.length)|0]);
  const win=slotPay(r,bet);
  P.stox.bal+=win;
  SLOTLAST={r,win,bet,
    msg:win>=bet*10?'JACKPOT! +'+win.toFixed(2)+'\u25c6':
        win>bet?'Winner! +'+win.toFixed(2)+'\u25c6':
        win>0?'Money back. +'+win.toFixed(2)+'\u25c6':
        'The house thanks you.'};
  if(win>=bet*10)playS('jackpot');
  else if(win>bet)playS('cash');
  else if(win>0)playS('blip');
  else playS('lose');
  animateReels(r);
  renderMoney();
  return SLOTLAST;
}
let REELT=null;
function animateReels(final){
  const els=[$('reel0'),$('reel1'),$('reel2')];
  if(!els[0]||typeof setInterval!=='function')return;
  if(REELT)clearInterval(REELT);
  let t=0;
  REELT=setInterval(()=>{
    t++;
    for(let i=0;i<3;i++){
      if(t<6+i*4)els[i].textContent=SLOTSYM[(Math.random()*SLOTSYM.length)|0];
      else els[i].textContent=final[i];
    }
    if(t>=14){clearInterval(REELT);REELT=null;
      const m=$('slotmsg');if(m)m.textContent=SLOTLAST.msg;}
    else{const m=$('slotmsg');if(m)m.textContent='Spinning...';}
    playS('spin');
  },80);
}

/* blackjack: infinite shoe, dealer stands on 17 */
function bjCard(){
  const v=1+((Math.random()*13)|0);
  const suit=['\u2660','\u2665','\u2666','\u2663'][(Math.random()*4)|0];
  const face=v===1?'A':v===11?'J':v===12?'Q':v===13?'K':''+v;
  return {v:Math.min(v,10),ace:v===1,txt:face+suit};
}
function bjVal(h){
  let t=0,aces=0;
  for(const c of h){t+=c.v;if(c.ace)aces++;}
  while(aces>0&&t+10<=21){t+=10;aces--;}
  return t;
}
function bjSettle(){
  const pv=bjVal(CASBJ.ph),dv=bjVal(CASBJ.dh);
  let pay=0;
  if(pv>21){CASBJ.msg='Bust! ('+pv+')';playS('lose');}
  else if(dv>21){pay=CASBJ.bet*2;CASBJ.msg='Dealer busts ('+dv+')! +'+pay.toFixed(2)+'\u25c6';playS('cash');}
  else if(pv>dv){pay=CASBJ.bet*2;CASBJ.msg=pv+' beats '+dv+'! +'+pay.toFixed(2)+'\u25c6';playS('cash');}
  else if(pv===dv){pay=CASBJ.bet;CASBJ.msg='Push at '+pv+'. Bet returned.';playS('blip');}
  else {CASBJ.msg='Dealer wins '+dv+' to '+pv+'.';playS('lose');}
  P.stox.bal+=pay;
  CASBJ.phase='done';
  renderMoney();
}
function bjDeal(bet){
  if(CASBJ.phase==='play'){showToast('Hand in progress!');return;}
  bet=Math.min(bet,P.stox.bal);
  if(bet<0.5){showToast('Deposit diamonds first \u2014 minimum bet 0.5\u25c6');return;}
  P.stox.bal-=bet;
  CASBJ.bet=bet;CASBJ.ph=[bjCard(),bjCard()];CASBJ.dh=[bjCard(),bjCard()];
  CASBJ.phase='play';
  const pv=bjVal(CASBJ.ph);
  if(pv===21){
    const dv=bjVal(CASBJ.dh);
    if(dv===21){P.stox.bal+=bet;CASBJ.msg='Both blackjack \u2014 push!';playS('blip');}
    else{const pay=bet*2.5;P.stox.bal+=pay;CASBJ.msg='BLACKJACK! +'+pay.toFixed(2)+'\u25c6';playS('jackpot');}
    CASBJ.phase='done';
  }else CASBJ.msg='Hit, stand or double.';
  renderMoney();
}
function bjHit(){
  if(CASBJ.phase!=='play')return;
  CASBJ.ph.push(bjCard());
  if(bjVal(CASBJ.ph)>21)bjSettle();
  else{CASBJ.msg='Sitting on '+bjVal(CASBJ.ph)+'.';renderMoney();}
}
function bjStand(){
  if(CASBJ.phase!=='play')return;
  while(bjVal(CASBJ.dh)<17)CASBJ.dh.push(bjCard());
  bjSettle();
}
function bjDouble(){
  if(CASBJ.phase!=='play')return;
  const extra=Math.min(CASBJ.bet,P.stox.bal);
  if(extra<CASBJ.bet){showToast('Not enough balance to double');return;}
  P.stox.bal-=extra;CASBJ.bet+=extra;
  CASBJ.ph.push(bjCard());
  if(bjVal(CASBJ.ph)>21){bjSettle();return;}
  while(bjVal(CASBJ.dh)<17)CASBJ.dh.push(bjCard());
  bjSettle();
}

/* casino UI */
function casWire(){
  if(casWire.done)return;
  casWire.done=true;
  const w=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
  w('casx',closeCas);
  w('casdep1',()=>pcDeposit(1));
  w('casdepa',()=>pcDeposit(9999));
  w('caswd',pcWithdraw);
  w('castabS',()=>{casTab='slots';renderCas();});
  w('castabB',()=>{casTab='bj';renderCas();});
  w('spin1',()=>casSpin(1));
  w('spin5',()=>casSpin(5));
  w('bjdeal1',()=>bjDeal(1));
  w('bjdeal5',()=>bjDeal(5));
  w('bjhit',bjHit);
  w('bjstand',bjStand);
  w('bjdouble',bjDouble);
}
function renderCas(){
  if(!casOpen)return;
  const bal=$('casbal');
  if(bal)bal.textContent='Balance '+P.stox.bal.toFixed(2)+'\u25c6';
  const dia=$('casdia');
  if(dia)dia.textContent=invCount(P.inv,IT.DIAMOND);
  const ss=$('casslots'),bs=$('casbj');
  if(ss)ss.style.display=casTab==='slots'?'block':'none';
  if(bs)bs.style.display=casTab==='bj'?'block':'none';
  if(casTab==='slots'&&!REELT){
    for(let i=0;i<3;i++){const el=$('reel'+i);if(el)el.textContent=SLOTLAST.r[i];}
    const m=$('slotmsg');if(m)m.textContent=SLOTLAST.msg;
  }
  if(casTab==='bj'){
    const dh=$('bjdealer'),ph=$('bjplayer'),ms=$('bjmsg');
    const show=(h,hide1)=>h.map((c,i)=>(hide1&&i===1)?'??':c.txt).join('  ');
    if(dh)dh.textContent=CASBJ.dh.length?
      ('Dealer:  '+show(CASBJ.dh,CASBJ.phase==='play')+(CASBJ.phase!=='play'?'  ('+bjVal(CASBJ.dh)+')':'')):'Dealer:  \u2014';
    if(ph)ph.textContent=CASBJ.ph.length?
      ('You:     '+show(CASBJ.ph,false)+'  ('+bjVal(CASBJ.ph)+')'):'You:     \u2014';
    if(ms)ms.textContent=CASBJ.msg;
    const play=CASBJ.phase==='play';
    for(const id of ['bjhit','bjstand','bjdouble']){const el=$(id);if(el)el.style.display=play?'inline-block':'none';}
    for(const id of ['bjdeal1','bjdeal5']){const el=$(id);if(el)el.style.display=play?'none':'inline-block';}
  }
}
function openCas(){
  if(casOpen)return;
  casOpen=true;
  casWire();
  const el=$('cas');if(el)el.style.display='flex';
  document.exitPointerLock&&document.exitPointerLock();
  MB.l=MB.r=false;
  renderCas();
  playS('jingle');
}
function closeCas(){
  if(!casOpen)return;
  casOpen=false;
  if(REELT){clearInterval(REELT);REELT=null;}
  const el=$('cas');if(el)el.style.display='none';
  tryLock();
}
/* extra sounds */
const _playS7=playS;
playS=function(n){
  if(!soundOn)return;
  try{
    switch(n){
      case 'spin':   tone(300+Math.random()*200,260,0.03,'square',0.08);return;
      case 'lose':   tone(220,140,0.25,'sawtooth',0.18);return;
      case 'jackpot':tone(660,660,0.1,'square',0.25);tone(880,880,0.1,'square',0.22);
                     tone(1100,1320,0.18,'square',0.2);return;
      case 'jingle': tone(520,520,0.07,'square',0.2);tone(780,780,0.09,'square',0.18);return;
      default:_playS7(n);
    }
  }catch(e){}
};


