/* Hyperreal pack: shared rig for character/mob models.
   Every model file registers HR.MODELS[name] = build => {root, update(dt, t, s)}.
   Units are blocks (1 block = 16 "pixels" of the classic model scale). Feet sit at y = 0, facing +z.
   s (animation state) = {speed 0..1 walk cycle, attack 0..1, hurt 0..1, dead 0..1, yaw, pitch (head look, radians), seed}.
   Models must never allocate per frame. Textures live in ../final_ent/<id>_{basecolor,normal,roughness}.png;
   missing files fall back to a flat colour so a model can be built before its textures exist.
   Texture I/O goes through four overridable hooks, so the same sources run in preview.html and inside the game
   (DINGLECRAFT v6.0 splices them into hrLoadModels() and sets these BEFORE this file runs):
     HR.texURL(id, suffix)     -> url ('' = no such texture: the material's flat-colour fallback runs)
     HR.loadTex(url, srgb, onFail) -> THREE.Texture (the game returns shared, pre-decoded textures)
     HR.loadImg(url, cb)       -> calls cb(img) once the image is ready (raw canvas painters: skeleton, spider)
     HR.EMBEDDED               -> true when the textures are data URIs: no retries, no ?query suffixes
   HR.BUST (preview only) cache-busts the preview's http URLs; the game leaves it undefined. */
(function(){
const HR = window.HR = window.HR || {};
HR.MODELS = HR.MODELS || {};
HR.TEXBASE = HR.TEXBASE || '../final_ent/';
HR.HAS_ROUGH = new Set(['mat_skin', 'mat_jersey', 'mat_burlap', 'mat_rotflesh', 'mat_bone', 'mat_mossflesh']);
const loader = new THREE.TextureLoader();
const cache = {};
let anis = 8;
HR.setAnisotropy = a => { anis = a; };

HR.texURL = HR.texURL || ((id, suf) => HR.TEXBASE + id + suf + (HR.BUST ? '?v=' + HR.BUST : ''));
/* a cache-busting retry URL for a texture that dropped (http only: never called when HR.EMBEDDED) */
HR.retryURL = HR.retryURL || (u => u + (u.indexOf('?') < 0 ? '?' : '&') + 'retry=' + Date.now());
function load(url, srgb, onFail) {
  if (!url) { const t = new THREE.Texture(); if (onFail) Promise.resolve().then(onFail); return t; }   /* async, like a 404 */
  const t = loader.load(url, undefined, undefined, onFail);
  t.anisotropy = anis;
  if (srgb) t.encoding = THREE.sRGBEncoding;
  return t;
}
HR.loadTex = HR.loadTex || load;
/* raw image for canvas painters; http loads retry 3 times (the preview server drops the odd request) */
HR.loadImg = HR.loadImg || function (url, cb) {
  if (!url) return;
  const im = new Image(); let tries = 0;
  im.onload = () => cb(im);
  im.onerror = () => { if (!HR.EMBEDDED && ++tries < 4) setTimeout(() => { im.src = HR.retryURL(url); }, 800 * tries); };
  im.src = url;
};
/* material for a texture id. opts: {color, rough, metal, normalScale, alpha (cutout), emissive, emissiveMap id, side, transparent, opacity} */
HR.mat = function(id, opts) {
  opts = opts || {};
  const key = id + '|' + JSON.stringify(opts);
  if (cache[key]) return cache[key];
  const m = new THREE.MeshStandardMaterial({
    color: opts.color !== undefined ? opts.color : 0xffffff,
    roughness: opts.rough !== undefined ? opts.rough : 1,
    metalness: opts.metal || 0,
    side: opts.side || THREE.FrontSide,
    transparent: !!opts.transparent, opacity: opts.opacity !== undefined ? opts.opacity : 1,
  });
  if (id) {
    /* an empty URL (texture not embedded) takes the fallback right away, so clones made from this base inherit it */
    const fbMap = () => { m.map = null; m.color.set(opts.fallback || 0x8a7a6a); m.needsUpdate = true; };
    const uB = HR.texURL(id, '_basecolor.png');
    if (uB) m.map = HR.loadTex(uB, true, fbMap); else fbMap();
    const uN = opts.normal !== false ? HR.texURL(id, '_normal.png') : '';
    if (uN) m.normalMap = HR.loadTex(uN, false, () => { m.normalMap = null; m.needsUpdate = true; });
    /* only the tileable materials ship a roughness map; asking for others 404s and a clone made before
       the failure would keep a dead texture */
    const uR = (opts.roughMap === true || (opts.roughMap !== false && HR.HAS_ROUGH.has(id))) ? HR.texURL(id, '_roughness.png') : '';
    if (uR) m.roughnessMap = HR.loadTex(uR, false, () => { m.roughnessMap = null; m.needsUpdate = true; });
    const ns = opts.normalScale !== undefined ? opts.normalScale : 1.2;
    m.normalScale = new THREE.Vector2(ns, ns);
    if (opts.alpha) { m.alphaTest = 0.5; m.transparent = false; }
    if (opts.repeat) { for (const t of [m.map, m.normalMap, m.roughnessMap]) if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); } }
  } else if (opts.fallback !== undefined) m.color.set(opts.fallback);
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity || 1; }
  return cache[key] = m;
};
/* plain coloured material (eyes, wet highlights, glowing bits) */
HR.flat = function(color, opts) {
  opts = opts || {};
  const key = 'flat|' + color + '|' + JSON.stringify(opts);
  if (cache[key]) return cache[key];
  return cache[key] = new THREE.MeshStandardMaterial({ color, roughness: opts.rough !== undefined ? opts.rough : 0.6, metalness: opts.metal || 0,
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0), emissiveIntensity: opts.emissiveIntensity || 1,
    transparent: !!opts.transparent, opacity: opts.opacity !== undefined ? opts.opacity : 1 });
};
/* box part. mats: one material, or {px,nx,py,ny,pz,nz, all} (pz = front). uv: optional {face: [u0,v0,u1,v1]} crop per face. */
HR.box = function(w, h, d, mats, uv) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (uv) {
    const order = ['px', 'nx', 'py', 'ny', 'pz', 'nz'], a = g.attributes.uv;
    order.forEach((f, fi) => { const c = uv[f]; if (!c) return;
      for (let i = 0; i < 4; i++) { const j = fi * 4 + i; const u = a.getX(j), v = a.getY(j); a.setXY(j, c[0] + u * (c[2] - c[0]), c[1] + v * (c[3] - c[1])); } });
    a.needsUpdate = true;
  }
  let material = mats;
  if (mats && !(mats instanceof THREE.Material)) {
    const all = mats.all || HR.flat(0x888888);
    material = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(k => mats[k] || all);
  }
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  return m;
};
HR.cyl = function(rTop, rBot, h, mat, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg || 10), mat);
  m.castShadow = m.receiveShadow = true; return m;
};
HR.sphere = function(r, mat, seg) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg || 16, Math.max(8, (seg || 16) >> 1)), mat);
  m.castShadow = true; return m;
};
/* a joint: Group placed at (x,y,z) in parent space; add children offset from the pivot */
HR.joint = function(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; };
/* attach mesh to parent at offset */
HR.at = function(parent, mesh, x, y, z) { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };

/* smooth value noise for twitches: returns -1..1 */
HR.noise = function(t, seed) {
  const i = Math.floor(t), f = t - i, s = (seed || 0) * 13.37;
  const h = n => { const x = Math.sin((n + s) * 127.1) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
};
/* spiky twitch: mostly 0, occasional sharp jerks */
HR.twitch = function(t, seed, rate, sharp) {
  const n = HR.noise(t * (rate || 1.3), seed);
  const k = sharp || 6;
  return Math.sign(n) * Math.pow(Math.abs(n), k);
};
/* damped pendulum for dangling parts: p = {a, v}; drive = angular push from body motion */
HR.pendulum = function(p, dt, drive, stiff, damp) {
  stiff = stiff || 18; damp = damp || 3.2;
  const acc = -stiff * p.a - damp * p.v + drive;
  p.v += acc * dt; p.a += p.v * dt;
  if (p.a > 1.4) { p.a = 1.4; p.v *= -0.3; } if (p.a < -1.4) { p.a = -1.4; p.v *= -0.3; }
  return p.a;
};
/* blink helper: returns 0..1 eyelid closure */
HR.blink = function(t, seed, every) {
  every = every || 4.2;
  const ph = (t + (seed || 0) * 1.7) % every;
  return ph < 0.12 ? Math.sin(ph / 0.12 * Math.PI) : 0;
};
HR.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
})();

