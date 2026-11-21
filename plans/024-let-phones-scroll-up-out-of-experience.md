# 024 — Let phones scroll up out of Experience instead of holding and cutting

- **Status**: SUPERSEDED. Josh, 2026-11-21: "make it aesthetic and premium, not just a scroll up". Phones keep the hold and cut, and the cut now plays a phone-only Meet Josh return (`.is-phone-return` in styles.css, set by Experience's leave callback in script.js).
- **Commit**: 65d0760
- **Severity**: HIGH
- **Category**: Purpose & frequency (page transition continuity, phones)
- **Estimated scope**: 1 file (`script.js`), ~6 lines

## Problem

On a phone, swiping up from Experience's first job feels awkward (Josh, 2026-11-21, on a phone). Here's why:

1. **Up holds and cuts.** Experience pins on phones (`styles.css:5591`, "Pinned, the stage holds the screen while the page steps through the jobs"), so its page-turn handler is live for touch. A swipe up on the first job adds `is-leaving`, holds the page 360 ms while Experience empties, then jumps to Meet Josh with `behavior: 'instant'`:

```js
/* script.js:4785-4796 — current */
const leaveTarget = (direction) =>
  {
    if(!coreJobStops.length || !section.classList.contains('is-entered') || section.classList.contains('is-leaving')) return;
    const y = window.scrollY;
    const edge = direction < 0 ? coreJobStops[0] : coreJobStops[coreJobStops.length - 1];
    if(Math.abs(y - edge) > 2) return;
    return direction < 0 ? pageStops().filter(top => top < y - 2).pop() : pageStops().find(top => top > y + 2);
  };
let exitTimer = 0;
// Up from the first job only ever cuts to Meet Josh, so a flick that
// cannot turn it yet (the cut's own momentum, one mid-exit) is spent here.
const still = direction => direction < 0 && coreJobStops.length > 0 && Math.abs(window.scrollY - coreJobStops[0]) <= 2;
```

2. **Meet Josh has no entrance on phones.** Meet Josh reads in ordinary page flow there (`--meet-flow: 1`, `styles.css:6179`), and its observer strips every motion class:

```js
/* script.js:4249-4255 — current */
// The phone story reads in ordinary page flow. Keep it visible
// while reading instead of playing an exit partway through.
if(meetFlows())
  {
    meet.classList.remove('is-away', 'is-leaving', 'is-returning');
    return;
  }
```

So after the 360 ms of emptying, a fully drawn Meet Josh appears in one frame. There's nothing to bridge the cut.

3. **The two directions disagree.** Going *down* from Meet Josh on a phone is an ordinary touch scroll: Meet Josh's own turn handler steps aside when it flows (`script.js:4293`, `if(meetFlows() || direction < 0 || …) return;`). Going *up* holds and cuts. The mobile design note (`design.md`, "Keep mobile page scrolling free of held exits") asks for the scroll.

## Target

At phone widths (whenever Meet Josh flows, i.e. `--meet-flow` on `.about-hero` is `1`), Experience never holds or cuts **upward**. A swipe (or wheel) up from the first job scrolls natively, and the page's existing `scroll-snap-type: y mandatory` (`html.about-paging`, `styles.css:4466-4469`) settles it on Meet Josh, exactly as going down already does.

Everything else stays as it is:

- Experience's own observer (`script.js:4752-4781`) still plays its exit as it scrolls away. It adds `is-leaving` once it's under 90 % on screen and shrinking, then resets when fully off screen. That's the same behaviour it already has when the page scrolls past it.
- **Down** from Experience's last job (to Education) is unchanged.
- **Desktop** (Meet Josh not flowing) is unchanged: up from the first job still holds 360 ms and cuts.

No new curves or durations. This plan removes a held exit; it doesn't add motion.

```js
/* target — script.js, inside the Experience motion block */
// Meet Josh reads in page flow on phones, and the turn down to it is a plain
// scroll there, so the turn back up is one too: no hold, no cut.
const meetFlows = () => getComputedStyle(meet).getPropertyValue('--meet-flow').trim() === '1';
const leaveTarget = (direction) =>
  {
    if(!coreJobStops.length || !section.classList.contains('is-entered') || section.classList.contains('is-leaving')) return;
    if(direction < 0 && meet && meetFlows()) return;
    const y = window.scrollY;
    const edge = direction < 0 ? coreJobStops[0] : coreJobStops[coreJobStops.length - 1];
    if(Math.abs(y - edge) > 2) return;
    return direction < 0 ? pageStops().filter(top => top < y - 2).pop() : pageStops().find(top => top > y + 2);
  };
let exitTimer = 0;
// Up from the first job only ever cuts to Meet Josh, so a flick that
// cannot turn it yet (the cut's own momentum, one mid-exit) is spent here.
// Not on phones, where that gesture is an ordinary scroll.
const still = direction => direction < 0 && !(meet && meetFlows()) && coreJobStops.length > 0 && Math.abs(window.scrollY - coreJobStops[0]) <= 2;
```

## Repo conventions to follow

- The flow check already exists in Meet Josh's block. Copy it exactly, don't invent another breakpoint test: `script.js:4239` `const meetFlows = () => getComputedStyle(meet).getPropertyValue('--meet-flow').trim() === '1';`. It reads the CSS flag, so CSS stays the single source of the phone breakpoint.
- Meet Josh's own handler is the exemplar for stepping aside: `script.js:4293` returns `undefined` from its target function when `meetFlows()` is true, and its `still` guard starts with `!meetFlows()` (`script.js:4315`).
- Comments in this file are plain sentences in Josh's voice, placed above the line they explain.

## Steps

1. In `script.js`, inside the Experience motion block (it starts `const section = core.closest('.core-section');`, `script.js:4735`), find the element: directly above `const leaveTarget = (direction) =>` (`script.js:4785`), add:

```js
            // Meet Josh reads in page flow on phones, and the turn down to it is a
            // plain scroll there, so the turn back up is one too: no hold, no cut.
            const meet = document.querySelector('#about .about-hero');
            const meetFlows = () => getComputedStyle(meet).getPropertyValue('--meet-flow').trim() === '1';
```

   Use these names. `meet` and `meetFlows` are declared with `const` inside a different block (`script.js:4238-4239`), so they don't clash. If the linter or a run reports a redeclaration in the same scope, STOP and report.

2. In `leaveTarget`, directly after its first `if(…) return;` line, add:

```js
                if(direction < 0 && meet && meetFlows()) return;
```

3. Replace the `still` line (`script.js:4796`) and the comment above it with:

```js
            // Up from the first job only ever cuts to Meet Josh, so a flick that
            // cannot turn it yet (the cut's own momentum, one mid-exit) is spent here.
            // Not on phones, where that gesture is an ordinary scroll.
            const still = direction => direction < 0 && !(meet && meetFlows()) && coreJobStops.length > 0 && Math.abs(window.scrollY - coreJobStops[0]) <= 2;
```

Nothing else changes.

## Boundaries

- Do NOT touch `styles.css`, `index.html`, or Meet Josh's own block (`script.js:4230-4316`).
- Do NOT change the downward turn from the last job, the 360 ms / 320 ms timers, or the `cut` logic inside the `leave` callback.
- Do NOT change `holdPageTurns` itself (`script.js:1820`).
- Do NOT add a phone entrance to Meet Josh; it reads in flow by design.
- If any excerpt above doesn't match the code you find (drift since commit 65d0760), STOP and report instead of improvising.

## Verification

- **Mechanical**: `node --check script.js` prints nothing (exit 0).
- **Feel check, phone** (a real iPhone in Safari is best; headed Playwright WebKit with an iPhone viewport and `hasTouch` is the fallback; per the project notes, don't run `playwright install`):
  - Open the site, turn to About, scroll down into Experience, and land on the first job.
  - Swipe up. The page moves with your finger at once: there's no 360 ms freeze and no jump.
  - Experience's card, jobs and heading play their exit as it scrolls away, and the page settles on Meet Josh with the photo, title and story already drawn. It should feel exactly like the swipe down did, in reverse.
  - Swipe down again from Meet Josh: still a plain scroll into Experience, whose entrance plays as before.
  - Swiping between jobs inside Experience is unchanged.
- **Feel check, desktop** (wider than 700px): on Experience's first job, one wheel flick up still holds about a third of a second while Experience empties, then cuts to Meet Josh, which plays its entrance with the title sweeping from the right. Nothing changed here.
- **Reduced motion**: with `prefers-reduced-motion: reduce`, the Experience motion block never runs, so behaviour is unchanged.
- **Done when**: on a phone, swiping up from the first job scrolls natively to Meet Josh with no hold and no pop-in, and desktop behaviour is identical to before.
