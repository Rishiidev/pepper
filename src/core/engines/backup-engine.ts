import { db } from '../../storage/db';
import { PepperSession } from '../types/session';
import { PepperSettings } from '../types/settings';
import { settingsRepo } from '../../storage/repositories/settings-repo';
import { sessionEngine } from './session-engine';
import { hashUrlSet } from '../utils/url-hash';
import { BACKUP_FORMAT, BACKUP_VERSION, PORTABLE_SETTING_KEYS, PepperBackup } from './backup-validate';

export { validateBackup } from './backup-validate';
export type { PepperBackup } from './backup-validate';

export class BackupEngine {
  async exportAll(): Promise<PepperBackup> {
    const [sessions, projects, settings, focusSessions, browserSessions, timelineEvents, tasks] = await Promise.all([
      sessionEngine.getAllSessions(),
      db.projects.toArray(),
      settingsRepo.get(),
      db.focusSessions.toArray(),
      db.browserSessions.toArray(),
      db.timelineEvents.toArray(),
      db.tasks.toArray(),
    ]);
    const portable: Partial<PepperSettings> = {};
    for (const key of PORTABLE_SETTING_KEYS) {
      (portable as Record<string, unknown>)[key] = settings[key];
    }
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      sessions,
      projects,
      settings: portable,
      focusSessions,
      browserSessions,
      // Row ids are local to this database; the importer assigns fresh ones
      timelineEvents: timelineEvents.map(({ id: _id, ...event }) => event),
      tasks,
    };
  }

  /**
   * Merges a validated backup into the local database. When an ID exists on both
   * sides the most recently updated copy wins, so importing never loses newer work.
   */
  async importBackup(backup: PepperBackup): Promise<{ added: number; updated: number; unchanged: number }> {
    const existing = await db.sessions.bulkGet(backup.sessions.map((s) => s.id));
    let added = 0;
    let updated = 0;
    let unchanged = 0;
    const toPut: PepperSession[] = [];

    backup.sessions.forEach((incoming, i) => {
      const current = existing[i];
      if (!current) {
        added++;
        toPut.push(incoming);
      } else if ((incoming.updatedAt ?? 0) > (current.updatedAt ?? 0)) {
        updated++;
        toPut.push(incoming);
      } else {
        unchanged++;
      }
    });

    await db.transaction(
      'rw',
      [db.sessions, db.projects, db.focusSessions, db.browserSessions, db.timelineEvents, db.tasks],
      async () => {
        if (toPut.length) await db.sessions.bulkPut(toPut.map((s) => ({ ...s, urlHash: hashUrlSet(s.tabs.map((t) => t.url)) })));
        if (backup.projects.length) await db.projects.bulkPut(backup.projects);

        // Focus history is append-only: keep whatever this device already has for an id
        const knownFocus = new Set(
          (await db.focusSessions.bulkGet(backup.focusSessions.map((f) => f.id))).filter(Boolean).map((f) => f!.id)
        );
        const newFocus = backup.focusSessions.filter((f) => !knownFocus.has(f.id));
        if (newFocus.length) await db.focusSessions.bulkAdd(newFocus);

        // A browser session and its events travel together, so re-importing never duplicates events
        const knownBrowser = new Set(
          (await db.browserSessions.bulkGet(backup.browserSessions.map((b) => b.id))).filter(Boolean).map((b) => b!.id)
        );
        const newBrowser = backup.browserSessions.filter((b) => !knownBrowser.has(b.id));
        if (newBrowser.length) await db.browserSessions.bulkAdd(newBrowser);
        const newIds = new Set(newBrowser.map((b) => b.id));
        const newEvents = backup.timelineEvents.filter((e) => newIds.has(e.sessionId));
        if (newEvents.length) await db.timelineEvents.bulkAdd(newEvents);

        // Tasks merge like workspaces: the most recently changed copy of an id wins
        const currentTasks = await db.tasks.bulkGet(backup.tasks.map((t) => t.id));
        const tasksToPut = backup.tasks.filter((t, i) => !currentTasks[i] || t.updatedAt > currentTasks[i]!.updatedAt);
        if (tasksToPut.length) await db.tasks.bulkPut(tasksToPut);
      }
    );

    if (Object.keys(backup.settings).length) await settingsRepo.save(backup.settings);
    if (toPut.length) {
      await sessionEngine.refreshBadge();
      if (typeof chrome !== 'undefined') await chrome.storage?.local?.set({ pepper_last_updated: Date.now() });
    }
    return { added, updated, unchanged };
  }
}

export const backupEngine = new BackupEngine();
