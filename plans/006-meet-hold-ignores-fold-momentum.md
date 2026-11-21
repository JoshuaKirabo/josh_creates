# 006 — Keep Meet Josh's page-turn hold off the fold's momentum

- **Status**: DONE (uncommitted)
- **Commit**: 5cf904a (plus the uncommitted Meet Josh `is-leaving` exit and `holdPageTurns` helper in the working tree)
- **Severity**: HIGH
- **Category**: Interruptibility
- **Estimated scope**: 1 file (`script.js`), ~25 lines

## Problem

When you scroll down from Meet Josh, the workspace illustration (`.about-scene`) fades out, fades back in, then fades out again. The copy and title flicker with it, but the scene is the largest surface, so it shows the most.

Reproduced in headless Chrome with real wheel input (`plans/006-meet-probe.mjs`). One flick from Home lands on Meet Josh already hidden:

```
fold flick log: {"m":[[1518,0,"about-hero is-leaving",true]], ...}   ← t, scrollY, class, section-folding
at meet: {"y":812,"meet":"about-hero is-leaving"}
```

Chain of events:

1. The fold from Home runs as a spring and writes the document scroll only when it completes, so `scrollY` stays `0` while it is in flight.
2. Meet Josh's hold (`script.js:1305`) accepts **any** page stop as a resting point, and `0` (Home's stop) is one. Its capture-phase wheel listener runs before the fold's own listener, so it claims the fold flick's momentum tail and calls `leave(812, 0)`: Meet Josh gets `is-leaving` mid-fold.
3. The hand-back only fires when `scrollY` is still at the `edge` (`0`). The fold lands at `812`, so the hand-back never fires, and **Meet Josh sits at rest with `is-leaving` on, hidden**.
4. On the next flick down, the hold refuses (`is-leaving` is already set), so the wheel scrolls natively and snap mandatory bounces the page back. The observer reads that bounce as "rising" and removes `is-leaving`, so the scene fades in. The hold then claims the next event and fades it out again, and the turn itself can repeat the removal once more. That is the flicker.

```js
/* script.js:1305-1310 — current */
holdPageTurns((direction) => {
  if (direction < 0 || meet.getBoundingClientRect().top < 0 || !about.classList.contains('is-arrived') || meet.classList.contains('is-away') || meet.classList.contains('is-leaving')) return;
  const y = window.scrollY;
  const stops = pageStops();
  if (!stops.some(top => Math.abs(top - y) <= 2)) return;
  return stops.find(top => top > y + 2);
}, (to, edge) => {
```

```js
/* script.js:1210-1222 — current (shared helper, also used by Experience) */
function holdPageTurns(target, leave) {
  const gesture = { time: -Infinity, direction: 0, distance: 0, owned: false };
  const claim = (direction, distance, now) => {
    if (now - gesture.time > 180 || direction !== gesture.direction) {
      gesture.owned = gesture.owned && now - gesture.time <= 180;
      gesture.distance = 0;
    }
    gesture.time = now;
    gesture.direction = direction;
    if (gesture.owned) return true;
    const to = target(direction);
    if (to === undefined) return false;
```

## Target

Two guards, both needed:

1. **Meet Josh's own resting place only.** The hold may turn the page only when the page is at rest at Meet Josh's stop (the fold distance, `aboutTop` in `initAboutPages`), never at Home's `0`, and never while the fold is in flight (`html.section-folding`).
2. **Fresh gestures only, for Meet Josh.** The fold swallows its flick's momentum tail after landing (`script.js:1037-1040`, "Keep consuming the tail of an accepted flick after landing"). Meet Josh's hold must not turn that tail into a page turn. A gesture may start a held turn only if `target()` accepted it **from its first event**. A gesture that began anywhere else (mid-fold, mid-snap) is ignored until a pause of more than 180ms starts a new gesture. This is opt-in so Experience behaves exactly as it does today.

Timing values are unchanged: 320ms hold, 1200ms hand-back, 12px claim threshold, 180ms gesture gap.

## Repo conventions to follow

- Module-level stop state lives beside `coreJobStops` (`script.js:1198-1200`) and is written in `initAboutPages().place()`. Add `aboutStop` the same way.
- The fold marks its flight with `root.classList.toggle('section-folding', folding)` (`script.js:811`). Read the class; don't add new state.
- Comments are full sentences explaining *why*, in the file's voice (see `script.js:1202-1209`).

## Steps

1. Below `let coreJobStops = [];` (`script.js:1200`) add:
   ```js

   // Where Meet Josh rests: the fold distance, or About's own top without the
   // fold.
   let aboutStop = 0;
   ```
2. In `initAboutPages().place()`, directly after the `const aboutTop = folded ? … : …;` statement (`script.js:1723-1725`), add:
   ```js
       aboutStop = Math.round(aboutTop);
   ```
3. Change the helper's signature and claim logic (`script.js:1210-1222`) to:
   ```js
   function holdPageTurns(target, leave, { fresh = false } = {}) {
     const gesture = { time: -Infinity, direction: 0, distance: 0, owned: false, eligible: true };
     // Returns true when this movement belongs to the exit and must not scroll.
     const claim = (direction, distance, now) => {
       if (now - gesture.time > 180 || direction !== gesture.direction) {
         gesture.owned = gesture.owned && now - gesture.time <= 180;
         gesture.distance = 0;
         gesture.eligible = true;
       }
       gesture.time = now;
       gesture.direction = direction;
       if (gesture.owned) return true;
       const to = gesture.eligible ? target(direction) : undefined;
       if (to === undefined) {
         // With `fresh`, a gesture that began somewhere this section does not
         // own (the fold's momentum, a snap in flight) never turns into an
         // exit when it reaches it; the next flick does.
         if (fresh) gesture.eligible = false;
         return false;
       }
   ```
   Leave the rest of `claim` (distance accumulation, `gesture.owned = true`, `leave(to, window.scrollY)`) and both listeners unchanged. Add one sentence to the helper's header comment: "With `fresh`, only a gesture that started at the resting place can turn it."
4. Replace Meet Josh's `target` function (`script.js:1305-1310`) with:
   ```js
   holdPageTurns((direction) => {
     const y = window.scrollY;
     // Only from Meet Josh's own resting place: while the fold is landing the
     // document still reads Home's 0, which is a page stop too.
     if (direction < 0 || root.classList.contains('section-folding') || Math.abs(y - aboutStop) > 2 ||
       !about.classList.contains('is-arrived') || meet.classList.contains('is-away') || meet.classList.contains('is-leaving')) return;
     return pageStops().find(top => top > y + 2);
   }, (to, edge) => {
   ```
   and pass the option as the third argument at the call's closing `});` → `}, { fresh: true });`. `root` is already defined at the top of `initAboutContent` (`const root = document.documentElement;`).

## Boundaries

- Do NOT change Experience's `holdPageTurns(...)` call. It must keep the default (`fresh: false`).
- Do NOT change any CSS, any duration, or the Meet Josh `IntersectionObserver` logic.
- Do NOT touch the fold's wheel/touch listeners (`script.js:1023+`).
- Do NOT touch `projects.html`.
- If any quoted "current" code does not match what you find, STOP and report.

## Verification

- **Mechanical**:
  - `node --check script.js` exits 0.
  - `node --test tests/section-scroll.test.cjs` → `pass 43`, `fail 0`.
  - Bump the cache key `script.js?v=about20` → `about21` in `index.html` and `about_me.html`.
  - Serve the repo root on port 8765 (`python3 -m http.server 8765`) and run `node plans/006-meet-probe.mjs`. Expected: `fold flick log` shows **no** `is-leaving` entry, `at meet` shows `"meet":"about-hero"`, and in the frame table `is-leaving` appears **once**, followed by `is-away is-returning`, with the scene opacity column going `1.00 → 0.00` once and never climbing back while `is-leaving` is off.
- **Feel check** (real trackpad, visible window):
  - One hard flick from Home: the fold lands on Meet Josh and the scene, title and copy **stay**. The page does not start leaving.
  - Pause, then flick down: the exit plays once (buttons and lead lift, title empties, scene fades), the page holds about 320ms, then turns. The scene never fades back in mid-turn.
  - Flick down while the fold is still landing: it lands and stays on Meet Josh; a new flick is needed to leave.
  - Experience: flicking past its last job still holds and turns exactly as before, including a flick that arrives at the last job still moving.
- **Done when**: the probe shows a single `is-leaving` → `is-away` sequence with no re-entry, and the flick-from-Home check leaves Meet Josh visible.

## Executed

Steps 1–4 applied as written; cache key bumped to `about22`. The probe then showed one more re-entry mid-turn: the Meet Josh observer's last reading at rest was stale, so its first reading on the way out looked like a return and dropped `is-leaving`. Added a `turning` flag in `initAboutContent`: `leave` sets it, and it clears when Meet Josh goes `is-away` or is handed back. While it is set, the observer never removes `is-leaving`. Probe after the fix: one `is-leaving` → `is-away`, and the scene fades `1.00 → 0.00` once.

Unrelated, and on HEAD too: about one in four probe runs, the flick from Home lands at `scrollY ≈ 7520` instead of Meet Josh. Not investigated here.
