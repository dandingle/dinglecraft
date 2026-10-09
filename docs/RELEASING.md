# Versions, patch notes and releases

## The rules

- **A shipped version is frozen.** Every released version is recorded (bytes and md5 of its html) in
  `tests/fixtures/shipped.json`. If the current `GAME_VERSION` is in that list, the build must reproduce those exact bytes.
  So any change that alters the output starts with a version bump.
- **One new file per release.** `dist/dinglecraft_v<X.Y>.html` is never overwritten: someone may be playing last
  night's build while the next one is cooking.
- **Versions are two-part**, `X.Y` (6.3, 6.4, ... 7.0). There are no patch versions: a hotfix is the next minor version.
  The brain only serves files named `dinglecraft_v<X>.<Y>.html`.
- **Every version also has a public label** (`RELEASE_LABEL`, e.g. "Release 1.0" for game versions 6.5 to 6.8). Players
  and readers see the label; saves, migrations, file names and comparisons use the version. Consecutive versions may share
  a label (the cuts of one release); a label never comes back once a newer one has shipped. The full scheme is in
  [CONTRIBUTING.md](../CONTRIBUTING.md), "Versions and release labels".

## 1. Bump

```
npm run bump -- 6.9 "The Something Update" --label "Release 1.1"
```

A later cut of the current release keeps its label: `npm run bump -- 6.9 "Release 1.0 (fixes)" --label "Release 1.0"`.

`scripts/bump.mjs` changes every place the version and the label live, all or nothing (each anchor must match exactly
once, or no file is written):

| where | what |
|---|---|
| `src/core/p01a_prologue.js` | `const GAME_VERSION = '6.9';` and `const RELEASE_LABEL = 'Release 1.1';` |
| `html/dom/title.html` | the title screen's version tag, the element with `id="t_ver"` |
| `html/dom/panels_b.html` | the win screen's `DINGLECRAFT Release 1.1.` (`#winsmall`) |
| `src/ui/p28_patch_notes.js` | the old top entry gets its literal `v` and `label`; a new top entry `{v:GAME_VERSION,label:RELEASE_LABEL,title:'The Something Update',lines:['TODO patch notes']}` |
| `package.json` | `"version": "6.9.0"` |

It refuses a version at or below the current one or any shipped one, an older release's label, and a title or label
with an apostrophe, `<` or a backslash. `tests/repo/r_build.js` (and every build) checks that all the sites agree. The
html sites are found by element id, so the markup around them can be redesigned freely: keep `id="t_ver"` and
`id="winsmall"` and their text.

## 2. Build the update

Work as usual ([CONTRIBUTING.md](../CONTRIBUTING.md)). Before release, also:

- **Patch notes.** Replace the `TODO` line in the new top `PATCH_LOG` entry with the real notes.
- **Help screen.** Add a row for the feature to the key list in `html/dom/help.html` (newest update's row above the
  previous one's) and a blurb below.
- **Save compatibility.** If the save format grew, make sure old saves load, and say in the notes that worlds opened in
  this version should stay on it (older builds drop what they do not know when they autosave).

### Writing patch notes

Patch notes are the announcement. Players no longer see them in game (the What's New and Patch Notes screens were retired
in Release 1.0; their buttons stay hidden in the DOM for old saves and the frozen core suite): `PATCH_LOG` is the data
behind `CHANGELOG.md` and the release tooling. The house voice: **confident, playful, a little absurd, and honest.** One
line per feature, with the controls a player needs. The game is satire-friendly (the store sells "Remove Ads"; there are
no ads), but the notes never lie about what the game does. The test counts go in the announcement (`npm run release`
prints them), not in the notes.

Mechanics (each line is a single-quoted JavaScript string rendered as HTML):

- No raw `'` (use a typographic apostrophe `’` or `&#x27;`), no raw `<` or `>` (write `&lt;player&gt;`: the v5.9 notes
  wrote `<player>`, which the browser swallowed as a tag), and `&amp;` for a literal ampersand next to letters.
- Keep each line one paragraph. `CHANGELOG.md` turns them into Markdown automatically.

## 3. Gate

```
npm run gate
```

About 20 minutes; run it in the background. It must be green, and it writes `out/gate_last.json` with the html md5 and the
counts. Flaky? Read the field manual in [TESTING.md](TESTING.md) before touching game code.

Then look at it, muted, in a real browser, in both texture packs ([QA.md](QA.md)).

## 4. Release

```
npm run release
```

`scripts/release.mjs` refuses unless:

- the version is above every shipped version, and its label is new or the newest shipped label (a later cut);
- the top patch-notes entry is this version, has lines, and contains no `TODO`;
- `out/gate_last.json` was written for **the same html md5** as a fresh build of the current sources (so the gate you
  ran tested exactly what ships);
- `dist/dinglecraft_v<X.Y>.html` does not already exist with different bytes.

Then it rebuilds into a private folder, copies the html to `dist/` (if it is not there yet), records the version in
`tests/fixtures/shipped.json` (from now on it is frozen), regenerates `CHANGELOG.md`, and prints the patch notes plus the
gate counts for the announcement.

## 5. Commit and tag

```
git add -A
TZ=UTC0 git commit -m "release: Release 1.1 (v6.9) The Something Update"
git tag v6.9
git tag release-1.1        # a later cut of an existing label moves its tag: git tag -f release-1.0
```

Commit in UTC (`TZ=UTC0`): the pre-commit hook (`npm run hooks`) refuses a local timezone, and the pre-push hook runs
`npm run scan:history` over everything the push would publish.

The html itself is not committed (`dist/` is gitignored): it is reproducible from the tag with `npm run build`.

**Game versions and release labels are different things.** `GAME_VERSION` counts game builds (6.3, 6.4, ...) and only
goes up; `RELEASE_LABEL` is the name players and readers see. Release 1.0, the first public release of this repository,
came in cuts: game version 6.4 (labelled Release 1.0 Preview: the v6.3 game plus the IP clean-up, the privacy fixes, the
bigger UI and the new title menu), then 6.5 to 6.8 as Release 1.0. Tag both: `git tag v6.8` and
`git tag -f release-1.0` (`npm run release` prints the exact commands).

## Where the new version gets played

- The brain launcher serves the newest `dist/dinglecraft_v*.html` ([BRAIN.md](BRAIN.md)).
- `npm run serve` serves `dist/` at `http://127.0.0.1:8643/`.
- Or double-click the file.

All versions opened from the same origin share one world list, which is why the patch notes warn when a world should not
go back to an older version.
