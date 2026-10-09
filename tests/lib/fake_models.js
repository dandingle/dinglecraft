/* fake_models.js (Package C): window.HR.MODELS with the 11 cast names, stub-friendly.
   Each build returns {root, update, mats, handles, deathDur:1, viewmodel} like the real models (rig.js contract).
   Every update(dt,t,s) is logged with a copy of the fields the adapter fills, per instance (FAKE.log, FAKE.byRoot).
   Shared caches are simulated: every instance of a model shares one geometry (FAKE.geo[name]) and one cached
   material (FAKE.cache[name]), so the adapter's shared-cache detection and hrFree rules can be checked. */
'use strict';
const NAMES=['player','bunkerbrad','lilcreepah','honeybee','zombie','boomer','skeleton','spider','pig','cow','sheep'];
const FAKE={log:[],builds:{},geo:{},cache:{},inst:[],disposed:new Set(),vmUpdates:0};
function build(name){
  const T=global.THREE;
  FAKE.builds[name]=(FAKE.builds[name]||0)+1;
  const geo=FAKE.geo[name]||(FAKE.geo[name]=new T.BoxGeometry());
  const cached=FAKE.cache[name]||(FAKE.cache[name]=new T.MeshStandardMaterial());
  const own=new T.MeshStandardMaterial(),own2=new T.MeshStandardMaterial(),glow=new T.MeshStandardMaterial();
  glow.emissive.setRGB(1,0.5,0.2);                          /* authored emissive: never a flash material */
  for(const m of [geo,cached,own,own2,glow]){const d=m.dispose;m.dispose=function(){FAKE.disposed.add(this);if(d)d.call(this);};}
  const ownGeo=new T.BoxGeometry(),tinyGeo=new T.BoxGeometry();tinyGeo._r=0.02;
  for(const g of [ownGeo,tinyGeo]){const d=g.dispose;g.dispose=function(){FAKE.disposed.add(this);if(d)d.call(this);};}
  const root=new T.Group();root.name='hr_'+name;
  const J=()=>{const g=new T.Group();root.add(g);return g;};
  const handles={head:J(),aL:J(),aR:J(),lL:J(),lR:J(),torso:J()};
  const body=new T.Mesh(ownGeo,[own,own,cached]);body.castShadow=true;root.add(body);   /* one material on several faces */
  const limb=new T.Mesh(geo,own2);limb.castShadow=true;handles.aR.add(limb);
  const eye=new T.Mesh(tinyGeo,glow);eye.castShadow=true;handles.head.add(eye);
  const rec={name,root,updates:0,last:null};FAKE.inst.push(rec);
  const api={root,handles,deathDur:1,mats:[own,own2,glow,cached],
    update(dt,t,s){rec.updates++;
      rec.last={dt,t,speed:s.speed,attack:s.attack,hurt:s.hurt,dead:s.dead,yaw:s.yaw,pitch:s.pitch,fuse:s.fuse,cd:s.cd,near:s.near,
        fired:s.fired,woodHit:s.woodHit,blockHit:s.blockHit,build:s.build,plant:s.plant,grief:s.grief,mood:s.mood,talk:s.talk,
        hp:s.hp,periscope:s.periscope,headroom:s.headroom,ax:s.accel.x};
      FAKE.log.push(Object.assign({name,root},rec.last));if(FAKE.log.length>4000)FAKE.log.splice(0,2000);}};
  if(name==='player')api.viewmodel=()=>{const group=new T.Group();const m=new T.Mesh(new T.BoxGeometry(),own);group.add(m);
    return {group,update(dt,t,s){FAKE.vmUpdates++;FAKE.vmLast={fired:s.fired,woodHit:s.woodHit,blockHit:s.blockHit,speed:s.speed};}};};
  return api;}
global.window=global.window||global;
global.HR={MODELS:{},fake:true};
for(const n of NAMES)global.HR.MODELS[n]=()=>build(n);
module.exports={FAKE,NAMES,afterBoot(V){V.hrInstallFake();}};
