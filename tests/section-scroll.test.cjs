const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(new URL('../script.js', `file://${__filename}`), 'utf8');
const springSource = source.slice(source.indexOf('function createSpring2D('), source.indexOf('// Paint the grain once.'));
const sectionSource = source.slice(source.indexOf('function enableSectionScroll()'), source.indexOf('// Transform and opacity reveals'));

// The hero is pinned for its own height plus the runway, so the fold scrubs
// across 1000px of scroll before About's layout position reaches the top.
const BOUNDARY = 1000;
const rect = (left, top, width, height) => ({ left, top, width, height });

function setup(reduce = false, initialHash = '', entryPage = 'home') {
  let now = 1, frameId = 0;
  const frames = new Map(), events = { window: {}, document: {} };
  class Element {
    constructor() {
      this.style = {}; this.attrs = {}; this.parentElement = null;
      this.scrollHeight = this.clientHeight = 0; this.scrollTop = 0;
      this.children = {}; this.box = rect(0, 0, 0, 0);
      const classes = new Set();
      this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x),
        toggle: (x, on) => (on ?? !classes.has(x)) ? classes.add(x) : classes.delete(x) };
    }
    closest() { return null; }
    matches() { return false; }
    querySelector(selector) { return this.children[selector] || null; }
    querySelectorAll(selector) { return this.children[selector] || []; }
    // The hero is pinned, so its boxes are already in viewport space. About is
    // in flow, so its boxes follow the scroll the way the real ones do.
    getBoundingClientRect() {
      return this.inFlow ? { ...this.box, top: this.box.top - window.scrollY } : this.box;
    }
    inkRect() { return this.ink ? (this.inFlow ? { ...this.ink, top: this.ink.top - window.scrollY } : this.ink) : this.getBoundingClientRect(); }
    setAttribute(k, v) { this.attrs[k] = v; }
    getAttribute(k) { return this.attrs[k]; }
    hasAttribute(k) { return k in this.attrs; }
    removeAttribute(k) { delete this.attrs[k]; }
    focus() { this.focused = true; }
  }
  const make = (box, ink, inFlow) => {
    const element = new Element();
    if (box) element.box = box;
    if (ink) element.ink = ink;
    if (inFlow) element.inFlow = true;
    return element;
  };

  const root = new Element(), hero = new Element(), about = new Element(), body = new Element();
  const intro = new Element(), portrait = new Element();

  // A 1440x900 hero, pinned, with its name and two links travelling into the
  // sidebar boxes that sit BOUNDARY further down the document.
  const stage = make(rect(0, 0, 1440, 900));
  const heroName = make(rect(19, 8, 1403, 396), rect(120, -73, 1200, 557));
  const heroLinks = [
    make(rect(40, 390, 66, 44)),
    make(rect(1230, 390, 170, 44))
  ];
  const heroLabels = heroLinks.map((link, i) => {
    const label = make(null, i ? rect(1230, 400, 170, 23) : rect(40, 400, 66, 23));
    link.children['.nav-label'] = label;
    return label;
  });
  const sidebarName = make(rect(6, 1034, 66, 35), rect(15, 1043, 47, 18), true);
  const sidebarLinks = [rect(38, 1230, 42, 18), rect(38, 1280, 113, 18)].map((ink) => {
    const link = make(rect(4, ink.top - 13, 85, 44), null, true);
    link.children.span = make(null, ink, true);
    link.children.span.inFlow = true;
    link.children.svg = make(rect(12, ink.top, 16, 16), null, true);
    link.children.svg.inFlow = true;
    return link;
  });

  about.offsetTop = BOUNDARY;
  about.children['.sidebar-wordmark'] = sidebarName;
  about.children['.section-nav-link'] = sidebarLinks;
  hero.children['.wordmark-stage'] = stage;
  hero.children['.wordmark'] = heroName;
  hero.children['.portrait-scroll'] = portrait;
  hero.children['.nav-link'] = heroLinks;
  hero.children['.menu-toggle, .nav-link'] = heroLinks;

  const on = (type, name, fn) => (events[type][name] ||= []).push(fn);
  const window = { scrollY: 0, innerHeight: 900, scrollTo({ top }) { this.scrollY = top; }, addEventListener: (name, fn) => on('window', name, fn) };
  const document = { documentElement: root, body, querySelector: selector => selector === '#about' ? about : selector === 'main' ? { dataset: { entryPage } } : intro,
    querySelectorAll: () => [], addEventListener: (name, fn) => on('document', name, fn),
    createRange() {
      let node = null;
      return { selectNodeContents(element) { node = element; }, getBoundingClientRect: () => node.inkRect() };
    } };
  const context = { window, document, hero, Element, mobileMenu: null,
    reducedMotion: { matches: reduce, addEventListener: (name, fn) => on('window', 'motionchange', fn) }, heroIsVisible: true,
    syncAmbientMotion() {}, getComputedStyle: node => ({ overflowY: node.overflowY || 'visible' }),
    URL, location: { hash: initialHash, href: 'https://example.test/index.html' + initialHash },
    history: { pushState(state, title, href) { context.location.hash = new URL(href, context.location.href).hash; context.location.href = new URL(href, context.location.href).href; } }, performance: { now: () => now },
    requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: id => frames.delete(id) };
  vm.runInNewContext(springSource + sectionSource, context);

  function advance(ms = 1500) {
    const end = now + ms;
    while (now < end) {
      now += 16;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    }
  }
  function dispatch(type, name, values = {}) {
    const event = { target: body, deltaX: 0, deltaY: 0, deltaMode: 0, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, ...values };
    (events[type][name] || []).forEach(fn => fn(event));
    return event;
  }
  // Scrolling belongs to the browser; the page only reacts to the position.
  function scrollTo(y) {
    window.scrollY = y;
    dispatch('window', 'scroll');
    advance(16);
  }
  // Where a travelling element's glyphs actually end up, from its written
  // transform, resolved about its own box the way transform-origin: 0 0 does.
  function inkCentreOf(mover, ink) {
    const parsed = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px, 0\) scale\(([\d.]+)\)/.exec(mover.style.transform || '');
    assert.ok(parsed, `expected a fold transform, got ${JSON.stringify(mover.style.transform)}`);
    const [x, y, scale] = parsed.slice(1).map(Number);
    const origin = mover.box;
    return [
      origin.left + (ink.left + ink.width / 2 - origin.left) * scale + x,
      origin.top + (ink.top + ink.height / 2 - origin.top) * scale + y
    ];
  }
  const targetCentre = (element) => {
    const box = element.inkRect();
    return [box.left + box.width / 2, box.top + box.height / 2];
  };

  return { window, root, hero, about, stage, heroName, heroLinks, heroLabels, sidebarName, sidebarLinks,
    Element, advance, dispatch, scrollTo, inkCentreOf, targetCentre, context,
    click: (hash, values = {}) => {
      const link = new Element();
      link.hash = hash;
      link.href = hash === '#about' ? 'about_me.html#about' : 'index.html#home';
      link.attrs.href = link.href;
      Object.assign(link, values);
      link.closest = () => link;
      dispatch('document', 'pointerdown', { target: link, button: 0, pointerType: 'mouse' });
      return dispatch('document', 'click', { target: link, button: 0 });
    } };
}

const near = (actual, expected, what) =>
  assert.ok(Math.abs(actual - expected) < 0.5, `${what}: expected ~${expected}, got ${actual}`);

test('scrolling is never intercepted, in either direction or at either end', () => {
  const s = setup();
  for (const y of [0, 120, BOUNDARY / 2, BOUNDARY, BOUNDARY + 400]) {
    s.window.scrollY = y;
    assert.equal(s.dispatch('window', 'wheel', { deltaY: 100 }).defaultPrevented, false,
      `a wheel at ${y} must reach the browser`);
    assert.equal(s.dispatch('document', 'keydown', { key: 'PageDown' }).defaultPrevented, false);
    assert.equal(s.window.scrollY, y, 'nothing may move the page on its own');
  }
});

test('the name and every link land exactly on their sidebar counterparts', () => {
  const s = setup();
  s.scrollTo(BOUNDARY);
  const [nameX, nameY] = s.inkCentreOf(s.stage, s.heroName.ink);
  const [targetX, targetY] = s.targetCentre(s.sidebarName);
  near(nameX, targetX, 'name x');
  near(nameY, targetY, 'name y');
  s.heroLinks.forEach((link, index) => {
    const [x, y] = s.inkCentreOf(link, s.heroLabels[index].ink);
    const [tx, ty] = s.targetCentre(s.sidebarLinks[index].children.span);
    near(x, tx, `link ${index} x`);
    near(y, ty, `link ${index} y`);
  });
});

test('the fold is scrubbed by scroll position, and scrubs back', () => {
  const s = setup();
  s.scrollTo(0);
  assert.equal(s.stage.style.transform, 'translate3d(0px, 0px, 0) scale(1)', 'at rest the name is unmoved');
  assert.equal(s.hero.inert, false);
  assert.equal(s.hero.style.visibility, '');

  s.scrollTo(BOUNDARY * .25);
  const quarter = s.stage.style.transform;
  const [, quarterY] = s.inkCentreOf(s.stage, s.heroName.ink);
  s.scrollTo(BOUNDARY * .6);
  const [, laterY] = s.inkCentreOf(s.stage, s.heroName.ink);
  assert.ok(laterY < quarterY, 'the name keeps climbing towards the corner');

  s.scrollTo(BOUNDARY);
  assert.equal(s.hero.style.visibility, 'hidden');
  assert.equal(s.hero.inert, true);

  s.scrollTo(BOUNDARY * .25);
  assert.equal(s.hero.style.visibility, '', 'scrubbing back has to bring the hero out of hiding');
  assert.equal(s.hero.inert, false);
  assert.equal(s.stage.style.transform, quarter, 'the same position gives the same pose');
});

test('the words hand over to the sidebar instead of both being visible', () => {
  const s = setup();
  s.scrollTo(BOUNDARY * .3);
  assert.equal(s.stage.style.opacity, '1');
  assert.equal(s.sidebarName.style.opacity, '0', 'the sidebar name waits its turn');
  s.sidebarLinks.forEach((link, index) => {
    assert.equal(link.children.span.style.opacity, '0', `sidebar label ${index} waits`);
    assert.equal(link.children.svg.style.opacity, '0', `sidebar icon ${index} waits for its word`);
  });
  // The name glides for the whole fold. At 70% it is still travelling, so the
  // destination label must stay gone — no second mark fading or snapping in.
  s.scrollTo(BOUNDARY * .7);
  assert.equal(s.stage.style.opacity, '1', 'the travelling name stays fully opaque while it glides');
  assert.equal(s.sidebarName.style.opacity, '0', 'the sidebar name must not fade in mid-glide');
  s.heroLinks.forEach((link, index) => {
    assert.equal(link.style.opacity, '1', `travelling link ${index} is still the visible copy`);
    assert.equal(s.sidebarLinks[index].children.span.style.opacity, '0', `sidebar label ${index} has not faded in`);
  });
  s.scrollTo(BOUNDARY * .8);
  assert.equal(s.stage.style.opacity, '1', 'the name is still the travelling copy near the end');
  assert.equal(s.sidebarName.style.opacity, '0', 'handover waits for the fold to finish');
  const landingIcon = Number(s.sidebarLinks[0].children.svg.style.opacity);
  assert.ok(landingIcon > 0 && landingIcon < 1, `the first icon eases in with its word, got ${landingIcon}`);
  s.scrollTo(BOUNDARY);
  assert.equal(s.stage.style.opacity, '0');
  assert.equal(s.sidebarName.style.opacity, '', 'the sidebar name is handed its own opacity back');
  s.heroLinks.forEach((link, index) => {
    assert.equal(link.style.opacity, '0', `travelling link ${index} is gone`);
    assert.equal(s.sidebarLinks[index].children.span.style.opacity, '', `sidebar label ${index} has taken over`);
    assert.equal(s.sidebarLinks[index].children.svg.style.opacity, '', `sidebar icon ${index} is at rest`);
    assert.equal(s.sidebarLinks[index].children.svg.style.transform, '', `sidebar icon ${index} is not left mid-scale`);
  });
});

test('the hero stops swallowing the pointer once its own content has gone', () => {
  const s = setup();
  s.scrollTo(BOUNDARY * .2);
  assert.equal(s.hero.style.pointerEvents, '', 'the hero is still the live surface early on');
  s.scrollTo(BOUNDARY * .8);
  assert.equal(s.hero.style.pointerEvents, 'none', 'About is what the reader is aiming at by now');
  s.scrollTo(BOUNDARY * .2);
  assert.equal(s.hero.style.pointerEvents, '');
});

test('a nav link still travels smoothly and lands exactly', () => {
  const s = setup();
  s.click('#about');
  assert.ok(s.window.scrollY < BOUNDARY, 'it animates rather than jumping');
  s.advance();
  assert.equal(s.window.scrollY, BOUNDARY);
  assert.equal(s.hero.inert, true);
  s.click('#home');
  s.advance();
  assert.equal(s.window.scrollY, 0);
  assert.equal(s.hero.inert, false);
});

test('reversing a link animation retargets it without jumping to an endpoint', () => {
  const s = setup();
  s.click('#about');
  s.advance(96);
  const before = s.window.scrollY;
  assert.ok(before > 0 && before < BOUNDARY);
  s.click('#home');
  assert.equal(s.window.scrollY, before, 'it carries its position and velocity into the reversal');
  s.advance();
  assert.equal(s.window.scrollY, 0);
});

test('touch contact and reduced motion both take the animation out of the way', () => {
  const s = setup();
  s.click('#about');
  s.advance(80);
  s.dispatch('document', 'pointerdown');
  const atContact = s.window.scrollY;
  s.advance();
  assert.equal(s.window.scrollY, atContact, 'a finger on the glass owns the page');

  const r = setup(true);
  r.click('#about');
  assert.equal(r.window.scrollY, BOUNDARY, 'reduced motion lands immediately');
  r.advance();
  assert.equal(r.window.scrollY, BOUNDARY);
});

test('reduced motion leaves the hero untouched at every scroll position', () => {
  const r = setup(true);
  for (const y of [0, BOUNDARY / 2, BOUNDARY]) {
    r.scrollTo(y);
    assert.equal(r.hero.style.visibility, '');
    assert.equal(r.hero.style.pointerEvents, '');
    assert.equal(r.hero.inert, false);
    assert.equal(r.stage.style.transform, '', 'nothing folds when nothing is pinned');
    assert.equal(r.about.style.transform, '');
  }
});

test('resizing re-solves the fold against the new layout', () => {
  const s = setup();
  s.scrollTo(BOUNDARY);
  // A shorter runway, with the sidebar boxes that moved with it.
  s.about.offsetTop = 880;
  s.sidebarName.ink = rect(15, 923, 47, 18);
  s.sidebarLinks[0].children.span.ink = rect(38, 1110, 42, 18);
  s.sidebarLinks[1].children.span.ink = rect(38, 1160, 113, 18);
  s.dispatch('window', 'resize');
  assert.equal(s.window.scrollY, 880, 'a shorter runway still ends at About');
  s.advance(16);
  const [x, y] = s.inkCentreOf(s.stage, s.heroName.ink);
  const [tx, ty] = s.targetCentre(s.sidebarName);
  near(x, tx, 'name x after resize');
  near(y, ty, 'name y after resize');
});

test('width-only resize remeasures every landing without changing scroll position', () => {
  const s = setup();
  s.scrollTo(BOUNDARY);
  s.sidebarName.ink.left += 80;
  s.sidebarLinks[1].children.span.ink.left += 60;
  s.dispatch('window', 'resize');
  s.advance(16);
  assert.equal(s.window.scrollY, BOUNDARY);
  near(s.inkCentreOf(s.stage, s.heroName.ink)[0], s.targetCentre(s.sidebarName)[0], 'resized name');
  near(s.inkCentreOf(s.heroLinks[1], s.heroLabels[1].ink)[0], s.targetCentre(s.sidebarLinks[1].children.span)[0], 'resized link');
});

test('wheel input interrupts a link spring and never steals focus afterward', () => {
  const s = setup();
  s.click('#about');
  s.advance(96);
  assert.equal(s.dispatch('window', 'wheel', { deltaY: -50 }).defaultPrevented, false);
  s.scrollTo(s.window.scrollY - 50);
  const interrupted = s.window.scrollY;
  s.advance();
  assert.equal(s.window.scrollY, interrupted);
  assert.equal(s.about.focused, undefined);
});

test('a pointer reversal retains forward momentum before returning Home', () => {
  const s = setup();
  s.click('#about');
  s.advance(96);
  const turningPoint = s.window.scrollY;
  s.click('#home'); // Includes the real pointerdown → click sequence.
  s.advance(16);
  assert.ok(s.window.scrollY > turningPoint, 'existing velocity decelerates instead of reversing abruptly');
  s.advance();
  assert.equal(s.window.scrollY, 0);
});

test('About cannot take focus or clicks while it is invisible on Home', () => {
  const s = setup();
  assert.equal(s.about.inert, true);
  assert.equal(s.about.style.pointerEvents, 'none');
  s.scrollTo(BOUNDARY);
  assert.equal(s.about.inert, false);
  assert.equal(s.about.style.pointerEvents, '');
});

test('outline handoff blends only after the travelling glyphs have landed', () => {
  const s = setup();
  s.scrollTo(BOUNDARY * .92);
  const landed = s.stage.style.transform;
  s.scrollTo(BOUNDARY * .96);
  assert.equal(s.stage.style.transform, landed);
  const sourceOpacity = Number(s.stage.style.opacity);
  const targetOpacity = Number(s.sidebarName.style.opacity);
  assert.ok(sourceOpacity > 0 && sourceOpacity < 1);
  assert.ok(targetOpacity > 0 && targetOpacity < 1);
  near(sourceOpacity + targetOpacity, 1, 'handoff opacity');
});

test('a motion preference change recalculates the shorter native section boundary', () => {
  const s = setup();
  s.scrollTo(BOUNDARY);
  s.about.offsetTop = 720;
  s.context.reducedMotion.matches = true;
  s.dispatch('window', 'motionchange');
  s.advance(16);
  assert.equal(s.window.scrollY, 720);
  assert.equal(s.stage.style.transform, '');
  s.click('#home');
  s.click('#about');
  assert.equal(s.window.scrollY, 720);
});

test('direct About, legacy hash links and explicit Home hashes open the correct section', () => {
  assert.equal(setup(false, '', 'about').window.scrollY, BOUNDARY);
  assert.equal(setup(false, '#about').window.scrollY, BOUNDARY);
  assert.equal(setup(false, '#home', 'about').window.scrollY, 0);
});

test('enhanced links update the HTML URL and browser history restores the section', () => {
  const s = setup();
  s.click('#about');
  s.advance();
  assert.equal(s.context.location.href, 'https://example.test/about_me.html#about');
  assert.equal(s.context.document.title, 'About me — JOSH');
  s.context.location.hash = '#home';
  s.dispatch('window', 'popstate');
  // The browser restores the previous position after popstate, then hashchange.
  s.scrollTo(BOUNDARY * .35);
  s.dispatch('window', 'hashchange');
  s.advance();
  assert.equal(s.window.scrollY, BOUNDARY * .35, 'history preserves a partially scrolled Home');
  assert.equal(s.context.document.title, 'JOSH');
  s.context.location.hash = '#about';
  s.dispatch('window', 'hashchange');
  assert.equal(s.window.scrollY, BOUNDARY);
});

test('new tabs, downloads and unrelated URLs retain native navigation', () => {
  const s = setup();
  assert.equal(s.click('#about', { target: '_blank' }).defaultPrevented, false);
  assert.equal(s.click('#about', { attrs: { download: '' } }).defaultPrevented, false);
  assert.equal(s.click('#about', { href: 'https://elsewhere.test/about_me.html#about' }).defaultPrevented, false);
  assert.equal(s.click('#about', { href: 'projects.html#about' }).defaultPrevented, false);
});
