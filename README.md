# JOSH

Joshua Kirabo’s homepage. Plain HTML, CSS and JavaScript, with no frameworks or runtime dependencies.

Open `index.html` directly, or serve this directory with any static web server.

- `index.html` — homepage and About section, with working profile links
- `styles.css` — viewport-sized layout, phone and landscape adaptations, and reduced-motion support
- `script.js` — name-first loading animation, navigation hover, and current year
- `assets/josh_portrait_cartoon_bw.png` and its mask — the current monochrome portrait

The homepage follows the available viewport height, including mobile browser controls and safe areas. The navigation, heading, button, and hero footer fit within the first screen. The large portrait is intentionally cropped within the composition. Short landscape screens use a side-by-side layout.

The About me link remains between Home and Projects and opens the original About section below the hero. Meet Josh opens the same section. Ask Josh remains on the right as a label for the planned chatbot. Projects and Let’s connect use the existing GitHub destination.

The opening composition is inspired by https://heynesh.com/. Copy, branding and implementation are written for Josh. The original portrait is retained as source material for the homepage; the live page uses the cartoon version. Font licenses and grain attribution are stored beside their assets.

For the private Sites preview, copy `index.html`, `styles.css`, `script.js`, and the referenced assets into `dist/`. No compilation is needed.

## Opening animation

JOSH enters from the right at full size, with its letters rising 200 ms apart, then moves into the existing wordmark position. The portrait fades in at its fixed size and position at 1.4 s, heading at 1.7 s, navigation at 2 s, button at 2.65 s, and footer details at 3.05 s (after a 200 ms lead-in), matching the heynesh.com desktop sequence. The browser animation API samples the reference's power easing curves without adding dependencies. The same sequence adapts to mobile.

The static wordmark is restored after the animation. Reduced motion, fragment links and restored scroll positions skip the intro; keyboard, scrolling and resizing finish it immediately. Without JavaScript the page remains visible, and an eight-second fallback prevents loading failures from hiding content.

## Hover animation

Navigation uses the letter scramble from Kisaka’s Services section. It spreads from the character nearest the pointer, with a 28 ms stagger, 260 ms scramble, and 45 ms glyph changes. An overlay preserves the original font spacing and link dimensions. “Meet Josh” uses the same 680 ms masked word roll and 420 ms diagonal arrow swap, with an inverted monochrome button on hover.

Keyboard focus runs the same effects. Touch links activate directly, and reduced motion keeps the text and arrow static. Resizing, font readiness, and motion/pointer preference changes restore any active scramble immediately.

## Mobile navigation

At 700px and below, the same navigation links open in a native popover from a 48px hamburger button. The two lines morph into a cross over 250ms; the panel uses a 200ms transform/opacity transition. Escape, outside clicks, link selection, scrolling, and resizing back to desktop dismiss it. Keyboard interactions are immediate; reduced motion keeps a gentle panel fade. Browsers without popover support retain the inline links.
