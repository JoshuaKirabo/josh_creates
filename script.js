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

// Roll each word upward once per entry, keeping a stable accessible link name.
const navAnimations = new Map();
document.querySelectorAll('.nav-link').forEach((link) => {
  const label = link.querySelector('.nav-label');
  if (!label || typeof label.animate !== 'function') return;

  const text = label.textContent;
  link.setAttribute('aria-label', text.trim());
  label.setAttribute('aria-hidden', 'true');
  const words = [];
  label.replaceChildren(...text.split(/(\s+)/).map((part) => {
    if (/^\s+$/.test(part)) return document.createTextNode(part);
    const word = document.createElement('span');
    word.className = 'nav-word';
    word.textContent = part;
    word.dataset.word = part;
    words.push(word);
    return word;
  }));

  function rollWords() {
    if (reducedMotion.matches) return;
    // Let quick re-entry finish the current roll without snapping the text.
    if (navAnimations.get(link)?.some((animation) => animation.playState === 'running')) return;
    navAnimations.set(link, words.map((word, index) => word.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
      { duration: 500, delay: index * 50, easing: 'cubic-bezier(.215, .61, .355, 1)' }
    )));
  }

  link.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch' && finePointer.matches) rollWords();
  });
  link.addEventListener('focus', () => {
    if (link.matches(':focus-visible')) rollWords();
  });
});
reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) return;
  navAnimations.forEach((animations) => animations.forEach((animation) => animation.cancel()));
  navAnimations.clear();
});
