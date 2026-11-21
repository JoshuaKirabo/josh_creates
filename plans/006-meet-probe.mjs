// Drives headless Chrome over CDP with real wheel input and records Meet Josh's
// classes and the scene's rendered opacity every frame through the turn down.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), 'chrome-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1485,900', '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: ['ignore', 'ignore', 'inherit'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let targets;
for (let i = 0; i < 100; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(200); }
}
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const flick = async (dy, count = 12, tail = 25) => {
  for (let i = 0; i < count; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 740, y: 450, deltaX: 0, deltaY: dy }); await sleep(16); }
  for (let i = 0; i < tail; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 740, y: 450, deltaX: 0, deltaY: Math.max(1, dy * (1 - i / tail)) }); await sleep(16); }
};

await send('Emulation.setDeviceMetricsOverride', { width: 1485, height: 812, deviceScaleFactor: 1, mobile: false });
await send('Page.enable');
await send('Page.navigate', { url: 'http://localhost:8765/index.html' });
await sleep(6000);
await evaluate(`(() => { const meet = document.querySelector('.about-hero'); const t0 = performance.now(); window.__m = [];
  new MutationObserver(() => __m.push([Math.round(performance.now()-t0), Math.round(scrollY), meet.className, document.documentElement.classList.contains('section-folding')])).observe(meet, { attributes: true, attributeFilter: ['class'] });
  addEventListener('wheel', e => { if (!window.__w) window.__w = [Math.round(performance.now()-t0), e.defaultPrevented]; }, { passive: true }); })()`);
await flick(40);
await sleep(3500);
console.log('fold flick log:', await evaluate('JSON.stringify({ m: __m, firstWheel: __w })'));
console.log('at meet:', await evaluate(`JSON.stringify({ y: scrollY, meet: document.querySelector('.about-hero').className, vis: document.visibilityState })`));
await evaluate(`(() => {
  const meet = document.querySelector('.about-hero');
  const scene = meet.querySelector('.about-scene');
  const t0 = performance.now(); window.__f = [];
  const tick = () => {
    __f.push([Math.round(performance.now() - t0), Math.round(scrollY), meet.className.replace('about-hero', '').trim(), (+getComputedStyle(scene).opacity).toFixed(2)]);
    if (performance.now() - t0 < 4000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})()`);
await flick(40);
await sleep(4200);
const frames = await evaluate('JSON.stringify(__f)');
const rows = JSON.parse(frames);
// Keep rows where anything but time changed.
let last = '';
for (const r of rows) { const key = r.slice(1).join('|'); if (key !== last) { console.log(r.join('\t')); last = key; } }
ws.close();
chrome.kill();
