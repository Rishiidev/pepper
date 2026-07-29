import { PepperTab, PepperSession } from '../types/session';
import { SavedTabRecord } from '../types/saved-tab';
import { sessionEngine } from './session-engine';
import { settingsRepo } from '../../storage/repositories/settings-repo';
import { eventBus } from '../events/event-bus';

interface UndoState {
  savedRecord: SavedTabRecord;
  tabData: PepperTab;
  targetSessionId: string;
  originalWindowId?: number;
  originalTabIndex?: number;
}

export class QuickSaveEngine {
  private processingTabIds = new Set<number>();
  private lastUndoState: UndoState | null = null;

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
      if (!this.isSaveableUrl(rawUrl)) {
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

      if (settings.quickSaveDestination === 'current_workspace') {
        // Try to find matching active workspace or latest workspace
        targetSession = allSessions.find((s) => s.isPinned || s.isFavorite) || allSessions[0] || null;
      }

      // Default: Pepper Inbox workspace
      if (!targetSession) {
        let inbox = allSessions.find((s) => s.id === 'pepper_inbox' || s.name === 'Pepper Inbox');
        if (!inbox) {
          inbox = await sessionEngine.createSession(
            'Pepper Inbox',
            [
              {
                url: activeTab.url || '',
                title: activeTab.title || 'Untitled Tab',
                favIconUrl: activeTab.favIconUrl || '',
                index: 0,
                pinned: activeTab.pinned || false,
              },
            ],
            { projectName: 'General', isPinned: true }
          );
          // Set explicit inbox ID
          inbox.id = 'pepper_inbox';
          await sessionEngine.updateSession(inbox.id, { name: 'Pepper Inbox', isPinned: true });
          targetSession = inbox;
        } else {
          targetSession = inbox;
        }
      }

      // Step 4: Duplicate Check & Tab Record Creation
      const cleanTargetUrl = this.cleanUrl(rawUrl);
      const existingTab = targetSession.tabs.find((t) => this.cleanUrl(t.url) === cleanTargetUrl);

      if (existingTab) {
        console.log(`PEPPER QuickSave: Tab URL "${rawUrl}" already saved in workspace ${targetSession.name}.`);
      }

      const stablePepperId = `saved_tab_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;

      const tabToAppend: PepperTab = {
        id: activeTab.id,
        url: rawUrl,
        title: activeTab.title || 'Untitled Tab',
        favIconUrl: activeTab.favIconUrl || '',
        index: targetSession.tabs.length,
        pinned: activeTab.pinned || false,
      };

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

      // Step 5: Write to persistent storage
      const updatedTabs = [...targetSession.tabs, tabToAppend];
      await sessionEngine.updateSession(targetSession.id, {
        tabs: updatedTabs,
        tabCount: updatedTabs.length,
        updatedAt: Date.now(),
      });

      // Step 6: Verify Persistent Readback
      const verifiedSession = await sessionEngine.getSessionById(targetSession.id);
      const verified = verifiedSession?.tabs.some((t) => this.cleanUrl(t.url) === cleanTargetUrl);

      if (!verified) {
        throw new Error('Storage readback verification failed. Tab was not saved.');
      }

      // Store Undo State
      this.lastUndoState = {
        savedRecord: savedTabRecord,
        tabData: tabToAppend,
        targetSessionId: targetSession.id,
        originalWindowId: activeTab.windowId,
        originalTabIndex: activeTab.index,
      };

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
          `Saved to ${targetSession.name}. Click notification or open Pepper to Undo.`
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
    if (!this.lastUndoState || typeof chrome === 'undefined' || !chrome.tabs) {
      return false;
    }

    const { savedRecord, tabData, targetSessionId, originalWindowId, originalTabIndex } = this.lastUndoState;

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

      const createdTab = await chrome.tabs.create({
        windowId: targetWindowId,
        url: savedRecord.url,
        index: originalTabIndex,
        active: true,
        pinned: savedRecord.wasPinned,
      });

      // 2. Remove Tab from Pepper Workspace
      const session = await sessionEngine.getSessionById(targetSessionId);
      if (session) {
        const remainingTabs = session.tabs.filter((t) => this.cleanUrl(t.url) !== this.cleanUrl(savedRecord.url));
        await sessionEngine.updateSession(targetSessionId, {
          tabs: remainingTabs,
          tabCount: remainingTabs.length,
        });
      }

      this.lastUndoState = null;
      this.showNotification('Pepper Quick Save', `✓ Tab restored: "${savedRecord.title}"`);
      return true;
    } catch (err) {
      console.error('PEPPER Undo Error:', err);
      return false;
    }
  }

  private isSaveableUrl(url?: string): boolean {
    if (!url) return false;
    const forbiddenPrefixes = [
      'chrome://',
      'chrome-extension://',
      'about:',
      'edge://',
      'brave://',
      'view-source:',
    ];
    return !forbiddenPrefixes.some((prefix) => url.startsWith(prefix));
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
          buttons: [{ title: 'Undo' }],
          priority: 2,
        },
        () => {}
      );
    }
  }
}

export const quickSaveEngine = new QuickSaveEngine();
