import { db } from '../../storage/db';
import { BrowserSession, TimelineEvent } from '../types/timeline';

const DAY_MS = 86_400_000;

/** Thin persistence layer for browser sessions and their events. */
export class TimelineStore {
  async getActiveSession(): Promise<BrowserSession | undefined> {
    const recent = await db.browserSessions.orderBy('startedAt').reverse().limit(5).toArray();
    return recent.find((s) => s.endedAt === undefined);
  }

  async createSession(session: BrowserSession): Promise<void> {
    await db.browserSessions.put(session);
  }

  async updateSession(id: string, updates: Partial<BrowserSession>): Promise<void> {
    await db.browserSessions.update(id, updates);
  }

  async appendEvents(events: TimelineEvent[]): Promise<void> {
    if (events.length === 0) return;
    await db.timelineEvents.bulkAdd(events.map((e) => ({ ...e, id: undefined })));
  }

  async getSessions(sinceTs = 0): Promise<BrowserSession[]> {
    return db.browserSessions.where('startedAt').aboveOrEqual(sinceTs).reverse().sortBy('startedAt');
  }

  async getSessionsBetween(from: number, to: number): Promise<BrowserSession[]> {
    const all = await db.browserSessions.where('startedAt').below(to).toArray();
    return all
      .filter((s) => (s.endedAt ?? s.lastEventAt) >= from)
      .sort((a, b) => a.startedAt - b.startedAt);
  }

  async getEvents(sessionId: string): Promise<TimelineEvent[]> {
    const events = await db.timelineEvents.where('sessionId').equals(sessionId).toArray();
    return events.sort((a, b) => a.ts - b.ts || (a.id ?? 0) - (b.id ?? 0));
  }

  async getEventsBetween(from: number, to: number): Promise<TimelineEvent[]> {
    const events = await db.timelineEvents.where('ts').between(from, to, true, false).toArray();
    return events.sort((a, b) => a.ts - b.ts || (a.id ?? 0) - (b.id ?? 0));
  }

  /** Removes sessions and events older than the retention window. Returns sessions removed. */
  async pruneOlderThan(days: number): Promise<number> {
    if (days <= 0) return 0;
    const cutoff = Date.now() - days * DAY_MS;
    const old = await db.browserSessions.where('startedAt').below(cutoff).toArray();
    const removable = old.filter((s) => (s.endedAt ?? s.lastEventAt) < cutoff);
    for (const s of removable) {
      await db.timelineEvents.where('sessionId').equals(s.id).delete();
      await db.browserSessions.delete(s.id);
    }
    return removable.length;
  }

  async clearAll(): Promise<void> {
    await db.transaction('rw', db.browserSessions, db.timelineEvents, async () => {
      await db.timelineEvents.clear();
      await db.browserSessions.clear();
    });
  }
}

export const timelineStore = new TimelineStore();
