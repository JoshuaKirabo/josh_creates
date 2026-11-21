# 008 — Swap Meet Josh and Experience in place instead of scrolling between them

- **Status**: DONE (uncommitted)
- **Commit**: ac07bee (plus the uncommitted `holdPageTurns` / Meet Josh exit work in the working tree)
- **Severity**: HIGH
- **Category**: Purpose & frequency (page transition feel)
- **Estimated scope**: 2 files (`script.js` ~10 lines, `styles.css` ~12 lines)

## Problem

The turn between Meet Josh and Experience should feel like a **page transition**: one page empties, and the next one takes its place without moving. Right now it reads as scrolling down, for two reasons:

1. **The turn travels.** After the held exit, both directions glide the document with a smooth scroll, so the two sections physically slide past each other:

```js
/* script.js:1515-1516 — current (Meet Josh → Experience) */
exitTimer = setTimeout(() => {
  window.scrollTo({ top: to, behavior: 'smooth' });
```

```js
/* script.js:1927-1928 — current (Experience → Meet Josh, and Experience → Education) */
exitTimer = setTimeout(() => {
  window.scrollTo({ top: to, behavior: 'smooth' });
```

2. **The exits are tuned to finish mid-scroll.** The scroll starts at 320 ms, but the slowest exit pieces end later: Meet Josh's title fill at 140 + 500 = 640 ms, its rule at 180 + 400 = 580 ms. Experience's rule also ends at 580 ms, and its last job fades at 50 + 4×30 + 250 = 420 ms. The comments say so on purpose ("so it clears while the page is still turning", `styles.css:1186`). That hides the exit behind motion, which is exactly the motion we now want to remove.

```css
/* styles.css:949-955 — current */
.about-motion.is-arrived .about-hero.is-leaving .about-resume { transition: opacity .25s var(--ease-out), transform .25s var(--ease-out); }
.about-motion.is-arrived .about-hero.is-leaving .about-lead { transition: opacity .25s var(--ease-out) .05s, transform .25s var(--ease-out) .05s; }
.about-motion.is-arrived .about-hero.is-leaving .about-title-line { --about-fill: 0; transition: --about-fill .5s var(--ease-out) .14s; }
.about-motion.is-arrived .about-hero.is-leaving .about-title-strong { transition-delay: .08s; }
.about-motion.is-arrived .about-hero.is-leaving .about-rule::after { transform: scaleX(0); transition: transform .4s var(--ease-out) .18s; }
.about-motion.is-arrived .about-hero.is-leaving .about-scene { opacity: 0; scale: 1.02; transition: opacity .4s var(--ease-out) .1s, scale .4s var(--ease-out) .1s; }
```

```css
/* styles.css:1190-1194 — current */
.core-motion.is-entered.is-leaving .core-reading { clip-path: inset(100% 0 0 0); transition: clip-path .4s var(--ease-out); }
.core-motion.is-entered.is-leaving .core-subject { opacity: 0; transition: color var(--press-out) var(--ease-out), opacity .25s var(--ease-out) calc(.05s + (var(--n, 1) - 1 - var(--i, 0)) * 30ms); }
.core-motion.is-entered.is-leaving .core-rail { opacity: 0; transition: opacity .25s var(--ease-out) .1s; }
.core-motion.is-entered.is-leaving .about-title-line { --about-fill: 0; transition: --about-fill .5s var(--ease-out) .12s; }
.core-motion.is-entered.is-leaving .about-rule::after { transform: scaleX(0); transition: transform .4s var(--ease-out) .18s; }
```

## Target

A held turn between Meet Josh and Experience is an **exit → cut → entrance**:

1. The leaving section plays its exit. The exit is compressed so **every piece has finished by 340 ms**.
2. At **360 ms**, the page jumps to the other section's stop with `behavior: 'instant'`. Nothing moves on screen: the emptied page is replaced by the next one, which is still un-entered (title outline only, fill empty, card clipped).
3. The existing IntersectionObservers do the rest, unchanged. The arriving section crosses 35 % visibility immediately and plays its normal entrance (`is-entered` for Experience; removing `is-away` for Meet Josh). The section that left goes fully off screen and resets (`is-away` / removes `is-entered`).

Only the Meet Josh ↔ Experience boundary cuts. Experience → Education keeps its smooth scroll (out of scope). It does pick up the tighter Experience exit, which is harmless because it only clears earlier.

The exit timings use the existing `--ease-out: cubic-bezier(.23, 1, .32, 1)` token (`styles.css:54`). Ease-out stays right for exits that respond to the user's flick.

```css
/* target — styles.css, Meet Josh leaving (all pieces end ≤ 340 ms) */
.about-motion.is-arrived .about-hero.is-leaving .about-resume { transition: opacity .25s var(--ease-out), transform .25s var(--ease-out); }
.about-motion.is-arrived .about-hero.is-leaving .about-lead { transition: opacity .25s var(--ease-out) .05s, transform .25s var(--ease-out) .05s; }
.about-motion.is-arrived .about-hero.is-leaving .about-title-line { --about-fill: 0; transition: --about-fill .28s var(--ease-out) .06s; }
.about-motion.is-arrived .about-hero.is-leaving .about-title-strong { transition-delay: 0s; }
.about-motion.is-arrived .about-hero.is-leaving .about-rule::after { transform: scaleX(0); transition: transform .28s var(--ease-out) .06s; }
.about-motion.is-arrived .about-hero.is-leaving .about-scene { opacity: 0; scale: 1.02; transition: opacity .3s var(--ease-out) .04s, scale .3s var(--ease-out) .04s; }
```

```css
/* target — styles.css, Experience leaving (all pieces end ≤ 340 ms with 5 jobs) */
.core-motion.is-entered.is-leaving .core-reading { clip-path: inset(100% 0 0 0); transition: clip-path .3s var(--ease-out); }
.core-motion.is-entered.is-leaving .core-subject { opacity: 0; transition: color var(--press-out) var(--ease-out), opacity .2s var(--ease-out) calc(.05s + (var(--n, 1) - 1 - var(--i, 0)) * 20ms); }
.core-motion.is-entered.is-leaving .core-rail { opacity: 0; transition: opacity .2s var(--ease-out) .08s; }
.core-motion.is-entered.is-leaving .about-title-line { --about-fill: 0; transition: --about-fill .28s var(--ease-out) .06s; }
.core-motion.is-entered.is-leaving .about-rule::after { transform: scaleX(0); transition: transform .28s var(--ease-out) .06s; }
```

## Repo conventions to follow

- `behavior: 'instant'` is already how the fold jumps the document, e.g. `script.js:981`: `window.scrollTo({ top: to, behavior: 'instant' });`. Use `'instant'`, not `'auto'`.
- Comments are full sentences explaining *why*, in the voice of the surrounding ones. Update the two CSS comments whose claim this plan makes false.
- `aboutStop` (`script.js:1204`) is Meet Josh's resting offset. Use it to tell whether Experience's up-turn is going to Meet Josh.

## Steps

1. **`script.js`, Meet Josh's held turn (~line 1513).** Change the exit wait from `320` to `360`, and change the scroll to cut:
   ```js
   exitTimer = setTimeout(() => {
     // The turn cuts rather than travels: the exit has cleared the page, so
     // Experience takes its place without the two sliding past each other.
     window.scrollTo({ top: to, behavior: 'instant' });
     // A turn that never got away hands Meet Josh back.
     exitTimer = setTimeout(() => {
       if (Math.abs(window.scrollY - edge) > 2) return;
       turning = false;
       meet.classList.remove('is-leaving');
     }, 1200);
   }, 360);
   ```
   Also update the comment above `holdPageTurns(` at ~line 1502 ("The turn to Experience is a snap too quick…"). It should say the page holds for the exit, then cuts to Experience.

2. **`script.js`, Experience's held turn (~line 1924).** Cut only when the target is Meet Josh; keep the smooth scroll toward Education:
   ```js
   holdPageTurns(leaveTarget, (to, edge) => {
     section.classList.add('is-leaving');
     clearTimeout(exitTimer);
     // Back up to Meet Josh cuts once the exit has cleared, the way Meet Josh
     // cuts down to it; on to Education still scrolls.
     const cut = Math.abs(to - aboutStop) <= 2;
     exitTimer = setTimeout(() => {
       window.scrollTo({ top: to, behavior: cut ? 'instant' : 'smooth' });
       // A turn that never got away hands the section back.
       exitTimer = setTimeout(() => {
         if (Math.abs(window.scrollY - edge) <= 2) section.classList.remove('is-leaving');
       }, 1200);
     }, cut ? 360 : 320);
   });
   ```

3. **`styles.css:949-955`.** Replace the Meet Josh leaving rules with the target block above. Replace the comment at `styles.css:945-948` with:
   ```css
   /* Leaving for Experience runs the entrance backwards and quicker, and has
      cleared by the time the page cuts to Experience: the buttons and lead
      lift away first, the title empties last line first, the rule draws back
      in and the scene fades. */
   ```

4. **`styles.css:1190-1194`.** Replace the Experience leaving rules with the target block above. Replace the comment at `styles.css:1186-1189` with:
   ```css
   /* Leaving, in either direction, runs the entrance backwards and quicker, so
      the page is empty before it turns: the card wipes back down, the jobs
      fade last one first, the heading empties and the rule draws back in.
      These are transitions, so scrolling back mid-exit simply returns them. */
   ```

## Boundaries

- Do NOT touch `projects.html`, Home, the fold (`section-folding` code), or Home's cartoon.
- Do NOT change Education's turns or its CSS.
- Do NOT change the entrance (`is-entered` / `is-away` removal) timings; the arriving page should play exactly as it does today.
- Do NOT change `holdPageTurns` itself.
- If the cited lines don't match (drift since this plan), STOP and report.

## Verification

- **Mechanical**: `node --check script.js` passes. Serve with `python3 -m http.server 8765`, then `node plans/006-meet-probe.mjs` still shows no `is-leaving` on Meet Josh at rest after the fold lands.
- **Feel check** (Chrome, `http://localhost:8765/about_me.html`, trackpad and mouse wheel):
  - One flick down from Meet Josh: the copy lifts away, the title empties, and the scene fades. Then Experience's outline title and eyebrow appear **in place** with no vertical travel, and its entrance plays (rule draws, title fills, jobs fade in, card wipes up).
  - From Experience's first job, one flick up: Experience empties, then Meet Josh appears in place and its title and scene fill back in.
  - DevTools → Animations → 10 %: confirm no exit piece is still running when the cut happens, i.e. no half-filled title or half-clipped card is visible at the jump.
  - Rapid double flick: the momentum is swallowed, with exactly one turn and no second cut past Experience.
  - Experience's last job → flick down still **scrolls** to Education (unchanged path).
  - Rendering → `prefers-reduced-motion: reduce`: no held turns are registered (existing gate). Snap turns behave as before.
- **Done when**: Meet Josh ↔ Experience never shows the two sections moving on screen together, and both exits are fully cleared at the cut.
