# 032 — Prepare mobile skill shapes

- Status: DONE
- Commit: 0b1c471
- Severity: MEDIUM
- Category: Performance
- Scope: mobile portfolio scrolling in `script.js` and focused regression coverage.

## Problem

`script.js:3374` currently uses

```js
const goal = form(shape);
```

## Target and implementation

Prepare phone shape geometry away from the scrolling/rendering critical path. Update selected text and rail on selection immediately. Preserve all nine forms, the existing .55 second particle spring, reduced motion, and desktop presentation.

## Conventions and boundaries

Follow the current touch and reduced-motion branches in `script.js`. Preserve keyboard and desktop input, no new dependencies.

## Verification

Run `node --test tests/*.test.cjs` and compare the suite against the baseline. Direct-load Skills on a phone, then move rapidly across several disciplines before warm-up completes. Verify latest caption and shape agree, including after reversing and with reduced motion.
