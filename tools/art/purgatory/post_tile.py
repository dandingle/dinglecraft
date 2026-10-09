#!/usr/bin/env python3
"""P6 tile post: raw fal outputs -> final/pg_*_{basecolor,normal,roughness[,height]}.png (1024 px), through the write guard.

  python3 tools/art/purgatory/post_tile.py [pg_name ...]      (no args: every tile whose sources exist)

Seamless tiles: periodic FFT low-frequency equalise on albedo and roughness (sigma 60), the patina normal -Y tilt removed,
then the seam check (tex.py metric: edge-wrap diff / interior diff; 1.0 = seamless, a raw hero scores ~2). PASS <= 1.25
on both axes for tiles that must tile; object faces (cross-sections, ores' interiors) are checked too but their border is
the base tile's own border, so they tile by construction. Writes a 3x3 repeat per tile to art/sheets/tile3/.
Every recipe and its source label is recorded in art/tiles_pg.json (the pg keys for final/tiles.json, see install_art.py).
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageFilter
import pglib as L

SHEETS = L.WORK + 'sheets/'
os.makedirs(SHEETS + 'tile3', exist_ok=True)
TPG = L.ART + 'tiles_pg.json'
PICKS = json.load(open(L.ART + 'picks.json')) if os.path.exists(L.ART + 'picks.json') else {}
RESULTS = {}


def meta(name, rot, src, alpha=None, emissive=0, rough=1.0):
    RESULTS[name] = {'rot': rot, 'alpha': alpha, 'emissive': emissive, 'rough': rough, 'src': src}


def seam_ok(name, b, must=True):
    sx, sy = L.seam_score(b)
    ok = max(sx, sy) <= 1.25 or not must
    print('  seam %-16s h %.2f v %.2f %s' % (name, sx, sy, 'PASS' if ok else 'FAIL'))
    big = np.tile(L.u8(b), (3, 3, 1))
    Image.fromarray(big).resize((768, 768), Image.LANCZOS).save(SHEETS + 'tile3/%s.jpg' % name, quality=85)
    return ok, round(sx, 2), round(sy, 2)


def ext(label):
    m = L.patina_maps(label)
    return L.rgb(m['basecolor']), L.rgb(m['normal']), L.gray(m['roughness']), (L.gray(m['height']) if 'height' in m else None)


def std(label, name, eq=0.85, gr=None, rmean=None, rspread=1.0, rot=True, src=None, must=True, post=None, ramp=()):
    b, n, r, h = ext(label)
    for ax in ramp:          # patina left a faint wrap line on this axis: linear-ramp it away (all maps)
        b = L.wrap_ramp(b, ax); r = L.wrap_ramp(r, ax)
        h = L.wrap_ramp(h, ax) if h is not None else None
    if ramp:
        n = L.ramp_normal(n, ramp)
    b = L.equalize(b, 60, eq)
    if gr:
        b = L.grade(b, *gr)
    if post:
        b = post(b)
    r = L.equalize(r, 60, eq)
    if rmean is not None:
        r = L.rough_to(r, rmean, rspread)
    n = L.fixnormal(n)
    ok = seam_ok(name, b, must)
    paths, staged = L.save_maps('t', name, b, n, r, h)
    meta(name, rot, src or 'P6 %s: patina %s, LF-equalised, normal tilt removed%s; seam h%.2f v%.2f' % (
        label, 'extract' if '_x_' in label else 'variant', ', wrap ramp on axis %s' % (ramp,) if ramp else '', ok[1], ok[2]))
    return b, n, r, h, staged


def border_mask(margin=120, feather=48):
    m = np.zeros((L.N, L.N), np.float32)
    m[margin:L.N - margin, margin:L.N - margin] = 1
    im = Image.fromarray(L.u8(m * 255)).filter(ImageFilter.GaussianBlur(feather))
    return np.asarray(im).astype(np.float32) / 255


def ore(label, base, name, rough_in, nstr=3.0, src_note='', xfer=None):
    """nano edit of a base tile -> keep the base's border pixel-exact (tiles with itself and sits next to the base)."""
    bb = L.rgb(L.find_final('t', base, 'basecolor'))
    bn = L.rgb(L.find_final('t', base, 'normal'))
    br = L.gray(L.find_final('t', base, 'roughness'))
    e = L.rgb(L.raw_img(label, 0))
    if xfer is not None:
        e = xfer(e)
    m = border_mask()
    b = bb * (1 - m[..., None]) + e * m[..., None]
    en = L.normal_from_height(L.pblur(L.lum(e) / 255, 1.2), nstr * 8)
    n = L.blend_normals(bn, en, m * 0.85)
    r = br * (1 - m) + rough_in(e) * m
    ok = seam_ok(name, b)
    L.save_maps('t', name, b, n, r)
    meta(name, True, 'P6 %s: nano-banana-pro edit of the final %s, border kept pixel-exact (feathered 120 px), luminance '
         'normals inside; %s' % (label, base, src_note))


def pick(slot, default):
    return PICKS.get(slot, default)


# ---------------------------------------------------------------- recipes
def r_deck():
    std('pgw1_x_deck', 'pg_deck', gr=((30, 28, 27), 1.0, 0.9), rmean=170)


def r_skin():
    """the patina extract was refused by fal's content checker ("pale human skin"): the nano hero is made seamless
    locally (offset blend) instead; pores and hairs come through as luminance normals."""
    a = L.rgb(L.raw_img('pgw1_t_skin', 0))
    a = L.seamless(L.equalize(a, 60, 0.9), 0.4)
    hp = L.lum(a) - L.pblur(L.lum(a), 6)
    n = L.normal_from_height(hp / 255, 9)
    r = L.rough_to(255 - L.lum(a) * 0.3, 125, 0.7)
    ok = seam_ok('pg_skin', a)
    L.save_maps('t', 'pg_skin', a, n, r)
    meta('pg_skin', True, 'P6 pgw1_t_skin: nano-banana-pro hero, offset-blend seamless + LF-equalised (patina extract refused '
         'by the content checker), high-pass luminance normals; seam h%.2f v%.2f' % (ok[1], ok[2]))


def r_velvet():
    b, n, r, h, _ = std('pgw1_x_velvet', 'pg_velvet_s', eq=0.75, rmean=215, rot=False, ramp=(0,))
    # top/bottom: the same pile seen end-on: a rotated, softened copy (local crop, no spend)
    bt = np.rot90(L.pblur(b, 1.5), 1)
    nt = np.rot90(n, 1).copy(); nx, ny = nt[..., 0].copy(), nt[..., 1].copy(); nt[..., 0], nt[..., 1] = 255 - ny, nx
    seam_ok('pg_velvet_t', bt)
    L.save_maps('t', 'pg_velvet_t', bt, nt, np.rot90(r, 1))
    meta('pg_velvet_t', True, 'P6 local: pg_velvet_s rotated 90 degrees and softened (folds seen end-on)')


def r_traveler():
    std('pgw1_v_traveler', 'pg_traveler', eq=0.75, rmean=215, rot=False, post=lambda b: L.grade(b, (80, 18, 52), 0.95, 1.0),
        src='P6 pgw1_v_traveler: patina variant of the final velvet (s0.6), LF-equalised, graded to dark plum (#4a1030 family)')


def r_shag():
    std('pgw1_x_shag', 'pg_shag_t', eq=0.8, rmean=225)


def r_shagside():
    """local (the patina band variant grew a shrub, not carpet): the final shag top resampled with a 3x vertical stretch
    so the pile reads as fibres hanging over the edge, over the exact deck, under a ragged periodic fringe line"""
    st = L.rgb(L.find_final('t', 'pg_shag_t', 'basecolor')); sn = L.rgb(L.find_final('t', 'pg_shag_t', 'normal'))
    srr = L.gray(L.find_final('t', 'pg_shag_t', 'roughness'))
    def vstretch(x):
        top = x[:342]
        return np.asarray(Image.fromarray(L.u8(top) if top.ndim == 3 else L.u8(top)).resize((L.N, L.N), Image.LANCZOS)).astype(np.float32)
    b = vstretch(st); n = vstretch(sn); r = vstretch(srr)
    y0 = np.arange(L.N, dtype=np.float32)[:, None] / L.N
    b = b * (1.05 - 0.45 * y0)[..., None]                       # fibres darken towards their tips (self-shadow)
    h = None
    # below the band the side is exactly the deck (horizontal tiling only; the band is the hanging pile)
    db = L.rgb(L.find_final('t', 'pg_deck', 'basecolor')); dn = L.rgb(L.find_final('t', 'pg_deck', 'normal'))
    dr = L.gray(L.find_final('t', 'pg_deck', 'roughness'))
    y = np.arange(L.N, dtype=np.float32)[:, None]
    wav = (L.fbm(77, (40, 20, 10, 5)) * 40)[0:1, :]          # ragged fringe edge, periodic in x
    m = np.clip((380 + wav - y) / 40.0, 0, 1)
    b = db * (1 - m[..., None]) + b * m[..., None]
    n = L.blend_normals(dn, n, m)
    r = dr * (1 - m) + L.rough_to(r, 225) * m
    sx, sy = L.seam_score(b)
    seam_ok('pg_shag_s', b, must=False)
    L.save_maps('t', 'pg_shag_s', b, n, r)
    meta('pg_shag_s', False, 'P6 local: the final pg_shag_t stretched 3x vertically (hanging pile) over the exact deck under '
         'a ragged periodic fringe line (the patina band variant pgw1_v_shagside grew a shrub and was not used); h seam %.2f' % sx)


def r_sleeve():
    """the patina extract flattened the felt (stains and glue blobs gone): the hero itself (frame cropped) is used, its
    wrap fixed by linear ramps on both axes (the centred zig-zag seam stays put; an offset blend would copy it to the edge)"""
    a = L.rgb(L.RAWPG + 'w1/pgw1_t_sleeve_hero_crop.png')
    a = L.equalize(a, 60, 0.8)
    a = L.wrap_ramp(L.wrap_ramp(a, 0), 1)
    hp = L.lum(a) - L.pblur(L.lum(a), 5)
    n = L.normal_from_height(hp / 255, 7)
    r = L.rough_to(255 - L.lum(a) * 0.2, 225, 0.5)
    ok = seam_ok('pg_sleeve_s', a)
    L.save_maps('t', 'pg_sleeve_s', a, n, r)
    meta('pg_sleeve_s', False, 'P6 pgw1_t_sleeve_hero: nano-banana-pro hero (frame cropped 4%%), LF-equalised, wrap ramps on '
         'both axes (the patina extract pgw1_x_sleeve flattened the felt and was not used); seam h%.2f v%.2f' % (ok[1], ok[2]))


def section(src_label, name, recolor=None, note=''):
    a = L.rgb(L.raw_img(src_label, 0))
    if recolor is not None:
        a = recolor(a)
    n = L.normal_from_height(L.pblur(L.lum(a) / 255, 1.5), 10)
    # wet flesh is glossy, felt/skin is matte: roughness from "redness"
    red = np.clip((a[..., 0] - a[..., 1]) / 120.0, 0, 1)
    r = 225 - red * 120
    seam_ok(name, a, must=False)
    L.save_maps('t', name, a, n, r)
    meta(name, True, note)


def r_sleevex():
    section(pick('pg_sleeve_x', 'pgw1_t_sleevecut'), 'pg_sleeve_x', note='P6 pgw1_t_sleevecut: nano-banana-pro cross-section '
            '(felt ring, flesh, bone), luminance normals, wet flesh low roughness')


def r_forearmx():
    fs = L.rgb(L.find_final('t', 'pg_forearm_s', 'basecolor'))
    band = fs[60:340]                                    # strap-free skin rows (the strap crosses the middle)
    skin = np.concatenate([band, band[::-1]] * 2, 0)[:L.N]
    def recolor(a):
        g = (a[..., 1] - np.maximum(a[..., 0], a[..., 2]))
        m = np.clip((g - 6) / 30.0, 0, 1)
        m = np.asarray(Image.fromarray(L.u8(m * 255)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255
        ref = L.lum(a)[m > 0.5].mean() if (m > 0.5).any() else 128
        shade = (L.lum(a) / max(ref, 1))[..., None]
        sk = L.pblur(skin, 0.8) * np.clip(shade, 0.35, 1.3) * 0.92
        return a * (1 - m[..., None]) + sk * m[..., None]
    section(pick('pg_sleeve_x', 'pgw1_t_sleevecut'), 'pg_forearm_x', recolor, note='P6 local: the sleeve cross-section with '
            'its felt ring recoloured to the final pg_forearm_s skin (shading kept)')


def r_forearm():
    std('pgw1_x_forearm', 'pg_forearm_s', eq=0.8, rmean=150, rot=False, ramp=(0,))


def r_fleece():
    b, n, r, h, _ = std('pgw1_x_fleece', 'pg_fleece', eq=0.8, rmean=230)
    # alpha: a few ragged cut-out holes, mostly towards the block edges (cut bucket, OG has holes at the edge)
    f = L.fbm(9123, (24, 12, 6, 3))
    t = np.abs(np.arange(L.N, dtype=np.float32) - L.N / 2) / (L.N / 2)
    edge = np.maximum(t[None, :], t[:, None]) ** 4
    hole = (f + edge * 1.6) > 1.9
    al = np.where(hole, 0.0, 1.0)
    L.save_maps('t', 'pg_fleece', b, n, r, h, alpha=al)
    RESULTS['pg_fleece']['alpha'] = 'cutout'
    RESULTS['pg_fleece']['src'] += '; periodic ragged alpha holes near the edges (%.1f%% transparent)' % (100 * (1 - al.mean()))


def r_foam():
    std('pgw1_x_foam', 'pg_foam', eq=0.85, rmean=215)


ROT_MUL_SEED = 4411


def rot_f(a):
    """per-pixel colour map v1 rot -> burnt orange (the patina variant kept the foam's colour)"""
    return L.grade(a, (150, 70, 26), 1.15, 1.1)


def rot_mul():
    f = L.fbm(ROT_MUL_SEED, (20, 10, 5, 2.5))
    return (1 - 0.28 * np.clip((f - 0.35) * 2.5, 0, 1))[..., None]        # darker flaky patches


def rot_xfer(e):
    """apply the same map to an edit made from the v1 rot, only where the edit still looks like rot (fingers and
    sequins keep their colour): soft mask by colour distance from the v1 rot palette"""
    old = L.rgb(L.RAWPG + 'w1/pgw1_rot_v1_final_basecolor.png')
    mu = old.reshape(-1, 3).mean(0); sd = old.reshape(-1, 3).std(0) + 1
    d = np.sqrt((((e - mu) / sd) ** 2).sum(-1) / 3)
    w = np.clip((2.2 - d) / 0.8, 0, 1)
    w = L.pblur(w, 2)[..., None]
    return e * (1 - w) + rot_f(e) * rot_mul() * w


def r_rot():
    b, n, r, h = ext('pgw1_v_rot')
    b = L.equalize(b, 60, 0.85)
    b = rot_f(b) * rot_mul()
    r = L.rough_to(L.equalize(r, 60, 0.85), 225)
    n = L.fixnormal(n)
    ok = seam_ok('pg_rot', b)
    L.save_maps('t', 'pg_rot', b, n, r, h)
    meta('pg_rot', True, 'P6 pgw1_v_rot: patina variant of the final foam (s0.6), LF-equalised, graded to burnt orange with '
         'periodic darker flake patches (the variant had kept the foam colour); seam h%.2f v%.2f' % (ok[1], ok[2]))


def r_googly():
    ore(pick('pg_ore_googly', 'pgw1_v_googly'), 'pg_foam', 'pg_ore_googly',
        lambda e: 230 - np.clip((L.lum(e) - 150) / 80, 0, 1) * 190, 3.0, 'glossy plastic eyes (white = low roughness)')


def r_wire():
    ore(pick('pg_ore_wire', 'pgw1_v_wire'), 'pg_foam', 'pg_ore_wire',
        lambda e: 215 - np.clip((140 - np.abs(e[..., 0] - e[..., 2]) * 3 - 0) / 140, 0, 1) * 90, 3.0, 'metal wire smoother')


def r_sequin():
    ore(pick('pg_ore_sequin', 'pgw1_v_sequin'), 'pg_rot', 'pg_ore_sequin',
        lambda e: 225 - np.clip((L.lum(e) - 120) / 100, 0, 1) * 180, 3.0, 'sequins glossy; foam re-graded like pg_rot', xfer=rot_xfer)


def r_knuckle():
    ore(pick('pg_ore_knuckle', 'pgw1_v_knuckle_b'), 'pg_rot', 'pg_ore_knuckle',
        lambda e: 220 - np.clip((e[..., 0] - e[..., 2] - 20) / 60, 0, 1) * 70, 3.0, 'skin slightly glossier than foam; foam '
        're-graded like pg_rot', xfer=rot_xfer)


RECIPES = {
    'pg_deck': r_deck, 'pg_skin': r_skin, 'pg_velvet_s': r_velvet, 'pg_traveler': r_traveler, 'pg_shag_t': r_shag,
    'pg_shag_s': r_shagside, 'pg_sleeve_s': r_sleeve, 'pg_sleeve_x': r_sleevex, 'pg_forearm_s': r_forearm,
    'pg_forearm_x': r_forearmx, 'pg_fleece': r_fleece, 'pg_foam': r_foam, 'pg_rot': r_rot, 'pg_ore_googly': r_googly,
    'pg_ore_wire': r_wire, 'pg_ore_sequin': r_sequin, 'pg_ore_knuckle': r_knuckle,
}
try:
    from post_tile_w23 import RECIPES as R23   # waves 2-3 recipes live in a second file
    RECIPES.update(R23)
except ImportError:
    pass


def main():
    names = sys.argv[1:] or list(RECIPES)
    tpg = json.load(open(TPG)) if os.path.exists(TPG) else {}
    for nm in names:
        try:
            print(nm)
            RECIPES[nm]()
        except (FileNotFoundError, KeyError, TypeError, AttributeError) as e:
            print('  skipped (%s: %s)' % (type(e).__name__, e))
    mod = sys.modules.get('post_tile')          # waves 2-3 recipes record into the imported copy of this module
    if mod is not None and mod is not sys.modules.get('__main__'):
        RESULTS.update(mod.RESULTS)
    for k, v in RESULTS.items():
        tpg[k] = v
    json.dump(dict(sorted(tpg.items())), open(TPG, 'w'), indent=1)
    print('tiles_pg.json: %d pg keys' % len(tpg))


if __name__ == '__main__':
    main()
