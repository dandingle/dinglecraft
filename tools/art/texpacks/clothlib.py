"""Helpers for the garment / hide texture builder (build_cloth.py).
Everything works on float32 arrays: images are HxWx3 sRGB 0..1, masks and heights HxW.
Canvases are built at a uniform physical density (px per block) and resized into atlas regions at the end."""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
import sys  # noqa: E402
sys.path.insert(0, os.path.dirname(HERE))
import dcpaths  # noqa: E402
PACK = dcpaths.hr_src()   # the Hyperreal workspace ($DC_ART_SRC): raw/ent, final, final_ent


def P(*a):
    return os.path.join(PACK, *a)


def load(path, size=None):
    im = Image.open(path).convert('RGB')
    if size:
        im = im.resize(size, Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255.0


def save(path, a):
    Image.fromarray(np.clip(np.round(a * 255), 0, 255).astype(np.uint8)).save(path)


def s2l(a):
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def l2s(a):
    a = np.clip(a, 0, 1)
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055)


def hexs(h):
    """sRGB hex -> sRGB float triple"""
    return np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255], np.float32) / 255.0


def lum(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def blur(a, s, mode='reflect'):
    if s <= 0:
        return a
    if a.ndim == 3:
        return np.stack([ndi.gaussian_filter(a[..., c], s, mode=mode) for c in range(a.shape[2])], -1)
    return ndi.gaussian_filter(a, s, mode=mode)


def resize(a, w, h):
    """float resize (Lanczos via PIL 'F' per channel)"""
    if a.ndim == 2:
        return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((w, h), Image.LANCZOS))
    return np.stack([resize(a[..., c], w, h) for c in range(a.shape[2])], -1)


def seamless(a, band=0.35):
    out = a.astype(np.float32)
    for ax in (0, 1):
        n = out.shape[ax]
        t = np.roll(out, n // 2, axis=ax)
        i = np.arange(n, dtype=np.float32)
        d = np.abs(i - n / 2) / (n / 2)
        w = np.clip((d - (1 - band)) / band, 0, 1)
        w = w * w * (3 - 2 * w)
        shape = [1] * out.ndim
        shape[ax] = n
        out = out * (1 - w.reshape(shape)) + t * w.reshape(shape)
    return out


def sample(src, H, W, scale=1.0, angle=0.0, off=(0.0, 0.0), flip=False):
    """sample a (seamless) source onto an HxW canvas: `scale` source px per canvas px, rotation in degrees, wrap"""
    h, w = src.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    if flip:
        xx = W - 1 - xx
    c, s = np.cos(np.radians(angle)), np.sin(np.radians(angle))
    u = (xx * c - yy * s) * scale + off[0]
    v = (xx * s + yy * c) * scale + off[1]
    if src.ndim == 2:
        return ndi.map_coordinates(src, [v, u], order=1, mode='grid-wrap').astype(np.float32)
    return np.stack([ndi.map_coordinates(src[..., k], [v, u], order=1, mode='grid-wrap') for k in range(src.shape[2])], -1).astype(np.float32)


def fbm(H, W, cell, seed, octaves=4, gain=0.5):
    """smooth fractal value noise, ~-1..1; `cell` = feature size in px of the first octave"""
    rng = np.random.default_rng(seed)
    out = np.zeros((H, W), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gh, gw = max(2, int(H / cell) + 3), max(2, int(W / cell) + 3)
        g = rng.standard_normal((gh, gw)).astype(np.float32)
        up = resize(g, int(gw * cell), int(gh * cell))
        oy, ox = rng.integers(0, max(1, up.shape[0] - H)), rng.integers(0, max(1, up.shape[1] - W))
        out += amp * up[oy:oy + H, ox:ox + W]
        tot += amp
        amp *= gain
        cell = max(1.5, cell / 2)
    return out / tot


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0 + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


class Draw:
    """antialiased mask drawing (4x supersampled PIL)"""
    def __init__(self, H, W, ss=4):
        self.H, self.W, self.ss = H, W, ss
        self.im = Image.new('L', (W * ss, H * ss), 0)
        self.d = ImageDraw.Draw(self.im)

    def _p(self, pts):
        return [(x * self.ss, y * self.ss) for x, y in pts]

    def line(self, pts, width, fill=255):
        self.d.line(self._p(pts), fill=fill, width=max(1, int(round(width * self.ss))), joint='curve')
        r = width * self.ss / 2
        for x, y in self._p([pts[0], pts[-1]]):
            self.d.ellipse([x - r, y - r, x + r, y + r], fill=fill)

    def poly(self, pts, fill=255):
        self.d.polygon(self._p(pts), fill=fill)

    def ellipse(self, cx, cy, rx, ry, fill=255):
        s = self.ss
        self.d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=fill)

    def rect(self, x0, y0, x1, y1, fill=255):
        s = self.ss
        self.d.rectangle([x0 * s, y0 * s, x1 * s, y1 * s], fill=fill)

    def mask(self):
        return np.asarray(self.im.resize((self.W, self.H), Image.BOX)).astype(np.float32) / 255.0


def polyline_dist(H, W, pts):
    """distance (px) from every pixel to a polyline, plus the arclength fraction of the nearest point"""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    best = np.full((H, W), 1e9, np.float32)
    frac = np.zeros((H, W), np.float32)
    seg = [np.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1)]
    tot = sum(seg) + 1e-9
    acc = 0.0
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        dx, dy = x1 - x0, y1 - y0
        L2 = dx * dx + dy * dy + 1e-9
        t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / L2, 0, 1)
        d = np.hypot(xx - (x0 + t * dx), yy - (y0 + t * dy))
        m = d < best
        best = np.where(m, d, best)
        frac = np.where(m, (acc + t * seg[i]) / tot, frac)
        acc += seg[i]
    return best, frac


def fold(H, W, pts, width, amp, taper=0.25):
    """soft ridge (amp > 0) or crease (amp < 0) height along a polyline, tapering at both ends"""
    d, f = polyline_dist(H, W, pts)
    env = smooth(0, taper, f) * smooth(0, taper, 1 - f)
    return amp * np.exp(-(d / width) ** 2) * env


def stitches(H, W, pts, dash, gap, width, seed=0):
    """running-stitch mask along a polyline (each dash a short capsule)"""
    rng = np.random.default_rng(seed)
    dr = Draw(H, W)
    seg = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    carry = 0.0
    for (x0, y0), (x1, y1) in seg:
        L = np.hypot(x1 - x0, y1 - y0)
        if L < 1e-6:
            continue
        ux, uy = (x1 - x0) / L, (y1 - y0) / L
        s = carry
        while s < L:
            j = rng.uniform(-0.15, 0.15) * dash
            a, b = s + j, min(L, s + dash + j)
            if b > a:
                dr.line([(x0 + ux * a, y0 + uy * a), (x0 + ux * b, y0 + uy * b)], width)
            s += dash + gap
        carry = s - L
    return dr.mask()


def ellipse_pts(cx, cy, rx, ry, a0, a1, n=64):
    t = np.linspace(np.radians(a0), np.radians(a1), n)
    return list(zip(cx + rx * np.cos(t), cy + ry * np.sin(t)))


def blobs(H, W, centers, seed, cell=40, thr=0.15, soft=0.25):
    """irregular stain mask: union of noisy ellipses [(cx, cy, rx, ry)]"""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    n = fbm(H, W, cell, seed, 4)
    m = np.zeros((H, W), np.float32)
    for cx, cy, rx, ry in centers:
        r = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        m = np.maximum(m, smooth(1 + soft, 1 - soft, r + n * 0.6 - thr))
    return np.clip(m, 0, 1)


def specks(H, W, n, rmin, rmax, seed, region=None):
    """small irregular flecks; region = (x0, y0, x1, y1) or a weight mask to bias placement"""
    rng = np.random.default_rng(seed)
    dr = Draw(H, W)
    placed = 0
    tries = 0
    while placed < n and tries < n * 20:
        tries += 1
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        if region is not None:
            if isinstance(region, tuple):
                x0, y0, x1, y1 = region
                x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
            elif rng.random() > region[int(min(H - 1, y)), int(min(W - 1, x))]:
                continue
        r = rng.uniform(rmin, rmax)
        k = rng.integers(3, 7)
        ang = rng.uniform(0, np.pi * 2)
        pts = [(x + r * rng.uniform(0.5, 1.3) * np.cos(ang + i * 2 * np.pi / k), y + r * rng.uniform(0.5, 1.3) * np.sin(ang + i * 2 * np.pi / k)) for i in range(k)]
        dr.poly(pts)
        placed += 1
    return dr.mask()


def fibres(H, W, n, length, seed, width=0.8, curl=0.6):
    """stray hairs / lint: thin wandering curves"""
    rng = np.random.default_rng(seed)
    dr = Draw(H, W)
    for _ in range(n):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        a = rng.uniform(0, np.pi * 2)
        pts = [(x, y)]
        L = rng.uniform(0.4, 1.0) * length
        steps = 8
        for _ in range(steps):
            a += rng.normal(0, curl)
            x += np.cos(a) * L / steps
            y += np.sin(a) * L / steps
            pts.append((x, y))
        dr.line(pts, width)
    return dr.mask()


def normal_from_height(h, strength):
    """OpenGL-convention normal map (same convention as tex.normal_from): h in px-height units"""
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    gx[:, 0] = gx[:, 1]; gx[:, -1] = gx[:, -2]; gy[0] = gy[1]; gy[-1] = gy[-2]
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / l, ny / l, nz / l], -1) * 0.5 + 0.5


def shade(h, strength, light=(-0.35, 0.55, 0.76)):
    """lambert relight factor from a height field (bakes the soft fold shading a photograph would have)"""
    n = normal_from_height(h, strength) * 2 - 1
    n[..., 1] *= -1     # image rows run down; light y is up
    l = np.array(light, np.float32); l /= np.linalg.norm(l)
    d = (n * l).sum(-1)
    return d / l[2]


def comp(base, color, alpha):
    a = np.clip(alpha, 0, 1)[..., None]
    return base * (1 - a) + color * a


def mul(base, color, alpha):
    a = np.clip(alpha, 0, 1)[..., None]
    return base * (1 - a + a * color)
