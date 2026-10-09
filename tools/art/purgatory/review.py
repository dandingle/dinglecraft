#!/usr/bin/env python3
"""P6 contact sheets (5 columns, labelled) into <DC_PG_ART_SRC>/sheets/ (default out/art/purgatory/sheets/).

  review.py raw <wave> [label-substring ...]   raw candidates (image 0 of each row; patina rows show their basecolor)
  review.py tiles [pg_name ...]                 tile finals: basecolor | 3x3 repeat | normal  (one row per tile)
  review.py ents [id ...]                       entity finals: basecolor | normal
"""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
import pglib as L

S = L.WORK + 'sheets/'
os.makedirs(S, exist_ok=True)


def sheet(out, title, items, cell=300, cols=5):
    rows = max(1, (len(items) + cols - 1) // cols)
    W, H = cols * (cell + 12) + 12, rows * (cell + 34) + 50
    sh = Image.new('RGB', (W, H), (24, 24, 26))
    d = ImageDraw.Draw(sh)
    f = L.tex.font(15)
    d.text((12, 14), title, fill=(240, 240, 240), font=L.tex.font(22))
    for i, (p, lab) in enumerate(items):
        try:
            im = Image.open(p).convert('RGB')
        except Exception:
            continue
        im.thumbnail((cell, cell), Image.LANCZOS)
        x, y = 12 + (i % cols) * (cell + 12), 50 + (i // cols) * (cell + 34)
        sh.paste(im, (x + (cell - im.size[0]) // 2, y + (cell - im.size[1]) // 2))
        d.text((x, y + cell + 6), lab[:40], fill=(220, 220, 220), font=f)
    sh.save(out, quality=88)
    print('sheet', out, len(items), 'items')


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); return
    if a[0] == 'raw':
        w = a[1]; subs = a[2:]
        items = []
        for js in sorted(glob.glob(L.RAWPG + w + '/*.json')):
            lab = os.path.basename(js)[:-5]
            if lab.endswith('.in') or (subs and not any(s in lab for s in subs)):
                continue
            res = json.load(open(js))
            ims = res.get('images', [])
            idx = 0
            for i, im in enumerate(ims):
                if im.get('map_type') == 'basecolor':
                    idx = i
            p = L.raw_img(lab, idx)
            if p:
                items.append((p, lab))
        for k in range(0, len(items), 30):
            sheet(S + 'raw_%s_%s%d.jpg' % (w, '_'.join(subs)[:30] + '_' if subs else '', k // 30), 'raw %s %s' % (w, ' '.join(subs)), items[k:k + 30])
    elif a[0] == 'tiles':
        names = a[1:] or sorted(json.load(open(L.ART + 'tiles_pg.json')))
        items = []
        for n in names:
            b = L.find_final('t', n, 'basecolor'); nm = L.find_final('t', n, 'normal')
            if not b:
                continue
            items += [(b, n), (S + 'tile3/%s.jpg' % n, n + ' 3x3'), (nm, n + ' normal')]
        for k in range(0, len(items), 30):
            sheet(S + 'tiles_%d.jpg' % (k // 30), 'tile finals (basecolor | 3x3 | normal)', items[k:k + 30], cols=6, cell=250)
    elif a[0] == 'ents':
        ids = a[1:]
        if not ids:
            ids = sorted(json.load(open(L.ART + 'ents_pg.json')))
        items = []
        for e in ids:
            b = L.find_final('e', e, 'basecolor')
            if b:
                items.append((b, e))
        for k in range(0, len(items), 30):
            sheet(S + 'ents_%d.jpg' % (k // 30), 'entity finals', items[k:k + 30])


if __name__ == '__main__':
    main()
