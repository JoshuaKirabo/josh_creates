'use strict';

// Placeholder links remain focusable and interactive without navigating.
document.querySelectorAll('[data-placeholder-link]').forEach((link) => {
  link.addEventListener('click', (event) => event.preventDefault());
});

// Content and navigation work without JavaScript. Motion is a small enhancement.
const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

// Touch feedback follows contact, while native scrolling and click timing stay intact.
function enableTouchFeedback() {
  const root = document.documentElement;
  const controls = '.button, .menu-toggle, .nav-link, .social-link, .text-link';
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
  document.documentElement.classList.add('menu-ready');

  function restoreNavigation() {
    homePosition.after(navigationPanel);
    mobileMenu.close();
    document.documentElement.classList.remove('menu-open');
    if (mobileNavigation.matches) menuToggle.focus({ preventScroll: true });
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
      menuClose.focus({ preventScroll: true });
      // Flush the actual animated properties after showModal. A layout read on
      // the dialog alone does not reliably establish descendant styles in Safari.
      mobileMenu.querySelectorAll('.mobile-menu-surface, .menu-icon > span, .nav-link').forEach((element) => {
        const style = getComputedStyle(element);
        void style.opacity;
        void style.transform;
      });
    }
    mobileMenu.classList.toggle('is-open', open);
    if (open || !mobileMenu.open) return;
    if (!instant) {
      // Keep the toggle available throughout exit; reopening cancels this completion.
      await Promise.allSettled(mobileMenu.getAnimations({ subtree: true }).map(animation => animation.finished));
    }
    if (currentRevision === revision && !menuOpen) restoreNavigation();
  }

  function toggleMenu(event) {
    document.documentElement.classList.toggle('menu-keyboard', event.detail === 0);
    setMenuOpen(!menuOpen);
  }
  menuToggle.addEventListener('click', toggleMenu);
  menuClose.addEventListener('click', toggleMenu);
  mobileMenu.addEventListener('cancel', (event) => {
    event.preventDefault();
    setMenuOpen(false);
  });
  navigationPanel.addEventListener('click', (event) => {
    if (event.target.closest('a') && mobileMenu.open) setMenuOpen(false);
  });
  document.addEventListener('keydown', () => document.documentElement.classList.add('menu-keyboard'), true);
  document.addEventListener('pointerdown', () => document.documentElement.classList.remove('menu-keyboard'), true);
  mobileNavigation.addEventListener('change', () => {
    if (!mobileNavigation.matches) setMenuOpen(false, true);
  });
}

// Paint the grain once. Only sparse particle layers move; the fine texture stays anchored.
function createGrainParticles(container) {
  if (!container) return { setPlaying() {} };
  const overscan = 24;
  const drifts = [
    { radius: 8, duration: 12000, phase: 0, direction: 1 },
    { radius: 12, duration: 14000, phase: 95, direction: -1 },
    { radius: 16, duration: 16000, phase: 205, direction: 1 },
    { radius: 10, duration: 18000, phase: 290, direction: -1 }
  ];
  const layers = [null, ...drifts].map((drift) => {
    const canvas = document.createElement('canvas');
    canvas.className = drift ? 'grain-surface grain-drift' : 'grain-surface';
    return { canvas, context: canvas.getContext('2d'), drift,
      seed: (Math.random() * 0xffffffff) >>> 0 || 1 };
  });
  if (layers.some((layer) => !layer.context)) return { setPlaying() {} };
  container.replaceChildren(...layers.map((layer) => layer.canvas));

  let width = 0;
  let height = 0;
  let highDetail;
  let playing = false;
  let rampFrame = null;
  let rampStarted = null;
  const animations = [];
  const omega = 2 * Math.PI / .3; // Critically damped speed, response 0.3 s, no overshoot.

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
    const nextWidth = hero.clientWidth;
    // Reserve the touch screen's full height so Safari's toolbar does not rebuild
    // the grain as it expands and collapses. The container clips the spare area.
    const nextHeight = nextHighDetail ? hero.clientHeight :
      Math.max(hero.clientHeight, window.screen?.height || 0);
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

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
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
    }
  };
}

// Independent, critically damped X/Y springs preserve velocity when the cursor reverses.
function createCursorGlow(glow) {
  if (!glow) return { setActive() {} };
  const position = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  const omega = 2 * Math.PI / .4; // Apple-style response 0.4 s, damping ratio 1.
  let active = false;
  let frame = null;
  let previousTime = 0;

  function paint() {
    glow.style.transform = `translate3d(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px), 0)`;
  }
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
      if (Math.abs(position[axis] - target[axis]) > .1 || Math.abs(velocity[axis]) > .1) settled = false;
    }
    if (settled) {
      position.x = target.x;
      position.y = target.y;
      velocity.x = velocity.y = 0;
    }
    paint();
    if (!settled) frame = requestAnimationFrame(tick);
  }
  function wake() {
    if (!active || frame !== null) return;
    previousTime = 0;
    frame = requestAnimationFrame(tick);
  }
  function recenter() {
    target.x = target.y = 0;
    wake();
  }
  hero.addEventListener('pointermove', (event) => {
    if (!active || event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    target.x = event.clientX - bounds.left - bounds.width / 2;
    target.y = event.clientY - bounds.top - bounds.height / 2;
    wake();
  }, { passive: true });
  hero.addEventListener('pointerleave', recenter, { passive: true });
  window.addEventListener('blur', recenter);
  window.addEventListener('resize', recenter, { passive: true });
  return {
    setActive(value) {
      if (active === value) return;
      active = value;
      if (!active) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        position.x = position.y = target.x = target.y = velocity.x = velocity.y = 0;
        paint();
      }
    }
  };
}

const grainParticles = createGrainParticles(hero.querySelector('.grain-particles'));
const cursorGlow = createCursorGlow(hero.querySelector('.ambient-light'));
const increasedContrast = window.matchMedia('(prefers-contrast: more)');
let heroIsVisible = true;
let pageIsActive = true;
function syncAmbientMotion() {
  // Prepainted layers can drift during the entrance without a canvas render loop.
  const playing = heroIsVisible && pageIsActive && !document.hidden && !reducedMotion.matches &&
    !increasedContrast.matches;
  hero.dataset.ambientMotion = playing ? 'playing' : 'paused';
  grainParticles.setPlaying(playing);
  cursorGlow.setActive(playing && finePointer.matches && !document.documentElement.classList.contains('intro-pending'));
}
if ('IntersectionObserver' in window) {
  const ambientVisibility = new IntersectionObserver(([entry]) => {
    heroIsVisible = entry.isIntersecting;
    syncAmbientMotion();
  });
  ambientVisibility.observe(hero);
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

// Transform and opacity reveals share one entrance clock.
async function playIntro() {
  const root = document.documentElement;
  if (!root.classList.contains('intro-pending')) return;

  const wordmark = hero.querySelector('.wordmark');
  const animations = [];
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const skipEvents = ['orientationchange', 'pagehide', 'wheel', 'touchstart', 'keydown', 'focusin'];
  let clone;
  let finished = false;
  let readyTimeout;
  let socialTimer;
  const scrambleTimers = [];
  const revealSocials = (instant = false) => {
    if (!root.classList.contains('socials-pending')) return;
    root.classList.toggle('socials-instant', instant);
    root.classList.add('socials-revealing');
    root.classList.remove('socials-pending');
    setTimeout(() => root.classList.remove('socials-revealing'), 300);
  };
  const finish = (event) => {
    if (finished) return;
    finished = true;
    clearTimeout(window.introFallback);
    clearTimeout(readyTimeout);
    clearTimeout(socialTimer);
    scrambleTimers.forEach(clearTimeout);
    introScrambles.forEach((effect) => effect.reset());
    root.classList.remove('intro-pending');
    revealSocials(event?.type === 'keydown' || event?.type === 'focusin' || event?.type === 'pagehide');
    animations.forEach((animation) => animation.cancel());
    clone?.remove();
    skipEvents.forEach((event) => {
      window.removeEventListener(event, finish);
    });
    window.removeEventListener('resize', onResize);
    reducedMotion.removeEventListener('change', finish);
    syncAmbientMotion();
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

    // Preserve the original JOSH entrance with rising letters and a moving wordmark.
    clone = wordmark.cloneNode(false);
    clone.classList.add('intro-wordmark');
    clone.replaceChildren(...Array.from(wordmark.textContent, (letter) => {
      const span = document.createElement('span');
      span.className = 'intro-letter';
      span.textContent = letter;
      return span;
    }));
    wordmark.after(clone);
    const bounds = wordmark.getBoundingClientRect();
    const centerX = window.innerWidth / 2 - (bounds.left + bounds.width / 2);
    const centerY = window.innerHeight / 2 - (bounds.top + bounds.height / 2);

    // Sampled linear() eases fall back to main-thread animation on older Safari.
    // Reuse the CSS curves and animate complete transforms on every browser.
    const rootStyle = getComputedStyle(root);
    const easeOut = rootStyle.getPropertyValue('--ease-out').trim();
    const easeInOut = rootStyle.getPropertyValue('--ease-in-out').trim();
    const wordmarkTransform = getComputedStyle(wordmark).transform;
    // All animations share one clock, including the reference's 200 ms lead-in.
    const startTime = document.timeline.currentTime + 200;
    const animate = (element, keyframes, delay, duration, easing = easeOut) => {
      const animation = element.animate(keyframes, { duration, delay, easing, fill: 'both' });
      animation.startTime = startTime;
      animations.push(animation);
      return animation;
    };
    const reveal = (element, delay, duration, scale = 1) => animate(element,
      scale === 1 ? [{ opacity: 0 }, { opacity: 1 }] : [
        { opacity: 0, transform: `scale(${scale})` },
        { opacity: 1, transform: 'scale(1)' }
      ], delay, duration);

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
    animate(clone, [
      { transform: `translate3d(${window.innerWidth}px, ${centerY}px, 0) ${wordmarkTransform}`, offset: 0, easing: easeInOut },
      { transform: `translate3d(${centerX}px, ${centerY}px, 0) ${wordmarkTransform}`, offset: .5, easing: easeInOut },
      { transform: `translate3d(0, 0, 0) ${wordmarkTransform}`, offset: 1 }
    ], 0, 2000, 'linear');
    clone.querySelectorAll('.intro-letter').forEach((letter, index) => {
      animate(letter, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], index * 200, 1000);
    });
    animate(wordmark, [{ opacity: 0 }, { opacity: 1 }], 2000, 1);
    animate(clone, [{ opacity: 1 }, { opacity: 0 }], 2000, 1);
    reveal(hero.querySelector('.portrait-stage'), 1400, 1100);
    hero.querySelectorAll('.hero-heading-line').forEach((line, index) => {
      reveal(line, 1700 + index * 100, 1000, .9);
    });
    reveal(hero.querySelector('.site-header'), 2000, 700);
    hero.querySelectorAll('.nav-label').forEach((label) => scrambleIn(label, 2000));
    reveal(hero.querySelector('.hero-content .button'), 2650, 800, .94);
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
hero.querySelectorAll('.hero-heading-line, .nav-label, .signature').forEach((label) => {
  label.classList.add('scramble-label');
  introScrambles.set(label, createScramble(label));
});
document.querySelectorAll('.nav-link').forEach((link) => {
  const label = link.querySelector('.nav-label');
  if (!label) return;
  if (link.matches('a, button')) {
    link.setAttribute('aria-label', label.textContent.trim());
    label.setAttribute('aria-hidden', 'true');
  }
  const { scramble } = introScrambles.get(label);
  link.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch' && finePointer.matches) scramble(event);
  });
});

function resetHoverMotion() {
  resetHoverEffects.forEach((reset) => reset());
}
window.addEventListener('resize', resetHoverMotion, { passive: true });
window.addEventListener('pagehide', resetHoverMotion);
reducedMotion.addEventListener('change', resetHoverMotion);
finePointer.addEventListener('change', resetHoverMotion);
document.fonts?.ready.then(resetHoverMotion);

playIntro();
