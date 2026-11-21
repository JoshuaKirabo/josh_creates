# 012 — Redraw How it works on every arrival

- **Status**: DONE (uncommitted)
- **Commit**: 1dd054f (plus the uncommitted NextStep work in the working tree)
- **Severity**: HIGH
- **Category**: Cohesion (entrance consistency)
- **Estimated scope**: 1 file (`script.js`), ~10 lines

## Problem

The How it works figure draws itself (outlines → fills → routes → inspector) only on the first arrival per page load. Every later turn to the section shows the figure already drawn while the sheet slides up, so the section's entrance is inconsistent with the first visit.

The cause is a one-shot flag in `initProjectHow` (`script.js`, `function initProjectHow`, ~line 2646):

```js
/* script.js — current */
  let drawn = false;
  let drawTimer = 0;
  const finishDraw = () => {
    if (!section.classList.contains('is-drawing')) return;
    clearTimeout(drawTimer);
    section.classList.remove('is-drawing');
    // The selected stage's routes ink in, as a selection does.
    arch?.dispatchEvent(new CustomEvent('arch-ink', { bubbles: true }));
  };
  const enter = () => {
    section.classList.remove('is-leaving');
    if (section.classList.contains('is-entered')) return;
    if (!drawn) {
      drawn = true;
      section.classList.add('is-drawing');
      drawTimer = setTimeout(finishDraw, HOW_DRAW_MS);
    }
    section.classList.add('is-entered');
  };
  …
  const reset = () => {
    finishDraw();
    section.classList.remove('is-entered', 'is-leaving');
  };
```

`reset()` runs when the section is fully off screen, clears `is-entered`, but `drawn` stays `true`, so `is-drawing` is never added again. A second problem appears once the draw replays: the selected stage's `.arch-ink` overlays (added by `select()` and by the `arch-ink` event) are still in the DOM at full length, so the selected routes would show complete while everything else draws.

## Target

- Every fresh arrival (the section was not `is-entered`) plays the full draw: `is-drawing` is removed, a reflow is forced so the CSS animations restart, then `is-drawing` is added and `HOW_DRAW_MS` (2400) is timed again.
- Any `.arch-ink` paths are removed when a draw starts; `finishDraw` re-inks the selection as it does now.
- A reset while off screen ends a draw silently (no `arch-ink` dispatch).
- A quick turn back before the section fully leaves (still `is-entered`) does not restart the draw — unchanged behaviour.
- No CSS changes. The existing `.how-motion.is-drawing` keyframes (`styles.css`, "The first arrival draws the figure" block) and the `--inspect-at: 2s` timing stay as they are.

```js
/* target */
  let drawTimer = 0;
  const endDraw = () => {
    clearTimeout(drawTimer);
    section.classList.remove('is-drawing');
  };
  const finishDraw = () => {
    if (!section.classList.contains('is-drawing')) return;
    endDraw();
    // The selected stage's routes ink in, as a selection does.
    arch?.dispatchEvent(new CustomEvent('arch-ink', { bubbles: true }));
  };
  // Every arrival draws the figure again, from blank.
  const draw = () => {
    endDraw();
    arch?.querySelectorAll('.arch-ink').forEach(ink => ink.remove());
    void section.offsetWidth;
    section.classList.add('is-drawing');
    drawTimer = setTimeout(finishDraw, HOW_DRAW_MS);
  };
  const enter = () => {
    section.classList.remove('is-leaving');
    if (section.classList.contains('is-entered')) return;
    draw();
    section.classList.add('is-entered');
  };
  …
  const reset = () => {
    endDraw();
    section.classList.remove('is-entered', 'is-leaving');
  };
```

## Repo conventions to follow

- Restarting CSS animations by class removal + `void el.offsetWidth` + re-add is already the pattern in `playProjectHero` (`sheet.classList.remove('is-playing'); void sheet.offsetWidth; sheet.classList.add('is-playing');`).
- Comments are one or two plain sentences above the line they explain; match that.

## Steps

1. In `script.js`, inside `function initProjectHow(section)`, delete `let drawn = false;`.
2. Replace the `finishDraw` arrow with `endDraw`, `finishDraw` and `draw` exactly as in the Target block.
3. Replace the body of `enter` with the Target version (calls `draw()` instead of the `if (!drawn)` block).
4. In `reset`, replace `finishDraw();` with `endDraw();`.
5. Leave `section.addEventListener('pointerdown', finishDraw);`, the observer, and the returned cleanup unchanged.

## Boundaries

- Do NOT touch `styles.css`, `playProjectHero`, `orderProjectHandover`, or `initProjectPaging`.
- Do NOT change `HOW_DRAW_MS` or any animation timing.
- Another Claude session has been editing these functions. If `initProjectHow` does not match the "current" excerpt, STOP and report instead of improvising.

## Verification

- **Mechanical**: `node --check script.js` exits 0.
- **Feel check** (serve the site, open `projects/next_step.html`, wheel/trackpad turns):
  - Turn hero → How it works: the figure draws (outlines in flow order, then fills, routes, inspector).
  - Turn back to the hero, then to How it works again: the figure draws again from blank, identically. Repeat 5 times.
  - Change the selected stage, turn away and back: the draw replays and ends with the *new* selection's routes inking in; at no point during the draw are the selected routes already complete.
  - Click inside the figure mid-draw: it jumps to finished (existing `pointerdown` skip) and the selection inks in.
  - Flick back up and immediately down again before the section leaves the screen: no restart mid-draw.
  - Rendering panel → `prefers-reduced-motion: reduce`: no draw at all (initProjectHow returns early).
- **Done when**: every hero → How it works turn plays the full draw.
