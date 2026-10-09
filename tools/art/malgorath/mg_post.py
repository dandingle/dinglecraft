#!/usr/bin/env python3
"""mg_post.py (M4): raw fal outputs -> <DC_MG_ART_SRC>/final/<id>_{basecolor,normal,roughness,mask}.png (run via mg_art.py post).
Seamless maps: periodic low-frequency equalise on albedo and roughness, patina's -Y normal tilt removed (pglib helpers, read only).
The crack mask (hide, brow, crust, char) is lifted out of the hero's glowing orange cracks (high red, red well above blue, bright),
softened, and the cracks are darkened in the albedo so the emissive carries each round's hue (ember, blood, white-gold) cleanly.
The eye is the picked hero, centred and square, its mask the glowing iris. The Husk face is the picked edit of face_dan (same layout).
Sizes: hide, brow, flesh 1024; everything else 512 (bible 20)."""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'purgatory'))
import dcpaths  # noqa: E402
import pglib as L  # noqa: E402                              # pure image maths (equalize, fixnormal, pblur, seam_score ...)
ART = dcpaths.mg_src()                                       # the Malgorath workspace ($DC_MG_ART_SRC)
RAW, FINAL = ART + 'raw/', ART + 'final/'
PICKS = os.path.join(HERE, 'picks.json')
SIZE = {'mg_hide': 1024, 'mg_brow': 1024, 'mg_flesh': 1024}
MASK = {'mg_hide': 1, 'mg_brow': 1, 'mg_crust': 1, 'mg_char': 1}
FLOOR = {'mg_brow': 0.3}          # MZ: pale bone reads ~0.18 in crack_mask; only the real cracks may glow
SEAMFIX = {'mg_enamel': 1}        # MZ: patina's enamel extract kept the tooth outline (seam h5.7 v10.3): blend it periodic


def maps(label):
    res = json.load(open(RAW + label + '.json')); out = {}
    for i, im in enumerate(res.get('images', [])):
        p = RAW + '%s_images_%d.png' % (label, i)
        if os.path.exists(p): out[im.get('map_type') or 'tile'] = p
    return out


def rgbN(p, n): return L.rgb(p, n)


def grayN(p, n): return L.gray(p, n)


def crack_mask(b):
    """glowing orange cracks: red high, red >> blue, bright -> 0..1, softened"""
    r, g, bl = b[..., 0] / 255, b[..., 1] / 255, b[..., 2] / 255
    hot = np.clip((r - 0.5 * (g + bl)) * 2.2, 0, 1) * np.clip((r - 0.35) * 2.0, 0, 1)
    hot = np.clip(L.pblur(hot, 1.2) * 1.25, 0, 1)
    return hot


def darken_cracks(b, m, col=(22, 14, 12), k=0.8):
    c = np.array(col, np.float32)[None, None, :]
    return b * (1 - k * m[..., None]) + c * (k * m[..., None])


def save(img, id_, mp):
    os.makedirs(FINAL, exist_ok=True)
    a = L.u8(img)
    Image.fromarray(a, 'L' if a.ndim == 2 else 'RGB').save(FINAL + '%s_%s.png' % (id_, mp), optimize=True)


def pbr(label, id_):
    m = maps(label); n = SIZE.get(id_, 512)
    if 'basecolor' not in m: print('  skip', id_, '(no basecolor in', label + ')'); return False
    b = rgbN(m['basecolor'], n); r = grayN(m['roughness'], n) if 'roughness' in m else None
    nn = rgbN(m['normal'], n) if 'normal' in m else None
    b = L.equalize(b, 60 * n / 1024, 0.85)
    if SEAMFIX.get(id_):
        b = L.seamless(b)
        if r is not None: r = L.seamless(r[..., None])[..., 0] if r.ndim == 2 else L.seamless(r)
        if nn is not None: nn = L.seamless(nn)
    if MASK.get(id_):
        k = crack_mask(b)
        if FLOOR.get(id_): k = np.clip((k - FLOOR[id_]) / (1 - FLOOR[id_]), 0, 1)
        save(k * 255, id_, 'mask'); b = darken_cracks(b, k)
        print('  %s mask mean %.3f' % (id_, k.mean()))
    if r is not None: r = L.equalize(r, 60 * n / 1024, 0.85); save(r, id_, 'roughness')
    if nn is not None: save(L.fixnormal(nn, 60 * n / 1024), id_, 'normal')
    save(b, id_, 'basecolor')
    sh, sv = L.seam_score(b); print('  %s %dpx seam h%.2f v%.2f' % (id_, n, sh, sv)); return True


def picked(label):
    pk = json.load(open(PICKS)).get(label)
    return None if pk is None else RAW + '%s_images_%d.png' % (label, int(pk))


def eye():
    p = picked('mgh_eye')
    if not p or not os.path.exists(p): print('  skip mg_eye'); return
    im = Image.open(p).convert('RGB'); w, h = im.size; s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((512, 512), Image.LANCZOS)
    b = np.asarray(im).astype(np.float32); save(b, 'mg_eye', 'basecolor')
    lum = L.lum(b) / 255; save(np.clip((lum - 0.15) * 1.6, 0, 1) * 255, 'mg_eye', 'mask'); print('  mg_eye from', os.path.basename(p))


def husk():
    p = picked('mgh_husk')
    if not p or not os.path.exists(p): print('  skip face_husk'); return
    im = Image.open(p).convert('RGB').resize((512, 512), Image.LANCZOS); save(np.asarray(im).astype(np.float32), 'face_husk', 'basecolor')
    print('  face_husk from', os.path.basename(p))


def main(only=None):
    jobs = [('mgx_hide', 'mg_hide'), ('mgx_brow', 'mg_brow'), ('mgx_flesh', 'mg_flesh'), ('mgx_horn', 'mg_horn'), ('mgx_enamel', 'mg_enamel'),
            ('mgx_crust', 'mg_crust'), ('mgx_bile', 'mg_bile'), ('mgh_char', 'mg_char')]
    for lab, id_ in jobs:
        if only and id_ != only: continue
        if os.path.exists(RAW + lab + '.json'): pbr(lab, id_)
        else: print('  pending', id_)
    if not only or only == 'mg_eye': eye()
    if not only or only == 'face_husk': husk()


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
