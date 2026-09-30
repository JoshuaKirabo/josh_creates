'use strict';

function startSite() {
// Placeholder links remain focusable and interactive without navigating.
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-placeholder-link]')) event.preventDefault();
});

// Content and navigation work without JavaScript. Motion is a small enhancement.
const hero = document.querySelector('.hero');
const backdrop = document.querySelector('.site-backdrop');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

// A turn cuts mid-flick, and a trackpad keeps sending that flick's momentum
// to wherever the page lands. Left alone it carried on past the cut: landing
// on Projects' last card from Skills, it stepped the track back a card, so
// getting back to Skills took three flicks. The tail is spent here, ahead of
// every other wheel listener, until it dies away or the reader turns the
// other way.
let turnMomentum = null;
window.addEventListener('wheel', (event) => {
  if (!turnMomentum) return;
  const now = performance.now();
  const direction = Math.sign(event.deltaY);
  if (now > turnMomentum.until || now - turnMomentum.last > 180 || (direction && direction !== turnMomentum.direction)) {
    turnMomentum = null;
    return;
  }
  turnMomentum.last = now;
  if (event.cancelable) event.preventDefault();
  event.stopImmediatePropagation();
}, { passive: false, capture: true });
function spendTurnMomentum(direction) {
  const now = performance.now();
  turnMomentum = { direction, last: now, until: now + 2500 };
}

// Touch feedback follows contact, while native scrolling and click timing stay intact.
function enableTouchFeedback() {
  const root = document.documentElement;
  const controls = '.button, .menu-toggle, .nav-link, .social-link, .text-link, .section-nav-link, .topbar-wordmark, .project-link, .projects-rail a, .core-subject, .core-link, .core-desc-link, .project-sheet-back';
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
  // The sky carries over from the page before: the same stars, each layer at
  // the point of its orbit it had reached, still moving, and leaning the same
  // way toward the pointer. Without it every page opened on a new sky that
  // stood still and then slowly got going.
  let carried = null;
  try { carried = JSON.parse(sessionStorage.getItem('grain-state')); } catch {}
  // Only a page turn carries the motion on; the same sky is kept regardless.
  const turned = !!carried && Date.now() - carried.at < 3000;
  const layers = [null, ...drifts].map((drift, index) => {
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
      seed: carried?.seeds?.[index] || (Math.random() * 0xffffffff) >>> 0 || 1
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
  // A sky that was moving when the last page left starts at full speed.
  let cruise = turned && !!carried.playing;
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
    const clock = turned ? carried.clocks?.[animations.length] : null;
    const since = carried?.playing ? Math.max(0, Date.now() - carried.at) : 0;
    animation.currentTime = Number.isFinite(clock) ? (clock + since) % drift.duration : 0;
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

  const shown = { x: 0, y: 0 };
  function paintField(position) {
    shown.x = position.x;
    shown.y = position.y;
    const shiftX = fieldTravel * Math.tanh(position.x / Math.max(width / 2, 1));
    const shiftY = fieldTravel * Math.tanh(position.y / Math.max(height / 2, 1));
    layers.forEach(({ shell, depth }) => {
      if (!shell) return;
      shell.style.transform = `translate3d(${shiftX * depth}px, ${shiftY * depth}px, 0)`;
    });
  }
  // Heavier than the spotlight so motes trail the pointer instead of locking to it.
  const field = createSpring2D(.5, paintField);
  if (turned && Number.isFinite(carried.x) && Number.isFinite(carried.y)) {
    field.jumpTo(carried.x, carried.y);
    paintField(carried);
  }
  // Registered ahead of the ambient pause on pagehide, so it records the sky
  // as it was still moving.
  window.addEventListener('pagehide', () => {
    try {
      sessionStorage.setItem('grain-state', JSON.stringify({
        seeds: layers.map(layer => layer.seed),
        clocks: animations.map(animation => animation.currentTime),
        playing,
        at: Date.now(),
        x: shown.x,
        y: shown.y
      }));
    } catch {}
  });

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
      const full = playing && cruise;
      cruise = false;
      animations.forEach((animation) => {
        if (playing) {
          animation.updatePlaybackRate(full ? 1 : 0);
          animation.play();
        } else animation.pause();
      });
      // Pausing holds each layer's current position. Resuming accelerates from it.
      if (playing && !full && animations.length) rampFrame = requestAnimationFrame(ramp);
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
    return location.hash || '#home';
  }
  // Everything but Home's own anchors lives past the fold.
  const pastFold = () => !['#home', '#intro'].includes(sectionHash());

  function restoreSection() {
    stop();
    document.title = sectionTitle();
    // Projects and Skills land themselves, further on than About's top.
    if (landOnSection(location.hash)) return;
    navigate(pastFold() ? boundary : 0, true);
  }
  let traversedHash = null;

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-section-link]');
    if (!link || !['#home', '#about'].includes(link.hash) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || link.hasAttribute('download') ||
      (link.target && link.target !== '_self')) return;
    event.preventDefault();
    const to = link.hash === '#about' ? boundary : 0;
    // Keyboard links move focus immediately, without a full-screen animation.
    const keyboard = root.classList.contains('section-scroll-keyboard');
    // The navigation dialog closes through its existing link handler. Defer
    // focus until it has restored the page, without blocking the scroll input.
    navigate(to, keyboard, !mobileMenu?.open);
    if (location.hash !== link.hash) history.pushState(null, '', link.getAttribute('href'));
    document.title = sectionTitle(link.hash);
  });
  // Following a link on the page fires popstate too, just like Back/Forward.
  // Remembering the link keeps it from passing for a restored position.
  let followedHash = null;
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    followedHash = link && !event.defaultPrevented ? link.hash : null;
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
    if (location.hash === followedHash) return;
    traversedHash = location.hash;
    stop();
    document.title = sectionTitle();
    paintImmediately();
  });
  window.addEventListener('hashchange', event => {
    const hash = new URL(event.newURL).hash;
    const restored = traversedHash === hash;
    traversedHash = null;
    followedHash = null;
    if (restored) return;
    // The browser's jump reaches the address tracker before this event, and it
    // can rename the address after whatever section that jump passed over.
    // Land where the link pointed.
    if (location.hash !== hash) history.replaceState(history.state, '', hash);
    // The open navigation dialog holds the page still, so the landing waits
    // until it has closed.
    if (mobileMenu?.open) mobileMenu.addEventListener('close', restoreSection, { once: true });
    else restoreSection();
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
  if (pastFold() && window.scrollY < boundary) {
    window.scrollTo({ top: boundary, behavior: 'instant' });
  }
  document.title = sectionTitle();
  paintImmediately();
}
// Each section past About's top registers how to land on it once its
// layout is measured. Landing says whether the hash named one.
const sectionLandings = {};
function landOnSection(hash) {
  const land = sectionLandings[hash];
  if (!land) return false;
  land();
  syncProjectsNav();
  return true;
}
const sectionTitles = { '#experience': 'Experience', '#education': 'Education', '#projects': 'Projects', '#skills': 'Skills' };
function sectionTitle(hash = location.hash) {
  if (sectionTitles[hash]) return `${sectionTitles[hash]} · JOSH`;
  return ['', '#home', '#intro'].includes(hash) ? 'JOSH' : 'About me · JOSH';
}

// The address names the section on screen as the reader scrolls, without
// adding history entries. Home keeps a bare address, so a reload there still
// plays the intro. A project sheet owns the address while it is open.
function trackSectionHash() {
  const root = document.documentElement;
  const path = location.pathname + location.search;
  const sections = [
    ['#experience', document.querySelector('#experience')],
    ['#education', document.querySelector('#education')],
    ['#projects', document.querySelector('.projects-frame')],
    ['#skills', document.querySelector('#skills')]
  ].filter(([, el]) => el);
  let frameId = 0;
  function update() {
    frameId = 0;
    if (location.pathname + location.search !== path || root.classList.contains('project-sheet-open')) return;
    const fold = parseFloat(root.style.getPropertyValue('--fold-distance')) || 0;
    const half = window.innerHeight / 2;
    let hash = window.scrollY < fold / 2 ? '' : '#about';
    if (hash) sections.forEach(([name, el]) => { if (el.getBoundingClientRect().top < half) hash = name; });
    const current = ['#home', '#intro'].includes(location.hash) ? '' : location.hash;
    if (hash === current) return;
    history.replaceState(history.state, '', hash || path);
    document.title = sectionTitle(hash);
  }
  window.addEventListener('scroll', () => {
    if (!frameId) frameId = requestAnimationFrame(update);
  }, { passive: true });
}

// Where each Experience job rests while the section is pinned; empty when
// it scrolls as one screen.
let coreJobStops = [];

// Where Meet Josh rests: the fold distance, or About's own top without the
// fold.
let aboutStop = 0;

const pageStops = () => [...document.querySelectorAll('.page-snap')].map(marker => parseFloat(marker.style.top)).sort((a, b) => a - b);

// Turning between Projects and Skills, the top bar stays put and only its
// underline moves: it lifts off the page being left, toward the next one, and
// draws on under the page that lands. Back toward Projects runs leftward.
function drawNavLine(back = false) {
  const root = document.documentElement;
  root.classList.add('nav-line-enter');
  root.classList.toggle('nav-line-back', back);
  setTimeout(() => root.classList.remove('nav-line-enter', 'nav-line-back'), 900);
}

// Scrolling on past a section's last resting place holds the page long
// enough for its exit to be seen, then turns it. Like the fold, the flick
// that asked for the turn is spent on it: its momentum is swallowed rather
// than carried on into the next page. Keys stay native. `target` returns
// where a turn in that direction goes, or nothing when this section does not
// own it; `leave` starts the exit. With `fresh`, only a gesture that started
// at the resting place can turn it. `still` names the gestures that may not
// turn the page but must not scroll it either, so a page that only ever cuts
// is never seen gliding to its neighbour. With `wheelOnly`, touch keeps native
// scrolling.
function holdPageTurns(target, leave, { fresh = false, still = () => false, wheelOnly = false } = {}) {
  const gesture = { time: -Infinity, direction: 0, distance: 0, owned: false, eligible: true };
  // Returns true when this movement belongs to the exit and must not scroll.
  const claim = (direction, distance, now) => {
    if (now - gesture.time > 180 || direction !== gesture.direction) {
      gesture.owned = gesture.owned && now - gesture.time <= 180;
      gesture.distance = 0;
      gesture.eligible = true;
    }
    gesture.time = now;
    gesture.direction = direction;
    if (gesture.owned) return true;
    const to = gesture.eligible ? target(direction) : undefined;
    if (to === undefined) {
      // With `fresh`, a gesture that began somewhere this section does not
      // own (the fold's momentum, a snap in flight) never turns into an
      // exit when it reaches it; the next flick does.
      if (fresh) gesture.eligible = false;
      return still(direction);
    }
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
  if (wheelOnly) return;
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

// The Spline workspace in Meet Josh. Its runtime is fetched only once the page
// has settled, so it never competes with the entrance, and it renders only
// while Meet Josh is on screen, About is the page in front and nothing else on
// it is moving: the fold, Meet Josh's entrance and its exit all run on the
// same thread as the scene, so it holds its last frame until they finish.
// Phones get none of it; the scene is not loaded below the tablet width.
const SPLINE_BUILD = 'https://cdn.jsdelivr.net/npm/@splinetool/runtime@2.0.55/build/';
const SPLINE_RUNTIME = SPLINE_BUILD + 'runtime.js';
// Left alone, the runtime asks for these one wave at a time: its modules, then
// the scene, then what the scene uses, then the renderer. Asked for together,
// they arrive in one wave. The list is this scene's and this runtime
// version's; a name that goes stale costs one unused download, nothing more.
const SPLINE_MODULES = ['runtime-timeline-5YUCVT7L.js', 'runtime-text-LFJHKA7L.js',
  'runtime-particles-PBWDRHMN.js', 'runtime-DRACOLoader-GLMRFFK2.js', 'process.js', 'opentype.js'];
const SPLINE_FILES = ['https://cdn.spline.design/@splinetool/runtime@2.0.55/build/process.wasm',
  'https://www.gstatic.com/draco/versioned/decoders/1.5.2/draco_wasm_wrapper.js',
  'https://www.gstatic.com/draco/versioned/decoders/1.5.2/draco_decoder.wasm'];
// The renderer is WebGPU where the browser has it and WebGL elsewhere.
const SPLINE_RENDERER = 'gpu' in navigator ? 'runtime-webgpu-DDM7K6ES.js' : 'runtime-classicRuntime-7CF5S54Q.js';
// The scene is soft enough that a retina screen gains little from drawing it
// at full density, and every extra pixel is drawn every frame.
const SCENE_PIXEL_RATIO = 1.25;
function initAboutScene(about) {
  const canvas = about.querySelector('.about-scene-canvas');
  if (!canvas) return;
  const root = document.documentElement;
  const meet = canvas.closest('.about-hero');
  const wide = window.matchMedia('(min-width: 701px)');
  let app = null;
  let onScreen = false;
  // The entrance runs for about 1.7s after About lands.
  let entering = false;
  let enterTimer = 0;
  const moving = () => entering
    || root.classList.contains('section-folding')
    || (about.classList.contains('about-motion') && !about.classList.contains('is-arrived'))
    || !!meet?.matches('.is-away, .is-leaving, .is-returning');
  // The runtime reports itself stopped before its first play while its loop
  // is already running, so its isStopped cannot be trusted; this tracks it.
  let playing = null;
  // The scene's script poses him on its own animation frame, apart from the
  // runtime's render loop, so it is held here while the scene is stopped.
  let sceneTick = null;
  let heldTick = null;
  const sync = () => {
    if (!app) return;
    const showing = wide.matches && onScreen && !about.inert && !document.hidden && !moving();
    if (showing === playing) return;
    playing = showing;
    if (showing) {
      app.play();
      if (heldTick) {
        const tick = heldTick;
        heldTick = null;
        requestAnimationFrame(tick);
      }
    } else app.stop();
  };
  // The tick is found by a name only its source holds, while the scene loads.
  const gateSceneFrames = () => {
    const request = window.requestAnimationFrame;
    let looking = true;
    window.requestAnimationFrame = function (callback) {
      if (looking && typeof callback === 'function' && String(callback).includes('GAZE_DIR')) {
        sceneTick = callback;
        looking = false;
      }
      if (callback === sceneTick && playing === false) {
        heldTick = callback;
        return 0;
      }
      return request.call(this, callback);
    };
    // Found or not, it stops looking once the scene has had time to start.
    setTimeout(() => {
      looking = false;
      if (!sceneTick && window.requestAnimationFrame !== request) window.requestAnimationFrame = request;
    }, 15000);
  };
  let arrived = about.classList.contains('is-arrived');
  const onClassChange = () => {
    const now = about.classList.contains('is-arrived');
    if (now && !arrived && !reducedMotion.matches) {
      entering = true;
      clearTimeout(enterTimer);
      enterTimer = setTimeout(() => {
        entering = false;
        sync();
      }, 1700);
    }
    arrived = now;
    sync();
  };
  // His gaze follows the cursor only while it is over the scene, not on Meet
  // Josh's copy. The scene's script listens for moves across the whole
  // window, so its listeners are wrapped as it adds them; moving away tells
  // it the pointer has left, and he turns back to his laptop.
  const copy = '.about-eyebrow, .about-title, .about-lead, .about-resume';
  let watching = false;
  const near = (event) => {
    const rect = canvas.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom
      && !event.target?.closest?.(copy);
  };
  const gate = (listener) => function (event) {
    if (near(event)) {
      watching = true;
      listener.call(this, event);
    } else if (watching) {
      watching = false;
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'josh-gaze-leave' } }));
    }
  };
  const gateSceneMoves = () => {
    const add = window.addEventListener;
    let gated = 0;
    const restore = () => {
      if (window.addEventListener !== add) delete window.addEventListener;
    };
    window.addEventListener = function (type, listener, options) {
      if ((type === 'pointermove' || type === 'mousemove') && typeof listener === 'function') {
        listener = gate(listener);
        if (++gated === 2) restore();
      }
      return add.call(this, type, listener, options);
    };
    // The script adds both listeners soon after the scene loads.
    setTimeout(restore, 15000);
    return restore;
  };
  // Everything the scene needs is asked for at once when the page settles:
  // downloads run off the main thread, so they cost the entrance nothing.
  let runtime = null;
  let bytes = null;
  const fetchScene = () => {
    for (const [href, rel, as] of [
      ...[SPLINE_RENDERER, ...SPLINE_MODULES].map(name => [SPLINE_BUILD + name, 'modulepreload']),
      ...SPLINE_FILES.map(href => [href, 'preload', 'fetch']),
    ]) {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      link.crossOrigin = 'anonymous';
      if (as) link.as = as;
      document.head.append(link);
    }
    runtime = import(SPLINE_RUNTIME);
    bytes = fetch(new URL(canvas.dataset.scene, document.baseURI).href)
      .then(response => response.ok ? response.arrayBuffer() : Promise.reject(new Error(response.status)));
    // Settled here so a failure waits for load to handle it.
    runtime.catch(() => {});
    bytes.catch(() => {});
  };
  const load = async () => {
    const restore = gateSceneMoves();
    gateSceneFrames();
    try {
      const [{ Application }, data] = await Promise.all([runtime, bytes]);
      // The scene's own script drives everything that moves: the typing and
      // sway, his gaze, and the lamp switching on a click. Inline runs it in
      // this page; the default sandbox would lay an iframe over the canvas
      // and take the pointer.
      const scene = new Application(canvas, { htmlContentMode: 'inline' });
      // Load is a fetch and then start; the fetch has already run.
      await scene.start(data);
      // The sky and the studio floor give way to the grain behind them.
      scene.setBackgroundColor('transparent');
      const floor = scene.findObjectByName('Studio floor');
      if (floor) floor.visible = false;
      // The pixel ratio comes from the scene's publish settings, which default
      // to the device's; the renderer is private, so this is best effort.
      const ratio = Math.min(window.devicePixelRatio || 1, SCENE_PIXEL_RATIO);
      try { scene._renderer?.setPixelRatio?.(ratio); } catch {}
      // Load starts the render loop a task after it resolves, without marking
      // the runtime as playing, and its stop does nothing while it believes it
      // is stopped. Waiting out that task and playing brings the two in line,
      // so a stop from here on holds.
      await new Promise(resolve => setTimeout(resolve));
      scene.play();
      playing = true;
      app = scene;
      canvas.classList.add('is-loaded');
      sync();
    } catch {
      // Offline or blocked: Meet Josh reads the same without its scene.
      restore();
    }
  };
  let requested = false;
  const start = () => {
    if (requested || !wide.matches) return;
    requested = true;
    fetchScene();
    // Building the scene does hold the main thread, so that part still waits
    // for a quiet moment.
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2000 });
    else setTimeout(load, 200);
  };
  // A window widened past a phone's loads the scene then; narrowed, it stops.
  wide.addEventListener('change', () => {
    if (document.readyState === 'complete') start();
    sync();
  });
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    }).observe(canvas);
  } else onScreen = true;
  // The fold hands About in and out by making it inert, and marks the landing
  // and its own run with classes.
  new MutationObserver(onClassChange).observe(about, { attributes: true, attributeFilter: ['inert', 'class'] });
  const classes = new MutationObserver(sync);
  classes.observe(root, { attributes: true, attributeFilter: ['class'] });
  if (meet) classes.observe(meet, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
}

// The About title fills in when the page lands: the fold marks the landing
// with .is-arrived, and a page without the fold arrives as soon as it paints.
// The Core is a vertical tab list; its panels share one cell, so switching
// subjects never changes the page height.
// What I do's field of points. Each discipline gathers them into a solid of
// its own, built in three dimensions: a browser window with a pointer,
// code brackets, a stack of database discs, an AI chip, a neural network,
// a cloud in a turning globe, an endless loop running with light, two
// turning gears, a server rack. Every point
// sits on the solid's skin at an even spacing and knows which way that skin
// faces, so faces turned away fall dark and the shape reads as a body, not
// a picture. A change sweeps through as a scan line, and each point only
// sets off once the line has passed it. Left alone the field cycles through
// the disciplines, lighting the cell it is showing; pointing at or focusing
// a cell holds its shape. It draws only while on screen.
const CRAFT_ORDER = ['frontend', 'backend', 'database', 'ai', 'ml', 'cloud', 'devops', 'automation', 'server'];
const CRAFT_DWELL = Object.fromEntries(CRAFT_ORDER.map(name => [name, 3000]));
// Each discipline's points take the colour of its lead tool: React, Spring,
// Postgres, Together AI, scikit-learn, Git, Windows. Cloud and Automation
// have no coloured mark of their own, so they take a sky and a violet.
const CRAFT_COLORS = {
  frontend: [97, 218, 251],
  backend: [109, 179, 63],
  database: [105, 158, 202],
  ai: [239, 44, 193],
  ml: [247, 147, 30],
  cloud: [125, 211, 252],
  devops: [240, 80, 50],
  automation: [167, 139, 250],
  server: [76, 194, 255]
};

// A small kit of solids in a -1..1 space, y up and +z toward the viewer.
// Each lays points over its skin `gap` apart with the skin's outward normal,
// and can tell whether a point lies inside it, so where solids overlap only
// the outer skin of the whole is kept.
function craftKit(gap) {
  const points = [];
  const solids = [];
  const solid = (inside) => { solids.push(inside); return solids.length - 1; };
  // A tag rides with each point for forms that move once built: which gear
  // it belongs to, or how far round a loop it sits. A function works it
  // out from the point.
  const put = (owner, x, y, z, nx, ny, nz) => points.push([x, y, z, nx, ny, nz, owner, typeof kit.tag === 'function' ? kit.tag(x, y, z) : kit.tag]);
  const along = (length) => Math.max(1, Math.round(length / gap));
  // A flat patch: a centre, two unit axes and their half-lengths.
  const patch = (owner, [cx, cy, cz], u, v, hu, hv, n) => {
    const cu = along(hu * 2);
    const cv = along(hv * 2);
    for (let i = 0; i < cu; i++) {
      for (let j = 0; j < cv; j++) {
        const a = ((i + .5) / cu * 2 - 1) * hu;
        const b = ((j + .5) / cv * 2 - 1) * hv;
        put(owner, cx + u[0] * a + v[0] * b, cy + u[1] * a + v[1] * b, cz + u[2] * a + v[2] * b, ...n);
      }
    }
  };
  // Points on a sphere by the golden angle, so they sit evenly with no seams.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const kit = {
    tag: -1,
    box(cx, cy, cz, hx, hy, hz) {
      const owner = solid((x, y, z, e) => Math.abs(x - cx) < hx - e && Math.abs(y - cy) < hy - e && Math.abs(z - cz) < hz - e);
      const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
      patch(owner, [cx, cy, cz + hz], X, Y, hx, hy, [0, 0, 1]);
      patch(owner, [cx, cy, cz - hz], X, Y, hx, hy, [0, 0, -1]);
      patch(owner, [cx, cy + hy, cz], X, Z, hx, hz, [0, 1, 0]);
      patch(owner, [cx, cy - hy, cz], X, Z, hx, hz, [0, -1, 0]);
      patch(owner, [cx + hx, cy, cz], Y, Z, hy, hz, [1, 0, 0]);
      patch(owner, [cx - hx, cy, cz], Y, Z, hy, hz, [-1, 0, 0]);
    },
    // A hollow sphere is only a shell of points, `spread` times the usual
    // spacing apart, and hides nothing inside it.
    sphere(cx, cy, cz, r, hollow = false, spread = 1) {
      const owner = solid((x, y, z, e) => !hollow && Math.hypot(x - cx, y - cy, z - cz) < r - e);
      const count = Math.max(6, Math.round(4 * Math.PI * r * r / (gap * spread) ** 2));
      for (let i = 0; i < count; i++) {
        const ny = 1 - (i + .5) / count * 2;
        const ring = Math.sqrt(1 - ny * ny);
        const nx = Math.cos(i * golden) * ring;
        const nz = Math.sin(i * golden) * ring;
        put(owner, cx + nx * r, cy + ny * r, cz + nz * r, nx, ny, nz);
      }
    },
    // A disc standing on the y axis, with both lids.
    cylinder(cx, cy, cz, r, h) {
      const owner = solid((x, y, z, e) => Math.hypot(x - cx, z - cz) < r - e && Math.abs(y - cy) < h / 2 - e);
      const rows = along(h);
      const round = Math.max(8, Math.round(2 * Math.PI * r / gap));
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < round; i++) {
          const a = (i + (j % 2) * .5) / round * Math.PI * 2;
          put(owner, cx + Math.cos(a) * r, cy - h / 2 + (j + .5) / rows * h, cz + Math.sin(a) * r, Math.cos(a), 0, Math.sin(a));
        }
      }
      const lid = Math.max(4, Math.round(Math.PI * r * r / (gap * gap)));
      [1, -1].forEach((side) => {
        for (let i = 0; i < lid; i++) {
          const d = Math.sqrt((i + .5) / lid) * r;
          put(owner, cx + Math.cos(i * golden) * d, cy + side * h / 2, cz + Math.sin(i * golden) * d, 0, side, 0);
        }
      });
    },
    // A tube of radius r along a path of [x, y, z] points, rounded at its
    // ends and corners. A closed path loops back to its start.
    tube(path, r, closed = false) {
      const nodes = closed ? [...path, path[0]] : path;
      const lines = nodes.slice(1).map((end, i) => [nodes[i], end]);
      const near = (x, y, z) => Math.min(...lines.map(([a, b]) => {
        const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const t = Math.max(0, Math.min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / (d[0] ** 2 + d[1] ** 2 + d[2] ** 2 || 1)));
        return Math.hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t);
      }));
      const owner = solid((x, y, z, e) => near(x, y, z) < r - e);
      const round = Math.max(6, Math.round(2 * Math.PI * r / gap));
      let ring = 0;
      lines.forEach(([a, b]) => {
        const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const length = Math.hypot(...d);
        const t = d.map(c => c / length);
        // Two axes across the tube, square to its direction.
        const up = Math.abs(t[2]) > .9 ? [0, 1, 0] : [0, 0, 1];
        let u = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]];
        const lu = Math.hypot(...u);
        u = u.map(c => c / lu);
        const v = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
        const steps = Math.max(1, Math.round(length / gap));
        for (let s = 0; s < steps; s++, ring++) {
          const f = (s + .5) / steps;
          for (let i = 0; i < round; i++) {
            const turn = (i + (ring % 2) * .5) / round * Math.PI * 2;
            const n = [0, 1, 2].map(k => u[k] * Math.cos(turn) + v[k] * Math.sin(turn));
            put(owner, a[0] + d[0] * f + n[0] * r, a[1] + d[1] * f + n[1] * r, a[2] + d[2] * f + n[2] * r, ...n);
          }
        }
      });
      // Corners are rounded off; only a few long, straight tubes need them.
      if (nodes.length < 12) (closed ? path : nodes).forEach(([x, y, z]) => kit.sphere(x, y, z, r));
    },
    // A flat outline pushed out to a depth: `loops` are its edges as closed
    // [x, y] lists, `inside` says whether a point of the face is solid.
    slab(cx, cy, cz, depth, loops, inside) {
      const owner = solid((x, y, z, e) => Math.abs(z - cz) < depth / 2 - e && inside(x - cx, y - cy));
      const xs = loops.flat().map(p => p[0]);
      const ys = loops.flat().map(p => p[1]);
      for (let x = Math.min(...xs) + gap / 2; x < Math.max(...xs); x += gap) {
        for (let y = Math.min(...ys) + gap / 2; y < Math.max(...ys); y += gap) {
          if (!inside(x, y)) continue;
          put(owner, cx + x, cy + y, cz + depth / 2, 0, 0, 1);
          put(owner, cx + x, cy + y, cz - depth / 2, 0, 0, -1);
        }
      }
      const rows = along(depth);
      loops.forEach((loop) => {
        loop.forEach(([ax, ay], i) => {
          const [bx, by] = loop[(i + 1) % loop.length];
          const length = Math.hypot(bx - ax, by - ay);
          let nx = (by - ay) / length, ny = -(bx - ax) / length;
          const mx = (ax + bx) / 2, my = (ay + by) / 2;
          // The normal points out of the solid, whichever way the loop runs.
          if (inside(mx + nx * gap * .3, my + ny * gap * .3)) { nx = -nx; ny = -ny; }
          const steps = Math.max(1, Math.round(length / gap));
          for (let s = 0; s < steps; s++) {
            for (let j = 0; j < rows; j++) {
              const f = (s + .5) / steps;
              put(owner, cx + ax + (bx - ax) * f, cy + ay + (by - ay) * f, cz - depth / 2 + (j + .5) / rows * depth, nx, ny, 0);
            }
          }
        });
      });
    },
    // Only the outer skin: points buried inside another solid are dropped.
    skin() {
      const e = gap * .3;
      return points.filter(([x, y, z, , , , owner]) => !solids.some((inside, k) => k !== owner && inside(x, y, z, e)));
    }
  };
  return kit;
}

// A rounded rectangle as a closed path, flat at depth z, for kit.tube.
function craftRoundRect(cx, cy, z, hw, hh, r, steps = 6) {
  const path = [];
  [[hw - r, hh - r, 0], [-hw + r, hh - r, Math.PI / 2], [-hw + r, -hh + r, Math.PI], [hw - r, -hh + r, Math.PI * 1.5]].forEach(([ox, oy, from]) => {
    for (let i = 0; i <= steps; i++) {
      const a = from + i / steps * Math.PI / 2;
      path.push([cx + ox + Math.cos(a) * r, cy + oy + Math.sin(a) * r, z]);
    }
  });
  return path;
}

// Automation's gears as centre x, centre y and how fast each turns. The
// small one has seven teeth to the large one's ten, so it runs 10/7 as fast
// the other way and the teeth stay meshed.
const CRAFT_GEARS = [[-.28, -.18, .5], [.5, .44, -.5 * 10 / 7]];

// Where a tagged point of a built form sits at `time`: Automation's gears
// turn about their centres and Cloud's globe turns about the upright.
// Writes the moved point and normal into `out`.
function craftMove(name, goal, g, time, out, beat = -1) {
  const tag = goal[g + 6];
  let angle = 0, cx = 0, cy = 0, upright = false;
  if (name === 'automation' && tag >= 0) {
    [cx, cy] = CRAFT_GEARS[tag];
    angle = time * CRAFT_GEARS[tag][2];

  } else if (name === 'cloud' && tag === 0) {
    angle = time * .35;
    upright = true;
  }
  const c = Math.cos(angle), s = Math.sin(angle);
  for (const [from, to, dx, dy] of [[0, 0, cx, cy], [3, 3, 0, 0]]) {
    const x = goal[g + from] - dx, y = goal[g + from + 1] - dy, z = goal[g + from + 2];
    if (upright) {
      out[to] = x * c + z * s; out[to + 1] = y; out[to + 2] = z * c - x * s;
    } else {
      out[to] = x * c - y * s + dx; out[to + 1] = x * s + y * c + dy; out[to + 2] = z;
    }
  }
  if (name === 'frontend' && tag === 1) out[2] += craftClick(beat);
}

// The shapes that stand still once built each play one beat when they
// have settled: Frontend's pointer clicks, a signal passes through the
// network, a query runs down the database, the server's lights blink.
// `age` is seconds since the shape arrived; the beat starts a second in,
// once the points have landed, and comes round every three seconds while
// a cell holds the shape. It is -1 before then.
function craftBeat(age) {
  return age >= 1 && age < Infinity ? (age - 1) % 3 : -1;
}

// How far Frontend's pointer has pushed in: in over 120ms, out over 220ms.
function craftClick(beat) {
  if (beat < 0 || beat >= .34) return 0;
  const t = beat < .12 ? beat / .12 : 1 - (beat - .12) / .22;
  return -.1 * Math.sin(t * Math.PI / 2);
}

// A band of light `width` wide, its front at `front`, over a point `tag`
// along the way: brightest at the front, fading behind it.
function craftBand(front, tag, width) {
  const d = front - tag;
  return d >= 0 && d < width ? (1 - d / width) ** 2 : 0;
}

// Server lights blink like drive activity: each on for 80ms at a time, on
// a rhythm of its own so no two keep step.
const CRAFT_BLINKS = [[.47, 0], [.83, .21], [.61, .37], [.95, .09], [.53, .44], [.71, .28]];

// A tag for points along an open path: `base` plus how far along it, 0 to
// just under 1, the nearest point of the path sits.
function craftAlong(path, base) {
  const parts = path.slice(1).map((end, i) => [path[i], end, Math.hypot(end[0] - path[i][0], end[1] - path[i][1], end[2] - path[i][2])]);
  const total = parts.reduce((sum, part) => sum + part[2], 0);
  return (x, y, z) => {
    let best = Infinity, at = 0, before = 0;
    parts.forEach(([a, b, length]) => {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / (length * length)));
      const gap = Math.hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t);
      if (gap < best) { best = gap; at = before + t * length; }
      before += length;
    });
    return base + .999 * at / total;
  };
}

// Machine Learning's signals: each route runs input node, hidden node,
// output node. Inputs are 0 to 2, hidden 3 to 6, outputs 7 and 8. The two
// sets take turns.
const CRAFT_ROUTES = [
  [[0, 3, 7], [2, 5, 8], [1, 4, 8], [1, 6, 7]],
  [[1, 3, 8], [0, 6, 8], [2, 4, 7], [0, 5, 7]]
];

// How brightly a tagged point of a still shape is lit by its beat, 0 to 1.
function craftGlow(name, tag, beat, age) {
  if (tag < 0 || beat < 0) return 0;
  if (name === 'frontend') {
    // The clicked card flashes as the pointer lands and fades over 400ms.
    return tag === 2 && beat >= .12 && beat < .52 ? 1 - (beat - .12) / .4 : 0;
  }
  if (name === 'ml') {
    // Signals leave input nodes a moment apart and hop node to node along
    // their routes: a short run of light down each wire, 350ms a hop, and
    // each node flashes as a signal leaves or reaches it, fading over 300ms.
    // The routes change each time the beat comes round.
    const routes = CRAFT_ROUTES[Math.floor((age - 1) / 3) % CRAFT_ROUTES.length];
    let glow = 0;
    routes.forEach(([from, middle, to], r) => {
      const start = r * .22;
      [[from, middle], [middle, to]].forEach(([a, b], hop) => {
        const at = beat - start - hop * .43;
        if (tag >= 100) {
          const wire = a < 3 ? a * 4 + b - 3 : 12 + (a - 3) * 2 + b - 7;
          if (Math.floor(tag) - 100 === wire && at >= 0 && at < .5) glow = Math.max(glow, craftBand(at / .35, tag % 1, .3));
        } else {
          const flash = t => (t >= 0 && t < .3 ? 1 - t / .3 : 0);
          if (tag === 10 + a) glow = Math.max(glow, flash(at));
          if (tag === 10 + b) glow = Math.max(glow, flash(at - .35));
        }
      });
    });
    return glow;
  }
  if (name === 'ai') {
    // A run of light along a pin, ring or stroke that starts at `start`
    // and takes `length` seconds to cover it.
    const run = (start, length) => {
      const at = beat - start;
      return at >= 0 && at < length * 1.4 ? craftBand(at / length * 1.3, tag % 1, .3) : 0;
    };
    // Input: the left and top pins in turn, 40ms apart, running inward.
    if (tag >= 200 && tag < 208) return run(Math.floor(tag - 200) * .04, .12);
    // Output: the right and bottom pins in turn, running outward.
    if (tag >= 210 && tag < 218) return run(.9 + Math.floor(tag - 210) * .04, .12);
    // The package, then the die, closing in.
    if (tag >= 3 && tag < 4) return run(.3, .2);
    // The answer, written a stroke every 80ms, stays lit once written.
    if (tag >= 400 && tag < 405) {
      const start = .5 + Math.floor(tag - 400) * .08;
      const written = beat < 2.9 && (beat - start) / .08 >= tag % 1 ? .6 : 0;
      return Math.max(run(start, .08), written);
    }
    return 0;
  }
  if (name === 'database') {
    // The query falls through the stack in 600ms, twice, and the middle
    // disc's light comes on as it is found and stays on.
    if (tag === 3) return beat >= .3 && beat < 2.9 ? 1 : 0;
    if (tag > 1) return 0;
    const pass = beat < 1 ? beat : beat - 1;
    return pass < .6 && beat < 1.6 ? craftBand(pass / .6 * 1.15, tag, .15) : 0;
  }
  if (name === 'server' && tag < CRAFT_BLINKS.length) {
    const [period, offset] = CRAFT_BLINKS[tag];
    return (age + offset) % period < .08 ? 1 : 0;
  }
  return 0;
}

const CRAFT_FORMS = {
  // A browser window drawn in tubes: its frame, the bar with its three
  // lights, a heading and a line of text, then three cards floating forward
  // and a pointer in front of them all, clicking the last. The window is
  // wider than the other solids, so the whole of it is drawn at `k`.
  frontend(kit) {
    const k = .78;
    const tube = (path, r, closed) => kit.tube(path.map(p => p.map(c => c * k)), r * k, closed);
    tube(craftRoundRect(0, .06, 0, .94, .7, .12), .045, true);
    tube([[-.94, .5, 0], [.94, .5, 0]], .03);
    [-.78, -.64, -.5].forEach(x => kit.sphere(x * k, .63 * k, 0, .045 * k));
    tube([[-.66, .3, .16], [.1, .3, .16]], .05);
    tube([[-.66, .14, .16], [.34, .14, .16]], .028);
    [-.46, 0, .46].forEach((x) => {
      kit.tag = x > 0 ? 2 : -1;
      tube(craftRoundRect(x, -.3, .28, .17, .2, .05, 3), .03, true);
    });
    // The pointer and the card it clicks are tagged for the click; see
    // craftClick and craftGlow.
    kit.tag = 1;
    const pointer = [[0, 0], [0, -.5], [.12, -.38], [.21, -.56], [.29, -.52], [.2, -.35], [.36, -.35], [0, 0]];
    tube(pointer.map(([x, y]) => [.5 + x, -.2 + y, .52]), .04);
  },
  // Code: the APIs behind the page, as a pair of brackets and a slash.
  backend(kit) {
    kit.tube([[-.28, .46, 0], [-.72, 0, 0], [-.28, -.46, 0]], .09);
    kit.tube([[.28, .46, 0], [.72, 0, 0], [.28, -.46, 0]], .09);
    kit.tube([[.14, .58, 0], [-.14, -.58, 0]], .09);
  },
  // A database as a solid stack: three thick discs with a sliver of air
  // between them, so the lid of each one below catches the light, and a
  // status light set into the front of each. The discs know how far down
  // the stack they sit, 0 at the top, for the query that runs down it; the
  // lights are tagged 2, 3 and 4 from the top.
  database(kit) {
    [.5, 0, -.5].forEach((y, i) => {
      kit.tag = (x, py) => Math.min(1, Math.max(0, (.68 - py) / 1.36));
      kit.cylinder(0, y, 0, .7, .36);
      kit.tag = 2 + i;
      kit.sphere(.4, y, .57, .06);
    });
  },

  // AI as a chip: the package and its pins, the die raised off it, and the
  // letters AI standing in front. For its beat, input comes in on the left
  // and top pins, closes in on the die, the letters are written stroke by
  // stroke and the answer leaves by the right and bottom pins; see
  // craftGlow. Input pins are tagged 200 plus their number, output pins 210
  // plus theirs, strokes 400 plus theirs, each plus how far along it a
  // point sits in the direction the signal runs. The package and die are
  // tagged 3 to 4 from the outside in.
  ai(kit) {
    kit.tag = (x, y) => 3 + .999 * Math.min(1, Math.max(0, (.6 - Math.max(Math.abs(x), Math.abs(y))) / .25));
    kit.tube(craftRoundRect(0, 0, 0, .56, .56, .1), .045, true);
    const pin = (base, from, to) => {
      kit.tag = craftAlong([from, to], base);
      kit.tube([from, to], .035);
    };
    [-.33, -.11, .11, .33].forEach((p, i) => {
      pin(200 + i, [-.8, -p, 0], [-.6, -p, 0]);
      pin(204 + i, [p, .8, 0], [p, .6, 0]);
      pin(210 + i, [.6, -p, 0], [.8, -p, 0]);
      pin(214 + i, [p, -.6, 0], [p, -.8, 0]);
    });
    kit.tag = (x, y) => 3 + .999 * Math.min(1, Math.max(0, (.6 - Math.max(Math.abs(x), Math.abs(y))) / .25));
    kit.tube(craftRoundRect(0, 0, .14, .38, .38, .06), .03, true);
    const z = .3;
    [
      [[[-.25, -.2, z], [-.12, .2, z], [.01, -.2, z]], .05],
      [[[-.2, -.06, z], [-.04, -.06, z]], .045],
      [[[.08, .2, z], [.26, .2, z]], .045],
      [[[.17, .2, z], [.17, -.2, z]], .05],
      [[[.08, -.2, z], [.26, -.2, z]], .045]
    ].forEach(([path, r], stroke) => {
      kit.tag = craftAlong(path, 400 + stroke);
      kit.tube(path, r);
    });
    kit.tag = -1;
  },
  // A small neural network: three layers of nodes set round in depth, every
  // node wired to each one in the next layer.
  ml(kit) {
    const layers = [[-.74, 3, .46], [0, 4, .6], [.74, 2, .32]].map(([x, count, spread]) =>
      Array.from({ length: count }, (_, i) => {
        const a = i / count * Math.PI * 2 + (count === 4 ? Math.PI / 4 : Math.PI / 2);
        return [x, Math.sin(a) * spread, Math.cos(a) * spread];
      }));
    // Signals travel the graph node to node; see CRAFT_ROUTES. Each node is
    // tagged 10 plus its number, inputs first. Each wire is tagged 100 plus
    // its number, plus how far along it a point sits from its input end.
    layers.flat().forEach(([x, y, z], n) => {
      kit.tag = 10 + n;
      kit.sphere(x, y, z, .11);
    });
    let wire = 0;
    layers.slice(0, -1).forEach((layer, l) => layer.forEach(a => layers[l + 1].forEach((b) => {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const length = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
      const base = 100 + wire++;
      kit.tag = (x, y, z) => base + .999 * Math.min(1, Math.max(0, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / length));
      kit.tube([a, b], .016);
    })));
  },
  // A cloud as a thick slab with a rounded rim, held in a glass globe of
  // sparse points that turns slowly round it once built. The globe is kept
  // smaller than the other solids: its near side swells in perspective, and
  // it needs air above and below it in the field.
  cloud(kit) {
    const k = .64;
    const puffs = [[-.36, -.14, .24], [.02, .08, .34], [.38, -.1, .25]];
    const inside = (x, y) => puffs.some(([px, py, r]) => Math.hypot(x - px, y - py) < r) ||
      (x > -.36 && x < .38 && y > -.38 && y < -.14);
    // The outline, found by walking out from the middle along each bearing.
    const loop = Array.from({ length: 144 }, (_, i) => {
      const a = i / 144 * Math.PI * 2;
      let lo = 0, hi = 1;
      for (let n = 0; n < 20; n++) {
        const mid = (lo + hi) / 2;
        if (inside(Math.cos(a) * mid, -.08 + Math.sin(a) * mid)) lo = mid; else hi = mid;
      }
      return [Math.cos(a) * lo * k, (-.08 + Math.sin(a) * lo) * k];
    });
    kit.slab(0, 0, 0, .18, [loop], (x, y) => inside(x / k, y / k));
    [.09, -.09].forEach(z => kit.tube(loop.map(([x, y]) => [x, y, z]), .045, true));
    kit.tag = 0;
    kit.sphere(0, 0, 0, .72, true, 2.2);
    kit.tag = -1;
  },
  // DevOps' endless loop in two halves, each running into an arrowhead at
  // the top of its lobe where it hands over to the other. The halves pass
  // one in front of the other where they cross.
  devops(kit) {
    const at = (t) => {
      const d = 1 + Math.sin(t) ** 2;
      return [.95 * Math.cos(t) / d, .95 * Math.sin(t) * Math.cos(t) / d, .16 * Math.sin(t)];
    };
    const gap = .22;
    // Each point knows how far round the loop it sits, 0 to 1, for the
    // pulse that runs through it.
    const samples = Array.from({ length: 96 }, (_, i) => {
      const half = i < 48 ? .62 : Math.PI + .62;
      const t = half + gap / 2 + (Math.PI - gap) * (i % 48) / 47;
      return [...at(t), t];
    });
    kit.tag = (x, y, z) => {
      let best = samples[0], near = Infinity;
      samples.forEach((sample) => {
        const d = (sample[0] - x) ** 2 + (sample[1] - y) ** 2 + (sample[2] - z) ** 2;
        if (d < near) { near = d; best = sample; }
      });
      return ((best[3] - .62 - gap / 2) / (Math.PI * 2) + 1) % 1;
    };
    [.62, Math.PI + .62].forEach((start) => {
      const from = start + gap / 2;
      const to = start + Math.PI - gap / 2;
      kit.tube(Array.from({ length: 49 }, (_, i) => at(from + (to - from) * i / 48)), .05);
      const [px, py, pz] = at(to);
      const [qx, qy] = at(to - .02);
      const length = Math.hypot(px - qx, py - qy);
      const tx = (px - qx) / length, ty = (py - qy) / length;
      const wing = side => [px - tx * .22 + ty * side * .19, py - ty * .22 - tx * side * .19, pz];
      kit.tube([wing(1), [px + tx * .06, py + ty * .06, pz], wing(-1)], .05);
    });
  },
  // Two meshed gears with depth, the small one set a little behind. They
  // turn once built; see CRAFT_GEARS.
  automation(kit) {
    const gear = (cx, cy, cz, outer, inner, teeth, turn, hole) => {
      const rim = Array.from({ length: teeth * 4 }, (_, i) => {
        const a = turn + i / (teeth * 4) * Math.PI * 2;
        const r = i % 4 < 2 ? outer : inner;
        return [Math.cos(a) * r, Math.sin(a) * r];
      });
      const bore = Array.from({ length: 28 }, (_, i) => [Math.cos(i / 28 * Math.PI * 2) * hole, Math.sin(i / 28 * Math.PI * 2) * hole]);
      const inside = (x, y) => {
        if (Math.hypot(x, y) < hole) return false;
        let within = false;
        rim.forEach(([ax, ay], i) => {
          const [bx, by] = rim[(i + 1) % rim.length];
          if ((ay > y) !== (by > y) && x < ax + (y - ay) / (by - ay) * (bx - ax)) within = !within;
        });
        return within;
      };
      kit.slab(cx, cy, cz, .2, [rim, bore], inside);
    };
    kit.tag = 0;
    gear(...CRAFT_GEARS[0].slice(0, 2), 0, .62, .5, 10, 0, .24);
    kit.tag = 1;
    gear(...CRAFT_GEARS[1].slice(0, 2), -.12, .38, .3, 7, .22, .13);
  },
  // A server rack: three units, each with two lights and a vent. The six
  // lights are tagged 0 to 5 so each can blink on its own.
  server(kit) {
    [.46, 0, -.46].forEach((y, i) => {
      kit.box(0, y, 0, .7, .16, .44);
      [-.5, -.34].forEach((x, j) => {
        kit.tag = i * 2 + j;
        kit.sphere(x, y, .45, .06);
        kit.tag = -1;
      });
      kit.tube([[-.1, y, .46], [.5, y, .46]], .03);
    });
  }
};

// Builds a form as exactly `count` points, each with its normal and tag, as
// a flat run of x, y, z, nx, ny, nz, tag. The spacing is tuned until the skin holds
// about that many; the last few are then dropped or doubled evenly.
function buildCraftForm(name, count) {
  let gap = .05;
  let found = [];
  for (let pass = 0; pass < 5; pass++) {
    const kit = craftKit(gap);
    CRAFT_FORMS[name](kit);
    found = kit.skin();
    if (Math.abs(found.length - count) < count * .01) break;
    gap *= Math.sqrt(found.length / count);
  }
  const form = new Float32Array(count * 7);
  for (let i = 0; i < count; i++) {
    const point = found[Math.floor(i * found.length / count)];
    for (let a = 0; a < 6; a++) form[i * 7 + a] = point[a];
    form[i * 7 + 6] = point[7];
  }
  return form;
}

// Each cell's mark: its discipline's solid drawn flat and small, the way it
// looks face on.
const CRAFT_GLYPHS = {
  // A browser window: its bar and lights, a heading and a line of text,
  // three cards, and a pointer clicking the last.
  frontend(context) {
    context.lineWidth = 14;
    context.beginPath();
    context.roundRect(40, 71, 320, 238, 20);
    context.stroke();
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(40, 115); context.lineTo(360, 115);
    context.stroke();
    [67, 91, 115].forEach((x) => {
      context.beginPath();
      context.arc(x, 93, 8, 0, Math.PI * 2);
      context.fill();
    });
    context.lineWidth = 16;
    context.beginPath();
    context.moveTo(88, 149); context.lineTo(217, 149);
    context.stroke();
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(88, 176); context.lineTo(258, 176);
    [122, 200, 278].forEach(x => context.roundRect(x - 29, 217, 58, 68, 8));
    context.stroke();
    // The pointer sits on a gap cut through whatever is under it.
    const pointer = new Path2D('M285 234v85l20-20 16 30 14-7-15-29h27Z');
    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.lineWidth = 22;
    context.stroke(pointer);
    context.restore();
    context.fill(pointer);
  },
  // Code: the APIs behind the page.
  backend(context) {
    context.lineWidth = 30;
    context.beginPath();
    context.moveTo(145, 115); context.lineTo(62, 200); context.lineTo(145, 285);
    context.moveTo(255, 115); context.lineTo(338, 200); context.lineTo(255, 285);
    context.moveTo(226, 92); context.lineTo(174, 308);
    context.stroke();
  },
  // AI as a chip: the package, its pins, and the letters AI.
  ai(context) {
    context.lineWidth = 14;
    context.beginPath();
    context.roundRect(105, 105, 190, 190, 18);
    context.stroke();
    context.lineWidth = 12;
    context.beginPath();
    [144, 181, 219, 256].forEach((p) => {
      context.moveTo(p, 98); context.lineTo(p, 62);
      context.moveTo(p, 302); context.lineTo(p, 338);
      context.moveTo(98, p); context.lineTo(62, p);
      context.moveTo(302, p); context.lineTo(338, p);
    });
    context.stroke();
    context.lineWidth = 16;
    context.beginPath();
    context.moveTo(158, 236); context.lineTo(180, 164); context.lineTo(202, 236);
    context.moveTo(166, 212); context.lineTo(194, 212);
    context.moveTo(229, 164); context.lineTo(229, 236);
    context.moveTo(214, 164); context.lineTo(244, 164);
    context.moveTo(214, 236); context.lineTo(244, 236);
    context.stroke();
  },
  // A database: a stack of three discs.
  database(context) {
    context.lineWidth = 14;
    context.beginPath();
    context.ellipse(200, 100, 118, 36, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(82, 100); context.lineTo(82, 300);
    context.moveTo(318, 100); context.lineTo(318, 300);
    context.stroke();
    [166, 233, 300].forEach((y) => {
      context.beginPath();
      context.ellipse(200, y, 118, 36, 0, 0, Math.PI);
      context.stroke();
    });
  },
  // A small neural network: three layers of open rings, every node wired
  // to each one in the next layer. The wires stop at the rings.
  ml(context) {
    const layers = [[58, [110, 200, 290]], [200, [80, 160, 240, 320]], [342, [150, 250]]];
    const ring = 22;
    context.lineWidth = 5;
    context.beginPath();
    layers.slice(0, -1).forEach(([x, ys], l) => {
      const [nextX, nextYs] = layers[l + 1];
      ys.forEach(y => nextYs.forEach((nextY) => { context.moveTo(x, y); context.lineTo(nextX, nextY); }));
    });
    context.stroke();
    context.globalCompositeOperation = 'destination-out';
    layers.forEach(([x, ys]) => ys.forEach((y) => {
      context.beginPath();
      context.arc(x, y, ring + 6, 0, Math.PI * 2);
      context.fill();
    }));
    context.globalCompositeOperation = 'source-over';
    context.lineWidth = 10;
    layers.forEach(([x, ys]) => ys.forEach((y) => {
      context.beginPath();
      context.arc(x, y, ring, 0, Math.PI * 2);
      context.stroke();
    }));
  },
  // A cloud outline inside its globe.
  cloud(context) {
    context.lineWidth = 12;
    context.beginPath();
    context.arc(200, 200, 176, 0, Math.PI * 2);
    context.stroke();
    const puffs = (inset) => {
      context.beginPath();
      context.arc(128, 222, 50 - inset, 0, Math.PI * 2);
      context.arc(203, 181, 70 - inset, 0, Math.PI * 2);
      context.arc(276, 218, 52 - inset, 0, Math.PI * 2);
      context.fill();
      context.fillRect(128, 222, 148, 50 - inset);
    };
    puffs(0);
    context.globalCompositeOperation = 'destination-out';
    puffs(16);
    context.globalCompositeOperation = 'source-over';
  },
  // DevOps' endless loop in two halves, each ending in an arrowhead at the
  // top of its lobe: build, release, run, and round again.
  devops(context) {
    const at = (t) => {
      const d = 1 + Math.sin(t) ** 2;
      return [200 + 170 * Math.cos(t) / d, 200 - 170 * Math.sin(t) * Math.cos(t) / d];
    };
    context.lineWidth = 20;
    [.62, Math.PI + .62].forEach((start) => {
      const from = start + .2;
      const to = start + Math.PI - .2;
      context.beginPath();
      for (let i = 0; i <= 48; i++) context.lineTo(...at(from + (to - from) * i / 48));
      const [px, py] = at(to);
      const [qx, qy] = at(to - .02);
      const length = Math.hypot(px - qx, py - qy);
      const tx = (px - qx) / length, ty = (py - qy) / length;
      context.moveTo(px - tx * 40 + ty * 34, py - ty * 40 - tx * 34);
      context.lineTo(px + tx * 8, py + ty * 8);
      context.lineTo(px - tx * 40 - ty * 34, py - ty * 40 + tx * 34);
      context.stroke();
    });
  },
  // Two meshed gears.
  automation(context) {
    const gear = (cx, cy, outer, inner, teeth, turn) => {
      context.beginPath();
      for (let i = 0; i < teeth * 4; i++) {
        const angle = turn + i / (teeth * 4) * Math.PI * 2;
        const r = i % 4 < 2 ? outer : inner;
        context.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      context.closePath();
      context.fill();
      context.globalCompositeOperation = 'destination-out';
      context.beginPath();
      context.arc(cx, cy, inner - 18, 0, Math.PI * 2);
      context.fill();
      context.globalCompositeOperation = 'source-over';
      context.beginPath();
      context.arc(cx, cy, inner * .32, 0, Math.PI * 2);
      context.fill();
    };
    gear(162, 222, 116, 94, 10, 0);
    gear(296, 124, 72, 56, 7, .22);
  },
  server(context) {
    context.lineWidth = 14;
    [78, 168, 258].forEach((top) => {
      context.beginPath();
      context.roundRect(72, top, 256, 66, 12);
      context.stroke();
      context.beginPath();
      context.arc(112, top + 33, 10, 0, Math.PI * 2);
      context.arc(146, top + 33, 10, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 10;
      context.beginPath();
      context.moveTo(200, top + 33); context.lineTo(292, top + 33);
      context.stroke();
      context.lineWidth = 14;
    });
  }
};

function initCraftField(craft) {
  const field = craft.querySelector('.craft-field');
  const canvas = field?.querySelector('canvas');
  const context = canvas?.getContext('2d');
  if (!context) return null;
  const section = craft.closest('.craft-section') || craft;
  const cells = [...craft.querySelectorAll('.craft-cell[data-shape]')];
  const still = reducedMotion.matches;
  // The field's own name line and each discipline's list of tools.
  // Each cell's mark is its discipline's solid drawn flat and small.
  cells.forEach((cell) => {
    const mark = cell.querySelector('.craft-mark');
    const draw = CRAFT_GLYPHS[cell.dataset.shape];
    const pen = mark?.getContext('2d');
    if (!pen || !draw) return;
    const px = Math.round(20 * Math.min(window.devicePixelRatio || 1, 3));
    mark.width = mark.height = px;
    pen.scale(px / 400, px / 400);
    pen.fillStyle = pen.strokeStyle = `rgb(${CRAFT_COLORS[cell.dataset.shape] || [255, 255, 255]})`;
    pen.lineCap = pen.lineJoin = 'round';
    draw(pen);
  });
  const nowLine = field.querySelector('.craft-now');
  const toolSets = [...field.querySelectorAll('.craft-tools-set')];
  let toolTimer = 0;
  // Fewer points on a phone. Each solid is built the first time it is shown.
  const COUNT = window.innerWidth < 640 ? 3000 : 7000;
  const forms = {};
  const form = name => forms[name] || (forms[name] = buildCraftForm(name, COUNT));
  // The first solid takes about 90ms to build. Built here, before the page
  // first paints, it costs a beat of the blank screen the turn cuts to;
  // built on the entrance's first frame, it froze the heading mid-draw.
  form(CRAFT_ORDER[0]);
  const now = new Float32Array(COUNT * 3);
  // Which way each point's patch of skin faces. It turns toward the new
  // solid's as the point flies, so a point in flight is lit half way.
  const facing = new Float32Array(COUNT * 3);
  // Each point rides a critically damped spring to its place, so a shape can
  // be interrupted mid-flight and every point carries its speed into the next.
  const speed = new Float32Array(COUNT * 3);
  const STIFFNESS = (2 * Math.PI / .55) ** 2;
  const DAMPING = 4 * Math.PI / .55;
  const screenY = new Float32Array(COUNT);
  const setOff = new Float32Array(COUNT);
  const lag = Float32Array.from({ length: COUNT }, () => Math.random());
  // Each colour plain, and run toward white for points the scan line has
  // just lit.
  const paints = Object.fromEntries(CRAFT_ORDER.map((name) => {
    const rgb = CRAFT_COLORS[name] || [255, 255, 255];
    return [name, [0, .5].map((white) => {
      const [r, g, b] = rgb.map(c => Math.round(c + (255 - c) * white));
      return `rgb(${r}, ${g}, ${b})`;
    })];
  }));
  let width = 0;
  let height = 0;
  let ratio = 1;
  let shape = CRAFT_ORDER[0];
  // A point keeps its old colour until the scan line sets it off.
  let previous = shape;
  let sweepAt = -Infinity;
  let frame = 0;
  let last = 0;
  let visible = false;
  let running = false;
  let held = null;
  let cycleTimer = 0;
  let resumeTimer = 0;
  let pointer = 0;
  let yaw = 0;


  function measure() {
    const box = field.getBoundingClientRect();
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    if (still) draw(0, 0);
  }

  function draw(time, step) {
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!width || !height) return;
    const goal = form(shape);
    const size = Math.min(width * .34, height * .36);
    const camera = 3.2;
    // The solid is seen from a little above. It turns slowly from one
    // three-quarter view to the other and leans toward the pointer.
    yaw += ((still ? -.5 : Math.sin(time * .4) * .62 + pointer * .3) - yaw) * (step ? 1 - Math.exp(-step * 3) : 1);
    const pitch = .32 + (still ? 0 : Math.sin(time * .27) * .06);
    const sinYaw = Math.sin(yaw), cosYaw = Math.cos(yaw);
    const sinPitch = Math.sin(pitch), cosPitch = Math.cos(pitch);
    const sweep = still ? Infinity : (time - sweepAt) / .75 * height;
    // Springs are integrated in small slices so a long frame stays stable.
    const slices = step ? Math.ceil(step / (1 / 120)) : 0;
    const slice = slices ? step / slices : 0;
    const turnTo = step ? 1 - Math.exp(-step * 9) : 1;
    // CI/CD's loop carries a pulse of light round it, a run going through.
    const pulse = shape === 'devops' && !still ? (time * .4) % 1 : -1;
    const age = time - sweepAt;
    const beat = still ? -1 : craftBeat(age);
    const spot = [0, 0, 0, 0, 0, 0];
    let paint = null;
    for (let i = 0; i < COUNT; i++) {
      const k = i * 3;
      const g = i * 7;
      const set = step === 0 || time >= setOff[i];
      craftMove(shape, goal, g, still ? 0 : time, spot, set ? beat : -1);
      if (step === 0) {
        for (let a = 0; a < 3; a++) { now[k + a] = spot[a]; speed[k + a] = 0; facing[k + a] = spot[3 + a]; }
      } else if (set) {
        for (let n = 0; n < slices; n++) {
          for (let a = 0; a < 3; a++) {
            speed[k + a] += ((spot[a] - now[k + a]) * STIFFNESS - speed[k + a] * DAMPING) * slice;
            now[k + a] += speed[k + a] * slice;
          }
        }
        for (let a = 0; a < 3; a++) facing[k + a] += (spot[3 + a] - facing[k + a]) * turnTo;
      }
      // Turn about the upright, then tip the top toward the viewer.
      const x = now[k] * cosYaw + now[k + 2] * sinYaw;
      const flatZ = now[k + 2] * cosYaw - now[k] * sinYaw;
      const y = now[k + 1] * cosPitch - flatZ * sinPitch;
      const z = flatZ * cosPitch + now[k + 1] * sinPitch;
      const scale = camera / (camera - z);
      const sx = width / 2 + x * size * scale;
      const sy = height / 2 - y * size * scale;
      screenY[i] = sy;
      // Skin facing the viewer is lit and skin facing away falls dark, which
      // is what makes the points read as a solid. Nearer points are a
      // little brighter, each one flickers faintly, and the scan line lights
      // what it has just passed.
      const toward = (facing[k + 2] * cosYaw - facing[k] * sinYaw) * cosPitch + facing[k + 1] * sinPitch;
      const behind = pulse >= 0 && set && goal[g + 6] >= 0 ? ((pulse - goal[g + 6]) % 1 + 1) % 1 : 1;
      let glow = behind < .22 ? (1 - behind / .22) ** 2 : 0;
      if (set && beat >= 0) glow = Math.max(glow, craftGlow(shape, goal[g + 6], beat, age));
      const lit = (sweep - sy >= 0 && sweep - sy < 70) || glow > .35;
      let alpha = ((1 + toward) / 2) ** 2 * (.55 + .45 * Math.min(1, Math.max(0, (scale - .8) / .5)));
      if (!still) alpha *= 1 + .14 * Math.sin(time * 2.6 + lag[i] * 6.28);
      if (lit) alpha = alpha * 1.6 + .12;
      alpha += glow * .3;
      if (alpha < .04) continue;
      const fill = paints[set ? shape : previous][lit ? 1 : 0];
      if (fill !== paint) { context.fillStyle = fill; paint = fill; }
      context.globalAlpha = Math.min(1, alpha);
      const dot = Math.max(.7, 1.35 * scale);
      context.fillRect(sx - dot / 2, sy - dot / 2, dot, dot);
    }
    context.globalAlpha = 1;
    if (sweep < height + 40) {
      const glow = context.createLinearGradient(0, sweep - 46, 0, sweep);
      glow.addColorStop(0, 'rgba(255, 255, 255, 0)');
      glow.addColorStop(1, 'rgba(255, 255, 255, .07)');
      context.fillStyle = glow;
      context.fillRect(0, sweep - 46, width, 46);
      const line = context.createLinearGradient(0, 0, width, 0);
      line.addColorStop(0, 'rgba(255, 255, 255, 0)');
      line.addColorStop(.5, 'rgba(255, 255, 255, .85)');
      line.addColorStop(1, 'rgba(255, 255, 255, 0)');
      context.fillStyle = line;
      context.fillRect(0, sweep, width, 1);
    }
  }

  function tick(stamp) {
    frame = 0;
    if (!running) return;
    const time = stamp / 1000;
    const step = last ? Math.min(time - last, .05) : .016;
    last = time;
    draw(time, step);
    frame = requestAnimationFrame(tick);
  }
  function play() {
    const should = visible && section.classList.contains('is-entered') && !document.hidden && !still;
    if (should === running) return;
    running = should;
    last = 0;
    if (running) frame = requestAnimationFrame(tick);
    else cancelAnimationFrame(frame);
  }

  // The name above rises in as the old one lifts away, and the tools
  // below follow it in one by one. The Tools row shows only when that
  // discipline lists some.
  function caption(to) {
    const cell = cells.find(item => item.dataset.shape === to);
    nowLine?.querySelectorAll('span:not(.is-after)').forEach((old) => {
      old.classList.add('is-after');
      setTimeout(() => old.remove(), 300);
    });
    if (nowLine && cell) {
      const name = document.createElement('span');
      name.className = 'is-before';
      name.textContent = cell.querySelector('.craft-name')?.textContent || '';
      nowLine.append(name);
      requestAnimationFrame(() => requestAnimationFrame(() => name.classList.remove('is-before')));
    }
    const set = toolSets.find(list => list.dataset.shape === to);
    const tools = set ? [...set.children] : [];
    field.classList.remove('has-tools');
    clearTimeout(toolTimer);
    toolTimer = setTimeout(() => {
      toolSets.forEach((list) => { list.hidden = list !== set; });
      if (!tools.length) return;
      tools.forEach((tool, k) => { tool.style.setProperty('--k', k); tool.classList.add('is-before'); });
      field.classList.add('has-tools');
      requestAnimationFrame(() => requestAnimationFrame(() => tools.forEach(tool => tool.classList.remove('is-before'))));
    }, 160);
  }

  // A new shape sets off as the scan line reaches each point.
  function morph(to) {
    if (to === shape) return;
    previous = shape;
    shape = to;
    caption(to);
    if (still) { draw(0, 0); return; }
    const time = performance.now() / 1000;
    sweepAt = time;
    for (let i = 0; i < COUNT; i++) setOff[i] = time + Math.max(0, screenY[i] / (height || 1)) * .75 + lag[i] * .08;
  }

  function light(name, mode) {
    cells.forEach((cell) => {
      const on = cell.dataset.shape === name;
      cell.classList.remove('is-lit', 'is-held');
      if (!on || !mode) return;
      if (mode === 'lit') {
        cell.style.setProperty('--dwell', `${CRAFT_DWELL[name]}ms`);
        void cell.offsetWidth;
      }
      cell.classList.add(mode === 'lit' ? 'is-lit' : 'is-held');
    });
  }
  function advance() {
    clearTimeout(cycleTimer);
    if (held || still) return;
    const next = CRAFT_ORDER[(CRAFT_ORDER.indexOf(shape) + 1) % CRAFT_ORDER.length];
    morph(next);
    light(next, 'lit');
    cycleTimer = setTimeout(advance, CRAFT_DWELL[next]);
  }
  function hold(cell) {
    clearTimeout(resumeTimer);
    clearTimeout(cycleTimer);
    held = cell.dataset.shape;
    morph(held);
    light(held, 'held');
  }
  function release(cell) {
    if (held !== cell.dataset.shape || cell.matches(':focus-within')) return;
    held = null;
    light(null);
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(advance, 1200);
  }
  cells.forEach((cell) => {
    cell.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') hold(cell); });
    cell.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') release(cell); });
    cell.addEventListener('focusin', () => hold(cell));
    cell.addEventListener('focusout', () => requestAnimationFrame(() => release(cell)));
  });
  field.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const box = field.getBoundingClientRect();
    pointer = ((event.clientX - box.left) / box.width - .5) * 2;
  });
  field.addEventListener('pointerleave', () => { pointer = 0; });

  new ResizeObserver(measure).observe(field);
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    play();
  }).observe(field);
  document.addEventListener('visibilitychange', play);
  measure();

  return {
    // Arriving, the points rise out of a flat line across the middle
    // straight into the first discipline, and the cycle starts over.
    enter() {
      clearTimeout(cycleTimer);
      clearTimeout(resumeTimer);
      held = null;
      shape = previous = CRAFT_ORDER[0];
      caption(shape);
      light(shape, still ? 'held' : 'lit');
      if (still) { draw(0, 0); return; }
      for (let i = 0; i < COUNT; i++) {
        now[i * 3] = (i % 60) / 59 * 2.1 - 1.05;
        now[i * 3 + 1] = -.08;
        now[i * 3 + 2] = 0;
        facing.set([0, 0, 1], i * 3);
        speed.fill(0, i * 3, i * 3 + 3);
        screenY[i] = height / 2;
      }
      const time = performance.now() / 1000;
      sweepAt = time;
      for (let i = 0; i < COUNT; i++) setOff[i] = time + lag[i] * .35;
      play();
      cycleTimer = setTimeout(advance, CRAFT_DWELL[shape]);
    },
    leave() {
      clearTimeout(cycleTimer);
      clearTimeout(resumeTimer);
      play();
    },
    sync: play
  };
}

let craftStage = { enter() {}, leave() {} };
// Skills' panel. It arrives once it is on screen: the frame draws round, the
// hairlines grow, the copy rises and the points gather into the first
// discipline. It leaves the same way backwards if it scrolls away, and arrives
// again when it returns. The turns to and from Projects belong to the track.
function initCraft() {
  const craft = document.querySelector('.craft-section');
  const panel = craft?.querySelector('[data-craft]');
  // About joins Skills in after load, so this can be called a second time.
  if (!panel || panel.dataset.ready !== undefined) return;
  panel.dataset.ready = '';
  // The frame is one plain rectangle, drawn as a path so it can trace itself in.
  const outline = panel.querySelector('.craft-frame path');
  const frame = () => {
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    outline.setAttribute('d', `M.5 .5H${w - .5}V${h - .5}H.5Z`);
    panel.classList.add('has-frame');
  };
  new ResizeObserver(frame).observe(panel);
  frame();
  panel.querySelectorAll('.craft-cell').forEach((cell, i) => cell.style.setProperty('--i', i));
  const points = initCraftField(panel);
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    points?.enter();
    return;
  }
  craft.classList.add('craft-motion');
  const enter = () => {
    if (craft.classList.contains('is-entered')) return;
    craft.classList.remove('is-leaving');
    craft.classList.add('is-entered');
    points?.enter();
  };
  const leave = () => {
    if (!craft.classList.contains('is-entered')) return;
    craft.classList.remove('is-entered', 'is-leaving');
    points?.leave();
  };
  // On Projects' last card Skills can sit just inside the screen's foot, so
  // the observer never sees it go. The turns set it directly at their cuts.
  craftStage = { enter, leave };
  new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (entry.intersectionRatio >= .35) enter();
    else if (!entry.isIntersecting) leave();
  }, { threshold: [0, .35] }).observe(craft);
}

function initAboutContent() {
  const about = document.querySelector('#about');
  const content = about?.querySelector('.about-content');
  if (!content) return;
  initAboutScene(about);
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
  // Experience does on the way down. As soon as Experience starts to carry it
  // off the top, its entrance plays back out; turning back mid-exit returns
  // it. Once it has left the screen it resets out of sight; coming back into
  // view plays it in again.
  const meet = content.querySelector('.about-hero');
  if (meet && !reducedMotion.matches && 'IntersectionObserver' in window) {
    let settled = 0;
    let lastShown = 0;
    // A held turn owns the exit until Meet Josh is away or handed back. The
    // last reading at rest can be stale, so the first one on the way out
    // could otherwise look like a return.
    let turning = false;
    new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      const whole = Math.min(entry.boundingClientRect.height, entry.rootBounds?.height || window.innerHeight);
      const now = whole ? entry.intersectionRect.height / whole : 0;
      const rising = now > lastShown;
      lastShown = now;
      const away = meet.classList.contains('is-away');
      const leaving = meet.classList.contains('is-leaving');
      if (!away && !entry.isIntersecting && entry.boundingClientRect.top < 0) {
        clearTimeout(settled);
        turning = false;
        meet.classList.remove('is-leaving');
        meet.classList.add('is-away', 'is-returning');
      } else if (away && entry.intersectionRatio >= .35) {
        meet.classList.remove('is-away');
        // The sweep holds its reversed angle until the fill has finished.
        settled = setTimeout(() => meet.classList.remove('is-returning'), 2000);
      } else if (!away && !leaving && !rising && now < .9 && entry.boundingClientRect.top < 0) {
        meet.classList.add('is-leaving');
      } else if (leaving && rising && !turning) {
        meet.classList.remove('is-leaving');
      }
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }).observe(meet);

    // The turn to Experience holds the page for the exit first, as Experience
    // does, then cuts to it. Turning up stays with the fold.
    let exitTimer = 0;
    holdPageTurns((direction) => {
      const y = window.scrollY;
      // Only from Meet Josh's own resting place: while the fold is landing the
      // document still reads Home's 0, which is a page stop too.
      if (direction < 0 || root.classList.contains('section-folding') || Math.abs(y - aboutStop) > 2 ||
        !about.classList.contains('is-arrived') || meet.classList.contains('is-away') || meet.classList.contains('is-leaving')) return;
      return pageStops().find(top => top > y + 2);
    }, (to, edge) => {
      turning = true;
      meet.classList.add('is-leaving');
      clearTimeout(exitTimer);
      exitTimer = setTimeout(() => {
        // The turn cuts rather than travels: the exit has cleared the page, so
        // Experience takes its place without the two sliding past each other.
        window.scrollTo({ top: to, behavior: 'instant' });
        // A turn that never got away hands Meet Josh back.
        exitTimer = setTimeout(() => {
          if (Math.abs(window.scrollY - edge) > 2) return;
          turning = false;
          meet.classList.remove('is-leaving');
        }, 1200);
      }, 360);
      // Down from Meet Josh only ever cuts: a flick that cannot turn it yet
      // (the fold's momentum, one mid-exit) is spent here rather than scrolled.
    }, { fresh: true, still: direction => direction > 0 && Math.abs(window.scrollY - aboutStop) <= 2 });
  }

  // Education arrives each time the page turns to it and resets once it has
  // left the screen entirely, or once a held turn has landed, ready to settle from the side it will come
  // back from. Leaving plays its exit the way Experience's does.
  const education = content.querySelector('.edu-section');
  if (education && !reducedMotion.matches && 'IntersectionObserver' in window) {
    education.classList.add('edu-motion');
    // Sheets leave with the page: up on the way to Projects, down to Experience.
    const exitToward = (direction) => education.style.setProperty('--edu-exit', direction > 0 ? '-12px' : '12px');
    let lastShown = 0;
    // A held turn owns the exit until Education is off screen or handed back.
    let turning = false;
    // Gone: ready to arrive again from the side it will come back from.
    const reset = (above) => {
      turning = false;
      education.classList.remove('is-entered', 'is-leaving', 'is-resuming');
      education.style.setProperty('--edu-from', above ? '-16px' : '16px');
    };
    new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      const whole = Math.min(entry.boundingClientRect.height, entry.rootBounds?.height || window.innerHeight);
      const now = whole ? entry.intersectionRect.height / whole : 0;
      const rising = now > lastShown;
      lastShown = now;
      const entered = education.classList.contains('is-entered');
      const leaving = education.classList.contains('is-leaving');
      if (!entry.isIntersecting) {
        reset(entry.boundingClientRect.top < 0);
      } else if (!entered && entry.intersectionRatio >= .35) {
        education.classList.add('is-entered');
      } else if (entered && !leaving && !rising && now < .9) {
        exitToward(entry.boundingClientRect.top < 0 ? 1 : -1);
        education.classList.add('is-leaving');
      } else if (leaving && rising && !turning) {
        education.classList.replace('is-leaving', 'is-resuming');
      }
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }).observe(education);

    // Both neighbours are snap turns too quick for the exit to be seen, so
    // Education holds the page for it first. Only from its own resting place,
    // and only while it fits one screen; a taller one scrolls on as before.
    const nextStop = (y) => {
      const cards = [...document.querySelectorAll('.projects-snap')].map(snap => snap.getBoundingClientRect().top + y);
      return [...pageStops(), ...cards].filter(top => top > y + 2).sort((a, b) => a - b)[0];
    };
    let exitTimer = 0;
    holdPageTurns((direction) => {
      if (!education.classList.contains('is-entered') || education.classList.contains('is-leaving') ||
        Math.abs(education.getBoundingClientRect().top) > 2 || education.offsetHeight > window.innerHeight + 1) return;
      const y = window.scrollY;
      return direction < 0 ? pageStops().filter(top => top < y - 2).pop() : nextStop(y);
    }, (to, edge) => {
      turning = true;
      exitToward(to > edge ? 1 : -1);
      education.classList.add('is-leaving');
      clearTimeout(exitTimer);
      exitTimer = setTimeout(() => {
        window.scrollTo({ top: to, behavior: 'smooth' });
        exitTimer = setTimeout(() => {
          // Landed on the next page: a strip of Education can still show
          // there, so it resets now rather than waiting to leave the screen.
          if (Math.abs(window.scrollY - to) <= 2) reset(to > edge);
          // A turn that never got away hands Education back.
          else if (Math.abs(window.scrollY - edge) <= 2) {
            turning = false;
            education.classList.replace('is-leaving', 'is-resuming');
          } else turning = false;
        }, 1200);
      }, 320);
    }, { fresh: true });
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

    // Scrolling on past the first job, or the last, holds the page for the
    // exit, then turns it.
    const leaveTarget = (direction) => {
      if (!coreJobStops.length || !section.classList.contains('is-entered') || section.classList.contains('is-leaving')) return;
      const y = window.scrollY;
      const edge = direction < 0 ? coreJobStops[0] : coreJobStops[coreJobStops.length - 1];
      if (Math.abs(y - edge) > 2) return;
      return direction < 0 ? pageStops().filter(top => top < y - 2).pop() : pageStops().find(top => top > y + 2);
    };
    let exitTimer = 0;
    // Up from the first job only ever cuts to Meet Josh, so a flick that
    // cannot turn it yet (the cut's own momentum, one mid-exit) is spent here.
    const still = direction => direction < 0 && coreJobStops.length > 0 && Math.abs(window.scrollY - coreJobStops[0]) <= 2;
    holdPageTurns(leaveTarget, (to, edge) => {
      section.classList.add('is-leaving');
      clearTimeout(exitTimer);
      // Back up to Meet Josh cuts once the exit has cleared, the way Meet Josh
      // cuts down to it; on to Education still scrolls.
      const cut = Math.abs(to - aboutStop) <= 2;
      exitTimer = setTimeout(() => {
        window.scrollTo({ top: to, behavior: cut ? 'instant' : 'smooth' });
        // A turn that never got away hands the section back.
        exitTimer = setTimeout(() => {
          if (Math.abs(window.scrollY - edge) <= 2) section.classList.remove('is-leaving');
        }, 1200);
      }, cut ? 360 : 320);
    }, { still });
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
  // The card keeps one height for every job, so a longer description steps
  // its type down only as far as it must to fit the card the other jobs make.
  const card = core.querySelector('.core-reading');
  const copy = panels.map(panel => [...panel.querySelectorAll('.core-desc')]);
  const fitCopy = () => {
    copy.flat().forEach((paragraph) => { paragraph.style.fontSize = ''; });
    // Each panel's own height, measured out of the shared row.
    const natural = panels.map((panel) => {
      panel.style.alignSelf = 'start';
      const height = panel.offsetHeight;
      panel.style.alignSelf = '';
      return height;
    });
    const floor = parseFloat(getComputedStyle(card).minHeight) || 0;
    // Longer, multi-paragraph entries must not set each other's target height.
    // Keep the shared size established by the compact entries.
    const compact = natural.filter((_, i) => copy[i].length <= 1);
    const baseline = Math.max(floor, ...(compact.length ? compact : [Math.min(...natural)]));
    // Let the outer grid account for the career navigation's height before
    // fitting copy. Long descriptions must not inflate that measurement.
    panels.forEach(panel => { panel.style.height = `${baseline}px`; });
    const room = Math.max(baseline, card.clientHeight);
    panels.forEach(panel => { panel.style.height = ''; });
    panels.forEach((panel, i) => {
      const paragraphs = copy[i];
      if (!paragraphs.length) return;
      const isKisaka = panel.id === 'core-kisaka' || panel.id === 'core-kisaka-support';
      const base = parseFloat(getComputedStyle(paragraphs[0]).fontSize);
      // Measure the natural layout for both shrinking and growing. scrollHeight
      // on a constrained flex panel includes overflow and can over-shrink copy.
      panel.style.height = 'auto';
      panel.style.alignSelf = 'start';
      let low = 13;
      let high = isKisaka ? base + 5 : base;
      let best = low;
      while (low <= high) {
        const size = Math.floor((low + high) * 2) / 4;
        paragraphs.forEach(paragraph => { paragraph.style.fontSize = `${size}px`; });
        if (panel.offsetHeight <= room) {
          best = size;
          low = size + .25;
        } else {
          high = size - .25;
        }
      }
      paragraphs.forEach(paragraph => { paragraph.style.fontSize = `${best}px`; });
      panel.style.alignSelf = '';
      panel.style.height = '';
    });
  };
  const fitCard = () => { fitTitles(); fitDetails(); fitCopy(); };
  new ResizeObserver(fitCard).observe(card);
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
    aboutStop = Math.round(aboutTop);
    let coreTop = aboutTop;
    for (let node = core; node && node !== about; node = node.offsetParent) coreTop += node.offsetTop;
    const end = root.scrollHeight - window.innerHeight;
    // A pinned Core stops once per card; its runway splits evenly between them.
    const step = pinned ? (core.offsetHeight - window.innerHeight) / (jobs - 1) : 0;
    coreJobStops = pinned ? Array.from({ length: jobs }, (_, i) => Math.round(coreTop + i * step)) : [];
    sectionLandings['#experience'] = () => window.scrollTo({ top: Math.round(coreTop), behavior: 'instant' });
    const stops = [0, aboutTop, coreTop, ...coreJobStops];
    // A Core taller than the screen also stops with its bottom edge in view.
    if (core.offsetHeight > window.innerHeight + 1 && !pinned) stops.push(coreTop + core.offsetHeight - window.innerHeight);
    if (education) {
      let educationTop = aboutTop;
      for (let node = education; node && node !== about; node = node.offsetParent) educationTop += node.offsetTop;
      stops.push(educationTop);
      sectionLandings['#education'] = () => window.scrollTo({ top: Math.round(educationTop), behavior: 'instant' });
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
// The underline follows the reader down the page: About, then Projects, then
// Skills. It runs inside About, where Projects and Skills are joined in, and
// on the Projects page, where Skills follows the track.
let syncProjectsNav = () => {};
function initProjectsNav() {
  const about = document.querySelector('#about');
  const runway = document.querySelector('[data-projects-runway]');
  const nav = runway?.closest('.about')?.querySelector('.about-topbar .section-nav');
  const aboutLink = about && nav?.querySelector('.section-nav-link[href$="#about"]');
  const projectsLink = nav?.querySelector('.section-nav-link[href="#projects"]');
  const skillsLink = nav?.querySelector('.section-nav-link[href="#skills"]');
  const skills = document.querySelector('.skills-main');
  // About joins Projects in after load, so this can be called a second time.
  if (!projectsLink || !runway || nav.dataset.tracked !== undefined) return;
  nav.dataset.tracked = '';
  const frame = runway.querySelector('.projects-frame') || runway;
  let shown = nav.querySelector('.section-nav-link[aria-current]') || aboutLink || projectsLink;
  let glide = null;
  let glideY = 0;
  let frameId = 0;
  // The rule's two ends ride one critically damped spring (x: left, y: right),
  // so a reversal mid-glide keeps its speed instead of restarting from rest.
  const spring = createSpring2D(.4, ({ x, y }, settled) => {
    if (!glide) return;
    glide.style.transform = pose({ x, y: glideY, width: Math.max(y - x, 0) });
    if (!settled) return;
    glide.remove();
    glide = null;
    nav.classList.remove('is-gliding');
  }, { restDistance: .25, restSpeed: 4 });
  spring.setActive(true);

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
    // outright while Projects or Skills is current.
    nav.classList.toggle('is-projects', Boolean(aboutLink) && link !== aboutLink);
    // Projects and Skills turn by a cut, so the underline does not glide
    // between them: it draws on under the one that landed, from the side it
    // came from. The turn has already lifted it off the one it left.
    if (link === skillsLink || from === skillsLink) {
      if (!instant && !reducedMotion.matches) drawNavLine(link !== skillsLink);
      instant = true;
    }
    if (instant || reducedMotion.matches) {
      if (glide) {
        spring.stop();
        glide.remove();
        glide = null;
        nav.classList.remove('is-gliding');
      }
      return;
    }
    // A reversal mid-glide simply retargets; the spring leaves from wherever
    // the rule is now, at the speed it already has.
    if (!glide) {
      const start = rule(from);
      glideY = start.y;
      glide = document.createElement('span');
      glide.className = 'section-nav-glide';
      glide.setAttribute('aria-hidden', 'true');
      glide.style.transform = pose(start);
      nav.append(glide);
      nav.classList.add('is-gliding');
      spring.jumpTo(start.x, start.x + start.width);
    }
    const end = rule(link);
    glideY = end.y;
    spring.setTarget(end.x, end.x + end.width);
  }

  // Projects is current once its frame fills the lower half of the screen,
  // and Skills once its own top does.
  function update(instant = false) {
    frameId = 0;
    const half = window.innerHeight / 2;
    if (skillsLink && skills && skills.getBoundingClientRect().top < half) show(skillsLink, instant);
    else if (!aboutLink || frame.getBoundingClientRect().top < half) show(projectsLink, instant);
    else show(aboutLink, instant);
  }
  // A turn calls this straight after its cut, so the underline lands with
  // the page rather than a frame later.
  syncProjectsNav = () => update();

  // Inside About the link scrolls on to Projects rather than leaving the page.
  if (aboutLink) projectsLink.addEventListener('click', (event) => {
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

// Insights is a page of its own. Following a link to it plays the exit of the
// section on screen, as a turn between sections does, then cuts to it. From
// the top bar the bar stays, since Insights has the same one, and only its
// underline lifts off toward Insights; from Home the whole page fades behind
// the exit. Insights reads which it was from ARRIVAL_KEY and enters to match,
// and writes it back when it sends a visitor here.
const ARRIVAL_KEY = 'josh-arrival';
function initInsightsLeave() {
  const root = document.documentElement;
  let leaving = null;
  const exits = [
    ['.about-hero', el => el.classList.add('is-leaving')],
    ['.core-section', el => el.classList.add('is-leaving')],
    ['.edu-section', el => el.classList.add('is-leaving')],
    ['.projects-main', () => root.classList.add('projects-leaving')],
    ['.craft-section', el => el.classList.add('is-leaving')],
  ];
  const onScreen = () => {
    const middle = window.innerHeight / 2;
    for (const [selector, exit] of exits) {
      const el = document.querySelector(selector);
      const box = el?.getBoundingClientRect();
      if (box && box.height && box.top <= middle && box.bottom > middle) return [el, exit];
    }
    return [];
  };
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reducedMotion.matches) return;
    const link = event.target.closest?.('a[href]');
    if (!link || !/\/blog\.html$/.test(new URL(link.href, location.href).pathname)) return;
    event.preventDefault();
    if (leaving) return;
    const fromBar = Boolean(link.closest('.about-topbar'));
    const [section, exit] = fromBar ? onScreen() : [];
    exit?.(section);
    if (fromBar) root.classList.add('nav-line-leave');
    // The page fades behind the exit, not over it; the bar is left standing.
    const targets = fromBar ? [section].filter(Boolean) : [...document.querySelectorAll('body > :not(.site-backdrop)')];
    const fades = targets.map(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 140, easing: 'cubic-bezier(.77, 0, .175, 1)', fill: 'forwards' }));
    try { sessionStorage.setItem(ARRIVAL_KEY, fromBar ? 'bar' : 'home'); } catch {}
    leaving = { section, fades, href: link.href };
    setTimeout(() => { location.href = leaving.href; }, 400);
  }, true);
  // Coming back through the browser's history restores the page as it left.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted || !leaving) return;
    leaving.fades.forEach(fade => fade.cancel());
    leaving.section?.classList.remove('is-leaving');
    root.classList.remove('projects-leaving', 'nav-line-leave');
    leaving = null;
  });
  // Back from Insights by its top bar, the bar stayed and only the underline
  // moved: it draws on here from the Insights side.
  let from = null;
  try {
    from = sessionStorage.getItem(ARRIVAL_KEY);
    if (from === 'insights') sessionStorage.removeItem(ARRIVAL_KEY);
  } catch {}
  if (from === 'insights' && !reducedMotion.matches) drawNavLine(true);
}
initInsightsLeave();

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

// Each project owns a page in projects/. A card that links to one opens its
// content in a sheet over the site instead of leaving it; the page itself is the
// fallback, and a modified click still opens it.
// Splits a paragraph of plain text into its rendered lines, each in its own
// clip, so a line can leave through its own top edge. Re-run on resize; the
// original text is kept on the element.
function splitProjectLines(paragraph) {
  paragraph.dataset.text ??= paragraph.textContent;
  const words = paragraph.dataset.text.trim().split(/\s+/);
  paragraph.replaceChildren(...words.flatMap((word, i) => {
    const span = document.createElement('span');
    span.textContent = word;
    return i ? [' ', span] : [span];
  }));
  const lines = [];
  let top = null;
  paragraph.querySelectorAll('span').forEach((span) => {
    if (span.offsetTop !== top) lines.push([]);
    top = span.offsetTop;
    lines[lines.length - 1].push(span.textContent);
  });
  paragraph.replaceChildren(...lines.map((line, i) => {
    const clip = document.createElement('span');
    clip.className = 'handover-line';
    const inner = document.createElement('span');
    inner.className = 'handover-out';
    // The trailing space keeps the words apart for anything reading the text.
    inner.textContent = line.join(' ') + (i < lines.length - 1 ? ' ' : '');
    clip.append(inner);
    return clip;
  }));
}

// Everything in the hero that leaves, in two chains that start together. The
// title side lifts out through its clips, links first and title last; the
// story dissolves in reading order, eyebrow first. Each returns in its own
// order.
function orderProjectHandover(hero) {
  const bottomUp = el => [...el.querySelectorAll('.handover-out')].reverse();
  const lift = [
    ...[...hero.querySelectorAll('.project-sheet-actions .button')].reverse(),
    ...[...hero.querySelectorAll('.about-lead')].flatMap(bottomUp),
    ...[...hero.querySelectorAll('.about-title-line')].reverse(),
  ].filter(Boolean);
  const story = [
    hero.querySelector('.project-story .about-eyebrow > span'),
    ...hero.querySelectorAll('.project-story .handover-out'),
  ].filter(Boolean);
  [lift, story].forEach(chain => chain.forEach((el, i) => {
    el.style.setProperty('--out', i);
    el.style.setProperty('--in', chain.length - 1 - i);
  }));
}

// A project's hero plays its entrance once, then moves only by transition:
// turning to the next section plays it back out, each line leaving through
// its own top edge, and turning back returns it, as About's sections do. The
// page's turns announce themselves with project-leave and project-arrive; a
// scroll that is not a turn (the scrollbar, keys, touch) is caught by what is
// on screen. Returns what stops the watching.
function playProjectHero(sheet) {
  const hero = sheet.querySelector('.project-sheet-hero');
  hero?.classList.remove('is-leaving');
  sheet.classList.remove('is-playing');
  void sheet.offsetWidth;
  sheet.classList.add('is-playing');
  const stopHow = initProjectHow(sheet.querySelector('.project-how'));
  if (!hero || reducedMotion.matches || !('IntersectionObserver' in window)) return stopHow;
  hero.classList.add('handover-motion');
  const paragraphs = [...hero.querySelectorAll('.about-lead, .project-story p:not(.about-eyebrow)')];
  let width = 0;
  const split = () => {
    paragraphs.forEach(splitProjectLines);
    orderProjectHandover(hero);
  };
  const resized = new ResizeObserver(([entry]) => {
    if (Math.round(entry.contentRect.width) === width) return;
    width = Math.round(entry.contentRect.width);
    split();
  });
  resized.observe(hero);
  document.fonts?.ready.then(() => hero.isConnected && split());
  // The last line to rise ends the entrance. Settling early, mid-entrance,
  // lets the exit's transitions start from wherever the entrance had got to.
  const last = [...hero.querySelectorAll('.project-sheet-rise')].pop();
  const settle = () => sheet.classList.remove('is-playing');
  const ended = (event) => {
    if (event.target === last && event.animationName === 'project-sheet-rise') settle();
  };
  const leave = () => {
    settle();
    hero.classList.add('is-leaving');
  };
  const arrive = () => hero.classList.remove('is-leaving');
  hero.addEventListener('animationend', ended);
  hero.addEventListener('project-leave', leave);
  hero.addEventListener('project-arrive', arrive);
  // How much of the hero is on screen, against as much as ever can be.
  let lastShown = 1;
  const observer = new IntersectionObserver((entries) => {
    const now = shownOf(entries[entries.length - 1]);
    const rising = now > lastShown;
    lastShown = now;
    if (!rising && now < .55 && !hero.classList.contains('is-leaving')) leave();
    else if (rising) arrive();
  }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
  observer.observe(hero);
  return () => {
    stopHow();
    observer.disconnect();
    resized.disconnect();
    hero.removeEventListener('animationend', ended);
    hero.removeEventListener('project-leave', leave);
    hero.removeEventListener('project-arrive', arrive);
  };
}

// How much of an observed element is on screen, against as much as ever can
// be: one taller than the window never shows all of itself.
function shownOf(entry) {
  const whole = Math.min(entry.boundingClientRect.height, entry.rootBounds?.height || window.innerHeight);
  return whole ? entry.intersectionRect.height / whole : 0;
}

// How it works takes the page over from the hero. Its sheet slides up over
// the hero's exit, as Akaru's panels do; the first time each visit, the
// drawing then draws itself in the order data flows through it: each box's
// outline, then its fill and labels, then its routes, ending on the selected
// stage, whose logos take their colour last. The inspector rises after.
// Turning back up drops the sheet back out; once it is off screen it resets,
// and later arrivals skip the drawing. A click skips it too.
const HOW_DRAW_MS = 2400;
function initProjectHow(section) {
  if (!section || reducedMotion.matches || !('IntersectionObserver' in window)) return () => {};
  const arch = section.querySelector('[data-arch]');
  const flow = new Map(JSON.parse(arch?.querySelector('.arch-stages')?.textContent || '[]').map((stage, i) => [stage.id, i]));
  arch?.querySelectorAll('.arch-node').forEach(node => node.style.setProperty('--flow', flow.get(node.dataset.node) ?? 0));
  arch?.querySelectorAll('.arch-edge, .arch-ports rect').forEach(el => el.style.setProperty('--flow', flow.get(el.dataset.to) ?? 0));
  arch?.querySelectorAll('.arch-route').forEach(route => route.style.setProperty('--len', Math.ceil(route.getTotalLength())));
  section.classList.add('how-motion');
  let drawTimer = 0;
  const endDraw = () => {
    clearTimeout(drawTimer);
    section.classList.remove('is-drawing');
  };
  const finishDraw = () => {
    if (!section.classList.contains('is-drawing')) return;
    endDraw();
    // The selected stage's routes ink in, as a selection does.
    arch?.dispatchEvent(new CustomEvent('arch-ink', { bubbles: true }));
  };
  // Every arrival draws the figure again, from blank.
  const draw = () => {
    endDraw();
    arch?.querySelectorAll('.arch-ink').forEach(ink => ink.remove());
    void section.offsetWidth;
    section.classList.add('is-drawing');
    drawTimer = setTimeout(finishDraw, HOW_DRAW_MS);
  };
  const enter = () => {
    if (section.classList.contains('is-leaving')) section.classList.remove('is-leaving');
    if (section.classList.contains('is-entered')) return;
    draw();
    section.classList.add('is-entered');
  };
  const leave = () => {
    if (section.classList.contains('is-entered')) section.classList.add('is-leaving');
  };
  const reset = () => {
    endDraw();
    section.classList.remove('is-entered', 'is-leaving');
  };
  section.addEventListener('project-arrive', enter);
  section.addEventListener('project-leave', leave);
  section.addEventListener('pointerdown', finishDraw);
  let lastShown = 0;
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    const now = shownOf(entry);
    const was = lastShown;
    const rising = now > was;
    lastShown = now;
    const entered = section.classList.contains('is-entered');
    const leaving = section.classList.contains('is-leaving');
    // A section resets once it has been left, or jumped away from while in
    // view (a key, the scrollbar). One the page has just turned to is still
    // a pixel short of the window as the glide begins, and stays.
    if (now === 0) {
      if (!entered || leaving || was > 0) reset();
    }
    else if (!entered && now >= .35) enter();
    else if (entered && !leaving && !rising && now < .5) leave();
    else if (leaving && rising && now >= .35) enter();
    // A pixel's margin, so a section resting just below the window is out.
  }, { rootMargin: '-1px 0px', threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
  observer.observe(section);
  return () => {
    clearTimeout(drawTimer);
    observer.disconnect();
  };
}

// A project page turns a screen at a time. One flick of the wheel or trackpad
// turns to the next section by exit, cut and entrance, so the page never
// slides; the rest of that flick's momentum is spent on the turn, so a hard
// flick still turns only one. A section taller than the window scrolls
// natively until its edge. Touch keeps its own momentum and snaps with CSS;
// keys stay native, as on About. `scroller` is the window for the page or the
// sheet's dialog.
// Scrolling within a section taller than the window still glides, on
// Malvah's Lenis curve (expo out).
const projectTurnEase = t => Math.min(1, 1.001 - Math.pow(2, -10 * t));
const PROJECT_TURN_MS = 1100;
// A turn between sections cuts once the leaving section's exit has cleared
// (every exit piece ends by 370ms).
const PROJECT_CUT_MS = 380;
function initProjectPaging(scroller) {
  const isWindow = scroller === window;
  const box = isWindow ? document.documentElement : scroller;
  box.classList.add('project-paging');
  const getY = () => isWindow ? window.scrollY : scroller.scrollTop;
  const setY = y => isWindow ? window.scrollTo({ top: y, behavior: 'instant' }) : scroller.scrollTo({ top: y, behavior: 'instant' });
  const view = () => isWindow ? window.innerHeight : scroller.clientHeight;
  const maxY = () => box.scrollHeight - view();
  // Where each section rests, read fresh each time, since the sheet swaps its
  // content. The first rests at the very top, above the bar's own room.
  const stops = () => {
    const origin = (isWindow ? 0 : scroller.getBoundingClientRect().top) - getY();
    const sections = [...box.querySelectorAll('.project-sheet-content > *')];
    const top = sections.map((el, i) => i ? Math.min(Math.round(el.getBoundingClientRect().top - origin), maxY()) : 0);
    return top.map((y, i) => ({ el: sections[i], top: y, bottom: i + 1 < top.length ? top[i + 1] : box.scrollHeight }));
  };
  let turn = null;
  const gesture = { time: -Infinity, direction: 0, distance: 0, magnitude: 0, spent: false };
  const tell = (el, type) => el?.dispatchEvent(new CustomEvent(type));

  function stop() {
    cancelAnimationFrame(turn?.frame);
    clearTimeout(turn?.hold);
    turn = null;
  }

  function glide(to) {
    const origin = getY();
    stop();
    if (Math.abs(to - origin) < 1) return;
    turn = { to, direction: Math.sign(to - origin), last: origin, start: performance.now() };
    const step = (now) => {
      // Anything else moving the page (the scrollbar, a key) takes it back.
      if (Math.abs(getY() - turn.last) > 2) {
        turn = null;
        return;
      }
      // A frame can be stamped a moment before the glide began.
      const t = Math.min(1, Math.max(0, (now - turn.start) / PROJECT_TURN_MS));
      setY(Math.round(origin + (to - origin) * projectTurnEase(t)));
      turn.last = getY();
      if (t < 1) turn.frame = requestAnimationFrame(step);
      else turn = null;
    };
    turn.frame = requestAnimationFrame(step);
  }

  // A turn between sections is a page transition, not a journey: the section
  // in front plays its exit where it stands, and once that has cleared the
  // page cuts to the next section, which plays its entrance in the same
  // place. Nothing slides past.
  function handOver(next) {
    const { to, from, into } = next;
    if (!from || !into || from === into) {
      glide(to);
      return;
    }
    tell(from, 'project-leave');
    stop();
    turn = { direction: Math.sign(to - getY()), from, into };
    turn.hold = setTimeout(() => {
      turn = null;
      setY(to);
      tell(into, 'project-arrive');
    }, PROJECT_CUT_MS);
  }

  // Where a flick in this direction goes from here: a stop to glide to, an
  // edge to stop at inside a section taller than the window (`edge`), or
  // nothing when it should scroll natively.
  function destination(direction, y, distance) {
    const list = stops();
    const tall = (s) => s.bottom - s.top > view() + 2;
    let i = list.length - 1;
    while (i > 0 && list[i].top > y + 2) i--;
    const here = list[i];
    if (direction > 0) {
      const end = Math.min(here.bottom - view(), maxY());
      if (!tall(here) || y >= end - 2) return list[i + 1] && { to: list[i + 1].top, from: here.el, into: list[i + 1].el };
      return y + distance > end ? { to: end, edge: true } : undefined;
    }
    if (y > here.top + 2) {
      if (!tall(here)) return { to: here.top };
      return y - distance < here.top ? { to: here.top, edge: true } : undefined;
    }
    const previous = list[i - 1];
    return previous && { to: Math.max(previous.top, here.top - view()), from: here.el, into: previous.el };
  }

  scroller.addEventListener('wheel', (event) => {
    if (reducedMotion.matches || event.ctrlKey || event.metaKey || !event.cancelable) return;
    // Sideways movement belongs to the architecture figure's own scroll.
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const now = performance.now();
    const direction = Math.sign(event.deltaY);
    const distance = Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? view() : 1);
    // A pause, a change of direction or a fresh surge in the middle of a
    // trackpad's decaying momentum starts a new gesture.
    const fresh = now - gesture.time > 160 || direction !== gesture.direction
      || (distance > 24 && distance > gesture.magnitude * 1.6);
    if (fresh) Object.assign(gesture, { distance: 0, spent: false });
    gesture.time = now;
    gesture.direction = direction;
    gesture.magnitude = distance;
    if (turn) {
      event.preventDefault();
      // Turning back before the cut hands the page straight back; it has
      // not moved, so only the sections change.
      if (fresh && direction !== turn.direction && turn.into) {
        gesture.spent = true;
        const { from, into } = turn;
        stop();
        tell(into, 'project-leave');
        tell(from, 'project-arrive');
      }
      return;
    }
    if (gesture.spent) {
      event.preventDefault();
      return;
    }
    const next = destination(direction, getY(), distance);
    if (!next) return;
    event.preventDefault();
    // Scrolling through a tall section stops at its edge; the rest of that
    // flick is spent there, and the next one turns the page.
    if (next.edge) {
      gesture.spent = true;
      setY(next.to);
      return;
    }
    gesture.distance += distance;
    if (gesture.distance < 12) return;
    gesture.spent = true;
    handOver(next);
  }, { passive: false });

  // The hero's See how it works turns the page as a flick down would.
  // Without motion, its link jumps there.
  box.addEventListener('click', (event) => {
    const cue = event.target.closest?.('.project-scroll-cue');
    if (!cue || reducedMotion.matches) return;
    event.preventDefault();
    if (turn) return;
    const list = stops();
    const i = list.findIndex(s => s.el.contains(cue));
    const next = list[i + 1];
    if (next) handOver({ to: next.top, from: list[i].el, into: next.el });
  });
}

// Leaving the project page plays the exit of whichever section is on screen:
// the hero's lines lift out, How it works sinks back through its edge.
function leaveProjectPage(sheet) {
  if (reducedMotion.matches) return;
  sheet.classList.remove('is-playing');
  const middle = window.innerHeight / 2;
  const sections = [...sheet.querySelectorAll('.project-sheet-content > *')];
  const shown = sections.find((el) => {
    const box = el.getBoundingClientRect();
    return box.top <= middle && box.bottom > middle;
  }) || sections[0];
  if (shown?.matches('.project-sheet-hero')) shown.classList.add('is-leaving');
  else shown?.dispatchEvent(new CustomEvent('project-leave'));
}

// Opened on its own, the project page plays the sheet's entrance, and its link
// back holds for the exit before it goes.
function initProjectPage() {
  const page = document.querySelector('.project-sheet--page');
  if (!page) return;
  playProjectHero(page);
  initProjectPaging(window);
  let exit = null;
  page.querySelector('.project-sheet-back')?.addEventListener('click', (event) => {
    if (reducedMotion.matches || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (exit) return;
    const href = event.currentTarget.href;
    leaveProjectPage(page);
    // The page fades behind the hero's exit, not over it.
    exit = page.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 140, easing: 'cubic-bezier(.77, 0, .175, 1)', fill: 'forwards' });
    exit.onfinish = () => { location.href = href; };
  });
  // Coming back through the browser's history restores the page as it left.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted || !exit) return;
    exit.cancel();
    exit = null;
    page.querySelectorAll('.project-sheet-content > .is-leaving').forEach((el) => el.classList.remove('is-leaving'));
  });
}
initProjectPage();

function initProjectSheet() {

  const sheet = document.createElement('dialog');
  sheet.className = 'project-sheet';
  sheet.setAttribute('aria-labelledby', 'project-sheet-title');
  sheet.innerHTML = `
    <div class="project-sheet-bar">
      <button class="project-sheet-back" type="button"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg>Back to projects</button>
    </div>
    <div class="project-sheet-content"></div>`;
  document.body.append(sheet);
  initProjectPaging(sheet);
  const heroes = new Map();
  let fade = null;
  let stopHero = () => {};
  const projects = document.querySelector('.projects-main');
  let reveal = 0;
  // The top bar's contents come back in reading order.
  document.querySelectorAll('.about-topbar :is(.topbar-wordmark, .section-nav > *)').forEach((el, i) => el.style.setProperty('--nav-i', i));
  let navDone = 0;
  // Projects plays its entrance again as the sheet clears, and the top bar
  // comes back with it.
  const showProjects = () => {
    restProjects();
    clearTimeout(reveal);
    const root = document.documentElement;
    if (!root.classList.contains('project-sheet-open')) return;
    root.classList.remove('project-sheet-open');
    projects?.classList.add('projects-entered');
    if (reducedMotion.matches || document.hidden) return;
    clearTimeout(navDone);
    root.classList.add('nav-return');
    navDone = setTimeout(() => root.classList.remove('nav-return'), 1000);
  };
  let opening = null;
  let rest = 0;
  // Projects leaves before a project opens over it: the title lifts, the
  // cards slide on and the chosen one goes last, and the top bar's links
  // lift out. Resolves once it has cleared.
  function leaveProjects(link) {
    if (reducedMotion.matches || sheet.open) return Promise.resolve();
    const root = document.documentElement;
    clearTimeout(navDone);
    clearTimeout(rest);
    root.classList.remove('nav-return');
    link.closest('.project-card')?.classList.add('is-opening');
    root.classList.add('projects-leaving', 'nav-leave');
    return new Promise((resolve) => setTimeout(resolve, 320));
  }
  // Once the sheet covers it, Projects drops its exit and waits, reset.
  function restProjects() {
    clearTimeout(rest);
    document.documentElement.classList.remove('projects-leaving', 'nav-leave');
    projects?.querySelectorAll('.is-opening').forEach((card) => card.classList.remove('is-opening'));
  }

  function projectLink(target) {
    const link = target.closest?.('.project-link');
    return link && /\/projects\/[^/]+\.html$/.test(new URL(link.href, location.href).pathname) ? link : null;
  }

  // Each page is fetched once, as soon as a reader shows interest in it.
  function load(url) {
    if (!heroes.has(url)) {
      heroes.set(url, fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error('Project unavailable');
          return response.text();
        })
        .then((html) => {
          const content = new DOMParser().parseFromString(html, 'text/html').querySelector('.project-sheet-content');
          if (!content) throw new Error('Project unavailable');
          return content;
        })
        .catch((error) => {
          heroes.delete(url);
          throw error;
        }));
    }
    return heroes.get(url);
  }

  async function open(link, fromHistory = false) {
    if (opening === link.href) return;
    opening = link.href;
    let content;
    try {
      // Projects plays its exit while the page loads.
      [content] = await Promise.all([load(link.href), leaveProjects(link)]);
    } catch {
      // file://, offline or a missing page: go to the page instead.
      location.href = link.href;
      return;
    } finally {
      opening = null;
    }
    // The address follows the sheet, so a refresh lands on the project page and
    // the browser's back button closes the sheet.
    if (!fromHistory) history.pushState({ projectSheet: link.href }, '', link.href);
    sheet.querySelector('.project-sheet-content').replaceWith(document.importNode(content, true));
    fade?.cancel();
    clearTimeout(reveal);
    // Projects waits under the sheet, reset, to play its entrance on the way back.
    if (!reducedMotion.matches) projects?.classList.remove('projects-entered');
    document.documentElement.classList.add('project-sheet-open');
    sheet.classList.remove('is-closing');
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
    // Restart the hero's entrance for every project.
    stopHero();
    stopHero = playProjectHero(sheet);
    fade = sheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.23, 1, .32, 1)' });
    rest = setTimeout(restProjects, 260);
  }

  function close() {
    if (!sheet.open) return;
    // Leave through history, so the address returns to the page underneath;
    // popstate then closes the sheet.
    if (history.state?.projectSheet) {
      history.back();
      return;
    }
    dismiss();
  }

  function dismiss() {
    if (!sheet.open) return;
    fade?.cancel();
    // A hidden tab never finishes the fade, so it closes at once.
    if (document.hidden) {
      closed();
      return;
    }
    // The section on screen plays its exit on its own, the way back lifting
    // out with it; then the sheet clears, and Projects comes back in as it
    // goes, so the three beats read one after another.
    leaveProjectPage(sheet);
    stopHero();
    if (!reducedMotion.matches) sheet.classList.add('is-closing');
    reveal = setTimeout(showProjects, 400);
    fade = sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, delay: 360, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'forwards' });
    fade.onfinish = closed;
  }

  // The close event can wait on the next frame, so the page is released here.
  function closed() {
    if (sheet.open) sheet.close();
    fade?.cancel();
    fade = null;
    stopHero();
    stopHero = () => {};
    sheet.classList.remove('is-playing', 'is-closing');
    showProjects();
  }

  sheet.addEventListener('close', closed);
  // Escape leaves the same way the back button does.
  sheet.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  sheet.querySelector('.project-sheet-back').addEventListener('click', close);

  // Back closes the sheet; forward reopens it.
  window.addEventListener('popstate', (event) => {
    const href = event.state?.projectSheet;
    if (href) {
      const link = [...document.querySelectorAll('.project-link')].find((candidate) => candidate.href === href);
      if (link) open(link, true);
      else location.reload();
    } else {
      dismiss();
    }
  });

  const prefetch = (event) => {
    const link = projectLink(event.target);
    if (link) load(link.href).catch(() => {});
  };
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('focusin', prefetch);
  document.addEventListener('click', (event) => {
    const link = projectLink(event.target);
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(link);
  });
}
initProjectSheet();

// A project's architecture drawing: selecting a stage lights its routes and
// neighbors and fills the inspector below. The markup ships with a stage already
// selected, and the sheet imports it fresh on every open, so the listeners live
// on the document.
function initArchitecture() {
  const stagesOf = new WeakMap();
  const stages = (arch) => {
    if (!stagesOf.has(arch)) stagesOf.set(arch, JSON.parse(arch.querySelector('.arch-stages').textContent));
    return stagesOf.get(arch);
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function select(arch, id, focus) {
    const list = stages(arch);
    const index = list.findIndex((stage) => stage.id === id);
    if (index < 0) return;
    const stage = list[index];
    const svg = arch.querySelector('.arch-drawing');
    const near = new Set();
    svg.querySelectorAll('.arch-edge').forEach((edge) => {
      const on = edge.dataset.from === id || edge.dataset.to === id;
      edge.dataset.active = on;
      edge.querySelector('.arch-ink')?.remove();
      if (!on) return;
      near.add(edge.dataset.from === id ? edge.dataset.to : edge.dataset.from);
      if (reduceMotion.matches) return;
      // Ink the route in from its source, as on the original.
      const ink = edge.querySelector('.arch-route').cloneNode();
      ink.setAttribute('class', 'arch-ink');
      ink.setAttribute('pathLength', '1');
      ink.removeAttribute('marker-end');
      edge.append(ink);
    });
    svg.querySelectorAll('.arch-ports rect').forEach((port) => {
      port.dataset.active = port.dataset.from === id || port.dataset.to === id;
    });
    svg.querySelectorAll('.arch-node').forEach((node) => {
      const on = node.dataset.node === id;
      node.dataset.selected = on;
      node.dataset.connected = near.has(node.dataset.node);
      node.setAttribute('aria-pressed', on);
      node.tabIndex = on ? 0 : -1;
      node.querySelector('.arch-selection')?.remove();
      if (on) node.insertAdjacentHTML('beforeend', '<path class="arch-selection" d="M-3,14V-3H14M162,91H179V74" aria-hidden="true"/>');
    });
    arch.querySelector('.arch-stage-type').textContent = stage.type;
    arch.querySelector('.arch-stage-title').textContent = stage.title;
    arch.querySelector('.arch-count').textContent = String(index + 1).padStart(2, '0');
    arch.querySelector('.arch-desc').textContent = stage.desc;
    // A technology is a name, or a name with the id of its icon symbol.
    arch.querySelector('.arch-tech').replaceChildren(...stage.tech.map((tech) => {
      const item = document.createElement('li');
      if (tech.icon) item.insertAdjacentHTML('beforeend', `<svg aria-hidden="true" focusable="false"><use href="#${tech.icon}"/></svg>`);
      item.append(tech.name ?? tech);
      return item;
    }));
    if (focus) svg.querySelector(`.arch-node[data-node="${id}"]`).focus();
  }

  function step(arch, by, focus) {
    const list = stages(arch);
    const current = arch.querySelector('.arch-node[data-selected="true"]')?.dataset.node;
    const index = list.findIndex((stage) => stage.id === current);
    select(arch, list[(index + by + list.length) % list.length].id, focus);
  }

  document.addEventListener('click', (event) => {
    const arch = event.target.closest?.('[data-arch]');
    if (!arch) return;
    const node = event.target.closest('.arch-node');
    if (node) select(arch, node.dataset.node, false);
    const button = event.target.closest('[data-arch-step]');
    if (button) step(arch, Number(button.dataset.archStep), false);
  });
  // How it works asks for the selected stage's routes once it has drawn.
  document.addEventListener('arch-ink', (event) => {
    const arch = event.target.closest?.('[data-arch]');
    const current = arch?.querySelector('.arch-node[data-selected="true"]')?.dataset.node;
    if (current) select(arch, current, false);
  });
  document.addEventListener('keydown', (event) => {
    const node = event.target.closest?.('.arch-node');
    if (!node) return;
    const arch = node.closest('[data-arch]');
    const by = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (by) {
      event.preventDefault();
      step(arch, by, true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(arch, node.dataset.node, false);
    }
  });
}
initArchitecture();

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
  const skills = document.querySelector('.skills-main');
  const craft = skills?.querySelector('.craft-section');
  const phone = window.matchMedia('(max-width: 700px)');
  // Scroll pixels per pixel of horizontal travel.
  const PACE = 1.15;

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
  let frameId = 0;
  let current = -1;
  const fills = cards.map(() => -1);

  function measure() {
    // The frame pins where the sticky bar ends, plus the page's own gap on
    // wider screens where the bar floats.
    const barEnd = topbar ? (parseFloat(getComputedStyle(topbar).top) || 0) + topbar.offsetHeight : 0;
    main.style.setProperty('--projects-top', `${barEnd + (phone.matches ? 0 : 12)}px`);
    // Skills rests with its top against the bar and fills the screen below it.
    skills?.style.setProperty('--skills-top', `${barEnd}px`);
    const viewWidth = viewport.clientWidth;
    const last = cards[cards.length - 1];
    // Travel ends with the last card centred, so every card has its turn.
    const travel = last ? Math.max(0, last.offsetLeft + last.offsetWidth / 2 - viewWidth / 2) : 0;
    const distance = travel * PACE;
    runway.style.height = `${frame.offsetHeight + distance}px`;
    const stickyTop = parseFloat(getComputedStyle(frame).top) || 0;
    geometry = {
      barEnd,
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
  function pageTop(element) {
    const root = document.documentElement;
    if (!about || !root.classList.contains('section-scroll-ready') || reducedMotion.matches) {
      return element.getBoundingClientRect().top + window.scrollY;
    }
    let top = parseFloat(root.style.getPropertyValue('--fold-distance')) || 0;
    for (let node = element; node && node !== about; node = node.offsetParent) top += node.offsetTop;
    return top;
  }
  const runwayOffset = () => pageTop(runway);

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

  // A fine pointer sees the track glide to each stop on a critically damped
  // spring; touch has native momentum and reduced motion follows exactly.
  const smooth = () => finePointer.matches && !reducedMotion.matches && !document.documentElement.classList.contains('touch-input');
  const glide = createSpring2D(.5, ({ x }) => paint(x), { restDistance: .1, restSpeed: 2 });
  glide.setActive(true);

  function tick() {
    frameId = 0;
    const goal = target();
    if (smooth()) glide.setTarget(goal, 0);
    else {
      glide.jumpTo(goal, 0);
      paint(goal);
    }
  }

  function schedule() {
    if (!frameId) frameId = requestAnimationFrame(tick);
  }

  function refresh() {
    measure();
    const goal = target();
    glide.jumpTo(goal, 0);
    paint(goal);
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
      window.scrollTo({ top: scrollFor(index), behavior: reducedMotion.matches || !smooth() ? 'auto' : 'instant' });
    });
  });
  // A fine pointer turns the track one card per gesture, as About turns its
  // pages: the document cuts to the card's stop and the spring carries the
  // track there, so the browser's snap never has momentum to pull back.
  // Before the first card is Education, reached the way it turns down.
  const cardStops = () => {
    const end = document.documentElement.scrollHeight - window.innerHeight;
    return cards.map((_, index) => Math.min(scrollFor(index), end));
  };
  holdPageTurns((direction) => {
    if (!geometry?.distance || !smooth()) return;
    const y = window.scrollY;
    const stops = cardStops();
    const at = stops.findIndex(stop => Math.abs(stop - y) <= 2);
    if (at < 0) return;
    if (at + direction < 0) return pageStops().filter(top => top < y - 2).pop();
    return stops[at + direction];
  }, (to) => {
    window.scrollTo({ top: to, behavior: to < geometry.start ? 'smooth' : 'instant' });
  }, { wheelOnly: true });
  // Skills follows on this page. Scrolling on from the last card plays
  // Projects' exit in place, cuts to Skills and lets Skills enter; scrolling
  // up from Skills' top plays Skills' exit and cuts back to the last card,
  // where Projects enters from the Skills side. The top bar stays, and only
  // its underline moves: it lifts off during the exit and draws on after the
  // cut. Each entrance belongs to its own section's observer, so the cut only
  // has to move the page.
  const root = document.documentElement;
  let turning = false;
  const skillsStop = () => Math.min(pageTop(skills) - geometry.barEnd, root.scrollHeight - window.innerHeight);
  const onSkills = () => skills.getBoundingClientRect().top < window.innerHeight / 2;
  function cut(top, direction) {
    spendTurnMomentum(direction);
    window.scrollTo({ top, behavior: 'instant' });
  }
  function turnToSkills() {
    if (turning || !skills) return;
    turning = true;
    const leave = !reducedMotion.matches && main.classList.contains('projects-entered');
    if (leave) root.classList.add('projects-leaving', 'nav-line-leave');
    // The exit clears at 320ms; the cut waits one empty beat after it.
    setTimeout(() => {
      // Reduced motion has no entrance to replay, so Projects stays entered.
      if (!reducedMotion.matches) main.classList.remove('projects-entered');
      cut(skillsStop(), 1);
      craftStage.enter();
      root.classList.remove('projects-leaving', 'nav-line-leave');
      syncProjectsNav();
      turning = false;
    }, leave ? 380 : 0);
  }
  function turnToProjects(index) {
    if (turning || !geometry) return;
    turning = true;
    const leave = !reducedMotion.matches && craft?.classList.contains('is-entered');
    if (leave) {
      craft.classList.add('is-leaving');
      root.classList.add('nav-line-leave', 'nav-line-back');
    }
    setTimeout(() => {
      // Projects enters from the Skills side: the lines drop in from above and
      // the cards come from the left. The class stays only for the entrance,
      // so any later one plays forward again.
      if (!reducedMotion.matches) {
        root.classList.add('turn-back');
        setTimeout(() => root.classList.remove('turn-back'), 1500);
      }
      if (!reducedMotion.matches) main.classList.remove('projects-entered');
      craftStage.leave();
      cut(cardStops()[index], -1);
      refresh();
      root.classList.remove('nav-line-leave', 'nav-line-back');
      syncProjectsNav();
      turning = false;
    }, leave ? 360 : 0);
  }
  if (skills) {
    holdPageTurns((direction) => {
      if (direction < 0 || turning || !geometry) return;
      const stops = cardStops();
      if (Math.abs(window.scrollY - stops[stops.length - 1]) <= 2) return 'skills';
    }, turnToSkills, { fresh: true });
    holdPageTurns((direction) => {
      if (direction > 0 || turning || !geometry) return;
      if (Math.abs(window.scrollY - skillsStop()) <= 2) return 'projects';
    }, () => turnToProjects(cards.length - 1), { fresh: true });
    // The top bar's links take the same turns. Projects opens on its first
    // card when asked for by name.
    document.querySelectorAll('.section-nav-link[href="#skills"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        turnToSkills();
      });
    });
    document.querySelectorAll('.section-nav-link[href="#projects"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !onSkills()) return;
        event.preventDefault();
        turnToProjects(0);
      });
    });
  }
  // #projects opens on the first card and #skills on Skills. Both land once
  // the runway has its height, since the browser's own jump came before it did.
  const land = (top) => {
    measure();
    window.scrollTo({ top: top(), behavior: 'instant' });
    refresh();
  };
  sectionLandings['#projects'] = () => land(() => cardStops()[0]);
  if (skills) sectionLandings['#skills'] = () => land(skillsStop);
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
  } else if ((about || skills) && 'IntersectionObserver' in window) {
    // Below About, or with Skills after it, the entrance waits for the reader
    // and replays each time they come back to it, as About's own sections do.
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) main.classList.remove('projects-entered');
      else if (entry.intersectionRatio >= .35) main.classList.add('projects-entered');
    }, { threshold: [0, .35] }).observe(frame);
  } else {
    requestAnimationFrame(() => requestAnimationFrame(() => main.classList.add('projects-entered')));
  }
}
// Every section is in the page from the start. They start in reading order,
// once everything above is defined.
enableSectionScroll();
initAboutContent();
initAboutPages();
initProjectsTrack();
initProjectsNav();
initCraft();
// A section's own address lands on it: now, and again once the webfonts have
// settled the layout, since the browser's own jump came before any of it.
if (landOnSection(location.hash)) document.fonts?.ready.then(() => landOnSection(location.hash));
trackSectionHash();

playIntro();

}
startSite();
