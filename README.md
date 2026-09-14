# JOSH

Joshua Kirabo’s homepage. Plain HTML, CSS and JavaScript, with no frameworks or runtime dependencies.

Open `index.html` directly, or serve this directory with any static web server.

- `index.html` — homepage and About section, with working profile links
- `styles.css` — viewport-sized layout, phone and landscape adaptations, and reduced-motion support
- `script.js` — name-first loading animation, navigation hover, and current year
- `assets/josh_portrait_cartoon_bw.png` and its mask — the current monochrome portrait

The homepage uses the stable small viewport height and safe areas, so browser toolbar movement cannot resize its contents. The navigation, heading, button, and hero footer fit within the first screen. The large portrait is intentionally cropped within the composition. Short landscape screens use a side-by-side layout.

The decorative background is fixed to the screen outside the hero's clipping. Its static grain and base styles are in the document head so it appears before the animated canvas is ready; the static texture is replaced only after the canvas is painted. On phones, the first 64px blend gently into the same dark color used by Safari's status area, avoiding an abrupt texture boundary. Safari controls the pixels behind its own status icons, so that region still needs checking on an actual iPhone.

Navigation and CTA destinations are currently placeholders. On mobile, the page ends at the copyright line: the retained About section is hidden so a small swipe cannot expose another section below the footer. The About section remains in the desktop layout.

The opening composition is inspired by https://heynesh.com/. Copy, branding and implementation are written for Josh. The original portrait is retained as source material for the homepage; the live page uses the cartoon version. Font licenses and grain attribution are stored beside their assets.

For the private Sites preview, copy `index.html`, `styles.css`, `script.js`, and the referenced assets into `dist/`. No compilation is needed.

## Opening animation

JOSH enters from the right at full size, with its letters rising 200 ms apart, then moves into the existing wordmark position. The portrait fades in at its fixed size and position at 1.4 s, heading at 1.7 s, navigation at 2 s, button at 2.65 s, and footer details at 3.05 s (after a 200 ms lead-in), matching the heynesh.com desktop sequence. The browser animation API uses the shared cubic-bezier CSS curves and complete transform/opacity keyframes. This avoids sampled `linear()` easing's unaccelerated path on older Safari and removes entrance blur. The same sequence adapts to mobile; touch devices fade in the signature without per-character scrambling, and hidden navigation labels do not scramble.

The fine background grain stays anchored. Four sparse particle layers are painted once, then drift independently over continuous 12–18 second paths, with only 8–16px of travel from their anchors. Rounded, softer grains avoid the shimmer of sharp moving squares. Motion starts as soon as the page initializes, alongside the entrance, with a critically damped spring (response 0.3s, no bounce) bringing the layers smoothly up to speed. The pointer-following glow waits until the entrance finishes. Steady motion uses native transform animations with no per-frame JavaScript, canvas repainting, or texture regeneration.

Touch devices cap each of the five surfaces at 350,000 pixels and the moving particles at 900 total. The canvas reserves the full screen height so mobile browser toolbar changes do not regenerate the texture. Duplicate size notifications do no work. Pausing preserves the current positions, and resuming smoothly accelerates from them. Ambient motion pauses when the hero is offscreen, the page is hidden or navigating away, or reduced motion or increased contrast is enabled.

The static wordmark is restored after the animation. Reduced motion, fragment links and restored scroll positions skip the intro; keyboard and composition changes finish it immediately; touch or scrolling settles the current wordmark pose and fades in content over 250ms. Without JavaScript the page remains visible, and an eight-second fallback prevents loading failures from hiding content.

## Hover animation

Navigation uses the letter scramble from Kisaka’s Services section. It spreads from the character nearest the pointer, with a 28 ms stagger, 260 ms scramble, and 45 ms glyph changes. An overlay preserves the original font spacing and link dimensions. “Meet Josh” expands its dark arrow tile across the button and moves the arrow to the right on hover.

Keyboard focus is immediate, with a visible outline and no scramble. Hover effects require a fine pointer and are suppressed during touch input, including on devices with an attached mouse. Resizing, font readiness, and motion/pointer preference changes restore any active scramble immediately.

## Touch feedback

Buttons and text links compress to 97% on contact. Menu and social icons compress within their unchanged hit areas, without circular backgrounds or tap rings; navigation rows highlight with a subtle label compression. Keyboard focus keeps its visible outline. The existing monochrome composition stays still between interactions. Feedback starts on pointer-down, using 100ms in and 160ms out with the shared `--ease-out` curve. CSS transitions retarget immediately on repeated taps.

The touch handler allows 10px of finger jitter, then cancels the press and any accidental click when movement indicates a drag. Scrolling, a second finger, pointer cancellation, leaving the page, or losing focus clears the pressed appearance. It never captures the pointer, blocks native scrolling or pinch zoom, delays a click, or simulates hover. Touch and pen receive the feedback; mouse hover and keyboard focus keep their own behavior.

Reduced motion retains opacity feedback without compression. Increased contrast replaces the soft highlights with defined outlines. If JavaScript is unavailable, the browser's native tap highlight remains available.

## Mobile navigation

At 700px and below, the three-line button above JOSH opens a full-screen black navigation dialog. The opening and closing controls occupy the same fixed 48px hit area. The icon morphs into a cross over 250ms while a circular clip-path expands from the center of the hamburger over 280ms with the shared ease-out curve. Its radius is measured to cover the farthest screen corner, including safe areas. The black surface and links share the same circular reveal so text cannot appear outside it. Six equally spaced links rise 24px with a 30ms stagger, finishing within 300ms. Closing reverses the same paths, including during repeated taps.

The dialog paints its closed pose before opening transitions start; computed-style reads in the same task as showModal are not used as a substitute for a painted frame. An interrupted opening is discarded when a newer tap changes the target state. Input modality comes from actual keyboard or pointer events, so touch clicks with a zero click count still animate.

The native dialog contains keyboard focus and makes the page behind it inert; page scrolling is locked until closing finishes. Escape, link selection, and returning to desktop dismiss it. Keyboard actions are immediate, and reduced motion uses a gentle fade. Without dialog support or JavaScript, the inline links remain available.

The social icons enter individually with a 160ms opacity/8px rise transition and 40ms stagger (280ms for the group), using the existing `--ease-out` curve. Their transitions also run when touch skips the main intro, so they no longer appear abruptly. Hit areas remain available during the entrance. Keyboard skips show them immediately; reduced motion removes the rise. Stagger delays apply only during the entrance, preserving immediate touch and hover feedback afterward.

Blog starts the right-hand desktop navigation group, before Ask Josh and Let’s connect. It follows Projects in the mobile menu, using the same placeholder behavior as the existing navigation until its destination is provided.

## Scroll motion

The hero, portrait, heading, and wordmark keep constant dimensions during scrolling. Stable `svh` units prevent mobile browser controls from resizing the composition. The intro heading and button fade in at full size.

Separate wordmark and portrait layers follow native scroll timelines: JOSH gently moves and fades over the first 45% of the hero exit, then the portrait fades between 25% and 100%. Scrolling upward reverses the same progress immediately, without restarting an entrance or waiting on a smoothing loop. The typography’s fixed vertical proportion and portrait centering stay on their inner elements. Older browsers use a passive, frame-coalesced transform/opacity fallback. Reduced motion keeps only the fades.

Scrolling during the opening sequence settles JOSH from its current position to its resting position over 250ms with the shared `--ease-out` curve, then removes the duplicate only after the handoff. It never changes the letter size. Keyboard input remains immediate.
