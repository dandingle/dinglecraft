#!/usr/bin/env python3
"""Packed-size estimate of the P6 art with pack_assets.py's own encoders (nothing is written to the game dirs).

  python3 tools/art/purgatory/measure_bytes.py [--tile-px 256] [--ent-px 512] [--json out.json]   (needs $DC_ART_SRC)

Tiles: every key of art/tiles_pg.json at --tile-px (plan: pg_* tiles pack at 256 through P7's px override).
Entities: every id in art/ents_pg.json; face_* (HERO regex) at the std hero sizes (1024/512/256), others at
(--ent-px, 512, 256) like std 'other' (pass --ent-px 256 for the 42 MB option). Staged PNGs are measured where they exist.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pglib as L
sys.path.insert(0, L.dcpaths.TEX_DIR)
import pack_assets as pa


def main():
    a = sys.argv[1:]
    opt = lambda k, d: a[a.index(k) + 1] if k in a else d
    tpx = int(opt('--tile-px', '256')); epx = int(opt('--ent-px', '512'))
    tiles = json.load(open(L.ART + 'tiles_pg.json'))
    ents = json.load(open(L.ART + 'ents_pg.json')) if os.path.exists(L.ART + 'ents_pg.json') else {}
    man = json.load(open(L.HR_TILES))
    out = {'tiles': {}, 'ents': {}}
    for n in sorted(tiles):
        f = dict(man['defaults']); f.update(man.get('tiles', {}).get(n, {}))
        if tiles[n].get('rot') is True:
            f['rot'] = 'all'
        st = L.STAGED + 'final/'
        pa.FINAL = st if os.path.exists(st + n + '_basecolor.png') else L.FINAL
        if not os.path.exists(pa.FINAL + n + '_basecolor.png'):
            continue
        r = pa.enc_tile(n, f, tpx)
        out['tiles'][n] = sum(len(pa.b64uri(b)) for b in r[1].values())
    S = pa.PROFILES['std']
    for e in sorted(ents):
        st = L.STAGED + 'final_ent/'
        pa.FINAL_ENT = st if os.path.exists(st + e + '_basecolor.png') else L.FINAL_ENT
        if not os.path.exists(pa.FINAL_ENT + e + '_basecolor.png'):
            continue
        sizes = S['hero'] if pa.HERO.match(e) else (epx, S['other'][1] if epx >= 512 else epx, S['other'][2])
        r = pa.enc_ent(e, sizes)
        out['ents'][e] = sum(len(pa.b64uri(b)) for b in r[1].values())
    tt, te = sum(out['tiles'].values()), sum(out['ents'].values())
    for k in ('tiles', 'ents'):
        for n, b in sorted(out[k].items(), key=lambda x: -x[1]):
            print('  %-18s %8d' % (n, b))
    print('P6 art packed estimate: %d tiles %.2f MB @%dpx + %d entity ids %.2f MB (other @%dpx) = %.2f MB' % (
        len(out['tiles']), tt / 1e6, tpx, len(out['ents']), te / 1e6, epx, (tt + te) / 1e6))
    if '--json' in a:
        json.dump(out, open(opt('--json', ''), 'w'), indent=1)


if __name__ == '__main__':
    main()
