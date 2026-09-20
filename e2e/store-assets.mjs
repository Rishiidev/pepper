/**
 * Generates the Chrome Web Store screenshots (1280x800) from the real extension,
 * in light and dark. Run: node e2e/store-assets.mjs
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXT = path.join(ROOT, '.output/chrome-mv3');
const OUT = path.join(ROOT, 'store');
const SITE = path.join(ROOT, 'website/public/img');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SITE, { recursive: true });

const titles = {
  '/a': 'Stripe webhooks guide', '/b': 'Verify webhook signatures', '/c': 'Testing webhooks locally',
  '/f1': 'Checkout redesign in Figma', '/f2': 'Design tokens', '/f3': 'Pricing page mockups',
  '/l1': 'Lisbon hotels near Alfama', '/l2': 'Flights to Lisbon in May', '/l3': 'Lisbon travel guide',
};
// Neutral fake sites, each with its own colored favicon so the screenshots show real icons
const COLORS = { docs: '#4C6EF5', code: '#12B886', design: '#F06595', travel: '#F59F00', maps: '#7950F2' };
const server = http.createServer((q, r) => {
  const t = titles[q.url.split('?')[0]] || 'Other';
  const sub = (q.headers.host || '').split('.')[0];
  const color = COLORS[sub] || '#868E96';
  const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='${color}'/><text x='16' y='22' font-size='18' font-family='sans-serif' font-weight='700' text-anchor='middle' fill='white'>${sub[0]?.toUpperCase() || '?'}</text></svg>`);
  r.setHeader('content-type', 'text/html');
  r.end(`<!doctype html><title>${t}</title><link rel="icon" href="data:image/svg+xml,${svg}"><h1>${t}</h1>`);
}).listen(4592);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const scheme of ['light', 'dark']) {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync('/tmp/pepper-store-'), {
    channel: 'chromium', headless: true, colorScheme: scheme,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--host-resolver-rules=MAP *.localhost 127.0.0.1'],
    viewport: { width: 1280, height: 800 },
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host;
  await sw.evaluate(async () => { const s = (await chrome.storage.local.get('pepper_v2_settings')).pepper_v2_settings || {}; await chrome.storage.local.set({ pepper_v2_settings: { ...s, hasCompletedOnboarding: true, sessionTrackingEnabled: true } }); });
  await sleep(600);
  const mk = async (urls, wait = 2500) => { await sw.evaluate(async (u) => { const w = await chrome.windows.create({ url: u, focused: true }); globalThis.__w = w.id; }, urls); await sleep(wait); await sw.evaluate(() => chrome.windows.remove(globalThis.__w)); await sleep(2000); };
  await mk(['http://travel.localhost:4592/l1', 'http://maps.localhost:4592/l2', 'http://docs.localhost:4592/l3']);
  await mk(['http://design.localhost:4592/f1', 'http://design.localhost:4592/f2', 'http://docs.localhost:4592/f3']);
  await mk(['http://docs.localhost:4592/a', 'http://code.localhost:4592/b', 'http://docs.localhost:4592/c']);
  await sw.evaluate(async () => { await chrome.windows.create({ url: ['http://docs.localhost:4592/a', 'http://code.localhost:4592/b', 'http://docs.localhost:4592/c', 'http://design.localhost:4592/f3'], focused: true }); });
  await sleep(2500);

  const page = async (rel) => { const p = await ctx.newPage(); await p.setViewportSize({ width: 1280, height: 800 }); await p.goto(`chrome-extension://${id}/${rel}`); await sleep(1500); return p; };
  const save = async (p, name) => { for (const dir of [OUT, SITE]) await p.screenshot({ path: path.join(dir, `${name}-${scheme}.png`) }); await p.close(); };

  // 1. Close it. It's saved. - the save card, centered and enlarged
  let p = await page('popup.html');
  await p.addStyleTag({ content: 'body{display:flex;justify-content:center;padding-top:60px;background:var(--pp-canvas)} #root{zoom:1.7}' });
  await sleep(300); await save(p, '1-save');
  // 2. Get it back in one click
  p = await page('manager.html?view=home'); await save(p, '2-restore');
  // 3. Find anything
  p = await page('manager.html?view=home');
  await p.keyboard.press('Control+k'); await p.getByRole('combobox', { name: 'Find anything' }).fill('stripe webhok'); await sleep(500); await save(p, '3-find');
  // 4. Timeline
  p = await page('manager.html?view=timeline'); await save(p, '4-timeline');
  // 5. Workspaces
  p = await page('manager.html?view=workspaces'); await save(p, '5-workspaces');
  await ctx.close();
}
server.close();
console.log('Saved to', OUT, 'and', SITE);
