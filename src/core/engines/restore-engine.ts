import { sessionEngine, INBOX_SESSION_ID } from './session-engine';
import { PepperTab } from '../types/session';
import { recordActivation } from './activation';
import { eventBus } from '../events/event-bus';

export class RestoreEngine {
  async restoreSession(sessionId: string, selectedTabIndices?: number[]): Promise<void> {
    const session = await sessionEngine.getSessionById(sessionId);
    if (!session) throw new Error(`Session with id ${sessionId} not found`);

    let tabsToRestore: PepperTab[] = session.tabs;

    if (selectedTabIndices && selectedTabIndices.length > 0) {
      const set = new Set(selectedTabIndices);
      tabsToRestore = session.tabs.filter((_, idx) => set.has(idx));
    }

    if (tabsToRestore.length === 0) {
      throw new Error('No tabs selected for restoration');
    }

    if (typeof chrome === 'undefined' || !chrome.windows) {
      console.log('Restoring in non-extension env:', tabsToRestore);
      eventBus.emit('session:restored', { sessionId, tabCount: tabsToRestore.length });
      return;
    }

    // Reopen every tab in saved order and focus the one the user was on.
    const activeIdx =
      !selectedTabIndices?.length && session.activeTabIndex !== undefined && session.activeTabIndex < tabsToRestore.length
        ? session.activeTabIndex
        : 0;

    const activeTab = tabsToRestore[activeIdx];
    const newWindow = await chrome.windows.create({ url: activeTab.url, focused: true });
    if (newWindow.id === undefined) throw new Error('Failed to create window for restore');
    const windowId = newWindow.id;

    const firstTabs = newWindow.tabs || (await chrome.tabs.query({ windowId }));
    if (activeTab.pinned && firstTabs[0]?.id !== undefined) {
      await chrome.tabs.update(firstTabs[0].id, { pinned: true });
    }

    // Create the others in saved order; tabs before the active one go before it.
    let insertIndex = 0;
    for (let i = 0; i < tabsToRestore.length; i++) {
      if (i === activeIdx) {
        insertIndex++;
        continue;
      }
      try {
        await chrome.tabs.create({
          windowId,
          url: tabsToRestore[i].url,
          index: insertIndex,
          active: false,
          pinned: tabsToRestore[i].pinned || false,
        });
        insertIndex++;
      } catch (err) {
        console.warn('PEPPER: Failed to restore tab', tabsToRestore[i].url, err);
      }
    }

    void recordActivation('restore');
    await sessionEngine.updateSession(sessionId, { restoredAt: Date.now() }).catch(() => undefined);
    eventBus.emit('session:restored', { sessionId, tabCount: tabsToRestore.length });
  }

  async restoreLastSession(): Promise<void> {
    const sessions = await sessionEngine.getAllSessions();
    if (sessions.length === 0) return;
    const latest = sessions.find((s) => s.id !== INBOX_SESSION_ID);
    if (!latest) return;
    await this.restoreSession(latest.id);
  }
}

export const restoreEngine = new RestoreEngine();
