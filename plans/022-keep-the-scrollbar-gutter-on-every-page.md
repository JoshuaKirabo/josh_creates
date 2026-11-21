# 022 — Keep the scrollbar's space on every page

- **Status**: DONE (uncommitted)
- **Commit**: 4b2f9d7
- **Severity**: MEDIUM
- **Category**: Physicality & origin (layout shift across the cut)
- **Estimated scope**: 1 file, 1 line

## Problem

Projects scrolls (it is 6641 px tall at 1440×812). Skills fits in one screen (812 px), so it has no scrollbar. With classic scrollbars, the kind a mouse user on macOS, Windows or Linux sees, the viewport gets wider at the cut, and everything laid out against it moves sideways.

Measured in Chrome at a 1440 px window:

| Page | `documentElement.clientWidth` | Top bar `.section-nav` right edge |
| --- | --- | --- |
| `projects.html` | 1425 | 1394 |
| `about_me.html` | 1425 | 1394 |
| `skills.html` | 1440 | **1409** |

The top bar's links jump **15 px right** at the exact moment Skills appears. Skills' own panel is also laid out 15 px wider than the page before it. The turn is designed so the top bar stays still while the page changes under it ("The top bar stays, since Skills shares it", `script.js:4302-4303`), and this shift breaks that.

It happens both ways (Skills → Projects jumps back 15 px left). It also affects any page that fits in one screen, and `html.project-sheet-open { overflow: hidden; }` (`styles.css:1437`) removes the scrollbar the same way when a project sheet opens.

Trackpad users on macOS default to overlay scrollbars, which take no space, so they don't see it. That's why it can look fine on one machine and not another.

Current, `styles.css:71`:

```css
html { min-height: 100%; scroll-behavior: auto; scroll-padding-top: 0; background: var(--background); }
```

## Target

Reserve the scrollbar's space on every page, whether or not the page scrolls:

```css
/* target, styles.css:71 */
html { min-height: 100%; scroll-behavior: auto; scroll-padding-top: 0; scrollbar-gutter: stable; background: var(--background); }
```

- Where the scrollbar is classic, Skills gets the same 15 px gutter as Projects, so `clientWidth` is 1425 on both and nothing moves at the cut. The gutter shows the `html` background (`var(--background)`, `#060606`), which matches the page.
- With overlay scrollbars (macOS trackpad, iOS, Android) `scrollbar-gutter` reserves nothing, so there's no change.
- Below 700 px the scrollbar is already hidden (`styles.css:226-229` sets `scrollbar-width: none` and a 0-width `::-webkit-scrollbar`), so the reserved gutter is 0 there too.

## Repo conventions to follow

- Global document rules sit on the single `html { … }` line at `styles.css:71`. Add the property to that line; don't create a second `html` rule.
- The site avoids `100vw` for layout (no `100vw` in `styles.css`), so nothing will overflow into the reserved gutter.

## Steps

1. In `styles.css`, on the `html { min-height: 100%; …` line (currently 71), insert `scrollbar-gutter: stable;` after `scroll-padding-top: 0;`, exactly as in the target.
2. Bump the stylesheet version on every page. If plan 021 has run, all pages share one `?v=` value, so bump it once everywhere.

## Boundaries

- Do NOT use `scrollbar-gutter: stable both-edges`. That would also pad the left side and move the whole layout.
- Do NOT force Skills to scroll (for example with `overflow-y: scroll` or extra height). It must stay a one-screen page.
- Do NOT touch the mobile scrollbar-hiding rules at `styles.css:226-229`.
- If the line doesn't match (drift since 4b2f9d7), STOP and report.

## Verification

- **Mechanical**: in Chrome with classic scrollbars (macOS: System Settings → Appearance → Show scroll bars → **Always**), run `document.documentElement.clientWidth` in the console on `projects.html` and on `skills.html` at the same window size. The values match.
- **Feel check**: with "Always" scroll bars on, scroll from the last project card into Skills, then back up into Projects.
  - The top bar's links and the JOSH wordmark don't move at the cut, either way.
  - Skills shows a thin dark strip where the scrollbar would be, the same colour as the page. That's the reserved gutter and is expected.
  - Open and close a project card's sheet. The page behind doesn't shift sideways.
  - Switch back to "Automatically based on mouse or trackpad" and confirm nothing changed visually.
- **Done when**: the `.section-nav` right edge reads the same on `projects.html` and `skills.html` (1394 at a 1440 px window with classic scrollbars).
