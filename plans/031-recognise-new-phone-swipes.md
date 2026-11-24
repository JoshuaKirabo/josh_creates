# 031 — Recognise new phone swipes

- Status: DONE
- Commit: 0b1c471
- Severity: HIGH
- Category: Interruptibility
- Scope: mobile portfolio scrolling in `script.js` and focused regression coverage.

## Problem

`script.js:1945` currently uses

```js
const fresh = now - gesture.time > 180 || (Math.sign(dy) !== gesture.direction && !gesture.owned);
```

## Target and implementation

In the touch branch of holdPageTurns scope ownership to one physical contact. On phones establish a vertical axis first. Keep the 12 px turn threshold, late handoff from scrollable job copy, fresh-only arrival rules and wheel behaviour.

## Conventions and boundaries

Follow the current touch and reduced-motion branches in `script.js`. Preserve keyboard and desktop input, no new dependencies.

## Verification

Run `node --test tests/*.test.cjs` and compare the suite against the baseline. At the Projects to Skills boundary, swipe 100 px sideways and 13 px vertically. The page stays put. A fresh vertical swipe turns once. Test rapid follow-up contact and pinch.
