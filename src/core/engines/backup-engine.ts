import { db } from '../../storage/db';
import { PepperSession } from '../types/session';
import { PepperSettings } from '../types/settings';
import { settingsRepo } from '../../storage/repositories/settings-repo';
import { sessionEngine } from './session-engine';
import { BACKUP_FORMAT, BACKUP_VERSION, PORTABLE_SETTING_KEYS, PepperBackup } from './backup-validate';

export { validateBackup } from './backup-validate';
export type { PepperBackup } from './backup-validate';

export class BackupEngine {
  async exportAll(): Promise<PepperBackup> {
    const [sessions, projects, settings] = await Promise.all([
      sessionEngine.getAllSessions(),
      db.projects.toArray(),
      settingsRepo.get(),
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

    await db.transaction('rw', db.sessions, db.projects, async () => {
      if (toPut.length) await db.sessions.bulkPut(toPut);
      if (backup.projects.length) await db.projects.bulkPut(backup.projects);
    });

    if (Object.keys(backup.settings).length) await settingsRepo.save(backup.settings);
    if (toPut.length) {
      await sessionEngine.refreshBadge();
      await chrome.storage?.local?.set({ pepper_last_updated: Date.now() });
    }
    return { added, updated, unchanged };
  }
}

export const backupEngine = new BackupEngine();
