# 009 — Carry the headings across the Meet Josh ↔ Experience cut

- **Status**: TODO
- **Commit**: ac07bee (plus the uncommitted 008 work in the working tree)
- **Severity**: HIGH
- **Category**: Physicality & origin (page transition feel)
- **Estimated scope**: 2 files (`styles.css` ~8 lines, `script.js` ~4 lines)
- **Depends on**: 008 (applied in the working tree)

## Problem

008 made the turn an exit → instant cut → entrance. The exits only empty the title **fill**. The eyebrow ("02 / About me", "My Career") and the title **outline** stay fully drawn right up to the cut, and the arriving section's eyebrow and outline are drawn from its first frame. So at the cut, one outlined heading is swapped for another in a single frame. That is the hard cut the user sees.

Verified in headless Chrome at 1440×860: the first frame after the Meet Josh → Experience cut already shows the "MY CAREER" eyebrow and the full "Experience" outline. Nothing leads into it.

```css
/* styles.css — current: exits touch only the fill, rule, copy and scene */
.about-motion.is-arrived .about-hero.is-leaving .about-title-line { --about-fill: 0; transition: --about-fill .28s var(--ease-out) .06s; }
.core-motion.is-entered.is-leaving .about-title-line { --about-fill: 0; transition: --about-fill .28s var(--ease-out) .06s; }
/* and the un-entered states hide only the fill, rule, jobs, rail and card */
.core-motion:not(.is-entered) .about-title-line { --about-fill: 0; }
```

## Target

The eyebrow and title leave **with the page** and the next ones arrive **from the side the page came from**, as Education's sheets already do (`--edu-from` / `--edu-exit`). Going down, the old heading lifts 16px and fades, the cut happens on an empty page, and the new heading rises 16px into place. Going up, the same thing happens in mirror image. Every exit piece still finishes before the 360 ms cut (.04 + .30 = .34 s).

Easing is the existing `--ease-out: cubic-bezier(.23, 1, .32, 1)` token (`styles.css:54`).

## Steps

1. **`styles.css`, Meet Josh.** After the `.about-motion .about-hero.is-away :is(.about-lead, .about-resume)` rule (~line 945), add:
   ```css
   /* The eyebrow and title go with the page too, so the cut to Experience
      lands on an empty screen rather than swapping one heading for another.
      Away, they wait above, where the page comes back down from. */
   .about-motion .about-hero :is(.about-eyebrow, .about-title) { transition: opacity .5s var(--ease-out), transform .6s var(--ease-out); }
   .about-motion .about-hero.is-away :is(.about-eyebrow, .about-title) { opacity: 0; transform: translateY(-16px); transition: none; }
   ```
   After the `.about-motion.is-arrived .about-hero.is-leaving .about-scene` rule (~line 957), add:
   ```css
   .about-motion.is-arrived .about-hero.is-leaving :is(.about-eyebrow, .about-title) { opacity: 0; transform: translateY(-16px); transition: opacity .24s var(--ease-out) .08s, transform .3s var(--ease-out) .04s; }
   ```

2. **`styles.css`, Experience.** After `.core-motion:not(.is-entered) .core-reading { … }` (~line 1181), add:
   ```css
   /* The eyebrow and heading arrive from the side the page turned in from and
      leave the way it turns out, so the cut from Meet Josh never shows them
      appear at once. Script sets --core-from and --core-exit. */
   .core-motion :is(.about-eyebrow, .about-heading) { transition: opacity .5s var(--ease-out), transform .6s var(--ease-out); }
   .core-motion:not(.is-entered) :is(.about-eyebrow, .about-heading) { opacity: 0; transform: translateY(var(--core-from, 16px)); transition: none; }
   ```
   After the `.core-motion.is-entered.is-leaving .about-rule::after` rule (~line 1195), add:
   ```css
   .core-motion.is-entered.is-leaving :is(.about-eyebrow, .about-heading) { opacity: 0; transform: translateY(var(--core-exit, -16px)); transition: opacity .24s var(--ease-out) .08s, transform .3s var(--ease-out) .04s; }
   ```

3. **`script.js`, Experience's arrival observer (~line 1895).** Follow Education's pattern (`script.js:1536` `exitToward`, `:1544` `--edu-from`):
   - In the `if (entered && !entry.isIntersecting)` branch, after `section.classList.remove('is-entered', 'is-leaving');`, add:
     ```js
     // Gone: ready to arrive again from the side it will come back from.
     section.style.setProperty('--core-from', entry.boundingClientRect.top < 0 ? '-16px' : '16px');
     ```
   - In the `else if (entered && !leaving && !rising && now < .9)` branch, before `section.classList.add('is-leaving');`, add:
     ```js
     section.style.setProperty('--core-exit', entry.boundingClientRect.top < 0 ? '-16px' : '16px');
     ```
   - In the `holdPageTurns(leaveTarget, (to, edge) => {` callback (~line 1925), before `section.classList.add('is-leaving');`, add:
     ```js
     // It leaves the way the page turns: up on the way down, down on the way up.
     section.style.setProperty('--core-exit', to > edge ? '-16px' : '16px');
     ```

## Boundaries

- Do NOT change any existing timing, the 360 ms cut, `holdPageTurns`, or the fold.
- Do NOT touch Education, Projects, `projects.html`, Home or Home's cartoon.
- `.about-heading` is also used by Education. Every new selector is scoped under `.core-motion` or `.about-hero`, so keep it that way.
- If the cited lines don't match, STOP and report.

## Verification

- `node --check script.js`; `node --test tests/section-scroll.test.cjs` (43 pass).
- Feel check at `http://localhost:8765/index.html`, then fold to About (Chrome, trackpad and mouse):
  - Flick down from Meet Josh: the copy, title and eyebrow lift away together and the screen is empty (only the bar and grain) at the cut. Then "My Career" and "Experience" rise into place, and the rule and fill draw.
  - From the first job, flick up: Experience drops away, and Meet Josh's eyebrow and title settle down from above.
  - From the last job, flick down to Education, then back up: Experience's heading comes down from above.
  - DevTools → Animations at 10%: at the cut frame nothing from the old section is visible.
  - Reduced motion: `.core-motion`/`.about-motion` are not added, so headings are static.
