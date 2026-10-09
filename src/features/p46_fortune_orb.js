/* PART 46 - THE FORTUNE ORB */
IT.M8BALL=281;
idef(IT.M8BALL,{name:'Fortune Orb',icon:'i_m8',stack:1,gadget:'m8'});
RS([B.OBSIDIAN,B.WOOL],IT.M8BALL,1);
tile('i_m8',c=>{c.clearRect(0,0,16,16);              /* a purple crystal ball with a swirl, on a little brass stand */
  c.fillStyle='#3a1a5a';c.fillRect(5,1,6,1);c.fillRect(3,2,10,1);c.fillRect(2,3,12,7);c.fillRect(3,10,10,1);c.fillRect(5,11,6,1);
  c.fillStyle='#6a2fa0';c.fillRect(5,2,6,1);c.fillRect(3,3,10,7);c.fillRect(5,10,6,1);
  c.fillStyle='#9a5ad8';c.fillRect(4,4,8,5);
  c.fillStyle='#d8b8ff';c.fillRect(6,4,3,1);c.fillRect(5,5,1,2);c.fillRect(9,8,2,1);c.fillRect(11,6,1,2);c.fillStyle='#f4e8ff';c.fillRect(8,6,1,1);
  c.fillStyle='#ffffff';c.fillRect(4,3,2,1);c.fillRect(4,4,1,1);
  c.fillStyle='#c9a43a';c.fillRect(4,12,8,2);c.fillStyle='#8a6a1e';c.fillRect(3,14,10,1);c.fillRect(5,12,6,1);});

