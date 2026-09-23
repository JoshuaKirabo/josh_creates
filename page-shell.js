'use strict';

// Each page owns its markup. Joining them before motion starts preserves the
// continuous, reversible scroll experience; ordinary links are the fallback.
async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('Page unavailable');
    return new DOMParser().parseFromString(await response.text(), 'text/html');
  } finally {
    clearTimeout(timeout);
  }
}

window.sitePagesReady = (async () => {
  const main = document.querySelector('main[data-entry-page]');
  const fromAbout = main.dataset.entryPage === 'about';
  // Both fetches start together; Projects waits only for About to be in place.
  const projectsPage = fetchPage('projects.html').catch(() => null);
  try {
    const page = await fetchPage(fromAbout ? 'index.html' : 'about_me.html');
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
  }
  // Projects continues straight on from Education, under About's own top bar
  // and above its footer, so the page scrolls on into it.
  try {
    const page = await projectsPage;
    const about = document.querySelector('#about');
    const footer = about?.querySelector(':scope > .about-footer:not(.about-footer-fold)');
    const projects = page?.querySelector('#projects-main');
    const sprite = page?.querySelector('.project-logo-sprite');
    if (!footer || !projects || !sprite) return;
    document.body.prepend(document.importNode(sprite, true));
    footer.before(document.importNode(projects, true));
  } catch {
    // The Projects link still opens its own page.
  }
})();
