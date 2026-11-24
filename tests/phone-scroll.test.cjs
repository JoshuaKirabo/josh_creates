const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(new URL('../script.js', `file://${__filename}`), 'utf8');
const part = (from, to) => source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)));
const controller = [
  part('let heldTurnContact =', '// The Spline workspace'),
  part('const pageSnapMarkers =', 'let craftStage ='),
  part('function holdBrowserToolbar()', '// Every section is in the page')
].join('\n');

function setup({ phone = true, markerOffsets = [], flows = [] } = {})
  {
    const listeners = new Map(), frames = new Map();
    let now = 0, frame = 0;
    class Element
      {
        constructor(parent) { this.parentElement = parent; }
      }
    const body = new Element(null);
    const root = { style: {}, scrollHeight: 3000, scrollSnapType: 'y mandatory' };
    const markers = markerOffsets.map(top => ({ style: { top: top + 'px' }, dataset: {} }));
    const window =
      {
        scrollY: 100, innerWidth: 390, innerHeight: 500, matchMedia: () => ({ matches: phone }),
        scrollTo({ top }) { this.scrollY = top; },
        addEventListener(type, fn)
          {
            if(!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(fn);
          }
      };
    const flowAreas = flows.map(({ top, height, parent = body }) => ({
      parentElement: parent, scrollSnapAlign: 'start',
      getClientRects: () => [1],
      getBoundingClientRect: () => ({ top: top - window.scrollY, bottom: top + height - window.scrollY })
    }));
    const document = { documentElement: root, body, querySelectorAll(selector)
      {
        if(selector.startsWith('.page-snap,')) return markers;
        if(selector.startsWith('.about-hero,')) return flowAreas;
        throw new Error('Unexpected snap search: ' + selector);
      } };
    const context = vm.createContext({ window, document, Element, performance: { now: () => now }, mobileMenu: null,
      getComputedStyle(node) { assert.ok(!markers.includes(node), 'markers already have measured offsets'); return node; },
      introSettled: { then() {} }, location: { hash: '' }, glide: null, reaimGlide() {},
      flick: {}, requestAnimationFrame(fn) { frames.set(++frame, fn); return frame; }, cancelAnimationFrame(id) { frames.delete(id); } });
    vm.runInContext(controller, context);
    const registerTurn = (target, leave) => context.holdPageTurns(target, leave, { fresh: true });
    function send(type, x, y, { target = body, count = 1, delay = 16 } = {})
      {
        now += delay;
        const touches = type === 'touchend' ? [] : Array.from({ length: count }, (_, id) => ({ identifier: id, clientX: x, clientY: y }));
        const event = { type, target, touches, cancelable: true, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
        for(const listener of listeners.get(type) || []) listener(event);
        return event;
      }
    function nextFrame()
      {
        now += 16;
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach(fn => fn(now));
      }
    function settle()
      {
        for(let i = 0; frames.size && i < 400; i++) nextFrame();
        assert.equal(frames.size, 0);
      }
    return { window, root, body, Element, markers, send, settle, nextFrame, registerTurn, keepPlace: () => context.keepPlaceOnResize(), toolbar: () => context.holdBrowserToolbar() };
  }

test('phone page follows the first vertical movement, and a quick lift lands at the next stop', () =>
  {
    const s = setup({ markerOffsets: [100, 200, 300, 400] });
    s.toolbar();
    s.send('touchstart', 100, 500);
    s.send('touchmove', 100, 497);
    assert.equal(s.window.scrollY, 100);
    s.send('touchmove', 100, 480);
    assert.equal(s.window.scrollY, 120);
    s.send('touchmove', 100, 460);
    assert.equal(s.window.scrollY, 140);
    s.send('touchend');
    s.settle();
    assert.equal(s.window.scrollY, 200);
    assert.equal(s.root.style.scrollSnapType, '');
  });

test('finger lift uses updated marker positions, skips hidden markers and keeps oversized in-flow snap areas', () =>
  {
    const s = setup({ markerOffsets: [100, 190, 210, 800], flows: [{ top: 250, height: 650 }] });
    s.toolbar();
    s.send('touchstart', 100, 500);
    s.send('touchmove', 100, 480);
    s.markers[1].hidden = true;
    s.markers[2].style.top = '240px';
    s.send('touchend');
    s.settle();
    assert.equal(s.window.scrollY, 240);
    s.window.scrollY = 300;
    s.send('touchstart', 100, 500);
    s.send('touchmove', 100, 480);
    s.send('touchend', 100, 480, { delay: 120 });
    s.settle();
    assert.equal(s.window.scrollY, 320, 'a paused drag inside a tall snap area rests under the finger');
  });

test('the section turn ignores sideways movement and belongs to exactly one contact across a cut', () =>
  {
    const s = setup();
    let section = 'projects';
    const turns = [];
    s.registerTurn(dir => section === 'skills' && dir < 0 ? 'projects' : undefined, to => { section = to; turns.push(to); });
    s.registerTurn(dir => section === 'projects' && dir > 0 ? 'skills' : undefined, to => { section = to; turns.push(to); });
    s.send('touchstart', 40, 300);
    assert.equal(s.send('touchmove', 140, 287).defaultPrevented, false);
    s.send('touchmove', 120, 230);
    s.send('touchend');
    assert.deepEqual(turns, []);
    s.send('touchstart', 40, 300);
    s.send('touchmove', 40, 293);
    s.send('touchmove', 40, 286);
    assert.deepEqual(turns, ['skills']);
    assert.ok(s.send('touchmove', 40, 330, { delay: 220 }).defaultPrevented);
    assert.deepEqual(turns, ['skills']);
    s.send('touchend');
    s.send('touchstart', 40, 300);
    s.send('touchmove', 40, 330);
    assert.deepEqual(turns, ['skills', 'projects']);
  });

test('a contact retains native nested scrolling, hands over at its edge, and yields to a pinch', () =>
  {
    const s = setup();
    let turns = 0;
    const box = Object.assign(new s.Element(s.body), { overflowY: 'auto', clientHeight: 100, scrollHeight: 200, scrollTop: 20 });
    s.registerTurn(() => 400, () => { turns++; });
    s.toolbar();
    s.send('touchstart', 40, 300, { target: box });
    assert.equal(s.send('touchmove', 40, 275, { target: box }).defaultPrevented, false);
    box.scrollTop = 100;
    assert.ok(s.send('touchmove', 40, 250, { target: box }).defaultPrevented);
    assert.equal(turns, 1);
    s.send('touchstart', 40, 240, { target: box, count: 2 });
    assert.equal(s.send('touchmove', 40, 215, { target: box, count: 2 }).defaultPrevented, false);
    assert.equal(s.window.scrollY, 100);
  });

test('the phone toolbar controller leaves laptop touch input alone', () =>
  {
    const s = setup({ phone: false });
    s.toolbar();
    s.send('touchstart', 40, 300);
    assert.equal(s.send('touchmove', 40, 250).defaultPrevented, false);
    assert.equal(s.window.scrollY, 100);
  });


test('resize restoration yields to a phone drag and coast, then follows the new resting stop', () =>
  {
    const s = setup({ markerOffsets: [100, 200, 300] });
    s.keepPlace();
    s.toolbar();
    s.send('scroll');
    s.send('resize'); // Queue the normal multi-frame restore at the original stop.
    s.send('touchstart', 40, 300);
    s.send('touchmove', 40, 276);
    assert.equal(s.window.scrollY, 124);
    s.window.innerHeight++;
    s.send('scroll'); // A toolbar resize can first arrive as a scroll notification.
    s.send('resize');
    s.nextFrame(); // The resize's already queued restore must also yield.
    assert.equal(s.window.scrollY, 124);
    s.send('touchmove', 40, 254);
    s.send('touchend');
    s.send('resize');
    s.nextFrame();
    assert.ok(s.window.scrollY > 146, 'momentum continues in the same direction');
    s.settle();
    assert.equal(s.window.scrollY, 200);
    s.markers[1].style.top = '225px';
    s.window.innerHeight += 50;
    s.send('resize');
    s.settle();
    assert.equal(s.window.scrollY, 225, 'a later idle resize follows the landed marker');
  });
