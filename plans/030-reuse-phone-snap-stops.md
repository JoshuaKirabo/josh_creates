# 030 — Reuse phone snap stops

- Status: DONE
- Commit: 0b1c471
- Severity: HIGH
- Category: Performance
- Scope: mobile portfolio scrolling in `script.js` and focused regression coverage.

## Problem

`script.js:7720` currently uses

```js
for(const node of document.body.querySelectorAll('*'))
```

## Target and implementation

Keep the full-document style walk out of release. Reuse snap candidates or cached positions, accounting for responsive snap enablement, font and layout changes, generated markers, nested scrollers, tall snap areas and project detail pages. Preserve existing stop-always rules, 500 ms coast constant and exact endpoints.

## Conventions and boundaries

Follow the current touch and reduced-motion branches in `script.js`. Preserve keyboard and desktop input, no new dependencies.

## Verification

Run `node --test tests/*.test.cjs` and compare the suite against the baseline. Flick to adjacent stops in both directions in all three sections and after rotating. Confirm release performs no full-document style scan.
