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

JOSH enters from the right at full size, with its letters rising 200 ms apart, then moves into the existing wordmark position. The portrait fades in at its fixed size and position at 1.4 s, heading at 1.7 s, navigation at 2 s, button at 2.65 s, and footer details at 3.05 s (after a 200 ms lead-in), matching the heynesh.com desktop sequence. The browser animation API uses the shared cubic-bezier CSS curves and complete transform/opacity keyframes. This avoids sampled `linear()` easing's unaccelerated path on older Safari and removes entrance blur. The same sequence adapts to mobile; touch devices fade in the signature without per-character scrambling, and hidden navigation labels do not scramble.

The fine background grain stays anchored. Four sparse particle layers are painted once, then drift independently over continuous 12–18 second paths, with only 8–16px of travel from their anchors. Rounded, softer grains avoid the shimmer of sharp moving squares. Motion starts as soon as the page initializes, alongside the entrance, with a critically damped spring (response 0.3s, no bounce) bringing the layers smoothly up to speed. The pointer-following glow waits until the entrance finishes. Steady motion uses native transform animations with no per-frame JavaScript, canvas repainting, or texture regeneration.

Touch devices cap each of the five surfaces at 350,000 pixels and the moving particles at 900 total. The canvas reserves the full screen height so mobile browser toolbar changes do not regenerate the texture. Duplicate size notifications do no work. Pausing preserves the current positions, and resuming smoothly accelerates from them. Ambient motion pauses when the hero is offscreen, the page is hidden or navigating away, or reduced motion or increased contrast is enabled.

The static wordmark is restored after the animation. Reduced motion, fragment links and restored scroll positions skip the intro; keyboard, scrolling and resizing finish it immediately. Without JavaScript the page remains visible, and an eight-second fallback prevents loading failures from hiding content.

## Hover animation

Navigation uses the letter scramble from Kisaka’s Services section. It spreads from the character nearest the pointer, with a 28 ms stagger, 260 ms scramble, and 45 ms glyph changes. An overlay preserves the original font spacing and link dimensions. “Meet Josh” expands its dark arrow tile across the button and moves the arrow to the right on hover.

Keyboard focus is immediate, with a visible outline and no scramble. Hover effects require a fine pointer and are suppressed during touch input, including on devices with an attached mouse. Resizing, font readiness, and motion/pointer preference changes restore any active scramble immediately.

## Touch feedback

Buttons and text links compress to 97% on contact. Menu and social icons compress within their unchanged hit areas, with a soft circular highlight; navigation rows highlight with a subtle label compression. The existing monochrome composition stays still between interactions. Feedback starts on pointer-down, using 100ms in and 160ms out with the shared `--ease-out` curve. CSS transitions retarget immediately on repeated taps.

The touch handler allows 10px of finger jitter, then cancels the press and any accidental click when movement indicates a drag. Scrolling, a second finger, pointer cancellation, leaving the page, or losing focus clears the pressed appearance. It never captures the pointer, blocks native scrolling or pinch zoom, delays a click, or simulates hover. Touch and pen receive the feedback; mouse hover and keyboard focus keep their own behavior.

Reduced motion retains opacity feedback without compression. Increased contrast replaces the soft highlights with defined outlines. If JavaScript is unavailable, the browser's native tap highlight remains available.

## Mobile navigation

At 700px and below, the three-line button above JOSH opens a full-screen black navigation dialog. The same button stays at the top left and morphs into a cross over 250ms. Five equally spaced links enter with a subtle 30ms stagger, finishing within 280ms. The black surface fades over 250ms, and every transition can reverse immediately on another tap.

The native dialog contains keyboard focus and makes the page behind it inert; page scrolling is locked until closing finishes. Escape, link selection, and returning to desktop dismiss it. Keyboard actions are immediate, and reduced motion uses a gentle fade. Without dialog support or JavaScript, the inline links remain available.
