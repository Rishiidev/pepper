import { describe, it, expect } from 'vitest';
import { hourlyActivity, tabsOpenAt, buildRecap, domainLabel, formatDuration, sessionsOnDay, describeEvent } from '../timeline-replay';
import { TimelineEvent } from '../../types/timeline';
import { FocusSession } from '../../types/focus-session';

const SEC = 1000;
const MIN = 60 * SEC;
const ev = (ts: number, type: TimelineEvent['type'], f: Partial<TimelineEvent> = {}): TimelineEvent => ({ sessionId: 's', ts, type, ...f });

const events: TimelineEvent[] = [
  ev(0, 'session_start', { reason: 'startup' }),
  ev(1 * MIN, 'tab_open', { tabId: 1, url: 'https://github.com/a', title: 'GitHub' }),
  ev(2 * MIN, 'tab_open', { tabId: 2, url: 'https://figma.com/x', title: 'Figma' }),
  ev(2 * MIN, 'tab_switch', { tabId: 2, url: 'https://figma.com/x' }),
  ev(3 * MIN, 'tab_navigate', { tabId: 1, url: 'https://github.com/b', title: 'GitHub B' }),
  ev(4 * MIN, 'tab_close', { tabId: 2, url: 'https://figma.com/x' }),
  ev(10 * MIN, 'session_end', { reason: 'clean' }),
];

describe('tabsOpenAt', () => {
  it('rebuilds the open tabs at any moment', () => {
    expect(tabsOpenAt(events, 30 * SEC).tabs).toHaveLength(0);
    expect(tabsOpenAt(events, 2.5 * MIN).tabs.map((t) => t.title)).toEqual(['GitHub', 'Figma']);
    const later = tabsOpenAt(events, 5 * MIN);
    expect(later.tabs.map((t) => t.url)).toEqual(['https://github.com/b']);
    expect(later.activeTabId).toBeNull();
  });
  it('tracks the active tab and empties after the session ends', () => {
    expect(tabsOpenAt(events, 3 * MIN).activeTabId).toBe(2);
    expect(tabsOpenAt(events, 11 * MIN).tabs).toHaveLength(0);
  });
  it('does not depend on input order', () => {
    expect(tabsOpenAt([...events].reverse(), 2.5 * MIN).tabs).toHaveLength(2);
  });
});

describe('recap', () => {
  const day = { from: 0, to: 24 * 60 * MIN };
  const active: TimelineEvent[] = [
    ev(1, 'tab_active', { url: 'https://docs.stripe.com/a', spentMs: 60 * MIN }),
    ev(2, 'tab_active', { url: 'https://linear.app/x', spentMs: 40 * MIN }),
    ev(3, 'tab_active', { url: 'https://news.ycombinator.com', spentMs: 5 * MIN }),
    ev(4, 'tab_open', { tabId: 1, url: 'https://a.com' }),
    ev(5, 'idle_start'),
    ev(5 + 20 * MIN, 'idle_end'),
  ];
  const focus = [{ status: 'completed', startedAt: 10, elapsedSeconds: 3 * 3600 + 10 * 60 }] as FocusSession[];

  it('writes the sentence from focus time and top domains', () => {
    const r = buildRecap(active, focus, day);
    expect(r.sentence).toBe('You focused 3h 10m, mostly on Stripe docs and Linear.');
    expect(r.activeMs).toBe(105 * MIN);
    expect(r.tabsOpened).toBe(1);
    expect(r.awayMs).toBe(20 * MIN);
  });
  it('falls back to active time when no focus session ran', () => {
    expect(buildRecap(active, [], day).sentence).toBe('You were active 1h 45m, mostly on Stripe docs and Linear.');
  });
  it('handles an empty day', () => {
    expect(buildRecap([], [], day).sentence).toBe('No activity recorded yet.');
  });
  it('ignores events outside the range', () => {
    expect(buildRecap(active, [], { from: 10 * 60 * MIN, to: 11 * 60 * MIN }).activeMs).toBe(0);
  });
});

describe('helpers', () => {
  it('labels domains', () => {
    expect(domainLabel('docs.stripe.com')).toBe('Stripe docs');
    expect(domainLabel('www.linear.app')).toBe('Linear');
    expect(domainLabel('github.com')).toBe('Github');
  });
  it('formats durations', () => {
    expect(formatDuration(20 * SEC)).toBe('under a minute');
    expect(formatDuration(125 * MIN)).toBe('2h 5m');
    expect(formatDuration(60 * MIN)).toBe('1h');
  });
  it('finds sessions on a day', () => {
    const day = new Date(2026, 6, 1, 12).getTime();
    const s = [
      { id: 'a', startedAt: new Date(2026, 6, 1, 9).getTime(), endedAt: new Date(2026, 6, 1, 17).getTime(), lastEventAt: 0, startReason: 'startup' as const },
      { id: 'b', startedAt: new Date(2026, 6, 3, 9).getTime(), lastEventAt: new Date(2026, 6, 3, 10).getTime(), startReason: 'startup' as const },
    ];
    expect(sessionsOnDay(s, day).map((x) => x.id)).toEqual(['a']);
  });
  it('describes events for the day view', () => {
    expect(describeEvent(ev(0, 'session_start', { reason: 'startup' }))).toBe('Opened Chrome');
    expect(describeEvent(ev(0, 'session_end', { reason: 'interrupted' }))).toBe('Chrome closed unexpectedly');
    expect(describeEvent(ev(0, 'tab_switch', { title: 'Figma' }))).toBe('Switched to Figma');
  });
});

describe('hourlyActivity', () => {
  it('buckets active time by hour', () => {
    const from = 0;
    const evs = [ev(30 * MIN, 'tab_active', { spentMs: 5 * MIN }), ev(90 * MIN, 'tab_active', { spentMs: 2 * MIN }), ev(95 * MIN, 'tab_active', { spentMs: MIN })];
    const b = hourlyActivity(evs, from);
    expect(b).toHaveLength(24);
    expect(b[0]).toBe(5 * MIN);
    expect(b[1]).toBe(3 * MIN);
  });
});
