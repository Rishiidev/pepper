import { PepperSession, PepperTab, SessionStats } from '../types/session';
import { sessionRepo } from '../../storage/repositories/session-repo';
import { eventBus } from '../events/event-bus';
import { featureFlagsManager } from '../intelligence/features/feature-flags';
import { intelligenceQueue } from '../intelligence/queue/intelligence-queue';
import { AutoTitleSkill } from '../intelligence/skills/auto-title';
import { AutoTaggingSkill } from '../intelligence/skills/auto-tagging';

export class SessionEngine {
  async getAllSessions(): Promise<PepperSession[]> {
    return await sessionRepo.getAll();
  }

  async getSessionById(id: string): Promise<PepperSession | undefined> {
    return await sessionRepo.getById(id);
  }

  async createSession(name: string, tabs: PepperTab[], options: { isFavorite?: boolean; isPinned?: boolean; projectName?: string } = {}): Promise<PepperSession> {
    if (!tabs || tabs.length === 0) {
      throw new Error('Cannot create an empty workspace');
    }

    const session: PepperSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name,
      tabs: tabs.map((t, i) => ({
        url: t.url || '',
        title: t.title || 'Untitled Tab',
        favIconUrl: t.favIconUrl || '',
        index: t.index ?? i,
        pinned: t.pinned || false,
      })),
      tabCount: tabs.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: options.isFavorite ?? false,
      isPinned: options.isPinned ?? false,
      projectName: options.projectName || 'General',
      estimatedRamSavedMb: Math.round(tabs.length * 125), // Average ~125MB per tab
    };

    await sessionRepo.save(session);
    eventBus.emit('session:created', { session });
    await this.refreshBadge();
    await this.notifyCrossContextSync();

    // Asynchronous non-blocking AI enhancement task
    this.triggerAISkills(session).catch((err) => {
      console.warn('[SessionEngine] AI enhancement background task error:', err);
    });

    return session;
  }

  async updateSession(id: string, updates: Partial<PepperSession>): Promise<PepperSession> {
    await sessionRepo.update(id, updates);
    const updated = await sessionRepo.getById(id);
    if (!updated) throw new Error('Session not found after update');

    eventBus.emit('session:updated', { session: updated });
    await this.notifyCrossContextSync();
    return updated;
  }

  async deleteSession(id: string): Promise<void> {
    await sessionRepo.delete(id);
    eventBus.emit('session:deleted', { sessionId: id });
    await this.refreshBadge();
    await this.notifyCrossContextSync();
  }

  async toggleFavorite(id: string): Promise<boolean> {
    const session = await this.getSessionById(id);
    if (!session) throw new Error('Session not found');

    const nextState = !session.isFavorite;
    await this.updateSession(id, { isFavorite: nextState });
    return nextState;
  }

  async togglePin(id: string): Promise<boolean> {
    const session = await this.getSessionById(id);
    if (!session) throw new Error('Session not found');

    const nextState = !session.isPinned;
    await this.updateSession(id, { isPinned: nextState });
    return nextState;
  }

  async getStats(): Promise<SessionStats> {
    const sessions = await this.getAllSessions();
    const totalTabsSaved = sessions.reduce((acc, s) => acc + s.tabCount, 0);
    const estimatedRamSavedMb = sessions.reduce((acc, s) => acc + (s.estimatedRamSavedMb || s.tabCount * 125), 0);

    return {
      totalSessions: sessions.length,
      totalTabsSaved,
      estimatedRamSavedMb,
      storageBytesUsed: 0,
    };
  }

  async refreshBadge(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.action) {
        const sessions = await this.getAllSessions();
        const count = sessions.length;
        if (count > 0) {
          await chrome.action.setBadgeText({ text: String(count) });
          await chrome.action.setBadgeBackgroundColor({ color: '#FF3B30' });
        } else {
          await chrome.action.setBadgeText({ text: '' });
        }
        eventBus.emit('badge:updated', { count });
      }
    } catch {
      // Chrome extension API not available
    }
  }

  private async triggerAISkills(session: PepperSession): Promise<void> {
    if (!featureFlagsManager.isEnabled('aiEnabled')) return;

    const autoTitleSkill = new AutoTitleSkill();
    const autoTaggingSkill = new AutoTaggingSkill();

    const titleResult = await intelligenceQueue.enqueue({
      id: `task_title_${session.id}`,
      skillId: autoTitleSkill.id,
      priority: 'HIGH',
      requirements: autoTitleSkill.requirements,
      input: session.tabs,
      context: { traceId: `trace_${Date.now()}`, createdAt: Date.now() },
    });

    const tagsResult = await intelligenceQueue.enqueue({
      id: `task_tags_${session.id}`,
      skillId: autoTaggingSkill.id,
      priority: 'LOW',
      requirements: autoTaggingSkill.requirements,
      input: session.tabs,
      context: { traceId: `trace_${Date.now()}`, createdAt: Date.now() },
    });

    const updates: Partial<PepperSession> = {};
    if (titleResult.success && titleResult.data && typeof titleResult.data === 'string') {
      updates.name = titleResult.data;
    }
    if (tagsResult.success && Array.isArray(tagsResult.data)) {
      updates.tags = tagsResult.data as string[];
    }

    if (Object.keys(updates).length > 0) {
      await this.updateSession(session.id, updates);
    }
  }

  private async notifyCrossContextSync(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ pepper_last_updated: Date.now() });
      }
    } catch {
      // Non-extension context
    }
  }
}

export const sessionEngine = new SessionEngine();
