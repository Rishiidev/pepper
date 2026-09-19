import { RecorderCore, RecorderState, emptyRecorderState } from './recorder-core';
import { timelineStore } from './timeline-store';
import { isTrackedUrl } from './tracking-policy';
import { settingsRepo } from '../../storage/repositories/settings-repo';
import { BrowserSession, TimelineEvent } from '../types/timeline';

const STATE_KEY = 'pepper_recorder_state_v1';
const BOOT_KEY = 'pepper_recorder_boot';
const UPDATED_KEY = 'pepper_timeline_updated';
const HEARTBEAT_ALARM = 'pepper_recorder_heartbeat';
const SETTINGS_KEY = 'pepper_v2_settings';
const IDLE_SECONDS = 300;
const STARTUP_GRACE_MS = 1500;
/** A session with no heartbeat for this long belongs to a browser run that has ended */
const STALE_MS = 5 * 60_000;

/**
 * Records the browser session timeline. Opt-in; incognito is never recorded and
 * blocked domains are dropped before anything is stored. Thin chrome/Dexie
 * wiring around RecorderCore, which holds all the logic.
 */
export class SessionRecorder {
  private enabled = false;
  private blocklist: string[] = [];
  private core = new RecorderCore(emptyRecorderState(), (u) => isTrackedUrl(u, this.blocklist), () => this.newId());
  private queue: Promise<unknown> = Promise.resolve();
  private ready: Promise<void> = Promise.resolve();
  private startupFired: Promise<boolean> = Promise.resolve(false);
  private pendingStartup = false;
  private lastNotify = 0;

  private newId(): string {
    return `bs_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
  }

  /** Register all listeners synchronously so Chrome can wake the worker for them. */
  initialize(): void {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    this.startupFired = new Promise((resolve) => {
      chrome.runtime.onStartup.addListener(() => resolve(true));
      setTimeout(() => resolve(false), STARTUP_GRACE_MS);
    });
    this.ready = this.boot().catch((err) => console.warn('[SessionRecorder] boot failed:', err));

    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.incognito) return;
      this.run(async (now) => {
        await this.ensureSession(now);
        return this.core.tabCreated(now, { id: tab.id!, windowId: tab.windowId, active: !!tab.active });
      });
    });
    chrome.tabs.onUpdated.addListener((_id, changeInfo, tab) => {
      if (tab.incognito || (!changeInfo.status && !changeInfo.title && !changeInfo.url)) return;
      this.run(async (now) => {
        await this.ensureSession(now);
        return this.core.tabUpdated(now, {
          id: tab.id!,
          windowId: tab.windowId,
          url: tab.url,
          title: tab.title,
          status: changeInfo.status ?? tab.status,
        });
      });
    });
    chrome.tabs.onActivated.addListener((info) => this.run(async (now) => this.core.tabActivated(now, info.tabId, info.windowId)));
    chrome.tabs.onRemoved.addListener((tabId, info) => this.run(async (now) => this.core.tabRemoved(now, tabId, info.windowId)));

    chrome.windows.onCreated.addListener((w) => {
      if (w.incognito || w.type !== 'normal') return;
      this.run(async (now) => {
        await this.ensureSession(now);
        return [];
      });
    });
    chrome.windows.onFocusChanged.addListener((windowId) =>
      this.run(async (now) => this.core.windowFocused(now, windowId === chrome.windows.WINDOW_ID_NONE ? null : windowId))
    );
    chrome.windows.onRemoved.addListener((windowId) =>
      this.run(async (now) => {
        const events = this.core.windowRemoved(now, windowId);
        const remaining = await this.normalWindows();
        if (remaining.length === 0) events.push(...this.core.endSession(now, 'clean'));
        return events;
      })
    );

    if (chrome.idle) {
      chrome.idle.setDetectionInterval(IDLE_SECONDS);
      chrome.idle.onStateChanged.addListener((state) =>
        this.run(async (now) => this.core.idleChanged(now, state, IDLE_SECONDS * 1000))
      );
    }

    chrome.alarms?.onAlarm.addListener((alarm) => {
      if (alarm.name === HEARTBEAT_ALARM) {
        this.run(async (now) => {
          const events = this.core.heartbeat(now);
          // Even with no events, prove the browser is still alive
          if (events.length === 0 && this.core.state.sessionId) await timelineStore.updateSession(this.core.state.sessionId, { lastEventAt: now });
          return events;
        });
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[SETTINGS_KEY]) void this.onSettingsChanged();
    });
  }

  // ---------- serialized execution ----------

  private run(fn: (now: number) => Promise<TimelineEvent[]>): void {
    this.queue = this.queue
      .then(() => this.ready)
      .then(async () => {
        if (!this.enabled) return;
        const events = await fn(Date.now());
        await this.persist(events);
      })
      .catch((err) => console.warn('[SessionRecorder] handler failed:', err));
  }

  private async persist(events: TimelineEvent[]): Promise<void> {
    if (events.length > 0) {
      await timelineStore.appendEvents(events);
      const last = Math.max(...events.map((e) => e.ts));
      if (this.core.state.sessionId) await timelineStore.updateSession(this.core.state.sessionId, { lastEventAt: last });
    }
    await chrome.storage.session?.set({ [STATE_KEY]: this.core.state });
    if (events.length > 0 && Date.now() - this.lastNotify > 3000) {
      this.lastNotify = Date.now();
      await chrome.storage.local.set({ [UPDATED_KEY]: this.lastNotify });
    }
  }

  // ---------- lifecycle ----------

  private async loadSettings(): Promise<void> {
    const s = await settingsRepo.get();
    this.enabled = !!s.sessionTrackingEnabled;
    this.blocklist = s.trackingBlocklist ?? [];
  }

  private async normalWindows(): Promise<chrome.windows.Window[]> {
    const all = await chrome.windows.getAll({ windowTypes: ['normal'] });
    return all.filter((w) => !w.incognito);
  }

  private async liveTabs() {
    const wins = await this.normalWindows();
    const tabs = await chrome.tabs.query({});
    const ids = new Set(wins.map((w) => w.id));
    const focused = wins.find((w) => w.focused)?.id ?? null;
    return {
      focused,
      tabs: tabs
        .filter((t) => t.windowId !== undefined && ids.has(t.windowId) && !t.incognito && t.id !== undefined)
        .map((t) => ({ id: t.id!, windowId: t.windowId, url: t.url, title: t.title, active: !!t.active })),
    };
  }

  private async boot(): Promise<void> {
    await this.loadSettings();
    const store = chrome.storage.session;
    let startup = false;
    if (store) {
      const marker = await store.get(BOOT_KEY);
      if (!marker[BOOT_KEY]) {
        await store.set({ [BOOT_KEY]: Date.now() });
        startup = await this.startupFired;
      }
    }

    const active = await timelineStore.getActiveSession();
    // The heartbeat keeps lastEventAt fresh, so a long silence means Chrome was closed without a clean end
    if (!startup && active && Date.now() - active.lastEventAt > STALE_MS && !(await store?.get(STATE_KEY))?.[STATE_KEY]) startup = true;
    if (startup && active) await this.endInterrupted(active);
    if (startup) this.pendingStartup = true;

    if (!this.enabled) {
      if (active && !startup) await this.endClean(active);
      return;
    }

    const saved = store ? ((await store.get(STATE_KEY))[STATE_KEY] as RecorderState | undefined) : undefined;
    const stillActive = startup ? undefined : active;
    if (stillActive) {
      this.core.state = saved?.sessionId === stillActive.id ? saved : { ...emptyRecorderState(), sessionId: stillActive.id };
      const { tabs, focused } = await this.liveTabs();
      await this.persist(this.core.reconcile(Date.now(), tabs, focused));
    } else {
      await this.ensureSession(Date.now());
    }
    await this.ensureAlarm();
  }

  /** Starts a session if none is open and a normal window exists. */
  private async ensureSession(now: number): Promise<void> {
    if (!this.enabled || this.core.state.sessionId) return;
    const { tabs, focused } = await this.liveTabs();
    if (tabs.length === 0 && (await this.normalWindows()).length === 0) return;

    const reason = this.pendingStartup ? 'startup' : 'window';
    this.pendingStartup = false;
    const events = this.core.startSession(now, reason);
    const session: BrowserSession = { id: this.core.state.sessionId!, startedAt: now, lastEventAt: now, startReason: reason };
    await timelineStore.createSession(session);
    events.push(...this.core.reconcile(now, tabs, focused));
    await this.persist(events);
    await this.ensureAlarm();
  }

  private async endInterrupted(session: BrowserSession): Promise<void> {
    const ts = session.lastEventAt;
    await timelineStore.appendEvents([{ sessionId: session.id, ts, type: 'session_end', reason: 'interrupted' }]);
    await timelineStore.updateSession(session.id, { endedAt: ts, endReason: 'interrupted' });
  }

  private async endClean(session: BrowserSession): Promise<void> {
    const now = Date.now();
    await timelineStore.appendEvents([{ sessionId: session.id, ts: now, type: 'session_end', reason: 'clean' }]);
    await timelineStore.updateSession(session.id, { endedAt: now, endReason: 'clean' });
    await chrome.storage.session?.remove(STATE_KEY);
  }

  private async ensureAlarm(): Promise<void> {
    if (!chrome.alarms) return;
    const existing = await chrome.alarms.get(HEARTBEAT_ALARM);
    if (!existing) chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 });
  }

  private async onSettingsChanged(): Promise<void> {
    await this.queue;
    const wasEnabled = this.enabled;
    await this.loadSettings();
    if (this.enabled === wasEnabled) return;

    this.queue = this.queue.then(async () => {
      if (this.enabled) {
        await this.ensureSession(Date.now());
      } else {
        const now = Date.now();
        const ended = this.core.endSession(now, 'clean');
        const id = ended[0]?.sessionId;
        await timelineStore.appendEvents(ended);
        if (id) await timelineStore.updateSession(id, { endedAt: now, endReason: 'clean' });
        await chrome.storage.session?.remove(STATE_KEY);
        chrome.alarms?.clear(HEARTBEAT_ALARM);
      }
    }).catch((err) => console.warn('[SessionRecorder] toggle failed:', err));
  }

  /** Test/debug hook: current recorder state. */
  getState(): RecorderState {
    return this.core.state;
  }
}

export const sessionRecorder = new SessionRecorder();
