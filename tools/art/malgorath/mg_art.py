#!/usr/bin/env python3
"""mg_art.py (M4): the Malgorath Hyperreal art (bible section 20) through tools/art/fal.mjs. PAID. Never prints a key.

  python3 tools/art/malgorath/mg_art.py run <stage> [--only a,b] [--dry] [--par 4]   fal calls (stage 1 heroes, stage 2 extracts)
  python3 tools/art/malgorath/mg_art.py sheet <stage>                                5x6 contact sheet of a stage's raw outputs
  python3 tools/art/malgorath/mg_art.py post [--only id]                             raw -> <DC_MG_ART_SRC>/final/<id>_<map>.png

Folders: the Malgorath workspace $DC_MG_ART_SRC (raw/, final/, sheets/); the Husk edit reads face_dan from the Hyperreal workspace
$DC_ART_SRC (final_ent/); picks live in tools/art/malgorath/picks.json (committed). Spend: the shared ledger in $FAL_LEDGER_DIR.

Recipes (the hyperreal memory notes): heroes on fal-ai/nano-banana-pro ($0.15 an image), seamless PBR from the picked hero on
fal-ai/patina/material/extract ($0.17, a prompt, strength 0.45, tiling both), generic seamless on patina/material ($0.08), the Husk
face on nano-banana-pro/edit from face_dan ($0.15 an image). Post: low-frequency equalise on albedo and roughness, patina's -Y normal
tilt removed, the glowing cracks lifted out into an emissive mask (and darkened in the albedo, so each round's hue reads clean).
Budget: refuses to launch unless ledger + the summed estimates fit the budget of the shared ledger (BUDGET in $FAL_LEDGER_DIR,
else $FAL_BUDGET_USD; with neither it refuses: v6.3 ran with a $50.53 ceiling); fal.mjs's own guard stays the last line of defence.
Picks (which hero feeds each extract) live in picks.json beside this file, written after the stage-1 contact sheet was reviewed. Every batch is reviewed on a 5x6 contact sheet before use."""
import json, os, re, subprocess, sys, glob
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import dcpaths  # noqa: E402
ART = dcpaths.mg_src()
RAW = ART + 'raw/'
FINAL = ART + 'final/'
FAL = dcpaths.FAL
PICKS = os.path.join(HERE, 'picks.json')
FLAT = 'flat even diffuse light, no shadows, no highlights, no text, no watermark, no logo'
NANO, EXT, PAT, EDIT = 'fal-ai/nano-banana-pro', 'fal-ai/patina/material/extract', 'fal-ai/patina/material', 'fal-ai/nano-banana-pro/edit'


def nano(label, prompt, n=1, ar='1:1'):
    return {'label': label, 'stage': 1, 'endpoint': NANO, 'est': 0.15 * n,
            'input': {'prompt': prompt, 'aspect_ratio': ar, 'resolution': '2K', 'num_images': n}}


def ext(label, src, prompt, seed):
    return {'label': label, 'stage': 2, 'endpoint': EXT, 'est': 0.17,
            'input': {'image_url': '@pick:' + src, 'prompt': prompt, 'maps': ['basecolor', 'normal', 'roughness', 'height'],
                      'image_size': {'width': 1024, 'height': 1024}, 'tiling_mode': 'both', 'enable_prompt_expansion': False,
                      'strength': 0.45, 'seed': seed}}


ROWS = [
    nano('mgh_hide', 'Seamless top-down orthographic photo of a 1 metre square of thick charred reptilian demon hide: irregular leathery '
         'plates 8 to 15 centimetres across split by deep cracks, charcoal to dark oxblood, the deepest cracks glowing molten orange, '
         'pores and old scars, about 80 plates in frame, ' + FLAT, 2),
    nano('mgh_brow', 'Seamless macro photo of heavy bone-plated reptile brow and skull plating, overlapping ridged pale bone plates 10 to 20 '
         'centimetres across, scarred and pitted, charcoal grime in the seams with thin molten orange cracks between the plates, a 60 '
         'centimetre square, ' + FLAT, 2),
    nano('mgh_flesh', 'Seamless flat orthographic macro photo of glistening raw red-brown muscle and sinew, wet striated fibres, pale tendons, '
         'dark veins, a 50 centimetre square filling the frame, ' + FLAT, 2),
    nano('mgh_horn', 'Seamless flat photo of dark ridged ram horn keratin, fine growth ridges every 2 centimetres running across the frame, '
         'black-brown with grey wear and chips, a 40 centimetre square filling the frame, ' + FLAT, 1),
    nano('mgh_enamel', 'Seamless macro photo of enormous yellowed tooth enamel, wet, hairline cracks, brown stain toward the root, a 30 '
         'centimetre patch filling the frame, ' + FLAT, 2),
    nano('mgh_eye', 'Macro photo of a single glowing amber demon eye with a narrow vertical slit pupil, the iris filling the square and '
         'centred, wet glossy cornea, fine red veins at the edge, molten orange glow from inside the iris, flat light, black surround, '
         'no text, no watermark', 3),
    nano('mgh_crust', 'Seamless flat photo of a thin cooled lava crust, dark basalt plates 5 to 10 centimetres across with translucent amber '
         'cracks glowing from beneath, a 50 centimetre square filling the frame, ' + FLAT, 2),
    nano('mgh_bile', 'Seamless top-down photo of a bubbling sickly yellow-green acid surface, foam and small bubbles, slick oily sheen, a 1 '
         'metre square filling the frame, ' + FLAT, 1),
    {'label': 'mgh_char', 'stage': 1, 'endpoint': PAT, 'est': 0.08,
     'input': {'prompt': 'seamless charred burnt flesh with ember cracks, blackened crust, glowing orange fissures', 'maps': ['basecolor', 'normal', 'roughness', 'height'],
               'image_size': {'width': 1024, 'height': 1024}, 'enable_prompt_expansion': False, 'seed': 6301}},
    {'label': 'mgh_husk', 'stage': 1, 'endpoint': EDIT, 'est': 0.30,
     'input': {'prompt': 'The same face, same layout and framing, charred black as if pulled out of a furnace: cracked blistered skin with '
               'molten orange ember cracks glowing in the creases, singed eyebrows, ash in the hair, still recognisable as the same man; '
               'flat even light, no shadows, no text, no watermark, no logo',
               'image_urls': ['@hr:final_ent/face_dan_basecolor.png'], 'aspect_ratio': '1:1', 'resolution': '1K', 'num_images': 2}},
    ext('mgx_hide', 'mgh_hide', 'charred reptilian demon hide plates with glowing orange cracks', 6311),
    ext('mgx_brow', 'mgh_brow', 'bone plated reptile skull plating with dark seams', 6312),
    ext('mgx_flesh', 'mgh_flesh', 'wet raw red muscle and sinew', 6313),
    ext('mgx_horn', 'mgh_horn', 'dark ridged ram horn keratin', 6314),
    ext('mgx_enamel', 'mgh_enamel', 'yellowed wet tooth enamel with hairline cracks', 6315),
    ext('mgx_crust', 'mgh_crust', 'cooled lava crust plates with glowing amber cracks', 6316),
    ext('mgx_bile', 'mgh_bile', 'bubbling yellow green acid foam', 6317),
]


def spent():
    return dcpaths.spent()


def picks():
    try: return json.load(open(PICKS))
    except Exception: return {}


def raw_imgs(label):
    return sorted(glob.glob(RAW + label + '_images_*.png'), key=lambda p: int(re.search(r'_(\d+)\.png$', p).group(1)))


def resolve(v, miss):
    if isinstance(v, list): return [resolve(x, miss) for x in v]
    if isinstance(v, dict): return {k: resolve(x, miss) for k, x in v.items()}
    if isinstance(v, str) and v.startswith('@pick:'):
        lab = v[6:]; ims = raw_imgs(lab); pk = picks().get(lab)
        if pk is None or not ims: miss.append(v); return v
        return ims[int(pk)]
    if isinstance(v, str) and v.startswith('@hr:'):
        p = dcpaths.hr_src() + v[4:]
        if not os.path.exists(p): miss.append(v); return v
        return p
    return v


def run(stage, only=None, dry=False, par=4):
    todo, skip, defer = [], [], []
    for r in ROWS:
        if str(r['stage']) != str(stage): continue
        if only and r['label'] not in only: continue
        if os.path.exists(RAW + r['label'] + '.json'): skip.append(r['label']); continue
        miss = []; inp = resolve(r['input'], miss)
        if miss: defer.append((r['label'], miss)); continue
        todo.append((r, inp))
    est = sum(r['est'] for r, _ in todo); have = spent(); CEIL = dcpaths.budget()
    print('stage %s: %d to run (est $%.2f), %d done, %d deferred; ledger $%.3f -> $%.3f (budget %s)' % (stage, len(todo), est, len(skip), len(defer), have, have + est, 'none' if CEIL is None else '$%.2f' % CEIL))
    for l, m in defer: print('  deferred', l, m)
    if CEIL is None: print('REFUSED: no budget (BUDGET in FAL_LEDGER_DIR or FAL_BUDGET_USD)'); return 3
    if have + est > CEIL + 1e-9: print('REFUSED: over the budget'); return 3
    if dry: return 0
    os.makedirs(RAW, exist_ok=True)
    def one(ri):
        r, inp = ri; f = RAW + r['label'] + '.in.json'; json.dump(inp, open(f, 'w'), indent=1)
        p = subprocess.run(['node', FAL, r['endpoint'], f, RAW, r['label'], '%.3f' % r['est']], capture_output=True, text=True)
        open(RAW + r['label'] + '.log', 'w').write(p.stdout + p.stderr)
        return r['label'], p.returncode, (p.stdout + p.stderr).strip().splitlines()[-1:] if (p.stdout + p.stderr).strip() else ''
    with ThreadPoolExecutor(min(4, par)) as ex:
        for lab, rc, tail in ex.map(one, todo): print(' ', lab, 'rc', rc, tail)
    print('ledger now $%.3f' % spent()); return 0


def sheet(stage):
    from PIL import Image, ImageDraw
    labs = [r['label'] for r in ROWS if str(r['stage']) == str(stage)]
    fs = [p for l in labs for p in raw_imgs(l)]
    W, H, c = 5, 6, 360
    sh = Image.new('RGB', (W * c, H * c), (20, 20, 20)); d = ImageDraw.Draw(sh)
    for i, f in enumerate(fs[:W * H]):
        im = Image.open(f).convert('RGB'); im.thumbnail((c, c)); x, y = (i % W) * c, (i // W) * c
        sh.paste(im, (x, y)); d.text((x + 4, y + 4), os.path.basename(f)[:-4], fill=(255, 255, 0))
    os.makedirs(ART + 'sheets', exist_ok=True); out = ART + 'sheets/stage%s.jpg' % stage; sh.save(out, quality=86); print(out, len(fs))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(2)
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    if a[0] == 'run': sys.exit(run(a[1], set(opt('--only').split(',')) if opt('--only') else None, '--dry' in a, int(opt('--par', '4'))))
    if a[0] == 'sheet': sheet(a[1]); sys.exit(0)
    if a[0] == 'post':
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import mg_post; mg_post.main(opt('--only')); sys.exit(0)
    print(__doc__); sys.exit(2)
