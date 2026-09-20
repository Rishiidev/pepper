import { TimelineEvent, BrowserSession } from '../types/timeline';
import { FocusSession } from '../types/focus-session';
import { PepperTab } from '../types/session';
import { baseDomain } from './session-naming';

export interface OpenTab {
  tabId: number;
  windowId?: number;
  url: string;
  title: string;
  openedAt: number;
}

export interface ReplayResult {
  tabs: OpenTab[];
  activeTabId: number | null;
  idle: boolean;
}

const bySeq = (a: TimelineEvent, b: TimelineEvent) => a.ts - b.ts || (a.id ?? 0) - (b.id ?? 0);

/** What was open at moment `t` of one browser session, rebuilt from its events. */
export function tabsOpenAt(events: TimelineEvent[], t: number): ReplayResult {
  const open = new Map<number, OpenTab>();
  let activeTabId: number | null = null;
  let idle = false;

  for (const e of [...events].sort(bySeq)) {
    if (e.ts > t) break;
    switch (e.type) {
      case 'session_start':
        open.clear();
        activeTabId = null;
        break;
      case 'tab_open':
        if (e.tabId !== undefined && e.url) {
          open.set(e.tabId, { tabId: e.tabId, windowId: e.windowId, url: e.url, title: e.title || e.url, openedAt: e.ts });
        }
        break;
      case 'tab_navigate': {
        const cur = e.tabId !== undefined ? open.get(e.tabId) : undefined;
        if (cur && e.url) open.set(cur.tabId, { ...cur, url: e.url, title: e.title || e.url });
        break;
      }
      case 'tab_switch':
        if (e.tabId !== undefined) activeTabId = e.tabId;
        break;
      case 'tab_close':
        if (e.tabId !== undefined) {
          open.delete(e.tabId);
          if (activeTabId === e.tabId) activeTabId = null;
        }
        break;
      case 'session_end':
        open.clear();
        activeTabId = null;
        break;
      case 'idle_start':
        idle = true;
        break;
      case 'idle_end':
        idle = false;
        break;
    }
  }
  return { tabs: [...open.values()].sort((a, b) => a.openedAt - b.openedAt), activeTabId, idle };
}

export function toPepperTabs(tabs: OpenTab[]): PepperTab[] {
  return tabs.map((t, index) => ({ url: t.url, title: t.title, favIconUrl: '', index }));
}

/** Events worth showing as rows (active-time segments are folded into durations). */
export function visibleEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(bySeq).filter((e) => e.type !== 'tab_active');
}

/** Human labels for the day view. */
export function describeEvent(e: TimelineEvent): string {
  const host = (() => {
    try {
      return e.url ? new URL(e.url).hostname.replace(/^www\./, '') : '';
    } catch {
      return '';
    }
  })();
  const name = e.title || host || 'a tab';
  switch (e.type) {
    case 'session_start':
      return e.reason === 'startup' ? 'Opened Chrome' : e.reason === 'enabled' ? 'Started recording' : 'Opened a window';
    case 'session_end':
      return e.reason === 'interrupted' ? 'Chrome closed unexpectedly' : 'Closed Chrome';
    case 'tab_open':
      return `Opened ${name}`;
    case 'tab_navigate':
      return `Went to ${name}`;
    case 'tab_switch':
      return `Switched to ${name}`;
    case 'tab_close':
      return `Closed ${name}`;
    case 'idle_start':
      return e.reason === 'locked' ? 'Screen locked' : 'Went away';
    case 'idle_end':
      return 'Came back';
    default:
      return e.type;
  }
}

// ---------- day view ----------

export function dayBounds(ts: number): { from: number; to: number } {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const from = d.getTime();
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  return { from, to: next.getTime() };
}

/** Sessions that overlap the given day. */
export function sessionsOnDay(sessions: BrowserSession[], dayTs: number): BrowserSession[] {
  const { from, to } = dayBounds(dayTs);
  return sessions
    .filter((s) => s.startedAt < to && (s.endedAt ?? s.lastEventAt) >= from)
    .sort((a, b) => a.startedAt - b.startedAt);
}

// ---------- recap ----------

export interface DomainTime {
  domain: string;
  label: string;
  ms: number;
}

export interface Recap {
  activeMs: number;
  focusSeconds: number;
  tabsOpened: number;
  sessionCount: number;
  awayMs: number;
  topDomains: DomainTime[];
  sentence: string;
}

const SUBDOMAIN_LABELS = new Set(['docs', 'developer', 'developers', 'support', 'help', 'blog', 'api', 'dashboard']);

/** "docs.stripe.com" → "Stripe docs", "linear.app" → "Linear" */
export function domainLabel(hostname: string): string {
  const host = hostname.replace(/^www\./, '').toLowerCase();
  const base = baseDomain(host);
  const name = base.split('.')[0];
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  const sub = host === base ? '' : host.slice(0, host.length - base.length - 1).split('.').pop() || '';
  return SUBDOMAIN_LABELS.has(sub) ? `${label} ${sub}` : label;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 1) return 'under a minute';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** Short form for stat tiles: "<1m", "45m", "3h 10m". */
export function formatDurationCompact(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 1) return '<1m';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function joinNames(names: string[]): string {
  return names.length <= 1 ? names[0] || '' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Summarizes a set of events (already limited to the range) plus focus sessions. */
export function buildRecap(events: TimelineEvent[], focus: FocusSession[], range: { from: number; to: number }): Recap {
  const perDomain = new Map<string, { label: string; ms: number }>();
  let activeMs = 0;
  let tabsOpened = 0;
  let awayMs = 0;
  let idleSince: number | null = null;
  const sessionIds = new Set<string>();

  for (const e of [...events].sort(bySeq)) {
    if (e.ts < range.from || e.ts >= range.to) continue;
    sessionIds.add(e.sessionId);
    if (e.type === 'tab_open') tabsOpened++;
    if (e.type === 'idle_start') idleSince = e.ts;
    if ((e.type === 'idle_end' || e.type === 'session_end') && idleSince !== null) {
      awayMs += Math.max(0, e.ts - idleSince);
      idleSince = null;
    }
    if (e.type === 'tab_active' && e.spentMs && e.url) {
      activeMs += e.spentMs;
      try {
        const host = new URL(e.url).hostname;
        const key = domainLabel(host);
        const cur = perDomain.get(key) ?? { label: key, ms: 0 };
        cur.ms += e.spentMs;
        perDomain.set(key, cur);
      } catch {
        // skip unparsable urls
      }
    }
  }

  const topDomains = [...perDomain.entries()]
    .map(([domain, v]) => ({ domain, label: v.label, ms: v.ms }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 5);

  const focusSeconds = focus
    .filter((f) => f.status === 'completed' && f.startedAt >= range.from && f.startedAt < range.to)
    .reduce((a, f) => a + f.elapsedSeconds, 0);

  const names = topDomains.slice(0, 2).map((d) => d.label);
  let sentence = 'No activity recorded yet.';
  if (focusSeconds > 0) {
    sentence = `You focused ${formatDuration(focusSeconds * 1000)}${names.length ? `, mostly on ${joinNames(names)}` : ''}.`;
  } else if (activeMs > 0) {
    sentence = `You were active ${formatDuration(activeMs)}${names.length ? `, mostly on ${joinNames(names)}` : ''}.`;
  }

  return { activeMs, focusSeconds, tabsOpened, sessionCount: sessionIds.size, awayMs, topDomains, sentence };
}

/** Active milliseconds per hour of the given day (24 values), for sparklines. */
export function hourlyActivity(events: TimelineEvent[], dayFrom: number): number[] {
  const buckets = new Array<number>(24).fill(0);
  for (const e of events) {
    if (e.type !== 'tab_active' || !e.spentMs) continue;
    const h = Math.floor((e.ts - dayFrom) / 3_600_000);
    if (h >= 0 && h < 24) buckets[h] += e.spentMs;
  }
  return buckets;
}

export interface HourGroup {
  hourStart: number;
  events: TimelineEvent[];
}

/** Groups events under the clock hour they happened in, oldest first. */
export function groupByHour(events: TimelineEvent[]): HourGroup[] {
  const groups = new Map<number, TimelineEvent[]>();
  for (const e of events) {
    const d = new Date(e.ts);
    d.setMinutes(0, 0, 0);
    const key = d.getTime();
    groups.set(key, [...(groups.get(key) || []), e]);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([hourStart, evs]) => ({ hourStart, events: evs }));
}

/** Tick spacing that keeps an axis readable: about 4 to 12 ticks. */
export function tickInterval(rangeMs: number): number {
  const MIN = 60_000;
  const steps = [5 * MIN, 15 * MIN, 30 * MIN, 60 * MIN, 120 * MIN, 180 * MIN, 360 * MIN];
  return steps.find((s) => rangeMs / s <= 12) ?? steps[steps.length - 1];
}

/** Timestamps of ticks within [from, to], aligned to the interval. */
export function axisTicks(from: number, to: number): number[] {
  const step = tickInterval(to - from);
  const first = Math.ceil(from / step) * step;
  const out: number[] = [];
  for (let t = first; t <= to; t += step) out.push(t);
  // A very short range has no aligned tick: label its two ends instead
  return out.length >= 2 ? out : [from, to];
}
