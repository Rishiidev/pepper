/**
 * Native tasks, end to end in a real Chromium with the built extension:
 *  - add a task from a workspace card, see the open count on the card
 *  - add and complete tasks from the popup
 *  - start a focus session for a task, finish it, and mark the task done from the prompt
 *  - browsing stays quiet: no task UI is injected into ordinary pages
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.output/chrome-mv3');
const server = http.createServer((_q, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><title>Plain page</title><h1>Plain page</h1>'); }).listen(4599);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
const check = (name, ok, extra = '') => { if (!ok) failures.push(name); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`); };

const ctx = await chromium.launchPersistentContext(fs.mkdtempSync('/tmp/pepper-e2e-tasks-'), {
  channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  viewport: { width: 1280, height: 900 },
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const extId = new URL(sw.url()).host;
const errors = [];

/** Reads a whole object store from the extension's IndexedDB. */
const readStore = (page, store) => page.evaluate(async (name) => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('PepperDatabaseV2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return new Promise((res) => { const g = db.transaction(name).objectStore(name).getAll(); g.onsuccess = () => res(g.result); });
}, store);

// ---------- Workspace card ----------
const mgr = await ctx.newPage();
mgr.on('pageerror', (e) => errors.push('mgr: ' + String(e)));
await mgr.goto(`chrome-extension://${extId}/manager.html`);
await mgr.waitForSelector('[role=dialog]');
await mgr.getByRole('button', { name: 'Skip for now' }).click();

await mgr.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open('PepperDatabaseV2'); r.onsuccess = () => res(r.result); });
  const now = Date.now();
  await new Promise((res) => {
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').put({
      id: 'ws_e2e', name: 'E2E Work', tabs: [{ url: 'http://localhost:4599/a', title: 'Plain page', favIconUrl: '', index: 0, pinned: false }],
      tabCount: 1, createdAt: now, updatedAt: now, isFavorite: false, isPinned: false, projectName: 'General', captureType: 'manual', urlHash: 'e2e',
    });
    tx.oncomplete = res;
  });
});
await mgr.reload();
await mgr.getByRole('button', { name: /^Workspaces$/ }).first().click();
const card = mgr.getByTestId('workspace-card').filter({ hasText: 'E2E Work' });
await card.waitFor();
check('card has a Tasks toggle and no count yet', (await card.getByTestId('workspace-tasks-toggle').innerText()).trim() === 'Tasks');

await card.getByTestId('workspace-tasks-toggle').click();
await card.getByLabel('Add a task to E2E Work', { exact: true }).fill('  Draft   the launch post ');
await card.getByLabel('Add a task to E2E Work', { exact: true }).press('Enter');
await card.getByText('Draft the launch post').waitFor();
check('task added from the workspace card (whitespace cleaned)', true);
check('card shows the open count', (await card.getByTestId('workspace-tasks-toggle').innerText()).trim() === '1');

let tasks = await readStore(mgr, 'tasks');
check('task stored with its workspace', tasks.length === 1 && tasks[0].workspaceId === 'ws_e2e' && tasks[0].done === false, JSON.stringify(tasks));

// ---------- Popup ----------
const popup = await ctx.newPage();
popup.on('pageerror', (e) => errors.push('popup: ' + String(e)));
await popup.setViewportSize({ width: 400, height: 900 });
await popup.goto(`chrome-extension://${extId}/popup.html`);
const tasksCard = popup.getByTestId('tasks-card');
await tasksCard.waitFor();
check('popup lists the task added elsewhere (live, no reload)', await tasksCard.getByText('Draft the launch post').isVisible());

await tasksCard.getByLabel('Add a task', { exact: true }).fill('Reply to Sam');
await tasksCard.getByLabel('Add a task', { exact: true }).press('Enter');
await tasksCard.getByText('Reply to Sam').waitFor();
check('quick add in the popup', true);

// The manager updates on its own too
await mgr.bringToFront();
await card.getByText('Draft the launch post').waitFor();
check('workspace card count reflects the popup (tasks table shared)', (await card.getByTestId('workspace-tasks-toggle').innerText()).trim() === '1');
await popup.bringToFront();

await tasksCard.getByRole('checkbox', { name: 'Complete: Reply to Sam' }).click();
await sleep(300);
tasks = await readStore(popup, 'tasks');
const sam = tasks.find((t) => t.title === 'Reply to Sam');
check('completing in the popup marks it done with a timestamp', sam?.done === true && typeof sam.doneAt === 'number');
check('done task leaves the open list', !(await tasksCard.getByText('Reply to Sam').isVisible().catch(() => false)));

// ---------- Focus on a task, then mark it done ----------
await tasksCard.getByRole('button', { name: 'Focus on Draft the launch post' }).click();
const focusCard = popup.getByTestId('focus-card');
await focusCard.getByText('Task: Draft the launch post').waitFor();
check('running focus card names the task', true);
let sessions = await readStore(popup, 'focusSessions');
check('focus session records the task and attaches to its workspace', sessions.length === 1 && sessions[0].taskTitle === 'Draft the launch post' && sessions[0].sessionId === 'ws_e2e', JSON.stringify(sessions[0]));

await focusCard.getByRole('button', { name: 'Finish focus session now' }).click();
const prompt = popup.getByTestId('focus-task-prompt');
await prompt.waitFor({ timeout: 10000 });
check('finishing offers to mark the task done', (await prompt.innerText()).includes('Draft the launch post'));
await prompt.getByRole('button', { name: 'Mark done' }).click();
await sleep(300);
tasks = await readStore(popup, 'tasks');
check('Mark done completes the task', tasks.find((t) => t.title === 'Draft the launch post')?.done === true);
check('prompt goes away after answering', !(await prompt.isVisible().catch(() => false)));

// "Not yet" leaves the task open and does not nag again
await popup.getByLabel('Add a task', { exact: true }).fill('Second task');
await popup.getByLabel('Add a task', { exact: true }).press('Enter');
await tasksCard.getByText('Second task').waitFor();
await popup.getByLabel('Task to focus on').selectOption({ label: 'Second task' });
await popup.getByRole('button', { name: /^Start \d+:00 focus$/ }).click();
await focusCard.getByText('Task: Second task').waitFor();
await focusCard.getByRole('button', { name: 'Finish focus session now' }).click();
await prompt.waitFor({ timeout: 10000 });
await prompt.getByRole('button', { name: 'Not yet' }).click();
await sleep(300);
tasks = await readStore(popup, 'tasks');
check('"Not yet" keeps the task open', tasks.find((t) => t.title === 'Second task')?.done === false);
await popup.reload();
await tasksCard.waitFor();
check('dismissed prompt does not come back', !(await popup.getByTestId('focus-task-prompt').isVisible().catch(() => false)));

// ---------- Browsing stays quiet ----------
const page = await ctx.newPage();
await page.goto('http://localhost:4599/');
await sleep(800);
const injected = await page.evaluate(() => document.body.innerText.trim() + '|' + document.querySelectorAll('[id*=pepper], [class*=pepper], [data-pepper]').length);
check('ordinary pages get no task UI', injected === 'Plain page|0', injected);

check('no page errors', errors.length === 0, errors.join(' | '));
await ctx.close();
server.close();
console.log(failures.length ? `\n${failures.length} FAILED` : '\nAll task checks passed');
process.exit(failures.length ? 1 : 0);
