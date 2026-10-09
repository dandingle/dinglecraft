#!/usr/bin/env python3
"""P6 wave runner (PAID): one tools/art/fal.mjs call per shot-list row, at most 4 in parallel.

  python3 tools/art/purgatory/run_wave.py <shot list .json> [--stage N] [--only a,b] [--par 4] [--force] [--dry]
  Needs $DC_ART_SRC (raw/pg/ outputs, finals) and a budget in the shared ledger ($FAL_LEDGER_DIR/BUDGET or $FAL_BUDGET_USD).

Rows: {label, stage, endpoint, est (USD per call), input, out, note}. Placeholders inside `input` strings:
  @raw:<label>:<n>           raw output image n of an earlier row (raw/pg/<wave>/<label>_images_<n>.png)
  @final:<tile>:<map>        a P6 tile final (staged copy wins)      @ent:<id>:<map>   an entity final
  @file:<ref>                a file (masks, v6.0 sources) by workspace reference, mapped by dcpaths.legacy_path
                             (hr:<rel> -> $DC_ART_SRC, pg:<rel> -> $DC_PG_ART_SRC, mg:<rel> -> $DC_MG_ART_SRC, else repo-relative)
A row whose placeholder file does not exist yet is deferred (reported, not run). A row whose result JSON already
exists is skipped unless --force (re-rolls get a NEW label instead, so nothing is ever overwritten silently).

Budget: refuses to start unless ledger spent() + the summed est of the rows it would run fits the ledger's budget (v6.1 used a
48.19 ceiling = 22.19 + $26); with no budget at all it refuses. fal.mjs's own guard stays the last line of defence.
Stops launching on the first refusal (budget exit 3, "Exhausted balance", "locked", content-policy) and reports.
"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pglib as L

FAL = L.dcpaths.FAL


def resolve(v, missing):
    if isinstance(v, list):
        return [resolve(x, missing) for x in v]
    if isinstance(v, dict):
        return {k: resolve(x, missing) for k, x in v.items()}
    if isinstance(v, str) and v.startswith('@'):
        kind, rest = v[1:].split(':', 1)
        p = None
        if kind == 'raw':
            lab, n = rest.rsplit(':', 1); p = L.raw_img(lab, int(n))
        elif kind == 'final':
            t, m = rest.rsplit(':', 1); p = L.find_final('t', t, m)
        elif kind == 'ent':
            e, m = rest.rsplit(':', 1); p = L.find_final('e', e, m)
        elif kind == 'file':
            q = L.dcpaths.legacy_path(rest)
            p = q if os.path.exists(q) else None
        if not p:
            missing.append(v)
            return v
        return p
    return v


REFUSE = ('BUDGET:', 'Exhausted balance', 'locked', 'content_policy', 'content policy', 'safety', '"status":403', 'submit failed 403')


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(2)
    sl = a[0]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    stage = opt('--stage'); only = opt('--only'); par = min(4, int(opt('--par', '4')))
    force = '--force' in a; dry = '--dry' in a
    rows = json.load(open(sl))
    want = set(only.split(',')) if only else None
    todo, deferred, skipped = [], [], []
    for r in rows:
        if want is not None and r['label'] not in want:
            continue
        if want is None and stage is not None and str(r.get('stage', 1)) != str(stage):
            continue
        d = L.raw_dir(r['label'])
        if os.path.exists(d + r['label'] + '.json') and not force:
            skipped.append(r['label']); continue
        miss = []
        inp = resolve(r['input'], miss)
        if miss:
            deferred.append((r['label'], miss)); continue
        todo.append((r, inp))
    est = sum(float(r['est']) for r, _ in todo)
    have = L.spent(); ceil = L.CEIL
    print('rows to run %d (est $%.2f), skipped (done) %d, deferred %d; ledger $%.3f -> $%.3f (budget %s)' % (
        len(todo), est, len(skipped), len(deferred), have, have + est, 'none' if ceil is None else '$%.2f' % ceil))
    for lab, miss in deferred:
        print('  deferred %s: waiting for %s' % (lab, ', '.join(miss)))
    if ceil is None:
        print('REFUSED: no budget (put BUDGET in FAL_LEDGER_DIR or set FAL_BUDGET_USD)'); sys.exit(3)
    if have + est > ceil + 1e-9:
        print('REFUSED: this wave would pass the $%.2f budget' % ceil); sys.exit(3)
    if dry or not todo:
        for r, _ in todo:
            print('  would run %-28s %-34s $%.2f' % (r['label'], r['endpoint'], float(r['est'])))
        return
    procs, done, stop = [], [], None
    for r, inp in todo:
        if stop:
            break
        while len([p for p in procs if p[1].poll() is None]) >= par:
            time.sleep(1)
            for lab, p, lg in procs:
                if p.poll() is not None and lab not in done:
                    done.append(lab)
                    t = open(lg).read()
                    if p.returncode == 3 or any(s in t for s in REFUSE):
                        stop = lab
            if stop:
                break
        if stop:
            break
        d = L.raw_dir(r['label']); os.makedirs(d, exist_ok=True)
        f = d + r['label'] + '.in.json'
        json.dump(inp, open(f, 'w'))
        lg = d + r['label'] + '.log'
        p = subprocess.Popen(['node', FAL, r['endpoint'], f, d, r['label'], '%.3f' % float(r['est'])],
                             stdout=open(lg, 'w'), stderr=subprocess.STDOUT, cwd=L.dcpaths.REPO)
        procs.append((r['label'], p, lg))
        time.sleep(0.5)
    for lab, p, lg in procs:
        p.wait()
    ok = fail = 0
    for lab, p, lg in procs:
        t = open(lg).read().strip()
        if '"ok":true' in t:
            ok += 1; print('OK   ', lab, t[-90:])
        else:
            fail += 1; print('FAIL ', lab, t[-300:])
            if p.returncode == 3 or any(s in t for s in REFUSE):
                stop = stop or lab
    print('done: %d ok, %d failed; ledger now $%.3f' % (ok, fail, L.spent()))
    if stop:
        print('STOPPED on a refusal at %s: no further rows launched. Check the log before retrying.' % stop)
        sys.exit(4)


if __name__ == '__main__':
    main()
