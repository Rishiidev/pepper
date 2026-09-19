import { PepperSession } from '../types/session';
import { WindowTabSnapshot } from '../types/snapshot';
import { restoreEngine } from './restore-engine';
import { sessionEngine } from './session-engine';
import { isSaveableUrl } from '../utils/url';

/** True when a live window plausibly is the window this snapshot came from. */
export function snapshotMatchesLiveWindow(snapshot: WindowTabSnapshot, liveUrls: string[]): boolean {
  if (snapshot.tabs.length === 0) return false;
  const live = new Set(liveUrls);
  const overlap = snapshot.tabs.filter((t) => live.has(t.url)).length;
  return overlap / snapshot.tabs.length >= 0.5;
}

export interface ClosedWindowInfo {
  sessionId: string;
  tabCount: number;
  titles: string[];
  closedAt: number;
}

export interface LastClosed {
  source: 'chrome' | 'pepper';
  tabCount: number;
  label: string;
  closedAt: number;
  /** chrome.sessions id or Pepper session id */
  id: string;
}

export class RecoveryEngine {
  /** Windows Chrome itself remembers as recently closed (its own history, not Pepper's). */
  async getChromeClosedWindows(max = 10): Promise<ClosedWindowInfo[]> {
    if (typeof chrome === 'undefined' || !chrome.sessions) return [];
    try {
      const items = await chrome.sessions.getRecentlyClosed({ maxResults: max });
      return items
        .filter(
          (i) =>
            i.window &&
            i.window.sessionId &&
            (i.window.tabs ?? []).some((t) => isSaveableUrl(t.url))
        )
        .map((i) => ({
          sessionId: i.window!.sessionId!,
          tabCount: i.window!.tabs!.length,
          titles: i.window!.tabs!.map((t) => t.title || t.url || '').filter(Boolean),
          closedAt: i.lastModified * 1000,
        }));
    } catch {
      return [];
    }
  }

  /** Windows Pepper recovered after Chrome quit or crashed and the user has not handled yet. */
  async getRecoveredSessions(): Promise<PepperSession[]> {
    const all = await sessionEngine.getAllSessions();
    return all.filter((s) => s.captureType === 'crash_recovery' && !s.restoredAt && !s.dismissedAt);
  }

  async dismissRecovered(ids: string[]): Promise<void> {
    for (const id of ids) await sessionEngine.updateSession(id, { dismissedAt: Date.now() });
  }

  async restoreAllRecovered(): Promise<number> {
    const recovered = await this.getRecoveredSessions();
    for (const s of recovered) await restoreEngine.restoreSession(s.id);
    return recovered.length;
  }

  /** What "Reopen last closed window" would do right now, for the button label. */
  async peekLastClosed(): Promise<LastClosed | null> {
    const chromeClosed = (await this.getChromeClosedWindows(1))[0];
    if (chromeClosed) {
      return {
        source: 'chrome',
        id: chromeClosed.sessionId,
        tabCount: chromeClosed.tabCount,
        label: chromeClosed.titles[0] || 'Closed window',
        closedAt: chromeClosed.closedAt,
      };
    }
    const pepper = await this.latestPepperCapture();
    if (!pepper) return null;
    return {
      source: 'pepper',
      id: pepper.id,
      tabCount: pepper.tabCount,
      label: pepper.name,
      closedAt: pepper.createdAt,
    };
  }

  /** Prefers Chrome's exact restore (keeps history), falls back to Pepper's snapshot. */
  async reopenLastClosedWindow(): Promise<LastClosed | null> {
    const target = await this.peekLastClosed();
    if (!target) return null;
    if (target.source === 'chrome') {
      await chrome.sessions.restore(target.id);
    } else {
      await restoreEngine.restoreSession(target.id);
    }
    return target;
  }

  private async latestPepperCapture(): Promise<PepperSession | undefined> {
    const week = Date.now() - 7 * 86_400_000;
    const all = await sessionEngine.getAllSessions();
    return all.find(
      (s) =>
        (s.captureType === 'auto_window_close' || s.captureType === 'crash_recovery') &&
        !s.restoredAt &&
        s.createdAt > week
    );
  }
}

export const recoveryEngine = new RecoveryEngine();
