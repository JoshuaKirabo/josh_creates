'use strict';

// Placeholder links remain focusable and interactive without navigating.
document.querySelectorAll('[data-placeholder-link]').forEach((link) => {
  link.addEventListener('click', (event) => event.preventDefault());
});

// Content and navigation work without JavaScript. Motion is a small enhancement.
const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

// Each grain has its own anchor, range, phase, and speed. Nothing pans as a layer.
function createGrainParticles(canvas) {
  const context = canvas?.getContext('2d');
  if (!context) return { setPlaying() {} };
  let particles = [];
  let width = 0;
  let height = 0;
  let elapsed = 0;
  let frame = null;
  let previousTime = 0;
  let playing = false;

  function draw() {
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#fff';
    for (const grain of particles) {
      const x = grain.x * width + Math.sin(elapsed * grain.speedX + grain.phaseX) * grain.rangeX;
      const y = grain.y * height + Math.sin(elapsed * grain.speedY + grain.phaseY) * grain.rangeY;
      context.globalAlpha = grain.alpha;
      context.fillRect(x, y, grain.size, grain.size);
    }
    context.globalAlpha = 1;
  }

  function resize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(3600, Math.round(width * height / 320));
    particles.length = Math.min(particles.length, count);
    while (particles.length < count) {
      particles.push({
        x: Math.random(), y: Math.random(),
        phaseX: Math.random() * Math.PI * 2, phaseY: Math.random() * Math.PI * 2,
        speedX: .7 + Math.random() * 1.2, speedY: .65 + Math.random() * 1.1,
        rangeX: 14 + Math.random() * 26, rangeY: 12 + Math.random() * 22,
        size: 1 + Math.random() * .8, alpha: .26 + Math.random() * .28
      });
    }
    draw();
  }

  function tick(now) {
    frame = null;
    if (!playing) return;
    if (!previousTime) previousTime = now;
    // Draw at the display cadence so the wider particle travel stays smooth.
    elapsed += Math.min(now - previousTime, 64) / 1000;
    previousTime = now;
    draw();
    frame = requestAnimationFrame(tick);
  }

  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
  else window.addEventListener('resize', resize, { passive: true });
  return {
    setPlaying(value) {
      if (playing === value) return;
      playing = value;
      previousTime = 0;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = playing ? requestAnimationFrame(tick) : null;
    }
  };
}

const grainParticles = createGrainParticles(hero.querySelector('.grain-particles'));
const increasedContrast = window.matchMedia('(prefers-contrast: more)');
let heroIsVisible = true;
function syncAmbientMotion() {
  const playing = heroIsVisible && !document.hidden && !reducedMotion.matches && !increasedContrast.matches;
  hero.dataset.ambientMotion = playing ? 'playing' : 'paused';
  grainParticles.setPlaying(playing);
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
  grainParticles.setPlaying(false);
  hero.dataset.ambientMotion = 'paused';
});
window.addEventListener('pageshow', syncAmbientMotion);
reducedMotion.addEventListener('change', syncAmbientMotion);
increasedContrast.addEventListener('change', syncAmbientMotion);
syncAmbientMotion();

// Text scrambles into its final position on the shared entrance clock.
async function playIntro() {
  const root = document.documentElement;
  if (!root.classList.contains('intro-pending')) return;

  const wordmark = hero.querySelector('.wordmark');
  const animations = [];
  let clone;
  let finished = false;
  let readyTimeout;
  const scrambleTimers = [];
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(window.introFallback);
    clearTimeout(readyTimeout);
    scrambleTimers.forEach(clearTimeout);
    introScrambles.forEach((effect) => effect.reset());
    root.classList.remove('intro-pending');
    animations.forEach((animation) => animation.cancel());
    clone?.remove();
    ['resize', 'pagehide', 'wheel', 'touchstart', 'keydown', 'focusin'].forEach((event) => {
      window.removeEventListener(event, finish);
    });
    reducedMotion.removeEventListener('change', finish);
  };

  // Any deliberate interaction can skip the intro. History restores keep their position.
  ['resize', 'pagehide', 'wheel', 'touchstart', 'keydown', 'focusin'].forEach((event) => {
    window.addEventListener(event, finish, { passive: true });
  });
  reducedMotion.addEventListener('change', finish);
  clearTimeout(window.introFallback);
  window.introFallback = setTimeout(finish, 8000);

  try {
    const portrait = hero.querySelector('.portrait');
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

    // Sample the exact power eases; linear() interpolates between these samples.
    const powerEase = (power, inOut = false) => {
      const values = Array.from({ length: 81 }, (_, index) => {
        const t = index / 80;
        return inOut
          ? (t < .5 ? Math.pow(2 * t, power) / 2 : 1 - Math.pow(2 * (1 - t), power) / 2)
          : 1 - Math.pow(1 - t, power);
      });
      const easing = `linear(${values.join(',')})`;
      return CSS.supports('animation-timing-function', easing)
        ? easing : (inOut ? 'cubic-bezier(.65, 0, .35, 1)' : 'cubic-bezier(.215, .61, .355, 1)');
    };
    const easeOut = powerEase(3);
    // All animations share one clock, including the reference's 200 ms lead-in.
    const startTime = document.timeline.currentTime + 200;
    const animate = (element, keyframes, delay, duration, easing = easeOut) => {
      const animation = element.animate(keyframes, { duration, delay, easing, fill: 'both' });
      animation.startTime = startTime;
      animations.push(animation);
      return animation;
    };
    const reveal = (element, delay, duration, scale = 1, blur = 0) => animate(element, [
      { opacity: 0, scale: String(scale), filter: `blur(${blur}px)` },
      { opacity: 1, scale: '1', filter: 'blur(0px)' }
    ], delay, duration);

    const scrambleIn = (label, delay, fadeDuration = 0) => {
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
      { translate: `${window.innerWidth}px ${centerY}px`, offset: 0, easing: powerEase(4, true) },
      { translate: `${centerX}px ${centerY}px`, offset: .5, easing: powerEase(3, true) },
      { translate: '0px 0px', offset: 1 }
    ], 0, 2000, 'linear');
    clone.querySelectorAll('.intro-letter').forEach((letter, index) => {
      animate(letter, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], index * 200, 1000, powerEase(4));
    });
    animate(wordmark, [{ opacity: 0 }, { opacity: 1 }], 2000, 1);
    animate(clone, [{ opacity: 1 }, { opacity: 0 }], 2000, 1);
    reveal(hero.querySelector('.portrait-stage'), 1400, 1100);
    hero.querySelectorAll('.hero-heading-line').forEach((line, index) => {
      reveal(line, 1700 + index * 100, 1000, .9, 10);
    });
    reveal(hero.querySelector('.site-header'), 2000, 700);
    hero.querySelectorAll('.nav-label').forEach((label) => scrambleIn(label, 2000));
    reveal(hero.querySelector('.hero-content .button'), 2650, 800, .94, 10);
    scrambleIn(hero.querySelector('.signature'), 3050, 700);
    hero.querySelectorAll('.hero-footer > :not(.signature)').forEach((element, index) => {
      reveal(element, 3150 + index * 100, 400);
    });
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
  link.addEventListener('focus', () => {
    if (link.matches(':focus-visible')) scramble();
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
