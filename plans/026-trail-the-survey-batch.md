# 026 — Give the survey batch a directional trail

Status **TODO** · Commit `1b2a985` · Medium · Visibility · One SVG

## Problem

`assets/tellistic-survey-pipeline.svg:135` draws each moving head with `<circle r="8" fill="#fff" opacity=".15"/><circle r="3.7" fill="#fafafa"/>`. At phone width the bright center is about two pixels wide. The round marker looks the same in both directions.

## Target and steps

1. Apply 025 first. Keep the black plate, all existing service logos, embedded fonts, geometry, and inspector targets. In the existing `.batch-flow` group, use a white head of radius 5 and a soft halo of radius 8 at opacity 0.15.
2. Add two trailing circles per head, radius 3.5 at opacity 0.65 and radius 2.5 at opacity 0.35. Paint the faintest first and the head last. For each trail circle reuse the head's original `mpath` ID, linear mode and repeating 7.2 s clock. Offset both its travel and its opacity window by 60 ms and 120 ms respectively. Use the six start/arrival pairs from the implemented head tracks. At 140 units per second, the trail is about 17 drawing units long.
3. Keep the trail as siblings of the head under a stationary group. This lets every circle traverse the same right-angle bends. Apply the same 40 ms opacity ramps as the head. All trail geometry belongs in the existing decorative, pointer-transparent layer, which the reduced-motion rule hides.

## Verification

In the standalone SVG, pause the root and inspect times 0.27 s and 3.28 s. The head should have turned the first corner while a trailing circle is still approaching it. Scrub by 0.02 s to check the tail follows the wire. On the article, watch at 390 × 844 and 1366 × 768, then select a stage under the animation. Verify the head leads throughout, the hover and click areas still match their stages, the entire architecture fits one screen, and reduced motion shows the static drawing. Bump both SVG URLs in the article together if this ships separately from 025.
