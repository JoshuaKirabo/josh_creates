# 027 — Show PySpark flattening repeated answers

Status **TODO** · Commit `1b2a985` · Low · Explanatory motion · One SVG

## Problem

`assets/tellistic-survey-pipeline.svg:102` says `<text x="561" y="358" class="body soft">Flatten repeats</text>`. The existing arrival rectangle at line 145 briefly outlines the whole Databricks node. Its reaction looks the same as a storage handoff.

## Target and steps

1. Apply 025 first. Inside the existing SVG's decorative `.batch-flow` layer, add three horizontal strokes at x = 726, 732 and 738 and y = 353, 361 and 369, respectively. Give each a length of 14, stroke width of 2, round ends and the existing packet white. This area is clear of the logo, the stage title and the PySpark label.
2. Use the existing 7.2 s autoplay clock. Fade the group from 0 to 0.9 over 2.243–2.363 s. Animate each stroke's horizontal translation to bring all left ends to x = 732 over 2.363–2.663 s. Use SVG spline easing with `keySplines=".23 1 .32 1"` for that segment. Keep the three rows aligned through 2.923 s, then fade to zero at 3.043 s as the processed batch starts its write. For whole-cycle SMIL, divide timestamps by 7.2 and supply one spline per key interval when using spline mode.
3. Keep the graphic within the Databricks box and use the existing reduced-motion and pointer-event behavior. Keep the article's two diagram URLs at the same revision when shipping.

## Verification

Open the SVG directly, pause it and compare 2.36 s, 2.67 s, and 3.05 s. The three marks should be offset, then aligned, then gone as the batch leaves. Watch the embedded version at full speed for two loops with no interaction. Confirm the timing also reads at 390 × 844, labels remain unobstructed, reduced motion hides the marks, and the section anchor shows the whole architecture without scrolling.
