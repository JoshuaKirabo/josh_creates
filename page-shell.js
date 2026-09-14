'use strict';

// Each page owns its markup. Joining them before motion starts preserves the
// continuous, reversible scroll experience; ordinary links are the fallback.
window.sitePagesReady = (async () => {
  const main = document.querySelector('main[data-entry-page]');
  const fromAbout = main.dataset.entryPage === 'about';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(fromAbout ? 'index.html' : 'about_me.html', {
      signal: controller.signal
    });
    if (!response.ok) throw new Error('Page unavailable');
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    const section = page.querySelector(fromAbout ? '#home' : '#about');
    if (!section) throw new Error('Page content unavailable');
    if (fromAbout) {
      const runway = page.querySelector('.hero-runway');
      const menu = page.querySelector('.mobile-menu');
      if (!runway || !menu) throw new Error('Home layout unavailable');
      main.prepend(document.importNode(section, true), document.importNode(runway, true));
      document.body.append(document.importNode(menu, true));
    } else {
      main.append(document.importNode(section, true));
    }
  } catch {
    // This also covers file://, offline visits and interrupted requests. Both
    // documents stay readable and their links continue as native navigation.
  } finally {
    clearTimeout(timeout);
  }
})();
