import { sessionEngine } from './session-engine';
import { PepperTab } from '../types/session';
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

    // Open first tab in a new focused window
    const firstTab = tabsToRestore[0];
    const newWindow = await chrome.windows.create({
      url: firstTab.url,
      focused: true,
    });

    // Append remaining tabs to the new window
    if (newWindow.id && tabsToRestore.length > 1) {
      for (let i = 1; i < tabsToRestore.length; i++) {
        await chrome.tabs.create({
          windowId: newWindow.id,
          url: tabsToRestore[i].url,
          active: false,
          pinned: tabsToRestore[i].pinned || false,
        });
      }
    }

    eventBus.emit('session:restored', { sessionId, tabCount: tabsToRestore.length });
  }

  async restoreLastSession(): Promise<void> {
    const sessions = await sessionEngine.getAllSessions();
    if (sessions.length === 0) return;
    const latest = sessions[0];
    await this.restoreSession(latest.id);
  }
}

export const restoreEngine = new RestoreEngine();
