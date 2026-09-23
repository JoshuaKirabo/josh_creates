# JOSH

Joshua Kirabo’s homepage. Plain HTML, CSS and JavaScript, with no frameworks or runtime dependencies.

Open `index.html` directly, or serve this directory with any static web server.

- `index.html` — homepage and mobile navigation
- `about_me.html` — standalone About page; the single source of its section markup
- `projects.html` — Projects page, built on the About layout and reached by ordinary navigation
- `page-shell.js` — joins the two documents for continuous scrolling with native page links as fallback
- `styles.css` — viewport-sized layout, phone and landscape adaptations, and reduced-motion support
- `script.js` — name-first loading animation, navigation hover, and current year
- `assets/josh_portrait_cartoon_bw.png` and its mask — the current monochrome portrait

The homepage uses the stable small viewport height and safe areas, so browser toolbar movement cannot resize its contents. The navigation, heading, button, and hero footer fit within the first screen. The large portrait is intentionally cropped within the composition. Short landscape screens use a side-by-side layout.

The decorative background is fixed to the screen behind both Home and About. Its static grain and base styles are in the document head so it appears before the animated canvas is ready; the static texture is replaced only after the canvas is painted. On phones, the first 64px blend gently into the same dark color used by Safari's status area, avoiding an abrupt texture boundary. Safari controls the pixels behind its own status icons, so that region still needs checking on an actual iPhone.

Home, About me, and Meet Josh now navigate between the two sections, and Projects opens its own page. Other destinations remain placeholders. The About section is available on desktop and mobile, with a top bar (JOSH on the left, the site links on the right) over a profile panel, in the existing monochrome palette. Every page signs off with “© 2026 Joshua Kirabo” in the same bottom-left spot as Home; About also keeps the two roles in the bottom-right corner as icons: a code mark for Software Engineer and a spark for Creative Professional, each named on hover and to screen readers.

The opening composition is inspired by https://heynesh.com/. Copy, branding and implementation are written for Josh. The original portrait is retained as source material for the homepage; the live page uses the cartoon version. Font licenses and grain attribution are stored beside their assets.

For the private Sites preview, copy `index.html`, `about_me.html`, `projects.html`, `page-shell.js`, `styles.css`, `script.js`, and the referenced assets into `dist/`. No compilation is needed.

## Opening animation

JOSH enters from the right at full size, with its letters rising 200 ms apart, then moves into the existing wordmark position. The portrait fades in at its fixed size and position at 1.4 s, heading at 1.7 s, navigation at 2 s, button at 2.65 s, and footer details at 3.05 s (after a 200 ms lead-in), matching the heynesh.com desktop sequence. The browser animation API uses the shared cubic-bezier CSS curves and complete transform/opacity keyframes. This avoids sampled `linear()` easing's unaccelerated path on older Safari and removes entrance blur. The same sequence adapts to mobile; touch devices fade in the signature without per-character scrambling, and hidden navigation labels do not scramble.

The fine background grain stays anchored. Four sparse particle layers are painted once, then drift independently over continuous 12–18 second paths, with only 8–16px of travel from their anchors. Rounded, softer grains avoid the shimmer of sharp moving squares. Motion starts as soon as the page initializes, alongside the entrance, with a critically damped spring (response 0.3s, no bounce) bringing the layers smoothly up to speed. The pointer-following glow waits until the entrance finishes. Steady motion uses native transform animations with no per-frame JavaScript, canvas repainting, or texture regeneration.

Touch devices cap each of the five surfaces at 350,000 pixels and the moving particles at 900 total. The canvas reserves the full screen height so mobile browser toolbar changes do not regenerate the texture. Duplicate size notifications do no work. Pausing preserves the current positions, and resuming smoothly accelerates from them. Ambient motion continues across Home and About. It pauses when the page is hidden or navigating away, or reduced motion or increased contrast is enabled.

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

A single vertical wheel flick or touch swipe completes the Home-to-About transition; an upward flick brings Home back. A 12px movement threshold rejects incidental jitter. The accepted gesture starts a critically damped spring with a 1.1-second response and no bounce. The visible JOSH travel takes roughly 600–800ms, gliding into its destination after input stops. The spring finishes once it is within one scroll pixel of its destination and moving slowly, avoiding an invisible tail that would delay focus and native scrolling. Continued wheel momentum is absorbed through landing, with ordinary About scrolling available after a 180ms gap. A deliberate reversal preserves the spring's current position and velocity. Touch owns only the vertical section gesture; taps, horizontal swipes, pinch zoom, nested scrollable content and scrolling farther down About retain their native behavior.

Home and About share a native sticky viewport across one hero height, with no extra runway. JOSH, the desktop navigation labels and the four “Software Engineer / Creative Professional” lines travel into their matching top bar and footer positions while the portrait and other Home content fade away. Each role's two heading lines shrink towards that role's icon in the bottom-right corner and morph into it: over the last quarter of the trip the words pinch to a sliver and fade while the icon's strokes draw themselves in, turning from −45° and growing from 70% to full size. The corner-side words lead so no line overtakes another, and the whole morph is scrubbed by scroll, so it retraces on the way back. The signature does not move: it stays in the bottom-left corner and hands over to About's identical copy as the fold lands. The bar itself drops in from 24px above and the intro rises 12px, both fading in under the travelling words. The current-page highlight is part of the landing too: once the About me label arrives, the white highlight sweeps in beneath it from left to right, and the label inverts exactly where it is covered. It retracts the same way on the return to Home. Each word eases into and out of its own stagger, so it never hits a hard stop before the page settles; the top bar follows the same easing in reverse. The last part of the fold blends the stationary text copies so their outline weight and rendering do not jump at handoff. Transform and opacity are the only animated properties in this transition. Fine-pointer scrolling outside accepted flicks keeps the existing 0.3-second presentation spring; explicit links and flicks paint the navigation spring's precise subpixel position once per frame. Browser scroll rounding cannot step the visual pose, and a new navigation starts from the currently displayed position. The first display frame responds immediately. Focus ownership and current-link attributes change only when crossing their section thresholds.

Explicit navigation uses the same destination spring. Keyboard input and mouse contact outside a destination stop it; a new touch can redirect it with another swipe. Keyboard links land immediately, and reduced motion removes the pinned morph and gesture interception while retaining ordinary section navigation. Scroll gestures never move keyboard focus or add history entries.

The four JOSH letters exist from first layout, preserving the original right-to-center-to-masthead entrance with a 200ms letter stagger. Resting text geometry is measured independently of the opening animation. Width-only resizing, font readiness and motion-preference changes refresh the landing positions. About cannot receive focus or clicks while hidden; the hero becomes inert after handing control to About. Its transparent surfaces remain composed at the landing, and the flat About panels keep a stable rendering mode so reversing does not trigger a layer-allocation or backdrop-filter change. Back and Forward preserve the browser's saved scroll position, including a partial transition.

Run `node --test tests/section-scroll.test.cjs` for one-flick completion, momentum tails, wheel units, touch reversal, native input exceptions, geometry, resizing, history, deep-link and reduced-motion regression checks. These are controller tests; the outline crossfade and touch scrolling should also be feel-checked in a browser and on an actual phone.

## About page

Edit the About section in `about_me.html`. Both HTML files are complete documents and share the stylesheet and interaction script. The existing compact profile rail, navigation, blank content area and mobile arrangement are retained.

When served over HTTP, `page-shell.js` eagerly loads the other document and imports only its required content. Home's intro starts independently of that request. The combined surface preserves continuous scrolling and the reverse transition; an About URL opens at its landing without replaying the Home intro. Explicit links update the address and title, so refresh, bookmarks and opening either page directly work.

If JavaScript is disabled, a request fails, or the files are opened through `file://`, ordinary links still navigate between the standalone pages. Serve the directory to use the continuous transition. The loader times out after four seconds without hiding either page.

## About content

Below the top bar, About follows the layout and motion of daqconsulting.com/about, without its "How we work" and "Mission & Vision" sections. The copy is written for Josh. “Meet / Josh.” is outlined, and a white fill sweeps across it on the projects' 100° edge each time the fold lands on About (or once on a direct visit), with the eyebrow rule drawing in and the intro rising after it. During the fold the whole content column stays hidden, then fades in and rises 12px under the landing words.

“The Core” is a vertical tab list of five subjects beside a light reading panel. Click or arrow keys switch subjects. The panels share one grid cell, so the page height never changes, and they crossfade in 240ms. Each panel names its tools and links to one real project. The first time the page turns to Experience, it arrives the way Meet Josh does: the eyebrow rule draws, the outlined heading fills, the jobs fade in 60ms apart and the card wipes up. A marker on a rail beside the list slides and stretches to the open job, and while the section is pinned a fainter fill tracks the scroll through the jobs. Cards change in place and never slide. The title sweeps in on the same 100° edge as the About title, running from the right when the scroll runs back. The workplace draws its letter outlines word by word and fills in, and the words along the bottom decode in place from scrambled glyphs while their icons hold still. Each detail keeps a slot as wide as its longest value across all the jobs, so the icons sit in the same spot on every card. A promotion within one job keeps the card still: the old title wipes away, the new one sweeps in, and only details that changed decode. Below 640px of width the panel moves under the list. A pager at the end shows where About sits and links on to Projects. Without JavaScript the title is filled and all five panels are listed in order. Reduced motion shows the finished state.

Edit the subjects in `about_me.html`: each tab's `aria-controls` must match its panel's `id`.

## Projects page

`projects.html` reuses the About top bar, with Projects as the current page, and puts its own content beneath it. It does not load `page-shell.js`: that script only joins Home and About for the fold, so Projects is an ordinary page link from both. The bar sits in the same place as on About, so moving between them changes only the content below it. The backdrop grain, top bar hover scrambles and touch feedback run here as on About; the Home intro and fold do not. Home and About me links return with their fragments, so Home skips the intro and About opens at its landing.

Add project entries as `<li>` items in `.projects-list`; the list stays hidden until it has any.

## Projects page

Projects is a pinned horizontal track beneath the top bar. Its layout and motion follow the "Engineered for scale" section of daqconsulting.com. The copy and implementation are written for Josh. The runway is sized to the track's travel, so ordinary scrolling drives it; nothing intercepts the wheel or touch. As each card crosses the column, its name and corner numeral fill in over a hairline outline through a soft 100° edge, finishing at centre. The centred card takes a brighter border, and a progress hairline with one label per card follows along. Rail labels jump to their card. Keyboard focus brings its card to centre immediately.

A fine pointer gets a 90ms glide behind the scroll. Touch keeps native momentum, and reduced motion follows the scroll exactly without entrance motion. Without JavaScript the track is an ordinary horizontal scroller. Edit the cards in `projects.html`: projects two to five are placeholders.
