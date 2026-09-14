const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(new URL('../script.js', `file://${__filename}`), 'utf8');
const springSource = source.slice(source.indexOf('function createSpring2D('), source.indexOf('// Paint the grain once.'));
const sectionSource = source.slice(source.indexOf('function enableSectionScroll()'), source.indexOf('// Transform and opacity reveals'));

function setup(reduce = false) {
  let now = 1, frameId = 0;
  const frames = new Map(), events = { window: {}, document: {} };
  class Element {
    constructor() {
      this.style = {}; this.attrs = {}; this.parentElement = null;
      this.scrollHeight = this.clientHeight = 0; this.scrollTop = 0;
      const classes = new Set();
      this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) };
    }
    closest() { return null; }
    matches() { return false; }
    setAttribute(k, v) { this.attrs[k] = v; }
    removeAttribute(k) { delete this.attrs[k]; }
    focus() { this.focused = true; }
  }
  const root = new Element(), hero = new Element(), about = new Element(), body = new Element();
  const wordmark = new Element(), portrait = new Element(), intro = new Element();
  about.offsetTop = 720;
  about.querySelector = () => null;
  hero.querySelector = selector => selector === '.wordmark-stage' ? wordmark : portrait;
  const on = (type, name, fn) => (events[type][name] ||= []).push(fn);
  const window = { scrollY: 0, innerHeight: 720, scrollTo({ top }) { this.scrollY = top; }, addEventListener: (name, fn) => on('window', name, fn) };
  const document = { documentElement: root, body, querySelector: selector => selector === '#about' ? about : intro,
    querySelectorAll: () => [], addEventListener: (name, fn) => on('document', name, fn) };
  const context = { window, document, hero, Element, mobileMenu: null,
    reducedMotion: { matches: reduce, addEventListener() {} }, heroIsVisible: true,
    syncAmbientMotion() {}, getComputedStyle: node => ({ overflowY: node.overflowY || 'visible' }),
    location: { hash: '' }, history: { pushState() {} }, performance: { now: () => now },
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
  return { window, root, hero, about, Element, advance, dispatch,
    wheel: (deltaY, extra) => dispatch('window', 'wheel', { deltaY, ...extra }) };
}

test('one deliberate wheel settles exactly at About; inertia cannot move it on', () => {
  const s = setup();
  assert.equal(s.wheel(100).defaultPrevented, true);
  for (let i = 0; i < 90; i++) { s.advance(16); s.wheel(2); }
  assert.equal(s.window.scrollY, 720);
  assert.equal(s.hero.inert, true);
  assert.equal(s.root.classList.contains('section-spring-active'), false);
  s.advance(200);
  assert.equal(s.wheel(100).defaultPrevented, false, 'a new gesture can read a taller About section');
});

test('reversal retargets the moving spring without jumping to an endpoint', () => {
  const s = setup(); s.wheel(100); s.advance(96);
  const before = s.window.scrollY;
  assert.ok(before > 0 && before < 720);
  s.wheel(-100);
  assert.equal(s.window.scrollY, before);
  s.advance(); assert.equal(s.window.scrollY, 0);
  assert.equal(s.hero.inert, false);
});

test('keyboard and reduced-motion navigation land immediately', () => {
  const s = setup(); s.dispatch('document', 'keydown', { key: 'PageDown' });
  assert.equal(s.window.scrollY, 720);
  s.dispatch('document', 'keydown', { key: 'PageUp' }); assert.equal(s.window.scrollY, 0);
  const r = setup(true); r.wheel(100); assert.equal(r.window.scrollY, 720);
  r.advance(); assert.equal(r.window.scrollY, 720);
});

test('touch contact cancels the wheel spring and leaves scrolling to the browser', () => {
  const s = setup(); s.wheel(100); s.advance(80);
  s.dispatch('document', 'pointerdown'); const atContact = s.window.scrollY;
  s.advance(); assert.equal(s.window.scrollY, atContact);
});

test('nested scroll areas, pinch zoom, and horizontal input retain native behavior', () => {
  const s = setup(); const panel = new s.Element();
  panel.scrollHeight = 900; panel.clientHeight = 200; panel.overflowY = 'auto';
  assert.equal(s.wheel(100, { target: panel }).defaultPrevented, false);
  assert.equal(s.wheel(100, { ctrlKey: true }).defaultPrevented, false);
  assert.equal(s.wheel(10, { deltaX: 100 }).defaultPrevented, false);
  assert.equal(s.window.scrollY, 0);
});

test('scrolling within long content is not captured; resizing keeps the landing aligned', () => {
  const s = setup(); s.window.scrollY = 900;
  assert.equal(s.wheel(-50).defaultPrevented, false);
  s.window.scrollY = 720; s.about.offsetTop = 600;
  s.dispatch('window', 'resize'); assert.equal(s.window.scrollY, 600);
});
