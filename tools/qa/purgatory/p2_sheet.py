#!/usr/bin/env python3
"""p2_sheet.py (P2): 5x6 contact sheets from a rig's index.json (items_rig.mjs writes it).
   python3 tools/qa/purgatory/p2_sheet.py <shotDir> <outPrefix>   ->  <outPrefix>_1.jpg, _2.jpg, ... (30 labelled tiles each)"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
d, pre = sys.argv[1], sys.argv[2]
idx = json.load(open(os.path.join(d, 'index.json')))
shots = idx['shots']
TW, TH, LH = 384, 216, 18
try:
    font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 12)
except Exception:
    font = ImageFont.load_default()
for s in range(0, len(shots), 30):
    page = shots[s:s + 30]
    sheet = Image.new('RGB', (TW * 5, (TH + LH) * 6), (24, 18, 22))
    dr = ImageDraw.Draw(sheet)
    for i, (f, label) in enumerate(page):
        im = Image.open(f).convert('RGB').resize((TW, TH), Image.LANCZOS)
        x, y = (i % 5) * TW, (i // 5) * (TH + LH)
        sheet.paste(im, (x, y))
        dr.rectangle([x, y + TH, x + TW, y + TH + LH], fill=(16, 12, 14))
        dr.text((x + 4, y + TH + 2), (str(s + i) + ' ' + label)[:58], fill=(232, 220, 192), font=font)
    out = '%s_%d.jpg' % (pre, s // 30 + 1)
    sheet.save(out, quality=84)
    print(out)
