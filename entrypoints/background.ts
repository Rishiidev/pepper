import { defineBackground } from 'wxt/sandbox';
import { workspaceEngine } from '../src/core/engines/workspace-engine';
import { restoreEngine } from '../src/core/engines/restore-engine';
import { sessionEngine } from '../src/core/engines/session-engine';

export default defineBackground(() => {
  console.log('PEPPER v2 background service worker initialized');

  // Install Event
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      try {
        await chrome.tabs.create({
          url: chrome.runtime.getURL('manager.html'),
          active: true,
        });
      } catch (err) {
        console.error('Failed to open manager on install:', err);
      }
    }

    // Context Menus
    try {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: 'pepper-v2-save-window',
          title: 'Save current window tabs to PEPPER',
          contexts: ['action', 'page'],
        });
        chrome.contextMenus.create({
          id: 'pepper-v2-open-manager',
          title: 'Open PEPPER Workspace Manager',
          contexts: ['action', 'page'],
        });
      });
    } catch (err) {
      console.error('Context menu setup failed:', err);
    }

    await sessionEngine.refreshBadge();
  });

  // Context Menu Clicks
  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId === 'pepper-v2-save-window') {
      try {
        const result = await workspaceEngine.saveWorkspace();
        if (!result) {
          console.log('PEPPER: No saveable web tabs were found to save.');
        }
      } catch (err) {
        console.error('Context menu save failed:', err);
      }
    } else if (info.menuItemId === 'pepper-v2-open-manager') {
      await chrome.tabs.create({ url: chrome.runtime.getURL('manager.html'), active: true });
    }
  });

  // Keyboard Shortcuts
  chrome.commands.onCommand.addListener(async (command) => {
    try {
      if (command === 'save-session') {
        const result = await workspaceEngine.saveWorkspace();
        if (!result) {
          console.log('PEPPER: Shortcut triggered but no saveable web tabs were found in any open window.');
        }
      } else if (command === 'open-manager') {
        const managerUrl = chrome.runtime.getURL('manager.html');
        const existing = await chrome.tabs.query({ url: managerUrl });
        if (existing.length > 0 && existing[0].id) {
          await chrome.tabs.update(existing[0].id, { active: true });
        } else {
          await chrome.tabs.create({ url: managerUrl, active: true });
        }
      } else if (command === 'restore-last') {
        await restoreEngine.restoreLastSession();
      }
    } catch (err) {
      console.error(`PEPPER command error (${command}):`, err);
    }
  });
});
