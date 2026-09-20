/**
 * Design quality gates, checked in a real browser in both themes:
 *  - axe (WCAG 2.x A/AA): no serious or critical violations
 *  - no text under 12px
 *  - at most one red primary action per view
 *  - no horizontal scrolling at phone width
 * Screenshots land in $TMPDIR/pepper-quality-shots for review.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.output/chrome-mv3');
const OUT = path.join(os.tmpdir(), 'pepper-quality-shots');
fs.mkdirSync(OUT, { recursive: true });

const titles = { '/a': 'Stripe webhooks guide', '/b': 'Verify stripe webhooks signature', '/c': 'Testing stripe webhooks locally', '/t1': 'Tokyo ramen spots', '/t2': 'Tokyo rail pass guide', '/t3': 'Tokyo skyline night photos' };
const server = http.createServer((q, r) => { const t = titles[q.url.split('?')[0]] || 'Other'; r.setHeader('content-type', 'text/html'); r.end(`<!doctype html><title>${t}</title><h1>${t}</h1>`); }).listen(4593);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
let checks = 0;
const check = (name, ok, extra = '') => { checks++; if (!ok) failures.push(`${name} ${extra}`); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`); };

/** Controls must not be cut off, run past the viewport or card padding, or sit on top of other content. */
async function cropAudit(page, label) {
  const issues = await page.evaluate(() => {
    const out = [];
    const vw = window.innerWidth;
    // content inside a closed <details> is not on screen
    const collapsed = (el) => { const d = el.closest('details:not([open])'); return !!d && !el.closest('summary'); };
    const visible = (el) => (el.offsetParent || getComputedStyle(el).position === 'fixed') && !el.closest('.sr-only, .sr-only-focusable, [hidden]') && !collapsed(el) && el.getBoundingClientRect().width > 0;
    const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 28);
    const controls = [...document.querySelectorAll('button, a[href], select, input:not([type=file]), [role=radio], [role=switch]')].filter(visible);
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 0.5 || r.left < -0.5) out.push(`${name(el)}: outside the viewport`);
      const card = el.parentElement?.closest('[class*="rounded-card"], [class*="rounded-[20px]"]');
      if (card) {
        const cr = card.getBoundingClientRect();
        const pad = parseFloat(getComputedStyle(card).paddingRight) || 0;
        if (r.right > cr.right - pad + 1 && r.width < cr.width - 2 * pad) out.push(`${name(el)}: past the card padding by ${Math.round(r.right - (cr.right - pad))}px`);
        if (r.right > cr.right + 0.5) out.push(`${name(el)}: cut off by the card edge`);
      }
      if (!['INPUT', 'SELECT'].includes(el.tagName) && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') out.push(`${name(el)}: text clipped`);
    }
    // overlap: a control over another control or over text that is not its own
    const texts = [...document.querySelectorAll('p, h1, h2, h3, span, li, label, time, dt, dd')].filter((t) => visible(t) && [...t.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
    for (const c of controls) {
      const cr = c.getBoundingClientRect();
      for (const o of controls) if (o !== c && !c.contains(o) && !o.contains(c) && hit(cr, o.getBoundingClientRect()) && name(c) < name(o)) out.push(`${name(c)} overlaps ${name(o)}`);
      for (const t of texts) if (!c.contains(t) && !t.contains(c) && hit(cr, t.getBoundingClientRect())) out.push(`${name(c)} overlaps text "${t.textContent.trim().slice(0, 20)}"`);
    }
    return [...new Set(out)].slice(0, 6);
  });
  check(`no cropped or overlapping controls: ${label}`, issues.length === 0, issues.join(' | '));
}

async function scan(page, label, { design = false } = {}) {
  await page.evaluate(AXE);
  const axe = await page.evaluate(async () => {
    const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} (${v.nodes.length}) e.g. ${v.nodes[0]?.target?.join(' ')}`);
  });
  check(`axe: ${label}`, axe.length === 0, axe.join(' | '));

  const small = await page.evaluate(() => {
    const bad = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || el.closest('.sr-only, [aria-hidden=true], script, style')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.offsetParent === null && cs.position !== 'fixed') continue;
      if (parseFloat(cs.fontSize) < 11.95) bad.add(`${parseFloat(cs.fontSize)}px "${n.textContent.trim().slice(0, 24)}"`);
    }
    return [...bad].slice(0, 4);
  });
  check(`min 12px text: ${label}`, small.length === 0, small.join(' | '));

  if (!design) {
    const reds = await page.evaluate(() => [...document.querySelectorAll('button, a')].filter((b) => b.offsetParent && getComputedStyle(b).backgroundColor === 'rgb(216, 50, 43)').map((b) => b.textContent.trim().slice(0, 24)));
    check(`one red primary: ${label}`, reds.length <= 1, reds.join(' | '));
  }
}

for (const scheme of ['light', 'dark']) {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync('/tmp/pepper-quality-'), {
    channel: 'chromium', headless: true, colorScheme: scheme,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host;
  await sw.evaluate(async () => { const s = (await chrome.storage.local.get('pepper_v2_settings')).pepper_v2_settings || {}; await chrome.storage.local.set({ pepper_v2_settings: { ...s, hasCompletedOnboarding: true, sessionTrackingEnabled: true } }); });
  await sleep(800);
  const mk = async (urls) => { await sw.evaluate(async (u) => { const w = await chrome.windows.create({ url: u, focused: true }); globalThis.__w = w.id; }, urls); await sleep(2500); await sw.evaluate(() => chrome.windows.remove(globalThis.__w)); await sleep(2000); };
  await mk(['http://localhost:4593/a', 'http://localhost:4593/b', 'http://localhost:4593/c']);
  await mk(['http://localhost:4593/t1', 'http://localhost:4593/t2', 'http://localhost:4593/t3']);
  await sw.evaluate(async () => { await chrome.windows.create({ url: ['http://localhost:4593/a', 'http://localhost:4593/t1', 'http://localhost:4593/t2'], focused: true }); });
  await sleep(2500);

  const open = async (rel, w, h) => {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: h });
    await p.goto(`chrome-extension://${id}/${rel}`);
    await sleep(1400);
    return p;
  };
  const shot = (p, name) => p.screenshot({ path: path.join(OUT, `${name}-${scheme}.png`), fullPage: true });

  // spacing: padding matches radius, page edge equals card gap, header glyphs align with the card edge
  const spacing = async (p, label, cardSel) => {
    const m = await p.evaluate((sel) => {
      const card = document.querySelector(sel);
      const cs = getComputedStyle(card);
      const cr = card.getBoundingClientRect();
      const hdr = document.querySelector('header');
      const glyph = [...hdr.querySelectorAll('button svg')].pop()?.getBoundingClientRect();
      const next = card.nextElementSibling?.getBoundingClientRect();
      return {
        pad: parseFloat(cs.paddingLeft), radius: parseFloat(cs.borderTopLeftRadius), left: cr.left, right: window.innerWidth - cr.right,
        glyphOff: glyph ? Math.abs(glyph.right - cr.right) : null, gap: next ? next.top - cr.bottom : null,
      };
    }, cardSel);
    check(`compact card padding 20 / radius 20: ${label}`, m.pad === 20 && m.radius === 20, JSON.stringify(m));
    check(`outer padding 16 (not tighter than the card): ${label}`, m.left >= 16 && m.right >= 16, JSON.stringify(m));
    check(`header glyphs align with the card edge: ${label}`, m.glyphOff !== null && m.glyphOff <= 1.5, `off by ${m.glyphOff}px`);
    check(`gap between cards is 16: ${label}`, m.gap === 16, `gap ${m.gap}`);
  };

  // popup and side panel (both 400px wide)
  let p = await open('popup.html', 400, 720); await scan(p, `popup ${scheme}`); await spacing(p, `popup ${scheme}`, '[data-testid=save-card]'); await shot(p, 'popup'); await p.close();
  await cropAudit(await (async () => { const q = await open('popup.html', 400, 720); return q; })(), `popup @400 ${scheme}`);
  p = await open('sidepanel.html', 400, 900); await scan(p, `sidepanel ${scheme}`); await spacing(p, `sidepanel ${scheme}`, 'main > section'); await shot(p, 'sidepanel'); await p.close();
  // Chrome lets people drag the side panel narrow: nothing may crop or overlap down to 280px
  for (const w of [280, 320, 360, 400, 480]) { p = await open('sidepanel.html', w, 900); await cropAudit(p, `sidepanel @${w} ${scheme}`); await p.close(); }

  // design page
  p = await open('manager.html?view=design', 1280, 900); await scan(p, `design page ${scheme}`, { design: true }); await p.close();

  // dashboard at three widths
  for (const w of [1280, 768, 400, 320]) {
    for (const view of ['home', 'workspaces', 'timeline', 'focus', 'settings']) {
      p = await open(`manager.html?view=${view}`, w, 900);
      await scan(p, `${view} @${w} ${scheme}`);
      await cropAudit(p, `${view} @${w} ${scheme}`);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`no horizontal scroll: ${view} @${w} ${scheme}`, overflow <= 1, `overflow ${overflow}px`);
      if (view === 'home' || view === 'workspaces') {
        const dash = await p.evaluate(() => { const c = [...document.querySelectorAll('main .rounded-card')].find((e) => e.offsetParent); if (!c) return null; const cs = getComputedStyle(c); return { pad: parseFloat(cs.paddingLeft), radius: parseFloat(cs.borderTopLeftRadius) }; });
        check(`dashboard card padding 24 / radius 24: ${view} @${w} ${scheme}`, !dash || (dash.pad === 24 && dash.radius === 24), JSON.stringify(dash));
      }
      await shot(p, `${view}-${w}`);
      if (view === 'timeline' && w === 1280) {
        for (const sub of ['History', 'Insights']) {
          await p.getByRole('radio', { name: sub }).click();
          await sleep(900);
          await scan(p, `timeline ${sub} @${w} ${scheme}`);
        }
      }
      await p.close();
    }
  }
  await ctx.close();
}

server.close();
console.log(`\n${checks - failures.length}/${checks} passed. Screenshots: ${OUT}`);
if (failures.length) console.log('\nFAILURES:\n' + failures.map((f) => ' - ' + f).join('\n'));
process.exit(failures.length ? 1 : 0);
