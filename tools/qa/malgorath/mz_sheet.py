#!/usr/bin/env python3
"""mz_sheet.py (MZ): every JPEG in <dir> (sorted) onto 5x6 contact sheets <dir>/sheet_<n>.jpg, each cell labelled with its file name."""
import os, sys
from PIL import Image, ImageDraw
d = sys.argv[1]
fs = sorted(f for f in os.listdir(d) if f.endswith('.jpg') and not f.startswith('sheet_'))
W, H, cw, ch = 5, 6, 384, 216
for n in range(0, len(fs), W * H):
    sh = Image.new('RGB', (W * cw, H * (ch + 16)), (18, 18, 18)); dr = ImageDraw.Draw(sh)
    for i, f in enumerate(fs[n:n + W * H]):
        im = Image.open(os.path.join(d, f)).convert('RGB').resize((cw, ch))
        x, y = (i % W) * cw, (i // W) * (ch + 16)
        sh.paste(im, (x, y)); dr.text((x + 3, y + ch + 2), f[:-4][:60], fill=(230, 230, 230))
    out = os.path.join(d, 'sheet_%d.jpg' % (n // (W * H)))
    sh.save(out, quality=85); print(out, len(fs[n:n + W * H]))
