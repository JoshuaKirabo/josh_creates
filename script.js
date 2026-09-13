'use strict';

// Content and navigation work without JavaScript. Motion is a small enhancement.
const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

// Same entrance choreography as the reference, using the browser animation API.
async function playIntro() {
  const root = document.documentElement;
  if (!root.classList.contains('intro-pending')) return;

  const wordmark = hero.querySelector('.wordmark');
  const animations = [];
  let clone;
  let finished = false;
  let readyTimeout;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(window.introFallback);
    clearTimeout(readyTimeout);
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

    // A temporary copy lets the letters rise without changing the final typography.
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

    // Move the full-size name in, then lift it into its existing position.
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

    const stage = hero.querySelector('.portrait-stage');
    // Fade the portrait in at its final size and position.
    animate(stage, [{ opacity: 0 }, { opacity: 1 }], 1400, 1100);
    hero.querySelectorAll('.hero-heading-line').forEach((line, index) => {
      reveal(line, 1700 + index * 100, 1000, .9, 10);
    });
    reveal(hero.querySelector('.site-header'), 2000, 400);
    hero.querySelectorAll('.nav-label').forEach((label) => {
      // translate is separate from the word transforms used by the hover animation.
      animate(label, [{ clipPath: 'inset(100% 0 0)', translate: '0 100%' },
        { clipPath: 'inset(0% 0 0)', translate: '0 0%' }], 2000, 400);
    });
    hero.querySelectorAll('.nav-divider').forEach((divider) => {
      animate(divider, [{ scale: '1 0' }, { scale: '1 1' }], 2000, 200);
    });
    reveal(hero.querySelector('.hero-content .button'), 2650, 800, .94, 10);
    hero.querySelectorAll('.hero-footer > *').forEach((element, index) => {
      animate(element, [
        { opacity: 0, translate: '0 100%', filter: 'blur(6px)' },
        { opacity: 1, translate: '0 0%', filter: 'blur(0px)' }
      ], 3050 + index * 100, 700);
    });
    await Promise.all(animations.map((animation) => animation.finished));
    finish();
  } catch {
    // A failed asset or interrupted animation must never leave content hidden.
    finish();
  }
}
playIntro();

document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

// Kisaka's service headings: a short scramble radiates from the entry point.
// The original text keeps its exact typography and accessible name throughout.
const resetHoverEffects = [];
document.querySelectorAll('.nav-link').forEach((link) => {
  const label = link.querySelector('.nav-label');
  if (!label) return;
  const text = label.textContent;
  if (link.matches('a, button')) {
    link.setAttribute('aria-label', text.trim());
    label.setAttribute('aria-hidden', 'true');
  }
  const copy = document.createElement('span');
  copy.className = 'scramble-text';
  copy.textContent = text;
  const layer = document.createElement('span');
  layer.className = 'scramble-layer';
  layer.setAttribute('aria-hidden', 'true');
  label.replaceChildren(copy, layer);
  let frame;

  function reset() {
    cancelAnimationFrame(frame);
    frame = null;
    label.classList.remove('is-scrambling');
    layer.replaceChildren();
  }
  resetHoverEffects.push(reset);

  function scramble(event) {
    if (reducedMotion.matches) return;
    reset();
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
  link.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch' && finePointer.matches) scramble(event);
  });
  link.addEventListener('focus', () => {
    if (link.matches(':focus-visible')) scramble();
  });
});

// Kisaka's descriptions roll word by word behind a mask, including on focus.
document.querySelectorAll('.button-label').forEach((label) => {
  const text = label.textContent;
  label.closest('a').setAttribute('aria-label', text.trim());
  label.setAttribute('aria-hidden', 'true');
  let wordIndex = 0;
  label.replaceChildren(...text.split(/(\s+)/).map((part) => {
    if (/^\s+$/.test(part)) return document.createTextNode(part);
    const clip = document.createElement('span');
    clip.className = 'button-roll-word';
    clip.style.setProperty('--roll-delay', `${Math.min(wordIndex++ * 22, 176)}ms`);
    const track = document.createElement('span');
    track.className = 'button-roll-track';
    for (let index = 0; index < 2; index++) {
      const copy = document.createElement('span');
      copy.textContent = part;
      track.appendChild(copy);
    }
    clip.appendChild(track);
    return clip;
  }));
});

function resetHoverMotion() {
  resetHoverEffects.forEach((reset) => reset());
}
window.addEventListener('resize', resetHoverMotion, { passive: true });
window.addEventListener('pagehide', resetHoverMotion);
reducedMotion.addEventListener('change', resetHoverMotion);
finePointer.addEventListener('change', resetHoverMotion);
document.fonts?.ready.then(resetHoverMotion);
