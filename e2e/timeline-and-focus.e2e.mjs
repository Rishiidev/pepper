import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import os from 'node:os';
import { fileURLToPath } from 'node:url';
const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.output/chrome-mv3');
const SHOTS = path.join(os.tmpdir(), 'pepper-e2e-shots');
fs.mkdirSync(SHOTS, { recursive: true });

const titles = {
  '/a': 'Stripe webhooks guide',
  '/b': 'Verify stripe webhooks signature',
  '/c': 'Secret internal page',
  '/l1': 'Lisbon hotels near Alfama',
  '/l2': 'Flights to Lisbon in May',
  '/l3': 'Lisbon travel guide',
  '/t1': 'Tokyo ramen spots',
  '/t2': 'Tokyo rail pass guide',
  '/t3': 'Tokyo skyline night photos',
};
const server = http.createServer((req, res) => {
  const t = titles[req.url.split('?')[0]] || 'Other';
  res.setHeader('content-type', 'text/html');
  res.end(`<!doctype html><title>${t}</title><h1>${t}</h1>`);
}).listen(4597);

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(fs.mkdtempSync('/tmp/pepper-e2e2-'), {
  channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--host-resolver-rules=MAP *.localhost 127.0.0.1'],
  viewport: { width: 1280, height: 900 },
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const extId = new URL(sw.url()).host;
const swEval = (fn, arg) => sw.evaluate(fn, arg);
const errors = [];

const mgr = await ctx.newPage();
mgr.on('pageerror', (e) => errors.push('mgr: ' + String(e)));
await mgr.goto(`chrome-extension://${extId}/manager.html`);
// dismiss onboarding
await mgr.waitForSelector('[role=dialog]');
await mgr.getByRole('button', { name: 'Skip tour' }).click();

// ---------- Opt-in + blocklist through the real settings UI ----------
await mgr.getByRole('button', { name: /^Settings$/ }).first().click();
check('tracking is off by default', await mgr.getByRole('checkbox', { name: /Record my browser session/ }).isChecked() === false);
await mgr.getByLabel('Never record these sites').fill('blocked.localhost');
await mgr.getByLabel('Never record these sites').blur();
await sleep(400);
const saved = await swEval(async () => (await chrome.storage.local.get('pepper_v2_settings')).pepper_v2_settings);
check('blocklist saved and parsed', JSON.stringify(saved.trackingBlocklist) === '["blocked.localhost"]', JSON.stringify(saved.trackingBlocklist));
await mgr.getByRole('checkbox', { name: /Record my browser session/ }).check();
await sleep(1500);
const heartbeat = await swEval(async () => (await chrome.alarms.getAll()).map((a) => a.name));
check('recorder started (heartbeat alarm)', heartbeat.includes('pepper_recorder_heartbeat'), heartbeat.join(','));

// ---------- Browse: open window, switch, navigate, close, blocked domain ----------
const winId = await swEval(async () => {
  const w = await chrome.windows.create({ url: ['http://localhost:4597/a', 'http://localhost:4597/b', 'http://blocked.localhost:4597/c'], focused: true });
  globalThis.__w = w.id;
  return w.id;
});
await sleep(2500);
await swEval(async () => {
  const tabs = await chrome.tabs.query({ windowId: globalThis.__w });
  await chrome.tabs.update(tabs[1].id, { active: true });
});
await sleep(1500);
await swEval(async () => {
  const tabs = await chrome.tabs.query({ windowId: globalThis.__w });
  await chrome.tabs.update(tabs[0].id, { url: 'http://localhost:4597/l1' });
});
await sleep(2000);
await swEval(async () => {
  const tabs = await chrome.tabs.query({ windowId: globalThis.__w });
  await chrome.tabs.remove(tabs[1].id);
});
await sleep(1500);

const counts = await mgr.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('PepperDatabaseV2'); r.onsuccess = () => res(r.result); });
  const all = await new Promise((res) => { const g = db.transaction('timelineEvents').objectStore('timelineEvents').getAll(); g.onsuccess = () => res(g.result); });
  const byType = {};
  for (const e of all) byType[e.type] = (byType[e.type] || 0) + 1;
  return { byType, blocked: all.some((e) => (e.url || '').includes('blocked.localhost')), n: all.length };
});
console.log('   events', JSON.stringify(counts.byType));
check('opens, switches, navigation, closes and active time recorded', ['tab_open', 'tab_switch', 'tab_navigate', 'tab_close', 'tab_active', 'session_start'].every((t) => counts.byType[t] > 0));
check('blocked domain is never recorded', counts.blocked === false);

// ---------- Timeline UI ----------
await mgr.bringToFront();
await mgr.goto(`chrome-extension://${extId}/manager.html?view=timeline`);
await mgr.getByRole('heading', { name: 'Timeline' }).waitFor({ timeout: 8000 });
check('recap sentence is shown', await mgr.getByText(/You were active|You focused/).count() > 0);
check('session chip shows recording', await mgr.getByRole('tab', { name: /now/ }).count() > 0);
check('event list has "Opened Chrome"-style start and tab rows', await mgr.getByText(/Stripe webhooks guide/).count() > 0);
check('blocked page absent from timeline', await mgr.getByText(/Secret internal page/).count() === 0);
const slider = mgr.getByRole('slider', { name: /Scrub/ });
await mgr.getByRole('button', { name: /Opened .*Jump/ }).last().click();
await sleep(400);
const atStart = await slider.getAttribute('aria-valuetext');
await mgr.getByRole('button', { name: /Closed .*Jump/ }).last().click();
await sleep(400);
const atEnd = await slider.getAttribute('aria-valuetext');
check('scrubbing to an event changes what was open', /2 tabs open/.test(atStart) && /1 tabs open/.test(atEnd), `${atStart} -> ${atEnd}`);
await mgr.screenshot({ path: `${SHOTS}/timeline-dark.png`, fullPage: true });

// save as workspace from the timeline
await mgr.getByRole('button', { name: 'Save as workspace' }).click();
await mgr.getByText(/Saved \d+ tabs as/).waitFor({ timeout: 6000 }).then(() => check('timeline moment saved as a workspace', true), () => check('timeline moment saved as a workspace', false));

// ---------- Side panel (as a background tab inside the browsing window, like the real panel) ----------
await swEval(async () => { const w = await chrome.windows.create({ url: ['http://localhost:4597/t1', 'http://localhost:4597/t2', 'http://localhost:4597/t3'], focused: true }); globalThis.__l = w.id; });
await sleep(2500);
const [sp] = await Promise.all([
  ctx.waitForEvent('page'),
  swEval(() => chrome.tabs.create({ windowId: globalThis.__l, url: chrome.runtime.getURL('sidepanel.html'), active: false })),
]);
sp.on('pageerror', (e) => errors.push('sp: ' + String(e)));
await sp.waitForLoadState();
await sp.getByRole('heading', { name: /Open tabs/ }).waitFor();
await sleep(1200);

// + menu
await sp.getByRole('button', { name: /^Add .* to a workspace$/ }).first().click();
const menu = sp.getByRole('menu', { name: 'Choose a workspace' });
await menu.waitFor();
await sleep(600);
check('add-to-workspace menu lists workspaces', await menu.getByRole('menuitem').count() >= 2);
await sp.keyboard.press('Escape');
check('Escape closes the menu', await menu.count() === 0);

// suggestion
const hasSuggestion = await sp.getByText(/Group .* tabs about/).count();
if (!hasSuggestion) console.log('   PANEL:', (await sp.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 700));
check('side panel suggests grouping related tabs', hasSuggestion > 0);
if (hasSuggestion) {
  await sp.getByRole('button', { name: 'Create workspace' }).first().click();
  await sp.getByText(/Created /).waitFor({ timeout: 5000 }).then(() => check('suggestion creates workspace and makes it active', true), () => check('suggestion creates workspace and makes it active', false));
}
const activeId = await swEval(async () => (await chrome.storage.local.get('pepper_v2_settings')).pepper_v2_settings.activeWorkspaceId);
check('active workspace is set', !!activeId);

// add current tab to the active workspace
await swEval(async () => {
  const [t] = await chrome.tabs.query({ windowId: globalThis.__l, active: true });
  await chrome.tabs.update(t.id, { url: 'http://localhost:4597/a' });
});
await sleep(1800);
await sp.getByRole('button', { name: /Add current tab/ }).click();
await sleep(1500);
const activeWs = await mgr.evaluate(async (id) => {
  if (!id) return { tabs: [] };
  const db = await new Promise((res) => { const r = indexedDB.open('PepperDatabaseV2'); r.onsuccess = () => res(r.result); });
  return await new Promise((res) => { const g = db.transaction('sessions').objectStore('sessions').get(id); g.onsuccess = () => res(g.result); });
}, activeId);
check('current tab added to the active workspace', activeWs.tabs.some((t) => t.url.endsWith('/a')), `tabs=${activeWs.tabs.length}`);

// Pomodoro
await sp.getByRole('button', { name: /Start 25:00 focus/ }).click();
await sleep(1500);
const focusState = await swEval(async () => (await chrome.storage.local.get('pepper_active_focus_state')).pepper_active_focus_state);
check('pomodoro started from the side panel', focusState?.isRunning === true && focusState.activeSession.durationSeconds === 1500);
const badge = await swEval(() => chrome.action.getBadgeText({}));
check('toolbar badge shows minutes left', /^2[45]m$/.test(badge), `badge="${badge}"`);
const alarms = await swEval(async () => (await chrome.alarms.getAll()).map((a) => a.name));
check('end + tick alarms scheduled', alarms.includes('pepper_focus_end') && alarms.includes('pepper_focus_tick'), alarms.join(','));
await sp.screenshot({ path: `${SHOTS}/sidepanel-dark.png`, fullPage: true });

// finish with NO Pepper page needed: close the side panel page, age the timer
await sp.close();
await swEval(async () => {
  const cur = (await chrome.storage.local.get('pepper_active_focus_state')).pepper_active_focus_state;
  await chrome.storage.local.set({ pepper_active_focus_state: { ...cur, _startedAtWallClock: Date.now() - 26 * 60 * 1000 } });
});
await sleep(3000);
const after = await swEval(async () => (await chrome.storage.local.get('pepper_active_focus_state')).pepper_active_focus_state);
check('background completed the pomodoro with no page open', after?.isRunning === false);
const doneSession = await mgr.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('PepperDatabaseV2'); r.onsuccess = () => res(r.result); });
  const all = await new Promise((res) => { const g = db.transaction('focusSessions').objectStore('focusSessions').getAll(); g.onsuccess = () => res(g.result); });
  return all.map((f) => f.status);
});
check('focus session saved as completed', doneSession.includes('completed'), doneSession.join(','));
const badge2 = await swEval(() => chrome.action.getBadgeText({}));
check('badge no longer shows the timer', !/m$/.test(badge2), `badge="${badge2}"`);

// focus time on workspace + recap
await mgr.bringToFront();
await mgr.goto(`chrome-extension://${extId}/manager.html?view=timeline`);
await mgr.getByRole('heading', { name: 'Timeline' }).waitFor();
await sleep(800);
check('recap mentions focus time', await mgr.getByText(/You focused/).count() > 0);
await mgr.screenshot({ path: `${SHOTS}/timeline-recap.png`, fullPage: true });

// ---------- Interrupted session detection (browser ended without a clean close) ----------
const oldId = await mgr.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('PepperDatabaseV2'); r.onsuccess = () => res(r.result); });
  const all = await new Promise((res) => { const g = db.transaction('browserSessions').objectStore('browserSessions').getAll(); g.onsuccess = () => res(g.result); });
  const open = all.find((x) => x.endedAt === undefined);
  const old = Date.now() - 2 * 60 * 60 * 1000;
  await new Promise((res) => { const tx = db.transaction('browserSessions', 'readwrite'); tx.objectStore('browserSessions').put({ ...open, startedAt: old - 60000, lastEventAt: old }); tx.oncomplete = res; });
  return { id: open.id, old };
});
await swEval(async () => { await chrome.storage.session.remove(['pepper_recorder_boot', 'pepper_recorder_state_v1']); });
const cdp2 = await ctx.newCDPSession(mgr);
await cdp2.send('ServiceWorker.enable');
await cdp2.send('ServiceWorker.stopAllWorkers');
await sleep(800);
await mgr.evaluate(() => chrome.tabs.create({ url: 'about:blank', active: false }));
await sleep(4500);
const sessionsAfter = await mgr.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('PepperDatabaseV2'); r.onsuccess = () => res(r.result); });
  return await new Promise((res) => { const g = db.transaction('browserSessions').objectStore('browserSessions').getAll(); g.onsuccess = () => res(g.result); });
});
const interrupted = sessionsAfter.find((x) => x.id === oldId.id);
check('stale session is marked interrupted at its last heartbeat', interrupted?.endReason === 'interrupted' && interrupted.endedAt === oldId.old, JSON.stringify({ r: interrupted?.endReason, e: interrupted?.endedAt === oldId.old }));
check('a fresh session starts after the interruption', sessionsAfter.some((x) => x.id !== oldId.id && x.endedAt === undefined));
await mgr.goto(`chrome-extension://${extId}/manager.html?view=timeline`);
await mgr.getByRole('heading', { name: 'Timeline' }).waitFor();
await sleep(600);
check('timeline shows the current session', await mgr.getByRole('tab').count() >= 1);
const prev = mgr.getByRole('button', { name: 'Previous day' });
await mgr.evaluate(() => {});
await mgr.screenshot({ path: `${SHOTS}/timeline-after-interrupt.png`, fullPage: true });

// popup
const popup = await ctx.newPage();
await popup.setViewportSize({ width: 420, height: 640 });
await popup.goto(`chrome-extension://${extId}/popup.html`);
await sleep(1200);
check('popup has one-click Pomodoro start', await popup.getByRole('button', { name: /Start \d+:00 focus/ }).count() === 1);
await popup.getByRole('button', { name: /Choose tabs/ }).click();
await sleep(400);
check('popup has per-tab add-to-workspace buttons', await popup.getByRole('button', { name: /to a workspace$/ }).count() >= 1);
await popup.screenshot({ path: `${SHOTS}/popup-dark.png` });

// light theme timeline
await mgr.evaluate(async () => { const k = 'pepper_v2_settings'; const cur = (await chrome.storage.local.get(k))[k]; await chrome.storage.local.set({ [k]: { ...cur, theme: 'light' } }); });
await sleep(500);
await mgr.screenshot({ path: `${SHOTS}/timeline-light.png`, fullPage: true });

check('no uncaught page errors', errors.length === 0, errors.join(' | '));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
await ctx.close(); server.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
