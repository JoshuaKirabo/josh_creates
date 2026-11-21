# 016 — Make "Back to projects" an exit, then Projects' entrance

- **Status**: DONE (uncommitted)
- **Commit**: 1dd054f (plus the uncommitted 012–015 work in the working tree)
- **Severity**: HIGH
- **Category**: Purpose & frequency / Cohesion (page transition)
- **Estimated scope**: 1 file (`script.js`, ~30 lines)

## Problem

Closing the project sheet (Back to projects, Escape, browser back) is meant to be the same exit → entrance rhythm the page turns use. Instead:

1. **The exit is hidden.** `dismiss()` starts the hero's exit and a 200 ms `--ease-out` fade of the whole sheet on the same frame. The fade is ~80% done by 100 ms, but the hero's lift needs ~364 ms.
2. **The wrong section exits.** `leaveProjectHero` always targets the hero. Closed from How it works, the hero is off screen and the diagram just fades.
3. **An empty gap, then a flat fade.** `project-sheet-open` is removed only in `closed()`, after the fade. The screen shows only grain, then Projects fades in (.24s, `styles.css:1295`) with its title and cards already in place, because `projects-entered` was never cleared.

```js
/* script.js:~2893-2898 — current */
// Leaving the project page plays the hero's exit on the way out.
function leaveProjectHero(sheet) {
  if (reducedMotion.matches) return;
  sheet.classList.remove('is-playing');
  sheet.querySelector('.project-sheet-hero')?.classList.add('is-leaving');
}
```

```js
/* script.js:~3007-3027 — current, inside initProjectSheet */
  function dismiss() {
    if (!sheet.open) return;
    fade?.cancel();
    // A hidden tab never finishes the fade, so it closes at once.
    if (document.hidden) {
      closed();
      return;
    }
    stopHero();
    leaveProjectHero(sheet);
    fade = sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'forwards' });
    fade.onfinish = closed;
  }

  // The close event can wait on the next frame, so the page is released here.
  function closed() {
    if (sheet.open) sheet.close();
    fade?.cancel();
    fade = null;
    stopHero();
    stopHero = () => {};
    sheet.classList.remove('is-playing');
    document.documentElement.classList.remove('project-sheet-open');
  }
```

## Target

1. **The exit plays from the section on screen.** Rename `leaveProjectHero` to `leaveProjectPage`. It finds the `.project-sheet-content > *` section that crosses the middle of the window. If that's the hero, it adds `is-leaving`, as now. Otherwise it dispatches `project-leave`, and How it works sinks out through its soft edge (.32s `--ease-in-out`, plan 015). It must run **before** `stopHero()`, because `stopHero` removes the hero's listeners.
2. **The sheet waits for the exit, then fades.** Fade: opacity 1→0, **200 ms**, `cubic-bezier(.23, 1, .32, 1)` (`--ease-out`), **delay 180 ms**, `fill: 'forwards'`.
3. **Projects comes back in under it.** At **180 ms** (when the sheet's fade starts), a timer removes `project-sheet-open`, so Projects' .24s fade-in overlaps the sheet's fade-out with no empty gap. The same timer re-adds `projects-entered` to `.projects-main`. That replays Projects' own entrance: title lines rise .35em, cards slide 2.5rem, .9s `--ease-out`, staggered .2 / .28 / .36 s (`styles.css:681-687`, unchanged).
4. **Projects is reset while the sheet covers it.** In `open()`, when motion is allowed, remove `projects-entered` from `.projects-main`. The page is at opacity 0 under the sheet, so the reset is never seen.
5. `closed()` still removes `project-sheet-open`, and also ensures `projects-entered` is back. That covers the hidden-tab path and a close that skips `dismiss`. `open()` clears the pending timer, so reopening mid-close cannot un-hide Projects.
6. **The standalone page** (`initProjectPage`) keeps its 140 ms / 260 ms timing and uses `leaveProjectPage`. Its `pageshow` restore removes `is-leaving` from every section, not just the hero.

```js
/* target — script.js, replacing leaveProjectHero */
// Leaving the project page plays the exit of whichever section is on screen:
// the hero's lines lift out, How it works sinks back through its edge.
function leaveProjectPage(sheet) {
  if (reducedMotion.matches) return;
  sheet.classList.remove('is-playing');
  const middle = window.innerHeight / 2;
  const sections = [...sheet.querySelectorAll('.project-sheet-content > *')];
  const shown = sections.find((el) => {
    const box = el.getBoundingClientRect();
    return box.top <= middle && box.bottom > middle;
  }) || sections[0];
  if (shown?.matches('.project-sheet-hero')) shown.classList.add('is-leaving');
  else shown?.dispatchEvent(new CustomEvent('project-leave'));
}
```

```js
/* target — script.js, inside initProjectSheet */
  const projects = document.querySelector('.projects-main');
  let reveal = 0;
  // Projects plays its entrance again as the sheet clears.
  const showProjects = () => {
    clearTimeout(reveal);
    document.documentElement.classList.remove('project-sheet-open');
    projects?.classList.add('projects-entered');
  };

  // in open(), right after `fade?.cancel();`
    clearTimeout(reveal);
    // Projects waits under the sheet, reset, to play its entrance on the way back.
    if (!reducedMotion.matches) projects?.classList.remove('projects-entered');

  function dismiss() {
    if (!sheet.open) return;
    fade?.cancel();
    // A hidden tab never finishes the fade, so it closes at once.
    if (document.hidden) {
      closed();
      return;
    }
    // The section on screen plays its exit first; the sheet fades once most of
    // it has gone, and Projects starts back in underneath as it does.
    leaveProjectPage(sheet);
    stopHero();
    reveal = setTimeout(showProjects, 180);
    fade = sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 180, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'forwards' });
    fade.onfinish = closed;
  }

  function closed() {
    if (sheet.open) sheet.close();
    fade?.cancel();
    fade = null;
    stopHero();
    stopHero = () => {};
    sheet.classList.remove('is-playing');
    showProjects();
  }
```

## Repo conventions to follow

- WAAPI fades with inline curves, as the existing `open()` / `dismiss()` / `initProjectPage` code does (`script.js:2915`: `{ duration: 260, delay: 140, easing: 'cubic-bezier(.77, 0, .175, 1)', fill: 'forwards' }`).
- Sections receive turns through `project-leave` / `project-arrive` CustomEvents (`initProjectPaging`'s `tell`).
- Comments are full sentences explaining *why*.

## Steps

1. Replace `leaveProjectHero` and its comment with `leaveProjectPage`. Update both call sites.
2. In `initProjectPage`'s `pageshow` handler, replace the hero-only line with `page.querySelectorAll('.project-sheet-content > .is-leaving').forEach((el) => el.classList.remove('is-leaving'));`.
3. In `initProjectSheet`, add `projects`, `reveal` and `showProjects` after `let stopHero = () => {};`. Apply the `open()`, `dismiss()` and `closed()` changes.
4. Bump `script.js?v=` in `projects.html`, `projects/next_step.html`, `index.html` and `about_me.html` to one above the highest in use.

## Boundaries

- Do NOT change CSS, `initProjectsTrack`, or the page paging.
- Do NOT change the standalone page's 140 / 260 ms timing.
- If the excerpts don't match, STOP and report.

## Verification

- **Mechanical**: `node --check script.js`, and `grep -n leaveProjectHero script.js` returns nothing.
- **Feel check** on `projects.html` (click the NextStep card, let it settle):
  - Back from the hero: the title visibly lifts out and the story dissolves. The sheet starts fading at ~180 ms, and the Projects title and cards rise and slide back in beneath it. No empty frame in between.
  - Back from How it works: the diagram sinks through its soft edge, not the hero.
  - Escape and the browser back button behave identically.
  - Reopen the card immediately after closing: the sheet opens normally, and Projects replays its entrance on the next close.
  - Reduced motion: the sheet fades and Projects is just there.
- **Done when**: every close is exit → Projects entrance, with no blank gap.
