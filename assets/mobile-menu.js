(() =>
  {
    const menu = document.createElement('dialog');
    if(typeof menu.showModal !== 'function') return;

    const root = document.documentElement;
    const phone = matchMedia('(max-width: 700px)');
    const homepage = new URL('../', document.currentScript.src);
    const onIndex = Boolean(document.querySelector('.hero .navigation-panel'));
    const indexURL = onIndex ? new URL(location.href) : homepage;
    const icon = '<span class="menu-icon" aria-hidden="true"><span></span><span></span><span></span></span>';
    const button = document.createElement('button');
    button.className = 'menu-toggle';
    button.type = 'button';
    button.setAttribute('aria-label', 'Open navigation');
    button.setAttribute('aria-controls', 'mobile-menu');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = icon;
    const bar = document.querySelector('.blog-topbar, .project-sheet--page .project-sheet-bar');
    if(bar) bar.append(button);
    else document.querySelector('.resume-close')?.after(button);

    menu.id = menu.className = 'mobile-menu';
    menu.setAttribute('aria-label', 'Navigation');
    menu.innerHTML = `
      <div class="mobile-menu-surface" aria-hidden="true"></div>
      <div class="site-header">
        <div class="menu-bar">
          <span class="menu-bar-name" aria-hidden="true"><span>JOSH</span></span>
          <button class="menu-toggle menu-close" type="button" aria-label="Close navigation">${icon}</button>
        </div>
        <nav class="navigation-panel" aria-label="Site navigation">
          <div class="nav-group"></div>
          <div class="nav-group nav-group-right"></div>
        </nav>
      </div>`;
    const groups = menu.querySelectorAll('.nav-group');
    const destinations = [
      ['Home', '#home'], ['About me', '#about'], ['Projects', '#projects'], ['Skills', '#skills'],
      ['Let’s connect', '#connect'], ['Insights', 'blog'], ['Ask Josh', null]
    ];
    destinations.forEach(([label, href], i) =>
      {
        const link = document.createElement(href ? 'a' : 'span');
        link.className = 'nav-link';
        if(href) link.href = new URL(href, indexURL).href;
        else
          {
            link.setAttribute('role', 'link');
            link.setAttribute('aria-disabled', 'true');
          }
        link.textContent = label;
        groups[i < 4 ? 0 : 1].append(link);
      });
    document.body.append(menu);
    root.classList.add('menu-ready');
    const closeButton = menu.querySelector('.menu-close');
    let opener = null;
    let revision = 0;

    function positionReveal()
      {
        if(!menu.open) return;
        const box = menu.getBoundingClientRect();
        const button = closeButton.getBoundingClientRect();
        const x = button.left + button.width / 2 - box.left;
        const y = button.top + button.height / 2 - box.top;
        const radius = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
        menu.style.setProperty('--menu-reveal-x', x + 'px');
        menu.style.setProperty('--menu-reveal-y', y + 'px');
        menu.style.setProperty('--menu-reveal-radius', Math.ceil(radius) + 1 + 'px');
      }

    function open(trigger)
      {
        if(!phone.matches) return;
        const current = ++revision;
        opener = trigger;
        opener.setAttribute('aria-expanded', 'true');
        const currentURL = new URL(location.href);
        if(onIndex && currentURL.pathname === indexURL.pathname && !currentURL.hash) currentURL.hash = '#home';
        for(const link of menu.querySelectorAll('a'))
          {
            if(link.href === currentURL.href) link.setAttribute('aria-current', link.hash ? 'location' : 'page');
            else link.removeAttribute('aria-current');
          }
        if(!menu.open) menu.showModal();
        root.classList.add('menu-open');
        positionReveal();
        closeButton.focus({ preventScroll: true });
        requestAnimationFrame(() => requestAnimationFrame(() =>
          {
            if(current === revision) menu.classList.add('is-open');
          }));
      }

    async function close(instant = false)
      {
        const current = ++revision;
        opener?.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        if(!instant) await Promise.allSettled(menu.getAnimations({ subtree: true }).map(animation => animation.finished));
        if(current !== revision || !menu.open) return false;
        menu.close();
        root.classList.remove('menu-open');
        if(phone.matches) opener?.focus({ preventScroll: true });
        opener = null;
        return true;
      }

    document.addEventListener('click', event =>
      {
        const trigger = event.target.closest('.menu-toggle[aria-controls="mobile-menu"]');
        if(trigger) open(trigger);
      });
    closeButton.addEventListener('click', () =>
      {
        if(opener?.getAttribute('aria-expanded') === 'false') open(opener);
        else close();
      });
    menu.addEventListener('cancel', event => { event.preventDefault(); close(); });
    menu.addEventListener('click', async event =>
      {
        const link = event.target.closest('a[href]');
        if(!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const url = new URL(link.href);
        const section = onIndex && url.hash && url.pathname === location.pathname && url.search === location.search;
        event.preventDefault();
        if(!await close()) return;
        if(section && !document.dispatchEvent(new CustomEvent('menu-section', { detail: url.hash, cancelable: true }))) return;
        location.assign(url.href);
      });
    document.addEventListener('keydown', () => root.classList.add('menu-keyboard'), true);
    document.addEventListener('pointerdown', () => root.classList.remove('menu-keyboard'), true);
    phone.addEventListener('change', () => { if(!phone.matches && menu.open) close(true); });
    window.addEventListener('resize', positionReveal, { passive: true });
    window.addEventListener('pagehide', () => { if(menu.open) close(true); });
  })();
