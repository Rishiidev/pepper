import { sessionEngine } from './session-engine';
import { recentWorkspaces } from './workspace-membership';
import { settingsRepo } from '../../storage/repositories/settings-repo';

export const MENU = {
  SAVE_WINDOW: 'pepper-v2-save-window',
  OPEN_MANAGER: 'pepper-v2-open-manager',
  OPEN_SIDE_PANEL: 'pepper-open-side-panel',
  ADD_PARENT: 'pepper-add-parent',
  ADD_PREFIX: 'pepper-add:',
  ADD_ACTIVE: 'pepper-add-active',
  ADD_NEW: 'pepper-add-new',
  ADD_TASK: 'pepper-add-task',
} as const;

const CONTEXTS: chrome.contextMenus.ContextType[] = ['action', 'page'];

function create(props: chrome.contextMenus.CreateProperties): Promise<void> {
  return new Promise((resolve) => {
    chrome.contextMenus.create(props, () => {
      void chrome.runtime.lastError; // ignore duplicate-id races
      resolve();
    });
  });
}

/** Rebuilds the right-click menus, including the "Add to workspace" list of recent workspaces. */
export async function rebuildContextMenus(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.contextMenus) return;
  await new Promise<void>((r) => chrome.contextMenus.removeAll(() => r()));

  await create({ id: MENU.SAVE_WINDOW, title: 'Save current window tabs to PEPPER', contexts: CONTEXTS });
  await create({ id: MENU.OPEN_MANAGER, title: 'Open PEPPER Workspace Manager', contexts: CONTEXTS });
  await create({ id: MENU.OPEN_SIDE_PANEL, title: 'Open PEPPER side panel', contexts: CONTEXTS });

  await create({ id: MENU.ADD_TASK, title: 'Add this tab as a task', contexts: CONTEXTS });
  await create({ id: MENU.ADD_PARENT, title: 'Add this tab to workspace', contexts: CONTEXTS });

  const [sessions, settings] = await Promise.all([sessionEngine.getAllSessions(), settingsRepo.get()]);
  const active = sessions.find((s) => s.id === settings.activeWorkspaceId);
  if (active) {
    await create({ id: MENU.ADD_ACTIVE, parentId: MENU.ADD_PARENT, title: `★ ${active.name} (active)`, contexts: CONTEXTS });
  }
  for (const w of recentWorkspaces(sessions, 6).filter((w) => w.id !== active?.id)) {
    await create({ id: `${MENU.ADD_PREFIX}${w.id}`, parentId: MENU.ADD_PARENT, title: w.name.slice(0, 60), contexts: CONTEXTS });
  }
  await create({ id: MENU.ADD_NEW, parentId: MENU.ADD_PARENT, title: 'New workspace from this tab…', contexts: CONTEXTS });
}
