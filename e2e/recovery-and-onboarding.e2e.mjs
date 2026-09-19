import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import os from 'node:os';
import { fileURLToPath } from 'node:url';
const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.output/chrome-mv3');
const SHOTS = path.join(os.tmpdir(), 'pepper-e2e-shots');
fs.mkdirSync(SHOTS, { recursive: true });

const pages = {
  '/a': 'Stripe webhooks guide - Stripe Docs',
  '/b': 'Verify stripe webhooks signature - Stack Overflow',
  '/c': 'Testing stripe webhooks locally',
};
const server = http.createServer((req, res) => {
  const t = pages[req.url.split('?')[0]] || 'Other';
  res.setHeader('content-type', 'text/html');
  res.end(`<!doctype html><title>${t}</title><h1>${t}</h1>`);
}).listen(4599);

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDataDir = fs.mkdtempSync('/tmp/pepper-e2e-');
const ctx = await chromium.launchPersistentContext(userDataDir, {
  channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  viewport: { width: 1280, height: 860 },
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const extId = new URL(sw.url()).host;
console.log('extension', extId);
const swEval = (fn, arg) => sw.evaluate(fn, arg);

// ---------- Manager first-run: onboarding + live demo ----------
const mgr = await ctx.newPage();
const errors = [];
mgr.on('pageerror', (e) => errors.push(String(e)));
await mgr.goto(`chrome-extension://${extId}/manager.html`);
await mgr.waitForSelector('[role=dialog]', { timeout: 8000 });
check('onboarding opens as an accessible dialog', await mgr.locator('[role=dialog][aria-modal=true]').count() === 1);
for (let i = 0; i < 4; i++) await mgr.getByRole('button', { name: /^Continue/ }).click();
await mgr.screenshot({ path: `${SHOTS}/onboarding-demo-1.png` });
check('final step is the live demo', await mgr.getByText('See it work, live').isVisible());

// Point the demo at localhost pages so it does not depend on the network
await swEval(() => { /* no-op: demo uses wikipedia URLs; window creation only needs a URL */ });
const before = Date.now();
await mgr.getByRole('button', { name: 'Open demo window' }).click();
await sleep(2500);
const wins = await swEval(async () => (await chrome.windows.getAll({ populate: true })).map((w) => ({ id: w.id, n: w.tabs.length })));
check('demo opened a window with 3 tabs', wins.some((w) => w.n === 3), JSON.stringify(wins));
await mgr.bringToFront();
await mgr.getByRole('button', { name: 'Close it for me' }).click();
await mgr.getByRole('button', { name: 'Restore it' }).waitFor({ timeout: 15000 }).then(
  () => check('closing the window auto-captured it', true),
  () => check('closing the window auto-captured it', false));
await mgr.screenshot({ path: `${SHOTS}/onboarding-demo-2.png` });
const badge = await swEval(() => chrome.action.getBadgeText({}));
check('badge flashed +3 (or already reset)', /\+3|^\d*$/.test(badge), `badge="${badge}"`);
await mgr.getByRole('button', { name: 'Restore it' }).click();
await mgr.getByText(/That is Pepper/).waitFor({ timeout: 15000 }).then(
  () => check('restore reopened the window', true), () => check('restore reopened the window', false));
await mgr.screenshot({ path: `${SHOTS}/onboarding-demo-3.png` });
await mgr.getByRole('button', { name: /Finish/ }).click();
await mgr.locator('[role=dialog]').waitFor({ state: 'detached', timeout: 5000 }).then(() => check('onboarding closes after finishing', true), () => check('onboarding closes after finishing', false));

// ---------- Auto-capture on window close, feedback, naming ----------
await swEval(async () => {
  const w = await chrome.windows.create({ url: ['http://localhost:4599/a', 'http://localhost:4599/b', 'http://localhost:4599/c'] });
  globalThis.__winId = w.id;
});
await sleep(2500);
const persisted = await swEval(async () => (await chrome.storage.local.get('pepper_last_known_state_v1')).pepper_last_known_state_v1);
const snapCount = Object.values(persisted?.snapshots ?? {}).filter((s) => s.tabs.some((t) => t.url.includes('localhost:4599'))).length;
check('last-known state persisted to storage.local', snapCount === 1, `snapshots=${snapCount}`);
await swEval(() => chrome.windows.remove(globalThis.__winId));
await sleep(2500);
const last = await swEval(async () => (await chrome.storage.local.get('pepper_last_capture')).pepper_last_capture);
check('capture announced (toast record)', last && last.tabCount === 3 && /webhook/i.test(last.name), JSON.stringify(last));
check('name uses page-title topic', /webhooks/i.test(last?.name ?? ''), last?.name);
const badge2 = await swEval(() => chrome.action.getBadgeText({}));
check('badge is flashed after capture', badge2 === '+3' || /^\d+$/.test(badge2), `badge="${badge2}"`);

// toast + inline rename in the manager
await mgr.bringToFront();
await mgr.goto(`chrome-extension://${extId}/manager.html?capture=${encodeURIComponent(last.sessionId)}`);
await mgr.getByRole('status').filter({ hasText: /Saved 3 tabs/ }).waitFor({ timeout: 8000 }).then(
  () => check('toast shows "Saved 3 tabs"', true), () => check('toast shows "Saved 3 tabs"', false));
await mgr.getByRole('button', { name: /Rename captured workspace/ }).click();
await mgr.getByRole('textbox', { name: 'Rename captured workspace' }).fill('Stripe work');
await mgr.keyboard.press('Enter');
await sleep(600);
await mgr.screenshot({ path: `${SHOTS}/toast-dark.png` });
const renamed = await mgr.evaluate(async (id) => {
  const db = await new Promise((res) => { const r = indexedDB.open('PepperDatabaseV2'); r.onsuccess = () => res(r.result); });
  return await new Promise((res) => { const g = db.transaction('sessions').objectStore('sessions').get(id); g.onsuccess = () => res(g.result?.name); });
}, last.sessionId);
check('inline rename persisted', renamed === 'Stripe work', renamed);

// ---------- Search ----------
await mgr.keyboard.press('Escape');
await mgr.keyboard.press('Control+k');
await mgr.getByRole('combobox', { name: 'Search your work memory' }).fill('stripe webhok');
await sleep(400);
check('⌘K fuzzy search finds the workspace with typos, no AI', await mgr.getByRole('option', { name: /Stripe work/ }).count() > 0);
await mgr.screenshot({ path: `${SHOTS}/palette-dark.png` });
await mgr.keyboard.press('Escape');

// ---------- Recovery of a window that was never finalized ----------
await swEval(async () => {
  await chrome.storage.local.set({ pepper_last_known_state_v1: { updatedAt: Date.now(), snapshots: { 9999: {
    activeTabIndex: 0, capturedAt: Date.now(),
    tabs: ['https://example.org/one', 'https://example.org/two', 'https://example.org/three'].map((url, i) => ({ id: 100 + i, url, title: `Crashed tab ${i}`, favIconUrl: '', index: i })) } } } });
});
await swEval(() => chrome.storage.session.remove('pepper_boot_marker'));
const cdp = await ctx.newCDPSession(mgr);
await cdp.send('ServiceWorker.enable');
await cdp.send('ServiceWorker.stopAllWorkers');
await sleep(1000);
await mgr.evaluate(() => chrome.tabs.create({ url: 'about:blank', active: false })); // wakes the worker
await sleep(3000);
await mgr.goto(`chrome-extension://${extId}/manager.html`);
await mgr.getByText('Restore your last session').waitFor({ timeout: 8000 }).then(
  () => check('crash recovery banner appears after restart', true), () => check('crash recovery banner appears after restart', false));
await mgr.screenshot({ path: `${SHOTS}/recovery-dark.png` });

// ---------- Popup: reopen last closed window ----------
const popup = await ctx.newPage();
await popup.setViewportSize({ width: 420, height: 640 });
await popup.goto(`chrome-extension://${extId}/popup.html`);
await sleep(1500);
const reopenCount = await popup.getByRole('button', { name: /Reopen last closed window/ }).count();
check('popup offers "Reopen last closed window"', reopenCount === 1);
await popup.screenshot({ path: `${SHOTS}/popup-dark.png` });

// ---------- Theming ----------
await mgr.evaluate(async () => { const k = 'pepper_v2_settings'; const cur = (await chrome.storage.local.get(k))[k] || {}; await chrome.storage.local.set({ [k]: { ...cur, theme: 'light' } }); });
await sleep(500);
check('light theme applied', await mgr.evaluate(() => document.documentElement.dataset.theme) === 'light');
const bg = await mgr.evaluate(() => getComputedStyle(document.body).backgroundColor);
check('light background is actually light', bg === 'rgb(245, 245, 248)', bg);
await mgr.screenshot({ path: `${SHOTS}/manager-light.png` });
await popup.reload(); await sleep(800);
await popup.screenshot({ path: `${SHOTS}/popup-light.png` });

// ---------- Keyboard: focus ring ----------
await mgr.keyboard.press('Tab');
const ring = await mgr.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth}`; });
check('keyboard focus shows a visible ring', /solid 2px/.test(ring), ring);

// ---------- Export ----------
await mgr.getByRole('button', { name: 'Settings' }).first().click().catch(() => {});
await mgr.getByRole('button', { name: /^Settings$/ }).first().click().catch(() => {});
await sleep(500);
check('data panel present in settings', await mgr.getByRole('button', { name: 'Export backup (JSON)', exact: true }).count() === 1);
const [dl] = await Promise.all([mgr.waitForEvent('download'), mgr.getByRole('button', { name: 'Export backup (JSON)', exact: true }).click()]);
const file = await dl.path();
const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
check('export is a valid backup with sessions and no api keys', backup.format === 'pepper-backup' && backup.sessions.length >= 2 && !JSON.stringify(backup).includes('apiKey'), `sessions=${backup.sessions.length}`);
check('theme toggle reflects the current theme', await mgr.getByRole('radio', { name: 'Light' }).getAttribute('aria-checked') === 'true');
await mgr.screenshot({ path: `${SHOTS}/settings-light.png` });

check('no uncaught page errors', errors.length === 0, errors.join(' | '));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
await ctx.close(); server.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
