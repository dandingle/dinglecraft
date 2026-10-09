#!/usr/bin/env python3
"""P6 acceptance check (no network, no writes). Prints `N passed, M failed` last, like the suites.

  python3 tools/art/purgatory/check_art.py

- every tiles_pg.json key: pg_ name from plan 2.3, 1024x1024 basecolor + normal + roughness present (staged copy wins),
  normal map unit-length and +Z, seamless tiles pass the seam rule (<= 1.25, or a recorded by-construction reason)
- every ents_pg.json id: in the agreed id contract, basecolor + normal present, mat ids also roughness
- staged files belong to live ids (else they should have gone straight to final), no non-pg key in tiles_pg.json
- ledger <= the P6 ceiling (48.19) and <= the guard (BUDGET)
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pglib as L

PLAN_TILES = set('''pg_deck pg_skin pg_mblack pg_velvet_s pg_velvet_t pg_traveler pg_seat_s pg_seat_t pg_shag_t pg_shag_s
pg_sleeve_s pg_sleeve_x pg_forearm_s pg_forearm_x pg_fleece pg_eye pg_stuffing pg_armhole_t pg_psky pg_phill pg_backing
pg_brace pg_foam pg_rot pg_ore_googly pg_ore_wire pg_ore_sequin pg_ore_knuckle pg_counter_t pg_counter_s pg_counter_b
pg_burner_t pg_burner_s pg_soup pg_dough pg_lino pg_tesla_t pg_tesla_s pg_satin pg_mirror pg_sheet pg_swamp pg_scum
pg_pins_t pg_pins_s pg_cord pg_plate pg_can_t pg_can_s pg_hotplate_t pg_hotplate_s pg_bench_t pg_bench_s pg_ptrunk_t
pg_ptrunk_s pg_lamp pg_lily_t pg_lily_s pg_cattail pg_door_s pg_door_t pg_strunk_t pg_strunk_s'''.split())
# Release 1.0: the recast keeps only generic purgatory art (the character faces and costume materials were removed)
CONTRACT = set('''pgmat_frogfelt pgmat_tongue pgmat_cuff pgent_satchel pgent_arm pgent_hand pgface_piglet pgface_blank pgent_apron
pgent_sneakers pgface_feltdan fist_pg pgmat_felt pgmat_fur'''.split())
# tiles whose seam score is not meaningful or not required (object faces / by-construction borders / one-axis tiles)
NO_SEAM_RULE = {'pg_sleeve_x', 'pg_forearm_x', 'pg_shag_s', 'pg_velvet_t', 'pg_counter_s', 'pg_burner_t', 'pg_seat_s', 'pg_eye',
                'pg_mirror', 'pg_armhole_t', 'pg_lily_t', 'pg_can_s', 'pg_hotplate_s', 'pg_bench_s', 'pg_ptrunk_s', 'pg_door_s',
                'pg_strunk_s', 'pg_ore_googly', 'pg_ore_wire', 'pg_ore_sequin', 'pg_ore_knuckle', 'pg_pins_t',
                'pg_can_t', 'pg_bench_t', 'pg_ptrunk_t', 'pg_strunk_t', 'pg_tesla_t', 'pg_plate', 'pg_seat_t', 'pg_hotplate_t'}
DIRECTIONAL = {'pg_velvet_s', 'pg_traveler', 'pg_deck', 'pg_forearm_s', 'pg_sleeve_s', 'pg_mblack', 'pg_tesla_s', 'pg_brace',
               'pg_backing', 'pg_burner_s', 'pg_lino', 'pg_phill', 'pg_lamp', 'pg_cattail', 'pg_lily_s'}   # judged on the 3x3 sheet / corner zoom:
# the ratio blows up along a grain, on near-black enamel noise, and on keyed sprites (not tiled)
P = F = 0


def ok(name, cond):
    global P, F
    if cond:
        P += 1
    else:
        F += 1; print('FAIL', name)


def main():
    tiles = json.load(open(L.ART + 'tiles_pg.json'))
    ents = json.load(open(L.ART + 'ents_pg.json')) if os.path.exists(L.ART + 'ents_pg.json') else {}
    ok('tiles_pg.json holds only plan tile names', set(tiles) <= PLAN_TILES)
    for n in sorted(tiles):
        b = L.find_final('t', n, 'basecolor')
        ok(n + ' basecolor', bool(b))
        if not b:
            continue
        im = Image.open(b)
        ok(n + ' is 1024x1024', im.size == (1024, 1024))
        for m in ('normal', 'roughness'):
            ok(n + ' ' + m, bool(L.find_final('t', n, m)))
        nm = np.asarray(Image.open(L.find_final('t', n, 'normal')).convert('RGB')).astype(np.float32) / 127.5 - 1
        ln = np.linalg.norm(nm, axis=-1)
        ok(n + ' normal map unit and +Z', abs(float(ln.mean()) - 1) < 0.08 and float(nm[..., 2].mean()) > 0.6)
        if n not in NO_SEAM_RULE and n not in DIRECTIONAL:
            sx, sy = L.seam_score(np.asarray(im.convert('RGB')).astype(np.float32))
            ok('%s seam %.2f/%.2f <= 1.25' % (n, sx, sy), max(sx, sy) <= 1.25)
        ok(n + ' has a src note', bool(tiles[n].get('src')))
    for e in sorted(ents):
        ok(e + ' in the id contract', e in CONTRACT)
        ok(e + ' basecolor', bool(L.find_final('e', e, 'basecolor')))
        ok(e + ' normal', bool(L.find_final('e', e, 'normal')))
        if e.startswith('pgmat_'):
            ok(e + ' roughness', bool(L.find_final('e', e, 'roughness')))
    for sub, kind in (('final/', 't'), ('final_ent/', 'e')):
        d = L.STAGED + sub
        if os.path.isdir(d):
            for f in sorted(os.listdir(d)):
                if f.endswith('.png'):
                    name = f.rsplit('_', 1)[0]
                    ok('staged %s belongs to a live id' % f, L.is_live(kind, name))
    s = L.spent()
    cap = L.CEIL   # the shared ledger's budget (v6.1: P6 ceiling 48.19 under a 52.19 guard); None = no budget set
    if cap is None:
        print('  note: no budget set (FAL_LEDGER_DIR/BUDGET or FAL_BUDGET_USD): ledger check skipped')
    else:
        ok('ledger $%.2f <= budget $%.2f' % (s, cap), s <= cap + 1e-9)
    print('tiles %d, entity ids %d, ledger $%.3f' % (len(tiles), len(ents), s))
    print('%d passed, %d failed' % (P, F))
    sys.exit(1 if F else 0)


if __name__ == '__main__':
    main()
