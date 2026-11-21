# 004 — Freeze fold chrome until landing

- **Status**: DONE
- **Commit**: 93bcc7e
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 2 files (`script.js`, `tests/section-scroll.test.cjs`)

## Problem

During a spring journey, `paint()` invalidates the style/accessibility tree at three different progresses: `.section-folding` on the first pixel, `inert` + `pointer-events` at 45%, `aria-current` at 50% (which restyles the sidebar chips). Those are extra layout/style turns in the middle of the word travel.

```js
/* script.js:692-696 — current */
const folding = !still && progress > 0 && progress < .999;
if (folding !== foldingState) {
  foldingState = folding;
  root.classList.toggle('section-folding', folding);
}

/* script.js:738-753 — current */
const handedOver = !still && progress > .45;
const handover = still ? 'native' : handedOver ? 'about' : 'home';
if (handover !== handoverState) {
  handoverState = handover;
  hero.style.pointerEvents = handedOver ? 'none' : '';
  hero.inert = handedOver;
  about.inert = !still && !handedOver;
  about.style.pointerEvents = about.inert ? 'none' : '';
}
const current = progress >= .5 ? '#about' : '#home';
if (current !== currentSection) {
  currentSection = current;
  currentLinks.forEach(link => {
    if (link.hash === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
```

Native scrub (trackpad pixels / keyboard) should keep the existing 45% / 50% handoff so a half-scrolled page remains clickable. The hitch to remove is the spring path (`running === true`).

## Target

While `running` is true, `paint()` must not toggle `.section-folding`, `inert`, `pointer-events`, or `aria-current`.

```js
/* target — navigate() when starting a non-instant journey */
if (!instant && !reducedMotion.matches) {
  root.classList.add('section-folding');
  foldingState = true;
}

/* target — paint() chrome block */
if (!running) {
  /* existing folding / handover / aria-current logic, unchanged thresholds */
}

/* target — complete() after running = false */
applyFoldChrome(destination > 0);
root.classList.toggle('section-folding', false);
foldingState = false;

/* applyFoldChrome(toAbout) writes the same inert/pointer-events/aria-current
   as the current handedOver === toAbout branch */
```

`stop()` leaves chrome at the interrupted progress: after syncing scroll (plan 001) and `running = false`, call the existing paint chrome once via `paint(presentedPosition)` so a half-stopped fold matches today’s scrub handoff at that pose.

Do not change the 45% pointer handoff or 50% `aria-current` thresholds for the non-running path.

`.section-folding .section-nav-link[aria-current]` (transparent chip while words travel) stays. Adding the class at `navigate()` start — before the first pixel — avoids a first-frame class toggle inside `paint()`.

## Repo conventions to follow

- `section-folding` already exists only to hide the current-chip fill during travel (`styles.css:289`). Do not invent a new class.
- Keyboard links already call `navigate(to, true)` and must stay instant, including chrome.
- Tests for native scrub (`scrollTo(BOUNDARY * .8)` ⇒ `hero.style.pointerEvents === 'none'`) must keep passing.

## Steps

1. Extract the current handover + `aria-current` writes into `applyFoldChrome(toAbout)` or keep them inline in the `if (!running)` branch — either is fine if the values match.
2. In `navigate()`, when starting an animated journey, `root.classList.add('section-folding')` once.
3. Skip the folding/handover/aria block in `paint()` when `running` is true.
4. In `complete()`, apply landed chrome (`toAbout = destination > 0`) and remove `.section-folding`.
5. In `stop()`, after `running = false` and the interrupt `scrollTo`, `paint(presentedPosition)` so chrome matches the frozen pose.
6. Update only tests that assume mid-spring chrome if any start failing. Native-scrub tests stay. After a full `click('#about'); advance()`, `hero.inert` is still `true`.

## Boundaries

- Do NOT change fold transforms, opacities, or stagger.
- Do NOT apply `inert` at progress 0/1 only for native scrub — that would leave the hero swallowing clicks at 80% scroll.
- Do NOT animate `aria-current` / background with a new transition.
- Do NOT touch reduced-motion (already `handover = 'native'`).

## Verification

- **Mechanical**: `node --test tests/section-scroll.test.cjs` exits 0.
  - Scrub at `.2` / `.8` still swaps `pointerEvents` and `inert`.
  - Home rest: `about.inert === true`. About rest: `hero.inert === true`.
- **Feel check**: click About me. During the 1.1s trip the sidebar chip must not flash white at 50%. On landing the About chip fills. Scrubbing with the wheel still hands the pointer to About around halfway.
  - In DevTools Animation / Performance, a link-driven fold should not show style invalidation at 45% and 50% — only at start (`section-folding` on) and landing.
  - `prefers-reduced-motion`: chrome follows the instant path; nothing is inert-locked incorrectly.
- **Done when**: spring ticks only write transform/opacity; chrome updates at navigate start + complete/stop (or via post-stop paint).
