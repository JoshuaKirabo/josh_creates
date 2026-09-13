# JOSH

Joshua Kirabo’s portfolio. Plain HTML, CSS and JavaScript, with no frameworks or runtime dependencies.

Open `index.html` directly, or serve this directory with any static web server.

- `index.html` — homepage content
- `styles.css` — layout, responsive styles and reduced-motion support
- `script.js` — name-first load sequence, navigation hover and current year
- `assets/josh_homepage_portrait.png` — temporary AI-generated portrait, with the transparent iOS cutout supplied by Joshua

The opening composition is inspired by https://heynesh.com/. Copy, branding and implementation are written for Josh; project links point to Joshua’s GitHub profile. The biography is draft copy for this first visual direction. Contact currently points to GitHub until a preferred contact address is supplied.

For the private Sites preview, copy `index.html`, `styles.css`, `script.js`, and `assets/` into `dist/`. No compilation is needed.

## Cartoon portrait experiment

The homepage currently uses `assets/josh_portrait_cartoon_bw.png`, with a separate luminance mask for the silhouette. The original `assets/josh_homepage_portrait.png` is unchanged.

To restore the original, replace the three cartoon image references in `index.html` with `assets/josh_homepage_portrait.png`, remove `portrait-cartoon` from the two image classes, and restore their dimensions to 980 × 1494 and original alt text. Then refresh `dist/`.

Created with built-in image generation. Brief: apply the supplied cartoon reference’s bold outlines and cel shading to Joshua’s portrait, preserving his face, glasses, hairstyle, pose and shirt; use neutral black, white and gray only. A separate generated silhouette mask removes the black backdrop in the page.

## Opening animation

JOSH enters from the right at full size, with its letters rising 200 ms apart, then moves into the existing wordmark position. The portrait fades in at its fixed size and position at 1.4 s, heading at 1.7 s, navigation at 2 s, button at 2.65 s, and footer details at 3.05 s (after a 200 ms lead-in), matching the heynesh.com desktop sequence. The browser animation API samples the reference's power easing curves without adding dependencies. The same sequence adapts to mobile.

The original wordmark remains unchanged. Reduced motion, fragment links and restored scroll positions skip the intro; keyboard, scrolling and resizing finish it immediately. Without JavaScript the page remains visible, and an eight-second fallback prevents loading failures from hiding content.
