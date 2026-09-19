/**
 * CaptureEngine — The heart of Pepper's Work Memory Engine.
 *
 * Instead of waiting for users to manually save, this engine silently
 * observes browser behavior and captures workspaces automatically:
 *
 * 1. Tracks which tab is active and for how long (attention signal)
 * 2. Auto-captures tabs when a browser window closes
 * 3. Builds domain clusters and navigation trails
 * 4. Records the capture reason so the UI can differentiate
 *    auto-captures from manual saves
 *
 * This runs exclusively in the background service worker.
 */

import { PepperTab, PepperSession, CaptureType } from '../types/session';
import { sessionEngine } from './session-engine';
import { eventBus } from '../events/event-bus';
import { isSaveableUrl } from '../utils/url';
import { WindowTabSnapshot } from '../types/snapshot';
import { capSnapshots } from './snapshot-cap';
import { snapshotMatchesLiveWindow } from './recovery-engine';
import { announceCapture } from './capture-feedback';
import { retentionEngine } from './retention-engine';
import { generateSessionName } from './session-naming';

interface TabActivationRecord {
  tabId: number;
  windowId: number;
  activatedAt: number;
}


/** Ephemeral attention data; cleared by Chrome when the browser restarts. */
const STATE_KEY = 'pepper_capture_state_v1';
/** Durable last-known window state; survives service worker kills and browser quit. */
const LAST_KNOWN_KEY = 'pepper_last_known_state_v1';
const BOOT_MARKER_KEY = 'pepper_boot_marker';
const LOCAL_PERSIST_MS = 1500;
const SNAPSHOT_DEBOUNCE_MS = 400;

/** JSON-safe shape persisted to chrome.storage.session so state survives service worker restarts. */
interface PersistedCaptureState {
  durations: Record<number, Record<number, number>>;
  active: Record<number, TabActivationRecord>;
}

export class CaptureEngine {
  /** Current active tab per window */
  private activeTabByWindow: Map<number, TabActivationRecord> = new Map();

  /** Accumulated time spent per tab (windowId → tabId → seconds) */
  private tabDurations: Map<number, Map<number, number>> = new Map();

  /** Pre-cached tab snapshots per window (updated on tab changes) */
  private windowSnapshots: Map<number, WindowTabSnapshot> = new Map();

  private snapshotTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private localPersistTimer: ReturnType<typeof setTimeout> | null = null;
  private ready: Promise<void> = Promise.resolve();

  /** Minimum number of saveable tabs to trigger auto-capture */
  private readonly MIN_TABS_FOR_CAPTURE = 2;

  /**
   * Initialize all browser event listeners.
   * Call this once, synchronously, from background.ts on service worker boot
   * so Chrome can wake the worker for these events.
   */
  initialize(): void {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      console.log('[CaptureEngine] Not in extension context, skipping initialization.');
      return;
    }

    this.ready = this.loadState()
      .then(() => this.recoverOrphansOnBoot())
      .then(() => this.initializeExistingWindows())
      .then(() => retentionEngine.runIfDue())
      .then(() => undefined)
      .catch((err) => console.warn('[CaptureEngine] Startup failed:', err));

    chrome.tabs.onActivated.addListener((activeInfo) => {
      void this.ready.then(() => {
        this.handleTabActivated(activeInfo.tabId, activeInfo.windowId);
        this.schedulePersist();
      });
    });

    chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
      const relevant =
        changeInfo.url !== undefined ||
        changeInfo.title !== undefined ||
        changeInfo.pinned !== undefined ||
        changeInfo.status === 'complete';
      if (relevant && tab.windowId) this.scheduleSnapshot(tab.windowId);
    });

    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.windowId) this.scheduleSnapshot(tab.windowId);
    });

    chrome.tabs.onMoved.addListener((_tabId, moveInfo) => this.scheduleSnapshot(moveInfo.windowId));
    chrome.tabs.onAttached.addListener((_tabId, info) => this.scheduleSnapshot(info.newWindowId));
    chrome.tabs.onDetached.addListener((_tabId, info) => this.scheduleSnapshot(info.oldWindowId));

    chrome.tabs.onRemoved.addListener((_tabId, removeInfo) => {
      // When the whole window is closing, keep the last good snapshot for handleWindowClosed.
      if (!removeInfo.isWindowClosing) this.scheduleSnapshot(removeInfo.windowId);
    });

    // Auto-capture on window close — this is the core product
    chrome.windows.onRemoved.addListener((windowId) => {
      void this.ready.then(() => this.handleWindowClosed(windowId));
    });

    console.log('[CaptureEngine] Initialized — silently watching browser activity.');
  }

  // ---------- persistence (survives MV3 service worker suspension) ----------

  private async loadState(): Promise<void> {
    try {
      const local = await chrome.storage.local.get(LAST_KNOWN_KEY);
      const known = local[LAST_KNOWN_KEY] as { snapshots?: Record<number, WindowTabSnapshot> } | undefined;
      for (const [w, snap] of Object.entries(known?.snapshots || {})) {
        this.windowSnapshots.set(Number(w), snap);
      }

      const store = chrome.storage?.session;
      if (!store) return;
      const res = await store.get(STATE_KEY);
      const saved = res[STATE_KEY] as PersistedCaptureState | undefined;
      if (!saved) return;
      for (const [w, perTab] of Object.entries(saved.durations || {})) {
        this.tabDurations.set(
          Number(w),
          new Map(Object.entries(perTab).map(([t, secs]) => [Number(t), secs]))
        );
      }
      for (const [w, rec] of Object.entries(saved.active || {})) {
        this.activeTabByWindow.set(Number(w), rec);
      }
    } catch (err) {
      console.warn('[CaptureEngine] Failed to load persisted state:', err);
    }
  }

  /**
   * First worker start of a browser session (storage.session is empty): any
   * persisted window with no matching live window was never finalized because
   * Chrome quit or crashed mid-capture. Save those now.
   */
  private async recoverOrphansOnBoot(): Promise<void> {
    const store = chrome.storage?.session;
    if (!store) return;
    const marker = await store.get(BOOT_MARKER_KEY);
    if (marker[BOOT_MARKER_KEY]) return;
    await store.set({ [BOOT_MARKER_KEY]: Date.now() });

    if (this.windowSnapshots.size === 0) return;

    const live = await chrome.tabs.query({ windowType: 'normal' });
    const liveByWindow = new Map<number, string[]>();
    for (const t of live) {
      if (t.windowId === undefined || !t.url) continue;
      liveByWindow.set(t.windowId, [...(liveByWindow.get(t.windowId) || []), t.url]);
    }

    let recovered = 0;
    for (const [windowId, snapshot] of [...this.windowSnapshots]) {
      if (snapshotMatchesLiveWindow(snapshot, liveByWindow.get(windowId) || [])) continue;

      this.windowSnapshots.delete(windowId);
      this.tabDurations.delete(windowId);
      this.activeTabByWindow.delete(windowId);
      if (snapshot.tabs.length < this.MIN_TABS_FOR_CAPTURE) continue;

      try {
        if (await this.isAlreadySaved(snapshot.tabs)) continue;
        const clusters = this.extractDomainClusters(snapshot.tabs);
        const session = await sessionEngine.createSession(
          generateSessionName(snapshot.tabs, clusters),
          snapshot.tabs,
          { captureType: 'crash_recovery', activeTabIndex: snapshot.activeTabIndex, domainClusters: clusters }
        );
        recovered++;
        if (recovered === 1) await announceCapture(session, 'recovered');
      } catch (err) {
        console.error('[CaptureEngine] Recovery failed for window', windowId, err);
      }
    }

    await this.flush();
    if (recovered > 0) console.log(`[CaptureEngine] Recovered ${recovered} window(s) from last session.`);
  }

  private schedulePersist(): void {
    if (!this.persistTimer) {
      this.persistTimer = setTimeout(() => {
        this.persistTimer = null;
        void this.persistSession();
      }, 250);
    }
    if (!this.localPersistTimer) {
      this.localPersistTimer = setTimeout(() => {
        this.localPersistTimer = null;
        void this.persistLastKnown();
      }, LOCAL_PERSIST_MS);
    }
  }

  /** Writes everything immediately. Called on worker suspend and after finalizing a window. */
  async flush(): Promise<void> {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    if (this.localPersistTimer) clearTimeout(this.localPersistTimer);
    this.persistTimer = null;
    this.localPersistTimer = null;
    await Promise.all([this.persistSession(), this.persistLastKnown()]);
  }

  private async persistSession(): Promise<void> {
    try {
      const store = chrome.storage?.session;
      if (!store) return;
      const state: PersistedCaptureState = {
        durations: Object.fromEntries(
          Array.from(this.tabDurations, ([w, m]) => [w, Object.fromEntries(m)])
        ),
        active: Object.fromEntries(this.activeTabByWindow),
      };
      await store.set({ [STATE_KEY]: state });
    } catch (err) {
      console.warn('[CaptureEngine] Failed to persist attention state:', err);
    }
  }

  private async persistLastKnown(): Promise<void> {
    try {
      const snapshots = capSnapshots(Object.fromEntries(this.windowSnapshots));
      await chrome.storage.local.set({ [LAST_KNOWN_KEY]: { updatedAt: Date.now(), snapshots } });
    } catch (err) {
      console.warn('[CaptureEngine] Failed to persist last-known state:', err);
    }
  }

  // ---------- attention tracking ----------

  /**
   * Track tab activation to measure time spent per tab.
   * Pass tabId -1 to only finalize the previous tab (window closing).
   */
  private handleTabActivated(tabId: number, windowId: number): void {
    const now = Date.now();

    const prev = this.activeTabByWindow.get(windowId);
    if (prev) {
      const duration = Math.round((now - prev.activatedAt) / 1000);
      if (duration > 0) {
        if (!this.tabDurations.has(windowId)) {
          this.tabDurations.set(windowId, new Map());
        }
        const windowDurations = this.tabDurations.get(windowId)!;
        windowDurations.set(prev.tabId, (windowDurations.get(prev.tabId) || 0) + duration);
      }
    }

    if (tabId >= 0) {
      this.activeTabByWindow.set(windowId, { tabId, windowId, activatedAt: now });
    } else {
      this.activeTabByWindow.delete(windowId);
    }
  }

  /**
   * Auto-capture when a browser window closes.
   * This is the primary capture mechanism — no user interaction needed.
   */
  private async handleWindowClosed(windowId: number): Promise<void> {
    // Finalize the last active tab's duration
    this.handleTabActivated(-1, windowId);

    const pending = this.snapshotTimers.get(windowId);
    if (pending) clearTimeout(pending);
    this.snapshotTimers.delete(windowId);

    // Non-normal windows (popups, devtools, extension panels) never get a snapshot.
    const snapshot = this.windowSnapshots.get(windowId);
    if (!snapshot || snapshot.tabs.length < this.MIN_TABS_FOR_CAPTURE) {
      this.cleanupWindow(windowId);
      return;
    }

    try {
      // Skip if the user already saved (or just restored) exactly this set of tabs.
      if (await this.isAlreadySaved(snapshot.tabs)) {
        console.log(`[CaptureEngine] Window ${windowId} already saved, skipping auto-capture.`);
        return;
      }

      // Build duration map (tab index → seconds spent)
      const durations = this.tabDurations.get(windowId);
      const tabDurationMap: Record<number, number> = {};
      if (durations) {
        for (const tab of snapshot.tabs) {
          if (tab.id !== undefined && durations.has(tab.id)) {
            tabDurationMap[tab.index] = durations.get(tab.id)!;
          }
        }
      }

      const domainClusters = this.extractDomainClusters(snapshot.tabs);
      const sessionName = generateSessionName(snapshot.tabs, domainClusters, snapshot.activeTabIndex);

      const session = await sessionEngine.createSession(sessionName, snapshot.tabs, {
        captureType: 'auto_window_close',
        activeTabIndex: snapshot.activeTabIndex,
        tabDurations: Object.keys(tabDurationMap).length > 0 ? tabDurationMap : undefined,
        domainClusters,
      });

      console.log(`[CaptureEngine] Auto-captured ${snapshot.tabs.length} tabs from window ${windowId}`);
      eventBus.emit('capture:auto', { windowId, tabCount: snapshot.tabs.length });
      await announceCapture(session);
      await retentionEngine.run();
    } catch (err) {
      console.error('[CaptureEngine] Auto-capture failed:', err);
    } finally {
      this.cleanupWindow(windowId);
    }
  }

  private async isAlreadySaved(tabs: PepperTab[]): Promise<boolean> {
    const key = (urls: string[]) => [...urls].sort().join('\n');
    const target = key(tabs.map((t) => t.url));
    const sessions = await sessionEngine.getAllSessions();
    return sessions.some((s) => key(s.tabs.map((t) => t.url)) === target);
  }

  /** Debounced snapshot refresh so bursts of tab events cost one query. */
  private scheduleSnapshot(windowId: number): void {
    const existing = this.snapshotTimers.get(windowId);
    if (existing) clearTimeout(existing);
    this.snapshotTimers.set(
      windowId,
      setTimeout(() => {
        this.snapshotTimers.delete(windowId);
        void this.refreshWindowSnapshot(windowId);
      }, SNAPSHOT_DEBOUNCE_MS)
    );
  }

  /**
   * Refresh the cached snapshot for a window (persisted, since when
   * windows.onRemoved fires the tabs are already gone).
   */
  private async refreshWindowSnapshot(windowId: number): Promise<void> {
    try {
      await this.ready;
      const tabs = await chrome.tabs.query({ windowId, windowType: 'normal' });
      const saveableTabs = tabs.filter((t) => isSaveableUrl(t.url));

      if (saveableTabs.length === 0) {
        this.windowSnapshots.delete(windowId);
        this.schedulePersist();
        return;
      }

      const activeTab = saveableTabs.find((t) => t.active);
      const activeIndex = activeTab ? saveableTabs.indexOf(activeTab) : 0;

      this.windowSnapshots.set(windowId, {
        tabs: saveableTabs.map((tab, idx) => ({
          id: tab.id,
          url: tab.url || '',
          title: tab.title || 'Untitled',
          favIconUrl: tab.favIconUrl || '',
          index: tab.index ?? idx,
          pinned: tab.pinned || false,
        })),
        activeTabIndex: activeIndex,
        capturedAt: Date.now(),
      });
      this.schedulePersist();
    } catch {
      // Window may have been closed during query
    }
  }

  /**
   * Extract domain clusters from tabs.
   * Groups like "github.com, stackoverflow.com" → coding session.
   */
  private extractDomainClusters(tabs: PepperTab[]): string[] {
    const domains = new Map<string, number>();
    for (const tab of tabs) {
      try {
        const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
        const baseDomain = hostname.split('.').slice(-2).join('.');
        domains.set(baseDomain, (domains.get(baseDomain) || 0) + 1);
      } catch {
        // Skip invalid URLs
      }
    }

    // Sort by frequency and return top domains
    return Array.from(domains.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([domain]) => domain);
  }

  /**
   * Pre-cache all existing windows on startup and seed the active tab
   * so attention time is measured from the first tab, not the first switch.
   */
  private async initializeExistingWindows(): Promise<void> {
    try {
      const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
      for (const win of windows) {
        if (win.id === undefined) continue;
        await this.refreshWindowSnapshot(win.id);
        if (!this.activeTabByWindow.has(win.id)) {
          const [active] = await chrome.tabs.query({ windowId: win.id, active: true });
          if (active?.id !== undefined) {
            this.activeTabByWindow.set(win.id, {
              tabId: active.id,
              windowId: win.id,
              activatedAt: Date.now(),
            });
          }
        }
      }
      this.schedulePersist();
    } catch {
      // Extension API unavailable
    }
  }

  /**
   * Clean up tracking data for a closed window.
   */
  private cleanupWindow(windowId: number): void {
    this.windowSnapshots.delete(windowId);
    this.tabDurations.delete(windowId);
    this.activeTabByWindow.delete(windowId);
    void this.flush();
  }

}

export const captureEngine = new CaptureEngine();
