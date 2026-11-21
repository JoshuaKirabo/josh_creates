# 018 — Open a project as Projects' exit, then the sheet's entrance

- **Status**: DONE (uncommitted)
- **Commit**: 1dd054f (plus the uncommitted 012–017 work in the working tree)
- **Severity**: HIGH
- **Category**: Missed opportunity / Cohesion / Physicality
- **Estimated scope**: 2 files (`script.js` ~35 lines, `styles.css` ~16 lines)

## Problem

Clicking a Projects card opens the NextStep sheet. Recorded in headless Chrome at 1440×860 (prefetched): the Projects screen goes 1.00 → 0.30 opacity within ~50 ms of the click and is gone by ~250 ms, while the sheet fades in on the same frame (`open()`: 240 ms `cubic-bezier(.23, 1, .32, 1)`; `styles.css:1295`: `body > …` `opacity .24s`). The title, cards and top bar don't move; they just crossfade away. Then the hero's NEXT STEP outline, eyebrow and Back button are fully drawn on the first frame, and nothing moves until the fill starts at ~400 ms. The user: "the animation when you click on a project card into a project … they are non existent". Every other transition on the site is now exit → cut → entrance (plans 008, 014, 016, 017).

```js
/* script.js:~3009 — current open(), inside initProjectSheet */
  async function open(link, fromHistory = false) {
    let content;
    try {
      content = await load(link.href);
    } catch { location.href = link.href; return; }
    if (!fromHistory) history.pushState({ projectSheet: link.href }, '', link.href);
    sheet.querySelector('.project-sheet-content').replaceWith(document.importNode(content, true));
    fade?.cancel();
    clearTimeout(reveal);
    if (!reducedMotion.matches) projects?.classList.remove('projects-entered');
    document.documentElement.classList.add('project-sheet-open');
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
    stopHero();
    stopHero = playProjectHero(sheet);
    fade = sheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.23, 1, .32, 1)' });
  }
```

## Target

**1. Projects leaves first (0–320 ms), while the page loads in parallel.** On click, `html` gets `projects-leaving` and `nav-leave`, and the clicked card gets `is-opening`:
- **Title lines:** lift `.35em` and fade. `.28s var(--ease-in-out)` (`cubic-bezier(.77, 0, .175, 1)`), the strong line `.04s` later. The eyebrow rule shrinks to the right.
- **Other cards:** slide on `-2.5rem` (continuing the way they came in from the right) and fade. `.28s var(--ease-in-out)`, delay `.04s`.
- **Clicked card:** stays in place, its border brightens to `rgba(255,255,255,.6)` over `.15s`, then it fades `.2s var(--ease-in-out)` at `.12s`, so it's the last thing to go (ends 320 ms).
- **Top bar contents:** the mirror of plan 017. The wordmark and links lift `-.75rem` and fade, `.24s var(--ease-in-out)`, `15ms` apart. The current link's underline shrinks to the right. The bar's background and gradient are untouched.

**2. The sheet opens after `max(load, 320 ms)`,** via the existing `open()` body. About 260 ms later (once the page's own `.24s` fade has hidden it), the leaving classes come off, leaving Projects in its reset, un-entered state for plan 016's return.

**3. The hero enters with motion on its first frame:**
- The title lines drop in through their existing top-edge clips (the handover's clip): `translate: 0 -105%` → rest, `.7s var(--ease-out-quart)` (`cubic-bezier(.25, 1, .5, 1)`), 80 ms apart by `--line`. The fill runs over them as before.
- "Back to projects" rises with the existing `project-sheet-rise` (`opacity 0, translateY(14px)`), `.8s cubic-bezier(.215, .61, .355, 1)`, delay `.15s`.

**Other cases:**
- Reduced motion: no exit and no entrance additions. It opens at once, as now.
- A second click during the exit is ignored.
- Closing within 260 ms of opening clears the leaving state first (`showProjects` calls `restProjects`).

```css
/* target — styles.css, after the `nav-return-line` keyframes (plan 017) */
/* Opening a project plays Projects out first: the title lifts, the cards
   slide on to the left and the chosen one brightens and goes last, and the
   top bar's links lift out, before the sheet cuts in. Script adds these
   classes only when motion is allowed. */
html.projects-leaving .projects-main :is(.projects-title-line, .project-card) { opacity: 0; transition: opacity .28s var(--ease-in-out), transform .28s var(--ease-in-out); }
html.projects-leaving .projects-main .projects-title-line { transform: translateY(-.35em); }
html.projects-leaving .projects-main .projects-title-strong { transition-delay: .04s; }
html.projects-leaving .projects-main .project-card { transform: translateX(-2.5rem); transition-delay: .04s; }
html.projects-leaving .projects-main .project-card.is-opening { transform: none; transition: opacity .2s var(--ease-in-out) .12s; }
html.projects-leaving .projects-main .project-card.is-opening .project-link { border-color: rgba(255, 255, 255, .6); transition-duration: .15s; }
html.projects-leaving .projects-main .projects-rule::after { transform: scaleX(0); transform-origin: right; transition: transform .28s var(--ease-in-out); }
html.nav-leave .about-topbar :is(.topbar-wordmark, .section-nav > *) { animation: nav-leave .24s var(--ease-in-out) calc(var(--nav-i, 0) * 15ms) both; }
html.nav-leave .about-topbar .section-nav-link[aria-current]::before { transform-origin: right; animation: nav-leave-line .24s var(--ease-in-out) both; }
@keyframes nav-leave { to { opacity: 0; translate: 0 -.75rem; } }
@keyframes nav-leave-line { to { transform: scaleX(0); } }
```

```css
/* target — styles.css, after `.project-sheet.is-playing .project-sheet-rise { … }` (~line 1429) */
/* The title drops in through its lines' top edges as the fill starts, so
   the page moves from its first frame, and the way back rises with it. */
.project-sheet.is-playing .handover-motion .about-title-line > * { animation: project-sheet-drop .7s var(--ease-out-quart) calc(var(--line, 0) * 80ms) both; }
.project-sheet.is-playing .project-sheet-back { animation: project-sheet-rise .8s cubic-bezier(.215, .61, .355, 1) .15s both; }
@keyframes project-sheet-drop { from { translate: 0 -105%; } }
```

Specificity: `html.projects-leaving .projects-main .project-card` is (0,3,1). It beats `.projects-entered .project-card:nth-child(n)` (0,3,0) and `.projects-pinned:not(.projects-entered) .project-card` (0,3,0).

```js
/* target — script.js, inside initProjectSheet, after showProjects */
  let opening = null;
  let rest = 0;
  // Projects leaves before a project opens over it: the title lifts, the
  // cards slide on and the chosen one goes last, and the top bar's links
  // lift out. Resolves once it has cleared.
  function leaveProjects(link) {
    if (reducedMotion.matches || sheet.open) return Promise.resolve();
    const root = document.documentElement;
    clearTimeout(navDone);
    clearTimeout(rest);
    root.classList.remove('nav-return');
    link.closest('.project-card')?.classList.add('is-opening');
    root.classList.add('projects-leaving', 'nav-leave');
    return new Promise((resolve) => setTimeout(resolve, 320));
  }
  // Once the sheet covers it, Projects drops its exit and waits, reset.
  function restProjects() {
    clearTimeout(rest);
    document.documentElement.classList.remove('projects-leaving', 'nav-leave');
    projects?.querySelectorAll('.is-opening').forEach((card) => card.classList.remove('is-opening'));
  }
```

`open()` becomes:

```js
  async function open(link, fromHistory = false) {
    if (opening === link.href) return;
    opening = link.href;
    let content;
    try {
      [content] = await Promise.all([load(link.href), leaveProjects(link)]);
    } catch {
      // file://, offline or a missing page: go to the page instead.
      location.href = link.href;
      return;
    } finally {
      opening = null;
    }
    … unchanged through `fade = sheet.animate(…)` …
    rest = setTimeout(restProjects, 260);
  }
```

`showProjects` calls `restProjects()` as its first line.

## Steps

1. Add both CSS blocks.
2. In `initProjectSheet`: add `leaveProjects` and `restProjects` after `showProjects`, call `restProjects()` at the top of `showProjects`, and change `open()` as shown. `navDone` is declared before `showProjects` (plan 017), so `leaveProjects` can use it.
3. Bump `styles.css?v=` and `script.js?v=` in the four HTML files.

## Boundaries

- Do NOT change `.about-topbar` or its gradient, plans 016/017's close path, or the standalone page.
- Reduced motion behaviour must stay the same as today.

## Verification

- `node --check script.js`.
- On `projects.html` (hover a card first), click it:
  - The title lifts, the other cards slide left, the clicked card brightens and leaves last, and the nav links lift out left to right. All gone by ~320 ms.
  - The sheet appears, the NEXT STEP lines drop in through their top edges as the fill runs, and Back rises.
  - Close: plan 016/017's return still plays in full. Open again: same as the first time.
  - Double-click a card: one open only.
- Reduced motion: opens immediately, with no exit.
