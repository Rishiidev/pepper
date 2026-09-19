import { PepperSession, PepperTab } from '../types/session';
import { INBOX_SESSION_ID } from '../constants/ids';
import { cleanUrlKey, isSaveableUrl } from '../utils/url';
import { sessionEngine } from './session-engine';
import { settingsRepo } from '../../storage/repositories/settings-repo';

export interface AddResult {
  workspace: PepperSession;
  added: number;
  skipped: number;
}

/** Pure: which of `incoming` are not already in `existing`, and deduped among themselves. */
export function newTabsOnly(existing: PepperTab[], incoming: PepperTab[]): PepperTab[] {
  const seen = new Set(existing.map((t) => cleanUrlKey(t.url)));
  const out: PepperTab[] = [];
  for (const t of incoming) {
    const key = cleanUrlKey(t.url);
    if (!t.url || !isSaveableUrl(t.url) || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Workspaces the user is likely to add to, most recently used first. */
export function recentWorkspaces(all: PepperSession[], limit = 6): PepperSession[] {
  return all
    .filter((w) => w.id !== INBOX_SESSION_ID)
    .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
    .slice(0, limit);
}

export class WorkspaceMembership {
  async addTabs(workspaceId: string, tabs: PepperTab[]): Promise<AddResult> {
    const ws = await sessionEngine.getSessionById(workspaceId);
    if (!ws) throw new Error('Workspace not found');

    const fresh = newTabsOnly(ws.tabs, tabs);
    if (fresh.length === 0) return { workspace: ws, added: 0, skipped: tabs.length };

    const merged = [...ws.tabs, ...fresh].map((t, index) => ({
      url: t.url,
      title: t.title || 'Untitled Tab',
      favIconUrl: t.favIconUrl || '',
      index,
      pinned: t.pinned || false,
    }));
    const updated = await sessionEngine.updateSession(ws.id, { tabs: merged, tabCount: merged.length });
    return { workspace: updated, added: fresh.length, skipped: tabs.length - fresh.length };
  }

  async createFromTabs(name: string, tabs: PepperTab[], projectName?: string): Promise<PepperSession> {
    const usable = newTabsOnly([], tabs);
    if (usable.length === 0) throw new Error('No saveable tabs to add');
    return sessionEngine.createSession(name.trim() || 'New Workspace', usable, {
      userNamed: true,
      projectName: projectName || 'General',
    });
  }

  async getActiveWorkspace(): Promise<PepperSession | null> {
    const { activeWorkspaceId } = await settingsRepo.get();
    if (!activeWorkspaceId) return null;
    return (await sessionEngine.getSessionById(activeWorkspaceId)) ?? null;
  }

  async setActiveWorkspace(id: string | null): Promise<void> {
    await settingsRepo.save({ activeWorkspaceId: id });
  }

  /** Adds tabs to the active workspace, or to the Pepper Inbox when none is active. */
  async addToActiveOrInbox(tabs: PepperTab[]): Promise<AddResult | null> {
    const usable = newTabsOnly([], tabs);
    if (usable.length === 0) return null;

    const active = await this.getActiveWorkspace();
    if (active) return this.addTabs(active.id, usable);

    const inbox = await sessionEngine.getSessionById(INBOX_SESSION_ID);
    if (inbox) return this.addTabs(INBOX_SESSION_ID, usable);
    const created = await sessionEngine.createSession('Pepper Inbox', usable, {
      id: INBOX_SESSION_ID,
      isPinned: true,
      userNamed: true,
    });
    return { workspace: created, added: usable.length, skipped: 0 };
  }
}

export const workspaceMembership = new WorkspaceMembership();
