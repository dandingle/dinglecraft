/* PART 49 - GUILT (10% of kills come back to talk) */
let GHOST_CHANCE=0.10;
const GHOST_LINES=[
 'I had a family, you know.','We were going to the theme park this weekend.',
 'My kids are still waiting at the spawner.','You did not even take the meat.',
 'I remembered your name. It was the last thing I did.','The figurine? Really? I am DECOR now?',
 'I was two days from retirement.','All I did was walk toward you menacingly.',
 'Was the XP worth it?','I liked you. Past tense now, obviously.',
 'This is why the villagers whisper about you.','The Eternal Snail hears everything, you know.',
 'I was saving that health for something special.','My hurtbox and I forgive you. One of us is lying.',
 'You have a bed. I had a patch of grass. Had.','Do you hear it too? The slow one? He is closer.',
 'I voted for you in the mob council. Once.','Even the blocklings cry less than I did.',
 'Tell the pigs I said nothing. They will know what it means.','It is very cold where the despawned go.'];
function spawnGhost(mt,x,y,z){
  if(!MOBT[mt])return;
  const {G,mats}=makeMobMesh(mt);
  for(const m of mats){
    if(!m)continue;
    m.transparent=true;m.opacity=0.32;
    m.color&&m.color.setRGB&&m.color.setRGB(0.85,0.9,1);
  }
  G.scale.set(0.9,0.9,0.9);
  scene.add(G);
  entities.push({t:'ghost',mt,x,y,z,life:60,ang:Math.random()*6.28,
    sayT:4+Math.random()*5,mats,mesh:G});
  playS('whisper');
}
function updateGhost(e,dt){
  e.life-=dt;
  e.ang+=dt*0.35;
  const r=4.5+Math.sin(e.life*0.5)*1.5;
  e.x=lerp(e.x,P.x+Math.sin(e.ang)*r,0.03);
  e.z=lerp(e.z,P.z+Math.cos(e.ang)*r,0.03);
  e.y=lerp(e.y,P.y+1.6+Math.sin(e.life*1.3)*0.4,0.05);
  e.sayT-=dt;
  if(e.sayT<=0){
    e.sayT=7+Math.random()*6;
    showToast('👻 '+GHOST_LINES[(Math.random()*GHOST_LINES.length)|0]);
    if(Math.random()<0.4)playS('whisper');
  }
  if(e.life<2)for(const m of e.mats)if(m)m.opacity=Math.max(0,0.32*(e.life/2));
  if(e.life<=0){
    showToast('👻 ...remember me.');
    removeEnt(e);
    return;
  }
  e.mesh.position.set(e.x,e.y,e.z);
  e.mesh.rotation.y=Math.atan2(P.x-e.x,P.z-e.z);
}

