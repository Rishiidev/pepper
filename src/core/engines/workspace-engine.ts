import { PepperTab, PepperSession } from '../types/session';
import { sessionEngine } from './session-engine';
import { settingsRepo } from '../../storage/repositories/settings-repo';
import { sessionNamingSkill } from '../../skills/session-naming';

export class WorkspaceEngine {
  async getActiveWindowTabs(): Promise<PepperTab[]> {
    if (typeof chrome === 'undefined' || !chrome.tabs) return [];

    try {
      // 1. Try querying the last focused 'normal' browser window first
      let tabs = await chrome.tabs.query({ lastFocusedWindow: true, windowType: 'normal' });
      let saveable = tabs.filter(tab => this.isSaveableUrl(tab.url));

      // 2. If the focused window has no saveable web tabs (e.g. user is on manager.html in its own window),
      // search across all normal windows to find the active web workspace window
      if (saveable.length === 0) {
        const allTabs = await chrome.tabs.query({ windowType: 'normal' });
        const allSaveable = allTabs.filter(tab => this.isSaveableUrl(tab.url));

        if (allSaveable.length > 0) {
          // Group by windowId and find the window with the most web tabs
          const windowGroups = new Map<number, typeof allSaveable>();
          for (const t of allSaveable) {
            if (t.windowId) {
              const list = windowGroups.get(t.windowId) || [];
              list.push(t);
              windowGroups.set(t.windowId, list);
            }
          }

          let bestTabs: typeof allSaveable = [];
          for (const list of windowGroups.values()) {
            if (list.length > bestTabs.length) {
              bestTabs = list;
            }
          }
          saveable = bestTabs;
        }
      }

      return saveable.map((tab, idx) => ({
        id: tab.id,
        url: tab.url || '',
        title: tab.title || 'Untitled',
        favIconUrl: tab.favIconUrl || '',
        index: tab.index ?? idx,
        pinned: tab.pinned || false,
      }));
    } catch (err) {
      console.error('PEPPER: Failed to get active window tabs:', err);
      return [];
    }
  }

  async saveWorkspace(customName?: string, selectedTabs?: PepperTab[]): Promise<PepperSession | null> {
    const settings = await settingsRepo.get();
    const allTabs = await this.getActiveWindowTabs();
    const tabsToSave = selectedTabs && selectedTabs.length > 0 ? selectedTabs : allTabs;

    if (tabsToSave.length === 0) {
      console.warn('PEPPER: No saveable web tabs found in any window.');
      return null;
    }

    const sessionName = sessionNamingSkill.generateDefaultName(settings, tabsToSave, customName);
    const session = await sessionEngine.createSession(sessionName, tabsToSave, {
      projectName: settings.defaultProjectName,
    });

    if (settings.closeTabsOnSave !== false) {
      await this.closeSavedTabs(tabsToSave);
    }

    return session;
  }

  async closeSavedTabs(tabsToClose: PepperTab[]): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    const tabIds = tabsToClose
      .map(t => t.id)
      .filter((id): id is number => typeof id === 'number');

    if (tabIds.length === 0) return;

    try {
      // Find the window of these tabs to check if we need to create a new tab before removing
      const sampleTabId = tabIds[0];
      const targetTab = await chrome.tabs.get(sampleTabId).catch(() => null);
      const targetWindowId = targetTab ? targetTab.windowId : undefined;

      const windowTabs = targetWindowId
        ? await chrome.tabs.query({ windowId: targetWindowId })
        : await chrome.tabs.query({ lastFocusedWindow: true, windowType: 'normal' });

      // If closing all tabs in that window, open a new blank tab first so window stays open
      if (windowTabs.length <= tabIds.length) {
        if (targetWindowId) {
          await chrome.tabs.create({ windowId: targetWindowId, active: true });
        } else {
          await chrome.tabs.create({ active: true });
        }
      }

      await chrome.tabs.remove(tabIds);
    } catch (err) {
      console.warn('PEPPER: Batch tab removal fallback:', err);
      for (const id of tabIds) {
        try {
          await chrome.tabs.remove(id);
        } catch {
          // Tab may already be closed
        }
      }
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
    ];
    return !forbiddenPrefixes.some(prefix => url.startsWith(prefix));
  }
}

export const workspaceEngine = new WorkspaceEngine();
