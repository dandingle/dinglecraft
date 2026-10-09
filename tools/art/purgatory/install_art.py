#!/usr/bin/env python3
"""Install the P6 art for a pack. Run by P7 or PZ, IMMEDIATELY followed by pack_assets.py, with no gate in flight:

  python3 tools/art/purgatory/install_art.py [--dry] && npm run repack -- --only hr

1. Moves every staged PNG (<DC_PG_ART_SRC>/staged/{final,final_ent}/) over its live counterpart.
2. Appends the pg_* keys of tools/art/purgatory/tiles_pg.json to <DC_ART_SRC>/final/tiles.json and copies the result to
   assets/pack-inputs/tiles.json (the copy pack_assets.py reads)
   (append only: a non-pg key is never added, changed or removed; existing pg keys are refreshed).
3. Prints what changed. Exit 1 if a tiles_pg key has no basecolor PNG (pack_assets would warn and tA_static would fail).
Idempotent. Never touches hr_tiles.json (P7) or models (P7).
"""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pglib as L


def main():
    dry = '--dry' in sys.argv
    moved = 0
    for sub, dst in (('final/', L.FINAL), ('final_ent/', L.FINAL_ENT)):
        d = L.STAGED + sub
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith('.png'):
                print('%s %s -> %s' % ('would move' if dry else 'move', sub + f, os.path.relpath(dst + f, L.HR)))
                if not dry:
                    shutil.move(d + f, dst + f)
                moved += 1
    tj = json.load(open(L.FINAL + 'tiles.json', encoding='utf-8'))
    pg = json.load(open(L.ART + 'tiles_pg.json', encoding='utf-8'))
    bad = [k for k in pg if not k.startswith('pg_')]
    assert not bad, 'tiles_pg.json holds non-pg keys: %s' % bad
    nopng = [k for k in pg if not os.path.exists(L.FINAL + k + '_basecolor.png') and not dry]
    added = [k for k in pg if k not in tj]
    for k in pg:
        tj[k] = pg[k]
    if not dry:
        tmp = L.FINAL + 'tiles.json.tmp'
        json.dump(tj, open(tmp, 'w', encoding='utf-8'), indent=1)
        os.replace(tmp, L.FINAL + 'tiles.json')
        shutil.copyfile(L.FINAL + 'tiles.json', L.TILES_IN)
    print('%s: %d staged PNGs moved, %d pg keys (%d new) in final/tiles.json' % ('dry run' if dry else 'installed', moved, len(pg), len(added)))
    if nopng:
        print('FAIL: pg keys without a basecolor PNG: ' + ', '.join(nopng)); sys.exit(1)
    if not dry:
        print('NOW run: npm run repack -- --only hr   (then npm run build; bump the version first if it is shipped)')


if __name__ == '__main__':
    main()
