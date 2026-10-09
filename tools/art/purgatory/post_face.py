#!/usr/bin/env python3
"""P6 entity post: raw fal outputs -> final_ent/<id>_{basecolor,normal[,roughness]}.png (1024 px), through the write guard.

  python3 tools/art/purgatory/post_face.py [id ...]           (no args: every id whose picked source exists)

Faces / one-offs: the picked candidate (art/picks.json, else the first listed) -> tex.autocrop (trims the plain grey
studio background, stretches back to square) -> tex.normal_from (OpenGL, luminance height). Materials (patina text):
LF-equalised albedo + roughness, normal tilt removed, roughness map shipped (like v6.0's mat_*).
Records every id's recipe in art/ents_pg.json (doc only; pack_assets embeds an id when a model quotes it).
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pglib as L

PICKS = json.load(open(L.ART + 'picks.json')) if os.path.exists(L.ART + 'picks.json') else {}
DOC = L.ART + 'ents_pg.json'

# id -> (kind, candidate labels, options)
ENTS = {
    'pgface_piglet': ('face', ['pgw1_piglet_face'], {'crop': 'auto'}),
    'pgent_satchel': ('obj', ['pgw1_satchel'], {'crop': 'auto'}),
    'pgent_arm': ('obj', ['pgw1_r_arm', 'pgw1_arm_a'], {'crop': (0.125, 0.0, 0.90, 0.92)}),
    'pgent_hand': ('obj', ['pgw1_r_hand', 'pgw1_hand'], {'crop': 'none', 'rot180': True}),
    'pgmat_frogfelt': ('local', ['pgw1_t_sleeve_hero'], {'fn': 'frogfelt'}),
    'pgmat_tongue': ('mat', ['pgw1_mat_tongue'], {'rmean': 70}),
    'pgmat_cuff': ('mat', ['pgw1_r_cuff', 'pgw1_mat_cuff'], {}),
}
try:
    from post_face_w23 import ENTS as E23
    ENTS.update(E23)
except ImportError:
    pass


def post_blacken(b):
    """crush a grey patina hair material to soot black, keeping the curl highlights (no current id uses it)"""
    l = np.clip(L.lum(b) / 255.0, 0, 1)
    v = 8 + 70 * l ** 1.6
    return np.stack([v * 1.04, v * 0.98, v * 0.95], -1)


def local_frogfelt(o):
    """the felt of the sleeve hero (pilling, glue stains, fuzz; left of its seam) made seamless and graded to the frog
    face's felt green: richer than the flat patina felt and the same felt as the Felt Sleeve trees."""
    im = Image.open(L.RAWPG + 'w1/pgw1_t_sleeve_hero_crop.png').convert('RGB')
    w, h = im.size
    a = np.asarray(im.crop((0, 0, int(w * 0.44), h)).resize((L.N, L.N), Image.LANCZOS)).astype(np.float32)
    a = L.seamless(L.equalize(a, 60, 0.85), 0.4)
    tgt = o.get('green')
    if tgt is not None:
        a = L.grade(a, tgt, 1.0, 1.0)
    n = L.normal_from_height(L.pblur(L.lum(a) / 255, 1.0), 6)
    r = L.rough_to(255 - L.lum(a) * 0.3, 225, 0.5)
    sx, sy = L.seam_score(a)
    paths, staged = L.save_maps('e', 'pgmat_frogfelt', a, n, r)
    return {'src': 'P6 local: pgw1_t_sleeve_hero felt (left of the seam), offset-blend seamless, LF-equalised, graded to the '
            'frog face green %s; seam h%.2f v%.2f (the flat patina felt pgw1_mat_frogfelt was rejected)' % (tgt, sx, sy),
            'staged': staged}


def local_felt(o):
    """P7's tintable off-white felt: the patina felt came out blank, so the sleeve felt's own relief (pilling, glue blobs,
    fuzz) is laid on an off-white base: the same felt family as the frog felt and the Felt Sleeve trees."""
    im = Image.open(L.RAWPG + 'w1/pgw1_t_sleeve_hero_crop.png').convert('RGB')
    w, h = im.size
    a = np.asarray(im.crop((0, 0, int(w * 0.44), h)).resize((L.N, L.N), Image.LANCZOS)).astype(np.float32)
    a = L.seamless(L.equalize(a, 60, 0.85), 0.4)
    l = L.lum(a)
    hp = l - L.pblur(l, 24)
    v = np.clip(226 + hp * 1.15, 0, 255)
    b = np.stack([v * 1.0, v * 0.985, v * 0.955], -1)
    n = L.normal_from_height(L.pblur(l / 255, 1.0), 6)
    r = L.rough_to(255 - l * 0.3, 225, 0.5)
    sx, sy = L.seam_score(b)
    paths, staged = L.save_maps('e', 'pgmat_felt', b, n, r)
    return {'src': 'P6 local: the sleeve hero felt relief (pilling, glue blobs) on an off-white base for tinting (the patina '
            'felt pgw2_felt came out blank); seam h%.2f v%.2f' % (sx, sy), 'staged': staged}


def felt_green():
    """the frog felt's grading target: the mean felt green the v6.1 frog art was graded to (ents_pg.json records it)"""
    return [112.5, 140.2, 74.8]


def src_label(eid):
    kind, cands, o = ENTS[eid]
    lab = PICKS.get(eid, cands[0])
    return lab


def do(eid):
    kind, cands, o = ENTS[eid]
    lab = src_label(eid)
    if kind == 'local':
        if o['fn'] == 'frogfelt':
            return local_frogfelt(dict(o, green=felt_green()))
        if o['fn'] == 'felt':
            return local_felt(o)
    if kind == 'mat':
        m = L.patina_maps(lab)
        b = L.equalize(L.rgb(m['basecolor']), 60, o.get('eq', 0.85))
        if o.get('post') == 'blacken':
            b = post_blacken(b)
        r = L.equalize(L.gray(m['roughness']), 60, 0.85)
        if 'rmean' in o:
            r = L.rough_to(r, o['rmean'])
        n = L.fixnormal(L.rgb(m['normal']))
        sx, sy = L.seam_score(b)
        fixed = ''
        if max(sx, sy) > 1.25:            # patina 'both' still left a visible wrap: offset-blend all three maps
            b = L.seamless(b, 0.3); r = L.seamless(r[..., None], 0.3)[..., 0]
            nn = L.seamless(n, 0.3) / 255 * 2 - 1
            nn /= np.linalg.norm(nn, axis=-1, keepdims=True) + 1e-6
            n = (nn * 0.5 + 0.5) * 255
            fixed = ' (offset-blend wrap fix from h%.2f v%.2f)' % (sx, sy)
            sx, sy = L.seam_score(b)
        paths, staged = L.save_maps('e', eid, b, n, r)
        return {'src': 'P6 %s: patina text material, LF-equalised, normal tilt removed; seam h%.2f v%.2f%s' % (lab, sx, sy, fixed),
                'staged': staged}
    p = L.raw_img(lab, 0)
    im = Image.open(p).convert('RGB').resize((L.N, L.N), Image.LANCZOS)
    if o.get('rot180'):
        im = im.rotate(180)
    box = None
    crop = o.get('crop', 'auto' if kind == 'obj' else 'none')   # autocrop eats round faces: faces crop by hand
    if crop == 'auto':
        im, box = L.tex.autocrop(im)
    elif isinstance(crop, (list, tuple)):
        a, b_, c, d = crop
        im = im.crop((int(a * L.N), int(b_ * L.N), int(c * L.N), int(d * L.N))).resize((L.N, L.N), Image.LANCZOS)
        box = crop
    a = np.asarray(im).astype(np.float32)
    n = L.tex.normal_from(a, o.get('nstr', 2.0))
    paths, staged = L.save_maps('e', eid, a, n)
    return {'src': 'P6 %s: nano-banana-pro%s, %s, luminance normals' % (
        lab, '/edit' if lab.endswith('_a') and 'face' in lab else '', ('autocrop %s' if crop == 'auto' else 'crop %s') % (box,) if box else 'no crop'),
        'staged': staged}


def main():
    ids = sys.argv[1:] or list(ENTS)
    doc = json.load(open(DOC)) if os.path.exists(DOC) else {}
    for eid in ids:
        try:
            r = do(eid)
            doc[eid] = r['src']
            print('%-16s %s%s' % (eid, r['src'][:110], '  [STAGED]' if r['staged'] else ''))
        except (FileNotFoundError, KeyError, TypeError, AttributeError) as e:
            print('%-16s skipped (%s: %s)' % (eid, type(e).__name__, e))
    json.dump(dict(sorted(doc.items())), open(DOC, 'w'), indent=1)


if __name__ == '__main__':
    main()
