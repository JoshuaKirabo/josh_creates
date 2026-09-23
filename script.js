'use strict';

async function startSite() {
// Home can start its intro while About loads. A direct About visit imports Home
// first so its return transition has exactly the same source composition.
if (!document.querySelector('.hero')) await window.sitePagesReady;

// Placeholder links remain focusable and interactive without navigating.
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-placeholder-link]')) event.preventDefault();
});

// Content and navigation work without JavaScript. Motion is a small enhancement.
const hero = document.querySelector('.hero');
const backdrop = document.querySelector('.site-backdrop');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

// Touch feedback follows contact, while native scrolling and click timing stay intact.
function enableTouchFeedback() {
  const root = document.documentElement;
  const controls = '.button, .menu-toggle, .nav-link, .social-link, .text-link, .section-nav-link, .topbar-wordmark, .project-link, .projects-rail a, .core-subject, .core-link';
  let press = null;
  let released = null;

  function cancel() {
    if (!press) return;
    press.cancelled = true;
    press.element.classList.remove('is-touch-pressed');
  }

  function reset() {
    cancel();
    press = released = null;
  }

  document.addEventListener('pointerdown', (event) => {
    const touch = event.pointerType === 'touch' || event.pointerType === 'pen';
    root.classList.toggle('touch-input', touch);
    if (!event.isPrimary) {
      // A second finger belongs to the browser's zoom/pan gesture.
      cancel();
      return;
    }
    reset();
    if (!touch || event.button !== 0) return;
    const element = event.target.closest(controls);
    if (!element || element.matches(':disabled, [aria-disabled="true"]')) return;
    press = { element, pointerId: event.pointerId, x: event.clientX, y: event.clientY, cancelled: false };
    element.classList.add('is-touch-pressed');
  }, { capture: true, passive: true });

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') root.classList.remove('touch-input');
    if (!press || event.pointerId !== press.pointerId || press.cancelled) return;
    // Ten pixels of tolerance absorb finger jitter. Beyond that, yield to scrolling.
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) cancel();
  }, { capture: true, passive: true });

  document.addEventListener('pointerup', (event) => {
    if (!press || event.pointerId !== press.pointerId) return;
    // Let the browser resolve the click target. Hit-testing the compressed visual
    // here would incorrectly reject an otherwise valid tap at the button's edge.
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) cancel();
    press.element.classList.remove('is-touch-pressed');
    released = press;
    press = null;
  }, { capture: true, passive: true });

  document.addEventListener('click', (event) => {
    const completed = released;
    released = null;
    // Some browsers still click after a small drag that never started a scroll.
    if (event.detail !== 0 && completed?.cancelled && completed.element.contains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('pointercancel', (event) => {
    if (event.pointerId === press?.pointerId) reset();
  }, { capture: true, passive: true });
  document.addEventListener('lostpointercapture', (event) => {
    if (event.pointerId === press?.pointerId) cancel();
  }, true);
  document.addEventListener('contextmenu', cancel, true);
  document.addEventListener('scroll', cancel, { capture: true, passive: true });
  document.addEventListener('keydown', () => {
    reset();
    root.classList.remove('touch-input');
  }, true);
  document.addEventListener('visibilitychange', reset);
  window.addEventListener('blur', reset);
  window.addEventListener('pagehide', reset);
  window.addEventListener('resize', reset, { passive: true });
  root.classList.add('touch-feedback-ready');
}
enableTouchFeedback();
// Pages without the hero (Projects) keep the backdrop and top bar effects below;
// everything hero-specific guards itself.

// Keep both controls anchored. Only the hidden links move into the native dialog;
// reparenting the live hamburger used to interrupt its press/morph on mobile.
const menuToggle = document.querySelector('.hero .menu-toggle');
const menuClose = document.querySelector('.menu-close');
const navigationPanel = document.querySelector('.navigation-panel');
const mobileMenu = document.querySelector('.mobile-menu');
const mobileNavigation = window.matchMedia('(max-width: 700px)');
if (menuToggle && menuClose && navigationPanel && typeof mobileMenu?.showModal === 'function') {
  const dialogHeader = mobileMenu.querySelector('.site-header');
  const homePosition = document.createComment('Navigation returns here on close.');
  navigationPanel.before(homePosition);
  let menuOpen = false;
  let revision = 0;
  let returnFocus = menuToggle;
  document.documentElement.classList.add('menu-ready');

  function positionMenuReveal(event) {
    if (!mobileMenu.open) return;
    const bounds = mobileMenu.getBoundingClientRect();
    const button = menuClose.getBoundingClientRect();
    const x = button.left + button.width / 2 - bounds.left;
    const y = button.top + button.height / 2 - bounds.top;
    // Reach the farthest corner from the actual trigger, including safe areas.
    const radius = Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y));
    mobileMenu.style.setProperty('--menu-reveal-x', `${x}px`);
    mobileMenu.style.setProperty('--menu-reveal-y', `${y}px`);
    mobileMenu.style.setProperty('--menu-reveal-radius', `${Math.ceil(radius) + 1}px`);
    if (event?.type === 'resize') {
      // Browser chrome/rotation must never expose a newly enlarged corner while
      // the circle catches up. Settle only the reveal, leaving icon motion alone.
      mobileMenu.getAnimations().filter(animation => animation.transitionProperty === 'clip-path')
        .forEach(animation => animation.finish());
    }
  }

  function restoreNavigation() {
    homePosition.after(navigationPanel);
    mobileMenu.close();
    document.documentElement.classList.remove('menu-open');
    if (mobileNavigation.matches) returnFocus.focus({ preventScroll: true });
    returnFocus = menuToggle;
  }

  async function setMenuOpen(open, instant = false) {
    if (open && !mobileNavigation.matches) return;
    const currentRevision = ++revision;
    menuOpen = open;
    menuToggle.setAttribute('aria-expanded', String(open));

    if (open && !mobileMenu.open) {
      dialogHeader.append(navigationPanel);
      document.documentElement.classList.add('menu-open');
      mobileMenu.showModal();
      positionMenuReveal();
      menuClose.focus({ preventScroll: true });
      if (!instant && !document.documentElement.classList.contains('menu-keyboard')) {
        // Paint the closed pose in the top layer before changing it. Reading
        // styles in the same task as showModal can still skip the first transition.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (currentRevision !== revision) return;
      }
    }
    mobileMenu.classList.toggle('is-open', open);
    if (open || !mobileMenu.open) return;
    if (!instant) {
      // Keep the toggle available throughout exit; reopening cancels this completion.
      await Promise.allSettled(mobileMenu.getAnimations({ subtree: true }).map(animation => animation.finished));
    }
    if (currentRevision === revision && !menuOpen) restoreNavigation();
  }

  function toggleMenu() {
    // A touch-generated click can have detail=0. Only real keyboard input should
    // disable motion; pointerdown/keydown below track that independently.
    setMenuOpen(!menuOpen);
  }
  menuToggle.addEventListener('click', toggleMenu);
  menuClose.addEventListener('click', toggleMenu);
  mobileMenu.addEventListener('cancel', (event) => {
    event.preventDefault();
    setMenuOpen(false);
  });
  navigationPanel.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (link && mobileMenu.open) {
      if (link.matches('[data-section-link]') && link.hash === '#about') {
        returnFocus = document.querySelector('#about') || menuToggle;
      }
      setMenuOpen(false);
    }
  });
  document.addEventListener('keydown', () => document.documentElement.classList.add('menu-keyboard'), true);
  document.addEventListener('pointerdown', () => document.documentElement.classList.remove('menu-keyboard'), true);
  document.addEventListener('touchstart', () => document.documentElement.classList.remove('menu-keyboard'), { capture: true, passive: true });
  mobileNavigation.addEventListener('change', () => {
    if (!mobileNavigation.matches) setMenuOpen(false, true);
  });
  window.addEventListener('resize', positionMenuReveal, { passive: true });
}

// Critically damped 2D spring. Response is Apple's settle window in seconds, not a duration.
function createSpring2D(response, paint, { restDistance = .1, restSpeed = .1 } = {}) {
  const omega = 2 * Math.PI / response;
  const position = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  let active = false;
  let frame = null;
  let previousTime = 0;

  function tick(now) {
    frame = null;
    if (!active) return;
    const dt = previousTime ? Math.min((now - previousTime) / 1000, .064) : 0;
    previousTime = now;
    const decay = Math.exp(-omega * dt);
    let settled = true;
    for (const axis of ['x', 'y']) {
      const delta = position[axis] - target[axis];
      const change = (velocity[axis] + omega * delta) * dt;
      position[axis] = target[axis] + (delta + change) * decay;
      velocity[axis] = (velocity[axis] - omega * change) * decay;
      if (Math.abs(position[axis] - target[axis]) > restDistance || Math.abs(velocity[axis]) > restSpeed) {
        settled = false;
      }
    }
    if (settled) {
      position.x = target.x;
      position.y = target.y;
      velocity.x = velocity.y = 0;
    }
    paint(position, settled);
    if (!settled) frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (!active || frame !== null) return;
    previousTime = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function rest() {
    position.x = position.y = target.x = target.y = velocity.x = velocity.y = 0;
    paint(position);
  }

  return {
    stop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = 0;
    },
    jumpTo(x, y) {
      this.stop();
      position.x = target.x = x;
      position.y = target.y = y;
      velocity.x = velocity.y = 0;
    },
    setActive(value) {
      if (active === value) return;
      active = value;
      if (!active) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        rest();
      }
    },
    setTarget(x, y) {
      if (!active) return;
      target.x = x;
      target.y = y;
      wake();
    }
  };
}

// Paint the grain once. Only sparse particle layers move; the fine texture stays anchored.
function createGrainParticles(container) {
  if (!container) return { setPlaying() {}, setPointer() {}, setPointerActive() {} };
  const overscan = 40;
  const fieldTravel = 18;
  const drifts = [
    { radius: 8, duration: 3000, phase: 0, direction: 1 },
    { radius: 12, duration: 3500, phase: 95, direction: -1 },
    { radius: 16, duration: 4000, phase: 205, direction: 1 },
    { radius: 10, duration: 4500, phase: 290, direction: -1 }
  ];
  const layers = [null, ...drifts].map((drift) => {
    const canvas = document.createElement('canvas');
    canvas.className = drift ? 'grain-surface grain-drift' : 'grain-surface';
    const shell = drift ? document.createElement('div') : null;
    if (shell) {
      shell.className = 'grain-drift-shell';
      shell.append(canvas);
    }
    return {
      canvas,
      shell,
      context: canvas.getContext('2d'),
      drift,
      depth: drift ? drift.radius / 16 : 0,
      seed: (Math.random() * 0xffffffff) >>> 0 || 1
    };
  });
  if (layers.some((layer) => !layer.context)) {
    return { setPlaying() {}, setPointer() {}, setPointerActive() {} };
  }
  container.replaceChildren(...layers.map((layer) => layer.shell || layer.canvas));

  let width = 0;
  let height = 0;
  let highDetail;
  let playing = false;
  let rampFrame = null;
  let rampStarted = null;
  const animations = [];
  const omega = 2 * Math.PI / 2; // Critically damped speed, response 2 s, no overshoot.

  function paint(layer, scale, count) {
    const { canvas, context, drift } = layer;
    const surfaceWidth = width + overscan * 2;
    const surfaceHeight = height + overscan * 2;
    canvas.width = Math.max(1, Math.floor(surfaceWidth * scale));
    canvas.height = Math.max(1, Math.floor(surfaceHeight * scale));
    canvas.style.width = `${surfaceWidth}px`;
    canvas.style.height = `${surfaceHeight}px`;
    let seed = layer.seed;
    const random = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 0x100000000;
    };
    if (!drift) {
      const pixels = context.createImageData(canvas.width, canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const shade = random() < .5 ? 255 : 0;
        const strength = random();
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade;
        pixels.data[i + 3] = Math.round(strength * strength * 48);
      }
      context.putImageData(pixels, 0, 0);
      return;
    }
    context.setTransform(canvas.width / surfaceWidth, 0, 0, canvas.height / surfaceHeight, 0, 0);
    context.fillStyle = '#fff';
    for (let i = 0; i < count; i++) {
      const x = random() * surfaceWidth;
      const y = random() * surfaceHeight;
      const radius = .5 + random() * .4;
      context.globalAlpha = .18 + random() * .24;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function resize() {
    const nextHighDetail = finePointer.matches;
    const nextWidth = container.clientWidth;
    // Reserve the touch screen's full height so Safari's toolbar does not rebuild
    // the grain as it expands and collapses. The container clips the spare area.
    const nextHeight = nextHighDetail ? container.clientHeight :
      Math.max(container.clientHeight, window.screen?.height || 0);
    if (width === nextWidth && height === nextHeight && highDetail === nextHighDetail) return;
    width = nextWidth;
    height = nextHeight;
    highDetail = nextHighDetail;
    const area = (width + overscan * 2) * (height + overscan * 2);
    const pixelBudget = highDetail ? 1400000 : 350000;
    const scale = Math.min(1, Math.sqrt(pixelBudget / Math.max(1, area)));
    const count = Math.ceil((highDetail ? Math.min(3600, area / 320) : Math.min(900, area / 700)) / drifts.length);
    layers.forEach((layer) => paint(layer, scale, count));
  }

  resize();
  // Keep the static texture until the canvas has actually been painted.
  container.classList.add('is-painted');
  layers.forEach(({ canvas, drift }) => {
    if (!drift) return;
    // Equal-and-opposite rotations describe a continuous orbit without rotating
    // the painted field. The first and last positions AND velocities match.
    const transform = (angle) => `rotate(${angle}deg) translate3d(${drift.radius}px, 0, 0) rotate(${-angle}deg)`;
    canvas.style.transform = transform(drift.phase);
    if (typeof canvas.animate !== 'function') return;
    const animation = canvas.animate([
      { transform: transform(drift.phase) },
      { transform: transform(drift.phase + drift.direction * 360) }
    ], { duration: drift.duration, iterations: Infinity, easing: 'linear', fill: 'both' });
    animation.pause();
    animation.currentTime = 0;
    animation.playbackRate = 0;
    animations.push(animation);
  });

  function ramp(now) {
    rampFrame = null;
    if (!playing) return;
    if (rampStarted === null) rampStarted = now;
    const elapsed = (now - rampStarted) / 1000;
    const speed = 1 - (1 + omega * elapsed) * Math.exp(-omega * elapsed);
    const settled = 1 - speed < .001;
    animations.forEach((animation) => animation.updatePlaybackRate(settled ? 1 : speed));
    // Once up to speed, the browser owns the motion: no canvas redraws, timers,
    // texture allocations, or JavaScript animation loop during steady motion.
    if (!settled) rampFrame = requestAnimationFrame(ramp);
  }

  function paintField(position) {
    const shiftX = fieldTravel * Math.tanh(position.x / Math.max(width / 2, 1));
    const shiftY = fieldTravel * Math.tanh(position.y / Math.max(height / 2, 1));
    layers.forEach(({ shell, depth }) => {
      if (!shell) return;
      shell.style.transform = `translate3d(${shiftX * depth}px, ${shiftY * depth}px, 0)`;
    });
  }
  // Heavier than the spotlight so motes trail the pointer instead of locking to it.
  const field = createSpring2D(.5, paintField);

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
  else window.addEventListener('resize', resize, { passive: true });
  finePointer.addEventListener('change', resize);
  return {
    setPlaying(value) {
      if (playing === value) return;
      playing = value;
      if (rampFrame !== null) cancelAnimationFrame(rampFrame);
      rampFrame = null;
      rampStarted = null;
      animations.forEach((animation) => {
        if (playing) {
          animation.updatePlaybackRate(0);
          animation.play();
        } else animation.pause();
      });
      // Pausing holds each layer's current position. Resuming accelerates from it.
      if (playing && animations.length) rampFrame = requestAnimationFrame(ramp);
    },
    setPointer(x, y) {
      field.setTarget(x, y);
    },
    setPointerActive(value) {
      field.setActive(value);
    }
  };
}

const grainParticles = createGrainParticles(backdrop.querySelector('.grain-particles'));
const increasedContrast = window.matchMedia('(prefers-contrast: more)');
let pageIsActive = true;
// Keep the field still until the entrance starts. Skipping or omitting the intro
// releases it immediately; otherwise it wakes with the shared intro clock.
let starsReady = !document.documentElement.classList.contains('intro-pending');
function pointerFromEvent(event) {
  return {
    x: event.clientX - window.innerWidth / 2,
    y: event.clientY - window.innerHeight / 2
  };
}
function setAmbientPointer(x, y) {
  grainParticles.setPointer(x, y);
}
function recenterAmbientPointer() {
  setAmbientPointer(0, 0);
}
window.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  const { x, y } = pointerFromEvent(event);
  setAmbientPointer(x, y);
}, { passive: true });
document.documentElement.addEventListener('pointerleave', recenterAmbientPointer, { passive: true });
window.addEventListener('blur', recenterAmbientPointer);
window.addEventListener('resize', recenterAmbientPointer, { passive: true });
function syncAmbientMotion() {
  // The star field is fixed behind both sections, so it keeps drifting on About.
  const playing = pageIsActive && !document.hidden && !reducedMotion.matches &&
    !increasedContrast.matches && starsReady;
  const pointerActive = playing && finePointer.matches &&
    !document.documentElement.classList.contains('intro-pending');
  backdrop.dataset.ambientMotion = playing ? 'playing' : 'paused';
  grainParticles.setPlaying(playing);
  grainParticles.setPointerActive(pointerActive);
}
document.addEventListener('visibilitychange', syncAmbientMotion);
window.addEventListener('pagehide', () => {
  pageIsActive = false;
  syncAmbientMotion();
});
window.addEventListener('pageshow', () => {
  pageIsActive = true;
  syncAmbientMotion();
});
reducedMotion.addEventListener('change', syncAmbientMotion);
increasedContrast.addEventListener('change', syncAmbientMotion);
finePointer.addEventListener('change', syncAmbientMotion);
syncAmbientMotion();

// Occasional section navigation: spatial consistency. Reuse the existing
// critically damped spring for one-gesture section changes. The large spatial
// fold uses a 1.1 s response: roughly 600–800 ms of visible word travel, with
// a gentle settle after it. The same spring carries momentum through reversals.
// Only the two section boundaries matter; the About layout is independent.
function enableSectionScroll() {
  const root = document.documentElement;
  const about = document.querySelector('#about');
  if (!hero || !about) return;
  const wordmark = hero.querySelector('.wordmark-stage');
  const portrait = hero.querySelector('.portrait-scroll');
  const heroContent = hero.querySelector('.hero-content');
  // The heading travels; only the parts of it with no About twin fade.
  const headingRule = heroContent?.querySelector?.('.hero-heading-rule');
  const heroFooter = hero.querySelector('.hero-footer');
  const topbar = about.querySelector('.about-topbar');
  const aboutFooter = about.querySelector('.about-footer');
  // About's own content sits under the hero for the whole fold, so it has to
  // stay out of sight until the words have nearly landed.
  const aboutContent = about.querySelector('.about-content');
  const entryPage = document.querySelector('main')?.dataset?.entryPage;
  const links = [...document.querySelectorAll('[data-section-link]')];
  const currentLinks = links.filter(link => link.matches('.nav-link, .section-nav-link'));
  const dividers = [...(hero.querySelectorAll?.('.nav-divider') || [])];
  const runway = about.previousElementSibling?.classList?.contains('hero-runway')
    ? about.previousElementSibling : null;
  // Hero + runway is the fold length. CSS overlaps the two sticky surfaces;
  // About's own layout offset is no longer the distance through the fold.
  const foldDistance = () => runway ? hero.offsetHeight + runway.offsetHeight : about.offsetTop;
  let boundary = 1;
  let running = false;
  let destination = 0;
  let paintFrame = null;
  let focusDestination = false;
  let presentedPosition = window.scrollY;
  let handoverState = null;
  let currentSection = null;
  let arrivedState = null;
  let foldingState = null;

  const clamp = value => Math.min(1, Math.max(0, value));
  // Where one element sits inside its own slice of the shared cascade.
  const slice = (progress, start, end) => clamp((progress - start) / (end - start));
  const smooth = value => value * value * (3 - 2 * value);
  // An empty string hands opacity back to CSS, so the entrance keeps its rules.
  const fade = (element, value) => {
    if (element) element.style.opacity = value >= 1 ? '' : String(value);
  };

  // The name and the six links exist on both screens, so they travel between
  // them rather than one layout being covered by another. Each word keeps its
  // reading order and hands over to its top bar counterpart on arrival.
  let nameFold = null;
  let navFolds = [];
  // The signature sits in the same corner on every page, so it holds still
  // and only hands over to About's copy.
  let signatureFold = null;
  let heroSocials = null;
  let heroSignature = null;
  let aboutSignature = null;
  let footerRule = null;
  // Each role's two heading lines shrink into that role's footer icon and
  // morph into it: the words collapse as the icon's strokes draw in.
  let headingFolds = [];
  // Lines with nowhere to land fade instead.
  let headingRest = [];
  // About's own row owns the current-page highlight. The fold sweeps it in
  // once that row's label has landed, instead of it appearing after the spring.
  const pillLink = about.querySelector('.section-nav-link[href$="#about"]');
  let pillWindow = [.62, .92];
  let pillShown = null;
  // Header controls with nothing to become: the hamburger, and any link the
  // top bar has no counterpart for.
  let headerRest = [];
  let foldStale = true;

  // Range boxes follow the glyphs, not the padded control around them.
  // Both ends of a fold have to be measured the same way, or the uniform scale
  // between them inherits the difference. A range over the glyphs is the common
  // basis: an element box would be the line box at one end and the font's own
  // metrics at the other. A scrambling label keeps its glyphs in .scramble-text
  // beside an absolutely positioned layer, so measure that span and skip it.
  function inkBox(element) {
    const glyphs = element.querySelector?.('.scramble-text') || element;
    const range = document.createRange();
    range.selectNodeContents(glyphs);
    const box = range.getBoundingClientRect();
    range.detach?.();
    return box.width ? box : glyphs.getBoundingClientRect();
  }

  function planFold(mover, from, to, reveal, start, end) {
    const source = inkBox(from);
    const target = inkBox(to);
    if (!source.width || !target.width) return null;
    // About already occupies its arrival pose through native sticky layout.
    // No scroll compensation belongs in these viewport-space coordinates.
    const origin = mover.getBoundingClientRect();
    return {
      mover, reveal, start, end,
      scale: target.width / source.width,
      originX: origin.left, originY: origin.top,
      fromX: source.left + source.width / 2,
      fromY: source.top + source.height / 2,
      toX: target.left + target.width / 2,
      toY: target.top + target.height / 2
    };
  }

  function applyFold(plan, progress) {
    // Each stagger needs its own soft departure and arrival. Clamping a linear
    // path stopped words at full speed while the section spring kept moving.
    // The same curve retraces exactly when the gesture reverses.
    const travel = smooth(slice(progress, plan.start, plan.end));
    const scale = 1 + (plan.scale - 1) * travel;
    const x = plan.fromX + (plan.toX - plan.fromX) * travel;
    const y = plan.fromY + (plan.toY - plan.fromY) * travel;
    // Solve the offset that puts the travelling centre exactly on the straight
    // line between its two rest positions, whatever the current scale is.
    plan.mover.style.transform =
      `translate3d(${x - plan.originX - (plan.fromX - plan.originX) * scale}px, ` +
      `${y - plan.originY - (plan.fromY - plan.originY) * scale}px, 0) scale(${scale})`;
    // Same threshold as hiding the hero, so the travelling copy is never
    // pulled off-screen a frame before the top bar mark is there.
    // Once both copies occupy the same position, blend their rasterization and
    // outline weight. A hard swap made the small JOSH suddenly turn much bolder.
    const handover = smooth(slice(progress, plan.handoverStart ?? .92, plan.handoverEnd ?? .999));
    plan.mover.style.opacity = String(1 - handover);
    fade(plan.reveal, handover);
    // Icons have no counterpart on the hero, so they join the word as it lands
    // instead of popping in with the handover. Ease-out: fast at first sight.
    if (plan.icon) {
      const enter = slice(travel, .7, 1);
      const eased = enter * (2 - enter);
      plan.icon.style.opacity = eased >= 1 ? '' : String(eased);
      plan.icon.style.transform = eased >= 1
        ? ''
        : `translate3d(${-40 * (1 - eased)}%, 0, 0) scale(${.94 + .06 * eased})`;
    }
  }

  function planMorph(line, icon, start, end) {
    const source = inkBox(line);
    const target = icon.getBoundingClientRect();
    if (!source.width || !target.width) return null;
    const origin = line.getBoundingClientRect();
    return {
      mover: line, reveal: icon, start, end, morph: true,
      // The words arrive a little taller than the icon, then collapse into it.
      scale: target.height * 1.1 / source.height,
      originX: origin.left, originY: origin.top,
      fromX: source.left + source.width / 2,
      fromY: source.top + source.height / 2,
      toX: target.left + target.width / 2,
      toY: target.top + target.height / 2
    };
  }

  function applyMorph(plan, progress) {
    const travel = smooth(slice(progress, plan.start, plan.end));
    // Over the last stretch the word pinches to a sliver and gives way.
    const collapse = smooth(slice(travel, .75, 1));
    const scale = 1 + (plan.scale - 1) * travel;
    const scaleX = scale * (1 - .9 * collapse);
    const x = plan.fromX + (plan.toX - plan.fromX) * travel;
    const y = plan.fromY + (plan.toY - plan.fromY) * travel;
    plan.mover.style.transform =
      `translate3d(${x - plan.originX - (plan.fromX - plan.originX) * scaleX}px, ` +
      `${y - plan.originY - (plan.fromY - plan.originY) * scale}px, 0) scale(${scaleX}, ${scale})`;
    plan.mover.style.opacity = String(1 - collapse);
    // Both lines of a role share one icon; only the trailing one drives it,
    // so the strokes finish drawing as the last word goes.
    if (!plan.drives) return;
    const draw = smooth(slice(travel, .8, 1));
    plan.reveal.style.opacity = draw >= 1 ? '' : String(Math.min(1, draw * 3));
    plan.reveal.style.transform = draw >= 1 ? '' : `scale(${.7 + .3 * draw}) rotate(${-45 * (1 - draw)}deg)`;
    if (draw >= 1) plan.reveal.style.removeProperty?.('--draw');
    else plan.reveal.style.setProperty?.('--draw', String(draw));
  }

  function clearFolds() {
    [nameFold, signatureFold, ...navFolds, ...headingFolds].forEach((plan) => {
      if (!plan) return;
      plan.mover.style.transform = '';
      plan.mover.style.opacity = '';
      plan.reveal.style.opacity = '';
      if (plan.morph) {
        plan.reveal.style.transform = '';
        plan.reveal.style.removeProperty?.('--draw');
      }
      if (plan.icon) {
        plan.icon.style.opacity = '';
        plan.icon.style.transform = '';
      }
    });
  }

  function measureFolds() {
    clearFolds();
    nameFold = null;
    signatureFold = null;
    navFolds = [];
    headingFolds = [];
    about.style.transform = '';
    if (topbar) topbar.style.transform = '';
    // Reduced motion leaves the hero in flow, so there is nothing to fold into.
    if (reducedMotion.matches || !root.classList.contains('section-scroll-ready')) return;
    // Measure rest poses even while intro letters are still entering. The class
    // is removed in this task, so these measurement-only overrides never paint.
    root.classList.add('fold-measuring');
    const heroName = hero.querySelector('.wordmark');
    const barName = about.querySelector('.topbar-wordmark');
    if (wordmark && heroName && barName) {
      nameFold = planFold(wordmark, heroName, barName, barName, 0, .92);
    }
    const heroLinks = [...(hero.querySelectorAll?.('.nav-link') || [])];
    const barLinks = [...(about.querySelectorAll?.('.section-nav-link') || [])];
    // The nearest word leads and the farthest trails, so the row peels up into
    // the bar. Every word still lands with the scroll, not ahead of it.
    const lead = .03;
    const span = Math.max(.3, .92 - lead * (heroLinks.length - 1));
    heroLinks.forEach((link, index) => {
      const target = barLinks[index];
      const label = link.querySelector?.('.nav-label');
      if (!target || !label) return;
      const landing = target.querySelector?.('.nav-label') || target.querySelector?.('span') || target;
      const plan = planFold(link, label, landing, landing,
        index * lead, index * lead + span);
      if (plan) {
        plan.icon = target.querySelector('svg');
        navFolds.push(plan);
      }
    });
    // The role lines follow the name and finish with it, two lines to each
    // icon in reading order.
    const heroLines = [...(hero.querySelectorAll?.('.hero-heading-line') || [])];
    // Only the first footer's icons: later sections carry copies of it.
    const roleIcons = [...((about.querySelector?.('.about-footer') || about).querySelectorAll?.('.footer-role') || [])];
    if (roleIcons.length && heroLines.length % roleIcons.length === 0) {
      const perIcon = heroLines.length / roleIcons.length;
      // The corner-side words lead, so no line overtakes a slower neighbour
      // while the group shrinks towards the bottom right.
      heroLines.forEach((line, index) => {
        const start = .04 + (heroLines.length - 1 - index) * .03;
        const plan = planMorph(line, roleIcons[Math.floor(index / perIcon)], start, start + .78);
        if (!plan) return;
        // The first line of each role starts last, so it drives the drawing.
        plan.drives = index % perIcon === 0;
        headingFolds.push(plan);
      });
    }
    const homeFooter = hero.querySelector('.hero-footer');
    const awayFooter = about.querySelector('.about-footer');
    heroSocials = homeFooter?.querySelector?.('.social-links') || null;
    heroSignature = homeFooter?.querySelector?.('.signature') || null;
    aboutSignature = awayFooter?.querySelector?.('.signature') || null;
    footerRule = awayFooter?.querySelector?.('.footer-roles-rule') || null;
    if (heroSignature && aboutSignature) {
      signatureFold = planFold(heroSignature, heroSignature, aboutSignature, aboutSignature, 0, .92);
    }
    const landing = new Set(headingFolds.map(plan => plan.mover));
    headingRest = heroLines.filter(line => !landing.has(line));
    // The highlight needs the label white and alone first: the travelling copy
    // sits above About and would read as white-on-white over the sweep. So this
    // row hands over as soon as its glyphs land, and the sweep follows on.
    // Without a travelling label (phone), the sweep follows the rail's fade-in.
    const pillPlan = navFolds.find(plan => pillLink?.contains?.(plan.reveal));
    if (pillPlan) {
      pillPlan.handoverStart = pillPlan.end;
      pillPlan.handoverEnd = pillPlan.end + .06;
      pillWindow = [pillPlan.end + .05, .999];
    } else pillWindow = [.62, .92];
    const travelling = new Set(navFolds.map(plan => plan.mover));
    headerRest = [...(hero.querySelectorAll?.('.menu-toggle, .nav-link') || [])]
      .filter(control => !travelling.has(control));
    root.classList.remove('fold-measuring');
  }

  // Every inline style the transition writes, handed back to CSS.
  function releaseTransition() {
    clearFolds();
    [portrait, heroContent, headingRule, heroFooter, heroSocials, heroSignature, wordmark, about, topbar,
      aboutFooter, aboutSignature, footerRule, aboutContent,
      ...dividers, ...headerRest, ...headingRest]
      .forEach((element) => {
        if (!element) return;
        element.style.transform = '';
        element.style.opacity = '';
      });
    hero.style.pointerEvents = '';
    hero.style.visibility = '';
    pillLink?.style.removeProperty?.('--pill');
    pillShown = null;
  }

  function paint(scrollPosition = window.scrollY) {
    presentedPosition = scrollPosition;
    const progress = clamp(scrollPosition / boundary);
    // Reduced motion leaves the hero in flow, so the two sections simply scroll
    // past each other. Nothing is pinned, and nothing has to move out of the way.
    const still = reducedMotion.matches;
    const folding = !still && progress > 0 && progress < .999;
    // Clearing transforms to remasure mid-fold flashes the words back to rest.
    if (foldStale && !running && !folding) {
      foldStale = false;
      measureFolds();
    }
    // A running spring freezes chrome so the first pixel and the 45/50%
    // handoff do not invalidate styles while the words are travelling.
    if (!running && folding !== foldingState) {
      foldingState = folding;
      root.classList.toggle('section-folding', folding);
    }
    if (still) releaseTransition();
    else {
      const leaving = smooth(slice(progress, 0, .42));
      // Everything without a counterpart in the About layout clears out ahead of
      // the words, so the fold has the screen to itself as it lands.
      portrait.style.transform = `translate3d(0, ${-10 * leaving}%, 0)`;
      fade(portrait, 1 - leaving);
      const contentLeaving = 1 - smooth(slice(progress, 0, .28));
      fade(headingRule, contentLeaving);
      headingRest.forEach(line => fade(line, contentLeaving));
      headingFolds.forEach(plan => applyMorph(plan, progress));
      const footerLeaving = 1 - smooth(slice(progress, 0, .24));
      fade(heroSocials, footerLeaving);
      if (signatureFold) applyFold(signatureFold, progress);
      else fade(heroSignature, footerLeaving);

      if (nameFold) applyFold(nameFold, progress);
      else {
        const nameProgress = smooth(slice(progress, 0, .65));
        wordmark.style.transform = `translate3d(0, ${-14 * nameProgress}%, 0)`;
        fade(wordmark, 1 - nameProgress);
      }
      navFolds.forEach(plan => applyFold(plan, progress));
      // Separators have nothing to become, so they are the first to go.
      dividers.forEach(divider => fade(divider, 1 - smooth(slice(progress, 0, .18))));
      // The rest of the header leaves with the hero. The entrance owns
      // .site-header's own opacity, so this stays on the controls themselves.
      const clearing = 1 - smooth(slice(progress, 0, .3));
      headerRest.forEach(control => fade(control, clearing));
      if (pillLink) {
        // Rounded so a settling spring does not restyle the row every frame.
        const pill = Math.round(smooth(slice(progress, ...pillWindow)) * 1000) / 1000;
        if (pill !== pillShown) {
          pillShown = pill;
          pillLink.style.setProperty('--pill', String(pill));
        }
      }

      // Native sticky layout holds About still. The bar drops in from above
      // to meet the words.
      const remaining = 1 - smooth(slice(progress, 0, .92));
      const arriving = smooth(slice(progress, .32, .78));
      if (topbar) {
        topbar.style.transform = `translate3d(0, ${-24 * remaining}px, 0)`;
        fade(topbar, arriving);
      }
      // The content rises 12px under the landing words, a beat behind the bar.
      if (aboutContent) {
        const settling = smooth(slice(progress, .55, .98));
        aboutContent.style.transform = settling >= 1 ? '' : `translate3d(0, ${12 * (1 - settling)}px, 0)`;
        fade(aboutContent, settling);
      }
      // The footer's words arrive by fold; only the rule between them, and
      // anything left without a traveller, fades in beneath them.
      fade(footerRule, arriving);
      if (!signatureFold) fade(aboutSignature, arriving);
      if (!headingFolds.length) {
        (aboutFooter || about).querySelectorAll?.('.footer-role')?.forEach?.(icon => fade(icon, arriving));
      }
      // Its children already fade to zero. Keep the transparent hero composed:
      // revealing a hidden, raster-heavy surface on reversal caused a hitch.
      hero.style.visibility = '';
    }
    // About's own entrance plays each time the fold lands on it, and starts
    // mid-flight so the title fills in as its content rises, not after the
    // spring settles. At the halfway mark the content is still transparent,
    // so resetting it on the way back out is never seen.
    const arrived = progress >= .5;
    if (arrived !== arrivedState) {
      arrivedState = arrived;
      about.classList.toggle('is-arrived', arrived);
    }
    if (running) return;
    // The hero paints above About and covers the viewport, so it would swallow
    // clicks meant for the surface behind it. It hands both the pointer and the
    // accessibility tree over once its own content has gone and only the
    // travelling words are left, which the top bar is about to own anyway.
    const handedOver = !still && progress > .45;
    const handover = still ? 'native' : handedOver ? 'about' : 'home';
    if (handover !== handoverState) {
      handoverState = handover;
      hero.style.pointerEvents = handedOver ? 'none' : '';
      hero.inert = handedOver;
      about.inert = !still && !handedOver;
      about.style.pointerEvents = about.inert ? 'none' : '';
    }
    const current = progress >= .5 ? '#about' : '#home';
    if (current !== currentSection) {
      currentSection = current;
      currentLinks.forEach(link => {
        if (link.hash === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }

  // Wheel events can arrive in discrete steps. Smooth only the presentation,
  // using one reversible spring; native document scrolling stays untouched.
  // Touch, keyboard and reduced motion keep their direct response.
  const presentation = createSpring2D(.3, ({ y }) => paint(y));
  presentation.setActive(true);

  function paintImmediately() {
    if (paintFrame !== null) cancelAnimationFrame(paintFrame);
    paintFrame = null;
    presentation.jumpTo(0, window.scrollY);
    paint();
  }

  function schedulePaint() {
    // Navigation already paints its exact spring position in this frame.
    // Repainting from scroll events quantizes it to the browser's scroll pixels.
    if (running || paintFrame !== null) return;
    paintFrame = requestAnimationFrame(() => {
      paintFrame = null;
      const direct = running || reducedMotion.matches || !finePointer.matches ||
        root.classList.contains('touch-input') || root.classList.contains('section-scroll-keyboard') ||
        window.scrollY > boundary + 2;
      if (direct) paintImmediately();
      else presentation.setTarget(0, Math.min(boundary, Math.max(0, window.scrollY)));
    });
  }

  function complete() {
    // Native scroll/resize events can follow the final navigation frame. Resume
    // their presentation spring from this landing, never its old departure.
    presentation.jumpTo(0, presentedPosition);
    running = false;
    window.scrollTo({ top: destination, behavior: 'instant' });
    // Landing is still: remasure if fonts/resize landed mid-trip, then chrome.
    paint(presentedPosition);
    if (focusDestination) {
      focusDestination = false;
      // Scrolling never steals focus. Explicit links do, after arriving.
      (destination ? about : document.querySelector('#intro')).focus({ preventScroll: true });
    }
  }

  // At less than one scroll pixel from rest, the eased glyphs already occupy
  // their landing. Finish the invisible tail so native input and focus resume.
  // The document scroll is written at complete/stop, not on every frame — both
  // surfaces stay sticky, and per-frame scrollTo was invalidating them.
  const spring = createSpring2D(1.1, ({ y }, settled) => {
    if (!running) return;
    paint(y);
    if (settled) complete();
  }, { restDistance: 1, restSpeed: 8 });
  spring.setActive(true);

  function stop() {
    spring.stop();
    if (running) {
      window.scrollTo({ top: presentedPosition, behavior: 'instant' });
      presentation.jumpTo(0, presentedPosition);
      running = false;
      paint(presentedPosition);
    } else {
      running = false;
    }
    focusDestination = false;
  }

  // Links and deliberate vertical gestures share the same complete journey.
  function navigate(to, instant = false, focus = false) {
    destination = to;
    focusDestination = focus;
    if (instant || reducedMotion.matches) {
      spring.stop();
      window.scrollTo({ top: to, behavior: 'instant' });
      paintImmediately();
      complete();
      return;
    }
    if (!running) {
      if (paintFrame !== null) cancelAnimationFrame(paintFrame);
      paintFrame = null;
      presentation.stop();
      spring.jumpTo(0, presentedPosition);
      root.classList.add('section-folding');
      foldingState = true;
    }
    running = true;
    spring.setTarget(0, to); // Reversals preserve the current position AND velocity.
  }

  // Only own gestures across the fold. Content below it, nested scrollers,
  // horizontal gestures, zoom and reduced motion remain native.
  function canOwnGesture(event, direction) {
    if (reducedMotion.matches || mobileMenu?.open || event.defaultPrevented ||
      event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
      event.cancelable === false) return false;
    for (let node = event.target; node && node !== document.body && node !== root; node = node.parentElement) {
      if (!(node instanceof Element)) continue;
      if (/auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1 &&
        (direction < 0 ? node.scrollTop > 0 : node.scrollTop + node.clientHeight < node.scrollHeight - 1)) return false;
    }
    return true;
  }

  function canTurn(event, direction) {
    const y = window.scrollY;
    return canOwnGesture(event, direction) && y <= boundary + 2 &&
      (running || (direction > 0 ? y < boundary - 2 : y > 2));
  }

  let wheelTime = -Infinity;
  let wheelDirection = 0;
  let wheelDistance = 0;
  let wheelOwned = false;
  let wheelTargetDirection = 0;
  window.addEventListener('wheel', event => {
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const direction = Math.sign(event.deltaY);
    const now = performance.now();
    if (now - wheelTime > 180) {
      wheelOwned = false;
      wheelDirection = 0;
      wheelDistance = 0;
    }
    wheelTime = now;
    // Keep consuming the tail of an accepted flick after landing. Otherwise
    // trackpad momentum would scroll straight past the newly arrived section.
    const tail = wheelOwned && window.scrollY <= boundary + 2 && canOwnGesture(event, direction);
    if (!tail && !canTurn(event, direction)) return;
    event.preventDefault();
    root.classList.remove('section-scroll-keyboard');
    if (direction !== wheelDirection) {
      wheelDirection = direction;
      wheelDistance = 0;
    }
    wheelDistance += Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
    if ((!wheelOwned || direction !== wheelTargetDirection) && wheelDistance >= 12) {
      wheelOwned = true;
      wheelTargetDirection = direction;
      navigate(direction > 0 ? boundary : 0);
    }
  }, { passive: false });

  let touch = null;
  window.addEventListener('touchstart', event => {
    touch = null;
    if (event.touches.length !== 1) { stop(); return; }
    const point = event.touches[0];
    touch = { id: point.identifier, x: point.clientX, y: point.clientY, direction: 0, targetDirection: 0, distance: 0, owned: false };
  }, { passive: true });
  window.addEventListener('touchmove', event => {
    if (!touch || event.touches.length !== 1) { touch = null; return; }
    const point = event.touches[0];
    if (point.identifier !== touch.id) return;
    const dx = point.clientX - touch.x;
    const dy = touch.y - point.clientY;
    touch.x = point.clientX;
    touch.y = point.clientY;
    if (!dy) return;
    if (Math.abs(dx) > Math.abs(dy)) { touch = null; return; }
    const direction = Math.sign(dy);
    if (!canTurn(event, direction) && !(touch.owned && window.scrollY <= boundary + 2 && canOwnGesture(event, direction))) return;
    // Cancel the first vertical move so Safari never starts native momentum
    // alongside the section spring. A tap or pinch is never captured.
    event.preventDefault();
    root.classList.remove('section-scroll-keyboard');
    if (direction !== touch.direction) {
      touch.direction = direction;
      touch.distance = 0;
    }
    touch.distance += Math.abs(dy);
    if ((!touch.owned || direction !== touch.targetDirection) && touch.distance >= 12) {
      touch.owned = true;
      touch.targetDirection = direction;
      navigate(direction > 0 ? boundary : 0);
    }
  }, { passive: false });
  window.addEventListener('touchend', () => { touch = null; }, { passive: true });
  window.addEventListener('touchcancel', () => { touch = null; }, { passive: true });

  function measure() {
    const previousBoundary = boundary;
    const nextBoundary = Math.max(1, foldDistance());
    // The browser clamps scrollY to the reflowed document before this event
    // runs, so the last painted position is the only record of where the
    // reader was. Reading scrollY here stranded a resized About mid-fold.
    const wasAtAbout = Math.abs(presentedPosition - previousBoundary) < 2;
    const wasRunning = running;
    const wasForward = destination > 0;
    boundary = nextBoundary;
    root.style.setProperty('--fold-distance', `${boundary}px`);
    // Both ends of the fold move with the layout. Remeasuring inside the next
    // paint keeps the clearing, reading, and reapplying in a single frame.
    foldStale = true;
    if (wasRunning) navigate(wasForward ? boundary : 0);
    else if (wasAtAbout) window.scrollTo({ top: boundary, behavior: 'instant' });
    schedulePaint();
  }

  function sectionHash() {
    return location.hash || (entryPage === 'about' ? '#about' : '#home');
  }

  function restoreSection() {
    stop();
    navigate(sectionHash() === '#about' ? boundary : 0, true);
    document.title = sectionHash() === '#about' ? 'About me · JOSH' : 'JOSH';
  }
  let traversedHash = null;

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-section-link]');
    if (!link || !['#home', '#about'].includes(link.hash) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    const expected = new URL(link.hash === '#about' ? 'about_me.html' : 'index.html', location.href);
    if (url.origin !== expected.origin || url.pathname !== expected.pathname || link.hasAttribute('download') ||
      (link.target && link.target !== '_self')) return;
    event.preventDefault();
    const to = link.hash === '#about' ? boundary : 0;
    // Keyboard links move focus immediately, without a full-screen animation.
    const keyboard = root.classList.contains('section-scroll-keyboard');
    // The navigation dialog closes through its existing link handler. Defer
    // focus until it has restored the page, without blocking the scroll input.
    navigate(to, keyboard, !mobileMenu?.open);
    if (location.hash !== link.hash) history.pushState(null, '', link.getAttribute('href'));
    document.title = link.hash === '#about' ? 'About me · JOSH' : 'JOSH';
  });

  // Paging, arrows, and space are the browser's own, and now scrub the fold
  // like any other scroll. Only a spring already in flight has to yield.
  document.addEventListener('keydown', event => {
    if (mobileMenu?.open || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey ||
      event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    stop();
    root.classList.add('section-scroll-keyboard');
  });
  document.addEventListener('pointerdown', event => {
    // A new destination keeps the spring's velocity through the following click.
    // Other pointer contact immediately returns the page to native scrolling.
    if (event.pointerType !== 'touch' && !event.target.closest('[data-section-link]')) stop();
    root.classList.remove('section-scroll-keyboard');
  }, { capture: true, passive: true });
  window.addEventListener('scroll', schedulePaint, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('pagehide', () => { stop(); presentation.stop(); });
  window.addEventListener('pageshow', measure);
  window.addEventListener('popstate', () => {
    // Back/Forward restores the reader's exact position, including mid-fold or
    // deeper in About. Do not replace the browser's restoration with an endpoint.
    traversedHash = location.hash;
    stop();
    document.title = sectionHash() === '#about' ? 'About me · JOSH' : 'JOSH';
    paintImmediately();
  });
  window.addEventListener('hashchange', () => {
    const restored = traversedHash === location.hash;
    traversedHash = null;
    if (!restored) restoreSection();
  });
  reducedMotion.addEventListener('change', () => {
    measure();
    if (running) navigate(destination, true);
    foldStale = true;
    schedulePaint();
  });
  // Both ends of the fold are text, so their boxes are only final once the
  // webfonts have replaced the fallbacks.
  document.fonts?.ready.then(() => { foldStale = true; schedulePaint(); });
  root.classList.add('section-scroll-ready');
  boundary = Math.max(1, foldDistance());
  root.style.setProperty('--fold-distance', `${boundary}px`);
  // A direct About visit gets the same complete scroll surface, already landed.
  if (sectionHash() === '#about' && window.scrollY < boundary) {
    window.scrollTo({ top: boundary, behavior: 'instant' });
  }
  document.title = sectionHash() === '#about' ? 'About me · JOSH' : 'JOSH';
  paintImmediately();
}
if (window.sitePagesReady) {
  window.sitePagesReady.then(bindAboutNavScrambles);
  window.sitePagesReady.then(enableSectionScroll);
  window.sitePagesReady.then(initAboutContent);
  window.sitePagesReady.then(initAboutPages);
  window.sitePagesReady.then(() => { bindProjectCtaScrambles(); initProjectsTrack(); initProjectsNav(); });
} else {
  enableSectionScroll();
  initAboutContent();
  initAboutPages();
}

// Where each Experience job rests while the section is pinned; empty when
// it scrolls as one screen.
let coreJobStops = [];

// The About title fills in when the page lands: the fold marks the landing
// with .is-arrived, and a page without the fold arrives as soon as it paints.
// The Core is a vertical tab list; its panels share one cell, so switching
// subjects never changes the page height.
function initAboutContent() {
  const about = document.querySelector('#about');
  const content = about?.querySelector('.about-content');
  if (!content) return;
  const root = document.documentElement;
  const arrive = () => requestAnimationFrame(() => requestAnimationFrame(() => about.classList.add('is-arrived')));
  if (!reducedMotion.matches) {
    // A direct visit has already landed by now; hold the fill back for two
    // frames so it still sweeps in rather than appearing finished.
    const landed = about.classList.contains('is-arrived');
    about.classList.remove('is-arrived');
    about.classList.add('about-motion');
    if (landed) arrive();
  }
  if (!root.classList.contains('section-scroll-ready')) arrive();
  // Meet Josh arrives again each time the page turns back up to it, the way
  // Experience does on the way down. Once it has left over the top of the
  // screen it resets out of sight; coming back into view plays it in again.
  const meet = content.querySelector('.about-hero');
  if (meet && !reducedMotion.matches && 'IntersectionObserver' in window) {
    let settled = 0;
    new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      const away = meet.classList.contains('is-away');
      if (!away && !entry.isIntersecting && entry.boundingClientRect.top < 0) {
        clearTimeout(settled);
        meet.classList.add('is-away', 'is-returning');
      } else if (away && entry.intersectionRatio >= .35) {
        meet.classList.remove('is-away');
        // The sweep holds its reversed angle until the fill has finished.
        settled = setTimeout(() => meet.classList.remove('is-returning'), 2000);
      }
    }, { threshold: [0, .35] }).observe(meet);
  }

  // Education arrives each time the page turns to it and resets once it has
  // left the screen entirely.
  const education = content.querySelector('.edu-section');
  if (education && !reducedMotion.matches && 'IntersectionObserver' in window) {
    education.classList.add('edu-motion');
    new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry.isIntersecting) education.classList.remove('is-entered');
      else if (entry.intersectionRatio >= .35) education.classList.add('is-entered');
    }, { threshold: [0, .35] }).observe(education);
  }

  const core = content.querySelector('[data-core]');
  const list = core?.querySelector('[role="tablist"]');
  if (!list) return;
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  // A tab can own more than one card (a promotion keeps the same subject), so
  // cards are selected by their own index and light up the tab that owns them.
  const panels = [...core.querySelectorAll('[role="tabpanel"]')];
  const owner = panels.map(panel => tabs.findIndex(tab => tab.getAttribute('aria-controls').split(' ').includes(panel.id)));
  const reading = core.querySelector('.core-reading');
  let shown = -1;

  // One marker on a rail beside the list slides to the job being read and
  // stretches to its height. It snaps into place the first time.
  const rail = document.createElement('span');
  rail.className = 'core-rail';
  rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML = '<span class="core-rail-fill"></span><span class="core-rail-marker"></span>';
  const marker = rail.lastChild;
  list.prepend(rail);
  function placeMarker() {
    const tab = tabs[owner[shown]];
    if (!tab) return;
    marker.style.setProperty('--marker-y', `${tab.offsetTop + 12}px`);
    marker.style.setProperty('--marker-h', Math.max(0, tab.offsetHeight - 24));
  }

  // Titles sweep in on the site's 100° edge. The details along the bottom
  // keep their icons planted while the words decode in place; the decode
  // plays on an aria-hidden copy laid over the real words, so assistive
  // tech only ever reads the words themselves.
  core.querySelectorAll('.core-title').forEach((title) => {
    const text = document.createElement('span');
    text.className = 'core-title-text';
    text.append(...title.childNodes);
    title.append(text);
  });
  // Each word of a workplace carries a zero-size mark on its baseline, so
  // the drawn copy can set every word exactly where the real one sits.
  core.querySelectorAll('.core-org').forEach((org) => {
    const words = org.textContent.trim().split(/\s+/);
    org.textContent = '';
    words.forEach((text, i) => {
      if (i) org.append(' ');
      const word = document.createElement('span');
      word.className = 'core-org-word';
      const mark = document.createElement('span');
      mark.className = 'core-org-mark';
      word.append(mark, text);
      org.append(word);
    });
  });
  core.querySelectorAll('.core-meta li > span').forEach((words) => {
    const text = document.createElement('span');
    text.className = 'core-decode-text';
    text.append(...words.childNodes);
    const code = document.createElement('span');
    code.className = 'core-decode-code';
    code.setAttribute('aria-hidden', 'true');
    words.classList.add('core-decode');
    words.append(text, code);
  });
  const easeOut = 'cubic-bezier(.23, 1, .32, 1)';
  const easeOutQuart = 'cubic-bezier(.25, 1, .5, 1)';
  let running = [];
  let turning = 0;
  const play = (element, keyframes, options) => {
    if (element) running.push(element.animate(keyframes, { easing: easeOut, fill: 'backwards', ...options }));
  };
  const partsOf = panel => ({
    title: panel.querySelector('.core-title-text'),
    logo: panel.querySelector('.core-logo-fill'),
    outline: panel.querySelector('.core-logo-outline'),
    org: panel.querySelector('.core-org'),
    desc: [...panel.querySelectorAll('.core-desc')],
    meta: [...panel.querySelectorAll('.core-meta li')],
  });
  // Scrolling back runs the sweep from the right.
  const sweep = (element, dir, options) => {
    if (!element) return;
    element.style.setProperty('--sweep', dir < 0 ? '280deg' : '100deg');
    play(element, [{ '--core-reveal': 0 }, { '--core-reveal': 1 }], { duration: 480, easing: easeOutQuart, ...options });
  };
  // The same edge carries on past the old title and wipes it away.
  const erase = (element, dir) => {
    if (!element) return;
    element.style.setProperty('--sweep', dir < 0 ? '280deg' : '100deg');
    element.classList.add('is-erasing');
    play(element, [{ '--core-reveal': 0 }, { '--core-reveal': 1 }], { duration: 280, easing: easeOut, fill: 'forwards' });
    running.push({ cancel: () => element.classList.remove('is-erasing') });
  };
  // Letters and digits cycle through random glyphs and settle left to right;
  // spaces and punctuation hold, so the line keeps its shape. Monospace keeps
  // every glyph the same width, so nothing shifts while it runs.
  // The workplace draws the way the footer icons do: each word traces its
  // letter outlines 60ms after the last, fills, and hands back to the text.
  const ink = (org, delay) => {
    if (!org) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'core-org-ink');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', org.clientWidth);
    svg.setAttribute('height', org.clientHeight);
    const box = org.getBoundingClientRect();
    const strokes = [...org.querySelectorAll('.core-org-word')].map((word, i) => {
      const mark = word.firstChild.getBoundingClientRect();
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', mark.left - box.left);
      text.setAttribute('y', mark.top - box.top);
      text.textContent = word.textContent.toUpperCase();
      svg.append(text);
      return text.animate([
        { strokeDasharray: '80 80', strokeDashoffset: 80, strokeOpacity: 1, fillOpacity: 0 },
        { strokeDasharray: '80 80', strokeDashoffset: 0, strokeOpacity: 1, fillOpacity: 0, offset: .7 },
        { strokeDasharray: '80 80', strokeDashoffset: 0, strokeOpacity: 0, fillOpacity: 1 },
      ], { duration: 640, delay: delay + i * 60, easing: easeOut, fill: 'backwards' });
    });
    const done = () => {
      svg.remove();
      org.classList.remove('is-inking');
    };
    org.append(svg);
    org.classList.add('is-inking');
    running.push(...strokes, { cancel: done });
    Promise.all(strokes.map(stroke => stroke.finished)).then(done, () => {});
  };
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const decode = (words, delay) => {
    const code = words?.querySelector('.core-decode-code');
    if (!code) return;
    const letters = [...words.querySelector('.core-decode-text').textContent];
    const step = Math.min(24, 320 / letters.length);
    const start = performance.now() + delay;
    let frame = 0, drawn = -Infinity;
    const stop = () => {
      cancelAnimationFrame(frame);
      words.classList.remove('is-decoding');
      code.textContent = '';
    };
    const tick = (now) => {
      const settled = Math.max(0, Math.floor((now - start) / step));
      if (settled >= letters.length) return stop();
      // Fresh glyphs every 45ms read as churn rather than flicker.
      if (now - drawn >= 45) {
        drawn = now;
        code.textContent = letters.map((letter, i) => i < settled || !/[a-z0-9]/i.test(letter) ? letter : glyphs[Math.floor(Math.random() * glyphs.length)]).join('');
      }
      frame = requestAnimationFrame(tick);
    };
    words.classList.add('is-decoding');
    tick(performance.now());
    running.push({ cancel: stop });
  };
  // The leaving card stays on screen while its contents hand over.
  const hold = panel => play(panel, [{ visibility: 'visible', opacity: 1 }, { visibility: 'visible', opacity: 1 }], { duration: 480, fill: 'none' });
  const fade = (element, delay) => play(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay });

  // A card's contents change in place: the title and the workplace's mark
  // sweep in, the workplace draws its letters, the description fades up in its spot, and each
  // detail's words decode 40ms after the last.
  function reveal(panel, dir, delay) {
    const { title, logo, outline, org, desc, meta } = partsOf(panel);
    sweep(title, dir, { delay });
    fade(outline, delay);
    sweep(logo, dir, { delay: delay + 40, duration: 640 });
    ink(org, delay + 80);
    desc.forEach((element, i) => fade(element, delay + 80 + i * 40));
    meta.forEach((item, i) => decode(item.querySelector('.core-decode'), delay + 120 + i * 40));
  }

  // Cards change in place; the scroll direction only sets which way the
  // title sweeps. The marker in the list already shows where the page went.
  // The card itself never fades: the old job's contents wipe and fade out
  // while the new one's step in over them, so it is never left blank.
  function turn(from, to) {
    running.forEach(animation => animation.cancel());
    running = [];
    clearTimeout(turning);
    reading.classList.remove('is-turning');
    if (reducedMotion.matches) return;
    const dir = to > from ? 1 : -1;
    reading.classList.add('is-turning');
    turning = setTimeout(() => reading.classList.remove('is-turning'), 480);
    if (owner[from] === owner[to]) {
      promote(panels[from], panels[to], dir);
      return;
    }
    hold(panels[from]);
    const was = partsOf(panels[from]);
    erase(was.title, dir);
    erase(was.logo, dir);
    [was.org, was.outline, ...was.desc, ...was.meta].forEach(element => play(element, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }));
    reveal(panels[to], dir, 100);
  }

  // A promotion keeps the same job, so the card holds still: whatever reads
  // the same stays put, the title wipes over, and details that changed
  // decode in place.
  function promote(leaving, entering, dir) {
    hold(leaving);
    const was = partsOf(leaving), now = partsOf(entering);
    erase(was.title, dir);
    sweep(now.title, dir, { delay: 200 });
    // Both cards carry the same mark; hide the leaving one so the two faint
    // fills don't stack while the old card is held.
    play(leaving.querySelector('.core-logo'), [{ opacity: 0 }, { opacity: 0 }], { duration: 480, fill: 'none' });
    was.desc.forEach(desc => play(desc, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }));
    now.desc.forEach((desc, i) => fade(desc, 160 + i * 40));
    const pairs = [[was.org, now.org], ...now.meta.map((item, i) => [was.meta[i], item])];
    was.meta.slice(now.meta.length).forEach(item => play(item, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }));
    pairs.forEach(([before, after]) => {
      if (before) play(before, [{ opacity: 0 }, { opacity: 0 }], { duration: 480, fill: 'none' });
      if (!after || before?.textContent === after.textContent) return;
      decode(after.querySelector('.core-decode'), 120);
    });
  }

  function select(index) {
    const previous = shown;
    shown = index;
    tabs.forEach((tab, i) => {
      const selected = i === owner[index];
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      panel.setAttribute('aria-hidden', String(i !== index));
      panel.inert = i !== index;
    });
    placeMarker();
    core.style.setProperty('--core-progress', panels.length > 1 ? index / (panels.length - 1) : 0);
    if (previous >= 0 && previous !== index) turn(previous, index);
  }

  // While pinned, the scroll position is the selection: choosing a job
  // scrolls to it, and scrolling picks whichever card is nearest. Choosing
  // the open job again turns to its next card.
  let current = -1;
  function choose(index, focus) {
    if (focus) tabs[index].focus({ preventScroll: true });
    const card = owner[shown] === index && owner[shown + 1] === index ? shown + 1 : owner.indexOf(index);
    if (!coreJobStops.length) {
      select(card);
      return;
    }
    window.scrollTo({ top: coreJobStops[card], behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
  function follow() {
    if (!coreJobStops.length) return;
    let nearest = 0;
    coreJobStops.forEach((top, i) => {
      if (Math.abs(top - window.scrollY) < Math.abs(coreJobStops[nearest] - window.scrollY)) nearest = i;
    });
    if (nearest === current) return;
    current = nearest;
    select(nearest);
  }
  core.addEventListener('core-stops', follow);
  window.addEventListener('scroll', follow, { passive: true });

  tabs.forEach((tab, index) => tab.addEventListener('click', () => choose(index, false)));
  list.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const last = tabs.length - 1;
    const next = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    choose(next > last ? 0 : next < 0 ? last : next, true);
  });

  list.hidden = false;
  core.classList.add('core-ready');
  select(Math.max(0, owner.indexOf(tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true'))));
  new ResizeObserver(placeMarker).observe(list);
  requestAnimationFrame(() => requestAnimationFrame(() => rail.classList.add('is-placed')));

  // Experience arrives every time the page turns to it. Its card wipes up,
  // then the open job's contents step in behind it. As soon as the page
  // starts to turn away, up or down, the entrance plays back out; turning
  // back mid-exit returns it. Once it has left the screen entirely it resets
  // out of sight, ready to arrive again.
  const section = core.closest('.core-section');
  if (section && !reducedMotion.matches && 'IntersectionObserver' in window) {
    tabs.forEach((tab, i) => tab.style.setProperty('--i', i));
    section.style.setProperty('--n', tabs.length);
    section.classList.add('core-motion');
    // How much of the stage is on screen, against as much as ever can be:
    // a stage taller than the window never shows all of itself.
    const shownOf = (entry) => {
      const whole = Math.min(entry.boundingClientRect.height, entry.rootBounds?.height || window.innerHeight);
      return whole ? entry.intersectionRect.height / whole : 0;
    };
    let lastShown = 0;
    const arrival = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      const now = shownOf(entry);
      const rising = now > lastShown;
      lastShown = now;
      const entered = section.classList.contains('is-entered');
      const leaving = section.classList.contains('is-leaving');
      if (entered && !entry.isIntersecting) {
        running.forEach(animation => animation.cancel());
        running = [];
        section.classList.remove('is-entered', 'is-leaving');
      } else if (!entered && entry.intersectionRatio >= .35) {
        section.classList.add('is-entered');
        reveal(panels[shown], 1, 650);
      } else if (entered && !leaving && !rising && now < .9) {
        section.classList.add('is-leaving');
      } else if (leaving && rising) {
        section.classList.remove('is-leaving');
      }
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
    arrival.observe(section.querySelector('.core-stage') || section);

    // Scrolling on past the first job, or the last, holds the page long
    // enough for the exit to be seen, then turns it. Like the fold, the flick
    // that asked for the turn is spent on it: its momentum is swallowed
    // rather than carried on into the next page. Keys stay native.
    const pageStops = () => [...document.querySelectorAll('.page-snap')].map(marker => parseFloat(marker.style.top)).sort((a, b) => a - b);
    const leaveTarget = (direction) => {
      if (!coreJobStops.length || !section.classList.contains('is-entered') || section.classList.contains('is-leaving')) return;
      const y = window.scrollY;
      const edge = direction < 0 ? coreJobStops[0] : coreJobStops[coreJobStops.length - 1];
      if (Math.abs(y - edge) > 2) return;
      return direction < 0 ? pageStops().filter(top => top < y - 2).pop() : pageStops().find(top => top > y + 2);
    };
    let exitTimer = 0;
    const leave = (to, edge) => {
      section.classList.add('is-leaving');
      clearTimeout(exitTimer);
      exitTimer = setTimeout(() => {
        window.scrollTo({ top: to, behavior: 'smooth' });
        // A turn that never got away hands the section back.
        exitTimer = setTimeout(() => {
          if (Math.abs(window.scrollY - edge) <= 2) section.classList.remove('is-leaving');
        }, 1200);
      }, 320);
    };
    const gesture = { time: -Infinity, direction: 0, distance: 0, owned: false };
    // Returns true when this movement belongs to the exit and must not scroll.
    const claim = (direction, distance, now) => {
      if (now - gesture.time > 180 || direction !== gesture.direction) {
        gesture.owned = gesture.owned && now - gesture.time <= 180;
        gesture.distance = 0;
      }
      gesture.time = now;
      gesture.direction = direction;
      if (gesture.owned) return true;
      const to = leaveTarget(direction);
      if (to === undefined) return false;
      gesture.distance += distance;
      if (gesture.distance >= 12) {
        gesture.owned = true;
        leave(to, window.scrollY);
      }
      return true;
    };
    const ownable = event => event.cancelable && !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !mobileMenu?.open;
    // Capture runs ahead of the fold's own listener, which would otherwise
    // read the swallowed momentum as a turn to Home.
    window.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY) || !ownable(event)) return;
      const distance = Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      if (claim(Math.sign(event.deltaY), distance, performance.now())) event.preventDefault();
    }, { passive: false, capture: true });
    let touchY = null;
    window.addEventListener('touchstart', (event) => {
      touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    }, { passive: true, capture: true });
    window.addEventListener('touchmove', (event) => {
      if (touchY === null || event.touches.length !== 1 || !ownable(event)) return;
      const dy = touchY - event.touches[0].clientY;
      touchY = event.touches[0].clientY;
      if (dy && claim(Math.sign(dy), Math.abs(dy), performance.now())) event.preventDefault();
    }, { passive: false, capture: true });
  }

  // A title keeps to one line: one that runs past the panel scales its type
  // down until it fits, and grows back when the panel widens again.
  const titles = [...core.querySelectorAll('.core-title')];
  const fitTitles = () => titles.forEach((title) => {
    title.style.fontSize = '';
    if (title.scrollWidth <= title.clientWidth) return;
    const size = parseFloat(getComputedStyle(title).fontSize);
    title.style.fontSize = `${Math.floor(size * title.clientWidth / title.scrollWidth * 2) / 2}px`;
  });
  // Each detail keeps one slot, as wide as its longest value across every
  // job, so the icons sit in the same place on every card.
  const details = panels.map(panel => [...panel.querySelectorAll('.core-meta li > span')]);
  const fitDetails = () => {
    details.flat().forEach((words) => { words.style.minWidth = ''; });
    const widest = [];
    details.forEach(row => row.forEach((words, i) => { widest[i] = Math.max(widest[i] || 0, words.getBoundingClientRect().width); }));
    details.forEach(row => row.forEach((words, i) => { words.style.minWidth = `${Math.ceil(widest[i])}px`; }));
  };
  const fitCard = () => { fitTitles(); fitDetails(); };
  new ResizeObserver(fitCard).observe(core.querySelector('.core-reading'));
  document.fonts.ready.then(fitCard);
}

// About turns a page at a time: Home, Meet Josh, The Core, Education, then
// the page end.
// Home and About are sticky, and the browser reads a sticky element's snap
// point from wherever it is stuck, so markers at fixed document offsets stand
// in for them. The fold still owns the turn between Home and Meet Josh, and
// lands on the same two offsets.
function initAboutPages() {
  const about = document.querySelector('#about');
  const core = about?.querySelector('.core-section');
  if (!core) return;
  const education = about.querySelector('.edu-section');
  const root = document.documentElement;
  const coreIndex = core.querySelector('[data-core]');
  const jobs = core.querySelectorAll('[role="tabpanel"]').length;
  const markers = [];

  function place() {
    // Pin only when one screen holds the whole of Experience; a taller one
    // scrolls through as before.
    root.classList.remove('core-pinned');
    const pinned = jobs > 1 && coreIndex?.classList.contains('core-ready') && core.offsetHeight <= window.innerHeight + 1;
    root.classList.toggle('core-pinned', pinned);
    core.style.setProperty('--core-steps', jobs);

    // Past the fold About scrolls in flow, so it lands at the fold distance.
    const folded = root.classList.contains('section-scroll-ready') && !reducedMotion.matches;
    const aboutTop = folded
      ? parseFloat(root.style.getPropertyValue('--fold-distance')) || 0
      : about.getBoundingClientRect().top + window.scrollY;
    let coreTop = aboutTop;
    for (let node = core; node && node !== about; node = node.offsetParent) coreTop += node.offsetTop;
    const end = root.scrollHeight - window.innerHeight;
    // A pinned Core stops once per card; its runway splits evenly between them.
    const step = pinned ? (core.offsetHeight - window.innerHeight) / (jobs - 1) : 0;
    coreJobStops = pinned ? Array.from({ length: jobs }, (_, i) => Math.round(coreTop + i * step)) : [];
    const stops = [0, aboutTop, coreTop, ...coreJobStops];
    // A Core taller than the screen also stops with its bottom edge in view.
    if (core.offsetHeight > window.innerHeight + 1 && !pinned) stops.push(coreTop + core.offsetHeight - window.innerHeight);
    if (education) {
      let educationTop = aboutTop;
      for (let node = education; node && node !== about; node = node.offsetParent) educationTop += node.offsetTop;
      stops.push(educationTop);
    }
    stops.push(end);
    const offsets = [...new Set(stops.map(Math.round))].filter(y => y >= 0 && y <= end);
    while (markers.length < offsets.length) {
      const marker = document.createElement('span');
      marker.className = 'page-snap';
      marker.setAttribute('aria-hidden', 'true');
      document.body.append(marker);
      markers.push(marker);
    }
    markers.splice(offsets.length).forEach(marker => marker.remove());
    markers.forEach((marker, index) => { marker.style.top = `${offsets[index]}px`; });
    coreIndex?.dispatchEvent(new Event('core-stops'));
  }

  // The fold remeasures on the same events, and registered first.
  new ResizeObserver(place).observe(about);
  window.addEventListener('resize', place, { passive: true });
  reducedMotion.addEventListener('change', place);
  document.fonts?.ready.then(place);
  place();
  root.classList.add('about-paging');
}

// Projects continues on from Education in the same scroll. The top bar's
// underline travels from About me to Projects as it arrives, and back again.
function initProjectsNav() {
  const about = document.querySelector('#about');
  const nav = about?.querySelector('.about-topbar .section-nav');
  const aboutLink = nav?.querySelector('.section-nav-link[href$="#about"]');
  const projectsLink = nav?.querySelector('.section-nav-link[href="projects.html"]');
  const runway = about?.querySelector('[data-projects-runway]');
  if (!aboutLink || !projectsLink || !runway) return;
  const frame = runway.querySelector('.projects-frame') || runway;
  let shown = aboutLink;
  let glide = null;
  let animation = null;
  let frameId = 0;

  // Where a link's underline is drawn, in the row's own scrolling coordinates.
  function rule(link) {
    const style = getComputedStyle(link, '::before');
    const left = parseFloat(style.left) || 0;
    const right = parseFloat(style.right) || 0;
    return {
      x: link.offsetLeft + left,
      y: link.offsetTop + (parseFloat(style.top) || 0),
      width: link.offsetWidth - left - right
    };
  }
  const pose = ({ x, y, width }) => `translate3d(${x}px, ${y}px, 0) scaleX(${width})`;

  function show(link, instant = false) {
    if (link === shown) return;
    const from = shown;
    shown = link;
    from.removeAttribute('aria-current');
    link.setAttribute('aria-current', 'location');
    // About's underline can carry the fold's inline --pill, so it is hidden
    // outright while Projects is current.
    nav.classList.toggle('is-projects', link === projectsLink);
    if (instant || reducedMotion.matches) return;
    // A reversal mid-glide leaves from wherever the rule is now.
    let start = rule(from);
    if (glide) {
      const m = new DOMMatrix(getComputedStyle(glide).transform);
      start = { x: m.e, y: m.f, width: m.a };
      animation?.cancel();
    } else {
      glide = document.createElement('span');
      glide.className = 'section-nav-glide';
      glide.setAttribute('aria-hidden', 'true');
      nav.append(glide);
      nav.classList.add('is-gliding');
    }
    const current = animation = glide.animate([{ transform: pose(start) }, { transform: pose(rule(link)) }], {
      duration: 420,
      easing: 'cubic-bezier(.65, 0, .35, 1)',
      fill: 'forwards'
    });
    current.finished.then(() => {
      if (animation !== current) return;
      glide.remove();
      glide = null;
      animation = null;
      nav.classList.remove('is-gliding');
    }, () => {});
  }

  // Projects is current once its frame fills the lower half of the screen.
  function update(instant = false) {
    frameId = 0;
    const arrived = frame.getBoundingClientRect().top < window.innerHeight / 2;
    show(arrived ? projectsLink : aboutLink, instant);
  }

  // The link scrolls on to Projects rather than leaving the page.
  projectsLink.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const top = window.scrollY + runway.getBoundingClientRect().top - (parseFloat(getComputedStyle(frame).top) || 0);
    window.scrollTo({ top, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', () => {
    if (!frameId) frameId = requestAnimationFrame(() => update());
  }, { passive: true });
  window.addEventListener('resize', () => update(true), { passive: true });
  // The fold writes About's current state when it lands, so read after it.
  window.addEventListener('pageshow', () => requestAnimationFrame(() => update(true)));
  update(true);
}

// Transform and opacity reveals share one entrance clock.
async function playIntro() {
  const root = document.documentElement;
  if (!root.classList.contains('intro-pending')) return;

  const wordmark = hero.querySelector('.wordmark');
  const portraitStage = hero.querySelector('.portrait-stage');
  const animations = [];
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const skipEvents = ['orientationchange', 'pagehide', 'wheel', 'touchstart', 'scroll', 'keydown', 'focusin'];
  let finished = false;
  let readyTimeout;
  let socialTimer;
  let endSettlement;
  const scrambleTimers = [];
  const releaseWordmark = () => wordmark.classList.remove('intro-wordmark', 'is-entering');
  const revealSocials = (instant = false) => {
    if (!root.classList.contains('socials-pending')) return;
    root.classList.toggle('socials-instant', instant);
    root.classList.add('socials-revealing');
    root.classList.remove('socials-pending');
    setTimeout(() => root.classList.remove('socials-revealing'), 300);
  };
  const finish = (event) => {
    if (finished) {
      if (event && !['wheel', 'touchstart', 'scroll'].includes(event.type)) endSettlement?.();
      return;
    }
    finished = true;
    const settle = !reducedMotion.matches && ['wheel', 'touchstart', 'scroll'].includes(event?.type);
    const elements = [...hero.querySelectorAll('.portrait-stage, .hero-heading-line, .hero-heading-rule, .site-header, .signature')];
    const navSlides = [...hero.querySelectorAll('.nav-label > .scramble-text')];
    // Read the currently painted poses before cancelling the shared intro clock.
    const poses = settle ? elements.map(element => ({ element, opacity: getComputedStyle(element).opacity })) : [];
    const namePose = settle ? {
      transform: getComputedStyle(wordmark).transform,
      letters: [...wordmark.querySelectorAll('.intro-letter')].map(element => ({
        element, transform: getComputedStyle(element).transform
      }))
    } : null;
    const navPoses = settle ? navSlides.map(element => ({ element, transform: getComputedStyle(element).transform })) : [];
    // The portrait also carries scale and blur, so its settle needs more than opacity.
    const portraitPose = settle && portraitStage ? {
      transform: getComputedStyle(portraitStage).transform,
      filter: getComputedStyle(portraitStage).filter
    } : null;
    clearTimeout(window.introFallback);
    clearTimeout(readyTimeout);
    clearTimeout(socialTimer);
    scrambleTimers.forEach(clearTimeout);
    introScrambles.forEach((effect) => effect.reset());
    root.classList.remove('intro-pending');
    wordmark.classList.remove('is-entering');
    hero.querySelector('.site-header')?.classList.remove('is-entering');
    starsReady = true;
    revealSocials(event?.type === 'keydown' || event?.type === 'focusin' || event?.type === 'pagehide');
    animations.forEach((animation) => animation.cancel());
    skipEvents.forEach((event) => {
      window.removeEventListener(event, finish);
    });
    window.removeEventListener('resize', onResize);
    reducedMotion.removeEventListener('change', finish);
    syncAmbientMotion();
    if (!settle) {
      releaseWordmark();
      return;
    }
    // A scroll finishes the name's travel from its current pose. The same
    // outlined letters keep moving; nothing else is faded in over them.
    const settling = [];
    const easing = getComputedStyle(root).getPropertyValue('--ease-out').trim();
    const restTransform = getComputedStyle(wordmark).transform;
    const bridge = (element, keyframes) => {
      const animation = element.animate(keyframes, { duration: 250, easing, fill: 'both' });
      settling.push(animation);
    };
    poses.forEach(({ element, opacity }) => {
      bridge(element, [{ opacity }, { opacity: 1 }]);
    });
    if (portraitPose) {
      bridge(portraitStage, [
        { transform: portraitPose.transform, filter: portraitPose.filter },
        { transform: 'scale(1)', filter: 'blur(0px)' }
      ]);
    }
    if (namePose) {
      bridge(wordmark, [{ transform: namePose.transform }, { transform: restTransform }]);
      namePose.letters.forEach(({ element, transform }) => {
        bridge(element, [{ transform }, { transform: 'translateY(0)' }]);
      });
    }
    navPoses.forEach(({ element, transform }) => {
      bridge(element, [{ transform }, { transform: 'translateY(0)' }]);
    });
    endSettlement = () => {
      settling.forEach(animation => animation.cancel());
      releaseWordmark();
      window.removeEventListener('keydown', finish);
      window.removeEventListener('pagehide', finish);
      reducedMotion.removeEventListener('change', finish);
      endSettlement = null;
    };
    window.addEventListener('keydown', finish, { once: true });
    window.addEventListener('pagehide', finish, { once: true });
    reducedMotion.addEventListener('change', finish, { once: true });
    Promise.allSettled(settling.map(animation => animation.finished)).then(() => endSettlement?.());
  };
  const onResize = () => {
    // Mobile refresh and browser chrome can emit resize without changing the layout width.
    // Only a new composition should skip the entrance; height-only touch resizes keep playing.
    if (document.documentElement.clientWidth !== viewportWidth ||
        (finePointer.matches && window.innerHeight !== viewportHeight)) finish();
  };

  // Any deliberate interaction can skip the intro. History restores keep their position.
  skipEvents.forEach((event) => {
    window.addEventListener(event, finish, { passive: true });
  });
  window.addEventListener('resize', onResize, { passive: true });
  reducedMotion.addEventListener('change', finish);
  clearTimeout(window.introFallback);
  window.introFallback = setTimeout(finish, 8000);

  try {
    const portrait = new Image();
    portrait.src = 'assets/josh_portrait_cartoon_bw.png';
    const mask = new Image();
    mask.src = 'assets/josh_portrait_cartoon_mask.png';
    await Promise.race([
      Promise.allSettled([document.fonts.ready, portrait.decode(), mask.decode()]),
      new Promise((resolve) => { readyTimeout = setTimeout(resolve, 2000); })
    ]);
    clearTimeout(readyTimeout);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (finished) return;
    if (reducedMotion.matches || window.scrollY > 24 || location.hash) return finish();

    // Letter markup is present from first layout, so the entrance and the fold
    // always measure the same glyph boxes. Only their presentation changes.
    wordmark.classList.add('intro-wordmark', 'is-entering');
    const bounds = wordmark.getBoundingClientRect();
    const centerX = window.innerWidth / 2 - (bounds.left + bounds.width / 2);
    const centerY = window.innerHeight / 2 - (bounds.top + bounds.height / 2);

    // Sampled linear() eases fall back to main-thread animation on older Safari.
    // Reuse the CSS curves and animate complete transforms on every browser.
    const rootStyle = getComputedStyle(root);
    const easeOut = rootStyle.getPropertyValue('--ease-out').trim();
    const easeOutCubic = rootStyle.getPropertyValue('--ease-out-cubic').trim();
    const easeOutQuart = rootStyle.getPropertyValue('--ease-out-quart').trim();
    const easeInOutCubic = rootStyle.getPropertyValue('--ease-in-out-cubic').trim();
    const easeInOutQuart = rootStyle.getPropertyValue('--ease-in-out-quart').trim();
    const wordmarkTransform = getComputedStyle(wordmark).transform;
    // All animations share one clock, including the reference's 200 ms lead-in.
    const startTime = document.timeline.currentTime + 200;
    starsReady = true;
    syncAmbientMotion();
    const animate = (element, keyframes, delay, duration, easing = easeOut) => {
      const animation = element.animate(keyframes, { duration, delay, easing, fill: 'both' });
      animation.startTime = startTime;
      animations.push(animation);
      return animation;
    };
    const reveal = (element, delay, duration, easing = easeOut) => animate(element,
      [{ opacity: 0 }, { opacity: 1 }], delay, duration, easing);

    const scrambleIn = (label, delay, fadeDuration = 0) => {
      // Closed mobile-menu links have no visible glyphs to scramble. On touch,
      // keep the visible signature a compositor-only fade during the entrance.
      if (!finePointer.matches || !label.getClientRects().length) {
        reveal(label, delay, fadeDuration || 1);
        return;
      }
      const effect = introScrambles.get(label);
      const duration = Math.max(effect.duration + 60, fadeDuration);
      const fadeOffset = fadeDuration ? fadeDuration / duration : .001;
      animate(label, [{ opacity: 0 }, { opacity: 1, offset: fadeOffset }, { opacity: 1 }],
        delay, duration, 'linear');
      scrambleTimers.push(setTimeout(() => {
        if (!finished) effect.scramble();
      }, Math.max(0, startTime + delay - document.timeline.currentTime)));
    };
    animate(wordmark, [
      { transform: `translate3d(${window.innerWidth}px, ${centerY}px, 0) ${wordmarkTransform}`, offset: 0, easing: easeInOutQuart },
      { transform: `translate3d(${centerX}px, ${centerY}px, 0) ${wordmarkTransform}`, offset: .5, easing: easeInOutCubic },
      { transform: `translate3d(0, 0, 0) ${wordmarkTransform}`, offset: 1 }
    ], 0, 2000, 'linear');
    wordmark.querySelectorAll('.intro-letter').forEach((letter, index) => {
      animate(letter, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], index * 200, 1000, easeOutQuart);
    });
    animate(portraitStage, [
      { opacity: 0, transform: 'scale(.88)', filter: 'blur(20px)' },
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }
    ], 1400, 1100, easeOutCubic);
    hero.querySelectorAll('.hero-heading-line').forEach((line, index) => {
      reveal(line, 1700 + index * 100, 1000);
    });
    reveal(hero.querySelector('.hero-heading-rule'), 1700, 1000);
    scrambleTimers.push(setTimeout(() => {
      if (!finished) hero.querySelector('.site-header')?.classList.add('is-entering');
    }, Math.max(0, startTime + 2000 - document.timeline.currentTime)));
    hero.querySelectorAll('.nav-label > .scramble-text').forEach((label, index) => {
      if (!label.getClientRects().length) return;
      animate(label, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }],
        2000 + index * 40, 250, easeOut);
    });
    scrambleIn(hero.querySelector('.signature'), 3050, 700);
    // Independent CSS transitions also reveal smoothly when touch skips the intro.
    socialTimer = setTimeout(() => revealSocials(),
      Math.max(0, startTime + 3150 - document.timeline.currentTime));
    await Promise.all(animations.map((animation) => animation.finished));
    finish();
  } catch {
    // A failed asset or interrupted animation must never leave content hidden.
    finish();
  }
}

document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

// Kisaka's service headings: a short scramble radiates from the entry point.
// The original text keeps its exact typography and accessible name throughout.
const resetHoverEffects = [];
function createScramble(label) {
  const text = label.textContent;
  const copy = document.createElement('span');
  copy.className = 'scramble-text';
  copy.textContent = text;
  const layer = document.createElement('span');
  layer.className = 'scramble-layer';
  layer.setAttribute('aria-hidden', 'true');
  label.replaceChildren(copy, layer);
  let frame;
  let restingNodes;

  function reset() {
    cancelAnimationFrame(frame);
    frame = null;
    label.classList.remove('is-scrambling');
    layer.replaceChildren();
    if (restingNodes) {
      copy.replaceChildren(...restingNodes);
      restingNodes = null;
    }
  }
  resetHoverEffects.push(reset);

  function scramble(event) {
    if (reducedMotion.matches) return;
    reset();
    restingNodes = Array.from(copy.childNodes);
    copy.textContent = text;
    const bounds = label.getBoundingClientRect();
    const range = document.createRange();
    let offset = 0;
    let origin = 0;
    let nearest = Infinity;
    // Measure the unchanged text each time so font loading and resizing stay safe.
    const characters = Array.from(text, (real, index) => {
      range.setStart(copy.firstChild, offset);
      offset += real.length;
      range.setEnd(copy.firstChild, offset);
      const rect = range.getBoundingClientRect();
      const glyph = document.createElement('span');
      glyph.className = 'scramble-char';
      glyph.textContent = real;
      glyph.style.left = `${rect.left - bounds.left}px`;
      glyph.style.width = `${rect.width}px`;
      if (event && /[a-z]/i.test(real)) {
        const distance = Math.hypot(rect.left + rect.width / 2 - event.clientX,
          rect.top + rect.height / 2 - event.clientY);
        if (distance < nearest) { nearest = distance; origin = index; }
      }
      return { glyph, real, animated: /[a-z]/i.test(real), lastSwap: -Infinity };
    });
    layer.replaceChildren(...characters.map(({ glyph }) => glyph));
    label.classList.add('is-scrambling');
    const started = performance.now();
    function tick(now) {
      let complete = true;
      characters.forEach((character, index) => {
        if (!character.animated) return;
        const elapsed = now - started - 28 * Math.abs(index - origin);
        if (elapsed < 0) { complete = false; return; }
        if (elapsed < 260) {
          if (now - character.lastSwap > 45) {
            character.glyph.textContent = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
            character.lastSwap = now;
          }
          complete = false;
        } else {
          character.glyph.textContent = character.real;
        }
      });
      if (complete) reset();
      else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }
  return { scramble, reset, duration: text.length * 28 + 260 };
}

const introScrambles = new Map();
hero?.querySelectorAll('.hero-heading-line, .nav-label, .signature').forEach((label) => {
  label.classList.add('scramble-label');
  introScrambles.set(label, createScramble(label));
});
const boundNavScrambles = new WeakSet();
function bindNavHoverScramble(link) {
  if (boundNavScrambles.has(link)) return;
  const label = link.querySelector('.nav-label');
  if (!label) return;
  if (link.matches('a, button')) {
    link.setAttribute('aria-label', label.textContent.trim());
    label.setAttribute('aria-hidden', 'true');
  }
  let effect = introScrambles.get(label);
  if (!effect) {
    label.classList.add('scramble-label');
    effect = createScramble(label);
    introScrambles.set(label, effect);
  }
  const { scramble } = effect;
  link.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch' && finePointer.matches) scramble(event);
  });
  boundNavScrambles.add(link);
}
document.querySelectorAll('.nav-link').forEach(bindNavHoverScramble);
function bindAboutNavScrambles() {
  document.querySelectorAll('.section-nav-link').forEach(bindNavHoverScramble);
}
bindAboutNavScrambles();

const boundProjectCtaScrambles = new WeakSet();
function bindProjectCtaScrambles() {
  document.querySelectorAll('.project-cta-label').forEach((label) => {
    if (boundProjectCtaScrambles.has(label)) return;
    label.classList.add('scramble-label');
    const { scramble } = createScramble(label);
    // Start with the card's hover color and arrow, not when the pointer reaches the label.
    (label.closest('.project-link') || label).addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch' && finePointer.matches) scramble(event);
    });
    boundProjectCtaScrambles.add(label);
  });
}
bindProjectCtaScrambles();

function resetHoverMotion() {
  resetHoverEffects.forEach((reset) => reset());
}
window.addEventListener('resize', resetHoverMotion, { passive: true });
window.addEventListener('pagehide', resetHoverMotion);
reducedMotion.addEventListener('change', resetHoverMotion);
finePointer.addEventListener('change', resetHoverMotion);
document.fonts?.ready.then(resetHoverMotion);

// Projects: a pinned horizontal track. The runway is sized to the track's
// travel, so native scroll drives it; nothing is intercepted. Each frame paints
// one transform, the rail's scale and each card's --fill, all from cached
// geometry. A fine pointer gets a short glide behind the scroll; touch already
// has native momentum, and reduced motion follows the scroll exactly.
// Each card owns a snap point in the runway with scroll-snap-stop, so one flick
// of wheel, trackpad or finger lands exactly one card on; the browser owns the
// settle, so it stays interruptible and keeps touch momentum.
function initProjectsTrack() {
  const runway = document.querySelector('[data-projects-runway]');
  // About joins Projects in after load, so this can be called a second time.
  if (!runway || runway.dataset.tracked !== undefined) return;
  runway.dataset.tracked = '';
  const about = runway.closest('#about');
  const main = runway.closest('.projects-main');
  const frame = runway.querySelector('.projects-frame');
  const viewport = runway.querySelector('.projects-viewport');
  const track = runway.querySelector('.projects-track');
  const cards = [...track.querySelectorAll('[data-project]')];
  const railLinks = [...runway.querySelectorAll('[data-project-jump]')];
  const rail = runway.querySelector('.projects-rail');
  const topbar = document.querySelector('.about-topbar');
  const phone = window.matchMedia('(max-width: 700px)');
  // Scroll pixels per pixel of horizontal travel.
  const PACE = 1.15;
  // Glide time constant for a fine pointer, in seconds.
  const GLIDE = .09;

  main.classList.add('projects-pinned');
  document.documentElement.classList.add('projects-snapping');
  const snaps = cards.map(() => {
    const snap = document.createElement('span');
    snap.className = 'projects-snap';
    snap.setAttribute('aria-hidden', 'true');
    runway.append(snap);
    return snap;
  });
  let geometry = null;
  let shown = 0;
  let frameId = 0;
  let lastTime = 0;
  let current = -1;
  const fills = cards.map(() => -1);

  function measure() {
    // The frame pins where the sticky bar ends, plus the page's own gap on
    // wider screens where the bar floats.
    const barEnd = topbar ? (parseFloat(getComputedStyle(topbar).top) || 0) + topbar.offsetHeight : 0;
    main.style.setProperty('--projects-top', `${barEnd + (phone.matches ? 0 : 12)}px`);
    const viewWidth = viewport.clientWidth;
    const last = cards[cards.length - 1];
    // Travel ends with the last card centred, so every card has its turn.
    const travel = last ? Math.max(0, last.offsetLeft + last.offsetWidth / 2 - viewWidth / 2) : 0;
    const distance = travel * PACE;
    runway.style.height = `${frame.offsetHeight + distance}px`;
    const stickyTop = parseFloat(getComputedStyle(frame).top) || 0;
    geometry = {
      viewWidth,
      travel,
      distance,
      start: runwayOffset() - stickyTop,
      width: cards[0]?.offsetWidth || 1,
      centers: cards.map((card) => card.offsetLeft + card.offsetWidth / 2)
    };
    // Markers sit in the runway where the page must stop for each card.
    const runwayTop = geometry.start + stickyTop;
    snaps.forEach((snap, index) => {
      snap.style.top = `${scrollFor(index) - runwayTop}px`;
    });
  }

  // Inside About the section is pinned for the fold, so its box is not where
  // it scrolls to. Past the fold About scrolls in flow from the fold distance.
  function runwayOffset() {
    const root = document.documentElement;
    if (!about || !root.classList.contains('section-scroll-ready') || reducedMotion.matches) {
      return runway.getBoundingClientRect().top + window.scrollY;
    }
    let top = parseFloat(root.style.getPropertyValue('--fold-distance')) || 0;
    for (let node = runway; node && node !== about; node = node.offsetParent) top += node.offsetTop;
    return top;
  }

  function target() {
    if (!geometry.distance) return 0;
    const progress = Math.min(1, Math.max(0, (window.scrollY - geometry.start) / geometry.distance));
    return progress * geometry.travel;
  }

  function paint(x) {
    const { viewWidth, travel, width, centers } = geometry;
    track.style.transform = `translate3d(${-x}px, 0, 0)`;
    rail.style.setProperty('--progress', travel ? (x / travel).toFixed(4) : '1');
    let nearest = 0;
    centers.forEach((center, index) => {
      const offset = center - x - viewWidth / 2;
      if (Math.abs(offset) < Math.abs(centers[nearest] - x - viewWidth / 2)) nearest = index;
      // The name fills while its card travels in from the right and is full
      // at centre; reversing empties it the same way.
      const fill = Math.round(Math.min(1, Math.max(0, (width * .39 - offset) / (width * .39))) * 1000) / 1000;
      if (fill !== fills[index]) {
        fills[index] = fill;
        cards[index].style.setProperty('--fill', fill);
      }
    });
    if (nearest !== current) {
      cards[current]?.classList.remove('is-current');
      railLinks[current]?.removeAttribute('aria-current');
      cards[nearest].classList.add('is-current');
      railLinks[nearest]?.setAttribute('aria-current', 'step');
      current = nearest;
    }
  }

  function tick(time) {
    frameId = 0;
    const goal = target();
    const glide = finePointer.matches && !reducedMotion.matches && !document.documentElement.classList.contains('touch-input');
    const dt = lastTime ? Math.min(.064, (time - lastTime) / 1000) : 1 / 60;
    lastTime = time;
    shown = glide ? goal + (shown - goal) * Math.exp(-dt / GLIDE) : goal;
    if (Math.abs(goal - shown) < .1) shown = goal;
    paint(shown);
    if (shown !== goal) frameId = requestAnimationFrame(tick);
    else lastTime = 0;
  }

  function schedule() {
    if (!frameId) frameId = requestAnimationFrame(tick);
  }

  function refresh() {
    measure();
    shown = target();
    paint(shown);
  }

  // Scroll position that brings card `index` to the column's centre.
  function scrollFor(index) {
    const { viewWidth, travel, distance, start, centers } = geometry;
    const x = Math.min(travel, Math.max(0, centers[index] - viewWidth / 2));
    return start + (travel ? x / travel : 0) * distance;
  }

  railLinks.forEach((link, index) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.scrollTo({ top: scrollFor(index), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    });
  });
  // Keyboard focus lands on the card at once; the track follows without a glide.
  track.addEventListener('focusin', (event) => {
    const index = cards.indexOf(event.target.closest('[data-project]'));
    if (index < 0 || index === current) return;
    window.scrollTo({ top: scrollFor(index), behavior: 'auto' });
    refresh();
  });

  window.addEventListener('scroll', schedule, { passive: true });
  new ResizeObserver(refresh).observe(frame);
  window.addEventListener('resize', refresh, { passive: true });
  phone.addEventListener('change', refresh);
  document.fonts?.ready.then(refresh);
  refresh();

  if (reducedMotion.matches) {
    main.classList.add('projects-entered');
  } else if (about && 'IntersectionObserver' in window) {
    // Below About the entrance waits for the reader, and replays each time
    // they come back down to it, as About's own sections do.
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) main.classList.remove('projects-entered');
      else if (entry.intersectionRatio >= .35) main.classList.add('projects-entered');
    }, { threshold: [0, .35] }).observe(frame);
  } else {
    requestAnimationFrame(() => requestAnimationFrame(() => main.classList.add('projects-entered')));
  }
}
initProjectsTrack();

playIntro();

}
startSite();
