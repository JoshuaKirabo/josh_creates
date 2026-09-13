# JOSH

Joshua Kirabo’s portfolio. Plain HTML, CSS and JavaScript, with no frameworks or runtime dependencies.

Open `index.html` directly, or serve this directory with any static web server.

- `index.html` — homepage content
- `styles.css` — layout, responsive styles and reduced-motion support
- `script.js` — subtle pointer motion and current year
- `assets/josh_homepage_portrait.png` — temporary AI-generated portrait, with the transparent iOS cutout supplied by Joshua

The opening composition is inspired by https://heynesh.com/. Copy, branding and implementation are written for Josh; project links point to Joshua’s GitHub profile. The biography is draft copy for this first visual direction. Contact currently points to GitHub until a preferred contact address is supplied.

For the private Sites preview, copy `index.html`, `styles.css`, `script.js`, and `assets/` into `dist/`. No compilation is needed.

## Cartoon portrait experiment

The homepage currently uses `assets/josh_portrait_cartoon_bw.png`, with a separate luminance mask for the silhouette. The original `assets/josh_homepage_portrait.png` is unchanged.

To restore the original, replace the three cartoon image references in `index.html` with `assets/josh_homepage_portrait.png`, remove `portrait-cartoon` from the two image classes, and restore their dimensions to 980 × 1494 and original alt text. Then refresh `dist/`.

Created with built-in image generation. Brief: apply the supplied cartoon reference’s bold outlines and cel shading to Joshua’s portrait, preserving his face, glasses, hairstyle, pose and shirt; use neutral black, white and gray only. A separate generated silhouette mask removes the black backdrop in the page.
