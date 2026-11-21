# 002 — Drop the filtered portrait from the fold paint path

- **Status**: DONE
- **Commit**: 93bcc7e
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 2 files (`styles.css`, `script.js`)

## Problem

Every fold frame translates and fades `.portrait-scroll`, which contains a 190%-tall SVG with luminance/alpha masks and `feColorMatrix`, then a redundant CSS `filter: grayscale(1)` on an already black-and-white PNG (`assets/josh_portrait_cartoon_bw.png`). Filters on a moving layer take the paint path, not the compositor. That hitch sits on top of the word travel.

```css
/* styles.css:262 — current */
.portrait-cartoon { filter: grayscale(1); }
```

```css
/* styles.css:127 — current */
.portrait { position: absolute; top: 0; left: 50%; z-index: 1; width: auto; max-width: none; height: 190%; transform: translateX(-50%); object-fit: contain; object-position: center top; }
```

```js
/* script.js:702-703 — current */
portrait.style.transform = `translateY(${-10 * leaving}%)`;
fade(portrait, 1 - leaving);
```

## Target

Remove the redundant CSS grayscale. Keep the SVG shading masks — they are the illustration, not a fold effect. Move the fold with `translate3d` so it stays on the compositor with the word layers.

```css
/* target: delete the .portrait-cartoon { filter: grayscale(1); } rule entirely */
```

```js
/* target */
portrait.style.transform = `translate3d(0, ${-10 * leaving}%, 0)`;
fade(portrait, 1 - leaving);
```

Do not change the leaving window (`smooth(slice(progress, 0, .42))`), the `-10%` travel, or the fade. Those are already the “clear the portrait ahead of the words” design.

## Repo conventions to follow

- Fold movers already write `translate3d(..., 0) scale(...)` in `applyFold` (`script.js:594-596`). Match that string shape.
- The PNG is already `_bw`. Do not replace the SVG with a new asset in this plan.
- Reduced motion already skips this paint via `releaseTransition()`. Leave that.

## Steps

1. Delete `.portrait-cartoon { filter: grayscale(1); }` from `styles.css`.
2. In `script.js` `paint()`, change the portrait transform to `translate3d(0, ${-10 * leaving}%, 0)`.
3. Do not add `will-change` — `.portrait-scroll` already has `will-change: transform, opacity` under `.section-scroll-ready`.

## Boundaries

- Do NOT flatten the SVG to a bitmap.
- Do NOT remove `#portrait-cutout`, `#portrait-shading`, or `feColorMatrix` (those are the still illustration).
- Do NOT animate `filter` or `blur` on the portrait during the fold.
- Do NOT change intro portrait WAAPI (scale/blur on `.portrait-stage` in `playIntro`).
- Do NOT change `--ease-*` tokens.

## Verification

- **Mechanical**: `node --test tests/section-scroll.test.cjs` exits 0. Grep: no `filter: grayscale` on `.portrait-cartoon`; fold paint uses `translate3d` for the portrait.
- **Feel check**: play the intro, then fold Home → About.
  - Portrait still reads as the same B&W cartoon (the PNG is already grayscale).
  - It eases out in the first ~42% of the fold, same as today, without a paint hitch under the words.
  - In DevTools Layers / Performance, the leaving portrait should not show per-frame filter paints from `grayscale`.
  - `prefers-reduced-motion`: portrait stays in flow, no fold transform.
- **Done when**: CSS grayscale is gone; fold portrait transform is `translate3d`; illustration looks unchanged.
