#!/usr/bin/env python3
"""m4_sheet.py <dir>: 5x6 contact sheets of every NN_*.jpg in <dir> (sheet_0.jpg, sheet_1.jpg ...) plus per-shot luminance metrics
(metrics.json): mean luminance of the lower third (the floor Dan stands on), of the centre column (his silhouette) and of the side
strips (the haze behind him), and the contrast ratio (bible 19.3: R1-R2 >= 3:1 between haze and silhouette; R3 floor >= 0.12)."""
import glob, json, os, sys
from PIL import Image, ImageDraw
d = sys.argv[1]
fs = sorted(f for f in glob.glob(os.path.join(d, '[0-9][0-9]_*.jpg')))
W, H, cw, ch = 5, 6, 384, 216
met = {}
def lum(im):
    g = im.convert('L'); h = g.histogram(); n = sum(h) or 1
    return sum(i * v for i, v in enumerate(h)) / n / 255.0
for f in fs:
    im = Image.open(f).convert('RGB'); w, h = im.size
    floor = lum(im.crop((0, int(h * 0.72), w, h)))
    mid = lum(im.crop((int(w * 0.4), int(h * 0.15), int(w * 0.6), int(h * 0.7))))
    side = (lum(im.crop((0, int(h * 0.1), int(w * 0.12), int(h * 0.6)))) + lum(im.crop((int(w * 0.88), int(h * 0.1), w, int(h * 0.6))))) / 2
    met[os.path.basename(f)] = {'floor': round(floor, 4), 'mid': round(mid, 4), 'side': round(side, 4),
                                'contrast': round((max(mid, side) + 0.05) / (min(mid, side) + 0.05), 2)}
for s in range(0, len(fs), W * H):
    sheet = Image.new('RGB', (W * cw, H * ch), (16, 16, 16)); dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(fs[s:s + W * H]):
        im = Image.open(f).convert('RGB'); im.thumbnail((cw, ch)); x, y = (i % W) * cw, (i // W) * ch
        sheet.paste(im, (x, y)); m = met[os.path.basename(f)]
        dr.text((x + 4, y + 3), os.path.basename(f)[:-4], fill=(255, 255, 0))
        dr.text((x + 4, y + ch - 14), 'floor %.2f mid %.2f side %.2f c %.1f' % (m['floor'], m['mid'], m['side'], m['contrast']), fill=(0, 255, 255))
    sheet.save(os.path.join(d, 'sheet_%d.jpg' % (s // (W * H))), quality=86)
json.dump(met, open(os.path.join(d, 'metrics.json'), 'w'), indent=1)
print('sheets', (len(fs) + W * H - 1) // (W * H), 'shots', len(fs))
