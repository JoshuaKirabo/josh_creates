/*
  Blog page — motion ported from daqconsulting.com/case-studies.
  The original runs on GSAP, framer-motion and React; this is the same
  choreography (timings, curves, sequencing) in plain JavaScript.
*/
(() => {
  "use strict";

  const root = document.documentElement;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ================================================================
     Easing
     ================================================================ */
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(t) - x;
        if (Math.abs(e) < 1e-6) return sy(t);
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      let lo = 0, hi = 1;
      t = x;
      while (lo < hi) {
        const v = sx(t);
        if (Math.abs(v - x) < 1e-6) break;
        x > v ? (lo = t) : (hi = t);
        t = (lo + hi) / 2;
        if (hi - lo < 1e-7) break;
      }
      return sy(t);
    };
  }
  const pow = (p) => ({
    in: (t) => Math.pow(t, p),
    out: (t) => 1 - Math.pow(1 - t, p),
    inOut: (t) => (t < 0.5 ? Math.pow(2 * t, p) / 2 : 1 - Math.pow(2 - 2 * t, p) / 2),
  });
  const P1 = pow(2), P2 = pow(3), P3 = pow(4), P4 = pow(5);
  const EASE = {
    linear: (t) => t,
    "power1.in": P1.in, "power1.out": P1.out, "power1.inOut": P1.inOut,
    "power2.in": P2.in, "power2.out": P2.out, "power2.inOut": P2.inOut,
    "power3.in": P3.in, "power3.out": P3.out, "power3.inOut": P3.inOut,
    "power4.in": P4.in, "power4.out": P4.out, "power4.inOut": P4.inOut,
    "expo.out": (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    easeIn: bezier(0.42, 0, 1, 1),
    easeOut: bezier(0, 0, 0.58, 1),
    easeInOut: bezier(0.42, 0, 0.58, 1),
    expoOut: bezier(0.19, 1, 0.22, 1), // [0.19, 1, 0.22, 1]
    turn: bezier(0.7, 0, 0.2, 1), // [0.7, 0, 0.2, 1]
    siteOut: bezier(0.23, 1, 0.32, 1), // the site's --ease-out
    inOutCubic: bezier(0.65, 0, 0.35, 1), // the site's --ease-in-out-cubic
  };
  const ease = (e) => (typeof e === "function" ? e : EASE[e] || EASE.linear);

  /* ================================================================
     Tweens
     ================================================================ */
  // A single rAF-driven tween. Returns { kill, promise }.
  function tween({ duration = 0, delay = 0, ease: e = "linear", update, done }) {
    const fn = ease(e);
    let raf = 0, killed = false, resolve;
    const promise = new Promise((r) => (resolve = r));
    const finish = () => {
      update && update(1);
      done && done();
      resolve();
    };
    const start = performance.now() + delay * 1000;
    const step = (now) => {
      if (killed) return;
      if (now < start) return void (raf = requestAnimationFrame(step));
      const p = duration <= 0 ? 1 : clamp((now - start) / (duration * 1000), 0, 1);
      update && update(fn(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        done && done();
        resolve();
      }
    };
    if (duration <= 0 && delay <= 0) finish();
    else raf = requestAnimationFrame(step);
    return {
      promise,
      kill() {
        killed = true;
        cancelAnimationFrame(raf);
      },
    };
  }

  // Motion value: a number that animates and notifies (framer-motion style).
  function mv(initial) {
    let v = initial, anim = null;
    const subs = new Set();
    const api = {
      get: () => v,
      set(n) {
        v = n;
        subs.forEach((f) => f(v));
      },
      on(f) {
        subs.add(f);
        return () => subs.delete(f);
      },
      stop() {
        anim && anim.kill();
        anim = null;
      },
      animate(to, { duration = 0.3, delay = 0, ease: e = "easeInOut" } = {}) {
        api.stop();
        const from = v;
        anim = tween({ duration, delay, ease: e, update: (p) => api.set(from + (to - from) * p) });
        return anim.promise;
      },
    };
    return api;
  }

  const lerp = (a, b, p) => a + (b - a) * p;

  // Two-layer "ink" text: an outlined draft and a solid fill wiped in by --ink.
  const INK_FILL =
    "linear-gradient(100deg, #000 calc(var(--ink) * 1%), transparent calc((var(--ink) + 10) * 1%))";
  const INK_DRAFT =
    "linear-gradient(100deg, transparent calc(var(--ink) * 1%), #000 calc((var(--ink) + 10) * 1%))";

  /* ================================================================
     Page turn — a curved black page sweeps across between pages
     ================================================================ */
  const TURN_KEY = "daq-turn";
  // Shared with script.js: which way a visitor crossed between index.html and here.
  const ARRIVAL_KEY = "josh-arrival";
  const PAGE_TITLES = {
    "/": { kicker: "Home", lines: [], name: "Home" },
    "/blog.html": { kicker: "Insights", lines: ["Josh’s", "Thoughts."], name: "Insights" },
    "/case-studies": { kicker: "Company · Outcomes", lines: [], name: "Outcomes" },
    "/data-engineering": { kicker: "Service 01 / 05", eyebrow: "Core Infrastructure", lines: ["Data", "Engineering."] },
    "/ai-engineering": { kicker: "Service 02 / 05", eyebrow: "Autonomous Architecture", lines: ["AI", "Engineering."] },
    "/analytics": { kicker: "Service 03 / 05", eyebrow: "Semantic Intelligence", lines: ["Analytics", "Division."] },
    "/migration": { kicker: "Service 04 / 05", eyebrow: "Databricks and Microsoft", lines: ["Estate", "Migration."] },
    "/managed-services": { kicker: "Service 05 / 05", eyebrow: "Operational Sovereignty", lines: ["Managed", "Systems."] },
    "/migration-to-databricks": { kicker: "Migration · Track 01", eyebrow: "To Databricks", lines: ["Migration to", "Databricks."] },
    "/ssrs-to-power-bi-migration": { kicker: "Migration · Track 02", eyebrow: "SSRS to Power BI", lines: ["SSRS,", "re-engineered."], compact: true },
    "/migration-to-fabric": { kicker: "Migration · Track 03", eyebrow: "To Microsoft Fabric", lines: ["Migration to", "Fabric."] },
    "/about": { kicker: "Company", eyebrow: "About DAQ", lines: ["The", "Firm."] },
    "/careers": { kicker: "Company", eyebrow: "Open Architecture Node", lines: ["Join the", "Architects."] },
    "/contact": { kicker: "Contact", eyebrow: "Operational Protocol", lines: ["Initiate", "Connection."] },
    "/privacy": { kicker: "Record", eyebrow: "Privacy Policy", lines: ["Privacy", "Policy."] },
    "/terms": { kicker: "Record", eyebrow: "Terms of Use", lines: ["Terms of", "Use."] },
  };
  function turnCardFor(url) {
    const path = url.pathname.replace(/\/$/, "") || "/";
    const t = PAGE_TITLES[path];
    if (t) return { ...t, name: t.name || t.lines.join(" ").replace(/[.,]+$/, "") };
    const card = [...document.querySelectorAll("a[href]")].find((a) => a.href === url.href && a.querySelector("h2"));
    if (card) {
      const text = card.querySelector("h2").textContent.trim().replace(/[.,]+$/, "");
      return { kicker: "Insights", eyebrow: "Article", lines: [text + "."], name: text };
    }
    const tail = (path.split("/").filter(Boolean).pop() || "").replace(/-/g, " ").replace(/\.html?$/, "");
    return { kicker: tail || "Page", lines: [], name: tail || "the page" };
  }
  function turnCardMarkup(card) {
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const lines = card.lines
      .map(
        (l, i) =>
          `<span data-turn-line style="--ink:-12" class="relative block ${card.compact ? "whitespace-nowrap" : ""} ${i === card.lines.length - 1 ? "font-bold" : ""}"><span class="block text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.32)]" style="-webkit-mask-image:${INK_DRAFT};mask-image:${INK_DRAFT}">${esc(l)}</span><span class="absolute inset-0 block text-white" style="-webkit-mask-image:${INK_FILL};mask-image:${INK_FILL}">${esc(l)}</span></span>`,
      )
      .join("");
    return `<div class="w-full max-w-[1600px] mx-auto px-4 md:px-8 pt-32 md:pt-40"><div data-turn-kicker class="flex items-center gap-4 mb-8 md:mb-12"><span class="font-mono text-[10px] tracking-[0.3em] uppercase text-white/58 whitespace-nowrap">${esc(card.kicker)}${card.eyebrow ? `<span class="hidden sm:inline"> · ${esc(card.eyebrow)}</span>` : ""}</span><span class="relative h-px flex-1 max-w-[280px] bg-white/10"><span data-turn-rule class="absolute inset-0 origin-left bg-white/40" style="transform:scaleX(0)"></span></span></div>${
      card.lines.length
        ? `<p class="${card.compact ? "text-[clamp(2.25rem,9.5vw,8.5rem)]" : "text-[clamp(2.75rem,9.5vw,8.5rem)]"} font-sans font-thin tracking-tighter leading-[0.85] uppercase">${lines}</p>`
        : ""
    }</div>`;
  }
  // Page edge path; `scale` 100 for the viewBox fill, 1 for the objectBoundingBox clip.
  const bow = (x) => 12 * Math.sin(Math.PI * clamp((x + 16) / 132, 0, 1));
  function pagePath(trail, lead, scale) {
    const k = scale / 100;
    const f = (v) => (v * k).toFixed(scale === 1 ? 4 : 2);
    const s = f(trail), l = f(lead), c = f(trail + bow(trail)), d = f(lead + bow(lead));
    const [u, m, p, h, e] = [f(14.17), f(49.94), f(83), f(0), f(100)];
    return `M${s},${h}C${s},${h},${c},${u},${c},${m}C${c},${p},${s},${e},${s},${e}L${l},${e}C${l},${e},${d},${p},${d},${m}C${d},${u},${l},${h},${l},${h}Z`;
  }
  const announcer = document.querySelector("body > .sr-only");
  const Turn = (() => {
    let busy = false;
    function build(card) {
      const el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.className = "fixed inset-0 z-[90] pointer-events-auto";
      el.innerHTML = `<div class="absolute inset-0 bg-black" data-dim style="opacity:0"></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 h-full w-full"><defs><clipPath id="page-turn-clip" clipPathUnits="objectBoundingBox"><path data-clip></path></clipPath></defs><path data-fill fill="#000"></path></svg><div class="absolute inset-0" style="clip-path:url(#page-turn-clip);-webkit-clip-path:url(#page-turn-clip)">${turnCardMarkup(card)}</div>`;
      document.body.appendChild(el);
      const trail = mv(-16), lead = mv(-16), dim = mv(0), ink = mv(-12), rule = mv(0);
      const fill = el.querySelector("[data-fill]"), clip = el.querySelector("[data-clip]");
      const draw = () => {
        fill.setAttribute("d", pagePath(trail.get(), lead.get(), 100));
        clip.setAttribute("d", pagePath(trail.get(), lead.get(), 1));
      };
      trail.on(draw);
      lead.on(draw);
      dim.on((v) => (el.querySelector("[data-dim]").style.opacity = v));
      ink.on((v) => el.querySelectorAll("[data-turn-line]").forEach((l) => l.style.setProperty("--ink", v)));
      rule.on((v) => {
        const r = el.querySelector("[data-turn-rule]");
        r && (r.style.transform = `scaleX(${v})`);
      });
      draw();
      return { el, trail, lead, dim, ink, rule };
    }
    // Leave: the page sweeps in from the left, then we navigate.
    function leave(url) {
      if (busy) return;
      busy = true;
      root.dataset.turn = "play";
      const card = turnCardFor(url);
      const t = build(card);
      t.dim.animate(0.5, { duration: 0.3, ease: "easeOut" });
      t.ink.animate(112, { duration: 0.66, ease: "turn", delay: 0.16 });
      t.rule.animate(1, { duration: 0.7, ease: "expoOut", delay: 0.26 });
      t.lead.animate(116, { duration: 0.66, ease: "turn", delay: 0.06 }).then(() => {
        t.dim.set(0);
        // Only a page that runs this script can finish the turn on arrival.
        if (url.origin === location.origin && /(\/blog\.html|\/articles\/[^/]+\.html)$/.test(url.pathname))
          try {
            sessionStorage.setItem(TURN_KEY, JSON.stringify(card));
          } catch {}
        location.href = url.href;
        // If the browser keeps this page alive (bfcache), clear the cover on return.
        addEventListener(
          "pageshow",
          (e) => {
            if (!e.persisted) return;
            t.el.remove();
            busy = false;
            delete root.dataset.turn;
          },
          { once: true },
        );
      });
    }
    // Arrive: this page loaded under a finished turn; the page lifts away.
    function arrive() {
      let card;
      try {
        card = JSON.parse(sessionStorage.getItem(TURN_KEY) || "null");
        sessionStorage.removeItem(TURN_KEY);
      } catch {}
      if (!card || reduced()) return false;
      root.dataset.turn = "play";
      const t = build(card);
      t.lead.set(116);
      t.ink.set(112);
      t.rule.set(1);
      setTimeout(
        () =>
          requestAnimationFrame(() => {
            setTimeout(() => delete root.dataset.turn, 180);
            t.trail.animate(116, { duration: 0.72, ease: "turn" }).then(() => {
              t.el.remove();
              announcer && (announcer.textContent = `Now on ${document.title.split("|")[0].trim()}`);
              document.getElementById("content")?.focus({ preventScroll: true });
            });
          }),
        300,
      );
      return true;
    }
    return { leave, arrive, get busy() { return busy; } };
  })();

  // Placeholder links stay focusable without navigating, as on index.html.
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("[data-placeholder-link]")) e.preventDefault();
  });

  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      // Josh's top bar navigates like the rest of the site, without DAQ's page turn.
      if (a.getAttribute("href").startsWith("#") || a.closest(".blog-topbar")) return;
      let url;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (!/^(https?|file):$/.test(url.protocol) || /linkedin\.com$/.test(url.hostname)) return;
      if (url.href.split("#")[0] === location.href.split("#")[0] || reduced()) return;
      e.preventDefault();
      Turn.leave(url);
    },
    true,
  );

  /* ================================================================
     Outcome artworks — a brighter copy sweeps across each drawing
     ================================================================ */
  // First-view entrances that act out a cover's idea. Each replaces the
  // cover's first sweep; hovering still plays the sweep as usual.
  const ENTRANCES = {
    // "Five capacities, one score": the bundles draw in, the gate appears as
    // they arrive, the score line leaves it and the square settles.
    capacities(svg) {
      const q = (sel) => [...svg.querySelectorAll(sel)];
      const wipes = q(".cap-wipe"), gates = q('[data-e="gate"]');
      const score = svg.querySelector('[data-e="score"]');
      const square = svg.querySelector('[data-e="square"]');
      const label = svg.querySelector('[data-e="score-label"]');
      // Inline values take over from the CSS resting state, then it lets go.
      wipes.forEach((w) => ((w.style.transformOrigin = "0 0"), (w.style.transform = "scaleX(0)")));
      [...gates, square, label].forEach((el) => (el.style.opacity = "0"));
      Object.assign(score.style, { strokeDasharray: "1", strokeDashoffset: "1" });
      Object.assign(square.style, { transformBox: "fill-box", transformOrigin: "center" });
      svg.classList.add("is-drawn");
      wipes.forEach((w, i) =>
        tween({ duration: 0.9, delay: i * 0.08, ease: "inOutCubic", update: (p) => (w.style.transform = `scaleX(${p})`) }),
      );
      gates.forEach((g) => tween({ duration: 0.2, delay: 0.9, ease: "siteOut", update: (p) => (g.style.opacity = p) }));
      tween({ duration: 0.45, delay: 1.0, ease: "siteOut", update: (p) => (score.style.strokeDashoffset = 1 - p) });
      tween({ duration: 0.25, delay: 1.4, ease: "siteOut", update: (p) => {
        square.style.opacity = p;
        square.style.transform = `scale(${lerp(0.6, 1, p)})`;
      } });
      tween({ duration: 0.2, delay: 1.4, ease: "siteOut", update: (p) => (label.style.opacity = p) }).promise.then(() => {
        [...wipes, ...gates, score, square, label].forEach((el) => el.removeAttribute("style"));
        // then it keeps going: pulses ride the threads into the gate and out (heading.css)
        svg.classList.add("is-flowing");
      });
    },

    // Fake Listings: the grid is already up; the matching runs. Each link draws
    // from the original to a copy, and as it lands the copy lights and is marked.
    listings(svg) {
      const q = (sel) => [...svg.querySelectorAll(sel)];
      const masks = q("[data-linkmask]");
      const copies = q('[data-role="copy"]').sort((a, b) => a.dataset.copy - b.dataset.copy);
      const frames = copies.map((c) => c.querySelector("[data-frame]"));
      const marks = copies.map((c) => c.querySelector("[data-mark]"));
      masks.forEach((m) => (m.style.strokeDashoffset = "1"));
      frames.forEach((f) => (f.style.opacity = ".35"));
      marks.forEach((m) => Object.assign(m.style, { opacity: "0", transformBox: "fill-box", transformOrigin: "center" }));
      svg.classList.add("is-drawn");
      let last;
      masks.forEach((m, i) => {
        const t0 = 0.2 + i * 0.25;
        tween({ duration: 0.6, delay: t0, ease: "siteOut", update: (p) => (m.style.strokeDashoffset = 1 - p) });
        tween({ duration: 0.2, delay: t0 + 0.5, ease: "siteOut", update: (p) => (frames[i].style.opacity = lerp(0.35, 1, p)) });
        last = tween({ duration: 0.25, delay: t0 + 0.55, ease: "siteOut", update: (p) => {
          marks[i].style.opacity = p;
          marks[i].style.transform = `scale(${lerp(0.6, 1, p)})`;
        } });
      });
      last.promise.then(() => {
        [...masks, ...frames, ...marks].forEach((el) => el.removeAttribute("style"));
        loop(svg, 5.6, () => relist(svg));
      });
    },

    // The T: breadth first (the bar grows out from its centre), then depth
    // (the stem grows down), then the square lands.
    tshape(svg) {
      const q = (sel) => [...svg.querySelectorAll(sel)];
      const bars = q("[data-bar]"), stems = q("[data-stem]");
      const ticks = svg.querySelector('[data-e="ticks"]'), square = svg.querySelector('[data-e="square"]');
      const breadth = q('[data-e="breadth-label"]'), depth = q('[data-e="depth-label"]');
      bars.forEach((b) => Object.assign(b.style, { transformBox: "fill-box", transformOrigin: "center", transform: "scaleX(0)" }));
      stems.forEach((st) => Object.assign(st.style, { transformBox: "fill-box", transformOrigin: "top", transform: "scaleY(0)" }));
      [ticks, square, ...breadth, ...depth].forEach((el) => (el.style.opacity = "0"));
      Object.assign(square.style, { transformBox: "fill-box", transformOrigin: "center" });
      svg.classList.add("is-drawn");
      bars.forEach((b, i) => tween({ duration: 0.7, delay: i * 0.04, ease: "siteOut", update: (p) => (b.style.transform = `scaleX(${p})`) }));
      tween({ duration: 0.3, delay: 0.35, ease: "siteOut", update: (p) => (ticks.style.opacity = p) });
      breadth.forEach((l) => tween({ duration: 0.2, delay: 0.5, ease: "siteOut", update: (p) => (l.style.opacity = p) }));
      const mid = (stems.length - 1) / 2;
      stems.forEach((st, i) =>
        tween({ duration: 0.6, delay: 0.45 + Math.abs(i - mid) * 0.02, ease: "siteOut", update: (p) => (st.style.transform = `scaleY(${p})`) }),
      );
      depth.forEach((l) => tween({ duration: 0.2, delay: 1.0, ease: "siteOut", update: (p) => (l.style.opacity = p) }));
      tween({ duration: 0.25, delay: 1.05, ease: "siteOut", update: (p) => {
        square.style.opacity = p;
        square.style.transform = `scale(${lerp(0.6, 1, p)})`;
      } }).promise.then(() => {
        [...bars, ...stems, ticks, square, ...breadth, ...depth].forEach((el) => el.removeAttribute("style"));
        svg.classList.add("is-flowing");
      });
    },
  };

  // Runs a cover's ongoing beat every `period` seconds while it is on screen
  // and the tab is visible; waits quietly otherwise.
  function loop(svg, period, beat) {
    let last = 0;
    const tick = () => {
      // Timers can bunch up after a tab has been in the background; never
      // start a beat before the previous one has had its full period.
      const now = performance.now();
      if (now - last >= period * 1000 - 50 && !reduced() && !document.hidden && !svg.classList.contains("is-offscreen")) {
        last = now;
        beat();
      }
      setTimeout(tick, period * 1000);
    };
    setTimeout(tick, 1200);
  }

  // Fake Listings' beat: a listing is reposted (it blinks out and back in),
  // then the matching runs again: the links retract, redraw one by one, and
  // the marks pulse as each copy is caught again.
  function relist(svg) {
    const plain = [...svg.querySelectorAll('[data-role="plain"]')];
    const tile = plain[Math.floor(Math.random() * plain.length)];
    tween({ duration: 0.2, ease: "power2.in", update: (p) => (tile.style.opacity = 1 - p) }).promise.then(() =>
      tween({ duration: 0.4, ease: "siteOut", update: (p) => {
        tile.style.opacity = p;
        tile.style.transform = `translateY(${lerp(6, 0, p)}px)`;
      } }).promise.then(() => tile.removeAttribute("style")),
    );
    const masks = [...svg.querySelectorAll("[data-linkmask]")];
    const marks = [...svg.querySelectorAll('[data-role="copy"]')]
      .sort((a, b) => a.dataset.copy - b.dataset.copy)
      .map((c) => c.querySelector("[data-mark]"));
    masks.forEach((m, i) => {
      const t0 = 0.9 + i * 0.08;
      tween({ duration: 0.35, delay: t0, ease: "power2.in", update: (p) => (m.style.strokeDashoffset = -p) }).promise.then(() => {
        m.style.strokeDashoffset = "1";
        tween({ duration: 0.6, delay: 0.15 + i * 0.25, ease: "siteOut", update: (p) => (m.style.strokeDashoffset = 1 - p) }).promise.then(() => {
          m.removeAttribute("style");
          const mk = marks[i];
          Object.assign(mk.style, { transformBox: "fill-box", transformOrigin: "center" });
          tween({ duration: 0.4, ease: "siteOut", update: (p) => (mk.style.transform = `scale(${1 + 0.5 * Math.sin(Math.PI * p)})`) }).promise.then(() =>
            mk.removeAttribute("style"),
          );
        });
      });
    });
  }

  function initField(svg) {
    const clipRect = svg.querySelector("[data-field-clip]");
    const overlay = svg.querySelector("[data-field-overlay]");
    const link = svg.closest("a");
    if (!clipRect || !overlay) return;
    let inView = false, played = false, run = null;
    const place = (x) => clipRect.setAttribute("transform", `translate(${x.toFixed(2)} 0)`);
    place(-110);
    const play = () => {
      if (!inView || document.hidden || reduced()) return;
      run && run.kill();
      place(-110);
      overlay.style.opacity = "1";
      run = tween({ duration: 2, ease: "power2.inOut", update: (p) => place(lerp(-110, 840, p)), done: () => (overlay.style.opacity = "0") });
    };
    const stop = () => {
      run && run.kill();
      run = null;
      overlay.style.opacity = "0";
    };
    new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting;
        svg.classList.toggle("is-offscreen", !inView);
        if (inView && !played) {
          played = true;
          const entrance = ENTRANCES[svg.dataset.entrance];
          // On an article page the figure fades in first; let it arrive, then play.
          const wait = svg.closest(".article-rise") ? 1100 : 0;
          if (entrance && !reduced()) setTimeout(() => entrance(svg), wait);
          else {
            svg.classList.add("is-drawn");
            play();
          }
        } else if (!inView) stop();
      },
      { threshold: 0.3 },
    ).observe(svg);
    link && link.addEventListener("pointerenter", () => matchMedia("(hover: hover) and (pointer: fine)").matches && play());
    document.addEventListener("visibilitychange", () => document.hidden && stop());
  }
  document.querySelectorAll(".OutcomeFields-module__OZp7ua__field").forEach(initField);

  /* ================================================================
     Top bar — the same motion as on index.html (ported from script.js)
     ================================================================ */
  // Hovering a link scrambles its label outward from the pointer.
  function createScramble(label) {
    const text = label.textContent;
    const copy = document.createElement("span");
    copy.className = "scramble-text";
    copy.textContent = text;
    const layer = document.createElement("span");
    layer.className = "scramble-layer";
    layer.setAttribute("aria-hidden", "true");
    label.replaceChildren(copy, layer);
    let frame;
    function reset() {
      cancelAnimationFrame(frame);
      label.classList.remove("is-scrambling");
      layer.replaceChildren();
    }
    return (event) => {
      if (reduced()) return;
      reset();
      const bounds = label.getBoundingClientRect();
      const range = document.createRange();
      let offset = 0, origin = 0, nearest = Infinity;
      const characters = Array.from(text, (real, index) => {
        range.setStart(copy.firstChild, offset);
        offset += real.length;
        range.setEnd(copy.firstChild, offset);
        const rect = range.getBoundingClientRect();
        const glyph = document.createElement("span");
        glyph.className = "scramble-char";
        glyph.textContent = real;
        glyph.style.left = `${rect.left - bounds.left}px`;
        glyph.style.width = `${rect.width}px`;
        const animated = /[a-z]/i.test(real);
        if (animated) {
          const distance = Math.hypot(rect.left + rect.width / 2 - event.clientX, rect.top + rect.height / 2 - event.clientY);
          if (distance < nearest) (nearest = distance), (origin = index);
        }
        return { glyph, real, animated, lastSwap: -Infinity };
      });
      layer.replaceChildren(...characters.map((c) => c.glyph));
      label.classList.add("is-scrambling");
      const started = performance.now();
      const tick = (now) => {
        let complete = true;
        characters.forEach((c, index) => {
          if (!c.animated) return;
          const elapsed = now - started - 28 * Math.abs(index - origin);
          if (elapsed < 0) return (complete = false);
          if (elapsed < 260) {
            if (now - c.lastSwap > 45) {
              c.glyph.textContent = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
              c.lastSwap = now;
            }
            complete = false;
          } else c.glyph.textContent = c.real;
        });
        if (complete) reset();
        else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
  }

  // Touch feedback follows contact; ten pixels of drift hands over to scrolling.
  function enableTouchFeedback(bar) {
    let press = null;
    const release = () => {
      press && press.element.classList.remove("is-touch-pressed");
      press = null;
    };
    document.addEventListener("pointerdown", (e) => {
      const touch = e.pointerType === "touch" || e.pointerType === "pen";
      root.classList.toggle("touch-input", touch);
      release();
      if (!touch || !e.isPrimary || e.button !== 0) return;
      const element = e.target.closest && e.target.closest(".section-nav-link, .topbar-wordmark");
      if (!element || !bar.contains(element)) return;
      press = { element, id: e.pointerId, x: e.clientX, y: e.clientY };
      element.classList.add("is-touch-pressed");
    }, { capture: true, passive: true });
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") root.classList.remove("touch-input");
      if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) release();
    }, { capture: true, passive: true });
    for (const type of ["pointerup", "pointercancel"]) document.addEventListener(type, release, { capture: true, passive: true });
    document.addEventListener("scroll", release, { capture: true, passive: true });
    addEventListener("pagehide", release);
  }

  function initTopbar() {
    const bar = document.querySelector(".blog-topbar");
    if (!bar) return;
    bar.querySelectorAll(".section-nav-link").forEach((link) => {
      const label = link.querySelector(".nav-label");
      if (!label) return;
      link.setAttribute("aria-label", label.textContent.trim());
      label.setAttribute("aria-hidden", "true");
      const scramble = createScramble(label);
      link.addEventListener("pointerenter", (e) => {
        if (e.pointerType !== "touch" && matchMedia("(hover: hover) and (pointer: fine)").matches) scramble(e);
      });
    });
    enableTouchFeedback(bar);
    bar.querySelectorAll(".topbar-wordmark, .section-nav > *").forEach((el, i) => el.style.setProperty("--nav-i", i));
    // index.html notes where its link was: from the top bar, the bar was
    // already on screen, so it stays and only the underline draws on; from
    // Home (or a fresh visit) the bar itself drops in. A page turn between
    // articles covers the bar, so neither plays under one.
    let turning = false, from = null;
    try {
      turning = !!sessionStorage.getItem(TURN_KEY);
      from = sessionStorage.getItem(ARRIVAL_KEY);
      sessionStorage.removeItem(ARRIVAL_KEY);
    } catch {}
    if (!reduced() && !turning) {
      const arrival = from === "bar" ? "nav-line-enter" : "nav-return";
      root.classList.add(arrival);
      setTimeout(() => root.classList.remove(arrival), 1000);
    }
    initLeave(bar);
  }

  // Following a top-bar link plays this page out before the next one loads:
  // the heading unfills, the cards sink and fade, and the bar does what the
  // next page needs. To Home the bar lifts out, since Home has none; to About,
  // Projects or Skills it stays and only the underline lifts off, leftward.
  function initLeave(bar) {
    let leaving = false;
    bar.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduced()) return;
      const a = e.target.closest("a[href]");
      if (!a || a.hasAttribute("data-placeholder-link") || a.hasAttribute("aria-current")) return;
      const url = new URL(a.href, location.href);
      if (url.href.split("#")[0] === location.href.split("#")[0]) return;
      e.preventDefault();
      if (leaving) return;
      leaving = true;
      const home = !url.hash || url.hash === "#home";
      root.classList.add("blog-leaving", ...(home ? ["nav-leave"] : ["nav-line-leave", "nav-line-back"]));
      try {
        if (!home) sessionStorage.setItem(ARRIVAL_KEY, "insights");
      } catch {}
      setTimeout(() => (location.href = url.href), 380);
    });
    // Coming back through the browser's history restores the page as it left.
    addEventListener("pageshow", (e) => {
      if (!e.persisted || !leaving) return;
      leaving = false;
      root.classList.remove("blog-leaving", "nav-leave", "nav-line-leave", "nav-line-back");
    });
  }

  // The first card's caption rises in behind the heading, line by line.
  function riseFirstCaption() {
    const caption = document.querySelector(".blog-card .OutcomesGallery-module__0WS_ta__caption");
    if (!caption || reduced()) return;
    [...caption.children].forEach((el, i) => el.style.setProperty("--i", i));
    caption.classList.add("blog-rise");
    requestAnimationFrame(() => requestAnimationFrame(() => caption.classList.add("is-entered")));
    // Handed back once risen, so the caption's own hover transitions return.
    setTimeout(() => caption.classList.remove("blog-rise", "is-entered"), 1500);
  }

  /* ================================================================
     Boot
     ================================================================ */
  // On narrow screens the link row scrolls; bring this page's link into view.
  const navRow = document.querySelector(".blog-topbar .section-nav");
  const here = navRow && navRow.querySelector("[aria-current]");
  if (here && navRow.scrollWidth > navRow.clientWidth)
    navRow.scrollLeft = here.offsetLeft - (navRow.clientWidth - here.offsetWidth) / 2;
  initTopbar();
  riseFirstCaption();
  // The heading enters like the site's sections: rule, fill, then outline.
  const head = document.querySelector(".blog-head");
  if (head && !reduced()) {
    head.classList.add("blog-motion");
    requestAnimationFrame(() => requestAnimationFrame(() => head.classList.add("is-entered")));
  }
  Turn.arrive();
})();
