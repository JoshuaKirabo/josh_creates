'use strict';

// Content and navigation work without JavaScript. Motion is a small enhancement.
const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let frame = 0;

function resetMotion() {
  hero.style.removeProperty('--portrait-x');
  hero.style.removeProperty('--card-x');
  hero.style.removeProperty('--card-y');
}

hero.addEventListener('pointermove', (event) => {
  if (reducedMotion.matches || !finePointer.matches) return;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    hero.style.setProperty('--portrait-x', `${x * 8}px`);
    hero.style.setProperty('--card-x', `${x * -15}px`);
    hero.style.setProperty('--card-y', `${y * -10}px`);
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
