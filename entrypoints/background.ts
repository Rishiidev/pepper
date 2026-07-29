import { defineBackground } from 'wxt/sandbox';
import { workspaceEngine } from '../src/core/engines/workspace-engine';
import { restoreEngine } from '../src/core/engines/restore-engine';
import { sessionEngine } from '../src/core/engines/session-engine';
import { captureEngine } from '../src/core/engines/capture-engine';
import { quickSaveEngine } from '../src/core/engines/quick-save-engine';
import { projectRepo } from '../src/storage/repositories/project-repo';
import { providerRegistry, featureFlagsManager } from '../src/core/intelligence';
import { PEPPER_COMMANDS } from '../src/core/constants/commands';

function isSaveableWebUrl(url?: string): boolean {
  if (!url) return false;
  const forbidden = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'brave://', 'view-source:'];
  return !forbidden.some((p) => url.startsWith(p));
}

export async function openOrFocusPepper(entryFile: string = 'window.html'): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.windows) return;

  const targetUrl = chrome.runtime.getURL(entryFile);
  const windows = await chrome.windows.getAll({ populate: true });

  // 1. Locate an existing Pepper window by checking its tabs
  const existingPepperWindow = windows.find((w) =>
    w.tabs?.some((tab) => tab.url === targetUrl || (tab.url && tab.url.startsWith(targetUrl)))
  );

  if (existingPepperWindow && typeof existingPepperWindow.id === 'number') {
    await chrome.windows.update(existingPepperWindow.id, {
      focused: true,
      state: 'normal',
    });
    return;
  }

  // 2. Calculate centered position relative to current focused Chrome window
  const PEPPER_WIDTH = 760;
  const PEPPER_HEIGHT = 850;

  let currentWindow: chrome.windows.Window | null = null;
  try {
    currentWindow = await chrome.windows.getLastFocused({ populate: false });
  } catch {
    currentWindow = await chrome.windows.getCurrent().catch(() => null);
  }

  const currentLeft = currentWindow?.left ?? 0;
  const currentTop = currentWindow?.top ?? 0;
  const currentWidth = currentWindow?.width ?? 1440;
  const currentHeight = currentWindow?.height ?? 900;

  const left = Math.max(0, Math.round(currentLeft + (currentWidth - PEPPER_WIDTH) / 2));
  const top = Math.max(0, Math.round(currentTop + (currentHeight - PEPPER_HEIGHT) / 2));

  // 3. Create dedicated centered Pepper window
  await chrome.windows.create({
    url: targetUrl,
    type: 'popup',
    width: PEPPER_WIDTH,
    height: PEPPER_HEIGHT,
    left,
    top,
    focused: true,
  });
}

export default defineBackground(() => {
  console.log('[PEPPER DEBUG] Background service worker loaded', new Date().toISOString());

  // Hydrate BYOK providers and feature flags on Service Worker boot
  featureFlagsManager.hydrateFromStorage().then(() => {
    providerRegistry.hydrateFromStorage();
  });

  // === MEMORY ENGINE: Initialize silent auto-capture ===
  captureEngine.initialize();

  // Extension Toolbar Icon Click -> Opens Centered Pepper Window
  if (typeof chrome !== 'undefined' && chrome.action) {
    chrome.action.onClicked.addListener(async () => {
      await openOrFocusPepper('window.html');
    });
  }

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

  // Runtime Messages Listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'PEPPER_EXECUTE_QUICK_SAVE') {
      const { title, projectName, closeTabs } = message.payload;
      workspaceEngine
        .saveWorkspace(title, undefined, projectName, closeTabs)
        .then((session) => {
          sendResponse({ success: !!session, session });
        })
        .catch((err) => {
          console.error('PEPPER: Quick save execution error:', err);
          sendResponse({ success: false, error: String(err) });
        });
      return true;
    }
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

  // Notification Button Click (Undo Action)
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    chrome.notifications.onButtonClicked.addListener(async (notificationId) => {
      if (notificationId.startsWith('pepper_quicksave_')) {
        await quickSaveEngine.undoLastSave();
      }
    });
    chrome.notifications.onClicked.addListener(async (notificationId) => {
      if (notificationId.startsWith('pepper_quicksave_')) {
        await quickSaveEngine.undoLastSave();
      }
    });
  }

  // Keyboard Shortcuts Handler
  chrome.commands.onCommand.addListener(async (command) => {
    try {
      console.log('[PEPPER DEBUG] Command received:', command);
      if (command === PEPPER_COMMANDS.SAVE_AND_CLOSE) {
        await quickSaveEngine.executeSaveAndClose();
      } else if (command === PEPPER_COMMANDS.QUICK_CAPTURE) {
        const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const activeTab = activeTabs[0];

        const tabs = await workspaceEngine.getActiveWindowTabs();
        if (tabs.length === 0) {
          console.warn('PEPPER: No saveable web tabs in current window.');
          return;
        }

        const domainSet = new Set(
          tabs
            .map((t) => {
              try {
                return new URL(t.url).hostname.replace(/^www\./, '');
              } catch {
                return '';
              }
            })
            .filter(Boolean)
        );

        const projects = await projectRepo.getAll();
        const projectNames = projects.map((p) => p.name);

        const metaPayload = {
          tabs,
          domainCount: domainSet.size,
          estimatedRamSavedMb: Math.round(tabs.length * 55),
          projects: ['General', ...projectNames.filter((p) => p !== 'General')],
        };

        console.debug('[PEPPER DEBUG] Command received:', command);
        console.debug('[PEPPER DEBUG] Active tab resolved:', activeTab?.url, 'id:', activeTab?.id);

        let sent = false;
        if (activeTab && activeTab.id) {
          // Step 1: Ping content script first
          let pingOk = false;
          try {
            const pingRes = await chrome.tabs.sendMessage(activeTab.id, { type: 'PEPPER_PING' });
            if (pingRes && pingRes.ok) {
              pingOk = true;
              console.debug('[PEPPER DEBUG] Content script available');
            }
          } catch (err) {
            console.debug('[PEPPER DEBUG] Content script ping failed, attempting dynamic injection...');
          }

          // Step 2: If ping failed and tab is a normal webpage, dynamically inject content script
          if (!pingOk && activeTab.url && isSaveableWebUrl(activeTab.url)) {
            try {
              if (chrome.scripting) {
                await chrome.scripting.executeScript({
                  target: { tabId: activeTab.id },
                  files: ['content-scripts/content.js'],
                });
                console.debug('[PEPPER DEBUG] Dynamic content script injection succeeded');
                pingOk = true;
              }
            } catch (injErr) {
              console.warn('[PEPPER DEBUG] Dynamic content script injection failed:', injErr);
            }
          }

          // Step 3: Send Quick Capture Toggle Message
          if (pingOk) {
            try {
              const res = await chrome.tabs.sendMessage(activeTab.id, {
                type: 'PEPPER_TOGGLE_QUICK_CAPTURE',
                payload: metaPayload,
              });
              if (res && res.received) {
                sent = true;
                console.debug('[PEPPER DEBUG] Quick Capture message delivered & overlay opened');
              }
            } catch (msgErr) {
              console.warn('[PEPPER DEBUG] Message delivery failed:', msgErr);
            }
          }
        }

        // Restricted page fallback: launch popup fallback window
        if (!sent) {
          console.log('[PEPPER DEBUG] Restricted page fallback. Opening popup window.');
          await chrome.windows.create({
            url: chrome.runtime.getURL('popup.html?quickCapture=true'),
            type: 'popup',
            width: 440,
            height: 580,
            focused: true,
          });
        }
      } else if (command === PEPPER_COMMANDS.OPEN_MANAGER) {
        const managerUrl = chrome.runtime.getURL('manager.html');
        const existing = await chrome.tabs.query({ url: managerUrl });
        if (existing.length > 0 && existing[0].id) {
          await chrome.tabs.update(existing[0].id, { active: true });
        } else {
          await chrome.tabs.create({ url: managerUrl, active: true });
        }
      } else if (command === PEPPER_COMMANDS.RESTORE_LAST) {
        await restoreEngine.restoreLastSession();
      } else if (command === PEPPER_COMMANDS.TOGGLE_FOCUS) {
        const data = await chrome.storage.local.get('pepper_active_focus_state');
        const currentState = data.pepper_active_focus_state;

        if (currentState && currentState.activeSession) {
          const updated = {
            ...currentState,
            isPaused: !currentState.isPaused,
            _pausedAtWallClock: !currentState.isPaused ? Date.now() : currentState._pausedAtWallClock,
          };
          await chrome.storage.local.set({ pepper_active_focus_state: updated });

          if (chrome.notifications) {
            chrome.notifications.create(`pepper_focus_toggle_${Date.now()}`, {
              type: 'basic',
              iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
              title: 'Pepper Focus System',
              message: updated.isPaused ? '⏸️ Focus session paused.' : '▶️ Focus session resumed.',
              priority: 1,
            });
          }
        } else {
          if (chrome.notifications) {
            chrome.notifications.create(`pepper_focus_toggle_${Date.now()}`, {
              type: 'basic',
              iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
              title: 'Pepper Focus System',
              message: 'No active focus session running. Open Pepper Focus to start.',
              priority: 1,
            });
          }
        }
      }
    } catch (err) {
      console.error(`PEPPER command error (${command}):`, err);
    }
  });
});
