# 015 — Bring the diagram box and the Experience card in through a soft, rising edge

- **Status**: DONE (uncommitted)
- **Commit**: 1dd054f (plus the uncommitted 012–014 work in the working tree)
- **Severity**: HIGH
- **Category**: Easing & duration / Physicality (entrance of large surfaces)
- **Estimated scope**: 1 file (`styles.css`): 1 new `@property` + 1 shared rule, 6 rules edited, 2 comments

## Problem

The user said: "the box with the diagram just appears. that transition could be smoother. same thing happens with experience." Both boxes are large surfaces that arrive right after an in-place cut (plans 008 and 014), so their entrance is the whole transition.

**1. How it works: the clip never animates (a bug).** `projects/next_step.html`. The un-entered sheet is clipped with `inset(100% 0 0 0)`, but the entered state sets no `clip-path`, so it becomes `none`. `inset()` → `none` cannot interpolate, so the browser swaps it in one frame. Headless Chrome at 1440×860 recorded `clip-path` going from `inset(100% 0px 0px)` to `none` on the cut frame, with only the 64px `transform` animating afterwards. The whole box, border and all, pops in at once.

```css
/* styles.css:~1487-1495 — current */
.how-motion:not(.is-entered) .arch-sheet { transform: translateY(64px); clip-path: inset(100% 0 0 0); }
.how-motion.is-entered:not(.is-leaving) .arch-sheet { transition: transform .9s var(--ease-out-quart) .12s, clip-path .9s var(--ease-out-quart) .12s; }
.how-motion.is-leaving .arch-sheet { transform: translateY(64px); clip-path: inset(100% 0 0 0); transition: transform .32s var(--ease-in-out), clip-path .32s var(--ease-in-out); }
```

**2. Experience: a hard, front-loaded wipe on a bright slab.** `index.html` / About. The card (`.core-reading`, background `#f0f0eb` on a near-black page) does animate, but:
- It waits **500 ms** after the cut on an otherwise empty area, then a **hard horizontal edge** sweeps up.
- `--ease-out-quart` front-loads it. Recorded at 1440×860, the card goes from 14% to 48% revealed within about 100 ms of starting. A sharp bright edge moving that fast still reads as "appeared".
- The card itself never moves. Only the mask does, so it has no sense of arriving.

```css
/* styles.css:~1214, 1221, 1227 — current */
.core-motion:not(.is-entered) .core-reading { clip-path: inset(100% 0 0 0); }
.core-motion.is-entered .core-reading { clip-path: inset(0); transition: clip-path .9s var(--ease-out-quart) .5s; }
.core-motion.is-entered.is-leaving .core-reading { clip-path: inset(100% 0 0 0); transition: clip-path .3s var(--ease-out); }
```

## Target

Both boxes use one shared entrance: a **soft (feathered) mask edge sweeps up from the box's foot while the box rises into place**, on a less front-loaded curve. It keeps the site's bottom-up reveal character but has no hard line and no pop. The glossary term for this is a **Mask** reveal rather than a **Clip-path** reveal.

- The mask is driven by a registered number, `--sheet-reveal` (0 = hidden, 1 = shown). It follows the same pattern the site already uses for its title fills (`--about-fill` → `--edge-at` → `linear-gradient` with a feathered stop).
- **Feather:** 15% of the box's height. The edge runs from −15% to 115%, so 0 is fully hidden and 1 is fully shown.
- **Enter curve:** `--ease-out-cubic` (`cubic-bezier(.33, 1, .68, 1)`, an existing token), which has a softer start than quart. **1s**.
- **Rise:** the diagram box keeps its `transform` rise, shortened from 64px to **40px**. The Experience card rises **32px** using the individual `translate` property, because `.core-reading` has no transform and plan 005 keeps transforms off the About section itself.
- **Delays:** diagram box `.12s` (unchanged). The Experience card drops from `.5s` to **`.3s`** so the empty gap after the cut is shorter.
- **Exits** keep their current timing, so plans 008 and 014's cut timings still hold. The diagram box uses `.32s var(--ease-in-out)` (ends 320 ms, before 014's 380 ms cut). The Experience card uses `.3s var(--ease-out)` (ends 300 ms, before 008's 360 ms cut).

```css
/* target — styles.css: new, placed directly above the Experience comment block ("Experience arrives once, the first time the page turns to it…") */
/* The big boxes that arrive after a page cut (Experience's card, How it
   works' sheet) come in through a soft edge that sweeps up from their foot
   as they rise into place, so no hard line crosses a bright box and nothing
   pops. --sheet-reveal runs 0 to 1; the edge is feathered over 15% of the
   box and starts and ends past its edges, so 0 hides it all and 1 shows it
   all. */
@property --sheet-reveal { syntax: '<number>'; inherits: false; initial-value: 1; }
:is(.core-motion .core-reading, .how-motion .arch-sheet) { --reveal-at: calc(var(--sheet-reveal) * 130% - 15%); -webkit-mask-image: linear-gradient(to top, #000 var(--reveal-at), transparent calc(var(--reveal-at) + 15%)); mask-image: linear-gradient(to top, #000 var(--reveal-at), transparent calc(var(--reveal-at) + 15%)); }
```

```css
/* target — styles.css: Experience card, replacing the three .core-reading lines */
.core-motion:not(.is-entered) .core-reading { --sheet-reveal: 0; translate: 0 32px; }
.core-motion.is-entered .core-reading { transition: --sheet-reveal 1s var(--ease-out-cubic) .3s, translate 1s var(--ease-out-cubic) .3s; }
.core-motion.is-entered.is-leaving .core-reading { --sheet-reveal: 0; translate: 0 32px; transition: --sheet-reveal .3s var(--ease-out), translate .3s var(--ease-out); }
```

```css
/* target — styles.css: How it works sheet, replacing the three .arch-sheet lines */
.how-motion:not(.is-entered) .arch-sheet { transform: translateY(40px); --sheet-reveal: 0; }
.how-motion.is-entered:not(.is-leaving) .arch-sheet { transition: transform 1s var(--ease-out-cubic) .12s, --sheet-reveal 1s var(--ease-out-cubic) .12s; }
.how-motion.is-leaving .arch-sheet { transform: translateY(40px); --sheet-reveal: 0; transition: transform .32s var(--ease-in-out), --sheet-reveal .32s var(--ease-in-out); }
```

Specificity check: the shared `:is(...)` rule is (0,2,0). It only sets `--reveal-at` and `mask-image`, which no other rule sets on these elements, so there is no conflict. The state rules set `--sheet-reveal`, and the shared rule reads it.

## Repo conventions to follow

- Registered-number masks are the house pattern. Exemplar: `styles.css:886` `@property --about-fill { syntax: '<number>'; inherits: true; initial-value: 1; }`, and `styles.css:935` `.about-title-fill { --edge-at: calc(var(--about-fill) * 124% - 12%); -webkit-mask-image: linear-gradient(…, #000 var(--edge-at), transparent calc(var(--edge-at) + 10%)); mask-image: …; }`. Always write both `-webkit-mask-image` and `mask-image`.
- Easing tokens are in `styles.css:54-60` (`--ease-out`, `--ease-in-out`, `--ease-out-cubic`, `--ease-out-quart`). Use tokens, never raw curves.
- `.core-motion` and `.how-motion` are added by script only when motion is allowed, so reduced motion needs no extra rule: without the class, the shared rule doesn't match and nothing is masked.
- Comments are full sentences explaining *why*, in the voice of the surrounding ones.

## Steps

1. **`styles.css`, above the Experience comment block** (starts "/* Experience arrives once, the first time the page turns to it…", ~line 1205). Insert the new comment, `@property --sheet-reveal` and the shared `:is(...)` rule from Target.
2. **Same comment block.** Change "and the card wipes up from the bottom" to "and the card rises in through a soft edge".
3. **`styles.css:~1214`, `~1221`, `~1227`.** Replace the three `.core-reading` rules with the Experience Target rules. Keep them at their current positions in the block.
4. **`styles.css:~1487`, `~1490`, `~1495`.** Replace the three `.arch-sheet` rules with the How it works Target rules.
5. **The How it works comment** (~line 1481, "How it works slides up over the hero as it goes…"). Change it to: "How it works rises in where the hero stood, through a soft edge, and its line draws on from the left as the hero's shrinks away to the right. Script adds .how-motion only when motion is allowed."
6. `grep -n "clip-path" styles.css | grep -E "arch-sheet|core-reading"` must return nothing.
7. Bump the cache-busting query on `styles.css` in `index.html`, `about_me.html`, `projects.html` and `projects/next_step.html` (`?v=aboutNN`) to one number above the highest currently in use.

## Boundaries

- Do NOT touch `script.js`, or any timing that plans 008 or 014 depend on (exit durations stay ≤ .32s).
- Do NOT touch the How it works figure drawing (`.how-motion.is-drawing …`), the Experience heading, jobs or rail rules, or the `.core-title-text` / `.core-logo-fill` masks.
- Do NOT change markup.
- Another Claude session has been editing this area. If the excerpts don't match the code you find, STOP and report.

## Verification

- **Mechanical**: the Step 6 grep is empty. Load both pages with DevTools open and confirm no CSS parse warnings for the new rules.
- **Frame check (headless or DevTools)**: record `getComputedStyle(el).getPropertyValue('--sheet-reveal')` every animation frame through the cut. It must climb smoothly from 0 to 1 over about 1s, with no single-frame jump. The diagram box starts ~120 ms after the cut, and the Experience card ~300 ms after.
- **Feel check** (serve with `python3 -m http.server 8765`):
  - `projects/next_step.html`: flick down from the hero. The diagram box rises about 40px while its body fades up from the foot through a soft edge. The top border arrives last, and no hard line crosses the box. The figure's own drawing still plays on top.
  - `index.html` → About → flick from Meet Josh to Experience. The light card starts rising shortly after the cut, with a feathered edge sweeping up. No bright slab snaps in.
  - Flick back up during either entrance. The box sinks and fades out from wherever it had got to, with no jump.
  - DevTools Animations panel at 10%: the edge is a gradient, never a crisp line, and the rise and reveal finish together.
  - Both exits have finished (fully hidden) before the page cuts: 320 ms for the diagram box, 300 ms for the card.
  - `prefers-reduced-motion: reduce`: both boxes are simply there, unmasked.
- **Done when**: neither box ever becomes visible in a single frame, and both arrive through a soft rising edge.
