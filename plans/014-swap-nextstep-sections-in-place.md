# 014 — Swap the NextStep hero and How it works in place instead of gliding between them

- **Status**: DONE (uncommitted)
- **Commit**: 1dd054f (plus the uncommitted 012 / 013 NextStep work in the working tree)
- **Severity**: HIGH
- **Category**: Purpose & frequency (page transition feel)
- **Estimated scope**: 2 files (`script.js` ~30 lines, `styles.css` 4 rules + 1 comment)

## Problem

On `projects/next_step.html`, a wheel/trackpad turn between the hero and How it works should feel like a **page transition**: the section in front empties, and the next one takes its place without moving. The user said: "it should feel like we are on the same page. The scrolling effect should not feel like the page is physically moving."

Right now it reads as travelling, for two reasons:

1. **The turn glides the document.** `handOver` starts the exit, waits 160 ms, then scrolls the page one full screen over 1.1 s on an expo-out curve. The two sections slide past each other, and the glide dominates everything else on screen.

```js
/* script.js:2724-2726 — current */
const projectTurnEase = t => Math.min(1, 1.001 - Math.pow(2, -10 * t));
const PROJECT_TURN_MS = 1100;
const PROJECT_HOLD_MS = 160;
```

```js
/* script.js:~2775-2793 — current, function handOver inside initProjectPaging */
  // A turn between sections is a handover: the section in front starts its
  // exit, the page holds long enough for it to be seen, then glides while the
  // next section plays in, so the two overlap on one timeline.
  function handOver(next) {
    const { to, from, into } = next;
    if (!from || !into || from === into) {
      glide(to);
      return;
    }
    const back = getY();
    tell(from, 'project-leave');
    stop();
    turn = { to, direction: Math.sign(to - back), from, into, back };
    turn.hold = setTimeout(() => {
      tell(into, 'project-arrive');
      glide(to, from, into, back);
    }, PROJECT_HOLD_MS);
  }
```

2. **The hero's exit is tuned to finish mid-glide.** Measured in headless Chrome (1280×770, 1440×860, 1920×1080), the title-side chain (`--out` 0–7) has 8 items, and the story chain has 8–10. Title side: 7 × 12 ms + 320 ms = **404 ms**. Story: 9 × 24 ms + 300 ms = **516 ms**. Both are fine while the glide carries the hero away, but they are too long to finish in place before a cut.

```css
/* styles.css:~1471 — current, title side leaving */
.handover-motion.is-leaving :is(.handover-out, .project-story .about-eyebrow > span, .about-title-line > *) { translate: 0 -105%; transition: translate .32s var(--ease-in-out) calc(var(--out, 0) * 12ms); }
/* styles.css:~1474 — current, links leaving */
.handover-motion.is-leaving .project-sheet-actions .button { translate: 0 -105%; transition: translate .32s var(--ease-in-out) calc(var(--out, 0) * 12ms), transform var(--press-out) var(--ease-out), opacity var(--press-out) var(--ease-out); }
/* styles.css:~1480 — current, story leaving */
.handover-motion.is-leaving .project-story :is(.handover-out, .about-eyebrow > span) { opacity: 0; translate: 0 -10px; filter: blur(6px); transition: opacity .3s var(--ease-out) calc(var(--out, 0) * 24ms), translate .3s var(--ease-out) calc(var(--out, 0) * 24ms), filter .3s var(--ease-out) calc(var(--out, 0) * 24ms); }
```

How it works' exit already ends by 320 ms (`.how-motion.is-leaving .arch-sheet`, `.32s`), and the hero's title fill and rule end at .06 + .28 = 340 ms. These don't change.

The site's About page already solved the same thing (plan 008): exit, then an instant cut, then the entrance. This plan applies that model to the project page.

## Target

A wheel/trackpad turn between two sections is an **exit, then a cut, then an entrance**:

1. The section in front plays its exit in place (`project-leave`). Every exit piece has finished by **370 ms**.
2. At **380 ms** (`PROJECT_CUT_MS`), the page jumps to the next section's stop with `behavior: 'instant'` (the existing `setY`), and the next section gets `project-arrive` in the same task. Nothing slides: the emptied page is replaced by the next one, which plays its normal entrance where the last one stood.
3. A reverse flick **before** the cut cancels it and hands the page straight back: the leaving section gets `project-arrive`, the other gets `project-leave`, and the page never moves. After the cut, a reverse flick is simply a new turn.
4. Scrolling inside a section taller than the window (the `glide(to)` path with no `from`/`into`, and the `edge` stops) is unchanged. So are touch (CSS scroll-snap), keys and the scrollbar.

The existing IntersectionObservers do the rest unchanged. After the cut down, the hero is fully off screen and stays `is-leaving`, and How it works reaches `shownOf` = 1 and `enter()` redraws it. After the cut up, the hero is rising and `arrive()` removes `is-leaving`, while How it works drops to 0 and `reset()` clears it.

The compressed hero exit keeps its existing curves (`--ease-in-out: cubic-bezier(.77, 0, .175, 1)` for the lift, `--ease-out: cubic-bezier(.23, 1, .32, 1)` for the story dissolve). Only the durations and stagger shrink:

- **Title side lift:** `.32s` → `.28s`, still 12 ms apart. Last piece ends at 7 × 12 + 280 = **364 ms**.
- **Story dissolve:** `.3s` → `.24s`, 24 ms → **14 ms** apart. With 10 lines the last one ends at 9 × 14 + 240 = **366 ms**.

The **return** transitions (the rules without `.is-leaving`) are **not** changed. On the way back up, the title side drops back down through its clips (`.5s`, reversed chain). The story re-forms by un-blurring and settling 10 px in reading order, starting 120 ms later. Once the glide no longer carries the hero, that contrast (plan 013) is what the user sees, which also covers their request that the story animate differently from the NEXT STEP title.

```js
/* target — script.js, constants (replace the three lines at ~2724-2726) */
// Scrolling within a section taller than the window still glides, on
// Malvah's Lenis curve (expo out).
const projectTurnEase = t => Math.min(1, 1.001 - Math.pow(2, -10 * t));
const PROJECT_TURN_MS = 1100;
// A turn between sections cuts once the leaving section's exit has cleared
// (every exit piece ends by 370ms).
const PROJECT_CUT_MS = 380;
```

```js
/* target — script.js, glide inside initProjectPaging: drop the unused pair */
  function glide(to) {
    const origin = getY();
    stop();
    if (Math.abs(to - origin) < 1) return;
    turn = { to, direction: Math.sign(to - origin), last: origin, start: performance.now() };
    const step = (now) => {
      // Anything else moving the page (the scrollbar, a key) takes it back.
      if (Math.abs(getY() - turn.last) > 2) {
        turn = null;
        return;
      }
      // A frame can be stamped a moment before the glide began.
      const t = Math.min(1, Math.max(0, (now - turn.start) / PROJECT_TURN_MS));
      setY(Math.round(origin + (to - origin) * projectTurnEase(t)));
      turn.last = getY();
      if (t < 1) turn.frame = requestAnimationFrame(step);
      else turn = null;
    };
    turn.frame = requestAnimationFrame(step);
  }
```

```js
/* target — script.js, handOver inside initProjectPaging */
  // A turn between sections is a page transition, not a journey: the section
  // in front plays its exit where it stands, and once that has cleared the
  // page cuts to the next section, which plays its entrance in the same
  // place. Nothing slides past.
  function handOver(next) {
    const { to, from, into } = next;
    if (!from || !into || from === into) {
      glide(to);
      return;
    }
    tell(from, 'project-leave');
    stop();
    turn = { direction: Math.sign(to - getY()), from, into };
    turn.hold = setTimeout(() => {
      turn = null;
      setY(to);
      tell(into, 'project-arrive');
    }, PROJECT_CUT_MS);
  }
```

```js
/* target — script.js, the `if (turn)` branch of the wheel listener */
    if (turn) {
      event.preventDefault();
      // Turning back before the cut hands the page straight back; it has
      // not moved, so only the sections change.
      if (fresh && direction !== turn.direction && turn.into) {
        gesture.spent = true;
        const { from, into } = turn;
        stop();
        tell(into, 'project-leave');
        tell(from, 'project-arrive');
      }
      return;
    }
```

```css
/* target — styles.css, the three leaving rules */
.handover-motion.is-leaving :is(.handover-out, .project-story .about-eyebrow > span, .about-title-line > *) { translate: 0 -105%; transition: translate .28s var(--ease-in-out) calc(var(--out, 0) * 12ms); }
.handover-motion.is-leaving .project-sheet-actions .button { translate: 0 -105%; transition: translate .28s var(--ease-in-out) calc(var(--out, 0) * 12ms), transform var(--press-out) var(--ease-out), opacity var(--press-out) var(--ease-out); }
.handover-motion.is-leaving .project-story :is(.handover-out, .about-eyebrow > span) { opacity: 0; translate: 0 -10px; filter: blur(6px); transition: opacity .24s var(--ease-out) calc(var(--out, 0) * 14ms), translate .24s var(--ease-out) calc(var(--out, 0) * 14ms), filter .24s var(--ease-out) calc(var(--out, 0) * 14ms); }
```

## Repo conventions to follow

- `setY` inside `initProjectPaging` already scrolls with `behavior: 'instant'`, for both the window and the sheet's dialog. Use it for the cut; don't call `scrollTo` directly.
- The About page's equivalent is plan 008 (`plans/008-meet-experience-page-swap.md`): hold for the exit, then `window.scrollTo({ top: to, behavior: 'instant' })`. Mirror its intent, not its code. The project page has its own paging.
- Easing tokens are in `styles.css:54-55` (`--ease-out`, `--ease-in-out`). Keep using them; don't add raw curves.
- Comments are full sentences explaining *why*, in the voice of the surrounding ones.

## Steps

1. **`script.js`, constants (~line 2721-2726).** Replace `const PROJECT_HOLD_MS = 160;` with the `PROJECT_CUT_MS` block from Target. Update the comment block above `projectTurnEase` ("A project page turns a screen at a time. One flick of the wheel or trackpad glides to the next section…"). It should now say that one flick turns to the next section by exit, cut and entrance, with the page never sliding. The rest of that flick's momentum is still spent on the turn. A section taller than the window still scrolls natively to its edge. Touch keeps its snap and keys stay native.
2. **`script.js`, `glide`.** Replace it with the Target version. Its signature loses `from, into, back`, and `turn` no longer stores them. Also delete the comment directly above it ("`from` and `into` are the sections the glide leaves and lands on…").
3. **`script.js`, `handOver`.** Replace it and the comment above it with the Target version.
4. **`script.js`, wheel listener's `if (turn) { … }` branch.** Replace it with the Target version. It no longer calls `glide(back, into, from)`.
5. **`styles.css`, "The handover." block (~line 1459-1480).** Replace the three `.is-leaving` rules with the Target CSS. In the story comment right above the story rules ("The story dissolves instead of lifting: each line softens and fades up 10px in reading order, 24ms apart…"), change `24ms apart` to `14ms apart`.
6. **`styles.css`, the comment above `.how-motion.is-leaving .arch-sheet`** ("It leaves on the hero's own exit curve, so it is still in view as the hero starts back down, and the page never sits empty between them."). Replace it with: "It leaves on the hero's own exit curve and clears before the page cuts back to the hero."
7. `grep -n "PROJECT_HOLD_MS\|turn.back" script.js` must return nothing.

## Boundaries

- Do NOT touch the return (non-`.is-leaving`) transitions, the How it works entrance/drawing rules, `splitProjectLines` or `orderProjectHandover`.
- Do NOT change the touch path (`@media (pointer: coarse)` scroll-snap), key handling, or the `edge` logic in `destination`.
- Do NOT touch About / index.html / projects.html code.
- Do NOT change markup.
- Another Claude session has been editing this area. If the current excerpts don't match the code you find, STOP and report instead of improvising.

## Verification

- **Mechanical**: `node --check script.js` exits 0. The Step 7 grep returns nothing.
- **Feel check**: serve the site (`python3 -m http.server 8765` from the repo root), open `http://localhost:8765/projects/next_step.html`, let the entrance finish, then use a wheel/trackpad:
  - **Down:** the hero empties in place. The title side lifts out through its top edges while the story dissolves beside it. Then How it works appears where the hero was: its eyebrow rises, its sheet slides up and the figure draws. The page never visibly scrolls, and the sticky bar and backdrop grain stay still.
  - **Up:** How it works drops out in place, then the hero returns in place. The title falls back in through its clips and, a beat later, the story un-blurs line by line. The two columns clearly move differently.
  - Nothing from the old section is still visible on the frame after the cut. In DevTools' Animations panel at 10%, every exit piece has ended before the scroll position changes.
  - Flick hard: exactly one turn per flick, and trailing momentum does nothing.
  - Flick down, then immediately flick up (within ~300 ms): the page never moves and the hero comes straight back.
  - Open NextStep as a sheet from `projects.html` (card click) and repeat. The dialog scroller cuts the same way.
  - A window shorter than the hero (e.g. 1280×600): scrolling inside the hero still glides to its edge, and the next flick cuts.
  - `prefers-reduced-motion: reduce`: the wheel listener returns early, so scrolling is native and nothing animates (unchanged).
- **Done when**: every wheel turn between the hero and How it works is exit → cut → entrance with no visible scrolling, in both directions, on the page and in the sheet.
