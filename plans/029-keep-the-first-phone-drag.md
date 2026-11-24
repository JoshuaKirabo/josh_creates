# 029 — Keep the first phone drag

- Status: DONE
- Commit: 0b1c471
- Severity: HIGH
- Category: Physicality
- Scope: mobile portfolio scrolling in `script.js` and focused regression coverage.

## Problem

`script.js:7868` currently uses

```js
gesture.fingerY = point.clientY;
```

## Target and implementation

When a vertical drag crosses the existing 6 px threshold, move by the full displacement from touch-down immediately. Keep the scroll position at axis acquisition as the baseline. Preserve catching a running glide, tap, pinch, nested copy scrolling and the toolbar behaviour.

## Conventions and boundaries

Follow the current touch and reduced-motion branches in `script.js`. Preserve keyboard and desktop input, no new dependencies.

## Verification

Run `node --test tests/*.test.cjs` and compare the suite against the baseline. Drag 20 px and another 20 px in Projects. The rail should travel on the first movement and keep pace through reversal.

The browser check also exposed resize restoration putting the page back on its previous stop during a drag. The resize handler now yields while the phone owns the scroll, then records its landing. A 24 px drag advanced all three sections by 24 px in the phone preview.
