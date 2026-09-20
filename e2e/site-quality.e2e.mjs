/** Builds nothing: serves website/dist under /pepper/ and checks it in a real browser (both themes, phone and desktop). */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../website/dist');
const OUT = path.join(os.tmpdir(), 'pepper-site-shots');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]).replace(/^\/pepper/, '') || '/';
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream');
  r.end(fs.readFileSync(f));
}).listen(4591);

const browser = await chromium.launch({ channel: 'chromium', headless: true });
const failures = [];
let checks = 0;
const check = (n, ok, e = '') => { checks++; if (!ok) failures.push(`${n} ${e}`); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n} ${ok ? '' : e}`); };

for (const scheme of ['light', 'dark']) {
  for (const [w, h] of [[1280, 900], [390, 800]]) {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('requestfailed', (r) => errors.push('failed ' + r.url()));
    await page.goto('http://localhost:4591/pepper/');
    await page.waitForLoadState('networkidle');
    const label = `${scheme} @${w}`;
    await page.evaluate(AXE);
    const axe = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id} (${v.nodes.length}) ${v.nodes[0]?.target?.join(' ')}`));
    check(`site axe ${label}`, axe.length === 0, axe.join(' | '));
    const small = await page.evaluate(() => { const bad = new Set(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; if (el.closest('.sr-only, [aria-hidden=true]')) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 11.95) bad.add(`${fs}px ${n.textContent.trim().slice(0, 20)}`); } return [...bad].slice(0, 3); });
    check(`site min 12px ${label}`, small.length === 0, small.join(' | '));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`site no horizontal scroll ${label}`, overflow <= 1, `${overflow}px`);
    check(`site no errors ${label}`, errors.length === 0, errors.join(' | '));
    if (w === 1280) check(`site has install CTA ${label}`, (await page.getByRole('link', { name: /Get Pepper/ }).count()) >= 2);
    await page.screenshot({ path: path.join(OUT, `site-${scheme}-${w}.png`), fullPage: true });
    await ctx.close();
  }
}
await browser.close(); server.close();
console.log(`\n${checks - failures.length}/${checks} passed. Screenshots: ${OUT}`);
if (failures.length) console.log('FAILURES:\n' + failures.map((f) => ' - ' + f).join('\n'));
process.exit(failures.length ? 1 : 0);
