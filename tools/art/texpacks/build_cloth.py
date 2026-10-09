#!/usr/bin/env python3
"""Bodies for the hyperreal cast: garment + hide textures -> hyperreal/final_ent/<id>_basecolor.png / _normal.png.

Built from photographs already in the pack (the wrinkled heather jersey M2_mat_jersey_images_0, the sheep fleece,
the burlap weave, the raw H12 foot, the pig face/side photos, the dirt/grass/plank blocks, Brad's duct tape) plus
procedural garment construction: collars, ribbing, hems, twin-needle stitching, seams, pockets, hand knit, folds
and wear (stains, mud, blood, crumbs, pilling).

Atlas layouts (the model files carry the same constants):
  torso garments  tee_dan, tee_zombie, hoodie_creepah, jumper_bee  (1024 x 1024)
      front u [0, 403/1024)   back u [403/1024, 806/1024)   side strip u [806/1024, 1]     (v 0 = hem, v 1 = shoulders)
      built at 1422 px/block for a 0.50 x 0.72 x 0.27 torso, then squeezed horizontally into the atlas
  limb garments   jog_dan, jog_zombie, trousers_brad, sleeve_brad, trousers_creepah, leggings_bee  (1024 x 1024)
      two 360-degree unwraps of one limb: A (model +x limb) v [0.5, 1], B (model -x limb) v [0, 0.5]
      each: front u [0, .25)  outer u [.25, .5)  back u [.5, .75)  inner u [.75, 1]   (v 0 = ankle / cuff)
  pig_flank (px/nx of the body, 1.20 x 0.55, mirrored on nx) and pig_hide (seamless bristle skin, tiled)
  foot_bare_top (the raw H12 foot photo, toes + nails intact) and foot_bare_side (sole edge / instep skin)
Usage: python3 tools/art/texpacks/build_cloth.py [id ...]     (needs $DC_ART_SRC; no args = everything)"""
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clothlib import *   # noqa

OUT = P('final_ent')
TF, TB = 403, 806          # torso atlas column splits (px of 1024)
PT = 1422                  # torso build density, px per block
LOG = {}

# ---------------------------------------------------------------- shared sources
_SRC = {}


def src(name):
    if name in _SRC:
        return _SRC[name]
    if name == 'jersey':
        a = seamless(load(P('raw/ent/M2_mat_jersey_images_0.png')), 0.4)
    elif name == 'wool':
        a = seamless(load(P('raw/ent/M8_mat_wool_images_0.png')), 0.4)
    elif name == 'burlap':
        a = seamless(load(P('final_ent/mat_burlap_basecolor.png')), 0.3)
    elif name == 'dirt':
        a = load(P('final/dirt_basecolor.png'))
    elif name == 'grass':
        a = load(P('final/grass_top_basecolor.png'))
    elif name == 'planks':
        a = load(P('final/oak_planks_basecolor.png'))
    elif name == 'rot':
        a = load(P('final_ent/mat_rotflesh_basecolor.png'))
    elif name == 'skin':
        a = load(P('final_ent/mat_skin_basecolor.png'))
    elif name == 'moss':
        a = load(P('final_ent/mat_mossflesh_basecolor.png'))
    else:
        raise KeyError(name)
    _SRC[name] = a
    return a


def fabric(H, W, scale=1.0, angle=0.0, off=(0, 0), flip=False, name='jersey', lowsig=28):
    """photo fabric field split into knit detail (ratio ~1) and its own soft wrinkle field (ratio ~1)"""
    f = sample(src(name), H, W, scale, angle, off, flip)
    L = lum(f)
    low = blur(L, lowsig, 'wrap')
    return L / np.maximum(low, 1e-3), low / low.mean()


def dye(detail, wrink, color, d_amp=1.0, w_amp=1.0, add=0.0):
    c = hexs(color)[None, None, :]
    out = c * (detail ** d_amp)[..., None] * (wrink ** w_amp)[..., None]
    if add:
        out = out + ((detail - 1) * add)[..., None]
    return out


def tex_patch(name, H, W, scale=1.0, off=(0, 0), angle=0.0):
    return sample(src(name), H, W, scale, angle, off)


def finish(id_, rgb, height, strength):
    rgb = np.clip(rgb, 0, 1)
    save(os.path.join(OUT, id_ + '_basecolor.png'), rgb)
    save(os.path.join(OUT, id_ + '_normal.png'), normal_from_height(height, strength))
    LOG[id_] = {'mean_srgb': [round(float(x), 3) for x in rgb.reshape(-1, 3).mean(0)], 'size': list(rgb.shape[:2])}


def torso_atlas(front, back, side, hf, hb, hs):
    """squeeze the three physical canvases into the 1024 torso atlas"""
    H = 1024
    rgb = np.concatenate([resize(front, TF, H), resize(back, TB - TF, H), resize(side, 1024 - TB, H)], 1)
    hgt = np.concatenate([resize(hf, TF, H), resize(hb, TB - TF, H), resize(hs, 1024 - TB, H)], 1)
    return rgb, hgt


# ---------------------------------------------------------------- garment construction pieces
def hem(H, W, depth, seed, y_from_bottom=0.0, rows=2, gap=7, dash=7, sgap=3.5):
    """turned-up hem: raised band + twin-needle stitch rows; returns (height, stitch mask, band mask)"""
    yb = H - 1 - y_from_bottom
    yy = np.mgrid[0:H, 0:W][0].astype(np.float32)
    band = smooth(yb - depth - 3, yb - depth + 3, yy) * (yy <= yb)
    st = np.zeros((H, W), np.float32)
    y0 = yb - depth + 6
    for r in range(rows):
        y = y0 + r * gap
        st = np.maximum(st, stitches(H, W, [(-5, y), (W + 5, y)], dash, sgap, 2.2, seed + r))
    hgt = band * 2.0 - st * 1.2
    # fold edge at the very bottom rolls away
    hgt -= smooth(yb - 6, yb + 1, yy) * 2.0
    return hgt, st, band


def rib(H, W, mask, spacing, along_x=True, depth=1.6, phase=0.0):
    """knit ribbing: vertical (along_x=True: ribs repeat along x) cords inside mask"""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    t = (xx if along_x else yy) / spacing * 2 * np.pi + phase
    r = 0.5 + 0.5 * np.cos(t)
    return mask * (r ** 0.7) * depth, mask * r


def neck_crew(H, W, P_, a, b, t, top=-0.035, back=False):
    """crew collar: band between two ellipses centred above the top edge. returns masks (inside, band) + rib height"""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cx, cy = W / 2, top * P_
    r_in = np.sqrt(((xx - cx) / a) ** 2 + ((yy - cy) / b) ** 2)
    r_out = np.sqrt(((xx - cx) / (a + t)) ** 2 + ((yy - cy) / (b + t)) ** 2)
    inside = smooth(1.01, 0.99, r_in)
    band = smooth(1.01, 0.99, r_out) * (1 - inside)
    ang = np.arctan2((yy - cy) / (b + t / 2), (xx - cx) / (a + t / 2))
    ribs = 0.5 + 0.5 * np.cos(ang * (a + b) / 3.2)
    return inside, band, ribs


# ---------------------------------------------------------------- wear helpers
def soil(rgb, mask, detail, seed, strength=1.0, tint=(0.33, 0.25, 0.18)):
    """dirt ground into the fibres: the soil photo's grain, brown, strongest where the knit stands proud"""
    H, W = mask.shape
    d = tex_patch('dirt', H, W, 0.6, (seed * 37 % 700, seed * 53 % 700))
    dl = lum(d) / lum(d).mean()
    a = np.clip(mask * strength * (0.5 + 0.5 * np.clip(detail, 0.7, 1.3) ** 3) * (0.75 + 0.25 * dl), 0, 1)
    col = np.array(tint)[None, None, :] * (0.6 + 0.4 * dl[..., None]) + 0.25 * rgb * lum(rgb)[..., None]
    return comp(rgb, col, a * 0.75)


def grass_stain(rgb, mask, seed):
    H, W = mask.shape
    n = 0.8 + 0.2 * fbm(H, W, 10, seed)
    col = np.array([0.33, 0.40, 0.18])[None, None, :] * n[..., None] + 0.35 * rgb
    return comp(rgb, col, mask * 0.45)


def smudge(H, W, strokes, seed, blur_px=3.0, dry=0.35):
    """dry-brush smear mask from strokes [(pts, width)]"""
    dr = Draw(H, W)
    for pts, w in strokes:
        dr.line(pts, w)
    m = blur(dr.mask(), blur_px)
    n = fbm(H, W, 7, seed, 3)
    return smooth(0.18, 0.62, m + dry * n * m)


def blood_soak(rgb, mask, seed, dark=1.0):
    H, W = mask.shape
    n = fbm(H, W, 9, seed, 3)
    col = np.array([0.34, 0.075, 0.06])[None, None, :] * dark * (0.8 + 0.3 * n[..., None]) + 0.12 * rgb * np.array([0.6, 0.2, 0.2])
    rgb = comp(rgb, col, mask * 0.85)
    edge = np.clip(mask - blur(mask, 2.0), 0, 1) * 2.5          # dried rims are darker
    return comp(rgb, col * 0.6, edge * 0.5)


# ---------------------------------------------------------------- 1. tees (Dan, and Dan three weeks later)
def tee(color, seed, zombie=False):
    Wf, Ws, H = int(0.50 * PT), int(0.27 * PT), 1024
    out = {}
    for k, W, off, ang in (('front', Wf, (90, 40), 3), ('back', Wf, (700, 520), -2), ('side', Ws, (310, 830), 1)):
        d, w = fabric(H, W, 1.0, ang, off)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.random.default_rng(seed + len(k) * 13)
        fh = np.zeros((H, W), np.float32)
        for i in range(5 if k != 'side' else 2):              # drape falling from the chest
            x0 = r.uniform(0.1, 0.9) * W
            pts = [(x0, r.uniform(0.2, 0.45) * H), (x0 + r.uniform(-30, 30), 0.72 * H), (x0 + r.uniform(-45, 45), H + 20)]
            fh += fold(H, W, pts, r.uniform(16, 30), r.uniform(5, 10))
        if k != 'side':                                         # pulls toward the armpits
            for sx in (-1, 1):
                for j in range(3):
                    xa = W / 2 + sx * W * r.uniform(0.12, 0.3)
                    pts = [(xa, r.uniform(0.2, 0.42) * H), (W / 2 + sx * W * 0.56, r.uniform(0.0, 0.14) * H)]
                    fh += fold(H, W, pts, r.uniform(7, 13), r.uniform(4, 7) * (1 if j != 1 else -0.8))
        for j in range(6):                                      # ripples above the hem
            y = H - r.uniform(45, 190)
            x0 = r.uniform(-50, W * 0.7)
            fh += fold(H, W, [(x0, y), (x0 + r.uniform(90, 260), y + r.uniform(-14, 14))], r.uniform(5, 10), r.uniform(-4, 4))
        hgt = fh.copy() + (d - 1) * 10          # the photo's own knit relief
        rgb = dye(d, w, color, 1.7, 1.6)
        # uneven dye + sun fade (paler, greyer on crests and the shoulders) + all-over grime
        hue = np.stack([fbm(H, W, 160, seed + c, 3) for c in range(3)], -1)
        rgb *= 1 + 0.022 * hue
        fade = np.clip(0.6 * smooth(0, 12, fh) + 0.35 * smooth(0.4 * H, 0, yy) + 0.25 * fbm(H, W, 110, seed + 5), 0, 1)
        grey = lum(rgb)[..., None]
        rgb = rgb * (1 - 0.4 * fade[..., None]) + (grey * 1.1 + 0.06) * 0.4 * fade[..., None]
        grime = np.clip(0.35 + 0.45 * fbm(H, W, 70, seed + 6) + 0.35 * yy / H, 0, 1) * (0.5 if not zombie else 1.0)
        rgb = mul(rgb, np.array([0.80, 0.76, 0.66]), grime)
        rgb *= (1 + 0.9 * (shade(fh, 0.45) - 1))[..., None]
        if k in ('front', 'back'):
            fr = k == 'front'
            a, b, t, top = 0.105 * PT, (0.11 if fr else 0.03) * PT, (0.024 if fr else 0.022) * PT, (-0.035 if fr else -0.012)
            inside, band, ribs = neck_crew(H, W, PT, a, b, t, top)
            cy = top * PT
            rr = np.sqrt(((xx - W / 2) / (a + t / 2)) ** 2 + ((yy - cy) / (b + t / 2)) ** 2)
            roll = np.clip(1 - np.abs(rr - 1) / (t / (2 * (b + t / 2)) + 1e-6), 0, 1)       # rolled band: lit along its middle
            colr = dye(d, np.ones_like(w), color, 0.9) * (0.78 + 0.22 * roll[..., None]) * (0.86 + 0.14 * ribs[..., None])
            colr = colr * (1 - 0.3 * fade[..., None] * 0.5)
            rgb = comp(rgb, colr, band)
            hgt += band * (3.0 * roll + 1.0 * ribs)
            a0, b0 = a + t + 6, b + t + 6
            for e in (0, 8):
                st = stitches(H, W, ellipse_pts(W / 2, cy, a0 + e, b0 + e, 0, 180, 120), 6.5, 3.5, 2.2, seed + e)
                hgt -= st * 1.2
                rgb = comp(rgb, rgb * 0.7, st * 0.85)
            sw = blobs(H, W, [(W / 2, cy + b0 + 16, a0 + 30, 26)], seed + 11, 24, 0.15, 0.45) * (1 - band) * (1 - inside)
            rgb = mul(rgb, np.array([0.86, 0.82, 0.66]), sw * (0.55 if not zombie else 0.9))
            if fr:      # his neck inside the collar, shadowed by the collar band and the head above
                sk = sample(src('skin'), H, W, 0.8, 0, (200, 300))
                skd = lum(sk) / lum(sk).mean()
                neck = hexs(0xa8765c if not zombie else 0x6a7458)[None, None, :] * skd[..., None]
                ring = np.clip(blur(band, 6) * 1.6, 0, 1)
                neck *= ((0.45 + 0.55 * smooth(0, 0.09 * PT, yy)) * (1 - 0.45 * ring))[..., None]
                rgb = comp(rgb, neck, inside)
                hgt -= inside * 4
        # hem: double layer (a touch paler), twin-needle stitches, rolled edge
        hh, st, hb = hem(H, W, 0.028 * PT, seed + 21, rows=2, gap=8, dash=7, sgap=3.5)
        hgt += hh
        rgb = comp(rgb, rgb * 1.07 + 0.01, hb * 0.6)
        rgb = comp(rgb, rgb * 0.62, st * 0.9)
        rgb *= (1 - 0.22 * smooth(H - 9, H - 1, yy))[..., None]
        out[k] = [rgb, hgt, d]
    # ---------------- wear
    for k, (rgb, hgt, d) in out.items():
        W = rgb.shape[1]
        r = np.random.default_rng(seed + len(k) * 7)
        sm = blobs(H, W, [(r.uniform(0.15, 0.85) * W, r.uniform(0.7, 0.97) * H, r.uniform(40, 110), r.uniform(18, 45)) for _ in range(2 if k != 'side' else 1)],
                   seed + 31 + len(k), 22, 0.35, 0.45) * (0.45 + 0.55 * smooth(-0.3, 0.5, fbm(H, W, 14, seed + 35 + len(k))))
        sm += 0.5 * smudge(H, W, [([(x, y), (x + r.uniform(-40, 40), y + r.uniform(40, 110))], r.uniform(8, 16)) for x, y in [(r.uniform(0.1, 0.9) * W, r.uniform(0.3, 0.75) * H) for _ in range(2)]], seed + 33 + len(k), 6, 0.5)
        rgb[:] = soil(rgb, np.clip(sm, 0, 1), d, seed + 3 + len(k), 0.75 if not zombie else 1.0)
        streak = smudge(H, W, [([(x, y), (x + r.uniform(30, 90), y + r.uniform(-10, 25))], r.uniform(10, 22))
                               for x, y in [(r.uniform(0, 0.7) * W, r.uniform(0.5, 0.92) * H) for _ in range(3)]], seed + 41 + len(k), 5, 0.6)
        rgb[:] = grass_stain(rgb, streak * 0.8, seed + 42 + len(k))
        fl = specks(H, W, 70 if k != 'side' else 25, 1.2, 3.8, seed + 51 + len(k), (0, 0.3 * H, W, H))
        rgb[:] = comp(rgb, np.array([0.30, 0.21, 0.14]), fl * 0.85)
        fl2 = specks(H, W, 45, 1.0, 2.6, seed + 61 + len(k), (0, 0.25 * H, W, H))
        rgb[:] = comp(rgb, np.array([0.70, 0.58, 0.40]), fl2 * 0.8)
        hgt += (fl + fl2) * 1.6
        pil = specks(H, W, 320, 0.7, 1.6, seed + 71 + len(k))
        rgb[:] = comp(rgb, rgb * 1.15 + 0.03, pil * 0.55)
        hgt += pil * 0.8
        lint = fibres(H, W, 10, 40, seed + 72 + len(k), 0.9)
        rgb[:] = comp(rgb, np.array([0.85, 0.85, 0.82]), lint * 0.5)
    F, B, S = out['front'], out['back'], out['side']
    W = F[0].shape[1]
    r = np.random.default_rng(seed + 80)
    # blood: knuckle wipes low on the image-left of the front (his right side, where the split fist hangs)
    strokes = []
    for i in range(4):          # four knuckles dragged down and out: streaks that merge into one smear at the top
        x0, y0 = 62 + i * 15 + r.uniform(-4, 4), 0.6 * H + i * 7 + r.uniform(-6, 6)
        strokes.append(([(x0, y0), (x0 - 12, y0 + 30), (x0 - 30, y0 + 70 + i * 10), (x0 - 44, y0 + 95 + i * 14)], 11 - i * 1.5))
    strokes.append(([(70, 0.6 * H), (100, 0.6 * H + 6)], 22))
    wipe = smudge(H, W, strokes, seed + 81, 3.5, 0.25) * (0.5 + 0.5 * smooth(-0.5, 0.4, fbm(H, W, 10, seed + 85)))
    wipe = np.clip(wipe * 1.1, 0, 1) * smooth(-0.2, 0.3, fbm(H, W, 30, seed + 86)) ** 0.3
    F[0][:] = blood_soak(F[0], wipe * 0.9, seed + 82, 0.9)
    S[0][:] = blood_soak(S[0], smudge(H, S[0].shape[1], [([(40, 0.7 * H), (30, 0.8 * H)], 8), ([(70, 0.74 * H), (64, 0.86 * H)], 6)], seed + 83, 2.5, 0.8) * 0.8, seed + 84, 0.9)
    F[1] += wipe * 0.6
    for (hx, hy) in ((0.68 * W, 0.42 * H), (0.31 * W, 0.83 * H)):     # moth holes
        dr = Draw(H, W); dr.ellipse(hx, hy, 4.5, 3.5); m = dr.mask()
        ring = np.clip(blur(m, 3) * 2.5 - m, 0, 1)
        F[0][:] = comp(F[0], np.array([0.06, 0.05, 0.05]), m)
        F[0][:] = comp(F[0], F[0] * 1.15, ring * 0.5)
        F[1] -= m * 3
    sp = blobs(H, W, [(W / 2, 0.24 * H, 0.2 * W, 0.12 * H), (W / 2, 0.36 * H, 0.1 * W, 0.08 * H)], seed + 91, 40, 0.1, 0.5)
    B[0][:] = mul(B[0], np.array([0.80, 0.80, 0.78]), sp * 0.6)
    return out


def build_tee_dan():
    o = tee(0x4a9ccc, 11)
    rgb, hgt = torso_atlas(o['front'][0], o['back'][0], o['side'][0], o['front'][1], o['back'][1], o['side'][1])
    finish('tee_dan', rgb, hgt, 0.55)


def rot_skin(H, W, off=(0, 0)):
    """the zombie's own flesh (mat_rotflesh lifted by zombie.js's ROT_GAIN 1.75, linear)"""
    a = sample(src('rot'), H, W, 1.0, 0, off)
    return l2s(s2l(a) * 1.75)


def tears(H, W, seed, n, y_band, x_band=(0, 1), size=(25, 70)):
    """ragged rips: jagged slits/holes, returns (hole mask, frayed rim mask)"""
    r = np.random.default_rng(seed)
    dr = Draw(H, W)
    for _ in range(n):
        cx, cy = r.uniform(*x_band) * W, r.uniform(*y_band) * H
        L, ang = r.uniform(*size), r.uniform(-0.6, 0.6) + (np.pi / 2 if r.random() < 0.5 else 0)
        k = 9
        pts = []
        for i in range(k):
            t = i / (k - 1)
            wdt = np.sin(np.pi * t) * r.uniform(0.15, 0.45) * L
            pts.append((cx + np.cos(ang) * (t - 0.5) * L + np.sin(ang) * wdt, cy + np.sin(ang) * (t - 0.5) * L - np.cos(ang) * wdt))
        for i in range(k - 1, -1, -1):
            t = i / (k - 1)
            wdt = np.sin(np.pi * t) * r.uniform(0.05, 0.25) * L
            pts.append((cx + np.cos(ang) * (t - 0.5) * L - np.sin(ang) * wdt, cy + np.sin(ang) * (t - 0.5) * L + np.cos(ang) * wdt))
        dr.poly(pts)
    hole = dr.mask()
    n_ = fbm(H, W, 5, seed + 1, 2)
    hole = smooth(0.35, 0.65, blur(hole, 1.2) + 0.25 * n_)
    rim = np.clip(blur(hole, 4) * 2.2 - hole, 0, 1)
    return hole, rim


def drips(H, W, n, seed, xr, y0r, lr, wr):
    """wobbly runs of blood that bead at the end"""
    r = np.random.default_rng(seed)
    dr = Draw(H, W)
    for _ in range(n):
        x, y = r.uniform(*xr) * W, r.uniform(*y0r) * H
        L, w = r.uniform(*lr) * H, r.uniform(*wr)
        pts = [(x, y)]
        steps = 14
        for i in range(steps):
            x += r.normal(0, 1.6)
            y += L / steps
            pts.append((x, y))
        for i in range(steps):
            a, b = pts[i], pts[i + 1]
            dr.line([a, b], max(1.2, w * (1 - 0.55 * i / steps)))
        dr.ellipse(x, y + 1, w * 0.75, w * 0.95)
    return blur(dr.mask(), 0.8)


def build_tee_zombie():
    o = tee(0x5f8f94, 31, zombie=True)
    H = 1024
    F, B, S = o['front'], o['back'], o['side']
    W = F[0].shape[1]
    # greyer, filthier, damp-dark overall
    for k in o:
        rgb = o[k][0]
        g = lum(rgb)[..., None]
        rgb[:] = rgb * 0.55 + g * np.array([0.42, 0.48, 0.44]) * 0.9
        rgb[:] = mul(rgb, np.array([0.78, 0.74, 0.64]), 0.45 + 0.35 * smooth(-0.6, 0.6, fbm(H, rgb.shape[1], 60, 300 + len(k))))
    # the chest is torn open where the cavity sits (zombie.js: cavity box x -0.23..-0.03, y .23-.57 of the 0.72 torso)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u0, u1, v0, v1 = 0.058, 0.442, 0.32, 0.79
    cx, cy, rx, ry = (u0 + u1) / 2 * W, (1 - (v0 + v1) / 2) * H, (u1 - u0) / 2 * W + 18, (v1 - v0) / 2 * H + 22
    n_ = fbm(H, W, 9, 333, 3)
    rr = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) + 0.12 * n_
    hole = smooth(1.02, 0.96, rr)
    rim = np.clip(smooth(1.25, 1.0, rr) - hole, 0, 1)
    gore = l2s(s2l(sample(src('rot'), H, W, 1.0, 0, (100, 200))) * np.array([1.6, 0.55, 0.5]))
    F[0][:] = comp(F[0], gore * 0.6, hole)
    F[0][:] = blood_soak(F[0], np.clip(rim * 1.3, 0, 1), 335, 0.75)
    fr = fibres(H, W, 140, 26, 336, 1.1, 0.3) * smooth(1.35, 1.0, rr) * (1 - hole)
    F[0][:] = comp(F[0], np.array([0.35, 0.40, 0.38]), fr * 0.7)
    F[1] += rim * 2.5 - hole * 4 + fr * 0.8
    # blood soaked down from the chest, the collar and the torn-off right shoulder (front image-left edge, back image-right edge)
    for k, edge_x in (('front', 0.0), ('back', 1.0)):
        rgb, hgt = o[k][0], o[k][1]
        Wk = rgb.shape[1]
        yy2, xx2 = np.mgrid[0:H, 0:Wk].astype(np.float32)
        soak = smooth(0.42 * Wk, 0.0, np.abs(xx2 - edge_x * Wk) + 60 * fbm(H, Wk, 30, 340 + len(k))) * smooth(0.95 * H, 0.05 * H, yy2) ** 0.6
        runs = drips(H, Wk, 7, 341 + len(k), (0.05, 0.55) if edge_x == 0 else (0.45, 0.95), (0.05, 0.4), (0.15, 0.45), (4, 8))
        m = np.clip(soak * 0.9 + runs * 0.8, 0, 1) * (0.55 + 0.45 * smooth(-0.4, 0.4, fbm(H, Wk, 16, 342 + len(k))))
        rgb[:] = blood_soak(rgb, m, 343 + len(k), 0.55)
    # collar soaked too
    cm = blobs(H, W, [(W / 2, 0.11 * PT, 0.2 * PT, 0.06 * PT)], 350, 20, 0.2, 0.4)
    F[0][:] = blood_soak(F[0], cm * 0.7, 351, 0.6)
    # rips: a torn, ragged hem and rips up the side, showing his grey-green belly through them
    for k in o:
        rgb, hgt = o[k][0], o[k][1]
        Wk = rgb.shape[1]
        hole_, rim_ = tears(H, Wk, 360 + len(k), 4 if k != 'side' else 2, (0.86, 0.99), (0.08, 0.92), (70, 150))
        h2, r2 = tears(H, Wk, 370 + len(k), 2, (0.25, 0.75), (0.15, 0.85), (40, 90))
        hole_, rim_ = np.maximum(hole_, h2), np.maximum(rim_, r2)
        if k == 'front':
            hole_ *= 1 - smooth(1.4, 1.2, rr)    # keep clear of the chest wound
            rim_ *= 1 - smooth(1.4, 1.2, rr)
        sk = rot_skin(H, Wk, (len(k) * 120, 60))
        sk *= (0.55 + 0.45 * blur(1 - hole_, 3))[..., None]      # shadowed under the torn edges
        rgb[:] = comp(rgb, sk, hole_)
        lip = np.clip(blur(hole_, 2.5) * 3 - hole_ * 3, 0, 1)              # curled torn edge catches the light
        rgb[:] = comp(rgb, rgb * 1.35 + 0.04, lip * 0.7)
        rgb[:] = comp(rgb, rgb * 0.6, np.clip(rim_ - lip, 0, 1) * 0.5)
        frs = fibres(H, Wk, 160, 22, 380 + len(k), 0.9, 0.3) * np.clip(blur(hole_, 7) * 3, 0, 1)
        rgb[:] = comp(rgb, np.array([0.55, 0.60, 0.56]), frs * 0.75)
        hgt += lip * 3
        hgt += rim_ * 2 - hole_ * 3 + frs
        # mould: pale green-white fuzzy spots
        mo = specks(H, Wk, 50, 1.5, 5, 390 + len(k)) * (0.4 + 0.6 * smooth(0, 0.6, fbm(H, Wk, 50, 391 + len(k))))
        rgb[:] = comp(rgb, np.array([0.62, 0.68, 0.52]), blur(mo, 1.2) * 0.6)
    rgb, hgt = torso_atlas(F[0], B[0], S[0], F[1], B[1], S[1])
    finish('tee_zombie', rgb, hgt, 0.6)


def build_jog_zombie():
    def post(rgb, hgt, d, H, Wt, W, seed, vi, face):
        r = np.random.default_rng(seed + 400)
        g = lum(rgb)[..., None]
        rgb = rgb * 0.6 + g * np.array([0.36, 0.40, 0.48]) * 0.8
        # grave mud caked up the shins
        yy = np.mgrid[0:H, 0:Wt][0].astype(np.float32)
        cake = smooth(0.45 * H, 0.95 * H, yy + 60 * fbm(H, Wt, 25, seed + 401)) * (0.6 + 0.4 * smooth(-0.3, 0.4, fbm(H, Wt, 12, seed + 402)))
        rgb = soil(rgb, cake, d, seed + 403, 1.0, (0.28, 0.22, 0.16))
        hgt += cake * 2 * (0.5 + 0.5 * fbm(H, Wt, 4, seed + 404))
        # one leg's knee torn open onto rotten skin; blood dripped down both
        if vi == 0:
            hole_, rim_ = tears(H, Wt, seed + 405, 2, (0.42, 0.55), (0.04, 0.2), (80, 140))
            sk = rot_skin(H, Wt, (300, 500)) * (0.55 + 0.45 * blur(1 - hole_, 3))[..., None]
            rgb = comp(rgb, sk, hole_)
            lip = np.clip(blur(hole_, 2.5) * 3 - hole_ * 3, 0, 1)
            rgb = comp(rgb, rgb * 1.35 + 0.04, lip * 0.7)
            rgb = comp(rgb, rgb * 0.6, np.clip(rim_ - lip, 0, 1) * 0.5)
            frs = fibres(H, Wt, 110, 22, seed + 406, 0.9, 0.3) * np.clip(blur(hole_, 7) * 3, 0, 1)
            rgb = comp(rgb, np.array([0.42, 0.45, 0.60]), frs * 0.75)
            hgt += rim_ * 2 - hole_ * 3 + frs
        dm = drips(H, Wt, 5, seed + 407, (0.02, 0.95), (0.0, 0.3), (0.15, 0.4), (3, 6))
        rgb = blood_soak(rgb, dm * 0.8, seed + 408, 0.5)
        return rgb, hgt
    limb('jog_zombie', dict(seeds=(221, 222), color=0x34416e, extras=jog_extras, post=post, mud=1.0, flecks=0.4, cuff='rib', fade=1.3, knee_wear=1.4))


# ---------------------------------------------------------------- 3. hoodie (xx_lilcreepah_xx)
HOOD = dict(pocket=(0.18, 0.139, 0.82, 0.361), eyelet_x=0.07, eyelet_y=0.01, band=0.05)   # torso-local fractions (u0, v0, u1, v1)


def build_hoodie():
    color, seed = 0x2b2b2e, 501
    Wf, Ws, H = int(0.50 * PT), int(0.27 * PT), 1024
    out = {}
    band_h = HOOD['band'] * PT
    for k, W, off, ang in (('front', Wf, (300, 120), -2), ('back', Wf, (820, 640), 2), ('side', Ws, (100, 700), 0)):
        d, w = fabric(H, W, 0.9, ang, off, lowsig=34)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.random.default_rng(seed + len(k) * 11)
        fh = np.zeros((H, W), np.float32)
        for i in range(4 if k != 'side' else 2):
            x0 = r.uniform(0.1, 0.9) * W
            fh += fold(H, W, [(x0, r.uniform(0.15, 0.4) * H), (x0 + r.uniform(-40, 40), 0.7 * H), (x0 + r.uniform(-50, 50), H - band_h)], r.uniform(22, 38), r.uniform(6, 11))
        if k != 'side':
            for sx in (-1, 1):
                for j in range(2):
                    pts = [(W / 2 + sx * W * r.uniform(0.15, 0.3), r.uniform(0.25, 0.45) * H), (W / 2 + sx * W * 0.56, r.uniform(0.02, 0.15) * H)]
                    fh += fold(H, W, pts, r.uniform(10, 18), r.uniform(5, 9) * (1 if j == 0 else -0.7))
        for j in range(8):          # blousing over the waistband
            y = H - band_h - r.uniform(4, 110)
            x0 = r.uniform(-60, W * 0.7)
            fh += fold(H, W, [(x0, y), (x0 + r.uniform(90, 240), y + r.uniform(-16, 16))], r.uniform(7, 13), r.uniform(-6, 7))
        hgt = fh.copy() + (d - 1) * 10          # the photo's own knit relief
        rgb = dye(d, w, color, 1.5, 1.9, 0.10)
        fade = np.clip(0.7 * smooth(0, 12, fh) + 0.3 * fbm(H, W, 120, seed + 5), 0, 1)
        rgb = rgb + fade[..., None] * np.array([0.05, 0.05, 0.055])         # washed-out black goes grey on the crests
        rgb *= (1 + 1.0 * (shade(fh, 0.5) - 1))[..., None]
        # ribbed waistband (and the sleeve cuffs cropped from the side strip)
        bmask = smooth(H - band_h - 2, H - band_h + 2, yy)
        rh, rr = rib(H, W, bmask, 7.0, True, 1.8)
        rgb = comp(rgb, dye(d, np.ones_like(w), color, 1.0, add=0.06) * (0.85 + 0.3 * rr[..., None]), bmask)
        hgt = hgt * (1 - bmask) + rh + bmask * 1.5
        ov = np.exp(-((yy - (H - band_h)) / 7) ** 2)
        rgb *= (1 - 0.35 * ov)[..., None]
        st = stitches(H, W, [(-5, H - band_h - 6), (W + 5, H - band_h - 6)], 6, 3.5, 2.0, seed + 7)
        rgb = comp(rgb, rgb * 0.6, st * 0.8)
        hgt -= st
        if k == 'front':
            cx = W / 2
            hw, dep = 0.085 * PT, 0.075 * PT
            # hood opening: two edges crossing at the centre, right over left; the hood's dark inside shows above the cross
            Lp = [(cx - hw, -6), (cx + 0.01 * PT, dep)]
            Rp = [(cx + hw, -6), (cx - 0.012 * PT, dep + 4)]
            dr = Draw(H, W); dr.poly([(cx - hw, -6), (cx + hw, -6), (cx, dep - 6)]); inner = dr.mask()
            hood_in = dye(d, w, 0x1b1b1d, 1.2, 1.0) * (0.5 + 0.5 * smooth(0, dep, yy))[..., None]
            rgb = comp(rgb, hood_in, inner)
            for pts, sd in ((Lp, 1), (Rp, -1)):
                dl, fl_ = polyline_dist(H, W, pts)
                side = ((xx - pts[0][0]) * (pts[1][1] - pts[0][1]) - (yy - pts[0][1]) * (pts[1][0] - pts[0][0])) * sd
                bandm = smooth(0.026 * PT, 0.022 * PT, dl) * (side > 0) * smooth(1.02, 0.98, fl_ / 1.0)
                rgb = comp(rgb, dye(d, np.ones_like(w), 0x323236, 1.2, add=0.06) * (0.9 + 0.2 * smooth(0, 0.024 * PT, dl))[..., None], bandm)
                hgt += bandm * 3.5 * (1 - dl / (0.03 * PT))
                st = stitches(H, W, [(pts[0][0] + sd * 0.0, pts[0][1] + 0.024 * PT), (pts[1][0], pts[1][1] + 0.024 * PT)], 6, 3.5, 2.0, seed + 9 + sd)
                rgb = comp(rgb, rgb * 0.55, st * 0.8)
                shd = smooth(0.034 * PT, 0.024 * PT, dl) * (side > 0) * (1 - bandm)
                rgb *= (1 - 0.35 * shd)[..., None]
            # metal eyelets where the 3D drawstrings come out
            for sx in (-1, 1):
                ex, ey = cx + sx * HOOD['eyelet_x'] * PT, HOOD['eyelet_y'] * PT + 6
                dr = Draw(H, W); dr.ellipse(ex, ey, 9, 9); outer = dr.mask()
                dr = Draw(H, W); dr.ellipse(ex, ey, 5, 5); hole = dr.mask()
                ringm = outer * (1 - hole)
                rgb = comp(rgb, np.array([0.62, 0.60, 0.55]) * (0.75 + 0.5 * smooth(ey + 8, ey - 8, yy))[..., None], ringm)
                rgb = comp(rgb, np.array([0.03, 0.03, 0.03]), hole)
                hgt += ringm * 3 - hole * 3
            # kangaroo pocket: patch with a hemmed top, slanted hand openings, stitched sides and bottom
            u0, v0, u1, v1 = HOOD['pocket']
            x0, x1, y0, y1 = u0 * W, u1 * W, (1 - v1) * H, (1 - v0) * H
            pm = np.zeros((H, W), np.float32); pm[int(y0):int(y1), int(x0):int(x1)] = 1
            pm = blur(pm, 1.0)
            pf = dye(d, w, color, 1.5, 1.4, 0.10) * (1 + 0.6 * (shade(fh, 0.5) - 1))[..., None] + fade[..., None] * 0.04
            rgb = comp(rgb, pf, pm)
            hgt += pm * 2
            topst = stitches(H, W, [(x0 + 0.06 * W, y0 + 10), (x1 - 0.06 * W, y0 + 10)], 6, 3.5, 2.0, seed + 11)
            topst = np.maximum(topst, stitches(H, W, [(x0 + 0.06 * W, y0 + 18), (x1 - 0.06 * W, y0 + 18)], 6, 3.5, 2.0, seed + 12))
            rgb = comp(rgb, rgb * 0.5, topst * 0.85)
            for sx, xa, xb in ((1, x0 + 0.075 * W, x0 + 4), (-1, x1 - 0.075 * W, x1 - 4)):
                pts = [(xa, y0 + 2), (xa - sx * 0.02 * W, y0 + 0.35 * (y1 - y0)), (xb, y1 - 0.12 * (y1 - y0))]
                dl, _ = polyline_dist(H, W, pts)
                slit = smooth(5, 2, dl)
                lipm = smooth(10, 4, dl) * (1 - slit)
                rgb = comp(rgb, np.array([0.02, 0.02, 0.02]), slit * pm)
                rgb = comp(rgb, rgb * 1.25 + 0.03, lipm * pm * 0.7)
                hgt += (lipm * 2 - slit * 4) * pm
                st = stitches(H, W, [(p[0] + sx * 9, p[1]) for p in pts], 6, 3.5, 2.0, seed + 13 + sx)
                rgb = comp(rgb, rgb * 0.55, st * pm * 0.8)
            bst = stitches(H, W, [(x0 + 6, y1 - 6), (x1 - 6, y1 - 6)], 6, 3.5, 2.0, seed + 15)
            rgb = comp(rgb, rgb * 0.55, bst * 0.8)
            under = np.exp(-((yy - y1 - 2) / 4) ** 2) * (xx > x0) * (xx < x1)
            rgb *= (1 - 0.3 * under)[..., None]
            # cheese-puff dust: orange fingertip smears beside the pocket openings, and crumbs
            ch = smudge(H, W, [([(x0 + r.uniform(-30, 30), y0 + r.uniform(20, 120)), (x0 + r.uniform(-70, -20), y0 + r.uniform(80, 200))], r.uniform(10, 16)) for _ in range(3)]
                        + [([(x1 + r.uniform(-20, 20), y0 + r.uniform(30, 120)), (x1 + r.uniform(10, 60), y0 + r.uniform(90, 180))], r.uniform(9, 14))], seed + 17, 4, 0.7)
            dust = specks(H, W, 80, 0.8, 2.2, seed + 18, (x0 - 90, y0 - 40, x1 + 70, y1)) * 0.8
            grain = smooth(-0.2, 0.6, fbm(H, W, 3, seed + 22, 2))           # powder, not paint: broken up by the fleece
            om = np.clip(ch * 0.6 * grain + dust * 0.7, 0, 1)
            rgb = comp(rgb, np.array([0.80, 0.46, 0.16]) * (0.8 + 0.3 * fbm(H, W, 5, seed + 19)[..., None]), om * 0.55)
            # energy drink: dried sugary drips down the chest (a touch paler, glossy rims)
            dm = drips(H, W, 4, seed + 20, (0.35, 0.65), (0.12, 0.2), (0.12, 0.3), (5, 9))
            rgb = comp(rgb, rgb * 1.25 + np.array([0.05, 0.06, 0.03]), dm * 0.55)
        if k == 'back':
            cx = W / 2
            hw, hl = 0.17 * PT, 0.30 * PT
            yy2 = yy
            shape = ((xx - cx) / hw) ** 2 + (np.maximum(yy2 - (hl - hw * 0.9), 0) / (hw * 0.9)) ** 2
            hm = smooth(1.02, 0.97, shape)
            edge = smooth(0.88, 0.97, shape) * hm
            hood = dye(d, w, color, 1.5, 1.6, 0.10) * (1 + 0.6 * (shade(fh, 0.5) - 1))[..., None]
            hood = hood * (0.9 + 0.2 * smooth(hl, 0, yy2))[..., None]
            rgb = comp(rgb, hood, hm)
            rgb = comp(rgb, rgb * 1.15 + 0.02, edge * 0.6)
            under = np.clip(blur(hm, 6) - hm, 0, 1) * 2.5 * (yy2 > hl * 0.5)
            rgb *= (1 - 0.45 * under)[..., None]
            hgt += hm * 4 + edge * 2
            cs = stitches(H, W, [(cx, 0), (cx, hl - 5)], 6, 3.5, 2.0, seed + 21) * hm
            rgb = comp(rgb, rgb * 0.5, cs * 0.8)
            hgt -= cs * 1.5
        # crumbs, lint, stray hairs, dense fleece pilling
        cr = specks(H, W, 40, 1.0, 2.8, seed + 31 + len(k), (0, 0.3 * H, W, H))
        rgb = comp(rgb, np.array([0.72, 0.62, 0.42]), cr * 0.8)
        lint = fibres(H, W, 26, 46, seed + 32 + len(k), 0.9)
        rgb = comp(rgb, np.array([0.62, 0.60, 0.58]), lint * 0.55)
        pil = specks(H, W, 900, 0.7, 1.7, seed + 33 + len(k))
        rgb = comp(rgb, rgb * 1.45 + 0.03, pil * 0.5)
        hgt += pil + cr * 1.5
        out[k] = (rgb, hgt)
    rgb, hgt = torso_atlas(out['front'][0], out['back'][0], out['side'][0], out['front'][1], out['back'][1], out['side'][1])
    finish('hoodie_creepah', rgb, hgt, 0.6)


# ---------------------------------------------------------------- 4. hand-knitted jumper (honeybee_mc)
def knit(X, Y, sw, sh, seed, rib_mask=None, jitter=0.035):
    """stockinette height field from (possibly warped) coordinates. Returns (height 0..1, stitch row index, stitch col index).
    Each stitch is a V of two rounded yarn legs with ply twist; rib_mask (0..1) turns columns into k2p2 ribbing."""
    rng = np.random.default_rng(seed)
    J = np.floor(Y / sh)
    best = np.zeros_like(X)
    rowi = J.copy()
    coli = np.floor(X / sw)
    jt = rng.normal(0, 1, (4096,)).astype(np.float32)
    for dy in (-1, 0, 1):
        j = J + dy
        i = np.floor(X / sw)
        key = ((i * 73 + j * 151) % 4096).astype(np.int64)
        ox = jt[key] * jitter * sw
        oy = jt[(key + 977) % 4096] * jitter * sh
        cx = (i + 0.5) * sw + ox
        cy = (j + 0.5) * sh + oy
        lx, ly = X - cx, Y - cy
        if rib_mask is not None:
            purl = ((i.astype(np.int64) // 2) % 2 == 1).astype(np.float32) * rib_mask
        else:
            purl = 0
        for sd in (-1, 1):
            # leg axis runs from the top-outer corner down to the bottom centre
            ax, ay = -sd * 0.62, 1.0
            n = np.hypot(ax, ay); ax, ay = ax / n, ay / n
            px_, py_ = lx - sd * sw * 0.23, ly + sh * 0.05
            par = px_ * ax + py_ * ay
            per = -px_ * ay + py_ * ax
            a, b = sh * 0.66, sw * 0.27
            r2 = (par / a) ** 2 + (per / b) ** 2
            h = np.sqrt(np.clip(1 - r2, 0, 1))
            tw = 0.88 + 0.12 * np.cos((par * 0.9 + per * 1.6) / (b * 0.6) * np.pi)
            h = h * tw
            if rib_mask is not None:
                # purl columns: a horizontal bump sitting back in the fabric
                bump = np.sqrt(np.clip(1 - (lx / (sw * 0.48)) ** 2 - (ly / (sh * 0.36)) ** 2, 0, 1)) * 0.55
                h = h * (1 - purl) + bump * purl
            m = h > best
            best = np.where(m, h, best)
            rowi = np.where(m, j, rowi)
    return best, rowi, coli


def build_jumper():
    seed = 601
    sw, sh = 15.0, 11.5
    Wf, Ws, H = int(0.50 * PT), int(0.27 * PT), 1024
    yellow, black = hexs(0xe8a51a), hexs(0x1a1714)
    stripes = [(1 - 0.583) * H, (1 - 0.25) * H]     # stripe centres (px from the top), 0.125 of the height each = the 3D bands
    sth = 0.125 * H / 2
    rib_h, col_t = 0.06 * PT, 0.032 * PT
    wool = src('wool')
    out = {}
    for k, W, xoff in (('front', Wf, 0), ('back', Wf, 4000), ('side', Ws, 9000)):
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.random.default_rng(seed + len(k))
        # gentle drape (warps the stitch grid a little, and shades)
        fh = np.zeros((H, W), np.float32)
        for i in range(4 if k != 'side' else 2):
            x0 = r.uniform(0.1, 0.9) * W
            fh += fold(H, W, [(x0, r.uniform(0.2, 0.4) * H), (x0 + r.uniform(-30, 30), H)], r.uniform(25, 45), r.uniform(5, 9))
        X = xx + xoff + 4.0 * fbm(H, W, 120, seed + 3 + len(k))
        Y = yy + 2.5 * fbm(H, W, 160, seed + 4 + len(k))
        ribm = smooth(H - rib_h - 3, H - rib_h + 3, yy)
        inside = np.zeros((H, W), np.float32)
        colm = np.zeros((H, W), np.float32)
        if k in ('front', 'back'):
            a, b, top = 0.105 * PT, (0.10 if k == 'front' else 0.03) * PT, (-0.03 if k == 'front' else -0.012) * PT
            cx = W / 2
            r_in = np.sqrt(((xx - cx) / a) ** 2 + ((yy - top) / b) ** 2)
            r_out = np.sqrt(((xx - cx) / (a + col_t)) ** 2 + ((yy - top) / (b + col_t)) ** 2)
            inside = smooth(1.01, 0.99, r_in)
            colm = smooth(1.01, 0.99, r_out) * (1 - inside)
            # collar knitted around the neck: rib running radially (warp the coordinates along the band)
            ang = np.arctan2((yy - top) / (b + col_t / 2), (xx - cx) / (a + col_t / 2))
            Xc = ang * (a + b) / 2 + 2000
            Yc = (r_in - 1) * (b + a) / 2
            hc, _, _ = knit(Yc * 1.0 + 500, Xc, sh * 0.9, sw * 0.62, seed + 7)
        hk, rowi, coli = knit(X, Y, sw, sh, seed, ribm)
        hk = hk * (1 - colm) + (hc if k in ('front', 'back') else 0) * colm
        # yarn colour per stitch row: two black stripes; per-stitch dye/tension variation
        ry = (rowi + 0.5) * sh
        isb = np.zeros((H, W), np.float32)
        for c in stripes:
            isb = np.maximum(isb, (np.abs(ry - c) < sth).astype(np.float32))
        isb *= (1 - ribm) * (1 - colm)
        var = np.random.default_rng(seed + 9).normal(0, 1, 8192).astype(np.float32)
        sv = var[((rowi * 97 + coli * 31) % 8192).astype(np.int64)]
        base = yellow[None, None, :] * (1 + 0.05 * sv[..., None]) * (1 - isb[..., None]) + black[None, None, :] * (1 + 0.15 * sv[..., None]) * isb[..., None]
        # fuzz: the fleece photo's fine fibres, lighter yarn halo
        wf = sample(wool, H, W, 0.6, 20, (xoff * 0.1, 300))
        wl = lum(wf); wd = wl / blur(wl, 6, 'wrap')
        ao = 0.38 + 0.62 * np.clip(hk, 0, 1) ** 0.6
        rgb = base * ao[..., None] * (0.85 + 0.25 * np.clip(wd, 0.6, 1.5)[..., None])
        halo = fibres(H, W, 900 if k != 'side' else 350, 10, seed + 11 + len(k), 0.7, 0.9)
        rgb = comp(rgb, base * 1.15 + 0.03, halo * 0.35)
        rgb *= (1 + 0.9 * (shade(fh, 0.4) - 1))[..., None]
        hgt = hk * 5 + fh + (wd - 1) * 0.6
        if k == 'front':
            sk = sample(src('skin'), H, W, 0.8, 0, (100, 400))
            neck = hexs(0xf0c0a0)[None, None, :] * (lum(sk) / lum(sk).mean())[..., None]
            neck *= ((0.62 + 0.38 * smooth(0, 0.09 * PT, yy)) * (1 - 0.35 * np.clip(blur(colm, 6) * 1.6, 0, 1)))[..., None]
            rgb = comp(rgb, neck, inside)
            hgt -= inside * 4
            # darn: a patch of paler yarn woven over a hole
            dx0, dy0 = 0.68 * W, 0.62 * H
            dm = blobs(H, W, [(dx0, dy0, 38, 30)], seed + 13, 12, 0.1, 0.3)
            weave = (0.5 + 0.5 * np.cos(xx / 3.2 * np.pi)) * (np.floor(yy / 6) % 2) + (0.5 + 0.5 * np.cos(yy / 3.2 * np.pi)) * (1 - np.floor(yy / 6) % 2)
            rgb = comp(rgb, hexs(0xf0c048)[None, None, :] * (0.55 + 0.45 * weave[..., None]), dm)
            hgt += dm * (weave * 2 - 1)
            # honey run off the right shoulder lobe beside the neck (model -x = image left), beeswax flakes, pollen
            hx = (0.5 - 0.168 / 0.5) * W
            hm = drips(H, W, 1, seed + 15, (hx / W - 0.01, hx / W + 0.01), (0.0, 0.01), (0.2, 0.24), (22, 26))
            hm = np.maximum(hm, drips(H, W, 1, seed + 25, (hx / W + 0.03, hx / W + 0.05), (0.0, 0.01), (0.08, 0.12), (14, 16)))
            hm = np.maximum(hm, blobs(H, W, [(hx + 10, 18, 40, 26)], seed + 16, 10, 0.1, 0.3))
            amber = np.array([0.56, 0.30, 0.03])
            core = smooth(0.2, 0.9, blur(hm, 4))
            hl = np.clip(blur(hm, 2) - blur(hm, 6), 0, 1) * 3 * smooth(0, 0.5, fbm(H, W, 6, seed + 26) + 0.3)
            rgb = comp(rgb, amber * (0.55 + 0.6 * core)[..., None] + hl[..., None] * np.array([0.9, 0.75, 0.45]), hm * 0.9)
            hgt += hm * 3
            wx = specks(H, W, 14, 2.5, 5.5, seed + 17, (hx - 60, 0, hx + 80, 0.25 * H))
            rgb = comp(rgb, np.array([0.93, 0.84, 0.55]), wx * 0.9)
        if k == 'back':
            pass
        # pulled loops: a few stitches drawn out of the fabric
        for i in range(3 if k != 'side' else 1):
            px0, py0 = r.uniform(0.1, 0.9) * W, r.uniform(0.15, 0.85) * H
            lm = Draw(H, W); lm.line(ellipse_pts(px0, py0 + 9, 5, 10, -20, 200, 20), 3.2); lmask = lm.mask()
            rgb = comp(rgb, base * 1.1, lmask)
            hgt += lmask * 4
        pol = specks(H, W, 220 if k != 'side' else 80, 0.6, 1.5, seed + 19 + len(k))
        rgb = comp(rgb, np.array([0.95, 0.72, 0.18]), pol * 0.7)
        gr = specks(H, W, 30, 1.0, 2.5, seed + 21 + len(k), (0, 0.4 * H, W, H))
        rgb = comp(rgb, np.array([0.40, 0.33, 0.22]), gr * 0.7)
        rgb *= (1 - 0.18 * smooth(H - 8, H - 1, yy))[..., None]
        out[k] = (rgb, hgt)
    rgb, hgt = torso_atlas(out['front'][0], out['back'][0], out['side'][0], out['front'][1], out['back'][1], out['side'][1])
    finish('jumper_bee', rgb, hgt, 0.5)
    LOG['jumper_bee']['stripes_v'] = [0.583, 0.25]


# ---------------------------------------------------------------- 2. limb unwraps (legs, Brad's sleeves)
PL = 1219                  # limb build density, px per block (0.84 around x 0.56 tall = 1024 x 683)


def limb_canvas(seed, color, H=683, W=1024, m=48, d_amp=1.6, w_amp=1.5, name='jersey', scale=1.0, off=(0, 0)):
    """base fabric for one limb unwrap, W+m wide (the extra m columns are folded back over the start for a seamless wrap)"""
    d, w = fabric(H, W + m, scale, 0.0, off, name=name)
    return d, w


def wrap_fold(a, W, m):
    """make columns [0, W) wrap: blend the extra columns [W, W+m) over the start"""
    out = a[:, :W].copy()
    t = np.linspace(0, 1, m, dtype=np.float32)
    t = t * t * (3 - 2 * t)
    sh = (1, m) + (1,) * (a.ndim - 2)
    out[:, :m] = a[:, W:W + m] * (1 - t.reshape(sh)) + a[:, :m] * t.reshape(sh)
    return out


def seam_v(H, Wt, x, seed, y0=0, y1=None, pucker=True):
    """vertical seam at column x: a ridge, a valley beside it, one stitch row; returns (height, stitch mask)"""
    y1 = H if y1 is None else y1
    yy, xx = np.mgrid[0:H, 0:Wt].astype(np.float32)
    wob = 2.0 * fbm(H, 1, 40, seed, 2)[:, :1]
    dx = xx - x - wob
    inside = smooth(y0 - 2, y0 + 2, yy) * smooth(y1 + 2, y1 - 2, yy)
    h = (2.2 * np.exp(-(dx / 3.5) ** 2) - 1.4 * np.exp(-((dx - 6) / 2.5) ** 2) + 0.8 * np.exp(-((dx + 7) / 6) ** 2)) * inside
    if pucker:
        h *= 1 + 0.35 * np.sin(yy / 9.0 + seed)
    st = stitches(H, Wt, [(x + 8, y0), (x + 8, y1)], 6, 3.5, 2.0, seed) * inside
    return h - st, st


def limb(id_, spec):
    H, W, m = 683, 1024, 48
    Wt = W + m
    halves = []
    for vi, seed in enumerate(spec['seeds']):
        r = np.random.default_rng(seed)
        d, w = limb_canvas(seed, spec['color'], H, W, m, name=spec.get('fabric', 'jersey'), scale=spec.get('scale', 1.0), off=(vi * 300 + 40, vi * 410 + 90))
        yy, xx = np.mgrid[0:H, 0:Wt].astype(np.float32)
        face = lambda f: f * W / 4               # face start column: 0 front, 1 outer, 2 back, 3 inner
        hgt = (d - 1) * 10                       # the photo's own knit relief
        # vertical drape folds + knee/back-of-knee creases + bunching above the cuff
        for i in range(9):
            x0 = r.uniform(0.02, 0.98) * W
            hgt += fold(H, Wt, [(x0, r.uniform(-0.1, 0.4) * H), (x0 + r.uniform(-25, 25), r.uniform(0.6, 1.0) * H)], r.uniform(14, 26), r.uniform(3, 7) * spec.get('drape', 1))
        knee_y = 0.48 * H
        for f, n in ((0, spec.get('knee_creases', 4)), (2, spec.get('back_creases', 5))):
            cx = face(f) + W / 8
            for j in range(n):
                y = knee_y + r.uniform(-0.09, 0.09) * H
                hgt += fold(H, Wt, [(cx - r.uniform(50, 120), y + r.uniform(-12, 12)), (cx + r.uniform(50, 120), y + r.uniform(-12, 12))], r.uniform(5, 9), r.uniform(-5, 6) * spec.get('crease', 1))
        cuff_h = spec.get('cuff_h', 0.055) * PL
        bunch = spec.get('bunch', 1.0)
        for j in range(int(14 * bunch)):
            y = H - cuff_h - r.uniform(5, 0.14 * H)
            x0 = r.uniform(-60, W)
            hgt += fold(H, Wt, [(x0, y), (x0 + r.uniform(70, 200), y + r.uniform(-18, 18))], r.uniform(5, 10), r.uniform(-6, 6) * bunch)
        rgb = dye(d, w, spec['color'], spec.get('d_amp', 1.6), spec.get('w_amp', 1.5), spec.get('add', 0.0))
        hue = np.stack([fbm(H, Wt, 160, seed + c, 3) for c in range(3)], -1)
        rgb *= 1 + 0.02 * hue
        fade = np.clip(0.55 * smooth(0, 10, hgt) + 0.2 * fbm(H, Wt, 100, seed + 5), 0, 1) * spec.get('fade', 1.0)
        grey = lum(rgb)[..., None]
        rgb = rgb * (1 - 0.35 * fade[..., None]) + (grey * 1.1 + 0.05) * 0.35 * fade[..., None]
        rgb *= (1 + 0.9 * (shade(hgt, 0.45) - 1))[..., None]
        # knee wear: paler, fuzzier patch on the front
        kn = blobs(H, Wt, [(face(0) + W / 8, knee_y, 70, 60)], seed + 9, 30, 0.1, 0.6)
        rgb = comp(rgb, rgb * 1.18 + 0.04, kn * 0.5 * spec.get('knee_wear', 1))
        # seams
        for f, x in spec.get('seams', ((1, 0.5), (3, 0.5))):
            sh_, st = seam_v(H, Wt, face(f) + x * W / 4, seed + f)
            hgt += sh_
            rgb = comp(rgb, rgb * 0.7, st * 0.8)
            rgb *= (1 + 0.6 * (shade(sh_, 0.6) - 1))[..., None]
        out = spec['extras'](rgb, hgt, d, H, Wt, W, seed, vi, face) if 'extras' in spec else (rgb, hgt)
        rgb, hgt = out
        # cuff / hem
        ct = spec.get('cuff', 'rib')
        band = smooth(H - cuff_h - 2, H - cuff_h + 2, yy)
        if ct == 'rib':
            rh, rr = rib(H, Wt, band, spec.get('rib_sp', 8.0), True, 1.8)
            cuffc = dye(d, np.ones_like(w), spec['color'], 1.0) * (0.8 + 0.2 * rr[..., None])
            rgb = comp(rgb, cuffc * spec.get('cuff_tone', 0.92), band)
            hgt = hgt * (1 - band) + rh + band * 1.5
            ov = np.exp(-((yy - (H - cuff_h)) / 6) ** 2)        # fabric blousing over the cuff casts a soft shadow onto it
            rgb *= (1 - 0.35 * ov * smooth(H - cuff_h - 4, H - cuff_h + 8, yy))[..., None]
            hgt += 3 * np.exp(-((yy - (H - cuff_h - 6)) / 5) ** 2)
        elif ct in ('hem', 'fray'):
            hh, st, hb = hem(H, Wt, cuff_h, seed + 21, rows=1 if ct == 'hem' else 0)
            hgt += hh
            rgb = comp(rgb, rgb * 0.68, st * 0.85)
            rgb = comp(rgb, rgb * 1.05, hb * 0.5)
            if ct == 'fray':
                fr = fibres(H, Wt, 160, 22, seed + 23, 1.0, 0.25) * smooth(H - 30, H - 6, yy)
                rgb = comp(rgb, rgb * 1.3 + 0.05, fr * 0.6)
        rgb *= (1 - 0.25 * smooth(H - 8, H - 1, yy))[..., None]
        # wear (mud low, flecks, pilling)
        if spec.get('mud', 0):
            mm = blobs(H, Wt, [(r.uniform(0.05, 0.95) * W, H - r.uniform(0.0, 0.25) * H, r.uniform(40, 110), r.uniform(25, 70)) for _ in range(int(6 * spec['mud']))], seed + 31, 18, 0.3, 0.35)
            mm *= smooth(0.45 * H, 0.9 * H, yy) * 0.8 + 0.2
            rgb = soil(rgb, mm, d, seed + 32, spec['mud'])
            km = blobs(H, Wt, [(face(0) + W / 8 + r.uniform(-30, 30), knee_y + r.uniform(-20, 20), r.uniform(40, 70), r.uniform(30, 50))], seed + 33, 16, 0.3, 0.35)
            rgb = soil(rgb, km, d, seed + 34, spec['mud'] * spec.get('knee_mud', 1.0))
        if spec.get('grass', 0):
            st_ = smudge(H, Wt, [([(face(0) + r.uniform(10, 200), knee_y + r.uniform(-40, 60)), (face(0) + r.uniform(10, 240), knee_y + r.uniform(20, 90))], r.uniform(12, 24)) for _ in range(2)], seed + 41, 5, 0.6)
            rgb = grass_stain(rgb, st_ * spec['grass'], seed + 42)
        if spec.get('flecks', 0):
            fl = specks(H, Wt, int(70 * spec['flecks']), 1.0, 3.0, seed + 51)
            rgb = comp(rgb, np.array([0.33, 0.24, 0.16]), fl * 0.85)
            fl2 = specks(H, Wt, int(40 * spec['flecks']), 0.9, 2.2, seed + 52)
            rgb = comp(rgb, np.array([0.70, 0.58, 0.40]), fl2 * 0.8)
            hgt += (fl + fl2) * 1.5
        pil = specks(H, Wt, int(spec.get('pills', 300)), 0.7, 1.6, seed + 71)
        rgb = comp(rgb, rgb * 1.15 + 0.03, pil * 0.5)
        hgt += pil * 0.8
        if 'post' in spec:
            rgb, hgt = spec['post'](rgb, hgt, d, H, Wt, W, seed, vi, face)
        halves.append((resize(wrap_fold(rgb, W, m), 1024, 512), resize(wrap_fold(hgt, W, m), 1024, 512)))
    rgb = np.concatenate([halves[0][0], halves[1][0]], 0)        # A on top (v .5-1), B below
    hgt = np.concatenate([halves[0][1], halves[1][1]], 0)
    finish(id_, rgb, hgt, spec.get('nstrength', 0.6))


def jog_extras(rgb, hgt, d, H, Wt, W, seed, vi, face):
    """slanted side-pocket opening at the top of the outer face; drawcord shadow under the tee is hidden anyway"""
    x0 = face(1) + W / 8
    dr = Draw(H, Wt)
    dr.line([(x0 - 30, -4), (x0 + 22, 0.20 * H)], 3.2)
    slit = dr.mask()
    sh_ = fold(H, Wt, [(x0 - 30, -4), (x0 + 22, 0.20 * H)], 6, 2.5) - slit * 2.5
    hgt = hgt + sh_
    rgb = comp(rgb, rgb * 0.35, slit * 0.9)
    st = stitches(H, Wt, [(x0 - 22, -4), (x0 + 30, 0.20 * H)], 6, 3.5, 2.0, seed + 5)
    rgb = comp(rgb, rgb * 0.7, st * 0.8)
    st2 = stitches(H, Wt, [(x0 + 22, 0.20 * H), (x0 + 32, 0.205 * H)], 5, 3, 2.5, seed + 6)   # bar tack
    rgb = comp(rgb, rgb * 0.6, st2)
    return rgb, hgt


def build_jog_dan():
    limb('jog_dan', dict(seeds=(201, 202), color=0x46558f, extras=jog_extras, mud=0.7, grass=0.8, flecks=1.0, knee_mud=1.2))


def twill(H, W, period=5.0, amp=0.1, ang=1.0):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return 1 - amp + amp * (0.5 + 0.5 * np.cos((xx * ang + yy) / period * 2 * np.pi))


def patch_pocket(rgb, hgt, d, H, Wt, x0, y0, x1, y1, seed, flap=None, color=None, snaps=0):
    """sewn-on patch pocket (optional flap with snaps): raised, stitched, shadowed underneath"""
    yy, xx = np.mgrid[0:H, 0:Wt].astype(np.float32)
    pm = np.zeros((H, Wt), np.float32); pm[int(y0):int(y1), int(x0):int(x1)] = 1
    pm = blur(pm, 1.2)
    rgb = comp(rgb, rgb * 1.04, pm)
    hgt = hgt + pm * 2.5
    for e in (6, 12):
        st = stitches(H, Wt, [(x0 + e, y0 + 4), (x0 + e, y1 - e), (x1 - e, y1 - e), (x1 - e, y0 + 4)], 6, 3.5, 2.0, seed + e)
        rgb = comp(rgb, rgb * 0.6 if color is None else color, st * 0.85)
        hgt -= st
    sh_ = np.clip(blur(pm, 5) - pm, 0, 1) * 2.2 * (yy > (y0 + y1) / 2)
    rgb *= (1 - 0.4 * sh_)[..., None]
    if flap:
        fy1 = y0 + flap
        fm = np.zeros((H, Wt), np.float32); fm[int(y0 - 6):int(fy1), int(x0 - 4):int(x1 + 4)] = 1
        fm = blur(fm, 1.2)
        rgb = comp(rgb, rgb * 1.06, fm)
        hgt = hgt + fm * 2.5
        st = stitches(H, Wt, [(x0 + 2, fy1 - 7), (x1 - 2, fy1 - 7)], 6, 3.5, 2.0, seed + 30)
        rgb = comp(rgb, rgb * 0.6 if color is None else color, st * 0.85)
        und = np.exp(-((yy - fy1 - 2) / 4) ** 2) * (xx > x0) * (xx < x1)
        rgb *= (1 - 0.45 * und)[..., None]
        for i in range(snaps):
            sx = x0 + (i + 1) * (x1 - x0) / (snaps + 1)
            dr = Draw(H, Wt); dr.ellipse(sx, fy1 - 16, 9, 9); sm = dr.mask()
            rgb = comp(rgb, np.array([0.30, 0.28, 0.22]) * (0.7 + 0.6 * smooth(fy1 - 6, fy1 - 26, yy))[..., None], sm)
            hgt += sm * 3
    return rgb, hgt


def leggings_extras(rgb, hgt, d, H, Wt, W, seed, vi, face):
    """flatlock seams (zigzag) down both sides"""
    yy, xx = np.mgrid[0:H, 0:Wt].astype(np.float32)
    for f in (1, 3):
        x = face(f) + W / 8
        zz = np.abs(((yy / 7.0) % 2) - 1) * 10 - 5
        dl = np.abs(xx - x - zz)
        zig = smooth(1.8, 0.8, dl) * (np.abs(xx - x) < 6)
        band = smooth(9, 6, np.abs(xx - x))
        rgb = comp(rgb, rgb * 1.08, band * 0.5)
        rgb = comp(rgb, rgb * 0.62, zig * 0.85)
        hgt = hgt + band * 1.5 - zig
    return rgb, hgt


def creepah_tr_extras(rgb, hgt, d, H, Wt, W, seed, vi, face):
    r = np.random.default_rng(seed + 50)
    rgb = rgb * twill(H, Wt, 4.5, 0.09)[..., None]
    x0 = face(1) + 30
    rgb, hgt = patch_pocket(rgb, hgt, d, H, Wt, x0, 0.12 * H, x0 + 0.62 * W / 4, 0.40 * H, seed + 51)
    # carpet fluff on the knees, orange cheese-puff fingerprints on the thigh
    kx = face(0) + W / 8
    fl = fibres(H, Wt, 140, 12, seed + 52, 0.8, 1.0) * blobs(H, Wt, [(kx, 0.48 * H, 70, 50)], seed + 53, 20, 0.1, 0.4)
    rgb = comp(rgb, np.array([0.55, 0.53, 0.50]), fl * 0.6)
    fp = smudge(H, Wt, [([(kx + r.uniform(-60, 60), 0.2 * H + r.uniform(-30, 30)), (kx + r.uniform(-60, 60), 0.22 * H + r.uniform(-30, 30))], r.uniform(12, 16)) for _ in range(3)], seed + 54, 3, 0.8)
    rgb = comp(rgb, np.array([0.78, 0.46, 0.17]), fp * 0.35 * smooth(-0.2, 0.6, fbm(H, Wt, 3, seed + 55, 2)))
    return rgb, hgt


def brad_tr_extras(rgb, hgt, d, H, Wt, W, seed, vi, face):
    r = np.random.default_rng(seed + 60)
    tw = twill(H, Wt, 4.0, 0.16, 1.0) * (1 + 0.06 * fbm(H, Wt, 3, seed + 65, 2))      # heavy cotton canvas twill with slubs
    rgb = rgb * tw[..., None]
    hgt = hgt + (tw - 1) * 6
    x0 = face(1) + 18
    rgb, hgt = patch_pocket(rgb, hgt, d, H, Wt, x0, 0.16 * H, x0 + 0.78 * W / 4, 0.46 * H, seed + 61, flap=52, snaps=2)
    # crude hand-stitched repair across a tear on the shin (black thread cross-stitches)
    cx, cy = face(0) + W / 8 + r.uniform(-30, 30), 0.68 * H
    hole_, rim_ = tears(H, Wt, seed + 62, 1, (cy / H - 0.01, cy / H + 0.01), ((cx - 5) / Wt, (cx + 5) / Wt), (60, 70))
    rgb = comp(rgb, rgb * 0.35, hole_ * 0.8)
    dr = Draw(H, Wt)
    for i in range(7):
        x = cx - 30 + i * 10
        dr.line([(x - 5, cy - 12), (x + 5, cy + 12)], 2.4)
        dr.line([(x + 5, cy - 12), (x - 5, cy + 12)], 2.4)
    xs = dr.mask()
    rgb = comp(rgb, np.array([0.06, 0.05, 0.05]), xs * 0.9)
    hgt += xs * 1.5 - hole_ * 2
    # sand caked in the creases (pale, gritty)
    sand = specks(H, Wt, 500, 0.7, 1.8, seed + 63) * smooth(-0.1, 0.5, fbm(H, Wt, 40, seed + 64))
    rgb = comp(rgb, np.array([0.62, 0.55, 0.40]), sand * 0.8)
    return rgb, hgt


def brad_sleeve_extras(rgb, hgt, d, H, Wt, W, seed, vi, face):
    r = np.random.default_rng(seed + 70)
    yy, xx = np.mgrid[0:H, 0:Wt].astype(np.float32)
    # ripstop: a fine raised grid of heavier threads
    g = np.maximum(smooth(1.4, 0.4, np.abs(((xx + 3) % 14) - 7) - 6), smooth(1.4, 0.4, np.abs(((yy + 3) % 14) - 7) - 6))
    rgb = comp(rgb, rgb * 1.08, g * 0.55)
    hgt = hgt + g * 0.8
    # elbow patch on the back of the sleeve
    ex = face(2) + W / 8
    rgb, hgt = patch_pocket(rgb, hgt, d, H, Wt, ex - 60, 0.36 * H, ex + 60, 0.62 * H, seed + 71)
    # salt tide marks (pale wavy rims) and builder's sand
    for i in range(3):
        cx, cy = r.uniform(0.05, 0.95) * W, r.uniform(0.15, 0.7) * H
        m = blobs(H, Wt, [(cx, cy, r.uniform(50, 90), r.uniform(40, 70))], seed + 72 + i, 20, 0.2, 0.15)
        rim = np.clip(m - blur(m, 3), 0, 1) * 3
        rgb = comp(rgb, rgb * 1.25 + 0.08, rim * 0.5)
    sand = specks(H, Wt, 400, 0.7, 1.8, seed + 75) * smooth(-0.1, 0.5, fbm(H, Wt, 40, seed + 76))
    rgb = comp(rgb, np.array([0.62, 0.55, 0.40]), sand * 0.8)
    # duct tape over a tear on the front (cropped from the real tape on his mask)
    if vi == 0:
        tape = load(P('final_ent/face_brad_basecolor.png'))[735:905, 715:940]
        th, tw = tape.shape[:2]
        tx, ty = int(face(0) + 30), int(0.22 * H)
        tw2, th2 = int(W / 4 - 40), int(th * (W / 4 - 40) / tw * 0.55)
        tp = resize(tape, tw2, th2)
        mask = np.ones((th2, tw2), np.float32)
        ragged = fbm(th2, 1, 6, seed + 77, 2)[:, 0]
        for yv in range(th2):
            cut = int(6 + 5 * ragged[yv])
            mask[yv, :max(0, cut)] = 0
            mask[yv, tw2 - max(0, cut + 2):] = 0
        mask = blur(mask, 0.8)
        full = np.zeros((H, Wt), np.float32); full[ty:ty + th2, tx:tx + tw2] = mask
        tfull = np.zeros((H, Wt, 3), np.float32); tfull[ty:ty + th2, tx:tx + tw2] = tp
        shd = np.clip(blur(full, 4) - full, 0, 1)
        rgb *= (1 - 0.5 * shd)[..., None]
        rgb = comp(rgb, tfull * 0.9, full)
        hgt = hgt + full * 3 + (lum(tfull) - 0.5) * full * 2
    # buttoned cuff: band + two buttons on the outer face
    ox = face(1) + W / 8
    for i, by in enumerate((H - 0.03 * PL, H - 0.03 * PL)):
        bx = ox + (i * 2 - 1) * 26
        dr = Draw(H, Wt); dr.ellipse(bx, by, 10, 10); bm = dr.mask()
        dr = Draw(H, Wt); dr.ellipse(bx - 3, by, 1.6, 1.6); dr.ellipse(bx + 3, by, 1.6, 1.6); hm = dr.mask()
        rgb = comp(rgb, np.array([0.25, 0.27, 0.18]) * (0.7 + 0.6 * smooth(by + 8, by - 8, yy))[..., None], bm)
        rgb = comp(rgb, np.array([0.05, 0.05, 0.04]), hm)
        hgt = hgt + bm * 3 - hm * 2
    return rgb, hgt


def build_leggings():
    limb('leggings_bee', dict(seeds=(301, 302), color=0x3a3350, scale=0.75, extras=leggings_extras, cuff='hem', cuff_h=0.03, bunch=0.5, drape=0.5,
                             knee_creases=6, crease=0.8, back_creases=6, seams=(), knee_wear=0.3, flecks=0.3, pills=500, fade=1.4, d_amp=1.3, w_amp=1.2,
                             post=lambda rgb, hgt, d, H, Wt, W, seed, vi, face: (comp(rgb, np.array([0.95, 0.75, 0.2]), specks(H, Wt, 160, 0.6, 1.4, seed + 9) * 0.7), hgt)))


def build_trousers_creepah():
    limb('trousers_creepah', dict(seeds=(311, 312), color=0x3a4636, extras=creepah_tr_extras, cuff='hem', cuff_h=0.032, bunch=0.8, crease=1.1, flecks=0.5, pills=200, fade=0.9))


def build_trousers_brad():
    limb('trousers_brad', dict(seeds=(321, 322), color=0x5a4632, scale=1.2, extras=brad_tr_extras, cuff='fray', cuff_h=0.03, bunch=2.0, drape=1.3,
                               crease=1.4, mud=1.0, knee_mud=1.6, flecks=0.3, pills=60, d_amp=1.1, w_amp=1.0, seams=((1, 0.5), (3, 0.5))))


def build_sleeve_brad():
    limb('sleeve_brad', dict(seeds=(331, 332), color=0x525d38, extras=brad_sleeve_extras, cuff='hem', cuff_h=0.06, bunch=1.2, crease=1.2, knee_creases=5, back_creases=4,
                             mud=0.5, knee_mud=0.3, flecks=0.2, pills=80, seams=((3, 0.5),), d_amp=1.4, w_amp=1.4))


# ---------------------------------------------------------------- 5. pig: bristle hide + muddy flank (from the pig's own side photo)
def bomb(src_img, good, H, W, n, size, seed, wrap=True, scale=1.0, target=None):
    """texture bombing: soft-edged patches of real skin from the `good` region of src_img, levelled to one tone"""
    rng = np.random.default_rng(seed)
    sh, sw_ = src_img.shape[:2]
    L = lum(src_img)
    low = blur(src_img, 40)
    tgt = low.reshape(-1, 3)[good.reshape(-1) > 0.5].mean(0) if target is None else np.asarray(target, np.float32)
    flat = src_img / np.maximum(low, 1e-3) * tgt
    acc = np.zeros((H, W, 3), np.float32)
    wsum = np.zeros((H, W), np.float32) + 1e-6
    ys, xs = np.where(good > 0.5)
    for i in range(n):
        ps = int(rng.uniform(*size))
        ok = False
        for _ in range(80):
            k = rng.integers(0, len(ys))
            cy, cx = ys[k], xs[k]
            y0, x0 = cy - ps // 2, cx - ps // 2
            if y0 >= 0 and x0 >= 0 and y0 + ps < sh and x0 + ps < sw_ and good[y0:y0 + ps, x0:x0 + ps].min() > 0.5:
                ok = True
                break
        if not ok:
            continue
        patch = flat[y0:y0 + ps, x0:x0 + ps]
        if rng.random() < 0.5:
            patch = patch[:, ::-1]
        if scale != 1.0:
            q = max(8, int(ps * scale)); patch = resize(patch, q, q); ps = q
        yy, xx = np.mgrid[0:ps, 0:ps].astype(np.float32)
        rr = np.hypot(xx - ps / 2, yy - ps / 2) / (ps / 2)
        m = np.clip(1 - rr, 0, 1) ** 5             # steep weights: the nearest patch centre dominates (soft seams, little blur)
        ty, tx = rng.integers(0, H), rng.integers(0, W)
        iy = (np.arange(ps) + ty) % H if wrap else np.clip(np.arange(ps) + ty - ps // 2, 0, H - 1)
        ix = (np.arange(ps) + tx) % W if wrap else np.clip(np.arange(ps) + tx - ps // 2, 0, W - 1)
        acc[np.ix_(iy, ix)] += patch * m[..., None]
        wsum[np.ix_(iy, ix)] += m
    out = acc / wsum[..., None]
    gap = smooth(0.02, 0.0, wsum)
    return out * (1 - gap[..., None]) + tgt * gap[..., None]


def pig_sources():
    img = load(P('final_ent/head_pig_side_basecolor.png'))
    good = np.zeros(img.shape[:2], np.float32)
    good[0:1024, 800:1024] = 1
    good[470:1024, 310:1024] = 1
    good[:, :300] = 0
    return img, good


def build_pig():
    img, good = pig_sources()
    tint = 1.0          # pig.js tints these like the head side (SIDE_TINT); the texture keeps the photo's own pink
    PINK = hexs(0xd2aca2)
    # seamless hide (top, front, rump, tail, fifth leg, crown of the head)
    hide = bomb(img, good, 1024, 1024, 260, (170, 260), 701, True, target=PINK)
    hide = hide * tint
    n_ = fbm(1024, 1024, 160, 702, 3)
    hide *= (1 + 0.05 * n_)[..., None]
    fl = specks(1024, 1024, 60, 1.5, 4.5, 703)
    hide = comp(hide, np.array([0.45, 0.33, 0.20]), fl * 0.8)
    straw = fibres(1024, 1024, 12, 40, 704, 1.6, 0.15)
    hide = comp(hide, np.array([0.80, 0.68, 0.40]), straw * 0.75)
    hh = (lum(hide) - blur(lum(hide), 4, 'wrap')) * 18
    finish('pig_hide', hide, hh, 0.6)
    # flank: 1.20 x 0.55 at ~853 px/block -> 1024 x 470, stored 1024 x 512
    H, W = 512, 1024
    fk = bomb(img, good, H, W, 170, (170, 250), 711, True, target=PINK) * tint
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    hgt = (lum(fk) - blur(lum(fk), 4)) * 16
    # body roundness: spine catches light, belly falls into shade; shoulder wrinkles behind the head (image left = front on px)
    fh = np.zeros((H, W), np.float32)
    r = np.random.default_rng(712)
    for i in range(4):
        x0 = 0.12 * W + i * 26 + r.uniform(-8, 8)
        fh += fold(H, W, [(x0 + 20, 0.15 * H), (x0 - 10, 0.5 * H), (x0 + 15, 0.85 * H)], r.uniform(6, 10), r.uniform(4, 7) * (1 if i % 2 else -0.8))
    for i in range(2):                     # ham crease near the rump
        x0 = 0.84 * W + i * 30
        fh += fold(H, W, [(x0, 0.3 * H), (x0 + 30, 0.95 * H)], 10, -5)
    fk *= (1 + 0.8 * (shade(fh, 0.5) - 1))[..., None]
    hgt += fh
    fk *= (0.82 + 0.18 * smooth(1.0 * H, 0.25 * H, yy))[..., None]
    # scratches
    for i in range(4):
        x0, y0 = r.uniform(0.2, 0.8) * W, r.uniform(0.2, 0.6) * H
        dr = Draw(H, W); dr.line([(x0, y0), (x0 + r.uniform(30, 80), y0 + r.uniform(-30, 30))], r.uniform(1.5, 2.5)); m = blur(dr.mask(), 0.6)
        fk = comp(fk, np.array([0.70, 0.30, 0.28]), m * 0.7)
        hgt -= m
    # mud: thick cracked crust along the belly, splashes up the lower third, a smear on the ham
    crust = smooth(0.70 * H, 0.86 * H, yy + 40 * fbm(H, W, 30, 713)) * (0.75 + 0.25 * smooth(-0.3, 0.3, fbm(H, W, 10, 714)))
    d = tex_patch('dirt', H, W, 0.8, (300, 200))
    dl = lum(d) / lum(d).mean()
    mudc = np.array([0.38, 0.29, 0.20])[None, None, :] * (0.65 + 0.45 * dl[..., None])
    cracks = smooth(0.06, 0.0, np.abs(fbm(H, W, 18, 715, 2))) * crust
    fk = comp(fk, mudc, crust * 0.92)
    fk = comp(fk, mudc * 0.45, cracks * 0.8)
    hgt += crust * (2 + 3 * dl) - cracks * 3
    spl = blobs(H, W, [(r.uniform(0, 1) * W, r.uniform(0.45, 0.75) * H, r.uniform(8, 28), r.uniform(6, 18)) for _ in range(40)], 716, 8, 0.25, 0.3)
    spl = np.maximum(spl, specks(H, W, 260, 1.5, 5.0, 717, (0, 0.4 * H, W, 0.8 * H)))
    fk = comp(fk, mudc * 1.05, spl * 0.85)
    hgt += spl * 2.5
    sm = blobs(H, W, [(0.9 * W, 0.45 * H, 70, 50), (0.25 * W, 0.35 * H, 50, 30)], 718, 16, 0.3, 0.4)
    fk = comp(fk, mudc * 1.15, sm * 0.6)
    straw = fibres(H, W, 16, 36, 719, 1.6, 0.15)
    fk = comp(fk, np.array([0.80, 0.68, 0.40]), straw * 0.75)
    finish('pig_flank', fk, hgt, 0.6)


# ---------------------------------------------------------------- 6. bare feet (boomer, zombie): the uncropped H12 foot photo + a side texture
FOOT_CROP = (200, 60, 830, 1024)     # raw px box kept for foot_bare_top (whole foot: toes, real nails, instep)


def build_feet():
    raw = load(P('raw/ent/H12_foot_top_images_0.png'))
    x0, y0, x1, y1 = FOOT_CROP
    top = raw[y0:y1, x0:x1]
    L = lum(top)
    sat = top.max(-1) - top.min(-1)
    bg = smooth(0.66, 0.74, L) * smooth(0.10, 0.05, sat)            # the pale studio grey between the toes
    bg = np.clip(blur(bg, 1.5) * 1.2, 0, 1)
    gap = np.array([0.10, 0.085, 0.075])                             # dark crevice instead (the toes are separate boxes)
    top = comp(top, gap[None, None, :] * (0.8 + 0.4 * blur(1 - bg, 6))[..., None], bg)
    top = resize(top, 1024, 1024)
    # the boomer's feet are dead grey, not tanned: part-desaturate, lift, and flatten the broad tendon shading on the
    # instep (it read as woodgrain on the sloped box); the toes keep their full photo
    yy = np.mgrid[0:1024, 0:1024][0].astype(np.float32)
    inst = smooth(0.30 * 1024, 0.42 * 1024, yy)                    # v < .70 (rows below the toe bases)
    L = lum(top)[..., None]
    low = blur(top, 22)
    top = top - (low - low.reshape(-1, 3).mean(0)) * 0.75 * inst[..., None]
    top = top * 0.5 + L * 0.5
    gm = smooth(-0.1, 0.5, fbm(1024, 1024, 40, 811)) * inst
    top = comp(top, top * np.array([0.72, 0.68, 0.62]), gm * 0.5)     # blotchy grime, not stripes
    top = np.clip(top * 1.08 + 0.02, 0, 1)
    hgt = (lum(top) - blur(lum(top), 5)) * 12 - resize(bg, 1024, 1024) * 4
    finish('foot_bare_top', top, hgt, 0.7)
    # side: heel (u 0) -> toes (u 1), sole edge at the bottom (v 0). Skin bombed from the photo's own instep, calloused
    # yellow sole rim with cracks and grime, horizontal creases, a vein or two
    img = raw
    good = np.zeros(img.shape[:2], np.float32)
    good[560:1000, 300:720] = 1
    H, W = 512, 1024
    sk = bomb(img, good, H, W, 160, (190, 280), 801, True, scale=1.0)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    hgt = (lum(sk) - blur(lum(sk), 4)) * 14
    r = np.random.default_rng(802)
    fh = np.zeros((H, W), np.float32)
    for i in range(18):                                             # creases running along the foot
        y = r.uniform(0.25, 0.8) * H
        xa = r.uniform(0, 0.8) * W
        xm = xa + r.uniform(40, 130)
        fh += fold(H, W, [(xa, y), (xm, y + r.uniform(-8, 8)), (xm + r.uniform(40, 130), y + r.uniform(-15, 15))], r.uniform(4, 7), -r.uniform(1.0, 2.0))
    sk *= (1 + 0.5 * (shade(fh, 0.6) - 1))[..., None]
    hgt += fh
    sole = smooth(0.70 * H, 0.84 * H, yy + 20 * fbm(H, W, 40, 803))
    heel = smooth(0.35 * W, 0.05 * W, xx) * smooth(0.3 * H, 0.6 * H, yy)
    cal = np.clip(sole + heel * 0.8, 0, 1)
    calc = np.array([0.64, 0.57, 0.47])[None, None, :] * (0.9 + 0.15 * (lum(sk) / lum(sk).mean())[..., None])
    sk = comp(sk, calc, cal * 0.6)
    cr = smooth(0.022, 0.0, np.abs(fbm(H, W, 22, 804, 2))) * cal * smooth(-0.2, 0.4, fbm(H, W, 60, 808))
    sk = comp(sk, np.array([0.22, 0.17, 0.12]), cr * 0.75)
    hgt += cal * 1.5 - cr * 3
    grime = smooth(0.84 * H, 0.99 * H, yy) * (0.7 + 0.3 * fbm(H, W, 20, 805))
    sk = comp(sk, np.array([0.24, 0.19, 0.15]), grime * 0.7)
    for i in range(2):                                              # veins over the top of the foot
        x = r.uniform(0.3, 0.8) * W
        pts = [(x + r.uniform(-60, 60), 0.0), (x + r.uniform(-40, 40), 0.25 * H), (x + r.uniform(-90, 90), 0.5 * H)]
        v = fold(H, W, pts, 7, 1.0, 0.15)
        sk = mul(sk, np.array([0.80, 0.86, 0.95]), v * 0.5)
        hgt += v * 3
    dirt = blobs(H, W, [(r.uniform(0, 1) * W, r.uniform(0.3, 0.9) * H, r.uniform(30, 80), r.uniform(15, 40)) for _ in range(6)], 806, 14, 0.3, 0.4)
    sk = soil(sk, dirt * 0.8, np.ones((H, W), np.float32), 807, 0.8)
    finish('foot_bare_side', sk, hgt, 0.7)


# ---------------------------------------------------------------- 7. bare forearms: hairy skin bombed from the back of Dan's fist photo
def build_skin_arm():
    img = load(P('raw/ent/H03_fist_dan_images_0.png'))
    good = np.zeros(img.shape[:2], np.float32)
    good[0:150, 240:820] = 1
    target = hexs(0xe2b6a2)                       # ~ mat_skin's mean, so the models' existing skin tints still land
    sk = bomb(img, good, 1024, 1024, 700, (90, 130), 901, True, target=target)
    low = blur(sk, 6, 'wrap')
    sk = low + (sk - low) * 0.55                   # hairs read as fine darker strands, not a dashed pattern, at forearm size
    sk *= (1 + 0.05 * fbm(1024, 1024, 140, 902, 3))[..., None]
    # a few faint veins and freckles
    r = np.random.default_rng(903)
    for i in range(3):
        x = r.uniform(0, 1024)
        v = fold(1024, 1024, [(x, -20), (x + r.uniform(-90, 90), 500), (x + r.uniform(-120, 120), 1044)], 6, 1.0, 0.05)
        sk = mul(sk, np.array([0.86, 0.88, 0.96]), v * 0.35)
    fr = specks(1024, 1024, 120, 1.2, 3.0, 904)
    sk = comp(sk, sk * np.array([0.82, 0.68, 0.6]), fr * 0.5)
    hgt = (lum(sk) - blur(lum(sk), 3, 'wrap')) * 16
    finish('skin_arm', sk, hgt, 0.55)


BUILDERS = {'tee_dan': build_tee_dan, 'jog_dan': build_jog_dan, 'tee_zombie': build_tee_zombie, 'jog_zombie': build_jog_zombie, 'hoodie_creepah': build_hoodie, 'jumper_bee': build_jumper, 'leggings_bee': build_leggings, 'trousers_creepah': build_trousers_creepah, 'trousers_brad': build_trousers_brad, 'sleeve_brad': build_sleeve_brad, 'pig': build_pig, 'feet': build_feet, 'skin_arm': build_skin_arm}

if __name__ == '__main__':
    ids = sys.argv[1:] or list(BUILDERS)
    for i in ids:
        BUILDERS[i]()
        print('built', i, LOG.get(i))
