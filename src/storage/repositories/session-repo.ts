import { db } from '../db';
import { PepperSession } from '../../core/types/session';
import { hashUrlSet, urlSetKey } from '../../core/utils/url-hash';

export class SessionRepository {
  async getAll(): Promise<PepperSession[]> {
    return await db.sessions.orderBy('createdAt').reverse().toArray();
  }

  async getById(id: string): Promise<PepperSession | undefined> {
    return await db.sessions.get(id);
  }

  async save(session: PepperSession): Promise<string> {
    await db.sessions.put({ ...session, urlHash: hashUrlSet(session.tabs.map((t) => t.url)) });
    return session.id;
  }

  async update(id: string, updates: Partial<PepperSession>): Promise<void> {
    await db.sessions.update(id, this.withHash({ ...updates, updatedAt: Date.now() }));
  }

  /**
   * Read-modify-write in one transaction so two quick edits to the same workspace
   * cannot overwrite each other. `mutate` returns the fields to change, or null to skip.
   */
  async updateAtomic(
    id: string,
    mutate: (current: PepperSession) => Partial<PepperSession> | null
  ): Promise<PepperSession | undefined> {
    return db.transaction('rw', db.sessions, async () => {
      const current = await db.sessions.get(id);
      if (!current) return undefined;
      const updates = mutate(current);
      if (!updates) return current;
      await db.sessions.update(id, this.withHash({ ...updates, updatedAt: Date.now() }));
      return db.sessions.get(id);
    });
  }

  /** True when a saved workspace holds exactly this set of URLs. Indexed lookup, not a scan. */
  async hasUrlSet(urls: string[]): Promise<boolean> {
    const key = urlSetKey(urls);
    const candidates = await db.sessions.where('urlHash').equals(hashUrlSet(urls)).toArray();
    return candidates.some((s) => urlSetKey(s.tabs.map((t) => t.url)) === key);
  }

  private withHash(updates: Partial<PepperSession>): Partial<PepperSession> {
    return updates.tabs ? { ...updates, urlHash: hashUrlSet(updates.tabs.map((t) => t.url)) } : updates;
  }

  async delete(id: string): Promise<void> {
    await db.sessions.delete(id);
  }

  async clearAll(): Promise<void> {
    await db.sessions.clear();
  }

  async count(): Promise<number> {
    return await db.sessions.count();
  }
}

export const sessionRepo = new SessionRepository();
