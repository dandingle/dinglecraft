#!/usr/bin/env python3
"""r1_local_art.py: the Release 1.0 art pass, done locally (no generator, no paid call). Deterministic and idempotent.

  python3 tools/art/texpacks/r1_local_art.py --orig <v6.3 Hyperreal workspace> --out <Release 1.0 workspace> [--sheet FILE]
  python3 tools/art/texpacks/r1_local_art.py --scan <workspace>       (metadata report only: PNG/WebP chunks, never pixels)
  python3 tools/art/texpacks/r1_local_art.py --strip <workspace>      (drop text/time/EXIF/C2PA chunks from every PNG; pixels untouched)

--orig is only READ (it must hold the v6.3 art: final/ and final_ent/). --out is a copy of it (make it with an APFS clone,
`cp -cR`, so it costs no disk space); every change below is written there, always recomputed from --orig, so running the
pass twice gives the same bytes. Then repack from --out (docs/ASSETS.md):  npm run repack -- --src <out> --mg-src <mg>.

What it does (the Release 1.0 IP scrub; free art only, no generator):
  remove   every id in tests/fixtures/ip_denylist.json removedIds13 (ROT13): their PNGs leave final_ent/. (The models no
           longer quote them either, which is what drops them from the pack; deleting the files is for tidiness.)
  rename   the two renamed ids of the same fixture (new id; pgface_blank keeps its pixels).
  sac      boomer_core (the boomer's gunpowder sac, seen when its chest doors open) is repainted from scratch: one round,
           lumpy cavity in the moss hide (mat_mossflesh), a raw-flesh wall (the nethrock tile), a glowing skin (the lava
           tile) and a drift of black grit (the gravel tile) in the bottom; the normal comes from its height and luminance.
           Nothing of the old sac's outline survives (its v6.3 WebPs are in the denylist's removed[] list).
  keg      the Hyperreal boomer is a walking keg: keg_staves (staves + two iron hoops, tileable across) and face_boomer
           (the keg front: two bored eye holes, a burnt zig-zag grin), built from the game's own plank and chest-strap tiles.
  pelt     face_pelt: the pelt-head front xx_lilcreepah_xx wears, a dried moss hide with two ragged eye holes and a
           stitched zig-zag mouth, built from mat_mossflesh.
  recolour tee_dan / jog_dan (orange #d9822b / charcoal #34343a), tee_zombie / jog_zombie (olive work shirt / brown
           trousers), pgface_feltdan + fist_pg (burlap brown felt; Felt Dan gets sewn-on button eyes). Hue-banded, so
           stains, blood and dirt keep their colour; the normal maps are kept (the cloth did not change shape).
  paint    pg_can_s: the two eyes in the dark gap under the bin lid are filled with the gap's own shadow (every map).
Every PNG it writes carries pixels only (no text, EXIF, XMP or ICC chunks); --strip cleans the copied sources the same way (some
v6.0 tile sources carry a C2PA provenance chunk). The repo never holds these PNGs, and the packed WebPs never carry chunks.
"""
import argparse, codecs, json, os, shutil, struct, sys, zlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import dcpaths  # noqa: E402

DENY = dcpaths.R('tests', 'fixtures', 'ip_denylist.json')
N = 1024
SS = 4            # supersampling for painted shapes


# ------------------------------------------------------------------ io
def rd(path, mode='RGB'):
    return np.asarray(Image.open(path).convert(mode)).astype(np.float32)


def wr(path, a, mode='RGB'):
    """pixels only: a fresh image from the array, saved with no ancillary chunks"""
    a = np.clip(np.round(a), 0, 255).astype(np.uint8)
    im = Image.fromarray(a, mode)
    tmp = path + '.tmp.png'
    im.save(tmp, 'PNG', optimize=False, compress_level=9)
    os.replace(tmp, path)


def png_chunks(path):
    out = []
    with open(path, 'rb') as f:
        if f.read(8) != b'\x89PNG\r\n\x1a\n':
            return None
        while True:
            h = f.read(8)
            if len(h) < 8:
                break
            n, t = struct.unpack('>I4s', h)
            out.append(t.decode('latin-1'))
            f.seek(n + 4, 1)
            if t == b'IEND':
                break
    return out


def webp_chunks(path):
    out = []
    with open(path, 'rb') as f:
        b = f.read()
    if b[:4] != b'RIFF' or b[8:12] != b'WEBP':
        return None
    i = 12
    while i + 8 <= len(b):
        t = b[i:i + 4].decode('latin-1'); n = struct.unpack('<I', b[i + 4:i + 8])[0]
        out.append(t); i += 8 + n + (n & 1)
    return out


PNG_OK = {'IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS'}
WEBP_OK = {'VP8 ', 'VP8L', 'VP8X', 'ALPH'}


STRIP = {'tEXt', 'zTXt', 'iTXt', 'tIME', 'eXIf', 'caBX', 'iDOT'}   # text, time, EXIF, C2PA/JUMBF provenance, Apple layout hints


def strip_png(path):
    """drop metadata chunks from a PNG in place, chunk by chunk: every other chunk (IDAT included) is copied byte for byte, so the
    pixels cannot change. Returns the dropped chunk names."""
    with open(path, 'rb') as f:
        b = f.read()
    if b[:8] != b'\x89PNG\r\n\x1a\n':
        return []
    out, i, dropped = [b[:8]], 8, []
    while i + 8 <= len(b):
        n, t = struct.unpack('>I4s', b[i:i + 8])
        end = i + 12 + n
        name = t.decode('latin-1')
        if name in STRIP:
            dropped.append(name)
        else:
            out.append(b[i:end])
        i = end
        if name == 'IEND':
            break
    if dropped:
        tmp = path + '.tmp'
        with open(tmp, 'wb') as f:
            f.write(b''.join(out))
        os.replace(tmp, path)
    return dropped


def scan(root):
    """metadata report: every PNG / WebP under root whose chunks go beyond image data (names only, never contents)"""
    bad, n = [], 0
    for d, _, fs in os.walk(root):
        for f in sorted(fs):
            p = os.path.join(d, f)
            if f.lower().endswith('.png'):
                c = png_chunks(p); ok = PNG_OK
            elif f.lower().endswith('.webp'):
                c = webp_chunks(p); ok = WEBP_OK
            else:
                continue
            n += 1
            extra = sorted(set(c or ['?']) - ok)
            if extra:
                bad.append((os.path.relpath(p, root), extra))
    return n, bad


# ------------------------------------------------------------------ maths
def lum(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def blur(a, r):
    """gaussian blur (sigma r px), circular: an FFT multiply (the textures tile; faces keep their features off the edges)"""
    if r <= 0:
        return a
    if a.ndim == 3:
        return np.stack([blur(a[..., c], r) for c in range(a.shape[2])], -1)
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi ** 2) * (r ** 2) * (fx ** 2 + fy ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a.astype(np.float64)) * g)).astype(np.float32)


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def rgb2hsv(a):
    a = a / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rr = m & (mx == r); gg = m & (mx == g) & ~rr; bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6
    h[gg] = (b - r)[gg] / d[gg] + 2
    h[bb] = (r - g)[bb] / d[bb] + 4
    h = h * 60.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hsv2rgb(h, s, v):
    h = (h % 360) / 60.0
    i = np.floor(h).astype(int) % 6; f = h - np.floor(h)
    p = v * (1 - s); q = v * (1 - s * f); t = v * (1 - s * (1 - f))
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1) * 255.0


def hexrgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def hue_dist(h, c):
    d = np.abs((h - c + 180) % 360 - 180)
    return d


def recolour(a, hue_c, hue_w, target, smin=0.12):
    """move the cloth's hue band (centre hue_c, half-width hue_w degrees) onto `target`, keeping its texture.
    Saturation and value are rescaled so the band's mean lands on the target's; pixels outside the band (stains, dirt,
    blood, rust) keep their colour, with a soft edge."""
    h, s, v = rgb2hsv(a)
    w = smooth((hue_w - hue_dist(h, hue_c)) / (hue_w * 0.35)) * smooth((s - smin) / 0.12)
    core = w > 0.6
    ms, mv = float(s[core].mean()), float(v[core].mean())
    th, ts, tv = [float(np.asarray(x).ravel()[0]) for x in rgb2hsv(target.reshape(1, 1, 3))]
    ns = np.clip(s * (ts / max(ms, 1e-3)), 0, 1)
    nv = np.clip(v * (tv / max(mv, 1e-3)), 0, 1)
    out = hsv2rgb(np.full_like(h, th), ns, nv)
    return a * (1 - w[..., None]) + out * w[..., None], float(core.mean())


def nrm_dec(a):
    """RGB normal map (OpenGL) -> unit vectors"""
    v = a / 127.5 - 1.0
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-6)


def nrm_enc(v):
    v = v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-6)
    return (v * 0.5 + 0.5) * 255.0


def nrm_from_h(hgt, strength):
    """height (0..1, +up) -> unit normals, OpenGL (+Y up, image y runs down)"""
    gx = np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)
    gy = np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)
    v = np.stack([-gx * strength, gy * strength, np.ones_like(hgt)], -1)
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def nrm_add(base, det):
    """reoriented-ish blend: add the detail's xy tilt to the base, renormalise"""
    v = base.copy(); v[..., 0] += det[..., 0]; v[..., 1] += det[..., 1]
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-6)


def rot90_normal(a):
    """rotate an OpenGL normal map 90 degrees counter-clockwise (pixels AND vectors)"""
    r = np.rot90(a, 1).copy()
    x, y = r[..., 0].copy(), r[..., 1].copy()
    r[..., 0] = 255.0 - y; r[..., 1] = x
    return r


def mask(draw_fn, n=N):
    """an anti-aliased 0..1 mask painted at SS x"""
    im = Image.new('L', (n * SS, n * SS), 0)
    draw_fn(ImageDraw.Draw(im), SS)
    return np.asarray(im.resize((n, n), Image.LANCZOS), dtype=np.float32) / 255.0


def noise(n, scale, seed):
    """smooth value noise 0..1 (deterministic)"""
    rs = np.random.RandomState(seed)
    k = max(2, n // scale)
    g = rs.rand(k + 1, k + 1).astype(np.float32)
    im = Image.fromarray(g, 'F').resize((n, n), Image.BICUBIC)
    return np.clip(np.asarray(im, dtype=np.float32), 0, 1)


# ------------------------------------------------------------------ the keg (boomer)
EYE_HOLES = [[150, 377, 270, 436], [647, 877, 269, 435]]     # x0,x1,y0,y1 px: the same constants as models/boomer.js
HOOPS = [(84, 164), (860, 940)]                              # y bands of the two iron hoops (px, 1024 grid)


def keg_base(orig):
    """the staves: the plank tile turned upright (four staves across), darkened chimes, a hint of barrel curvature"""
    pb = rd(orig + 'final/plank_o_basecolor.png')
    pn = rd(orig + 'final/plank_o_normal.png')
    pr = rd(orig + 'final/plank_o_roughness.png', 'L')
    b = np.rot90(pb, 1).copy(); n = nrm_dec(rot90_normal(pn)); r = np.rot90(pr, 1).copy()
    # warm it a little toward an oak cask and lift the contrast of the grain
    b = (b - b.mean((0, 1))) * 1.08 + b.mean((0, 1)) * np.array([1.04, 0.97, 0.88], np.float32)
    y = np.arange(N, dtype=np.float32)[:, None]
    x = np.arange(N, dtype=np.float32)[None, :]
    chime = smooth((40 - np.minimum(y, N - 1 - y)) / 40)                  # top/bottom end-grain edges, darker
    curve = 1 - 0.16 * ((x - N / 2) / (N / 2)) ** 4                      # the stave faces roll away at the corners
    b = b * (1 - 0.35 * chime)[..., None] * curve[..., None]
    return b, n, r


def iron_strip(orig, width, height):
    """a horizontal band of rusty iron cut from the chest tile's strap, tiled with mirrored seams"""
    cb = rd(orig + 'final/chest_f_basecolor.png'); cn = rd(orig + 'final/chest_f_normal.png')
    x0, x1, y0, y1 = 70, 436, 396, 448
    sb, sn = cb[y0:y1, x0:x1], cn[y0:y1, x0:x1]
    h = y1 - y0
    seg_b = np.concatenate([sb, sb[:, ::-1]], 1); seg_n = np.concatenate([sn, sn[:, ::-1]], 1)
    seg_n[:, sb.shape[1]:, 0] = 255.0 - seg_n[:, sb.shape[1]:, 0]           # mirrored half: flip the x tilt
    reps = int(np.ceil(width / seg_b.shape[1])) + 1
    tb = np.concatenate([seg_b] * reps, 1)[:, :width]; tn = np.concatenate([seg_n] * reps, 1)[:, :width]
    tb = np.asarray(Image.fromarray(np.clip(tb, 0, 255).astype(np.uint8)).resize((width, height), Image.LANCZOS), np.float32)
    tn = np.asarray(Image.fromarray(np.clip(tn, 0, 255).astype(np.uint8)).resize((width, height), Image.LANCZOS), np.float32)
    return tb, nrm_dec(tn)


def keg_staves(orig):
    b, n, r = keg_base(orig)
    y = np.arange(N, dtype=np.float32)[:, None] * np.ones((1, N), np.float32)
    det_h = np.zeros((N, N), np.float32)
    for k, (y0, y1) in enumerate(HOOPS):
        hb, hn = iron_strip(orig, N, y1 - y0)
        # the hoop is proud of the staves: a soft shadow under it, rivets every stave
        b[y0:y1] = hb; n[y0:y1] = hn; r[y0:y1] = 120 + 0.25 * (lum(hb) - 90)
        sh = smooth((14 - np.abs(y - (y1 + 6))) / 14) + smooth((10 - np.abs(y - (y0 - 4))) / 10) * 0.6
        b = b * (1 - 0.45 * sh)[..., None]
        bev = np.clip(np.minimum(y - y0, y1 - 1 - y) / 6.0, 0, 1) * ((y >= y0) & (y < y1))
        det_h += bev * 0.9
        rv = mask(lambda d, s, y0=y0, y1=y1: [d.ellipse(((cx - 9) * s, ((y0 + y1) / 2 - 9) * s, (cx + 9) * s, ((y0 + y1) / 2 + 9) * s), fill=255)
                                             for cx in range(64, N, 128)])
        b = b * (1 - rv[..., None]) + (rv[..., None] * np.array([92, 70, 58], np.float32)) * (0.85 + 0.3 * noise(N, 64, 7 + k)[..., None])
        det_h += rv * 0.8
    n = nrm_add(n, nrm_from_h(blur(det_h, 1.2), 3.0))
    return b, n, r


def face_boomer(orig, staves):
    b, n, r = [x.copy() for x in staves]
    hgt = np.zeros((N, N), np.float32)
    char = np.zeros((N, N), np.float32)
    # two bored eye holes (round: the model cuts the same circles out of the alpha), charred and splintered rims
    for i, (x0, x1, y0, y1) in enumerate(EYE_HOLES):
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        rad = (y1 - y0) / 2 - 4
        hole = mask(lambda d, s: d.ellipse(((cx - rad) * s, (cy - rad) * s, (cx + rad) * s, (cy + rad) * s), fill=255))
        yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        rim = smooth((rad + 26 + 10 * (noise(N, 24, 30 + i) - 0.5) - dist) / 22) * (1 - hole)
        char = np.maximum(char, rim)
        b = b * (1 - hole[..., None]) + hole[..., None] * np.array([8, 6, 5], np.float32)
        hgt -= hole * 0.8 + rim * 0.25
    # the grin: a zig-zag groove burnt into the staves
    rs = np.random.RandomState(64)
    xs = np.linspace(318, 706, 9)
    pts = [(x + rs.uniform(-10, 10), 672 + (-34 if k % 2 else 34) + rs.uniform(-9, 9)) for k, x in enumerate(xs)]
    groove = mask(lambda d, s: d.line([(px * s, py * s) for px, py in pts], fill=255, width=26 * s, joint='curve'))
    groove = np.clip(groove * (0.75 + 0.5 * noise(N, 10, 65)), 0, 1)
    burn = np.clip(blur(groove, 16) * 2.6, 0, 1) * (1 - groove)
    char = np.maximum(char, burn)
    b = b * (1 - groove[..., None]) + groove[..., None] * np.array([16, 9, 6], np.float32)
    hgt -= groove * 0.7 + burn * 0.15
    # char: darker, redder wood, a little ash grey at the very edge
    cn = noise(N, 18, 41)
    b = b * (1 - 0.72 * char[..., None]) + char[..., None] * np.array([30, 16, 10], np.float32) * (0.6 + 0.8 * cn[..., None])
    r = r * (1 - char) + 235 * char
    n = nrm_add(n, nrm_from_h(blur(hgt, 1.5), 4.0))
    return b, n, r


# ------------------------------------------------------------------ the gunpowder sac (boomer_core)
SAC = (512.0, 496.0, 262.0, 316.0)      # cx, cy, rx, ry px: inside the crop models/boomer.js shows (u .15-.85, v .12-.92)


def tile_small(a, k):
    """a seamless tile shrunk k x and repeated k x k (finer grain, still seamless)"""
    m = a.shape[0] // k
    if a.ndim == 3:
        sm = np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((m, m), Image.LANCZOS), np.float32)
        return np.tile(sm, (k, k, 1))
    sm = np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((m, m), Image.LANCZOS), np.float32)
    return np.tile(sm, (k, k))


def boomer_sac(orig):
    """the boomer's gunpowder sac: a single round cavity in the moss hide, glowing skin above, black grit below"""
    mb = rd(orig + 'final_ent/mat_mossflesh_basecolor.png')
    mn = nrm_dec(rd(orig + 'final_ent/mat_mossflesh_normal.png'))
    lava = rd(orig + 'final/lava_basecolor.png')
    flesh = rd(orig + 'final/nethrock_basecolor.png')
    grit = tile_small(rd(orig + 'final/gravel_basecolor.png'), 4)
    grit_h = tile_small(rd(orig + 'final/gravel_height.png', 'L') / 255.0, 4)
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    cx, cy, rx, ry = SAC
    dx, dy = (xx - cx) / rx, (yy - cy) / ry
    ang = np.arctan2(dy, dx); rr = np.sqrt(dx * dx + dy * dy)
    wob = 1 + 0.04 * np.sin(3 * ang + 0.7) + 0.028 * np.sin(5 * ang + 2.1) + 0.018 * np.sin(9 * ang + 4.0) + 0.08 * (noise(N, 36, 81) - 0.5)
    inside = smooth((wob - rr) / 0.02)
    t = np.clip(rr / wob, 0, 1.5)
    # the skin: the lava tile seen through a taut membrane, white-hot in the middle, blood-dark at the walls
    L = lum(lava)[..., None] / 255.0
    hot, mid, deep = np.array([255, 226, 150], np.float32), np.array([240, 118, 34], np.float32), np.array([96, 18, 8], np.float32)
    f1 = smooth(t / 0.6)[..., None]; f2 = smooth((t - 0.5) / 0.5)[..., None]
    tint = (hot * (1 - f1) + mid * f1) * (1 - f2) + deep * f2
    glow = tint * (0.45 + 0.75 * L) * 0.75 + lava * 0.25 * (1 - f2)
    # thin dark veins creeping in from the wall
    rs = np.random.RandomState(85)
    segs = []
    for _ in range(20):
        a0 = rs.uniform(0, 2 * np.pi)
        px, py = cx + np.cos(a0) * rx * 0.97, cy + np.sin(a0) * ry * 0.97
        hd = a0 + np.pi + rs.uniform(-0.6, 0.6); w = rs.uniform(2.5, 4.5)
        for _s in range(rs.randint(6, 15)):
            nx, ny = px + np.cos(hd) * 15, py + np.sin(hd) * 15
            segs.append(((px, py), (nx, ny), w))
            if rs.rand() < 0.2:
                hb = hd + rs.choice([-1, 1]) * rs.uniform(0.6, 1.1); bx, by = nx, ny; bw = w * 0.6
                for _q in range(rs.randint(2, 6)):
                    ex, ey = bx + np.cos(hb) * 12, by + np.sin(hb) * 12
                    segs.append(((bx, by), (ex, ey), bw)); bx, by = ex, ey; hb += rs.uniform(-0.4, 0.4); bw *= 0.9
            px, py = nx, ny; hd += rs.uniform(-0.4, 0.4); w = max(1.2, w * 0.9)
    vm = mask(lambda d, s: [d.line([(a[0] * s, a[1] * s), (c[0] * s, c[1] * s)], fill=255, width=max(1, int(wd * s))) for a, c, wd in segs])
    vm = blur(vm, 0.8) * inside
    glow = glow * (1 - 0.6 * vm[..., None])
    # the powder: black grit settled in the bottom of the sac, the glow showing through the gaps
    surf = cy + ry * 0.24 + 22 * np.sin(xx / 61.0 + 1.3) + 14 * np.sin(xx / 23.0) + 30 * (noise(N, 50, 92) - 0.5)
    pile = smooth((yy - surf) / 10.0) * inside
    depth = np.clip((yy - surf) / (ry * 0.8), 0, 1)
    gl = lum(grit) / 255.0
    pcol = np.stack([gl * 80 + 12, gl * 64 + 9, gl * 56 + 8], -1)
    gap = smooth((0.48 - grit_h) / 0.2)
    back = gap * (0.2 + 0.8 * (1 - depth) ** 1.3)
    pcol = pcol * (1 - back[..., None]) + back[..., None] * np.array([230, 96, 26], np.float32) * (0.5 + 0.5 * L)
    glow = glow * (1 - pile[..., None]) + pcol * pile[..., None]
    crest = smooth((14 - np.abs(yy - surf)) / 14) * inside            # a lit edge where the grit meets the skin
    glow = glow + crest[..., None] * np.array([90, 40, 10], np.float32) * 0.5
    # a wet highlight on the skin
    sp = smooth((0.2 - np.sqrt(((xx - (cx - rx * 0.36)) / rx) ** 2 + ((yy - (cy - ry * 0.5)) / ry) ** 2)) / 0.2) ** 2
    sp = sp * (0.4 + 0.9 * noise(N, 9, 89)) * inside
    glow = glow + sp[..., None] * np.array([110, 100, 90], np.float32)
    # the wall: raw flesh where the moss hide folds into the cavity, a contact shadow around it, the glow bleeding onto it
    lip = smooth((wob + 0.15 + 0.05 * (noise(N, 12, 93) - 0.5) - rr) / 0.07) * (1 - inside)
    fl = flesh * np.array([1.05, 0.82, 0.78], np.float32) * (0.65 + 0.5 * smooth((wob + 0.12 - rr) / 0.12))[..., None]
    ao = smooth((wob + 0.32 - rr) / 0.30) * (1 - inside)
    b = mb * (1 - 0.5 * ao[..., None])
    b = b * (1 - lip[..., None]) + fl * lip[..., None]
    bleed = smooth((wob + 0.05 - rr) / 0.05) * (1 - inside)
    b = b + bleed[..., None] * np.array([150, 50, 12], np.float32) * 0.5
    b = b * (1 - inside[..., None]) + glow * inside[..., None]
    # height (a bulging skin, grit, the wall sloping in) plus a little luminance detail -> normal; the hide keeps its own
    dome = np.sqrt(np.clip(1 - t ** 2, 0, 1)) * inside
    hgt = dome * 0.5 + vm * 0.2 + pile * (grit_h * 0.5) + lip * (lum(flesh) / 255.0) * 0.4 - ao * 0.2
    hgt = hgt + (lum(np.clip(b, 0, 255)) / 255.0 - 0.5) * 0.1 * inside
    w_in = np.clip(inside + lip, 0, 1)[..., None]
    n = nrm_add(mn * (1 - w_in) + np.array([0, 0, 1], np.float32) * w_in, nrm_from_h(blur(hgt, 1.4), 5.0))
    return b, n


# ------------------------------------------------------------------ the pelt (lilcreepah's pelt-head front)
def face_pelt(orig):
    b = rd(orig + 'final_ent/mat_mossflesh_basecolor.png')
    n = nrm_dec(rd(orig + 'final_ent/mat_mossflesh_normal.png'))
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    hgt = np.zeros((N, N), np.float32); dry = np.zeros((N, N), np.float32)
    for i, (cx, cy) in enumerate([(266, 352), (758, 352)]):
        ang = np.arctan2(yy - cy, xx - cx)
        rag = 80 + 4 * np.sin(ang * 5 + i) + 2.5 * np.sin(ang * 11 + 2 * i) + 6 * (noise(N, 16, 50 + i) - 0.5)
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        hole = smooth((rag - dist) / 3.0)
        rim = smooth((rag + 30 - dist) / 26) * (1 - hole)
        dry = np.maximum(dry, rim)
        b = b * (1 - hole[..., None]) + hole[..., None] * np.array([14, 12, 9], np.float32)
        hgt -= hole * 0.9 - rim * 0.25
    # the mouth: a zig-zag slit, crudely sewn shut with pale thread
    xs = np.linspace(300, 724, 9)
    pts = [(x, 690 + (-36 if k % 2 else 36)) for k, x in enumerate(xs)]
    slit = mask(lambda d, s: d.line([(px * s, py * s) for px, py in pts], fill=255, width=22 * s, joint='curve'))
    pucker = np.clip(blur(slit, 12) * 2.0, 0, 1) * (1 - slit)
    b = b * (1 - slit[..., None]) + slit[..., None] * np.array([22, 10, 8], np.float32)
    b = b * (1 - 0.35 * pucker[..., None])
    hgt -= slit * 0.8 - pucker * 0.2
    stitches = []
    for k in range(len(pts) - 1):
        (ax, ay), (bx, by) = pts[k], pts[k + 1]
        for t in (0.3, 0.7):
            px, py = ax + (bx - ax) * t, ay + (by - ay) * t
            dx, dy = by - ay, -(bx - ax); l = np.hypot(dx, dy); dx, dy = dx / l * 26, dy / l * 26
            stitches.append(((px - dx, py - dy), (px + dx, py + dy)))
    th = mask(lambda d, s: [d.line([(a[0] * s, a[1] * s), (c[0] * s, c[1] * s)], fill=255, width=7 * s) for a, c in stitches])
    b = b * (1 - th[..., None]) + th[..., None] * np.array([196, 182, 150], np.float32)
    hgt += th * 0.5
    # dried hide: paler, yellower moss around the cuts
    b = b * (1 - 0.3 * dry[..., None]) + dry[..., None] * np.array([150, 150, 96], np.float32) * 0.3
    n = nrm_add(n, nrm_from_h(blur(hgt, 1.4), 3.5))
    return b, n


# ------------------------------------------------------------------ Felt Dan's button eyes
def button(cx, cy, rad):
    """a four-hole coat button, sewn on with tan thread: (colour, alpha, height) planes"""
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / rad
    a = smooth((1 - d) * rad / 2.0)
    col = np.zeros((N, N, 3), np.float32) + np.array([46, 30, 22], np.float32)
    ring = smooth((d - 0.72) / 0.06) * smooth((0.97 - d) / 0.05)
    col += ring[..., None] * 26
    hgt = a * (0.6 + 0.4 * smooth((d - 0.55) / 0.3)) - 0.25 * smooth((0.55 - d) / 0.2) * a
    holes = []
    for ox, oy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        holes.append((cx + ox * rad * 0.24, cy + oy * rad * 0.24))
    hm = mask(lambda dr, s: [dr.ellipse(((hx - rad * 0.09) * s, (hy - rad * 0.09) * s, (hx + rad * 0.09) * s, (hy + rad * 0.09) * s), fill=255) for hx, hy in holes])
    col = col * (1 - hm[..., None]) + hm[..., None] * np.array([10, 7, 5], np.float32)
    hgt -= hm * 0.4
    thr = mask(lambda dr, s: [dr.line([(holes[i][0] * s, holes[i][1] * s), (holes[3 - i][0] * s, holes[3 - i][1] * s)], fill=255, width=int(rad * 0.08 * s)) for i in (0, 1)])
    col = col * (1 - thr[..., None]) + thr[..., None] * np.array([170, 140, 96], np.float32)
    hgt += thr * 0.2
    gloss = smooth((0.5 - np.sqrt((xx - (cx - rad * 0.35)) ** 2 + (yy - (cy - rad * 0.4)) ** 2) / rad) / 0.5) * 0.35
    col += gloss[..., None] * 60 * (1 - hm[..., None])
    return col, a, hgt


def felt_dan(orig):
    b = rd(orig + 'final_ent/pgface_feltdan_basecolor.png')
    n = nrm_dec(rd(orig + 'final_ent/pgface_feltdan_normal.png'))
    burlap = hexrgb('#8a6a45')
    nb, frac = recolour(b, 125, 55, burlap)
    # the old plastic eyeballs: whitish pixels inside the two lid openings; fill them with felt, then sew a button on each
    h, s, v = rgb2hsv(b)
    yy, xx = np.mgrid[0:N, 0:N]
    ball = (v > 0.5) & ((s < 0.42) | ((hue_dist(h, 50) < 26) & (v > 0.55))) & (yy > 330) & (yy < 485)
    pup = (v < 0.2) & (yy > 330) & (yy < 485) & (((xx > 150) & (xx < 500)) | ((xx > 520) & (xx < 880)))
    m = (ball & (((xx > 140) & (xx < 506)) | ((xx > 518) & (xx < 882)))) | pup
    m = blur(m.astype(np.float32), 4.0)
    m = np.clip(m * 2.8, 0, 1)
    felt_patch = np.roll(nb, -230, 0)                     # the cheek felt below each eye, moved up
    nb = nb * (1 - m[..., None]) + felt_patch * m[..., None]
    n = n * (1 - m[..., None]) + np.roll(n, -230, 0) * m[..., None]
    centres = []
    for xa, xb in ((150, 480), (600, 900)):
        sel = ball & (xx > xa) & (xx < xb) & (yy > 340) & (yy < 490)
        ys, xs = np.nonzero(sel)
        centres.append((float(xs.mean()), float(ys.mean())))
    for cx, cy in centres:
        col, a, hgt = button(cx, cy, 104)
        nb = nb * (1 - a[..., None]) + col * a[..., None]
        bn = nrm_from_h(blur(hgt, 1.0), 6.0)
        n = n * (1 - a[..., None]) + bn * a[..., None]
    n = n / np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-6)
    return nb, n, frac


# ------------------------------------------------------------------ the bin lid's eyes
def bin_paint(orig, out):
    """fill the two red eyes in the dark gap under the lid with the gap's own shadow, in every map of pg_can_s"""
    b = rd(orig + 'final/pg_can_s_basecolor.png')
    r, g, bl = b[..., 0], b[..., 1], b[..., 2]
    yy, xx = np.mgrid[0:N, 0:N]
    eye = (r > 60) & (r > 1.6 * g) & (r > 1.6 * bl) & (yy > 215) & (yy < 285) & (xx > 380) & (xx < 660)
    m = np.clip(blur(eye.astype(np.float32), 5.0) * 4.0, 0, 1)
    gap = (yy > 225) & (yy < 270) & (xx > 470) & (xx < 550) & ~eye     # dark gap between the eyes
    res = {}
    for k in ('basecolor', 'normal', 'roughness', 'height'):
        p = orig + 'final/pg_can_s_' + k + '.png'
        if not os.path.exists(p):
            continue
        mode = 'RGB' if k in ('basecolor', 'normal') else 'L'
        a = rd(p, mode)
        fill = a[gap].mean(0) if a.ndim == 3 else a[gap].mean()
        if k == 'basecolor':
            fill = fill * (0.85 + 0.3 * noise(N, 6, 77)[..., None])
        a2 = a * (1 - (m[..., None] if a.ndim == 3 else m)) + (fill * (m[..., None] if a.ndim == 3 else m))
        wr(out + 'final/pg_can_s_' + k + '.png', a2, mode)
        res[k] = float(m.sum())
    return int(eye.sum()), res


# ------------------------------------------------------------------ main
def r13(s):
    return codecs.decode(s, 'rot13')


def ids_from_fixture():
    d = json.load(open(DENY, encoding='utf-8'))
    removed = [r13(i) for i in d['removedIds13']]
    renamed = sorted({(r13(x['from13']), x['to']) for x in d['renamed']})
    return removed, renamed


def run(orig, out, sheet=None):
    assert os.path.isdir(orig + 'final_ent') and os.path.isdir(out + 'final_ent'), 'need final_ent/ in --orig and --out'
    assert os.path.realpath(orig) != os.path.realpath(out), '--out must be a copy, never the original workspace'
    FE, OFE = orig + 'final_ent/', out + 'final_ent/'
    removed, renamed = ids_from_fixture()
    log = []
    # remove
    nrem = 0
    for i in removed:
        for f in sorted(os.listdir(OFE)):
            if f.startswith(i + '_') and f[len(i) + 1:] in ('basecolor.png', 'normal.png', 'roughness.png', 'height.png'):
                os.remove(OFE + f); nrem += 1
    log.append('remove: %d ids, %d PNGs deleted' % (len(removed), nrem))
    # rename (same pixels: copied from --orig under the new id, the old files removed)
    for a, b in renamed:
        k = 0
        for f in sorted(os.listdir(FE)):
            if f.startswith(a + '_'):
                suf = f[len(a):]
                shutil.copyfile(FE + f, OFE + b + suf); k += 1
                if os.path.exists(OFE + f):
                    os.remove(OFE + f)
        log.append('rename: 1 id -> %s (%d PNGs)' % (b, k))
    # sac (repainted from scratch over the renamed boomer_core: no pixel of the old sac is kept)
    sb, sn = boomer_sac(orig)
    wr(OFE + 'boomer_core_basecolor.png', sb); wr(OFE + 'boomer_core_normal.png', nrm_enc(sn))
    for sfx in ('_roughness.png', '_height.png'):
        if os.path.exists(OFE + 'boomer_core' + sfx):
            os.remove(OFE + 'boomer_core' + sfx)
    log.append('sac: boomer_core repainted (b/n)')
    # keg
    st = keg_staves(orig)
    wr(OFE + 'keg_staves_basecolor.png', st[0]); wr(OFE + 'keg_staves_normal.png', nrm_enc(st[1])); wr(OFE + 'keg_staves_roughness.png', st[2], 'L')
    fb = face_boomer(orig, st)
    wr(OFE + 'face_boomer_basecolor.png', fb[0]); wr(OFE + 'face_boomer_normal.png', nrm_enc(fb[1]))
    log.append('keg: keg_staves (b/n/r), face_boomer (b/n)')
    # pelt
    pb, pn = face_pelt(orig)
    wr(OFE + 'face_pelt_basecolor.png', pb); wr(OFE + 'face_pelt_normal.png', nrm_enc(pn))
    log.append('pelt: face_pelt (b/n)')
    # recolours (basecolor only; normals untouched)
    for idn, hc, hw, tgt in (('tee_dan', 200, 40, '#d9822b'), ('jog_dan', 228, 32, '#34343a'),
                             ('tee_zombie', 150, 42, '#5f6436'), ('jog_zombie', 222, 34, '#5a4632'),
                             ('fist_pg', 135, 45, '#8a6a45')):
        a = rd(FE + idn + '_basecolor.png')
        na, frac = recolour(a, hc, hw, hexrgb(tgt))
        wr(OFE + idn + '_basecolor.png', na)
        log.append('recolour: %s -> %s (%.0f%% of pixels in the cloth band)' % (idn, tgt, frac * 100))
    fd, fdn, frac = felt_dan(orig)
    wr(OFE + 'pgface_feltdan_basecolor.png', fd); wr(OFE + 'pgface_feltdan_normal.png', nrm_enc(fdn))
    log.append('recolour: pgface_feltdan -> #8a6a45 + 2 button eyes (%.0f%% felt)' % (frac * 100))
    # the bin
    ne, res = bin_paint(orig, out)
    log.append('paint: pg_can_s eyes (%d px) filled in %s' % (ne, '/'.join(sorted(res))))
    if sheet:
        cells = ['final_ent/keg_staves', 'final_ent/face_boomer', 'final_ent/face_pelt', 'final_ent/pgface_feltdan',
                 'final_ent/fist_pg', 'final_ent/tee_dan', 'final_ent/jog_dan', 'final_ent/tee_zombie', 'final_ent/jog_zombie',
                 'final/pg_can_s', 'final_ent/boomer_core']
        W = 256
        sh = Image.new('RGB', (W * 5, W * 6), (16, 16, 16))
        for i, c in enumerate(cells):
            for row, sfx in ((0, '_basecolor.png'), (1, '_normal.png')):
                p = out + c + sfx
                if os.path.exists(p):
                    sh.paste(Image.open(p).convert('RGB').resize((W, W), Image.LANCZOS), ((i % 5) * W, ((i // 5) * 2 + row) * W))
        sh.save(sheet)
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--orig'); ap.add_argument('--out'); ap.add_argument('--sheet'); ap.add_argument('--scan'); ap.add_argument('--strip')
    a = ap.parse_args()
    if a.strip:
        k = 0
        for d, _, fs in os.walk(a.strip):
            for fn in sorted(fs):
                if fn.lower().endswith('.png'):
                    got = strip_png(os.path.join(d, fn))
                    if got:
                        k += 1
                        print('  stripped %s: %s' % (os.path.relpath(os.path.join(d, fn), a.strip), ','.join(got)))
        print('strip: %d PNG(s) changed (pixels untouched)' % k)
        sys.exit(0)
    if a.scan:
        n, bad = scan(a.scan)
        print('scan: %d images, %d with chunks beyond image data' % (n, len(bad)))
        for p, extra in bad[:50]:
            print('  %s: %s' % (p, ','.join(extra)))
        sys.exit(1 if bad else 0)
    if not a.orig or not a.out:
        ap.error('--orig and --out are required (or --scan DIR)')
    orig = os.path.abspath(a.orig).rstrip('/') + '/'
    out = os.path.abspath(a.out).rstrip('/') + '/'
    for line in run(orig, out, a.sheet):
        print(line)
    n, bad = scan(out + 'final_ent')
    print('final_ent metadata: %d images, %d with extra chunks' % (n, len(bad)))


if __name__ == '__main__':
    main()
