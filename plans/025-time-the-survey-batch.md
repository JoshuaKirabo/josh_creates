# 025 — Time the survey batch

Status **TODO** · Commit `1b2a985` · Medium · Timing · One SVG and its two article references

## Problem

In `assets/tellistic-survey-pipeline.svg:149` the 291-unit write takes two seconds. At line 173 the 35-unit reporting hop takes 0.62 seconds. The current reporting clock reads `keyTimes="0;0.83333;0.90222;1" keyPoints="0;0;1;1"`. This makes the batch slow to a crawl on the shortest wire.

## Target and steps

1. Work against the current working copy, including the untracked diagram. Keep the existing six `mpath` references and the native SVG animation used at line 133. Give all motion and opacity tracks a 7.2-second repeating clock, starting on load.
2. Use the following start and arrival times in seconds. Divide timestamps by 7.2 for SMIL keyTimes. Hold at each endpoint outside the travel interval. Use linear interpolation for travel. The target speed is 140 drawing units per second.

   | Route | Start | Arrival |
   | --- | ---: | ---: |
   | export | 0.000 | 1.429 |
   | read | 1.629 | 2.243 |
   | write | 3.043 | 5.122 |
   | match | 5.322 | 5.936 |
   | load | 6.136 | 6.400 |
   | report | 6.600 | 6.850 |

3. For each moving head, fade in over the first 40 ms of travel and out over the last 40 ms. Fade its existing receiver outline from zero to 0.95 from arrival minus 40 ms through arrival plus 40 ms, then back to zero by arrival plus 180 ms. Omit duplicate zero-time keys on the first route. The 800 ms at Databricks is reserved for the transformation. Leave the control wires static.
4. Bump both identical diagram URL versions in `articles/tellistic-survey-pipeline.html` together after the SVG changes.

## Verification

Open the article at `#architecture` and the standalone SVG. Watch two loops from load. In the standalone SVG, use `pauseAnimations()` and `setCurrentTime(seconds)` on its root to sample every route halfway through travel. Its head should be at the midpoint of the corresponding path, allowing one SVG unit of rounding error. Check the wrap at 7.2 s and the Databricks pause. Enable reduced motion and confirm that the existing static routes and labels remain readable. At 1366 × 768 and 667 × 375, the complete drawing must still fit when arriving at the section link.
