# 021 — Have Skills loaded before the cut

- **Status**: DONE (uncommitted)
- **Commit**: 4b2f9d7
- **Severity**: HIGH
- **Category**: Performance (turn latency)
- **Estimated scope**: 7 HTML files (one query string each) and 1 JS edit (~8 lines)

## Problem

The Projects → Skills turn is meant to be exit → instant cut → entrance. The cut is not instant.

`skills.html` only starts downloading when Projects' exit ends (`script.js:4313`, `setTimeout(() => { location.href = href; }, 320)`). Until Skills can paint, the browser keeps showing the last Projects frame. On a local server, the recording measured **~390 ms** from navigation to Skills' first paint. On a real connection it is longer. The exit freezes for that time, and plan 020's empty beat becomes a dead wait.

Part of that wait is a stylesheet download that shouldn't happen. Every page loads the same `styles.css`, but under a different cache-busting version, so the browser treats each one as a separate file:

```html
<!-- projects.html:38 and about_me.html:39 -->
<link rel="stylesheet" href="styles.css?v=about81">
<!-- skills.html:38 -->
<link rel="stylesheet" href="styles.css?v=skills-brand-colors3">
<!-- index.html:49 -->
<link rel="stylesheet" href="styles.css?v=about68">
<!-- projects/next_step.html:27 -->
<link rel="stylesheet" href="../styles.css?v=about68">
<!-- projects/tinyml.html:27 -->
<link rel="stylesheet" href="../styles.css?v=about69">
```

Skills' stylesheet blocks rendering, and it is always a cache miss coming from Projects. `script.js` already has the same version (`?v=about63`) on Projects, About and Skills, so only the stylesheet is affected.

## Target

1. **One stylesheet version across every page**: `styles.css?v=site1` (and `../styles.css?v=site1` under `projects/`). A reader who has seen any page already has the stylesheet Skills needs.
2. **Prefetch Skills once the reader reaches the last card.** When the Projects track's current card becomes the last one, add `<link rel="prefetch" href="skills.html">` to `<head>`, once per page load. The HTML then comes from the prefetch cache when the turn navigates. Prefetch is low priority and idle-time, so it never competes with the track's spring.

Prefetch is chosen over prerender (`<script type="speculationrules">`) on purpose. A prerendered Skills would run `initCraft` and its IntersectionObserver-driven entrance before it is shown, and the reader would arrive at a finished panel instead of watching it build.

```js
/* target: script.js, inside initProjectsTrack's paint(), in the block that runs
   when the nearest card changes (currently script.js:4233-4239) */
    if (nearest !== current) {
      cards[current]?.classList.remove('is-current');
      railLinks[current]?.removeAttribute('aria-current');
      cards[nearest].classList.add('is-current');
      railLinks[nearest]?.setAttribute('aria-current', 'step');
      current = nearest;
      if (current === cards.length - 1) prefetchSkills();
    }
```

```js
/* target: a small helper declared inside initProjectsTrack, above paint() */
  // Skills is the next page. Fetching it while the reader is on the last card
  // lets the turn cut straight to it instead of waiting on the network.
  let skillsPrefetched = false;
  function prefetchSkills() {
    if (skillsPrefetched) return;
    skillsPrefetched = true;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = 'skills.html';
    document.head.append(link);
  }
```

## Repo conventions to follow

- Comments in `script.js` are plain full sentences above the code, describing the reader's experience. Exemplar: `script.js:4301-4303` ("Skills comes next. Scrolling on from the last card plays Projects' exit in place, then cuts to the Skills page…").
- Functions in `initProjectsTrack` are declared with `function name() {}` inside the closure (see `tick`, `schedule`, `refresh`), and state uses `let` flags (see `let turning = false;`).

## Steps

1. Replace the stylesheet `?v=` value with `site1` in each of these lines:
   - `index.html:49` → `<link rel="stylesheet" href="styles.css?v=site1">`
   - `about_me.html:39` → `<link rel="stylesheet" href="styles.css?v=site1">`
   - `projects.html:38` → `<link rel="stylesheet" href="styles.css?v=site1">`
   - `skills.html:38` → `<link rel="stylesheet" href="styles.css?v=site1">`
   - `projects/next_step.html:27` → `<link rel="stylesheet" href="../styles.css?v=site1">`
   - `projects/tinyml.html:27` → `<link rel="stylesheet" href="../styles.css?v=site1">`
   - Run `grep -rn "styles.css?v=" --include=*.html . | grep -v output/` and update any other page it lists the same way.
2. In `script.js`, inside `initProjectsTrack`, add the `prefetchSkills` helper and its `skillsPrefetched` flag from the target above. Put it directly above `function paint(x) {` (currently line 4217). `script.js` has other functions named `paint`, so use the one that takes `x` and sits inside `function initProjectsTrack()` (currently line 4140).
3. In `paint()`'s `if (nearest !== current) { … }` block, add `if (current === cards.length - 1) prefetchSkills();` as the last line, after `current = nearest;`.
4. From now on, when the stylesheet changes, bump the version on **every** page together. Add a one-line comment above the `<link rel="stylesheet">` in `skills.html` only if the other pages already have such a comment. Otherwise leave the markup comment-free.

## Boundaries

- Do NOT add prerendering or speculation rules.
- Do NOT change the 320/380 ms exit timing here (that's plan 020).
- Do NOT change the `script.js?v=` values, which already match.
- Do NOT prefetch anything other than `skills.html`. The stylesheet, script and fonts are shared and already cached once step 1 is done.
- If the cited lines don't match what you find (drift since 4b2f9d7), STOP and report.

## Verification

- **Mechanical**: `node --check script.js` exits 0. `grep -rn "styles.css?v=" --include=*.html . | grep -v output/` shows only `v=site1`.
- **Network check**: serve the site (`python3 -m http.server 8765`) and open `projects.html` with DevTools → Network open ("Disable cache" off).
  - Stepping onto 07 TinyML adds one `skills.html` request of type `prefetch`. It happens once, however many times you step off and back on.
  - Scroll on to Skills. The document request for `skills.html` is served "(prefetch cache)", and there is **no** new `styles.css` request.
- **Feel check**: with plan 020 applied, scroll from the last card into Skills with the Network panel throttled to "Fast 4G". The empty beat after the exit is short, and Skills' heading starts drawing right after it. There's no frozen pause.
- **Done when**: on a warm load, the gap between the turn's navigation and Skills' first paint is under 150 ms locally. Measure it with the Performance panel, or with a CDP screencast as used for plan 006 (`plans/006-meet-probe.mjs` shows the setup).
