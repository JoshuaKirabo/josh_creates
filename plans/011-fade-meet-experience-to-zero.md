# 011 — Fade Meet Josh and Experience all the way out and in from zero

- **Status**: DONE (uncommitted)
- **Commit**: ac07bee (plus plan 008 and the uncommitted About work in the working tree)
- **Severity**: HIGH
- **Category**: Purpose & frequency (page transition continuity)
- **Estimated scope**: 1 file (`styles.css`), ~8 lines

## Problem

Plan 008 turns Meet Josh ↔ Experience into exit → cut → entrance. But the exits only fade *part* of each page, and the entrances start from a part-drawn page. Three pieces are never faded:

```css
/* styles.css:881 — eyebrow text, 50 % white */
.about-eyebrow { … color: rgba(255, 255, 255, .5); … }
/* styles.css:882 — the eyebrow rule's track, 10 % white (only ::after scales) */
.about-rule { … background: rgba(255, 255, 255, .1); }
/* styles.css:927 — the title outline, 32 % white stroke (only the fill sweeps) */
.about-title-outline { display: block; color: transparent; -webkit-text-stroke: 1px rgba(255, 255, 255, .32); }
```

So at the cut, the outlined "MEET JOSH." and "02 / About me" snap to the outlined "EXPERIENCE" and "My Career". Nothing fades to 0 on the way out, and Experience does not rise from 0 on the way in. The same happens going back up.

## Target

Every visible piece of the leaving page is at opacity 0 by 340 ms, before the 360 ms cut. The arriving page's eyebrow and outline start at 0 and fade in over 400 ms with `--ease-out` (`cubic-bezier(.23, 1, .32, 1)`, `styles.css:54`), under the fill sweep that already plays.

```css
/* target — after the Meet Josh `is-leaving` block (styles.css ~957) */
.about-motion.is-arrived .about-hero:not(.is-away, .is-leaving) :is(.about-eyebrow, .about-title-outline) { transition: opacity .4s var(--ease-out); }
.about-motion.is-arrived .about-hero.is-leaving :is(.about-eyebrow, .about-title-outline) { opacity: 0; transition: opacity .25s var(--ease-out) .06s; }
.about-motion .about-hero.is-away :is(.about-eyebrow, .about-title-outline) { opacity: 0; transition: none; }

/* target — Experience, beside the existing `.core-motion` rules (styles.css ~1177–1196) */
.core-motion:not(.is-entered) :is(.about-eyebrow, .about-title-outline) { opacity: 0; }
.core-motion.is-entered:not(.is-leaving) :is(.about-eyebrow, .about-title-outline) { transition: opacity .4s var(--ease-out); }
.core-motion.is-entered.is-leaving :is(.about-eyebrow, .about-title-outline) { opacity: 0; transition: opacity .25s var(--ease-out) .06s; }
```

The `:not()` guards keep the three states from competing on specificity. `.about-eyebrow` carries the rule, so the track fades with the text.

## Repo conventions to follow

- State classes: Meet Josh uses `.about-motion.is-arrived .about-hero.is-leaving` and `.about-motion .about-hero.is-away` (`styles.css:941-957`). Experience uses `.core-motion:not(.is-entered)`, `.core-motion.is-entered` and `.core-motion.is-entered.is-leaving` (`styles.css:1177-1196`).
- `.about-motion` and `.core-motion` are added by script only when motion is allowed, so reduced motion needs no extra rule.

## Steps

1. In `styles.css`, directly after `.about-motion.is-arrived .about-hero.is-leaving .about-scene { … }`, add the three Meet Josh rules from Target.
2. In `styles.css`, add `.core-motion:not(.is-entered) :is(.about-eyebrow, .about-title-outline) { opacity: 0; }` after `.core-motion:not(.is-entered) .core-reading { … }`. Add the `is-entered:not(.is-leaving)` rule after `.core-motion.is-entered .core-reading { … }`, and the `is-leaving` rule after `.core-motion.is-entered.is-leaving .about-rule::after { … }`.
3. Extend the Experience comment (`styles.css` "Experience arrives once…") with: "Its eyebrow and outline fade up from nothing too, so the page it replaces never shows through."

## Boundaries

- Do NOT change `script.js`, the fold, Home, Education or `projects.html`.
- Do NOT change Meet Josh's first arrival (`.about-motion:not(.is-arrived)`); only the leave / away / return path.
- Do NOT touch `.about-title-fill`.

## Verification

- **Feel check**, `about_me.html` in Chrome, DevTools → Animations at 10 %:
  - Flick down from Meet Josh: at the cut the screen holds only the fixed chrome (top bar, footer). No outline, eyebrow text or rule track is left.
  - Experience's eyebrow and outlined heading fade up from nothing, then the fill sweeps across.
  - Flick up from Experience's first job: the same in reverse, and Meet Josh's outline and eyebrow fade up from 0.
  - Moving between jobs inside Experience does not flicker the heading (`is-entered` stays on).
- **Done when**: at the cut frame, neither section has any visible text or line of its own.
