# 003 — Defer fold remasure until rest

- **Status**: DONE
- **Commit**: 93bcc7e
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 2 files (`script.js`, `tests/section-scroll.test.cjs`)

## Problem

`measureFolds()` starts by clearing every travelling transform and toggling `.fold-measuring`, which forces `transform: none !important` on intro letters. `paint()` runs that the moment `foldStale` is true. `document.fonts.ready`, `resize`, and `pageshow` all set `foldStale`. If any of those fire during the 1.1s fold, the words snap to rest for a measure frame.

```js
/* script.js:616-639 — current */
function clearFolds() { /* clears mover/reveal/icon transforms + opacity */ }

function measureFolds() {
  clearFolds();
  nameFold = null;
  navFolds = [];
  about.style.transform = '';
  if (sidebar) sidebar.style.transform = '';
  if (reducedMotion.matches || !root.classList.contains('section-scroll-ready')) return;
  root.classList.add('fold-measuring');
  /* ... Range + getBoundingClientRect measurements ... */
  root.classList.remove('fold-measuring');
}

/* script.js:684-687 — current */
if (foldStale) {
  foldStale = false;
  measureFolds();
}

/* script.js:1009 — current */
document.fonts?.ready.then(() => { foldStale = true; schedulePaint(); });
```

## Target

Keep the same measurement math (`inkBox`, `planFold`, `.fold-measuring` overrides). Only run it while the fold is still.

```js
/* target, inside paint() after progress/folding are known */
const folding = !still && progress > 0 && progress < .999;
if (foldStale && !running && !folding) {
  foldStale = false;
  measureFolds();
}
```

If `foldStale` is set mid-journey, leave the flag true and keep the current plans. On `complete()`, after `running = false` and the landing `scrollTo`, if `foldStale` is still true call `paint(presentedPosition)` once so rest geometry updates while movers are already at opacity 0 (progress 0 or 1 — `folding` is false).

Do not remasure inside a running spring tick.

## Repo conventions to follow

- `measureFolds()` already documents that `.fold-measuring` must not paint. Keep that class local to the measure function.
- Resize at rest already re-solves landings (`tests/section-scroll.test.cjs` “resizing re-solves the fold…”). That path stays: at `scrollY === boundary`, `folding` is false and `running` is false.
- `measure()` may still set `foldStale = true` and retarget `navigate()` when a journey is in flight. Do not remove that boundary update; only skip the ink remasure until rest.

## Steps

1. In `paint()`, compute `progress` / `still` / `folding` before measuring. Replace the unconditional `if (foldStale) measureFolds()` with `if (foldStale && !running && !folding)`.
2. In `complete()`, after the landing `scrollTo` from plan 001, if `foldStale` call `paint(presentedPosition)`.
3. Add a test: `click('#about')`, `advance(96)`, move `sidebarName.ink` (and a sidebar label ink) by a large offset, `dispatch('window', 'resize')`, `advance(16)`. Assert `s.stage.style.transform` equals the pre-resize mid-pose (no remasure snap). Then `advance()` to land. A following rest-state resize (existing tests) must still remasure.

## Boundaries

- Do NOT change `inkBox` / `planFold` math or stagger (`lead = .03`, span to `.92`).
- Do NOT remasure by writing transforms on a hidden clone; keep `.fold-measuring`.
- Do NOT skip remasure at rest (fonts.ready after a settled Home or About must still update).
- Do NOT add dependencies.

## Verification

- **Mechanical**: `node --test tests/section-scroll.test.cjs` exits 0, including the new mid-fold resize test and the existing rest resize tests.
- **Feel check**: start Home → About immediately after reload (fonts may still be swapping). Words must not flash to the rest layout mid-trip. After landing, resize the window: landings must re-solve, same as today.
  - Slow the animation in DevTools to 10% and trigger a width resize mid-fold: no one-frame snap to Home.
- **Done when**: `measureFolds()` cannot run while `running` or `folding`; rest remasure still works.
