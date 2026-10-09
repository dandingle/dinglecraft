#!/usr/bin/env python3
"""pack_assets.py (Package A): embeds the Hyperreal art into the game build.

  python3 tools/art/texpacks/pack_assets.py --src <hyperreal workspace> [--out FILE] [--profile lite|std|ultra] [-j N]
  python3 tools/art/texpacks/pack_assets.py --src <hyperreal workspace> --check [--gen FILE] [--manifest FILE]
  python3 tools/art/texpacks/pack_assets.py --src <hyperreal workspace> --only t:grass_top,e:face_dan
  (--src defaults to $DC_ART_SRC.) Usually you run `npm run repack`, which calls this and then tools/assets/unpack.mjs.

v6.1 (P7): a tile may carry "px" in hr_tiles.json (packed at min(px, profile block px)); every pg_* tile defaults to 256.

Reads (never modifies, never regenerates):
  <src>/final/<tile>_{basecolor,normal,roughness,height}.png                  (the tile maps)
  <src>/final_ent/<id>_{basecolor,normal,roughness}.png                       (only the ids the cast models reference)
  assets/pack-inputs/tiles.json      (the tile list + art flags; a copy of <src>/final/tiles.json, warned when they differ)
  assets/pack-inputs/hr_tiles.json   (hand-authored flag overrides)
  src/texpacks/models/*.js           (the cast models, scanned for referenced entity ids)
Writes (default out/art/, gitignored):
  hr_assets.gen.js        (std/lite)  or  hr_assets.ultra.gen.js (ultra)
  hr_assets.manifest.json (std/lite)  or  hr_assets.ultra.manifest.json      (next to the .gen.js)
tools/assets/unpack.mjs turns the .gen.js into assets/packed/hr/ (the committed payloads); the build reassembles it byte for
byte. NEVER print the .gen.js: its lines are megabytes long.
--check validates the build's assembled hr_assets.gen.js (build/, or $DC_BUILD; run `npm run build` first) and
assets/packed/hr/manifest.json against the sources, without encoding.
The header line names this tool's repo path (Release 1.0, game 6.4; up to v6.3 it named the pre-repo path, which was part of
the packed bytes then).

Keys (data:image/webp;base64 URIs; every image is opaque, so canvas premultiplication can never eat data):
  t:<tile>|c  albedo RGB (alpha pixels colour-bled first, so mipmaps get no dark fringes), lossy q82
  t:<tile>|n  THREE stacked grey planes (width px, height 3px): normal X / normal Y (OpenGL, +Y up) / roughness, lossy q85.
              (Deviation from the plan's RGB packing: lossy WebP is 4:2:0, so XY in chroma lost up to 25/255; grey
              planes keep every channel at full resolution, ~2/255.)
  t:<tile>|m  lossless RGB = (alpha, emissive mask, 0), only for tiles with alpha or emission
  e:<id>|b|n|r  entity basecolor / normal / roughness, plain RGB (C's loader hands them straight to THREE.Texture)
Deterministic: the same inputs and Pillow version give the same bytes.
"""
import argparse, base64, hashlib, io, json, os, re, sys, time
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image, features

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import dcpaths  # noqa: E402  (repo-relative paths + the art workspaces from the environment)

SRC = None              # the Hyperreal workspace (set_src); worker processes inherit it through $DC_ART_SRC
FINAL = FINAL_ENT = None
MODELS = dcpaths.MODELS
OUT_DIR = dcpaths.R('out', 'art') + '/'
MANIFEST_IN = dcpaths.PACK_INPUTS + 'hr_tiles.json'
TILES_IN = dcpaths.PACK_INPUTS + 'tiles.json'


def set_src(cli=None, required=True):
    """point FINAL/FINAL_ENT at the workspace (--src or $DC_ART_SRC); exported so spawned workers see the same folder"""
    global SRC, FINAL, FINAL_ENT
    SRC = dcpaths.hr_src(cli, required)
    if SRC:
        os.environ['DC_ART_SRC'] = SRC
        FINAL, FINAL_ENT = SRC + 'final/', SRC + 'final_ent/'
    return SRC


set_src(required=False)   # import time: from the environment if set (workers), else main() asks for --src
GEN_VERSION = 'pack_assets 1.1'

PROFILES = {
    #        block px  hero b/n/r        other b/n/r      cap (bytes of base64 payload)
    'lite':  dict(block=256,  hero=(512, 256, 256),   other=(512, 256, 256),  cap=16_000_000),
    'std':   dict(block=512,  hero=(1024, 512, 256),  other=(512, 512, 256),  cap=45_000_000),   # v6.1: 45 MB (P0 at A0; P7 owns this file)
    'ultra': dict(block=1024, hero=(1024, 1024, 1024), other=(1024, 1024, 1024), cap=90_000_000),
}
HERO = re.compile(r'^(face_.*|fist_dan|skull_front|eye_human)$')
PG_TILE_PX = 256    # v6.1 (P7): Puppet Purgatory tiles (pg_*) pack at 256 px unless hr_tiles.json gives a "px" (plan D9 / 8.6)
Q = dict(c=82, n=85, eb=82, en=88, er=80)
ROT = {'none': 0, 'tb': 1, 'all': 2}
EMASK = ('none', 'full', 'lum', 'flame')


def out_paths(profile, gen=None):
    sfx = '.ultra' if profile == 'ultra' else ''
    gen = os.path.abspath(gen) if gen else OUT_DIR + 'hr_assets%s.gen.js' % sfx
    return gen, os.path.join(os.path.dirname(gen), 'hr_assets%s.manifest.json' % sfx)


def sha1(path):
    with open(path, 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()


def webp(arr_or_img, **kw):
    im = arr_or_img if isinstance(arr_or_img, Image.Image) else Image.fromarray(arr_or_img)
    if im.mode != 'RGB':
        im = im.convert('RGB')
    b = io.BytesIO()
    im.save(b, 'WEBP', method=6, **kw)
    return b.getvalue()


def resize_f(a, w, h):
    """Lanczos-resize a float plane (any range)."""
    if a.shape[1] == w and a.shape[0] == h:
        return a.astype(np.float32)
    return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((w, h), Image.LANCZOS), dtype=np.float32)


def fit(w, h, target):
    """scale so the long side is `target` (never upscale)."""
    s = min(1.0, target / float(max(w, h)))
    return max(1, int(round(w * s))), max(1, int(round(h * s)))


def bleed(rgb, w):
    """pull-push fill: every pixel with w==0 gets the average colour of the nearest opaque region (all mip levels clean)."""
    H, W = w.shape
    if H & (H - 1) or W & (W - 1):                      # not a power of two: plain iterative dilation
        out = rgb.copy(); m = w > 0
        for _ in range(64):
            if m.all():
                break
            acc = np.zeros_like(out); n = np.zeros(m.shape, np.float32)
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                sm = np.roll(m, (dy, dx), (0, 1)); so = np.roll(out, (dy, dx), (0, 1))
                acc += so * sm[..., None]; n += sm
            grow = (~m) & (n > 0)
            out[grow] = acc[grow] / n[grow][..., None]; m = m | grow
        return out
    levels = [(rgb * w[..., None], w.astype(np.float64))]
    c, ww = levels[0]
    while c.shape[0] > 1 and c.shape[1] > 1:
        c = c.reshape(c.shape[0] // 2, 2, c.shape[1] // 2, 2, 3).sum((1, 3))
        ww = ww.reshape(ww.shape[0] // 2, 2, ww.shape[1] // 2, 2).sum((1, 3))
        levels.append((c, ww))
    c, ww = levels[-1]
    col = c / np.maximum(ww, 1e-9)[..., None]
    for c, ww in reversed(levels[:-1]):
        up = col.repeat(2, 0).repeat(2, 1)
        cur = c / np.maximum(ww, 1e-9)[..., None]
        col = np.where((ww > 0)[..., None], cur, up)
    return np.where((w > 0)[..., None], rgb, col)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ inputs

def load_manifest():
    with open(MANIFEST_IN, encoding='utf-8') as f:
        man = json.load(f)
    with open(TILES_IN, encoding='utf-8') as f:
        art = json.load(f)
    aliases = man.get('aliases', {})
    canon = {}
    warn = []
    for name in sorted(art):
        a = art[name] or {}
        if name in aliases:
            tgt = aliases[name]
            if tgt in art or os.path.exists(FINAL + tgt + '_basecolor.png'):
                warn.append('alias %s dropped (canonical %s exists)' % (name, tgt)); continue
            name = tgt
        canon[name] = a
    tiles = {}
    for name in sorted(set(canon) | set(man.get('tiles', {}))):
        f = dict(man['defaults'])
        a = canon.get(name)
        if a is not None:
            if a.get('rot') is True:
                f['rot'] = 'all'; f['mirror'] = True
            if isinstance(a.get('rough'), (int, float)):
                f['rough'] = float(a['rough'])
        f.update(man.get('tiles', {}).get(name, {}))
        if 'px' not in f and name.startswith('pg_'):
            f['px'] = PG_TILE_PX
        if f['rot'] not in ROT or f['emask'] not in EMASK:
            raise SystemExit('hr_tiles.json: bad rot/emask on ' + name)
        if f['rot'] == 'none':
            f['mirror'] = False
        f['img'] = bool(a is not None and os.path.exists(FINAL + name + '_basecolor.png'))
        tiles[name] = f
    for n in sorted(set(canon) - {k for k, v in tiles.items() if v['img']}):
        warn.append('tile %s listed in final/tiles.json but has no basecolor' % n)
    return tiles, warn


def model_ent_ids():
    """entity texture ids the cast models reference: every quoted identifier in models/*.js that names a final_ent id."""
    have = sorted({re.sub(r'_(basecolor|normal|roughness|height)\.png$', '', f)
                   for f in os.listdir(FINAL_ENT) if f.endswith('_basecolor.png')})
    lits = set()
    for fn in sorted(os.listdir(MODELS)):
        if fn.endswith('.js'):
            with open(MODELS + fn, encoding='utf-8') as f:
                lits |= set(re.findall(r"['\"]([a-z][a-z0-9_]*)['\"]", f.read()))
    ref = [i for i in have if i in lits]
    unref = [i for i in have if i not in lits]
    # ids a model asks HR.mat/hmat/texUrl for that have no texture (the model's flat-colour fallback runs)
    asked = set()
    for fn in sorted(os.listdir(MODELS)):
        if fn.endswith('.js'):
            with open(MODELS + fn, encoding='utf-8') as f:
                asked |= set(re.findall(r"(?:HR\.mat|hmat|texUrl|texURL)\(\s*['\"]([a-z][a-z0-9_]*)['\"]", f.read()))
    missing = sorted(asked - set(have))
    return ref, unref, missing


# ------------------------------------------------------------------ encoders (run in worker processes)

def enc_tile(name, f, px):
    srcs = {k: FINAL + name + '_' + k + '.png' for k in ('basecolor', 'normal', 'roughness', 'height')}
    srcs = {k: v for k, v in srcs.items() if os.path.exists(v)}
    notes = []
    bc = Image.open(srcs['basecolor']).convert('RGBA')
    W, H = bc.size
    tw, th = fit(W, H, px)
    if (tw, th) != (px, px):
        notes.append('tile %s is %dx%d: packed at %dx%d' % (name, W, H, tw, th))
        tw = th = min(tw, th)                     # array layers are square
    a = np.asarray(bc, dtype=np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    has_alpha = alpha.min() < 250
    if has_alpha:
        rgb = bleed(rgb, (alpha >= 128).astype(np.float32))
    out = {}
    c8 = np.stack([resize_f(rgb[..., i], tw, th) for i in range(3)], -1)
    out['c'] = webp(np.clip(c8 + .5, 0, 255).astype(np.uint8), quality=Q['c'])
    # normal (OpenGL +Y). Sanity: G must correlate positively with d(height)/d(row) where a height map exists.
    if 'normal' in srcs:
        n = np.asarray(Image.open(srcs['normal']).convert('RGB'), dtype=np.float32) / 127.5 - 1.0
        if n.shape[:2] != (H, W):
            n = np.stack([resize_f(n[..., i], W, H) for i in range(3)], -1)
        if 'height' in srcs:
            h = np.asarray(Image.open(srcs['height']).convert('F'), dtype=np.float32)
            if h.shape == n.shape[:2]:
                # OpenGL: n.x ~ -dh/dcol (corr < 0), n.y ~ +dh/drow (corr > 0). X is the reference for the convention:
                # a DirectX map has X right and Y inverted (snow ships that way).
                cy = float(np.corrcoef(n[..., 1].ravel(), (np.roll(h, -1, 0) - np.roll(h, 1, 0)).ravel())[0, 1])
                cx = float(np.corrcoef(n[..., 0].ravel(), (np.roll(h, -1, 1) - np.roll(h, 1, 1)).ravel())[0, 1])
                if cx > 0.2:
                    n[..., 0] = -n[..., 0]; notes.append('tile %s: normal R flipped (corr x %+.2f)' % (name, cx))
                if (abs(cx) >= 0.2 and cy < -0.1) or (abs(cx) < 0.2 and cy < -0.3):
                    n[..., 1] = -n[..., 1]; notes.append('tile %s: DirectX normal, G flipped to OpenGL (corr x %+.2f, y %+.2f)' % (name, cx, cy))
                elif abs(cy) < 0.3 and abs(cx) < 0.3:
                    notes.append('tile %s: weak normal/height correlation (x %+.2f, y %+.2f), kept' % (name, cx, cy))
        nx, ny, nz = (resize_f(n[..., i], tw, th) for i in range(3))
        ln = np.sqrt(nx * nx + ny * ny + np.maximum(nz, 0) ** 2) + 1e-6
        nx, ny = nx / ln, ny / ln
    elif f.get('derive_normal'):
        lum = (rgb @ np.array([.2126, .7152, .0722], np.float32)) / 255.0
        lum = resize_f(lum, tw, th)
        dx = (np.roll(lum, -1, 1) - np.roll(lum, 1, 1)) * 2.0; dy = (np.roll(lum, 1, 0) - np.roll(lum, -1, 0)) * 2.0
        ln = np.sqrt(dx * dx + dy * dy + 1)
        nx, ny = -dx / ln, -dy / ln
    else:
        nx = np.zeros((th, tw), np.float32); ny = np.zeros((th, tw), np.float32)
    if 'roughness' in srcs:
        r = resize_f(np.asarray(Image.open(srcs['roughness']).convert('L'), dtype=np.float32), tw, th) * float(f['rough'])
    else:
        r = np.full((th, tw), 255.0 * float(f['rough']), np.float32)
    to8 = lambda v: np.clip(np.round(v), 0, 255).astype(np.uint8)
    stack = np.concatenate([to8((nx + 1) * 127.5), to8((ny + 1) * 127.5), to8(r)], 0)
    out['n'] = webp(Image.fromarray(stack, 'L'), quality=Q['n'])
    # mask: alpha + emissive
    em = None
    if f['emissive'] and f['emask'] != 'none':
        lum = (rgb @ np.array([.2126, .7152, .0722], np.float32)) / 255.0
        if f['emask'] == 'full':
            em = np.full(alpha.shape, 255.0, np.float32)
        elif f['emask'] == 'lum':          # emin = glow floor, elo/ehi = the luminance ramp (lava: dim crust, bright melt)
            lo, hi, fl = float(f.get('elo', .45)), float(f.get('ehi', .85)), float(f.get('emin', 0))
            em = (fl + (1 - fl) * smoothstep(lo, hi, lum)) * 255.0
        else:  # flame
            mx, mn = rgb.max(-1), rgb.min(-1)
            sat = (mx - mn) / np.maximum(mx, 1e-3)
            em = ((sat > .35) & (lum > .55) & (alpha > 0)).astype(np.float32) * 255.0
    if has_alpha or em is not None:
        ar = resize_f(alpha, tw, th) if has_alpha else np.full((th, tw), 255.0, np.float32)
        er = resize_f(em, tw, th) if em is not None else np.zeros((th, tw), np.float32)
        m = np.stack([to8(ar), to8(er), np.zeros((th, tw), np.uint8)], -1)
        out['m'] = webp(m, lossless=True, quality=100)
    shas = {k: sha1(v) for k, v in srcs.items()}
    return name, out, tw, has_alpha, em is not None, shas, notes


def enc_ent(eid, sizes):
    tb, tn, tr = sizes
    out, dims, shas = {}, {}, {}
    p = FINAL_ENT + eid + '_basecolor.png'
    im = Image.open(p).convert('RGB'); shas['basecolor'] = sha1(p)
    w, h = fit(*im.size, tb)
    out['b'] = webp(im if im.size == (w, h) else im.resize((w, h), Image.LANCZOS), quality=Q['eb']); dims['b'] = [w, h]
    p = FINAL_ENT + eid + '_normal.png'
    if os.path.exists(p):
        shas['normal'] = sha1(p)
        n = np.asarray(Image.open(p).convert('RGB'), dtype=np.float32) / 127.5 - 1.0
        w, h = fit(n.shape[1], n.shape[0], tn)
        nx, ny, nz = (resize_f(n[..., i], w, h) for i in range(3))
        ln = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6
        rgb = np.stack([nx / ln, ny / ln, nz / ln], -1)
        out['n'] = webp(np.clip(np.round((rgb + 1) * 127.5), 0, 255).astype(np.uint8), quality=Q['en']); dims['n'] = [w, h]
    p = FINAL_ENT + eid + '_roughness.png'
    if os.path.exists(p):
        shas['roughness'] = sha1(p)
        im = Image.open(p).convert('L')
        w, h = fit(*im.size, tr)
        out['r'] = webp((im if im.size == (w, h) else im.resize((w, h), Image.LANCZOS)).convert('RGB'), quality=Q['er']); dims['r'] = [w, h]
    return eid, out, dims, shas


# ------------------------------------------------------------------ build / check

def b64uri(b):
    return 'data:image/webp;base64,' + base64.b64encode(b).decode('ascii')


def meta_tile(name, f, layer_px=None, mask=False):
    return {'n': name, 'rot': ROT[f['rot']], 'mirror': 1 if f['mirror'] else 0, 'ns': round(float(f['ns']), 3),
            'rough': round(float(f['rough']), 3), 'em': round(float(f['emissive']), 3), 'up': 1 if f['up'] else 0,
            'scroll': 1 if f['scroll'] else 0, 'water': 1 if f['water'] else 0, 'opaque': 1 if f['opaque'] else 0,
            'img': 1 if f['img'] else 0, 'mask': 1 if mask else 0}


def build(profile, only, jobs):
    P = PROFILES[profile]
    tiles, warn = load_manifest()
    ref, unref, missing = model_ent_ids()
    want = None
    if only:
        want = set(only.split(','))
    t0 = time.time()
    tasks_t = [(n, f) for n, f in tiles.items() if f['img'] and (want is None or 't:' + n in want)]
    tasks_e = [e for e in ref if want is None or 'e:' + e in want]
    res_t, res_e = {}, {}
    with ProcessPoolExecutor(max_workers=jobs) as ex:
        ft = {ex.submit(enc_tile, n, f, min(P['block'], int(f.get('px', P['block'])))): n for n, f in tasks_t}   # per-tile px override (v6.1)
        fe = {ex.submit(enc_ent, e, P['hero'] if HERO.match(e) else P['other']): e for e in tasks_e}
        for fu in ft:
            r = fu.result(); res_t[r[0]] = r
        for fu in fe:
            r = fu.result(); res_e[r[0]] = r
    entries, per_key = {}, {}
    meta_tiles = []
    srcs = {}
    for name in sorted(tiles):
        f = tiles[name]
        if name in res_t:
            _, out, tw, has_a, has_e, shas, notes = res_t[name]
            warn += notes
            for k, b in out.items():
                key = 't:%s|%s' % (name, k)
                entries[key] = b64uri(b)
                per_key[key] = {'bytes': len(entries[key]), 'px': [tw, tw * 3 if k == 'n' else tw]}
            srcs['t:' + name] = shas
            meta_tiles.append(meta_tile(name, f, tw, 'm' in out))
        elif want is None:
            meta_tiles.append(meta_tile(name, dict(f, img=False)))
    ents = []
    for eid in sorted(res_e):
        _, out, dims, shas = res_e[eid]
        for k, b in out.items():
            key = 'e:%s|%s' % (eid, k)
            entries[key] = b64uri(b)
            per_key[key] = {'bytes': len(entries[key]), 'px': dims[k]}
        srcs['e:' + eid] = shas
        ents.append(eid)
    total = sum(len(v) for v in entries.values())
    meta = {'v': 1, 'profile': profile, 'blockPx': P['block'], 'nLayout': 'stack3', 'gen': GEN_VERSION,
            'tiles': meta_tiles, 'ents': ents, 'bytes': total}
    return meta, entries, per_key, srcs, warn, (ref, unref, missing), time.time() - t0


def write(profile, meta, entries, per_key, srcs, warn, ents_info, secs, gen_out=None):
    gen, manp = out_paths(profile, gen_out)
    os.makedirs(os.path.dirname(gen), exist_ok=True)
    mj = json.dumps(meta, separators=(',', ':'), sort_keys=False)
    lines = ['/* PART 54 ASSETS - GENERATED by tools/art/texpacks/pack_assets.py (profile %s). Do not edit. '
             'Do not print (lines are megabytes long). */' % profile,
             'function hrAssetMeta(){return %s;}' % mj,
             'function hrAssets(){return hrAssets.T||(hrAssets.T={']
    for k in sorted(entries):
        lines.append('%s:%s,' % (json.dumps(k), json.dumps(entries[k])))
    lines.append('});}')
    lines.append("if(typeof module!=='undefined'&&module.exports)module.exports={hrAssets,hrAssetMeta};")
    txt = '\n'.join(lines) + '\n'
    assert txt.isascii() and '<' not in txt, 'generated assets must be ASCII with no <'
    cap = PROFILES[profile]['cap']
    if len(txt) > cap:
        raise SystemExit('FAIL: %s is %d bytes > %s cap %d' % (os.path.basename(gen), len(txt), profile, cap))
    tmp = gen + '.tmp'
    with open(tmp, 'w', encoding='ascii') as f:
        f.write(txt)
    os.replace(tmp, gen)
    ref, unref, missing = ents_info
    man = {'v': 1, 'profile': profile, 'gen': GEN_VERSION, 'pillow': Image.__version__, 'file': os.path.basename(gen),
           'fileBytes': len(txt), 'payloadBytes': meta['bytes'], 'fileSha1': hashlib.sha1(txt.encode('ascii')).hexdigest(),
           'secs': round(secs, 1),
           'coverage': {'tilesWithArt': [t['n'] for t in meta['tiles'] if t['img']],
                        'tilesFallbackOnly': [t['n'] for t in meta['tiles'] if not t['img']],
                        'entIds': meta['ents'], 'entIdsNotReferenced': unref, 'modelIdsWithoutTexture': missing},
           'keys': per_key, 'sources': srcs, 'warnings': warn}
    with open(manp, 'w', encoding='utf-8') as f:
        json.dump(man, f, indent=1, sort_keys=True)
        f.write('\n')
    return gen, manp, len(txt)


def check(profile, gen=None, manp=None):
    """re-validate the generated file against the current sources, without re-encoding. Exit 1 when stale/broken.
    std: the build's assembled hr_assets.gen.js + assets/packed/hr/manifest.json (the committed pack)."""
    if profile == 'std':
        gen = os.path.abspath(gen) if gen else dcpaths.build_dir() + 'hr_assets.gen.js'
        manp = os.path.abspath(manp) if manp else dcpaths.PACKED + 'hr/manifest.json'
    else:
        g, m = out_paths(profile, gen)
        gen, manp = g, (os.path.abspath(manp) if manp else m)
    bad = []
    if not os.path.exists(gen) or not os.path.exists(manp):
        print('FAIL: %s or %s not found (run `npm run build` first%s)' % (dcpaths.rel(gen), dcpaths.rel(manp),
              '' if profile == 'std' else '; pack with --profile ' + profile))
        return 1
    with open(manp, encoding='utf-8') as f:
        man = json.load(f)
    raw = open(gen, 'rb').read()
    if hashlib.sha1(raw).hexdigest() != man['fileSha1']:
        bad.append('generated file does not match its manifest (edited by hand?)')
    try:
        txt = raw.decode('ascii')
    except UnicodeDecodeError:
        bad.append('generated file is not ASCII'); txt = raw.decode('latin1')
    if '<' in txt:
        bad.append('generated file contains <')
    if not txt.endswith('\n'):
        bad.append('generated file has no trailing newline')
    if len(raw) > PROFILES[profile]['cap']:
        bad.append('size %d > cap %d' % (len(raw), PROFILES[profile]['cap']))
    lines = txt.split('\n')
    m = re.match(r'^function hrAssetMeta\(\)\{return (.*);\}$', lines[1]) if len(lines) > 1 else None
    meta = json.loads(m.group(1)) if m else None
    if not meta:
        bad.append('hrAssetMeta() line not found')
        meta = {'tiles': [], 'ents': []}
    keys = {}
    for ln in lines[3:]:
        mm = re.match(r'^"([^"]+)":"(data:image/webp;base64,[A-Za-z0-9+/=]+)",$', ln)
        if mm:
            keys[mm.group(1)] = mm.group(2)
        elif ln.startswith('"'):
            bad.append('malformed asset line ' + ln[:40])
    for k, v in keys.items():
        head = base64.b64decode(v[23:23 + 24])
        if head[:4] != b'RIFF' or head[8:12] != b'WEBP':
            bad.append('not a WebP: ' + k)
    tiles, _ = load_manifest()
    ref, _, _ = model_ent_ids()
    art = {n for n, f in tiles.items() if f['img']}
    for n in sorted(art):
        for s in 'cn':
            if 't:%s|%s' % (n, s) not in keys:
                bad.append('missing t:%s|%s' % (n, s))
    for e in ref:
        if 'e:%s|b' % e not in keys:
            bad.append('missing e:%s|b' % e)
    mt = {t['n']: t for t in meta['tiles']}
    if set(mt) != set(tiles):
        bad.append('meta tile set differs from the manifest (+%s -%s)' % (sorted(set(tiles) - set(mt))[:5], sorted(set(mt) - set(tiles))[:5]))
    for n, f in tiles.items():
        t = mt.get(n)
        if t and (t['rot'], t['mirror'], t['up'], t['em'], t['img']) != (ROT[f['rot']], 1 if f['mirror'] else 0, 1 if f['up'] else 0,
                                                                         round(float(f['emissive']), 3), 1 if f['img'] else 0):
            bad.append('flags of %s changed since the build' % n)
    for key, shas in man.get('sources', {}).items():
        kind, name = key.split(':', 1)
        base = (FINAL if kind == 't' else FINAL_ENT) + name + '_'
        for k, h in shas.items():
            p = base + k + '.png'
            if not os.path.exists(p):
                bad.append('source gone: ' + os.path.relpath(p, SRC))
            elif sha1(p) != h:
                bad.append('source changed: ' + os.path.relpath(p, SRC))
    for n in art:
        if 't:' + n not in man.get('sources', {}):
            bad.append('new art not packed: ' + n)
    for line in bad[:40]:
        print('FAIL: ' + line)
    print('pack_assets --check (%s): %d keys, %d tiles with art, %d entity ids, %d bytes: %s' % (
        profile, len(keys), len(art), len(meta.get('ents', [])), len(raw), 'OK' if not bad else '%d problem(s)' % len(bad)))
    return 1 if bad else 0


def tiles_drift():
    """the workspace's own final/tiles.json vs the committed pack input"""
    s = FINAL + 'tiles.json'
    if os.path.exists(s) and open(s, 'rb').read() != open(TILES_IN, 'rb').read():
        return ('the workspace final/tiles.json differs from assets/pack-inputs/tiles.json: the committed copy was used '
                '(copy it over first if the change is intended)')
    return None


def main():
    ap = argparse.ArgumentParser(description='Embed the Hyperreal art into hr_assets*.gen.js (then tools/assets/unpack.mjs)')
    ap.add_argument('--src', default=None, help='the Hyperreal workspace holding final/ and final_ent/ (default $DC_ART_SRC)')
    ap.add_argument('--out', default=None, help='the .gen.js to write (default out/art/hr_assets[.ultra].gen.js); the manifest goes beside it')
    ap.add_argument('--gen', default=None, help='--check: the assembled .gen.js to validate (default build/ or $DC_BUILD)')
    ap.add_argument('--manifest', default=None, help='--check: the manifest to validate against (default assets/packed/hr/manifest.json)')
    ap.add_argument('--profile', choices=sorted(PROFILES), default='std')
    ap.add_argument('--check', action='store_true', help='validate the generated file against the sources; no encoding')
    ap.add_argument('--only', default='', help='comma list of keys (t:<tile>,e:<id>): encode and report only, write nothing')
    ap.add_argument('-j', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    a = ap.parse_args()
    set_src(a.src)
    drift = tiles_drift()
    if drift:
        print('  note: ' + drift)
    if a.check:
        sys.exit(check(a.profile, a.gen, a.manifest))
    if not features.check('webp'):
        raise SystemExit('Pillow lacks WebP support')
    meta, entries, per_key, srcs, warn, ents_info, secs = build(a.profile, a.only, a.j)
    if a.only:
        for k in sorted(per_key):
            print('%-28s %8d bytes  %s' % (k, per_key[k]['bytes'], 'x'.join(map(str, per_key[k]['px']))))
        print('(--only: nothing written)')
        return
    gen, manp, size = write(a.profile, meta, entries, per_key, srcs, warn, ents_info, secs, a.out)
    img = sum(1 for t in meta['tiles'] if t['img'])
    print('pack_assets (%s): %d tiles with art (+%d fallback-only), %d entity ids, %d keys, %.1f MB -> %s (%.0fs)' % (
        a.profile, img, len(meta['tiles']) - img, len(meta['ents']), len(entries), size / 1e6, dcpaths.rel(gen), secs))
    for w in warn:
        print('  note: ' + w)
    ref, unref, missing = ents_info
    if unref:
        print('  note: final_ent ids no model references (not embedded): ' + ', '.join(unref))
    if missing:
        print('  note: ids models ask for that have no texture: ' + ', '.join(missing))


if __name__ == '__main__':
    main()
