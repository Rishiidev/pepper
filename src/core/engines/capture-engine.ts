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

export class CaptureEngine {
  /** Current active tab per window */
  private activeTabByWindow: Map<number, TabActivationRecord> = new Map();

  /** Accumulated time spent per tab (windowId → tabId → seconds) */
  private tabDurations: Map<number, Map<number, number>> = new Map();

  /** Pre-cached tab snapshots per window (updated on tab changes) */
  private windowSnapshots: Map<number, WindowTabSnapshot> = new Map();

  /** Set of window IDs we should NOT auto-capture (e.g., extension windows) */
  private ignoredWindows: Set<number> = new Set();

  /** Minimum number of saveable tabs to trigger auto-capture */
  private readonly MIN_TABS_FOR_CAPTURE = 2;

  /** URLs that should never be captured */
  private readonly FORBIDDEN_PREFIXES = [
    'chrome://',
    'chrome-extension://',
    'about:',
    'edge://',
    'brave://',
    'devtools://',
  ];

  /**
   * Initialize all browser event listeners.
   * Call this once from background.ts on service worker boot.
   */
  initialize(): void {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      console.log('[CaptureEngine] Not in extension context, skipping initialization.');
      return;
    }

    // Track tab activation (attention signal)
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo.tabId, activeInfo.windowId);
    });

    // Pre-cache window state when tabs change
    chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
      if (tab.windowId) {
        this.refreshWindowSnapshot(tab.windowId);
      }
    });

    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.windowId) {
        this.refreshWindowSnapshot(tab.windowId);
      }
    });

    chrome.tabs.onRemoved.addListener((_tabId, removeInfo) => {
      if (!removeInfo.isWindowClosing) {
        this.refreshWindowSnapshot(removeInfo.windowId);
      }
    });

    // Auto-capture on window close — this is the core product
    chrome.windows.onRemoved.addListener((windowId) => {
      this.handleWindowClosed(windowId);
    });

    // Identify extension/popup windows to ignore
    chrome.windows.onCreated.addListener((window) => {
      if (window.id && window.type !== 'normal') {
        this.ignoredWindows.add(window.id);
      }
    });

    // Pre-cache all existing windows on startup
    this.initializeExistingWindows();

    console.log('[CaptureEngine] Initialized — silently watching browser activity.');
  }

  /**
   * Track tab activation to measure time spent per tab.
   */
  private handleTabActivated(tabId: number, windowId: number): void {
    const now = Date.now();

    // Finalize duration for the previously active tab in this window
    const prev = this.activeTabByWindow.get(windowId);
    if (prev) {
      const duration = Math.round((now - prev.activatedAt) / 1000);
      if (duration > 0) {
        if (!this.tabDurations.has(windowId)) {
          this.tabDurations.set(windowId, new Map());
        }
        const windowDurations = this.tabDurations.get(windowId)!;
        const existing = windowDurations.get(prev.tabId) || 0;
        windowDurations.set(prev.tabId, existing + duration);
      }
    }

    // Record the new active tab
    this.activeTabByWindow.set(windowId, {
      tabId,
      windowId,
      activatedAt: now,
    });
  }

  /**
   * Auto-capture when a browser window closes.
   * This is the primary capture mechanism — no user interaction needed.
   */
  private async handleWindowClosed(windowId: number): Promise<void> {
    // Skip non-normal windows (popups, devtools, extension panels)
    if (this.ignoredWindows.has(windowId)) {
      this.ignoredWindows.delete(windowId);
      return;
    }

    // Finalize the last active tab's duration
    this.handleTabActivated(-1, windowId);

    const snapshot = this.windowSnapshots.get(windowId);
    if (!snapshot || snapshot.tabs.length < this.MIN_TABS_FOR_CAPTURE) {
      this.cleanupWindow(windowId);
      return;
    }

    try {
      // Build duration map (tab index → seconds spent)
      const durations = this.tabDurations.get(windowId);
      const tabDurationMap: Record<number, number> = {};
      if (durations) {
        for (const tab of snapshot.tabs) {
          if (tab.id && durations.has(tab.id)) {
            tabDurationMap[tab.index] = durations.get(tab.id)!;
          }
        }
      }

      // Extract domain clusters
      const domainClusters = this.extractDomainClusters(snapshot.tabs);

      // Generate a smart default name from domain clusters
      const sessionName = this.generateContextName(snapshot.tabs, domainClusters);

      // Create session with full memory metadata
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

  /**
   * Refresh the pre-cached snapshot for a window.
   * We cache this because when onRemoved fires, the tabs are already gone.
   */
  private async refreshWindowSnapshot(windowId: number): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ windowId, windowType: 'normal' });
      const saveableTabs = tabs.filter((t) => this.isSaveableUrl(t.url));

      if (saveableTabs.length === 0) {
        this.windowSnapshots.delete(windowId);
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
   * Pre-cache all existing windows on startup.
   */
  private async initializeExistingWindows(): Promise<void> {
    try {
      const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
      for (const win of windows) {
        if (win.id) {
          await this.refreshWindowSnapshot(win.id);
        }
      }
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
    this.ignoredWindows.delete(windowId);
  }

  private isSaveableUrl(url?: string): boolean {
    if (!url) return false;
    return !this.FORBIDDEN_PREFIXES.some((prefix) => url.startsWith(prefix));
  }
}

export const captureEngine = new CaptureEngine();
