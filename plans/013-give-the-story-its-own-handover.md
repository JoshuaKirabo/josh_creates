# 013 — Give the story column its own handover

- **Status**: DONE (uncommitted)
- **Commit**: 1dd054f (plus the uncommitted NextStep work in the working tree)
- **Severity**: HIGH
- **Category**: Cohesion / Physicality (section transition choreography)
- **Estimated scope**: 2 files (`script.js` ~15 lines, `styles.css` ~6 lines)

## Problem

When the NextStep hero hands over to How it works, both columns leave with the *same* motion: every line lifts through its own top-edge clip, chained 12 ms apart in one sequence (story bottom-up, then links, lead, title). The two columns have different jobs — the left is display type and actions, the right is quiet reading copy — but they read as one uniform wipe, and the story leaving first, line by line upward, delays the title side.

```js
/* script.js — function orderProjectHandover, current */
function orderProjectHandover(hero) {
  const bottomUp = el => [...el.querySelectorAll('.handover-out')].reverse();
  const story = [...hero.querySelectorAll('.project-story p:not(.about-eyebrow)')].reverse();
  const out = [
    ...story.flatMap(bottomUp),
    hero.querySelector('.project-story .about-eyebrow > span'),
    ...[...hero.querySelectorAll('.project-sheet-actions .button')].reverse(),
    ...[...hero.querySelectorAll('.about-lead')].flatMap(bottomUp),
    ...[...hero.querySelectorAll('.about-title-line')].reverse(),
  ].filter(Boolean);
  out.forEach((el, i) => {
    el.style.setProperty('--out', i);
    el.style.setProperty('--in', out.length - 1 - i);
  });
}
```

```css
/* styles.css — "The handover." block, current */
.handover-motion :is(.project-story .about-eyebrow, .about-title-line) { clip-path: inset(0 -1em -.3em -1em); }
.handover-motion :is(.handover-out, .project-story .about-eyebrow > span, .about-title-line > *) { transition: translate .5s var(--ease-out) calc(var(--in, 0) * 12ms); }
.handover-motion.is-leaving :is(.handover-out, .project-story .about-eyebrow > span, .about-title-line > *) { translate: 0 -105%; transition: translate .32s var(--ease-in-out) calc(var(--out, 0) * 12ms); }
```

The handover already fires on every turn (`project-leave` / `project-arrive` from `initProjectPaging`, plus the IntersectionObserver in `playProjectHero`), so no trigger work is needed — only the choreography.

## Target

Two simultaneous, different exits that start on the same frame:

- **Title side** (links, lead lines, title lines): unchanged motion — lifts through its clips, `translate: 0 -105%`, `.32s var(--ease-in-out)` (`cubic-bezier(.77, 0, .175, 1)`), 12 ms apart; now its own chain starting at 0 instead of after the story.
- **Story side** (eyebrow, then each line in reading order, top first): dissolves in place — `opacity: 0`, `translate: 0 -10px`, `filter: blur(6px)`, `.3s var(--ease-out)` (`cubic-bezier(.23, 1, .32, 1)`), 24 ms apart. No clip, so it softens rather than wipes.
- **Return** (turning back up): title side comes back down as now (`.5s var(--ease-out)`, reversed chain via `--in`). The story re-forms in reading order, top first, `.5s var(--ease-out)`, starting 120 ms after the title side so the heavy type lands first.

```js
/* target — script.js */
// Everything in the hero that leaves, in two chains that start together. The
// title side lifts out through its clips, links first and title last; the
// story dissolves in reading order, eyebrow first. Each returns in its own
// order.
function orderProjectHandover(hero) {
  const bottomUp = el => [...el.querySelectorAll('.handover-out')].reverse();
  const lift = [
    ...[...hero.querySelectorAll('.project-sheet-actions .button')].reverse(),
    ...[...hero.querySelectorAll('.about-lead')].flatMap(bottomUp),
    ...[...hero.querySelectorAll('.about-title-line')].reverse(),
  ].filter(Boolean);
  const story = [
    hero.querySelector('.project-story .about-eyebrow > span'),
    ...hero.querySelectorAll('.project-story .handover-out'),
  ].filter(Boolean);
  [lift, story].forEach(chain => chain.forEach((el, i) => {
    el.style.setProperty('--out', i);
    el.style.setProperty('--in', chain.length - 1 - i);
  }));
}
```

```css
/* target — styles.css, append directly after the two `.project-sheet-actions .button` handover rules */
/* The story dissolves instead of lifting: each line softens and fades up
   10px in reading order, 24ms apart, alongside the title side's lift. It
   re-forms in the same order, a beat after the title side starts back. */
.handover-motion .project-story :is(.about-eyebrow, .handover-line) { clip-path: none; }
.handover-motion .project-story :is(.handover-out, .about-eyebrow > span) { transition: opacity .5s var(--ease-out) calc(.12s + var(--out, 0) * 24ms), translate .5s var(--ease-out) calc(.12s + var(--out, 0) * 24ms), filter .5s var(--ease-out) calc(.12s + var(--out, 0) * 24ms); }
.handover-motion.is-leaving .project-story :is(.handover-out, .about-eyebrow > span) { opacity: 0; translate: 0 -10px; filter: blur(6px); transition: opacity .3s var(--ease-out) calc(var(--out, 0) * 24ms), translate .3s var(--ease-out) calc(var(--out, 0) * 24ms), filter .3s var(--ease-out) calc(var(--out, 0) * 24ms); }
```

Specificity: the new rules tie the existing `.handover-motion…` rules (0,3,0 / 0,3,1 / 0,4,1) and win by coming later. Keep them after the existing block.

## Repo conventions to follow

- Easing tokens are in `styles.css:54–58`: `--ease-out: cubic-bezier(.23, 1, .32, 1)`, `--ease-in-out: cubic-bezier(.77, 0, .175, 1)`. Use the tokens, not raw curves.
- Stagger is expressed as `calc(var(--out|--in, 0) * Nms)` custom properties set from script — the exemplar is the existing handover rules above.
- `.handover-motion` is added only when motion is allowed (`playProjectHero` returns early under `prefers-reduced-motion`), so no extra media query is needed.

## Steps

1. In `script.js`, replace `function orderProjectHandover` and the comment block directly above it ("Everything in the hero that leaves through a clip…") with the Target JS.
2. In `styles.css`, find `.handover-motion.is-leaving .project-sheet-actions .button { … }` and insert the Target CSS block (comment + 3 rules) directly after it.
3. Update the comment at the top of the "The handover." block so it no longer says the story leaves first: change "the story from its last line up, then the links, the lead and the title, 12ms apart" to "the links, the lead and the title, 12ms apart, while the story dissolves beside them".

## Boundaries

- Do NOT change the title side's motion values, `PROJECT_HOLD_MS`, `PROJECT_TURN_MS`, or `splitProjectLines`.
- Do NOT touch the How it works (`.how-motion`) rules.
- Do NOT change markup.
- Another Claude session has been editing this area. If the current excerpts don't match, STOP and report.

## Verification

- **Mechanical**: `node --check script.js` exits 0.
- **Feel check** (serve the site, open `projects/next_step.html`, let the entrance finish, then wheel/trackpad turn):
  - On the turn down, the title side and the story start moving on the same frame. The title side lifts out through its top edges; the story softens and fades up in place. Nothing in the story is cut by a straight clip edge.
  - Story lines go top line first, reading order; the eyebrow leads.
  - Turn back up: the title and links drop back in first; the story re-forms ~120 ms later, top line first, sharp at rest (no lingering blur).
  - Repeat the round trip 5 times, including a quick reversal mid-exit: lines retarget from where they are, never jump.
  - DevTools Animations panel at 10%: the story's blur and fade finish within ~0.5 s of the turn starting; no line is still visible when the glide carries the hero off.
  - Resize the window after load (lines re-split): the chains still run in the right order.
  - `prefers-reduced-motion: reduce`: hero does not animate at all (unchanged).
- **Done when**: the two columns visibly leave with different motions, together, on every turn.
