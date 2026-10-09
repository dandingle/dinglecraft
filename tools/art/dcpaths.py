"""dcpaths.py: where the art tools find things. Repo-relative, or from environment variables. Never an absolute literal.

The repo holds the CODE and the small decision files (picks, recipes, shot lists, pack inputs). The big source art lives
OUTSIDE git, in "workspaces" you point at with environment variables (see docs/ASSETS.md and .env.example):

  DC_ART_SRC      the Hyperreal workspace: final/ (tile maps + tiles.json), final_ent/ (entity maps), raw/ (fal outputs)
  DC_MG_ART_SRC   the Malgorath workspace: final/ (the packed maps), raw/ (fal outputs), sheets/
  DC_PG_ART_SRC   the Puppet Purgatory workspace: staged/, sheets/, masks/ (defaults to out/art/purgatory/ for outputs)
  FAL_LEDGER_DIR  the spend ledger: costs.md + BUDGET (default .art-ledger/, gitignored); FAL_BUDGET_USD caps it when
                  there is no BUDGET file. With neither, every paid tool refuses to run (fail closed).
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))


def R(*parts):
    """a path inside the repo"""
    return os.path.join(REPO, *parts)


def rel(p):
    """repo-relative spelling for messages (never print an absolute path)"""
    try:
        r = os.path.relpath(os.path.abspath(p), REPO)
    except ValueError:
        return os.path.basename(p)
    return os.path.basename(p) if r.startswith('..') else r


def _dir(var, what, required=True, default=None, cli=None):
    v = cli or os.environ.get(var) or default
    if not v:
        if required:
            raise SystemExit('%s is not set: point it at %s (see docs/ASSETS.md)' % (var, what))
        return None
    v = os.path.abspath(os.path.expanduser(v))
    if required and not os.path.isdir(v):
        raise SystemExit('%s does not name a folder (%s expected there)' % (var, what))
    return v.rstrip('/') + '/'


def hr_src(cli=None, required=True):
    """the Hyperreal workspace (holds final/ and final_ent/), from --src or DC_ART_SRC"""
    return _dir('DC_ART_SRC', 'the Hyperreal workspace (the folder holding final/ and final_ent/)', required, cli=cli)


def mg_src(cli=None, required=True):
    """the Malgorath workspace (holds final/), from --src or DC_MG_ART_SRC"""
    return _dir('DC_MG_ART_SRC', 'the Malgorath workspace (the folder holding final/ with the mg_* maps)', required, cli=cli)


def pg_src(cli=None, required=False):
    """the Puppet Purgatory workspace (staged/, sheets/, masks/); defaults to out/art/purgatory/"""
    d = _dir('DC_PG_ART_SRC', 'the Puppet Purgatory art workspace', False, default=R('out', 'art', 'purgatory'), cli=cli)
    os.makedirs(d, exist_ok=True)
    return d


# committed repo locations the tools share
MODELS = R('src', 'texpacks', 'models') + '/'           # the Hyperreal cast models (scanned for entity ids)
MG_MODELS = R('src', 'malgorath', 'hr', 'models') + '/'
PACK_INPUTS = R('assets', 'pack-inputs') + '/'          # hr_tiles.json (hand-authored) + tiles.json (the tile list)
PACKED = R('assets', 'packed') + '/'                    # the committed payloads + manifests
FAL = R('tools', 'art', 'fal.mjs')
TEX_DIR = R('tools', 'art', 'texpacks')


def build_dir():
    """where `npm run build` writes hr_assets.gen.js / mg_assets.gen.js (DC_BUILD or build/)"""
    return os.path.abspath(os.environ.get('DC_BUILD') or R('build')) + '/'


def legacy_path(p):
    """map a shot-list file reference onto the workspaces / repo: 'hr:<rel>' is under $DC_ART_SRC, 'mg:<rel>' under
    $DC_MG_ART_SRC, 'pg:<rel>' under $DC_PG_ART_SRC, anything else is repo-relative"""
    for pre, fn in (('hr:', lambda: hr_src()), ('mg:', lambda: mg_src()), ('pg:', lambda: pg_src())):
        if p.startswith(pre):
            return fn() + p[len(pre):]
    return R(p)


# ------------------------------------------------------------------ the spend ledger (same rules as fal.mjs)
def ledger_dir():
    return os.path.abspath(os.environ.get('FAL_LEDGER_DIR') or R('.art-ledger')) + '/'


def spent():
    s = 0.0
    try:
        with open(ledger_dir() + 'costs.md', encoding='utf-8') as f:
            for line in f:
                m = re.match(r'^\|[^|]*\|[^|]*\|[^|]*\|\s*\$([0-9.]+)\s*\|', line)
                if m:
                    s += float(m.group(1))
    except FileNotFoundError:
        pass
    return s


def budget():
    """the spend cap in USD, or None (= refuse): BUDGET file in the ledger dir, else FAL_BUDGET_USD"""
    try:
        with open(ledger_dir() + 'BUDGET', encoding='utf-8') as f:
            v = float(f.read().strip())
            return v if v >= 0 else None
    except (FileNotFoundError, ValueError):
        pass
    try:
        v = float(os.environ.get('FAL_BUDGET_USD', ''))
        return v if v >= 0 else None
    except ValueError:
        return None


def require_budget(est):
    """refuse (exit 3) unless ledger + est stays within the budget; returns (spent, cap)"""
    cap, have = budget(), spent()
    if cap is None:
        print('REFUSED: no budget. Put a BUDGET file (USD) in FAL_LEDGER_DIR (default .art-ledger/) or set FAL_BUDGET_USD.')
        sys.exit(3)
    if have + est > cap + 1e-9:
        print('REFUSED: ledger $%.3f + this run $%.3f would pass the $%.2f budget' % (have, est, cap))
        sys.exit(3)
    return have, cap
