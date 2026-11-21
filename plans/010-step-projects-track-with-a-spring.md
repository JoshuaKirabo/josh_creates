# 010 — Step the Projects track one card per gesture on a spring

- **Status**: DONE (uncommitted)
- **Commit**: ac07bee (plus the uncommitted working tree)
- **Severity**: HIGH
- **Category**: Interruptibility (the track "tweaks" back and forth)
- **Estimated scope**: 1 file (`script.js` ~45 lines)

## Problem

The Projects track is driven by native scroll. Each card has a snap point with `scroll-snap-stop: always` (`styles.css:699`), and on a fine pointer the track follows the scroll through a first-order lag (`GLIDE = .09`):

```js
/* script.js — initProjectsTrack, current */
const GLIDE = .09;
…
shown = glide ? goal + (shown - goal) * Math.exp(-dt / GLIDE) : goal;
```

Wheel and trackpad momentum carries the document past the next card's stop, and the snap then pulls it back. The track mirrors every one of those pushes and pull-backs sideways (×1/1.15), so it shakes between two cards before it settles. Measured in headless Chrome at card 1 (y = 7958), each wheel event moved the document +40px and the snap pulled it straight back: 40+ direction reversals in one flick, with the track swinging 20–115px sideways. The exponential lag also starts at full speed rather than from rest, so even a clean step starts with a jerk.

The first card also meets Education by native snap, so the Education ↔ Projects boundary has the same fight.

The rest of About already solves this with `holdPageTurns` (`script.js:1215`): one gesture is one turn, and its momentum is swallowed. Projects is the one page still left to the browser's snapping.

## Target

On a fine pointer (wheel/trackpad), with motion allowed:

- A gesture from a card's stop claims the turn (via `holdPageTurns`, momentum swallowed). The document **cuts** to the next card's stop with `behavior: 'instant'`. Because the frame is sticky, the cut is invisible, and only the track moves.
- The track's presentation is a **critically damped spring** on x: `createSpring2D(.5, …)` (`script.js:203`, the same helper as the fold and wheel presentation, `script.js:912`). A second flick mid-glide simply retargets, keeping the track's speed. No overshoot and no pull-back.
- From the first card, a gesture up turns to Education with a smooth scroll, as Education's turn down to Projects does. From the last card, a gesture down is left native (the page end).
- Touch keeps native momentum and snapping with the track 1:1 (unchanged). Keyboard and reduced motion follow the scroll exactly (unchanged).

## Steps

1. **`script.js`, `holdPageTurns` (~line 1215).** Add a `wheelOnly` option that skips the touch listeners:
   ```js
   function holdPageTurns(target, leave, { fresh = false, wheelOnly = false } = {}) {
   ```
   Wrap the `let touchY = null;` line and both touch listeners in `if (!wheelOnly) { … }`. Add `With wheelOnly, touch keeps native scrolling.` to the function's comment.

2. **`script.js`, `initProjectsTrack` (~line 2499).**
   - Delete `const GLIDE = .09;` and its comment, and the `let shown = 0;` and `let lastTime = 0;` declarations.
   - Replace `tick`, and the `refresh` body, with:
     ```js
     // A fine pointer sees the track glide to each stop on a critically damped
     // spring; touch has native momentum and reduced motion follows exactly.
     const smooth = () => finePointer.matches && !reducedMotion.matches && !document.documentElement.classList.contains('touch-input');
     const glide = createSpring2D(.5, ({ x }) => paint(x), { restDistance: .1, restSpeed: 2 });
     glide.setActive(true);

     function tick() {
       frameId = 0;
       const goal = target();
       if (smooth()) glide.setTarget(goal, 0);
       else {
         glide.jumpTo(goal, 0);
         paint(goal);
       }
     }
     ```
     ```js
     function refresh() {
       measure();
       const goal = target();
       glide.jumpTo(goal, 0);
       paint(goal);
     }
     ```
     Do NOT call `glide.setActive(false)`: its `rest()` paints x = 0.
   - Change the rail link click's scroll to `behavior: reducedMotion.matches || !smooth() ? 'auto' : 'instant'`. Only `smooth()` pointers skip the native smooth scroll, because the spring now carries the track.
   - After the `railLinks.forEach(…)` block, add the wheel stepping:
     ```js
     // A fine pointer turns the track one card per gesture, as About turns its
     // pages: the document cuts to the card's stop and the spring carries the
     // track there, so the browser's snap never has momentum to pull back.
     // Before the first card is Education, reached the way it turns down.
     const cardStops = () => {
       const end = document.documentElement.scrollHeight - window.innerHeight;
       return cards.map((_, index) => Math.min(scrollFor(index), end));
     };
     holdPageTurns((direction) => {
       if (!geometry?.distance || !smooth()) return;
       const y = window.scrollY;
       const stops = cardStops();
       const at = stops.findIndex(stop => Math.abs(stop - y) <= 2);
       if (at < 0) return;
       if (at + direction < 0) return pageStops().filter(top => top < y - 2).pop();
       return stops[at + direction];
     }, (to, edge) => {
       window.scrollTo({ top: to, behavior: to < geometry.start ? 'smooth' : 'instant' });
     }, { wheelOnly: true });
     ```
     `at + direction >= stops.length` returns `undefined`, which leaves the last card's gesture down native.

## Boundaries

- Do NOT change the snap markers or CSS; touch still relies on them.
- Do NOT change `paint`, `measure`, `scrollFor`, the entrance observer, or `initProjectsNav`.
- Do NOT touch `projects.html`. The standalone page gets this through `script.js`, and that is fine.
- If the cited lines don't match, STOP and report.

## Verification

- `node --check script.js`; `node --test tests/section-scroll.test.cjs` (43 pass).
- Probe: with the site on :8765, log `scrollY` and the track's `DOMMatrix(...).e` per frame through three wheel flicks down from card 1 and two up. Expect `scrollY` to change only by whole card steps (never reversing within a flick) and the track x to move monotonically to each card, easing in and out.
- Feel check (Chrome and Safari, trackpad **and** a notched mouse wheel):
  - One swipe = one card, no bounce back, the track eases out of rest and settles without overshoot.
  - Two quick swipes: the track curves on to the second card without stopping at the first.
  - Swipe back mid-glide: it reverses smoothly, with no jolt.
  - Card 1, swipe up: Education arrives (smooth scroll), with no shake at the boundary.
  - Touch device / DevTools touch emulation: native momentum and snapping as before.
  - Reduced motion: the track follows the scroll exactly.
