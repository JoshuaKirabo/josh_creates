# 001 — Paint the fold without per-frame scrollTo

- **Status**: DONE
- **Commit**: 93bcc7e
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 2 files (`script.js`, `tests/section-scroll.test.cjs`)

## Problem

The Home → About navigation spring writes the document scroll position on every animation frame, then paints transforms from the same `y`. The words already follow the spring. `scrollTo` still invalidates two sticky full-viewport layers (`hero`, `about`) ~60×/s while those nodes also receive transforms. That is the leftover fight behind the fold stutter.

```js
/* script.js:798 — current */
const spring = createSpring2D(1.1, ({ y }, settled) => {
  if (!running) return;
  window.scrollTo({ top: y, behavior: 'instant' });
  // Keep subpixel precision even when the browser rounds its scroll offset.
  paint(y);
  if (settled) complete();
}, { restDistance: 1, restSpeed: 8 });
```

Both surfaces are already pinned for the whole fold (`position: sticky; top: 0` plus About’s negative margin). Intermediate scroll is not what the reader sees.

## Target

Keep the 1.1s critically damped spring, `paint(y)`, reversals, and subpixel pose. Stop calling `window.scrollTo` inside the spring tick.

```js
/* target */
const spring = createSpring2D(1.1, ({ y }, settled) => {
  if (!running) return;
  paint(y);
  if (settled) complete();
}, { restDistance: 1, restSpeed: 8 });
```

Write `scrollTo` only when the document must match the pose:

- **complete()**: `window.scrollTo({ top: destination, behavior: 'instant' })` after `running = false` and `presentation.jumpTo(0, presentedPosition)`.
- **stop()** (interrupt): if a journey was running, `window.scrollTo({ top: presentedPosition, behavior: 'instant' })` then `presentation.jumpTo(0, presentedPosition)`.
- **instant / reduced-motion navigate()**: keep the existing one-shot `scrollTo`.

Do not add a new easing, duration, or second spring. The navigation spring stays `{ response: 1.1, restDistance: 1, restSpeed: 8 }`.

## Repo conventions to follow

- Visual pose is already decoupled from rounded `scrollY` — `paint(y)` receives the spring value. Keep that. Exemplar: `script.js:801-802` comment and `tests/section-scroll.test.cjs` “rounded browser scroll offsets…”.
- Instant landings already use `behavior: 'instant'`. Keep that spelling.
- Tests drive time with `advance(ms)` and treat `window.scrollY` as the document position, not as the compositor.

## Steps

1. In `script.js`, remove `window.scrollTo({ top: y, behavior: 'instant' })` from the navigation spring tick. Leave `paint(y)` and `if (settled) complete()`.
2. In `complete()`, after `presentation.jumpTo(0, presentedPosition)` and `running = false`, add `window.scrollTo({ top: destination, behavior: 'instant' })`.
3. In `stop()`, when `running` is true, write `window.scrollTo({ top: presentedPosition, behavior: 'instant' })` before `presentation.jumpTo(0, presentedPosition)`.
4. Update tests that used mid-journey `scrollY` as a pose proxy. After a `click('#about')` the document may stay at `0` until `complete()`:
   - `a navigation spring responds on its first display frame`: after `advance(16)`, assert the wordmark transform is no longer the rest pose `translate3d(0px, 0px, 0) scale(1)` (not `scrollY > 0`).
   - `reversing a link animation…`, `mouse contact stops navigation…`, `a reverse wheel flick…`: capture `s.stage.style.transform` (not `scrollY`) as the pose that must be retained on retarget/stop.
   - `a pointer reversal retains forward momentum…`: after the reverse click + `advance(16)`, assert the travelling name’s Y (via `inkCentreOf`) is still moving toward About relative to the click pose, then `advance()` lands at `scrollY === 0`.
   - `explicit link navigation has only its navigation spring`: after `advance(96)`, compare `s.stage.style.transform` to a `direct.scrollTo` setup only if you first derive progress from the transform; otherwise assert the mid-pose is neither rest nor landing, and after full `advance()` it matches `direct.scrollTo(BOUNDARY)`.
   - `rounded browser scroll offsets…`: keep asserting the two stages’ transforms stay equal for 95 frames. Drop the requirement that `scrollTo` is invoked (and rounded) on every frame. Rounding may occur only on the final `complete()` write; the drawn word must still match the unrounded spring for the whole trip.
   - End-state assertions (`advance()` then `scrollY === BOUNDARY` or `0`) stay.
5. Add a regression: `click('#about')`, spy/count `window.scrollTo` across `advance(96)` — count stays `0` — then full `advance()` — count is `1` and `scrollY === BOUNDARY`.

## Boundaries

- Do NOT change the 1.1s response, rest thresholds, `paint(y)` math, or the 0.3s presentation spring used for native wheel smoothing.
- Do NOT change sticky CSS, fold geometry, or `measureFolds()`.
- Do NOT add a motion library.
- Do NOT make keyboard section changes animate; they already call `navigate(to, true)`.
- If the spring tick no longer contains `scrollTo` and `complete()` no longer exists, STOP — the file has drifted.

## Verification

- **Mechanical**: `node --test tests/section-scroll.test.cjs` exits 0.
- **Feel check**: click Meet Josh / About me, and flick the trackpad Home → About.
  - Words start moving on the first displayed frame (no idle frame).
  - Reversing mid-fold keeps the current pose and velocity (no jump to an endpoint).
  - Mouse contact freezes the pose; the page does not keep sliding.
  - On arrival, About can scroll normally (document is at the boundary).
  - In DevTools Performance, a 1.1s fold should not show a `scroll` + sticky recalc on every frame — only at interrupt/landing.
  - Toggle `prefers-reduced-motion`: land instantly via the existing instant path.
- **Done when**: navigation frames call `paint(y)` only; `scrollTo` runs at complete/stop/instant; tests above pass.
