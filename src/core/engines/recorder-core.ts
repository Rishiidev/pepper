import { TimelineEvent, TimelineEventType } from '../types/timeline';

export interface TrackedTab {
  url: string;
  title: string;
  windowId?: number;
}

/** Serializable so the worker can resume after being suspended. */
export interface RecorderState {
  sessionId: string | null;
  tabs: Record<number, TrackedTab>;
  activeByWindow: Record<number, number>;
  focusedWindowId: number | null;
  idle: boolean;
  /** The tab currently accruing active time, and since when */
  accruing: { tabId: number; since: number } | null;
}

export const emptyRecorderState = (): RecorderState => ({
  sessionId: null,
  tabs: {},
  activeByWindow: {},
  focusedWindowId: null,
  idle: false,
  accruing: null,
});

export interface TabUpdateInfo {
  id: number;
  windowId?: number;
  url?: string;
  title?: string;
  status?: string;
}

/**
 * Pure state machine turning browser events into timeline events. No chrome or
 * database access, so time accounting can be tested with plain sequences.
 * Every method returns the events to persist.
 */
export class RecorderCore {
  private out: TimelineEvent[] = [];

  constructor(
    public state: RecorderState,
    private isTracked: (url?: string) => boolean,
    private newId: () => string
  ) {}

  // ---------- session lifecycle ----------

  startSession(now: number, reason: 'startup' | 'enabled' | 'window'): TimelineEvent[] {
    this.out = [];
    this.state = { ...emptyRecorderState(), sessionId: this.newId(), focusedWindowId: this.state.focusedWindowId };
    this.emit(now, 'session_start', { reason });
    this.resume(now);
    return this.out;
  }

  endSession(now: number, reason: 'clean' | 'interrupted'): TimelineEvent[] {
    this.out = [];
    if (!this.state.sessionId) return this.out;
    this.settle(now);
    this.emit(now, 'session_end', { reason });
    this.state = emptyRecorderState();
    return this.out;
  }

  /**
   * Brings the recorded state in line with the real browser: opens tabs that are
   * live but unknown, closes tabs that are known but gone. Used when tracking
   * starts mid-browser and when the worker wakes up.
   */
  reconcile(
    now: number,
    tabs: Array<{ id: number; windowId: number; url?: string; title?: string; active: boolean }>,
    focusedWindowId: number | null
  ): TimelineEvent[] {
    this.out = [];
    const s = this.state;
    if (!s.sessionId) return this.out;
    this.settle(now);
    s.focusedWindowId = focusedWindowId;

    const live = new Set(tabs.map((t) => t.id));
    for (const idStr of Object.keys(s.tabs)) {
      const id = Number(idStr);
      if (!live.has(id)) {
        const t = s.tabs[id];
        this.emit(now, 'tab_close', { tabId: id, windowId: t.windowId, url: t.url, title: t.title, reason: 'gone' });
        delete s.tabs[id];
      }
    }

    s.activeByWindow = {};
    for (const t of tabs) {
      if (t.active) s.activeByWindow[t.windowId] = t.id;
      if (!this.isTracked(t.url)) continue;
      const known = s.tabs[t.id];
      if (!known) {
        s.tabs[t.id] = { url: t.url!, title: t.title || '', windowId: t.windowId };
        this.emit(now, 'tab_open', { tabId: t.id, windowId: t.windowId, url: t.url, title: t.title });
      } else if (known.url !== t.url) {
        s.tabs[t.id] = { url: t.url!, title: t.title || '', windowId: t.windowId };
        this.emit(now, 'tab_navigate', { tabId: t.id, windowId: t.windowId, url: t.url, title: t.title });
      }
    }
    this.resume(now);
    return this.out;
  }

  /** Alias kept for readability where the browser state is first captured. */
  seed = this.reconcile;

  // ---------- tab events ----------

  tabCreated(now: number, tab: { id: number; windowId: number; active: boolean }): TimelineEvent[] {
    this.out = [];
    if (!this.state.sessionId) return this.out;
    this.settle(now);
    if (tab.active) this.state.activeByWindow[tab.windowId] = tab.id;
    this.resume(now);
    return this.out;
  }

  tabUpdated(now: number, tab: TabUpdateInfo): TimelineEvent[] {
    this.out = [];
    const s = this.state;
    if (!s.sessionId) return this.out;
    const known = s.tabs[tab.id];

    if (tab.status !== 'complete') {
      if (known && tab.title) known.title = tab.title;
      return this.out;
    }

    this.settle(now);
    if (!this.isTracked(tab.url)) {
      if (known) {
        this.emit(now, 'tab_close', { tabId: tab.id, windowId: known.windowId, url: known.url, title: known.title, reason: 'untracked' });
        delete s.tabs[tab.id];
      }
    } else if (!known) {
      s.tabs[tab.id] = { url: tab.url!, title: tab.title || '', windowId: tab.windowId };
      this.emit(now, 'tab_open', { tabId: tab.id, windowId: tab.windowId, url: tab.url, title: tab.title });
    } else if (known.url !== tab.url) {
      s.tabs[tab.id] = { url: tab.url!, title: tab.title || '', windowId: tab.windowId ?? known.windowId };
      this.emit(now, 'tab_navigate', { tabId: tab.id, windowId: tab.windowId, url: tab.url, title: tab.title });
    } else if (tab.title && tab.title !== known.title) {
      known.title = tab.title;
    }
    this.resume(now);
    return this.out;
  }

  tabActivated(now: number, tabId: number, windowId: number): TimelineEvent[] {
    this.out = [];
    const s = this.state;
    if (!s.sessionId) return this.out;
    this.settle(now);
    s.activeByWindow[windowId] = tabId;
    const t = s.tabs[tabId];
    if (t && windowId === s.focusedWindowId) {
      this.emit(now, 'tab_switch', { tabId, windowId, url: t.url, title: t.title });
    }
    this.resume(now);
    return this.out;
  }

  tabRemoved(now: number, tabId: number, windowId?: number): TimelineEvent[] {
    this.out = [];
    const s = this.state;
    if (!s.sessionId) return this.out;
    this.settle(now);
    const t = s.tabs[tabId];
    if (t) {
      this.emit(now, 'tab_close', { tabId, windowId: t.windowId ?? windowId, url: t.url, title: t.title });
      delete s.tabs[tabId];
    }
    for (const [w, id] of Object.entries(s.activeByWindow)) if (id === tabId) delete s.activeByWindow[Number(w)];
    this.resume(now);
    return this.out;
  }

  // ---------- window, focus and idle ----------

  windowRemoved(now: number, windowId: number): TimelineEvent[] {
    this.out = [];
    if (!this.state.sessionId) return this.out;
    this.settle(now);
    delete this.state.activeByWindow[windowId];
    if (this.state.focusedWindowId === windowId) this.state.focusedWindowId = null;
    this.resume(now);
    return this.out;
  }

  /** windowId null means Chrome lost focus (user is in another app). */
  windowFocused(now: number, windowId: number | null): TimelineEvent[] {
    this.out = [];
    if (!this.state.sessionId) {
      this.state.focusedWindowId = windowId;
      return this.out;
    }
    this.settle(now);
    this.state.focusedWindowId = windowId;
    this.resume(now);
    return this.out;
  }

  /**
   * `idleThresholdMs` backdates the start of idle so the quiet period is not
   * counted as active time. Locking the screen is immediate (threshold 0).
   */
  idleChanged(now: number, state: 'active' | 'idle' | 'locked', idleThresholdMs = 0): TimelineEvent[] {
    this.out = [];
    const s = this.state;
    if (!s.sessionId) return this.out;

    if (state === 'active') {
      if (!s.idle) return this.out;
      s.idle = false;
      this.emit(now, 'idle_end');
      this.resume(now);
      return this.out;
    }

    if (s.idle) return this.out;
    const backdated = state === 'idle' ? Math.max(now - idleThresholdMs, s.accruing?.since ?? now) : now;
    this.settle(backdated);
    s.idle = true;
    this.emit(backdated, 'idle_start', { reason: state });
    return this.out;
  }

  /** Flushes the running segment so a crash loses at most one heartbeat of active time. */
  heartbeat(now: number): TimelineEvent[] {
    this.out = [];
    if (!this.state.sessionId) return this.out;
    this.settle(now);
    this.resume(now);
    return this.out;
  }

  // ---------- internals ----------

  private emit(ts: number, type: TimelineEventType, fields: Partial<TimelineEvent> = {}): void {
    if (!this.state.sessionId) return;
    this.out.push({ sessionId: this.state.sessionId, ts, type, ...fields });
  }

  private desired(): number | null {
    const s = this.state;
    if (!s.sessionId || s.idle || s.focusedWindowId === null) return null;
    const id = s.activeByWindow[s.focusedWindowId];
    return id !== undefined && s.tabs[id] ? id : null;
  }

  /** Closes the running active-time segment, emitting a tab_active event. */
  private settle(now: number): void {
    const a = this.state.accruing;
    if (!a) return;
    this.state.accruing = null;
    const t = this.state.tabs[a.tabId];
    const ms = now - a.since;
    if (t && ms >= 1000) {
      this.emit(now, 'tab_active', { tabId: a.tabId, windowId: t.windowId, url: t.url, title: t.title, spentMs: ms });
    }
  }

  private resume(now: number): void {
    const d = this.desired();
    this.state.accruing = d === null ? null : { tabId: d, since: now };
  }
}
