"""P6 shared helpers: paths, the write guard, image maths (imports tools/art/texpacks/tex.py).

Folders (repo): the P6 json files (tiles_pg, ents_pg, picks) live beside this file (ART); the cast models are
src/texpacks/models/; hr_tiles.json is assets/pack-inputs/, the packed manifest assets/packed/hr/. Workspaces (outside git,
resolved only when used, see tools/art/dcpaths.py): HR/FINAL/FINAL_ENT/RAWPG from $DC_ART_SRC, STAGED/SHEETS/MASKS from
$DC_PG_ART_SRC (default out/art/purgatory/). Spend: the shared ledger ($FAL_LEDGER_DIR); CEIL is its budget (None = refuse).

The WRITE GUARD (dest()) keeps every P6 write inert for everyone else's gate:
  tA_static and `pack_assets.py --check` fail the moment a tile/entity id is "live" (listed in final/tiles.json or
  hr_tiles.json, quoted by a model, or already packed) but its PNG differs from what hr_assets.gen.js holds. So a final
  goes straight into final/ or final_ent/ only while its id is NOT live; otherwise it is written to
  <DC_PG_ART_SRC>/staged/{final,final_ent}/ and install_art.py moves it in right before a pack (P7/PZ).
"""
import json, os, re, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import dcpaths  # noqa: E402
ART = HERE + '/'                     # the committed P6 json files
MODELS = dcpaths.MODELS
HR_TILES = dcpaths.PACK_INPUTS + 'hr_tiles.json'
TILES_IN = dcpaths.PACK_INPUTS + 'tiles.json'
HR_MANIFEST = dcpaths.PACKED + 'hr/manifest.json'
sys.path.insert(0, dcpaths.TEX_DIR)
import tex  # noqa: E402

N = 1024
# v6.1 ran with CEIL 48.19 (22.19 already spent + the $26 hard ceiling, plan 7.1); the repo uses the shared ledger's budget.

_LAZY = {
    'HR': lambda: dcpaths.hr_src(),
    'FINAL': lambda: dcpaths.hr_src() + 'final/',
    'FINAL_ENT': lambda: dcpaths.hr_src() + 'final_ent/',
    'RAWPG': lambda: dcpaths.hr_src() + 'raw/pg/',
    'WORK': lambda: dcpaths.pg_src(),
    'STAGED': lambda: dcpaths.pg_src() + 'staged/',
    'CEIL': lambda: dcpaths.budget(),
}


def __getattr__(name):           # PEP 562: workspace paths resolve on first use, so pure image maths needs no workspace
    if name in _LAZY:
        return _LAZY[name]()
    raise AttributeError(name)


def _p(name):
    return _LAZY[name]()


def spent():
    return dcpaths.spent()


# ------------------------------------------------------------------ live-id detection (the write guard)
def _live_sets():
    tiles = set(json.load(open(TILES_IN, encoding='utf-8')))
    try:
        tiles |= set(json.load(open(HR_TILES, encoding='utf-8')).get('tiles', {}))
    except Exception:
        pass
    lits = set()
    for fn in sorted(os.listdir(MODELS)):
        if fn.endswith('.js'):
            lits |= set(re.findall(r"['\"]([a-z][a-z0-9_]*)['\"]", open(MODELS + fn, encoding='utf-8').read()))
    packed = set()
    try:
        packed = set(json.load(open(HR_MANIFEST, encoding='utf-8')).get('sources', {}))
    except Exception:
        pass
    return tiles, lits, packed


def is_live(kind, name):
    tiles, lits, packed = _live_sets()
    if kind == 't':
        return name in tiles or ('t:' + name) in packed
    return name in lits or ('e:' + name) in packed


def dest(kind, name, mapname):
    """path to write <name>_<map>.png: the real final dir while the id is not live, else the staging dir."""
    base = _p('FINAL') if kind == 't' else _p('FINAL_ENT')
    if is_live(kind, name):
        d = _p('STAGED') + ('final/' if kind == 't' else 'final_ent/')
        os.makedirs(d, exist_ok=True)
        return d + '%s_%s.png' % (name, mapname), True
    return base + '%s_%s.png' % (name, mapname), False


def find_final(kind, name, mapname):
    """latest version of a P6 final: staged copy wins over the live one."""
    s = _p('STAGED') + ('final/' if kind == 't' else 'final_ent/') + '%s_%s.png' % (name, mapname)
    if os.path.exists(s):
        return s
    p = (_p('FINAL') if kind == 't' else _p('FINAL_ENT')) + '%s_%s.png' % (name, mapname)
    return p if os.path.exists(p) else None


# ------------------------------------------------------------------ raw outputs
def raw_dir(label):
    w = label.split('_', 1)[0][2:] if label.startswith('pg') else 'w1'   # pgw1_ -> w1
    return _p('RAWPG') + w + '/'


def raw_img(label, idx=0):
    d = raw_dir(label)
    for ext in ('png', 'jpg', 'jpeg', 'webp'):
        p = '%s%s_images_%d.%s' % (d, label, idx, ext)
        if os.path.exists(p):
            return p
    return None


def patina_maps(label):
    """{'tile','basecolor','normal','roughness','height'} -> path, from the result JSON's map_type tags."""
    d = raw_dir(label)
    res = json.load(open(d + label + '.json'))
    out = {}
    for i, im in enumerate(res.get('images', [])):
        k = im.get('map_type') or 'tile'
        p = raw_img(label, i)
        if p:
            out[k] = p
    return out


# ------------------------------------------------------------------ image maths
def rgb(p, size=N):
    im = Image.open(p).convert('RGB')
    if size and im.size != (size, size):
        im = im.resize((size, size), Image.LANCZOS)
    return np.asarray(im).astype(np.float32)


def gray(p, size=N):
    im = Image.open(p).convert('L')
    if size and im.size != (size, size):
        im = im.resize((size, size), Image.LANCZOS)
    return np.asarray(im).astype(np.float32)


def u8(a):
    return np.clip(np.round(a), 0, 255).astype(np.uint8)


def pblur(a, sig):
    if sig <= 0:
        return a.astype(np.float32)
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi ** 2) * (sig ** 2) * (fx ** 2 + fy ** 2))
    if a.ndim == 2:
        return np.real(np.fft.ifft2(np.fft.fft2(a) * g)).astype(np.float32)
    return np.stack([np.real(np.fft.ifft2(np.fft.fft2(a[..., c]) * g)) for c in range(a.shape[2])], -1).astype(np.float32)


def noise(seed, sig, n=N):
    r = np.random.default_rng(seed).standard_normal((n, n)).astype(np.float32)
    b = pblur(r, sig)
    return (b - b.mean()) / (b.std() + 1e-8)


def fbm(seed, sigs=(64, 32, 16, 8, 4, 2), gain=0.55, n=N):
    out = np.zeros((n, n), np.float32); amp = 1.0; tot = 0
    for i, s in enumerate(sigs):
        out += noise(seed + i * 101, s, n) * amp; tot += amp; amp *= gain
    return out / tot


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def equalize(a, sig=60, amt=0.85):
    if a.ndim == 2:
        return tex.equalize_arr(a[..., None], sig, amt)[..., 0]
    return tex.equalize_arr(a, sig, amt)


def fixnormal(n255, sig=60):
    """remove the low-frequency tilt (patina's -Y bias) from a normal map, renormalise (OpenGL)."""
    n = n255.astype(np.float32) / 255 * 2 - 1
    for c in (0, 1):
        n[..., c] -= pblur(n[..., c], sig)
    n[..., 2] = np.sqrt(np.clip(1 - n[..., 0] ** 2 - n[..., 1] ** 2, 0.05, 1))
    return (n * 0.5 + 0.5) * 255


def normal_from_height(h, strength):
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return (np.stack([nx / l, ny / l, nz / l], -1) * 0.5 + 0.5) * 255


def blend_normals(a255, b255, w):
    a = a255 / 255 * 2 - 1; b = b255 / 255 * 2 - 1
    m = a * (1 - w[..., None]) + b * w[..., None]
    m /= np.linalg.norm(m, axis=-1, keepdims=True) + 1e-6
    return (m * 0.5 + 0.5) * 255


def grade(a, mean=None, std_scale=1.0, sat=1.0):
    a = a.astype(np.float32)
    l = lum(a)[..., None]
    a = l + (a - l) * sat
    m = a.reshape(-1, 3).mean(0)
    tgt = m if mean is None else np.array(mean, np.float32)
    return (a - m) * std_scale + tgt


def rough_to(r, mean, spread=1.0):
    return np.clip((r - r.mean()) * spread + mean, 0, 255)


def seamless(a, band=0.35):
    return tex.seamless_arr(a, band)


def seam_score(arr):
    a = arr.astype(np.float32)
    def axis(x):
        edge = np.abs(x[:, 0] - x[:, -1]).mean()
        inner = np.abs(x[:, 1:] - x[:, :-1]).mean()
        return edge / max(inner, 1e-6)
    return axis(a), axis(a.transpose(1, 0, 2))


def save_maps(kind, name, base, normal=None, rough=None, height=None, alpha=None):
    """write a final's maps through the guard; returns (paths, staged?)"""
    out, staged = {}, False
    p, st = dest(kind, name, 'basecolor'); staged |= st
    if alpha is not None:
        al = np.clip(alpha, 0, 1) * 255 if alpha.max() <= 1.5 else alpha
        Image.fromarray(np.dstack([u8(base), u8(al)]), 'RGBA').save(p)
    else:
        Image.fromarray(u8(base)).save(p)
    out['basecolor'] = p
    for mname, arr, mode in (('normal', normal, 'RGB'), ('roughness', rough, 'L'), ('height', height, 'L')):
        if arr is None:
            continue
        p, st = dest(kind, name, mname); staged |= st
        Image.fromarray(u8(arr), mode).save(p)
        out[mname] = p
    return out, staged


def wrap_ramp(a, axis=0, sig=6):
    """remove the low-frequency wrap mismatch along one axis: add a linear ramp so the first and last rows (axis 0) or
    columns (axis 1) meet. Keeps every feature where it is (unlike the offset blend, which drags the centre to the edge)."""
    x = a.astype(np.float32)
    if axis == 1:
        return wrap_ramp(x.swapaxes(0, 1), 0, sig).swapaxes(0, 1)
    e = x[0] - x[-1]
    if sig:
        from scipy.ndimage import gaussian_filter1d
        e = gaussian_filter1d(e, sig, axis=0, mode='wrap')
    n = x.shape[0]
    t = (np.arange(n, dtype=np.float32) / (n - 1) - 0.5).reshape((n,) + (1,) * (x.ndim - 1))
    return x + e[None] * t


def ramp_normal(n255, axes=(0,)):
    v = n255.astype(np.float32) / 255 * 2 - 1
    for ax in axes:
        v = wrap_ramp(v, ax)
    v /= np.linalg.norm(v, axis=-1, keepdims=True) + 1e-6
    return (v * 0.5 + 0.5) * 255
