import { PepperSession } from '../types/session';
import { sessionEngine } from './session-engine';
import { selectExpired } from './retention-policy';
import { settingsRepo } from '../../storage/repositories/settings-repo';

const LAST_RUN_KEY = 'pepper_retention_last_run';
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

export class RetentionEngine {
  async preview(): Promise<PepperSession[]> {
    const settings = await settingsRepo.get();
    const sessions = await sessionEngine.getAllSessions();
    return selectExpired(sessions, {
      retentionDays: settings.autoCaptureRetentionDays,
      maxAutoCaptures: settings.maxAutoCaptures,
    });
  }

  /** Deletes expired auto-captures. Returns how many were removed. */
  async run(): Promise<number> {
    const expired = await this.preview();
    for (const s of expired) {
      await sessionEngine.deleteSession(s.id);
    }
    return expired.length;
  }

  /** Runs at most once per interval; safe to call on every service worker boot. */
  async runIfDue(): Promise<number> {
    try {
      const res = await chrome.storage.local.get(LAST_RUN_KEY);
      const last = (res[LAST_RUN_KEY] as number | undefined) ?? 0;
      if (Date.now() - last < MIN_INTERVAL_MS) return 0;
      await chrome.storage.local.set({ [LAST_RUN_KEY]: Date.now() });
    } catch {
      return 0;
    }
    return this.run();
  }
}

export const retentionEngine = new RetentionEngine();
