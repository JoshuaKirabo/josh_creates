# 019 — Give "Back to projects" room: exit, then clear, then Projects

- **Status**: DONE (uncommitted)
- **Commit**: 1dd054f (plus the uncommitted 012–018 work in the working tree)
- **Severity**: MEDIUM
- **Category**: Easing & duration (orchestration)
- **Estimated scope**: 2 files (`script.js` ~5 lines, `styles.css` 2 rules)

## Problem

The user: "the 'back to projects' animation still feels a bit rushed." Plan 016 packs three beats into ~380 ms. The section's exit runs 0–~370 ms (hero lift: 7 × 12 ms + 280 ms). The sheet's fade starts at **180 ms** and ends at 380 ms (200 ms, `--ease-out`), so it swallows the second half of the exit. Projects is un-hidden at **180 ms** and starts its entrance on top of both. The Back button, meanwhile, just fades with the sheet. Opening (plan 018) takes a clear 320 ms for its exit before anything new appears. Closing should have the same room.

```js
/* script.js:~3082-3087 — current, dismiss() */
    // The section on screen plays its exit first; the sheet fades once most of
    // it has gone, and Projects starts back in underneath as it does.
    leaveProjectPage(sheet);
    stopHero();
    reveal = setTimeout(showProjects, 180);
    fade = sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 180, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'forwards' });
```

## Target

Three separate beats:

1. **0–370 ms, the exit alone.** The on-screen section leaves as now. "Back to projects" lifts out with it, the mirror of its rise in plan 018: `opacity: 0; translate: 0 -.5rem`, `.24s var(--ease-in-out)` (`cubic-bezier(.77, 0, .175, 1)`), delay `.06s`. The sheet gets `is-closing`.
2. **360 ms, the sheet clears.** By now only its dark bar backdrop remains. It fades 1 → 0 over **280 ms**, `cubic-bezier(.23, 1, .32, 1)`, `fill: 'forwards'` (ends 640 ms).
3. **400 ms, Projects comes back.** `showProjects` runs (page fade .24s, title/cards .9s, top bar .5s + stagger, all unchanged), overlapping the tail of the sheet's fade so the screen is never empty.

`closed()` and `open()` remove `is-closing`.

```css
/* target — styles.css, after `.project-sheet.is-playing .project-sheet-back { … }` (plan 018) */
/* Closing, the way back lifts out with the page's exit. */
.project-sheet.is-closing .project-sheet-back { opacity: 0; translate: 0 -.5rem; transition: opacity .24s var(--ease-in-out) .06s, translate .24s var(--ease-in-out) .06s; }
```

```js
/* target — script.js, dismiss() */
    // The section on screen plays its exit on its own, the way back lifting
    // out with it; then the sheet clears, and Projects comes back in as it
    // goes, so the three beats read one after another.
    leaveProjectPage(sheet);
    stopHero();
    if (!reducedMotion.matches) sheet.classList.add('is-closing');
    reveal = setTimeout(showProjects, 400);
    fade = sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, delay: 360, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'forwards' });
```

Add `sheet.classList.remove('is-closing');` to `closed()` (next to `sheet.classList.remove('is-playing');`), and in `open()` just before `if (!sheet.open) sheet.showModal();`.

## Boundaries

- Do NOT change the section exits, Projects' entrance, the top bar return, or the standalone page.

## Verification

- `node --check script.js`.
- On `projects.html`, open NextStep, then click Back:
  - The title lifts and the story dissolves, with Back lifting out alongside.
  - About 0.36 s in, the empty sheet fades.
  - Projects' title, cards and top bar come in from ~0.4 s.
  - Nothing overlaps the exit.
- Reopening shows Back rising normally (no leftover `is-closing`).
