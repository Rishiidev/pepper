import { defineBackground } from 'wxt/sandbox';
import { workspaceEngine } from '../src/core/engines/workspace-engine';
import { restoreEngine } from '../src/core/engines/restore-engine';
import { sessionEngine, RAM_PER_TAB_MB } from '../src/core/engines/session-engine';
import { captureEngine } from '../src/core/engines/capture-engine';
import { sessionRecorder } from '../src/core/engines/session-recorder';
import { quickSaveEngine } from '../src/core/engines/quick-save-engine';
import { projectRepo } from '../src/storage/repositories/project-repo';
import { settingsRepo } from '../src/storage/repositories/settings-repo';
import { taskEngine } from '../src/core/engines/task-engine';
import { providerRegistry, featureFlagsManager } from '../src/core/intelligence';
import { isSaveableUrl } from '../src/core/utils/url';
import { rebuildContextMenus, MENU } from '../src/core/engines/context-menus';
import { workspaceMembership } from '../src/core/engines/workspace-membership';
import { announceAdded, announceCapture } from '../src/core/engines/capture-feedback';
import { generateSessionName, baseDomain } from '../src/core/engines/session-naming';
import { syncFocusAlarms, handleFocusAlarm, FOCUS_STATE_KEY } from '../src/core/engines/focus-background';
import { PEPPER_COMMANDS } from '../src/core/constants/commands';
import { focusEngine } from '../src/core/engines/focus-engine';
import { elapsedSeconds } from '../src/core/engines/focus-timing';

async function openManager(query = ''): Promise<void> {
  const base = chrome.runtime.getURL('manager.html');
  const existing = await chrome.tabs.query({ url: `${base}*` });
  const url = query ? `${base}?${query}` : base;
  if (existing[0]?.id !== undefined) {
    // Only navigate when asked to: a bare "open" must not reload the page and drop the user's current view
    await chrome.tabs.update(existing[0].id, query ? { active: true, url } : { active: true });
    if (existing[0].windowId !== undefined) await chrome.windows.update(existing[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url, active: true });
  }
}

function tabToPepperTab(tab: chrome.tabs.Tab) {
  return { id: tab.id, url: tab.url || '', title: tab.title || 'Untitled', favIconUrl: tab.favIconUrl || '', index: tab.index ?? 0, pinned: tab.pinned || false };
}

async function openSidePanel(windowId?: number): Promise<void> {
  try {
    const target = windowId ?? (await chrome.windows.getLastFocused()).id;
    if (target !== undefined && chrome.sidePanel) await chrome.sidePanel.open({ windowId: target });
  } catch (err) {
    console.warn('Could not open side panel:', err);
  }
}

/** Shared by the shortcut and the "Add to workspace" menu entries. */
async function addTabFromMenu(tab: chrome.tabs.Tab | undefined, target: 'active' | 'new' | string): Promise<void> {
  const active = tab ?? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  if (!active?.url || !isSaveableUrl(active.url)) return;
  const pt = tabToPepperTab(active);

  if (target === 'new') {
    const host = new URL(active.url).hostname;
    const name = generateSessionName([pt], [baseDomain(host)]);
    const created = await workspaceMembership.createFromTabs(name, [pt]);
    await workspaceMembership.setActiveWorkspace(created.id);
    await announceCapture(created);
  } else if (target === 'active') {
    const res = await workspaceMembership.addToActiveOrInbox([pt]);
    if (res) await announceAdded(res.workspace.name, res.added, res.skipped);
  } else {
    const res = await workspaceMembership.addTabs(target, [pt]);
    await announceAdded(res.workspace.name, res.added, res.skipped);
  }
}

/** Adds the tab as a task and confirms with a two-second badge tick. Never a notification, never on the page. */
async function addTaskFromMenu(tab: chrome.tabs.Tab | undefined): Promise<void> {
  const target = tab ?? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  if (!target?.url || !isSaveableUrl(target.url)) return;
  const settings = await settingsRepo.get();
  const added = await taskEngine.addFromTab(target, settings.activeWorkspaceId);
  if (!added) return;
  try {
    await chrome.action.setBadgeBackgroundColor({ color: '#30D158' });
    await chrome.action.setBadgeText({ text: '✓' });
    setTimeout(() => void sessionEngine.refreshBadge(), 2000);
  } catch {
    // badge is only a courtesy
  }
}

export default defineBackground(() => {
  // Hydrate BYOK providers and feature flags on Service Worker boot
  featureFlagsManager.hydrateFromStorage().then(() => {
    providerRegistry.hydrateFromStorage();
  });

  // === MEMORY ENGINE: Initialize silent auto-capture ===
  captureEngine.initialize();

  // === BROWSER SESSION TIMELINE (opt-in; no-op until enabled in settings) ===
  sessionRecorder.initialize();

  // Toolbar icon opens popup.html (default_popup); the action badge is not persisted across restarts.
  sessionEngine.refreshBadge();

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

    await rebuildContextMenus();

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

  // Keep the "Add to workspace" list fresh when workspaces or the active workspace change
  let menuTimer: ReturnType<typeof setTimeout> | null = null;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(changes.pepper_last_updated || changes.pepper_v2_settings)) return;
    if (menuTimer) clearTimeout(menuTimer);
    menuTimer = setTimeout(() => void rebuildContextMenus(), 1000);
  });

  // Context Menu Clicks
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
      const id = String(info.menuItemId);
      if (id === MENU.SAVE_WINDOW) {
        const result = await workspaceEngine.saveWorkspace();
        if (!result) console.log('PEPPER: No saveable web tabs were found to save.');
      } else if (id === MENU.OPEN_MANAGER) {
        await openManager();
      } else if (id === MENU.OPEN_SIDE_PANEL) {
        await openSidePanel(tab?.windowId);
      } else if (id === MENU.ADD_TASK) {
        await addTaskFromMenu(tab);
      } else if (id === MENU.ADD_ACTIVE) {
        await addTabFromMenu(tab, 'active');
      } else if (id === MENU.ADD_NEW) {
        await addTabFromMenu(tab, 'new');
      } else if (id.startsWith(MENU.ADD_PREFIX)) {
        await addTabFromMenu(tab, id.slice(MENU.ADD_PREFIX.length));
      }
    } catch (err) {
      console.error('Context menu action failed:', err);
    }
  });

  // Notification actions
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
      if (notificationId.startsWith('pepper_quicksave_')) {
        await quickSaveEngine.undoLastSave();
      } else if (notificationId.startsWith('pepper_capture_')) {
        const sessionId = notificationId.slice('pepper_capture_'.length);
        if (buttonIndex === 0) {
          await restoreEngine.restoreSession(sessionId).catch((err) => console.warn('Reopen failed:', err));
        } else {
          await openManager(`capture=${encodeURIComponent(sessionId)}`);
        }
        chrome.notifications.clear(notificationId);
      }
    });
    chrome.notifications.onClicked.addListener(async (notificationId) => {
      if (notificationId.startsWith('pepper_capture_')) {
        await openManager(`capture=${encodeURIComponent(notificationId.slice('pepper_capture_'.length))}`);
        chrome.notifications.clear(notificationId);
      }
    });
  }

  // Pomodoro runs in the background: alarms finish it and keep the badge current
  chrome.alarms?.onAlarm.addListener((alarm) => void handleFocusAlarm(alarm.name));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[FOCUS_STATE_KEY]) void syncFocusAlarms();
  });
  void syncFocusAlarms();

  // Best-effort: write the last-known window state before Chrome unloads the worker
  chrome.runtime.onSuspend?.addListener(() => {
    void captureEngine.flush();
  });

  // Keyboard Shortcuts Handler
  chrome.commands.onCommand.addListener(async (command) => {
    try {
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
          estimatedRamSavedMb: Math.round(tabs.length * RAM_PER_TAB_MB),
          projects: ['General', ...projectNames.filter((p) => p !== 'General')],
        };

        let sent = false;
        if (activeTab && activeTab.id) {
          // Step 1: Ping content script first
          let pingOk = false;
          try {
            const pingRes = await chrome.tabs.sendMessage(activeTab.id, { type: 'PEPPER_PING' });
            if (pingRes && pingRes.ok) {
              pingOk = true;
            }
          } catch {
            // fall through to the next step
          }

          // Step 2: If ping failed and tab is a normal webpage, dynamically inject content script
          if (!pingOk && activeTab.url && isSaveableUrl(activeTab.url)) {
            try {
              if (chrome.scripting) {
                await chrome.scripting.executeScript({
                  target: { tabId: activeTab.id },
                  files: ['content-scripts/content.js'],
                });
                pingOk = true;
              }
            } catch {
            // fall through to the next step
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
              }
            } catch {
            // fall through to the next step
          }
          }
        }

        // Restricted page fallback: launch popup fallback window
        if (!sent) {
          await chrome.windows.create({
            url: chrome.runtime.getURL('popup.html?quickCapture=true'),
            type: 'popup',
            width: 440,
            height: 580,
            focused: true,
          });
        }
      } else if (command === PEPPER_COMMANDS.ADD_TAB) {
        await addTabFromMenu(undefined, 'active');
      } else if (command === PEPPER_COMMANDS.OPEN_SIDE_PANEL) {
        await openSidePanel();
      } else if (command === PEPPER_COMMANDS.OPEN_MANAGER) {
        await openManager();
      } else if (command === PEPPER_COMMANDS.RESTORE_LAST) {
        await restoreEngine.restoreLastSession();
      } else if (command === PEPPER_COMMANDS.TOGGLE_FOCUS) {
        const data = await chrome.storage.local.get('pepper_active_focus_state');
        const currentState = data.pepper_active_focus_state;

        if (currentState && currentState.activeSession) {
          // Resuming must add the pause length to the total or the timer jumps forward
          const pausing = !currentState.isPaused;
          const updated = {
            ...currentState,
            isPaused: pausing,
            _pausedAtWallClock: pausing ? Date.now() : null,
            _totalPausedMs: pausing
              ? currentState._totalPausedMs
              : (currentState._totalPausedMs || 0) + (currentState._pausedAtWallClock ? Date.now() - currentState._pausedAtWallClock : 0),
          };
          await chrome.storage.local.set({ pepper_active_focus_state: updated });
          // Keep the database status in step with the stored timer
          const nowElapsed = elapsedSeconds(updated, Date.now());
          if (pausing) await focusEngine.pauseSession(currentState.activeSession.id, nowElapsed);
          else await focusEngine.resumeSession(currentState.activeSession.id, nowElapsed);

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
