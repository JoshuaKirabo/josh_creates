# 005 — Stop transforming the About section

- **Status**: DONE
- **Commit**: 93bcc7e
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 2 files (`script.js`, `tests/section-scroll.test.cjs`)

## Problem

Every fold frame writes `transform` and `opacity` on the entire sticky `#about` section, and then again on `.about-sidebar`. Opacity on a viewport-sized sticky subtree while the navigation spring also used to move scroll is extra paint. The 48px About settle is not what the reader is watching — the words are.

```js
/* script.js:721-728 — current */
const remaining = 1 - smooth(slice(progress, 0, .92));
about.style.transform = `translateY(${48 * remaining * remaining}px)`;
fade(about, smooth(slice(progress, .28, .72)));
if (sidebar) {
  sidebar.style.transform = `translateX(${-24 * remaining}px)`;
  fade(sidebar, smooth(slice(progress, .32, .78)));
}
```

`.about-main` is an empty column. It does not need its own fade.

## Target

Do not write `about.style.transform` or `about.style.opacity` during the fold. Keep the sidebar’s existing windows. Use `translate3d` like `applyFold`.

```js
/* target */
const remaining = 1 - smooth(slice(progress, 0, .92));
if (sidebar) {
  sidebar.style.transform = `translate3d(${-24 * remaining}px, 0, 0)`;
  fade(sidebar, smooth(slice(progress, .32, .78)));
}
```

At rest and in `measureFolds()` / `releaseTransition()`, leave `about.style.transform` and `about.style.opacity` as `''` (already cleared today). You may drop `about` from the measure-time `about.style.transform = ''` write if you also stop setting it — still clear it once in `releaseTransition()` so a mid-session codepath cannot leak an old inline style.

Do not add a fade on `.about-main`.

## Repo conventions to follow

- Sidebar motion is already the “join the word as it lands” counterpart. Keep `-24px`, `.32–.78` fade, and `remaining` from `smooth(slice(progress, 0, .92))`.
- Word movers use `translate3d(..., 0)`. Exemplar: `script.js:594-596`.
- Reduced motion already calls `releaseTransition()` and expects `about.style.transform === ''`.

## Steps

1. Remove the two `about.style.transform` / `fade(about, …)` lines from `paint()`.
2. Change the sidebar transform to `translate3d(${-24 * remaining}px, 0, 0)`.
3. Keep `about` in `releaseTransition()` so any leftover inline transform/opacity is cleared.
4. Replace `tests/section-scroll.test.cjs` `About has only a small arrival offset, with no inverse-scroll correction` with: for `y` in `[0, 200, 500, 850, 1000, 1400]`, `s.about.style.transform === ''` and `s.about.style.opacity === ''`. Keep asserting that at `y >= BOUNDARY` the sidebar is at rest (`transform === ''` or a zero `translate3d`, and fade handed back).

## Boundaries

- Do NOT reintroduce inverse-scroll compensation (`- boundary * remaining`).
- Do NOT fade or transform `#about` “a little” — zero writes on that node during paint.
- Do NOT change glass-panel / backdrop-filter rules (already off under `.section-scroll-ready`).
- Do NOT change word `applyFold` motion.

## Verification

- **Mechanical**: `node --test tests/section-scroll.test.cjs` exits 0.
- **Feel check**: Home → About. About’s empty column may sit still under the fading hero (sticky already holds it). The sidebar still eases in from the left and fades `.32–.78`. No 48px About dip.
  - Reverse the fold: About must not hitch from an opacity/transform being removed from the section.
  - Long About content below the fold still scrolls natively after landing.
  - `prefers-reduced-motion`: `about.style.transform` stays `''`.
- **Done when**: `paint()` never assigns `about.style.transform` or `about.style.opacity`; sidebar still uses `translate3d` + the existing fade window.
