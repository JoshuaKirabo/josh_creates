# Animation plans

Home → About fold stutter. Execute in order; every plan edits `script.js`.

| # | Title | Severity | Status | Depends on |
| --- | --- | --- | --- | --- |
| 001 | Paint the fold without per-frame scrollTo | HIGH | DONE | — |
| 002 | Drop the filtered portrait from the fold paint path | HIGH | DONE | — |
| 003 | Defer fold remasure until rest | MEDIUM | DONE | 001 |
| 004 | Freeze fold chrome until landing | MEDIUM | DONE | 001 |
| 005 | Stop transforming the About section | MEDIUM | DONE | — |
| 006 | Keep Meet Josh's page-turn hold off the fold's momentum | HIGH | DONE | — |
| 007 | Reset Education when its held turn lands | HIGH | DONE | — |
| 008 | Swap Meet Josh and Experience in place instead of scrolling between them | HIGH | DONE | 006 |
| 009 | Carry the headings across the Meet Josh ↔ Experience cut | HIGH | TODO | 008 |
| 010 | Step the Projects track one card per gesture on a spring | HIGH | DONE (uncommitted) | — |
| 011 | Fade Meet Josh and Experience all the way out and in from zero | HIGH | DONE | 008 |
| 012 | Redraw How it works on every arrival | HIGH | DONE | — |
| 013 | Give the story column its own handover | HIGH | DONE | — |
| 014 | Swap the NextStep hero and How it works in place instead of gliding | HIGH | DONE | 012, 013 |
| 015 | Bring the diagram box and the Experience card in through a soft, rising edge | HIGH | DONE | 008, 014 |
| 016 | Make "Back to projects" an exit, then Projects' entrance | HIGH | DONE | 014, 015 |
| 017 | Bring the top bar back in with Projects when the sheet closes | MEDIUM | DONE | 016 |
| 018 | Open a project as Projects' exit, then the sheet's entrance | HIGH | DONE | 016, 017 |
| 019 | Give "Back to projects" room: exit, then clear, then Projects | MEDIUM | DONE | 016, 018 |
| 020 | Clear all of Projects before cutting to Skills | HIGH | DONE (uncommitted) | — |
| 021 | Have Skills loaded before the cut | HIGH | DONE (uncommitted) | — |
| 022 | Keep the scrollbar's space on every page | MEDIUM | DONE (uncommitted) | — |
| 024 | Let phones scroll up out of Experience instead of holding and cutting | HIGH | SUPERSEDED (phones got a designed return instead) | — |

006 fixes the Meet Josh scene flicker on the way down. Its probe, `006-meet-probe.mjs`, drives headless Chrome with real wheel input; run it with the site served on port 8765.

007 fixes Education coming back blank after a held turn down to Projects. It touches only Education's block in `script.js` and runs independently of 001–006.

008 makes the Meet Josh ↔ Experience turn a page transition: the held exit clears, then the page cuts (instant scroll) and the next section plays its entrance. It touches Meet Josh's and Experience's held turns in `script.js` and their exit CSS in `styles.css`.

009 softens 008's cut: the eyebrow and title leave with the page and the next ones arrive from the side it came from, so the cut lands on an empty screen. `styles.css` plus Experience's observer in `script.js`.

010 fixes the Projects track shaking between cards: wheel/trackpad gestures step one card on a critically damped spring instead of fighting native snap. It adds a `wheelOnly` option to `holdPageTurns`. Independent of 009.

011 is the opacity-only half of 009: it fades each section's eyebrow and title outline to 0 before the cut and up from 0 after it. Applying 009 on top makes 011 redundant; drop 011's rules then.

020–022 fix the Projects → Skills turn. 020 adds the eyebrow text and card rail to Projects' exit and holds a 60 ms empty beat before the cut. 021 prefetches `skills.html` from the last card and gives every page one stylesheet version, so the cut doesn't wait on the network. 022 reserves the scrollbar gutter so the top bar doesn't jump 15 px when Skills (which doesn't scroll) loads. They're independent, but each one bumps the stylesheet version: run **021 → 020 → 022** so the later two bump the shared `?v=` that 021 sets.

023 (applied directly, no plan file) is the follow-up after 020–022 still felt rough. A frame recording showed a 94 ms freeze on Skills' first entrance frame: the points field built its first solid (`buildCraftForm('frontend')`, ~90 ms) lazily inside the first `tick`. It is now built in `initCraftField` before first paint, so the cost lands on the blank frame instead of the heading's fill. The turn navigates at 320 ms (the end of the exit) instead of 380, because Skills' own load is the empty beat now. The top-bar underline hands over too, via `nav-line-leave` / `nav-line-enter` (+ `nav-line-back` for Skills → Projects), with a `skills-from` session flag. Skills now shows a real scrollbar (`html:has(.craft-section) { overflow-y: scroll; }`), not just 022's blank gutter. The star field carries across page loads through a `grain-state` session entry that holds the seeds, each layer's drift clock and the parallax offset. After a turn (<3 s) the next page paints the same sky at the same point and at full speed, instead of a new random sky ramping up from rest. The pre-paint grain fallback was `background-grain.png`, an opaque tile averaging 54/255 and scaled 1.9×. It read as TV static on every reload or turn until the canvas painted. It is now `assets/grain-fallback.png`, generated to match the canvas's base layer (black/white noise, alpha round(s²·48), ×.85 over #060606, 1:1). Arriving from a Projects ↔ Skills turn, the page also spends the trackpad's momentum tail (`turn-arrival` session flag, a capture wheel listener registered first) until a 180 ms gap or a reversal, so the tail can't step the Projects track back a card.

Recommended order: **001 → 002 → 003 → 004 → 005**.

001 and 002 are the stutter. 003–005 remove mid-trip style/layout work on the same paint.

`execute` runs in this working tree (not a clean HEAD worktree) because the audited fold already includes uncommitted nav-label / page-shell wiring.

012 and 013 are the NextStep project page (`projects/next_step.html`). 012 makes the How it works figure draw itself on every arrival, not just the first; `script.js` only. 013 splits the hero's exit into two chains that start together: the title side keeps its lift through clips, the story dissolves (fade, 10px rise, blur) in reading order. `script.js` + `styles.css`. Independent of each other; either order.

014 turns the NextStep page's wheel turns into page transitions like About's (008): the leaving section's exit plays in place, the page cuts instantly at 380 ms, and the next section plays its entrance where the last stood. It shortens the hero's exit so it clears before the cut. `script.js` (`initProjectPaging`) + `styles.css` (the handover's leaving rules). Apply after 012 and 013.

015 fixes the two big boxes that "just appear" after a cut. How it works' sheet never animated its clip (`inset()` → `none` can't interpolate), and Experience's card was a hard, front-loaded wipe on a bright slab. Both now rise through a feathered mask driven by a registered `--sheet-reveal`. `styles.css` only; exit timings stay inside 008's and 014's cut windows.

016 fixes closing the project sheet. The on-screen section (hero or How it works) plays its exit, the sheet fades after 180 ms, and Projects un-hides at the same moment and replays its own entrance (title rise, cards slide in). `script.js` only.

017 adds the top bar to 016's return. The wordmark and links drop in from above 30 ms apart and the current page's underline redraws. The bar's background and gradient are untouched. `styles.css` + `showProjects` in `script.js`.

018 is the mirror of 016/017 for opening. Projects' title lifts, the cards slide on left, the clicked card brightens and leaves last, and the top bar's links lift out (320 ms, in parallel with the fetch). Then the sheet cuts in, its title lines drop in through their clips and Back rises. `script.js` (`initProjectSheet`) + `styles.css`.

019 retimes 016's close into three beats: the exit alone (with Back lifting out) for 0–370 ms, the sheet fading from 360 ms over 280 ms, and Projects returning from 400 ms.

024 is for phones only: swiping up from Experience's first job held the page, then cut to a Meet Josh that has no entrance there. It makes that swipe an ordinary scroll, as the swipe down already is. Desktop keeps its hold and cut.

### Survey ETL architecture

| Plan | Severity | Status | Depends on |
| --- | --- | --- | --- |
| [025 · Time the survey batch](025-time-the-survey-batch.md) | Medium | TODO | — |
| [026 · Give the batch a directional trail](026-trail-the-survey-batch.md) | Medium | TODO | 025 |
| [027 · Show PySpark flattening repeated answers](027-animate-flattening-in-databricks.md) | Low | TODO | 025 |
| [028 · Sequence the Databricks handoffs](028-sequence-databricks-handoffs.md) | High | DONE | Current 17-second diagram |
| [033 · Restore the file entering each receiver](033-restore-file-entry.md) | High | DONE | 53-second diagram |

Apply 025 first to set the playback clock. Then add the trail and the processing cue in order. Verify the one-screen fit from the article’s architecture link after each change.

033 restores file entry in the 53-second walkthrough.

### Mobile portfolio scrolling

029–031 handle phone gestures. 032 prepares the Skills illustration during scrolling.

| Plan | Status |
| --- | --- |
| [029 · Keep the first phone drag](029-keep-the-first-phone-drag.md) | DONE |
| [030 · Reuse phone snap stops](030-reuse-phone-snap-stops.md) | DONE |
| [031 · Recognise new phone swipes](031-recognise-new-phone-swipes.md) | DONE |
| [032 · Prepare mobile skill shapes](032-prepare-mobile-skill-shapes.md) | DONE |
