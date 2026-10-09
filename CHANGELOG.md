# DINGLECRAFT changelog

Every release's patch notes, newest first. This file is generated from
`PATCH_LOG` in `src/ui/p28_patch_notes.js` by `npm run changelog`: change the patch notes there, never here.
A version appears once `npm run release` has recorded it in `tests/fixtures/shipped.json`.

<!-- manual -->
> **Release 1.0 (game versions 6.4 to 6.8).** The first public release, and the first one built in this repository. 6.4 was
> the preview: Puppet Purgatory's new cast, the game's own names, models and textures in several other places (old worlds
> load with the new names), a redesigned title screen and a UI Scale setting. 6.5 and 6.6 were cuts of the title panorama.
> 6.7 completes it: game rules on Create New World, a per-world rules editor, Export World in the pause menu, new sliders,
> your own name, menu music, offline play and a few rare finds. 6.8, the final cut, trims the horror. Each cut has its
> own entry below.
>
> **The move into this repository (v6.3, 2026-10-08).** DINGLECRAFT moved out of its old "splice" build pipeline into this
> repository: per-system source files in `src/` and `html/`, the Hyperreal art as individual WebP files in
> `assets/packed/`, and a Node-only build (`npm run build`) and test gate (`npm run gate`). The build reproduced the shipped
> `dinglecraft_v6.3.html` byte for byte (md5 `e0d781ad02350580f027d9452ba67e28`), so nothing about the game changed in
> the move. See `docs/PARITY.md` for the proof.
<!-- /manual -->

<!-- generated from PATCH_LOG: do not edit below this line (up to the next manual block) -->

## Release 1.0 (final cut)

*Game version 6.8, released 2026-10-09.*

- Final cut of Release 1.0. Two of the things that stalk the night have moved out for good, and the whispers come ten times less often.

## Release 1.0

*Game version 6.7, released 2026-10-09.*

- RELEASE 1.0. The proper one.
- A new title screen: a sharp 360 panorama of a real world, turning slowly on the spot like it should, with its own menu music (BATEHOVEN IS HALOUS).
- Create New World now has game rules: Keep Inventory, Mob Griefing, Peaceful, Fire Tick, The Eternal Snail, Guilt Ghosts, the Fullbright toggle, AI Players, the Dingle Store, Superpowers and Cheats. Cheats decide whether the debug menu exists at all.
- A warning on Create New World: worlds live in your browser, so clearing your history deletes them. Export often.
- Export World moved to the pause menu, right under Save World.
- Settings: Field of View, Mouse Sensitivity, Sound volume and Music volume sliders.
- Fixed the oldest bug in the game: picking something up now updates your hotbar straight away (and finally makes the pickup pop).
- First launch asks for your name. Type anything. Chat, the player list and the AI players all use it (change it any time in Settings).
- Right-click a saved world in Load World to change all of its game rules before you load it.
- No internet needed: everything the game needs is baked into the file now.
- Patch notes are retired. This is the last one. Enjoy it.

## Release 1.0 (second cut)

*Game version 6.6, released 2026-10-09.*

- Second cut of Release 1.0: the sharp, always-turning title panorama.

## Release 1.0 (first cut)

*Game version 6.5, released 2026-10-08.*

- First cut of Release 1.0. The same night, 6.6 made the title panorama sharp and keeps it turning.

## Release 1.0 Preview — Under New Management

*Game version 6.4, released 2026-10-08.*

- RELEASE 1.0. UNDER NEW MANAGEMENT. The purgatory theatre has changed hands. The new owners kept the building, let the entire cast go and hired the cheapest touring company they could find. It is now called Puppet Purgatory.
- Now headlining: THE DEMOLITIONIST (bomb suit, plunger, no hobbies), THE PIG (a very large pig with a very large ego) and, closing the show, THE MANAGEMENT.
- The supporting cast works for scale and nobody will tell you where it was hired. Go and meet them. Bring tomatoes.
- Your progress transfers to the new production. Kills, trunks, souvenirs and Programme ticks from older saves all load with the new names on them. Once a world has been opened in Release 1.0, keep it on Release 1.0.
- Elsewhere: the green walking bombs are now NUKE KEGS (gunpowder barrels on legs, same fuse, same crater). Mobs are now caught in a CRITTER JAR. The fortune ball is now a FORTUNE ORB with exactly the same attitude. The Gaming Rig now runs DEEP DIRT 2D, the cinema is showing ASTEROID ALLEY, and MALGORATH has a new title: THE WORLD-EATER.
- The Dingle Exchange now lists made-up companies only. Old portfolios were converted share for share, so nobody lost a diamond.
- Dan has a new outfit (orange and charcoal), and the zombies got new old clothes. In Hyperreal the aliens look like aliens again, and the boomers are walking powder kegs too: eye holes, a burnt grin, a fuse that spits sparks and a freshly packed gunpowder sac behind the chest doors.
- A few sound effects that only ever worked on one computer now use the in-engine versions for everyone.
- NEW TITLE SCREEN: the logo is big and proud, a floating island turns slowly behind it, and every button is chunky, clicky and works from the keyboard (arrow keys, Enter, Esc). Everything else got BIGGER too: the HUD, every menu, chat, the help book and these very patch notes. New in Settings: UI SCALE (Auto, 100%, 125%, 150% or 200%). Auto picks a size that suits your screen, and icons stay pixel-sharp at every size.
- Deleting a saved world now takes two clicks, and What’s New finally opens in front of the title screen instead of behind it. Toasts no longer land on top of whatever menu you have open, and F3 and the player list (hold Tab) keep out of the way of the boss bars, the chat and the compass.
- Under the hood: 3,773 checks (3,512 in the game suites, 261 in the tools), including test.js 69, smoke.js 221 (x6) and botsmoke.js 199 (x3). Every suite from the last release, an originality scan over every file, checks for every recast model, texture and old save, a privacy scan and a UI scale suite. All green.

## v6.3 — The Malgorath Update

*Released 2026-10-08.*

- v6.3 THE MALGORATH UPDATE. MALGORATH has been rebuilt from the bones up. Same address: X 1000, Z 1000. Different appetite.
- Whatever you remember about his arena, forget it. Something has taken a bite out of the world out there, and it is still chewing. Go and look over the edge. Then decide whether to poke anything.
- He is sixteen metres of hand-sculpted, wildly over-detailed demon in a world made of 16 pixel cubes, and the last world he ate is still stuck to his back. In Hyperreal he is now the most expensive-looking thing in the game by a distance.
- He is hard. Properly hard. Bring your best armour, your best sword and a lot of steak. In testing, a robot in full diamond with a Sharpness V sword beat him in eleven worlds out of twelve and died along the way in most of them. A robot in dragon armour that just stood there and swung lasted under a minute, every single time.
- He learns. So will you. When he kills you, you start again further along than you think.
- Beat him and he leaves you something to remember him by. It bites.
- Killed the old one in an old world? He remembers. He comes back anyway.
- If an old world of yours has anything built near X 1000, Z 1000, it has been cleared away. Anything that was in a chest there is waiting for you at the top of the stairs.
- Full disclosure: nobody here has heard a single note of his music or one of his sound effects. A computer measured every one of them (pitch, tempo, loudness, clicks) and swears they are horrible in the right way. Debug menu, Malgorath: sounds plays the lot. If anything sounds off, say so.
- Once a world has been opened in v6.3, keep it on v6.3. Older versions remember the old arena and do not know what he left you.
- Under the hood: test.js 69, smoke.js 221 (x6), botsmoke.js 199 (x3), every texture-pack, purgatory and creativity suite, thirteen new Malgorath suites (540 checks, including a fight harness that proves a skilled player can win and a careless one cannot) and two new og_trace sessions proving the rest of the world has not changed. All green.

## v6.2 — The Creativity Update

*Released 2026-10-07.*

- v6.2 THE CREATIVITY UPDATE. You can now make art. Actual art, signed by you, one of a kind, hanging next to the hole a Nuke Keg left in your wall.
- EASELS. Craft one (a stick frame around a block of wool), put it down and right-click it. Pick a canvas: Square 64x64, Wide 128x64 or Tall 64x128. Then paint with 24 colours, a pencil, an eraser, a fill bucket, an eyedropper and three brush sizes. Right-click erases with any tool, Ctrl+Z undoes, and every tool has a keyboard shortcut for the professionals.
- Walk away whenever you like. The easel keeps your painting exactly where you left it, through saves, deaths and the occasional nuke. Break the easel and the unfinished canvas pops out so you can carry it to another one.
- Press Done, give it a title and you get THE painting. Not a copy: there is only ever one. Hang it on any wall (2x2, 4x2 or 2x4 blocks), take it down, move house, hang it again. It is the same painting forever, with crisp pixels in OG and in Hyperreal.
- RECORD PLAYERS. Craft one (stick, iron ingot, stick over three planks) and build a song on a step grid: up to six tracks of piano, bass, lead synth, pluck guitar, bells and a four-piece drum kit. Click a square for a note, drag right to hold it, Space to play. Tempo, bars, key, octave and volume are one click away. Every row is in C major, so you cannot play a wrong note. You can still write a bad song. That part is on you.
- Press Done and the record player presses a music disc. Also the only one in existence.
- JUKEBOXES. Eight planks around a diamond, as tradition demands. Put a disc in and it loops for everyone nearby, louder as you walk up and coming from where the jukebox actually is, while the background music politely steps outside. Right-click again to get your disc back. Break the jukebox and the disc drops. Nothing you make gets lost by accident.
- Paintings and discs survive everything: chests, deaths far from home, saves, the Nether, the Big Dingle and a trip to Puppet Purgatory (they wait in your trunk, the frog has no taste in art). Drop one on the far side of the map and it waits right where it fell. BunkerBrad, xx_lilcreepah_xx and honeybee_mc will admire your work from a respectful distance. They will not touch it. We checked.
- Full disclosure: nobody here has actually heard the music. A computer listened very carefully, swears every note is in tune and on time, decided the bells were too loud (turned down) and gave the kick drum enough punch for laptop speakers. If anything else sounds off, say so.
- One warning: once a world has been opened in v6.2, keep it on v6.2. Older versions do not know what a painting is and forget them when they save. If it happens anyway, the lost ones turn up as Lost Works instead of breaking anything.
- Under the hood: test.js 69, smoke.js 221 (x6), botsmoke.js 199 (x3), every texture-pack and purgatory suite, seven new creativity suites (415 checks, including an offline ear that measures every note) and two new og_trace sessions proving nothing changes until you craft something. All green.

## v6.1 — Puppet Purgatory

*Released 2026-10-07.*

- v6.1 PUPPET PURGATORY. Somewhere in your world a door has appeared. Three headliners, one way out. Tune the structure compass to Stage Door, or survive 10 minutes.
- There is a frog on a stool beside it. It wants an empty hand. Everything you carry waits outside in a trunk with your name on it. BunkerBrad, xx_lilcreepah_xx and honeybee_mc go in with nothing too, and they want out as badly as you do.
- Inside is a whole new dimension: new ground, new ores, new tools, new food, new crafting, new monsters. Nothing from your world works in there, and nothing from in there comes home except three souvenirs.
- You are handed a Programme. Right-click it. The printed copy is very cheerful. Trust the handwriting in the margins.
- The Demolitionist, the Pig and the Management are headlining. Beat all three and find the EXIT. It is through the audience.
- Works in both texture packs: OG gets the full licensed-PC-game-from-1997 treatment, Hyperreal gets the flash photographs. The file is now about 40 MB.
- Under the hood: test.js 69, smoke.js 221 (x6), botsmoke.js 199 (x3), every texture-pack suite, ten new purgatory suites (over 1,000 checks) and a pilot that plays the whole thing from the door to the EXIT in about 31 minutes without a single free item. All green.

## v6.0 — Hyperreal

*Released 2026-10-06.*

- New in Settings: TEXTURE PACK. OG is the game you know, 16px, exactly as it was. HYPERREAL replaces every block, every light and most of the living things with photoreal versions. The world was not consulted.
- BLOCKS. Grass, dirt, stone, every ore, logs, planks, leaves, sand, snow, ice, glass, cactus, TNT, crafting tables, furnaces, chests, doors, beds, torches, wool, the Nether blocks and more are now high-resolution PBR materials with real bumps and real roughness. Every terrain block is turned at random so the ground never tiles. Leaves and flowers are cut out properly, water is see-through and catches the light at low angles, ice is glassy, and lava, torches and glowstone actually glow. Anything without a photoreal version yet keeps its OG pixels, lit by the new lights.
- LIGHT. A real sun and moon cast real shadows that follow you around, under a proper sky: golden hour, an orange sunset, a purple dusk and starlit nights. Torches, lava and glowstone throw actual light and flicker. Caves are dark until you light them. The Nether glows red, the Aether is blinding, underwater turns teal and murky, and the arena of MALGORATH is now graded in ash and embers. Bloom, ambient occlusion, haze, filmic tone mapping and anti-aliasing do the rest.
- THE CAST. Zombies, skeletons, boomers, spiders, pigs, cows, sheep and villagers have been replaced by the Hyperreal cast. They are not low-poly and they are not sorry. Heads turn to follow you. A zombie swing lands on the exact frame it hurts you. Skeletons draw and release with the arrow. Boomers swell and strobe before they go. The hurt flash only lights up the mob you actually hit.
- CORPSES. Mobs no longer vanish in a puff the instant they die. They die. The whole death animation plays out, the body lies there for a respectful moment, sinks into the ground, and THEN it is a puff. Up to eight bodies at a time; the oldest one leaves to make room. Drops and XP are exactly the same as before.
- YOU. In third person you are now Dan, in more detail than anyone asked for, still wearing your hat and armour and still holding your tools. In first person an empty hand is THE FIST: swollen, and very much yours. It bobs when you walk, jabs when you punch and throws splinters when you punch a tree. Hold a block and you are holding a real photoreal cube.
- BunkerBrad, xx_lilcreepah_xx and honeybee_mc got bodies to match. Same minds, same grudges, considerably more skin. When they die they leave a body like everybody else, then respawn just as Hyperreal.
- HYPERREAL QUALITY sits right under the pack switch: Auto, Low, Medium, High or Ultra. Auto picks Medium on a normal computer and Low on touch screens. High and Ultra are opt-in for machines that enjoy suffering: bigger shadow maps, more lights, ambient occlusion and film grain. The first switch takes a few seconds while the textures unpack, and you can switch back and forth mid-game.
- OG IS UNTOUCHED. Not basically the same: identical. One test plays the same 600-frame session on the old code and the new code and compares them every 40 frames. Another renders a frame, goes to Hyperreal and back, renders it again and checks that every pixel matches. The HUD, the inventory icons, figurines and particles stay 16px in both packs, on purpose.
- Fair warning: the game file is now about 31 MB, because every texture lives inside it, and Hyperreal needs WebGL2. If your browser cannot do it, the option says so and OG carries on as normal.
- Under the hood: test.js 69, smoke.js 221 (x6), botsmoke.js 199 (x3), plus 614 new texture-pack checks in 9 suites (contract 97 + 55 (x2), blocks 46 + 62 (x2), light 49 + 80 (x2), cast 101 + 93 (x2), OG trace 31). All green.

## v5.9 — Other Players

*Released 2026-10-06.*

- You are not alone any more. Three AI players now live in your world as if it were a real server: BunkerBrad (convinced everything is out to kill him, builds bunkers, moats, sky bases and traps), xx_lilcreepah_xx (steals, griefs and blows things up, and takes it VERY personally when it happens to him) and honeybee_mc (just wants a lovely flower-filled town where everyone gets along). They each have their own goals, memories, grudges and friendships, and they decide for themselves what to do next.
- They play by EXACTLY your survival rules. They join a new world with nothing, punch trees, craft planks, sticks, a crafting table and a wooden pickaxe, mine stone for stone tools, dig for coal and iron, smelt ore in real furnaces, and build only with blocks they actually carried there. Tools and armour wear out and break, stone without a pickaxe gives nothing, they get hungry and only heal when fed, they can’t reach through walls, and when they run out of cobble halfway up a wall they have to go and get more. Every torch, door, bed, chest and stick of TNT was mined, smelted or crafted the hard way, and nobody else’s furnace or chest is a free shop (the one mercy: a filled Water Bucket never runs dry for them).
- They place every single block themselves, so their houses look exactly as good (or bad) as they manage. They fight mobs, set up homes, raid chests, light TNT and hold grudges. PvP and griefing are on for everyone, including against each other. Ask one to team up and it is genuinely their call. Declare war and they will remember.
- Press T (or Enter) to talk in server chat, / for commands: /msg &lt;player&gt; to whisper, /think &lt;player&gt; to read their mind, /bots to see who is online, /help for the rest. Hold TAB for the player list. New PLAYER COMPASS (you are handed one when they join; craft more from 4 iron around 1 gold): right-click to cycle through players, sneak + right-click to go back, and it points to them with the distance and height. honeybee_mc is also collecting nine NEW FLOWERS that now grow in different biomes.
- Their minds run on Claude through a small local brain server (double-click "Start AI Brain.command" in the game folder - it opens the game for you). Without it they play on a simple survival autopilot and cannot chat; the game now says so in chat and shows an "AI players: autopilot" badge until the brain is connected (/brain shows the status). New worlds have them switched on; for older worlds use /bots join or the AI Players rule in the Debug Menu.
- Fix: mouse look no longer randomly snaps sideways. Some browsers occasionally report one giant bogus mouse movement while the pointer is locked (especially right after closing chat); the game now ignores those spikes.

## v5.8 — Slow-Mo Studio

- New GAME SPEED slider in the Debug Menu (1x down to 0.1x). Turn it down and the whole world runs in slow motion for capturing clean footage — and it slows and smooths your mouse look by the same amount, so when you speed the recording back up in editing it looks like normal 1x gameplay. Default is 1x, full speed.
- Also a GUILT GHOSTS toggle: switch it off and slain mobs will not come back to haunt you, and any that are already lurking are sent packing.

## v5.7 — Hold Still

- New FREEZE ALL MOBS toggle in the Debug Menu. Flip it on and every mob — pigs, zombies, bosses, all of them — stops dead where it stands: no walking, no attacking, no falling, frozen mid-stride until you switch it back off. They can still be hit and killed while frozen; they just cannot do anything about it.

## v5.6 — One Hit Wonder

- New INSTANT KILL toggle in the Debug Menu. Flip it on and every hit you land drops a mob on the spot — does not matter if it is a gun, a sword, a pickaxe, an arrow, the boomerang, or your bare fist. One touch, one kill. Turn it off to go back to earning it.

## v5.5 — Quieter Toggles

- Switching game mode, toggling X-Ray, and cycling the camera view (F) no longer pop a toast message on screen. The change is obvious the moment it happens, so the notifications were just noise. Everything still works exactly the same, just without the announcement.

## v5.3 — Into the Void

- The AETHER has no floor, so anything that falls off an island now vanishes into the void the way it should. Mobs, skateboards, cars, boats, planes, and dropped items that tumble into the abyss poof into cloud instead of piling up invisibly at the bottom of the world. You still get bounced back to the overworld when YOU fall off. The rest is lost to the clouds.

## v5.2 — Undead Vacation

- ZOMBIES and SKELETONS no longer burn in the daylight of the AETHER. The sky islands are bright, but their light does not smite the undead — the rotting and the bony can now wander the clouds in peace. Sunburn is still very much a thing back in the overworld.

## v5.1 — Mercy Settings

- THE ETERNAL SNAIL now has an OFF switch, tucked in the Debug Menu with the other game rules. Flip it and he vanishes on the spot and stays gone. Flip it back if you miss him. He will not judge you. He will simply return.
- JUMPSCARES are now OFF by default (chance-per-frame set to 0). If you want them back, the slider is right where it always was, in the Debug Menu. Existing worlds keep whatever you last set.

## v5.0 — THE BIG DINGLE

- You can now craft a NUCLEAR BOMB. It is called The Big Dingle and it is a mistake by design: 4 TNT, 2 diamonds, 2 gunpowder, glowstone core. Air delivery only — craft the PROP PLANE (5 iron + glass), place it, hop in, and fly with W to throttle, A/D to bank, and your own eyes to climb: it goes where you look.
- Right-click with the bomb while flying to let go. Then a 20 second countdown, sirens included, and then: catastrophic, unimaginable damage. A crater to the VOID — yes, through bedrock — across a huge area. Everything alive within EIGHT CHUNKS dies. The mushroom cloud is visible from everywhere and lingers for a minute and a half. The crater is permanent. It survives saving, loading, and your regret.
- The only block that says no: BUNKERCRETE (3 stone + iron, makes 8) and BUNKER GLASS (bunkercrete + glass, makes 4). Seal yourself in completely — floor, walls, roof, no gaps — and the blast cannot touch you. One missing block and it can. The snail also survives. The snail always survives.

## v4.2 — Snail Mobility Assessment

- THE ETERNAL SNAIL has completed climbing school. He now pillar-jumps upward when you are above him, placing his own blocks beneath himself, and digs straight down when you are below. Altitude first, then the closing walk. He no longer wastes time building above you - every block he places is a step toward you, never past you.

## v4.1 — Horror, Director's Cut

- Jumpscares play their in-engine sounds on every computer, so everybody gets the same fright.

## v4.0 — THE HORROR UPDATE

- THE ETERNAL SNAIL is here. He is slow. He is patient. His only purpose is to touch you, and his touch is instant death. He breaks walls when he must, builds bridges when he needs to, follows you across every dimension, and if you outrun him he simply... reappears. Fifty blocks away. Walking. There is no hiding. There is no killing. There is only distance, temporarily.
- JUMPSCARES: every single frame now has a configurable chance (default 1%) of a gnome greeting you at considerable volume, a sudden bass drop from nowhere, or THE MASCOT. All art and sounds are original and hand-made, which somehow makes it worse. The slider is in the Debug Menu: 0% for cowards, 100% for content creators.
- GUILT: 10% of your kills now come back as a translucent ghost of the exact mob you killed, following you for a full minute saying things designed to make you feel bad. They cannot hurt you. That was never the point of them.
- NEW HORRORS stalk the night and the deep: a tall pale thing that only moves when you are not looking, and something fast in the caves that freezes in torchlight. Neither can be killed. Sleep well.
- There are also things in this update we are not going to tell you about. You will know when you know.

## v3.5 — THE GRAB BAG UPDATE

- LIVING BLOCKS: one in every 500 blocks does not consent to being mined. It sprouts legs, bursts into tears, and runs. You monster. (Killing it returns the block. Still a monster.)
- FISHING: craft a rod (2 sticks, 2 string), cast into water, wait for the dip, reel within the window. Fish cook in the furnace. There is also a REVERSE FISHING ROD (rod + gunpowder, or a rare catch) which reels YOU in. We are not fixing this. It is genuinely great for water travel.
- SNAKES roam the grass, hunting dropped apples - every apple makes them one segment longer. Eating an apple yourself makes YOU bigger for 25 seconds: taller, harder-hitting, higher-jumping. The snakes knew all along.
- MOB FIGURINES: every kill has a 5% chance to drop a figurine of the victim. Display them on a SHELF (planks ring) or in a JAR (glass + plank). Boss figurines exist. They rotate. Slowly. Menacingly.
- GUARD TURF: craft militarized soil (dirt + string + gunpowder) and plant it: roses shoot, dandelions heal, cacti maul, tall grass slows the horde. Any resemblance to other botanical defense programs is purely coincidental.
- DINGLE CINEMA (store, 3999 DB): place the kit and a whole cinema assembles itself. Three original films - and pressing E puts YOU inside the movie as the lead. Win for popcorn.
- FORTUNE ORB (obsidian + wool): right-click to consult. Twenty answers, all unhelpful in the correct way.

## v3.4 — Mandatory Mantling Seminar

- CLIMBING CLAWS fixed: reaching the top of a block no longer leaves you bobbing at the lip like a confused seal. Once your chest clears the edge you now pop up and over onto the ledge. Hold W, climb, arrive.
- Hang Glider reminder, since people asked: keep it in your inventory, fall off something tall, HOLD SHIFT, steer with your face.

## v3.3 — Applied Bounce Physics

- NEW BLOCK: the TRAMPOLINE. Craft it from 3 string over 3 planks, place it, and every fall becomes a bigger bounce (up to a serious amount of air). Sneak to land softly. Landing on one never hurts, even sneaking.
- Mobs bounce too. Indefinitely. Build a zombie bounce pit. We cannot legally stop you.
- Not to be confused with the Pocket Trampoline gadget, which is for people who bring the bounce with them.

## v3.2 — Boss Attendance Review

- FIXED: INFERNIS and VALKYRA sometimes clocked in, noticed you were more than 64 blocks away, and clocked straight back out — permanently. Dimension bosses now spawn only when you actually arrive, are immune to distance-despawning, and RESPAWN on every visit until you genuinely kill them. Fortresses you already looted will have their boss waiting when you return.
- Boss kills are now recorded per-fortress and per-shrine in your save. Slaying stays slain.

## v3.1 — Ocular Upgrade Program

- LASER EYES have been through the lab: the beam is now thick, white-hot with a red glow, holds steady instead of strobing, has an actual laser sound, hits for triple damage, and VAPORIZES THE FIRST BLOCK IT TOUCHES about eleven times per second. Bedrock and portals are immune. Nothing else is.
- Yes, it is slightly overpowered. That is a design decision and we stand behind it from a safe distance.

## v3.0 — THE DIMENSIONS UPDATE

- THE NETHER: a roofed hell of netherrock, soul sand, glowstone and a lava sea. Build a 4x5 OBSIDIAN frame and light it with a TORCH. Home to nether fortresses, imps, hellhogs, and INFERNIS, THE MOLTEN DUKE.
- THE AETHER: islands in a bottomless sky. Build the frame from GLOWSTONE and pour a WATER BUCKET into it. Shrines, cherubs, and VALKYRA OF THE HIGH ISLES await. Fall off and you are returned to the overworld — from very, very high up.
- BUCKETS: craft from 3 iron. Scoop and pour water and lava. Water + lava = OBSIDIAN, which is also how you get portal frames. Overworld caves now bottom out in lava lakes (existing worlds get them too in unexplored terrain).
- TEN GADGETS hide in dimension dungeon chests and boss drops: Double-Jump Boots, Jetpack, Grappling Anchor, Hang Glider, Loot Magnet, Climbing Claws, Pocket Trampoline, Blink Pearl, Anti-Gravity Belt, and the Pig Cannon, which fires one (1) live pig. Passives work from your inventory; actives fire on right-click while held.
- Every gadget renders as a real 3D model in your hand (CC-BY 3.0 models by Poly by Google and Roman Miller, plus a CC0 cannon by Quaternius; see Help for credits).
- One world, three dimensions, one save file. Old worlds upgrade in place.

## v2.13 — The Consumer Rights Update

- The Battle Pass can now be PAUSED. Click its button in the DINGLE STORE (it says PAUSE once owned) to stop the dirt deliveries; click again to resume. This is the most player-friendly battle pass in the industry and we are already regretting it.

## v2.12 — The Totally Legitimate Mining Update

- NEW debug tool: X-RAY. Everything goes ghost-transparent except diamond ore, which stays solid and judgmental. Toggle it in the Debug Menu or with [ + X.
- Geology lesson: diamonds in DINGLECRAFT spawn at a FLAT rate everywhere below y=14, so any depth from y=1 to y=13 is equally good. Branch-mine around y=6 and thank us in the comments.
- X-Ray is a debug cheat: it is not saved, and your dignity does not survive the reload either.

## v2.11 — The Quality of Life Update

- Patch notes are now a scrollable archive of every update from here on. You are reading the archive right now. Meta.
- NEW Settings toggle: Mouse Capture. Turn it OFF and the browser stops flashing its “press ESC to show your cursor” note entirely — you aim by moving the mouse over the game instead. (That banner belongs to your browser, not us; this is the one legal workaround.)
- Help & Controls can no longer be escaped from. You will read the controls and you will be grateful. The Close button remains available to quitters.
- DINGLECRAFT releases now ship as separate files per version, so last night’s build keeps working while the next one is cooking.

## v2.10 — DEEP DIRT 2D: Dirt Harder

- DEEP DIRT 2D got its Big Content Patch: bigger worlds with TREES, a real hotbar (dirt/stone/wood/planks/brick/torch), CRAFTING (press C — planks, torches, brick, tool tiers), pick progression that actually speeds up mining, a gold sword, cave BATS, slime loot drops (hearts! ore!), fall damage, particles, cracking blocks, parallax hills, drifting clouds, starfields and torch glow. Collect 15 ore and craft the GOLDEN DINGLE to win.
- Old DEEP DIRT 2D saves still load. Your dirt is safe. Your dirt was always safe.
- Jumping in DEEP DIRT 2D no longer makes your actual body jump. The two of you are separate people now; the therapist said it was for the best.

<!-- manual:older -->
## Before v2.10

The in-game archive starts at v2.10. The earlier releases, in short:

- **v1.0 to v1.6:** the core sandbox, then weapons and guns, cars, doors, skateboards and tricks, disasters and the stock
  market (the PC block), then aliens, villages, romance dialogues and the mob-catching jars.
- **v1.7:** THE DINGLE CASINO (slots and blackjack) and profit and loss for every stock.
- **v1.8:** roller coasters, generated theme parks, and disasters you can make permanent and pick yourself.
- **v1.9:** egg-summoned mega-dungeons, mob spawners, XP, enchanting and the Warden. **v1.9.1:** beds, darker nights,
  fullbright.
- **v2.0:** flowing water, climbing out of water, the surf ollie, inventory sort, the death marker, armour, boats,
  tameable rideable dragons, buried dungeons and spawner vaults, the DINGLE STORE (DingleBucks, hats, trails and joke
  items), six superpowers, Dragon King roosts and the summonable Stone Titan.
- **v2.1:** the first MALGORATH: a fixed arena at X 1000, Z 1000, a letterboxed cutscene, a three-phase fight and the
  YOU WIN screen. (He was rebuilt from scratch in v6.3.)
- **v2.2:** the structure compass. **v2.2.1:** render distance up to 32.
- **v2.3:** spawn eggs for every mob, and the walking nukes (Nuke Kegs since Release 1.0). **v2.3.1:** the debug menu and per-world game rules.
- **v2.4 to v2.9:** not recorded here.
<!-- /manual:older -->
