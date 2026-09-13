'use strict';

// Content and navigation work without JavaScript. Motion is a small enhancement.
const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let frame = 0;

function resetMotion() {
  hero.style.removeProperty('--portrait-x');
}

hero.addEventListener('pointermove', (event) => {
  if (reducedMotion.matches || !finePointer.matches) return;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    hero.style.setProperty('--portrait-x', `${x * 8}px`);
  });
});
hero.addEventListener('pointerleave', () => {
  cancelAnimationFrame(frame);
  resetMotion();
});
reducedMotion.addEventListener('change', resetMotion);
finePointer.addEventListener('change', resetMotion);

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
