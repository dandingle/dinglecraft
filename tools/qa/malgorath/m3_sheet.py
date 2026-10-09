#!/usr/bin/env python3
"""m3_sheet.py (M3): a 5 x 6 contact sheet from a folder of JPEG/PNG frames (sorted by name), each tile labelled with its file stem.
usage: python3 m3_sheet.py <dir> <out.jpg> [--cols 5] [--rows 6] [--w 384] [--extra img ...]"""
import sys, os
from PIL import Image, ImageDraw
def main():
    a = sys.argv[1:]; d, out = a[0], a[1]
    cols = int(a[a.index('--cols') + 1]) if '--cols' in a else 5
    rows = int(a[a.index('--rows') + 1]) if '--rows' in a else 6
    W = int(a[a.index('--w') + 1]) if '--w' in a else 384
    extra = a[a.index('--extra') + 1:] if '--extra' in a else []
    files = sorted(f for f in os.listdir(d) if f.lower().endswith(('.jpg', '.png')) and not f.startswith('sheet'))
    paths = [os.path.join(d, f) for f in files][:cols * rows - len(extra)] + extra
    H = int(W * 9 / 16)
    sheet = Image.new('RGB', (cols * W, rows * (H + 18)), (24, 24, 24))
    dr = ImageDraw.Draw(sheet)
    for i, p in enumerate(paths[:cols * rows]):
        im = Image.open(p).convert('RGB'); im.thumbnail((W, H))
        x, y = (i % cols) * W, (i // cols) * (H + 18)
        sheet.paste(im, (x + (W - im.width) // 2, y + (H - im.height) // 2))
        dr.text((x + 4, y + H + 3), os.path.splitext(os.path.basename(p))[0][:52], fill=(230, 230, 230))
    sheet.save(out, quality=88)
    print(out, len(paths), 'tiles')
if __name__ == '__main__':
    main()
