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

interface TabActivationRecord {
  tabId: number;
  windowId: number;
  activatedAt: number;
}

interface WindowTabSnapshot {
  tabs: PepperTab[];
  activeTabIndex: number;
  capturedAt: number;
}

const STATE_KEY = 'pepper_capture_state_v1';
const SNAPSHOT_DEBOUNCE_MS = 400;

/** JSON-safe shape persisted to chrome.storage.session so state survives service worker restarts. */
interface PersistedCaptureState {
  snapshots: Record<number, WindowTabSnapshot>;
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

    this.ready = this.loadState().then(() => this.initializeExistingWindows());

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
      const store = chrome.storage?.session;
      if (!store) return;
      const res = await store.get(STATE_KEY);
      const saved = res[STATE_KEY] as PersistedCaptureState | undefined;
      if (!saved) return;
      for (const [w, snap] of Object.entries(saved.snapshots || {})) {
        this.windowSnapshots.set(Number(w), snap);
      }
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

  private schedulePersist(): void {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persistNow();
    }, 250);
  }

  private async persistNow(): Promise<void> {
    try {
      const store = chrome.storage?.session;
      if (!store) return;
      const state: PersistedCaptureState = {
        snapshots: Object.fromEntries(this.windowSnapshots),
        durations: Object.fromEntries(
          Array.from(this.tabDurations, ([w, m]) => [w, Object.fromEntries(m)])
        ),
        active: Object.fromEntries(this.activeTabByWindow),
      };
      await store.set({ [STATE_KEY]: state });
    } catch (err) {
      console.warn('[CaptureEngine] Failed to persist state:', err);
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
      const sessionName = this.generateContextName(snapshot.tabs, domainClusters);

      await sessionEngine.createSession(sessionName, snapshot.tabs, {
        captureType: 'auto_window_close',
        activeTabIndex: snapshot.activeTabIndex,
        tabDurations: Object.keys(tabDurationMap).length > 0 ? tabDurationMap : undefined,
        domainClusters,
      });

      console.log(`[CaptureEngine] Auto-captured ${snapshot.tabs.length} tabs from window ${windowId}`);
      eventBus.emit('capture:auto', { windowId, tabCount: snapshot.tabs.length });
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
   * Generate a context-aware name from domain clusters instead of timestamps.
   * "github.com + stackoverflow.com" → "Development & Research"
   * "figma.com + dribbble.com" → "Design Exploration"
   */
  private generateContextName(tabs: PepperTab[], clusters: string[]): string {
    const domainIntents: Record<string, string> = {
      'github.com': 'Development',
      'stackoverflow.com': 'Debugging',
      'figma.com': 'Design',
      'notion.so': 'Planning',
      'docs.google.com': 'Documentation',
      'youtube.com': 'Learning',
      'medium.com': 'Reading',
      'twitter.com': 'Social',
      'x.com': 'Social',
      'reddit.com': 'Research',
      'linkedin.com': 'Networking',
      'amazon.com': 'Shopping',
      'slack.com': 'Communication',
      'vercel.com': 'Deployment',
      'netlify.com': 'Deployment',
      'stripe.com': 'Payments',
      'openai.com': 'AI Research',
      'anthropic.com': 'AI Research',
      'chatgpt.com': 'AI Research',
      'claude.ai': 'AI Research',
    };

    // Try to match known domains to intent labels
    const intents: string[] = [];
    for (const cluster of clusters.slice(0, 3)) {
      if (domainIntents[cluster]) {
        intents.push(domainIntents[cluster]);
      }
    }

    // Deduplicate intents
    const uniqueIntents = [...new Set(intents)];

    if (uniqueIntents.length >= 2) {
      return `${uniqueIntents[0]} & ${uniqueIntents[1]}`;
    } else if (uniqueIntents.length === 1) {
      return `${uniqueIntents[0]} Session`;
    }

    // Fallback: use the primary domain
    if (clusters.length > 0) {
      const primary = clusters[0].split('.')[0];
      const capitalized = primary.charAt(0).toUpperCase() + primary.slice(1);
      return `${capitalized} — ${tabs.length} tabs`;
    }

    // Last resort
    const now = new Date();
    const timeOfDay = now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening';
    return `${timeOfDay} Workspace`;
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
    this.schedulePersist();
  }

}

export const captureEngine = new CaptureEngine();
