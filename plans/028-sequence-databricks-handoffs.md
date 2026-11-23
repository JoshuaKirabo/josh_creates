# 028 — Sequence the Databricks handoffs

- **Status** — DONE
- **Commit** — 1b2a985, with the current working copy of the Tellistic architecture diagram
- **Severity** — HIGH
- **Category** — Purpose and timing
- **Scope** — Both layouts of the Tellistic SVG and its article image revision

## Problem

In `assets/tellistic-survey-pipeline.svg:48`, `.control-route { --step: -10; animation: flow-along-route 540ms linear infinite; }` animates the green success branch throughout the run. The white `.stream` overlays on lines 392–400 likewise suggest simultaneous access to the raw CSV, cleaned output, and SQL. The existing `Linked service · PAT` labels at lines 375 and 540 have no launch cue.

## Target and steps

1. Keep the SVG’s 17-second run. Keep the line patterns moving continuously in both layouts. Time the travelling files and success signal to their activities using the existing linear SMIL travel and visibility gates.
2. Highlight the existing linked-service/PAT label during notebook launch (0.178–0.212 of the loop). Use the existing launch route; the later Key Vault exchange stays on its own route.
3. Finish the notebook write and any trailing markers before the green success signal. A suitable common arrival is 0.70000. Retiming must include the output folder, arrival markers, and any write trails. Animate a single green signal along the existing success edge during 0.71000–0.73706. Only then read the output for Copy Data, clear the target and insert rows in the existing order. Include on desktop and phone.
4. Show the existing successful run. The attachment describes email and webhook failure handlers as examples. The pictured project has no configured failure activity. Keep the existing labels, geometry, monitoring interval, and still presentation. Revise the article asset query string for the changed animation.

## Verification

Check the actual SVG in a browser at desktop and portrait sizes. Pause its SVG clock and inspect launch (3.3 s), vault (5 s), write (11 s), green dependency (12.25 s), copy read (13 s), pre-copy cleanup (14 s), and insert (14.9 s). Inspect idle and the next loop. Check that the line patterns keep moving between handoffs while each payload appears only during its activity. The monitor spans the run. Compare reduced-motion views with the existing stills; keep their cache revision unless their appearance changes.

## Execution order

Execute against the current diagram and the current article. This follows the existing 17-second run and its payload trail.
