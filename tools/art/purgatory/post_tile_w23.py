"""Waves 2-3 tile recipes (imported by post_tile.py)."""
import numpy as np
from PIL import Image
import pglib as L
from post_tile import std, ore, seam_ok, meta, pick


def objtile(label, name, rough=200, nstr=8.0, rot=False, crop=None, note='', seamless=False, eq=0.0):
    """a one-off block face (nano): resize, optional crop/offset-blend, luminance normals, near-constant roughness."""
    im = Image.open(L.raw_img(label, 0)).convert('RGB')
    if crop:
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    a = np.asarray(im.resize((L.N, L.N), Image.LANCZOS)).astype(np.float32)
    if eq:
        a = L.equalize(a, 60, eq)
    if seamless:
        a = L.seamless(a, 0.35)
    n = L.normal_from_height(L.pblur(L.lum(a) / 255, 1.2), nstr)
    r = L.rough_to(255 - L.lum(a) * 0.25, rough, 0.6)
    ok = seam_ok(name, a, must=seamless)
    L.save_maps('t', name, a, n, r)
    meta(name, rot, 'P6 %s: nano-banana-pro %s%s, luminance normals%s; seam h%.2f v%.2f' % (
        label, 'object face' if not seamless else 'painterly hero', ', crop %s' % (crop,) if crop else '',
        ', offset-blend seamless + LF-equalised' if seamless else '', ok[1], ok[2]) + (('; ' + note) if note else ''))
    return a, n, r


def r_counter_t():
    std('pgw2_x_counter', 'pg_counter_t', eq=0.8, rmean=120)


def r_counter_s():
    objtile('pgw2_cabinet', 'pg_counter_s', rough=170)


def r_burner():
    a, n, r = objtile('pgw2_burner', 'pg_burner_t', rough=150, rot=True, crop=(0.015, 0.015, 0.985, 0.975),
                      note='emissive coil: P7 flags emask lum')
    meta('pg_burner_t', True, 'P6 pgw2_burner: nano-banana-pro black enamel hob with a glowing coil (P7: emissive 2.0 emask lum)',
         emissive=1.0)


def r_burner_s():
    """the enamel material came out as a gas-hob grate: one plain quadrant (spatters, drips) upscaled + offset-blend"""
    from post_tile import ext
    b, n, r, h = ext('pgw2_enamel')
    box = (30, 480, 460, 910)
    c = lambda x, mode: np.asarray(Image.fromarray(L.u8(x), mode).crop(box).resize((L.N, L.N), Image.LANCZOS)).astype(np.float32)
    b = L.seamless(L.equalize(c(b, 'RGB'), 60, 0.8), 0.35)
    r = L.rough_to(L.seamless(c(r, 'L')[..., None], 0.35)[..., 0], 90)
    n = L.normal_from_height(L.pblur(L.lum(b) / 255, 1.5), 6)
    ok = seam_ok('pg_burner_s', b)
    L.save_maps('t', 'pg_burner_s', b, n, r)
    meta('pg_burner_s', True, 'P6 pgw2_enamel: patina text enamel (it came out as a hob grate): one plain quadrant cropped, '
         'upscaled, offset-blend seamless, luminance normals; seam h%.2f v%.2f' % (ok[1], ok[2]))


def r_soup():
    std('pgw2_x_soup', 'pg_soup', eq=0.7, rmean=40, rot=False)


def r_satin():
    # the extract flattened the dunes to one streak that broke at the wrap: the hero itself, offset-blend seamless
    objtile('pgw2_t_satin', 'pg_satin', rough=70, nstr=5, rot=True, seamless=True, eq=0.6,
            note='patina extract pgw2_x_satin rejected (flat, streak broke at the wrap)')


def r_sheet():
    """the extract kept the hero's dark frame: crop it off all maps, then wrap ramps (the dimple ring stays centred)"""
    from post_tile import ext
    b, n, r, h = ext('pgw2_x_sheet')
    c = lambda x: np.asarray(Image.fromarray(L.u8(x)).crop((60, 60, 964, 964)).resize((L.N, L.N), Image.LANCZOS)).astype(np.float32)
    b, n, r, h = c(b), c(n), c(r), c(h)
    b = L.equalize(L.wrap_ramp(L.wrap_ramp(b, 0), 1), 60, 0.85)
    r = L.rough_to(L.wrap_ramp(L.wrap_ramp(r, 0), 1), 225)
    n = L.ramp_normal(L.fixnormal(n), (0, 1))
    ok = seam_ok('pg_sheet', b)
    L.save_maps('t', 'pg_sheet', b, n, r, h)
    meta('pg_sheet', True, 'P6 pgw2_x_sheet: patina extract, its dark frame cropped off (60 px), wrap ramps, LF-equalised; '
         'seam h%.2f v%.2f' % (ok[1], ok[2]))


def r_swamp():
    std('pgw2_v_swamp', 'pg_swamp', eq=0.85, rmean=150)


def r_stuffing():
    # the extract had bright bands along every edge (a visible grid): the hero itself, offset-blend seamless
    objtile('pgw2_t_stuffing', 'pg_stuffing', rough=235, nstr=7, rot=True, seamless=True, eq=0.7,
            note='patina extract pgw2_x_stuffing rejected (bright edge bands)')


def r_psky():
    objtile('pgw2_psky', 'pg_psky', rough=215, nstr=5, seamless=True, eq=0.6)


def r_phill():
    objtile('pgw2_phill', 'pg_phill', rough=215, nstr=5, seamless=True, eq=0.6)


def r_backing():
    b, n, r, h, _ = std('pgw2_rx_backing', 'pg_backing', eq=0.8, rmean=225, rot=False, ramp=(0, 1))   # v1 hero had words
    # the extract's normal map bends hard along every edge: flutes, tears and tape as luminance relief instead
    hp = L.lum(b) - L.pblur(L.lum(b), 5)
    L.save_maps('t', 'pg_backing', b, L.normal_from_height(hp / 255, 7), r, h)
    import sys as _s
    mod = _s.modules.get('post_tile')
    if mod is not None and 'pg_backing' in mod.RESULTS:
        mod.RESULTS['pg_backing']['src'] += '; normals rebuilt from luminance (the extract normal bent along the edges)'


def r_seat():
    objtile(pick('pg_seat_s', 'pgw2_r_seat'), 'pg_seat_s', rough=220)


def r_eye():
    objtile('pgw2_eye', 'pg_eye', rough=90, nstr=4, crop=(0.17, 0.15, 0.83, 0.81))   # inside the ball: no shelf behind


def r_pins_s():
    b, n, r, h, _ = std('pgw2_x_pins', 'pg_pins_s', eq=0.75, rmean=160, ramp=(0, 1))
    # the extract's normal map had a bad strip along one edge: pin heads as luminance bumps instead
    hp = L.lum(b) - L.pblur(L.lum(b), 4)
    n2 = L.normal_from_height(hp / 255, 8)
    L.save_maps('t', 'pg_pins_s', b, n2, r, h)
    from post_tile import RESULTS
    import sys as _s
    for mod in (_s.modules.get('post_tile'),):
        if mod is not None and 'pg_pins_s' in mod.RESULTS:
            mod.RESULTS['pg_pins_s']['src'] += '; normals rebuilt from luminance (the extract normal had a bad edge strip)'


def r_pins_t():
    ore(pick('pg_pins_t', 'pgw3_pinstop'), 'pg_pins_s', 'pg_pins_t',
        lambda e: 200 - np.clip((e[..., 1] - e[..., 0]) / 60, 0, 1) * 20, 3.0, 'felt leaf cap')


def r_lino():
    std('pgw2_lino', 'pg_lino', eq=0.6, rmean=110)


def r_mblack():
    std('pgw2_mblack', 'pg_mblack', eq=0.8, rmean=235, rot=False)


def r_mirror():
    objtile('pgw2_mirror', 'pg_mirror', rough=60, nstr=4)


def r_tesla():
    std('pgw3_tesla', 'pg_tesla_s', eq=0.7, rmean=70, rot=False)


def r_dough():
    std('pgw3_dough', 'pg_dough', eq=0.7, rmean=90)


def r_armhole():
    objtile('pgw3_armhole', 'pg_armhole_t', rough=200, rot=True)


def r_brace():
    std('pgw3_brace', 'pg_brace', eq=0.8, rmean=225, rot=False)


def r_scum():
    std('pgw3_scum', 'pg_scum', eq=0.7, rmean=60, rot=False)


def r_lily():
    objtile('pgw3_lily', 'pg_lily_t', rough=140, rot=True)


def r_hotplate_t():
    """the Hot Plate top is the same glowing coil as the Burner (OG: 'coil, glows when lit'): a copy of pg_burner_t"""
    import shutil
    for m in ('basecolor', 'normal', 'roughness'):
        src = L.find_final('t', 'pg_burner_t', m)
        dst, _ = L.dest('t', 'pg_hotplate_t', m)
        shutil.copyfile(src, dst)
    meta('pg_hotplate_t', True, 'P6 local: copy of pg_burner_t (the same glowing coil; P7: emissive like the burner)', emissive=1.0)


def r_lily_s():
    """side of a lily pad (a thin block): a green felt rim band over dark pond water, from the finals (no spend)"""
    top = L.rgb(L.find_final('t', 'pg_lily_t', 'basecolor'))
    sc = L.find_final('t', 'pg_scum', 'basecolor')
    water = L.rgb(sc) * 0.3 if sc else np.full((L.N, L.N, 3), (24, 34, 22), np.float32)
    patch = top[260:380, 140:396]                              # pure felt, clear of the notch and the corners
    felt = np.tile(np.concatenate([patch, patch[:, ::-1]], 1), (9, 2, 1))[:L.N, :L.N]
    y = np.arange(L.N, dtype=np.float32)[:, None, None]
    m = np.clip((190 + L.fbm(31, (30, 15, 7))[0:1, :, None] * 25 - y) / 10.0, 0, 1)
    b = water * (1 - m) + felt * m
    n = L.normal_from_height(L.pblur(L.lum(b) / 255, 1.2), 5)
    seam_ok('pg_lily_s', b, must=False)
    L.save_maps('t', 'pg_lily_s', b, n, L.rough_to(255 - L.lum(b) * 0.3, 120, 0.6))
    meta('pg_lily_s', False, 'P6 local: a ragged green felt rim (from pg_lily_t) over darkened pg_scum water')


def sprite_key(label, name):
    """cross-plant sprite on a chroma-blue background: alpha from the colour distance to the corner colour"""
    a = L.rgb(L.raw_img(label, 0))
    bgc = np.median(np.concatenate([a[:24, :24].reshape(-1, 3), a[:24, -24:].reshape(-1, 3)]), 0)
    dist = np.sqrt(((a - bgc) ** 2).sum(-1))
    blue = a[..., 2] - np.maximum(a[..., 0], a[..., 1])          # spill: blue-dominant pixels lean transparent
    al = np.clip((dist - 60) / 70.0, 0, 1) * np.clip((150 - blue) / 80.0, 0, 1)
    al = np.clip(L.pblur(al, 0.6), 0, 1)
    rgb = a.copy()                                               # despill: cap blue at max(r,g) on the edge pixels
    cap = np.maximum(a[..., 0], a[..., 1])
    rgb[..., 2] = np.where(al < 0.98, np.minimum(a[..., 2], cap + 10), a[..., 2])
    n = L.normal_from_height(L.pblur(L.lum(rgb) / 255, 1.2), 4)
    L.save_maps('t', name, rgb, n, L.rough_to(255 - L.lum(rgb) * 0.3, 170, 0.6), alpha=al)
    meta(name, False, 'P6 %s: nano-banana-pro on chroma blue, keyed to alpha (%.0f%% opaque), despilled, bottom-centred' % (
        label, 100 * float((al > 0.5).mean())), alpha='cutout')


def sprite(label, name):
    """cross-plant sprite: nano on pure white, keyed to alpha (pack_assets colour-bleeds the transparent pixels)"""
    from scipy import ndimage as nd
    a = L.rgb(L.raw_img(label, 0))
    d = (255 - a.min(-1))
    near = d < 24                                   # near-white pixels...
    lab, k = nd.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))                   # ...that connect to the border are background (a white ball is not)
    bg = nd.binary_opening(bg, iterations=1)
    al = np.clip(L.pblur((~bg).astype(np.float32), 0.8), 0, 1)
    n = L.normal_from_height(L.pblur(L.lum(a) / 255, 1.2), 4)
    L.save_maps('t', name, a, n, L.rough_to(255 - L.lum(a) * 0.3, 170, 0.6), alpha=al)
    meta(name, False, 'P6 %s: nano-banana-pro on pure white, keyed to alpha (%.0f%% opaque), bottom-centred' % (
        label, 100 * float((al > 0.5).mean())), alpha='cutout')


def obj(label, name, rough=190, crop=None, rot=False):
    return lambda: objtile(label, name, rough=rough, crop=crop, rot=rot)


RECIPES = {
    'pg_counter_t': r_counter_t, 'pg_counter_s': r_counter_s, 'pg_burner_t': r_burner, 'pg_burner_s': r_burner_s, 'pg_soup': r_soup, 'pg_satin': r_satin,
    'pg_sheet': r_sheet, 'pg_swamp': r_swamp, 'pg_stuffing': r_stuffing, 'pg_psky': r_psky, 'pg_phill': r_phill,
    'pg_backing': r_backing, 'pg_seat_s': r_seat, 'pg_eye': r_eye, 'pg_pins_s': r_pins_s, 'pg_pins_t': r_pins_t,
    'pg_lino': r_lino, 'pg_mblack': r_mblack, 'pg_mirror': r_mirror,
    'pg_tesla_s': r_tesla, 'pg_dough': r_dough, 'pg_armhole_t': r_armhole, 'pg_brace': r_brace, 'pg_scum': r_scum,
    'pg_lily_t': r_lily, 'pg_can_s': obj('pgw3_can', 'pg_can_s', 160), 'pg_hotplate_s': obj('pgw3_hotplate', 'pg_hotplate_s', 150),
    'pg_bench_s': obj('pgw3_bench', 'pg_bench_s', 120), 'pg_ptrunk_s': obj('pgw3_ptrunk', 'pg_ptrunk_s', 190, (0.03, 0.1, 0.97, 0.9)),
    'pg_door_s': obj('pgw3_door', 'pg_door_s', 170), 'pg_strunk_s': obj('pgw3_strunk', 'pg_strunk_s', 190, (0.13, 0.075, 0.89, 0.97)),
    # wave 3b
    'pg_can_t': lambda: objtile('pgw3_can_t', 'pg_can_t', rough=160, rot=True, crop=(0.06, 0.06, 0.94, 0.94)),
    'pg_bench_t': lambda: objtile('pgw3_bench_t', 'pg_bench_t', rough=120),
    'pg_ptrunk_t': obj('pgw3_ptrunk_t', 'pg_ptrunk_t', 190, (0.06, 0.12, 0.94, 0.88)),
    'pg_door_t': lambda: std('pgw3_door_t', 'pg_door_t', eq=0.8, rmean=170, rot=False),
    'pg_strunk_t': obj('pgw3_strunk_t', 'pg_strunk_t', 190, (0.05, 0.18, 0.96, 0.85)),
    'pg_tesla_t': lambda: objtile('pgw3_tesla_t', 'pg_tesla_t', rough=50, rot=True),
    'pg_plate': lambda: objtile('pgw3_plate', 'pg_plate', rough=110, rot=True),
    'pg_seat_t': lambda: objtile('pgw3_seat_t', 'pg_seat_t', rough=225, crop=(0.06, 0.02, 0.96, 0.94)),
    'pg_counter_b': lambda: std('pgw3_counter_b', 'pg_counter_b', eq=0.8, rmean=225),
    'pg_hotplate_t': r_hotplate_t, 'pg_lily_s': r_lily_s,
    'pg_lamp': lambda: sprite_key('pgw3_r_lamp', 'pg_lamp'), 'pg_cattail': lambda: sprite_key('pgw3_r_cattail', 'pg_cattail'),
}
