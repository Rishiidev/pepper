import { describe, it, expect } from 'vitest';
import { RecorderCore, emptyRecorderState } from '../recorder-core';
import { isTrackedUrl } from '../tracking-policy';
import { TimelineEvent } from '../../types/timeline';

const SEC = 1000;
const MIN = 60 * SEC;
let n = 0;
const make = (blocklist: string[] = []) => {
  n = 0;
  const events: TimelineEvent[] = [];
  const core = new RecorderCore(emptyRecorderState(), (u) => isTrackedUrl(u, blocklist), () => `s${++n}`);
  const feed = (evs: TimelineEvent[]) => { events.push(...evs); return evs; };
  return { core, events, feed };
};
const spent = (events: TimelineEvent[], url?: string) =>
  events.filter((e) => e.type === 'tab_active' && (!url || e.url === url)).reduce((a, e) => a + (e.spentMs || 0), 0);
const types = (events: TimelineEvent[]) => events.map((e) => e.type);

describe('RecorderCore', () => {
  it('records open, active time and close for a simple visit', () => {
    const { core, events, feed } = make();
    feed(core.startSession(0, 'startup'));
    feed(core.windowFocused(0, 1));
    feed(core.tabCreated(1 * SEC, { id: 10, windowId: 1, active: true }));
    feed(core.tabUpdated(2 * SEC, { id: 10, windowId: 1, url: 'https://github.com/a', title: 'A', status: 'complete' }));
    feed(core.tabRemoved(62 * SEC, 10, 1));
    expect(types(events)).toEqual(['session_start', 'tab_open', 'tab_active', 'tab_close']);
    expect(spent(events, 'https://github.com/a')).toBe(60 * SEC);
  });

  it('splits time between tabs on switch and logs the switch', () => {
    const { core, events, feed } = make();
    feed(core.startSession(0, 'startup'));
    feed(core.windowFocused(0, 1));
    feed(core.tabUpdated(0, { id: 1, windowId: 1, url: 'https://a.com', title: 'A', status: 'complete' }));
    feed(core.tabUpdated(0, { id: 2, windowId: 1, url: 'https://b.com', title: 'B', status: 'complete' }));
    feed(core.tabActivated(0, 1, 1));
    feed(core.tabActivated(30 * SEC, 2, 1));
    feed(core.tabActivated(50 * SEC, 1, 1));
    feed(core.endSession(60 * SEC, 'clean'));
    expect(spent(events, 'https://a.com')).toBe(40 * SEC);
    expect(spent(events, 'https://b.com')).toBe(20 * SEC);
    expect(events.filter((e) => e.type === 'tab_switch')).toHaveLength(3);
    expect(events.at(-1)?.type).toBe('session_end');
  });

  it('records navigation and credits time to the old url first', () => {
    const { core, events, feed } = make();
    feed(core.startSession(0, 'startup'));
    feed(core.windowFocused(0, 1));
    feed(core.tabCreated(0, { id: 1, windowId: 1, active: true }));
    feed(core.tabUpdated(0, { id: 1, windowId: 1, url: 'https://a.com/1', title: 'One', status: 'complete' }));
    feed(core.tabUpdated(10 * SEC, { id: 1, windowId: 1, url: 'https://a.com/2', title: 'Two', status: 'complete' }));
    feed(core.tabRemoved(15 * SEC, 1, 1));
    expect(spent(events, 'https://a.com/1')).toBe(10 * SEC);
    expect(spent(events, 'https://a.com/2')).toBe(5 * SEC);
    expect(types(events)).toContain('tab_navigate');
  });

  it('ignores loading state, untracked urls and blocked domains', () => {
    const { core, events, feed } = make(['bank.com']);
    feed(core.startSession(0, 'startup'));
    feed(core.tabUpdated(1, { id: 1, url: 'https://a.com', title: 'A', status: 'loading' }));
    feed(core.tabUpdated(2, { id: 2, url: 'chrome://settings', title: 'S', status: 'complete' }));
    feed(core.tabUpdated(3, { id: 3, url: 'https://my.bank.com/x', title: 'Bank', status: 'complete' }));
    expect(types(events)).toEqual(['session_start']);
  });

  it('closes a tab record when it navigates to a blocked domain', () => {
    const { core, events, feed } = make(['bank.com']);
    feed(core.startSession(0, 'startup'));
    feed(core.tabUpdated(1, { id: 1, url: 'https://a.com', title: 'A', status: 'complete' }));
    feed(core.tabUpdated(2, { id: 1, url: 'https://bank.com', title: 'Bank', status: 'complete' }));
    expect(types(events)).toEqual(['session_start', 'tab_open', 'tab_close']);
    expect(events.some((e) => e.url?.includes('bank.com'))).toBe(false);
  });

  it('does not count time when Chrome is unfocused', () => {
    const { core, events, feed } = make();
    feed(core.startSession(0, 'startup'));
    feed(core.windowFocused(0, 1));
    feed(core.tabCreated(0, { id: 1, windowId: 1, active: true }));
    feed(core.tabUpdated(0, { id: 1, windowId: 1, url: 'https://a.com', title: 'A', status: 'complete' }));
    feed(core.windowFocused(20 * SEC, null));
    feed(core.windowFocused(80 * SEC, 1));
    feed(core.endSession(90 * SEC, 'clean'));
    expect(spent(events)).toBe(30 * SEC);
  });

  it('backdates idle so quiet time is not counted', () => {
    const { core, events, feed } = make();
    feed(core.startSession(0, 'startup'));
    feed(core.windowFocused(0, 1));
    feed(core.tabCreated(0, { id: 1, windowId: 1, active: true }));
    feed(core.tabUpdated(0, { id: 1, windowId: 1, url: 'https://a.com', title: 'A', status: 'complete' }));
    // idle fires at minute 15 after a 5 minute threshold: only 10 minutes were active
    feed(core.idleChanged(15 * MIN, 'idle', 5 * MIN));
    feed(core.idleChanged(30 * MIN, 'active'));
    feed(core.endSession(40 * MIN, 'clean'));
    expect(spent(events)).toBe(10 * MIN + 10 * MIN);
    const idleStart = events.find((e) => e.type === 'idle_start')!;
    expect(idleStart.ts).toBe(10 * MIN);
  });

  it('a heartbeat flushes active time without changing state', () => {
    const { core, events, feed } = make();
    feed(core.startSession(0, 'startup'));
    feed(core.windowFocused(0, 1));
    feed(core.tabCreated(0, { id: 1, windowId: 1, active: true }));
    feed(core.tabUpdated(0, { id: 1, windowId: 1, url: 'https://a.com', title: 'A', status: 'complete' }));
    feed(core.heartbeat(60 * SEC));
    feed(core.heartbeat(120 * SEC));
    expect(spent(events)).toBe(120 * SEC);
    expect(core.state.accruing?.tabId).toBe(1);
  });

  it('seeds existing tabs when tracking starts mid-browser', () => {
    const { core, events, feed } = make();
    feed(core.startSession(0, 'enabled'));
    feed(core.seed(0, [
      { id: 1, windowId: 1, url: 'https://a.com', title: 'A', active: true },
      { id: 2, windowId: 1, url: 'chrome://newtab', title: 'New', active: false },
    ], 1));
    expect(events.filter((e) => e.type === 'tab_open')).toHaveLength(1);
    expect(core.state.accruing?.tabId).toBe(1);
  });

  it('emits nothing without a session', () => {
    const { core } = make();
    expect(core.tabUpdated(0, { id: 1, url: 'https://a.com', title: 'A', status: 'complete' })).toEqual([]);
    expect(core.endSession(0, 'clean')).toEqual([]);
  });
});
