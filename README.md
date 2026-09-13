# JOSH

Joshua Kirabo’s homepage. Plain HTML, CSS and JavaScript, with no frameworks or runtime dependencies.

Open `index.html` directly, or serve this directory with any static web server.

- `index.html` — the single homepage, with working links to Joshua’s GitHub profile
- `styles.css` — viewport-sized layout, phone and landscape adaptations, and reduced-motion support
- `script.js` — name-first loading animation, navigation hover, and current year
- `assets/josh_portrait_cartoon_bw.png` and its mask — the current monochrome portrait

The homepage follows the available viewport height, including mobile browser controls and safe areas. The navigation, heading, button, and footer fit together without a scrolling page. The large portrait is intentionally cropped within the composition. Short landscape screens use a side-by-side layout.

Only the homepage is included. About and contact sections and their scrolling links have been removed. The existing GitHub destination serves the homepage’s profile, projects, and contact links.

The opening composition is inspired by https://heynesh.com/. Copy, branding and implementation are written for Josh. The original portrait is retained as source material for the homepage; the live page uses the cartoon version. Font licenses and grain attribution are stored beside their assets.

For the private Sites preview, copy `index.html`, `styles.css`, `script.js`, and the referenced assets into `dist/`. No compilation is needed.

## Opening animation

JOSH enters from the right at full size, with its letters rising 200 ms apart, then moves into the existing wordmark position. The portrait fades in at its fixed size and position at 1.4 s, heading at 1.7 s, navigation at 2 s, button at 2.65 s, and footer details at 3.05 s (after a 200 ms lead-in), matching the heynesh.com desktop sequence. The browser animation API samples the reference's power easing curves without adding dependencies. The same sequence adapts to mobile.

The static wordmark is restored after the animation. Reduced motion, fragment links and restored scroll positions skip the intro; keyboard, scrolling and resizing finish it immediately. Without JavaScript the page remains visible, and an eight-second fallback prevents loading failures from hiding content.
