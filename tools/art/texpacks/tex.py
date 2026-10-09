#!/usr/bin/env python3
"""Image tools for the texture pipeline.
  tile3 IMG OUT [N]              N x N repeat (default 3) to eyeball seams/repetition
  seam IMG                       seam score per axis: edge-wrap diff / mean interior neighbour diff (~1.0 = seamless)
  sheet OUT TITLE IMG:LABEL ...  contact sheet (5 columns), labels under each tile
  mask W H MARGIN FEATHER OUT    white interior (editable) / black border mask
  keepborder ORIG EDIT MARGIN FEATHER OUT   paste ORIG's border back over EDIT (keeps tiling + matches the base)
  resize IMG SIZE OUT            square resize (Lanczos)
  topmask W H TOP FEATHER OUT    white top band of height TOP px (for grass sides), black below
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


def load(p):
    return Image.open(p).convert('RGB')


def tile3(src, out, n=3):
    im = load(src)
    w, h = im.size
    big = Image.new('RGB', (w * n, h * n))
    for y in range(n):
        for x in range(n):
            big.paste(im, (x * w, y * h))
    big.save(out)


def seam(src):
    a = np.asarray(load(src)).astype(np.float32)
    def axis(arr):
        edge = np.abs(arr[:, 0] - arr[:, -1]).mean()
        inner = np.abs(arr[:, 1:] - arr[:, :-1]).mean()
        return edge / max(inner, 1e-6)
    return axis(a), axis(a.transpose(1, 0, 2))


def font(sz):
    for f in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            pass
    return ImageFont.load_default()


def sheet(out, title, items, cell=360, cols=5):
    rows = (len(items) + cols - 1) // cols
    W, H = cols * (cell + 16) + 16, rows * (cell + 52) + 70
    sh = Image.new('RGB', (W, H), (24, 24, 26))
    d = ImageDraw.Draw(sh)
    d.text((16, 18), title, fill=(240, 240, 240), font=font(26))
    for i, it in enumerate(items):
        p, lab = (it.split(':', 1) + [''])[:2]
        im = load(p).resize((cell, cell), Image.LANCZOS)
        x, y = 16 + (i % cols) * (cell + 16), 70 + (i // cols) * (cell + 52)
        sh.paste(im, (x, y))
        d.text((x, y + cell + 8), lab[:46], fill=(220, 220, 220), font=font(17))
    sh.save(out)


def mask(w, h, margin, feather, out):
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).rectangle([margin, margin, w - 1 - margin, h - 1 - margin], fill=255)
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    m.save(out)


def topmask(w, h, top, feather, out):
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).rectangle([0, 0, w - 1, top], fill=255)
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    m.save(out)


def keepborder(orig, edit, margin, feather, out):
    o, e = load(orig), load(edit).resize(load(orig).size, Image.LANCZOS)
    w, h = o.size
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).rectangle([margin, margin, w - 1 - margin, h - 1 - margin], fill=255)
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    Image.composite(e, o, m).save(out)


if __name__ == '__main__':
    c, a = sys.argv[1], sys.argv[2:]
    if c == 'tile3':
        tile3(a[0], a[1], int(a[2]) if len(a) > 2 else 3)
    elif c == 'seam':
        x, y = seam(a[0])
        print(f'{a[0]}  horizontal-wrap {x:.2f}  vertical-wrap {y:.2f}')
    elif c == 'sheet':
        sheet(a[0], a[1], a[2:])
    elif c == 'mask':
        mask(int(a[0]), int(a[1]), int(a[2]), float(a[3]), a[4])
    elif c == 'topmask':
        topmask(int(a[0]), int(a[1]), int(a[2]), float(a[3]), a[4])
    elif c == 'keepborder':
        keepborder(a[0], a[1], int(a[2]), float(a[3]), a[4])
    elif c == 'resize':
        load(a[0]).resize((int(a[1]), int(a[1])), Image.LANCZOS).save(a[2])
    else:
        print(__doc__)


def seamless_arr(a, band=0.35):
    """offset-blend on both axes: edges come from the half-rolled copy, so the result wraps"""
    out = a.astype(np.float32)
    for ax in (0, 1):
        n = out.shape[ax]
        t = np.roll(out, n // 2, axis=ax)
        i = np.arange(n, dtype=np.float32)
        d = np.abs(i - n / 2) / (n / 2)              # 0 centre .. 1 edges
        w = np.clip((d - (1 - band)) / band, 0, 1)
        w = w * w * (3 - 2 * w)
        shape = [1, 1, 1]; shape[ax] = n
        w = w.reshape(shape)
        out = out * (1 - w) + t * w
    return out


def equalize_arr(a, sig=60, amt=0.85):
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi ** 2) * (sig ** 2) * (fx ** 2 + fy ** 2))
    out = a.astype(np.float32).copy()
    for c in range(a.shape[2]):
        lf = np.real(np.fft.ifft2(np.fft.fft2(out[..., c]) * g))
        out[..., c] = out[..., c] - (lf - lf.mean()) * amt
    return out


def normal_from(a, strength=2.5):
    """OpenGL-convention normal map from luminance (height ~ brightness)"""
    from PIL import Image as _I
    g = np.asarray(_I.fromarray(a.astype(np.uint8)).convert('L').filter(ImageFilter.GaussianBlur(1.0))).astype(np.float32) / 255
    gx = np.roll(g, -1, 1) - np.roll(g, 1, 1); gy = np.roll(g, -1, 0) - np.roll(g, 1, 0)
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(g)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return (np.stack([nx / l, ny / l, nz / l], -1) * 0.5 + 0.5) * 255


def autocrop(im, thr=34, need=0.96):
    """trim a plain studio background off the borders, then stretch back to square"""
    a = np.asarray(im).astype(np.float32); h, w = a.shape[:2]
    corners = np.concatenate([a[:24, :24].reshape(-1, 3), a[:24, -24:].reshape(-1, 3), a[-24:, :24].reshape(-1, 3), a[-24:, -24:].reshape(-1, 3)])
    bg = np.median(corners, 0)
    subj = np.sqrt(((a - bg) ** 2).sum(-1)) > thr
    x0, x1, y0, y1 = 0, w - 1, 0, h - 1
    for _ in range(w):
        changed = False
        if subj[y0:y1 + 1, x0].mean() < need and x0 < w * 0.3: x0 += 1; changed = True
        if subj[y0:y1 + 1, x1].mean() < need and x1 > w * 0.7: x1 -= 1; changed = True
        if subj[y0, x0:x1 + 1].mean() < need and y0 < h * 0.3: y0 += 1; changed = True
        if subj[y1, x0:x1 + 1].mean() < need and y1 > h * 0.7: y1 -= 1; changed = True
        if not changed: break
    return im.crop((x0, y0, x1 + 1, y1 + 1)).resize((w, h), Image.LANCZOS), (x0, y0, x1, y1)
