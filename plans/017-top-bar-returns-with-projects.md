# 017 — Bring the top bar back in with Projects when the sheet closes

- **Status**: DONE (uncommitted)
- **Commit**: 1dd054f (plus the uncommitted 012–016 work in the working tree)
- **Severity**: MEDIUM
- **Category**: Missed opportunity / Cohesion
- **Estimated scope**: 2 files (`script.js` ~8 lines, `styles.css` 3 rules + 2 keyframes)

## Problem

After plan 016, closing the project sheet replays Projects' entrance: the title rises and the cards slide in. The top bar (`.about-topbar`: the JOSH wordmark and the section links) only fades back in with the page (`styles.css:1295`, `opacity .24s`), so it sits still while everything below it moves. The user: "even the navbar needs a smooth animation. maybe the options of the navbar slide back in". They also said: "I actually like the gradient navbar on the projects screen. let's keep that gradient." So the bar's background (`rgba(6, 6, 6, .82)`) and its `::after` fade-out gradient (`styles.css:603-604`) must not change or animate separately. Only the bar's contents move.

## Target

When the sheet's close reveals Projects (plan 016's `showProjects`, 180 ms into the close):

- The **wordmark and each nav item drop in from above**: `opacity: 0; translate: 0 -.75rem` → rest, **.5s** `var(--ease-out)` (`cubic-bezier(.23, 1, .32, 1)`), **30 ms apart** in reading order (wordmark first), starting **60 ms** after the reveal. The last of 9 items ends at .06 + 8 × .03 + .5 = **0.8 s**, inside the cards' .9s entrance.
- The **current page's underline** (`.section-nav-link[aria-current]::before`) redraws from the left: `transform: scaleX(0)` → rest, .5s `var(--ease-out)`, delay **.35s**, so it lands as the Projects link settles.
- It's a one-shot keyframe animation keyed off `html.nav-return`, added by `showProjects` and removed after 1 s. It never touches the transitions already on these elements (hover/press colors). It uses the individual `translate` property, because `.topbar-wordmark span` already uses `transform`.
- `.section-nav` scrolls horizontally, so it clips its overflow, and links dropping in from above are revealed through its top edge. That's consistent with the site's clipped-line reveals.
- Skip under reduced motion (no class is added).

```css
/* target — styles.css, after the `html.project-sheet-open body > …` rule (~line 1296) */
/* Closing a project sheet brings the top bar back with Projects: the
   wordmark and each link drop in from above, 30ms apart, and the current
   page's line draws back on. Only the contents move; the bar and its
   gradient fade in with the page. Script adds .nav-return only when motion
   is allowed. */
html.nav-return .about-topbar :is(.topbar-wordmark, .section-nav > *) { animation: nav-return .5s var(--ease-out) calc(.06s + var(--nav-i, 0) * 30ms) both; }
html.nav-return .about-topbar .section-nav-link[aria-current]::before { animation: nav-return-line .5s var(--ease-out) .35s both; }
@keyframes nav-return { from { opacity: 0; translate: 0 -.75rem; } }
@keyframes nav-return-line { from { transform: scaleX(0); } }
```

```js
/* target — script.js, inside initProjectSheet, replacing showProjects */
  // The top bar's contents come back in reading order.
  document.querySelectorAll('.about-topbar :is(.topbar-wordmark, .section-nav > *)').forEach((el, i) => el.style.setProperty('--nav-i', i));
  let navDone = 0;
  // Projects plays its entrance again as the sheet clears, and the top bar
  // comes back with it.
  const showProjects = () => {
    clearTimeout(reveal);
    const root = document.documentElement;
    if (!root.classList.contains('project-sheet-open')) return;
    root.classList.remove('project-sheet-open');
    projects?.classList.add('projects-entered');
    if (reducedMotion.matches || document.hidden) return;
    clearTimeout(navDone);
    root.classList.add('nav-return');
    navDone = setTimeout(() => root.classList.remove('nav-return'), 1000);
  };
```

The early `return` when `project-sheet-open` is already gone matters. `closed()` calls `showProjects()` again after the fade, and the bar must not replay a second time.

## Steps

1. Add the CSS block above after `html.project-sheet-open body > :not(.site-backdrop, .project-sheet) { opacity: 0; }`.
2. Replace `showProjects` in `initProjectSheet` with the target.
3. Bump `styles.css?v=` and `script.js?v=` in `index.html`, `about_me.html`, `projects.html` and `projects/next_step.html`.

## Boundaries

- Do NOT change `.about-topbar` or its `::after` gradient, or the `body > …` opacity fade.
- Do NOT change the standalone project page's back link, or the nav's hover/press/pill logic.

## Verification

- `node --check script.js`.
- Headless or real browser, on `projects.html`: open the NextStep card, then click Back. The wordmark and links drop in left to right over ~0.8 s, and the PROJECTS underline redraws. The bar's dark background and bottom gradient are present throughout. Opening a sheet again and closing it replays the same thing. Reduced motion: the bar just fades with the page.
