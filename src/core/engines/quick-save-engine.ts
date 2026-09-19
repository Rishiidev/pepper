import { PepperTab, PepperSession } from '../types/session';
import { SavedTabRecord } from '../types/saved-tab';
import { sessionEngine, INBOX_SESSION_ID } from './session-engine';
import { settingsRepo } from '../../storage/repositories/settings-repo';
import { eventBus } from '../events/event-bus';
import { isSaveableUrl } from '../utils/url';

interface UndoState {
  savedRecord: SavedTabRecord;
  tabData: PepperTab;
  targetSessionId: string;
  originalWindowId?: number;
  originalTabIndex?: number;
  /** false when the URL was already in the workspace, so undo must not remove it */
  appended: boolean;
}

const UNDO_KEY = 'pepper_quicksave_undo_v1';

export class QuickSaveEngine {
  private processingTabIds = new Set<number>();
  private lastUndoState: UndoState | null = null;

  // Undo state lives in storage.session so it survives service worker restarts.
  private async saveUndoState(state: UndoState | null): Promise<void> {
    this.lastUndoState = state;
    try {
      if (state) await chrome.storage.session?.set({ [UNDO_KEY]: state });
      else await chrome.storage.session?.remove(UNDO_KEY);
    } catch {
      // storage.session unavailable
    }
  }

  private async loadUndoState(): Promise<UndoState | null> {
    if (this.lastUndoState) return this.lastUndoState;
    try {
      const res = await chrome.storage.session?.get(UNDO_KEY);
      this.lastUndoState = (res?.[UNDO_KEY] as UndoState | undefined) ?? null;
    } catch {
      // ignore
    }
    return this.lastUndoState;
  }

  /**
   * Main Transactional Quick Save & Close Flow
   */
  async executeSaveAndClose(): Promise<boolean> {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      console.warn('PEPPER QuickSave: Extension APIs not available.');
      return false;
    }

    // Step 1: Detect active tab across focused windows
    let activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTabs || activeTabs.length === 0) {
      activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    }
    if (!activeTabs || activeTabs.length === 0) {
      activeTabs = await chrome.tabs.query({ active: true });
    }

    const activeTab = activeTabs[0];

    if (!activeTab || typeof activeTab.id !== 'number') {
      this.showNotification('Pepper Quick Save', 'No active tab found in focused window.');
      return false;
    }

    const tabId = activeTab.id;

    // Mutex Lock: Prevent rapid shortcut presses from duplicate processing
    if (this.processingTabIds.has(tabId)) {
      console.warn(`PEPPER QuickSave: Tab ${tabId} is already being saved.`);
      return false;
    }

    this.processingTabIds.add(tabId);

    try {
      // Step 2: Validate tab URL
      const rawUrl = activeTab.url || '';
      if (!isSaveableUrl(rawUrl)) {
        this.showNotification(
          'Pepper Quick Save',
          'This tab cannot be saved by Pepper (internal/restricted page). The tab remains open.'
        );
        return false;
      }

      // Step 3: Destination Resolution (Context-aware)
      const settings = await settingsRepo.get();
      const allSessions = await sessionEngine.getAllSessions();

      let targetSession: PepperSession | null = null;

      const asTab = (t: chrome.tabs.Tab, index: number): PepperTab => ({
        id: t.id,
        url: t.url || '',
        title: t.title || 'Untitled Tab',
        favIconUrl: t.favIconUrl || '',
        index,
        pinned: t.pinned || false,
      });

      if (settings.quickSaveDestination === 'current_workspace') {
        // Most recently touched workspace that is not the inbox
        targetSession =
          allSessions
            .filter((s) => s.id !== INBOX_SESSION_ID)
            .sort((x, y) => (y.updatedAt ?? y.createdAt) - (x.updatedAt ?? x.createdAt))[0] || null;
      }

      // Default: Pepper Inbox workspace (fixed ID, created on first use)
      let createdInbox = false;
      if (!targetSession) {
        targetSession = allSessions.find((s) => s.id === INBOX_SESSION_ID) || null;
        if (!targetSession) {
          targetSession = await sessionEngine.createSession('Pepper Inbox', [asTab(activeTab, 0)], {
            id: INBOX_SESSION_ID,
            projectName: 'General',
            isPinned: true,
            userNamed: true,
          });
          createdInbox = true;
        }
      }

      // Step 4: Duplicate Check & Tab Record Creation
      const cleanTargetUrl = this.cleanUrl(rawUrl);
      const alreadySaved =
        createdInbox || targetSession.tabs.some((t) => this.cleanUrl(t.url) === cleanTargetUrl);

      const stablePepperId = `saved_tab_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;

      const tabToAppend = asTab(activeTab, targetSession.tabs.length);

      const savedTabRecord: SavedTabRecord = {
        id: stablePepperId,
        url: rawUrl,
        title: activeTab.title || 'Untitled Tab',
        faviconUrl: activeTab.favIconUrl || '',
        savedAt: Date.now(),
        source: 'keyboard-shortcut',
        workspaceId: targetSession.id,
        workspaceName: targetSession.name,
        originalWindowId: activeTab.windowId,
        originalTabIndex: activeTab.index,
        wasPinned: activeTab.pinned || false,
        status: 'saved',
      };

      // Step 5: Write to persistent storage (skip if this URL is already in the workspace)
      if (!alreadySaved) {
        const updatedTabs = [...targetSession.tabs, tabToAppend];
        await sessionEngine.updateSession(targetSession.id, {
          tabs: updatedTabs,
          tabCount: updatedTabs.length,
          updatedAt: Date.now(),
        });
      }

      // Step 6: Verify Persistent Readback
      const verifiedSession = await sessionEngine.getSessionById(targetSession.id);
      const verified = verifiedSession?.tabs.some((t) => this.cleanUrl(t.url) === cleanTargetUrl);

      if (!verified) {
        throw new Error('Storage readback verification failed. Tab was not saved.');
      }

      // Store Undo State
      await this.saveUndoState({
        savedRecord: savedTabRecord,
        tabData: tabToAppend,
        targetSessionId: targetSession.id,
        originalWindowId: activeTab.windowId,
        originalTabIndex: activeTab.index,
        appended: !alreadySaved,
      });

      // Step 7: Handle Single-Tab Window Edge Case & Close Tab
      const windowTabs = await chrome.tabs.query({ windowId: activeTab.windowId });
      if (windowTabs.length <= 1) {
        // Create new tab first so window doesn't collapse unexpectedly
        await chrome.tabs.create({ windowId: activeTab.windowId, active: true });
      }

      // Safe Tab Removal (Only after verified save)
      await chrome.tabs.remove(tabId);
      await sessionEngine.refreshBadge();

      // Step 8: User Feedback
      if (settings.quickSaveFeedback !== false) {
        this.showNotification(
          'pepper_quicksave_' + Date.now(),
          `✓ Tab Saved to Pepper: "${activeTab.title || 'Untitled'}"`,
          `Saved to ${targetSession.name}. Use the Undo button to restore it.`
        );
      }

      return true;
    } catch (err) {
      console.error('PEPPER QuickSave Transaction Error:', err);
      this.showNotification(
        'Pepper Quick Save Error',
        `Pepper could not save this tab. Your tab remains open.`
      );
      return false;
    } finally {
      this.processingTabIds.delete(tabId);
    }
  }

  /**
   * Undo Last Save & Close Action
   */
  async undoLastSave(): Promise<boolean> {
    const undo = await this.loadUndoState();
    if (!undo || typeof chrome === 'undefined' || !chrome.tabs) {
      return false;
    }

    const { savedRecord, targetSessionId, originalWindowId, originalTabIndex, appended } = undo;

    try {
      // 1. Re-open Tab in Chrome
      let targetWindowId = originalWindowId;
      if (targetWindowId) {
        const winExists = await chrome.windows.get(targetWindowId).catch(() => null);
        if (!winExists) {
          const focusedWin = await chrome.windows.getLastFocused().catch(() => null);
          targetWindowId = focusedWin?.id;
        }
      }

      await chrome.tabs.create({
        windowId: targetWindowId,
        url: savedRecord.url,
        index: originalTabIndex,
        active: true,
        pinned: savedRecord.wasPinned,
      });

      // 2. Remove Tab from Pepper Workspace
      const session = await sessionEngine.getSessionById(targetSessionId);
      if (session && appended) {
        const remainingTabs = session.tabs.filter((t) => this.cleanUrl(t.url) !== this.cleanUrl(savedRecord.url));
        await sessionEngine.updateSession(targetSessionId, {
          tabs: remainingTabs,
          tabCount: remainingTabs.length,
        });
      }

      await this.saveUndoState(null);
      this.showNotification('Pepper Quick Save', `✓ Tab restored: "${savedRecord.title}"`);
      return true;
    } catch (err) {
      console.error('PEPPER Undo Error:', err);
      return false;
    }
  }


  private cleanUrl(url: string): string {
    if (!url) return '';
    try {
      const u = new URL(url);
      return `${u.hostname}${u.pathname}`.replace(/\/$/, '');
    } catch {
      return url.toLowerCase().trim();
    }
  }

  private showNotification(idOrTitle: string, message: string, context?: string): void {
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      const notifId = idOrTitle.startsWith('pepper_') ? idOrTitle : `pepper_notif_${Date.now()}`;
      chrome.notifications.create(
        notifId,
        {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
          title: idOrTitle.startsWith('pepper_') ? 'Pepper Quick Save' : idOrTitle,
          message: message,
          contextMessage: context || 'Pepper Workspace Platform',
          ...(notifId.startsWith('pepper_quicksave_') ? { buttons: [{ title: 'Undo' }] } : {}),
          priority: 2,
        },
        () => {}
      );
    }
  }
}

export const quickSaveEngine = new QuickSaveEngine();
