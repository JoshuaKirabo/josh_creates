# 020 — Clear all of Projects before cutting to Skills

- **Status**: DONE (uncommitted)
- **Commit**: 4b2f9d7
- **Severity**: HIGH
- **Category**: Purpose & frequency (exit choreography)
- **Estimated scope**: 2 files, ~6 lines

## Problem

Scrolling on from the last project card (07 TinyML) plays Projects' exit, then loads `skills.html`. That exit is meant to leave an empty screen, so the page cut lands on nothing, and then Skills plays its entrance (exit → instant cut → entrance, the site-wide rule for section turns).

It does not clear everything. The exit fades the title lines, the cards and the eyebrow hairline, but two things are never part of it:

- the eyebrow text **"03 / Projects"** (`.projects-eyebrow > span:first-child`)
- the **card rail** at the bottom: the 1px line with its white progress fill, and the `01 NextStep … 07 TinyML` links (`.projects-rail`)

A frame-by-frame recording (headless Chrome, 1440×812, real wheel input) shows them sitting fully visible on an otherwise empty page at 320 ms. They stay there while Skills loads, then vanish in a single frame when Skills paints. That hard cut is the jolt.

The navigation also fires at exactly 320 ms, the same instant the last fade (0.28 s plus 0.04 s delay) finishes, so there is no beat of empty screen before the cut.

Current exit, `styles.css:1453-1459`:

```css
html.projects-leaving .projects-main :is(.projects-title-line, .project-card) { opacity: 0; transition: opacity .28s var(--ease-in-out), transform .28s var(--ease-in-out); }
html.projects-leaving .projects-main .projects-title-line { transform: translateY(-.35em); }
html.projects-leaving .projects-main .projects-title-strong { transition-delay: .04s; }
html.projects-leaving .projects-main .project-card { transform: translateX(-2.5rem); transition-delay: .04s; }
html.projects-leaving .projects-main .project-card.is-opening { transform: none; transition: opacity .2s var(--ease-in-out) .12s; }
html.projects-leaving .projects-main .project-card.is-opening .project-link { border-color: rgba(255, 255, 255, .6); transition-duration: .15s; }
html.projects-leaving .projects-main .projects-rule::after { transform: scaleX(0); transform-origin: right; transition: transform .28s var(--ease-in-out); }
```

Markup, `projects.html:109` and `projects.html:245-246`:

```html
<p class="projects-eyebrow"><span>03 / Projects</span><span class="projects-rule" aria-hidden="true"></span></p>
…
<nav class="projects-rail" aria-label="Projects">
  <span class="projects-rail-line" aria-hidden="true"><span class="projects-rail-fill"></span></span>
```

The turn, `script.js:4304-4313`:

```js
  let turning = false;
  holdPageTurns((direction) => {
    if (direction < 0 || turning || !geometry) return;
    const stops = cardStops();
    if (window.scrollY >= stops[stops.length - 1] - 2) return 'skills.html';
  }, (href) => {
    turning = true;
    if (reducedMotion.matches) { location.href = href; return; }
    document.documentElement.classList.add('projects-leaving');
    setTimeout(() => { location.href = href; }, 320);
  }, { fresh: true });
```

## Target

When the turn starts, **everything** in the Projects frame leaves, in the same 0.28 s as the title:

- **Eyebrow text "03 / Projects"**: fades to 0 over `.28s var(--ease-in-out)` with no movement (the hairline beside it already shrinks to the right).
- **Card rail** (line, fill and links together): fades to 0 over `.28s var(--ease-in-out)`, delay `.04s` (same timing as the cards), and moves down `.5rem` so it sinks away from the cards as they slide left.

Then the page holds **one empty beat** before the cut: navigate at **380 ms** instead of 320 ms. The exit finishes at 320 ms (0.28 s + 0.04 s), leaving 60 ms of an empty screen under the top bar.

`--ease-in-out` is already defined at `styles.css:55` as `cubic-bezier(.77, 0, .175, 1)`. Do not add a new token.

```css
/* target, add directly after styles.css:1459 */
html.projects-leaving .projects-main .projects-eyebrow > span:not(.projects-rule) { opacity: 0; transition: opacity .28s var(--ease-in-out); }
html.projects-leaving .projects-main .projects-rail { opacity: 0; translate: 0 .5rem; transition: opacity .28s var(--ease-in-out) .04s, translate .28s var(--ease-in-out) .04s; }
```

```js
/* target, script.js:4313 */
    setTimeout(() => { location.href = href; }, 380);
```

## Repo conventions to follow

- Exit rules live in the "Projects leaving" block at `styles.css:1450-1459`, one selector per line, all prefixed `html.projects-leaving .projects-main`. Add the two new lines at the end of that block, before the `html.nav-leave` rule on line 1460.
- Other exits in the file use `translate:` (the individual property) when the element has no existing `transform`. `.projects-rail` has no transform, so `translate` is right. Exemplar: `styles.css:1510` `.handover-motion.is-leaving .project-stack { opacity: 0; translate: 0 -10px; … }`.
- The script already skips the class when `prefers-reduced-motion` is set (`if (reducedMotion.matches) { location.href = href; return; }`), so no extra reduced-motion CSS is needed.

## Steps

1. In `styles.css`, find the line that begins `html.projects-leaving .projects-main .projects-rule::after` (currently line 1459). Directly after it, insert the two lines from the CSS target above.
2. In `script.js`, inside the `holdPageTurns` call whose target returns `'skills.html'` (currently around line 4304-4314), change `setTimeout(() => { location.href = href; }, 320);` to `setTimeout(() => { location.href = href; }, 380);`. Change only this `setTimeout`, not the 360 ms one in `initCraft` or the timing in the project-open code near line 3881.
3. Bump the stylesheet and script version query strings in every HTML page that loads them. If plan 021 is being executed in the same pass, use the single shared version it sets; otherwise bump each page's existing `?v=` by one.

## Boundaries

- Do NOT touch the Projects entrance rules (`styles.css:674-687`) or the Skills side (`initCraft`, `.craft-motion…`).
- Do NOT change markup.
- `projects-leaving` is also added when a project card is clicked (`script.js:3881`, plan 018). There the eyebrow text and the rail will now fade too. That is intended: they were the only things left on screen before the sheet opened. Don't add a guard to exclude that path.
- Do NOT add dependencies.
- If the cited lines don't match what you find (drift since 4b2f9d7), STOP and report instead of improvising.

## Verification

- **Mechanical**: `node --check script.js` exits 0. Run `node tests/section-scroll.test.cjs` if it runs without a server. It should pass as it did before.
- **Feel check**: serve the site (`python3 -m http.server 8765`), open `http://localhost:8765/projects.html` on a desktop browser, scroll through the cards to 07 TinyML, then scroll down once more.
  - The "03 / Projects" label, the title, the cards and the bottom rail all leave together. Nothing is still sitting on the page when Skills appears.
  - The rail sinks slightly as it fades, and the cards slide left. They don't collide.
  - The top bar stays put through the whole turn.
  - For a slow-motion look, use DevTools → Animations and set playback to 10% before the final scroll. The transitions are CSS transitions, so they show there.
  - Also click a project card: the eyebrow text and rail now fade with the rest before the sheet opens.
  - With `prefers-reduced-motion: reduce` emulated (Rendering panel), the turn goes straight to Skills with no exit.
- **Done when**: a frame recorded at 340-380 ms after the turn starts shows only the top bar and the grain background.
