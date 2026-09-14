const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(new URL('../script.js', `file://${__filename}`), 'utf8');
const springSource = source.slice(source.indexOf('function createSpring2D('), source.indexOf('// Paint the grain once.'));
const sectionSource = source.slice(source.indexOf('function enableSectionScroll()'), source.indexOf('// Transform and opacity reveals'));

// The two sections share a sticky viewport; one hero height separates their
// scroll destinations. Gesture navigation completes that distance automatically.
const BOUNDARY = 1000;
const rect = (left, top, width, height) => ({ left, top, width, height });

function setup(reduce = false, initialHash = '', entryPage = 'home', smoothScroll = false) {
  let now = 1, frameId = 0;
  const frames = new Map(), events = { window: {}, document: {} };
  class Element {
    constructor() {
      this.style = { setProperty(k, v) { this[k] = v; } }; this.attrs = {}; this.parentElement = null;
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
    // Both surfaces are natively pinned through the fold. These boxes are
    // viewport-space rest geometry, independent of the current scroll position.
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
    if (inFlow) element.inFlow = false;
    return element;
  };

  const root = new Element(), hero = new Element(), about = new Element(), body = new Element();
  const intro = new Element(), portrait = new Element();

  // A 1440x900 hero, pinned, with its name and two links travelling into the
  // sidebar boxes that share the same sticky viewport.
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
  const sidebarName = make(rect(6, 34, 66, 35), rect(15, 43, 47, 18));
  const sidebarLinks = [rect(38, 230, 42, 18), rect(38, 280, 113, 18)].map((ink) => {
    const link = make(rect(4, ink.top - 13, 85, 44), null, false);
    link.children.span = make(null, ink, false);
    link.children.span.inFlow = false;
    link.children.svg = make(rect(12, ink.top, 16, 16), null, false);
    link.children.svg.inFlow = false;
    return link;
  });

  about.offsetTop = BOUNDARY;
  const runway = new Element();
  runway.classList.add('hero-runway'); runway.offsetHeight = 0; hero.offsetHeight = BOUNDARY;
  about.previousElementSibling = runway;
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
    finePointer: { matches: smoothScroll },
    reducedMotion: { matches: reduce, addEventListener: (name, fn) => on('window', 'motionchange', fn) }, heroIsVisible: true,
    syncAmbientMotion() {}, getComputedStyle: node => ({ overflowY: node.overflowY || 'visible' }),
    URL, location: { hash: initialHash, href: 'https://example.test/index.html' + initialHash },
    history: { pushState(state, title, href) { context.location.hash = new URL(href, context.location.href).hash; context.location.href = new URL(href, context.location.href).href; } }, performance: { now: () => now },
    requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: id => frames.delete(id) };
  vm.runInNewContext(springSource + sectionSource, context);

  function advance(ms = 2000) {
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
    Element, advance, dispatch, scrollTo, inkCentreOf, targetCentre, context, runway,
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

test('one wheel flick completes the whole fold with no further input', () => {
  const s = setup();
  assert.equal(s.dispatch('window', 'wheel', { deltaY: 40 }).defaultPrevented, true);
  assert.equal(s.window.scrollY, 0, 'the transition starts from its current pose');
  s.advance();
  assert.equal(s.window.scrollY, BOUNDARY);
  assert.equal(s.stage.style.opacity, '0');
  assert.equal(s.sidebarName.style.opacity, '');
  assert.equal(s.about.inert, false);
  assert.equal(s.about.focused, undefined, 'scrolling never steals focus');
  s.dispatch('window', 'wheel', { deltaY: -40 });
  s.advance();
  assert.equal(s.window.scrollY, 0);
});

test('trackpad momentum is absorbed through arrival, then ordinary About scrolling resumes', () => {
  const s = setup();
  s.dispatch('window', 'wheel', { deltaY: 40 });
  for (let i = 0; i < 30; i++) {
    s.advance(64);
    assert.equal(s.dispatch('window', 'wheel', { deltaY: 3 }).defaultPrevented, true);
  }
  assert.equal(s.window.scrollY, BOUNDARY);
  s.advance(200);
  assert.equal(s.dispatch('window', 'wheel', { deltaY: 40 }).defaultPrevented, false);
});

test('small deltas accumulate; line and page wheel units also trigger a single journey', () => {
  const s = setup();
  for (let i = 0; i < 6; i++) s.dispatch('window', 'wheel', { deltaY: 2 });
  s.advance();
  assert.equal(s.window.scrollY, BOUNDARY);
  for (const deltaMode of [1, 2]) {
    const r = setup();
    r.dispatch('window', 'wheel', { deltaY: 1, deltaMode });
    r.advance();
    assert.equal(r.window.scrollY, BOUNDARY);
  }
});

test('native scrolling, zoom, horizontal input, menus and nested content remain available', () => {
  const s = setup();
  for (const values of [{ deltaY: -40 }, { deltaY: 40, ctrlKey: true },
    { deltaY: 4, deltaX: 40 }, { deltaY: 40, cancelable: false }]) {
    assert.equal(s.dispatch('window', 'wheel', values).defaultPrevented, false);
  }
  s.context.mobileMenu = { open: true };
  assert.equal(s.dispatch('window', 'wheel', { deltaY: 40 }).defaultPrevented, false);
  s.context.mobileMenu = null;
  const nested = new s.Element();
  nested.overflowY = 'auto'; nested.clientHeight = 100; nested.scrollHeight = 500;
  assert.equal(s.dispatch('window', 'wheel', { target: nested, deltaY: 40 }).defaultPrevented, false);
  s.scrollTo(BOUNDARY + 300);
  assert.equal(s.dispatch('window', 'wheel', { deltaY: -40 }).defaultPrevented, false);
  const r = setup(true);
  assert.equal(r.dispatch('window', 'wheel', { deltaY: 40 }).defaultPrevented, false);
});

test('one touch swipe completes after release, and a new swipe can reverse it', () => {
  const s = setup();
  const point = y => [{ identifier: 1, clientX: 100, clientY: y }];
  s.dispatch('window', 'touchstart', { touches: point(400) });
  assert.equal(s.dispatch('window', 'touchmove', { touches: point(380) }).defaultPrevented, true);
  s.dispatch('window', 'touchend');
  s.advance(96);
  const before = s.window.scrollY;
  s.dispatch('document', 'pointerdown', { pointerType: 'touch' });
  s.dispatch('window', 'touchstart', { touches: point(380) });
  s.dispatch('window', 'touchmove', { touches: point(410) });
  s.dispatch('window', 'touchend');
  assert.equal(s.window.scrollY, before, 'reversal retains the current pose');
  s.advance();
  assert.equal(s.window.scrollY, 0);
  s.dispatch('window', 'touchstart', { touches: point(400) });
  s.dispatch('window', 'touchmove', { touches: point(375) });
  s.dispatch('window', 'touchend');
  s.advance();
  assert.equal(s.window.scrollY, BOUNDARY);
});

test('taps, horizontal swipes, multiple fingers and reduced-motion touch stay native', () => {
  for (const reduce of [false, true]) {
    const s = setup(reduce);
    const point = { identifier: 1, clientX: 100, clientY: 400 };
    s.dispatch('window', 'touchstart', { touches: [point] });
    s.dispatch('window', 'touchend');
    s.advance();
    assert.equal(s.window.scrollY, 0);
    s.dispatch('window', 'touchstart', { touches: [point] });
    assert.equal(s.dispatch('window', 'touchmove', { touches: [{ ...point, clientX: 140, clientY: 398 }] }).defaultPrevented, false);
    s.dispatch('window', 'touchstart', { touches: [point, { ...point, identifier: 2 }] });
    assert.equal(s.dispatch('window', 'touchmove', { touches: [{ ...point, clientY: 360 }] }).defaultPrevented, false);
    if (reduce) {
      s.dispatch('window', 'touchstart', { touches: [point] });
      assert.equal(s.dispatch('window', 'touchmove', { touches: [{ ...point, clientY: 360 }] }).defaultPrevented, false);
    }
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
  assert.equal(s.hero.style.visibility, '', 'the transparent hero remains composed for reversal');
  assert.equal(s.stage.style.opacity, '0');
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

test('mouse contact stops navigation and reduced motion lands immediately', () => {
  const s = setup();
  s.click('#about');
  s.advance(80);
  s.dispatch('document', 'pointerdown');
  const atContact = s.window.scrollY;
  s.advance();
  assert.equal(s.window.scrollY, atContact, 'mouse contact stops the page');

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
  // A shorter viewport and a reflowed sidebar.
  s.hero.offsetHeight = 880;
  s.sidebarName.ink = rect(15, 53, 47, 18);
  s.sidebarLinks[0].children.span.ink = rect(38, 240, 42, 18);
  s.sidebarLinks[1].children.span.ink = rect(38, 290, 113, 18);
  s.dispatch('window', 'resize');
  assert.equal(s.window.scrollY, 880, 'a shorter viewport still ends at About');
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

test('a reverse wheel flick redirects a link spring and never steals focus afterward', () => {
  const s = setup();
  s.click('#about');
  s.advance(96);
  const before = s.window.scrollY;
  assert.equal(s.dispatch('window', 'wheel', { deltaY: -50 }).defaultPrevented, true);
  assert.equal(s.window.scrollY, before);
  s.advance();
  assert.equal(s.window.scrollY, 0);
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

test('travelling glyphs slow into both ends rather than hitting a clamp at speed', () => {
  const s = setup();
  const position = p => {
    s.scrollTo(BOUNDARY * p);
    return s.inkCentreOf(s.stage, s.heroName.ink);
  };
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const middleStep = distance(position(.46), position(.465));
  const arrival = [.9, .905, .91, .915, .92].map(position);
  const steps = arrival.slice(1).map((p, i) => distance(arrival[i], p));
  assert.ok(steps.every((step, i) => i === 0 || step < steps[i - 1]),
    'each step approaching the landing must get smaller');
  assert.ok(steps.at(-1) < middleStep * .05, 'the last step gently approaches rest');
  assert.ok(distance(position(.005), position(0)) < middleStep * .05,
    'the reverse path also slows into Home');
});

test('rounded browser scroll offsets do not quantize or repaint the spring pose', () => {
  const precise = setup();
  const rounded = setup();
  let observedRounding = false;
  rounded.window.scrollTo = ({ top }) => {
    rounded.window.scrollY = Math.round(top);
    observedRounding ||= rounded.window.scrollY !== top;
    rounded.dispatch('window', 'scroll');
  };
  for (const destination of ['#about', '#home']) {
    precise.click(destination);
    rounded.click(destination);
    for (let frame = 0; frame < 95; frame++) {
      precise.advance(16);
      rounded.advance(16);
      assert.equal(rounded.stage.style.transform, precise.stage.style.transform,
        'the drawn word keeps the spring precision in both directions');
    }
  }
  assert.equal(observedRounding, true, 'the browser simulation actually rounded');
});

test('a navigation spring responds on its first display frame', () => {
  const s = setup();
  s.click('#about');
  s.advance(16);
  assert.ok(s.window.scrollY > 0, 'there is no idle frame before movement begins');
});

test('native presentation resumes at the landing after navigation completes', () => {
  const s = setup(false, '', 'home', true);
  s.click('#about');
  s.advance();
  const landing = s.stage.style.transform;
  s.dispatch('window', 'scroll');
  s.dispatch('window', 'resize');
  for (let frame = 0; frame < 95; frame++) {
    s.advance(16);
    assert.equal(s.stage.style.transform, landing, 'a late native event cannot replay the fold');
    assert.equal(s.stage.style.opacity, '0');
  }
});

test('a motion preference change recalculates the shorter native section boundary', () => {
  const s = setup();
  s.scrollTo(BOUNDARY);
  s.hero.offsetHeight = 720;
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

test('wheel steps smooth the presentation without moving the document', () => {
  const s = setup(false, '', 'home', true);
  const direct = setup();
  const atHome = s.stage.style.transform;
  s.scrollTo(800);
  assert.equal(s.window.scrollY, 800, 'native scroll reaches its own position immediately');
  assert.equal(s.stage.style.transform, atHome, 'the visual does not jump by a whole wheel step');
  s.advance(96);
  const intermediate = s.stage.style.transform;
  direct.scrollTo(800);
  assert.notEqual(intermediate, atHome);
  assert.notEqual(intermediate, direct.stage.style.transform);
  s.advance();
  assert.equal(s.window.scrollY, 800, 'visual smoothing never writes scrollTo');
  assert.equal(s.stage.style.transform, direct.stage.style.transform);
});

test('reversing a wheel step continues from the presented pose', () => {
  const s = setup(false, '', 'home', true);
  s.scrollTo(900);
  s.advance(96);
  const before = s.stage.style.transform;
  s.window.scrollY = 200;
  s.dispatch('window', 'scroll');
  assert.equal(s.stage.style.transform, before, 'retargeting cannot teleport the current pose');
  s.advance();
  const direct = setup();
  direct.scrollTo(200);
  assert.equal(s.stage.style.transform, direct.stage.style.transform);
  assert.equal(s.window.scrollY, 200);
});

test('hybrid touch and keyboard bypass wheel smoothing', () => {
  for (const input of ['touch-input', 'section-scroll-keyboard']) {
    const s = setup(false, '', 'home', true);
    const direct = setup();
    s.root.classList.add(input);
    s.scrollTo(600);
    direct.scrollTo(600);
    assert.equal(s.stage.style.transform, direct.stage.style.transform, input);
  }
});

test('explicit link navigation has only its navigation spring', () => {
  const s = setup(false, '', 'home', true);
  s.click('#about');
  s.advance(96);
  const direct = setup();
  direct.scrollTo(s.window.scrollY);
  assert.equal(s.stage.style.transform, direct.stage.style.transform, 'no second easing trails the link motion');
});

test('About has only a small arrival offset, with no inverse-scroll correction', () => {
  const s = setup();
  for (const y of [0, 200, 500, 850, 1000, 1400]) {
    s.scrollTo(y);
    const offset = Number(/translateY\(([-\d.]+)px\)/.exec(s.about.style.transform)[1]);
    assert.ok(offset >= 0 && offset <= 48, `at ${y}, offset was ${offset}`);
    if (y >= BOUNDARY) assert.equal(offset, 0, 'long About content can scroll normally');
  }
});

test('the JOSH entrance retains its center waypoint and 200ms letter stagger', () => {
  const calls = [];
  const letters = Array.from({ length: 4 }, (_, id) => ({ id }));
  const wordmark = { querySelectorAll: () => letters };
  const start = source.indexOf('    animate(wordmark, [', source.indexOf('async function playIntro()'));
  const end = source.indexOf('    animate(portraitStage, [', start);
  assert.ok(start > 0 && end > start);
  vm.runInNewContext(source.slice(start, end), {
    wordmark, window: { innerWidth: 1440 }, centerX: 0, centerY: 350,
    wordmarkTransform: 'scaleY(1.25)', easeInOutQuart: 'quart', easeInOutCubic: 'cubic', easeOutQuart: 'out',
    animate: (...args) => calls.push(args)
  });
  const [, frames, delay, duration, easing] = calls[0];
  assert.deepEqual(Array.from(frames, frame => frame.transform), [
    'translate3d(1440px, 350px, 0) scaleY(1.25)',
    'translate3d(0px, 350px, 0) scaleY(1.25)',
    'translate3d(0, 0, 0) scaleY(1.25)'
  ]);
  assert.equal(frames[1].offset, .5);
  assert.equal(delay, 0);
  assert.equal(duration, 2000);
  assert.equal(easing, 'linear');
  assert.deepEqual(calls.slice(1).map(call => call[2]), [0, 200, 400, 600]);
});

test('tiny reverse wheel jitter does not release a gesture or undo its landing', () => {
  const s = setup();
  s.dispatch('window', 'wheel', { deltaY: 40 });
  for (let i = 0; i < 30; i++) {
    s.advance(64);
    s.dispatch('window', 'wheel', { deltaY: 3 });
  }
  assert.equal(s.window.scrollY, BOUNDARY);
  assert.equal(s.dispatch('window', 'wheel', { deltaY: -2 }).defaultPrevented, true);
  assert.equal(s.dispatch('window', 'wheel', { deltaY: 2 }).defaultPrevented, true);
  s.advance();
  assert.equal(s.window.scrollY, BOUNDARY);
});
