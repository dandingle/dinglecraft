/* c2_smoke.js (C2, gate x2): the record player's editor through its REAL handlers (the creativity plan section 8.6).
   Everything goes through the DOM handlers the browser calls (onclick, oninput/onchange, onpointerdown/move/up on the grid canvas,
   the keydown path c0 routes to the editor): notes, long notes, deleting, the same-row limit, drum painting and erasing, pages, bars,
   instruments (picker, melodic <-> drums), tempo, key, octave, volume, mute, copy bar, add/remove/clear track, undo/redo (buttons and
   keys), every change saved at once and equal to what the editor shows, the size cap, play/stop with sound off (silent playhead) and on
   (a recording fake AudioContext: preview voice, re-render after an edit at the same step, loop off ends), close/reopen, save/load,
   New, Done (a titled disc, the record player cleared), the empty-song refusal, and a jukebox voice set as Dan walks. Nothing is heard. */
'use strict';
const boot=require('../lib/c_boot.js'),{skip}=boot,ok=(n,c)=>{if(c&&process.env.C2_VERBOSE)console.log('ok   '+n);return boot.ok(n,c);};
const FA=require('../lib/c2_fakeac.js');
const V=boot({});
const HOLD=FA.install(44100);
const step=boot.stepper(600000);
boot.run(async()=>{
  if(boot.crStubbed('2')){skip('the music editor','C2 is on its stub');return;}
  const B=V.B,CR=()=>V.getCR(),UI=()=>V.crMusInfo().CRMU,E=()=>UI().el,M=()=>UI().m,PV=()=>V.crMusInfo().CRM.prev;
  const tick=n=>{for(let i=0;i<(n||1);i++){if(HOLD.ac)HOLD.ac.advance(0.04);step(1);}};
  const ev=(x)=>Object.assign({preventDefault(){},stopPropagation(){},pointerId:1,button:0},x||{});
  const click=el=>{if(!el||typeof el.onclick!=='function')throw new Error('no handler');el.onclick(ev());};
  const show=s=>{const sp=UI().lay.sp;for(let k=0;k<8&&UI().page>Math.floor(s/sp);k++)click(E().prev);for(let k=0;k<8&&UI().page<Math.floor(s/sp);k++)click(E().next);};
  const at=(s,r)=>{const p=V.crMusCellXY(s,r);return {clientX:p.x,clientY:p.y};};
  const down=(s,r,b)=>E().grid.onpointerdown(ev(Object.assign(at(s,r),{button:b||0}))),move=(s,r)=>E().grid.onpointermove(ev(at(s,r))),up=(s,r)=>E().grid.onpointerup(ev(at(s,r)));
  const tap=(s,r,b)=>{show(s);down(s,r,b);up(s,r);};
  const drag=(s0,r0,s1,r1,b)=>{show(s0);down(s0,r0,b);const n=Math.max(Math.abs(s1-s0),Math.abs(r1-r0));for(let k=1;k<=n;k++)move(Math.round(s0+(s1-s0)*k/n),Math.round(r0+(r1-r0)*k/n));up(s1,r1);};
  const slide=(el,v)=>{el.value=String(v);el.oninput();el.onchange();};
  const key=(code,x)=>V.crKey(Object.assign({code,target:null,preventDefault(){}},x||{}));
  const rec=()=>V.crCtxRec(UI().ctx),N=t=>M().tr[t].n.map(q=>q.join(':')).join(' ');
  const saved=()=>{const r=rec();return !!r&&V.crSongValid(r.d)&&JSON.stringify(r.d)===JSON.stringify(V.crSongPack(M()));};
  const P=()=>V.P;const sel=id=>{const p=P();let s=p.inv.findIndex(q=>q&&q.id===id);if(s<0)return false;if(s>8){const t=p.inv[8];p.inv[8]=p.inv[s];p.inv[s]=t;s=8;}p.sel=s;V.refreshHand();return true;};
  const empty=()=>{const p=P();let s=p.inv.findIndex((q,i)=>!q&&i<9);if(s<0){const e=p.inv.findIndex((q,i)=>!q&&i>8);s=0;if(e>0)p.inv[e]=p.inv[0];p.inv[0]=null;}p.sel=s;V.refreshHand();};
  const CRF=()=>CR().CRF;CRF().askAuto=o=>({ok:true,value:o.input?'Smoke Song':''});
  V.crMusSound(false);

  /* ===== 1. an empty record player opens a blank song and makes nothing ===== */
  const o=boot.studio(V,step,{name:'crsmoke2'});const dk=(o.x+2)+','+o.y+','+(o.z+2);
  boot.give(V,B.CR_DECK,1);boot.aim(V,o.x+2.5,o.y-0.02,o.z+2.5);boot.rclick(V,step);empty();boot.aim(V,o.x+2.5,o.y+0.5,o.z+2.5);boot.rclick(V,step);
  const be=V.blockEnts.get(dk);
  ok('right-click an empty record player: the editor opens on a blank song (120 BPM, 2 bars, piano + drums) and NO Demo Tape exists yet',
    V.crOn()==='music'&&!!E().play&&M().bpm===120&&M().bars===2&&M().tr.map(t=>t.i).join()==='piano,drums'&&be&&be.id===0&&V.crInfo().works===0&&E().done.disabled===true);
  ok('the grid is 16 steps a bar, two bars a page, 15 melodic rows (C4..C6 for the piano), the label column says C4 at the bottom',
    UI().lay.sp===32&&UI().lay.cw>=16&&V.crSongNoteName('piano',0,0,0)==='C4'&&V.crSongNoteName('piano',14,0,0)==='C6'&&V.crSongRows('piano')===15&&V.crSongRows('drums')===4);

  /* ===== 2. notes ===== */
  tap(0,0);const n0=V.crWorkN(be.id);
  ok('click a square: a note, and the first change makes the Demo Tape (saved at once)',N(0)==='0:0:1'&&n0>0&&V.DEFS[be.id].name==='Demo Tape'&&saved()&&UI().undo.length===1);
  drag(4,2,7,2);ok('drag right: a longer note (4 steps)',N(0)==='0:0:1 4:2:4'&&saved());
  drag(8,5,31,5);ok('a note never grows past 16 steps',N(0).includes('8:5:16')&&saved());
  drag(2,2,9,2);ok('nor into the next note on its row (stops at it)',N(0).includes('2:2:2')&&N(0).includes('4:2:4'));
  tap(5,2);ok('click a note (even its middle): it is deleted',!N(0).includes('4:2:4')&&saved());
  tap(0,0,2);ok('right-click deletes too',!N(0).includes('0:0:1')&&saved());
  tap(12,9);show(12);E().grid.onpointerdown(ev(Object.assign(at(12,9),{ctrlKey:true})));up(12,9);
  ok('Ctrl+click (a Mac trackpad\u2019s right-click) deletes, and never adds a note',!N(0).includes('12:9:')&&saved());
  const und=UI().undo.length;ok('every gesture was one undo step ('+und+')',und===8);
  /* drums */
  click(E().tr[1].row);ok('click the Drum Kit track: it is selected and the grid shows Kick, Snare, Hat, Clap',UI().sel===1&&V.crSongNoteName('drums',2,0,0)==='Hat');
  drag(0,2,7,2);ok('drag across the hat row: eight hits painted, one undo step',M().tr[1].n.filter(q=>q[1]===2).length===8&&UI().undo.length===und+1&&saved());
  drag(0,2,3,2);ok('drag starting on a hit erases along the way',M().tr[1].n.filter(q=>q[1]===2).length===4);
  tap(0,0);tap(8,0);tap(4,1);tap(12,1);drag(4,2,7,2,2);
  ok('kick and snare taps, a right-drag erases hats, drum notes are always 1 step',M().tr[1].n.filter(q=>q[1]===2).length===0&&M().tr[1].n.length===4&&M().tr[1].n.every(q=>q[2]===1)&&saved());

  /* ===== 3. bars and pages ===== */
  click(E().barsP);ok('Bars +: three bars, a second page appears',M().bars===3&&E().next.disabled===false&&saved());
  click(E().next);ok('the next page shows bar 3',UI().page===1&&UI().selBar===2);
  click(E().tr[0].row);tap(33,7);ok('a note in bar 3 lands on step 33',N(0).includes('33:7:1'));
  click(E().barsM);ok('Bars - with notes in bar 3 asks first, then removes the bar and its notes',M().bars===2&&!N(0).includes('33:')&&UI().page===0&&saved());
  click(E().undo);ok('Undo brings bar 3 and its note back',M().bars===3&&N(0).includes('33:7:1')&&saved());
  click(E().redo);ok('Redo removes them again',M().bars===2&&!N(0).includes('33:')&&saved());
  click(E().bar[1]);ok('clicking bar 2 selects it',UI().selBar===1);click(E().bar[0]);

  /* ===== 4. instruments ===== */
  click(E().tr[0].inst);ok('the instrument button opens a list of all six',UI().pick===0&&E().tr[0].pick&&E().tr[0].pick.length===6);
  key('Escape');ok('Esc closes the list first (the editor stays open)',UI().pick===-1&&V.crOn()==='music');
  click(E().tr[0].inst);click(E().tr[0].pick[1]);ok('choose Bass: the track is a bass, the notes stay',M().tr[0].i==='bass'&&N(0).includes('8:5:16')&&saved());
  const before=N(0);click(E().tr[0].inst);click(E().tr[0].pick[5]);
  ok('melodic -> Drum Kit asks, then clears the notes (drums have their own rows)',M().tr[0].i==='drums'&&M().tr[0].n.length===0&&saved());
  key('KeyZ',{ctrlKey:true});ok('Ctrl+Z: back to the bass with its notes',M().tr[0].i==='bass'&&N(0)===before&&saved());
  key('KeyZ',{ctrlKey:true,shiftKey:true});key('KeyZ',{metaKey:true});ok('Ctrl+Shift+Z redoes, Cmd+Z undoes',M().tr[0].i==='bass'&&N(0)===before);
  key('KeyY',{ctrlKey:true});key('KeyZ',{ctrlKey:true});ok('Ctrl+Y redoes',M().tr[0].i==='bass');

  /* ===== 5. tempo, key, octave, volume, mute ===== */
  const u0=UI().undo.length;slide(E().tempo,150);ok('the tempo slider: 150 BPM, saved, one undo step',M().bpm===150&&saved()&&UI().undo.length===u0+1&&E().bpm.textContent==='150');
  click(E().keyP);click(E().keyP);click(E().keyM);ok('Key + + -: one semitone up (C# shown)',M().key===1&&/C#/.test(E().key.textContent)&&saved());
  click(E().tr[0].octP);click(E().tr[0].octP);click(E().tr[0].octP);ok('Oct + three times stops at +2',M().tr[0].o===2&&saved());
  click(E().tr[0].octM);click(E().tr[0].octM);click(E().tr[0].octM);ok('Oct - back to -1',M().tr[0].o===-1);
  slide(E().tr[0].vol,5);ok('the volume slider: 5',M().tr[0].vol===5&&saved());
  click(E().tr[0].mute);ok('M mutes the track (saved with the song)',M().tr[0].m===1&&saved());click(E().tr[0].mute);ok('and unmutes it',M().tr[0].m===0);

  /* ===== 6. copy bar, tracks, clear ===== */
  {click(E().tr[1].row);const cross=M().tr[0].n.find(q=>q[0]<16&&q[0]+q[2]>16);click(E().bar[0]);click(E().copy);
    const crossNow=cross&&M().tr[0].n.find(q=>q[0]===cross[0]&&q[1]===cross[1]);
    const b1=M().tr.map(t=>t.n.filter(q=>q[0]<16).map(q=>q.join(':')).join(' ')),b2=M().tr.map(t=>t.n.filter(q=>q[0]>=16&&q[0]<32).map(q=>[q[0]-16,q[1],q[2]].join(':')).join(' '));
    ok('Copy bar 1->2 copies every track\u2019s bar 1 onto bar 2 (and selects bar 2); a note crossing the bar line now ends at it',JSON.stringify(b1)===JSON.stringify(b2)&&
      b1.join('').length>0&&UI().selBar===1&&saved()&&!!crossNow&&crossNow[0]+crossNow[2]===16);
    click(E().copy);ok('Copy bar 2->3 adds a third bar when needed',M().bars===3&&M().tr[1].n.filter(q=>q[0]>=32).length===M().tr[1].n.filter(q=>q[0]>=16&&q[0]<32).length&&saved());}
  for(let k=0;k<5;k++)if(!E().add.disabled)click(E().add);
  ok('+ Track adds tracks up to six (then it is disabled), each with a different instrument',M().tr.length===6&&E().add.disabled===true&&new Set(M().tr.map(t=>t.i)).size===6&&saved());
  click(E().tr[5].del);ok('\u00d7 removes an empty track at once',M().tr.length===5);
  click(E().tr[1].row);click(E().clear);ok('Clear asks, then empties the selected track',M().tr[1].n.length===0&&saved());click(E().undo);
  click(E().tr[1].del);ok('removing a track with notes asks first, then removes it',M().tr.length===4&&M().tr.every(t=>t.i!=='drums')&&saved());click(E().undo);
  ok('undo brings the drum track back with its notes',M().tr.some(t=>t.i==='drums'&&t.n.length>0));

  /* ===== 7. play: sound off (silent playhead), sound on (a preview voice) ===== */
  {const L0=HOLD.ac?HOLD.ac.log.length:0;key('Space');const p0=V.crMusInfo();
    ok('Space plays; with Sound off the editor says so',!!PV()&&PV().on&&UI().msg==='Sound is off (Settings)'&&/Stop/.test(E().play.textContent));
    const s0=Math.max(0,UI().lastSt|0);tick(12);const s1=UI().lastSt;
    ok('... and the playhead still runs (silently): step '+s0+' -> '+s1,s1>s0&&(!HOLD.ac||HOLD.ac.log.length===L0));
    key('Space');ok('Space again stops',!PV()&&/Play/.test(E().play.textContent));}
  /* fix lead, v6.2 review: on a song longer than one page the grid follows the playhead (it used to stay on page 1 for most of the loop) */
  {const b0=M().bars;while(M().bars<6)click(E().barsP);show(0);const sp=UI().lay.sp;key('Space');
    let n=0;while(UI().lastSt<sp+2&&n++<600)tick(1);const p1=UI().page,ph1=UI().lastSt;
    click(E().prev);const pg0=UI().page;let m=0;while(UI().lastSt<2*sp+4&&m++<600)tick(1);const stay=UI().page;
    let w=0;while(!(UI().lastSt>=2&&UI().lastSt<sp)&&w++<900)tick(1);const back=UI().page;let w2=0;while(UI().lastSt<sp+2&&w2++<600)tick(1);const again=UI().page;
    key('Space');while(M().bars>b0)click(E().barsM);show(0);
    ok('a 6-bar song playing: the grid turns to page 2 as the playhead runs off page 1 ('+p1+' at step '+ph1+'); a page Dan turned back to himself stays put ('+stay+
      '), and once the playhead comes round to it the grid follows again ('+back+' -> '+again+')',p1===1&&pg0===0&&stay===0&&back===0&&again===1&&M().bars===b0);}
  V.crMusSound(true);
  {key('Space');tick(2);const ac=HOLD.ac;
    ok('Sound on: Play starts one looping preview voice through the game\u2019s audio()',!!ac&&FA.live(ac,true).length===1&&PV().v&&PV().v.src.loop===true);
    const v1=PV().v;tick(8);ok('the preview ducks the background music while it plays',V.crDuckNow()===true);
    const S=M().bars*16,mod=x=>((x%S)+S)%S,cd=(a,b)=>{const d=Math.abs(mod(a)-mod(b));return Math.min(d,S-d);};
    tap(1,3);tick(5);const v2=PV().v,s150=15/150,e2=(v1.src.started[1]+(v2.src.started[0]-v1.src.started[0]))/s150;
    ok('an edit while playing re-renders after ~150 ms: the old voice stops, a new one starts at exactly the step the old one had reached',v2&&v2!==v1&&v1.src.stopped!=null&&
      FA.live(ac,true).length===1&&cd(v2.src.started[1]/s150,e2)<1e-6);
    slide(E().tempo,100);tick(5);const v3=PV().v,e3=v2.src.started[1]/s150+(v3.src.started[0]-v2.src.started[0])/s150;
    ok('a tempo change while playing keeps the musical position: the new voice starts at the same step, in seconds of the new tempo',v3&&v3!==v2&&cd(v3.src.started[1]/(15/100),e3)<1e-6);
    click(E().loop);tick(5);ok('Loop off: the voice no longer loops',PV()&&PV().v&&PV().v.src.loop===false);
    tick(Math.ceil(M().bars*16*15/M().bpm/0.04)+10);ok('... and play stops by itself at the end',!PV());
    click(E().loop);key('Space');tick(3);V.crKey({code:'Escape',target:null});tick(3);
    ok('Esc while playing: the editor closes and the preview stops',V.crOn()===''&&!PV()&&FA.live(ac,true).length===0);}

  /* ===== 8. persistence ===== */
  const last=JSON.stringify(V.crRec(n0).d);
  boot.aim(V,o.x+2.5,o.y+0.5,o.z+2.5);boot.rclick(V,step);
  ok('reopen: the same song, exactly as saved',V.crOn()==='music'&&JSON.stringify(V.crSongPack(M()))===last);
  key('Escape');step(2);const sv=V.snapshot('crsmoke2');V.applySave(JSON.parse(JSON.stringify(sv)));step(30);
  empty();boot.aim(V,o.x+2.5,o.y+0.5,o.z+2.5);boot.rclick(V,step);
  ok('save and load, reopen: still the same song (the Demo Tape rides the save)',V.crOn()==='music'&&JSON.stringify(V.crSongPack(M()))===last&&V.crCtxRec(UI().ctx));

  /* ===== 9. the size cap ===== */
  {while(M().tr.length<6)click(E().add);
    while(M().bars<8)click(E().barsP);let refused=false,guard=0;
    outer:for(let t=0;t<6;t++){click(E().tr[t].row);if(M().tr[t].i!=='drums'){click(E().tr[t].inst);click(E().tr[t].pick[5]);}
      for(let pg=0;pg<4;pg++){while(UI().page<pg)click(E().next);while(UI().page>pg)click(E().prev);for(let r=0;r<4;r++){const s0=pg*32,b=JSON.stringify(V.crCtxRec(UI().ctx).d);CRF().toast='';
        drag(s0,r,s0+31,r);guard++;if(/Too much detail/.test(CRF().toast)){refused=JSON.stringify(V.crCtxRec(UI().ctx).d)===b&&JSON.stringify(V.crSongPack(M()))===b;break outer;}}}}
    ok('painting drums everywhere eventually hits the 6,000-char cap: that stroke is refused ("Too much detail"), the song stays as it was ('+guard+' strokes, '+
      JSON.stringify(V.crCtxRec(UI().ctx).d).length+' chars)',refused&&JSON.stringify(V.crCtxRec(UI().ctx).d).length<=6000);
    ok('a nearly full grid still holds well over a thousand notes',V.crSongCount(M())>1500);}

  /* ===== 10. New, Done ===== */
  click(E().nw);ok('New asks, then throws the Demo Tape away (its record is gone) and shows a blank song',!V.crRec(n0)&&V.blockEnts.get(dk).id===0&&V.crSongCount(M())===0&&M().tr.length===2);
  ok('Done is greyed out on an empty song',E().done.disabled===true&&V.crOn()==='music');
  tap(0,7);tap(4,9);drag(8,11,11,11);const fin=JSON.stringify(V.crCtxRec(UI().ctx).d),nW=V.crWorkN(V.blockEnts.get(dk).id);
  click(E().done);const discId=V.crItemId(nW),disc=V.crRec(nW);
  ok('Done: asks for a title, presses ONE disc "Music Disc: Smoke Song" with exactly the saved song, clears the record player, closes the editor',
    V.crOn()===''&&disc&&disc.st==='done'&&disc.t==='Smoke Song'&&JSON.stringify(disc.d)===fin&&V.DEFS[discId].name==='Music Disc: Smoke Song'&&
    P().inv.filter(q=>q&&q.id===discId).length===1&&V.blockEnts.get(dk).id===0&&!!V.crCore().ICONS[discId]);
  step(2);empty();boot.aim(V,o.x+2.5,o.y+0.5,o.z+2.5);boot.rclick(V,step);ok('the record player is empty again: a blank song',V.crOn()==='music'&&V.crSongCount(M())===0);key('Escape');step(2);

  /* ===== 11. a jukebox voice set as Dan walks ===== */
  {const ac=HOLD.ac,jx=o.x+3,jz=o.z-3,jy=o.y;boot.give(V,B.CR_JUKE,2);boot.aim(V,jx+0.5,jy-0.02,jz+0.5);boot.rclick(V,step);sel(discId);boot.aim(V,jx+0.5,jy+0.5,jz+0.5);boot.rclick(V,step);tick(3);
    const walk=[];for(const d of [2,10,20,28,31,33,45,25,5]){const p=P();p.x=jx+0.5-d;p.z=jz+0.5;p.y=jy;p.vx=p.vy=p.vz=0;tick(4);walk.push(FA.live(ac,true).length);}
    ok('walking away and back: one voice inside 32 m, none beyond, back again on return ('+walk.join(',')+')',walk.join(',')==='1,1,1,1,1,0,0,1,1');
    {const p=P();p.x=jx+0.5-2;p.z=jz+0.5;tick(3);}const VO=V.crMusInfo().CRM.voices,jk=jx+','+jy+','+jz,vj=VO.get(jk);empty();boot.aim(V,jx+0.5,jy+0.5,jz+0.5);boot.rclick(V,step);
    ok('right-click ejects: the voice stops and the same disc is back in the inventory',vj&&vj.src.stopped!=null&&!VO.has(jk)&&P().inv.some(q=>q&&q.id===discId));
    sel(discId);boot.rclick(V,step);tick(2);const vk=VO.get(jk),FX=V.crMusInfo().CRM.fx,fx=FX.get(jk);
    ok('a playing jukebox shows one floating note sprite in the scene (Sound on or off), tinted, rising',FX.size===1&&fx&&fx.sp&&fx.id===discId&&fx.m.transparent===true);
    empty();boot.mine(V,step,75);const total=V.entities.filter(e=>e.t==='drop'&&!e.dead&&e.st.id===discId).length+P().inv.filter(q=>q&&q.id===discId).length;
    ok('breaking the playing jukebox stops the voice, removes its note and drops the disc (on the floor or already picked up: exactly one)',vk&&vk.src.stopped!=null&&!VO.has(jk)&&!FX.has(jk)&&total===1&&!V.crBE(jk));}
  V.crMusSound(false);
});
