# 007 — Reset Education when its held turn lands

- **Status**: DONE (uncommitted)
- **Commit**: ac07bee (plus the uncommitted Education `is-leaving` / `is-resuming` exit in the working tree)
- **Severity**: HIGH
- **Category**: Interruptibility
- **Estimated scope**: 1 file (`script.js`), ~10 lines

## Problem

If you turn down from Education to Projects and then scroll back up, Education comes back **empty**: no heading fill, no rule, both sheets at `opacity: 0`. It stays empty until Education leaves the screen completely and returns.

Reproduced in headless Chrome with real wheel input (the probe below). After the held turn to the first Projects card, a smooth scroll back to Education's stop:

```
== held turn down to Projects
{"y":7520,"cls":"about-block edu-section edu-motion is-entered is-leaving"}
== smooth scroll back up to Education
t     scrollY  eduTop  classes                sheet opacity@translateY
23    7520     -760    is-entered is-leaving  0.00@-12.0 0.00@-12.0
...
466   6765     -5      is-entered is-leaving  0.00@-12.0 0.00@-12.0   ← back at rest, still hidden
```

Chain of events:

1. At the first Projects card (`scrollY` 7520 on a 1485×812 window), the bottom 52px of Education (its empty footer padding) is still on screen. The observer therefore never reports `!entry.isIntersecting`, which is the only branch that resets `turning`, `is-entered` and `is-leaving`.
2. The held turn set `turning = true`. Its only other reset is the hand-back timer, which acts only when the page is still at Education's `edge`. After a successful turn it isn't, so **`turning` stays `true`**.
3. Scrolling back, the observer sees `leaving && rising`, but `!turning` fails, so `is-leaving` is never taken off. `!entered` is also false, so the entrance can't replay either. The sheets stay at their exit pose.
4. While `is-leaving` is set, the hold's target also refuses (`education.classList.contains('is-leaving')`), so the next flick doesn't get a held exit either.

The upward turn to Experience is unaffected: at Experience's last stop, Education is fully off screen and the reset branch runs.

```js
/* script.js:1455-1467 — current (observer) */
      if (!entry.isIntersecting) {
        turning = false;
        education.classList.remove('is-entered', 'is-leaving', 'is-resuming');
        education.style.setProperty('--edu-from', entry.boundingClientRect.top < 0 ? '-16px' : '16px');
      } else if (!entered && entry.intersectionRatio >= .35) {
        education.classList.add('is-entered');
      } else if (entered && !leaving && !rising && now < .9) {
        exitToward(entry.boundingClientRect.top < 0 ? 1 : -1);
        education.classList.add('is-leaving');
      } else if (leaving && rising && !turning) {
        education.classList.replace('is-leaving', 'is-resuming');
      }
```

```js
/* script.js:1484-1498 — current (held turn) */
    }, (to, edge) => {
      turning = true;
      exitToward(to > edge ? 1 : -1);
      education.classList.add('is-leaving');
      clearTimeout(exitTimer);
      exitTimer = setTimeout(() => {
        window.scrollTo({ top: to, behavior: 'smooth' });
        // A turn that never got away hands Education back.
        exitTimer = setTimeout(() => {
          if (Math.abs(window.scrollY - edge) > 2) return;
          turning = false;
          education.classList.replace('is-leaving', 'is-resuming');
        }, 1200);
      }, 320);
    }, { fresh: true });
```

## Target

When the held turn has landed, Education resets exactly as if it had left the screen. The next arrival, from either side, then plays the full entrance (rule draws, heading fills, sheets settle, ink wipes in), with the sheets coming from the side you return from. Coming back from Projects, that is from above (`--edu-from: -16px`).

The reset is invisible. At landing, everything it touches is already at its exit pose (sheets at `opacity: 0`, heading empty, rule drawn back), and the ink/logo `clip-path` snaps back inside sheets that can't be seen. Only the 52px of empty padding is on screen.

Keep the existing timings. Exit and entrance values don't change; this is state bookkeeping only.

## Repo conventions to follow

- The off-screen reset branch of the same observer (`script.js:1455-1458`) is the exemplar: `turning = false`, remove `is-entered`, `is-leaving`, `is-resuming`, and set `--edu-from`. Reuse it through one small local function rather than duplicating the three lines.
- The comment style is plain full sentences above the line they explain, with no JSDoc. Match it.

## Steps

1. In `script.js`, inside the `if (education && ...)` block, just after `let turning = false;`, add a reset helper and use it in the observer's first branch:

   ```js
   // Gone: ready to arrive again from the side it will come back from.
   const reset = (above) => {
     turning = false;
     education.classList.remove('is-entered', 'is-leaving', 'is-resuming');
     education.style.setProperty('--edu-from', above ? '-16px' : '16px');
   };
   ```

   and change the observer's first branch to:

   ```js
      if (!entry.isIntersecting) {
        reset(entry.boundingClientRect.top < 0);
      } else if ...
   ```

2. Replace the inner hand-back timer in the held turn with one that handles all three outcomes:

   ```js
        exitTimer = setTimeout(() => {
          // Landed on the next page: a strip of Education can still show
          // there, so it resets now rather than waiting to leave the screen.
          if (Math.abs(window.scrollY - to) <= 2) reset(to > edge);
          // A turn that never got away hands Education back.
          else if (Math.abs(window.scrollY - edge) <= 2) {
            turning = false;
            education.classList.replace('is-leaving', 'is-resuming');
          } else turning = false;
        }, 1200);
   ```

   Leave the outer `setTimeout(..., 320)` and the `window.scrollTo({ top: to, behavior: 'smooth' })` as they are.

3. Update the block's leading comment (`script.js:1437-1439`) only if it no longer describes the behaviour. It currently says Education "resets once it has left the screen entirely". Add: "or once a held turn has landed".

## Boundaries

- Do NOT touch `styles.css`. No timing, easing or property changes.
- Do NOT touch Experience's or Meet Josh's hold code, or `holdPageTurns` itself.
- Do NOT touch `projects.html` (standing instruction: leave it alone while About is reworked).
- Do NOT add dependencies or change markup.
- If the code at the cited lines doesn't match the excerpts above, STOP and report instead of improvising.

## Verification

- **Mechanical**: `node --check script.js` prints nothing. `node --test tests/section-scroll.test.cjs` gives 43 passing, 0 failing.
- **Probe**: serve the site (`python3 -m http.server 8765` from the repo root) and run a headless probe built on `plans/006-meet-probe.mjs`'s CDP harness. Load `about_me.html`, `scrollTo` 6760 (Education's stop at 1485×812), wait 3.5s, send one downward flick, wait 2.5s, then `scrollTo({ top: 6760, behavior: 'smooth' })`, logging `.edu-section` classes and each `.edu-sheet`'s opacity per frame.
  - After the flick, `scrollY` is 7520 and the class list is `about-block edu-section edu-motion` (no `is-entered`, `is-leaving` or `is-resuming`).
  - On the way back, `is-entered` returns once 35% is visible, and both sheets climb to `opacity: 1` from a negative translateY (from above). The first sheet starts about 0.35s in, the second about 0.5s in.
  - Note: headless synthetic wheel input can't cross a `scroll-snap-type: y mandatory` stop on its own, so use `scrollTo` for the return. That is a harness limit; it happens without this change too.
- **Feel check** (real browser, trackpad and a phone):
  - Education → flick down → Projects → flick up: the heading fills again, the sheets settle down from above, and the Grand Canyon title inks in from the left. It is never blank.
  - Education → flick down, then flick straight back up while the page is still turning: Education is back and readable within about 0.3s (the `is-resuming` path). No 1–2s stall.
  - Education → flick up → Experience → flick down: unchanged, with the sheets rising from below.
  - In DevTools, set Animations playback to 10% and confirm the landing reset produces no visible pop in the 52px strip at the top of the first Projects card.
  - With `prefers-reduced-motion: reduce` set before loading, Education is static and page turns behave as before (`.edu-motion` is never added).
- **Done when**: every Education visit after a downward turn to Projects shows the full entrance, and the probe log shows the classes cleared at 7520.
