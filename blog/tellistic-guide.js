(() => {
  const diagram = document.querySelector('#tellistic-arch');
  const section = diagram.closest('.project-how');
  const animation = diagram.querySelector('source[data-animation]');
  const motionPreference = animation.media;
  const guide = document.querySelector('.pipeline-guide');
  const steps = [...guide.querySelectorAll('[data-start]')];
  const starts = steps.map(step => Number(step.dataset.start));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const navigation = guide.querySelector('nav');
  const previous = navigation.querySelector('[data-previous]');
  const next = navigation.querySelector('[data-next]');
  const title = guide.querySelector('.arch-stage-title');
  const technologies = guide.querySelectorAll('.arch-stage-type [data-technology]');
  const count = guide.querySelector('.arch-count');
  let current = 0;
  let frame;
  let inView = false;

  function showAction(index) {
    if (!Number.isInteger(index) || !steps[index]) return;
    steps[current].setAttribute('aria-hidden', 'true');
    current = index;
    steps[current].removeAttribute('aria-hidden');
    title.textContent = steps[current].dataset.title;
    for (const label of technologies) {
      label.setAttribute('aria-hidden', String(label.dataset.technology !== steps[current].dataset.technology));
    }
    count.textContent = String(current + 1).padStart(2, '0');
  }

  function moveBy(offset) {
    showAction((current + offset + steps.length) % steps.length);
    updatePlayback(starts[current]);
  }

  previous.addEventListener('click', () => moveBy(-1));
  next.addEventListener('click', () => moveBy(1));
  navigation.hidden = false;

  function updatePlayback(seekTo) {
    // Let the project's scroll entrance finish before the first payload moves.
    const revealed = !section.classList.contains('how-motion') ||
      section.matches('.is-entered:not(.is-drawing):not(.is-leaving)');
    const playing = inView && revealed && !document.hidden;
    const drawing = section.matches('.is-entered.is-drawing:not(.is-leaving)');
    frame?.contentWindow?.postMessage({type: 'tellistic-playback', starts, playing, drawing, seekTo}, '*');
  }

  function updateMotionPreference() {
    frame?.remove();
    frame = null;
    animation.media = motionPreference;
    showAction(0);
    if (reduced.matches) return;
    frame = document.createElement('iframe');
    frame.className = 'pipeline-frame';
    frame.src = animation.getAttribute('srcset');
    frame.style.visibility = 'hidden';
    frame.title = 'Animated survey pipeline';
    frame.tabIndex = -1;
    // The underlying picture supplies the full accessible diagram description.
    frame.setAttribute('aria-hidden', 'true');
    diagram.append(frame);
  }

  window.addEventListener('message', event => {
    if (!frame || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'tellistic-ready') updatePlayback(starts[current]);
    if (event.data?.type !== 'tellistic-stage') return;
    // Show the synchronized frame only after its clock answers. Until then
    // the picture can play the SVG itself, including on a local-file preview.
    if (frame.style.visibility === 'hidden') {
      frame.style.visibility = 'visible';
      animation.media = 'not all';
    }
    showAction(event.data.stage);
  });

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updatePlayback();
  }).observe(section);
  new MutationObserver(() => updatePlayback()).observe(section, {
    attributes: true,
    attributeFilter: ['class'],
  });
  document.addEventListener('visibilitychange', () => updatePlayback());
  reduced.addEventListener('change', updateMotionPreference);
  updateMotionPreference();
})();
