# 033 — Restore the file entering each receiver

- **Status** DONE
- **Commit** 54f52f4, with the working tree’s 106-second diagram
- **Severity** High
- **Category** Physicality and origin
- **Estimated scope** The animated SVG and its article cache revision

Implemented with payload-only paths into the receiving icons and a 120 ms arrival fade. The subsequent speed request shortened playback to 53 seconds. Verified all seven arrivals and all 29 captions in the wide and portrait layouts. The times below refer to the original plan.

## Problem

The opening record reaches the end of the wire at 3 seconds and stays above SurveyCTO until the CSV export begins at 7 seconds. The desktop wire ends at (56, 125), while the receiver is centered at (56, 164). On the phone those points are (273, 0) and (273, 22). The same edge-stop treatment affects the downstream transfers. In commit 0b1c471 the moving CSV faded as it arrived. The current discrete opacity holds were introduced to keep the file trackable during the longer narration.

```xml
<!-- assets/tellistic-survey-pipeline.svg:325 -->
<path id="w-field-intake" d="M56 45V125"/>
<!-- assets/tellistic-survey-pipeline.svg:354 -->
<animateMotion dur="106s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.0283018868;1" keyPoints="0;1;1"><mpath href="#w-field-intake"/></animateMotion>
```

## Target

The page visibly crosses the receiving icon’s edge and disappears into its interior. A file waiting for the next action is represented by the receiving service, folder, notebook or table. Each next transfer begins on its existing cue. The initial record is visible and moving from time zero.

## Implementation

1. In `assets/tellistic-survey-pipeline.svg`, keep the current motion along each wire. Inside each moving payload group, wrap its artwork in a local group. During the final **240 ms of the existing trip**, translate that inner group from zero to the offset between the wire endpoint and the receiver center. Use the group’s local coordinates from the table below. The artwork includes the CSV label when present. Apply translation outside any existing icon scale. The outer group continues following the wire on its current clock.
2. Keep opacity at 1 as the file crosses the edge. Fade it to 0 over the **last 100 ms** of the trip, then keep it at 0 until that transfer’s next loop. Use linear position and opacity interpolation. For the opening record, its position and opacity must reset on the 106-second wrap. For later transfers, show the file at the start of its trip. Use normalized key times calculated from the existing motion element’s arrival key multiplied by 106. The rounded arrival seconds below are for visual inspection.
3. Use these receiver offsets. Each row applies to the moving record, CSV, cleaned file or row glyph. The regular arrows, dashed routes, travelling dots, token and key have their own tracks.

| Transfer | Arrival in seconds | Wide offset (x, y) | Portrait offset (x, y) |
| --- | ---: | --- | --- |
| Field record into SurveyCTO | 3.000 | 0, 39 | 0, 22 |
| CSV into AzCopy | 9.619 | 0, 29 | −21, 0 |
| Raw CSV into storage | 13.000 | 27, 9 | 10, 0 |
| Raw CSV into Databricks | 50.000 | 35, 0 | 17, 0 |
| Cleaned file into output folder | 83.712 | −27, 10 | −106, 0 |
| Output into Copy Data | 92.000 | 39, 0 | 18, 0 |
| Rows into Azure SQL | 102.837 | 34, 0 | 0, 19 |

4. The portrait output wire enters the container at x=132. To avoid sweeping across the folder label, use a payload-only return path inside the output row: from (132,231) travel via (132,217) and (26,217) to the folder at (26,231). Allocate the final **800 ms** of that transfer to this longer approach. Keep the final 100 ms fade. Place it behind the label or mask the receiver so its foreground remains legible. For other arrivals, clip the payload behind the receiving icon’s front edge if the icon is transparent and the artwork visibly sits over its face.
5. Preserve the notebook’s parked processing glyph and its CSV-to-cleaned-file change, and the SQL table’s existing rows-loaded animation. Those communicate what happens after receipt. Preserve the current wire endpoints, dot speed, 29 caption boundaries, responsive layouts and reduced-motion stills. Bump the animated SVG revision in `articles/tellistic-survey-pipeline.html` from 90 to 91.

## Verification

- Parse the SVG as XML and check that every changed animation has monotonic key times starting at 0 and ending at 1.
- Open the article through its “See how it works” link at 1440 × 900 and 390 × 844. Watch the first seven seconds without scrubbing. The record should move immediately, cross into SurveyCTO, and be fully received while the capture caption is visible.
- Pause the SVG clock in browser development tools. At each arrival, sample 240 ms before, 100 ms before, at arrival, and 200 ms after. The artwork must advance into the receiver as it disappears. Check the longer phone output path from 800 ms before arrival. Inspect the rendered pixels of both layouts as well as the SVG transform.
- Verify a subsequent departure, the notebook conversion, the SQL row insert, and the loop from 106 seconds back to zero. Confirm that reduced-motion readers still get the appropriate still and individual caption controls.
